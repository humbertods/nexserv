/**
 * lineaService.js — NEXSERV FASE 1
 * ════════════════════════════════════════════════════════════════════
 * Capa de abstracción entre el frontend y las fuentes de datos.
 * El frontend deja de llamar directamente a apiGet/apiPost con
 * endpoints legacy. Pasa por aquí siempre.
 *
 * FASE 1 (ahora): internamente llama a los endpoints actuales.
 *   El frontend no sabe de dónde vienen los datos.
 * FASE 2 (próxima): se cambia SOLO esta implementación interna.
 *   Los métodos devuelven exactamente el mismo contrato de datos.
 *   El frontend no cambia ni una línea.
 *
 * REGLA: ningún módulo puede llamar a estos endpoints directamente:
 *   ❌ addServicioNormal     ❌ addServicioPromo
 *   ❌ crearTicketMulti      ❌ tomarAreaTicketMulti
 *   ❌ completarAreaTicketMulti  ❌ finalizarServicioPromo
 *   ❌ getTicketMulti        ❌ getServicioPromo
 *   ❌ getServicioNormal     ❌ asignarServicioNormal
 *
 * Todos deben pasar por LineaService.
 * ════════════════════════════════════════════════════════════════════
 */

/* global apiGet, apiPost */

var LineaService = (function () {

  // ─────────────────────────────────────────────────────────────────
  // VERSIÓN Y FLAGS
  // ─────────────────────────────────────────────────────────────────
  var _VERSION = '1.0.0'; // FASE 1 — endpoints legacy internos
  var _FASE    = 1;       // 1=legacy | 2=lineas-lecturas | 3=lineas-escrituras

  // ─────────────────────────────────────────────────────────────────
  // LECTURAS — Panel de Mikaela y Owner
  // ─────────────────────────────────────────────────────────────────

  /**
   * obtenerListaCompleta()
   * Devuelve { esperando[], enServicio[], porCobrar[], completadas[] }
   * FASE 1: lee desde getListaCompleta (ListaEspera + TM + SP + SN)
   * FASE 2: leerá desde getListaDesdeLineas (solo LINEAS)
   */
  async function obtenerListaCompleta() {
    var r = await apiGet('getListaCompleta');
    if (!r || !r.success) throw new Error('getListaCompleta falló: ' + (r && r.error));
    return {
      esperando:   r.esperando   || [],
      enServicio:  r.enServicio  || [],
      porCobrar:   r.porCobrar   || [],
      completadas: r.completadas || [],
    };
  }

  /**
   * obtenerEnEspera()
   * Lista de clientas esperando ser asignadas.
   */
  async function obtenerEnEspera() {
    var lista = await obtenerListaCompleta();
    return lista.esperando;
  }

  /**
   * obtenerEnServicio()
   * Lista de clientas en atención ahora mismo.
   */
  async function obtenerEnServicio() {
    var lista = await obtenerListaCompleta();
    return lista.enServicio;
  }

  /**
   * obtenerPorCobrar()
   * Lista de clientas listas para cobrar.
   * FASE 1: viene de getListaCompleta (legacy)
   * FASE 2: vendrá de getPorCobrarDesdeLineas (ya existe en backend)
   *
   * Contrato de cada item devuelto:
   *   idEspera, codigo, nombre, servicio, tomadaPor,
   *   total, precioRegular, promoNombre, serviciosDetalle[],
   *   areas[], fuente, esTop
   */
  async function obtenerPorCobrar() {
    var lista = await obtenerListaCompleta();
    return lista.porCobrar;
  }

  /**
   * obtenerServiciosHoy(staffNombre)
   * Servicios del día para una staff específica.
   * FASE 1: usa getServiciosHoy (ya lee de LINEAS con fallback legacy)
   *
   * Contrato devuelto:
   *   servicios[]: { nombre, servicio, area, precio, estado,
   *                  horaInicio, comision, tipo }
   */
  async function obtenerServiciosHoy(staffNombre) {
    var r = await apiGet('getServiciosHoy', { chica: staffNombre });
    if (!r || !r.success) throw new Error('getServiciosHoy falló');
    return r.servicios || [];
  }

  /**
   * obtenerAtenciones(slot)
   * Detalle de la atención activa de una staff (slot 1 o 2).
   */
  async function obtenerAtenciones(slot) {
    var r = await apiGet('getAtenciones', slot !== undefined ? { slot: slot } : {});
    if (!r || !r.success) throw new Error('getAtenciones falló');
    return r;
  }

  /**
   * obtenerGrupoTicket(idEspera)
   * Devuelve todas las áreas/líneas de un ticket multi.
   * FASE 1: getTicketMulti (legacy)
   * FASE 2: getTableroLineas filtrado por visita_id
   *
   * Usado por: updateFinishButtons, cobrarPromoCompletaTM,
   *            completarAreaMultiFinal, completarYTomarSiguiente
   */
  async function obtenerGrupoTicket(idEspera) {
    // FASE 1: getTicketMulti
    var tmData = await apiGet('getTicketMulti');
    if (!tmData) return null;

    var todos = [].concat(
      tmData.esperando    || [],
      tmData.enServicio   || [],
      tmData.porCobrar    || [],
      tmData.completados  || []
    );
    return todos.find(function (t) {
      return t.idEspera === idEspera;
    }) || null;
  }

  /**
   * obtenerPorCobrarSP(idEspera)
   * Busca un ticket de promo (SP) en las listas de ServicioPromo.
   * FASE 1: getServicioPromo (legacy)
   * FASE 2: se elimina — todos los tickets vienen de obtenerPorCobrar()
   *
   * Usado por: finishAndSend, finishSlot2
   */
  async function obtenerPorCobrarSP(idEspera) {
    var spData = await apiGet('getServicioPromo');
    if (!spData) return null;
    var todos = [].concat(
      spData.enServicio  || [],
      spData.porCobrar   || [],
      spData.esperando   || []
    );
    return todos.find(function (t) {
      return t.idEspera === idEspera;
    }) || null;
  }

  /**
   * obtenerListaEspera()
   * Lista simple de espera (para el panel de renderWaitList).
   */
  async function obtenerListaEspera() {
    var r = await apiGet('getListaEspera');
    if (!r || !r.success) throw new Error('getListaEspera falló');
    return r.lista || r.esperando || [];
  }

  /**
   * obtenerTableroLineas()
   * Tablero en vivo desde LINEAS (ya migrado).
   * { cola[], en_servicio[], completado[], cobrado[] }
   */
  async function obtenerTableroLineas() {
    var r = await apiGet('getTableroLineas');
    if (!r || !r.success) throw new Error('getTableroLineas falló');
    return r;
  }

  // ─────────────────────────────────────────────────────────────────
  // ESCRITURAS — Ciclo de vida del servicio
  // ─────────────────────────────────────────────────────────────────

  /**
   * crearServicio(datos)
   * Registra un servicio nuevo en el sistema.
   * FASE 1: rutea a addServicioPromo / addServicioNormal / crearTicketMulti
   *         según los datos (mismo comportamiento actual)
   * FASE 2: siempre → registrarLineaServicio (LINEAS)
   *         con dual-write temporal
   *
   * Parámetros (normalizados):
   *   { clienteCodigo, clienteNombre, servicio, area, staff,
   *     monto, montoRegular?, promoNombre?, esMulti?,
   *     areas[]?, secuencia[]?, slot? }
   *
   * Usado por: goAssign(), goToList(), confirmAssignService(),
   *            finalizarYPasarOtraArea(), recargarAutorizacionesStaff(),
   *            finishAndSendPartial()
   */
  async function crearServicio(datos) {
    // FASE 1: mantener lógica de ruteo exactamente como hoy
    var r;

    if (datos.esMulti && datos.areas && datos.areas.length > 0) {
      // Ticket multi-área
      r = await apiPost('crearTicketMulti', datos);

    } else if (datos.promoNombre || datos.esPromo) {
      // Promo de 1 área
      r = await apiPost('addServicioPromo', datos);

    } else {
      // Normal de 1 área
      r = await apiPost('addServicioNormal', datos);
    }

    if (!r || !r.success) {
      throw new Error('crearServicio falló: ' + (r && (r.error || r.message)));
    }
    return r;
  }

  /**
   * tomarAreaTicket(datos)
   * Staff confirma que toma un área de un ticket multi.
   * FASE 1: tomarAreaTicketMulti (legacy)
   * FASE 2: actualizarEstadoLinea en LINEAS
   *
   * Usado por: confirmServiceAndClose(), confirmTake()
   */
  async function tomarAreaTicket(datos) {
    var r = await apiPost('tomarAreaTicketMulti', datos);
    if (!r || !r.success) throw new Error('tomarAreaTicket falló: ' + (r && r.error));
    return r;
  }

  /**
   * completarAreaTicket(datos)
   * Marca un área de ticket multi como completada.
   * FASE 1: completarAreaTicketMulti (legacy)
   * FASE 2: actualizarEstadoLinea en LINEAS
   *
   * Usado por: completarAreaMulti(), completarAreaMultiFinal()
   */
  async function completarAreaTicket(datos) {
    var r = await apiPost('completarAreaTicketMulti', datos);
    if (!r || !r.success) throw new Error('completarAreaTicket falló: ' + (r && r.error));
    return r;
  }

  /**
   * finalizarServicio(datos)
   * Finaliza la atención y envía a cobrar.
   * FASE 1: rutea a finalizarServicioPromo / finalizarAtencion
   *         según el idEspera (SP- vs LE-)
   * FASE 2: siempre → finalizarAtencion (que ya hace espejo en LINEAS)
   *
   * Parámetros:
   *   { idEspera, clienteNombre, clienteCodigo, chicaNombre,
   *     total, servicio, area, nuevaArea?, esRetiro? }
   *
   * Usado por: finishAndSend(), finishSlot2()
   */
  async function finalizarServicio(datos) {
    var idEspera = String(datos.idEspera || '');
    var r;

    if (idEspera.startsWith('SP-')) {
      // FASE 1: promo → finalizarServicioPromo
      r = await apiPost('finalizarServicioPromo', datos);
    } else {
      // FASE 1: normal / LE- → finalizarAtencion
      r = await apiPost('finalizarAtencion', datos);
    }

    if (!r || !r.success) {
      throw new Error('finalizarServicio falló (' + idEspera + '): ' + (r && r.error));
    }
    return r;
  }

  /**
   * asignarServicio(datos)
   * Asigna staff a un servicio existente (desde panel Mikaela).
   * FASE 1: asignarServicioNormal (legacy)
   * FASE 2: actualizarEstadoLinea en LINEAS
   *
   * Usado por: confirmAssignService()
   */
  async function asignarServicio(datos) {
    var r = await apiPost('asignarServicioNormal', datos);
    if (!r || !r.success) throw new Error('asignarServicio falló: ' + (r && r.error));
    return r;
  }

  /**
   * confirmarCobro(payload)
   * Registra el cobro final.
   * Ya es neutral — el endpoint confirmarCobro escribe en LINEAS + legacy.
   * No necesita cambiar en FASE 2.
   */
  async function confirmarCobro(payload) {
    var r = await apiPost('confirmarCobro', payload);
    if (!r || !r.success) throw new Error('confirmarCobro falló: ' + (r && r.error));
    return r;
  }

  /**
   * devolverALista(datos)
   * Devuelve una clienta a la lista de espera.
   */
  async function devolverALista(datos) {
    var r = await apiPost('devolverALista', datos);
    if (!r || !r.success) throw new Error('devolverALista falló');
    return r;
  }

  /**
   * mandarACobro(datos)
   * Envía una clienta directamente a cobrar sin finalizar servicio.
   */
  async function mandarACobro(datos) {
    var r = await apiPost('mandarACobro', datos);
    if (!r || !r.success) throw new Error('mandarACobro falló');
    return r;
  }

  /**
   * eliminarTicket(idEspera, nombre)
   * Elimina un ticket de la lista de espera.
   */
  async function eliminarTicket(idEspera, nombre) {
    var r = await apiPost('eliminarTicketEspera', { idEspera: idEspera, nombre: nombre });
    if (!r || !r.success) throw new Error('eliminarTicket falló');
    return r;
  }

  /**
   * reasignarStaff(datos)
   * Cambia la staff asignada a un servicio.
   */
  async function reasignarStaff(datos) {
    var r = await apiPost('asignarStaff', datos);
    if (!r || !r.success) throw new Error('reasignarStaff falló');
    return r;
  }

  // ─────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────────

  /**
   * clasificarTicket(item)
   * Devuelve metadatos normalizados de un ticket.
   * En FASE 1 usa el campo fuente del backend.
   * En FASE 5 (cuando se eliminen ramificaciones) este método
   * devolverá campos uniformes sin importar la fuente.
   *
   * @param {Object} item — objeto de porCobrar / enServicio / esperando
   * @returns {Object} { esMulti, tienePromo, esLegacyTM, esLegacySP, esLegacySN, fuente }
   */
  function clasificarTicket(item) {
    if (!item) return {};
    var fuente = String(item.fuente || '');
    var id = String(item.idEspera || '');

    return {
      esMulti:    fuente === 'TicketMulti' || id.startsWith('TM-') ||
                  (Array.isArray(item.areas) && item.areas.length > 1) ||
                  (Array.isArray(item.lineas) && item.lineas.length > 1),
      tienePromo: !!(item.promoNombre && item.promoNombre !== ''),
      esLineas:   fuente === 'Lineas',
      esLegacyTM: fuente === 'TicketMulti' || id.startsWith('TM-'),
      esLegacySP: fuente === 'ServicioPromo' || id.startsWith('SP-'),
      esLegacySN: fuente === 'ServicioNormal' || id.startsWith('SN-'),
      fuente:     fuente || (id.startsWith('TM-') ? 'TicketMulti' :
                             id.startsWith('SP-') ? 'ServicioPromo' :
                             id.startsWith('SN-') ? 'ServicioNormal' : 'unknown'),
    };
  }

  /**
   * etiquetaFuente(item)
   * Texto legible del tipo de ticket.
   * Reemplaza los if(fuente==='TicketMulti') etc. del historial.
   */
  function etiquetaFuente(item) {
    var c = clasificarTicket(item);
    if (c.esLineas)    return 'Servicio';
    if (c.esLegacyTM)  return 'Combo / Ticket Multi (TM)';
    if (c.esLegacySP)  return 'Promo (SP)';
    if (c.esLegacySN)  return 'Servicio normal (SN)';
    return 'Servicio';
  }

  /**
   * version()
   * Retorna la fase actual para debugging.
   */
  function version() {
    return { version: _VERSION, fase: _FASE };
  }

  // ─────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────
  return {
    // Lecturas
    obtenerListaCompleta:  obtenerListaCompleta,
    obtenerEnEspera:       obtenerEnEspera,
    obtenerEnServicio:     obtenerEnServicio,
    obtenerPorCobrar:      obtenerPorCobrar,
    obtenerServiciosHoy:   obtenerServiciosHoy,
    obtenerAtenciones:     obtenerAtenciones,
    obtenerGrupoTicket:    obtenerGrupoTicket,
    obtenerPorCobrarSP:    obtenerPorCobrarSP,
    obtenerListaEspera:    obtenerListaEspera,
    obtenerTableroLineas:  obtenerTableroLineas,

    // Escrituras
    crearServicio:         crearServicio,
    tomarAreaTicket:       tomarAreaTicket,
    completarAreaTicket:   completarAreaTicket,
    finalizarServicio:     finalizarServicio,
    asignarServicio:       asignarServicio,
    confirmarCobro:        confirmarCobro,
    devolverALista:        devolverALista,
    mandarACobro:          mandarACobro,
    eliminarTicket:        eliminarTicket,
    reasignarStaff:        reasignarStaff,

    // Utilidades
    clasificarTicket:      clasificarTicket,
    etiquetaFuente:        etiquetaFuente,
    version:               version,
  };
})();

// Exponer globalmente
window.LineaService = LineaService;

console.log('[LineaService] v' + LineaService.version().version +
            ' — Fase ' + LineaService.version().fase + ' cargado');
