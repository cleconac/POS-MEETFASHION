let editId = null;

// ---------- CARGAR LISTA ----------
let currentPage  =  1;
const  pageSize =  20;  //  artículos  por página
let  filteredData  =  [];

function cargarCatalogo(page = 1) {
       const q = document.getElementById("search-cat")?.value.trim().toLowerCase() || "";
       const allData = DB.getArticles();

       filteredData = q
              ? allData.filter(a =>
                      a.nombre.toLowerCase().includes(q) ||
                      a.codigo.toLowerCase().includes(q)
              )
              : allData;

       const totalPages = Math.ceil(filteredData.length / pageSize);
       currentPage = Math.min(page, totalPages);
       if (currentPage < 1) currentPage = 1;

       const start = (currentPage - 1) * pageSize;
       const end = start + pageSize;
       const data = filteredData.slice(start, end);

       const body = document.getElementById("catBody");
       if (!body) return;
       body.innerHTML = "";

       data.forEach(a => {
              const tr = document.createElement("tr");
              const stockSeguro = typeof a.stock !== 'undefined' ? a.stock : 0;
              
              // Formatear fecha legible o poner un guion si no ha sido modificado
              const fechaLegible = a.ultimo_movimiento ? new Date(a.ultimo_movimiento).toLocaleString() : '—';
              const usuarioUltimo = a.usuario_movimiento || '—';

// Busca esta sección dentro del data.forEach de tu cargarCatalogo() y actualiza las celdas:
tr.innerHTML = `
       <td>${a.codigo}</td>
       <td>${a.nombre}</td>
       <td>${mxn ? mxn(a.precio) : '$' + Number(a.precio).toFixed(2)}</td>
       <td><strong>${stockSeguro}</strong></td>
       
       <!-- Añadidas las clases CSS para homologar los textos -->
       <td><span class="audit-date">${fechaLegible}</span></td>
       <td><span class="audit-user">${usuarioUltimo}</span></td>
       
       <td>
              <button class="btn-primary" onclick="editar('${a.codigo}')">Editar</button>
              <button class="btn-sec" onclick="eliminar('${a.codigo}')">Eliminar</button>
              <button class="btn-sec" onclick="openStockModal('${a.codigo}')">📋 Stock</button>
              <!-- 🔥 MEJORA DE GESTIÓN: Botón para ver todas las fechas de movimiento -->
              <button class="btn-sec" onclick="verHistorialArticulo('${a.codigo}')" title="Ver Historial de Cambios">⏳ Historial</button>
       </td>
`;
              body.appendChild(tr);
       });

       if (typeof renderPagination === "function") {
           renderPagination(totalPages);
       }
}


function renderPagination(totalPages) {
       const nav = document.getElementById("pagination");
       if (!nav) return;
       nav.innerHTML = "";

       if (totalPages <= 1) return;

       for (let i = 1; i <= totalPages; i++) {
              const btn = document.createElement("button");
              btn.textContent = i;
              if (i === currentPage) {
                  btn.className = "active"; 
              } else {
                  // Si no es la activa, usa las propiedades estándar de tus botones
                  btn.className = "btn-sec"; 
              }
              
              // CORRECCIÓN CRÍTICA: Cada botón ejecuta estrictamente su número de página 'i'
              btn.onclick = () => {
                  cargarCatalogo(i);
              };
              
              nav.appendChild(btn);
       }
}



// ========================================================
// ESCUCHADOR PARA LA "X" DE LIMPIEZA DEL BUSCADOR
// ========================================================
document.getElementById("search-cat")?.addEventListener("search", function(event) {
    // Si el campo quedó vacío (porque presionaron la X)
    if (this.value === "") {
        currentPage = 1; // Restablecemos obligatoriamente a la página 1 por defecto
        cargarCatalogo(1); // Volvemos a pintar el listado completo con su paginado original
    }
});

//restablezca la página 1 al escribir
document.getElementById("search-cat")?.addEventListener("input", () => {
    currentPage = 1; 
    cargarCatalogo(1);
});



// ---------- FORMATO MXN ----------
function mxn(n) {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

// ---------- NUEVO ----------
function abrirNuevo() {
    editId = null;
    document.getElementById("modalTitle").textContent = "Nuevo Artículo";
    document.getElementById("cod").value = "";
    document.getElementById("cod").readOnly = false;
    document.getElementById("nom").value = "";
    document.getElementById("pre").value = "";
    document.getElementById("sto").value = "";
    document.getElementById("sto").readOnly = false;
    document.getElementById("modal").classList.remove("hidden");
}

// ---------- EDITAR ----------
function editar(id) {
    const art = DB.getArticulo(id);
    editId = id;

    document.getElementById("modalTitle").textContent = "Editar Artículo";

    document.getElementById("cod").value = art.codigo;
    document.getElementById("cod").readOnly = true;
    document.getElementById("nom").value = art.nombre;
    document.getElementById("pre").value = art.precio;
    document.getElementById("sto").value = art.stock;
    document.getElementById("sto").readOnly = true;

    document.getElementById("modal").classList.remove("hidden");
}

// ---------- GUARDAR ----------
function guardarArticulo() {
    const codigo = document.getElementById("cod").value.trim();
    const nombre = document.getElementById("nom").value.trim();
    const precio = parseFloat(document.getElementById("pre").value);
    const stock = parseInt(document.getElementById("sto").value);

    if (!codigo || !nombre || isNaN(precio) || isNaN(stock)) {
        alert("Completa todos los campos correctamente.");
        return;
    }

    const articulo = {
        id: editId || crypto.randomUUID(),
        codigo,
        nombre,
        precio,
        stock
    };

    DB.saveArticulo(articulo);
    cerrarModal();
    cargarCatalogo();
}

// ---------- ELIMINAR ----------
function eliminar(id) {
    if (!confirm("¿Eliminar artículo?")) return;
    DB.deleteArticulo(id);
    cargarCatalogo();
}

// ---------- CERRAR ----------
function cerrarModal() {
    document.getElementById("modal").classList.add("hidden");
}

// ---------- INICIO ----------
cargarCatalogo();

document.getElementById('btn-import-csv')?.addEventListener('click',  ()  =>  {
   const  fileInput =  document.getElementById('file-csv');
   fileInput.click();  //  ←  abre el  selector  de  archivos
});

document.getElementById('file-csv')?.addEventListener('change', (e)  =>  {
   const  f  = e.target.files[0];
    if (!f)  return  alert('No  se seleccionó  archivo');
   const  reader  =  new FileReader();
    reader.onload =  (ev)  =>  {
      const  text  =  ev.target.result;
      parseAndImportCSV(text);
    };
   reader.readAsText(f,  'utf-8');
});


function parseAndImportCSV(text){
  const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(Boolean);
  const headers = rows.shift().split(',').map(h=>h.trim().toLowerCase());
  const items = rows.map(r => {
    const cols = r.split(',');
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i]?.trim()||'');
    return {
      id: obj.id || crypto.randomUUID(),
      codigo: obj.codigo || obj.code || '',
      nombre: obj.nombre || obj.name || '',
      precio: parseFloat(obj.precio||0) || 0,
      stock: parseInt(obj.stock||0) || 0,
      imagen: obj.imagen || ''
    };
  });
  // merge with existing (replace by codigo)
  const existing = DB.getArticles();
  items.forEach(it => {
    const idx = existing.findIndex(x=>x.codigo===it.codigo);
    if(idx>=0) existing[idx] = it; else existing.push(it);
  });
  DB.saveArticles(existing);
  alert('Importado: ' + items.length + ' artículos');
  location.reload();
}

function exportCatalogCSV() {
    // 1. Obtener catálogos directo de la memoria local
    const articulos = DB.getArticles() || [];
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('pos_inventory_log')) || [];
    } catch (e) {
        historial = [];
    }

    const rows = [];
    
    // ========================================================
    // CABECERAS DE LA TABLA MAESTRA UNIFICADA DE AUDITORÍA
    // ========================================================
    rows.push([
        "Código SKU", 
        "Artículo / Prenda", 
        "Precio", 
        "Stock Anterior", 
        "Cantidad Movida", 
        "Stock Resultante", 
        "Fecha y Hora Movimiento", 
        "Usuario Responsable", 
        "Tipo de Operación", 
        "Motivo / Comentarios Breves"
    ]);

    // ========================================================
    // PASO 2: MAPEAR LOS DATOS BASADOS EN EL HISTORIAL (CRONOLÓGICO)
    // ========================================================
    // Primero exportamos los productos que sí han tenido movimientos auditados
    historial.forEach(h => {
        const fechaMov = h.fecha ? new Date(h.fecha).toLocaleString() : '—';
        
        // Traducimos el identificador técnico al formato ejecutivo comercial
        let opOriginal = String(h.tipo_movimiento || '').trim().toLowerCase();
        let operacionTexto = "🔧 Ajuste Manual"; 
        if (opOriginal.includes('surtido'))   operacionTexto = "📈 Entrada - Surtido";
        if (opOriginal.includes('traspaso') && opOriginal.includes('entrada')) operacionTexto = "🔄 Entrada - Traspaso";
        if (opOriginal.includes('traspaso') && opOriginal.includes('salida'))  operacionTexto = "🔄 Salida - Traspaso";
        if (opOriginal.includes('auditoria') || opOriginal.includes('conteo'))  operacionTexto = "🔧 Ajuste - Conteo Puro";
        if (opOriginal.includes('merma') || opOriginal.includes('daño'))       operacionTexto = "📉 Salida - Merma/Daño";

        const cantidad = typeof h.cantidad_capturada !== 'undefined' ? h.cantidad_capturada : (h.cantidad_movida || 0);
        const stockAnt = typeof h.stock_anterior !== 'undefined' ? h.stock_anterior : 0;
        
        // Buscamos el nombre del artículo en el catálogo si es necesario
        let nombreArt = h.nombre_article || h.nombre_articulo || h.articulo || '';
        const skuBuscado = h.codigo_articulo || h.codigo || '';
        if (!nombreArt && skuBuscado) {
            const encontrado = articulos.find(a => String(a.codigo) === String(skuBuscado));
            if (encontrado) nombreArt = encontrado.nombre;
        }
        if (!nombreArt) nombreArt = "Artículo no identificado";

        const nombreArtLimpio = String(nombreArt).replace(/"/g, '""');
        const motivoLimpio = String(h.motivo || h.reason || '—').replace(/"/g, '""');
        const codigoLimpio = String(skuBuscado).replace(/"/g, '""');

        // Insertamos la fila completa unificada
        rows.push([
            `"${codigoLimpio}"`,
            `"${nombreArtLimpio}"`,
            Number(h.precio || 0), // Si no tiene el precio guardado en el log, saldrá 0
            Number(stockAnt),
            Number(cantidad),
            Number(h.stock_actualizado || 0),
            `"${fechaMov}"`,
            `"${h.usuario || '—'}"`,
            `"${operacionTexto}"`,
            `"${motivoLimpio}"`
        ]);
    });

    // ========================================================
    // PASO 3: INCLUIR PRODUCTOS SIN MOVIMIENTOS (CORREGIDO Y ALINEADO)
    // ========================================================
    articulos.forEach(a => {
        const yaExportado = historial.some(h => String(h.codigo_articulo || h.codigo) === String(a.codigo));
        
        if (!yaExportado) {
            const nombreLimpio = String(a.nombre || '').replace(/"/g, '""');
            const codigoLimpio = String(a.codigo || '').replace(/"/g, '""');
            const fechaUltima = a.ultimo_movimiento ? new Date(a.ultimo_movimiento).toLocaleString() : '—';
            const usuarioUltimo = a.usuario_movimiento || '—';

            rows.push([
                `"${codigoLimpio}"`,                       // 1. Código SKU (Col A)
                `"${nombreLimpio}"`,                       // 2. Artículo / Prenda (Col B)
                Number(a.precio || 0),                     // 3. Precio (Col C)
                Number(a.stock || 0),                      // 4. Stock Anterior (Col D)
                0,                                         // 5. Cantidad Movida (Col E)
                Number(a.stock || 0),                      // 6. Stock Resultante (Col F)
                `"${fechaUltima}"`,                        // 7. Fecha y Hora Movimiento (Col G)
                `"${usuarioUltimo}"`,                      // 8. Usuario Responsable (Col H)
                "\"\"",                  // 9. Tipo de Operación (Col I)
                "\"\"" // 10. Motivo (Col J)
            ]);
        }
    });

    // Convertir la matriz de una sola tabla a texto separado por comas
    const csvContent = rows.map(e => e.join(",")).join("\n");

    // Cabecera BOM UTF-8 para Excel
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    
    const fechaHoy = new Date().toISOString().split('T');
    link.download = `Inventario_Unificado_${fechaHoy}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}




document.getElementById("btn-export-csv")?.addEventListener("click", exportCatalogCSV);


document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        const modal = document.getElementById("modal");
        if (modal && !modal.classList.contains("hidden")) {
            // Cerrar modal
            modal.classList.add("hidden");
	}
        const modalStock = document.getElementById("modal-stock-adjust");
        if (modalStock && !modalStock.classList.contains("hidden")) {
            // Cerrar modal
            modalStock.classList.add("hidden");
	}

        const modalHistoryStock = document.getElementById("modal-article-history");
        if (modalHistoryStock && !modalHistoryStock.classList.contains("hidden")) {
            // Cerrar modal
            modalHistoryStock.classList.add("hidden");
	}
    }
});

// Variable global para retener el código único del artículo seleccionado
let currentStockArticleCode = null;

function openStockModal(codigoArticulo) {
    // 🔥 BUSQUEDA BLINDADA: Buscamos en la base de datos comparando por la propiedad .codigo
    const articulo = DB.getArticles().find(a => String(a.codigo) === String(codigoArticulo));
    if (!articulo) return alert("Error: No se encontró el artículo seleccionado.");

    // Guardamos el código maestro en la variable global para el momento de guardar
    currentStockArticleCode = codigoArticulo;
    
    const stockReal = typeof articulo.stock !== 'undefined' ? Number(articulo.stock) : 0;

    // Inyectar datos reales directo del objeto de la base de datos a la modal
    document.getElementById('stock-modal-title').textContent = `Ajustar Stock: ${articulo.nombre}`;
    document.getElementById('stock-modal-sku').textContent = `Código/SKU: ${articulo.codigo}`;
    
    // Forzamos la inyección visual en el input de tu HTML
    const inputStock = document.getElementById('inventory-modal-stock') || document.getElementById('st-current');
    if (inputStock) {
        inputStock.value = stockReal;
    }
    
    // Limpieza de campos de captura para el nuevo movimiento
    const inputQty = document.getElementById('inventory-modal-qty') || document.getElementById('st-qty');
    if (inputQty) inputQty.value = '';

    const inputReason = document.getElementById('inventory-modal-reason') || document.getElementById('st-reason');
    if (inputReason) inputReason.value = '';

    const selectorTipo = document.getElementById('inventory-modal-type') || document.getElementById('st-type');
    if (selectorTipo) selectorTipo.selectedIndex = 0;

    document.getElementById('modal-stock-adjust').classList.remove('hidden');
}

function guardarAjusteInventario() {
    const inputQty = document.getElementById('inventory-modal-qty') || document.getElementById('st-qty');
    const inputType = document.getElementById('inventory-modal-type') || document.getElementById('st-type');
    const inputReason = document.getElementById('inventory-modal-reason') || document.getElementById('st-reason');

    const qtyIn = parseInt(inputQty ? inputQty.value : 0);
    const typeIn = inputType ? inputType.value : "entrada_surtido";
    const reasonIn = inputReason ? inputReason.value.trim() : "";

    const listaArticulos = DB.getArticles();
    const articulo = listaArticulos.find(a => String(a.codigo) === String(currentStockArticleCode));
    if (!articulo) return alert("Error interno: No se pudo identificar el artículo.");

    const currentStock = typeof articulo.stock !== 'undefined' ? Number(articulo.stock) : 0;

    // Validaciones estrictas de control
    if (isNaN(qtyIn) || qtyIn < 0) return alert("Por favor, ingresa una cantidad numérica válida igual o mayor a cero.");
    if (!reasonIn) return alert("Por favor, describe detalladamente el motivo del movimiento.");

    let nuevoStock = currentStock;

    // 🔥 REGLA DE NEGOCIO SELECCIONADA POR EL USUARIO:
    if (typeIn === 'ajuste_auditoria') {
        // En auditoría, el valor capturado reemplaza directamente al stock actual per se
        nuevoStock = qtyIn;
    } else {
        // Para el resto de las opciones, opera con sumas y restas tradicionales
        const esSalida = typeIn.includes('salida');
        nuevoStock = esSalida ? (currentStock - qtyIn) : (currentStock + qtyIn);
    }

    if (nuevoStock < 0) {
        return alert(`Operación cancelada: El ajuste dejaría el stock en negativo (${nuevoStock}).`);
    }

    const timestampActual = new Date().toISOString();
    
    // Obtener contexto seguro del empleado activo
    const sessionData = sessionStorage.getItem('pos_user') || sessionStorage.getItem('pos_cashier');
    let nombreUsuarioLogueado = "Administrador";
    if (sessionData) {
        try {
            const parsed = JSON.parse(sessionData);
            nombreUsuarioLogueado = parsed.user || parsed.usuario || nombreUsuarioLogueado;
        } catch(e) {
            nombreUsuarioLogueado = sessionData;
        }
    }

    // ACTUALIZAR EL ARTÍCULO EN LA BASE DE DATOS MAESTRA
    const articulosActualizados = listaArticulos.map(art => {
        if (String(art.codigo) === String(currentStockArticleCode)) { 
            return { 
                ...art, 
                stock: nuevoStock,
                ultimo_movimiento: timestampActual, // Guarda fecha y hora
                usuario_movimiento: nombreUsuarioLogueado // Guarda usuario
            };
        }
        return art;
    });
    DB.saveArticles(articulosActualizados);

    // REGISTRAR EN EL HISTORIAL CRONOLÓGICO (KARDEX COMPLETO)
    const historialLog = DB.getInventoryLog();
    const nuevoRegistroLog = {
        id: Date.now().toString(),
        fecha: timestampActual,
        usuario: nombreUsuarioLogueado,
        codigo_articulo: currentStockArticleCode,
        nombre_articulo: articulo.nombre,
        tipo_movimiento: typeIn,
        cantidad_capturada: qtyIn,
        stock_anterior: currentStock,
        stock_actualizado: nuevoStock,
        motivo: reasonIn
    };
    
    historialLog.unshift(nuevoRegistroLog);
    DB.saveInventoryLog(historialLog);

    alert(`¡Movimiento de inventario aplicado con éxito!\nNuevo stock: ${nuevoStock} unidades.`);
    
    cerrarModalStock();
    cargarCatalogo(currentPage); 
}


function cerrarModalStock() {
    document.getElementById('modal-stock-adjust').classList.add('hidden');
    currentStockArticleCode = null;
}

// Función para desplegar la bitácora completa de un artículo específico en pantalla
function verHistorialArticulo(codigoArticulo) {
    const articulos = DB.getArticles() || [];
    const articulo = articulos.find(a => String(a.codigo) === String(codigoArticulo));
    if (!articulo) return alert("Artículo no encontrado.");

    // 1. Recuperar el log completo del LocalStorage
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('pos_inventory_log')) || [];
    } catch (e) {
        historial = [];
    }

    // 2. Filtrar el historial dejando únicamente los movimientos de este artículo
    const movimientosArticulo = historial.filter(h => String(h.codigo_articulo || h.codigo) === String(codigoArticulo));

    // 3. Rellenar etiquetas de cabecera de la modal
    document.getElementById('history-modal-title').textContent = `Historial de Cambios: ${articulo.nombre}`;
    document.getElementById('history-modal-sku').textContent = `Código SKU: ${articulo.codigo} | Stock Actual: ${articulo.stock || 0}`;

    const tbody = document.getElementById('history-rows-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 4. Si nunca ha tenido movimientos, mostrar renglón vacío informativo
    if (movimientosArticulo.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 15px; color: #888;">Este artículo no registra modificaciones manuales de stock en esta terminal.</td></tr>`;
    } else {
        // 5. Inyectar cronológicamente cada fecha en la que se movió el stock
        movimientosArticulo.forEach(m => {
            const tr = document.createElement('tr');
            const fecha = m.fecha ? new Date(m.fecha).toLocaleString() : '—';
            
            let opTexto = m.tipo_movimiento || '—';
            if (opTexto.includes('surtido'))   opTexto = "📈 Surtido";
            if (opTexto.includes('entrada_traspaso')) opTexto = "🔄 En. Traspaso";
            if (opTexto.includes('salida_traspaso'))  opTexto = "🔄 Sal. Traspaso";
            if (opTexto.includes('auditoria') || opTexto.includes('conteo'))  opTexto = "🔧 Auditoría";
            if (opTexto.includes('merma'))     opTexto = "📉 Merma";

            const cant = typeof m.cantidad_capturada !== 'undefined' ? m.cantidad_capturada : (m.cantidad_movida || 0);

            tr.innerHTML = `
                <td style="padding: 8px; font-size: 12px; color: #555;">${fecha}</td>
                <td style="padding: 8px; font-weight: 600;">${m.usuario || '—'}</td>
                <td style="padding: 8px;"><span style="font-size: 11px;">${opTexto}</span></td>
                <td style="padding: 8px; text-align: center;">${cant}</td>
                <td style="padding: 8px; text-align: center; font-weight: bold;">${m.stock_actualizado || m.stock_nuevo || 0}</td>
                <td style="padding: 8px; font-style: italic; font-size: 12px; color: #666;">"${m.motivo || '—'}"</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 6. Mostrar la modal en el panel de MeetFashion
    document.getElementById('modal-article-history')?.classList.remove('hidden');
}

function cerrarModalHistorial() {
    document.getElementById('modal-article-history')?.classList.add('hidden');
}



// ========================================================
// EXPORTAR EXCLUSIVAMENTE LA BITÁCORA HISTÓRICA (KARDEX)
// ========================================================
function exportInventoryLogCSV() {
    const articulos = DB.getArticles() || [];
    
    // 1. Obtener la bitácora desde la memoria del LocalStorage de forma segura
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('pos_inventory_log')) || [];
    } catch (e) {
        historial = [];
    }

    const rows = [];

    // 2. Definir los encabezados oficiales de auditoría
    rows.push([
        "Fecha y Hora", 
        "Usuario Responsable", 
        "Código SKU", 
        "Artículo / Prenda", 
        "Tipo de Operación", 
        "Cantidad Movida", 
        "Stock Anterior", 
        "Stock Resultante", 
        "Motivo / Comentarios de Auditoría"
    ]);

    // 3. Si la bitácora está completamente vacía, insertar renglón preventivo
    if (!historial || historial.length === 0) {
        rows.push([
            "—", "—", "—", "—", 
            "Sin movimientos registrados en el sistema", 
            0, 0, 0, 
            "No se registran ajustes manuales de inventario en esta terminal todavía."
        ]);
    } else {
        // 4. Mapear cada celda del Kardex asegurando el filtrado de comas para Excel
        historial.forEach(h => {
            const fechaMov = h.fecha ? new Date(h.fecha).toLocaleString() : '—';
            
            // Traducir identificadores técnicos a formato comercial legible
            let opOriginal = String(h.tipo_movimiento || '').trim().toLowerCase();
            let operacionTexto = "🔧 Ajuste Manual"; 
            if (opOriginal.includes('surtido'))   operacionTexto = "📈 Entrada - Surtido de Mercancía";
            if (opOriginal.includes('traspaso') && opOriginal.includes('entrada')) operacionTexto = "🔄 Entrada - Traspaso de Tienda";
            if (opOriginal.includes('traspaso') && opOriginal.includes('salida'))  operacionTexto = "🔄 Salida - Traspaso de Tienda";
            if (opOriginal.includes('auditoria') || opOriginal.includes('conteo'))  operacionTexto = "🔧 Ajuste - Conteo Puro por Conteo";
            if (opOriginal.includes('merma') || opOriginal.includes('daño'))       operacionTexto = "📉 Salida - Prenda Dañada / Merma";

            const cantidad = typeof h.cantidad_capturada !== 'undefined' ? h.cantidad_capturada : (h.cantidad_movida || 0);
            const stockAnt = typeof h.stock_anterior !== 'undefined' ? h.stock_anterior : 0;
            const stockNvo = typeof h.stock_actualizado !== 'undefined' ? h.stock_actualizado : 0;
            
            // Recuperar dinámicamente el nombre del artículo si faltaba en el log
            let nombreArt = h.nombre_article || h.nombre_articulo || h.articulo || '';
            const skuBuscado = h.codigo_articulo || h.codigo || '';
            if (!nombreArt && skuBuscado) {
                const encontrado = articulos.find(a => String(a.codigo) === String(skuBuscado));
                if (encontrado) nombreArt = encontrado.nombre;
            }
            if (!nombreArt) nombreArt = "Artículo no identificado";

            // Limpieza estricta de textos para que las comillas dobles internas no corrompan las celdas
            const nombreArtLimpio = String(nombreArt).replace(/"/g, '""');
            const motivoLimpio = String(h.motivo || h.reason || '—').replace(/"/g, '""');
            const codigoLimpio = String(skuBuscado).replace(/"/g, '""');

            rows.push([
                `"${fechaMov}"`,
                `"${h.usuario || '—'}"`,
                `"${codigoLimpio}"`,
                `"${nombreArtLimpio}"`,
                `"${operacionTexto}"`,
                Number(cantidad),
                Number(stockAnt),
                Number(stockNvo),
                `"${motivoLimpio}"`
            ]);
        });
    }

    // 5. Compilar la matriz y forzar la descarga con cabecera BOM UTF-8
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    
    // Nombrar el archivo automáticamente con la fecha y hora de la auditoría actual
    const timestampArchivo = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `Bitacora_Kardex_Stock_${timestampArchivo}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


