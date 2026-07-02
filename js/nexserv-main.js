// ================================================
// NEXSERV nexserv-main.js
// Lógica de negocio principal
// Depende de: state.js, api.js, router.js, app.js
// Fase 2 partición — contiene todo el JS restante
// ================================================

// ── Lógica principal (parte 1: constantes y helpers de negocio) ──

  async function renderPromos() {
    const list = document.getElementById('promosList');
    if (!list) return;
    
    // Asegurar que PROMOS esté cargado
    await ensurePromosLoaded();

    document.getElementById('promoCount').textContent = PROMOS.filter(p => p.active).length;
    list.innerHTML = PROMOS.map((p, i) => `
      <div class="card" style="margin-bottom: 12px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 16px; letter-spacing: -0.02em; margin-bottom: 3px;">${p.name}</div>
            <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500;">${p.services}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
            <div style="font-size: 24px; font-weight: 800; color: var(--accent-deep); letter-spacing: -0.03em;">$${p.price}</div>
            <div style="font-size: 11px; color: var(--ink-faint); text-decoration: line-through; font-weight: 500;">$${p.regular} sin promo</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
          <span style="background: var(--success-bg); color: var(--success); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-pill);">Ahorro $${p.regular - p.price}</span>
          <span style="background: var(--warning-bg); color: var(--warning); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-pill);">💵 Solo efectivo/transfer.</span>
          <span style="font-size: 11px; font-weight: 600; color: var(--ink-faint); padding: 4px 0;">${p.from.slice(5)} → ${p.to.slice(5)}</span>
        </div>
        <div style="background: var(--bg); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--ink-soft); margin-bottom: 6px;">División por área</div>
          ${p.division.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; border-bottom: 1px solid var(--line);">
              <div>
                <span style="font-weight: 700;">${d.area}</span>
                <div style="font-size: 10px; color: var(--ink-faint); font-weight: 500; margin-top: 1px;">→ ${d.staff}</div>
              </div>
              <span style="font-weight: 800; font-size: 14px;">$${d.monto} <span style="color: var(--accent-deep); font-size: 11px; font-weight: 600;">(${d.comm})</span></span>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="editPromo(${i})" style="flex: 1; padding: 12px; background: var(--bg); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">✏️ Editar</button>
          <button onclick="togglePromoActive(${i})" style="flex: 1; padding: 12px; background: ${p.active ? 'var(--danger-bg)' : 'var(--success-bg)'}; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; color: ${p.active ? 'var(--danger)' : 'var(--success)'};">${p.active ? '⏸ Pausar' : '▶ Activar'}</button>
        </div>
      </div>
    `).join('');
  }

  async function renderStaffPromos() {
    const list = document.getElementById('staffPromosList');
    if (!list) return;
    
    // Mostrar loading mientras carga
    list.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--ink-faint);"><div style="animation: pulse 1.5s infinite; font-size: 13px;">⏳ Cargando promos...</div></div>';
    
    // Cargar promos desde el servidor
    try {
      const result = await apiGet('getPromos');
      if (result.success && result.promos && result.promos.length > 0) {
        // REEMPLAZAR completamente el array PROMOS con los datos del servidor
        PROMOS = result.promos.map(p => ({
          id: p.id || '',
          name: p.nombre || '',
          services: p.servicios || '',
          price: Number(p.precioCombo) || 0,
          regular: Number(p.sumaIndividual) || 0,
          from: p.desde || '',
          to: p.hasta || '',
          active: p.activa === 'Sí' || p.activa === true,
          division: p.division ? JSON.parse(p.division) : []
        }));
      }
    } catch (err) { 
      console.error('Error cargando promos:', err);
    }
    
    // Renderizar las promos
    const active = PROMOS.filter(p => p.active);
    if (active.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--ink-faint);"><div style="font-size: 32px; margin-bottom: 8px;">🏷</div>No hay promos activas esta semana</div>';
      return;
    }
    list.innerHTML = active.map(p => `
      <div class="card" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 3px;">${p.name}</div>
            <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-bottom: 8px;">${p.services}</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <span style="background: var(--accent); color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-pill);">💵 $${p.price} efectivo</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--ink-faint); text-decoration: line-through; padding: 3px 0;">$${p.regular} sin promo</span>
            </div>
          </div>
          <div style="background: var(--success-bg); color: var(--success); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-pill); flex-shrink: 0; margin-left: 8px;">-$${p.regular - p.price}</div>
        </div>
      </div>
    `).join('');
  }

  function openNewPromo() {
    document.getElementById('promoModalTitle').textContent = 'Nueva promo';
    document.getElementById('promoName').value = '';
    ['promoCejas1','promoCejas2','promoCejas3','promoCejas4','promoCejas5'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('promoDepilacion1').value = '';
    document.getElementById('promoDepilacion2').value = '';
    document.getElementById('promoDepilacion3').value = '';
    document.getElementById('promoPestanas').value = '';
    document.getElementById('promoFacial').value = '';
    document.getElementById('promoPrice').value = '';
    document.getElementById('promoRegular').value = '';
    document.getElementById('promoRegularDisplay').textContent = '$0';
    document.getElementById('promoSavingsDisplay').style.display = 'none';
    document.getElementById('promoFrom').value = '';
    document.getElementById('promoTo').value = '';
    document.getElementById('promoDivision').innerHTML = '';
    document.getElementById('newPromoModal').classList.add('active');
    window._editingPromo = -1;
  }

  function editPromo(idx) {
    const p = PROMOS[idx];
    document.getElementById('promoModalTitle').textContent = 'Editar promo';
    document.getElementById('promoName').value = p.name;
    document.getElementById('promoPrice').value = p.price;
    document.getElementById('promoFrom').value = p.from;
    document.getElementById('promoTo').value = p.to;
    
    // Resetear selects
    ['promoCejas1','promoCejas2','promoCejas3','promoCejas4','promoCejas5'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('promoDepilacion1').value = '';
    document.getElementById('promoDepilacion2').value = '';
    document.getElementById('promoDepilacion3').value = '';
    document.getElementById('promoPestanas').value = '';
    document.getElementById('promoFacial').value = '';
    
    // Preseleccionar servicios guardados
    if (p._selectedServices) {
      let depCount = 0;
      let cejaCount = 0;
      p._selectedServices.forEach(s => {
        let selId;
        if (s.area === 'depilacion') {
          depCount++;
          selId = 'promoDepilacion' + Math.min(depCount, 3);
        } else if (s.area === 'cejas') {
          cejaCount++;
          selId = 'promoCejas' + Math.min(cejaCount, 5);
        } else {
          const areaMap = { pestanas: 'promoPestanas', facial: 'promoFacial' };
          selId = areaMap[s.area];
        }
        if (selId) {
          const sel = document.getElementById(selId);
          for (let opt of sel.options) {
            if (opt.value && JSON.parse(opt.value).code === s.code) {
              sel.value = opt.value;
              break;
            }
          }
        }
      });
    }
    updatePromoTotal();
    
    // Rellenar montos de la división con los guardados
    if (p.division) {
      setTimeout(() => {
        const rows = document.getElementById('promoDivision').querySelectorAll('[data-area]');
        rows.forEach(row => {
          const key = row.dataset.area;
          const servicio = row.dataset.servicio;
          let match;
          if (key.startsWith('depi__') || key.startsWith('cejas__')) {
            // Buscar por nombre de servicio
            match = p.division.find(d => d.servicio === servicio || d.area === servicio);
          } else {
            const areaLabel = AREA_LABELS_TEXT[key] || key;
            match = p.division.find(d => d.area === areaLabel);
          }
          if (match) {
            const inp = row.querySelector('input');
            if (inp) inp.value = match.monto;
          }
        });
        updateDepiSumaCheck();
      }, 50);
    }
    
    document.getElementById('newPromoModal').classList.add('active');
    window._editingPromo = idx;
  }

  async function savePromo() {
    const name = document.getElementById('promoName').value.trim();
    const selected = getSelectedServices();
    const price = parseInt(document.getElementById('promoPrice').value);
    const regular = parseInt(document.getElementById('promoRegular').value);
    
    if (!name) { alert('Ponele un nombre al combo'); return; }
    if (selected.length === 0) { alert('Seleccioná al menos un servicio'); return; }
    if (!price) { alert('Definí el precio del combo'); return; }

    const services = selected.map(s => s.name).join(' + ');

    // Leer división por área — con desglose individual para depilación
    const divRows = document.getElementById('promoDivision').querySelectorAll('[data-area]');
    const division = [];
    let divTotal = 0;
    divRows.forEach(row => {
      const key = row.dataset.area;
      const realArea = row.dataset.realarea || key;
      const servicio = row.dataset.servicio || '';
      const inp = row.querySelector('input');
      const monto = parseFloat(inp?.value) || 0;
      if (monto > 0) {
        if (key.startsWith('depi__')) {
          // Ítem individual de depilación: guardar con nombre del servicio
          division.push({
            area: servicio,           // nombre del servicio (ej: "Bikini completo")
            servicio: servicio,       // duplicado para compatibilidad
            realArea: 'depilacion',
            staff: AREA_STAFF['depilacion'] || AREA_STAFF['cejas'],
            monto: monto,
            comm: AREA_COMM['depilacion']
          });
        } else if (key.startsWith('cejas__')) {
          // Ítem individual de cejas: guardar con nombre del servicio
          division.push({
            area: servicio,
            servicio: servicio,
            realArea: 'cejas',
            staff: AREA_STAFF['cejas'],
            monto: monto,
            comm: AREA_COMM['cejas']
          });
        } else {
          division.push({
            area: AREA_LABELS_TEXT[key] || key,
            staff: AREA_STAFF[key],
            monto: monto,
            comm: AREA_COMM[key]
          });
        }
        divTotal += monto;
      }
    });

    if (division.length === 0) { alert('Definí el monto asignado a cada área'); return; }
    if (divTotal !== price) {
      if (!confirm('La suma de las áreas ($' + divTotal + ') no coincide con el precio combo ($' + price + '). ¿Guardar igual?')) return;
    }

    const promo = {
      id: 'P' + String(PROMOS.length + 1).padStart(3, '0'),
      name, services, price, regular,
      from: document.getElementById('promoFrom').value,
      to: document.getElementById('promoTo').value,
      active: true, division,
      _selectedServices: selected
    };

    // Preparar datos para enviar al servidor
    const dataToSave = {
      nombre: name,
      servicios: services,
      precio: price,
      regular: regular || price,
      desde: promo.from || '',
      hasta: promo.to || '',
      activa: true,
      division: JSON.stringify(division)
    };

    if (window._editingPromo >= 0) {
      // Actualizar promo existente
      promo.id = PROMOS[window._editingPromo].id;
      dataToSave.id = promo.id;
      
      const result = await apiPost('updatePromo', dataToSave);
      if (result.error) {
        alert('❌ Error al actualizar la promo en el servidor: ' + result.error);
        return;
      }
      
      PROMOS[window._editingPromo] = promo;
    } else {
      // Crear nueva promo
      const result = await apiPost('addPromo', dataToSave);
      if (result.error) {
        alert('❌ Error al guardar la promo en el servidor: ' + result.error);
        return;
      }
      
      // Actualizar el ID con el que devolvió el servidor
      if (result.id) {
        promo.id = result.id;
      }
      
      PROMOS.push(promo);
    }
    
    closeModal();
    renderPromos();
    alert('✓ Promo guardada en el servidor. Las chicas podrán verla en su sección de promos.');
  }

  async function togglePromoActive(idx) {
    PROMOS[idx].active = !PROMOS[idx].active;
    
    // Actualizar en el servidor
    const promo = PROMOS[idx];
    const dataToUpdate = {
      id: promo.id,
      nombre: promo.name,
      servicios: promo.services,
      precio: promo.price,
      regular: promo.regular,
      desde: promo.from || '',
      hasta: promo.to || '',
      activa: promo.active,
      division: JSON.stringify(promo.division || [])
    };
    
    const result = await apiPost('updatePromo', dataToUpdate);
    if (result.error) {
      alert('❌ Error al actualizar el estado de la promo: ' + result.error);
      // Revertir el cambio local si hubo error
      PROMOS[idx].active = !PROMOS[idx].active;
    }
    
    renderPromos();
  }

  const WAITLIST = [];

  // ÁREAS que cada grupo puede tomar:
  // Cejas (M/L/K/R): cejas, depilacion, retiro_lifting (lifting/retiros)
  // Pestañas (Y/D): pestanas
  // Facial (L): facial
  const AREA_FILTER = {
    'cejas': ['cejas', 'depilacion', 'retiro_lifting'],
    'pestanas': ['pestanas', 'retiro_lifting'],
    'facial': ['facial'],
  };

  // Tracking de clientas activas por chica (para doble atención de cejas)
  let activeClients = {};
  // ej: { 'Keyla': [{ name: 'Isabella Vera', service: '...', since: '10:52' }] }

  // === CARGAR DATOS DEL OWNER HOME ===
  // Refresco liviano del estado del salón (solo los 3 números, sin recargar el resto)
  // Cuenta CLIENTAS atendidas y ya pagadas hoy (únicas). Se acumulan a medida que se
  // cobran. Excluye productos y las partes aún no cobradas ('Pendiente cobro final').
  function _contarAtendidasHoy(histResult) {
    try {
      if (!histResult || !histResult.success || !Array.isArray(histResult.historial)) return 0;
      const pagadas = {};
      histResult.historial.forEach(function(h) {
        const mp = String(h.metodoPago || '').toLowerCase();
        if (!mp || mp === 'producto' || mp.indexOf('pendiente') >= 0) return; // aún no pagada / producto
        const clave = String(h.codigo || h.nombre || '').trim();
        if (clave) pagadas[clave] = true;
      });
      return Object.keys(pagadas).length;
    } catch (e) { return 0; }
  }
  window._contarAtendidasHoy = _contarAtendidasHoy;

  async function refreshEstadoSalon() {
    try {
      const [r, h] = await Promise.all([
        apiGet('getListaCompleta'),
        apiGet('getHistorial', { periodo: 'hoy' }).catch(() => ({ success: false }))
      ]);
      if (r && r.success) {
        const e = document.getElementById('ownerEsperando');
        const s = document.getElementById('ownerServicio');
        if (e) e.textContent = (r.esperando  || []).length;
        if (s) s.textContent = (r.enServicio || []).length;
      }
      const l = document.getElementById('ownerListas');
      if (l) l.textContent = _contarAtendidasHoy(h);
    } catch(e) {}
  }
  window.refreshEstadoSalon = refreshEstadoSalon;

  async function loadOwnerHome() {
    // Mostrar estado de carga inmediatamente
    const histContainer = document.getElementById('ownerHistorial');
    if (histContainer) histContainer.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);font-size:13px;">⏳ Cargando...</div>';

    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
      document.getElementById('ownerWeekNum').textContent = weekNum;

      // Cargar todo en paralelo
      const [commResult, listaResult, histResult] = await Promise.all([
        apiGet('getComisiones').catch(() => ({ success: false })),
        apiGet('getListaCompleta').catch(() => ({ success: false })),
        apiGet('getHistorial', { periodo: 'hoy' }).catch(() => ({ success: false }))
      ]);

      // Comisiones
      let totalFact = 0, totalComm = 0;
      if (commResult.success && commResult.comisiones) {
        commResult.comisiones.forEach(c => {
          totalFact += Number(c.facturado) || 0;
          totalComm += Number(c.comision) || 0;
        });
      }
      document.getElementById('ownerTotalFact').textContent = '$' + totalFact.toFixed(0);
      document.getElementById('ownerComm').textContent = '$' + totalComm.toFixed(0);
      document.getElementById('ownerNeto').textContent = '$' + (totalFact - totalComm).toFixed(0);
      document.getElementById('ownerTrend').textContent = totalFact > 0 ? '↑ En curso' : '—';

      // TOP — clientas que vienen más de 2 veces en el mes (frecuentes)
      apiGet('getClientasFrecuentes').then(r => {
        if (r && r.success) {
          window._clientasFrecuentes = r.clientas || [];
          document.getElementById('ownerTop').textContent = window._clientasFrecuentes.length;
        }
      }).catch(() => {});

      // Estado del salón: Esperando + En servicio (ahora) desde getListaCompleta;
      // "Atendidas" = clientas ya cobradas hoy (acumulado) desde el historial de hoy.
      if (listaResult.success) {
        const esperando  = (listaResult.esperando  || []).length;
        const enServicio = (listaResult.enServicio || []).length;
        document.getElementById('ownerEsperando').textContent = esperando;
        document.getElementById('ownerServicio').textContent  = enServicio;
      }
      document.getElementById('ownerListas').textContent = _contarAtendidasHoy(histResult);

      // Historial
      if (histResult.success && histResult.porStaff && histResult.porStaff.length > 0) {
        histContainer.innerHTML = histResult.porStaff.map((s, idx) => `
          <div style="background: var(--bg-card); border-radius: 16px; margin-bottom: 10px; overflow: hidden; box-shadow: var(--shadow-card);">
            <div onclick="toggleStaffHistorial(${idx})" style="display: flex; align-items: center; padding: 14px 16px; cursor: pointer; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--chip); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0;">${s.chica[0]}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 15px;">${s.chica}</div>
                <div style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">${s.servicios.length} servicio${s.servicios.length !== 1 ? 's' : ''} hoy</div>
              </div>
              <div style="text-align: right; margin-right: 8px;">
                <div style="font-size: 18px; font-weight: 800; color: var(--ink);">$${Math.round(Number(s.totalFacturado || 0))}</div>
                <div style="font-size: 11px; color: var(--success);">+$${Math.round(Number(s.totalComision || 0))} com.</div>
              </div>
              <div id="arrow-${idx}" style="color: var(--ink-faint); font-size: 12px; transition: transform 0.2s;">▼</div>
            </div>
            <div id="staff-detail-${idx}" style="display: none; border-top: 1px solid var(--line); padding: 0 16px;">
              ${s.servicios.map((sv, si) => {
                // Sanitizar servicio: si es JSON crudo, extraer nombre legible
                let svcDisplay = sv.servicio || '';
                if (svcDisplay.trim().startsWith('[') || svcDisplay.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(svcDisplay);
                    if (Array.isArray(parsed)) svcDisplay = parsed.map(p => p.servicio || p.area || '').join(' + ');
                    else svcDisplay = parsed.servicio || parsed.nombre || svcDisplay;
                  } catch(e) { svcDisplay = svcDisplay.substring(0, 40); }
                }
                const svSafe = encodeURIComponent(JSON.stringify({...sv, servicio: svcDisplay}));
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; ${si < s.servicios.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
                  <div style="flex:1;">
                    <div style="font-size: 13px; font-weight: 600;">${sv.cliente}</div>
                    <div style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">${svcDisplay} · ${sv.hora}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size: 15px; font-weight: 700; color: var(--accent-deep);">$${Math.round(Number(sv.precio || 0))}</div>
                    <button onclick="confirmarEliminarOwner('${svSafe}')" style="background:none;border:1.5px solid var(--danger);color:var(--danger);border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:13px;flex-shrink:0;">🗑</button>
                  </div>
                </div>`;
              }).join('')}
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid var(--line); margin-top: 2px;">
                <div style="font-size: 12px; font-weight: 700; color: var(--ink-soft);">TOTAL</div>
                <div style="font-size: 16px; font-weight: 800;">$${Math.round(Number(s.totalFacturado || 0))}</div>
              </div>
            </div>
          </div>
        `).join('');

        // Sección separada de ventas de productos
        if (histResult.ventasProductos && histResult.ventasProductos.length > 0) {
          histContainer.innerHTML += `
            <div style="background:var(--bg-card);border-radius:16px;margin-bottom:10px;overflow:hidden;box-shadow:var(--shadow-card);border-left:4px solid var(--accent);">
              <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
                style="display:flex;align-items:center;padding:14px 16px;cursor:pointer;gap:12px;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🛍</div>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:15px;">Venta de productos</div>
                  <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${histResult.ventasProductos.length} venta${histResult.ventasProductos.length!==1?'s':''} hoy · Sin comisión</div>
                </div>
                <div style="text-align:right;margin-right:8px;">
                  <div style="font-size:18px;font-weight:800;color:var(--accent-deep);">$${Math.round(Number(histResult.totalProductos||0))}</div>
                  <div style="font-size:11px;color:var(--ink-faint);">100% local</div>
                </div>
                <div style="color:var(--ink-faint);font-size:12px;">▼</div>
              </div>
              <div style="display:none;border-top:1px solid var(--line);padding:0 16px;">
                ${histResult.ventasProductos.map((p,pi)=>`
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${pi<histResult.ventasProductos.length-1?'border-bottom:1px solid var(--line);':''}">
                    <div>
                      <div style="font-size:13px;font-weight:600;">${p.cliente||'Clienta'}</div>
                      <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${(p.producto||'').replace('🛍 ','')} · ${p.hora}</div>
                    </div>
                    <div style="font-size:15px;font-weight:700;color:var(--accent-deep);">$${Math.round(Number(p.precio||0))}</div>
                  </div>
                `).join('')}
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--line);margin-top:2px;">
                  <div style="font-size:12px;font-weight:700;color:var(--ink-soft);">TOTAL PRODUCTOS</div>
                  <div style="font-size:16px;font-weight:800;color:var(--accent-deep);">$${Math.round(Number(histResult.totalProductos||0))}</div>
                </div>
              </div>
            </div>
          `;
        }
      } else {
        histContainer.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">Sin servicios registrados hoy</div>';
      }
    } catch (err) {
      console.error('Error cargando owner home:', err);
      const _errContainer = document.getElementById('ownerHistorial');
      if (_errContainer) {
        _errContainer.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--ink-faint);font-size:13px;">⚠️ Error al cargar datos. Recargá la página.</div>';
      }
    }
  }

  function confirmarEliminarOwner(svJson) {
    let sv;
    try { sv = JSON.parse(decodeURIComponent(svJson)); } catch(e) { return; }
    const msg = `¿Eliminar este registro?\n\n• Cliente: ${sv.cliente}\n• Servicio: ${sv.servicio}\n• Monto: $${sv.precio}\n\nEsto revertirá la comisión y eliminará el registro. No se puede deshacer.`;
    if (!confirm(msg)) return;
    eliminarServicio({
      nombre:   sv.cliente || sv.nombre || '',
      servicio: sv.servicio || '',
      chica:    sv.staff || sv.chica || '',
      precio:   Number(sv.precio || 0),
      comision: Number(sv.comision || 0),
      fecha:    sv.fecha || '',
      hora:     sv.hora || ''
    });
  }

  function toggleStaffHistorial(idx) {
    const detail = document.getElementById('staff-detail-' + idx);
    const arrow = document.getElementById('arrow-' + idx);
    if (!detail) return;
    const isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  }

  // ============================================
  // UTILITY: Client Key Normalization
  // ============================================
  // ============================================
  // HELPER: calcular precio de promo para un staff según su área
  // Si el staff puede hacer TODAS las partes de la promo, recibe el total completo
  // Si solo puede hacer algunas partes, recibe la suma de esas partes
  // ============================================
  // Áreas de la promo que NO puede hacer esta staff (las que hay que asignar a otra chica)
  // Categoría de un área (cejas/pestanas/facial) para mandar la división al backend.
  function _promoCatDe(areaTxt) {
    const a = String(areaTxt || '').toLowerCase();
    const MAP = {
      'pestanas': ['pestanas','pestañas','pestaña','volumen','pelo a pelo','efecto','clasicas','clásicas','natural','hawaiano','aura','brasil'],
      'facial':   ['facial','hidra','limpieza'],
      'cejas':    ['cejas','depilacion','bigote','depil','ceja','pigment','brow','retiro','lifting']
    };
    for (const cat of ['pestanas','facial','cejas']) {
      if (MAP[cat].some(k => a.includes(k))) return cat;
    }
    return 'cejas';
  }

  function getOtherPromoAreas(promo, myArea) {
    if (!promo || !Array.isArray(promo.division)) return [];
    const AREA_FILTER_MAP = {
      'cejas':    ['cejas', 'depilacion', 'bigote', 'depil', 'ceja', 'pigment', 'brow'],
      'pestanas': ['pestanas', 'pestañas', 'pestaña', 'lifting', 'volumen', 'retiro_lifting', 'retiro',
                   'pelo a pelo', 'efecto', 'clasicas', 'clásicas', 'natural', 'hawaiano', 'aura', 'brasil'],
      'facial':   ['facial', 'hidra', 'limpieza']
    };
    const myCaps = AREA_FILTER_MAP[myArea] || [myArea];
    function catDe(areaTxt) {
      const a = String(areaTxt || '').toLowerCase();
      for (const cat of Object.keys(AREA_FILTER_MAP)) {
        if (AREA_FILTER_MAP[cat].some(k => a.includes(k))) return cat;
      }
      return '';
    }
    const otras = [];
    promo.division.forEach(d => {
      const a = String(d.area || '').toLowerCase();
      const esMia = myCaps.some(c => a.includes(c.toLowerCase()));
      if (!esMia) {
        const cat = catDe(d.area);
        if (cat && cat !== myArea && otras.indexOf(cat) === -1) otras.push(cat);
      }
    });
    return otras;
  }

  function getMyPromoPrice(promo, myArea, completedAreas) {
    if (!promo || !promo.division || promo.division.length === 0) return promo ? promo.price : 0;

    const AREA_FILTER_MAP = {
      // cejas hace cejas, depilación y pigmentación. NO hace retiro/lifting de pestañas.
      'cejas':    ['cejas', 'depilacion', 'bigote', 'depil', 'ceja', 'pigment', 'brow'],
      'pestanas': ['pestanas', 'pestañas', 'pestaña', 'lifting', 'volumen', 'retiro_lifting', 'retiro',
                   'pelo a pelo', 'efecto', 'clasicas', 'clásicas', 'natural', 'hawaiano', 'aura'],
      'facial':   ['facial', 'hidra', 'limpieza']
    };
    const myCapabilities = AREA_FILTER_MAP[myArea] || [myArea];

    // Excluir divisiones ya completadas por otra staff (promo compartida)
    const areasCompletadasNorm = (completedAreas || []).map(a =>
      String(a).toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const divisionesDisponibles = promo.division.filter(d => {
      const areaDNorm = String(d.area || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      // Si esta área ya fue completada → excluirla
      return !areasCompletadasNorm.some(comp =>
        areaDNorm.includes(comp) || comp.includes(areaDNorm) ||
        (comp.includes('pest') && (areaDNorm.includes('pest') || areaDNorm.includes('lifting'))) ||
        (comp.includes('ceja') && areaDNorm.includes('ceja'))
      );
    });

    // De las disponibles, las que puede hacer esta staff
    const misPartes = divisionesDisponibles.filter(d => {
      const areaD = String(d.area || '').toLowerCase();
      return myCapabilities.some(cap => areaD.includes(cap.toLowerCase()));
    });

    if (misPartes.length === 0) {
      // Todas sus partes ya fueron completadas — precio residual o 0
      return divisionesDisponibles.length > 0
        ? divisionesDisponibles.reduce((s,d) => s + Number(d.monto||0), 0)
        : 0;
    }

    // Si puede hacer TODAS las disponibles → precio de esas divisiones (no el total)
    if (misPartes.length === divisionesDisponibles.length && divisionesDisponibles.length === promo.division.length) {
      return promo.price; // nadie completó nada → precio total
    }

    // Suma de sus partes disponibles
    return misPartes.reduce((s, d) => s + Number(d.monto || 0), 0);
  }

  // Actualiza los botones de finalización según si hay promo multi-área activa
  function updateFinishButtons(slot) {
    const slot1 = slot === 1 || !slot;
    const btnContainer = document.getElementById('as' + (slot1?1:2) + 'FinishBtns');
    if (!btnContainer) return;

    const clientName = document.getElementById('as' + (slot1?1:2) + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey = normalizeClientKey(clientName);
    const promoData = activePromos[clientKey];
    const user = window.currentUser;
    const myArea = user?.area || 'cejas';

    // ── TICKET MULTI ─────────────────────────────────────────
    const _idEsperaSlot = slot1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');

    // SP- con promo → si hay servicios de OTRA área en el slot, ofrecer pasarlos a otra staff
    if (_idEsperaSlot.startsWith('SP-')) {
      const _slotSP = slot1 ? 1 : 2;
      const _myAreaSP = user?.area || 'cejas';
      const _svcsSP = (slotServices[_slotSP] || []).filter(s =>
        s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
      const _otrasSP = _svcsSP.filter(s => !window.esMismaAreaM3(_myAreaSP, s.area || s.name));
      if (_otrasSP.length > 0) {
        const _nombresSP = _otrasSP.map(s => s.name).join(', ');
        btnContainer.innerHTML =
          '<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);font-size:13px;padding:15px;" onclick="finalizarYPasarOtraArea(' + _slotSP + ')">✅ Terminé mi parte — enviar ' + _nombresSP + ' a otra staff</button>'
          + '<button class="btn-primary outline" style="margin-bottom:10px;font-size:13px;" onclick="finalizarServicioSP(' + _slotSP + ')">💰 Lo hice todo yo — cobrar todo</button>';
        return;
      }
      btnContainer.innerHTML = `
        <button class="btn-primary" style="margin-bottom:10px;background:var(--success);font-size:14px;padding:16px;" onclick="finalizarServicioSP(${_slotSP})">
          ✅ Terminé — enviar a cobro con Mikaela
        </button>`;
      return;
    }

    if (_idEsperaSlot.startsWith('TM-')) {
      apiGet('getTicketMulti').then(function(tmData) {
        if (!tmData.success) return;
        var tm = (tmData.activos || []).find(function(t) { return t.idEspera === _idEsperaSlot; });
        if (!tm) return;
        var miNombre = user && user.name ? user.name : '';
        var slotN = slot1 ? 1 : 2;

        // Áreas pendientes (no completadas, no en servicio por esta staff)
        // Filtro tolerante: acepta 'esperando', 'En espera', variantes con espacios.
        var areasEsperando = (tm.areas || []).filter(function(a) {
          var e = String(a.estado||'').trim().toLowerCase();
          return e === 'esperando' || e === 'en espera' || e === 'en_espera';
        });
        var sig = areasEsperando.length > 0 ? areasEsperando[0] : null;
        var hayMas = areasEsperando.length > 0;

        var lbl = sig ? (sig.tentativo || sig.area || 'siguiente servicio') : 'siguiente servicio';

        if (!hayMas) {
          btnContainer.innerHTML = '<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);font-size:14px;padding:16px;" onclick="window._finishingSlot=' + slotN + '; completarAreaMultiFinal();">✅ Terminé mi parte — clienta multi-servicio a cobro</button>';
        } else {
          // ── MANDAMIENTO #6: si el área actual tiene promo, ofrecer tomar precio completo ──
          var miAreaTM = (tm.areas || []).find(function(a) { return String(a.estado||'').toLowerCase() === 'en servicio'; });
          var miPrecioNormalTM = miAreaTM ? Number(miAreaTM.precioNormal || miAreaTM.precio || 0) : 0;
          var miPrecioPromoTM  = miAreaTM ? Number(miAreaTM.precio || 0) : 0;
          var tienePromoEnTM   = miPrecioNormalTM > miPrecioPromoTM && miPrecioPromoTM > 0;
          // Valor COMPLETO de la promo = suma de TODAS las áreas a precio promo (no canceladas)
          var totalPromoComboTM = (tm.areas || []).reduce(function(s, a){
            if (!a || String(a.estado||'').toLowerCase() === 'cancelado') return s;
            return s + Number(a.precio || 0);
          }, 0);

          // ── 3 botones conector de capa (diagrama TM) ──────────────────────────
          // BTN A: yo sigo con el siguiente servicio del TM
          // BTN B: el siguiente servicio va a otra staff de la misma área
          // BTN C: terminé todo lo mío — enviar a cobro con Mikaela ahora
          var btnsBaseTM = ''
            + '<button style="margin-bottom:8px;width:100%;padding:14px;background:var(--ink);border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;" onclick="window._finishingSlot=' + slotN + '; completarYTomarSiguiente();">Yo sigo — tomar ahora: ' + lbl + '</button>'
            + '<button style="margin-bottom:8px;width:100%;padding:14px;background:var(--accent);border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;" onclick="window._finishingSlot=' + slotN + '; completarAreaMulti();">Pasar ' + lbl + ' a otra staff (queda en espera)</button>'
            + '<button style="margin-bottom:8px;width:100%;padding:14px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;" onclick="window._finishingSlot=' + slotN + '; completarAreaMultiFinal();">✅ Terminé todo mi trabajo — enviar a cobro con Mikaela</button>';
          // ── REGLA IRREVOCABLE: el botón "Cobrar promo completa" es EXCLUSIVO de la
          // staff de PESTAÑAS y SOLO para la promo "pestañas + depilación de cejas"
          // (la clienta paga la promo completa pero solo se hace las pestañas).
          // NUNCA se muestra para staff de depilación/cejas ni para ningún otro combo.
          var _areaStaffTM    = String(user && user.area || '').toLowerCase();
          var _staffEsPestanas = _areaStaffTM.indexOf('pesta') >= 0;
          var _areasComboTM   = (tm.areas || []).map(function(a){ return String(a.area || a.tentativo || '').toLowerCase(); });
          var _comboTienePestanas = _areasComboTM.some(function(n){ return n.indexOf('pesta') >= 0; });
          var _comboTieneCejas    = _areasComboTM.some(function(n){ return n.indexOf('cej') >= 0; });
          if (tienePromoEnTM && _staffEsPestanas && _comboTienePestanas && _comboTieneCejas) {
            btnsBaseTM = '<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#7b2d8b,#5a1f6e);" onclick="window._finishingSlot=' + slotN + '; cobrarPromoCompletaTM(' + slotN + ')">🎁 Cobrar promo completa — todo el valor a mi nombre ($' + Number(totalPromoComboTM).toFixed(2) + ')</button>'
              + btnsBaseTM;
          }
          btnContainer.innerHTML = btnsBaseTM;
        }
      }).catch(function() {
        var slotN = slot1 ? 1 : 2;
        btnContainer.innerHTML = '<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#2d6a4f,#1a4a32);" onclick="window._finishingSlot=' + slotN + '; completarAreaMultiFinal()">✅ Terminé mi parte — clienta multi-servicio a cobro</button>';
      });
      return;
    }
    // ── FIN TICKET MULTI ─────────────────────────────────────

    if (!promoData || !promoData.promo) {
      // Sin promo — botón directo sin abrir modal de opciones
      const _slotNP = slot1 ? 1 : 2;
      btnContainer.innerHTML = `
        <button class="btn-primary" style="margin-bottom:10px;background:var(--ink);color:white;font-size:14px;padding:16px;"
          onclick="prepararYFinalizar(${_slotNP})">
          Finalizar servicio
        </button>`;
      return;
    }

    // Si el ticket es SN- (normal), botón directo — no pasar por finishSlot1 que requiere promoData
    if (_idEsperaSlot.startsWith('SN-')) {
      const _slotSN = slot1 ? 1 : 2;
      btnContainer.innerHTML = `
        <button class="btn-primary" style="margin-bottom:10px;background:var(--ink);color:white;font-size:14px;padding:16px;"
          onclick="prepararYFinalizar(${_slotSN})">
          Finalizar servicio
        </button>`;
      return;
    }

    // Con promo multi-área — verificar si puede hacer todo sola
    const AREA_CAPS = {
      // Cejas staff (María, Keyla, Lesly) también hacen pestañas/lifting/retiro
      // CEJAS hace: cejas, depilaciones + los 3 compartidos (lifting de pestañas,
      // retiro de pestañas, retiro de lifting). NO hace extensiones de pestañas.
      'cejas':    ['cejas', 'depilacion', 'bigote', 'depil', 'ceja', 'pigment', 'brow',
                   'lifting de pestañas', 'retiro de pestañas', 'retiro de lifting',
                   'retiro lifting', 'retiro_lifting', 'lifting', 'retiro'],
      'pestanas': ['pestanas', 'pestañas', 'pestaña', 'lifting', 'retiro', 'volumen', 'pelo a pelo',
                   'efecto aura', 'efecto muñeca', 'clasicas', 'clásicas', 'natural'],
      'facial':   ['facial', 'hidra', 'limpieza']
    };
    const myCaps = AREA_CAPS[myArea] || [myArea];
    const promo = promoData.promo;
    const puedeTodo = promo.division && promo.division.length > 0 &&
      promo.division.every(d => {
        // division.area puede tener emojis: '👁 Pestañas' → normalizar
        const dArea = String(d.area||'').toLowerCase().replace(/[^\w\s]/gi,' ').trim();
        const dSvc  = String(d.servicio||d.service||'').toLowerCase();
        const dRealArea = String(d.realArea||'').toLowerCase();
        return myCaps.some(cap => dArea.includes(cap) || dSvc.includes(cap) || dRealArea.includes(cap));
      });

    // promasExtraPendientes: 2da/3ra promo independiente del ticket (si las hay)
    const promasExtraPendientes = (window._takingPromasExtra || []).filter(p => p && p.nombre);
    // slotActual: funciona tanto en updateFinishButtons (donde slot1 existe) como en finishSlot1
    const slotActual = (typeof slot1 !== 'undefined') ? (slot1 ? 1 : 2) : 1;

    // FIX: si la promo tiene solo 1 división (servicio de una sola área),
    // mostrar "Finalizar servicio" normal, no el botón de combo multi-área
    const esPromoMultiArea = promo.division && promo.division.length > 1;

    let html = '';
    if (!esPromoMultiArea) {
      // Promo de 1 sola área. Si hay otra promo pendiente del combo → ofrecer "Yo sigo".
      if (promasExtraPendientes.length > 0) {
        const sigNombre = promasExtraPendientes[0].nombre || 'siguiente servicio';
        html += `<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#1a6b4a,#0f4a33);" onclick="window._finishingSlot=${slotActual}; finishAndNextPromo()">🏁 Lista mi promo — Yo sigo: ${sigNombre}</button>`;
        html += `<button class="btn-primary outline" style="margin-bottom:10px;" onclick="window._finishingSlot=${slotActual}; finishAndSendAll()">💰 Cobrar todo ahora (sin siguiente)</button>`;
      } else {
        html += `<button class="btn-primary" style="margin-bottom:10px;background:var(--success);" onclick="window._finishingSlot=${slotActual}; finishAndSendAll()">✅ Finalizar servicio — mandar a cobrar</button>`;
      }
    } else if (puedeTodo) {
      if (promasExtraPendientes.length > 0) {
        // Hay otra promo independiente pendiente
        const sigNombre = promasExtraPendientes[0].nombre || 'siguiente servicio';
        html += `<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#1a6b4a,#0f4a33);" onclick="window._finishingSlot=${slotActual}; finishAndNextPromo()">🏁 Lista mi promo — continuar siguiente: ${sigNombre}</button>`;
        html += `<button class="btn-primary outline" style="margin-bottom:10px;" onclick="window._finishingSlot=${slotActual}; finishAndSendAll()">💰 Cobrar todo ahora (sin siguiente promo)</button>`;
      } else {
        // Promo multi-área que esta staff puede hacer toda
        html += `<button class="btn-primary" style="margin-bottom:10px;background:var(--success);" onclick="window._finishingSlot=${slotActual}; finishAndSendAll()">✅ Terminé todo el combo — mandar a cobrar</button>`;
        html += `<button class="btn-primary outline" style="margin-bottom:10px;" onclick="finishAndContinueSameStaff()">➡️ Siguiente servicio del combo</button>`;
      }
    } else {
      // Verificar si es la última área
      const completedAreas = promoData.completedAreas || [];
      const totalAreas = promo.division ? promo.division.length : 1;
      // ROBUSTEZ congelamiento: a veces completedAreas llega vacío a la 2da staff (no se
      // propagó en la handoff). Pero las áreas que ESTA staff NO puede hacer ya las hizo
      // otra (por eso la clienta llegó a ella). Si esas cubren todas las demás áreas,
      // ella es la última aunque completedAreas esté vacío → así no se congela.
      const divisionesNoMias = (promo.division || []).filter(d => {
        const dArea = String(d.area||'').toLowerCase().replace(/[^\w\s]/gi,' ').trim();
        const dSvc  = String(d.servicio||d.service||'').toLowerCase();
        const dRealArea = String(d.realArea||'').toLowerCase();
        return !myCaps.some(cap => dArea.includes(cap) || dSvc.includes(cap) || dRealArea.includes(cap));
      }).length;
      const esUltimaArea = completedAreas.length >= totalAreas - 1 || divisionesNoMias >= totalAreas - 1;

      if (esUltimaArea) {
        // Última área — promo completada
        html += `
          <button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,var(--accent),var(--accent-deep));" onclick="window._finishingSlot=${slot1?1:2}; finishAndSendAll()">
            🏁 Promo completada — cobrar total
          </button>`;
      } else {
        // Todavía falta otra área del combo
        html += `<button class="btn-primary" style="margin-bottom:10px;" onclick="finishSlotAndContinue(${slotActual})">➡️ Continuar siguiente área</button>`;
      }
      // REGLA IRREVOCABLE: "Cobrar promo completa" solo para staff de PESTAÑAS (ver bloque TM).
      if (String((window.currentUser && window.currentUser.area) || '').toLowerCase().indexOf('pesta') >= 0) {
        html += `<button class="btn-primary" style="margin-bottom:10px;background:linear-gradient(135deg,#7b2d8b,#5a1f6e);" onclick="cobrarPromoCompleta(${slotActual})">🎁 Cobrar promo completa ($${Number(promo.price || 0)})</button>`;
      }
      html += `<button class="btn-primary outline" style="margin-bottom:10px;" onclick="finishAndSend()">💰 Mandar a cobrar (solo mi parte)</button>`;
    }
    btnContainer.innerHTML = html;
  }

  // Staff hizo su parte de la promo y el siguiente servicio va a otra staff
  // Congela lo realizado, manda el siguiente área a lista de espera
  async function compartirSiguienteServicio() {
    const slot = window._finishingSlot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    const data = window._finishingData;
    const clientKey = data?.clientKey || '';
    const promoData = activePromos[clientKey];

    if (!promoData) {
      // Sin promo activa — usar finishAndContinue normal
      await finishAndContinue();
      return;
    }

    try {
      // Determinar siguiente área y precio
      const division = promoData.promo.division || [];
      const completadas = promoData.completedAreas || [];
      const siguienteDivision = division.find(d => {
        const da = String(d.area||'').toLowerCase().replace(/[^\w\s]/gi,' ').trim();
        return !completadas.some(c => da.includes(String(c).toLowerCase()) || String(c).toLowerCase().includes(da));
      });

      const sigArea = siguienteDivision
        ? (String(siguienteDivision.area||'').toLowerCase().replace(/[^\w\s]/gi,' ').trim().includes('pest') ? 'pestanas'
          : String(siguienteDivision.area||'').toLowerCase().includes('facial') ? 'facial'
          : String(siguienteDivision.area||'').toLowerCase().includes('depil') ? 'depilacion'
          : 'cejas')
        : (data.areasExtras && data.areasExtras[0]) || 'cejas';
      const sigPrecio = siguienteDivision ? Number(siguienteDivision.monto || 0) : 0;
      const sigNombre = siguienteDivision
        ? String(siguienteDivision.area||'').replace(/[^\w\sáéíóúñü]/gi,'').trim()
        : sigArea;

      // Llamar continuarPromoALista — mismo flujo que "Siguiente servicio del combo"
      const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
      const clientCodigo = window['_as' + slot + 'Client'] || '';
      const svcs = (slotServices[slot] || []).filter(s => s.status !== 'rechazado');
      const miTotal = svcs.reduce((s,v) => s + Number(v.price||0), 0);
      const miSvcNames = svcs.map(s => s.name).join(' + ') || data.svcNames || '';

      // Obtener nombre del servicio realizado para guardarlo en serviciosDetalle
      const svcNombreFinal = svcs.map(s => s.name).join(' + ') || miSvcNames || (user?.area || 'Servicio');
      const result = await apiPost('continuarPromoALista', {
        idEspera,
        chicaNombre: user?.name || '',
        areaCompletada: user?.area || 'cejas',
        servicioNombre: svcNombreFinal,
        montoChica: miTotal,
        clienteCodigo: clientCodigo,
        clienteNombre: data.clientName,
        siguienteArea: sigArea,
        montoSiguiente: sigPrecio,
        promoNombre: promoData.promo.name,
        serviciosDetalle: JSON.stringify([{
          staff: user?.name || '',
          servicio: miSvcNames,
          area: user?.area || 'cejas',
          monto: miTotal
        }])
      });

      if (result && result.success) {
        // Limpiar slot
        delete activePromos[clientKey];
        slotServices[slot] = [];
        window['_as' + slot + 'IdEspera'] = '';
        if (user && activeClients[user?.name]) {
          activeClients[user.name].splice(slot - 1, 1);
          updateCapacityUI(user.name);
        }
        show('staffHome');
        await new Promise(r => setTimeout(r, 300));
        loadStaffHome();
        showToast('✅ Tu parte ($' + miTotal + ') registrada · ' + sigNombre + ' vuelve a lista de espera');
      } else {
        alert('Error: ' + (result?.message || 'desconocido'));
      }
    } catch(e) {
      alert('Error de conexión: ' + e.message);
    }
  }

  // Cuando la staff hizo su parte (1er servicio) y el resto va a otra staff
  async function finishAndSendPartial() {
    closeModal();
    const slot = window._finishingSlot || 1;
    const user = window.currentUser;
    const data = window._finishingData;
    const svcs = slotServices[slot] || [];
    const svcsAprobados = svcs.filter(s => s.status !== 'rechazado');

    if (svcsAprobados.length < 2) {
      // Solo 1 servicio — finalizar normal
      await finishAndSend();
      return;
    }

    // Mi servicio = el primero
    const miServicio = svcsAprobados[0];
    // Servicios restantes = los demás
    const serviciosRestantes = svcsAprobados.slice(1);

    try {
      // 1. Finalizar mi parte (primer servicio)
      const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
      const miTotal = Number(miServicio.price || 0);
      const desgloseMio = [{ staff: user?.name || '', servicio: miServicio.name, area: miServicio.area || user?.area || '', monto: miTotal }];

      await apiPost('finalizarAtencion', {
        idEspera,
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        clienteCodigo: window['_as' + slot + 'Client'] || '',
        servicio: miServicio.name,
        total: String(miTotal),
        serviciosDetalle: desgloseMio
      });

      // 2. Crear nuevo ticket SN para los servicios restantes
      const clientCodigo = window['_as' + slot + 'Client'] || '';
      const nombresRest = serviciosRestantes.map(s => s.name).join(' + ');
      const precioRest = serviciosRestantes.reduce((s, v) => s + Number(v.price || 0), 0);
      const areaRest = serviciosRestantes[0].area || user?.area || 'cejas';

      await apiPost('addServicioNormal', {
        codigo: clientCodigo,
        nombre: data.clientName,
        servicio: nombresRest,
        area: areaRest,
        precio: precioRest,
        prioridad: 'Normal',
        observaciones: 'Continuación de ticket — ' + (user?.name || '') + ' terminó su parte'
      });

      // 3. Limpiar slot
      slotServices[slot] = [];
      window['_as' + slot + 'IdEspera'] = '';
      delete activePromos[normalizeClientKey(data.clientName)];
      if (user && activeClients[user?.name]) {
        activeClients[user.name].splice(slot - 1, 1);
        updateCapacityUI(user.name);
      }

      show('staffHome');
      await new Promise(r => setTimeout(r, 300));
      loadStaffHome();
      showToast('✅ Tu parte registrada · ' + nombresRest + ' vuelve a lista de espera');
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  async function finishAndContinueSameStaff() {
    // La misma staff continúa con el siguiente servicio del combo
    // Solo registra que terminó esa parte y actualiza el total
    const slot = 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    const clientName = document.getElementById('as1Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey = normalizeClientKey(clientName);
    const promoData = activePromos[clientKey];

    if (!promoData) { await finishAndSend(); return; }

    // Notificar a Mikaela que sigue en proceso
    showToast('✓ Parte completada — continuando con el combo...');

    // El total final se registrará al mandar a cobrar con el precio completo
    // Por ahora solo limpiar los servicios del slot para agregar el siguiente
    slotServices[slot] = [];
    renderServicesForSlot(slot);
    document.getElementById('as1Total').textContent = '$0';
    document.getElementById('as1SvcCount').textContent = '0';

    // Actualizar botones de vuelta al estado normal para agregar siguiente servicio
    updateFinishButtons(slot);
  }

  // Persistir activePromos en sessionStorage para sobrevivir recargas
  function saveActivePromos() {
    try {
      const data = {};
      Object.keys(activePromos).forEach(k => {
        const p = activePromos[k];
        if (p && p.promo) {
          data[k] = { promoName: p.promo.name, startedBy: p.startedBy, completedAreas: p.completedAreas || [], _metadata: p._metadata };
        }
      });
      localStorage.setItem('nexserv_activePromos', JSON.stringify(data));
    } catch(e) {}
  }

  function restoreActivePromos() {
    try {
      const raw = localStorage.getItem('nexserv_activePromos');
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.keys(data).forEach(k => {
        if (activePromos[k]) return; // ya existe
        const promoFull = PROMOS.find(p => p.name === data[k].promoName);
        if (promoFull) {
          activePromos[k] = {
            promo: promoFull,
            startedBy: data[k].startedBy || 'cejas',
            completedAreas: data[k].completedAreas || [],
            _metadata: data[k]._metadata || {}
          };
        }
      });
    } catch(e) {}
  }

  async function devolverALista(slot) {
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    if (!clientName) return;
    if (!confirm('¿Devolver a ' + clientName + ' a la lista de espera para que otra staff la tome?')) return;
    try {
      const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;
      const result = await apiPost('devolverALista', {
        idEspera: idEspera || '',
        clienteNombre: clientName,
        chicaNombre: window.currentUser?.name || ''
      });
      if (!result || !result.success) {
        alert('No se pudo devolver a la lista: ' + ((result && result.message) || 'intentá de nuevo.'));
        return;
      }
      // Limpiar slot SOLO si el backend confirmó
      slotServices[slot] = [];
      if (window.currentUser && activeClients[window.currentUser.name]) {
        activeClients[window.currentUser.name] = activeClients[window.currentUser.name].filter((_, i) => i !== slot - 1);
      }
      show('staffHome');
      showToast('↩️ ' + clienteDisplay(clientName, window['_as' + slot + 'Client']) + ' devuelta a la lista de espera');
    } catch(e) {
      alert('Error al devolver a lista. Revisá tu conexión e intentá de nuevo.');
    }
  }

  function normalizeClientKey(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[⭐]/g, '');
  }

  async function renderTableroLineas() {
    const cont = document.getElementById('tabLineasContenido');
    const fechaEl = document.getElementById('tabLineasFecha');
    if (!cont) return;
    try {
      const r = await apiGet('getTableroLineas');
      if (!r || !r.success) { cont.innerHTML = '<div style="text-align:center;color:var(--danger);padding:30px;font-size:13px;">No se pudo cargar el tablero.</div>'; return; }
      if (fechaEl) fechaEl.textContent = r.fecha || '';
      const todas = [].concat(r.en_servicio||[], r.cola||[], r.completado||[], r.cobrado||[]);
      if (todas.length === 0) { cont.innerHTML = '<div style="text-align:center;color:var(--ink-faint);padding:30px;font-size:13px;">No hay servicios hoy todavía.</div>'; return; }
      const colorEstado = function(e){
        if (e === 'en_servicio') return 'var(--success)';
        if (e === 'esperando')   return 'var(--warning)';
        if (e === 'completado')  return '#3b82f6';
        if (e === 'cobrado')     return 'var(--ink-faint)';
        return 'var(--line)';
      };
      const etiqueta = function(e){
        return e === 'en_servicio' ? 'En servicio' : e === 'esperando' ? 'En espera' : e === 'completado' ? 'Terminado' : e === 'cobrado' ? 'Cobrado' : e;
      };
      const rank = function(e){ return e === 'en_servicio' ? 0 : e === 'esperando' ? 1 : e === 'completado' ? 2 : 3; };
      // Agrupar por visita (clienta)
      const grupos = {}; const orden = [];
      todas.forEach(function(l){
        const k = l.visita || l.codigo || l.id;
        if (!grupos[k]) { grupos[k] = { cliente: l.cliente, codigo: l.codigo, lineas: [] }; orden.push(k); }
        grupos[k].lineas.push(l);
      });
      // Ordenar grupos por el estado "más activo" que tengan
      orden.sort(function(a,b){
        const ra = Math.min.apply(null, grupos[a].lineas.map(function(l){return rank(l.estado);}));
        const rb = Math.min.apply(null, grupos[b].lineas.map(function(l){return rank(l.estado);}));
        return ra - rb;
      });
      cont.innerHTML = orden.map(function(k){
        const g = grupos[k];
        const total = g.lineas.reduce(function(s,l){ return s + (Number(l.monto)||0); }, 0);
        const totalReg = g.lineas.reduce(function(s,l){ return s + (Number(l.montoRegular)||0); }, 0);
        const totalHtml = (totalReg && Math.abs(totalReg - total) > 0.01)
          ? '<div style="text-align:right;"><div style="font-weight:800;font-size:14px;">$'+total+'</div>'
            + '<div style="font-size:10px;color:var(--ink-faint);font-weight:600;">reg $'+(Math.round(totalReg*100)/100)+'</div></div>'
          : '<div style="font-weight:800;font-size:14px;">$'+total+'</div>';
        const filas = g.lineas.map(function(l){
          const col = colorEstado(l.estado);
          const _reg = Number(l.montoRegular)||0; const _m = Number(l.monto)||0;
          const _regChip = (_reg && Math.abs(_reg - _m) > 0.01) ? ' <span style="font-size:10px;color:var(--ink-faint);font-weight:600;">(reg $'+(Math.round(_reg*100)/100)+')</span>' : '';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-left:4px solid '+col+';background:var(--bg-card);border-radius:8px;margin-top:6px;">'
            + '<div><div style="font-size:13px;font-weight:700;">'+(l.servicio||'')+'</div>'
            + '<div style="font-size:11px;color:var(--ink-soft);">'+(l.area||'')+(l.staff?' · '+l.staff:'')+'</div></div>'
            + '<div style="text-align:right;"><div style="font-size:13px;font-weight:800;">$'+_m+_regChip+'</div>'
            + '<div style="font-size:10px;font-weight:700;color:'+col+';">'+etiqueta(l.estado)+'</div></div></div>';
        }).join('');
        return '<div style="background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<div style="font-weight:800;font-size:15px;">'+(g.cliente||'Clienta')+' <span style="font-size:11px;color:var(--ink-faint);font-weight:600;">'+(g.codigo||'')+'</span></div>'
          + totalHtml + '</div>'
          + filas + '</div>';
      }).join('');
    } catch(e) {
      cont.innerHTML = '<div style="text-align:center;color:var(--danger);padding:30px;font-size:13px;">Error: '+(e && e.message ? e.message : e)+'</div>';
    }
  }
  window.renderTableroLineas = renderTableroLineas;


// ── Lógica principal (parte 2: módulos de negocio) ──

  // Restaura servicios NORMALES (no promo, no TM) desde el backend cuando el slot
  // quedó vacío (ej. tras refrescar la PWA). No pisa lo que ya hay en memoria, así
  // los servicios permanecen visibles hasta que la staff toque un botón de acción.
  async function restaurarServiciosNormalesSlot(slot) {
    try {
      const user = window.currentUser;
      if (!user) return;
      if ((slotServices[slot] || []).length > 0) return; // ya hay servicios → no tocar
      const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
      if (idEspera.startsWith('TM-')) return; // TM se restaura por otra ruta
      const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || '';
      const clientKey = normalizeClientKey(clientName);
      if (activePromos[clientKey]) return; // promo se restaura por otra ruta
      const res = await apiGet('getAtenciones', { chica: user.name });
      if (!res.success || !res.atenciones || !res.atenciones.length) return;
      // Localizar la atención de este slot (por idEspera, por código, o por orden)
      let a = null;
      if (idEspera) a = res.atenciones.find(x => (x.idEspera || '') === idEspera);
      if (!a) {
        const code = slot === 1 ? window._as1Client : window._as2Client;
        if (code) a = res.atenciones.find(x => x.codigo === code);
      }
      if (!a) a = res.atenciones[slot === 1 ? 0 : 1];
      if (!a || a.promoNombre) return; // promo → otra ruta
      if (a.serviciosDetalle && a.serviciosDetalle.length > 0) {
        slotServices[slot] = a.serviciosDetalle.map(sd => ({
          name: sd.servicio || sd.nombre || sd.name || '',
          price: Number(sd.monto || sd.precio || sd.price || 0),
          area: sd.area || a.area || ''
        }));
      } else if (a.servicio && a.servicio !== '—') {
        let nom = a.servicio;
        if (String(nom).trim().startsWith('{')) { try { const p = JSON.parse(nom); nom = p.nombre || p.name || nom; } catch (e) {} }
        slotServices[slot] = [{ name: nom, price: Number(a.total || 0), area: a.area || '' }];
      } else { return; }
      renderServicesForSlot(slot);
      const total = (slotServices[slot] || []).reduce((s, v) => s + Number(v.price || 0), 0);
      const t = document.getElementById('as' + slot + 'Total'); if (t) t.textContent = '$' + total;
      const c = document.getElementById('as' + slot + 'SvcCount'); if (c) c.textContent = String((slotServices[slot] || []).length);
      updateFinishButtons(slot);
    } catch (e) { console.error('restaurarServiciosNormalesSlot error:', e); }
  }

  // Inicializar pestañas una sola vez por sesión
  let _pestanasInicializadas = false;
  async function inicializarPestanasUnaVez() {
    if (_pestanasInicializadas) return;
    _pestanasInicializadas = true;
    try { await apiGet('inicializarPestanas'); } catch(e) {}
  }

  async function doLogin() {
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value.trim();
    if (!u || !p) { alert('Ingresá usuario y contraseña'); return; }
    
    // Mostrar loading
    const btn = document.querySelector('.login-wrap .btn-primary');
    const oldText = btn.textContent;
    btn.textContent = 'Conectando...';
    btn.disabled = true;

    // Intentar login local primero (fallback), luego API
    let user = null;
    const localUser = USERS[u] || USERS[p];
    
    try {
      const result = await apiPost('login', { user: u, pass: p }, { timeoutMs: 30000, retries: 3 });
      if (result.success) {
        const r = result.user;
        const areaMap = {
          'Cejas + Depilación': 'cejas',
          'Cejas+Depilación': 'cejas',
          'Cejas + Depilacion': 'cejas',
          'Cejas': 'cejas',
          'cejas': 'cejas',
          'Depilación': 'cejas',
          'Pestañas': 'pestanas',
          'Pestanas': 'pestanas',
          'pestanas': 'pestanas',
          'Facial': 'facial',
          'facial': 'facial',
          'Todas': 'todas',
          'todas': 'todas'
        };
        const rolNorm = String(r.rol || '').trim().toLowerCase();
        const screenMap = { 'owner':'ownerHome','dueño':'ownerHome','dueno':'ownerHome','admin':'mikaelaHome','staff':'staffHome' };
        console.log('[doLogin] API ok — rol:', rolNorm, '| nombre:', r.nombre);
        user = {
          name: r.nombre,
          role: rolNorm,
          area: areaMap[r.area] || r.area || '',
          maxClients: r.maxClients || 1,
          active: r.estado !== 'Bloqueado',
          screen: screenMap[rolNorm] || 'staffHome',
          session: r.session || null
        };
      } else if (result.blocked) {
        btn.textContent = oldText; btn.disabled = false;
        show('blocked'); return;
      } else if (result.descanso) {
        btn.textContent = oldText; btn.disabled = false;
        alert(result.message || 'Estás en tu tiempo de descanso, disfrútalo en familia 💛');
        return;
      } else {
        console.warn('[doLogin] API sin success — result:', JSON.stringify(result).substring(0, 200));
        if (localUser && (localUser.pass === p || localUser.pass === u)) {
          console.log('[doLogin] Usando fallback local para:', u);
          user = localUser;
        }
      }
    } catch (err) {
      console.warn('[doLogin] Excepción en API:', err.message);
      if (localUser && (localUser.pass === p || localUser.pass === u)) {
        console.log('[doLogin] Usando fallback local (catch) para:', u);
        user = localUser;
      }
    }

    btn.textContent = oldText; btn.disabled = false;

    if (!user) { alert('Usuario o contraseña incorrectos.'); return; }
    if (!user.active) { show('blocked'); return; }

    const roleLabelEl = document.getElementById('roleLabel');
    if (roleLabelEl) roleLabelEl.textContent = 'Salir · ' + user.name;
    window.currentUser = user;
    window._session = (user && user.session) || null;
    if (window._session) { initPromoSelects(); inicializarPestanasUnaVez(); } // catálogo/selects + setup pestañas, ya con sesión
    document.body.classList.toggle('rol-staff', !!user && user.role === 'staff');
    startHeartbeat(true);
    // Persistir sesión para que sobreviva cierre de app
    try { localStorage.setItem('nexserv_session', JSON.stringify(user)); } catch(e) {}
    // Registrar token de notificaciones de forma confiable tras cada login
    if (typeof suscribirPushActual === 'function') {
      window._pushSuscrito = false;
      setTimeout(suscribirPushActual, 1500);
    }

    if (user.role === 'staff') {
      document.getElementById('staffName').textContent = user.name;
      document.getElementById('staffAvatar').textContent = user.name[0];
      document.getElementById('waitListAvatar').textContent = user.name[0];
      
      // Resetear activeService
      window._as1Client = null;
      document.getElementById('retiroToggle1').style.display = 'none';
      document.getElementById('pestFichaQuick1').style.display = 'none';
      document.getElementById('pestFichaQuick1').innerHTML = '';
      
      const areaLabel = user.area === 'cejas' ? 'Cejas · Depilación · Lifting/Retiros' :
                        user.area === 'pestanas' ? 'Pestañas' :
                        user.area === 'facial' ? 'Facial' : '';
      document.getElementById('waitListRole').textContent = areaLabel;
      const allowed = AREA_FILTER[user.area] || [];
      // MODELO CENTRALIZADO: contar solo las asignadas a esta staff (igual que la lista)
      const myCount = WAITLIST.filter(w => {
        const est = String(w.estado || w.status || '').toLowerCase();
        if (est === 'en servicio' || est === 'completada') return false;
        const quien = (w.asignadaA && String(w.asignadaA).trim()) || (w.tomadaPor && String(w.tomadaPor).trim()) || ''; return quien !== '' && quien === user.name;
      }).length;
      document.getElementById('navBadge').textContent = myCount;
      document.getElementById('navBadge2').textContent = myCount;
      document.getElementById('pendingStat').querySelector('.value').textContent = myCount;
      
      // Doble atención: solo cejas
      const dualEl = document.getElementById('dualCapacity');
      if (user.maxClients === 2) {
        dualEl.style.display = 'block';
        activeClients[user.name] = [];
        updateCapacityUI(user.name);
      } else {
        dualEl.style.display = 'none';
      }

      // Cargar atenciones activas desde el Sheet
      try {
        const atenResult = await apiGet('getAtenciones', { chica: user.name });
        if (atenResult.success && atenResult.atenciones && atenResult.atenciones.length > 0) {
          const aten = atenResult.atenciones;
          
          // Primera atención activa
          const a1 = aten[0];
          window._as1Client = a1.codigo;
          window._as1IdEspera = a1.idEspera || ''; // ID del ticket LE-XXXX
          const initials1 = (a1.nombre || '').split(' ').map(n=>n[0]).join('').slice(0,2);
          const _as1av = document.getElementById('as1Avatar');
          if (_as1av) { _as1av.textContent = initials1; _as1av.className = 'client-avatar' + (a1.esTop ? ' is-top' : ''); }
          pintarNombre('as1Name', a1.nombre, a1.codigo, a1.esTop);
          const _as1cd = document.getElementById('as1Code');
          if (_as1cd) _as1cd.textContent = a1.codigo + (a1.horaLlegada ? ' · Llegó ' + a1.horaLlegada : '');
          const _obs1 = document.getElementById('obs1Display');
          if (_obs1) _obs1.textContent = a1.obsGeneral || a1.observaciones || 'Sin observaciones';
          _setNotaRecepcion(1, a1.observaciones);

          // Restaurar servicios de la 1ª clienta desde el ticket (no solo slot 2)
          if (!String(a1.idEspera||'').startsWith('TM-') && !a1.promoNombre) {
            if (a1.serviciosDetalle && a1.serviciosDetalle.length > 0) {
              slotServices[1] = a1.serviciosDetalle.map(function(sd){ return { name: sd.servicio || sd.nombre || sd.name, price: Number(sd.monto || sd.precio || sd.price || 0), area: sd.area || a1.area || '' }; });
            } else if (a1.servicio && a1.servicio !== '—') {
              let _n1 = a1.servicio;
              if (String(_n1).trim().startsWith('{')) { try { const _p1 = JSON.parse(_n1); _n1 = _p1.nombre || _p1.name || _n1; } catch(e){} }
              slotServices[1] = [{ name: _n1, price: Number(a1.total || 0), area: a1.area || '' }];
            }
            try { renderServicesForSlot(1); } catch(e1) {}
            const _t1 = (slotServices[1]||[]).reduce(function(s,v){ return s + Number(v.price||0); }, 0);
            const _as1t = document.getElementById('as1Total'); if (_as1t) _as1t.textContent = '$' + _t1;
            const _as1sc = document.getElementById('as1SvcCount'); if (_as1sc) _as1sc.textContent = String((slotServices[1]||[]).length);
          }
          
          // Doble atención: registrar en activeClients
          if (user.maxClients === 2) {
            activeClients[user.name] = [{ name: a1.nombre, code: a1.codigo, service: a1.servicio }];
            if (aten.length > 1) {
              const a2 = aten[1];
              window._as2Client = a2.codigo;
              window._as2IdEspera = a2.idEspera || ''; // ID del ticket de la 2ª clienta
              activeClients[user.name].push({ name: a2.nombre, code: a2.codigo, service: a2.servicio });
              const initials2 = a2.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
              const _as2av = document.getElementById('as2Avatar'); if (_as2av) _as2av.textContent = initials2;
              pintarNombre('as2Name', a2.nombre, a2.codigo, a2.esTop);
              const _as2cd = document.getElementById('as2Code'); if (_as2cd) _as2cd.textContent = a2.codigo + (a2.horaLlegada ? ' · Llegó ' + a2.horaLlegada : '');
              // Cargar servicios de la 2ª clienta si vienen del ticket
              if (a2.serviciosDetalle && a2.serviciosDetalle.length > 0) {
                slotServices[2] = a2.serviciosDetalle.map(function(sd){ return { name: sd.servicio || sd.name, price: Number(sd.monto || sd.price || 0), area: sd.area || '' }; });
              } else if (a2.servicio && a2.servicio !== '—') {
                slotServices[2] = [{ name: a2.servicio, price: Number(a2.total || 0), area: a2.area || '' }];
              }
              try { renderServicesForSlot(2); } catch(e2) {}
              const _t2 = (slotServices[2]||[]).reduce(function(s,v){ return s + Number(v.price||0); }, 0);
              const _as2t = document.getElementById('as2Total'); if (_as2t) _as2t.textContent = '$' + _t2;
              const _as2sc = document.getElementById('as2SvcCount'); if (_as2sc) _as2sc.textContent = String((slotServices[2]||[]).length);
            } else {
              // No hay 2ª clienta → limpiar slot 2 para no arrastrar datos de una sesión anterior
              window._as2Client = '';
              window._as2IdEspera = '';
              slotServices[2] = [];
              const _as2nm = document.getElementById('as2Name'); if (_as2nm) _as2nm.textContent = '';
              const _as2cd2 = document.getElementById('as2Code'); if (_as2cd2) _as2cd2.textContent = '';
              const _as2sl = document.getElementById('as2ServicesList'); if (_as2sl) _as2sl.innerHTML = '';
              const _as2t2 = document.getElementById('as2Total'); if (_as2t2) _as2t2.textContent = '$0';
              const _as2sc2 = document.getElementById('as2SvcCount'); if (_as2sc2) _as2sc2.textContent = '0';
            }
            updateCapacityUI(user.name);
          }
          
          // Pestañas: cargar ficha rápida desde el sheet
          if (user.area === 'pestanas') {
            const _pk3 = a1.codigo.toLowerCase().replace(/-/g, '');
            apiGet('getFichaPestanas', { codigo: a1.codigo }).then(pr3 => {
              if (pr3.success && pr3.fichas && pr3.fichas.length > 0) {
                if (!CLIENT_PROFILES[_pk3]) CLIENT_PROFILES[_pk3] = { name: a1.nombre, code: a1.codigo, pestanas: { fichas: [], history: [] } };
                if (!CLIENT_PROFILES[_pk3].pestanas) CLIENT_PROFILES[_pk3].pestanas = { fichas: [], history: [] };
                CLIENT_PROFILES[_pk3].pestanas.fichas = pr3.fichas;
                CLIENT_PROFILES[_pk3].pestanas.ultimaVisita = pr3.ultimaVisita;
              }
              loadPestFichaQuick(_pk3, 1);
            }).catch(() => loadPestFichaQuick(_pk3, 1));
          }
        }
      } catch (err) {
        console.error('Error cargando atenciones:', err);
      }
    }
    
    ensureCatalogoLoaded(); // Pre-cargar catalogo en background
    // No restaurar asistenciaPanel automáticamente
    var _ss2 = user.screen;
    if (_ss2 === 'asistenciaPanel') {
      var _r2 = String(user.role || user.rol || '').toLowerCase();
      _ss2 = _r2 === 'owner' ? 'ownerHome' : (_r2 === 'admin' ? 'mikaelaHome' : 'staffHome');
    }
    if (_ss2 === 'staffAsistencia') { _ss2 = 'staffHome'; }
    show(_ss2);
  }

  // Modo de descanso: bloquea staff si está en descanso individual O si el descanso GLOBAL está activo.
  // El Owner es el "llavero": nunca se bloquea; solo refresca el estado de su botón.
  async function verificarDescansoActivo() {
    const u = window.currentUser;
    if (!u) return;
    let r;
    try { r = await apiGet('getDescanso'); } catch(e) { return; }
    if (!r || !r.success) return;
    window._descansoGlobalOn = (r.global === true);

    if (u.role === 'owner') {
      refreshDescansoGlobalBtn();
      return;
    }
    // No-owner: bloquear si hay descanso global o descanso individual de esta staff
    const bloqueada = window._descansoGlobalOn || (r.config && r.config[u.name] === true);
    if (bloqueada) {
      // Anti-falsos-positivos: exigir 2 lecturas consecutivas de "bloqueada" antes de
      // expulsar. Evita que una lectura desfasada (justo después de que el Owner quita el
      // bloqueo) saque a la staff recién logueada y la obligue a reintentar varias veces.
      // El login del backend igual aplica el descanso, así que esto no permite saltarlo.
      window._descansoBlockStreak = (window._descansoBlockStreak || 0) + 1;
      if (window._descansoBlockStreak < 2) return;
      try { localStorage.removeItem('nexserv_session'); } catch(e) {}
      pingSesion('logout');
      stopHeartbeat();
      window.currentUser = null;
      document.body.classList.remove('rol-staff');
      closeUserMenu();
      show('login');
      if (!window._descansoAvisado) {
        window._descansoAvisado = true;
        alert(window._descansoGlobalOn
          ? 'El salón está en modo descanso. La app se reactiva cuando la dueña la desbloquee 💛'
          : 'Estás en tu tiempo de descanso, disfrútalo en familia 💛');
      }
    } else {
      window._descansoBlockStreak = 0;
      window._descansoAvisado = false;
    }
  }
  window.verificarDescansoActivo = verificarDescansoActivo;

  function refreshDescansoGlobalBtn() {
    const b = document.getElementById('descansoGlobalBtn');
    if (!b) return;
    if (window._descansoGlobalOn) {
      b.innerHTML = '☀️ Quitar descanso — desbloquear equipo';
      b.style.background = '#2d9d5a';
    } else {
      b.innerHTML = '🌙 Poner a TODO el equipo en descanso';
      b.style.background = '#2a1f4d';
    }
  }
  window.refreshDescansoGlobalBtn = refreshDescansoGlobalBtn;

  async function toggleDescansoGlobal() {
    const activar = !window._descansoGlobalOn;
    const u = window.currentUser;
    if (activar && !confirm('¿Poner a TODO el equipo en descanso?\n\nNadie podrá abrir ni usar la app hasta que vos la desbloquees.')) return;
    if (!activar && !confirm('¿Desbloquear y quitar el modo descanso del equipo?')) return;
    try {
      const r = await apiPost('setDescansoGlobal', { activar: activar, por: (u && u.name) || '' });
      if (r && r.success) {
        window._descansoGlobalOn = (r.global === true);
        refreshDescansoGlobalBtn();
        if (typeof showToast === 'function') showToast(window._descansoGlobalOn ? '🌙 Equipo en descanso — app bloqueada' : '☀️ Equipo desbloqueado');
      } else {
        alert((r && (r.message || r.error)) || 'No se pudo cambiar el modo descanso');
      }
    } catch(e) { alert('Error: ' + e.message); }
  }
  window.toggleDescansoGlobal = toggleDescansoGlobal;


  function logout() {
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    pingSesion('logout');
    stopHeartbeat();
    window.currentUser = null;
    document.body.classList.remove('rol-staff');
    // Limpiar sesión persistida
    try { localStorage.removeItem('nexserv_session'); } catch(e) {}
    commVisible = false;
    closeUserMenu();
    show('login');
  }

  function openUserMenu(avatarEl) {
    const user = window.currentUser;
    document.getElementById('userMenuName').textContent = user ? user.name : '';
    const segBtn = document.getElementById('menuSeguridadBtn');
    if (segBtn) segBtn.style.display = (user && user.role === 'owner') ? 'flex' : 'none';
    const cajaBtn = document.getElementById('menuCajaBtn');
    if (cajaBtn) cajaBtn.style.display = (user && user.role === 'owner') ? 'flex' : 'none';
    const cierreMesBtn = document.getElementById('menuCierreMesBtn');
    if (cierreMesBtn) cierreMesBtn.style.display = (user && user.role === 'owner') ? 'flex' : 'none';
    const informeServBtn = document.getElementById('menuInformeServiciosBtn');
    if (informeServBtn) informeServBtn.style.display = (user && user.role === 'owner') ? 'flex' : 'none';
    const pushBtn = document.getElementById('menuPushTestBtn');
    if (pushBtn) pushBtn.style.display = (user && user.role === 'owner') ? 'flex' : 'none';
    const histBtn = document.getElementById('menuHistorialBtn');
    if (histBtn) histBtn.style.display = (user && (user.role === 'owner' || user.role === 'admin')) ? 'flex' : 'none';
    const solBtn = document.getElementById('menuSolucionesBtn');
    if (solBtn) solBtn.style.display = (user && (user.role === 'owner' || user.role === 'admin')) ? 'flex' : 'none';
    const asisBtn = document.getElementById('menuAsistenciaBtn');
    if (asisBtn) asisBtn.style.display = (user && (user.role === 'owner' || user.role === 'admin')) ? 'flex' : 'none';
    const asisStaffBtn = document.getElementById('menuAsistenciaStaffBtn');
    if (asisStaffBtn) asisStaffBtn.style.display = (user && user.role === 'staff') ? 'flex' : 'none';
    document.getElementById('userMenu').classList.add('active');
    document.getElementById('userMenuOverlay').classList.add('active');
  }

  function closeUserMenu() {
    document.getElementById('userMenu').classList.remove('active');
    document.getElementById('userMenuOverlay').classList.remove('active');
  }

  // ═══════════════ PANEL DE SOLUCIONES (Capa 1) ═══════════════
  window._solTickets = {};
  function _solIcon(name, size){
    size = size || 16;
    const P = {
      wrench:  'M21.71 18.29 13.4 9.98a5.5 5.5 0 0 0-7.04-7.05l3.2 3.2a1.5 1.5 0 0 1-2.12 2.12l-3.2-3.2A5.5 5.5 0 0 0 11.3 12l8.3 8.3a1 1 0 0 0 1.42 0l.69-.69a1 1 0 0 0 0-1.32Z',
      search:  'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z',
      book:    'M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm0 18H6V4h2v8l2.5-1.5L13 12V4h5v16Z',
      list:    'M9 2a1 1 0 0 0-1 1H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2a1 1 0 0 0-1-1H9Zm0 2h6v2H9V4Zm-2 6h10v2H7v-2Zm0 4h10v2H7v-2Zm0 4h7v2H7v-2Z',
      clock:   'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.6l4 2.3-.8 1.3L11 13V7Z',
      scissors:'M9.64 7.64a3 3 0 1 0-1.06 1.06L11 11l-2.42 2.3a3 3 0 1 0 1.06 1.06L12 12l6 6h3v-1L9.64 7.64Zm-3.64 1.36a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm12-10 3-2h-3l-5 5 1 1Z',
      cash:    'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
      person:  'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z',
      undo:    'M9 14 4 9l5-5v3h6a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6H9v3Z',
      exit:    'M14 3a2 2 0 0 1 2 2v2h-2V5H6v14h8v-2h2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8Zm3 6 4 3-4 3v-2h-6v-2h6V9Z',
      refresh: 'M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z',
      chat:    'M4 4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v3l4-3h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm8 3a2.5 2.5 0 0 1 1 4.79V12a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1 .5.5 0 1 0-.5-.5 1 1 0 0 1-2 0A2.5 2.5 0 0 1 12 7Zm0 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
      trash:   'M6 7h12l-1 14H7L6 7Zm3-3h6l1 2h4v2H2V6h4l1-2Z'
    };
    const d = P[name] || '';
    return '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" style="vertical-align:middle;flex-shrink:0;"><path d="' + d + '"/></svg>';
  }
  function _solVolver(){
    const u = window.currentUser;
    return (u && u.role === 'owner') ? 'ownerHome' : 'mikaelaHome';
  }
  function _solEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _solTipo(f){
    f = String(f||'');
    if (f === 'TicketMulti') return 'Combo / Ticket Multi (TM)';
    if (f === 'ServicioPromo') return 'Promo (SP)';
    if (f === 'ServicioNormal') return 'Servicio normal (SN)';
    if (f === 'ListaEspera') return 'Lista de espera (LE)';
    return f || '—';
  }
  function openSoluciones(){
    show('solucionesPanel');
    const u = window.currentUser;
    const histTab = document.getElementById('solTabHistorial');
    if (histTab) histTab.style.display = (u && u.role === 'owner') ? 'block' : 'none';
    solTab('inspector');
    solCerrarDetalle();
    loadSolucionesTickets();
  }
  function solTab(which){
    const inspBtn = document.getElementById('solTabInspector');
    const guiaBtn = document.getElementById('solTabGuia');
    const histBtn = document.getElementById('solTabHistorial');
    const inspView = document.getElementById('solInspectorView');
    const detView  = document.getElementById('solDetalleView');
    const guiaView = document.getElementById('solGuiaView');
    const histView = document.getElementById('solHistorialView');
    if (!inspBtn || !guiaBtn) return;
    const base = 'flex:1;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;';
    const on   = 'background:var(--accent-deep);color:#fff;';
    const off  = 'background:var(--bg-card);color:var(--ink-soft);';
    const histVisible = histBtn && histBtn.style.display !== 'none';
    inspView.style.display = 'none';
    detView.style.display = 'none';
    guiaView.style.display = 'none';
    if (histView) histView.style.display = 'none';
    const consView = document.getElementById('solConsultaView');
    if (consView) consView.style.display = 'none';
    inspBtn.setAttribute('style', base + off);
    guiaBtn.setAttribute('style', base + off);
    if (histBtn) histBtn.setAttribute('style', (histVisible ? '' : 'display:none;') + base + off);
    if (which === 'guia'){
      guiaView.style.display = 'block';
      guiaBtn.setAttribute('style', base + on);
    } else if (which === 'historial'){
      if (histView) histView.style.display = 'block';
      if (histBtn) histBtn.setAttribute('style', base + on);
      loadSolucionesHistorial();
    } else {
      inspView.style.display = 'block';
      inspBtn.setAttribute('style', base + on);
    }
  }
  async function loadSolucionesTickets(){
    const list = document.getElementById('solTicketsList');
    if (!list) return;
    list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--ink-faint);font-size:13px;">Cargando tickets…</div>';
    try {
      const r = await apiGet('getListaCompleta');
      if (!r || !r.success){
        list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--danger);font-size:13px;">No se pudo cargar. Tocá Actualizar.</div>';
        return;
      }
      window._solTickets = {};
      const grupos = [
        { titulo: _solIcon('clock',14)    + ' En espera',   items: r.esperando  || [], grupo:'espera'  },
        { titulo: _solIcon('scissors',14) + ' En servicio', items: r.enServicio || [], grupo:'servicio'},
        { titulo: _solIcon('cash',14)     + ' Por cobrar',  items: r.porCobrar  || [], grupo:'cobrar'  },
      ];
      let html = '', total = 0;
      grupos.forEach(function(g){
        if (!g.items.length) return;
        total += g.items.length;
        html += '<div style="font-size:12px;font-weight:800;color:var(--ink-soft);margin:16px 0 6px;">' + g.titulo + ' (' + g.items.length + ')</div>';
        g.items.forEach(function(t){
          const id = String(t.idEspera || t.codigo || ('x' + Math.floor(Math.random()*1e6)));
          window._solTickets[id] = { t:t, grupo:g.grupo };
          html += solTicketRow(id, t, g.grupo);
        });
      });
      if (!total) html = '<div class="card" style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">✨ No hay tickets activos en este momento.</div>';
      list.innerHTML = html;
    } catch(e){
      console.error(e);
      list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--danger);font-size:13px;">Error de conexión. Tocá Actualizar.</div>';
    }
  }
  function solTicketRow(id, t, grupo){
    const nombre = _solEsc(t.nombre || t.cliente || 'Clienta');
    const area   = _solEsc(t.area || (Array.isArray(t.areas) ? t.areas.map(function(a){return a.area;}).join(' + ') : '') || '—');
    const staff  = _solEsc(t.tomadaPor || '');
    const cod    = _solEsc(t.codigo || id);
    const total  = (grupo === 'cobrar' && t.total != null) ? ('<span style="font-weight:800;color:var(--success);">$' + Number(t.total).toFixed(2) + '</span>') : '';
    const idJs   = id.replace(/'/g, "\\'");
    return '<div class="card" onclick="solVerDetalle(\'' + idJs + '\')" style="cursor:pointer;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">'
      + '<div style="min-width:0;">'
      +   '<div style="font-weight:800;font-size:15px;">' + nombre + '</div>'
      +   '<div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">' + area + ' · ' + (staff ? (_solIcon('person',13) + ' ' + staff) : 'sin asignar') + '</div>'
      +   '<div style="font-size:11px;color:var(--ink-faint);margin-top:2px;">' + cod + '</div>'
      + '</div>'
      + '<div style="text-align:right;white-space:nowrap;">' + total + '<div style="font-size:18px;color:var(--ink-faint);line-height:1;">›</div></div>'
      + '</div>';
  }
  function solVerDetalle(id){
    const entry = window._solTickets[id];
    if (!entry) return;
    const t = entry.t, grupo = entry.grupo;
    const body = document.getElementById('solDetalleBody');
    const idEspera = String(t.idEspera || t.codigo || '');
    const nombre   = t.nombre || t.cliente || 'Clienta';
    const staff    = t.tomadaPor || '';
    const areaIdx  = (t.fuente === 'TicketMulti' && t.areaIdx) ? t.areaIdx : '';

    function kv(l,v){
      return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px;">'
        + '<span style="color:var(--ink-soft);">' + l + '</span>'
        + '<span style="font-weight:700;text-align:right;">' + _solEsc(v || '—') + '</span></div>';
    }
    let info = '';
    info += kv('Cliente', nombre);
    info += kv('Código', t.codigo || idEspera);
    info += kv('Estado', grupo === 'espera' ? 'En espera' : grupo === 'servicio' ? 'En servicio' : 'Por cobrar');
    info += kv('Área', t.area || (Array.isArray(t.areas) ? t.areas.map(function(a){return a.area + (a.estado ? (' [' + a.estado + ']') : '');}).join(' + ') : '—'));
    info += kv('Staff asignada', staff || 'sin asignar');
    info += kv('Tipo de ticket', _solTipo(t.fuente));
    if (t.prioridad) info += kv('Prioridad', t.prioridad);
    if (grupo === 'cobrar' && t.total != null) info += kv('Total a cobrar', '$' + Number(t.total).toFixed(2));
    if (t.observaciones) info += kv('Observaciones', t.observaciones);

    let desg = '';
    const det = t.serviciosDetalle || t.desglose;
    if (Array.isArray(det) && det.length){
      desg = '<div style="font-size:12px;font-weight:800;color:var(--ink-soft);margin:14px 0 6px;">Servicios</div>';
      det.forEach(function(d){
        const m = d.monto != null ? d.monto : (d.precio || 0);
        desg += '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--line);">'
          + '<span>' + _solEsc(d.servicio || d.nombre || 'Servicio') + (d.staff ? (' · ' + _solEsc(d.staff)) : '') + '</span>'
          + '<span style="font-weight:700;">$' + Number(m).toFixed(2) + '</span></div>';
      });
    }

    const idJs    = idEspera.replace(/'/g, "\\'");
    const nomJs   = String(nombre).replace(/'/g, "\\'");
    const codJs   = String(t.codigo || idEspera).replace(/'/g, "\\'");
    const staffJs = String(staff).replace(/'/g, "\\'");
    const aIdxJs  = String(areaIdx).replace(/'/g, "\\'");

    const staffAll = ['María','Keyla','Lesly','Rosa','Yadira','Diana','Laura'];
    const picker = staffAll.map(function(s){
      return '<button onclick="solReasignar(\'' + idJs + '\',\'' + aIdxJs + '\',\'' + s + '\',\'' + nomJs + '\',\'' + codJs + '\')" style="padding:8px 13px;border:1px solid var(--line);border-radius:20px;background:var(--bg-card);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">' + s + '</button>';
    }).join('');

    let acc = '<div style="font-size:12px;font-weight:800;color:var(--ink-soft);margin:18px 0 8px;">Acciones</div>';
    acc += '<button onclick="solDevolver(\'' + idJs + '\',\'' + nomJs + '\',\'' + staffJs + '\')" style="width:100%;padding:13px;margin-bottom:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg-card);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">' + _solIcon('undo',16) + ' Devolver a la lista de espera<div style="font-size:11px;color:var(--ink-faint);font-weight:500;margin-top:2px;">Para que otra staff la tome desde cero</div></button>';
    acc += '<button onclick="solRetirarCobrar(\'' + idJs + '\',\'' + nomJs + '\')" style="width:100%;padding:13px;margin-bottom:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg-card);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">' + _solIcon('exit',16) + ' Retirar y cobrar lo realizado<div style="font-size:11px;color:var(--ink-faint);font-weight:500;margin-top:2px;">Anula lo pendiente y cobra solo lo hecho</div></button>';
    acc += '<div style="border:1px solid var(--line);border-radius:12px;padding:13px;"><div style="font-size:14px;font-weight:700;margin-bottom:10px;">' + _solIcon('refresh',16) + ' Reasignar a otra staff</div><div style="display:flex;flex-wrap:wrap;gap:6px;">' + picker + '</div></div>';
    acc += '<button onclick="solAbrirConsulta(\'' + nomJs + '\',\'' + idJs + '\')" style="width:100%;margin-top:8px;padding:13px;border:1.5px dashed var(--accent-deep);border-radius:12px;background:var(--bg-card);color:var(--accent-deep);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">' + _solIcon('chat',16) + ' Tengo una duda con este ticket<div style="font-size:11px;color:var(--ink-faint);font-weight:500;margin-top:2px;">Le consultás al dueño y queda guardado</div></button>';
    acc += '<button onclick="solEliminarTicket(\'' + idJs + '\',\'' + nomJs + '\')" style="width:100%;margin-top:14px;padding:13px;border:1px solid var(--danger-bg);border-radius:12px;background:var(--bg-card);color:var(--danger);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">' + _solIcon('trash',16) + ' Eliminar ticket (permanente)<div style="font-size:11px;color:var(--ink-faint);font-weight:500;margin-top:2px;">Solo si está roto y no se puede mover ni cobrar</div></button>';

    body.innerHTML = '<div class="card" style="padding:14px;">' + info + desg + acc + '</div>'
      + '<div style="font-size:11px;color:var(--ink-faint);text-align:center;margin-top:10px;line-height:1.5;">Para cobrar normalmente usá la pantalla “Por cobrar”. Para deshacer un servicio ya cobrado usá “Historial de servicios”.</div>';

    document.getElementById('solInspectorView').style.display = 'none';
    document.getElementById('solGuiaView').style.display = 'none';
    document.getElementById('solDetalleView').style.display = 'block';
  }
  function solCerrarDetalle(){
    const d = document.getElementById('solDetalleView');
    const g = document.getElementById('solGuiaView');
    const i = document.getElementById('solInspectorView');
    if (d) d.style.display = 'none';
    if (g) g.style.display = 'none';
    if (i) i.style.display = 'block';
  }
  async function solDevolver(idEspera, nombre, staff){
    if (!confirm('¿Devolver a ' + (nombre || 'la clienta') + ' a la lista de espera?\n\nQuedará disponible para que otra staff la tome.')) return;
    try {
      const r = await apiPost('devolverALista', { idEspera: idEspera || '', clienteNombre: nombre || '', chicaNombre: staff || (window.currentUser && window.currentUser.name) || '' });
      if (r && r.success){
        if (typeof showToast === 'function') showToast('↩️ ' + (nombre || 'Clienta') + ' devuelta a la lista');
        _solLog('Devolver a lista', nombre, idEspera, '');
        solCerrarDetalle(); loadSolucionesTickets();
      } else alert('No se pudo devolver: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.'));
    } catch(e){ console.error(e); alert('Error de conexión.'); }
  }
  async function solReasignar(idEspera, areaIdx, chica, nombre, codigo){
    if (!confirm('¿Asignar a ' + (nombre || 'la clienta') + ' con ' + chica + '?')) return;
    try {
      const r = await apiPost('asignarStaff', { idEspera: idEspera || '', areaIdx: areaIdx || '', chicaNombre: chica });
      if (r && r.success){
        if (typeof showToast === 'function') showToast('✓ ' + (nombre || 'Clienta') + ' asignada a ' + chica);
        try { enviarPushStaff([chica], '📌 Clienta asignada a vos', (codigo || 'Clienta')); } catch(eP){}
        _solLog('Reasignar staff', nombre, idEspera, 'A: ' + chica);
        solCerrarDetalle(); loadSolucionesTickets();
      } else alert('No se pudo reasignar: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.'));
    } catch(e){ console.error(e); alert('Error de conexión.'); }
  }
  async function solRetirarCobrar(idEspera, nombre){
    if (!confirm('¿' + (nombre || 'La clienta') + ' se retira?\n\nSe anularán los servicios pendientes y se cobrará SOLO lo ya realizado.')) return;
    try {
      const r = await apiPost('retirarYCobrar', { idEspera: idEspera || '' });
      if (r && r.success){
        if (typeof showToast === 'function') showToast('🚪 ' + (nombre || 'Clienta') + ' a cobro (solo lo realizado)');
        _solLog('Retirar y cobrar', nombre, idEspera, '');
        solCerrarDetalle(); loadSolucionesTickets();
      } else alert('No se pudo procesar: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.'));
    } catch(e){ console.error(e); alert('Error de conexión.'); }
  }
  async function solEliminarTicket(idEspera, nombre){
    if (!confirm('⚠️ Vas a ELIMINAR el ticket de ' + (nombre || 'esta clienta') + ' de forma PERMANENTE.\n\nNo se cobra nada y no se puede deshacer. Usalo solo si el ticket está roto y no se puede mover ni cobrar.\n\n¿Continuar?')) return;
    if (!confirm('Confirmá una vez más: ¿eliminar definitivamente este ticket?')) return;
    try {
      const r = await apiPost('eliminarTicketEspera', { id: idEspera || '' });
      if (r && r.success){
        if (typeof showToast === 'function') showToast('🗑️ Ticket eliminado');
        _solLog('Eliminar ticket', nombre, idEspera, '');
        solCerrarDetalle(); loadSolucionesTickets();
      } else alert('No se pudo eliminar: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.'));
    } catch(e){ console.error(e); alert('Error de conexión.'); }
  }

  function _solLog(accion, cliente, idEspera, detalle){
    try {
      apiPost('registrarSolucion', {
        usuario:  (window.currentUser && window.currentUser.name) || '',
        accion:   accion || '',
        cliente:  cliente || '',
        idEspera: idEspera || '',
        detalle:  detalle || ''
      });
    } catch(e){}
  }
  async function loadSolucionesHistorial(){
    const list = document.getElementById('solHistorialList');
    if (!list) return;
    list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--ink-faint);font-size:13px;">Cargando…</div>';
    try {
      const r = await apiGet('getSolucionesLog');
      if (!r || !r.success){
        list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--danger);font-size:13px;">No se pudo cargar.</div>';
        return;
      }
      const regs = r.registros || [];
      if (!regs.length){
        list.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--ink-faint);font-size:13px;">Todavía no hay acciones registradas.</div>';
        return;
      }
      list.innerHTML = regs.map(function(x){
        const acc = String(x.accion || '');
        const esConsulta = acc.indexOf('Consulta') !== -1 || acc.indexOf('Duda') !== -1;
        let ic = 'wrench';
        if (esConsulta) ic = 'chat';
        else if (acc.indexOf('Devolver') !== -1) ic = 'undo';
        else if (acc.indexOf('Reasignar') !== -1) ic = 'refresh';
        else if (acc.indexOf('Retirar') !== -1) ic = 'exit';
        else if (acc.indexOf('Eliminar') !== -1) ic = 'trash';
        return '<div class="card" style="padding:12px;margin-bottom:8px;' + (esConsulta ? 'border-left:3px solid var(--accent-deep);' : '') + '">'
          + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><span style="font-weight:800;font-size:14px;display:flex;align-items:center;gap:6px;">' + _solIcon(ic,15) + _solEsc(acc) + '</span><span style="font-size:11px;color:var(--ink-faint);white-space:nowrap;">' + _solEsc(x.fecha) + ' · ' + _solEsc(x.hora) + '</span></div>'
          + (x.cliente ? ('<div style="font-size:13px;color:var(--ink-soft);margin-top:3px;display:flex;align-items:center;gap:5px;">' + _solIcon('person',13) + _solEsc(x.cliente) + '</div>') : '')
          + (x.detalle ? ('<div style="font-size:13px;color:var(--ink);margin-top:5px;line-height:1.5;' + (esConsulta ? 'font-style:italic;' : '') + '">' + (esConsulta ? '“' : '') + _solEsc(x.detalle) + (esConsulta ? '”' : '') + '</div>') : '')
          + '<div style="font-size:12px;color:var(--ink-faint);margin-top:4px;">Por: ' + _solEsc(x.usuario || '—') + '</div>'
          + '</div>';
      }).join('');
    } catch(e){
      console.error(e);
      list.innerHTML = '<div class="card" style="text-align:center;padding:20px;color:var(--danger);font-size:13px;">Error de conexión.</div>';
    }
  }
  async function borrarSolucionesHistorial(){
    const u = window.currentUser;
    if (!u || u.role !== 'owner'){ alert('Solo el dueño puede borrar el historial.'); return; }
    if (!confirm('¿Borrar TODO el historial de acciones?\n\nEsto no se puede deshacer.')) return;
    try {
      const r = await apiPost('borrarSolucionesLog', {});
      if (r && r.success){
        if (typeof showToast === 'function') showToast('🗑️ Historial borrado');
        loadSolucionesHistorial();
      } else alert('No se pudo borrar: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.'));
    } catch(e){ console.error(e); alert('Error de conexión.'); }
  }
  window._solConsultaCtx = { cliente:'', idEspera:'' };
  function solAbrirConsulta(cliente, idEspera){
    window._solConsultaCtx = { cliente: cliente || '', idEspera: idEspera || '' };
    const ctxEl = document.getElementById('solConsultaCtx');
    const ta = document.getElementById('solConsultaTexto');
    if (ta) ta.value = '';
    if (ctxEl) ctxEl.textContent = cliente ? ('Sobre la clienta: ' + cliente) : 'Duda general (sin ticket específico)';
    document.getElementById('solInspectorView').style.display = 'none';
    document.getElementById('solDetalleView').style.display = 'none';
    document.getElementById('solGuiaView').style.display = 'none';
    const hv = document.getElementById('solHistorialView'); if (hv) hv.style.display = 'none';
    document.getElementById('solConsultaView').style.display = 'block';
    if (ta) { try { ta.focus(); } catch(e){} }
  }
  function solCancelarConsulta(){
    const c = document.getElementById('solConsultaView');
    if (c) c.style.display = 'none';
    solTab('inspector');
  }
  async function solEnviarConsulta(){
    const ta = document.getElementById('solConsultaTexto');
    const texto = ((ta && ta.value) || '').trim();
    if (!texto){ alert('Escribí tu duda antes de enviar.'); return; }
    const ctx = window._solConsultaCtx || {};
    const quien = (window.currentUser && window.currentUser.name) || 'Alguien';
    try {
      const r = await apiPost('registrarSolucion', {
        usuario: quien,
        accion: 'Consulta',
        cliente: ctx.cliente || '',
        idEspera: ctx.idEspera || '',
        detalle: texto
      });
      if (!r || !r.success){ alert('No se pudo guardar la consulta: ' + ((r && (r.message || r.error)) || 'intentá de nuevo.')); return; }
      try { enviarPushStaff(['Humberto'], '❓ ' + quien + ' tiene una duda', (ctx.cliente ? (ctx.cliente + ': ') : '') + texto.slice(0,90)); } catch(eP){}
      if (typeof showToast === 'function') showToast('✓ Consulta enviada al dueño');
      const c = document.getElementById('solConsultaView');
      if (c) c.style.display = 'none';
      solTab('inspector');
    } catch(e){ console.error(e); alert('No se pudo enviar. Revisá tu conexión e intentá de nuevo.'); }
  }

  // ── HISTORIAL DE SERVICIOS POR CLIENTA (Mikaela) ──────────────
  function _histFecha(v) {
    if (!v) return '—';
    try { const d = new Date(v); if (!isNaN(d.getTime())) return d.toLocaleDateString('es-EC'); } catch(e) {}
    return String(v);
  }
  function _histLabel(k){ return String(k).replace(/([A-Z])/g,' $1').replace(/^./,function(c){return c.toUpperCase();}); }
  function _histKV(label, val) {
    if (val === undefined || val === null || val === '') return '';
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--line);">'
      + '<span style="font-size:12px;color:var(--ink-soft);">' + label + '</span>'
      + '<span style="font-size:13px;font-weight:600;text-align:right;max-width:62%;">' + val + '</span></div>';
  }
  let _histAccId = 0;
  function _histAcordeon(titulo, contenidoHTML, icono) {
    const id = 'histAcc_' + (_histAccId++);
    return '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden;">'
      + '<div onclick="histToggle(\'' + id + '\')" style="padding:13px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;">'
      + '<span style="font-size:16px;">' + (icono||'') + '</span>'
      + '<span style="font-weight:700;font-size:14px;flex:1;">' + titulo + '</span>'
      + '<span style="color:var(--ink-faint);">▾</span></div>'
      + '<div id="' + id + '" style="display:none;padding:0 14px 12px;">' + contenidoHTML + '</div></div>';
  }
  function histToggle(id) {
    const e = document.getElementById(id);
    if (e) e.style.display = (e.style.display === 'none' || !e.style.display) ? 'block' : 'none';
  }
  window.histToggle = histToggle;

  function _histGenericFicha(f) {
    if (!f || typeof f !== 'object') return '<div style="color:var(--ink-faint);font-size:13px;padding:8px;">Sin datos.</div>';
    const keys = Object.keys(f).filter(function(k){ return f[k] !== '' && f[k] !== null && f[k] !== undefined && typeof f[k] !== 'object'; });
    if (!keys.length) return '<div style="color:var(--ink-faint);font-size:13px;padding:8px;">Sin datos.</div>';
    return keys.map(function(k){ return _histKV(_histLabel(k), (/fecha/i.test(k) ? _histFecha(f[k]) : f[k])); }).join('');
  }
  function _histFichaPestHTML(f) {
    const badge = f.activa ? ' · <span style="color:var(--success);">activa</span>' : '';
    return '<div style="border-bottom:1px solid var(--line);padding:8px 0;">'
      + '<div style="font-weight:700;font-size:12px;margin-bottom:4px;">Ficha ' + (f.nroFicha||'') + badge + '</div>'
      + _histKV('Modelo', f.modelo) + _histKV('Diseño', f.diseno) + _histKV('Tallas', f.tallas)
      + _histKV('Observaciones', f.obs) + _histKV('Fecha', _histFecha(f.fecha)) + '</div>';
  }

  async function histGuardarFacturacion(codigo) {
    if (!codigo) return;
    const g = function (id) { return (document.getElementById(id)?.value || '').trim(); };
    const nombre   = g('histFactNombre');
    const apellido = g('histFactApellido');
    const nombreFull = (nombre + ' ' + apellido).trim();
    const payload = {
      codigo: codigo,
      nombre: nombreFull,
      telefono: g('histFactTelefono'),
      cedula: g('histFactCedula'),
      correo: g('histFactCorreo'),
      ciudad: g('histFactCiudad')
    };
    try {
      const r = await apiPost('updateClientaFull', payload);
      if (r && r.success) { if (typeof showToast === 'function') showToast('✓ Datos de facturación guardados'); }
      else { if (typeof showToast === 'function') showToast('⚠ No se pudo guardar'); }
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('⚠ Error al guardar');
    }
  }

  function _histRenderPerfil(r) {
    const c = r.cliente || {};
    const facial = (r.fichaFacial && r.fichaFacial.ficha) ? r.fichaFacial.ficha : null;
    const pest   = (r.fichaPestanas && Array.isArray(r.fichaPestanas.fichas)) ? r.fichaPestanas.fichas : [];
    const pig    = (r.fichaPigmento && (r.fichaPigmento.ficha || (Array.isArray(r.fichaPigmento.fichas) && r.fichaPigmento.fichas[0]))) ? (r.fichaPigmento.ficha || r.fichaPigmento.fichas[0]) : null;
    const hist   = Array.isArray(r.historial) ? r.historial : [];

    let html = '';
    html += '<div class="card" style="padding:16px;margin-bottom:12px;">'
      + '<div style="font-weight:800;font-size:18px;">' + (c.nombre || '—') + '</div>'
      + '<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Código ' + (c.codigo || '—') + '</div>'
      + '<div style="display:flex;gap:22px;margin-top:12px;">'
      + '<div><div style="font-size:11px;color:var(--ink-faint);">Última visita</div><div style="font-weight:700;font-size:14px;">' + _histFecha(c.ultimaVisita) + '</div></div>'
      + '<div><div style="font-size:11px;color:var(--ink-faint);">Total visitas</div><div style="font-weight:700;font-size:14px;">' + (c.totalVisitas || 0) + '</div></div>'
      + '</div></div>';

    // ── DATOS DE FACTURACIÓN (editable) ──
    const _heA = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); };
    const _nomF = String(c.nombre || '').trim().split(' ');
    const _fNom = _nomF[0] || '';
    const _fApe = _nomF.slice(1).join(' ');
    const _inpF = 'width:100%;padding:13px 16px;border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:14px;font-weight:700;background:var(--bg-card);color:var(--ink);box-sizing:border-box;';
    html += '<div style="font-size:11px;font-weight:700;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin:14px 4px 8px;">Datos facturación</div>';
    html += '<div style="margin-bottom:10px;">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
      +   '<input id="histFactNombre" placeholder="Nombre" value="' + _heA(_fNom) + '" style="' + _inpF + '">'
      +   '<input id="histFactApellido" placeholder="Apellido" value="' + _heA(_fApe) + '" style="' + _inpF + '">'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
      +   '<input id="histFactCedula" inputmode="numeric" placeholder="Cédula / RUC" value="' + _heA(c.cedula) + '" style="' + _inpF + '">'
      +   '<input id="histFactTelefono" inputmode="tel" placeholder="Teléfono" value="' + _heA(c.telefono) + '" style="' + _inpF + '">'
      + '</div>'
      + '<input id="histFactCorreo" type="email" placeholder="Correo electrónico" value="' + _heA(c.correo) + '" style="' + _inpF + 'margin-bottom:10px;">'
      + '<input id="histFactCiudad" placeholder="Ciudad" value="' + _heA(c.ciudad) + '" style="' + _inpF + 'margin-bottom:10px;">'
      + '<button onclick="histGuardarFacturacion(\'' + (c.codigo || '') + '\')" style="width:100%;padding:13px;border:none;border-radius:var(--radius-pill);background:var(--ink);color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">💾 Guardar datos de facturación</button>'
      + '</div>';

    html += '<div style="font-size:11px;font-weight:700;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin:6px 4px;">Fichas</div>';
    html += _histAcordeon('Ficha facial', facial ? _histGenericFicha(facial) : '<div style="color:var(--ink-faint);font-size:13px;padding:8px;">Sin ficha facial.</div>', '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d="M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d="M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d="M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d="M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d="M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg>');
    html += _histAcordeon('Ficha pestañas', pest.length ? pest.map(_histFichaPestHTML).join('') : '<div style="color:var(--ink-faint);font-size:13px;padding:8px;">Sin ficha de pestañas.</div>', '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z"/><path d="M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z"/></svg>');
    html += _histAcordeon('Ficha pigmento / cejas', pig ? _histGenericFicha(pig) : '<div style="color:var(--ink-faint);font-size:13px;padding:8px;">Sin ficha de pigmento.</div>', '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.9,17.1c.2,2.5-1.8,4.6-4.3,4.7-2.5,0-4.5-2.1-4.4-4.6s1.2-3.4,1.9-4.5,1.6-2.5,2.4-3.8c1.4,2.1,2.8,4.1,3.8,6.4.2.6.5,1.2.5,1.8Z"/><path d="M16.5,14.4c0,2.5-2.1,4.6-4.7,4.4.3-1,.3-2,0-2.9-.2-.7-.5-1.3-.8-1.9-.5-1.1-1.1-2.2-1.8-3.2.9-1.7,1.9-3.2,3-4.8l2,3.1c.5.9,1,1.7,1.5,2.7.3.7.8,1.9.9,2.7Z"/><path d="M21.7,10.7c0,2.4-1.8,4.4-4.1,4.5,0-.7,0-1.3-.2-2-.2-.8-.5-1.5-.9-2.3-.6-1.3-1.4-2.5-2.2-3.8.9-1.7,1.9-3.3,3-4.9l1.7,2.6c.6,1,1.1,1.9,1.7,2.9.4.8,1,2.1,1,3Z"/></svg>');

    // ── Observaciones que dejan las staff (general + por área) ──
    // 1) Campos del registro de la clienta (si se cargaron a mano)
    const _obsItems = [
      ['General',    c.observaciones],
      ['Cejas',      c.obsCejas],
      ['Depilación', c.obsDepilacion],
      ['Pestañas',   c.obsPestanas],
      ['Facial',     c.obsFacial]
    ].filter(function(o){ return o[1] && String(o[1]).trim(); });

    // 2) Observaciones que las staff dejan en sus FICHAS de área (lo que más se usa).
    //    Se consolidan acá para tener el panorama completo al revisar el perfil.
    try {
      // Bitácora permanente: notas que dejaron las staff durante el servicio
      // (todas las áreas). Son las más relevantes para guiar a la próxima staff.
      (Array.isArray(r.observacionesStaff) ? r.observacionesStaff : []).forEach(function(o){
        if (o && o.observacion && String(o.observacion).trim()) {
          var _a = o.area ? (String(o.area).charAt(0).toUpperCase() + String(o.area).slice(1)) : 'Nota';
          var _lbl = _a + (o.staff ? ' · ' + o.staff : '') + (o.fecha ? ' · ' + _histFecha(o.fecha) : '');
          _obsItems.push([_lbl, o.observacion]);
        }
      });
      // Facial (Laura): nota + alergias (alergias es clave tenerla en cuenta)
      if (facial && facial.obsExtra && String(facial.obsExtra).trim()) {
        _obsItems.push(['Facial' + (facial.fecha ? ' · ' + _histFecha(facial.fecha) : ''), facial.obsExtra]);
      }
      if (facial && facial.alergias && String(facial.alergias).trim()) {
        _obsItems.push(['Facial · Alergias ⚠️', facial.alergias]);
      }
      // Pestañas (Yadira / Diana): puede haber varias fichas
      (pest || []).forEach(function(fp){
        if (fp && fp.obs && String(fp.obs).trim()) {
          _obsItems.push(['Pestañas' + (fp.fecha ? ' · ' + _histFecha(fp.fecha) : ''), fp.obs]);
        }
      });
      // Cejas / Pigmento (María / Keyla / Lesly): puede haber varias fichas
      var _pigArr = (r.fichaPigmento && Array.isArray(r.fichaPigmento.fichas)) ? r.fichaPigmento.fichas : (pig ? [pig] : []);
      _pigArr.forEach(function(fc){
        if (fc && fc.observaciones && String(fc.observaciones).trim()) {
          var _lbl = 'Cejas / Pigmento'
            + (fc.responsable ? ' · ' + fc.responsable : '')
            + (fc.fecha ? ' · ' + _histFecha(fc.fecha) : '');
          _obsItems.push([_lbl, fc.observaciones]);
        }
      });
    } catch(e) { console.error('consolidar obs staff', e); }
    html += '<div style="font-size:11px;font-weight:700;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin:14px 4px 6px;">Observaciones</div>';
    if (!_obsItems.length) {
      html += '<div class="card" style="padding:14px;color:var(--ink-faint);font-size:13px;">Sin observaciones registradas.</div>';
    } else {
      html += '<div class="card" style="padding:10px 14px;">' + _obsItems.map(function(o){
        return '<div style="padding:7px 0;border-bottom:1px solid var(--line);">'
          + '<div style="font-size:11px;font-weight:700;color:var(--accent-deep);">' + o[0] + '</div>'
          + '<div style="font-size:13px;margin-top:2px;white-space:pre-wrap;">' + String(o[1]) + '</div></div>';
      }).join('') + '</div>';
    }

    html += '<div style="font-size:11px;font-weight:700;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin:14px 4px 6px;">Historial de visitas</div>';
    if (!hist.length) {
      html += '<div class="card" style="padding:14px;color:var(--ink-faint);font-size:13px;">Sin registros de servicios.</div>';
    } else {
      html += '<div class="card" style="padding:6px 14px;">' + hist.map(function(h){
        const val = h.valor ? '$' + (Number(h.valor)||0).toFixed(2) : '';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);">'
          + '<div><div style="font-weight:700;font-size:13px;">' + (h.servicio || h.area || 'Servicio') + '</div>'
          + '<div style="font-size:11px;color:var(--ink-soft);">' + _histFecha(h.fecha) + (h.staff ? ' · ' + h.staff : '') + '</div></div>'
          + '<div style="font-weight:700;font-size:13px;">' + val + '</div></div>';
      }).join('') + '</div>';
    }
    return html;
  }

  // Vuelve a la pantalla de inicio correcta según el rol (owner→ownerHome, admin→mikaelaHome, staff→staffHome)
  function volverInicioDesdeHistorial() {
    var rol = String((window.currentUser && window.currentUser.role) || '').toLowerCase();
    var map = { 'owner':'ownerHome','dueño':'ownerHome','dueno':'ownerHome','admin':'mikaelaHome','staff':'staffHome' };
    show(map[rol] || 'mikaelaHome');
  }
  window.volverInicioDesdeHistorial = volverInicioDesdeHistorial;

  async function abrirHistorialServicios() {
    show('historialClienta');
    const inp = document.getElementById('histBuscarInput');
    if (inp) inp.value = '';
    const perfil = document.getElementById('histPerfil');
    perfil.style.display = 'none'; perfil.innerHTML = '';
    const res = document.getElementById('histResultados');
    res.innerHTML = '<div style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">⏳ Cargando clientas…</div>';
    try {
      const r = await apiGet('getClientas');
      window._histClientas = (r && r.clientas) ? r.clientas : [];
      res.innerHTML = '<div style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">Escribí un nombre para buscar.</div>';
    } catch(e) {
      res.innerHTML = '<div style="text-align:center;padding:16px;color:var(--danger,#e53);font-size:13px;">Error al cargar clientas.</div>';
    }
  }
  window.abrirHistorialServicios = abrirHistorialServicios;

  function histFiltrarClientas(q) {
    const res = document.getElementById('histResultados');
    const lista = window._histClientas || [];
    q = String(q || '').trim().toLowerCase();
    document.getElementById('histPerfil').style.display = 'none';
    if (!q) { res.innerHTML = '<div style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">Escribí un nombre para buscar.</div>'; return; }
    const m = lista.filter(function(c){ return String(c.nombre||'').toLowerCase().includes(q) || String(c.codigo||'').toLowerCase().includes(q); }).slice(0, 25);
    if (!m.length) { res.innerHTML = '<div style="text-align:center;padding:16px;color:var(--ink-faint);font-size:13px;">Sin resultados.</div>'; return; }
    res.innerHTML = m.map(function(c){
      const ini = String(c.nombre||'?').split(' ').map(function(n){return n[0];}).join('').slice(0,2);
      const cod = String(c.codigo||'').replace(/'/g,'');
      return '<div onclick="histSeleccionarClienta(\'' + cod + '\')" class="card" style="margin-bottom:8px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;">'
        + '<div class="client-avatar" style="flex-shrink:0;">' + ini + '</div>'
        + '<div style="flex:1;"><div style="font-weight:700;font-size:14px;">' + (c.nombre||'') + '</div>'
        + '<div style="font-size:11px;color:var(--ink-soft);">' + (c.codigo||'') + (c.ultimaVisita ? ' · última: ' + _histFecha(c.ultimaVisita) : '') + '</div></div>'
        + '<div style="color:var(--ink-faint);">›</div></div>';
    }).join('');
  }
  window.histFiltrarClientas = histFiltrarClientas;

  async function histSeleccionarClienta(codigo) {
    const perfil = document.getElementById('histPerfil');
    document.getElementById('histResultados').innerHTML = '';
    const inp = document.getElementById('histBuscarInput');
    if (inp) inp.value = '';
    perfil.style.display = 'block';
    perfil.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint);font-size:13px;">⏳ Cargando historial…</div>';
    try {
      const r = await apiGet('getHistorialClienta', { codigo: codigo });
      if (!r || !r.success) { perfil.innerHTML = '<div class="card" style="padding:16px;color:var(--danger,#e53);">No se pudo cargar el historial.</div>'; return; }
      perfil.innerHTML = _histRenderPerfil(r);
    } catch(e) {
      perfil.innerHTML = '<div class="card" style="padding:16px;color:var(--danger,#e53);">Error de conexión.</div>';
    }
  }
  window.histSeleccionarClienta = histSeleccionarClienta;

  async function renderWaitList() {
    const user = window.currentUser;
    if (!user || user.role !== 'staff') return;
    
    const content = document.getElementById('waitListContent');
    content.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">⏳ Cargando lista...</div>';
    
    // Intentar cargar desde API
    let lista = [];
    try {
      // Mapa de clientas frecuentes por área (para las estrellas de color)
      try {
        const fr = await apiGet('getClientasFrecuentes');
        if (fr && fr.success) window._frecMapa = fr.mapa || {};
      } catch(eFr) {}
      const result = await apiGet('getListaEspera');
      if (result.success && result.lista) {
        lista = result.lista.map(w => {
          const areaRaw = String(w.area || '').toLowerCase();
          const areaMap = { 'cejas': 'cejas', 'depilación': 'depilacion', 'depilacion': 'depilacion', 'pestañas': 'pestanas', 'pestanas': 'pestanas', 'facial': 'facial', 'lifting / retiro': 'retiro_lifting', 'pestañas/cejas': 'retiro_lifting', 'retiro_lifting': 'retiro_lifting' };
          return {
            id: w.id,
            code: w.codigo,
            name: w.nombre,
            service: w.servicio,
            area: areaMap[areaRaw] || areaRaw,
            priority: String(w.prioridad || 'normal').toLowerCase(),
            waiting: w.horaLlegada || '?',
            obs: w.observaciones || '',
            isTop: String(w.esTop || '').toLowerCase().includes('sí'),
            asignadaA: w.asignadaA || '',
            promoNombre: w.promoNombre || '',
            precioPromo: w.precioPromo || '',
            precioRegular: w.precioRegular || '',
            total: w.total || 0,
            secuencia: w.secuencia || [],
            promasExtra: w.promasExtra || []
          };
        });
      }
    } catch (err) {
      console.error('Error cargando lista:', err);
    }

    // Lista siempre viene del API o está vacía

    const allowed = AREA_FILTER[user.area] || [];
    
    // Filtrar por área Y por asignación directa
    window._listaEsperaCache = lista;

    const myList = lista.filter(w => {
      const estado = String(w.estado || w.status || '').toLowerCase();
      if (estado === 'en servicio' || estado === 'completada') return false;
      // MODELO CENTRALIZADO: la staff ve SOLO sus clientas asignadas.
      // Robusto: la columna J (tomadaPor) siempre guarda la staff asignada,
      // aunque el estado quede en 'Esperando'. Así no depende de que el backend
      // ya esté redeployado escribiendo 'Asignada'.
      const quien = (w.asignadaA && String(w.asignadaA).trim())
                 || (w.tomadaPor && String(w.tomadaPor).trim()) || '';
      return quien !== '' && quien === user.name;
    });
    
    document.getElementById('waitCountMy').textContent = myList.length;
    document.getElementById('waitCountAll').textContent = lista.length;
    document.getElementById('navBadge').textContent = myList.length;
    document.getElementById('navBadge2').textContent = myList.length;
    document.getElementById('pendingStat').querySelector('.value').textContent = myList.length;
    
    if (myList.length === 0) {
      content.innerHTML = '<div class="card" style="text-align: center; padding: 40px 20px; color: var(--ink-faint);"><div style="font-size: 40px; margin-bottom: 8px;">✨</div><div>No hay clientas esperando para tu área</div></div>';
      return;
    }
    
    const priOrder = { 'tiempo': 0, 'normal': 1, 'especial': 2 };
    myList.sort((a, b) => (priOrder[a.priority] || 1) - (priOrder[b.priority] || 1));
    
    const priBadge = {
      'especial': '<span class="priority-badge especial">🔴 Especial</span>',
      'tiempo': '<span class="priority-badge tiempo">🟡 Con tiempo</span>',
      'normal': '<span class="priority-badge normal">🟢 Normal</span>',
    };
    
    content.innerHTML = myList.map((w, idx) => {
      // Guardar en objeto global
      if (!window._waitListData) window._waitListData = {};
      window._waitListData[idx] = w;
      
      return `
      <div class="waitlist-card priority-${w.priority} ${w.isTop ? 'is-top' : ''}">
        <div class="waitlist-top">
          <div class="waitlist-client">
            <div class="waitlist-code">${w.code} · llegó ${w.waiting}</div>
            <div class="waitlist-name">${clienteDisplay(w.name, w.code)}${estrellasFrecuente(w.code)}${w.isTop ? ' <span class="top-star">⭐ TOP</span>' : ''}${w.asignadaA ? ' <span style="background: var(--accent-bg); color: var(--accent); font-size: 10px; padding: 2px 8px; border-radius: 100px; font-weight: 700; margin-left: 6px;">Asignada directamente</span>' : ''}</div>
          </div>
          ${priBadge[w.priority] || priBadge['normal']}
        </div>
        <div class="waitlist-service"><strong>${w.service}</strong></div>
        ${w.isTop ? '<div class="top-paciencia">⭐ Cliente frecuente. Brindale el trato premium habitual.</div>' : ''}
        ${(function() {
          var obs = w.obs || '';
          var parts = obs.split('|');
          var compPart = parts.find(function(p){ return p.indexOf('✅') >= 0; });
          if (compPart) {
            var clean = compPart.replace(/_completedAreas:[^|]*/,'').trim();
            return '<div style="display:flex;align-items:center;gap:6px;margin-top:5px;padding:5px 10px;background:var(--success-bg);border-radius:8px;">'
              + '<span style="font-size:12px;">✅</span>'
              + '<span style="font-size:11px;color:var(--success);font-weight:700;">' + clean + '</span>'
              + '</div>';
          }
          return obs ? '<div class="waitlist-obs">📝 ' + obs + '</div>' : '';
        })()}
        <div class="waitlist-actions">
          <button class="btn-take" onclick='openTake(${idx})'>Tomar clienta</button>
        </div>
      </div>
    `;
    }).join('');
  }

  function openTake(idx) {
    const w = window._waitListData[idx];
    if (!w) { alert('Error: no se encontró la clienta'); return; }

    // Bloquear si está asignada a otra staff
    const user = window.currentUser;
    if (w.asignadaA && w.asignadaA.trim() !== '' && w.asignadaA !== (user?.name || '')) {
      alert('⚠️ Esta clienta está asignada directamente a ' + w.asignadaA + '. Solo ella puede tomarla.');
      return;
    }
    
    window._takingData = w;
    window._takingId = w.id;
    window._takingClient = w.name;
    window._takingClientCode = w.codigo || w.code || '';
    window._takingService = w.service;
    
    const topPart = w.isTop ? ' <span class="top-star">⭐ TOP</span>' : '';
    let _svcDisplay4 = String(w.service || '');
    if (_svcDisplay4.trim().startsWith('{')) {
      try { _svcDisplay4 = JSON.parse(_svcDisplay4).nombre || _svcDisplay4; }
      catch(e) { const m4 = _svcDisplay4.match(/"nombre"\s*:\s*"([^"]+)"/); if (m4) _svcDisplay4 = m4[1]; }
    }
    document.getElementById('takeText').innerHTML = `Vas a tomar a <strong>${clienteDisplay(w.name, w.code)}</strong>${topPart}<br>para <strong>${_svcDisplay4}</strong>.<br>Se registrará la hora automáticamente.`;

    const splitEl = document.getElementById('takeDepiSplit');
    const normalEl = document.getElementById('takeNormal');

    // ── TICKET MULTI (TM-): mostrar solo el área de esta staff, botón simple ──
    if (w.id && String(w.id).startsWith('TM-')) {
      const areaLabels3 = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', facial:'Facial', retiro_lifting:'Lifting/Retiro' };
      const areaLabel3 = areaLabels3[String(w.area||'').toLowerCase()] || w.area || 'Servicio';
      document.getElementById('takeText').innerHTML =
        `Vas a tomar a <strong>${clienteDisplay(w.name, w.code)}</strong>${topPart}<br>`
        + `Área: <strong>${areaLabel3}</strong> · <strong>${_svcDisplay4}</strong><br>`
        + `<span style="font-size:12px;color:var(--ink-soft);">Este es tu servicio asignado en el ticket multi.</span>`;
      splitEl.style.display = 'none';
      normalEl.style.display = 'block';
      document.getElementById('takeModal').classList.add('active');
      return;
    }
    // Formato: "[✅Lesly: Cejas $12] | Limpieza profunda"
    const servicioStr0 = String(w.service || '');
    const tieneHistorial = servicioStr0.includes('✅');

    if (tieneHistorial) {
      // Separar partes: completadas (entre []) vs pendiente (lo que sigue después)
      const partesCompletas = [];
      const regexCompleta = /\[✅([^\]]+)\]/g;
      let m;
      while ((m = regexCompleta.exec(servicioStr0)) !== null) {
        partesCompletas.push(m[1].trim()); // ej: "Lesly: Cejas $12"
      }
      // La parte pendiente es lo que viene después del último "]"
      const lastBracket = servicioStr0.lastIndexOf(']');
      const pendiente = lastBracket >= 0 ? servicioStr0.substring(lastBracket + 1).replace(/^\s*[|\-]\s*/, '').trim() : servicioStr0;
      // Área del ticket
      const areaLabel = String(w.area || 'Servicio');
      const areaLabels2 = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', facial:'Facial', retiro_lifting:'Lifting/Retiro' };

      // Mostrar en el split: partes completadas (readonly) + pendiente (seleccionable)
      const items = [];
      partesCompletas.forEach(p => items.push({ nombre: p, precio: 0, checked: false, readonly: true, completado: true }));
      items.push({ nombre: areaLabels2[areaLabel] || pendiente || areaLabel, precio: Number(w.total) || 0, checked: true, readonly: false, completado: false });

      window._depiItems = items;
      splitEl.style.display = 'block';
      normalEl.style.display = 'none';
      renderDepiItems();
      document.getElementById('takeModal').classList.add('active');
      return;
    }

    // ── DEPILACIÓN CORPORAL: múltiples ítems ──
    const esDepi = w.area === 'depilacion' || servicioStr0.toLowerCase().includes('depi') || servicioStr0.toLowerCase().includes('bikini') || servicioStr0.toLowerCase().includes('pierna') || servicioStr0.toLowerCase().includes('axila');

    if (esDepi) {
      let servicioRaw3 = servicioStr0;
      if (servicioRaw3.trim().startsWith('{')) {
        try { servicioRaw3 = JSON.parse(servicioRaw3).nombre || servicioRaw3; }
        catch(e) { const m3 = servicioRaw3.match(/"nombre"\s*:\s*"([^"]+)"/); if (m3) servicioRaw3 = m3[1]; }
      }
      const partes = servicioRaw3.split(/\s*[\+\,]\s*/).map(s => s.trim()).filter(s => s && !s.includes('continuac') && !s.includes('completado'));
      const items = partes.map(nombre => {
        const catalogoDepi = CATALOGO.depilacion || [];
        const match = catalogoDepi.find(c => c.name.toLowerCase().includes(nombre.toLowerCase()) || nombre.toLowerCase().includes(c.name.toLowerCase()));
        return { nombre, precio: match ? Number(match.price) : 0, checked: true };
      });
      window._depiItems = items;
      if (items.length > 1) {
        splitEl.style.display = 'block';
        normalEl.style.display = 'none';
        renderDepiItems();
      } else {
        splitEl.style.display = 'none';
        normalEl.style.display = 'block';
      }
    } else {
      splitEl.style.display = 'none';
      normalEl.style.display = 'block';
    }

    document.getElementById('takeModal').classList.add('active');
  }

  function renderDepiItems() {
    const items = window._depiItems || [];
    const el = document.getElementById('takeDepiItems');
    if (!el) return;
    el.innerHTML = items.map((item, i) => {
      if (item.readonly || item.completado) {
        // Área ya completada — solo lectura, no desmarcable
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;opacity:0.9;">
          <span style="font-size:18px;flex-shrink:0;">✅</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--success);">${item.nombre}</div>
            <div style="font-size:11px;color:var(--success);font-weight:600;">Ya realizado</div>
          </div>
        </div>`;
      }
      // Área pendiente — seleccionable
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--info-bg);border-radius:12px;margin-bottom:8px;cursor:pointer;border:2px solid var(--info);">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleDepiItem(${i}, this.checked)"
          style="width:18px;height:18px;accent-color:var(--info);flex-shrink:0;">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:800;color:var(--info);">👇 Tu servicio: ${item.nombre}</div>
          ${item.precio > 0 ? `<div style="font-size:11px;color:var(--info);font-weight:600;">$${item.precio} — Confirmá o cambiá al tomar</div>` : '<div style="font-size:11px;color:var(--info);">Confirmá el servicio al tomar</div>'}
        </div>
        ${item.checked ? '<span style="font-size:16px;">✅</span>' : '<span style="font-size:16px;opacity:0.3;">⬜</span>'}
      </label>`;
    }).join('');
    updateDepiTotal();
  }

  function toggleDepiItem(idx, checked) {
    if (window._depiItems && window._depiItems[idx] !== undefined) {
      window._depiItems[idx].checked = checked;
      renderDepiItems();
    }
  }

  function updateDepiTotal() {
    const items = window._depiItems || [];
    // Only sum non-readonly (pending) items
    const total = items.filter(i => i.checked && !i.readonly && !i.completado).reduce((sum, i) => sum + Number(i.precio || 0), 0);
    const el = document.getElementById('takeDepiTotal');
    if (el) el.textContent = '$' + total;
  }

  async function confirmTakeDepiAll() {
    // La staff hace todo el servicio pendiente — flujo normal
    window._depiItems = (window._depiItems || []).map(i => ({
      ...i,
      checked: i.readonly || i.completado ? false : true  // no marcar los ya completados
    }));
    await confirmTake();
  }

  async function confirmTakeDepi() {
    const items = window._depiItems || [];
    // Ignorar items readonly (ya completados) — solo procesar los pendientes
    const itemsPendientes = items.filter(i => !i.readonly && !i.completado);
    const misItems = itemsPendientes.filter(i => i.checked);
    const restItems = itemsPendientes.filter(i => !i.checked);

    if (misItems.length === 0) {
      alert('Seleccioná al menos un servicio para hacer vos.');
      return;
    }

    if (restItems.length === 0) {
      // Todo lo pendiente lo hace esta staff — flujo normal
      await confirmTake();
      return;
    }

    // Flujo compartido: guardar qué hace esta staff y qué queda pendiente
    window._depiMisParts = misItems;
    window._depiRestParts = restItems;
    window._esSplitDepi = true;
    await confirmTake();
  }
  async function confirmTake() {
    closeModal();
    const user = window.currentUser;
    const name = user ? user.name : 'Staff';
    const takingId = String(window._takingId || '');

    // Validar asignación directa ANTES de llamar al backend
    const takingDataCheck = window._takingData;
    if (takingDataCheck && takingDataCheck.asignadaA && takingDataCheck.asignadaA.trim() !== '') {
      if (takingDataCheck.asignadaA !== name) {
        alert('⚠️ Esta clienta está asignada directamente a ' + takingDataCheck.asignadaA + '. No podés tomarla.');
        return;
      }
    }

    // ── TICKET MULTI: usar endpoint específico ────────────────
    if (takingId.startsWith('TM-')) {
      try {
        const result = await apiPost('tomarAreaTicketMulti', {
          idEspera:    takingId,
          chicaNombre: name,
          chicaArea:   user?.area || '',
          areaIdx:     window._takingData?.areaIdx || 0
        });
        if (!result.success) { alert(result.message || 'Error al tomar el servicio TM'); return; }
        simulateNotif('mikaela', name + ' tomó área TM de ' + (window._takingClientCode || 'clienta'), 'Ticket multi · ahora', false);
      } catch(err) {
        alert('Error de conexión'); return;
      }
      // Continuar al flujo de carga del panel (sin promo)
      window._availablePromo = null;
      window._takingSecuencia = window._takingData ? (window._takingData.secuencia || []) : [];
      window._takingPromasExtra = [];
    } else {
    // ── FLUJO NORMAL / SN / SP / LE ──────────────────────────
    try {
      const result = await apiPost('tomarClienta', {
        idListaEspera: window._takingId,
        chicaNombre: name
      });
      if (result.success) {
        simulateNotif('mikaela', name + ' tomó a ' + (window._takingClientCode || 'una clienta'), 'Lista de espera · ahora', false);
      } else if (result.message) {
        alert(result.message);
        return;
      }
    } catch (err) {
      console.error('Error al tomar clienta:', err);
      alert('Error al tomar la clienta. Intentá de nuevo.');
      return;
    }
    
    // Guardar la promo disponible (si existe) pero NO aplicarla automáticamente
    const takingData = window._takingData;
    const clientKey = normalizeClientKey(window._takingClient || '');

    if (takingData && takingData.promoNombre && takingData.promoNombre.trim() !== '') {
      window._availablePromo = {
        name: takingData.promoNombre,
        price: takingData.precioPromo,
        regular: takingData.precioRegular
      };
    } else {
      window._availablePromo = null;
      if (takingId.startsWith('SN-') && clientKey) {
        delete activePromos[clientKey];
        saveActivePromos();
      }
    }
    window._takingSecuencia = takingData ? (takingData.secuencia || []) : [];
    window._takingPromasExtra = takingData ? (takingData.promasExtra || []) : [];
    try {
      if (window._takingPromasExtra.length > 0) {
        sessionStorage.setItem('nexserv_promasExtra_' + (window._as1IdEspera||''), JSON.stringify(window._takingPromasExtra));
      }
    } catch(eS) {}
    } // ── fin else flujo normal ────────────────────────────────

    // Cargar clienta normalmente
    await loadClientAfterTake();
  }
  
  // ── Nota directa de Mikaela/recepción para la staff (cartel amarillo) ──
  // Separa la nota humana de la visita del texto que agrega el sistema (enganche ✅, "Pasado por…", etc.)
  function _extraerNotaRecepcion(obsRaw){
    var s = String(obsRaw == null ? '' : obsRaw).trim();
    if (!s) return '';
    var partes = s.split(/\s*\|\s*|\n+/);
    var sys = [/^✅/, /^Continuaci/i, /^Pasad[oa] por/i, /^Servicio adicional/i, /^Devuelt[oa]/i, /durante atenci/i, /termin[oó] su parte/i];
    var humanas = [];
    for (var i = 0; i < partes.length; i++){
      var p = partes[i].trim();
      if (!p) continue;
      var esSys = false;
      for (var j = 0; j < sys.length; j++){ if (sys[j].test(p)) { esSys = true; break; } }
      if (!esSys) humanas.push(p);
    }
    return humanas.join(' · ').trim();
  }
  function _setNotaRecepcion(panel, obsRaw){
    var el = document.getElementById('as' + panel + 'NotaMikaela');
    if (!el) return;
    var nota = _extraerNotaRecepcion(obsRaw);
    var txt = document.getElementById('as' + panel + 'NotaMikaelaTxt');
    if (nota){
      if (txt) { txt.textContent = nota; txt.style.display = 'block'; } // arranca visible en cada clienta
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }
  // El asterisco oculta/muestra el texto de la nota (privacidad: que la clienta no lo vea)
  function toggleNotaRecepcion(panel){
    var t = document.getElementById('as' + panel + 'NotaMikaelaTxt');
    if (!t) return;
    t.style.display = (t.style.display === 'none') ? 'block' : 'none';
  }

  async function loadClientAfterTake() {
    const user = window.currentUser;
    const name = user ? user.name : 'Staff';
    
    // Cargar datos actualizados de las atenciones
    try {
      const atenResult = await apiGet('getAtenciones', { chica: name });
      if (atenResult.success && atenResult.atenciones && atenResult.atenciones.length > 0) {
        const aten = atenResult.atenciones;
        const slot = user && user.maxClients === 2 ? aten.length - 1 : 0;

        // Cargar la atención que REALMENTE se acaba de tomar (no por índice ingenuo).
        // Clave en tickets TM con varias áreas: evita cargar el área/promo de otra staff.
        const _takenId = String(window._takingId || '');
        let a = null;
        if (_takenId) a = aten.find(function(x){ return String(x.idEspera || '') === _takenId; }) || null;
        if (!a) a = aten[slot];
        if (slot === 0) {
          window._as1Client = a.codigo;
          window._as1IdEspera = a.idEspera || window._takingId || ''; // ID ticket LE-XXXX
          const initials = (a.nombre || '').split(' ').map(n=>n[0]).join('').slice(0,2);
          const _as1av0 = document.getElementById('as1Avatar');
          if (_as1av0) { _as1av0.textContent = initials; _as1av0.className = 'client-avatar' + (a.esTop ? ' is-top' : ''); }
          pintarNombre('as1Name', a.nombre, a.codigo, a.esTop);
          const _as1cd0 = document.getElementById('as1Code');
          if (_as1cd0) _as1cd0.textContent = a.codigo + (a.horaLlegada ? ' · Llegó ' + a.horaLlegada : '');
          // Mostrar obs — puede contener historial de areas previas (✅ cejas completado...)
          const obsText = a.obsGeneral || a.observaciones || '';
          const _obs1d = document.getElementById('obs1Display');
          if (_obs1d) _obs1d.textContent = obsText || 'Sin observaciones';
          _setNotaRecepcion(1, a.observaciones);
          // Destacar si hay servicios previos en las observaciones
          if (obsText && obsText.includes('✅')) {
            document.getElementById('obs1Display').style.color = 'var(--success-dark, #2a7a4b)';
            document.getElementById('obs1Display').style.fontWeight = '600';
          } else {
            document.getElementById('obs1Display').style.color = '';
            document.getElementById('obs1Display').style.fontWeight = '';
          }
          renderSecuenciaBanner(1, a.secuencia && a.secuencia.length > 0 ? a.secuencia : (window._takingSecuencia || []));
          
          // Limpiar servicios previos
          slotServices[1] = [];
          document.getElementById('as1ServicesList').innerHTML = '';
          document.getElementById('as1SvcCount').textContent = '0';
          document.getElementById('as1Total').textContent = '$0';
          const prevInfo1 = document.getElementById('promoAssignedInfo1'); if (prevInfo1) prevInfo1.remove();

          // Detectar si viene de enganche (otra área ya completó parte del servicio)
          const esEnganche = obsText && obsText.includes('✅');
          window._esEnganche = esEnganche;
          window._desgloseAcumulado = []; // reset al tomar nueva clienta

          // Si viene como enganche, guardar el historial anterior en desglose acumulado
          if (esEnganche) {
            // Parsear las partes del historial de obs "✅ NombreArea completado por Staff · Sigue: ..."
            const partes = obsText.split(' | ').filter(p => p.includes('✅'));
            window._desgloseAcumulado = partes.map(p => {
              const match = p.match(/✅\s*(.*?)\s+completado por\s+(.*?)\s+·/);
              return match ? { staff: match[2].trim(), servicio: match[1].trim(), area: match[1].trim(), monto: 0, esHistorico: true } : null;
            }).filter(Boolean);
          }
          
          // Si es depilación compartida (split), cargar solo los servicios de esta staff
          if (window._esSplitDepi && window._depiMisParts && window._depiMisParts.length > 0) {
            slotServices[1] = window._depiMisParts.map(item => ({
              name: item.nombre,
              price: item.precio || 0,
              area: 'depilacion',
              status: undefined
            }));
            const totalMio = slotServices[1].reduce((s, v) => s + Number(v.price), 0);
            renderServicesForSlot(1);
            document.getElementById('as1Total').textContent = '$' + totalMio;
            document.getElementById('as1SvcCount').textContent = String(slotServices[1].length);
            window._depiRestPending = window._depiRestParts || [];
            window._esSplitDepi = false;
          } else if (window._esSplitDepi) {
            window._esSplitDepi = false;
          }

          // Si viene con servicio normal (NO promo), cargarlo
          if (a.servicio && a.servicio !== '—' && !a.promoNombre && !window._availablePromo && !(window._depiMisParts && window._depiMisParts.length > 0)) {
            // El servicio puede venir como JSON string {"nombre":"...","precio":17} o como texto plano
            let servicioNombre = a.servicio;
            let servicioPrecio = Number(a.total) || 0;
            try {
              if (String(a.servicio).trim().startsWith('{')) {
                const svcObj = JSON.parse(a.servicio);
                servicioNombre = svcObj.nombre || svcObj.name || a.servicio;
                servicioPrecio = Number(svcObj.precio || svcObj.price || a.total) || 0;
              }
            } catch(e) {}
            // Limpiar el nombre — puede ser código JSON si el parse falló
            if (servicioNombre && servicioNombre.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(servicioNombre);
                servicioNombre = parsed.nombre || parsed.name || servicioNombre;
              } catch(e2) { servicioNombre = 'Servicio'; }
            }
            slotServices[1].push({
              name: servicioNombre,
              price: servicioPrecio,
              area: a.area
            });
            // Si tiene serviciosDetalle (mismo área combinado), cargar todos
            if (a.serviciosDetalle && a.serviciosDetalle.length > 1) {
              slotServices[1] = a.serviciosDetalle.map(sd => ({
                name: sd.servicio || sd.nombre || sd.name || '',
                price: Number(sd.precio || sd.price || 0),
                area: a.area, status: undefined
              }));
              const totalCombinado = slotServices[1].reduce((s, v) => s + Number(v.price), 0);
              renderServicesForSlot(1);
              document.getElementById('as1Total').textContent = '$' + totalCombinado;
              document.getElementById('as1SvcCount').textContent = String(slotServices[1].length);
            } else {
              renderServicesForSlot(1);
              document.getElementById('as1Total').textContent = '$' + servicioPrecio;
              document.getElementById('as1SvcCount').textContent = '1';
            }
          }
          
          // Limpiar promo residual si este servicio no tiene promo
          if (!window._availablePromo) {
            const clientKeyClean = normalizeClientKey(a.nombre);
            if (activePromos[clientKeyClean]) delete activePromos[clientKeyClean];
          }
          
          // Si viene con promo asignada, guardarla pero permitir cambiarla
          if (window._availablePromo) {
            const promoBasic = window._availablePromo;
            
            // Buscar la promo completa en PROMOS
            const promoFull = PROMOS.find(p => p.name === promoBasic.name);
            
            if (promoFull) {
              try { // Wrap promo loading to prevent crashes stopping confirmServiceModal
              // Guardar promo completa
              if (!window._assignedPromo) window._assignedPromo = {};
              window._assignedPromo[1] = promoFull;
              
              // ✅ AGREGAR: Auto-agregar la promo a slotServices para que el botón "Finalizar" funcione
              const myArea = user?.area || 'cejas';

              // Restaurar completedAreas PRIMERO — necesario para calcular precio correcto
              var restoredCompletedAreas = [];
              try {
                var _obsAllFields = String(a.observaciones || a.obs || a.obsGeneral || a.obsText || '');
                var _matchComp = _obsAllFields.match(/_completedAreas:(\[[^\]]*\])/);
                if (_matchComp) restoredCompletedAreas = JSON.parse(_matchComp[1]);
                console.log('completedAreas parse:', _obsAllFields.substring(0, 100), '->', restoredCompletedAreas);
              } catch(eComp) { console.warn('completedAreas parse error:', eComp); }

              // Para SP de enganche: usar a.precioMiArea (monto de esta área específica)
              // Para promo compartida: excluir completedAreas → la 2da staff ve solo su parte
              const precioMiAreaSP = Number(a.precioMiArea || 0);
              // El precioMiArea horneado puede traer el del ÁREA PRIORITARIA (la más cara, p.ej.
              // pestañas), no la de ESTA staff. En promos multi-área SIEMPRE calculamos desde MI área.
              const _esMultiArea = (promoFull.division || []).length > 1;
              const myPrice = (!_esMultiArea && precioMiAreaSP > 0)
                ? precioMiAreaSP
                : getMyPromoPrice(promoFull, myArea, restoredCompletedAreas);
              
              slotServices[1].push({
                name: promoFull.name,
                area: myArea,
                price: myPrice
              });
              
              // Actualizar UI
              renderServicesForSlot(1);
              document.getElementById('as1Total').textContent = '$' + myPrice;
              document.getElementById('as1SvcCount').textContent = '1';

              // Fix 2: partes previas (promo compartida) — mostrar como historial readonly
              if (a.serviciosDetalle && a.serviciosDetalle.length > 0) {
                window._desgloseAcumulado = a.serviciosDetalle;
                const svcListEl = document.getElementById('as1ServicesList');
                if (svcListEl) {
                  const histHtml = a.serviciosDetalle.map(function(d) {
                    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;">'
                      + '<span style="font-size:16px;">&#x2705;</span>'
                      + '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">'
                      + (d.servicio || d.area || 'Servicio previo') + ' &middot; ' + (d.staff || '&mdash;')
                      + '</div><div style="font-size:11px;color:var(--success);">Completado</div></div>'
                      + '<div style="font-size:13px;font-weight:800;color:var(--success);">$' + (d.monto || 0) + '</div>'
                      + '</div>';
                  }).join('');
                  svcListEl.insertAdjacentHTML('afterbegin', histHtml);
                }
              }
              
              // Registrar promo activa con key normalizada
              const clientKey = normalizeClientKey(a.nombre);
              // (restoredCompletedAreas ya fue calculado arriba)
              console.log('🔍 completedAreas restored:', restoredCompletedAreas);
              activePromos[clientKey] = {
                promo: promoFull,
                startedBy: myArea,
                completedAreas: restoredCompletedAreas,
                _metadata: {
                  displayName: a.nombre,
                  clientCode: a.codigo,
                  registeredAt: Date.now()
                }
              };
              saveActivePromos(); // persistir

              // Actualizar botones de finalización con las completedAreas restauradas
              setTimeout(() => updateFinishButtons(1), 400);

              console.log('✅ Promo registered:', {
                key: clientKey,
                display: a.nombre,
                promo: promoFull.name,
                activePromos: Object.keys(activePromos)
              });
              
              // Modificar el botón de promo para mostrar que hay una asignada
              const promoBtn = document.getElementById('promoBtn1');
              if (promoBtn) {
                promoBtn.innerHTML = '✓ Promo aplicada';
                promoBtn.style.background = 'var(--success)';
              }
              
              // Mostrar info de la promo asignada con servicios incluidos
              const infoDiv = document.createElement('div');
              infoDiv.id = 'promoAssignedInfo1';
              infoDiv.style.cssText = 'background: linear-gradient(135deg, #fff5f7 0%, #ffe8ef 100%); border: 2px solid #ff6b9d; padding: 12px 16px; border-radius: 12px; margin-bottom: 14px; font-size: 13px;';
              infoDiv.innerHTML = `
                <div style="font-weight: 700; color: #c44569; margin-bottom: 4px;">💝 Promo asignada por Mikaela</div>
                <div style="color: #1a1a1a; font-weight: 600; margin-bottom: 4px;">${promoFull.name}</div>
                <div style="color: #666; font-size: 11px; margin-bottom: 6px;">${promoFull.services}</div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
                  ${promoFull.division.map(d => '<span style="background: white; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; color: #c44569;">' + d.area + ' $' + d.monto + '</span>').join('')}
                </div>
                <div style="color: #666; font-size: 11px;">Podés aplicar esta o elegir otra si la clienta lo prefiere</div>
              `;
              const actionBtns = document.getElementById('as1ActionBtns');
              if (actionBtns) {
                actionBtns.parentNode.insertBefore(infoDiv, actionBtns);
              }

              // Mostrar banner de promasExtra si hay mas promos pendientes
              const promasExtraActuales = window._takingPromasExtra || [];
              if (promasExtraActuales.length > 0) {
                const extraDiv = document.createElement('div');
                extraDiv.id = 'promoExtraInfo1';
                extraDiv.style.cssText = 'background: #fff8e1; border: 1.5px solid #f0c040; padding: 10px 14px; border-radius: 12px; margin-bottom: 12px; font-size: 12px;';
                extraDiv.innerHTML = '<div style="font-weight:700;color:#8a6d00;margin-bottom:4px;">Despues de esta promo, la clienta tiene:</div>' +
                  promasExtraActuales.map(function(p,i){ return '<div style="color:#5a4a00;font-weight:600;">' + (i+1) + '. ' + p.nombre + ' ($' + p.precio + ')</div>'; }).join('');
                if (actionBtns) actionBtns.parentNode.insertBefore(extraDiv, actionBtns);
              }
              } catch(ePromo) { console.error('Error cargando promo:', ePromo); }
            }
          }
          
          if (user.area === 'pestanas') {
            // FIX: cargar fichas del sheet antes de mostrar el panel
            const _pestKey1 = a.codigo.toLowerCase().replace(/-/g, '');
            const _pestCodigo1 = a.codigo;
            apiGet('getFichaPestanas', { codigo: _pestCodigo1 }).then(pr => {
              if (pr.success && pr.fichas && pr.fichas.length > 0) {
                if (!CLIENT_PROFILES[_pestKey1]) CLIENT_PROFILES[_pestKey1] = { name: a.nombre, code: _pestCodigo1, pestanas: { fichas: [], history: [] } };
                if (!CLIENT_PROFILES[_pestKey1].pestanas) CLIENT_PROFILES[_pestKey1].pestanas = { fichas: [], history: [] };
                CLIENT_PROFILES[_pestKey1].pestanas.fichas = pr.fichas;
                CLIENT_PROFILES[_pestKey1].pestanas.ultimaVisita = pr.ultimaVisita;
              }
              loadPestFichaQuick(_pestKey1, 1);
            }).catch(() => loadPestFichaQuick(_pestKey1, 1));
          }

          // ── MANDAMIENTO #7: facial siempre carga su ficha al abrir clienta ──
          if (user.area === 'facial') {
            const _fKey1 = (a.codigo || '').toLowerCase().replace(/-/g, '');
            window._currentFacialClientKey = _fKey1;
            window._currentFacialClientNombre = a.nombre;
            window._currentFacialClientCodigo = a.codigo;
            const _fSvcs1 = slotServices[1] || [];
            window._currentFacialSvcName  = _fSvcs1.filter(s => s.status !== 'rechazado').map(s => s.name).join(' + ') || '';
            window._currentFacialSvcPrice = _fSvcs1.filter(s => s.status !== 'rechazado').reduce((s,v) => s + Number(v.price||0), 0);
            window._facialFichaSlot = 1;
            setTimeout(function() { loadFacialFichaQuick(_fKey1, 1); }, 400);
          }

          // Limpiar SIEMPRE el panel de ficha cejas/pigmento antes de decidir si mostrarlo.
          // Evita que quede pegada la ficha de una clienta/staff anterior (p. ej. si una staff
          // de cejas atendió en esta misma pestaña y luego entra una de pestañas/facial).
          var _cqClear1 = document.getElementById('cejasQuick1');
          if (_cqClear1) { _cqClear1.innerHTML = ''; _cqClear1.style.display = 'none'; }

          // Precargar ficha cejas pigmento si el servicio es de efecto polvo/permanente
          // Solo para chicas de CEJAS (pestañas/facial no deben ver la ficha de cejas/pigmento)
          if (user && String(user.area||'').toLowerCase().includes('ceja')) {
            const svcNameForPig = slotServices[1].find(function(s){ return esSrvPigmento(s.name); });
            if (svcNameForPig) {
              const cKey1 = (a.codigo || '').toLowerCase().replace(/-/g, '');
              setTimeout(function() {
                loadCejasQuick(cKey1, 1, a.codigo, a.nombre);
              }, 500);
            }
          }

          // Si es TM: cargar areas completas y mostrar botones correctos desde el inicio
          if (window._as1IdEspera && window._as1IdEspera.startsWith('TM-')) {
            apiGet('getTicketMulti').then(function(tmData) {
              if (tmData.success) {
                var tm = (tmData.activos || []).find(function(t) { return t.idEspera === window._as1IdEspera; });
                if (tm) {
                  window._tmAreasActuales = tm.areas || [];
                  var user2 = window.currentUser;
                  // Cargar TODOS los servicios de esta staff que están en servicio
                  var misAreas = (tm.areas || []).filter(function(ar) {
                    return ar.staff === (user2 && user2.name) && String(ar.estado||'').toLowerCase() === 'en servicio';
                  });
                  // Separar completadas y activas de esta staff
                  if (misAreas.length > 0) {
                    // PASO 1: slotServices + render (borra innerHTML)
                    slotServices[1] = misAreas.map(function(ar) {
                      return { name: ar.tentativo || ar.confirmado || '', price: ar.precio || 0, area: ar.area };
                    });
                    renderServicesForSlot(1);
                  }

                  // PASO 2: insertar chips completados DESPUÉS del render
                  var svcListElTM = document.getElementById('as1ServicesList');
                  if (areasCompletadasTM.length > 0 && svcListElTM) {
                    [...svcListElTM.querySelectorAll('.tm-completado-chip')].forEach(function(el){ el.remove(); });
                    var histHtmlTM = areasCompletadasTM.map(function(ar) {
                      return '<div class="tm-completado-chip" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;">'
                        + '<span style="font-size:16px;">✅</span>'
                        + '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">'
                        + (ar.tentativo || ar.area || 'Servicio previo')
                        + '</div><div style="font-size:11px;color:var(--success);">Completado</div></div>'
                        + '<div style="font-size:13px;font-weight:800;color:var(--success);">$' + (ar.precio || 0) + '</div>'
                        + '</div>';
                    }).join('');
                    svcListElTM.insertAdjacentHTML('afterbegin', histHtmlTM);
                  }

                  // PASO 3: total y contador
                  var totalActivosTM = (slotServices[1] || []).reduce(function(s,v){ return s + Number(v.price||0); }, 0);
                  var totalCompTM = areasCompletadasTM.reduce(function(s,ar){ return s + Number(ar.precio||0); }, 0);
                  document.getElementById('as1Total').textContent = '$' + (totalActivosTM + totalCompTM);
                  document.getElementById('as1SvcCount').textContent = String((slotServices[1]||[]).length + areasCompletadasTM.length);

                  // Mostrar botones TM correctos en el panel desde el inicio
                  setTimeout(function() { updateFinishButtons(1); }, 600);
                }
              }
              // TM: mostrar modal de confirmación igual que otros tipos
              // La staff debe confirmar/cambiar su servicio tentativo
              window.confirmarServicioObligatorio(1);
            }).catch(function() {
              window.confirmarServicioObligatorio(1);
              updateFinishButtons(1);
            });
          } else {
            // SP / promo compartida / enganche → siempre mostrar modal de confirmación
            window.confirmarServicioObligatorio(1);
          }
        } else {
          window._as2Client = a.codigo;
          window._as2IdEspera = a.idEspera || window._takingId || ''; // ID del ticket de la 2ª clienta
          const initials2b = a.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
          const _as2avb = document.getElementById('as2Avatar');
          if (_as2avb) { _as2avb.textContent = initials2b; _as2avb.className = 'client-avatar' + (a.esTop ? ' is-top' : ''); }
          pintarNombre('as2Name', a.nombre, a.codigo, a.esTop);
          const _as2cdb = document.getElementById('as2Code'); if (_as2cdb) _as2cdb.textContent = a.codigo + (a.horaLlegada ? ' · Llegó ' + a.horaLlegada : '');
          // Mostrar obs — puede contener historial de areas previas (✅ cejas completado...)
          const obsText2 = a.obsGeneral || a.observaciones || '';
          document.getElementById('obs2Display').textContent = obsText2 || 'Sin observaciones';
          _setNotaRecepcion(2, a.observaciones);
          // Destacar si hay servicios previos en las observaciones
          if (obsText2 && obsText2.includes('✅')) {
            document.getElementById('obs2Display').style.color = 'var(--success-dark, #2a7a4b)';
            document.getElementById('obs2Display').style.fontWeight = '600';
          } else {
            document.getElementById('obs2Display').style.color = '';
            document.getElementById('obs2Display').style.fontWeight = '';
          }
          
          // Limpiar servicios previos
          slotServices[2] = [];
          document.getElementById('as2ServicesList').innerHTML = '';
          document.getElementById('as2SvcCount').textContent = '0';
          document.getElementById('as2Total').textContent = '$0';
          const prevInfo2 = document.getElementById('promoAssignedInfo2'); if (prevInfo2) prevInfo2.remove();

          // Detectar si viene de enganche (otra área ya completó parte del servicio) — POR SLOT
          const esEnganche2 = obsText2 && obsText2.includes('✅');
          window._esEnganche2 = esEnganche2;
          window._desgloseAcumulado = []; // reset al tomar nueva clienta

          // Si viene como enganche, guardar el historial anterior en desglose acumulado
          if (esEnganche2) {
            const partes2 = obsText2.split(' | ').filter(p => p.includes('✅'));
            window._desgloseAcumulado = partes2.map(p => {
              const match = p.match(/✅\s*(.*?)\s+completado por\s+(.*?)\s+·/);
              return match ? { staff: match[2].trim(), servicio: match[1].trim(), area: match[1].trim(), monto: 0, esHistorico: true } : null;
            }).filter(Boolean);
          }
          
          // Si viene con servicio normal asignado (NO promo), cargarlo
          if (a.servicio && a.servicio !== '—' && !a.promoNombre && !window._availablePromo) {
            const price = a.total || 0;
            let _svcNom2 = a.servicio;
            if (_svcNom2.trim().startsWith('{')) {
              try { const p2 = JSON.parse(_svcNom2); _svcNom2 = p2.nombre || p2.name || _svcNom2; } catch(e) {}
            }
            slotServices[2].push({
              name: _svcNom2,
              price: price,
              area: a.area
            });
            // Si tiene serviciosDetalle (mismo área combinado), cargar todos
            if (a.serviciosDetalle && a.serviciosDetalle.length > 1) {
              slotServices[2] = a.serviciosDetalle.map(sd => ({
                name: sd.servicio || sd.nombre || sd.name || '',
                price: Number(sd.precio || sd.price || 0),
                area: a.area, status: undefined
              }));
              const totalCombinado2 = slotServices[2].reduce((s, v) => s + Number(v.price), 0);
              renderServicesForSlot(2);
              document.getElementById('as2Total').textContent = '$' + totalCombinado2;
              document.getElementById('as2SvcCount').textContent = String(slotServices[2].length);
            } else {
              renderServicesForSlot(2);
              document.getElementById('as2Total').textContent = '$' + price;
              document.getElementById('as2SvcCount').textContent = '1';
            }
          }

          // Limpiar promo residual si este servicio no tiene promo
          if (!window._availablePromo) {
            const clientKeyClean2 = normalizeClientKey(a.nombre);
            if (activePromos[clientKeyClean2]) delete activePromos[clientKeyClean2];
          }
          
          // Si viene con promo asignada, guardarla pero permitir cambiarla
          if (window._availablePromo) {
            const promoBasic = window._availablePromo;
            
            // Buscar la promo completa en PROMOS
            const promoFull = PROMOS.find(p => p.name === promoBasic.name);
            
            if (promoFull) {
              try { // Wrap promo loading to prevent crashes stopping confirmServiceModal
              // Guardar promo completa
              if (!window._assignedPromo) window._assignedPromo = {};
              window._assignedPromo[2] = promoFull;

              // ✅ AGREGAR: Auto-agregar la promo a slotServices para que el botón "Finalizar" funcione
              const myArea2 = user?.area || 'cejas';

              // Restaurar completedAreas PRIMERO — necesario para calcular precio correcto
              var restoredCompletedAreas2 = [];
              try {
                var _obsAllFields2 = String(a.observaciones || a.obs || a.obsGeneral || a.obsText || '');
                var _matchComp2 = _obsAllFields2.match(/_completedAreas:(\[[^\]]*\])/);
                if (_matchComp2) restoredCompletedAreas2 = JSON.parse(_matchComp2[1]);
              } catch(eComp2) { console.warn('completedAreas parse error (slot2):', eComp2); }

              // Para SP de enganche: usar a.precioMiArea (monto de esta área específica)
              // Para promo compartida: excluir completedAreas → la 2da staff ve solo su parte
              const precioMiAreaSP2 = Number(a.precioMiArea || 0);
              const _esMultiArea2 = (promoFull.division || []).length > 1;
              const myPrice2 = (!_esMultiArea2 && precioMiAreaSP2 > 0)
                ? precioMiAreaSP2
                : getMyPromoPrice(promoFull, myArea2, restoredCompletedAreas2);

              slotServices[2].push({
                name: promoFull.name,
                area: myArea2,
                price: myPrice2
              });

              // Actualizar UI
              renderServicesForSlot(2);
              document.getElementById('as2Total').textContent = '$' + myPrice2;
              document.getElementById('as2SvcCount').textContent = '1';

              // partes previas (promo compartida) — mostrar como historial readonly
              if (a.serviciosDetalle && a.serviciosDetalle.length > 0) {
                window._desgloseAcumulado = a.serviciosDetalle;
                const svcListEl2 = document.getElementById('as2ServicesList');
                if (svcListEl2) {
                  const histHtml2 = a.serviciosDetalle.map(function(d) {
                    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;">'
                      + '<span style="font-size:16px;">&#x2705;</span>'
                      + '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">'
                      + (d.servicio || d.area || 'Servicio previo') + ' &middot; ' + (d.staff || '&mdash;')
                      + '</div><div style="font-size:11px;color:var(--success);">Completado</div></div>'
                      + '<div style="font-size:13px;font-weight:800;color:var(--success);">$' + (d.monto || 0) + '</div>'
                      + '</div>';
                  }).join('');
                  svcListEl2.insertAdjacentHTML('afterbegin', histHtml2);
                }
              }

              // Registrar promo activa con key normalizada
              const clientKey2 = normalizeClientKey(a.nombre);
              activePromos[clientKey2] = {
                promo: promoFull,
                startedBy: myArea2,
                completedAreas: restoredCompletedAreas2,
                _metadata: {
                  displayName: a.nombre,
                  clientCode: a.codigo,
                  registeredAt: Date.now()
                }
              };
              saveActivePromos(); // persistir

              // Actualizar botones de finalización con las completedAreas restauradas
              setTimeout(() => updateFinishButtons(2), 400);

              // Modificar el botón de promo para mostrar que hay una asignada
              const promoBtn = document.getElementById('promoBtn2');
              if (promoBtn) {
                promoBtn.innerHTML = '✓ Promo aplicada';
                promoBtn.style.background = 'var(--success)';
              }
              
              // Mostrar info de la promo asignada con servicios incluidos
              const infoDiv = document.createElement('div');
              infoDiv.id = 'promoAssignedInfo2';
              infoDiv.style.cssText = 'background: linear-gradient(135deg, #fff5f7 0%, #ffe8ef 100%); border: 2px solid #ff6b9d; padding: 12px 16px; border-radius: 12px; margin-bottom: 14px; font-size: 13px;';
              infoDiv.innerHTML = `
                <div style="font-weight: 700; color: #c44569; margin-bottom: 4px;">💝 Promo asignada por Mikaela</div>
                <div style="color: #1a1a1a; font-weight: 600; margin-bottom: 4px;">${promoFull.name}</div>
                <div style="color: #666; font-size: 11px; margin-bottom: 6px;">${promoFull.services}</div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
                  ${promoFull.division.map(d => '<span style="background: white; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; color: #c44569;">' + d.area + ' $' + d.monto + '</span>').join('')}
                </div>
                <div style="color: #666; font-size: 11px;">Podés aplicar esta o elegir otra si la clienta lo prefiere</div>
              `;
              const actionBtns = document.getElementById('as2ActionBtns');
              if (actionBtns) {
                actionBtns.parentNode.insertBefore(infoDiv, actionBtns);
              }

              // Mostrar banner de promasExtra si hay mas promos pendientes
              const promasExtraActuales2 = window._takingPromasExtra || [];
              if (promasExtraActuales2.length > 0) {
                const extraDiv2 = document.createElement('div');
                extraDiv2.id = 'promoExtraInfo2';
                extraDiv2.style.cssText = 'background: #fff8e1; border: 1.5px solid #f0c040; padding: 10px 14px; border-radius: 12px; margin-bottom: 12px; font-size: 12px;';
                extraDiv2.innerHTML = '<div style="font-weight:700;color:#8a6d00;margin-bottom:4px;">Despues de esta promo, la clienta tiene:</div>' +
                  promasExtraActuales2.map(function(p,i){ return '<div style="color:#5a4a00;font-weight:600;">' + (i+1) + '. ' + p.nombre + ' ($' + p.precio + ')</div>'; }).join('');
                if (actionBtns) actionBtns.parentNode.insertBefore(extraDiv2, actionBtns);
              }
              } catch(ePromo2) { console.error('Error cargando promo (slot2):', ePromo2); }
            }
          }
          
          if (user.area === 'pestanas') {
            const _pk2 = a.codigo.toLowerCase().replace(/-/g, '');
            apiGet('getFichaPestanas', { codigo: a.codigo }).then(pr2 => {
              if (pr2.success && pr2.fichas && pr2.fichas.length > 0) {
                if (!CLIENT_PROFILES[_pk2]) CLIENT_PROFILES[_pk2] = { name: a.nombre, code: a.codigo, pestanas: { fichas: [], history: [] } };
                if (!CLIENT_PROFILES[_pk2].pestanas) CLIENT_PROFILES[_pk2].pestanas = { fichas: [], history: [] };
                CLIENT_PROFILES[_pk2].pestanas.fichas = pr2.fichas;
                CLIENT_PROFILES[_pk2].pestanas.ultimaVisita = pr2.ultimaVisita;
              }
              loadPestFichaQuick(_pk2, 2);
            }).catch(() => loadPestFichaQuick(_pk2, 2));
          }

          // ── MANDAMIENTO #7: facial y cejas cargan ficha en slot 2 también ──
          if (user.area === 'facial') {
            const _fKey2 = (a.codigo || '').toLowerCase().replace(/-/g, '');
            window._currentFacialClientKey = _fKey2;
            window._currentFacialClientNombre = a.nombre;
            window._currentFacialClientCodigo = a.codigo;
            const _fSvcs2 = slotServices[2] || [];
            window._currentFacialSvcName  = _fSvcs2.filter(s => s.status !== 'rechazado').map(s => s.name).join(' + ') || '';
            window._currentFacialSvcPrice = _fSvcs2.filter(s => s.status !== 'rechazado').reduce((s,v) => s + Number(v.price||0), 0);
            window._facialFichaSlot = 2;
            setTimeout(function() { loadFacialFichaQuick(_fKey2, 2); }, 400);
          }
          var _cqClear2 = document.getElementById('cejasQuick2');
          if (_cqClear2) { _cqClear2.innerHTML = ''; _cqClear2.style.display = 'none'; }
          if (user && String(user.area||'').toLowerCase().includes('ceja')) {
            const _svcPig2 = slotServices[2] && slotServices[2].find(function(s){ return esSrvPigmento(s.name); });
            if (_svcPig2) {
              const _cKey2 = (a.codigo || '').toLowerCase().replace(/-/g, '');
              setTimeout(function() { loadCejasQuick(_cKey2, 2, a.codigo, a.nombre); }, 500);
            }
          }

          // Si es TM: cargar areas completas para slot 2 (todas las áreas de esta staff + completadas)
          if (window._as2IdEspera && window._as2IdEspera.startsWith('TM-')) {
            apiGet('getTicketMulti').then(function(tmData2) {
              if (tmData2.success) {
                var tm2 = (tmData2.activos || []).find(function(t) { return t.idEspera === window._as2IdEspera; });
                if (tm2) {
                  window._tmAreasActuales2 = tm2.areas || [];
                  var user2b = window.currentUser;
                  // Cargar TODOS los servicios de esta staff que están en servicio
                  var misAreas2 = (tm2.areas || []).filter(function(ar) {
                    return ar.staff === (user2b && user2b.name) && String(ar.estado||'').toLowerCase() === 'en servicio';
                  });
                  // Áreas ya completadas (de cualquier staff) → mostrar como historial
                  var areasCompletadas2 = (tm2.areas || []).filter(function(ar) {
                    var e = String(ar.estado||'').toLowerCase();
                    return e === 'completado' || e === 'finalizado' || e === 'completada';
                  });

                  // PASO 1: slotServices + render (borra innerHTML)
                  if (misAreas2.length > 0) {
                    slotServices[2] = misAreas2.map(function(ar) {
                      return { name: ar.tentativo || ar.confirmado || '', price: ar.precio || 0, area: ar.area };
                    });
                    renderServicesForSlot(2);
                  }

                  // PASO 2: insertar chips completados DESPUÉS del render
                  var svcListElTM2 = document.getElementById('as2ServicesList');
                  if (areasCompletadas2.length > 0 && svcListElTM2) {
                    [...svcListElTM2.querySelectorAll('.tm-completado-chip')].forEach(function(el){ el.remove(); });
                    var histHtmlTM2 = areasCompletadas2.map(function(ar) {
                      return '<div class="tm-completado-chip" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;">'
                        + '<span style="font-size:16px;">✅</span>'
                        + '<div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--success);">'
                        + (ar.tentativo || ar.area || 'Servicio previo')
                        + '</div><div style="font-size:11px;color:var(--success);">Completado</div></div>'
                        + '<div style="font-size:13px;font-weight:800;color:var(--success);">$' + (ar.precio || 0) + '</div>'
                        + '</div>';
                    }).join('');
                    svcListElTM2.insertAdjacentHTML('afterbegin', histHtmlTM2);
                  }

                  // PASO 3: total y contador
                  var totalActivosTM2 = (slotServices[2] || []).reduce(function(s,v){ return s + Number(v.price||0); }, 0);
                  var totalCompTM2 = areasCompletadas2.reduce(function(s,ar){ return s + Number(ar.precio||0); }, 0);
                  document.getElementById('as2Total').textContent = '$' + (totalActivosTM2 + totalCompTM2);
                  document.getElementById('as2SvcCount').textContent = String((slotServices[2]||[]).length + areasCompletadas2.length);

                  // Mostrar botones TM correctos en el panel desde el inicio
                  setTimeout(function() { updateFinishButtons(2); }, 600);
                }
              }
              window.confirmarServicioObligatorio(2);
            }).catch(function() {
              window.confirmarServicioObligatorio(2);
              updateFinishButtons(2);
            });
          } else {
            window.confirmarServicioObligatorio(2);
          }
        }
        
        if (user && user.maxClients === 2) {
          if (!activeClients[name]) activeClients[name] = [];
          activeClients[name] = aten.map(at => ({ name: at.nombre, code: at.codigo, service: at.servicio }));
          updateCapacityUI(name);
        }
        
        // recargarAutorizacionesStaff se llama automaticamente desde show('activeService')
        setTimeout(() => { show(slot === 0 ? 'activeService' : 'activeService2'); }, 300);
      }
    } catch (err) {
      console.error('Error cargando datos de la clienta:', err);
      // Fallback al comportamiento anterior
      if (user && user.maxClients === 2) {
        if (!activeClients[name]) activeClients[name] = [];
        const slot = activeClients[name].length;
        if (slot >= 2) {
          alert('Ya tenés 2 clientas en atención. Finalizá una para tomar otra.');
          return;
        }
        activeClients[name].push({ name: window._takingClient || 'Clienta', code: window._takingClientCode || window._as1Client || window._as2Client || '', service: window._takingService || 'Servicio' });
        updateCapacityUI(name);
        setTimeout(() => { show(slot === 0 ? 'activeService' : 'activeService2'); }, 300);
      } else {
        setTimeout(() => { show('activeService'); }, 300);
      }
    }
  }
  
  function applyAvailablePromo(slot) {
    const promo = window._availablePromosPerSlot ? window._availablePromosPerSlot[slot] : null;
    if (!promo) {
      alert('No hay promo disponible');
      return;
    }
    
    const user = window.currentUser;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐', '') || '';
    
    // Agregar servicio de la promo
    const servicioPromo = {
      name: 'Servicio promo: ' + promo.name,
      area: user.area,
      price: promo.price
    };
    
    // Reemplazar (no sumar): la clienta cambia al servicio de la promo.
    slotServices[slot] = [servicioPromo];
    
    // Actualizar UI de servicios
    renderServicesForSlot(slot);
    
    // Actualizar total
    const total = slotServices[slot].reduce((sum, s) => sum + Number(s.price), 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent = slotServices[slot].length;
    
    // Guardar en activePromos
    if (!window.activePromos) window.activePromos = {};
    window.activePromos[normalizeClientKey(clientName)] = { promo: promo };
    
    // Cambiar botón
    const promoBtn = document.getElementById('promoBtn' + slot);
    if (promoBtn) {
      promoBtn.textContent = '✓ Promo aplicada';
      promoBtn.style.background = 'var(--success)';
      promoBtn.onclick = null;
    }
    
    // Ocultar info de promo disponible
    const infoDiv = document.getElementById('promoAvailableInfo' + slot);
    if (infoDiv) infoDiv.remove();
  }
  
  function renderServicesForSlot(slot) {
    // Después de renderizar, verificar si hay servicio pigmento y mostrar ficha quick
    setTimeout(function() {
      try {
        if (slot === 1) {
          const user2 = window.currentUser;
          if (user2 && String(user2.area||'').toLowerCase().includes('ceja')) {
            const hasPig = (slotServices[1] || []).some(function(s) { return esSrvPigmento(s.name); });
            const el = document.getElementById('cejasQuick1');
            if (hasPig && el && el.style.display === 'none' && el.innerHTML.trim() === '') {
              const cod = window._as1Client || '';
              const nom = document.getElementById('as1Name')?.textContent?.replace(' ⭐','') || '';
              const cKey = cod.toLowerCase().replace(/-/g,'');
              if (cod) loadCejasQuick(cKey, 1, cod, nom);
            }
          }
        }
      } catch(ePig) {}
    }, 300);
    const services = slotServices[slot] || [];
    const listEl = document.getElementById('as' + slot + 'ServicesList');
    if (!listEl) return;

    // Buscar la promo activa de esta clienta para mostrar el nombre ESPECÍFICO de cada parte
    let _divPartes = [];
    try {
      const _cn = (document.getElementById('as' + slot + 'Name')?.textContent || '').replace(' ⭐', '').trim();
      const _ck = (typeof normalizeClientKey === 'function') ? normalizeClientKey(_cn) : _cn.toLowerCase();
      const _ap = window.activePromos && (activePromos[_ck] || activePromos[_cn]);
      if (_ap && _ap.promo && Array.isArray(_ap.promo.division)) _divPartes = _ap.promo.division;
    } catch (e) {}
    const _esCombo = _divPartes.length > 0;
    // Devuelve el nombre específico de la parte según el área del servicio (ej: "Depilacion de cejas")
    function _nombreParte(s) {
      if (s.subtitulo) return s.subtitulo;
      const areaN = String(s.area || '').toLowerCase().replace(/[^a-z]/g, '');
      const kw = ({ cejas: ['ceja', 'depil'], depilacion: ['ceja', 'depil'], pestanas: ['pesta', 'lash'], retiro_lifting: ['lifting', 'retiro'], facial: ['facial', 'limpieza'] })[areaN] || [areaN];
      const match = _divPartes.find(function (d) {
        const dn = String(d.servicio || d.area || '').toLowerCase();
        return kw.some(function (k) { return dn.includes(k); });
      });
      if (match) return match.servicio || match.area;
      return String(s.area || '').charAt(0).toUpperCase() + String(s.area || '').slice(1);
    }
    
    listEl.innerHTML = services.map((s, idx) => {
      const isPending = s.status === 'pendiente';
      const isApproved = s.status === 'aprobado';
      const isRejected = s.status === 'rechazado';
      const isCompleted = s.status === 'completado' || s.completada === true;
      // Enganche: primer servicio cuando viene de otra área, editable directamente (slot 1 Y slot 2)
      const _engancheActivoSlot = slot === 1 ? window._esEnganche : window._esEnganche2;
      const isEngancheEditable = idx === 0 && _engancheActivoSlot && !isPending && !isApproved;
      
      const bgColor = isPending ? '#fff3cd' : isRejected ? '#f8d7da' : isEngancheEditable ? '#f0f9ff' : 'var(--bg-card)';
      const borderStyle = isPending ? 'border: 2px solid #ffc107;' : isRejected ? 'border: 2px solid #dc3545;' : isEngancheEditable ? 'border: 2px solid #3b82f6;' : '';
      
      const statusBadge = isPending ? 
        '<div style="background: #ffc107; color: #856404; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; margin-top: 4px; display: inline-block;">⏳ PENDIENTE AUTORIZACIÓN</div>' :
        isApproved ?
        '<div style="background: #28a745; color: white; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; margin-top: 4px; display: inline-block;">✓ APROBADO</div>' :
        isRejected ?
        '<div style="background: #dc3545; color: white; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; margin-top: 4px; display: inline-block;">✕ RECHAZADO</div>' :
        isEngancheEditable ?
        '<div style="background: #3b82f6; color: white; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; margin-top: 4px; display: inline-block;">🔗 ENGANCHE · Podés cambiarlo</div>' :
        isCompleted ?
        '<div style="background:#e8f6ee; color:#1b7a3e; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; margin-top: 4px; display: inline-block;">✅ COMPLETADO</div>' :
        '';
      
      const noteInfo = (isPending || isApproved) && s.note ? 
        `<div style="font-size: 10px; color: var(--ink-soft); margin-top: 4px; font-style: italic;">Por: ${s.requestedBy || 'Staff'} - "${s.note}"</div>` : '';

      // Estado de progreso para partes de un combo: ✅ Listo / 🟢 En curso
      const _esParteCombo = _esCombo && !isPending && !isRejected;
      const _parteCompletada = s.status === 'completado' || s.completada === true;
      const progresoBadge = (_esParteCombo && !_parteCompletada)
        ? '<div style="background:#fff4e6; color:#b45309; font-size:10px; font-weight:700; padding:3px 9px; border-radius:100px; margin-top:5px; display:inline-block;">🟢 En curso</div>'
        : '';
      
      // Botón de editar para enganche directo (sin autorización)
      const editBtn = isEngancheEditable
        ? `<button onclick="editEngancheService(${slot}, ${idx})" style="background: #3b82f6; border: none; color: white; cursor: pointer; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px;">✏️ Cambiar</button>`
        : ((!isPending && !isCompleted) ? `<button onclick="removeServiceItem(${slot}, ${idx})" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 18px; padding: 4px;">✕</button>` : '');

      return `
      <div class="service-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${bgColor}; ${borderStyle} border-radius: 12px; margin-bottom: 8px; ${_parteCompletada ? 'opacity:0.85;' : ''}">
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 14px;">${s.name}</div>
          <div style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">${_nombreParte(s)}</div>
          ${progresoBadge}
          ${statusBadge}
          ${noteInfo}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-size: 16px; font-weight: 800; ${isPending ? 'opacity: 0.5;' : ''}">${isPending ? '⏳' : ''}$${s.price}</div>
          ${editBtn}
        </div>
      </div>
    `;
    }).join('');
  }
  
  function removeServiceItem(slot, idx) {
    if (!slotServices[slot]) return;
    slotServices[slot].splice(idx, 1);
    renderServicesForSlot(slot);
    
    // Actualizar total
    const total = slotServices[slot].reduce((sum, s) => {
      if (s.status === 'pendiente' || s.status === 'rechazado') return sum;
      return sum + Number(s.price);
    }, 0);
    document.getElementById('as' + slot + 'Total').textContent = '$' + total;
    document.getElementById('as' + slot + 'SvcCount').textContent = slotServices[slot].filter(s => s.status !== 'rechazado').length;

    // Sincronizar cambio de servicios con el backend (actualiza col F en ListaEspera)
    syncServiciosBackend(slot, total);
  }

  function editEngancheService(slot, idx) {
    // Staff 2 puede cambiar el servicio de enganche directamente, sin autorización
    window._editEngancheSlot = slot;
    window._editEngancheIdx = idx;
    const svc = slotServices[slot][idx];
    const user = window.currentUser;

    // Reusar el modal addService pero sin requerir nota y sin solicitar autorización
    const areaSel = document.getElementById('addSvcArea');
    areaSel.innerHTML = '<option value="">Seleccionar área...</option>';
    const areaMap = { cejas: 'Cejas', depilacion: 'Depilación', pestanas: 'Pestañas', retiro_lifting: 'Lifting / Retiro', facial: 'Facial' };
    Object.entries(areaMap).forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      areaSel.appendChild(opt);
    });
    // Pre-seleccionar área del servicio actual
    const areaActual = user?.area || 'cejas';
    areaSel.value = areaActual;
    loadAddServiceCatalog();

    // Cambiar el título del modal y ocultar la nota obligatoria
    const modalTitle = document.querySelector('#addServiceModal .modal-title');
    if (modalTitle) modalTitle.textContent = '🔗 Cambiar servicio de enganche';
    const noteGroup = document.getElementById('addSvcNote')?.closest('.input-group');
    if (noteGroup) noteGroup.style.display = 'none';

    // Marcar como modo enganche para que confirmAddService lo trate diferente
    window._modoEnganche = true;

    document.getElementById('addServiceModal').classList.add('active');
  }

  // ── ROBUSTEZ: resolver el id del ticket activo desde el BACKEND si el local está vacío.
  // Evita el "no hay ticket / está vacío" al finalizar (que hoy se arregla saliendo y
  // re-entrando, justamente porque al re-entrar se re-lee fresco del backend).
  // Solo hace la llamada extra cuando el id FALTA → cero overhead en el caso normal.
  async function ensureIdEsperaFresco(slot) {
    slot = slot || 1;
    const key = slot === 1 ? '_as1IdEspera' : '_as2IdEspera';
    if (window[key]) return window[key]; // ya hay id válido en memoria
    const clientCode = slot === 1 ? window._as1Client : window._as2Client;
    const user = window.currentUser;
    if (!clientCode || !user) return '';
    const staffName = String(user.name || '').trim().toLowerCase();
    try {
      const r = await apiGet('getListaCompleta');
      if (!r) return '';
      const enServ = r.enServicio || [];
      const otros  = [].concat(r.porCobrar || [], r.paraRedirigir || [], r.lista || []);
      const mismaCli = x => String(x.codigo || '') === clientCode;
      const miStaff  = x => String(x.tomadaPor || x.asignada || '').trim().toLowerCase() === staffName;
      let cand = enServ.find(x => mismaCli(x) && miStaff(x));   // 1) en servicio, mía, de esta clienta
      if (!cand) cand = enServ.find(mismaCli);                  // 2) en servicio de esta clienta
      if (!cand) cand = otros.find(x => mismaCli(x) && miStaff(x)) || otros.find(mismaCli); // 3) otras colas
      const id = cand ? String(cand.idEspera || cand.id || '') : '';
      if (id) { window[key] = id; console.log('[ticket] id vacío → resuelto del backend:', id); }
      return id;
    } catch (e) { console.warn('ensureIdEsperaFresco error', e); return ''; }
  }

  async function syncServiciosBackend(slot, total, promoData) {
    const user = window.currentUser;
    if (!user) return;
    // Las partes COMPLETADAS del combo ya están registradas en el backend como áreas TM:
    // NO entran al sync ni al dedup por nombre (si no, colisionan por nombre con la parte
    // activa del mismo combo y se perdería una, además de inflar el total del área activa).
    const _allSync = slotServices[slot] || [];
    const _completadasSlot = _allSync.filter(s => s.status === 'completado' || s.completada === true);
    const _restoSync = _allSync.filter(s => !(s.status === 'completado' || s.completada === true));
    // ── DEDUP por nombre (solo activos/extras): un mismo servicio no debe contarse 2 veces.
    const _seenSync = {};
    const svcs = _restoSync.filter(s => {
      const k = String(s.name || '').trim().toLowerCase();
      if (!k) return false;
      if (_seenSync[k]) return false;
      _seenSync[k] = true;
      return true;
    });
    slotServices[slot] = _completadasSlot.concat(svcs);
    const _activosSync = svcs.filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const activeNames = _activosSync.map(s => s.name).join(' + ');
    if (!activeNames) return;
    const clientName = slot === 1
      ? (document.getElementById('as1Name')?.textContent?.replace(' ⭐', '') || '')
      : (document.getElementById('as2Name')?.textContent?.replace(' ⭐', '') || '');
    const clientCode = slot === 1 ? window._as1Client : window._as2Client;
    const idEspera = slot === 1 ? window._as1IdEspera : window._as2IdEspera;
    const totalEstaStaff = _activosSync.reduce((sum, s) => sum + Number(s.price || 0), 0);
    try {
      const payload = {
        chicaNombre   : user.name,
        clienteNombre : clientName,
        clienteCodigo : clientCode || '',
        servicios     : activeNames,
        total         : String(totalEstaStaff),
        tipo          : 'SN'
      };
      if (promoData) {
        payload.promoNombre    = promoData.promoNombre;
        payload.precioPromo    = promoData.precioPromo;
        payload.precioRegular  = promoData.precioRegular;
      }
      if (idEspera) payload.idEspera = idEspera;
      await apiPost('updateServiciosAtencion', payload);
    } catch(e) { console.error('Error sync servicios:', e); }
  }
  
  // Opciones al finalizar servicio
  async function finishAndSendAll() {
    const slot = window._finishingSlot || 1;
    await ensureIdEsperaFresco(slot); // ROBUSTEZ: resolver id fresco si el local está vacío
    const user = window.currentUser;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey = normalizeClientKey(clientName);
    const promoData = activePromos[clientKey] || window._finishPromoData;

    // Para "hago toda la promo": usar lo que hay en slotServices (precio real de esta área)
    // Si completedAreas tiene áreas previas, no repetir el precio total — ya fue cobrado antes
    const svcsAprobados = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const totalEnSlot = svcsAprobados.reduce((sum, s) => sum + Number(s.price || 0), 0);

    // Si no hay servicios en slot pero hay promo, cargar precio de esta área
    if (svcsAprobados.length === 0 && promoData && promoData.promo) {
      const myAreaAll = user?.area || 'cejas';
      const precioMiAreaAll = getMyPromoPrice(promoData.promo, myAreaAll, promoData.completedAreas || []);
      slotServices[slot] = [{ name: promoData.promo.name, price: precioMiAreaAll, area: myAreaAll }];
    }

    const svcsAprobados2 = (slotServices[slot] || []).filter(s => s.status !== 'rechazado' && s.status !== 'pendiente' && s.status !== 'enganche-enviado');
    const totalFinal = svcsAprobados2.reduce((sum, s) => sum + Number(s.price || 0), 0) || (promoData ? Number(promoData.promo.price) : 0);
    const svcNames = promoData ? promoData.promo.name : (svcsAprobados2.map(s => s.name).join(' + ') || 'Servicio');
    const precioRegularFinal = promoData ? String(Number(promoData.promo.regular || promoData.promo.price)) : String(totalFinal);

    // Llenar _finishingData y _finishingSlot para que finishAndSend tenga todo
    window._finishingSlot = slot;
    window._finishingData = {
      clientKey: clientKey,
      clientName: clientName,
      svcNames: svcNames,
      total: String(totalFinal),
      promoNombre: promoData ? promoData.promo.name : '',
      precioRegular: precioRegularFinal,
      idEspera: slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || ''),
      clienteCodigo: slot === 1 ? (window._as1Client || '') : (window._as2Client || ''),
      areasExtras: [],
      promasExtraPendientes: []
    };
    window._finishFullPromo = true;

    closeModal();
    await new Promise(r => setTimeout(r, 100));
    await finishAndSend();
  }

  async function cobrarPromoCompleta(slot) {
    slot = slot || window._finishingSlot || 1;
    const user = window.currentUser;
    if (!user) return;
    const clientName = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';
    const clientKey  = normalizeClientKey(clientName);
    const promoData  = activePromos[clientKey] || window._finishPromoData;
    if (!promoData || !promoData.promo) { alert('No hay datos de promo para esta clienta.'); return; }
    const promo         = promoData.promo;
    const precioPromo   = Number(promo.price   || 0);
    const precioRegular = Number(promo.regular || promo.price || 0);
    const promoNombre   = promo.name || 'Promo';
    const idEspera      = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    const clienteCodigo = slot === 1 ? (window._as1Client   || '') : (window._as2Client   || '');
    const msg = `¿Cobrar promo completa "${promoNombre}" a nombre de ${user.name}?\n\n• Precio promo: $${precioPromo}\n• Todo el valor se asigna a ${user.name}\n• La clienta va directamente a cobro`;
    if (!confirm(msg)) return;
    slotServices[slot] = [{ name: promoNombre, price: precioPromo, area: user.area || '', status: 'aprobado' }];
    window._finishingSlot = slot;
    window._finishingData = {
      clientKey, clientName, svcNames: promoNombre,
      total: String(precioPromo), promoNombre, precioRegular: String(precioRegular),
      idEspera, clienteCodigo, areasExtras: [], promasExtraPendientes: [], _promoCompleta: true
    };
    window._finishFullPromo = true;
    showToast('⏳ Enviando a cobro...');
    try { await finishAndSend(); } catch(e) { alert('Error al enviar a cobro: ' + e.message); }
  }

  // ── MANDAMIENTO #6: staff toma precio completo de promo en ticket TM ──────
  // Cuando el área de esta staff tiene promo (precio < precioNormal),
  // puede optar por cobrar el precio normal completo en lugar del precio promo.
  async function cobrarPromoCompletaTM(slot) {
    slot = slot || window._finishingSlot || 1;
    const user = window.currentUser;
    if (!user) return;
    const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    if (!idEspera.startsWith('TM-')) return;

    let miAreaTM = null;
    let totalPromoCombo = 0;
    try {
      const tmData = await apiGet('getTicketMulti');
      if (tmData.success) {
        const tm = (tmData.activos || []).find(t => t.idEspera === idEspera);
        if (tm) {
          miAreaTM = (tm.areas || []).find(a => a.staff === user.name && String(a.estado||'').toLowerCase() === 'en servicio');
          totalPromoCombo = (tm.areas || []).reduce(function(s, a){
            if (!a || String(a.estado||'').toLowerCase() === 'cancelado') return s;
            return s + Number(a.precio || 0);
          }, 0);
        }
      }
    } catch(e) {}

    if (!miAreaTM) { alert('No se encontraron datos del área en servicio.'); return; }

    const precioPromoArea = Number(miAreaTM.precio || 0);
    if (!totalPromoCombo || totalPromoCombo <= 0) totalPromoCombo = precioPromoArea;
    const clientName   = document.getElementById('as' + slot + 'Name')?.textContent?.replace(' ⭐','') || '';

    const msg = `¿Asignar la PROMO COMPLETA a nombre de ${user.name}?\n\n• Valor completo de la promo: $${totalPromoCombo.toFixed(2)}\n• Todo el valor se le asigna a ${user.name}\n• La clienta va directamente a cobro\n\nUsar cuando la clienta paga la promo completa pero no realiza todas las áreas (ej: promo "pestañas y depilación de cejas" y solo se hace pestañas).`;
    if (!confirm(msg)) return;

    // Mostrar el valor COMPLETO de la promo a nombre de esta staff (no el precio normal)
    slotServices[slot] = [{ name: miAreaTM.tentativo || miAreaTM.confirmado || miAreaTM.area, price: totalPromoCombo, area: user.area || '', status: 'aprobado', _promoCompleta: true }];
    renderServicesForSlot(slot);
    document.getElementById('as' + slot + 'Total').textContent = '$' + totalPromoCombo.toFixed(2);

    window._finishingSlot = slot;
    window._finishingData = {
      clientKey: normalizeClientKey(clientName), clientName,
      svcNames: miAreaTM.tentativo || miAreaTM.area || 'Servicio',
      total: String(totalPromoCombo), promoNombre: miAreaTM.tentativo || '', precioRegular: String(totalPromoCombo),
      idEspera, areasExtras: [], promasExtraPendientes: [], _promoCompleta: true
    };
    window._finishFullPromo = true;
    showToast('⏳ Enviando promo completa a cobro...');
    try { await completarAreaMultiFinal(); } catch(e) { alert('Error: ' + e.message); }
  }

  // ===== PRIVACIDAD: la staff ve "código · iniciales" en vez del nombre completo =====
  function inicialesCliente(nombre) {
    const parts = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const a = (parts[0][0] || '').toUpperCase();
    const b = parts.length > 1 ? (parts[parts.length - 1][0] || '').toUpperCase() : '';
    return b ? (a + '. ' + b + '.') : (a + '.');
  }
  function clienteDisplay(nombre, codigo) {
    const role = (window.currentUser && window.currentUser.role) || '';
    if (role === 'staff') {
      return codigo || inicialesCliente(nombre) || 'Clienta';
    }
    return nombre || codigo || 'Clienta';
  }
  // Pinta el nombre: textContent guarda el nombre REAL (lo leen cobros/operaciones);
  // data-mask guarda el enmascarado, que el CSS muestra solo a la staff.
  function pintarNombre(elId, nombre, codigo, esTop) {
    const el = document.getElementById(elId);
    if (!el) return;
    const star = esTop ? ' ⭐' : '';
    el.textContent = (nombre || '') + star;
    el.setAttribute('data-mask', clienteDisplay(nombre, codigo) + star);
  }

  // ===== SEGURIDAD: monitoreo de sesiones / dispositivos activos =====
  function getDeviceId() {
    let id = '';
    try { id = localStorage.getItem('nexserv_device_id') || ''; } catch(e) {}
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      try { localStorage.setItem('nexserv_device_id', id); } catch(e) {}
    }
    return id;
  }
  function getDeviceDesc() {
    const ua = navigator.userAgent || '';
    const os = /iPhone|iPad|iPod/i.test(ua) ? 'iPhone'
             : /Android/i.test(ua) ? 'Android'
             : /Windows/i.test(ua) ? 'PC Windows'
             : /Macintosh|Mac OS/i.test(ua) ? 'Mac' : 'Dispositivo';
    const br = /CriOS/i.test(ua) ? 'Chrome'
             : /FxiOS|Firefox/i.test(ua) ? 'Firefox'
             : /Chrome/i.test(ua) ? 'Chrome'
             : /Safari/i.test(ua) ? 'Safari' : '';
    let instalada = false;
    try {
      instalada = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    } catch(e) {}
    return os + (br ? ' · ' + br : '') + ' · ' + (instalada ? 'App instalada' : 'Navegador');
  }
  async function pingSesion(evento) {
    const u = window.currentUser;
    if (!u || !u.name) return null;
    try {
      return await apiPost('pingSesion', {
        staffName: u.name, rol: u.role || '',
        deviceId: getDeviceId(), dispositivo: getDeviceDesc(),
        evento: evento || 'ping'
      });
    } catch(e) { return null; }
  }
  function startHeartbeat(esLogin) {
    if (window._heartbeatTimer) clearInterval(window._heartbeatTimer);
    pingSesion(esLogin ? 'login' : 'reabrir').then(function(res){
      const u = window.currentUser;
      if (u && u.role !== 'owner' && res && (res.aprobacion === 'pendiente' || res.aprobacion === 'bloqueado')) {
        bloquearPorDispositivo(res.aprobacion);
      }
    });
    window._heartbeatTimer = setInterval(function(){ pingSesion('ping'); }, 45000);
  }
  function stopHeartbeat() {
    if (window._heartbeatTimer) { clearInterval(window._heartbeatTimer); window._heartbeatTimer = null; }
    if (window._lockPoll) { clearInterval(window._lockPoll); window._lockPoll = null; }
  }
  function bloquearPorDispositivo(estado) {
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    const lock = document.getElementById('deviceLock');
    const msg = document.getElementById('deviceLockMsg');
    const ico = document.getElementById('deviceLockIcon');
    if (estado === 'bloqueado') {
      if (msg) msg.textContent = 'Este dispositivo fue bloqueado por el administrador. Si crees que es un error, contacta al dueño.';
      if (ico) ico.textContent = '⛔';
      if (window._lockPoll) { clearInterval(window._lockPoll); window._lockPoll = null; }
    } else {
      if (msg) msg.textContent = 'Dispositivo nuevo detectado. Estamos esperando que el administrador lo autorice. Esta pantalla se actualizará sola cuando te aprueben.';
      if (ico) ico.textContent = '🔒';
      if (window._lockPoll) clearInterval(window._lockPoll);
      window._lockPoll = setInterval(verificarDesbloqueo, 8000);
    }
    if (lock) lock.classList.add('active');
  }
  async function verificarDesbloqueo() {
    const u = window.currentUser;
    if (!u) return;
    try {
      const r = await apiGet('estadoDispositivo', { staffName: u.name, deviceId: getDeviceId() });
      if (r && r.aprobacion === 'aprobado') {
        if (window._lockPoll) { clearInterval(window._lockPoll); window._lockPoll = null; }
        const lock = document.getElementById('deviceLock');
        if (lock) lock.classList.remove('active');
        show(u.screen || 'staffHome');
      } else if (r && r.aprobacion === 'bloqueado') {
        bloquearPorDispositivo('bloqueado');
      }
    } catch(e) {}
  }

  function textoUltimaVez(min) {
    if (min == null || min >= 999999) return 'sin datos';
    if (min < 1) return 'hace instantes';
    if (min < 60) return 'hace ' + min + ' min';
    const h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + ' h';
    const d = Math.floor(h / 24);
    return 'hace ' + d + ' día' + (d > 1 ? 's' : '');
  }
  // ── Modo de descanso: bloquear/permitir acceso por staff ──────────────
  function toggleDescansoPanel() {
    const panel = document.getElementById('descansoPanel');
    const caret = document.getElementById('descansoCaret');
    if (!panel) return;
    const abierto = panel.style.display !== 'none';
    if (abierto) {
      panel.style.display = 'none';
      if (caret) caret.textContent = '▼';
    } else {
      panel.style.display = 'block';
      if (caret) caret.textContent = '▲';
      loadDescansoPanel();
    }
  }
  async function loadDescansoPanel() {
    const panel = document.getElementById('descansoPanel');
    if (!panel) return;
    panel.innerHTML = '<div style="text-align:center;padding:14px;color:var(--ink-faint);font-size:13px;">Cargando…</div>';
    let cfg = {};
    try { const r = await apiGet('getDescanso'); if (r && r.success) cfg = r.config || {}; } catch(e) {}
    window._descansoCfg = cfg;
    const staff = ['Mikaela','Diana','Yadira','Keyla','Maria','Lesly','Laura','Rosa'];
    let html = '<div class="card" style="padding:14px 16px;">'
      + '<div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:4px;">🌙 Modo de descanso</div>'
      + '<div style="text-align:center;font-size:11px;color:var(--ink-soft);margin-bottom:10px;line-height:1.4;">Si una staff está bloqueada y abre la app, verá:<br>"Estás en tu tiempo de descanso, disfrútalo en familia"</div>'
      + '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:10px;color:var(--ink-soft);margin-bottom:4px;padding-right:6px;"><span style="width:38px;text-align:center;">Bloqueado</span><span style="width:38px;text-align:center;">Disponible</span></div>';
    staff.forEach(function(n) {
      const blocked = cfg[n] === true;
      html += '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid var(--line);">'
        + '<div style="flex:1;font-size:14px;font-weight:600;color:var(--ink);">' + n + '</div>'
        + '<button onclick="setDescansoStaff(\'' + n + '\',true)" title="Bloquear acceso" style="width:38px;height:34px;border-radius:10px;border:none;cursor:pointer;font-size:15px;background:' + (blocked ? '#e5484d' : 'var(--bg)') + ';color:' + (blocked ? '#fff' : 'var(--ink-faint)') + ';">🔒</button>'
        + '<button onclick="setDescansoStaff(\'' + n + '\',false)" title="Permitir acceso" style="width:38px;height:34px;border-radius:10px;border:none;cursor:pointer;font-size:15px;background:' + (!blocked ? '#2d9d5a' : 'var(--bg)') + ';color:' + (!blocked ? '#fff' : 'var(--ink-faint)') + ';">🔓</button>'
        + '</div>';
    });
    html += '</div>';
    panel.innerHTML = html;
  }
  async function setDescansoStaff(staff, bloqueado) {
    try {
      await apiPost('setDescanso', { staff: staff, bloqueado: bloqueado });
      if (!window._descansoCfg) window._descansoCfg = {};
      if (bloqueado) window._descansoCfg[staff] = true; else delete window._descansoCfg[staff];
      showToast(bloqueado ? ('🔒 ' + staff + ' en descanso') : ('🔓 ' + staff + ' habilitada'));
      loadDescansoPanel();
    } catch(e) { alert('No se pudo actualizar: ' + e.message); }
  }
  window.toggleDescansoPanel = toggleDescansoPanel;
  window.setDescansoStaff = setDescansoStaff;

  async function loadSesiones() {
    const cont = document.getElementById('sesionesList');
    if (!cont) return;
    cont.innerHTML = '<div class="card" style="text-align:center; padding:20px; color:var(--ink-faint); font-size:13px;">Cargando…</div>';
    try {
      const r = await apiGet('getSesiones');
      const modo = (r && r.modo) || 'abierto';
      let html = '';
      if (modo === 'estricto') {
        html += '<div class="card" style="margin-bottom:14px; padding:14px; border-left:4px solid var(--success);">'
              + '<div style="font-weight:700; font-size:14px; margin-bottom:4px;">🔒 Bloqueo activado</div>'
              + '<div style="font-size:12px; color:var(--ink-soft); line-height:1.5; margin-bottom:10px;">Los dispositivos nuevos quedan en espera de tu autorización.</div>'
              + '<button onclick="toggleModoSeguridad(\'abierto\')" style="width:100%; padding:10px; background:var(--bg-card); border:1.5px solid var(--line); border-radius:var(--radius-pill); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; color:var(--ink-soft);">Desactivar (volver a modo registro)</button>'
              + '</div>';
      } else {
        html += '<div class="card" style="margin-bottom:14px; padding:14px; border-left:4px solid var(--warning);">'
              + '<div style="font-weight:700; font-size:14px; margin-bottom:4px;">📝 Modo registro</div>'
              + '<div style="font-size:12px; color:var(--ink-soft); line-height:1.5; margin-bottom:10px;">Ahora cualquier dispositivo que abra la app se guarda como aprobado. Dejalo así hasta que todas hayan entrado desde su teléfono; después activá el bloqueo.</div>'
              + '<button onclick="toggleModoSeguridad(\'estricto\')" style="width:100%; padding:10px; background:var(--ink); color:#fff; border:none; border-radius:var(--radius-pill); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;">🔒 Activar bloqueo de dispositivos nuevos</button>'
              + '</div>';
      }
      if (!r || !r.success || !r.sesiones || r.sesiones.length === 0) {
        cont.innerHTML = html + '<div class="card" style="text-align:center; padding:24px; color:var(--ink-faint); font-size:13px;">Aún no hay dispositivos registrados.<br>Cuando alguien abra la app, aparecerá aquí.</div>';
        return;
      }
      const porStaff = {};
      r.sesiones.forEach(function(s){
        const k = s.staff || '—';
        if (!porStaff[k]) porStaff[k] = [];
        porStaff[k].push(s);
      });
      Object.keys(porStaff).forEach(function(staff){
        const devs = porStaff[staff];
        const algunoActivo = devs.some(function(d){ return d.activo; });
        const staffEsc = staff.replace(/'/g, "\\'");
        html += '<div class="card" style="margin-bottom:10px; padding:14px;">'
              + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
              + '<span style="font-weight:800; font-size:15px;">' + staff + '</span>'
              + '<span style="font-size:11px; color:var(--ink-faint);">' + (devs[0].rol || '') + '</span>'
              + (algunoActivo
                  ? '<span style="margin-left:auto; background:var(--success-bg); color:var(--success); font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px;">🟢 En línea</span>'
                  : '<span style="margin-left:auto; background:var(--bg); color:var(--ink-faint); font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px;">⚪ Desconectada</span>')
              + '</div>';
        devs.forEach(function(d){
          const conn = d.activo ? '🟢 abierta ahora' : ('⚪ ' + textoUltimaVez(d.minutosDesde) + (d.ultimoPing ? ' · ' + d.ultimoPing : ''));
          let badge;
          if (d.aprobacion === 'pendiente') badge = '<span style="background:#fdf0d5; color:#a06a00; font-size:10px; font-weight:700; padding:2px 7px; border-radius:100px;">⏳ Pendiente</span>';
          else if (d.aprobacion === 'bloqueado') badge = '<span style="background:#fde2e2; color:var(--danger); font-size:10px; font-weight:700; padding:2px 7px; border-radius:100px;">⛔ Bloqueado</span>';
          else badge = '<span style="background:var(--success-bg); color:var(--success); font-size:10px; font-weight:700; padding:2px 7px; border-radius:100px;">✓ Aprobado</span>';
          const devEsc = String(d.deviceId).replace(/'/g, "\\'");
          html += '<div style="padding:8px 0; border-top:1px solid var(--line);">'
                + '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">'
                + '<div style="font-size:12px; color:var(--ink-soft);">' + (d.dispositivo || 'Dispositivo') + '</div>'
                + badge
                + '</div>'
                + '<div style="font-size:11px; color:' + (d.activo ? 'var(--success)' : 'var(--ink-faint)') + '; margin-top:2px;">' + conn + '</div>';
          let btns = '';
          if (d.aprobacion !== 'aprobado') btns += '<button onclick="aprobarDispositivo(\'' + staffEsc + '\',\'' + devEsc + '\')" style="flex:1; padding:8px; background:var(--success); color:#fff; border:none; border-radius:var(--radius-pill); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;">✓ Aprobar</button>';
          if (d.aprobacion !== 'bloqueado') btns += '<button onclick="bloquearDispositivo(\'' + staffEsc + '\',\'' + devEsc + '\')" style="flex:1; padding:8px; background:#fff; color:var(--danger); border:1.5px solid var(--danger); border-radius:var(--radius-pill); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;">⛔ Bloquear</button>';
          if (btns) html += '<div style="display:flex; gap:8px; margin-top:8px;">' + btns + '</div>';
          html += '</div>';
        });
        html += '</div>';
      });
      cont.innerHTML = html;
    } catch(e) {
      cont.innerHTML = '<div class="card" style="text-align:center; padding:20px; color:var(--danger); font-size:13px;">Error al cargar sesiones</div>';
    }
  }
  async function aprobarDispositivo(staff, deviceId) {
    try { await apiPost('setAprobacion', { staff: staff, deviceId: deviceId, estado: 'aprobado' }); } catch(e){}
    loadSesiones();
  }
  async function bloquearDispositivo(staff, deviceId) {
    if (!confirm('¿Bloquear este dispositivo? La persona no podrá usar la app desde ahí hasta que lo apruebes.')) return;
    try { await apiPost('setAprobacion', { staff: staff, deviceId: deviceId, estado: 'bloqueado' }); } catch(e){}
    loadSesiones();
  }
  async function toggleModoSeguridad(modo) {
    try { await apiPost('setModoSeguridad', { modo: modo }); } catch(e){}
    loadSesiones();
  }

  function showConfirmServiceModal(slot) {
    const slotStr = String(slot);
    const clientName = document.getElementById('as' + slotStr + 'Name')?.textContent?.replace(' ⭐','') || '';
    const svcs = slotServices[slot] || [];
    const svcName = svcs.length > 0 ? svcs.map(s => s.name).join(' + ') : '—';
    const svcPrice = svcs.reduce((sum, s) => sum + Number(s.price || 0), 0);
    const idEspera = slot === 1 ? (window._as1IdEspera || '') : (window._as2IdEspera || '');
    const esTM = idEspera.startsWith('TM-');

    pintarNombre('confirmSvcClientName', clientName, (slot === 1 ? window._as1Client : window._as2Client), false);
    window._confirmSvcSlot = slot;

    // Si hay desglose previo (promo compartida), mostrarlo en el modal
    const desgloseHtml = (window._desgloseAcumulado || []).map(function(d) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--success-bg);border-radius:10px;margin-bottom:6px;">'
        + '<span style="font-size:14px;">&#x2705;</span>'
        + '<div style="flex:1;font-size:11px;font-weight:700;color:var(--success);">' + (d.servicio||d.area||'Servicio previo') + ' &middot; ' + (d.staff||'') + '</div>'
        + '<div style="font-size:12px;font-weight:800;color:var(--success);">$' + (d.monto||0) + '</div>'
        + '</div>';
    }).join('');

    const tmAreasSlot = slot === 2 ? window._tmAreasActuales2 : window._tmAreasActuales;
    if (esTM && tmAreasSlot) {
      // ── TICKET MULTI: mostrar TODAS las áreas con checkboxes ──
      // La staff puede marcar cuáles va a hacer ella (toma todas las marcadas de una vez)
      const areas = tmAreasSlot;
      const areaIcons = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M6.6,21.2c-2.5-1.4-4.1-4.1-4.1-7s.2-.5.3-.6c.6-.6,1.8-.9,2.6-1.1,1.1-.2,2.1-.4,3.2-.4h2.1c0,0,0-4.2,0-4.2,0-.2-.2-.3-.3-.3s-.3.1-.3.3v1.9c0,.5-.4,1-.9,1s-1-.4-1-1v-1.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3c0,.5-.4,1-.9,1s-1-.4-1-1v-3.2c0-.9.7-1.6,1.6-1.6h12.7c.9,0,1.5.7,1.6,1.5s-.6,1.6-1.5,1.6h-7.3c0,.1,0,.2,0,.4v5.4c1.5.1,3,.3,4.4.9.6.3,1.3.6,1.3,1.4,0,1.3-.4,2.6-1,3.8s-1.8,2.3-3.1,3c-2.4,1.3-5.3,1.3-7.7,0ZM9.5,7.9c0-.6.4-1,1-1s.9.4.9,1v5.4c0,.2.1.4.3.4s.3-.1.3-.3v-6.8c0-.8.3-1.6.9-2.2s.2-.3.3-.5h-5.9c-.5,0-1,.4-1,.9v3.2c0,.2.1.3.3.3s.3-.1.3-.3c0-.5.4-1,1-1s.9.4.9,1v1.9c0,.2.2.3.3.3s.3-.1.3-.3v-1.9ZM20,5.7c.6,0,.9-.5.9-1s-.4-.9-.9-.9h-6.1c-.3.9-.8,1-1,1.9h7.2ZM17.6,14.1c-.8-.8-3.8-1.2-5-1.3v.5c0,.5-.5,1-1,.9s-.9-.4-.9-1v-.6c-2,0-4.5.1-6.3.8s-1.3.5-1.3.8,1.1.8,1.5.9c2.9.8,6.9.8,9.9.4.9-.1,1.7-.3,2.5-.7s1-.5.7-.8ZM7.9,16.4c-1.4-.1-3.5-.4-4.7-1.1.5,3.6,3.6,6.3,7.2,6.3s6.8-2.7,7.3-6.3c-.5.3-1.1.5-1.6.6-2.5.6-5.6.7-8.2.5Z"/></svg>', pestanas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg>', retiro_lifting:'✨', facial:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M13.9,17.8c-1.3,1.3-3.4.5-5.1.6-.1,1.3-.8,2.5-1.7,3.4s-.5.1-.6,0-.1-.4,0-.6c.5-.5.9-1.1,1.2-1.7.8-1.8-.3-3.4-1-5.1s-.6-2.9,0-4.3c1.1-2.6,4.7-3.8,5.2-7.6s.3-.4.5-.4.4.3.3.5l-.2.8c1.1,1.2,1.5,2.8,1.2,4.4s-.2.7-.1,1.1c.2,1,1.1,1.7,1.5,2.8s0,1.2-.5,1.5c0,.5,0,.9-.2,1.3.2.5.1,1-.2,1.4v.6c.1.5,0,.9-.3,1.2ZM13.5,15.6c.1-.2.2-.3.2-.5-.4,0-.7.1-1,.1s-.5-.2-.5-.5.2-.4.5-.4.7-.1,1.1-.3c.1-.6-.2-1.2.4-1.4s.4-.3.3-.6c-.4-1.1-1.4-1.9-1.6-3s.9-2.7-.5-4.7c-.4,1-1.1,1.8-1.9,2.6h1.6c.3,0,.4.3.3.5s-.3.3-.6.3c-1,0-2.1,0-2.9.7s-1,1-1.3,1.7c-.5,1.2-.5,2.5,0,3.7s1,2.2,1.3,3.5h1.7c1,.2,2.2.4,2.9-.4s-.2-1.1.2-1.6Z"/><path d=\"M4.6,15.5c-.1,1.3-.8,2.2-1.7,3s-.5.2-.6,0-.1-.5,0-.7c1.1-1,1.5-1.9,1.5-3.3s0-1.7,0-2.5c0-1.6.6-3,1.6-4.3s.9-1.1,1.5-1.5l1.6-1.3c.2-.1.5,0,.6,0s.1.4,0,.6l-1.4,1.2c-.5.4-1,.9-1.4,1.4-.9,1.1-1.4,2.3-1.5,3.7s0,2.5-.1,3.7Z"/><path d=\"M18.6,8.8c-.1.3-.4.5-.7.5s-.6-.1-.7-.4l-.4-1-.9-.3c-.3-.1-.5-.4-.5-.7s.2-.6.5-.7l.9-.3.3-.9c.1-.3.4-.5.7-.5s.6.1.7.4l.4.9.8.3c.3.1.5.4.5.7s-.2.6-.6.7l-.8.3-.3.9ZM17.6,7.4l.3.8c.1-.3.2-.7.4-.9l.9-.4c-1.2-.5-.8,0-1.3-1.3l-.3.7c0,.1-.2.2-.3.3l-.7.3.7.3c.1,0,.3.2.3.3Z"/><path d=\"M18.4,16.5c-.1.3-.4.5-.7.5s-.6-.2-.7-.5l-.2-.5-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.4-.7l.6-.3.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM17.7,15.9c.3-.8.2-.6.8-.9-.8-.3-.5-.1-.8-.8-.3.7-.1.5-.8.8.8.4.5.1.8.9Z"/><path d=\"M21.6,13.3c-.1.3-.4.4-.7.5s-.6-.1-.7-.4l-.3-.6-.6-.2c-.3-.1-.5-.4-.5-.7s.1-.6.5-.7l.6-.2.2-.6c.1-.3.4-.5.7-.5s.6.2.7.5l.2.6.6.2c.3.1.5.4.5.7s-.2.6-.5.7l-.5.2-.2.6ZM20.9,12.7l.3-.5c.1-.1.4-.2.6-.3l-.6-.3-.3-.6c-.3.8-.2.5-.9.8.7.3.5.1.9.8Z"/><path d=\"M9.7,10.7c-.3,0-.4-.3-.4-.5s.3-.4.5-.4c.7.2,1.4,0,2-.3s.5,0,.5.1c.2.2,0,.5-.1.6-.7.5-1.6.6-2.5.4Z"/></svg>' };
      const areaLabels = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', retiro_lifting:'Lifting/Retiro', facial:'Facial' };
      const user = window.currentUser;

      let areasHTML = '';
      areas.forEach((ar, i) => {
        const aKey = String(ar.area||'').toLowerCase()
          .replace(/ó/g,'o').replace(/á/g,'a').replace(/é/g,'e').replace(/ñ/g,'n');
        const icon = areaIcons[aKey] || '🔄';
        const label = areaLabels[aKey] || ar.area || 'Servicio';
        const est = String(ar.estado||'').toLowerCase();
        const esCompletado = est === 'completado';
        const esEnServicio = est === 'en servicio';
        const esEsperando  = est === 'esperando';
        const esMio = ar.staff === (user && user.name);

        if (esCompletado) {
          areasHTML += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;opacity:0.7;">
            <span style="font-size:16px;">${icon}</span>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:700;color:var(--success);">${label} · ${ar.staff||'—'}</div>
              <div style="font-size:11px;color:var(--ink-soft);">${ar.tentativo||''}</div>
            </div>
            <div style="font-size:12px;font-weight:800;color:var(--success);">$${ar.precio||0}</div>
            <span style="font-size:10px;font-weight:700;background:var(--success);color:white;padding:2px 8px;border-radius:100px;">✅</span>
          </div>`;
        } else if (esEnServicio && esMio) {
          // Mi área actual — preseleccionada, no se puede desmarcar
          areasHTML += `<label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--info-bg);border-radius:12px;margin-bottom:8px;border:2px solid var(--info);cursor:pointer;">
            <input type="checkbox" data-area-idx="${ar.idx}" checked disabled style="width:18px;height:18px;accent-color:var(--info);">
            <span style="font-size:16px;">${icon}</span>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:800;color:var(--info);">👇 ${label} — yo</div>
              <div style="font-size:11px;color:var(--ink-soft);">${ar.tentativo||''}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:var(--info);">$${ar.precio||0}</div>
          </label>`;
        } else if (esEsperando) {
          // ¿Esta área es de la especialidad de la staff? Si no, se muestra bloqueada.
          const _puedeArea = window.esMismaAreaM3
            ? window.esMismaAreaM3(user && user.area, ar.area || label)
            : true;
          if (_puedeArea) {
            // Áreas disponibles que SÍ puede hacer — puede elegir tomarlas
            areasHTML += `<label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg);border-radius:12px;margin-bottom:8px;border:1.5px solid var(--line);cursor:pointer;">
              <input type="checkbox" data-area-idx="${ar.idx}" style="width:18px;height:18px;accent-color:var(--accent);">
              <span style="font-size:16px;">${icon}</span>
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:700;color:var(--ink);">${label}</div>
                <div style="font-size:11px;color:var(--ink-soft);">${ar.tentativo||''}</div>
              </div>
              <div style="font-size:13px;font-weight:800;color:var(--ink);">$${ar.precio||0}</div>
            </label>`;
          } else {
            // Área de OTRA especialidad — bloqueada, queda para otra staff
            areasHTML += `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg);border-radius:12px;margin-bottom:8px;border:1.5px dashed var(--line);opacity:0.6;">
              <span style="font-size:16px;">🔒</span>
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:700;color:var(--ink-soft);">${label}</div>
                <div style="font-size:11px;color:var(--ink-faint);">Para otra staff</div>
              </div>
              <div style="font-size:13px;font-weight:800;color:var(--ink-faint);">$${ar.precio||0}</div>
            </div>`;
          }
        }
      });

      document.getElementById('confirmSvcTMPanel').style.display = 'block';
      document.getElementById('confirmSvcNormalPanel').style.display = 'none';
      document.getElementById('confirmSvcTMAreas').innerHTML = areasHTML;
      document.getElementById('confirmSvcCambiarBtn').style.display = '';
      document.getElementById('confirmSvcTitle').textContent = '🎯 Ticket multi-servicio';
    } else {
      const esCompartida = window._desgloseAcumulado && window._desgloseAcumulado.length > 0;
      if (esCompartida && desgloseHtml) {
        document.getElementById('confirmSvcName').innerHTML = desgloseHtml
          + '<div style="padding:8px 10px;border:2px solid var(--info);border-radius:10px;margin-top:4px;">'
          + '<div style="font-size:10px;font-weight:700;color:var(--info);text-transform:uppercase;margin-bottom:2px;">Tu servicio</div>'
          + '<div style="font-size:13px;font-weight:800;">' + svcName + ' &middot; $' + svcPrice + '</div>'
          + '</div>';
        document.getElementById('confirmSvcPrice').textContent = '';
        document.getElementById('confirmSvcTitle').textContent = '🤝 Promo compartida';
      } else {
        document.getElementById('confirmSvcName').textContent = svcName;
        document.getElementById('confirmSvcPrice').textContent = svcPrice > 0 ? '$' + svcPrice : '—';
        const esEnganche = window._esEnganche || false;
        document.getElementById('confirmSvcTitle').textContent = esEnganche
          ? '🔄 Servicio de enganche' : '📋 Servicio asignado';
      }
    }

    document.getElementById('confirmServiceModal').classList.add('active');
  }

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

  // Alias: confirmarServicioObligatorio se llama en varios sitios pero la función real
  // es showConfirmServiceModal (abre el modal de confirmación con sus botones).
  window.confirmarServicioObligatorio = showConfirmServiceModal;

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
          const linkedSP = allSP.find(t =>
            (t.nombre === data.clientName || t.codigo === (data.clienteCodigo || window._as1Client))
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
        _finResp = await apiPost('finalizarAtencion', {
          idEspera: idEsperaActual,
          chicaNombre: user?.name || '',
          clienteNombre: data.clientName,
          clienteCodigo: window._as1Client || '',
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

        const result = await apiPost(accionFin, {
          idEspera: idEsperaActual,
          chicaNombre: user && user.name ? user.name : '',
          clienteNombre: displayName,
          clienteCodigo: window._as1Client || '',
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

      const result = await apiPost('finalizarAtencion', {
        idEspera: window._as1IdEspera || '',
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        clienteCodigo: window._as1Client || '',
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
        idEspera: window._as1IdEspera || '',
        chicaNombre: user?.name || '',
        clienteNombre: data.clientName,
        clienteCodigo: window._as1Client || '',
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
        
        window._as1Client = a1.codigo;
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

    // En móvil: no embeber. Mostrar una tarjeta con botón que abre SYNA en pestaña propia.
    if (_esMovilSyna_()) {
      slot.innerHTML =
        '<div style="padding:36px 24px;text-align:center;">' +
          '<div style="font-size:15px;line-height:1.5;color:#666;margin-bottom:18px;">' +
            'La agenda SYNA se abre en su propia pantalla en el teléfono.' +
          '</div>' +
          '<button id="btnAbrirSynaMovil" ' +
            'style="background:#6C4CE0;color:#fff;border:0;border-radius:14px;' +
            'padding:14px 24px;font-size:15px;font-weight:600;cursor:pointer;">' +
            'Abrir SYNA' +
          '</button>' +
        '</div>';
      var _b = document.getElementById('btnAbrirSynaMovil');
      if (_b) _b.onclick = function () { window.open(synaUrl_('embed=1&user=mikaela&view=reservar'), '_blank'); };
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
        if (!h.nombre && !h.clienteNombre) return;
        const parts = String(h.fecha || '').split('/');
        if (parts.length !== 3) return;
        const fechaDate = new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
        if (fechaDate < lunes || fechaDate > sabado) return;

        const diaN = DIAS_LABEL[fechaDate.getDay()] || 'Otro';
        const diaSortKey = fechaDate.getDay();
        const staff = String(h.chica || '—');
        const valor = Number(h.precio || 0);
        const cliente = clienteDisplay(String(h.nombre || h.clienteNombre || ''), String(h.codigo || h.code || '')) || '—';
        const servicio = String(h.servicio || '—');
        const hora = String(h.hora || '');
        const metodo = String(h.metodoPago || 'Efectivo');
        const itemIdx = window._historialItems.length;
        window._historialItems.push({ ...h, _idx: itemIdx });

        if (!porDia[diaN]) porDia[diaN] = { dia: diaN, sortKey: diaSortKey === 0 ? 7 : diaSortKey, total: 0, count: 0, staff: {} };
        if (!porDia[diaN].staff[staff]) porDia[diaN].staff[staff] = { nombre: staff, total: 0, servicios: [] };
        porDia[diaN].staff[staff].servicios.push({ cliente, servicio, valor, hora, metodo, itemIdx });
        porDia[diaN].staff[staff].total += valor;
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
  
  async function approveAuthorization(reqId) {
    try {
      const result = await apiPost('aprobarAutorizacion', { authId: reqId });
      
      if (result.success) {
        // El sync al Sheet lo hace el staff automáticamente cuando recargarAutorizacionesStaff
        // detecta el cambio de estado (pendiente → aprobado) en su próximo poll (cada 8s)
        await renderAuthorizations(); // Reload list
      } else {
        alert('Error: ' + (result.message || 'No se pudo aprobar'));
      }
    } catch (err) {
      console.error('Error aprobando autorización:', err);
      alert('Error al aprobar la autorización');
    }
  }
  
  async function rejectAuthorization(reqId) {
    try {
      const result = await apiPost('rechazarAutorizacion', { authId: reqId });
      
      if (result.success) {
        alert('✕ Servicio rechazado. El staff será notificado.');
        await renderAuthorizations(); // Reload list
      } else {
        alert('Error: ' + (result.message || 'No se pudo rechazar'));
      }
    } catch (err) {
      console.error('Error rechazando autorización:', err);
      alert('Error al rechazar la autorización');
    }
  }
  async function loadPorCobrar() {
    const list = document.getElementById('porCobrarList');
    const countEl = document.getElementById('porCobrarCount');

    // ── PASO 3: switch Lineas / legacy ──────────────────────────────────────
    // USE_LINEAS_POR_COBRAR = true  → leer desde Lineas (fuente de verdad — ACTIVO POR DEFECTO)
    // Revertir emergencia en consola: localStorage.setItem('NEXSERV_LINEAS_PC', '0')
    // Volver a activar:              localStorage.removeItem('NEXSERV_LINEAS_PC')
    const USE_LINEAS_POR_COBRAR = localStorage.getItem('NEXSERV_LINEAS_PC') !== '0';
    const _accion = USE_LINEAS_POR_COBRAR ? 'getPorCobrarDesdeLineas' : 'getPorCobrar';
    console.log('[PorCobrar]', USE_LINEAS_POR_COBRAR ? '🟢 LINEAS (activo)' : '🔴 legacy (emergencia)');

    try {
      const result = await apiGet(_accion);
      if (result.success && result.porCobrar && result.porCobrar.length > 0) {
        window._mkPorCobrarData = result.porCobrar;
        countEl.textContent = result.porCobrar.length;
        list.innerHTML = result.porCobrar.map(p => `
          <div class="card" style="margin-bottom: 8px; padding: 14px; border-left: 4px solid var(--success);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="client-avatar ${p.esTop ? 'is-top' : ''}" style="flex-shrink: 0;">${p.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 15px;">${p.nombre} ${p.esTop ? '<span class="top-star">⭐</span>' : ''}</div>
                <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-top: 2px;">${p.servicio} · atendida por ${p.tomadaPor}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">
                <button onclick="cobrarDesdeBtn(this)"
                  data-id="${p.idEspera}"
                  data-nombre="${(p.nombre||'').replace(/'/g,'&#39;')}"
                  data-servicio="${(p.servicio||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;')}"
                  data-chica="${(p.tomadaPor||'').replace(/'/g,'&#39;')}"
                  data-total="${p.total||'0'}"
                  data-regular="${p.precioRegular||p.total||'0'}"
                  data-promo="${(p.promoNombre||'').replace(/'/g,'&#39;')}"
                  data-desglose="${p.serviciosDetalle ? encodeURIComponent(JSON.stringify(p.serviciosDetalle)) : ''}"
                  style="padding: 10px 16px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;">💵 Cobrar</button>
                <button onclick="mkEsperarAsignacion('${p.idEspera}','${(p.nombre||'').replace(/'/g,"\'")}','${(p.servicio||'').replace(/'/g,"\'")}','${p.total||'0'}','${(p.tomadaPor||'').replace(/'/g,"\'")}','${p.precioRegular||p.total||'0'}','${(p.promoNombre||'')}','${p.serviciosDetalle ? encodeURIComponent(JSON.stringify(p.serviciosDetalle)) : ''}')"
                  style="padding: 7px 12px; background: var(--bg); color: var(--ink-soft); border: 1.5px solid var(--line); border-radius: var(--radius-pill); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;">⏳ Esperar</button>
              </div>
            </div>
            <!-- Asignar al cobro -->
            <div id="asignarRow-${p.idEspera}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);">
              <div style="font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:6px;">+ AGREGAR AL COBRO DE ESTA CLIENTA:</div>
              <div id="asignarOpciones-${p.idEspera}" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
            </div>
          </div>
        `).join('');
        if (window._mkEsperandoCobro && window._mkEsperandoCobro.length > 0) {
          mkActualizarAsignarOpciones();
          mkRenderEsperandoCobro();
        }
      } else {
        countEl.textContent = '0';
        list.innerHTML = '<div class="card" style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No hay clientas por cobrar</div>';
      }
    } catch (err) {
      console.error('Error cargando por cobrar:', err);
    }
  }

  // ============================================
  // PRODUCTOS DE MARCA — lista fija + stock en localStorage
  // ============================================
  const PRODUCTOS_MARCA_BASE = [
    { nombre: 'Gel fijador de cejas tipo brow',  precio: 12, min: 5  },
    { nombre: 'Gel fijador de cejas tipo rimel', precio: 12, min: 5  },
    { nombre: 'Gel fijador de cejas tipo brow (al mayor)', precio: 8, min: 1  },
    { nombre: 'Pomada dark Brown',               precio: 10, min: 1  },
    { nombre: 'Brocha 2 en 1 Pequeña',           precio: 5,  min: 5  },
    { nombre: 'Brocha 2 en 1 Grande',            precio: 8,  min: 3  },
    { nombre: 'Brocha Rubor',                    precio: 9,  min: 5  },
    { nombre: 'Brocha de Contorno',              precio: 9,  min: 5  },
    { nombre: 'Brocha de Cejas',                 precio: 10, min: 5  },
    { nombre: 'Brocha difuminar',                precio: 8,  min: 5  },
    { nombre: 'Brocha de Contorno (cejas)',       precio: 8,  min: 5  },
    { nombre: 'Tijera',                          precio: 9,  min: 1  },
    { nombre: 'Ventilador',                      precio: 15, min: 1  },
    { nombre: 'Lápiz Dark Brown',                precio: 15, min: 3  },
    { nombre: 'Lápiz Chocolate',                 precio: 15, min: 3  },
    { nombre: 'Lápiz Gray',                      precio: 15, min: 3  },
    { nombre: 'Lápiz Blonde',                    precio: 15, min: 2  },
    // ── PAQUETES ──────────────────────────────────────────────────────────────
    { nombre: 'Pack Brochas Rostro',    precio: 10, min: 1, tipo: 'paquete',
      descripcion: 'Brocha Rubor + Brocha de Contorno',
      items: ['Brocha Rubor', 'Brocha de Contorno'] },
    { nombre: 'Pack Pomada + Brocha',    precio: 15, min: 1, tipo: 'paquete',
      descripcion: 'Pomada cejas (cualquier tono) + Brocha de Cejas',
      items: ['Pomada dark Brown', 'Brocha de Cejas'] },
    { nombre: 'Kit Brochas Completo',    precio: 35, min: 1, tipo: 'paquete',
      descripcion: 'Brocha de Cejas + Brocha difuminar + Brocha de Contorno (cejas) + Brocha de Contorno + Brocha Rubor',
      items: ['Brocha de Cejas', 'Brocha difuminar', 'Brocha de Contorno (cejas)', 'Brocha de Contorno', 'Brocha Rubor'] },
    { nombre: 'Kit Brocha de Cejas',     precio: 20, min: 1, tipo: 'paquete',
      descripcion: 'Brocha de Cejas + Brocha difuminar + Brocha de Contorno (cejas)',
      items: ['Brocha de Cejas', 'Brocha difuminar', 'Brocha de Contorno (cejas)'] },
  ];

  // Stock inicial (si no hay guardado)
  const STOCK_INICIAL = {
    'Gel fijador de cejas tipo brow': 36,
    'Gel fijador de cejas tipo rimel': 10,
    'Gel fijador de cejas tipo brow (al mayor)': 0,
    'Pomada dark Brown': 12,
    'Brocha 2 en 1 Pequeña': 56,
    'Brocha 2 en 1 Grande': 14,
    'Brocha Rubor': 45,
    'Brocha de Contorno': 18,
    'Brocha de Cejas': 103,
    'Brocha difuminar': 81,
    'Brocha de Contorno (cejas)': 29,
    'Tijera': 2,
    'Ventilador': 4,
    'Lápiz Dark Brown': 14,
    'Lápiz Chocolate': 11,
    'Lápiz Gray': 9,
    'Lápiz Blonde': 2,
  };

  function getStockData() {
    try {
      const raw = localStorage.getItem('nexserv_stock');
      return raw ? JSON.parse(raw) : { ...STOCK_INICIAL };
    } catch(e) { return { ...STOCK_INICIAL }; }
  }

  function saveStockData(stock) {
    try { localStorage.setItem('nexserv_stock', JSON.stringify(stock)); } catch(e) {}
  }

  function getProductosMarca() {
    const stock = getStockData();
    const stockDe = (nombre) => (stock[nombre] !== undefined ? stock[nombre] : (STOCK_INICIAL[nombre] || 0));
    return PRODUCTOS_MARCA_BASE.map(p => {
      // Los packs no tienen stock propio: su disponibilidad es el MÍNIMO stock de sus
      // componentes (cuántos packs se pueden armar). Antes su nombre no estaba en el stock
      // → caía a 0 y el pack salía agotado/desactivado aunque hubiera componentes.
      let st;
      if (p.tipo === 'paquete' && Array.isArray(p.items) && p.items.length > 0) {
        st = Math.min.apply(null, p.items.map(stockDe));
      } else {
        st = stockDe(p.nombre);
      }
      return { ...p, stock: st };
    });
  }

  // Expandir paquetes a sus items individuales para descuento de stock
  function expandirPaquetes(productos) {
    const expanded = [];
    productos.forEach(function(p) {
      const base = PRODUCTOS_MARCA_BASE.find(function(b){ return b.nombre === p.nombre; });
      if (base && base.tipo === 'paquete' && base.items) {
        base.items.forEach(function(itemNombre) {
          expanded.push({ nombre: itemNombre, cantidad: p.cantidad || 1 });
        });
      } else {
        expanded.push(p);
      }
    });
    return expanded;
  }

  function descontarStockVenta(productos) {
    const stock = getStockData();
    const productosExpandidos = expandirPaquetes(productos);
    productosExpandidos.forEach(p => {
      if (stock[p.nombre] !== undefined) {
        stock[p.nombre] = Math.max(0, stock[p.nombre] - Number(p.cantidad || 1));
      }
    });
    saveStockData(stock);
  }

  function openMkStock() {
    // Abrir el modal de productos en modo "ver stock" (sin clienta)
    window._apTicketId = '__stock__';
    window._apClienteNombre = '';
    document.getElementById('apClienteName').innerHTML = '<svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:6px;"><path d="M9 3a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1a2 2 0 0 0-2-2H9Zm0 2h6v2H9V5Z"/></svg>Consulta de stock';
    document.getElementById('apSearch').value = '';
    // Cambiar el botón de confirmar por uno de cerrar
    const confirmBtn = document.querySelector('#agregarProductoModal .btn-primary:not(.outline)');
    if (confirmBtn) { confirmBtn.style.display = 'none'; }
    filtrarProductosAP();
    renderAPTicketItems();
    document.getElementById('agregarProductoModal').classList.add('active');
  }

  function closeMkStock() {
    closeModal();
    // Restaurar botón confirmar
    const confirmBtn = document.querySelector('#agregarProductoModal .btn-primary:not(.outline)');
    if (confirmBtn) { confirmBtn.style.display = ''; }
  }

  async function renderMkStock() {
    const el = document.getElementById('mkStockList');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);">⏳ Cargando productos...</div>';

    // Forzar recarga fresca del backend
    await cargarProductosMarca();
    const q = (document.getElementById('mkStockSearch')?.value || '').toLowerCase();
    const productos = window._productosMarca || [];
    const filtrados = q ? productos.filter(p => p.nombre.toLowerCase().includes(q)) : productos;

    if (filtrados.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);">No hay productos de marca en SIRA</div>';
      return;
    }

    el.innerHTML = filtrados.map(p => {
      const minimo = p.minimo || 0;
      const bajo = p.stock <= minimo && p.stock > 0;
      const agotado = p.stock === 0;
      const color = agotado ? 'var(--danger)' : bajo ? '#e0a800' : 'var(--success)';
      const badge = agotado ? '🔴 AGOTADO' : bajo ? '🟡 BAJO' : '🟢 OK';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-card);border-radius:16px;margin-bottom:8px;border-left:4px solid ${color};">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">${p.nombre}</div>
            <div style="font-size:11px;color:var(--ink-faint);margin-top:2px;">Precio venta: $${p.precio} · Mín: ${minimo}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:26px;font-weight:800;color:${color};line-height:1;">${p.stock}</div>
            <div style="font-size:10px;font-weight:700;color:${color};">${badge}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function ajustarStock(nombre, delta) {
    const stock = getStockData();
    if (stock[nombre] === undefined) stock[nombre] = STOCK_INICIAL[nombre] || 0;
    stock[nombre] = Math.max(0, stock[nombre] + delta);
    saveStockData(stock);
    renderMkStock();
  }

  // Override cargarProductosMarca para usar la lista local
  window._productosMarca = null; // forzar uso de función local
  async function cargarProductosMarca() {
    window._productosMarca = getProductosMarca();
  }

  // ============================================
  // VENTA DE PRODUCTOS AL COBRAR
  // ============================================
  window._apTicketId = null;
  window._apClienteNombre = null;
  window._apProductosEnTicket = {}; // { ticketId: [{nombre, precio, cantidad}] }

  function openAgregarProducto(idEspera, nombre, totalServicio) {
    window._apTicketId = idEspera;
    window._apClienteNombre = nombre;
    document.getElementById('apClienteName').textContent = 'Para: ' + nombre;
    document.getElementById('apSearch').value = '';
    filtrarProductosAP();
    renderAPTicketItems();
    document.getElementById('agregarProductoModal').classList.add('active');
  }

  function filtrarProductosAP() {
    const q = (document.getElementById('apSearch')?.value || '').toLowerCase();
    const listEl = document.getElementById('apProductList');
    if (!listEl) return;

    // Si no hay productos cargados aún, cargar del backend
    if (!window._productosMarca || window._productosMarca.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--ink-faint);padding:20px;font-size:13px;">⏳ Cargando productos...</div>';
      cargarProductosMarca().then(() => filtrarProductosAP());
      return;
    }

    const productos = window._productosMarca;
    const filtrados = q ? productos.filter(p => p.nombre.toLowerCase().includes(q)) : productos;

    if (filtrados.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--ink-faint);padding:20px;font-size:13px;">No se encontraron productos</div>';
      return;
    }

    listEl.innerHTML = filtrados.map((p, i) => {
      const agotado = p.stock === 0;
      return `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-card);border-radius:12px;margin-bottom:6px;${agotado ? 'opacity:0.5;' : ''}">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;">${p.nombre}</div>
          <div style="font-size:11px;color:var(--ink-faint);">${p.tipo === 'paquete' ? '<span style="font-size:9px;font-weight:800;background:linear-gradient(135deg,#92400e,#b45309);color:white;padding:2px 6px;border-radius:10px;margin-right:4px;">PACK</span>' + (p.descripcion || '') : 'Stock: <strong>' + p.stock + '</strong>' + (agotado ? ' &middot; SIN STOCK' : '')}</div>
        </div>
        <input type="number" value="${p.precio}" min="0" step="0.5" id="ap-precio-${i}"
          style="width:60px;padding:6px;border:1.5px solid var(--line);border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;text-align:center;background:var(--bg);"
          ${agotado ? 'disabled' : ''}>
        <button onclick="agregarProductoATicket('${p.nombre.replace(/'/g,"\\'")}', document.getElementById('ap-precio-${i}').value)"
          style="padding:8px 14px;background:${agotado ? 'var(--line)' : 'var(--accent)'};color:white;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:700;cursor:${agotado ? 'default' : 'pointer'};"
          ${agotado ? 'disabled' : ''}>+ Agregar</button>
      </div>
    `}).join('');
  }

  function agregarProductoATicket(nombre, precio) {
    const id = window._apTicketId;
    if (!id) return;
    if (!window._apProductosEnTicket[id]) window._apProductosEnTicket[id] = [];
    const precioNum = Number(precio) || 0;
    // Si ya existe el mismo producto, sumar cantidad
    const existing = window._apProductosEnTicket[id].find(p => p.nombre === nombre);
    if (existing) {
      existing.cantidad = (existing.cantidad || 1) + 1;
      existing.subtotal = existing.cantidad * precioNum;
    } else {
      window._apProductosEnTicket[id].push({ nombre, precio: precioNum, cantidad: 1, subtotal: precioNum });
    }
    renderAPTicketItems();
    showToast('✓ ' + nombre + ' agregado al ticket');
  }

  function quitarProductoDeTicket(nombre) {
    const id = window._apTicketId;
    if (!id || !window._apProductosEnTicket[id]) return;
    window._apProductosEnTicket[id] = window._apProductosEnTicket[id].filter(p => p.nombre !== nombre);
    renderAPTicketItems();
  }

  function renderAPTicketItems() {
    const id = window._apTicketId;
    const items = (id && window._apProductosEnTicket[id]) ? window._apProductosEnTicket[id] : [];
    const ticketEl = document.getElementById('apTicketItems');
    const listEl = document.getElementById('apTicketList');
    const totalEl = document.getElementById('apTicketTotal');
    if (!ticketEl) return;
    if (items.length === 0) {
      ticketEl.style.display = 'none';
      return;
    }
    ticketEl.style.display = 'block';
    listEl.innerHTML = items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:13px;font-weight:700;">${item.nombre}</div>
          <div style="font-size:11px;color:var(--ink-faint);">x${item.cantidad} · $${item.precio} c/u</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:14px;font-weight:800;">$${(item.precio * item.cantidad).toFixed(2)}</div>
          <button onclick="quitarProductoDeTicket('${item.nombre.replace(/'/g,"\\'")})"
            style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:2px;">✕</button>
        </div>
      </div>
    `).join('');
    const total = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    totalEl.textContent = '$' + total.toFixed(2);
  }

  async function confirmarProductosTicket() {
    const id = window._apTicketId;
    const items = (id && window._apProductosEnTicket[id]) ? window._apProductosEnTicket[id] : [];
    if (items.length === 0) { closeModal(); return; }

    // Mostrar en la card del ticket los productos agregados
    const ticketDiv = document.getElementById('productos-ticket-' + id);
    if (ticketDiv) {
      const total = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
      ticketDiv.innerHTML = `
        <div style="background:var(--accent-bg);border-radius:10px;padding:8px 12px;margin-top:4px;">
          <div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M7 7a5 5 0 0 1 10 0h2.5a1 1 0 0 1 1 .92l.96 12A2 2 0 0 1 19.46 22H4.54a2 2 0 0 1-1.99-2.08l.96-12A1 1 0 0 1 4.5 7H7Zm2 0h6a3 3 0 0 0-6 0Z"/></svg>PRODUCTOS AGREGADOS</div>
          ${items.map(i => `<div style="font-size:12px;font-weight:600;">• ${i.nombre} x${i.cantidad} = $${(i.precio*i.cantidad).toFixed(2)}</div>`).join('')}
          <div style="font-size:12px;font-weight:800;color:var(--accent-deep);margin-top:4px;">Total productos: $${total.toFixed(2)}</div>
        </div>
      `;
    }

    // Solo se ADJUNTAN al ticket; se registran UNA sola vez al confirmar el cobro
    // (handleRegistrarVentaProductos desde el flujo de cobro). Esto evita el doble
    // registro en el reporte. El stock en la UI sí se refleja al instante.
    descontarStockVenta(items);

    closeModal();
    showToast('✓ Productos agregados al cobro de ' + (window._apClienteNombre || 'la clienta'));
    window._productosMarca = null;
    cargarProductosMarca();
  }

  function showToast(msg) {
    let t = document.getElementById('globalToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'globalToast';
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:white;padding:10px 20px;border-radius:100px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  // ════════════ MÓDULO DE FACTURACIÓN (preparado para SRI) ════════════
  // Captura los datos fiscales de la clienta ANTES de cobrar. NO toca la lógica de caja:
  // el guardado se hace en un endpoint aparte (guardarFacturacion) tras el cobro OK.
  window._facturacionActual  = null;   // objeto facturacion del cobro en curso
  window._cobroClienteFiscal = null;   // datos fiscales de la clienta (cache del cobro actual)

  function _factEmailValido(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
  }
  function _factFila(k, v) {
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0;">' +
           '<span style="color:var(--ink-faint);">' + k + '</span>' +
           '<span style="font-weight:700;text-align:right;">' + String(v || '') + '</span></div>';
  }
  function _factHint(msg) {
    const h = document.getElementById('factHint'); if (!h) return;
    if (msg) { h.textContent = msg; h.style.display = 'block'; } else { h.style.display = 'none'; }
  }
  function _factMarcarBoton(modo) {
    const bm = document.getElementById('factBtnMismos'), bo = document.getElementById('factBtnOtros');
    [[bm, 'mismos_datos'], [bo, 'otros_datos']].forEach(function(par) {
      const b = par[0]; if (!b) return; const on = (modo === par[1]);
      b.style.background  = on ? 'var(--ink)'  : 'var(--bg-card)';
      b.style.color       = on ? '#fff'        : 'var(--ink)';
      b.style.borderColor = on ? 'var(--ink)'  : 'var(--line)';
    });
  }

  // Reset del bloque al abrir el modal de cobro
  function factResetUI() {
    window._facturacionActual = null;
    window._cobroClienteFiscal = null;
    const block = document.getElementById('factBlock');
    if (block) block.style.display = 'block';   // visible también en cobro grupal (factura a la pagadora)
    ['factResumen', 'factForm', 'factRecordarWrap', 'factHint'].forEach(function(id) {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    ['factTipo', 'factNumero', 'factRazon', 'factCorreo', 'factTelefono', 'factDireccion'].forEach(function(id) {
      const el = document.getElementById(id); if (el) { el.value = ''; el.disabled = false; }
    });
    const rec = document.getElementById('factRecordar'); if (rec) rec.checked = true;
    _factMarcarBoton(null);
  }

  async function factSetModo(modo) {
    _factHint('');
    const recWrap = document.getElementById('factRecordarWrap');
    if (modo === 'mismos_datos') {
      document.getElementById('factForm').style.display = 'none';
      let fiscal = window._cobroClienteFiscal;
      if (!fiscal) {
        try {
          // En grupal, la facturación es a nombre de la pagadora (principal = clientas[0]).
          const _codFiscal = window._cobrarCodigo ||
            (window._cobroGrupal && window._cobroGrupal.clientas && window._cobroGrupal.clientas[0] && window._cobroGrupal.clientas[0].codigo) || '';
          if (_codFiscal) {
            const r = await apiGet('getDatosFacturacion', { codigo: _codFiscal });
            if (r && r.success) fiscal = r.datos || null;
          }
        } catch (e) { console.error(e); }
        window._cobroClienteFiscal = fiscal;
      }
      const nombre = (fiscal && fiscal.nombre) || (document.getElementById('cobrarClientName') || {}).textContent || '';
      const ident  = (fiscal && fiscal.cedula)   || '';
      const correo = (fiscal && fiscal.correo)   || '';
      const tel    = (fiscal && fiscal.telefono) || '';
      const faltan = [];
      if (!String(nombre).trim()) faltan.push('nombre');
      if (!String(ident).trim())  faltan.push('identificación');
      if (!_factEmailValido(correo)) faltan.push('correo válido');
      if (faltan.length) {
        document.getElementById('factResumen').style.display = 'none';
        alert('A la clienta le falta: ' + faltan.join(', ') + '.\n\nLos podés completar en "Otros datos" para facturar a su nombre.');
        await factSetModo('otros_datos');
        const tEl = document.getElementById('factTipo'); if (tEl) tEl.value = ident ? 'Cédula' : '';
        if (String(ident).trim())  document.getElementById('factNumero').value = ident;
        document.getElementById('factRazon').value = nombre || '';
        if (String(correo).trim()) document.getElementById('factCorreo').value = correo;
        if (String(tel).trim())    document.getElementById('factTelefono').value = tel;
        const dirEl = document.getElementById('factDireccion');
        if (dirEl && window._cobroClienteFiscal && window._cobroClienteFiscal.direccion)
          dirEl.value = window._cobroClienteFiscal.direccion || '';
        return;
      }
      const tipo = (String(ident).replace(/\D/g, '').length === 13) ? 'RUC' : 'Cédula';
      window._facturacionActual = {
        modo: 'mismos_datos', tipoIdentificacion: tipo, identificacion: String(ident),
        razonSocial: nombre, correo: correo, telefono: tel || '', recordarDatos: false
      };
      const res = document.getElementById('factResumen');
      res.innerHTML = '<div style="font-weight:800;margin-bottom:6px;">Se factura a la clienta</div>' +
        _factFila('Nombre', nombre) + _factFila('Tipo', tipo) + _factFila('Identificación', ident) +
        _factFila('Correo', correo) + (String(tel).trim() ? _factFila('Teléfono', tel) : '');
      res.style.display = 'block';
      _factMarcarBoton('mismos_datos');
      recWrap.style.display = 'none'; // ya están en la ficha de la clienta
    } else {
      document.getElementById('factResumen').style.display = 'none';
      document.getElementById('factForm').style.display = 'block';
      recWrap.style.display = 'flex';
      _factMarcarBoton('otros_datos');
      window._facturacionActual = { modo: 'otros_datos' }; // se completa al confirmar
    }
  }

  function factOnTipoChange() {
    const tipo = document.getElementById('factTipo').value;
    const num = document.getElementById('factNumero'), raz = document.getElementById('factRazon');
    if (tipo === 'Consumidor final') {
      num.value = '9999999999999'; num.disabled = true;
      raz.value = 'CONSUMIDOR FINAL'; raz.disabled = true;
    } else {
      if (num.disabled) { num.value = ''; num.disabled = false; }
      if (raz.disabled) { raz.value = ''; raz.disabled = false; }
    }
  }

  // Lee y valida el formulario "otros_datos" → {ok, fact, msg}
  function _factLeerFormulario() {
    const tipo = document.getElementById('factTipo').value;
    const numero = String(document.getElementById('factNumero').value || '').trim();
    const razon  = String(document.getElementById('factRazon').value || '').trim();
    const correo = String(document.getElementById('factCorreo').value || '').trim();
    const tel    = String(document.getElementById('factTelefono').value || '').trim();
    const dir    = String((document.getElementById('factDireccion') || {}).value || '').trim();
    const recordar = !!(document.getElementById('factRecordar') || {}).checked;
    if (!tipo) return { ok: false, msg: 'Elegí el tipo de identificación.' };
    if (tipo === 'Consumidor final') {
      return { ok: true, fact: { modo: 'otros_datos', tipoIdentificacion: 'Consumidor final',
        identificacion: '9999999999999', razonSocial: 'CONSUMIDOR FINAL', correo: correo,
        telefono: tel, direccion: dir, recordarDatos: recordar } };
    }
    if (!numero) return { ok: false, msg: 'Ingresá el número de identificación.' };
    if (!razon)  return { ok: false, msg: 'Ingresá el nombre o razón social.' };
    if (!_factEmailValido(correo)) return { ok: false, msg: 'Ingresá un correo electrónico válido.' };
    return { ok: true, fact: { modo: 'otros_datos', tipoIdentificacion: tipo, identificacion: numero,
      razonSocial: razon, correo: correo, telefono: tel, direccion: dir, recordarDatos: recordar } };
  }

  // Validación final antes de cobrar → {ok, fact, msg}
  function factValidarParaCobro() {
    const modo = window._facturacionActual && window._facturacionActual.modo;
    if (!modo) return { ok: false, msg: 'Elegí los datos de facturación (Mismos datos u Otros datos) antes de cobrar.' };
    if (modo === 'mismos_datos') {
      if (!window._facturacionActual.identificacion || !window._facturacionActual.correo)
        return { ok: false, msg: 'Faltan datos de la clienta para facturar.' };
      return { ok: true, fact: window._facturacionActual };
    }
    const r = _factLeerFormulario();
    if (!r.ok) return r;
    window._facturacionActual = r.fact;
    return { ok: true, fact: r.fact };
  }

  // Arma el documento listo para SRI (NO se envía al SRI todavía; solo se persiste para el futuro).
  function factBuildDocumentoSRI(fact, snap) {
    const total = Number(snap.total || 0);
    const ivaRate = 0.15; // IVA Ecuador 2024+ — CONFIRMAR antes de conectar SRI
    // Asunción preliminar: el precio cobrado YA incluye IVA (servicios al público).
    const base = ivaRate > 0 ? total / (1 + ivaRate) : total;
    return {
      facturacion: fact,
      servicios: snap.servicios || [],
      subtotal: Math.round(base * 100) / 100,
      descuento: Number(snap.descuento || 0),
      iva: Math.round((total - base) * 100) / 100,
      ivaRate: ivaRate,
      ivaIncluido: true,             // preliminar — confirmar política de precios
      total: total,
      metodoPago: snap.metodoPago || '',
      fechaEmision: snap.fechaEmision || new Date().toISOString()
    };
  }

  // ════════════ ÚLTIMO SERVICIO DE CEJAS (solo staff de cejas) ════════════
  // Muestra/oculta el botón según el área de la staff logueada, y al tocarlo trae
  // el último servicio de cejas de la clienta (fecha/hora · staff · servicio).
  function _esStaffCejas() {
    return String((window.currentUser && window.currentUser.area) || '').toLowerCase().indexOf('cej') >= 0;
  }
  function _gateCejasBtn() {
    const esCejas = _esStaffCejas();
    [1, 2].forEach(function(s) {
      const box = document.getElementById('as' + s + 'CejasBox');
      if (box) box.style.display = esCejas ? 'block' : 'none';
      const info = document.getElementById('as' + s + 'CejasInfo');
      if (info) { info.style.display = 'none'; info.innerHTML = ''; }  // reset al entrar a la pantalla
    });
  }
  async function verUltimoCejas(slot) {
    const codigo = slot === 1 ? (window._as1Client || '') : (window._as2Client || '');
    const infoEl = document.getElementById('as' + slot + 'CejasInfo');
    if (!infoEl) return;
    if (infoEl.style.display === 'block') { infoEl.style.display = 'none'; return; }  // toggle cerrar
    infoEl.style.display = 'block';
    if (!codigo) { infoEl.innerHTML = '<span style="color:var(--ink-faint);">No hay código de clienta.</span>'; return; }
    infoEl.innerHTML = '<span style="color:var(--ink-faint);">⏳ Buscando…</span>';
    try {
      const r = await apiGet('getUltimoServicioArea', { codigo: codigo, area: 'cejas' });
      if (r && r.success && r.found) {
        infoEl.innerHTML =
          '<div style="font-weight:800;margin-bottom:6px;">🪞 Último servicio de cejas</div>' +
          _factFila('Fecha', (r.fecha || '') + (r.hora ? ' · ' + r.hora : '')) +
          _factFila('Staff', r.staff || '—') +
          _factFila('Servicio', r.servicio || '—') +
          (Number(r.valor) > 0 ? _factFila('Valor', '$' + Number(r.valor).toFixed(2)) : '');
      } else if (r && r.success) {
        infoEl.innerHTML = '<span style="color:var(--ink-faint);">Sin servicios de cejas previos para esta clienta.</span>';
      } else {
        infoEl.innerHTML = '<span style="color:var(--danger);">No se pudo cargar' + (r && r.message ? (': ' + r.message) : '') + '.</span>';
      }
    } catch (e) {
      console.error(e);
      infoEl.innerHTML = '<span style="color:var(--danger);">⚠ No se pudo cargar. Probá de nuevo.</span>';
    }
  }

  // Volver desde Asistencia al home correcto según el rol (sin history.back())
  function _asisVolver() {
    const u = window.currentUser;
    if (!u) { show('login'); return; }
    if (u.role === 'owner' || u.role === 'dueño') show('ownerHome');
    else if (u.role === 'admin') show('mikaelaHome');
    else show('staffHome');
  }

  // ════════════════════════════════════════════════════════════════════
  // ASISTENCIA STAFF — pantalla personal
  // ════════════════════════════════════════════════════════════════════
  let _staffAsisEstado = 'no_iniciada';  // estado local en memoria

  async function _staffAsisCargar() {
    const nombre = window.currentUser?.name;
    if (!nombre) return;
    try {
      const r = await apiGet('getAsistenciaHoy');
      console.log('[Asistencia] getAsistenciaHoy →', r?.success, '| staff:', (r?.staff||[]).map(s=>s.nombre+':'+s.estadoFinal));
      if (!r || !r.success) return;
      const yo = (r.staff || []).find(function(s){ return s.nombre.toLowerCase() === nombre.toLowerCase(); });
      console.log('[Asistencia] yo =', yo ? yo.nombre+' '+yo.estadoFinal+' entrada:'+yo.horaEntrada : 'NO ENCONTRADO (busqué: '+nombre+')');
      _staffAsisEstado = yo ? yo.estadoFinal : 'no_iniciada';
      const horaEntrada = yo ? yo.horaEntrada : '';
      const horaSalida  = yo ? yo.horaSalida  : '';
      _staffAsisRenderEstado(_staffAsisEstado, horaEntrada, horaSalida, yo);
    } catch(e) { console.error('[Asistencia] error:', e); }
  }

  function _normHoraStaff(h) {
    if (!h) return '';
    var s = String(h).trim();
    var m = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (m) return m[1].padStart(2,'0') + ':' + m[2];
    return s;
  }

  function _staffAsisRenderEstado(estado, horaEntrada, horaSalida, yo) {
    horaEntrada = _normHoraStaff(horaEntrada);
    horaSalida  = _normHoraStaff(horaSalida);
    const iconEl      = document.getElementById('staffAsisEstadoIcon');
    const labelEl     = document.getElementById('staffAsisEstadoLabel');
    const horaEl      = document.getElementById('staffAsisHoraInfo');
    const entBtn      = document.getElementById('staffAsisEntradaBtn');
    const salBtn      = document.getElementById('staffAsisSalidaBtn');
    const permBtn     = document.getElementById('staffAsisPermisoBtn');
    const permisoBlq  = document.getElementById('staffAsisPermisoBloque');
    const msgEl       = document.getElementById('staffAsisMsgBox');
    const horaSalEl   = document.getElementById('staffAsisHoraSalida');
    const horaRegEl   = document.getElementById('staffAsisHoraRegreso');

    const cfg = {
      no_iniciada:      { icon:'⬜', label:'Sin registro hoy',    color:'#888888' },
      activa:           { icon:'🟢', label: horaEntrada ? 'Activa desde ' + horaEntrada : 'Activa', color:'#1a9954' },
      en_permiso:       { icon:'🟡', label:'En permiso',           color:'#b8975c' },
      cerrada:          { icon:'⚫', label:'Jornada cerrada',       color:'#666666' },
      salida_pendiente: { icon:'🔴', label:'Salida pendiente',      color:'#e53333' },
      ausente:          { icon:'❌', label:'Ausente hoy',           color:'#e53333' },
    };
    const c = cfg[estado] || cfg.no_iniciada;
    if (iconEl)  iconEl.textContent  = c.icon;
    if (labelEl) { labelEl.textContent = c.label; labelEl.style.color = c.color; }

    // Color del card según estado
    const cardEl = document.getElementById('staffAsisCard');
    if (cardEl) {
      const cardStyles = {
        activa:           { bg:'rgba(34,170,102,0.07)', border:'1.5px solid rgba(34,170,102,0.3)' },
        en_permiso:       { bg:'rgba(184,151,92,0.08)', border:'1.5px solid rgba(184,151,92,0.35)' },
        cerrada:          { bg:'var(--bg-card)',         border:'1.5px solid var(--line)' },
        no_iniciada:      { bg:'var(--bg-card)',         border:'1.5px solid var(--line)' },
        salida_pendiente: { bg:'rgba(238,85,51,0.06)',  border:'1.5px solid rgba(238,85,51,0.3)' },
        ausente:          { bg:'rgba(238,85,51,0.06)',  border:'1.5px solid rgba(238,85,51,0.3)' },
      };
      const cs = cardStyles[estado] || cardStyles.no_iniciada;
      cardEl.style.background = cs.bg;
      cardEl.style.border     = cs.border;
    }

    let infoTxt = '';
    if (estado === 'no_iniciada') {
      infoTxt = 'Registrá tu entrada cuando llegues al salón.';
    } else if (horaEntrada) {
      infoTxt = 'Entrada: ' + horaEntrada;
      if (yo && yo.minutosTrabajados > 0) infoTxt += '  ·  ' + Math.floor(yo.minutosTrabajados/60) + 'h ' + (yo.minutosTrabajados%60) + 'min trabajados';
      if (yo && yo.minutosPermiso > 0) infoTxt += '  ·  Permiso: ' + yo.minutosPermiso + 'min';
    }
    if (horaEl) horaEl.textContent = infoTxt;
    // Mostrar hora de entrada en grande cuando está activa o en permiso
    var horaGrandeEl  = document.getElementById('staffAsisHoraGrande');
    var horaDisplayEl = document.getElementById('staffAsisHoraEntradaDisplay');
    if (horaGrandeEl && horaDisplayEl) {
      if (horaEntrada && (estado === 'activa' || estado === 'en_permiso' || estado === 'cerrada')) {
        horaGrandeEl.textContent  = horaEntrada;
        horaDisplayEl.style.display = 'block';
        if (horaEl) horaEl.textContent = infoTxt.replace('Entrada: ' + horaEntrada, '').replace(/^ · /, '').trim();
      } else {
        horaDisplayEl.style.display = 'none';
      }
    }

    // ── Helpers de habilitado/deshabilitado visual ────────────────────
    // NUNCA usar btn.disabled — el browser aplica opacity nativa que no se puede sobreescribir.
    // Solo controlar con pointer-events + estilo visual.
    function _setEnabled(btn, enabled, esPrimario) {
      if (!btn) return;
      btn.disabled            = false;
      btn.style.outline       = 'none';   // quitar focus ring azul del browser
      btn.style.cursor        = enabled ? 'pointer' : 'default';
      btn.style.pointerEvents = enabled ? '' : 'none';
      btn.style.opacity       = '1';
      btn.style.transition    = 'none';
      if (enabled) {
        if (esPrimario) {
          btn.style.background = '#1a1a1a';
          btn.style.color      = '#ffffff';
          btn.style.border     = '1.5px solid #1a1a1a';
          btn.style.fontWeight = '800';
        } else {
          // Secundario activo: blanco con borde gris oscuro — igual al mockup
          btn.style.background = '#ffffff';
          btn.style.color      = '#1a1a1a';
          btn.style.border     = '1.5px solid #d0d0d0';
          btn.style.fontWeight = '700';
        }
      } else {
        // Deshabilitado: blanco con borde gris claro y texto gris — exacto al mockup
        btn.style.background = '#ffffff';
        btn.style.color      = '#c0c0c0';
        btn.style.border     = '1.5px solid #e8e8e8';
        btn.style.fontWeight = '600';
      }
    }

    // Determinar qué acciones están disponibles según el estado
    const puedoEntrada  = (estado === 'no_iniciada' || estado === 'cerrada' || estado === 'salida_pendiente' || estado === 'ausente');
    const puedoSalida   = (estado === 'activa' || estado === 'en_permiso');
    const puedoPermiso  = (estado === 'activa');

    // El botón primario (negro) es el de la acción disponible principal:
    // sin entrada → Entrada es primario; con entrada → Salida es primario
    const entradaEsPrimario = puedoEntrada;
    const salidaEsPrimario  = puedoSalida && !puedoEntrada;

    _setEnabled(entBtn,  puedoEntrada,  entradaEsPrimario);
    _setEnabled(salBtn,  puedoSalida,   salidaEsPrimario);
    _setEnabled(permBtn, puedoPermiso,  false);

    if (entBtn) entBtn.textContent = '✅ Registrar entrada';

    // Cerrar acordeón de permiso si no está disponible
    if (!puedoPermiso) {
      const permBox = document.getElementById('staffAsisPermisoBox');
      if (permBox) permBox.style.display = 'none';
      const arrow = document.getElementById('staffAsisPermisoArrow');
      if (arrow) arrow.style.transform = '';
    }

    // ── Bloque EN PERMISO: filas de confirmación ─────────────────────
    if (permisoBlq) permisoBlq.style.display = (estado === 'en_permiso') ? 'block' : 'none';
    if (estado === 'en_permiso') {
      if (horaSalEl) {
        const hPerm = (yo && yo.permisoActivo) ? yo.permisoActivo.hora : (horaEntrada || '—');
        horaSalEl.textContent = hPerm;
      }
      if (horaRegEl) horaRegEl.textContent = '·····';
    }

    if (msgEl) msgEl.textContent = '';
  }

  function _staffAsisTogglePermiso() {
    const box   = document.getElementById('staffAsisPermisoBox');
    const arrow = document.getElementById('staffAsisPermisoArrow');
    if (!box) return;
    const abierto = box.style.display !== 'none';
    box.style.display   = abierto ? 'none' : 'block';
    if (arrow) arrow.style.transform = abierto ? '' : 'rotate(180deg)';
  }

  async function _staffAsisAccion(tipo) {
    const nombre = window.currentUser?.name;
    const msgEl  = document.getElementById('staffAsisMsgBox');
    if (!nombre) return;
    const accionMap = { entrada:'asistenciaEntrada', salida:'asistenciaSalida', regreso:'asistenciaRegreso' };
    const action = accionMap[tipo];
    if (!action) return;
    if (msgEl) { msgEl.textContent = '⏳ Registrando…'; msgEl.style.color = 'var(--ink-soft)'; }
    try {
      const r = await apiPost(action, { nombre, origen:'staff_panel', registradoPor: nombre });
      if (msgEl) { msgEl.textContent = r.message || (r.success ? '✅ Listo.' : '⚠ Error.'); msgEl.style.color = r.success ? 'var(--success,#2a7)' : '#e53'; }
      if (r.success) {
        // Forzar render inmediato según la acción ejecutada (sin esperar al backend)
        // Esto cubre el caso donde getAsistenciaHoy devuelve índices incorrectos
        const estadoMap = { entrada: 'activa', salida: 'cerrada', regreso: 'activa' };
        const nuevoEstado = estadoMap[tipo] || _staffAsisEstado;
        _staffAsisEstado = nuevoEstado;
        _staffAsisRenderEstado(nuevoEstado, tipo === 'entrada' ? (r.hora || '') : '', tipo === 'salida' ? (r.hora || '') : '', null);
        // Luego sincronizar con el backend para datos reales
        await _staffAsisCargar();
      }
    } catch(e) { if (msgEl) { msgEl.textContent = '⚠ ' + e.message; msgEl.style.color = '#e53'; } }
  }

  async function _staffAsisConfirmarPermiso() {
    const nombre = window.currentUser?.name;
    const motivo = document.getElementById('staffAsisMotivoInp')?.value.trim();
    const msgEl  = document.getElementById('staffAsisMsgBox');
    if (!nombre) return;
    if (!motivo) {
      if (msgEl) { msgEl.textContent = '⚠ Ingresá el motivo del permiso.'; msgEl.style.color = '#e53'; }
      document.getElementById('staffAsisMotivoInp')?.focus();
      return;
    }
    if (msgEl) { msgEl.textContent = '⏳ Registrando permiso…'; msgEl.style.color = 'var(--ink-soft)'; }
    try {
      const r = await apiPost('asistenciaPermiso', { nombre, motivo, origen: 'staff_panel', registradoPor: nombre });
      if (msgEl) { msgEl.textContent = r.message || (r.success ? '✅ Permiso registrado.' : '⚠ Error.'); msgEl.style.color = r.success ? 'var(--success,#2a7)' : '#e53'; }
      if (r.success) {
        const inp = document.getElementById('staffAsisMotivoInp');
        if (inp) inp.value = '';
        const box = document.getElementById('staffAsisPermisoBox');
        if (box) box.style.display = 'none';
        await _staffAsisCargar();
      }
    } catch(e) { if (msgEl) { msgEl.textContent = '⚠ ' + e.message; msgEl.style.color = '#e53'; } }
  }

  // ════════════════════════════════════════════════════════════════════
  // MÓDULO ASISTENCIA Y PERMISOS
  // ════════════════════════════════════════════════════════════════════
  const ASIS_ESTADO_LABELS = {
    'activa':           { icon:'🟢', label:'Activa' },
    'en_permiso':       { icon:'🟡', label:'En permiso' },
    'cerrada':          { icon:'⚫', label:'Cerrada' },
    'salida_pendiente': { icon:'🔴', label:'Salida pendiente' },
    'no_iniciada':      { icon:'⬜', label:'No iniciada' },
    'ausente':          { icon:'❌', label:'Ausente' },
  };

  // Cargar estado del día al entrar a la pantalla
  async function _asisCargarHoy() {
    const el = document.getElementById('asisEstadoHoy');
    if (el) el.innerHTML = '<span style="color:var(--ink-faint);">Cargando…</span>';
    try {
      const r = await apiGet('getAsistenciaHoy');
      if (!r || !r.success) { if (el) el.innerHTML = '⚠ Error al cargar.'; return; }
      _asisRenderEstadoHoy(r);
    } catch(e) { if (el) el.innerHTML = '⚠ ' + e.message; }
  }

  // Nombres de owners/dueños que nunca aparecen en la lista de asistencia operativa
  const _ASIS_EXCLUIR = ['humberto','rosa'];

  function _asisRenderEstadoHoy(r) {
    const el = document.getElementById('asisEstadoHoy');
    if (!el) return;
    const staffFiltrado = (r.staff || []).filter(function(s) {
      return _ASIS_EXCLUIR.indexOf((s.nombre||'').trim().toLowerCase()) < 0;
    });
    if (staffFiltrado.length === 0) { el.innerHTML = '<div style="color:var(--ink-faint);padding:20px;text-align:center;">Sin registros hoy.</div>'; return; }
    const estadoBg = { activa:'rgba(34,170,102,0.10)', en_permiso:'rgba(184,151,92,0.12)', cerrada:'rgba(0,0,0,0.04)', salida_pendiente:'rgba(238,85,51,0.09)', no_iniciada:'transparent', ausente:'rgba(238,85,51,0.09)' };
    const estadoBorder = { activa:'1.5px solid rgba(34,170,102,0.25)', en_permiso:'1.5px solid rgba(184,151,92,0.3)', cerrada:'1.5px solid var(--line)', salida_pendiente:'1.5px solid rgba(238,85,51,0.25)', no_iniciada:'1.5px solid var(--line)', ausente:'1.5px solid rgba(238,85,51,0.25)' };
    // Normalizar horas que pueden venir como Date serializado de Sheets
    // "Sat Dec 30 1899 07:46:00 GMT-0500" → "07:46"
    function _normHora(h) {
      if (!h) return '';
      var s = String(h).trim();
      // Si es un Date serializado, extraer HH:mm
      var m = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(GMT|am|pm)?/i);
      if (m) return m[1].padStart(2,'0') + ':' + m[2];
      // Si ya es HH:mm limpio
      if (/^\d{1,2}:\d{2}$/.test(s)) return s;
      return s;
    }
    el.innerHTML = staffFiltrado.map(function(s) {
      s.horaEntrada = _normHora(s.horaEntrada);
      s.horaSalida  = _normHora(s.horaSalida);
      const e = ASIS_ESTADO_LABELS[s.estadoFinal] || { icon:'\u25a1', label: s.estadoFinal };
      const bg = estadoBg[s.estadoFinal] || 'transparent';
      const border = estadoBorder[s.estadoFinal] || '1.5px solid var(--line)';
      const retrasoTag = s.retrasoMin > 0 ? '<span style="background:#ffeaea;color:#e53;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;margin-left:6px;">+' + s.retrasoMin + 'min</span>' : '';
      const permisoTag = s.permisoActivo ? '<div style="font-size:11px;color:#b8975c;margin-top:4px;">\uD83D\uDD12 Permiso desde ' + s.permisoActivo.hora + (s.permisoActivo.motivo ? ' · ' + s.permisoActivo.motivo : '') + '</div>' : '';
      const horasTag = s.minutosTrabajados > 0 ? '<span style="font-size:11px;color:var(--ink-faint);"> · ' + Math.floor(s.minutosTrabajados/60) + 'h ' + (s.minutosTrabajados%60) + 'min</span>' : '';
      const horaEntradaTag = s.horaEntrada ? '<span style="font-size:12px;color:var(--ink-soft);">Entrada ' + s.horaEntrada + (s.horaSalida ? ' · Salida ' + s.horaSalida : '') + '</span>' : '<span style="font-size:12px;color:var(--ink-faint);">Sin registro</span>';
      const corBtn = (window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'owner'))
        ? '<button onclick="_asisPreCorreccion(\'' + s.idJornada + '\')" style="background:none;border:1px solid var(--line);border-radius:20px;font-size:11px;padding:3px 9px;cursor:pointer;color:var(--ink-soft);flex-shrink:0;">\u270F\uFE0F</button>' : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;margin-bottom:6px;background:' + bg + ';border:' + border + ';">'
        + '<div style="font-size:22px;line-height:1;">' + e.icon + '</div>'
        + '<div style="flex:1;min-width:0;">'
        +   '<div style="font-weight:700;font-size:14px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">' + s.nombre + retrasoTag + '</div>'
        +   '<div style="margin-top:2px;">' + horaEntradaTag + horasTag + '</div>'
        +   permisoTag
        + '</div>'
        + corBtn
        + '</div>';
    }).join('');
    // cargar select de nombres — siempre refrescar con estado actual
    const sel = document.getElementById('asisNombreSelect');
    if (sel) {
      const valActual = sel.value;
      sel.innerHTML = '<option value="">— Seleccioná una empleada —</option>';
      staffFiltrado.forEach(function(s) {
        const o = document.createElement('option');
        o.value = s.nombre;
        const icons = { activa:'🟢', en_permiso:'🟡', cerrada:'⚫', salida_pendiente:'🔴', no_iniciada:'⬜', ausente:'❌' };
        o.textContent = (icons[s.estadoFinal] || '⬜') + ' ' + s.nombre;
        o.dataset.estado = s.estadoFinal;
        sel.appendChild(o);
      });
      if (valActual) sel.value = valActual;
      // al cambiar la empleada, sugerir el tipo correcto y mostrar estado
      sel.onchange = function() { _asisSugerirTipo(staffFiltrado); };
    }
  }

  // Sugiere el tipo de evento correcto según el estado actual de la empleada
  function _asisSugerirTipo(staffList) {
    const sel    = document.getElementById('asisNombreSelect');
    const tipo   = document.getElementById('asisTipoSelect');
    const msgEl  = document.getElementById('asisMsgBox');
    if (!sel || !tipo) return;
    const nombre = sel.value;
    if (!nombre) { if (msgEl) { msgEl.textContent = ''; } return; }
    const staff  = (staffList || []).find(function(s){ return s.nombre === nombre; });
    const estado = staff ? staff.estadoFinal : 'no_iniciada';
    // Sugerir tipo según estado
    const sugerencias = {
      no_iniciada:      'ENTRADA',
      activa:           'SALIDA',
      en_permiso:       'REGRESO',
      cerrada:          'ENTRADA',
      salida_pendiente: 'ENTRADA',
      ausente:          'JUSTIFICADO'
    };
    if (tipo) tipo.value = sugerencias[estado] || 'ENTRADA';
    // Mostrar estado actual como hint
    const labels = { activa:'Activa', en_permiso:'En permiso', cerrada:'Jornada cerrada', salida_pendiente:'Salida pendiente', no_iniciada:'Sin entrada hoy', ausente:'Ausente' };
    const icons  = { activa:'🟢', en_permiso:'🟡', cerrada:'⚫', salida_pendiente:'🔴', no_iniciada:'⬜', ausente:'❌' };
    if (msgEl) {
      msgEl.textContent = (icons[estado] || '⬜') + ' Estado actual: ' + (labels[estado] || estado);
      msgEl.style.color = 'var(--ink-soft)';
    }
  }

  async function _asisRegistrar() {
    const nombre = document.getElementById('asisNombreSelect')?.value;
    const tipo   = document.getElementById('asisTipoSelect')?.value;
    const motivo = document.getElementById('asisMotivoInput')?.value || '';
    const msgEl  = document.getElementById('asisMsgBox');

    if (!nombre) {
      if (msgEl) { msgEl.textContent = '⚠ Seleccioná una empleada.'; msgEl.style.color = '#e53'; }
      return;
    }

    // Validación cliente antes de enviar (evita ida y vuelta innecesaria)
    const sel      = document.getElementById('asisNombreSelect');
    const optEl    = sel ? sel.options[sel.selectedIndex] : null;
    const estadoAct = optEl ? (optEl.dataset.estado || 'no_iniciada') : 'no_iniciada';
    const bloqueantes = {
      SALIDA:  { invalidos: ['no_iniciada','cerrada','salida_pendiente'], msg: '⚠ ' + nombre + ' no tiene entrada activa hoy.' },
      PERMISO: { invalidos: ['no_iniciada','cerrada','salida_pendiente','en_permiso'], msg: '⚠ ' + nombre + ' no tiene entrada activa o ya está en permiso.' },
      REGRESO: { invalidos: ['no_iniciada','cerrada','activa','salida_pendiente'], msg: '⚠ ' + nombre + ' no tiene un permiso activo.' },
      ENTRADA: { invalidos: ['activa','en_permiso'], msg: '⚠ ' + nombre + ' ya tiene una entrada registrada hoy.' }
    };
    const regla = bloqueantes[tipo];
    if (regla && regla.invalidos.indexOf(estadoAct) >= 0) {
      if (msgEl) { msgEl.textContent = regla.msg; msgEl.style.color = '#e53'; }
      return;
    }

    // Pedir motivo si es PERMISO, AUSENCIA o JUSTIFICADO
    if ((tipo === 'PERMISO' || tipo === 'AUSENCIA' || tipo === 'JUSTIFICADO') && !motivo.trim()) {
      if (msgEl) { msgEl.textContent = '⚠ Ingresá el motivo para ' + tipo.toLowerCase() + '.'; msgEl.style.color = '#e53'; }
      document.getElementById('asisMotivoInput')?.focus();
      return;
    }

    if (msgEl) { msgEl.textContent = '⏳ Registrando…'; msgEl.style.color = 'var(--ink-soft)'; }

    const acciones = {
      ENTRADA: 'asistenciaEntrada', SALIDA: 'asistenciaSalida',
      PERMISO: 'asistenciaPermiso', REGRESO: 'asistenciaRegreso'
    };
    const action = acciones[tipo] || 'asistenciaEvento';

    try {
      const r = await apiPost(action, {
        nombre, tipo, motivo,
        origen: 'panel',
        registradoPor: window.currentUser?.name || 'admin'
      });
      if (msgEl) {
        msgEl.textContent = r.message || (r.success ? '✅ Listo.' : '⚠ Error.');
        msgEl.style.color = r.success ? 'var(--success)' : '#e53';
      }
      if (r.success) {
        await _asisCargarHoy();
        document.getElementById('asisMotivoInput').value = '';
        // Resetear select al placeholder
        const selEl = document.getElementById('asisNombreSelect');
        if (selEl) selEl.value = '';
      }
    } catch(e) {
      if (msgEl) { msgEl.textContent = '⚠ ' + e.message; msgEl.style.color = '#e53'; }
    }
  }

  async function _asisCargarInforme() {
    const mes = document.getElementById('asisMesInput')?.value.trim();
    const body = document.getElementById('asisInformeBody');
    if (!body) return;
    body.innerHTML = '<span style="color:var(--ink-faint);">Cargando…</span>';
    try {
      const r = await apiGet('getInformeMensual', mes ? { mes } : {});
      if (!r || !r.success || !r.informe) { body.innerHTML = '⚠ Error.'; return; }
      if (r.informe.length === 0) { body.innerHTML = '<div style="color:var(--ink-faint);text-align:center;padding:20px;">Sin datos para ' + (mes || 'este mes') + '.</div>'; return; }
      body.innerHTML = r.informe.map(function(emp) {
        const horas = Math.floor(emp.minutosTrabajados/60);
        const mins  = emp.minutosTrabajados % 60;
        return '<div style="background:var(--bg-card);border-radius:16px;padding:14px 16px;margin-bottom:10px;">'
          + '<div style="font-weight:800;font-size:15px;margin-bottom:8px;">' + emp.nombre + '</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--ink-soft);">'
          + '<div>📅 Días trabajados: <b>' + emp.diasTrabajados + '</b></div>'
          + '<div>⏰ Puntuales: <b>' + emp.puntuales + '</b></div>'
          + '<div>⚠ Retrasos: <b>' + emp.retrasos + '</b></div>'
          + '<div>🔴 Salida pendiente: <b>' + emp.salidaPendiente + '</b></div>'
          + '<div>❌ Ausencias: <b>' + emp.ausencias + '</b></div>'
          + '<div>🔒 Permisos: <b>' + emp.totalPermisos + '</b> (' + emp.minutosEnPermisos + 'min)</div>'
          + '<div style="grid-column:1/-1;">⏱ Horas trabajadas: <b>' + horas + 'h ' + mins + 'min</b></div>'
          + '</div></div>';
      }).join('');
    } catch(e) { body.innerHTML = '⚠ ' + e.message; }
  }

  function _asisPreCorreccion(idJornada) {
    const box = document.getElementById('asisCorreccionBox');
    if (box) box.style.display = 'block';
    const inp = document.getElementById('asisCorIdJornada');
    if (inp) inp.value = idJornada || '';
    inp.scrollIntoView({ behavior: 'smooth' });
  }

  async function _asisCorregir() {
    const idJornada   = document.getElementById('asisCorIdJornada')?.value.trim();
    const estadoFinal = document.getElementById('asisCorEstado')?.value.trim();
    const horaEntrada = document.getElementById('asisCorEntrada')?.value.trim();
    const horaSalida  = document.getElementById('asisCorSalida')?.value.trim();
    const observacion = document.getElementById('asisCorObs')?.value.trim();
    if (!observacion) { alert('La observación es obligatoria para corregir.'); return; }
    try {
      const r = await apiPost('asistenciaCorreccion', { idJornada, estadoFinal, horaEntrada, horaSalida, observacion, admin: window.currentUser?.name || 'admin' });
      alert(r.message || (r.success ? '✅ Corregido.' : '⚠ Error.'));
      if (r.success) { document.getElementById('asisCorreccionBox').style.display = 'none'; await _asisCargarHoy(); }
    } catch(e) { alert('⚠ ' + e.message); }
  }

  function cobrarDesdeBtn(btn) {
    const idEspera = btn.dataset.id || '';
    const codigo   = btn.dataset.codigo || '';
    const nombre   = btn.dataset.nombre || '';
    const servicio = btn.dataset.servicio || '';
    const chica    = btn.dataset.chica || '';
    const total    = btn.dataset.total || '0';
    const regular  = btn.dataset.regular || total;
    const promo    = btn.dataset.promo || '';
    let desglose = null;
    try {
      if (btn.dataset.desglose) desglose = JSON.parse(decodeURIComponent(btn.dataset.desglose));
    } catch(e) {}
    openCobrar(idEspera, nombre, servicio, chica, total, regular, promo, desglose, codigo);
  }

  function openCobrar(idEspera, nombre, servicio, chica, total, precioRegular, promoNombre, desgloseJSON, codigo) {
    window._cobrarId = idEspera;
    window._cobrarCodigo = codigo || '';
    window._cobrarAbonoMonto = 0;
    window._cobrarAjustes = []; // registro de correcciones/quitados que hace Mikaela en este cobro
    window._cobrarPago = 'Efectivo';
    window._cobrarTotalPromo = Number(total) || 0;
    window._cobrarTotalRegular = Number(precioRegular) || Number(total) || 0;
    // ── MANDAMIENTO #4: detectar si hay promo (simple, SP, o TM con área promo adentro) ──
    const _tienePrecioDistinto = Number(precioRegular) > 0 && Number(precioRegular) !== Number(total);
    const _promoNombreValida   = (promoNombre && promoNombre !== '' && promoNombre !== 'undefined');
    window._cobrarTienePromo   = _promoNombreValida || _tienePrecioDistinto;
    window._cobrarDesglose = null;

    // Reactivar el botón por si quedó trabado en "Procesando" en un cobro anterior
    const _cb = document.getElementById('cobrarBtn');
    if (_cb) { _cb.disabled = false; _cb.textContent = '✓ Confirmar cobro'; }

    document.getElementById('cobrarClientName').textContent = nombre;
    document.getElementById('cobrarTarjetaAviso').style.display = 'none';
    window._cobroGrupal = null;                            // cobro individual nunca es grupal
    if (typeof factResetUI === 'function') factResetUI();  // bloque de facturación limpio

    // Intentar parsear desglose multi-staff
    let desglose = null;
    try {
      if (desgloseJSON && desgloseJSON !== '' && desgloseJSON !== 'undefined') {
        desglose = typeof desgloseJSON === 'string' ? JSON.parse(desgloseJSON) : desgloseJSON;
      }
    } catch(e) {}

    const desgloseEl = document.getElementById('cobrarDesglose');
    const simpleEl = document.getElementById('cobrarSimple');
    const itemsEl = document.getElementById('cobrarDesgloseItems');
    const subtotalEl = document.getElementById('cobrarSubtotal');

    if (desglose && desglose.length > 0) {
      // ── SEGURO ANTI-DUPLICADO ──────────────────────────────────────────
      // Quitar una línea suelta cuyo servicio YA está incluido dentro de otra
      // línea combinada de la MISMA área (ej. "nariz" suelta cuando ya está en
      // "Combo + nariz"). Evita cobrar dos veces el mismo servicio.
      desglose = desglose.filter(function(d, idx) {
        const nombre = String(d.servicio || '').trim();
        const area = String(d.area || '').toLowerCase();
        if (!nombre) return true;
        const incluidoEnOtra = desglose.some(function(otro, j) {
          if (j === idx) return false;
          const partes = String(otro.servicio || '').split(' + ').map(function(s){ return s.trim(); });
          return partes.length > 1
            && partes.indexOf(nombre) >= 0
            && String(otro.area || '').toLowerCase() === area;
        });
        return !incluidoEnOtra;
      });
      // Respetar montoNormal exacto si ya viene desde Lineas/TM. Ahí NexServ guarda la
      // división regular por área; recalcular aquí puede romper combos multiárea.
      const _vistosPromoTicket = new Set();
      desglose.forEach(function(d){
        const m = Number(d.monto) || 0;
        const normalExacto = Number(d.montoNormal);
        if (normalExacto > 0 && (d.regularExacto || normalExacto !== m)) {
          d.montoNormal = normalExacto;
          return;
        }
        let uplift = 0;
        let encontroPromo = false;
        if (typeof PROMOS !== 'undefined' && Array.isArray(PROMOS)) {
          const nombres = [];
          if (d.promoNombre) String(d.promoNombre).split(',').forEach(function(n){ nombres.push(n.trim()); });
          if (d.servicio)    String(d.servicio).split('+').forEach(function(n){ nombres.push(n.trim()); });
          nombres.forEach(function(nm){
            const k = String(nm || '').toLowerCase();
            if (!k) return;
            const p = PROMOS.find(function(p){ return String(p.name || '').trim().toLowerCase() === k; });
            if (p && Number(p.regular || 0) > Number(p.price || 0)) {
              encontroPromo = true;
              if (!_vistosPromoTicket.has(k)) {          // descuento contado 1 sola vez por ticket
                uplift += (Number(p.regular) - Number(p.price));
                _vistosPromoTicket.add(k);
              }
            }
          });
        }
        if (encontroPromo) {
          // El catálogo manda: regular = monto + descuento (ya contado una sola vez).
          // No usamos el montoNormal guardado para no arrastrar un regular inflado de antes.
          d.montoNormal = Math.round((m + uplift) * 100) / 100;
        } else {
          // Sin promo conocida en la línea (servicio suelto/extra) → respetar el regular
          // guardado si es mayor, si no el propio monto.
          d.montoNormal = Math.max(Number(d.montoNormal) || 0, m);
        }
      });
      // Modo ticket detallado
      window._cobrarDesglose = desglose;
      desgloseEl.style.display = 'block';
      simpleEl.style.display = 'none';
      itemsEl.innerHTML = desglose.map((d, i) => _cobrarLineaHTML(d, i, d.congelado?'var(--success)':'var(--accent-deep)', Number(d.monto||0))).join('');
      const subtotalNum = desglose.reduce((s, d) => s + Number(d.monto || 0), 0);
      subtotalEl.textContent = '$' + subtotalNum.toFixed(2);
      window._cobrarTotalPromo = subtotalNum;
      const subtotalNormal = desglose.reduce((s, d) => s + Number(d.montoNormal || d.monto || 0), 0);
      window._cobrarTotalRegular = subtotalNormal > subtotalNum ? subtotalNormal : (Number(precioRegular) || subtotalNum);
      // Si es promo/combo pero no hay regular conocido (> promo), derivarlo del catálogo de promos
      if (window._cobrarTotalRegular <= subtotalNum) {
        const _regCat = _regularDesdeCatalogo(promoNombre, desglose);
        if (_regCat > subtotalNum) window._cobrarTotalRegular = _regCat;
      }
      // ── MANDAMIENTO #4: detectar promo dentro de TM via tmTienePromoM4 ──
      window._cobrarTienePromo = window._cobrarTienePromo
        || (window._cobrarTotalRegular > window._cobrarTotalPromo)
        || window.tmTienePromoM4(desglose);
    } else {
      // Modo simple
      desgloseEl.style.display = 'none';
      simpleEl.style.display = 'block';
      document.getElementById('cobrarService').textContent = servicio;
      document.getElementById('cobrarChica').textContent = 'Atendida por ' + chica;
    }

    // Si hay promo pero NO se conoce un precio regular mayor al promo, derivarlo del catálogo.
    // Cubre el modo SIMPLE (promo de una sola staff sin desglose), que antes no recalculaba en tarjeta.
    if (window._cobrarTienePromo && window._cobrarTotalRegular <= window._cobrarTotalPromo) {
      const _regCat = _regularDesdeCatalogo(promoNombre, window._cobrarDesglose);
      if (_regCat > window._cobrarTotalPromo) window._cobrarTotalRegular = _regCat;
    }

    // Banner promo (efectivo/transferencia)
    const promoBanner = document.getElementById('cobrarPromoBanner');
    if (window._cobrarTienePromo) {
      promoBanner.style.display = 'block';
      document.getElementById('cobrarPromoName').textContent = promoNombre;
    } else {
      promoBanner.style.display = 'none';
    }

    // Total inicial (efectivo/transferencia = precio promo si aplica)
    const totalEl = document.getElementById('cobrarTotal');

    // Agregar productos del ticket si existen
    const ticketId = window._cobrarId;
    const productosTicket = (ticketId && window._apProductosEnTicket && window._apProductosEnTicket[ticketId]) ? window._apProductosEnTicket[ticketId] : [];
    const totalProductos = productosTicket.reduce((s, p) => s + (Number(p.precio) * Number(p.cantidad || 1)), 0);
    window._cobrarTotalProductos = totalProductos;

    // Mostrar sección de productos si hay
    let prodSecEl = document.getElementById('cobrarProductosSection');
    if (!prodSecEl) {
      prodSecEl = document.createElement('div');
      prodSecEl.id = 'cobrarProductosSection';
      totalEl.parentNode.insertBefore(prodSecEl, totalEl);
    }
    if (productosTicket.length > 0) {
      prodSecEl.innerHTML = `
        <div style="background:var(--accent-bg);border-radius:12px;padding:10px 14px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;"><svg class="nx-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M7 7a5 5 0 0 1 10 0h2.5a1 1 0 0 1 1 .92l.96 12A2 2 0 0 1 19.46 22H4.54a2 2 0 0 1-1.99-2.08l.96-12A1 1 0 0 1 4.5 7H7Zm2 0h6a3 3 0 0 0-6 0Z"/></svg>PRODUCTOS VENDIDOS</div>
          ${productosTicket.map(p => `
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:3px;">
              <span>${p.nombre}${p.cantidad > 1 ? ' x'+p.cantidad : ''}</span>
              <span>$${(p.precio * (p.cantidad||1)).toFixed(2)}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:var(--accent-deep);margin-top:6px;padding-top:6px;border-top:1px solid var(--line);">
            <span>Total productos</span><span>$${totalProductos.toFixed(2)}</span>
          </div>
        </div>
      `;
      // Sumar productos al total
      const totalConProductos = window._cobrarTotalPromo + totalProductos;
      totalEl.textContent = '$' + totalConProductos.toFixed(2);
      window._cobrarTotalConProductos = totalConProductos;
    } else {
      prodSecEl.innerHTML = '';
      totalEl.textContent = '$' + window._cobrarTotalPromo;
      window._cobrarTotalConProductos = window._cobrarTotalPromo;
    }
    totalEl.style.color = 'var(--accent-deep)';

    // Reset botones de pago
    document.querySelectorAll('#cobrarModal .pago-btn').forEach((b, i) => {
      if (i === 0) {
        b.style.background = 'var(--success)'; b.style.color = 'white'; b.style.borderColor = 'var(--success)';
      } else {
        b.style.background = 'var(--bg-card)'; b.style.color = 'var(--ink)'; b.style.borderColor = 'var(--line)';
      }
    });
    document.getElementById('cobrarModal').classList.add('active');
    _cobroCargarAbono();
  }

  function onMixtoInput() {
    const totalEl = document.getElementById('cobrarTotal');
    const total = parseFloat((totalEl?.textContent || '0').replace('$','')) || 0;
    const m1 = parseFloat(document.getElementById('mixtoMonto1')?.value || 0) || 0;
    const m2 = parseFloat(document.getElementById('mixtoMonto2')?.value || 0) || 0;
    const m3 = parseFloat(document.getElementById('mixtoMonto3')?.value || 0) || 0;
    const suma = Math.round((m1 + m2 + m3) * 100) / 100;
    const diff = Math.round((total - suma) * 100) / 100;
    const sumaEl = document.getElementById('mixtoSuma');
    if (sumaEl) {
      if (Math.abs(diff) < 0.01) {
        sumaEl.textContent = '✅ Total cubierto: $' + suma.toFixed(2);
        sumaEl.style.color = 'var(--success)';
      } else if (diff > 0) {
        sumaEl.textContent = 'Falta: $' + diff.toFixed(2);
        sumaEl.style.color = 'var(--warning,#b45309)';
      } else {
        sumaEl.textContent = 'Excede por: $' + Math.abs(diff).toFixed(2);
        sumaEl.style.color = 'var(--danger)';
      }
    }
    // Auto-completar fila 2 si fila 1 tiene monto y fila 2 está vacía (y fila 3 sin usar)
    const m2El = document.getElementById('mixtoMonto2');
    if (m1 > 0 && diff > 0 && m3 === 0 && m2El && (!m2El.value || parseFloat(m2El.value) === 0)) {
      m2El.value = diff.toFixed(2);
      onMixtoInput();
    }
  }

  // ── Edición de servicios al cobrar (solo Mikaela/owner) ──────────────
  function _cobrarPuedeEditar() {
    const r = window.currentUser && window.currentUser.role;
    return r === 'admin' || r === 'owner';
  }
  function _cobrarLineaHTML(d, idx, color, monto) {
    const puede = _cobrarPuedeEditar();
    const btns = puede
      ? '<div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0;">'
        + '<button onclick="cobrarEditarMonto(' + idx + ')" title="Corregir valor" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;">✏️</button>'
        + '<button onclick="cobrarQuitarServicio(' + idx + ')" title="Quitar servicio" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;font-weight:800;padding:2px 4px;">✕</button>'
        + '</div>'
      : '';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px ' + (d.congelado?'10px':'0') + ';border-bottom:1px solid var(--line);' + (d.congelado?'background:var(--success-bg);border-radius:8px;margin-bottom:2px;':'') + '">'
      + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;">' + d.servicio + (d.congelado?' <span style="font-size:9px;background:var(--success);color:white;padding:2px 5px;border-radius:6px;font-weight:700;margin-left:4px;">✅ LISTO</span>':'') + '</div>'
      + '<div style="font-size:11px;color:var(--ink-soft);margin-top:1px;">por ' + (d.staff||'—') + ' · ' + (d.area||'') + '</div></div>'
      + '<div style="font-size:15px;font-weight:800;color:' + color + ';margin-left:10px;">$' + Number(monto).toFixed(2) + '</div>'
      + btns
      + '</div>';
  }
  function cobrarQuitarServicio(idx) {
    if (!_cobrarPuedeEditar()) return;
    const d = (window._cobrarDesglose || [])[idx];
    if (!d) return;
    if (!confirm('¿Quitar "' + d.servicio + '" ($' + Number(d.monto||0).toFixed(2) + ') de ' + (d.staff||'') + '?\n\nTambién se quita su comisión de este cobro.')) return;
    const _quien = (window.currentUser && window.currentUser.name) || 'Admin';
    window._cobrarAjustes = window._cobrarAjustes || [];
    window._cobrarAjustes.push(_quien + ' quitó "' + d.servicio + '" $' + Number(d.monto||0).toFixed(2) + (d.staff ? ' (' + d.staff + ')' : ''));
    window._cobrarDesglose.splice(idx, 1);
    cobrarAplicarDesgloseEditado();
  }
  function cobrarEditarMonto(idx) {
    if (!_cobrarPuedeEditar()) return;
    const d = (window._cobrarDesglose || [])[idx];
    if (!d) return;
    const actual = Number(d.monto) || 0;
    const val = prompt('Nuevo valor para "' + d.servicio + '" (de ' + (d.staff||'') + '):', actual);
    if (val === null) return;
    const nuevo = Number(String(val).replace(',', '.').replace('$', '').trim());
    if (isNaN(nuevo) || nuevo < 0) { alert('Valor inválido'); return; }
    const _quienE = (window.currentUser && window.currentUser.name) || 'Admin';
    window._cobrarAjustes = window._cobrarAjustes || [];
    window._cobrarAjustes.push(_quienE + ' corrigió "' + d.servicio + '" $' + actual.toFixed(2) + '→$' + nuevo.toFixed(2) + (d.staff ? ' (' + d.staff + ')' : ''));
    d.monto = nuevo;
    // Edición manual de Mikaela = valor FINAL exacto (igual en efectivo y tarjeta)
    d.montoNormal = nuevo;
    d._editado = true;
    cobrarAplicarDesgloseEditado();
  }
  function cobrarAplicarDesgloseEditado() {
    const desg = window._cobrarDesglose || [];
    window._cobrarTotalPromo   = desg.reduce((s,d) => s + Number(d.monto||0), 0);
    window._cobrarTotalRegular = desg.reduce((s,d) => s + Number(d.montoNormal||d.monto||0), 0);
    // Si quitaron todos los servicios, todavía pueden quedar productos
    refreshCobrarTotal();
    showToast('✓ Servicios actualizados');
  }
  window.cobrarQuitarServicio = cobrarQuitarServicio;
  window.cobrarEditarMonto = cobrarEditarMonto;

  // ===== ABONO (depósito de reserva) en el cobro =====
  // El total completo va a caja (decisión: todo se cuenta al cobrar). El abono solo
  // se muestra y se descuenta de lo que la clienta entrega en mano.
  async function _cobroCargarAbono() {
    window._cobrarAbonoMonto = 0;
    const row = document.getElementById('cobrarAbonoRow');
    if (row) row.style.display = 'none';
    const codigo = window._cobrarCodigo || '';
    if (!codigo) { _cobroActualizarNeto(); return; }
    try {
      const r = await apiGet('getAbonoActivo', { codigo: codigo });
      const monto = (r && r.success) ? Number(r.monto || 0) : 0;
      window._cobrarAbonoMonto = monto;
    } catch(e) { window._cobrarAbonoMonto = 0; }
    _cobroActualizarNeto();
  }
  function _cobroActualizarNeto() {
    const row = document.getElementById('cobrarAbonoRow');
    const montoEl = document.getElementById('cobrarAbonoMonto');
    const netoEl = document.getElementById('cobrarAbonoNeto');
    const totEl = document.getElementById('cobrarTotal');
    const abono = Number(window._cobrarAbonoMonto || 0);
    if (!row) return;
    // BRUTO autoritativo = total de servicios (según método de pago) + productos.
    // NUNCA es el neto. Fuentes en orden de confianza.
    let bruto = Number(window._cobrarTotalConProductos || 0);
    if (!(bruto > 0)) bruto = Number(window._cobrarTotalPromo || 0) + Number(window._cobrarTotalProductos || 0);
    if (!(bruto > 0)) bruto = parseFloat((totEl?.textContent || '0').replace('$','')) || 0;
    // El número grande SIEMPRE muestra el bruto. Si algo lo pisó (p.ej. con el abono),
    // acá se auto-sana — el abono jamás reemplaza el total de servicios.
    if (totEl && bruto > 0) totEl.textContent = '$' + bruto.toFixed(2);
    if (!(abono > 0)) { row.style.display = 'none'; return; }
    const neto = Math.max(0, bruto - abono);
    if (montoEl) montoEl.textContent = '−$' + abono.toFixed(2);
    if (netoEl)  netoEl.textContent  = '$' + neto.toFixed(2);
    row.style.display = 'block';
  }
  async function _cobroRegistrarAbono() {
    let codigo = window._cobrarCodigo || '';
    // Si la clienta no tiene código (walk-in), se lo creamos al instante y lo atamos
    // al ticket, para poder registrar el abono y que se descuente al cobrar.
    if (!codigo) {
      const nombreNC = document.getElementById('cobrarClientName')?.textContent || '';
      if (!nombreNC) { alert('No se pudo leer el nombre de la clienta.'); return; }
      if (!confirm('Esta clienta no tiene código.\nVamos a crearle uno ahora para registrar el abono. ¿Continuar?')) return;
      try {
        const rc = await apiPost('addClienta', { nombre: nombreNC });
        if (!(rc && rc.codigo)) { alert('No se pudo crear el código: ' + ((rc && rc.message) || '')); return; }
        codigo = rc.codigo;
        window._cobrarCodigo = codigo;
        if (window._cobrarId) { try { await apiPost('setCodigoTicket', { idEspera: window._cobrarId, codigo: codigo }); } catch(eSc){} }
        showToast('🆕 Código creado: ' + codigo);
      } catch(eC) { console.error(eC); alert('Error al crear el código.'); return; }
    }
    const actual = Number(window._cobrarAbonoMonto || 0);
    const val = prompt('Monto del abono que dejó la clienta (en $):', actual > 0 ? String(actual) : '');
    if (val === null) return;
    const monto = parseFloat(String(val).replace(',', '.'));
    if (isNaN(monto) || monto < 0) { alert('Monto inválido.'); return; }
    try {
      if (actual > 0) { await apiPost('consumirAbono', { codigo: codigo }); } // reemplaza el anterior
      if (monto > 0) {
        const nombre = document.getElementById('cobrarClientName')?.textContent || '';
        const r = await apiPost('registrarAbono', { codigo: codigo, cliente: nombre, monto: monto, origen: 'Mikaela', idEspera: window._cobrarId || '' });
        if (!(r && r.success)) { alert('No se pudo registrar: ' + ((r && r.message) || '')); return; }
      }
      window._cobrarAbonoMonto = monto;
      _cobroActualizarNeto();
      showToast(monto > 0 ? '💰 Abono registrado: $' + monto.toFixed(2) : 'Abono quitado');
    } catch(e) { console.error(e); alert('Error al registrar el abono.'); }
  }
  window._cobroRegistrarAbono = _cobroRegistrarAbono;

  function selectPago(metodo, btn) {
    // Unificar ambas variables de pago (cobro individual y grupal usan la misma)
    window._cobrarPago = metodo;
    window._cobroPago  = metodo;

    document.querySelectorAll('#cobrarModal .pago-btn').forEach(b => {
      b.style.background = 'var(--bg-card)'; b.style.color = 'var(--ink)'; b.style.borderColor = 'var(--line)';
      b.classList.remove('selected');
    });
    if (btn) { btn.style.background = 'var(--success)'; btn.style.color = 'white'; btn.style.borderColor = 'var(--success)'; btn.classList.add('selected'); }

    // Mostrar/ocultar panel mixto
    const mixtoPanel = document.getElementById('mixtoPanel');
    if (mixtoPanel) {
      mixtoPanel.style.display = metodo === 'Pago mixto' ? 'block' : 'none';
      if (metodo === 'Pago mixto') {
        const m1 = document.getElementById('mixtoMonto1');
        const m2 = document.getElementById('mixtoMonto2');
        const m3 = document.getElementById('mixtoMonto3');
        if (m1) m1.value = '';
        if (m2) m2.value = '';
        if (m3) m3.value = '';
        const sumaEl = document.getElementById('mixtoSuma');
        if (sumaEl) { sumaEl.textContent = 'Ingresá los montos'; sumaEl.style.color = 'var(--ink-soft)'; }
        setTimeout(() => m1?.focus(), 100);
      }
    }
    refreshCobrarTotal();
  }

  // Regla de pago (local, no depende de archivos externos):
  //  • Con promo y pago EFECTIVO o TRANSFERENCIA → se respeta el precio promo.
  //  • Con promo y pago TARJETA → TODO se recalcula a precio NORMAL (sin promo).
  function _reglaPagoLocal(metodo, ctx) {
    const tienePromo = !!ctx.tienePromo;
    const esTarjeta  = String(metodo || '') === 'Tarjeta';
    const usaNormal  = tienePromo && esTarjeta;
    const desg = Array.isArray(ctx.desglose) ? ctx.desglose : [];

    // Líneas editadas a mano por Mikaela = valor FINAL fijo (no se recalculan)
    const sumEditFinal    = desg.reduce(function(s,d){ return s + (d._editado ? Number(d.monto||0) : 0); }, 0);
    const sumPromoNoEdit  = desg.reduce(function(s,d){ return s + (d._editado ? 0 : Number(d.monto||0)); }, 0);
    const sumNormalNoEdit = desg.reduce(function(s,d){ return s + (d._editado ? 0 : (Number(d.montoNormal != null ? d.montoNormal : d.monto) || Number(d.monto||0))); }, 0);
    const totalNormalCtx  = Number(ctx.totalNormal || 0);
    const regularNoEdit   = Math.max(0, totalNormalCtx - sumEditFinal);
    // Repartir el regular (sólo entre las NO editadas) si esas no traen su normal por línea
    const usarRedistrib   = usaNormal && sumPromoNoEdit > 0 && sumNormalNoEdit <= sumPromoNoEdit && regularNoEdit > sumPromoNoEdit;

    const out = desg.map(function(d){
      const promo = Number(d.monto || 0);
      if (d._editado) {
        // Valor editado manualmente → final exacto, sin recálculo (efectivo o tarjeta)
        return Object.assign({}, d, { montoFinal: promo });
      }
      let normal = Number(d.montoNormal != null ? d.montoNormal : promo) || promo;
      if (usarRedistrib) normal = promo / sumPromoNoEdit * regularNoEdit; // reparto proporcional
      const montoFinal = usaNormal ? Math.max(normal, promo) : promo;
      return Object.assign({}, d, { montoFinal: montoFinal });
    });

    let totalFinal;
    if (out.length) {
      totalFinal = out.reduce(function(s,d){ return s + Number(d.montoFinal || 0); }, 0);
    } else {
      totalFinal = usaNormal ? Number(ctx.totalNormal || 0) : Number(ctx.totalPromo || 0);
    }
    return { usaPrecioNormal: usaNormal, totalFinal: totalFinal, desglose: out };
  }

  // Recalcula total + desglose según el método de pago actual y el desglose (editable) en memoria
  function refreshCobrarTotal() {
    const metodo     = window._cobrarPago || 'Efectivo';
    const aviso      = document.getElementById('cobrarTarjetaAviso');
    const totalEl    = document.getElementById('cobrarTotal');
    const promoBanner= document.getElementById('cobrarPromoBanner');
    const subtotalEl = document.getElementById('cobrarSubtotal');
    const itemsEl2   = document.getElementById('cobrarDesgloseItems');
    const totalProductos = window._cobrarTotalProductos || 0;

    // ── COBRO GRUPAL: recalcular sobre los totales del grupo (no las vars individuales) ──
    if (window._cobroGrupal && window._cobroGrupal.clientas) {
      const g = window._cobroGrupal;
      const hayPromo = g.clientas.some(c => c.promoNombre);
      const esTarjeta = metodo === 'Tarjeta';
      const usaRegular = esTarjeta && hayPromo;
      const totalPromoG   = g.clientas.reduce((s,c)=> s + (Number(c.total)||0), 0);
      const totalRegularG = g.clientas.reduce((s,c)=> s + (c._editado ? (Number(c.total)||0) : (Number(_regularClienta(c))||0)), 0);
      const totalFinalG   = usaRegular ? totalRegularG : totalPromoG;
      // Productos REALES de este grupo (suma de los productos de cada clienta del cobro),
      // NO el valor global que pudo quedar pegado de un cobro anterior.
      const totalProductosG = g.clientas.reduce(function(s, c) {
        const prods = (c.idEspera && window._apProductosEnTicket && window._apProductosEnTicket[c.idEspera]) ? window._apProductosEnTicket[c.idEspera] : [];
        return s + prods.reduce(function(ss, p) { return ss + (Number(p.precio) * Number(p.cantidad || 1)); }, 0);
      }, 0);
      window._cobrarTotalProductos = totalProductosG;
      if (usaRegular) {
        if (aviso) aviso.style.display = 'block';
        const pp = document.getElementById('cobrarPrecioPromo');   if (pp) pp.textContent = '$' + totalPromoG.toFixed(2);
        const pr = document.getElementById('cobrarPrecioRegular'); if (pr) pr.textContent = '$' + totalRegularG.toFixed(2);
        if (totalEl)    { totalEl.textContent = '$' + (totalFinalG + totalProductosG).toFixed(2); totalEl.style.color = 'var(--danger)'; }
        if (subtotalEl) { subtotalEl.textContent = '$' + totalFinalG.toFixed(2); subtotalEl.style.color = 'var(--danger)'; }
        if (promoBanner) promoBanner.style.display = 'none';
      } else {
        if (aviso) aviso.style.display = 'none';
        if (totalEl)    { totalEl.textContent = '$' + (totalFinalG + totalProductosG).toFixed(2); totalEl.style.color = 'var(--accent-deep)'; }
        if (subtotalEl) { subtotalEl.textContent = '$' + totalFinalG.toFixed(2); subtotalEl.style.color = ''; }
        if (promoBanner && hayPromo) promoBanner.style.display = 'block';
      }
      window._cobrarTotalConProductos = totalFinalG + totalProductosG;
      if (typeof _cobroActualizarNeto === 'function') _cobroActualizarNeto();
      return;
    }

    // ── Regla tarjeta = precio normal (promos solo válidas en efectivo/transferencia) ──
    const resultado = _reglaPagoLocal(metodo, {
      tienePromo:  window._cobrarTienePromo,
      totalPromo:  window._cobrarTotalPromo  || 0,
      totalNormal: window._cobrarTotalRegular || window._cobrarTotalPromo || 0,
      desglose:    window._cobrarDesglose
    });

    if (resultado.usaPrecioNormal) {
      if (aviso) aviso.style.display = 'block';
      const promoDisp  = Number(window._cobrarTotalPromo || 0).toFixed(2);
      const normalDisp = resultado.totalFinal.toFixed(2);
      const pp = document.getElementById('cobrarPrecioPromo'); if (pp) pp.textContent = '$' + promoDisp;
      const pr = document.getElementById('cobrarPrecioRegular'); if (pr) pr.textContent = '$' + normalDisp;
      if (totalEl) { totalEl.textContent = '$' + (resultado.totalFinal + totalProductos).toFixed(2); totalEl.style.color = 'var(--danger)'; }
      if (promoBanner) promoBanner.style.display = 'none';
      if (subtotalEl) { subtotalEl.textContent = '$' + normalDisp; subtotalEl.style.color = 'var(--danger)'; }
      if (resultado.desglose && itemsEl2) {
        itemsEl2.innerHTML = resultado.desglose.map((d, i) => _cobrarLineaHTML(d, i, 'var(--danger)', d.montoFinal)).join('');
      }
      window._cobrarTotalConProductos = resultado.totalFinal + totalProductos;
    } else {
      if (aviso) aviso.style.display = 'none';
      if (totalEl) { totalEl.textContent = '$' + (resultado.totalFinal + totalProductos).toFixed(2); totalEl.style.color = 'var(--accent-deep)'; }
      if (promoBanner && window._cobrarTienePromo) promoBanner.style.display = 'block';
      if (resultado.desglose && itemsEl2) {
        itemsEl2.innerHTML = resultado.desglose.map((d, i) => _cobrarLineaHTML(d, i, d.congelado?'var(--success)':'var(--accent-deep)', d.montoFinal)).join('');
      }
      if (subtotalEl) { subtotalEl.textContent = '$' + resultado.totalFinal.toFixed(2); subtotalEl.style.color = ''; }
      window._cobrarTotalConProductos = resultado.totalFinal + totalProductos;
    }
    if (typeof _cobroActualizarNeto === 'function') _cobroActualizarNeto();
  }
  window.refreshCobrarTotal = refreshCobrarTotal;

  // Respaldo local por si el archivo externo (nexserv-mandamientos.js) no cargó:
  // evita que el botón de cobro quede trabado si construirPayloadDistribucionM5 no existe.
  function _payloadDistribucionLocal(o) {
    return {
      idEspera:        o.idEspera,
      metodoPago:      o.metodoPago,
      metodo:          o.metodoPago,
      totalCobrado:    o.totalCobrado,
      total:           o.totalCobrado,
      tienePromo:      !!o.tienePromo,
      usaPrecioNormal: !!o.usaPrecioNormal,
      serviciosDetalle: o.desglose || null,
      desglose:        o.desglose || null
    };
  }
  const _construirPayload = (typeof window.construirPayloadDistribucionM5 === 'function')
    ? window.construirPayloadDistribucionM5
    : _payloadDistribucionLocal;

  // Precio REGULAR (sin promo) de una clienta — robusto para cobro grupal.
  // Usa precioRegular si viene bien; si no, lo deriva del desglose o del catálogo de promos.
  function _regularClienta(c) {
    const total = Number(c.total) || 0;
    const reg = Number(c.precioRegular) || 0;
    // Retornar regular si es diferente al promo (mayor O simplemente distinto y > 0)
    if (reg > 0 && reg !== total) return reg;
    if (reg > total) return reg;
    if (Array.isArray(c.serviciosDetalle)) {
      // Sumar montoNormal si existe en el desglose (viene de Lineas con montoRegular)
      const tieneNormal = c.serviciosDetalle.some(function(d){ return d.montoNormal != null && d.montoNormal !== d.monto; });
      const sumN = c.serviciosDetalle.reduce(function(s,d){ return s + (Number(d.montoNormal != null ? d.montoNormal : d.monto) || 0); }, 0);
      if (tieneNormal && sumN > 0) return sumN;
      if (sumN > total) return sumN;
    }
    if (c.promoNombre && typeof PROMOS !== 'undefined' && Array.isArray(PROMOS)) {
      try {
        let r = 0;
        String(c.promoNombre).split(',').map(function(s){ return s.trim(); }).forEach(function(nm){
          const p = PROMOS.find(function(p){ return String(p.name || '').trim() === nm; });
          if (p) r += Number(p.regular || p.price) || 0;
        });
        if (r > total) return r;
      } catch(e) {}
    }
    return total;
  }
  window._regularClienta = _regularClienta;

  // Suma el precio REGULAR (sin promo) buscando en el catálogo de promos por nombre.
  // Sirve cuando un combo/promo no trae su precio regular (ej: tickets TM).
  function _regularDesdeCatalogo(promoNombre, desglose) {
    if (typeof PROMOS === 'undefined' || !Array.isArray(PROMOS)) return 0;
    const nombres = new Set();
    if (promoNombre) String(promoNombre).split(',').forEach(n => nombres.add(n.trim()));
    (desglose || []).forEach(d => {
      if (d.servicio)    nombres.add(String(d.servicio).trim());
      if (d.name)        nombres.add(String(d.name).trim());
      if (d.promoNombre) nombres.add(String(d.promoNombre).trim());
    });
    let r = 0;
    nombres.forEach(nm => {
      const p = PROMOS.find(p => String(p.name || '').trim() === nm);
      if (p) r += Number(p.regular || p.price) || 0;
    });
    return r;
  }
  window._regularDesdeCatalogo = _regularDesdeCatalogo;

  // Precio REGULAR de UNA línea del desglose, robusto para TM con servicios cambiados a promo
  // o líneas combinadas (normal + promo). Idea: regular = monto + el DESCUENTO de la(s)
  // promo(s) presentes en la línea (regular_catálogo − precio_catálogo). Así una promo pura
  // sube a su regular, y una línea combinada solo le suma el descuento de su parte promo.
  function _regularLineaDesc(d) {
    const m = Number(d.monto) || 0;
    let reg = Number(d.montoNormal != null ? d.montoNormal : 0) || 0;
    let uplift = 0;
    if (typeof PROMOS !== 'undefined' && Array.isArray(PROMOS)) {
      const nombres = [];
      if (d.promoNombre) String(d.promoNombre).split(',').forEach(n => nombres.push(n.trim()));
      if (d.servicio)    String(d.servicio).split('+').forEach(n => nombres.push(n.trim()));
      const vistos = new Set();
      nombres.forEach(function(nm){
        const k = nm.toLowerCase();
        if (!nm || vistos.has(k)) return;
        const p = PROMOS.find(function(p){ return String(p.name || '').trim().toLowerCase() === k; });
        if (p) {
          const pr = Number(p.regular || 0), pp = Number(p.price || 0);
          if (pr > pp) { uplift += (pr - pp); vistos.add(k); }
        }
      });
    }
    return Math.max(reg, m + uplift, m);
  }
  window._regularLineaDesc = _regularLineaDesc;

  async function confirmarCobro() {
    const btn = document.getElementById('cobrarBtn');

    // ── FACTURACIÓN (OPCIONAL): si hay datos válidos se usan y se guardan; si no, se cobra
    // igual y se cargan la próxima. Nunca bloquea el cobro. Aplica también al grupal
    // (factura a la pagadora / principal). ──
    {
      const _fv = factValidarParaCobro();
      window._facturacionActual = _fv.ok ? _fv.fact : null;
    }

    // FIX: si es pago mixto, validar y construir el string desglosado
    let _metodoPagoFinal = window._cobrarPago || window._cobroPago || 'Efectivo';
    if (_metodoPagoFinal === 'Pago mixto') {
      const m1 = parseFloat(document.getElementById('mixtoMonto1')?.value || 0) || 0;
      const m2 = parseFloat(document.getElementById('mixtoMonto2')?.value || 0) || 0;
      const m3 = parseFloat(document.getElementById('mixtoMonto3')?.value || 0) || 0;
      const met1 = document.getElementById('mixtoMetodo1')?.value || 'Efectivo';
      const met2 = document.getElementById('mixtoMetodo2')?.value || 'Transferencia';
      const met3 = document.getElementById('mixtoMetodo3')?.value || 'Tarjeta';
      const totalNum = parseFloat((document.getElementById('cobrarTotal')?.textContent || '0').replace('$','')) || 0;
      if (m1 <= 0 && m2 <= 0 && m3 <= 0) {
        alert('Ingresá los montos del pago mixto.');
        return;
      }
      const diff = Math.abs(totalNum - (m1 + m2 + m3));
      if (diff > 0.1) {
        alert('El total del pago mixto ($' + (m1+m2+m3).toFixed(2) + ') no coincide con el total a cobrar ($' + totalNum.toFixed(2) + '). Ajustá los montos.');
        return;
      }
      // Construir string descriptivo
      const partes = [];
      if (m1 > 0) partes.push('$' + m1.toFixed(2) + ' ' + met1.toLowerCase());
      if (m2 > 0) partes.push('$' + m2.toFixed(2) + ' ' + met2.toLowerCase());
      if (m3 > 0) partes.push('$' + m3.toFixed(2) + ' ' + met3.toLowerCase());
      _metodoPagoFinal = 'Mixto: ' + partes.join(' + ');
      window._cobrarPago = _metodoPagoFinal;
      window._cobroPago  = _metodoPagoFinal;
    }

    btn.textContent = '⏳ Procesando...';
    btn.disabled = true;

    try {
    // Cobro grupal: confirmar múltiples tickets a la vez
    if (window._cobroGrupal && window._cobroGrupal.clientas) {
      const metodoPago = window._cobroPago || 'Efectivo';
      const clientas   = window._cobroGrupal.clientas;
      try {
        const esTarjetaGrupal = metodoPago === 'Tarjeta';
        for (const c of clientas) {
          // ── MANDAMIENTO #4: tarjeta invalida promo ──
          // Clienta editada a mano = valor FINAL; si no, promo invalida con tarjeta → regular
          const totalCobrado = c._editado
            ? String(c.total || '0')
            : ((esTarjetaGrupal && c.promoNombre) ? String(_regularClienta(c)) : String(c.total || '0'));
          const _regClienta = c._editado ? String(c.total || '0') : String(_regularClienta(c));
          // ── MANDAMIENTO #5: payload completo para distribución a staff/Mikaela/Owner ──
          const _payloadGrupal = _construirPayload({
            idEspera:        c.idEspera,
            metodoPago:      metodoPago,
            totalCobrado:    Number(totalCobrado),
            tienePromo:      !!(c.promoNombre),
            usaPrecioNormal: esTarjetaGrupal && !!(c.promoNombre),
            desglose:        c.serviciosDetalle || null
          });
          _payloadGrupal.precioRegular  = _regClienta;
          _payloadGrupal.promoNombre    = c.promoNombre || '';
          _payloadGrupal.esCobroGrupal  = true;
          await apiPost('confirmarCobro', _payloadGrupal);
          // ── MANDAMIENTO #3: registrar los productos de ESTA clienta por separado
          // (van a la caja, SIN comisión), igual que en el cobro individual.
          const _prodsC = (c.idEspera && window._apProductosEnTicket && window._apProductosEnTicket[c.idEspera]) ? window._apProductosEnTicket[c.idEspera] : [];
          if (_prodsC.length > 0) {
            const _totProdC = _prodsC.reduce(function(s,p){ return s + (Number(p.precio) * Number(p.cantidad || 1)); }, 0);
            try {
              await apiPost('registrarVentaProductos', {
                idEspera: c.idEspera,
                clienteNombre: c.nombre || '',
                productos: _prodsC,
                total: _totProdC,
                metodoPago: metodoPago
              });
            } catch(eProd) { console.error(eProd); }
            delete window._apProductosEnTicket[c.idEspera];
          }
        }
        // ── FACTURACIÓN grupal (OPCIONAL): factura a nombre de la pagadora (principal),
        // con el total combinado. Endpoint aparte, nunca bloquea. ──
        try {
          if (window._facturacionActual && clientas && clientas.length) {
            const _pagadora = clientas[0];
            const _totG = clientas.reduce(function (s, c) { return s + Number(c.total || 0); }, 0);
            const _servG = clientas.map(function (c) {
              return { servicio: (c.servicios || c.promoNombre || c.nombre || 'Servicio'),
                       area: '', monto: Number(c.total || 0), cantidad: 1, staff: c.staff || '' };
            });
            const _snapG = {
              servicios: _servG, descuento: 0, total: Number(_totG || 0),
              metodoPago: metodoPago || '', fechaEmision: new Date().toISOString()
            };
            const _docG = factBuildDocumentoSRI(window._facturacionActual, _snapG);
            apiPost('guardarFacturacion', {
              idEspera: _pagadora.idEspera || '', codigo: _pagadora.codigo || '', documento: _docG
            }).catch(function (e) { console.warn('guardarFacturacion grupal:', e); });
          }
        } catch (eFG) { console.warn('facturacion grupal snapshot:', eFG); }
        const idx = window._cobroGrupal.idxEsperando;
        if (idx !== undefined) window._mkEsperandoCobro.splice(idx, 1);
        window._cobroGrupal = null;
        // Vaciar TODO el mapa de productos staged tras cobro OK: ningún producto
        // sobrevive a un cobro para reaparecerle a la siguiente clienta (reúso de id).
        window._apProductosEnTicket = {};
        mkRenderEsperandoCobro();
        closeModal();
        showToast('✓ Cobro grupal confirmado — ' + metodoPago);
        const _totalGrupal = clientas.reduce((s,c) => s + Number(c.total||0), 0);
        enviarPushOwner(
          '💰 Cobro grupal — $' + _totalGrupal.toFixed(2),
          clientas.length + ' clientas · ' + metodoPago
        );
        setTimeout(() => loadMikaelaHome(), 600);
      } catch(e) {
        console.error(e);
        showToast('⚠ Error al confirmar cobro grupal');
        btn.disabled = false; btn.textContent = '✓ Confirmar cobro';
      }
      return;
    }

    // Si tiene promo y paga con tarjeta, cobrar precio regular
    const totalServicios = (window._cobrarTienePromo && window._cobrarPago === 'Tarjeta')
      ? window._cobrarTotalRegular
      : window._cobrarTotalPromo;

    // Sumar productos si hay (solo para mostrar el total que paga la clienta)
    const totalProductos = window._cobrarTotalProductos || 0;
    const totalFinal = totalServicios + totalProductos;

    // ── MANDAMIENTO #5: construir payload completo para distribución a los 3 destinos ──
    // staff (comisiones) + Mikaela (CierresPagos) + Owner (HistorialOwner)
    // IMPORTANTE: el totalCobrado del SERVICIO debe ser SOLO los servicios, NO los
    // productos. El producto se registra aparte con registrarVentaProductos (va a la
    // caja de Mikaela, SIN comisión). Antes se mandaba servicio+producto y la staff
    // cobraba comisión también sobre el producto (ej: lápiz sumado a su depilación).
    const _payloadM5 = _construirPayload({
      idEspera:        window._cobrarId,
      metodoPago:      window._cobrarPago,
      totalCobrado:    totalServicios,
      tienePromo:      window._cobrarTienePromo,
      usaPrecioNormal: window._cobrarTienePromo && window._cobrarPago === 'Tarjeta',
      desglose:        window._cobrarDesglose
    });
    _payloadM5.totalServicios = totalServicios;
    _payloadM5.totalProductos = totalProductos;
    // FIX: forzar que el desglose EDITADO por Mikaela (montos corregidos) sea el que use
    // el backend para repartir comisiones — antes podía quedar el guardado (viejo).
    if (window._cobrarDesglose && window._cobrarDesglose.length) {
      _payloadM5.serviciosDetalle = window._cobrarDesglose;
      _payloadM5.desglose = window._cobrarDesglose;
    }
    // Nota de auditoría: correcciones/quitados que hizo Mikaela en este cobro (queda en HistorialOwner)
    if (window._cobrarAjustes && window._cobrarAjustes.length > 0) {
      _payloadM5.notaAjuste = window._cobrarAjustes.join(' · ');
    }

    try {
      if (!window._cobrarId) throw new Error('ID de ticket vacío — no se puede confirmar cobro');
      await apiPost('confirmarCobro', _payloadM5);
    } catch (err) {
      console.error('confirmarCobro error:', err);
      btn.disabled = false;
      btn.textContent = '✓ Confirmar cobro';
      showToast('⚠ Error al confirmar: ' + (err.message || 'intenta de nuevo'));
      return; // No continuar si falló
    }

    // Cobro OK → consumir el abono de esta clienta (si tenía), para que no se reutilice
    try {
      if (window._cobrarCodigo && Number(window._cobrarAbonoMonto) > 0) {
        await apiPost('consumirAbono', { codigo: window._cobrarCodigo });
      }
    } catch (eAb) { console.error(eAb); }

    // Si hay productos, registrarlos en el historial
    const productosTicket = (window._cobrarId && window._apProductosEnTicket && window._apProductosEnTicket[window._cobrarId]) ? window._apProductosEnTicket[window._cobrarId] : [];
    if (productosTicket.length > 0) {
      try {
        await apiPost('registrarVentaProductos', {
          idEspera: window._cobrarId,
          clienteNombre: document.getElementById('cobrarClientName')?.textContent || '',
          productos: productosTicket,
          total: totalProductos,
          metodoPago: window._cobrarPago
        });
      } catch(e) { console.error(e); }
      delete window._apProductosEnTicket[window._cobrarId];
      const ticketDiv = document.getElementById('productos-ticket-' + window._cobrarId);
      if (ticketDiv) ticketDiv.innerHTML = '';
    }

    // ── FACTURACIÓN: guardar el documento (endpoint aparte, NUNCA bloquea el cobro) ──
    // El cobro ya quedó registrado arriba; esto solo persiste los datos fiscales para
    // el futuro envío al SRI. Si falla, se loguea y la clienta igual quedó cobrada.
    try {
      if (!window._cobroGrupal && window._facturacionActual) {
        // Detalle estructurado: SIEMPRE debe haber al menos una línea (el SRI lo exige).
        var _servicios = (window._cobrarDesglose || []).map(function(d) {
          return { servicio: d.servicio, area: d.area || '', monto: Number(d.monto || 0), cantidad: 1, staff: d.staff || '' };
        });
        // Servicio simple (sin desglose): armar una línea desde el total de servicios.
        if (_servicios.length === 0 && Number(totalServicios) > 0) {
          var _svcSimple = ((document.getElementById('cobrarService') || {}).textContent || '').trim();
          _servicios.push({ servicio: _svcSimple || 'Servicio', area: '', monto: Number(totalServicios), cantidad: 1, staff: '' });
        }
        // Productos del ticket como líneas, para que el detalle sume el total real cobrado.
        (productosTicket || []).forEach(function(p) {
          _servicios.push({
            servicio: (p.nombre || p.producto || 'Producto'), area: 'producto',
            monto: Number(p.precio || 0) * Number(p.cantidad || 1),
            cantidad: Number(p.cantidad || 1), staff: '', esProducto: true
          });
        });
        const _snap = {
          servicios: _servicios,
          descuento: Math.max(0, Number(window._cobrarTotalRegular || 0) - Number(totalServicios || 0)),
          total: Number(totalFinal || 0),
          metodoPago: window._cobrarPago || '',
          fechaEmision: new Date().toISOString()
        };
        const _doc = factBuildDocumentoSRI(window._facturacionActual, _snap);
        apiPost('guardarFacturacion', {
          idEspera: window._cobrarId || '',
          codigo: window._cobrarCodigo || '',
          documento: _doc
        }).catch(function(e) { console.warn('guardarFacturacion:', e); });
      }
    } catch (e) { console.warn('facturacion snapshot:', e); }

    btn.textContent = '✓ Confirmar cobro';
    btn.disabled = false;
    closeModal();
    // Limpiar promo del localStorage
    try {
      const clientKey = normalizeClientKey(document.getElementById('cobrarClientName')?.textContent || '');
      if (clientKey && activePromos[clientKey]) {
        delete activePromos[clientKey];
        saveActivePromos();
      }
    } catch(e) {}
    await loadPorCobrar();
    // Vaciar TODO el mapa de productos staged tras cobro OK (mismo motivo que en grupal).
    window._apProductosEnTicket = {};

    let msg = '✓ Cobro de $' + totalFinal.toFixed(2) + ' registrado como ' + window._cobrarPago;
    if (totalProductos > 0) msg += '\n(Servicios: $' + totalServicios + ' + Productos: $' + totalProductos.toFixed(2) + ')';
    if (window._cobrarTienePromo && window._cobrarPago === 'Tarjeta') msg += '\n(Precio regular — promo no aplica con tarjeta)';
    // Notificar al owner del cobro: "Clienta X pagó <método> $Y por <servicios>"
    const _clienteCobro = document.getElementById('cobrarClientName')?.textContent || 'Clienta';
    const _servCobro = (window._cobrarDesglose || []).map(d => d.servicio).filter(Boolean).join(', ')
                      || (window._cobrarPromoNombre || 'servicio');
    enviarPushOwner(
      '💰 Pago recibido — $' + totalFinal.toFixed(2),
      _clienteCobro + ' pagó ' + window._cobrarPago + ' $' + totalFinal.toFixed(2) + ' por ' + _servCobro + (totalProductos > 0 ? ' (inc. productos)' : '')
    );
    alert(msg);
    } finally {
      // Garantía: el botón SIEMPRE se reactiva al terminar, pase lo que pase
      // (evita que quede trabado en "Procesando" y haya que recargar la app).
      if (btn) { btn.disabled = false; btn.textContent = '✓ Confirmar cobro'; }
    }
  }
  async function filterArrivalClients() {
    const search = (document.getElementById('arrivalSearch')?.value || '').toLowerCase();
    const list = document.getElementById('arrivalClientList');
    if (search.length < 2) {
      list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">Escribí al menos 2 letras para buscar</div>';
      return;
    }
    
    // Cargar cache si está vacío
    if (CLIENT_DIRECTORY_CACHE.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">⏳ Cargando...</div>';
      const result = await apiGet('getClientas');
      if (result.success) {
        CLIENT_DIRECTORY_CACHE = result.clientas
          .filter(c => c.codigo && c.nombre && /^C-\d{4}$/.test(String(c.codigo).trim()) && String(c.nombre).trim().length > 1)
          .map(c => ({
            key: String(c.codigo).toLowerCase().replace(/-/g, ''),
            code: String(c.codigo), name: String(c.nombre), phone: c.telefono ? String(c.telefono) : '',
            isTop: String(c.esTop || '').toLowerCase().includes('sí'),
            visits: Number(c.totalVisitas) || 0, lastVisit: c.ultimaVisita ? String(c.ultimaVisita) : '—'
          }));
      }
    }
    
    const filtered = CLIENT_DIRECTORY_CACHE.filter(c => 
      c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search)
    );

    // Ordenar por primer apellido (segunda palabra del nombre completo)
    filtered.sort((a, b) => {
      const apellidoA = (a.name.trim().split(' ')[1] || a.name.trim()).toLowerCase();
      const apellidoB = (b.name.trim().split(' ')[1] || b.name.trim()).toLowerCase();
      return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
    });
    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">No se encontró ninguna clienta. <span style="color: var(--accent-deep); cursor: pointer; font-weight: 700;" onclick="openNewClient(); show(\'clientDirectory\');">¿Registrar nueva?</span></div>';
      return;
    }
    list.innerHTML = filtered.map(c => `
      <div class="card" style="margin-bottom: 8px; padding: 14px; cursor: pointer;" onclick="selectArrivalClient('${c.key || ''}', '${c.name}', '${c.code}', ${c.isTop}, ${c.visits})">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="client-avatar ${c.isTop ? 'is-top' : ''}" style="flex-shrink: 0;">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 15px;">${c.name} ${c.isTop ? '<span class="top-star">⭐</span>' : ''}</div>
            <div style="font-size: 11px; color: var(--ink-faint); font-weight: 500;">${c.code} · ${c.visits} visitas</div>
          </div>
          <span style="font-size: 14px; color: var(--accent-deep); font-weight: 700;">Seleccionar</span>
        </div>
      </div>
    `).join('');
  }

  function selectArrivalClient(key, name, code, isTop, visits) {
    window._arrSelectedKey = key;
    document.getElementById('arrSelAvatar').textContent = name.split(' ').map(n=>n[0]).join('').slice(0,2);
    document.getElementById('arrSelAvatar').className = 'client-avatar' + (isTop ? ' is-top' : '');
    document.getElementById('arrSelName').textContent = name;
    document.getElementById('arrSelCode').textContent = code + ' · ' + visits + ' visitas';
    document.getElementById('arrSelTop').style.display = isTop ? 'inline' : 'none';
    
    // TOP banner
    const topBanner = document.getElementById('arrTopBanner');
    if (isTop) {
      topBanner.style.display = 'flex';
      document.getElementById('arrTopText').textContent = '¡' + name.split(' ')[0] + ' es clienta TOP! Trato premium.';
    } else {
      topBanner.style.display = 'none';
    }
    
    // Ocultar lista y mostrar formulario
    document.getElementById('arrivalClientList').style.display = 'none';
    document.getElementById('arrivalSearch').style.display = 'none';
    document.getElementById('arrivalForm').style.display = 'block';

    // Inicializar el formulario TM unificado
    document.getElementById('arrFormUnificado').style.display = 'block';
    window._arrTipo = 'multi'; // siempre TM

    // Resetear y añadir primer slot automáticamente
    if (typeof initFormTM === 'function') {
      initFormTM();
      addServicioTM(); // primer servicio automático
    }
  }
  
  // Actualizar el label del botón según el área seleccionada
  function updateServiceButtonLabel() {
    const area = document.getElementById('arrArea')?.value || '';
    const label = document.getElementById('assignServiceLabel');
    if (label) {
      label.textContent = area ? `Agregar servicio de ${area}` : 'Agregar servicio...';
    }
  }
  
  // Cargar servicios del área seleccionada
  async function loadServicesForArea() {
    await ensureCatalogoLoaded();
    const area = document.getElementById('arrArea')?.value;
    const selectMain = document.getElementById('arrService'); // Servicio tentativo
    const selectExpanded = document.getElementById('arrServiceSelect'); // Expandible
    
    if (!area) return;
    
    // Mapear área a clave de CATALOGO
    const areaMap = {
      'Cejas': 'cejas',
      'Depilación': 'depilacion',
      'Pestañas': 'pestanas',
      'Lifting / Retiro': 'retiro_lifting',
      'Facial': 'facial'
    };
    
    const catKey = areaMap[area];
    const servicios = CATALOGO[catKey] || [];
    
    // Actualizar dropdown principal (Servicio tentativo)
    if (selectMain) {
      selectMain.innerHTML = '<option value="">Seleccionar servicio...</option>';
      
      if (servicios.length === 0) {
        selectMain.innerHTML = '<option value="">No hay servicios disponibles</option>';
      } else {
        servicios.forEach(s => {
          const opt = document.createElement('option');
          opt.value = JSON.stringify({nombre: s.name, precio: s.price});
          opt.textContent = `${s.name} - $${s.price}`;
          selectMain.appendChild(opt);
        });
      }
      
      // Ocultar precio hasta que seleccionen
      document.getElementById('arrServicePriceDisplay').style.display = 'none';
    }
    
    // Actualizar dropdown expandible (para asignar servicio adicional)
    if (selectExpanded) {
      selectExpanded.innerHTML = '<option value="">Seleccionar servicio...</option>';
      const priceDiv = document.getElementById('arrServicePrice');
      if (priceDiv) priceDiv.style.display = 'none';
      
      if (servicios.length > 0) {
        servicios.forEach(s => {
          const opt = document.createElement('option');
          opt.value = JSON.stringify({nombre: s.name, precio: s.price});
          opt.textContent = `${s.name} - $${s.price}`;
          selectExpanded.appendChild(opt);
        });
      }
    }
  }
  
  // Cuando seleccionen servicio tentativo, mostrar el precio
  function onArrServiceChange() {
    const select = document.getElementById('arrService');
    const priceDiv = document.getElementById('arrServicePriceDisplay');
    
    if (select.value) {
      const data = JSON.parse(select.value);
      priceDiv.textContent = `💵 Precio: $${data.precio}`;
      priceDiv.style.display = 'block';
    } else {
      priceDiv.style.display = 'none';
    }
  }

  // ── SELECTOR DE TIPO DE CLIENTA ─────────────────────────
  window._arrTipo = 'normal'; // 'normal' | 'promo' | 'multi'

  // ══════════════════════════════════════════════════════════════
  // FORMULARIO TM UNIFICADO
  // Mikaela agrega servicios por área → genera TM automáticamente
  // ══════════════════════════════════════════════════════════════

  // Estado del formulario TM
  var _tmServicios = []; // [{ area, areaKey, servicio, precio, precioNormal, tipo }]
  var _tmContador  = 0;

  const TM_AREA_LABELS = {
    'Cejas': 'cejas', 'Depilación': 'depilacion', 'Pestañas': 'pestanas',
    'Lifting / Retiro': 'retiro_lifting', 'Facial': 'facial'
  };

  // Inicializar formulario al seleccionar clienta
  function initFormTM() {
    _tmServicios = [];
    _tmContador  = 0;
    const container = document.getElementById('tmServiciosContainer');
    if (container) container.innerHTML = '';
    tmActualizarResumen();
    tmActualizarSecuenciaBtns();
    window._arrTipo = 'multi'; // siempre TM
    window._arrPromo = null;
    _arrPromos = [];
    window._secuencia = [];
    renderSecuencia();
    const promoAviso = document.getElementById('tmPromoAviso');
    if (promoAviso) promoAviso.style.display = 'none';
  }

  // Agregar un slot de servicio
  function addServicioTM() {
    _tmContador++;
    const idx = _tmContador;
    const container = document.getElementById('tmServiciosContainer');
    if (!container) return;

    const slot = document.createElement('div');
    slot.id = 'tmSlot-' + idx;
    slot.style.cssText = 'background:var(--bg-soft,#f4f1ec);border:1px solid var(--line);border-radius:16px;padding:13px 14px;margin-bottom:10px;';
    slot.innerHTML = `
      <!-- Header del slot -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
        <span style="font-size:11px;font-weight:800;color:var(--ink-soft);text-transform:uppercase;letter-spacing:0.06em;">Servicio ${idx}</span>
        <button onclick="quitarServicioTM(${idx})"
          style="background:transparent;color:#dc2626;border:none;padding:2px 4px;font-size:11px;font-weight:700;cursor:pointer;">
          ✕ Quitar
        </button>
      </div>

      <!-- Selector de área -->
      <div style="position:relative;margin-bottom:8px;">
        <select id="tmArea-${idx}" onchange="onTmAreaChange(${idx})"
          style="width:100%;padding:12px 38px 12px 14px;border-radius:12px;
                 border:1px solid var(--line);background:var(--bg-card);
                 font-family:inherit;font-size:14px;font-weight:600;
                 color:var(--ink);cursor:pointer;appearance:none;
                 -webkit-appearance:none;outline:none;box-sizing:border-box;">
          <option value="">Área…</option>
          <option value="Cejas">Cejas</option>
          <option value="Depilación">Depilación</option>
          <option value="Pestañas">Pestañas</option>
          <option value="Lifting / Retiro">Lifting / Retiro</option>
          <option value="Facial">Facial</option>
          <option value="Promociones">🎁 Promociones</option>
        </select>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);
                     pointer-events:none;font-size:12px;color:var(--ink-soft);">▾</span>
      </div>

      <!-- Selector de servicio normal -->
      <div id="tmSvcNormal-${idx}" style="display:block;">
        <div style="position:relative;">
          <select id="tmServicioSel-${idx}" onchange="onTmServicioChange(${idx})"
            style="width:100%;padding:12px 38px 12px 14px;border-radius:12px;
                   border:1px solid var(--line);background:var(--bg-card);
                   font-family:inherit;font-size:13px;font-weight:500;
                   color:var(--ink);cursor:pointer;appearance:none;
                   -webkit-appearance:none;outline:none;box-sizing:border-box;">
            <option value="">Elegí el área primero</option>
          </select>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);
                       pointer-events:none;font-size:12px;color:var(--ink-soft);">▾</span>
        </div>
      </div>

      <!-- Selector de promo -->
      <div id="tmSvcPromo-${idx}" style="display:none;">
        <div style="position:relative;">
          <select id="tmPromoSel-${idx}" onchange="onTmPromoChange(${idx})"
            style="width:100%;padding:12px 38px 12px 14px;border-radius:12px;
                   border:1px solid var(--line);background:var(--bg-card);
                   font-family:inherit;font-size:13px;font-weight:500;
                   color:var(--ink);cursor:pointer;appearance:none;
                   -webkit-appearance:none;outline:none;box-sizing:border-box;">
            <option value="">Cargando promos…</option>
          </select>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);
                       pointer-events:none;font-size:12px;color:var(--ink-soft);">▾</span>
        </div>
      </div>

      <!-- Precio -->
      <div id="tmPrecioDisplay-${idx}"
        style="display:none;margin-top:9px;padding:9px 13px;
               background:var(--success-bg,#f0fdf4);border-radius:10px;
               font-size:13px;font-weight:800;color:var(--success,#16a34a);">
      </div>
    `;
    container.appendChild(slot);
    _tmServicios.push({ idx, area: '', areaKey: '', servicio: '', precio: 0, precioNormal: 0, tipo: 'normal' });
    tmActualizarSecuenciaBtns();
  }

  function quitarServicioTM(idx) {
    const slot = document.getElementById('tmSlot-' + idx);
    if (slot) slot.remove();
    _tmServicios = _tmServicios.filter(s => s.idx !== idx);
    tmActualizarResumen();
    tmActualizarSecuenciaBtns();
  }

  function setTipoTM(idx, tipo) {
    const svc = _tmServicios.find(s => s.idx === idx);
    if (svc) svc.tipo = tipo;
    const _btnBase = 'padding:10px 8px;border-radius:12px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;';
    const _bN = document.getElementById('tmBtnNormal-' + idx);
    const _bP = document.getElementById('tmBtnPromo-' + idx);
    if (_bN) _bN.style.cssText = _btnBase +
      (tipo === 'normal'
        ? 'border:2px solid var(--accent);background:var(--accent);color:white;'
        : 'border:2px solid var(--line);background:transparent;color:var(--ink-soft);');
    if (_bP) _bP.style.cssText = _btnBase +
      (tipo === 'promo'
        ? 'border:2px solid #b45309;background:#fef3c7;color:#7a5a1c;'
        : 'border:2px solid var(--line);background:transparent;color:var(--ink-soft);');
    document.getElementById('tmSvcNormal-' + idx).style.display = tipo === 'normal' ? 'block' : 'none';
    document.getElementById('tmSvcPromo-' + idx).style.display  = tipo === 'promo'  ? 'block' : 'none';
    if (tipo === 'promo') cargarPromasTM(idx);
    // resetear precio
    if (svc) { svc.servicio = ''; svc.precio = 0; svc.precioNormal = 0; }
    const pd = document.getElementById('tmPrecioDisplay-' + idx);
    if (pd) pd.style.display = 'none';
    tmActualizarResumen();
  }

  async function onTmAreaChange(idx) {
    await ensureCatalogoLoaded();
    const areaEl = document.getElementById('tmArea-' + idx);
    const area = areaEl ? areaEl.value : '';
    const svc = _tmServicios.find(s => s.idx === idx);

    // ÁREA = PROMOCIONES → mostrar el selector de promos (sin necesidad de área previa)
    if (area === 'Promociones') {
      if (svc) {
        svc.tipo = 'promo';
        svc.area = ''; svc.areaKey = '';
        svc.servicio = ''; svc.precio = 0; svc.precioNormal = 0;
        if (svc._isComboMultiArea) { svc._isComboMultiArea = false; svc._comboAreas = null; window._secuencia = []; renderSecuencia(); }
      }
      const sn = document.getElementById('tmSvcNormal-' + idx); if (sn) sn.style.display = 'none';
      const sp = document.getElementById('tmSvcPromo-' + idx);  if (sp) sp.style.display = 'block';
      cargarPromasTM(idx);
      const pd0 = document.getElementById('tmPrecioDisplay-' + idx); if (pd0) pd0.style.display = 'none';
      tmActualizarResumen(); tmActualizarSecuenciaBtns();
      return;
    }

    const areaKey = TM_AREA_LABELS[area] || '';
    if (svc) {
      svc.tipo = 'normal';
      svc.area = area; svc.areaKey = areaKey;
      svc.servicio = ''; svc.precio = 0; svc.precioNormal = 0;
      // Si tenía un combo, resetear para que se reordene con la nueva área
      if (svc._isComboMultiArea) {
        svc._isComboMultiArea = false;
        svc._comboAreas = null;
        // Resetear secuencia para que se reconstruya con el nuevo orden
        window._secuencia = [];
        renderSecuencia();
      }
    }
    // Mostrar el selector de servicio normal, ocultar el de promo
    const sn2 = document.getElementById('tmSvcNormal-' + idx); if (sn2) sn2.style.display = 'block';
    const sp2 = document.getElementById('tmSvcPromo-' + idx);  if (sp2) sp2.style.display = 'none';

    // Cargar servicios normales
    const sel = document.getElementById('tmServicioSel-' + idx);
    if (sel && areaKey) {
      sel.innerHTML = '<option value="">Seleccioná el servicio...</option>';
      (CATALOGO[areaKey] || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ nombre: s.name, precio: s.price });
        opt.textContent = s.name + ' — $' + s.price;
        sel.appendChild(opt);
      });
    }
    // Si está en modo promo, recargar promos
    if (svc && svc.tipo === 'promo') cargarPromasTM(idx);
    const pd = document.getElementById('tmPrecioDisplay-' + idx);
    if (pd) pd.style.display = 'none';
    tmActualizarResumen();
    tmActualizarSecuenciaBtns();
  }

  function onTmServicioChange(idx) {
    const sel = document.getElementById('tmServicioSel-' + idx);
    if (!sel || !sel.value) return;
    const d = JSON.parse(sel.value);
    const svc = _tmServicios.find(s => s.idx === idx);
    if (svc) { svc.servicio = d.nombre; svc.precio = d.precio; svc.precioNormal = d.precio; }
    const pd = document.getElementById('tmPrecioDisplay-' + idx);
    if (pd) { pd.textContent = '💵 $' + d.precio; pd.style.display = 'block'; }
    tmActualizarResumen();
  }

  async function cargarPromasTM(idx) {
    await ensureCatalogoLoaded();
    const svc  = _tmServicios.find(s => s.idx === idx);
    const areaKey = svc ? svc.areaKey : '';
    const sel  = document.getElementById('tmPromoSel-' + idx);
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccioná la promo...</option>';
    const promos = PROMOS.filter(p => p.active);
    promos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ nombre: p.name, precio: p.price, regular: p.regular, division: p.division });
      opt.textContent = p.name + ' — $' + p.price + ' (regular $' + p.regular + ')';
      sel.appendChild(opt);
    });
  }

  function onTmPromoChange(idx) {
    const sel = document.getElementById('tmPromoSel-' + idx);
    if (!sel || !sel.value) return;
    const d = JSON.parse(sel.value);
    const svc = _tmServicios.find(s => s.idx === idx);
    if (!svc) return;

    svc.servicio = d.nombre;
    svc.precio = d.precio;
    svc.precioNormal = d.regular || d.precio;
    svc._division = d.division;

    const AREA_KEY_LABELS = {
      cejas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion: 'Depilación', pestanas: '<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.6,8.6l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.8-2.4c-.1-.3,0-.7.4-.8l8.7-2.1c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5ZM4.7,9.9l6.4-2.3c2.7-1,5.6-.9,8.3.2-2-2-5.5-2.7-8.1-2l-8,2,.6,1.8c.1.3.4.5.8.4Z\"/><path d=\"M9.6,17l-.4,1.7c0,.3-.4.5-.7.4s-.5-.4-.5-.7l.4-1.8c-.7-.2-1.2-.5-1.8-.8l-1,1.6c-.2.3-.6.3-.8.1s-.3-.6-.1-.8l.9-1.4-.9-.5c-.3-.1-.4-.5-.2-.8s.5-.4.8-.3c1.1.5,1.9,1,3,1.5,3,1.3,6.4,1,9.1-.7s1.2-.8,1.7-1.3.6-.5.9-.7.6,0,.8.1.1.6-.1.8l-2.2,1.6,1,1.5c.2.3,0,.6-.1.8s-.6.1-.8-.1l-1-1.5c-.6.3-1.2.6-1.9.8l.4,1.7c0,.3-.1.6-.4.7s-.6,0-.7-.4l-.4-1.7c-.6.1-1.2.2-1.8.2v1.8c0,.3-.3.6-.6.6s-.6-.3-.6-.6v-1.7c-.6,0-1.2-.1-1.8-.3Z\"/></svg> Pestañas',
      retiro_lifting: 'Lifting / Retiro', facial: 'Facial'
    };

    // Si la promo tiene división multi-área:
    // 1. Mostrar las áreas en los botones de secuencia directamente
    // 2. NO crear slots adicionales — la promo se maneja como TM internamente
    if (d.division && d.division.length > 1) {
      // MODELO NUEVO (decide Mikaela): cada parte de la promo = un área INDEPENDIENTE
      // con SU servicio, SU clave de área y SU monto. El orden NO importa — Mikaela
      // asigna cada área a la staff correcta y el sistema enruta por clave de área.
      // (Se quitó el reordenamiento "área seleccionada primero": desalineaba los
      //  slots con la staff y hacía caer a la chica en el monto/área equivocada.)
      svc._isComboMultiArea = true;
      // Precio regular por área: usar la división exacta si viene de Paquetes.
      const _promoPrecio  = Number(d.precio || 0);
      const _promoRegular = Number(d.regular || d.precio || 0);
      svc._comboAreas = d.division.map(dv => {
        const _m = Number(dv.monto || 0);
        const _regExacto = Number(dv.regular || dv.montoRegular || dv.precioRegular || dv.normal || 0);
        const _reg = _regExacto > 0 ? _regExacto : (_promoPrecio > 0 && _promoRegular > _promoPrecio)
          ? Math.round((_m / _promoPrecio) * _promoRegular * 100) / 100
          : _m;
        const _areaKey = AREA_KEY_FROM_DIV(String(dv.area || dv.servicio || ''));
        // Etiqueta = NOMBRE DE LA PROMO (no el servicio suelto). IMPORTANTE para el cobro:
        // el motor `_regularRealTM_` reconoce el combo por esta etiqueta (vs hoja Paquetes)
        // para cobrar el REGULAR en tarjeta. Si acá pusiéramos el servicio suelto, no
        // reconocería el combo y la tarjeta cobraría el precio PROMO (cobro mal). El área
        // y el precio por parte van por separado (clave + monto), así que el routing no
        // depende de la etiqueta.
        return {
          area: _areaKey,
          tentativo: d.nombre,
          precio: _m,
          precioNormal: _reg,
          tipo: 'promo'
        };
      });

      const divAreas = svc._comboAreas.map(ca => ca.area);
      const uniqAreas = [...new Set(divAreas)];

      // Actualizar botones de secuencia con las áreas del combo EN EL ORDEN CORRECTO
      const container = document.getElementById('tmSecuenciaBtns');
      if (container) {
        const LABELS = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', retiro_lifting:'Lifting/Retiro', facial:'Facial' };
        container.innerHTML = uniqAreas.map(a =>
          `<button onclick="addAreaSecuencia('${a}')" style="padding:8px 14px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">+ ${LABELS[a]||a}</button>`
        ).join('');
      }

      // MODELO NUEVO: NO se auto-arma ninguna secuencia/orden. Mikaela decide a quién
      // manda cada área; el sistema solo enruta cada área a la staff correcta por clave.
      window._secuencia = [];

      // Mostrar precio total del combo (se dividirá al crear el TM)
      const pd = document.getElementById('tmPrecioDisplay-' + idx);
      if (pd) {
        pd.innerHTML = '🎁 Combo multi-área: $' + d.precio +
          d.division.map(dv => {
            const ak = AREA_KEY_FROM_DIV(String(dv.area || dv.servicio || ''));
            return `<div style="font-size:11px;font-weight:600;color:var(--ink-soft);margin-top:3px;">• ${AREA_KEY_LABELS[ak]||ak}: $${dv.monto||0}</div>`;
          }).join('');
        pd.style.display = 'block';
      }
      const aviso = document.getElementById('tmPromoAviso');
      if (aviso) aviso.style.display = 'block';
      // FIX: actualizar botones de secuencia con TODAS las áreas del combo
      tmActualizarSecuenciaBtns();
      tmActualizarResumen();
      return; // no ejecutar el resto
    }

    // Promo simple (1 sola área) — flujo normal

    // FIX: si la promo tiene división multi-área, auto-detectar y llenar las áreas
    if (d.division && d.division.length > 0) {
      // Ordenar por monto descendente → área principal primero
      const divs = [...d.division].sort((a, b) => Number(b.monto||0) - Number(a.monto||0));

      // Llenar el área del slot actual con la primera división
      // Detectar área de la primera división
      const area1Key = AREA_KEY_FROM_DIV(String(divs[0].area || divs[0].servicio || ''));
      const area1Label = AREA_KEY_LABELS[area1Key] || 'Cejas';
      const areaEl1 = document.getElementById('tmArea-' + idx);

      // Si no hay área seleccionada, llenarla desde la división
      if (areaEl1 && !svc.area) {
        areaEl1.value = area1Label;
        svc.area = area1Label;
        svc.areaKey = area1Key;
        // NO llamamos a onTmAreaChange aquí: resetearía el tipo a "normal" y borraría la promo.
        // Solo aseguramos que siga en modo promo con el selector de promos visible.
        svc.tipo = 'promo';
        svc.servicio = d.nombre;
        const _sn = document.getElementById('tmSvcNormal-' + idx); if (_sn) _sn.style.display = 'none';
        const _sp = document.getElementById('tmSvcPromo-' + idx);  if (_sp) _sp.style.display = 'block';
        tmActualizarSecuenciaBtns();
      }

      // FIX: si hay área seleccionada, encontrar la división que corresponde a esa área
      // y usar su monto (no el precio total del combo)
      let divMatchIdx = 0; // por defecto la primera división
      if (svc.areaKey) {
        const matchIdx = divs.findIndex(dv => AREA_KEY_FROM_DIV(String(dv.area || dv.servicio || '')) === svc.areaKey);
        if (matchIdx >= 0) divMatchIdx = matchIdx;
      }

      // Si hay más divisiones, crear slots adicionales automáticamente
      for (let i = 1; i < Math.min(divs.length, 3); i++) {
        const divArea = String(divs[i].area || divs[i].servicio || '');
        const areaKey = AREA_KEY_FROM_DIV(divArea);
        const areaLabel = AREA_KEY_LABELS[areaKey] || '';
        if (!areaLabel) continue;
        // Solo crear si no hay ya un slot con esta área y promo
        const yaExiste = _tmServicios.some(s => s.idx !== idx && s.areaKey === areaKey && s.tipo === 'promo');
        if (!yaExiste) {
          addServicioTM(); // crea nuevo slot
          const newIdx = _tmContador; // el último creado
          const newAreaEl = document.getElementById('tmArea-' + newIdx);
          if (newAreaEl) {
            newAreaEl.value = areaLabel;
            const newSvc = _tmServicios.find(s => s.idx === newIdx);
            if (newSvc) { newSvc.area = areaLabel; newSvc.areaKey = areaKey; }
            onTmAreaChange(newIdx);
            // Preseleccionar promo en el nuevo slot
            setTimeout(() => {
              setTipoTM(newIdx, 'promo');
              setTimeout(async () => {
                await cargarPromasTM(newIdx);
                const newPromoSel = document.getElementById('tmPromoSel-' + newIdx);
                if (newPromoSel) {
                  // Buscar la misma promo en el nuevo selector
                  for (const opt of newPromoSel.options) {
                    if (opt.value) {
                      try {
                        const pd2 = JSON.parse(opt.value);
                        if (pd2.nombre === d.nombre) { newPromoSel.value = opt.value; onTmPromoChange(newIdx); break; }
                      } catch(e) {}
                    }
                  }
                }
              }, 300);
            }, 100);
          }
        }
      }

      // Actualizar precio del slot actual con el monto de SU división específica
      const montoMio = Number(divs[divMatchIdx].monto || 0) || Number(divs[0].monto || 0);
      if (montoMio > 0 && svc) {
        svc.precio = montoMio;
        svc.precioNormal = montoMio;
      }

      // Mostrar info: área de esta staff y su precio
      const labelMio = AREA_KEY_LABELS[AREA_KEY_FROM_DIV(String(divs[divMatchIdx].area || divs[divMatchIdx].servicio || ''))] || area1Label;
      const pd = document.getElementById('tmPrecioDisplay-' + idx);
      if (pd) {
        pd.innerHTML = '🎁 <b>' + labelMio + '</b>: $' + montoMio +
          ' <span style="font-size:11px;color:var(--ink-soft);">(combo total: $' + d.precio + ')</span>';
        pd.style.display = 'block';
      }
    } else {
      // Promo sin división — precio normal viene de d.regular del sheet (sumaIndividual)
      if (svc) {
        svc.precio = d.precio;
        svc.precioNormal = d.regular || d.precio; // d.regular = sumaIndividual de Paquetes
      }
      const pd = document.getElementById('tmPrecioDisplay-' + idx);
      const tieneRegular = d.regular && Number(d.regular) !== Number(d.precio);
      if (pd) {
        pd.innerHTML = '🎁 $' + d.precio +
          (tieneRegular
            ? ' <span style="font-size:11px;color:var(--ink-soft);">(regular $' + d.regular + ')</span>'
            : ' <span style="font-size:11px;color:var(--warning,#b45309);">⚠️ Completar precio regular en Paquetes para recalcular con tarjeta</span>');
        pd.style.display = 'block';
      }
    }

    // Mostrar aviso promos
    const aviso = document.getElementById('tmPromoAviso');
    if (aviso) aviso.style.display = 'block';
    tmActualizarResumen();
  }

  function tmActualizarResumen() {
    const validos = _tmServicios.filter(s => s.servicio && (s.area || (s._isComboMultiArea && s._comboAreas && s._comboAreas.length)));
    const resumen = document.getElementById('tmResumenAreas');
    if (!resumen) return;
    if (validos.length === 0) { resumen.style.display = 'none'; return; }
    const total = validos.reduce((s, v) => s + v.precio, 0);
    const totalNormal = validos.reduce((s, v) => s + v.precioNormal, 0);
    const tienePromo = validos.some(v => v.tipo === 'promo');
    resumen.style.display = 'block';
    resumen.innerHTML = validos.map(v => {
      const etq = (v._isComboMultiArea && v._comboAreas && v._comboAreas.length)
        ? ('🎁 ' + v.servicio)
        : ((v.area ? v.area + ' · ' : '') + v.servicio);
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line);">
        <span>${etq}</span>
        <span style="font-weight:800;color:var(--accent);">$${v.precio}</span>
      </div>`;
    }).join('') +
    `<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;">
      <span style="font-size:13px;font-weight:800;">Total</span>
      <span style="font-size:15px;font-weight:800;color:var(--ink);">$${total}${tienePromo ? ' <span style="font-size:10px;color:var(--ink-soft);">(regular $' + totalNormal + ')</span>' : ''}</span>
    </div>`;
  }

  function tmActualizarSecuenciaBtns() {
    const container = document.getElementById('tmSecuenciaBtns');
    if (!container) return;
    // Collect areas from slots AND from _comboAreas of multi-area combos
    const areaSet = new Set();
    _tmServicios.forEach(s => {
      if (s.areaKey) areaSet.add(s.areaKey);
      // For combos: also add all areas from _comboAreas
      if (s._isComboMultiArea && s._comboAreas) {
        s._comboAreas.forEach(ca => { if (ca.area) areaSet.add(ca.area); });
      }
    });
    const areas = [...areaSet];
    const LABELS = { cejas:'<svg class=\"nx-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\"><path d=\"M11.4,12.2l-6.5,2.4c-.9.3-2-.1-2.3-1.1l-.5-1.9c-.1-.3,0-.7.4-.8l8.4-2.7c1.7-.4,3.6-.3,5.3.2s2.3.9,3.2,1.6,1.8,1.8,2.4,2.9.1.6-.1.8-.5.2-.8,0c-2.7-2-6.3-2.6-9.5-1.5Z\"/></svg>', depilacion:'Depilación', pestanas:'Pestañas', retiro_lifting:'Lifting/Retiro', facial:'Facial' };
    container.innerHTML = areas.map(a =>
      `<button onclick="addAreaSecuencia('${a}')" style="padding:8px 14px;background:var(--bg-card);border:1.5px solid var(--line);border-radius:var(--radius-pill);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">+ ${LABELS[a]||a}</button>`
    ).join('');
    if (areas.length === 0) container.innerHTML = '<span style="font-size:12px;color:var(--ink-faint);">Primero agregá servicios</span>';
  }

  // Build TM areas from form - expands combo multi-area promos into individual areas
  function buildTMAreasFromForm() {
    const result = [];
    _tmServicios.filter(s => s.servicio).forEach(s => {
      if (s._isComboMultiArea && s._comboAreas && s._comboAreas.length > 0) {
        // Combo multi-área: expandir en slots individuales por área
        s._comboAreas.forEach(ca => {
          result.push({
            tentativo:    ca.tentativo || s.servicio,
            area:         ca.area,
            precio:       ca.precio,
            precioNormal: ca.precioNormal || ca.precio,
            tipo:         'promo'
          });
        });
      } else if (s.area) {
        // Servicio simple o promo de 1 área
        result.push({
          tentativo:    s.servicio,
          area:         s.areaKey,
          precio:       s.precio,
          precioNormal: s.precioNormal,
          tipo:         s.tipo
        });
      }
    });
    return result;
  }
  window.buildTMAreasFromForm = buildTMAreasFromForm;
  window.initFormTM = initFormTM;
  window.addServicioTM = addServicioTM;
  window.quitarServicioTM = quitarServicioTM;
  window.setTipoTM = setTipoTM;
  window.onTmAreaChange = onTmAreaChange;
  window.onTmServicioChange = onTmServicioChange;
  window.onTmPromoChange = onTmPromoChange;
  window.cargarPromasTM = cargarPromasTM;

  function seleccionarTipoArrival(tipo) {
    const labels = {
      multi:  { icon: '🎯', text: 'Multi-servicios', color: 'var(--ink)', bg: 'rgba(0,0,0,0.08)' },
      normal: { icon: '🛠', text: 'Servicio normal', color: 'var(--accent)', bg: 'var(--accent-bg, #ede9fe)' },
      promo:  { icon: '🎁', text: 'Promo normal',    color: '#b45309',      bg: 'var(--warning-bg)' }
    };
    const l = labels[tipo];

    // Mostrar confirmación animada
    const confirm = document.getElementById('arrTipoConfirm');
    if (confirm) {
      confirm.style.display = 'block';
      confirm.style.background = l.bg;
      confirm.style.color = l.color;
      confirm.textContent = '✓ ' + l.icon + ' ' + l.text + ' seleccionado';
    }

    // Esperar 600ms para que la staff vea la confirmación, luego abrir formulario
    setTimeout(() => {
      window._arrTipo = tipo;
      document.getElementById('arrTipoSelector').style.display = 'none';
      document.getElementById('arrFormNormal').style.display = tipo === 'normal' ? 'block' : 'none';
      document.getElementById('arrFormPromo').style.display  = tipo === 'promo'  ? 'block' : 'none';
      document.getElementById('arrFormMulti').style.display  = tipo === 'multi'  ? 'block' : 'none';
      if (tipo === 'normal') loadServicesForArea();
      if (tipo === 'multi')  loadServicesForAreaMulti();
      if (tipo === 'promo')  resetArrivalExtras();
    }, 600);
  }
  window.seleccionarTipoArrival = seleccionarTipoArrival;

  function loadServicesForAreaMulti() {
    const area = document.getElementById('arrAreaMulti')?.value || 'Cejas';
    const _areaMapSvcMulti = { 'Cejas':'cejas','Depilación':'depilacion','Pestañas':'pestanas','Lifting / Retiro':'retiro_lifting','Facial':'facial' };
    const catKey = _areaMapSvcMulti[area] || 'cejas';
    const sel = document.getElementById('arrServiceMulti');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar servicio...</option>';
    (CATALOGO[catKey] || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ nombre: s.name, precio: s.price, area: catKey });
      opt.textContent = s.name + ' — $' + s.price;
      sel.appendChild(opt);
    });
  }

  function onArrServiceChangeMulti() {
    const sel = document.getElementById('arrServiceMulti');
    const priceDiv = document.getElementById('arrServicePriceDisplayMulti');
    if (sel && sel.value) {
      const d = JSON.parse(sel.value);
      priceDiv.textContent = '💵 Precio: $' + d.precio;
      priceDiv.style.display = 'block';
    } else if (priceDiv) {
      priceDiv.style.display = 'none';
    }
  }
  window.loadServicesForAreaMulti  = loadServicesForAreaMulti;
  window.onArrServiceChangeMulti   = onArrServiceChangeMulti;
  let _numServiciosAdicionales = 0;

  function agregarServicioAdicional() {
    if (_numServiciosAdicionales >= 4) {
      alert('Máximo 4 servicios adicionales (5 en total)');
      return;
    }
    _numServiciosAdicionales++;
    const idx = _numServiciosAdicionales;
    const container = document.getElementById('serviciosAdicionalesContainer');

    const slot = document.createElement('div');
    slot.id = 'adicionalSlot-' + idx;
    slot.style.cssText = 'background:var(--bg-card);border:1.5px solid var(--line);border-radius:16px;padding:14px;margin-top:10px;';

    slot.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:13px;font-weight:800;color:var(--ink);">Servicio adicional ${idx}</span>
        <button onclick="quitarServicioAdicional(${idx})" style="background:var(--error-bg,#fee2e2);color:#dc2626;border:none;border-radius:100px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">✕ Quitar</button>
      </div>

      <!-- Tipo: Normal o Promo -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <button id="btnNormal-${idx}" onclick="setTipoAdicional(${idx},'normal')" style="padding:9px;border-radius:10px;border:2px solid var(--accent);background:var(--accent);color:white;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">🛠 Normal</button>
        <button id="btnPromo-${idx}" onclick="setTipoAdicional(${idx},'promo')" style="padding:9px;border-radius:10px;border:2px solid var(--line);background:var(--bg);color:var(--ink-soft);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">🎁 Promo</button>
      </div>

      <!-- Área -->
      <div class="input-group" style="margin-bottom:8px;">
        <label style="font-size:11px;">Área</label>
        <select id="areaAdicional-${idx}" onchange="loadServicesAdicional(${idx})" style="font-size:13px;">
          <option value="">Seleccionar área...</option>
          <option value="cejas">Cejas</option>
          <option value="depilacion">Depilación</option>
          <option value="pestanas">Pestañas</option>
          <option value="retiro_lifting">Lifting / Retiro</option>
          <option value="facial">Facial</option>
        </select>
      </div>

      <!-- Servicio (normal) -->
      <div id="servicioNormalBox-${idx}" class="input-group" style="margin-bottom:4px;">
        <label style="font-size:11px;">Servicio tentativo</label>
        <select id="servicioAdicional-${idx}" style="font-size:13px;">
          <option value="">Primero seleccioná el área</option>
        </select>
        <div id="precioAdicional-${idx}" style="display:none;margin-top:6px;padding:8px;background:var(--bg);border-radius:10px;font-size:12px;font-weight:700;color:var(--accent);"></div>
      </div>

      <!-- Promo -->
      <div id="servicioPromoBox-${idx}" style="display:none;" class="input-group">
        <label style="font-size:11px;">Promo</label>
        <select id="promoAdicional-${idx}" onchange="onPromoAdicionalChange(${idx})" style="font-size:13px;">
          <option value="">Seleccionar promo...</option>
        </select>
        <div id="precioPromoAdicional-${idx}" style="display:none;margin-top:6px;padding:8px;background:var(--bg);border-radius:10px;font-size:12px;font-weight:700;color:var(--accent);"></div>
      </div>
    `;

    container.appendChild(slot);

    // Inicializar tipo como "normal"
    slot.dataset.tipo = 'normal';

    // Cargar promos activas en el select de promo
    const promoSel = document.getElementById('promoAdicional-' + idx);
    if (promoSel && PROMOS && PROMOS.length > 0) {
      PROMOS.filter(p => p.active).forEach(p => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ nombre: p.name, precio: p.price, regular: p.regular, id: p.id });
        opt.textContent = p.name + ' — $' + p.price;
        promoSel.appendChild(opt);
      });
    }

    // Listener para select de servicio normal
    document.getElementById('servicioAdicional-' + idx).addEventListener('change', function() {
      const priceDiv = document.getElementById('precioAdicional-' + idx);
      if (this.value) {
        const d = JSON.parse(this.value);
        priceDiv.textContent = '💵 Precio: $' + d.precio;
        priceDiv.style.display = 'block';
      } else {
        priceDiv.style.display = 'none';
      }
    });
  }

  function setTipoAdicional(idx, tipo) {
    const slot = document.getElementById('adicionalSlot-' + idx);
    slot.dataset.tipo = tipo;
    const btnN = document.getElementById('btnNormal-' + idx);
    const btnP = document.getElementById('btnPromo-' + idx);
    const boxN = document.getElementById('servicioNormalBox-' + idx);
    const boxP = document.getElementById('servicioPromoBox-' + idx);
    if (tipo === 'normal') {
      btnN.style.background = 'var(--accent)'; btnN.style.color = 'white'; btnN.style.borderColor = 'var(--accent)';
      btnP.style.background = 'var(--bg)'; btnP.style.color = 'var(--ink-soft)'; btnP.style.borderColor = 'var(--line)';
      boxN.style.display = 'block';
      boxP.style.display = 'none';
    } else {
      btnP.style.background = 'var(--accent)'; btnP.style.color = 'white'; btnP.style.borderColor = 'var(--accent)';
      btnN.style.background = 'var(--bg)'; btnN.style.color = 'var(--ink-soft)'; btnN.style.borderColor = 'var(--line)';
      boxP.style.display = 'block';
      boxN.style.display = 'none';
      // Cargar promos al momento de cambiar a tipo promo
      cargarPromasEnSlot(idx);
    }
  }

  function cargarPromasEnSlot(idx) {
    const promoSel = document.getElementById('promoAdicional-' + idx);
    if (!promoSel) return;
    const promosActivas = (PROMOS || []).filter(p => p.active);
    if (promosActivas.length === 0) {
      // Intentar cargar si aún no están disponibles
      ensurePromosLoaded().then(() => {
        const pa = (PROMOS || []).filter(p => p.active);
        promoSel.innerHTML = '<option value="">Seleccionar promo...</option>';
        pa.forEach(p => {
          const opt = document.createElement('option');
          opt.value = JSON.stringify({ nombre: p.name, precio: p.price, regular: p.regular, id: p.id });
          opt.textContent = p.name + ' — $' + p.price;
          promoSel.appendChild(opt);
        });
      });
      return;
    }
    promoSel.innerHTML = '<option value="">Seleccionar promo...</option>';
    promosActivas.forEach(p => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ nombre: p.name, precio: p.price, regular: p.regular, id: p.id });
      opt.textContent = p.name + ' — $' + p.price;
      promoSel.appendChild(opt);
    });
  }

  async function loadServicesAdicional(idx) {
    const area = document.getElementById('areaAdicional-' + idx)?.value;
    const sel  = document.getElementById('servicioAdicional-' + idx);
    if (!area || !sel) return;

    const servicios = CATALOGO[area] || [];
    sel.innerHTML = '<option value="">Seleccionar servicio...</option>';
    servicios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ nombre: s.name, precio: s.price, area });
      opt.textContent = s.name + ' — $' + s.price;
      sel.appendChild(opt);
    });

    // Si estamos en modo promo, recargar promos también
    const slot = document.getElementById('adicionalSlot-' + idx);
    if (slot?.dataset.tipo === 'promo') cargarPromasEnSlot(idx);
  }

  function onPromoAdicionalChange(idx) {
    const sel = document.getElementById('promoAdicional-' + idx);
    const priceDiv = document.getElementById('precioPromoAdicional-' + idx);
    if (sel.value) {
      const d = JSON.parse(sel.value);
      priceDiv.textContent = '🎁 Promo: $' + d.precio + ' (regular $' + d.regular + ')';
      priceDiv.style.display = 'block';
    } else {
      priceDiv.style.display = 'none';
    }
  }

  function quitarServicioAdicional(idx) {
    const slot = document.getElementById('adicionalSlot-' + idx);
    if (slot) slot.remove();
    // Reajustar contador
    const remaining = document.querySelectorAll('[id^="adicionalSlot-"]').length;
    _numServiciosAdicionales = remaining;
  }

  function getServiciosAdicionalesData() {
    const slots = document.querySelectorAll('[id^="adicionalSlot-"]');
    const result = [];
    slots.forEach(slot => {
      const idx = slot.id.replace('adicionalSlot-', '');
      const tipo = slot.dataset.tipo || 'normal';
      const areaEl = document.getElementById('areaAdicional-' + idx);
      const area = areaEl ? areaEl.value : '';
      console.log('🔍 Slot', idx, '| tipo:', tipo, '| area:', area);
      if (!area) return;
      if (tipo === 'normal') {
        const selEl = document.getElementById('servicioAdicional-' + idx);
        const selVal = selEl ? selEl.value : '';
        console.log('  normal selVal:', selVal);
        if (!selVal) return;
        try {
          const d = JSON.parse(selVal);
          result.push({ tipo: 'normal', area, nombre: d.nombre, precio: d.precio });
        } catch(e) { console.error('Error parsing normal:', e); }
      } else {
        const selEl = document.getElementById('promoAdicional-' + idx);
        const selVal = selEl ? selEl.value : '';
        console.log('  promo selVal:', selVal);
        if (!selVal) return;
        try {
          const d = JSON.parse(selVal);
          result.push({ tipo: 'promo', area, nombre: d.nombre, precio: d.precio, regular: d.regular });
        } catch(e) { console.error('Error parsing promo:', e); }
      }
    });
    console.log('📦 serviciosAdicionales resultado:', result.length, result);
    return result;
  }

  // ── buildAreasMultiTM ────────────────────────────────────────────────────
  // Función ÚNICA que construye el array de áreas para crearTicketMulti.
  // Fuente de verdad: siempre llama a esta función, nunca construyas areasMulti inline.
  //
  // Reglas:
  //   - tipo='multi'  → área 1 = selector principal, áreas 2-N = adicionales
  //   - tipo='promo'  → área 1 = promo 1 (con área deducida de su división mayor),
  //                     área 2-N = promasExtra + adicionales
  //   - tipo='normal' con adicionales → área 1 = servicio normal, áreas 2-N = adicionales
  //
  // Para promos: el área se deduce de la división de mayor monto (NO del areaKey del form).
  // Función global para detectar areaKey desde texto de área/servicio
  function AREA_KEY_FROM_DIV(raw) {
    // Normalizar: quitar diacríticos via NFD + strip non-ASCII + lowercase
    let s = String(raw || '');
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e) {}
    s = s.replace(/[^a-zA-Z0-9 ]/g, ' ').toLowerCase().trim();
    // Si ya es una clave de área exacta, devolverla directo
    if (s === 'facial' || s === 'cejas' || s === 'depilacion' || s === 'pestanas' || s === 'retiro_lifting') return s;
    if (s.includes('facial') || s.includes('hidra') || s.includes('limpiez') || s.includes('derma') ||
        s.includes('skin') || s.includes('peeling') || s.includes('glow') || s.includes('dermapla') ||
        s.includes('microneedl') || s.includes('punto de rubi')) return 'facial';
    if (s.includes('depil') || s.includes('bigote') || s.includes('bikini')) return 'depilacion';
    if (s.includes('lifting') || s.includes('retiro')) return 'cejas';
    if (s.includes('pest')) return 'pestanas';
    return 'cejas';
  }
  window.AREA_KEY_FROM_DIV = AREA_KEY_FROM_DIV;

  // Para servicios normales: el área viene del selector de área.
  // ────────────────────────────────────────────────────────────────────────────
  function buildAreasMultiTM(tipo, areaKey, servicio, precio, promo) {
    // AREA_KEY_FROM_DIV ahora es función global
    {
    };

    const getPromoArea = function(p) {
      if (!p || !p.division || p.division.length === 0) {
        const nameArea = AREA_KEY_FROM_DIV(p ? (p.name || '') : '');
        return nameArea || areaKey || 'cejas';
      }
      const sorted = [...p.division].sort((a, b) => Number(b.monto||0) - Number(a.monto||0));
      return AREA_KEY_FROM_DIV(sorted[0].area || sorted[0].servicio || '');
    };

    const areas = [];

    // Una promo se PARTE en una área por cada parte de su división (cejas, pestañas, ...),
    // cada una con su servicio y su monto. Así Mikaela asigna cada área a la chica correcta
    // y ve el área real con su precio — no el nombre de la promo con el total.
    const pushAreasDePromo = function(p) {
      if (!p) return;
      const promoPrice   = Number(p.price || 0);
      const promoRegular = Number(p.regular || p.price || 0);
      const divs = (p.division && p.division.length) ? p.division : null;
      if (!divs) {
        // Promo sin división detallada → una sola área (comportamiento anterior)
        areas.push({ tentativo: p.name, area: getPromoArea(p), precio: promoPrice,
                     precioNormal: promoRegular, tipo: 'promo' });
        return;
      }
      // MODELO "una promo = un ticket": agrupar las partes por ÁREA real. Las partes de la
      // MISMA área (ej. Combo 7: piernas+bikini+axilas = depilación) van a UN SOLO slot — no a
      // slots separados que se duplicaban al finalizar (bug $57+$26+$5=$88). El precio del combo
      // se reparte entre los GRUPOS (no las partes) para que sumen EXACTO el total. Los
      // sub-servicios se ven en el desglose leyéndolos del catálogo por el nombre de la promo.
      const _partes = divs.filter(function(d) { return Number(d.monto || 0) > 0; });
      const _grupos = [];
      const _idxArea = {};
      _partes.forEach(function(d) {
        const ak = AREA_KEY_FROM_DIV(d.realArea || d.area || d.servicio || '');
        if (_idxArea[ak] === undefined) { _idxArea[ak] = _grupos.length; _grupos.push({ area: ak, monto: 0 }); }
        _grupos[_idxArea[ak]].monto += Number(d.monto || 0);
      });
      const _sumaGrupos = _grupos.reduce(function(a, g) { return a + g.monto; }, 0);
      let _accP = 0, _accR = 0;
      _grupos.forEach(function(g, idx) {
        const frac  = _sumaGrupos > 0 ? g.monto / _sumaGrupos : 1 / _grupos.length;
        let precioParte, regularParte;
        if (idx === _grupos.length - 1) {
          precioParte  = Math.round((promoPrice   - _accP) * 100) / 100;   // resto exacto
          regularParte = Math.round((promoRegular - _accR) * 100) / 100;
        } else {
          precioParte  = Math.round(frac * promoPrice   * 100) / 100; _accP += precioParte;
          regularParte = Math.round(frac * promoRegular * 100) / 100; _accR += regularParte;
        }
        areas.push({
          tentativo:    p.name,            // SIEMPRE el nombre de la promo (cobro + desglose por catálogo)
          area:         g.area,
          precio:       precioParte,
          precioNormal: regularParte,
          tipo:         'promo'
        });
      });
    };

    if (tipo === 'promo') {
      // Área 1: primera promo (partida por su división)
      const promo1 = _arrPromos.find(p => p !== null);
      if (promo1) pushAreasDePromo(promo1);
      // Promos adicionales (cada una partida por su división)
      _arrPromos.filter(p => p !== null).slice(1).forEach(pushAreasDePromo);
    } else {
      // tipo=multi o tipo=normal: área 1 = servicio/promo del selector principal
      if (promo) {
        pushAreasDePromo(promo);
      } else if (servicio) {
        areas.push({
          tentativo:    servicio,
          area:         areaKey,
          precio:       Number(precio || 0),
          precioNormal: Number(precio || 0),
          tipo:         'normal'
        });
      }
    }

    // Áreas adicionales (normales o promo) — siempre al final
    getServiciosAdicionalesData().forEach(function(a) {
      areas.push({
        tentativo:    a.nombre,
        area:         String(a.area || AREA_KEY_FROM_DIV(a.nombre) || 'cejas').toLowerCase(),
        precio:       Number(a.precio || 0),
        precioNormal: Number(a.regular || a.precio || 0),
        tipo:         a.tipo || 'normal'
      });
    });

    return areas;
  }
  window.buildAreasMultiTM = buildAreasMultiTM;


  function toggleServiceSelector() {
    const box = document.getElementById('serviceSelectorBox');
    const area = document.getElementById('arrArea')?.value;
    
    if (!area) {
      alert('Primero seleccioná el área');
      document.getElementById('arrArea').focus();
      return;
    }
    
    if (box.style.display === 'none') {
      box.style.display = 'block';
      loadServicesForArea();
    } else {
      box.style.display = 'none';
    }
  }
  
  // Cuando seleccionen un servicio, mostrar el precio
  function onServiceSelectChange() {
    const select = document.getElementById('arrServiceSelect');
    const priceDiv = document.getElementById('arrServicePrice');
    
    if (select.value) {
      const data = JSON.parse(select.value);
      priceDiv.textContent = `💵 Total: $${data.precio}`;
      priceDiv.style.display = 'block';
    } else {
      priceDiv.style.display = 'none';
    }
  }
  
  // Confirmar asignación de servicio
  async function confirmServiceAssignment() {
    const select = document.getElementById('arrServiceSelect');
    
    if (!select.value) {
      alert('Seleccioná un servicio primero');
      return;
    }
    
    const data = JSON.parse(select.value);
    const clientData = window.newArrivalData;
    
    if (!clientData) {
      alert('Error: No se encontró información de la clienta');
      return;
    }
    
    // Asignar servicio usando la función existente
    await handleAsignarServicioNormal(clientData.code, clientData.fullName, data.nombre, data.precio);
    
    // Cerrar selector
    document.getElementById('serviceSelectorBox').style.display = 'none';
    
    // Volver al home
    show('mikaelaHome');
  }

  // === DIRECTORIO DE CLIENTAS ===
  const CLIENT_DIRECTORY = [
    { key: 'sofia', code: 'C-0004', name: 'Sofía López', phone: '0999-456-789', isTop: true, visits: 5, lastVisit: '12/04' },
    { key: 'isabella', code: 'C-0007', name: 'Isabella Vera', phone: '0998-321-654', isTop: false, visits: 2, lastVisit: '05/04' },
    { key: 'carmen', code: 'C-0002', name: 'Carmen Molina', phone: '0997-111-222', isTop: true, visits: 8, lastVisit: '19/04' },
    { key: null, code: 'C-0001', name: 'Andrea Rivas', phone: '0996-333-444', isTop: false, visits: 3, lastVisit: '19/04' },
    { key: null, code: 'C-0003', name: 'Daniela Torres', phone: '0995-555-666', isTop: true, visits: 4, lastVisit: '19/04' },
    { key: null, code: 'C-0005', name: 'Valentina Núñez', phone: '0994-777-888', isTop: true, visits: 6, lastVisit: '19/04' },
    { key: null, code: 'C-0006', name: 'Gabriela Mendoza', phone: '0993-999-000', isTop: false, visits: 1, lastVisit: '15/04' },
    { key: null, code: 'C-0008', name: 'Paola Reyes', phone: '', isTop: false, visits: 1, lastVisit: '18/04' },
    { key: null, code: 'C-0009', name: 'Lucía Paredes', phone: '0991-222-333', isTop: false, visits: 1, lastVisit: '19/04' },
  ];

  async function renderClientDirectory() {
    // Cargar perfiles de clientas desde el servidor
    await loadClientProfiles();
    const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    const list = document.getElementById('clientDirectoryList');
    
    // Siempre recargar desde API (no usar cache para el directorio)
    list.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--ink-faint);"><div style="animation: pulse 1.5s infinite; font-size: 13px;">⏳ Cargando clientas...</div></div>';
    
    try {
      const result = await apiGet('getClientas');
      console.log('API getClientas response:', result);
      
      if (!result) {
        throw new Error('No se recibió respuesta del servidor');
      }
      
      if (result.error) {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger); font-size: 13px;">❌ Error del servidor: ' + result.error + '</div>';
        return;
      }
      
      if (result.success && result.clientas && result.clientas.length > 0) {
        console.log('Clientas recibidas:', result.clientas.length);
        CLIENT_DIRECTORY_CACHE = result.clientas
          .filter(c => {
            const hasCode = c.codigo && String(c.codigo).trim().length > 0;
            const hasName = c.nombre && String(c.nombre).trim().length > 1;
            console.log('Filtrando clienta:', c.codigo, c.nombre, 'hasCode:', hasCode, 'hasName:', hasName);
            return hasCode && hasName;
          })
          .map(c => ({
          key: String(c.codigo).toLowerCase().replace(/-/g, ''),
          code: String(c.codigo),
          name: String(c.nombre),
          phone: c.telefono ? String(c.telefono) : '',
          isTop: String(c.esTop || '').toLowerCase().includes('sí'),
          visits: Number(c.totalVisitas) || 0,
          lastVisit: c.ultimaVisita ? String(c.ultimaVisita) : '—',
          cedula: c.cedula ? String(c.cedula) : '',
          correo: c.correo ? String(c.correo) : ''
        }));
        console.log('Clientas después del filtro:', CLIENT_DIRECTORY_CACHE.length);
      } else {
        // Respuesta exitosa pero sin clientas
        CLIENT_DIRECTORY_CACHE = [];
      }
    } catch (err) {
      console.error('Error cargando clientas:', err);
      list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger); font-size: 13px;">❌ Error: ' + err.message + '<br><small style="color: var(--ink-soft); margin-top: 8px; display: block;">Verifica que el Apps Script esté activo</small></div>';
      return;
    }

    const filtered = search 
      ? CLIENT_DIRECTORY_CACHE.filter(c => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search))
      : [...CLIENT_DIRECTORY_CACHE];

    // Ordenar por primer apellido (segunda palabra del nombre)
    filtered.sort((a, b) => {
      const apellidoA = (a.name.trim().split(' ')[1] || a.name.trim()).toLowerCase();
      const apellidoB = (b.name.trim().split(' ')[1] || b.name.trim()).toLowerCase();
      return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
    });
    
    document.getElementById('clientCount').textContent = filtered.length;
    
    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--ink-faint); font-size: 13px;">No hay clientas registradas aún</div>';
      return;
    }

    // Privacidad: la staff ve el directorio solo por CÓDIGO (sin nombre ni teléfono)
    if (window.currentUser?.role === 'staff') {
      const porCodigo = [...filtered].sort((a, b) => String(a.code).localeCompare(String(b.code), 'es', { numeric: true }));
      list.innerHTML = porCodigo.map(c => `
        <div class="card" style="margin-bottom: 8px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="openClientProfile('${c.key}')">
            <div class="client-avatar ${c.isTop ? 'is-top' : ''}" style="flex-shrink: 0;">${String(c.code).replace(/[^0-9]/g,'').slice(-2) || '·'}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 15px;">${c.code}${c.isTop ? ' <span class="top-star">⭐</span>' : ''}</div>
              <div style="font-size: 11px; color: var(--ink-faint); font-weight: 500; margin-top: 2px;">${c.visits} visitas</div>
            </div>
            <span style="font-size: 16px; color: var(--ink-faint);">›</span>
          </div>
        </div>`).join('');
      return;
    }

    // Si hay búsqueda activa, mostrar lista plana sin acordeón
    if (search) {
      list.innerHTML = filtered.map(c => {
        const isCEO = window.currentUser?.role === 'admin' || window.currentUser?.role === 'ceo';
        return `
        <div class="card" style="margin-bottom: 8px; padding: 14px; position: relative;">
          <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="openClientProfile('${c.key}')">
            <div class="client-avatar ${c.isTop ? 'is-top' : ''}" style="flex-shrink: 0;">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 15px;">${c.name} ${c.isTop ? '<span class="top-star">⭐</span>' : ''}</div>
              <div style="font-size: 11px; color: var(--ink-faint); font-weight: 500; margin-top: 2px;">${c.code} · ${c.visits} visitas${c.phone ? ' · ' + c.phone : ''}</div>
            </div>
            <span style="font-size: 16px; color: var(--ink-faint);">›</span>
          </div>
          ${isCEO ? `<button onclick="event.stopPropagation(); editClientFromList('${c.key}')" style="position: absolute; top: 12px; right: 12px; padding: 6px 12px; background: var(--purple); color: white; border: none; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700; cursor: pointer;">✏️ Editar</button>` : ''}
        </div>`;
      }).join('');
      return;
    }

    // Agrupar por primera letra del apellido
    const grupos = {};
    const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    LETRAS.forEach(l => grupos[l] = []);

    filtered.forEach(c => {
      const apellido = (c.name.trim().split(' ')[1] || c.name.trim());
      let letra = apellido[0]?.toUpperCase() || '#';
      // Normalizar acentos: Á→A, É→E, etc.
      letra = letra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (grupos[letra]) grupos[letra].push(c);
      else { grupos['#'] = grupos['#'] || []; grupos['#'].push(c); }
    });

    const isCEO = window.currentUser?.role === 'admin' || window.currentUser?.role === 'ceo';

    list.innerHTML = LETRAS.map(letra => {
      const clientasLetra = grupos[letra] || [];
      const tiene = clientasLetra.length > 0;
      return `
        <div style="margin-bottom: 4px;">
          <div onclick="toggleLetra('${letra}')" style="
            display: flex; align-items: center; gap: 10px;
            padding: 10px 14px; cursor: pointer; border-radius: 12px;
            background: ${tiene ? 'var(--surface)' : 'transparent'};
            ${tiene ? 'box-shadow: 0 1px 4px rgba(0,0,0,0.06);' : ''}
            ${!tiene ? 'opacity: 0.3; pointer-events: none;' : ''}
          ">
            <div style="
              width: 32px; height: 32px; border-radius: 50%;
              background: ${tiene ? 'var(--accent)' : 'var(--line)'};
              color: ${tiene ? 'white' : 'var(--ink-faint)'};
              display: flex; align-items: center; justify-content: center;
              font-weight: 800; font-size: 14px; flex-shrink: 0;
            ">${letra}</div>
            <span style="font-weight: 700; font-size: 15px; color: var(--ink); flex: 1;">${tiene ? letra : letra}</span>
            ${tiene ? `<span style="font-size: 11px; color: var(--ink-faint); font-weight: 600;">${clientasLetra.length} clienta${clientasLetra.length !== 1 ? 's' : ''}</span>
            <span id="chevron-${letra}" style="font-size: 14px; color: var(--ink-faint); transition: transform 0.2s;">›</span>` : ''}
          </div>
          <div id="grupo-${letra}" style="display: none; padding: 0 4px;">
            ${clientasLetra.map(c => `
              <div class="card" style="margin: 4px 0; padding: 14px; position: relative;">
                <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="openClientProfile('${c.key}')">
                  <div class="client-avatar ${c.isTop ? 'is-top' : ''}" style="flex-shrink: 0;">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 15px;">${c.name} ${c.isTop ? '<span class="top-star">⭐</span>' : ''}</div>
                    <div style="font-size: 11px; color: var(--ink-faint); font-weight: 500; margin-top: 2px;">${c.code} · ${c.visits} visitas${c.phone ? ' · ' + c.phone : ''}</div>
                  </div>
                  <span style="font-size: 16px; color: var(--ink-faint);">›</span>
                </div>
                ${isCEO ? `<button onclick="event.stopPropagation(); editClientFromList('${c.key}')" style="position: absolute; top: 12px; right: 12px; padding: 6px 12px; background: var(--purple); color: white; border: none; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700; cursor: pointer;">✏️ Editar</button>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function toggleLetra(letra) {
    const grupo = document.getElementById('grupo-' + letra);
    const chevron = document.getElementById('chevron-' + letra);
    if (!grupo) return;
    const abierto = grupo.style.display !== 'none';
    grupo.style.display = abierto ? 'none' : 'block';
    if (chevron) chevron.style.transform = abierto ? '' : 'rotate(90deg)';
  }

  function filterClients() { renderClientDirectory(); }

  let isEditMode = false;
  let editingClientCode = null;

  function openEditClient() {
    const key = currentProfileClient;
    if (!key) return;
    
    const profile = CLIENT_PROFILES[key];
    if (!profile) return;
    
    // Buscar los datos completos de la clienta desde el cache
    const clientData = CLIENT_DIRECTORY_CACHE.find(c => c.key === key);
    if (!clientData) {
      alert('No se encontraron los datos de la clienta');
      return;
    }
    
    isEditMode = true;
    editingClientCode = clientData.code;
    
    // Cambiar título y botón
    document.getElementById('newClientModalTitle').textContent = 'Editar clienta';
    document.getElementById('saveClientBtn').textContent = 'Guardar cambios';
    
    // Cargar datos existentes
    const nameParts = profile.name.split(' ');
    document.getElementById('ncNombre').value = nameParts[0] || '';
    document.getElementById('ncApellido').value = nameParts.slice(1).join(' ') || '';
    document.getElementById('ncPhone').value = clientData.phone || '';
    document.getElementById('ncCedula').value = clientData.cedula || '';
    document.getElementById('ncEmail').value = clientData.correo || '';
    
    // Limpiar fichas antes de cargar los datos de esta clienta
    ['ncPestTallas','ncPestObs','ncFacEdad','ncFacSignos','ncFacEstado','ncFacAlergias','ncFacAntecedentes','ncFacObsExtra','ncObsCejas','ncObsDepil','ncObsPest','ncObsFacial'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['ncPestModelo','ncPestDiseno','ncFacBiotipo','ncFacFototipo','ncFacTipoPiel','ncFacHiper'].forEach(id => {
      const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
    document.getElementById('ncFacSexo').value = 'Femenino';
    
    // Observaciones por área (necesitamos cargar desde el servidor)
    loadClientDataForEdit(clientData.code);
    
    document.getElementById('ncCode').textContent = clientData.code;
    document.getElementById('newClientModal').classList.add('active');
  }
  
  function editClientFromList(key) {
    // Buscar los datos completos de la clienta desde el cache
    const clientData = CLIENT_DIRECTORY_CACHE.find(c => c.key === key);
    if (!clientData) {
      alert('No se encontraron los datos de la clienta');
      return;
    }
    
    isEditMode = true;
    editingClientCode = clientData.code;
    
    // Cambiar título y botón
    document.getElementById('newClientModalTitle').textContent = 'Editar clienta';
    document.getElementById('saveClientBtn').textContent = 'Guardar cambios';
    
    // Cargar datos existentes
    const nameParts = clientData.name.split(' ');
    document.getElementById('ncNombre').value = nameParts[0] || '';
    document.getElementById('ncApellido').value = nameParts.slice(1).join(' ') || '';
    document.getElementById('ncPhone').value = clientData.phone || '';
    document.getElementById('ncCedula').value = clientData.cedula || '';
    document.getElementById('ncEmail').value = clientData.correo || '';
    
    // Limpiar fichas antes de cargar los datos de esta clienta
    ['ncPestTallas','ncPestObs','ncFacEdad','ncFacSignos','ncFacEstado','ncFacAlergias','ncFacAntecedentes','ncFacObsExtra','ncObsCejas','ncObsDepil','ncObsPest','ncObsFacial'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['ncPestModelo','ncPestDiseno','ncFacBiotipo','ncFacFototipo','ncFacTipoPiel','ncFacHiper'].forEach(id => {
      const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
    document.getElementById('ncFacSexo').value = 'Femenino';
    
    // Observaciones por área (necesitamos cargar desde el servidor)
    loadClientDataForEdit(clientData.code);
    
    document.getElementById('ncCode').textContent = clientData.code;
    document.getElementById('newClientModal').classList.add('active');
  }
  
  async function loadClientDataForEdit(codigo) {
    try {
      // Cargar observaciones por area
      const result = await apiGet('getCliente', { codigo: codigo });
      if (result.success && result.cliente) {
        const c = result.cliente;
        document.getElementById('ncObsCejas').value = c.obsCejas || '';
        document.getElementById('ncObsDepil').value = c.obsDepilacion || '';
        document.getElementById('ncObsPest').value = c.obsPestanas || '';
        document.getElementById('ncObsFacial').value = c.obsFacial || '';
      }

      // Cargar ficha de pestañas activa
      const pestResult = await apiGet('getFichaPestanas', { codigo: codigo });
      if (pestResult.success && pestResult.fichas && pestResult.fichas.length > 0) {
        const fichaActiva = pestResult.fichas.find(f => String(f.activa).toLowerCase() === 'si' || String(f.activa).toLowerCase() === 'sí') || pestResult.fichas[0];
        if (fichaActiva) {
          document.getElementById('ncPestModelo').value = fichaActiva.modelo || '';
          document.getElementById('ncPestDiseno').value = fichaActiva.diseno || '';
          document.getElementById('ncPestTallas').value = fichaActiva.tallas || '';
          document.getElementById('ncPestObs').value = fichaActiva.observaciones || '';
        }
      }

      // Cargar ficha facial
      const facResult = await apiGet('getFichaFacial', { codigo: codigo });
      if (facResult.success && facResult.ficha) {
        const f = facResult.ficha;
        document.getElementById('ncFacBiotipo').value = f.biotipo || '';
        document.getElementById('ncFacEdad').value = f.edad || '';
        document.getElementById('ncFacSexo').value = f.sexo || '';
        document.getElementById('ncFacFototipo').value = f.fototipo || '';
        document.getElementById('ncFacTipoPiel').value = f.tipoPiel || '';
        document.getElementById('ncFacSignos').value = f.signosLesiones || '';
        document.getElementById('ncFacHiper').value = f.signosHiper || '';
        document.getElementById('ncFacEstado').value = f.estadoPiel || '';
        document.getElementById('ncFacAlergias').value = f.alergias || '';
        document.getElementById('ncFacAntecedentes').value = f.enfermedades || '';
        document.getElementById('ncFacObsExtra').value = f.obsExtra || '';
      }

    } catch (err) {
      console.error('Error cargando datos para editar:', err);
    }
  }

  function openNewClient() {
    isEditMode = false;
    editingClientCode = null;
    
    // Cambiar título y botón a modo nuevo
    document.getElementById('newClientModalTitle').textContent = 'Nueva clienta';
    document.getElementById('saveClientBtn').textContent = 'Registrar clienta completa';
    
    // Reset todos los campos de texto
    ['ncNombre','ncApellido','ncCedula','ncPhone','ncEmail','ncObsCejas','ncObsDepil','ncObsPest','ncObsFacial','ncPestTallas','ncPestObs','ncFacEdad','ncFacSignos','ncFacEstado','ncFacAlergias','ncFacAntecedentes','ncFacObsExtra','ncPigColor','ncPigAguja','ncPigObs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    
    // Reset todos los selects
    ['ncPestModelo','ncPestDiseno','ncFacBiotipo','ncFacFototipo','ncFacTipoPiel','ncFacHiper','ncPigTipo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
    
    document.getElementById('ncFacSexo').value = 'Femenino';
    document.getElementById('ncCode').textContent = 'C-' + String(CLIENT_DIRECTORY_CACHE.length + CLIENT_DIRECTORY.length + 1).padStart(4, '0');
    document.getElementById('newClientModal').classList.add('active');
  }

  async function saveNewClient() {
    const nombre = document.getElementById('ncNombre').value.trim();
    const apellido = document.getElementById('ncApellido').value.trim();
    if (!nombre || !apellido) { alert('Nombre y apellido son obligatorios'); return; }
    
    const fullName = nombre + ' ' + apellido;
    const cedula = document.getElementById('ncCedula').value.trim();
    const phone = document.getElementById('ncPhone').value.trim();
    const email = document.getElementById('ncEmail').value.trim();
    const pestModelo = document.getElementById('ncPestModelo').value;
    const facBiotipo = document.getElementById('ncFacBiotipo').value;

    const btn = document.querySelector('#newClientModal .btn-primary');
    btn.textContent = isEditMode ? 'Guardando cambios...' : 'Guardando...';
    btn.disabled = true;

    if (isEditMode) {
      // MODO EDICIÓN
      const postData = {
        codigo: editingClientCode,
        nombre: fullName,
        telefono: phone,
        cedula: cedula,
        correo: email,
        obsCejas: document.getElementById('ncObsCejas').value.trim(),
        obsDepilacion: document.getElementById('ncObsDepil').value.trim(),
        obsPestanas: document.getElementById('ncObsPest').value.trim(),
        obsFacial: document.getElementById('ncObsFacial').value.trim()
      };

      try {
        const result = await apiPost('updateClientaFull', postData);
        btn.textContent = 'Guardar cambios';
        btn.disabled = false;

        if (result.success) {
          // Guardar ficha de pestañas si se completó
          if (pestModelo) {
            try {
              await apiPost('addFichaPestanas', {
                codigo: editingClientCode,
                nombre: fullName,
                modelo: pestModelo,
                diseno: document.getElementById('ncPestDiseno').value || '—',
                tallas: document.getElementById('ncPestTallas').value.trim() || '—',
                obs: document.getElementById('ncPestObs').value.trim()
              });
            } catch(e) { console.error('Error guardando ficha pestanas:', e); }
          }

          // Guardar ficha facial si se completó
          if (facBiotipo) {
            try {
              await apiPost('updateFichaFacial', {
                codigo: editingClientCode,
                nombre: fullName,
                fecha: new Date().toLocaleDateString('es-EC', {day:'2-digit',month:'2-digit',year:'numeric'}),
                biotipo: facBiotipo,
                edad: document.getElementById('ncFacEdad').value || '',
                sexo: document.getElementById('ncFacSexo').value || '',
                fototipo: document.getElementById('ncFacFototipo').value || '',
                tipoPiel: document.getElementById('ncFacTipoPiel').value || '',
                signosLesiones: document.getElementById('ncFacSignos').value.trim() || '',
                signosHiper: document.getElementById('ncFacHiper').value || 'Ninguna',
                estadoPiel: document.getElementById('ncFacEstado').value.trim() || '',
                alergias: document.getElementById('ncFacAlergias').value.trim() || 'Ninguna',
                obsExtra: document.getElementById('ncFacAntecedentes').value.trim() || ''
              });
            } catch(e) { console.error('Error guardando ficha facial:', e); }
          }

          closeModal();
          await renderClientDirectory();
          await loadClientProfiles();
          if (currentProfileClient) {
            openClientProfile(currentProfileClient);
          }
          alert('Clienta actualizada correctamente');
        } else {
          alert('Error al actualizar: ' + (result.message || result.error || 'Intenta de nuevo'));
        }
      } catch (err) {
        btn.textContent = 'Guardar cambios';
        btn.disabled = false;
        const reintentar = confirm('⚠️ Error al guardar: ' + (err.message || 'Load failed') + '\n\nTus datos NO se perdieron.\n¿Querés intentar guardar de nuevo?');
        if (reintentar) saveNewClient();
      }
    } else {
      // MODO NUEVO (código original)

    const postData = {
      nombre: fullName,
      telefono: phone,
      cedula: cedula,
      correo: email,
      observaciones: '',
      obsCejas: document.getElementById('ncObsCejas').value.trim(),
      obsDepilacion: document.getElementById('ncObsDepil').value.trim(),
      obsPestanas: document.getElementById('ncObsPest').value.trim(),
      obsFacial: document.getElementById('ncObsFacial').value.trim()
    };

    // Ficha de pestañas
    if (pestModelo) {
      postData.pestModelo = pestModelo;
      postData.pestDiseno = document.getElementById('ncPestDiseno').value || '—';
      postData.pestTallas = document.getElementById('ncPestTallas').value.trim() || '—';
      postData.pestObs = document.getElementById('ncPestObs').value.trim();
    }

    // Ficha facial
    if (facBiotipo) {
      postData.facBiotipo = facBiotipo;
      postData.facEdad = document.getElementById('ncFacEdad').value;
      postData.facSexo = document.getElementById('ncFacSexo').value;
      postData.facFototipo = document.getElementById('ncFacFototipo').value;
      postData.facTipoPiel = document.getElementById('ncFacTipoPiel').value;
      postData.facSignos = document.getElementById('ncFacSignos').value.trim();
      postData.facHiper = document.getElementById('ncFacHiper').value;
      postData.facEstado = document.getElementById('ncFacEstado').value.trim();
      postData.facAlergias = document.getElementById('ncFacAlergias').value.trim();
      postData.facAntecedentes = document.getElementById('ncFacAntecedentes').value.trim();
      postData.facObsExtra = document.getElementById('ncFacObsExtra').value.trim();
    }

    try {
      const result = await apiPost('addClienta', postData);
      btn.textContent = 'Registrar clienta completa';
      btn.disabled = false;

      if (result.success) {
        const codigoCliente = result.codigo;
        
        // Guardar ficha de Cejas Efecto Polvo si tiene datos
        const pigTipo = document.getElementById('ncPigTipo').value;
        if (pigTipo) {
          try {
            await apiPost('addFichaCejasPigmento', {
              codigo: codigoCliente,
              color: document.getElementById('ncPigColor').value.trim(),
              aguja: document.getElementById('ncPigAguja').value.trim(),
              tipoSesion: pigTipo,
              observaciones: document.getElementById('ncPigObs').value.trim(),
              responsable: window.currentUser?.name || 'Admin'
            });
          } catch (err) {
            console.error('Error guardando ficha pigmento:', err);
          }
        }
        
        // Agregar al cache local
        CLIENT_DIRECTORY_CACHE.push({
          key: codigoCliente.toLowerCase().replace(/-/g, ''),
          code: codigoCliente,
          name: fullName,
          phone: phone,
          isTop: false,
          visits: 0,
          lastVisit: '—',
          cedula: cedula,
          correo: email
        });
        closeModal();
        renderClientDirectory();
        alert('✓ ' + fullName + ' registrada como ' + codigoCliente);
      } else {
        alert('Error al guardar: ' + (result.message || result.error || 'Intenta de nuevo'));
      }
    } catch (err) {
      btn.textContent = 'Registrar clienta completa';
      btn.disabled = false;
      const reintentar = confirm('⚠️ Error al guardar: ' + (err.message || 'Load failed') + '\n\nTus datos NO se perdieron.\n¿Querés intentar guardar de nuevo?');
      if (reintentar) saveNewClient();
    }
    } // FIN MODO NUEVO
  }

  // === RETIRO DE PESTAÑAS: GRATIS SI ES DE ROSA AGUILERA ===
  // Esta lógica se aplica en los servicios SP025 (Retiro de pestañas), SP031 (Retiro de lifting)
  // Si la clienta tiene historial de pestañas en Rosa Aguilera → $0
  // Si no tiene historial (viene de otro local) → $10
  function getRetiroPrice(clientKey) {
    const client = CLIENT_PROFILES[clientKey];
    if (!client) return 10;
    const pestHistory = client.pestanas?.history || [];
    // Si tiene al menos 1 servicio de pestañas en nuestro historial, es de Rosa Aguilera
    const hasOurService = pestHistory.some(h => 
      !h.service.includes('Retiro') && !h.service.includes('Lifting')
    );
    return hasOurService ? 0 : 10;
  }

  // === PAGOS Y CIERRE SEMANAL ===
  const PAY_STAFF = [
    { name: 'María', area: 'Cejas', comm: '30%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
    { name: 'Keyla', area: 'Cejas', comm: '30%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
    { name: 'Lesly', area: 'Cejas', comm: '30%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
    { name: 'Yadira', area: 'Pestañas', comm: '30%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
    { name: 'Diana', area: 'Pestañas', comm: '30%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
    { name: 'Laura', area: 'Facial', comm: '40%', acumulado: 0, servicios: 0, facturado: 0, paid: false, dias: [] },
  ];

  const PAY_HISTORY = [];

  let currentWeekClosed = false;

  async function renderPayments() {
    const list = document.getElementById('payStaffList');
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--ink-faint); font-size: 13px;">⏳ Cargando comisiones...</div>';
    
    // Cargar comisiones reales del Sheet
    let staffData = PAY_STAFF;
    try {
      const result = await apiGet('getComisiones');
      if (result.success && result.comisiones && result.comisiones.length > 0) {
        staffData = result.comisiones.map(c => ({
          name: c.chica,
          area: c.area,
          comm: c.porcentaje || '30%',
          acumulado: Number(c.comision) || 0,
          servicios: Number(c.servicios) || 0,
          facturado: Number(c.facturado) || 0,
          paid: false,
          dias: []
        }));
      }
    } catch (err) { console.error('Error comisiones:', err); }

    // Cargar historial de cierres semanales desde CierresSemana
    let histData = PAY_HISTORY;
    try {
      const result2 = await apiGet('getCierresSemana');
      if (result2.success && result2.cierres && result2.cierres.length > 0) {
        // Agrupar por semana
        const weeks = {};
        result2.cierres.forEach(c => {
          const key = String(c.semana || '');
          if (!weeks[key]) {
            weeks[key] = { week: key, dates: (c.desde || '') + ' - ' + (c.hasta || ''), closed: c.fechaPago, total: 0, facturado: 0 };
          }
          weeks[key].total += Number(c.comision) || 0;
          weeks[key].facturado += Number(c.facturado) || 0;
        });
        histData = Object.values(weeks).reverse();
      }
    } catch (err) { console.error('Error cierres:', err); }

    const totalComm = staffData.reduce((s, p) => s + (p.paid ? 0 : p.acumulado), 0);
    
    list.innerHTML = staffData.map((p, i) => `
      <div class="card" style="margin-bottom: 10px; padding: 16px; ${p.paid ? 'opacity: 0.5;' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 16px; font-weight: 800;">${p.name}</span>
              <span style="font-size: 11px; color: var(--ink-faint); font-weight: 500;">${p.area} · ${p.comm}</span>
              ${p.paid ? '<span style="background: var(--success-bg); color: var(--success); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-pill);">✓ Pagado</span>' : ''}
            </div>
            <div style="font-size: 12px; color: var(--ink-soft); font-weight: 500;">${p.servicios} servicios · Facturó $${p.facturado}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 22px; font-weight: 800; color: ${p.paid ? 'var(--success)' : 'var(--accent-deep)'}; letter-spacing: -0.03em;">$${p.acumulado.toFixed(2)}</div>
          </div>
        </div>
        ${!p.paid && !currentWeekClosed ? `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button onclick="openPayIndividual(${i})" style="flex: 1; padding: 12px; background: var(--success); color: white; border: none; border-radius: var(--radius-pill); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">💰 Pagar</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Guardar staffData para pagos individuales
    window._payStaffData = staffData;
    
    // Historial
    const hist = document.getElementById('payHistory');
    hist.innerHTML = histData.map(h => `
      <div class="card" style="margin-bottom: 8px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 14px;">${h.week}</div>
            <div style="font-size: 11px; color: var(--ink-faint); font-weight: 500;">${h.dates} · cerrada ${h.closed}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: var(--danger);">-$${Number(h.total).toFixed(0)}</div>
            <div style="font-size: 10px; color: var(--ink-faint); font-weight: 500;">de $${Number(h.facturado).toFixed(0)}</div>
          </div>
        </div>
      </div>
    `).join('');

    if (currentWeekClosed) {
      document.getElementById('closeWeekBtn').textContent = '✓ Semana cerrada';
      document.getElementById('closeWeekBtn').style.background = 'var(--ink-faint)';
      document.getElementById('closeWeekBtn').disabled = true;
    }
  }

  function openPayIndividual(idx) {
    const p = (window._payStaffData || PAY_STAFF)[idx];
    window._payingIdx = idx;
    document.getElementById('payIndTitle').textContent = 'Pagar a ' + p.name;
    document.getElementById('payIndAmount').textContent = '$' + p.acumulado.toFixed(2);
    document.getElementById('payIndDetail').textContent = p.comm + ' sobre $' + p.facturado + ' · ' + p.servicios + ' servicios';
    document.getElementById('payIndDays').innerHTML = p.dias && p.dias.length > 0 
      ? p.dias.map(d => '<div style="display: flex; justify-content: space-between;"><span>' + d.dia + ' <span style="color: var(--ink-faint);">(' + d.serv + ' serv.)</span></span><span style="font-weight: 700;">$' + d.total.toFixed(2) + '</span></div>').join('')
      : '<div style="color: var(--ink-faint); font-size: 12px;">Desglose por día disponible en próxima versión</div>';
    document.getElementById('payIndividualModal').classList.add('active');
  }

  async function confirmPayIndividual() {
    const idx = window._payingIdx;
    const staffData = window._payStaffData || PAY_STAFF;
    const p = staffData[idx];
    
    try {
      await apiPost('pagoIndividual', {
        chica: p.name,
        semana: 'Semana actual'
      });
    } catch (err) { console.error(err); }

    p.paid = true;
    closeModal();
    renderPayments();
    alert('✓ ' + p.name + ' marcada como pagada.');
  }

  function openCloseWeek() {
    const staffData = window._payStaffData || PAY_STAFF;
    const unpaid = staffData.filter(p => !p.paid);
    const total = unpaid.reduce((s, p) => s + p.acumulado, 0);
    const weekNum = new Date().getWeekNumber ? new Date().getWeekNumber() : Math.ceil((new Date().getDate()) / 7) + 14;
    document.getElementById('closeWeekName').textContent = 'Semana ' + weekNum;
    document.getElementById('closeWeekTotal').textContent = '$' + total.toFixed(2);
    document.getElementById('closeWeekModal').classList.add('active');
  }

  async function confirmCloseWeek() {
    const now = new Date();
    const weekNum = Math.ceil(now.getDate() / 7) + 14;
    const semana = 'Semana ' + weekNum;
    const mes = now.toLocaleDateString('es-EC', { month: 'short' });
    const periodo = mes + ' ' + (now.getDate() - 6) + '-' + now.getDate();

    try {
      await apiPost('cierreSemanal', {
        semana: semana,
        periodo: periodo
      });
    } catch (err) { console.error(err); }

    currentWeekClosed = true;
    closeModal();
    renderPayments();
    alert('🔒 ' + semana + ' cerrada. Todas las chicas arrancan la próxima semana con saldo $0. El registro queda guardado en el historial del Sheet.');
  }

  // === FICHA FACIAL (crear/editar) ===
  function toggleChip(btn) {
    btn.classList.toggle('chip-active');
    if (btn.classList.contains('chip-active')) {
      btn.style.background = 'var(--success)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--success)';
    } else {
      btn.style.background = 'var(--bg-card)';
      btn.style.color = 'var(--ink)';
      btn.style.borderColor = 'var(--line)';
    }
  }

  async function openFacialForm(isEdit) {
    document.getElementById('facialFormTitle').textContent = isEdit ? 'Editar ficha facial' : 'Nueva ficha facial';
    
    // Reset todos los campos
    document.getElementById('ffEdad').value = '';
    document.getElementById('ffSexo').value = 'Femenino';
    document.getElementById('ffBiotipo').value = '';
    document.getElementById('ffFototipo').value = '';
    document.getElementById('ffTipoPiel').value = '';
    document.getElementById('ffHiper').value = '';
    document.getElementById('ffEnfermedades').value = '';
    document.getElementById('ffFamiliares').value = '';
    document.getElementById('ffAlergias').value = '';
    document.getElementById('ffMedicamentos').value = '';
    document.getElementById('ffQuirurgicos').value = '';
    document.getElementById('ffEsteticos').value = '';
    document.getElementById('ffObsExtra').value = '';
    document.querySelectorAll('#facialFormModal .chip-toggle').forEach(c => {
      c.classList.remove('chip-active');
      c.style.background = 'var(--bg-card)';
      c.style.color = 'var(--ink)';
      c.style.borderColor = 'var(--line)';
    });
    
    // Abrir modal primero
    document.getElementById('facialFormModal').classList.add('active');

    // Cargar datos existentes desde backend (siempre, no solo en edicion)
    if (currentProfileClient) {
      const c = CLIENT_PROFILES[currentProfileClient];
      if (c) {
        try {
          const result = await apiGet('getFichaFacial', { codigo: c.code });
          const f = result.success && result.ficha ? result.ficha : null;
          if (f) {
            document.getElementById('ffEdad').value = f.edad || '';
            document.getElementById('ffSexo').value = f.sexo || 'Femenino';
            document.getElementById('ffBiotipo').value = f.biotipo || '';
            document.getElementById('ffFototipo').value = f.fototipo || '';
            document.getElementById('ffTipoPiel').value = f.tipoPiel || '';
            document.getElementById('ffHiper').value = f.signosHiper || '';
            document.getElementById('ffEnfermedades').value = f.enfermedades || '';
            document.getElementById('ffFamiliares').value = f.antFamiliares || '';
            document.getElementById('ffAlergias').value = f.alergias || '';
            document.getElementById('ffMedicamentos').value = f.medicamentos || '';
            document.getElementById('ffQuirurgicos').value = f.quirurgicos || '';
            document.getElementById('ffEsteticos').value = f.esteticos || '';
            document.getElementById('ffObsExtra').value = f.obsExtra || '';

            // Activar chips
            const lesiones = (f.signosLesiones || '').toLowerCase();
            const estado = (f.estadoPiel || '').toLowerCase();
            document.querySelectorAll('#facialFormModal .chip-toggle').forEach(chip => {
              const label = chip.textContent.trim().toLowerCase();
              if (lesiones.includes(label) || estado.includes(label)) {
                chip.classList.add('chip-active');
                chip.style.background = 'var(--success)';
                chip.style.color = 'white';
                chip.style.borderColor = 'var(--success)';
              }
            });
          }
        } catch(e) {
          console.error('Error cargando ficha facial:', e);
        }
      }
    }
  }

  async function saveFacialForm() {
    const c = CLIENT_PROFILES[currentProfileClient];
    if (!c) return;
    
    // Recoger chips activos de lesiones
    const lesionChips = [];
    const estadoChips = [];
    const allChips = document.querySelectorAll('#facialFormModal .chip-toggle.chip-active');
    const lesionLabels = ['Poro abierto', 'Pápulas', 'Comedones', 'Pústulas'];
    allChips.forEach(ch => {
      if (lesionLabels.includes(ch.textContent)) lesionChips.push(ch.textContent);
      else estadoChips.push(ch.textContent);
    });
    
    const today = new Date();
    const fecha = today.getDate().toString().padStart(2,'0') + '/' + (today.getMonth()+1).toString().padStart(2,'0') + '/' + today.getFullYear();
    
    const ficha = {
      fecha: fecha,
      biotipo: document.getElementById('ffBiotipo').value,
      fototipo: document.getElementById('ffFototipo').value,
      edad: parseInt(document.getElementById('ffEdad').value) || 0,
      sexo: document.getElementById('ffSexo').value,
      tipoPiel: document.getElementById('ffTipoPiel').value,
      signosLesiones: lesionChips.join(', ') || 'Ninguno',
      signosHiper: document.getElementById('ffHiper').value || 'Ninguna',
      estadoPiel: estadoChips.join(', ') || 'Normal',
      antecedentes: {
        enfermedades: document.getElementById('ffEnfermedades').value || 'Ninguna',
        familiares: document.getElementById('ffFamiliares').value || 'Ninguno',
        alergias: document.getElementById('ffAlergias').value || 'Ninguna',
        medicamentos: document.getElementById('ffMedicamentos').value || 'Ninguno',
        quirurgicos: document.getElementById('ffQuirurgicos').value || 'Ninguno',
        esteticos: document.getElementById('ffEsteticos').value || 'Ninguno'
      },
      obsExtra: document.getElementById('ffObsExtra').value
    };
    
    if (!c.facial) c.facial = { history: [] };
    c.facial.ficha = ficha;
    
    // Persistir en backend
    try {
      const payload = {
        codigo: c.code,
        nombre: c.name,
        fecha: ficha.fecha,
        edad: ficha.edad,
        sexo: ficha.sexo,
        biotipo: ficha.biotipo,
        fototipo: ficha.fototipo,
        tipoPiel: ficha.tipoPiel,
        signosLesiones: ficha.signosLesiones,
        signosHiper: ficha.signosHiper,
        estadoPiel: ficha.estadoPiel,
        enfermedades: ficha.antecedentes.enfermedades,
        familiares: ficha.antecedentes.familiares,
        alergias: ficha.antecedentes.alergias,
        medicamentos: ficha.antecedentes.medicamentos,
        quirurgicos: ficha.antecedentes.quirurgicos,
        esteticos: ficha.antecedentes.esteticos,
        obsExtra: ficha.obsExtra
      };
      const result = await apiPost('updateFichaFacial', payload);
      if (!result.success) throw new Error(result.message || 'Error');
      closeModal();
      renderProfileTab();
      alert('Ficha facial guardada para ' + c.name);
    } catch(e) {
      alert('Error guardando ficha: ' + e.message);
    }
  }

  // === PERFILES DE CLIENTAS ===
  let CLIENT_PROFILES = {}; // Se llenarán desde el servidor

  // Función para cargar perfiles de clientas desde el servidor
  async function loadClientProfiles() {
    try {
      const result = await apiGet('getAllClients');
      if (result.success && result.clients) {
        CLIENT_PROFILES = {};
        result.clients.forEach(client => {
          const key = client.code.toLowerCase().replace('c-', 'c');
          CLIENT_PROFILES[key] = {
            name: client.nombre || '',
            code: client.code || '',
            initials: client.nombre ? client.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??',
            isTop: false,
            visits: parseInt(client.visitas) || 0,
            spent: 0,
            last: client.ultimaVisita || '',
            obs: client.observaciones || '',
            cejas: { obsArea: '', history: [] },
            depilacion: { obsArea: '', history: [] },
            pestanas: { fichas: [], obsArea: '', history: [] },
            facial: { obsArea: '', history: [] }
          };
        });
      }
    } catch (err) {
      console.error('Error cargando perfiles de clientas:', err);
    }
  }

  let currentProfileClient = null;
  let currentProfileTab = 'cejas';

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
      const payload = {
        clienteCodigo: clientCode,
        clienteNombre: clientName,
        staffNombre: user?.name || 'Staff',
        servicioNombre: service.name,
        servicioArea: service.area,
        servicioPrecio: service.price,
        nota: service.note
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
      icon.innerHTML = '<img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAQ4BDgDASIAAhEBAxEB/8QAHQABAAIDAAMBAAAAAAAAAAAAAAYHBQgJAQIEA//EAE8QAQABAwIDAwYJCAcGBQUBAAABAgMEBREGBxIhMUEIE1FhcYEUFSIyQmKRocEWIzNScpKxwglVc6PD0dIYJEOCovA0lLKz0xclRGOTg//EABoBAQACAwEAAAAAAAAAAAAAAAABBQMEBgL/xAAsEQEAAgEDAwMDAwUBAAAAAAAAAQIDBBESBRMxIUFhIlGBQ5GxFDIzUnHR/9oADAMBAAIRAxEAPwDcsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSPHHlL8F8HcV6hw1rXD3FdvOwLs27nRi2JorjbemumZvRM01RMTE7R2THZC7msnlz8uPjTh/H5haXj75mmUxY1GKY7a8eZ+TX7aKp2n1VeikGT/ANr3lr/UfFv/AJXH/wDnP9r3lr/UfFv/AJXH/wDnaPCNxvD/ALXvLX+o+Lf/ACuP/wDOf7XvLX+o+Lf/ACuP/wDO0eDcb76T5VHKfNrppycnWNMie+rKwJqiP/5TWsXhPmXwDxXVRb0Di3Sc29X82xF+KL0//wCdW1f3OYYbjrSOb/LrnjzI4IrtW9P167nYFH/4OoTN+zt6I3nqoj9mYbXcnvKU4O41uWdL1uI4b1q5tTTbyLkTj3qvRRd7Npn9Wrbv2iak7i8gAAAAAAAAAAAAAAAAAAAAAED5x81eHOVmn6fm8Q4up5NOfdqtWaMG3RXVE0xEzM9ddMbdseM96eNO/wCkJ1LznEXCejxV/wCHxL+TMf2ldNMf+1IJ/a8rvlpXXFNWj8V24n6VWJY2j7L0ylfDflF8o9arptRxPGnXqu6jPx67MR7a9uiP3nPARuOr+l6jp+q4VGbpedi52LX8y9jXablFXsqpmYl9TlhwjxZxLwlqMahw1rebpeRvG8492aaa/VVT82qPVVEw2l5M+VdYy7tnSOZGNbxLlUxRRq2LRPm5n/8Abbj5v7VPZ9WI7TcbVD8sLKxs3EtZmHkWsnGvURXau2q4rorpmN4mJjsmJ9L9UgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/DUsLF1LT8nT86xRkYuVaqs37Vcb010VRMVUz6piZh+4DmVzs4EyuXXMXUuG70V1Y1FXnsG9V/xsereaKvbHbTP1qZQtvr5ZPLj8seXk8Qadj9es6BTVfpimPlXsfvu0euYiOuP2ZiPnNCkAAgAAAAX95PflF6xwVdxuH+Lbt/VeG+yii7M9d/Cjwmme+uiP1J7Yj5vdtO8Gjanp+s6VjarpWZZzMHKtxcsX7NXVRXTPjEuUK7PJe505PLrXaNE1u/cu8K513a7TO8/A7k9nnqI/V/WpjvjtjtjaZG/o9LF21kWLd+xcou2rlMV0V0VRNNVMxvExMd8TD3SAAAAAAAAAAAAAAAAAADQjy4NS+Hc9sjF6t/i7TsbG29G8Td/wAVvu5q+UXqXxtzy4vy+rqinU7mPE+q1ta/kRIgACAABcnk6c8dW5a6nb0vU7l7P4Wv3Pz2Nv1VYszPbctb93pmnun1T2t+tG1LA1nSsXVdLy7WXhZdqm7YvW53promN4mHKFsn5FfNe5oXEFHL7W8mZ0rU7n/26uursx8mfoR6Kbndt+tt+tMpgbrAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYiqJiYiYnsmJc6vKg5czy75mZNnDsTRoup9WXp0xHyaKZn5dr/AJKp22/Vmn0uiqsfKW5dU8xuWeXg4tqKtYwN8vTavGblMdtv2V070+jfpnwBzkHmumqiuqiumaaqZ2mJjaYn0PDyAAAAAANyvIf5o16rpdzl1rWT1ZeBbm7pVdc9tyxHzrW/jNHfH1ZmO6ls+5V8H8QajwrxRp3EWk3fN5un36b1qfCdu+mfTTMbxMeMTLpxwDxPp3GfB2mcTaVXvi59iLkUzO826u6qifXTVE0z64TAzgCQAAAAAAAAAAAAAAAB63K6bduq5XVFNFMTNUz4RDlLxBn16rr2oapc368zKu5FW/prqmr8XTXmzqXxPyu4p1OKumrG0jJron6/mqun79nL1EgAgAAHtZu3LN6i9ZuVW7luqKqK6Z2mmY7YmJ8JeoDphyH41jj/AJW6PxDcrpnNqteYzojwyLfya528OraKoj0VQnLUn+j54ir85xPwndub0bW9RsUb90/o7k+/819jbZ6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGiPlocuPyT4/jijTbHRpGv1VXaopj5NnKjtuU+rq+fHrmr0KEdOucXBGHzD5e6lwzldFF29R5zEvVR+hv09tFfs37J9NMzHi5natp+ZpOqZWl6jj14+ZiXq7F+1X30V0zMVRPsmESPmAQAAAADZryGOY/xVxDkcvtUyNsPVKpv6dNc9lvIiPlUeqK6Y+2mPGprK/fTszK07UMfPwb9ePlY12m9Zu0TtVRXTMTTVHriYiUjrEIVyS47xeYvLrTuI7M0U5VVPmc6zT/wsimI649UT2VR6qoTVIAAAAAAAAAAAAAAAAqXyvdS+LfJ/4i6aum5leYxqPX1XqOqP3Yqc8G7nl+al8H5XaPplNW1eZq9Ncx6aLdqvf76qWkaJABAAAAAvnyFsmqxzwqtRO0ZGk5FufXEVW6/5W+DQnyHrVVznrZriOy1puRVPs2pj8W+yYABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANOfLq5cfAdXxuYul2NsfOmnG1OKY7KL0R+buT+1THTM+mmPGpuMw/GvDmncW8Kalw3q1vrw9QsVWbm0dtMz82uPrUzEVR64gHK4ZrjnhrUeD+LtT4a1ajpy9PvzarmI2iuO+muPq1UzFUeqYYV5AAAAAAF5eRxzH/IzmJToOo5HRo2v1U2K+qfk2cjutV+qJmeif2omfmt93JaJmJiYmYmO6YdE/Jd5jxzD5Z493Nv8AXrel9OJqMTPyq5iPkXf+emN5n9aKvQmBawCQAAAAAAAAAAAAABp//SFal16zwlo8VfocfJyao9PXVRTH/t1NVl7eXLqXw7njXiRVvGn6Zj4+3omeq7/iQolAAIAAAAGyPkAadN7mXrmqTG9GLpE2vZVcu0TH3W6m7DVn+j203zfD3FmsTT/4jLx8amf7OiqqY/vYbTJgAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADWDy6eXHxjoeNzE0uxvlafTGPqUUR212Jn5Fz201TtPqq9FLTV1h1TBxNU03K03PsUZGJlWarN+1XG9NdFUTFVM+qYmXNDnPwNl8u+YmpcNZHXXYt1+dwr1UfpsereaKvbt2T9amUSIaAgAAAAFmeTZzFr5c8zMTUMm7VTo+dtialT4Rbqnsubemirar07dUeKswHWi3XRcopuW6qa6KoiaaqZ3iYnxh5UF5FvMj8q+Ap4V1LI69X0Cim3RNU/Ku4s9lur19PzJ9UUelfr0AAAAAAAAAAAAAPFVUU0zVVMRERvMz4A5teUnqXxtz24vyurq6NRqxt/7GItfyK8ZDifUZ1fiXVNWqmZqzcy9kTM/Xrmr8WPeQAAAAABvv5D+m/AeROPldO3xjqOTk7+naYtf4S8kB8nXTfinkdwhidPTNWmW8iY9d3e7P/rT56AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABRHlmcuPyv5fflHpuP16xoFNV7amPlXsbvuUeuaduuPZVEfOXu8VU01UzTVEVUzG0xMdkwDkuLR8pvlzVy65mZWLiWZo0bUd8vTZiPk00TPyrX/ACVdn7PTPiq55AAAAAAEu5P8b5vL3mDpnE+J1127FzoyrNM/prFXZco9u3bHomInwdMdH1HC1fScTVdOyKMjDzLNF+xdp7q6KoiaZ+yXKBuJ5CvMj4bpeTy51S/vfw4qydLmqe2q1M73LUfs1T1RHoqq8KUwNpQEgAAAAAAAAAAjnNHUviflrxNqsVdNWJpOTdpn60Wqpp+/ZI1U+VtqXxZyA4lrpq2uZFFnGo9fXeoir/p6gc7AHkAAAAHtaoru3Kbdumaq65immI8Znuh6pRyj03445p8LaZNPVRkavjUVx9TztPV924OmmgYFGlaFp+l29ujDxrdinb0UUxTH8H2g9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACrvKb5c08xeWeVi4lmK9Z07fL02YjtqriPlWvZXT2e3pnwc6KqaqappqiaaonaYmO2JdaGh3lm8uPyQ5g/lJptjo0fX6qr21MfJs5Pfco9UVb9ce2qI+aiRQ4CAAAAAZfgziHUeE+KtN4j0m55vN0+/Tet+irbvpn6tUb0zHomWIAdTuBOJtO4x4Q0zibSa+rEz7EXaYmd5t1d1VE+umqJpn1wzbTLyF+Y/xZr2Ry91S/tialVORp01T2UZER8uj2V0xvHrp9NTc16AAAAAAAAAABrt5fGpfBuU+l6bTVtXm6vRNUemii3cmf+qaGxLUP+kL1Lq1HhDR6av0drJya49PVNummf+ir7SRqkA8gAAAAtzyP9N+MvKA4fmqnqt4kX8mv1dNmuKZ/emlUbY/yAtN+Eczdb1SqnenD0mbcT6Krl2jafsoqSN2gEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPw1DLx8DDuZeVdi3ZtxvVVP/AH3qp4q4tztYuV2bNVWNhd0W6Z2muPTVP4d3ta2o1VMEevn7M+DT2zT6eFgarxdoWnVTbuZfn7kd9FiOuft7vvYO9zHw4q/NaZfrj01XIpn8Vbipv1LNafT0WVdDijz6rLxuYunV1RGRg5NqPTTNNf8Akkmka7pWq9mFmW669t5tz8mv7J7VIPNFdVFcV0VTTVTO8TE7TEpx9Sy1n6vV5voccx9Po2AFf8FcaV13Lenazc36vk2smfT4RV/n9vpWAuMOemavKqty4rYrbWAGZiAAEN5z8DYnMTl5qXDWR0UX7tHncK9VH6HIp7aKvZv2T9WqUyAcntUwcvS9SytNz7FePl4t6qzftVxtVRXTMxVTPsmJfO2f8unlx8Xa3jcxNLsbYuoTGPqUUx2UX4j5Fz2VUxtPrpjxqawIABAAAAA+jTc3L03UcbUcG/Xj5eLdpvWLtE7VUV0zE01R64mIl0u5K8dYnMXl3pvEljopyK6fNZ1mmf0ORTtFdPs7qo+rVDmSvXyNeY/5Hcw44e1HI6NH1+qmxVNU/Js5Pdar9UTv0T+1Ez81I30ASAAAAAAAADRDy6dS+G87acOKt40/SrFiY9E1TXc/hchve5u+U3qXxrz54uyerqi3nfBvZ5mim1t/0IkVwAgAAAAG4f8AR7ab5vh/izWJp/8AEZWPjUz/AGdFVUx/ew08b7+Q9pvwHkVYyunb4x1HIyd/TtMWv8JMC8gEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD5Nay/gGkZeZ42bNVdPrmI7PvRMxEbymI3naFbcydcqz9VnTrNf+64tW07T8+54z7u77USea6qq6pqqmZqmd5mfGXhy2XJOW82n3dDjxxjrFYAGN7AAFqcttdq1LTZwMmvqycWI2mZ7a7fhPu7vsVW+/QNSu6Rq1jOtbz0VfLp/Wpnvj7Gzpc84ckT7e7BqMPdpt7ryH54t+1lY1vJsVxXau0xXRVHjEv0dLE7qHwAAAAwvHPDWncYcI6lw1q1HViahYm1XMR20T301x9amqIqj1xDmRxtw5qXCPFmpcN6tb6MzT79Vm5t3VR301x9WqmYqj1TDqi1d8urlx8P0jG5i6XY3ycGKcbU4ojtrszP5u5P7NU9M+qqPClEjTgBAAAAAFMzTVFVMzExO8THgAOivkwcxo5ics8a/mX4r1rTNsTUYmflV1RHyLv8Az09u/wCtFUeC1HOTyaOYtXLnmZiZuVemnRs/bE1Knfsi3VPybntoq2n07dUeLo1RVTXRTXRVFVNUbxMTvEx6XoeQAAAAAAAJmIjeeyHKri/Up1nizWNXmeqc7Ov5O/p67lVX4um3MjUvibl7xHq0VdM4el5N+mfXTaqmPvhy1RIAIAAAAB0q8nPTfinkbwhidPTNWmW8iY9d3e7/ADua9qiu5cpt26ZqrrmKaYjxmXVrQMCjStB0/S7e3Rh4tvHp29FFMU/gmB9oCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARzmRf8zwlk077Tdqooj96J/hEpGhPNy/06Ph4+/wCkv9f7tM/6mvq7ccNp+GbT13y1hWgDmV+AAAAAAsTlVrXXbr0W/X8qje5j7+j6VP4++U9ULp+Xewc2zmY9XTds1xVTP4exd+j59nU9NsZ1ifkXad9v1Z8Y909i96dn504T5j+FRrcPG3OPEvrAWLRAAHzatp+Hq2l5Wl6jj0ZGHl2a7F+1XHZXRVExVE+2JfSA5i84+B8zl5zC1LhnK667VmvzmJeqj9Nj1dtFft27J+tEx4Ig3u8tDlx+VvAEcT6bj9er6BTVdqimPlXsWe25T6+n58eqKtu9oigAEAAAAA3u8jDmP+VvAE8Malf69X0Cmm1TNU/KvYs9lur19O3RPqinfvaIpfyc44zOXnMLTeJsXrrtWa/N5dmmf02PV2V0e3btj60RPgkdOh82k6hh6tpeLqmn36MjDy7NF+xdonsroqiJpmPbEvpSAAAAAAKt8q/UvivkBxRdirau/ZtY1Menzl2iiY/dmr7HOhvJ5eupfBeUOn6fTVtXnavbiqPTRRbuVT/1dDRtEgAgAAAASjlJpvxxzS4W0yaeqjI1fGorj6nnaer7t3UFzx8kDTfjLygOH5qp6reJF/Jr9XTZr6Z/eml0OTAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABW/N6/1ahgY2/zLVVe37U7fyrIVJzOv+d4su0b7+ZtUUfd1fzNDqNtsG33bmhjfLv8AZGQFAuQAAAAABNuVutfBs2vSL9e1rInqs7+Ffo98ffHrQl7Wrldq7Rdt1TRXRVFVNUd8THdLLhyzivF4Y8uOMlJrK/xi+FtWo1nRrOZG0XNui9TH0a47/wDP3so6etovWLR4lz9qzWdpAHpAADxXTTXRVRXTFVNUbTExvEx6HOXyluXVXLnmZl4WLZmnR8/fL02rbsi3VPbb9tFW9Pp26Z8XRtVflP8ALmOYnLPJsYdmK9a0zfL06Yj5VdUR8u1/z0xtt+tFM+AOdQVRNMzTVExMdkxPgPIAAAAAA3H8hXmR8P0jJ5dapkb5ODFWTpk1z212Zn85bj9mqeqPVVPhS2icruCuI9S4R4r03iTSbnRmaffpvW9+6qO6qifq1RM0z6pl0x5d8XaTxzwfgcTaNdivGy7e9VEz8qzcj51ur61M7x98dkwmBIAEgAADC8ccT6Twdwrn8R63kRZwsK1NdX61c/RopjxqqnaIj0yDU/8ApAOJLeVxVw9wtZuRM6fjXMvIiJ7q7sxFMT64ptzPsrawM7x/xPqHGfGeqcT6nP8AvOoX5uzTE7xbp7qKI9VNMRTHqhgkAAgAAAAbH+QFpvwjmdrWqVU704ekzbifRVcu0bT9lFTdpqz/AEe2m+b0DizWJp/T5WPjUz/Z0V1TH97DaZ6gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFJcW3/AIRxNqNzfePhFVMT6qZ2/BdldUUUVV1TtTTG8qCyLlV6/cvVfOrqmqfbM7qrqlvprVY9Pr9VpegCmWgAAAAAAACUcuda+LNZjGvV7Y2XMUVb91Nf0Z/D3+pbLX5cPAes/HGiUedr3ysfa3e9M+ir3x98SuOm5/0p/Cs12H9SPykAC2VoAAADQryyeXH5Hcw54g07H6NG1+qq/TFMfJs5Hfdo9UTv1x+1MR81Rbprzr4ExeYvLrUuG7/RTk10+ewb1UfocineaKvZPbTP1apc0dSwsrTdRydPzrFePl4t2qzftVxtVRXTMxVTPriYmED8AEAAAAAszkFzf1nlXr1VdqirO0PLqj4dgTVt1bdnnKJ+jXEe6Y7J8JiswHUTl5x3wtx7otOq8MarazLe0edtb9N6xVP0blHfTP3T4TMdqSuUmhazq2g6lb1LRNSy9OzLfzL+Neqt1x6t4nu9S6eFfKq5naRZosalOla7RTG3Xl400Xdv2rc0x75iU7jfIabz5Y2v+a2jgrTPOfrfC69vs2/FEuKvKn5oaxarsafc0vQrdUbdWFjdVzb9q5NW0+uIg3G6HMLjvhbgLRqtU4n1azh29p81a36r1+Y+jbojtqn7o8ZiGhvlAc5dZ5p6zRRNFen6BiVzOHgRVvMz3ecuTHZVXMe6mJ2jvmZrrW9X1XXNRuajrOo5eo5l359/JvVXK6vfVO74gAEAAAAAADfbyHtN+A8i7OV07fGOo5GTv6dpptf4S80A8nLTfinkbwhidPT16bbyJj13t7v86fvQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAx/E1/4Pw9qF7faacevb2zExH3qOW9zIveZ4Syqd9pu1UUR+9Ez90SqFR9UtvkiPhbdPj6Jn5AFa3wAAAAAAABmuDNYnRtbt366pjHufm78fVnx909v2sKPVLzS0WjzDzasWrNZbA0zFVMVUzExMbxMeIiPLPWvh+lTp9+vfIxIiKd++q34fZ3fYlzqMWSMtIvHu5/JjnHaayAMjwAANMvLn5cfFev4/MLS7G2JqVUWNRiiOyjIiPk1+yumNp9dPpqbmsJx5wxp3GXB+p8M6rR1YufYm1VVEbzbq76a49dNURVHrgHLEZbjLh7UeFOKdS4c1a15vN0+/VZuRHdVt3VR9WqNqon0TDEvIAAAAAAAAAAAAAAAAAAPNuiu5cpt0UzVXVMU0xHjMvCT8pdN+OOaPC2mTT1UZGr41FcfU87T1fduDppw/gUaVoOn6Xb26MPFtY9O3oopin8H3A9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACFc3L/To+Jj7/pL/V+7TP8AqVmnPN6/1ahgY2/zLVVe37U7fyoM53X23zyu9HXbDAA020AAAAAAAAAA+/h7U7ukavYzre8xRO1dMfSpnvhd2NftZOPbyLNcV2rlMV0VR4xPcoJYvKvWvOWa9Gv1/Kt73LG/jT9Kn3d/vn0LPp2fjbtz4n+WhrsPKvOPZPAF2qQAAAGrPl18uPhmmY3MbS7G9/DinF1SKY+damdrd2f2ZnpmfRVT4UtPHV7WdOwtY0nL0rUsejIw8yzXYv2qu6uiqJiqPslzO5vcE5vL7mBqfDGX110Y9zrxb1UfprFXbbr+zsnbumJjwRIiQCAAAAAAAAAAAAAAAAAW35IOm/GXlAcPTVT1W8SL+TX6umzX0z+9NKpGx3kBab8I5n61qlVO9OHpM24n0VXLtG33UVJG7YCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUvM6/53iy7Rvv5m1RR93V/MjDKcXX/AIRxNqNzfePhFVMT6qZ2/Bi3LZ7cstp+XQ4Y446x8ADEyAAAAAAAAAAD99Oy72BnWczHq6btmuKqf8vZPc/AImYneETG8bSvfSc6zqWm2M7Hn5F2nq29E+Me6ex9SteVmtfB8yvSL9f5u/PVZ38K/GPfH3x61lOm02aM2OLe6hz4u1eagDYYQABQPlp8uPyq4DjivTbHVq2gUVV3Ipj5V3FntuU+vo+fHq6/Sv54uUUXLdVu5RTXRVExVTVG8TE98TAOS4svykuXdfLnmZmadj2qqdIzd8vTavCLVU9tvf00TvT6dumfFWjyAAAAAAAAAAAAAAAADcL+j103zehcW6xNP6fKx8amf7OmuqY/vI+5p6328h3TfgPIuzldO3xjqWRk7+naabX+EmBeYCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeK6oooqrqnammN5eWP4lv/B+HtQvb7TTj17e2YmI+95tPGJlNY3mIUjkXJvX7l6r51dU1T753egOTdIAAAAAAAAAAAAAA9rNy5ZvUXrVU0XKKoqpqjviY7pXZwxqtvWdGs5tO0VzHTdpj6Ncd8fj7JUilPLjWvi3WIxL1e2NlzFE791Nf0Z/D3+pu6DP2sm0+Jamsw9ym8eYWwA6FSgAAAKo8qTlxHMPlnkUYVjr1vSurL0+Yj5VcxHy7Uft0x2R+tFLnbMTE7TG0w60tB/LF5cfkXzFq1zTsfo0bXqqsi30x8mzkb73bfqiZmKo9VUxHzUSKOAQAAAAAAAAAAAAAADpT5OWm/FPIzhDE6enr02jImPXe3u/zua9uiq5cpt0UzVXVMRTEeMy6tcPafTpOgadpdG3Rh4trHp29FFEU/gmB9wCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARzmRf8zwllU77Tdqooj96Jn7olI0K5uX+nR8TH37bl/q91NM/wCpr6u3HDafhm08b5awrMBzK/AAAAAAAAAAAAAAAAXFwLrPxxolFV2rfKsbW73pmfCr3x9+7PqZ4K1mdG1u3drqmMa7+bvx9WfH3T2/auaJiYiYmJie6YdFos/ex+vmFHqsPbv6eJAG41gABCed/AeNzG5c6jw5diinLmnz+Beq/wCFkUxPRPqid5pn1VSmwDk5qGJk6fn5GBm2K7GVjXarN61XG1VFdM7VUzHpiYmH4tmPLm5cfFHEePzA0uxtharVFnUIpjst5MR8mv1RXTH71Mz31NZ0AAgAAAAAAAAAAAASflNpvxxzR4W0uaeqjJ1fGorj6nnaer7t3UJzw8kLTfjLygOHuqnqt4vn8mv1dNmvpn96aXQ9MAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFb837/VqGBjb/MtVV/vTt/KshUvM6/53iy7Rvv5m1RR93V/M0eo22wbfduaGu+X/AIjADn1yAAAAAAAAAAAAAAAALU5aaz8P0n4Ber3yMSIpjfvqt+E+7u+xVbIcO6pd0fV7Gdb3mKZ2uUx9Kie+P+/HZs6TP2ckT7e7BqMPdpt7rxHpj3reRj279muK7dymKqKo8Ynth7ul8qEAAABguYHC+ncacG6nwxqtO+Nn2Jt9W2826u+iuPXTVEVR7HMji/QNR4W4n1Hh3VrXms3Av1WbseEzHdVHppmNpifGJh1UareXZy4+E4GNzI0ux+dxopxdVimPnW5na3dn2TPRM+iqnwhEjT8BAAAAAAAAAAAAA2O8gPTfhHNDWdUqp3pw9IqtxPoruXaNp+yipu21X/o9dN83ofFusTT+nycfGpn+zprqmP7yPubUPUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApLi6/8ACOJ9Rub7/wC8VUx7KZ2/BdldUUUVV1TtFMbzKgsi7N7IuXqu+5XNU++d1V1S301qsenx9VpegCmWgAAAAAAAAAAAAAAAAACxuVetedsV6Nfr+Xa3rsb+NPjT7p7ffPoTtQ2m5l7T8+zm49W12zXFUev0x7J7l4aVnWdS06xnY87271HVHqnxifXE9i96dn504T5j+FRrcPC3KPEvpAWLRAAHx63pmDrWj5mkanj05GFmWa7F+1V3V0VRtMfZL7AHMHm1wXncv+P9T4XzequMa51Y16Y289Yq7bdfvjv9ExMeCKN5/LW5cflRwLTxfpuP1aroNE1Xopj5V3Entrj/AJJ+XHojr9LRhAAIAAAAAAAAAAG+vkO6b8B5F2srp2+MdSyMnf07TTa/wl6K/wDJx034p5GcIYnT09em0ZMx/bb3f51gPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAx/Et/wCD8P6he32mnHr29vTMR96jlvcx7/meEcqInabtVFEfvRM/dEqhUfVLb5Ij4W3T4+iZ+QBWt8AAAAAAGQ0fRdT1a504OLXcpidqq57KKfbM9iWYPLm/VTFWbqVu3PjTatzV987fwZsemy5fWsMOTPjx/wB0oGLKnlzgdPZqOTv6emljdQ5dZlumasHPtX/q3KZon7e2P4MttBnrG/F4jWYZ90HH1anpudpl/wAznY1yxX4dUdlXsnun3PlasxMTtLYiYmN4AEJAAAAE45Wa15jLr0e/X+bvT12d/Cvxj3x/D1oO97F25YvUXrVc0XLdUVU1R3xMd0suDLOK8Xhjy44yUmsr+GN4Z1W3rOj2c2jaK5jpu0x9GuO+Px9kwyTp62i0RaHP2rNZ2kAekAAPW7bt3bVdq7RTXbrpmmqmqN4qie+Jjxhzg8o3l3c5ccy8zS7FuqNJy98rTa57Y8zVM/I39NE70+naInxdIVSeVRy4/wDqDy0vzg2POa3pHVl4G0fKubR+ctR+1THZH61NIOeIDyAAAAAAAADzboquXKbdFM1VVTEUxHjMvCTcp9N+OOaHC+lzT1U5Or41uuPqzdp6p+zcHTXh7T6dJ0DTtLo26cPFtY9O3oooin8H3A9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACFc3L/To+Jj79ty/wBXuppn/UrNOeb9/qz8DG3+Zaqr/enb+VBnO6+2+eV3o67YYAGm2gAAABMOBuEZ1SKdQ1GKqcOJ+Rb7pu/5U/xYXhLSZ1nXLOJO/mo+XemPCiO/7eyPeum1botWqbVumKKKIimmmI2iIjuhY6DSxknnfxDR1monHHCvl4x7NrHs02bFui1bojamiiNoiPY9wXqoAAfPqODiaji1YuZYovWqu+Ko7vXE+E+tUvGXDd7QcqKqJqu4V2fzVye+J/Vq9f8AFcT5NXwLGp6dewcmne3dp238aZ8Jj1xLV1Wlrnr8tjT6icVvhRI+jUsO9p+fewsina7ZrmmfX6J9k9753NzExO0ryJ3jeAASAAAAlXLbWvi7WPgd6vbGy5int7qa/oz7+73x6FrtfomYneOyVx8D6zGs6JRXcq3ybP5u96Znwq98ffuuOm5947U/hV67DtPcj8s8AtlcAAAA0D8sHlx+RPMevWNOx+jRdemrJs9MfJtX9/ztv1dsxVHqq2j5qknTDnpwFj8xuXGocPVxRTmxT5/T7tX/AA8imJ6J38IneaZ9VUuaudi5GDm38LMs12MnHuVWr1quNqqK6Z2qpmPTExMIH4gIAAAAAABbXkh6b8ZeUBw71U9VvF8/k1+rps19M/vTSqVsb5Aem/COaGs6pVTvTh6RVRE+iu5do2+6ipI3cASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKl5nX/O8V3aN/0Nqij7ur+ZGGV4vv8AwjifUbm+/wCfqpj2Uz0/gxTls9uWW0/LocMccdY+ABiZAAAAFjcosSKcLNzpj5VdyLVM+iIjef8A1R9ido3y2seZ4Sxqttpu111z+9MfwhJHTaSvHDWPhQ6m3LLaQBsMAAAACCc1NF87j0azYo+Xa2ov7eNPhV7p7PfHoVyv7Is28jHuWL1EV27lM010z4xPepHiPS7uj6vfwbm8xTO9uqfpUT3T/wB+O6k6lg427keJW2hzcq8J9mPAVjfAAAAGc4I1mdG1u3cuVbY1783ejwiJ7qvdP3bsGPVLzS0WjzDzesXrNZbAxMTETE7xIinLXWvjDSPgN6vfIxIint76qPoz7u77PSlbqMWSMtIvHu5/JScdprIAyPAAA0r8uTlx8TcT2OPtLsbYOr1Raz4pjst5UR2Verrpj96mqfFuowHMThXTuNuC9T4Y1Sn/AHfOszRFe282q47aLkeumqIn3A5ajJ8V6FqPDHEuocP6tZ81nYF+qxep8N4nvj0xMbTE+MTEsY8gAAAAAA3B/o9dN83ofFusTT+nycfGpn0ebprqn/3KWnzfXyHNN+A8jLWX07fGOpZGRv6dum1/hJgXoAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHiuqKKJrqnaKY3mXlj+JL/wAH4f1C9vtNOPXt7emYj73m08YmU1jeYhSOTdm9kXL1XfcrmqffO70BybpAAAAAHtZt1Xb1Fqn51dUUx7ZBd3C9j4Pw5p9rbaYx6Jn2zG8/fLIvW1RTbt026Y2ppiIj2Q9nWUrxrEObtO8zIA9IAAAAES5l6L8YaT8Ps0b5GJE1Tt31W/GPd3/alpMRMTExExPfEseXHGWk0n3e8d5x2i0Nfhm+NdGnRtbuWqKZjGu/nLE/Vnw909n2MI5e9Jpaaz5h0FLResWgAeXoAAABkeG9UuaPrFjOo3mmmem5TH0qJ74/78YhduPdt37Fu/Zriu3cpiqiqO6YntiVArH5V6157Gr0a/X8u1vXY3nvp8Y909vv9Sz6bn427c+JaGuw8q849k6AXapAAAAapeXZy489i4vMnS7H5yzFOLq0Ux30TO1q7PsmeiZ9dHoahurmvaVg65oubo2p2KcjCzbFdi/bq+lRVG0x6u/vcy+a3BmdwDx7qfC+f1VTi3d7F2Y2i9Zq7bdce2nbf0TvHgiRFwEAAAAA6U+ThpnxTyM4QxOnpmvTaMiY9d6Zu/zudPCWiZnEvE+mcP4FM1ZWoZVvGt9m+01VRG8+qN959UOp2l4VjTdMxdOxaenHxbNFm1T6KaaYpiPshMD6AEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjvMe/5nhHKiJ2m7VRRH70TP3RKRIVzcv9OjYmPv23L/V7qaZ/1Q19VbjhtPwzaeu+WsKzAcyvwAAABk+FbHwjiTTrW28TkUVTHqid5/gxiS8tLHneLbFe28WqK6/+nb8WXBXlkrHyx5Z445n4W4A6lzwAAAAAAADAcdaN8caJXTbp3yrG9yz6Znxp98ffsp1sCqfmRovxbrE5dmjbGy5muNu6mv6Ufj7/AFKnqWDeO7H5WWhzfpz+EWAU6zAAAAH06Xm3tO1Cxm487XLNcVR6/THsmOx8wRMxO8ImImNpXxpebZ1HT7GbjzvbvURVHq9MT64nsfSrflXrXmcmvRr9fyLszXY38KvGPfHb7vWsh0+mzRmxxZQ58U4rzUAZ2EAAUJ5YvKq7xvwlb4l0PFm7rujUVTNuinevJxu+qiI8aqZ3qpj11RHbML7AclhuZ5Rvk1xr+Xk8V8vrdmxqV2ZuZelzMUW8iqe2a7Uz2UVz40ztTPfvE9+oGt6Tqmh6ld03WNPytPzbM7XLGRam3XT7pQPiAQA/bBxMrOy7WHhY17KybtXTbs2aJrrrn0RTHbMtnuQfkwZ+ZlY/EHMmxOJhUTFdrR+r87e8Y89MfMp+rHyp8enumRkfIe5V37V6eZeuY026ZoqtaNbuU7TMT2V3/ZtvTT6d6p9EttHpj2bOPYt4+PaotWbVMUW7dFMU00UxG0RER2RER4PdIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK45v3+rPwMbf5lqqv96Yj+VY6peZ9/wA7xXco3/Q2qKPu6v5mj1G22Db7tvQ13y7/AGRgBz66AAAAE35Q2OrVM3I2/R2Yo/eq3/lQhZPKGx06Xm5O36S9FH7tO/8AM29BXlnq1tZO2GU4AdGowAAAAAAABjOJ9Kt6zo17Cq2iuY6rVU/Rrjun8PZLJjzasWiaz4TW01neFAXrdyzers3aJouUVTTVTPfEx3w9U35p6L5jMo1exR+bvz0XtvCvwn3x98etCHMZ8U4rzSXQYskZKRaABiZAAAAHvj3bli/bv2a5ouW6oqoqjviY7YldvDeqW9Y0exnUbRVVG1ymPo1x3x/34TCj0r5a618X6v8AAb1e2PlzFPb3U1/Rn3932ehvaDP2snGfEtTWYe5TePMLWAdApQAAABheK+E+GeK8OMTiTQtP1W1HzIybFNc0eumqe2mfXEwzQCk9W8l3lJnXZuWNN1LTt+3pxc+uY/vOp+em+SzymxLsV38PVs+In5mRn1RE/wD84pn714AI7wdwNwfwfam3wzw5p2mTMdNVyzZjztceiq5O9VXvmUiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSfF9/4RxPqNzff8/VTH/L8n8F111RRRNVU7REbzKgsm7N/IuXqu+5XNU++d1V1S301qsenx9VpegCmWgAAAAtzlnZ81wlYr22m7crr/AOrb8FRru4UsfB+G9OtbbT8HoqmPXMbz/FZdMrvkmfhoa+dscR8smAvFSAAAAAAAAAA+XVsGzqWnX8HIj83dp6Zn0T4T7YntUhqWHewM+9h5FPTds1zTV6/X7J718oHzU0XzlmjWbFHyre1F/bxp+jV7p7PfHoV3UcHOnOPMfw3tFm4W4T4lXQCiW4AAAARMxO8TtMAC5eCNZjWdEt3LlW+TZ/N3o9Mx3Ve+Pv3ZxTfA+s/E2t0V3Ktsa/8Am73oiPCr3T9265I7Y3h0eiz97H6+YUeqw9u/p4kAbbWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY/iS/8H4f1C9vtNOPXt7emdvvUct/mPf8zwjlRE7TcmiiP3omfuiVQKPqlt8kR8Lbp9fomfkAVrfAAAAe1uiq5cpt0xvVVMRHtlftm3Tas0Wqfm0UxTHshSPC9j4RxFp9rbeJyKJn2RO8/dC8Fx0uvpayr6hPrWABbK4AAAAAAAAAAfnk2bWTj3Me9RFdq5TNNdM+MT3v0CfUUdxDpl3SNXv4NzeYoneiqfpUT3T/AN+O7HrU5maL8P0qNQsUb5GJEzO3fVb8Y93f9qq3NavB2ckx7ey+0+Xu039wBrM4AAAAtfltrXxjo/wO9Xvk4kRT299VH0Z93d7o9KqGS4Z1W5o2sWc2jeaInpu0x9Kie+Px9sQ2dJn7OSJ9vdr6nD3abe67x6WLtu/ZovWq4rt3KYqpqjumJ7pe7pVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhXNy/wBOjYmPv23Mjq91NM/5wrNOub9/qzsDG3+Zaqr2/amI/lQVzuvtvnld6ONsMADTbQAAACR8trPnuLcarbeLVNdc/uzH8ZhbytOUVjq1fMyNv0diKP3qon+VZa/6bXbDv95U2unfLsAN9pgAAAAAAAAAAAFURVExMRMT2TE+KmeNNGnRtbuWaKZjHu/nLE/Vnw909n2LmYDjvRvjjRK4tUb5WPvcs+mfTT74++Iaetwd3H6eYbWkzdu/r4lToDnV2AAAAAAsnlZrXn8SvR79f5yzHXZ38aPGPdP8fUnCh9Kzb2m6jYzsedrlmrqj1x4xPqmOxeGmZlnUMCzm49W9u9RFUer0x7Y7l70/P3KcJ8x/Cn1uHhflHiX0ALFpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKp5qV9fFEU/qY9FP3zP4oolHNCJjiqufTZolF3Mar/ADW/6v8AT/4q/wDABgZgAAAFkcobHTp2fk7fPvU0b/sxv/MnKMcsrHmuE7Ve23nrtdf39P8AKk7pdJXjhrHwodTbfLaQBssAAAAAAAAAAAAAACpuY+i/FmszlWaNsbLma6du6mv6Ufj7/Ui67uKNJo1nRr2HVtFzbqtVT9GuO7/L2SpO9brs3a7V2maK6KppqpnviY74c9r8Haybx4ldaPN3KbT5h6gNJtgAAACd8q9a81kV6Nfr+Rd3rsbz3VeNPvjt90+lBHvj3ruPkW79muaLluqKqKo8JjuZcGWcN4vDFmxxkpNZX8Mfw5qlrWNIsZ1vaJqja5TH0a474/78NmQdRW0WiJhQWiaztIAlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACsebePNGt4uTt8m7j9Pvpqnf7phDFq80dPnL4fjKop3rxK+uf2Z7J/CfcqpzuvpwzT8+q70d+WKPgAabaAAAeaKZrrpopjeap2iAXZwjY+D8M6db22n4PTVMeuqN/wAWUemPbizj27NPdboimPdGz3dZSvGsR9nOWnlaZAHp5AAAAAAAAAAAAAAFac0tF+D5tGr2KPzV+em9t4V+E++Pvj1rLfLq+BZ1PTb+Dfj5F2nbf9WfCfdPa19ThjNjmvuzYMvavFlED99RxL2BnXsPIp6btmuaao/H2PwczMTE7SvoneN4ABIAAACWctNa+L9W+AXq9sfLmIjeeym54T7+77FqtfomYmJiZiY7YmFzcFazGs6Jbu11ROTa/N34+tHj747ftXHTc+8dqfwq9dh2nuQzYC2VwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD0yLNvIsXLF6mKrdymaK6Z8YmNphSHEGmXdI1a/g3d56Kt6Kp+lTPdK8kb474ejWtPi7j0xGbYiZt/Xjxpn8PX7WjrtP3qb18w29Jn7dtp8SqIea6KrddVFdM01UztVTMbTE+h4c+ugABkOG7PwjiDT7O28VZFG/s6omfuY9IuXFjz3F2LMxvFuK65/dmI++YZMNeWSsfLHlnjSZ+FvgOqc8AAAAAAAAAAAAAAAAAAhXMzh+czG+N8Sje/Zp2vUxHbXRHj7Y/h7FZtgVY8fcKVYNyvU9OtzOJVO923TH6KfTH1f4KjqGknfu0/P/AKs9HqP07fhDAFQsgAAABn+BdZ+J9boqu1bYt/a3e9ER4Ve6fu3YAesd5x2i0ezzekXrNZbAiLcuNa+MtHjEvV75OJEUTv31UfRn8Pd60pdRiyRkpFo93P5KTjtNZAGR4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARHjfhGjVerO0+KbedEfKp7qbv8AlPr+1WGTYvY1+uxkWq7V2idqqKo2mJX6xWv6BputWunMs7XYjai9R2V0+/xj1SrtVoIyTyp6S3tPrJx/Tb1hSYlWt8DatgzVXhxGdZjumjsrj20/5boxetXbFybd61XarjvprpmJj3SpsmK+OdrRstKZKXjesvRNOUdjq1nLyJjst4/T76qo/wApQtY/KCx04Ofk7fPu00fuxM/zM+hryz1YdXO2GU6AdGowAAAAAAAAAAAAAAAAAAqiKommqImJ7JifEAV/xdwNNVVebolEdvbXjd37n+X2ehALtu5auVW7tFVFdM7VU1RtMT64X+xWvcP6XrNH++WNru21N6j5Nce/x9k7qzU9Oi/1Y/SW/g1s19L+sKTEw1ngHU8aaq9PuUZtrwp+bXHunsn7fci2Zh5eHc83l416xX6LlE0/xVOTBkx/3RssqZaZP7ZfgAxMgADJ8MarXo2s2c2nebcT03aY+lRPfH4+2F2Wblu9ZovWqort10xVTVHdMT3SoBZXKzWvhGHXpF+v85Yjqs7+NHjHun7p9Sz6bn427c+6v12HevOPZNwF2qgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+OVi4uVR0ZWNZv0+i5RFUfe/YRMb+SJ2YS/wlw7enevS7UfsVVUfwmH36TpmDpWNONgWPM2qq5rmnqmreZiI33mZ9EPsHiuKlZ3iI3e5yXtG0yAMjwAAAAAAAAAAAAAAAAAAAAAAPW5bou0TRcoprpnvpqjeJewDE5PDeg5E73NKxYmf1KOj/07Plngvhr+rf7+5/qSAYpwYp81j9mSMuSPFp/dH/yL4a/q3+/uf6j8i+Gv6t/v7n+pIBH9Pi/1j9oT3sn+0/uj/wCRfDX9W/39z/U/fT+F9DwMu3l4mFNq9bnemqL1yduzbxq2ZkTGDFE7xWP2RObJPpNp/cAZWMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//2Q==" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;">';
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

    // El cobro grupal no usa abono (v1): limpiar para que no quede una fila pegada
    window._cobrarCodigo = '';
    window._cobrarAbonoMonto = 0;
    var _abRowG = document.getElementById('cobrarAbonoRow');
    if (_abRowG) _abRowG.style.display = 'none';

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
  window.finishAndSendAll      = finishAndSendAll;
  window.cobrarPromoCompleta   = cobrarPromoCompleta;
  window.finishAndContinue     = finishAndContinue;
  window.finishAndContinueSameStaff = finishAndContinueSameStaff;
  window.finishSlotAndContinue = finishSlotAndContinue;
  window.finishAndNextPromo    = finishAndNextPromo;
  window.finishAndRetire       = finishAndRetire;
  window.finishAndReturn       = finishAndReturn;
  window.confirmServiceAndClose = confirmServiceAndClose;
  window.compartirSiguienteServicio = compartirSiguienteServicio;
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
