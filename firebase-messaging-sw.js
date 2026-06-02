/* ════════════════════════════════════════════════════════════════
   NexServ — Service Worker de Firebase Cloud Messaging
   Muestra las notificaciones aunque la app esté CERRADA (tipo WhatsApp).
   IMPORTANTE: este archivo debe subirse a la RAÍZ del sitio, en:
     https://humbertods.github.io/nexserv/firebase-messaging-sw.js
   ════════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCEFhAeGjy9IJy7uIYLDrUb4OglpeTIaRo',
  authDomain: 'nexserv-7e1bb.firebaseapp.com',
  projectId: 'nexserv-7e1bb',
  storageBucket: 'nexserv-7e1bb.firebasestorage.app',
  messagingSenderId: '916241480118',
  appId: '1:916241480118:web:cdf7aae6e823e08b22e917'
});

const messaging = firebase.messaging();

// Notificación en segundo plano para mensajes de SOLO datos.
// (Si el backend manda bloque "notification", el navegador la muestra solo;
//  este handler es respaldo y no duplica.)
messaging.onBackgroundMessage(function (payload) {
  const n = (payload && payload.notification) || (payload && payload.data) || {};
  const titulo = n.title || 'NexServ';
  const link = (payload && payload.fcmOptions && payload.fcmOptions.link)
            || (payload && payload.data && payload.data.link)
            || 'https://humbertods.github.io/nexserv/';
  self.registration.showNotification(titulo, {
    body: n.body || '',
    icon: 'https://humbertods.github.io/nexserv/icon-192.png',
    badge: 'https://humbertods.github.io/nexserv/icon-192.png',
    tag: 'nexserv-cita',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { link: link }
  });
});

// Al tocar la notificación: abrir/enfocar la app
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link)
            || 'https://humbertods.github.io/nexserv/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (const c of lista) {
        if (c.url.indexOf('/nexserv') !== -1 && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
