// ticket.js – manejo del ticket de venta (módulo)
export function initTicket() {
    const modal = document.getElementById("ticket-modal");
    const itemsBox = document.getElementById("ticket-items");
    const dateBox = document.getElementById("ticket-date");
    const totalBox = document.getElementById("ticket-total");
    const paidBox = document.getElementById("ticket-paid");
    const changeBox = document.getElementById("ticket-change");
    const btnClose = document.getElementById("ticket-close");
    const btnPrint = document.getElementById("ticket-print");
    const companyEl = document.getElementById("ticket-company");
    const printArea = document.getElementById("ticket-print-area");
    const ticketPrint = document.getElementById("ticket-preview");

    function fmtMX(n){ return Number(n||0).toLocaleString('es-MX', { style:'currency', currency:'MXN' }); }

    window.showTicket = function(venta) {
        if (!venta) return;
        // header
        companyEl.textContent = 'MEET FASHION';
        const fecha = new Date(venta.fecha);
        dateBox.textContent = `${fecha.toLocaleString()}  •  Ticket: ${venta.ticket}`;

        // items
        itemsBox.innerHTML = '';
        (venta.items || []).forEach(it => {
            const qty = it.cantidad || it.qty || 1;
            const row = document.createElement('div');
            row.className = 'row';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '6px';
            row.innerHTML = `<div>${it.nombre} x${qty}</div><div>${fmtMX((it.precio || 0) * qty)}</div>`;
            itemsBox.appendChild(row);
        });

        totalBox.textContent = fmtMX(venta.total || 0);
        paidBox.textContent = fmtMX(venta.pagado || 0);
        changeBox.textContent = fmtMX(venta.cambio || 0);

// === Generar HTML del ticket para impresión ===
let html = `
    <div class="ticket">
        <h2 style="text-align:center">MEET FASHION</h2>
        <div>${dateBox.textContent}</div>
        <hr>
        <div>
`;

(venta.items || []).forEach(it => {
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
        <div>Total: ${fmtMX(venta.total || 0)}</div>
        <div>Pagado: ${fmtMX(venta.pagado || 0)}</div>
        <div>Cambio: ${fmtMX(venta.cambio || 0)}</div>
        <hr>
        <div style="text-align:center;">¡Gracias por su compra!</div>
    </div>
`;

	ticketPrint.innerHTML = html;
        // Esperar  a  que  el DOM  actualice  el  contenido antes  de  imprimir
        setTimeout(() =>  {
               const  html =  ticketPrint.innerHTML;
               if  (html &&  html.includes("MEET  FASHION"))  {
                     printTicketHTML(html);
               }  else  {
                     console.warn("Contenido  del  ticket  no listo  para  imprimir:",  html);
              }
        },  150);
        //modal.classList.remove('hidden');
    };

    btnClose.addEventListener('click', () => modal.classList.add('hidden'));

btnPrint.addEventListener("click", () => {
    const html = document.getElementById("ticket-preview").innerHTML;
    console.log("ticketPrint", ticketPrint.innerHTML);
    printTicketHTML(ticketPrint.innerHTML);
});


// === NUEVO SISTEMA DE IMPRESIÓN POR IFRAME OCULTO ===
function printTicketHTML(html) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
        <head>
            <title>Ticket</title>
            <link rel="stylesheet" href="ticket.css">
        </head>
        <body onload="window.focus(); window.print();">
            ${html}
        </body>
        </html>
    `);

    doc.close();

    // === FUNCIÓN DE CIERRE SEGURO ===
    function finish() {
        // Remover iframe si sigue en el DOM
        if (iframe.parentNode) {
            document.body.removeChild(iframe);
        }

        // Cerrar modal de ticket
        const modal = document.getElementById("ticket-modal");
        if (modal) modal.classList.add("hidden");

        // Actualizar número de ticket en la pantalla
        if (typeof window.updateTicketNumber === "function") {
            window.updateTicketNumber();
        }
    }

    // Intento normal (cuando el navegador sí envía el evento)
    iframe.contentWindow.onafterprint = finish;

    // Intento de seguridad (cuando se guarda en PDF o Chrome falla)
    setTimeout(finish, 3000);
}

}
