// NEXSERV nexserv-main-4.js — Owner, reportes, cierres
// Depende de: nexserv-main-3.js

  async function openClientProfile(key) {
    currentProfileClient = key;
    const c = CLIENT_PROFILES[key];
    if (!c) return;

    // Cargar fichas y historial del servidor al abrir el perfil
    try {
      const pr = await apiGet('getPerfilFichas', { codigo: c.code });
      if (pr.success) {
        if (pr.fichasPestanas && pr.fichasPestanas.length > 0) {
          if (!c.pestanas) c.pestanas = { fichas: [], history: [] };
          c.pestanas.fichas = pr.fichasPestanas;
        }
        if (pr.fichaFacial) {
          if (!c.facial) c.facial = { history: [] };
          c.facial.ficha = pr.fichaFacial;
        }
        if (pr.historialFacial && pr.historialFacial.length > 0) {
          if (!c.facial) c.facial = { history: [] };
          c.facial.history = pr.historialFacial.map(h => ({
            service: h.servicio, price: h.precio, date: h.fecha, by: h.staff,
            procedimiento: h.procedimiento, productosUsados: h.productosUsados, obs: h.obs
          }));
        }
        // Fichas de cejas pigmento (se renderizan directo desde backend en renderPigmentoTab)
        if (pr.fichasPigmento) {
          if (!c.pigmento) c.pigmento = {};
          c.pigmento._cached = pr.fichasPigmento; // cache para renderPigmentoTab
        }
      }
    } catch(e) { /* no bloquear si falla */ }
    
    document.getElementById('profileAvatar').textContent = c.initials;
    document.getElementById('profileAvatar').className = 'client-avatar' + (c.isTop ? ' is-top' : '');
    document.getElementById('profileName').textContent = c.name;
    document.getElementById('profileCode').textContent = c.code + ' · ' + c.visits + ' visitas';
    // Privacidad: la staff ve el código en lugar del nombre en el perfil
    if (window.currentUser?.role === 'staff') {
      document.getElementById('profileName').textContent = c.code;
      document.getElementById('profileAvatar').textContent = String(c.code).replace(/[^0-9]/g,'').slice(-2) || '·';
    }
    document.getElementById('profileTopBadge').style.display = c.isTop ? 'block' : 'none';
    document.getElementById('profileVisits').textContent = c.visits;
    document.getElementById('profileSpent').textContent = '$' + c.spent;
    document.getElementById('profileLast').textContent = c.last;
    document.getElementById('profileObs').textContent = c.obs;

    // Datos de facturación de la clienta (desde el directorio: cédula col K, correo col L)
    try {
      const _cd = (typeof CLIENT_DIRECTORY_CACHE !== 'undefined' && Array.isArray(CLIENT_DIRECTORY_CACHE))
        ? CLIENT_DIRECTORY_CACHE.find(function (x) { return x.key === key || x.code === c.code; }) : null;
      const _ced = (_cd && _cd.cedula) ? String(_cd.cedula).trim() : '';
      const _cor = (_cd && _cd.correo) ? String(_cd.correo).trim() : '';
      const _tipo = _ced ? (_ced.replace(/\D/g, '').length === 13 ? 'RUC' : 'Cédula') : '';
      const _body = document.getElementById('profileFactBody');
      if (_body) {
        if (_ced || _cor) {
          _body.innerHTML =
            (_ced ? '<div><b>' + _tipo + ':</b> ' + _ced + '</div>' : '') +
            (_cor ? '<div><b>Correo:</b> ' + _cor + '</div>' : '') +
            (!_ced || !_cor ? '<div style="color:var(--ink-faint);font-size:12px;margin-top:4px;">' + (!_ced && !_cor ? '' : 'Faltan datos · ') + 'Completalos con “✏️ Editar clienta”.</div>' : '');
        } else {
          _body.innerHTML = '<div style="color:var(--ink-faint);">Sin datos de facturación. Registralos con “✏️ Editar clienta”.</div>';
        }
      }
    } catch (eFP) { console.warn('perfil facturación:', eFP); }
    
    // Determinar quién ve el perfil
    const user = window.currentUser;
    
    // Back button: volver a la pantalla anterior correcta
    let backScreen = 'mikaelaHome';
    if (user?.role === 'staff') backScreen = 'activeService';
    if (user?.role === 'owner') backScreen = 'ownerHome';
    if (user?.role === 'admin') backScreen = 'mikaelaHome';
    document.getElementById('profileBackBtn').setAttribute('onclick', "show('" + backScreen + "')");
    
    // Gastado: solo visible para Owner
    const isOwner = user?.role === 'owner';
    document.getElementById('profileSpentStat').style.display = isOwner ? 'block' : 'none';
    document.getElementById('profileStats').style.gridTemplateColumns = isOwner ? '1fr 1fr 1fr' : '1fr 1fr';
    
    // Botón editar: solo visible para CEO/admin
    const isCEO = user?.role === 'admin' || user?.role === 'ceo';
    console.log('🔍 Debug botón editar:', { user: user, role: user?.role, isCEO: isCEO });
    document.getElementById('editClientBtn').style.display = isCEO ? 'inline-block' : 'none';
    
    // Default tab: si es pestañas staff, mostrar pestañas primero
    let defaultTab = 'cejas';
    if (user?.area === 'pestanas') defaultTab = 'pestanas';
    if (user?.area === 'facial') defaultTab = 'facial';
    
    currentProfileTab = defaultTab;
    // Activar el tab correcto visualmente
    document.querySelectorAll('.profile-tab').forEach(b => { b.classList.remove('active-period'); b.style.background = 'transparent'; b.style.color = 'var(--ink-soft)'; });
    const tabs = document.querySelectorAll('.profile-tab');
    const tabIdx = { cejas: 0, depilacion: 1, pigmento: 2, pestanas: 3, facial: 4 };
    if (tabs[tabIdx[defaultTab]]) tabs[tabIdx[defaultTab]].classList.add('active-period');
    
    renderProfileTab();
    show('clientProfile');
  }

  function switchProfileTab(tab, btn) {
    currentProfileTab = tab;
    document.querySelectorAll('.profile-tab').forEach(b => { b.classList.remove('active-period'); b.style.background = 'transparent'; b.style.color = 'var(--ink-soft)'; });
    btn.classList.add('active-period');
    renderProfileTab();
  }

  function renderProfileTab() {
    const c = CLIENT_PROFILES[currentProfileClient];
    if (!c) return;
    const el = document.getElementById('profileTabContent');
    const tab = currentProfileTab;
    const data = c[tab];
    
    if (tab === 'pestanas') {
      renderPestanasTab(el, data, c.name);
    } else if (tab === 'facial') {
      renderFacialTab(el, data, c.name);
    } else if (tab === 'pigmento') {
      renderPigmentoTab(el, c.code, c.name);
    } else {
      renderGenericTab(el, data, tab);
    }
  }

  function renderPestanasTab(el, data, clientName) {
    const fichas = data?.fichas || [];
    const ficha = fichas.find(f => f.activa) || fichas[0] || null;
    const history = data?.history || [];
    const obsArea = data?.obsArea || '';
    const _u = window.currentUser;
    const canRegPest = _u?.area === 'pestanas' || _u?.role === 'owner' || _u?.role === 'admin';
    
    // Determinar si retiro es gratis o $10
    const retiroPrice = currentProfileClient ? getRetiroPrice(currentProfileClient) : 10;
    const retiroBanner = retiroPrice === 0 
      ? '<div style="background: var(--success-bg); border: 1.5px solid #a3d4b1; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;"><div style="font-size: 12px; font-weight: 700; color: var(--success);">✅ Retiro de pestañas/lifting: <strong>GRATIS</strong></div><div style="font-size: 11px; color: #2d5a3a; font-weight: 500; margin-top: 2px;">Clienta con historial en Rosa Aguilera</div></div>'
      : '<div style="background: var(--warning-bg); border: 1.5px solid #e0c89a; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;"><div style="font-size: 12px; font-weight: 700; color: var(--warning);">💰 Retiro de pestañas/lifting: <strong>$10</strong></div><div style="font-size: 11px; color: #7a5a1c; font-weight: 500; margin-top: 2px;">Sin historial en Rosa Aguilera — viene de otro local</div></div>';
    
    el.innerHTML = `
      ${retiroBanner}
      ${obsArea ? `
        <div style="background: var(--top-purple-bg); border: 1.5px solid #d4b5ff; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--top-purple); margin-bottom: 4px;">👁 Obs. de pestañas</div>
          <div style="font-size: 13px; color: #5b21b6; font-weight: 500; line-height: 1.5;">${obsArea}</div>
        </div>
      ` : ''}
      ${ficha ? `
        <div style="background: linear-gradient(135deg, var(--top-purple) 0%, #5b21b6 100%); color: white; border-radius: 22px; padding: 18px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 600; opacity: 0.8; margin-bottom: 10px;">👁 Ficha de pestañas · ${clientName}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background: rgba(255,255,255,0.15); border-radius: var(--radius-sm); padding: 10px 12px;">
              <div style="font-size: 10px; font-weight: 600; opacity: 0.7; margin-bottom: 4px;">Modelo</div>
              <div style="font-size: 15px; font-weight: 800;">${ficha.modelo}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: var(--radius-sm); padding: 10px 12px;">
              <div style="font-size: 10px; font-weight: 600; opacity: 0.7; margin-bottom: 4px;">Diseño</div>
              <div style="font-size: 15px; font-weight: 800;">${ficha.diseno}</div>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 12px;">
            <div style="font-size: 10px; font-weight: 600; opacity: 0.7; margin-bottom: 4px;">Tallas</div>
            <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.05em;">${ficha.tallas}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 10px 12px;">
            <div style="font-size: 10px; font-weight: 600; opacity: 0.7; margin-bottom: 4px;">Observación de pestañas</div>
            <div style="font-size: 12px; font-weight: 500; line-height: 1.5; opacity: 0.95;">${ficha.obs}</div>
          </div>
          <button class="btn-primary" onclick="editPestanasFicha('${currentProfileClient}')" style="width: 100%; margin-top: 12px;">✏️ Editar ficha de pestañas</button>
        </div>
      ` : `
        <div style="background: var(--bg-card); border: 2px dashed var(--line); border-radius: 22px; padding: 24px; text-align: center; margin-bottom: 16px;">
          <div style="font-size: 28px; margin-bottom: 8px;">👁</div>
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Sin ficha de pestañas</div>
          <div style="font-size: 12px; color: var(--ink-soft); margin-bottom: 12px;">Se creará en su primer servicio de pestañas</div>
          <button class="btn-primary" onclick="editPestanasFicha('${currentProfileClient}')" style="width: 100%;">➕ Crear ficha de pestañas</button>
        </div>
      `}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Historial de pestañas${history.length > 0 ? ' <span class="count">' + history.length + '</span>' : ''}</div>
        ${canRegPest ? '<button onclick="openRegistrarVisitaPestanas()" style="padding:7px 14px;background:linear-gradient(135deg,var(--top-purple),#5b21b6);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">➕ Registrar visita</button>' : ''}
      </div>
      ${history.length > 0 ? `
        <div class="card" style="padding: 10px 14px;">
          ${history.map((h, i) => `
            <div style="padding: 10px 0; ${i < history.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 14px; font-weight: 700;">${h.service}</span>
                <span style="font-size: 14px; font-weight: 800;">$${h.price}</span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <span style="background: var(--top-purple-bg); color: var(--top-purple); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-pill);">${h.modelo || '—'}</span>
                <span style="background: var(--info-bg); color: var(--info); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-pill);">${h.diseno || '—'}</span>
                <span style="background: var(--bg); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-pill);">Tallas: ${h.tallas || '—'}</span>
              </div>
              <div style="font-size: 11px; color: var(--ink-faint); margin-top: 4px; font-weight: 500;">${h.date} · por ${h.by}</div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No tiene historial de pestañas</div>'}
    `;
  }

  function renderFacialTab(el, data, clientName) {
    const ficha = data?.ficha;
    const history = data?.history || [];
    const obsArea = data?.obsArea || '';
    const user = window.currentUser;
    const canSeeFicha = user?.area === 'facial' || user?.role === 'owner';
    
    function fichaRow(label, value) {
      return value ? '<div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 12px;"><span style="opacity: 0.7; font-weight: 600;">' + label + '</span><span style="font-weight: 700; text-align: right; max-width: 60%;">' + value + '</span></div>' : '';
    }
    
    // Si NO puede ver la ficha (Mikaela, staff de cejas/pestañas): solo historial
    if (!canSeeFicha) {
      el.innerHTML = `
        <div class="section-title"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d="M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d="M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d="M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d="M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d="M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg> Últimos faciales${history.length > 0 ? ' <span class="count">' + history.length + '</span>' : ''}</div>
        ${history.length > 0 ? `
          <div class="card" style="padding: 10px 14px;">
            ${history.map((h, i) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; ${i < history.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
                <div>
                  <div style="font-size: 14px; font-weight: 700;">${h.service}</div>
                  <div style="font-size: 11px; color: var(--ink-faint); margin-top: 2px; font-weight: 500;">${h.date} · por ${h.by}</div>
                </div>
                <span style="font-size: 14px; font-weight: 800;">$${h.price}</span>
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; padding: 12px; font-size: 11px; color: var(--ink-faint); font-weight: 500;">La ficha clínica completa solo es visible para Laura y el Owner</div>
        ` : '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No tiene historial facial</div>'}
      `;
      return;
    }
    
    // Laura y Owner: ficha completa
    el.innerHTML = `
      ${obsArea ? `
        <div style="background: var(--success-bg); border: 1.5px solid #a3d4b1; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--success); margin-bottom: 4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d="M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d="M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d="M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d="M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d="M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg> Obs. de facial</div>
          <div style="font-size: 13px; color: #2d5a3a; font-weight: 500; line-height: 1.5;">${obsArea}</div>
        </div>
      ` : ''}
      ${ficha ? `
        <div style="background: linear-gradient(135deg, var(--success) 0%, #2d5a3a 100%); color: white; border-radius: 22px; padding: 18px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 600; opacity: 0.8; margin-bottom: 12px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d="M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d="M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d="M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d="M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d="M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg> Ficha facial · ${clientName}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px;">
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Biotipo</div>
              <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">${ficha.biotipo}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Fototipo</div>
              <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">${ficha.fototipo}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Tipo piel</div>
              <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">${ficha.tipoPiel}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px;">
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Edad</div>
              <div style="font-size: 16px; font-weight: 800; margin-top: 2px;">${ficha.edad}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Sexo</div>
              <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">${ficha.sexo}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; text-align: center;">
              <div style="font-size: 9px; opacity: 0.7; font-weight: 600;">Fecha</div>
              <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">${ficha.fecha}</div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 700; opacity: 0.8; margin-bottom: 8px;">🔍 Signos en la piel</div>
            ${fichaRow('Lesiones/Marcas acné', ficha.signosLesiones)}
            ${fichaRow('Hiper pigmentación', ficha.signosHiper)}
            ${fichaRow('Estado de la piel', ficha.estadoPiel)}
          </div>

          <div style="background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 700; opacity: 0.8; margin-bottom: 8px;">🏥 Antecedentes clínicos</div>
            ${fichaRow('Enfermedades', ficha.antecedentes.enfermedades)}
            ${fichaRow('Familiares', ficha.antecedentes.familiares)}
            ${fichaRow('Alergias', ficha.antecedentes.alergias)}
            ${fichaRow('Medicamentos', ficha.antecedentes.medicamentos)}
            ${fichaRow('Quirúrgicos', ficha.antecedentes.quirurgicos)}
            ${fichaRow('Estéticos faciales', ficha.antecedentes.esteticos)}
          </div>

          ${ficha.obsExtra ? `
            <div style="background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 12px;">
              <div style="font-size: 11px; font-weight: 700; opacity: 0.8; margin-bottom: 6px;">📝 Observaciones extras</div>
              <div style="font-size: 12px; font-weight: 500; line-height: 1.5; opacity: 0.95;">${ficha.obsExtra}</div>
            </div>
          ` : ''}
        </div>
      ` : `
        <div style="background: var(--bg-card); border: 2px dashed var(--line); border-radius: 22px; padding: 24px; text-align: center; margin-bottom: 16px;">
          <div style="margin-bottom: 8px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d="M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d="M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d="M18.4,28.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d="M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d="M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg></div>
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Sin ficha facial</div>
          <div style="font-size: 12px; color: var(--ink-soft); margin-bottom: 14px;">Se creará en su primer servicio de facial</div>
          ${window.currentUser?.area === 'facial' || window.currentUser?.role === 'owner' ? '<button onclick="openFacialForm()" style="padding: 14px 28px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;">+ Crear ficha facial</button>' : ''}
        </div>
      `}
      ${ficha && (window.currentUser?.area === 'facial' || window.currentUser?.role === 'owner') ? '<button onclick="openFacialForm(true)" style="width: 100%; padding: 14px; background: var(--bg-card); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; color: var(--ink); margin-bottom: 16px;">✏️ Editar ficha facial</button>' : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Historial facial${history.length > 0 ? ' <span class="count">' + history.length + '</span>' : ''}</div>
        <button onclick="openRegistrarVisitaFacial()" style="padding:7px 14px;background:linear-gradient(135deg,var(--success),#2d5a3a);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">➕ Registrar visita</button>
      </div>
      ${history.length > 0 ? `
        <div class="card" style="padding: 10px 14px;">
          ${history.map((h, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; ${i < history.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
              <div>
                <div style="font-size: 14px; font-weight: 700;">${h.service}</div>
                <div style="font-size: 11px; color: var(--ink-faint); margin-top: 2px; font-weight: 500;">${h.date} · por ${h.by}</div>
              </div>
              <span style="font-size: 14px; font-weight: 800;">$${h.price}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No tiene historial facial</div>'}
    `;
  }

  async function renderPigmentoTab(el, codigo, clientName) {
    // Mostrar loading
    el.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--ink-faint); font-size: 13px;">⏳ Cargando fichas...</div>';
    
    try {
      // Usar cache si está disponible (cargado al abrir el perfil), si no, pedir al servidor
      const c = CLIENT_PROFILES[currentProfileClient];
      const cached = c?.pigmento?._cached;
      let fichas;
      if (cached && cached.some && cached.some(f => String(f.codigo||'').trim() === String(codigo).trim())) {
        fichas = cached;
        if (c.pigmento) c.pigmento._cached = null; // usar una vez y limpiar
      } else {
        const result = await apiGet('getFichaCejasPigmento', { codigo: codigo });
        fichas = result.success ? (result.fichas || []) : [];
      }
      const numSesiones = fichas.length;
      
      // Determinar acceso (staff de cejas + owner)
      const user = window.currentUser;
      const canEdit = user?.area === 'cejas' || user?.role === 'owner' || user?.role === 'admin';
      
      // Calcular próximo retoque si hay sesiones
      let proxRetoque = null;
      if (numSesiones > 0) {
        // Buscar la última "Nueva sesión"
        const nuevaSesion = fichas.find(f => f.tipoSesion === 'Nueva sesión');
        if (nuevaSesion && nuevaSesion.proxRetoque) {
          const fechaRetoque = parseFecha(nuevaSesion.proxRetoque);
          const hoy = new Date();
          const diff = Math.ceil((fechaRetoque - hoy) / (1000 * 60 * 60 * 24));
          proxRetoque = {
            fecha: nuevaSesion.proxRetoque,
            fechaSesion: nuevaSesion.fecha,
            diasRestantes: diff
          };
        }
      }
      
      el.innerHTML = `
        ${proxRetoque ? `
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; border-radius: 20px; padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 8px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z"/><path d="M16.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z"/><path d="M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z"/></svg> Próximo retoque recomendado</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 18px; font-weight: 800; margin-bottom: 2px;">📅 ${proxRetoque.fecha}</div>
                <div style="font-size: 11px; opacity: 0.8;">Desde última sesión: ${proxRetoque.fechaSesion}</div>
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 8px 14px; border-radius: var(--radius-pill); font-size: 13px; font-weight: 700;">
                ${proxRetoque.diasRestantes > 0 ? 'en ' + proxRetoque.diasRestantes + ' días' : (proxRetoque.diasRestantes === 0 ? 'HOY' : 'Vencido')}
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="section-title"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z"/><path d="M16.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z"/><path d="M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z"/></svg> Cejas efecto polvo ${numSesiones > 0 ? '(' + numSesiones + ' sesiones)' : ''}</div>
        
        ${numSesiones > 0 ? `
          <div class="card" style="padding: 10px 14px;">
            ${fichas.map((f, i) => `
              <div style="padding: 12px 0; ${i < fichas.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--ink);">
                      ${f.tipoSesion === 'Nueva sesión' ? '⭐ ' : ''}${f.tipoSesion}
                    </div>
                    <div style="font-size: 11px; color: var(--ink-faint); margin-top: 2px; font-weight: 500;">${f.fecha} · por ${f.responsable}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 11px; color: var(--ink-soft); font-weight: 600;">Color: ${f.color}</div>
                    <div style="font-size: 11px; color: var(--ink-soft); font-weight: 600;">Aguja: ${f.aguja}</div>
                  </div>
                </div>
                ${f.observaciones ? `
                  <div style="font-size: 12px; color: var(--ink-soft); background: var(--bg); padding: 8px 10px; border-radius: var(--radius-sm); margin-top: 6px; line-height: 1.4;">
                    📝 ${f.observaciones}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="background: var(--bg-card); border: 2px dashed var(--line); border-radius: 22px; padding: 24px; text-align: center;">
            <div style="margin-bottom: 8px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z"/><path d="M28.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z"/><path d="M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z"/></svg></div>
            <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Sin historial de pigmentación</div>
            <div style="font-size: 12px; color: var(--ink-soft); margin-bottom: 14px;">La primera sesión se registrará automáticamente</div>
            ${canEdit ? '<button onclick="openCejasPigmentoModal(\'' + codigo + '\', \'' + clientName + '\')" class="btn-primary">+ Registrar primera sesión</button>' : ''}
          </div>
        `}
        
        ${canEdit && numSesiones > 0 ? `
          <button onclick="openCejasPigmentoModal('${codigo}', '${clientName}')" class="btn-primary" style="width: 100%; margin-top: 16px;">+ Registrar nueva sesión</button>
        ` : ''}
      `;
    } catch (err) {
      console.error('Error cargando fichas pigmento:', err);
      el.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger); font-size: 13px;">❌ Error cargando fichas</div>';
    }
  }
  
  function parseFecha(fechaStr) {
    // Espera formato DD/MM/YYYY
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return new Date();
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  function renderGenericTab(el, data, tab) {
    const history = data?.history || [];
    const obsArea = data?.obsArea || '';
    const icons = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>' };
    const labels = { cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilación' };
    const colors = { cejas: { bg: '#fff5eb', border: '#f0d9b8', text: '#8a5a2a' }, depilacion: { bg: '#f0f7ff', border: '#b8d4f0', text: '#2b5aa0' } };
    const c = colors[tab] || colors.cejas;
    
    el.innerHTML = `
      ${obsArea ? `
        <div style="background: ${c.bg}; border: 1.5px solid ${c.border}; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: ${c.text}; margin-bottom: 4px;">${icons[tab]} Obs. de ${labels[tab]}</div>
          <div style="font-size: 13px; color: ${c.text}; font-weight: 500; line-height: 1.5;">${obsArea}</div>
        </div>
      ` : ''}
      <div class="section-title">${icons[tab]} Historial de ${labels[tab]}${history.length > 0 ? ' <span class="count">' + history.length + '</span>' : ''}</div>
      ${history.length > 0 ? `
        <div class="card" style="padding: 10px 14px;">
          ${history.map((h, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; ${i < history.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
              <div>
                <div style="font-size: 14px; font-weight: 700;">${h.service}</div>
                <div style="font-size: 11px; color: var(--ink-faint); margin-top: 2px; font-weight: 500;">${h.date} · por ${h.by}</div>
              </div>
              <span style="font-size: 14px; font-weight: 800;">$${h.price}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No tiene historial en esta área</div>'}
    `;
  }

  // === REPORTES ===
  let currentPeriod = 'dia';
  let REPORT_DATA = {}; // Se carga dinamicamente desde el backend

  const STAFF_META = {
    'Maria':  { key: 'maria',  area: 'Cejas · Depilacion · Lifting' },
    'María':  { key: 'maria',  area: 'Cejas · Depilacion · Lifting' },
    'Lesly':  { key: 'lesly',  area: 'Cejas · Depilacion · Lifting' },
    'Keyla':  { key: 'keyla',  area: 'Cejas · Depilacion · Lifting' },
    'Rosa':   { key: 'rosa',   area: 'Cejas · Depilacion · Lifting' },
    'Yadira': { key: 'yadira', area: 'Pestanas' },
    'Diana':  { key: 'diana',  area: 'Pestanas' },
    'Laura':  { key: 'laura',  area: 'Facial' },
  };

  function emptyPeriodData() {
    return { servicios: 0, facturado: 0, comision: 0, clientas: 0, promos: 0, desglose: [], top: [] };
  }

  // Staff disponibles por área (para que Mikaela asigne). Se arma desde STAFF_META,
  // deduplicando por persona y prefiriendo el nombre con tilde (igual al login).
  function buildStaffPorArea() {
    const prefNombre = {}, areaDe = {};
    Object.entries(STAFF_META).forEach(([nombre, meta]) => {
      const cur = prefNombre[meta.key];
      const tieneTilde = /[áéíóúñ]/i.test(nombre);
      const curTilde = cur ? /[áéíóúñ]/i.test(cur) : false;
      if (!cur || (tieneTilde && !curTilde)) prefNombre[meta.key] = nombre;
      areaDe[meta.key] = (meta.area || '').toLowerCase();
    });
    const map = { cejas: [], depilacion: [], pestanas: [], retiro_lifting: [], facial: [] };
    const todos = [];
    Object.keys(prefNombre).forEach(key => {
      const nombre = prefNombre[key];
      const a = areaDe[key];
      todos.push(nombre);
      if (a.includes('cejas')) {
        map.cejas.push(nombre);
        map.depilacion.push(nombre);
        map.retiro_lifting.push(nombre);  // lifting/retiro es staff de cejas
      }
      if (a.includes('pestan')) { map.pestanas.push(nombre); }  // Yadira/Diana solo pestanas
      if (a.includes('facial')) { map.facial.push(nombre); }
    });
    map._todos = todos;
    return map;
  }
  const STAFF_POR_AREA = buildStaffPorArea();

  // ── Reasignación de staff por Mikaela (multi-servicio / promo-dúo) ──
  function _normAreaKey(a){
    const x = String(a||'').toLowerCase()
      .replace(/[óòö]/g,'o').replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[úùü]/g,'u').replace(/ñ/g,'n').trim();
    if (x.indexOf('lifting')>=0 || x.indexOf('retiro')>=0) return 'retiro_lifting';
    if (x.indexOf('cej')>=0) return 'cejas';
    if (x.indexOf('depil')>=0) return 'depilacion';
    if (x.indexOf('pest')>=0) return 'pestanas';
    if (x.indexOf('facial')>=0 || x.indexOf('hidra')>=0 || x.indexOf('limpieza')>=0) return 'facial';
    return x;
  }
  function _staffOpcionesReasignar(areaKey, busySet){
    const lista = (areaKey && STAFF_POR_AREA[areaKey] && STAFF_POR_AREA[areaKey].length)
      ? STAFF_POR_AREA[areaKey] : STAFF_POR_AREA._todos;
    const busy = busySet || new Set();
    return '<option value="">Elegí staff…</option>' + lista.map(function(n){
      const ocup = busy.has(String(n).toLowerCase());
      return '<option value="'+n+'">'+n+(ocup?' (Ocupada)':' (Disponible)')+'</option>';
    }).join('');
  }
  async function reasignarStaff(idEspera, areaIdx, selId, nombre, codigo){
    const sel = document.getElementById(selId);
    const chica = sel ? sel.value : '';
    if (!chica) { alert('Elegí una staff'); return; }
    try {
      const r = await apiPost('asignarStaff', { idEspera: idEspera, areaIdx: areaIdx || '', chicaNombre: chica });
      if (r && r.success) {
        if (typeof showToast === 'function') showToast('✓ ' + (nombre||'Clienta') + ' reasignada a ' + chica);
        // Notificar SOLO a la staff asignada (no a toda el área)
        try { enviarPushStaff([chica], '📌 Clienta asignada a vos', (codigo || 'Clienta')); } catch(ePush) {}
        loadMikaelaHome();
      } else {
        alert('Error: ' + ((r && (r.message || r.error)) || 'No se pudo reasignar'));
      }
    } catch(e){ console.error(e); alert('Error al reasignar'); }
  }
  async function retirarYCobrar(idEspera, nombre){
    if (!confirm('¿' + (nombre || 'La clienta') + ' se retira?\n\nSe anularán los servicios pendientes y se cobrará SOLO lo ya realizado.')) return;
    try {
      const r = await apiPost('retirarYCobrar', { idEspera: idEspera });
      if (r && r.success) {
        if (typeof showToast === 'function') showToast('✓ ' + (nombre||'Clienta') + ' a cobro (solo lo realizado)');
        loadMikaelaHome();
      } else {
        alert(((r && (r.message || r.error)) || 'No se pudo procesar el retiro'));
      }
    } catch(e){ console.error(e); alert('Error al procesar el retiro'); }
  }

  // ── Desglose + acciones de "clienta completada" (verificación de Mikaela) ──
  function _desgloseFilas(c){
    let filas = [];
    if (Array.isArray(c.areas) && c.areas.length) {
      c.areas.forEach(function(a){
        const est = String(a.estado||'').toLowerCase();
        if (est === 'cancelado') return;
        const lbl = (a.confirmado || a.tentativo || a.area || 'Servicio');
        const done = est === 'completado';
        // Si el área es una promo de catálogo con división, mostrar sus sub-servicios de ESTA
        // área (lo que incluye el combo) en vez de una sola línea con el nombre de la promo.
        var promoCat = (typeof PROMOS !== 'undefined' && PROMOS)
          ? PROMOS.find(function(p){ return p.name === lbl && p.division && p.division.length; }) : null;
        var akArea = String(a.area||'').toLowerCase();
        var subPartes = promoCat
          ? promoCat.division.filter(function(d){
              if (Number(d.monto||0) <= 0) return false;
              if (typeof AREA_KEY_FROM_DIV !== 'function') return true;
              return AREA_KEY_FROM_DIV(d.realArea || d.area || d.servicio || '') === akArea;
            })
          : [];
        if (subPartes.length > 1) {
          subPartes.forEach(function(d){
            filas.push({ label: (d.servicio || d.area || lbl), staff: a.staff||'—', monto: Number(d.monto||0), done: done });
          });
        } else {
          filas.push({ label: lbl, staff: a.staff||'—', monto: Number(a.precio||0), done: done });
        }
      });
    } else if (Array.isArray(c.serviciosDetalle) && c.serviciosDetalle.length) {
      c.serviciosDetalle.forEach(function(d){
        filas.push({ label: (d.servicio || d.area || 'Servicio'), staff: d.staff||'—', monto: Number(d.monto||0), done: true });
      });
    } else {
      const obs = String(c.observaciones||'');
      obs.split('|').forEach(function(p){
        const m = p.match(/✅\s*([\wáéíóúñ\/ ]+?)\s+completad[ao] por\s+([^·|]+)/i);
        if (m) filas.push({ label: m[1].trim(), staff: m[2].trim(), monto: 0, done: true });
      });
      if (c.servicio) filas.push({ label: c.servicio, staff: c.tomadaPor||'—', monto: Number(c.total||0), done: true });
    }
    if (!filas.length && c.servicio) filas.push({ label: c.servicio, staff: c.tomadaPor||'—', monto: Number(c.total||0), done: true });
    return filas;
  }
  function _desgloseTotal(c){
    return _desgloseFilas(c).reduce(function(s,r){ return s + Number(r.monto||0); }, 0);
  }
  function buildDesgloseHTML(c){
    return _desgloseFilas(c).map(function(r){
      const ic = r.done ? '✅' : '⏳';
      const col = r.done ? 'var(--success)' : 'var(--accent-deep)';
      const right = r.done
        ? (r.staff + (r.monto ? (' · $'+r.monto) : ''))
        : ((r.staff && r.staff !== '—') ? (r.staff + ' · por confirmar') : 'falta asignar staff');
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px;">'
        + '<span style="color:'+col+';font-weight:700;">'+ic+' '+r.label+'</span>'
        + '<span style="color:var(--ink-soft);white-space:nowrap;">'+right+'</span></div>';
    }).join('');
  }
  function buildCompletadaCard(c){
    const nombreSafe = String(c.nombre||'').replace(/'/g, "\\'");
    // Total visible = suma de los servicios mostrados (agendados + extras)
    const total = _desgloseTotal(c) || Number(c.total||0);
    const totalStr = total > 0
      ? '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);"><span style="font-size:11px;color:var(--ink-faint);font-weight:700;">TOTAL</span><span style="font-size:16px;font-weight:800;color:var(--accent-deep);">$'+total.toFixed(2)+'</span></div>'
      : '';
    return `
      <div class="waitlist-card" style="border:2px solid var(--success);">
        <div class="waitlist-top">
          <div class="waitlist-client">
            <div class="waitlist-code">${c.codigo||''} · llegó ${c.horaLlegada||''}</div>
            <div class="waitlist-name">${c.nombre||''} <span style="background:var(--success);color:white;font-size:10px;padding:2px 8px;border-radius:100px;font-weight:700;">✅ Completada</span></div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--ink-soft);font-weight:700;margin:8px 0 6px;">Verificá lo realizado:</div>
        <div style="background:var(--bg);border-radius:12px;padding:8px 12px;">${buildDesgloseHTML(c)}</div>
        ${totalStr}
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button onclick="agregarServicioExtra('${c.idEspera}','${c.codigo||''}','${nombreSafe}')" style="flex:1;padding:11px;background:var(--bg-card);color:var(--ink);border:1.5px solid var(--ink);border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">+ Servicio Extra</button>
          <button onclick="mandarACobro('${c.idEspera}','${nombreSafe}')" style="flex:1;padding:11px;background:var(--ink);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">Mandar a cobro</button>
          <button onclick="eliminarTicketEspera('${c.idEspera}','${nombreSafe}')" title="Borrar ticket" style="padding:11px 13px;background:var(--bg-card);color:var(--danger);border:1.5px solid var(--danger);border-radius:var(--radius-pill);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">🗑</button>
        </div>
      </div>`;
  }
  async function mandarACobro(idEspera, nombre){
    if (!confirm('¿Mandar a cobro a ' + (nombre || 'esta clienta') + '?')) return;
    try {
      const r = await apiPost('mandarACobro', { idEspera: idEspera });
      if (r && r.success) {
        if (typeof showToast === 'function') showToast('✓ ' + (nombre||'Clienta') + ' enviada a cobro');
        loadMikaelaHome();
      } else {
        alert('Error: ' + ((r && (r.message || r.error)) || 'No se pudo enviar a cobro'));
      }
    } catch(e){ console.error(e); alert('Error al mandar a cobro'); }
  }
  function agregarServicioExtra(idEspera, codigo, nombre){
    // Reusa el modal de asignar servicio (área + servicio + staff) en "modo extra":
    // al confirmar, agrega el servicio al MISMO ticket y lo reabre a la lista.
    openAssignServiceModal(codigo, nombre, idEspera);
  }

  function opcionesStaff(area) {
    const lista = (area && STAFF_POR_AREA[area] && STAFF_POR_AREA[area].length)
      ? STAFF_POR_AREA[area] : STAFF_POR_AREA._todos;
    return '<option value="">¿Qué staff la atiende?</option>' +
      lista.map(n => '<option value="' + n + '">' + n + '</option>').join('');
  }

  function buildEmptyReportData() {
    const data = {};
    Object.entries(STAFF_META).forEach(([nombre, meta]) => {
      if (!data[meta.key]) {
        data[meta.key] = {
          name: nombre,
          area: meta.area,
          dia: emptyPeriodData(),
          semana: emptyPeriodData(),
          mes: emptyPeriodData()
        };
      }
    });
    return data;
  }

  async function loadReportData() {
    const now = new Date();
    // Formato dd/MM/yyyy consistente con el backend
    const pad = n => String(n).padStart(2,'0');
    const hoy = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' + now.getFullYear();

    // Inicio de semana (lunes) y mes
    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - dayOfWeek); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    REPORT_DATA = buildEmptyReportData();

    try {
      // Cargar datos de la semana desde hoja Comisiones (acumulados semanales)
      const comResult = await apiGet('getComisiones');
      if (comResult.success && comResult.comisiones) {
        comResult.comisiones.forEach(function(c) {
          const chica = String(c.chica || '').trim();
          const meta = STAFF_META[chica];
          if (!meta) return;
          const key = meta.key;
          if (!REPORT_DATA[key]) return;
          REPORT_DATA[key].semana.servicios = Number(c.servicios || 0);
          REPORT_DATA[key].semana.facturado = Number(c.facturado || 0);
          REPORT_DATA[key].semana.comision = Number(c.comision || 0);
          REPORT_DATA[key].semana.clientas = Number(c.servicios || 0); // aprox
          // Mes = semana por ahora (hasta tener historial completo)
          REPORT_DATA[key].mes.servicios = Number(c.servicios || 0);
          REPORT_DATA[key].mes.facturado = Number(c.facturado || 0);
          REPORT_DATA[key].mes.comision = Number(c.comision || 0);
          REPORT_DATA[key].mes.clientas = Number(c.servicios || 0);
        });
      }

      // Cargar datos de HOY desde serviciosHoy de cada staff
      const histResult = await apiGet('getHistorial', { periodo: 'hoy' });
      if (histResult.success && histResult.historial) {
        const clientasHoy = new Set();
        histResult.historial.forEach(function(h) {
          const chica = String(h.chica || '').trim();
          const meta = STAFF_META[chica];
          if (!meta) return;
          const key = meta.key;
          if (!REPORT_DATA[key]) return;
          const precio = Number(h.precio || 0);
          const comision = Number(h.comision || 0);
          const clientaKey = key + '_' + (h.codigo || h.nombre);
          REPORT_DATA[key].dia.servicios++;
          REPORT_DATA[key].dia.facturado += precio;
          REPORT_DATA[key].dia.comision += comision;
          if (!clientasHoy.has(clientaKey)) { clientasHoy.add(clientaKey); REPORT_DATA[key].dia.clientas++; }
        });
      }
    } catch(e) {
      console.error('Error cargando reporte:', e);
    }
  }

    function switchPeriod(period, btn) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => { b.classList.remove('active-period'); b.style.background = 'transparent'; b.style.color = 'var(--ink-soft)'; });
    btn.classList.add('active-period');
    renderReport();
  }

  let _ownerRptPeriod = 'hoy';

  const _OW_DIAS = {0:'Domingo',1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado'};
  const _OW_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function _owParseFecha(s) {
    const p = String(s || '').split('/');
    if (p.length !== 3) return null;
    const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Semana del mes con semanas alineadas a lunes (la semana 1 contiene el día 1)
  function _owSemanaDelMes(d) {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Math.ceil((d.getDate() + offset) / 7);
  }
  function _owFmtDia(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return _OW_DIAS[d.getDay()] + ' ' + dd + '/' + mm;
  }

  function _owMarcarBoton() {
    document.querySelectorAll('#ownerReports .period-btn').forEach(b => {
      b.classList.remove('active-period');
      b.style.background = 'transparent';
      b.style.color = 'var(--ink-soft)';
    });
    const cap = _ownerRptPeriod.charAt(0).toUpperCase() + _ownerRptPeriod.slice(1);
    const act = document.getElementById('ownerPeriod' + cap);
    if (act) { act.classList.add('active-period'); act.style.background = ''; act.style.color = ''; }
  }

  function ownerSetPeriod(period, btn) {
    _ownerRptPeriod = period;
    _owMarcarBoton();
    loadOwnerReports();
  }

  async function renderReport() { loadOwnerReports(); }

  // Toggle genérico para cualquier acordeón de reportes
  function owToggle(id) {
    const el = document.getElementById('owblk-' + id);
    const ar = document.getElementById('owarw-' + id);
    if (!el) return;
    const open = el.style.display !== 'none';
    el.style.display = open ? 'none' : 'block';
    if (ar) ar.textContent = open ? '▼' : '▲';
  }

  // Agrupar registros por staff (ordenado por facturado desc)
  function _owGroupStaff(recs) {
    const m = {};
    recs.forEach(r => {
      if (!m[r.staff]) m[r.staff] = { nombre: r.staff, total: 0, comm: 0, servicios: [] };
      m[r.staff].total += r.valor;
      m[r.staff].comm += r.comision;
      m[r.staff].servicios.push(r);
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }

  // Agrupar registros por día (ordenado por fecha desc)
  function _owGroupDias(recs) {
    const m = {};
    recs.forEach(r => {
      const k = r.d.getFullYear() + '-' + r.d.getMonth() + '-' + r.d.getDate();
      if (!m[k]) m[k] = { key: k, d: r.d, recs: [] };
      m[k].recs.push(r);
    });
    return Object.values(m).sort((a, b) => b.d - a.d);
  }

  // Bloque de staff con servicios (nivel hoja)
  function _owStaffBlock(staffList, pfx) {
    return staffList.map((s, si) => {
      const id = pfx + '-s' + si;
      return '<div style="margin-top:4px;">' +
        '<div onclick="owToggle(\'' + id + '\')" style="background:var(--chip);border-radius:12px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">' +
          '<div><div style="font-size:13px;font-weight:700;">' + s.nombre + '</div>' +
          '<div style="font-size:11px;color:var(--ink-soft);">' + s.servicios.length + ' servicio' + (s.servicios.length !== 1 ? 's' : '') + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;"><div style="text-align:right;">' +
          '<div style="font-size:14px;font-weight:800;">$' + s.total.toFixed(0) + '</div>' +
          '<div style="font-size:10px;color:var(--danger);">Com. $' + s.comm.toFixed(1) + '</div></div>' +
          '<div id="owarw-' + id + '" style="color:var(--ink-faint);font-size:11px;">▼</div></div>' +
        '</div>' +
        '<div id="owblk-' + id + '" style="display:none;background:var(--bg-card);border-radius:0 0 12px 12px;padding:4px 14px 10px;">' +
          s.servicios.map((sv, svi) =>
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;' + (svi < s.servicios.length - 1 ? 'border-bottom:1px solid var(--line);' : '') + '">' +
              '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + sv.cliente + '</div>' +
              '<div style="font-size:11px;color:var(--ink-soft);">' + sv.servicio + ' · ' + sv.hora + ' · ' + sv.metodo + '</div>' +
              '<div style="font-size:10px;color:var(--danger);margin-top:2px;">Com. $' + sv.comision.toFixed(2) + '</div>' +
              (sv.notaAjuste ? '<div style="font-size:10px;color:#8a6d00;background:#fff8e1;border:1px solid #f0c040;border-radius:6px;padding:3px 7px;margin-top:4px;display:inline-block;">✏️ ' + sv.notaAjuste + '</div>' : '') + '</div>' +
              '<div style="display:flex;align-items:center;gap:8px;"><div style="font-size:14px;font-weight:800;color:var(--success);">$' + sv.valor.toFixed(0) + '</div>' +
              '<button onclick="ownerConfirmEliminar(' + sv.itemIdx + ')" style="background:none;border:1.5px solid var(--danger);color:var(--danger);border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:13px;flex-shrink:0;">🗑</button></div>' +
            '</div>'
          ).join('') +
          '<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--line);margin-top:2px;">' +
            '<div style="font-size:12px;font-weight:700;color:var(--ink-soft);">SUBTOTAL</div>' +
            '<div style="font-size:14px;font-weight:800;">$' + s.total.toFixed(0) + '</div></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // Bloque de días (cada uno abre a staff)
  function _owDiaBlock(dias, pfx) {
    return dias.map((dd, i) => {
      const id = pfx + '-d' + i;
      const staffList = _owGroupStaff(dd.recs);
      const total = dd.recs.reduce((s, r) => s + r.valor, 0);
      const comm = dd.recs.reduce((s, r) => s + r.comision, 0);
      return '<div style="margin-top:6px;">' +
        '<div onclick="owToggle(\'' + id + '\')" style="background:var(--bg-card);border-radius:14px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
          '<div><div style="font-size:15px;font-weight:700;">' + _owFmtDia(dd.d) + '</div>' +
          '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">' + staffList.length + ' staff · ' + dd.recs.length + ' servicios</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;"><div><div style="font-size:16px;font-weight:800;color:var(--ink);text-align:right;">$' + total.toFixed(0) + '</div>' +
          '<div style="font-size:10px;color:var(--danger);text-align:right;">Com. $' + comm.toFixed(1) + '</div></div>' +
          '<div id="owarw-' + id + '" style="color:var(--ink-faint);font-size:11px;">▼</div></div>' +
        '</div>' +
        '<div id="owblk-' + id + '" style="display:none;padding:0 4px;">' + _owStaffBlock(staffList, id) + '</div>' +
      '</div>';
    }).join('');
  }

  // HOY: solo los servicios del día, por staff
  function _owRenderHoy(recs, now) {
    const staffList = _owGroupStaff(recs);
    const head = '<div class="section-title" style="margin-top:4px;">' + _owFmtDia(now) + '</div>';
    if (!staffList.length) return head + '<div style="text-align:center;padding:14px;color:var(--ink-faint);">Sin servicios cobrados hoy</div>';
    return head + _owStaffBlock(staffList, 'h');
  }

  // SEMANA: un acordeón por cada semana del mes en curso → días → staff
  function _owRenderSemanas(recs, now) {
    const m = {};
    recs.forEach(r => {
      const w = _owSemanaDelMes(r.d);
      if (!m[w]) m[w] = { w: w, recs: [] };
      m[w].recs.push(r);
    });
    const semanas = Object.values(m).sort((a, b) => b.w - a.w);
    let html = '<div class="section-title" style="margin-top:4px;">' + _OW_MESES[now.getMonth()] + ' · por semana</div>';
    html += semanas.map((sm) => {
      const id = 'w' + sm.w;
      const dias = _owGroupDias(sm.recs);
      const total = sm.recs.reduce((s, r) => s + r.valor, 0);
      const comm = sm.recs.reduce((s, r) => s + r.comision, 0);
      const nStaff = new Set(sm.recs.map(r => r.staff)).size;
      const fechas = sm.recs.map(r => r.d).sort((a, b) => a - b);
      const rango = fechas.length ? (String(fechas[0].getDate()).padStart(2, '0') + '–' + String(fechas[fechas.length - 1].getDate()).padStart(2, '0')) : '';
      return '<div style="margin-top:6px;">' +
        '<div onclick="owToggle(\'' + id + '\')" style="background:var(--bg-card);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
          '<div><div style="font-size:16px;font-weight:800;">Semana ' + sm.w + '</div>' +
          '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">' + (rango ? rango + ' · ' : '') + nStaff + ' staff · ' + sm.recs.length + ' servicios</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;"><div><div style="font-size:16px;font-weight:800;color:var(--ink);text-align:right;">$' + total.toFixed(0) + '</div>' +
          '<div style="font-size:10px;color:var(--danger);text-align:right;">Com. $' + comm.toFixed(1) + '</div></div>' +
          '<div id="owarw-' + id + '" style="color:var(--ink-faint);font-size:11px;">▼</div></div>' +
        '</div>' +
        '<div id="owblk-' + id + '" style="display:none;padding:0 2px;">' + _owDiaBlock(dias, id) + '</div>' +
      '</div>';
    }).join('');
    return html;
  }

  // MES: un acordeón por cada mes del histórico → días → staff
  function _owRenderMeses(recs) {
    const m = {};
    recs.forEach(r => {
      const k = r.d.getFullYear() + '-' + String(r.d.getMonth()).padStart(2, '0');
      if (!m[k]) m[k] = { key: k, y: r.d.getFullYear(), mo: r.d.getMonth(), recs: [] };
      m[k].recs.push(r);
    });
    const meses = Object.values(m).sort((a, b) => (b.y - a.y) || (b.mo - a.mo));
    let html = '<div class="section-title" style="margin-top:4px;">Histórico por mes</div>';
    html += meses.map((mm) => {
      const id = 'm' + mm.key.replace(/[^0-9]/g, '');
      const dias = _owGroupDias(mm.recs);
      const total = mm.recs.reduce((s, r) => s + r.valor, 0);
      const comm = mm.recs.reduce((s, r) => s + r.comision, 0);
      const nStaff = new Set(mm.recs.map(r => r.staff)).size;
      return '<div style="margin-top:6px;">' +
        '<div onclick="owToggle(\'' + id + '\')" style="background:var(--bg-card);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:var(--shadow-card);">' +
          '<div><div style="font-size:16px;font-weight:800;">' + _OW_MESES[mm.mo] + ' ' + mm.y + '</div>' +
          '<div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">' + nStaff + ' staff · ' + mm.recs.length + ' servicios</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;"><div><div style="font-size:16px;font-weight:800;color:var(--ink);text-align:right;">$' + total.toFixed(0) + '</div>' +
          '<div style="font-size:10px;color:var(--danger);text-align:right;">Com. $' + comm.toFixed(1) + '</div></div>' +
          '<div id="owarw-' + id + '" style="color:var(--ink-faint);font-size:11px;">▼</div></div>' +
        '</div>' +
        '<div id="owblk-' + id + '" style="display:none;padding:0 2px;">' + _owDiaBlock(dias, id) + '</div>' +
      '</div>';
    }).join('');
    return html;
  }

  // Venta de productos del período (sin comisión)
  function _owRenderProductos(prod, total) {
    return '<div style="margin-top:8px;">' +
      '<div class="section-title">Venta de productos</div>' +
      '<div style="background:var(--bg-card);border-radius:16px;padding:14px 16px;border-left:4px solid var(--accent);">' +
        prod.map(p =>
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);">' +
            '<div><div style="font-size:13px;font-weight:600;">' + (p.nombre || p.clienteNombre || '—') + '</div>' +
            '<div style="font-size:11px;color:var(--ink-soft);">' + String(p.servicio || '').replace('🛍 ', '') + ' · ' + (p.hora || '') + '</div></div>' +
            '<div style="font-size:14px;font-weight:800;color:var(--accent-deep);">$' + Math.round(Number(p.precio || 0)) + '</div>' +
          '</div>'
        ).join('') +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:4px;">' +
          '<div style="font-size:12px;font-weight:700;color:var(--ink-soft);">TOTAL PRODUCTOS · Sin comisión</div>' +
          '<div style="font-size:16px;font-weight:800;color:var(--accent-deep);">$' + total.toFixed(2) + '</div></div>' +
      '</div></div>';
  }

  async function loadOwnerReports() {
    const list = document.getElementById('ownerRptList');
    if (!list) return;
    _owMarcarBoton();
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Cargando...</div>';

    try {
      const result = await apiGet('getHistorial', { periodo: 'todo' });
      if (!result.success || !result.historial) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin datos</div>';
        return;
      }

      const now = new Date();
      const soloServicios = result.historial.filter(h => String(h.metodoPago || '').toLowerCase() !== 'producto');
      const soloProductos = result.historial.filter(h => String(h.metodoPago || '').toLowerCase() === 'producto');

      // Define qué entra en el período seleccionado
      function enScope(d) {
        if (!d) return false;
        if (_ownerRptPeriod === 'hoy') return d.toDateString() === now.toDateString();
        if (_ownerRptPeriod === 'semana') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true; // mes => todo el histórico (agrupado por mes)
      }

      window._ownerRptItems = [];
      const recs = [];
      soloServicios.forEach(h => {
        const d = _owParseFecha(h.fecha);
        if (!enScope(d)) return;
        const idx = window._ownerRptItems.length;
        window._ownerRptItems.push(h);
        recs.push({
          d: d,
          staff: String(h.chica || '—'),
          cliente: h.nombre || h.clienteNombre || '—',
          servicio: h.servicio || '—',
          valor: Number(h.precio || 0),
          comision: Number(h.comision || 0),
          hora: h.hora || '',
          metodo: h.metodoPago || 'Efectivo',
          notaAjuste: h.notaAjuste || '',
          itemIdx: idx
        });
      });

      const prodScope = soloProductos.filter(p => enScope(_owParseFecha(p.fecha)));

      // Stats globales — se recalculan según el período marcado
      const totalServ = recs.reduce((s, r) => s + r.valor, 0);
      const totalComm = recs.reduce((s, r) => s + r.comision, 0);
      const totalProd = prodScope.reduce((s, p) => s + Number(p.precio || 0), 0);
      document.getElementById('ownerRptServicios').textContent = recs.length;
      document.getElementById('ownerRptTotal').textContent = '$' + (totalServ + totalProd).toFixed(0);
      document.getElementById('ownerRptComm').textContent = '$' + totalComm.toFixed(0);
      document.getElementById('ownerRptCount').textContent = recs.length;

      if (!recs.length && !prodScope.length) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin registros en este período</div>';
        return;
      }

      let html = '';
      if (_ownerRptPeriod === 'hoy') html = _owRenderHoy(recs, now);
      else if (_ownerRptPeriod === 'semana') html = _owRenderSemanas(recs, now);
      else html = _owRenderMeses(recs);

      if (prodScope.length) html += _owRenderProductos(prodScope, totalProd);

      list.innerHTML = html || '<div style="text-align:center;padding:20px;color:var(--ink-faint);">Sin registros</div>';

    } catch (e) {
      console.error(e);
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Error cargando datos</div>';
    }
  }

  // Eliminar servicio desde reportes del owner (usa _ownerRptItems, recarga reportes)
  function ownerConfirmEliminar(idx) {
    const item = (window._ownerRptItems || [])[idx];
    if (!item) return;
    const msg = '¿Eliminar este registro?\n\n• Cliente: ' + (item.nombre || item.clienteNombre) +
      '\n• Servicio: ' + item.servicio + '\n• Staff: ' + item.chica + '\n• Monto: $' + item.precio +
      '\n\nEsto revertirá la comisión y eliminará el registro. No se puede deshacer.';
    if (!confirm(msg)) return;
    ownerEliminarServicio(item);
  }

  async function ownerEliminarServicio(item) {
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
        loadOwnerReports();
        if (typeof loadCajaChica === 'function') loadCajaChica();
      } else {
        alert('Error al eliminar: ' + (result.error || 'desconocido'));
      }
    } catch (e) {
      alert('Error de conexión al eliminar');
    }
  }

  function renderTeamReport(el) {
    const p = currentPeriod;
    const periodLabel = p === 'dia' ? 'Hoy' : p === 'semana' ? 'Esta semana' : 'Este mes';
    const staff = Object.values(REPORT_DATA);
    const totalServ = staff.reduce((s, c) => s + c[p].servicios, 0);
    const totalFact = staff.reduce((s, c) => s + c[p].facturado, 0);
    const totalComm = staff.reduce((s, c) => s + c[p].comision, 0);
    const totalClients = staff.reduce((s, c) => s + c[p].clientas, 0);

    el.innerHTML = `
      <div class="stat-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 16px;">
        <div class="stat"><div class="label">Servicios</div><div class="value">${totalServ}</div></div>
        <div class="stat"><div class="label">Clientas</div><div class="value">${totalClients}</div></div>
        <div class="stat success"><div class="label">Facturado</div><div class="value" style="font-size: 20px;">$${totalFact.toLocaleString()}</div></div>
        <div class="stat" style=""><div class="label">Comisiones</div><div class="value" style="font-size: 20px; color: var(--danger);">$${totalComm.toLocaleString()}</div></div>
      </div>
      <div class="section-title">${periodLabel} · Ranking por chica</div>
      ${staff.sort((a, b) => b[p].facturado - a[p].facturado).map((c, i) => {
        const d = c[p];
        const pct = totalFact > 0 ? Math.round(d.facturado / totalFact * 100) : 0;
        const barColor = i === 0 ? 'var(--accent)' : i === 1 ? 'var(--success)' : 'var(--info)';
        return `
        <div class="card" style="margin-bottom: 10px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <span style="font-size: 14px; font-weight: 800;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)+'.'} ${c.name}</span>
              <span style="font-size: 11px; color: var(--ink-faint); font-weight: 500; margin-left: 6px;">${c.area}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800;">$${d.facturado}</div>
          </div>
          <div style="background: var(--bg); border-radius: var(--radius-pill); height: 8px; overflow: hidden; margin-bottom: 8px;">
            <div style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: var(--radius-pill); transition: width .3s;"></div>
          </div>
          <div style="display: flex; gap: 12px; font-size: 11px; color: var(--ink-soft); font-weight: 600;">
            <span>${d.servicios} servicios</span>
            <span>${d.clientas} clientas</span>
            <span style="color: var(--accent-deep);">Com. $${d.comision}</span>
            <span>${pct}% del total</span>
          </div>
        </div>`;
      }).join('')}
    `;
  }

  function renderStaffReport(el, key) {
    const c = REPORT_DATA[key];
    const d = c[currentPeriod];
    const periodLabel = currentPeriod === 'dia' ? 'Hoy' : currentPeriod === 'semana' ? 'Esta semana' : 'Este mes';
    const isPestanas = ['yadira', 'diana'].includes(key);
    const isFacial = key === 'laura';

    el.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 20px; font-weight: 800;">${c.name}</div>
        <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500;">${c.area} · ${periodLabel}</div>
      </div>
      <div class="stat-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-bottom: 6px;">
        <div class="stat"><div class="label">Servicios</div><div class="value">${d.servicios}</div></div>
        <div class="stat"><div class="label">Clientas</div><div class="value">${d.clientas}</div></div>
        <div class="stat info"><div class="label">Promos</div><div class="value">${d.promos}</div></div>
      </div>
      <div class="stat-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 16px;">
        <div class="stat success"><div class="label">Facturado</div><div class="value" style="font-size: 20px;">$${d.facturado}</div></div>
        <div class="stat"><div class="label">Comisión</div><div class="value" style="font-size: 20px; color: var(--accent-deep);">$${d.comision}</div></div>
      </div>

      <div class="section-title">Desglose por área</div>
      <div class="card" style="padding: 14px; margin-bottom: 14px;">
        ${d.desglose.map(a => {
          const pct = d.facturado > 0 ? Math.round(a.total / d.facturado * 100) : 0;
          return `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 4px;">
              <span>${a.area}</span>
              <span>${a.count} serv. · $${a.total} (${pct}%)</span>
            </div>
            <div style="background: var(--bg); border-radius: var(--radius-pill); height: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: var(--accent); border-radius: var(--radius-pill);"></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="section-title">Top servicios</div>
      <div class="card" style="padding: 10px 14px; margin-bottom: 14px;">
        ${d.top.map((t, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; ${i < d.top.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
            <div>
              <span style="font-size: 13px; font-weight: 700;">${t.name}</span>
              <span style="font-size: 11px; color: var(--ink-faint); font-weight: 500; margin-left: 4px;">×${t.count}</span>
            </div>
            <span style="font-size: 14px; font-weight: 800;">$${t.total}</span>
          </div>
        `).join('')}
      </div>

      ${isPestanas && d.modelos ? `
        <div class="section-title">Pestañas por modelo ${periodLabel.toLowerCase()}</div>
        <div class="card" style="padding: 10px 14px; margin-bottom: 14px;">
          ${d.modelos.map((m, i) => {
            const maxCount = Math.max(...d.modelos.map(x => x.count));
            const pct = maxCount > 0 ? Math.round(m.count / maxCount * 100) : 0;
            return `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 3px;">
                <span>${m.name}</span>
                <span>${m.count}</span>
              </div>
              <div style="background: var(--bg); border-radius: var(--radius-pill); height: 6px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--top-purple); border-radius: var(--radius-pill);"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}

      ${isFacial && d.topFacial ? `
        <div class="section-title">Ranking de faciales ${periodLabel.toLowerCase()}</div>
        <div class="card" style="padding: 10px 14px; margin-bottom: 14px;">
          ${d.topFacial.map((m, i) => {
            const maxCount = Math.max(...d.topFacial.map(x => x.count));
            const pct = maxCount > 0 ? Math.round(m.count / maxCount * 100) : 0;
            return `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 3px;">
                <span>${i === 0 ? '🔥 ' : ''}${m.name}</span>
                <span>${m.count}</span>
              </div>
              <div style="background: var(--bg); border-radius: var(--radius-pill); height: 6px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--success); border-radius: var(--radius-pill);"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
    `;
  }

  // === REFRESH (actualizar datos) ===
  async function doRefresh(btn) {
    if (btn.classList.contains('spinning')) return;
    btn.classList.add('spinning');
    
    // Mostrar toast
    const toast = btn.closest('.nav').querySelector('.refresh-toast');
    if (toast) {
      toast.textContent = '⏳ Actualizando...';
      toast.classList.add('show');
    }
    
    // Resetear caches
    CLIENT_DIRECTORY_CACHE = [];
    COMM_DATA = { value: '****', detail: 'Cargando...', day: '****', items: [] };
    commVisible = false;
    
    // Re-renderizar datos de la pantalla activa desde API
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) {
      const id = activeScreen.id;
      if (id === 'waitList') await renderWaitList();
      if (id === 'staffHome') await loadStaffHome();
      if (id === 'ownerHome') await loadOwnerHome();
      if (id === 'clientDirectory') await renderClientDirectory();
      if (id === 'mikaelaHome') await loadMikaelaHome();
      if (id === 'solucionesPanel') await loadSolucionesTickets();
      if (id === 'ownerPromos') renderPromos();
      if (id === 'staffPromos') await renderStaffPromos();
    }
    
    btn.classList.remove('spinning');
    if (toast) {
      toast.textContent = '✓ Actualizado';
      setTimeout(() => toast.classList.remove('show'), 1500);
    }
  }

  // === PROMO EN ATENCIÓN ===
  // Tracking de promos activas por clienta
  let activePromos = {};
  // ej: { 'Isabella Vera': { promo: {...}, startedBy: 'cejas', completedAreas: ['cejas'] } }

  function openPromoSelect(slot) {
    window._promoSlot = slot;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || 'Clienta';
    
    // Verificar si hay promo asignada por Mikaela
    const assignedPromo = window._assignedPromo ? window._assignedPromo[slot] : null;
    
    // ¿Hay promo en curso para esta clienta?
    const inProgress = activePromos[clientName];
    const inProgressEl = document.getElementById('promoInProgress');
    
    if (inProgress) {
      document.getElementById('promoSelectTitle').textContent = '🏷 Promo en curso';
      document.getElementById('promoInProgressName').textContent = inProgress.promo.name;
      document.getElementById('promoInProgressDetail').textContent = inProgress.promo.services + ' — $' + inProgress.promo.price;
      
      // Determinar qué parte le toca a esta chica
      const user = window.currentUser;
      const myArea = user?.area || 'cejas';
      const areaLabel = myArea === 'cejas' ? 'Cejas' : myArea === 'pestanas' ? 'Pestañas' : 'Facial';
      const myDiv = inProgress.promo.division.find(d => d.area === areaLabel);
      document.getElementById('promoInProgressMy').textContent = myDiv ? (areaLabel + ' — $' + myDiv.monto + ' (' + myDiv.comm + ')') : 'Tu área no está en esta promo';
      
      inProgressEl.style.display = 'block';
    } else {
      document.getElementById('promoSelectTitle').textContent = assignedPromo ? '🏷 Elegir promo (asignada: ' + assignedPromo.name + ')' : '🏷 Aplicar promo';
      inProgressEl.style.display = 'none';
    }
    
    // Renderizar lista de promos activas
    const list = document.getElementById('promoSelectList');
    const active = PROMOS.filter(p => p.active);
    const _user_pm = window.currentUser;
    const _myArea_pm = _user_pm?.area || 'cejas';

    list.innerHTML = active.map(function(p, i) {
      var isAssigned = assignedPromo && p.name === assignedPromo.name;
      var borderStyle = isAssigned ? 'border: 3px solid #ff6b9d;' : '';
      var bgStyle = isAssigned ? 'background: linear-gradient(135deg, #fff5f7 0%, #ffe8ef 100%);' : 'background: var(--bg-card);';
      var assignedBadge = isAssigned ? '<div style="background: #ff6b9d; color: white; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; display: inline-block; margin-bottom: 6px;">&#128157; ASIGNADA POR MIKAELA</div>' : '';

      // División de mi área en esta promo
      var _myDivPM = p.division.find(function(d) {
        var da = String(d.area||'').toLowerCase();
        return _myArea_pm === 'pestanas' ? (da.includes('pest'))
          : _myArea_pm === 'facial' ? da.includes('facial')
          : (da.includes('ceja') || da.includes('depil'));
      });
      // Mostrar botón "Tomar promo completa" si: promo multi-área con descuento y mi área está incluida
      var _promoEsMasBarata = _myDivPM && p.division.length > 1 && Number(p.price) < Number(p.regular);

      var _divisionHtml = p.division.map(function(d) {
        return '<span style="background:var(--bg);font-size:10px;font-weight:700;padding:3px 8px;border-radius:var(--radius-pill);color:var(--ink-soft);">' + d.area + ' $' + d.monto + '</span>';
      }).join('');

      var _btnPromoCompleta = '';
      if (_promoEsMasBarata) {
        _btnPromoCompleta = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line);" onclick="event.stopPropagation()">'
          + '<div style="font-size:11px;color:var(--ink-soft);margin-bottom:6px;">&#128161; La clienta solo quiere tu servicio, pero la promo es m&#225;s barata que el precio normal</div>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
          + '<button onclick="event.stopPropagation(); applyPromo(' + i + ')" style="flex:1;padding:8px 12px;background:var(--bg);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:var(--ink-soft);">Solo mi parte &middot; $' + (_myDivPM ? _myDivPM.monto : '?') + '</button>'
          + '<button onclick="event.stopPropagation(); applyPromoCompleta(' + i + ')" style="flex:1;padding:8px 12px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:white;">&#127919; Tomar promo completa &middot; $' + p.price + '</button>'
          + '</div></div>';
      }

      return '<div style="' + bgStyle + ' ' + borderStyle + ' border-radius: 20px; padding: 16px; margin-bottom: 10px; box-shadow: var(--shadow-card); cursor: pointer;" onclick="applyPromo(' + i + ')">'
        + assignedBadge
        + '<div style="display: flex; justify-content: space-between; align-items: flex-start;">'
        + '<div style="flex: 1;">'
        + '<div style="font-weight: 800; font-size: 15px; margin-bottom: 3px;">' + p.name + '</div>'
        + '<div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-bottom: 6px;">' + p.services + '</div>'
        + '<div style="display: flex; gap: 4px; flex-wrap: wrap;">' + _divisionHtml + '</div>'
        + '</div>'
        + '<div style="text-align: right; flex-shrink: 0; margin-left: 10px;">'
        + '<div style="font-size: 22px; font-weight: 800; color: ' + (isAssigned ? '#c44569' : 'var(--accent-deep)') + ';">$' + p.price + '</div>'
        + '<div style="font-size: 11px; color: var(--ink-faint); text-decoration: line-through;">$' + p.regular + '</div>'
        + '</div>'
        + '</div>'
        + _btnPromoCompleta
        + '</div>';
    }).join('');
    
    document.getElementById('promoSelectModal').classList.add('active');
  }

  function applyPromo(promoIdx) {
    const promo = PROMOS[promoIdx];
    const slot = window._promoSlot;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || 'Clienta';
    const user = window.currentUser;
    const myArea = user?.area || 'cejas';
    
    // Obtener el precio que le corresponde a esta área (suma todas las partes que puede hacer)
    const myPrice = getMyPromoPrice(promo, myArea);
    
    // Agregar servicio de promo a slotServices
    const servicioPromo = {
      name: promo.name,
      area: myArea,
      price: myPrice
    };
    
    // Aplicar promo = REEMPLAZAR el servicio que tenía la clienta (cambió de opinión),
    // no sumarlo. Antes se hacía push() y el servicio que asignó Mikaela quedaba sumado
    // en vez de reemplazado — por eso "no cambiaba".
    slotServices[slot] = [servicioPromo];
    
    // Actualizar UI
    renderServicesForSlot(slot);
    
    // Actualizar total
    const total = slotServices[slot].reduce((sum, s) => sum + Number(s.price), 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent = slotServices[slot].length;
    
    // Registrar promo activa usando clave normalizada (igual que finishSlot1)
    const promoClientKey = normalizeClientKey(clientName);
    activePromos[promoClientKey] = {
      promo: promo,
      startedBy: myArea,
      completedAreas: []   // vacío: se llena al terminar cada área, no al iniciar
    };
    
    // Ocultar banner de promo asignada si existe
    const assignedInfo = document.getElementById('promoAssignedInfo' + slot);
    if (assignedInfo) assignedInfo.remove();
    
    // Cambiar botón
    const promoBtn = document.getElementById('promoBtn' + slot);
    if (promoBtn) {
      promoBtn.textContent = '✓ Promo aplicada';
      promoBtn.style.background = 'var(--success)';
    }
    
    closeModal();
    alert('✓ Promo "' + promo.name + '" aplicada. Precio actualizado a $' + myPrice);

    // Sincronizar el cambio con el backend para que Mikaela vea el nuevo valor EN VIVO
    // (antes solo se actualizaba el estado local de la staff y Mikaela seguía viendo el viejo).
    const _idEsperaPromo = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    if (_idEsperaPromo) {
      apiPost('updateServiciosAtencion', {
        idEspera      : _idEsperaPromo,
        chicaNombre   : user?.name || '',
        clienteNombre : clientName,
        clienteCodigo : slot === 1 ? (window._as1Client || '') : (window._as2Client || ''),
        servicios     : promo.name,
        total         : String(myPrice),
        promoNombre   : promo.name,
        tipo          : 'SP',
        precioPromo   : String(myPrice),
        precioRegular : String(promo.regular || promo.price || myPrice),
        // áreas que cubre la promo NUEVA → el backend cancela las otras áreas del combo
        // viejo que queden huérfanas (ej. Depilación $8.96 del Classic Premium)
        promoAreas    : (Array.isArray(promo.division) ? promo.division.map(function (d) { return d.area; }) : []).join(','),
        // división completa del combo nuevo (categoría + precio por área) → el backend
        // ACTUALIZA las áreas compartidas (ej. cejas) al combo nuevo en vez de dejarlas
        // con el combo viejo, así la otra staff (María) recibe el combo correcto.
        promoDivision : JSON.stringify(
          (Array.isArray(promo.division) ? promo.division : []).map(function (d) {
            return { cat: _promoCatDe(d.realArea || d.area), servicio: (d.servicio || d.area || ''), monto: Number(d.monto || 0) };
          })
        )
      }).then(function (r) { console.log('✅ Promo sincronizada con Mikaela:', r); })
        .catch(function (e) { console.warn('⚠ Error sincronizando promo con Mikaela:', e); });
    }

    // Si la promo incluye áreas que esta staff NO hace, avisar a Mikaela del cambio
    // (ej: Yadira cambia a "brasilero + cejas" → la parte de cejas debe asignarla Mikaela)
    try {
      const _otras = getOtherPromoAreas(promo, myArea);
      if (_otras.length > 0) {
        const _LBL = { cejas: 'Cejas', pestanas: 'Pestañas', facial: 'Facial' };
        const _faltan = _otras.map(a => _LBL[a] || a).join(', ');
        enviarPushStaff(['Mikaela'], '🔄 Cambio de servicio',
          (user?.name || 'Una chica') + ' cambió a ' + clientName + ' a la promo "' + promo.name + '". Falta asignar a otra chica: ' + _faltan + '.');
        showToast('🔄 Avisado a Mikaela: falta asignar ' + _faltan);
      }
    } catch (e) { console.warn('[applyPromo] aviso Mikaela:', e); }
  }

  // Tomar promo completa: la staff cobra el precio total aunque solo haga su parte
  // Útil cuando precio promo < precio normal del servicio individual
  function applyPromoCompleta(promoIdx) {
    const promo = PROMOS[promoIdx];
    const slot = window._promoSlot;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || 'Clienta';
    const user = window.currentUser;
    const myArea = user?.area || 'cejas';

    // Precio TOTAL de la promo (no solo la parte del área)
    const precioTotal = Number(promo.price);

    // Reemplazar slotServices con la promo al precio total (la clienta cambió a la promo
    // completa: se reemplaza el servicio asignado, no se suma).
    slotServices[slot] = [{
      name: promo.name,
      area: myArea,
      price: precioTotal,
      _promoCompleta: true  // flag para saber que es precio de promo completa
    }];

    // Actualizar UI
    renderServicesForSlot(slot);
    const total = slotServices[slot].reduce((sum, s) => sum + Number(s.price), 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent = slotServices[slot].length;

    // Registrar promo activa — marcar como completa (no continuar a otras áreas)
    const promoClientKey = normalizeClientKey(clientName);
    activePromos[promoClientKey] = {
      promo: promo,
      startedBy: myArea,
      completedAreas: promo.division.map(d => d.area), // marcar todas como "hechas"
      _promoCompleta: true
    };
    saveActivePromos();

    // Cambiar botón
    const promoBtn = document.getElementById('promoBtn' + slot);
    if (promoBtn) {
      promoBtn.textContent = '✓ Promo completa aplicada';
      promoBtn.style.background = 'var(--success)';
    }

    // Sincronizar con el backend para que Mikaela vea el valor de la promo completa EN VIVO
    const _idEsperaPC = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    if (_idEsperaPC) {
      apiPost('updateServiciosAtencion', {
        idEspera      : _idEsperaPC,
        chicaNombre   : user?.name || '',
        clienteNombre : clientName,
        clienteCodigo : slot === 1 ? (window._as1Client || '') : (window._as2Client || ''),
        servicios     : promo.name,
        total         : String(precioTotal),
        promoNombre   : promo.name,
        tipo          : 'SP',
        precioPromo   : String(precioTotal),
        precioRegular : String(promo.regular || promo.price || precioTotal)
      }).then(function (r) { console.log('✅ Promo completa sincronizada con Mikaela:', r); })
        .catch(function (e) { console.warn('⚠ Error sincronizando promo completa:', e); });
    }

    closeModal();
    // Actualizar botones de finalización — debe mostrar "Finalizar servicio" directo
    setTimeout(() => updateFinishButtons(slot), 200);
    showToast('🎯 Promo completa aplicada · $' + precioTotal + ' — Se cobra el total de la promo');
  }

  function continuePromo() {
    const slot = window._promoSlot;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || 'Clienta';
    const inProgress = activePromos[normalizeClientKey(clientName)];
    const user = window.currentUser;
    const myArea = user?.area || 'cejas';
    
    if (inProgress && !inProgress.completedAreas.includes(myArea)) {
      inProgress.completedAreas.push(myArea);
    }
    
    showPromoBanner(slot, inProgress.promo, myArea, true);
    closeModal();
    
    // Verificar si se completaron todas las áreas de la promo
    const allAreas = inProgress.promo.division.map(d => {
      if (d.area.includes('Cejas') || d.area.includes('Depilación')) return 'cejas';
      if (d.area.includes('Pestañas')) return 'pestanas';
      if (d.area.includes('Facial')) return 'facial';
      return '';
    });
    const allDone = allAreas.every(a => inProgress.completedAreas.includes(a));
    
    if (allDone) {
      alert('✅ ¡Promo completada! Todos los servicios del combo "' + inProgress.promo.name + '" fueron realizados. Precio final: $' + inProgress.promo.price + ' (solo efectivo).');
    } else {
      alert('✓ Continuando promo "' + inProgress.promo.name + '". Tu parte queda registrada.');
    }
  }

  function showPromoBanner(slot, promo, myArea, isContinuation) {
    const banner = document.getElementById('promoBanner' + slot);
    const areaLabel = myArea === 'cejas' ? 'Cejas' : myArea === 'pestanas' ? 'Pestañas' : 'Facial';
    const myDiv = promo.division.find(d => d.area === areaLabel);
    
    document.getElementById('promoBannerName' + slot).textContent = promo.name;
    document.getElementById('promoBannerDetail' + slot).textContent = 'Tu parte: ' + areaLabel + ' — $' + (myDiv ? myDiv.monto : '?') + ' (' + (myDiv ? myDiv.comm : '') + ')';
    document.getElementById('promoBannerPrice' + slot).textContent = '$' + promo.price;
    
    // ¿Hay más áreas por completar?
    const otherAreas = promo.division.filter(d => d.area !== areaLabel);
    const paseEl = document.getElementById('promoBannerPase' + slot);
    if (otherAreas.length > 0 && !isContinuation) {
      const nextAreas = otherAreas.map(d => d.area).join(' + ');
      document.getElementById('promoPaseArea' + slot).textContent = nextAreas;
      paseEl.style.display = 'block';
    } else {
      paseEl.style.display = 'none';
    }
    
    banner.style.display = 'block';
    
    // Cambiar botón a "Promo aplicada ✓"
    const btn = document.getElementById('promoBtn' + slot);
    if (btn) {
      btn.textContent = '✓ Promo aplicada';
      btn.style.background = 'var(--success)';
    }
  }

  // Observaciones de clienta (toggle edición inline)
  function toggleEditObs(id) {
    const display = document.getElementById(id + 'Display');
    const edit = document.getElementById(id + 'Edit');
    if (edit.style.display === 'none') {
      edit.value = display.textContent.trim();
      // Guardar el texto con el que se abrió, para no re-guardar si no cambió.
      window['_' + id + 'Original'] = display.textContent.trim();
      edit.style.display = 'block';
      display.style.display = 'none';
      edit.focus();
    } else {
      saveObs(id);
    }
  }

  function saveObs(id) {
    const display = document.getElementById(id + 'Display');
    const edit = document.getElementById(id + 'Edit');
    const val = edit.value.trim();
    edit.style.display = 'none';
    display.style.display = 'block';
    if (!val) return;
    display.textContent = val;
    // Persistir SOLO si cambió respecto a lo que se mostraba / a lo último guardado
    // (evita appends repetidos en cada onfocusout y notas duplicadas).
    if (val === window['_' + id + 'Original'] || val === window['_' + id + 'LastSaved']) return;
    // Contexto de la clienta según el slot (obs1 → activeService, obs2 → activeService2)
    const slot = (id === 'obs2') ? 2 : 1;
    const codeRaw = (document.getElementById('as' + slot + 'Code') || {}).textContent || '';
    const m = codeRaw.match(/C-\d{4}/);
    const codigo = m ? m[0] : '';
    if (!codigo) { console.warn('saveObs: sin código de clienta, no se persiste'); return; }
    const cliente = ((document.getElementById('as' + slot + 'Name') || {}).textContent || '').replace(' ⭐', '').trim();
    const user = window.currentUser || {};
    window['_' + id + 'LastSaved'] = val;
    apiPost('addObservacionClienta', {
      codigo: codigo,
      cliente: cliente,
      area: user.area || '',
      staff: user.name || '',
      observacion: val
    }).then(function(r){
      if (r && r.success) { try { showToast('📝 Observación guardada en el perfil'); } catch(e){} }
      else { console.error('addObservacionClienta falló', r); }
    }).catch(function(e){ console.error('addObservacionClienta', e); });
  }

  // === MULTI-SERVICIO (hasta 5 por atención) ===
  let slotServices = { 1: [], 2: [] }; // { name, price, area, code }

  function renderServicesList(slot) {
    // Delega a renderServicesForSlot para que todos los renders
    // respeten el estado (pendiente/aprobado/rechazado) de cada servicio
    renderServicesForSlot(slot);
    const svcs = slotServices[slot] || [];
    const total = svcs.reduce((sum, s) => {
      if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
      return sum + Number(s.price || 0);
    }, 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent =
      svcs.filter(s => s.status !== 'rechazado').length;
    // Guardar nombre del primer servicio para compatibilidad
    if (svcs.length > 0) {
      window['_as' + slot + 'ServiceSummary'] = svcs.map(s => s.name).join(' + ');
    }
  }

  function addServiceToSlot(slot, service) {
    if (!slotServices[slot]) slotServices[slot] = [];
    if (slotServices[slot].length >= 5) {
      alert('Máximo 5 servicios por atención');
      return false;
    }
    slotServices[slot].push(service);
    // Usar renderServicesForSlot para que muestre el badge de estado (pendiente/aprobado)
    // y no sume al total servicios que aun no estan aprobados
    renderServicesForSlot(slot);
    // Actualizar total: solo servicios sin status pendiente/rechazado
    const total = slotServices[slot].reduce((sum, s) => {
      if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
      return sum + Number(s.price || 0);
    }, 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent =
      slotServices[slot].filter(s => s.status !== 'rechazado').length;
    return true;
  }

  function removeServiceItem(slot, index) {
    if (!confirm('¿Quitar este servicio?')) return;
    slotServices[slot].splice(index, 1);
    renderServicesForSlot(slot);
    const total = slotServices[slot].reduce((sum, s) => {
      if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
      return sum + Number(s.price || 0);
    }, 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent =
      slotServices[slot].filter(s => s.status !== 'rechazado').length;
  }

  function openEditService() {
    document.getElementById('editServiceModal').classList.add('active');
  }
  
  function switchAddSvcTab(tab) {
    const isSvc = tab === 'servicio';
    document.getElementById('tabSvcContent').style.display = isSvc ? 'block' : 'none';
    document.getElementById('tabPromoContent').style.display = isSvc ? 'none' : 'block';
    const btnSvc = document.getElementById('tabSvcBtn');
    const btnPro = document.getElementById('tabPromoBtn');
    btnSvc.style.background = isSvc ? 'var(--ink)' : 'transparent';
    btnSvc.style.color = isSvc ? 'white' : 'var(--ink-soft)';
    btnPro.style.background = !isSvc ? 'var(--accent)' : 'transparent';
    btnPro.style.color = !isSvc ? 'white' : 'var(--ink-soft)';
    if (!isSvc) renderAddSvcPromos();
  }

  function renderAddSvcPromos() {
    const list = document.getElementById('addSvcPromoList');
    if (!list) return;
    const slot = window._addServiceSlot || 1;
    const user = window.currentUser;
    const activePromosList = PROMOS.filter(p => p.active);
    if (activePromosList.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--ink-faint);font-size:13px;padding:20px;">No hay promos activas</div>';
      return;
    }
    window._addSvcPromosList = activePromosList;
    list.innerHTML = activePromosList.map((promo, idx) => `
      <div onclick="applyPromoFromAddSvc(${idx})" 
           style="background:var(--bg-card);border-radius:16px;padding:14px 16px;margin-bottom:10px;cursor:pointer;border:2px solid var(--line);transition:all .15s;"
           onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--line)'">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:14px;font-weight:800;">${promo.name}</div>
            <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${Array.isArray(promo.services) ? promo.services.join(' + ') : (promo.services||'')}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px;">
            <div style="font-size:18px;font-weight:800;color:var(--accent-deep);">$${promo.price}</div>
            <div style="font-size:10px;color:var(--ink-faint);text-decoration:line-through;">$${promo.regular}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function applyPromoFromAddSvc(promoIdx) {
    const promoData = (window._addSvcPromosList || PROMOS.filter(p => p.active))[promoIdx];
    if (!promoData) return;
    const slot = window._addServiceSlot || 1;
    const user = window.currentUser;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey = normalizeClientKey(clientName);
    const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;

    // Limpiar servicios anteriores del slot y aplicar la promo
    slotServices[slot] = [];
    const myArea = user?.area || 'cejas';
    const myPrice = getMyPromoPrice(promoData, myArea);

    slotServices[slot].push({
      name: promoData.name,
      area: myArea,
      price: myPrice,
      status: undefined
    });

    // Registrar promo activa usando el clientKey correcto
    activePromos[clientKey] = {
      promo: promoData,
      startedBy: myArea,
      completedAreas: [],
      _metadata: { displayName: clientName }
    };
    saveActivePromos();

    renderServicesForSlot(slot);
    document.getElementById('as' + slot + 'Total').textContent = '$' + myPrice;
    document.getElementById('as' + slot + 'SvcCount').textContent = '1';

    // Actualizar Sheet directamente con promoNombre + precioRegular
    console.log('🔍 applyPromoFromAddSvc — idEspera:', idEspera, '| clientName:', clientName, '| promo:', promoData.name, '| regular:', promoData.regular);
    if (idEspera) {
      apiPost('updateServiciosAtencion', {
        idEspera      : idEspera,
        chicaNombre   : user.name,
        clienteNombre : clientName,
        clienteCodigo : slot === 1 ? (window._as1Client || '') : (window._as2Client || ''),
        servicios     : promoData.name,
        total         : String(myPrice),
        promoNombre   : promoData.name,
        tipo          : 'SP',
        precioPromo   : String(myPrice),
        precioRegular : String(promoData.regular || promoData.price || myPrice)
      }).then(r => {
        console.log('✅ Promo SP actualizada en Sheet:', r);
      }).catch(e => {
        console.warn('⚠ Error actualizando promo en Sheet:', e);
      });
    }

    closeModal();
    showToast('🏷 Promo "' + promoData.name + '" aplicada ($' + myPrice + ')');

    // Avisar a Mikaela si la promo incluye áreas que esta staff no hace
    try {
      const _otras = getOtherPromoAreas(promoData, myArea);
      if (_otras.length > 0) {
        const _LBL = { cejas: 'Cejas', pestanas: 'Pestañas', facial: 'Facial' };
        const _faltan = _otras.map(a => _LBL[a] || a).join(', ');
        enviarPushStaff(['Mikaela'], '🔄 Cambio de servicio',
          (user?.name || 'Una chica') + ' cambió a ' + clientName + ' a la promo "' + promoData.name + '". Falta asignar a otra chica: ' + _faltan + '.');
        showToast('🔄 Avisado a Mikaela: falta asignar ' + _faltan);
      }
    } catch (e) { console.warn('[applyPromoFromAddSvc] aviso Mikaela:', e); }
  }

  function openAddService(slot, modoEnganche) {
    window._addServiceSlot = slot || 1;
    // El modo enganche SOLO se activa cuando el llamador lo pide explícitamente
    // (changeServiceFromModal / editEngancheService). El botón "+ Agregar servicio"
    // nunca pasa este parámetro → siempre fuerza modo normal y limpia banderas pegadas.
    const esEnganche = modoEnganche === true;
    if (esEnganche) {
      window._modoEnganche = true;
    } else {
      window._modoEnganche = false;
      window._editEngancheIdx = undefined;
      // Resetear al tab Servicio y título solo en modo normal
      switchAddSvcTab('servicio');
      const titleEl = document.getElementById('addSvcModalTitle');
      if (titleEl) titleEl.textContent = '➕ Agregar servicio';
      // Restaurar nota si fue ocultada
      const noteWrapper = document.getElementById('addSvcNoteWrapper');
      if (noteWrapper) noteWrapper.style.display = 'block';
      const confirmBtn = document.getElementById('addSvcConfirmBtn');
      if (confirmBtn) confirmBtn.textContent = 'Solicitar autorización';
    }

    const user = window.currentUser;
    const areaSel = document.getElementById('addSvcArea');
    areaSel.innerHTML = '<option value="">Seleccionar área...</option>';
    
    // IMPORTANTE: Mostrar TODAS las áreas, no solo las del staff
    // Esto permite recomendaciones cruzadas y servicio personalizado
    const allAreas = ['cejas', 'depilacion', 'pestanas', 'retiro_lifting', 'facial'];
    const areaNames = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting / Retiro', facial: 'Facial' };
    
    allAreas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = areaNames[a] || a;
      areaSel.appendChild(opt);
    });
    
    document.getElementById('addSvcService').innerHTML = '<option value="">Primero seleccioná el área</option>';
    document.getElementById('addSvcPriceDisplay').style.display = 'none';
    document.getElementById('addServiceModal').classList.add('active');
  }

  async function loadAddServiceCatalog() {
    await ensureCatalogoLoaded();
    const area = document.getElementById('addSvcArea').value;
    const sel = document.getElementById('addSvcService');
    sel.innerHTML = '<option value="">Seleccionar servicio...</option>';
    document.getElementById('addSvcPriceDisplay').style.display = 'none';
    
    if (!area) return;
    
    const catMap = { cejas: 'cejas', depilacion: 'depilacion', pestanas: 'pestanas', retiro_lifting: 'cejas', facial: 'facial' };
    const catKey = catMap[area] || area;
    const services = CATALOGO[catKey] || [];
    
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ name: s.name, price: s.price, code: s.code, area: area });
      opt.textContent = s.name + ' — $' + s.price;
      sel.appendChild(opt);
    });
  }

  function updateAddServicePrice() {
    const val = document.getElementById('addSvcService').value;
    if (!val) { document.getElementById('addSvcPriceDisplay').style.display = 'none'; return; }
    const svc = JSON.parse(val);
    document.getElementById('addSvcPrice').textContent = '$' + svc.price;
    document.getElementById('addSvcPriceDisplay').style.display = 'block';
  }

  async function confirmAddService() {
    const val = document.getElementById('addSvcService').value;
    if (!val) { alert('Seleccioná un servicio'); return; }
    
    const svc = JSON.parse(val);
    const slot = window._addServiceSlot || 1;
    const user = window.currentUser;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || '';
    const areaNames = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting / Retiro', facial: 'Facial' };
    svc.area = areaNames[svc.area] || svc.area;

    // MODO ENGANCHE: Staff 2 cambia servicio directamente sin autorización
    if (window._modoEnganche) {
      window._modoEnganche = false;
      const engIdx = window._editEngancheIdx;
      // Reemplazar el servicio en el slot
      svc.status = undefined; // sin estado = aprobado por defecto
      if (slotServices[slot] && engIdx !== undefined) {
        slotServices[slot][engIdx] = svc;
      } else {
        slotServices[slot] = slotServices[slot] || [];
        slotServices[slot][0] = svc;
      }
      renderServicesForSlot(slot);
      const total = slotServices[slot].reduce((s, v) => s + (v.status !== 'rechazado' && v.status !== 'pendiente' ? Number(v.price || 0) : 0), 0);
      document.getElementById('as' + slot + 'Total').textContent = '$' + total;
      document.getElementById('as' + slot + 'SvcCount').textContent = slotServices[slot].filter(s => s.status !== 'rechazado').length;
      // Restaurar modal a modo normal
      const modalTitle = document.querySelector('#addServiceModal .modal-title');
      if (modalTitle) modalTitle.textContent = '➕ Agregar servicio';
      const noteGroup = document.getElementById('addSvcNote')?.closest('.input-group');
      if (noteGroup) noteGroup.style.display = 'block';
      closeModal();
      syncServiciosBackend(slot, total);
      alert('✓ Servicio de enganche actualizado a: ' + svc.name + ' ($' + svc.price + ')');
      return;
    }

    // MODO NORMAL: requiere nota y autorización de Mikaela
    // Solo validar nota si NO estamos en modo enganche
    if (!window._modoEnganche) {
      const note = document.getElementById('addSvcNote').value.trim();
      if (!note || note.length < 10) {
        alert('La nota para Mikaela es obligatoria y debe tener al menos 10 caracteres. Explicá por qué la clienta necesita este servicio adicional.');
        return;
      }
      svc.status = 'pendiente';
      svc.note = note;
      svc.requestedBy = user?.name || 'Staff';
      svc.requestedAt = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
      if (addServiceToSlot(slot, svc)) {
        document.getElementById('addSvcNote').value = '';
        closeModal();
        await sendAuthorizationRequest(clientName, svc, slot);
        recargarAutorizacionesStaff(slot);
        alert('⏳ Solicitud enviada a Mikaela. El servicio estará pendiente hasta que ella lo apruebe.');
      }
      return;
    }

    // MODO ENGANCHE: llegamos aquí si _modoEnganche estaba true pero no se procesó arriba
    // (por si el bloque enganche de arriba falló por alguna razón de índice)
    window._modoEnganche = false;
  }
  
  async function sendAuthorizationRequest(clientName, service, slot) {
    const user = window.currentUser;
    const clientCode = slot === 1 ? window._as1Client : window._as2Client;
    
    console.log('📤 sendAuthorizationRequest called:', {
      clientName,
      clientCode,
      service,
      slot,
      user: user?.name
    });
    
    try {
      // Detectar si es un REEMPLAZO de promo o un EXTRA adicional
      // Reemplazo: hay SP- en el slot Y el staff borró el servicio original
      //   → slotServices solo tiene el nuevo servicio pendiente (sin servicios aprobados previos)
      // Extra: hay SP- pero el servicio original sigue en slotServices
      const _idEsperaSlot = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
      const _esSP = _idEsperaSlot.startsWith('SP-');
      // Contar servicios aprobados (sin status o status !== pendiente/rechazado) excluyendo el nuevo
      const _svcsAprobados = (slotServices[slot] || []).filter(function(s) {
        return s !== service && s.status !== 'pendiente' && s.status !== 'rechazado';
      });
      // Es reemplazo si: hay SP- activo Y no quedan servicios aprobados (el original fue borrado)
      const _esCambioPromo = _esSP && _svcsAprobados.length === 0;
      const payload = {
        clienteCodigo: clientCode,
        clienteNombre: clientName,
        staffNombre: user?.name || 'Staff',
        servicioNombre: service.name,
        servicioArea: service.area,
        servicioPrecio: service.price,
        nota: service.note,
        idEsperaSP: _esCambioPromo ? _idEsperaSlot : '',
        esCambioPromo: _esCambioPromo,
        staffArea: user?.area || ''
      };
      
      console.log('📤 Sending to backend:', payload);
      
      const result = await apiPost('solicitarAutorizacion', payload);
      
      console.log('📥 Backend response:', result);
      
      if (result.success) {
        // Guardar ID de autorización en el servicio
        service.authId = result.authId;
        console.log('✅ Solicitud de autorización enviada:', result.authId);
        // Avisar a Mikaela por push: antes la solicitud solo aparecía si ella
        // estaba mirando el polling; ahora le llega notificación aunque tenga la app cerrada.
        try {
          const _staff  = user?.name || 'Staff';
          const _precio = (service.price !== undefined && service.price !== null && service.price !== '')
            ? (' · $' + service.price) : '';
          enviarPushStaff(['Mikaela'], '✋ Servicio extra para aprobar',
            _staff + ' → ' + (clientName || 'clienta') + ': ' + (service.name || 'servicio') + _precio);
        } catch (ePush) { console.warn('[Push] aviso de autorización a Mikaela falló:', ePush); }
      } else {
        console.error('❌ Error al enviar autorización:', result.message);
      }
    } catch (err) {
      console.error('❌ Exception al enviar autorización:', err);
    }
  }

  function removeService(slot) {
    // Legacy - ya no se usa, reemplazado por removeServiceItem
  }
  // Estrellas de clienta frecuente POR ÁREA (color = peso del servicio)
  const FREC_AREA_STAR = {
    cejas:      { color: '#F5C518', label: 'Frecuente cejas' },
    facial:     { color: '#D4AF37', label: 'Frecuente facial' },
    pestanas:   { color: '#9C5BD1', label: 'Frecuente pestañas' },
    depilacion: { color: '#2D9D5A', label: 'Frecuente depilación corporal' }
  };
  function estrellasFrecuente(codigo) {
    const areas = (window._frecMapa && codigo && window._frecMapa[codigo]) || [];
    if (!areas.length) return '';
    return ' ' + areas.map(function(a) {
      const s = FREC_AREA_STAR[a];
      return s ? '<span title="' + s.label + '" style="color:' + s.color + ';font-size:14px;line-height:1;">★</span>' : '';
    }).join('');
  }
  window.estrellasFrecuente = estrellasFrecuente;

  function mostrarClientasFrecuentes() {
    const lista = window._clientasFrecuentes || [];
    const cont = document.getElementById('frecuentesList');
    if (!cont) return;
    // Leyenda de colores por área
    const leyenda = '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:14px;font-size:11px;color:var(--ink-soft);">'
      + Object.keys(FREC_AREA_STAR).map(function(a){
          return '<span style="display:inline-flex;align-items:center;gap:3px;"><span style="color:' + FREC_AREA_STAR[a].color + ';font-size:14px;">★</span>' + FREC_AREA_STAR[a].label.replace('Frecuente ','') + '</span>';
        }).join('')
      + '</div>';
    if (lista.length === 0) {
      cont.innerHTML = leyenda + '<div style="text-align:center; color:var(--ink-soft); font-size:13px; padding:24px 0;">Aún no hay clientas con más de 2 visitas este mes.</div>';
    } else {
      cont.innerHTML = leyenda + lista.map(function(c, i) {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const stars = (c.areasFrecuentes || []).map(function(a){
          const s = FREC_AREA_STAR[a];
          return s ? '<span title="' + s.label + '" style="color:' + s.color + ';font-size:15px;line-height:1;">★</span>' : '';
        }).join('');
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border-radius:12px;margin-bottom:8px;">'
          + (medal ? '<span style="font-size:18px;">' + medal + '</span>' : '')
          + '<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:var(--ink);">' + (c.nombre || c.codigo || 'Clienta') + ' ' + stars + '</div>'
          + (c.codigo ? '<div style="font-size:11px;color:var(--ink-soft);">' + c.codigo + '</div>' : '') + '</div>'
          + '<div style="font-size:12px;font-weight:800;color:var(--purple);">' + c.visitas + ' visitas</div>'
          + '</div>';
      }).join('');
    }
    document.getElementById('clientasFrecuentesModal').classList.add('active');
  }
  window.mostrarClientasFrecuentes = mostrarClientasFrecuentes;

  // Cancelar el cobro: descarta los productos staged de ESTE cobro para que NO se
  // arrastren a la siguiente clienta (sobre todo con el reúso de id de ticket), y cierra.
  // No toca closeModal genérico (lo usa también el modal de agregar producto).
  function cancelarCobroModal() {
    try {
      if (window._apProductosEnTicket) {
        if (window._cobroGrupal && Array.isArray(window._cobroGrupal.clientas)) {
          window._cobroGrupal.clientas.forEach(function(c){
            if (c && c.idEspera) delete window._apProductosEnTicket[c.idEspera];
          });
        } else if (window._cobrarId) {
          delete window._apProductosEnTicket[window._cobrarId];
        }
      }
    } catch(e) { console.error('cancelarCobroModal', e); }
    closeModal();
  }
  window.cancelarCobroModal = cancelarCobroModal;

  function closeModal() {
    document.querySelectorAll('.modal-bg').forEach(m => m.classList.remove('active'));
    
    window._cobroGrupal = null;
    // Red de seguridad: limpiar modo enganche al cerrar cualquier modal, para que
    // un "Cambiar servicio" abandonado no convierta el siguiente "Agregar servicio"
    // en un reemplazo dentro del mismo ticket (debe ir SIEMPRE a autorización de Mikaela).
    window._modoEnganche = false;
    window._editEngancheIdx = undefined;
    // Limpiar botones dinámicos del modal de finalización para evitar duplicados
    // Restaurar título del cobrarModal por si fue cobro grupal
    const modalTitleEl = document.querySelector('#cobrarModal .modal-title');
    if (modalTitleEl) modalTitleEl.textContent = '💵 Cobrar servicio';
    const btnDoAllEl = document.getElementById('finishDoAllBtn');
    if (btnDoAllEl) btnDoAllEl.remove();
    const btnContSameEl = document.getElementById('finishContinueSameBtn');
    if (btnContSameEl) btnContSameEl.remove();
    
    // Si se está cerrando el modal de nueva clienta, resetear el formulario
    if (document.getElementById('newClientModal').classList.contains('active')) {
      isEditMode = false;
      editingClientCode = null;
    }
  }

  function pickPriority(el) {
    el.parentElement.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }

  function toggleTop(btn) {
    const banner = document.getElementById('topBanner');
    if (btn.textContent === 'Quitar') {
      banner.style.opacity = '0.4';
      btn.textContent = 'Restaurar';
    } else {
      banner.style.opacity = '1';
      btn.textContent = 'Quitar';
    }
  }

  async function goToList() {
    // Guard: evitar doble ejecución
    if (window._goToListRunning) return;
    window._goToListRunning = true;
    setTimeout(() => { window._goToListRunning = false; }, 3000);

    const tipo = window._arrTipo || 'normal';
    const nombre = document.getElementById('arrSelName')?.textContent || 'Clienta';
    const codigo = (document.getElementById('arrSelCode')?.textContent || '').split(' ')[0] || '';
    const isTop = document.getElementById('arrSelTop')?.style.display !== 'none';

    // ── MANDAMIENTO #8: clasificar ticket promo automáticamente ──
    if (tipo === 'promo') {
      const _c8 = window.clasificarTicketPromoM8 ? window.clasificarTicketPromoM8() : null;
      if (_c8 && _c8.tipo) {
        const _res8 = window.resumenTicketPromoM8 ? window.resumenTicketPromoM8() : '';
        if (_res8) showToast(_res8, 3000);
        console.log('🎯 M8 clasificación:', _c8);
      }
    }
    // ── FIN MANDAMIENTO #8 ──

    // Leer área/servicio/obs según el tipo activo
    const areaEl    = tipo === 'multi' ? document.getElementById('arrAreaMulti')    : document.getElementById('arrArea');
    const servicioEl = tipo === 'multi' ? document.getElementById('arrServiceMulti') : document.getElementById('arrService');
    const obsEl     = tipo === 'promo' ? document.getElementById('arrObsPromo') :
                      tipo === 'multi' ? document.getElementById('arrObsMulti')  : document.getElementById('arrObs');

    const area = areaEl?.value || 'Cejas';
    const servicioRaw = servicioEl?.value || '';
    const obs = obsEl?.value || '';
    const promo = window._arrPromo || null;

    // Extraer nombre y precio del servicio del JSON
    let servicio = '';
    let precio = 0;
    if (servicioRaw) {
      try {
        const data = JSON.parse(servicioRaw);
        servicio = data.nombre;
        precio = data.precio || 0;
      } catch (e) {
        servicio = servicioRaw;
        precio = 0;
      }
    }

    // ── MANDAMIENTO #1: área prioritaria siempre la determina getAreaPrioritaria() ──
    const _ap1 = window.getAreaPrioritaria(tipo);
    const areaKey = _ap1.key;

    // Obtener prioridad seleccionada
    const priEl = document.querySelector('.priority-option.selected');
    const prioridad = priEl ? priEl.querySelector('.name').textContent : 'Normal';

    const postData = {
      codigo: codigo,
      nombre: nombre, 
      servicio: servicio,
      area: areaKey, 
      prioridad: prioridad, 
      observaciones: obs,
      esTop: isTop ? 'Sí' : 'No',
      total: precio  // Agregar el precio aquí
    };

    // Incluir primera promo (compatibilidad) y secuencia adicional
    if (promo) {
      postData.promoNombre  = promo.name;
      postData.precioPromo  = promo.price;
      postData.precioRegular = promo.regular;
      // precioMiArea = precio de la primera división (área inicial)
      const myAreaKey = areaKey;
      const firstDiv  = (promo.division || []).find(d =>
        String(d.area||'').toLowerCase().includes(myAreaKey) ||
        myAreaKey.includes(String(d.area||'').toLowerCase())
      );
      postData.precioMiArea = firstDiv ? Number(firstDiv.monto || firstDiv.price || promo.price) : Number(promo.price);
    }
    // Secuencia de servicios
    if (window._secuencia.length > 0) {
      postData.secuencia = window._secuencia;
    }

    // ── USAR FORMULARIO TM UNIFICADO ─────────────────────────────────────
    const areasMulti = buildTMAreasFromForm();
    if (areasMulti.length === 0) {
      alert('Agregá al menos un servicio con área y servicio seleccionado.');
      return;
    }
    if (areasMulti.length === 1) {
      // Un solo servicio → flujo simple (normal o promo), nunca TM
      const a = areasMulti[0];
      const esPromo = a.tipo === 'promo';
      try {
        let result;
        if (esPromo) {
          // Promo de 1 área → addServicioPromo (flujo SP-)
          result = await apiPost('addServicioPromo', {
            codigo: codigo, nombre: nombre, servicio: a.tentativo,
            area: a.area, prioridad: prioridad, observaciones: obs,
            esTop: isTop ? 'Sí' : 'No', total: a.precio,
            promoNombre: a.tentativo, precioPromo: a.precio,
            precioRegular: a.precioNormal || a.precio
          });
        } else {
          // Normal de 1 área → addServicioNormal (flujo SN-)
          result = await apiPost('addServicioNormal', {
            codigo: codigo, nombre: nombre, servicio: a.tentativo,
            area: a.area, prioridad: prioridad, observaciones: obs,
            esTop: isTop ? 'Sí' : 'No', total: a.precio
          });
        }
        if (result && result.success) {
          initFormTM();
          simulateNotif('staff', 'Nueva clienta en el salón', (isTop ? '⭐ ' : '') + (codigo||'Clienta') + ' · ' + a.tentativo, isTop);
          enviarPushStaff(Object.keys(STAFF_PUSH_MAP).filter(n=>{const m={María:['cejas','depilacion','retiro_lifting'],Keyla:['cejas','depilacion','retiro_lifting'],Lesly:['cejas','depilacion','retiro_lifting'],Rosa:['cejas','depilacion','retiro_lifting'],Yadira:['pestanas','retiro_lifting'],Diana:['pestanas','retiro_lifting'],Laura:['facial']};return m[n]&&m[n].includes(a.area);}), '👤 Clienta en lista de espera', (isTop?'⭐ ':'')+(codigo||'Clienta')+' · '+a.tentativo);
          setTimeout(() => { show('mikaelaHome'); }, 600);
        } else {
          alert('Error: ' + (result?.error || result?.message || 'Error desconocido'));
        }
      } catch(err) { alert('Error de conexión: ' + err.message); }
      return;
    }

    // 2+ áreas → TM
    try {
      const result = await apiPost('crearTicketMulti', {
        codigo: codigo, nombre: nombre, prioridad: prioridad,
        observaciones: obs, areas: areasMulti,
        secuencia: window._secuencia.map(s => s.area)
      });
      if (result && result.success) {
        initFormTM();
        const tienePromo = areasMulti.some(a => a.tipo === 'promo');
        simulateNotif('staff', '🎯 Ticket multi-servicio', (codigo||'Clienta') + ' · ' + areasMulti.length + ' servicios', isTop);
        const _areasKeys = [...new Set(areasMulti.map(a=>a.area))];
        const _staffNotif = Object.keys(STAFF_PUSH_MAP).filter(n=>{const m={María:['cejas','depilacion','retiro_lifting'],Keyla:['cejas','depilacion','retiro_lifting'],Lesly:['cejas','depilacion','retiro_lifting'],Rosa:['cejas','depilacion','retiro_lifting'],Yadira:['pestanas','retiro_lifting'],Diana:['pestanas','retiro_lifting'],Laura:['facial']};return m[n]&&_areasKeys.some(k=>m[n].includes(k));});
        enviarPushStaff(_staffNotif, '🎯 Ticket multi en lista', (isTop?'⭐ ':'')+(codigo||'Clienta')+' · '+areasMulti.length+' servicios');
        alert('✅ Ticket creado (' + result.id + ')' + (tienePromo ? ' · Recorda: promos solo en efectivo/transferencia' : ''));
        setTimeout(() => { show('mikaelaHome'); }, 400);
      } else {
        alert('Error al crear ticket: ' + (result?.message || 'Error desconocido'));
      }
    } catch(err) { alert('Error de conexión: ' + err.message); }
  }

  function getAreaFromTMForm() {
    // Leer el área del primer servicio del formulario TM unificado
    const areaLabels = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', retiro_lifting:'Lifting / Retiro', facial:'Facial' };
    // Buscar primer slot con área definida
    if (typeof _tmServicios !== 'undefined' && _tmServicios.length > 0) {
      for (const s of _tmServicios) {
        if (s.area) return s.area; // ya es el label (Cejas, Pestañas, etc.)
      }
    }
    // Fallback: leer directo del DOM del primer slot
    const firstAreaEl = document.querySelector('[id^="tmArea-"]');
    if (firstAreaEl && firstAreaEl.value) return firstAreaEl.value;
    // Fallback legacy
    return document.getElementById('arrArea')?.value || 'Cejas';
  }

  async function renderAssignDirect() {
    try {
      const nombre = document.getElementById('arrSelName')?.textContent?.trim() || 'Clienta';
      // Leer área del formulario TM unificado
      const area = getAreaFromTMForm();
      const isTop = document.getElementById('arrSelTop')?.style?.display !== 'none';
      const clientEl = document.getElementById('assignDirectClient');
      if (clientEl) {
        clientEl.innerHTML = `<div style="font-size:13px;color:${isTop?'var(--top-purple)':'var(--ink)'};font-weight:600;">${isTop?'⭐ ':''}${nombre}</div>`;
      }

      // Mostrar staff inmediatamente con el área correcta
      renderAssignDirectStaff({}, area);
    } catch(e) {
      console.error('renderAssignDirect error:', e);
      // Fallback: mostrar staff sin datos de contexto
      renderAssignDirectStaff({}, 'Cejas');
    }

    // Cargar disponibilidad en background
    try {
      const result = await Promise.race([
        apiGet('getListaCompleta'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (result && result.success) {
        const staffAvailability = {};
        [...(result.enServicio || []), ...(result.porCobrar || [])].forEach(item => {
          const chica = item.tomadaPor;
          if (!staffAvailability[chica]) staffAvailability[chica] = [];
          staffAvailability[chica].push(item.nombre);
        });
        // Usar el mismo área del formulario TM
        const area2 = getAreaFromTMForm();
        renderAssignDirectStaff(staffAvailability, area2);
      }
    } catch(err) { /* timeout o error — staff ya visible */ }
  }

  function renderAssignDirectStaff(staffAvailability, area) {
    const allStaff = [
      { name: 'María',  area: 'Cejas',    areas: ['cejas', 'depilacion', 'retiro_lifting'] },
      { name: 'Keyla',  area: 'Cejas',    areas: ['cejas', 'depilacion', 'retiro_lifting'] },
      { name: 'Lesly',  area: 'Cejas',    areas: ['cejas', 'depilacion', 'retiro_lifting'] },
      { name: 'Rosa',   area: 'Cejas',    areas: ['cejas', 'depilacion', 'retiro_lifting'] },
      { name: 'Yadira', area: 'Pestañas', areas: ['pestanas'] },
      { name: 'Diana',  area: 'Pestañas', areas: ['pestanas'] },
      { name: 'Laura',  area: 'Facial',   areas: ['facial'] }
    ];
    const _areaMapGTL = { 'Cejas':'cejas','Depilación':'depilacion','Pestañas':'pestanas','Lifting / Retiro':'retiro_lifting','Facial':'facial' };
    const areaKey = _areaMapGTL[area] || 'cejas';
    const forArea = [], others = [];

    allStaff.forEach(staff => {
      const clients = staffAvailability[staff.name] || [];
      const cap = staff.area === 'Cejas' ? 2 : 1; // solo cejas atiende 2 a la vez
      const isFull = clients.length >= cap;
      const status = isFull ? 'Ocupada' : (clients.length > 0 ? clients.length + '/' + cap : 'Libre');
      const statusBg = isFull ? 'var(--warning-bg)' : 'var(--success-bg)';
      const statusColor = isFull ? 'var(--warning)' : 'var(--success)';
      const meta = isFull
        ? `${staff.area} · Ocupada (${clients.length}/${cap})`
        : (clients.length > 0
            ? `${staff.area} · ${clients.length}/${cap} · puede tomar otra`
            : `${staff.area} · Disponible`);
      const initials = staff.name[0];
      const html = `
        <div class="client-row" onclick="goAssign('${staff.name}')">
          <div class="client-avatar">${initials}</div>
          <div class="client-info">
            <div class="client-name">${staff.name}</div>
            <div class="client-meta">${meta}</div>
          </div>
          <div style="background:${statusBg};color:${statusColor};font-size:11px;padding:4px 10px;border-radius:100px;font-weight:600;">${status}</div>
        </div>
      `;
      if (staff.areas.includes(areaKey)) forArea.push(html);
      else others.push(html);
    });

    // Una sola lista con TODAS las staff (sin dividir por área).
    // Se mantiene el orden: primero las del área de la cita, luego el resto.
    // El estado Libre / Ocupada / "puede tomar otra" se sigue avisando por tarjeta.
    const todas = forArea.concat(others);
    let out = '';
    if (todas.length > 0) out += `<div class="section-title">Staff disponibles</div><div class="card" style="padding:8px 20px;">${todas.join('')}</div>`;
    document.getElementById('assignDirectStaffList').innerHTML = out;
  }

  async function goAssign(chica) {
    // Guard: evitar doble ejecución por touch+click o doble tap
    if (window._goAssignRunning) return;
    window._goAssignRunning = true;
    setTimeout(() => { window._goAssignRunning = false; }, 3000);

    const tipo = window._arrTipo || 'normal';
    const nombre = document.getElementById('arrSelName')?.textContent || 'Clienta';
    const codigo = (document.getElementById('arrSelCode')?.textContent || '').split(' ')[0] || '';
    const svcEl  = tipo === 'multi' ? document.getElementById('arrServiceMulti') : document.getElementById('arrService');
    const obsEl  = tipo === 'promo' ? document.getElementById('arrObsPromo') : tipo === 'multi' ? document.getElementById('arrObsMulti') : document.getElementById('arrObs');

    // ── MANDAMIENTO #8: clasificar ticket promo automáticamente ──
    if (tipo === 'promo') {
      const _c8ga = window.clasificarTicketPromoM8 ? window.clasificarTicketPromoM8() : null;
      if (_c8ga && _c8ga.tipo) console.log('🎯 M8 clasificación (assign):', _c8ga);
    }
    // ── FIN MANDAMIENTO #8 ──

    // Leer área del formulario TM unificado
    const area = getAreaFromTMForm();
    const _svcRawGA = svcEl?.value || '';
    let servicioGA = _svcRawGA, precioGA = 0;
    try { if (_svcRawGA.startsWith('{')) { const _d = JSON.parse(_svcRawGA); servicioGA = _d.nombre || _svcRawGA; precioGA = _d.precio || 0; } } catch(e) {}
    const obs = obsEl?.value || '';
    const isTop = document.getElementById('arrSelTop')?.style.display !== 'none';
    const promo = window._arrPromo || null;

    const _areaMapGA = { 'Cejas': 'cejas', 'Depilación': 'depilacion', 'Pestañas': 'pestanas', 'Lifting / Retiro': 'retiro_lifting', 'Facial': 'facial' };
    const areaKey = _areaMapGA[area] || 'cejas';

    const postData = {
      codigo: codigo,
      nombre: nombre,
      servicio: servicioGA,
      area: areaKey,
      prioridad: 'Normal',
      observaciones: obs,
      esTop: isTop ? 'Sí' : 'No',
      total: precioGA,
      asignadaA: chica
    };

    if (promo) {
      postData.promoNombre = promo.name;
      postData.precioPromo = promo.price;
      postData.precioRegular = promo.regular;
    }

    console.log('📤 Enviando a lista de espera con asignación directa a', chica, postData);

    // ── USAR FORMULARIO TM UNIFICADO (asignación directa) ────────────────
    const areasMultiGA = buildTMAreasFromForm();
    if (areasMultiGA.length === 0) {
      alert('Agregá al menos un servicio con área y servicio seleccionado.');
      return;
    }

    if (areasMultiGA.length === 1) {
      // Un solo servicio → flujo simple, nunca TM
      const aGA = areasMultiGA[0];
      const esPromoGA = aGA.tipo === 'promo';
      try {
        let result;
        if (esPromoGA) {
          result = await apiPost('addServicioPromo', {
            codigo: codigo, nombre: nombre, servicio: aGA.tentativo,
            area: aGA.area, prioridad: 'Normal', observaciones: obs,
            esTop: isTop ? 'Sí' : 'No', total: aGA.precio,
            promoNombre: aGA.tentativo, precioPromo: aGA.precio,
            precioRegular: aGA.precioNormal || aGA.precio,
            asignadaA: chica
          });
        } else {
          result = await apiPost('addServicioNormal', {
            codigo: codigo, nombre: nombre, servicio: aGA.tentativo,
            area: aGA.area, prioridad: 'Normal', observaciones: obs,
            esTop: isTop ? 'Sí' : 'No', total: aGA.precio, asignadaA: chica
          });
        }
        if (result && result.success) {
          initFormTM();
          simulateNotif('staff', 'Nueva clienta asignada a ' + chica, (codigo||'Clienta') + ' · ' + aGA.tentativo, isTop);
          enviarPushStaff([chica], '📌 Clienta asignada a vos', (isTop?'⭐ ':'')+(codigo||'Clienta')+' · '+aGA.tentativo);
          alert('✅ Clienta asignada a ' + chica);
          setTimeout(() => { show('mikaelaHome'); }, 400);
        } else {
          alert('Error: ' + (result?.error || result?.message || 'Error'));
        }
      } catch(err) { alert('Error de conexión: ' + err.message); }
      return;
    }

    // 2+ áreas → TM con asignación directa
    try {
      const tmResult = await apiPost('crearTicketMulti', {
        codigo: codigo, nombre: nombre, prioridad: 'Normal',
        observaciones: obs, areas: areasMultiGA,
        secuencia: window._secuencia.map(s => s.area),
        asignadaA: chica
      });
      if (tmResult && tmResult.success) {
        initFormTM();
        simulateNotif('staff', '🎯 Ticket multi-servicio', (codigo||'Clienta') + ' · ' + areasMultiGA.length + ' servicios', isTop);
        enviarPushStaff([chica], '🎯 Ticket multi asignado', (isTop?'⭐ ':'')+(codigo||'Clienta')+' · '+areasMultiGA.length+' servicios');
        alert('✅ Ticket creado (' + tmResult.id + ')');
        setTimeout(() => { show('mikaelaHome'); }, 400);
      } else {
        alert('Error al crear ticket: ' + (tmResult?.message || 'Error'));
      }
    } catch(err) { alert('Error de conexión: ' + err.message); }
    return;

    // Legacy path (no longer reached)
    try {
      const tienePromoGA = false;
      const accionGA = 'addServicioNormal';
      const result = await apiPost(accionGA, postData);
      console.log('📥 Respuesta de ' + accionGA + ':', result);
      
      if (result && result.success) {
        console.log('✅ Clienta agregada a lista de espera con ID:', result.id);
        window._arrPromo = null;
        
        // Notificar solo a la chica asignada
        simulateNotif('staff', `${(codigo||'Clienta')} asignada directamente`, (isTop ? '⭐ ' : '') + servicioGA, isTop);
        
        alert(`✓ ${nombre} asignada directamente a ${chica}. Notificación enviada.`);
        setTimeout(() => { show('mikaelaHome'); }, 600);
      } else {
        console.error('❌ Error en la respuesta:', result);
        alert('Error al asignar clienta: ' + (result?.error || result?.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('❌ Error enviando a lista con asignación directa:', err);
      alert('Error de conexión al asignar clienta. Verificá tu internet.');
    }
  }

  function simulateNotif(forRole, title, body, isTop) {
    const notif = document.getElementById('notification');
    document.getElementById('notifTitle').textContent = title;
    document.getElementById('notifBody').innerHTML = body;
    const icon = document.getElementById('notifIcon');
    if (isTop) {
      icon.className = 'notif-icon purple';
      icon.textContent = '⭐';
    } else {
      icon.className = 'notif-icon';
      icon.innerHTML = '<img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAQ4BDgDASIAAhEBAxEB/8QAHQABAAIDAAMBAAAAAAAAAAAAAAYHBQgJAQIEA//EAE8QAQABAwIDAwYJCAcGBQUBAAABAgMEBREGBxIhMUEIE1FhcYEUFSIyQmKRocEWIzNScpKxwglVc6PD0dIYJEOCovA0lLKz0xclRGOTg//EABoBAQACAwEAAAAAAAAAAAAAAAABBQMEBgL/xAAsEQEAAgEDAwMDAwUBAAAAAAAAAQIDBBESBRMxIUFhIlGBQ5GxFDIzUnHR/9oADAMBAAIRAxEAPwDcsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//2Q==" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;">';
    }
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), 4500);
  }

  function onNotifClick() {
    document.getElementById('notification').classList.remove('active');
    if (window.currentUser && window.currentUser.role === 'staff') {
      show('waitList');
    }
  }

  // Commission visibility toggle
  let commVisible = false;
  let COMM_DATA = { value: '****', detail: 'Cargando...', day: '****', items: [] };

  async function toggleComm() {
    commVisible = !commVisible;
    const btn = document.getElementById('commToggle');
    
    if (commVisible && COMM_DATA.value === '****') {
      // Cargar comisiones del API
      try {
        const user = window.currentUser;
        const result = await apiGet('getComisiones', { chica: user?.name || '' });
        if (result.success && result.comisiones && result.comisiones.length > 0) {
          const c = result.comisiones[0];
          COMM_DATA = {
            value: '$' + Number(c.comision || 0).toFixed(2),
            detail: (c.porcentaje || '30%') + ' sobre $' + Number(c.facturado || 0).toFixed(0) + ' · ' + (c.servicios || 0) + ' servicios',
            day: '$' + Number(c.comision || 0).toFixed(0),
            items: []
          };
        }
      } catch (err) {
        console.error('Error cargando comisiones:', err);
      }
    }

    document.getElementById('commValue').textContent = commVisible ? COMM_DATA.value : '****';
    document.getElementById('commDetail').textContent = commVisible ? COMM_DATA.detail : 'Toca el ojo para ver tu comisión';
    btn.style.background = commVisible ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
    
    const dayVal = document.querySelector('.stat.success .value.comm-hide');
    if (dayVal) dayVal.textContent = commVisible ? COMM_DATA.day : '****';
    
    document.querySelectorAll('.comm-hide').forEach((el, i) => {
      if (el.classList.contains('value')) return;
      el.textContent = commVisible ? (COMM_DATA.items[i] || '$0') : '****';
    });
  }

  document.getElementById('loginPass').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  // Registrar Service Worker para PWA
  // Service Worker deshabilitado temporalmente para evitar conflictos de caché
  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', () => {
  //     navigator.serviceWorker.register('./sw.js')
  //       .then(reg => console.log('SW registrado:', reg.scope))
  //       .catch(err => console.log('SW error:', err));
  //   });
  // }

  // ===== VENTA DIRECTA INLINE =====
  window._vdLineas = [{ producto: '', precio: 0, cantidad: 1 }];
  window._vdClienteSeleccionado = '';

  function toggleVentaDirecta() {
    const form = document.getElementById('vdForm');
    const btn  = document.getElementById('vdToggleBtn');
    const chev = document.getElementById('vdChevron');
    if (!form) return;
    const open = form.style.display === 'block';
    form.style.display = open ? 'none' : 'block';
    chev.style.transform = open ? '' : 'rotate(180deg)';
    btn.style.borderColor = open ? 'var(--line)' : 'var(--accent)';
    btn.style.borderRadius = open ? 'var(--radius-sm)' : 'var(--radius-sm) var(--radius-sm) 0 0';
    if (!open) {
      // Cargar productos y esperar antes de renderizar el dropdown
      if (!window._productosMarca || window._productosMarca.length === 0) {
        cargarProductosMarca().then(() => vdRenderLineas());
      }
      // Recargar SIEMPRE la lista de clientas al abrir, para que aparezcan las recién agregadas
      apiGet('getClientas').then(r => {
        if (r.success && r.clientas) window.CLIENT_DIRECTORY_CACHE = r.clientas
          .filter(c => c.codigo && String(c.codigo).trim() && c.nombre && String(c.nombre).trim())
          .map(c => ({ code: String(c.codigo), name: String(c.nombre) }));
      }).catch(()=>{});
      window._vdLineas = [{ producto: '', precio: 0, cantidad: 1 }];
      window._vdClienteSeleccionado = '';
      vdRenderLineas();
      vdActualizarTotal();
      document.getElementById('vdTipoCliente').value = 'existente';
      document.getElementById('vdExistenteFields').style.display = 'block';
      document.getElementById('vdNuevaFields').style.display = 'none';
      document.getElementById('vdNombreExistente').value = '';
      document.getElementById('vdClienteSuggestions').style.display = 'none';
      document.getElementById('vdFormaPago').value = '';
    }
  }

  function vdOnTipoClienteChange() {
    const v = document.getElementById('vdTipoCliente').value;
    document.getElementById('vdExistenteFields').style.display = (v === 'nueva') ? 'none' : 'block';
    document.getElementById('vdNuevaFields').style.display = (v === 'nueva') ? 'block' : 'none';
    window._vdClienteSeleccionado = '';
  }

  function vdBuscarCliente(q) {
    window._vdClienteSeleccionado = '';
    const sug = document.getElementById('vdClienteSuggestions');
    if (!q || q.length < 2) { sug.style.display = 'none'; return; }
    const lista = window.CLIENT_DIRECTORY_CACHE || [];
    const found = lista.filter(c => (c.name||'').toLowerCase().includes(q.toLowerCase())).slice(0, 8);
    if (found.length === 0) { sug.style.display = 'none'; return; }
    sug.innerHTML = found.map(c =>
      `<div onclick="vdSeleccionarCliente('${(c.name||'').replace(/'/g,"\\'")}',this)"
        style="padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer;border-bottom:1px solid var(--line);"
        onmouseover="this.style.background='var(--accent-bg)'" onmouseout="this.style.background=''">
        ${c.name}
      </div>`
    ).join('');
    sug.style.display = 'block';
  }

  function vdSeleccionarCliente(nombre) {
    window._vdClienteSeleccionado = nombre;
    document.getElementById('vdNombreExistente').value = nombre;
    document.getElementById('vdClienteSuggestions').style.display = 'none';
  }

  function vdRenderLineas() {
    const container = document.getElementById('vdProductLines');
    if (!container) return;
    const productos = window._productosMarca || [];
    container.innerHTML = window._vdLineas.map((linea, idx) => {
      const opts = productos.map(p =>
        `<option value="${p.nombre}|${p.precio}" ${linea.producto === p.nombre ? 'selected' : ''}>${p.nombre} — $${p.precio}</option>`
      ).join('');
      const subtotal = linea.precio > 0 ? '$' + (linea.precio * (linea.cantidad||1)).toFixed(2) : '';
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <select onchange="vdOnProductoChange(${idx},this)"
            style="flex:1;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;background:var(--bg);color:var(--ink);appearance:none;-webkit-appearance:none;">
            <option value="">Producto... ▾</option>
            ${opts}
          </select>
          ${window._vdLineas.length > 1
            ? `<button onclick="vdQuitarLinea(${idx})" style="background:none;border:none;color:#e53;font-size:18px;cursor:pointer;padding:2px 4px;">✕</button>`
            : '<div style="width:26px;"></div>'}
        </div>
        ${linea.producto ? `<div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;color:var(--ink-soft);flex:1;">Cantidad:</div>
          <div style="display:flex;align-items:center;gap:6px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:10px;padding:4px 10px;">
            <button onclick="vdCambiarCantidad(${idx},-1)" style="background:none;border:none;font-size:18px;font-weight:700;cursor:pointer;color:var(--ink);line-height:1;padding:0 2px;">−</button>
            <span id="vdCant_${idx}" style="min-width:28px;text-align:center;font-size:15px;font-weight:800;">${linea.cantidad||1}</span>
            <button onclick="vdCambiarCantidad(${idx},1)" style="background:none;border:none;font-size:18px;font-weight:700;cursor:pointer;color:var(--ink);line-height:1;padding:0 2px;">+</button>
          </div>
          <div style="min-width:60px;text-align:right;font-size:14px;font-weight:800;color:var(--ink);">${subtotal}</div>
        </div>` : ''}
      </div>`;
    }).join('');
    container.innerHTML += `<button onclick="vdAgregarLinea()" style="width:100%;padding:9px;background:none;border:1.5px dashed var(--line);border-radius:10px;font-family:inherit;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;margin-bottom:4px;">+ Adicional</button>`;
  }

  function vdOnProductoChange(idx, sel) {
    const val = sel.value;
    const cantActual = window._vdLineas[idx]?.cantidad || 1;
    if (!val) { window._vdLineas[idx] = { producto: '', precio: 0, cantidad: 1 }; }
    else { const [n, p] = val.split('|'); window._vdLineas[idx] = { producto: n, precio: Number(p)||0, cantidad: cantActual }; }
    vdRenderLineas();
    vdActualizarTotal();
  }

  function vdCambiarCantidad(idx, delta) {
    const linea = window._vdLineas[idx];
    if (!linea || !linea.producto) return;
    linea.cantidad = Math.max(1, (linea.cantidad || 1) + delta);
    vdRenderLineas();
    vdActualizarTotal();
  }

  function vdAgregarLinea() { window._vdLineas.push({ producto: '', precio: 0, cantidad: 1 }); vdRenderLineas(); }

  function vdQuitarLinea(idx) { window._vdLineas.splice(idx, 1); vdRenderLineas(); vdActualizarTotal(); }

  function vdActualizarTotal() {
    const total = window._vdLineas.reduce((s, l) => s + ((l.precio || 0) * (l.cantidad || 1)), 0);
    const el = document.getElementById('vdTotal');
    if (el) el.textContent = '$' + total.toFixed(2);
  }

  async function vdPagarAhora() {
    const tipo = document.getElementById('vdTipoCliente').value;
    let nombreCliente = '';
    if (tipo === 'nueva') {
      const n = (document.getElementById('vdNuevaNombre').value||'').trim();
      const a = (document.getElementById('vdNuevaApellido').value||'').trim();
      nombreCliente = (n + ' ' + a).trim() || 'Cliente';
    } else {
      nombreCliente = window._vdClienteSeleccionado || (document.getElementById('vdNombreExistente').value||'').trim() || 'Cliente';
    }
    const lineasValidas = window._vdLineas.filter(l => l.producto);
    if (lineasValidas.length === 0) { showToast('⚠ Seleccioná al menos un producto'); return; }
    const formaPago = document.getElementById('vdFormaPago').value;
    if (!formaPago) { showToast('⚠ Seleccioná la forma de pago'); return; }
    const total = lineasValidas.reduce((s, l) => s + (l.precio * (l.cantidad || 1)), 0);
    const productos = lineasValidas.map(l => ({ nombre: l.producto, precio: l.precio, cantidad: l.cantidad || 1, subtotal: l.precio * (l.cantidad || 1) }));
    descontarStockVenta(productos);
    try {
      await apiPost('registrarVentaProductos', { idEspera: '', clienteNombre: nombreCliente, productos, total, esVentaDirecta: true, metodoPago: formaPago });
      showToast('✓ Venta registrada — $' + total.toFixed(2) + ' · ' + formaPago);
      toggleVentaDirecta();
      window._vdLineas = [{ producto: '', precio: 0, cantidad: 1 }];
    } catch(e) { console.error(e); showToast('⚠ Error al registrar la venta'); }
  }


  // ===== SISTEMA DE COBRO GRUPAL (Esperar asignación) =====
  // Máximo 5 clientas en lista de espera de cobro
  window._mkEsperandoCobro = []; // [{idEspera, nombre, servicio, total, tomadaPor, precioRegular, promoNombre, desglose}]

  function mkEsperarAsignacion(idEspera, nombre, servicio, total, tomadaPor, precioRegular, promoNombre, desgloseEnc) {
    if (window._mkEsperandoCobro.length >= 5) {
      showToast('⚠ Máximo 5 clientas en espera de asignación');
      return;
    }
    if (window._mkEsperandoCobro.find(c => c.idEspera === idEspera)) {
      showToast('Ya está en la lista de espera');
      return;
    }
    window._mkEsperandoCobro.push({ idEspera, nombre, servicio, total: Number(total)||0, tomadaPor, precioRegular: Number(precioRegular)||Number(total)||0, promoNombre, desgloseEnc });
    mkRenderEsperandoCobro();
    mkActualizarAsignarOpciones();
    showToast('⏳ ' + nombre + ' esperando asignación de cobro');
  }

  function mkRenderEsperandoCobro() {
    const lista = window._mkEsperandoCobro;
    const section = document.getElementById('esperandoAsignacionSection');
    const listEl  = document.getElementById('esperandoAsignacionList');
    const countEl = document.getElementById('esperandoAsignacionCount');
    if (!section) return;
    if (lista.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    countEl.textContent = lista.length;
    listEl.innerHTML = lista.map((c, idx) => `
      <div class="card" style="margin-bottom:8px;padding:14px;border-left:4px solid var(--accent);display:flex;align-items:center;gap:12px;">
        <div class="client-avatar" style="flex-shrink:0;">${c.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;">${c.nombre}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${c.servicio} · $${c.total.toFixed(2)}</div>
          <div style="font-size:11px;color:var(--ink-faint);margin-top:1px;">Esperando asignación de cobro</div>
        </div>
        <button onclick="mkQuitarEsperaCobro(${idx})" style="background:none;border:none;color:var(--danger,#e53);font-size:20px;cursor:pointer;padding:4px;">✕</button>
      </div>
    `).join('');
  }

  function mkQuitarEsperaCobro(idx) {
    window._mkEsperandoCobro.splice(idx, 1);
    mkRenderEsperandoCobro();
    mkActualizarAsignarOpciones();
  }

  function mkActualizarAsignarOpciones() {
    // Para cada card en Por cobrar, mostrar/ocultar el row de asignar y llenar opciones
    const lista = window._mkEsperandoCobro;
    document.querySelectorAll('[id^="asignarRow-"]').forEach(row => {
      const idEspera = row.id.replace('asignarRow-', '');
      const opcionesEl = document.getElementById('asignarOpciones-' + idEspera);
      if (!opcionesEl) return;
      if (lista.length === 0) {
        row.style.display = 'none';
        return;
      }
      row.style.display = 'block';
      opcionesEl.innerHTML = lista.map((c, idx) => `
        <button onclick="mkAsignarAlCobroById('${idEspera}', '${c.idEspera}')"
          style="padding:7px 12px;background:var(--accent-bg);color:var(--accent);border:1.5px solid var(--accent);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">
          + ${c.nombre.split(' ')[0]}
        </button>
      `).join('');
    });
  }

  // Abre el cobrarModal con múltiples clientas combinadas
  // Versión robusta que busca por idEspera en vez de índice numérico
  function mkAsignarAlCobroById(idEsperaPrincipal, idEsperaAsignada) {
    // Recargar _mkPorCobrarData desde el backend si está vacío
    if (!window._mkPorCobrarData || window._mkPorCobrarData.length === 0) {
      apiGet('getPorCobrar').then(r => {
        window._mkPorCobrarData = r.porCobrar || [];
        mkAsignarAlCobroById(idEsperaPrincipal, idEsperaAsignada);
      });
      return;
    }
    const principal = window._mkPorCobrarData.find(p => p.idEspera === idEsperaPrincipal);
    const asignada  = window._mkEsperandoCobro?.find(c => c.idEspera === idEsperaAsignada);
    if (!principal) { showToast('⚠ No se encontró la clienta principal'); return; }
    if (!asignada)  { showToast('⚠ No se encontró la clienta asignada'); return; }
    const idxEsperando = window._mkEsperandoCobro.indexOf(asignada);
    mkAsignarAlCobro(idEsperaPrincipal, idxEsperando);
  }

  // Editar el valor de una clienta en el cobro grupal → queda como valor FINAL
  function cobrarEditarMontoGrupal(idx) {
    const g = window._cobroGrupal;
    if (!g || !g.clientas || !g.clientas[idx]) return;
    const c = g.clientas[idx];
    const actual = Number(c.total) || 0;
    const txt = prompt('Nuevo valor para "' + (c.nombre || 'clienta') + '" ($' + actual.toFixed(2) + '):', actual);
    if (txt === null) return;
    const nuevo = Number(String(txt).replace(',', '.'));
    if (isNaN(nuevo) || nuevo < 0) { showToast('Valor inválido'); return; }
    c.total = nuevo;
    c._editado = true; // valor FINAL fijado por Mikaela (igual en efectivo y tarjeta)
    // Repartir el valor editado proporcionalmente en el desglose, para que la COMISIÓN
    // de cada staff salga sobre el valor final (no sobre el original). monto = montoNormal
    // = valor final, así no se vuelve a recalcular en tarjeta.
    if (Array.isArray(c.serviciosDetalle) && c.serviciosDetalle.length > 0) {
      const sumOrig = c.serviciosDetalle.reduce(function(s,d){ return s + (Number(d.monto)||0); }, 0);
      let acum = 0;
      c.serviciosDetalle.forEach(function(d, di){
        let parte;
        if (di === c.serviciosDetalle.length - 1) {
          parte = Math.round((nuevo - acum) * 100) / 100; // la última línea absorbe el redondeo
        } else {
          const prop = sumOrig > 0 ? ((Number(d.monto)||0) / sumOrig) : (1 / c.serviciosDetalle.length);
          parte = Math.round(nuevo * prop * 100) / 100;
          acum += parte;
        }
        d.monto = parte;
        d.montoNormal = parte;
        d._editado = true;
      });
    }
    g.totalPromo   = g.clientas.reduce((s, x) => s + (Number(x.total)||0), 0);
    g.totalRegular = g.clientas.reduce((s, x) => s + (x._editado ? (Number(x.total)||0) : (Number(_regularClienta(x))||0)), 0);
    window._cobrarTotalPromo   = g.totalPromo;
    window._cobrarTotalRegular = g.totalRegular;
    const desgloseItems = document.getElementById('cobrarDesgloseItems');
    if (desgloseItems) {
      desgloseItems.innerHTML = g.clientas.map((x, i) => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line);">
          <div>
            <div style="font-size:13px;font-weight:700;">${x.nombre}</div>
            <div style="font-size:11px;color:var(--ink-soft);">${x.servicio} · ${x.tomadaPor}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-size:14px;font-weight:800;${x._editado ? 'color:var(--accent-deep);' : ''}">$${(Number(x.total)||0).toFixed(2)}</div>
            <button onclick="cobrarEditarMontoGrupal(${i})" title="Editar valor" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px;">✏️</button>
          </div>
        </div>
      `).join('');
    }
    refreshCobrarTotal();
  }
  window.cobrarEditarMontoGrupal = cobrarEditarMontoGrupal;

  function mkAsignarAlCobro(idEsperaPrincipal, idxEsperando) {
    const principal = window._mkPorCobrarData?.find(p => p.idEspera === idEsperaPrincipal);
    const asignada  = window._mkEsperandoCobro[idxEsperando];
    if (!principal || !asignada) { showToast('Error: no se encontraron datos'); return; }

    // Construir el cobro combinado
    const clientas = [principal, asignada];
    window._cobroGrupal = { clientas, idxEsperando };
    if (typeof factResetUI === 'function') factResetUI();  // oculta el bloque de facturación en cobro grupal (v2 pendiente)

    // Calcular total combinado
    const totalCombinado = clientas.reduce((s, c) => s + (Number(c.total)||0), 0);

    // Abrir modal con desglose combinado
    const modalTitle = document.querySelector('#cobrarModal .modal-title');
    if (modalTitle) modalTitle.textContent = '💵 Cobro grupal';

    const nameEl = document.getElementById('cobrarClientName');
    if (nameEl) nameEl.innerHTML = clientas.map(c => `<span style="font-weight:800;">${c.nombre.split(' ')[0]}</span>`).join(' <span style="color:var(--ink-faint)">+</span> ');

    // Mostrar desglose combinado
    const desgloseEl = document.getElementById('cobrarDesglose');
    const desgloseItems = document.getElementById('cobrarDesgloseItems');
    const simpleEl = document.getElementById('cobrarSimple');
    desgloseEl.style.display = 'block';
    simpleEl.style.display = 'none';
    desgloseItems.innerHTML = clientas.map((c, idx) => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:13px;font-weight:700;">${c.nombre}</div>
          <div style="font-size:11px;color:var(--ink-soft);">${c.servicio} · ${c.tomadaPor}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:14px;font-weight:800;${c._editado ? 'color:var(--accent-deep);' : ''}">$${(Number(c.total)||0).toFixed(2)}</div>
          <button onclick="cobrarEditarMontoGrupal(${idx})" title="Editar valor" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px;">✏️</button>
        </div>
      </div>
    `).join('');

    // Calcular totales grupales considerando promos (ANTES de usarlos)
    const totalGrupalPromo    = clientas.reduce((s, c) => s + (Number(c.total)||0), 0);
    const totalGrupalRegular  = clientas.reduce((s, c) => s + (c._editado ? (Number(c.total)||0) : (Number(_regularClienta(c))||0)), 0);
    const hayPromoGrupal      = clientas.some(c => c.promoNombre && c.promoNombre.trim() !== '');

    window._cobrarTotalPromo   = totalGrupalPromo.toFixed(2);
    window._cobrarTotalRegular = totalGrupalRegular.toFixed(2);
    window._cobrarTienePromo   = hayPromoGrupal;
    window._cobroGrupal.totalPromo   = totalGrupalPromo;
    window._cobroGrupal.totalRegular = totalGrupalRegular;

    document.getElementById('cobrarSubtotal').textContent = '$' + totalGrupalPromo.toFixed(2);
    document.getElementById('cobrarTotal').textContent = '$' + totalGrupalPromo.toFixed(2);

    // Mostrar banner de promo si alguna clienta tiene promo
    const promoBannerEl  = document.getElementById('cobrarPromoBanner');
    const tarjetaAvisoEl = document.getElementById('cobrarTarjetaAviso');
    tarjetaAvisoEl.style.display = 'none';
    if (hayPromoGrupal) {
      const nombresPromo = clientas.filter(c => c.promoNombre).map(c => c.promoNombre).join(', ');
      document.getElementById('cobrarPromoName').textContent = nombresPromo;
      promoBannerEl.style.display = 'block';
    } else {
      promoBannerEl.style.display = 'none';
    }
    document.querySelectorAll('#cobrarModal .pago-btn').forEach((b, i) => {
      b.style.background = i === 0 ? 'var(--success)' : 'var(--bg-card)';
      b.style.borderColor = i === 0 ? 'var(--success)' : 'var(--line)';
      b.style.color = i === 0 ? 'white' : 'var(--ink)';
    });
    window._cobroPago = 'Efectivo';

    // Cobro grupal: usar el código de la clienta principal para abono
    window._cobrarCodigo = (clientas[0] && clientas[0].codigo) ? clientas[0].codigo : '';
    window._cobrarAbonoMonto = 0;
    // Cargar abono activo de la clienta principal si tiene código
    if (window._cobrarCodigo && typeof _cobroCargarAbono === 'function') {
      setTimeout(function() { _cobroCargarAbono(); }, 200);
    } else {
      var _abRowG = document.getElementById('cobrarAbonoRow');
      if (_abRowG) _abRowG.style.display = 'none';
    }

    document.getElementById('cobrarModal').classList.add('active');
  }

  // ── TICKET MULTI — funciones de la staff ──────────────────
  async function completarAreaMulti() {
    const slot = window._finishingSlot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;
    try {
      // Guardar copia de servicios ANTES de limpiar el slot
      window['_slotServicesBefore' + slot] = [...(slotServices[slot] || [])];

      const r = await apiPost('completarAreaTicketMulti', {
        idEspera,
        chicaNombre: user?.name || ''
      });
      if (r.success) {
        // Calcular comisión de esta staff
        const svcsHechosMu = (window['_slotServicesBefore' + slot] || slotServices[slot] || []).filter(function(s) {
          return s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado';
        });
        const totalHechoMu = svcsHechosMu.reduce(function(s,v){ return s + Number(v.price||0); }, 0);
        const pctMu = (user && user.area === 'facial') ? 0.4 : 0.3;
        const comisionMu = Math.round(totalHechoMu * pctMu * 100) / 100;
        const svcNombreMu = svcsHechosMu.map(function(s){ return s.name; }).join(' + ') || 'Servicio';

        slotServices[slot] = [];
        window[slot === 1 ? '_as1IdEspera' : '_as2IdEspera'] = '';
        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        show('staffHome');
        await new Promise(res => setTimeout(res, 300));
        loadStaffHome();
        if (r.todasCompletadas) {
          // FIX: si todas las áreas quedaron completas, la clienta pasa a cobro con Mikaela
          // (aunque se haya usado el botón "pasar a otra staff" — el sistema detecta que ya no hay más)
          showToast('✅ Multi-servicio completo · $' + totalHechoMu + ' · Enviado a cobrar con Mikaela');
        } else {
          showToast('✅ ' + svcNombreMu + ' $' + totalHechoMu + ' · Tu comisión: $' + comisionMu + ' · Sigue: ' + (r.siguienteArea || 'siguiente área') + ' en lista de espera');
        }
      } else {
        alert('Error: ' + r.message);
      }
    } catch(e) { alert('Error de conexión'); }
  }

  async function completarAreaMultiFinal() {
    const slot = window._finishingSlot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;

    // Si es SP- (promo individual), delegar a finalizarServicioSP que prepara _finishingData
    if (idEspera && idEspera.startsWith('SP-')) {
      await finalizarServicioSP(slot);
      return;
    }

    // Construir desglose completo: áreas previas (del TM) + área actual
    let desgloseCompleto = [];
    try {
      const tmData = await apiGet('getTicketMulti');
      if (tmData.success) {
        const tm = (tmData.activos || []).find(t => t.idEspera === idEspera);
        if (tm && tm.areas) {
          // Incluir todas las áreas con datos (ya completadas + la actual)
          tm.areas.forEach(ar => {
            if (ar.tentativo || ar.confirmado) {
              desgloseCompleto.push({
                staff: ar.staff || user?.name || '',
                servicio: ar.confirmado || ar.tentativo || ar.area || '',
                area: ar.area || '',
                monto: Number(ar.precio || 0)
              });
            }
          });
        }
      }
    } catch(e) {}

    // Si no hay desglose del TM, usar lo que hay en slotServices
    if (desgloseCompleto.length === 0) {
      const svcs = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente');
      desgloseCompleto = svcs.map(s => ({
        staff: user?.name || '',
        servicio: s.name,
        area: s.area || user?.area || '',
        monto: Number(s.price || 0)
      }));
    }

    try {
      const r = await apiPost('completarAreaTicketMulti', {
        idEspera,
        chicaNombre: user?.name || '',
        esUltima: true,
        absorberPendientes: true,
        desgloseCompleto: desgloseCompleto
      });
      if (r.success) {
        // Guardar copia ANTES de limpiar para calcular comisión
        const svcsParaComision = [...(slotServices[slot] || [])].filter(function(s){ return s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado'; });
        slotServices[slot] = [];
        window[slot === 1 ? '_as1IdEspera' : '_as2IdEspera'] = '';
        if (user && activeClients[user.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        const totalFinal2 = svcsParaComision.reduce(function(s,v){ return s + Number(v.price||0); }, 0);
        const pctFinal = (user && user.area === 'facial') ? 0.4 : 0.3;
        const comisionFinal = Math.round(totalFinal2 * pctFinal * 100) / 100;
        const svcFinalNombre = svcsParaComision.map(function(s){ return s.name; }).join(' + ') || 'Servicio';

        if (r.todasCompletadas) {
          // ── TODAS las áreas completadas → clienta pasa a "Por cobrar" con Mikaela ──
          // El TM ya está marcado como "Por cobrar" en el backend.
          // Solo mostrar toast y volver al home — Mikaela lo verá en su sección "Por cobrar".
          showToast('✅ Multi-servicio completo · $' + totalFinal2 + ' · Enviado a cobrar con Mikaela');
        } else {
          // Aún quedan áreas → la clienta vuelve a lista de espera para la siguiente staff
          showToast('✅ ' + svcFinalNombre + ' completado · Sigue: ' + (r.siguienteArea || 'siguiente área'));
        }

        show('staffHome');
        await new Promise(res => setTimeout(res, 300));
        loadStaffHome();
      } else {
        alert('Error: ' + r.message);
      }
    } catch(e) { alert('Error de conexión'); }
  }

  function openRegistrarVisitaFacial() {
    const c = CLIENT_PROFILES[currentProfileClient]; if (!c) return;
    ['rvfServicio','rvfPrecio','rvfProcedimiento','rvfProductos','rvfObs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('registrarVisitaFacialModal').classList.add('active');
  }
  async function guardarVisitaFacial() {
    const btn = document.getElementById('rvfGuardarBtn');
    try {
      // Puede venir del perfil (currentProfileClient) o del panel de Laura (_currentFacialClientKey)
      const clientKey    = window._currentFacialClientKey    || currentProfileClient || '';
      const clientCodigo = window._currentFacialClientCodigo || CLIENT_PROFILES[clientKey]?.code || '';
      const clientNombre = window._currentFacialClientNombre || CLIENT_PROFILES[clientKey]?.name || '';

      const servicio = document.getElementById('rvfServicio').value.trim();
      const precio   = Number(document.getElementById('rvfPrecio').value) || 0;
      const proc     = document.getElementById('rvfProcedimiento').value.trim();
      const prods    = document.getElementById('rvfProductos').value.trim();
      const obs      = document.getElementById('rvfObs').value.trim();

      if (!servicio) { alert('Indicá el servicio realizado'); return; }
      if (!clientCodigo) { alert('Error: no se encontró el código de la clienta. Cerrá y volvé a abrir el modal.'); return; }

      btn.disabled = true; btn.textContent = 'Guardando...';

      const user = window.currentUser;
      const result = await apiPost('addVisitaFacial', {
        codigo: clientCodigo, nombre: clientNombre, servicio, precio,
        staff: user?.name || '',
        procedimiento: proc,
        productosUsados: prods,
        obs
      });

      if (result && result.success) {
        // Actualizar perfil local
        if (clientKey) {
          if (!CLIENT_PROFILES[clientKey]) {
            CLIENT_PROFILES[clientKey] = { name: clientNombre, code: clientCodigo, facial: { history: [] } };
          }
          const cLocal = CLIENT_PROFILES[clientKey];
          if (!cLocal.facial) cLocal.facial = { history: [] };
          if (!cLocal.facial.history) cLocal.facial.history = [];
          const today = new Date();
          const fecha = today.getDate().toString().padStart(2,'0') + '/' + (today.getMonth()+1).toString().padStart(2,'0') + '/' + today.getFullYear();
          cLocal.facial.history.unshift({ service: servicio, price: precio, date: fecha, by: user?.name||'', procedimiento: proc, productosUsados: prods, obs });
          if (cLocal.facial.history.length > 5) cLocal.facial.history = cLocal.facial.history.slice(0, 5);
        }
        // Limpiar overrides
        window._currentFacialClientKey    = null;
        window._currentFacialClientNombre = null;
        window._currentFacialClientCodigo = null;
        closeModal();
        if (clientKey && clientKey === currentProfileClient) renderProfileTab();
        showToast('✅ Visita facial registrada');
      } else {
        alert('Error al guardar: ' + (result?.message || 'respuesta inválida del servidor'));
      }
    } catch(e) {
      console.error('guardarVisitaFacial error:', e);
      alert('Error de conexión al guardar la visita. Intentá de nuevo.');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar visita facial';
    }
  }
  // ── MANDAMIENTO #7: helper para el selector de tipo de visita pestañas ──
  function toggleRvpTipoVisita(tipo) {
    const aviso = document.getElementById('rvpAviso');
    if (!aviso) return;
    if (tipo === 'Nuevas') {
      aviso.style.display = 'block';
      aviso.textContent = '✨ Fullset nuevo — registrá el modelo, diseño y tallas que usaste.';
      aviso.style.color = 'var(--top-purple)';
      aviso.style.background = 'var(--top-purple-bg, #f5f0ff)';
      aviso.style.borderColor = 'var(--top-purple)';
    } else if (tipo === 'Retoque') {
      aviso.style.display = 'block';
      aviso.textContent = '🔄 Retoque/Mantenimiento — se actualizará la ficha activa de la clienta.';
      aviso.style.color = 'var(--info)';
      aviso.style.background = 'var(--info-bg)';
      aviso.style.borderColor = 'var(--info)';
    } else {
      aviso.style.display = 'none';
    }
  }
  window.toggleRvpTipoVisita = toggleRvpTipoVisita;

  function openRegistrarVisitaPestanas() {
    const c = CLIENT_PROFILES[currentProfileClient]; if (!c) return;
    ['rvpServicio','rvpPrecio','rvpTallas','rvpObs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['rvpModelo','rvpDiseno','rvpTipoVisita'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
    // ── MANDAMIENTO #7: pre-seleccionar tipo según si tiene ficha o no ──
    const tieneFicha = c.pestanas?.fichas && c.pestanas.fichas.length > 0;
    const tipoEl = document.getElementById('rvpTipoVisita');
    if (tipoEl) { tipoEl.value = tieneFicha ? 'Retoque' : 'Nuevas'; toggleRvpTipoVisita(tipoEl.value); }
    const avisoEl = document.getElementById('rvpAviso'); if (avisoEl) avisoEl.style.display = 'none';
    document.getElementById('registrarVisitaPestanasModal').classList.add('active');
  }
  async function guardarVisitaPestanas() {
    const c = CLIENT_PROFILES[currentProfileClient]; if (!c) return;
    // ── MANDAMIENTO #7: tipo de visita obligatorio ──
    const tipoVisita = (document.getElementById('rvpTipoVisita')?.value || '').trim();
    if (!tipoVisita) { alert('Seleccioná el tipo de visita (Nuevas o Retoque)'); return; }
    const servicio = document.getElementById('rvpServicio').value.trim();
    const modelo = document.getElementById('rvpModelo').value;
    const diseno = document.getElementById('rvpDiseno').value;
    const tallas = document.getElementById('rvpTallas').value.trim();
    const obs = document.getElementById('rvpObs').value.trim();
    const precio = Number(document.getElementById('rvpPrecio').value) || 0;
    if (!servicio && !modelo) { alert('Indicá el servicio o seleccioná el modelo'); return; }
    const btn = document.getElementById('rvpGuardarBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      const user = window.currentUser;
      const servicioFinal = servicio || (tipoVisita + (modelo ? ' · ' + modelo : '') + (diseno ? ' · ' + diseno : ''));
      // ── MANDAMIENTO #7: incluir tipoVisita en el registro ──
      const result = await apiPost('addFichaPestanas', { codigo: c.code, nombre: c.name, modelo, diseno, tallas, obs, tipoVisita });
      if (result && result.success) {
        if (!c.pestanas) c.pestanas = { fichas: [], history: [] };
        if (!c.pestanas.history) c.pestanas.history = [];
        const today = new Date();
        const fecha = today.getDate().toString().padStart(2,'0') + '/' + (today.getMonth()+1).toString().padStart(2,'0') + '/' + today.getFullYear();
        c.pestanas.history.unshift({ service: servicioFinal, price: precio, date: fecha, by: user?.name||'', modelo, diseno, tallas, tipoVisita });
        if (c.pestanas.history.length > 5) c.pestanas.history = c.pestanas.history.slice(0, 5);
        if (!c.pestanas.fichas) c.pestanas.fichas = [];
        // Si es retoque, no reemplazar la ficha activa — solo actualizar obs/tallas
        if (tipoVisita === 'Nuevas') {
          c.pestanas.fichas.forEach(f => f.activa = false);
          c.pestanas.fichas.unshift({ modelo, diseno: diseno||'—', tallas: tallas||'—', obs, fecha, activa: true, tipoVisita });
          if (c.pestanas.fichas.length > 5) c.pestanas.fichas.pop();
        } else {
          // Retoque: actualizar ficha activa si existe
          const fichaActiva = c.pestanas.fichas.find(f => f.activa);
          if (fichaActiva) { if (obs) fichaActiva.obs = obs; if (tallas) fichaActiva.tallas = tallas; }
        }
        closeModal(); renderProfileTab(); showToast('✅ ' + tipoVisita + ' de pestañas registrado');
      } else { alert('Error: ' + (result?.message || 'desconocido')); }
    } catch(e) { alert('Error de conexión'); }
    btn.disabled = false; btn.textContent = '💾 Guardar visita';
  }

  // ── FICHA FACIAL RÁPIDA (panel de staff) ──────────────────────

  function loadFacialFichaQuick(clientKey, slot) {
    const el = document.getElementById('facialFichaQuick' + slot);
    if (!el) return;
    const client = CLIENT_PROFILES[clientKey];
    const ficha  = client?.facial?.ficha; // datos base guardados
    const hayVisitas = client?.facial?.history && client.facial.history.length > 0;

    el.style.display = 'block';

    if (ficha && ficha.tipoPiel) {
      // Tiene ficha — mostrar resumen + botón registrar visita
      el.innerHTML = '<div style="background:linear-gradient(135deg,#1a4a32,#2d6a4f);color:white;border-radius:20px;padding:16px;margin-bottom:10px;">'
        + '<div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:8px;">Ficha facial · ' + (client.name || '') + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
        + '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:8px;text-align:center;"><div style="font-size:9px;opacity:.7;font-weight:600;">Tipo de piel</div><div style="font-size:12px;font-weight:800;margin-top:2px;">' + (ficha.tipoPiel||'—') + '</div></div>'
        + '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:8px;text-align:center;"><div style="font-size:9px;opacity:.7;font-weight:600;">Biotipo</div><div style="font-size:12px;font-weight:800;margin-top:2px;">' + (ficha.biotipo||'—') + '</div></div>'
        + '</div>'
        + (ficha.alergias ? '<div style="font-size:11px;opacity:.9;margin-bottom:8px;">⚠️ Alergias: ' + ficha.alergias + '</div>' : '')
        + '<div style="font-size:10px;opacity:.7;">' + (hayVisitas ? client.facial.history.length + ' visita(s) registrada(s)' : 'Primera visita') + '</div>'
        + '</div>'
        + '<button onclick="openRegistrarVisitaFacialFromPanel()" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--success),#2d5a3a);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px;">✅ Registrar visita de hoy</button>'
        + '<button onclick="openNuevaFichaFacialFromPanel(\'' + clientKey + '\',' + slot + ')" style="width:100%;padding:10px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink-soft);">✏️ Actualizar ficha</button>';
    } else {
      // Sin ficha — mostrar botón crear ficha
      el.innerHTML = '<div style="background:var(--bg-card);border:2px dashed #2d6a4f;border-radius:20px;padding:18px;text-align:center;margin-bottom:10px;">'
        + '<div style="margin-bottom:6px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2Z"/></svg></div>'
        + '<div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#2d6a4f;">Sin ficha facial</div>'
        + '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:12px;">Creá la ficha base de la clienta para llevar su historial</div>'
        + '<button onclick="openNuevaFichaFacialFromPanel(\'' + clientKey + '\',' + slot + ')" style="padding:14px 24px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">+ Crear ficha facial</button>'
        + '</div>'
        + '<button onclick="openRegistrarVisitaFacialFromPanel()" style="width:100%;padding:10px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink-soft);">Saltar ficha — solo registrar visita</button>';
    }
  }

  function openNuevaFichaFacialFromPanel(clientKey, slot) {
    window._currentFacialClientKey = clientKey || window._currentFacialClientKey;
    // Pre-cargar datos existentes si los hay
    const ficha = CLIENT_PROFILES[clientKey]?.facial?.ficha;
    const ids = ['nffBiotipo','nffTipoPiel','nffFototipo','nffAlergias','nffMedicamentos','nffObs'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (ficha) {
      if (document.getElementById('nffBiotipo')) document.getElementById('nffBiotipo').value = ficha.biotipo || '';
      if (document.getElementById('nffTipoPiel')) document.getElementById('nffTipoPiel').value = ficha.tipoPiel || '';
      if (document.getElementById('nffFototipo')) document.getElementById('nffFototipo').value = ficha.fototipo || '';
      if (document.getElementById('nffAlergias')) document.getElementById('nffAlergias').value = ficha.alergias || '';
      if (document.getElementById('nffMedicamentos')) document.getElementById('nffMedicamentos').value = ficha.medicamentos || '';
      if (document.getElementById('nffObs')) document.getElementById('nffObs').value = ficha.obs || '';
    }
    document.getElementById('nuevaFichaFacialModal').classList.add('active');
  }

  async function guardarNuevaFichaFacial() {
    const btn = document.getElementById('nffGuardarBtn');
    try {
      const clientKey    = window._currentFacialClientKey || '';
      const clientCodigo = window._currentFacialClientCodigo || CLIENT_PROFILES[clientKey]?.code || '';
      const clientNombre = window._currentFacialClientNombre || CLIENT_PROFILES[clientKey]?.name || '';
      if (!clientCodigo) { alert('Error: no se encontró el código de la clienta'); return; }

      const fichaData = {
        biotipo:      document.getElementById('nffBiotipo').value,
        tipoPiel:     document.getElementById('nffTipoPiel').value,
        fototipo:     document.getElementById('nffFototipo').value,
        alergias:     document.getElementById('nffAlergias').value.trim(),
        medicamentos: document.getElementById('nffMedicamentos').value.trim(),
        obs:          document.getElementById('nffObs').value.trim()
      };

      btn.disabled = true; btn.textContent = 'Guardando...';
      const result = await apiPost('updateFichaFacial', { codigo: clientCodigo, nombre: clientNombre, ...fichaData });

      if (result && result.success) {
        // Actualizar perfil local
        if (!CLIENT_PROFILES[clientKey]) CLIENT_PROFILES[clientKey] = { name: clientNombre, code: clientCodigo, facial: {} };
        if (!CLIENT_PROFILES[clientKey].facial) CLIENT_PROFILES[clientKey].facial = {};
        CLIENT_PROFILES[clientKey].facial.ficha = fichaData;
        closeModal();
        // Actualizar el panel con la ficha nueva y abrir modal de visita
        loadFacialFichaQuick(clientKey, window._facialFichaSlot || 1);
        setTimeout(() => openRegistrarVisitaFacialFromPanel(), 300);
        showToast('✅ Ficha facial guardada');
      } else {
        alert('Error al guardar la ficha: ' + (result?.message || 'desconocido'));
      }
    } catch(e) {
      alert('Error de conexión al guardar la ficha');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar ficha y continuar';
    }
  }

  function openRegistrarVisitaFacialFromPanel() {
    // Pre-llenar el modal de visita con servicio y precio actuales
    const rvfServicio = document.getElementById('rvfServicio');
    const rvfPrecio   = document.getElementById('rvfPrecio');
    if (rvfServicio) rvfServicio.value = window._currentFacialSvcName || '';
    if (rvfPrecio)   rvfPrecio.value   = window._currentFacialSvcPrice || '';
    ['rvfProcedimiento','rvfProductos','rvfObs'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('registrarVisitaFacialModal').classList.add('active');
  }

  window.openRegistrarVisitaFacial = openRegistrarVisitaFacial;
  window.guardarVisitaFacial = guardarVisitaFacial;
  // ── FICHA RÁPIDA CEJAS PIGMENTO (efecto polvo / permanente) ──────────────

  // Detectar si el servicio requiere ficha de pigmento
  function esSrvPigmento(svcName) {
    const n = String(svcName || '').toLowerCase()
      .replace(/[áa]/g,'a').replace(/[éeè]/g,'e').replace(/[íi]/g,'i')
      .replace(/[óo]/g,'o').replace(/[úu]/g,'u').replace(/ñ/g,'n');
    const esCejasPolvo  = (n.includes('cejas') || n.includes('ceja')) && n.includes('polvo');
    const esRetoque     = n.includes('retoque') && (n.includes('polvo') || n.includes('efecto'));
    const esEfectoPolvo = n.includes('efecto') && n.includes('polvo');
    const esMicropig    = n.includes('micropigment');
    return esCejasPolvo || esRetoque || esEfectoPolvo || esMicropig;
  }

  async function loadCejasQuick(clientKey, slot, clientCodigo, clientNombre) {
    const el = document.getElementById('cejasQuick' + slot);
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);font-size:13px;">⏳ Cargando ficha...</div>';

    try {
      const result = await apiGet('getFichaCejasPigmento', { codigo: clientCodigo });
      const fichas = result.success ? (result.fichas || []) : [];
      const ultimaSesion = fichas.length > 0 ? fichas[fichas.length - 1] : null;

      // Guardar para modal
      window._currentCejasClientKey = clientKey;
      window._currentCejasClientCodigo = clientCodigo;
      window._currentCejasClientNombre = clientNombre;
      window._currentCejasSlot = slot;
      // Setear _cpCodigo/_cpNombre para que saveCejasPigmentoFicha los encuentre
      window._cpCodigo = clientCodigo;
      window._cpNombre = clientNombre;

      if (ultimaSesion) {
        var otroCount = fichas.length - 1;
        el.innerHTML = '<div style="background:linear-gradient(135deg,#92400e,#b45309);color:white;border-radius:20px;padding:16px;margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
          + '<div style="font-size:11px;font-weight:600;opacity:.8;"><svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z\"/><path d=\"M16.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z\"/><path d=\"M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z\"/></svg> Ficha activa · ' + clientNombre + '</div>'
          + '<div style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:var(--radius-pill);font-size:10px;font-weight:700;">' + (ultimaSesion.fecha || '—') + '</div>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">'
          + '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:8px;text-align:center;"><div style="font-size:9px;opacity:.7;font-weight:600;">Tipo sesión</div><div style="font-size:12px;font-weight:800;margin-top:2px;">' + (ultimaSesion.tipoSesion || '—') + '</div></div>'
          + '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:8px;text-align:center;"><div style="font-size:9px;opacity:.7;font-weight:600;">Color</div><div style="font-size:12px;font-weight:800;margin-top:2px;">' + (ultimaSesion.color || '—') + '</div></div>'
          + '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:8px;text-align:center;"><div style="font-size:9px;opacity:.7;font-weight:600;">Aguja</div><div style="font-size:12px;font-weight:800;margin-top:2px;">' + (ultimaSesion.aguja || '—') + '</div></div>'
          + '</div>'
          + (ultimaSesion.observaciones ? '<div style="font-size:11px;opacity:.9;font-weight:500;line-height:1.4;margin-bottom:10px;">📝 ' + ultimaSesion.observaciones + '</div>' : '')
          + (ultimaSesion.proxRetoque ? '<div style="font-size:11px;opacity:.9;margin-bottom:8px;">📅 Próx. retoque: ' + ultimaSesion.proxRetoque + '</div>' : '')
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-bottom:6px;">'
          + '<button onclick="abrirModalPigmento()" style="flex:1;padding:14px;background:linear-gradient(135deg,#92400e,#78350f);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">✅ Nueva sesión</button>'
          + '</div>'
          + (otroCount > 0 ? '<button onclick="loadCejasQuick(\'' + clientKey + '\',' + slot + ',\'' + clientCodigo + '\',\'' + clientNombre + '\')" style="width:100%;padding:10px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink-soft);">📂 Ver ' + otroCount + ' sesión(es) anterior(es)</button>' : '');
      } else {
        el.innerHTML = '<div style="background:var(--bg-card);border:2px dashed #92400e;border-radius:20px;padding:18px;text-align:center;">'
          + '<div style="margin-bottom:6px;"><svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\"><path d=\"M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z\"/><path d=\"M16.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z\"/><path d=\"M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z\"/></svg></div>'
          + '<div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#92400e;">Sin ficha de efecto polvo</div>'
          + '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:12px;">Primera sesión de esta clienta</div>'
          + '<button onclick="abrirModalPigmento()" style="padding:14px 24px;background:linear-gradient(135deg,#92400e,#78350f);color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">+ Registrar primera sesión</button>'
          + '</div>';
      }
    } catch(e) {
      el.innerHTML = '<div style="font-size:12px;color:var(--ink-faint);text-align:center;padding:10px;">Error cargando ficha</div>';
    }
  }

  function openNuevaSesionCejas() {
    const clientCodigo = window._currentCejasClientCodigo || '';
    const clientNombre = window._currentCejasClientNombre || '';

    if (!clientCodigo) {
      showToast('⚠ Error: no se encontró la clienta');
      return;
    }

    // Establecer contexto para saveCejasPigmentoFicha
    window._cpCodigo = clientCodigo;
    window._cpNombre = clientNombre;

    // Limpiar campos del modal
    const cpColor = document.getElementById('cpColor');
    const cpAguja = document.getElementById('cpAguja');
    const cpTipoSesion = document.getElementById('cpTipoSesion');
    const cpObs = document.getElementById('cpObs');
    if (cpColor) cpColor.value = '';
    if (cpAguja) cpAguja.value = '';
    if (cpTipoSesion) cpTipoSesion.value = '';
    if (cpObs) cpObs.value = '';

    // Abrir el modal real
    const modalEl = document.getElementById('newCejasPigmentoModal');
    if (modalEl) {
      modalEl.classList.add('active');
    } else {
      // Fallback
      openClientProfile(clientCodigo, clientNombre);
    }
  }

  window.loadFacialFichaQuick = loadFacialFichaQuick;
  window.loadCejasQuick = loadCejasQuick;
  window.openNuevaSesionCejas = openNuevaSesionCejas;
  window.abrirModalPigmento = function() { var m = document.getElementById('newCejasPigmentoModal'); if(m) m.classList.add('active'); };
  window.esSrvPigmento = esSrvPigmento;
  window.openNuevaFichaFacialFromPanel = openNuevaFichaFacialFromPanel;
  window.guardarNuevaFichaFacial = guardarNuevaFichaFacial;
  window.openRegistrarVisitaFacialFromPanel = openRegistrarVisitaFacialFromPanel;
  window.openRegistrarVisitaPestanas = openRegistrarVisitaPestanas;
  window.guardarVisitaPestanas = guardarVisitaPestanas;

  // Reconstruye las líneas del COMBO de un slot desde las áreas del ticket TM del
  // backend (fuente de verdad): toma las áreas de ESTA staff, marca completadas vs
  // en curso, y PRESERVA los extras (servicios con autorización) ya presentes.
  // Evita parchear estado local a mano (causa de listas que no se actualizan o
  // pierden la parte ya completada del combo).
  function _rebuildComboSlotFromTM(slot, areas) {
    const u = window.currentUser || {};
    const miNombre = String(u.name || '').trim().toLowerCase();
    const mine = (areas || []).filter(function(a){
      const est = String(a.estado || '').toLowerCase();
      if (est === 'cancelado') return false;
      return String(a.staff || '').trim().toLowerCase() === miNombre;
    });
    const prev = slotServices[slot] || [];
    // Extras = servicios fuera del combo (los que pasaron por autorización o tienen nota)
    const extras = prev.filter(function(s){
      return s && (s.status === 'pendiente' || s.status === 'aprobado' || s.status === 'rechazado' || s._extra === true || s.note);
    });
    const combo = mine.map(function(a){
      const done = String(a.estado || '').toLowerCase() === 'completado';
      return {
        name: a.tentativo || a.confirmado || a.area || 'Servicio',
        price: Number(a.precio || 0),
        area: a.area || '',
        status: done ? 'completado' : undefined,
        completada: done
      };
    });
    slotServices[slot] = combo.concat(extras);
  }

  async function completarYTomarSiguiente() {
    const slot = window._finishingSlot || 1;
    const user = window.currentUser;
    const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;
    try {
      const r = await apiPost('completarYTomarSiguienteAreaTM', {
        idEspera, chicaNombre: user?.name||'', chicaArea: user?.area||''
      });
      if (r.success) {
        // Siempre refrescar _tmAreasActuales desde el backend tras cualquier acción TM
        // Esto garantiza que si la staff navega y vuelve, el estado es correcto
        try {
          const tmFresh = await apiGet('getTicketMulti');
          const idEsperaFresh = slot === 1 ? window._as1IdEspera : window._as2IdEspera;
          const tmObj = (tmFresh.activos || []).find(t => t.idEspera === idEsperaFresh);
          if (tmObj) {
            if (slot === 1) window._tmAreasActuales  = tmObj.areas || [];
            else             window._tmAreasActuales2 = tmObj.areas || [];
          }
        } catch(eFresh) {}

        if (r.todasCompletadas) {
          showToast('🎯 Todo completado — este es el último servicio');
          const btnContainer = document.getElementById('as' + slot + 'FinishBtns');
          if (btnContainer) {
            btnContainer.innerHTML = '<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);font-size:14px;padding:16px;" onclick="window._finishingSlot=' + slot + '; completarAreaMultiFinal();">✅ Terminé todo mi trabajo — enviar a cobro con Mikaela</button>';
          }
        } else {
          // ── Reconstruir la lista desde el backend (no parchear estado local) ──
          // Antes se hacía push del siguiente servicio con guard "yaExiste": si el
          // combo se llamaba igual en dos áreas, NO re-renderizaba (había que salir
          // del ticket y volver a entrar). Ahora se rearma desde las áreas frescas.
          const _areasFresh = (slot === 1 ? window._tmAreasActuales : window._tmAreasActuales2) || [];
          _rebuildComboSlotFromTM(slot, _areasFresh);
          renderServicesForSlot(slot);
          const nuevoTotal = (slotServices[slot] || []).reduce(function(s,v){
            return (v.status === 'pendiente' || v.status === 'rechazado') ? s : s + Number(v.price || 0);
          }, 0);
          const _tEl = document.getElementById('as' + slot + 'Total');
          if (_tEl) _tEl.textContent = '$' + nuevoTotal;
          const _cEl = document.getElementById('as' + slot + 'SvcCount');
          if (_cEl) _cEl.textContent = (slotServices[slot] || []).filter(function(s){ return s.status !== 'rechazado'; }).length;
          showToast('✅ Siguiente servicio tomado: ' + (r.siguienteArea || ''));
          setTimeout(() => updateFinishButtons(slot), 300);
        }
      } else {
        alert('Error: ' + r.message);
      }
    } catch(e) { alert('Error de conexión'); }
  }
  window.completarAreaMulti      = completarAreaMulti;
  window.completarAreaMultiFinal = completarAreaMultiFinal;
  window.completarYTomarSiguiente = completarYTomarSiguiente;
  window.finishAndSend         = finishAndSend;
  // window.finishAndSendAll alias moved to nexserv-main-1.js
  // window.cobrarPromoCompleta alias moved to nexserv-main-1.js
  window.finishAndContinue     = finishAndContinue;
  // window.finishAndContinueSameStaff alias moved to nexserv-main-1.js
  window.finishSlotAndContinue = finishSlotAndContinue;
  window.finishAndNextPromo    = finishAndNextPromo;
  window.finishAndRetire       = finishAndRetire;
  window.finishAndReturn       = finishAndReturn;
  window.confirmServiceAndClose = confirmServiceAndClose;
  // window.compartirSiguienteServicio alias moved to nexserv-main-1.js
  window.finishSlot1           = finishSlot1;
  window.prepararYFinalizar     = prepararYFinalizar;
  window.finishSlot2           = finishSlot2;

  // Secuencia de orden de atención (usados desde onclick en HTML)
  window.addAreaSecuencia      = addAreaSecuencia;
  window.removeSecuenciaItem   = removeSecuenciaItem;
  window.moveSecuencia         = moveSecuencia;
  window.applyPromoCompleta    = applyPromoCompleta;

/* ======================= CAJA CHICA (frontend) ======================= */
window._cajaData = null;
window._cajaPriv = false;

function fmtCaja_(n) {
  if (window._cajaPriv) return '✱✱✱';
  return '$' + (Number(n) || 0).toFixed(2);
}

function parseMetodoPagoCaja_(metodoRaw, total) {
  const m = String(metodoRaw || '').trim();
  const low = m.toLowerCase();
  const norm = (s) => {
    s = s.toLowerCase();
    if (s.includes('efect')) return 'efectivo';
    if (s.includes('transf')) return 'transferencia';
    if (s.includes('tarj'))  return 'tarjeta';
    return null;
  };
  if (low.startsWith('mixto')) {
    const partes = m.replace(/^mixto:?/i, '').split('+');
    const out = [];
    partes.forEach(p => {
      const mt = p.match(/\$?\s*([\d.,]+)\s*([a-záéíóúñ]+)/i);
      if (mt) {
        const monto = parseFloat(mt[1].replace(',', '.')) || 0;
        const met = norm(mt[2]);
        if (met && monto > 0) out.push({ metodo: met, monto: monto });
      }
    });
    // En cobros multi/combo, cada fila de CierresPagos trae su monto de línea pero el
    // método mixto COMPLETO. Si el mixto completo supera el total de ESTA fila, escalamos
    // sus partes a ese total para que la caja no sume el pago mixto completo una vez por
    // línea (duplicación). En cobros simples mixtoSum == total → no se escala nada.
    const _mixSum = out.reduce((s, x) => s + x.monto, 0);
    const _t = Number(total) || 0;
    if (_mixSum > _t + 0.01 && _t > 0) {
      const _f = _t / _mixSum;
      out.forEach(x => { x.monto = Math.round(x.monto * _f * 100) / 100; });
    }
    return out;
  }
  const met = norm(low);
  if (met) return [{ metodo: met, monto: Number(total) || 0 }];
  // Método desconocido o vacío: contarlo como efectivo para que el cobro no desaparezca de la caja
  const montoFallback = Number(total) || 0;
  return montoFallback > 0 ? [{ metodo: 'efectivo', monto: montoFallback }] : [];
}

function computeCajaBreakdown_(servicios, gastos) {
  const bd = {
    efectivo:      { total: 0, items: [] },
    transferencia: { total: 0, items: [] },
    tarjeta:       { total: 0, items: [] },
    gastos:        { total: 0, totalEfectivo: 0, totalTransfer: 0, items: [] }
  };
  (servicios || []).forEach(s => {
    const partes = parseMetodoPagoCaja_(s.metodoPago, s.total);
    partes.forEach(p => {
      bd[p.metodo].total += p.monto;
      bd[p.metodo].items.push({ cliente: s.clienteNombre || 'Clienta', monto: p.monto });
    });
  });
  (gastos || []).forEach(g => {
    const monto = Number(g.monto) || 0;
    const met = String(g.metodo || 'efectivo').toLowerCase().indexOf('transf') >= 0 ? 'transferencia' : 'efectivo';
    bd.gastos.total += monto;
    if (met === 'transferencia') bd.gastos.totalTransfer += monto; else bd.gastos.totalEfectivo += monto;
    bd.gastos.items.push({ id: g.id, descripcion: g.descripcion || 'Gasto', monto: monto, metodo: met });
  });
  bd.totalBruto = bd.efectivo.total + bd.transferencia.total + bd.tarjeta.total;
  bd.totalNeto  = bd.totalBruto - bd.gastos.total;
  return bd;
}

async function loadCajaChica() {
  const panel = document.getElementById('cajaChicaPanel');
  if (!panel) return;
  // Guard de rol: la caja chica es exclusiva de Mikaela (admin) y el Owner.
  // Si por cualquier motivo la abre una staff, se oculta y no se carga nada.
  const _uCC = window.currentUser;
  const _permitidoCaja = _uCC && (_uCC.role === 'admin' || _uCC.role === 'owner');
  if (!_permitidoCaja) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  try {
    const [caja, cobros] = await Promise.all([
      apiGet('getCajaChica'),
      apiGet('getServiciosCobrados', { filtro: 'hoy' })
    ]);
    const apertura = (caja && caja.success) ? (caja.apertura || 0) : 0;
    const cerrada  = (caja && caja.success) ? !!caja.cerrada : false;
    const gastos   = (caja && caja.success) ? (caja.gastos || []) : [];
    const servicios = (cobros && cobros.success) ? (cobros.servicios || []) : [];

    const bd = cerrada
      ? { efectivo:{total:0,items:[]}, transferencia:{total:0,items:[]}, tarjeta:{total:0,items:[]}, gastos:{total:0,totalEfectivo:0,totalTransfer:0,items:[]}, totalBruto:0, totalNeto:0 }
      : computeCajaBreakdown_(servicios, gastos);

    window._cajaData = { bd, apertura, cerrada };
    renderCajaCompact_();

    const nota = document.getElementById('cajaCerradaNota');
    const btn  = document.getElementById('cierreCajaBtn');
    if (nota) nota.style.display = cerrada ? 'block' : 'none';
    if (btn)  btn.style.display  = cerrada ? 'none'  : 'flex';
    if (cerrada) {
      const det = document.getElementById('cierreCajaDetalle');
      if (det) det.style.display = 'none';
    }
  } catch (e) {
    console.warn('loadCajaChica error:', e.message);
  }
}

function renderCajaCompact_() {
  if (!window._cajaData) return;
  const bd = window._cajaData.bd;
  const set = (k, v) => { const el = document.querySelector('.caja-num[data-k="' + k + '"]'); if (el) el.textContent = v; };
  set('efectivo',      fmtCaja_(bd.efectivo.total));
  set('transferencia', fmtCaja_(bd.transferencia.total));
  set('tarjeta',       fmtCaja_(bd.tarjeta.total));
  set('gastos',        window._cajaPriv ? '✱✱✱' : '-$' + (bd.gastos.total).toFixed(2));
  set('total',         fmtCaja_(bd.totalNeto));
}

function toggleCajaPrivacy() {
  window._cajaPriv = !window._cajaPriv;
  renderCajaCompact_();
}

function toggleCierreCaja() {
  const det = document.getElementById('cierreCajaDetalle');
  const chev = document.getElementById('cierreChevron');
  const open = det.style.display === 'none';
  det.style.display = open ? 'block' : 'none';
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  if (open) renderCierreDetalle_();
}

function renderCierreDetalle_() {
  const det = document.getElementById('cierreCajaDetalle');
  if (!window._cajaData) { det.innerHTML = ''; return; }
  const bd = window._cajaData.bd;
  const apertura = window._cajaData.apertura || 0;
  const metodoBlock = (titulo, obj, color) => {
    if (!obj.items.length) return '';
    let h = '<div style="font-weight:800;margin-top:10px;' + (color ? 'color:' + color + ';' : '') + '">' + titulo + '</div>';
    obj.items.forEach(it => {
      const signo = color ? '-' : '';
      const tag = it.metodo ? ' <span style="font-size:11px;color:var(--ink-faint);font-weight:600;">(' + (it.metodo === 'transferencia' ? 'transf.' : 'efec.') + ')</span>' : '';
      h += '<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;' + (color ? 'color:' + color + ';' : '') + '">'
         + '<span>&nbsp;&nbsp;' + (it.cliente || it.descripcion) + tag + '</span><span>' + signo + '$' + (it.monto).toFixed(2) + '</span></div>';
    });
    const signoT = color ? '-' : '';
    h += '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:2px 0;' + (color ? 'color:' + color + ';' : '') + '">'
       + '<span>&nbsp;&nbsp;Total</span><span>' + signoT + '$' + (obj.total).toFixed(2) + '</span></div>';
    return h;
  };
  let html = '<div style="text-align:center;font-weight:800;margin-bottom:6px;">CIERRE CAJA</div>';
  html += metodoBlock('Efectivo', bd.efectivo);
  html += metodoBlock('Transferencia', bd.transferencia);
  html += metodoBlock('Tarjeta', bd.tarjeta);
  html += metodoBlock('Gastos Varios', bd.gastos, 'var(--danger)');
  html += '<div style="display:flex;justify-content:space-between;font-weight:800;border-top:1.5px solid var(--line);margin-top:8px;padding-top:8px;"><span>TOTAL VENTAS (neto)</span><span>$' + bd.totalNeto.toFixed(2) + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-soft);padding-top:2px;"><span>Base de apertura</span><span>$' + (Number(apertura)||0).toFixed(2) + '</span></div>';
  var efectivoEsperado = (Number(apertura)||0) + bd.efectivo.total - bd.gastos.totalEfectivo;
  html += '<div style="display:flex;justify-content:space-between;font-weight:800;color:var(--accent-deep);background:var(--bg);border-radius:10px;padding:8px 10px;margin-top:8px;"><span>Efectivo esperado en caja</span><span>$' + efectivoEsperado.toFixed(2) + '</span></div>';
  html += '<div style="font-size:11px;color:var(--ink-faint);padding:4px 2px 0;">Base + efectivo de ventas − gastos en efectivo. Es el efectivo físico que debe haber en caja al cerrar.</div>';
  html += '<button onclick="confirmarCierreCaja()" style="width:100%;padding:13px;background:var(--ink);color:#fff;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-top:14px;">Confirmar cierre</button>';
  html += '<button onclick="toggleCierreCaja()" style="width:100%;padding:11px;background:none;border:none;font-family:inherit;font-size:13px;color:var(--ink-soft);cursor:pointer;margin-top:4px;">Cancelar</button>';
  det.innerHTML = html;
}

async function confirmarCierreCaja() {
  if (!window._cajaData) return;
  if (!confirm('¿Confirmar el cierre de caja del día? Quedará en cero para mañana.')) return;
  const bd = window._cajaData.bd;
  const snapshot = {
    fecha: new Date().toLocaleDateString('es-EC'),
    efectivo: bd.efectivo, transferencia: bd.transferencia, tarjeta: bd.tarjeta,
    gastos: bd.gastos, totalBruto: bd.totalBruto, totalNeto: bd.totalNeto,
    apertura: window._cajaData.apertura || 0
  };
  const res = await apiPost('cerrarCaja', { snapshot: snapshot, registradoPor: (window.currentUser && window.currentUser.name) || 'Mikaela' });
  if (res && res.success) { alert('Caja cerrada ✓'); loadCajaChica(); }
  else { alert((res && res.error) || 'No se pudo cerrar la caja.'); }
}

function toggleAperturaCaja() {
  const f = document.getElementById('aperturaForm');
  const chev = document.getElementById('aperturaChevron');
  const open = f.style.display === 'none';
  f.style.display = open ? 'block' : 'none';
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  if (open && window._cajaData) document.getElementById('aperturaMonto').value = window._cajaData.apertura || '';
}

async function confirmarApertura() {
  const monto = parseFloat(document.getElementById('aperturaMonto').value || 0) || 0;
  const res = await apiPost('addAperturaCaja', { monto: monto, registradoPor: (window.currentUser && window.currentUser.name) || 'Mikaela' });
  if (res && res.success) { toggleAperturaCaja(); loadCajaChica(); }
  else { alert((res && res.error) || 'No se pudo guardar la base.'); }
}

function toggleGastosVarios() {
  const f = document.getElementById('gvForm');
  const btn = document.getElementById('gvToggleBtn');
  const chev = document.getElementById('gvChevron');
  const open = f.style.display === 'none';
  f.style.display = open ? 'block' : 'none';
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  if (btn) btn.style.borderRadius = open ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)';
}

function setGastoMetodo(metodo) {
  const hidden = document.getElementById('gvMetodo');
  if (hidden) hidden.value = metodo;
  const ef = document.getElementById('gvMetEfectivo');
  const tr = document.getElementById('gvMetTransfer');
  const on  = (b) => { b.style.background = 'var(--accent)'; b.style.color = '#fff'; b.style.borderColor = 'var(--accent)'; };
  const off = (b) => { b.style.background = 'var(--bg)'; b.style.color = 'var(--ink-soft)'; b.style.borderColor = 'var(--line)'; };
  if (ef && tr) {
    if (metodo === 'transferencia') { on(tr); off(ef); } else { on(ef); off(tr); }
  }
}

async function confirmarGasto() {
  const desc = (document.getElementById('gvDescripcion').value || '').trim();
  const monto = parseFloat(document.getElementById('gvMonto').value || 0) || 0;
  const resp = (document.getElementById('gvResponsable').value || '').trim();
  const metodo = (document.getElementById('gvMetodo').value || 'efectivo');
  if (!desc)      { alert('Escribí una descripción del gasto.'); return; }
  if (monto <= 0) { alert('Ingresá un monto válido.'); return; }
  const btn = document.getElementById('gvConfirmBtn');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';
  const res = await apiPost('addGastoCaja', { descripcion: desc, monto: monto, responsable: resp, metodoGasto: metodo, registradoPor: (window.currentUser && window.currentUser.name) || 'Mikaela' });
  btn.disabled = false; btn.textContent = 'Confirmar gasto';
  if (res && res.success) {
    document.getElementById('gvDescripcion').value = '';
    document.getElementById('gvMonto').value = '';
    document.getElementById('gvResponsable').value = '';
    setGastoMetodo('efectivo');
    toggleGastosVarios();
    alert('Gasto agregado a Caja Chica ✓');
    if (typeof loadCajaChica === 'function') loadCajaChica();
  } else {
    alert((res && res.error) || 'No se pudo guardar el gasto.');
  }
}
/* ===================== /CAJA CHICA (frontend) ===================== */

/* ============ CAJA CHICA — VISTA OWNER (solo lectura) ============ */
window._cajaOwnerData = null;
window._cajaOwnerPriv = false;

function fmtCajaOwner_(n) {
  if (window._cajaOwnerPriv) return '✱✱✱';
  return '$' + (Number(n) || 0).toFixed(2);
}

async function loadCajaChicaOwner() {
  const panel = document.getElementById('ownerCaja');
  if (!panel) return;
  try {
    const [caja, cobros] = await Promise.all([
      apiGet('getCajaChica'),
      apiGet('getServiciosCobrados', { filtro: 'hoy' })
    ]);
    const apertura  = (caja && caja.success) ? (caja.apertura || 0) : 0;
    const cerrada   = (caja && caja.success) ? !!caja.cerrada : false;
    const gastos    = (caja && caja.success) ? (caja.gastos || []) : [];
    const servicios = (cobros && cobros.success) ? (cobros.servicios || []) : [];

    const bd = cerrada
      ? { efectivo:{total:0,items:[]}, transferencia:{total:0,items:[]}, tarjeta:{total:0,items:[]}, gastos:{total:0,totalEfectivo:0,totalTransfer:0,items:[]}, totalBruto:0, totalNeto:0 }
      : computeCajaBreakdown_(servicios, gastos);

    window._cajaOwnerData = { bd, apertura, cerrada };
    renderCajaOwner_();

    const nota = document.getElementById('ocCerradaNota');
    if (nota) nota.style.display = cerrada ? 'block' : 'none';
    const rb = document.getElementById('ocRefreshBtn');
    if (rb) {
      const h = new Date();
      rb.textContent = '↻ ' + ('0'+h.getHours()).slice(-2) + ':' + ('0'+h.getMinutes()).slice(-2) + ':' + ('0'+h.getSeconds()).slice(-2);
    }
  } catch (e) {
    console.warn('loadCajaChicaOwner error:', e.message);
    const det = document.getElementById('ocDetalle');
    if (det) det.innerHTML = '<div style="text-align:center;color:var(--ink-faint);font-size:13px;">No se pudo cargar la caja.</div>';
  }
}

function renderCajaOwner_() {
  if (!window._cajaOwnerData) return;
  const bd = window._cajaOwnerData.bd;
  const apertura = window._cajaOwnerData.apertura || 0;
  const set = (k, v) => { const el = document.querySelector('.ocaja-num[data-k="' + k + '"]'); if (el) el.textContent = v; };
  set('efectivo',      fmtCajaOwner_(bd.efectivo.total));
  set('transferencia', fmtCajaOwner_(bd.transferencia.total));
  set('tarjeta',       fmtCajaOwner_(bd.tarjeta.total));
  set('gastos',        window._cajaOwnerPriv ? '✱✱✱' : '-$' + (bd.gastos.total).toFixed(2));
  set('total',         fmtCajaOwner_(bd.totalNeto));
  set('apertura',      fmtCajaOwner_(apertura));
  renderCajaOwnerDetalle_();
}

function renderCajaOwnerDetalle_() {
  const det = document.getElementById('ocDetalle');
  if (!det) return;
  if (!window._cajaOwnerData) { det.innerHTML = ''; return; }
  if (window._cajaOwnerData.cerrada) {
    det.innerHTML = '<div style="text-align:center;color:var(--success);font-size:13px;font-weight:700;"><svg class="nx-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> La caja del día ya fue cerrada.</div>';
    return;
  }
  const bd = window._cajaOwnerData.bd;
  const priv = window._cajaOwnerPriv;
  const esOwnerCaja = window.currentUser && window.currentUser.role === 'owner';
  const monto = (n, color) => priv ? '✱✱✱' : ((color ? '-' : '') + '$' + (Number(n)||0).toFixed(2));
  const metodoBlock = (titulo, obj, color, borrable) => {
    if (!obj.items.length) return '';
    let h = '<div style="font-weight:800;margin-top:10px;' + (color ? 'color:' + color + ';' : '') + '">' + titulo + '</div>';
    obj.items.forEach(it => {
      const tag = it.metodo ? ' <span style="font-size:11px;color:var(--ink-faint);font-weight:600;">(' + (it.metodo === 'transferencia' ? 'transf.' : 'efec.') + ')</span>' : '';
      // Solo el Owner puede borrar un gasto cargado por error (no aplica a ventas)
      const descSafe = String(it.descripcion || 'Gasto').replace(/['"\\]/g, '');
      const btnBorrar = (borrable && esOwnerCaja && it.id && !priv)
        ? ' <span onclick="borrarGastoCaja(' + it.id + ', \'' + descSafe + '\')" title="Borrar gasto cargado por error" style="cursor:pointer;color:var(--danger);font-weight:800;padding:0 6px;">✕</span>'
        : '';
      h += '<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;' + (color ? 'color:' + color + ';' : '') + '">'
         + '<span>&nbsp;&nbsp;' + (it.cliente || it.descripcion || '') + tag + btnBorrar + '</span><span>' + monto(it.monto, color) + '</span></div>';
    });
    h += '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:2px 0;' + (color ? 'color:' + color + ';' : '') + '">'
       + '<span>&nbsp;&nbsp;Total</span><span>' + monto(obj.total, color) + '</span></div>';
    return h;
  };
  const apertura = Number(window._cajaOwnerData.apertura) || 0;
  let html = '';
  html += metodoBlock('Efectivo', bd.efectivo);
  html += metodoBlock('Transferencia', bd.transferencia);
  html += metodoBlock('Tarjeta', bd.tarjeta);
  html += metodoBlock('Gastos Varios', bd.gastos, 'var(--danger)', true);
  html += '<div style="display:flex;justify-content:space-between;font-weight:800;border-top:1.5px solid var(--line);margin-top:8px;padding-top:8px;"><span>TOTAL VENTAS (neto)</span><span>' + (priv ? '✱✱✱' : '$' + bd.totalNeto.toFixed(2)) + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-soft);padding-top:2px;"><span>Base de apertura</span><span>' + (priv ? '✱✱✱' : '$' + apertura.toFixed(2)) + '</span></div>';
  const efectivoEsperado = apertura + bd.efectivo.total - bd.gastos.totalEfectivo;
  html += '<div style="display:flex;justify-content:space-between;font-weight:800;color:var(--accent-deep);background:var(--bg);border-radius:10px;padding:8px 10px;margin-top:8px;"><span>Efectivo esperado en caja</span><span>' + (priv ? '✱✱✱' : '$' + efectivoEsperado.toFixed(2)) + '</span></div>';
  html += '<div style="font-size:11px;color:var(--ink-faint);padding:4px 2px 0;">Base + efectivo de ventas − gastos en efectivo. Es el efectivo físico que debe haber en caja al cerrar.</div>';
  if (!bd.efectivo.items.length && !bd.transferencia.items.length && !bd.tarjeta.items.length && !bd.gastos.items.length && apertura === 0) {
    html = '<div style="text-align:center;color:var(--ink-faint);font-size:13px;">Sin movimientos registrados hoy.</div>';
  }
  det.innerHTML = html;
}

function toggleCajaOwnerPrivacy() {
  window._cajaOwnerPriv = !window._cajaOwnerPriv;
  renderCajaOwner_();
}

// Borrar (anular) un gasto de caja chica cargado por error — SOLO Owner
async function borrarGastoCaja(id, desc) {
  if (!(window.currentUser && window.currentUser.role === 'owner')) {
    alert('Solo el dueño puede borrar gastos de la caja.');
    return;
  }
  if (!id) return;
  if (!confirm('¿Borrar este gasto cargado por error?\n\n"' + (desc || 'Gasto') + '"\n\nSe quitará de la caja y de los totales. Esta acción no se puede deshacer desde la app.')) return;
  try {
    const r = await apiPost('anularGastoCaja', { id: id });
    if (r && r.success) {
      if (typeof showToast === 'function') showToast('✓ Gasto borrado');
      loadCajaChicaOwner();
    } else {
      alert((r && (r.error || r.message)) || 'No se pudo borrar el gasto');
    }
  } catch (e) { alert('Error: ' + e.message); }
}
window.borrarGastoCaja = borrarGastoCaja;
/* ========== /CAJA CHICA — VISTA OWNER (solo lectura) ========== */


/* ========== CIERRE DE MES (Owner) ========== */
const CM_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function initCierreMesSelectors() {
  const selMes  = document.getElementById('cmMes');
  const selAnio = document.getElementById('cmAnio');
  if (!selMes || !selAnio) return;
  // Solo poblar una vez
  if (selMes.options.length && selAnio.options.length) return;

  const now = new Date();
  const mesActual  = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  selMes.innerHTML = CM_MESES.map((m, i) =>
    '<option value="' + (i + 1) + '"' + ((i + 1) === mesActual ? ' selected' : '') + '>' + m + '</option>'
  ).join('');

  let aniosHtml = '';
  for (let a = anioActual; a >= 2024; a--) {
    aniosHtml += '<option value="' + a + '"' + (a === anioActual ? ' selected' : '') + '>' + a + '</option>';
  }
  selAnio.innerHTML = aniosHtml;
}

async function loadCierreMes() {
  const body = document.getElementById('cmBody');
  if (!body) return;
  const mes  = Number(document.getElementById('cmMes')?.value)  || (new Date().getMonth() + 1);
  const anio = Number(document.getElementById('cmAnio')?.value) || new Date().getFullYear();

  body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">Cargando cierre de ' + CM_MESES[mes - 1] + ' ' + anio + '…</div>';

  try {
    const r = await apiGet('getCierreMes', { mes: mes, anio: anio });
    if (!r || !r.success) {
      body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--danger);font-size:13px;">No se pudo cargar el cierre.' + (r && r.error ? '<br><span style="font-size:11px;color:var(--ink-faint);">' + r.error + '</span>' : '') + '</div>';
      return;
    }
    // SIRA: prioridad => edición manual de esta sesión > valor automático de SIRA > valor guardado > 0
    const key = mes + '-' + anio;
    window._cmSiraPorMes = window._cmSiraPorMes || {};
    window._cmData = r;
    const siraAuto     = (r.siraOk && r.gastoSIRA != null) ? Number(r.gastoSIRA) : null;
    const siraGuardado = (r.guardado && r.guardado.gastoSIRA != null) ? Number(r.guardado.gastoSIRA) : null;
    let siraInicial = 0;
    if (window._cmSiraPorMes[key] != null)      siraInicial = window._cmSiraPorMes[key];
    else if (siraAuto != null)                  siraInicial = siraAuto;
    else if (siraGuardado != null)              siraInicial = siraGuardado;
    renderCierreMes(r, siraInicial);

    const rb = document.getElementById('cmRefreshBtn');
    if (rb) {
      const h = new Date();
      rb.textContent = '↻ ' + ('0' + h.getHours()).slice(-2) + ':' + ('0' + h.getMinutes()).slice(-2);
    }
  } catch (e) {
    body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--danger);font-size:13px;">Error: ' + e.message + '</div>';
  }
}

function renderCierreMes(d, siraInicial) {
  const body = document.getElementById('cmBody');
  if (!body) return;
  const money = n => '$' + (Number(n) || 0).toFixed(2);
  const sira = Number(siraInicial) || 0;

  // ---- Tarjeta principal: generado del mes ----
  let html = '';
  html += '<div style="background:linear-gradient(135deg,#1a1a1a 0%,#3d2f1f 100%);color:white;padding:22px;border-radius:22px;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:var(--shadow-soft);">';
  html +=   '<div style="position:absolute;top:-50%;right:-20%;width:200px;height:200px;background:radial-gradient(circle,rgba(212,165,116,0.3) 0%,transparent 70%);"></div>';
  html +=   '<div style="font-size:11px;font-weight:600;opacity:0.7;margin-bottom:6px;position:relative;">Generado en ' + CM_MESES[d.mes - 1] + ' ' + d.anio + '</div>';
  html +=   '<div style="font-size:42px;font-weight:800;letter-spacing:-0.04em;line-height:1;position:relative;">' + money(d.generadoTotal) + '</div>';
  html +=   '<div style="font-size:12px;opacity:0.65;margin-top:8px;position:relative;font-weight:500;">' + d.numClientas + ' clientas · ' + d.numServicios + ' servicios' + (d.numProductos ? ' · ' + d.numProductos + ' productos' : '') + '</div>';
  html += '</div>';

  // ---- Mini stats ----
  html += '<div class="stat-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:18px;">';
  html +=   '<div class="stat"><div class="label">Clientas</div><div class="value" style="font-size:18px;">' + d.numClientas + '</div></div>';
  html +=   '<div class="stat"><div class="label">Comisiones</div><div class="value" style="color:var(--danger);font-size:18px;">' + money(d.comisionTotal) + '</div></div>';
  html +=   '<div class="stat"><div class="label">Servicios</div><div class="value" style="font-size:18px;">' + d.numServicios + '</div></div>';
  html += '</div>';

  // ---- Por staff ----
  html += '<div class="section-title">Por staff</div>';
  if (!d.staff || !d.staff.length) {
    html += '<div class="card" style="text-align:center;padding:18px;color:var(--ink-faint);font-size:13px;">Sin servicios registrados este mes.</div>';
  } else {
    html += '<div class="card" style="padding:6px 14px;">';
    html += '<div style="display:flex;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-faint);padding:8px 0 6px;border-bottom:1px solid var(--line);">'
          + '<span style="flex:1.4;">Staff</span><span style="flex:0.6;text-align:center;">Serv.</span><span style="flex:1;text-align:right;">Generado</span><span style="flex:1;text-align:right;">Comisión</span></div>';
    d.staff.forEach(s => {
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="flex:1.4;font-weight:700;">' + s.chica + '</span>'
            + '<span style="flex:0.6;text-align:center;color:var(--ink-soft);">' + s.servicios + '</span>'
            + '<span style="flex:1;text-align:right;font-weight:600;">' + money(s.generado) + '</span>'
            + '<span style="flex:1;text-align:right;color:var(--danger);font-weight:600;">' + money(s.comision) + '</span></div>';
    });
    html += '<div style="display:flex;align-items:center;font-size:13px;padding:10px 0 8px;font-weight:800;">'
          + '<span style="flex:1.4;">Total</span>'
          + '<span style="flex:0.6;text-align:center;">' + d.numServicios + '</span>'
          + '<span style="flex:1;text-align:right;">' + money(d.generadoServicios) + '</span>'
          + '<span style="flex:1;text-align:right;color:var(--danger);">' + money(d.comisionTotal) + '</span></div>';
    html += '</div>';
  }

  // ---- Productos (marca) si hay ----
  if (d.numProductos) {
    html += '<div class="card" style="padding:12px 16px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:14px;">'
          + '<span><svg class="nx-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Productos vendidos (' + d.numProductos + ')</span><span style="font-weight:700;">' + money(d.generadoProductos) + '</span></div>';
  }

  // ---- Gastos ---- (solo SIRA; caja chica es control diario, no entra al cuadre)
  html += '<div class="section-title" style="margin-top:18px;">Gastos del mes</div>';
  html += '<div class="card" style="padding:14px 16px;font-size:14px;">';
  const _siraFuente   = d.siraFuente || '';
  const _siraProd     = Number(d.siraTotalProductos    || 0);
  const _siraGastos   = Number(d.siraTotalGastosVarios || 0);
  const _siraEsCierre = _siraFuente === 'cierre';
  const _siraSubtit   = d.siraOk
    ? (_siraEsCierre
        ? '✓ Cierre de SIRA · productos + gastos varios'
        : '✓ Estimado SIRA · cierre pendiente — se actualizará al cerrar en SIRA')
    : ('<svg class="nx-icon" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> No se pudo leer SIRA — ingrésalo manual'
      + (d.siraError ? ' · ' + String(d.siraError).replace(/[<>]/g,'') : ''));
  // Mostrar desglose productos/gastos tanto para cierre oficial como para estimado del fallback
  const _siraDesglose = (d.siraOk && (_siraProd > 0 || _siraGastos > 0))
    ? '<br><span style="font-size:11px;color:var(--ink-soft);">📦 Productos: <b>$' + _siraProd.toFixed(2) + '</b> &nbsp;·&nbsp; 💸 Gastos varios: <b>$' + _siraGastos.toFixed(2) + '</b></span>'
    : '';
  html +=   '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 0;">'
        +     '<span>SIRA — gastos del mes<br>'
        +       '<span style="font-size:11px;color:' + (d.siraOk ? 'var(--success)' : 'var(--ink-faint)') + ';">' + _siraSubtit + '</span>'
        +       _siraDesglose
        +     '</span>'
        +     '<span style="display:flex;align-items:center;gap:4px;color:var(--danger);font-weight:700;">-$'
        +       '<input id="cmSiraInput" type="number" inputmode="decimal" min="0" step="0.01" value="' + (sira ? sira : '') + '" placeholder="0.00" oninput="onCierreSiraInput()" '
        +       'style="width:92px;padding:7px 8px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px;font-weight:700;text-align:right;color:var(--danger);background:var(--bg-card);"></span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;padding:8px 0 2px;border-top:1.5px solid var(--line);margin-top:6px;font-weight:800;">'
        +     '<span>Total gastos</span><span id="cmTotalGastos" style="color:var(--danger);">-' + money(sira) + '</span></div>';
  html += '</div>';

  // ---- TOTAL GENERAL ----
  const totalGeneral = d.generadoTotal - d.comisionTotal - sira;
  html += '<div id="cmTotalGeneralCard" style="background:var(--bg);border:2px solid var(--accent-deep);border-radius:18px;padding:16px 18px;margin-top:16px;">';
  html +=   '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-soft);padding:2px 0;"><span>Generado</span><span>' + money(d.generadoTotal) + '</span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-soft);padding:2px 0;"><span>− Comisiones</span><span>-' + money(d.comisionTotal) + '</span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-soft);padding:2px 0;"><span>− Gastos (SIRA)</span><span id="cmTotalGastosResumen">-' + money(sira) + '</span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:18px;border-top:1.5px solid var(--accent-deep);margin-top:8px;padding-top:10px;">'
        +     '<span>TOTAL GENERAL</span><span id="cmTotalGeneral" style="color:' + (totalGeneral >= 0 ? 'var(--success)' : 'var(--danger)') + ';">' + money(totalGeneral) + '</span></div>';
  html += '</div>';

  html += '<div style="font-size:11px;color:var(--ink-faint);padding:12px 4px 0;line-height:1.5;">El Total general es lo generado del mes menos comisiones y gastos de SIRA. El valor de SIRA se trae automáticamente desde su sistema; puedes ajustarlo a mano si algún mes hace falta.</div>';

  // Caja chica — solo referencia informativa, NO se descuenta del cuadre
  html += '<div style="font-size:11px;color:var(--ink-faint);padding:8px 4px 0;margin-top:8px;border-top:1px dashed var(--line);line-height:1.5;">'
        + '<svg class="nx-icon" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align:-1px;"><path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1H2V7Zm0 3h20v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-8Z"/></svg> '
        + 'Caja chica de Mikaela este mes: <b>' + money(d.gastoCajaChica) + '</b> en ' + (d.numGastosCaja||0) + ' gasto' + ((d.numGastosCaja===1)?'':'s')
        + '. Es solo su control diario de caja — <b>no se incluye en el cuadre mensual</b> (el gasto real lo lleva SIRA).</div>';

  // ---- Exportar (PDF / Excel) ----
  html += '<div style="display:flex;gap:10px;margin-top:14px;">';
  html +=   '<button onclick="exportarCierrePDF()" style="flex:1;padding:13px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;"><svg class="nx-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/></svg> Exportar PDF</button>';
  html +=   '<button onclick="exportarCierreExcel()" style="flex:1;padding:13px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;"><svg class="nx-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg> Exportar Excel</button>';
  html += '</div>';

  // ---- Estado guardado + botón Guardar ----
  const g = d.guardado;
  html += '<div style="margin-top:14px;">';
  if (g && g.fechaCierre) {
    html += '<div id="cmGuardadoBadge" style="font-size:12px;color:var(--success);font-weight:700;text-align:center;margin-bottom:8px;"><svg class="nx-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Guardado el ' + g.fechaCierre + (g.registradoPor ? ' · ' + g.registradoPor : '') + '</div>';
  }
  html += '<button onclick="guardarCierreMes()" id="cmGuardarBtn" style="width:100%;padding:14px;background:var(--ink);color:#fff;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">'
        + (g && g.fechaCierre ? '↻ Actualizar cierre guardado' : '<svg class="nx-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg> Guardar cierre del mes') + '</button>';
  html += '<div style="font-size:11px;color:var(--ink-faint);text-align:center;padding:6px 8px 0;line-height:1.5;">Queda registrado de forma permanente en tu hoja de cálculo como respaldo verificable.</div>';
  html += '</div>';

  // ---- Historial de cierres guardados ----
  html += '<div style="margin-top:18px;">';
  html += '<button onclick="toggleHistorialCierres()" id="cmHistToggle" style="width:100%;padding:12px;background:var(--bg-card);border:1px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><svg class="nx-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg> Historial de cierres guardados <span id="cmHistCaret" style="font-size:11px;">▼</span></button>';
  html += '<div id="cmHistList" style="display:none;margin-top:10px;"></div>';
  html += '</div>';

  body.innerHTML = html;
}

function onCierreSiraInput() {
  const d = window._cmData;
  if (!d) return;
  const inp = document.getElementById('cmSiraInput');
  const sira = Number(inp && inp.value) || 0;
  // Guardar el SIRA por mes/año para que no se pierda al actualizar
  const key = d.mes + '-' + d.anio;
  window._cmSiraPorMes = window._cmSiraPorMes || {};
  window._cmSiraPorMes[key] = sira;

  const money = n => '$' + (Number(n) || 0).toFixed(2);
  const totalGastos = sira; // caja chica no entra al cuadre
  const totalGeneral = d.generadoTotal - d.comisionTotal - totalGastos;

  const tg  = document.getElementById('cmTotalGastos');
  const tgr = document.getElementById('cmTotalGastosResumen');
  const tge = document.getElementById('cmTotalGeneral');
  if (tg)  tg.textContent  = '-' + money(totalGastos);
  if (tgr) tgr.textContent = '-' + money(totalGastos);
  if (tge) {
    tge.textContent = money(totalGeneral);
    tge.style.color = totalGeneral >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

// ── Export del Cierre de mes (PDF imprimible + Excel .xls) ──────────────────
function _cierreDatos() {
  const d = window._cmData;
  if (!d) return null;
  const inp = document.getElementById('cmSiraInput');
  const key = d.mes + '-' + d.anio;
  let sira = 0;
  if (inp && inp.value !== '' && inp.value != null)            sira = Number(inp.value) || 0;
  else if (window._cmSiraPorMes && window._cmSiraPorMes[key] != null) sira = Number(window._cmSiraPorMes[key]) || 0;
  else if (d.guardado && d.guardado.gastoSIRA != null)        sira = Number(d.guardado.gastoSIRA) || 0;
  else if (d.siraOk && d.gastoSIRA != null)                   sira = Number(d.gastoSIRA) || 0;
  // Caja chica NO entra en el cuadre mensual: es solo el control diario de caja de
  // Mikaela. El gasto real del mes lo lleva SIRA (productos, ingresos, gastos varios).
  // Contar ambos duplicaría el gasto.
  const totalGastos  = sira;
  const totalGeneral = (Number(d.generadoTotal) || 0) - (Number(d.comisionTotal) || 0) - totalGastos;
  return { d: d, sira: sira, totalGastos: totalGastos, totalGeneral: totalGeneral };
}

function _cierreReportHTML() {
  const x = _cierreDatos();
  if (!x) return '';
  const d = x.d;
  const money = n => '$' + (Number(n) || 0).toFixed(2);
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const mesNom = CM_MESES[d.mes - 1] + ' ' + d.anio;
  const h = new Date();
  const fechaGen = ('0'+h.getDate()).slice(-2)+'/'+('0'+(h.getMonth()+1)).slice(-2)+'/'+h.getFullYear()+' '+('0'+h.getHours()).slice(-2)+':'+('0'+h.getMinutes()).slice(-2);
  let staffRows = '';
  (d.staff || []).forEach(s => {
    staffRows += '<tr><td>'+esc(s.chica)+'</td><td class="c">'+(s.servicios||0)+'</td><td class="r">'+money(s.generado)+'</td><td class="r rojo">'+money(s.comision)+'</td></tr>';
  });
  if (!staffRows) staffRows = '<tr><td colspan="4" class="c" style="color:#999;">Sin servicios registrados este mes.</td></tr>';
  const guardadoTxt = (d.guardado && d.guardado.fechaCierre)
    ? 'Cierre guardado el ' + esc(d.guardado.fechaCierre) + (d.guardado.registradoPor ? ' por ' + esc(d.guardado.registradoPor) : '')
    : 'Cierre no guardado todavía';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cierre ' + esc(mesNom) + '</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0;}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1a1a1a;padding:28px 30px;font-size:13px;}'
    + 'h1{font-size:22px;letter-spacing:-0.02em;}'
    + '.sub{color:#777;font-size:12px;margin-top:2px;}'
    + '.hero{background:#2a2118;color:#fff;border-radius:14px;padding:18px 20px;margin:18px 0;}'
    + '.hero .big{font-size:34px;font-weight:800;letter-spacing:-0.03em;}'
    + '.hero .meta{font-size:12px;opacity:.78;margin-top:4px;}'
    + '.st{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin:20px 0 8px;}'
    + 'table{width:100%;border-collapse:collapse;font-size:13px;}'
    + 'th,td{padding:8px 10px;border-bottom:1px solid #e5e5e5;text-align:left;}'
    + 'th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#999;font-weight:700;}'
    + 'td.c,th.c{text-align:center;} td.r,th.r{text-align:right;} .rojo{color:#c0392b;}'
    + 'tr.tot td{font-weight:800;border-top:2px solid #333;border-bottom:none;}'
    + '.box{border:1px solid #e5e5e5;border-radius:12px;padding:12px 16px;margin-top:10px;}'
    + '.row{display:flex;justify-content:space-between;padding:4px 0;}'
    + '.tg{border:2px solid #2a2118;border-radius:12px;padding:14px 18px;margin-top:14px;}'
    + '.tg .fin{display:flex;justify-content:space-between;font-weight:800;font-size:18px;border-top:1.5px solid #2a2118;margin-top:8px;padding-top:10px;}'
    + '.foot{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #e5e5e5;padding-top:10px;line-height:1.5;}'
    + '@page{margin:14mm;} @media print{body{padding:0;}}'
    + '</style></head><body>'
    + '<h1>Cierre de mes</h1><div class="sub">' + esc(mesNom) + ' · NexServ</div>'
    + '<div class="hero"><div class="big">' + money(d.generadoTotal) + '</div>'
    +   '<div class="meta">Generado del mes · ' + (d.numClientas||0) + ' clientas · ' + (d.numServicios||0) + ' servicios' + (d.numProductos ? ' · ' + d.numProductos + ' productos' : '') + '</div></div>'
    + '<div class="st">Por staff</div>'
    + '<table><thead><tr><th>Staff</th><th class="c">Serv.</th><th class="r">Generado</th><th class="r">Comisión</th></tr></thead><tbody>'
    +   staffRows
    +   '<tr class="tot"><td>Total</td><td class="c">' + (d.numServicios||0) + '</td><td class="r">' + money(d.generadoServicios) + '</td><td class="r rojo">' + money(d.comisionTotal) + '</td></tr>'
    + '</tbody></table>'
    + (d.numProductos ? '<div class="box row"><span>Productos vendidos (' + d.numProductos + ')</span><strong>' + money(d.generadoProductos) + '</strong></div>' : '')
    + '<div class="st">Gastos del mes</div>'
    + '<div class="box">'
    +   '<div class="row"><span>SIRA (mes)' + (d.siraOk ? ' &middot; ' + (d.siraCount||0) + ' gasto(s)' : '') + '</span><span class="rojo">-' + money(x.sira) + '</span></div>'
    +   '<div class="row" style="border-top:1.5px solid #e5e5e5;margin-top:6px;padding-top:8px;font-weight:800;"><span>Total gastos</span><span class="rojo">-' + money(x.totalGastos) + '</span></div>'
    + '</div>'
    + '<div class="tg">'
    +   '<div class="row" style="color:#777;"><span>Generado</span><span>' + money(d.generadoTotal) + '</span></div>'
    +   '<div class="row" style="color:#777;"><span>&minus; Comisiones</span><span>-' + money(d.comisionTotal) + '</span></div>'
    +   '<div class="row" style="color:#777;"><span>&minus; Gastos (SIRA)</span><span>-' + money(x.totalGastos) + '</span></div>'
    +   '<div class="fin"><span>TOTAL GENERAL</span><span style="color:' + (x.totalGeneral>=0?'#1e7e34':'#c0392b') + ';">' + money(x.totalGeneral) + '</span></div>'
    + '</div>'
    + '<div class="foot">Caja chica de Mikaela este mes: ' + money(d.gastoCajaChica) + ' en ' + (d.numGastosCaja||0) + ' gasto(s) — control diario de caja, no se incluye en el cuadre (el gasto del mes lo lleva SIRA).<br>' + guardadoTxt + '<br>Reporte generado el ' + fechaGen + '</div>'
    + '</body></html>';
}

function exportarCierrePDF() {
  const html = _cierreReportHTML();
  if (!html) { showToast('Primero cargá un cierre del mes.'); return; }
  // 1) Ventana nueva (lo más fiable en tablet/escritorio → "Guardar como PDF")
  let win = null;
  try { win = window.open('', '_blank'); } catch(e) { win = null; }
  if (win) {
    win.document.open(); win.document.write(html); win.document.close();
    try { win.focus(); } catch(e){}
    setTimeout(function(){ try { win.print(); } catch(e){} }, 450);
    return;
  }
  // 2) Fallback: iframe oculto tamaño A4 (PWA con ventanas emergentes bloqueadas)
  let ifr = document.getElementById('cmPrintFrame');
  if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr);
  ifr = document.createElement('iframe');
  ifr.id = 'cmPrintFrame';
  ifr.style.cssText = 'position:fixed;top:-10000px;left:0;width:794px;height:1123px;border:0;';
  document.body.appendChild(ifr);
  const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
  if (!doc) { showToast('No se pudo generar el PDF. Probá con Excel.'); return; }
  doc.open(); doc.write(html); doc.close();
  setTimeout(function(){
    try { ifr.contentWindow.focus(); ifr.contentWindow.print(); }
    catch(e) { showToast('No se pudo imprimir. Usá Excel.'); }
  }, 500);
}

function exportarCierreExcel() {
  const x = _cierreDatos();
  if (!x) { showToast('Primero cargá un cierre del mes.'); return; }
  const d = x.d;
  const num = n => (Number(n) || 0).toFixed(2);
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const mesNom = CM_MESES[d.mes - 1] + ' ' + d.anio;
  let rows = '';
  (d.staff || []).forEach(s => {
    rows += '<tr><td>'+esc(s.chica)+'</td><td>'+(s.servicios||0)+'</td><td>'+num(s.generado)+'</td><td>'+num(s.comision)+'</td></tr>';
  });
  const tabla =
      '<table border="1"><tr><th colspan="4">Cierre de mes — '+esc(mesNom)+'</th></tr>'
    + '<tr><td>Generado total</td><td></td><td></td><td>'+num(d.generadoTotal)+'</td></tr>'
    + '<tr><td>Clientas</td><td></td><td></td><td>'+(d.numClientas||0)+'</td></tr>'
    + '<tr><td>Servicios</td><td></td><td></td><td>'+(d.numServicios||0)+'</td></tr>'
    + (d.numProductos ? '<tr><td>Productos vendidos</td><td>'+d.numProductos+'</td><td></td><td>'+num(d.generadoProductos)+'</td></tr>' : '')
    + '<tr><td colspan="4"></td></tr>'
    + '<tr><th>Staff</th><th>Servicios</th><th>Generado</th><th>Comisión</th></tr>'
    + rows
    + '<tr><td>TOTAL</td><td>'+(d.numServicios||0)+'</td><td>'+num(d.generadoServicios)+'</td><td>'+num(d.comisionTotal)+'</td></tr>'
    + '<tr><td colspan="4"></td></tr>'
    + '<tr><td>SIRA (mes)</td><td></td><td></td><td>-'+num(x.sira)+'</td></tr>'
    + '<tr><td>Total gastos</td><td></td><td></td><td>-'+num(x.totalGastos)+'</td></tr>'
    + '<tr><td colspan="4"></td></tr>'
    + '<tr><th colspan="3">TOTAL GENERAL</th><th>'+num(x.totalGeneral)+'</th></tr>'
    + '<tr><td colspan="4"></td></tr>'
    + '<tr><td>Caja chica ('+(d.numGastosCaja||0)+' gastos) — control diario, NO se incluye en el cuadre</td><td></td><td></td><td>'+num(d.gastoCajaChica)+'</td></tr>'
    + '</table>';
  const contenido = '\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>' + tabla + '</body></html>';
  try {
    const blob = new Blob([contenido], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cierre_' + CM_MESES[d.mes - 1] + '_' + d.anio + '.xls';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ if (a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 1200);
    showToast('✓ Excel descargado');
  } catch(e) {
    showToast('No se pudo descargar el Excel.');
  }
}
window.exportarCierrePDF = exportarCierrePDF;
window.exportarCierreExcel = exportarCierreExcel;

async function guardarCierreMes() {
  const d = window._cmData;
  if (!d) return;
  const inp = document.getElementById('cmSiraInput');
  const sira = Number(inp && inp.value) || 0;
  // Caja chica NO entra en el cuadre guardado (control diario, no gasto del mes).
  // Se sigue guardando d.gastoCajaChica como dato de referencia en la hoja.
  const totalGeneral = d.generadoTotal - d.comisionTotal - sira;
  const btn = document.getElementById('cmGuardarBtn');
  const txtOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando…'; }
  try {
    const r = await apiPost('guardarCierreMes', {
      mes: d.mes, anio: d.anio,
      numClientas: d.numClientas, numServicios: d.numServicios,
      generadoServicios: d.generadoServicios, generadoProductos: d.generadoProductos,
      generadoTotal: d.generadoTotal, comisionTotal: d.comisionTotal,
      gastoCajaChica: d.gastoCajaChica, gastoSIRA: sira,
      totalGeneral: totalGeneral, staff: d.staff,
      registradoPor: (window.currentUser && window.currentUser.name) || 'Owner'
    });
    if (r && r.success) {
      const key = d.mes + '-' + d.anio;
      window._cmSiraPorMes = window._cmSiraPorMes || {};
      window._cmSiraPorMes[key] = sira;
      const histAbierto = (() => { const hl = document.getElementById('cmHistList'); return hl && hl.style.display !== 'none'; })();
      await loadCierreMes();
      if (histAbierto) { const hl = document.getElementById('cmHistList'); if (hl) { hl.style.display = 'block'; const c = document.getElementById('cmHistCaret'); if (c) c.textContent = '▲'; } loadHistorialCierres(); }
    } else {
      alert('No se pudo guardar: ' + ((r && r.error) || 'error desconocido'));
      if (btn) { btn.disabled = false; btn.innerHTML = txtOrig; }
    }
  } catch (e) {
    alert('Error al guardar: ' + e.message);
    if (btn) { btn.disabled = false; btn.innerHTML = txtOrig; }
  }
}

function toggleHistorialCierres() {
  const list = document.getElementById('cmHistList');
  const caret = document.getElementById('cmHistCaret');
  if (!list) return;
  const abrir = list.style.display === 'none';
  list.style.display = abrir ? 'block' : 'none';
  if (caret) caret.textContent = abrir ? '▲' : '▼';
  if (abrir) loadHistorialCierres();
}

async function loadHistorialCierres() {
  const list = document.getElementById('cmHistList');
  if (!list) return;
  list.innerHTML = '<div class="card" style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">Cargando historial…</div>';
  try {
    const r = await apiGet('getCierresMesHistorico');
    if (!r || !r.success || !r.cierres || !r.cierres.length) {
      list.innerHTML = '<div class="card" style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">Aún no hay cierres guardados.</div>';
      return;
    }
    const money = n => '$' + (Number(n) || 0).toFixed(2);
    let h = '';
    r.cierres.forEach(c => {
      const nombreMes = CM_MESES[(c.mes - 1)] || c.periodo;
      h += '<div class="card" style="padding:12px 14px;margin-bottom:8px;cursor:pointer;" onclick="irACierre(' + c.mes + ',' + c.anio + ')">';
      h +=   '<div style="display:flex;justify-content:space-between;align-items:center;">';
      h +=     '<span style="font-weight:800;font-size:14px;">' + nombreMes + ' ' + c.anio + '</span>';
      h +=     '<span style="font-weight:800;font-size:15px;color:' + (c.totalGeneral >= 0 ? 'var(--success)' : 'var(--danger)') + ';">' + money(c.totalGeneral) + '</span>';
      h +=   '</div>';
      h +=   '<div style="font-size:11px;color:var(--ink-soft);margin-top:4px;">Generó ' + money(c.generadoTotal) + ' · ' + c.numClientas + ' clientas · ' + c.numServicios + ' servicios</div>';
      h +=   '<div style="font-size:10px;color:var(--ink-faint);margin-top:3px;">Comisiones ' + money(c.comisionTotal) + ' · Caja ' + money(c.gastoCajaChica) + ' · SIRA ' + money(c.gastoSIRA) + '</div>';
      if (c.fechaCierre) h += '<div style="font-size:10px;color:var(--ink-faint);margin-top:3px;">Guardado: ' + c.fechaCierre + (c.registradoPor ? ' · ' + c.registradoPor : '') + '</div>';
      h += '</div>';
    });
    list.innerHTML = h;
  } catch (e) {
    list.innerHTML = '<div class="card" style="text-align:center;padding:16px;color:var(--danger);font-size:13px;">Error: ' + e.message + '</div>';
  }
}

function irACierre(mes, anio) {
  const selMes  = document.getElementById('cmMes');
  const selAnio = document.getElementById('cmAnio');
  if (selMes)  selMes.value = String(mes);
  if (selAnio) {
    if (!Array.from(selAnio.options).some(o => o.value === String(anio))) {
      const opt = document.createElement('option'); opt.value = String(anio); opt.textContent = anio; selAnio.appendChild(opt);
    }
    selAnio.value = String(anio);
  }
  loadCierreMes();
  const scr = document.getElementById('ownerCierreMes');
  if (scr) window.scrollTo(0, 0);
}
/* ========== /CIERRE DE MES ========== */

/* ========== INFORME DE SERVICIOS (Owner) ========== */
var _isVista = 'combo'; // 'combo' | 'modelo'

function setIsVista(v) {
  _isVista = v;
  const btnC = document.getElementById('isToggleCombo');
  const btnM = document.getElementById('isToggleModelo');
  if (btnC && btnM) {
    const activeStyle  = 'background:var(--ink);color:var(--bg-card);';
    const inactiveStyle = 'background:transparent;color:var(--ink);';
    btnC.style.cssText += v === 'combo'  ? activeStyle : inactiveStyle;
    btnM.style.cssText += v === 'modelo' ? activeStyle : inactiveStyle;
  }
  cargarInformeServicios();
}
function initInformeServiciosSelectors() {
  const selMes  = document.getElementById('isMes');
  const selAnio = document.getElementById('isAnio');
  if (!selMes || !selAnio) return;
  if (selMes.options.length && selAnio.options.length) return; // poblar una sola vez

  const now = new Date();
  const mesActual  = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  selMes.innerHTML = CM_MESES.map((m, i) =>
    '<option value="' + (i + 1) + '"' + ((i + 1) === mesActual ? ' selected' : '') + '>' + m + '</option>'
  ).join('');

  let aniosHtml = '';
  for (let a = anioActual; a >= 2024; a--) {
    aniosHtml += '<option value="' + a + '"' + (a === anioActual ? ' selected' : '') + '>' + a + '</option>';
  }
  selAnio.innerHTML = aniosHtml;
}

async function cargarInformeServicios() {
  initInformeServiciosSelectors();
  const body = document.getElementById('isBody');
  if (!body) return;
  body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">Cargando informe…</div>';

  const mes  = Number(document.getElementById('isMes').value)  || (new Date()).getMonth() + 1;
  const anio = Number(document.getElementById('isAnio').value) || (new Date()).getFullYear();
  const categoria = document.getElementById('isCategoria').value || '';
  const staffSel  = document.getElementById('isStaff').value || '';

  // Rango de fechas del mes elegido
  const fechaInicio = anio + '-' + String(mes).padStart(2,'0') + '-01';
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fechaFin = anio + '-' + String(mes).padStart(2,'0') + '-' + String(ultimoDia).padStart(2,'0');

  try {
    const [general, topPestanas, tendencias] = await Promise.all([
      apiGet('getReporteServicios', { accion: 'general', fechaInicio, fechaFin, categoria, staff: staffSel }),
      apiGet('getReporteServicios', { accion: 'topModelosPestanas', mes, anio }),
      apiGet('getReporteServicios', { accion: 'tendencias', mes, anio, categoria })
    ]);

    if (!general || !general.success) {
      const motivo = (general && (general.message || general.error)) || 'Sin respuesta del servidor';
      body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--danger);font-size:13px;">No se pudo cargar el informe<br><span style="font-size:11px;color:var(--ink-faint);margin-top:6px;display:block;">' + String(motivo).replace(/[<>]/g,'') + '</span><br><span style="font-size:10px;color:var(--ink-faint);">Si el problema persiste, confirma que el backend de Apps Script tenga la última versión desplegada.</span></div>';
      console.error('[Informe de Servicios] Falló getReporteServicios:', general);
      return;
    }

    renderInformeServicios(general, topPestanas, tendencias);

    // Poblar selector de staff con los nombres que aparecen en el ranking (solo una vez por carga de mes)
    const selStaff = document.getElementById('isStaff');
    if (selStaff && general.rankingStaff && general.rankingStaff.length) {
      const valorActual = selStaff.value;
      const opciones = ['<option value="">Todas las staff</option>']
        .concat(general.rankingStaff.map(s => '<option value="' + s.staff.replace(/"/g,'') + '">' + s.staff + '</option>'));
      selStaff.innerHTML = opciones.join('');
      selStaff.value = valorActual;
    }
  } catch (e) {
    body.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--danger);font-size:13px;">Error: ' + e.message + '</div>';
  }
}

function renderInformeServicios(d, pestanasData, tendData) {
  const body = document.getElementById('isBody');
  if (!body) return;
  const money = n => '$' + (Number(n) || 0).toFixed(2);
  let html = '';

  // ---- Tarjetas principales ----
  html += '<div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-bottom:14px;">';
  html +=   '<div class="stat"><div class="label">Servicios totales</div><div class="value" style="font-size:20px;">' + d.totalServicios + '</div></div>';
  html +=   '<div class="stat"><div class="label">Ingreso total</div><div class="value" style="font-size:20px;color:var(--success);">' + money(d.ingresoTotal) + '</div></div>';
  html += '</div>';

  html += '<div class="card" style="padding:14px 16px;margin-bottom:14px;">';
  html +=   '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:var(--ink-soft);">Servicio más vendido</span><span style="font-weight:700;">' + (d.servicioMasVendido || '—') + '</span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:var(--ink-soft);">Categoría líder</span><span style="font-weight:700;">' + (d.categoriaLider || '—') + '</span></div>';
  html +=   '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:var(--ink-soft);">Mayor ingreso</span><span style="font-weight:700;">' + (d.servicioMayorIngreso || '—') + '</span></div>';
  html += '</div>';

  // ---- Ingreso por categoría ----
  html += '<div class="section-title">Ingreso por categoría</div>';
  if (!d.categorias || !d.categorias.length) {
    html += '<div class="card" style="text-align:center;padding:18px;color:var(--ink-faint);font-size:13px;">Sin datos en este período.</div>';
  } else {
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
    d.categorias.forEach(c => {
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="flex:1;font-weight:700;">' + c.categoria + '</span>'
            + '<span style="color:var(--ink-soft);margin-right:10px;">' + c.cantidad + ' serv.</span>'
            + '<span style="font-weight:700;color:var(--success);">' + money(c.ingreso) + '</span></div>';
    });
    html += '</div>';
  }

  // ---- Top 5 servicios / Top modelos — respeta el toggle ----
  // Vista "Por combo": muestra el nombre exacto del ticket (Combo 7 Hawaiano, Retoque...)
  //   → útil para saber qué paquetes se venden más
  // Vista "Por modelo": agrupa por técnica de pestañas (Hawaiano, Volumen, Clásicas...)
  //   → útil para entender qué modelos demanda el mercado, independiente del nombre del combo
  const vistaActual = (typeof _isVista !== 'undefined') ? _isVista : 'combo';
  const categoriaActual = document.getElementById('isCategoria').value || '';
  const esPestanas = !categoriaActual || categoriaActual === 'Pestañas';

  if (vistaActual === 'combo' || !esPestanas) {
    // Vista por combo (o cualquier categoría no-pestañas): muestra nombre del servicio
    html += '<div class="section-title">Top 5 servicios</div>';
    if (!d.topServicios || !d.topServicios.length) {
      html += '<div class="card" style="text-align:center;padding:18px;color:var(--ink-faint);font-size:13px;">Sin servicios registrados.</div>';
    } else {
      html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
      d.topServicios.slice(0,5).forEach((s,i) => {
        html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
              + '<span style="width:20px;color:var(--ink-faint);font-weight:700;">' + (i+1) + '</span>'
              + '<span style="flex:1;font-weight:600;">' + s.servicio + (!categoriaActual ? '<br><span style="font-size:10px;color:var(--ink-faint);">' + s.categoria + '</span>' : '') + '</span>'
              + '<span style="color:var(--ink-soft);margin-right:10px;">' + s.cantidad + 'x</span>'
              + '<span style="font-weight:700;color:var(--success);">' + money(s.ingreso) + '</span></div>';
      });
      html += '</div>';
    }
  }

  // Vista por modelo de pestañas
  const ocultarModelosPestanas = categoriaActual && categoriaActual !== 'Pestañas';
  if (!ocultarModelosPestanas && pestanasData && pestanasData.success && pestanasData.modelos && pestanasData.modelos.length) {
    const tituloModelos = vistaActual === 'modelo' ? 'Top modelos de pestañas' : 'Top 5 modelos de pestañas';
    const limitModelos  = vistaActual === 'modelo' ? pestanasData.modelos.length : 5;
    html += '<div class="section-title">' + tituloModelos + '</div>';
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';

    // En vista "modelo" agregamos un sub-detalle de staff debajo de cada modelo
    pestanasData.modelos.slice(0, limitModelos).forEach((m,i) => {
      const esPromo = m.enPromo !== undefined ? m.enPromo : '—';
      const enNormal = m.enPrecioNormal !== undefined ? m.enPrecioNormal : '—';
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="width:20px;color:var(--ink-faint);font-weight:700;">' + (i+1) + '</span>'
            + '<span style="flex:1;font-weight:600;">' + m.modelo;
      if (vistaActual === 'modelo' && m.porStaff) {
        // Mostrar desglose por staff con promo vs precio normal
        const staffLines = Object.entries(m.porStaff)
          .sort((a,b) => b[1] - a[1])
          .map(([st, cnt]) => st + ': ' + cnt)
          .join(' · ');
        html += '<br><span style="font-size:10px;color:var(--ink-faint);">' + staffLines + '</span>';
      } else {
        html += '<br><span style="font-size:10px;color:var(--ink-faint);">' + (m.staffQueMasLoRealizo || '—') + '</span>';
      }
      html += '</span>'
            + '<span style="color:var(--ink-soft);margin-right:10px;">' + m.cantidad + 'x</span>'
            + '<span style="font-weight:700;color:var(--success);">' + money(m.ingreso) + '</span></div>';
    });
    html += '</div>';
  }

  // ---- Top staff — por cantidad de servicios ----
  // El diferenciador "nuevas/retoques" solo aplica al vistazo general (sin
  // categoría filtrada): es una métrica de captación vs retención del salón
  // completo, no tiene sentido por área (ej. en Pestañas confunde más de lo
  // que ayuda, ya vimos que mezclaba el dato sin aportar nada accionable).
  const sinCategoriaFiltrada = !categoriaActual;
  html += '<div class="section-title">Top staff — por servicios</div>';
  if (!d.rankingStaff || !d.rankingStaff.length) {
    html += '<div class="card" style="text-align:center;padding:18px;color:var(--ink-faint);font-size:13px;">Sin datos de staff.</div>';
  } else {
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
    d.rankingStaff.slice(0,8).forEach((s,i) => {
      const tieneDif = sinCategoriaFiltrada && (s.retoques !== undefined && s.monturasNuevas !== undefined);
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="width:20px;color:var(--ink-faint);font-weight:700;">' + (i+1) + '</span>'
            + '<span style="flex:1;font-weight:700;">' + s.staff
            + (tieneDif ? '<br><span style="font-size:10px;color:var(--ink-faint);font-weight:400;">' + s.monturasNuevas + ' nuevas · ' + s.retoques + ' retoques</span>' : '')
            + '</span>'
            + '<span style="color:var(--ink-soft);margin-right:10px;">' + s.cantidad + ' serv.</span>'
            + '<span style="font-weight:700;color:var(--success);">' + money(s.ingreso) + '</span></div>';
    });
    html += '</div>';

    // ---- Top staff — por ingreso ($$) ----
    const rankingPorIngreso = d.rankingStaff.slice().sort((a,b) => b.ingreso - a.ingreso);
    html += '<div class="section-title">Top staff — por ingreso</div>';
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
    rankingPorIngreso.slice(0,8).forEach((s,i) => {
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="width:20px;color:var(--ink-faint);font-weight:700;">' + (i+1) + '</span>'
            + '<span style="flex:1;font-weight:700;">' + s.staff + '</span>'
            + '<span style="color:var(--ink-soft);margin-right:10px;">' + s.cantidad + ' serv.</span>'
            + '<span style="font-weight:700;color:var(--success);">' + money(s.ingreso) + '</span></div>';
    });
    html += '</div>';
  }


  // ---- Ticket promedio por categoría ----
  if (d.ticketPromedioCategoria && d.ticketPromedioCategoria.length) {
    html += '<div class="section-title">Ticket promedio por categoría</div>';
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
    d.ticketPromedioCategoria.forEach(t => {
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="flex:1;font-weight:600;">' + t.categoria + '</span>'
            + '<span style="font-weight:700;">' + money(t.ticketPromedio) + '</span></div>';
    });
    html += '</div>';
  }

  // ---- Tiempo promedio por servicio ----
  // Solo cuenta servicios cobrados a través de Lineas (hora_toma/hora_devuelta);
  // el histórico previo al 18/06 no tiene esos timestamps, así que esta tarjeta
  // se va llenando con más datos a medida que pasan los meses.
  if (d.tiempoPromedioServicio && d.tiempoPromedioServicio.length) {
    html += '<div class="section-title">Tiempo promedio por servicio</div>';
    html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
    d.tiempoPromedioServicio.forEach(t => {
      html += '<div style="display:flex;align-items:center;font-size:13px;padding:9px 0;border-bottom:1px solid var(--line);">'
            + '<span style="flex:1;font-weight:600;">' + t.servicio + '<br><span style="font-size:10px;color:var(--ink-faint);">' + t.muestras + ' muestra' + (t.muestras===1?'':'s') + '</span></span>'
            + '<span style="font-weight:700;">' + t.minutosPromedio + ' min</span></div>';
    });
    html += '</div>';
  }

  // ---- Servicios en crecimiento / en baja ----
  if (tendData && tendData.success) {
    if (tendData.enCrecimiento && tendData.enCrecimiento.length) {
      html += '<div class="section-title">📈 Servicios en crecimiento</div>';
      html += '<div class="card" style="padding:6px 14px;margin-bottom:14px;">';
      tendData.enCrecimiento.forEach(t => {
        html += '<div style="display:flex;align-items:center;font-size:13px;padding:8px 0;border-bottom:1px solid var(--line);">'
              + '<span style="flex:1;font-weight:600;">' + t.servicio + '</span>'
              + '<span style="color:var(--success);font-weight:700;">+' + t.variacionPct + '%</span></div>';
      });
      html += '</div>';
    }
    // "Servicios en baja" eliminado a pedido: tendencia decreciente con -100% en
    // servicios que sencillamente no se repitieron este mes (promo puntual, retoque
    // de un combo ya vendido) no es una señal útil de negocio — generaba ruido sin
    // ninguna acción clara que tomar. Se mantiene "en crecimiento", que sí orienta.
  }

  // ---- Tabla resumen detallada ----
  html += '<div class="section-title">Detalle de servicios (' + (d.tablaResumen ? d.tablaResumen.length : 0) + ')</div>';
  if (!d.tablaResumen || !d.tablaResumen.length) {
    html += '<div class="card" style="text-align:center;padding:18px;color:var(--ink-faint);font-size:13px;">Sin servicios en este período.</div>';
  } else {
    html += '<div class="card" style="padding:0;overflow-x:auto;margin-bottom:20px;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="background:var(--bg);text-align:left;">'
          + '<th style="padding:8px 10px;white-space:nowrap;">Fecha</th>'
          + '<th style="padding:8px 10px;">Cliente</th>'
          + '<th style="padding:8px 10px;">Categoría</th>'
          + '<th style="padding:8px 10px;">Servicio</th>'
          + '<th style="padding:8px 10px;">Staff</th>'
          + '<th style="padding:8px 10px;text-align:right;">Precio</th>'
          + '</tr></thead><tbody>';
    // Limitar a 200 filas en pantalla para no sobrecargar el render; el resto está en el backend si se exporta
    d.tablaResumen.slice(0, 200).forEach(r => {
      html += '<tr style="border-top:1px solid var(--line);">'
            + '<td style="padding:7px 10px;white-space:nowrap;color:var(--ink-soft);">' + r.fecha + '</td>'
            + '<td style="padding:7px 10px;">' + (r.cliente || '—') + '</td>'
            + '<td style="padding:7px 10px;">' + r.categoria + '</td>'
            + '<td style="padding:7px 10px;">' + r.servicio + '</td>'
            + '<td style="padding:7px 10px;">' + (r.staff || '—') + '</td>'
            + '<td style="padding:7px 10px;text-align:right;font-weight:700;">' + money(r.precio) + '</td></tr>';
    });
    html += '</tbody></table>';
    if (d.tablaResumen.length > 200) {
      html += '<div style="padding:8px 10px;font-size:11px;color:var(--ink-faint);text-align:center;">Mostrando las primeras 200 de ' + d.tablaResumen.length + ' filas.</div>';
    }
    html += '</div>';
  }

  body.innerHTML = html;
}
window.cargarInformeServicios = cargarInformeServicios;
/* ========== /INFORME DE SERVICIOS ========== */
