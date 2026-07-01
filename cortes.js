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

    // Convertimos los límites de los inputs HTML a objetos de fecha puros (a medianoche)
    const fechaDesdeObj = new Date(desde + "T00:00:00");
    const fechaHastaObj = new Date(hasta + "T23:59:59");

    // Traer todos los registros
    const todasLasVentas = DB.getSales ? DB.getSales() : (JSON.parse(localStorage.getItem("ventas")) || []);

    // FILTRADO ROBUSTO POR OBJETO DE FECHA
    const ventas = todasLasVentas.filter(v => {
        if (!v.fecha) return false;
        
        let fechaVentaObj;

        // Si la fecha guardada es un formato regional de texto (como "26/6/2026, 3:19 p.m.")
        if (typeof v.fecha === 'string' && v.fecha.includes('/')) {
            // Separamos la fecha de la hora, quitamos comas y dividimos por diagonales
            const partesFecha = v.fecha.split(',')[0].trim().split('/');
            if (partesFecha.length === 3) {
                const dia = partesFecha[0];
                const mes = partesFecha[1] - 1; // En JS los meses van de 0 a 11
                const anio = partesFecha[2];
                fechaVentaObj = new Date(anio, mes, dia);
            }
        } else {
            // Si es un formato estándar ISO o timestamp numérico
            fechaVentaObj = new Date(v.fecha);
        }

        // Si el objeto de fecha no se pudo crear bien, saltamos este registro
        if (isNaN(fechaVentaObj.getTime())) return false;

        // Comparamos el objeto de fecha directamente si se encuentra dentro del rango de días
        return fechaVentaObj >= fechaDesdeObj && fechaVentaObj <= fechaHastaObj;
    });

    let total = 0, tCash = 0, tCard = 0, tTransfer = 0;

    // Procesar montos asegurando que se traten como números válidos
    ventas.forEach(v => {
        total += Number(v.total || 0);
        tCash += Number(v.pagos?.efectivo || 0);
        tCard += Number(v.pagos?.tarjeta || 0);
        tTransfer += v.pagos?.transferencia ? Number(v.pagos.transferencia) : 0;
    });

    document.getElementById("r-total").textContent = `$${total.toFixed(2)}`;
    document.getElementById("r-cash").textContent = `$${tCash.toFixed(2)}`;
    document.getElementById("r-card").textContent = `$${tCard.toFixed(2)}`;
    document.getElementById("r-transfer").textContent = `$${tTransfer.toFixed(2)}`;

    // Recalcular Diferencia dinámicamente incluyendo el fondo de caja
    const contado = recalcContado();
    const fondoCaja = Number(document.getElementById("fondo").value || 0);
    const dif = contado - (tCash + fondoCaja);
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
