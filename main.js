// main.js - corregido para IDs/coach modal coincidencias/guardas null

// --- configuración / estado ---
const cashier = sessionStorage.getItem('pos_cashier') || 'Terminal1';
const cashierEl = document.getElementById('cashier');
if (cashierEl) cashierEl.textContent = `Usuario: ${cashier}`;

let catalog = DB.getArticles();
let cart = [];
let currentUser = null;
let  indexCart  =  -1;
let  editId  = null;


// indices para navegación de resultados
let visibleResults = [];
let selectedResultIndex = 0;

// --- helpers ---
function fmtMX(n){
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
function toNumber(v){ return Number(v) || 0; }

// --- elementos ---
// mapeo tolerante: si algún elemento no existe, dejamos null y lo comprobamos antes de usar
const el = {
  search: document.getElementById('buscar'),
  results: document.getElementById('results'),           // contenedor oculto para compatibilidad
  cart: document.getElementById('carrito-lista'),
  subtotal: null, // no tenemos campo subtotal en esta versión
  total: document.getElementById('total'),
  btnPay: document.getElementById('btn-cobrar'),
  btnClear: document.getElementById('btn-clear'), // puede ser null
  btnOpenCatalog: document.getElementById('btn-open-catalog'),
  btnOpenReports: document.getElementById('btn-open-reports'),
  btnOpenStations: document.getElementById('btn-stations'),
  modalCatalog: document.getElementById('modal-catalog'),
  catalogList: document.getElementById('catalog-list'),
  btnCloseCatalog: document.getElementById('btn-close-catalog'),
  btnUsers: document.getElementById('btn-users'),
  payCash: document.getElementById('pay-cash'),
  payCard: document.getElementById('pay-card'),
  payTransfer: document.getElementById('pay-transfer'),
  fmtCash: document.getElementById('fmt-cash'),
  fmtCard: document.getElementById('fmt-card'),
  fmtTransfer: document.getElementById('fmt-transfer'),
  totalPaidSpan: document.getElementById('total-paid'),
  changeSpan: document.getElementById('change'),
  cashierSpan: document.getElementById('cashier'),
  ticketNum: document.getElementById('ticket-num'),
  stationSpan: document.getElementById('estacion-activa'),
  turnoSpan: document.getElementById('turno-activo'),
  modalCoin: document.getElementById('modal-coincidencias'),
  listaCoin: document.getElementById('lista-coincidencias'),
  cerrarCoinBtn: document.getElementById('cerrar-coincidencias'),
  printCorte: document.getElementById('modal-print-corte'),
  catalogList: document.getElementById('catalog-list'),
  reimpModal: document.getElementById('modal-reimprimir'),
  reimpTicket: document.getElementById('reimp-ticket'),
  reimpSearch: document.getElementById('reimp-search'),
  reimpPreview: document.getElementById('reimp-preview'),
  reimpPrint: document.getElementById('reimp-print'),
  reimpClose: document.getElementById('reimp-close'),
  loginModal: document.getElementById('login-modal'),
  loginUser: document.getElementById('login-user'),
  loginPass: document.getElementById('login-pass'),
  loginStation: document.getElementById('login-station'),
  loginOk: document.getElementById('login-ok'),
  loginCancel: document.getElementById('login-cancel')

};

// --- AUTH (login full-screen) ---
function showLoginScreen(){ document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-user').focus(); }
function hideLoginScreen(){ document.getElementById('login-screen').classList.add('hidden'); }


// Inicializar auth
(function  initAuth(){
   DB.ensureSeed  &&  DB.ensureSeed();
   const  saved  = sessionStorage.getItem('pos_user');
    if(saved){
      try  {
          const  user  =  JSON.parse(saved);
          setUserContext(user);
          applyPermissions(user);  //  ← AÑADE  ESTA  LÍNEA
          hideLoginScreen();
       }  catch(e){
          showLoginScreen();
       }
   }  else {
       showLoginScreen();
   }
})();

document.getElementById('login-cancel').addEventListener('click', ()=> {
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
});

document.getElementById('btn-users').addEventListener('click', (ev)=> {
  ev.preventDefault();
  window.location.href = 'users.html';
});

// ====================================================================
// 🔥 LOGICA CENTRALIZADA DE CONSECUTIVOS DE ALTA FIDELIDAD (FIX #000139)
// ====================================================================
function setUserContext(user){
  currentUser = user;
  sessionStorage.setItem('pos_user', JSON.stringify(user));
  sessionStorage.setItem('pos_cashier', user.user);
  
  // Conteo automático e inmune a desfases para el inicio de sesión
  const ventasFisicasRaw = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
  const seqContexto = ventasFisicasRaw.length + 1;

  sessionStorage.setItem('pos_ticket_seq', seqContexto.toString());
  ticketSeq = seqContexto;

  if(el.cashierSpan) el.cashierSpan.textContent = `Usuario: ${user.user}`;
  if(el.ticketNum) el.ticketNum.textContent = `Ticket: #${String(seqContexto).padStart(6,'0')}`;
  if(el.stationSpan) el.stationSpan.textContent = `Estación: ${user.station || 'Principal'}`;
  if(el.turnoSpan) el.turnoSpan.textContent  =  `Turno: ${user.turno  ||  '—'}`;
}


function actualizarTicketDisplay() {
    // Sincronizamos la misma lógica para cuando se refresca la botonera
    const listaVentasReales = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
    const ticketSeqReal = listaVentasReales.length + 1;
    
    if (el.ticketNum) {
        el.ticketNum.textContent = `Ticket: #${String(ticketSeqReal).padStart(6,'0')}`;
    }
}

// --- recalc totals ---
function recalc(){
  let subtotal = cart.reduce((s,it)=> s + it.precio * it.qty, 0);
  if (el.total) el.total.textContent = fmtMX(subtotal);
  
  // 🔍 DETERMINACIÓN REAL ABSOLUTA AL RECALCULAR
  const ventasFisicasRaw = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
  const seqSegura = ventasFisicasRaw.length + 1;
  
  // Forzamos la nivelación de la variable global de tu sistema
  ticketSeq = seqSegura;
  sessionStorage.setItem('pos_ticket_seq', seqSegura.toString());

  // Inyectamos de forma obligatoria el número corregido en la pantalla superior
  if (el.ticketNum) {
      el.ticketNum.textContent = `Ticket: #${String(seqSegura).padStart(6,'0')}`;
  }
  
  updatePaymentsDisplay();
}




window.updateTicketNumber = function() {
    // Si la función global se gatilla, lee la sesión fresca recalculada
    const listaVentasReales = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
    const seqReal = listaVentasReales.length + 1;
    
    // Forzamos la persistencia en el sessionStorage para limpiar la memoria vieja
    sessionStorage.setItem("pos_ticket_seq", seqReal.toString());

    const label = document.getElementById("ticket-num");
    if (label) {
        // Mantenemos el formato exacto de tu cabecera nativa "Ticket #000135"
        label.textContent = `Ticket #${String(seqReal).padStart(6, "0")}`;
    }
};


// Función para cargar las estaciones creadas por el Administrador en el Login
function cargarEstacionesEnLogin() {
    const selectStation = document.getElementById("login-station");
    if (!selectStation) return;

    // 1. Obtener el catálogo de estaciones usando tu función central de db.js
    const estaciones = DB.getStations ? DB.getStations() : (JSON.parse(localStorage.getItem("pos_stations")) || []);

    // 2. Limpiar la opción fija anterior del HTML
    selectStation.innerHTML = "";

    // 3. Si por alguna razón está vacío el catálogo, creamos una opción de respaldo
    if (estaciones.length === 0) {
        const option = document.createElement("option");
        option.value = "Principal";
        option.textContent = "Principal";
        selectStation.appendChild(option);
        return;
    }

    // 4. Inyectar dinámicamente cada estación real en el selector del Login
    estaciones.forEach(est => {
        const option = document.createElement("option");
        option.value = est.nombre; // Guardamos el nombre ("Salto del Agua", "Principal", etc.)
        option.textContent = est.nombre; // Texto visible para el usuario
        selectStation.appendChild(option);
    });
}

// Forzar a que las estaciones se carguen al abrir el Punto de Venta
document.addEventListener("DOMContentLoaded", () => {
    cargarEstacionesEnLogin();
});


// --- RENDER resultados (lista) ---
// Nota: renderResults sigue escribiendo en #results (oculto por defecto).
function renderResults(list){
  visibleResults = list || catalog.slice();
  if(!el.results) return;
  el.results.innerHTML = '';
  visibleResults.forEach((a, idx) => {
    const row = document.createElement('div');
    row.className = 'result-item';
    row.tabIndex = 0;
    if (idx === selectedResultIndex) row.classList.add('selected');

    row.innerHTML = `
      <div>
        <strong>${a.nombre}</strong>
        <div style="font-size:12px;color:#666">${a.codigo} • ${fmtMX(a.precio)} • stock:${a.stock}</div>
      </div>
      <div style="font-size:14px;color:#222"><strong>${fmtMX(a.precio)}</strong></div>
    `;

    row.addEventListener('click', () => {
      selectedResultIndex = idx;
      addToCartByIndex(idx);
      renderResults(visibleResults);
    });
    row.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') addToCartByIndex(idx);
    });

    el.results.appendChild(row);
  });
}

// agregar por índice de visibleResults
function addToCartByIndex(idx){
  const art = visibleResults[idx];
  if(!art) return;
  const found = cart.find(c => c.codigo === art.codigo);
  if(found) found.qty += 1;
  else cart.push({ codigo: art.codigo, nombre: art.nombre, precio: art.precio, qty: 1 });
  actualizarPreview(art);
  recalc();
  renderCart();
}

//Función para navegar en el listado de carrito
document.addEventListener("keydown",  e  =>  {
   //  Flecha  derecha  → entrar  al  carrito
   if  (e.key  ===  "ArrowRight"  && cart.length  >  0)  {
       e.preventDefault();
       indexCart  = 0;
       const  first  =  el.cart.querySelector(".cart-row");
       if  (first) first.focus();
       return;
    }
   //  Flecha  izquierda  <- regresar  al  buscador
   if  (e.key  === "ArrowLeft")  {
        e.preventDefault();
        const buscador  =  document.getElementById("buscar");
        if (buscador)  buscador.focus();
        return;
   }

   //  Si  estamos en  carrito  y  hay  items
   if  (indexCart  >= 0  &&  cart.length  >  0) {
       const  items  =  el.cart.querySelectorAll(".cart-row");
       const  current =  items[indexCart];
       if  (!current)  return;

       // reducir o  eliminar cantidad de un articulo
       if  (e.key === "-")  {
          const  idx  =  parseInt(current.dataset.index, 10);
           const  it  = cart[idx];
           if  (it)  {
              if  (it.qty >  1)  it.qty--;
              else  cart.splice(idx,  1);
              recalc();
              renderCart();
              //  mantener  foco  en  el mismo  índice  si  existe
              const  newItems  = el.cart.querySelectorAll(".cart-row");
               if (newItems[idx])  {
                  indexCart  =  idx;
                 newItems[idx].focus();
               } else  {
                  indexCart  =  Math.min(idx, newItems.length  -  1);
                  if  (indexCart >=  0)  newItems[indexCart].focus();
              }
           }
          return;
       }

       // aumentar cantidad de producto
       if  (e.key === "+")  {
          const  idx  =  parseInt(current.dataset.index, 10);
           const  it  = cart[idx];
           if  (it)  {
              if  (it.qty >=  1)  it.qty++;
              else  cart.splice(idx,  1);
              recalc();
              renderCart();
              //  mantener  foco  en  el mismo  índice  si  existe
              const  newItems  = el.cart.querySelectorAll(".cart-row");
               if (newItems[idx])  {
                  indexCart  =  idx;
                 newItems[idx].focus();
               } else  {
                  indexCart  =  Math.min(idx, newItems.length  +  1);
                  if  (indexCart >=  0)  newItems[indexCart].focus();
              }
           }
          return;
       }

       //  Navegar  dentro  del carrito  con  flechas  arriba/abajo
       if  (e.key ===  "ArrowDown")  {
           e.preventDefault();
          indexCart  =  (indexCart  + 1)  %  items.length;
           items[indexCart].focus();
          return;
       }
       if  (e.key  ===  "ArrowUp") {
           e.preventDefault();
           indexCart =  (indexCart  -  1  + items.length)  %  items.length;
           items[indexCart].focus();
          return;
       }
    }
});


// --- función usada por modal coincidencias ---
function agregarProductoAlCarrito(codigo) {
    // Buscar por CÓDIGO dentro de DB
    const producto = DB.getArticles().find(p => p.codigo === codigo);

    if (!producto) {
        console.warn("Producto no encontrado:", codigo);
        return;
    }

    const found = cart.find(x => x.codigo === producto.codigo);
    if (found) found.qty++;
    else cart.push({
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio: producto.precio,
        qty: 1
    });

    actualizarPreview(producto);
    recalc();
    renderCart();
}


// --- CART render ---
function renderCart(){
  if(!el.cart) return;
  el.cart.innerHTML = '';
  cart.forEach((it, idx) => {
    const r = document.createElement('div');
    r.className = 'cart-row';
    r.tabIndex  =  0; //  ←  permite  foco  con teclado
    r.dataset.index  =  idx;  //  ← importante  para  saber  qué  item es
    r.innerHTML  = `
        <div>
          <strong>${it.nombre}</strong>
           <div  style="font-size:12px;color:#666">${it.codigo}</div>
       </div>
       <div  class="cart-actions">
           <span  class="qty-controls">
              <button  data-idx="${idx}" class="btn  small  dec">-</button>
              <span  style="margin:0  8px">${it.qty}</span>
              <button  data-idx="${idx}" class="btn  small  inc">+</button>
              <button  data-idx="${idx}"  class="btn small  alt  rem">x</button>
           </span>
          <div  class="item-total"><strong>${fmtMX(it.precio  *  it.qty)}</strong></div>
       </div>`;

    el.cart.appendChild(r);

    r.querySelector('.inc').addEventListener('click', ()=> { it.qty++; recalc(); renderCart(); });
    r.querySelector('.dec').addEventListener('click', ()=> { if(it.qty>1) it.qty--; else cart.splice(idx,1); recalc(); renderCart(); });
    r.querySelector('.rem').addEventListener('click', ()=> { cart.splice(idx,1); recalc(); renderCart(); });
  });
}

// --- SEARCH handler ---
if (el.search) {
  el.search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if(!q) {
      renderResults(catalog);
      selectedResultIndex = 0;
      return;
    }
    const res = catalog.filter(a => a.nombre.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q));
    renderResults(res);
    selectedResultIndex = 0;
  });
}

// ----------------- MODAL COINCIDENCIAS -----------------
const modalCoin = document.getElementById("modal-coincidencias");
const listaCoin = document.getElementById("lista-coincidencias");
const cerrarCoinBtn = document.getElementById("cerrar-coincidencias");
let indexCoin = 0;

// MUY IMPORTANTE → DETENER enter del buscador original
el.search.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();  // ← evita que el sistema agregue directo al carrito
        e.stopPropagation(); // ← evita que otra función Capture el Enter

        const term = e.target.value.trim();
        if (!term) return;

        const productos = DB.getArticles();
        const encontrados = productos.filter(p =>
            p.nombre.toLowerCase().includes(term.toLowerCase()) ||
            p.codigo.toLowerCase().includes(term.toLowerCase())
        );

        if (encontrados.length === 0) return;

        listaCoin.innerHTML = "";
        indexCoin = 0;

        encontrados.forEach((p, i) => {
            const div = document.createElement("div");
            div.className = "coincidencia-item" + (i === 0 ? " active" : "");
            div.textContent = `${p.codigo} - ${p.nombre} (${fmtMX(p.precio)})`;
            div.dataset.codigo = p.codigo;

            div.addEventListener("click", () => {
                agregarProductoAlCarrito(div.dataset.codigo);
                modalCoin.classList.add("hidden");
            });

            listaCoin.appendChild(div);
        });

        modalCoin.classList.remove("hidden");
        modalCoin.focus();  //  asegúrate  que modalCoin  tenga  tabindex="0"  en HTML
    }
});


// Navegar con flechas y Enter dentro del modal
document.addEventListener("keydown", e => {

    if (!modalCoin || modalCoin.classList.contains("hidden")) return;  

    modalCoin.classList.remove("hidden");

    const items = listaCoin.querySelectorAll(".coincidencia-item");
    if (!items.length) return;

    // SOLO prevenir lo necesario, no todo
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.key === "ArrowDown") {
        items[indexCoin].classList.remove("active");
        indexCoin = (indexCoin + 1) % items.length;
        items[indexCoin].classList.add("active");
        items[indexCoin].focus();
        return;
    }

    if (e.key === "ArrowUp") {
        items[indexCoin].classList.remove("active");
        indexCoin = (indexCoin - 1 + items.length) % items.length;
        items[indexCoin].classList.add("active");
        items[indexCoin].focus();
        return;
    }

    if (e.key === "Enter") {
        const codigo = items[indexCoin].dataset.codigo;
        agregarProductoAlCarrito(codigo);
        modalCoin.classList.add("hidden");
	if  (el.search)  {
   	   el.search.value  =  "";
	   el.search.focus();
	}
        return;
    }

    if (e.key === "Escape") {
        modalCoin.classList.add("hidden");
        return;
    }
    
});

// botón cerrar modal coincidencias
if (cerrarCoinBtn) cerrarCoinBtn.addEventListener('click', () => modalCoin.classList.add('hidden'));

//Preview cuando agregas un producto al carrito
function actualizarPreview(producto) {
    const img = document.getElementById("preview-img");
    if(!img) return;
    if (producto && producto.imagen) img.src = producto.imagen;
    else img.src = "logo.png";
}

// reprint search/preview/print
el.reimpSearch && el.reimpSearch.addEventListener('click', ()=>{
  const t = Number(el.reimpTicket.value);
  if(!t) return alert('Ingresa ticket');
  const sale = DB.getSaleByTicket(t);
  if(!sale) { el.reimpPreview.innerHTML = 'No encontrado'; return; }

// === Generar HTML del ticket para impresión ===
let html = `
    <div class="ticket">
        <h2 style="text-align:center">MEET FASHION</h2>
        <div>${new Date(sale.fecha).toLocaleString()}</div>
        <hr>
        <div>
`;

(sale.items || []).forEach(it => {
    const qty = it.cantidad || it.qty || 1;
    html += `
        <div style="display:flex;justify-content:space-between;">
            <span>${it.nombre} x${qty}</span>
            <span>${fmtMX((it.precio || 0) * qty)}</span>
        </div>
    `;
});

html += `
        </div>
        <hr>
        <div>Total: ${fmtMX(sale.total || 0)}</div>
        <div>Pagado: ${fmtMX(sale.pagado || 0)}</div>
        <div>Cambio: ${fmtMX(sale.cambio || 0)}</div>
        <hr>
        <div style="text-align:center;">¡Gracias por su compra!</div>
    </div>
`;

  el.reimpPreview.innerHTML = html;

	el.reimpPrint && el.reimpPrint.addEventListener('click', ()=>{
	  const t = Number(el.reimpTicket.value); const sale = DB.getSaleByTicket(t);
	  if(!sale) return alert('No encontrado');
	  if(typeof printTicketHTML === 'function') printTicketHTML(el.reimpPreview.innerHTML);
	  else {
	    const w = window.open('','_blank');
	    w.document.write(html);
	    w.document.close();
	    w.print();
	    w.close();
	  }
	el.reimpModal.classList.add('hidden')
	});
});
el.reimpClose && el.reimpClose.addEventListener('click', ()=> el.reimpModal.classList.add('hidden'));

// --- payments init (uses payments module init paid earlier) ---
// payments module connector: it was exported as initPayments in payment.js and initialised in ventas.html via window.__paymentsInit
// so call that connector now passing getCart & clear & onSaleDone
function getCartForPayments(){ return cart.map(c=>({ codigo:c.codigo, nombre:c.nombre, precio:c.precio, cantidad:c.qty, importe:c.precio*c.qty })); }
function clearCartUI(){ cart = []; recalc(); renderCart(); }

//Exportar csv
function exportCSV(filename, rows){
  const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


// botón exportar: generar ventas.csv and articulos.csv
document.getElementById('btn-backup')?.addEventListener('click', ()=> {
  const ventas = DB.getSales();
  const rows = [['id','ticket','fecha','total','pagado','cambio','cash','card','transfer','cashier']];
  ventas.forEach(v => {
    rows.push([v.id, v.ticket || '', v.fecha, v.total, v.pagado, v.cambio, v.payments?.efectivo||'', v.payments?.tarjeta||'', v.payments?.transferencia||'', v.cashier||'']);
  });
  exportCSV('ventas.csv', rows);
});


function onSaleDoneCallback(sale){
    ticketSeq = Number(sessionStorage.getItem("pos_ticket_seq") || ticketSeq);
    actualizarTicketDisplay();
}


if(window.__paymentsInit) window.__paymentsInit(getCartForPayments, clearCartUI, onSaleDoneCallback);

// open pay button (F5 also bound)
el.btnPay && el.btnPay.addEventListener('click', ()=> {
  if(cart.length===0) return alert('Carrito vacío');
  const total = cart.reduce((s,i)=> s + i.precio * i.qty, 0);
  if(typeof window.openPayment === 'function'){
    window.openPayment(total, getCartForPayments());
  } else {
    alert('Módulo de pagos no inicializado.');
  }
});

// --- KEYBOARD navegación global (F2, F5 etc) ---
document.addEventListener('keydown', (e) => {
  // focus search with F2
  if(e.key === 'F2') { e.preventDefault(); if(el.search) el.search.focus(); return; }
  // abrir cobro con F5
  if(e.key === 'F5') { e.preventDefault(); if(el.btnPay) el.btnPay.click(); return; }
});

// --- payments handling (mixto) ---
function updatePaymentsDisplay(){
  const total = cart.reduce((s,i)=> s + i.precio * i.qty, 0);

  // guardas por si no existen (modal no abierto)
  const cashVal = el.payCash ? toNumber(el.payCash.value) : 0;
  const cardVal = el.payCard ? toNumber(el.payCard.value) : 0;
  const transferVal = el.payTransfer ? toNumber(el.payTransfer.value) : 0;

  if (el.fmtCash) el.fmtCash.textContent = fmtMX(cashVal);
  if (el.fmtCard) el.fmtCard.textContent = fmtMX(cardVal);
  if (el.fmtTransfer) el.fmtTransfer.textContent = fmtMX(transferVal);

  const totalPaid = cashVal + cardVal + transferVal;
  if (el.totalPaidSpan) el.totalPaidSpan.textContent = fmtMX(totalPaid);

  const change = totalPaid - total;
  if (el.changeSpan) el.changeSpan.textContent = fmtMX(change >= 0 ? change : 0);
}

// attach input listeners (guardando nulls)
[el.payCash, el.payCard, el.payTransfer].filter(Boolean).forEach(inp => {
  inp.addEventListener('input', updatePaymentsDisplay);
  inp.addEventListener('blur', () => {
    const v = Number(inp.value || 0);
    inp.value = v ? v.toFixed(2) : '';
    updatePaymentsDisplay();
  });
});

// --- Pay / open modal ---
// Se espera que payments.js defina window.openPayment
if (el.btnPay) {
  el.btnPay.addEventListener('click', () => {
      if (cart.length === 0) {
          alert("Carrito vacío");
          return;
      }

      const total = cart.reduce((s, i) => s + i.precio * i.qty, 0);

      if (typeof window.openPayment === "function") {
          window.openPayment(total, cart.map(c => ({
              codigo: c.codigo,
              nombre: c.nombre,
              precio: c.precio,
              cantidad: c.qty,
              importe: c.precio * c.qty
          })));
      } else {
          alert("Módulo de pagos no inicializado.");
      }
  });
}

// --- Clear cart ---
if (el.btnClear) {
  el.btnClear.addEventListener('click', ()=> {
    if(confirm('Limpiar carrito?')) {
      cart = [];
      recalc();
      renderCart();
      updatePaymentsDisplay();
    }
  });
}

// --- Modal catálogo (botones) ---
if (el.btnOpenCatalog) el.btnOpenCatalog.addEventListener('click', ()=> window.location.href = "catalog.html");
if (el.btnOpenReports) el.btnOpenReports.addEventListener('click', ()=> window.location.href = "reportes.html");
if (el.btnOpenStations) el.btnOpenStations.addEventListener('click', ()=> window.location.href = "estaciones.html");
if (el.btnCloseCatalog) el.btnCloseCatalog.addEventListener('click', ()=> el.modalCatalog && el.modalCatalog.classList.add('hidden'));

function renderCatalogModal(){
  const list = DB.getArticles();
  if(!el.catalogList) return;
  el.catalogList.innerHTML = '';
  const isAdmin = (currentUser && currentUser.role === 'admin');
  list.forEach(a=>{
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `
      <div>
        <strong>${a.nombre}</strong>
        <div style="font-size:12px;color:#666">${a.codigo}</div>
      </div>
      <div>${fmtMX(a.precio)} ${isAdmin? '• stock:' + a.stock : ''}</div>`;
    r.addEventListener('click', ()=> {
      agregarProductoAlCarrito(a.codigo);
      el.modalCatalog && el.modalCatalog.classList.add('hidden');
    });
    el.catalogList.appendChild(r);
  });
}

document.addEventListener('keydown', (e)=> {
  if(e.key === 'F2'){ e.preventDefault(); renderCatalogModal(); el.modalCatalog && el.modalCatalog.classList.remove('hidden'); }
});

document.addEventListener('keydown', (e)  =>  {
   if  (e.key  === 'Escape')  {
       if  (el.modalCatalog &&  !el.modalCatalog.classList.contains('hidden'))  {
          el.modalCatalog.classList.add('hidden');
       }
       if (el.modalCoin  &&  !el.modalCoin.classList.contains('hidden'))  {
          el.modalCoin.classList.add('hidden');
       }
      if  (el.reimpModal  &&  !el.reimpModal.classList.contains('hidden')) {
           el.reimpModal.classList.add('hidden');
      }
       if  (document.getElementById('modal-user')?.classList.contains('hidden')  === false)  {
          document.getElementById('modal-user').classList.add('hidden');
       }
   }
});


document.getElementById('btn-catalogo')?.addEventListener('click', ()=> {
renderCatalogModal(); el.modalCatalog && el.modalCatalog.classList.remove('hidden');
});


//Conteo de efectivo
const denoms = [1000,500,200,100,50,20,10,5,2,1];
const denomContainer = document.getElementById('denoms-list');
if(denomContainer){
  denoms.forEach(v=>{
    const div = document.createElement('div');
    div.innerHTML = `<label>$${v}</label><input class="denom-input" type="number" min="0" value="0" data-value="${v}">`;
    denomContainer.appendChild(div);
  });
  function calcDenoms(){
    const inputs = denomContainer.querySelectorAll('.denom-input');
    let total=0;
    inputs.forEach(i=> total += (Number(i.value)||0) * Number(i.dataset.value));
    document.getElementById('cashcount-total').textContent = fmtMX(total);
  }
  denomContainer.addEventListener('input', calcDenoms);
  document.getElementById('btn-cashcount')?.addEventListener('click', ()=> document.getElementById('modal-cashcount').classList.remove('hidden'));
  document.getElementById('cashcount-close')?.addEventListener('click', ()=> {
    const modal = document.getElementById('modal-cashcount');
    modal.classList.add('hidden');

    // Reiniciar todos los inputs de denominaciones
    denomContainer.querySelectorAll('.denom-input').forEach(input => {
        input.value = 0;
    });

    // Reiniciar el total mostrado
    document.getElementById('cashcount-total').textContent = fmtMX(0);

});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        const modal = document.getElementById("modal-cashcount");
        if (modal && !modal.classList.contains("hidden")) {
            // Cerrar modal
            modal.classList.add("hidden");

            // Reiniciar inputs
            const denomContainer = document.getElementById("denoms-list");
            denomContainer?.querySelectorAll(".denom-input").forEach(input => {
                input.value = 0;
            });

            // Reiniciar total mostrado
            const totalDisplay = document.getElementById("cashcount-total");
            if (totalDisplay) totalDisplay.textContent = fmtMX(0);
        }
	
	const modalPay = document.getElementById("modal-payment");
        if (modalPay && !modalPay.classList.contains("hidden")) {
            // Cerrar modal
            modalPay.classList.add("hidden");
        }

	const modalCor = document.getElementById("modal-corte");
        if (modalCor && !modalCor.classList.contains("hidden")) {
            // Cerrar modal
            modalCor.classList.add("hidden");
        }

	const modalLogout = document.getElementById("modal-logout");
        if (modalLogout && !modalLogout.classList.contains("hidden")) {
            // Cerrar modal
            modalLogout.classList.add("hidden");
        }

    }
});



 document.getElementById('cashcount-print')?.addEventListener('click',  ()=>  {
    const  inputs =  denomContainer.querySelectorAll('.denom-input');
    let  total  =  0;
    let  rows =  '';
 
    inputs.forEach(i  =>  {
       const  cantidad  =  Number(i.value) ||  0;
        const  valor =  Number(i.dataset.value);
        if  (cantidad >  0)  {
           const  subtotal  = cantidad  *  valor;
           total  +=  subtotal;
rows +=  `
    <tr>
       <td class="denom">$${valor}</td>
       <td  class="qty">${cantidad}</td>
       <td  class="sub">${fmtMX(subtotal)}</td>
   </tr>`;
        }
    });
 
const html  =  `
   <div  style="padding:16px;font-family:Arial,sans-serif">
       <h2  style="margin:0  0  12px 0">Conteo  de  efectivo</h2>

       <table  style="width:100%;border-collapse:collapse;margin-bottom:16px;table-layout:fixed;font-variant-numeric:tabular-nums">
          <colgroup>
              <col  style="width:40%">
              <col  style="width:20%">
              <col  style="width:40%">
           </colgroup>
          <thead>
               <tr style="background:#f0f0f0">
                  <th  style="text-align:left;padding:8px;border-bottom:1px  solid  #ccc">Denominación</th>
                 <th  style="text-align:right;padding:8px;border-bottom:1px  solid  #ccc">Cantidad</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px  solid  #ccc">Subtotal</th>
              </tr>
           </thead>
          <tbody>
               ${rows}
          </tbody>
       </table>

       <div  style="text-align:right;font-size:16px;font-weight:bold">Total:  ${fmtMX(total)}</div>
   </div>

   <style>
       td,  th  {  padding: 8px;  border-bottom:  1px  solid  #eee; }
       .denom  {  text-align:  left;  }
       .qty, .sub  {  text-align:  right;  }
       /* Evita  saltos  de  línea  raros y  asegura  espaciado  uniforme  */
       tbody tr:last-child  td  {  border-bottom:  none; }
    </style>
`;
 
    if  (typeof  window.printTicketHTML ===  'function')  {
        window.printTicketHTML(html);
    }  else {
        const  w  = window.open('',  '_blank');
        w.document.write(html);
        w.document.close();
       w.print();
        w.close();
    }
 
    document.getElementById('modal-cashcount').classList.add('hidden');
    // Reiniciar todos los inputs de denominaciones
    denomContainer.querySelectorAll('.denom-input').forEach(input => {
        input.value = 0;
    });

    // Reiniciar el total mostrado
    document.getElementById('cashcount-total').textContent = fmtMX(0);
 });
}

//  Helpers  para  el  corte  por  periodos
function  getLastCutISO()  {
    return  sessionStorage.getItem('pos_last_cut') ||  null;
}
function  setLastCutISO(iso)  {
    sessionStorage.setItem('pos_last_cut',  iso);
}

document.getElementById('btn-corte')?.addEventListener('click',  ()  =>  {
    document.getElementById('modal-corte').classList.remove('hidden');

    const onYes = () => {
    document.getElementById('modal-corte').classList.add('hidden');
    const  cashierId  =  sessionStorage.getItem('pos_cashier');
    const  now =  new  Date();

    //  Desde:  el  último  corte;  si  no  existe,  inicio  del  día
    const  lastCutISO  =  getLastCutISO();
    const  desde  =  lastCutISO  ?  new  Date(lastCutISO)  :  new  Date(new  Date().setHours(0,0,0,0));
    const  hasta  = now;

    //  Filtrar  ventas  del  cajero  en  el  rango  [desde,  hasta]
    const  ventasPeriodo  =  DB.getSales().filter(v  =>  {
        const  f  =  new  Date(v.fecha);
        return  f  >=  desde  &&  f <=  hasta  &&  v.cashier  ===  cashierId;
    });

 //  Totales  (mantén tu  lógica  de  artículos y  agrega  los  acumuladores de  pagos/ingresos)
 let  totalCash =  0,  totalCard  = 0,  totalTransfer  =  0, totalIngresos  =  0;
 const articleMap  =  {};
 
//  1)  Acumula  totales por  método  y  total de  ventas
 ventasPeriodo.forEach(v  => {
     totalCash          +=  v.payments?.efectivo          ||  0;
    totalCard           +=  v.payments?.tarjeta            ||  0;
    totalTransfer   +=  v.payments?.transferencia  ||  0;
    totalIngresos   +=  v.total                                   ||  0;
 });

 //  2)  Mantén tu  cálculo  de  artículos tal  cual  (no  lo muevas  ni  lo  mezcles)
ventasPeriodo.forEach(v  =>  {
    (v.items  ||  []).forEach(it =>  {
        const  qty     =  it.cantidad ||  it.qty  ||  1;
       const  price  =  it.precio     ||  0;
       const  key     =  `${it.codigo}|${it.nombre}`;
        if  (!articleMap[key]) articleMap[key]  =  {  nombre: it.nombre,  qty:  0,  monto: 0  };
        articleMap[key].qty     +=  qty;
        articleMap[key].monto +=  price  *  qty;
    });
 });



       const  corte  =  {
              fecha: new  Date().toLocaleString("sv-SE"),
               usuario: currentUser?.user  ||  '—',
               estacion: currentUser?.station  ||  '—',
               turno:  currentUser?.turno ||  '—',
               tickets: ventasPeriodo.length,
               totalCash,
               totalCard,
               totalTransfer,
               totalIngresos,
               articulos:  articleMap
       };

       DB.saveCut(corte);
       setLastCutISO(now.toISOString());

    //  Construir  HTML  del  corte
    let  html  =  `<div  style="padding:12px">
        <h2>Corte  -  ${now.toLocaleString()}</h2>
        <div>Estación:  ${sessionStorage.getItem('estacion-activa')}</div>
        <div>Usuario	:  ${cashierId}</div>
        <div>Turno:  ${currentUser?.turno  || '—'}</div>
        <div>Periodo:  ${desde.toLocaleString()}  →  ${hasta.toLocaleString()}</div>
        <hr>
        <div>Efectivo:  ${fmtMX(totalCash)}</div>
        <div>Tarjeta:  ${fmtMX(totalCard)}</div>
        <div>Transferencia:  ${fmtMX(totalTransfer)}</div>
        <hr>
        <div>Total  de  venta:  ${fmtMX(totalIngresos)}</div>
    `;

    if  (ventasPeriodo.length  >  0)  {
        html  +=  `<hr><h4>Artículos  vendidos</h4><div>`;
        Object.values(articleMap).forEach(a =>  {
            html  +=  `<div>${a.nombre}  —  ${a.qty}  —  ${fmtMX(a.monto)}</div>`;
        });
        html  +=  `</div><hr><div>Clientes  atendidos  (tickets):  ${ventasPeriodo.length}</div>`;
    }  else  {
        html  += `<hr><div>Sin  ventas  en  el  periodo.</div>`;
    }
    html  +=  `</div>`;

    //  Pintar  en  preview  (sobre  producto-preview)
    const  preview  =  document.getElementById('producto-preview');
    if  (preview)  {
        preview.innerHTML  =  html;
       preview.style.overflow  =  'auto';
        preview.style.padding  =  '12px';
        preview.style.background  =  '#fff';
        preview.style.border  =  '1px  solid  #eee';
    }
const  printCorte =  document.getElementById('modal-print-corte');

    //  Imprimir
   if(printCorte) {
    printCorte.classList.remove('hidden');
    const onYes = () => {

        if  (typeof  window.printTicketHTML  ===  'function')  {
            window.printTicketHTML(html);
        }  else  {
            const  w  =  window.open('', '_blank');
            w.document.write(html);
            w.document.close();
            w.print();
            w.close();
        }
    printCorte.classList.add('hidden');
    }

	//IMPRIMIR CONFIRMA QUE NO
            const onNo = () => { 
	        printCorte.classList.add('hidden');
	    };

            document.getElementById('corte-print-yes').onclick = onYes;
            document.getElementById('corte-print-no').onclick = onNo;

            // allow keyboard
            function onKey(e){
                if(e.key === 'Enter') onYes();
                if(e.key === 'Escape') onNo();
            }

}
    // MUY  IMPORTANTE:  marcar  el  corte  para  el  siguiente  periodo
    setLastCutISO(now.toISOString());

    //  Opcional:  “reiniciar”  la  UI  del  turno
    cart  =  [];
    recalc();
    renderCart();
    updatePaymentsDisplay();

    //  Restaurar el  logo  en  preview  si  presionas  Delete  sobre  el  área
    //  (ya  tienes  el  handler;  si  quieres  hacerlo  automático,  descomenta)
    //  const  previewBox  =  document.getElementById('producto-preview');
    //  if  (previewBox?.dataset?.originalHtml)  previewBox.innerHTML  =  previewBox.dataset.originalHtml;

};
    const onNo = () => { 
	document.getElementById('modal-corte').classList.add('hidden')
    };

    document.getElementById('corte-yes').onclick = onYes;
    document.getElementById('corte-no').onclick = onNo;

            // allow keyboard
            function onKey(e){
                if(e.key === 'Enter') onYes();
                if(e.key === 'Escape') onNo();
            }

});

// ====================================================================
// 🧾 REIMPRIMIR UN TICKET
// ====================================================================
document.getElementById('btn-reprint')?.addEventListener('click', ()=> {
  // 1. Abrimos el modal quitando la clase hidden
  el.reimpModal && el.reimpModal.classList.remove('hidden');
  
  // 2. Lógica nativa de tu ticket: asigna por defecto el folio del último ticket cobrado
  const last = DB.getSales();
  el.reimpTicket && (el.reimpTicket.value = last && last[0] ? (last[0].ticket || last[0].id || '') : '134');

  // 3. 🔥 SINCRONIZACIÓN DIRECTA POR ID REAL:
  const inputEstacionModal = document.getElementById('reimp-station');
  if (inputEstacionModal) {
      // Recuperamos el objeto del inicio de sesión
      const sesionActiva = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
      
      // Forzamos el texto con la sucursal de la sesión de Wendy (ej: "Salto del Agua")
      inputEstacionModal.value = sesionActiva.estacion || sesionActiva.station;
      
      // La hacemos de solo lectura para evitar alteraciones accidentales en mostrador
      inputEstacionModal.readOnly = true;
  }
});


 const  previewBox  = document.getElementById('producto-preview');
 
 if  (previewBox) {
     // Guardar  el  HTML  original (el  logo)
    previewBox.dataset.originalHtml  =  previewBox.innerHTML;
 
    //  Hacerlo focusable
     previewBox.setAttribute('tabindex', '0');
 
    //  Al  hacer  click, darle  foco
    previewBox.addEventListener('click',  ()  =>  previewBox.focus());

     // Escuchar  tecla  Supr/Delete
    document.addEventListener('keydown',  (e)  => {
        const  isDelete  = e.key  ===  'Delete'  || e.key  ===  'Backspace';
        if (isDelete  &&  document.activeElement  === previewBox)  {
           e.preventDefault();
            // Restaurar  el  logo  original
           previewBox.innerHTML  = previewBox.dataset.originalHtml;
        }
    });

document.addEventListener('keydown', (e)  =>  {
   if  (e.key  === 'Escape')  {
      if  (el.reimpModal  &&  !el.reimpModal.classList.contains('hidden')) {
           el.reimpModal.classList.add('hidden');
      }
   }
});

 }

// // init display
// Forzamos el cálculo real basándonos estrictamente en las ventas reales en disco
const ventasFisicasRaw = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
const seqInicialReal = ventasFisicasRaw.length + 1;

// Limpiamos de raíz cualquier rastro del número 143 en la memoria del navegador
sessionStorage.setItem('pos_ticket_seq', seqInicialReal.toString());
ticketSeq = seqInicialReal; 

if (el.ticketNum) {
    el.ticketNum.textContent = `Ticket: #${String(seqInicialReal).padStart(6,'0')}`;
}

renderResults(catalog);
recalc();
updatePaymentsDisplay();
