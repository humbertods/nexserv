// ================================================
// NEXSERV router.js
// Navegación entre pantallas (función show)
// Depende de: api.js, state.js
// ================================================

  async function show(id) {
    const targetScreen = document.getElementById(id);
    if (!targetScreen) {
      console.error('[show] Pantalla no encontrada:', id);
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const loginEl = document.getElementById('login');
      if (loginEl) loginEl.classList.add('active');
      return;
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    targetScreen.classList.add('active');
    window.scrollTo(0, 0);
    console.log('[show] → ' + id);
    if (id === 'waitList') renderWaitList();
    if (id === 'tableroLineas') {
      renderTableroLineas();
      if (window._tabLineasRefresh) clearInterval(window._tabLineasRefresh);
      window._tabLineasRefresh = setInterval(function(){
        const el = document.getElementById('tableroLineas');
        if (el && el.classList.contains('active')) renderTableroLineas();
        else { clearInterval(window._tabLineasRefresh); window._tabLineasRefresh = null; }
      }, 12000);
    }
    if (id === 'staffHome') {
      loadStaffHome();
      // Auto-refresco del panel de la chica MIENTRAS lo tiene abierto (primer plano).
      // Así la clienta recién asignada aparece sola en pocos segundos, sin depender del push.
      // Se pausa solo si: no es la pantalla activa, la app está en segundo plano, hay un
      // modal abierto, o ya hay una carga en curso (evita solapar llamadas).
      if (window._staffHomeRefresh) clearInterval(window._staffHomeRefresh);
      window._staffHomeRefresh = setInterval(async () => {
        const el = document.getElementById('staffHome');
        if (!el || !el.classList.contains('active')) {
          clearInterval(window._staffHomeRefresh); window._staffHomeRefresh = null; return;
        }
        if (document.hidden || document.querySelector('.modal-bg.active') || window._staffHomeLoading) return;
        window._staffHomeLoading = true;
        try { await loadStaffHome(); } finally { window._staffHomeLoading = false; }
      }, 10000);
    } else if (window._staffHomeRefresh) {
      clearInterval(window._staffHomeRefresh); window._staffHomeRefresh = null;
    }
    if (id === 'ownerHome') {
      loadOwnerHome();
      if (window._ownerHomeRefresh) clearInterval(window._ownerHomeRefresh);
      window._ownerHomeRefresh = setInterval(() => {
        const el = document.getElementById('ownerHome');
        if (el && el.classList.contains('active')) refreshEstadoSalon();
        else { clearInterval(window._ownerHomeRefresh); window._ownerHomeRefresh = null; }
      }, 15000);
    } else if (window._ownerHomeRefresh) {
      clearInterval(window._ownerHomeRefresh); window._ownerHomeRefresh = null;
    }
    if (id === 'ownerPromos') renderPromos();
    if (id === 'staffPromos') await renderStaffPromos();
    if (id === 'assignDirect') { setTimeout(() => renderAssignDirect(), 50); }
    if (id === 'ownerReports') loadOwnerReports();
    if (id === 'ownerPayments') renderPayments();
    if (id === 'ownerSesiones') loadSesiones();
    if (id === 'ownerCaja') {
      loadCajaChicaOwner();
      if (window._ownerCajaRefresh) clearInterval(window._ownerCajaRefresh);
      window._ownerCajaRefresh = setInterval(() => {
        const el = document.getElementById('ownerCaja');
        if (el && el.classList.contains('active')) loadCajaChicaOwner();
        else { clearInterval(window._ownerCajaRefresh); window._ownerCajaRefresh = null; }
      }, 10000);
    } else if (window._ownerCajaRefresh) {
      clearInterval(window._ownerCajaRefresh);
      window._ownerCajaRefresh = null;
    }
    if (id === 'ownerCierreMes') { initCierreMesSelectors(); loadCierreMes(); }
    if (id === 'clientDirectory') { CLIENT_DIRECTORY_CACHE = []; renderClientDirectory(); }
    if (id === 'mikaelaHome') {
      // Guard de rol: mikaelaHome (caja chica, por cobrar, autorizaciones, etc.) es
      // exclusivo de Mikaela (admin) y el Owner. Si llega cualquier otro (rol mal
      // configurado, sesión vieja o navegación cruzada), se la manda a su panel y
      // NO se carga nada del panel de Mikaela.
      const _uMH = window.currentUser;
      const _permitidoMH = _uMH && (_uMH.role === 'admin' || _uMH.role === 'owner');
      if (_uMH && !_permitidoMH) { show('staffHome'); return; }
      loadMikaelaHome();
    }
    if (id === 'staffAsistencia') { _staffAsisCargar(); }
    if (id === 'asistenciaPanel') {
      const esAdmin = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'owner');
      const esOwner = window.currentUser && window.currentUser.role === 'owner';
      const regBox = document.getElementById('asisRegistroBox');
      const infBox = document.getElementById('asisInformeBox');
      const corBox = document.getElementById('asisCorreccionBox');
      if (regBox) regBox.style.display = esAdmin ? 'block' : 'none';
      if (infBox) infBox.style.display = esOwner ? 'block' : 'none';
      if (corBox) corBox.style.display = 'none';
      const mesInp = document.getElementById('asisMesInput');
      if (mesInp && !mesInp.value) {
        const hoy = new Date(); const m = String(hoy.getMonth()+1).padStart(2,'0'); mesInp.value = m + '/' + hoy.getFullYear();
      }
      _asisCargarHoy();
      // Auto-refresh cada 30s mientras el panel de asistencia está visible
      if (window._asisRefreshTimer) clearInterval(window._asisRefreshTimer);
      window._asisRefreshTimer = setInterval(function() {
        var panel = document.getElementById('asistenciaPanel');
        if (panel && panel.style.display !== 'none') {
          _asisCargarHoy();
        } else {
          clearInterval(window._asisRefreshTimer);
          window._asisRefreshTimer = null;
        }
      }, 30000);
    }
    if (id === 'activeService') {
      restoreActivePromos();
      recargarAutorizacionesStaff(1);
      if (typeof _gateCejasBtn === 'function') _gateCejasBtn();  // botón cejas solo para staff de cejas
      setTimeout(async () => {
        const idEsperaActual = window._as1IdEspera || '';
        const clientName = document.getElementById('as1Name')?.textContent?.replace(' ⭐','') || '';
        const clientKey = normalizeClientKey(clientName);
        const user1 = window.currentUser;

        // ── TICKET MULTI (TM): restaurar siempre desde el backend ──────────────
        if (idEsperaActual.startsWith('TM-')) {
          try {
            const tmR = await apiGet('getTicketMulti');
            if (tmR.success) {
              const tm = (tmR.activos || []).find(t => t.idEspera === idEsperaActual);
              if (tm) {
                window._tmAreasActuales = tm.areas || [];
                const miNombreR = user1?.name || '';

                // Separar áreas completadas y activas de esta staff
                const svcListEl1 = document.getElementById('as1ServicesList');
                const areasCompletadasR = (tm.areas || []).filter(a =>
                  String(a.staff||'') === miNombreR &&
                  String(a.estado||'').toLowerCase() === 'completado'
                );
                const misAreasActivas = (tm.areas || []).filter(a =>
                  String(a.staff||'') === miNombreR &&
                  String(a.estado||'').toLowerCase() === 'en servicio'
                );

                // Completadas + en servicio: TODAS dentro de slotServices (no como chips
                // de DOM). Antes la parte completada se inyectaba como chip aparte y
                // CUALQUIER re-render (agregar extra, aprobación) lo borraba (problema 3).
                const _completadas1 = areasCompletadasR.map(ar => ({
                  name: ar.tentativo || ar.confirmado || ar.area || 'Servicio',
                  price: Number(ar.precio || 0),
                  area: ar.area || '',
                  status: 'completado', completada: true
                }));
                const _activas1 = misAreasActivas.map(ar => ({
                  name: ar.tentativo || ar.confirmado || '',
                  price: Number(ar.precio || 0),
                  area: ar.area || user1?.area || 'cejas'
                }));
                slotServices[1] = _completadas1.concat(_activas1);
                if (svcListEl1) [...svcListEl1.querySelectorAll('.tm-completado-chip')].forEach(el => el.remove());
                renderServicesForSlot(1);
                const _tot1 = slotServices[1].reduce((s,v) => (v.status==='pendiente'||v.status==='rechazado') ? s : s + Number(v.price||0), 0);
                document.getElementById('as1Total').textContent = '$' + _tot1;
                document.getElementById('as1SvcCount').textContent = String(slotServices[1].filter(s=>s.status!=='rechazado').length);
                updateFinishButtons(1);
              }
            }
          } catch(eTM) { console.error('Error restaurando TM:', eTM); }
          return; // TM procesado — no seguir con lógica de promo
        }

        // ── PROMO (SP / no-TM): restaurar desde activePromos o backend ─────────
        if (clientName && activePromos[clientKey] && (!slotServices[1] || slotServices[1].length === 0)) {
          const _promo = activePromos[clientKey].promo;
          const _price = getMyPromoPrice(_promo, user1?.area || 'cejas');
          slotServices[1] = [{ name: _promo.name, price: _price, area: user1?.area || 'cejas' }];
          renderServicesForSlot(1);
          document.getElementById('as1Total').textContent = '$' + _price;
          document.getElementById('as1SvcCount').textContent = '1';
          updateFinishButtons(1);
        } else if (clientName && !activePromos[clientKey] && PROMOS.length > 0) {
          try {
            const r = await apiGet('getListaCompleta');
            if (r.success) {
              const atencion = [...(r.enServicio||[])].find(a =>
                a.nombre === clientName || normalizeClientKey(a.nombre) === clientKey
              );
              if (atencion && atencion.promoNombre) {
                const promoFull = PROMOS.find(p => p.name === atencion.promoNombre);
                if (promoFull) {
                  activePromos[clientKey] = {
                    promo: promoFull,
                    startedBy: user1?.area || 'cejas',
                    completedAreas: [],
                    _metadata: { displayName: clientName }
                  };
                  saveActivePromos();
                  const myPrice = getMyPromoPrice(promoFull, user1?.area || 'cejas');
                  slotServices[1] = [{ name: promoFull.name, price: myPrice, area: user1?.area || 'cejas' }];
                  renderServicesForSlot(1);
                  document.getElementById('as1Total').textContent = '$' + myPrice;
                  document.getElementById('as1SvcCount').textContent = '1';
                  updateFinishButtons(1);
                }
              }
            }
          } catch(e) { console.error('Error recargando promo:', e); }
        }
        if (activePromos[clientKey]) updateFinishButtons(1);
        // Restaurar servicios normales (no promo/no TM) si el slot quedó vacío tras refrescar
        await restaurarServiciosNormalesSlot(1);
      }, 500);
    }
    if (id === 'activeService2') {
      restoreActivePromos();
      recargarAutorizacionesStaff(2);
      if (typeof _gateCejasBtn === 'function') _gateCejasBtn();  // botón cejas solo para staff de cejas
      setTimeout(async () => {
        const user2 = window.currentUser;
        const clientName2 = document.getElementById('as2Name')?.textContent?.replace(' ⭐','') || '';
        const clientKey2 = normalizeClientKey(clientName2);
        const idEspera2 = window._as2IdEspera || '';

        // ── TICKET MULTI (TM): restaurar desde el backend (igual que slot 1) ──
        if (idEspera2.startsWith('TM-')) {
          try {
            const tmR2 = await apiGet('getTicketMulti');
            if (tmR2.success) {
              const tm2 = (tmR2.activos || []).find(t => t.idEspera === idEspera2);
              if (tm2) {
                window._tmAreasActuales2 = tm2.areas || [];
                const miNombre2 = user2?.name || '';
                const svcListEl2 = document.getElementById('as2ServicesList');
                // Mis áreas: completadas (✅) + en servicio → TODAS dentro de slotServices
                // (no como chips de DOM, que se borran en cualquier re-render — problema 3).
                const misCompletadas2 = (tm2.areas || []).filter(a =>
                  String(a.staff||'') === miNombre2 && String(a.estado||'').toLowerCase() === 'completado'
                );
                const misAreasActivas2 = (tm2.areas || []).filter(a =>
                  String(a.staff||'') === miNombre2 && String(a.estado||'').toLowerCase() === 'en servicio'
                );
                slotServices[2] = misCompletadas2.map(ar => ({
                  name: ar.tentativo || ar.confirmado || ar.area || 'Servicio',
                  price: Number(ar.precio || 0), area: ar.area || '', status:'completado', completada:true
                })).concat(misAreasActivas2.map(ar => ({
                  name: ar.tentativo || ar.confirmado || '',
                  price: Number(ar.precio || 0), area: ar.area || user2?.area || 'cejas'
                })));
                if (svcListEl2) [...svcListEl2.querySelectorAll('.tm-completado-chip')].forEach(el => el.remove());
                renderServicesForSlot(2);
                // SOLO áreas de OTRA staff → chips de contexto (no editables, no las cobra esta staff)
                const otrasAreas2 = (tm2.areas || []).filter(a => String(a.staff||'') !== miNombre2);
                if (otrasAreas2.length > 0 && svcListEl2) {
                  [...svcListEl2.querySelectorAll('.tm-contexto-chip')].forEach(el => el.remove());
                  const chipsHtml2 = otrasAreas2.map(ar => {
                    const est = String(ar.estado||'').toLowerCase();
                    const completado = est === 'completado' || est === 'finalizado' || est === 'completada';
                    const bg = completado ? 'var(--success-bg)' : 'var(--bg)';
                    const col = completado ? 'var(--success)' : 'var(--ink-soft)';
                    const badge = completado ? '✅ Completado' : '⏳ En espera';
                    return '<div class="tm-contexto-chip" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+bg+';border-radius:12px;margin-bottom:8px;opacity:'+(completado?'1':'0.6')+';">'
                      + '<span style="font-size:16px;">'+(completado?'✅':'⏳')+'</span>'
                      + '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:'+col+';">'
                      + (ar.tentativo || ar.area || 'Servicio') + (ar.staff ? ' · ' + ar.staff : '')
                      + '</div><div style="font-size:11px;color:'+col+';">'+badge+'</div></div>'
                      + '<div style="font-size:13px;font-weight:800;color:'+col+';">$' + (ar.precio || 0) + '</div>'
                      + '</div>';
                  }).join('');
                  svcListEl2.insertAdjacentHTML('beforeend', chipsHtml2);
                }
                // Total y contador (solo lo que cobra esta staff)
                const totalMias2 = slotServices[2].reduce((s,v) => (v.status==='pendiente'||v.status==='rechazado')?s:s + Number(v.price||0), 0);
                document.getElementById('as2Total').textContent = '$' + totalMias2;
                document.getElementById('as2SvcCount').textContent = String(slotServices[2].filter(s=>s.status!=='rechazado').length);
                updateFinishButtons(2);
              }
            }
          } catch(eTM2) { console.error('Error restaurando TM slot 2:', eTM2); }
          return; // TM procesado
        }

        // PROMO: restaurar desde activePromos si el slot quedó vacío
        if (clientName2 && activePromos[clientKey2] && (!slotServices[2] || slotServices[2].length === 0)) {
          const _promo2 = activePromos[clientKey2].promo;
          const _price2 = getMyPromoPrice(_promo2, user2?.area || 'cejas', activePromos[clientKey2].completedAreas || []);
          slotServices[2] = [{ name: _promo2.name, price: _price2, area: user2?.area || 'cejas' }];
          renderServicesForSlot(2);
          document.getElementById('as2Total').textContent = '$' + _price2;
          document.getElementById('as2SvcCount').textContent = '1';
        }
        // NORMAL: restaurar desde backend si sigue vacío
        await restaurarServiciosNormalesSlot(2);
        updateFinishButtons(2);
      }, 500);
    }
    // Detener polling si el staff navega a otra pantalla
    if (id !== 'activeService' && id !== 'activeService2') { detenerPollAutorizaciones(); }
    if (id === 'serviciosHistory') { _setupHistorySelectPorRol(); loadServiciosHistory(); }

    if (id === 'arrivalExisting') {
      document.getElementById('arrivalSearch').value = '';
      document.getElementById('arrivalSearch').style.display = 'block';
      document.getElementById('arrivalClientList').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">Escribí al menos 2 letras para buscar</div>';
      document.getElementById('arrivalClientList').style.display = 'block';
      document.getElementById('arrivalForm').style.display = 'none';
      // Reset promo y secuencia
      resetArrivalExtras();
      document.getElementById('arrService').value = '';
    }
  }
