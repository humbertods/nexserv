const CACHE_NAME = 'nexserv-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: 'NexServ', body: e.data.text() }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/nexserv/icon-192.png',
    badge: data.badge || '/nexserv/icon-192.png',
    tag: data.tag || 'nexserv-notif',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/nexserv/' }
  };

  e.waitUntil(self.registration.showNotification(data.title || 'NexServ', options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/nexserv/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('nexserv') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
