let editId = null;

// ---------- CARGAR LISTA ----------
let currentPage  =  1;
const  pageSize =  20;  //  artículos  por página
let  filteredData  =  [];

function  cargarCatalogo(page  =  1) {
       const  q  =  document.getElementById("search-cat")?.value.trim().toLowerCase()  || "";
       const  allData  =  DB.getArticles();

       // Filtrar  por  búsqueda
       filteredData  =  q
              ?  allData.filter(a =>
                      a.nombre.toLowerCase().includes(q)  ||
                     a.codigo.toLowerCase().includes(q)
              )
              :  allData;

       //  Paginación
       const  totalPages =  Math.ceil(filteredData.length  /  pageSize);
       currentPage  = Math.min(page,  totalPages);

       const  start  = (currentPage  -  1)  *  pageSize;
       const end  =  start  +  pageSize;
       const data  =  filteredData.slice(start,  end);

       const body  =  document.getElementById("catBody");
       body.innerHTML  =  "";

       data.forEach(a  =>  {
              const  tr  =  document.createElement("tr");
              tr.innerHTML  = `
                      <td>${a.codigo}</td>
                     <td>${a.nombre}</td>
                      <td>${mxn(a.precio)}</td>
                     <td>${a.stock}</td>
                     <td>
                            <button  class="btn-primary"  onclick="editar('${a.id}')">Editar</button>
                            <button  class="btn-sec"  onclick="eliminar('${a.id}')">Eliminar</button>
                            <button  class="btn-sec"  onclick="stock('${a.id}')">📋 Stock</button>

                     </td>
              `;
               body.appendChild(tr);
       });

       renderPagination(totalPages);
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

let currentStockArticleCode = null; // Guarda el código del artículo seleccionado

function abrirModalStock(codigoArticulo) {
    const articulo = DB.getArticles().find(a => a.codigo === codigoArticulo);
    if (!articulo) return;

    currentStockArticleCode = codigoArticulo;
    
    // Rellenar etiquetas e inputs informativos
    document.getElementById('stock-modal-title').textContent = `Ajustar Stock: ${articulo.nombre}`;
    document.getElementById('stock-modal-sku').textContent = `Código/SKU: ${articulo.codigo}`;
    document.getElementById('st-current').value = articulo.stock || 0;
    
    // Limpiar campos de captura
    document.getElementById('st-qty').value = '';
    document.getElementById('st-reason').value = '';
    document.getElementById('st-type').selectedIndex = 0;

    document.getElementById('modal-stock-adjust').classList.remove('hidden');
}

//El sistema calculará el nuevo stock sumando o restando automáticamente según el tipo de operación, capturando al usuario logueado en la sesión activa

function guardarAjusteInventario() {
    const qtyIn = parseInt(document.getElementById('st-qty').value);
    const typeIn = document.getElementById('st-type').value;
    const reasonIn = document.getElementById('st-reason').value.trim();
    const currentStock = parseInt(document.getElementById('st-current').value || 0);

    // 1. Validaciones obligatorias de seguridad
    if (!qtyIn || qtyIn <= 0 || isNaN(qtyIn)) return alert("Ingresa una cantidad válida mayor a cero.");
    if (!reasonIn) return alert("Por favor, describe el motivo detallado del movimiento.");

    // Recuperar usuario logueado de la sesión activa
    const userSession = JSON.parse(sessionStorage.getItem('pos_user')) || { user: 'Desconocido' };

    // 2. Determinar si el movimiento suma o resta al inventario
    const esSalida = typeIn.includes('salida');
    let nuevoStock = esSalida ? (currentStock - qtyIn) : (currentStock + qtyIn);

    if (nuevoStock < 0) {
        return alert(`Operación inválida: El ajuste dejaría el stock en negativo (${nuevoStock}). Verifica las unidades.`);
    }

    // 3. ACTUALIZAR EL ARTÍCULO EN EL CATÁLOGO
    const listaArticulos = DB.getArticles();
    const articulosActualizados = listaArticulos.map(art => {
        if (art.codigo === currentStockArticleCode) {
            return { ...art, stock: nuevoStock };
        }
        return art;
    });
    DB.saveArticles(articulosActualizados);

    // 4. CREAR EL REGISTRO DE AUDITORÍA (KARDEX)
    const historialLog = DB.getInventoryLog();
    const nuevoRegistroLog = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        usuario: userSession.user,
        codigo: currentStockArticleCode,
        tipo_movimiento: typeIn,
        cantidad_movida: qtyIn,
        stock_anterior: currentStock,
        stock_actualizado: nuevoStock,
        motivo: reasonIn
    };
    
    historialLog.unshift(nuevoRegistroLog); // Añade al inicio del historial
    DB.saveInventoryLog(historialLog);

    alert(`¡Movimiento aplicado con éxito! Nuevo stock: ${nuevoStock} unidades.`);
    
    // 5. Limpieza de UI
    cerrarModalStock();
    if (typeof renderArticles === "function") renderArticles(); // Refresca tu tabla de artículos
}

function cerrarModalStock() {
    document.getElementById('modal-stock-adjust').classList.add('hidden');
    currentStockArticleCode = null;
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
    }
});
