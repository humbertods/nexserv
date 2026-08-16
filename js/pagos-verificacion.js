/* ============================================================================
   NexServ · VERIFICACIÓN DE PAGOS (Owner) — módulo frontend independiente
   ----------------------------------------------------------------------------
   Conciliación, NO cobro. El check significa "el Owner confirmó que este medio
   de pago es real" (caja / banco / POS). No modifica el cobro original.

   Expone SOLO window.loadPagosVerificacion (+ los handlers de los onclick del
   markup que genera). Nada de esta lógica vive en main-1/3/4.
   ========================================================================== */
(function (window) {
  'use strict';

  var PV = {
    filtro: 'hoy',
    data: null,
    cargando: false,
    abanicos: { efectivo: false, transferencia: false, tarjeta: false },
    enVuelo: {}                        // componente_ref → true (anti doble tap)
  };

  var METODOS = [
    { key: 'efectivo',      label: 'Efectivo',      icono: '💵' },
    { key: 'transferencia', label: 'Transferencia', icono: '🏦' },
    { key: 'tarjeta',       label: 'Tarjeta',       icono: '💳' }
  ];

  // ── Seguridad: TODO valor que venga de Sheets pasa por acá ───────────────
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) { return '$' + (Number(n) || 0).toFixed(2); }

  function el(id) { return document.getElementById(id); }
  function setTxt(id, t) { var e = el(id); if (e) e.textContent = t; }

  // ── Carga ────────────────────────────────────────────────────────────────
  async function loadPagosVerificacion(filtro) {
    if (filtro) PV.filtro = filtro;
    var cont = el('pvContenido');
    if (!cont) return;
    if (PV.cargando) return;
    PV.cargando = true;
    cont.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">⏳ Cargando pagos…</div>';
    try {
      var r = await apiGet('getPagosVerificacion', { filtro: PV.filtro });
      if (!r || !r.success) {
        var msg = (r && (r.error || r.message)) || 'No se pudo cargar.';
        cont.innerHTML = '<div class="card" style="padding:18px;text-align:center;color:var(--danger);font-size:13px;">'
          + esc(msg) + '</div>';
        PV.data = null;
        return;
      }
      PV.data = r;
      render();
    } catch (e) {
      cont.innerHTML = '<div class="card" style="padding:18px;text-align:center;color:var(--danger);font-size:13px;">'
        + esc('Error de red: ' + (e && e.message ? e.message : e)) + '</div>';
    } finally {
      PV.cargando = false;
    }
  }

  function setFiltro(f) {
    PV.filtro = f;
    ['dia', 'semana', 'mes'].forEach(function (k) {
      var b = el('pvBtn_' + k);
      if (!b) return;
      var act = (k === 'dia' ? 'hoy' : k) === f;
      b.style.background = act ? 'var(--accent)' : 'var(--bg-card)';
      b.style.color      = act ? '#fff' : 'var(--ink)';
      b.style.borderColor = act ? 'var(--accent)' : 'var(--line)';
    });
    loadPagosVerificacion(f);
  }

  function toggleAbanico(metodo) {
    PV.abanicos[metodo] = !PV.abanicos[metodo];
    render();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    var cont = el('pvContenido');
    if (!cont || !PV.data) return;
    var d = PV.data;

    setTxt('pvRangoLabel', (d.rango && d.rango.label) || '');

    var totPend = 0, totVerif = 0;
    METODOS.forEach(function (m) {
      var t = (d.totales && d.totales[m.key]) || { pendiente: 0, verificado: 0 };
      totPend  += Number(t.pendiente  || 0);
      totVerif += Number(t.verificado || 0);
    });

    var h = '';
    // Resumen
    h += '<div class="card" style="padding:14px 16px;margin-bottom:14px;">'
      +   '<div style="display:flex;justify-content:space-between;padding:3px 0;font-weight:800;">'
      +     '<span>Total registrado</span><span>' + money(totPend + totVerif) + '</span></div>'
      +   '<div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--success);">'
      +     '<span>🟢 Verificado</span><span>' + money(totVerif) + '</span></div>'
      +   '<div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--danger);">'
      +     '<span>🔴 Pendiente</span><span>' + money(totPend) + '</span></div>'
      + '</div>';

    // Abanicos por método
    METODOS.forEach(function (m) {
      var t = (d.totales && d.totales[m.key]) || { pendiente: 0, verificado: 0 };
      // Un pago mixto aparece en el abanico de CADA método que lo compone,
      // pero siempre como la MISMA tarjeta (mismo pago_ref, mismo total).
      var pagos = (d.pagos || []).filter(function (p) {
        return (p.componentes || []).some(function (c) { return c.metodo === m.key; });
      });
      var abierto = !!PV.abanicos[m.key];
      var nComp = pagos.reduce(function (s, p) {
        return s + (p.componentes || []).filter(function (c) { return c.metodo === m.key; }).length;
      }, 0);

      h += '<div class="card" style="padding:0;margin-bottom:12px;overflow:hidden;">';
      h +=   '<div onclick="pvToggleAbanico(\'' + m.key + '\')" style="cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:10px;">'
        +      '<span style="font-size:18px;">' + m.icono + '</span>'
        +      '<div style="flex:1;">'
        +        '<div style="font-weight:800;font-size:14px;letter-spacing:-0.01em;">' + m.label + '</div>'
        +        '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">'
        +          nComp + (nComp === 1 ? ' componente' : ' componentes') + ' · '
        +          '<span style="color:var(--success);">' + money(t.verificado) + ' verif.</span> · '
        +          '<span style="color:var(--danger);">' + money(t.pendiente) + ' pend.</span>'
        +        '</div>'
        +      '</div>'
        +      '<span style="font-size:14px;color:var(--ink-faint);">' + (abierto ? '▲' : '▼') + '</span>'
        +    '</div>';

      if (abierto) {
        h += '<div style="padding:0 12px 12px;">';
        if (!pagos.length) {
          h += '<div style="text-align:center;padding:16px;color:var(--ink-faint);font-size:12px;">Sin pagos en este período.</div>';
        } else {
          pagos.forEach(function (p) { h += tarjetaPago(p, m.key); });
        }
        h += '</div>';
      }
      h += '</div>';
    });

    cont.innerHTML = h;
  }

  function tarjetaPago(p, metodoAbanico) {
    var verificado = p.estado === 'VERIFICADO';
    var comps = p.componentes || [];
    var esMixto = comps.length > 1;
    var nOk = comps.filter(function (c) { return c.verificado; }).length;
    var bg     = verificado ? 'var(--success-bg)' : 'var(--danger-bg)';
    var borde  = verificado ? 'var(--success)'    : 'var(--danger)';
    var badge  = verificado ? 'VERIFICADO'        : 'PENDIENTE';

    var h = '<div style="background:' + bg + ';border:1px solid ' + borde + ';border-radius:12px;padding:12px 14px;margin-top:10px;">';
    // Cabecera
    h +=   '<div style="display:flex;align-items:flex-start;gap:8px;">'
      +      '<div style="flex:1;min-width:0;">'
      +        '<div style="font-weight:800;font-size:14px;">' + esc(p.cliente || '(sin nombre)') + '</div>'
      +        '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">'
      +          esc(p.fecha) + (p.hora ? ' · ' + esc(p.hora) : '')
      +          (p.legacy ? ' · <span title="Pago anterior a la identidad nativa">histórico</span>' : '')
      +        '</div>'
      +      '</div>'
      +      '<div style="text-align:right;">'
      +        '<div style="font-weight:800;font-size:15px;">' + money(p.total) + '</div>'
      +        '<div style="font-size:9px;font-weight:800;letter-spacing:0.04em;color:' + borde + ';">' + badge + '</div>'
      +      '</div>'
      +    '</div>';

    // Detalle (servicios y productos del MISMO pago — nunca es dinero extra)
    if (p.detalle && p.detalle.length) {
      h += '<div style="margin-top:8px;font-size:11px;color:var(--ink-soft);line-height:1.6;">';
      p.detalle.forEach(function (dd) {
        h += '<div style="display:flex;justify-content:space-between;gap:8px;">'
          +    '<span>' + (dd.tipo === 'producto' ? '' : '· ') + esc(dd.servicio) + '</span>'
          +    '<span>' + money(dd.monto) + '</span>'
          +  '</div>';
      });
      h += '</div>';
    }

    if (esMixto) {
      h += '<div style="margin-top:8px;font-size:10px;font-weight:800;letter-spacing:0.04em;color:var(--ink-soft);">'
        +    'PARTE DE PAGO MIXTO · TOTAL TICKET ' + money(p.total)
        +    ' · ' + nOk + '/' + comps.length + ' confirmado' + (nOk === 1 ? '' : 's')
        +  '</div>';
    }

    // Componentes: solo los del abanico actual (así el total por método cuadra)
    comps.forEach(function (c) {
      if (c.metodo !== metodoAbanico) return;
      h += filaComponente(p, c);
    });

    h += '</div>';
    return h;
  }

  function filaComponente(p, c) {
    var v = !!c.verificado;
    var col = v ? 'var(--success)' : 'var(--danger)';
    var box = v ? '☑' : '☐';
    var bloq = !!PV.enVuelo[c.componente_ref];
    var args = "'" + esc(p.pago_ref) + "','" + esc(c.componente_ref) + "'," + (!v);
    return '<div onclick="' + (bloq ? '' : 'pvToggleComponente(' + args + ')') + '"'
      +    ' style="margin-top:10px;display:flex;align-items:center;gap:12px;padding:12px 12px;'
      +    'background:var(--bg-card);border:1px solid ' + col + ';border-radius:10px;'
      +    'cursor:' + (bloq ? 'wait' : 'pointer') + ';opacity:' + (bloq ? '0.55' : '1') + ';">'
      +      '<span style="font-size:24px;line-height:1;color:' + col + ';min-width:26px;text-align:center;">' + box + '</span>'
      +      '<div style="flex:1;min-width:0;">'
      +        '<div style="font-weight:700;font-size:13px;">' + money(c.monto) + ' · ' + esc(c.metodo || 'sin método') + '</div>'
      +        '<div style="font-size:11px;color:' + col + ';font-weight:700;margin-top:1px;">'
      +          (v ? 'Pago verificado' : 'Pendiente de verificar') + '</div>'
      +      '</div>'
      +    '</div>';
  }

  // ── Marcar / desmarcar ───────────────────────────────────────────────────
  // Sin optimismo ciego: se bloquea el control, se espera al backend y recién
  // ahí se actualiza el estado. Si falla, el estado visual anterior se conserva.
  async function toggleComponente(pagoRef, compRef, nuevoValor) {
    if (PV.enVuelo[compRef]) return;
    PV.enVuelo[compRef] = true;
    render();
    try {
      var r = await apiPost('setPagoVerificacion', {
        pago_ref: pagoRef, componente_ref: compRef, verificado: !!nuevoValor
      });
      if (r && r.success) {
        // Se aplica la verdad del backend, no la suposición del navegador.
        var p = (PV.data.pagos || []).filter(function (x) { return x.pago_ref === pagoRef; })[0];
        if (p) { p.componentes = r.componentes || p.componentes; p.estado = r.estado || p.estado;
                 p.verificado_por = r.verificado_por || ''; p.verificado_fecha = r.verificado_fecha || ''; }
        delete PV.enVuelo[compRef];
        // Los totales por método los recalcula el backend → recarga liviana.
        await loadPagosVerificacion();
        return;
      }
      var msg = (r && (r.error || r.message)) || 'No se pudo guardar la verificación.';
      if (typeof showToast === 'function') showToast('⚠ ' + msg); else alert(msg);
    } catch (e) {
      var m2 = 'Error de red al verificar. Intentá de nuevo.';
      if (typeof showToast === 'function') showToast('⚠ ' + m2); else alert(m2);
    } finally {
      delete PV.enVuelo[compRef];
      render();
    }
  }

  // ── Exports mínimos ──────────────────────────────────────────────────────
  window.loadPagosVerificacion = loadPagosVerificacion;
  window.pvSetFiltro           = setFiltro;
  window.pvToggleAbanico       = toggleAbanico;
  window.pvToggleComponente    = toggleComponente;

})(window);
