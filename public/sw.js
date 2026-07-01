self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'New Message', body: 'You have a new message.' };

  const options = {
    body: data.body,
    vibrate: [200, 100, 200, 100, 200, 100, 200] // Distinctive vibration pattern
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
