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

// 2. FUNCIÓN DE CANDADOS DE AUDITORÍA PARA LA SECCIÓN DE REPORTES
function aplicarCandadosSeccionReportes() {
    if (!activeReportUserSession) return;

    const rolLogueado = (activeReportUserSession.role || activeReportUserSession.rol || '').toLowerCase();
    const aliasLogueado = (activeReportUserSession.user || activeReportUserSession.usuario || '').toLowerCase();
    
    // 👑 INMUNIDAD MASTER: El dueño general hereda acceso automático total por diseño
    const esMaestro = rolLogueado === 'master' || aliasLogueado === 'sup' || aliasLogueado === 'admin';

    // Recuperamos las variables booleanas de tu LocalStorage
    const p = esMaestro ? { ventas: true, cortes: true, exportar: true } : (activeReportUserSession.permisos?.reportes || {});

    // Localizamos tus elementos utilizando tus IDs reales compartidos
    const optVentas    = document.getElementById('opt-perm-ventas');
    const optCortes    = document.getElementById('opt-perm-cortes');
    const btnExportar  = document.getElementById('btn-exportar');
    const selectReport = document.getElementById('tipo-reporte');

    // --- CANDADO 1: PERMISO PARA VER VENTAS ---
    if (optVentas && !esMaestro && !p.ventas) {
        optVentas.remove(); // Removemos la opción para que el empleado no la pueda seleccionar
    }

    // --- CANDADO 2: PERMISO PARA VER CORTES ---
    if (optCortes && !esMaestro && !p.cortes) {
        optCortes.remove(); // Removemos la opción para blindar la caja
    }

    // PROTECCIÓN DE INTERFAZ VACÍA:
    // Si a un administrador limitado le bloquearon tanto Ventas como Cortes, el select se quedaría en blanco.
    // Le inyectamos una opción deshabilitada de aviso administrativo por seguridad.
    if (selectReport && selectReport.options.length === 0) {
        const optVacio = document.createElement("option");
        optVacio.textContent = "Módulo Restringido";
        optVacio.disabled = true;
        optVacio.selected = true;
        selectReport.appendChild(optVacio);
        
        // Deshabilitamos el botón de buscar nativo para que no intente procesar consultas vacías
        const btnBuscar = document.getElementById('btn-buscar');
        if (btnBuscar) btnBuscar.disabled = true;
    }

    // --- CANDADO 3: PERMISO PARA EXPORTAR CSV ---
    if (btnExportar) {
        // Si no tiene la casilla marcada en el árbol, el botón "Exportar CSV" desaparece por completo
        btnExportar.style.display = (esMaestro || p.exportar) ? '' : 'none';
    }
}

// 3. ENLAZAR ARRANQUE AUTOMÁTICO EN EL DOM
document.addEventListener("DOMContentLoaded", () => {
    // El sistema primero valida el acceso general (auth.js) y luego recorta las opciones de este módulo
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


function  buscarPorFechas()  {
   if  (!fechaDesde.value  || !fechaHasta.value)  {
       alert("Selecciona  ambas  fechas");
       return;
   }

   const  ini  =  new  Date(fechaDesde.value +  "T00:00:00");
    const fin  =  new  Date(fechaHasta.value  + "T23:59:59");
    const  tipo =  tipoReporte.value;

   if  (tipo  ===  "ventas")  {
       const ventas  =  DB.getSales();
       datosFiltrados  =  ventas.filter(v =>  {
           const  f =  new  Date(v.fecha);
           return f.getTime()  >=  ini.getTime()  &&  f.getTime() <=  fin.getTime();
       });
       renderVentas(datosFiltrados,  listaFechas);
   }  else  {
       const  cortes  = DB.getCuts();
       datosFiltrados  =  cortes.filter(c  =>  {
          const  f  =  new Date(c.fecha);
           return  f.getTime()  >= ini.getTime()  &&  f.getTime()  <=  fin.getTime();
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
    destino.innerHTML  =  html;}


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

/* ========================================================
   RENDER PARA LA BUSQUEDA DE TICKETS VENDIDOS
   ======================================================== */
function renderTickets(arr, destino) {
    destino.innerHTML = "";

    if (!arr || arr.length === 0) {
        destino.innerHTML = `<div class="empty">No hay tickets emitidos en ese rango de fechas.</div>`;
        return;
    }

    let html = `<table class="table">
        <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Folio / Ticket</th>
            <th>Usuario</th>
            <th>Estación</th>
            <th>Método Pago</th>
            <th>Total Vendido</th>
        </tr>`;

    arr.forEach((t, i) => {
        // Aprovechamos tus mismas funciones de conversión de fecha
        const [fechaMX, horaMX] = mxFechaHora ? mxFechaHora(t.fecha) : [t.fecha, '—'];
        
        // Mapeamos los artículos vendidos en este ticket específico para construir su desglose lateral/flotante
        const articulos = t.articulos && typeof t.articulos === "object" 
            ? Object.values(t.articulos) 
            : (t.articulos || []);

        const detalleHTML = articulos.length
            ? `<ul style="margin:0;padding-left:20px;">
                  ${articulos.map(a => {
                      const nombre = a?.nombre ?? "—";
                      const qty = Number(a?.qty || a?.cantidad || 0);
                      const monto = Number(a?.monto || a?.precio || 0) * qty;
                      return `<li>${nombre} — ${qty} pzas — $${monto.toFixed(2)}</li>`;
                  }).join("")}
                </ul>`
            : `<div style="color:#666">Sin productos registrados en este ticket</div>`;

        // 🔥 CLAVE: Usamos la clase 'corte-row' para heredar la mano y los estilos de selección.
        // Pasamos el objeto del ticket y 'this' a la misma función mostrarDetalle()
        html += `
            <tr class="corte-row" tabindex="0" onclick="mostrarDetalleTicket(${JSON.stringify(t).replace(/"/g, '&quot;')}, this)">
                <td>${fechaMX}</td>
                <td>${horaMX}</td>
                <td><strong>#${t.id || t.ticket_id || i + 1}</strong></td>
                <td>${t.usuario || "—"}</td>
                <td>${t.estacion || t.station || "—"}</td>
                <td>${(t.metodo_pago || t.payment_method || 'Efectivo').toUpperCase()}</td>
                <td><strong>$${Number(t.total || t.monto || 0).toFixed(2)}</strong></td>
            </tr>
            <tr id="detalle-ticket-row-${i}" class="hidden">
                <td colspan="7">${detalleHTML}</td>
            </tr>`;
    });

    html += `</table>`;
    destino.innerHTML = html;

    const firstRow = destino.querySelector(".corte-row");
    if (firstRow) firstRow.focus();
}

/* ========================================================
   RENDER PARA MOSTRAR EL DETALLE DE TICKETS VENDIDOS
   ======================================================== */
function mostrarDetalleTicket(objetoTicket, elementoFila) {
    // 1. Apagar el color azul en cualquier otra fila que haya estado seleccionada antes
    document.querySelectorAll('.corte-row').forEach(tr => {
        tr.classList.remove('fila-seleccionada');
    });
    
    // 2. Encender el color azul únicamente en el ticket seleccionado
    if (elementoFila) {
        elementoFila.classList.add('fila-seleccionada');
    }

    // 3. Poblar el lateral derecho o la modal de desglose (Adaptado a tus IDs de panel)
    const panelTitulo = document.getElementById('detalle-fecha'); // ID de tu cabecera lateral
    const panelContenido = document.getElementById('detalle-contenido'); // ID de tu cuerpo lateral

    if (panelTitulo && panelContenido) {
        const [fechaMX, horaMX] = mxFechaHora ? mxFechaHora(objetoTicket.fecha) : [objetoTicket.fecha, ''];
        
        panelTitulo.textContent = `Ticket #${objetoTicket.id || 'Venta'} - ${fechaMX}`;

        const articulos = objetoTicket.articulos && typeof objetoTicket.articulos === "object" 
            ? Object.values(objetoTicket.articulos) 
            : (objetoTicket.articulos || []);

        let listaArticulosHtml = "";
        articulos.forEach(a => {
            const nombre = a?.nombre ?? "—";
            const qty = Number(a?.qty || a?.cantidad || 0);
            const precioUnitario = Number(a?.precio || 0);
            const subtotal = qty * precioUnitario;
            listaArticulosHtml += `<li>• ${nombre} ($${precioUnitario.toFixed(2)}) — ${qty} pzas — $${subtotal.toFixed(2)}</li>`;
        });

        // Inyectamos los datos generales de la venta en tu panel lateral derecho
        panelContenido.innerHTML = `
            <div style="font-size: 13px; line-height: 1.6; color: #333;">
                <p><strong>Cajera/Usuario:</strong> ${objetoTicket.usuario || '—'}</p>
                <p><strong>Estación de venta:</strong> ${objetoTicket.estacion || objetoTicket.station || 'Principal'}</p>
                <p><strong>Hora de emisión:</strong> ${horaMX}</p>
                <p><strong>Método de Pago:</strong> ${(objetoTicket.metodo_pago || 'Efectivo').toUpperCase()}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 10px 0;">
                <p><strong>Artículos vendidos:</strong></p>
                <ul style="padding-left: 15px; margin: 0; list-style: none;">
                    ${listaArticulosHtml}
                </ul>
                <hr style="border: none; border-top: 2px dashed #ccc; margin: 15px 0;">
                <p style="font-size: 16px; color: #059669;"><strong>TOTAL TRANSACCIÓN: $${Number(objetoTicket.total || 0).toFixed(2)}</strong></p>
            </div>
        `;

        // Removemos la clase hidden de tu panel lateral derecho para que se despliegue elegantemente
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
 
if  (tipo  === "ventas")  {
    const  rows  =  [["Ticket","Producto","Fecha","Hora","Total","Pagado","Cambio","Cash","Card","Transfer","Cashier"]];

    datosFiltrados.forEach(v  =>  {
       const  [f,h]  =  v.fecha.split("T");
       const  horaFmt  =  h.slice(0,8);

       (v.items  ||  []).forEach(it  =>  {
           rows.push([
               v.ticket ||  String(v.id  ||  "").padStart(6,"0"),  //  Ticket  #
               it.nombre ||  "",                                                          //  Producto
               f,                                                                                     // Fecha
               horaFmt,                                                                         //  Hora
               v.total?.toFixed(2)  ||  "0.00",                                //  Total  venta
              v.pagado?.toFixed(2)  ||  ((
                   (v.payments?.efectivo||0)  +
                  (v.payments?.tarjeta||0)  +
                   (v.payments?.transferencia||0)
               ).toFixed(2)),                                                              // Pagado
               v.cambio?.toFixed(2)  ||  "0.00",                              //  Cambio
               v.payments?.efectivo?.toFixed(2)  ||  "0.00",       //  Cash
               v.payments?.tarjeta?.toFixed(2)  ||  "0.00",         //  Card
               v.payments?.transferencia?.toFixed(2)  || "0.00",  //  Transfer
               v.cashier  ||  ""                                                            //  Cajero
           ]);
       });
    });

   exportCSV("ventas.csv",  rows);

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


 function  mostrarDetalle(corte, elementoFila) {

    // Quitamos la marca a cualquier otra fila que haya estado seleccionada antes
    document.querySelectorAll('.report-results table tbody tr').forEach(tr => {
        tr.classList.remove('fila-seleccionada');
    });
    
    // Le agregamos el color fijo a la fila en la que se acaba de hacer clic
    if (elementoFila) {
        elementoFila.classList.add('fila-seleccionada');
    }

    const  panel  = document.getElementById("detalle-panel");
    const  contenido  = document.getElementById("detalle-contenido");
    const  fechaLabel  = document.getElementById("detalle-fecha");
 
    fechaLabel.textContent  = `Corte  del  ${new Date(corte.fecha).toLocaleString("es-MX")}`;
 
    let  html =  `
       <div><strong>Usuario:</strong>  ${corte.usuario}</div>
       <div><strong>Estación:</strong>  ${corte.estacion}</div>
       <div><strong>Tickets:</strong>  ${corte.tickets}</div>
       <div><strong>Efectivo:</strong>  ${corte.totalCash.toFixed(2)}</div>
       <div><strong>Tarjeta:</strong>  ${corte.totalCard.toFixed(2)}</div>
       <div><strong>Transferencia:</strong>  ${corte.totalTransfer.toFixed(2)}</div>
       <div><strong>Total:</strong>  ${corte.totalIngresos.toFixed(2)}</div>
       <hr>
        <div><strong>Artículos vendidos:</strong></div>
        <ul style="padding-left:20px;">${
           Object.values(corte.articulos  || {}).map(a  =>
              `<li>${a.nombre}  — ${a.qty}  —  $${a.monto.toFixed(2)}</li>`
          ).join("")
        }</ul>
    `;

    contenido.innerHTML  =  html;
    panel.classList.remove("hidden");
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



