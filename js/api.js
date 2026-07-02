// ================================================
// NEXSERV api.js
// Configuración, entorno, API y catálogo
// Extraído de index.html · Fase 2 partición
// Cargado antes que cualquier módulo.
// ================================================

  // ============================================
  // NexServ · Conexión a Google Sheets
  // ============================================
  // Selección de entorno (dev / prod). Prod por defecto: las tablets
  // del salón quedan SIEMPRE en producción salvo que se abran a
  // propósito con ?env=dev. La elección queda recordada en el
  // dispositivo. Para volver a producción: abrir con ?env=prod.
  const ENV = (function () {
    try {
      const q = new URLSearchParams(location.search).get('env');
      if (q === 'dev' || q === 'prod') { localStorage.setItem('nexserv_env', q); return q; }
      return localStorage.getItem('nexserv_env') === 'dev' ? 'dev' : 'prod';
    } catch (e) { return 'prod'; }
  })();
  const API_URLS = {
    prod: 'https://script.google.com/macros/s/AKfycbyS9YonMU50Oq811-kPyOBUQoksDFVwT5AQ2P4U0BN9IJaJJCAV2HeZ5L1A0bMWMjcL/exec',
    dev:  '__PEGA_DEV_EXEC_URL__'   // ← URL /exec del deployment de pruebas
  };
  const API_URL = API_URLS[ENV];

  // ── Versión de la app (debe coincidir con APP_VERSION del backend) ──
  // Subila en cada cambio que despliegues a GitHub Pages. Al abrir, la app
  // le pregunta al servidor su versión; si la del servidor es distinta,
  // muestra un aviso para recargar (cura el problema de caché vieja).
  const APP_VERSION = '5.2';

  // Sello visual rojo "DEV" para que nunca se confunda con producción.
  if (ENV === 'dev') {
    try {
      document.addEventListener('DOMContentLoaded', function () {
        var b = document.createElement('div');
        b.textContent = 'DEV';
        b.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#b91c1c;color:#fff;font:700 11px sans-serif;padding:2px 8px;border-bottom-right-radius:6px;letter-spacing:1px;pointer-events:none;';
        document.body.appendChild(b);
      });
    } catch (e) {}
  }

  // Etiqueta discreta de versión (abajo a la derecha) + chequeo de actualización.
  function _mostrarVersionLabel() {
    try {
      if (document.getElementById('nxVerLabel')) return;
      var v = document.createElement('div');
      v.id = 'nxVerLabel';
      v.textContent = 'v' + APP_VERSION;
      v.style.cssText = 'position:fixed;bottom:4px;right:6px;z-index:99998;font:500 10px sans-serif;color:rgba(0,0,0,0.28);pointer-events:none;';
      document.body.appendChild(v);
    } catch (e) {}
  }
  async function _checkVersion() {
    try {
      const u = new URL(API_URL);
      u.searchParams.set('action', 'getVersion');
      u.searchParams.set('_t', Date.now().toString());
      const r = await fetch(u.toString());
      const j = await r.json();
      const serverV = j && j.version ? String(j.version) : '';
      if (serverV && serverV !== String(APP_VERSION)) _avisarActualizar(serverV);
    } catch (e) { /* sin red: no molestar */ }
  }
  function _avisarActualizar(serverV) {
    try {
      if (document.getElementById('nxUpdateBanner')) return;
      var bar = document.createElement('div');
      bar.id = 'nxUpdateBanner';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100000;background:#b45309;color:#fff;font:600 13px sans-serif;padding:10px 14px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      var txt = document.createElement('span');
      txt.textContent = '🔄 Hay una versión nueva (v' + serverV + '). Recargá para actualizar.';
      var btn = document.createElement('button');
      btn.textContent = 'Recargar';
      btn.style.cssText = 'background:#fff;color:#b45309;border:none;border-radius:8px;font:700 13px sans-serif;padding:6px 14px;cursor:pointer;';
      btn.onclick = function () { _forzarActualizar(); };
      bar.appendChild(txt); bar.appendChild(btn);
      document.body.appendChild(bar);
    } catch (e) {}
  }
  function _forzarActualizar() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (reg) { reg.update(); });
          if (window.caches && caches.keys) {
            caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); })
              .finally(function () { location.reload(true); });
          } else { location.reload(true); }
        }).catch(function () { location.reload(true); });
      } else { location.reload(true); }
    } catch (e) { location.reload(true); }
  }
  document.addEventListener('DOMContentLoaded', function () {
    _mostrarVersionLabel();
    _checkVersion();
  });
  
  // ── INTERCEPTOR CENTRAL DE AUTH (P1 — AUTH_ENFORCE) ──────────────────────
  // Detecta {error:..., code:401|403} que devuelve el backend cuando enforce
  // está activo. Muestra el modal de sesión expirada / no autorizada y detiene
  // el flujo. Así ningún caller necesita manejar auth individualmente.
  // Códigos que activan el modal:
  //   401 → sin credenciales / sesión expirada / firma inválida
  //   403 → token revocado / acción fuera de scope / rol sin permiso
  let _authExpiredVisible = false;
  function _interceptAuth(result, action) {
    if (!result || typeof result !== 'object') return result;
    const code = Number(result.code || 0);
    if (code !== 401 && code !== 403) return result;   // respuesta normal → pasar
    console.warn('[AUTH]', code, action, result.error);
    const es401 = code === 401;
    const titulo = es401 ? 'Sesión expirada' : 'Acceso no autorizado';
    const razon  = String(result.error || '');
    const msgs = {
      'sesion expirada':   'Tu sesión expiró después de 12 h. Volvé a ingresar para continuar.',
      'firma invalida':    'La sesión no es válida. Volvé a ingresar.',
      'sesion malformada': 'Hubo un problema con tu sesión. Volvé a ingresar.',
      'sin credenciales':  'Tu sesión no se encontró. Volvé a ingresar.',
      'token revocado':    'El acceso fue revocado. Contactá al administrador.',
      'accion fuera de permisos': 'Esta acción no está permitida para tu perfil.',
      'rol sin permiso':   'No tenés permiso para realizar esta acción.'
    };
    const msg = msgs[razon] || (es401
      ? 'Tu sesión no es válida. Volvé a ingresar.'
      : 'No estás autorizado para realizar esta acción.');
    _authExpiredShow(titulo, msg);
    return result;   // devolver igual para no romper callers que verifican .error
  }
  function _authExpiredShow(titulo, msg) {
    if (_authExpiredVisible) return;
    _authExpiredVisible = true;
    // Redirigir al login directamente sin modal bloqueante
    window._session    = null;
    window.currentUser = null;
    localStorage.removeItem('nx_session');
    if (typeof show === 'function') show('login');
  }
  function _authExpiredRelogin() {
    _authExpiredVisible = false;
    const modal = document.getElementById('authExpiredModal');
    if (modal) modal.style.display = 'none';
    // Limpiar sesión y volver al login
    window._session     = null;
    window.currentUser  = null;
    if (typeof show === 'function') show('login');
  }

  async function apiGet(action, params) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    // Cache-busting: agregar timestamp para evitar respuestas cacheadas
    url.searchParams.set('_t', Date.now().toString());
    if (window._session) url.searchParams.set('session', window._session);
    if (window.currentUser && window.currentUser.name) url.searchParams.set('_who', window.currentUser.name); // pista de diagnóstico (NO autentica): identifica a la chica en el ApiLog aunque falte la sesión
    if (params) Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return _interceptAuth(data, action);
    } catch (err) {
      console.error('API Error:', err);
      return { error: err.message };
    }
  }

  async function apiPost(action, data, { retries = 2, timeoutMs = 18000 } = {}) {
    if (!data) data = {};
    data.action = action;
    data._t = Date.now();
    if (window._session) data.session = window._session;
    if (window.currentUser && window.currentUser.name) data._who = window.currentUser.name; // pista de diagnóstico (NO autentica): identifica a la chica en el ApiLog aunque falte la sesión

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          redirect: 'follow',
          signal: controller.signal,
          body: JSON.stringify(data)
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const result = await res.json();
        return _interceptAuth(result, action);
      } catch (err) {
        clearTimeout(timer);
        console.warn(`API intento ${attempt + 1} fallido (${action}):`, err.message);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          data._t = Date.now();
          continue;
        }
        console.error('API Error final:', err);
        return { error: err.message };
      }
    }
  }

  // Cache local
  let CLIENT_DIRECTORY_CACHE = [];

  // CATÁLOGO DE SERVICIOS (del Excel NexServ_Base)
  // CATALOGO se carga dinamicamente desde Google Sheets
  // Mapa de area: nombre en Sheets -> clave JS
  const AREA_MAP_CATALOGO = {
    'Cejas': 'cejas',
    'Depilacion': 'depilacion',
    'Depilación': 'depilacion',
    'Pestanas': 'pestanas',
    'Pestañas': 'pestanas',
    'Retiro lifting': 'retiro_lifting',
    'Retiro Lifting': 'retiro_lifting',
    'Facial': 'facial',
  };

  let CATALOGO = { cejas: [], depilacion: [], pestanas: [], retiro_lifting: [], facial: [] };
  let CATALOGO_LOADED = false;

  async function ensureCatalogoLoaded() {
    if (CATALOGO_LOADED) return;
    if (!window._session) return; // sin sesión no pedimos catálogo (evita 'sin credenciales' pre-login)
    try {
      const result = await apiGet('getCatalogo');
      if (result.success && result.servicios) {
        // Resetear
        CATALOGO = { cejas: [], depilacion: [], pestanas: [], retiro_lifting: [], facial: [] };
        for (const s of result.servicios) {
          // Solo servicios activos (columna E = "Si" o "Sí" o true)
          const activo = String(s.activo || '').toLowerCase();
          if (activo === 'no') continue;
          const areaKey = AREA_MAP_CATALOGO[String(s.area || '').trim()] || null;
          if (!areaKey) continue;
          const precio = Number(String(s.precio || '0').replace(/[$,]/g, '')) || 0;
          CATALOGO[areaKey].push({
            code: String(s.codigo || ''),
            name: String(s.servicio || ''),
            price: precio
          });
        }
        CATALOGO_LOADED = true;
        console.log('Catalogo cargado:', Object.keys(CATALOGO).map(k => k + ':' + CATALOGO[k].length));
      }
    } catch (err) {
      console.error('Error cargando catalogo:', err);
    }
  }


  async function initPromoSelects() {
    await ensureCatalogoLoaded();
    const areas = ['cejas', 'depilacion', 'pestanas', 'facial'];
    const cejaIds = ['promoCejas1', 'promoCejas2', 'promoCejas3', 'promoCejas4', 'promoCejas5'];
    const depIds = ['promoDepilacion1', 'promoDepilacion2', 'promoDepilacion3'];

    // Pestañas, Facial (1 cada uno)
    const singleMap = { pestanas: 'promoPestanas', facial: 'promoFacial' };
    Object.keys(singleMap).forEach(area => {
      const sel = document.getElementById(singleMap[area]);
      sel.innerHTML = '<option value="">— No incluir —</option>';
      CATALOGO[area].forEach(s => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ code: s.code, name: s.name, price: s.price, area: area });
        opt.textContent = s.name + ' — $' + s.price;
        sel.appendChild(opt);
      });
    });

    // Cejas: 5 selectores (cada servicio con su propio monto, igual que depilación)
    const cejaLabels = ['— No incluir —', '— Agregar 2do servicio —', '— Agregar 3er servicio —', '— Agregar 4to servicio —', '— Agregar 5to servicio —'];
    cejaIds.forEach((id, idx) => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">' + cejaLabels[idx] + '</option>';
      CATALOGO.cejas.forEach(s => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ code: s.code, name: s.name, price: s.price, area: 'cejas' });
        opt.textContent = s.name + ' — $' + s.price;
        sel.appendChild(opt);
      });
    });

    // Depilación: 3 selectores
    const depLabels = ['— No incluir —', '— Agregar 2do servicio —', '— Agregar 3er servicio —'];
    depIds.forEach((id, idx) => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">' + depLabels[idx] + '</option>';
      CATALOGO.depilacion.forEach(s => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ code: s.code, name: s.name, price: s.price, area: 'depilacion' });
        opt.textContent = s.name + ' — $' + s.price;
        sel.appendChild(opt);
      });
    });
  }

  function getSelectedServices() {
    const singleIds = ['promoPestanas', 'promoFacial'];
    const cejaIds = ['promoCejas1', 'promoCejas2', 'promoCejas3', 'promoCejas4', 'promoCejas5'];
    const depIds = ['promoDepilacion1', 'promoDepilacion2', 'promoDepilacion3'];
    const selected = [];
    
    singleIds.forEach(id => {
      const val = document.getElementById(id).value;
      if (val) { try { selected.push(JSON.parse(val)); } catch(e) {} }
    });

    cejaIds.forEach(id => {
      const val = document.getElementById(id).value;
      if (val) { try { selected.push(JSON.parse(val)); } catch(e) {} }
    });

    depIds.forEach(id => {
      const val = document.getElementById(id).value;
      if (val) { try { selected.push(JSON.parse(val)); } catch(e) {} }
    });
    
    return selected;
  }

  const AREA_LABELS = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg> Depilación', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg> Pestañas', facial: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg> Facial' };
  // Versión solo texto (para selects y matching con backend)
  const AREA_LABELS_TEXT = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting / Retiro', facial: 'Facial' };

  const AREA_COMM = { cejas: '30%', depilacion: '30%', pestanas: '30%', facial: '40%' };
  const AREA_STAFF = { cejas: 'María / Keyla / Lesly / Rosa', depilacion: 'María / Keyla / Lesly / Rosa', pestanas: 'Yadira / Diana', retiro_lifting: 'María / Keyla / Lesly / Rosa', facial: 'Laura' };

  function updatePromoTotal() {
    const selected = getSelectedServices();
    const total = selected.reduce((sum, s) => sum + s.price, 0);
    document.getElementById('promoRegular').value = total;
    document.getElementById('promoRegularDisplay').textContent = '$' + total;

    // Auto-generar filas de división por área
    const divContainer = document.getElementById('promoDivision');
    // Para depilación: cada servicio tiene su propio campo de monto
    // Para otras áreas: se agrupan por área
    const areaGroups = {};
    selected.forEach(s => {
      if (s.area === 'depilacion') {
        // Cada servicio de depilación es un ítem individual con su propio monto
        const key = 'depi__' + s.name;
        areaGroups[key] = [s];
      } else if (s.area === 'cejas') {
        // Cada servicio de cejas también es individual (hasta 5)
        const key = 'cejas__' + s.name;
        areaGroups[key] = [s];
      } else {
        const groupKey = s.area;
        if (!areaGroups[groupKey]) areaGroups[groupKey] = [];
        areaGroups[groupKey].push(s);
      }
    });

    // Preservar valores previos si existen
    const prevValues = {};
    divContainer.querySelectorAll('[data-area]').forEach(row => {
      const inp = row.querySelector('input');
      if (inp && inp.value) prevValues[row.dataset.area] = inp.value;
    });

    divContainer.innerHTML = '';
    Object.keys(areaGroups).forEach(key => {
      const services = areaGroups[key];
      const isDepiItem = key.startsWith('depi__');
      const isCejaItem = key.startsWith('cejas__');
      const area = isDepiItem ? 'depilacion' : (isCejaItem ? 'cejas' : key);
      const itemName = (isDepiItem || isCejaItem) ? services[0].name : services.map(s => s.name).join(' + ');
      const suggestedPrice = prevValues[key] || '';
      
      const row = document.createElement('div');
      row.dataset.area = key; // key único por servicio en depi
      row.dataset.realarea = area;
      row.dataset.servicio = itemName;
      row.style.cssText = 'background: var(--bg); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px; border-left: 3px solid ' + (isDepiItem ? '#c44569' : 'var(--accent)') + ';';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 13px;">${isDepiItem ? '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg> ' : (AREA_LABELS[area] ? AREA_LABELS[area] + ' · ' : '')}${itemName}</div>
            <div style="font-size: 10px; color: var(--ink-faint); margin-top: 2px;">→ La atiende: ${AREA_STAFF[area] || AREA_STAFF['cejas']} · Comisión: ${AREA_COMM[area]}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--ink-soft); white-space: nowrap;">Monto promo:</span>
          <input type="number" placeholder="$" value="${suggestedPrice}" data-field="promo"
            style="flex: 1; padding: 10px; border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 14px; font-weight: 700; text-align: center; background: var(--bg-card);"
            oninput="updateDepiSumaCheck()">
        </div>
      `;
      divContainer.appendChild(row);
    });

    // Mostrar ahorro
    const priceInput = document.getElementById('promoPrice');
    const savingsEl = document.getElementById('promoSavingsDisplay');
    const combo = parseInt(priceInput.value) || 0;
    if (combo > 0 && total > 0 && combo < total) {
      savingsEl.textContent = 'La clienta ahorra $' + (total - combo) + ' con este combo';
      savingsEl.style.display = 'block';
    } else {
      savingsEl.style.display = 'none';
    }

    // Mostrar advertencia de suma si hay items de depilación
    updateDepiSumaCheck();
  }

  function updateDepiSumaCheck() {
    const divContainer = document.getElementById('promoDivision');
    if (!divContainer) return;
    const rows = divContainer.querySelectorAll('[data-area]');
    let sumaDepi = 0;
    let tieneDepi = false;
    rows.forEach(row => {
      if (String(row.dataset.area || '').startsWith('depi__')) {
        tieneDepi = true;
        const inp = row.querySelector('input');
        sumaDepi += Number(inp?.value || 0);
      }
    });
    let warnEl = document.getElementById('depiSumaWarn');
    if (!warnEl && tieneDepi) {
      warnEl = document.createElement('div');
      warnEl.id = 'depiSumaWarn';
      warnEl.style.cssText = 'font-size: 12px; font-weight: 600; text-align: center; padding: 8px; border-radius: 10px; margin-bottom: 8px;';
      divContainer.parentNode.insertBefore(warnEl, divContainer.nextSibling);
    }
    if (warnEl && tieneDepi) {
      const promoTotal = Number(document.getElementById('promoPrice')?.value || 0);
      if (promoTotal > 0 && sumaDepi > 0) {
        if (Math.abs(sumaDepi - promoTotal) < 0.01) {
          warnEl.textContent = '✅ La suma de los ítems ($' + sumaDepi + ') coincide con el precio promo';
          warnEl.style.background = 'var(--success-bg)';
          warnEl.style.color = 'var(--success)';
        } else {
          warnEl.textContent = '⚠️ La suma de los ítems ($' + sumaDepi + ') no coincide con el precio promo ($' + promoTotal + ')';
          warnEl.style.background = '#fff3cd';
          warnEl.style.color = '#856404';
        }
      } else {
        warnEl.textContent = '';
      }
    }
  } // fin updateDepiSumaCheck

  // Actualizar ahorro cuando cambie el precio combo
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

  const USERS = {}; // credenciales removidas — autenticación solo por backend (Módulo 0)

  let PROMOS = []; // Se llenarán desde el servidor
  let PROMOS_LOADED = false; // Flag para saber si ya se cargaron

  // Función para asegurar que PROMOS esté cargado
  async function ensurePromosLoaded() {
    if (PROMOS_LOADED && PROMOS.length > 0) return; // Ya cargado
    
    try {
      const result = await apiGet('getPromos');
      if (result.success && result.promos && result.promos.length > 0) {
        PROMOS = result.promos.map(p => ({
          id: p.id || '',
          name: p.nombre || '',
          services: p.servicios || '',
          price: Number(p.precioCombo) || 0,
          regular: Number(p.sumaIndividual) || 0,
          from: p.desde || '',
          to: p.hasta || '',
          active: p.activa === 'Sí' || p.activa === true,
          division: p.division ? JSON.parse(p.division) : []
        }));
        PROMOS_LOADED = true;
        console.log('✅ PROMOS loaded:', PROMOS.length, 'promos');
      }
    } catch (err) {
      console.error('Error loading PROMOS:', err);
    }
  }
