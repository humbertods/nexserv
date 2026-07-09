// NEXSERV nexserv-main-3.js — Cobros, facturación, asistencia
// Depende de: nexserv-main-2.js

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

  // Exponer globalmente para que el delegation hub las encuentre
  window.approveAuthorization = approveAuthorization;
  window.rejectAuthorization  = rejectAuthorization;

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

  // Inventario interno de la marca (Rosa Aguilera). Consulta + edición con – / +.
  // Fuente: getProductosMarca() (localStorage 'nexserv_stock'). NO es SIRA.
  // Síncrona: el stock es local, así que no hay spinner ni parpadeo al ajustar.
  function renderMkStock() {
    const el = document.getElementById('mkStockList');
    if (!el) return;

    const q = (document.getElementById('mkStockSearch') && document.getElementById('mkStockSearch').value || '').toLowerCase();
    const productos = getProductosMarca();
    const filtrados = q ? productos.filter(p => p.nombre.toLowerCase().includes(q)) : productos;

    if (filtrados.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-faint);">No hay productos que coincidan.</div>';
      return;
    }

    el.innerHTML = filtrados.map(p => {
      const minimo  = p.min || 0;
      const bajo    = p.stock <= minimo && p.stock > 0;
      const agotado = p.stock === 0;
      const color   = agotado ? 'var(--danger)' : bajo ? '#e0a800' : 'var(--success)';
      const badge   = agotado ? '🔴 AGOTADO' : bajo ? '🟡 BAJO' : '🟢 OK';
      const esPack  = p.tipo === 'paquete';
      const nEsc    = String(p.nombre).replace(/'/g, "\\'");

      // Los packs derivan su stock del MÍNIMO de sus componentes → no se editan
      // directo (solo lectura). Los productos base sí tienen – / +.
      const controles = esPack
        ? `<div style="text-align:right;flex-shrink:0;min-width:88px;">
             <div style="font-size:26px;font-weight:800;color:${color};line-height:1;">${p.stock}</div>
             <div style="font-size:10px;font-weight:700;color:${color};">${badge}</div>
             <div style="font-size:9px;color:var(--ink-faint);margin-top:2px;">auto (pack)</div>
           </div>`
        : `<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
             <button onclick="window.ajustarStock('${nEsc}', -1)" aria-label="restar"
               style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg-card);color:var(--ink);font-size:20px;font-weight:800;line-height:1;cursor:pointer;">–</button>
             <div style="text-align:center;min-width:44px;">
               <div style="font-size:24px;font-weight:800;color:${color};line-height:1;">${p.stock}</div>
               <div style="font-size:9px;font-weight:700;color:${color};">${badge}</div>
             </div>
             <button onclick="window.ajustarStock('${nEsc}', 1)" aria-label="sumar"
               style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg-card);color:var(--ink);font-size:20px;font-weight:800;line-height:1;cursor:pointer;">+</button>
           </div>`;

      return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-card);border-radius:16px;margin-bottom:8px;border-left:4px solid ${color};">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;">${p.nombre}</div>
            <div style="font-size:11px;color:var(--ink-faint);margin-top:2px;">Precio venta: $${p.precio} · Mín: ${minimo}</div>
          </div>
          ${controles}
        </div>
      `;
    }).join('');
  }

  // Abrir la pantalla de inventario interno de la marca (menú → "Inventario de productos").
  // Es una .screen: navegamos con show() para que quede dentro del marco del teléfono.
  function openMkInventario() {
    const search = document.getElementById('mkStockSearch');
    if (search) search.value = '';
    show('mkStockScreen');
    renderMkStock();
  }

  function ajustarStock(nombre, delta) {
    const stock = getStockData();
    if (stock[nombre] === undefined) stock[nombre] = STOCK_INICIAL[nombre] || 0;
    stock[nombre] = Math.max(0, stock[nombre] + delta);
    saveStockData(stock);
    renderMkStock();
  }

  // Exponer al scope global (estos archivos van dentro de un IIFE): el onclick
  // del menú y los botones – / + necesitan alcanzarlas.
  window.openMkInventario = openMkInventario;
  window.renderMkStock    = renderMkStock;
  window.ajustarStock     = ajustarStock;
  window.openMkStock      = openMkStock;
  window.closeMkStock     = closeMkStock;

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
      const horaEntradaTag = s.horaEntrada ? '<span style="font-size:12px;color:var(--ink-soft);">Entrada ' + _hhmm(s.horaEntrada) + (s.horaSalida ? ' · Salida ' + _hhmm(s.horaSalida) : '') + '</span>' : '<span style="font-size:12px;color:var(--ink-faint);">Sin registro</span>';
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
