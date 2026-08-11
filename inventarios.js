// ====================================================================
// 📦 BLOQUE 1: INICIALIZACIÓN CON MEMORIA DE RESGUARDO PERSISTENTE
// ====================================================================
let listaProductos = [];
let plantillaGenerada = false;

// FUNCIÓN MAESTRA PARA ARRANCAR LA ORDEN DE CONTEO
function iniciarOrdenConteoMasivo() {
    plantillaGenerada = true;
    
    // Guardamos la bandera en el LocalStorage para que sobreviva al F5
    localStorage.setItem('inventario_en_progreso', 'true');

    // Recuperamos la instantánea (Snapshot) si ya existía una guardada en tránsito,
    // de lo contrario, jalamos el catálogo limpio de tu db.js unificada
    const snapshotEnTransito = localStorage.getItem('inventario_snapshot_transito');
    if (snapshotEnTransito) {
        listaProductos = JSON.parse(snapshotEnTransito);
    } else {
        listaProductos = typeof DB !== 'undefined' && DB.getArticles ? DB.getArticles() : (JSON.parse(localStorage.getItem('catalog')) || []);
        // Guardamos una copia inicial para congelar el Snapshot contra ventas simultáneas
        localStorage.setItem('inventario_snapshot_transito', JSON.stringify(listaProductos));
    }

    // Conmutación de vistas: Ocultamos el Kardex y revelamos las hojas de conteo
    const historyPanel = document.getElementById('kardex-history-panel');
    const activePanel  = document.getElementById('active-inventory-panel');
    const btnIniciar   = document.getElementById('btn-generate-template');
    const btnAplicar   = document.getElementById('btn-save-inventory');

    if (historyPanel) historyPanel.style.display = 'none'; 
    if (activePanel)  activePanel.style.display = 'block'; 
    
    if (btnIniciar)   btnIniciar.style.display = 'none';   
    if (btnAplicar)   btnAplicar.style.display = 'flex';   

    renderInventario("");
}

// Escuchador del botón azul centralizado en tu topbar del header
document.getElementById('btn-generate-template')?.addEventListener('click', () => {
    // Si es un inicio limpio desde cero, borramos cualquier rastro previo
    localStorage.removeItem('inventario_snapshot_transito');
    iniciarOrdenConteoMasivo();
});


// ====================================================================
// 📦 RENDERIZADO FLUIDO CON AMARRE RIGUROSO POR .CODIGO (SKU ÚNICO)
// ====================================================================
function renderInventario(filtro = "") {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtrados = listaProductos.filter(p => 
        String(p.nombre || '').toLowerCase().includes(filtro.toLowerCase()) || 
        String(p.codigo || '').toLowerCase().includes(filtro.toLowerCase())
    );

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:30px; font-weight:500;">No se encontraron artículos coincidentes.</td></tr>`;
        return;
    }

    filtrados.forEach(p => {

        // 🔥 VALIDACIÓN CRÍTICA: Forzamos la lectura de tu propiedad real .codigo o .stock
        const codigoArticulo = String(p.codigo).trim();

        // Esto previene desfases si cerraron el navegador y se vendieron piezas en el POS mientras estaba cerrado
        const articuloBaseFresco = typeof DB !== 'undefined' && DB.getArticles ? DB.getArticles().find(x => String(x.codigo) === codigoArticulo) : null;

        const stockTeorico = typeof p.stock !== 'undefined' ? Number(p.stock) : 0;
        
        // Verificamos si el usuario ya modificó la casilla en esta sesión usando el código único
        const inputGuardado = document.getElementById(`fisico-${codigoArticulo}`);
        const valorFisicoActual = typeof p.stock_fisico_capturado !== 'undefined' ? p.stock_fisico_capturado : stockTeorico;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600; color: #475569; font-size: 13px;">${codigoArticulo}</td>
            <td><span style="color: #0f172a; font-weight: 600;">${p.nombre}</span></td>
            
            <!-- 🎯 ANCLAJE AL CÓDIGO MAESTRO -->
            <td class="text-center" style="font-weight: 700; color:#1e293b; font-size: 14px;" id="teorico-${codigoArticulo}">${stockTeorico}</td>
            
            <td class="text-center">
                <input type="number" min="0" class="input-count" id="fisico-${codigoArticulo}" value="${valorFisicoActual}" data-codigo="${codigoArticulo}" oninput="calcularDiscrepancia('${codigoArticulo}')">
            </td>
            <td class="text-center">
                <span id="diff-badge-${codigoArticulo}" class="badge-diff diff-none">0</span>
            </td>
            <td>
                <select id="reason-${codigoArticulo}" class="select-reason" disabled>
                    <option value="">Ninguno (Correcto)</option>
                    <option value="Merma">Merma / Prenda Dañada</option>
                    <option value="Robo">Faltante Desconocido / Robo</option>
                    <option value="Error Proveedor">Error de Captura / Proveedor</option>
                    <option value="Ajuste Manual">Ajuste Técnico Autorizado</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);

        if (inputGuardado) {
            calcularDiscrepancia(codigoArticulo);
        }
    });
}

// ====================================================================
// 📦 BLOQUE 3: CÁLCULO REACTIVO DE DISCREPANCIAS EN TIEMPO REAL
// ====================================================================
window.calcularDiscrepancia = function(codigoArticulo) {
    const stockTeorico = Number(document.getElementById(`teorico-${codigoArticulo}`).textContent);
    const inputFisico = document.getElementById(`fisico-${codigoArticulo}`);
    if (!inputFisico) return;
    
    const stockFisico = inputFisico.value === "" ? stockTeorico : Number(inputFisico.value);
    const diferencia = stockFisico - stockTeorico;
    
    const badge = document.getElementById(`diff-badge-${codigoArticulo}`);
    const selectReason = document.getElementById(`reason-${codigoArticulo}`);

    if (!badge || !selectReason) return;

    badge.textContent = diferencia > 0 ? `+${diferencia}` : diferencia;
    
    if (diferencia === 0) {
        badge.className = "badge-diff diff-none";
        selectReason.value = "";
        selectReason.disabled = true;
    } else if (diferencia > 0) {
        badge.className = "badge-diff diff-sobrante";
        selectReason.disabled = false;
        if(selectReason.value === "") selectReason.value = "Ajuste Manual";
    } else {
        badge.className = "badge-diff diff-faltante";
        selectReason.disabled = false;
        if(selectReason.value === "") selectReason.value = "Robo";
    }

    // 🔥 RESPALDO AL VUELO INTERMEDIO ANTI-F5:
    // Buscamos el artículo en nuestro arreglo temporal en memoria y le actualizamos el stock físico capturado
    const pIdx = listaProductos.findIndex(x => String(x.codigo) === String(codigoArticulo));
    if (pIdx !== -1) {
        // Guardamos temporalmente el valor del input en una propiedad efímera de tránsito
        listaProductos[pIdx].stock_fisico_capturado = inputFisico.value;
        localStorage.setItem('inventario_snapshot_transito', JSON.stringify(listaProductos));
    }
}


// ====================================================================
// 📦 BLOQUE 4: PROCESAMIENTO MÁXIMO DE GUARDADO Y CANCELACIÓN
// ====================================================================
document.getElementById('btn-save-inventory')?.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.input-count');
    let huboCambios = false;
    let listadoProductosAjustados = [];
    
    const usuarioActivo = JSON.parse(sessionStorage.getItem('pos_user') || '{}');
    const estacion = sessionStorage.getItem('estacion-activa') || 'Salto del Agua';

    const catalogoOriginal = typeof DB !== 'undefined' && DB.getArticles ? DB.getArticles() : (JSON.parse(localStorage.getItem('catalog')) || []);

    for (let input of inputs) {
        const codigoArticulo = input.dataset.codigo;
        const stockTeorico = Number(document.getElementById(`teorico-${codigoArticulo}`).textContent);
        const stockFisico = input.value === "" ? stockTeorico : Number(input.value);
        const diferencia = stockFisico - stockTeorico;
        const motivo = document.getElementById(`reason-${codigoArticulo}`).value;

        if (diferencia !== 0) {
            if (!motivo || motivo === "") {
                const nombreProd = input.closest('tr').querySelector('strong, span').textContent;
                alert(`⚠️ CONTROL DE AUDITORÍA:\nEs obligatorio seleccionar un motivo de ajuste válido para el producto: "${nombreProd}".`);
                return;
            }

            // 🎯 BUSQUEDA BLINDADA POR CÓDIGO MAESTRO IDENTICO A TU MODAL
            const pIdx = catalogoOriginal.findIndex(x => String(x.codigo) === String(codigoArticulo));
            if (pIdx !== -1) {
                catalogoOriginal[pIdx].stock = stockFisico;
                huboCambios = true;

                listadoProductosAjustados.push({
                    producto: catalogoOriginal[pIdx].nombre,
                    codigo: codigoArticulo,
                    cantidad_anterior: stockTeorico,
                    cantidad_nueva: stockFisico,
                    variacion: diferencia,
                    motivo: motivo
                });
            }
        }
    }

    if (huboCambios) {
        localStorage.setItem('catalog', JSON.stringify(catalogoOriginal));
        if (typeof DB !== 'undefined' && DB.saveArticles) DB.saveArticles(catalogoOriginal);

        const idOrdenUnico = "INV-" + Date.now().toString().slice(-6);

        const nuevaOrdenKardex = {
            id_orden: idOrdenUnico,
            fecha: new Date().toISOString(),
            estacion: estacion,
            usuario: usuarioActivo.user || 'Admin',
            total_ajustes: listadoProductosAjustados.length,
            detalles: listadoProductosAjustados
        };

        let historialKardexLotes = JSON.parse(localStorage.getItem('kardex_lotes_inventario')) || [];
        historialKardexLotes = [nuevaOrdenKardex, ...historialKardexLotes];
        localStorage.setItem('kardex_lotes_inventario', JSON.stringify(historialKardexLotes));

        alert(`🎉 ¡Inventario conciliado con éxito!\nSe generó el Folio: ${idOrdenUnico}.`);
        window.location.reload();
    } else {
        alert("No se detectaron variaciones en el conteo físico actual.");
    }


	localStorage.removeItem('inventario_en_progreso');
	localStorage.removeItem('inventario_snapshot_transito');


});


// ====================================================================
// ❌ FUNCIÓN DE CANCELACIÓN SEGURA DE LA ORDEN DE CONTEO FÍSICO
// ====================================================================
document.getElementById('btn-cancel-inventory')?.addEventListener('click', () => {
    if (!confirm("⚠️ ¿CONFIRMAR CANCELACIÓN?\nSe borrarán las cantidades capturadas.\nEl stock permanecerá intacto. ¿Deseas abortar?")) return;

    plantillaGenerada = false;
    listaProductos = [];
    const buscador = document.getElementById('inv-search');
    if (buscador) buscador.value = "";

    const historyPanel = document.getElementById('kardex-history-panel');
    const activePanel  = document.getElementById('active-inventory-panel');
    const btnIniciar   = document.getElementById('btn-generate-template');
    const btnAplicar   = document.getElementById('btn-save-inventory');

    if (historyPanel) historyPanel.style.display = 'block';
    if (activePanel)  activePanel.style.display = 'none';
    if (btnIniciar)   btnIniciar.style.display = 'flex';
    if (btnAplicar)   btnAplicar.style.display = 'none';

    cargarBitacoraKardex();

    localStorage.removeItem('inventario_en_progreso');
    localStorage.removeItem('inventario_snapshot_transito');

});

// ====================================================================
// 📦 BLOQUE 5: FILTROS DE APOYO Y PREVISUALIZACIÓN INTERACTIVA DERECHA
// ====================================================================
document.getElementById('inv-search')?.addEventListener('input', (e) => {
    renderInventario(e.target.value);
});

document.getElementById('btn-back-pos')?.addEventListener('click', () => {
    window.location.href = 'ventas.html';
});

function cargarBitacoraKardex() {
    const tbodyKardex = document.getElementById('kardex-orders-tbody');
    if (!tbodyKardex) return;

    const historialLotes = JSON.parse(localStorage.getItem('kardex_lotes_inventario')) || [];
    
    if (historialLotes.length === 0) {
        tbodyKardex.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:30px; font-weight:500;">No se registran órdenes de inventario consolidadas.</td></tr>`;
        return;
    }

    tbodyKardex.innerHTML = "";
    historialLotes.slice(0, 10).forEach(orden => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.className = 'kardex-row-clickable';
        
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 700; color: #0066ff; padding: 12px 10px;">${orden.id_orden}</td>
            <td style="color:#475569; padding:12px 10px;">${new Date(orden.fecha).toLocaleString()}</td>
            <td class="text-center" style="padding:12px 10px;">
                <span style="background:#e0f2fe; color:#0369a1; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:600; text-transform:uppercase;">${orden.estacion}</span>
            </td>
            <td style="font-weight:600; color:#334155; padding:12px 10px;">${orden.usuario}</td>
            <td class="text-center" style="padding:12px 10px;"><span style="background:#f1f5f9; color:#1e293b; font-weight:700; padding:2px 8px; border-radius:12px; font-size:11.5px;">${orden.total_ajustes} art.</span></td>
        `;
        
        tr.addEventListener('click', () => {
            document.querySelectorAll('.kardex-row-clickable').forEach(el => el.style.background = 'none');
            tr.style.background = '#f0fdf4';
            verDesgloseLateralDeOrden(orden);
        });

        tbodyKardex.appendChild(tr);
    });
}

function verDesgloseLateralDeOrden(orden) {
    const emptyMsg = document.getElementById('kardex-preview-empty');
    const contentBox = document.getElementById('kardex-preview-content');
    
    if (!emptyMsg || !contentBox) return;
    
    emptyMsg.style.display = 'none';
    contentBox.style.display = 'block';

    let htmlDesglose = `
        <div style="font-family: sans-serif; color: #1e293b;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">
                <h4 style="margin:0; font-size:14px; font-weight:700; color:#0066ff;">Resumen: ${orden.id_orden}</h4>
                <span style="font-size:11px; color:#64748b; font-weight:500;">${new Date(orden.fecha).toLocaleTimeString()}</span>
            </div>
            <div style="font-size:12px; color:#475569; display:flex; flex-direction:column; gap:2px; margin-bottom:14px; background:#ffffff; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
                <div><strong>Operador:</strong> ${orden.usuario}</div>
                <div><strong>Estación:</strong> ${orden.estacion}</div>
            </div>
            <h5 style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.5px;">Artículos Modificados</h5>
            <div style="display:flex; flex-direction:column; gap:8px; max-height:350px; overflow-y:auto; padding-right:2px;">
    `;

    orden.detalles.forEach(it => {
        const esSobrante = it.variacion > 0;
        const colorBadge = esSobrante ? '#15803d' : '#b91c1c';
        const bgBadge = esSobrante ? '#dcfce7' : '#fee2e2';

        htmlDesglose += `
            <div style="background:#ffffff; padding:10px; border-radius:4px; border:1px solid #e2e8f0; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span style="font-weight:600; color:#0f172a; max-width:75%; line-height:1.2;">${it.producto}</span>
                    <span style="background:${bgBadge}; color:${colorBadge}; font-weight:700; padding:2px 6px; border-radius:4px; font-size:11px;">${esSobrante ? '+' : ''}${it.variacion}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-top:2px;">
                    <span>Ref: ${it.codigo}</span>
                    <span>Motivo: <strong style="color:#1e293b;">${it.motivo}</strong></span>
                </div>
                <div style="font-size:10.5px; color:#94a3b8; text-align:right; margin-top:1px;">
                    Antes: ${it.cantidad_anterior} ➔ Ahora: ${it.cantidad_nueva}
                </div>
            </div>
        `;
    });

    htmlDesglose += `
            </div>
            <div style="text-align:center; margin-top:15px; font-size:10px; font-weight:600; color:#cbd5e1; letter-spacing:0.5px; text-transform:uppercase; border-top:1px dashed #e2e8f0; padding-top:10px;">
                MeetFashion Auditoría
            </div>
        </div>
    `;

    contentBox.innerHTML = htmlDesglose;
}

// 👑 FUNCIÓN INTERACTIVA DEL PANEL DERECHO (ESTILO REPORTE DE CORTES)
function verDesgloseLateralDeOrden(orden) {
    const emptyMsg = document.getElementById('kardex-preview-empty');
    const contentBox = document.getElementById('kardex-preview-content');
    
    if (!emptyMsg || !contentBox) return;
    
    emptyMsg.style.display = 'none';
    contentBox.style.display = 'block';

    let htmlDesglose = `
        <div style="font-family: sans-serif; color: #1e293b;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">
                <h4 style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">Resumen: <span style="color:#0066ff;">${orden.id_orden}</span></h4>
                <span style="font-size:11px; color:#64748b; font-weight:500;">${new Date(orden.fecha).toLocaleTimeString()}</span>
            </div>
            <div style="font-size:12px; color:#475569; display:flex; flex-direction:column; gap:2px; margin-bottom:14px; background:#ffffff; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
                <div><strong>Operador:</strong> ${orden.usuario}</div>
                <div><strong>Estación:</strong> ${orden.estacion}</div>
            </div>
            <h5 style="margin:0 0- 8px 0; font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.5px;">Artículos Modificados</h5>
            <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto; padding-right:2px;">
    `;

    orden.detalles.forEach(it => {
        const esSobrante = it.variacion > 0;
        const colorBadge = esSobrante ? '#15803d' : '#b91c1c';
        const bgBadge = esSobrante ? '#dcfce7' : '#fee2e2';

        htmlDesglose += `
            <div style="background:#ffffff; padding:10px; border-radius:4px; border:1px solid #e2e8f0; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span style="font-weight:600; color:#0f172a; max-width:75%; line-height:1.2;">${it.producto}</span>
                    <span style="background:${bgBadge}; color:${colorBadge}; font-weight:700; padding:2px 6px; border-radius:4px; font-size:11px;">${esSobrante ? '+' : ''}${it.variacion}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-top:2px;">
                    <span>Ref: ${it.codigo}</span>
                    <span>Motivo: <strong style="color:#1e293b;">${it.motivo}</strong></span>
                </div>
                <div style="font-size:10.5px; color:#94a3b8; text-align:right; margin-top:1px;">
                    Antes: ${it.cantidad_anterior} ➔ Ahora: ${it.cantidad_nueva}
                </div>
            </div>
        `;
    });

    htmlDesglose += `
            </div>
            <div style="margin-top:14px; text-align:center; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; border-top:1px dashed #e2e8f0; padding-top:10px;">
                MeetFashion Auditoría
            </div>
        </div>
    `;

    contentBox.innerHTML = htmlDesglose;
}

// ====================================================================
// 🔒 BLINDAJE DE INVENTARIOS Y CONTROL REACTIVO DEL BOTÓN DEL HEADER
// ====================================================================
function aplicarFiltroPermisosInventario() {
    const sesionActiva = JSON.parse(sessionStorage.getItem('pos_user'));
    if (!sesionActiva) { window.location.replace('ventas.html'); return; }

    const rolMinusculas = String(sesionActiva.role || sesionActiva.rol || 'vendedor').toLowerCase();
    const esMaster = rolMinusculas === 'master';

    if (!esMaster) {
        const accesoSeccion = sesionActiva.permisos?.inventarios?.ver === true;
        if (!accesoSeccion) {
            alert("❌ ACCESO RESTRINGIDO:\nTu usuario no tiene autorización para ingresar al módulo de Inventarios.");
            window.location.replace('ventas.html');
            return;
        }

        // 🔥 CONTROL REACTIVO DEL BOTÓN: Oculta o bloquea el botón si el permiso está apagado
        const puedeIniciarConteo = sesionActiva.permisos?.inventarios?.conteo === true;
        const btnIniciarConteo = document.getElementById('btn-generate-template');
        
        if (!puedeIniciarConteo && btnIniciarConteo) {
            btnIniciarConteo.disabled = true;
            btnIniciarConteo.style.backgroundColor = '#cbd5e1';
            btnIniciarConteo.style.color = '#94a3b8';
            btnIniciarConteo.style.cursor = 'not-allowed';
            btnIniciarConteo.title = 'No tienes autorización para iniciar órdenes de conteo';
        }
    }
}

// Ejecutamos la validación perimetral de inmediato al cargar la pantalla
aplicarFiltroPermisosInventario();


// Inicialización de la bitácora al entrar a la pantalla
cargarBitacoraKardex();


// ====================================================================
// ⏳ VERIFICADOR DE TRÁNSITO ACTIVO AL CARGAR EL DOCUMENTO
// ====================================================================
function verificarInventarioEnProgresoAlCargar() {
    const enProgreso = localStorage.getItem('inventario_en_progreso');
    
    // Si el disco duro dice que había un inventario abierto antes del F5, lo reconstruimos
    if (enProgreso === 'true') {
        iniciarOrdenConteoMasivo();
    } else {
        // Si no había nada, cargamos la bitácora Kardex normal y limpia de tu diseño
        if (typeof cargarBitacoraKardex === 'function') cargarBitacoraKardex();
    }
}

// ====================================================================
// 📊 EXPORTADOR CSV MAESTRO DEL HISTORIAL DE AUDITORÍAS (KARDEX)
// ====================================================================
document.getElementById('btn-exportar-kardex')?.addEventListener('click', () => {
    const historialLotes = JSON.parse(localStorage.getItem('kardex_lotes_inventario')) || [];

    if (historialLotes.length === 0) {
        alert("No se registran órdenes de auditoría en el historial para exportar.");
        return;
    }

    // Estructuramos el archivo CSV con codificación UTF-8 para reconocer acentos
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Folio Orden,Fecha,Estacion,Usuario,Total Ajustes,Producto,Codigo Ref,Cant Anterior,Cant Nueva,Variacion,Motivo\n";

    // Recorremos los lotes comprimidos en cascada deshaciendo el array interno
    historialLotes.forEach(orden => {
        const fechaFormateada = new Date(orden.fecha).toLocaleString();
        
        orden.detalles.forEach(item => {
            csvContent += `"${orden.id_orden}","${fechaFormateada}","${orden.estacion}","${orden.usuario}",${orden.total_ajustes},"${item.producto}","${item.codigo}",${item.cantidad_anterior},${item.cantidad_nueva},${item.variacion},"${item.motivo}"\n`;
        });
    });

    // Disparamos la descarga automática en el navegador
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `kardex_auditorias_meetfashion.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Ejecutamos la validación en cuanto el archivo js se monta en la pantalla
verificarInventarioEnProgresoAlCargar();

