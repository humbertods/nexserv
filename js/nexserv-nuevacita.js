/* ============================================================================
   NUEVA CITA — módulo NATIVO de NexServ (no iframe SYNA)
   Pantalla propia de NexServ para agendar/atender. Multi-persona, cada persona
   con sus servicios. Guarda vía crearTicketSyna:
     - modo 'ahora'  → directoListaEspera:true  → entra a Lista de espera.
     - modo 'futuro' → (sin flag)               → queda en Prelista (agenda).
   Reusa el catálogo (CATALOGO / PROMOS) y los helpers globales (apiGet/apiPost/
   show/showToast). Namespacing nc* para no chocar con el modal ac* existente.
   ========================================================================== */
(function () {
  'use strict';

  var NC_AREAS = [
    { key: 'cejas', label: 'Cejas' },
    { key: 'pestanas', label: 'Pestañas' },
    { key: 'facial', label: 'Facial' },
    { key: 'depilacion', label: 'Depilación' },
    { key: 'retiro_lifting', label: 'Permanentes / Lifting' },
    { key: 'promos', label: 'Promociones' }
  ];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function nuevoServicio() { return { area: '', servicio: '', precio: 0, promoNombre: '', precioPromo: 0, precioRegular: 0 }; }
  function nuevaPersona()  { return { tipo: 'existente', codigo: '', nombre: '', telefono: '', servicios: [nuevoServicio()] }; }

  function estadoInicial() {
    var hoy = new Date();
    var f = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    return { modo: 'ahora', fecha: f, hora: '', personas: [nuevaPersona()] };
  }

  // ── Abrir la pantalla ──────────────────────────────────────────────────────
  window.abrirNuevaCita = async function () {
    window._ncState = estadoInicial();
    try { if (typeof ensureCatalogoLoaded === 'function') await ensureCatalogoLoaded(); } catch (e) {}
    try { if (typeof ensurePromosLoaded === 'function') await ensurePromosLoaded(); } catch (e) {}
    _ncCargarClientas();  // precargar en segundo plano
    ncRender();
    if (typeof show === 'function') show('nuevaCitaScreen');
  };

  async function _ncCargarClientas() {
    if (window._ncClientas && window._ncClientas.length) return window._ncClientas;
    if (window._acClientas && window._acClientas.length) { window._ncClientas = window._acClientas; return window._ncClientas; }
    try { var r = await apiGet('getClientas'); window._ncClientas = (r && r.clientas) ? r.clientas : []; }
    catch (e) { window._ncClientas = []; }
    return window._ncClientas;
  }

  // ── Modo (Atender ahora / Agendar después) ─────────────────────────────────
  window.ncSetModo = function (m) {
    window._ncState.modo = m;
    ncRender();
  };

  // ── Persona: tipo, cliente ─────────────────────────────────────────────────
  window.ncSetTipoPersona = function (pi, t) { window._ncState.personas[pi].tipo = t; window._ncState.personas[pi].codigo = ''; ncRender(); };

  window.ncBuscarCliente = async function (pi, q) {
    var cont = document.getElementById('ncResultados_' + pi);
    if (!cont) return;
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2) { cont.innerHTML = ''; return; }
    var lista = await _ncCargarClientas();
    var hits = (lista || []).filter(function (c) {
      return String(c.nombre || '').toLowerCase().indexOf(q) >= 0
          || String(c.codigo || '').toLowerCase().indexOf(q) >= 0
          || String(c.telefono || c.tel || '').toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
    cont.innerHTML = hits.length
      ? hits.map(function (c) {
          return '<div onclick="ncSelectCliente(' + pi + ',\'' + esc(c.codigo).replace(/'/g, "\\'") + '\',\'' + esc(c.nombre).replace(/'/g, "\\'") + '\',\'' + esc(c.telefono || c.tel || '').replace(/'/g, "\\'") + '\')" '
            + 'style="padding:9px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--line);">' + esc(c.nombre) + ' <span style="color:var(--ink-soft);font-size:11px;">' + esc(c.codigo) + '</span></div>';
        }).join('')
      : '<div style="padding:9px 12px;font-size:12px;color:var(--ink-soft);">Sin resultados</div>';
  };
  window.ncSelectCliente = function (pi, cod, nombre, tel) {
    var p = window._ncState.personas[pi];
    p.codigo = cod; p.nombre = nombre; p.telefono = tel || '';
    ncRender();
  };
  window.ncClearCliente = function (pi) { var p = window._ncState.personas[pi]; p.codigo = ''; p.nombre = ''; ncRender(); };

  // ── Servicios por persona ──────────────────────────────────────────────────
  window.ncOnArea = function (pi, si, area) {
    var s = window._ncState.personas[pi].servicios[si];
    s.area = area; s.servicio = ''; s.precio = 0; s.promoNombre = ''; s.precioPromo = 0; s.precioRegular = 0;
    ncRender();
  };
  window.ncOnServicio = function (pi, si, sel) {
    var s = window._ncState.personas[pi].servicios[si];
    var v = sel.value;
    if (!v) { s.servicio = ''; s.precio = 0; s.promoNombre = ''; s.precioPromo = 0; s.precioRegular = 0; ncPreview(); return; }
    if (v.indexOf('promo:') === 0) {
      var proms = ((typeof PROMOS !== 'undefined') ? PROMOS : []).filter(function (p) { return p.active !== false; });
      var p = proms[parseInt(v.split(':')[1], 10)];
      if (p) { s.servicio = p.services || p.name; s.precio = p.price; s.promoNombre = p.name; s.precioPromo = p.price; s.precioRegular = p.regular || p.price; }
    } else {
      var lista = ((typeof CATALOGO !== 'undefined') && CATALOGO[s.area]) ? CATALOGO[s.area] : [];
      var svc = lista[parseInt(v.split(':')[1], 10)];
      if (svc) { s.servicio = svc.name; s.precio = svc.price; s.promoNombre = ''; s.precioPromo = 0; s.precioRegular = 0; }
    }
    ncPreview();
  };
  window.ncAddServicio = function (pi) {
    var p = window._ncState.personas[pi];
    if (p.servicios.length >= 5) return;
    p.servicios.push(nuevoServicio());
    ncRender();
  };
  window.ncRemoveServicio = function (pi, si) {
    var p = window._ncState.personas[pi];
    p.servicios.splice(si, 1);
    if (!p.servicios.length) p.servicios.push(nuevoServicio());
    ncRender();
  };

  // ── Personas ───────────────────────────────────────────────────────────────
  window.ncAddPersona = function () { window._ncState.personas.push(nuevaPersona()); ncRender(); };
  window.ncRemovePersona = function (pi) {
    window._ncState.personas.splice(pi, 1);
    if (!window._ncState.personas.length) window._ncState.personas.push(nuevaPersona());
    ncRender();
  };

  // ── Opciones de servicio (select) para un área ─────────────────────────────
  function opcionesServicio(s) {
    if (!s.area) return '<option value="">Elegí el área primero</option>';
    if (s.area === 'promos') {
      var proms = ((typeof PROMOS !== 'undefined') ? PROMOS : []).filter(function (p) { return p.active !== false; });
      return '<option value="">Promo…</option>' + proms.map(function (p, idx) {
        return '<option value="promo:' + idx + '"' + (s.promoNombre === p.name ? ' selected' : '') + '>' + esc(p.name) + ' — $' + p.price + '</option>';
      }).join('');
    }
    var lista = ((typeof CATALOGO !== 'undefined') && CATALOGO[s.area]) ? CATALOGO[s.area] : [];
    return '<option value="">Servicio…</option>' + lista.map(function (svc, idx) {
      return '<option value="srv:' + idx + '"' + ((s.servicio === svc.name && !s.promoNombre) ? ' selected' : '') + '>' + esc(svc.name) + ' — $' + svc.price + '</option>';
    }).join('');
  }

  // ── Total (promos contadas una vez) ────────────────────────────────────────
  function totalPersona(p) {
    var t = 0, vistos = {};
    p.servicios.forEach(function (s) {
      if (!s.servicio) return;
      if (s.promoNombre) { if (!vistos[s.promoNombre]) { vistos[s.promoNombre] = 1; t += Number(s.precioPromo) || 0; } }
      else t += Number(s.precio) || 0;
    });
    return t;
  }

  // ── Render principal ───────────────────────────────────────────────────────
  function ncRender() {
    var st = window._ncState;
    var cont = document.getElementById('ncBody');
    if (!cont) return;
    var esFuturo = st.modo === 'futuro';

    var selArea = function (pi, si, s) {
      return '<select onchange="ncOnArea(' + pi + ',' + si + ',this.value)" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;margin-bottom:8px;background:var(--bg-card);color:var(--ink);">'
        + '<option value="">Área…</option>'
        + NC_AREAS.map(function (a) { return '<option value="' + a.key + '"' + (s.area === a.key ? ' selected' : '') + '>' + a.label + '</option>'; }).join('')
        + '</select>';
    };
    var selSrv = function (pi, si, s) {
      return '<select onchange="ncOnServicio(' + pi + ',' + si + ',this)"' + (s.area ? '' : ' disabled') + ' style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;background:var(--bg-card);color:var(--ink);">'
        + opcionesServicio(s) + '</select>';
    };

    var personasHtml = st.personas.map(function (p, pi) {
      var serviciosHtml = p.servicios.map(function (s, si) {
        return '<div style="border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:8px;">'
          + '<div style="font-size:11px;font-weight:800;color:var(--ink-soft);margin-bottom:6px;display:flex;justify-content:space-between;">'
          + '<span>SERVICIO ' + (si + 1) + '</span>'
          + (p.servicios.length > 1 ? '<span onclick="ncRemoveServicio(' + pi + ',' + si + ')" style="color:var(--danger);cursor:pointer;">✕ quitar</span>' : '')
          + '</div>' + selArea(pi, si, s) + selSrv(pi, si, s) + '</div>';
      }).join('');

      var clienteHtml = p.tipo === 'existente'
        ? (p.codigo
            ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-soft,#f6f2ec);border-radius:10px;margin-bottom:8px;"><span style="font-size:13px;font-weight:700;">' + esc(p.nombre) + ' <span style="color:var(--ink-soft);font-weight:500;">' + esc(p.codigo) + '</span></span><span onclick="ncClearCliente(' + pi + ')" style="color:var(--danger);cursor:pointer;font-size:12px;">cambiar</span></div>'
            : '<input oninput="ncBuscarCliente(' + pi + ',this.value)" placeholder="Buscar por nombre, código o teléfono…" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px;box-sizing:border-box;background:var(--bg-card);color:var(--ink);margin-bottom:4px;"><div id="ncResultados_' + pi + '" style="max-height:170px;overflow:auto;border-radius:8px;"></div>')
        : '<input id="ncNomNueva_' + pi + '" value="' + esc(p.nombre) + '" oninput="window._ncState.personas[' + pi + '].nombre=this.value" placeholder="Nombre de la clienta" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px;box-sizing:border-box;background:var(--bg-card);color:var(--ink);margin-bottom:8px;">'
          + '<input id="ncTelNueva_' + pi + '" value="' + esc(p.telefono) + '" oninput="window._ncState.personas[' + pi + '].telefono=this.value" placeholder="Teléfono (opcional)" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px;box-sizing:border-box;background:var(--bg-card);color:var(--ink);margin-bottom:8px;">';

      var tp = totalPersona(p);
      return '<div style="background:var(--bg-card);border:1.5px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-size:13px;font-weight:800;color:var(--ink);">PERSONA ' + (pi + 1) + (tp ? ' · $' + tp : '') + '</div>'
        + (st.personas.length > 1 ? '<span onclick="ncRemovePersona(' + pi + ')" style="color:var(--danger);cursor:pointer;font-size:12px;font-weight:700;">✕ quitar</span>' : '')
        + '</div>'
        + '<div style="display:flex;gap:8px;margin-bottom:10px;">'
        + '<button onclick="ncSetTipoPersona(' + pi + ',\'existente\')" style="flex:1;padding:10px;border-radius:10px;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;background:' + (p.tipo === 'existente' ? 'var(--accent-deep);color:#fff' : 'var(--bg-soft,#efeae3);color:var(--ink)') + ';">Clienta existente</button>'
        + '<button onclick="ncSetTipoPersona(' + pi + ',\'nueva\')" style="flex:1;padding:10px;border-radius:10px;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;background:' + (p.tipo === 'nueva' ? 'var(--accent-deep);color:#fff' : 'var(--bg-soft,#efeae3);color:var(--ink)') + ';">+ Clienta nueva</button>'
        + '</div>'
        + clienteHtml
        + '<div style="font-size:11px;font-weight:800;color:var(--ink-soft);margin:10px 0 6px;">SERVICIOS</div>'
        + serviciosHtml
        + (p.servicios.length < 5 ? '<button onclick="ncAddServicio(' + pi + ')" style="width:100%;padding:11px;border:1.5px dashed var(--accent-deep);border-radius:12px;background:transparent;color:var(--accent-deep);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">+ Agregar servicio (' + p.servicios.length + '/5)</button>' : '')
        + '</div>';
    }).join('');

    cont.innerHTML =
        // Modo
        '<div style="display:flex;gap:10px;margin-bottom:14px;">'
      + '<button onclick="ncSetModo(\'ahora\')" style="flex:1;padding:14px;border-radius:14px;border:none;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:' + (!esFuturo ? 'var(--ink,#1a1a1a);color:#fff' : 'var(--bg-card);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)') + ';">Atender ahora</button>'
      + '<button onclick="ncSetModo(\'futuro\')" style="flex:1;padding:14px;border-radius:14px;border:none;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:' + (esFuturo ? 'var(--ink,#1a1a1a);color:#fff' : 'var(--bg-card);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)') + ';">Agendar para después</button>'
      + '</div>'
      + '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:14px;line-height:1.4;">' + (esFuturo
          ? 'Reserva futura: se guarda en agenda y pasa a Prelista cuando llegue la hora.'
          : 'Atención inmediata: la clienta entra directo a la lista de espera de NexServ.') + '</div>'
        // Día / Hora
      + '<div style="display:flex;gap:10px;margin-bottom:14px;">'
      + '<div style="flex:1;"><label style="font-size:11px;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">Día</label>'
      + '<input type="date" value="' + esc(st.fecha) + '" oninput="window._ncState.fecha=this.value" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;box-sizing:border-box;background:var(--bg-card);color:var(--ink);"></div>'
      + '<div style="flex:1;"><label style="font-size:11px;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">Hora' + (esFuturo ? '' : ' <span style="font-weight:500;">(opcional)</span>') + '</label>'
      + '<input type="time" value="' + esc(st.hora) + '" oninput="window._ncState.hora=this.value" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;box-sizing:border-box;background:var(--bg-card);color:var(--ink);"></div>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--ink-soft);margin-bottom:14px;">Todas las personas inician a la hora elegida (en paralelo, cada una con su staff).</div>'
        // Personas
      + personasHtml
      + '<button onclick="ncAddPersona()" style="width:100%;padding:13px;border:1.5px dashed var(--accent-deep);border-radius:14px;background:transparent;color:var(--accent-deep);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:10px;">+ Agregar otra persona</button>'
      + '<button onclick="ncPreview()" style="width:100%;padding:14px;border:none;border-radius:14px;background:var(--ink,#1a1a1a);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:10px;">Previsualización · ver espacios</button>'
      + '<div id="ncPreviewBox"></div>'
      + '<button onclick="ncAgendar()" id="ncAgendarBtn" style="width:100%;padding:16px;border:none;border-radius:16px;background:var(--accent-deep,#5b3bc4);color:#fff;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;">' + (esFuturo ? 'Agendar cita' : 'Enviar a lista de espera') + '</button>';
  }

  // ── Preview / validación (ver espacios) ────────────────────────────────────
  function _ncValidar() {
    var st = window._ncState;
    if (!st.fecha) return 'Elegí el día.';
    if (st.modo === 'futuro' && !st.hora) return 'Para una cita futura, elegí la hora.';
    if (!st.personas.length) return 'Agregá al menos una persona.';
    for (var i = 0; i < st.personas.length; i++) {
      var p = st.personas[i];
      if (p.tipo === 'existente' && !p.codigo) return 'Persona ' + (i + 1) + ': elegí una clienta.';
      if (p.tipo === 'nueva' && !String(p.nombre || '').trim()) return 'Persona ' + (i + 1) + ': poné el nombre de la clienta nueva.';
      var conSrv = p.servicios.filter(function (s) { return s.servicio; });
      if (!conSrv.length) return 'Persona ' + (i + 1) + ': agregá al menos un servicio.';
    }
    return '';
  }
  window.ncPreview = function () {
    var box = document.getElementById('ncPreviewBox');
    if (!box) return;
    var err = _ncValidar();
    if (err) { box.innerHTML = '<div style="margin-bottom:10px;padding:12px;background:#fdecec;color:#c0392b;border-radius:12px;font-size:13px;font-weight:600;">⚠ ' + esc(err) + '</div>'; return; }
    var st = window._ncState;
    var totalGral = 0;
    var filas = st.personas.map(function (p, pi) {
      var t = totalPersona(p); totalGral += t;
      var svs = p.servicios.filter(function (s) { return s.servicio; }).map(function (s) { return esc(s.promoNombre || s.servicio); }).join(', ');
      return '<div style="font-size:13px;display:flex;justify-content:space-between;margin-bottom:4px;"><span>' + esc(p.nombre || ('Persona ' + (pi + 1))) + ' — ' + svs + '</span><span>$' + t + '</span></div>';
    }).join('');
    box.innerHTML = '<div style="margin-bottom:12px;padding:12px;background:var(--bg-soft,#f6f2ec);border-radius:12px;">'
      + '<div style="font-size:11px;font-weight:800;color:var(--ink-soft);margin-bottom:8px;">RESUMEN · ' + esc(st.fecha) + (st.hora ? ' · ' + esc(st.hora) : '') + '</div>'
      + filas
      + '<div style="font-size:14px;font-weight:800;display:flex;justify-content:space-between;margin-top:6px;border-top:1px solid var(--line);padding-top:6px;"><span>Total (' + st.personas.length + ' persona' + (st.personas.length > 1 ? 's' : '') + ')</span><span>$' + totalGral + '</span></div>'
      + '</div>';
  };

  // ── Guardar (agendar) ──────────────────────────────────────────────────────
  window.ncAgendar = async function () {
    var err = _ncValidar();
    if (err) { alert(err); ncPreview(); return; }
    var st = window._ncState;
    var btn = document.getElementById('ncAgendarBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    var okCount = 0, fail = [];
    for (var i = 0; i < st.personas.length; i++) {
      var p = st.personas[i];
      var codigo = p.codigo, nombre = p.nombre;
      // Clienta nueva → crearla primero
      if (p.tipo === 'nueva') {
        try {
          var rc = await apiPost('addClienta', { nombre: nombre, telefono: p.telefono || '' });
          if (rc && rc.success && rc.codigo) { codigo = rc.codigo; window._ncClientas = null; window._acClientas = null; }
          else { fail.push((nombre || ('Persona ' + (i + 1))) + ' (no se pudo crear)'); continue; }
        } catch (e) { fail.push((nombre || ('Persona ' + (i + 1))) + ' (error creando)'); continue; }
      }
      // Armar servicios de la persona
      var items = p.servicios.filter(function (s) { return s.servicio; });
      var areas = [], nombres = [], total = 0, promoNombre = '', precioPromo = 0, precioRegular = 0, vistos = {};
      items.forEach(function (s) {
        if (s.area && s.area !== 'promos' && areas.indexOf(s.area) < 0) areas.push(s.area);
        nombres.push(s.servicio);
        if (s.promoNombre) { if (!vistos[s.promoNombre]) { vistos[s.promoNombre] = 1; total += Number(s.precioPromo) || 0; if (!promoNombre) { promoNombre = s.promoNombre; precioPromo = s.precioPromo; precioRegular = s.precioRegular; } } }
        else total += Number(s.precio) || 0;
      });
      var payload = {
        codigo: codigo, nombre: nombre,
        servicio: nombres.join(' + '),
        area: areas[0] || (items[0] && items[0].area) || '',
        total: total, origen: 'Mikaela',
        horaAgendada: st.hora || '',
        observaciones: 'Fecha ' + st.fecha,
        directoListaEspera: (st.modo === 'ahora')   // ahora → Esperando; futuro → Prelista
      };
      if (promoNombre) { payload.promoNombre = promoNombre; payload.precioPromo = precioPromo; payload.precioRegular = precioRegular; }
      if (areas.length > 1) { payload.secuencia = areas; }
      // Servicios ESTRUCTURADOS (para que el backend arme las líneas LINEAS por área/staff
      // = TicketMulti cuando hay 2+ áreas). El backend usa esto en vez del string concatenado.
      payload.servicios = items.map(function (s) {
        return {
          area: s.area, servicio: s.servicio,
          precio: Number(s.precio) || 0,
          promoNombre: s.promoNombre || '',
          precioPromo: Number(s.precioPromo) || 0,
          precioRegular: Number(s.precioRegular) || 0
        };
      });
      try {
        var r = await apiPost('crearTicketSyna', payload);
        if (r && r.success) okCount++;
        else fail.push((nombre || ('Persona ' + (i + 1))) + ' (' + ((r && (r.message || r.error)) || 'error') + ')');
      } catch (e) { fail.push((nombre || ('Persona ' + (i + 1))) + ' (conexión)'); }
    }

    if (btn) { btn.disabled = false; btn.textContent = (st.modo === 'futuro') ? 'Agendar cita' : 'Enviar a lista de espera'; }

    if (okCount > 0 && !fail.length) {
      if (typeof showToast === 'function') showToast((st.modo === 'futuro' ? '📅 ' : '✅ ') + okCount + ' persona' + (okCount > 1 ? 's' : '') + (st.modo === 'futuro' ? ' agendada' : ' en lista') + (okCount > 1 ? 's' : ''));
      try { if (st.modo === 'ahora' && typeof loadMikaelaHome === 'function') loadMikaelaHome(); else if (typeof loadPrelista === 'function') loadPrelista(); } catch (e) {}
      if (typeof show === 'function') show('mikaelaHome');
    } else {
      alert((okCount ? okCount + ' guardada(s). ' : '') + 'Fallaron: ' + fail.join(', '));
    }
  };
})();
