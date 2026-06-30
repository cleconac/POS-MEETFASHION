let editId = null;

// ---------- CARGAR LISTA ----------
let currentPage  =  1;
const  pageSize =  20;  //  artículos  por página
let  filteredData  =  [];

function cargarCatalogo(page = 1) {
       const q = document.getElementById("search-cat")?.value.trim().toLowerCase() || "";
       const allData = DB.getArticles();

       // 1. Filtrar por búsqueda de forma limpia
       filteredData = q
              ? allData.filter(a =>
                      a.nombre.toLowerCase().includes(q) ||
                      a.codigo.toLowerCase().includes(q)
              )
              : allData;

       // 2. Control estricto de Paginación Matemática
       const totalPages = Math.ceil(filteredData.length / pageSize);
       currentPage = Math.min(page, totalPages);
       if (currentPage < 1) currentPage = 1;

       const start = (currentPage - 1) * pageSize;
       const end = start + pageSize;
       
       // 'data' contiene ÚNICAMENTE los 20 artículos que se ven en la pantalla actual
       const data = filteredData.slice(start, end);

       const body = document.getElementById("catBody");
       if (!body) return;
       body.innerHTML = "";

       // 3. GENERAR FILAS: Forzamos el uso estricto del ID único de cada prenda de ropa
       data.forEach(a => {
              const tr = document.createElement("tr");
              
              // Resguardo bilingüe por si tu base de datos guarda .id o ._id
              const idUnicoReal = a.id || a.codigo || ''; 
              const stockSeguro = typeof a.stock !== 'undefined' ? a.stock : 0;

              tr.innerHTML = `
                     <td>${a.codigo}</td>
                     <td>${a.nombre}</td>
                     <td>${mxn ? mxn(a.precio) : '$' + Number(a.precio).toFixed(2)}</td>
                     <td>${stockSeguro}</td>
                     <td>
                            <!-- 🔥 CORRECCIÓN CRÍTICA: Forzamos a que el onclick use el ID exacto de esta iteración -->
                            <button class="btn-primary" onclick="editar('${idUnicoReal}')">Editar</button>
                            <button class="btn-sec" onclick="eliminar('${idUnicoReal}')">Eliminar</button>
                            <button class="btn-sec" onclick="openStockModal('${idUnicoReal}')">📋 Stock</button>
                     </td>
              `;
              body.appendChild(tr);
       });

       // Renderizar los botones de las páginas abajo
       if (typeof renderPagination === "function") {
           renderPagination(totalPages);
       }
}


function  renderPagination(totalPages)  {
    const  container  = document.getElementById("pagination");
    if  (!container)  return;
   container.innerHTML  =  "";

    if  (currentPage >  1)  {
        const prev  =  document.createElement("button");
        prev.textContent =  "←";
        prev.addEventListener("click",  () =>  cargarCatalogo(currentPage  -  1));
       container.appendChild(prev);
    }

    for (let  i  =  1;  i  <=  totalPages;  i++) {
        const  btn  = document.createElement("button");
        btn.textContent  =  i;
       btn.className  =  (i  === currentPage)  ?  "active"  :  "";
       btn.addEventListener("click",  ()  =>  cargarCatalogo(i));
       container.appendChild(btn);
    }

   if  (currentPage  <  totalPages)  {
       const  next  =  document.createElement("button");
       next.textContent  =  "→";
       next.addEventListener("click",  ()  =>  cargarCatalogo(currentPage  +  1));
       container.appendChild(next);
    }
}


document.getElementById("search-cat")?.addEventListener("input",  ()  => {
       cargarCatalogo(1);  //  reinicia  en  página 1  al  buscar
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
    const rows = [];
    const headers = ["Código", "Artículo", "Precio", "Stock"];
    rows.push(headers);

    document.querySelectorAll("#catBody tr").forEach(tr => {
        const cols = tr.querySelectorAll("td");
        rows.push([
            cols[0].textContent.trim(),
            cols[1].textContent.trim(),
            parseFloat(cols[2].textContent.replace(/[^0-9.]/g, "")),
            parseInt(cols[3].textContent.trim())
        ]);
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");

    // 🔹 BOM al inicio para que Excel reconozca UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "CatalogoArticulos.csv";
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
    }
});

// Variable global única y blindada
let currentStockArticleCode = null;

function openStockModal(idArticulo) {
    // 1. Extraer los datos reales directo de tu LocalStorage mediante tu objeto DB
    const articulo = DB.getArticles().find(a => a.id === idArticulo);
    if (!articulo) return alert("Artículo no encontrado.");

    // 2. Anclar el ID único en la memoria global del script
    currentStockArticleCode = idArticulo;
    
    // 3. Procesar matemáticamente las existencias registradas (si es undefined, se vuelve 0)
    const stockReal = typeof articulo.stock !== 'undefined' ? Number(articulo.stock) : 0;

    // 4. Inyectar de forma directa los textos descriptivos a la interfaz
    document.getElementById('stock-modal-title').textContent = `Ajustar Stock: ${articulo.nombre}`;
    document.getElementById('stock-modal-sku').textContent = `Código/SKU: ${articulo.codigo}`;
    
    // 5. BLINDAJE UX/UI: Localizar el input por cualquiera de sus variantes y FORZAR el número real
    const inputStock = document.getElementById('inventory-modal-stock') || document.getElementById('st-current');
    if (inputStock) {
        inputStock.value = stockReal; // Aquí se sobrescribe y destruye cualquier 1000 fantasma
    }
    
    // 6. Blanquear rigurosamente los campos de entrada de datos para el nuevo movimiento
    const inputsCaptura = ['inventory-modal-qty', 'st-qty', 'inventory-modal-reason', 'st-reason'];
    inputsCaptura.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const selectorTipo = document.getElementById('inventory-modal-type') || document.getElementById('st-type');
    if (selectorTipo) selectorTipo.selectedIndex = 0;

    // 7. Desplegar el modal removiendo la propiedad de ocultación
    const modal = document.getElementById('modal-stock-adjust');
    if (modal) modal.classList.remove('hidden');
}

function guardarAjusteInventario() {
    // 1. Capturar cantidades de forma flexible evaluando ambas nomenclaturas de ID
    const inputQty = document.getElementById('inventory-modal-qty') || document.getElementById('st-qty');
    const inputType = document.getElementById('inventory-modal-type') || document.getElementById('st-type');
    const inputReason = document.getElementById('inventory-modal-reason') || document.getElementById('st-reason');

    const qtyIn = parseInt(inputQty ? inputQty.value : 0);
    const typeIn = inputType ? inputType.value : "entrada_surtido";
    const reasonIn = inputReason ? inputReason.value.trim() : "";

    // 2. Ir directo a la DB usando la variable global segura (Evitamos leer el st-current del HTML)
    const listaArticulos = DB.getArticles();
    const articulo = listaArticulos.find(a => a.id === currentStockArticleCode);
    if (!articulo) return alert("Error interno: No se pudo identificar el artículo seleccionado.");

    // 3. Tomar el stock original directo de la base de datos local en memoria
    const currentStock = typeof articulo.stock !== 'undefined' ? Number(articulo.stock) : 0;

    // 4. Validaciones obligatorias de negocio
    if (!qtyIn || qtyIn <= 0 || isNaN(qtyIn)) {
        return alert("Por favor, ingresa una cantidad válida mayor a cero.");
    }
    if (!reasonIn) {
        return alert("Por favor, describe detalladamente el motivo del movimiento.");
    }

    // 5. Calcular aritméticamente si la operación suma o resta
    const esSalida = typeIn.includes('salida');
    let nuevoStock = esSalida ? (currentStock - qtyIn) : (currentStock + qtyIn);

    if (nuevoStock < 0) {
        return alert(`Operación cancelada: El ajuste dejaría el stock en negativo (${nuevoStock}). No hay unidades suficientes.`);
    }

    // 6. ACTUALIZAR EL CATÁLOGO EN TU LOCALSTORAGE
    const articulosActualizados = listaArticulos.map(art => {
        if (art.id === currentStockArticleCode) { 
            return { ...art, stock: nuevoStock };
        }
        return art;
    });
    DB.saveArticles(articulosActualizados);

    // 7. REGISTRAR EL MOVIMIENTO EN EL HISTORIAL (KARDEX)
    const historialLog = DB.getInventoryLog();
    const nuevoRegistroLog = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        usuario: currentUser?.user || 'Administrador',
        id_articulo: currentStockArticleCode,
        tipo_movimiento: typeIn,
        cantidad_movida: qtyIn,
        stock_anterior: currentStock,
        stock_actualizado: nuevoStock,
        motivo: reasonIn
    };
    
    historialLog.unshift(nuevoRegistroLog);
    DB.saveInventoryLog(historialLog);

    alert(`¡Movimiento aplicado con éxito!\nNuevo stock: ${nuevoStock} unidades.`);
    
    // 8. Ocultar modal y refrescar la tabla dinámica con paginación
    cerrarModalStock();
    cargarCatalogo(); 
}



function cerrarModalStock() {
    document.getElementById('modal-stock-adjust').classList.add('hidden');
    currentStockArticleCode = null;
}

