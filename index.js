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

// In-memory queue and active connections
let pendingMessages = [];
let receiverSockets = [];

// Web Push setup (generate new keys per session to remain zero-trace)
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
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
  res.send(vapidKeys.publicKey);
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
    
    // Deliver offline pending messages via socket
    if (pendingMessages.length > 0) {
      socket.emit('pending_messages', pendingMessages);
      pendingMessages = []; // Clear trace
    }

    socket.on('disconnect', () => {
      receiverSockets = receiverSockets.filter(s => s !== socket);
    });
  } 
  
  else if (role === 'sender') {
    socket.on('send_message', async (data) => {
      const msg = { text: data.text, timestamp: new Date().toISOString() };

      if (receiverSockets.length > 0) {
        // Receiver is ONLINE (dashboard open) - send instantly via socket
        receiverSockets.forEach(s => s.emit('new_message', msg));
      } else {
        // Receiver is OFFLINE - queue in memory AND trigger push notifications
        pendingMessages.push(msg);
        
        // Trigger web push notification for offline receiver
        const payload = JSON.stringify({ title: 'New Message', body: msg.text });
        
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
