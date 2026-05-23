// ================================================================
// NEXSERV — MANDAMIENTOS DEL SISTEMA
// ================================================================
// Este archivo contiene las reglas inmutables del sistema.
// Se carga ANTES del index.html principal.
//
// ¿Cómo funciona?
//   index.html carga este archivo con:
//   <script src="nexserv-mandamientos.js"></script>
//
// Las funciones aquí definidas son globales y las usa el index.
// Cuando actualices index.html, este archivo NO cambia.
// Cuando quieras agregar un mandamiento nuevo, editás solo este archivo.
// ================================================================

// ── MANDAMIENTO #1 — ÁREA PRIORITARIA ───────────────────────────
// Todo servicio se guía por el orden que dicte Mikaela (_secuencia).
// Si Mikaela no toca el orden → primer servicio del formulario.
// SIN EXCEPCIONES. Esta es la ÚNICA función que determina el área.
// ──────────────────────────────────────────────────────────────────
window.getAreaPrioritaria = function(tipo) {
  const AL = {
    cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas',
    facial: 'Facial', retiro_lifting: 'Lifting / Retiro'
  };
  const AK = {
    'Cejas': 'cejas', 'Depilación': 'depilacion', 'Pestañas': 'pestanas',
    'Facial': 'facial', 'Lifting / Retiro': 'retiro_lifting'
  };

  // Regla 1: secuencia de Mikaela manda siempre
  if (window._secuencia && window._secuencia.length > 0) {
    const k = String(window._secuencia[0].area || '').toLowerCase();
    return { key: k, label: AL[k] || 'Cejas' };
  }

  // Regla 2: sin secuencia → primer servicio del formulario
  if (tipo === 'multi') {
    const lbl = document.getElementById('arrAreaMulti')?.value || 'Cejas';
    return { key: AK[lbl] || 'cejas', label: lbl };
  }
  if (tipo === 'promo') {
    const pr = window._arrPromo || (window._arrPromos && window._arrPromos.find(p => p));
    if (pr && pr.division && pr.division.length > 0) {
      const dv = [...pr.division].sort((a, b) => Number(b.monto||0) - Number(a.monto||0));
      const d  = String(dv[0].area || '').toLowerCase();
      const k  = d.includes('pest') || d.includes('lifting') || d.includes('retiro') ? 'pestanas'
               : d.includes('facial') || d.includes('hidra') ? 'facial'
               : d.includes('depil') || d.includes('bikini') ? 'depilacion'
               : 'cejas';
      return { key: k, label: AL[k] || 'Cejas' };
    }
  }
  const lbl = document.getElementById('arrArea')?.value || 'Cejas';
  return { key: AK[lbl] || 'cejas', label: lbl };
};

// ── MANDAMIENTO #2 — CONFIRMACIÓN OBLIGATORIA ───────────────────
// Toda staff, al tomar cualquier clienta, SIEMPRE ve el modal
// "Confirmar servicio" antes de empezar.
// Sin excepciones: normal, promo, TM, enganche, depilación.
// ──────────────────────────────────────────────────────────────────
window.confirmarServicioObligatorio = function(slot, delayMs) {
  const delay = delayMs || 350;
  setTimeout(function() {
    try {
      const clientName = document.getElementById('as' + slot + 'Name')
        ?.textContent?.replace(' ⭐', '') || '';
      if (!clientName || clientName === 'Sin clienta') {
        // Datos no listos — reintentar una vez
        setTimeout(function() {
          try { window.showConfirmServiceModal(slot); }
          catch(e) { window.show(slot === 1 ? 'activeService' : 'activeService2'); }
        }, 500);
        return;
      }
      window.showConfirmServiceModal(slot);
    } catch(e) {
      window.show(slot === 1 ? 'activeService' : 'activeService2');
    }
  }, delay);
};

// ── MANDAMIENTO #3 — SERVICIOS EXTRA ────────────────────────────
// Todo servicio extra requiere aprobación de Mikaela antes de activarse.
// Tipo 1 — Mismo área: Mikaela aprueba → suma al total de esa staff.
// Tipo 2 — Otra área:  Mikaela aprueba → va a lista para otra staff.
// Ambos tipos son infinitamente repetibles.
// ──────────────────────────────────────────────────────────────────
window.AREA_FAMILIA_M3 = {
  cejas:         ['cejas', 'ceja', 'depilacion', 'depil', 'bigote', 'bigot', 'pigment', 'brow'],
  pestanas:      ['pestanas', 'pestañas', 'pest', 'lifting', 'retiro', 'volumen',
                  'pelo a pelo', 'clasic', 'efecto', 'natural', 'hawaiano'],
  facial:        ['facial', 'hidra', 'limpiez', 'dermaplaning'],
  retiro_lifting:['retiro', 'lifting', 'pest', 'pestanas']
};

window.esMismaAreaM3 = function(staffArea, servicioArea) {
  const sa = String(staffArea  || '').toLowerCase();
  const sv = String(servicioArea || '').toLowerCase();
  if (sa === sv) return true;
  const familia = window.AREA_FAMILIA_M3[sa] || [sa];
  return familia.some(k => sv.includes(k) || k.includes(sv));
};

// ── MANDAMIENTO #4 — MÉTODOS DE PAGO Y PRECIO CON PROMO ─────────
// Transferencia y Efectivo son los únicos métodos válidos para promos.
// Tarjeta = SIEMPRE precio normal, sin excepciones.
// Aplica a: servicio simple con promo, promo compartida (SP),
//           y ticket multi (TM) que contenga al menos una parte promo.
//
// Esta función recibe el contexto de cobro y devuelve:
//   { totalFinal, usaPrecioNormal, desglose }
// donde desglose[i].montoFinal ya refleja el precio correcto.
// ──────────────────────────────────────────────────────────────────
window.aplicarReglaPagoM4 = function(metodo, contexto) {
  // contexto = {
  //   tienePromo: bool,
  //   totalPromo: number,
  //   totalNormal: number,
  //   desglose: [{ monto, montoNormal, ... }]  // puede ser null
  // }
  const esTarjeta     = metodo === 'Tarjeta';
  const usaNormal     = esTarjeta && contexto.tienePromo;
  const totalFinal    = usaNormal
    ? (Number(contexto.totalNormal) || Number(contexto.totalPromo) || 0)
    : (Number(contexto.totalPromo)  || 0);

  let desglose = null;
  if (contexto.desglose && contexto.desglose.length > 0) {
    desglose = contexto.desglose.map(function(d) {
      const montoFinal = usaNormal
        ? Number(d.montoNormal || d.monto || 0)
        : Number(d.monto || 0);
      return Object.assign({}, d, { montoFinal: montoFinal });
    });
  }

  return { totalFinal: totalFinal, usaPrecioNormal: usaNormal, desglose: desglose };
};

// Helper: dado un array de áreas TM, indica si alguna tiene precio promo
// (precio < precioNormal), para saber si el ticket TM tiene promo adentro.
window.tmTienePromoM4 = function(areas) {
  if (!areas || areas.length === 0) return false;
  return areas.some(function(a) {
    const precio  = Number(a.precio  || 0);
    const normal  = Number(a.precioNormal || a.precio || 0);
    return normal > precio && precio > 0;
  });
};

// ================================================================
// FIN DE LOS MANDAMIENTOS
// Versión: 1.1 — Fecha: 2026-05-23
// Para agregar un mandamiento nuevo, editá SOLO este archivo.
// ================================================================
