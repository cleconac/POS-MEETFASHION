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
            <tr  class="corte-row"  tabindex="0" onclick="mostrarDetalle(${JSON.stringify(c).replace(/"/g,  '&quot;')})">
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


 function  mostrarDetalle(corte) {
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



