// Denominaciones típicas MXN
const denoms = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const denomDiv = document.getElementById("denoms");
const contadoSpan = document.getElementById("contado");
const difSpan = document.getElementById("diferencia");

// Generar inputs dinámicamente
denoms.forEach(v => {
    const row = document.createElement("div");
    row.className = "den-row";
    row.innerHTML = `
        <label>$${v}</label>
        <input type="number" min="0" value="0" data-value="${v}">
    `;
    denomDiv.appendChild(row);
});

// Recalcular conteo
function recalcContado() {
    let total = 0;
    denomDiv.querySelectorAll("input").forEach(input => {
        const cantidad = Number(input.value);
        const valor = Number(input.dataset.value);
        total += cantidad * valor;
    });
    contadoSpan.textContent = `$${total.toFixed(2)}`;
    return total;
}
denomDiv.addEventListener("input", recalcContado);

document.getElementById("buscar").onclick = () => {
    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;

    if (!desde || !hasta) return alert("Selecciona fechas");

    const ventas = DB.getSalesByDate(desde, hasta);

    let total = 0, tCash = 0, tCard = 0, tTransfer = 0;

    ventas.forEach(v => {
        total += v.total;
        tCash += v.pagos?.efectivo || 0;
        tCard += v.pagos?.tarjeta || 0;
        tTransfer += v.pagos?.transferencia || 0;

    });

    document.getElementById("r-total").textContent = `$${total.toFixed(2)}`;
    document.getElementById("r-cash").textContent = `$${tCash.toFixed(2)}`;
    document.getElementById("r-card").textContent = `$${tCard.toFixed(2)}`;
    document.getElementById("r-transfer").textContent = `$${tTransfer.toFixed(2)}`;

    // Diferencia
    const contado = recalcContado();
    const dif = contado - (tCash + Number(document.getElementById("fondo").value || 0));
    difSpan.textContent = `$${dif.toFixed(2)}`;
};



// Guardar corte
document.getElementById("guardar").onclick = () => {
    const corte = {
        fecha: new Date().toISOString(),
        fondo: Number(document.getElementById("fondo").value || 0),
        contado: recalcContado(),
        desde: document.getElementById("desde").value,
        hasta: document.getElementById("hasta").value,
        sistema: {
            total: Number(document.getElementById("r-total").textContent.replace("$","")),
            cash: Number(document.getElementById("r-cash").textContent.replace("$","")),
            card: Number(document.getElementById("r-card").textContent.replace("$","")),
            transfer: Number(document.getElementById("r-transfer").textContent.replace("$","")),
        }
    };

    DB.saveCut(corte);
    alert("Corte guardado");
};

// Imprimir corte
document.getElementById("imprimir").onclick = () => {
    window.print();
};
