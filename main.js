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


// ====================================================================
// 🔒 PASO 1 REPARADO: BLOQUEO PERIMETRAL DE APERTURA INMUNE A CACHÉ
// ====================================================================
function validarBloqueoAperturaCaja() {
    console.log("🔍 [MeetFashion]: Iniciando validarBloqueoAperturaCaja()...");

    const sesionActiva = JSON.parse(sessionStorage.getItem('pos_user'));
    console.log("🔍 [MeetFashion]: sesionActiva recuperada ->", sesionActiva);
    
    const cashierId = (sessionStorage.getItem('pos_cashier') || 
                       (sesionActiva ? (sesionActiva.user || sesionActiva.usuario) : '')) || '';
    console.log("🔍 [MeetFashion]: cashierId detectado ->", cashierId);
                       
    const estacionActiva = (sessionStorage.getItem('estacion-activa') || 
                            (sesionActiva ? (sesionActiva.estacion || sesionActiva.station) : 'Salto del Agua')) || 'Salto del Agua';
    console.log("🔍 [MeetFashion]: estacionActiva detectada ->", estacionActiva);

    // 🔴 PUNTO DE CONTROL 1: Validación de variables de sesión
    if (!sesionActiva && !cashierId) {
        console.warn("⚠️ [MeetFashion]: Abortado. No existe sesión activa ni cashierId en sessionStorage.");
        return;
    }

    const rolActual = String(sesionActiva?.role || sesionActiva?.rol || 'vendedor').toLowerCase();
    const aliasLimpio = String(cashierId).trim().toLowerCase();
    const estacionLimpia = String(estacionActiva).trim().toLowerCase();
    console.log(`🔍 [MeetFashion]: Variables normalizadas -> Rol: ${rolActual}, Alias: ${aliasLimpio}, Estación: ${estacionLimpia}`);

    // 🔴 PUNTO DE CONTROL 2: Evaluación de privilegios Máster/Admin
    const esMaestro = rolActual === 'master' || rolActual === 'admin';
    if (esMaestro) {
        console.log("👑 [MeetFashion]: Acceso Máster. Inmunidad de apertura otorgada. El bloqueo se salta.");
        // Tu lógica nativa de escape se queda aquí abajo...
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {	
                const modal = document.getElementById("modal-cashcount");
                if (modal && !modal.classList.contains("hidden")) {
                    modal.classList.add("hidden");
                    const denomContainer = document.getElementById("denoms-list");
                    denomContainer?.querySelectorAll(".denom-input").forEach(input => { input.value = 0; });
                    const totalDisplay = document.getElementById("cashcount-total");
                    if (totalDisplay) totalDisplay.textContent = fmtMX(0);
                }
            }
        });
        return;
    }

    // 🔴 PUNTO DE CONTROL 3: Verificación de la llave física en el LocalStorage
    const llaveFondoKey = `fondo_apertura_${aliasLimpio}_${estacionLimpia}`;
    const fondoRegistrado = localStorage.getItem(llaveFondoKey);
    console.log(`🔍 [MeetFashion]: Buscando llave [${llaveFondoKey}] en LocalStorage. ¿Encontrada? ->`, fondoRegistrado !== null);

    if (!fondoRegistrado) {
        console.log("🚨 [MeetFashion]: Caja VACÍA detectada. Aplicando bloqueos físicos a la interfaz...");

        const buscadorVentas = document.getElementById('busqueda-box');
        const btnCobrarPOS = document.getElementById('btn-cobrar');
        console.log("🔍 [MeetFashion]: Elementos core -> Buscador:", buscadorVentas, "Btn Cobrar:", btnCobrarPOS);

        if (buscadorVentas) {
            buscadorVentas.disabled = true;
            buscadorVentas.placeholder = "🔒 Caja bloqueada. Declare su fondo inicial...";
            buscadorVentas.style.backgroundColor = "#f1f5f9";
        }
        if (btnCobrarPOS) {
            btnCobrarPOS.disabled = true;
            btnCobrarPOS.style.cursor = "not-allowed";
            btnCobrarPOS.style.opacity = "0.5";
        }

        const btnHeaderCatalogo = document.getElementById('btn-catalogo');
        const btnHeaderConteo   = document.getElementById('btn-cashcount');
        const btnHeaderCorte    = document.getElementById('btn-corte');
        const btnHeaderReimpTicket = document.getElementById('btn-reprint');

        const botonesBloquear = [btnHeaderCatalogo, btnHeaderConteo, btnHeaderCorte, btnHeaderReimpTicket];
        console.log("🔍 [MeetFashion]: Botonera superior detectada ->", botonesBloquear);
        
        botonesBloquear.forEach((btn, index) => {
            if (btn && !btn.textContent.includes('Cerrar sesión')) {
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
                btn.style.opacity = "0.4";
                btn.style.pointerEvents = "none";
                btn.title = "🔒 Declare su fondo inicial para activar esta función";
            } else {
                console.warn(`⚠️ [MeetFashion]: Botón index [${index}] no localizado en el DOM o incluye texto 'Cerrar sesión'.`);
            }
        });

        const modalCashcount = document.getElementById('modal-cashcount');
        const btnImprimirNativo = document.getElementById('cashcount-print');
        const btnSalirNativo = document.getElementById('cashcount-close');
        console.log("🔍 [MeetFashion]: Componentes modal -> Modal:", modalCashcount, "Btn Imprimir:", btnImprimirNativo, "Btn Salir:", btnSalirNativo);

        if (modalCashcount) {
            if (btnImprimirNativo) btnImprimirNativo.style.display = 'none';
            if (btnSalirNativo) btnSalirNativo.style.display = 'none';

            let btnAperturaPremium = document.getElementById('btn-confirmar-apertura-turno');
            if (!btnAperturaPremium) {
                console.log("📦 [MeetFashion]: Creando botón verde '🔒 Confirmar y Abrir Turno' dinámicamente...");
                btnAperturaPremium = document.createElement('button');
                btnAperturaPremium.id = 'btn-confirmar-apertura-turno';
                btnAperturaPremium.className = 'btn';
                btnAperturaPremium.style.backgroundColor = '#16803d';
                btnAperturaPremium.style.color = '#ffffff';
                btnAperturaPremium.innerHTML = '🔒 Confirmar y Abrir Turno';
                
                const contenedorBotones = btnSalirNativo ? btnSalirNativo.parentElement : null;
                if (contenedorBotones) {
                    contenedorBotones.appendChild(btnAperturaPremium);
                }
            }
                
            btnAperturaPremium.onclick = () => {
                const textoTotalContado = document.getElementById('cashcount-total')?.textContent || "$0.00";
                const montoDeclaradoFondo = Number(textoTotalContado.replace(/[^0-9.-]+/g, "")) || 0;

                if (montoDeclaradoFondo === 0) {
                    if (!confirm("⚠️ ADVERTENCIA DE AUDITORÍA:\n¿Está completamente segura de abrir el turno con $0.00 de fondo de cambio en la gaveta?")) return;
                }

                const objetoFondoInicial = {
                    usuario: aliasLimpio,
                    estacion: estacionLimpia,
                    fecha_registro: new Date().toISOString(),
                    monto_fondo_real: montoDeclaradoFondo
                };

                localStorage.setItem(llaveFondoKey, JSON.stringify(objetoFondoInicial));
                alert(`🎉 ¡Turno abierto con éxito total!\nFondo en Caja: $${montoDeclaradoFondo}.\nEl POS ha quedado desbloqueado para operar.`);
	
		    setTimeout(() => {
        		window.location.reload();
		    }, 100);
            };

            // Lanzamiento forzado responsivo de alta prioridad visual
            console.log("🚀 [MeetFashion]: Forzando renderizado del modal retirando .hidden e inyectando display:flex");
            modalCashcount.classList.remove('hidden');
            modalCashcount.style.display = 'flex';
            
            if (typeof renderDenoms === 'function') {
                console.log("🚀 [MeetFashion]: Invocando función nativa renderDenoms()");
                renderDenoms();
            } else if (typeof initCashCount === 'function') {
                console.log("🚀 [MeetFashion]: Invocando función nativa initCashCount()");
                initCashCount();
            }
        } else {
            console.error("❌ [MeetFashion] CRÍTICO: No se localizó el elemento #modal-cashcount en el HTML.");
        }
    } else {
        console.log("✓ [MeetFashion]: Caja YA inicializada previamente. Permitiendo operación regular en mostrador.");
    }
}

// Enlazamos la ejecución al arranque automático del documento de ventas
document.addEventListener('DOMContentLoaded', () => {
    // Esperamos 100 milisegundos para asegurar que tus scripts nativos terminen de dibujar el POS antes de evaluar el bloqueo
    setTimeout(validarBloqueoAperturaCaja, 100);
});



document.getElementById('btn-users').addEventListener('click', (ev)=> {
  ev.preventDefault();
  window.location.href = 'users.html';
});

// ====================================================================
// 🔥 LOGICA CENTRALIZADA DE CONSECUTIVOS DE ALTA FIDELIDAD
// ====================================================================
function setUserContext(user){
  currentUser = user;
  sessionStorage.setItem('pos_user', JSON.stringify(user));
  sessionStorage.setItem('pos_cashier', user.user);
  
  // Conteo real de renglones del disco al inicializar sesión
  const listaVentasHistorial = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
  const seqContexto = listaVentasHistorial.length + 1;
  
  ticketSeq = seqContexto;
  sessionStorage.setItem('pos_ticket_seq', seqContexto.toString());

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
  
  // 🎯 CALCULO COMPENSADO AL VUELO: Inmune a desfases o bloqueos asíncronos
  const listaVentasHistorial = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
  const seqSegura = listaVentasHistorial.length + 1;
  
  // Nivelamos la variable global del sistema para que todo el archivo hable el mismo idioma
  ticketSeq = seqSegura;
  sessionStorage.setItem('pos_ticket_seq', seqSegura.toString());

  // Actualizamos la cabecera manteniendo de forma milimétrica tu formato original "Ticket: #000138"
  if (el.ticketNum) {
      el.ticketNum.textContent = `Ticket: #${String(seqSegura).padStart(6,'0')}`;
  }
  
  updatePaymentsDisplay();
}


window.updateTicketNumber = function() {
    const listaVentasHistorial = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
    const seqReal = listaVentasHistorial.length + 1;
    
    sessionStorage.setItem("pos_ticket_seq", seqReal.toString());

    const label = document.getElementById("ticket-num");
    if (label) {
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

// ====================================================================
// 🧾 REPRINT SEARCH/PREVIEW/PRINT BLINDADO MEDIANTE MAPEO DE CAJERO
// ====================================================================
el.reimpSearch && el.reimpSearch.addEventListener('click', () => {
    const t = Number(el.reimpTicket.value);
    if (!t) return alert('Ingresa ticket');

    const previewContenedor = el.reimpPreview || document.getElementById('reimp-preview');
    const botonImprimirReal = document.getElementById('reimp-print') || el.reimpPrint;

    // 🔒 1. BLOQUEO PREVENTIVO INMEDIATO EN EL MILISEGUNDO CERO
    if (botonImprimirReal) {
        botonImprimirReal.disabled = true;
        botonImprimirReal.style.backgroundColor = '#cbd5e1'; // Gris apagado
        botonImprimirReal.style.color = '#94a3b8';
        botonImprimirReal.style.cursor = 'not-allowed';
    }

    const sale = DB.getSaleByTicket(t);
    if (!sale) {
        if (previewContenedor) previewContenedor.innerHTML = '<div style="color:#dc3545; font-weight:600; text-align:center; padding:10px;">❌ Ticket no encontrado</div>';
        return;
    }

    // ====================================================================
    // 🔥 MAPEO CRUZADO DE CAJERO CONTRA BASE DE DATOS DE USUARIOS (EL FIX)
    // ====================================================================
    // 1. Extraemos la estación de la sesión actual de la cajera en esta computadora
    const sesionObj = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
    const sucursalSesionActual = String(sesionObj.estacion || sesionObj.station || 'Salto del Agua').trim().toLowerCase();

    // 2. Extraemos el nombre de la cajera que emitió el ticket consultado
    const nombreCajeraTicket = sale.cashier || sale.usuario || '';

    // 3. Cruzamos los datos yendo a buscar a esa cajera en el catálogo de usuarios
    let sucursalTicketCalculada = '';
    const listaUsuariosDB = DB.getUsers ? DB.getUsers() : (JSON.parse(localStorage.getItem('usuarios')) || []);
    const empleadoQueVendio = listaUsuariosDB.find(x => x.user === nombreCajeraTicket);

    if (empleadoQueVendio) {
        // Si el empleado existe en la base, extraemos sucursal actual asignada
        sucursalTicketCalculada = String(empleadoQueVendio.estacion || empleadoQueVendio.station || '').trim().toLowerCase();
    }

    // Si por contingencia es una venta vieja sin cajero, hereda por defecto el valor nativo o la base
    if (!sucursalTicketCalculada) {
        sucursalTicketCalculada = String(sale.station || sale.estacion || 'salto del agua').trim().toLowerCase();
    }

    // ====================================================================
    // 🎯 VALIDACIÓN DE INTEGRIDAD INTER-SUCURSAL BLINDADA
    // ====================================================================
    const coincidenEstaciones = (sucursalTicketCalculada === sucursalSesionActual) || 
                                (sucursalTicketCalculada.length > 3 && sucursalSesionActual.includes(sucursalTicketCalculada)) || 
                                (sucursalSesionActual.length > 3 && sucursalTicketCalculada.includes(sucursalSesionActual));

    if (!coincidenEstaciones) {
        // Buscamos el nombre estético original para mostrar en la alerta
        const nombreEstacionTicketOriginal = empleadoQueVendio ? (empleadoQueVendio.estacion || empleadoQueVendio.station) : "otra sucursal";
        
        // Vaciamos la previsualización al instante antes de que corra la alerta bloqueante
        if (previewContenedor) {
            previewContenedor.innerHTML = `<div style="color:#ef4444; font-weight:600; font-size:12px; padding:15px; text-align:center; background:#fef2f2; border:1px solid #fee2e2; border-radius:6px; font-family:sans-serif;">🔒 Acceso Bloqueado: Este ticket pertenece a la estación "${nombreEstacionTicketOriginal}".</div>`;
        }

        alert(`⚠️ ACCESO RESTRINGIDO:\nEl ticket #${t} corresponde a la estación "${nombreEstacionTicketOriginal}".\nNo tienes permisos para consultar ni reimprimir folios de cajas ajenas.`);
        return; // 🛑 CORTA LA OPERACIÓN DEFINITIVAMENTE
    }

    // ====================================================================
    // 🛍️ RENDERIZADO DEL TICKET (Se ejecuta solo si es de tu sucursal)
    // ====================================================================
    let html = `
        <div class="ticket">
            <h2 style="text-align:center; margin:4px 0;">MEET FASHION</h2>
            <div style="text-align:center; font-size:11px;">${new Date(sale.fecha).toLocaleString()}</div>
            <hr style="border:none; border-top:1px dashed #ccc; margin:8px 0;">
            <div>
    `;

    (sale.items || []).forEach(it => {
        const qty = it.cantidad || it.qty || 1;
        html += `
            <div style="display:flex;justify-content:space-between; margin-bottom:4px;">
                <span>${it.nombre} x${qty}</span>
                <span>${fmtMX((it.precio || 0) * qty)}</span>
            </div>
        `;
    });

    html += `
            </div>
            <hr style="border:none; border-top:1px dashed #ccc; margin:8px 0;">
            <div>Total: ${fmtMX(sale.total || 0)}</div>
            <div>Pagado: ${fmtMX(sale.pagado || 0)}</div>
            <div>Cambio: ${fmtMX(sale.cambio || 0)}</div>
            <hr style="border:none; border-top:1px dashed #ccc; margin:8px 0;">
            <div style="text-align:center; font-weight:600;">¡Gracias por su compra!</div>
        </div>
    `;

    if (previewContenedor) {
        previewContenedor.innerHTML = html;
    }

    // 🔥 ACTIVACIÓN EXITOSA: Si superó los candados, el botón se enciende en azul brillante al final
    if (botonImprimirReal) {
        botonImprimirReal.disabled = false;
        botonImprimirReal.style.backgroundColor = '#0066ff'; // Azul corporativo
        botonImprimirReal.style.color = '#ffffff';
        botonImprimirReal.style.cursor = 'pointer';
    }

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


// ====================================================================
// 💵 MODAL CONTEO DE EFECTIVO
// ====================================================================
const denoms = [1000,500,200,100,50,20,10,5,2,1];
const denomContainer = document.getElementById('denoms-list');
if(denomContainer){
  denoms.forEach(v=>{
    const div = document.createElement('div');
    div.innerHTML = `<label style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #334155;">$${v}</label><input class="denom-input" type="number" min="0" value="0" data-value="${v}" style="width: 70px; text-align: center; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">`;
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

// ====================================================================
// 🔒 FUNCIÓN DE ARQUEO
// ====================================================================
function inicializarCalculosReactivosNuevoArqueo() {
    const denominacionesArqueo = [
        { id: 'arq-b1000', valor: 1000 }, { id: 'arq-b500',  valor: 500 },
        { id: 'arq-b200',  valor: 200 },  { id: 'arq-b100',  valor: 100 },
        { id: 'arq-b50',   valor: 50 },   { id: 'arq-m20',   valor: 20 },
        { id: 'arq-m10',   valor: 10 },   { id: 'arq-m5',    valor: 5 },
        { id: 'arq-m2',    valor: 2 },    { id: 'arq-m1',    valor: 1 }
    ];

    function ejecutarSumaArqueoCiegas() {
        let granTotalArqueo = 0;

        denominacionesArqueo.forEach(item => {
            const inputElement = document.getElementById(item.id);
            if (inputElement) {
                granTotalArqueo += (Number(inputElement.value) || 0) * item.valor;
            }
        });

        // Inyectamos el total en tu visor de la tarjeta
        const visorTotalArqueo = document.getElementById('arqueo-ciegas-total');
        if (visorTotalArqueo) {
            visorTotalArqueo.textContent = typeof fmtMX !== 'undefined' 
                ? fmtMX(granTotalArqueo) 
                : '$' + granTotalArqueo.toFixed(2);
        }

        // ====================================================================
        // 🎯 EL FIX: ACTIVACIÓN Y DESBLOQUEO EXCLUSIVO POR ID NATIVO
        // ====================================================================
        const btnConfirmarArqueo = document.getElementById('btn-arqueo-confirmar-corte');
        
        if (btnConfirmarArqueo) {
            if (granTotalArqueo > 0) {
                // 1. Desbloqueo nativo del botón en el navegador
                btnConfirmarArqueo.removeAttribute('disabled');
                btnConfirmarArqueo.disabled = false;
                
                // 2. 🔥 LIBERACIÓN EN LÍNEA: Vaciamos las propiedades rígidas de CSS
                btnConfirmarArqueo.style.pointerEvents = ""; // <-- ¡ESTO ES LO QUE LE DEVUELVE EL CLIC!
                btnConfirmarArqueo.style.cursor = "pointer";
                
                // 3. Estilos visuales de tu azul de alta visibilidad
                btnConfirmarArqueo.style.backgroundColor = '#0066ff';
                btnConfirmarArqueo.style.color = '#ffffff';
                btnConfirmarArqueo.style.opacity = '1';
                btnConfirmarArqueo.style.boxShadow = '0 4px 12px rgba(0, 102, 255, 0.2)';
            } else {
                // ❄️ RE-CONGELAMIENTO EN CEROS
                btnConfirmarArqueo.setAttribute('disabled', 'true');
                btnConfirmarArqueo.disabled = true;
                
                btnConfirmarArqueo.style.pointerEvents = "none"; // Congela físicamente el mouse
                btnConfirmarArqueo.style.cursor = "not-allowed";
                btnConfirmarArqueo.style.backgroundColor = '#cbd5e1';
                btnConfirmarArqueo.style.color = '#94a3b8';
                btnConfirmarArqueo.style.boxShadow = 'none';
            }
        }


        sessionStorage.setItem('monto_fisico_contado_arqueo_ciegas', granTotalArqueo);
    }

    // Vinculamos la reactividad a las casillas al teclear números
    const casillasArqueo = document.querySelectorAll('.input-arqueo-val');
    casillasArqueo.forEach(input => {
        input.removeEventListener('input', ejecutarSumaArqueoCiegas);
        input.addEventListener('input', ejecutarSumaArqueoCiegas);
    });

    ejecutarSumaArqueoCiegas();

// ====================================================================
// 🚪 PASO 2.1: ACTIVACIÓN REAL Y DESBLOQUEO DEL BOTÓN "SALIR" DE ARQUEO
// ====================================================================
const btnSalirArqueo = document.getElementById('btn-arqueo-cancelar');

if (btnSalirArqueo) {
    // 🔥 LIBERACIÓN EN LÍNEA: Forzamos la remoción de cualquier bloqueo previo de mouse
    btnSalirArqueo.style.pointerEvents = ""; 
    btnSalirArqueo.style.cursor = "pointer";
    btnSalirArqueo.disabled = false;

    // 🎯 ASOCIACIÓN DEL EVENTO CLIC: Cierre limpio y reversión de candados
    btnSalirArqueo.onclick = () => {
        // 1. Ocultamos el nuevo modal de arqueo de forma segura
        const modalArqueoNuevo = document.getElementById('modal-arqueo-ciegas');
        if (modalArqueoNuevo) {
            modalArqueoNuevo.classList.add('hidden');
            modalArqueoNuevo.style.display = 'none';
        }

        // 2. REVERSIÓN DE SEGURIDAD: Le devolvemos la interacción a tu barra superior azul
        // para que la vendedora pueda seguir cobrando o navegando si decidió no cerrar la caja

        const btnHeaderCatalogo = document.getElementById('btn-catalogo');
        const btnHeaderCobrar = document.getElementById('btn-cobrar');
        const btnHeaderConteo   = document.getElementById('btn-cashcount');
        const btnHeaderCorte    = document.getElementById('btn-corte');
        const btnHeaderReimpTicket    = document.getElementById('btn-reprint');
        const btnHeaderLogout    = document.getElementById('btn-logout');

        const buscadorVentas    = document.getElementById('search-input');

        if (buscadorVentas) buscadorVentas.disabled = false;

        const botoneraHeader = [btnHeaderCatalogo, btnHeaderCobrar, btnHeaderConteo, btnHeaderCorte, btnHeaderReimpTicket, btnHeaderLogout];
        botoneraHeader.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.cursor = "";
                btn.style.opacity = "";
                btn.style.pointerEvents = ""; // Libera los clics fijos del POS
            }
        });
            limpiarFormularioModalArqueo();
    };
}

}


document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {	
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

// ====================================================================
//  Helpers  para  el  corte  por  periodos
// ====================================================================
function getLastCutISO() {
    const sesionObj = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
    const estacionLimpia = String(sesionObj.estacion || sesionObj.station || 'Principal').trim().replace(/\s+/g, '_');
    
    // Guarda llaves independientes como: "last_cut_date_Centro_Medico" o "last_cut_date_Chabacano_Linea_Cafe"
    return localStorage.getItem(`last_cut_date_${estacionLimpia}`);
}

function setLastCutISO(isoString) {
    const sesionObj = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
    const estacionLimpia = String(sesionObj.estacion || sesionObj.station || 'Principal').trim().replace(/\s+/g, '_');
    
    localStorage.setItem(`last_cut_date_${estacionLimpia}`, isoString);
}

// ====================================================================
// 🧹 FUNCIÓN DE PURGA: LIMPIEZA ABSOLUTA DEL MODAL DE ARQUEO A CEROS
// ====================================================================
function limpiarFormularioModalArqueo() {
    const idsCasillas = [
        'arq-b1000', 'arq-b500', 'arq-b200', 'arq-b100', 'arq-b50',
        'arq-m20', 'arq-m10', 'arq-m5', 'arq-m2', 'arq-m1'
    ];

    // 1. Ponemos el valor de cada input de billetes estrictamente en 0
    idsCasillas.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = 0;
    });

    // 2. Restablecemos el texto del visor negro a su estado inicial
    const visorTotal = document.getElementById('arqueo-ciegas-total');
    if (visorTotal) visorTotal.textContent = "$0.00";

    // 3. Volvemos a congelar el botón azul en gris preventivo para que no pase vacío
    const btnConfirmar = document.getElementById('btn-arqueo-confirmar-corte');
    if (btnConfirmar) {
        btnConfirmar.setAttribute('disabled', 'true');
        btnConfirmar.disabled = true;
        btnConfirmar.style.backgroundColor = '#cbd5e1';
        btnConfirmar.style.color = '#94a3b8';
        btnConfirmar.style.cursor = 'not-allowed';
        btnConfirmar.style.boxShadow = 'none';
    }
}



// ====================================================================
// 🏪 SISTEMA DE CORTES PERIMETRALES POR ESTACIÓN REAL (BLINDAJE TOTAL)
// ====================================================================
document.getElementById('btn-corte')?.addEventListener('click', () => {

    const sesionActiva = JSON.parse(sessionStorage.getItem('pos_user'));
    const cashierId = sessionStorage.getItem('pos_cashier');

    if (!sesionActiva) return;

    // 1. INMUNIDAD AUTOMÁTICA DE PRIVILEGIOS (ROLES MASTER / ADMIN)
    const rolActual = String(sesionActiva.role || sesionActiva.rol || 'vendedor').toLowerCase();
    const esMaestro = rolActual === 'master';

    // 👑 Si es el dueño o administrador, se brinca el arqueo a ciegas y abre directo tu confirmación nativa vieja
    if (esMaestro) {

        console.log("MeetFashion: Acceso Máster. Inmunidad de apertura concedida."); 
        return;
    }

    // 2. 🎯 CANDADO PERIMETRAL DE AUDITORÍA: BLOQUEO TOTAL DE BOTONES
    // Localizamos absolutamente todos los controles de la barra superior azul
    const buscadorVentas = document.getElementById('search-input');

    // Congelamos el input de código de barras para que no metan más mercancía
    if (buscadorVentas) {
        buscadorVentas.disabled = true;
    }

        // 🎯 EL NUEVO CANDADO ABSOLUTO PARA LOS BOTONES DEL HEADER:
        // Localizamos tus botones superiores por las etiquetas y textos nativos de tu barra azul
        const btnHeaderCatalogo = document.getElementById('btn-catalogo');
        const btnHeaderCobrar = document.getElementById('btn-cobrar');
        const btnHeaderConteo   = document.getElementById('btn-cashcount');
        const btnHeaderCorte    = document.getElementById('btn-corte');
        const btnHeaderReimpTicket    = document.getElementById('btn-reprint');
        const btnHeaderLogout    = document.getElementById('btn-logout');

        // Congelamos en masa los accesos superiores para evitar intrusiones visuales
        const botonesBloquear = [btnHeaderCatalogo, btnHeaderCobrar, btnHeaderConteo, btnHeaderCorte, btnHeaderReimpTicket, btnHeaderLogout];
        

    // 🔒 INHABILITACIÓN ABSOLUTA (INCLUYE CERRAR SESIÓN)
    // El script recorre la botonera superior, apaga los clics y baja la opacidad en masa
    botonesBloquear.forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.style.cursor = "not-allowed";
            btn.style.opacity = "0.4";
            btn.style.pointerEvents = "none"; // Elimina cualquier acción de clic en el navegador
        }
    });

    // 3. 🎯 ARRANQUE DINÁMICO DE TU NUEVO MODAL DE ARQUEO INDEPENDIENTE
    const modalArqueoNuevo = document.getElementById('modal-arqueo-ciegas');
    if (modalArqueoNuevo) {
        // Removemos tu clase hidden nativa para traerlo al frente de la pantalla
        modalArqueoNuevo.classList.remove('hidden');
        modalArqueoNuevo.style.display = 'flex'; // Forzamos el centrado flexible de la tarjeta
        
        // Inicializamos los escuchadores interactivos para las monedas de esta nueva caja
        inicializarCalculosReactivosNuevoArqueo();
    }
});

// ====================================================================
// 🏪 CONFIRMAR CORTE DE CAJA
// ====================================================================
document.getElementById('btn-arqueo-confirmar-corte')?.addEventListener('click', () => {

        // 🎯 LECTURA PREVENTIVA PRE-PURGA: Capturamos los datos del modal mientras siguen vivos en pantalla
        const textoVisorArqueo = document.getElementById('arqueo-ciegas-total')?.textContent || "$0.00";
        // Congelamos el número que el vendedor tecleó físicamente en la modal
        const granTotalEfectivoContadoReal = Number(textoVisorArqueo.replace(/[^0-9.-]+/g, "")) || 0;

        // Extraemos la estación exacta respetando mayúsculas y minúsculas directamente desde tu sesión activa
        const sesionActivaObj = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
        const estacionFondoTicket = String(sesionActivaObj.estacion || sesionActivaObj.station || 'Centro Medico').trim();
        const aliasFondoTicket = String(sessionStorage.getItem('pos_cashier') || '').trim().toLowerCase();

        // Jalamos el fondo inicial real usando la llave exacta combinada
        const jsonFondoTicket = localStorage.getItem(`fondo_apertura_${aliasFondoTicket}_${estacionFondoTicket.toLowerCase()}`);
        const fondoInicialTicketReal = jsonFondoTicket ? Number(JSON.parse(jsonFondoTicket).monto_fondo_real) : 1000;

        // Almacenamos temporalmente en el objeto global de la ventana para que el Bloque 2 lo lea limpio
        window.montoFisicoContadoSnapshot = granTotalEfectivoContadoReal;
        window.montoFondoInicialSnapshot = fondoInicialTicketReal;


        const modalArqueoNuevo = document.getElementById('modal-arqueo-ciegas');
        
        if (modalArqueoNuevo) {
            // 🔥 EL FIX MAESTRO: Apagamos el estilo en línea y añadimos tu clase nativa
            // Esto destruye cualquier persistencia visual en el navegador de inmediato
            modalArqueoNuevo.style.display = "none"; 
            modalArqueoNuevo.classList.add('hidden');
        }

        // 2. REVERSIÓN DE BOTONES: Devolvemos la vida a los controles generales
        // para que tu modal nativo de "¿Ejecutar corte?" reciba los clics sin trabas
        document.querySelectorAll('button').forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.cursor = "";
                btn.style.opacity = "";
                btn.style.pointerEvents = "auto";
            }
        });

        // 2. REVERSIÓN DE SEGURIDAD: Le devolvemos la interacción a tu barra superior azul
        // para que la vendedora pueda seguir cobrando o navegando si decidió no cerrar la caja

        const btnHeaderCatalogo = document.getElementById('btn-catalogo');
        const btnHeaderCobrar = document.getElementById('btn-cobrar');
        const btnHeaderConteo   = document.getElementById('btn-cashcount');
        const btnHeaderCorte    = document.getElementById('btn-corte');
        const btnHeaderReimpTicket    = document.getElementById('btn-reprint');
        const btnHeaderLogout    = document.getElementById('btn-logout');

        const buscadorVentas    = document.getElementById('search-input');

        if (buscadorVentas) buscadorVentas.disabled = false;

        const botoneraHeader = [btnHeaderCatalogo, btnHeaderCobrar, btnHeaderConteo, btnHeaderCorte, btnHeaderReimpTicket, btnHeaderLogout];
        botoneraHeader.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.cursor = "";
                btn.style.opacity = "";
                btn.style.pointerEvents = ""; // Libera los clics fijos del POS
            }
        });



        const cashierId = sessionStorage.getItem('pos_cashier');
        const now = new Date();

        // Desde: el último corte; si no existe, inicio del día
        const lastCutISO = getLastCutISO();
        const desde = lastCutISO ? new Date(lastCutISO) : new Date(new Date().setHours(0,0,0,0));
        const hasta = now;

        // ====================================================================
        // 🔥 VARIABLES UNIFICADAS: Extracción segura de la sesión activa
        // ====================================================================
        const sucursalSesionActual = String(sesionActivaObj.estacion || sesionActivaObj.station || 'Salto del Agua').trim().toLowerCase();

        // 🔥 FILTRADO CRÍTICO DE ALTA FIDELIDAD SIN ERRORES DE VARIABLE
        const ventasPeriodo = DB.getSales().filter(v => {
            const f = new Date(v.fecha);
            
            // 1. Validación básica de tiempo y cajero
            const cumpleBasicos = f >= desde && f <= hasta && v.cashier === cashierId;
            if (!cumpleBasicos) return false;

            // 2. Extracción y cruce de la estación del ticket o perfil para amarrar la sucursal
            let sucursalTicketCalculada = String(v.station || v.estacion || '').trim().toLowerCase();
            
            // Si la venta individual no tiene grabada la estación (contingencia), la cruzamos contra el catálogo de usuarios
            if (!sucursalTicketCalculada) {
                const listaUsuariosDB = DB.getUsers ? DB.getUsers() : (JSON.parse(localStorage.getItem('usuarios')) || []);
                const empleado = listaUsuariosDB.find(x => x.user === v.cashier);
                sucursalTicketCalculada = empleado ? String(empleado.estacion || empleado.station).trim().toLowerCase() : sucursalSesionActual;
            }

            // 🎯 COMPARACIÓN UNIFICADA PERFECTA: El ticket entra al corte si coincide con tu terminal de sesión
            return sucursalTicketCalculada === sucursalSesionActual;
        });

        // ====================================================================
        // 🔥 ACUMULADORES MULTICANAL CON CÁLCULO DE CAMBIO INTEGRADO
        // ====================================================================
        let totalCashBruto = 0, totalCard = 0, totalTransfer = 0, totalIngresos = 0;
        let totalCambioEntregado = 0; // Acumulador dinámico de cambios entregados
        const articleMap = {};
 
        // 1) Acumula totales por método, total de ventas y deduce el cambio al vuelo
        ventasPeriodo.forEach(v => {
            const efec   = Number(v.payments?.efectivo || 0);
            const tarj   = Number(v.payments?.tarjeta || 0);
            const transf = Number(v.payments?.transferencia || 0);
            const total  = Number(v.total || v.monto || 0);

            totalCashBruto += efec;
            totalCard      += tarj;
            totalTransfer  += transf;
            totalIngresos  += total;

            // DEDUCCIÓN MULTICANAL AL VUELO: Si lo ingresado supera el costo de la nota, hubo cambio en efectivo
            let cambioTicket = (efec + tarj + transf) - total;
            if (cambioTicket > 0) {
                totalCambioEntregado += cambioTicket;
            }
        });

        // 🎯 BALANCE CONTABLE FINAL: El efectivo neto real es el recibido menos el cambio entregado
        const efectivoNetoRealCaja = totalCashBruto - totalCambioEntregado;

        // 2) Mantén tu cálculo de artículos tal cual (No se mueve ni se mezcla)
        ventasPeriodo.forEach(v => {
            (v.items || []).forEach(it => {
                const qty   = it.cantidad || it.qty || 1;
                const price = it.precio     || 0;
                const key   = `${it.codigo}|${it.nombre}`;
                if (!articleMap[key]) articleMap[key] = { nombre: it.nombre, qty: 0, monto: 0 };
                articleMap[key].qty     += qty;
                articleMap[key].monto   += price * qty;
            });
        });

        // 3. Estructuramos el objeto del corte restando el cambio e inyectando las nuevas propiedades
        const corte = {
            fecha: new Date().toLocaleString("sv-SE"),
            usuario: currentUser?.user || cashierId || '—',
            estacion: currentUser?.estacion || currentUser?.station || 'Salto del Agua',
            turno: currentUser?.turno || '—',
            tickets: ventasPeriodo.length,
            totalCash: efectivoNetoRealCaja, // Se guarda el efectivo NETO real en la base de datos
            totalCambio: totalCambioEntregado, // Guardamos el cambio de auditoría
            totalCard,
            totalTransfer,
            totalIngresos,
            articulos: articleMap
        };

        DB.saveCut(corte);
        setLastCutISO(now.toISOString());

        // ====================================================================
        // 🔒 FIX: CONGELAMIENTO PERIMETRAL POST-CORTE INMEDIATO (ANTI-INTRUSIÓN)
        // Evita que la cajera abra catálogos mientras el ticket de corte está visible
        // ====================================================================
        const topbarRightContainer = document.querySelector('.topbar-right');
        if (topbarRightContainer) {
            // Inmovilizamos por completo todo el bloque derecho superior de tu mostrador
            topbarRightContainer.style.pointerEvents = "none"; 
            topbarRightContainer.style.opacity = "0.4"; // Se atenúa visualmente indicando cierre
        }

        // Liberamos única y exclusivamente el botón de Cerrar Sesión para salir seguro
        const btnHeaderLogoutVal = document.getElementById('btn-logout');
        if (btnHeaderLogoutVal) {
            btnHeaderLogoutVal.style.pointerEvents = "auto";
            btnHeaderLogoutVal.style.opacity = "1";
            btnHeaderLogoutVal.style.cursor = "pointer";
        }

        // Activamos de inmediato el escudo contra los atajos físicos del teclado (F2 y F5)
        window.bloqueoTecladoTurnoActivo = true;
       
        // ====================================================================
        // 🔒 LA PURGA RADICAL DEL LOCALSTORAGE CORREGIDA CON TUS VARIABLES REALES
        // Normalizamos tus variables exactas para dar con la llave en minúsculas
        // ====================================================================
        const usuarioLimpioCorte  = String(cashierId || '').trim().toLowerCase();
        const sucursalLimpiaCorte = String(sucursalSesionActual || '').trim().toLowerCase();

        // Construimos la plantilla de texto idéntica sin variables huérfanas
        const llaveFondoAPurgar = `fondo_apertura_${usuarioLimpioCorte}_${sucursalLimpiaCorte}`;
        
        // Destruimos el candado de la base de datos local al vuelo
        localStorage.removeItem(llaveFondoAPurgar);
        sessionStorage.removeItem('monto_fisico_contado_arqueo_ciegas');
        
        console.log(`🧹 [MeetFashion]: Llave de apertura eliminada con éxito: ${llaveFondoAPurgar}`);

        // ====================================================================
        // 🧾 CONSTRUIR HTML DEL TICKET TÉRMICO CON FILA DE CAMBIO INYECTADA
        // ====================================================================
        // ====================================================================
        // 🧾 CONSTRUIR HTML DEL TICKET TÉRMICO CON HOJA DE ESTILOS @MEDIA PRINT
        // Rompe los scrolls de pantalla para estirar el papel térmico de forma continua
        // ====================================================================
                // ====================================================================
                // 📊 BLOQUE 2: CONSUMO DE SNAPSHOT DE AUDITORÍA SIN PERSISTENCIA
                // ====================================================================
                const granTotalEfectivoContado = window.montoFisicoContadoSnapshot || 0;

                // Dinero que el sistema esperaba físicamente en la gaveta
                const efectivoEsperadoSistema = fondoInicialTicketReal + efectivoNetoRealCaja;
                const diferenciaDescuadreFinal = granTotalEfectivoContado - efectivoEsperadoSistema;

                // Anexamos las propiedades al objeto corte para que se graben solas en tu base de datos de reportes
                corte.fondo_inicial = fondoInicialTicketReal;
                corte.ventas_sistema = efectivoNetoRealCaja;
                corte.get_efectivo_contado = granTotalEfectivoContado;
                corte.diferencia = diferenciaDescuadreFinal;

                // Calculamos el gran total del corte sumando las ventas globales del turno más el fondo de cambio
                const granTotalAcumuladoCaja = totalIngresos + fondoInicialTicketReal;

		let textoDiferenciaDinámica = "";
		let colorDiferenciaDinámica = "#16a34a"; // Verde por defecto

		if (diferenciaDescuadreFinal === 0) {
		    textoDiferenciaDinámica = "CUADRADO";
		} else if (diferenciaDescuadreFinal > 0) {
		    // Si es dinero de más, forzamos el color verde y le inyectamos el símbolo "+"
		    colorDiferenciaDinámica = "#16a34a";
		    textoDiferenciaDinámica = "+" + fmtMX(diferenciaDescuadreFinal);
		} else {
		    // Si es dinero de menos (negativo), cambia a rojo de advertencia
		    colorDiferenciaDinámica = "#dc2626";
		    textoDiferenciaDinámica = fmtMX(diferenciaDescuadreFinal); // Ya incluye el signo "-" nativo
		}

     let html = `
        <!-- 🔥 BLOQUE DE INTELIGENCIA DE IMPRESIÓN TERMICA -->
        <style>
            @media print {
                body, html { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
                .ticket-thermal-wrapper { display: block !important; height: auto !important; max-height: none !important; padding: 0 !important; }
                .seccion-articulos-scroll { overflow-y: visible !important; max-height: none !important; height: auto !important; border: none !important; }
                .bloque-auditoria-bg { background: #ffffff !important; border: 1px dashed #cbd5e1 !important; }
                .total-venta-badge { background: #ffffff !important; border: 2px solid #000000 !important; color: #000000 !important; }
            }
        </style>

        <div class="ticket-thermal-wrapper" style="width: 100%; display: flex; flex-direction: column; height: 100%; max-height: 85vh; padding: 4px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; box-sizing: border-box;">
            
            <!-- 📁 PARTE RECTILÍNEA SUPERIOR FIJA: Información del Turno y Métodos de Pago -->
            <div style="flex-shrink: 0; background: #ffffff; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                
                <!-- 🏢 ENCABEZADO CORPORATIVO -->
          <div style="text-align: center; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
                    <!-- Título de la Marca Principal -->
                    <h2 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">MEET FASHION</h2>
                    
                    <!-- 🎯 EL FIX MAESTRO EN UNA SOLA LÍNEA DE ALTA FIDELIDAD -->
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 0 2px;">
                        
                        <!-- Insignia Azul Imantada Perfectamente a la Izquierda -->
                        <span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; margin: 0;">
                            Corte de Caja
                        </span>
                        
                        <!-- Fecha y Hora Imantada Perfectamente a la Derecha -->
                        <span style="font-size: 11px; color: #64748b; font-weight: 500; white-space: nowrap; text-align: right; margin: 0;">
                            ${now.toLocaleString()}
                        </span>

                    </div>
                </div>

                <!-- 📊 BLOQUE DE AUDITORÍA INFORMATIVO -->
                <div class="bloque-auditoria-bg" style="background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between;"><span style="color: #64748b; font-weight: 500;">Estación:</span> <strong style="color: #0f172a;">${corte.estacion}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #64748b; font-weight: 500;">Usuario:</span> <span style="font-weight: 600;">${cashierId}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #64748b; font-weight: 500;">Turno:</span> <span style="text-transform: capitalize; font-weight: 600;">${corte.turno}</span></div>
                    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 3px 0;">
                    <div style="font-size: 10px; color: #64748b; text-align: center; font-weight: 500; line-height: 1.3;">Periodo: ${desde.toLocaleString()} ➔ ${hasta.toLocaleString()}</div>
                </div>

                <!-- 💵 DESGLOSE FINANCIERO DE PRECISIÓN -->
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px; padding: 2px;">
                    
                    <!-- 🎯 TU NUEVO ITEM SOLICITADO: Fondo con el que se inició el turno -->
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #475569; font-weight: 500;">🪙 Fondo de Cambio Inicial:</span> 
                        <strong style="color: #0f172a;">${fmtMX(fondoInicialTicketReal)}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #475569; font-weight: 500;">💵 Efectivo bruto recibido:</span> 
                        <strong style="color: #0f172a;">${fmtMX(totalCashBruto)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444; font-size: 11.5px; padding-left: 4px;">
                        <span>↳ Cambio Entregado:</span> 
                        <span style="font-weight: 600;">-${fmtMX(totalCambioEntregado)}</span>
                    </div>
                    <!-- 🎯 ITEM NUEVO 1: Efectivo Físico Contado Declarado por el Vendedor -->
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #0066ff;">
                        <span>✓ Efectivo Físico Contado:</span> 
                        <span style="font-weight: 700;">${fmtMX(granTotalEfectivoContado)}</span>
                    </div>

                    <!-- 🎯 ITEM NUEVO 2: Diferencia / Descuadre de Auditoría Dinámico -->
                    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: ${colorDiferenciaDinámica};">
                        <span>⚠️ Diferencia / Descuadre:</span> 
                        <span>${textoDiferenciaDinámica}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #475569; font-weight: 500;">💳 Tarjeta:</span> 
                        <span style="font-weight: 600; color: #475569;">${fmtMX(totalCard)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="color: #475569; font-weight: 500;">📲 Transferencia:</span> 
                        <span style="font-weight: 600; color: #475569;">${fmtMX(totalTransfer)}</span>
                    </div>
                    
                    <!-- 👑 GRAN TOTAL ACTUALIZADO: Sumatoria de la Venta Total + el Fondo Inicial -->
                    <div class="total-venta-badge" style="display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; padding: 6px 10px; border-radius: 6px; border: 1px solid #bbf7d0; margin-top: 2px;">
                        <span style="color: #166534; font-weight: 700; font-size: 12px;">TOTAL CORTE FINAL:</span> 
                        <span style="color: #15803d; font-size: 16px; font-weight: 800;">${fmtMX(granTotalAcumuladoCaja)}</span>
                    </div>
                </div>
            </div>
            
            <!-- 🛍️ SECCIÓN DINÁMICA CON SCROLL EXCLUSIVO -->
            <div class="seccion-articulos-scroll" style="flex-grow: 1; overflow-y: auto; padding-right: 4px; margin-bottom: 6px; max-height: 40vh; border-bottom: 1px solid #f1f5f9;">
        `;
        if (ventasPeriodo.length > 0) {
            html += `
            <h4 style="margin: 4px 0 6px 0; font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Prendas / Artículos vendidos</h4>
            <div style="display: flex; flex-direction: column; gap: 5px;">
            `;
            
            Object.values(articleMap).forEach(a => {
                html += `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 11.5px; border-bottom: 1px solid #f8fafc; padding-bottom: 4px;">
                    <span style="color: #334155; font-weight: 500; max-width: 75%, line-height: 1.2;">${a.nombre} <span style="color: #0066ff; font-weight: 700; margin-left: 2px;">x${a.qty}</span></span>
                    <span style="font-weight: 600; color: #0f172a;">${fmtMX(a.monto)}</span>
                </div>`;
            });
            
            html += `</div>`;
        } else {
            html += `<div style="text-align: center; color: #64748b; font-size: 11.5px; padding: 12px 0;">Sin ventas en el periodo.</div>`;
        }

        // 🏷️ COMPLEMENTO INFERIOR FIJO: Clientes y Pie de página
        html += `
            </div> <!-- CIERRE DEL SCROLL DE ARTÍCULOS -->
            
            <div style="flex-shrink: 0; padding-top: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; font-weight: 500;">
                    <span>Clientes atendidos (tickets):</span> 
                    <strong style="color: #0f172a; font-size: 12px;">${ventasPeriodo.length}</strong>
                </div>
                <div style="text-align: center; margin-top: 10px; font-size: 10px; font-weight: 600; color: #cbd5e1; letter-spacing: 0.5px; text-transform: uppercase;">MeetFashion POS</div>
            </div>
        </div>`;


        // Pintar en preview (sobre producto-preview)
        const preview = document.getElementById('producto-preview');
        if (preview) {
            preview.innerHTML = html;
            preview.style.overflow = 'auto';
            preview.style.padding = '12px';
            preview.style.background = '#fff';
            preview.style.border = '1px solid #eee';
        }

        const printCorte = document.getElementById('modal-print-corte');

        // Flujo de impresión intacto
        if(printCorte) {
            printCorte.classList.remove('hidden');
            const onYes = () => {
                if (typeof window.printTicketHTML === 'function') {
                    window.printTicketHTML(html);
                } else {
                    const w = window.open('', '_blank');
                    w.document.write(html);
                    w.document.close();
                    w.print();
                    w.close();
                }
                printCorte.classList.add('hidden');
            }

            const onNo = () => { 
                printCorte.classList.add('hidden');
            };

            document.getElementById('corte-print-yes').onclick = onYes;
            document.getElementById('corte-print-no').onclick = onNo;
        }

        setLastCutISO(now.toISOString());

        cart = [];
        recalc();
        renderCart();
        updatePaymentsDisplay();

        // 🎯 GATILLO DE LIMPIEZA FINAL POST-RENDER: Vaciamos el modal de arqueo de forma segura al cierre
        if (typeof limpiarFormularioModalArqueo === 'function') {
            limpiarFormularioModalArqueo();
        }

        // Purgamos las variables efímeras de la memoria temporal
        delete window.montoFisicoContadoSnapshot;
        delete window.montoFondoInicialSnapshot;

});

// ====================================================================
// 🧾 REIMPRIMIR UN TICKET
// ====================================================================
document.getElementById('btn-reprint')?.addEventListener('click', () => {
  // 1. Abrimos el modal quitando la clase hidden
  el.reimpModal && el.reimpModal.classList.remove('hidden');
  
  // 2. Sincronización nativa de tu ticket: asigna por defecto el último ticket cobrado
  const last = DB.getSales ? DB.getSales() : [];
  if (el.reimpTicket) {
      // Sugerimos el último folio real de la base de datos o lo dejamos limpio
      el.reimpTicket.value = last && last.length > 0 ? (last[0].ticket || last[0].id || '') : '';
  }

  // 3. Sincronización directa de la Estación en el input real
  const inputEstacionModal = document.getElementById('reimp-station');
  if (inputEstacionModal) {
      const sesionActiva = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
      inputEstacionModal.value = sesionActiva.estacion || sesionActiva.station || 'Salto del Agua';
      inputEstacionModal.readOnly = true;
  }

  // ====================================================================
  // 🔥 CORRECCIÓN 1: LIMPIEZA TOTAL DE HISTORIAL AL ABRIR EL MODAL
  // ====================================================================
  const previewContenedor = el.reimpPreview || document.getElementById('reimp-preview');
  if (previewContenedor) {
      // Borramos por completo el ticket anterior o las alertas rojas de bloqueo previas
      previewContenedor.innerHTML = '<div style="color:#64748b; font-size:12px; text-align:center; padding-top:40px; font-family:sans-serif;">Esperando búsqueda de ticket...</div>';
  }

  // ====================================================================
  // 🔥 CORRECCIÓN 2: FORZAR BOTÓN INHABILITADO EN GRIS AL ARRANCAR
  // ====================================================================
  const botonImprimirReal = document.getElementById('reimp-print') || el.reimpPrint;
  if (botonImprimirReal) {
      botonImprimirReal.disabled = true;
      botonImprimirReal.style.backgroundColor = '#cbd5e1'; // Gris limpio de auditoría
      botonImprimirReal.style.color = '#94a3b8';
      botonImprimirReal.style.cursor = 'not-allowed';
  }
});

// ====================================================================
// ENLACE PARA REDIRECCIONAR A INVENTARIOS
// ====================================================================
document.getElementById('btn-open-inventory')?.addEventListener('click', () => {
    window.location.href = 'inventarios.html';
});


// ====================================================================
// 🔒 LIMPIADO DEL PREVIEW DEL CORTE CON PURGA DE CAJA INTEGRADA
// ====================================================================
const previewBox = document.getElementById('producto-preview');
 
if (previewBox) {
    // Guardar el HTML original (el logo)
    previewBox.dataset.originalHtml = previewBox.innerHTML;
 
    // Hacerlo focusable
    previewBox.setAttribute('tabindex', '0');
 
    // Al hacer click, darle foco
    previewBox.addEventListener('click', () => previewBox.focus());

    // Escuchar tecla Supr/Delete
    document.addEventListener('keydown', (e) => {
        const isDelete = e.key === 'Delete' || e.key === 'Backspace';
        
        if (isDelete && document.activeElement === previewBox) {
            e.preventDefault();
            
            // 1. Restaurar el logo original de tu diseño intacto
            previewBox.innerHTML = previewBox.dataset.originalHtml;

            // 2. 🔥 EL CANDADO ABSOLUTO POST-CIERRE:
            // Forzamos una recarga limpia profunda de la ventana del navegador.
            // Al refrescar la pantalla, tu método 'validarBloqueoAperturaCaja()' se 
            // ejecutará al milisegundo cero, leerá 'false' en el LocalStorage porque 
            // el corte ya eliminó el fondo, congelará la barra superior azul y 
            // desplegará de forma obligatoria tu modal de billetes para la nueva jornada.
            window.location.reload();
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

// ====================================================================
// 🔍 // init display CORREGIDO: CALCULO DE CONSECUTIVO REAL DESDE DISCO
// ====================================================================
const listaVentasHistorial = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem('ventas')) || []);
// Si tu última venta exitosa es la 137, el consecutivo real es estrictamente el 138
const consecutivoRealCalculado = listaVentasHistorial.length + 1;

// Sincronizamos de forma obligatoria las variables globales y de sesión para limpiar los folios inflados
ticketSeq = consecutivoRealCalculado;
sessionStorage.setItem('pos_ticket_seq', consecutivoRealCalculado.toString());

if (el.ticketNum) {
    el.ticketNum.textContent = `Ticket: #${String(consecutivoRealCalculado).padStart(6, '0')}`;
}

renderResults(catalog); // pondrá lista en #results (oculto)
recalc();
updatePaymentsDisplay();

