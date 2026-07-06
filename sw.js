const CACHE_NAME = 'nexserv-v20260706';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Borrar cachés viejos al activar nueva versión
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && !k.includes('firebase'))
          .map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('push', e => {
  let data = { title: 'NexServ', body: 'Nueva actualización' };

  if (e.data) {
    try {
      data = e.data.json();
      const n = data.notification || data.data || {};
      data = {
        title: data.title || n.title || 'NexServ',
        body:  data.body  || n.body  || '',
        icon:  data.icon  || n.icon,
        tag:   data.tag   || n.tag,
        url:   (data.fcmOptions && data.fcmOptions.link) || (n.fcm_options && n.fcm_options.link) || data.url
      };
    } catch {
      const text = e.data.text();
      if (text) data = { title: 'NexServ', body: text };
    }
  }

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

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
