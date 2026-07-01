self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'New Message', body: 'You have a new message.' };

  const options = {
    body: data.body,
    vibrate: [500, 250, 500, 250, 500],
    requireInteraction: true,
    silent: false,
    icon: 'https://cdn-icons-png.flaticon.com/128/1827/1827370.png',
    badge: 'https://cdn-icons-png.flaticon.com/128/1827/1827370.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/receiver.html')
  );
});
