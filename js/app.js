// ================================================
// NEXSERV app.js
// Service Worker + Bootstrap de sesión
// Depende de: state.js, api.js, router.js
// ================================================

// ── Service Worker registration ──
// (movido desde el bloque <script> en <head>)
<!DOCTYPE html>
<html lang="es">
<head>
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/nexserv/sw.js', { scope: '/nexserv/' })
    .then(reg => {
      window._swReg = reg;
      console.log('[NexServ] SW registrado:', reg.scope);
    })
    .catch(err => console.warn('[NexServ] SW error:', err));
}
</script>

// ── Bootstrap: restaurar sesión y chequear versión ──
// DOMContentLoaded principal (session restore, version check,
// promo selects, descanso, push token)
  document.addEventListener('DOMContentLoaded', () => {
    const pi = document.getElementById('promoPrice');
    if (pi) pi.addEventListener('input', updatePromoTotal);
    // initPromoSelects() se llama recién con sesión activa (al restaurar abajo o al iniciar sesión)

    // ── Restaurar sesión persistida ──────────────────────────
    try {
      const saved = localStorage.getItem('nexserv_session');
      if (saved) {
        const user = JSON.parse(saved);
        if (user && user.name && user.role && user.active !== false) {
          window.currentUser = user;
          window._session = (user && user.session) || null;
          if (window._session) initPromoSelects(); // catálogo + selects de promo, ya con sesión
          document.body.classList.toggle('rol-staff', !!user && user.role === 'staff');
          startHeartbeat(false);
          const roleLabelEl = document.getElementById('roleLabel');
          if (roleLabelEl) roleLabelEl.textContent = 'Salir · ' + user.name;
          if (user.role === 'staff') {
            const el = document.getElementById('staffName');
            const av = document.getElementById('staffAvatar');
            const wl = document.getElementById('waitListAvatar');
            if (el) el.textContent = user.name;
            if (av) av.textContent = user.name[0];
            if (wl) wl.textContent = user.name[0];
          }
          // No restaurar asistenciaPanel automáticamente — siempre arrancar en home
          var _safeScreen = user.screen || 'staffHome';
          if (_safeScreen === 'asistenciaPanel') {
            var _rol2 = String(user.role || user.rol || '').toLowerCase();
            _safeScreen = _rol2 === 'owner' ? 'ownerHome' : (_rol2 === 'admin' ? 'mikaelaHome' : 'staffHome');
          }
          if (_safeScreen === 'staffAsistencia') { _safeScreen = 'staffHome'; }
          show(_safeScreen);
          console.log('[Sesión] Restaurada para:', user.name);
          // Modo de descanso: si quedó bloqueada con la sesión abierta, cerrarla
          setTimeout(() => { if (typeof verificarDescansoActivo === 'function') verificarDescansoActivo(); }, 1200);
          // Re-suscribir push sin pedir permiso (ya lo dio antes)
          setTimeout(() => {
            if (!window._pushSuscrito && typeof suscribirPushActual === 'function') {
              suscribirPushActual();
            }
          }, 2500);
        }
      }
    } catch(e) {
      console.warn('[Sesión] Error al restaurar:', e.message);
    }
    // Refresco INSTANTÁNEO del panel de la chica al volver la app a primer plano.
    // Esto cubre el caso del teléfono: cuando la chica toma el celular y mira la app,
    // el panel se actualiza al toque sin esperar al push ni al intervalo.
    function _refrescarStaffHomeSiActivo() {
      const el = document.getElementById('staffHome');
      if (!el || !el.classList.contains('active')) return;
      if (document.hidden || document.querySelector('.modal-bg.active') || window._staffHomeLoading) return;
      if (typeof loadStaffHome !== 'function') return;
      window._staffHomeLoading = true;
      Promise.resolve(loadStaffHome()).finally(() => { window._staffHomeLoading = false; });
    }
    // Modo de descanso: revisar al volver la app al frente, al enfocar, por actividad y cada 25s
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && typeof verificarDescansoActivo === 'function') verificarDescansoActivo();
      if (!document.hidden) _refrescarStaffHomeSiActivo();
    });
    window.addEventListener('focus', () => {
      if (typeof verificarDescansoActivo === 'function') verificarDescansoActivo();
      _refrescarStaffHomeSiActivo();
    });
    // Al detectar movimiento/actividad (con throttle de 5s) revalidar el bloqueo
    ['pointerdown','keydown'].forEach(ev => document.addEventListener(ev, () => {
      const ahora = Date.now();
      if (ahora - (window._ultimoChequeoDescanso || 0) < 5000) return;
      window._ultimoChequeoDescanso = ahora;
      if (typeof verificarDescansoActivo === 'function') verificarDescansoActivo();
    }, { passive: true, capture: true }));
    setInterval(() => { if (typeof verificarDescansoActivo === 'function') verificarDescansoActivo(); }, 25000);
    // ────────────────────────────────────────────────────────
  });
