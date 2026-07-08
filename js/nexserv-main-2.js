// ============================================
// NexServ · Google Apps Script — Backend API
// Versión: 5.2 - FIX cobro TM tarjeta: precio normal por área se re-deriva del regular real del combo (Paquetes), evitando el descuento doble-contado (ej. Combo 24 marcaba $80 en vez de $67) (11/06/2026)
// Versión: 5.1 - Separación dev/prod: SHEET_ID y SIRA_API_URL se eligen por ScriptProperty 'ENV'. Default 'prod' (producción intacta salvo ENV=dev explícito) (11/06/2026)
// Versión: 5.0 - FIX: doGet usaba 'data' (solo existe en doPost) en estadoDispositivo y 7 casos hermanos → ahora e.parameter. Arregla auto-desbloqueo de dispositivos por GET (11/06/2026)
// Versión: 4.9 - FIX: serviciosDetalle se acumula (multi-staff) en vez de sobreescribir (05/05/2026)
// Conecta la app HTML con Google Sheets
// ============================================

// ── Selección de entorno (dev / prod) ───────────────────────

// ── Helper: leer propiedades del script ─────────────────────
// Centralizado aquí para que todos los módulos del proyecto lo usen.
function prop_(name) {
  try { return PropertiesService.getScriptProperties().getProperty(name) || ''; }
  catch(e) { return ''; }
}
// El entorno se decide por la ScriptProperty 'ENV'. Por seguridad,
// si NO está definida se asume 'prod': producción nunca cambia de
// comportamiento a menos que se ponga ENV='dev' explícitamente.
//
// CÓMO ACTIVAR DEV: en el PROYECTO de Apps Script de pruebas (la copia,
// no el de producción) → Configuración del proyecto → Propiedades del
// script → agregar  ENV = dev . En el de producción: dejarla sin
// definir (o ENV = prod). Así el mismo código sirve para los dos.
const ENV = (function () {
  try {
    return PropertiesService.getScriptProperties().getProperty('ENV') === 'dev' ? 'dev' : 'prod';
  } catch (e) { return 'prod'; }
})();

const ENV_CONFIG = {
  prod: {
    SHEET_ID: '1vIhdBWz5_-9JggtjjrddoJRJc9__aIjh2IIs5EuzqS4',
    // API de SIRA (inventario/gastos). NexServ la consulta solo-lectura
    // para traer "Gastos Varios" del mes al cierre.
    SIRA_API_URL: 'https://script.google.com/macros/s/AKfycbzyEBabD-2BXhSd1tmIXpWXwzHPWE5CoF4VcGD1c5ILkACl8FmWbQRTL0juM70sxZnw/exec'
  },
  dev: {
    SHEET_ID: '__PEGA_DEV_SHEET_ID__',  // ← ID de la COPIA de prueba del Sheet
    SIRA_API_URL: ''                     // dev sin SIRA → el cierre cae al ingreso manual
  }
};

const SHEET_ID     = ENV_CONFIG[ENV].SHEET_ID;
const SIRA_API_URL = ENV_CONFIG[ENV].SIRA_API_URL;


// ── Sanitizador de inputs (R-010 NEXCERT) ───────────────────────────────────
// Previene formula injection en Google Sheets: cualquier valor que empiece con
// = + - @ | y sea string se prefija con un apostrofe ' que Sheets interpreta
// como texto literal, bloqueando la ejecución de =IMPORTRANGE(), =CMD(), etc.
// Usar _san() en TODOS los campos de texto que se escriben a Sheets desde
// datos del usuario (nombres, servicios, observaciones, métodos de pago, etc.).
// Campos numéricos o fechas NO pasan por _san() — solo strings del usuario.
function _san(value) {
  if (value === null || value === undefined) return '';
  var s = String(value);
  // Fórmulas en Sheets empiezan con =, +, -, @, | — prefijamos con ' para texto literal
  if (s.length > 0 && '=+-@|'.indexOf(s.charAt(0)) >= 0) return "'" + s;
  return s;
}

// ── Versión de la app (fuente de verdad única) ──────────────
// Subila en CADA cambio que se despliegue. El frontend la consulta al
// abrir (acción 'getVersion') y, si la suya es distinta, avisa a la chica
// para que recargue. Así se detectan solas las tablets con caché vieja.
// Convención: mismo número que el header de versión de arriba.
const APP_VERSION = '5.2';

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

// ============================================
// CORS + ROUTING
// ============================================
function doGet(e) {
  const action = e.parameter.action;

  // Chequeo de versión: liviano, sin credenciales (la app lo llama al abrir,
  // incluso antes del login, para saber si está desactualizada).
  if (action === 'getVersion') {
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, version: APP_VERSION }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Módulo 0: guardia de autenticación ──
  const auth = authorize(e.parameter, action);
  if (!auth.ok) return ContentService
    .createTextOutput(JSON.stringify({ error: auth.reason, code: auth.code }))
    .setMimeType(ContentService.MimeType.JSON);

  let result;

  // ── Riesgo #4: serializar escrituras para evitar choques simultáneos ──
  const _lock = (_esEscritura_(action) && action !== 'login') ? LockService.getScriptLock() : null;
  if (_lock && !_lock.tryLock(15000)) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'El sistema está procesando otra operación. Probá de nuevo en un momento.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    switch (action) {
      case 'getClientas': result = handleGetClientas(); break;
      case 'getDatosFacturacion': result = handleGetDatosFacturacion(e.parameter); break;
      case 'getFacturaciones': result = handleGetFacturaciones(e.parameter); break;
      case 'getCliente': result = handleGetCliente(e.parameter); break;
      case 'getCatalogo': result = handleGetCatalogo(); break;
      case 'getPromos': result = handleGetPromos(); break;
      case 'getListaEspera': result = _cached_('c_listaEspera', handleGetListaEspera); break;
      case 'getPrelista': result = handleGetPrelista(); break;
      case 'getAbonoActivo': result = handleGetAbonoActivo(e.parameter); break;
      case 'getEstadoCita': result = handleGetEstadoCita(e.parameter); break;
      case 'crearTicketSyna': result = handleCrearTicketSyna(e.parameter); break;
      case 'confirmarLlegada': result = handleConfirmarLlegada(e.parameter); break;
      case 'cancelarCita': result = handleCancelarCita(e.parameter); break;
      case 'eliminarTicketEspera': result = handleEliminarTicketEspera(e.parameter); break;
      case 'getComisiones': result = handleGetComisiones(e.parameter); break;
      case 'getHistorial': result = handleGetHistorial(e.parameter); break;
      case 'getClientasFrecuentes': result = handleGetClientasFrecuentes(e.parameter); break;
      case 'getDescanso': result = handleGetDescanso(); break;
      case 'getFichaPestanas':          result = handleGetFichaPestanas(e.parameter);                break;
      case 'getEvidenciasPestanas':     result = handleGetEvidenciasPestanas(e.parameter);           break;
      case 'getFichaFacial': result = handleGetFichaFacial(e.parameter); break;
      case 'getFichaCejasPigmento': result = handleGetFichaCejasPigmento(e.parameter); break;
      case 'getHistorialClienta': result = handleGetHistorialClienta(e.parameter); break;
      case 'getUltimoServicioArea': result = handleGetUltimoServicioArea(e.parameter); break;
      case 'getPerfilFichas':     result = handleGetPerfilFichas(e.parameter);     break;
      case 'getListaCompleta': result = _cached_('c_listaCompleta', handleGetListaCompleta_LEGACY); break; // ROLLBACK INC-02 — 2026-07-07
      case 'getPorCobrar': result = _cached_('c_porCobrar', handleGetPorCobrar); break;
      case 'getServiciosHoy': result = _cached_('c_serviciosHoy_' + (e.parameter.chica || ''), function(){ return handleGetServiciosHoy(e.parameter); }); break;
      case 'getServiciosSemana': result = handleGetServiciosSemana(e.parameter); break;
      case 'getAtenciones': result = handleGetAtenciones(e.parameter); break;
      case 'getCierresPagos': result = handleGetCierresPagos(); break;
      case 'getCierresSemana': result = handleGetCierresSemana(); break;
      case 'getAutorizaciones': result = handleGetAutorizaciones(); break;
      case 'getServiciosCobrados': result = handleGetServiciosCobrados(e.parameter); break;
      case 'getServicioNormal': result = handleGetServicioNormal(e.parameter); break;
      case 'getServicioPromo':  result = handleGetServicioPromo(e.parameter);  break;
      case 'getTicketMulti':    result = handleGetTicketMulti(e.parameter);    break;
      case 'getTableroLineas':  result = getTableroLineas();                    break;
      case 'getReporteServicios': result = handleGetReporteServicios(e.parameter); break;
      case 'getPorCobrarDesdeLineas': {
        // Paso 3 — leer "por cobrar" desde Lineas con enriquecimiento de esTop (igual que handleGetPorCobrar)
        const _rL = getPorCobrarDesdeLineas(e.parameter);
        if (_rL.success && _rL.porCobrar.length > 0) {
          try {
            const _wsC = getSheet('Clientas'); const _dC = _wsC.getDataRange().getValues();
            const _topMap = {};
            for (let _ci = 3; _ci < _dC.length; _ci++) {
              if (String(_dC[_ci][7] || '').toLowerCase().includes('sí')) _topMap[String(_dC[_ci][0]).trim()] = true;
            }
            _rL.porCobrar.forEach(function(p){ if (_topMap[p.codigo]) p.esTop = true; });
          } catch(eTop) {}
        }
        result = _rL; break;
      }
      case 'auditarPorCobrarLineas':  result = auditarPorCobrarLineas();             break;
      case 'getLaboratorioCliente': result = getLaboratorioCliente(e.parameter); break;
      // ── ASISTENCIA Y PERMISOS ──
      case 'getAsistenciaHoy':     result = handleGetAsistenciaHoy();                    break;
      case 'getInformeMensual':    result = handleGetInformeMensual(e.parameter);         break;
      case 'inicializarPestanas': result = handleInicializarPestanas(); break;
      case 'limpiarAtenciones': result = handleLimpiarAtenciones(); break;
      case 'getMarcaProductos': result = handleGetMarcaProductos(); break;
      case 'getCajaChica':     result = handleGetCajaChica(e.parameter);     break;
      case 'getCajaHistorico': result = handleGetCajaHistorico(e.parameter); break;
      case 'getCierreMes':     result = handleGetCierreMes(e.parameter);     break;
      case 'getCierresMesHistorico': result = handleGetCierresMesHistorico(); break;
      case 'getSolucionesLog':       result = handleGetSolucionesLog();       break;
      // En doGet los parámetros llegan en e.parameter (NO existe 'data', eso es de doPost).
      case 'guardarPushSub':  result = handleGuardarPushSub(e.parameter);  break;
      case 'listarPushSubs':  result = handleListarPushSubs();             break;
      case 'enviarPushStaff': result = handleEnviarPushStaff(e.parameter); break;
      case 'getSesiones':     result = handleGetSesiones();                break;
      case 'pingSesion':      result = handlePingSesion(e.parameter);      break;
      case 'estadoDispositivo': result = handleEstadoDispositivo(e.parameter); break;
      case 'setAprobacion':   result = handleSetAprobacion(e.parameter);   break;
      case 'setModoSeguridad':result = handleSetModoSeguridad(e.parameter);break;
      case 'setDescanso':     result = handleSetDescanso(e.parameter);     break;
      case 'setDescansoGlobal': result = handleSetDescansoGlobal(e.parameter); break;
      default: result = { error: 'Acción no reconocida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  } finally {
    if (_lock) { _lock.releaseLock(); _cacheBustAll_(); }
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // ── Módulo 0: guardia de autenticación ──
  const auth = authorize(data, action);
  if (!auth.ok) return ContentService
    .createTextOutput(JSON.stringify({ error: auth.reason, code: auth.code }))
    .setMimeType(ContentService.MimeType.JSON);

  // ── Ruta rápida sin lock: subida de fotos a Drive (no compite con tickets) ──
  if (action === 'subirEvidenciaPestanas') {
    try {
      const _r = handleSubirEvidenciaPestanas(data);
      return ContentService.createTextOutput(JSON.stringify(_r))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(_e) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: String(_e) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  let result;

  // ── Riesgo #4: serializar escrituras para evitar choques simultáneos ──
  const _lock = (_esEscritura_(action) && action !== 'login') ? LockService.getScriptLock() : null;
  if (_lock && !_lock.tryLock(15000)) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'El sistema está procesando otra operación. Probá de nuevo en un momento.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    switch (action) {
      case 'login': result = handleLogin(data); break;
      case 'addClienta': result = handleAddClienta(data); break;
      case 'updateClienta': result = handleUpdateClienta(data); break;
      case 'updateClientaFull': result = handleUpdateClientaFull(data); break;
      case 'addListaEspera': result = handleAddListaEspera(data); break;
      case 'crearTicketSyna': result = handleCrearTicketSyna(data); break;
      case 'getPrelista': result = handleGetPrelista(); break;
      case 'registrarAbono': result = handleRegistrarAbono(data); break;
      case 'addObservacionClienta': result = handleAddObservacionClienta(data); break;
      case 'consumirAbono': result = handleConsumirAbono(data); break;
      case 'setCodigoTicket': result = handleSetCodigoTicket(data); break;
      case 'getAbonoActivo': result = handleGetAbonoActivo(data); break;
      case 'getEstadoCita': result = handleGetEstadoCita(data); break;
      case 'getLaboratorioCliente': result = getLaboratorioCliente(data); break;
      // ── ASISTENCIA Y PERMISOS ──
      case 'asistenciaEntrada':       result = handleAsistenciaEntrada(data);       break;
      case 'asistenciaSalida':        result = handleAsistenciaSalida(data);        break;
      case 'asistenciaPermiso':       result = handleAsistenciaPermiso(data);       break;
      case 'asistenciaRegreso':       result = handleAsistenciaRegreso(data);       break;
      case 'asistenciaEvento':        result = handleAsistenciaEvento(data);        break;
      case 'asistenciaCorreccion':    result = handleAsistenciaCorreccion(data);    break;
      case 'asistenciaWhatsApp':      result = handleAsistenciaWhatsApp(data);      break;
      case 'asistenciaCierreAuto':    result = handleAsistenciaCierreAutomatico();  break;
      case 'confirmarLlegada': result = handleConfirmarLlegada(data); break;
      case 'cancelarCita': result = handleCancelarCita(data); break;
      case 'eliminarTicketEspera': result = handleEliminarTicketEspera(data); break;
      case 'tomarClienta':
        // Normalizar: el frontend puede mandar idListaEspera o idEspera
        if (!data.idEspera && data.idListaEspera) data.idEspera = data.idListaEspera;
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleTomarServicioNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleTomarServicioPromo(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('TM-')) {
          result = handleTomarAreaTicketMulti({ idEspera: data.idEspera, chicaNombre: data.chicaNombre });
        } else {
          result = handleTomarClienta(data);
        }
        break;
      case 'finalizarAtencion':
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleFinalizarServicioNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleFinalizarServicioPromo(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('TM-')) {
          // Un TM- (combo/multi-área) NUNCA debe caer en handleFinalizarAtencion (que solo
          // busca en ListaEspera LE-) → ahí se perdía la clienta sin avisar a Mikaela.
          // handleCompletarAreaTicketMulti marca el área de la staff como completada y,
          // si quedan áreas, las deja en "Esperando" + avisa a Mikaela ("En espera parcial").
          result = handleCompletarAreaTicketMulti(data);
        } else {
          result = handleFinalizarAtencion(data);
        }
        break;
      case 'confirmarCobro':
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleConfirmarCobroNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleConfirmarCobroPromo(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('TM-')) {
          result = handleConfirmarCobroMulti(data);
        } else {
          result = handleConfirmarCobro(data);
        }
        break;
      case 'updateServiciosAtencion': result = handleUpdateServiciosAtencion(data); break;
      case 'devolverALista': result = handleDevolverALista(data); break;
      case 'continuarPromoALista': result = handleContinuarPromoALista(data); break;
      case 'addPromo': result = handleAddPromo(data); break;
      case 'updatePromo': result = handleUpdatePromo(data); break;
      case 'addFichaPestanas':          result = handleAddFichaPestanas(data);                     break;
      case 'subirEvidenciaPestanas':    result = handleSubirEvidenciaPestanas(data);               break;
      case 'addVisitaFacial':    result = handleAddVisitaFacial(data);    break;
      case 'getHistorialFacial': result = handleGetHistorialFacial(e.parameter); break;
      case 'getPerfilFichas':    result = handleGetPerfilFichas(e.parameter); break;
      case 'getHistorialClienta': result = handleGetHistorialClienta(e.parameter); break;
      case 'completarYTomarSiguienteAreaTM': result = handleCompletarYTomarSiguienteAreaTM(data); break;
      case 'updateFichaFacial':  result = handleUpdateFichaFacial(data);  break;
      case 'addFichaCejasPigmento': result = handleAddFichaCejasPigmento(data); break;
      case 'cierreSemanal': result = handleCierreSemanal(data); break;
      case 'verificarCierreAutomatico': result = handleVerificarCierreAutomatico(); break;
      case 'inicializarPestanas': result = handleInicializarPestanas(); break;
      case 'addServicioNormal': result = handleAddServicioNormal(data); break;
      case 'addServicioPromo':  result = handleAddServicioPromo(data);  break;
      case 'getServicioNormal': result = handleGetServicioNormal(e.parameter); break;
      case 'tomarServicioNormal': result = handleTomarServicioNormal(data); break;
      case 'finalizarServicioNormal': result = handleFinalizarServicioNormal(data); break;
      case 'finalizarServicioPromo':  result = handleFinalizarServicioPromo(data);  break;
      case 'confirmarCobroNormal': result = handleConfirmarCobroNormal(data); break;
      case 'pagoIndividual': result = handlePagoIndividual(data); break;
      case 'bloquearUsuario': result = handleBloquearUsuario(data); break;
      case 'asignarServicioNormal': result = handleAsignarServicioNormal(data); break;
      case 'confirmarServicioStaff': result = handleConfirmarServicioStaff(data); break;
      case 'actualizarServicioSP': result = handleActualizarServicioSP(data); break;
      case 'asignarPromo': result = handleAsignarPromo(data); break;
      case 'asignarStaff': result = handleAsignarStaff(data); break;
      case 'mandarACobro': result = handleMandarACobro(data); break;
      case 'retirarYCobrar': result = handleRetirarYCobrar(data); break;
      case 'agregarServicioExtra': result = handleAgregarServicioExtra(data); break;
      case 'agregarPromoExtra': result = handleAgregarPromoExtra(data); break;
      case 'guardarFacturacion': result = handleGuardarFacturacion(data); break;
      case 'solicitarAutorizacion': result = handleSolicitarAutorizacion(data); break;
      case 'aprobarAutorizacion': result = handleAprobarAutorizacion(data); break;
      case 'rechazarAutorizacion': result = handleRechazarAutorizacion(data); break;
      case 'registrarVentaProductos': result = handleRegistrarVentaProductos(data); break;
      case 'eliminarServicio': result = handleEliminarServicio(data); break;
      // ── TICKET MULTI ──
      case 'crearTicketMulti':       result = handleCrearTicketMulti(data);       break;
      case 'tomarAreaTicketMulti':   result = handleTomarAreaTicketMulti(data);   break;
      case 'completarAreaTicketMulti': result = handleCompletarAreaTicketMulti(data); break;
      case 'confirmarCobroMulti':    result = handleConfirmarCobroMulti(data);    break;
      case 'addGastoCaja':    result = handleAddGastoCaja(data);    break;
      case 'addAperturaCaja': result = handleAddAperturaCaja(data); break;
      case 'guardarCierreMes': result = handleGuardarCierreMes(data); break;
      case 'anularGastoCaja': result = handleAnularGastoCaja(data); break;
      case 'registrarSolucion':   result = handleRegistrarSolucion(data); break;
      case 'borrarSolucionesLog': result = handleBorrarSolucionesLog();    break;
      case 'cerrarCaja':      result = handleCerrarCaja(data);      break;
      case 'guardarPushSub':  result = handleGuardarPushSub(data);  break;
      case 'listarPushSubs':  result = handleListarPushSubs();      break;
      case 'enviarPushStaff': result = handleEnviarPushStaff(data); break;
      case 'getSesiones':     result = handleGetSesiones();         break;
      case 'pingSesion':      result = handlePingSesion(data);      break;
      case 'estadoDispositivo': result = handleEstadoDispositivo(data); break;
      case 'setAprobacion':   result = handleSetAprobacion(data);   break;
      case 'setModoSeguridad':result = handleSetModoSeguridad(data);break;
      case 'setDescanso':     result = handleSetDescanso(data);     break;
      case 'setDescansoGlobal': result = handleSetDescansoGlobal(data); break;
      default: result = { error: 'Acción no reconocida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  } finally {
    if (_lock) { _lock.releaseLock(); _cacheBustAll_(); }
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// LOGIN → movido a NexServ_Auth.gs (Módulo 0)
// handleLogin() ahora vive en el archivo de seguridad:
// compara contra el hash y emite el token de sesión firmado.
// ============================================

// ── Modo de descanso (bloqueo temporal de acceso por staff) ──────────────
function _leerDescanso() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DESCANSO_STAFF');
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}
function _staffEnDescanso(nombre) {
  if (_descansoGlobalActivo()) return true; // descanso global bloquea a todo el equipo
  const cfg = _leerDescanso();
  return cfg[String(nombre || '').trim()] === true;
}
// ── Descanso GLOBAL: bloquea a TODO el equipo de una sola vez (el Owner queda exento) ──
function _descansoGlobalActivo() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DESCANSO_GLOBAL');
    if (!raw) return false;
    const o = JSON.parse(raw);
    return !!(o && o.on === true);
  } catch (e) { return false; }
}
function handleGetDescanso() {
  let g = false, desde = '', por = '';
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DESCANSO_GLOBAL');
    if (raw) { const o = JSON.parse(raw); g = !!(o && o.on); desde = (o && o.desde) || ''; por = (o && o.por) || ''; }
  } catch (e) {}
  return { success: true, config: _leerDescanso(), global: g, desde: desde, por: por };
}
function handleSetDescansoGlobal(data) {
  try {
    const activar = (data && (data.activar === true || data.activar === 'true'));
    const props = PropertiesService.getScriptProperties();
    if (activar) {
      props.setProperty('DESCANSO_GLOBAL', JSON.stringify({
        on: true,
        desde: new Date().toISOString(),
        por: String((data && data.por) || '')
      }));
    } else {
      props.deleteProperty('DESCANSO_GLOBAL');
      // "Desbloquear equipo" debe liberar a TODAS: limpiar también los descansos
      // INDIVIDUALES. Si no, las staff con flag individual seguían bloqueadas al
      // quitar el global (causa de "persiste con algunas staff").
      props.deleteProperty('DESCANSO_STAFF');
    }
    return { success: true, global: _descansoGlobalActivo() };
  } catch (e) { return { success: false, message: String(e) }; }
}
function handleSetDescanso(data) {
  const cfg = _leerDescanso();
  const nombre = String((data && data.staff) || '').trim();
  if (!nombre) return { success: false, message: 'Falta el nombre de la staff' };
  if (data.bloqueado === true || data.bloqueado === 'true') cfg[nombre] = true;
  else delete cfg[nombre];
  PropertiesService.getScriptProperties().setProperty('DESCANSO_STAFF', JSON.stringify(cfg));
  return { success: true, config: cfg };
}

// ============================================
// CLIENTAS
// ============================================
// Perfil/historial completo de una clienta para Mikaela
// Devuelve el ÚLTIMO servicio de un área para una clienta (p. ej. cejas), leyendo
// HistorialOwner de abajo hacia arriba: como se agrega en orden cronológico, el primer
// match es el más reciente. params: { codigo, area }.
//   HistorialOwner: A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor
function handleGetUltimoServicioArea(params) {
  try {
    var codigo = String((params && params.codigo) || '').trim();
    var area   = String((params && params.area) || '').trim().toLowerCase();
    if (!codigo) return { success: false, message: 'codigo requerido' };
    if (!area)   return { success: false, message: 'area requerida' };
    var clave = area.indexOf('cej') >= 0 ? 'cej'
              : area.indexOf('depil') >= 0 ? 'depil'
              : area.indexOf('pest') >= 0 ? 'pest'
              : area.indexOf('facial') >= 0 ? 'facial'
              : area;
    var ws = getSheet('HistorialOwner');
    var d = ws.getDataRange().getValues();
    for (var i = d.length - 1; i >= 3; i--) {
      if (String(d[i][2] || '').trim() !== codigo) continue;
      var aFila = String(d[i][6] || '').toLowerCase();
      if (aFila.indexOf(clave) < 0) continue;
      return {
        success: true, found: true,
        fecha: String(d[i][0] || ''), hora: String(d[i][1] || ''),
        servicio: String(d[i][5] || ''), area: String(d[i][6] || ''),
        staff: String(d[i][7] || ''), valor: Number(d[i][8] || 0)
      };
    }
    return { success: true, found: false };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

function handleGetHistorialClienta(params) {
  var codigo = String((params && params.codigo) || '').trim();
  if (!codigo) return { success: false, error: 'Falta el código de la clienta' };

  // Datos de la clienta + última visita
  var cliente = null;
  try {
    var wsC = getSheet('Clientas');
    var dataC = wsC.getDataRange().getValues();
    for (var i = 3; i < dataC.length; i++) {
      if (String(dataC[i][0] || '').trim() === codigo) {
        cliente = {
          codigo: dataC[i][0], nombre: dataC[i][1], telefono: dataC[i][2],
          ultimaVisita: dataC[i][4], totalVisitas: dataC[i][5], observaciones: dataC[i][9] || '',
          // Datos de facturación: cédula K(10), correo L(11), ciudad Q(16)
          cedula: dataC[i][10] || '', correo: dataC[i][11] || '', ciudad: dataC[i][16] || '',
          // Observaciones por área que dejan las staff (Clientas L–P / índices 12–15)
          obsCejas:      dataC[i][12] || '',
          obsDepilacion: dataC[i][13] || '',
          obsPestanas:   dataC[i][14] || '',
          obsFacial:     dataC[i][15] || ''
        };
        break;
      }
    }
  } catch (e) {}

  // Fichas (reusar getters existentes)
  var fichaFacial = null, fichaPestanas = null, fichaPigmento = null;
  try { fichaFacial   = handleGetFichaFacial({ codigo: codigo }); } catch (e) {}
  try { fichaPestanas = handleGetFichaPestanas({ codigo: codigo }); } catch (e) {}
  try { fichaPigmento = handleGetFichaCejasPigmento({ codigo: codigo }); } catch (e) {}

  // Historial de servicios (HistorialOwner): A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor
  var historial = [];
  try {
    var wsH = getSheet('HistorialOwner');
    var dataH = wsH.getDataRange().getValues();
    for (var j = 3; j < dataH.length; j++) {
      if (String(dataH[j][2] || '').trim() === codigo) {
        historial.push({
          fecha: dataH[j][0], hora: dataH[j][1], servicio: dataH[j][5],
          area: dataH[j][6], staff: dataH[j][7], valor: dataH[j][8]
        });
      }
    }
    historial.reverse(); // más reciente primero
  } catch (e) {}

  // Bitácora permanente de observaciones que dejaron las staff (todas las áreas)
  var observacionesStaff = [];
  try {
    var wsO = SpreadsheetApp.openById(SHEET_ID).getSheetByName('ObservacionesClienta');
    if (wsO) {
      var dataO = wsO.getDataRange().getValues();
      for (var k = 1; k < dataO.length; k++) {
        if (String(dataO[k][2] || '').trim() === codigo) {
          observacionesStaff.push({
            fecha: dataO[k][0], hora: dataO[k][1],
            area: dataO[k][4], staff: dataO[k][5], observacion: dataO[k][6]
          });
        }
      }
      observacionesStaff.reverse(); // más reciente primero
    }
  } catch (e) {}

  return {
    success: true,
    cliente: cliente,
    fichaFacial: fichaFacial,
    fichaPestanas: fichaPestanas,
    fichaPigmento: fichaPigmento,
    observacionesStaff: observacionesStaff,
    historial: historial
  };
}

function handleGetClientas() {
  const ws = getSheet('Clientas');
  const data = ws.getDataRange().getValues();
  const clientas = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    clientas.push({
      codigo: row[0],
      nombre: row[1],
      telefono: row[2],
      fechaRegistro: row[3],
      ultimaVisita: row[4],
      totalVisitas: row[5],
      visitasMes: row[6],
      esTop: row[7],
      overrideManual: row[8],
      observaciones: row[9],
      cedula: row[10] || '',
      correo: row[11] || '',
      obsCejas: row[12] || '',
      obsDepilacion: row[13] || '',
      obsPestanas: row[14] || '',
      obsFacial: row[15] || ''
    });
  }
  return { success: true, clientas: clientas };
}

function handleGetCliente(params) {
  const clientas = handleGetClientas();
  const cliente = clientas.clientas.find(c => c.codigo === params.codigo);
  if (!cliente) return { success: false, message: 'Clienta no encontrada' };

  // Traer fichas de pestañas
  const fichasPest = handleGetFichaPestanas({ codigo: params.codigo });
  // Traer ficha facial
  const fichaFac = handleGetFichaFacial({ codigo: params.codigo });
  // Traer historial de servicios
  const historial = getHistorialCliente(params.codigo);

  return {
    success: true,
    cliente: cliente,
    fichasPestanas: fichasPest.fichas || [],
    fichaFacial: fichaFac.ficha || null,
    historial: historial
  };
}

function handleAddClienta(data) {
  // Saneamiento de nombre: un nombre real de clienta nunca trae " + " (eso viene de
  // un cobro grupal/combo cuyo nombre se mostró concatenado, ej. "Susana + Micaela").
  // Si llega así, nos quedamos con el primer nombre para no crear clientas basura.
  try {
    var _nm = String((data && data.nombre) || '').trim();
    if (/\s\+\s/.test(_nm)) {
      var _primero = _nm.split(/\s*\+\s*/)[0].trim();
      data.nombre = _primero || _nm;
    } else {
      data.nombre = _nm;
    }
  } catch (eNm) {}

  const ws = getSheet('Clientas');
  const lastRow = ws.getLastRow();

  // Generar código automático
  const lastCode = ws.getRange(lastRow, 1).getValue();
  const nextNum = lastCode ? parseInt(String(lastCode).replace('C-', '')) + 1 : 1;
  const codigo = 'C-' + String(nextNum).padStart(4, '0');

  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  const estadoInicial = (data.directoListaEspera === true || String(data.directoListaEspera || '').toLowerCase() === 'true')
    ? 'Esperando'
    : 'Prelista';

  ws.appendRow([
    codigo,
    data.nombre,
    data.telefono || '',
    today,
    '—',
    0,
    0,
    'No',
    'Auto',
    data.observaciones || '',
    data.cedula || '',
    data.correo || '',
    data.obsCejas || '',
    data.obsDepilacion || '',
    data.obsPestanas || '',
    data.obsFacial || ''
  ]);

  // Si tiene ficha de pestañas
  if (data.pestModelo) {
    handleAddFichaPestanas({
      codigo: codigo,
      nombre: data.nombre,
      modelo: data.pestModelo,
      diseno: data.pestDiseno || '—',
      tallas: data.pestTallas || '—',
      obs: data.pestObs || ''
    });
  }

  // Si tiene ficha facial
  if (data.facBiotipo) {
    handleUpdateFichaFacial({
      codigo: codigo,
      nombre: data.nombre,
      edad: data.facEdad,
      sexo: data.facSexo,
      biotipo: data.facBiotipo,
      fototipo: data.facFototipo,
      tipoPiel: data.facTipoPiel,
      signosLesiones: data.facSignos,
      signosHiper: data.facHiper,
      estadoPiel: data.facEstado,
      alergias: data.facAlergias,
      antecedentes: data.facAntecedentes,
      obsExtra: data.facObsExtra
    });
  }

  return { success: true, codigo: codigo, message: 'Clienta registrada' };
}

function handleUpdateClienta(data) {
  const ws = getSheet('Clientas');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    if (allData[i][0] === data.codigo) {
      const row = i + 1;
      if (data.observaciones !== undefined) ws.getRange(row, 10).setValue(data.observaciones);
      if (data.obsCejas !== undefined) ws.getRange(row, 13).setValue(data.obsCejas);
      if (data.obsDepilacion !== undefined) ws.getRange(row, 14).setValue(data.obsDepilacion);
      if (data.obsPestanas !== undefined) ws.getRange(row, 15).setValue(data.obsPestanas);
      if (data.obsFacial !== undefined) ws.getRange(row, 16).setValue(data.obsFacial);
      if (data.overrideManual !== undefined) ws.getRange(row, 9).setValue(data.overrideManual);
      return { success: true };
    }
  }
  return { success: false, message: 'Clienta no encontrada' };
}

function handleUpdateClientaFull(data) {
  const ws = getSheet('Clientas');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    if (allData[i][0] === data.codigo) {
      const row = i + 1;
      // Actualizar todos los campos editables
      if (data.nombre !== undefined) ws.getRange(row, 2).setValue(data.nombre);
      if (data.telefono !== undefined) ws.getRange(row, 3).setValue(data.telefono);
      if (data.cedula !== undefined) ws.getRange(row, 11).setValue(data.cedula);
      if (data.correo !== undefined) ws.getRange(row, 12).setValue(data.correo);
      if (data.obsCejas !== undefined) ws.getRange(row, 13).setValue(data.obsCejas);
      if (data.obsDepilacion !== undefined) ws.getRange(row, 14).setValue(data.obsDepilacion);
      if (data.obsPestanas !== undefined) ws.getRange(row, 15).setValue(data.obsPestanas);
      if (data.obsFacial !== undefined) ws.getRange(row, 16).setValue(data.obsFacial);
      if (data.ciudad !== undefined) ws.getRange(row, 17).setValue(data.ciudad);   // col Q = ciudad (facturación)
      return { success: true };
    }
  }
  return { success: false, message: 'Clienta no encontrada' };
}


// ============================================
// CATÁLOGO
// ============================================
function handleGetCatalogo() {
  const ws = getSheet('Catalogo');
  const data = ws.getDataRange().getValues();
  const servicios = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    servicios.push({
      codigo: row[0],
      area: row[1],
      servicio: row[2],
      precio: row[3],
      activo: row[4]
    });
  }
  return { success: true, servicios: servicios };
}

// ============================================
// PROMOS / PAQUETES
// ============================================
function handleGetPromos() {
  const ws = getSheet('Paquetes');
  const data = ws.getDataRange().getValues();
  const promos = [];

  // Fila 1=título, 2=nota, 3=encabezados, promos desde fila 4 (índice 3)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    // Solo leer filas que tengan un ID válido de promo (P001, P002, etc.)
    if (!id.startsWith('P')) continue;
    // Ignorar IDs inválidos como PNaN
    const num = parseInt(id.replace('P', ''));
    if (isNaN(num)) continue;
    promos.push({
      id: id,
      name: String(row[1] || ''),           // campo 'name' para compatibilidad con PROMOS frontend
      nombre: row[1],
      servicios: row[2],
      price: Number(row[3] || 0),           // precioCombo = precio promo
      precioCombo: row[3],
      // FIX: si sumaIndividual (col E) está vacío, usar el precioCombo como fallback
      // para que el frontend no reciba regular=0 y Tarjeta no cobre precio promo.
      // El precio regular correcto debe llenarse en la hoja Paquetes col E.
      regular: Number(row[4] || row[3] || 0), // sumaIndividual = precio regular sin descuento
      sumaIndividual: row[4],
      ahorro: row[5],
      desde: row[6],
      hasta: row[7],
      activa: row[8] !== undefined ? String(row[8]).toLowerCase() !== 'no' : true,
      division: row[9] ? String(row[9]) : ''
    });
  }
  return { success: true, promos: promos };
}

function handleAddPromo(data) {
  const ws = getSheet('Paquetes');
  const allData = ws.getDataRange().getValues();

  // Buscar el último ID de promo válido para generar el siguiente
  let maxNum = 0;
  let lastPromoRow = 4; // fila del encabezado (índice 3 = fila 4)
  for (let i = 4; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (id.startsWith('P')) {
      const num = parseInt(id.replace('P', ''));
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        lastPromoRow = i + 1; // fila real (1-based)
      }
    }
  }
  const id = 'P' + String(maxNum + 1).padStart(3, '0');

  // Insertar justo después de la última promo existente
  ws.insertRowAfter(lastPromoRow);
  const newRow = lastPromoRow + 1;
  ws.getRange(newRow, 1).setValue(id);
  ws.getRange(newRow, 2).setValue(data.nombre || '');
  ws.getRange(newRow, 3).setValue(data.servicios || '');
  ws.getRange(newRow, 4).setValue(Number(data.precio) || 0);
  ws.getRange(newRow, 5).setValue(Number(data.regular) || 0);
  ws.getRange(newRow, 6).setValue((Number(data.regular) || 0) - (Number(data.precio) || 0));
  ws.getRange(newRow, 7).setValue(data.desde || '');
  ws.getRange(newRow, 8).setValue(data.hasta || '');
  ws.getRange(newRow, 9).setValue(data.activa !== false ? 'Sí' : 'No');
  ws.getRange(newRow, 10).setValue(data.division || '');

  return { success: true, id: id };
}

function handleUpdatePromo(data) {
  const ws = getSheet('Paquetes');
  const allData = ws.getDataRange().getValues();

  for (let i = 4; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (id === data.id) {
      const row = i + 1;
      ws.getRange(row, 2).setValue(data.nombre);
      ws.getRange(row, 3).setValue(data.servicios);
      ws.getRange(row, 4).setValue(Number(data.precio) || 0);
      ws.getRange(row, 5).setValue(Number(data.regular) || 0);
      ws.getRange(row, 6).setValue((Number(data.regular) || 0) - (Number(data.precio) || 0));
      ws.getRange(row, 7).setValue(data.desde);
      ws.getRange(row, 8).setValue(data.hasta);
      if (data.activa !== undefined) ws.getRange(row, 9).setValue(data.activa ? 'Sí' : 'No');
      if (data.division !== undefined) ws.getRange(row, 10).setValue(data.division);
      return { success: true };
    }
  }
  return { success: false };
}

// ============================================
// LISTA DE ESPERA
// Columnas reales: A=ID | B=Fecha | C=Hora llegada | D=Código cliente | E=Cliente | F=Servicio | G=Área | H=Prioridad | I=Estado | J=Tomada por | K=Hora toma | L=Observaciones
// ============================================
// Borra (cancela) un ticket de la lista de espera. Soft-delete: marca estado 'Cancelado'
// para que desaparezca de la lista pero quede el registro (reversible/auditable).
function handleEliminarTicketEspera(data) {
  var id = String((data && data.id) || '').trim();
  if (!id) return { success: false, error: 'Falta el id del ticket' };

  // Determinar hoja y fila inicial según el tipo de ticket
  var hoja = null, desde = 1;
  if (id.indexOf('LE-') === 0)      { hoja = 'ListaEspera';    desde = 3; }
  else if (id.indexOf('SN-') === 0) { hoja = 'ServicioNormal'; desde = 1; }
  else if (id.indexOf('SP-') === 0) { hoja = 'ServicioPromo';  desde = 1; }
  else if (id.indexOf('TM-') === 0) { hoja = 'TicketMulti';    desde = 1; }
  else return { success: false, error: 'Tipo de ticket no reconocido: ' + id };

  var ws = getSheet(hoja);
  if (!ws) return { success: false, error: 'Hoja ' + hoja + ' no encontrada' };

  var rows = ws.getDataRange().getValues();
  for (var i = desde; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === id) {
      ws.deleteRow(i + 1); // borra la fila completa del sheet (permanente)
      return { success: true, id: id, borrado: true };
    }
  }
  return { success: false, error: 'Ticket no encontrado' };
}

function handleGetListaEspera() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const lista = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id || !id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    if (estado === 'tomada' || estado === 'completada' || estado === 'finalizada' || estado === 'en servicio' || estado === 'por cobrar' || estado === 'cancelado' || estado === 'prelista') continue;
    // Excluir tickets atascados con fecha 1899
    if (row[1] instanceof Date && row[1].getFullYear() < 2000) continue;
    lista.push({
      id: id,
      fecha: row[1],
      horaLlegada: row[2],
      codigo: row[3],
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      prioridad: row[7],
      estado: row[8],
      tomadaPor: row[9],
      horaToma: row[10],
      observaciones: row[11] || '',
      total: Number(row[12] || 0),
      promoNombre: row[13] || '',
      precioPromo: row[14] || '',
      precioRegular: row[15] || '',
      secuencia: (function(){ try { return JSON.parse(row[16] || '[]'); } catch(e) { return []; } })(),
      promasExtra: (function(){ try { return JSON.parse(row[17] || '[]'); } catch(e) { return []; } })(),
      esTop: 'No',
      asignadaA: estado === 'asignada' ? String(row[9] || '') : ''
    });
  }
  
  // Buscar si son TOP desde la hoja Clientas
  try {
    const wsC = getSheet('Clientas');
    const cData = wsC.getDataRange().getValues();
    const topMap = {};
    for (let i = 3; i < cData.length; i++) {
      if (String(cData[i][7] || '').toLowerCase().includes('sí')) topMap[cData[i][0]] = true;
    }
    lista.forEach(l => { if (topMap[l.codigo]) l.esTop = 'Sí'; });
  } catch(e) {}

  // Merge con ServicioNormal (tickets SN- esperando)
  try {
    const snR = handleGetServicioNormal({});
    if (snR.success && snR.esperando) {
      snR.esperando.forEach(sn => {
        lista.push({
          id          : sn.idEspera,
          fecha       : sn.fecha,
          horaLlegada : sn.horaLlegada,
          codigo      : sn.codigo,
          nombre      : sn.nombre,
          servicio    : sn.servicio,
          area        : sn.area,
          prioridad   : sn.prioridad || 'Normal',
          estado      : sn.estado || 'Esperando',
          tomadaPor   : sn.tomadaPor || '',
          horaToma    : sn.horaTomada || '',
          observaciones: sn.observaciones || '',
          total       : Number(sn.total || 0),
          promoNombre : sn.promoNombre || '',
          precioPromo : sn.precioPromo || '',
          precioRegular: sn.precioNormal || '',
          tipo        : sn.tipo || 'SN',
          secuencia   : [],
          promasExtra : [],
          esTop       : sn.esTop || 'No',
          asignadaA   : sn.asignadaA || '',
          fuente      : 'ServicioNormal'
        });
      });
    }
  } catch(e) {}

  // Merge con ServicioPromo (tickets SP- esperando)
  try {
    const spR = handleGetServicioPromo({});
    if (spR.success && spR.esperando) {
      spR.esperando.forEach(sp => {
        lista.push({
          id          : sp.idEspera,
          fecha       : sp.fecha,
          horaLlegada : sp.horaLlegada,
          codigo      : sp.codigo,
          nombre      : sp.nombre,
          servicio    : sp.servicio,
          area        : sp.area,
          prioridad   : sp.prioridad || 'Normal',
          estado      : sp.estado || 'Esperando',
          tomadaPor   : sp.tomadaPor || '',
          horaToma    : sp.horaTomada || '',
          observaciones: sp.observaciones || '',
          total       : Number(sp.total || 0),
          promoNombre : sp.promoNombre || '',
          precioPromo : sp.precioPromo || '',
          precioRegular: sp.precioNormal || '',
          tipo        : sp.tipo || 'SP',
          secuencia   : [],
          promasExtra : [],
          esTop       : 'No',
          asignadaA   : sp.asignadaA || '',
          fuente      : 'ServicioPromo'
        });
      });
    }
  } catch(e) {}

  // Merge con TicketMulti — solo la PRÓXIMA área según secuencia (una tarjeta por TM)
  try {
    const tmR = handleGetTicketMulti({});
    if (tmR.success && tmR.activos) {
      tmR.activos.forEach(function(tm) {
        // Flujo secuencial: si alguna área del TM está EN SERVICIO, no liberar la
        // siguiente todavía. La próxima área recién aparece cuando la staff actual
        // termina su parte (toca "terminé mi parte") y su área deja de estar en servicio.
        var tieneEnServicio = (tm.areas || []).some(function(a) {
          return String(a.estado || '').toLowerCase() === 'en servicio';
        });
        if (tieneEnServicio) return;
        var areasEsperando = (tm.areas || []).filter(function(a) {
          return String(a.estado || '').toLowerCase() === 'esperando';
        });
        if (areasEsperando.length === 0) return;
        var proximaArea = null;
        if (tm.secuencia && tm.secuencia.length > 0) {
          for (var si = 0; si < tm.secuencia.length; si++) {
            var seqArea = String(tm.secuencia[si]).toLowerCase();
            var match = areasEsperando.filter(function(a) {
              return String(a.area || '').toLowerCase() === seqArea;
            })[0];
            if (match) { proximaArea = match; break; }
          }
        }
        if (!proximaArea) proximaArea = areasEsperando[0];
        // Modelo centralizado: priorizar área en espera que ya tenga staff asignada
        var areaAsignadaLE = areasEsperando.filter(function(a){ return a.staff && String(a.staff).trim() !== ''; })[0];
        if (areaAsignadaLE) proximaArea = areaAsignadaLE;
        var staffTM = String(proximaArea.staff || '').trim();
        lista.push({
          id          : tm.idEspera,
          fecha       : '',
          horaLlegada : '',
          codigo      : tm.codigo,
          nombre      : tm.nombre,
          servicio    : proximaArea.tentativo || '',
          area        : proximaArea.area || 'multi',
          prioridad   : tm.prioridad || 'Normal',
          estado      : staffTM ? 'Asignada' : 'Esperando',
          tomadaPor   : staffTM,
          horaToma    : '',
          observaciones: tm.observaciones || '',
          total       : proximaArea.precio || 0,
          promoNombre : '',
          precioPromo : '',
          precioRegular: '',
          tipo        : 'TM',
          secuencia   : tm.secuencia || [],
          promasExtra : [],
          esTop       : 'No',
          asignadaA   : staffTM,
          fuente      : 'TicketMulti',
          areaIdx     : proximaArea.idx
        });
      });
    }
  } catch(e) {}

  return { success: true, lista: lista };
}

function handleAddListaEspera(data) {
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  
  // Buscar último ID válido
  let maxNum = 0;
  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '');
    if (id.startsWith('LE-')) {
      const num = parseInt(id.replace('LE-', ''));
      if (num > maxNum) maxNum = num;
    }
  }
  const id = 'LE-' + String(maxNum + 1).padStart(4, '0');

  const now = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  // Si viene con asignadaA, el estado es "Asignada" y se guarda la chica en col J
  const estado = data.asignadaA ? 'Asignada' : 'Esperando';
  const tomadaPor = data.asignadaA || '';

  // Columnas: A=ID | B=Fecha | C=Hora | D=Código | E=Nombre | F=Servicio | G=Área | H=Prioridad | I=Estado | J=TomadaPor | K=HoraToma | L=Obs | M=Total | N=PromoNombre | O=PrecioPromo | P=PrecioRegular | Q=SecuenciaAreas
  // Secuencia: array de areas en orden definido por Mikaela, guardado como JSON string
  const secuenciaStr = data.secuencia && data.secuencia.length > 0
    ? JSON.stringify(data.secuencia.map(s => s.area || s))
    : '';

  // Promos extra (2a y 3a promo) guardadas como JSON en col R
  const promasExtraStr = data.promasExtra && data.promasExtra.length > 0
    ? JSON.stringify(data.promasExtra)
    : '';

  ws.appendRow([
    id, fecha, hora, data.codigo, data.nombre, data.servicio,
    data.area, data.prioridad || 'Normal', estado, tomadaPor, '', data.observaciones || '',
    data.total || 0,                // M(12): Total
    data.promoNombre || '',          // N(13): Promo 1 nombre
    data.precioPromo || '',          // O(14): Promo 1 precio
    data.precioRegular || '',        // P(15): Promo 1 precio regular
    secuenciaStr,                    // Q(16): Secuencia de areas (JSON)
    promasExtraStr                   // R(17): Promos extra 2 y 3 (JSON)
  ]);

  // espejo Lineas: registrar la clienta desde el momento en que llega a la cola.
  // Sin esto, un LE- no existia en Lineas hasta finalizarAtencion (demasiado tarde).
  // promoRef no aplica para LE- (no es un ticket referenciado por id),
  // la linea se ata al ticket via ticketRef en lineaDesdeAsignacion cuando se asigna staff.
  try {
    lineaDesdeListaEspera({
      codigo:       data.codigo,
      nombre:       data.nombre,
      servicio:     data.servicio,
      area:         data.area,
      total:        data.total || 0,
      promoNombre:  data.promoNombre || '',
      precioPromo:  data.precioPromo || 0,
      precioRegular: data.precioRegular || 0,
      asignadaA:    data.asignadaA || '',
      observaciones: data.observaciones || ''
    }, 'LE');
  } catch (eLn) { Logger.log('espejo addListaEspera Lineas: ' + eLn); }

  return { success: true, id: id };
}

function handleTomarClienta(data) {
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  const now = Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm');

  for (let i = 3; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === data.idListaEspera) {
      const row = i + 1;
      const estado = String(ws.getRange(row, 9).getValue()).toLowerCase();
      
      // Si ya está en servicio o completada, no se puede tomar
      if (estado === 'en servicio' || estado === 'completada') {
        return { success: false, message: 'Esta clienta ya fue tomada por ' + ws.getRange(row, 10).getValue() };
      }
      
      // Si está asignada, solo la chica asignada puede tomarla
      if (estado === 'asignada') {
        const asignadaA = String(ws.getRange(row, 10).getValue()).trim();
        if (asignadaA && asignadaA !== data.chicaNombre) {
          return { success: false, message: 'Esta clienta está asignada a ' + asignadaA };
        }
      }
      
      ws.getRange(row, 9).setValue('En servicio');   // col I = Estado
      ws.getRange(row, 10).setValue(data.chicaNombre); // col J = Tomada por
      ws.getRange(row, 11).setValue(now);               // col K = Hora toma

      // Crear registro en Atenciones
      handleAddAtencion({
        codigo: allData[i][3],        // col D = Código cliente
        nombre: allData[i][4],        // col E = Nombre
        chica: data.chicaNombre,
        servicio: allData[i][5],      // col F = Servicio
        area: allData[i][6],          // col G = Área
        idEspera: allData[i][0]       // col A = ID ticket LE-XXXX
      });

      // #1 Avisar a Mikaela que una staff tomó a la clienta
      _pushMikaela('👤 Clienta tomada', String(data.chicaNombre || 'Una chica') + ' tomó a ' + String(allData[i][4] || 'una clienta') + (allData[i][5] ? ' · ' + allData[i][5] : ''));

      return { success: true, horaToma: now };
    }
  }

  // Si no encontró en ListaEspera, buscar en ServicioPromo (tickets SP-)
  if (String(data.idListaEspera || '').startsWith('SP-')) {
    return handleTomarServicioPromo({
      idEspera: data.idListaEspera,
      chicaNombre: data.chicaNombre
    });
  }

  return { success: false, message: 'Registro no encontrado' };
}

// ============================================
// FINALIZAR ATENCIÓN Y COBRO
// ============================================
// La chica toca "Finalizar servicio" → estado pasa a "Por cobrar"
// Devuelve SOLO el texto de sistema de unas observaciones (rastro de progreso:
// "✅ ... completada por ...", "Sigue:", "Pasado por", etc.), quitando la nota
// humana que escribió Mikaela. Espejo inverso de _extraerNotaRecepcion del frontend:
// lo que el recuadro "Nota Especial" mostraría como nota, acá se descarta, para que
// la nota NO se arrastre a la siguiente staff cuando la clienta pasa de área.
function _soloTextoSistemaObs(obs) {
  var s = String(obs == null ? '' : obs).trim();
  if (!s) return '';
  var partes = s.split(/\s*\|\s*|\n+/);
  var sys = [/^✅/, /^Continuaci/i, /^Pasad[oa] por/i, /^Servicio adicional/i, /^Devuelt[oa]/i, /durante atenci/i, /termin[oó] su parte/i];
  var keep = [];
  for (var i = 0; i < partes.length; i++) {
    var p = partes[i].trim();
    if (!p) continue;
    for (var j = 0; j < sys.length; j++) { if (sys[j].test(p)) { keep.push(p); break; } }
  }
  return keep.join(' | ');
}

// ── Helper de escritura en batch ────────────────────────────────────────
// Reemplaza múltiples ws.getRange(row, col).setValue(val) en secuencia
// (cada uno = 1 round-trip HTTP ~150-300ms) por escrituras agrupadas por fila
// que se consolidan al final en rangos contiguos usando setValues().
//
// Uso:
//   const bw = _batchWriter_(ws);
//   bw.set(row, col, value);   // acumular
//   bw.flush();                 // escribir todo de una vez
//
// Impacto: una función con 10 setValue individuales dispersos en 1 fila
// pasa de ~1500ms a ~150ms (1 sola llamada de sheets en vez de 10).
function _batchWriter_(sheet) {
  var _pending = {}; // key = 'row' → { col → value }
  return {
    set: function(row, col, value) {
      if (!_pending[row]) _pending[row] = {};
      _pending[row][col] = value;
    },
    flush: function() {
      var rows = Object.keys(_pending).map(Number).sort(function(a,b){ return a-b; });
      rows.forEach(function(row) {
        var cols = Object.keys(_pending[row]).map(Number).sort(function(a,b){ return a-b; });
        if (cols.length === 0) return;
        // Agrupar columnas contiguas en un solo setValues
        var groups = [];
        var start = cols[0], prev = cols[0], group = [cols[0]];
        for (var c = 1; c < cols.length; c++) {
          if (cols[c] === prev + 1) {
            group.push(cols[c]);
            prev = cols[c];
          } else {
            groups.push({ start: start, cols: group });
            start = cols[c]; prev = cols[c]; group = [cols[c]];
          }
        }
        groups.push({ start: start, cols: group });
        groups.forEach(function(g) {
          var vals = g.cols.map(function(c){ return _pending[row][c]; });
          if (g.cols.length === 1) {
            sheet.getRange(row, g.start).setValue(vals[0]);
          } else {
            sheet.getRange(row, g.start, 1, g.cols.length).setValues([vals]);
          }
        });
      });
      _pending = {};
    }
  };
}

function handleFinalizarAtencion(data) {
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();
    const codigoRow = String(allData[i][3] || '').trim();

    // Excluir tickets con fecha 1899
    const fechaBruta = allData[i][1];
    const esFechaValida = fechaBruta instanceof Date && fechaBruta.getFullYear() > 2000;
    if (!esFechaValida) continue;
    // Acepta 'en servicio'/'pendiente-staff' y también 'asignada': si la staff terminó pero
    // el ticket no se volteó a 'en servicio' (promo asignada por Mikaela), igual lo finaliza.
    // Sigue protegido por el match de id o nombre+código+staff de abajo (no agarra otro ticket).
    if (estado !== 'en servicio' && estado !== 'pendiente-staff' && estado !== 'asignada') continue;

    // PRIORIDAD 1: buscar por ID exacto (evita confundir tickets de la misma clienta)
    const matchId = data.idEspera && id === String(data.idEspera).trim();
    // PRIORIDAD 2: fallback por nombre/código + staff (para tickets sin idEspera)
    const matchNombre = nombre === data.clienteNombre;
    const matchCodigo = data.clienteCodigo && codigoRow === String(data.clienteCodigo).trim();
    const matchStaff = tomadaPor.toLowerCase() === String(data.chicaNombre || '').toLowerCase();
    const matchFallback = matchStaff && (matchNombre || matchCodigo);

    if (!matchId && !matchFallback) continue;
      const row = i + 1;
      const bw = _batchWriter_(ws); // batch all writes — flush once at the end

      // espejo Lineas: el servicio actual queda 'completado'.
      // FIX: pasar idEspera para match exacto por ticketRef (evita tocar línea incorrecta
      // si la misma clienta tiene dos servicios del mismo área en el día)
      try {
        marcarLineaCompletadaPorCodigo(
          codigoRow,
          String(data.idEspera || ''),
          String(data.areaCompletada || data.area || '').toLowerCase(),
          data.servicio || data.promoNombre || ''
        );
      } catch (eLn) { Logger.log('espejo finalizarAtencion Lineas: ' + eLn); }

      bw.set(row, 13, data.total || '0'); // M: total inicial

      if (data.nuevaArea && !data.esRetiro && !data.siguientePromo) {
        const nuevaAreaLower = String(data.nuevaArea).toLowerCase();
        const obsActual2 = _soloTextoSistemaObs(String(allData[i][11] || ''));
        const nuevaObs2 = (obsActual2 ? obsActual2 + ' | ' : '') + '\u2705 ' + (data.areaCompletada || '') + ' completado por ' + data.chicaNombre + ' \u00b7 Sigue: ' + data.areasFaltantes;
        bw.set(row, 6,  data.servicio || data.servicioSiguiente || '');
        bw.set(row, 7,  nuevaAreaLower);
        bw.set(row, 9,  'Esperando');
        bw.set(row, 10, '');
        bw.set(row, 12, nuevaObs2);
        bw.set(row, 13, data.total || '0');

      } else if (data.esRetiro) {
        bw.set(row, 6,  data.servicio || '');
        bw.set(row, 14, '');
        bw.set(row, 15, '');
        bw.set(row, 16, data.total || '0');
        bw.set(row, 17, '');

      } else if (data.siguientePromo) {
        const sigArea = String(data.siguientePromoArea || '').toLowerCase() || 'cejas';
        bw.set(row, 6,  data.siguientePromo);
        bw.set(row, 7,  sigArea);
        bw.set(row, 9,  'Esperando');
        bw.set(row, 10, '');
        bw.set(row, 14, data.siguientePromo);
        bw.set(row, 15, data.siguientePromoPrecio || '0');

        let regularVal = data.siguientePromoRegular || data.siguientePromoPrecio || '0';
        try {
          const regularSiguiente = Number(data.siguientePromoRegular || data.siguientePromoPrecio || 0);
          const regularExistente = Number(allData[i][15] || 0);
          const regularAhora     = Number(data.precioRegular || data.total || 0);
          const totalRegular = regularExistente + regularSiguiente;
          regularVal = totalRegular > 0 ? totalRegular : (regularAhora + regularSiguiente);
        } catch(eR) {}
        bw.set(row, 16, regularVal);
        bw.set(row, 22, data.promasExtraRestantes ? JSON.stringify(data.promasExtraRestantes) : '');

        if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
          try {
            let desgloseExistente = [];
            const colS = allData[i][18];
            if (colS) { try { desgloseExistente = JSON.parse(colS); } catch(eJ) {} }
            const nuevoDesglose = [...desgloseExistente];
            data.serviciosDetalle.forEach(function(nuevo) {
              if (!nuevoDesglose.some(function(ex){ return ex.staff === nuevo.staff && ex.servicio === nuevo.servicio; })) nuevoDesglose.push(nuevo);
            });
            bw.set(row, 19, JSON.stringify(nuevoDesglose));
            bw.set(row, 13, nuevoDesglose.reduce(function(s, d){ return s + Number(d.monto || 0); }, 0));
          } catch(eD) {}
        }

      } else {
        // Finalizar: pasa a "Por verificar"
        bw.set(row, 9, 'Por verificar');
        try { _avisarMikaelaClientaLista((data && (data.clienteNombre || data.clientName)) || '', (data && (data.servicio || data.promoNombre)) || ''); } catch(e){}
        if (data.promoNombre) bw.set(row, 14, data.promoNombre);
        if (data.servicio)    bw.set(row, 6,  data.servicio);

        let totalFinal = Number(data.total || 0);
        if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
          let desgloseExistente = [];
          const colS = allData[i][18];
          if (colS) { try { desgloseExistente = JSON.parse(colS); } catch(e) {} }
          const totalExistente = desgloseExistente.reduce((s, d) => s + Number(d.monto || 0), 0);
          const totalNuevo = data.serviciosDetalle.reduce((s, d) => s + Number(d.monto || 0), 0);
          if (totalExistente > 0) totalFinal = totalExistente + totalNuevo;
          bw.set(row, 13, totalFinal);
        }
        bw.set(row, 15, data.precioRegular || data.total || '0');
        cerrarAtencion(data.idEspera, data.chicaNombre, data.clienteNombre, data.servicio, totalFinal, '', 'Por cobrar');
      }

      // Desglose multi-staff col S (19)
      if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
        try {
          let desgloseExistente = [];
          const colS = allData[i][18];
          if (colS) { try { desgloseExistente = JSON.parse(colS); } catch(e) {} }
          const nuevoDesglose = [...desgloseExistente];
          data.serviciosDetalle.forEach(nuevo => {
            if (!nuevoDesglose.some(ex => ex.staff === nuevo.staff && ex.servicio === nuevo.servicio)) nuevoDesglose.push(nuevo);
          });
          bw.set(row, 19, JSON.stringify(nuevoDesglose));
        } catch(e) {}
      }

      bw.flush(); // UNA tanda de escrituras — antes eran 30 llamadas individuales

      // Cerrar autorizaciones pendientes
      try {
        const wsAuth = getSheet('Autorizaciones');
        if (wsAuth) {
          const authData = wsAuth.getDataRange().getValues();
          const authBw = _batchWriter_(wsAuth);
          for (let j = 1; j < authData.length; j++) {
            if (String(authData[j][3]||'').trim() === data.clienteNombre &&
                String(authData[j][5]||'').trim() === data.chicaNombre &&
                ['aprobado','pendiente'].indexOf(String(authData[j][10]||'').toLowerCase()) >= 0) {
              authBw.set(j + 1, 11, 'completada');
            }
          }
          authBw.flush();
        }
      } catch(eAuth) {}

      return { success: true };
  }
  return { success: false, message: 'Atención no encontrada' };
}

// Dashboard completo de Mikaela: esperando + en servicio + por cobrar

// ============================================================
// handleGetListaCompleta — INCIDENCIA 02 — Lee desde LINEAS
// Fuente única: getTableroLineas()
// Reconstruye areas[] para TM agrupando por grupo_id (promoRef sin :N)
// Reconstruye secuencia[] ordenando por sufijo :1,:2,:3
// Fallback automático a handleGetListaCompleta_LEGACY si Lineas falla
// Rollback manual: en case 'getListaCompleta' cambiar a handleGetListaCompleta_LEGACY
// Autor: migración LINEAS — INCIDENCIA 02 — 2026-07-07
// ============================================================
function handleGetListaCompleta() {
  try {
    var tablero = getTableroLineas();
    if (!tablero || typeof tablero !== 'object') {
      throw new Error('getTableroLineas no devolvió objeto válido');
    }

    var tz = 'America/Guayaquil';

    // ── helpers internos ────────────────────────────────────────────────────

    // Normalizar estado Lineas (snake_case) al formato que espera el frontend (con espacio)
    function _normEstado(e) {
      var s = String(e || '').toLowerCase().trim();
      if (s === 'en_servicio') return 'en servicio';
      if (s === 'por_cobrar')  return 'por cobrar';
      return s; // 'esperando', 'completado', 'cobrado', 'anulado' — ya correctos
    }

    // Parsear grupo_id y areaIdx desde promoRef
    // 'TM-372:1' → { grupoId:'TM-372', areaIdx:1, prefijo:'TM' }
    // 'SP-240'   → { grupoId:'SP-240', areaIdx:0, prefijo:'SP' }
    function _parseRef(promoRef) {
      var ref = String(promoRef || '').trim();
      var grupoId = ref, areaIdx = 0;
      if (ref.indexOf(':') >= 0) {
        var p = ref.split(':');
        grupoId = p[0];
        areaIdx = parseInt(p[1]) || 1;
      }
      var prefijo = grupoId.split('-')[0] || '';
      return { grupoId: grupoId, areaIdx: areaIdx, prefijo: prefijo };
    }

    // Formatear fecha/hora desde valor de Lineas
    function _fmt(val, tipo) {
      if (!val) return '';
      if (val instanceof Date) {
        return Utilities.formatDate(val, tz, tipo === 'fecha' ? 'dd/MM/yyyy' : 'HH:mm');
      }
      var s = String(val);
      if (tipo === 'hora' && s.length > 5 && s.indexOf('T') >= 0) {
        try { return Utilities.formatDate(new Date(s), tz, 'HH:mm'); } catch(e) {}
      }
      return s;
    }

    // Construir objeto base desde una línea de Lineas (para SN/SP/LE)
    function _lineaAItem(l, clientesMap) {
      var parsed = _parseRef(l.promoRef);
      var prefijo = parsed.prefijo;
      var idEspera = parsed.grupoId;
      var fuente = prefijo === 'TM' ? 'TicketMulti'
                 : prefijo === 'SP' ? 'ServicioPromo'
                 : prefijo === 'SN' ? 'ServicioNormal'
                 : 'ListaEspera';
      var esPromo = (prefijo === 'SP' || prefijo === 'TM');
      var cliData = clientesMap[String(l.codigo || '').trim()] || {};
      // Enriquecer observaciones por área
      var obsLinea = String(l.obs || l.observaciones || '');
      if (!obsLinea) {
        var areaLow = String(l.area || '').toLowerCase();
        obsLinea = areaLow.indexOf('ceja')    >= 0 ? (cliData.obsCejas      || '')
                 : areaLow.indexOf('depilac') >= 0 ? (cliData.obsDepilacion || '')
                 : areaLow.indexOf('pesta')   >= 0 ? (cliData.obsPestanas   || '')
                 : areaLow.indexOf('facial')  >= 0 ? (cliData.obsFacial     || '')
                 : (cliData.obsGeneral || '');
      }
      return {
        idEspera      : idEspera,
        fecha         : _fmt(l.fecha, 'fecha'),
        horaLlegada   : '',          // no en Lineas — solo visual
        codigo        : String(l.codigo   || ''),
        nombre        : String(l.cliente  || ''),
        servicio      : String(l.servicio || ''),
        area          : String(l.area     || ''),
        prioridad     : 'Normal',    // no en Lineas — default
        tomadaPor     : String(l.staff    || ''),
        horaToma      : _fmt(l.horaToma || l.hora, 'hora'),
        observaciones : obsLinea,
        total         : Number(l.monto || 0),
        promoNombre   : esPromo ? (l.promoNombre || l.comboNombre || String(l.servicio || '')) : '',
        precioRegular : Number(l.montoRegular || l.monto || 0),
        secuencia     : [],
        serviciosDetalle: null,
        promasExtra   : [],
        esTop         : !!(cliData.esTop),
        fuente        : fuente,
        estado        : _normEstado(l.estado),
        areaIdx       : parsed.areaIdx,
        pendienteConfirmacion: false,
        areas         : []
      };
    }

    // ── Cargar mapa de Clientas (esTop + obs por área) ───────────────────────
    var clientesMap = {};
    try {
      var wsC = getSheet('Clientas');
      var cData = wsC.getDataRange().getValues();
      for (var ci = 3; ci < cData.length; ci++) {
        var cod = String(cData[ci][0] || '').trim();
        if (!cod) continue;
        clientesMap[cod] = {
          esTop         : String(cData[ci][7]  || '').toLowerCase().indexOf('sí') >= 0,
          obsGeneral    : String(cData[ci][9]  || ''),
          obsCejas      : String(cData[ci][12] || ''),
          obsDepilacion : String(cData[ci][13] || ''),
          obsPestanas   : String(cData[ci][14] || ''),
          obsFacial     : String(cData[ci][15] || '')
        };
      }
    } catch(eC) {
      Logger.log('[getListaCompleta] error Clientas: ' + eC);
    }

    var esperando   = [];
    var enServicio  = [];
    var porCobrar   = [];
    var completadas = [];

    // ── Función principal de procesamiento por grupo de líneas ────────────────
    // Para TM: agrupa todas las líneas del mismo grupo_id y reconstruye areas[]
    // Para SP/SN/LE: procesa cada línea individualmente
    function _procesarLineas(lineas, destArray) {
      // Separar TM del resto
      var tmGrupos = {};  // grupoId → [lineas]
      var resto    = [];

      lineas.forEach(function(l) {
        var parsed = _parseRef(l.promoRef);
        if (parsed.prefijo === 'TM') {
          if (!tmGrupos[parsed.grupoId]) tmGrupos[parsed.grupoId] = [];
          tmGrupos[parsed.grupoId].push({ linea: l, areaIdx: parsed.areaIdx });
        } else {
          resto.push(l);
        }
      });

      // Procesar SN/SP/LE — mapeo 1:1
      var idsAgregados = new Set();
      resto.forEach(function(l) {
        var parsed = _parseRef(l.promoRef);
        var key = parsed.grupoId || (String(l.codigo||'') + '|' + String(l.staff||''));
        if (idsAgregados.has(key)) return;
        idsAgregados.add(key);
        destArray.push(_lineaAItem(l, clientesMap));
      });

      // Procesar TM — reconstruir areas[] por grupo
      Object.keys(tmGrupos).forEach(function(grupoId) {
        var entradas = tmGrupos[grupoId];

        // Ordenar por areaIdx (:1, :2, :3) → secuencia natural
        entradas.sort(function(a, b) { return a.areaIdx - b.areaIdx; });

        // Usar la primera línea como base del item
        var lineaBase = entradas[0].linea;
        var cliData   = clientesMap[String(lineaBase.codigo || '').trim()] || {};

        // Reconstruir areas[]
        var areas = entradas.map(function(e) {
          var l = e.linea;
          return {
            idx          : e.areaIdx,
            area         : String(l.area     || ''),
            tentativo    : String(l.servicio || ''),   // en Lineas servicio = confirmado
            confirmado   : String(l.servicio || ''),
            staff        : String(l.staff    || ''),
            estado       : _normEstado(l.estado),
            hora         : _fmt(l.horaToma || l.hora, 'hora'),
            precio       : Number(l.monto        || 0),
            precioNormal : Number(l.montoRegular || l.monto || 0)
          };
        });

        // Reconstruir secuencia[] desde el orden de áreas (sufijo :1,:2,:3)
        var secuencia = areas.map(function(a) { return String(a.area || ''); })
                            .filter(Boolean);

        // tomadaPor = staff de áreas en servicio, o todas si completado
        var staffEnServicio = areas
          .filter(function(a) { return a.estado === 'en servicio'; })
          .map(function(a) { return a.staff; })
          .filter(Boolean);
        var tomadaPor = staffEnServicio.length > 0
          ? staffEnServicio.join(', ')
          : areas.map(function(a){ return a.staff; }).filter(Boolean).join(', ') || '—';

        // total = suma de precios de áreas activas
        var totalTM = areas.reduce(function(s, a) {
          return s + (a.estado !== 'cancelado' ? Number(a.precio || 0) : 0);
        }, 0);
        var regularTM = areas.reduce(function(s, a) {
          return s + (a.estado !== 'cancelado' ? Number(a.precioNormal || 0) : 0);
        }, 0);

        // servicio = resumen de áreas (ej: 'pestanas 🔄 Diana | depilacion ⏳')
        var resumenAreas = areas.map(function(a) {
          var est = a.estado;
          if (est === 'completado')  return (a.tentativo || a.area) + ' ✅ ' + (a.staff || '');
          if (est === 'en servicio') return (a.tentativo || a.area) + ' 🔄 ' + (a.staff || '');
          return (a.tentativo || a.area) + ' ⏳';
        }).join(' | ');

        // observaciones: usar obs de la primera línea o Clientas
        var obsBase = String(lineaBase.obs || lineaBase.observaciones || '');
        if (!obsBase) obsBase = cliData.obsGeneral || '';

        destArray.push({
          idEspera      : grupoId,
          fecha         : _fmt(lineaBase.fecha, 'fecha'),
          horaLlegada   : '',
          codigo        : String(lineaBase.codigo  || ''),
          nombre        : String(lineaBase.cliente || ''),
          servicio      : resumenAreas,
          area          : 'multi',
          prioridad     : 'Normal',
          tomadaPor     : tomadaPor,
          horaToma      : _fmt(lineaBase.horaToma || lineaBase.hora, 'hora'),
          observaciones : obsBase,
          total         : totalTM,
          promoNombre   : lineaBase.promoNombre || lineaBase.comboNombre || String(lineaBase.servicio || ''),
          precioRegular : regularTM,
          secuencia     : secuencia,
          serviciosDetalle: null,
          promasExtra   : [],
          esTop         : !!(cliData.esTop),
          fuente        : 'TicketMulti',
          estado        : 'multi',
          areaIdx       : entradas[0].areaIdx,
          pendienteConfirmacion: false,
          areas         : areas
        });
      });
    }

    // ── Procesar cada sección del tablero ────────────────────────────────────
    _procesarLineas(tablero.esperando    || [], esperando);
    _procesarLineas(tablero.en_servicio  || [], enServicio);
    _procesarLineas(tablero.porVerificar || [], completadas);  // completadas = por verificar
    _procesarLineas(tablero.porCobrar    || [], porCobrar);

    Logger.log('[getListaCompleta] fuente=LINEAS esp=' + esperando.length
      + ' srv=' + enServicio.length
      + ' cob=' + porCobrar.length
      + ' comp=' + completadas.length);

    // ── PASO 2 (M-02): guardia de datos incompletos → fallback a LEGACY ──────
    // Si algún ticket ACTIVO (esperando / en servicio / por cobrar) reconstruido
    // desde LINEAS viene sin nombre o sin código, NO servimos el tablero de
    // LINEAS: caemos a LEGACY (ListaEspera/SN/SP/TM) donde esos campos existen.
    // Empty (0 tickets) no dispara: filter sobre arrays vacíos no marca nada.
    var _activosLC = [].concat(esperando, enServicio, porCobrar);
    var _incompletosLC = _activosLC.filter(function (t) {
      return !String((t && t.nombre) || '').trim()
          || !String((t && t.codigo) || '').trim();
    });
    if (_incompletosLC.length > 0) {
      Logger.log('[getListaCompleta] datos incompletos: ' + _incompletosLC.length
        + '/' + _activosLC.length + ' tickets activos sin nombre/código — FALLBACK a LEGACY. '
        + 'ids: ' + _incompletosLC.map(function (t) { return t.idEspera; }).join(', '));
      return handleGetListaCompleta_LEGACY();
    }

    return {
      success: true,
      esperando:   esperando,
      enServicio:  enServicio,
      porCobrar:   porCobrar,
      completadas: completadas
    };

  } catch(eLn) {
    Logger.log('[getListaCompleta] FALLBACK legacy — error Lineas: ' + eLn);
    return handleGetListaCompleta_LEGACY();
  }
}

function handleGetListaCompleta_LEGACY() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const esperando = [];
  const enServicio = [];
  const porCobrar = [];
  const completadas = [];

  // Cargar TOP map
  let topMap = {};
  try {
    const wsC = getSheet('Clientas');
    const cData = wsC.getDataRange().getValues();
    for (let i = 3; i < cData.length; i++) {
      if (String(cData[i][7] || '').toLowerCase().includes('sí')) topMap[cData[i][0]] = true;
    }
  } catch(e) {}

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase().trim();
    const codigo = row[3];
    const esTop = topMap[codigo] || false;

    // Formatear horas para el panel en vivo de Mikaela
    let horaLlegadaStr = '';
    if (row[2] instanceof Date) {
      horaLlegadaStr = Utilities.formatDate(row[2], 'America/Guayaquil', 'HH:mm');
    } else {
      horaLlegadaStr = String(row[2] || '');
    }
    let horaTomadaStr = '';
    if (row[10] instanceof Date) {
      horaTomadaStr = Utilities.formatDate(row[10], 'America/Guayaquil', 'HH:mm');
    } else {
      horaTomadaStr = String(row[10] || '');
    }

    const item = {
      idEspera: id,
      fecha: row[1],
      horaLlegada: horaLlegadaStr,
      codigo: codigo,
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      prioridad: row[7],
      tomadaPor: row[9] || '',
      horaToma: horaTomadaStr,
      observaciones: row[11] || '',
      total: row[12] || '0',
      promoNombre: row[13] || '',
      precioRegular: row[15] || row[14] || row[12] || '0',  // P=precioRegular acum., O=precioPromo, M=total
      secuencia: (function(){ try { return JSON.parse(row[16] || '[]'); } catch(e) { return []; } })(),
      serviciosDetalle: (function(){ try { return row[18] ? JSON.parse(row[18]) : null; } catch(e) { return null; } })(),
      promasExtra: (function(){ try { return JSON.parse(row[17] || '[]'); } catch(e) { return []; } })(), // col R = promasExtra (2a y 3a promo)
      esTop: esTop
    };

    // Excluir tickets ESPERANDO con fecha inválida (1899 = bug de fecha)
    // Tickets en servicio NO se excluyen — el servicio es real aunque la fecha esté mal
    const fechaTicket = row[1];
    const esTicketValido = fechaTicket instanceof Date && fechaTicket.getFullYear() > 2000;
    if (!esTicketValido && (estado === 'esperando' || estado === 'asignada')) continue;

    if (estado === 'esperando' || estado === 'asignada') esperando.push(item);
    else if (estado === 'en servicio') enServicio.push(item);
    else if (estado === 'pendiente-staff') {
      enServicio.push({ ...item, pendienteConfirmacion: true });
    }
    else if (estado === 'por cobrar') porCobrar.push(item);
    else if (estado === 'por verificar') completadas.push(item);
  }

  // Merge con ServicioNormal y ServicioPromo
  try {
    const snResult = handleGetServicioNormal({});
    if (snResult.success) {
      esperando.push(...snResult.esperando);
      enServicio.push(...snResult.enServicio);
      porCobrar.push(...snResult.porCobrar);
      completadas.push(...(snResult.porVerificar || []));
    }
  } catch(e) {}
  try {
    const spResult = handleGetServicioPromo({});
    if (spResult.success) {
      esperando.push(...spResult.esperando);
      enServicio.push(...spResult.enServicio);
      porCobrar.push(...spResult.porCobrar);
      completadas.push(...(spResult.porVerificar || []));
    }
  } catch(e) {}

  // Merge con TicketMulti
  try {
    const tmR = handleGetTicketMulti({});
    if (tmR.success) {
      // Áreas en espera → esperando
      (tmR.activos || []).forEach(function(tm) {
        var tieneEnServicio = false;
        (tm.areas || []).forEach(function(a) {
          if (String(a.estado || '').toLowerCase() === 'en servicio') tieneEnServicio = true;
        });
        // Si algún área está en servicio, mostrar en enServicio
        if (tieneEnServicio) {
          var resumenAreas = (tm.areas || []).map(function(a) {
            var est = String(a.estado||'').toLowerCase();
            if (est === 'completado') return (a.tentativo||a.area) + ' ✅ ' + (a.staff||'');
            if (est === 'en servicio') return (a.tentativo||a.area) + ' 🔄 ' + (a.staff||'');
            return (a.tentativo||a.area) + ' ⏳';
          }).join(' | ');
          // FIX: calcular total como suma de precios actuales de cada área (no precioPromo estático)
          var totalActualTM = (tm.areas || []).reduce(function(s, a) { return s + Number(a.precio || 0); }, 0);
          if (totalActualTM === 0) totalActualTM = tm.precioPromo; // fallback
          enServicio.push({
            idEspera:  tm.idEspera, codigo: tm.codigo, nombre: tm.nombre,
            servicio:  resumenAreas, area: 'multi',
            tomadaPor: (tm.areas||[]).filter(function(a){ return a.staff && String(a.estado||'').toLowerCase()==='en servicio'; }).map(function(a){return a.staff;}).join(', ') || '—',
            total: totalActualTM, estado: tm.estado,
            horaToma: (tm.areas[0] && tm.areas[0].hora) ? tm.areas[0].hora : '',
            areas: tm.areas, secuencia: tm.secuencia || [],
            fuente: 'TicketMulti'
          });
        } else {
          // Todo en espera — solo la próxima según secuencia
          var areasEsp = (tm.areas || []).filter(function(a) { return String(a.estado||'').toLowerCase() === 'esperando'; });
          if (areasEsp.length > 0) {
            var proxA = null;
            if (tm.secuencia && tm.secuencia.length > 0) {
              for (var si2 = 0; si2 < tm.secuencia.length; si2++) {
                var sa = String(tm.secuencia[si2]).toLowerCase();
                var ma = areasEsp.filter(function(a){ return String(a.area||'').toLowerCase() === sa; })[0];
                if (ma) { proxA = ma; break; }
              }
            }
            if (!proxA) proxA = areasEsp[0];
            // Modelo centralizado: si un área en espera ya tiene staff asignada, priorizarla
            var areaAsignadaTM = areasEsp.filter(function(a){ return a.staff && String(a.staff).trim() !== ''; })[0];
            if (areaAsignadaTM) proxA = areaAsignadaTM;
            esperando.push({
              idEspera:  tm.idEspera, codigo: tm.codigo, nombre: tm.nombre,
              servicio:  proxA.tentativo || 'Multi-servicio', area: proxA.area || 'multi',
              tomadaPor: (proxA.staff || ''), total: proxA.precio || 0, estado: 'Esperando',
              fuente: 'TicketMulti', areaIdx: proxA.idx,
              areas: tm.areas, secuencia: tm.secuencia || []
            });
          }
        }
      });
      // Por cobrar
      (tmR.porCobrar || []).forEach(function(tm) {
        porCobrar.push({
          idEspera:     tm.idEspera,
          codigo:       tm.codigo,
          nombre:       tm.nombre,
          servicio:     'Multi (' + tm.areas.length + ' servicios)',
          area:         'multi',
          tomadaPor:    (tm.areas || []).map(function(a){return a.staff;}).filter(Boolean).join(', '),
          total:        tm.precioPromo,
          precioRegular: tm.precioNormal,
          areas:        tm.areas,
          fuente:       'TicketMulti',
          esTop:        false
        });
      });
      // Áreas completadas pendientes de verificación → completadas
      (tmR.porVerificar || []).forEach(function(tm) {
        completadas.push({
          idEspera:      tm.idEspera,
          codigo:        tm.codigo,
          nombre:        tm.nombre,
          servicio:      'Multi (' + tm.areas.length + ' servicios)',
          area:          'multi',
          tomadaPor:     (tm.areas || []).map(function(a){return a.staff;}).filter(Boolean).join(', '),
          total:         tm.precioPromo,
          precioRegular: tm.precioNormal,
          areas:         tm.areas,
          fuente:        'TicketMulti',
          esTop:         false
        });
      });
    }
  } catch(e) {}

  return { success: true, esperando: esperando, enServicio: enServicio, porCobrar: porCobrar, completadas: completadas };
}

// Mikaela ve las clientas listas para cobrar
function handleGetPorCobrar() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const porCobrar = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    // Incluir tanto 'por cobrar' como tickets completados con metodoPago 'pendiente cobro final'
    const esPorCobrar = estado === 'por cobrar';
    const esPendienteCobro = estado === 'completada' && String(row[15] || '').toLowerCase().includes('pendiente');
    if (!esPorCobrar && !esPendienteCobro) continue;

    porCobrar.push({
      idEspera: id,
      codigo: row[3],
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      tomadaPor: row[9],
      total: row[12] || '0',
      promoNombre: row[13] || '',
      precioRegular: row[15] || row[14] || row[12] || '0',  // col P=precioRegular, O=precioPromo, M=total
      secuencia: (function(){ try { return JSON.parse(row[16] || '[]'); } catch(e) { return []; } })(),
      serviciosDetalle: (function(){ try { return row[18] ? JSON.parse(row[18]) : null; } catch(e) { return null; } })(),
      esTop: false
    });
  }

  // Buscar TOP
  try {
    const wsC = getSheet('Clientas');
    const cData = wsC.getDataRange().getValues();
    const topMap = {};
    for (let i = 3; i < cData.length; i++) {
      if (String(cData[i][7] || '').toLowerCase().includes('sí')) topMap[cData[i][0]] = true;
    }
    porCobrar.forEach(p => { if (topMap[p.codigo]) p.esTop = true; });
  } catch(e) {}

  // Merge con ServicioNormal
  try {
    const snR = handleGetServicioNormal({});
    if (snR.success) {
      snR.porCobrar.forEach(sn => {
        porCobrar.push({
          idEspera      : sn.idEspera,
          codigo        : sn.codigo,
          nombre        : sn.nombre,
          servicio      : sn.servicio,
          area          : sn.area,
          tomadaPor     : sn.tomadaPor,
          total         : sn.tipo === 'SP' ? sn.precioPromo : sn.precioNormal,
          promoNombre   : sn.promoNombre,
          precioRegular : sn.precioNormal,
          tipo          : sn.tipo,
          serviciosDetalle: null,
          esTop         : false
        });
      });
    }
  } catch(e) {}

  // Merge con ServicioPromo
  try {
    const spR = handleGetServicioPromo({});
    if (spR.success) {
      spR.porCobrar.forEach(sp => {
        // Construir desglose: si ya viene del ticket (multi-staff), usarlo directamente.
        // Si no (promo de una sola área), construir uno sintético con los datos del ticket.
        let desgloseUsar = sp.serviciosDetalle;
        if (!desgloseUsar || desgloseUsar.length === 0) {
          const montoArea = Number(sp.precioMiArea || sp.total || sp.precioPromo || 0);
          if (montoArea > 0 && sp.tomadaPor) {
            desgloseUsar = [{ staff: sp.tomadaPor, servicio: sp.servicio, area: sp.area, monto: montoArea }];
          }
        }
        porCobrar.push({
          idEspera      : sp.idEspera,
          codigo        : sp.codigo,
          nombre        : sp.nombre,
          servicio      : sp.servicio,
          area          : sp.area,
          tomadaPor     : sp.tomadaPor,
          total         : sp.total || sp.precioPromo || sp.precioNormal, // col M = precio de esta área
          promoNombre   : sp.promoNombre,
          precioRegular : sp.precioNormal,  // col T = precio normal total
          tipo          : sp.tipo || 'SP',
          serviciosDetalle: desgloseUsar || null,
          esTop         : false
        });
      });
    }
  } catch(e) {}

  return { success: true, porCobrar: porCobrar };
}

// ============================================
// CONTINUAR PROMO: La chica terminó su parte, devolver a lista para la siguiente área
// ============================================
function handleContinuarPromoALista(data) {
  const now = new Date();
  const horaStr  = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
  const fechaStr = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const idEspera = String(data.idEspera || '').trim();

  // Detectar fuente: SP- → ServicioPromo, SN- → ServicioNormal, LE- → ListaEspera
  if (idEspera.startsWith('SP-') || idEspera.startsWith('SN-')) {
    const sheetName  = idEspera.startsWith('SP-') ? 'ServicioPromo' : 'ServicioNormal';
    const COLS       = idEspera.startsWith('SP-') ? COLS_PROMO : COLS_NORMAL;
    const ws         = getOrCreateSheet(sheetName, COLS);
    const allData    = ws.getDataRange().getValues();

    for (let i = 1; i < allData.length; i++) {
      const id     = String(allData[i][0] || '').trim();
      const estado = String(allData[i][8] || '').toLowerCase();
      if (id !== idEspera) continue;
      if (estado !== 'en servicio') continue;

      const row = i + 1;
      // Marcar como completada parcial (continuará en otra área)
      ws.getRange(row, 9).setValue('Completada-parcial');
      ws.getRange(row, 10).setValue(data.chicaNombre || '');
      // Usar montoChica del frontend (precio de SU área), no el total acumulado de col M
      const montoChica = Number(data.montoChica || 0) || Number(allData[i][12] || 0);
      ws.getRange(row, 13).setValue(montoChica);

      // Registrar comisión de esta chica
      if (montoChica > 0) { try { updateComision(data.chicaNombre, montoChica); } catch(e) {} }

      // FIX: espejo a Lineas para que la staff vea esta clienta en su historial de hoy.
      // handleGetServiciosHoy lee de getTableroLineas() que solo ve estados completado/cobrado/en_servicio.
      // Antes solo se escribía en HistorialOwner (que el owner ve) pero no en Lineas,
      // entonces la staff que pasó la clienta a otra área no veía nada en su panel.
      try {
        marcarLineaCompletadaPorCodigo(
          String(allData[i][3] || ''),  // codigo cliente
          idEspera,                      // promoRef del ticket original
          String(allData[i][6] || '').toLowerCase(), // area
          data.areaCompletada || '',
          data.chicaNombre || ''
        );
      } catch(eLnCP) { Logger.log('espejo Lineas continuarPromo: ' + eLnCP); }

      // Escribir en HistorialOwner
      try {
        const areaStr = String(allData[i][6] || '').toLowerCase();
        const pct = areaStr.includes('facial') ? 0.4 : 0.3;
        const wsH = getSheet('HistorialOwner');
        wsH.appendRow([fechaStr, horaStr, allData[i][3], allData[i][4], '',
          data.areaCompletada + ' (parte de promo)', allData[i][6], data.chicaNombre,
          montoChica, Math.round(montoChica * pct * 100) / 100, 'Pendiente cobro final']);
      } catch(e) {}

      // Crear nuevo registro SP- para la siguiente área
      const newId = getNextIdPromo();
      const precioNormal = Number(allData[i][idEspera.startsWith('SP-') ? 19 : 19] || allData[i][15] || 0);
      const precioPromo  = Number(allData[i][idEspera.startsWith('SP-') ? 20 : 20] || allData[i][14] || 0);
      const obsActual    = String(allData[i][11] || '');
      const areasYaCompletadas = [data.areaCompletada].filter(Boolean);
      const nuevaObs     = (obsActual ? obsActual + ' | ' : '') +
        '✅ ' + data.areaCompletada + ' completada por ' + data.chicaNombre +
        ' · Falta: ' + data.areasFaltantes +
        ' · _completedAreas:' + JSON.stringify(areasYaCompletadas);
      const montoSiguiente = Number(data.montoSiguienteArea || 0);

      const wsNew = getOrCreateSheet('ServicioPromo', COLS_PROMO);

      // FIX: incluir extras de esta área en el desglose del nuevo SP.
      // Antes solo se guardaba { area, servicio, monto, staff } del área principal,
      // perdiendo los extras aprobados. Al cobrar la siguiente área, el total no
      // incluía los extras y tampoco pasaban a HistorialOwner.
      var desgloseEstaArea = [{ area: data.areaCompletada, servicio: data.servicioNombre || data.areaCompletada, monto: montoChica, staff: data.chicaNombre }];
      try {
        var desgloseChicaRaw = data.desgloseChica;
        if (desgloseChicaRaw) {
          var desgloseChicaParsed = typeof desgloseChicaRaw === 'string' ? JSON.parse(desgloseChicaRaw) : desgloseChicaRaw;
          if (Array.isArray(desgloseChicaParsed) && desgloseChicaParsed.length > 0) {
            desgloseEstaArea = desgloseChicaParsed; // ya incluye promo + extras
          }
        }
      } catch(eDG) {}

      wsNew.appendRow([
        newId, fechaStr, horaStr,
        allData[i][3], allData[i][4],       // Código, Nombre
        data.areasFaltantes || '',           // Servicio = área faltante
        data.nuevaArea || '',                // Área
        allData[i][7] || 'Normal',           // Prioridad
        'Esperando',                         // Estado
        '', '', nuevaObs,                    // Tomada por, Hora tomada, Obs
        montoSiguiente,                      // Total (precio de la siguiente área)
        data.promoNombre || allData[i][13] || '', // Promo nombre
        precioPromo, precioNormal, '',       // Precio promo, Precio regular, Área completada
        JSON.stringify(desgloseEstaArea),    // Desglose — incluye promo + extras de esta staff
        'SP', precioNormal, precioPromo      // Tipo, Precio Normal, Precio Promo
      ]);

      return { success: true, newId: newId };
    }
    return { success: false, message: 'Ticket ' + idEspera + ' no encontrado en ' + sheetName };
  }

  // Flujo original para LE-
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();

    // Buscar por ID exacto primero, fallback nombre+staff
    const matchId790 = data.idEspera && id === String(data.idEspera).trim();
    const esActivo = (estado === 'en servicio' || estado === 'pendiente-staff');
    if (!matchId790 && !(esActivo && tomadaPor === data.chicaNombre && nombre === data.clienteNombre)) continue;
    if (!esActivo) continue;
    {
      const row = i + 1;
      
      // 1. Marcar este registro como "Completada" para que la chica lo vea en su historial
      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 16).setValue('Pendiente cobro final'); // metodoPago temporal
      ws.getRange(row, 17).setValue(horaStr);
      // Priorizar montoChica del frontend (precio de SU área), luego col M del sheet
      const montoRealSheet = Number(allData[i][12] || 0);
      const montoFinalChica = Number(data.montoChica || 0) || montoRealSheet;
      ws.getRange(row, 18).setValue(String(montoFinalChica));
      
      // Actualizar servicio con lo que hizo esta chica
      ws.getRange(row, 6).setValue(data.servicioActualizado || allData[i][5]);
      
      // Registrar comisión de esta chica (usar total real del Sheet)
      const montoParaComision = montoFinalChica > 0 ? montoFinalChica : Number(data.montoChica || 0);
      if (montoParaComision > 0) {
        updateComision(data.chicaNombre, montoParaComision);
      }

      // FIX: espejo a Lineas — mismo fix que el flujo SP-/SN-
      try {
        marcarLineaCompletadaPorCodigo(
          String(allData[i][3] || ''),
          id,
          String(allData[i][6] || '').toLowerCase(),
          data.areaCompletada || '',
          data.chicaNombre || ''
        );
      } catch(eLnCPLE) { Logger.log('espejo Lineas continuarPromo LE: ' + eLnCPLE); }

      // Escribir en HistorialOwner para la parte de esta chica
      try {
        const areaStr = String(allData[i][6] || '').toLowerCase();
        const pct = areaStr.includes('facial') ? 0.4 : 0.3;
        const comision = Math.round(Number(data.montoChica) * pct * 100) / 100;
        
        const wsH = getSheet('HistorialOwner');
        wsH.appendRow([
          fechaStr, horaStr, allData[i][3], nombre, '',
          data.areaCompletada + ' (parte de promo)', allData[i][6], data.chicaNombre,
          montoParaComision || 0, Math.round(montoParaComision * pct * 100) / 100, 'Pendiente cobro final'
        ]);
      } catch(e) {}
      
      // 2. Crear NUEVO registro en lista de espera para la siguiente área
      let maxNum = 0;
      const freshData = ws.getDataRange().getValues();
      for (let j = 3; j < freshData.length; j++) {
        const jId = String(freshData[j][0] || '');
        if (jId.startsWith('LE-')) {
          const num = parseInt(jId.replace('LE-', ''));
          if (num > maxNum) maxNum = num;
        }
      }
      const newId = 'LE-' + String(maxNum + 1).padStart(4, '0');
      
      // Observaciones con historial de la promo (solo el rastro de sistema; la nota
      // humana NO se arrastra a la siguiente staff — se considera ya entregada)
      const obsActual = _soloTextoSistemaObs(String(allData[i][11] || ''));
      const nuevaObs = (obsActual ? obsActual + ' | ' : '') + '✅ ' + data.areaCompletada + ' completada por ' + data.chicaNombre + ' · Falta: ' + data.areasFaltantes;
      
      // Col M del nuevo ticket = total ACUMULADO real (lo ya hecho + la siguiente área)
      // Esto es lo que Mikaela ve como "TOTAL ACUMULADO" en el panel
      const totalEstaAreaSheet = Number(allData[i][12] || 0); // col M actual
      const montoSiguiente = Number(data.montoSiguienteArea || 0);
      const montoYaHechoReal = Number(data.montoChica || 0) || Number(data.totalAcumulado || 0) || totalEstaAreaSheet;
      // totalAcumulado = lo que hizo esta staff (incluyendo extras) + lo que hará la siguiente
      const totalNuevoTicket = String((montoYaHechoReal > 0 ? montoYaHechoReal : 0) + montoSiguiente);
      
      // Guardar también el monto real de esta área (para comisiones correctas)
      const montoChicaReal = Number(data.montoChica || 0) || (totalEstaAreaSheet > 0 ? totalEstaAreaSheet : 0);
      
      // Limpiar el nombre del servicio — quitar prefijos de historial como [✅Diana:...]
      let servicioLimpio = String(data.areasFaltantes || '');
      // Si viene con texto de historial (contiene [✅ o emoji de staff), extraer solo el nombre del servicio
      if (servicioLimpio.includes('[') || servicioLimpio.includes('✅')) {
        // Intentar extraer la parte después del | si existe
        const partes = servicioLimpio.split('|');
        servicioLimpio = partes[partes.length - 1].trim();
        // Si sigue teniendo brackets, limpiar
        servicioLimpio = servicioLimpio.replace(/\[.*?\]/g, '').trim();
      }

      // Usar hora actual como hora de llegada (allData[i][2] puede ser Date vacía → 1899)
      const horaLlegadaNueva = horaStr;
      ws.appendRow([
        newId, fechaStr, horaLlegadaNueva, allData[i][3], nombre,
        servicioLimpio + ' (continuación promo)',
        data.nuevaArea || allData[i][6],
        allData[i][7] || 'Normal',
        'Esperando', '', '', nuevaObs,
        totalNuevoTicket,
        data.promoNombre || allData[i][13] || '', // N: promoNombre (usa el que cambió la staff; si no vino, hereda del original)
        allData[i][14] || '', // O: precioRegular (hereda del original)
        '',                   // P: precioPromo (vacío, será llenado al cobrar)
        '',                   // Q: secuencia (no aplica para continuación)
        allData[i][17] || '' // R: promasExtra (hereda del original para que no se pierdan)
      ]);
      
      // Copiar el desglose al nuevo ticket (col S)
      // Combinar: desglose existente del ticket original + desglose de esta staff
      try {
        let desgloseOriginal = [];
        const colSOriginal = allData[i][18];
        if (colSOriginal) { try { desgloseOriginal = JSON.parse(String(colSOriginal)); } catch(e) {} }
        
        let desgloseEstaChica = [];
        if (data.desgloseChica) {
          try {
            desgloseEstaChica = typeof data.desgloseChica === 'string'
              ? JSON.parse(data.desgloseChica) : data.desgloseChica;
          } catch(e) {}
        }
        
        // Si no vino desglose del frontend, crear uno básico con los datos disponibles
        if (desgloseEstaChica.length === 0 && montoFinalChica > 0) {
          desgloseEstaChica = [{ 
            staff: data.chicaNombre, 
            servicio: data.servicioActualizado || data.servicio || 'Servicio', 
            area: data.areaCompletada || '', 
            monto: montoFinalChica 
          }];
        }
        
        const desgloseAcum = [...desgloseOriginal, ...desgloseEstaChica];
        if (desgloseAcum.length > 0) {
          const lastRowNew = ws.getLastRow();
          ws.getRange(lastRowNew, 19).setValue(JSON.stringify(desgloseAcum));
        }
      } catch(e) {}
      
      return { success: true };
    }
  }
  return { success: false, message: 'Atención no encontrada' };
}

// Mikaela confirma cobro → estado pasa a "Completada"
// ============================================
// ABONOS (depósitos para reservar) — se cuentan al cobrar
// Hoja Abonos: A=ID B=Fecha C=Código D=Cliente E=Monto F=Origen G=Estado H=idEspera
// Decisión del negocio: el abono NO entra a caja al registrarse; se cuenta TODO al cobrar
// (caja y comisión sobre el total completo). El abono solo se muestra y se descuenta de lo
// que la clienta entrega físicamente.
// ============================================
// Atar un código nuevo a un ticket activo (busca en las 4 hojas por ID).
// Lo usa el cobro cuando se le crea código a una clienta walk-in para
// registrarle un abono y que se descuente al cobrar.
function handleSetCodigoTicket(data) {
  try {
    const id     = String((data && data.idEspera) || '').trim();
    const codigo = String((data && data.codigo)   || '').trim();
    if (!id || !codigo) return { success:false, message:'Falta id o código.' };
    const hojas = ['ListaEspera', 'ServicioNormal', 'ServicioPromo', 'TicketMulti'];
    for (let s = 0; s < hojas.length; s++) {
      const ws = getSheet(hojas[s]);
      if (!ws) continue;
      const rows = ws.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() === id) {
          ws.getRange(i + 1, 4).setValue(codigo); // col D = código de la clienta
          return { success:true, hoja: hojas[s] };
        }
      }
    }
    return { success:false, message:'Ticket no encontrado.' };
  } catch(e){ return { success:false, message:String(e) }; }
}

function _getAbonosSheet() {
  return getOrCreateSheet('Abonos', ['ID','Fecha','Código','Cliente','Monto','Origen','Estado','idEspera']);
}
function handleRegistrarAbono(data) {
  try {
    const codigo = String((data && data.codigo) || '').trim();
    const monto  = Number((data && data.monto) || 0);
    if (!codigo)      return { success:false, message:'Falta el código de la clienta.' };
    if (!(monto > 0)) return { success:false, message:'El abono debe ser mayor a 0.' };
    const ws = _getAbonosSheet();
    const id = 'AB-' + String(ws.getLastRow()).padStart(4,'0');
    const fecha = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
    ws.appendRow([id, fecha, codigo, data.cliente || '', monto, data.origen || 'admin', 'activo', data.idEspera || '']);
    return { success:true, id:id };
  } catch(e){ return { success:false, message:String(e) }; }
}
function handleGetAbonoActivo(params) {
  try {
    const codigo = String((params && params.codigo) || '').trim().toUpperCase();
    if (!codigo) return { success:true, monto:0, registros:[] };
    const ws = _getAbonosSheet();
    const rows = ws.getDataRange().getValues();
    let monto = 0; const registros = [];
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][2] || '').trim().toUpperCase() !== codigo) continue;
      if (String(rows[i][6] || '').toLowerCase().trim() !== 'activo') continue;
      monto += Number(rows[i][4] || 0);
      registros.push({ id: rows[i][0], fecha: rows[i][1], monto: Number(rows[i][4] || 0), origen: rows[i][5] });
    }
    return { success:true, monto:monto, registros:registros };
  } catch(e){ return { success:false, message:String(e), monto:0 }; }
}
function handleConsumirAbono(data) {
  try {
    const codigo = String((data && data.codigo) || '').trim().toUpperCase();
    if (!codigo) return { success:true, consumidos:0 };
    const ws = _getAbonosSheet();
    const rows = ws.getDataRange().getValues();
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][2] || '').trim().toUpperCase() !== codigo) continue;
      if (String(rows[i][6] || '').toLowerCase().trim() !== 'activo') continue;
      ws.getRange(i+1, 7).setValue('usado');
      n++;
    }
    return { success:true, consumidos:n };
  } catch(e){ return { success:false, message:String(e) }; }
}

// ============================================
// ESTADO DE CITA (para SYNA) — consulta si la clienta ya pagó su servicio
// Solo lectura. SYNA consulta por idEspera (el LE- que recibió) o por codigo[+fecha].
// "Pagado" = existe una Atención con Estado 'Completado' (se marca al cobrar).
// Atenciones: 0=ID 1=Fecha 2=HoraEntrada 3=HoraSalida 4=Código 5=Cliente
//             6=Staff 7=Servicio 8=Estado 9=Total 10=Método 11=idEspera 12=Área
// ============================================
function handleGetEstadoCita(params) {
  try {
    const idEspera = String((params && params.idEspera) || '').trim();
    const codigo   = String((params && params.codigo) || '').trim().toUpperCase();
    const fecha    = String((params && params.fecha) || '').trim(); // opcional dd/MM/yyyy
    if (!idEspera && !codigo) {
      return { success: false, message: 'Falta idEspera o codigo.', pagado: false };
    }
    const ws = getSheet('Atenciones');
    const data = ws.getDataRange().getValues();
    let mejor = null;
    for (let i = 3; i < data.length; i++) {
      const estado = String(data[i][8] || '').trim();
      if (estado !== 'Completado') continue; // 'Completado' = ya cobrada
      const rowId    = String(data[i][11] || '').trim();
      const rowCod   = String(data[i][4]  || '').trim().toUpperCase();
      const rowFecha = String(data[i][1]  || '').trim();
      let match = false;
      if (idEspera && rowId === idEspera) {
        match = true;
      } else if (codigo && rowCod === codigo) {
        match = (!fecha || rowFecha === fecha);
      }
      if (!match) continue;
      // Nos quedamos con el último que matchee (el más reciente en la hoja)
      mejor = {
        idEspera: rowId,
        codigo:   rowCod,
        cliente:  String(data[i][5]  || ''),
        servicio: String(data[i][7]  || ''),
        total:    Number(data[i][9]  || 0),
        metodo:   String(data[i][10] || ''),
        fecha:    rowFecha,
        hora:     String(data[i][3]  || '')
      };
    }
    if (mejor) return { success: true, pagado: true, cita: mejor };
    return { success: true, pagado: false };
  } catch (e) {
    return { success: false, message: String(e), pagado: false };
  }
}

function handleConfirmarCobro(data) {
  // Router: el frontend siempre llama 'confirmarCobro'. TM-/SP-/SN- van a su handler;
  // aca solo se cierran los LE-.
  const _idEsp = String(data.idEspera || '').trim();
  if (_idEsp.indexOf('TM-') === 0) return handleConfirmarCobroMulti(data);
  if (_idEsp.indexOf('SP-') === 0) return handleConfirmarCobroPromo(data);
  if (_idEsp.indexOf('SN-') === 0) return handleConfirmarCobroNormal(data);

  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  const now = new Date();
  const horaStr  = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
  const fechaStr = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');

  for (let i = 3; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === data.idEspera) {
      const row = i + 1;
      // ── IDEMPOTENCIA: si el ticket ya fue cobrado, NO re-procesar (evita doble comisión/ingreso) ──
      const _estLE = String(allData[i][8] || '').trim().toLowerCase();
      if (_estLE === 'completada' || _estLE === 'completado') {
        return { success: true, yaCobrado: true, message: 'Este ticket ya estaba cobrado.' };
      }
      const metodoPago = data.metodoPago || 'Efectivo';

      const codigoCliente    = allData[i][3] || '';
      const nombreCliente     = allData[i][4] || '';
      const servicioOriginal  = allData[i][5] || '';
      const promoNombreStr    = String(allData[i][13] || data.promoNombre || '').trim();
      const servicio          = promoNombreStr ? promoNombreStr + ' (PROMO)' : servicioOriginal;
      const area              = allData[i][6] || '';
      const chicaNombre       = String(allData[i][9] || '').trim();
      const notaAjuste        = String(data.notaAjuste || '');

      const precioPromoRow = Number(allData[i][14] || 0); // O: precio promo
      const precioRegRow   = Number(allData[i][15] || 0); // P: precio regular
      const totalFrontend  = Number(data.totalCobrado) || 0;

      // Armar lineas (hechos): desglose del frontend, o de col S, o linea unica
      let _fd = null;
      if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
        _fd = (typeof data.serviciosDetalle === 'string')
          ? (function(){ try { return JSON.parse(data.serviciosDetalle); } catch(e){ return null; } })()
          : data.serviciosDetalle;
      }
      if (!_fd) {
        const colS = allData[i] ? allData[i][18] : null;
        if (colS) { try { _fd = JSON.parse(colS); } catch (eJ) {} }
      }
      let lineas = [];
      if (_fd && _fd.length > 0) {
        lineas = _fd.map(function (p) {
          return {
            staff: String(p.staff || chicaNombre),
            area: String(p.area || area),
            servicio: String(p.servicio || servicio),
            precioRegular: Number(p.montoNormal || 0),
            precioPromo: Number(p.monto || 0)
          };
        });
      } else {
        const reg  = promoNombreStr ? (precioRegRow > 0 ? precioRegRow : totalFrontend) : (totalFrontend > 0 ? totalFrontend : precioRegRow);
        const prom = promoNombreStr ? (precioPromoRow > 0 ? precioPromoRow : totalFrontend) : 0;
        lineas = [{ staff: chicaNombre, area: area, servicio: servicio, precioRegular: reg, precioPromo: prom }];
      }

      // Motor unico: tarjeta=regular / efectivo=promo, reparte comision, suma extras
      const liq = liquidarCobro_(lineas, metodoPago, (precioRegRow > 0 ? precioRegRow : totalFrontend));
      const totalCobrado = liq.total;

      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 16).setValue(metodoPago); // P: metodoPago
      ws.getRange(row, 17).setValue(horaStr);    // Q: horaCobro
      ws.getRange(row, 18).setValue(totalCobrado); // R: totalCobrado

      // espejo Lineas: marcar la línea de esta clienta (ticket legacy LE-) como 'cobrado'.
      // Cubre cobro individual Y grupal (el grupal llama a confirmarCobro por cada clienta).
      // Los TM-/SP-/SN- ya se marcan en su propio handler (router de arriba).
      try { marcarLineaCobradaPorCodigo(codigoCliente, (promoNombreStr || servicioOriginal), metodoPago); } catch (eLn) { Logger.log('espejo cobro LE-: ' + eLn); }

      // ServiciosExtras: col K con el ID del ticket cobrado
      try {
        const wsExt = getSheet('ServiciosExtras');
        if (wsExt) {
          const extData = wsExt.getDataRange().getValues();
          const codCliente = String(allData[i][3] || '').trim();
          for (let e = 1; e < extData.length; e++) {
            if (String(extData[e][5]||'').trim() === codCliente &&
                String(extData[e][0]||'').trim() === fechaStr &&
                String(extData[e][10]||'').trim() === '') {
              wsExt.getRange(e + 1, 11).setValue(data.idEspera || '');
            }
          }
        }
      } catch (eExt) {}

      try { updateVisitaClienta(codigoCliente); } catch (e) {}

      // Comision + historial: UNA sola vez, al cobro final, por cada staff que participo
      try {
        const wsH = getSheet('HistorialOwner');
        const idEsperaHist = String(data.idEspera || '');
        liq.lineas.forEach(function (l) {
          if (l.staff && l.monto > 0) { try { updateComision(l.staff, l.monto); } catch (eC) {} }
          wsH.appendRow([fechaStr, horaStr, codigoCliente, nombreCliente, idEsperaHist,
            l.servicio, l.area, l.staff, l.monto, l.comision, metodoPago, notaAjuste]);
        });
      } catch (e) {}

      // CierresPagos (historial de Mikaela)
      try {
        const wsPagos = getSheet('CierresPagos');
        const desgloseStr = data.serviciosDetalle && data.serviciosDetalle.length > 0 ? JSON.stringify(data.serviciosDetalle) : '';
        wsPagos.appendRow([now, horaStr, nombreCliente, chicaNombre, servicio, totalCobrado, metodoPago, desgloseStr, notaAjuste]);
      } catch (e) {}

      cerrarAtencion(data.idEspera, chicaNombre, nombreCliente, servicio, totalCobrado, metodoPago, 'Completado');

      return { success: true };
    }
  }
  return { success: false };
}

// Servicios completados hoy por una chica
function handleGetServiciosSemana(params) {
  const ws = getSheet('HistorialOwner');
  const data = ws.getDataRange().getValues();
  const now = new Date();
  const tz = 'America/Guayaquil';

  // Calcular inicio de semana (lunes)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=lun
  const lunes = new Date(now);
  lunes.setDate(now.getDate() - dayOfWeek);
  lunes.setHours(0, 0, 0, 0);

  const DIAS = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const serviciosPorDia = {};

  // Datos desde fila 3 (indice 2) — filas 1-2 son titulo/descripcion
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    // Col A=Fecha B=Hora C=Codigo D=Nombre E=Top F=Servicio G=Area H=Staff I=Valor J=Comision K=MetodoPago
    const chica = String(row[7] || '').trim();
    if (params && params.chica && chica !== params.chica) continue;

    // Parsear fecha
    let fechaDate;
    if (row[0] instanceof Date) {
      fechaDate = row[0];
    } else {
      const parts = String(row[0] || '').split('/');
      if (parts.length !== 3) continue;
      fechaDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }

    if (fechaDate < lunes || fechaDate > now) continue;

    const diaIdx = fechaDate.getDay(); // 0=dom
    const diaNombre = DIAS[diaIdx];
    const fechaStr = Utilities.formatDate(fechaDate, tz, 'dd/MM/yyyy');

    if (!serviciosPorDia[diaNombre]) {
      serviciosPorDia[diaNombre] = { dia: diaNombre, fecha: fechaStr, orden: diaIdx === 0 ? 7 : diaIdx, total: 0, servicios: [] };
    }

    const valor = Number(row[8] || 0);
    const comision = Number(row[9] || 0);
    const hora = row[1] instanceof Date
      ? Utilities.formatDate(row[1], tz, 'HH:mm')
      : String(row[1] || '');

    serviciosPorDia[diaNombre].total += comision;
    serviciosPorDia[diaNombre].servicios.push({
      cliente: row[3],
      codigo: row[2],
      servicio: row[5],
      valor: valor,
      comision: comision,
      hora: hora,
      metodoPago: row[10],
      fecha: fechaStr
    });
  }

  const dias = Object.values(serviciosPorDia).sort((a, b) => a.orden - b.orden);
  return { success: true, dias: dias };
}

function handleGetServiciosHoy(params) {
  // ── PASO 5: Lee desde Lineas (fuente de verdad) con fallback al legacy ──
  try {
    var tablero = getTableroLineas();
    var todasLineas = [].concat(
      tablero.completado || [],
      tablero.cobrado    || [],
      tablero.en_servicio || []
    );
    var servicios = [];
    var claves = new Set();
    todasLineas.forEach(function(l) {
      if (params.chica && String(l.staff||'').trim() !== params.chica) return;
      var clave = String(l.codigo||'') + '|' + String(l.servicio||'').toLowerCase() + '|' + String(l.staff||'').toLowerCase();
      if (claves.has(clave)) return;
      claves.add(clave);
      var comisionFinal = Number(l.comision || 0);
      if (comisionFinal === 0 && (l.estado === 'en_servicio' || l.estado === 'completado')) {
        var _area = String(l.area || '').toLowerCase();
        var _pct  = _area.indexOf('facial') >= 0 ? 0.4 : 0.3;
        comisionFinal = Math.round(Number(l.monto || 0) * _pct * 100) / 100;
      }
      // Formatear fecha correctamente — puede ser Date o string
      var _fecha = l.fecha;
      var _fechaStr = '';
      if (_fecha instanceof Date && _fecha.getFullYear() > 2000) {
        _fechaStr = Utilities.formatDate(_fecha, 'America/Guayaquil', 'dd/MM/yyyy');
      } else if (typeof _fecha === 'string' && _fecha.length > 0) {
        // Si viene como string "Sat Dec 30 1899..." → intentar reparsear desde horaToma
        // o dejar vacío para que el frontend no muestre fecha inválida
        var _fechaParsed = new Date(_fecha);
        _fechaStr = (!isNaN(_fechaParsed) && _fechaParsed.getFullYear() > 2000)
          ? Utilities.formatDate(_fechaParsed, 'America/Guayaquil', 'dd/MM/yyyy')
          : '';
      }
      servicios.push({
        nombre        : String(l.cliente  || ''),
        codigo        : String(l.codigo   || ''),
        servicio      : String(l.servicio || ''),
        area          : String(l.area     || ''),
        horaToma      : String(l.hora     || ''),
        total         : Number(l.monto    || 0),
        metodoPago    : String(l.metodoPago || (l.estado === 'cobrado' ? 'Efectivo' : 'Pendiente cobro')),
        tomadaPor     : String(l.staff    || ''),
        fecha         : _fechaStr,
        promoNombre   : String(l.promoRef || ''),
        precioRegular : Number(l.montoRegular || 0),
        observaciones : String(l.obs      || ''),
        horaCobro     : String(l.horaDevuelta || ''),
        comision      : comisionFinal,
        pendienteCobro: (l.estado === 'en_servicio' || l.estado === 'completado')
      });
    });
    Logger.log('[ServiciosHoy] fuente=Lineas, items=' + servicios.length);
    return { success: true, servicios: servicios };
  } catch(eLn) {
    Logger.log('[ServiciosHoy] fallback legacy: ' + eLn);
  }

  // ── FALLBACK LEGACY (si Lineas falla) ──────────────────────────────────
  var ws = getSheet('ListaEspera');
  var data = ws.getDataRange().getValues();
  var hoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
  var servicios = [];
  // FIX: deduplicar por IDENTIDAD del servicio (codigo cliente + servicio + chica),
  // NO por total ni hora. El total varía entre fuentes para el mismo servicio
  // (ServicioPromo guarda precioMiArea, ListaEspera/ServicioNormal el total cobrado,
  // y con el bug de tarjeta/promo el mismo servicio queda con dos montos distintos),
  // lo que hacía que la clave difiriera y el servicio se mostrara duplicado (ej. Lesly
  // como 2da area en promos). La hora tampoco es estable (horaToma vs horaCobro).
  // Mismo cliente + mismo servicio + misma chica = mismo servicio, sin importar monto/hora.
  var clavesDuplicadas = new Set();
  function claveSvc(codigo, servicio, staff) {
    var svc = String(servicio||'').trim().toLowerCase()
      .replace(/\(.*?\)/g, ' ')        // quita "(continuación promo)", "(✅ completado)", "(PROMO)", etc
      .replace(/\bpromo\b/g, ' ')      // normaliza variante promo/regular del mismo servicio
      .replace(/\s+/g, ' ').trim();
    return String(codigo||'').trim().toLowerCase() + '|' + svc + '|' + String(staff||'').trim().toLowerCase();
  }

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    if (estado !== 'completada') continue;
    
    // Comparar fecha — puede ser string o Date object
    let fechaStr = '';
    if (row[1] instanceof Date) {
      fechaStr = Utilities.formatDate(row[1], 'America/Guayaquil', 'dd/MM/yyyy');
    } else {
      fechaStr = String(row[1] || '');
    }
    if (fechaStr !== hoy) continue;
    
    const tomadaPor = String(row[9] || '').trim();
    if (params.chica && tomadaPor !== params.chica) continue;

    // Formatear hora de toma
    let horaToma = '';
    if (row[10] instanceof Date) {
      horaToma = Utilities.formatDate(row[10], 'America/Guayaquil', 'HH:mm');
    } else {
      horaToma = String(row[10] || '');
    }
    
    // Formatear hora de cobro
    let horaCobro = '';
    if (row[16] instanceof Date) {
      horaCobro = Utilities.formatDate(row[16], 'America/Guayaquil', 'HH:mm');
    } else {
      horaCobro = String(row[16] || '');
    }

    // Calcular comisión individual
    const area = String(row[6] || '').toLowerCase();
    const totalCobrado = Number(row[17] || row[12] || 0);
    const porcentaje = area.includes('facial') ? 0.4 : 0.3;
    const comision = Math.round(totalCobrado * porcentaje * 100) / 100;

    const _cLE = claveSvc(row[3], row[5], tomadaPor);
    if (clavesDuplicadas.has(_cLE)) continue; // evitar duplicado del mismo servicio
    clavesDuplicadas.add(_cLE); // registrar para evitar duplicados desde otras fuentes
    servicios.push({
      nombre: row[4],
      codigo: row[3],
      servicio: row[5],
      area: row[6],
      horaToma: horaToma,
      total: row[17] || row[12] || '0',
      metodoPago: row[15] || 'Efectivo',
      tomadaPor: tomadaPor,
      fecha: fechaStr,
      promoNombre: row[13] || '',
      precioRegular: row[14] || '',
      observaciones: row[11] || '',
      horaCobro: horaCobro,
      comision: comision  // Nueva: comisión individual
    });
  }
  
  // Merge con ServicioNormal (tickets SN- completados hoy)
  try {
    const wsN = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const dataN = wsN.getDataRange().getValues();
    for (let i = 1; i < dataN.length; i++) {
      const row = dataN[i];
      const id = String(row[0]||'').trim();
      if (!id.startsWith('SN-')) continue;
      const estado = String(row[8]||'').toLowerCase();
      if (estado !== 'completada') continue;

      let fechaStr = '';
      if (row[1] instanceof Date) {
        fechaStr = Utilities.formatDate(row[1], 'America/Guayaquil', 'dd/MM/yyyy');
      } else { fechaStr = String(row[1]||''); }
      if (fechaStr !== hoy) continue;

      const tomadaPor = String(row[9]||'').trim();
      if (params.chica && tomadaPor !== params.chica) continue;

      const horaToma  = row[10] instanceof Date ? Utilities.formatDate(row[10], 'America/Guayaquil', 'HH:mm') : String(row[10]||'');
      const horaCobro = row[15] instanceof Date ? Utilities.formatDate(row[15], 'America/Guayaquil', 'HH:mm') : String(row[15]||'');
      const area = String(row[6]||'').toLowerCase();
      const totalCobrado = Number(row[16]||row[12]||0);
      const porcentaje = area.includes('facial') ? 0.4 : 0.3;
      const comision = Math.round(totalCobrado * porcentaje * 100) / 100;

      const _cN = claveSvc(row[3], row[5], tomadaPor);
      if (clavesDuplicadas.has(_cN)) continue; // ya agregado desde otra fuente → no duplicar
      clavesDuplicadas.add(_cN); // registrar para que HistorialOwner no duplique
      servicios.push({
        nombre     : String(row[4]||''),
        codigo     : String(row[3]||''),
        servicio   : String(row[5]||''),
        area       : String(row[6]||''),
        horaToma   : horaToma,
        total      : row[16]||row[12]||'0',
        metodoPago : String(row[14]||'Efectivo'),
        tomadaPor  : tomadaPor,
        fecha      : fechaStr,
        promoNombre: '',
        precioRegular: '',
        observaciones: String(row[11]||''),
        horaCobro  : horaCobro,
        comision   : comision
      });
    }
  } catch(e) {}

  // Merge con ServicioPromo (tickets SP- completados hoy)
  try {
    const wsP = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const dataP = wsP.getDataRange().getValues();
    for (let i = 1; i < dataP.length; i++) {
      const row = dataP[i];
      const id = String(row[0]||'').trim();
      if (!id.startsWith('SP-')) continue;
      const estado = String(row[8]||'').toLowerCase();
      // Mostrar tanto completada (cobrada) como completada-parcial (parte hecha, sigue en otra área)
      // y 'por cobrar' (última área, esperando pago)
      if (estado !== 'completada' && estado !== 'completada-parcial' && estado !== 'por cobrar') continue;

      let fechaStr = '';
      if (row[1] instanceof Date) {
        fechaStr = Utilities.formatDate(row[1], 'America/Guayaquil', 'dd/MM/yyyy');
      } else { fechaStr = String(row[1]||''); }
      if (fechaStr !== hoy) continue;

      const tomadaPor = String(row[9]||'').trim();
      if (params.chica && tomadaPor !== params.chica) continue;

      const horaToma  = row[10] instanceof Date ? Utilities.formatDate(row[10], 'America/Guayaquil', 'HH:mm') : String(row[10]||'');
      const horaCobro = row[15] instanceof Date ? Utilities.formatDate(row[15], 'America/Guayaquil', 'HH:mm') : String(row[15]||'');
      // Usar col M (precioMiArea) para la comisión de esta staff
      const precioMiArea = Number(row[12] || 0);
      const area = String(row[6]||'').toLowerCase();
      const porcentaje = area.includes('facial') ? 0.4 : 0.3;
      const comision = Math.round(precioMiArea * porcentaje * 100) / 100;

      const _cSP = claveSvc(row[3], row[5], tomadaPor);
      if (clavesDuplicadas.has(_cSP)) continue;
      clavesDuplicadas.add(_cSP); // registrar para que HistorialOwner no duplique
      servicios.push({
        nombre     : String(row[4]||''),
        codigo     : String(row[3]||''),
        servicio   : String(row[5]||''),
        area       : String(row[6]||''),
        horaToma   : horaToma,
        total      : String(precioMiArea),
        metodoPago : (estado === 'completada-parcial' || estado === 'por cobrar') ? 'Pendiente cobro' : String(row[14]||'Efectivo'),
        tomadaPor  : tomadaPor,
        fecha      : fechaStr,
        promoNombre: String(row[13]||''),
        precioRegular: String(Number(row[19]||0)),
        observaciones: String(row[11]||''),
        horaCobro  : horaCobro,
        comision   : comision,
        tipo       : 'SP'
      });
    }
  } catch(e) {}

  // ── Merge HistorialOwner — tickets TM y SP cobrados hoy ──────────────────
  try {
    var wsH  = getSheet('HistorialOwner');
    var dataH = wsH.getDataRange().getValues();
    for (var i = 2; i < dataH.length; i++) {
      var rowH = dataH[i];
      if (!rowH[0]) continue;
      var fechaHStr = rowH[0] instanceof Date
        ? Utilities.formatDate(rowH[0], 'America/Guayaquil', 'dd/MM/yyyy')
        : String(rowH[0] || '');
      if (fechaHStr !== hoy) continue;
      var staffH = String(rowH[7] || '').trim();
      if (params.chica && staffH !== params.chica) continue;
      var colE = String(rowH[4] || '').trim();
      // FIX: deduplicar por fuente.
      // LE- y SN- → ya vienen del merge de ListaEspera/ServicioNormal → excluir siempre.
      // SP- → ya vienen del merge de ServicioPromo → excluir siempre.
      // Solo incluir desde HistorialOwner los tickets TM- (que no tienen merge propio).
      var esSP   = colE.startsWith('SP-');
      var esLE_SN = colE.startsWith('LE-') || colE.startsWith('SN-');
      if (esLE_SN || esSP) continue; // ya aparece por su merge correspondiente
      var metodoPagoH = String(rowH[10] || '').trim();
      if (metodoPagoH === 'Pendiente cobro final' || metodoPagoH === 'Pendiente cobro') continue;
      var horaH = rowH[1] instanceof Date
        ? Utilities.formatDate(rowH[1], 'America/Guayaquil', 'HH:mm')
        : String(rowH[1] || '');
      // FIX: deduplicar — no agregar si ya existe desde ServicioNormal/SP/LE
      const _cH = claveSvc(rowH[2], rowH[5], staffH);
      if (clavesDuplicadas.has(_cH)) continue;
      clavesDuplicadas.add(_cH);
      servicios.push({
        nombre      : String(rowH[3] || ''),
        codigo      : String(rowH[2] || ''),
        servicio    : String(rowH[5] || ''),
        area        : String(rowH[6] || ''),
        horaToma    : horaH,
        total       : Number(rowH[8] || 0),
        metodoPago  : metodoPagoH,
        tomadaPor   : staffH,
        fecha       : fechaHStr,
        promoNombre : '',
        precioRegular: '',
        observaciones: '',
        horaCobro   : horaH,
        comision    : Number(rowH[9] || 0)
      });
    }
  } catch(eTM) {}
  // ── Fin merge HistorialOwner ────────────────────────────────────────────

  // ── Merge TicketMulti — áreas YA completadas pero el ticket AÚN no cobrado ──
  // Para que la staff vea su parte apenas la termina, aunque la clienta pase a otra
  // área y el combo todavía no se haya cobrado. Comisión PROVISIONAL (sobre el monto
  // del área); se fija definitivamente al cobrar. Los TM ya cobrados quedan en estado
  // 'Completado' → no entran acá (esos vienen de HistorialOwner, arriba).
  try {
    var wsTMh = getTMSheet();
    var lastTMh = wsTMh.getLastRow();
    if (lastTMh >= 3) {
      var dataTMh = wsTMh.getRange(3, 1, lastTMh - 2, 37).getValues();
      for (var ti = 0; ti < dataTMh.length; ti++) {
        var rowT = dataTMh[ti];
        var idT = String(rowT[0] || '').trim();
        if (!idT.startsWith('TM-')) continue;
        if (String(rowT[5] || '').toLowerCase() === 'completado') continue; // ya cobrado → HistorialOwner
        var fechaTStr = rowT[1] instanceof Date
          ? Utilities.formatDate(rowT[1], 'America/Guayaquil', 'dd/MM/yyyy')
          : String(rowT[1] || '');
        if (fechaTStr !== hoy) continue;
        for (var aTM = 0; aTM < 4; aTM++) {
          var baseTM = TM_AREA_COL[aTM];
          var tentTM = String(rowT[baseTM] || '').trim();
          if (!tentTM) continue;
          if (String(rowT[baseTM + 3] || '').trim().toLowerCase() !== 'completado') continue; // solo áreas hechas
          var staffTM = String(rowT[baseTM + 2] || '').trim();
          if (!staffTM) continue;
          if (params.chica && staffTM !== params.chica) continue;
          var areaKeyTM = tentTM.indexOf('||') !== -1 ? tentTM.split('||')[0] : '';
          var svcTM     = tentTM.indexOf('||') !== -1 ? tentTM.split('||')[1] : tentTM;
          var precioTM  = Number(rowT[TM_PRECIO_COL[aTM]] || 0);
          var pctTM     = areaKeyTM.toLowerCase().indexOf('facial') >= 0 ? 0.4 : 0.3;
          var _cTM = claveSvc(rowT[3], svcTM, staffTM);
          if (clavesDuplicadas.has(_cTM)) continue;
          clavesDuplicadas.add(_cTM);
          servicios.push({
            nombre        : String(rowT[4] || ''),
            codigo        : String(rowT[3] || ''),
            servicio      : svcTM,
            area          : areaKeyTM,
            horaToma      : String(rowT[baseTM + 4] || '').trim(),
            total         : precioTM,
            metodoPago    : 'Pendiente cobro',
            tomadaPor     : staffTM,
            fecha         : fechaTStr,
            promoNombre   : '',
            precioRegular : '',
            observaciones : '',
            horaCobro     : '',
            comision      : Math.round(precioTM * pctTM * 100) / 100,
            pendienteCobro: true
          });
        }
      }
    }
  } catch(eTMh) {}
  // ── Fin merge TicketMulti en progreso ───────────────────────────────────

  return { success: true, servicios: servicios };
} // fin handleGetServiciosHoy

// ============================================
// ATENCIONES Y SERVICIOS
// ============================================

// ============================================================
// handleGetAtenciones — INCIDENCIA 01 — Lee desde LINEAS
// Fuente única: getTableroLineas().en_servicio
// Fallback automático a handleGetAtenciones_LEGACY si Lineas falla
// Rollback manual: reemplazar handleGetAtenciones por handleGetAtenciones_LEGACY
//   en el case 'getAtenciones' del doGet
// Autor: migración LINEAS — 2026-07-07
// ============================================================
function handleGetAtenciones(params) {
  try {
    // ── LECTURA DESDE LINEAS ─────────────────────────────────────────────
    var tablero = getTableroLineas();
    var enServicio = tablero.en_servicio || [];

    if (!Array.isArray(enServicio)) {
      throw new Error('getTableroLineas no devolvió en_servicio como array');
    }

    var tz = 'America/Guayaquil';
    var chicaFiltro = params && params.chica ? String(params.chica).trim() : '';
    var atenciones = [];
    var idsAgregados = new Set();

    enServicio.forEach(function(l) {
      // Filtrar por chica si viene el parámetro
      if (chicaFiltro && String(l.staff || '').trim() !== chicaFiltro) return;

      // ── Derivar idEspera y areaIdx desde promoRef ──────────────────────
      // promoRef puede ser: 'TM-372:1', 'SP-240', 'SN-683', 'LE-001'
      var promoRef = String(l.promoRef || '').trim();
      var idEspera = promoRef;
      var areaIdx  = 0;
      if (promoRef.indexOf(':') >= 0) {
        var partes = promoRef.split(':');
        idEspera = partes[0];                          // 'TM-372'
        areaIdx  = Math.max(0, Number(partes[1] || 1) - 1); // ':1' → idx 0
      }

      // Deduplicar: para TM, pueden llegar varias líneas del mismo grupo
      // (una por área). Cada línea tiene promoRef único (TM-372:1, TM-372:2)
      // pero las mostramos como atenciones separadas (una por área/staff)
      var claveDedupe = promoRef || (String(l.codigo||'') + '|' + String(l.staff||''));
      if (idsAgregados.has(claveDedupe)) return;
      idsAgregados.add(claveDedupe);

      // ── Determinar fuente y tipo desde prefijo ─────────────────────────
      var prefijo = idEspera.split('-')[0] || '';  // 'TM', 'SP', 'SN', 'LE'
      var fuente = prefijo === 'TM' ? 'TicketMulti'
                 : prefijo === 'SP' ? 'ServicioPromo'
                 : prefijo === 'SN' ? 'ServicioNormal'
                 : 'ListaEspera';

      // ── promoNombre: condición 8 ───────────────────────────────────────
      // Para SP y TM: el nombre del combo/promo ES el campo servicio de Lineas
      // Para SN y LE: no hay promo
      var esPromoOMulti = (prefijo === 'SP' || prefijo === 'TM');
      var promoNombre = esPromoOMulti
        ? (l.promoNombre || l.comboNombre || l.servicio || '')
        : '';

      // ── Formatear hora de toma ─────────────────────────────────────────
      var horaToma = '';
      if (l.horaToma instanceof Date) {
        horaToma = Utilities.formatDate(l.horaToma, tz, 'HH:mm');
      } else if (l.horaToma) {
        horaToma = String(l.horaToma);
        // Si viene como ISO string, extraer HH:mm
        if (horaToma.length > 5 && horaToma.indexOf('T') >= 0) {
          try { horaToma = Utilities.formatDate(new Date(horaToma), tz, 'HH:mm'); } catch(e) {}
        }
      } else if (l.hora) {
        horaToma = String(l.hora);
      }

      // ── Formatear fecha ────────────────────────────────────────────────
      var fecha = '';
      if (l.fecha instanceof Date) {
        fecha = Utilities.formatDate(l.fecha, tz, 'dd/MM/yyyy');
      } else {
        fecha = String(l.fecha || '');
      }

      // ── observaciones: condición 9 ─────────────────────────────────────
      // Se enriquece más abajo con datos de Clientas por área
      var observaciones = String(l.obs || l.observaciones || '');

      atenciones.push({
        idEspera    : idEspera,
        fecha       : fecha,
        horaLlegada : '',          // no en Lineas — no crítico para el panel
        codigo      : String(l.codigo   || ''),
        nombre      : String(l.cliente  || ''),
        servicio    : String(l.servicio || ''),
        area        : String(l.area     || ''),
        prioridad   : 'Normal',    // no en Lineas — default seguro
        tomadaPor   : String(l.staff    || ''),
        horaToma    : horaToma,
        observaciones: observaciones,
        total        : Number(l.monto   || 0),
        precioPromo  : Number(l.monto   || 0),
        promoNombre  : promoNombre,
        precioRegular: Number(l.montoRegular || l.monto || 0),
        tipo         : prefijo || 'SN',
        fuente       : fuente,
        estado       : String(l.estado  || 'en_servicio'),
        // Campos específicos TM
        areaIdx                : areaIdx,
        servicioTentativo      : String(l.servicio || ''),  // confirmado = tentativo en Lineas
        pendienteConfirmacion  : false  // en_servicio = ya fue tomado y confirmado
      });
    });

    // ── Enrichment desde Clientas (igual que la versión legacy) ───────────
    try {
      var wsC = getSheet('Clientas');
      var cData = wsC.getDataRange().getValues();
      atenciones.forEach(function(a) {
        for (var i = 3; i < cData.length; i++) {
          if (String(cData[i][0]).trim() !== String(a.codigo).trim()) continue;
          a.esTop        = String(cData[i][7]  || '').toLowerCase().includes('sí');
          a.obsGeneral   = String(cData[i][9]  || '');
          a.obsCejas     = String(cData[i][12] || '');
          a.obsDepilacion= String(cData[i][13] || '');
          a.obsPestanas  = String(cData[i][14] || '');
          a.obsFacial    = String(cData[i][15] || '');
          // Condición 9: enriquecer observaciones con dato de Clientas si vacío
          if (!a.observaciones) {
            var areaLow = String(a.area || '').toLowerCase();
            a.observaciones = areaLow.includes('ceja')     ? a.obsCejas
                            : areaLow.includes('depilac')  ? a.obsDepilacion
                            : areaLow.includes('pesta')    ? a.obsPestanas
                            : areaLow.includes('facial')   ? a.obsFacial
                            : a.obsGeneral;
          }
          break;
        }
      });
    } catch(eC) {
      Logger.log('[getAtenciones] enrich Clientas error: ' + eC);
    }

    // ── AGRUPAR POR CLIENTA: un "ticket madre" por clienta, servicios = subtickets ──
    // Antes se devolvía una atención por LÍNEA → una clienta con 2 servicios aparecía
    // dos veces en el panel de la staff y ocupaba 2 slots. Ahora se colapsa por código:
    // una sola atención con serviciosDetalle[] (los subtickets). El frontend ya sabe
    // cargar serviciosDetalle en el slot, así que un slot = una clienta.
    var _porCliente = {}, _orden = [];
    atenciones.forEach(function (a) {
      var key = String(a.codigo || a.nombre || a.idEspera || '');
      if (!_porCliente[key]) { _porCliente[key] = []; _orden.push(key); }
      _porCliente[key].push(a);
    });
    var agrupadas = _orden.map(function (key) {
      var svs = _porCliente[key];
      if (svs.length <= 1) return svs[0];   // una sola → igual que antes
      var base = svs[0];
      base.serviciosDetalle = svs.map(function (s) {
        return {
          servicio: s.servicio, area: s.area,
          monto: Number(s.total || 0),
          montoNormal: Number(s.precioRegular || s.total || 0),
          esPromo: (s.tipo === 'TM' || s.tipo === 'SP')
        };
      });
      // Nombre combinado para la tarjeta, total y regular sumados.
      base.servicio      = svs.map(function (s) { return s.servicio; }).join(' + ');
      base.total         = svs.reduce(function (t, s) { return t + Number(s.total || 0); }, 0);
      base.precioPromo   = base.total;
      base.precioRegular = svs.reduce(function (t, s) { return t + Number(s.precioRegular || 0); }, 0);
      base.promoNombre   = '';   // clienta con varios servicios → el front usa serviciosDetalle
      base._subtickets   = svs.length;
      return base;
    });

    Logger.log('[getAtenciones] fuente=LINEAS lineas=' + atenciones.length
      + ' clientas=' + agrupadas.length
      + (chicaFiltro ? ' chica=' + chicaFiltro : ''));
    return { success: true, atenciones: agrupadas };

  } catch(eLn) {
    // ── FALLBACK AUTOMÁTICO A LEGACY ──────────────────────────────────────
    Logger.log('[getAtenciones] FALLBACK legacy — error Lineas: ' + eLn);
    return handleGetAtenciones_LEGACY(params);
  }
}

function handleGetAtenciones_LEGACY(params) {
  // Buscar en ListaEspera las que están "En servicio"
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const atenciones = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    if (estado !== 'en servicio' && estado !== 'pendiente-staff') continue;
    // Excluir tickets atascados con fecha 1899
    if (row[1] instanceof Date && row[1].getFullYear() < 2000) continue;
    
    // Si pidieron filtrar por chica
    if (params.chica && String(row[9]).trim() !== params.chica) continue;
    
    // Formatear horas
    let horaLlegada = row[2] instanceof Date ? Utilities.formatDate(row[2], 'America/Guayaquil', 'HH:mm') : String(row[2] || '');
    let horaToma = row[10] instanceof Date ? Utilities.formatDate(row[10], 'America/Guayaquil', 'HH:mm') : String(row[10] || '');
    
    atenciones.push({
      idEspera: id,
      fecha: row[1] instanceof Date ? Utilities.formatDate(row[1], 'America/Guayaquil', 'dd/MM/yyyy') : String(row[1] || ''),
      horaLlegada: horaLlegada,
      codigo: row[3],
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      prioridad: row[7],
      tomadaPor: row[9],
      horaToma: horaToma,
      observaciones: row[11] || '',
      total: row[12] || '0',
      precioPromo: row[12] || '0',  // Agregar este campo explícitamente
      promoNombre: row[13] || '',
      precioRegular: row[14] || ''
    });
  }
  
  // Buscar datos extra de clienta (obs por área, esTop)
  try {
    const wsC = getSheet('Clientas');
    const cData = wsC.getDataRange().getValues();
    atenciones.forEach(a => {
      for (let i = 3; i < cData.length; i++) {
        if (String(cData[i][0]).trim() === String(a.codigo).trim()) {
          a.esTop = String(cData[i][7] || '').toLowerCase().includes('sí');
          a.obsGeneral = cData[i][9] || '';
          a.obsCejas = cData[i][12] || '';
          a.obsDepilacion = cData[i][13] || '';
          a.obsPestanas = cData[i][14] || '';
          a.obsFacial = cData[i][15] || '';
          break;
        }
      }
    });
  } catch(e) {}

  // Merge con ServicioNormal (tickets SN- en servicio)
  // FIX: deduplicar por idEspera para evitar mostrar el mismo ticket dos veces
  const idsYaAgregados = new Set(atenciones.map(a => a.idEspera));
  try {
    const snR = handleGetServicioNormal(params || {});
    if (snR.success && snR.enServicio) {
      snR.enServicio.forEach(sn => {
        if (params && params.chica && sn.tomadaPor !== params.chica) return;
        if (idsYaAgregados.has(sn.idEspera)) return; // ya está desde ListaEspera
        idsYaAgregados.add(sn.idEspera);
        atenciones.push({
          idEspera    : sn.idEspera,
          fecha       : sn.fecha,
          horaLlegada : sn.horaLlegada,
          codigo      : sn.codigo,
          nombre      : sn.nombre,
          servicio    : sn.servicio,
          area        : sn.area,
          prioridad   : sn.prioridad || 'Normal',
          tomadaPor   : sn.tomadaPor,
          horaToma    : sn.horaTomada || '',
          observaciones: sn.observaciones || '',
          total       : sn.total || '0',
          precioPromo : sn.precioPromo || sn.total || '0',
          promoNombre : sn.promoNombre || '',
          precioRegular: sn.precioNormal || sn.total || '0',
          tipo        : sn.tipo || 'SN',
          fuente      : 'ServicioNormal'
        });
      });
    }
  } catch(e) {}

  // Merge con ServicioPromo (tickets SP- en servicio)
  try {
    const spR = handleGetServicioPromo(params || {});
    if (spR.success && spR.enServicio) {
      spR.enServicio.forEach(function(sp) {
        if (params && params.chica && sp.tomadaPor !== params.chica) return;
        if (String(sp.estado || '').toLowerCase() === 'por cobrar') return;
        if (idsYaAgregados.has(sp.idEspera)) return; // deduplicar
        idsYaAgregados.add(sp.idEspera);
        atenciones.push({
          idEspera    : sp.idEspera,
          fecha       : sp.fecha,
          horaLlegada : sp.horaLlegada,
          codigo      : sp.codigo,
          nombre      : sp.nombre,
          servicio    : sp.servicio,
          area        : sp.area,
          prioridad   : sp.prioridad || 'Normal',
          tomadaPor   : sp.tomadaPor,
          horaToma    : sp.horaTomada || '',
          observaciones: sp.observaciones || '',
          total       : sp.total || '0',
          precioPromo : sp.precioPromo || sp.total || '0',
          promoNombre : sp.promoNombre || '',
          precioRegular: sp.precioNormal || sp.total || '0',
          tipo        : sp.tipo || 'SP',
          fuente      : 'ServicioPromo',
          pendienteConfirmacion: false
        });
      });
    }
  } catch(e) {}

  // Merge con TicketMulti — mostrar áreas asignadas a esta staff
  try {
    const chicaFiltroTM = (params && params.chica) ? String(params.chica) : '';
    const tmR = handleGetTicketMulti({ chica: chicaFiltroTM });
    if (tmR.success) {
      tmR.activos.forEach(function(tm) {
        (tm.areas || []).forEach(function(a) {
          if (chicaFiltroTM && a.staff !== chicaFiltroTM) return;
          // Solo áreas realmente EN SERVICIO (ya tomadas por la staff).
          // Un área asignada por Mikaela pero aún en 'Esperando' se ve en la
          // lista de espera de la staff para tomarla — NO como "en atención".
          if (String(a.estado || '').toLowerCase() !== 'en servicio') return;
          atenciones.push({
            idEspera:  tm.idEspera,
            codigo:    tm.codigo,
            nombre:    tm.nombre,
            servicio:  a.confirmado || a.tentativo,
            servicioTentativo: a.tentativo,
            area:      a.area || 'multi',
            tomadaPor: a.staff,
            total:     a.precio,
            estado:    a.estado,
            horaToma:  a.hora,
            areaIdx:   a.idx,
            fuente:    'TicketMulti',
            pendienteConfirmacion: !a.confirmado
          });
        });
      });
    }
  } catch(e) {}

  return { success: true, atenciones: atenciones };
}

function handleAddAtencion(data) {
  const ws = getSheet('Atenciones');
  const lastRow = ws.getLastRow();
  const lastId = lastRow > 3 ? ws.getRange(lastRow, 1).getValue() : 'AT-0000';
  const nextNum = parseInt(String(lastId).replace('AT-', '')) + 1;
  const id = 'AT-' + String(nextNum).padStart(4, '0');

  const now = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  // Columnas: A=ID | B=Fecha | C=HoraEntrada | D=HoraSalida | E=Código | F=Cliente | G=Staff | H=Servicio | I=Estado | J=Total | K=MetodoPago | L=idEspera
  ws.appendRow([
    id,              // A: ID
    fecha,           // B: Fecha
    hora,            // C: Hora entrada
    '',              // D: Hora salida (se llena al finalizar)
    data.codigo,     // E: Código cliente
    data.nombre,     // F: Cliente
    data.chica,      // G: Staff
    data.servicio || '', // H: Servicio
    'En servicio',   // I: Estado
    '',              // J: Total (se llena al finalizar)
    '',              // K: Método pago (se llena al cobrar)
    data.idEspera || '' // L: ID del ticket ListaEspera (para cruzar)
  ]);

  return { success: true, idAtencion: id };
}

// Actualiza el registro en Atenciones al finalizar/cobrar
// Busca por idEspera (col L) o por cliente+staff+fecha si no hay idEspera
function cerrarAtencion(idEspera, chicaNombre, clienteNombre, servicio, total, metodoPago, nuevoEstado) {
  try {
    const ws = getSheet('Atenciones');
    const data = ws.getDataRange().getValues();
    const hoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
    const horaSalida = Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm');

    for (let i = 3; i < data.length; i++) {
      const rowIdEspera = String(data[i][11] || '').trim(); // col L = idEspera
      const rowStaff = String(data[i][6] || '').trim();     // col G = Staff
      const rowCliente = String(data[i][5] || '').trim();   // col F = Cliente
      const rowFecha = String(data[i][1] || '').trim();     // col B = Fecha
      const rowEstado = String(data[i][8] || '').trim();    // col I = Estado

      if (rowEstado === 'Finalizado' || rowEstado === 'Completado') continue;

      // Match por idEspera primero, luego fallback por cliente+staff+fecha
      const matchId = idEspera && rowIdEspera === String(idEspera).trim();
      const matchFallback = rowStaff === chicaNombre && rowCliente === clienteNombre && rowFecha === hoy;

      if (!matchId && !matchFallback) continue;

      const row = i + 1;
      if (horaSalida) ws.getRange(row, 4).setValue(horaSalida);  // D: Hora salida
      if (servicio)   ws.getRange(row, 8).setValue(servicio);    // H: Servicio final
      ws.getRange(row, 9).setValue(nuevoEstado || 'Finalizado'); // I: Estado
      if (total)      ws.getRange(row, 10).setValue(total);      // J: Total
      if (metodoPago) ws.getRange(row, 11).setValue(metodoPago); // K: Método pago
      return;
    }
  } catch(e) { /* no bloquear flujo principal */ }
}

function handleAddServicio(data) {
  const ws = getSheet('Servicios');
  const lastRow = ws.getLastRow();
  const lastId = lastRow > 3 ? ws.getRange(lastRow, 1).getValue() : 'SV-0000';
  const nextNum = parseInt(String(lastId).replace('SV-', '')) + 1;
  const id = 'SV-' + String(nextNum).padStart(4, '0');

  const now = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  ws.appendRow([
    id, data.idAtencion, data.codigoServicio, data.servicio, data.precio,
    data.chica, fecha, hora, data.esPromo || 'No', data.idPromo || '', data.esRetiroNuestro || ''
  ]);

  // Actualizar comisiones
  updateComision(data.chica, data.precio);

  return { success: true, idServicio: id };
}

function handleFinalizarServicio(data) {
  const ws = getSheet('Atenciones');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    if (allData[i][0] === data.idAtencion) {
      const row = i + 1;
      const now = Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm');
      ws.getRange(row, 7).setValue('Finalizado');
      ws.getRange(row, 8).setValue(now);
      ws.getRange(row, 9).setValue(data.metodoPago || 'Efectivo');
      ws.getRange(row, 10).setValue(data.totalCobrado || 0);

      // Actualizar visita de la clienta
      updateVisitaClienta(allData[i][1]);

      // Guardar en historial del Owner
      addHistorialOwner(allData[i], data);

      return { success: true };
    }
  }
  return { success: false };
}

// ============================================
// COMISIONES
// ============================================
function handleGetComisiones(params) {
  const ws = getSheet('Comisiones');
  const data = ws.getDataRange().getValues();
  const comisiones = [];

  // Columnas: A=Chica | B=Área | C=Servicios | D=Facturado | E=% Comisión | F=Comisión a pagar
  // Datos desde fila 4 (indice 3) - fila 3 son encabezados
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if (params && params.chica && String(row[0]).trim() !== params.chica) continue;
    // FIX: forzar números para evitar que Sheets devuelva fechas cuando el formato está mal
    const _facturado = row[3] instanceof Date ? 0 : Number(row[3]) || 0;
    let _comision  = row[5] instanceof Date ? 0 : Number(row[5]) || 0;
    // FIX: si la comisión llega en 0 (celda con formato de fecha o vacía) pero hay facturado,
    // recalcularla desde el % / área para no mostrar el valor a pagar en blanco.
    if (_comision === 0 && _facturado > 0) {
      const _areaStr = String(row[1] || '').toLowerCase();
      const _pctStr  = String(row[4] || '');
      const _pct = (_areaStr.includes('facial') || _pctStr.includes('40')) ? 0.4 : 0.3;
      _comision = Math.round(_facturado * _pct * 100) / 100;
    }
    comisiones.push({
      chica: row[0],
      area: row[1],
      servicios: Number(row[2]) || 0,
      facturado: _facturado,
      porcentaje: row[4],
      comision: _comision
    });
  }
  return { success: true, comisiones: comisiones };
}

function updateComision(chicaNombre, precio) {
  const ws = getSheet('Comisiones');
  const data = ws.getDataRange().getValues();
  const precioNum = Number(precio) || 0;
  if (precioNum <= 0) return;

  // FIX: i=3 — María está en fila 4 (índice 3), i=4 la saltaba
  for (let i = 3; i < data.length; i++) {
    if (String(data[i][0]).trim() === chicaNombre) {
      const row = i + 1;
      const servicios = (Number(data[i][2]) || 0) + 1;
      const facturado = (Number(data[i][3]) || 0) + precioNum;
      
      // Determinar porcentaje: 40% si el área dice Facial, sino 30%
      const areaStr = String(data[i][1] || '').toLowerCase();
      const pctStr = String(data[i][4] || '');
      let pct = 0.3;
      if (areaStr.includes('facial') || pctStr.includes('40')) {
        pct = 0.4;
      }
      const comision = facturado * pct;

      ws.getRange(row, 3).setNumberFormat('0').setValue(servicios);
      ws.getRange(row, 4).setNumberFormat('0.00').setValue(facturado);
      ws.getRange(row, 6).setNumberFormat('0.00').setValue(Math.round(comision * 100) / 100);
      return;
    }
  }
}

// ============================================
// SINCRONIZAR SERVICIOS EN ATENCIÓN
// Cuando la chica agrega/modifica/quita servicios, se actualiza en ListaEspera
// para que Mikaela vea en tiempo real qué servicios tiene la clienta
// ============================================
// Categoría de un área de slot TM para emparejar con la división del combo nuevo.
function _catSlotTM(areaKey) {
  var a = String(areaKey || '').toLowerCase();
  if (a.indexOf('pest') >= 0) return 'pestanas';
  if (a.indexOf('facial') >= 0) return 'facial';
  return 'cejas'; // cejas, depilacion, bigote, retiro, lifting, pigmento → categoría cejas
}

function handleUpdateServiciosAtencion(data) {
  // ── DEDUP defensivo del string de servicios: evita "A + B + B + A" si llega duplicado
  // desde cualquier vía. No toca el total (ese ya viene correcto del frontend).
  if (data && data.servicios) {
    var _seenSv = {}, _outSv = [];
    String(data.servicios).split(' + ').forEach(function(p) {
      var t = String(p).trim(); if (!t) return;
      var k = t.toLowerCase(); if (_seenSv[k]) return; _seenSv[k] = true; _outSv.push(t);
    });
    data.servicios = _outSv.join(' + ');
  }
  // espejo Lineas: reflejar el cambio de servicio / aplicar promo en la línea de esa staff.
  // Matchea por idEspera/promoRef o código+staff → cubre SN, SP y TM (donde estaba el hueco).
  try { lineaActualizarPorCambio(data); } catch (eLn) { Logger.log('espejo cambio Lineas: ' + eLn); }
  // Intentar primero en ServicioNormal (tickets SN-)
  try {
    const wsN = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const rowsN = wsN.getDataRange().getValues();
    for (let i = 1; i < rowsN.length; i++) {
      const id     = String(rowsN[i][0]||'').trim();
      const estado = String(rowsN[i][8]||'').toLowerCase();
      const tomada = String(rowsN[i][9]||'').trim();
      const nombre = String(rowsN[i][4]||'').trim();
      const codigo = String(rowsN[i][3]||'').trim();
      const matchId = data.idEspera && id === String(data.idEspera).trim();
      const matchN = nombre === data.clienteNombre;
      const matchC = data.clienteCodigo && codigo === String(data.clienteCodigo).trim();
      if (id.startsWith('SN-') && estado === 'en servicio' && (matchId || (tomada === data.chicaNombre && (matchN || matchC)))) {
        const row = i + 1;
        const bwN = _batchWriter_(wsN);
        bwN.set(row, 6,  data.servicios || '');
        bwN.set(row, 13, data.total || '0');
        if (data.promoNombre) {
          bwN.set(row, 14, data.promoNombre);
          bwN.set(row, 19, 'SP');
          bwN.set(row, 20, Number(data.precioRegular || data.total || 0));
          bwN.set(row, 21, Number(data.precioPromo   || data.total || 0));
        } else {
          bwN.set(row, 19, 'SN');
          bwN.set(row, 20, Number(data.total || 0));
          bwN.set(row, 21, '');
        }
        bwN.flush();
        return { success: true };
      }
    }
  } catch(eN) {}

  // Intentar en ServicioPromo (tickets SP-)
  try {
    const wsP = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const rowsP = wsP.getDataRange().getValues();
    for (let i = 1; i < rowsP.length; i++) {
      const id     = String(rowsP[i][0]||'').trim();
      const estado = String(rowsP[i][8]||'').toLowerCase();
      const tomada = String(rowsP[i][9]||'').trim();
      const nombre = String(rowsP[i][4]||'').trim();
      const codigo = String(rowsP[i][3]||'').trim();
      const matchId = data.idEspera && id === String(data.idEspera).trim();
      const matchN  = nombre === data.clienteNombre;
      const matchC  = data.clienteCodigo && codigo === String(data.clienteCodigo).trim();
      if (id.startsWith('SP-') && estado === 'en servicio' && (matchId || (tomada === data.chicaNombre && (matchN || matchC)))) {
        const row = i + 1;
        const bwP = _batchWriter_(wsP);
        bwP.set(row, 6,  data.servicios || '');
        bwP.set(row, 13, data.total || '0');
        if (data.promoNombre) {
          bwP.set(row, 14, data.promoNombre);
          bwP.set(row, 19, 'SP');
          bwP.set(row, 20, Number(data.precioRegular || data.total || 0));
          bwP.set(row, 21, Number(data.precioPromo   || data.total || 0));
        } else {
          bwP.set(row, 19, data.tipo || 'SP');
          bwP.set(row, 20, Number(data.total || 0));
        }
        bwP.flush();
        return { success: true };
      }
    }
  } catch(eP) {}

  // Intentar en TicketMulti (tickets TM-)
  try {
    const wsTM = getTMSheet();
    const rowsTM = wsTM.getRange(3, 1, Math.max(1, wsTM.getLastRow() - 2), 37).getValues();
    for (let i = 0; i < rowsTM.length; i++) {
      const tmId = String(rowsTM[i][0] || '').trim();
      if (!tmId.startsWith('TM-')) continue;
      const matchId = data.idEspera && tmId === String(data.idEspera).trim();
      const tmNombre = String(rowsTM[i][2] || '').trim();
      const matchN = tmNombre === data.clienteNombre;
      if (!matchId && !matchN) continue;

      // Encontrar el área de esta staff en el TM y actualizar tentativo + precio
      const rowNum = i + 3;
      for (let a = 0; a < 4; a++) {
        const base = TM_AREA_COL[a];
        const tent = String(rowsTM[i][base] || '').trim();
        const staffEnArea = String(rowsTM[i][base + 2] || '').trim();
        const estadoArea = String(rowsTM[i][base + 3] || '').toLowerCase();
        if (!tent) continue;
        if (staffEnArea === data.chicaNombre && estadoArea === 'en servicio') {
          // Actualizar tentativo: mantener el prefijo "area||" y actualizar el servicio
          const tentParts = tent.split('||');
          const areaPrefix = tentParts[0] || '';
          const newTent = areaPrefix + '||' + (data.servicios || tentParts[1] || tent);
          wsTM.getRange(rowNum, base + 1).setValue(newTent); // col base (0-indexed) = base+1 (1-indexed)
          // Actualizar precio en TM_PRECIO_COL
          const aIdx = TM_AREA_COL.indexOf(base);
          if (aIdx >= 0) wsTM.getRange(rowNum, TM_PRECIO_COL[aIdx] + 1).setValue(Number(data.total || 0));
          // reflejar en memoria para el recálculo de totales
          rowsTM[i][base] = newTent;
          if (aIdx >= 0) rowsTM[i][TM_PRECIO_COL[aIdx]] = Number(data.total || 0);

          // ── PROPAGAR el cambio de combo a las OTRAS áreas del ticket ─────────
          // Al cambiar a una promo nueva, las otras áreas del ticket deben reflejar el
          // combo NUEVO:
          //   • si el combo nuevo INCLUYE esa área → ACTUALIZAR nombre + precio nuevos
          //     (así la otra staff —ej. María en cejas— ve el combo correcto, no el viejo).
          //   • si NO la incluye → CANCELAR (huérfana).
          // Nunca se toca un área ya tomada/en servicio/completada (se protege el trabajo).
          // data.promoDivision: [{cat:'cejas'|'pestanas'|'facial', servicio, monto}]
          let _divNueva = [];
          try { _divNueva = JSON.parse(String(data.promoDivision || '[]')); } catch (eD) { _divNueva = []; }
          const _comboNuevo = String(data.promoNombre || data.servicios || '').trim();
          const _nuevasAreas = String(data.promoAreas || '')
            .toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          // pool de entradas del combo nuevo (se consumen 1 a 1 por categoría para no duplicar)
          const _pool = (Array.isArray(_divNueva) ? _divNueva : []).map(function (d) {
            return { cat: String(d.cat || '').toLowerCase(), servicio: String(d.servicio || ''), monto: Number(d.monto || 0), usada: false };
          });
          for (let b2 = 0; b2 < 4; b2++) {
            const base2 = TM_AREA_COL[b2];
            if (base2 === base) continue;                       // no tocar la propia
            const tent2 = String(rowsTM[i][base2] || '').trim();
            if (!tent2) continue;                               // área vacía
            const estado2 = String(rowsTM[i][base2 + 3] || '').toLowerCase();
            const pendiente = (estado2 === '' || estado2 === 'esperando' || estado2 === 'espera' || estado2 === 'pendiente');
            if (!pendiente) continue;                           // proteger trabajo ya tomado/en curso
            const areaKey2 = (tent2.split('||')[0] || '');
            const cat2 = _catSlotTM(areaKey2);
            // buscar una entrada NO usada del combo nuevo con esa categoría
            let _match = null;
            for (let p = 0; p < _pool.length; p++) {
              if (!_pool[p].usada && _pool[p].cat === cat2) { _match = _pool[p]; _pool[p].usada = true; break; }
            }
            if (_match) {
              // el combo nuevo incluye esta área → ACTUALIZAR al combo nuevo
              const _nuevoTent = areaKey2 + '||' + (_comboNuevo || _match.servicio || (tent2.split('||')[1] || ''));
              wsTM.getRange(rowNum, base2 + 1).setValue(_nuevoTent);
              wsTM.getRange(rowNum, TM_PRECIO_COL[b2] + 1).setValue(Number(_match.monto || 0));
              rowsTM[i][base2] = _nuevoTent;
              rowsTM[i][TM_PRECIO_COL[b2]] = Number(_match.monto || 0);
            } else if (_pool.length === 0 && _nuevasAreas.length && _nuevasAreas.indexOf((tent2.split('||')[0] || '').toLowerCase()) >= 0) {
              // fallback (frontend viejo sin división): el área está en la promo nueva → no tocar
              continue;
            } else {
              // el combo nuevo NO incluye esta área → CANCELAR (huérfana)
              wsTM.getRange(rowNum, base2 + 1).setValue('');
              wsTM.getRange(rowNum, base2 + 3 + 1).setValue('Cancelado');
              wsTM.getRange(rowNum, TM_PRECIO_COL[b2] + 1).setValue(0);
              rowsTM[i][base2] = '';
              rowsTM[i][base2 + 3] = 'Cancelado';
              rowsTM[i][TM_PRECIO_COL[b2]] = 0;
              try { anularLineaSlotTM(tmId, b2); } catch (eAnu) { Logger.log('anular slot TM Lineas: ' + eAnu); }
            }
          }

          // ── Recalcular totales del ticket (solo áreas NO canceladas) ──
          let _normalArr = [];
          try { _normalArr = JSON.parse(String(rowsTM[i][36] || '[]')); } catch (eA) { _normalArr = []; }
          let _sumPromo = 0, _sumNormal = 0;
          for (let b3 = 0; b3 < 4; b3++) {
            const base3 = TM_AREA_COL[b3];
            const tent3 = String(rowsTM[i][base3] || '').trim();
            const est3  = String(rowsTM[i][base3 + 3] || '').toLowerCase();
            if (!tent3 || est3 === 'cancelado') continue;
            const pPromo = Number(rowsTM[i][TM_PRECIO_COL[b3]] || 0);
            let pNormal;
            if (base3 === base) pNormal = Number(data.precioRegular || data.total || pPromo);
            else if (Array.isArray(_normalArr) && _normalArr[b3] !== undefined && Number(_normalArr[b3]) > 0) pNormal = Number(_normalArr[b3]);
            else pNormal = pPromo;
            _sumPromo  += pPromo;
            _sumNormal += pNormal;
          }
          wsTM.getRange(rowNum, 35).setValue(Math.round(Math.max(_sumNormal, _sumPromo) * 100) / 100); // row[34]=totalNormalTM (1-idx 35)
          wsTM.getRange(rowNum, 36).setValue(Math.round(_sumPromo * 100) / 100);                       // row[35]=totalPromoTM  (1-idx 36)

          return { success: true };
        }
      }
    }
  } catch(eTM) {}

  // Fallback: buscar en ListaEspera (tickets LE-)
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();

    const codigoRow3 = String(allData[i][3] || '').trim();
    const matchN3 = nombre === data.clienteNombre;
    const matchC3 = data.clienteCodigo && codigoRow3 === String(data.clienteCodigo).trim();
    if (estado === 'en servicio' && tomadaPor === data.chicaNombre && (matchN3 || matchC3)) {
      const row = i + 1;
      ws.getRange(row, 6).setValue(data.servicios || '');
      ws.getRange(row, 13).setValue(data.total || '0');
      return { success: true };
    }
  }
  return { success: false, message: 'Atención no encontrada' };
}

// ============================================
// DEVOLVER CLIENTA A LISTA DE ESPERA
// ============================================
function handleDevolverALista(data) {
  const id      = String(data.idEspera || '').trim();
  const chica   = String(data.chicaNombre || '').trim();
  const cliente = String(data.clienteNombre || '').trim();
  const motivo  = data.motivo || '';

  // Revertir una fila de ServicioNormal/ServicioPromo a "Esperando"
  function revertirServicio(sheetName, cols) {
    const ws = getOrCreateSheet(sheetName, cols);
    const rows = ws.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() !== id) continue;
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (estado !== 'en servicio') return { success: false, message: 'La clienta ya no está en servicio.' };
      const row = i + 1;
      ws.getRange(row, 9).setValue('Esperando');  // I: Estado
      ws.getRange(row, 10).setValue('');           // J: Tomada por
      ws.getRange(row, 11).setValue('');           // K: Hora toma
      if (motivo) {
        const obs = String(rows[i][11] || '');
        ws.getRange(row, 12).setValue((obs ? obs + ' | ' : '') + 'Devuelta por ' + chica + ': ' + motivo);
      }
      // espejo Lineas: la línea vuelve a 'esperando' y se libera el staff (id = SP-/SN- = promoRef exacto)
      try { revertirLineaAEsperaPorCodigo(String(rows[i][3] || ''), id, '', ''); } catch (eLn) { Logger.log('espejo devolver Lineas: ' + eLn); }
      cerrarAtencion(id, chica, cliente, '', '', '', 'Devuelto');
      return { success: true };
    }
    return { success: false, message: 'Ticket no encontrado.' };
  }

  if (id.indexOf('SN-') === 0) return revertirServicio('ServicioNormal', COLS_NORMAL);
  if (id.indexOf('SP-') === 0) return revertirServicio('ServicioPromo',  COLS_PROMO);

  // Ticket multi: devolver el área que esta staff tiene en servicio
  if (id.indexOf('TM-') === 0) {
    const ws = getTMSheet();
    const last = ws.getLastRow();
    if (last < 3) return { success: false, message: 'Ticket no encontrado.' };
    const rows = ws.getRange(3, 1, last - 2, 37).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== id) continue;
      const rowNum = i + 3;
      for (let a = 0; a < 4; a++) {
        const base = TM_AREA_COL[a];
        const staffArea  = String(rows[i][base + 2] || '').trim();
        const estadoArea = String(rows[i][base + 3] || '').toLowerCase().trim();
        if (staffArea === chica && estadoArea === 'en servicio') {
          ws.getRange(rowNum, base + 3 + 1).setValue('Esperando'); // estado
          ws.getRange(rowNum, base + 2 + 1).setValue('');          // staff
          ws.getRange(rowNum, base + 4 + 1).setValue('');          // hora toma
          // espejo Lineas: revertir la línea del área devuelta (match por código + área)
          try { revertirLineaAEsperaPorCodigo(String(rows[i][3] || ''), '', String(rows[i][base] || '').split('||')[0].toLowerCase(), ''); } catch (eLn) { Logger.log('espejo devolver Lineas: ' + eLn); }
          cerrarAtencion(id, chica, cliente, '', '', '', 'Devuelto');
          return { success: true };
        }
      }
      return { success: false, message: 'No tenés un área en servicio en este ticket.' };
    }
    return { success: false, message: 'Ticket no encontrado.' };
  }

  // ListaEspera (LE-) — match por id si viene, si no por estado+chica+nombre
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  for (let i = 3; i < allData.length; i++) {
    const rid = String(allData[i][0] || '').trim();
    if (!rid.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();
    const matchId = id && rid === id;
    const matchFallback = !id && estado === 'en servicio' && tomadaPor === chica && nombre === cliente;
    if (!(matchId || matchFallback)) continue;
    if (estado !== 'en servicio') return { success: false, message: 'La clienta ya no está en servicio.' };
    const row = i + 1;
    ws.getRange(row, 9).setValue('Esperando');
    ws.getRange(row, 10).setValue('');
    ws.getRange(row, 11).setValue('');
    if (motivo) {
      const obsActual = String(allData[i][11] || '');
      ws.getRange(row, 12).setValue((obsActual ? obsActual + ' | ' : '') + 'Devuelta por ' + chica + ': ' + motivo);
    }
    // espejo Lineas: revertir la línea a 'esperando' (match por código + área de la fila LE-)
    try { revertirLineaAEsperaPorCodigo(String(allData[i][3] || ''), '', String(allData[i][6] || '').toLowerCase(), ''); } catch (eLn) { Logger.log('espejo devolver Lineas: ' + eLn); }
    cerrarAtencion(id, chica, cliente, '', '', '', 'Devuelto');
    return { success: true };
  }
  return { success: false, message: 'Atención no encontrada' };
}

// ============================================
// FICHAS DE PESTAÑAS
// ============================================
function handleGetPerfilFichas(params) {
  var codigo = String(params.codigo || '').trim();
  var fichasPestanas = [], fichaFacial = null, historialFacial = [], fichasPigmento = [];
  try { var p = handleGetFichaPestanas({ codigo: codigo });      if (p && p.fichas)     fichasPestanas  = p.fichas; } catch (e) {}
  try { var f = handleGetFichaFacial({ codigo: codigo });        if (f && f.ficha)      fichaFacial     = f.ficha; } catch (e) {}
  try { var h = handleGetHistorialFacial({ codigo: codigo });    if (h && h.historial)  historialFacial = h.historial; } catch (e) {}
  try { var g = handleGetFichaCejasPigmento({ codigo: codigo }); if (g && g.fichas)     fichasPigmento  = g.fichas; } catch (e) {}
  return { success: true, fichasPestanas: fichasPestanas, fichaFacial: fichaFacial, historialFacial: historialFacial, fichasPigmento: fichasPigmento };
}

function handleGetFichaPestanas(params) {
  const ws = getSheet('FichaPestanas');
  const data = ws.getDataRange().getValues();
  const fichas = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim() === String(params.codigo).trim()) {
      fichas.push({
        nroFicha: row[2],
        modelo: row[3],
        diseno: row[4],
        tallas: row[5],
        obs: row[6],
        fecha: row[7],
        activa: String(row[8]).toLowerCase() === 'sí'
      });
    }
  }
  // Última visita de pestañas (servicio + staff + fecha) desde HistorialOwner — para mostrarla en atención
  var ultimaVisita = null;
  try {
    var wsH = getSheet('HistorialOwner');
    var dataH = wsH.getDataRange().getValues();
    for (var k = dataH.length - 1; k >= 3; k--) {
      var areaH = String(dataH[k][6] || '').toLowerCase();
      if (String(dataH[k][2] || '').trim() === String(params.codigo).trim() && areaH.indexOf('pesta') >= 0) {
        var fv = dataH[k][0], fStr;
        try {
          if (fv instanceof Date) { fStr = Utilities.formatDate(fv, 'America/Guayaquil', 'dd/MM/yy'); }
          else { fStr = String(fv || ''); var mm = fStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (mm) fStr = mm[1] + '/' + mm[2] + '/' + mm[3].slice(2); }
        } catch (e2) { fStr = String(fv || ''); }
        ultimaVisita = { servicio: dataH[k][5], staff: dataH[k][7], fecha: fStr };
        break;
      }
    }
  } catch (e) {}
  return { success: true, fichas: fichas, ultimaVisita: ultimaVisita };
}

function handleAddFichaPestanas(data) {
  const ws = getSheet('FichaPestanas');
  const allData = ws.getDataRange().getValues();

  // Desactivar fichas anteriores de esta clienta
  for (let i = 2; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === String(data.codigo).trim() && String(allData[i][8]).toLowerCase().includes('s')) {
      ws.getRange(i + 1, 9).setValue('No');
    }
  }

  // Contar fichas existentes
  const existentes = allData.filter(r => r[0] === data.codigo).length - (allData[0] ? 0 : 0);
  const nroFicha = existentes + 1;

  // Máximo 5: si ya tiene 5, eliminar la más antigua
  if (nroFicha > 5) {
    for (let i = 2; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === String(data.codigo).trim()) {
        ws.deleteRow(i + 1);
        break;
      }
    }
  }

  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  const nroFinal = nroFicha > 5 ? 5 : nroFicha;
  const existentesCount = allData.filter(r => String(r[0]).trim() === String(data.codigo).trim()).length;
  ws.appendRow([
    data.codigo, data.nombre || '', nroFinal,
    data.modelo, data.diseno || '—', data.tallas || '—',
    data.obs || '', today, 'Sí'
  ]);

  return { success: true };
}


// ============================================
// EVIDENCIAS DE PESTAÑAS
// Guarda hasta 6 fotos (antes izq/der, después izq/der, línea agua izq/der)
// en Google Drive y almacena las URLs en FichaPestanas cols J-Q.
// ============================================

// ID de la carpeta de Drive donde se guardan las evidencias.
// Crear manualmente una carpeta "NexServ Evidencias" en Drive, compartirla
// con la cuenta de servicio, y poner su ID aquí o en ScriptProperties.
function _evidenciasFolderId_() {
  var id = PropertiesService.getScriptProperties().getProperty('EVIDENCIAS_FOLDER_ID');
  if (id) return id;
  // Fallback: crear la carpeta automáticamente si no existe
  var folders = DriveApp.getFoldersByName('NexServ Evidencias');
  if (folders.hasNext()) return folders.next().getId();
  var folder = DriveApp.createFolder('NexServ Evidencias');
  PropertiesService.getScriptProperties().setProperty('EVIDENCIAS_FOLDER_ID', folder.getId());
  return folder.getId();
}

// Mapa de tipos de foto a índice de columna en FichaPestanas (0-indexed desde col A)
var EVIDENCIA_COLS = {
  'antes_izq':    9,   // J
  'antes_der':    10,  // K
  'despues_izq':  11,  // L
  'despues_der':  12,  // M
  'linea_izq':    13,  // N
  'linea_der':    14,  // O
  // fecha y staff de evidencia
  '_fecha_ev':    15,  // P
  '_staff_ev':    16   // Q
};

function handleSubirEvidenciaPestanas(data) {
  try {
    var codigo  = String(data.codigo || '').trim();
    var tipo    = String(data.tipo   || '').trim();   // 'antes_izq' | 'antes_der' | etc.
    var base64  = String(data.imagen || '').trim();   // base64 sin prefijo data:
    var staff   = String(data.staff  || 'admin').trim();
    var fecha   = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

    if (!codigo || !tipo || !base64) return { success: false, message: 'Datos incompletos' };
    if (!(tipo in EVIDENCIA_COLS))   return { success: false, message: 'Tipo inválido: ' + tipo };

    // Guardar imagen en Drive
    var colIdx  = EVIDENCIA_COLS[tipo];
    var blob    = Utilities.newBlob(Utilities.base64Decode(base64), 'image/jpeg',
                    codigo + '_' + tipo + '_' + fecha.replace(/\//g,'-') + '.jpg');
    var folder  = DriveApp.getFolderById(_evidenciasFolderId_());
    // Eliminar foto anterior del mismo tipo para esta clienta (evitar acumular)
    var existing = folder.getFilesByName(blob.getName());
    while (existing.hasNext()) existing.next().setTrashed(true);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    // Actualizar FichaPestanas — buscar la ficha activa de esta clienta
    var ws = getSheet('FichaPestanas');
    var rows = ws.getDataRange().getValues();
    var fichaRow = -1;
    for (var i = rows.length - 1; i >= 2; i--) {
      var _activa = String(rows[i][8]).trim().toLowerCase(); var _esActiva = _activa === 's' || _activa === 'si' || _activa === 'true' || _activa === 'activa' || _activa === '1';
      if (String(rows[i][0]).trim() === codigo && _esActiva) {
        fichaRow = i + 1; // 1-indexed
        break;
      }
    }
    // Si no hay ficha activa marcada, buscar cualquier ficha reciente de esta clienta
    if (fichaRow < 0) {
      for (var j = rows.length - 1; j >= 2; j--) {
        if (String(rows[j][0]).trim() === codigo) {
          fichaRow = j + 1; break;
        }
      }
    }
    if (fichaRow < 0) return { success: false, message: 'No se encontró ficha para esta clienta (código: ' + codigo + ')' };

    ws.getRange(fichaRow, colIdx + 1).setValue(url);
    ws.getRange(fichaRow, EVIDENCIA_COLS['_fecha_ev'] + 1).setValue(fecha);
    ws.getRange(fichaRow, EVIDENCIA_COLS['_staff_ev'] + 1).setValue(staff);

    return { success: true, url: url, tipo: tipo };
  } catch(e) {
    Logger.log('handleSubirEvidenciaPestanas ERROR: ' + e + ' | stack: ' + (e.stack||''));
    return { success: false, message: 'Error al guardar: ' + String(e).substring(0,200) };
  }
}

function handleGetEvidenciasPestanas(params) {
  try {
    var codigo = String(params.codigo || '').trim();
    if (!codigo) return { success: false, message: 'Código requerido' };
    var ws   = getSheet('FichaPestanas');
    var rows = ws.getDataRange().getValues();
    // Buscar ficha activa
    for (var i = rows.length - 1; i >= 2; i--) {
      var _activa = String(rows[i][8]).trim().toLowerCase(); var _esActiva = _activa === 's' || _activa === 'si' || _activa === 'true' || _activa === 'activa' || _activa === '1';
      if (String(rows[i][0]).trim() === codigo && _esActiva) {
        return {
          success: true,
          codigo: codigo,
          fecha:  String(rows[i][7]  || ''),
          staff:  String(rows[i][16] || ''),
          fotos: {
            antes_izq:   String(rows[i][9]  || ''),
            antes_der:   String(rows[i][10] || ''),
            despues_izq: String(rows[i][11] || ''),
            despues_der: String(rows[i][12] || ''),
            linea_izq:   String(rows[i][13] || ''),
            linea_der:   String(rows[i][14] || '')
          }
        };
      }
    }
    // No hay ficha activa — devolver vacío (no error, la staff puede crear evidencia sin ficha técnica previa)
    return { success: true, codigo: codigo, fotos: {
      antes_izq:'', antes_der:'', despues_izq:'', despues_der:'', linea_izq:'', linea_der:''
    }};
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ============================================
// FICHA FACIAL
// ============================================
// ── HISTORIAL DE VISITAS FACIALES ────────────────────────────

function handleAddVisitaFacial(data) {
  try {
    const ws = getOrCreateSheet('HistorialFacial', [
      'Código','Nombre','Fecha','Hora','Servicio','Precio','Staff','Procedimiento','Productos','Observaciones'
    ]);
    const tz  = 'America/Guayaquil';
    const now = new Date();
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');

    ws.appendRow([
      data.codigo        || '',
      data.nombre        || '',
      fecha,
      hora,
      data.servicio      || '',
      Number(data.precio || 0),
      data.staff         || '',
      data.procedimiento || '',
      data.productosUsados || '',
      data.obs           || ''
    ]);

    // NOTA: updateComision NO se llama aquí.
    // La comisión se registra en handleConfirmarCobroNormal cuando Mikaela cobra.
    // Llamarla aquí causaba duplicados (se contaba 2 veces por servicio facial).

    return { success: true };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

function handleGetHistorialFacial(params) {
  try {
    const ws = getOrCreateSheet('HistorialFacial', [
      'Código','Nombre','Fecha','Hora','Servicio','Precio','Staff','Procedimiento','Productos','Observaciones'
    ]);
    const data   = ws.getDataRange().getValues();
    const codigo = String(params.codigo || '').trim();
    if (!codigo) return { success: false, message: 'Falta código' };

    const historial = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() !== codigo) continue;
      historial.push({
        fecha:          data[i][2],
        hora:           data[i][3],
        servicio:       data[i][4],
        precio:         Number(data[i][5] || 0),
        staff:          data[i][6],
        procedimiento:  data[i][7],
        productosUsados:data[i][8],
        obs:            data[i][9]
      });
    }
    // Más reciente primero, máx 10
    historial.reverse();
    return { success: true, historial: historial.slice(0, 10) };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

function handleGetFichaFacial(params) {
  const ws = getSheet('FichaFacial');
  const data = ws.getDataRange().getValues();

  for (let i = 2; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(params.codigo).trim()) {
      return {
        success: true,
        ficha: {
          fecha: data[i][2],
          edad: data[i][3],
          sexo: data[i][4],
          biotipo: data[i][5],
          fototipo: data[i][6],
          tipoPiel: data[i][7],
          signosLesiones: data[i][8],
          signosHiper: data[i][9],
          estadoPiel: data[i][10],
          enfermedades: data[i][11],
          antFamiliares: data[i][12],
          alergias: data[i][13],
          medicamentos: data[i][14],
          quirurgicos: data[i][15],
          esteticos: data[i][16],
          obsExtra: data[i][17]
        }
      };
    }
  }
  return { success: true, ficha: null };
}

function handleUpdateFichaFacial(data) {
  const ws = getSheet('FichaFacial');
  const allData = ws.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  // Buscar si ya existe
  for (let i = 4; i < allData.length; i++) {
    if (allData[i][0] === data.codigo) {
      const row = i + 1;
      ws.getRange(row, 3).setValue(today);
      ws.getRange(row, 4).setValue(data.edad || '');
      ws.getRange(row, 5).setValue(data.sexo || '');
      ws.getRange(row, 6).setValue(data.biotipo || '');
      ws.getRange(row, 7).setValue(data.fototipo || '');
      ws.getRange(row, 8).setValue(data.tipoPiel || '');
      ws.getRange(row, 9).setValue(data.signosLesiones || '');
      ws.getRange(row, 10).setValue(data.signosHiper || '');
      ws.getRange(row, 11).setValue(data.estadoPiel || '');
      ws.getRange(row, 12).setValue(data.enfermedades || '');
      ws.getRange(row, 13).setValue(data.antFamiliares || data.antecedentes || '');
      ws.getRange(row, 14).setValue(data.alergias || '');
      ws.getRange(row, 15).setValue(data.medicamentos || '');
      ws.getRange(row, 16).setValue(data.quirurgicos || '');
      ws.getRange(row, 17).setValue(data.esteticos || '');
      ws.getRange(row, 18).setValue(data.obsExtra || '');
      return { success: true, updated: true };
    }
  }

  // Crear nueva
  ws.appendRow([
    data.codigo, data.nombre || '', today,
    data.edad || '', data.sexo || '', data.biotipo || '',
    data.fototipo || '', data.tipoPiel || '',
    data.signosLesiones || '', data.signosHiper || '', data.estadoPiel || '',
    data.enfermedades || '', data.antFamiliares || data.antecedentes || '',
    data.alergias || '', data.medicamentos || '', data.quirurgicos || '',
    data.esteticos || '', data.obsExtra || ''
  ]);

  return { success: true, created: true };
}

// ============================================
// FICHA CEJAS EFECTO POLVO (PIGMENTACIÓN)
// Columnas: A=# | B=Código | C=Fecha | D=Color | E=Aguja | F=TipoSesion | G=Observaciones | H=Responsable | I=ProxRetoque
// ============================================
function handleGetFichaCejasPigmento(params) {
  const ws = getSheet('FichaCejasPigmento');
  if (!ws) return { success: true, fichas: [] };
  
  const data = ws.getDataRange().getValues();
  const fichas = [];

  // Detectar dónde empiezan los datos: buscar primera fila con código de cliente (C-XXXX)
  var dataStartIdx = 1;
  for (var di = 0; di < Math.min(data.length, 8); di++) {
    if (String(data[di][1] || '').match(/^C-\d+$/)) { dataStartIdx = di; break; }
    if (di >= 4 && String(data[di][1] || '').trim() !== '' && !String(data[di][1] || '').includes('#')) { dataStartIdx = di; break; }
  }
  for (let i = dataStartIdx; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; // Saltar filas vacías
    if (String(row[1]).trim() === String(params.codigo || '').trim()) {
      fichas.push({
        id: row[0],
        codigo: row[1],
        fecha: row[2],
        color: row[3],
        aguja: row[4],
        tipoSesion: row[5],
        observaciones: row[6],
        responsable: row[7],
        proxRetoque: row[8]
      });
    }
  }
  
  return { success: true, fichas: fichas };
}

function handleAddFichaCejasPigmento(data) {
  try {
    var ws = getSheet('FichaCejasPigmento');
    if (!ws) {
      // Auto-crear la hoja si no existe
      var ss = SpreadsheetApp.openById(SHEET_ID);
      ws = ss.insertSheet('FichaCejasPigmento');
      // Encabezados: ID | Código | Fecha | Color | Aguja | TipoSesión | Obs | Responsable | PróxRetoque
      ws.getRange(1, 1, 1, 9).setValues([['ID','Código','Fecha','Color','Aguja','Tipo Sesión','Observaciones','Responsable','Próx. Retoque']]);
      ws.getRange(1,1,1,9).setFontWeight('bold');
    }
    
    const allData = ws.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
    
    // Buscar último ID (empezar desde fila 6, índice 5 - filas 1-4=headers, fila 5=encabezados columnas)
    // Detectar inicio de datos dinámicamente
    var addStartIdx = 1;
    for (var dj = 0; dj < Math.min(allData.length, 8); dj++) {
      if (String(allData[dj][1] || '').match(/^C-\d+$/)) { addStartIdx = dj; break; }
    }
    let maxNum = 0;
    for (let i = addStartIdx; i < allData.length; i++) {
      const id = String(allData[i][0] || '').trim();
      if (id) {
        const num = parseInt(id);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const newId = maxNum + 1;
    
    // Calcular próximo retoque si es "Nueva sesión"
    let proxRetoque = '';
    if (data.tipoSesion === 'Nueva sesión') {
      const fechaActual = new Date();
      // Agregar 37 días (promedio entre 30-45)
      fechaActual.setDate(fechaActual.getDate() + 37);
      proxRetoque = Utilities.formatDate(fechaActual, 'America/Guayaquil', 'dd/MM/yyyy');
    }
    
    // Máximo 5 sesiones: eliminar la más antigua si se supera
    var sesionesCliente = [];
    for (var i = addStartIdx; i < allData.length; i++) {
      if (String(allData[i][1]||'').trim() === String(data.codigo||'').trim()) sesionesCliente.push(i+1);
    }
    if (sesionesCliente.length >= 5) ws.deleteRow(sesionesCliente[0]);

    // Agregar fila
    ws.appendRow([
      newId,
      data.codigo || '',
      today,
      data.color || '',
      data.aguja || '',
      data.tipoSesion || '',
      data.observaciones || '',
      data.responsable || '',
      proxRetoque
    ]);
    
    return { success: true, id: newId, proxRetoque: proxRetoque };
  } catch (err) {
    return { success: false, error: 'Error en handleAddFichaCejasPigmento: ' + err.toString() };
  }
}

// ============================================
// CIERRES Y PAGOS
// ============================================
function handleGetCierresSemana() {
  const ws = getSheet('CierresSemana');
  if (!ws) return { success: true, cierres: [] };
  const data = ws.getDataRange().getValues();
  const cierres = [];

  // Fila 4 = encabezados (Semana|Desde|Hasta|Chica|Servicios|Facturado|Comision pagada|Fecha pago)
  // Datos desde fila 5 = indice 4
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const fechaPago = row[7] instanceof Date
      ? Utilities.formatDate(row[7], 'America/Guayaquil', 'dd/MM/yyyy HH:mm')
      : String(row[7] || '');
    cierres.push({
      semana: row[0],
      desde: row[1],
      hasta: row[2],
      chica: row[3],
      servicios: row[4],
      facturado: Number(row[5] || 0),
      comision: Number(row[6] || 0),
      fechaPago: fechaPago
    });
  }
  return { success: true, cierres: cierres };
}

function handleGetCierresPagos() {
  const ws = getSheet('CierresPagos');
  const data = ws.getDataRange().getValues();
  const cierres = [];

  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    cierres.push({
      semana: row[0],
      periodo: row[1],
      fechaCierre: row[2] instanceof Date
        ? Utilities.formatDate(row[2], 'America/Guayaquil', 'dd/MM/yyyy HH:mm')
        : String(row[2] || ''),
      chica: row[3],
      area: row[4],
      comisionPct: row[5],
      servicios: row[6],
      facturado: row[7],
      comision: row[8],
      estadoPago: row[9]
    });
  }
  return { success: true, cierres: cierres };
}

function handleCierreSemanal(data) {
  const wsCom = getSheet('Comisiones');
  const wsPagos = getSheet('CierresPagos');
  const comData = wsCom.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  // Columnas Comisiones: A=Chica | B=Área | C=Servicios | D=Facturado | E=% Comisión | F=Comisión
  // FIX: i=3 — María está en fila 4 (índice 3)
  for (let i = 3; i < comData.length; i++) {
    const row = comData[i];
    if (!row[0]) continue;

    // Guardar en CierresPagos
    wsPagos.appendRow([
      data.semana, data.periodo, today,
      row[0], row[1], row[4], row[2], row[3], row[5], 'Pagado'
    ]);

    // Resetear comisiones a 0
    wsCom.getRange(i + 1, 3).setValue(0); // col C = servicios
    wsCom.getRange(i + 1, 4).setValue(0); // col D = facturado
    wsCom.getRange(i + 1, 6).setValue(0); // col F = comisión
  }

  // Actualizar cabecera de Comisiones con la nueva semana
  try {
    const nowDate = new Date();
    const diaSemana = nowDate.getDay();
    const diasDesdeElLunes = (diaSemana + 6) % 7;
    const lunesProximo = new Date(nowDate);
    lunesProximo.setDate(nowDate.getDate() - diasDesdeElLunes + 7); // próximo lunes
    lunesProximo.setHours(0, 0, 0, 0);
    const sabadoProximo = new Date(lunesProximo);
    sabadoProximo.setDate(lunesProximo.getDate() + 5);

    const fmt = (d) => Utilities.formatDate(d, 'America/Guayaquil', 'dd/MM/yyyy');
    
    // Número de semana del año
    const primerDiaAnio = new Date(lunesProximo.getFullYear(), 0, 1);
    const semanaNum = Math.ceil(((lunesProximo - primerDiaAnio) / 86400000 + primerDiaAnio.getDay() + 1) / 7);
    
    const nuevaLabel = 'Semana ' + semanaNum + ' · Lunes ' + fmt(lunesProximo) + ' — Sábado ' + fmt(sabadoProximo) + ' · Corte manual';
    wsCom.getRange(2, 1).setValue(nuevaLabel);
  } catch(e) {}

  return { success: true, message: 'Semana cerrada y comisiones reseteadas' };
}

function handleVerificarCierreAutomatico() {
  const wsCom = getSheet('Comisiones');
  const comData = wsCom.getDataRange().getValues();
  const now = new Date();
  
  // Obtener el lunes de la semana actual
  const diaSemana = now.getDay(); // 0=Dom, 1=Lun...6=Sab
  const diasDesdeElLunes = (diaSemana + 6) % 7;
  const lunesActual = new Date(now);
  lunesActual.setDate(now.getDate() - diasDesdeElLunes);
  lunesActual.setHours(0, 0, 0, 0);
  
  // Leer la fecha de inicio guardada en la hoja (fila 2, col B)
  const fechaInicioRaw = comData[1] ? comData[1][1] : null;
  if (!fechaInicioRaw) return { success: false, message: 'No hay fecha de inicio en Comisiones' };
  
  let fechaInicio;
  if (fechaInicioRaw instanceof Date) {
    fechaInicio = fechaInicioRaw;
  } else {
    const partes = String(fechaInicioRaw).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!partes) return { success: false, message: 'Formato de fecha no reconocido' };
    fechaInicio = new Date(Number(partes[3]), Number(partes[2])-1, Number(partes[1]));
  }
  fechaInicio.setHours(0, 0, 0, 0);
  
  // Si el lunes actual es posterior a la fecha de inicio guardada, hay que hacer cierre
  if (lunesActual <= fechaInicio) {
    return { success: true, cierreRealizado: false, message: 'Semana actual - no se necesita cierre' };
  }
  
  // Calcular semana y período
  const sabado = new Date(lunesActual);
  sabado.setDate(lunesActual.getDate() + 5);
  const fmt = (d) => Utilities.formatDate(d, 'America/Guayaquil', 'dd/MM/yyyy');
  
  // Obtener número de semana del año
  const primerDiaAnio = new Date(lunesActual.getFullYear(), 0, 1);
  const semanaNum = Math.ceil(((lunesActual - primerDiaAnio) / 86400000 + primerDiaAnio.getDay() + 1) / 7);
  
  const semanaLabel = 'Semana ' + semanaNum;
  const periodoLabel = 'Lunes ' + fmt(lunesActual) + ' — Sábado ' + fmt(sabado);
  
  // Ejecutar cierre
  handleCierreSemanal({ semana: semanaLabel, periodo: periodoLabel });
  
  // Actualizar fecha de inicio en fila 2
  wsCom.getRange(2, 1).setValue(semanaLabel + ' · ' + periodoLabel + ' · Corte automático');
  wsCom.getRange(2, 2).setValue(fmt(lunesActual));
  wsCom.getRange(2, 3).setValue(fmt(sabado));
  
  return { success: true, cierreRealizado: true, message: 'Cierre automático realizado: ' + semanaLabel };
}

function handlePagoIndividual(data) {
  const wsPagos = getSheet('CierresPagos');
  const allData = wsPagos.getDataRange().getValues();

  for (let i = 4; i < allData.length; i++) {
    if (allData[i][3] === data.chica && allData[i][0] === data.semana && allData[i][9] !== 'Pagado') {
      wsPagos.getRange(i + 1, 10).setValue('Pagado');
      return { success: true };
    }
  }
  return { success: false };
}

// ============================================
// HISTORIAL OWNER
// ============================================
// Clientas frecuentes del mes, clasificadas POR ÁREA (cejas/facial/pestañas/depilación).
// Una clienta es "frecuente" en un área si tiene >2 visitas (días distintos) en esa área este mes.
function handleGetClientasFrecuentes(params) {
  const ws = getSheet('HistorialOwner');
  if (!ws) return { success: true, clientas: [], mapa: {}, mes: '' };
  const data = ws.getDataRange().getValues();
  const tz = 'America/Guayaquil';
  const mesActual = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  const minVisitas = (params && Number(params.min)) ? Number(params.min) : 3; // "más de 2" = 3+
  const DIAS_INACTIVIDAD = 30;   // pierde la estrella tras 30+ días sin venir
  const _hoyMs = Date.now();
  function _diasDesde(fechaYMD) { // fechaYMD = 'yyyy-MM-dd'
    var p = String(fechaYMD).split('-');
    if (p.length !== 3) return 9999;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Math.floor((_hoyMs - d.getTime()) / 86400000);
  }

  function normArea(a) {
    a = String(a || '').toLowerCase();
    if (a.indexOf('facial') >= 0) return 'facial';
    if (a.indexOf('pest') >= 0) return 'pestanas';
    if (a.indexOf('depil') >= 0) return 'depilacion';
    if (a.indexOf('cej') >= 0) return 'cejas';
    return ''; // retiro/lifting u otras no clasifican por color
  }

  const porCliente = {}; // clave -> { codigo, nombre, diasTotal:{}, areas: { area: {dias} } }

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const fechaRaw = row[0];
    let fechaStr;
    if (fechaRaw instanceof Date) {
      fechaStr = Utilities.formatDate(fechaRaw, tz, 'yyyy-MM-dd');
    } else {
      const p = String(fechaRaw).split('/');
      if (p.length === 3) {
        fechaStr = p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
      } else continue;
    }
    if (String(row[10] || '').toLowerCase() === 'producto') continue; // no contar productos
    // Ya NO se filtra por mes calendario: la estrella se mantiene mientras la clienta
    // siga viniendo (regla de inactividad de 30 días, más abajo), no se reinicia cada mes.

    const codigo = String(row[2] || '').trim();
    const nombre = String(row[3] || '').trim();
    const clave = codigo || nombre;
    if (!clave) continue;
    const areaN = normArea(row[6]);
    if (!porCliente[clave]) porCliente[clave] = { codigo: codigo, nombre: nombre, diasTotal: {}, areas: {}, ultimaVisita: fechaStr };
    porCliente[clave].diasTotal[fechaStr] = true;
    // 'yyyy-MM-dd' se compara lexicográficamente igual que cronológicamente
    if (fechaStr > porCliente[clave].ultimaVisita) porCliente[clave].ultimaVisita = fechaStr;
    if (nombre && !porCliente[clave].nombre) porCliente[clave].nombre = nombre;
    if (areaN) {
      if (!porCliente[clave].areas[areaN]) porCliente[clave].areas[areaN] = {};
      porCliente[clave].areas[areaN][fechaStr] = true;
    }
  }

  const lista = [];
  const mapa = {}; // codigo -> [areas frecuentes]
  Object.keys(porCliente).forEach(function(k) {
    const c = porCliente[k];
    const totalVisitas = Object.keys(c.diasTotal).length;
    const areasFrec = [];
    const areasConteo = {};
    Object.keys(c.areas).forEach(function(ar) {
      const n = Object.keys(c.areas[ar]).length;
      areasConteo[ar] = n;
      if (n >= minVisitas) areasFrec.push(ar);
    });
    // Estrella: la clienta debe (a) ser frecuente (3+ visitas en total, o frecuente en un
    // área) y (b) haber venido en los últimos 30 días. Si pasa 30+ días sin venir, pierde
    // la estrella; mientras siga viniendo seguido, la mantiene (clienta constante).
    const diasSinVenir = _diasDesde(c.ultimaVisita);
    const esFrecuente  = (areasFrec.length > 0 || totalVisitas >= minVisitas);
    if (esFrecuente && diasSinVenir <= DIAS_INACTIVIDAD) {
      lista.push({
        codigo: c.codigo, nombre: c.nombre, visitas: totalVisitas,
        areasFrecuentes: areasFrec, areasConteo: areasConteo, diasSinVenir: diasSinVenir
      });
      if (c.codigo && areasFrec.length > 0) mapa[c.codigo] = areasFrec;
    }
  });
  lista.sort(function(a, b) { return b.visitas - a.visitas; });
  return { success: true, clientas: lista, mapa: mapa, mes: mesActual };
}

function handleGetHistorial(params) {
  const ws = getSheet('HistorialOwner');
  const data = ws.getDataRange().getValues();
  const hoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
  const historial = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    // Formatear fecha correctamente si viene como Date object
    const fechaRaw = row[0];
    const fecha = fechaRaw instanceof Date
      ? Utilities.formatDate(fechaRaw, 'America/Guayaquil', 'dd/MM/yyyy')
      : String(fechaRaw || '');
    // Columnas HistorialOwner: A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor J=Comision K=MetodoPago
    historial.push({
      fecha: fecha,
      hora: row[1] instanceof Date ? Utilities.formatDate(row[1], 'America/Guayaquil', 'HH:mm') : String(row[1] || ''),
      codigo: row[2],
      nombre: row[3],
      esTop: row[4],
      servicio: row[5],
      area: row[6],
      chica: row[7],
      precio: Number(row[8] || 0),
      comision: Number(row[9] || 0),
      metodoPago: row[10],
      notaAjuste: String(row[11] || '')
    });
  }

  // Filtrar por período
  const periodo = params && params.periodo ? params.periodo : 'hoy';
  const filtrados = (periodo === 'todo' || periodo === 'all')
    ? historial
    : periodo === 'hoy'
      ? historial.filter(h => h.fecha === hoy)
      : historial;

  // Separar productos de servicios
  // FIX: los productos tienen metodoPago='Producto' — incluirlos aunque nombre esté vacío
  const soloServicios = filtrados.filter(h => String(h.metodoPago || '').toLowerCase() !== 'producto');
  const soloProductos = filtrados.filter(h => String(h.metodoPago || '').toLowerCase() === 'producto'
                                           || String(h.area || '').toLowerCase() === 'producto');

  // Agrupar servicios por staff
  const porStaff = {};
  soloServicios.forEach(h => {
    const chica = h.chica || 'Sin asignar';
    if (!porStaff[chica]) {
      porStaff[chica] = { chica: chica, servicios: [], totalFacturado: 0, totalComision: 0 };
    }
    porStaff[chica].servicios.push({
      cliente: h.nombre,
      servicio: h.servicio,
      precio: h.precio,
      hora: h.hora,
      fecha: h.fecha,
      comision: h.comision,
      staff: h.chica,
      metodoPago: h.metodoPago,
      notaAjuste: h.notaAjuste || ''
    });
    porStaff[chica].totalFacturado += h.precio;
    porStaff[chica].totalComision += h.comision;
  });

  // Ordenar por facturado desc
  const staffArray = Object.values(porStaff).sort((a, b) => b.totalFacturado - a.totalFacturado);

  // Calcular total de productos
  const totalProductos = soloProductos.reduce((s, p) => s + Number(p.precio || 0), 0);

  return {
    success: true,
    historial: filtrados,
    porStaff: staffArray,
    ventasProductos: soloProductos.map(p => ({
      cliente: p.nombre,
      producto: p.servicio,
      precio: p.precio,
      hora: p.hora,
      metodoPago: p.metodoPago
    })),
    totalProductos: totalProductos,
    periodo: periodo
  };
}

function addHistorialOwner(atencion, data) {
  const ws = getSheet('HistorialOwner');
  const now = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  // Col E = ID del ticket (LE-XXXX, SN-XXXX) para que getServiciosHoy no duplique
  // El merge filtra colE.startsWith('LE-'|'SN-'|'SP-'), evitando duplicados con ListaEspera
  const idTicket = String(atencion[0] || ''); // col A = ID del ticket
  ws.appendRow([
    fecha,                                    // A: Fecha
    hora,                                     // B: Hora
    atencion[3],                              // C: Codigo clienta
    atencion[4],                              // D: Nombre clienta
    idTicket,                                 // E: ID ticket (LE/SN/SP) para dedup merge
    data.servicio || atencion[5] || '',       // F: Servicio
    atencion[6] || data.area || '',           // G: Area
    atencion[9] || data.chicaNombre || '',    // H: Staff nombre
    data.totalCobrado || data.montoChica || 0, // I: Total cobrado
    data.comision || 0,                       // J: Comision
    data.metodoPago || 'Efectivo'             // K: Metodo pago
  ]);
}

// ============================================
// BLOQUEAR / DESBLOQUEAR USUARIO
// ============================================
function handleBloquearUsuario(data) {
  const ws = getSheet('Usuarios');
  const allData = ws.getDataRange().getValues();

  for (let i = 2; i < allData.length; i++) {
    if (String(allData[i][1]).trim() === data.userId) {
      const row = i + 1;
      ws.getRange(row, 7).setValue(data.bloquear ? 'Bloqueado' : 'Activo');
      if (data.bloquear) {
        ws.getRange(row, 8).setValue(Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy'));
        ws.getRange(row, 9).setValue(data.motivo || '');
      } else {
        ws.getRange(row, 8).setValue('');
        ws.getRange(row, 9).setValue('');
      }
      return { success: true };
    }
  }
  return { success: false };
}

// ============================================
// UTILIDADES
// ============================================
function updateVisitaClienta(codigo) {
  const ws = getSheet('Clientas');
  const data = ws.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  for (let i = 3; i < data.length; i++) {
    if (data[i][0] === codigo) {
      const row = i + 1;
      ws.getRange(row, 5).setValue(today); // última visita
      ws.getRange(row, 6).setValue((data[i][5] || 0) + 1); // total visitas
      ws.getRange(row, 7).setValue((data[i][6] || 0) + 1); // visitas mes
      return;
    }
  }
}

function getHistorialCliente(codigo) {
  const ws = getSheet('Servicios');
  const data = ws.getDataRange().getValues();
  const historial = { cejas: [], depilacion: [], pestanas: [], facial: [] };

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    // Necesitamos cruzar con Atenciones para obtener el código de clienta
    // Por simplicidad, buscamos por idAtencion
  }

  return historial;
}

// ============================================
// ASIGNACIONES (Mikaela)
// ============================================

function handleAsignarServicioNormal(data) {
  const ws = getSheet('ListaEspera');
  const rows = ws.getDataRange().getValues();
  
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const estado = String(row[8] || '').toLowerCase();
    if (String(row[3]).trim() !== String(data.codigo).trim()) continue;
    if (estado !== 'esperando' && estado !== 'en servicio') continue;
    const fecha = row[1];
    if (fecha instanceof Date && fecha.getFullYear() < 2000) continue;

    ws.getRange(i + 1, 6).setValue(data.servicio);   // F: Servicio
    ws.getRange(i + 1, 7).setValue(data.area);       // G: Área
    ws.getRange(i + 1, 13).setValue(data.precio);    // M: Total/Precio
    // Nota de la visita para la chica (recuadro "Nota Especial"). Solo si viene,
    // para no borrar una observación previa cuando el campo queda vacío.
    if (data.observaciones && String(data.observaciones).trim() !== '') {
      ws.getRange(i + 1, 12).setValue(String(data.observaciones).trim()); // L: Observaciones
    }
    // Asignación a staff puntual (modelo centralizado por Mikaela)
    if (data.chica && String(data.chica).trim() !== '') {
      ws.getRange(i + 1, 10).setValue(String(data.chica).trim()); // J: TomadaPor/Asignada
      if (estado !== 'en servicio') ws.getRange(i + 1, 9).setValue('Asignada'); // I: Estado
    }
    // Marcar como pendiente de confirmación del staff
    if (estado === 'en servicio') {
      ws.getRange(i + 1, 9).setValue('Pendiente-staff');
    }
    
    // ── ESPEJO en Lineas (escritura paralela — Fase 2). No afecta el flujo. ──
    // Acá la clienta de la cola (SYNA o manual) ya tiene datos completos.
    try {
      var _fLE = ws.getRange(i + 1, 1, 1, 18).getValues()[0];
      lineaDesdeAsignacion(_fLE, 'ASIG');
    } catch (eLin) { Logger.log('espejo ASIG: ' + eLin); }

    return { success: true, message: 'Servicio asignado correctamente' };
  }
  
  return { success: false, message: 'Clienta no encontrada en lista de espera' };
}

// La staff confirmó el servicio asignado por Mikaela → volver estado a "En servicio"
function handleActualizarServicioSP(data) {
  // Actualiza el servicio y total en un SP ticket cuando la staff cambia el servicio de enganche
  try {
    const ws = getSheet('ServicioPromo');
    const rows = ws.getDataRange().getValues();
    const idEspera = String(data.idEspera || '').trim();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() !== idEspera) continue;
      // Actualizar servicio (col F=6) y total/precio de esta área (col M=13)
      if (data.nuevoServicio) ws.getRange(i+1, 6).setValue(data.nuevoServicio);
      if (data.nuevoPrecio !== undefined) ws.getRange(i+1, 13).setValue(Number(data.nuevoPrecio));
      // Actualizar desglose si se proporciona
      if (data.desgloseActualizado) ws.getRange(i+1, 18).setValue(JSON.stringify(data.desgloseActualizado));
      // espejo Lineas: actualizar servicio y/o precio de la línea activa de este SP
      try {
        var _cambiosL = {};
        if (data.nuevoServicio)          _cambiosL.servicio = data.nuevoServicio;
        if (data.nuevoPrecio !== undefined) { _cambiosL.monto = Number(data.nuevoPrecio); _cambiosL.montoRegular = Number(data.nuevoPrecio); }
        if (Object.keys(_cambiosL).length > 0) lineaActualizarPorCambio({ promoRef: idEspera, cambios: _cambiosL });
      } catch (eLnSP) { Logger.log('espejo actualizarSP Lineas: ' + eLnSP); }
      return { success: true };
    }
    return { success: false, message: 'SP ticket no encontrado: ' + idEspera };
  } catch(e) { return { success: false, message: String(e) }; }
}

function handleConfirmarServicioStaff(data) {
  const idEspera = String(data.idEspera || '').trim();
  if (!idEspera) return { success: false, message: 'idEspera requerido' };

  const ws = getSheet('ListaEspera');
  const rows = ws.getDataRange().getValues();
  for (let i = 3; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() !== idEspera) continue;
    const estado = String(rows[i][8] || '').toLowerCase();
    if (estado === 'pendiente-staff') {
      ws.getRange(i + 1, 9).setValue('En servicio');
      return { success: true };
    }
    return { success: true, message: 'Ya en servicio' };
  }
  return { success: false, message: 'Ticket no encontrado' };
}

function handleAsignarPromo(data) {
  const ws = getSheet('ListaEspera');
  const rows = ws.getDataRange().getValues();
  
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const estado = String(row[8] || '').toLowerCase();
    if (String(row[3]).trim() !== String(data.codigo).trim()) continue;
    if (estado !== 'esperando' && estado !== 'en servicio' && estado !== 'asignada') continue;
    const fecha = row[1];
    if (fecha instanceof Date && fecha.getFullYear() < 2000) continue;

    // ── 2da/3ra promo del MISMO combo (la clienta ya tiene una promo principal) ──
    // En vez de pisarla o crear otro ticket, se apila en promasExtra (col R). Así a la
    // staff le sale el botón "Yo sigo: siguiente" y la suma al MISMO ticket.
    const yaTienePromoPrincipal = String(row[13] || '').trim() !== ''; // N(14): promoNombre
    if (yaTienePromoPrincipal) {
      let extras = [];
      try { extras = JSON.parse(String(row[17] || '[]')); } catch (e) { extras = []; }
      if (!Array.isArray(extras)) extras = [];
      const nombreNuevo = String(data.promoNombre || '').trim();
      const yaEsta = String(row[13] || '').trim() === nombreNuevo
        || extras.some(function(p){ return p && String(p.nombre || '').trim() === nombreNuevo; });
      if (yaEsta) return { success: true, message: 'Esa promo ya estaba en el ticket', modo: 'duplicada' };
      extras.push({ nombre: data.promoNombre, precio: data.precioPromo, regular: data.precioRegular });
      ws.getRange(i + 1, 18).setValue(JSON.stringify(extras)); // R(18): promasExtra (2a y 3a)
      return { success: true, message: 'Promo agregada como siguiente del combo', modo: 'promasExtra', total: extras.length + 1 };
    }

    // ── 1ra promo del ticket (comportamiento normal) ──
    ws.getRange(i + 1, 6).setValue(data.promoNombre + ' (PROMO)');
    ws.getRange(i + 1, 13).setValue(data.precioPromo);
    ws.getRange(i + 1, 14).setValue(data.promoNombre);
    ws.getRange(i + 1, 15).setValue(data.precioRegular);
    ws.getRange(i + 1, 18).setValue(''); // R(18): limpiar promasExtra stale (evita arrastrar promo vieja)
    // Nota de la visita para la chica (recuadro "Nota Especial"). Solo si viene.
    if (data.observaciones && String(data.observaciones).trim() !== '') {
      ws.getRange(i + 1, 12).setValue(String(data.observaciones).trim()); // L: Observaciones
    }
    // Asignación a staff puntual (modelo centralizado por Mikaela)
    if (data.chica && String(data.chica).trim() !== '') {
      ws.getRange(i + 1, 10).setValue(String(data.chica).trim()); // J: TomadaPor/Asignada
      if (estado !== 'en servicio') ws.getRange(i + 1, 9).setValue('Asignada'); // I: Estado
    }
    
    return { success: true, message: 'Promo asignada correctamente' };
  }
  
  return { success: false, message: 'Clienta no encontrada en lista de espera' };
}

// ============================================
// REASIGNAR STAFF a un área/servicio pendiente (centralizado por Mikaela)
// Sirve para las 4 fuentes: LE-, SN-, SP- y TM-.
// NO fuerza "En servicio": deja el área asignada para que la staff la confirme/tome.
//   data = { idEspera, chicaNombre, areaIdx? }  (areaIdx solo aplica a TM-, 1-based; 0 = primera pendiente)
// ============================================
function handleAsignarStaff(data) {
  try {
    const idEspera = String(data.idEspera || '').trim();
    const chica    = String(data.chicaNombre || '').trim();
    if (!idEspera) return { success: false, message: 'idEspera requerido' };
    if (!chica)    return { success: false, message: 'Falta la staff' };

    // ── TicketMulti (TM-) : setear staff del área pendiente ──
    if (idEspera.indexOf('TM-') === 0) {
      const ws = getTMSheet();
      const last = ws.getLastRow();
      if (last < 3) return { success: false, message: 'Ticket no encontrado' };
      const rows = ws.getRange(3, 1, last - 2, 37).getValues();
      const areaIdx = Number(data.areaIdx || 0); // 1-based (a.idx); 0 = primera 'Esperando'
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() !== idEspera) continue;
        const rowNum = i + 3;
        for (let a = 0; a < 4; a++) {
          const base   = TM_AREA_COL[a];
          const tent   = String(rows[i][base] || '').trim();
          const estado = String(rows[i][base + 3] || '').trim().toLowerCase();
          if (!tent || estado !== 'esperando') continue;
          if (areaIdx && (a + 1) !== areaIdx) continue;
          ws.getRange(rowNum, base + 2 + 1).setValue(chica); // Staff del área (col base+2, 0-indexed)
          // espejo Lineas: actualizar staff + servicio + monto del slot
          try {
            var _refTM = idEspera + ':' + (a + 1);  // base 1
            var _wsL = _hojaLineas(); var _dL = _wsL.getDataRange().getValues();
            for (var _li = 1; _li < _dL.length; _li++) {
              if (String(_dL[_li][LX.promoRef] || '') !== _refTM) continue;
              if (['cobrado','anulado'].indexOf(String(_dL[_li][LX.estado] || '')) >= 0) continue;
              _wsL.getRange(_li + 1, LX.staff + 1).setValue(chica);
              // Actualizar también area y precio si llegaron en el payload
              if (data.area)  _wsL.getRange(_li + 1, LX.area + 1).setValue(data.area);
              if (data.total) _wsL.getRange(_li + 1, LX.monto + 1).setValue(Number(data.total));
              _wsL.getRange(_li + 1, LX.actualizada + 1).setValue(_ahora().stamp);
              break;
            }
          } catch (eLnA) { Logger.log('espejo asignarStaff TM Lineas: ' + eLnA); }
          return { success: true, message: 'Área reasignada a ' + chica, areaIdx: a + 1 };
        }
        return { success: false, message: 'No hay un área pendiente para reasignar' };
      }
      return { success: false, message: 'Ticket no encontrado' };
    }

    // ── ServicioNormal (SN-) / ServicioPromo (SP-) : setear col J = asignada a ──
    if (idEspera.indexOf('SN-') === 0 || idEspera.indexOf('SP-') === 0) {
      const esSP = idEspera.indexOf('SP-') === 0;
      const ws = getOrCreateSheet(esSP ? 'ServicioPromo' : 'ServicioNormal', esSP ? COLS_PROMO : COLS_NORMAL);
      const rows = ws.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() !== idEspera) continue;
        const estado = String(rows[i][8] || '').toLowerCase().trim();
        if (estado !== 'esperando' && estado !== 'en servicio') {
          return { success: false, message: 'El servicio ya no está en espera' };
        }
        ws.getRange(i + 1, 10).setValue(chica); // J (col 10) = TomadaPor/Asignada
        return { success: true, message: 'Reasignado a ' + chica };
      }
      return { success: false, message: 'Servicio no encontrado' };
    }

    // ── ListaEspera (LE-) : setear col J + estado 'Asignada' ──
    {
      const ws = getSheet('ListaEspera');
      const rows = ws.getDataRange().getValues();
      for (let i = 3; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() !== idEspera) continue;
        const estado = String(rows[i][8] || '').toLowerCase().trim();
        if (estado !== 'esperando' && estado !== 'asignada' && estado !== 'en servicio') {
          return { success: false, message: 'La clienta ya no está en espera' };
        }
        ws.getRange(i + 1, 10).setValue(chica); // J: TomadaPor/Asignada
        if (estado !== 'en servicio') ws.getRange(i + 1, 9).setValue('Asignada'); // I: Estado
        return { success: true, message: 'Reasignada a ' + chica };
      }
      return { success: false, message: 'Clienta no encontrada en lista de espera' };
    }
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ============================================
// MANDAR A COBRO: pasa un ticket de "Por verificar" → "Por cobrar"
// (Mikaela ya revisó el desglose). De ahí sigue el flujo de cobro normal.
//   data = { idEspera }
// ============================================
function handleMandarACobro(data) {
  try {
    const idEspera = String(data.idEspera || '').trim();
    if (!idEspera) return { success: false, message: 'idEspera requerido' };

    if (idEspera.indexOf('TM-') === 0) {
      const ws = getTMSheet();
      const last = ws.getLastRow();
      if (last < 3) return { success: false, message: 'Ticket no encontrado' };
      const rows = ws.getRange(3, 1, last - 2, 37).getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() !== idEspera) continue;
        ws.getRange(i + 3, 6).setValue('Por cobrar');
        return { success: true, message: 'Enviado a cobro' };
      }
      return { success: false, message: 'Ticket no encontrado' };
    }

    if (idEspera.indexOf('SN-') === 0 || idEspera.indexOf('SP-') === 0) {
      const esSP = idEspera.indexOf('SP-') === 0;
      const ws = getOrCreateSheet(esSP ? 'ServicioPromo' : 'ServicioNormal', esSP ? COLS_PROMO : COLS_NORMAL);
      const rows = ws.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() !== idEspera) continue;
        ws.getRange(i + 1, 9).setValue('Por cobrar');
        return { success: true, message: 'Enviado a cobro' };
      }
      return { success: false, message: 'Servicio no encontrado' };
    }

    {
      const ws = getSheet('ListaEspera');
      const rows = ws.getDataRange().getValues();
      for (let i = 3; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() !== idEspera) continue;
        ws.getRange(i + 1, 9).setValue('Por cobrar');
        return { success: true, message: 'Enviado a cobro' };
      }
      return { success: false, message: 'Clienta no encontrada' };
    }
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ============================================
// CLIENTA SE RETIRA: anula los servicios pendientes y manda a cobro
// SOLO lo realizado. En TM borra staff+precio de áreas no completadas
// (así el cobro las salta) y recalcula totales con lo completado.
//   data = { idEspera }
// ============================================
function handleRetirarYCobrar(data) {
  try {
    const idEspera = String(data.idEspera || '').trim();
    if (!idEspera) return { success: false, message: 'idEspera requerido' };

    // ── TicketMulti ──
    if (idEspera.indexOf('TM-') === 0) {
      const ws = getTMSheet();
      const last = ws.getLastRow();
      if (last < 3) return { success: false, message: 'Ticket no encontrado' };
      const rows = ws.getRange(3, 1, last - 2, 37).getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() !== idEspera) continue;
        const rowNum = i + 3;
        let normalArr = [];
        try { normalArr = JSON.parse(String(rows[i][36] || '[]')); } catch (e) {}
        if (!Array.isArray(normalArr)) normalArr = [];

        let completadas = 0, sumPromo = 0, sumNormal = 0;
        for (let a = 0; a < 4; a++) {
          const base = TM_AREA_COL[a];
          const tent = String(rows[i][base] || '').trim();
          if (!tent) continue;
          const estado = String(rows[i][base + 3] || '').trim().toLowerCase();
          if (estado === 'completado') {
            completadas++;
            const pp = Number(rows[i][TM_PRECIO_COL[a]] || 0);
            const np = Number(normalArr[a] != null ? normalArr[a] : pp) || pp;
            sumPromo += pp; sumNormal += np;
          } else {
            // Anular área pendiente: sin staff (el cobro la salta) y precio 0
            ws.getRange(rowNum, base + 2 + 1).setValue('');         // staff
            ws.getRange(rowNum, base + 3 + 1).setValue('Cancelado'); // estado área
            ws.getRange(rowNum, TM_PRECIO_COL[a] + 1).setValue(0);   // precio área
            normalArr[a] = 0;
          }
        }
        if (completadas === 0) return { success: false, message: 'No hay servicios realizados para cobrar' };

        ws.getRange(rowNum, 36).setValue(sumPromo);              // total promo (AJ)
        ws.getRange(rowNum, 35).setValue(sumNormal || sumPromo); // total normal (AI)
        ws.getRange(rowNum, 37).setValue(JSON.stringify(normalArr));
        ws.getRange(rowNum, 6).setValue('Por cobrar');
        // espejo Lineas: anular las líneas pendientes (las completadas quedan para cobro)
        try { anularLineasPendientesPorRef(idEspera, 'retiro'); } catch (eLn) { Logger.log('espejo retiro Lineas: ' + eLn); }
        return { success: true, message: 'Pendientes anulados; a cobro solo lo realizado' };
      }
      return { success: false, message: 'Ticket no encontrado' };
    }

    // ── ServicioPromo / ServicioNormal: cobrar lo ya acumulado ──
    if (idEspera.indexOf('SP-') === 0 || idEspera.indexOf('SN-') === 0) {
      const esSP = idEspera.indexOf('SP-') === 0;
      const ws = getOrCreateSheet(esSP ? 'ServicioPromo' : 'ServicioNormal', esSP ? COLS_PROMO : COLS_NORMAL);
      const rows = ws.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() !== idEspera) continue;
        let det = [];
        try { det = JSON.parse(String(rows[i][17] || '[]')); } catch (e) {}
        const sumDet = Array.isArray(det) ? det.reduce(function (s, d) { return s + Number(d.monto || 0); }, 0) : 0;
        const totalRealizado = sumDet > 0 ? sumDet : Number(rows[i][12] || 0);
        if (totalRealizado <= 0) return { success: false, message: 'No hay servicios realizados para cobrar' };
        ws.getRange(i + 1, 13).setValue(totalRealizado); // total = lo realizado
        ws.getRange(i + 1, 9).setValue('Por cobrar');
        try { anularLineasPendientesPorRef(idEspera, 'retiro'); } catch (eLn) { Logger.log('espejo retiro Lineas: ' + eLn); }
        return { success: true, message: 'A cobro solo lo realizado' };
      }
      return { success: false, message: 'Servicio no encontrado' };
    }

    return { success: false, message: 'Este tipo de ticket no admite retiro parcial' };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ============================================
// + SERVICIO EXTRA: agrega un servicio nuevo a un ticket ya "Por verificar"
// y lo reabre a la lista para que una staff lo realice (gana su comisión) y
// sume al MISMO ticket. Por ahora soportado en tickets combo/multi (TM-),
// que ya manejan total = suma de áreas y comisión por área al cobrar.
//   data = { idEspera, area, servicio, precio, chica }
// ============================================
function handleAgregarServicioExtra(data) {
  try {
    const idEspera = String(data.idEspera || '').trim();
    const area     = String(data.area || '').trim();
    const servicio = String(data.servicio || '').trim();
    const precio   = Number(data.precio || 0);
    const chica    = String(data.chica || '').trim();
    if (!idEspera) return { success: false, message: 'idEspera requerido' };
    if (!servicio || precio <= 0) return { success: false, message: 'Servicio y precio válidos requeridos' };

    if (idEspera.indexOf('TM-') === 0) {
      // Si el TM está en 'Por verificar' (la staff ya terminó y Mikaela verifica),
      // el ticket original NO se toca — queda en 'Por verificar' esperando cobro.
      // El servicio extra se crea como ticket SN- nuevo (mismo flujo que LE-/SN-/SP-).
      // Así ambos tickets se cobran juntos cuando la segunda staff termine.
      const wsTMEx = getTMSheet();
      const lastEx = wsTMEx.getLastRow();
      if (lastEx >= 3) {
        const rowsEx = wsTMEx.getRange(3, 1, lastEx - 2, 6).getValues();
        for (var tmei = 0; tmei < rowsEx.length; tmei++) {
          if (String(rowsEx[tmei][0]).trim() !== idEspera) continue;
          const estadoTMEx = String(rowsEx[tmei][5] || '').toLowerCase();
          if (estadoTMEx === 'por verificar') {
            // Leer código y nombre del TM para crear el SN-
            var _codTMEx  = String(rowsEx[tmei][3] || '').trim();
            var _nomTMEx  = String(rowsEx[tmei][4] || '').trim();
            if (!_codTMEx && !_nomTMEx) return { success: false, message: 'No se encontraron datos de la clienta en el ticket TM.' };
            // Crear ticket SN- nuevo para el servicio extra (el TM original no se modifica)
            var tzSNEx = 'America/Guayaquil';
            var nowSNEx = new Date();
            var horaSNEx  = Utilities.formatDate(nowSNEx, tzSNEx, 'HH:mm');
            var fechaSNEx = Utilities.formatDate(nowSNEx, tzSNEx, 'dd/MM/yyyy');
            // Candado anti-duplicado
            var wsDupEx = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
            var dupDataEx = wsDupEx.getDataRange().getValues();
            for (var dzEx = 1; dzEx < dupDataEx.length; dzEx++) {
              var dEstEx = String(dupDataEx[dzEx][8] || '').toLowerCase().trim();
              if (dEstEx === 'cobrado' || dEstEx === 'completada' || dEstEx === 'cancelado') continue;
              var dCodEx = String(dupDataEx[dzEx][3] || '').trim();
              var dNomEx = String(dupDataEx[dzEx][4] || '').trim();
              var dSvcEx = String(dupDataEx[dzEx][5] || '').trim().toLowerCase();
              var dAreaEx= String(dupDataEx[dzEx][6] || '').trim().toLowerCase();
              var mismaCliEx = (_codTMEx && dCodEx === _codTMEx) || (_nomTMEx && dNomEx === _nomTMEx);
              if (mismaCliEx && dSvcEx === servicio.toLowerCase() && dAreaEx === area.toLowerCase()) {
                return { success: true, newId: String(dupDataEx[dzEx][0] || ''), duplicado: true,
                  message: 'Ese servicio extra ya estaba agregado para ' + (_nomTMEx || 'la clienta') + ' — no se duplicó.' };
              }
            }
            var newIdSNEx = getNextIdNormal();
            var obsSnEx = '➕ Servicio extra desde ticket ' + idEspera + ' (verificado, pendiente cobro conjunto)';
            wsDupEx.appendRow([
              newIdSNEx, fechaSNEx, horaSNEx, _codTMEx, _nomTMEx,
              servicio, area, 'Normal', 'Esperando',
              chica || '', '', obsSnEx,
              precio, '', '', '', '', '',
              'SN', precio, precio
            ]);
            // ── espejo Lineas: ata el extra al padre TM via obs ──────────────
            try {
              lineaDesdeServicioNormal({
                ticketId: newIdSNEx, codigo: _codTMEx, nombre: _nomTMEx,
                area: area, servicio: servicio, asignadaA: chica || '',
                total: precio, observaciones: '(extra de ' + idEspera + ')'
              });
            } catch(eLnTM) { Logger.log('espejo extra TM: ' + eLnTM); }
            return { success: true, newId: newIdSNEx,
              message: 'Servicio extra creado como ticket nuevo (' + newIdSNEx + '). El ticket original queda en verificación.' };
          }
          break;
        }
      }
      return { success: false, message: 'Ticket TM no encontrado o en estado no válido para agregar extra.' };
    }

    // ── Tickets simples / promo-dúo (LE-, SN-, SP-) ──────────────────────────
    // Enfoque SEGURO: el servicio ya realizado queda CONGELADO en su ticket original
    // (intacto, se cobra normal y su comisión se registra como siempre). El servicio
    // EXTRA se crea como un ticket NUEVO (SN-) para la misma clienta, asignado a la
    // nueva staff, y entra a su cola de "Esperando". Así ambos servicios se cobran sin
    // tocar la lógica de comisiones ni arriesgar doble cobro. La lista de espera ya
    // fusiona los tickets SN- "Esperando", por lo que la nueva staff lo verá enseguida.
    {
      // 1) Leer código/nombre de la clienta desde el ticket original (según su tipo)
      var codigoCli = '', nombreCli = '';
      if (idEspera.indexOf('SP-') === 0 || idEspera.indexOf('SN-') === 0) {
        var srcSheet = idEspera.indexOf('SP-') === 0 ? 'ServicioPromo' : 'ServicioNormal';
        var srcCols  = idEspera.indexOf('SP-') === 0 ? COLS_PROMO : COLS_NORMAL;
        var wsSrc = getOrCreateSheet(srcSheet, srcCols);
        var srcData = wsSrc.getDataRange().getValues();
        for (var s = 1; s < srcData.length; s++) {
          if (String(srcData[s][0]).trim() === idEspera) {
            codigoCli = String(srcData[s][3] || '').trim();   // D: Código
            nombreCli = String(srcData[s][4] || '').trim();   // E: Nombre
            break;
          }
        }
      } else if (idEspera.indexOf('LE-') === 0) {
        var wsLE = getSheet('ListaEspera');
        var leData = wsLE.getDataRange().getValues();
        for (var l = 3; l < leData.length; l++) {
          if (String(leData[l][0]).trim() === idEspera) {
            codigoCli = String(leData[l][3] || '').trim();    // D: Código
            nombreCli = String(leData[l][4] || '').trim();    // E: Nombre
            break;
          }
        }
      }
      if (!codigoCli && !nombreCli) {
        return { success: false, message: 'No se encontró la clienta del ticket ' + idEspera };
      }

      // 2) Crear el ticket NUEVO para el servicio extra (no toca el original)
      var tzEx = 'America/Guayaquil';
      var nowEx = new Date();
      var horaEx  = Utilities.formatDate(nowEx, tzEx, 'HH:mm');
      var fechaEx = Utilities.formatDate(nowEx, tzEx, 'dd/MM/yyyy');
      // ── CANDADO ANTI-DUPLICADO ──────────────────────────────────────────────
      // Si ya existe un servicio extra IDÉNTICO pendiente para esta clienta (mismo
      // servicio + área, aún no cobrado/cancelado), NO crear otro. Evita que re-intentos
      // o doble-tap repitan el servicio en la lista de espera.
      var wsDup = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
      var dupData = wsDup.getDataRange().getValues();
      for (var dz = 1; dz < dupData.length; dz++) {
        var dEstado = String(dupData[dz][8] || '').toLowerCase().trim();
        if (dEstado === 'cobrado' || dEstado === 'completada' || dEstado === 'cancelado') continue;
        var dCod  = String(dupData[dz][3] || '').trim();
        var dNom  = String(dupData[dz][4] || '').trim();
        var dSvc  = String(dupData[dz][5] || '').trim().toLowerCase();
        var dArea = String(dupData[dz][6] || '').trim().toLowerCase();
        var mismaCli = (codigoCli && dCod === codigoCli) || (nombreCli && dNom === nombreCli);
        if (mismaCli && dSvc === servicio.toLowerCase() && dArea === area.toLowerCase()) {
          return { success: true, newId: String(dupData[dz][0] || ''), duplicado: true,
            message: 'Ese servicio extra ya estaba agregado para ' + (nombreCli || 'la clienta') + ' — no se duplicó.' };
        }
      }

      var newIdEx = getNextIdNormal();
      var wsNuevo = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
      var obsEx = '➕ Servicio extra agregado por admin (ticket original ' + idEspera + ' congelado)';
      // Columnas COLS_NORMAL (21): ID,Fecha,Hora,Código,Nombre,Servicio,Área,Prioridad,
      // Estado,Tomada por,Hora tomada,Obs,Total,Promo nombre,Método pago,Hora cobro,
      // Total cobrado,Desglose,Tipo,Precio Normal,Precio Promo
      wsNuevo.appendRow([
        newIdEx, fechaEx, horaEx, codigoCli, nombreCli,
        servicio, area, 'Normal', 'Esperando',
        chica || '', '', obsEx,
        precio, '', '', '', '', '',
        'SN', precio, precio
      ]);
      // ── espejo Lineas ──────────────────────────────────────────────────────
      try {
        lineaDesdeServicioNormal({
          ticketId: newIdEx, codigo: codigoCli, nombre: nombreCli,
          area: area, servicio: servicio, asignadaA: chica || '',
          total: precio, observaciones: '(extra de ' + idEspera + ')'
        });
      } catch(eLnEx) { Logger.log('espejo extra LE/SN/SP: ' + eLnEx); }

      return {
        success: true,
        newId: newIdEx,
        message: 'Servicio extra agregado como ticket nuevo para ' + (chica || 'la staff') + '. El servicio anterior queda congelado.'
      };
    }
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ── AGREGAR PROMO EXTRA (Mikaela) ────────────────────────────────────────────
// Igual que handleAgregarServicioExtra, pero el extra es una PROMO. El ticket
// original (servicio ya completado) queda INTACTO; la promo se crea como un
// ticket SP- NUEVO para la misma clienta, asignado a la staff elegida y en
// 'Esperando' (col J = staff), por lo que se cobra y se comisiona APARTE.
// Reusa handleAddServicioPromo (crea la fila + espejo en Lineas). Todo en
// try/catch: si algo falla, no rompe nada del flujo vivo.
//   data = { idEspera, promoNombre, precioPromo, precioRegular, area?, precioMiArea?, chica, observaciones? }
function handleAgregarPromoExtra(data) {
  try {
    const idEspera     = String(data.idEspera || '').trim();
    const promoNombre  = String(data.promoNombre || '').trim();
    const precioPromo  = Number(data.precioPromo || 0);
    const precioReg    = Number(data.precioRegular || precioPromo);
    const area         = String(data.area || '').trim();
    const precioMiArea = Number(data.precioMiArea || precioPromo);
    const chica        = String(data.chica || '').trim();
    if (!idEspera)        return { success: false, message: 'idEspera requerido' };
    if (!promoNombre)     return { success: false, message: 'Falta la promo' };
    if (precioPromo <= 0) return { success: false, message: 'Precio de promo inválido' };

    // 1) Resolver código/nombre de la clienta desde el ticket original (según su tipo)
    var codigoCli = '', nombreCli = '';
    if (idEspera.indexOf('SP-') === 0 || idEspera.indexOf('SN-') === 0) {
      var srcSheet = idEspera.indexOf('SP-') === 0 ? 'ServicioPromo' : 'ServicioNormal';
      var srcCols  = idEspera.indexOf('SP-') === 0 ? COLS_PROMO : COLS_NORMAL;
      var wsSrc = getOrCreateSheet(srcSheet, srcCols);
      var srcData = wsSrc.getDataRange().getValues();
      for (var s = 1; s < srcData.length; s++) {
        if (String(srcData[s][0]).trim() === idEspera) {
          codigoCli = String(srcData[s][3] || '').trim();   // D: Código
          nombreCli = String(srcData[s][4] || '').trim();   // E: Nombre
          break;
        }
      }
    } else if (idEspera.indexOf('TM-') === 0) {
      var wsTM = getTMSheet();
      var lastTM = wsTM.getLastRow();
      if (lastTM >= 3) {
        var tmData = wsTM.getRange(3, 1, lastTM - 2, 5).getValues();
        for (var t = 0; t < tmData.length; t++) {
          if (String(tmData[t][0]).trim() === idEspera) {
            codigoCli = String(tmData[t][3] || '').trim();  // D: Código
            nombreCli = String(tmData[t][4] || '').trim();  // E: Nombre
            break;
          }
        }
      }
    } else if (idEspera.indexOf('LE-') === 0) {
      var wsLE = getSheet('ListaEspera');
      var leData = wsLE.getDataRange().getValues();
      for (var l = 3; l < leData.length; l++) {
        if (String(leData[l][0]).trim() === idEspera) {
          codigoCli = String(leData[l][3] || '').trim();    // D: Código
          nombreCli = String(leData[l][4] || '').trim();    // E: Nombre
          break;
        }
      }
    }
    if (!codigoCli && !nombreCli) {
      return { success: false, message: 'No se encontró la clienta del ticket ' + idEspera };
    }

    // 2) Candado anti-duplicado: misma clienta + misma promo aún activa → no duplicar
    var wsDup = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    var dupData = wsDup.getDataRange().getValues();
    for (var dz = 1; dz < dupData.length; dz++) {
      var dEstado = String(dupData[dz][8] || '').toLowerCase().trim();   // I: Estado
      if (dEstado === 'cobrado' || dEstado === 'completada' || dEstado === 'cancelado') continue;
      var dCod  = String(dupData[dz][3]  || '').trim();                  // D: Código
      var dNom  = String(dupData[dz][4]  || '').trim();                  // E: Nombre
      var dProm = String(dupData[dz][13] || '').trim().toLowerCase();    // N: Promo nombre
      var mismaCli = (codigoCli && dCod === codigoCli) || (nombreCli && dNom === nombreCli);
      if (mismaCli && dProm === promoNombre.toLowerCase()) {
        return { success: true, newId: String(dupData[dz][0] || ''), duplicado: true,
          message: 'Esa promo extra ya estaba agregada para ' + (nombreCli || 'la clienta') + ' — no se duplicó.' };
      }
    }

    // 3) Crear el ticket SP- NUEVO (su propio ticket → se cobra aparte). El original no se toca.
    var obsEx = '➕ Promo extra agregada por admin (ticket original ' + idEspera + ' intacto)' +
                (data.observaciones ? ' · ' + String(data.observaciones).trim() : '');
    var r = handleAddServicioPromo({
      codigo:        codigoCli,
      nombre:        nombreCli,
      servicio:      promoNombre,
      promoNombre:   promoNombre,
      area:          area,
      precioPromo:   precioPromo,
      precioRegular: precioReg,
      precioMiArea:  precioMiArea,
      asignadaA:     chica,
      observaciones: obsEx
    });
    if (r && r.success) {
      try {
        _pushMikaela('🏷 Promo extra agregada',
          (nombreCli || 'Clienta') + ' · ' + promoNombre + (chica ? ' → ' + chica : ''));
      } catch (e) {}
      return { success: true, newId: r.id,
        message: 'Promo extra agregada como ticket aparte (' + r.id + '). El servicio anterior queda intacto.' };
    }
    return { success: false, message: (r && r.message) || 'No se pudo crear la promo extra' };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ============================================
// FACTURACIÓN (preparado para SRI)
// → Las funciones viven ahora en NexServ_Facturacion.gs (mismo proyecto, ámbito global compartido):
//     handleGetDatosFacturacion · handleGuardarFacturacion · handleGetFacturaciones
//   Los `case` del router (getDatosFacturacion / getFacturaciones / guardarFacturacion) siguen aquí arriba.
// ============================================

// ============================================
// AUTORIZACIONES DE SERVICIOS EXTRAS
// ============================================

function handleSolicitarAutorizacion(data) {
  // Crear pestaña Autorizaciones si no existe
  let ws = getSheet('Autorizaciones');
  if (!ws) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    ws = ss.insertSheet('Autorizaciones');
    // Encabezados
    ws.getRange(1, 1, 1, 14).setValues([[
      'ID', 'Fecha', 'Hora', 'Cliente Código', 'Cliente Nombre', 
      'Staff', 'Servicio', 'Área', 'Precio', 'Nota', 'Estado', 'Respuesta', 'idEsperaSP', 'esCambioPromo'
    ]]);
    ws.getRange(1, 1, 1, 14).setFontWeight('bold');
    ws.setFrozenRows(1);
  }
  
  // Generar ID único
  const timestamp = new Date().getTime();
  const id = 'AUTH-' + timestamp;
  
  // Agregar solicitud
  const newRow = [
    id,
    new Date(),
    Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm'),
    data.clienteCodigo || '',
    data.clienteNombre || '',
    data.staffNombre || '',
    data.servicioNombre || '',
    data.servicioArea || '',
    data.servicioPrecio || 0,
    data.nota || '',
    'pendiente',
    '',
    data.idEsperaSP || '',
    data.esCambioPromo ? 'true' : 'false'
  ];
  
  ws.appendRow(newRow);

  // #3 Avisar a Mikaela que hay un servicio extra por aprobar
  _pushMikaela('🟡 Servicio extra por aprobar',
    String(data.staffNombre || 'Una chica') + ' pide aprobar: ' + String(data.servicioNombre || 'un servicio') +
    (data.clienteNombre ? ' para ' + data.clienteNombre : '') +
    (data.servicioPrecio ? ' ($' + data.servicioPrecio + ')' : ''));

  return { 
    success: true, 
    message: 'Solicitud enviada al admin',
    authId: id
  };
}

function handleGetAutorizaciones() {
  const ws = getSheet('Autorizaciones');
  if (!ws) {
    return { success: true, autorizaciones: [] };
  }
  
  const data = ws.getDataRange().getValues();
  const autorizaciones = [];
  
  const ahora = new Date();
  const dosHorasAtras = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // fila vacia
    const estado = String(row[10] || '').toLowerCase().trim();
    if (!estado) continue;

    // Pendientes: siempre incluir
    if (estado === 'pendiente') {
      autorizaciones.push({
        id: String(row[0]),
        clienteCodigo: String(row[3] || ''),
        clienteNombre: String(row[4] || ''),
        staffNombre: String(row[5] || ''),
        servicioNombre: String(row[6] || ''),
        servicioArea: String(row[7] || ''),
        servicioPrecio: row[8],
        nota: String(row[9] || ''),
        estado: 'pendiente'
      });
      continue;
    }

    // Aprobadas/rechazadas: solo las ultimas 2 horas para sync del staff
    const fechaRow = row[1] instanceof Date ? row[1] : null;
    if (!fechaRow || fechaRow < dosHorasAtras) continue;

    autorizaciones.push({
      id: String(row[0]),
      clienteCodigo: String(row[3] || ''),
      clienteNombre: String(row[4] || ''),
      staffNombre: String(row[5] || ''),
      servicioNombre: String(row[6] || ''),
      servicioArea: String(row[7] || ''),
      servicioPrecio: row[8],
      nota: String(row[9] || ''),
      estado: estado
    });
  }
  
  return { success: true, autorizaciones: autorizaciones };
}

function handleAprobarAutorizacion(data) {
  const ws = getSheet('Autorizaciones');
  if (!ws) {
    return { success: false, message: 'No hay solicitudes de autorización' };
  }
  
  const rows = ws.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.authId).trim()) {
      const now = new Date();
      const horaAprobacion = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
      const fechaAprobacion = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');

      // Actualizar estado en Autorizaciones
      ws.getRange(i + 1, 11).setValue('aprobado');
      ws.getRange(i + 1, 12).setValue('Aprobado por admin el ' + fechaAprobacion + ' ' + horaAprobacion);

      const authStaff      = String(rows[i][5] || '');
      const authCliente    = String(rows[i][4] || '');
      const authCodigo     = String(rows[i][3] || '');
      const authPrecio     = Number(rows[i][8] || 0);
      const authServicio   = String(rows[i][6] || '');
      const authArea       = String(rows[i][7] || '');

      // ── Registrar en ServiciosExtras ──
      try {
        let wsExt = getSheet('ServiciosExtras');
        if (!wsExt) {
          const ss = SpreadsheetApp.openById(SHEET_ID);
          wsExt = ss.insertSheet('ServiciosExtras');
          wsExt.getRange(1, 1, 1, 11).setValues([[
            'Fecha', 'Hora solicitud', 'Hora aprobación', 'Staff',
            'Cliente', 'Código', 'Servicio extra', 'Área', 'Precio',
            'Estado', 'ID Ticket (cobro final)'
          ]]);
          wsExt.getRange(1, 1, 1, 11).setFontWeight('bold');
          wsExt.setFrozenRows(1);
        }
        wsExt.appendRow([
          fechaAprobacion,
          Utilities.formatDate(rows[i][1], 'America/Guayaquil', 'HH:mm'),
          horaAprobacion,
          authStaff, authCliente, authCodigo, authServicio, authArea,
          authPrecio, 'Aprobado', ''
        ]);
      } catch(eExt) { Logger.log('Error escribiendo ServiciosExtras: ' + eExt); }

      // ── Si la clienta tiene un TM activo, sumar el extra al precio del área ──
      // Esto asegura que Mikaela vea el precio correcto en el panel y que el cobro sea exacto
      if (authPrecio > 0 && authStaff && authCliente) {
        try {
          const wsTM = getTMSheet();
          const tmRows = wsTM.getDataRange().getValues();
          for (let t = 2; t < tmRows.length; t++) {
            const tmId     = String(tmRows[t][0] || '').trim();
            if (!tmId.startsWith('TM-')) continue;
            const tmEstado = String(tmRows[t][5] || '').toLowerCase();
            if (tmEstado === 'completado') continue;
            const tmNombre = String(tmRows[t][4] || '').trim().toLowerCase();
            if (tmNombre !== authCliente.toLowerCase()) continue;

            // Encontrar el área de esta staff en el TM
            for (let a = 0; a < 4; a++) {
              const base      = TM_AREA_COL[a];
              const areaStaff = String(tmRows[t][base + 2] || '').trim();
              if (areaStaff !== authStaff) continue;
              const estadoArea = String(tmRows[t][base + 3] || '').trim().toLowerCase();
              if (estadoArea === 'completado') continue; // área ya cerrada, no sumar

              // Sumar el precio del extra al TM_PRECIO_COL del área
              const precioActual = Number(tmRows[t][TM_PRECIO_COL[a]] || 0);
              const nuevoPrecio  = precioActual + authPrecio;
              const tmRowNum     = t + 3;
              wsTM.getRange(tmRowNum, TM_PRECIO_COL[a] + 1).setValue(nuevoPrecio);

              // Recalcular total promo del TM (col 36 = AJ, idx 35)
              const nuevosPrecios = TM_PRECIO_COL.map(function(c, idx) {
                return idx === a ? nuevoPrecio : Number(tmRows[t][c] || 0);
              });
              const nuevoTotalPromo = nuevosPrecios.reduce(function(s, v) { return s + v; }, 0);
              wsTM.getRange(tmRowNum, 36).setValue(nuevoTotalPromo); // col AJ = precioPromoTotal

              Logger.log('TM ' + tmId + ': área ' + a + ' precio actualizado ' + precioActual + ' → ' + nuevoPrecio + ' (extra: ' + authServicio + ')');
              break;
            }
            break; // solo el primer TM activo de esta clienta
          }
        } catch(eTM) { Logger.log('Error actualizando TM con extra: ' + eTM); }
      }

      // espejo Lineas: sumar el extra aprobado a la línea activa de esa clienta+área
      try { lineaAgregarExtra(authCodigo, authArea, authStaff, authServicio, authPrecio); } catch (eLn) { Logger.log('espejo extra Lineas: ' + eLn); }

      // ── FIX: si es un cambio de promo a SN, cancelar las otras áreas del SP- ──
      const authIdEsperaSP = String(rows[i][12] || ''); // col M = idEsperaSP
      const authEsCambioPromo = String(rows[i][13] || '').toLowerCase() === 'true'; // col N
      if (authEsCambioPromo && authIdEsperaSP.startsWith('SP-')) {
        try {
          Logger.log('handleAprobarAutorizacion: cancelando áreas del SP- ' + authIdEsperaSP + ' excepto área de ' + authStaff);
          // Buscar el SP- en ListaEspera y marcarlo como cancelado por cambio
          const wsLE = getSheet('ListaEspera');
          if (wsLE) {
            const leRows = wsLE.getDataRange().getValues();
            for (let le = 1; le < leRows.length; le++) {
              if (String(leRows[le][0] || '').trim() === authIdEsperaSP) {
                // Marcar el SP- como 'cancelado_cambio' para que no vuelva a aparecer
                wsLE.getRange(le + 1, 7).setValue('cancelado_cambio');
                Logger.log('SP- ' + authIdEsperaSP + ' marcado como cancelado_cambio en ListaEspera');
                break;
              }
            }
          }
          // Anular las líneas del SP- en Lineas que NO son del área de esta staff
          try { anularLineasPendientesPorRef(authIdEsperaSP, 'cambio_a_SN_' + authStaff); } catch(eLn2) {
            Logger.log('anular Lineas SP- por cambio: ' + eLn2);
          }
        } catch(eSP) { Logger.log('Error cancelando SP- por cambio: ' + eSP); }
      }

      return { 
        success: true, 
        message: 'Servicio aprobado',
        clienteCodigo: authCodigo,
        clienteNombre: authCliente,
        staffNombre: authStaff,
        esCambioPromo: authEsCambioPromo,
        idEsperaSP: authIdEsperaSP
      };
    }
  }
  
  return { success: false, message: 'Solicitud no encontrada' };
}

function handleRechazarAutorizacion(data) {
  const ws = getSheet('Autorizaciones');
  if (!ws) {
    return { success: false, message: 'No hay solicitudes de autorización' };
  }
  
  const rows = ws.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.authId).trim()) {
      // Actualizar estado
      ws.getRange(i + 1, 11).setValue('rechazado');
      ws.getRange(i + 1, 12).setValue('Rechazado por admin el ' + Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM HH:mm'));
      
      return { 
        success: true, 
        message: 'Servicio rechazado',
        clienteCodigo: rows[i][3],
        clienteNombre: rows[i][4],
        staffNombre: rows[i][5]
      };
    }
  }
  
  return { success: false, message: 'Solicitud no encontrada' };
}


// ============================================
// HISTORIAL DE SERVICIOS COBRADOS
// ============================================

function handleGetServiciosCobrados(data) {
  const ws = getSheet("CierresPagos");
  if (!ws) {
    return { success: true, servicios: [] };
  }
  
  const rows = ws.getDataRange().getValues();
  const servicios = [];
  const filtro = data.filtro || "hoy";
  const tz = "America/Guayaquil";
  const hoyStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  // Red de seguridad: ignorar filas IDÉNTICAS (mismo fecha+hora+cliente+staff+servicio+
  // total+método+referencia). Si por un doble guardado quedó una fila repetida en
  // CierresPagos, la caja no la cuenta dos veces. Las líneas de un combo NO se colapsan
  // porque su referencia (col 8 = idTM-A1/A2) es distinta por línea.
  const _vistos = {};

  // Días hacia atrás según filtro (0 = solo hoy)
  let diasAtras = 0;
  if (filtro === "ayer") diasAtras = 1;
  else if (filtro === "semana") diasAtras = 7;
  else if (filtro === "mes") diasAtras = 30;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Solo filas de cobro real: col A debe ser una Fecha (las filas de cierre semanal
    // guardan un texto/número en col A y deben ignorarse aquí)
    if (!(row[0] instanceof Date)) continue;
    const fechaCobro = row[0];

    // Saltar filas exactamente duplicadas
    const _clave = [
      Utilities.formatDate(fechaCobro, tz, "yyyy-MM-dd HH:mm"),
      String(row[1] || ''), String(row[2] || ''), String(row[3] || ''),
      String(row[4] || ''), String(row[5] || ''), String(row[6] || ''), String(row[7] || '')
    ].join('|');
    if (_vistos[_clave]) continue;
    _vistos[_clave] = true;

    const cobroStr = Utilities.formatDate(fechaCobro, tz, "yyyy-MM-dd");
    if (filtro === "ayer") {
      const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
      if (cobroStr !== Utilities.formatDate(ayer, tz, "yyyy-MM-dd")) continue;
    } else if (filtro === "hoy") {
      if (cobroStr !== hoyStr) continue;
    } else {
      // semana / mes: incluir desde (hoy - diasAtras) en adelante
      const limite = new Date(); limite.setDate(limite.getDate() - diasAtras);
      if (cobroStr < Utilities.formatDate(limite, tz, "yyyy-MM-dd")) continue;
    }

    servicios.push({
      fecha: Utilities.formatDate(fechaCobro, tz, "dd/MM/yyyy"),
      hora: row[1],
      clienteNombre: row[2],
      staffNombre: row[3],
      servicio: row[4],
      total: row[5],
      metodoPago: row[6],
      // Si hay varios staff, parsear el detalle
      serviciosDetalle: (function(){ try { return row[7] && String(row[7]).charAt(0) === '[' ? JSON.parse(row[7]) : null; } catch(e){ return null; } })()
    });
  }
  
  // Ordenar por fecha descendente
  servicios.sort((a, b) => {
    const dateA = new Date(a.fecha.split("/").reverse().join("-") + " " + a.hora);
    const dateB = new Date(b.fecha.split("/").reverse().join("-") + " " + b.hora);
    return dateB - dateA;
  });
  
  return { success: true, servicios: servicios };
}

// ============================================
// LIMPIEZA: quitar filas DUPLICADAS de CierresPagos (lo que ve la caja de Mikaela).
// Ejecutar UNA vez desde el editor de Apps Script (botón ▶ Ejecutar) cuando un cobro
// quedó registrado dos veces. Conserva la PRIMERA fila de cada grupo idéntico y borra
// las repetidas. Es seguro: solo borra filas idénticas en TODAS las columnas
// (fecha+hora+cliente+staff+servicio+total+método+referencia), por lo que las líneas
// de un combo (referencia idTM-A1/A2 distinta) NO se tocan.
// Devuelve cuántas filas borró y un detalle en el log.
// ============================================
function limpiarDuplicadosCierresPagos() {
  const ws = getSheet('CierresPagos');
  if (!ws) return { error: 'No existe la hoja CierresPagos' };
  const data = ws.getDataRange().getValues();
  const tz = 'America/Guayaquil';
  const vistos = {};
  const aBorrar = [];   // números de fila (1-indexados) a eliminar
  const detalle = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!(r[0] instanceof Date)) continue; // ignorar filas de cierre semanal / encabezados raros
    const fechaStr = Utilities.formatDate(r[0], tz, 'yyyy-MM-dd HH:mm');
    const clave = [
      fechaStr, String(r[1] || ''), String(r[2] || ''), String(r[3] || ''),
      String(r[4] || ''), String(r[5] || ''), String(r[6] || ''), String(r[7] || '')
    ].join('|');
    if (vistos[clave]) {
      aBorrar.push(i + 1);
      detalle.push((i + 1) + ': ' + String(r[2] || '') + ' · ' + String(r[4] || '') + ' · $' + String(r[5] || '') + ' · ' + String(r[6] || ''));
    } else {
      vistos[clave] = true;
    }
  }

  // Borrar de abajo hacia arriba para no descuadrar los índices
  aBorrar.sort(function (a, b) { return b - a; }).forEach(function (fila) {
    ws.deleteRow(fila);
  });

  Logger.log('Filas duplicadas borradas: ' + aBorrar.length);
  detalle.forEach(function (d) { Logger.log('  borrada → ' + d); });
  return { success: true, borradas: aBorrar.length, detalle: detalle };
}
function handleLimpiarAtenciones() {
  try {
    const ws = getSheet('Atenciones');
    const lastRow = ws.getLastRow();
    if (lastRow > 3) {
      ws.deleteRows(4, lastRow - 3);
    }
    // Actualizar encabezados con la nueva estructura
    ws.getRange(3, 1, 1, 12).setValues([[
      'ID atención', 'Fecha', 'Hora entrada', 'Hora salida',
      'Código cliente', 'Cliente', 'Staff', 'Servicio',
      'Estado', 'Total', 'Método pago', 'ID Ticket (LE-)'
    ]]);
    return { success: true, message: 'Atenciones limpiadas. ' + (lastRow - 3) + ' registros eliminados.' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================
// PRODUCTOS DE MARCA — hoja 'Marca' en Sheet de NexServ
// Columnas: A=id, B=Nombre, C=Stock, D=Min, E=Precio, F=Unidad
// Datos desde fila 2
// ============================================

function getMarcaSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ws = ss.getSheetByName('Marca');
  if (!ws) {
    // Crear hoja Marca si no existe con los productos iniciales
    ws = ss.insertSheet('Marca');
    ws.getRange(1, 1, 1, 6).setValues([['ID', 'Nombre', 'Stock', 'Min', 'Precio', 'Unidad']]);
    ws.getRange(1, 1, 1, 6).setFontWeight('bold');
    ws.getRange(1, 1, 1, 6).setBackground('#1a1a1a');
    ws.getRange(1, 1, 1, 6).setFontColor('white');
    const productos = [
      [1,  'Gel fijador de cejas tipo brow',  36,  5, 12, 'Unidad'],
      [2,  'Gel fijador de cejas tipo rimel', 10,  5, 12, 'Unidad'],
      [3,  'Pomada dark Brown',               12,  1, 10, 'Unidad'],
      [4,  'Brocha 2 en 1 Pequeña',           56,  5,  5, 'Unidad'],
      [5,  'Brocha 2 en 1 Grande',            14,  3,  8, 'Unidad'],
      [6,  'Brocha Rubor',                    45,  5,  9, 'Unidad'],
      [7,  'Brocha de Contorno',              18,  5,  9, 'Unidad'],
      [8,  'Brocha de Cejas',                103,  5, 10, 'Unidad'],
      [9,  'Brocha difuminar',                81,  5,  8, 'Unidad'],
      [10, 'Brocha de Contorno (cejas)',       29,  5,  8, 'Unidad'],
      [11, 'Tijera',                            2,  1,  9, 'Unidad'],
      [12, 'Ventilador',                        4,  1, 15, 'Unidad'],
      [13, 'Lápiz Dark Brown',                14,  3, 15, 'Unidad'],
      [14, 'Lápiz Chocolate',                 11,  3, 15, 'Unidad'],
      [15, 'Lápiz Gray',                       9,  3, 15, 'Unidad'],
      [16, 'Lápiz Blonde',                     2,  2, 15, 'Unidad'],
    ];
    ws.getRange(2, 1, productos.length, 6).setValues(productos);
    // Ajustar ancho columnas
    ws.setColumnWidth(1, 40);
    ws.setColumnWidth(2, 260);
    ws.setColumnWidth(3, 70);
    ws.setColumnWidth(4, 60);
    ws.setColumnWidth(5, 80);
    ws.setColumnWidth(6, 80);
  }
  return ws;
}

function handleGetMarcaProductos() {
  try {
    const ws = getMarcaSheet();
    const lastRow = ws.getLastRow();
    if (lastRow < 2) return { success: true, productos: [] };

    const data = ws.getRange(2, 1, lastRow - 1, 6).getValues();
    const productos = [];
    for (let i = 0; i < data.length; i++) {
      const nombre = String(data[i][1] || '').trim();
      if (!nombre) continue;
      productos.push({
        nombre,
        stock:  Number(data[i][2] || 0),
        minimo: Number(data[i][3] || 0),
        precio: Number(data[i][4] || 0),
        rowNum: i + 2
      });
    }
    return { success: true, productos };
  } catch(e) {
    return { success: false, productos: [], error: e.toString() };
  }
}

// ============================================
// REGISTRAR VENTA DE PRODUCTOS AL COBRAR
// Descuenta stock en SIRA y registra en NexServ
// ============================================
// ── Bitácora permanente de observaciones que dejan las staff a la clienta ──
// Hoja append-only: cada nota queda con fecha/área/staff, nunca se pisa una con otra.
// Sirve para que en futuras citas cualquier staff se guíe y personalice el servicio.
function getObservacionesClientaSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName('ObservacionesClienta');
  if (!ws) {
    ws = ss.insertSheet('ObservacionesClienta');
    ws.appendRow(['Fecha', 'Hora', 'Codigo', 'Cliente', 'Area', 'Staff', 'Observacion']);
  }
  return ws;
}

function handleAddObservacionClienta(data) {
  try {
    const codigo = String((data && data.codigo) || '').trim();
    const obs    = String((data && data.observacion) || '').trim();
    if (!codigo) return { success: false, error: 'Falta el código de la clienta' };
    if (!obs)    return { success: false, error: 'Observación vacía' };
    const now = new Date();
    const tz  = 'America/Guayaquil';
    const ws  = getObservacionesClientaSheet();
    ws.appendRow([
      Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
      Utilities.formatDate(now, tz, 'HH:mm'),
      codigo,
      String((data && data.cliente) || ''),
      String((data && data.area) || ''),
      String((data && data.staff) || ''),
      obs
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleRegistrarVentaProductos(data) {
  try {
    const now = new Date();
    const tz = 'America/Guayaquil';
    const fechaStr = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const horaStr = Utilities.formatDate(now, tz, 'HH:mm');
    const productos = data.productos || [];

    // 1. DESCONTAR STOCK EN HOJA MARCA (NexServ)
    try {
      const wsMarca = getMarcaSheet();
      const lastRow = wsMarca.getLastRow();
      if (lastRow >= 2) {
        const marcaData = wsMarca.getRange(2, 1, lastRow - 1, 5).getValues();
        productos.forEach(prod => {
          for (let i = 0; i < marcaData.length; i++) {
            const nombreMarca = String(marcaData[i][1] || '').trim(); // col B
            if (nombreMarca.toLowerCase() === String(prod.nombre || '').toLowerCase()) {
              const rowNum = i + 2;
              const stockActual = Number(marcaData[i][2] || 0); // col C
              const nuevoStock = Math.max(0, stockActual - Number(prod.cantidad || 1));
              wsMarca.getRange(rowNum, 3).setValue(nuevoStock); // col C = Stock
              break;
            }
          }
        });
      }
    } catch(eMarca) {
      Logger.log('Error descontando stock Marca: ' + eMarca.toString());
    }

    // 2. GUARDAR EN CierresPagos de NexServ
    // FIX: el método de pago iba fijo en 'Producto', que la caja no reconoce y
    // contaba SIEMPRE como efectivo (una venta con tarjeta caía en efectivo).
    // Ahora se guarda el método real que mandó el frontend. El producto se sigue
    // identificando por el prefijo 🛍 en el nombre, no por el método.
    // 'mixto' no se puede repartir bien para un producto suelto → cae a Efectivo.
    let metodoVenta = String(data.metodoPago || '').trim();
    if (!metodoVenta || /^mixto/i.test(metodoVenta)) metodoVenta = 'Efectivo';
    const wsPagos = getSheet('CierresPagos');
    productos.forEach(p => {
      wsPagos.appendRow([
        now,
        horaStr,
        data.clienteNombre || '',
        'admin',
        '🛍 ' + p.nombre + (p.cantidad > 1 ? ' x' + p.cantidad : ''),
        Number(p.precio) * Number(p.cantidad || 1),
        metodoVenta,
        data.idEspera || ''
      ]);
    });

    // 3. REGISTRAR EN HistorialOwner — columnas correctas:
    // A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor J=Comision K=MetodoPago
    try {
      const wsHist = getSheet('HistorialOwner');
      wsHist.appendRow([
        fechaStr,                                                                    // A: Fecha
        horaStr,                                                                     // B: Hora
        '',                                                                          // C: Codigo (no aplica para productos)
        data.clienteNombre || 'Venta directa',                                      // D: Cliente — fallback para que el historial lo incluya siempre
        '',                                                                          // E: Top
        '🛍 ' + productos.map(p => p.nombre + (p.cantidad > 1 ? ' x'+p.cantidad : '')).join(', '), // F: Servicio
        'Producto',                                                                  // G: Area
        prop_('ADMIN_NOMBRE') || 'admin',                                           // H: Staff
        Number(data.total || 0),                                                     // I: Valor
        0,                                                                           // J: Comision (sin comisión)
        'Producto'                                                                   // K: MetodoPago (para filtrar)
      ]);
    } catch(e) { Logger.log('Error guardando producto en HistorialOwner: ' + e); }

    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================
// ELIMINAR SERVICIO — borra de HistorialOwner y revierte comisión
// Disponible para Mikaela (admin) y Humberto (owner)
// ============================================
function handleEliminarServicio(data) {
  try {
    const fecha   = String(data.fecha   || '').trim();
    const hora    = String(data.hora    || '').trim();
    const cliente = String(data.cliente || '').trim().toLowerCase();
    const staff   = String(data.staff   || '').trim().toLowerCase();
    const servicio= String(data.servicio|| '').trim().toLowerCase();
    const precio  = Number(data.precio  || 0);
    const comision= Number(data.comision|| 0);
    const tz = 'America/Guayaquil';
    const esTM = staff === 'varios' || /ticket multi \(tm-/i.test(servicio);
    const tmIdMatch = servicio.match(/tm-\d+/i);
    const tmId = tmIdMatch ? tmIdMatch[0].toUpperCase() : null;
    let eliminadoHist = false;
    const staffsAfectados = {};

    // 1. Eliminar de HistorialOwner
    const wsHist = getSheet('HistorialOwner');
    const histData = wsHist.getDataRange().getValues();
    for (let i = histData.length - 1; i >= 3; i--) {
      const rowFecha = histData[i][0] instanceof Date
        ? Utilities.formatDate(histData[i][0], tz, 'dd/MM/yyyy')
        : String(histData[i][0] || '');
      const rowCliente  = String(histData[i][3] || '').trim().toLowerCase();
      const rowStaff    = String(histData[i][7] || '').trim().toLowerCase();
      const rowServicio = String(histData[i][5] || '').trim().toLowerCase();
      const rowPrecio   = Number(histData[i][8] || 0);
      const rowComision = Number(histData[i][9] || 0);
      const matchFecha   = rowFecha === fecha;
      const matchCliente = rowCliente.includes(cliente) || cliente.includes(rowCliente);
      let debeEliminar = false;
      if (esTM && tmId) {
        const esFilaTM = rowServicio.includes(tmId.toLowerCase()) ||
          (matchFecha && matchCliente && (rowStaff === 'varios' || rowServicio.includes('ticket multi')));
        debeEliminar = matchFecha && matchCliente && esFilaTM;
      } else {
        const matchStaff   = staff === '' || rowStaff.includes(staff) || staff.includes(rowStaff);
        const matchServicio= rowServicio.includes(servicio.substring(0, 15)) || servicio.includes(rowServicio.substring(0, 15));
        debeEliminar = matchFecha && matchCliente && matchStaff && matchServicio;
      }
      if (debeEliminar) {
        if (rowStaff && rowStaff !== 'varios' && rowComision > 0) {
          if (!staffsAfectados[rowStaff]) staffsAfectados[rowStaff] = { precio: 0, comision: 0 };
          staffsAfectados[rowStaff].precio   += rowPrecio;
          staffsAfectados[rowStaff].comision += rowComision;
        }
        wsHist.deleteRow(i + 1);
        eliminadoHist = true;
        if (!esTM) break;
      }
    }

    // 2. Eliminar de ServicioNormal y ServicioPromo (lo que ve la staff en "Servicios de hoy")
    try {
      // ServicioNormal
      const wsN = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
      const rowsN = wsN.getDataRange().getValues();
      for (let i = rowsN.length - 1; i >= 1; i--) {
        const rFechaN = rowsN[i][1] instanceof Date
          ? Utilities.formatDate(rowsN[i][1], tz, 'dd/MM/yyyy')
          : String(rowsN[i][1] || '');
        const rClienteN = String(rowsN[i][4] || '').trim().toLowerCase();
        const rStaffN   = String(rowsN[i][9] || '').trim().toLowerCase();
        const matchN = rFechaN === fecha &&
          (rClienteN.includes(cliente) || cliente.includes(rClienteN)) &&
          (staff === '' || rStaffN.includes(staff) || staff.includes(rStaffN));
        if (matchN) { wsN.deleteRow(i + 1); if (!esTM) break; }
      }
    } catch(eN2) {}

    try {
      // ServicioPromo
      const wsP = getOrCreateSheet('ServicioPromo', COLS_PROMO);
      const rowsP = wsP.getDataRange().getValues();
      for (let i = rowsP.length - 1; i >= 1; i--) {
        const rFechaP = rowsP[i][1] instanceof Date
          ? Utilities.formatDate(rowsP[i][1], tz, 'dd/MM/yyyy')
          : String(rowsP[i][1] || '');
        const rClienteP = String(rowsP[i][4] || '').trim().toLowerCase();
        const rStaffP   = String(rowsP[i][9] || '').trim().toLowerCase();
        const matchP = rFechaP === fecha &&
          (rClienteP.includes(cliente) || cliente.includes(rClienteP)) &&
          (staff === '' || rStaffP.includes(staff) || staff.includes(rStaffP));
        if (matchP) { wsP.deleteRow(i + 1); if (!esTM) break; }
      }
    } catch(eP2) {}

    // 3. Eliminar de TicketMulti si es TM
    if (esTM && tmId) {
      try {
        const wsTM = getTMSheet();
        const tmRows = wsTM.getDataRange().getValues();
        for (let i = tmRows.length - 1; i >= 2; i--) {
          if (String(tmRows[i][0] || '').trim().toUpperCase() === tmId) {
            // espejo Lineas: anular TODOS los slots del TM antes de borrar la fila
            try {
              for (let _s = 0; _s < 4; _s++) { anularLineaSlotTM(tmId, _s); }
            } catch (eLnTM) { Logger.log('espejo eliminarServicio TM Lineas: ' + eLnTM); }
            wsTM.deleteRow(i + 1);
            break;
          }
        }
      } catch(eTM2) {}
    }

    // espejo Lineas: si es un servicio individual (no TM), anular (NO borrar) la línea
    // del servicio eliminado, dejando el registro con estado 'anulado' y quién lo quitó.
    // El caso TM ya se maneja arriba con anularLineaSlotTM.
    if (!esTM) {
      try { anularLineaEliminada(data.cliente, data.staff, data.servicio, precio, data.staff); }
      catch (eLnEl) { Logger.log('espejo eliminar Lineas: ' + eLnEl); }
    }

    // 4. Eliminar de CierresPagos (lo que ve la caja chica)
    // FIX: antes se identificaba la fila por cliente+fecha+que el TOTAL coincidiera
    // (Math.abs(rowTotal - precio) < 0.5). El total NO es confiable: un servicio puede
    // estar en el historial con un monto distinto al de cada fila de pago (cobros
    // divididos, promo vs regular, $20 combinado vs dos $10). Cuando no coincidía,
    // la fila quedaba huérfana en caja chica aunque sí se borrara del historial.
    // Ahora se identifica por la misma identidad que HistorialOwner:
    // cliente + fecha + staff + servicio. El total solo se usa de respaldo cuando
    // no llega servicio. Col: [2]=Cliente [3]=Staff [4]=Servicio [5]=Total.
    try {
      const wsPagos = getSheet('CierresPagos');
      const pagosData = wsPagos.getDataRange().getValues();
      for (let i = pagosData.length - 1; i >= 1; i--) {
        const rowCliente2  = String(pagosData[i][2] || '').trim().toLowerCase();
        const rowStaff2    = String(pagosData[i][3] || '').trim().toLowerCase();
        const rowServicio2 = String(pagosData[i][4] || '').trim().toLowerCase();
        const rowTotal2    = Number(pagosData[i][5] || 0);
        const rowFecha2    = pagosData[i][0] instanceof Date
          ? Utilities.formatDate(pagosData[i][0], tz, 'dd/MM/yyyy')
          : String(pagosData[i][0] || '');
        const matchFecha2   = rowFecha2 === fecha;
        const matchCliente2 = rowCliente2.includes(cliente) || cliente.includes(rowCliente2);
        let matchPago;
        if (esTM && tmId) {
          // TM: puede tener varias filas (una por área) → borrar todas las del cliente/fecha
          matchPago = matchFecha2 && matchCliente2;
        } else {
          const matchStaff2 = staff === '' || rowStaff2.includes(staff) || staff.includes(rowStaff2);
          // Preferir identidad por servicio; si no llega servicio, usar total como respaldo
          const matchServicio2 = servicio !== '' &&
            (rowServicio2.includes(servicio.substring(0, 15)) || servicio.includes(rowServicio2.substring(0, 15)));
          const matchTotalFallback = servicio === '' && Math.abs(rowTotal2 - precio) < 0.5;
          matchPago = matchFecha2 && matchCliente2 && matchStaff2 && (matchServicio2 || matchTotalFallback);
        }
        if (matchPago) {
          wsPagos.deleteRow(i + 1);
          if (!esTM) break;
        }
      }
    } catch(e) {}

    // 5. Revertir comisiones
    try {
      const wsComm = getSheet('Comisiones');
      const commData = wsComm.getDataRange().getValues();
      const staffsParaRevertir = esTM && Object.keys(staffsAfectados).length > 0
        ? staffsAfectados
        : (staff !== '' ? { [staff]: { precio: precio, comision: comision } } : {});
      for (const [staffNombre, montos] of Object.entries(staffsParaRevertir)) {
        for (let i = commData.length - 1; i >= 3; i--) {
          const rowChica = String(commData[i][0] || '').trim().toLowerCase();
          if (rowChica.includes(staffNombre) || staffNombre.includes(rowChica)) {
            wsComm.getRange(i + 1, 4).setValue(Math.max(0, Number(commData[i][3]||0) - montos.precio));
            wsComm.getRange(i + 1, 6).setValue(Math.max(0, Number(commData[i][5]||0) - montos.comision));
            break;
          }
        }
      }
    } catch(e) {}

    if (!eliminadoHist) {
      // Intentar matching más flexible — solo por cliente + staff + precio (sin fecha estricta)
      const wsHist2 = getSheet('HistorialOwner');
      const histData2 = wsHist2.getDataRange().getValues();
      for (let i = histData2.length - 1; i >= 3; i--) {
        const rowCliente2  = String(histData2[i][3] || '').trim().toLowerCase();
        const rowStaff2    = String(histData2[i][7] || '').trim().toLowerCase();
        const rowServicio2 = String(histData2[i][5] || '').trim().toLowerCase();
        const rowPrecio2   = Number(histData2[i][8] || 0);
        const rowHora2     = histData2[i][1] instanceof Date
          ? Utilities.formatDate(histData2[i][1], tz, 'HH:mm')
          : String(histData2[i][1] || '');
        const matchCliente2  = rowCliente2.includes(cliente) || cliente.includes(rowCliente2);
        const matchStaff2    = staff === '' || rowStaff2.includes(staff) || staff.includes(rowStaff2);
        const matchServicio2 = rowServicio2.includes(servicio.substring(0, 12)) || servicio.includes(rowServicio2.substring(0, 12));
        const matchPrecio2   = Math.abs(rowPrecio2 - precio) < 0.5;
        const matchHora2     = !hora || rowHora2 === hora || rowHora2.startsWith(hora.substring(0,5));
        if (matchCliente2 && matchStaff2 && matchServicio2 && matchPrecio2 && matchHora2) {
          const rowStaff2Val  = String(histData2[i][7] || '');
          const rowComision2  = Number(histData2[i][9] || 0);
          if (rowStaff2Val && rowComision2 > 0) {
            if (!staffsAfectados[rowStaff2Val.toLowerCase()]) staffsAfectados[rowStaff2Val.toLowerCase()] = { precio: 0, comision: 0 };
            staffsAfectados[rowStaff2Val.toLowerCase()].precio   += rowPrecio2;
            staffsAfectados[rowStaff2Val.toLowerCase()].comision += rowComision2;
          }
          wsHist2.deleteRow(i + 1);
          eliminadoHist = true;
          break;
        }
      }
    }

    if (!eliminadoHist) {
      return { success: false, error: 'No se encontró el registro en HistorialOwner. Verificá que el servicio no haya sido eliminado ya.' };
    }

    return { success: true, eliminado: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// PESTAÑAS NUEVAS: ServicioNormal y ServicioPromo
// ============================================================

var COLS_NORMAL = [
  'ID','Fecha','Hora llegada','Código','Nombre','Servicio','Área','Prioridad',
  'Estado','Tomada por','Hora tomada','Observaciones','Total',
  'Promo nombre','Método pago','Hora cobro','Total cobrado','Desglose (JSON)',
  'Tipo','Precio Normal','Precio Promo'
];

var COLS_PROMO = [
  'ID','Fecha','Hora llegada','Código','Nombre','Servicio','Área actual','Prioridad',
  'Estado','Tomada por','Hora tomada','Observaciones','Total acumulado',
  'Promo nombre','Precio promo','Precio regular','Área completada','Desglose staff (JSON)',
  'Tipo','Precio Normal','Precio Promo','Promos Extra (JSON)'
];

function getOrCreateSheet(nombre, columnas) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName(nombre);
  if (!ws) {
    ws = ss.insertSheet(nombre);
    ws.getRange(1, 1, 1, columnas.length).setValues([columnas]);
    ws.getRange(1, 1, 1, columnas.length).setFontWeight('bold').setBackground('#f0f0f0');
    ws.setFrozenRows(1);
    ws.setColumnWidth(1, 90);
    ws.setColumnWidth(5, 160);
    ws.setColumnWidth(6, 200);
  }
  return ws;
}

function handleInicializarPestanas() {
  try {
    getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    getOrCreateSheet('ServicioPromo', COLS_PROMO);
    return { success: true, message: 'Pestañas ServicioNormal y ServicioPromo listas' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── Generar ID único para ServicioPromo ──────────────────────
function getNextIdPromo() {
  const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
  const data = ws.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0] || '');
    if (id.startsWith('SP-')) {
      const n = parseInt(id.replace('SP-', '')) || 0;
      if (n > max) max = n;
    }
  }
  return 'SP-' + String(max + 1).padStart(4, '0');
}

// ── AGREGAR clienta a ServicioPromo ──────────────────────────
function handleAddServicioPromo(data) {
  try {
    const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const now = new Date();
    const tz = 'America/Guayaquil';
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');
    const id    = getNextIdPromo();

    const precioPromo   = Number(data.precioPromo   || data.total || 0);
    const precioRegular = Number(data.precioRegular || precioPromo);
    // precioMiArea = precio de la primera área que va a atender
    const precioMiArea  = Number(data.precioMiArea  || precioPromo);

    const promasExtraJSON = data.promasExtra && data.promasExtra.length > 0
      ? JSON.stringify(data.promasExtra) : '';

    ws.appendRow([
      id,                          // A: ID
      fecha,                       // B: Fecha
      hora,                        // C: Hora llegada
      _san(data.codigo    || ''), // D: Código cliente
      _san(data.nombre    || ''), // E: Nombre
      _san(data.servicio  || data.promoNombre || ''), // F: Servicio
      _san(data.area      || ''), // G: Área actual
      data.prioridad || 'Normal',  // H: Prioridad
      'Esperando', // I: Estado (la asignación va en col J; la lectura deriva asignadaA)
      data.asignadaA || '',        // J: Tomada por
      '',                          // K: Hora tomada
      _san(data.observaciones || ''), // L: Observaciones
      precioMiArea,                // M: Total acumulado (precio de esta área)
      data.promoNombre || '',      // N: Promo nombre
      precioPromo,                 // O: Precio promo total
      precioRegular,               // P: Precio regular total
      '',                          // Q: Área completada
      '',                          // R: Desglose staff JSON
      'SP',                        // S: Tipo
      precioRegular,               // T: Precio Normal total
      precioPromo,                 // U: Precio Promo total
      promasExtraJSON              // V: Promos Extra pendientes (JSON)
    ]);

    // espejo Lineas: promo → 1 linea (promoRef = id del ticket SP-)
    try {
      lineaDesdeServicioPromo({
        codigo: data.codigo, nombre: data.nombre,
        servicio: data.servicio || data.promoNombre, area: data.area,
        asignadaA: data.asignadaA, promoRef: id,
        precioPromo: precioPromo, precioRegular: precioRegular,
        observaciones: data.observaciones
      });
    } catch (eLn) {}
    return { success: true, id: id, message: 'Clienta agregada a ServicioPromo' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── Generar ID único para ServicioNormal ──────────────────────
function getNextIdNormal() {
  const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
  const data = ws.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0] || '');
    if (id.startsWith('SN-')) {
      const n = parseInt(id.replace('SN-', '')) || 0;
      if (n > max) max = n;
    }
  }
  return 'SN-' + String(max + 1).padStart(4, '0');
}

// ── AGREGAR clienta a ServicioNormal ─────────────────────────
function handleAddServicioNormal(data) {
  try {
    const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const now = new Date();
    const tz = 'America/Guayaquil';
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');

    // ── FIX: guardia anti-duplicado ──────────────────────────────────────
    // Caso real: Mikaela asignó "Retoque efecto polvo" a Rosa para Paula
    // Espinoza y el sistema creó 4 tickets SN- idénticos (mismo código,
    // servicio, área y precio) en el mismo minuto, 3 de ellos cayendo a
    // Keyla. Causa: getNextIdNormal() no tiene protección de duplicado por
    // contenido — un doble-tap, doble-click sin debounce, o un reintento
    // automático del fetch del frontend dispara handleAddServicioNormal
    // varias veces y cada una crea su propia fila con un ID distinto.
    // El LockService global solo serializa el ORDEN de escritura, no impide
    // que 4 llamadas reales se ejecuten una tras otra y generen 4 filas.
    // Esta guardia revisa las últimas filas de HOY: si ya existe una entrada
    // con el mismo código+servicio+área+total creada en los últimos 90
    // segundos, se devuelve esa fila existente en vez de crear una nueva.
    const ventanaMs = 90 * 1000;
    const dataAll = ws.getDataRange().getValues();
    for (let i = dataAll.length - 1; i >= Math.max(1, dataAll.length - 30); i--) {
      const r = dataAll[i];
      if (String(r[3] || '') !== String(data.codigo || '')) continue;
      if (String(r[5] || '') !== String(data.servicio || '')) continue;
      if (String(r[6] || '') !== String(data.area || '')) continue;
      if (Number(r[12] || 0) !== Number(data.total || 0)) continue;
      if (String(r[1] || '') !== fecha) continue;
      // Mismo código+servicio+área+total+fecha → comparar hora (HH:mm) contra ventana
      const horaPrevia = String(r[2] || '');
      const [hPrev, mPrev] = horaPrevia.split(':').map(Number);
      const [hNow, mNow]   = hora.split(':').map(Number);
      if (isNaN(hPrev) || isNaN(mPrev)) continue;
      const minutosPrev = hPrev * 60 + mPrev;
      const minutosNow  = hNow * 60 + mNow;
      if (Math.abs(minutosNow - minutosPrev) * 60000 <= ventanaMs) {
        Logger.log('[AddServicioNormal] Duplicado detectado y bloqueado: ' + r[0] + ' para ' + data.codigo);
        return { success: true, id: String(r[0]), message: 'Servicio ya estaba registrado (duplicado evitado)', duplicadoEvitado: true };
      }
    }

    const id = getNextIdNormal();

    ws.appendRow([
      id,                          // A: ID
      fecha,                       // B: Fecha
      hora,                        // C: Hora llegada
      _san(data.codigo   || ''),   // D: Código cliente
      _san(data.nombre   || ''),   // E: Nombre
      _san(data.servicio || ''),   // F: Servicio
      _san(data.area     || ''),   // G: Área
      data.prioridad|| 'Normal',   // H: Prioridad
      'Esperando', // I: Estado (la asignación va en col J; la lectura deriva asignadaA)
      data.asignadaA|| '',         // J: Tomada por
      '',                          // K: Hora tomada
      _san(data.observaciones || ''), // L: Observaciones
      Number(data.total || 0),     // M: Total
      '',                          // N: Promo nombre
      '',                          // O: Método pago
      '',                          // P: Hora cobro
      '',                          // Q: Total cobrado
      data.serviciosDetalle ? JSON.stringify(data.serviciosDetalle) : '', // R: Desglose JSON (servicios combinados)
      'SN',                        // S: Tipo (SN=normal, SP=promo)
      Number(data.total || 0),     // T: Precio Normal
      ''                           // U: Precio Promo
    ]);

    // ── ESPEJO en Lineas (escritura paralela — Fase 2). No afecta el flujo. ──
    try { data.ticketId = id; lineaDesdeServicioNormal(data); } catch (eLin) { Logger.log('espejo SN: ' + eLin); }

    return { success: true, id: id, message: 'Clienta agregada a ServicioNormal' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── LEER lista de ServicioPromo ───────────────────────────────
function handleGetServicioPromo(params) {
  try {
    const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const data = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const area = params && params.area ? String(params.area).toLowerCase() : '';

    const esperando  = [];
    const enServicio = [];
    const porCobrar  = [];
    const porVerificar = [];

    for (let i = 1; i < data.length; i++) {
      const row    = data[i];
      const estado = String(row[8] || '').toLowerCase().trim();
      if (!['esperando','en servicio','por cobrar','por verificar'].includes(estado)) continue;
      const rowArea = String(row[6] || '').toLowerCase();
      if (area && !rowArea.includes(area) && area !== 'todas') continue;

      const tipo         = String(row[18] || 'SP').trim();
      const precioNormal = Number(row[19] || row[15] || 0);
      const precioPromo  = Number(row[20] || row[14] || 0);

      const item = {
        idEspera    : String(row[0] || ''),
        fecha       : String(row[1] || ''),
        horaLlegada : row[2] instanceof Date ? Utilities.formatDate(row[2], tz, 'HH:mm') : String(row[2]||''),
        codigo      : String(row[3] || ''),
        nombre      : String(row[4] || ''),
        servicio    : String(row[5] || ''),
        area        : String(row[6] || ''),
        prioridad   : String(row[7] || 'Normal'),
        estado      : String(row[8] || ''),
        tomadaPor   : String(row[9] || ''),
        asignadaA   : (estado === 'esperando' && String(row[9] || '').trim()) ? String(row[9]).trim() : '',
        horaTomada  : row[10] instanceof Date ? Utilities.formatDate(row[10], tz, 'HH:mm') : String(row[10]||''),
        observaciones: String(row[11] || ''),
        total       : tipo === 'SP' ? String(precioPromo) : String(precioNormal),
        promoNombre : String(row[13] || ''),
        metodoPago  : String(row[14] || ''),
        tipo        : tipo,
        precioNormal: String(precioNormal),
        precioPromo : String(precioPromo),
        precioRegular: String(precioNormal),
        precioMiArea: String(Number(row[12] || 0)),  // col M = monto de esta área
        serviciosDetalle: (function(){ try { return row[17] ? JSON.parse(row[17]) : null; } catch(e) { return null; } })(), // col R
        promasExtra: (function(){ try { return row[21] ? JSON.parse(row[21]) : []; } catch(e) { return []; } })(), // col V
        fuente      : 'ServicioPromo'
      };

      if (estado === 'esperando')    esperando.push(item);
      else if (estado === 'en servicio') enServicio.push(item);
      else if (estado === 'por cobrar')  porCobrar.push(item);
      else if (estado === 'por verificar') porVerificar.push(item);
    }

    return { success: true, esperando, enServicio, porCobrar, porVerificar };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── LEER lista de ServicioNormal ──────────────────────────────
function handleGetServicioNormal(params) {
  try {
    const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const data = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const area = params && params.area ? String(params.area).toLowerCase() : '';

    const esperando  = [];
    const enServicio = [];
    const porCobrar  = [];
    const porVerificar = [];

    for (let i = 1; i < data.length; i++) {
      const row    = data[i];
      const estado = String(row[8] || '').toLowerCase().trim();
      if (!['esperando','en servicio','por cobrar','por verificar'].includes(estado)) continue;

      // Filtro por área si viene
      const rowArea = String(row[6] || '').toLowerCase();
      if (area && !rowArea.includes(area) && area !== 'todas') continue;

      const tipo         = String(row[18] || 'SN').trim(); // S: Tipo SN/SP
      const precioNormal = Number(row[19] || row[12] || 0); // T: Precio Normal
      const precioPromo  = Number(row[20] || 0);            // U: Precio Promo

      const item = {
        idEspera    : String(row[0] || ''),
        fecha       : String(row[1] || ''),
        horaLlegada : row[2] instanceof Date ? Utilities.formatDate(row[2], tz, 'HH:mm') : String(row[2]||''),
        codigo      : String(row[3] || ''),
        nombre      : String(row[4] || ''),
        servicio    : String(row[5] || ''),
        area        : String(row[6] || ''),
        prioridad   : String(row[7] || 'Normal'),
        estado      : String(row[8] || ''),
        tomadaPor   : String(row[9] || ''),
        asignadaA   : (estado === 'esperando' && String(row[9] || '').trim()) ? String(row[9]).trim() : '',
        horaTomada  : row[10] instanceof Date ? Utilities.formatDate(row[10], tz, 'HH:mm') : String(row[10]||''),
        observaciones: String(row[11] || ''),
        total       : String(row[12] || '0'),
        promoNombre : String(row[13] || ''),
        metodoPago  : String(row[14] || ''),
        tipo        : tipo,
        precioNormal: String(precioNormal),
        precioPromo : String(precioPromo),
        // precioRegular para compatibilidad con cobrarDesdeBtn
        precioRegular: tipo === 'SP' ? String(precioNormal) : String(precioNormal),
        serviciosDetalle: (function(){ try { return row[17] ? JSON.parse(row[17]) : null; } catch(e) { return null; } })(), // col R = servicios combinados
        fuente      : 'ServicioNormal'
      };

      if (estado === 'esperando')   esperando.push(item);
      else if (estado === 'en servicio') enServicio.push(item);
      else if (estado === 'por cobrar')  porCobrar.push(item);
      else if (estado === 'por verificar') porVerificar.push(item);
    }

    return { success: true, esperando, enServicio, porCobrar, porVerificar };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── TOMAR clienta de ServicioPromo ───────────────────────────
function handleTomarServicioPromo(data) {
  try {
    const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const hora = Utilities.formatDate(new Date(), tz, 'HH:mm');

    for (let i = 1; i < rows.length; i++) {
      const id     = String(rows[i][0] || '').trim();
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (id !== String(data.idEspera).trim()) continue;
      if (estado !== 'esperando') continue;

      // Asignación directa: si col J tiene una chica y no es quien intenta tomar, bloquear
      const asignadaA = String(rows[i][9] || '').trim();
      if (asignadaA && asignadaA !== String(data.chicaNombre || '').trim()) {
        return { success: false, message: 'Esta clienta está asignada a ' + asignadaA + '. Solo ella puede tomarla.' };
      }

      const row = i + 1;
      ws.getRange(row, 9).setValue('En servicio');
      ws.getRange(row, 10).setValue(data.chicaNombre || '');
      ws.getRange(row, 11).setValue(hora);

      // espejo Lineas: la chica tomó → línea a 'en_servicio'
      try { marcarLineaEnServicioPorCodigo(String(rows[i][3]||''), String(data.idEspera||''), String(rows[i][6]||''), String(rows[i][13]||rows[i][5]||''), data.chicaNombre||''); } catch (eLn) {}

      // Crear registro en Atenciones
      try {
        const wsA = getSheet('Atenciones');
        const fecha = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');
        const aData = wsA.getDataRange().getValues();
        let maxAt = 0;
        for (let j = 3; j < aData.length; j++) {
          const aid = String(aData[j][0]||'');
          if (aid.startsWith('AT-')) { const n = parseInt(aid.replace('AT-','')); if (n > maxAt) maxAt = n; }
        }
        const atId = 'AT-' + String(maxAt + 1).padStart(4, '0');
        wsA.appendRow([atId, fecha, hora, '', String(rows[i][3]||''), String(rows[i][4]||''),
          data.chicaNombre||'', String(rows[i][5]||''), 'En servicio', '', '', id, String(rows[i][6]||'')]);
      } catch(eA) {}

      _pushMikaela('👤 Clienta tomada', String(data.chicaNombre || 'Una chica') + ' tomó a ' + String(rows[i][4] || 'una clienta') + (rows[i][5] ? ' · ' + rows[i][5] : ''));
      return { success: true, message: 'Clienta tomada' };
    }
    return { success: false, message: 'Ticket SP no encontrado' };
  } catch(e) { return { success: false, message: String(e) }; }
}

// ── FINALIZAR servicio promo → Por cobrar ─────────────────────
function handleFinalizarServicioPromo(data) {
  try {
    const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';

    for (let i = 1; i < rows.length; i++) {
      const id     = String(rows[i][0] || '').trim();
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (id !== String(data.idEspera).trim()) continue;
      if (estado !== 'en servicio') continue;

      const row = i + 1;
      ws.getRange(row, 9).setValue('Por verificar');
        try { _avisarMikaelaClientaLista((data && (data.clienteNombre || data.clientName)) || '', (data && (data.servicio || data.promoNombre)) || ''); } catch(e){}
      if (data.servicio) ws.getRange(row, 6).setValue(data.servicio);
      if (data.total) ws.getRange(row, 13).setValue(Number(data.total));
      if (data.serviciosDetalle) ws.getRange(row, 18).setValue(JSON.stringify(data.serviciosDetalle));
      // espejo Lineas: servicio terminado → línea a 'completado' (= por cobrar)
      try { marcarLineaCompletadaPorCodigo(String(rows[i][3]||''), String(data.idEspera||''), String(rows[i][6]||''), data.promoNombre||String(rows[i][13]||rows[i][5]||'')); } catch (eLn) {}
      // Si la staff CAMBIÓ la promo durante la atención, actualizar la promo del ticket
      // (col 14 = promoNombre, col 20 = precio regular, col 21 = precio promo) para que el
      // cobro use la promo nueva y no la que asignó Mikaela.
      if (data.promoNombre)   ws.getRange(row, 14).setValue(String(data.promoNombre));
      if (data.precioRegular) ws.getRange(row, 20).setValue(Number(data.precioRegular));
      if (data.precioPromo)   ws.getRange(row, 21).setValue(Number(data.precioPromo));

      // Actualizar Atenciones
      try { cerrarAtencion(id, data.chicaNombre || String(rows[i][9]||''),
        String(rows[i][4]||''), data.servicio || String(rows[i][5]||''),
        Number(data.total || rows[i][12] || 0), '', 'Por cobrar'); } catch(eA) {}

      return { success: true };
    }
    return { success: false, message: 'Ticket SP no encontrado' };
  } catch(e) { return { success: false, message: String(e) }; }
}

// ── CONFIRMAR COBRO de ServicioPromo ─────────────────────────
function handleConfirmarCobroPromo(data) {
  try {
    const ws = getOrCreateSheet('ServicioPromo', COLS_PROMO);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const now = new Date();
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');

    for (let i = 1; i < rows.length; i++) {
      const id = String(rows[i][0] || '').trim();
      if (id !== String(data.idEspera).trim()) continue;
      const estado = String(rows[i][8] || '').toLowerCase();
      // ── IDEMPOTENCIA: si ya fue cobrada, devolver éxito sin re-procesar.
      // (Antes el filtro INCLUÍA 'completad' → re-cobraba y duplicaba la comisión.) ──
      if (estado.includes('completad')) {
        return { success: true, yaCobrado: true, message: 'Este ticket ya estaba cobrado.' };
      }
      if (!estado.includes('cobrar') && !estado.includes('pendiente')) continue;

      const metodoPago   = data.metodoPago || 'Efectivo';
      const precioNormal = Number(rows[i][19] || rows[i][15] || 0); // T: Precio Normal total
      const precioPromo  = Number(rows[i][20] || rows[i][14] || 0); // U/O: Precio Promo
      const precioMiArea = Number(rows[i][12] || 0);                // M: precio de esta area

      const codigoCliente = String(rows[i][3] || '');
      const nombreCliente = String(rows[i][4] || '');
      const servicio      = String(rows[i][5] || '');
      const area          = String(rows[i][6] || '');
      const chicaNombre   = String(rows[i][9] || '');
      const notaAjuste    = _san(data.notaAjuste || '');

      // FIX: si precioNormal es 0 (col T/P de ServicioPromo vacía porque el combo
      // no tenía sumaIndividual en Paquetes), buscar el precio regular por nombre
      // en _mapaRegularPromos_ antes de liquidar — si no, Tarjeta cobra el mismo
      // precio que Efectivo porque el motor usa precioNormal como base para tarjeta.
      let precioNormalFinal = precioNormal;
      if (precioNormalFinal === 0 || precioNormalFinal === precioPromo) {
        try {
          var regMap = _mapaRegularPromos_();
          // Limpiar extras concatenados del nombre antes de buscar en Paquetes
          var nombreBase = String(servicio || '').split('+')[0].trim();
          var nombreNorm = _normNombrePromo_(nombreBase);
          if (regMap[nombreNorm] && regMap[nombreNorm] > 0) {
            precioNormalFinal = regMap[nombreNorm];
          }
        } catch(eReg) {}
      }

      // ── FUENTE DE VERDAD: Lineas (monto y montoRegular actualizados) ──────────
      // Lineas se actualiza cuando la staff cambia la promo durante el servicio.
      // ServicioPromo puede tener precioNormal obsoleto (ej: precio de la promo
      // original antes del cambio que hizo María). Leer Lineas primero evita cobrar
      // el precio regular de la promo anterior en lugar del precio actual.
      let lineas = [];
      let _fuenteLineas = false;
      try {
        const _lnCobro = getLineasParaCobro(id);
        if (_lnCobro && _lnCobro.length > 0) {
          lineas = _lnCobro;
          _fuenteLineas = true;
          Logger.log('[CobroSP] fuente=Lineas items=' + lineas.length + ' id=' + id);
        }
      } catch(eLnC) { Logger.log('[CobroSP] Lineas error: ' + eLnC); }

      // ── FALLBACK: serviciosDetalle del frontend o ServicioPromo ──────────────
      if (!_fuenteLineas) {
        Logger.log('[CobroSP] fuente=legacy id=' + id);
        let _fd = null;
        if (data.serviciosDetalle) {
          try { _fd = (typeof data.serviciosDetalle === 'string') ? JSON.parse(data.serviciosDetalle) : data.serviciosDetalle; } catch (e) { _fd = null; }
        }
        if (_fd && _fd.length > 0) {
          lineas = _fd.map(function (p) {
            return {
              staff: String(p.staff || chicaNombre),
              area: String(p.area || area),
              servicio: String(p.servicio || servicio),
              precioRegular: Number(p.montoNormal || precioNormalFinal || 0),
              precioPromo: Number(p.monto || 0)
            };
          });
        } else {
          lineas = [{
            staff: chicaNombre, area: area, servicio: servicio,
            precioRegular: precioNormalFinal > 0 ? precioNormalFinal : precioMiArea,
            precioPromo: precioMiArea > 0 ? precioMiArea : precioPromo
          }];
        }
      }

      // Motor unico: tarjeta=regular / efectivo=promo, reparte comision, suma extras
      const liq = liquidarCobro_(lineas, metodoPago, precioNormalFinal);
      const totalCobrado = liq.total;

      const row = i + 1;
      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 15).setValue(metodoPago);
      ws.getRange(row, 16).setValue(hora);
      ws.getRange(row, 17).setValue(totalCobrado);

      try { updateVisitaClienta(codigoCliente); } catch (e) {}

      // Comision + historial: UNA sola vez, al cobro final, por cada staff que participo
      try {
        const wsH = getSheet('HistorialOwner');
        liq.lineas.forEach(function (l) {
          if (l.staff && l.monto > 0) { try { updateComision(l.staff, l.monto); } catch (eC) {} }
          wsH.appendRow([fecha, hora, codigoCliente, nombreCliente, id,
            l.servicio, l.area, l.staff, l.monto, l.comision, metodoPago, notaAjuste]);
        });
      } catch (eH) {}

      try {
        getSheet('CierresPagos').appendRow([now, hora, nombreCliente, chicaNombre, servicio, totalCobrado, metodoPago, 'promo']);
      } catch (eP) {}

      try { cerrarAtencion(id, chicaNombre, nombreCliente, servicio, totalCobrado, metodoPago, 'Completado'); } catch (eA) {}

      // espejo Lineas: marcar cobradas todas las lineas de este combo (promoRef = idEspera)
      try { marcarLineasPorPromoRef(data.idEspera, metodoPago); } catch (eLn) {}
      return { success: true, totalCobrado: totalCobrado };
    }
    return { success: false, message: 'Ticket SP no encontrado para cobro' };
  } catch (e) { return { success: false, message: String(e) }; }
}

// ── TOMAR clienta de ServicioNormal ──────────────────────────
function handleTomarServicioNormal(data) {
  try {
    const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const hora = Utilities.formatDate(new Date(), tz, 'HH:mm');

    for (let i = 1; i < rows.length; i++) {
      const id     = String(rows[i][0] || '').trim();
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (id !== String(data.idEspera).trim()) continue;
      if (estado !== 'esperando') continue;

      // Asignación directa: si col J tiene una chica y no es quien intenta tomar, bloquear
      const asignadaA = String(rows[i][9] || '').trim();
      if (asignadaA && asignadaA !== String(data.chicaNombre || '').trim()) {
        return { success: false, message: 'Esta clienta está asignada a ' + asignadaA + '. Solo ella puede tomarla.' };
      }

      const row = i + 1;
      ws.getRange(row, 9).setValue('En servicio');
      ws.getRange(row, 10).setValue(data.chicaNombre || '');
      ws.getRange(row, 11).setValue(hora);

      // espejo Lineas: la chica tomó → línea a 'en_servicio'
      try { marcarLineaEnServicioPorCodigo(String(rows[i][3]||''), String(data.idEspera||''), String(rows[i][6]||''), String(rows[i][5]||''), data.chicaNombre||''); } catch (eLn) {}

      // Crear registro en Atenciones para que el panel de staff lo vea
      try {
        const wsA = getSheet('Atenciones');
        const fecha = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');
        const codigoCliente = String(rows[i][3]||'');
        const nombreCliente = String(rows[i][4]||'');
        const servicio      = String(rows[i][5]||'');
        const area          = String(rows[i][6]||'');
        // Buscar último ID de atención
        const aData = wsA.getDataRange().getValues();
        let maxAt = 0;
        for (let j = 3; j < aData.length; j++) {
          const aid = String(aData[j][0]||'');
          if (aid.startsWith('AT-')) { const n = parseInt(aid.replace('AT-','')); if (n > maxAt) maxAt = n; }
        }
        const atId = 'AT-' + String(maxAt + 1).padStart(4, '0');
        // Columnas Atenciones: A=ID | B=Fecha | C=HoraEntrada | D=HoraSalida | E=CódigoCliente | F=Cliente | G=Staff | H=Servicio | I=Estado | J=Total | K=MetodoPago | L=idEspera
        wsA.appendRow([atId, fecha, hora, '', codigoCliente, nombreCliente,
          data.chicaNombre||'', servicio, 'En servicio', '', '', id, area]);
      } catch(eA) {}

      _pushMikaela('👤 Clienta tomada', String(data.chicaNombre || 'Una chica') + ' tomó a ' + String(rows[i][4] || 'una clienta') + (rows[i][5] ? ' · ' + rows[i][5] : ''));
      return { success: true, message: 'Clienta tomada' };
    }
    return { success: false, message: 'Ticket no encontrado o no está esperando' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── FINALIZAR servicio normal → Por cobrar ────────────────────
function handleFinalizarServicioNormal(data) {
  try {
    const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const hora = Utilities.formatDate(new Date(), tz, 'HH:mm');

    for (let i = 1; i < rows.length; i++) {
      const id     = String(rows[i][0] || '').trim();
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (id !== String(data.idEspera).trim()) continue;
      if (estado !== 'en servicio') continue;

      const row = i + 1;

      // Si viene nuevaArea → devolver a lista de espera para siguiente staff
      if (data.nuevaArea && !data.esRetiro) {
        ws.getRange(row, 9).setValue('Esperando');
        ws.getRange(row, 10).setValue('');
        ws.getRange(row, 11).setValue('');
        ws.getRange(row, 7).setValue(String(data.nuevaArea).toLowerCase());
        ws.getRange(row, 6).setValue(data.servicio || data.servicioSiguiente || '');
        ws.getRange(row, 13).setValue(Number(data.total || 0));
        const obsActual = _soloTextoSistemaObs(String(rows[i][11] || ''));
        ws.getRange(row, 12).setValue((obsActual ? obsActual + ' | ' : '') + '✅ ' + (data.areaCompletada||'') + ' completado por ' + (data.chicaNombre||'') + ' · Sigue: ' + (data.areasFaltantes||''));
        if (data.chicaNombre && data.montoChica && Number(data.montoChica) > 0) {
          updateComision(data.chicaNombre, Number(data.montoChica));
        }
        return { success: true, message: 'Área completada, clienta devuelta a lista de espera' };
      }

      ws.getRange(row, 9).setValue('Por verificar');
        try { _avisarMikaelaClientaLista((data && (data.clienteNombre || data.clientName)) || '', (data && (data.servicio || data.promoNombre)) || ''); } catch(e){}
      if (data.servicio) ws.getRange(row, 6).setValue(data.servicio);
      ws.getRange(row, 13).setValue(Number(data.total || rows[i][12] || 0));
      if (data.serviciosDetalle) ws.getRange(row, 18).setValue(JSON.stringify(data.serviciosDetalle));
      // espejo Lineas: servicio terminado → línea a 'completado' (= por cobrar)
      try { marcarLineaCompletadaPorCodigo(String(rows[i][3]||''), String(data.idEspera||''), String(rows[i][6]||''), data.servicio||String(rows[i][5]||'')); } catch (eLn) {}

      // Actualizar Atenciones a "Por cobrar"
      try {
        cerrarAtencion(data.idEspera,
          data.chicaNombre || String(rows[i][9]||''),
          String(rows[i][4]||''),
          data.servicio || String(rows[i][5]||''),
          Number(data.total || rows[i][12] || 0),
          '', 'Por cobrar');
      } catch(eA) {}

      // NOTA: la comisión se registra SOLO en handleConfirmarCobroNormal (al cobrar)
      // NO llamar updateComision aquí para evitar doble registro

      return { success: true, message: 'Servicio finalizado, listo para cobrar' };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

// ── CONFIRMAR cobro de ServicioNormal ─────────────────────────
function handleConfirmarCobroNormal(data) {
  try {
    const ws = getOrCreateSheet('ServicioNormal', COLS_NORMAL);
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const now = new Date();
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');

    for (let i = 1; i < rows.length; i++) {
      const id     = String(rows[i][0] || '').trim();
      const estado = String(rows[i][8] || '').toLowerCase().trim();
      if (id !== String(data.idEspera).trim()) continue;
      // ── IDEMPOTENCIA: si ya fue cobrada, devolver éxito sin re-procesar ──
      if (estado === 'completada' || estado === 'completado') {
        return { success: true, yaCobrado: true, message: 'Este ticket ya estaba cobrado.' };
      }
      if (!['por cobrar','en servicio'].includes(estado)) continue;

      const row = i + 1;
      const metodoPago = data.metodoPago || 'Efectivo';

      const codigoCliente = String(rows[i][3] || '');
      const nombreCliente = String(rows[i][4] || '');
      const servicio      = String(rows[i][5] || '');
      const area          = String(rows[i][6] || '');
      const chicaNombre   = String(rows[i][9] || '');

      const tipo            = String(rows[i][18] || 'SN').trim();
      const precioNormalRow = Number(rows[i][19] || rows[i][12] || 0);
      const precioPromoRow  = Number(rows[i][20] || 0);
      const totalFrontend   = Number(data.totalCobrado || 0);

      // Armar lineas (hechos) para el motor unico
      let lineas = [];
      let _fd = null;
      if (data.serviciosDetalle) {
        try { _fd = (typeof data.serviciosDetalle === 'string') ? JSON.parse(data.serviciosDetalle) : data.serviciosDetalle; } catch (e) { _fd = null; }
      }
      if (_fd && _fd.length > 0) {
        lineas = _fd.map(function (p) {
          return {
            staff: String(p.staff || chicaNombre),
            area: String(p.area || area),
            servicio: String(p.servicio || servicio),
            precioRegular: Number(p.montoNormal || 0),
            precioPromo: Number(p.monto || 0)
          };
        });
      } else {
        const reg  = (tipo === 'SP') ? precioNormalRow : (totalFrontend > 0 ? totalFrontend : precioNormalRow);
        const prom = (tipo === 'SP') ? (precioPromoRow > 0 ? precioPromoRow : totalFrontend) : 0;
        lineas = [{ staff: chicaNombre, area: area, servicio: servicio, precioRegular: reg, precioPromo: prom }];
      }

      const liq = liquidarCobro_(lineas, metodoPago, precioNormalRow);
      const totalCobrado = liq.total;

      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 15).setValue(metodoPago);
      ws.getRange(row, 16).setValue(hora);
      ws.getRange(row, 17).setValue(totalCobrado);

      // TOP flag (estrella)
      let topStr = '';
      try {
        const wsC = getSheet('Clientas');
        const cData = wsC.getDataRange().getValues();
        for (let j = 3; j < cData.length; j++) {
          if (String(cData[j][0]).trim() === codigoCliente.trim()) {
            if (String(cData[j][7]||'').toLowerCase().includes('s\u00ed')) topStr = '\u2b50';
            break;
          }
        }
      } catch (e) {}

      try { updateVisitaClienta(codigoCliente); } catch (e) {}

      // Comision + historial: una sola vez, por cada staff que participo
      try {
        const wsH = getSheet('HistorialOwner');
        liq.lineas.forEach(function (l) {
          if (l.staff && l.monto > 0) { try { updateComision(l.staff, l.monto); } catch (eC) {} }
          wsH.appendRow([fecha, hora, codigoCliente, nombreCliente, topStr,
            l.servicio, l.area, l.staff, l.monto, l.comision, metodoPago]);
        });
      } catch (eH) {}

      try {
        const desgloseStr = data.serviciosDetalle && data.serviciosDetalle.length > 0 ? JSON.stringify(data.serviciosDetalle) : '';
        getSheet('CierresPagos').appendRow([now, hora, nombreCliente, chicaNombre, servicio, totalCobrado, metodoPago, desgloseStr]);
      } catch (eP) {}

      try { cerrarAtencion(data.idEspera, chicaNombre, nombreCliente, servicio, totalCobrado, metodoPago, 'Completado'); } catch (eA) {}

      // ServiciosExtras: llenar col K con este ID
      try {
        const wsExt = getSheet('ServiciosExtras');
        if (wsExt) {
          const extData = wsExt.getDataRange().getValues();
          const cod = String(rows[i][3]||'').trim();
          for (let e = 1; e < extData.length; e++) {
            if (String(extData[e][5]||'').trim() === cod &&
                String(extData[e][0]||'').trim() === fecha &&
                String(extData[e][10]||'').trim() === '') {
              wsExt.getRange(e+1, 11).setValue(id);
            }
          }
        }
      } catch (eE) {}

      // espejo Lineas: marcar como cobradas TODAS las lineas de este ticket SN-
      // usando el promoRef exacto (= id del SN-), igual que confirmarCobroMulti con TM-.
      // Antes: marcarLineaCobradaPorCodigo (fuzzy) podia marcar la linea equivocada
      // si la clienta tenia varios servicios activos el mismo dia.
      try { marcarLineasPorPromoRef(id, metodoPago); } catch (eLn) { Logger.log('espejo cobro SN-: ' + eLn); }
      return { success: true, message: 'Cobro confirmado' };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}


// ============================================================
// TICKET MULTI — Hoja TicketMulti
// Columnas: A=ID, B=Fecha, C=HoraLlegada, D=Código, E=Nombre,
//  F=Estado, G=Prioridad, H=Observaciones, I=MetodoPago, J=HoraCobro,
//  K=A1Tentativo, L=A1Confirmado, M=A1Staff, N=A1Estado, O=A1Hora,
//  P=A2Tentativo, Q=A2Confirmado, R=A2Staff, S=A2Estado, T=A2Hora,
//  U=A3Tentativo, V=A3Confirmado, W=A3Staff, X=A3Estado, Y=A3Hora,
//  Z=A4Tentativo, AA=A4Confirmado, AB=A4Staff, AC=A4Estado, AD=A4Hora,
//  AE=PrecioA1, AF=PrecioA2, AG=PrecioA3, AH=PrecioA4,
//  AI=PrecioNormalTotal, AJ=PreciopromoTotal, AK=TotalCobrado
// ============================================================

function getTMSheet() { return getSheet('TicketMulti'); }

function nextTMId() {
  const ws = getTMSheet();
  const last = ws.getLastRow();
  if (last < 3) return 'TM-0001';
  const ids = ws.getRange(3, 1, last - 2, 1).getValues()
    .map(r => String(r[0] || ''))
    .filter(id => id.startsWith('TM-'))
    .map(id => parseInt(id.replace('TM-', '')) || 0);
  const max = ids.length ? Math.max(...ids) : 0;
  return 'TM-' + String(max + 1).padStart(4, '0');
}

// Columnas base por área (0-indexed): área 1=col10(K), área 2=col15(P), área 3=col20(U), área 4=col25(Z)
const TM_AREA_COL = [10, 15, 20, 25]; // col K, P, U, Z (0-indexed)
const TM_PRECIO_COL = [30, 31, 32, 33]; // col AE, AF, AG, AH (0-indexed)

function _catPromoDivision_(x) {
  x = String(x || '').toLowerCase();
  try { x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  if (x.indexOf('depil') >= 0 || x.indexOf('bikini') >= 0 || x.indexOf('axila') >= 0 || x.indexOf('pierna') >= 0 || x.indexOf('bigote') >= 0) return 'depilacion';
  if (x.indexOf('lifting') >= 0 || x.indexOf('retiro') >= 0) return 'retiro_lifting';
  if (x.indexOf('pest') >= 0) return 'pestanas';
  if (x.indexOf('facial') >= 0 || x.indexOf('hidra') >= 0 || x.indexOf('limpieza') >= 0) return 'facial';
  if (x.indexOf('cej') >= 0 || x.indexOf('pigment') >= 0) return 'cejas';
  return x.replace(/[^a-z0-9]/g, '');
}

function _mapaDivisionPromos_() {
  var mapa = {};
  try {
    var ws = getSheet('Paquetes');
    var data = ws.getDataRange().getValues();
    for (var i = 3; i < data.length; i++) {
      var nombre = String(data[i][1] || '').trim();
      var raw = String(data[i][9] || '').trim();
      if (!nombre || !raw) continue;
      var arr = [];
      try { arr = JSON.parse(raw); } catch (e) { arr = []; }
      if (!Array.isArray(arr) || !arr.length) continue;
      var div = {};
      arr.forEach(function(d) {
        var key = _catPromoDivision_(d.realArea || d.area || d.servicio || '');
        var monto = Number(d.monto || d.precio || d.total || 0);
        if (!key || !(monto > 0)) return;
        // FIX: si ya existe una entrada para esta área (ej. "depilacion") y hay otra
        // entrada diferente del mismo área (ej. Axilas Y Depilación de cejas ambas
        // caen en "depilacion"), crear una clave única para la segunda usando el
        // nombre del servicio como sufijo, para que el TM las trate como slots
        // separados en lugar de sumarlas en uno solo.
        // Antes: div["depilacion"].monto = $33 + $41 = $74 (un solo slot → precio doble)
        // Ahora: div["depilacion"] = $33  y  div["depilacion_2"] = $41 (dos slots)
        if (div[key]) {
          var idx = 2;
          while (div[key + '_' + idx]) idx++;
          key = key + '_' + idx;
        }
        div[key] = {
          monto: monto,
          regular: Number(d.regular || d.montoRegular || d.precioRegular || d.normal || 0),
          areaBase: _catPromoDivision_(d.realArea || d.area || d.servicio || ''),
          servicio: String(d.servicio || d.area || '')
        };
      });
      mapa[_normNombrePromo_(nombre)] = div;
    }
  } catch (e) {}
  return mapa;
}

function handleCrearTicketMulti(data) {
  try {
    const ws = getTMSheet();
    const tz = 'America/Guayaquil';
    const now = new Date();
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');
    const id    = nextTMId();

    // areas: array de { tentativo, area, precio, precioNormal, tipo }
    const areas = data.areas || [];

    // ── MODELO NUEVO: agrupar por área ───────────────────────
    // Si la promo viene desde SYNA, NO se reparte proporcionalmente: se respeta
    // la división exacta guardada en Paquetes (col J) para evitar decimales.
    var divisionPromos = _mapaDivisionPromos_();
    // Contador para asignar entradas de la misma área base en orden
    var _divAreaCount = {};
    areas.forEach(function(a) {
      if (String(a.tipo || '').toLowerCase() !== 'promo') return;
      var div = divisionPromos[_normNombrePromo_(a.tentativo || '')];
      if (!div) return;
      // Buscar el slot correcto: la primera entrada cuya areaBase coincide
      // y que aún no fue consumida (para evitar asignar el mismo precio a ambas áreas)
      var areaKey = _catPromoDivision_(a.area || a.tentativo || '');
      var _countKey = _normNombrePromo_(a.tentativo || '') + '__' + areaKey;
      if (!_divAreaCount[_countKey]) _divAreaCount[_countKey] = 0;
      _divAreaCount[_countKey]++;
      // Primera ocurrencia → key base; segunda → key_2; tercera → key_3; etc.
      var slotKey = _divAreaCount[_countKey] === 1 ? areaKey : (areaKey + '_' + _divAreaCount[_countKey]);
      var exact = div[slotKey] || div[areaKey]; // fallback a base si el slot numerado no existe
      if (!exact || !(exact.monto > 0)) return;
      a.precio = Math.round(Number(exact.monto) * 100) / 100;
      if (exact.regular > 0) a.precioNormal = Math.round(Number(exact.regular) * 100) / 100;
    });

    // FIX: si algún área de promo no tiene precioNormal (la división no tenía 'regular'
    // en Paquetes), buscar el precio regular del combo completo en _mapaRegularPromos_
    // y distribuirlo proporcionalmente entre las áreas. Sin esto, montoRegular en Lineas
    // queda igual al promo y la comisión del segundo staff se calcula sobre precio promo.
    try {
      var regMap = _mapaRegularPromos_();
      areas.forEach(function(a) {
        if (String(a.tipo || '').toLowerCase() !== 'promo') return;
        if (a.precioNormal > 0 && a.precioNormal !== a.precio) return; // ya tiene regular real
        // Limpiar extras concatenados antes de buscar en Paquetes
        var nombreBase = String(a.tentativo || '').split('+')[0].trim();
        var nombreNorm = _normNombrePromo_(nombreBase);
        var regularTotal = regMap[nombreNorm] || 0;
        if (regularTotal <= 0 || regularTotal <= a.precio) return;
        a.precioNormal = Math.round(regularTotal * 100) / 100;
      });
    } catch(eReg) { Logger.log('[TM precioNormal fallback] ' + eReg); }

    // Una promo = un ticket. Cada entrada de la división es un slot separado
    // aunque compartan el mismo área base.
    // FIX: antes se agrupaba por area key, sumando Axilas ($33) y Depilación de
    // cejas ($41) en un solo slot "depilacion" ($74). Ahora cada entrada es su
    // propio slot — el area del slot usa el nombre del servicio específico si
    // están en la misma área base, para que el TM las registre por separado.
    var porArea = {}, ordenAreas = [];
    areas.forEach(function(a) {
      var key = String(a.area || 'otro').trim();
      if (!key) key = 'otro';
      // Si ya existe un slot para esta área exacta, usar un sufijo único para
      // que la segunda entrada tenga su propio slot en el TM en lugar de sumarse.
      var slotKey = key;
      if (porArea[slotKey]) {
        var idx2 = 2;
        while (porArea[slotKey + '_' + idx2]) idx2++;
        slotKey = slotKey + '_' + idx2;
      }
      porArea[slotKey] = {
        area: key,        // ← área real sin sufijo, la que va al TM
        tentativo: a.tentativo || '',
        precio: Math.round(Number(a.precio || 0) * 100) / 100,
        precioNormal: Math.round(Number(a.precioNormal || a.precio || 0) * 100) / 100,
        tipo: a.tipo || 'normal',
        _nombres: [String(a.tentativo || '').trim()].filter(Boolean)
      };
      ordenAreas.push(slotKey);
    });
    var areasAgrupadas = ordenAreas.slice(0, 4).map(function(slotKey) {
      var g = porArea[slotKey];
      delete g._nombres;
      return g;
    });
    // ── FIN AGRUPACIÓN ───────────────────────────────────────

    // Construir fila de 37 columnas (A=0 → AK=36)
    var row = Array(37).fill('');
    row[0]  = id;
    row[1]  = fecha;
    row[2]  = hora;
    row[3]  = data.codigo   || '';
    row[4]  = data.nombre   || '';
    row[5]  = 'Activo';
    row[6]  = data.prioridad || 'Normal';
    row[7]  = (data.secuencia && data.secuencia.length > 0)
              ? 'SEQ:' + data.secuencia.join(',') + (data.observaciones ? '|' + data.observaciones : '')
              : (data.observaciones || '');
    row[8]  = '';
    row[9]  = '';

    var precioNormalTotal = 0;
    var precioPromoTotal  = 0;

    areasAgrupadas.forEach(function(a, i) {
      if (i > 3) return;
      var base = TM_AREA_COL[i];
      row[base]     = (a.area || '') + '||' + (a.tentativo || '');
      row[base + 1] = '';
      row[base + 2] = (i === 0 && data.asignadaA) ? String(data.asignadaA).trim() : ''; // staff asignada al 1er servicio
      row[base + 3] = 'Esperando';
      row[base + 4] = '';
      row[TM_PRECIO_COL[i]] = a.precio;
      precioNormalTotal += a.precioNormal;
      precioPromoTotal  += a.precio;
    });

    row[34] = precioNormalTotal;
    row[35] = precioPromoTotal;
    // row[36]: JSON array of precioNormal per area slot (for tarjeta recalculation)
    var precioNormalPorArea = areasAgrupadas.map(function(a) { return a.precioNormal || a.precio || 0; });
    row[36] = JSON.stringify(precioNormalPorArea);

    ws.appendRow(row);
    // espejo Lineas: 1 línea por slot del TM (promoRef = id:slot), agrupadas por visita
    try { lineasDesdeTicketMulti(data, id, areasAgrupadas); } catch (eLn) { Logger.log('espejo TM crear: ' + eLn); }
    return { success: true, id, areasCount: areasAgrupadas.length };
  } catch(e) { return { success: false, message: String(e) }; }
}

// ── Helpers de regular de promos (fuente: hoja Paquetes) ─────
// Normaliza un nombre de combo para comparar sin acentos/símbolos.
function _normNombrePromo_(s) {
  s = String(s || '');
  try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  return s.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Mapa { nombreComboNormalizado: regularTotal } desde Paquetes. Fuente de
// verdad del precio REGULAR de cada promo. Si Paquetes no está, devuelve {}.
// Construye un mapa { nombreCombo_normalizado → modeloPestanas } leyendo el campo
// `servicios` (col C) de la hoja Paquetes.
// Permite que el clasificador resuelva "Combo 7 Hawaiano" -> "Hawaiano" en lugar de
// caer en "Otro modelo", ya que el campo servicios dice "Pestanas hawaiano + ...".
var _cacheModelosPestanas_ = null;
function _mapaModelosPestanas_() {
  if (_cacheModelosPestanas_) return _cacheModelosPestanas_;
  var mapa = {};
  try {
    var ws = getSheet('Paquetes');
    if (!ws) return mapa;
    var data = ws.getDataRange().getValues();
    for (var i = 3; i < data.length; i++) {
      var nombre = String(data[i][1] || '').trim();
      var servicios = String(data[i][2] || '').toLowerCase();
      if (!nombre || !servicios) continue;
      if (servicios.indexOf('pesta') < 0 && servicios.indexOf('lifting') < 0
       && servicios.indexOf('retiro') < 0) continue;
      var modelo = '';
      if (servicios.indexOf('mega volumen') >= 0)        modelo = 'Mega volumen';
      else if (servicios.indexOf('volumen egipcio') >= 0 || servicios.indexOf('egipcio') >= 0) modelo = 'Volumen egipcio';
      else if (servicios.indexOf('volumen ruso') >= 0)   modelo = 'Volumen ruso';
      else if (servicios.indexOf('volumen brasile') >= 0 || servicios.indexOf('brasile') >= 0) modelo = 'Volumen brasilero';
      else if (servicios.indexOf('volumen') >= 0)        modelo = 'Volumen';
      else if (servicios.indexOf('aura') >= 0)           modelo = 'Aura';
      else if (servicios.indexOf('tecnologico') >= 0)    modelo = 'Tecnologico';
      else if (servicios.indexOf('hibrid') >= 0)         modelo = 'Hibridas';
      else if (servicios.indexOf('kylie') >= 0)          modelo = 'Kylie';
      else if (servicios.indexOf('rimel') >= 0)          modelo = 'Efecto rimel';
      else if (servicios.indexOf('pelo a pelo') >= 0)    modelo = 'Pelo a pelo clasicas';
      else if (servicios.indexOf('efecto seda') >= 0)    modelo = 'Efecto seda';
      else if (servicios.indexOf('clasica') >= 0)        modelo = 'Clasicas';
      else if (servicios.indexOf('natural') >= 0)        modelo = 'Natural';
      else if (servicios.indexOf('hawaiano') >= 0)       modelo = 'Hawaiano';
      // lifting y retiro son tratamientos, no modelos - modelo queda vacio
      if (modelo) mapa[_normNombrePromo_(nombre)] = modelo;
    }
  } catch (e) { Logger.log('[mapaModelosPestanas] ' + String(e)); }
  _cacheModelosPestanas_ = mapa;
  return mapa;
}

function _mapaRegularPromos_() {
  var mapa = {};
  try {
    var ws = getSheet('Paquetes');
    if (!ws) return mapa;
    var data = ws.getDataRange().getValues();
    for (var i = 3; i < data.length; i++) {
      var nombre = String(data[i][1] || '').trim();
      if (!nombre) continue;
      var reg = Number(data[i][4] || data[i][3] || 0);  // col E=regular (fallback col D=promo)
      if (reg > 0) mapa[_normNombrePromo_(nombre)] = reg;
    }
  } catch (e) {}
  return mapa;
}

// Regular total REAL de un ticket TM, re-derivado desde Paquetes: cada combo
// promo cuenta su regular UNA sola vez; las áreas sueltas/extra cuentan su
// propio precio. Evita el descuento doble-contado al cobrar con tarjeta.
function _regularRealTM_(row, regMap) {
  regMap = regMap || _mapaRegularPromos_();
  // BLINDAJE: regular por área guardado al crear el ticket (col AK / índice 36).
  // Es el respaldo cuando la etiqueta del área NO matchea un combo conocido por
  // nombre (etiqueta de servicio suelto, combo renombrado, ticket de SYNA, etc.).
  // Así en tarjeta NUNCA se cae al precio promo: si hay un regular por área guardado
  // (mayor que el promo), se usa ese.
  var normalArr = [];
  try { normalArr = JSON.parse(String(row[36] || '[]')); } catch (e) {}
  if (!Array.isArray(normalArr)) normalArr = [];
  var vistos = {}, total = 0;
  for (var i = 0; i < 4; i++) {
    var base = TM_AREA_COL[i];
    var raw = String(row[base] || '').trim();
    if (!raw) continue;
    if (String(row[base + 3] || '').toLowerCase() === 'cancelado') continue;
    var tent = raw.indexOf('||') !== -1 ? raw.split('||')[1] : raw;
    var k = _normNombrePromo_(tent);
    if (regMap[k] !== undefined) {
      if (!vistos[k]) { total += regMap[k]; vistos[k] = true; } // combo conocido: regular 1 vez
    } else {
      // No es un combo reconocido por nombre → usar el REGULAR por área guardado;
      // si no hay (o es 0), recién ahí el precio del área. Nunca menos que el promo.
      var regArea = Number(normalArr[i] || 0);
      var promoArea = Number(row[TM_PRECIO_COL[i]] || 0);
      if (!(regArea > 0)) regArea = promoArea;
      if (regArea < promoArea) regArea = promoArea; // un regular guardado no puede ser menor al promo
      total += regArea;
    }
  }
  return Math.round(total * 100) / 100;
}

function handleGetTicketMulti(params) {
  try {
    const ws = getTMSheet();
    const last = ws.getLastRow();
    if (last < 3) return { success: true, activos: [], porCobrar: [] };

    const rows = ws.getRange(3, 1, last - 2, 37).getValues();
    const tz = 'America/Guayaquil';
    const hoy = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');

    const activos = [], porCobrar = [], porVerificar = [];

    // Mapa autoritativo de regular por combo (hoja Paquetes). Se usa para
    // re-derivar el precio normal por área y evitar el descuento doble-contado
    // de tickets creados por clientes/SYNA desactualizados.
    const _regMapTM = _mapaRegularPromos_();

    rows.forEach((row, idx) => {
      const id     = String(row[0] || '').trim();
      if (!id.startsWith('TM-')) return;
      const estado = String(row[5] || '').toLowerCase();
      if (estado === 'completado') return;

      // Filtrar por chica si viene params.chica
      const chica = params && params.chica ? String(params.chica).trim() : '';

      // Construir areas
      const areas = [];
      TM_AREA_COL.forEach(function(base, i) {
        const rawTentativo = String(row[base] || '').trim();
        if (!rawTentativo) return;
        // Parsear área del prefijo "area||servicio"
        var areaVal = '';
        var tentativoVal = rawTentativo;
        if (rawTentativo.indexOf('||') !== -1) {
          var parts = rawTentativo.split('||');
          areaVal = parts[0];
          tentativoVal = parts[1] || rawTentativo;
        }
        const precioPromoArea  = Number(row[TM_PRECIO_COL[i]] || 0);
        const totalPromoTM     = Number(row[35] || 0);
        const totalNormalTM    = Number(row[34] || 0);
        // FIX: leer precioNormal por área desde row[36] (JSON array)
        // Si no existe, calcular proporcionalmente como fallback
        var precioNormalArea = precioPromoArea;
        try {
          var normalArr = JSON.parse(String(row[36] || '[]'));
          if (Array.isArray(normalArr) && normalArr[i] !== undefined) {
            precioNormalArea = Number(normalArr[i]) || precioPromoArea;
          } else if (totalPromoTM > 0 && totalNormalTM > 0) {
            precioNormalArea = Math.round(totalNormalTM * (precioPromoArea / totalPromoTM) * 100) / 100;
          }
        } catch(eN) {
          if (totalPromoTM > 0 && totalNormalTM > 0) {
            precioNormalArea = Math.round(totalNormalTM * (precioPromoArea / totalPromoTM) * 100) / 100;
          }
        }
        areas.push({
          idx: i + 1,
          area:         areaVal,
          tentativo:    tentativoVal,
          confirmado:   String(row[base + 1] || '').trim(),
          staff:        String(row[base + 2] || '').trim(),
          estado:       String(row[base + 3] || 'Esperando').trim(),
          hora:         String(row[base + 4] || '').trim(),
          precio:       precioPromoArea,
          precioNormal: precioNormalArea
        });
      });

      // Mantener precioNormal por área leído del TM. La división exacta viene de
      // Paquetes.DIVISION al crear el ticket; no repartir proporcionalmente aquí.

      const obsRaw = String(row[7] || '');
      var secuencia = [];
      var observaciones = obsRaw;
      if (obsRaw.startsWith('SEQ:')) {
        var seqPart = obsRaw.substring(4);
        var pipeIdx = seqPart.indexOf('|');
        if (pipeIdx !== -1) {
          secuencia = seqPart.substring(0, pipeIdx).split(',').filter(Boolean);
          observaciones = seqPart.substring(pipeIdx + 1);
        } else {
          secuencia = seqPart.split(',').filter(Boolean);
          observaciones = '';
        }
      }

      // Total REAL = suma de áreas activas (servicios + extras), no el campo guardado
      // (que puede quedar desfasado al agregar un extra). Combo normal: la suma de
      // áreas ya es el precio del combo, así que no cambia.
      var _sumPromo = 0, _sumNormal = 0;
      areas.forEach(function(a){
        if (String(a.estado || '').toLowerCase() === 'cancelado') return;
        _sumPromo  += Number(a.precio || 0);
        _sumNormal += Number(a.precioNormal || a.precio || 0);
      });

      const item = {
        idEspera:         id,
        codigo:           String(row[3] || ''),
        nombre:           String(row[4] || ''),
        estado:           String(row[5] || ''),
        prioridad:        String(row[6] || ''),
        observaciones:    observaciones,
        secuencia:        secuencia,
        metodoPago:       String(row[8] || ''),
        horaCobro:        String(row[9] || ''),
        areas,
        precioNormal:     _sumNormal || Number(row[34] || 0),
        precioPromo:      _sumPromo  || Number(row[35] || 0),
        totalCobrado:     Number(row[36] || 0),
        rowIndex:         idx + 3,
        fuente:           'TicketMulti'
      };

      if (estado === 'por verificar') {
        porVerificar.push(item);
      } else if (estado === 'por cobrar') {
        porCobrar.push(item);
      } else {
        // Si viene filtro por chica, solo incluir si tiene área asignada a esa chica
        if (chica) {
          const tieneArea = areas.some(a => a.staff === chica && a.estado !== 'Completado');
          if (!tieneArea) return;
        }
        activos.push(item);
      }
    });

    return { success: true, activos, porCobrar, porVerificar };
  } catch(e) { return { success: false, message: String(e) }; }
}

function handleTomarAreaTicketMulti(data) {
  try {
    const ws = getTMSheet();
    const rows = ws.getRange(3, 1, ws.getLastRow() - 2, 37).getValues();
    const tz = 'America/Guayaquil';
    const hora = Utilities.formatDate(new Date(), tz, 'HH:mm');

    // Familia de área para emparejar staff con el área correcta del ticket
    function _famAreaTM(x) {
      x = String(x || '').toLowerCase();
      if (x.indexOf('facial') >= 0 || x.indexOf('hidra') >= 0 || x.indexOf('limpieza') >= 0) return 'facial';
      if (x.indexOf('pest') >= 0) return 'pestanas';
      // FIX: retiro de pestañas, lifting de pestañas y retiro_lifting son servicios de
      // pestañas — los realiza Yadira/Diana, no las chicas de cejas. Antes caía en 'cejas'
      // porque el clasificador genérico encontraba 'lifting'/'retiro' y los mandaba ahí,
      // lo que impedía que Yadira tomara el ticket y generaba 5-6 duplicados SN.
      if (x.indexOf('retiro') >= 0 || x.indexOf('lifting') >= 0) return 'pestanas';
      if (x.indexOf('cej') >= 0 || x.indexOf('depil') >= 0 || x.indexOf('bigote') >= 0 ||
          x.indexOf('pigment') >= 0) return 'cejas';
      return x;
    }
    const famStaff = _famAreaTM(data.chicaArea);

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== data.idEspera) continue;
      const rowNum = i + 3;
      // Asignar SOLO el área que corresponde a la especialidad de la staff
      // (primera en estado Esperando cuya familia de área coincide)
      for (let a = 0; a < 4; a++) {
        const base   = TM_AREA_COL[a];
        const tent   = String(rows[i][base] || '').trim();
        const estado = String(rows[i][base + 3] || '').trim();
        if (!tent || estado !== 'Esperando') continue;
        // Tipo de área (formato "area||servicio")
        let areaTipo = tent;
        if (tent.indexOf('||') !== -1) areaTipo = tent.split('||')[0];
        // Si conocemos el área de la staff y NO coincide con esta área → saltar
        if (famStaff && _famAreaTM(areaTipo) !== famStaff) continue;
        // Marcar esta área como tomada
        ws.getRange(rowNum, base + 3 + 1).setValue('En servicio'); // Estado
        ws.getRange(rowNum, base + 2 + 1).setValue(data.chicaNombre); // Staff
        ws.getRange(rowNum, base + 4 + 1).setValue(hora);             // Hora toma
        ws.getRange(rowNum, 6).setValue('Activo');
        // espejo Lineas: slot tomado → su línea (promoRef = id:slot) a 'en_servicio'
        try { marcarLineaEnServicioPorCodigo(String(rows[i][3]||''), String(data.idEspera)+':'+(a + 1), areaTipo, (tent.indexOf('||')!==-1?tent.split('||')[1]:''), data.chicaNombre||''); } catch(eLn){}
        try { _pushMikaela('👤 Clienta tomada', String(data.chicaNombre || 'Una chica') + ' tomó a ' + String(rows[i][4] || 'una clienta')); } catch(e){}
        return { success: true, areaIdx: a + 1, hora };
      }
      return { success: false, message: 'No hay un área de tu especialidad disponible en este ticket' };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch(e) { return { success: false, message: String(e) }; }
}

function handleConfirmarServicioMulti(data) {
  // Staff confirma o cambia el servicio tentativo de su área
  try {
    const ws = getTMSheet();
    const rows = ws.getRange(3, 1, ws.getLastRow() - 2, 37).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== data.idEspera) continue;
      const rowNum = i + 3;
      for (let a = 0; a < 4; a++) {
        const base = TM_AREA_COL[a];
        if (String(rows[i][base + 2] || '').trim() !== data.chicaNombre) continue;
        // Escribir servicio confirmado y precio actualizado
        ws.getRange(rowNum, base + 1 + 1).setValue(data.servicioConfirmado || rows[i][base]);
        if (data.precioNuevo) {
          const precioPromoNuevo = Number(data.precioNuevo);
          ws.getRange(rowNum, TM_PRECIO_COL[a] + 1).setValue(precioPromoNuevo);

          // FIX: buscar el precio REGULAR del nuevo combo en Paquetes y actualizarlo
          // en Lineas y en TicketMulti col AK (normalArr[a]).
          // Antes solo se escribía el precio promo — al cobrar con Tarjeta el sistema
          // no encontraba montoRegular y usaba el promo como fallback, cobrando $50
          // en vez del precio regular correcto del Combo 12 tupidas.
          var precioRegularNuevo = precioPromoNuevo; // default: si no encuentra en Paquetes
          try {
            var regMap = _mapaRegularPromos_();
            var nombreNuevo = _normNombrePromo_(data.servicioConfirmado || '');
            if (regMap[nombreNuevo] !== undefined && regMap[nombreNuevo] > 0) {
              precioRegularNuevo = regMap[nombreNuevo];
            } else {
              // Buscar precio regular por área en el array guardado en col AK
              var normalArr = [];
              try { normalArr = JSON.parse(String(rows[i][36] || '[]')); } catch (e) {}
              if (Array.isArray(normalArr) && normalArr[a] > 0) {
                precioRegularNuevo = Math.max(precioPromoNuevo, Number(normalArr[a]));
              }
            }
          } catch (eReg) { Logger.log('precioRegular cambio promo: ' + eReg); }

          // Actualizar col AK (normalArr) con el nuevo regular por área
          try {
            var normalArrActual = [];
            try { normalArrActual = JSON.parse(String(rows[i][36] || '[]')); } catch (e) {}
            if (!Array.isArray(normalArrActual)) normalArrActual = [];
            while (normalArrActual.length <= a) normalArrActual.push(0);
            normalArrActual[a] = precioRegularNuevo;
            ws.getRange(rowNum, 37).setValue(JSON.stringify(normalArrActual));
          } catch (eAK) { Logger.log('actualizar AK cambio promo: ' + eAK); }

          // Recalcular totales promo
          const precios = TM_PRECIO_COL.map(c => Number(rows[i][c] || 0));
          precios[a] = precioPromoNuevo;
          const totalPromo = precios.reduce((s, v) => s + v, 0);
          ws.getRange(rowNum, 36).setValue(totalPromo); // AJ

          // FIX: también actualizar col M de ListaEspera con el nuevo total promo
          // para que handleGetListaCompleta devuelva el precio correcto al tablero.
          // Sin este fix, el cobro grupal tomaba el total original de LE (antes del cambio).
          try {
            const wsLE = getSheet('ListaEspera');
            const leData = wsLE.getDataRange().getValues();
            const tmId = String(rows[i][0] || '').trim(); // col A del TM = idEspera base
            for (var li = 3; li < leData.length; li++) {
              // Buscar la fila de LE cuyo ticket TM referenciado sea este
              const leIdOrRef = String(leData[li][0] || '').trim();
              const leRef = String(leData[li][13] || '').trim(); // col N = promoNombre/ref TM
              if (leIdOrRef === tmId || leRef === tmId || leRef.startsWith(tmId + ':')) {
                wsLE.getRange(li + 1, 13).setValue(totalPromo); // col M = total
                break;
              }
            }
          } catch (eLE) { Logger.log('actualizar LE total cambio promo: ' + eLE); }

          // Espejo a Lineas: actualizar monto (promo) y montoRegular del slot
          try {
            actualizarLineaPorPromoRef(
              String(data.idEspera) + ':' + (a + 1),
              {
                servicio:     data.servicioConfirmado || '',
                monto:        precioPromoNuevo,
                montoRegular: precioRegularNuevo
              }
            );
          } catch (eLn) { Logger.log('espejo Lineas cambio promo: ' + eLn); }
        }
        return { success: true };
      }
    }
    return { success: false, message: 'No se encontró el área de esta staff' };
  } catch(e) { return { success: false, message: String(e) }; }
}

function handleCompletarAreaTicketMulti(data) {
  try {
    const ws = getTMSheet();
    const rows = ws.getRange(3, 1, ws.getLastRow() - 2, 37).getValues();
    const tz = 'America/Guayaquil';

    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== data.idEspera) continue;
      var rowNum = i + 3;

      // Parsear secuencia desde observaciones
      var obsRaw = String(rows[i][7] || '');
      var secuencia = [];
      if (obsRaw.startsWith('SEQ:')) {
        var seqStr = obsRaw.substring(4).split('|')[0];
        secuencia = seqStr.split(',').filter(Boolean);
      }

      // Encontrar áreas de esta staff y marcarlas completadas.
      // esUltima=true (Finalizar): marca TODAS las áreas de esta staff.
      var areaCompletadaIdx = -1;
      var areaCompletadaKey = '';
      var esUltima = data.esUltima === true;

      // Leer % comisión de esta staff una sola vez
      var pctStaff = 0.3;
      try {
        var wsComStaff = getSheet('Comisiones');
        var comDataStaff = wsComStaff.getDataRange().getValues();
        // FIX: i=3 — María está en fila 4 (índice 3)
        for (var cj = 3; cj < comDataStaff.length; cj++) {
          if (String(comDataStaff[cj][0]||'').trim() === data.chicaNombre) {
            if (String(comDataStaff[cj][1]||'').toLowerCase().includes('facial') ||
                String(comDataStaff[cj][4]||'').includes('40')) pctStaff = 0.4;
            break;
          }
        }
      } catch(ePct2) {}

      for (var a = 0; a < 4; a++) {
        var base = TM_AREA_COL[a];
        if (String(rows[i][base + 2] || '').trim() !== data.chicaNombre) continue;
        var estAreaActual = String(rows[i][base + 3] || '').trim();
        if (estAreaActual === 'Completado') {
          // Esta área ya estaba completa — continuar buscando la siguiente de esta staff
          if (areaCompletadaIdx === -1) {
            // Aún no encontramos la que hay que completar ahora — seguir buscando
            continue;
          }
          // Ya registramos cuál completar — si no es esUltima, salimos
          if (!esUltima) break;
          continue;
        }
        // Primera área En servicio de esta staff = la que se completa ahora
        if (areaCompletadaIdx === -1) {
          areaCompletadaIdx = a;
          var rawTent = String(rows[i][base] || '');
          areaCompletadaKey = rawTent.indexOf('||') !== -1 ? rawTent.split('||')[0] : '';
        }
        ws.getRange(rowNum, base + 3 + 1).setValue('Completado');
        // espejo Lineas: slot completado → su línea (promoRef = id:slot) a 'completado'
        try { marcarLineaCompletadaPorCodigo(String(rows[i][3]||''), String(data.idEspera)+':'+(a + 1), '', '', data.chicaNombre || ''); } catch(eLn){}
        var precioArea = Number(rows[i][TM_PRECIO_COL[a]] || 0);
        // Comisión se registra SOLO en handleConfirmarCobroMulti (al cobrar), no aquí
        // NOTA: HistorialOwner se escribe SOLO en handleConfirmarCobroMulti (al cobrar)
        if (!esUltima) break;
      }

      // Determinar siguiente área usando la secuencia
      // Áreas pendientes (con datos y no completadas, excluyendo la que acaba de completar)
      var areasConDatos = [];
      for (var a2 = 0; a2 < 4; a2++) {
        var base2 = TM_AREA_COL[a2];
        var tent2  = String(rows[i][base2] || '').trim();
        if (!tent2) continue;
        var est2   = String(rows[i][base2 + 3] || '').trim();
        var aKey2  = tent2.indexOf('||') !== -1 ? tent2.split('||')[0] : '';
        var tent2Label = tent2.indexOf('||') !== -1 ? tent2.split('||')[1] : tent2;
        var precio2    = Number(rows[i][TM_PRECIO_COL[a2]] || 0);
        areasConDatos.push({ idx: a2, key: aKey2, estado: est2, base: base2, tentativo: tent2Label, precio: precio2 });
      }

      // Áreas que aún no están completadas
      // FIX: cuando esUltima=true, Lesly completó TODAS sus áreas en el loop anterior.
      // rows[i] tiene valores viejos → excluir manualmente todas las áreas de esta staff
      // (no solo areaCompletadaIdx) para que todasListas calcule correctamente.
      var areasDeEstaStaff = new Set();
      for (var ax = 0; ax < 4; ax++) {
        if (String(rows[i][TM_AREA_COL[ax] + 2] || '').trim() === data.chicaNombre) {
          areasDeEstaStaff.add(ax);
        }
      }
      var areasPendientes = areasConDatos.filter(function(a) {
        if (esUltima && areasDeEstaStaff.has(a.idx)) return false; // esta staff las completó todas
        if (!esUltima && a.idx === areaCompletadaIdx) return false; // solo la recién completada
        return a.estado !== 'Completado';
      });

      // FIX: cuando esUltima=true, áreas "Esperando" sin staff asignada = nadie las tomó.
      // Si la clienta se retira antes de completar todas las áreas, esas áreas se cancelan.
      // No deben volver a lista de espera — el TM pasa directo a "Por cobrar" con lo hecho.
      // FIX BUG: "Terminé todo mi trabajo" con áreas pendientes (ej. promo pestañas+cejas
      // pero la clienta solo se hizo pestañas) → TODO el valor se acredita a la staff que
      // finaliza y el ticket pasa a cobro. (absorberPendientes lo manda el botón verde)
      if (esUltima && data.absorberPendientes === true) {
        for (var abz = 0; abz < 4; abz++) {
          var baseAbz = TM_AREA_COL[abz];
          if (!String(rows[i][baseAbz] || '').trim()) continue;
          if (String(rows[i][baseAbz + 3] || '').trim() === 'Completado') continue;
          // Reasignar a la staff que finaliza y marcar completada (conserva el precio del área)
          ws.getRange(rowNum, baseAbz + 2 + 1).setValue(data.chicaNombre);
          ws.getRange(rowNum, baseAbz + 3 + 1).setValue('Completado');
          try { marcarLineaCompletadaPorCodigo(String(rows[i][3]||''), String(data.idEspera)+':'+(abz + 1), '', '', data.chicaNombre || ''); } catch(eLnAbz){}
        }
        areasPendientes = []; // todo a esta staff → todasListas = true
      } else if (esUltima) {
        var areasSinTomar = areasPendientes.filter(function(a) {
          var staffArea = String(rows[i][TM_AREA_COL[a.idx] + 2] || '').trim();
          return (!staffArea || a.estado === 'Esperando'); // nadie la tomó
        });
        if (areasSinTomar.length > 0 && areasSinTomar.length === areasPendientes.length) {
          // TODAS las áreas pendientes son "Esperando" sin staff → la clienta se retira
          // Cancelar esas áreas y mandar a cobro con lo que se hizo
          for (var ac = 0; ac < 4; ac++) {
            var baseC = TM_AREA_COL[ac];
            if (!String(rows[i][baseC] || '').trim()) continue;
            var estC = String(rows[i][baseC + 3] || '').trim();
            var staffC = String(rows[i][baseC + 2] || '').trim();
            if (estC === 'Esperando' && !staffC) {
              ws.getRange(rowNum, baseC + 3 + 1).setValue('Cancelado');
            }
          }
          areasPendientes = []; // forzar todasListas = true
        }
      }

      var todasListas = areasPendientes.length === 0;

      // Determinar si hay siguiente área según secuencia
      var siguienteArea = null;
      if (!todasListas && secuencia.length > 0) {
        // Buscar en la secuencia cuál es la siguiente después de la completada
        var posActual = secuencia.indexOf(areaCompletadaKey);
        for (var s = posActual + 1; s < secuencia.length; s++) {
          var candidata = areasPendientes.find(function(ap) { return ap.key === secuencia[s]; });
          if (candidata) { siguienteArea = candidata; break; }
        }
        // Si no encontró por secuencia, tomar la primera pendiente
        if (!siguienteArea) siguienteArea = areasPendientes[0];
      } else if (!todasListas) {
        siguienteArea = areasPendientes[0];
      }

      if (todasListas) {
        ws.getRange(rowNum, 6).setValue('Por verificar');
        try { _avisarMikaelaClientaLista(String(rows[i][4]||''), 'Combo / multi-servicio'); } catch(e){}
        if (data.desgloseCompleto) {
          try { ws.getRange(rowNum, 37).setValue(JSON.stringify(data.desgloseCompleto)); } catch(eD) {}
        }
        // NO escribir resumen en HistorialOwner aquí — cada área ya se registró individualmente
      } else if (siguienteArea !== null) {
        // Hay siguiente área — marcarla como "Esperando" para que aparezca en lista
        // y limpiar el staff anterior de esa área (queda libre para tomar)
        var nextBase = TM_AREA_COL[siguienteArea.idx];
        ws.getRange(rowNum, nextBase + 3 + 1).setValue('Esperando'); // estado = Esperando
        ws.getRange(rowNum, nextBase + 2 + 1).setValue('');           // limpiar staff asignada
        ws.getRange(rowNum, nextBase + 4 + 1).setValue('');           // limpiar hora tomada
        // Estado global del TM = "En espera" (para que Mikaela lo vea)
        ws.getRange(rowNum, 6).setValue('En espera parcial');
      }

      return {
        success: true,
        todasCompletadas: todasListas,
        siguienteArea: siguienteArea ? (siguienteArea.tentativo || siguienteArea.key) : null,
        siguientePrecio: siguienteArea ? Number(siguienteArea.precio || 0) : 0,
        areasPendientes: areasPendientes.length
      };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch(e) { return { success: false, message: String(e) }; }
}

// ─── handleCompletarYTomarSiguienteAreaTM ─────────────────────────────────────
function handleCompletarYTomarSiguienteAreaTM(data) {
  var resultCompletar = handleCompletarAreaTicketMulti(data);
  if (!resultCompletar.success) return resultCompletar;
  if (resultCompletar.todasCompletadas) return resultCompletar;
  try {
    var ws   = getTMSheet();
    // Forzar escritura de los setValue() de handleCompletarAreaTicketMulti antes de releer
    try { SpreadsheetApp.flush(); } catch(eF) {}
    // FIX: re-leer el sheet DESPUÉS de que handleCompletarAreaTicketMulti hizo sus cambios
    // Si usamos rows stale, el slot recién completado todavía aparece como "En servicio"
    // y podemos activar el mismo slot en vez del siguiente
    var rowsFresh = ws.getRange(3, 1, ws.getLastRow() - 2, 37).getValues();
    var hora = Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm');
    for (var i = 0; i < rowsFresh.length; i++) {
      if (String(rowsFresh[i][0]).trim() !== data.idEspera) continue;
      var rowNum = i + 3;
      for (var a = 0; a < 4; a++) {
        var base = TM_AREA_COL[a];
        var tent = String(rowsFresh[i][base] || '').trim();
        if (!tent) continue;
        var estadoActual = String(rowsFresh[i][base + 3] || '').trim();
        // Solo activar slots que están ESPERANDO (no los ya En servicio o Completado)
        if (estadoActual !== 'Esperando') continue;
        ws.getRange(rowNum, base + 2 + 1).setValue(data.chicaNombre || '');
        ws.getRange(rowNum, base + 3 + 1).setValue('En servicio');
        ws.getRange(rowNum, base + 4 + 1).setValue(hora);
        ws.getRange(rowNum, 6).setValue('En servicio');
        var tentLabel = tent.indexOf('||') !== -1 ? tent.split('||')[1] : tent;
        // espejo Lineas: marcar el siguiente slot del TM como 'en servicio'
        try {
          var _areaTM = tent.indexOf('||') !== -1 ? tent.split('||')[0] : '';
          marcarLineaEnServicioPorCodigo(String(rowsFresh[i][3] || ''), data.idEspera + ':' + (a + 1), _areaTM, tentLabel, data.chicaNombre || '');  // base 1
        } catch (eLn) { Logger.log('espejo siguiente area TM Lineas: ' + eLn); }
        return { success: true, todasCompletadas: false,
          siguienteArea: tentLabel, siguientePrecio: Number(rowsFresh[i][TM_PRECIO_COL[a]] || 0),
          areasPendientes: resultCompletar.areasPendientes };
      }
      break;
    }
  } catch(eT) {}
  return resultCompletar;
}

function handleConfirmarCobroMulti(data) {
  try {
    const ws = getTMSheet();
    const rows = ws.getRange(3, 1, ws.getLastRow() - 2, 37).getValues();
    const tz = 'America/Guayaquil';
    const now = new Date();
    const hora  = Utilities.formatDate(now, tz, 'HH:mm');
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== data.idEspera) continue;
      const rowNum = i + 3;
      // ── IDEMPOTENCIA: si el combo ya fue cobrado, NO re-procesar ──
      const _estTM = String(rows[i][5] || '').trim().toLowerCase();
      if (_estTM === 'completado' || _estTM === 'completada') {
        return { success: true, yaCobrado: true, message: 'Este ticket ya estaba cobrado.' };
      }
      const metodoPago = data.metodoPago || 'Efectivo';

      const codigoCliente     = String(rows[i][3] || '');
      const nombreCliente     = String(rows[i][4] || '');
      const idTM              = String(rows[i][0] || '');
      // Regular total re-derivado desde Paquetes (no del campo guardado, que
      // pudo quedar inflado por descuento doble-contado). Fallback proporcional
      // para tarjeta cuando una línea no trae su regular.
      const precioNormalTotal = _regularRealTM_(rows[i]) || Number(rows[i][34] || 0);

      // ── PASO 4: Armar lineas desde Lineas (fuente de verdad) con fallback al legacy ──
      let lineas = [];
      let _fuenteLineas = false;

      // Intento 1: leer desde Lineas (tiene montoRegular por área — resuelve bug comisión tarjeta)
      try {
        const _lnCobro = getLineasParaCobro(idTM);
        if (_lnCobro && _lnCobro.length > 0) {
          lineas = _lnCobro;
          _fuenteLineas = true;
          Logger.log('[CobroTM] fuente=Lineas, items=' + lineas.length);
        }
      } catch(eLnC) { Logger.log('[CobroTM] getLineasParaCobro error: ' + eLnC); }

      // Fallback legacy: serviciosDetalle del frontend o slots de TicketMulti
      if (!_fuenteLineas) {
        Logger.log('[CobroTM] fuente=legacy (Lineas sin datos para ' + idTM + ')');
        let _fd = null;
        if (data.serviciosDetalle) {
          try { _fd = (typeof data.serviciosDetalle === 'string') ? JSON.parse(data.serviciosDetalle) : data.serviciosDetalle; } catch (e) { _fd = null; }
        }
        if (_fd && _fd.length > 0) {
          lineas = _fd.map(function (p) {
            return {
              staff: String(p.staff || ''),
              area: String(p.area || 'multi'),
              servicio: String(p.servicio || 'Servicio multi'),
              precioRegular: Number(p.montoNormal || 0),
              precioPromo: Number(p.monto || 0)
            };
          }).filter(function (l) { return l.staff; });
        } else {
          for (let a = 0; a < 4; a++) {
            const base = TM_AREA_COL[a];
            const tent = String(rows[i][base] || '').trim();
            if (!tent) continue;
            const estA = String(rows[i][base + 3] || '').toLowerCase();
            if (estA === 'cancelado') continue;
            const staff = String(rows[i][base + 2] || '').trim();
            if (!staff) continue;
            const areaKey = tent.replace(/\|\|.*/, '').trim();
            const confirm = (String(rows[i][base + 1] || '').replace(/.*\|\|/, '').trim()) || tent.replace(/.*\|\|/, '').trim();
            lineas.push({
              staff: staff,
              area: areaKey || 'multi',
              servicio: confirm || 'Servicio multi',
              precioRegular: 0,
              precioPromo: Number(rows[i][TM_PRECIO_COL[a]] || 0)
            });
          }
        }
      }

      // ── Calcular totales y comisiones ────────────────────────────────────────
      // Si la fuente es Lineas, cada línea tiene precioRegular correcto por área.
      // Calcular monto cobrado y comisión directamente sin liquidarCobro_().
      let totalCobrado = 0;
      const lineasConComision = lineas.map(function(l) {
        let monto, comision;
        // FIX: Tarjeta → precio regular / todo lo demás → precio promo.
        // No usar esEfectivo (que dejaba Transferencia como "no efectivo").
        const esTarjetaTM = (metodoPago || '').toLowerCase().indexOf('tarjeta') !== -1;
        if (_fuenteLineas) {
          monto = esTarjetaTM ? l.precioRegular : (l.precioPromo || l.precioRegular);

          // FIX: si precioRegular === precioPromo (el combo no tenía regular en Lineas),
          // buscar el precio regular en _mapaRegularPromos_ por nombre del combo.
          // El nombre del servicio puede tener extras concatenados con "+"
          // (ej. "Combo 7 Hawaiano + Solo pigmento") — extraer solo el nombre base
          // (parte antes del "+") para que el lookup en Paquetes funcione correctamente.
          let precioRegCom = l.precioRegular;
          if (esTarjetaTM && precioRegCom <= l.precioPromo) {
            try {
              var rMapTM = _mapaRegularPromos_();
              var nombreServTM = String(l.servicio || '');
              // Limpiar extras concatenados: "Combo 7 Hawaiano + Solo pigmento" → "Combo 7 Hawaiano"
              var nombreBaseTM = nombreServTM.split('+')[0].trim();
              var nNormTM = _normNombrePromo_(nombreBaseTM);
              if (rMapTM[nNormTM] && rMapTM[nNormTM] > l.precioPromo) {
                precioRegCom = rMapTM[nNormTM];
                monto = precioRegCom;
              }
            } catch(eR) {}
          }
          comision = _comisionLinea(l.area, l.precioPromo || monto, precioRegCom || monto, metodoPago);
        } else {
          // Fallback legacy: usar liquidarCobro_ para compatibilidad
          const _liqSingle = liquidarCobro_([l], metodoPago, l.precioRegular || l.precioPromo || 0);
          monto    = _liqSingle.total;
          comision = (_liqSingle.lineas[0] || {}).comision || 0;
        }
        totalCobrado += monto;
        return Object.assign({}, l, { monto: monto, comision: comision });
      });

      ws.getRange(rowNum, 6).setValue('Completado');
      ws.getRange(rowNum, 9).setValue(metodoPago);
      ws.getRange(rowNum, 10).setValue(hora);
      ws.getRange(rowNum, 37).setValue(totalCobrado);
      // espejo Lineas: cobro del TM → cierra TODAS sus líneas (promoRef "id:*") a 'cobrado'
      try { marcarLineasPorTicketMulti(String(rows[i][0]||''), metodoPago); } catch(eLn){}

      const wsCierre = getSheet('CierresPagos');
      const wsHist   = getSheet('HistorialOwner');

      // Comision + historial por cada area/staff que participó
      lineasConComision.forEach(function (l, idx) {
        try {
          wsCierre.appendRow([now, hora, nombreCliente, l.staff, l.servicio, l.monto, metodoPago, idTM + '-A' + (idx + 1)]);
        } catch (eCierre) {}
        try {
          wsHist.appendRow([fecha, hora, codigoCliente, nombreCliente, idTM, l.servicio, l.area, l.staff, l.monto, l.comision, metodoPago]);
        } catch (eHist) {}
        try { if (l.staff && l.monto > 0) updateComision(l.staff, l.monto); } catch (eC) {}
      });

      return { success: true, totalCobrado: totalCobrado };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch (e) { return { success: false, message: String(e) }; }
}

// ============================================
// PUSH NOTIFICATIONS (Web Push / VAPID)
// ============================================

// ── Credenciales FCM V1 — desde Propiedades del script (NO en el código) ──────
// Configurar UNA sola vez en: Configuración del proyecto (⚙) → Propiedades del script:
//   FCM_PROJECT_ID    = nexserv-7e1bb
//   FCM_CLIENT_EMAIL  = firebase-adminsdk-fbsvc@nexserv-7e1bb.iam.gserviceaccount.com
//   FCM_PRIVATE_KEY   = la clave privada en UNA sola línea con los \n escapados
//                       (copiala de tu versión anterior: lo que estaba entre las comillas)
function _fcmCreds_() {
  var p = PropertiesService.getScriptProperties();
  var projectId   = p.getProperty('FCM_PROJECT_ID');
  var clientEmail = p.getProperty('FCM_CLIENT_EMAIL');
  var privateKey  = p.getProperty('FCM_PRIVATE_KEY');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan credenciales FCM en Propiedades del script (FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY). Configuralas en la Configuración del proyecto.');
  }
  // El private key admite \n escapados (una línea) o saltos reales.
  if (privateKey.indexOf('\\n') !== -1) privateKey = privateKey.replace(/\\n/g, '\n');
  return { projectId: projectId, clientEmail: clientEmail, privateKey: privateKey };
}

function getFCMAccessToken() {
  // Caché simple: reusar el token por 50 minutos
  var cached = PropertiesService.getScriptProperties().getProperty('_fcm_token_cache');
  if (cached) {
    try {
      var c = JSON.parse(cached);
      if (c.exp > Math.floor(Date.now()/1000) + 300) return c.token;
    } catch(e) {}
  }
  var creds = _fcmCreds_();
  var now = Math.floor(Date.now() / 1000);
  var header  = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=+$/, '');
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: creds.clientEmail,
    sub: creds.clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  })).replace(/=+$/, '');

  var signInput = header + '.' + payload;
  var signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(signInput, creds.privateKey)
  ).replace(/=+$/, '');

  var jwt = signInput + '.' + signature;

  var tokenResp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    muteHttpExceptions: true
  });

  var tokenData = JSON.parse(tokenResp.getContentText());
  if (!tokenData.access_token) throw new Error('Token error: ' + tokenResp.getContentText());
  // Guardar en caché por 50 minutos
  try {
    PropertiesService.getScriptProperties().setProperty('_fcm_token_cache', JSON.stringify({
      token: tokenData.access_token,
      exp: Math.floor(Date.now()/1000) + 3000
    }));
  } catch(e) {}
  return tokenData.access_token;
}

function handleGuardarPushSub(data) {
  // Nuevo formato: se guarda el token FCM (string). Compat: si llega 'subscription', se intenta igual.
  var token = data.token || data.subscription;
  if (!data.staffKey || !token) return { success: false, error: 'Datos incompletos' };
  PropertiesService.getScriptProperties().setProperty(data.staffKey, token);
  Logger.log('[Push] Token guardado para: ' + data.staffName + ' key=' + data.staffKey);
  return { success: true };
}

// Diagnóstico: ¿qué staff tienen la app/notificaciones activadas? (no expone el token)
function handleListarPushSubs() {
  var props = PropertiesService.getScriptProperties();
  var mapa = {
    'push_maria': 'María', 'push_keyla': 'Keyla', 'push_lesly': 'Lesly', 'push_rosa': 'Rosa',
    'push_yadira': 'Yadira', 'push_diana': 'Diana', 'push_laura': 'Laura',
    'push_mikaela': prop_('ADMIN_NOMBRE') || 'Admin', 'push_owner': prop_('OWNER_NOMBRE') || 'Owner'
  };
  var estado = {};
  Object.keys(mapa).forEach(function (k) {
    var t = props.getProperty(k);
    estado[mapa[k]] = !!(t && String(t).length > 10);
  });
  return { success: true, estado: estado };
}

function handleEnviarPushStaff(data) {
  if (!data.staffKeys || !data.titulo) return { success: false, error: 'Datos incompletos' };

  var props = PropertiesService.getScriptProperties();
  var enviados = 0;
  var errores = [];

  // Obtener access token OAuth2 para FCM V1
  var accessToken;
  try {
    accessToken = getFCMAccessToken();
  } catch(e) {
    return { success: false, error: 'Error obteniendo token FCM: ' + e.message };
  }

  var fcmUrl = 'https://fcm.googleapis.com/v1/projects/' + _fcmCreds_().projectId + '/messages:send';

  data.staffKeys.forEach(function(key) {
    var subStr = props.getProperty(key);
    if (!subStr) {
      errores.push(key + ': sin suscripción');
      return;
    }

    try {
      // Nuevo formato: subStr ES el token FCM. Compat: si quedó una suscripción vieja (JSON), se descarta.
      var fcmToken = subStr;
      if (subStr.charAt(0) === '{') {
        errores.push(key + ': suscripción antigua, re-suscribir (volver a entrar a la app)');
        return;
      }

      var response;
      if (fcmToken) {
        // Usar FCM V1 API con el token
        var fcmBody = {
          message: {
            token: fcmToken,
            notification: {
              title: data.titulo,
              body: data.cuerpo || ''
            },
            webpush: {
              headers: {
                Urgency: 'high',  // entrega prioritaria (Android/Doze no la retrasa tanto)
                TTL: '300'        // si no se entrega en 5 min, se descarta (no llega tarde y vieja)
              },
              notification: {
                title: data.titulo,
                body: data.cuerpo || '',
                icon: 'https://humbertods.github.io/nexserv/icon-192.png',
                tag: 'nexserv-cita',
                renotify: true,
                requireInteraction: false,
                vibrate: [200, 100, 200]
              },
              fcm_options: {
                link: 'https://humbertods.github.io/nexserv/'
              }
            }
          }
        };

        response = UrlFetchApp.fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(fcmBody),
          muteHttpExceptions: true
        });
      } else {
        errores.push(key + ': token vacío');
        return;
      }

      var code = response.getResponseCode();
      var body = response.getContentText();
      Logger.log('[Push] ' + key + ': HTTP ' + code + ' — ' + body.substring(0, 150));

      if (code === 200 || code === 201) {
        enviados++;
      } else if (code === 404 || code === 410) {
        props.deleteProperty(key);
        errores.push(key + ': token expirado, eliminado');
      } else {
        errores.push(key + ': HTTP ' + code + ' — ' + body.substring(0, 80));
      }
    } catch(e) {
      errores.push(key + ': ' + e.message);
    }
  });

  return { success: true, enviados: enviados, errores: errores };
}

// Aviso a Mikaela: una staff dejó una clienta lista para cobro
// Aviso genérico a Mikaela (push)
function _pushMikaela(titulo, cuerpo) {
  try {
    handleEnviarPushStaff({ staffKeys: ['push_mikaela'], titulo: titulo, cuerpo: cuerpo });
  } catch (e) {}
}

function _avisarMikaelaClientaLista(nombre, servicio) {
  try {
    var n = String(nombre || '').trim() || 'Una clienta';
    var s = String(servicio || '').trim();
    handleEnviarPushStaff({
      staffKeys: ['push_mikaela'],
      titulo: '📩 Clienta lista para cobro',
      cuerpo: n + (s ? ' · ' + s : '')
    });
  } catch (e) {}
}
const CAJA_TZ = 'America/Guayaquil';

function getCajaSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName('CajaChica');
  if (!ws) {
    ws = ss.insertSheet('CajaChica');
    ws.appendRow(['Fecha','Hora','Tipo','Descripcion','Monto','Responsable','RegistradoPor','Estado','Snapshot','MetodoGasto']);
    ws.getRange(1, 1, 1, 10).setFontWeight('bold');
  } else if (ws.getLastColumn() < 10) {
    // Hoja antigua sin la columna de método: la agregamos.
    ws.getRange(1, 10).setValue('MetodoGasto').setFontWeight('bold');
  }
  return ws;
}
function cajaHoy_()        { return Utilities.formatDate(new Date(), CAJA_TZ, 'dd/MM/yyyy'); }
function cajaFechaStr_(v)  { return (v instanceof Date) ? Utilities.formatDate(v, CAJA_TZ, 'dd/MM/yyyy') : String(v || '').trim(); }

function handleGetCajaChica(params) {
  const fecha = (params && params.fecha) ? String(params.fecha) : cajaHoy_();
  const ws = getCajaSheet_();
  const rows = ws.getDataRange().getValues();
  let apertura = null, cerrada = false, cierre = null;
  const gastos = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (cajaFechaStr_(r[0]) !== fecha) continue;
    const tipo = String(r[2] || '').toLowerCase();
    if (String(r[7] || 'activo').toLowerCase() === 'anulado') continue;
    if (tipo === 'apertura') {
      apertura = Number(r[4]) || 0;
    } else if (tipo === 'gasto') {
      gastos.push({ id: i + 1, hora: r[1], descripcion: r[3], monto: Number(r[4]) || 0, responsable: r[5] || '', registradoPor: r[6] || '', metodo: String(r[9] || 'efectivo').toLowerCase().indexOf('transf') >= 0 ? 'transferencia' : 'efectivo' });
    } else if (tipo === 'cierre') {
      cerrada = true;
      try { cierre = r[8] ? JSON.parse(r[8]) : null; } catch (e) { cierre = null; }
    }
  }
  return { success: true, fecha: fecha, apertura: apertura, gastos: gastos, cerrada: cerrada, cierre: cierre };
}

function handleAddGastoCaja(data) {
  const ws = getCajaSheet_();
  const hora = Utilities.formatDate(new Date(), CAJA_TZ, 'HH:mm:ss');
  const metodo = String(data.metodoGasto || 'efectivo').toLowerCase().indexOf('transf') >= 0 ? 'transferencia' : 'efectivo';
  ws.appendRow([cajaHoy_(), hora, 'gasto', String(data.descripcion || '').trim(), Number(data.monto) || 0,
                String(data.responsable || '').trim(), String(data.registradoPor || '').trim(), 'activo', '', metodo]);
  return { success: true };
}

function handleAddAperturaCaja(data) {
  const ws = getCajaSheet_();
  const hoy = cajaHoy_();
  const rows = ws.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (cajaFechaStr_(rows[i][0]) === hoy &&
        String(rows[i][2] || '').toLowerCase() === 'apertura' &&
        String(rows[i][7] || 'activo').toLowerCase() !== 'anulado') {
      ws.getRange(i + 1, 5).setValue(Number(data.monto) || 0);
      ws.getRange(i + 1, 7).setValue(String(data.registradoPor || '').trim());
      return { success: true, actualizada: true };
    }
  }
  const hora = Utilities.formatDate(new Date(), CAJA_TZ, 'HH:mm:ss');
  ws.appendRow([hoy, hora, 'apertura', 'Base de caja', Number(data.monto) || 0, '', String(data.registradoPor || '').trim(), 'activo', '']);
  return { success: true, actualizada: false };
}

function handleAnularGastoCaja(data) {
  const ws = getCajaSheet_();
  const fila = Number(data.id) || 0;
  if (fila < 2) return { error: 'Fila inválida' };
  const r = ws.getRange(fila, 1, 1, 9).getValues()[0];
  if (String(r[2] || '').toLowerCase() !== 'gasto') return { error: 'No es un gasto' };
  ws.getRange(fila, 8).setValue('anulado');
  return { success: true };
}

function handleCerrarCaja(data) {
  const ws = getCajaSheet_();
  const hoy = cajaHoy_();
  const rows = ws.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (cajaFechaStr_(rows[i][0]) === hoy &&
        String(rows[i][2] || '').toLowerCase() === 'cierre' &&
        String(rows[i][7] || 'activo').toLowerCase() !== 'anulado') {
      return { error: 'La caja de hoy ya fue cerrada.' };
    }
  }
  const hora = Utilities.formatDate(new Date(), CAJA_TZ, 'HH:mm:ss');
  const snap = data.snapshot || {};
  ws.appendRow([hoy, hora, 'cierre', 'Cierre de caja', Number(snap.totalNeto) || 0, '',
                String(data.registradoPor || '').trim(), 'activo', JSON.stringify(snap)]);
  return { success: true };
}

function handleGetCajaHistorico(params) {
  const ws = getCajaSheet_();
  const rows = ws.getDataRange().getValues();
  const cierres = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[2] || '').toLowerCase() !== 'cierre') continue;
    if (String(r[7] || 'activo').toLowerCase() === 'anulado') continue;
    let snap = null;
    try { snap = r[8] ? JSON.parse(r[8]) : null; } catch (e) {}
    cierres.push({ fecha: cajaFechaStr_(r[0]), hora: r[1], totalNeto: Number(r[4]) || 0, snapshot: snap });
  }
  cierres.reverse();
  return { success: true, cierres: cierres };
}
/* ===================== /CAJA CHICA ===================== */

// ============================================
// CIERRE DE MES — resumen generalizado para el Owner
// Junta HistorialOwner (facturación + comisiones + clientas por staff)
// y CajaChica (gastos internos del mes). El gasto de SIRA es un sistema
// externo y se ingresa manualmente desde la app.
// params: { mes: 1-12, anio: 2026 } — si faltan usa el mes/año actual.
// ============================================
function _mesAnioDeFecha_(v) {
  // Devuelve {mes, anio} a partir de un Date o string 'dd/MM/yyyy'
  if (v instanceof Date) {
    return {
      mes:  Number(Utilities.formatDate(v, 'America/Guayaquil', 'M')),
      anio: Number(Utilities.formatDate(v, 'America/Guayaquil', 'yyyy'))
    };
  }
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { mes: Number(m[2]), anio: Number(m[3]) };
  return { mes: 0, anio: 0 };
}

function handleGetCierreMes(params) {
  try {
    const tz = 'America/Guayaquil';
    const now = new Date();
    const mes  = (params && params.mes)  ? Number(params.mes)  : Number(Utilities.formatDate(now, tz, 'M'));
    const anio = (params && params.anio) ? Number(params.anio) : Number(Utilities.formatDate(now, tz, 'yyyy'));

    // ---- 1) HistorialOwner: facturación, comisiones, clientas, por staff ----
    // Columnas: A=Fecha B=Hora C=Codigo D=Cliente E=Top/ID F=Servicio G=Area H=Staff I=Valor J=Comision K=MetodoPago
    const wsH = getSheet('HistorialOwner');
    const dataH = wsH ? wsH.getDataRange().getValues() : [];
    const porStaff = {};      // nombre -> { chica, servicios, generado, comision }
    const clientasSet = {};   // clave cliente -> true (clientas únicas con servicio)
    let generadoServicios = 0, comisionTotal = 0, numServicios = 0;
    let generadoProductos = 0, numProductos = 0;

    for (let i = 3; i < dataH.length; i++) {
      const row = dataH[i];
      if (!row[0]) continue;
      const ma = _mesAnioDeFecha_(row[0]);
      if (ma.mes !== mes || ma.anio !== anio) continue;

      const metodo  = String(row[10] || '').toLowerCase();
      const cliente = String(row[3] || '').trim();
      const staff   = String(row[7] || '').trim() || 'Sin asignar';
      const valor   = row[8] instanceof Date ? 0 : Number(row[8]) || 0;
      const comision= row[9] instanceof Date ? 0 : Number(row[9]) || 0;

      if (metodo === 'producto') {
        generadoProductos += valor;
        numProductos += 1;
        continue; // los productos no cuentan como servicio ni comisión de staff
      }

      numServicios += 1;
      generadoServicios += valor;
      comisionTotal += comision;
      if (cliente) clientasSet[cliente.toLowerCase()] = true;

      if (!porStaff[staff]) porStaff[staff] = { chica: staff, servicios: 0, generado: 0, comision: 0 };
      porStaff[staff].servicios += 1;
      porStaff[staff].generado  += valor;
      porStaff[staff].comision  += comision;
    }

    const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
    const staffArray = Object.values(porStaff)
      .map(s => ({ chica: s.chica, servicios: s.servicios, generado: r2(s.generado), comision: r2(s.comision) }))
      .sort((a, b) => b.generado - a.generado);
    const generadoTotal = generadoServicios + generadoProductos;
    const numClientas = Object.keys(clientasSet).length;

    // ---- 2) CajaChica: gastos internos del mes ----
    // Columnas: A=Fecha B=Hora C=Tipo D=Descripcion E=Monto F=Responsable G=RegistradoPor H=Estado
    let gastoCajaChica = 0, numGastosCaja = 0;
    const wsC = getCajaSheet_();
    const dataC = wsC ? wsC.getDataRange().getValues() : [];
    for (let i = 1; i < dataC.length; i++) {
      const r = dataC[i];
      if (String(r[2] || '').toLowerCase() !== 'gasto') continue;
      if (String(r[7] || 'activo').toLowerCase() === 'anulado') continue;
      const ma = _mesAnioDeFecha_(r[0]);
      if (ma.mes !== mes || ma.anio !== anio) continue;
      gastoCajaChica += Number(r[4]) || 0;
      numGastosCaja += 1;
    }

    // ---- 3) SIRA: total de "Gastos Varios" del mes (sistema externo, solo lectura) ----
    const sira = _getSiraGastosMes_(mes, anio);

    return {
      success: true,
      mes: mes,
      anio: anio,
      staff: staffArray,
      numClientas: numClientas,
      numServicios: numServicios,
      generadoServicios: r2(generadoServicios),
      generadoProductos: r2(generadoProductos),
      numProductos: numProductos,
      generadoTotal: r2(generadoTotal),
      comisionTotal: r2(comisionTotal),
      gastoCajaChica: r2(gastoCajaChica),
      numGastosCaja: numGastosCaja,
      gastoSIRA:            sira.ok ? sira.total : 0,
      siraOk:               sira.ok,
      siraFuente:           sira.fuente || '',
      siraTotalProductos:   sira.ok ? (sira.totalProductos    || 0) : 0,
      siraTotalGastosVarios:sira.ok ? (sira.totalGastosVarios || 0) : 0,
      siraCount:            sira.count || 0,
      siraError:            sira.ok ? '' : (sira.error || ''),
      guardado: _buscarCierreGuardado_(mes, anio)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// Consulta la API de SIRA y obtiene el total de gastos del mes desde el cierre
// mensual de SIRA (granTotal = totalProductos + totalGastosVarios).
// Si SIRA no tiene cierre cerrado para ese mes, suma los gastos varios sueltos
// como fallback. Devuelve { ok, total, totalProductos, totalGastosVarios, fuente, error }.
function _getSiraGastosMes_(mes, anio) {
  try {
    if (!SIRA_API_URL) {
      return { ok: false, total: 0, error: 'SIRA no configurada en este entorno' };
    }
    const token = 'sira_2026_nexserv_bridge_7f4c9a';

    // ── Intento 1: leer desde el cierre mensual de SIRA (fuente más completa) ──
    try {
      const urlCierres = SIRA_API_URL + '?action=getCierres&token=' + token + '&_t=' + Date.now();
      const respC = UrlFetchApp.fetch(urlCierres, { muteHttpExceptions: true, followRedirects: true });
      if (respC.getResponseCode() === 200) {
        const jsonC = JSON.parse(respC.getContentText());
        if (jsonC && jsonC.ok && Array.isArray(jsonC.cierres)) {
          // Buscar el cierre del mes/año exacto (puede haber varios — tomar el más reciente)
          const cierresMes = jsonC.cierres.filter(function(c) {
            return Number(c.mesNum) === Number(mes) && Number(c.anio) === Number(anio);
          });
          if (cierresMes.length > 0) {
            // El más reciente es el último guardado
            const cierre = cierresMes[cierresMes.length - 1];
            return {
              ok:                true,
              total:             Math.round(Number(cierre.granTotal        || 0) * 100) / 100,
              totalProductos:    Math.round(Number(cierre.totalProductos   || 0) * 100) / 100,
              totalGastosVarios: Math.round(Number(cierre.totalGastosVarios|| 0) * 100) / 100,
              fuente:            'cierre'
            };
          }
        }
      }
    } catch(eCierres) { Logger.log('[SIRA getCierres] ' + eCierres); }

    // ── Fallback: sumar gastos varios + costo de productos usados en el mes ──
    // Se usa cuando SIRA aún no tiene el cierre cerrado (se hace al final del día).
    // getGastosVarios → gastos varios sueltos del mes
    // getMovimientos + getProductos → costo de productos consumidos (salidas × costo unitario)
    // Así el total coincide con lo que SIRA mostrará al cerrar el mes.

    // Traer las tres fuentes en paralelo (UrlFetchApp no tiene Promise.all,
    // pero podemos hacerlo con fetchAll para reducir latencia)
    var urlGastos  = SIRA_API_URL + '?action=getGastosVarios&token=' + token + '&_t=' + Date.now();
    var urlMovs    = SIRA_API_URL + '?action=getMovimientos&token='  + token + '&_t=' + (Date.now()+1);
    var urlProds   = SIRA_API_URL + '?action=getProductos&token='    + token + '&_t=' + (Date.now()+2);

    var responses;
    try {
      responses = UrlFetchApp.fetchAll([
        { url: urlGastos, muteHttpExceptions: true },
        { url: urlMovs,   muteHttpExceptions: true },
        { url: urlProds,  muteHttpExceptions: true }
      ]);
    } catch(eFetch) {
      return { ok: false, total: 0, error: 'fetchAll SIRA: ' + String(eFetch) };
    }

    // ── Gastos varios ──
    var totalGastosVarios = 0, countGastos = 0;
    try {
      var jsonG = JSON.parse(responses[0].getContentText());
      if (jsonG && jsonG.ok && Array.isArray(jsonG.gastos)) {
        jsonG.gastos.forEach(function(g) {
          var f = String((g && g.fecha) || '');
          var m = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (!m) return;
          if (Number(m[1]) === Number(anio) && Number(m[2]) === Number(mes)) {
            totalGastosVarios += Number(g.monto) || 0;
            countGastos++;
          }
        });
      }
    } catch(eG) { Logger.log('[SIRA fallback gastos] ' + eG); }

    // ── Costo de productos usados (movimientos de salida del mes) ──
    var totalProductos = 0;
    try {
      var jsonP = JSON.parse(responses[2].getContentText());
      var costoPorNombre = {};
      if (jsonP && jsonP.ok && Array.isArray(jsonP.productos)) {
        jsonP.productos.forEach(function(p) {
          if (p.nombre) costoPorNombre[String(p.nombre).toLowerCase().trim()] = Number(p.costo) || 0;
        });
      }

      var jsonM = JSON.parse(responses[1].getContentText());
      if (jsonM && jsonM.ok && Array.isArray(jsonM.movimientos)) {
        jsonM.movimientos.forEach(function(mv) {
          // Solo salidas confirmadas del mes
          var tipo = String(mv.tipo || '').toLowerCase();
          if (tipo !== 'salida' && tipo !== 'uso' && tipo !== 'consumo') return;
          var f = String(mv.fecha || '');
          var m = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (!m) return;
          if (Number(m[1]) !== Number(anio) || Number(m[2]) !== Number(mes)) return;
          var nombreProd = String(mv.producto || '').toLowerCase().trim();
          var costo = costoPorNombre[nombreProd] || 0;
          var cantidad = Number(mv.cantidad) || 0;
          totalProductos += costo * cantidad;
        });
      }
    } catch(eM) { Logger.log('[SIRA fallback movimientos] ' + eM); }

    var granTotal = totalGastosVarios + totalProductos;
    return {
      ok:                true,
      total:             Math.round(granTotal * 100) / 100,
      totalProductos:    Math.round(totalProductos * 100) / 100,
      totalGastosVarios: Math.round(totalGastosVarios * 100) / 100,
      fuente:            'gastos_sueltos',
      count:             countGastos
    };
  } catch(e) {
    return { ok: false, total: 0, error: e.toString() };
  }
}

// ============================================
// HISTORIAL DE CIERRES DE MES (registro durable y auditable)
// Hoja "CierresMes" — un registro por mes (se actualiza si se vuelve a guardar)
// ============================================
function getCierresMesSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName('CierresMes');
  if (!ws) {
    ws = ss.insertSheet('CierresMes');
    ws.appendRow(['FechaCierre','Mes','Anio','Periodo','Clientas','Servicios',
                  'GeneradoServicios','GeneradoProductos','GeneradoTotal','Comisiones',
                  'GastoCajaChica','GastoSIRA','TotalGeneral','DetalleStaff','RegistradoPor']);
    ws.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('white');
  }
  return ws;
}

function _buscarCierreGuardado_(mes, anio) {
  try {
    const ws = getCierresMesSheet_();
    const rows = ws.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][1]) === Number(mes) && Number(rows[i][2]) === Number(anio)) {
        return {
          fechaCierre: rows[i][0] instanceof Date
            ? Utilities.formatDate(rows[i][0], 'America/Guayaquil', 'dd/MM/yyyy HH:mm')
            : String(rows[i][0] || ''),
          gastoSIRA: Number(rows[i][11]) || 0,
          totalGeneral: Number(rows[i][12]) || 0,
          registradoPor: String(rows[i][14] || '')
        };
      }
    }
  } catch (e) {}
  return null;
}

function handleGuardarCierreMes(data) {
  try {
    const tz = 'America/Guayaquil';
    const mes  = Number(data.mes);
    const anio = Number(data.anio);
    if (!mes || !anio) return { success: false, error: 'Mes o año inválido' };

    const ws = getCierresMesSheet_();
    const rows = ws.getDataRange().getValues();
    const ahora = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm');
    const periodo = ('0' + mes).slice(-2) + '/' + anio;
    const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

    const fila = [
      ahora, mes, anio, periodo,
      Number(data.numClientas) || 0,
      Number(data.numServicios) || 0,
      r2(data.generadoServicios),
      r2(data.generadoProductos),
      r2(data.generadoTotal),
      r2(data.comisionTotal),
      r2(data.gastoCajaChica),
      r2(data.gastoSIRA),
      r2(data.totalGeneral),
      JSON.stringify(data.staff || []),
      String(data.registradoPor || '')
    ];

    // Upsert: un solo registro por mes/año
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][1]) === mes && Number(rows[i][2]) === anio) {
        ws.getRange(i + 1, 1, 1, fila.length).setValues([fila]);
        return { success: true, actualizado: true, fechaCierre: ahora };
      }
    }
    ws.appendRow(fila);
    return { success: true, actualizado: false, fechaCierre: ahora };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleGetCierresMesHistorico() {
  try {
    const ws = getCierresMesSheet_();
    const rows = ws.getDataRange().getValues();
    const cierres = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[1] || !r[2]) continue;
      let staff = [];
      try { staff = r[13] ? JSON.parse(r[13]) : []; } catch (e) {}
      cierres.push({
        fechaCierre: r[0] instanceof Date
          ? Utilities.formatDate(r[0], 'America/Guayaquil', 'dd/MM/yyyy HH:mm')
          : String(r[0] || ''),
        mes: Number(r[1]) || 0,
        anio: Number(r[2]) || 0,
        periodo: String(r[3] || ''),
        numClientas: Number(r[4]) || 0,
        numServicios: Number(r[5]) || 0,
        generadoServicios: Number(r[6]) || 0,
        generadoProductos: Number(r[7]) || 0,
        generadoTotal: Number(r[8]) || 0,
        comisionTotal: Number(r[9]) || 0,
        gastoCajaChica: Number(r[10]) || 0,
        gastoSIRA: Number(r[11]) || 0,
        totalGeneral: Number(r[12]) || 0,
        staff: staff,
        registradoPor: String(r[14] || '')
      });
    }
    cierres.sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes));
    return { success: true, cierres: cierres };
  } catch (e) {
    return { success: false, error: e.toString(), cierres: [] };
  }
}

// ============================================
// SESIONES / DISPOSITIVOS ACTIVOS + AUTORIZACIÓN (seguridad Owner)
// Hoja "Sesiones": A=Staff B=DeviceId C=Dispositivo D=Rol E=Login F=UltimoPing G=Estado H=Aprobacion
// SEC_MODE (ScriptProperties): 'abierto' = dispositivos nuevos se aprueban solos | 'estricto' = quedan pendientes
// ============================================
function getSesionesSheet_() {
  return getOrCreateSheet('Sesiones', ['Staff', 'DeviceId', 'Dispositivo', 'Rol', 'Login', 'UltimoPing', 'Estado', 'Aprobacion']);
}
function getModoSeguridad_() {
  return PropertiesService.getScriptProperties().getProperty('SEC_MODE') || 'abierto';
}
function setModoSeguridad_(modo) {
  PropertiesService.getScriptProperties().setProperty('SEC_MODE', modo === 'estricto' ? 'estricto' : 'abierto');
}

function handlePingSesion(data) {
  try {
    const staff = String((data && data.staffName) || '').trim();
    const dev   = String((data && data.deviceId) || '').trim();
    if (!staff || !dev) return { success: false, message: 'faltan datos' };
    const ws = getSesionesSheet_();
    const rows = ws.getDataRange().getValues();
    const ahora = new Date();
    const evento = String((data && data.evento) || 'ping');
    const estadoConn = evento === 'logout' ? 'Cerrada' : 'Activa';
    const rol = String((data && data.rol) || '');
    // Aviso al Owner cuando una STAFF inicia sesión (no en cada ping, solo en login)
    if (evento === 'login' && rol && rol !== 'owner' && rol !== 'admin') {
      try {
        const tz = 'America/Guayaquil';
        handleEnviarPushStaff({
          staffKeys: ['push_owner'],
          titulo: staff + ' inició sesión',
          cuerpo: String((data && data.dispositivo) || 'Dispositivo')
                  + ' · ' + Utilities.formatDate(ahora, tz, 'HH:mm')
                  + ' · ' + Utilities.formatDate(ahora, tz, 'dd/MM/yyyy')
        });
      } catch (e) {}
    }
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === staff && String(rows[i][1]).trim() === dev) {
        ws.getRange(i + 1, 6).setValue(ahora);       // UltimoPing
        ws.getRange(i + 1, 7).setValue(estadoConn);  // Estado conexión
        if (data && data.dispositivo) ws.getRange(i + 1, 3).setValue(String(data.dispositivo));
        if (evento === 'login') ws.getRange(i + 1, 5).setValue(ahora); // Login
        let aprob = String(rows[i][7] || '').trim();
        if (!aprob) { aprob = 'aprobado'; ws.getRange(i + 1, 8).setValue(aprob); }
        return { success: true, aprobacion: aprob, modo: getModoSeguridad_() };
      }
    }
    // Dispositivo NUEVO
    let aprobacion = 'aprobado';
    if (rol !== 'owner' && getModoSeguridad_() === 'estricto') aprobacion = 'pendiente';
    ws.appendRow([staff, dev, String((data && data.dispositivo) || ''), rol, ahora, ahora, estadoConn, aprobacion]);
    if (aprobacion === 'pendiente') {
      try {
        handleEnviarPushStaff({
          staffKeys: ['push_owner'],
          titulo: '🔒 Dispositivo nuevo sin autorizar',
          cuerpo: staff + ' abrió la app en un dispositivo no reconocido (' + String((data && data.dispositivo) || '') + '). Autorízalo o bloquéalo en Seguridad app.'
        });
      } catch (e) {}
    }
    return { success: true, aprobacion: aprobacion, modo: getModoSeguridad_() };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

function handleEstadoDispositivo(data) {
  try {
    const staff = String((data && data.staffName) || '').trim();
    const dev   = String((data && data.deviceId) || '').trim();
    const ws = getSesionesSheet_();
    const rows = ws.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === staff && String(rows[i][1]).trim() === dev) {
        return { success: true, aprobacion: String(rows[i][7] || 'aprobado'), modo: getModoSeguridad_() };
      }
    }
    return { success: true, aprobacion: 'desconocido', modo: getModoSeguridad_() };
  } catch (e) { return { success: false, message: String(e) }; }
}

function handleSetAprobacion(data) {
  try {
    const staff  = String((data && data.staff) || '').trim();
    const dev    = String((data && data.deviceId) || '').trim();
    const estado = String((data && data.estado) || '').trim(); // aprobado | bloqueado
    if (!staff || !dev || !estado) return { success: false, message: 'faltan datos' };
    const ws = getSesionesSheet_();
    const rows = ws.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === staff && String(rows[i][1]).trim() === dev) {
        ws.getRange(i + 1, 8).setValue(estado);
        return { success: true };
      }
    }
    return { success: false, message: 'no encontrado' };
  } catch (e) { return { success: false, message: String(e) }; }
}

function handleSetModoSeguridad(data) {
  try {
    setModoSeguridad_(String((data && data.modo) || 'abierto'));
    return { success: true, modo: getModoSeguridad_() };
  } catch (e) { return { success: false, message: String(e) }; }
}

function handleGetSesiones() {
  try {
    const ws = getSesionesSheet_();
    const rows = ws.getDataRange().getValues();
    const tz = 'America/Guayaquil';
    const ahora = new Date();
    const sesiones = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      const ultimo = rows[i][5] instanceof Date ? rows[i][5] : null;
      const login  = rows[i][4] instanceof Date ? rows[i][4] : null;
      const minutos = ultimo ? Math.floor((ahora - ultimo) / 60000) : 999999;
      const estado = String(rows[i][6] || '');
      const activo = estado !== 'Cerrada' && minutos <= 3;
      sesiones.push({
        staff: rows[i][0],
        deviceId: rows[i][1],
        dispositivo: rows[i][2],
        rol: rows[i][3],
        login: login ? Utilities.formatDate(login, tz, 'dd/MM HH:mm') : '',
        ultimoPing: ultimo ? Utilities.formatDate(ultimo, tz, 'dd/MM HH:mm') : '',
        minutosDesde: minutos,
        activo: activo,
        aprobacion: String(rows[i][7] || 'aprobado')
      });
    }
    sesiones.sort(function(a, b){
      const pa = a.aprobacion === 'pendiente' ? 0 : 1;
      const pb = b.aprobacion === 'pendiente' ? 0 : 1;
      return (pa - pb) || (b.activo - a.activo) || (a.minutosDesde - b.minutosDesde);
    });
    return { success: true, sesiones: sesiones, modo: getModoSeguridad_() };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// ═══════════════ HISTORIAL DE SOLUCIONES (panel Soluciones) ═══════════════
function getSolucionesSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName('SolucionesLog');
  if (!ws) {
    ws = ss.insertSheet('SolucionesLog');
    ws.appendRow(['Fecha', 'Hora', 'Usuario', 'Accion', 'Cliente', 'idEspera', 'Detalle']);
  }
  return ws;
}

function handleRegistrarSolucion(data) {
  try {
    const ws = getSolucionesSheet_();
    const now = new Date();
    const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
    const hora  = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
    ws.appendRow([
      fecha,
      hora,
      String(data.usuario  || ''),
      String(data.accion   || ''),
      String(data.cliente  || ''),
      String(data.idEspera || ''),
      String(data.detalle  || '')
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function handleGetSolucionesLog() {
  try {
    const ws = getSolucionesSheet_();
    const last = ws.getLastRow();
    if (last < 2) return { success: true, registros: [] };
    const vals = ws.getRange(2, 1, last - 1, 7).getValues();
    const registros = [];
    for (let i = vals.length - 1; i >= 0; i--) { // más reciente primero
      const r = vals[i];
      if (!r[0] && !r[3]) continue;
      registros.push({
        fecha:    String(r[0] || ''),
        hora:     String(r[1] || ''),
        usuario:  String(r[2] || ''),
        accion:   String(r[3] || ''),
        cliente:  String(r[4] || ''),
        idEspera: String(r[5] || ''),
        detalle:  String(r[6] || '')
      });
    }
    return { success: true, registros: registros };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function handleBorrarSolucionesLog() {
  try {
    const ws = getSolucionesSheet_();
    const last = ws.getLastRow();
    if (last >= 2) ws.deleteRows(2, last - 1); // borra los datos, conserva el encabezado
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ============================================================================
// INTEGRACIÓN SYNA  ·  Prelista de espera
// ----------------------------------------------------------------------------
// Flujo:
//   1) SYNA crea el ticket (cuando llega la hora agendada) → estado 'Prelista'.
//      No aparece en la cola normal de Mikaela ni en la de la staff.
//   2) Mikaela ve la cita en "Prelista de espera" y:
//        · "Ya llegó"      → handleConfirmarLlegada → estado 'Esperando'
//                            (entra a la Lista de espera real y sigue el flujo normal)
//        · "Cancelar cita" → handleCancelarCita → estado 'Cancelado'
//
// Reutiliza la hoja ListaEspera y sus mismas columnas, así que una vez
// confirmada, la clienta fluye por el sistema sin ningún caso especial.
// Columnas: A=ID B=Fecha C=HoraLlegada D=Código E=Nombre F=Servicio G=Área
//           H=Prioridad I=Estado J=TomadaPor K=HoraToma L=Obs M=Total
//           N=PromoNombre O=PrecioPromo P=PrecioRegular Q=Secuencia R=PromasExtra
// ============================================================================

// SYNA → NexServ : crear ticket que entra a la Prelista de espera.
// Acepta los mismos campos que addListaEspera. Mínimo recomendado: nombre, servicio, area.
// Campo extra opcional: horaAgendada (la hora de la cita, para que Mikaela la vea).
function handleCrearTicketSyna(data) {
  data = data || {};
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();

  // Siguiente ID LE-XXXX
  let maxNum = 0;
  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '');
    if (id.startsWith('LE-')) {
      const num = parseInt(id.replace('LE-', ''));
      if (num > maxNum) maxNum = num;
    }
  }
  const id = 'LE-' + String(maxNum + 1).padStart(4, '0');

  const now   = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora  = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  const horaAgendada = String(data.horaAgendada || data.horaCita || '').trim();
  const origen = String(data.origen || 'SYNA').trim();
  // Dejamos rastro del origen y la hora de la cita en observaciones
  const obs = (data.observaciones ? String(data.observaciones) + ' · ' : '') +
              '📅 Agendada por ' + origen + (horaAgendada ? ' · cita ' + horaAgendada : '');

  const secuenciaStr = (data.secuencia && data.secuencia.length > 0)
    ? JSON.stringify(data.secuencia.map(s => s.area || s)) : '';
  const promasExtraStr = (data.promasExtra && data.promasExtra.length > 0)
    ? (typeof data.promasExtra === 'string' ? data.promasExtra : JSON.stringify(data.promasExtra)) : '';

  ws.appendRow([
    id, fecha, hora,                       // A,B,C
    data.codigo || '', data.nombre || '',  // D,E
    data.servicio || '', data.area || '',  // F,G
    data.prioridad || 'Normal',            // H
    estadoInicial,                         // I  ← Prelista para agenda / Esperando para atender ahora
    '', '',                                // J,K (sin tomar)
    obs,                                   // L
    data.total || 0,                       // M
    data.promoNombre || '',                // N
    data.precioPromo || '',                // O
    data.precioRegular || '',              // P
    secuenciaStr,                          // Q
    promasExtraStr                         // R
  ]);

  // Si la cita trae un abono (depósito de reserva), lo registramos para esta clienta
  try {
    if (Number(data.abono) > 0) {
      handleRegistrarAbono({ codigo: data.codigo, cliente: data.nombre, monto: Number(data.abono), origen: 'SYNA', idEspera: id });
    }
  } catch (eAb) {}

  // Avisar a Mikaela según el flujo: Prelista o lista directa.
  try {
    if (estadoInicial === 'Esperando') {
      _pushMikaela('✅ Clienta en lista de espera', String(data.nombre || 'Una clienta') + ' está lista para asignar staff.');
    } else {
      _pushMikaela(
        '📅 Cita agendada',
        String(data.nombre || 'Una clienta') +
          (horaAgendada ? ' · cita ' + horaAgendada : '') +
          '. Confirmá su llegada en Prelista.'
      );
    }
  } catch (e) {}

  // espejo Lineas: SYNA crea la clienta en Lineas igual que addListaEspera.
  // Si el estado es 'Prelista' se guarda como 'esperando' (cola virtual);
  // confirmarLlegada la actualizara cuando la clienta llega de verdad.
  try {
    lineaDesdeListaEspera({
      codigo:       data.codigo,
      nombre:       data.nombre,
      servicio:     data.servicio,
      area:         data.area,
      total:        data.total || 0,
      promoNombre:  data.promoNombre || '',
      precioPromo:  data.precioPromo || 0,
      precioRegular: data.precioRegular || 0,
      asignadaA:    '',
      observaciones: obs
    }, 'SYNA');
  } catch (eLn) { Logger.log('espejo crearTicketSyna Lineas: ' + eLn); }

  return { success: true, id: id, estado: estadoInicial };
}

// Mikaela lee las citas en Prelista (pendientes de confirmar llegada)
function handleGetPrelista() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const prelista = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    if (String(row[8] || '').toLowerCase().trim() !== 'prelista') continue;
    if (row[1] instanceof Date && row[1].getFullYear() < 2000) continue;

    const horaLlegada = row[2] instanceof Date
      ? Utilities.formatDate(row[2], 'America/Guayaquil', 'HH:mm')
      : String(row[2] || '');

    // Extraer la hora de la cita desde observaciones (si SYNA la mandó)
    const obs = String(row[11] || '');
    const m = obs.match(/cita\s+([0-9]{1,2}:[0-9]{2})/i);

    prelista.push({
      id: id,
      fecha: row[1],
      horaRegistro: horaLlegada,
      horaCita: m ? m[1] : '',
      codigo: row[3],
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      prioridad: row[7],
      observaciones: obs,
      total: Number(row[12] || 0),
      promoNombre: row[13] || '',
      precioPromo: row[14] || '',
      precioRegular: row[15] || ''
    });
  }

  return { success: true, prelista: prelista };
}

// Mikaela confirma "ya llegó la clienta" → Prelista pasa a Esperando (entra a la lista real)
function handleConfirmarLlegada(data) {
  data = data || {};
  const ws  = getSheet('ListaEspera');
  const all = ws.getDataRange().getValues();
  const id  = String(data.idEspera || data.idListaEspera || data.id || '').trim();
  const now = Utilities.formatDate(new Date(), 'America/Guayaquil', 'HH:mm');

  for (let i = 3; i < all.length; i++) {
    if (String(all[i][0]).trim() === id) {
      const row = i + 1;
      const estado = String(ws.getRange(row, 9).getValue()).toLowerCase().trim();
      if (estado !== 'prelista') {
        return { success: false, message: 'Esta cita ya no está en prelista.' };
      }
      ws.getRange(row, 9).setValue('Esperando'); // col I = Estado → entra a lista real
      ws.getRange(row, 3).setValue(now);          // col C = Hora de llegada real (para el orden de espera)
      // Validador de prelista: Mikaela puede corregir el área (y opcional el servicio) que
      // mandó SYNA antes de que la cita entre a la lista real, para reasignarla bien.
      if (data.area != null && String(data.area).trim() !== '') {
        ws.getRange(row, 7).setValue(String(data.area).trim().toLowerCase()); // col G = Área (minúsculas, como el resto del sistema)
      }
      if (data.servicio != null && String(data.servicio).trim() !== '') {
        ws.getRange(row, 6).setValue(String(data.servicio).trim());  // col F = Servicio
      }
      try {
        _pushMikaela('✅ Clienta confirmada', String(all[i][4] || 'Clienta') + ' pasó a la Lista de espera.');
      } catch (e) {}
      // espejo Lineas: la clienta confirma llegada → si ya existe la línea (SYNA/addListaEspera
      // la creó como 'esperando'), lineaDesdeListaEspera tiene dedup y no duplica.
      // Si no existe (ticket SYNA muy viejo sin espejo), la crea ahora.
      try {
        var _rowLL = ws.getRange(i + 1, 1, 1, 18).getValues()[0];
        lineaDesdeListaEspera({
          codigo:       String(_rowLL[3] || ''),
          nombre:       String(_rowLL[4] || ''),
          servicio:     String(_rowLL[5] || ''),
          area:         String(_rowLL[6] || ''),
          total:        Number(_rowLL[12] || 0),
          promoNombre:  String(_rowLL[13] || ''),
          precioPromo:  Number(_rowLL[14] || 0),
          precioRegular: Number(_rowLL[15] || 0),
          asignadaA:    '',
          observaciones: String(_rowLL[11] || '')
        }, 'LE_LLEGADA');
      } catch (eLn) { Logger.log('espejo confirmarLlegada Lineas: ' + eLn); }
      return { success: true, id: id };
    }
  }
  return { success: false, message: 'Cita no encontrada.' };
}

// Mikaela cancela la cita (la clienta no llegó) → estado 'Cancelado'
function handleCancelarCita(data) {
  data = data || {};
  const ws  = getSheet('ListaEspera');
  const all = ws.getDataRange().getValues();
  const id  = String(data.idEspera || data.idListaEspera || data.id || '').trim();

  for (let i = 3; i < all.length; i++) {
    if (String(all[i][0]).trim() === id) {
      const row = i + 1;
      const estado = String(ws.getRange(row, 9).getValue()).toLowerCase().trim();
      if (estado !== 'prelista') {
        return { success: false, message: 'Esta cita ya no se puede cancelar desde aquí.' };
      }
      ws.getRange(row, 9).setValue('Cancelado'); // col I
      const obsPrev = String(ws.getRange(row, 12).getValue() || '');
      const motivo = String(data.motivo || 'clienta no llegó');
      ws.getRange(row, 12).setValue((obsPrev ? obsPrev + ' · ' : '') + '❌ Cancelada (' + motivo + ')'); // col L
      // espejo Lineas: anular cualquier línea de esta cita (no-op si era prelista sin servicio)
      try { anularLineasPorRef(id, motivo); } catch (eLn) { Logger.log('espejo cancelar Lineas: ' + eLn); }
      return { success: true, id: id };
    }
  }
  return { success: false, message: 'Cita no encontrada.' };
}
// ════════════════════════════════════════════════════════════════════════
// MÓDULO: REPORTE DE SERVICIOS (Owner/Admin)
// ════════════════════════════════════════════════════════════════════════
// Fuente de datos: unifica Lineas (desde 18/06/2026, estado='cobrado') +
// HistorialOwner (histórico completo desde el inicio del salón) para cubrir
// cualquier rango de fechas sin duplicar ni crear hojas nuevas.
//
// Lineas aporta: metodoPago, comision, montoRegular (precio sin descuento).
// HistorialOwner aporta: el histórico anterior al 18/06 con el esquema
//   A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor
//
// Para evitar contar dos veces el mismo servicio en el período de solape
// (desde que existe Lineas), las filas de HistorialOwner posteriores a la
// fecha de corte de Lineas se EXCLUYEN — Lineas manda en ese rango porque
// trae más detalle (metodoPago, comision).
// ════════════════════════════════════════════════════════════════════════

var REPORTE_LINEAS_FECHA_CORTE = '2026-06-18'; // desde esta fecha, Lineas es la única fuente

// ── Clasificador de categoría + modelo/variante desde texto libre ────────
// No depende de un catálogo fijo — deriva de patrones en el texto del
// área y el nombre del servicio. Se ajusta agregando patrones nuevos
// sin tocar el resto del módulo.
// Sanitiza el campo `servicio`: algunas filas antiguas guardaron el JSON de
// serviciosDetalle directamente en la celda en vez del nombre legible
// (ej. '{"nombre":"Retoque de pestañas efecto Aura","precio":35}'). Esto se
// mostraba crudo en "Servicios en baja"/"Top servicios". Si detecta JSON,
// intenta extraer el campo `nombre`; si falla, descarta la fila a vacío en
// vez de mostrar basura.
// Calcula la duración en minutos entre hora_toma y hora_devuelta de Lineas.
// Ambas pueden venir como Date completo (timestamp) o como texto 'HH:mm'.
// Devuelve null si falta alguno de los dos datos (servicio sin cerrar
// correctamente, o registro antiguo sin estas columnas).
function _calcularDuracionMinutos_(horaTomaRaw, horaDevueltaRaw) {
  function aMinutosDelDia(v) {
    if (!v) return null;
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return v.getHours() * 60 + v.getMinutes() + (v.getSeconds() / 60);
    }
    var s = String(v).trim();
    var m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    return null;
  }
  var t1 = aMinutosDelDia(horaTomaRaw);
  var t2 = aMinutosDelDia(horaDevueltaRaw);
  if (t1 === null || t2 === null) return null;
  var diff = t2 - t1;
  if (diff < 0) diff += 24 * 60; // cruzó medianoche (caso raro pero posible)
  if (diff <= 0 || diff > 480) return null; // descartar 0 o más de 8h (dato corrupto)
  return Math.round(diff * 10) / 10;
}

function _limpiarNombreServicio_(valor) {
  var s = String(valor || '').trim();
  if (!s) return '';
  if (s.charAt(0) === '{' || s.charAt(0) === '[') {
    try {
      var parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].nombre) {
        return parsed.map(function(p){ return p.nombre; }).join(' + ');
      }
      if (parsed && parsed.nombre) return String(parsed.nombre);
      return ''; // JSON sin campo nombre reconocible — mejor vacío que basura
    } catch (e) {
      return ''; // no es JSON válido pero empieza con { — descartar por seguridad
    }
  }
  return s;
}

function _clasificarServicio_(areaRaw, servicioRaw) {
  var area = String(areaRaw || '').toLowerCase();
  var serv = String(servicioRaw || '').toLowerCase();

  // FIX: la categoría se decide SOLO por el campo `area` de Lineas, nunca por
  // `servicio`. El nombre del servicio en un TM multi-área puede arrastrar
  // texto de la otra área (ej. área=pestañas, servicio="Combo 7 Hawaiano +
  // Solo pigmento") — si se mezcla con `area` para clasificar, una línea de
  // pestañas termina contada como Cejas solo porque el nombre del combo
  // menciona "pigmento". `area` es el dato confiable: cada línea en Lineas
  // ya representa una sola área real (ver _registrarServicio_/lineasDesdeTicketMulti).
  var categoria = 'Otros servicios';
  if (area.indexOf('pesta') >= 0)                                  categoria = 'Pestañas';
  else if (area.indexOf('facial') >= 0)                            categoria = 'Faciales';
  else if (area.indexOf('depil') >= 0)                             categoria = 'Depilaciones';
  else if (area.indexOf('cej') >= 0)                                categoria = 'Cejas';
  else if (area.indexOf('retiro') >= 0)                             categoria = 'Retiro';
  else if (area.indexOf('producto') >= 0)                           categoria = 'Productos';
  else if (area === '') {
    // Solo si el área llegó vacía (registros muy antiguos de HistorialOwner
    // sin columna de área confiable) se cae al texto del servicio como único recurso.
    var textoFallback = serv;
    if (textoFallback.indexOf('pesta') >= 0)        categoria = 'Pestañas';
    else if (textoFallback.indexOf('facial') >= 0)  categoria = 'Faciales';
    else if (textoFallback.indexOf('depil') >= 0)   categoria = 'Depilaciones';
    else if (textoFallback.indexOf('cej') >= 0 || textoFallback.indexOf('pigment') >= 0
          || textoFallback.indexOf('brow') >= 0 || textoFallback.indexOf('shading') >= 0
          || textoFallback.indexOf('lamina') >= 0)  categoria = 'Cejas';
  }

  // Para el modelo/variante SÍ es correcto leer el texto completo (área + servicio),
  // ya que ahí buscamos palabras clave específicas (Volumen, Brow lamination, etc.)
  // dentro del nombre del servicio de ESA línea, no para decidir a qué área pertenece.
  var texto = area + ' ' + serv;

  // Modelo/variante — solo aplica de forma útil a Pestañas y a Cejas
  var modelo = '';
  if (categoria === 'Pestañas') {
    // FIX: el catálogo real usa nombres de "técnica de aplicación" (Aura, Tecnologico,
    // egipcio, ruso, brasilero, pelo a pelo) en vez del genérico "volumen/híbridas/clásicas"
    // que asumía el clasificador original — por eso el 82% de los servicios caían en
    // "Otro modelo" y el dato quedaba ilegible para análisis.
    // "Lifting de pestañas" es un TRATAMIENTO (no una montura nueva) y se excluye de este
    // análisis de modelos — no debe competir en el ranking de modelos vendidos.
    if (texto.indexOf('lifting') >= 0) {
      modelo = ''; // se excluye explícitamente — ver filtro en obtenerTopModelosPestanas
    }
    else if (texto.indexOf('mega volumen') >= 0)        modelo = 'Mega volumen';
    else if (texto.indexOf('volumen egipcio') >= 0
          || texto.indexOf('egipcio') >= 0)             modelo = 'Volumen egipcio';
    else if (texto.indexOf('volumen ruso') >= 0
          || (texto.indexOf('ruso') >= 0))               modelo = 'Volumen ruso';
    else if (texto.indexOf('volumen brasiler') >= 0
          || texto.indexOf('brasiler') >= 0)             modelo = 'Volumen brasilero';
    else if (texto.indexOf('volumen') >= 0)               modelo = 'Volumen';
    else if (texto.indexOf('aura') >= 0)                  modelo = 'Aura';
    else if (texto.indexOf('tecnologico') >= 0
          || texto.indexOf('tecnológico') >= 0)           modelo = 'Tecnológico';
    else if (texto.indexOf('hibrid') >= 0)                modelo = 'Híbridas';
    else if (texto.indexOf('kylie') >= 0)                 modelo = 'Kylie';
    else if (texto.indexOf('rimel') >= 0 || texto.indexOf('rímel') >= 0) modelo = 'Efecto rímel';
    else if (texto.indexOf('pelo a pelo') >= 0)           modelo = 'Pelo a pelo clásicas';
    else if (texto.indexOf('efecto seda') >= 0)           modelo = 'Efecto seda';
    else if (texto.indexOf('clasica') >= 0 || texto.indexOf('clásica') >= 0) modelo = 'Clásicas';
    else if (texto.indexOf('natural') >= 0)               modelo = 'Natural';
    else if (texto.indexOf('hawaiano') >= 0)              modelo = 'Hawaiano';
    else if (texto.indexOf('pigment') >= 0)               modelo = ''; // "Solo pigmento" no es montura de pestañas
    else                                                   modelo = 'Otro modelo';
    // FIX: si el modelo sigue siendo "Otro modelo", el nombre del servicio probablemente
    // es el nombre de un combo (ej. "Combo 7 Hawaiano") que no tiene la palabra clave
    // del modelo en su nombre pero sí en la descripción de servicios de Paquetes.
    // Consultamos _mapaModelosPestanas_() que lee col C de Paquetes para resolver esto.
    if (modelo === 'Otro modelo') {
      try {
        var mapaModelos = _mapaModelosPestanas_();
        var nombreNorm = _normNombrePromo_(servicioRaw || '');
        if (mapaModelos[nombreNorm]) modelo = mapaModelos[nombreNorm];
      } catch(eMM) {}
    }
  } else if (categoria === 'Cejas') {
    if (texto.indexOf('lamina') >= 0)              modelo = 'Brow lamination';
    else if (texto.indexOf('shading') >= 0 || texto.indexOf('polvo') >= 0) modelo = 'Shading / efecto polvo';
    else if (texto.indexOf('pigment') >= 0)        modelo = 'Pigmentación';
    else if (texto.indexOf('depil') >= 0)          modelo = 'Depilación simple';
    else                                            modelo = 'Otro';
    // Combinados
    var tieneCombo = (texto.indexOf('+') >= 0) || (texto.indexOf('depil') >= 0 && texto.indexOf('pigment') >= 0);
    if (texto.indexOf('depil') >= 0 && texto.indexOf('lamina') >= 0 && texto.indexOf('pigment') >= 0) {
      modelo = 'Depilación + Brow lamination + Pigmento';
    } else if (texto.indexOf('depil') >= 0 && texto.indexOf('pigment') >= 0) {
      modelo = 'Depilación + Pigmento';
    }
  } else if (categoria === 'Depilaciones') {
    if (texto.indexOf('axila') >= 0)        modelo = 'Axilas';
    else if (texto.indexOf('barbilla') >= 0) modelo = 'Barbilla';
    else if (texto.indexOf('bigote') >= 0)   modelo = 'Bigote';
    else if (texto.indexOf('pierna') >= 0)   modelo = 'Piernas';
    else if (texto.indexOf('nariz') >= 0)    modelo = 'Nariz';
    else                                      modelo = 'Otra zona';
  } else if (categoria === 'Faciales') {
    modelo = String(servicioRaw || '').trim() || 'Facial general';
  }

  return { categoria: categoria, modelo: modelo };
}

// ── Extractor unificado: HistorialOwner (completo) + Lineas (detalle desde 18/06) ──
// Estrategia revisada:
// - HistorialOwner es la fuente COMPLETA — incluye todo lo cobrado desde el inicio,
//   productos vendidos, y todos los meses. Es la fuente que coincide con Reportes.
// - Lineas aporta detalle adicional (metodoPago, comision, montoRegular, duracionMin)
//   desde el 18/06. Para esas fechas, Lineas REEMPLAZA la fila de HistorialOwner
//   (misma transaccion, mas detalle) usando deduplicacion por fecha+codigo+staff.
// - Resultado: el total del Informe de Servicios debe coincidir con Reportes/HistorialOwner.
function _obtenerServiciosUnificados_(fechaInicio, fechaFin) {
  var fIni = new Date(fechaInicio + 'T00:00:00');
  var fFin = new Date(fechaFin    + 'T23:59:59');
  var corte = new Date(REPORTE_LINEAS_FECHA_CORTE + 'T00:00:00');

  // ── PASO 1: Leer Lineas (desde corte) y construir mapa de dedup ──
  var lineasMap = {}; // key = dd/MM/yyyy_codigo_staffLower
  var filasLineas = [];
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var wsL = ss.getSheetByName(LINEAS_HOJA);
    if (wsL && wsL.getLastRow() > 1) {
      var dL = wsL.getRange(2, 1, wsL.getLastRow() - 1, 24).getValues();
      for (var i = 0; i < dL.length; i++) {
        var r = dL[i];
        if (String(r[LX.estado] || '').toLowerCase().trim() !== 'cobrado') continue;
        var fecha = _parsearFechaLineas_(r[LX.fecha]);
        if (!fecha || fecha < fIni || fecha > fFin || fecha < corte) continue;
        var area     = String(r[LX.area] || '');
        var servicio = _limpiarNombreServicio_(r[LX.servicio]);
        var clasif   = _clasificarServicio_(area, servicio);
        var staff    = String(r[LX.staff] || '').trim();
        var codigo   = String(r[LX.codigo] || '').trim();
        var fila = {
          fecha: fecha, codigo: codigo, cliente: String(r[LX.cliente] || ''),
          area: area, servicio: servicio, staff: staff,
          monto: Number(r[LX.monto] || 0),
          montoRegular: Number(r[LX.montoRegular] || r[LX.monto] || 0),
          metodoPago: String(r[LX.metodoPago] || ''),
          comision: Number(r[LX.comision] || 0),
          duracionMin: _calcularDuracionMinutos_(r[LX.horaToma], r[LX.horaDevuelta]),
          categoria: clasif.categoria, modelo: clasif.modelo, fuente: 'Lineas'
        };
        filasLineas.push(fila);
        var fechaKey = Utilities.formatDate(fecha, 'America/Guayaquil', 'dd/MM/yyyy');
        lineasMap[fechaKey + '_' + codigo + '_' + staff.toLowerCase()] = true;
      }
    }
  } catch (eL) { Logger.log('[ReporteServicios] Error Lineas: ' + eL); }

  // ── PASO 2: HistorialOwner — fuente completa para TODO el rango ──
  // Excluir filas que Lineas ya tiene (mismo fecha+codigo+staff)
  var filasHistorial = [];
  try {
    var wsH = getSheet('HistorialOwner');
    var dH  = wsH.getDataRange().getValues();
    for (var j = 3; j < dH.length; j++) {
      var rowH  = dH[j];
      var fechaH = _parsearFechaHistorial_(rowH[0]);
      if (!fechaH || fechaH < fIni || fechaH > fFin) continue;
      var staffH  = String(rowH[7] || '').trim();
      var codigoH = String(rowH[2] || '').trim();
      var fechaKeyH = Utilities.formatDate(fechaH, 'America/Guayaquil', 'dd/MM/yyyy');
      if (lineasMap[fechaKeyH + '_' + codigoH + '_' + staffH.toLowerCase()]) continue;
      var areaH    = String(rowH[6] || '');
      var servicioH = _limpiarNombreServicio_(rowH[5]);
      var clasifH  = _clasificarServicio_(areaH, servicioH);
      filasHistorial.push({
        fecha: fechaH, codigo: codigoH, cliente: String(rowH[3] || ''),
        area: areaH, servicio: servicioH, staff: staffH,
        monto: Number(rowH[8] || 0), montoRegular: Number(rowH[8] || 0),
        metodoPago: '', comision: 0, duracionMin: null,
        categoria: clasifH.categoria, modelo: clasifH.modelo, fuente: 'HistorialOwner'
      });
    }
  } catch (eH) { Logger.log('[ReporteServicios] Error HistorialOwner: ' + eH); }

  return filasHistorial.concat(filasLineas);
}
function _parsearFechaLineas_(fechaStr) {
  // Lineas guarda fecha como 'dd/MM/yyyy' (ver imágenes) o como Date nativo de Sheets
  if (!fechaStr) return null;
  if (Object.prototype.toString.call(fechaStr) === '[object Date]') return fechaStr;
  var s = String(fechaStr).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  return null;
}

function _parsearFechaHistorial_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  return _parsearFechaLineas_(value);
}

// ── Solo cuenta servicios FINALIZADOS / PAGADOS / CERRADOS ──────────────
// En este sistema eso equivale a: Lineas estado='cobrado' (ya filtrado en
// _obtenerServiciosUnificados_) y todo lo que llegó a HistorialOwner (que
// SOLO se escribe al cobrar — nunca con cancelados/no asistió/reprogramados).
// No se requiere filtro adicional: ambas fuentes ya excluyen esos casos
// por diseño (ver handleCancelarCita y handleConfirmarCobroMulti).

// ════════════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS DEL REPORTE
// ════════════════════════════════════════════════════════════════════════

// Reporte general: totales, top servicios, top categoría, ranking staff
function generarReporteServiciosNexserv(params) {
  try {
    params = params || {};
    var fi = params.fechaInicio || _primerDiaMesActual_();
    var ff = params.fechaFin    || _hoyStr_();
    var staffFiltro = String(params.staff || '').trim();
    var categoriaFiltro = String(params.categoria || '').trim();

    var filas = _obtenerServiciosUnificados_(fi, ff);
    if (staffFiltro)     filas = filas.filter(function(r){ return r.staff === staffFiltro; });
    if (categoriaFiltro) filas = filas.filter(function(r){ return r.categoria === categoriaFiltro; });

    var totalServicios = filas.length;
    var ingresoTotal = filas.reduce(function(s, r){ return s + r.monto; }, 0);

    // Por categoría
    var porCategoria = {};
    filas.forEach(function(r) {
      if (!porCategoria[r.categoria]) porCategoria[r.categoria] = { categoria: r.categoria, cantidad: 0, ingreso: 0 };
      porCategoria[r.categoria].cantidad++;
      porCategoria[r.categoria].ingreso += r.monto;
    });
    var categorias = Object.keys(porCategoria).map(function(k){ return porCategoria[k]; })
      .sort(function(a,b){ return b.ingreso - a.ingreso; });
    var categoriaLider = categorias.length ? categorias[0].categoria : '';

    // Top servicios (por nombre de servicio exacto)
    var porServicio = {};
    filas.forEach(function(r) {
      var key = r.servicio || '(sin nombre)';
      if (!porServicio[key]) porServicio[key] = { servicio: key, categoria: r.categoria, cantidad: 0, ingreso: 0 };
      porServicio[key].cantidad++;
      porServicio[key].ingreso += r.monto;
    });
    var topServicios = Object.keys(porServicio).map(function(k){ return porServicio[k]; })
      .sort(function(a,b){ return b.cantidad - a.cantidad; });
    var servicioMasVendido = topServicios.length ? topServicios[0].servicio : '';
    var servicioMayorIngreso = topServicios.slice().sort(function(a,b){ return b.ingreso - a.ingreso; })[0];

    // Ranking staff — incluye diferenciador Retoques vs Monturas nuevas
    // (un "Retoque" es mantenimiento de una montura existente; el resto son
    // ventas de montura nueva — distinción útil para medir captación vs retención)
    var porStaff = {};
    filas.forEach(function(r) {
      var key = r.staff || '(sin asignar)';
      if (!porStaff[key]) porStaff[key] = { staff: key, cantidad: 0, ingreso: 0, comision: 0, retoques: 0, monturasNuevas: 0 };
      porStaff[key].cantidad++;
      porStaff[key].ingreso += r.monto;
      porStaff[key].comision += r.comision;
      var esRetoque = String(r.servicio || '').toLowerCase().indexOf('retoque') >= 0;
      if (esRetoque) porStaff[key].retoques++;
      else porStaff[key].monturasNuevas++;
    });
    var rankingStaff = Object.keys(porStaff).map(function(k){ return porStaff[k]; })
      .sort(function(a,b){ return b.cantidad - a.cantidad; });

    // Ticket promedio por categoría
    var ticketPromedioCategoria = categorias.map(function(c) {
      return { categoria: c.categoria, ticketPromedio: c.cantidad ? Math.round((c.ingreso / c.cantidad) * 100) / 100 : 0 };
    });

    // Tiempo promedio por servicio (solo filas con duracionMin disponible —
    // únicamente Lineas tiene hora_toma/hora_devuelta; HistorialOwner no).
    var porServicioTiempo = {};
    filas.forEach(function(r) {
      if (r.duracionMin === null || r.duracionMin === undefined) return;
      var key = r.servicio || '(sin nombre)';
      if (!porServicioTiempo[key]) porServicioTiempo[key] = { servicio: key, categoria: r.categoria, suma: 0, count: 0 };
      porServicioTiempo[key].suma += r.duracionMin;
      porServicioTiempo[key].count++;
    });
    var tiempoPromedioServicio = Object.keys(porServicioTiempo).map(function(k) {
      var t = porServicioTiempo[k];
      return {
        servicio: t.servicio,
        categoria: t.categoria,
        minutosPromedio: Math.round((t.suma / t.count) * 10) / 10,
        muestras: t.count
      };
    }).sort(function(a,b){ return b.muestras - a.muestras; });

    return {
      success: true,
      rangoFechas: { inicio: fi, fin: ff },
      totalServicios: totalServicios,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      servicioMasVendido: servicioMasVendido,
      categoriaLider: categoriaLider,
      servicioMayorIngreso: servicioMayorIngreso ? servicioMayorIngreso.servicio : '',
      categorias: categorias,
      topServicios: topServicios.slice(0, 10),
      rankingStaff: rankingStaff,
      ticketPromedioCategoria: ticketPromedioCategoria,
      tiempoPromedioServicio: tiempoPromedioServicio.slice(0, 10),
      tablaResumen: filas.map(function(r) {
        return {
          fecha: Utilities.formatDate(r.fecha, 'America/Guayaquil', 'dd/MM/yyyy'),
          cliente: r.cliente,
          categoria: r.categoria,
          servicio: r.servicio,
          modelo: r.modelo,
          staff: r.staff,
          precio: r.monto,
          metodoPago: r.metodoPago,
          fuente: r.fuente
        };
      })
    };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// Servicios filtrados por categoría con rango de fechas
function obtenerServiciosPorCategoria(fechaInicio, fechaFin, categoria) {
  try {
    var filas = _obtenerServiciosUnificados_(fechaInicio, fechaFin);
    if (categoria) filas = filas.filter(function(r){ return r.categoria === categoria; });
    return { success: true, servicios: filas };
  } catch (e) { return { success: false, message: String(e) }; }
}

// Top servicios del mes completo
function obtenerTopServiciosMes(mes, anio) {
  try {
    var rango = _rangoMes_(mes, anio);
    var filas = _obtenerServiciosUnificados_(rango.inicio, rango.fin);
    var porServicio = {};
    filas.forEach(function(r) {
      var key = r.servicio || '(sin nombre)';
      if (!porServicio[key]) porServicio[key] = { servicio: key, categoria: r.categoria, cantidad: 0, ingreso: 0 };
      porServicio[key].cantidad++;
      porServicio[key].ingreso += r.monto;
    });
    var top = Object.keys(porServicio).map(function(k){ return porServicio[k]; })
      .sort(function(a,b){ return b.cantidad - a.cantidad; });
    return { success: true, mes: mes, anio: anio, top: top };
  } catch (e) { return { success: false, message: String(e) }; }
}

// Top modelos de pestañas del mes, con cantidad/ingreso/staff por modelo
function obtenerTopModelosPestanas(mes, anio) {
  try {
    var rango = _rangoMes_(mes, anio);
    var filas = _obtenerServiciosUnificados_(rango.inicio, rango.fin)
      .filter(function(r){ return r.categoria === 'Pestañas'; });

    var porModelo = {};
    filas.forEach(function(r) {
      // FIX: modelo='' significa Lifting de pestañas o Solo pigmento — son tratamientos
      // sobre una montura existente, no la venta de un modelo nuevo. Se excluyen de este
      // ranking para no inflar "Otro modelo" ni mezclarse con monturas reales.
      if (!r.modelo) return;
      var key = r.modelo;
      if (!porModelo[key]) porModelo[key] = { modelo: key, cantidad: 0, ingreso: 0, porStaff: {} };
      porModelo[key].cantidad++;
      porModelo[key].ingreso += r.monto;
      var st = r.staff || '(sin asignar)';
      porModelo[key].porStaff[st] = (porModelo[key].porStaff[st] || 0) + 1;
    });

    var top = Object.keys(porModelo).map(function(k) {
      var m = porModelo[k];
      var staffTop = Object.keys(m.porStaff).sort(function(a,b){ return m.porStaff[b] - m.porStaff[a]; })[0] || '';
      return {
        modelo: m.modelo,
        cantidad: m.cantidad,
        ingreso: Math.round(m.ingreso * 100) / 100,
        staffQueMasLoRealizo: staffTop
      };
    }).sort(function(a,b){ return b.cantidad - a.cantidad; });

    return { success: true, mes: mes, anio: anio, modelos: top };
  } catch (e) { return { success: false, message: String(e) }; }
}

function obtenerReporteFaciales(mes, anio) {
  return _reportePorCategoria_(mes, anio, 'Faciales');
}
function obtenerReporteCejas(mes, anio) {
  return _reportePorCategoria_(mes, anio, 'Cejas');
}
function obtenerReporteDepilaciones(mes, anio) {
  return _reportePorCategoria_(mes, anio, 'Depilaciones');
}

function _reportePorCategoria_(mes, anio, categoria) {
  try {
    var rango = _rangoMes_(mes, anio);
    var filas = _obtenerServiciosUnificados_(rango.inicio, rango.fin)
      .filter(function(r){ return r.categoria === categoria; });

    var porModelo = {};
    var clientesPorServicio = {}; // para faciales: clientes recurrentes
    filas.forEach(function(r) {
      var key = r.modelo || r.servicio || 'Otro';
      if (!porModelo[key]) porModelo[key] = { nombre: key, cantidad: 0, ingreso: 0, porStaff: {} };
      porModelo[key].cantidad++;
      porModelo[key].ingreso += r.monto;
      var st = r.staff || '(sin asignar)';
      porModelo[key].porStaff[st] = (porModelo[key].porStaff[st] || 0) + 1;

      if (categoria === 'Faciales') {
        var cKey = r.codigo || r.cliente;
        clientesPorServicio[cKey] = (clientesPorServicio[cKey] || 0) + 1;
      }
    });

    var items = Object.keys(porModelo).map(function(k) {
      var m = porModelo[k];
      var staffTop = Object.keys(m.porStaff).sort(function(a,b){ return m.porStaff[b] - m.porStaff[a]; })[0] || '';
      return { nombre: m.nombre, cantidad: m.cantidad, ingreso: Math.round(m.ingreso * 100) / 100, staffResponsable: staffTop };
    }).sort(function(a,b){ return b.cantidad - a.cantidad; });

    var clientesRecurrentes = 0;
    if (categoria === 'Faciales') {
      clientesRecurrentes = Object.keys(clientesPorServicio).filter(function(c){ return clientesPorServicio[c] > 1; }).length;
    }

    return {
      success: true, mes: mes, anio: anio, categoria: categoria,
      items: items,
      clientesRecurrentes: clientesRecurrentes
    };
  } catch (e) { return { success: false, message: String(e) }; }
}

function calcularTicketPromedioCategoria(fechaInicio, fechaFin) {
  try {
    var filas = _obtenerServiciosUnificados_(fechaInicio, fechaFin);
    var porCategoria = {};
    filas.forEach(function(r) {
      if (!porCategoria[r.categoria]) porCategoria[r.categoria] = { categoria: r.categoria, cantidad: 0, ingreso: 0 };
      porCategoria[r.categoria].cantidad++;
      porCategoria[r.categoria].ingreso += r.monto;
    });
    var resultado = Object.keys(porCategoria).map(function(k) {
      var c = porCategoria[k];
      return { categoria: c.categoria, ticketPromedio: c.cantidad ? Math.round((c.ingreso / c.cantidad) * 100) / 100 : 0, cantidad: c.cantidad };
    });
    return { success: true, ticketPromedio: resultado };
  } catch (e) { return { success: false, message: String(e) }; }
}

function obtenerRankingStaffServicios(fechaInicio, fechaFin) {
  try {
    var filas = _obtenerServiciosUnificados_(fechaInicio, fechaFin);
    var porStaff = {};
    filas.forEach(function(r) {
      var key = r.staff || '(sin asignar)';
      if (!porStaff[key]) porStaff[key] = { staff: key, cantidad: 0, ingreso: 0, comision: 0 };
      porStaff[key].cantidad++;
      porStaff[key].ingreso += r.monto;
      porStaff[key].comision += r.comision;
    });
    var ranking = Object.keys(porStaff).map(function(k){ return porStaff[k]; })
      .sort(function(a,b){ return b.cantidad - a.cantidad; });
    return { success: true, ranking: ranking };
  } catch (e) { return { success: false, message: String(e) }; }
}

// Servicios en crecimiento / en baja: compara el mes actual contra el anterior
function obtenerTendenciasServicios(mes, anio, categoria) {
  try {
    var rangoActual = _rangoMes_(mes, anio);
    var mesAnt = mes === 1 ? 12 : mes - 1;
    var anioAnt = mes === 1 ? anio - 1 : anio;
    var rangoAnterior = _rangoMes_(mesAnt, anioAnt);

    var filasActual   = _obtenerServiciosUnificados_(rangoActual.inicio, rangoActual.fin);
    var filasAnterior = _obtenerServiciosUnificados_(rangoAnterior.inicio, rangoAnterior.fin);

    // FIX: respetar el filtro de categoría — antes "Servicios en crecimiento/baja"
    // mezclaba todas las categorías aunque la pantalla estuviera filtrada a Pestañas.
    if (categoria) {
      filasActual   = filasActual.filter(function(r){ return r.categoria === categoria; });
      filasAnterior = filasAnterior.filter(function(r){ return r.categoria === categoria; });
    }

    function contarPorServicio(filas) {
      var m = {};
      filas.forEach(function(r){ m[r.servicio] = (m[r.servicio] || 0) + 1; });
      return m;
    }
    var actual = contarPorServicio(filasActual);
    var anterior = contarPorServicio(filasAnterior);

    var todos = {};
    Object.keys(actual).forEach(function(k){ todos[k] = true; });
    Object.keys(anterior).forEach(function(k){ todos[k] = true; });

    var tendencias = Object.keys(todos).map(function(k) {
      var c1 = anterior[k] || 0;
      var c2 = actual[k] || 0;
      var variacion = c1 === 0 ? (c2 > 0 ? 100 : 0) : Math.round(((c2 - c1) / c1) * 100);
      return { servicio: k, mesAnterior: c1, mesActual: c2, variacionPct: variacion };
    });

    var enCrecimiento = tendencias.filter(function(t){ return t.variacionPct > 0; })
      .sort(function(a,b){ return b.variacionPct - a.variacionPct; }).slice(0, 5);
    var enBaja = tendencias.filter(function(t){ return t.variacionPct < 0; })
      .sort(function(a,b){ return a.variacionPct - b.variacionPct; }).slice(0, 5);

    return { success: true, enCrecimiento: enCrecimiento, enBaja: enBaja };
  } catch (e) { return { success: false, message: String(e) }; }
}

// ── Helpers de fecha ──────────────────────────────────────────────────
function _primerDiaMesActual_() {
  var d = new Date();
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), 'America/Guayaquil', 'yyyy-MM-dd');
}
function _hoyStr_() {
  return Utilities.formatDate(new Date(), 'America/Guayaquil', 'yyyy-MM-dd');
}
function _rangoMes_(mes, anio) {
  var inicio = new Date(anio, mes - 1, 1);
  var fin = new Date(anio, mes, 0); // último día del mes
  return {
    inicio: Utilities.formatDate(inicio, 'America/Guayaquil', 'yyyy-MM-dd'),
    fin: Utilities.formatDate(fin, 'America/Guayaquil', 'yyyy-MM-dd')
  };
}

// ── Endpoint público GET ─────────────────────────────────────────────
// case 'getReporteServicios': result = handleGetReporteServicios(e.parameter); break;
function handleGetReporteServicios(params) {
  params = params || {};
  var accion = String(params.accion || params.tipo || 'general').trim();
  var mes = Number(params.mes) || (new Date()).getMonth() + 1;
  var anio = Number(params.anio) || (new Date()).getFullYear();

  switch (accion) {
    case 'topModelosPestanas':   return obtenerTopModelosPestanas(mes, anio);
    case 'faciales':             return obtenerReporteFaciales(mes, anio);
    case 'cejas':                return obtenerReporteCejas(mes, anio);
    case 'depilaciones':         return obtenerReporteDepilaciones(mes, anio);
    case 'tendencias':           return obtenerTendenciasServicios(mes, anio, String(params.categoria || '').trim());
    case 'rankingStaff': {
      var rango = _rangoMes_(mes, anio);
      return obtenerRankingStaffServicios(
        params.fechaInicio || rango.inicio,
        params.fechaFin    || rango.fin
      );
    }
    case 'topServiciosMes':      return obtenerTopServiciosMes(mes, anio);
    case 'general':
    default:
      return generarReporteServiciosNexserv({
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin,
        staff: params.staff,
        categoria: params.categoria
      });
  }
}
