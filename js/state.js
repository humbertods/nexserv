// ================================================
// NEXSERV state.js
// Estado global centralizado
// Declarado antes del HTML para evitar errores de
// referencia cuando los onclick disparan antes de
// que el script principal termine de parsear.
// ================================================

// ── Sesión ──
window._session     = window._session     || null;
window.currentUser  = window.currentUser  || null;

// ── Cobro ──
window._apProductosEnTicket   = {};
window._apClienteNombre       = '';
window._apTicketId            = '';
window._mkEsperandoCobro      = [];
window._cobroClienteFiscal    = null;
window._facturacionActual     = null;
window._cobrarAjustes         = [];

// ── Atención ──
window._as1IdEspera     = '';
window._as1Client       = '';
window._as2IdEspera     = '';
window._as2Client       = '';
window._takingId        = '';
window._takingPromasExtra = [];
window._tmAreasActuales = [];
window._secuencia       = [];

// ── Llegada ──
window._arrTipo         = '';
window._prelistaSel     = null;
window._newPestSlot     = null;

// ── Directorio/reportes ──
window._vdClienteSeleccionado = null;
window._vdLineas              = [];
window._productosMarca        = [];
window._historialItems        = [];
window._clientasFrecuentes    = [];
window._solTickets            = [];
window._solConsultaCtx        = null;

// ── Timers ──
window._staffHomeRefresh  = null;
window._tabLineasRefresh  = null;
window._asisRefreshTimer  = null;
window._ownerCajaRefresh  = null;

// ── Misc ──
window._cajaPriv          = false;
window._cajaOwnerPriv     = false;
window._cmSiraPorMes      = {};
window._soloTexto = function(s){ return String(s||'').replace(/<[^>]*>/g,''); };
