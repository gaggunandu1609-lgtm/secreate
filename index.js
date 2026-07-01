const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const webpush = require('web-push');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// PIN configuration
const SENDER_PIN = process.env.SENDER_PIN || '1111';
const RECEIVER_PIN = process.env.RECEIVER_PIN || '2222';

// In-memory message history to persist while the server is running
// This ensures that when he reconnects, he sees all past messages for this session
const MAX_HISTORY = 50;
let messageHistory = [];
let receiverSockets = [];

// Web Push setup
// We use static keys now so that if Render restarts the server,
// the browser's push subscription doesn't become invalid.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BLAVp--RcBuKSQODr9sHVoj6Rolu1FYc8PfAmxyOh_wPR3Qek1pGjvH7dZMmc-KIRrtsUybNh8KRupBLi2Pl4FU';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'H6LdLSa3C1kShCJg3NrWOnFixfwaG84uZo8GdljuQjc';

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

// In-memory push subscriptions
let pushSubscriptions = [];

app.use(express.json());
app.use(cookieParser());

// Middleware to protect routes
app.use((req, res, next) => {
  const role = req.cookies.role;
  
  if (req.path === '/' || req.path === '/index.html') {
    if (role !== 'sender') return res.redirect('/login.html');
  }
  
  if (req.path === '/receiver.html') {
    if (role !== 'receiver') return res.redirect('/login.html');
  }
  
  if (req.path === '/login.html' && role) {
    if (role === 'sender') return res.redirect('/');
    if (role === 'receiver') return res.redirect('/receiver.html');
  }

  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH API ---
app.post('/api/login', (req, res) => {
  const { pin } = req.body;
  if (pin === SENDER_PIN) {
    res.cookie('role', 'sender', { httpOnly: true, sameSite: 'strict' });
    return res.json({ success: true, redirect: '/' });
  } else if (pin === RECEIVER_PIN) {
    res.cookie('role', 'receiver', { httpOnly: true, sameSite: 'strict' });
    return res.json({ success: true, redirect: '/receiver.html' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid PIN' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('role');
  res.json({ success: true, redirect: '/login.html' });
});

// --- PUSH API ---
app.get('/api/vapidPublicKey', (req, res) => {
  if (req.cookies.role !== 'receiver') return res.status(403).send('Forbidden');
  res.send(VAPID_PUBLIC);
});

app.post('/api/subscribe', (req, res) => {
  if (req.cookies.role !== 'receiver') return res.status(403).send('Forbidden');
  
  const subscription = req.body;
  // Prevent duplicate subscriptions
  if (!pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
    pushSubscriptions.push(subscription);
  }
  res.status(201).json({});
});

// Utility to parse cookies from socket connection
const parseCookie = (cookieString, cookieName) => {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
  return match ? match[2] : null;
};

// WebSocket logic
io.on('connection', (socket) => {
  const cookieString = socket.handshake.headers.cookie;
  const role = parseCookie(cookieString, 'role');

  if (role === 'receiver') {
    receiverSockets.push(socket);
    
    // Deliver all message history immediately upon connection
    if (messageHistory.length > 0) {
      socket.emit('message_history', messageHistory);
    }

    socket.on('disconnect', () => {
      receiverSockets = receiverSockets.filter(s => s !== socket);
    });
  } 
  
  else if (role === 'sender') {
    socket.on('send_message', async (data) => {
      const msg = { text: data.text, timestamp: new Date().toISOString() };
      
      // Keep in history (up to MAX_HISTORY)
      messageHistory.push(msg);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }

      if (receiverSockets.length > 0) {
        // Receiver is ONLINE (dashboard open) - send instantly via socket
        receiverSockets.forEach(s => s.emit('new_message', msg));
      } else {
        // Receiver is OFFLINE - trigger push notifications
        const payload = JSON.stringify({ title: 'Quick Signal', body: msg.text });
        
        for (let i = pushSubscriptions.length - 1; i >= 0; i--) {
          const sub = pushSubscriptions[i];
          try {
            await webpush.sendNotification(sub, payload);
          } catch (error) {
            // Subscription may be invalid or expired, remove it
            if (error.statusCode === 404 || error.statusCode === 410) {
              pushSubscriptions.splice(i, 1);
            }
          }
        }
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Real-Time Messenger running on port ${PORT}`);
});
