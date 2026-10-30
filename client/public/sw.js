/* =========================================================================
   Padhaku Billa — Service Worker
   Handles Web Push background notifications, notification click routing,
   and basic PWA lifecycle without aggressive caching of dynamic API routes.
   ========================================================================= */

const SW_VERSION = 'v1.0.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Web Push Notification Handler ---
self.addEventListener('push', (event) => {
  let data = {
    title: 'Focus Session Complete! ⏰',
    body: 'Great job! Your focus quest has reached its goal.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    url: '/focus',
    tag: 'focus-session-complete',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'focus-session-complete',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/focus',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open Padhaku Billa' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// --- Notification Click Event ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/focus';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is currently open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

