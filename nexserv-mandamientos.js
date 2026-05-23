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

// ── MANDAMIENTO #5 — DISTRIBUCIÓN AUTOMÁTICA AL COBRAR ──────────
// Al confirmar cualquier cobro (simple, grupal o TM), el sistema
// SIEMPRE distribuye a los tres destinos sin excepción:
//
//   Staff   → su panel de comisiones (Comisiones sheet)
//             recibe: servicio + monto cobrado (base para comisión %)
//             para CADA staff involucrada en el servicio
//
//   Mikaela → CierresPagos: servicio / staff / precio final (sin comisión)
//             el desglose multi-staff debe llegar completo como JSON
//
//   Owner   → HistorialOwner: servicio / staff / precio final /
//             comisión de la staff / hora — una fila por staff
//
// La invariante: si hay desglose (promo duo, TM, SP compartida),
// cada parte se registra individualmente. Nunca se colapsa en una
// sola fila perdiendo info de quién hizo qué.
//
// Esta función construye el payload de distribución a partir del
// contexto del cobro y lo devuelve listo para mandarlo al backend.
// El backend (confirmarCobro) hace la escritura — esta función
// solo garantiza que el payload sea completo.
// ──────────────────────────────────────────────────────────────────
window.construirPayloadDistribucionM5 = function(contexto) {
  // contexto = {
  //   idEspera:      string,
  //   metodoPago:    string,
  //   totalCobrado:  number,
  //   tienePromo:    bool,
  //   usaPrecioNormal: bool,   // true si tarjeta invalidó la promo (M4)
  //   desglose:      array | null  // [{ staff, servicio, area, monto, montoNormal }]
  // }
  const base = {
    idEspera:      contexto.idEspera,
    metodoPago:    contexto.metodoPago,
    totalCobrado:  contexto.totalCobrado
  };

  // Si hay desglose multi-staff, mandarlo siempre para que el backend
  // pueda distribuir comisiones y escribir HistorialOwner por parte.
  if (contexto.desglose && contexto.desglose.length > 0) {
    base.serviciosDetalle = contexto.desglose.map(function(d) {
      return {
        staff:       d.staff    || '',
        servicio:    d.servicio || '',
        area:        d.area     || '',
        monto:       Number(d.monto      || 0),
        montoNormal: Number(d.montoNormal || d.monto || 0)
      };
    });
  }

  return base;
};

// ── MANDAMIENTO #6 — PROMO DUO: STAFF QUE REALIZA TOMA TODO EL VALOR ───────
// Cuando existe una promo que combina áreas de distintas staffs
// (ej: "Depilación cejas + bigote + pestañas aura $54") y la clienta
// decide pagarlo aunque NO se realice la parte de otra área,
// la staff que realizó el servicio recibe TODO el valor de la promo.
//
// Regla: si la clienta viene por una promo pero solo se atiende con
// una staff (ya sea porque la otra área no se realiza, o porque la
// clienta eligió así), esa staff cobra el precio completo de la promo.
//
// Aplica a:
//   - Promo SP normal (una staff cobra toda la promo)
//   - TM con promo adentro (el área con promo toma su precio completo)
//
// Esta función determina si aplica la regla del mandamiento 6
// y devuelve el precio correcto para esa staff.
// ──────────────────────────────────────────────────────────────────────────────
window.calcularPrecioPromoCompletaM6 = function(contexto) {
  // contexto = {
  //   promo:         object   { price, regular, name, division }
  //   staffArea:     string   área de la staff que realiza
  //   tomarCompleto: bool     true = la staff toma todo el valor
  //   metodoPago:    string   'Efectivo' | 'Transferencia' | 'Tarjeta'
  // }
  const promo = contexto.promo;
  if (!promo) return { precio: 0, esCompleto: false };

  const precioPromo   = Number(promo.price   || 0);
  const precioRegular = Number(promo.regular || promo.price || 0);

  if (!contexto.tomarCompleto) {
    // Solo cobra su parte — buscar en division
    const div = (promo.division || []).find(function(d) {
      const dArea = String(d.area || '').toLowerCase();
      return dArea.includes(contexto.staffArea) || contexto.staffArea.includes(dArea.replace(/[^a-z]/g,''));
    });
    const precio = div ? Number(div.monto || 0) : precioPromo;
    return { precio: precio, esCompleto: false };
  }

  // Toma todo: aplica Mandamiento #4 si paga con tarjeta
  const esTarjeta = contexto.metodoPago === 'Tarjeta';
  const precio    = esTarjeta ? precioRegular : precioPromo;
  return { precio: precio, esCompleto: true };
};

// ================================================================
// FIN DE LOS MANDAMIENTOS
// Versión: 1.3 — Fecha: 2026-05-23
// Para agregar un mandamiento nuevo, editá SOLO este archivo.
// ================================================================
