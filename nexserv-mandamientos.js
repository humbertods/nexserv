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

// ── MANDAMIENTO #7 — FICHAS: SIEMPRE VISIBLES AL ABRIR CLIENTA ──────────────
// Las tres áreas que manejan fichas deben ver el registro de la
// clienta SIEMPRE que la abran, sin importar el slot.
// Además, cada atención debe quedar registrada como visita.
//
// Reglas por área:
//
//   PESTAÑAS (loadPestFichaQuick):
//     - Ficha siempre visible al abrir clienta (slots 1 y 2).
//     - Tipo de visita obligatorio al registrar: "Nuevas" o "Retoque/Mantenimiento".
//     - Si "Nuevas" → servicio completo (fullset), registrar modelo/diseño/tallas.
//     - Si "Retoque" → mantenimiento de la ficha activa existente.
//
//   CEJAS PIGMENTO (loadCejasQuick):
//     - Ficha visible si el servicio es de pigmento/efecto polvo (detectado por esSrvPigmento).
//     - Tipo sesión: "Nueva sesión" / "Neutralización" / "Retoque".
//     - Retoque implica 30-45 días desde la sesión anterior.
//     - Primera sesión (sin ficha previa) = "Nueva sesión" por defecto.
//
//   FACIAL (loadFacialFichaQuick):
//     - Ficha siempre visible al abrir clienta (slots 1 y 2).
//     - Siempre registrar visita con: procedimiento, productos, observaciones.
//     - Si no hay ficha previa → crear ficha base ANTES de registrar visita.
//
// Esta función determina el tipo de visita según el contexto de la clienta.
// ──────────────────────────────────────────────────────────────────────────────
window.determinarTipoVisitaM7 = function(area, contexto) {
  // contexto = {
  //   tieneFicha:    bool   — si ya tiene ficha registrada
  //   hayHistorial:  bool   — si tiene visitas previas
  //   diasDesdeUltima: number — días desde la última sesión (cejas pigmento)
  //   servicioNombre: string — nombre del servicio actual
  // }
  if (area === 'pestanas') {
    // Si no tiene ficha o el servicio incluye "nuevas" → Nuevas
    const svc = String(contexto.servicioNombre || '').toLowerCase();
    const esNueva = !contexto.tieneFicha
      || svc.includes('nuevo') || svc.includes('nueva') || svc.includes('fullset') || svc.includes('full set')
      || (!contexto.hayHistorial);
    return { tipo: esNueva ? 'Nuevas' : 'Retoque/Mantenimiento', esNueva: esNueva };
  }

  if (area === 'cejas') {
    if (!contexto.tieneFicha) return { tipo: 'Nueva sesión', esNueva: true };
    const dias = Number(contexto.diasDesdeUltima || 0);
    // 30-45 días = ventana ideal de retoque
    if (dias >= 25) return { tipo: 'Retoque', esNueva: false, enVentanaRetoque: dias >= 25 && dias <= 60 };
    return { tipo: 'Nueva sesión', esNueva: true };
  }

  if (area === 'facial') {
    return {
      tipo: contexto.tieneFicha ? 'Visita' : 'Primera visita',
      esNueva: !contexto.tieneFicha
    };
  }

  return { tipo: 'Visita', esNueva: false };
};

// Helper: cargar la ficha correcta para el área y slot dados.
// Centraliza la lógica que antes estaba duplicada en 4+ puntos del index.
window.cargarFichaSegunAreaM7 = function(area, clientKey, slot, clientCodigo, clientNombre) {
  slot = slot || 1;
  if (area === 'pestanas') {
    if (typeof window.loadPestFichaQuick === 'function') {
      window.loadPestFichaQuick(clientKey, slot);
    }
    return;
  }
  if (area === 'facial') {
    if (typeof window.loadFacialFichaQuick === 'function') {
      window.loadFacialFichaQuick(clientKey, slot);
    }
    return;
  }
  if (area === 'cejas' && clientCodigo) {
    if (typeof window.esSrvPigmento === 'function') {
      // La ficha de cejas solo aplica a servicios de pigmento — el caller verifica antes de llamar
      if (typeof window.loadCejasQuick === 'function') {
        setTimeout(function() {
          window.loadCejasQuick(clientKey, slot, clientCodigo, clientNombre || '');
        }, 400);
      }
    }
  }
};

// ── MANDAMIENTO #8 — CLASIFICACIÓN AUTOMÁTICA DEL TICKET PROMO ──────────────
//
// El botón "Servicio Promo" maneja 4 tipos de ticket.
// NexServ DEBE clasificar automáticamente el tipo correcto según las promos
// ingresadas por Mikaela, antes de crear el ticket.
// La clasificación es determinista — Mikaela no elige el tipo manualmente.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ TIPO 1 — ServicioPromoIndividual                                        │
// │   1 promo · todas las divisiones pertenecen a 1 staff                  │
// │   Ej: "Depilación cejas $5 + Pigmento $14" → 1 staff de Cejas          │
// │   Ticket: LE-XXXX (addServicioPromo)                                    │
// │   Staff panel: botones SP normales (puedeTodo=true)                     │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ TIPO 2 — ServicioPromoDuo                                               │
// │   1 promo · divisiones cubren 2 áreas distintas (ej: Cejas + Pestañas) │
// │   Ej: "Combo 24 Lifting: Cejas $5 + Pestañas $27"                      │
// │   Ticket: LE-XXXX (addServicioPromo, promo con division multi-área)     │
// │   Staff panel: botones SP compartida (puedeTodo=false, secuencia rige)  │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ TIPO 3 — ServicioMultiPromos                                            │
// │   2+ promos registradas → puede involucrar 2 o 3 staff distintas       │
// │   Ej: "Combo 24 Lifting" (Cejas+Pestañas) + "Promo Facial"             │
// │   Ticket: TM-XXXX (crearTicketMulti — cada promo = 1 área en el TM)    │
// │   Staff panel: botones TM con lbl del siguiente servicio                │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ TIPO 4 — ServicioPromoDuoCompleto  [implementado en Mandamiento #6]     │
// │   1 promo multi-área pero la primera staff hace TODO (Mandamiento #6)   │
// │   Ej: staff de Cejas decide tomar el Lifting también                    │
// │   Ticket: igual que Tipo 2 (LE-XXXX)                                   │
// │   Staff panel: botón "🎁 Cobrar promo completa" visible (puedeTodo=true │
// │   porque AREA_CAPS de cejas incluye lifting/pestañas en sus caps)       │
// └─────────────────────────────────────────────────────────────────────────┘
//
// ÁRBOL DE DECISIÓN (ejecutado en goToList / goAssign antes de postear):
//
//   ¿Hay más de 1 promo en _arrPromos?
//     SÍ → TIPO 3 → crearTicketMulti (una área por promo)
//     NO → ¿La única promo tiene divisiones en más de 1 área distinta?
//           SÍ → TIPO 2 → addServicioPromo (promo con division multi-área)
//                (Tipo 4 se activa si la staff presiona "🎁 Cobrar promo completa")
//           NO → TIPO 1 → addServicioPromo (promo de 1 sola área)
//
// MAPEO DE ÁREAS en divisiones:
//   'cejas', 'depilacion', 'depil', 'bigote', 'pigment', 'brow'  → 'cejas'
//   'pestanas', 'pestañas', 'lifting', 'retiro', 'volumen'       → 'pestanas'
//   'facial', 'hidra', 'limpiez', 'dermaplaning'                 → 'facial'
//
// INVARIANTE: la clasificación se basa en _arrPromos + _secuencia.
// Mandamiento #1 sigue rigiendo el área prioritaria en todos los tipos.
// Mandamiento #4 sigue aplicando en todos los tipos al cobrar.
// ──────────────────────────────────────────────────────────────────────────────
window.clasificarTicketPromoM8 = function() {
  var promos = (window._arrPromos || []).filter(function(p) { return p !== null; });

  if (promos.length === 0) {
    return { tipo: null, mensaje: 'Sin promos registradas' };
  }

  // TIPO 3: 2 o más promos → siempre TM
  if (promos.length > 1) {
    return { tipo: 3, nombre: 'ServicioMultiPromos', ticket: 'TM' };
  }

  // 1 sola promo: analizar divisiones
  var promo = promos[0];
  var division = promo.division || [];

  var AREA_KEY = function(raw) {
    var s = String(raw || '').toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (s.includes('pest') || s.includes('lifting') || s.includes('retiro') || s.includes('volumen')) return 'pestanas';
    if (s.includes('facial') || s.includes('hidra') || s.includes('limpiez') || s.includes('derma')) return 'facial';
    if (s.includes('depil') || s.includes('bigote') || s.includes('bikini')) return 'depilacion';
    return 'cejas'; // default: cejas / pigmento / brow
  };

  // Extraer áreas únicas de las divisiones
  var areasUnicas = [];
  division.forEach(function(d) {
    var k = AREA_KEY(d.area || d.servicio || '');
    if (!areasUnicas.includes(k)) areasUnicas.push(k);
  });

  // Sin divisiones → tratar como 1 área
  if (areasUnicas.length <= 1) {
    return { tipo: 1, nombre: 'ServicioPromoIndividual', ticket: 'LE', areasUnicas: areasUnicas };
  }

  // 2+ áreas distintas en divisiones → Tipo 2 (o Tipo 4 si staff lo toma todo)
  return { tipo: 2, nombre: 'ServicioPromoDuo', ticket: 'LE', areasUnicas: areasUnicas };
};

// Devuelve un string legible con el resumen del ticket para mostrarle a Mikaela
// antes de confirmar el envío.
window.resumenTicketPromoM8 = function() {
  var c = window.clasificarTicketPromoM8();
  if (!c.tipo) return '';
  var promos = (window._arrPromos || []).filter(function(p) { return p !== null; });
  var nombres = promos.map(function(p) { return p.name; }).join(' + ');
  var staffStr = c.areasUnicas ? c.areasUnicas.length + ' staff' : '';
  switch (c.tipo) {
    case 1: return '✅ ' + nombres + ' · 1 staff · Ticket LE';
    case 2: return '🤝 ' + nombres + ' · 2 staff (promo compartida) · Ticket LE';
    case 3: return '🎯 ' + nombres + ' · ' + staffStr + '+ · Ticket Multi (TM)';
    default: return '';
  }
};

// ================================================================
// FIN DE LOS MANDAMIENTOS
// Versión: 1.5 — Fecha: 2026-05-23
// Para agregar un mandamiento nuevo, editá SOLO este archivo.
// ================================================================
