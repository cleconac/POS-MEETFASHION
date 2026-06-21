function renderTicket(sale) {

    document.getElementById("t-date").textContent =
        "Fecha: " + new Date(sale.fecha).toLocaleString();

    document.getElementById("t-id").textContent =
        "Folio: " + sale.id;

    // ITEMS
    const cont = document.getElementById("t-items");
    cont.innerHTML = "";

    sale.items.forEach(it => {
        const row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML = `
            <span>${it.nombre} x${it.cantidad}</span>
            <span>$${(it.precio * it.cantidad).toFixed(2)}</span>
        `;
        cont.appendChild(row);
    });

    document.getElementById("t-total").textContent =
        `$${sale.total.toFixed(2)}`;

    document.getElementById("t-cash").textContent =
        `$${sale.pagos.efectivo.toFixed(2)}`;

    document.getElementById("t-card").textContent =
        `$${sale.pagos.tarjeta.toFixed(2)}`;

    document.getElementById("t-trans").textContent =
        `$${sale.pagos.transferencia.toFixed(2)}`;

    document.getElementById("t-change").textContent =
        `$${sale.cambio.toFixed(2)}`;
}

// Función global invocada desde payments.js
window.showTicket = function(sale) {
    const win = window.open("ticket.html", "_blank");
    win.onload = function() {
        win.renderTicket(sale);
        setTimeout(() => win.print(), 300);
    };
};
