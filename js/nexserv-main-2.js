// NEXSERV nexserv-main-2.js — Staff, autorizaciones, tickets
// Depende de: nexserv-main-1.js

  async function confirmServiceAndClose() {
    closeModal();

    // ── Si es TM: tomar también las áreas adicionales que marcó la staff ──
    const _tmPanel = document.getElementById('confirmSvcTMPanel');
    if (_tmPanel && _tmPanel.style.display !== 'none') {
      const slot_tm = window._confirmSvcSlot || 1;
      const idEspera_tm = slot_tm === 1 ? (window._as1IdEspera||'') : (window._as2IdEspera||'');
      const user_tm = window.currentUser;
      // Checkboxes desmarcados = áreas esperando que la staff NO va a tomar (no hacer nada)
      // Checkboxes marcados (no disabled) = áreas que la staff TAMBIÉN quiere tomar
      const extraChecks = document.querySelectorAll('#confirmSvcTMAreas input[type="checkbox"]:not([disabled]):checked');
      let _tomadasExtra = 0;
      for (const cb of extraChecks) {
        const extraIdx = Number(cb.dataset.areaIdx);
        if (extraIdx) {
          try {
            await apiPost('tomarAreaTicketMulti', {
              idEspera: idEspera_tm,
              chicaNombre: user_tm?.name || '',
              chicaArea: user_tm?.area || '',
              areaIdx: extraIdx
            });
            _tomadasExtra++;
          } catch(e) {}
        }
      }

      // Reconstruir el slot con TODOS los servicios marcados (el actual + los extra)
      // para que se le carguen todos a la vez y no solo el primero.
      const _areasRef = window._tmAreasActuales || [];
      const _seleccionadas = [];
      document.querySelectorAll('#confirmSvcTMAreas input[type="checkbox"]:checked').forEach(function(cb) {
        const idx = Number(cb.dataset.areaIdx);
        const ar = _areasRef.find(function(a){ return Number(a.idx) === idx; });
        if (ar) _seleccionadas.push({
          name: ar.tentativo || ar.confirmado || ar.area || 'Servicio',
          price: Number(ar.precio) || 0,
          area: ar.area,
          idx: ar.idx
        });
      });
      if (_seleccionadas.length > 0) {
        slotServices[slot_tm] = _seleccionadas;
        renderServicesForSlot(slot_tm);
        const _totalSel = _seleccionadas.reduce(function(s,v){ return s + Number(v.price||0); }, 0);
        const _totEl = document.getElementById('as' + slot_tm + 'Total');
        if (_totEl) _totEl.textContent = '$' + _totalSel;
        const _cntEl = document.getElementById('as' + slot_tm + 'SvcCount');
        if (_cntEl) _cntEl.textContent = String(_seleccionadas.length);
        setTimeout(function(){ try { updateFinishButtons(slot_tm); } catch(e){} }, 300);
      }

      // Avisar a Mikaela que la staff tomó todos los servicios marcados
      if (_tomadasExtra > 0) {
        // En el banner que ve la staff: solo el código (privacidad). El nombre solo va al push de Mikaela.
        const _codCli = (slot_tm === 1 ? (window._as1Client || '') : (window._as2Client || '')) || 'clienta';
        const _nomCli = document.getElementById('as' + slot_tm + 'Name')?.textContent?.replace(' ⭐','') || 'la clienta';
        try {
          simulateNotif('mikaela',
            (user_tm?.name || 'Staff') + ' tomó todos los servicios',
            _codCli + ' · ' + _seleccionadas.length + ' servicios', false);
        } catch(e) {}
        // (El aviso a Mikaela ahora lo manda el backend al pasar a "Por verificar" — evita duplicado)
      }

      // Resetear panel para la próxima vez
      document.getElementById('confirmSvcTMPanel').style.display = 'none';
      document.getElementById('confirmSvcNormalPanel').style.display = 'block';
      const cambiarBtn = document.getElementById('confirmSvcCambiarBtn');
      if (cambiarBtn) cambiarBtn.style.display = '';
    }

    // Confirmar al backend que la staff aceptó el servicio → volver a "En servicio"
    try {
      const slot = window._confirmSvcSlot || 1;
      const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
      if (idEspera) {
        await apiPost('confirmarServicioStaff', { idEspera });

        // Si es SP ticket (promo compartida/enganche): actualizar servicio en el sheet
        if (idEspera.startsWith('SP-')) {
          const svcsConf = (slotServices[slot] || []).filter(s =>
            s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado'
          );
          const svcNuevo = svcsConf.map(s => s.name).join(' + ');
          const precioNuevo = svcsConf.reduce((s,v) => s + Number(v.price||0), 0);
          if (svcNuevo) {
            await apiPost('actualizarServicioSP', {
              idEspera,
              nuevoServicio: svcNuevo,
              nuevoPrecio: precioNuevo
            });
          }
        }
      }
    } catch(e) {}
    showToast('✅ Servicio confirmado');

    const user = window.currentUser;

    // ── Si es cejas pigmento: mostrar ficha rápida de efecto polvo ──
    const slot_cs = window._confirmSvcSlot || 1;
    const svcs_cs = slotServices[slot_cs] || [];
    const tienePigmento = svcs_cs.some(function(s) { return esSrvPigmento(s.name); });
    if (tienePigmento && user && String(user.area||'').toLowerCase().includes('ceja')) {
      const clientCodigo_cs = slot_cs === 1 ? (window._as1Client || '') : (window._as2Client || '');
      const clientNombre_cs = document.getElementById('as' + slot_cs + 'Name')?.textContent?.replace(' ⭐','') || '';
      const clientKey_cs = clientCodigo_cs.toLowerCase().replace(/-/g,'');
      const el_cs = document.getElementById('cejasQuick' + slot_cs);
      if (el_cs) el_cs.innerHTML = ''; // forzar recarga
      if (el_cs) el_cs.style.display = 'none';
      setTimeout(function() {
        if (clientCodigo_cs) loadCejasQuick(clientKey_cs, slot_cs, clientCodigo_cs, clientNombre_cs);
      }, 400);
    }

    // ── Si es facial: abrir modal de ficha facial para registrar la visita ──
    if (user?.area === 'facial' || user?.role === 'owner') {
      const slot2 = window._confirmSvcSlot || 1;
      const clientNombre = document.getElementById('as' + slot2 + 'Name')?.textContent?.replace(' ⭐','') || '';
      const clientCodigo = document.getElementById('as' + slot2 + 'Code')?.textContent?.split(' ')[0] || '';
      const clientKey = clientCodigo.toLowerCase().replace(/-/g,'');
      // Pre-llenar datos de la clienta en el modal de visita facial
      setTimeout(() => {
        // Asegurar que CLIENT_PROFILES tenga la entrada
        if (clientCodigo && !CLIENT_PROFILES[clientKey]) {
          CLIENT_PROFILES[clientKey] = {
            name: clientNombre, code: clientCodigo,
            facial: { history: [] }, pestanas: { fichas: [], history: [] },
            cejas: { history: [] }, depilacion: { history: [] }
          };
        }
        // Guardar datos de la clienta para la ficha/visita
        window._currentFacialClientKey = clientKey;
        window._currentFacialClientNombre = clientNombre;
        window._currentFacialClientCodigo = clientCodigo;
        // Pre-calcular servicio y precio para la visita
        const svcs = slotServices[slot2] || [];
        window._currentFacialSvcName = svcs.filter(s => s.status !== 'rechazado').map(s => s.name).join(' + ') || '';
        window._currentFacialSvcPrice = svcs.filter(s => s.status !== 'rechazado').reduce((s,v) => s + Number(v.price||0), 0);
        // FIX: cargar ficha facial del sheet antes de mostrar el panel
        // Si ya existe ficha en el sheet, mostrarla; si no, mostrar "Sin ficha"
        if (clientCodigo) {
          apiGet('getFichaFacial', { codigo: clientCodigo }).then(facRes => {
            if (facRes.success && facRes.ficha) {
              if (!CLIENT_PROFILES[clientKey]) CLIENT_PROFILES[clientKey] = { name: clientNombre, code: clientCodigo, facial: {} };
              if (!CLIENT_PROFILES[clientKey].facial) CLIENT_PROFILES[clientKey].facial = {};
              CLIENT_PROFILES[clientKey].facial.ficha = facRes.ficha;
            }
            loadFacialFichaQuick(clientKey, slot2);
          }).catch(() => loadFacialFichaQuick(clientKey, slot2));
        } else {
          loadFacialFichaQuick(clientKey, slot2);
        }
      }, 400);
    }
  }

  // Alias movido a nexserv-main-1.js donde está definida showConfirmServiceModal
  // window.confirmarServicioObligatorio = showConfirmServiceModal; // ← en main-1

  function changeServiceFromModal() {
    closeModal();
    const slot = window._confirmSvcSlot || 1;
    // Abrir el selector de servicio/promo en modo enganche (sin necesitar autorización)
    window._addServiceSlot = slot;
    window._editEngancheIdx = 0; // reemplazar el servicio en posición 0
    openAddService(slot, true); // true = modo enganche explícito
    // Cambiar título y ocultar nota
    setTimeout(() => {
      const modalTitle = document.querySelector('#addServiceModal .modal-title');
      if (modalTitle) modalTitle.textContent = '🔄 Cambiar servicio';
      const noteWrapper = document.getElementById('addSvcNoteWrapper');
      if (noteWrapper) noteWrapper.style.display = 'none';
      const confirmBtn = document.getElementById('addSvcConfirmBtn');
      if (confirmBtn) confirmBtn.textContent = 'Confirmar cambio';
    }, 100);
  }

  async function finalizarServicioSP(slot) {
    slot = slot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    if (!user) return;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey  = normalizeClientKey(clientName);
    const idEspera   = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    const clienteCodigo = slot === 1 ? (window._as1Client || '') : (window._as2Client || '');

    // Obtener datos del servicio desde slotServices o desde activePromos
    const svcs = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const promoData = activePromos[clientKey];
    const totalFinal = svcs.reduce((s,v) => s + Number(v.price||0), 0) || (promoData ? Number(promoData.promo?.price||0) : 0);
    const svcNames = svcs.map(s => s.name).join(' + ') || promoData?.promo?.name || 'Servicio';
    const precioRegular = promoData ? String(Number(promoData.promo?.regular || promoData.promo?.price || totalFinal)) : String(totalFinal);
    const promoNombre = promoData?.promo?.name || '';

    window._finishingSlot = slot;
    window._finishingData = {
      clientKey, clientName, svcNames,
      total: String(totalFinal),
      promoNombre, precioRegular,
      idEspera, clienteCodigo,
      areasExtras: [], promasExtraPendientes: []
    };

    showToast('⏳ Enviando a cobro...');
    try {
      await finishAndSend();
    } catch(e) {
      alert('Error al enviar a cobro: ' + e.message);
    }
  }

  // La staff terminó su parte: envía los servicios de OTRA área a su lista de espera
  // (para que otra staff los tome) y luego cobra solo su parte.
  async function finalizarYPasarOtraArea(slot) {
    slot = slot || 1;
    const user = window.currentUser;
    if (!user) return;
    const myArea = user.area || 'cejas';
    const codigo = slot === 1 ? (window._as1Client || '') : (window._as2Client || '');
    const nombre = (document.getElementById('as' + slot + 'Name')?.textContent || '').replace(' ⭐','').trim();
    const svcs = (slotServices[slot] || []).filter(s =>
      s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const otras = svcs.filter(s => !window.esMismaAreaM3(myArea, s.area || s.name));
    if (otras.length === 0) { await finalizarServicioSP(slot); return; }

    showToast('⏳ Enviando a otra staff...');
    const areaNames = { 'Cejas':'cejas', 'Depilación':'depilacion', 'Pestañas':'pestanas', 'Facial':'facial', 'Lifting / Retiro':'retiro_lifting' };
    for (const s of otras) {
      const areaDestino = areaNames[s.area] || String(s.area || 'cejas').toLowerCase();
      try {
        await apiPost('addServicioNormal', {
          codigo: codigo, nombre: nombre,
          servicio: s.name, area: areaDestino,
          precio: Number(s.price || 0), prioridad: 'Normal',
          observaciones: 'Pasado por ' + (user.name || 'staff') + ' durante atención'
        });
      } catch(e) {}
      // Marcar como enviado para que NO se cobre con esta staff
      const ref = (slotServices[slot] || []).find(x => x === s);
      if (ref) ref.status = 'enganche-enviado';
    }
    try { renderServicesForSlot(slot); } catch(e) {}
    showToast('✅ ' + otras.map(s => s.name).join(', ') + ' enviado a otra staff');
    // Cobrar solo la parte de esta staff
    await finalizarServicioSP(slot);
  }
  window.finalizarYPasarOtraArea = finalizarYPasarOtraArea;

  async function finishAndSend() {
    // Mandar directo a cobrar (finaliza completamente)
    closeModal();
    const user = window.currentUser;
    const data = window._finishingData;
    const slot = window._finishingSlot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío

    // ── PASO 1: Determinar el idEspera real del ticket activo ──────────────────
    let idEsperaActual = data.idEspera || window._as1IdEspera || '';
    let miTicketSheet = null;

    // Buscar en ServicioPromo si es SP- o vacío
    if (!idEsperaActual || idEsperaActual.startsWith('SP-')) {
      try {
        const spData = await apiGet('getServicioPromo');
        if (spData.success) {
          const todosLosTickets = [...(spData.enServicio || []), ...(spData.porCobrar || [])];
          miTicketSheet = todosLosTickets.find(t =>
            t.tomadaPor === user?.name &&
            (t.nombre === data.clientName || t.codigo === (data.clienteCodigo || window._as1Client))
          );
          if (miTicketSheet) {
            idEsperaActual = miTicketSheet.idEspera;
            window._as1IdEspera = idEsperaActual;
          }
        }
      } catch(e) {}
    }

    // ── ENGANCHE: si es SN- pero hay desglose acumulado en memoria, buscar también en SP ──
    // Cuando Laura toma enganche de Lesly (SN-), el ticket del enganche es SP-
    // El SN- original no tiene serviciosDetalle de Lesly — está en el SP- creado por continuarPromoALista
    if (idEsperaActual.startsWith('SN-') && !miTicketSheet) {
      try {
        const spData2 = await apiGet('getServicioPromo');
        if (spData2.success) {
          // IMPORTANTE: solo SP "en servicio". Un SP que ya está "por cobrar" está finalizado
          // y NO es el ticket de un enganche en curso. Incluir los "por cobrar" hacía que un
          // servicio extra (SN-) se enlazara con un SP ajeno YA cobrable de la misma clienta
          // (ej: la depilación de Keyla en "Por cobrar") y se intentara finalizar ESE SP
          // congelado → "Ticket SP no encontrado". El SN- debe finalizarse por su propio camino.
          const allSP = [...(spData2.enServicio || [])];
          // Buscar SP ticket para esta clienta (puede tener desglose de la staff previa)
          // FIX: solo vincular SP que tiene a ESTA staff en serviciosDetalle.
          // Sin este filtro, el SN de María (piernas $30) encontraba el SP de Laura (facial $32)
          // para la misma clienta, sumaba los montos y mostraba precio incorrecto en cobro grupal.
          const linkedSP = allSP.find(t =>
            (t.nombre === data.clientName || t.codigo === (data.clienteCodigo || window._as1Client)) &&
            t.serviciosDetalle && t.serviciosDetalle.length > 0 &&
            t.serviciosDetalle.some(d => d.staff === (user && user.name))
          );
          if (linkedSP && linkedSP.serviciosDetalle && linkedSP.serviciosDetalle.length > 0) {
            miTicketSheet = linkedSP;
            // No cambiar idEsperaActual — solo usamos miTicketSheet para el desglose
          }
        }
      } catch(e) {}
    }

    const esTicketSP = idEsperaActual.startsWith('SP-');

    // ── PASO 2: Obtener servicios aprobados ────────────────────────────────────
    let svcsAprobados = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');

    // Si memoria está vacía, reconstruir desde el ticket del sheet
    if (svcsAprobados.length === 0 && miTicketSheet) {
      const montoSheet = Number(miTicketSheet.total || miTicketSheet.precioPromo || 0);
      if (montoSheet > 0) {
        svcsAprobados = [{
          name: miTicketSheet.promoNombre || miTicketSheet.servicio || data.svcNames || 'Servicio',
          price: montoSheet,
          area: miTicketSheet.area || user?.area || ''
        }];
      }
    }

    // Fallback final: usar datos de _finishingData
    if (svcsAprobados.length === 0 && Number(data.total) > 0) {
      svcsAprobados = [{
        name: data.svcNames || 'Servicio',
        price: Number(data.total),
        area: user?.area || ''
      }];
    }

    // ── PASO 3: Calcular totales ───────────────────────────────────────────────
    const promoDataFresh = data.clientKey ? (activePromos[data.clientKey] || null) : null;
    const totalSoloEstaStaff = svcsAprobados.reduce((sum, s) => sum + Number(s.price || 0), 0);
    // Para enganche: sumar partes previas del sheet (Lesly) + esta staff (Laura)
    let totalPrevioSheet = 0;
    // Incluir desglose del sheet tanto si es SP como si es SN con SP vinculado
    if (miTicketSheet?.serviciosDetalle?.length > 0) {
      totalPrevioSheet = miTicketSheet.serviciosDetalle.reduce((s, d) => s + Number(d.monto || 0), 0);
    }
    const totalCombinadoEnganche = totalPrevioSheet + totalSoloEstaStaff;
    const totalFresh = String(totalCombinadoEnganche > 0 ? totalCombinadoEnganche : (Number(data.total) || 0));
    const svcNamesFresh = svcsAprobados.map(s => s.name).join(' + ') || data.svcNames || 'Servicio';
    // precioRegular: para tarjeta = precio normal total (promo compartida usa precios del sheet)
    let precioRegularFresh = totalFresh;
    if (promoDataFresh) {
      precioRegularFresh = String(Number(promoDataFresh.promo.regular || promoDataFresh.promo.price));
    } else if (miTicketSheet && totalPrevioSheet > 0) {
      // Promo compartida sin activePromos: usar precioRegular del sheet + precio regular de esta staff
      const precioRegSheetTotal = Number(miTicketSheet.precioRegular || miTicketSheet.precioNormal || 0);
      precioRegularFresh = String(precioRegSheetTotal > 0 ? precioRegSheetTotal : totalCombinadoEnganche);
    }

    // ── PASO 4: Construir desglose ─────────────────────────────────────────────
    const desgloseActual = svcsAprobados.map(s => ({
      staff: user?.name || '',
      servicio: s.name,
      area: s.area || user?.area || '',
      monto: Number(s.price || 0)
    }));

    // Base: desglose del sheet (partes de staffs anteriores) + lo que hay en memoria
    // SIEMPRE combinar: el sheet guarda partes previas (ej: Lesly), la memoria tiene la actual (Laura)
    const desgloseAcumulado = [];

    // 1) Agregar partes del sheet primero (staffs anteriores — funciona para SP y SN-enganche)
    if (miTicketSheet?.serviciosDetalle?.length > 0) {
      miTicketSheet.serviciosDetalle.forEach(d => {
        // Fix: servicio puede ser undefined si fue guardado antes del fix
        if (!d.servicio) d.servicio = d.area || miTicketSheet.promoNombre || 'Servicio';
        const yaExiste = desgloseAcumulado.some(ex => ex.staff === d.staff && ex.servicio === d.servicio);
        if (!yaExiste) desgloseAcumulado.push(d);
      });
    }

    // 2) Agregar desglose acumulado en memoria (partes de enganche anteriores parseadas de obs)
    (window._desgloseAcumulado || []).forEach(d => {
      const yaExiste = desgloseAcumulado.some(ex => ex.staff === d.staff && ex.servicio === d.servicio);
      if (!yaExiste) desgloseAcumulado.push(d);
    });

    // 3) Agregar el servicio actual de esta staff
    desgloseActual.forEach(nuevo => {
      const yaExiste = desgloseAcumulado.some(ex => ex.staff === nuevo.staff && ex.servicio === nuevo.servicio);
      if (!yaExiste) desgloseAcumulado.push(nuevo);
    });

    // ── PASO 5: Llamar al backend ──────────────────────────────────────────────
    // Para enganche SN-→SP: usar el SP ticket del desglose si existe, no el SN original
    const esEngancheSN = !esTicketSP && miTicketSheet && miTicketSheet.idEspera && miTicketSheet.idEspera.startsWith('SP-');
    let _finResp = null;
    try {
      if (esTicketSP || esEngancheSN) {
        const idParaFinalizar = esEngancheSN ? miTicketSheet.idEspera : idEsperaActual;
        const _spInfo = (typeof PROMOS !== 'undefined' ? PROMOS : []).find(function(p){ return p && p.name === data.promoNombre; });
        _finResp = await apiPost('finalizarServicioPromo', {
          idEspera: idParaFinalizar,
          chicaNombre: user?.name || '',
          clienteNombre: data.clientName,
          servicio: svcNamesFresh,
          total: totalFresh,
          promoNombre: data.promoNombre || '',
          precioPromo: _spInfo ? String(_spInfo.price) : '',
          precioRegular: _spInfo ? String(_spInfo.regular || _spInfo.price) : '',
          serviciosDetalle: desgloseAcumulado
        });
      } else {
        const _clientCodigoSlot = slot === 2 ? (window._as2Client || '') : (window._as1Client || '');
        _finResp = await apiPost('finalizarAtencion', {
          idEspera: idEsperaActual,
          chicaNombre: user?.name || '',
          clienteNombre: data.clientName,
          clienteCodigo: _clientCodigoSlot,
          servicio: svcNamesFresh,
          total: totalFresh,
          promoNombre: data.promoNombre,
          precioRegular: precioRegularFresh,
          serviciosDetalle: desgloseAcumulado
        });
      }
    } catch (err) { console.error('❌ Error en apiPost finalizarServicio:', err); _finResp = null; }

    // ── VALIDACIÓN: si el backend NO confirmó el envío, NO limpiar ni mostrar éxito ──
    // (antes el alert de éxito salía SIEMPRE y la clienta desaparecía de la pantalla sin haberse enviado)
    if (!_finResp || !_finResp.success) {
      const _msg = (_finResp && _finResp.message) ? _finResp.message : 'no se pudo conectar con el servidor';
      alert('⚠️ NO se pudo enviar la clienta a cobro.\n\nMotivo: ' + _msg + '.\n\nLa clienta sigue en tu pantalla — volvé a tocar "Finalizar servicio". Si sigue fallando, avisá a Mikaela.');
      return;
    }

    // ── LIMPIEZA: el backend confirmó el envío, ahora sí limpiar el slot ──
    if (activePromos[data.clientName]) delete activePromos[data.clientName];
    if (data.clientKey && activePromos[data.clientKey]) delete activePromos[data.clientKey];
    window._as1IdEspera = '';
    window._as1Client = '';
    window._finishingData = null;
    window._desgloseAcumulado = [];
    slotServices[slot] = [];
    if (user && activeClients[user.name]) {
      activeClients[user.name] = (activeClients[user.name] || []).filter((_, i) => i !== slot - 1);
      updateCapacityUI(user.name);
    }
    saveActivePromos();

    // Si había depilación compartida, crear ticket con las partes restantes
    if (window._depiRestPending && window._depiRestPending.length > 0) {
      const restNames = window._depiRestPending.map(i => i.nombre).join(' + ');
      const restTotal = window._depiRestPending.reduce((s, i) => s + Number(i.precio || 0), 0);
      const obsDepi = `✅ ${data.svcNames} completado por ${user?.name || 'Staff'} · Pendiente: ${restNames}`;
      try {
        await apiPost('continuarPromoALista', {
          idEspera: idEsperaActual || '',
          chicaNombre: user?.name || '',
          clienteNombre: data.clientName,
          servicio: restNames,
          total: String(restTotal),
          promoNombre: data.promoNombre || '',
          precioRegular: data.precioRegular || String(restTotal),
          areaCompletada: 'depilacion',
          areasFaltantes: restNames,
          nuevaArea: 'depilacion',
          montoSiguienteArea: String(restTotal),
          servicioActualizado: obsDepi
        });
      } catch(e) { console.error(e); }
      window._depiRestPending = [];
      show('staffHome');
      await new Promise(r => setTimeout(r, 300));
      loadStaffHome();
      alert(`✓ Tu parte lista. ${restNames} quedó en lista de espera para otra staff.`);
      return;
    }

    show('staffHome');
    await new Promise(r => setTimeout(r, 300));
    loadStaffHome();
    alert('✓ Servicio finalizado. Clienta enviada a cobrar con Mikaela.');
  }
  
  async function finishSlotAndContinue(slot) {
    // Prepara los datos del slot igual que finishSlot1/2 y llama finishAndContinue
    window._finishingSlot = slot;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey  = normalizeClientKey(clientName);
    const promoData  = activePromos[clientKey];
    const svcs       = slotServices[slot] || [];
    const total      = svcs.filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado')
                          .reduce((sum, s) => sum + Number(s.price || 0), 0);
    const svcNames   = svcs.filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado')
                          .map(s => s.name).join(' + ');

    window._finishingData = {
      clientKey,
      clientName,
      total: String(total),
      svcNames,
      promoNombre  : promoData?.promo?.name || '',
      precioRegular: promoData?.promo?.regular || String(total),
      areasExtras  : [],
      promasExtraPendientes: [],
      idEspera     : slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '')
    };

    await finishAndContinue();
  }

  // Normaliza cualquier nombre de área (key, label con emoji/SVG, o texto con acentos)
  // a una clave canónica para comparar de forma confiable.
  function _areaCanon(s) {
    var a = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    if (a.indexOf('ceja') >= 0 || a.indexOf('depil') >= 0) return 'cejas';
    if (a.indexOf('lifting') >= 0 || a.indexOf('retiro') >= 0) return 'cejas';
    if (a.indexOf('pesta') >= 0) return 'pestanas';
    if (a.indexOf('facial') >= 0) return 'facial';
    return a;
  }
  // Área canónica de una entrada de división: prioriza realArea (cejas/depilación guardan
  // el nombre del servicio en `area`), si no usa el texto de `area`.
  function _divAreaCanon(d) {
    return _areaCanon((d && d.realArea) ? d.realArea : (d && d.area) || '');
  }

  async function finishAndContinue() {
    // Pasar a otra área (devolver a lista de espera para que otra staff la tome)
    closeModal();
    
    const user = window.currentUser;
    const data = window._finishingData;
    const slot = window._finishingSlot;
    await ensureIdEsperaFresco(slot || 1); // ROBUSTEZ: resolver id fresco si el local está vacío
    const clientKey = data.clientKey;
    const displayName = data.clientName;
    
    console.log('🔍 finishAndContinue:', {
      clientKey,
      displayName,
      activePromos: Object.keys(activePromos)
    });
    
    // Obtener la promo activa para esta clienta
    const promoData = activePromos[clientKey];
    
    console.log('🔍 promoData encontrado:', promoData);
    
    // Flujo sin promo: servicio de area cruzada (ej: facial agrega servicio de cejas)
    if (!promoData || !promoData.promo) {
      // ── Bug #1 fix: recalcular areasExtras desde slotServices en tiempo real ──
      const _svcsActuales = slotServices[slot] || [];
      const _staffArea = user?.area || '';
      const areasExtras = [...new Set(
        _svcsActuales
          .filter(s => s.status === 'aprobado')
          .map(s => {
            const a = String(s.area || '').toLowerCase();
            if (a.includes('ceja') || a.includes('depil')) return 'cejas';
            if (a.includes('lifting') || a.includes('retiro')) return 'cejas';
            if (a.includes('pesta')) return 'pestanas';
            if (a.includes('facial')) return 'facial';
            return null;
          })
          .filter(a => a && a !== _staffArea)
      )];
      if (areasExtras.length === 0) {
        alert('No hay áreas adicionales para continuar. Usá "Mandar a cobrar".');
        return;
      }
      
      const areaDisplayMap = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting/Retiro', facial: 'Facial' };
      const areasLabel = areasExtras.map(a => areaDisplayMap[a] || a).join(', ');
      
      
      try {
        const myArea = user && user.area ? user.area : '';
        const allSvcs = slotServices[slot] || [];
        // Servicios completados (no rechazados ni pendientes)
        const svcsRealizados = allSvcs.filter(function(s) {
          return s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado';
        });
        // Servicios de la siguiente area (aprobados, area diferente)
        const svcsExtras = allSvcs.filter(function(s) {
          return s.status === 'aprobado' && s.area && s.area.toLowerCase() !== myArea.toLowerCase();
        });
        const servicioSiguiente = svcsExtras.map(function(s){ return s.name; }).join(' + ') || areasLabel;
        const totalSiguiente = svcsExtras.reduce(function(sum,s){ return sum + Number(s.price||0); }, 0);
        const totalRealizadoLaura = svcsRealizados.filter(function(s){ return !svcsExtras.includes(s); }).reduce(function(s,v){ return s+Number(v.price||0); }, 0);

        // Historial acumulado: muestra realizados + pendientes para la siguiente staff
        const histRealizados = svcsRealizados.filter(function(s){ return !svcsExtras.includes(s); }).map(function(s){ return s.name + ' $' + s.price; }).join(' + ');
        const servicioHistorial = (histRealizados ? '[✅' + (user && user.name ? user.name : '') + ': ' + histRealizados + '] | ' : '') + servicioSiguiente;

        const idEsperaActual = window._as1IdEspera || '';
        const accionFin = idEsperaActual.startsWith('SN-') ? 'finalizarServicioNormal'
                        : idEsperaActual.startsWith('SP-') ? 'finalizarServicioPromo'
                        : 'finalizarAtencion';

        const _clientCodigoFS = slot === 2 ? (window._as2Client || '') : (window._as1Client || '');
        const result = await apiPost(accionFin, {
          idEspera: idEsperaActual,
          chicaNombre: user && user.name ? user.name : '',
          clienteNombre: displayName,
          clienteCodigo: _clientCodigoFS,
          servicio: servicioHistorial || servicioSiguiente,
          servicioSiguiente: servicioSiguiente,
          total: String(totalSiguiente || 0),
          promoNombre: '',
          precioRegular: String(totalSiguiente || 0),
          areaCompletada: myArea,
          areasFaltantes: areasLabel,
          nuevaArea: areasExtras[0]
        });
        
        if (result.success) {
          slotServices[slot] = [];
          if (user && activeClients[user.name]) {
            activeClients[user.name].splice(slot - 1, 1);
            updateCapacityUI(user.name);
          }
          alert('Servicio completado. Pendiente: ' + areasLabel + '. La clienta volvio a lista de espera para continuar con ' + areasLabel + '.');
          show('staffHome');
        } else {
          alert('Error: ' + (result.message || 'No se pudo procesar'));
        }
      } catch (err) {
        console.error(err);
        alert('Error al procesar');
      }
      return;
    }
    
    const promo = promoData.promo;
    const areaActual = user?.area || '';
    
    // Mapeo de áreas
    const areaMap = {
      'cejas': '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg> Cejas',
      'depilacion': 'Depilación',
      'pestanas': '👁 Pestañas',
      'retiro_lifting': '👁 Lifting/Retiro',
      'facial': '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z\"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z\"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z\"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z\"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z\"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z\"/></svg> Facial'
    };
    
    // Encontrar la división correspondiente al área actual
    // FIX: comparar por área canónica (realArea o texto normalizado), NO por el label con emoji
    const miDivision = promo.division.find(d => _divAreaCanon(d) === _areaCanon(areaActual));
    
    if (!miDivision) {
      alert('Error: No se encontró la división de precio para ' + areaActual + ' en esta promo.');
      return;
    }
    
    // Calcular áreas completadas y áreas faltantes
    const areasCompletadas = promoData.completedAreas || [areaActual];
    if (!areasCompletadas.includes(areaActual)) {
      areasCompletadas.push(areaActual);
    }
    
    // Obtener todas las áreas de la promo (canónico: usa realArea o texto normalizado)
    const todasLasAreas = promo.division.map(d => _divAreaCanon(d)).filter(a => a);
    
    // Áreas que faltan
    const areasFaltantes = todasLasAreas.filter(a => !areasCompletadas.includes(a));
    
    if (areasFaltantes.length === 0) {
      alert('⚠️ Todas las áreas de la promo ya están completadas. Usá "Mandar a cobrar" en su lugar.');
      return;
    }
    
    // Siguiente área y su precio (match canónico por realArea/texto normalizado)
    const siguienteArea = areasFaltantes[0];
    const siguienteLabel = areaMap[siguienteArea];
    const siguienteDivision = promo.division.find(d => _divAreaCanon(d) === _areaCanon(siguienteArea));
    console.log('🔍 siguienteArea:', siguienteArea, '| siguienteLabel:', siguienteLabel, '| division areas:', promo.division.map(d=>d.area), '| siguienteDivision:', siguienteDivision);
    
    // Nombres de servicios faltantes
    const serviciosFaltantes = areasFaltantes.map(a => {
      const div = promo.division.find(d => _divAreaCanon(d) === _areaCanon(a));
      return div ? String(div.servicio || div.area || a).replace('💅 ', '').replace('👁 ', '').replace('✨ ', '').replace(/(<svg[^>]*>.*?<\/svg>)\s*/g, '').trim() : a;
    }).join(' + ');
    
    console.log('División calculada:', {
      areaActual,
      miDivision,
      areasCompletadas,
      areasFaltantes,
      siguienteArea,
      siguienteDivision,
      serviciosFaltantes
    });
    
    try {
      // Llamar al backend para devolver a lista de espera
      // totalAcumulado = lo que ya cobró esta área (promo + extras) + lo que cobrará la siguiente
      const svcsActuales = slotServices[slot] || [];
      const svcsAprobadosAhora = svcsActuales.filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
      
      // montoYaHecho = solo la parte de esta staff (no el total de la promo)
      // Para promos multi-área usamos la memoria (slotServices) que tiene el precio de su área
      const montoYaHechoMemoria = svcsAprobadosAhora.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const montoYaHecho = montoYaHechoMemoria > 0 ? montoYaHechoMemoria : (Number(data.total) || 0);
      const montoSiguiente = siguienteDivision ? (Number(siguienteDivision.monto) || 0) : 0;
      const totalAcumulado = montoYaHecho + montoSiguiente;

      // Desglose completo de esta staff (promo + todos los extras aprobados)
      const desgloseEstaChica = svcsAprobadosAhora
        .map(s => ({ staff: user?.name || '', servicio: s.name, area: s.area || '', monto: Number(s.price || 0) }));

      const result = await apiPost('continuarPromoALista', {
        idEspera: window._as1IdEspera || '',
        chicaNombre: user?.name || '',
        clienteNombre: displayName,
        servicio: data.svcNames,
        total: data.total,
        promoNombre: data.promoNombre,
        precioRegular: data.precioRegular,
        areaCompletada: areaActual,
        montoChica: String(montoYaHecho),
        areasFaltantes: serviciosFaltantes,
        nuevaArea: siguienteArea,
        montoSiguienteArea: String(montoSiguiente),
        totalAcumulado: String(totalAcumulado),
        desgloseChica: JSON.stringify(desgloseEstaChica),
        servicioActualizado: data.svcNames + ' (✅ completado)'
      });
      
      if (result.success) {
        // Limpiar slot usando clientKey normalizada
        if (activePromos[clientKey]) delete activePromos[clientKey];
        slotServices[slot] = [];

        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        
        const promasExtMsg = (data.promasExtraPendientes || []).map(p => p.nombre).join(' + ');
        const faltaTotal = serviciosFaltantes + (promasExtMsg ? ' + ' + promasExtMsg : '');
        // Mostrar resumen completo con todos los servicios realizados (promo + extras)
        const resumenServicios = svcsAprobadosAhora.map(s => s.name + ' $' + s.price).join(' + ');
        alert('Servicio completado.\n\n' +
              '- ' + areaActual.toUpperCase() + ': ' + resumenServicios + ' = $' + montoYaHecho + ' (completado)\n' +
              '- Falta: ' + faltaTotal + '\n\n' +
              'La clienta volvio a lista de espera para continuar.');
        show('staffHome');
      } else {
        alert('Error: ' + (result.message || 'No se pudo devolver a lista'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al devolver a lista de espera');
    }
  }
  
  async function finishAndNextPromo() {
    // Finalizar la parte actual y activar la siguiente promo del ticket
    const user = window.currentUser;
    const data = window._finishingData;
    const slot = window._finishingSlot || 1;
    const siguientePromo = data.promasExtraPendientes && data.promasExtraPendientes[0];

    if (!siguientePromo) { alert('No hay siguiente promo'); return; }

    closeModal();

    try {
      // Finalizar la atencion actual (cobra la parte ya realizada)
      // Las promasExtra restantes son las que vienen despues de la que se activa ahora
      const promasExtraRestantes = data.promasExtraPendientes.slice(1);

      const _slotFNP = window._finishingSlot || 1;
      const result = await apiPost('finalizarAtencion', {
        idEspera: (_slotFNP===2?window._as2IdEspera:window._as1IdEspera) || '',
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        clienteCodigo: (_slotFNP===2?(window._as2Client||''):(window._as1Client||'')),
        servicio: data.svcNames,
        total: data.total,
        promoNombre: data.promoNombre,
        precioRegular: data.precioRegular,
        siguientePromo: siguientePromo.nombre,
        siguientePromoPrecio: siguientePromo.precio,
        siguientePromoRegular: siguientePromo.regular,
        siguientePromoArea: siguientePromo._area || 'cejas',
        promasExtraRestantes: promasExtraRestantes
      });

      if (result.success) {
        // Limpiar slot actual
        delete activePromos[normalizeClientKey(data.clientName)];
        slotServices[slot] = [];
        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        // Quitar la promo que acabamos de activar de las pendientes
        window._takingPromasExtra = (window._takingPromasExtra || []).slice(1);
        try {
          const _idEsperaAct = window._as1IdEspera || '';
          if (_idEsperaAct) sessionStorage.setItem('nexserv_promasExtra_' + _idEsperaAct, JSON.stringify(window._takingPromasExtra));
        } catch(eS2) {}
        try {
          const _idEsperaAct = window._as1IdEspera || '';
          if (_idEsperaAct) sessionStorage.setItem('nexserv_promasExtra_' + _idEsperaAct, JSON.stringify(window._takingPromasExtra));
        } catch(eS2) {}
        const AREA_LABELS_ALERT = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilacion', pestanas: 'Pestanas', facial: 'Facial', retiro_lifting: 'Lifting' };
        const parteActual = (user && user.area ? AREA_LABELS_ALERT[user.area] || user.area : 'Tu area');
        const restantes = promasExtraRestantes.map(function(p){ return p.nombre; }).join(' + ');
        var msgAlert = parteActual + ' completado. Siguiente: ' + siguientePromo.nombre + ' ($' + siguientePromo.precio + ')';
        if (restantes) msgAlert += '. Pendiente despues: ' + restantes;
        msgAlert += '. La clienta volvio a lista de espera.';
        alert(msgAlert);
        show('staffHome');
      } else {
        alert('Error: ' + (result.message || 'No se pudo procesar'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar');
    }
  }

  async function finishAndRetire() {
    // Retirar clienta: cobrar solo lo realizado, cancelar todo lo pendiente del ticket
    const user = window.currentUser;
    const data = window._finishingData;
    const slot = window._finishingSlot || 1;

    // Solo los servicios aprobados del slot actual
    const svcs = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const totalRealizado = svcs.reduce((sum, s) => sum + Number(s.price || 0), 0);
    const nombresRealizados = svcs.map(s => s.name).join(' + ') || data.svcNames;

    if (!confirm('La clienta se retira. Se cobrara solo lo realizado: ' + nombresRealizados + ' = $' + totalRealizado + '.\n\nLos servicios y promos pendientes se cancelan.')) return;

    closeModal();

    try {
      // Finalizar la atención con el total parcial y marcar como "Por cobrar"
      const result = await apiPost('finalizarAtencion', {
        idEspera: (window._finishingSlot===2?window._as2IdEspera:window._as1IdEspera) || '',
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        clienteCodigo: (window._finishingSlot===2?(window._as2Client||''):(window._as1Client||'')),
        servicio: nombresRealizados,
        total: String(totalRealizado),
        promoNombre: '',
        precioRegular: String(totalRealizado),
        esRetiro: true
      });

      if (result.success) {
        // Limpiar slot
        delete activePromos[normalizeClientKey(data.clientName)];
        slotServices[slot] = [];
        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        alert('La clienta fue retirada. Mikaela puede proceder al cobro de $' + totalRealizado + '.');
        show('staffHome');
      } else {
        alert('Error: ' + (result.message || 'No se pudo procesar el retiro'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el retiro');
    }
  }

  async function finishAndReturn() {
    // Devolver a lista de espera (la clienta NO continuará con otros servicios)
    closeModal();
    
    const user = window.currentUser;
    const data = window._finishingData;
    const slot = window._finishingSlot;
    
    try {
      const result = await apiPost('devolverALista', {
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        motivo: 'no_continuara'
      });
      
      if (result.success) {
        // Limpiar slot
        if (activePromos[data.clientName]) delete activePromos[data.clientName];
        slotServices[slot] = [];

        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        
        alert('↩️ Clienta devuelta a lista de espera.');
        show('staffHome');
      } else {
        alert('Error: ' + (result.message || 'No se pudo devolver'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al devolver a lista');
    }
  }

  function updateCapacityUI(chicaName) {
    const clients = activeClients[chicaName] || [];
    const count = clients.length;
    const badge = document.getElementById('capacityBadge');
    const slot1 = document.getElementById('slot1');
    const slot2 = document.getElementById('slot2');
    
    badge.textContent = count + '/2 ocupada' + (count !== 1 ? 's' : '');
    badge.style.background = count === 2 ? 'var(--danger-bg)' : count === 1 ? 'var(--warning-bg)' : 'var(--success-bg)';
    badge.style.color = count === 2 ? 'var(--danger)' : count === 1 ? 'var(--warning)' : 'var(--success)';
    
    if (clients[0]) {
      slot1.innerHTML = '<div style="margin-bottom: 4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#111"><path d="M15.4,15.4l-.3-1h-2s0,1.6,0,1.6c.5,0,.8.5.8,1.1h1.1c.3,0,.5.2.5.5s-.2.5-.5.5h-4.9c-.3,0-.5-.3-.5-.5s.2-.5.5-.5h1.1c0-.5.3-1,.8-1.1v-1.6s-2,0-2,0c-.7,0-1.3-.6-1.4-1.2l-1.2-7.3c0-.2.1-.4.4-.5s.4,0,.6,0c.7,0,1.3.5,1.4,1.2l.5,3.1h1.1c.7,0,1.2.5,1.4,1.1l.5,1.5h1.1c.6,0,1,.5,1.2,1l.3.5.4,1.3c0,.2.2.4.5.4h.8c.3,0,.5.2.5.5s-.2.5-.5.5-.5,0-.8,0c-.7,0-1.2-.4-1.4-1.1ZM11.8,10.9c0-.2-.3-.3-.4-.3h-.8s.3,1.6.3,1.6h1.4s-.4-1.3-.4-1.3Z"/><path d="M8.6,21.9c-.2,0-.3-.3-.2-.5s.3-.2.5-.2c2.2.8,4.5.7,6.6-.2,3.5-1.4,5.9-4.8,6-8.6s-.2-2.6-.7-3.9,0-.4.2-.5.4,0,.5.2c.7,1.6.9,3.2.8,4.9-.3,3.4-2.4,6.5-5.4,8.1s-2.6,1.1-4,1.2c-1.5.1-2.9,0-4.2-.6Z"/><path d="M3.8,7.4c-1,1.6-1.4,3.3-1.3,5.1s.2,2.1.6,3.1,0,.4-.2.5-.4,0-.5-.2c-.6-1.3-.8-2.8-.7-4.2.2-3.8,2.6-7.2,6-8.8s4.9-1.3,7.4-.5.3.3.2.5-.2.3-.4.3c-.7-.2-1.4-.4-2.1-.4s-1,0-1.5,0c-3,.2-5.9,2-7.5,4.6Z"/><path d="M19.6,6.3h-.7s-.7,0-.7,0c-.2,0-.4,0-.6,0s-.3-.2-.3-.4.1-.3.3-.3h.5s.6,0,.6,0c-.5-.6-1.1-1-1.7-1.4s-.3-.3-.2-.5.3-.3.5-.1c.7.4,1.3.9,1.9,1.5v-.6c0-.3,0-.7.4-.8s.4,0,.4.3,0,.5,0,.7v1.3c0,.2-.2.4-.4.4Z"/><path d="M4.6,19.4c0,.3,0,.6,0,.9s-.1.5-.4.5-.4-.2-.4-.5v-.7s0-1.1,0-1.1c0-.2.2-.3.4-.4h.8s1,0,1,0c.2,0,.3.2.3.3s0,.4-.2.4c-.3.1-.8,0-1.2.1.5.5.9.9,1.5,1.3s.2.3.1.5-.3.3-.5.2c-.6-.3-1.1-.8-1.6-1.3Z"/></svg></div><div style="font-weight: 700; font-size: 13px; color: var(--ink);">' + clienteDisplay(clients[0].name, clients[0].code) + '</div><div style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">En atención</div>';
      slot1.style.border = '2px solid var(--success)';
      slot1.style.background = 'var(--success-bg)';
      slot1.dataset.active = 'true';
    } else {
      slot1.innerHTML = '<div style="margin-bottom: 4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.8,17.6l-.5-1.7h-3.2s0,2.6,0,2.6c.8.1,1.3.8,1.3,1.7h1.7c.5,0,.8.3.8.8s-.3.9-.7.9h-7.8c-.4,0-.7-.5-.7-.8s.3-.8.8-.8h1.8c0-.8.4-1.5,1.3-1.7v-2.6s-3.1,0-3.1,0c-1.1,0-2-.9-2.2-2l-1.9-11.6c0-.4.2-.7.6-.7s.7,0,1,0c1.1,0,2,.8,2.2,1.9l.9,4.8h1.7c1.1,0,1.9.8,2.2,1.8l.8,2.4h1.7c.9,0,1.6.8,1.9,1.6l.4.9.7,2c.1.3.4.6.7.6h1.2c.4,0,.8.4.8.8s-.3.8-.7.8-.9,0-1.3,0c-1,0-2-.7-2.3-1.7ZM11.2,10.5c0-.2-.4-.5-.6-.5h-1.3s.4,2.5.4,2.5h2.2s-.7-2-.7-2Z"/></svg></div>Libre';
      slot1.style.border = '2px dashed var(--line)';
      slot1.style.background = 'transparent';
      slot1.dataset.active = 'false';
    }
    
    if (clients[1]) {
      slot2.innerHTML = '<div style="margin-bottom: 4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#111"><path d="M15.4,15.4l-.3-1h-2s0,1.6,0,1.6c.5,0,.8.5.8,1.1h1.1c.3,0,.5.2.5.5s-.2.5-.5.5h-4.9c-.3,0-.5-.3-.5-.5s.2-.5.5-.5h1.1c0-.5.3-1,.8-1.1v-1.6s-2,0-2,0c-.7,0-1.3-.6-1.4-1.2l-1.2-7.3c0-.2.1-.4.4-.5s.4,0,.6,0c.7,0,1.3.5,1.4,1.2l.5,3.1h1.1c.7,0,1.2.5,1.4,1.1l.5,1.5h1.1c.6,0,1,.5,1.2,1l.3.5.4,1.3c0,.2.2.4.5.4h.8c.3,0,.5.2.5.5s-.2.5-.5.5-.5,0-.8,0c-.7,0-1.2-.4-1.4-1.1ZM11.8,10.9c0-.2-.3-.3-.4-.3h-.8s.3,1.6.3,1.6h1.4s-.4-1.3-.4-1.3Z"/><path d="M8.6,21.9c-.2,0-.3-.3-.2-.5s.3-.2.5-.2c2.2.8,4.5.7,6.6-.2,3.5-1.4,5.9-4.8,6-8.6s-.2-2.6-.7-3.9,0-.4.2-.5.4,0,.5.2c.7,1.6.9,3.2.8,4.9-.3,3.4-2.4,6.5-5.4,8.1s-2.6,1.1-4,1.2c-1.5.1-2.9,0-4.2-.6Z"/><path d="M3.8,7.4c-1,1.6-1.4,3.3-1.3,5.1s.2,2.1.6,3.1,0,.4-.2.5-.4,0-.5-.2c-.6-1.3-.8-2.8-.7-4.2.2-3.8,2.6-7.2,6-8.8s4.9-1.3,7.4-.5.3.3.2.5-.2.3-.4.3c-.7-.2-1.4-.4-2.1-.4s-1,0-1.5,0c-3,.2-5.9,2-7.5,4.6Z"/><path d="M19.6,6.3h-.7s-.7,0-.7,0c-.2,0-.4,0-.6,0s-.3-.2-.3-.4.1-.3.3-.3h.5s.6,0,.6,0c-.5-.6-1.1-1-1.7-1.4s-.3-.3-.2-.5.3-.3.5-.1c.7.4,1.3.9,1.9,1.5v-.6c0-.3,0-.7.4-.8s.4,0,.4.3,0,.5,0,.7v1.3c0,.2-.2.4-.4.4Z"/><path d="M4.6,19.4c0,.3,0,.6,0,.9s-.1.5-.4.5-.4-.2-.4-.5v-.7s0-1.1,0-1.1c0-.2.2-.3.4-.4h.8s1,0,1,0c.2,0,.3.2.3.3s0,.4-.2.4c-.3.1-.8,0-1.2.1.5.5.9.9,1.5,1.3s.2.3.1.5-.3.3-.5.2c-.6-.3-1.1-.8-1.6-1.3Z"/></svg></div><div style="font-weight: 700; font-size: 13px; color: var(--ink);">' + clienteDisplay(clients[1].name, clients[1].code) + '</div><div style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">En atención</div>';
      slot2.style.border = '2px solid var(--info)';
      slot2.style.background = 'var(--info-bg)';
      slot2.dataset.active = 'true';
    } else {
      slot2.innerHTML = '<div style="margin-bottom: 4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.8,17.6l-.5-1.7h-3.2s0,2.6,0,2.6c.8.1,1.3.8,1.3,1.7h1.7c.5,0,.8.3.8.8s-.3.9-.7.9h-7.8c-.4,0-.7-.5-.7-.8s.3-.8.8-.8h1.8c0-.8.4-1.5,1.3-1.7v-2.6s-3.1,0-3.1,0c-1.1,0-2-.9-2.2-2l-1.9-11.6c0-.4.2-.7.6-.7s.7,0,1,0c1.1,0,2,.8,2.2,1.9l.9,4.8h1.7c1.1,0,1.9.8,2.2,1.8l.8,2.4h1.7c.9,0,1.6.8,1.9,1.6l.4.9.7,2c.1.3.4.6.7.6h1.2c.4,0,.8.4.8.8s-.3.8-.7.8-.9,0-1.3,0c-1,0-2-.7-2.3-1.7ZM11.2,10.5c0-.2-.4-.5-.6-.5h-1.3s.4,2.5.4,2.5h2.2s-.7-2-.7-2Z"/></svg></div>Libre';
      slot2.style.border = '2px dashed var(--line)';
      slot2.style.background = 'transparent';
      slot2.dataset.active = 'false';
    }
  }

  
  // Sincronizar estados de autorización con el backend
  function renderSecuenciaBanner(slotNum, secuencia) {
    const banner = document.getElementById('as' + slotNum + 'SecuenciaBanner');
    const items = document.getElementById('as' + slotNum + 'SecuenciaItems');
    if (!banner || !items) return;
    if (!secuencia || secuencia.length === 0) { banner.style.display = 'none'; return; }

    const ICONS = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg>', retiro_lifting: '✨', facial: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg>' };
    const LABELS = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilacion', pestanas: 'Pestanas', retiro_lifting: 'Lifting', facial: 'Facial' };

    items.innerHTML = secuencia.map((area, i) => `
      <div style="display: flex; align-items: center; gap: 4px;">
        <div style="background: #e0e7ff; border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #3730a3; display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 10px; font-weight: 800;">${i + 1}</span>
          <span>${ICONS[area] || ''}</span>
          <span>${LABELS[area] || area}</span>
        </div>
        ${i < secuencia.length - 1 ? '<span style="color:#93c5fd;font-size:14px;">→</span>' : ''}
      </div>
    `).join('');

    banner.style.display = 'block';
  }

  // Recarga servicios adicionales (pendientes + aprobados) desde el backend
  // MANDAMIENTO #3: ¿el servicio pertenece a la MISMA familia de área que la staff?
  // Si NO, el servicio (enganche) se envía a la lista de espera de la otra área.
  window.esMismaAreaM3 = function(staffArea, svcRef) {
    function fam(x) {
      x = String(x || '').toLowerCase();
      if (x.indexOf('facial') >= 0 || x.indexOf('hidra') >= 0 || x.indexOf('limpieza') >= 0) return 'facial';
      if (x.indexOf('lifting') >= 0 || x.indexOf('retiro') >= 0) return 'retiro_lifting';
      if (x.indexOf('pest') >= 0 ||
          x.indexOf('volumen') >= 0 || x.indexOf('pelo a pelo') >= 0) return 'pestanas';
      if (x.indexOf('cej') >= 0 || x.indexOf('depil') >= 0 || x.indexOf('bigote') >= 0 ||
          x.indexOf('pigment') >= 0 || x.indexOf('brow') >= 0) return 'cejas';
      return x;
    }
    return fam(staffArea) === fam(svcRef);
  };

  async function recargarAutorizacionesStaff(slotNum) {
    const user = window.currentUser;
    if (!user) return;
    const clientCode = slotNum === 1 ? window._as1Client : window._as2Client;
    if (!clientCode) return;

    // Arrancar poll de inmediato si ya hay pendientes en memoria (sin esperar al backend)
    const pollKeyImmediate = '_authPoll' + slotNum;
    const hayPendientesYa = (slotServices[slotNum] || []).some(s => s.status === 'pendiente');
    if (hayPendientesYa && !window[pollKeyImmediate]) {
      window[pollKeyImmediate] = setInterval(async () => {
        const screenId = slotNum === 1 ? 'activeService' : 'activeService2';
        const screenVisible = document.getElementById(screenId)?.classList.contains('active');
        if (!screenVisible) { clearInterval(window[pollKeyImmediate]); window[pollKeyImmediate] = null; return; }
        await recargarAutorizacionesStaff(slotNum);
        const aunPendientes = (slotServices[slotNum] || []).some(s => s.status === 'pendiente');
        if (!aunPendientes) { clearInterval(window[pollKeyImmediate]); window[pollKeyImmediate] = null; }
      }, 8000);
    }

    try {
      const authResult = await apiGet('getAutorizaciones');
      if (!authResult.success || !authResult.autorizaciones) return;

      const staffName = user.name || '';
      const myAuths = authResult.autorizaciones.filter(a =>
        a.clienteCodigo === clientCode &&
        a.staffNombre === staffName &&
        (a.estado === 'pendiente' || a.estado === 'aprobado')
      );

      if (!slotServices[slotNum]) slotServices[slotNum] = [];

      let changed = false;
      // ── MANDAMIENTO #3: detección de familia de área centralizada en esMismaAreaM3() ──
      const staffArea = user.area || 'cejas';

      for (const auth of myAuths) {
        const svcRef = auth.servicioArea || auth.servicioNombre || '';
        const esDeOtraArea = !window.esMismaAreaM3(staffArea, svcRef);

        if (auth.estado === 'aprobado' && esDeOtraArea) {
          // ── Servicio aprobado de otra área → crear ticket SN para esa área ──
          // Solo si no fue procesado ya (no existe en slotServices como 'enganche-enviado')
          const yaEnviado = slotServices[slotNum].find(s => s.authId === auth.id && s.status === 'enganche-enviado');
          if (!yaEnviado) {
            // Marcar como enviado para no procesar dos veces
            const existingEng = slotServices[slotNum].find(s => s.authId === auth.id);
            if (existingEng) {
              existingEng.status = 'enganche-enviado';
            } else {
              slotServices[slotNum].push({
                name: auth.servicioNombre, price: Number(auth.servicioPrecio||0),
                area: auth.servicioArea||'', status: 'enganche-enviado', authId: auth.id
              });
            }
            // Crear ticket SN para la otra área
            const clientCodeEng = slotNum === 1 ? window._as1Client : window._as2Client;
            const clientNameEng = slotNum === 1
              ? document.getElementById('as1Name')?.textContent?.replace(' ⭐','') || ''
              : document.getElementById('as2Name')?.textContent?.replace(' ⭐','') || '';
            apiPost('addServicioNormal', {
              codigo: clientCodeEng || auth.clienteCodigo,
              nombre: clientNameEng || auth.clienteNombre,
              servicio: auth.servicioNombre,
              area: auth.servicioArea || 'cejas',
              precio: Number(auth.servicioPrecio || 0),
              prioridad: 'Normal',
              observaciones: 'Servicio adicional solicitado por ' + staffName + ' durante atención'
            }).then(function(r) {
              if (r && r.success) {
                showToast('✅ ' + auth.servicioNombre + ' enviado a lista de espera');
              }
            }).catch(function(){});
            changed = true;
          }
          continue; // No agregar a slotServices de esta staff
        }

        // ── Servicio de la misma área → agregar/actualizar en slotServices ──
        let existing = slotServices[slotNum].find(s => s.authId === auth.id);
        if (!existing) {
          existing = slotServices[slotNum].find(s => s.name === auth.servicioNombre && !s.authId);
        }

        if (existing) {
          if (!existing.authId) { existing.authId = auth.id; changed = true; }
          if (existing.status !== auth.estado) { existing.status = auth.estado; changed = true; }
        } else if (!slotServices[slotNum].find(s => s.name === auth.servicioNombre)) {
          slotServices[slotNum].push({
            name: auth.servicioNombre,
            price: Number(auth.servicioPrecio || 0),
            area: auth.servicioArea || '',
            status: auth.estado,
            authId: auth.id,
            note: auth.nota || '',
            requestedBy: auth.staffNombre || staffName
          });
          changed = true;
        }
      }

      if (changed) {
        const totalRecalc = slotServices[slotNum].reduce((sum, s) => {
          if (s.status === 'pendiente' || s.status === 'rechazado' || s.status === 'enganche-enviado') return sum;
          return sum + Number(s.price || 0);
        }, 0);
        renderServicesForSlot(slotNum);
        document.getElementById('as' + slotNum + 'Total').textContent = '$' + totalRecalc;
        document.getElementById('as' + slotNum + 'SvcCount').textContent =
          slotServices[slotNum].filter(s => s.status !== 'rechazado').length;
        // CRÍTICO: Sincronizar al Sheet cuando cambia el estado de una autorización
        // Esto asegura que el Sheet tenga el total correcto antes de finalizar
        syncServiciosBackend(slotNum, totalRecalc);
        // Re-evaluar los botones de finalizar (la aprobación pudo cambiar el flujo)
        try { updateFinishButtons(slotNum); } catch(eUFB) {}
      }

      // Polling: si hay pendientes en slotServices (independiente de si myAuths tenia datos)
      const hayPendientes = (slotServices[slotNum] || []).some(s => s.status === 'pendiente');
      const pollKey = '_authPoll' + slotNum;

      if (hayPendientes && !window[pollKey]) {
        window[pollKey] = setInterval(async () => {
          // Detener si el staff ya no esta en la pantalla activa
          const screenId = slotNum === 1 ? 'activeService' : 'activeService2';
          const screenVisible = document.getElementById(screenId)?.classList.contains('active');
          if (!screenVisible) {
            clearInterval(window[pollKey]);
            window[pollKey] = null;
            return;
          }
          await recargarAutorizacionesStaff(slotNum);
          // Detener si ya no quedan pendientes
          const aunPendientes = (slotServices[slotNum] || []).some(s => s.status === 'pendiente');
          if (!aunPendientes) {
            clearInterval(window[pollKey]);
            window[pollKey] = null;
          }
        }, 8000);
      }

      // Si ya no hay pendientes, asegurar que el poll este detenido
      if (!hayPendientes && window[pollKey]) {
        clearInterval(window[pollKey]);
        window[pollKey] = null;
      }

    } catch (err) {
      console.error('Error recargando autorizaciones del staff:', err);
    }
  }

  // Detener polling al salir de pantallas de atención
  function detenerPollAutorizaciones() {
    if (window._authPoll1) { clearInterval(window._authPoll1); window._authPoll1 = null; }
    if (window._authPoll2) { clearInterval(window._authPoll2); window._authPoll2 = null; }
  }

  async function syncAuthorizationStates(slot) {
    const svcs = slotServices[slot] || [];
    const pendingServices = svcs.filter(s => s.status === 'pendiente');
    
    if (pendingServices.length === 0) return;

    try {
      const result = await apiGet('getAutorizaciones');

      if (result.success && result.autorizaciones) {
        const user = window.currentUser;
        const staffName = user ? user.name : '';
        const clientCode = slot === 1 ? window._as1Client : window._as2Client;

        for (const svc of pendingServices) {
          // Buscar por authId primero, luego por nombre+staff+cliente
          let authInBackend = svc.authId
            ? result.autorizaciones.find(a => a.id === svc.authId)
            : null;

          if (!authInBackend) {
            authInBackend = result.autorizaciones.find(a =>
              a.servicioNombre === svc.name &&
              a.staffNombre === staffName &&
              a.clienteCodigo === clientCode &&
              (a.estado === 'aprobado' || a.estado === 'rechazado')
            );
          }

          if (authInBackend) {
            if (!svc.authId) svc.authId = authInBackend.id;
            if (authInBackend.estado === 'aprobado') {
              svc.status = 'aprobado';
            } else if (authInBackend.estado === 'rechazado') {
              svc.status = 'rechazado';
            }
          }
        }

        // Recalcular total y re-renderizar
        const totalRecalc = svcs.reduce((sum, s) => {
          if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
          return sum + Number(s.price || 0);
        }, 0);
        renderServicesForSlot(slot);
        document.getElementById('as' + slot + 'Total').textContent = '$' + totalRecalc;
        document.getElementById('as' + slot + 'SvcCount').textContent =
          svcs.filter(s => s.status !== 'rechazado').length;
        // Sincronizar cambio de estado con backend (actualiza col F en ListaEspera)
        syncServiciosBackend(slot, totalRecalc);
      }
    } catch (err) {
      console.error('Error sincronizando autorizaciones:', err);
    }
  }
  
  async function prepararYFinalizar(slot) {
    const user = window.currentUser;
    const slotStr = String(slot || 1);
    const clientName = document.getElementById('as' + slotStr + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey  = normalizeClientKey(clientName);
    const idEspera   = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    const clientCode = slot === 1 ? (window._as1Client || '') : (window._as2Client || '');

    // Sincronizar autorizaciones primero
    await syncAuthorizationStates(slot);

    const svcs = slotServices[slot] || [];
    const hasPending = svcs.some(s => s.status === 'pendiente');
    if (hasPending) {
      alert('⏳ Hay servicios pendientes de autorización de Mikaela. Esperá antes de finalizar.');
      return;
    }

    const svcsOk = svcs.filter(s => s.status !== 'rechazado');
    let total = svcsOk.reduce((s, v) => s + Number(v.price || 0), 0);
    let svcNames = svcsOk.map(s => s.name).join(' + ');

    // Si slotServices está vacío, intentar recuperar desde el panel activo
    if (svcsOk.length === 0) {
      const totalEl = document.getElementById('as' + slotStr + 'Total');
      const totalFromPanel = totalEl ? Number((totalEl.textContent || '').replace('$','').trim()) : 0;
      const svcCountEl = document.getElementById('as' + slotStr + 'SvcCount');
      // Intentar obtener el servicio desde el backend
      try {
        const atenRes = await apiGet('getAtenciones', { chica: user?.name || '' });
        if (atenRes.success && atenRes.atenciones) {
          const aten = atenRes.atenciones.find(a => a.codigo === clientCode || a.nombre === clientName);
          if (aten) {
            svcNames = aten.servicio || aten.promoNombre || 'Servicio';
            total = Number(aten.total || totalFromPanel || 0);
            // Rellenar slotServices
            slotServices[slot] = [{ name: svcNames, price: total, area: aten.area || '' }];
          }
        }
      } catch(e) {}
      if (!svcNames) svcNames = 'Servicio';
      if (total === 0 && document.getElementById('as' + slotStr + 'Total')) {
        total = Number((document.getElementById('as' + slotStr + 'Total').textContent || '0').replace('$','')) || 0;
      }
    }

    window._finishingSlot = slot;
    window._finishingData = {
      clientKey, clientName, svcNames,
      total: String(total),
      promoNombre: '',
      precioRegular: String(total),
      idEspera, clienteCodigo: clientCode,
      areasExtras: [], promasExtraPendientes: []
    };

    try {
      await finishAndSend();
    } catch(e) {
      alert('Error al finalizar: ' + e.message);
    }
  }

  // Quita cualquier etiqueta HTML/SVG de un label para usarlo en .textContent (evita que
  // el código del icono SVG de un área se muestre como texto en los botones).
  function _soloTexto(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  window._soloTexto = _soloTexto;

  async function finishSlot1() {
    const user = window.currentUser;
    const displayName = document.getElementById('as1Name')?.textContent?.replace(' ⭐', '') || '';
    const clientKey = normalizeClientKey(displayName);
    
    // Sincronizar estados con el backend primero
    await syncAuthorizationStates(1);
    
    const svcs = slotServices[1] || [];
    const _clientCode1 = window._as1Client || '';
    
    console.log('🔍 finishSlot1:', {
      displayName,
      clientKey,
      services: svcs.length,
      activePromos: Object.keys(activePromos)
    });
    
    // Verificar si hay servicios pendientes de autorización
    const hasPending = svcs.some(s => s.status === 'pendiente');
    if (hasPending) {
      // Intentar sync una vez más antes de bloquear
      await syncAuthorizationStates(1);
      const stillPending = (slotServices[1] || []).some(s => s.status === 'pendiente');
      if (stillPending) {
        alert('No podés finalizar aún. Hay servicios pendientes de autorización de Mikaela.\n\nEsperá a que Mikaela apruebe o rechace los servicios adicionales.');
        return;
      }
    }
    
    // Calcular total solo de servicios aprobados
    const total = svcs.reduce((sum, s) => {
      if (s.status === 'rechazado') return sum;
      return sum + Number(s.price || 0);
    }, 0);
    
    const svcNames = svcs.filter(s => s.status !== 'rechazado').map(s => s.name).join(' + ') || 'Servicio';
    const promoData = activePromos[clientKey];
    
    console.log('Promo data:', promoData);
    console.log('Total:', total);
    
    // Detectar si hay servicios de areas cruzadas (ej: Laura facial agrega servicio de Cejas)
    const areaMapInv = { cejas: 'cejas', depilacion: 'depilacion', pestanas: 'pestanas', facial: 'facial' };
    const areaDisplayMap = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting/Retiro', facial: 'Facial' };
    const staffArea = user?.area || '';
    const svcsAprobados = svcs.filter(s => s.status !== 'rechazado');
    
    // Áreas de servicios aprobados que NO son del área del staff
    const areasExtras = [...new Set(
      svcsAprobados
        .map(s => {
          const a = String(s.area || '').toLowerCase();
          if (a.includes('ceja') || a.includes('depil')) return 'cejas';
          if (a.includes('lifting') || a.includes('retiro')) return 'cejas';
          if (a.includes('pesta')) return 'pestanas';
          if (a.includes('facial')) return 'facial';
          return null;
        })
        .filter(a => a && a !== staffArea)
    )];
    
    const hayAreasExtras = areasExtras.length > 0;

    // También detectar si hay múltiples servicios aprobados (aunque sean del mismo área)
    // Ej: "Depilación de cejas $8" + "Depilación de bigote $4" → la staff puede hacer ambos o solo uno
    const hayMultiplesServicios = svcsAprobados.length > 1 && !promoData;

    // Promos extra pendientes (2a, 3a promo del ticket)
    // Recuperar desde sessionStorage si _takingPromasExtra está vacío
    if (!window._takingPromasExtra || window._takingPromasExtra.length === 0) {
      const _idEsperaRec = window._as1IdEspera || '';
      if (_idEsperaRec) {
        try {
          const _stored = sessionStorage.getItem('nexserv_promasExtra_' + _idEsperaRec);
          if (_stored) window._takingPromasExtra = JSON.parse(_stored);
        } catch(eR) {}
      }
      if ((!window._takingPromasExtra || window._takingPromasExtra.length === 0) && window._listaEsperaCache) {
        const _ticket = (window._listaEsperaCache || []).find(w => w.id === _idEsperaRec);
        if (_ticket && _ticket.promasExtra && _ticket.promasExtra.length > 0) {
          window._takingPromasExtra = _ticket.promasExtra;
        }
      }
    }
    const promasExtraPendientes = (window._takingPromasExtra || []).filter(p => p && p.nombre);

    // Guardar datos en variable global para usar en las opciones
    // Si hay promo, el total es el precio de la promo + cualquier servicio extra aprobado (no de la promo)
    let totalFinal;
    let miPrecioPromo = 0;
    if (promoData) {
      // Servicios extra: aprobados que NO son la promo principal
      const extrasAprobados = svcsAprobados.filter(s => s.name !== promoData.promo.name);
      const totalExtras = extrasAprobados.reduce((sum, s) => sum + Number(s.price || 0), 0);
      // Usar el precio de la parte de ESTA staff (no el total de la promo)
      miPrecioPromo = getMyPromoPrice(promoData.promo, staffArea, promoData.completedAreas || []);
      totalFinal = String(miPrecioPromo + totalExtras);
    } else {
      totalFinal = String(total);
    }
    const miPrecioRegular = promoData
      ? (() => {
          // Precio regular proporcional: si la promo tiene división, sumar el precio regular de mi área
          // Como no tenemos precio regular por área, usamos la proporción: miPrecioPromo / promo.price * promo.regular
          const ratio = (promoData.promo.price > 0) ? (miPrecioPromo / promoData.promo.price) : 1;
          return Math.round(Number(promoData.promo.regular) * ratio);
        })()
      : total;
    const precioRegularFinal = promoData
      ? String(miPrecioRegular + (svcsAprobados.filter(s => s.name !== promoData.promo.name).reduce((sum, s) => sum + Number(s.price || 0), 0)))
      : String(total);

    window._finishingSlot = 1;
    window._finishingData = {
      clientKey: clientKey,
      clientName: displayName,
      svcNames,
      total: totalFinal,
      promoNombre: promoData ? promoData.promo.name : '',
      precioRegular: precioRegularFinal,
      areasExtras: areasExtras,
      promasExtraPendientes: promasExtraPendientes
    };

    // ── TM: botones ya inline en panel — updateFinishButtons los renderiza ──
    const _idEsp1 = window._as1IdEspera || '';
    if (_idEsp1.startsWith('TM-')) {
      updateFinishButtons(1);
      return; // los botones cambian inline, no abrir modal
    }

    // Cerrar cualquier modal abierto primero
    document.querySelectorAll('.modal-bg').forEach(m => m.classList.remove('active'));
    
    setTimeout(() => {
      document.getElementById('finishClientName').textContent = clienteDisplay(displayName, window._as1Client);
      if (promoData) {
        document.getElementById('finishPromoInfo').style.display = 'block';
        document.getElementById('finishPromoName').textContent = promoData.promo.name;
      } else {
        document.getElementById('finishPromoInfo').style.display = 'none';
      }

      // ── Lógica de visibilidad de los 7 botones ──────────────────
      const user = window.currentUser;
      const myArea = user?.area || 'cejas';
      const AREA_CAPS = {
        'cejas':    ['cejas', 'depilacion', 'bigote', 'depil', 'ceja', 'pigment', 'brow',
                     'retiro de lifting', 'lifting de pestañas', 'retiro de pestañas',
                     'retiro lifting', 'retiro_lifting',
                     'pestanas', 'pestañas', 'pest', 'lifting', 'retiro', 'volumen',
                     'pelo a pelo', 'clasicas', 'clásicas', 'efecto'],
        'pestanas': ['pestanas', 'pestañas', 'pestaña', 'lifting', 'retiro', 'volumen', 'pelo a pelo',
                     'efecto aura', 'efecto muñeca', 'clasicas', 'clásicas', 'natural'],
        'facial':   ['facial', 'hidra', 'limpieza']
      };
      const myCaps = AREA_CAPS[myArea] || [myArea];

      const puedeTodo = promoData && promoData.promo && promoData.promo.division &&
        promoData.promo.division.length > 0 &&
        promoData.promo.division.every(d => {
          // Normalizar: division.area puede tener emojis como '👁 Pestañas', '💅 Cejas'
          const rawArea = String(d.area||'');
          const dArea = rawArea.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
          const dSvc  = String(d.servicio||d.service||'').toLowerCase();
          const dRealArea = String(d.realArea||'').toLowerCase();
          return myCaps.some(cap => dArea.includes(cap) || dSvc.includes(cap) || dRealArea.includes(cap));
        });

      const tieneSecuencia = promoData || hayAreasExtras || promasExtraPendientes.length > 0 || hayMultiplesServicios;

      const esUltimaArea = promoData && promoData.completedAreas && promoData.promo.division &&
        (promoData.completedAreas.length >= promoData.promo.division.length - 1);

      // BTN 1: Yo hago toda la promo
      const b1 = document.getElementById('finishDoAllBtn');
      if (b1) b1.style.display = (puedeTodo && promoData) ? 'block' : 'none';

      // ── CASO: Múltiples servicios en el slot (sin promo, mismo área) ──
      // Ej: Depilación cejas $8 + Depilación bigote $4 → mostrar 2 botones específicos
      if (hayMultiplesServicios && !promoData) {
        const serviciosRestantes = svcsAprobados.slice(1); // el 2do, 3ro...
        const nombresRestantes = serviciosRestantes.map(s => s.name).join(' + ');

        // BTN A: "Termino yo el siguiente servicio"
        const b2 = document.getElementById('finishSendBtn');
        if (b2) {
          b2.style.display = 'block';
          b2.textContent = '✅ Ya terminé ambos servicios — cobrar';
          b2.onclick = function() { closeModal(); finishAndSend(); };
        }

        // BTN 4: "Terminé mi parte — enviar a siguiente staff"
        const b4 = document.getElementById('finishContinueBtn');
        if (b4) {
          b4.style.display = 'block';
          b4.textContent = '➡️ Terminé mi parte — enviar a siguiente staff: ' + _soloTexto(nombresRestantes);
          b4.onclick = function() { closeModal(); finishAndSendPartial(); };
        }

        // Ocultar otros botones
        const b3 = document.getElementById('finishPromoCompleteBtn');
        if (b3) b3.style.display = 'none';

        const modal = document.getElementById('finishOptionsModal');
        if (modal) { modal.querySelectorAll('.finish-extra-btn').forEach(b => b.remove()); modal.classList.add('active'); }
        return; // salir del setTimeout
      }

      // Detectar si la promo tiene siguiente área (para botón compartir)
      const promoTieneMultiArea = promoData && promoData.promo && promoData.promo.division && promoData.promo.division.length > 1;
      const siguienteAreaPromo = promoTieneMultiArea
        ? (promoData.promo.division.find(d => {
            const da = String(d.area||'').toLowerCase();
            const comp = (promoData.completedAreas || []).map(a => String(a).toLowerCase());
            return !comp.some(c => da.includes(c) || c.includes(da));
          }) || null)
        : null;
      const nombreSiguienteArea = siguienteAreaPromo
        ? (String(siguienteAreaPromo.area||'').replace(/[^\w\s]/g,'').trim() || 'siguiente área')
        : (areasExtras.length > 0 ? areasExtras.map(a => areaDisplayMap[a]||a).join(', ') : 'siguiente área');

      // BTN "Compartir siguiente servicio" — visible cuando:
      // 1. Hay promo multi-área con área pendiente
      // 2. La staff PUEDE hacer el siguiente servicio (lifting/pest incluido para cejas)
      //    pero QUIERE compartirlo con otra staff
      // Nota: lifting de pestañas lo puede hacer todo el staff de cejas Y pestañas
      const bCompartir = document.getElementById('finishShareNextBtn');
      if (bCompartir) {
        // Verificar si la staff puede hacer el siguiente servicio
        const sigAreaStr = String(siguienteAreaPromo ? siguienteAreaPromo.area : '').toLowerCase();
        const puedeSiguiente = myCaps.some(cap => sigAreaStr.replace(/[^\w\s]/gi,' ').includes(cap));
        // Mostrar si hay promo multi-área, hay área pendiente, Y la staff puede hacerla
        // (si no puede hacerla, la siguiente staff distinta lo toma automáticamente)
        const mostrarCompartir = promoData && (promoTieneMultiArea || hayAreasExtras) && !esUltimaArea
          && (puedeTodo || puedeSiguiente);
        if (mostrarCompartir) {
          bCompartir.style.display = 'block';
          bCompartir.textContent = '🤝 Compartir siguiente servicio con otra staff: ' + _soloTexto(nombreSiguienteArea);
          bCompartir.onclick = function() { closeModal(); compartirSiguienteServicio(); };
        } else {
          bCompartir.style.display = 'none';
        }
      }

      // BTN 2: Finalizar servicio (flujo normal / promo)
      const b2 = document.getElementById('finishSendBtn');
      if (b2) {
        if (promoData && tieneSecuencia && !esUltimaArea && !puedeTodo) {
          b2.style.display = 'none';
        } else {
          b2.style.display = 'block';
          b2.textContent = promoData ? '💰 Finalizar servicio (solo mi parte)' : '💰 Finalizar servicio';
          b2.onclick = function() { closeModal(); finishAndSend(); };
        }
      }

      // BTN 3: Promo completada (última área)
      const b3 = document.getElementById('finishPromoCompleteBtn');
      const esPromoCompartida = promoData && (promoData.completedAreas || []).length > 0;
      if (b3) {
        b3.style.display = (promoData && esUltimaArea && !puedeTodo) ? 'block' : 'none';
        if (esPromoCompartida && esUltimaArea) {
          b3.textContent = '&#x2705; Promo compartida completada &mdash; mandar a cobrar';
          b3.style.background = 'linear-gradient(135deg,#2d6a4f,#1a4a32)';
        } else {
          b3.textContent = '&#x1F3AF; Promo completada &mdash; cobrar';
          b3.style.background = '';
        }
      }

      // BTN 4: Continuar siguiente área / promo
      const b4 = document.getElementById('finishContinueBtn');
      if (b4) {
        if (tieneSecuencia && !esUltimaArea && !puedeTodo) {
          b4.style.display = 'block';
          const areasLabel = areasExtras.length > 0
            ? areasExtras.map(a => areaDisplayMap[a] || a).join(', ')
            : promasExtraPendientes.length > 0 ? promasExtraPendientes[0].nombre : 'siguiente área';
          b4.textContent = '➡️ Continuar siguiente área: ' + _soloTexto(areasLabel);
          b4.onclick = function() { finishAndContinue(); };
        } else {
          b4.style.display = 'none';
        }
      }

      const modal = document.getElementById('finishOptionsModal');
      if (modal) {
        modal.querySelectorAll('.finish-extra-btn').forEach(b => b.remove());
        modal.classList.add('active');
      }
    }, 100);
  }

  async function finishSlot2() {
    const user = window.currentUser;
    // Si la 2ª clienta es un ticket multi-área (TM-), usar el flujo TM correcto
    const _idEsp2 = window._as2IdEspera || '';
    if (_idEsp2.startsWith('TM-')) {
      window._finishingSlot = 2;
      await completarAreaMultiFinal();
      return;
    }
    const clientName = document.getElementById('as2Name')?.textContent?.replace(' ⭐', '') || '';
    
    // Sincronizar estados con el backend primero
    await syncAuthorizationStates(2);
    
    const svcs = slotServices[2] || [];
    
    // Verificar si hay servicios pendientes
    const hasPending = svcs.some(s => s.status === 'pendiente');
    if (hasPending) {
      alert('⏳ No podés finalizar aún. Hay servicios pendientes de autorización de Mikaela.');
      return;
    }
    
    const svcNames = svcs.filter(s => s.status !== 'rechazado').map(s => s.name).join(' + ') || 'Servicio';
    const total = svcs.reduce((sum, s) => {
      if (s.status === 'rechazado') return sum;
      return sum + Number(s.price || 0);
    }, 0);
    const promoData = activePromos[normalizeClientKey(clientName)];
    // montoComision = lo que realizó esta staff (suma de sus servicios)
    const montoComision = total;

    // Construir desglose
    const desgloseSlot2 = svcs.filter(s => s.status !== 'rechazado').map(s => ({
      staff: user?.name || '',
      servicio: s.name,
      area: s.area || '',
      monto: Number(s.price || 0)
    }));

    // Leer desglose previo del sheet si es ticket SP- (áreas anteriores ya registradas)
    let desgloseDelSheet2 = window._desgloseAcumulado || [];
    const idEspera2 = window._as2IdEspera || '';
    const esTicketSP2 = idEspera2.startsWith('SP-');
    if (esTicketSP2 && desgloseDelSheet2.length === 0) {
      try {
        const spData2 = await apiGet('getServicioPromo');
        if (spData2.success) {
          const allSP2 = [...(spData2.esperando||[]), ...(spData2.enServicio||[]), ...(spData2.porCobrar||[])];
          const miTicket2 = allSP2.find(t => t.idEspera === idEspera2);
          if (miTicket2 && miTicket2.serviciosDetalle && miTicket2.serviciosDetalle.length > 0) {
            desgloseDelSheet2 = miTicket2.serviciosDetalle;
          }
        }
      } catch(e) {}
    }
    // Acumular sin duplicar
    const desgloseAcumulado2 = [...desgloseDelSheet2];
    desgloseSlot2.forEach(nuevo => {
      const yaExiste = desgloseAcumulado2.some(ex => ex.staff === nuevo.staff && ex.servicio === nuevo.servicio);
      if (!yaExiste) desgloseAcumulado2.push(nuevo);
    });

    try {
      if (esTicketSP2) {
        await apiPost('finalizarServicioPromo', {
          idEspera: idEspera2,
          chicaNombre: user?.name || '',
          clienteNombre: clientName,
          servicio: svcNames,
          total: String(total),
          promoNombre: promoData ? promoData.promo.name : '',
          precioPromo: promoData ? String(promoData.promo.price) : '',
          precioRegular: promoData ? String(promoData.promo.regular || promoData.promo.price) : '',
          serviciosDetalle: desgloseAcumulado2
        });
      } else {
        await apiPost('finalizarAtencion', {
          idEspera: idEspera2,
          chicaNombre: user?.name || '',
          clienteNombre: clientName,
          servicio: svcNames,
          total: String(total),
          montoComision: String(montoComision),
          promoNombre: promoData ? promoData.promo.name : '',
          precioRegular: promoData ? String(promoData.promo.regular) : String(total),
          serviciosDetalle: desgloseAcumulado2
        });
      }
    } catch (err) { console.error(err); }

    window._desgloseAcumulado = [];

    if (promoData) delete activePromos[normalizeClientKey(clientName)];

    if (user && activeClients[user.name]) {
      activeClients[user.name].splice(1, 1);
      updateCapacityUI(user.name);
    }
    alert('✓ Servicio finalizado. Mikaela procederá al cobro.');
    show('staffHome');
  }

  // === RETIRO GRATIS / $10 ===

  async function loadStaffHome() {
    const user = window.currentUser;
    if (!user || user.role !== 'staff') return;
    
    // 🔧 Asegurar que PROMOS esté cargado ANTES de procesar atenciones
    await ensurePromosLoaded();

    // Restaurar promos activas persistidas (después de cargar PROMOS)
    restoreActivePromos();
    
    try {
      const result = await apiGet('getAtenciones', { chica: user.name });
      const section = document.getElementById('staffAtendiendoSection');
      const list = document.getElementById('staffAtendiendoList');
      
      if (result.success && result.atenciones && result.atenciones.length > 0) {
        section.style.display = 'block';
        
        // Actualizar activeClients para doble atención
        if (user.maxClients === 2) {
          activeClients[user.name] = result.atenciones.map(a => ({ name: a.nombre, code: a.codigo, service: a.servicio }));
          updateCapacityUI(user.name);
        }
        
        list.innerHTML = result.atenciones.map((a, idx) => {
          const initials = a.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
          const slot = idx === 0 ? 'activeService' : 'activeService2';
          return `
          <div class="card" style="margin-bottom: 8px; padding: 16px; border-left: 4px solid var(--accent); cursor: pointer;" onclick="loadActiveService(${idx}); show('${slot}');">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="client-avatar ${a.esTop ? 'is-top' : ''}" style="flex-shrink: 0;">${initials}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 16px;">${clienteDisplay(a.nombre, a.codigo)}${a.esTop ? ' <span class="top-star">⭐</span>' : ''}</div>
                <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-top: 2px;">${a.servicio} · ${a.area} · desde ${a.horaToma}</div>
              </div>
              <div style="background: var(--accent); color: white; padding: 6px 14px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700;">Ver →</div>
            </div>
          </div>`;
        }).join('');
        
        // Precargar datos en activeService
        const a1 = result.atenciones[0];
        // Guardar codigo anterior ANTES de sobreescribir para comparar
        const codigoAnterior = window._as1Client;
        const mismaClienta = codigoAnterior === a1.codigo;
        const tieneServicios = slotServices[1] && slotServices[1].length > 0;

        // CRÍTICO: actualizar _as1IdEspera con el ID real del ticket activo (puede ser SP- o LE-)
        window._as1IdEspera = a1.idEspera || window._as1IdEspera || '';
        
        window._as1Client     = a1.codigo;
        window._as1ClientName = a1.nombre || '';
        document.getElementById('as1Avatar').textContent = a1.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
        document.getElementById('as1Avatar').className = 'client-avatar' + (a1.esTop ? ' is-top' : '');
        pintarNombre('as1Name', a1.nombre, a1.codigo, a1.esTop);
        document.getElementById('as1Code').textContent = a1.codigo + (a1.horaLlegada ? ' · Llegó ' + a1.horaLlegada : '');
        document.getElementById('obs1Display').textContent = a1.obsGeneral || a1.observaciones || 'Sin observaciones';
        _setNotaRecepcion(1, a1.observaciones);
        renderSecuenciaBanner(1, a1.secuencia || []);

        // Solo resetear slotServices si cambio la clienta o si esta completamente vacia
        if (!mismaClienta || !tieneServicios) {
          slotServices[1] = [];
        }
        
        if (a1.servicio && a1.servicio !== '—') {
          const clientKey1 = normalizeClientKey(a1.nombre);

          if (a1.promoNombre && String(a1.promoNombre).trim() !== '') {
            // Con promo: calcular el precio correspondiente al area del staff
            const promoFull = PROMOS.find(p => p.name === a1.promoNombre);
            if (promoFull) {
              const myArea = user.area || 'cejas';
              const myPrice = getMyPromoPrice(promoFull, myArea);

              // Solo agregar si no existe ya
              if (!slotServices[1].find(s => s.name === a1.promoNombre || s.name === a1.servicio)) {
                slotServices[1].unshift({
                  name: a1.promoNombre,
                  price: myPrice,
                  area: myArea
                });
              }
              activePromos[clientKey1] = {
                promo: promoFull,
                startedBy: myArea,
                completedAreas: (() => {
                  try {
                    const obsText = a1.observaciones || a1.obs || a1.obsGeneral || '';
                    const match = obsText.match(/_completedAreas:(\[.*?\])/);
                    return match ? JSON.parse(match[1]) : [];
                  } catch(e) { return []; }
                })(),
                _metadata: { displayName: a1.nombre, clientCode: a1.codigo, loadedFrom: 'loadStaffHome' }
              };
              saveActivePromos(); // persistir en sessionStorage
              // Restaurar promasExtra pendientes del ticket (2a, 3a promo independiente)
              if (a1.promasExtra && a1.promasExtra.length > 0) {
                window._takingPromasExtra = a1.promasExtra;
                try { sessionStorage.setItem('nexserv_promasExtra_' + (a1.idEspera||''), JSON.stringify(a1.promasExtra)); } catch(eS) {}
              }
              // Actualizar botones de finalización con opciones de promo
              setTimeout(() => updateFinishButtons(1), 300);
            }
          } else {
            // Sin promo: precio normal del servicio
            const price = a1.total || 0;
            if (!slotServices[1].find(s => s.name === a1.servicio)) {
              slotServices[1].unshift({
                name: a1.servicio,
                price: price,
                area: a1.area
              });
            }
            // Limpiar promo residual de esta clienta (puede ser un servicio nuevo sin promo)
            if (activePromos[clientKey1]) {
              delete activePromos[clientKey1];
              saveActivePromos(); // actualizar localStorage
            }
          }
        }
        renderServicesForSlot(1);
        
        // Actualizar total: solo servicios no pendientes y no rechazados
        const total1 = slotServices[1].reduce((sum, s) => {
          if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
          return sum + Number(s.price || 0);
        }, 0);
        document.getElementById('as1Total').textContent = '$' + total1;
        document.getElementById('as1SvcCount').textContent = slotServices[1].filter(s => s.status !== 'rechazado').length;
        
        if (user.area === 'pestanas') {
          const _pk4 = a1.codigo.toLowerCase().replace(/-/g, '');
          apiGet('getFichaPestanas', { codigo: a1.codigo }).then(pr4 => {
            if (pr4.success && pr4.fichas && pr4.fichas.length > 0) {
              if (!CLIENT_PROFILES[_pk4]) CLIENT_PROFILES[_pk4] = { name: a1.nombre, code: a1.codigo, pestanas: { fichas: [], history: [] } };
              if (!CLIENT_PROFILES[_pk4].pestanas) CLIENT_PROFILES[_pk4].pestanas = { fichas: [], history: [] };
              CLIENT_PROFILES[_pk4].pestanas.fichas = pr4.fichas;
              CLIENT_PROFILES[_pk4].pestanas.ultimaVisita = pr4.ultimaVisita;
            }
            loadPestFichaQuick(_pk4, 1);
          }).catch(() => loadPestFichaQuick(_pk4, 1));
        }
      } else {
        section.style.display = 'none';
      }
      
      // Actualizar contadores
      const waitResult = await apiGet('getListaEspera');
      if (waitResult.success) {
        const allowed = AREA_FILTER[user.area] || [];
        const areaMap2 = { 'cejas': 'cejas', 'depilación': 'depilacion', 'depilacion': 'depilacion', 'pestañas': 'pestanas', 'pestanas': 'pestanas', 'facial': 'facial', 'lifting / retiro': 'retiro_lifting', 'pestañas/cejas': 'retiro_lifting' };
        // MODELO CENTRALIZADO: contar solo las asignadas a esta staff (igual que la lista)
        const myCount = waitResult.lista.filter(w => {
          const est = String(w.estado || w.status || '').toLowerCase();
          if (est === 'en servicio' || est === 'completada') return false;
          const quien = (w.asignadaA && String(w.asignadaA).trim()) || (w.tomadaPor && String(w.tomadaPor).trim()) || ''; return quien !== '' && quien === user.name;
        }).length;
        document.getElementById('navBadge').textContent = myCount;
        document.getElementById('navBadge2').textContent = myCount;
        document.getElementById('pendingStat').querySelector('.value').textContent = myCount;
      }

      // Cargar servicios completados hoy
      const servResult = await apiGet('getServiciosHoy', { chica: user.name });
      const servList = document.getElementById('staffServiciosHoy');
      if (servResult.success && servResult.servicios && servResult.servicios.length > 0) {
        const servicios = servResult.servicios;
        
        // Calcular totales del día
        const totalDia = servicios.reduce((sum, s) => sum + Number(s.comision || 0), 0);
        
        // Actualizar contador de servicios
        document.querySelector('#staffHome .stat .value').textContent = servicios.length; // stat "Hoy"
        
        // Actualizar COMM_DATA con datos del día
        COMM_DATA = {
          value: '$' + totalDia.toFixed(2),
          detail: servicios.length + ' servicios completados',
          day: '$' + totalDia.toFixed(0),
          items: servicios.map(s => '$' + Number(s.comision || 0).toFixed(2))
        };
        
        servList.innerHTML = '<div class="card" style="padding: 8px 20px;">' + servicios.map(s => {
          const initials = (window.currentUser && window.currentUser.role === 'staff') ? (String(s.codigo||'').replace(/[^0-9]/g,'').slice(-2) || '·') : s.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
          const comision = Number(s.comision || 0).toFixed(2);
          // Sanitizar servicio: si viene como JSON crudo, extraer nombre legible
          let svcDisplay = String(s.servicio || '');
          if (svcDisplay.trim().startsWith('[') || svcDisplay.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(svcDisplay);
              if (Array.isArray(parsed)) svcDisplay = parsed.map(p => p.servicio || p.area || p.name || '').filter(Boolean).join(' + ');
              else svcDisplay = parsed.servicio || parsed.nombre || parsed.name || svcDisplay;
            } catch(e) { svcDisplay = svcDisplay.substring(0, 40); }
          }
          return `
            <div class="client-row">
              <div class="client-avatar">${initials}</div>
              <div class="client-info">
                <div class="client-name">${clienteDisplay(s.nombre, s.codigo)}</div>
                <div class="client-meta">${svcDisplay} · $${s.total} · ${s.horaToma} · ${s.metodoPago}</div>
              </div>
              <div class="comm-hide" style="font-size: 13px; font-weight: 600; color: var(--success);">$${comision}</div>
            </div>`;
        }).join('') + '</div>';
      } else {
        document.querySelector('#staffHome .stat .value').textContent = '0';
        servList.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">Sin servicios completados hoy</div>';
        
        // Reset COMM_DATA
        COMM_DATA = {
          value: '$0.00',
          detail: '0 servicios completados',
          day: '$0',
          items: []
        };
      }
    } catch (err) {
      console.error('Error cargando staff home:', err);
    }
  }

  function loadActiveService(idx) {
    // Ya precargado en loadStaffHome
  }
  function setRetiro(isOurs, slot) {
    const yesBtn = document.getElementById('retiroYes' + slot);
    const noBtn = document.getElementById('retiroNo' + slot);
    const priceEl = document.getElementById('as' + slot + 'ServicePrice');
    const totalEl = document.getElementById('as' + slot + 'Total');
    
    if (isOurs) {
      yesBtn.style.background = 'var(--success)';
      yesBtn.style.color = 'white';
      yesBtn.style.borderColor = 'var(--success)';
      noBtn.style.background = 'var(--bg-card)';
      noBtn.style.color = 'var(--ink)';
      noBtn.style.borderColor = 'var(--line)';
      priceEl.textContent = '$0';
      totalEl.textContent = '$0';
    } else {
      noBtn.style.background = 'var(--warning)';
      noBtn.style.color = 'white';
      noBtn.style.borderColor = 'var(--warning)';
      yesBtn.style.background = 'var(--bg-card)';
      yesBtn.style.color = 'var(--ink)';
      yesBtn.style.borderColor = 'var(--line)';
      priceEl.textContent = '$10';
      totalEl.textContent = '$10';
    }
  }

  // === FICHA RÁPIDA DE PESTAÑAS EN ATENCIÓN ===
  function getFichaActiva(clientKey) {
    const client = CLIENT_PROFILES[clientKey];
    const fichas = client?.pestanas?.fichas;
    if (!fichas || fichas.length === 0) return null;
    return fichas.find(f => f.activa) || fichas[0];
  }

  // Abrevia el tipo de pestaña a partir del nombre del servicio. Retoque => "R. ..."
  function _abrevPestTipo(servicio) {
    if (!servicio) return '—';
    var s = String(servicio).trim();
    var ret = /retoque/i.test(s);
    s = s.replace(/retoque\s*(de\s*)?/i, '')
         .replace(/pesta(ñ|n)as?/i, '')
         .replace(/^\s*de\s+/i, '')
         .replace(/efecto\s+/i, '')
         .replace(/volumen\s+/i, '')
         .replace(/pelo a pelo\s*/i, '')
         .replace(/\s+/g, ' ')
         .trim();
    if (!s) s = 'Pestañas';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return (ret ? 'R. ' : '') + s;
  }

  // Barra "Última visita": tipo de pestaña (abreviado) · staff · fecha
  function _ultVisitaBarHTML(client) {
    var uv = client && client.pestanas ? client.pestanas.ultimaVisita : null;
    if (!uv || !uv.servicio) return '';
    var tipo = _abrevPestTipo(uv.servicio);
    var staff = uv.staff || '—';
    var fecha = uv.fecha || '—';
    return '<div style="display:flex; align-items:center; gap:10px; background: var(--bg-card); border:1.5px solid var(--line); border-radius:14px; padding:10px 12px; margin-bottom:10px;">'
      + '<div style="font-size:11px; font-weight:700; color:var(--ink-soft); white-space:nowrap;">Última visita</div>'
      + '<div style="flex:1; text-align:center; font-size:12px; font-weight:800; color:var(--top-purple);">' + tipo + '</div>'
      + '<div style="flex:1; text-align:center; font-size:12px; font-weight:600; color:var(--ink);">' + staff + '</div>'
      + '<div style="font-size:11px; font-weight:600; color:var(--ink-faint); white-space:nowrap;">' + fecha + '</div>'
      + '</div>';
  }

  function loadPestFichaQuick(clientKey, slot) {
    const el = document.getElementById('pestFichaQuick' + slot);
    const client = CLIENT_PROFILES[clientKey];
    const fichas = client?.pestanas?.fichas;
    const fichaActiva = getFichaActiva(clientKey);
    
    if (fichaActiva) {
      const otherCount = fichas ? fichas.length - 1 : 0;
      el.style.display = 'block';
      el.innerHTML = `
        <div style="background: linear-gradient(135deg, var(--top-purple) 0%, #5b21b6 100%); color: white; border-radius: 20px; padding: 16px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 600; opacity: 0.8;">👁 Ficha activa · ${client.name}</div>
            <div style="background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: var(--radius-pill); font-size: 10px; font-weight: 700;">${fichaActiva.fecha || '—'}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Modelo</div>
              <div style="font-size: 12px; font-weight: 800; margin-top: 2px;">${fichaActiva.modelo}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Diseño</div>
              <div style="font-size: 12px; font-weight: 800; margin-top: 2px;">${fichaActiva.diseno}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Tallas</div>
              <div style="font-size: 12px; font-weight: 800; margin-top: 2px;">${fichaActiva.tallas}</div>
            </div>
          </div>
          ${fichaActiva.obs ? '<div style="font-size: 11px; opacity: 0.9; font-weight: 500; line-height: 1.4; margin-bottom: 10px;">📝 ' + fichaActiva.obs + '</div>' : ''}
        </div>
        ${_ultVisitaBarHTML(client)}
        <button onclick="abrirEvidenciasPestanas('${clientKey}','${client.name}',(window.currentUser&&window.currentUser.name)||'staff')" style="width:100%;padding:14px;background:#1a1a1a;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px;"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M20 6h-2.586l-1.707-1.707A1 1 0 0 0 15 4H9a1 1 0 0 0-.707.293L6.586 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z\"/></svg>Evidencia del trabajo realizado</button>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <button onclick="alert('✅ Se mantiene la ficha actual para este servicio.')" style="flex: 1; padding: 14px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">✅ Mantener ficha</button>
          <button onclick="openNewPestFicha('${clientKey}', ${slot})" style="flex: 1; padding: 14px; background: var(--top-purple); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">✨ Nueva ficha</button>
        </div>
        ${otherCount > 0 ? '<button onclick="showPestFichaHistory(\'' + clientKey + '\', ' + slot + ')" style="width: 100%; padding: 10px; background: var(--bg-card); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--ink-soft);">📂 Ver ' + otherCount + ' ficha' + (otherCount > 1 ? 's' : '') + ' anterior' + (otherCount > 1 ? 'es' : '') + '</button>' : ''}
      `;
    } else {
      el.style.display = 'block';
      el.innerHTML = `
        <div style="background: var(--bg-card); border: 2px dashed var(--top-purple); border-radius: 20px; padding: 18px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 6px;">👁</div>
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--top-purple);">Sin ficha de pestañas</div>
          <div style="font-size: 12px; color: var(--ink-soft); margin-bottom: 12px;">Esta clienta no tiene ficha registrada</div>
          <button onclick="openNewPestFicha('${clientKey}', ${slot})" style="padding: 14px 24px; background: var(--top-purple); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">+ Crear ficha de pestañas</button>
        </div>
        <button onclick="abrirEvidenciasPestanas(\'${clientKey}\',\'${client.name}\',(window.currentUser&&window.currentUser.name)||\'staff\')" style="width:100%;padding:14px;background:#1a1a1a;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M20 6h-2.586l-1.707-1.707A1 1 0 0 0 15 4H9a1 1 0 0 0-.707.293L6.586 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z\"/></svg>Evidencia del trabajo realizado</button>
      `;
    }
  }

  function showPestFichaHistory(clientKey, slot) {
    const client = CLIENT_PROFILES[clientKey];
    const fichas = client?.pestanas?.fichas || [];
    const el = document.getElementById('pestFichaQuick' + slot);
    
    let histHtml = fichas.map((f, i) => `
      <div style="background: ${f.activa ? 'var(--top-purple-bg)' : 'var(--bg-card)'}; border: 1.5px solid ${f.activa ? '#d4b5ff' : 'var(--line)'}; border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px; ${f.activa ? '' : 'opacity: 0.8;'}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 13px; font-weight: 700; color: ${f.activa ? 'var(--top-purple)' : 'var(--ink)'};">
            ${f.activa ? '⭐ ACTIVA · ' : ''}${f.modelo} · ${f.diseno}
          </div>
          <span style="font-size: 10px; color: var(--ink-faint); font-weight: 600;">${f.fecha}</span>
        </div>
        <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500;">Tallas: ${f.tallas}</div>
        ${f.obs ? '<div style="font-size: 11px; color: var(--ink-faint); margin-top: 4px; font-weight: 500;">📝 ' + f.obs + '</div>' : ''}
        ${!f.activa ? '<button onclick="activatePestFicha(\'' + clientKey + '\', ' + i + ', ' + slot + ')" style="margin-top: 8px; padding: 8px 16px; background: var(--top-purple); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">Usar esta ficha</button>' : ''}
      </div>
    `).join('');
    
    el.innerHTML = `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-size: 13px; font-weight: 700;">📂 Historial de fichas (${fichas.length}/5)</div>
          <button onclick="loadPestFichaQuick('${clientKey}', ${slot})" style="background: none; border: none; font-size: 12px; font-weight: 700; color: var(--ink-soft); cursor: pointer;">← Volver</button>
        </div>
        ${histHtml}
      </div>
    `;
  }

  function activatePestFicha(clientKey, fichaIdx, slot) {
    const fichas = CLIENT_PROFILES[clientKey]?.pestanas?.fichas;
    if (!fichas) return;
    fichas.forEach(f => f.activa = false);
    fichas[fichaIdx].activa = true;
    loadPestFichaQuick(clientKey, slot);
    alert('✅ Ficha activada: ' + fichas[fichaIdx].modelo + ' · ' + fichas[fichaIdx].diseno);
  }

  function openNewPestFicha(clientKey, slot) {
    window._newPestClient = clientKey;
    window._newPestSlot = slot;
    document.getElementById('npfModelo').selectedIndex = 0;
    document.getElementById('npfDiseno').selectedIndex = 0;
    document.getElementById('npfTallas').value = '';
    document.getElementById('npfObs').value = '';
    document.getElementById('newPestFichaModal').classList.add('active');
  }

  function editPestanasFicha(clientKey) {
    // Abrir modal de pestañas para editar desde el perfil de clienta
    const client = CLIENT_PROFILES[clientKey];
    if (!client) return;
    
    // Obtener la ficha activa o la más reciente
    const fichas = client.pestanas?.fichas || [];
    const ficha = fichas.find(f => f.activa) || fichas[0] || null;
    
    // Pre-llenar el formulario si existe ficha
    if (ficha) {
      document.getElementById('npfModelo').value = ficha.modelo || '';
      document.getElementById('npfDiseno').value = ficha.diseno || '';
      document.getElementById('npfTallas').value = ficha.tallas || '';
      document.getElementById('npfObs').value = ficha.obs || '';
    } else {
      // Limpiar formulario para nueva ficha
      document.getElementById('npfModelo').value = '';
      document.getElementById('npfDiseno').value = '';
      document.getElementById('npfTallas').value = '';
      document.getElementById('npfObs').value = '';
    }
    
    // Guardar referencia para saveNewPestFicha
    window._newPestClient = clientKey;
    window._newPestSlot = null; // No hay slot activo, es desde perfil
    
    // Abrir modal
    document.getElementById('newPestFichaModal').classList.add('active');
  }

  async function saveNewPestFicha() {
    const clientKey = window._newPestClient;
    const slot = window._newPestSlot;
    const modelo = document.getElementById('npfModelo').value;
    const diseno = document.getElementById('npfDiseno').value;
    const tallas = document.getElementById('npfTallas').value.trim();
    const obs = document.getElementById('npfObs').value.trim();

    if (!modelo) { alert('Seleccioná el modelo'); return; }

    // Obtener código/nombre — preferir el código LIMPIO del slot, no el texto del elemento
    // (as{N}Code muestra "C-0007 · Llegó 10:52"; hay que quedarse solo con "C-0007")
    let clientCodigo = '', clientNombre = '';
    const client = CLIENT_PROFILES[clientKey];
    const slotNum = slot || 1;
    clientCodigo = (slotNum === 1 ? window._as1Client : window._as2Client)
                || (client && client.code)
                || (document.getElementById('as' + slotNum + 'Code')?.textContent || '').split('·')[0].trim();
    clientNombre = (client && client.name)
                || (document.getElementById('as' + slotNum + 'Name')?.textContent || '').replace(' ⭐','').trim();
    if (!client && clientCodigo) {
      CLIENT_PROFILES[clientKey] = {
        name: clientNombre, code: clientCodigo,
        pestanas: { fichas: [], history: [] },
        cejas: { history: [] }, depilacion: { history: [] }, facial: { history: [] }
      };
    }

    // Guardar en Google Sheets
    try {
      const btn = document.querySelector('#newPestFichaModal .btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

      const result = await apiPost('addFichaPestanas', {
        codigo: clientCodigo, nombre: clientNombre,
        modelo, diseno: diseno || '—', tallas: tallas || '—', obs
      });

      if (btn) { btn.disabled = false; btn.textContent = 'Guardar nueva ficha'; }

      if (!result || !result.success) {
        alert('Error al guardar ficha: ' + (result?.message || 'Error desconocido'));
        return;
      }
    } catch(e) {
      alert('Error de conexión al guardar ficha');
      return;
    }

    // Actualizar memoria local
    const clientLocal = CLIENT_PROFILES[clientKey];
    if (clientLocal) {
      if (!clientLocal.pestanas) clientLocal.pestanas = { fichas: [], history: [] };
      if (!clientLocal.pestanas.fichas) clientLocal.pestanas.fichas = [];
      clientLocal.pestanas.fichas.forEach(f => f.activa = false);
      if (clientLocal.pestanas.fichas.length >= 5) clientLocal.pestanas.fichas.pop();
      const today = new Date();
      clientLocal.pestanas.fichas.unshift({
        modelo, diseno: diseno || '—', tallas: tallas || '—', obs,
        fecha: today.getDate().toString().padStart(2,'0') + '/' + (today.getMonth()+1).toString().padStart(2,'0') + '/' + today.getFullYear(),
        activa: true
      });
    }

    closeModal();
    if (slot) loadPestFichaQuick(clientKey, slot);
    showToast('✅ Ficha guardada: ' + modelo + (diseno ? ' · ' + diseno : ''));
  }

  // === CEJAS EFECTO POLVO ===
  function openCejasPigmentoModal(codigo, clientName) {
    window._cpCodigo = codigo;
    window._cpNombre = clientName;
    
    // Limpiar campos
    document.getElementById('cpColor').value = '';
    document.getElementById('cpAguja').value = '';
    document.getElementById('cpTipoSesion').value = '';
    document.getElementById('cpObs').value = '';
    document.getElementById('cpRetoqueAlert').style.display = 'none';
    
    document.getElementById('newCejasPigmentoModal').classList.add('active');
  }
  
  // Mostrar alerta cuando selecciona "Nueva sesión"
  document.addEventListener('DOMContentLoaded', function() {
    const cpTipoSesion = document.getElementById('cpTipoSesion');
    if (cpTipoSesion) {
      cpTipoSesion.addEventListener('change', function() {
        const alert = document.getElementById('cpRetoqueAlert');
        alert.style.display = this.value === 'Nueva sesión' ? 'block' : 'none';
      });
    }
  });
  
  async function saveCejasPigmentoFicha() {
    const color = document.getElementById('cpColor').value.trim();
    const aguja = document.getElementById('cpAguja').value.trim();
    const tipoSesion = document.getElementById('cpTipoSesion').value;
    const obs = document.getElementById('cpObs').value.trim();
    
    if (!color) { alert('⚠️ Ingresá el color utilizado'); return; }
    if (!aguja) { alert('⚠️ Ingresá la aguja utilizada'); return; }
    if (!tipoSesion) { alert('⚠️ Seleccioná el tipo de sesión'); return; }
    
    const codigo = window._cpCodigo;
    const nombre = window._cpNombre;
    const user = window.currentUser;
    
    try {
      const result = await apiPost('addFichaCejasPigmento', {
        codigo: codigo,
        color: color,
        aguja: aguja,
        tipoSesion: tipoSesion,
        observaciones: obs,
        responsable: user?.name || ''
      });
      
      if (result.success) {
        closeModal();
        
        // Refrescar el tab si estamos en el perfil
        if (currentProfileClient && currentProfileTab === 'pigmento') {
          renderPigmentoTab(document.getElementById('profileTabContent'), codigo, nombre);
        }
        
        // Refrescar panel cejasQuick (siempre que estemos en panel de staff con cejas)
        var _cs2 = window._currentCejasSlot || 1;
        var _ce2 = document.getElementById('cejasQuick' + _cs2);
        var _cod2 = codigo || window._currentCejasClientCodigo || window._cpCodigo || '';
        var _nom2 = nombre || window._currentCejasClientNombre || window._cpNombre || '';
        var _ck2 = _cod2.toLowerCase().replace(/-/g,'');
        if (_ce2 && _cod2 && String((window.currentUser||{}).area||'').toLowerCase().includes('ceja')) {
          _ce2.innerHTML = '';
          _ce2.style.display = 'none';
          setTimeout(function(){ loadCejasQuick(_ck2, _cs2, _cod2, _nom2); }, 400);
        }
        // Refrescar tab de perfil si está abierto
        if (currentProfileClient && currentProfileTab === 'pigmento') {
          renderPigmentoTab(document.getElementById('profileTabContent'), codigo, nombre);
        }
        showToast('✅ Sesión registrada: ' + tipoSesion + (result.proxRetoque ? ' · Próx. retoque: ' + result.proxRetoque : ''));
      } else {
        alert('❌ Error al guardar: ' + (result.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Error guardando ficha pigmento:', err);
      alert('❌ Error de conexión al guardar la ficha');
    }
  }

  // === PROMO EN LLEGADA (Mikaela) ===
  // ========== MULTI-PROMO (hasta 3) ==========
  let _arrPromos = [];

  function addPromoSlot() {
    if (_arrPromos.length >= 3) { alert('Máximo 3 promos por visita'); return; }
    _arrPromos.push(null);
    renderPromoSlots();
  }

  function removePromoSlot(idx) {
    _arrPromos.splice(idx, 1);
    renderPromoSlots();
  }

  function updatePromoSlot(idx) {
    const val = document.getElementById('arrPromoSelect_' + idx).value;
    _arrPromos[idx] = val === '' ? null : PROMOS[parseInt(val)];
    renderPromoSlots();
  }

  async function renderPromoSlots() {
    await ensurePromosLoaded();
    const container = document.getElementById('arrPromoSlots');
    if (!container) return;
    const btn = document.getElementById('addPromoBtn');
    if (btn) btn.style.display = _arrPromos.length >= 3 ? 'none' : 'inline-block';
    container.innerHTML = _arrPromos.map((promo, i) => `
      <div style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%); border-radius: 16px; padding: 14px; margin-bottom: 10px; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 12px; font-weight: 700;">Promo ${i + 1}</div>
          <button onclick="removePromoSlot(${i})" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 3px 10px; border-radius: 20px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">Quitar</button>
        </div>
        <select id="arrPromoSelect_${i}" onchange="updatePromoSlot(${i})" style="width: 100%; padding: 10px; border-radius: 10px; border: none; font-family: inherit; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.95); color: var(--ink);">
          <option value="">Seleccionar promo...</option>
          ${PROMOS.filter(p => p.active).map((p, pi) => '<option value="' + pi + '"' + (promo && promo.name === p.name ? ' selected' : '') + '>' + p.name + ' - $' + p.price + '</option>').join('')}
        </select>
        ${promo ? '<div style="margin-top: 6px; font-size: 11px; opacity: 0.9;">' + (promo.services || '') + ' — $' + promo.price + '</div>' : ''}
      </div>
    `).join('');

    // ── MANDAMIENTO #8: actualizar indicador de tipo de ticket en tiempo real ──
    const _resEl = document.getElementById('m8TicketResumen');
    if (_resEl && window.clasificarTicketPromoM8) {
      const _c8 = window.clasificarTicketPromoM8();
      if (!_c8 || !_c8.tipo) {
        _resEl.style.display = 'none';
      } else {
        const _iconos = { 1: '👤', 2: '🤝', 3: '🎯' };
        const _colores = { 1: 'var(--success)', 2: 'var(--accent)', 3: 'var(--warning)' };
        _resEl.style.display = 'block';
        _resEl.style.color = _colores[_c8.tipo] || 'var(--ink-soft)';
        _resEl.textContent = (_iconos[_c8.tipo] || '') + ' ' + (window.resumenTicketPromoM8 ? window.resumenTicketPromoM8() : _c8.nombre);
      }
    }
  }

  // Compatibilidad con _arrPromo (codigo existente)
  Object.defineProperty(window, '_arrPromo', {
    get() { return _arrPromos.find(p => p !== null) || null; },
    set(v) { if (v === null) { _arrPromos = []; renderPromoSlots(); } else { _arrPromos[0] = v; renderPromoSlots(); } },
    configurable: true
  });

  // ========== SECUENCIA DE SERVICIOS ==========
  // NOTA: se usa window._secuencia para que getAreaPrioritaria() (mandamientos) pueda leerla.
  window._secuencia = []; // [{area, label}]

  const AREA_LABELS_SEC = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilacion', pestanas: 'Pestanas', retiro_lifting: 'Lifting/Retiro', facial: 'Facial' };
  const AREA_ICONS_SEC = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg>', retiro_lifting: '✨', facial: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg>' };

  function addAreaSecuencia(area) {
    window._secuencia.push({ area, label: AREA_LABELS_SEC[area] || area });
    renderSecuencia();
  }

  function removeSecuenciaItem(idx) {
    window._secuencia.splice(idx, 1);
    renderSecuencia();
  }

  function moveSecuencia(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= window._secuencia.length) return;
    [window._secuencia[idx], window._secuencia[newIdx]] = [window._secuencia[newIdx], window._secuencia[idx]];
    renderSecuencia();
  }

  function renderSecuencia() {
    // Usar el contenedor del formulario ACTIVO (promo o multi)
    const tipoActivo = window._arrTipo || 'normal';
    let list, empty;
    if (tipoActivo === 'multi') {
      list  = document.getElementById('secuenciaListMulti');
      empty = document.getElementById('secuenciaEmptyMulti');
    } else {
      // Promo normal o normal — usar secuenciaList
      list  = document.getElementById('secuenciaList');
      empty = document.getElementById('secuenciaEmpty');
    }
    if (!list) {
      // Fallback: cualquier visible
      list  = document.getElementById('secuenciaListMulti') || document.getElementById('secuenciaList');
      empty = document.getElementById('secuenciaEmptyMulti') || document.getElementById('secuenciaEmpty');
    }
    if (!list) return;
    if (window._secuencia.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = window._secuencia.map((s, i) => `
      <div style="background: var(--bg-card); border: 1.5px solid var(--line); border-radius: 14px; padding: 10px 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
        <div style="background: var(--accent); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${i + 1}</div>
        <div style="font-size: 16px;">${AREA_ICONS_SEC[s.area] || ''}</div>
        <div style="flex: 1; font-size: 14px; font-weight: 700;">${s.label}</div>
        <div style="display: flex; gap: 4px; flex-shrink: 0;">
          ${i > 0 ? `<button onclick="moveSecuencia(${i},-1)" style="width:30px;height:30px;border-radius:50%;border:1.5px solid var(--line);background:var(--bg);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">↑</button>` : '<div style="width:30px"></div>'}
          ${i < window._secuencia.length - 1 ? `<button onclick="moveSecuencia(${i},1)" style="width:30px;height:30px;border-radius:50%;border:1.5px solid var(--line);background:var(--bg);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">↓</button>` : '<div style="width:30px"></div>'}
          <button onclick="removeSecuenciaItem(${i})" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--danger-bg);color:var(--danger);font-size:14px;cursor:pointer;font-weight:700;">✕</button>
        </div>
      </div>
    `).join('');
  }

  function resetArrivalExtras() {
    _arrPromos = [];
    window._secuencia = [];
    renderSecuencia();
    const slots = document.getElementById('arrPromoSlots');
    if (slots) slots.innerHTML = '';
    const btn = document.getElementById('addPromoBtn');
    if (btn) btn.style.display = 'inline-block';
    const empty = document.getElementById('secuenciaEmpty');
    if (empty) empty.style.display = 'block';
    const emptyMulti = document.getElementById('secuenciaEmptyMulti');
    if (emptyMulti) emptyMulti.style.display = 'block';
    const listMulti = document.getElementById('secuenciaListMulti');
    if (listMulti) listMulti.innerHTML = '';
  }

  async function openResumenSemana() {
    document.getElementById('resumenSemanaModal').classList.add('active');
    const container = document.getElementById('resumenSemanaContent');
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);">Cargando...</div>';
    const user = window.currentUser;
    if (!user) return;
    try {
      const result = await apiGet('getServiciosSemana', { chica: user.name });
      if (!result.success || !result.dias || result.dias.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);">Sin servicios esta semana</div>';
        return;
      }
      const totalSemana = result.dias.reduce(function(s, d) { return s + d.total; }, 0);
      container.innerHTML =
        '<div style="background:var(--chip);border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">' +
          '<div style="font-size:13px;font-weight:700;color:var(--ink-soft);">Total semana</div>' +
          '<div style="font-size:22px;font-weight:800;color:var(--success);">$' + totalSemana.toFixed(2) + '</div>' +
        '</div>' +
        result.dias.map(function(dia, idx) {
          return '<div style="margin-bottom:8px;">' +
            '<div onclick="toggleDiaSemana(' + idx + ')" style="background:var(--bg-card);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
              '<div style="font-size:15px;font-weight:700;">' + dia.dia + '</div>' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<div style="font-size:17px;font-weight:800;color:var(--success);">$' + dia.total.toFixed(1) + '</div>' +
                '<div id="arrow-sem-' + idx + '" style="color:var(--ink-faint);font-size:12px;transition:transform 0.2s;">▼</div>' +
              '</div>' +
            '</div>' +
            '<div id="dia-detail-' + idx + '" style="display:none;background:var(--bg-card);border-radius:0 0 14px 14px;margin-top:-8px;padding:8px 16px 14px;border-top:1px solid var(--line);">' +
              dia.servicios.map(function(s, si) {
                return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;' + (si < dia.servicios.length - 1 ? 'border-bottom:1px solid var(--line);' : '') + '">' +
                  '<div style="flex:1;">' +
                    '<div style="font-size:13px;font-weight:700;">' + clienteDisplay(s.cliente, s.codigo) + '</div>' +
                    '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">' + s.fecha + ' · ' + s.hora + ' · ' + (s.metodoPago || 'Efectivo') + '</div>' +
                    '<div style="font-size:11px;color:var(--ink-faint);margin-top:1px;">' + s.servicio + '</div>' +
                  '</div>' +
                  '<div style="font-size:15px;font-weight:800;color:var(--success);margin-left:12px;">$' + Number(s.comision || 0).toFixed(2) + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('');
    } catch (err) {
      container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger);">Error cargando datos</div>';
    }
  }

  function toggleDiaSemana(idx) {
    const detail = document.getElementById('dia-detail-' + idx);
    const arrow = document.getElementById('arrow-sem-' + idx);
    if (!detail) return;
    const isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  }

  async function toggleArrivalPromo(show) {
    if (show) addPromoSlot();
  }

  function updateArrivalPromo() {}

  // === LLEGADA: CLIENTA EXISTENTE ===

  // === ASIGNAR SERVICIOS/PROMOS (Mikaela) ===
  
  function openAssignServiceModal(clientCode, clientName, extraTicketId) {
    window._extraTicketId = extraTicketId || null;
    window._assigningClient = { code: clientCode, name: clientName };
    document.getElementById('assignSvcClientName').textContent = clientName;
    document.getElementById('assignSvcArea').value = '';
    document.getElementById('assignSvcService').innerHTML = '<option value="">Primero seleccioná el área</option>';
    var _svcNota = document.getElementById('assignSvcNota'); if (_svcNota) _svcNota.value = '';
    document.getElementById('assignSvcPriceDisplay').style.display = 'none';
    document.getElementById('assignServiceModal').classList.add('active');
  }
  
  function openAssignServiceFromArrival() {
    // Usar datos de newArrivalData
    if (!window.newArrivalData || !window.newArrivalData.code || !window.newArrivalData.fullName) {
      alert('Error: No se encontró información de la clienta');
      return;
    }
    
    openAssignServiceModal(window.newArrivalData.code, window.newArrivalData.fullName);
  }
  
  function loadAssignServiceCatalog() {
    const area = document.getElementById('assignSvcArea').value;
    const sel = document.getElementById('assignSvcService');
    sel.innerHTML = '<option value="">Seleccionar servicio...</option>';
    document.getElementById('assignSvcPriceDisplay').style.display = 'none';
    const staffSel = document.getElementById('assignSvcStaff');
    if (staffSel) staffSel.innerHTML = opcionesStaff(area);
    
    if (!area) return;
    
    const catMap = { cejas: 'cejas', depilacion: 'depilacion', pestanas: 'pestanas', retiro_lifting: 'cejas', facial: 'facial' };
    const catKey = catMap[area] || area;
    const services = CATALOGO[catKey] || [];
    
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ name: s.name, price: s.price, area: area });
      opt.textContent = s.name + ' — $' + s.price;
      sel.appendChild(opt);
    });
  }
  
  function updateAssignServicePrice() {
    const val = document.getElementById('assignSvcService').value;
    if (!val) { 
      document.getElementById('assignSvcPriceDisplay').style.display = 'none'; 
      return; 
    }
    const svc = JSON.parse(val);
    document.getElementById('assignSvcPrice').textContent = '$' + svc.price;
    document.getElementById('assignSvcPriceDisplay').style.display = 'block';
  }
  
  async function confirmAssignService() {
    const val = document.getElementById('assignSvcService').value;
    if (!val) { 
      alert('Seleccioná un servicio'); 
      return; 
    }
    
    const svc = JSON.parse(val);
    const client = window._assigningClient;
    const chica = (document.getElementById('assignSvcStaff') || {}).value || '';
    if (!chica) { alert('Elegí qué staff la atiende'); return; }

    console.log('[ServicioExtra] modo extra:', !!window._extraTicketId, '| ticket:', window._extraTicketId || '(ninguno)');
    // ── Modo "+ Servicio Extra": agregar al ticket existente y reabrir a la lista ──
    if (window._extraTicketId) {
      const idEx = window._extraTicketId;
      try {
        const rEx = await apiPost('agregarServicioExtra', {
          idEspera: idEx, area: svc.area, servicio: svc.name, precio: svc.price, chica: chica
        });
        window._extraTicketId = null;
        if (rEx && rEx.success) {
          if (typeof showToast === 'function') showToast('✓ Servicio extra agregado para ' + (client ? client.name : 'la clienta'));
          closeModal();
          loadMikaelaHome();
        } else {
          alert(((rEx && (rEx.message || rEx.error)) || 'No se pudo agregar el servicio extra'));
        }
      } catch (err) {
        window._extraTicketId = null;
        console.error(err);
        alert('Error al agregar servicio extra');
      }
      return;
    }

    try {
      const result = await apiPost('asignarServicioNormal', {
        codigo: client.code,
        servicio: svc.name,
        area: svc.area,
        precio: svc.price,
        chica: chica,
        observaciones: (document.getElementById('assignSvcNota') || {}).value || ''
      });
      
      if (result.success) {
        alert('✓ ' + client.name + ' asignada a ' + chica);
        closeModal();
        loadMikaelaHome();
      } else {
        alert('Error: ' + (result.message || 'No se pudo asignar'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al asignar servicio');
    }
  }
  
  // Pasar del modal de servicio al de promo (reusa el flujo de promo que YA existe).
  // Así Mikaela asigna la promo directo, sin el workaround de mandar normal para que
  // la staff la cambie (que era la raíz del lío de precios en combos).
  function switchToAssignPromo() {
    var c = window._assigningClient;
    if (!c || !c.code) { alert('No se encontró la clienta'); return; }
    // Si venía en modo "+ servicio extra", llevamos el id del ticket original al
    // modal de promo para que la promo se cree como su PROPIO ticket (SP- aparte),
    // sin tocar el servicio ya completado. Si no era extra, ticket = null (flujo normal).
    var ticket = window._extraTicketId || null;
    window._extraTicketId = null;
    closeModal();
    openAssignPromoModal(c.code, c.name, ticket);
  }
  window.switchToAssignPromo = switchToAssignPromo;

  async function openAssignPromoModal(clientCode, clientName, extraTicketId) {
    // extraTicketId sólo llega desde "+ Servicio Extra" → modo promo-extra (ticket aparte).
    // Los botones "Redirigir promo" / "🏷 Promo" de la cola llaman sin él → modo normal.
    window._extraPromoTicketId = extraTicketId || null;
    window._assigningClient = { code: clientCode, name: clientName };
    document.getElementById('assignPromoClientName').textContent = clientName;
    const pStaff = document.getElementById('assignPromoStaff');
    if (pStaff) pStaff.innerHTML = opcionesStaff(null); // todas las staff (la promo puede arrancar en cualquier área)

    const list = document.getElementById('assignPromoList');
    // Mostrar el modal de una vez, con placeholder mientras cargan las promos.
    if (list) list.innerHTML = '<div style="text-align:center;color:var(--ink-faint);padding:16px;font-size:13px;">Cargando promos…</div>';
    var _promoNota = document.getElementById('assignPromoNota'); if (_promoNota) _promoNota.value = '';
    document.getElementById('assignPromoModal').classList.add('active');

    // Asegurar que PROMOS esté cargado: en sesión nueva viene vacío y la lista salía en blanco.
    await ensurePromosLoaded();

    // Renderizar lista de promos activas
    const active = PROMOS.filter(p => p.active);
    if (!list) return;
    if (active.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--ink-faint);padding:16px;font-size:13px;">No hay promos activas. Activá alguna en la pantalla de Promociones.</div>';
      return;
    }
    list.innerHTML = active.map((p, i) => `
      <div style="background: var(--bg-card); border-radius: 20px; padding: 16px; margin-bottom: 10px; box-shadow: var(--shadow-card); cursor: pointer;" onclick="confirmAssignPromo(${i})">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 15px; margin-bottom: 3px;">${p.name}</div>
            <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-bottom: 6px;">${p.services}</div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${p.division.map(d => '<span style="background: var(--bg); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-pill); color: var(--ink-soft);">' + d.area + ' $' + d.monto + '</span>').join('')}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0; margin-left: 10px;">
            <div style="font-size: 22px; font-weight: 800; color: var(--accent-deep);">$${p.price}</div>
            <div style="font-size: 11px; color: var(--ink-faint); text-decoration: line-through;">$${p.regular}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  async function confirmAssignPromo(promoIdx) {
    const promo = PROMOS[promoIdx];
    const client = window._assigningClient;
    const chica = (document.getElementById('assignPromoStaff') || {}).value || '';
    if (!chica) { alert('Elegí qué staff arranca la promo'); return; }

    // ── Modo "+ Servicio Extra" cuando el extra ES una promo → ticket SP- APARTE ──
    if (window._extraPromoTicketId) {
      const idEx = window._extraPromoTicketId;
      const firstDiv = (promo.division && promo.division[0]) ? promo.division[0] : null;
      try {
        const rEx = await apiPost('agregarPromoExtra', {
          idEspera: idEx,
          promoNombre: promo.name,
          precioPromo: promo.price,
          precioRegular: promo.regular,
          area: firstDiv ? firstDiv.area : '',
          precioMiArea: firstDiv ? firstDiv.monto : promo.price,
          chica: chica,
          observaciones: (document.getElementById('assignPromoNota') || {}).value || ''
        });
        window._extraPromoTicketId = null;
        if (rEx && rEx.success) {
          const msg = '✓ Promo extra "' + promo.name + '" agregada como ticket aparte → ' + chica;
          if (typeof showToast === 'function') showToast(msg); else alert(msg);
          closeModal();
          loadMikaelaHome();
        } else {
          alert('Error: ' + ((rEx && (rEx.message || rEx.error)) || 'No se pudo agregar la promo extra'));
        }
      } catch (err) {
        window._extraPromoTicketId = null;
        console.error(err);
        alert('Error al agregar la promo extra');
      }
      return;
    }

    try {
      const result = await apiPost('asignarPromo', {
        codigo: client.code,
        promoNombre: promo.name,
        precioPromo: promo.price,
        precioRegular: promo.regular,
        chica: chica,
        observaciones: (document.getElementById('assignPromoNota') || {}).value || ''
      });
      
      if (result.success) {
        alert('✓ Promo "' + promo.name + '" asignada a ' + chica);
        closeModal();
        loadMikaelaHome();
      } else {
        alert('Error: ' + (result.message || 'No se pudo asignar'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al asignar promo');
    }
  }

  // === POR COBRAR (Mikaela) ===

  // ── PRELISTA DE ESPERA (citas agendadas por SYNA) ──────────────────────────
  // ===================== AGENDAR CITA (modal en cascada) =====================
  function _acEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  window._acState = { tipo:'existente', codigo:'', nombre:'', servicios:[] };
  const _AC_AREAS = [
    { key:'cejas', label:'Cejas' },
    { key:'pestanas', label:'Pestañas' },
    { key:'facial', label:'Facial' },
    { key:'depilacion', label:'Depilación' },
    { key:'retiro_lifting', label:'Permanentes / Lifting' },
    { key:'promos', label:'Promociones' }
  ];

  async function openAgendarCita(){
    window._acState = { tipo:'existente', codigo:'', nombre:'', servicios:[{ area:'', servicio:'', precio:0, promoNombre:'', precioPromo:0, precioRegular:0 }] };
    try { if (typeof ensureCatalogoLoaded === 'function') await ensureCatalogoLoaded(); } catch(e){}
    try { if (typeof ensurePromosLoaded === 'function') await ensurePromosLoaded(); } catch(e){}
    acSetTipo('existente');
    ['acBuscar','acNuevoNombre','acNuevoTel','acFecha','acHora'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('acResultados').innerHTML='';
    document.getElementById('acSeleccionada').style.display='none';
    acRenderServicios();
    document.getElementById('agendarCitaModal').classList.add('active');
  }

  function acSetTipo(t){
    window._acState.tipo = t;
    document.getElementById('acExistente').style.display = (t==='existente') ? 'block' : 'none';
    document.getElementById('acNueva').style.display     = (t==='nueva')     ? 'block' : 'none';
    var tabE=document.getElementById('acTabExist'), tabN=document.getElementById('acTabNueva');
    tabE.style.background = (t==='existente') ? 'var(--accent-deep)' : 'var(--bg-soft, #efeae3)';
    tabE.style.color      = (t==='existente') ? '#fff' : 'var(--ink)';
    tabN.style.background = (t==='nueva') ? 'var(--accent-deep)' : 'var(--bg-soft, #efeae3)';
    tabN.style.color      = (t==='nueva') ? '#fff' : 'var(--ink)';
  }

  async function _acEnsureClientas(){
    if (window._acClientas && window._acClientas.length) return;
    try { const r = await apiGet('getClientas'); window._acClientas = (r && r.clientas) ? r.clientas : []; }
    catch(e){ window._acClientas = []; }
  }
  async function acBuscarCliente(q){
    const cont = document.getElementById('acResultados');
    q = String(q||'').trim().toLowerCase();
    if (q.length < 2){ cont.innerHTML=''; return; }
    await _acEnsureClientas();
    const res = (window._acClientas||[]).filter(function(c){
      return String(c.nombre||'').toLowerCase().includes(q)
          || String(c.codigo||'').toLowerCase().includes(q)
          || String(c.telefono||'').toLowerCase().includes(q);
    }).slice(0,8);
    if (!res.length){ cont.innerHTML='<div style="padding:10px;color:var(--ink-faint);font-size:12px;">Sin resultados</div>'; return; }
    cont.innerHTML = res.map(function(c){
      const cod=_acEsc(c.codigo), nom=_acEsc(c.nombre);
      return '<div onclick="acSelectCliente(\''+cod+'\')" style="padding:10px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;">'+nom+' <span style="color:var(--ink-faint);">· '+cod+'</span></div>';
    }).join('');
  }
  function acSelectCliente(cod){
    const c=(window._acClientas||[]).find(function(x){ return String(x.codigo)===String(cod); });
    const nom=c ? String(c.nombre||'') : '';
    window._acState.tipo='existente'; window._acState.codigo=cod; window._acState.nombre=nom;
    document.getElementById('acResultados').innerHTML='';
    document.getElementById('acBuscar').value='';
    var sel=document.getElementById('acSeleccionada');
    sel.style.display='block';
    sel.innerHTML='✓ <b>'+_acEsc(nom)+'</b> · '+_acEsc(cod)+' <span onclick="acClearCliente()" style="color:var(--danger);cursor:pointer;margin-left:8px;font-weight:700;">cambiar</span>';
  }
  function acClearCliente(){ window._acState.codigo=''; window._acState.nombre=''; document.getElementById('acSeleccionada').style.display='none'; }

  function acRenderServicios(){
    const cont = document.getElementById('acServicios');
    cont.innerHTML='';
    window._acState.servicios.forEach(function(s, i){
      const wrap=document.createElement('div');
      wrap.style.cssText='border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:8px;';
      const h=document.createElement('div');
      h.style.cssText='font-size:11px;font-weight:800;color:var(--ink-soft);margin-bottom:6px;display:flex;justify-content:space-between;';
      h.innerHTML='<span>SERVICIO '+(i+1)+'</span>'+(window._acState.servicios.length>1?'<span data-rm="'+i+'" style="color:var(--danger);cursor:pointer;">✕ quitar</span>':'');
      wrap.appendChild(h);
      const selA=document.createElement('select');
      selA.style.cssText='width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;margin-bottom:8px;background:var(--bg-card);color:var(--ink);';
      selA.innerHTML='<option value="">Área…</option>'+_AC_AREAS.map(function(a){ return '<option value="'+a.key+'"'+(s.area===a.key?' selected':'')+'>'+a.label+'</option>'; }).join('');
      selA.addEventListener('change', function(){ acOnAreaChange(i, this.value); });
      wrap.appendChild(selA);
      const selS=document.createElement('select');
      selS.id='acSrvSel_'+i;
      selS.style.cssText='width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;background:var(--bg-card);color:var(--ink);';
      selS.addEventListener('change', function(){ acOnServicioChange(i, this); });
      wrap.appendChild(selS);
      cont.appendChild(wrap);
      acFillServicios(i, s.area, s);
    });
    cont.querySelectorAll('[data-rm]').forEach(function(el){ el.addEventListener('click', function(){ acRemoveServicio(parseInt(this.getAttribute('data-rm'),10)); }); });
    const addBtn=document.getElementById('acAddBtn');
    addBtn.textContent='+ Agregar servicio ('+window._acState.servicios.length+'/5)';
    addBtn.style.display = window._acState.servicios.length>=5 ? 'none' : 'block';
    acRenderPreview();
  }
  function acFillServicios(i, area, s){
    const sel=document.getElementById('acSrvSel_'+i);
    if(!sel) return;
    if(!area){ sel.innerHTML='<option value="">Elegí el área primero</option>'; sel.disabled=true; return; }
    sel.disabled=false;
    if(area==='promos'){
      const proms=((typeof PROMOS!=='undefined')?PROMOS:[]).filter(function(p){ return p.active!==false; });
      sel._proms=proms;
      sel.innerHTML='<option value="">Promo…</option>'+proms.map(function(p,idx){ return '<option value="promo:'+idx+'"'+((s.promoNombre&&s.promoNombre===p.name)?' selected':'')+'>'+_acEsc(p.name)+' — $'+p.price+'</option>'; }).join('');
    } else {
      const lista=((typeof CATALOGO!=='undefined')&&CATALOGO[area])?CATALOGO[area]:[];
      sel._lista=lista;
      sel.innerHTML='<option value="">Servicio…</option>'+lista.map(function(svc,idx){ return '<option value="srv:'+idx+'"'+((s.servicio&&s.servicio===svc.name&&!s.promoNombre)?' selected':'')+'>'+_acEsc(svc.name)+' — $'+svc.price+'</option>'; }).join('');
    }
  }
  function acOnAreaChange(i, area){
    const s=window._acState.servicios[i];
    s.area=area; s.servicio=''; s.precio=0; s.promoNombre=''; s.precioPromo=0; s.precioRegular=0;
    acFillServicios(i, area, s);
    acRenderPreview();
  }
  function acOnServicioChange(i, sel){
    const s=window._acState.servicios[i];
    const v=sel.value;
    if(!v){ s.servicio=''; s.precio=0; s.promoNombre=''; s.precioPromo=0; s.precioRegular=0; acRenderPreview(); return; }
    if(v.indexOf('promo:')===0){
      const p=(sel._proms||[])[parseInt(v.split(':')[1],10)];
      if(p){ s.servicio=p.services||p.name; s.precio=p.price; s.promoNombre=p.name; s.precioPromo=p.price; s.precioRegular=p.regular||p.price; }
    } else {
      const svc=(sel._lista||[])[parseInt(v.split(':')[1],10)];
      if(svc){ s.servicio=svc.name; s.precio=svc.price; s.promoNombre=''; s.precioPromo=0; s.precioRegular=0; }
    }
    acRenderPreview();
  }
  function acAddServicio(){
    if(window._acState.servicios.length>=5) return;
    window._acState.servicios.push({ area:'', servicio:'', precio:0, promoNombre:'', precioPromo:0, precioRegular:0 });
    acRenderServicios();
  }
  function acRemoveServicio(i){
    window._acState.servicios.splice(i,1);
    if(!window._acState.servicios.length) window._acState.servicios.push({ area:'', servicio:'', precio:0, promoNombre:'', precioPromo:0, precioRegular:0 });
    acRenderServicios();
  }
  function acRenderPreview(){
    const cont=document.getElementById('acPreview');
    const items=window._acState.servicios.filter(function(s){ return s.servicio; });
    if(!items.length){ cont.innerHTML=''; return; }
    let total=0; const promosVistos={};
    items.forEach(function(s){
      if(s.promoNombre){ if(!promosVistos[s.promoNombre]){ promosVistos[s.promoNombre]=true; total+=Number(s.precioPromo)||0; } }
      else total+=Number(s.precio)||0;
    });
    cont.innerHTML='<div style="margin-top:12px;padding:12px;background:var(--bg-soft,#f6f2ec);border-radius:12px;">'
      +'<div style="font-size:11px;font-weight:800;color:var(--ink-soft);margin-bottom:8px;">PREVISUALIZACIÓN</div>'
      +items.map(function(s){ return '<div style="font-size:13px;display:flex;justify-content:space-between;margin-bottom:3px;"><span>'+_acEsc(s.servicio)+(s.promoNombre?' <span style="color:var(--accent-deep);font-weight:700;">(promo)</span>':'')+'</span><span>$'+(s.promoNombre?s.precioPromo:s.precio)+'</span></div>'; }).join('')
      +'<div style="font-size:14px;font-weight:800;display:flex;justify-content:space-between;margin-top:6px;border-top:1px solid var(--line);padding-top:6px;"><span>Total</span><span>$'+total+'</span></div>'
      +'</div>';
  }

  async function acConfirmar(){
    const st=window._acState;
    let codigo=st.codigo, nombre=st.nombre;
    if(st.tipo==='nueva'){
      nombre=document.getElementById('acNuevoNombre').value.trim();
      const tel=document.getElementById('acNuevoTel').value.trim();
      if(!nombre){ alert('Poné el nombre de la clienta.'); return; }
      try{
        const rc=await apiPost('addClienta', { nombre:nombre, telefono:tel });
        if(rc && rc.success && rc.codigo){ codigo=rc.codigo; window._acClientas=null; }
        else { alert('No se pudo crear la clienta: '+((rc&&rc.message)||'intentá de nuevo.')); return; }
      }catch(e){ console.error(e); alert('Error creando la clienta.'); return; }
    } else if(!codigo){ alert('Elegí una clienta.'); return; }

    const items=st.servicios.filter(function(s){ return s.servicio; });
    if(!items.length){ alert('Agregá al menos un servicio.'); return; }

    const fecha=document.getElementById('acFecha').value;
    const hora=document.getElementById('acHora').value;
    const areas=[]; const nombres=[]; let total=0;
    let promoNombre='', precioPromo=0, precioRegular=0; const promosVistos={};
    items.forEach(function(s){
      if(s.area && s.area!=='promos' && areas.indexOf(s.area)<0) areas.push(s.area);
      nombres.push(s.servicio);
      if(s.promoNombre){
        if(!promosVistos[s.promoNombre]){ promosVistos[s.promoNombre]=true; total+=Number(s.precioPromo)||0;
          if(!promoNombre){ promoNombre=s.promoNombre; precioPromo=s.precioPromo; precioRegular=s.precioRegular; } }
      } else total+=Number(s.precio)||0;
    });
    const payload={
      codigo:codigo, nombre:nombre,
      servicio:nombres.join(' + '),
      area:areas[0]||(items[0]&&items[0].area)||'',
      total:total, origen:'Mikaela',
      horaAgendada:hora||'',
      observaciones: fecha ? ('Fecha ' + fecha) : ''
    };
    if(promoNombre){ payload.promoNombre=promoNombre; payload.precioPromo=precioPromo; payload.precioRegular=precioRegular; }
    if(areas.length>1){ payload.secuencia=areas; }

    try{
      const r=await apiPost('crearTicketSyna', payload);
      if(r && r.success){
        if(typeof showToast==='function') showToast('📅 Cita agendada para '+nombre);
        closeModal();
        if(typeof loadPrelista==='function') loadPrelista();
      } else alert('No se pudo agendar: '+((r&&(r.message||r.error))||'intentá de nuevo.'));
    }catch(e){ console.error(e); alert('Error de conexión.'); }
  }
  window.openAgendarCita=openAgendarCita; window.acSetTipo=acSetTipo; window.acBuscarCliente=acBuscarCliente;
  window.acSelectCliente=acSelectCliente; window.acClearCliente=acClearCliente; window.acAddServicio=acAddServicio; window.acConfirmar=acConfirmar;

  // ===== Validador de Prelista: detectar área y permitir reasignar =====
  window._prelistaSel = window._prelistaSel || {};
  const AREAS_PRELISTA = [['cejas','Cejas'],['pestañas','Pestañas'],['facial','Facial'],['depilacion','Depilación']];
  function _prelistaAreaKey(area) {
    const n = String(area || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('ceja') || n.includes('pigment')) return 'cejas';
    if (n.includes('lifting') || n.includes('retiro')) return 'cejas';
    if (n.includes('pesta') || n.includes('volumen')) return 'pestañas';
    if (n.includes('facial')) return 'facial';
    if (n.includes('depil')) return 'depilacion';
    return '';
  }
  function selPrelistaArea(citaId, key, btn) {
    window._prelistaSel[citaId] = key;
    const cont = btn.parentElement;
    [...cont.querySelectorAll('button[data-k]')].forEach(function (b) {
      const on = b.dataset.k === key;
      b.style.background = on ? 'var(--accent)' : 'var(--bg)';
      b.style.color = on ? '#fff' : 'var(--ink)';
      b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
    });
    // refrescar el cartelito de validación de esa tarjeta
    const badge = document.getElementById('prelistaBadge_' + citaId);
    if (badge) {
      badge.innerHTML = '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:var(--success);">'
        + '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Área lista</span>';
    }
  }
  window.selPrelistaArea = selPrelistaArea;

  async function loadPrelista() {
    const section = document.getElementById('prelistaSection');
    const list    = document.getElementById('mkPrelistaList');
    const countEl = document.getElementById('mkPrelistaCount');
    if (!section || !list) return;
    try {
      const r = await apiGet('getPrelista');
      const arr = (r && r.success && r.prelista) ? r.prelista : [];
      if (countEl) countEl.textContent = arr.length;
      if (arr.length === 0) { section.style.display = 'none'; list.innerHTML = ''; return; }
      section.style.display = 'block';
      list.innerHTML = arr.map(c => {
        const ini = String(c.nombre || '?').split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();
        const citaTxt = c.horaCita ? ('Cita ' + c.horaCita) : 'Cita agendada';
        const servTxt = [c.servicio, c.promoNombre].filter(Boolean).join(' · ') || (c.servicio || 'Servicio por definir');
        const nombreSafe = String(c.nombre || '').replace(/['"\\]/g, '');

        // ── Validador: ¿el área que mandó SYNA es clara? ──
        const areaRaw = String(c.area || '');
        const compuesta = areaRaw.includes('+') || areaRaw.includes('/') || /,/.test(areaRaw);
        const areaKey = compuesta ? '' : _prelistaAreaKey(areaRaw);
        const needsReview = compuesta || !areaKey;
        window._prelistaSel[c.id] = areaKey; // selección por defecto ('' si hay que revisar)

        const badge = needsReview
          ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:var(--warning);"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path fill-rule="evenodd" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/></svg>Revisar área · SYNA mandó "' + (areaRaw || '—') + '"</span>'
          : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:var(--success);"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Área OK</span>';

        const chips = AREAS_PRELISTA.map(function (a) {
          const k = a[0], lbl = a[1], on = (k === areaKey);
          return '<button type="button" data-k="' + k + '" onclick="selPrelistaArea(\'' + c.id + '\',\'' + k + '\',this)" '
            + 'style="flex:1;padding:8px 4px;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;'
            + 'background:' + (on ? 'var(--accent)' : 'var(--bg)') + ';color:' + (on ? '#fff' : 'var(--ink)') + ';'
            + 'border:1.5px solid ' + (on ? 'var(--accent)' : 'var(--line)') + ';">' + lbl + '</button>';
        }).join('');

        return '<div class="card" style="padding:14px 16px;margin-bottom:10px;border-left:4px solid var(--' + (needsReview ? 'warning' : 'success') + ');">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
            '<div style="width:40px;height:40px;border-radius:50%;background:var(--warning-bg);color:var(--warning);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">' + ini + '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:15px;font-weight:700;">' + (c.nombre || '—') + '</div>' +
              '<div style="font-size:12px;color:var(--ink-soft);">' + servTxt + '</div>' +
              '<div style="font-size:11px;color:var(--warning);font-weight:700;margin-top:2px;">🕐 ' + citaTxt + '</div>' +
            '</div>' +
          '</div>' +
          '<div id="prelistaBadge_' + c.id + '" style="margin-bottom:8px;">' + badge + '</div>' +
          '<div style="font-size:11px;color:var(--ink-faint);font-weight:700;margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px;">Área que la atiende</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:12px;">' + chips + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button onclick="confirmarLlegadaCita(\'' + c.id + '\')" style="flex:1;padding:11px;background:var(--success);color:#fff;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">✓ Ya llegó → pasar a lista</button>' +
            '<button onclick="cancelarCitaSyna(\'' + c.id + '\',\'' + nombreSafe + '\')" style="padding:11px 14px;background:none;color:var(--danger);border:1.5px solid var(--danger);border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">✗</button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (e) {
      section.style.display = 'none';
    }
  }

  async function confirmarLlegadaCita(id) {
    // Validador: exigir que el área esté definida antes de pasar a la lista real
    const AREA_LABEL = { 'cejas': 'cejas', 'pestañas': 'pestañas', 'facial': 'facial', 'depilacion': 'depilación' };
    const sel = (window._prelistaSel && window._prelistaSel[id]) || '';
    if (!sel) {
      alert('⚠️ Revisá el área antes de pasarla.\n\nSYNA mandó un área poco clara. Tocá el área correcta (Cejas / Pestañas / Facial / Depilación) y después "Ya llegó".');
      return;
    }
    const areaLabel = AREA_LABEL[sel] || sel;
    try {
      showToast('⏳ Confirmando llegada...');
      const r = await apiPost('confirmarLlegada', { idEspera: id, area: areaLabel });
      if (r && r.success) {
        showToast('✓ Clienta pasó a Lista de espera');
        loadPrelista();
        loadMikaelaHome();
      } else {
        alert('No se pudo confirmar: ' + ((r && r.message) || 'error'));
        loadPrelista();
      }
    } catch (e) {
      alert('Error de conexión al confirmar');
    }
  }

  async function cancelarCitaSyna(id, nombre) {
    if (!confirm('¿Cancelar la cita de ' + (nombre || 'esta clienta') + '?\nSe marcará como "clienta no llegó".')) return;
    try {
      showToast('⏳ Cancelando cita...');
      const r = await apiPost('cancelarCita', { idEspera: id });
      if (r && r.success) {
        showToast('Cita cancelada');
        loadPrelista();
      } else {
        alert('No se pudo cancelar: ' + ((r && r.message) || 'error'));
        loadPrelista();
      }
    } catch (e) {
      alert('Error de conexión al cancelar');
    }
  }

  // ===================== SWITCH 3 APPS (Nexserv / Syna / Sira) =====================
  function switchApp(app) {
    var yaEnSyna = (window._currentApp === 'syna'); // re-tap en "Syna" estando en Syna = volver al inicio de SYNA
    ['nexserv','syna','sira'].forEach(function (t) {
      var tab = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (tab) tab.style.display = (t === app) ? '' : 'none';
      var btn = document.getElementById('appBtn_' + t);
      if (btn) btn.classList.toggle('on', t === app);
    });
    // El FAB (+) y la barra inferior son de NexServ → solo en esa pestaña
    var home = document.getElementById('mikaelaHome');
    var fab = home ? home.querySelector('.fab') : null;
    var nav = home ? home.querySelector('nav.nav') : null;
    if (fab) fab.style.display = (app === 'nexserv') ? '' : 'none';
    if (nav) nav.style.display = (app === 'nexserv') ? '' : 'none';
    // En SYNA: ocultar el header "Buenos días, Mikaela" (no repetir el nombre / verse como una
    // sola app) e igualar el fondo al crema de NexServ (#f5f5f3) para que TODO el fondo sea uniforme.
    var mkHeader = document.getElementById('mkHomeHeader');
    if (mkHeader) mkHeader.style.display = (app === 'syna') ? 'none' : '';
    // Fondo uniforme crema en todo el contenedor (igual que NexServ).
    var _synaBg = '#f5f5f3';
    document.body.style.background = _synaBg;
    var _phoneEl = document.querySelector('.phone');
    if (_phoneEl) _phoneEl.style.background = _synaBg;
    window._currentApp = app;
    if (app === 'syna') loadSynaDashboard(true); // cada toque en Syna fuerza recarga y evita cache viejo en teléfono
    // if (app === 'sira') loadSiraEmbed();  // cuando tengamos la URL embebible de SIRA
  }
  window.switchApp = switchApp;

  // ===================== MÓDULO SYNA — dashboard en vivo =====================
  // TODO: reemplazar por un apiGet real a SYNA (ej. getDashboardSemana) cuando SYNA
  // confirme su endpoint. Hoy usa datos de ejemplo para ver el módulo funcionando.
  var SYNA_URL_PWA = 'https://humbertods.github.io/syna-agenda/';   // SYNA PWA embebible en NexServ
  var SYNA_EMBED_VERSION = '119';
  function synaUrl_(params) {
    var sep = SYNA_URL_PWA.indexOf('?') >= 0 ? '&' : '?';
    var bust = Date.now ? Date.now() : new Date().getTime();
    return SYNA_URL_PWA + sep + 'v=' + encodeURIComponent(SYNA_EMBED_VERSION) + '&r=' + encodeURIComponent(bust) + (params ? '&' + params : '');
  }
  function _synaMock() {
    return {
      semana: 'Semana — ', citasSemana: 0, confirmadas: 0, sinConfirmar: 0, proximas: 0,
      porRealizar: 0, realizadas: 0, totalSemana: 0,
      porArea: [
        { nombre: 'Cejas', cant: 0, color: '#46b04a' },
        { nombre: 'Pestañas', cant: 0, color: '#ff8a3d' },
        { nombre: 'Facial', cant: 0, color: '#2196f3' },
        { nombre: 'Depilación de bikini completo', cant: 0, color: '#9aa0a6' }
      ],
      proximasLista: [], enProceso: [],
      atendidasHoy: [
        { hora: '09:00', horaFin: '12:00', nombre: 'Yissell Siviria', servicio: 'Pestañas Classic Premium + Depilación + pigmento', area: 'Pestañas' },
        { hora: '11:00', horaFin: '14:00', nombre: 'Omara Tapia', servicio: 'Retoque de pestañas volumen brasilero + Depilación + pigmento', area: 'Pestañas' }
      ]
    };
  }
  function renderSynaDashboard(d) {
    d = d || _synaMock();
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = (v != null ? v : 0); };
    set('synaWeek', d.semana || '');
    set('snCitasSemana', d.citasSemana); set('snConfirmadas', d.confirmadas);
    set('snSinConfirmar', d.sinConfirmar); set('snProximas', d.proximas);
    set('snPorRealizar', d.porRealizar); set('snRealizadas', d.realizadas); set('snTotalSemana', d.totalSemana);
    var areas = document.getElementById('snAreas');
    if (areas) areas.innerHTML = (d.porArea || []).map(function (a) {
      return '<div class="area-row"><div class="area-l"><span class="dot" style="background:' +
        a.color + '"></span>' + a.nombre + '</div><div class="area-n">' + a.cant + '</div></div>';
    }).join('');
    var prox = document.getElementById('snProxList');
    if (prox) prox.textContent = (d.proximasLista && d.proximasLista.length) ? '' : 'Nada pendiente de llegada';
    var proc = document.getElementById('snProcesoList');
    if (proc) proc.textContent = (d.enProceso && d.enProceso.length) ? '' : 'Ninguna cita en curso';
    var atend = d.atendidasHoy || [];
    var atendSub = document.getElementById('snAtendSub');
    if (atendSub) atendSub.textContent = '· ' + atend.length;
    var atendList = document.getElementById('snAtendList');
    if (atendList) {
      if (!atend.length) {
        atendList.className = 'syna-empty';
        atendList.textContent = 'Nada atendido aún hoy';
      } else {
        atendList.className = '';
        atendList.innerHTML = atend.map(function (a) {
          var horaFin = a.horaFin ? ('<div style="font-size:11px;color:var(--ink-faint);">' + a.horaFin + '</div>') : '';
          var serv = [a.servicio, a.area].filter(Boolean).join(' · ');
          return '<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;margin-bottom:8px;background:var(--card,#fff);border:1px solid var(--line);border-left:3px solid #46b04a;border-radius:12px;">' +
            '<div style="flex-shrink:0;text-align:center;min-width:42px;"><div style="font-size:13px;font-weight:800;">' + (a.hora || '') + '</div>' + horaFin + '</div>' +
            '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;">' + (a.nombre || '—') + '</div>' +
            '<div style="font-size:11px;color:var(--ink-soft);">' + serv + '</div></div>' +
            '<div style="flex-shrink:0;color:#46b04a;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
          '</div>';
        }).join('');
      }
    }
  }
  // PARCHE-02: en teléfono el iframe embebido de SYNA no puede cargar su sesión
  // (iOS/Android aíslan el almacenamiento del iframe) y SYNA muestra
  // "no se pudo cargar el resumen". SYNA abierta sola sí funciona en el móvil,
  // así que en móvil la abrimos en su propia pestaña. En PC se conserva el iframe.
  function _esMovilSyna_() {
    try {
      var ua = navigator.userAgent || '';
      if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
      return !!(window.innerWidth && window.innerWidth <= 820);
    } catch (e) { return false; }
  }

  function loadSynaDashboard(force) {
    var slot = document.getElementById('synaFullFrame');
    if (!slot) return;

    // En móvil: no embeber. Mostrar tarjeta con botón que abre SYNA en pestaña propia.
    // FIX iOS: el onclick debe estar en el atributo HTML del botón (no asignado con .onclick=)
    // porque iOS Safari bloquea window.open cuando se llama desde un listener asignado
    // programáticamente después del render — solo permite la apertura desde onclick inline.
    if (_esMovilSyna_()) {
      var synaDest = synaUrl_('embed=1&user=mikaela&view=reservar');
      slot.innerHTML =
        '<div style="padding:36px 24px;text-align:center;">' +
          '<div style="font-size:15px;line-height:1.5;color:#666;margin-bottom:18px;">' +
            'La agenda SYNA se abre en su propia pantalla en el teléfono.' +
          '</div>' +
          '<button onclick="window.open(\'' + synaDest.replace(/'/g, "\\'") + '\',\'_blank\')" ' +
            'style="background:#6C4CE0;color:#fff;border:0;border-radius:14px;' +
            'padding:14px 24px;font-size:15px;font-weight:600;cursor:pointer;">' +
            'Abrir SYNA' +
          '</button>' +
        '</div>';
      return;
    }

    // PC: iframe embebido (comportamiento original).
    // Sin force: si ya está cargado, conservar el estado de SYNA al cambiar de tab.
    // force=true (re-tap del botón "Syna") → recarga a la pantalla principal de SYNA.
    if (!force && slot.querySelector('iframe')) return;
    slot.innerHTML = '<iframe src="' + synaUrl_('embed=1&user=mikaela') + '" allow="clipboard-write"></iframe>';
  }
  // Abre el PWA real de SYNA embebido (mismo dominio → iframe sin restricciones).
  // view: 'agenda' | 'nueva' | 'copiloto' (deep-link best-effort; si SYNA todavía no soporta
  // el parámetro, cae en su home igual y sigue siendo funcional).
  function synaAbrirEmbed(view, titulo) {
    var dash = document.getElementById('synaDashView');
    var ag   = document.getElementById('synaAgendaView');
    var slot = document.getElementById('synaAgendaFrameSlot');
    var ttl  = document.getElementById('synaAgendaTitulo');
    if (dash) dash.style.display = 'none';
    if (ag)   ag.style.display = 'block';
    if (ttl)  ttl.textContent = titulo || 'SYNA';
    if (slot) {
      var url = synaUrl_('embed=1&user=mikaela' + (view ? '&view=' + encodeURIComponent(view) : ''));
      slot.className = '';
      slot.innerHTML = '<iframe class="agenda-frame" src="' + url + '" allow="clipboard-write"></iframe>';
    }
  }
  function synaAbrirAgenda()  { synaAbrirEmbed('agenda',   'Agenda en vivo'); }
  function synaNuevaReserva() { synaAbrirEmbed('reservar', 'Nueva reserva'); }
  function synaCopiloto()     { synaAbrirEmbed('copiloto', 'Copiloto'); }
  function synaVolverDash() {
    var dash = document.getElementById('synaDashView');
    var ag   = document.getElementById('synaAgendaView');
    var slot = document.getElementById('synaAgendaFrameSlot');
    if (ag)   ag.style.display = 'none';
    if (dash) dash.style.display = 'block';
    if (slot) slot.innerHTML = ''; // descargar el iframe al volver (libera recursos)
  }
  window.synaAbrirAgenda = synaAbrirAgenda; window.synaVolverDash = synaVolverDash;
  window.synaNuevaReserva = synaNuevaReserva; window.synaCopiloto = synaCopiloto;
  window.synaAbrirEmbed = synaAbrirEmbed;

  async function loadMikaelaHome() {
    loadCajaChica();
    loadPrelista();
    const priBadge = {
      'especial': '<span class="priority-badge especial">🔴 Especial</span>',
      'tiempo': '<span class="priority-badge tiempo">🟡 Con tiempo</span>',
      'normal': '<span class="priority-badge normal">🟢 Normal</span>',
      'con el tiempo': '<span class="priority-badge tiempo">🟡 Con tiempo</span>',
    };
    const areaMap = { 'cejas': 'cejas', 'depilación': 'depilacion', 'depilacion': 'depilacion', 'pestañas': 'pestanas', 'pestanas': 'pestanas', 'facial': 'facial', 'lifting / retiro': 'retiro_lifting', 'pestañas/cejas': 'retiro_lifting' };

    try {
      // Cargar lista de espera completa (esperando + en servicio)
      const result = await apiGet('getListaCompleta');
      
      if (result.success) {
        const esperando = result.esperando || [];
        const enServicio = result.enServicio || [];
        const porCobrar = result.porCobrar || [];
        const completadas = result.completadas || [];

        // Set de staff ocupadas ahora mismo (para marcar Disponible/Ocupada al reasignar)
        const busyStaff = new Set();
        enServicio.forEach(function(a){
          if (a.fuente === 'TicketMulti' && Array.isArray(a.areas)) {
            a.areas.forEach(function(ar){
              if (String(ar.estado||'').toLowerCase() === 'en servicio' && ar.staff)
                busyStaff.add(String(ar.staff).trim().toLowerCase());
            });
          } else if (a.tomadaPor) {
            String(a.tomadaPor).split(',').forEach(function(s){
              const t = String(s).trim().toLowerCase();
              if (t && t !== '—') busyStaff.add(t);
            });
          }
        });

        // Stats
        document.getElementById('mkStatEspera').textContent = (esperando.length + completadas.length);
        document.getElementById('mkStatServicio').textContent = enServicio.length;
        document.getElementById('mkStatCobrar').textContent = porCobrar.length;

        // Lista de espera (clientas completadas para verificar van primero)
        document.getElementById('mkEsperaCount').textContent = (esperando.length + completadas.length);
        const esperaList = document.getElementById('mkEsperaList');
        const completadasHTML = completadas.map(c => buildCompletadaCard(c)).join('');
        if (esperando.length === 0 && completadas.length === 0) {
          esperaList.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">✨ No hay clientas esperando</div>';
        } else {
          esperaList.innerHTML = completadasHTML + esperando.map(w => {
            const pri = String(w.prioridad || 'normal').toLowerCase();
            const obs = String(w.observaciones || '');
            const esContinuacion = obs.indexOf('✅') !== -1;
            const estaAsignada = w.tomadaPor && String(w.tomadaPor).trim() !== '';
            // Cita confirmada que vino agendada por SYNA (solo le falta asignar staff)
            const esSyna = obs.indexOf('SYNA') !== -1;
            const _citaMatch = obs.match(/cita\s+([0-9]{1,2}:[0-9]{2})/i);
            const _citaHora = _citaMatch ? _citaMatch[1] : '';
            const synaBadge = esSyna
              ? ' <span style="background:var(--warning);color:#fff;font-size:10px;padding:2px 8px;border-radius:100px;font-weight:700;">📅 Cita' + (_citaHora ? ' ' + _citaHora : '') + '</span>'
              : '';
            // Partes ya hechas, parseadas de las observaciones
            const sigueMatch = obs.match(/Sigue:\s*([^|]+)/i);
            const sigueTxt = sigueMatch ? sigueMatch[1].trim() : '';
            const hechas = obs.split('|').map(s => s.trim()).filter(s => s.indexOf('✅') !== -1)
              .map(s => s.replace(/·?\s*Sigue:.*/i, '').trim());
            const hechasHTML = hechas.length
              ? '<div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;">'
                + hechas.map(h => '<div style="font-size:11px;color:var(--success);font-weight:600;">' + h + '</div>').join('')
                + (sigueTxt ? '<div style="font-size:11px;color:var(--accent-deep);font-weight:700;margin-top:2px;">⏳ Falta: ' + sigueTxt + '</div>' : '')
                + '</div>'
              : '';

            // ESTADO de la clienta (3 estados): Asignada a X · Por asignar · Mandar a cobro
            let estadoLabel;
            if (esContinuacion) {
              estadoLabel = sigueTxt
                ? '<strong style="color:var(--accent-deep);">Por asignar</strong> <span style="color:var(--ink-soft);">· falta pasar a la siguiente staff</span>'
                : '<strong style="color:var(--success);">Mandar a cobro</strong> <span style="color:var(--ink-soft);">· servicios completados</span>';
            } else if (estaAsignada) {
              estadoLabel = '<strong style="color:var(--accent-deep);">Asignada</strong> a ' + w.tomadaPor;
            } else {
              estadoLabel = '<strong style="color:var(--ink-soft);">Por asignar</strong>';
            }
            const estadoHTML = '<div style="font-size:15px;margin:8px 0;"><span style="color:var(--ink);font-weight:800;">Estado:</span> ' + estadoLabel + '</div>';

            // ── Control de reasignación (multi-servicio / promo-dúo) ──
            const _fuente = w.fuente || '';
            const _esMultiPromo = _fuente === 'TicketMulti' || _fuente === 'ServicioPromo';
            const _pendKey = _normAreaKey(esContinuacion
              ? [sigueTxt, w.area, w.servicio, obs].join(' ')
              : [w.area, w.servicio, obs].join(' '));
            const _uid = (String(w.idEspera || w.codigo || '').replace(/[^A-Za-z0-9_-]/g,'')) || ('x' + Math.floor(Math.random()*1e6));
            const _areaIdxAttr = (_fuente === 'TicketMulti' && w.areaIdx) ? w.areaIdx : '';
            const _nombreSafe = String(w.nombre || '').replace(/'/g, "\\'");
            const reassignHTML = `
              <div style="margin-top:8px;">
                <select id="reSel_${_uid}" onchange="document.getElementById('reBtn_${_uid}').style.display=this.value?'block':'none'" style="width:100%;padding:9px 10px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:12px;background:var(--bg-card);color:var(--ink);">
                  ${_staffOpcionesReasignar(_pendKey, busyStaff)}
                </select>
                <button id="reBtn_${_uid}" onclick="reasignarStaff('${w.idEspera}','${_areaIdxAttr}','reSel_${_uid}','${_nombreSafe}','${w.codigo||''}')" style="display:none;width:100%;margin-top:6px;padding:11px;background:var(--ink);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">Reasignar</button>
              </div>
              <button onclick="retirarYCobrar('${w.idEspera}','${_nombreSafe}')" style="width:100%;margin-top:6px;padding:10px;background:var(--bg-card);color:#c0392b;border:1.5px solid #c0392b;border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">🚪 Clienta se retira — cobrar lo realizado</button>`;
            // ── Ticket agendado por SYNA: el servicio/área ya vienen definidos,
            // así que se asigna staff directo con el mismo dropdown que usa multi-área
            // (no hace falta re-elegir el servicio). Si igual quiere cambiarlo, abajo
            // quedan los botones Servicio/Promo. ──
            const _syncAssignHTML = `
              <div style="margin-top:10px;">
                <div style="font-size:11px;color:var(--ink-soft);font-weight:700;margin-bottom:5px;">👤 Asignar a la chica:</div>
                <select id="syncSel_${_uid}" onchange="document.getElementById('syncBtn_${_uid}').style.display=this.value?'block':'none'" style="width:100%;padding:9px 10px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:12px;background:var(--bg-card);color:var(--ink);">
                  ${_staffOpcionesReasignar(_pendKey, busyStaff)}
                </select>
                <button id="syncBtn_${_uid}" onclick="reasignarStaff('${w.idEspera}','','syncSel_${_uid}','${_nombreSafe}','${w.codigo||''}')" style="display:none;width:100%;margin-top:6px;padding:11px;background:var(--ink);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">Asignar a esta chica</button>
              </div>`;
            // Para multi/promo con partes ya hechas: mostrar desglose (completado por X · falta asignar)
            const _desgloseMultiHTML = _esMultiPromo
              ? `<div style="background:var(--bg);border-radius:12px;padding:8px 12px;margin-top:6px;">${buildDesgloseHTML(w)}</div>`
              : `<div class="waitlist-service"><strong>${w.servicio}</strong> · ${w.area}</div>`;

            // Continuación: terminó una parte y vuelve para redirigir a la siguiente staff
            if (esContinuacion) {
              return `
              <div class="waitlist-card" style="border:2px solid var(--accent);">
                <div class="waitlist-top">
                  <div class="waitlist-client">
                    <div class="waitlist-code">${w.codigo} · llegó ${w.horaLlegada}</div>
                    <div class="waitlist-name">${w.nombre} <span style="background:var(--accent);color:white;font-size:10px;padding:2px 8px;border-radius:100px;font-weight:700;">🔄 Para redirigir</span></div>
                  </div>
                </div>
                ${estadoHTML}
                ${hechasHTML}
                ${reassignHTML}
                <div style="display:flex;gap:6px;margin-top:10px;">
                  <button onclick="openAssignServiceModal('${w.codigo}', '${w.nombre}')" style="flex:1;padding:8px 12px;background:var(--accent);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;">➡️ Redirigir servicio</button>
                  <button onclick="openAssignPromoModal('${w.codigo}', '${w.nombre}')" style="flex:1;padding:8px 12px;background:var(--success);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;">➡️ Redirigir promo</button>
                </div>
              </div>`;
            }

            // Nueva o ya asignada: misma tarjeta con botones; el estado va en la línea "Estado:"
            return `
            <div class="waitlist-card priority-${pri === 'con el tiempo' ? 'tiempo' : pri} ${w.esTop ? 'is-top' : ''}" data-tid="${w.idEspera || ''}" data-tname="${String(w.nombre || '').replace(/"/g,'')}"${estaAsignada ? ' style="border-left:4px solid var(--accent);"' : ''}>
              <div class="waitlist-top">
                <div class="waitlist-client">
                  <div class="waitlist-code">${w.codigo} · llegó ${w.horaLlegada}</div>
                  <div class="waitlist-name">${w.nombre}${w.esTop ? ' <span class="top-star">⭐ TOP</span>' : ''}${synaBadge}</div>
                </div>
                ${priBadge[pri] || priBadge['normal']}
              </div>
              ${estadoHTML}
              ${_desgloseMultiHTML}
              ${_esMultiPromo ? reassignHTML : `${esSyna ? _syncAssignHTML : ''}<div style="display: flex; gap: 6px; margin-top: 10px;">
                <button onclick="openAssignServiceModal('${w.codigo}', '${w.nombre}')" style="flex: 1; padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">💼 Servicio</button>
                <button onclick="openAssignPromoModal('${w.codigo}', '${w.nombre}')" style="flex: 1; padding: 8px 12px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">🏷 Promo</button>
              </div>`}
            </div>`;
          }).join('');
        }

        // En atención — fichas en vivo con historial de áreas
        document.getElementById('mkAtencionCount').textContent = enServicio.length;
        const atenList = document.getElementById('mkAtencionList');
        if (enServicio.length === 0) {
          atenList.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No hay clientas en atención</div>';
        } else {
          atenList.innerHTML = enServicio.map(a => {
            const initials = a.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
            const areaIcons = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>', depilación: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg>', pestañas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg>', retiro_lifting: '✨', facial: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg>' };
            const areaLabels = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilación', depilación: 'Depilación', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg> Pestañas', pestañas: 'Pestañas', retiro_lifting: 'Lifting/Retiro', facial: 'Facial' };

            let timelineHTML = '';
            const esTM = a.fuente === 'TicketMulti' && a.areas && a.areas.length > 0;

            if (esTM) {
              // ── TICKET MULTI: desglose real por área ──
              (a.areas || []).forEach((ar, arIdx) => {
                const aKey = String(ar.area || '').toLowerCase().replace(/[ó]/g,'o').replace(/[á]/g,'a').replace(/[é]/g,'e').replace(/[ñ]/g,'n');
                const icon = areaIcons[aKey] || areaIcons[ar.area] || '🔄';
                const label = areaLabels[aKey] || areaLabels[ar.area] || ar.area || 'Servicio';
                const serv = ar.confirmado || ar.tentativo || '';
                const precio = ar.precio || 0;
                const est = String(ar.estado || '').toLowerCase();
                const notLast = arIdx < (a.areas.length - 1);
                if (est === 'completado') {
                  timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${notLast?'border-bottom:1px solid var(--line);':''}">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${icon}</div>
                    <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">${label} · ${ar.staff||'—'} · <strong>$${precio}</strong></div><div style="font-size:11px;color:var(--ink-soft);">${serv}</div></div>
                    <div style="font-size:10px;font-weight:700;background:var(--success-bg);color:var(--success);padding:3px 8px;border-radius:100px;">LISTO ✅</div></div>`;
                } else if (est === 'en servicio') {
                  timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${notLast?'border-bottom:1px solid var(--line);':''}">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--info-bg);border:2px solid var(--info);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;animation:pulse 2s infinite;">${icon}</div>
                    <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:var(--info);">${label} · ${ar.staff||'—'} · <strong>$${precio}</strong></div><div style="font-size:11px;color:var(--ink-soft);">${serv.split(" + ").map(s => `<div style="font-size:11px;color:var(--ink-soft);">• ${s.trim()}</div>`).join("")}</div><div style="font-size:10px;color:var(--ink-faint);">🔄 En curso${ar.hora?' desde '+ar.hora:''}</div></div>
                    <div style="font-size:10px;font-weight:700;background:var(--info-bg);color:var(--info);padding:3px 8px;border-radius:100px;animation:pulse 2s infinite;">EN CURSO</div></div>`;
                } else {
                  timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;opacity:0.55;${notLast?'border-bottom:1px solid var(--line);':''}">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--bg);border:2px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${icon}</div>
                    <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--ink-soft);">${label} · <strong>$${precio}</strong></div><div style="font-size:11px;color:var(--ink-faint);">${serv || 'Esperando asignación'}</div></div>
                    <div style="font-size:10px;font-weight:700;background:var(--warning-bg);color:var(--warning);padding:3px 8px;border-radius:100px;border:1px solid #e0c89a;">⏳ ESPERA</div></div>`;
                }
              });
            } else {
              // ── TICKET NORMAL / PROMO: timeline original ──
              const obs = String(a.observaciones || '');
              const partesPrevias = obs.split(' | ').filter(p => p.includes('✅'));
              partesPrevias.forEach(parte => {
                const matchArea = parte.match(/✅\s*([\w\/áéíóúñ]+)\s+completad[ao] por\s+([^·]+)/i);
                if (matchArea) {
                  const areaComp = matchArea[1].trim().toLowerCase();
                  const staffComp = matchArea[2].trim();
                  const icon = areaIcons[areaComp] || '✅';
                  const label = areaLabels[areaComp] || areaComp;
                  let montoStr = '';
                  if (a.serviciosDetalle && a.serviciosDetalle.length > 0) {
                    // Sumar TODAS las entradas de esa staff (promo + adicionales)
                    const entradasStaff = a.serviciosDetalle.filter(d =>
                      String(d.staff||'').toLowerCase() === staffComp.toLowerCase() ||
                      String(d.area||'').toLowerCase().includes(areaComp)
                    );
                    const montoTotal = entradasStaff.reduce((s, d) => s + Number(d.monto || 0), 0);
                    if (montoTotal > 0) montoStr = ' · <strong>$' + montoTotal.toFixed(2) + '</strong>';
                  }
                  timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${icon}</div>
                    <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">${label} · ${staffComp}${montoStr}</div><div style="font-size:10px;color:var(--ink-faint);">✅ Completado</div></div>
                    <div style="font-size:10px;font-weight:700;background:var(--success-bg);color:var(--success);padding:3px 8px;border-radius:100px;">LISTO</div></div>`;
                }
              });
              const areaActualKey = String(a.area || '').toLowerCase().replace('ó','o').replace('ñ','n');
              const iconActual = areaIcons[areaActualKey] || '🔄';
              const labelActual = areaLabels[areaActualKey] || a.area || 'Servicio';
              const servicioLimpio = String(a.servicio || '').replace('(continuación promo)', '').replace('(continuacion promo)', '').trim();
              const esPendConf = a.pendienteConfirmacion === true;
              const badgeColor = esPendConf ? 'var(--warning, #f59e0b)' : 'var(--info)';
              const badgeBg = esPendConf ? '#fff8e1' : 'var(--info-bg)';
              const badgeLabel = esPendConf ? '⏳ CONFIRMANDO' : 'EN CURSO';
              timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;">
                <div style="width:28px;height:28px;border-radius:50%;background:${badgeBg};border:2px solid ${badgeColor};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;animation:pulse 2s infinite;">${iconActual}</div>
                <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${badgeColor};">${labelActual} · ${a.tomadaPor}</div>
                <div style="font-size:11px;color:var(--ink-soft);">${servicioLimpio}</div>
                <div style="font-size:10px;color:var(--ink-faint);">Desde ${a.horaToma || '?'}${esPendConf?' · Esperando confirmación':''}</div></div>
                <div style="font-size:10px;font-weight:700;background:${badgeBg};color:${badgeColor};padding:3px 8px;border-radius:100px;animation:pulse 2s infinite;">${badgeLabel}</div></div>`;
              if (a.promoNombre) {
                const promoFull = (PROMOS || []).find(p => p.name === a.promoNombre);
                if (promoFull && promoFull.division) {
                  const areaActualNorm = String(a.area||'').toLowerCase().replace('ó','o').replace('á','a').replace('é','e').replace('ñ','n');
                  const areasYa = new Set([areaActualNorm]);
                  partesPrevias.forEach(p => { const m = p.match(/✅\s*([\w\/]+)\s+completad/i); if (m) areasYa.add(m[1].trim().toLowerCase()); });
                  promoFull.division.forEach(d => {
                    const dArea = String(d.area||'').toLowerCase().replace('ó','o').replace('á','a').replace('é','e').replace('ñ','n').replace('pestañas','pestanas');
                    if (![...areasYa].some(ya => dArea.includes(ya) || ya.includes(dArea))) {
                      timelineHTML += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;opacity:0.5;">
                        <div style="width:28px;height:28px;border-radius:50%;background:var(--bg);border:2px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;">${areaIcons[dArea]||'⏳'}</div>
                        <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--ink-soft);">${areaLabels[dArea]||d.area} · $${d.monto}</div></div>
                        <div style="font-size:10px;font-weight:700;background:var(--bg);color:var(--ink-faint);padding:3px 8px;border-radius:100px;border:1px solid var(--line);">ESPERA</div></div>`;
                    }
                  });
                }
              }
            } // fin else normal/promo

            // TOTAL ACUMULADO.
            // OJO promo repartida: el precio del combo es FIJO (ej. Combo 25 Clásicas = $47).
            // Las partes en serviciosDetalle (pestañas $42 + cejas $5) son SUBDIVISIONES de
            // ese precio, NO sumandos. Sumarlas encima de a.total daba el bug $42+$47=$89.
            let totalAcumDisplay = Number(a.total) || 0;
            const _promoFullTot = a.promoNombre ? (PROMOS || []).find(p => p.name === a.promoNombre) : null;
            const _promoPrecioFijo = _promoFullTot ? Number(_promoFullTot.price || _promoFullTot.precio || 0) : 0;
            if (a.serviciosDetalle && a.serviciosDetalle.length > 0) {
              const totalDetalle = a.serviciosDetalle.reduce((s, d) => s + Number(d.monto || 0), 0);
              if (totalDetalle > 0) {
                if (_promoPrecioFijo > 0) {
                  // Promo de precio fijo: el total ES el precio del combo. Nunca sumar las
                  // partes del propio combo encima. (Si a.total ya incluye adicionales
                  // reales fuera del combo, se respeta el mayor.)
                  totalAcumDisplay = Math.max(_promoPrecioFijo, Number(a.total) || 0);
                } else {
                  // Multi-servicio SIN promo fija: sí se suman las partes hechas + la actual.
                  totalAcumDisplay = Math.max(totalAcumDisplay, totalDetalle + Number(a.total || 0));
                }
              }
            }
            const totalStr = totalAcumDisplay > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);"><span style="font-size:11px;color:var(--ink-faint);font-weight:600;">TOTAL ACUMULADO</span><span style="font-size:16px;font-weight:800;color:var(--accent-deep);">$${totalAcumDisplay.toFixed(2)}</span></div>` : '';
            const tmBadge = esTM ? ' <span style="font-size:10px;background:var(--accent);color:white;padding:2px 8px;border-radius:100px;font-weight:700;">MULTI</span>' : '';
            const promoStr = a.promoNombre ? `<div style="background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;display:inline-block;margin-bottom:8px;">🏷 ${a.promoNombre}</div>` : '';

            return `
            <div style="background:var(--bg-card);border-radius:var(--radius-card);padding:14px 16px;margin-bottom:12px;box-shadow:var(--shadow-card);border-left:4px solid ${esTM?'var(--accent)':'var(--info)'};">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div class="client-avatar ${a.esTop ? 'is-top' : ''}" style="flex-shrink:0;">${initials}</div>
                <div style="flex:1;">
                  <div style="font-size:15px;font-weight:800;">${a.nombre}${a.esTop ? ' <span class="top-star">⭐</span>' : ''}${tmBadge}</div>
                  <div style="font-size:11px;color:var(--ink-faint);margin-top:1px;">${a.codigo} · llegó ${a.horaLlegada || '?'}</div>
                </div>
              </div>
              ${promoStr}
              <div style="background:var(--bg);border-radius:12px;padding:10px 12px;">
                ${timelineHTML}
              </div>
              ${totalStr}
            </div>`;
          }).join('');
        }

        // Por cobrar
        document.getElementById('porCobrarCount').textContent = porCobrar.length;
        const cobrarList = document.getElementById('porCobrarList');
        if (porCobrar.length === 0) {
          cobrarList.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No hay clientas por cobrar</div>';
        } else {
          window._mkPorCobrarData = porCobrar;
          cobrarList.innerHTML = porCobrar.map(p => {
            const esTM = p.fuente === 'TicketMulti';
            let desgloseData = p.serviciosDetalle;
            if (desgloseData && desgloseData.length > 0 && !esTM) {
              const staffsEnDesglose = [...new Set(desgloseData.map(d => d.staff))];
              const ultimaStaff = staffsEnDesglose[staffsEnDesglose.length - 1];
              desgloseData = desgloseData.map(d => ({
                ...d,
                congelado: d.staff !== ultimaStaff,
                montoNormal: d.montoNormal || d.monto
              }));
            }
            if (!desgloseData && esTM && p.areas) {
              // ── MANDAMIENTO #4: incluir precioNormal para que tarjeta recalcule correctamente ──
              desgloseData = p.areas.map(a => ({
                staff: a.staff||'—', servicio: a.confirmado||a.tentativo, area: a.area,
                monto: a.precio,
                montoNormal: a.precioNormal || a.precio  // precio sin descuento promo
              }));
            }
            const desgloseEnc = desgloseData ? encodeURIComponent(JSON.stringify(desgloseData)) : '';
            return `
            <div class="card" style="margin-bottom: 8px; padding: 14px; border-left: 4px solid ${esTM ? 'var(--accent)' : 'var(--success)'};">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="client-avatar ${p.esTop ? 'is-top' : ''}" style="flex-shrink: 0;">${p.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 15px;">${p.nombre} ${p.esTop ? '<span class="top-star">⭐</span>' : ''}${esTM ? ' <span style=\"font-size:10px;background:var(--accent);color:white;padding:2px 7px;border-radius:100px;font-weight:700;\">MULTI</span>' : ''}</div>
                  <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-top: 2px;">${p.servicio} · atendida por ${p.tomadaPor}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                  <button onclick="cobrarDesdeBtn(this)" 
                    data-id="${p.idEspera}"
                    data-codigo="${p.codigo||''}"
                    data-nombre="${(p.nombre||'').replace(/'/g,'&#39;')}"
                    data-servicio="${(p.servicio||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;')}"
                    data-chica="${(p.tomadaPor||'').replace(/'/g,'&#39;')}"
                    data-total="${p.total||'0'}"
                    data-regular="${p.precioRegular||p.total||'0'}"
                    data-promo="${(p.promoNombre||'').replace(/'/g,'&#39;')}"
                    data-desglose="${desgloseEnc}"
                    style="padding: 10px 16px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;">💵 Cobrar</button>
                  <button onclick="mkEsperarAsignacion('${p.idEspera}','${(p.nombre||'').replace(/'/g,"'")}','${(p.servicio||'').replace(/'/g,"'")}','${p.total||'0'}','${(p.tomadaPor||'').replace(/'/g,"'")}','${p.precioRegular||p.total||'0'}','${(p.promoNombre||'')}','${desgloseEnc}')"
                    style="padding: 7px 12px; background: var(--bg); color: var(--ink-soft); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">⏳ Esperar</button>
                  <button onclick="openAgregarProducto('${p.idEspera}', '${(p.nombre||'').replace(/'/g,"\\'")}', '${p.total||'0'}')"
                    style="padding: 7px 14px; background: var(--bg); color: var(--ink); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M7 7a5 5 0 0 1 10 0h2.5a1 1 0 0 1 1 .92l.96 12A2 2 0 0 1 19.46 22H4.54a2 2 0 0 1-1.99-2.08l.96-12A1 1 0 0 1 4.5 7H7Zm2 0h6a3 3 0 0 0-6 0Z"/></svg> + Producto</button>
                  <button onclick="eliminarTicketEspera('${p.idEspera}','${(p.nombre||'').replace(/'/g,"\\'")}')"
                    style="padding: 6px 12px; background: var(--bg); color: var(--danger); border: 1.5px solid var(--danger); border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">🗑 Borrar</button>
                </div>
              </div>
              <!-- Asignar cliente al cobro: aparece si hay clientas esperando asignación -->
              <div id="asignarRow-${p.idEspera}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);">
                <div style="font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:6px;">+ AGREGAR AL COBRO DE ESTA CLIENTA:</div>
                <div id="asignarOpciones-${p.idEspera}" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
              </div>
              <!-- Productos agregados a este ticket -->
              <div id="productos-ticket-${p.idEspera}" style="margin-top: 8px;"></div>
            </div>
          `;
          }).join('');
          if (window._mkEsperandoCobro && window._mkEsperandoCobro.length > 0) mkActualizarAsignarOpciones();
          mkRenderEsperandoCobro();
        }
        
        // Autorizaciones pendientes
        renderAuthorizations();
        
        // Auto-refresh inteligente: 8s si hay clientas en atención, 15s si no
        if (window._mikaelaAutoRefresh) clearInterval(window._mikaelaAutoRefresh);
        const refreshInterval = enServicio.length > 0 ? 8000 : 15000;
        window._mikaelaAutoRefresh = setInterval(() => {
          const currentScreen = document.querySelector('.screen.active');
          if (currentScreen && currentScreen.id === 'mikaelaHome') {
            loadMikaelaHome();
          } else {
            clearInterval(window._mikaelaAutoRefresh);
          }
        }, refreshInterval);
      }
    } catch (err) {
      console.error('Error cargando dashboard Mikaela:', err);
    }
  }
  
  
  function confirmarEliminarServicio(itemIdx) {
    const item = window._historialItems && window._historialItems[itemIdx];
    if (!item) return;
    const msg = `¿Eliminar este registro?\n\n• Cliente: ${item.nombre || item.clienteNombre}\n• Servicio: ${item.servicio}\n• Staff: ${item.chica}\n• Monto: $${item.precio}\n\nEsto revertirá la comisión y eliminará el registro. No se puede deshacer.`;
    if (!confirm(msg)) return;
    eliminarServicio(item);
  }

  async function eliminarServicio(item) {
    try {
      showToast('⏳ Eliminando registro...');
      const result = await apiPost('eliminarServicio', {
        fecha: item.fecha,
        hora: item.hora,
        cliente: item.nombre || item.clienteNombre || '',
        staff: item.chica || '',
        servicio: item.servicio || '',
        precio: item.precio || 0,
        comision: item.comision || 0
      });
      if (result.success) {
        showToast('✓ Registro eliminado correctamente');
        loadServiciosHistory(); // recargar
        if (typeof loadCajaChica === 'function') loadCajaChica(); // sincronizar caja chica
      } else {
        alert('Error al eliminar: ' + (result.error || 'desconocido'));
      }
    } catch(e) {
      alert('Error de conexión al eliminar');
    }
  }

  // Construye las opciones del selector de historial según el ROL y deja "Hoy" por defecto.
  // Se llama al ABRIR la pantalla (no en cada refresh) para no perder la selección.
  function _setupHistorySelectPorRol() {
    const sel = document.getElementById('historyWeekSelect');
    if (!sel) return;
    const esOwner = window.currentUser && window.currentUser.role === 'owner';
    if (esOwner) {
      // Owner: acceso completo
      sel.innerHTML = '<option value="hoy">Hoy</option>'
        + '<option value="0">Esta semana</option>'
        + '<option value="1">Semana pasada</option>'
        + '<option value="2">Hace 2 semanas</option>'
        + '<option value="3">Hace 3 semanas</option>';
    } else {
      // Mikaela / admin: solo Hoy + Semana (en curso)
      sel.innerHTML = '<option value="hoy">Hoy</option>'
        + '<option value="0">Semana</option>';
    }
    sel.value = 'hoy'; // al entrar, vista EN VIVO de hoy
  }

  async function loadServiciosHistory() {
    const selVal = document.getElementById('historyWeekSelect')?.value || 'hoy';
    const esHoy = selVal === 'hoy';
    const semanaOffset = esHoy ? 0 : parseInt(selVal || '0');
    const scopeLabel = esHoy ? 'Hoy'
      : (semanaOffset === 0 ? 'Esta semana'
        : semanaOffset === 1 ? 'Semana pasada'
        : 'Hace ' + semanaOffset + ' semanas');
    window._histScopeLabel = scopeLabel;
    const list = document.getElementById('historyList');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Cargando...</div>';

    try {
      // Calcular rango: HOY (solo el día) o la SEMANA (lunes–sábado con offset)
      const now = new Date();
      let lunes, sabado;
      if (esHoy) {
        lunes = new Date(now); lunes.setHours(0, 0, 0, 0);
        sabado = new Date(now); sabado.setHours(23, 59, 59);
      } else {
        const dayOfWeek = (now.getDay() + 6) % 7;
        lunes = new Date(now);
        lunes.setDate(now.getDate() - dayOfWeek - (semanaOffset * 7));
        lunes.setHours(0, 0, 0, 0);
        sabado = new Date(lunes);
        sabado.setDate(lunes.getDate() + 6);
        sabado.setHours(23, 59, 59);
      }

      const result = await apiGet('getHistorial', { periodo: 'todo' });
      if (!result.success || !result.historial) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin datos</div>';
        return;
      }

      const DIAS_ORDER = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'];
      const DIAS_LABEL = { 1:'Lunes', 2:'Martes', 3:'Miercoles', 4:'Jueves', 5:'Viernes', 6:'Sabado', 0:'Domingo' };

      // Filtrar y agrupar por dia -> staff — guardar referencia para eliminar
      const porDia = {};
      let totalSemana = 0, totalServicios = 0;
      window._historialItems = []; // guardar todos los items para poder eliminarlos por índice

      result.historial.forEach(function(h, globalIdx) {
        const esProducto = String(h.area || '').toLowerCase() === 'producto'
                        || String(h.metodoPago || '').toLowerCase() === 'producto';
        if (!h.nombre && !h.clienteNombre && !esProducto) return;
        const parts = String(h.fecha || '').split('/');
        if (parts.length !== 3) return;
        const fechaDate = new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
        if (fechaDate < lunes || fechaDate > sabado) return;

        const diaN = DIAS_LABEL[fechaDate.getDay()] || 'Otro';
        const diaSortKey = fechaDate.getDay();
        const staff = String(h.chica || '—');
        // Productos registrados con chica='admin' → mostrar como 'Mikaela'
        const staffDisplay = (esProducto && (staff === 'admin' || staff === '—' || staff === ''))
          ? 'Mikaela'
          : staff;
        const valor = Number(h.precio || 0);
        // Para productos: el nombre de clienta está en col C (h.codigo), no col D (h.nombre='admin')
        const clienteRaw = esProducto
          ? (String(h.codigo || h.nombre || '') || 'Venta directa')
          : String(h.nombre || h.clienteNombre || '');
        const cliente = clienteDisplay(clienteRaw, String(h.codigo || h.code || '')) || '—';
        const servicio = String(h.servicio || '—');
        const hora = String(h.hora || '');
        const metodo = String(h.metodoPago || 'Efectivo');
        const itemIdx = window._historialItems.length;
        window._historialItems.push({ ...h, _idx: itemIdx });

        if (!porDia[diaN]) porDia[diaN] = { dia: diaN, sortKey: diaSortKey === 0 ? 7 : diaSortKey, total: 0, count: 0, staff: {} };
        if (!porDia[diaN].staff[staffDisplay]) porDia[diaN].staff[staffDisplay] = { nombre: staffDisplay, total: 0, servicios: [] };
        porDia[diaN].staff[staffDisplay].servicios.push({ cliente, servicio, valor, hora, metodo, itemIdx });
        porDia[diaN].staff[staffDisplay].total += valor;
        porDia[diaN].total += valor;
        porDia[diaN].count++;
        totalSemana += valor;
        totalServicios++;
      });

      // Stats de la SEMANA (por defecto). Al desplegar un día, las tarjetas muestran ese día.
      window._histSemana = { count: totalServicios, total: totalSemana };
      window._histDias = {};
      document.getElementById('historyTotalCount').textContent = totalServicios;
      document.getElementById('historyTotalAmount').textContent = '$' + totalSemana.toFixed(0);
      document.getElementById('historyAvgAmount').textContent = totalServicios > 0 ? '$' + (totalSemana/totalServicios).toFixed(0) : '$0';
      document.getElementById('historyCount').textContent = totalServicios;
      var _scopeEl0 = document.getElementById('historyStatScope');
      if (_scopeEl0) _scopeEl0.textContent = scopeLabel;

      const dias = Object.values(porDia).sort(function(a,b){ return a.sortKey - b.sortKey; });

      if (dias.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin cobros esta semana</div>';
        return;
      }

      // ── HOY: desglose por STAFF directo (como la vista del owner, sin comisiones) ──
      if (esHoy) {
        const _hoyNom = DIAS_LABEL[new Date().getDay()];
        const staffHoy = porDia[_hoyNom] ? Object.values(porDia[_hoyNom].staff).sort(function(a,b){ return b.total - a.total; }) : [];
        if (!staffHoy.length) {
          list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin servicios cobrados hoy</div>';
          return;
        }
        list.innerHTML = staffHoy.map(function(s, si) {
          const canDelete = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'owner');
          return '<div style="margin-bottom:6px;">' +
            '<div onclick="toggleHistStaff(0,' + si + ')" style="background:var(--bg-card);border-radius:14px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
              '<div><div style="font-size:15px;font-weight:700;">' + s.nombre + '</div>' +
              '<div style="font-size:11px;color:var(--ink-soft);">' + s.servicios.length + ' servicio' + (s.servicios.length!==1?'s':'') + '</div></div>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="font-size:16px;font-weight:800;">$' + s.total.toFixed(0) + '</div>' +
                '<div id="arrow-staff-0-' + si + '" style="color:var(--ink-faint);font-size:11px;transition:transform .2s;">▼</div>' +
              '</div>' +
            '</div>' +
            '<div id="staff-hist-0-' + si + '" style="display:none;background:var(--bg-card);border-radius:0 0 12px 12px;padding:4px 14px 10px;">' +
              s.servicios.map(function(sv, svi) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;' + (svi < s.servicios.length-1 ? 'border-bottom:1px solid var(--line);' : '') + '">' +
                  '<div style="flex:1;">' +
                    '<div style="font-size:13px;font-weight:600;">' + sv.cliente + '</div>' +
                    '<div style="font-size:11px;color:var(--ink-soft);">' + sv.servicio + ' · ' + sv.hora + ' · ' + sv.metodo + '</div>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<div style="font-size:14px;font-weight:800;color:var(--success);">$' + sv.valor.toFixed(0) + '</div>' +
                    (canDelete ? '<button onclick="confirmarEliminarServicio(' + sv.itemIdx + ')" style="background:none;border:1.5px solid var(--danger);color:var(--danger);border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🗑</button>' : '') +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('');
        return;
      }

      // Incluir todos los días de la semana aunque esten vacios
      const todosLosDias = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
      const hoyNombre = DIAS_LABEL[new Date().getDay()];

      list.innerHTML = todosLosDias.map(function(diaNombre, di) {
        const diaData = porDia[diaNombre];
        const esHoy = diaNombre === hoyNombre && semanaOffset === 0;
        const label = diaNombre + (esHoy ? ' (HOY)' : '');
        const totalDia = diaData ? diaData.total : 0;
        const countDia = diaData ? diaData.count : 0;
        const staffList = diaData ? Object.values(diaData.staff) : [];
        // Guardar el cuadre de cada día para mostrarlo en las tarjetas de arriba al desplegarlo
        window._histDias[di] = { count: countDia, total: totalDia, label: label };

        return '<div style="margin-bottom:6px;">' +
          '<div onclick="toggleHistDia(' + di + ')" style="background:var(--bg-card);border-radius:14px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
            '<div style="font-size:15px;font-weight:700;">' + label + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div style="font-size:16px;font-weight:800;color:' + (totalDia > 0 ? 'var(--ink)' : 'var(--ink-faint)') + ';">$' + totalDia.toFixed(0) + '</div>' +
              '<div id="arrow-dia-' + di + '" style="color:var(--ink-faint);font-size:11px;transition:transform .2s;">▼</div>' +
            '</div>' +
          '</div>' +
          '<div id="dia-hist-' + di + '" style="display:none;padding:0 4px;">' +
            (staffList.length === 0
              ? '<div style="padding:10px 12px;font-size:12px;color:var(--ink-faint);">Sin servicios</div>'
              : staffList.map(function(s, si) {
                  return '<div style="margin-top:4px;">' +
                    '<div onclick="toggleHistStaff(' + di + ',' + si + ')" style="background:var(--chip);border-radius:12px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">' +
                      '<div style="font-size:13px;font-weight:700;">' + s.nombre + '</div>' +
                      '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<div style="font-size:14px;font-weight:800;">$' + s.total.toFixed(0) + '</div>' +
                        '<div id="arrow-staff-' + di + '-' + si + '" style="color:var(--ink-faint);font-size:11px;transition:transform .2s;">▼</div>' +
                      '</div>' +
                    '</div>' +
                    '<div id="staff-hist-' + di + '-' + si + '" style="display:none;background:var(--bg-card);border-radius:0 0 12px 12px;padding:4px 14px 10px;">' +
                      s.servicios.map(function(sv, svi) {
                        const canDelete = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'owner');
                        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;' + (svi < s.servicios.length-1 ? 'border-bottom:1px solid var(--line);' : '') + '">' +
                          '<div style="flex:1;">' +
                            '<div style="font-size:13px;font-weight:600;">' + sv.cliente + '</div>' +
                            '<div style="font-size:11px;color:var(--ink-soft);">' + sv.servicio + ' · ' + sv.hora + ' · ' + sv.metodo + '</div>' +
                          '</div>' +
                          '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<div style="font-size:14px;font-weight:800;color:var(--success);">$' + sv.valor.toFixed(0) + '</div>' +
                            (canDelete ? '<button onclick="confirmarEliminarServicio(' + sv.itemIdx + ')" style="background:none;border:1.5px solid var(--danger);color:var(--danger);border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🗑</button>' : '') +
                          '</div>' +
                        '</div>';
                      }).join('') +
                    '</div>' +
                  '</div>';
                }).join('')
            ) +
          '</div>' +
        '</div>';
      }).join('');

    } catch(err) {
      console.error('Error historial:', err);
      document.getElementById('historyList').innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Error cargando datos</div>';
    }
  }

  // Refresca las 3 tarjetas de arriba según el día desplegado (o la semana si no hay ninguno)
  function _histRefrescarTarjetas() {
    var diAbierto = -1;
    for (var di = 0; di < 6; di++) {
      var dd = document.getElementById('dia-hist-' + di);
      if (dd && dd.style.display !== 'none') { diAbierto = di; break; }
    }
    var c  = document.getElementById('historyTotalCount');
    var t  = document.getElementById('historyTotalAmount');
    var av = document.getElementById('historyAvgAmount');
    var sc = document.getElementById('historyStatScope');
    var data, scope;
    if (diAbierto >= 0 && window._histDias && window._histDias[diAbierto]) {
      data  = window._histDias[diAbierto];
      scope = data.label || 'Día';
    } else {
      data  = window._histSemana || { count: 0, total: 0 };
      scope = window._histScopeLabel || 'Esta semana';
    }
    if (c)  c.textContent  = data.count || 0;
    if (t)  t.textContent  = '$' + Number(data.total || 0).toFixed(0);
    if (av) av.textContent = (data.count > 0) ? '$' + (data.total / data.count).toFixed(0) : '$0';
    if (sc) sc.textContent = scope;
  }
  window._histRefrescarTarjetas = _histRefrescarTarjetas;

  function toggleHistDia(di) {
    var d = document.getElementById('dia-hist-' + di);
    var a = document.getElementById('arrow-dia-' + di);
    if (!d) return;
    var open = d.style.display !== 'none';
    // Acordeón: al abrir un día se cierran los demás, para que las tarjetas de arriba
    // muestren el cuadre SOLO de ese día. Al cerrarlo, vuelven al total de la semana.
    if (!open) {
      for (var od = 0; od < 6; od++) {
        if (od === di) continue;
        var odd = document.getElementById('dia-hist-' + od);
        var oarr = document.getElementById('arrow-dia-' + od);
        if (odd) odd.style.display = 'none';
        if (oarr) oarr.style.transform = '';
      }
    }
    d.style.display = open ? 'none' : 'block';
    if (a) a.style.transform = open ? '' : 'rotate(180deg)';
    _histRefrescarTarjetas();
  }

  function toggleHistStaff(di, si) {
    var d = document.getElementById('staff-hist-' + di + '-' + si);
    var a = document.getElementById('arrow-staff-' + di + '-' + si);
    if (!d) return;
    var open = d.style.display !== 'none';
    d.style.display = open ? 'none' : 'block';
    if (a) a.style.transform = open ? '' : 'rotate(180deg)';
  }

    async function renderAuthorizations() {
    console.log('🔍 renderAuthorizations called');
    try {
      // Cargar autorizaciones desde el backend
      console.log('📡 Calling apiGet(getAutorizaciones)...');
      const result = await apiGet('getAutorizaciones');
      
      console.log('📥 Backend response:', result);
      
      if (!result.success) {
        console.error('❌ Error cargando autorizaciones:', result.message);
        document.getElementById('authorizationsSection').style.display = 'none';
        return;
      }
      
      const requests = result.autorizaciones || [];
      console.log('📋 Total autorizaciones recibidas:', requests.length);
      console.log('📋 Autorizaciones:', requests);
      
      // Mikaela solo ve los PENDIENTES para aprobar/rechazar
      const pendingRequests = requests.filter(r => r.estado === 'pendiente');
      console.log('⏳ Autorizaciones PENDIENTES:', pendingRequests.length);
      console.log('⏳ Pendientes:', pendingRequests);
      
      const authSection = document.getElementById('authorizationsSection');
      const authList = document.getElementById('authorizationsList');
      const authCount = document.getElementById('authCount');
      
      if (pendingRequests.length === 0) {
        authSection.style.display = 'none';
        return;
      }
      
      authSection.style.display = 'block';
      authCount.textContent = pendingRequests.length;
      
      authList.innerHTML = pendingRequests.map((req, idx) => `
        <div class="card" style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); border: 2px solid #ffc107; padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <div style="font-size: 16px; font-weight: 800; color: #856404;">${req.clienteNombre}</div>
              <div style="font-size: 12px; color: #856404; margin-top: 2px;">Solicitado por: <strong>${req.staffNombre}</strong> · ${req.fecha}</div>
            </div>
            <div style="background: #ff9800; color: white; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px;">PENDIENTE</div>
          </div>
          
          <div style="background: white; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">${req.servicioNombre}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 6px;">${req.servicioArea} · <strong style="font-size: 14px; color: #28a745;">$${req.servicioPrecio}</strong></div>
            <div style="background: #f8f9fa; border-left: 3px solid #ffc107; padding: 8px 10px; border-radius: 6px; margin-top: 8px;">
              <div style="font-size: 10px; font-weight: 600; color: #856404; margin-bottom: 3px;">💬 NOTA DEL STAFF:</div>
              <div style="font-size: 11px; color: #333; font-style: italic;">"${req.nota || 'Sin nota'}"</div>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button onclick="approveAuthorization('${req.id}')" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">✓ Aprobar</button>
            <button onclick="rejectAuthorization('${req.id}')" style="flex: 1; padding: 12px; background: #dc3545; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">✕ Rechazar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error rendering authorizations:', err);
      document.getElementById('authorizationsSection').style.display = 'none';
    }
  }
