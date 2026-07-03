// NEXSERV nexserv-main-1.js — Helpers, negocio parte 1
// Depende de: state.js, api.js, router.js, app.js

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
      // Botón de evidencia solo para pestañas
      var _evBtnSP = (String(_myAreaSP||"").indexOf("pesta") >= 0)
        ? `<button style="margin-bottom:8px;width:100%;padding:14px;background:#1a1a1a;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;" onclick="abrirEvidenciasPestanas((window['_as'+${_slotSP}+'Client']||window._as1Client||''),(window.currentUser&&window.currentUser.name)||'staff')">📸 Evidencia del trabajo realizado</button>`
        : "";
      btnContainer.innerHTML = _evBtnSP + `
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
            + (typeof miAreaActual !== 'undefined' && String(miAreaActual||'').indexOf('pesta') >= 0 ? '<button style="margin-bottom:8px;width:100%;padding:14px;background:#1a1a1a;border:none;border-radius:var(--radius-pill);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:white;" onclick="abrirEvidenciasPestanas(window._as1Client||window._as2Client||\'\',(window.currentUser&&window.currentUser.name)||\'staff\')">📸 Evidencia del trabajo realizado</button>' : '')
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


// ============================================
// MÓDULO EVIDENCIAS DE PESTAÑAS
// Permite a la staff fotografiar el trabajo antes/después
// para protección ante reclamos de la clienta.
// Solo aparece en el panel de atención de pestañas.
// ============================================

// Abre la vista de evidencias en una nueva pestaña/overlay
// codigo = código de la clienta, nombre = nombre, staff = nombre de la staff
function abrirEvidenciasPestanas(codigo, nombre, staff) {
  if (!codigo) return;
  // Abrir en ventana nueva para no interrumpir el flujo de atención
  var url = location.origin + location.pathname +
    '?evidencias=1&codigo=' + encodeURIComponent(codigo) +
    '&nombre=' + encodeURIComponent(nombre || '') +
    '&staff=' + encodeURIComponent(staff || '');
  window.open(url, '_blank');
}

// Renderiza el panel de evidencias completo (se llama al cargar si ?evidencias=1)
async function renderEvidenciasPanel() {
  var params = new URLSearchParams(location.search);
  if (params.get('evidencias') !== '1') return;

  var codigo = params.get('codigo') || '';
  var nombre = params.get('nombre') || '';
  var staffParam = params.get('staff') || '';

  document.title = 'Evidencias · ' + nombre;
  document.body.style.cssText = 'margin:0;padding:0;background:#f8f8f6;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  document.body.innerHTML =
    '<div id="evRoot" style="max-width:480px;margin:0 auto;padding:16px;">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">' +
        '<button onclick="window.close()" style="background:#1a1a1a;color:#fff;border:0;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer;">← Cerrar</button>' +
        '<div>' +
          '<div style="font-size:17px;font-weight:800;">Evidencias del trabajo</div>' +
          '<div style="font-size:12px;color:#666;">' + nombre + ' · ' + new Date().toLocaleDateString('es-EC') + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="evLoading" style="text-align:center;padding:40px;color:#888;">Cargando evidencias…</div>' +
    '</div>';

  // Cargar fotos existentes
  var r = await apiGet('getEvidenciasPestanas', { codigo: codigo });
  var fotos = (r && r.fotos) ? r.fotos : {};

  var secciones = [
    { titulo: 'Antes del servicio', fotos: [
      { key: 'antes_izq', label: 'Ojo Izquierdo' },
      { key: 'antes_der', label: 'Ojo Derecho'  }
    ]},
    { titulo: 'Después del servicio', fotos: [
      { key: 'despues_izq', label: 'Ojo Izquierdo' },
      { key: 'despues_der', label: 'Ojo Derecho'  }
    ]},
    { titulo: 'Separación línea de agua', fotos: [
      { key: 'linea_izq', label: 'Ojo Izquierdo' },
      { key: 'linea_der', label: 'Ojo Derecho'   }
    ]}
  ];

  var html = '';
  secciones.forEach(function(sec) {
    html += '<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);">';
    html += '<div style="font-size:15px;font-weight:800;margin-bottom:12px;color:#1a1a1a;">' + sec.titulo + '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    sec.fotos.forEach(function(f) {
      var urlFoto = fotos[f.key] || '';
      html += _evFotoSlot(f.key, f.label, urlFoto, codigo, staffParam);
    });
    html += '</div></div>';
  });

  html += '<div style="text-align:center;padding:8px;color:#aaa;font-size:11px;">Las fotos se guardan en el perfil de la clienta</div>';

  document.getElementById('evLoading').outerHTML = html;
}

function _evFotoSlot(key, label, url, codigo, staff) {
  var inputId = 'evInput_' + key;
  var imgId   = 'evImg_' + key;
  var btnId   = 'evBtn_' + key;

  var slotContent = url
    ? '<img id="' + imgId + '" src="' + url + '" style="width:100%;height:130px;object-fit:cover;border-radius:10px;display:block;">' +
      '<button onclick="evCambiarFoto('' + key + '','' + inputId + '')" ' +
        'style="width:100%;margin-top:6px;padding:6px;background:#f0f0ee;border:0;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">Cambiar foto</button>'
    : '<label for="' + inputId + '" style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'height:130px;border:2px dashed #d0d0cc;border-radius:12px;cursor:pointer;background:#fafaf8;">' +
        '<span style="font-size:28px;color:#999;">+</span>' +
        '<span style="font-size:11px;color:#999;margin-top:4px;">Agregar foto</span>' +
      '</label>';

  return '<div>' +
    '<div style="font-size:11px;font-weight:700;color:#666;margin-bottom:5px;text-align:center;">' + label + '</div>' +
    '<input type="file" id="' + inputId + '" accept="image/*" capture="environment" style="display:none;" ' +
      'onchange="evSubirFoto(this,'' + key + '','' + codigo + '','' + staff + '')">' +
    slotContent +
    '<div id="evStatus_' + key + '" style="font-size:10px;text-align:center;color:#888;margin-top:3px;min-height:14px;"></div>' +
  '</div>';
}

function evCambiarFoto(key, inputId) {
  var el = document.getElementById(inputId);
  if (el) el.click();
}

async function evSubirFoto(input, key, codigo, staff) {
  var file = input.files[0];
  if (!file) return;
  var statusEl = document.getElementById('evStatus_' + key);
  if (statusEl) statusEl.textContent = 'Subiendo…';

  // Comprimir imagen a max 1200px y calidad 0.75 antes de subir
  var base64 = await _evComprimirImagen(file, 1200, 0.75);
  // Remover prefijo data:image/jpeg;base64,
  var b64data = base64.split(',')[1] || base64;

  var r = await apiPost('subirEvidenciaPestanas', {
    codigo: codigo, tipo: key, imagen: b64data, staff: staff
  });

  if (r && r.success) {
    if (statusEl) statusEl.textContent = '✓ Guardado';
    // Actualizar preview sin recargar
    var imgEl = document.getElementById('evImg_' + key);
    if (imgEl) {
      imgEl.src = r.url + '&t=' + Date.now();
    } else {
      // Recargar el slot completo para mostrar la imagen nueva
      setTimeout(function() { location.reload(); }, 800);
    }
  } else {
    if (statusEl) statusEl.textContent = '✗ Error al subir';
  }
}

function _evComprimirImagen(file, maxPx, quality) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Verifica al cargar si estamos en modo evidencias
(function() {
  if (location.search.indexOf('evidencias=1') >= 0) {
    document.addEventListener('DOMContentLoaded', function() {
      renderEvidenciasPanel();
    });
  }
})();

// Exponer globalmente
window.abrirEvidenciasPestanas = abrirEvidenciasPestanas;
window.evSubirFoto             = evSubirFoto;
window.evCambiarFoto           = evCambiarFoto;

// ── Aliases de funciones definidas en este archivo ──────────────
// Estas funciones son referenciadas desde otros archivos de la partición
// y necesitan estar en window antes de que main-2 y main-4 se ejecuten.
window.confirmarServicioObligatorio = showConfirmServiceModal;
window.finishAndSendAll             = finishAndSendAll;
