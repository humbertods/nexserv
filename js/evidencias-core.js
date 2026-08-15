// ================================================
// NexServ · EVIDENCIAS-CORE (frontend)
// Módulo genérico de evidencia fotográfica por área / cliente / visita.
// Se carga ANTES de los módulos que lo consumen (main-1, main-4).
//
// Depende únicamente de: apiGet, apiPost (js/api.js).
//
// ── STORAGE vs UI ───────────────────────────────────────────────────────────
// El backend devuelve SIEMPRE el historial completo. `uiMax` recorta solo la
// PRESENTACIÓN: las visitas que dejan de verse siguen almacenadas y vuelven a
// aparecer si se cambia la regla visual. Este archivo nunca borra nada.
//
// ── PESTAÑAS ────────────────────────────────────────────────────────────────
// Pestañas NO pasa por acá en esta fase: conserva íntegras sus funciones en
// nexserv-main-1.js. El core queda listo para absorberlas más adelante vía
// wrapper, sin reemplazo masivo.
// ================================================

(function () {
  'use strict';

  // ── Configuración declarativa por área (espejo del backend) ──────────────
  var EV_AREAS = {
    facial: {
      area: 'facial',
      modo: 'visita',
      // Una visita = un visita_id = hasta 6 fotos en dos momentos del MISMO
      // servicio. Antes/Después NO son visitas distintas.
      slots: ['lateral_antes', 'frente_antes', 'observacion_antes',
              'lateral_despues', 'frente_despues', 'observacion_despues'],
      grupos: [
        { key: 'antes',   titulo: 'ANTES',
          slots: ['lateral_antes', 'frente_antes', 'observacion_antes'] },
        { key: 'despues', titulo: 'DESPUÉS',
          slots: ['lateral_despues', 'frente_despues', 'observacion_despues'] }
      ],
      labels: {
        lateral_antes: 'Lateral', frente_antes: 'Frente', observacion_antes: 'Observación',
        lateral_despues: 'Lateral', frente_despues: 'Frente', observacion_despues: 'Observación'
      },
      uiMax: 3,                                  // SOLO presentación: últimas 3 VISITAS
      titulo: 'Evidencias de visita',
      accionLeer:   'getEvidenciasFacial',
      accionCrear:  'crearVisitaEvidenciaFacial',
      accionEnsure: 'ensureVisitaEvidenciaFacial',
      accionSubir:  'subirEvidenciaFacial'
    }
  };

  // Roles que pueden escribir. Espejo de EVIDENCIAS_WRITE_ROLES del backend.
  // Ocultar los botones es solo cortesía visual: la autoridad es el backend.
  var WRITE_ROLES = ['staff', 'admin', 'ceo'];

  function normRol(rol) {
    var s = String(rol || '').trim().toLowerCase();
    if (s === 'due\u00f1o' || s === 'dueno') return 'owner';
    return s;
  }
  function puedeEscribir(rol) { return WRITE_ROLES.indexOf(normRol(rol)) !== -1; }
  function rolActual() {
    return normRol(window.currentUser && (window.currentUser.role || window.currentUser.rol));
  }

  function cfgArea(area) {
    return Object.prototype.hasOwnProperty.call(EV_AREAS, area) ? EV_AREAS[area] : null;
  }

  // Iconos del sistema nx-icon de PROD: SVG plano, monocromático, currentColor.
  // Sin emoji, sin apariencia 3D, sin librería nueva.
  var ICO = {
    camara:  'M20 6h-2.586l-1.707-1.707A1 1 0 0 0 15 4H9a1 1 0 0 0-.707.293L6.586 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    lupa:    'M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39a1 1 0 0 0 1.42-1.42l-4.39-4.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
    galeria: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 14h16v-3l-4.5-4.5-4 4L8 12l-4 4v2Zm4.5-9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z'
  };
  function ico(nombre, px) {
    return '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
      'width="' + (px || 16) + '" height="' + (px || 16) + '" fill="currentColor" ' +
      'aria-hidden="true" style="vertical-align:-3px;margin-right:6px;">' +
      '<path d="' + ICO[nombre] + '"/></svg>';
  }

  // Un área sin `grupos` se dibuja como una sola sección sin título: así el
  // renderer sirve tanto a Facial (Antes/Después) como a áreas futuras planas.
  function gruposDe(cfg) {
    if (cfg.grupos && cfg.grupos.length) return cfg.grupos;
    return [{ key: '_', titulo: '', slots: cfg.slots }];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  // Estado por contenedor montado. Permite varios paneles simultáneos
  // (slot 1 y slot 2 del panel de atención) sin que se pisen.
  var _montajes = {};

  // ── Compresión de imagen ─────────────────────────────────────────────────
  // Implementación propia y genérica del core. La de Pestañas
  // (_evComprimirImagen en main-1) es local a ese archivo y no está expuesta
  // en window, así que no puede reutilizarse sin modificar Pestañas — que esta
  // fase debe dejar intacto.
  function evComprimirImagen(file, maxPx, quality) {
    maxPx = maxPx || 1400;
    quality = quality || 0.72;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo')); };
      reader.onload = function (ev) {
        var img = new Image();
        img.onerror = function () { reject(new Error('Imagen inválida')); };
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w >= h) { h = Math.round(h * (maxPx / w)); w = maxPx; }
            else        { w = Math.round(w * (maxPx / h)); h = maxPx; }
          }
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          var dataUrl = cv.toDataURL('image/jpeg', quality);
          resolve(dataUrl.split(',')[1] || '');   // base64 sin prefijo
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Visor ampliado ───────────────────────────────────────────────────────
  function evVerFoto(url) {
    if (!url) return;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.92);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.onclick = function () { ov.remove(); };
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:100%;max-height:100%;border-radius:12px;';
    var cerrar = document.createElement('div');
    cerrar.textContent = '✕';
    cerrar.style.cssText = 'position:absolute;top:14px;right:18px;color:#fff;font-size:26px;' +
      'font-weight:700;cursor:pointer;line-height:1;';
    ov.appendChild(img); ov.appendChild(cerrar);
    document.body.appendChild(ov);
  }

  // ── Menú de foto (ver / cambiar · cámara / biblioteca) ────────────────────
  function evMenuFoto(mid, visitaId, slot) {
    var st = _montajes[mid];
    if (!st) return;
    var v = (st.visitas || []).filter(function (x) { return x.visita_id === visitaId; })[0];
    var url = v && v.fotos ? (v.fotos[slot] || '') : '';
    var cfg = st.cfg;

    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:flex-end;justify-content:center;';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };

    var hoja = document.createElement('div');
    hoja.style.cssText = 'background:var(--bg-card,#fff);width:100%;max-width:460px;' +
      'border-radius:22px 22px 0 0;padding:16px 16px 22px;';

    var titulo = '<div style="font-size:12px;font-weight:700;color:var(--ink-faint,#999);' +
      'text-align:center;margin-bottom:12px;">' + esc(cfg.labels[slot] || slot) + '</div>';

    var btn = 'width:100%;padding:15px;margin-bottom:8px;border-radius:var(--radius-pill,999px);' +
      'font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid var(--line,#e5e5e5);' +
      'background:var(--bg-card,#fff);color:var(--ink,#111);';

    var html = titulo;
    if (url) {
      html += '<button data-ev="ver" style="' + btn + '">' + ico('lupa', 15) + 'Ver foto ampliada</button>';
    }
    if (st.puedeEditarFotos) {
      html += '<button data-ev="cam" style="' + btn + '">' + ico('camara', 15) + (url ? 'Cambiar' : 'Agregar') + ' — Cámara</button>' +
              '<button data-ev="lib" style="' + btn + '">' + ico('galeria', 15) + (url ? 'Cambiar' : 'Agregar') + ' — Biblioteca</button>';
    }
    html += '<button data-ev="cerrar" style="' + btn + 'border:none;background:var(--ink,#111);color:#fff;">Cancelar</button>';
    hoja.innerHTML = html;

    hoja.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ev]');
      if (!b) return;
      var acc = b.getAttribute('data-ev');
      ov.remove();
      if (acc === 'ver') return evVerFoto(url);
      if (acc === 'cam') return abrirSelector(mid, visitaId, slot, true);
      if (acc === 'lib') return abrirSelector(mid, visitaId, slot, false);
    });

    ov.appendChild(hoja);
    document.body.appendChild(ov);
  }

  // Input de archivo efímero: cámara (capture) o biblioteca.
  function abrirSelector(mid, visitaId, slot, camara) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    if (camara) inp.setAttribute('capture', 'environment');
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      inp.remove();
      if (f) evSubirDesdeInput(mid, visitaId, slot, f);
    });
    inp.click();
  }

  // ── Subida ───────────────────────────────────────────────────────────────
  async function evSubirDesdeInput(mid, visitaId, slot, file) {
    var st = _montajes[mid];
    if (!st) return;
    if (!st.puedeEditarFotos) { alert('No tenés permiso para modificar evidencias.'); return; }

    var cont = document.getElementById(mid);
    var celda = cont ? cont.querySelector('[data-ev-cell="' + visitaId + '|' + slot + '"]') : null;
    if (celda) celda.innerHTML = '<div style="padding:18px 4px;text-align:center;font-size:11px;' +
      'color:var(--ink-faint,#999);">⏳ Subiendo…</div>';

    try {
      var base64 = await evComprimirImagen(file, 1400, 0.72);
      if (!base64) throw new Error('No se pudo procesar la imagen');
      var r = await apiPost(st.cfg.accionSubir, {
        codigo: st.ctx.codigo,
        visita_id: visitaId,
        tipo: slot,
        imagen: base64,
        staff: st.ctx.staff || ''
      });
      if (r && r.success) {
        var v = (st.visitas || []).filter(function (x) { return x.visita_id === visitaId; })[0];
        if (v) { if (!v.fotos) v.fotos = {}; v.fotos[slot] = r.url; }
        render(mid);
      } else {
        alert('No se pudo guardar la foto: ' + ((r && (r.message || r.error)) || 'error desconocido'));
        render(mid);
      }
    } catch (e) {
      console.error('[EvidenciasCore] subir:', e);
      alert('Error al subir la foto.');
      render(mid);
    }
  }

  // ── Crear visita ─────────────────────────────────────────────────────────
  async function evCrearVisita(mid) {
    var st = _montajes[mid];
    if (!st) return;
    // Guardia REAL de la API pública: no alcanza con ocultar el botón. Quien
    // llame EvidenciasCore.crearVisita() sobre un montaje sin allowCreate es
    // rechazado acá, antes de tocar la red.
    if (!st.allowCreate) {
      console.warn('[EvidenciasCore] creación deshabilitada en este montaje (allowCreate:false)');
      alert('Desde aquí no se pueden crear visitas nuevas: la visita se crea durante la atención, con su servicio y ticket.');
      return;
    }
    if (!st.puedeCrearVisita) { alert('No tenés permiso para crear visitas.'); return; }

    var btn = document.querySelector('#' + mid + ' [data-ev-nueva]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creando…'; }

    try {
      var r = await apiPost(st.cfg.accionCrear, {
        codigo:     st.ctx.codigo,
        nombre:     st.ctx.nombre || '',
        servicio:   st.ctx.servicio || '',
        ticket_ref: st.ctx.ticket_ref || '',
        linea_id:   st.ctx.linea_id || '',
        staff:      st.ctx.staff || ''
      });
      if (r && r.success && r.visita) {
        st.visitas.push(r.visita);          // la nueva queda como la más reciente
        st.total = (st.total || 0) + 1;
        render(mid);
      } else {
        alert('No se pudo crear la visita: ' + ((r && (r.message || r.error)) || 'error desconocido'));
        render(mid);
      }
    } catch (e) {
      console.error('[EvidenciasCore] crear visita:', e);
      alert('Error al crear la visita.');
      render(mid);
    }
  }

  // ── Render de un slot fotográfico ────────────────────────────────────────
  function evFotoSlot(mid, visita, slot, labels, interactivo) {
    var url = (visita.fotos && visita.fotos[slot]) || '';
    var cell = 'data-ev-cell="' + esc(visita.visita_id + '|' + slot) + '"';
    var head = '<div style="font-size:10px;font-weight:700;color:var(--ink-faint,#999);' +
      'text-align:center;margin-bottom:5px;">' + esc(labels[slot] || slot) + '</div>';

    var cuerpo;
    if (url) {
      cuerpo = '<div style="position:relative;cursor:pointer;border-radius:12px;overflow:hidden;' +
        'aspect-ratio:3/4;background:#00000010;" ' +
        'onclick="EvidenciasCore.menuFoto(\'' + jsq(mid) + '\',\'' + jsq(visita.visita_id) + '\',\'' + jsq(slot) + '\')">' +
        '<img src="' + esc(url) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">' +
        '</div>';
    } else if (interactivo) {
      cuerpo = '<div style="border:2px dashed var(--line,#ddd);border-radius:12px;aspect-ratio:3/4;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;' +
        'color:var(--ink-faint,#999);" ' +
        'onclick="EvidenciasCore.menuFoto(\'' + jsq(mid) + '\',\'' + jsq(visita.visita_id) + '\',\'' + jsq(slot) + '\')">' +
        '<div style="font-size:20px;line-height:1;">+</div>' +
        '<div style="font-size:10px;font-weight:600;">Agregar</div></div>';
    } else {
      cuerpo = '<div style="border:1.5px solid var(--line,#eee);border-radius:12px;aspect-ratio:3/4;' +
        'display:flex;align-items:center;justify-content:center;color:var(--ink-faint,#bbb);' +
        'font-size:10px;font-weight:600;">Sin foto</div>';
    }
    return '<div ' + cell + '>' + head + cuerpo + '</div>';
  }

  // ── Render de las secciones (visitas visibles) ───────────────────────────
  function evRenderSecciones(mid) {
    var st = _montajes[mid];
    var cfg = st.cfg;
    var todas = st.visitas || [];

    // REGLA VISUAL: solo las últimas uiMax. Las anteriores siguen en la hoja.
    var visibles = cfg.uiMax > 0 ? todas.slice(-cfg.uiMax) : todas.slice();
    var ocultas = todas.length - visibles.length;

    var html = '';
    if (!todas.length) {
      var _msg = (st.autoEnsure && !st.ctx.ticket_ref)
        ? 'No se detectó la referencia del ticket de esta atención. Abrí la clienta desde su ticket para registrar evidencias.'
        : 'Sin visitas registradas todavía.';
      html += '<div style="text-align:center;padding:18px 8px;color:var(--ink-faint,#999);font-size:12px;">' +
        esc(_msg) + '</div>';
    }

    visibles.forEach(function (v, i) {
      html += '<div style="border:1.5px solid var(--line,#eee);border-radius:16px;padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">' +
          '<span style="font-size:13px;font-weight:800;">Visita ' + (i + 1) + '</span>' +
          '<span style="font-size:11px;font-weight:600;color:var(--ink-soft,#666);flex:1;min-width:80px;">' +
            esc(v.servicio || '—') + '</span>' +
          '<span style="font-size:11px;font-weight:600;color:var(--ink-faint,#999);">' + esc(v.fecha || '') + '</span>' +
          // Avance parcial: 0/6 … 6/6. Informativo, nunca bloquea el flujo.
          '<span style="font-size:10px;font-weight:700;color:var(--ink-faint,#aaa);' +
            'border:1px solid var(--line,#e5e5e5);border-radius:999px;padding:1px 7px;">' +
            cfg.slots.filter(function (s) { return !!(v.fotos && v.fotos[s]); }).length +
            '/' + cfg.slots.length + '</span>' +
        '</div>' +
        gruposDe(cfg).map(function (g) {
          return '<div style="margin-bottom:10px;">' +
            '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;' +
              'color:var(--ink-faint,#999);margin-bottom:6px;">' + esc(g.titulo) + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
              g.slots.map(function (s) {
                return evFotoSlot(mid, v, s, cfg.labels, st.puedeEditarFotos);
              }).join('') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    });

    if (ocultas > 0) {
      html += '<div style="text-align:center;font-size:10px;color:var(--ink-faint,#aaa);margin:-2px 0 10px;">' +
        ocultas + ' visita(s) anterior(es) conservada(s) en el historial</div>';
    }

    if (st.puedeCrearVisita) {
      html += '<button data-ev-nueva onclick="EvidenciasCore.crearVisita(\'' + jsq(mid) + '\')" ' +
        'style="width:100%;padding:13px;border:none;border-radius:var(--radius-pill,999px);' +
        'background:linear-gradient(135deg,#2d6a4f,#1a4a32);color:#fff;font-family:inherit;' +
        'font-size:13px;font-weight:700;cursor:pointer;">+ Agregar nueva visita</button>';
    }
    return html;
  }

  function render(mid) {
    var cont = document.getElementById(mid);
    if (!cont || !_montajes[mid]) return;
    var cuerpo = cont.querySelector('[data-ev-body]');
    if (cuerpo) cuerpo.innerHTML = evRenderSecciones(mid);
  }

  // ── Carga de datos ───────────────────────────────────────────────────────
  async function cargar(mid) {
    var st = _montajes[mid];
    if (!st) return;
    var cont = document.getElementById(mid);
    var cuerpo = cont ? cont.querySelector('[data-ev-body]') : null;
    if (cuerpo) cuerpo.innerHTML = '<div style="text-align:center;padding:18px;color:var(--ink-faint,#999);' +
      'font-size:12px;">⏳ Cargando evidencias…</div>';
    try {
      // ── Visita automática de la atención en curso ──
      // Idempotente en el BACKEND (clave codigo + ticket_ref): recargar la
      // página, plegar/desplegar o volver a StaffHome no duplica filas.
      var _visitaEnsure = null;
      if (st.autoEnsure && st.cfg.accionEnsure && st.ctx.ticket_ref) {
        try {
          var re = await apiPost(st.cfg.accionEnsure, {
            codigo:     st.ctx.codigo,
            nombre:     st.ctx.nombre || '',
            servicio:   st.ctx.servicio || '',    // dato del sistema, no input
            ticket_ref: st.ctx.ticket_ref,
            linea_id:   st.ctx.linea_id || ''
          });
          if (re && re.success && re.visita) {
            // El ensure YA devuelve la visita persistida CON sus fotos. Se guarda
            // como respaldo de pintado: si la lectura posterior fallara, se pinta
            // esto y NUNCA una visita vacía inventada en el cliente.
            _visitaEnsure = re.visita;
          } else {
            console.warn('[EvidenciasCore] ensure no completado:', re && (re.error || re.message));
          }
        } catch (eEns) { console.warn('[EvidenciasCore] ensure falló:', eEns); }
      }

      var r = await apiGet(st.cfg.accionLeer, { codigo: st.ctx.codigo });
      if (r && r.success) {
        st.visitas = r.visitas || [];
        st.total = r.total || st.visitas.length;
        // El backend es la autoridad: si dice que este rol no escribe, no escribe.
        st.puedeEditarFotos = !!r.puedeEscribir && !st.ctx.readonly;
        // La creación exige ADEMÁS que el montaje la habilite (contexto).
        st.puedeCrearVisita = st.puedeEditarFotos && st.allowCreate;
        var _over = {};
        if (r.uiMax != null) _over.uiMax = r.uiMax;
        if (r.slots && r.slots.length) _over.slots = r.slots;
        if (r.grupos && r.grupos.length) _over.grupos = r.grupos;
        if (r.labels) _over.labels = Object.assign({}, st.cfg.labels, r.labels);
        st.cfg = Object.assign({}, st.cfg, _over);
      } else if (_visitaEnsure) {
        // Lectura fallida pero el ensure trajo la visita persistida: se pinta esa,
        // con sus URLs reales. Jamás se sustituye por un contenedor vacío local.
        st.visitas = [_visitaEnsure];
        st.total = 1;
        st.puedeEditarFotos = !st.ctx.readonly;
        st.puedeCrearVisita = st.puedeEditarFotos && st.allowCreate;
      } else {
        st.visitas = [];
        st.puedeEditarFotos = false;
        st.puedeCrearVisita = false;
        if (cuerpo) {
          cuerpo.innerHTML = '<div style="text-align:center;padding:18px;color:var(--ink-faint,#999);' +
            'font-size:12px;">' + esc((r && (r.message || r.error)) || 'No se pudieron cargar las evidencias') + '</div>';
          return;
        }
      }
      st.cargado = true;
      render(mid);
    } catch (e) {
      console.error('[EvidenciasCore] cargar:', e);
      if (cuerpo) cuerpo.innerHTML = '<div style="text-align:center;padding:18px;color:var(--ink-faint,#999);' +
        'font-size:12px;">Error de conexión</div>';
    }
  }

  // ── Montaje del acordeón ─────────────────────────────────────────────────
  // containerId: id del <div> vacío donde se inyecta el acordeón.
  // ctx: { codigo, nombre, servicio, ticket_ref, linea_id, staff, readonly }
  // El acordeón arranca cerrado y carga en diferido al primer despliegue.
  function montarAcordeon(containerId, area, ctx) {
    var cont = document.getElementById(containerId);
    if (!cont) return;
    var cfg = cfgArea(area);
    if (!cfg) { console.warn('[EvidenciasCore] área no registrada:', area); return; }
    ctx = ctx || {};
    if (!ctx.codigo) { cont.innerHTML = ''; return; }

    var mid = containerId;
    // CAPACIDADES SEPARADAS. `allowCreate` es una restricción de CONTEXTO, no
    // de rol: Mikaela/CEO pueden crear visitas por API (integraciones futuras),
    // pero NO desde el Historial, donde no hay servicio ni ticket_ref activos y
    // la visita nacería con esos campos vacíos.
    //   readonly    → ni edita fotos ni crea (Owner)
    //   allowCreate → false oculta Y desactiva la creación en este montaje
    var _editable = !ctx.readonly && puedeEscribir(rolActual());
    _montajes[mid] = {
      cfg: cfg,
      ctx: ctx,
      visitas: [],
      total: 0,
      cargado: false,
      allowCreate: ctx.allowCreate !== false,     // por defecto permitido
      // autoEnsure: en una ATENCIÓN real, la visita se asegura sola. En
      // Historial es SIEMPRE false: mirar no crea registros.
      autoEnsure: ctx.autoEnsure === true && !ctx.readonly,
      // Estimación optimista para el primer pintado; el backend la confirma.
      puedeEditarFotos: _editable,
      puedeCrearVisita: _editable && (ctx.allowCreate !== false)
    };

    cont.innerHTML =
      '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden;">' +
        '<div data-ev-head style="padding:13px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;">' +
          // Icono del sistema nx-icon de PROD: SVG plano, monocromático,
          // fill=currentColor. Misma familia que Ficha facial / Ficha pestañas /
          // Evidencia del trabajo realizado. Sin emoji ni librería nueva.
          ico('camara', 16) +
          '<span style="font-weight:700;font-size:14px;flex:1;">' + esc(cfg.titulo) + '</span>' +
          '<span data-ev-caret style="color:var(--ink-faint,#999);">▾</span>' +
        '</div>' +
        '<div data-ev-body style="display:none;padding:0 14px 12px;">' +
          '<div style="text-align:center;padding:18px;color:var(--ink-faint,#999);font-size:12px;">Toca para cargar…</div>' +
        '</div>' +
      '</div>';

    var head = cont.querySelector('[data-ev-head]');
    var body = cont.querySelector('[data-ev-body]');
    var caret = cont.querySelector('[data-ev-caret]');
    head.addEventListener('click', function () {
      var abierto = body.style.display !== 'none';
      body.style.display = abierto ? 'none' : 'block';
      caret.textContent = abierto ? '▾' : '▴';
      // Al ABRIR siempre se relee del backend. Cerrar y reabrir, salir del
      // ticket, volver a StaffHome o refrescar no dependen de ningún estado en
      // memoria: las URLs de las fotos vienen siempre de EvidenciasFacial.
      if (!abierto) cargar(mid);
    });
  }

  // Atajo para el área Facial (el único consumidor en esta fase).
  function montarAcordeonFacial(containerId, ctx) {
    return montarAcordeon(containerId, 'facial', ctx);
  }

  // ── API pública ──────────────────────────────────────────────────────────
  window.EvidenciasCore = {
    AREAS: EV_AREAS,
    montarAcordeon: montarAcordeon,
    montarAcordeonFacial: montarAcordeonFacial,
    menuFoto: evMenuFoto,
    verFoto: evVerFoto,
    crearVisita: evCrearVisita,
    subirDesdeInput: evSubirDesdeInput,
    comprimirImagen: evComprimirImagen,
    renderSecciones: evRenderSecciones,
    puedeEscribir: puedeEscribir,
    normRol: normRol
  };
})();
