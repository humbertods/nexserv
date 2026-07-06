// ================================================
// NEXSERV app.js
// Service Worker registration
// Depende de: state.js, api.js, router.js
// ================================================

// ── Service Worker registration ──
if ('serviceWorker' in navigator) {
  // Limpiar SW y cachés viejos antes de registrar
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      // Si el SW activo no es la versión actual, desregistrar
      if (reg.active && reg.active.scriptURL && !reg.active.scriptURL.includes('sw.js')) {
        reg.unregister();
      }
    });
  });

  // Limpiar cachés que no sean el actual
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(key => {
        if (!key.includes('firebase') && !key.includes('nexserv-v20260706')) {
          caches.delete(key);
        }
      });
    });
  }

  navigator.serviceWorker.register('/nexserv/sw.js', { scope: '/nexserv/' })
    .then(reg => {
      window._swReg = reg;
      console.log('[NexServ] SW registrado:', reg.scope);
      // Forzar activación inmediata del nuevo SW si hay uno en espera
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    })
    .catch(err => console.warn('[NexServ] SW error:', err));

  // Recargar cuando el SW tome control (después de SKIP_WAITING)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
