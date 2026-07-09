// reportes.js – usa DB global, no módulos

const hoyBtn = document.getElementById("btn-hoy");
const listaHoy = document.getElementById("lista-hoy");
const fechaDesde = document.getElementById("desde");
const fechaHasta = document.getElementById("hasta");
const buscarBtn = document.getElementById("btn-buscar");
const listaFechas = document.getElementById("lista-fechas");

const  tipoReporte  = document.getElementById("tipo-reporte");
const  exportarBtn  =  document.getElementById("btn-exportar");
let  datosFiltrados  =  [];  // ←  guarda  el  resultado  para  exportar


// 1. Obtención segura del usuario activo en la terminal
const activeReportUserSession = JSON.parse(sessionStorage.getItem('pos_user')) || null;

// ====================================================================
// 🔒 CONTROL PERIMETRAL Y CANDADOS DE AUDITORÍA PARA REPORTES (TICKETS FIX)
// ====================================================================

function aplicarCandadosSeccionReportes() {
    // 1. Extraemos el alias de la cajera en sesión actual
    const cashierId = sessionStorage.getItem('pos_cashier');
    const activeReportUserSession = JSON.parse(sessionStorage.getItem('pos_user')) || null;
    
    if (!cashierId || !activeReportUserSession) {
        window.location.replace('ventas.html');
        return;
    }

    // 2. 🔥 CONSULTA CRÍTICA AL DISCO DURO: Buscamos los permisos vigentes reales
    const listaUsuariosDB = DB.getUsers ? DB.getUsers() : (JSON.parse(localStorage.getItem('usuarios')) || []);
    const usuarioVigente = listaUsuariosDB.find(x => (x.user || x.usuario) === cashierId);

    const rolLogueado = String(usuarioVigente ? (usuarioVigente.role || usuarioVigente.rol) : (activeReportUserSession.role || activeReportUserSession.rol || '')).toLowerCase();
    const aliasLogueado = String(cashierId).toLowerCase();
    
    // 👑 INMUNIDAD MASTER: El dueño general hereda acceso automático
    const esMaestro = rolLogueado === 'master' || aliasLogueado === 'sup' || aliasLogueado === 'admin';

    // Recuperamos las variables del objeto de permisos fresco del disco
    const p = esMaestro ? { ver: true, ventas: true, cortes: true, tickets: true, exportar: true } : (usuarioVigente?.permisos?.reportes || {});

    // Localizamos tus elementos utilizando tus IDs reales
    const optVentas    = document.getElementById('opt-perm-ventas');
    const optCortes    = document.getElementById('opt-perm-cortes');
    const optTickets   = document.getElementById('opt-perm-tickets'); // 🎯 TU NUEVO ID DE TICKETS
    const btnExportar  = document.getElementById('btn-exportar');
    const selectReport = document.getElementById('tipo-reporte');

    // --- CANDADO 1: PERMISO PARA VER VENTAS ---
    if (optVentas && !esMaestro && !p.ventas) {
        optVentas.remove(); 
    }

    // --- CANDADO 2: PERMISO PARA VER CORTES ---
    if (optCortes && !esMaestro && !p.cortes) {
        optCortes.remove(); 
    }

    // --- 🎯 CANDADO 3: PERMISO PARA REIMPRESIÓN / TICKETS ---
    if (optTickets && !esMaestro && !p.tickets) {
        optTickets.remove(); // Remueve la opción si está apagada en el árbol
    }

    // PROTECCIÓN DE INTERFAZ VACÍA:
    if (selectReport && selectReport.options.length === 0) {
        const optVacio = document.createElement("option");
        optVacio.textContent = "Módulo Restringido";
        optVacio.disabled = true;
        optVacio.selected = true;
        selectReport.appendChild(optVacio);
        
        const btnBuscar = document.getElementById('btn-buscar');
        if (btnBuscar) btnBuscar.disabled = true;
    }

    // --- CANDADO 4: PERMISO PARA EXPORTAR CSV ---
    if (btnExportar) {
        btnExportar.style.display = (esMaestro || p.exportar) ? '' : 'none';
    }
}

// 3. ENLAZAR ARRANQUE AUTOMÁTICO EN EL DOM
document.addEventListener("DOMContentLoaded", () => {
    aplicarCandadosSeccionReportes();
});



buscarBtn.addEventListener("click", buscarPorFechas);


function  toggleDetalle(id)  {
   const  row  = document.getElementById(id);
    if (row)  row.classList.toggle("hidden");
}

 function  splitFechaHora(isoOrLocale)  {
    //  Acepta  ISO  ("2025-12-16T03:53:17.718Z") o  locales,  y  devuelve  [YYYY-MM-DD, HH:mm:ss]
     const  d =  new  Date(isoOrLocale);
    const  yyyy  =  String(d.getFullYear());
    const  mm  =  String(d.getMonth() +  1).padStart(2,  '0');
    const  dd  =  String(d.getDate()).padStart(2,  '0');
    const  HH  = String(d.getHours()).padStart(2,  '0');
     const MM  =  String(d.getMinutes()).padStart(2,  '0');
    const  SS  =  String(d.getSeconds()).padStart(2, '0');
     return  [`${yyyy}-${mm}-${dd}`, `${HH}:${MM}:${SS}`];
 }
 
 function  mxFechaHora(isoOrLocale) {
     //  Si necesitas  formato  MX  en  pantalla
    const  d  = new  Date(isoOrLocale);
     const fecha  =  d.toLocaleDateString('es-MX');
    const  hora  =  d.toLocaleTimeString('es-MX',  { hour12:  false  }).slice(0,8);
    return  [fecha,  hora];
 }

// ====================================================================
// BUSCADOR
// ====================================================================
function buscarPorFechas() {
   if (!fechaDesde.value || !fechaHasta.value) {
       alert("Selecciona ambas fechas");
       return;
   }

   const ini = new Date(fechaDesde.value + "T00:00:00");
   const fin = new Date(fechaHasta.value + "T23:59:59");
   const tipo = tipoReporte.value;

   // Cerramos cualquier panel de detalle derecho abierto por seguridad al hacer nueva búsqueda
   if (typeof cerrarDetalle === "function") cerrarDetalle();

   // ====================================================================
   // 🔥 CONTROL REQUERIDO: Ocultar o mostrar el botón AL PRESIONAR BUSCAR
   // ====================================================================
   const btnExportarGlobal = document.getElementById('btn-exportar');
   if (btnExportarGlobal) {
       if (tipo === "tickets") {
           // Si se procesa la búsqueda de Tickets, se remueve el botón del flujo visual
           btnExportarGlobal.style.display = 'none';
       } else {
           // Si se procesan Cortes o Ventas tradicionales, se garantiza su visibilidad
           btnExportarGlobal.style.display = '';
       }
   }

   if (tipo === "ventas") {
       const ventas = DB.getSales();
       datosFiltrados = ventas.filter(v => {
           const f = new Date(v.fecha);
           return f.getTime() >= ini.getTime() && f.getTime() <= fin.getTime();
       });
       renderVentas(datosFiltrados, listaFechas);
       
   } else if (tipo === "tickets") {
       const ventas = DB.getSales();
       datosFiltrados = ventas.filter(v => {
           const f = new Date(v.fecha);
           return f.getTime() >= ini.getTime() && f.getTime() <= fin.getTime();
       });
       renderTickets(datosFiltrados, listaFechas);
       
   } else {
       const cortes = DB.getCuts();
       datosFiltrados = cortes.filter(c => {
          const f = new Date(c.fecha);
           return f.getTime() >= ini.getTime() && f.getTime() <= fin.getTime();
       });
       renderCortes(datosFiltrados, listaFechas);
    }
}




/* ========================================================
   RENDER PARA LA BUSQUEDA DE VENTAS
   ======================================================== */
 function  renderVentas(arr,  destino) {
     destino.innerHTML =  "";
 
    if  (arr.length  === 0)  {
        destino.innerHTML  = `<div  class="empty">No  hay  registros.</div>`;
       return;
     }

     let total  =  0;
    let  html  = `<table  class="table">
        <tr><th>Fecha</th><th>Hora</th><th>Producto</th><th>Código</th><th>Cantidad</th><th>Total</th></tr>`;
 
    arr.forEach(v  => {
        const  [fecha,  hora] =  v.fecha.split("T");
        const  horaFmt =  hora.slice(0,8);
        total  += v.total;
 
        (v.items  || []).forEach(it  =>  {
           const  qty  = it.cantidad  ||  it.qty  || 1;
            html +=  `
               <tr>
                  <td>${fecha}</td>
                  <td>${horaFmt}</td>
                   <td>${it.nombre}</td>
                  <td>${it.codigo}</td>
                  <td>${qty}</td>
                  <td>${(it.precio  *  qty).toFixed(2)}</td>
               </tr>`;
       });
     });

     html +=  `</table>`;
    destino.innerHTML  =  html;
}


/* ========================================================
   RENDER PARA LA BUSQUEDA DE CORTES
   ======================================================== */
 function  renderCortes(arr,  destino)  {
    destino.innerHTML  =  "";

     if  (arr.length ===  0)  {
        destino.innerHTML  =  `<div class="empty">No  hay  cortes  en  ese rango.</div>`;
        return;
     }
 
    let  html  = `<table  class="table">
        <tr>
            <th>Fecha</th>
           <th>Hora</th>
            <th>Usuario</th>
            <th>Estación</th>
           <th>Tickets</th>
            <th>Efectivo</th>
           <th>Tarjeta</th>
            <th>Transferencia</th>
            <th>Total</th>
        </tr>`;

     arr.forEach((c,  i) =>  {
        const  [fechaMX,  horaMX]  = mxFechaHora(c.fecha);  //  pantalla  MX
        const  detalleId =  `detalle-corte-${i}`;
 
        const  articulos  = c.articulos  &&  typeof  c.articulos  === "object"
            ?  Object.values(c.articulos)
           :  [];
 
        const  detalleHTML  = articulos.length
            ?  `<ul  style="margin:0;padding-left:20px;">
                  ${articulos.map(a  =>  {
                      const  nombre  =  a?.nombre  ?? "—";
                       const  qty =  Number(a?.qty  ||  0);
                      const  monto  =  Number(a?.monto ||  0);
                       return `<li>${nombre}  —  ${qty}  —  $${monto.toFixed(2)}</li>`;
                  }).join("")}
                </ul>`
           :  `<div  style="color:#666">Sin  artículos en  este  corte</div>`;
 
        html  += `
            <tr  class="corte-row"  tabindex="0" onclick="mostrarDetalle(${JSON.stringify(c).replace(/"/g,  '&quot;')}, this)">
               <td>${fechaMX}</td>
                <td>${horaMX}</td>
               <td>${c.usuario  || "—"}</td>
                <td>${c.estacion ||  "—"}</td>
               <td>${Number(c.tickets  ||  0)}</td>
               <td>${Number(c.totalCash  ||  0).toFixed(2)}</td>
               <td>${Number(c.totalCard  ||  0).toFixed(2)}</td>
               <td>${Number(c.totalTransfer  || 0).toFixed(2)}</td>
                <td>${Number(c.totalIngresos ||  0).toFixed(2)}</td>
            </tr>
           <tr  id="${detalleId}"  class="hidden">
               <td  colspan="9">
                   <div><strong>Artículos  vendidos:</strong></div>
                  ${detalleHTML}
                </td>
           </tr>`;
     });

     html  += `</table>`;
     destino.innerHTML  = html;
 
     const firstRow  =  destino.querySelector(".corte-row");
    if  (firstRow)  firstRow.focus();
 }


// ========================================================
// RELLENAR EL PANEL LATERAL DE CORTES
// ========================================================
function mostrarDetalle(c, elementoFila) { // <-- Usa tus variables nativas del archivo original
    // 1. Mantén tu lógica original para prender y apagar el color azul de la fila clickeada:
    document.querySelectorAll('.corte-row').forEach(tr => tr.classList.remove('fila-seleccionada'));
    if (elementoFila) elementoFila.classList.add('fila-seleccionada');

    const panelTitulo = document.getElementById('detalle-fecha');
    const panelContenido = document.getElementById('detalle-contenido');

    if (panelTitulo && panelContenido) {
        const [fechaMX, horaMX] = mxFechaHora(c.fecha);
        
        // Sincronizamos el título fijo del panel
        panelTitulo.innerHTML = `📊 Corte del ${fechaMX} - ${horaMX}`;

        // Mapeamos los artículos vendidos de forma idéntica
        const articulos = c.articulos && typeof c.articulos === "object" ? Object.values(c.articulos) : [];
        let listaProductosHtml = "";
        
        articulos.forEach(a => {
            const nombre = a?.nombre ?? "—";
            const qty = Number(a?.qty || 0);
            const monto = Number(a?.monto || 0);
            listaProductosHtml += `<li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">• <strong>${nombre}</strong> — ${qty} pzas — <span style="font-weight:600;">$${monto.toFixed(2)}</span></li>`;
        });

// BUSCA TU FUNCIÓN mostrarDetalle Y ACTUALIZA EL BLOQUE DE CÁLCULO ASÍ:

        // 🔍 MÓDULO MATEMÁTICO MULTICANAL DE ALTA PRECISIÓN (Consola Sincronizada)
        const brutoEfectivo   = Number(c.totalCash || 0);
        const netoTarjeta      = Number(c.totalCard || 0);
        const netoTransfer     = Number(c.totalTransfer || 0);
        const ingresosTotales  = Number(c.totalIngresos || 0);
        
        // 🔥 FÓRMULA SUPREMA DE DESCARTE MULTICANAL AL VUELO:
        // Sumamos todo el dinero bruto que ingresó al sistema y le restamos lo que costó la nota real.
        // El excedente es, por ley matemática, el cambio entregado.
        let cambioEntregadoTotal = (brutoEfectivo + netoTarjeta + netoTransfer) - ingresosTotales;
        
        // Candado preventivo por si el cambio da un número negativo por micro-redondeos
        if (cambioEntregadoTotal < 0) cambioEntregadoTotal = 0;

        // 🎯 EL CASH NETO REAL: El efectivo físico real limpio que se queda en el cajón de monedas
        const efectivoNetoRealCaja = brutoEfectivo - cambioEntregadoTotal;

        // RE-ESTRUCTURACIÓN COMPLETA UNIFICADA CON LA FILA DE CAMBIO MULTICANAL
        panelContenido.innerHTML = `
            <div class="ticket-info-wrapper">
                <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:15px; font-size:12px; border:1px solid #e2e8f0; line-height:1.6;">
                    <p style="margin:4px 0;"><strong>Usuario Responsable:</strong> ${c.usuario || '—'}</p>
                    <p style="margin:4px 0;"><strong>Estación de Caja:</strong> ${c.estacion}</p>
                    <p style="margin:4px 0;"><strong>Tickets Emitidos:</strong> ${Number(c.tickets || 0)} transacciones</p>
                    <hr style="border:none; border-top:1px dashed #cbd5e1; margin:8px 0;">
                    
                    <!-- 💵 EFECTIVO NETO: Dinero real en monedas tras restar el cambio deducido -->
                    <p style="margin:4px 0; color:#475569;">💵 Efectivo Neto en Caja: <strong>$${efectivoNetoRealCaja.toFixed(2)}</strong></p>
                    
                    <!-- ↩️ CAMBIO ENTREGADO: Deducción multicanal exacta -->
                    <p style="margin:4px 0; color:#ef4444;">↩️ Cambio Entregado: -$${cambioEntregadoTotal.toFixed(2)}</p>
                    
                    <p style="margin:4px 0; color:#475569;">💳 Terminal Tarjeta: $${netoTarjeta.toFixed(2)}</p>
                    <p style="margin:4px 0; color:#475569;">📲 Transferencias: $${netoTransfer.toFixed(2)}</p>
                </div>
                
                <p style="font-weight:bold; margin-bottom:5px; color:#1e293b; font-size:13px;">Resumen de Artículos Vendidos:</p>
                
                <div class="corte-products-scroll">
                    <ul style="padding-left: 5px; margin: 0; list-style: none;">
                        ${listaProductosHtml || '<li style="color:#888;">Sin artículos vendidos en este turno.</li>'}
                    </ul>
                </div>
                
                <div class="corte-total-sticky">
                    <span style="font-size:13px; color:#64748b;">Ingresos Totales del Corte:</span>
                    <h3 style="margin:4px 0; color:#0066ff; font-size:22px; font-weight:bold;">$${ingresosTotales.toFixed(2)} MXN</h3>
                </div>
            </div>
        `;

        document.getElementById('detalle-panel')?.classList.remove('hidden');
    }
}

// ========================================================
// RENDERIZADOR MAESTRO DE TICKETS (CONECTADO A PAYMENTS)
// ========================================================
function renderTickets(arrVentas, destino) {
    destino.innerHTML = "";

    if (!arrVentas || arrVentas.length === 0) {
        destino.innerHTML = `<div class="empty">No hay tickets emitidos en ese rango de fechas.</div>`;
        return;
    }

    let html = `<table class="table">
        <thead>
            <tr>
                <th>Fecha / Hora</th>
                <th>Folio Ticket</th>
                <th>Cajera / Usuario</th>
                <th>Estación</th>
                <th>Método Pago</th>
                <th>Artículos</th>
                <th>Total Cobrado</th>
            </tr>
        </thead>
        <tbody>`;

    arrVentas.forEach((t, i) => {
        const [fechaMX, horaMX] = mxFechaHora(t.fecha || new Date());
        
        let listaPrendas = t.items || t.articulos || [];
        if (typeof listaPrendas === "object" && !Array.isArray(listaPrendas)) {
            listaPrendas = Object.values(listaPrendas);
        }

        const totalPiezas = listaPrendas.reduce((sum, a) => {
            const c = typeof a.cantidad !== 'undefined' ? a.cantidad : (a.qty || 1);
            return sum + Number(c);
        }, 0);

        const totalDinero = Number(t.total || t.monto || 0);
        const usuarioResponsable = t.usuario || t.cashier || t.vendedor || 'Wendy';
        // 🔍 EXTRACTOR DE ESTACIÓN HISTÓRICA REAL (TABLA)
        // 1. Buscamos primero si el ticket guardó la estación de forma nativa en sus propiedades
        let estacionDetectada = t.estacion || t.station || t.caja || t.stationSeleccionada || '';

        // 2. Si el ticket no la tiene (ventas de contingencia), buscamos qué estación tiene asignada 
        // ese empleado específico en la base de datos de usuarios para mantener la coherencia
        if (!estacionDetectada || estacionDetectada.trim() === "") {
            const listaUsuariosDB = DB.getUsers ? DB.getUsers() : [];
            const empleadoQueAtendio = listaUsuariosDB.find(x => x.user === usuarioResponsable);
            estacionDetectada = empleadoQueAtendio ? (empleadoQueAtendio.estacion || empleadoQueAtendio.station) : 'Salto del Agua';
        }

        const estacionVenta = estacionDetectada;

        // ====================================================================
        // 🔥 CORRECCIÓN CRÍTICA DE VARIABLE: Inicialización segura de marcas de pago
        // ====================================================================
        let metodosDetectados = [];
        const pObj = t.payments || t.pagos;
        
        if (pObj && typeof pObj === 'object') {
            const efec = parseFloat(pObj.efectivo || 0);
            const tarj = parseFloat(pObj.tarjeta || 0);
            const transf = parseFloat(pObj.transferencia || 0);

            if (efec > 0) metodosDetectados.push('EFECTIVO');
            if (tarj > 0) metodosDetectados.push('TARJETA');
            if (transf > 0) metodosDetectados.push('TRANSFERENCIA');
        }

        // Si no venía en el subobjeto payments, buscamos un string directo de respaldo
        if (metodosDetectados.length === 0) {
            const directo = String(t.metodo_pago || t.payment_method || t.tipo_pago || t.pago || 'EFECTIVO').toUpperCase();
            if (directo.includes('TARJETA')) metodosDetectados.push('TARJETA');
            else if (directo.includes('TRANSFERENCIA')) metodosDetectados.push('TRANSFERENCIA');
            else metodosDetectados.push('EFECTIVO');
        }

        // Limpiamos duplicados de forma segura antes de evaluar el HTML
        metodosDetectados = [...new Set(metodosDetectados)];
        
        // --- 🎨 RENDERIZADO SEGURO DE ICONOS ---
        let formaPagoHtml = '';
        const metodoUnico = metodosDetectados.length === 1 ? metodosDetectados[0] : 'MIXTO';

        if (metodoUnico === 'TARJETA') {
            formaPagoHtml = `<span class="audit-user" style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight:600;">💳 TARJETA</span>`;
        } else if (metodoUnico === 'TRANSFERENCIA') {
            formaPagoHtml = `<span class="audit-user" style="background: #f0fdf4; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight:600;">📲 TRANSFERENCIA</span>`;
        } else if (metodoUnico === 'MIXTO') {
            formaPagoHtml = `<span class="audit-user" style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight:600;">🔀 MIXTO</span>`;
        } else {
            formaPagoHtml = `<span class="audit-user" style="background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight:600;">💵 EFECTIVO</span>`;
        }

        const folioTicket = t.ticket || t.id || `TK-${1000 + i}`;

        // Inyección limpia y libre de errores en la tabla
        html += `
            <tr class="corte-row" tabindex="0" onclick="mostrarDetalleTicket(${JSON.stringify(t).replace(/"/g, '&quot;')}, this)">
                <td><span style="font-size: 12px; color: #555;">${fechaMX} - ${horaMX}</span></td>
                <td><strong>#${folioTicket}</strong></td>
                <td>${usuarioResponsable}</td>
                <td>${estacionVenta}</td>
                <td>${formaPagoHtml}</td>
                <td>${totalPiezas} pzas</td>
                <td><strong>$${totalDinero.toFixed(2)}</strong></td>
            </tr>`;
    });


    html += `</tbody></table>`;
    destino.innerHTML = html;

    const firstRow = destino.querySelector(".corte-row");
    if (firstRow) firstRow.focus();
}

// ========================================================
// RELLENAR EL PANEL LATERAL PARA TICKETS
// ========================================================
function mostrarDetalleTicket(objetoTicket, elementoFila) {
    document.querySelectorAll('.corte-row').forEach(tr => {
        tr.classList.remove('fila-seleccionada');
    });
    
    if (elementoFila) {
        elementoFila.classList.add('fila-seleccionada');
    }

    const panelTitulo = document.getElementById('detalle-fecha');
    const panelContenido = document.getElementById('detalle-contenido');

    if (panelTitulo && panelContenido) {
        const [fechaMX, horaMX] = mxFechaHora(objetoTicket.fecha || new Date());
        const folio = objetoTicket.ticket || objetoTicket.id || 'Venta';
        
        panelTitulo.innerHTML = `🧾 Ticket #<span style="color:#0066ff">${folio}</span>`;

        let articlesList = objetoTicket.items || objetoTicket.articulos || [];
        if (typeof articlesList === "object" && !Array.isArray(articlesList)) {
            articlesList = Object.values(articlesList);
        }

        const usuarioResponsable = objetoTicket.usuario || objetoTicket.cashier || objetoTicket.vendedor || 'Wendy';
        // 🔍 EXTRACTOR DE ESTACIÓN HISTÓRICA REAL (PANEL LATERAL)
        let estacionLateralDetectada = objetoTicket.estacion || objetoTicket.station || objetoTicket.caja || objetoTicket.stationSeleccionada || '';

        if (!estacionLateralDetectada || estacionLateralDetectada.trim() === "") {
            const listaUsuariosDB = DB.getUsers ? DB.getUsers() : [];
            const empleadoQueAtendio = listaUsuariosDB.find(x => x.user === usuarioResponsable);
            estacionLateralDetectada = empleadoQueAtendio ? (empleadoQueAtendio.estacion || empleadoQueAtendio.station) : 'Salto del Agua';
        }

        const estacionVenta = estacionLateralDetectada;

        const granTotal = Number(objetoTicket.total || objetoTicket.monto || 0);

        // BUSCA ESTA SECCIÓN EN TU FUNCIÓN mostrarDetalleTicket Y REEMPLÁZALA:

        // 🔍 MÓDULO MATEMÁTICO DE AUDITORÍA DE CAMBIO POR TICKET
        let formaPagoHtmlLateral = '💵 EFECTIVO';
        let efectivoRecibido = granTotal; 
        let cambioEntregado = 0;
        let esPagoConEfectivo = false; // 🔥 Bandera para saber si inyectar las filas de auditoría

        const pObj = objetoTicket.payments || objetoTicket.pagos;
        
        if (pObj && typeof pObj === 'object') {
            const efec = parseFloat(pObj.efectivo || 0);
            const tarj = parseFloat(pObj.tarjeta || 0);
            const transf = parseFloat(pObj.transferencia || 0);

            if (efec > 0) esPagoConEfectivo = true; // Si hay monedas involucradas, se activa el bloque
            efectivoRecibido = efec; 

            let canalesActivos = 0;
            if (efec > 0) canalesActivos++;
            if (tarj > 0) canalesActivos++;
            if (transf > 0) canalesActivos++;

            if (canalesActivos > 1) {
                formaPagoHtmlLateral = `<span style="color: #92400e; font-weight: 600;">🔀 MIXTO</span> <br> <span style="font-size: 11px; color: #64748b;">(💵 $${efec.toFixed(2)} / 💳 $${tarj.toFixed(2)} / 📲 $${transf.toFixed(2)})</span>`;
                
                const saldoEfectivoEsperado = granTotal - tarj - transf;
                if (efec > saldoEfectivoEsperado) {
                    cambioEntregado = efec - saldoEfectivoEsperado;
                }
            } else if (tarj > 0) {
                formaPagoHtmlLateral = `💳 TARJETA`;
                efectivoRecibido = 0;
                cambioEntregado = 0;
            } else if (transf > 0) {
                formaPagoHtmlLateral = `📲 TRANSFERENCIA`;
                efectivoRecibido = 0;
                cambioEntregado = 0;
            } else {
                formaPagoHtmlLateral = `💵 EFECTIVO`;
                if (efec >= granTotal) {
                    cambioEntregado = efec - granTotal;
                }
            }
        } else {
            const directo = String(objetoTicket.metodo_pago || objetoTicket.payment_method || 'EFECTIVO').toUpperCase();
            if (directo.includes('TARJETA')) formaPagoHtmlLateral = `💳 TARJETA`;
            else if (directo.includes('TRANSFERENCIA')) formaPagoHtmlLateral = `📲 TRANSFERENCIA`;
            else esPagoConEfectivo = true; // Por defecto si es viejo e indexó efectivo
        }

        // 🔥 MODIFICACIÓN DE UX: Si hubo uso de efectivo (monto mayor o igual a cero), inyectamos las etiquetas permanentemente
        let desgloseEfectivoHtml = '';
        if (esPagoConEfectivo) {
            desgloseEfectivoHtml = `
                <p style="margin:4px 0; color:#475569;">📥 Efectivo Recibido: $${efectivoRecibido.toFixed(2)}</p>
                <!-- Si es exacto, pintará de forma limpia y transparente -$0.00 -->
                <p style="margin:4px 0; color:${cambioEntregado > 0 ? '#ef4444' : '#64748b'};">↩️ Cambio Entregado: -$${cambioEntregado.toFixed(2)}</p>
            `;
        }


        // 🔥 DECLARACIÓN UNIFICADA DE LA VARIABLE DE PRODUCTOS
        let tablaProductosHtml = `
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left; margin-top:10px;">
                <thead style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <tr>
                        <th style="padding:6px;">Prenda / Artículo</th>
                        <th style="padding:6px; text-align:center;">Cant</th>
                        <th style="padding:6px; text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>`;

        articlesList.forEach(a => {
            const nombre = a.nombre || a.articulo || 'Artículo sin nombre';
            const qty = Number(typeof a.cantidad !== 'undefined' ? a.cantidad : (a.qty || 1));
            const precioUnitario = Number(a.precio || 0);
            const subtotal = qty * precioUnitario;

            tablaProductosHtml += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px;">${nombre} <br><span style="font-size:11px; color:#64748b;">P. Unit: $${precioUnitario.toFixed(2)}</span></td>
                    <td style="padding:8px; text-align:center; font-weight:600;">${qty}</td>
                    <td style="padding:8px; text-align:right; font-weight:600;">$${subtotal.toFixed(2)}</td>
                </tr>`;
        });

        tablaProductosHtml += `</tbody></table>`;

        // 🔥 INYECCIÓN DE CONTENIDO: Sincronizado perfectamente con la variable en minúsculas 'tablaProductosHtml'
        panelContenido.innerHTML = `
            <div class="ticket-info-wrapper">
                <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:15px; font-size:12px; border:1px solid #e2e8f0; line-height: 1.6;">
                    <p style="margin:4px 0;"><strong>Fecha y Hora:</strong> ${fechaMX} - ${horaMX}</p>
                    <p style="margin:4px 0;"><strong>Atendió:</strong> ${usuarioResponsable}</p>
                    <p style="margin:4px 0;"><strong>Estación:</strong> ${estacionVenta}</p>
                    <p style="margin:4px 0;"><strong>Forma de Pago:</strong> ${formaPagoHtmlLateral}</p>
                    <!-- 🔥 FILA DINÁMICA DE CAMBIO INYECTADA -->
                    ${desgloseEfectivoHtml}
                </div>
                
                <p style="font-weight:bold; margin-bottom:5px; color:#1e293b; font-size:13px;">Prendas en la nota:</p>
                
                <div class="ticket-products-scroll">
                    ${tablaProductosHtml}
                </div>
                
                <div class="ticket-total-sticky">
                    <span style="font-size:13px; color:#64748b;">Total de la Compra:</span>
                    <h3 style="margin:4px 0; color:#059669; font-size:22px; font-weight:bold;">$${granTotal.toFixed(2)} MXN</h3>
                </div>
            </div>
        `;

        document.getElementById('detalle-panel')?.classList.remove('hidden');
    }
}

 function  exportCSV(filename,  rows){
     const  csv  =  rows.map(r =>  r.map(v  =>  `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
     const  blob  =  new Blob([csv],  {type:'text/csv;charset=utf-8;'});
     const  url  =  URL.createObjectURL(blob);
    const  a  =  document.createElement('a');  a.href  =  url;  a.download  =  filename; a.click();
     URL.revokeObjectURL(url);
 }
 
 exportarBtn.addEventListener("click",  ()  =>  {
    const  tipo  =  tipoReporte.value;
     if  (datosFiltrados.length ===  0)  return  alert("No  hay  datos  para  exportar");
 
  if (tipo === "ventas") {
    // 1. Añadimos "Estación" en las cabeceras del CSV justo antes de "Cashier"
    const rows = [["Ticket", "Producto", "Fecha", "Hora", "Total", "Pagado", "Cambio", "Cash", "Card", "Transfer", "Estacion", "Cashier"]];

    datosFiltrados.forEach(v => {
       const [f, h] = v.fecha.split("T");
       const horaFmt = h.slice(0, 8);

       // 🔍 EXTRACTOR DE ESTACIÓN EN TIEMPO REAL
       // Buscamos primero si el ticket guardó la estación de forma nativa en sus propiedades (.estacion o .station)
       let estacionDetectada = v.estacion || v.station || v.caja || '';
       
       // Si el ticket no la tiene (ventas antiguas), buscamos qué estación tiene asignada ese usuario en la DB
       if (!estacionDetectada || estacionDetectada.trim() === "") {
           const listaUsuariosDB = DB.getUsers ? DB.getUsers() : [];
           const nombreCajera = v.cashier || v.usuario || '';
           const empleado = listaUsuariosDB.find(x => x.user === nombreCajera);
           estacionDetectada = empleado ? (empleado.estacion || empleado.station) : 'Salto del Agua';
       }

       (v.items || []).forEach(it => {
          rows.push([
             v.ticket || String(v.id || "").padStart(6, "0"), // Ticket #
             it.nombre || "",                                  // Producto
             f,                                                // Fecha
             horaFmt,                                          // Hora
             v.total?.toFixed(2) || "0.00",                    // Total venta
             v.pagado?.toFixed(2) || ((
                (v.payments?.efectivo || 0) +
                (v.payments?.tarjeta || 0) +
                (v.payments?.transferencia || 0)
             ).toFixed(2)),                                    // Pagado
             v.cambio?.toFixed(2) || "0.00",                   // Cambio
             v.payments?.efectivo?.toFixed(2) || "0.00",       // Cash
             v.payments?.tarjeta?.toFixed(2) || "0.00",        // Card
             v.payments?.transferencia?.toFixed(2) || "0.00",  // Transfer
             
             // 🔥 NUEVAS INYECCIONES DE COLUMNAS ALINEADAS CON EXCEL
             estacionDetectada,                                // Estación
             v.cashier || ""                                   // Cajero
          ]);
       });
    });

    exportCSV("ventas.csv", rows);

  }  else  {
//  Dentro  de  exportarBtn  handler, tipo  !==  "ventas"
const  rows =  [["Fecha","Hora","Usuario","Estacion","Tickets","Efectivo","Tarjeta","Transferencia","Total","Turno"]];

datosFiltrados.forEach(c  => {
    const  [fechaISO, horaISO]  =  splitFechaHora(c.fecha);
   rows.push([
       fechaISO,
       horaISO,
       c.usuario  ||  "-",
       c.estacion  ||  "-",
       Number(c.tickets ||  0),
       Number(c.totalCash  ||  0).toFixed(2),
       Number(c.totalCard  || 0).toFixed(2),
       Number(c.totalTransfer  ||  0).toFixed(2),
       Number(c.totalIngresos  ||  0).toFixed(2),
       c.turno ||  "-"
    ]);
});

exportCSV("cortes.csv",  rows);
     }
});


function renderLista(arr, destino) {
    destino.innerHTML = "";

    if (arr.length === 0) {
        destino.innerHTML = `<div class="empty">No hay registros.</div>`;
        return;
    }

    let total = 0;

    let html = `<table class="table">
        <tr><th>Fecha</th><th>Items</th><th>Total</th></tr>`;

    arr.forEach(v => {
        total += v.total;
        html += `
        <tr>
            <td>${v.fecha.replace("T"," ")}</td>
            <td>${v.items.length}</td>
            <td>${v.total.toFixed(2)}</td>
        </tr>`;
    });

    html += `</table>`;

    destino.innerHTML = html;
}
 
 function cerrarDetalle()  {
    document.getElementById("detalle-panel").classList.add("hidden");
 }

document.addEventListener("keydown", (e)  =>  {
   if  (e.key  === "Escape")  {
       const  panel =  document.getElementById("detalle-panel");
       if  (panel &&  !panel.classList.contains("hidden"))  {
          panel.classList.add("hidden");
       }
   }
});


 document.addEventListener("keydown",  (e)  => {
     const focused  =  document.activeElement;
    if  (focused.classList.contains("corte-row"))  {
       if  (e.key  ===  "ArrowDown") {
            e.preventDefault();
           const  next =  focused.nextElementSibling?.nextElementSibling;  
           //  saltar  la fila  oculta  de  detalle
           if  (next &&  next.classList.contains("corte-row"))  next.focus();
        }
       if  (e.key  ===  "ArrowUp") {
            e.preventDefault();
           const  prev =  focused.previousElementSibling?.previousElementSibling;
           //  saltar  la  fila oculta  de  detalle
           if  (prev  && prev.classList.contains("corte-row"))  prev.focus();
        }
        if (e.key  ===  "Enter")  {
           e.preventDefault();
           focused.click();
        }
    }
 });
