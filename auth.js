// ========================================================
// SISTERMA CENTRALIZADO DE AUTENTICACIÓN Y SEGURIDAD (auth.js)
// ========================================================

// 1. ESCUCHADOR CENTRAL DE LOGIN (Migrado desde main.js)
// Asegúrate de que el botón de tu pantalla de inicio invoque a este listener
// ========================================================
// ESCUCHADOR DE LOGIN BASADO ESTRICTAMENTE EN ROLES (auth.js)
// ========================================================
document.getElementById('login-ok')?.addEventListener('click', () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    
    let stationSeleccionada = document.getElementById('login-station').value || '';
    if (stationSeleccionada.trim() === "" || stationSeleccionada.toLowerCase().includes("selecciona")) {
        stationSeleccionada = "";
    }
    
    if (!u || !p) {
        return alert('Por favor, introduce tu usuario y contraseña.');
    }

    const users = DB.getUsers ? DB.getUsers() : [];
    const usuarioEncontrado = users.find(x => x.user === u || x.usuario === u);
    
    if (!usuarioEncontrado) {
        return alert('El usuario introducido no existe o no está registrado.');
    }

    if (usuarioEncontrado.pass !== p) {
        return alert('La contraseña introducida es incorrecta. Inténtalo de nuevo.');
    }

    // 👑 CANDADO ESTRUCTURAL POR ROL: La máxima autoridad se define por su rol, no por su alias
    const rolUserMinusculas = (usuarioEncontrado.role || usuarioEncontrado.rol || 'vendedor').toLowerCase();
    const esUsuarioMaster = rolUserMinusculas === 'master';

    let estacionFinalParaSesion = usuarioEncontrado.estacion || usuarioEncontrado.station || 'Principal';

    // Si NO es el rol jerárquico supremo MASTER, se aplican tus restricciones de sucursal
    if (!esUsuarioMaster) {
        if (!stationSeleccionada || estacionFinalParaSesion.trim().toLowerCase() !== stationSeleccionada.trim().toLowerCase()) {
            return alert(`⚠️ ACCESO DENEGADO:\nEl usuario "${u}" está asignado exclusivamente a la estación "${estacionFinalParaSesion}".\nNo tienes autorización para operar en la estación "${stationSeleccionada}".`);
        }
    } else {
        // 🌐 Si ES rol MASTER, se le libera de la atadura de cajas
        if (stationSeleccionada !== "") {
            estacionFinalParaSesion = stationSeleccionada;
        } else {
            estacionFinalParaSesion = "Principal"; 
        }
        
        // El rol MASTER hereda por arquitectura el árbol completo en true por defecto
        usuarioEncontrado.permisos = {
            catalogo: { ver: true, editar: true, eliminar: true, stock: true, historial: true, nuevo: true, importar: true, exportar_cat: true, exportar_stock: true },
            reportes: { ver: true, ventas: true, cortes: true, exportar: true },
            usuarios: { ver: true, crear: true, editar: true, eliminar: true, ver_mapa: true },
            estaciones: { ver: true, crear: true, editar: true, eliminar: true }
        };
    }

    usuarioEncontrado.station = estacionFinalParaSesion;
    usuarioEncontrado.estacion = estacionFinalParaSesion; 
    usuarioEncontrado.turno = usuarioEncontrado.shift || usuarioEncontrado.turno || '—';
    
    sessionStorage.setItem('estacion-activa', estacionFinalParaSesion);
    sessionStorage.setItem('pos_user', JSON.stringify(usuarioEncontrado)); 
    
    if (typeof setUserContext === "function") setUserContext(usuarioEncontrado);
    if (typeof applyPermissions === "function") applyPermissions(usuarioEncontrado);
    if (typeof hideLoginScreen === "function") hideLoginScreen();

    window.location.reload();
});

// ====================================================================
// 🔒 FUNCIÓN DE VALIDACIÓN PERIMETRAL CENTRALIZADA Y SEGURA (AUTH.JS)
// ====================================================================
function verificarAccesoPantalla() {
    const cashierId = sessionStorage.getItem('pos_cashier');
    const usuarioSesionActiva = JSON.parse(sessionStorage.getItem('pos_user'));
    
    // Obtenemos el nombre del archivo actual limpio (ej: "catalog.html")
    const paginaActual = window.location.pathname.split('/').pop() || 'ventas.html';

    // Si está en el POS principal de cobro, el acceso siempre es libre
    if (paginaActual === 'ventas.html' || paginaActual === '') return;

    // Si intentan entrar por URL sin haber iniciado sesión, expulsión inmediata
    if (!cashierId || !usuarioSesionActiva) {
        window.location.href = 'ventas.html'; 
        return;
    }

    // 🎯 EL CONTROL DE LA VERDAD: Consultamos el disco duro en tiempo real para evitar caché vieja
    const listaUsuariosDB = DB.getUsers ? DB.getUsers() : (JSON.parse(localStorage.getItem('usuarios')) || []);
    const usuarioVigente = listaUsuariosDB.find(x => (x.user || x.usuario) === cashierId);

    // Si el usuario fue eliminado de la base de datos mientras operaba, lo echamos
    if (!usuarioVigente) {
        sessionStorage.clear();
        window.location.href = 'ventas.html';
        return;
    }

    const rolActual = String(usuarioVigente.role || usuarioVigente.rol || '').toLowerCase();
    const aliasLogueado = String(cashierId).toLowerCase();

    // 👑 INMUNIDAD MASTER GENERAL: El dueño (master, sup, admin) tiene pase libre a todo por diseño
    const esMaestro = rolActual === 'master' || aliasLogueado === 'sup' || aliasLogueado === 'admin';
    if (esMaestro) return; 

    // ====================================================================
    // 🔒 EVALUACIÓN DE PRIVILEGIOS GRANULARES PARA ADMINISTRADORES / CAJEROS
    // ====================================================================
    const p = usuarioVigente.permisos || { catalogo: {}, reportes: {}, usuarios: {}, estaciones: {}, inventarios: {} };
    let tieneAcceso = true;
    let nombreSeccionEstetica = "";

    // Candado A: Catálogo
    if (paginaActual.includes('catalog.html')) {
        tieneAcceso = p.catalogo?.ver === true;
        nombreSeccionEstetica = "Catálogo";
    }
    // Candado B: Usuarios / Personal
    else if (paginaActual.includes('users.html')) {
        tieneAcceso = p.usuarios?.ver === true;
        nombreSeccionEstetica = "Personal / Usuarios";
    }
    // Candado C: Estaciones de Trabajo
    else if (paginaActual.includes('estaciones.html')) {
        tieneAcceso = p.estaciones?.ver === true;
        nombreSeccionEstetica = "Estaciones";
    }
    // Candado D: 🔥 NUEVO BLINDAJE PARA EL PANEL DE REPORTES
    else if (paginaActual.includes('reportes.html')) {
        tieneAcceso = p.reportes?.ver === true;
        nombreSeccionEstetica = "Reportes";
    }
    // Candado E: 🔥 NUEVO BLINDAJE PARA EL PANEL DE INVENTARIOS MASIVOS
    else if (paginaActual.includes('inventarios.html')) {
        tieneAcceso = p.inventarios?.ver === true;
        nombreSeccionEstetica = "Inventarios";
    }

    // ❌ INTERCEPCIÓN OPERATIVA RIGUROSA
    if (!tieneAcceso) {
        alert(`❌ ACCESO RESTRINGIDO:\nEl usuario "${usuarioVigente.user}" no cuenta con los permisos requeridos para visualizar la sección de ${nombreSeccionEstetica}.`);
        window.location.href = 'ventas.html'; // Lo expulsa de inmediato al POS de forma limpia
    }
}

// Aseguramos el arranque automático en el ciclo de carga de auth.js
if (typeof window !== 'undefined') {
    verificarAccesoPantalla();
}


 function  applyPermissions(user){
    if(!user)  return;
    const  isAdmin  = user.role  ===  'admin';
    document.querySelectorAll('.admin-only').forEach(n  =>  {
       n.style.display  =  isAdmin  ? ''  :  'none';
    });
 }

// ========================================================
// LOGOUT
// ========================================================
function logout() {
   // 1. Limpia datos en memoria
   currentUser = null;

   // 2. Limpia sessionStorage de forma masiva para evitar fugas de datos
   sessionStorage.removeItem('pos_user');
   sessionStorage.removeItem('pos_cashier');
   sessionStorage.removeItem('estacion-activa');
   sessionStorage.removeItem('lastCutISO');
   sessionStorage.removeItem('pos_ticket_seq'); // Limpieza de folios
   sessionStorage.clear(); // Garantiza la purga absoluta

   // 3. Limpia campos del login
   if (document.getElementById('login-user')) document.getElementById('login-user').value = "";
   if (document.getElementById('login-pass')) document.getElementById('login-pass').value = "";
   
   // 🔥 CORRECCIÓN DE LA SUCURSAL POR DEFAULT:
   // Al salir, forzamos que el selector apunte de forma automatizada a "Salto del Agua"
   const selectEstacion = document.getElementById('login-station');
   if (selectEstacion) {
       selectEstacion.value = "Salto del Agua";
   }
   
   if (document.getElementById('login-turno')) {
       document.getElementById('login-turno').selectedIndex = 0;
   }

   // 4. Limpia spans del header
   if (el.cashierSpan) el.cashierSpan.textContent = "Usuario: —";
   if (el.stationSpan) el.stationSpan.textContent = "Estación: —";
   if (el.turnoSpan) el.turnoSpan.textContent  = "Turno:  —";
   if (el.ticketNum) el.ticketNum.textContent  = "Ticket:  #000000";

   // 5. Redirige visualmente a la pantalla de acceso
   if (typeof showLoginScreen === "function") showLoginScreen();

   window.location.reload();
}

document.getElementById('btn-logout')?.addEventListener('click', ()=> {
  document.getElementById('modal-logout').classList.remove('hidden')
            const onYes = () => {
		document.getElementById('modal-logout').classList.add('hidden')
		logout();
            };

            const onNo = () => { 
		document.getElementById('modal-logout').classList.add('hidden')
	    };

            document.getElementById('logout-yes').onclick = onYes;
            document.getElementById('logout-no').onclick = onNo;

            // allow keyboard
            function onKey(e){
                if(e.key === 'Enter') onYes();
                if(e.key === 'Escape') onNo();
            }

//  if(!confirm('Cerrar sesión?')) return;
});


function applyPermissions(user) {
    if (!user) return;

    const rolUser = (user.role || user.rol || 'vendedor').toLowerCase();

    const btnCatalog    = document.getElementById('btn-open-catalog');
    const btnReports    = document.getElementById('btn-open-reports');
    const btnUsers      = document.getElementById('btn-users');
    const btnStations   = document.getElementById('btn-stations');
    const btnAdminMenu  = document.querySelector('.dropdown .admin-only') || document.querySelector('.dropdown');

    // 👑 INMUNIDAD POR ROL MASTER
    if (rolUser === 'master') {
        if (btnCatalog)   btnCatalog.style.display = '';
        if (btnReports)   btnReports.style.display = '';
        if (btnUsers)     btnUsers.style.display = '';
        if (btnStations)  btnStations.style.display = '';
        if (btnAdminMenu) btnAdminMenu.style.display = '';
        document.querySelectorAll('.admin-only').forEach(n => n.style.display = '');
        return;
    }

    // CASO VENDEDOR
    if (rolUser === 'vendedor') {
        if (btnAdminMenu) btnAdminMenu.style.display = 'none';
        document.querySelectorAll('.admin-only').forEach(n => n.style.display = 'none');
        return;
    }

    // CASO ADMINISTRADORES LIMITADOS (admin)
    const p = user.permisos || { catalogo: {}, reportes: {}, usuarios: {}, estaciones: {} };
    if (btnCatalog)   btnCatalog.style.display = p.catalogo?.ver ? '' : 'none';
    if (btnReports)   btnReports.style.display = p.reportes?.ver ? '' : 'none';
    if (btnUsers)     btnUsers.style.display = p.usuarios?.ver ? '' : 'none';
    if (btnStations)  btnStations.style.display = p.estaciones?.ver ? '' : 'none';
}



// 3. DISPARADOR AUTOMÁTICO AL CARGAR LA PÁGINA
// Envolvemos la verificación para que espere a que db.js inicialice por completo el objeto DB
document.addEventListener("DOMContentLoaded", () => {
    // Ejecuta la validación perimetral de forma totalmente segura
    if (typeof verificarAccesoPantalla === "function") {
        verificarAccesoPantalla();
    }
});
