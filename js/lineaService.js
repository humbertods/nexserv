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

  // requestId de TICKET — identidad de la INTENCIÓN de crear.
  // El backend lo exige y lo nombra literalmente así en sus comentarios:
  //   NexServ_Lineas.gs:6444  crearTicketServicioNormalNativo_  → REQUEST_ID_REQUERIDO
  //   NexServ_Lineas.gs:10603 crearTicketPromoNativo_           → REQUEST_ID_REQUERIDO
  //   NexServ_Lineas.gs:6864  "_nuevoTicketRequestId_ en goToList/goAssign, uno por click"
  // Contrato de validación del backend: no vacío, máx 100 chars, solo [A-Za-z0-9_-].
  // Mismo criterio que el lineRequestId que ya arma solicitarExtra más abajo.
  function _nuevoTicketRequestId_() {
    return 'TKR_' + Date.now().toString(36)
         + '_' + Math.random().toString(36).slice(2, 10);
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
          // FIX nombres de campo: getTableroLineas devuelve { cola, en_servicio,
          // completado, cobrado } — NO { esperando, enServicio, porCobrar }. Antes
          // se leían los nombres equivocados → la lista volvía SIEMPRE vacía.
          var lista = [].concat(
            r.cola          || r.esperando  || [],
            r.en_servicio   || r.enServicio || [],
            r.por_verificar || [],   // staff finalizó, espera que Mikaela mande a cobro
            r.completado    || r.porCobrar  || []
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

      // requestId de la intención — SOLO para SN y SP, los dos caminos vivos del
      // motor nativo (LINEAS + TicketsFuente).
      //
      // TM queda DELIBERADAMENTE FUERA. Es el camino obsoleto: el modelo vigente
      // es un único ticket madre con N líneas repetibles, que se agregan como
      // servicio extra desde staff o desde Central. No se le inyecta requestId
      // para no reanimarlo en silencio — si alguien lo alcanza, debe fallar de
      // forma visible en vez de crear un TM nuevo.
      //
      // Copia superficial: el payload del caller no se muta. apiPost reintenta
      // hasta 2 veces con el MISMO objeto, así que los 3 intentos comparten
      // requestId — que es justo el duplicado que el backend debe atrapar.
      var data = payload;
      if (!esMulti) {
        data = Object.assign({}, payload);
        if (!String(data.requestId || '').trim()) data.requestId = _nuevoTicketRequestId_();
      }

      if (esMulti) {
        return apiPost('crearTicketMulti', data);
      } else if (esPromo) {
        return apiPost('addServicioPromo', data);
      } else {
        return apiPost('addServicioNormal', data);
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

    // solicitarExtra({ ticketRef, lineaPadre, area, servicioExtra, precio, nota })
    // `staff` NO se envía: el backend la inyecta desde la sesión firmada.
    solicitarExtra: function(opts) {
      var lrid = 'EXTRA-' + String(opts.ticketRef || '').replace(/[^A-Za-z0-9_-]/g, '')
               + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      return apiPost('solicitarExtraStaffNativo', {
        ticketRef:     opts.ticketRef,
        lineaPadre:    opts.lineaPadre,
        area:          opts.area,
        servicioExtra: opts.servicioExtra,
        precio:        Number(opts.precio || 0),
        lineRequestId: lrid,
        obs:           opts.nota || ''
      }).then(function(r) {
        // Normalizar al contrato {success, authId} que espera el caller.
        var ok = !!(r && (r.ok === true || r.success === true));
        return { success: ok, authId: (r && (r.linea_id || r.lineaId)) || '',
                 lineaId: (r && (r.linea_id || r.lineaId)) || '',
                 ticketRef: (r && r.ticket_ref) || opts.ticketRef,
                 message: (r && (r.message || r.error)) || '' };
      });
    },

    // listarPropuestasExtra() → { success, autorizaciones:[...] }
    // Devuelve la MISMA forma que el viejo getAutorizaciones para que
    // renderAuthorizations y los polls del staff funcionen sin cambios.
    listarPropuestasExtra: function() {
      // Llamar es seguro para cualquier sesión válida:
      //  · Backend actual → getAutorizacionesNativas exige rol admin/owner
      //    (exigirRolAdminOwner_). NO hay alcance por staff: el flujo staff
      //    consulta getTicketLineas, no esta acción.
      //  · Backend viejo → responde 401 por rol, pero api.js ya trata a esta
      //    acción como "rechazo de permiso" y NO cierra la sesión: el caller
      //    recibe success:false y la vista queda vacía, sin expulsar a nadie.
      return apiGet('getAutorizacionesNativas').then(function(r) {
        if (!r || (r.ok !== true && r.success !== true)) {
          return { success: false, autorizaciones: [], message: (r && (r.message || r.error)) || '' };
        }
        var lista = (r.propuestas || []).map(function(p) {
          // 'propuesta' + auth 'pendiente' → estado 'pendiente' (lo que filtran las vistas).
          // 'esperando' + auth 'aprobada'  → 'aprobado'. 'anulado' → 'rechazado'.
          var est = 'pendiente';
          if (p.estado === 'anulado') est = 'rechazado';
          else if (p.authEstado === 'aprobada') est = 'aprobado';
          else if (p.authEstado === 'pendiente') est = 'pendiente';
          return {
            id: p.id, authId: p.id, lineaId: p.id, lineaPadre: p.lineaPadre,
            ticketRef: p.ticketRef, idEspera: p.ticketRef, visita: p.visita,
            clienteCodigo: p.clienteCodigo, clienteNombre: p.clienteNombre,
            staffNombre: p.staffNombre, servicioNombre: p.servicioNombre,
            servicioArea: p.servicioArea, servicioPrecio: p.servicioPrecio,
            nota: p.nota, estado: est, creada: p.creada, actualizada: p.actualizada,
            // FIX-AUTH-02 — alias que consume renderAuthorizations. La tarjeta
            // muestra CUÁNDO se solicitó la autorización, así que apunta a
            // `creada`, nunca a `actualizada`.
            fecha: p.creada
          };
        });
        return { success: true, autorizaciones: lista };
      });
    },

    // Esto reemplaza al poll contra getAutorizacionesNativas, que exige rol
    // admin/owner: con el backend viejo devolvía 401 en bucle cada 8s y la
    // staff nunca se enteraba de la aprobación, dejando su pantalla colgada.
    estadoPropuestasDeTicket: function(ticketRef) {
      return apiGet('getTicketLineas', { ticketRef: ticketRef || '' })
        .then(function(r) {
          if (!r || r.success !== true) return { success: false, porLinea: {} };
          var porLinea = {};
          (r.lineasActivas || []).forEach(function(l) {
            porLinea[String(l.id || '')] = 'aprobado';
          });
          (r.lineasHistoricas || []).forEach(function(l) {
            if (String(l.estado || '') === 'anulado') porLinea[String(l.id || '')] = 'rechazado';
          });
          return { success: true, porLinea: porLinea };
        })
        .catch(function() { return { success: false, porLinea: {} }; });
    },

    // aprobarExtra(ticketRef, lineaId) / rechazarExtra(ticketRef, lineaId, motivo)
    aprobarExtra: function(ticketRef, lineaId) {
      return apiPost('aprobarExtraNativo', { ticketRef: ticketRef, lineaId: lineaId })
        .then(function(r) {
          return { success: !!(r && (r.ok === true || r.success === true)),
                   message: (r && (r.message || r.error)) || '' };
        });
    },

    // FIX-AUTH-01 — el backend `_rechazarExtraNativoInterno_` exige `motivo`
    // no vacío (MOTIVO_REQUERIDO). El motivo lo escribe Central; acá solo se
    // transporta. No se fabrica ningún valor por defecto.
    rechazarExtra: function(ticketRef, lineaId, motivo) {
      return apiPost('rechazarExtraNativo', { ticketRef: ticketRef, lineaId: lineaId, motivo: motivo })
        .then(function(r) {
          return { success: !!(r && (r.ok === true || r.success === true)),
                   message: (r && (r.message || r.error)) || '' };
        });
    },

    asignarServicio: function(opts) {
      return apiPost('asignarServicioNormal', opts);
    }

  }; // end LineaService

  // Exportar globalmente (igual que las demás funciones del proyecto)
  window.LineaService = LineaService;

})(window);
