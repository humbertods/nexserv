/* ============================================================================
   NexServ · RECORDATORIOS (Central/Mikaela) — módulo frontend independiente
   ----------------------------------------------------------------------------
   Bandeja de seguimientos. NO envía mensajes: construye el deeplink de
   WhatsApp y lo abre. Abrir WhatsApp ≠ contactada — el contacto se registra
   SOLO con la acción explícita "Marcar contactada".

   El normalizador de teléfono vive acá (frontend). El teléfono NUNCA se
   manda al backend para construir el enlace.

   Expone SOLO window.loadRecordatorios (+ los handlers de sus onclick).
   No toca main-1/2/3/4.
   ========================================================================== */
(function (window) {
  'use strict';

  var RB = {
    tab: 'hoy',
    data: null,
    cargando: false,
    enVuelo: {},                     // id_recordatorio → true (anti doble tap)
    avisoReconciliacion: '',         // último fallo de reconciliación (se muestra)
    pendienteBootstrap: false        // el módulo aún no fue inicializado
  };

  var TABS = [
    { key: 'hoy',         label: 'Hoy' },
    { key: 'vencidos',    label: 'Vencidos' },
    { key: 'proximos',    label: 'Próximos' },
    { key: 'contactados', label: 'Contactados' }
  ];

  // ── Seguridad: todo valor que venga de Sheets pasa por acá ───────────────
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { return document.getElementById(id); }

  // ═══════════════════════════════════════════════════════════
  // BLOQUE 8 — NORMALIZADOR DE TELÉFONO (Ecuador)
  // Devuelve el número en formato internacional sin '+', o '' si es
  // imposible. NUNCA se construye un enlace hacia un número inválido.
  // ═══════════════════════════════════════════════════════════
  function recNormalizarTelefonoEC(raw) {
    var s = String(raw == null ? '' : raw);
    // 1-4) sólo dígitos: fuera espacios, guiones, '+', paréntesis, puntos…
    var d = s.replace(/\D+/g, '');
    if (!d) return '';

    // 00593… → 593…  (prefijo internacional escrito a la vieja usanza)
    if (d.indexOf('00593') === 0) d = d.slice(2);

    // 5) móvil local 09XXXXXXXX (10 díg.) → 5939XXXXXXXX
    if (d.length === 10 && d.charAt(0) === '0' && d.charAt(1) === '9') {
      return '593' + d.slice(1);
    }
    // ya internacional: 593 + 9XXXXXXXX (12 díg.)
    if (d.length === 12 && d.indexOf('5939') === 0) return d;
    // 9XXXXXXXX sin el 0 inicial (9 díg.)
    if (d.length === 9 && d.charAt(0) === '9') return '593' + d;

    // 6) todo lo demás (fijos, longitudes imposibles, vacíos) → rechazado
    return '';
  }

  // ═══════════════════════════════════════════════════════════
  // BLOQUE 9 — MENSAJE + DEEPLINK
  // Placeholders soportados: {cliente} {servicio} {dias}
  // ═══════════════════════════════════════════════════════════
  var REC_MENSAJE_DEFAULT =
    'Hola {cliente} 😊 Esperamos que estés muy bien.\n' +
    'Ya corresponde aproximadamente el seguimiento de tu servicio de {servicio}.\n' +
    'Si deseas, podemos ayudarte a coordinar tu próxima cita. ✨';

  function recRenderMensaje(plantilla, item) {
    var base = String(plantilla || REC_MENSAJE_DEFAULT);
    return base
      .replace(/\{cliente\}/g,  String((item && item.cliente) || '').trim())
      .replace(/\{servicio\}/g, String((item && item.servicio) || '').trim())
      .replace(/\{dias\}/g,     String((item && item.dias_aplicados) || ''));
  }

  // Construye el deeplink. Devuelve '' si el teléfono no es válido.
  function recBuildWhatsApp(item, plantilla) {
    var tel = recNormalizarTelefonoEC(item && item.telefono);
    if (!tel) return '';
    return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(recRenderMensaje(plantilla, item));
  }

  // ── Carga ────────────────────────────────────────────────────────────────
  // Dos caminos deliberadamente distintos:
  //
  //   loadRecordatorios()  → ENTRADA. Reconcilia UNA vez y luego carga.
  //                          Es el nombre que ya invocan router.js (hook de
  //                          show('recordatoriosCentral')) e index.html
  //                          (botón "↻ Actualizar"). Se conserva el nombre
  //                          para no tener que modificar esos dos archivos.
  //   cargarBandeja()      → REFRESCO. Sólo lee. Es lo que usan las mutaciones
  //                          (contactar / posponer / cancelar / frecuencia),
  //                          para que un refresco posterior a una mutación NO
  //                          dispare una segunda reconciliación.
  //
  // Sin polling y sin trigger: la reconciliación ocurre únicamente cuando la
  // persona entra a la pantalla o pulsa Actualizar. La serialización sigue
  // siendo el ScriptLock exterior del preludio de doPost; acá no se agrega
  // ninguna otra. RB.cargando impide dos entradas simultáneas.

  async function reconciliarYCargar() {
    if (RB.cargando) return;                 // guard: una sola por entrada
    var cont = el('recContenido');
    if (!cont) return;
    RB.cargando = true;
    RB.pendienteBootstrap = false;
    cont.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">⏳ Actualizando seguimientos…</div>';
    var errRec = '';
    try {
      var rr = await apiPost('recordatoriosReconciliar', {});
      // REC_BOOTSTRAP_REQUIRED no es un error: es el módulo diciendo que todavía
      // no fue sembrado. Se informa con su propio mensaje y sin alarma roja.
      if (rr && rr.code === 'REC_BOOTSTRAP_REQUIRED') {
        RB.pendienteBootstrap = true;
      } else if (!rr || !rr.success) {
        // El fallo real NO se oculta: se muestra sobre la bandeja. Aun así se
        // intenta leer lo existente, para no dejar a Central sin pantalla.
        errRec = (rr && (rr.error || rr.message)) || 'No se pudo reconciliar.';
      }
    } catch (e) {
      errRec = 'Error de red al reconciliar: ' + (e && e.message ? e.message : e);
    } finally {
      RB.cargando = false;
    }
    RB.avisoReconciliacion = errRec;
    await cargarBandeja();
  }

  async function cargarBandeja(tab) {
    if (tab) RB.tab = tab;
    var cont = el('recContenido');
    if (!cont) return;
    if (RB.cargando) return;
    RB.cargando = true;
    if (!cont.innerHTML) {
      cont.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">⏳ Cargando seguimientos…</div>';
    }
    try {
      var r = await apiGet('getRecordatoriosBandeja');
      if (!r || !r.success) {
        var msg = (r && (r.error || r.message)) || 'No se pudo cargar.';
        cont.innerHTML = '<div class="card" style="padding:18px;text-align:center;color:var(--danger);font-size:13px;">'
          + esc(msg) + '</div>';
        RB.data = null;
        return;
      }
      RB.data = r;
      render();
    } catch (e) {
      cont.innerHTML = '<div class="card" style="padding:18px;text-align:center;color:var(--danger);font-size:13px;">'
        + esc('Error de red: ' + (e && e.message ? e.message : e)) + '</div>';
    } finally {
      RB.cargando = false;
    }
  }

  function setTab(t) { RB.tab = t; render(); }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    var cont = el('recContenido');
    if (!cont || !RB.data) return;
    var d = RB.data, h = '';

    // Módulo sin inicializar: mensaje claro y explícito de que no se tocó nada.
    if (RB.pendienteBootstrap) {
      h += '<div class="card" style="padding:11px 14px;margin-bottom:12px;border:1px solid var(--line);font-size:12px;">'
        +    '<div style="font-weight:800;">Módulo pendiente de inicialización.</div>'
        +    '<div style="color:var(--ink-soft);margin-top:3px;">No se modificó ningún dato. La siembra inicial del histórico se autoriza aparte.</div>'
        +  '</div>';
    }

    // Fallo de reconciliación: se muestra, nunca se traga en silencio.
    if (RB.avisoReconciliacion) {
      h += '<div class="card" style="padding:11px 14px;margin-bottom:12px;border:1px solid var(--danger);color:var(--danger);font-size:12px;font-weight:700;">'
        +    '⚠ No se pudo reconciliar: ' + esc(RB.avisoReconciliacion)
        +    '<div style="font-weight:500;margin-top:3px;">La lista de abajo puede no incluir las visitas más recientes.</div>'
        +  '</div>';
    }
    (d.avisos || []).forEach(function (a) {
      h += '<div class="card" style="padding:10px 14px;margin-bottom:10px;border:1px solid var(--line);color:var(--ink-soft);font-size:12px;">⚠ ' + esc(a) + '</div>';
    });

    // Pestañas
    h += '<div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;">';
    TABS.forEach(function (t) {
      var n = (d.conteos && d.conteos[t.key]) || 0;
      var act = RB.tab === t.key;
      h += '<button onclick="recSetTab(\'' + t.key + '\')" style="flex:none;padding:8px 13px;border-radius:999px;'
        +  'font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;'
        +  'border:1px solid ' + (act ? 'var(--accent)' : 'var(--line)') + ';'
        +  'background:' + (act ? 'var(--accent)' : 'var(--bg-card)') + ';'
        +  'color:' + (act ? '#fff' : 'var(--ink)') + ';">'
        +  esc(t.label) + ' · ' + n + '</button>';
    });
    h += '</div>';

    var lista = d[RB.tab] || [];
    if (!lista.length) {
      h += '<div class="card" style="text-align:center;padding:22px;color:var(--ink-faint);font-size:13px;">'
        +  'Sin seguimientos en esta sección.</div>';
    } else {
      lista.forEach(function (it) { h += tarjeta(it); });
    }

    // Fuera de ventana: existen y están guardados, pero todavía no toca verlos.
    if (d.ocultos) {
      h += '<div style="text-align:center;padding:12px 6px 0;color:var(--ink-faint);font-size:11px;">'
        +    d.ocultos + ' seguimiento' + (d.ocultos === 1 ? '' : 's') + ' más aún no entra'
        +    (d.ocultos === 1 ? '' : 'n') + ' en su ventana de aviso.</div>';
    }
    cont.innerHTML = h;
  }

  function tarjeta(it) {
    var ee = String(it.estado_efectivo || '');
    var col = ee === 'vencido' ? 'var(--danger)'
            : ee === 'hoy'     ? 'var(--accent)'
            : ee === 'contactado' ? 'var(--success)' : 'var(--line)';
    var tel = recNormalizarTelefonoEC(it.telefono);
    var bloq = !!RB.enVuelo[it.id_recordatorio];

    // Etiqueta de tiempo. Lenguaje de SEGUIMIENTO, nunca "próximo retoque".
    var dh = it.dias_hasta_objetivo;
    var etiqueta = (dh == null) ? ''
      : dh < 0  ? ('Vencido hace ' + Math.abs(dh) + ' día' + (Math.abs(dh) === 1 ? '' : 's'))
      : dh === 0 ? 'Contactar hoy'
      : dh === 1 ? 'Contactar mañana'
      : ('Contactar en ' + dh + ' días');

    var h = '<div class="card" style="padding:13px 15px;margin-bottom:11px;border-left:3px solid ' + col + ';'
          + 'opacity:' + (bloq ? '0.55' : '1') + ';">';

    h += '<div style="display:flex;align-items:flex-start;gap:8px;">'
      +    '<div style="flex:1;min-width:0;">'
      +      '<div style="font-weight:800;font-size:14px;">' + esc(it.cliente || '(sin nombre)') + '</div>'
      +      '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">'
      +        esc(it.codigo) + ' · ' + esc(it.servicio || it.area || '')
      +        (it.variante ? ' · ' + esc(it.variante) : '')
      +      '</div>'
      +    '</div>'
      +    '<div style="text-align:right;flex:none;">'
      +      '<div style="font-size:11px;font-weight:800;color:' + col + ';">' + esc(etiqueta) + '</div>'
      +      (it.origen_frecuencia === 'PERSONALIZADA'
             ? '<div style="font-size:9px;font-weight:800;letter-spacing:.04em;color:var(--ink-faint);margin-top:2px;">FREC. PROPIA ' + esc(it.dias_aplicados) + 'd</div>'
             : '')
      +    '</div>'
      +  '</div>';

    h += '<div style="margin-top:7px;font-size:11px;color:var(--ink-soft);line-height:1.6;">'
      +    '<div>Última visita: ' + esc(it.fecha_servicio || '—')
      +      (it.dias_desde_servicio != null ? ' · hace ' + it.dias_desde_servicio + ' d' : '') + '</div>'
      +    '<div>Fecha objetivo: ' + esc(it.fecha_objetivo || '—') + '</div>'
      +    '<div>Teléfono: ' + (tel ? esc(it.telefono) : '<span style="color:var(--danger);">no registrado o inválido</span>') + '</div>'
      +  '</div>';

    if (it.otro_seguimiento_cercano) {
      h += '<div style="margin-top:7px;font-size:11px;font-weight:700;color:var(--ink-soft);">'
        +    'ⓘ Esta clienta tiene otro seguimiento próximo.</div>';
    }

    if (it.estado === 'contactado') {
      h += '<div style="margin-top:8px;font-size:11px;color:var(--success);font-weight:700;">'
        +    'Contactada el ' + esc(it.fecha_contacto || '—') + ' por ' + esc(it.contactado_por || '—') + '</div>';
      h += '</div>';
      return h;
    }

    // Acciones
    var idA = "'" + esc(it.id_recordatorio) + "'";
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;">';
    h +=   btn(tel ? ('recAbrirWhatsApp(' + idA + ')') : '', 'WhatsApp', tel && !bloq, 'var(--success)');
    h +=   btn('recMarcarContactada(' + idA + ')', 'Marcar contactada', !bloq, 'var(--accent)');
    h +=   btn('recPosponer(' + idA + ')', 'Posponer', !bloq, '');
    h +=   btn('recCambiarFrecuencia(' + idA + ')', 'Cambiar frecuencia', !bloq, '');
    h +=   btn('recCancelar(' + idA + ')', 'No recordar', !bloq, '');
    h +=   btn('recVerHistorial(' + idA + ')', 'Ver historial', !bloq, '');
    h += '</div>';

    h += '</div>';
    return h;
  }

  function btn(accion, texto, habilitado, colorFondo) {
    var bg = habilitado && colorFondo ? colorFondo : 'var(--bg-card)';
    var fg = habilitado && colorFondo ? '#fff' : 'var(--ink)';
    return '<button ' + (habilitado && accion ? 'onclick="' + accion + '"' : 'disabled') + ' '
      + 'style="flex:none;padding:7px 11px;border-radius:9px;font-size:11px;font-weight:800;'
      + 'border:1px solid var(--line);background:' + bg + ';color:' + fg + ';'
      + 'cursor:' + (habilitado ? 'pointer' : 'not-allowed') + ';opacity:' + (habilitado ? '1' : '.45') + ';">'
      + esc(texto) + '</button>';
  }

  function buscar(id) {
    if (!RB.data) return null;
    var secs = ['hoy', 'vencidos', 'proximos', 'contactados'];
    for (var s = 0; s < secs.length; s++) {
      var arr = RB.data[secs[s]] || [];
      for (var i = 0; i < arr.length; i++) if (arr[i].id_recordatorio === id) return arr[i];
    }
    return null;
  }

  function toast(m) { if (typeof showToast === 'function') showToast(m); else alert(m); }

  // ── Acciones ─────────────────────────────────────────────────────────────

  // Abrir WhatsApp NO marca contacto (Bloque 10). No hace ninguna llamada
  // al backend: sólo abre el deeplink construido acá.
  function recAbrirWhatsApp(id) {
    var it = buscar(id);
    if (!it) return;
    // Plantilla propia de la regla (RecordatoriosReglas.mensaje). Si viene
    // vacía, recBuildWhatsApp cae a REC_MENSAJE_DEFAULT.
    var url = recBuildWhatsApp(it, it.mensaje);
    if (!url) { toast('⚠ Teléfono no válido: no se puede abrir WhatsApp.'); return; }
    window.open(url, '_blank');
    toast('Se abrió WhatsApp. Recordá marcar contactada cuando envíes el mensaje.');
  }

  async function mutar(id, accion, payload, okMsg) {
    if (RB.enVuelo[id]) return;
    RB.enVuelo[id] = true; render();
    try {
      var r = await apiPost(accion, payload);
      // Refresco de sólo lectura: una mutación NUNCA vuelve a reconciliar.
      if (r && r.success) { toast(okMsg); delete RB.enVuelo[id]; await cargarBandeja(); return; }
      toast('⚠ ' + ((r && (r.error || r.message)) || 'No se pudo guardar.'));
    } catch (e) {
      toast('⚠ Error de red. Intentá de nuevo.');
    } finally {
      delete RB.enVuelo[id]; render();
    }
  }

  function recMarcarContactada(id) {
    var it = buscar(id);
    if (!it) return;
    if (!confirm('¿Confirmás que ya contactaste a ' + (it.cliente || 'esta clienta') + '?')) return;
    mutar(id, 'recordatoriosMarcarContactado', { id_recordatorio: id }, '✅ Contacto registrado.');
  }

  function recPosponer(id) {
    var v = prompt('Posponer SOLO este recordatorio.\n\nEscribí los días (1, 3, 7…) o una fecha dd/MM/aaaa.\nEsto NO cambia la frecuencia habitual de la clienta.', '3');
    if (v == null) return;
    v = String(v).trim();
    if (!v) return;
    var payload = { id_recordatorio: id };
    if (/^\d+$/.test(v)) payload.dias = Number(v); else payload.fecha = v;
    mutar(id, 'recordatoriosPosponer', payload, '📅 Recordatorio pospuesto.');
  }

  function recCambiarFrecuencia(id) {
    var it = buscar(id);
    if (!it) return;
    var v = prompt('Cambiar la frecuencia HABITUAL de ' + (it.cliente || 'esta clienta')
      + ' para "' + (it.servicio || it.area) + '".\n\nActual: ' + it.dias_aplicados + ' días ('
      + (it.origen_frecuencia === 'PERSONALIZADA' ? 'personalizada' : 'general') + ').\n'
      + 'Esto afecta los PRÓXIMOS ciclos, no el recordatorio actual.', String(it.dias_aplicados || ''));
    if (v == null) return;
    var n = Number(String(v).trim());
    if (!isFinite(n) || n <= 0) { toast('⚠ Ingresá un número de días mayor a 0.'); return; }
    mutar(id, 'recordatoriosSetFrecuenciaCliente',
      { codigo: it.codigo, regla_id: it.regla_id, dias_personalizados: n },
      '✅ Frecuencia actualizada a ' + n + ' días.');
  }

  function recCancelar(id) {
    var it = buscar(id);
    if (!it) return;
    if (!confirm('¿Cancelar este seguimiento de ' + (it.cliente || 'esta clienta') + '?')) return;
    mutar(id, 'recordatoriosCancelar', { id_recordatorio: id, motivo: 'NO_RECORDAR' }, 'Seguimiento cancelado.');
  }

  function recVerHistorial(id) {
    var it = buscar(id);
    if (!it) return;
    if (typeof openClientProfile === 'function') { openClientProfile(it.codigo); return; }
    toast('Historial no disponible en esta pantalla.');
  }

  // ── Exports mínimos ──────────────────────────────────────────────────────
  // Nombre conservado: es el que ya invocan router.js e index.html.
  window.loadRecordatorios        = reconciliarYCargar;
  // Alias explícito para dejar clara la diferencia entre ambos caminos.
  window.recReconciliarYCargar    = reconciliarYCargar;
  window.recCargarBandeja         = cargarBandeja;
  window.recSetTab                = setTab;
  window.recAbrirWhatsApp         = recAbrirWhatsApp;
  window.recMarcarContactada      = recMarcarContactada;
  window.recPosponer              = recPosponer;
  window.recCambiarFrecuencia     = recCambiarFrecuencia;
  window.recCancelar              = recCancelar;
  window.recVerHistorial          = recVerHistorial;
  // Expuestos para pruebas estáticas (Bloques 8 y 9).
  window.recNormalizarTelefonoEC  = recNormalizarTelefonoEC;
  window.recBuildWhatsApp         = recBuildWhatsApp;
  window.recRenderMensaje         = recRenderMensaje;

})(window);
