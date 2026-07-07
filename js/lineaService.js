// ============================================================
// lineaService.js — NEXSERV · FASE 1: Capa de Abstracción LINEAS
// Depende de: api.js  (apiGet, apiPost disponibles en window global)
// Cargarse ANTES de nexserv-main-1.js…4.js en index.html
// ============================================================
// ARQUITECTURA:
//   LINEAS = motor transaccional (fuente única de verdad)
//   Este archivo expone el objeto global LineaService con métodos
//   que mapean cada operación al endpoint correcto del backend.
//   Las hojas legacy (TicketMulti / ServicioPromo / ServicioNormal)
//   siguen siendo escritas por el backend mientras dure la migración,
//   pero el frontend NO debe llamarlas directamente — solo aquí.
// ============================================================

(function(window) {
  'use strict';

  // ─── helpers internos ────────────────────────────────────────
  function _idPrefix(id) {
    var s = String(id || '');
    if (s.startsWith('TM-')) return 'TM';
    if (s.startsWith('SP-')) return 'SP';
    if (s.startsWith('SN-')) return 'SN';
    if (s.startsWith('LE-')) return 'LE';
    return '';
  }

  // ─── LineaService ─────────────────────────────────────────────
  var LineaService = {

    // ----------------------------------------------------------
    // clasificarTicket(ticket)
    // Clasificación pura (sin red). Devuelve { esMulti, tienePromo, tipo }
    // ----------------------------------------------------------
    clasificarTicket: function(ticket) {
      var id     = String(ticket && (ticket.idEspera || ticket.id) || '');
      var fuente = String(ticket && ticket.fuente || '');
      var tipo   = _idPrefix(id) || fuente.replace('Servicio','') || 'SN';
      var esMulti   = tipo === 'TM' || (ticket && Array.isArray(ticket.areas) && ticket.areas.length > 1);
      var tienePromo = tipo === 'SP' || (ticket && !!ticket.promoNombre);
      return { esMulti: esMulti, tienePromo: tienePromo, tipo: tipo };
    },

    // ----------------------------------------------------------
    // etiquetaFuente({ fuente, idEspera })
    // Devuelve etiqueta legible de la fuente del ticket.
    // ----------------------------------------------------------
    etiquetaFuente: function(opts) {
      var f = String(opts && opts.fuente || '');
      var id = String(opts && opts.idEspera || '');
      if (f === 'TicketMulti' || id.startsWith('TM-'))  return 'Multi';
      if (f === 'ServicioPromo' || id.startsWith('SP-')) return 'Promo';
      if (f === 'ServicioNormal' || id.startsWith('SN-')) return 'Normal';
      if (id.startsWith('LE-')) return 'Lista';
      return f || 'Normal';
    },

    // ----------------------------------------------------------
    // obtenerListaEspera()
    // Devuelve: Promise → array de tickets en espera
    // Endpoint: getTableroLineas (LINEAS) con fallback getListaEspera (legacy)
    // ----------------------------------------------------------
    obtenerListaEspera: function() {
      return apiGet('getTableroLineas')
        .then(function(r) {
          if (!r || !r.success) return apiGet('getListaEspera').then(function(r2){ return r2 && r2.lista ? r2.lista : []; });
          // getTableroLineas devuelve { esperando:[], enServicio:[], porCobrar:[], completado:[], cobrado:[] }
          var lista = [].concat(
            r.esperando   || [],
            r.enServicio  || [],
            r.porCobrar   || []
          );
          return lista;
        })
        .catch(function() {
          return apiGet('getListaEspera').then(function(r2){ return r2 && r2.lista ? r2.lista : []; });
        });
    },

    // ----------------------------------------------------------
    // obtenerServiciosHoy(chicaNombre)
    // Devuelve: Promise → array de servicios completados hoy por la chica
    // Endpoint: getServiciosHoy (LINEAS-backed en backend)
    // ----------------------------------------------------------
    obtenerServiciosHoy: function(chicaNombre) {
      return apiGet('getServiciosHoy', { chica: chicaNombre || '' })
        .then(function(r) {
          return (r && r.success && r.servicios) ? r.servicios : [];
        })
        .catch(function() { return []; });
    },

    // ----------------------------------------------------------
    // crearServicio(payload)
    // payload para 1 área normal:  { codigo, nombre, servicio, area, prioridad, observaciones, esTop, total, [asignadaA] }
    // payload para 1 área promo:   + { promoNombre, precioPromo, precioRegular }
    // payload para multi (2+ áreas): { codigo, nombre, prioridad, observaciones, areas:[{area,tipo,tentativo,precio,...}], secuencia:[...], [asignadaA] }
    // Devuelve: Promise → { success, id, ... }
    // ----------------------------------------------------------
    crearServicio: function(payload) {
      var esMulti = payload && Array.isArray(payload.areas) && payload.areas.length > 1;
      var esPromo = !esMulti && !!(payload && payload.promoNombre);

      if (esMulti) {
        return apiPost('crearTicketMulti', payload);
      } else if (esPromo) {
        return apiPost('addServicioPromo', payload);
      } else {
        return apiPost('addServicioNormal', payload);
      }
    },

    // ----------------------------------------------------------
    // tomarAreaTicket({ idEspera, chicaNombre, chicaArea, areaIdx })
    // Devuelve: Promise → { success, ... }
    // ----------------------------------------------------------
    tomarAreaTicket: function(opts) {
      var tipo = _idPrefix(opts && opts.idEspera || '');
      if (tipo === 'TM') {
        return apiPost('tomarAreaTicketMulti', opts);
      } else if (tipo === 'SP') {
        return apiPost('tomarServicioPromo', opts);
      } else {
        // SN, LE o sin prefijo → flujo normal
        return apiPost('tomarServicioNormal', opts);
      }
    },

    // ----------------------------------------------------------
    // finalizarServicio({ idEspera, chicaNombre, clienteNombre, servicio,
    //                     total, promoNombre, precioPromo, precioRegular,
    //                     serviciosDetalle })
    // Devuelve: Promise → { success, ... }
    // ----------------------------------------------------------
    finalizarServicio: function(opts) {
      var tipo = _idPrefix(opts && opts.idEspera || '');
      if (tipo === 'SP') {
        return apiPost('finalizarServicioPromo', opts);
      } else {
        // SN, LE, TM (area única) → flujo normal
        return apiPost('finalizarServicioNormal', opts);
      }
    },

    // ----------------------------------------------------------
    // completarAreaTicket({ idEspera, chicaNombre, [esUltima], [absorberPendientes], [desgloseCompleto] })
    // Solo para TM. Devuelve: Promise → { success, ... }
    // ----------------------------------------------------------
    completarAreaTicket: function(opts) {
      return apiPost('completarAreaTicketMulti', opts);
    },

    // ----------------------------------------------------------
    // obtenerGrupoTicket(idEspera)
    // Devuelve: Promise → objeto TM con sus áreas, o null
    // ----------------------------------------------------------
    obtenerGrupoTicket: function(idEspera) {
      return apiGet('getTicketMulti', { idEspera: idEspera || '' })
        .then(function(r) {
          if (!r || !r.success) return null;
          // El backend devuelve { activos:[], porCobrar:[], porVerificar:[] }
          // r.ticket y r.data no existen — buscar en activos por idEspera
          var id = String(idEspera || '').trim();
          var todos = [].concat(r.activos || [], r.porCobrar || [], r.porVerificar || []);
          if (id) {
            var match = todos.find(function(t){ return String(t.idEspera||'').trim() === id; });
            if (match) return match;
          }
          return todos[0] || null;
        })
        .catch(function() { return null; });
    },

    // ----------------------------------------------------------
    // obtenerPorCobrarSP(idEspera)
    // Devuelve: Promise → { success, enServicio:[], porCobrar:[] }
    // Toggle emergency: localStorage NEXSERV_LINEAS_PC !== '0'
    // ----------------------------------------------------------
    obtenerPorCobrarSP: function(idEspera) {
      var usarLineas = localStorage.getItem('NEXSERV_LINEAS_PC') !== '0';
      var endpoint   = usarLineas ? 'getPorCobrarDesdeLineas' : 'getPorCobrar';
      return apiGet(endpoint, { idEspera: idEspera || '' })
        .then(function(r) {
          if (!r || !r.success) return { success: false, enServicio: [], porCobrar: [] };
          return r;
        })
        .catch(function() { return { success: false, enServicio: [], porCobrar: [] }; });
    },

    // ----------------------------------------------------------
    // asignarServicio({ codigo, servicio, area, precio, chica, observaciones })
    // Devuelve: Promise → { success, ... }
    // ----------------------------------------------------------
    asignarServicio: function(opts) {
      return apiPost('asignarServicioNormal', opts);
    }

  }; // end LineaService

  // Exportar globalmente (igual que las demás funciones del proyecto)
  window.LineaService = LineaService;

})(window);
