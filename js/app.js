// ================================================
// NEXSERV app.js
// Service Worker registration
// Depende de: state.js, api.js, router.js
// ================================================

// ── Service Worker registration ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/nexserv/sw.js', { scope: '/nexserv/' })
    .then(reg => {
      window._swReg = reg;
      console.log('[NexServ] SW registrado:', reg.scope);
    })
    .catch(err => console.warn('[NexServ] SW error:', err));
}
