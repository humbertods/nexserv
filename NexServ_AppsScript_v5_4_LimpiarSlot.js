// ============================================
// NexServ · Google Apps Script — Backend API
// Versión: 4.9 - FIX: serviciosDetalle se acumula (multi-staff) en vez de sobreescribir (05/05/2026)
// Conecta la app HTML con Google Sheets
// ============================================

const SHEET_ID = '1vIhdBWz5_-9JggtjjrddoJRJc9__aIjh2IIs5EuzqS4';

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

// ============================================
// CORS + ROUTING
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'login': result = handleLogin(e.parameter); break;
      case 'getClientas': result = handleGetClientas(); break;
      case 'getCliente': result = handleGetCliente(e.parameter); break;
      case 'getCatalogo': result = handleGetCatalogo(); break;
      case 'getPromos': result = handleGetPromos(); break;
      case 'getListaEspera': result = handleGetListaEspera(); break;
      case 'getComisiones': result = handleGetComisiones(e.parameter); break;
      case 'getHistorial': result = handleGetHistorial(e.parameter); break;
      case 'getFichaPestanas': result = handleGetFichaPestanas(e.parameter); break;
      case 'getFichaFacial': result = handleGetFichaFacial(e.parameter); break;
      case 'getFichaCejasPigmento': result = handleGetFichaCejasPigmento(e.parameter); break;
      case 'getListaCompleta': result = handleGetListaCompleta(); break;
      case 'getPorCobrar': result = handleGetPorCobrar(); break;
      case 'getServiciosHoy': result = handleGetServiciosHoy(e.parameter); break;
      case 'getServiciosSemana': result = handleGetServiciosSemana(e.parameter); break;
      case 'getAtenciones': result = handleGetAtenciones(e.parameter); break;
      case 'getCierresPagos': result = handleGetCierresPagos(); break;
      case 'getCierresSemana': result = handleGetCierresSemana(); break;
      case 'getAutorizaciones': result = handleGetAutorizaciones(); break;
      case 'getServiciosCobrados': result = handleGetServiciosCobrados(e.parameter); break;
      case 'getServicioNormal': result = handleGetServicioNormal(e.parameter); break;
      case 'getServicioPromo':  result = handleGetServicioPromo(e.parameter);  break;
      case 'inicializarPestanas': result = handleInicializarPestanas(); break;
      case 'limpiarAtenciones': result = handleLimpiarAtenciones(); break;
      case 'getMarcaProductos': result = handleGetMarcaProductos(); break;
      default: result = { error: 'Acción no reconocida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch (action) {
      case 'addClienta': result = handleAddClienta(data); break;
      case 'updateClienta': result = handleUpdateClienta(data); break;
      case 'updateClientaFull': result = handleUpdateClientaFull(data); break;
      case 'addListaEspera': result = handleAddListaEspera(data); break;
      case 'tomarClienta':
        // Normalizar: el frontend puede mandar idListaEspera o idEspera
        if (!data.idEspera && data.idListaEspera) data.idEspera = data.idListaEspera;
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleTomarServicioNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleTomarServicioPromo(data);
        } else {
          result = handleTomarClienta(data);
        }
        break;
      case 'finalizarAtencion':
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleFinalizarServicioNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleFinalizarServicioPromo(data);
        } else {
          result = handleFinalizarAtencion(data);
        }
        break;
      case 'confirmarCobro':
        if (data.idEspera && String(data.idEspera).startsWith('SN-')) {
          result = handleConfirmarCobroNormal(data);
        } else if (data.idEspera && String(data.idEspera).startsWith('SP-')) {
          result = handleConfirmarCobroPromo(data);
        } else {
          result = handleConfirmarCobro(data);
        }
        break;
      case 'addServicio': result = handleAddServicio(data); break;
      case 'updateServiciosAtencion': result = handleUpdateServiciosAtencion(data); break;
      case 'devolverALista': result = handleDevolverALista(data); break;
      case 'continuarPromoALista': result = handleContinuarPromoALista(data); break;
      case 'finalizarServicio': result = handleFinalizarServicio(data); break;
      case 'addPromo': result = handleAddPromo(data); break;
      case 'updatePromo': result = handleUpdatePromo(data); break;
      case 'addFichaPestanas': result = handleAddFichaPestanas(data); break;
      case 'updateFichaFacial': result = handleUpdateFichaFacial(data); break;
      case 'addFichaCejasPigmento': result = handleAddFichaCejasPigmento(data); break;
      case 'cierreSemanal': result = handleCierreSemanal(data); break;
      case 'verificarCierreAutomatico': result = handleVerificarCierreAutomatico(); break;
      case 'inicializarPestanas': result = handleInicializarPestanas(); break;
      case 'addServicioNormal': result = handleAddServicioNormal(data); break;
      case 'addServicioPromo':  result = handleAddServicioPromo(data);  break;
      case 'getServicioNormal': result = handleGetServicioNormal(e.parameter); break;
      case 'tomarServicioNormal': result = handleTomarServicioNormal(data); break;
      case 'finalizarServicioNormal': result = handleFinalizarServicioNormal(data); break;
      case 'confirmarCobroNormal': result = handleConfirmarCobroNormal(data); break;
      case 'pagoIndividual': result = handlePagoIndividual(data); break;
      case 'bloquearUsuario': result = handleBloquearUsuario(data); break;
      case 'asignarServicioNormal': result = handleAsignarServicioNormal(data); break;
      case 'asignarPromo': result = handleAsignarPromo(data); break;
      case 'solicitarAutorizacion': result = handleSolicitarAutorizacion(data); break;
      case 'aprobarAutorizacion': result = handleAprobarAutorizacion(data); break;
      case 'rechazarAutorizacion': result = handleRechazarAutorizacion(data); break;
      case 'registrarVentaProductos': result = handleRegistrarVentaProductos(data); break;
      case 'eliminarServicio': result = handleEliminarServicio(data); break;
      default: result = { error: 'Acción no reconocida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// LOGIN
// ============================================
function handleLogin(params) {
  const ws = getSheet('Usuarios');
  const data = ws.getDataRange().getValues();

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // saltar filas vacías

    const userId = String(row[1]).trim();
    const pass = String(row[2]).trim();
    const nombre = row[3];
    const rol = String(row[4]).trim().toLowerCase();
    const area = String(row[5]).trim();
    const estado = String(row[6]).trim();

    if (userId === params.user && pass === params.pass) {
      if (estado === 'Bloqueado') {
        return { success: false, blocked: true, message: 'Usuario bloqueado' };
      }
      return {
        success: true,
        user: {
          id: row[0],
          userId: userId,
          nombre: nombre,
          rol: rol,
          area: area,
          estado: estado,
          comision: area.includes('Facial') ? '40%' : '30%',
          maxClients: area.includes('Cejas') ? 2 : 1
        }
      };
    }
  }
  return { success: false, message: 'Usuario o contraseña incorrectos' };
}

// ============================================
// CLIENTAS
// ============================================
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
  const ws = getSheet('Clientas');
  const lastRow = ws.getLastRow();

  // Generar código automático
  const lastCode = ws.getRange(lastRow, 1).getValue();
  const nextNum = lastCode ? parseInt(String(lastCode).replace('C-', '')) + 1 : 1;
  const codigo = 'C-' + String(nextNum).padStart(4, '0');

  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

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
      nombre: row[1],
      servicios: row[2],
      precioCombo: row[3],
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
function handleGetListaEspera() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const lista = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id || !id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    if (estado === 'tomada' || estado === 'completada' || estado === 'finalizada' || estado === 'en servicio' || estado === 'por cobrar') continue;
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
          asignadaA   : '',
          fuente      : 'ServicioPromo'
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
    if (estado !== 'en servicio') continue;

    // PRIORIDAD 1: buscar por ID exacto (evita confundir tickets de la misma clienta)
    const matchId = data.idEspera && id === String(data.idEspera).trim();
    // PRIORIDAD 2: fallback por nombre/código + staff (para tickets sin idEspera)
    const matchNombre = nombre === data.clienteNombre;
    const matchCodigo = data.clienteCodigo && codigoRow === String(data.clienteCodigo).trim();
    const matchStaff = tomadaPor.toLowerCase() === String(data.chicaNombre || '').toLowerCase();
    const matchFallback = matchStaff && (matchNombre || matchCodigo);

    if (!matchId && !matchFallback) continue;
      const row = i + 1;
      // Columnas: M(13)=total, N(14)=promoNombre, O(15)=precioPromo, P(16)=precioRegular
      ws.getRange(row, 13).setValue(data.total || '0');

      if (data.nuevaArea && !data.esRetiro && !data.siguientePromo) {
        // Servicio de area cruzada: liberar staff actual y volver a lista con nueva area
        const nuevaAreaLower = String(data.nuevaArea).toLowerCase();
        ws.getRange(row, 9).setValue('Esperando');    // I: Vuelve a lista
        ws.getRange(row, 10).setValue('');             // J: Liberar staff
        ws.getRange(row, 7).setValue(nuevaAreaLower);  // G: Area de la siguiente atencion
        // Col F: historial acumulado (servicios realizados + pendientes para siguiente staff)
        ws.getRange(row, 6).setValue(data.servicio || data.servicioSiguiente || '');
        // Col M: total de la siguiente area (lo que le toca cobrar a la siguiente)
        ws.getRange(row, 13).setValue(data.total || '0');
        // Actualizar obs con progreso para que la siguiente staff vea el historial
        const obsActual2 = String(allData[i][11] || '');
        const nuevaObs2 = (obsActual2 ? obsActual2 + ' | ' : '') + '✅ ' + (data.areaCompletada || '') + ' completado por ' + data.chicaNombre + ' · Sigue: ' + data.areasFaltantes;
        ws.getRange(row, 12).setValue(nuevaObs2);
      } else if (data.esRetiro) {
        // Retiro: actualizar servicio a lo realmente realizado, limpiar promo y servicios pendientes
        ws.getRange(row, 6).setValue(data.servicio || '');  // F: Servicio actualizado
        ws.getRange(row, 14).setValue('');                   // N: Sin promo
        ws.getRange(row, 15).setValue('');                   // O: Sin precio promo
        ws.getRange(row, 16).setValue(data.total || '0');   // P: Precio regular = lo cobrado
        ws.getRange(row, 17).setValue('');                   // Q: Limpiar secuencia pendiente
      } else if (data.siguientePromo) {
        // Continuar con siguiente promo: actualizar ticket con nueva promo y volver a lista
        const sigArea = String(data.siguientePromoArea || '').toLowerCase() || 'cejas';
        ws.getRange(row, 9).setValue('Esperando');           // I: Vuelve a lista de espera
        ws.getRange(row, 10).setValue('');                   // J: Liberar staff
        ws.getRange(row, 7).setValue(sigArea);               // G: Area de la siguiente promo
        ws.getRange(row, 6).setValue(data.siguientePromo);   // F: Servicio = siguiente promo
        ws.getRange(row, 13).setValue(data.siguientePromoPrecio || '0'); // M: Total
        ws.getRange(row, 14).setValue(data.siguientePromo);  // N: PromoNombre
        ws.getRange(row, 15).setValue(data.siguientePromoPrecio || '0'); // O: PrecioPromo
        ws.getRange(row, 16).setValue(data.siguientePromoRegular || data.siguientePromoPrecio || '0'); // P: Regular
        // R: Actualizar promasExtra restantes (sin la que se acaba de activar)
        const promasRestantes = data.promasExtraRestantes ? JSON.stringify(data.promasExtraRestantes) : '';
        ws.getRange(row, 18).setValue(promasRestantes);
      } else {
        // Mandar a cobrar: estado Por cobrar en ListaEspera
        ws.getRange(row, 9).setValue('Por cobrar');
        ws.getRange(row, 14).setValue(data.promoNombre || '');

        // CRÍTICO: actualizar col F con el servicio completo (promo + extras)
        // Sin esto, los servicios extra aprobados se pierden al pasar a Por cobrar
        if (data.servicio) ws.getRange(row, 6).setValue(data.servicio);

        // Si hay desglose multi-staff, recalcular total acumulado
        let totalFinal = Number(data.total || 0);
        if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
          // Sumar desglose existente + nuevo para obtener total real
          let desgloseExistente = [];
          const colS = allData[i][18];
          if (colS) { try { desgloseExistente = JSON.parse(colS); } catch(e) {} }
          const totalExistente = desgloseExistente.reduce((s, d) => s + Number(d.monto || 0), 0);
          const totalNuevo = data.serviciosDetalle.reduce((s, d) => s + Number(d.monto || 0), 0);
          if (totalExistente > 0) totalFinal = totalExistente + totalNuevo;
          ws.getRange(row, 13).setValue(totalFinal);
        }

        ws.getRange(row, 15).setValue(data.precioRegular || data.total || '0');
        // Actualizar Atenciones: estado "Por cobrar" con servicio y total
        cerrarAtencion(data.idEspera, data.chicaNombre, data.clienteNombre, data.servicio, totalFinal, '', 'Por cobrar');
      }

      // Guardar desglose de servicios por staff en col S (19) para ticket de cobro detallado
      // ACUMULAR con desglose existente en vez de sobreescribir
      if (data.serviciosDetalle && data.serviciosDetalle.length > 0) {
        try {
          let desgloseExistente = [];
          const colS = allData[i][18]; // col S = índice 18
          if (colS) {
            try { desgloseExistente = JSON.parse(colS); } catch(e) {}
          }
          // Combinar: desglose existente + nuevo, evitando duplicados por staff+servicio
          const nuevoDesglose = [...desgloseExistente];
          data.serviciosDetalle.forEach(nuevo => {
            const yaExiste = nuevoDesglose.some(ex =>
              ex.staff === nuevo.staff && ex.servicio === nuevo.servicio
            );
            if (!yaExiste) nuevoDesglose.push(nuevo);
          });
          ws.getRange(row, 19).setValue(JSON.stringify(nuevoDesglose));
        } catch(e) {}
      }

      // Cerrar autorizaciones pendientes/aprobadas de este staff+clienta para que no reaparezcan
      try {
        const wsAuth = getSheet('Autorizaciones');
        if (wsAuth) {
          const authData = wsAuth.getDataRange().getValues();
          for (let j = 1; j < authData.length; j++) {
            const authCliente = String(authData[j][3] || '').trim();
            const authStaff = String(authData[j][5] || '').trim();
            const authEstado = String(authData[j][10] || '').toLowerCase();
            if (authCliente === data.clienteNombre && authStaff === data.chicaNombre &&
                (authEstado === 'aprobado' || authEstado === 'pendiente')) {
              wsAuth.getRange(j + 1, 11).setValue('completada');
            }
          }
        }
      } catch(eAuth) { /* no bloquear si falla */ }

      return { success: true };
  }
  return { success: false, message: 'Atención no encontrada' };
}

// Dashboard completo de Mikaela: esperando + en servicio + por cobrar
function handleGetListaCompleta() {
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const esperando = [];
  const enServicio = [];
  const porCobrar = [];

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
      precioRegular: row[15] || row[14] || row[12] || '0',  // P=precioRegular, O=precioPromo, M=total
      secuencia: (function(){ try { return JSON.parse(row[16] || '[]'); } catch(e) { return []; } })(),
      serviciosDetalle: (function(){ try { return row[18] ? JSON.parse(row[18]) : null; } catch(e) { return null; } })(),
      esTop: esTop
    };

    // Excluir tickets atascados con fecha 1899 (de pruebas)
    const fechaTicket = row[1];
    const esTicketValido = fechaTicket instanceof Date && fechaTicket.getFullYear() > 2000;
    if (!esTicketValido) continue;

    if (estado === 'esperando' || estado === 'asignada') esperando.push(item);
    else if (estado === 'en servicio') enServicio.push(item);
    else if (estado === 'por cobrar') porCobrar.push(item);
  }

  // Merge con ServicioNormal y ServicioPromo
  try {
    const snResult = handleGetServicioNormal({});
    if (snResult.success) {
      esperando.push(...snResult.esperando);
      enServicio.push(...snResult.enServicio);
      porCobrar.push(...snResult.porCobrar);
    }
  } catch(e) {}
  try {
    const spResult = handleGetServicioPromo({});
    if (spResult.success) {
      esperando.push(...spResult.esperando);
      enServicio.push(...spResult.enServicio);
      porCobrar.push(...spResult.porCobrar);
    }
  } catch(e) {}

  return { success: true, esperando: esperando, enServicio: enServicio, porCobrar: porCobrar };
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
      const montoChica = Number(allData[i][12] || data.montoChica || 0);
      ws.getRange(row, 13).setValue(montoChica);

      // Registrar comisión de esta chica
      if (montoChica > 0) { try { updateComision(data.chicaNombre, montoChica); } catch(e) {} }

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
      wsNew.appendRow([
        newId, fechaStr, horaStr,
        allData[i][3], allData[i][4],       // Código, Nombre
        data.areasFaltantes || '',           // Servicio = área faltante
        data.nuevaArea || '',                // Área
        allData[i][7] || 'Normal',           // Prioridad
        'Esperando',                         // Estado
        '', '', nuevaObs,                    // Tomada por, Hora tomada, Obs
        montoSiguiente,                      // Total
        data.promoNombre || allData[i][13] || '', // Promo nombre
        precioPromo, precioNormal, '',       // Precio promo, Precio regular, Área completada
        JSON.stringify([{ area: data.areaCompletada, monto: montoChica, staff: data.chicaNombre }]), // Desglose
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
    if (!matchId790 && !(estado === 'en servicio' && tomadaPor === data.chicaNombre && nombre === data.clienteNombre)) continue;
    if (estado !== 'en servicio') continue;
    {
      const row = i + 1;
      
      // 1. Marcar este registro como "Completada" para que la chica lo vea en su historial
      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 16).setValue('Pendiente cobro final'); // metodoPago temporal
      ws.getRange(row, 17).setValue(horaStr);
      // Usar total real del Sheet si disponible (incluye extras aprobados)
      const montoRealSheet = Number(allData[i][12] || 0);
      const montoFinalChica = montoRealSheet > 0 ? montoRealSheet : Number(data.montoChica || 0);
      ws.getRange(row, 18).setValue(String(montoFinalChica));
      
      // Actualizar servicio con lo que hizo esta chica
      ws.getRange(row, 6).setValue(data.servicioActualizado || allData[i][5]);
      
      // Registrar comisión de esta chica (usar total real del Sheet)
      const montoParaComision = montoFinalChica > 0 ? montoFinalChica : Number(data.montoChica || 0);
      if (montoParaComision > 0) {
        updateComision(data.chicaNombre, montoParaComision);
      }
      
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
      
      // Observaciones con historial de la promo
      const obsActual = String(allData[i][11] || '');
      const nuevaObs = (obsActual ? obsActual + ' | ' : '') + '✅ ' + data.areaCompletada + ' completada por ' + data.chicaNombre + ' · Falta: ' + data.areasFaltantes;
      
      // Total del nuevo ticket = lo que cobró esta área (del Sheet, incluye extras) + siguiente área
      // Leer total real de col M del ticket actual (incluye extras aprobados)
      const totalEstaAreaSheet = Number(allData[i][12] || 0); // col M = índice 12
      const montoSiguiente = Number(data.montoSiguienteArea || 0);
      
      // Si el Sheet tiene más que lo que dice el frontend (por extras), usar el del Sheet
      const totalFrontend = Number(data.totalAcumulado || 0);
      const totalNuevoTicket = String(Math.max(totalFrontend, totalEstaAreaSheet > 0 ? totalEstaAreaSheet + montoSiguiente : 0) || data.montoSiguienteArea || '0');
      
      // Guardar también el monto real de esta área (para comisiones correctas)
      const montoChicaReal = totalEstaAreaSheet > 0 ? totalEstaAreaSheet : Number(data.montoChica || 0);
      
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

      ws.appendRow([
        newId, fechaStr, allData[i][2], allData[i][3], nombre,
        servicioLimpio + ' (continuación promo)',
        data.nuevaArea || allData[i][6],
        allData[i][7] || 'Normal',
        'Esperando', '', '', nuevaObs,
        totalNuevoTicket,
        allData[i][13] || '', // N: promoNombre (hereda del original)
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
function handleConfirmarCobro(data) {
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  const now = new Date();
  const horaStr = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
  const fechaStr = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');

  for (let i = 3; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === data.idEspera) {
      const row = i + 1;
      ws.getRange(row, 9).setValue('Completada');
      // P(16)=metodoPago, Q(17)=horaCobro, R(18)=totalCobrado
      ws.getRange(row, 16).setValue(data.metodoPago || 'Efectivo');
      ws.getRange(row, 17).setValue(horaStr);
      ws.getRange(row, 18).setValue(data.totalCobrado || '0');

      // Actualizar col K de ServiciosExtras con el ID del ticket cobrado
      try {
        const wsExt = getSheet('ServiciosExtras');
        if (wsExt) {
          const extData = wsExt.getDataRange().getValues();
          const codCliente = String(allData[i][3] || '').trim();
          const fechaHoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
          for (let e = 1; e < extData.length; e++) {
            if (String(extData[e][5]||'').trim() === codCliente &&
                String(extData[e][0]||'').trim() === fechaHoy &&
                String(extData[e][10]||'').trim() === '') {
              wsExt.getRange(e + 1, 11).setValue(data.idEspera || '');
            }
          }
        }
      } catch(eExt) {}
      
      // Datos de la atención
      const codigoCliente = allData[i][3] || '';
      const nombreCliente = allData[i][4] || '';
      const servicioOriginal = allData[i][5] || '';
      // Si hubo promo, usar nombre de promo como servicio; si no, usar el servicio original
      const promoNombreStr = String(allData[i][13] || data.promoNombre || '').trim();
      const servicio = promoNombreStr ? promoNombreStr + ' (PROMO)' : servicioOriginal;
      const area = allData[i][6] || '';
      const chicaNombre = String(allData[i][9] || '').trim();
      const totalCobrado = Number(data.totalCobrado) || 0;
      // montoComision: si el frontend lo manda explícitamente (ej: slot2 con promo dividida),
      // se usa para calcular la comisión del staff; si no, se usa el totalCobrado.
      // LEY SUPREMA: si pagó con tarjeta y hay promo, la comisión igual es sobre el precio cobrado
      // (ya que el frontend manda el precio regular como totalCobrado en ese caso)
      const montoParaComision = (data.montoComision !== undefined && data.montoComision !== null && data.montoComision !== '')
        ? Number(data.montoComision)
        : totalCobrado;
      const esTop = '';
      
      // Verificar si es TOP
      let topStr = '';
      try {
        const wsC = getSheet('Clientas');
        const cData = wsC.getDataRange().getValues();
        for (let j = 3; j < cData.length; j++) {
          if (String(cData[j][0]).trim() === String(codigoCliente).trim()) {
            if (String(cData[j][7] || '').toLowerCase().includes('sí')) topStr = '⭐';
            break;
          }
        }
      } catch(e) {}
      
      // Actualizar visita de la clienta
      updateVisitaClienta(codigoCliente);
      
      // Calcular comisión
      const areaStr = String(area).toLowerCase();
      const pct = areaStr.includes('facial') ? 0.4 : 0.3;
      const comision = Math.round(montoParaComision * pct * 100) / 100;
      
      // Actualizar comisión de la chica que atendió
      if (chicaNombre && montoParaComision > 0) {
        updateComision(chicaNombre, montoParaComision);
      }
      
      // Escribir en HistorialOwner
      // Columnas: A=Fecha | B=Hora | C=Código | D=Cliente | E=⭐ | F=Servicio | G=Área | H=Chica | I=Valor | J=Comisión
      try {
        const wsH = getSheet('HistorialOwner');
        wsH.appendRow([
          fechaStr, horaStr, codigoCliente, nombreCliente, topStr,
          servicio, area, chicaNombre, totalCobrado, comision, data.metodoPago || 'Efectivo'
        ]);
      } catch(e) { /* Si falla el historial, no bloquear el cobro */ }
      
      // Escribir en CierresPagos para el historial de Mikaela
      // Columnas: A=Fecha | B=Hora | C=ClienteNombre | D=StaffNombre | E=Servicio | F=Total | G=MetodoPago | H=ServiciosDetalle
      try {
        const wsPagos = getSheet('CierresPagos');
        // Guardar desglose de servicios (si hay) para el historial detallado de Mikaela
        const desgloseStr = data.serviciosDetalle && data.serviciosDetalle.length > 0
          ? JSON.stringify(data.serviciosDetalle)
          : '';
        wsPagos.appendRow([
          now,                         // A: Fecha (Date object)
          horaStr,                     // B: Hora
          nombreCliente,               // C: Cliente nombre
          chicaNombre,                 // D: Staff nombre
          servicio,                    // E: Servicio
          totalCobrado,                // F: Total cobrado
          data.metodoPago || 'Efectivo', // G: Método de pago
          desgloseStr                  // H: Servicios detalle (JSON)
        ]);
      } catch(e) { /* Si falla CierresPagos, no bloquear el cobro */ }

      // Actualizar Atenciones: estado Completado con total y método de pago
      cerrarAtencion(data.idEspera, chicaNombre, nombreCliente, servicio, totalCobrado, data.metodoPago || 'Efectivo', 'Completado');

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
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const hoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
  const servicios = [];

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

    servicios.push({
      nombre: row[4],
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

      servicios.push({
        nombre     : String(row[4]||''),
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

      servicios.push({
        nombre     : String(row[4]||''),
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

  return { success: true, servicios: servicios };
}

// ============================================
// ATENCIONES Y SERVICIOS
// ============================================
function handleGetAtenciones(params) {
  // Buscar en ListaEspera las que están "En servicio"
  const ws = getSheet('ListaEspera');
  const data = ws.getDataRange().getValues();
  const atenciones = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(row[8] || '').toLowerCase();
    if (estado !== 'en servicio') continue;
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
  try {
    const snR = handleGetServicioNormal(params || {});
    if (snR.success && snR.enServicio) {
      snR.enServicio.forEach(sn => {
        if (params && params.chica && sn.tomadaPor !== params.chica) return;
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
      spR.enServicio.forEach(sp => {
        if (params && params.chica && sp.tomadaPor !== params.chica) return;
        // Solo incluir SP- que estén realmente en servicio (no por cobrar)
        if (String(sp.estado || '').toLowerCase() === 'por cobrar') return;
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
          fuente      : 'ServicioPromo'
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
    comisiones.push({
      chica: row[0],
      area: row[1],
      servicios: row[2],
      facturado: row[3],
      porcentaje: row[4],
      comision: row[5]
    });
  }
  return { success: true, comisiones: comisiones };
}

function updateComision(chicaNombre, precio) {
  const ws = getSheet('Comisiones');
  const data = ws.getDataRange().getValues();
  const precioNum = Number(precio) || 0;
  if (precioNum <= 0) return;

  for (let i = 4; i < data.length; i++) {
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

      ws.getRange(row, 3).setValue(servicios);
      ws.getRange(row, 4).setValue(facturado);
      ws.getRange(row, 6).setValue(Math.round(comision * 100) / 100);
      return;
    }
  }
}

// ============================================
// SINCRONIZAR SERVICIOS EN ATENCIÓN
// Cuando la chica agrega/modifica/quita servicios, se actualiza en ListaEspera
// para que Mikaela vea en tiempo real qué servicios tiene la clienta
// ============================================
function handleUpdateServiciosAtencion(data) {
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
        wsN.getRange(row, 6).setValue(data.servicios || '');
        wsN.getRange(row, 13).setValue(data.total || '0');
        if (data.promoNombre) {
          // Tipo = SP, Precio Normal = regular, Precio Promo = myPrice
          wsN.getRange(row, 14).setValue(data.promoNombre);  // N: Promo nombre
          wsN.getRange(row, 19).setValue('SP');               // S: Tipo
          wsN.getRange(row, 20).setValue(Number(data.precioRegular || data.total || 0)); // T: Precio Normal
          wsN.getRange(row, 21).setValue(Number(data.precioPromo   || data.total || 0)); // U: Precio Promo
        } else {
          // Tipo = SN, solo Precio Normal
          wsN.getRange(row, 19).setValue('SN');               // S: Tipo
          wsN.getRange(row, 20).setValue(Number(data.total || 0)); // T: Precio Normal
          wsN.getRange(row, 21).setValue('');                 // U: Precio Promo vacío
        }
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
        wsP.getRange(row, 6).setValue(data.servicios || '');
        wsP.getRange(row, 13).setValue(data.total || '0');
        if (data.promoNombre) {
          wsP.getRange(row, 14).setValue(data.promoNombre);
          wsP.getRange(row, 19).setValue('SP');
          wsP.getRange(row, 20).setValue(Number(data.precioRegular || data.total || 0));
          wsP.getRange(row, 21).setValue(Number(data.precioPromo   || data.total || 0));
        } else {
          wsP.getRange(row, 19).setValue(data.tipo || 'SP');
          wsP.getRange(row, 20).setValue(Number(data.total || 0));
        }
        return { success: true };
      }
    }
  } catch(eP) {}

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
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();

  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();

    if (estado === 'en servicio' && tomadaPor === data.chicaNombre && nombre === data.clienteNombre) {
      const row = i + 1;
      ws.getRange(row, 9).setValue('Esperando');
      ws.getRange(row, 10).setValue('');
      ws.getRange(row, 11).setValue('');
      if (data.motivo) {
        const obsActual = String(allData[i][11] || '');
        const nuevaObs = obsActual ? obsActual + ' | Devuelta por ' + data.chicaNombre + ': ' + data.motivo : 'Devuelta por ' + data.chicaNombre + ': ' + data.motivo;
        ws.getRange(row, 12).setValue(nuevaObs);
      }
      return { success: true };
    }
  }
  return { success: false, message: 'Atención no encontrada' };
}

// ============================================
// FICHAS DE PESTAÑAS
// ============================================
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
  return { success: true, fichas: fichas };
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
// FICHA FACIAL
// ============================================
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

  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; // Saltar filas vacías
    if (row[1] === params.codigo) {
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
    const ws = getSheet('FichaCejasPigmento');
    if (!ws) {
      // Intentar con posibles variaciones del nombre
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const allSheets = ss.getSheets();
      const sheetNames = allSheets.map(s => s.getName());
      return { 
        success: false,
        error: 'Sheet FichaCejasPigmento no encontrado. Sheets disponibles: ' + sheetNames.join(', ') 
      };
    }
    
    const allData = ws.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
    
    // Buscar último ID (empezar desde fila 6, índice 5 - filas 1-4=headers, fila 5=encabezados columnas)
    let maxNum = 0;
    for (let i = 5; i < allData.length; i++) {
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
  for (let i = 4; i < comData.length; i++) {
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
      metodoPago: row[10]
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
  const soloServicios = filtrados.filter(h => String(h.metodoPago || '').toLowerCase() !== 'producto');
  const soloProductos = filtrados.filter(h => String(h.metodoPago || '').toLowerCase() === 'producto');

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
      metodoPago: h.metodoPago
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

  // Columnas HistorialOwner: A=Fecha B=Hora C=Codigo D=Cliente E=Top F=Servicio G=Area H=Staff I=Valor J=Comision K=MetodoPago
  const topFlag = ''; // Se podria calcular si la clienta es TOP
  ws.appendRow([
    fecha,                                    // A: Fecha
    hora,                                     // B: Hora
    atencion[3],                              // C: Codigo clienta
    atencion[4],                              // D: Nombre clienta
    topFlag,                                  // E: Top flag
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
    // Solo actualizar tickets activos (Esperando o En servicio), no completados
    if (String(row[3]).trim() !== String(data.codigo).trim()) continue;
    if (estado !== 'esperando' && estado !== 'en servicio') continue;
    // Fecha válida (no 1899)
    const fecha = row[1];
    if (fecha instanceof Date && fecha.getFullYear() < 2000) continue;

    ws.getRange(i + 1, 6).setValue(data.servicio);  // F: Servicio
    ws.getRange(i + 1, 7).setValue(data.area);      // G: Área
    ws.getRange(i + 1, 13).setValue(data.precio);   // M: Total/Precio
    
    return { success: true, message: 'Servicio asignado correctamente' };
  }
  
  return { success: false, message: 'Clienta no encontrada en lista de espera' };
}

function handleAsignarPromo(data) {
  const ws = getSheet('ListaEspera');
  const rows = ws.getDataRange().getValues();
  
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const estado = String(row[8] || '').toLowerCase();
    if (String(row[3]).trim() !== String(data.codigo).trim()) continue;
    if (estado !== 'esperando' && estado !== 'en servicio') continue;
    const fecha = row[1];
    if (fecha instanceof Date && fecha.getFullYear() < 2000) continue;

    ws.getRange(i + 1, 6).setValue(data.promoNombre + ' (PROMO)');
    ws.getRange(i + 1, 13).setValue(data.precioPromo);
    ws.getRange(i + 1, 14).setValue(data.promoNombre);
    ws.getRange(i + 1, 15).setValue(data.precioRegular);
    
    return { success: true, message: 'Promo asignada correctamente' };
  }
  
  return { success: false, message: 'Clienta no encontrada en lista de espera' };
}

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
    ws.getRange(1, 1, 1, 12).setValues([[
      'ID', 'Fecha', 'Hora', 'Cliente Código', 'Cliente Nombre', 
      'Staff', 'Servicio', 'Área', 'Precio', 'Nota', 'Estado', 'Respuesta'
    ]]);
    ws.getRange(1, 1, 1, 12).setFontWeight('bold');
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
    ''
  ];
  
  ws.appendRow(newRow);
  
  return { 
    success: true, 
    message: 'Solicitud enviada a Mikaela',
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
      ws.getRange(i + 1, 12).setValue('Aprobado por Mikaela el ' + fechaAprobacion + ' ' + horaAprobacion);

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
          fechaAprobacion,                                              // A: Fecha
          Utilities.formatDate(rows[i][1], 'America/Guayaquil', 'HH:mm'), // B: Hora solicitud
          horaAprobacion,                                               // C: Hora aprobación
          String(rows[i][5] || ''),                                     // D: Staff
          String(rows[i][4] || ''),                                     // E: Cliente
          String(rows[i][3] || ''),                                     // F: Código
          String(rows[i][6] || ''),                                     // G: Servicio extra
          String(rows[i][7] || ''),                                     // H: Área
          Number(rows[i][8] || 0),                                      // I: Precio
          'Aprobado',                                                   // J: Estado
          ''                                                            // K: ID Ticket (se llena al cobrar)
        ]);
      } catch(eExt) { Logger.log('Error escribiendo ServiciosExtras: ' + eExt); }
      
      return { 
        success: true, 
        message: 'Servicio aprobado',
        clienteCodigo: rows[i][3],
        clienteNombre: rows[i][4],
        staffNombre: rows[i][5]
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
      ws.getRange(i + 1, 12).setValue('Rechazado por Mikaela el ' + Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM HH:mm'));
      
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
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Calcular fecha límite según filtro
  let fechaLimite = new Date(hoy);
  if (filtro === "ayer") {
    fechaLimite.setDate(fechaLimite.getDate() - 1);
  } else if (filtro === "semana") {
    fechaLimite.setDate(fechaLimite.getDate() - 7);
  } else if (filtro === "mes") {
    fechaLimite.setDate(fechaLimite.getDate() - 30);
  }
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const fechaCobro = row[0] instanceof Date ? row[0] : new Date(row[0]);
    
    // Filtrar por fecha
    if (fechaCobro < fechaLimite) continue;
    
    servicios.push({
      fecha: Utilities.formatDate(fechaCobro, "America/Guayaquil", "dd/MM/yyyy"),
      hora: row[1],
      clienteNombre: row[2],
      staffNombre: row[3],
      servicio: row[4],
      total: row[5],
      metodoPago: row[6],
      // Si hay varios staff, parsear el detalle
      serviciosDetalle: row[7] ? JSON.parse(row[7]) : null
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
// LIMPIAR ATENCIONES — llamar UNA SOLA VEZ desde el owner
// Borra todos los registros y deja solo los encabezados
// ============================================
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
    const wsPagos = getSheet('CierresPagos');
    productos.forEach(p => {
      wsPagos.appendRow([
        now,
        horaStr,
        data.clienteNombre || '',
        'Mikaela',
        '🛍 ' + p.nombre + (p.cantidad > 1 ? ' x' + p.cantidad : ''),
        Number(p.precio) * Number(p.cantidad || 1),
        'Producto',
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
        data.clienteNombre || '',                                                    // D: Cliente
        '',                                                                          // E: Top
        '🛍 ' + productos.map(p => p.nombre + (p.cantidad > 1 ? ' x'+p.cantidad : '')).join(', '), // F: Servicio
        'Producto',                                                                  // G: Area
        'Mikaela',                                                                   // H: Staff
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
    const fecha   = String(data.fecha || '').trim();
    const hora    = String(data.hora || '').trim();
    const cliente = String(data.cliente || '').trim().toLowerCase();
    const staff   = String(data.staff || '').trim().toLowerCase();
    const servicio= String(data.servicio || '').trim().toLowerCase();
    const precio  = Number(data.precio || 0);
    const comision= Number(data.comision || 0);

    // 1. Eliminar de HistorialOwner
    const wsHist = getSheet('HistorialOwner');
    const histData = wsHist.getDataRange().getValues();
    let eliminadoHist = false;
    for (let i = histData.length - 1; i >= 3; i--) {
      const rowFecha   = histData[i][0] instanceof Date
        ? Utilities.formatDate(histData[i][0], 'America/Guayaquil', 'dd/MM/yyyy')
        : String(histData[i][0] || '');
      const rowCliente = String(histData[i][3] || '').trim().toLowerCase();
      const rowStaff   = String(histData[i][7] || '').trim().toLowerCase();
      const rowServicio= String(histData[i][5] || '').trim().toLowerCase();
      const rowHora    = String(histData[i][1] || '');

      const matchFecha   = rowFecha === fecha;
      const matchCliente = rowCliente.includes(cliente) || cliente.includes(rowCliente);
      const matchStaff   = rowStaff.includes(staff) || staff.includes(rowStaff) || staff === '';
      const matchServicio= rowServicio.includes(servicio.substring(0,10)) || servicio.includes(rowServicio.substring(0,10));

      if (matchFecha && matchCliente && matchStaff && matchServicio) {
        wsHist.deleteRow(i + 1);
        eliminadoHist = true;
        break;
      }
    }

    // 2. Eliminar de CierresPagos
    try {
      const wsPagos = getSheet('CierresPagos');
      const pagosData = wsPagos.getDataRange().getValues();
      for (let i = pagosData.length - 1; i >= 1; i--) {
        const rowCliente = String(pagosData[i][2] || '').trim().toLowerCase();
        const rowStaff   = String(pagosData[i][3] || '').trim().toLowerCase();
        const rowTotal   = Number(pagosData[i][5] || 0);
        if (rowCliente.includes(cliente) && Math.abs(rowTotal - precio) < 0.5) {
          wsPagos.deleteRow(i + 1);
          break;
        }
      }
    } catch(e) {}

    // 3. Revertir comisión en hoja Comisiones
    if (comision > 0 && staff !== '') {
      try {
        const wsComm = getSheet('Comisiones');
        const commData = wsComm.getDataRange().getValues();
        for (let i = commData.length - 1; i >= 3; i--) {
          const rowChica = String(commData[i][0] || '').trim().toLowerCase();
          if (rowChica.includes(staff) || staff.includes(rowChica)) {
            const actualComm = Number(commData[i][5] || 0);
            const actualFact = Number(commData[i][3] || 0);
            wsComm.getRange(i + 1, 4).setValue(Math.max(0, actualFact - precio));
            wsComm.getRange(i + 1, 6).setValue(Math.max(0, actualComm - comision));
            break;
          }
        }
      } catch(e) {}
    }

    return { success: true, eliminado: eliminadoHist };
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
  'Tipo','Precio Normal','Precio Promo'
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

    ws.appendRow([
      id,                          // A: ID
      fecha,                       // B: Fecha
      hora,                        // C: Hora llegada
      data.codigo    || '',        // D: Código cliente
      data.nombre    || '',        // E: Nombre
      data.servicio  || data.promoNombre || '', // F: Servicio
      data.area      || '',        // G: Área actual
      data.prioridad || 'Normal',  // H: Prioridad
      'Esperando',                 // I: Estado
      data.asignadaA || '',        // J: Tomada por
      '',                          // K: Hora tomada
      data.observaciones || '',    // L: Observaciones
      precioMiArea,                // M: Total acumulado (precio de esta área)
      data.promoNombre || '',      // N: Promo nombre
      precioPromo,                 // O: Precio promo total
      precioRegular,               // P: Precio regular total
      '',                          // Q: Área completada
      '',                          // R: Desglose staff JSON
      'SP',                        // S: Tipo
      precioRegular,               // T: Precio Normal total
      precioPromo                  // U: Precio Promo total
    ]);

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
    const id    = getNextIdNormal();

    ws.appendRow([
      id,                          // A: ID
      fecha,                       // B: Fecha
      hora,                        // C: Hora llegada
      data.codigo   || '',         // D: Código cliente
      data.nombre   || '',         // E: Nombre
      data.servicio || '',         // F: Servicio
      data.area     || '',         // G: Área
      data.prioridad|| 'Normal',   // H: Prioridad
      'Esperando',                 // I: Estado
      data.asignadaA|| '',         // J: Tomada por
      '',                          // K: Hora tomada
      data.observaciones || '',    // L: Observaciones
      Number(data.total || 0),     // M: Total
      '',                          // N: Promo nombre
      '',                          // O: Método pago
      '',                          // P: Hora cobro
      '',                          // Q: Total cobrado
      '',                          // R: Desglose JSON
      'SN',                        // S: Tipo (SN=normal, SP=promo)
      Number(data.total || 0),     // T: Precio Normal
      ''                           // U: Precio Promo
    ]);

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

    for (let i = 1; i < data.length; i++) {
      const row    = data[i];
      const estado = String(row[8] || '').toLowerCase().trim();
      if (!['esperando','en servicio','por cobrar'].includes(estado)) continue;
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
        serviciosDetalle: (function(){ try { return row[17] ? JSON.parse(row[17]) : null; } catch(e) { return null; } })(), // col R = desglose staff JSON
        fuente      : 'ServicioPromo'
      };

      if (estado === 'esperando')    esperando.push(item);
      else if (estado === 'en servicio') enServicio.push(item);
      else if (estado === 'por cobrar')  porCobrar.push(item);
    }

    return { success: true, esperando, enServicio, porCobrar };
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

    for (let i = 1; i < data.length; i++) {
      const row    = data[i];
      const estado = String(row[8] || '').toLowerCase().trim();
      if (!['esperando','en servicio','por cobrar'].includes(estado)) continue;

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
        fuente      : 'ServicioNormal'
      };

      if (estado === 'esperando')   esperando.push(item);
      else if (estado === 'en servicio') enServicio.push(item);
      else if (estado === 'por cobrar')  porCobrar.push(item);
    }

    return { success: true, esperando, enServicio, porCobrar };
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

      const row = i + 1;
      ws.getRange(row, 9).setValue('En servicio');
      ws.getRange(row, 10).setValue(data.chicaNombre || '');
      ws.getRange(row, 11).setValue(hora);

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
      ws.getRange(row, 9).setValue('Por cobrar');
      if (data.servicio) ws.getRange(row, 6).setValue(data.servicio);
      if (data.total) ws.getRange(row, 13).setValue(Number(data.total));
      if (data.serviciosDetalle) ws.getRange(row, 18).setValue(JSON.stringify(data.serviciosDetalle));

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
    const hora = Utilities.formatDate(now, tz, 'HH:mm');
    const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');

    for (let i = 1; i < rows.length; i++) {
      const id = String(rows[i][0] || '').trim();
      if (id !== String(data.idEspera).trim()) continue;
      const estado = String(rows[i][8] || '').toLowerCase();
      if (estado !== 'por cobrar') continue;

      const metodoPago   = data.metodoPago || 'Efectivo';
      const tipo         = String(rows[i][18] || 'SP').trim();
      const precioNormal = Number(rows[i][19] || rows[i][15] || 0);
      const precioPromo  = Number(rows[i][20] || rows[i][14] || 0);

      // precioMiArea = col M = lo que cobró esta staff por su parte
      const precioMiArea = Number(rows[i][12] || 0);

      // Para tarjeta: calcular precio normal proporcional de esta área
      // Si es la única área (toda la promo), usar precioNormal completo
      // Si es una parte, calcular proporción: (precioMiArea/precioPromo) * precioNormal
      let totalCobrado;
      if (tipo === 'SP' && metodoPago === 'Tarjeta' && precioNormal > 0 && precioPromo > 0 && precioMiArea > 0) {
        const proporcion = precioMiArea / precioPromo;
        totalCobrado = Math.round(precioNormal * proporcion * 100) / 100;
      } else {
        totalCobrado = precioMiArea > 0 ? precioMiArea : Number(data.totalCobrado || precioPromo || 0);
      }

      const row = i + 1;
      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 15).setValue(metodoPago);
      ws.getRange(row, 16).setValue(hora);
      ws.getRange(row, 17).setValue(totalCobrado);

      const codigoCliente = String(rows[i][3]||'');
      const nombreCliente = String(rows[i][4]||'');
      const servicio      = String(rows[i][5]||'');
      const area          = String(rows[i][6]||'');
      const chicaNombre   = String(rows[i][9]||'');
      const pct           = area.toLowerCase().includes('facial') ? 0.4 : 0.3;

      // Monto para comisión = solo la parte de esta staff
      // Si pagó con tarjeta y hay promo → calcular proporción del precio normal
      let montoComision;
      if (tipo === 'SP' && metodoPago === 'Tarjeta' && precioNormal > 0 && precioPromo > 0) {
        // Proporción: precioMiArea representa X% del precioPromo total
        // La comisión debe ser sobre esa misma proporción del precioNormal
        const proporcion = precioPromo > 0 ? precioMiArea / precioPromo : 1;
        montoComision = Math.round(precioNormal * proporcion * 100) / 100;
      } else {
        montoComision = precioMiArea > 0 ? precioMiArea : totalCobrado;
      }
      const comision = Math.round(montoComision * pct * 100) / 100;

      try { updateVisitaClienta(codigoCliente); } catch(e) {}
      try { if (chicaNombre && montoComision > 0) updateComision(chicaNombre, montoComision); } catch(e) {}

      // HistorialOwner — registrar monto de esta staff (no el total de la promo)
      try {
        const wsH = getSheet('HistorialOwner');
        wsH.appendRow([fecha, hora, codigoCliente, nombreCliente, '',
          servicio + ' (promo ' + (String(rows[i][13]||'')) + ')', area,
          chicaNombre, montoComision, comision, metodoPago]);
      } catch(eH) {}

      // CierresPagos — monto de esta staff
      try {
        const wsPagos = getSheet('CierresPagos');
        wsPagos.appendRow([now, hora, nombreCliente, chicaNombre, servicio,
          montoComision, metodoPago, 'parte de promo']);
      } catch(eP) {}

      // Cerrar Atenciones
      try { cerrarAtencion(id, chicaNombre, nombreCliente, servicio,
        totalCobrado, metodoPago, 'Completado'); } catch(eA) {}

      return { success: true, totalCobrado: totalCobrado };
    }
    return { success: false, message: 'Ticket SP no encontrado para cobro' };
  } catch(e) { return { success: false, message: String(e) }; }
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

      const row = i + 1;
      ws.getRange(row, 9).setValue('En servicio');
      ws.getRange(row, 10).setValue(data.chicaNombre || '');
      ws.getRange(row, 11).setValue(hora);

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
      ws.getRange(row, 9).setValue('Por cobrar');
      if (data.servicio) ws.getRange(row, 6).setValue(data.servicio);
      ws.getRange(row, 13).setValue(Number(data.total || rows[i][12] || 0));
      if (data.serviciosDetalle) ws.getRange(row, 18).setValue(JSON.stringify(data.serviciosDetalle));

      // Actualizar Atenciones a "Por cobrar"
      try {
        cerrarAtencion(data.idEspera,
          data.chicaNombre || String(rows[i][9]||''),
          String(rows[i][4]||''),
          data.servicio || String(rows[i][5]||''),
          Number(data.total || rows[i][12] || 0),
          '', 'Por cobrar');
      } catch(eA) {}

      // Comisión parcial
      if (data.chicaNombre && Number(data.total) > 0) {
        updateComision(data.chicaNombre, Number(data.total));
      }

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
      if (!['por cobrar','en servicio'].includes(estado)) continue;

      const row = i + 1;
      const totalCobrado = Number(data.totalCobrado || rows[i][12] || 0);
      const metodoPago   = data.metodoPago || 'Efectivo';

      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 15).setValue(metodoPago);
      ws.getRange(row, 16).setValue(hora);
      ws.getRange(row, 17).setValue(totalCobrado);

      const codigoCliente = String(rows[i][3] || '');
      const nombreCliente = String(rows[i][4] || '');
      const servicio      = String(rows[i][5] || '');
      const area          = String(rows[i][6] || '');
      const chicaNombre   = String(rows[i][9] || '');
      const areaStr       = area.toLowerCase();
      const pct           = areaStr.includes('facial') ? 0.4 : 0.3;
      const montoComision = (data.montoComision !== undefined && data.montoComision !== null && data.montoComision !== '')
        ? Number(data.montoComision)
        : (() => {
            // Leer Tipo (col S=19), Precio Normal (col T=20), Precio Promo (col U=21)
            const tipo        = String(rows[i][18] || 'SN').trim();
            const precioNormal = Number(rows[i][19] || rows[i][12] || 0);
            const precioPromo  = Number(rows[i][20] || 0);
            if (tipo === 'SP' && metodoPago === 'Tarjeta') {
              // Promo + Tarjeta → comisión sobre Precio Normal
              return precioNormal > 0 ? precioNormal : totalCobrado;
            }
            if (tipo === 'SP') {
              // Promo + Efectivo/Transfer → comisión sobre Precio Promo
              return precioPromo > 0 ? precioPromo : totalCobrado;
            }
            return totalCobrado;
          })();
      const comision = Math.round(montoComision * pct * 100) / 100;

      // TOP flag
      let topStr = '';
      try {
        const wsC = getSheet('Clientas');
        const cData = wsC.getDataRange().getValues();
        for (let j = 3; j < cData.length; j++) {
          if (String(cData[j][0]).trim() === codigoCliente.trim()) {
            if (String(cData[j][7]||'').toLowerCase().includes('sí')) topStr = '⭐';
            break;
          }
        }
      } catch(e) {}

      // Actualizar visita clienta
      try { updateVisitaClienta(codigoCliente); } catch(e) {}

      // Actualizar comisión de la chica
      try { if (chicaNombre && montoComision > 0) updateComision(chicaNombre, montoComision); } catch(e) {}

      // HistorialOwner
      try {
        const wsH = getSheet('HistorialOwner');
        wsH.appendRow([fecha, hora, codigoCliente, nombreCliente, topStr,
          servicio, area, chicaNombre, totalCobrado, comision, metodoPago]);
      } catch(eH) {}

      // CierresPagos
      try {
        const wsPagos = getSheet('CierresPagos');
        const desgloseStr = data.serviciosDetalle && data.serviciosDetalle.length > 0
          ? JSON.stringify(data.serviciosDetalle) : '';
        wsPagos.appendRow([now, hora, nombreCliente, chicaNombre, servicio,
          totalCobrado, metodoPago, desgloseStr]);
      } catch(eP) {}

      // Atenciones (para que Lesly vea el servicio completado y su comisión)
      try {
        cerrarAtencion(data.idEspera, chicaNombre, nombreCliente, servicio,
          totalCobrado, metodoPago, 'Completado');
      } catch(eA) {}

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
      } catch(eE) {}

      return { success: true, message: 'Cobro confirmado' };
    }
    return { success: false, message: 'Ticket no encontrado' };
  } catch(e) {
    return { success: false, message: String(e) };
  }
}

