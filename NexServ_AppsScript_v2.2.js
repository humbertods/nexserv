// ============================================
// NexServ · Google Apps Script — Backend API
// Versión: 2.1 - Fix FichaCejasPigmento (29/04/2026)
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
      case 'getAtenciones': result = handleGetAtenciones(e.parameter); break;
      case 'getCierresPagos': result = handleGetCierresPagos(); break;
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
      case 'tomarClienta': result = handleTomarClienta(data); break;
      case 'finalizarAtencion': result = handleFinalizarAtencion(data); break;
      case 'confirmarCobro': result = handleConfirmarCobro(data); break;
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
      case 'pagoIndividual': result = handlePagoIndividual(data); break;
      case 'bloquearUsuario': result = handleBloquearUsuario(data); break;
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
      precioPromo: row[12] || '',
      promoNombre: row[13] || '',
      precioRegular: row[14] || '',
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

  // Columnas: A=ID | B=Fecha | C=Hora | D=Código | E=Nombre | F=Servicio | G=Área | H=Prioridad | I=Estado | J=TomadaPor | K=HoraToma | L=Obs | M=Total | N=PromoNombre | O=PrecioRegular
  ws.appendRow([
    id, fecha, hora, data.codigo, data.nombre, data.servicio,
    data.area, data.prioridad || 'Normal', estado, tomadaPor, '', data.observaciones || '',
    data.precioPromo || '', data.promoNombre || '', data.precioRegular || ''
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
        codigo: allData[i][3],   // col D = Código cliente
        nombre: allData[i][4],   // col E = Nombre
        chica: data.chicaNombre,
        servicio: allData[i][5], // col F = Servicio
        area: allData[i][6]      // col G = Área
      });

      return { success: true, horaToma: now };
    }
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
    
    if (estado === 'en servicio' && tomadaPor === data.chicaNombre && nombre === data.clienteNombre) {
      const row = i + 1;
      ws.getRange(row, 9).setValue('Por cobrar');
      // Columnas extras: M(13)=total, N(14)=promoNombre, O(15)=precioRegular
      ws.getRange(row, 13).setValue(data.total || '0');
      ws.getRange(row, 14).setValue(data.promoNombre || '');
      ws.getRange(row, 15).setValue(data.precioRegular || data.total || '0');
      return { success: true };
    }
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

    const item = {
      idEspera: id,
      fecha: row[1],
      horaLlegada: row[2],
      codigo: codigo,
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      prioridad: row[7],
      tomadaPor: row[9] || '',
      horaToma: row[10] || '',
      observaciones: row[11] || '',
      total: row[12] || '0',
      promoNombre: row[13] || '',
      precioRegular: row[14] || row[12] || '0',
      esTop: esTop
    };

    if (estado === 'esperando' || estado === 'asignada') esperando.push(item);
    else if (estado === 'en servicio') enServicio.push(item);
    else if (estado === 'por cobrar') porCobrar.push(item);
  }

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
    if (estado !== 'por cobrar') continue;

    porCobrar.push({
      idEspera: id,
      codigo: row[3],
      nombre: row[4],
      servicio: row[5],
      area: row[6],
      tomadaPor: row[9],
      total: row[12] || '0',
      promoNombre: row[13] || '',
      precioRegular: row[14] || row[12] || '0',
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

  return { success: true, porCobrar: porCobrar };
}

// ============================================
// CONTINUAR PROMO: La chica terminó su parte, devolver a lista para la siguiente área
// ============================================
function handleContinuarPromoALista(data) {
  const ws = getSheet('ListaEspera');
  const allData = ws.getDataRange().getValues();
  const now = new Date();
  const horaStr = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');
  const fechaStr = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');

  for (let i = 3; i < allData.length; i++) {
    const id = String(allData[i][0] || '').trim();
    if (!id.startsWith('LE-')) continue;
    const estado = String(allData[i][8] || '').toLowerCase();
    const tomadaPor = String(allData[i][9] || '').trim();
    const nombre = String(allData[i][4] || '').trim();

    if (estado === 'en servicio' && tomadaPor === data.chicaNombre && nombre === data.clienteNombre) {
      const row = i + 1;
      
      // 1. Marcar este registro como "Completada" para que la chica lo vea en su historial
      ws.getRange(row, 9).setValue('Completada');
      ws.getRange(row, 16).setValue('Pendiente cobro final'); // metodoPago temporal
      ws.getRange(row, 17).setValue(horaStr);
      ws.getRange(row, 18).setValue(data.montoChica || '0');
      
      // Actualizar servicio con lo que hizo esta chica
      ws.getRange(row, 6).setValue(data.servicioActualizado || allData[i][5]);
      
      // Registrar comisión de esta chica
      if (data.montoChica && Number(data.montoChica) > 0) {
        updateComision(data.chicaNombre, Number(data.montoChica));
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
          Number(data.montoChica) || 0, comision, 'Pendiente cobro final'
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
      
      ws.appendRow([
        newId, fechaStr, allData[i][2], allData[i][3], nombre,
        data.areasFaltantes + ' (continuación promo)',
        data.nuevaArea || allData[i][6],
        allData[i][7] || 'Normal',
        'Esperando', '', '', nuevaObs,
        data.montoSiguienteArea || '0',
        allData[i][13] || '', // promoNombre
        allData[i][14] || ''  // precioRegular
      ]);
      
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
      
      // Datos de la atención
      const codigoCliente = allData[i][3] || '';
      const nombreCliente = allData[i][4] || '';
      const servicio = allData[i][5] || '';
      const area = allData[i][6] || '';
      const chicaNombre = String(allData[i][9] || '').trim();
      const totalCobrado = Number(data.totalCobrado) || 0;
      const montoParaComision = Number(data.montoComision) || totalCobrado;
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
      
      return { success: true };
    }
  }
  return { success: false };
}

// Servicios completados hoy por una chica
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
      horaCobro: horaCobro
    });
  }
  
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

  ws.appendRow([
    id, data.codigo, data.nombre, fecha, hora, data.chica, 'En servicio', '', '', ''
  ]);

  return { success: true, idAtencion: id };
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
  for (let i = 4; i < data.length; i++) {
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
      // Actualizar col F (servicio) con la lista actualizada
      ws.getRange(row, 6).setValue(data.servicios || '');
      // Actualizar col M (13) = total actualizado
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

  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (row[0] === params.codigo) {
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
  for (let i = 4; i < allData.length; i++) {
    if (allData[i][0] === data.codigo && String(allData[i][8]).toLowerCase() === 'sí') {
      ws.getRange(i + 1, 9).setValue('No');
    }
  }

  // Contar fichas existentes
  const existentes = allData.filter(r => r[0] === data.codigo).length - (allData[0] ? 0 : 0);
  const nroFicha = existentes + 1;

  // Máximo 5: si ya tiene 5, eliminar la más antigua
  if (nroFicha > 5) {
    for (let i = 4; i < allData.length; i++) {
      if (allData[i][0] === data.codigo) {
        ws.deleteRow(i + 1);
        break;
      }
    }
  }

  const today = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');

  ws.appendRow([
    data.codigo, data.nombre, nroFicha > 5 ? 5 : nroFicha,
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

  for (let i = 4; i < data.length; i++) {
    if (data[i][0] === params.codigo) {
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
      fechaCierre: row[2],
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

  return { success: true, message: 'Semana cerrada y comisiones reseteadas' };
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
  const historial = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    historial.push({
      fecha: row[0],
      hora: row[1],
      codigo: row[2],
      nombre: row[3],
      servicio: row[4],
      area: row[5],
      chica: row[6],
      precio: row[7],
      comision: row[8],
      metodoPago: row[9]
    });
  }

  // Filtrar por período si se especifica
  if (params.periodo === 'hoy') {
    const hoy = Utilities.formatDate(new Date(), 'America/Guayaquil', 'dd/MM/yyyy');
    return { success: true, historial: historial.filter(h => h.fecha === hoy) };
  }

  return { success: true, historial: historial };
}

function addHistorialOwner(atencion, data) {
  const ws = getSheet('HistorialOwner');
  const now = new Date();
  const fecha = Utilities.formatDate(now, 'America/Guayaquil', 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, 'America/Guayaquil', 'HH:mm');

  ws.appendRow([
    fecha, hora, atencion[1], atencion[2],
    data.servicio || '', data.area || '', atencion[5],
    data.totalCobrado || 0, data.comision || 0, data.metodoPago || 'Efectivo'
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
