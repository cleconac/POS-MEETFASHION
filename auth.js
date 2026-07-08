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
});

// FUNCIÓN DE VALIDACIÓN PERIMETRAL BASADA EN ROLES
function verificarAccesoPantalla() {
    const usuarioSesionActiva = JSON.parse(sessionStorage.getItem('pos_user'));
    const paginaActual = window.location.pathname.split('/').pop() || 'ventas.html';

    if (paginaActual === 'ventas.html' || paginaActual === '') return;

    if (!usuarioSesionActiva) {
        window.location.href = 'ventas.html'; 
        return;
    }

    const rolActual = (usuarioSesionActiva.role || usuarioSesionActiva.rol || '').toLowerCase();

    // 👑 EL ROL MANDA: Solo se permite la administración si el rol es 'admin' o 'master'
    const esAutorizado = rolActual === 'admin' || rolActual === 'master';

    if (!esAutorizado) {
        alert("Acceso denegado.");
        window.location.href = 'ventas.html';
        return;
    }

    // Validación granular para administradores seccionales limitados
    if (rolActual === 'admin') {
        const p = usuarioSesionActiva.permisos || { catalogo: {}, reportes: {}, usuarios: {}, estaciones: {} };
        if (paginaActual.includes('catalog.html') && !p.catalogo?.ver) { alert("Acceso denegado."); window.location.href = 'ventas.html'; }
        if (paginaActual.includes('users.html') && !p.usuarios?.ver) { alert("Acceso denegado."); window.location.href = 'ventas.html'; }
        if (paginaActual.includes('estaciones.html') && !p.estaciones?.ver) { alert("Acceso denegado."); window.location.href = 'ventas.html'; }
    }
}

 function  applyPermissions(user){
    if(!user)  return;
    const  isAdmin  = user.role  ===  'admin';
    document.querySelectorAll('.admin-only').forEach(n  =>  {
       n.style.display  =  isAdmin  ? ''  :  'none';
    });
 }


// LOGOUT function
function  logout()  {
   //  Limpia  datos  en  memoria
   currentUser  =  null;

    //  Limpia sessionStorage
    sessionStorage.removeItem('pos_user');
   sessionStorage.removeItem('pos_cashier');
    sessionStorage.removeItem('estacion-activa');
   sessionStorage.removeItem('lastCutISO');

   //  Limpia  campos  del login
    document.getElementById('login-user').value  = "";
    document.getElementById('login-pass').value  = "";
    document.getElementById('login-station').value  = "Principal";
    if  (document.getElementById('login-turno')) {
       document.getElementById('login-turno').selectedIndex  =  0;
   }

    // Opcional:  limpia  spans  del  header
   if  (el.cashierSpan)  el.cashierSpan.textContent =  "Usuario:  —";
   if  (el.stationSpan)  el.stationSpan.textContent  =  "Estación: —";
    if  (el.turnoSpan) el.turnoSpan.textContent  =  "Turno:  —";
   if  (el.ticketNum)  el.ticketNum.textContent  = "Ticket:  #000000";

   //  Redirige  al  login
   showLoginScreen();
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
