// db.js - capa simple para localStorage
const DB = {
  key_articles: 'pos_articulos_v1',
  key_sales: 'pos_ventas_v1',
  key_users: 'pos_users_v1',
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  load(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch(e) { return fallback; }
  },

  // Artículos
  getArticles() {
    return DB.load(DB.key_articles, []);
  },
  saveArticles(list) {
    DB.save(DB.key_articles, list);
  },
  // Ventas
  getSales() {
    return DB.load(DB.key_sales, []);
  },
  saveSales(list) {
    DB.save(DB.key_sales, list);
  },

  // Usuarios (login simple)
  getUsers() {
    return DB.load(DB.key_users, []);
  },
  saveUsers(list) {
    DB.save(DB.key_users, list);
  },

  // Inicializar con algunos artículos si está vacío
  ensureSeed() {
    if (DB.getArticles().length === 0) {
      const seed = [
        { id: 1, codigo: 'P001', nombre: 'Labial Mate', precio: 150.00, stock: 25 },
        { id: 2, codigo: 'P002', nombre: 'Rímel Volumen', precio: 180.00, stock: 30 },
        { id: 3, codigo: 'P003', nombre: 'Base Líquida', precio: 320.00, stock: 15 },
        { id: 4, codigo: 'P004', nombre: 'Polvo Compacto', precio: 210.00, stock: 20 },
        { id: 5, codigo: 'P005', nombre: 'Delineador', precio: 90.00, stock: 40 },
        { id: 6, codigo: 'P006', nombre: 'Sombras 12c', precio: 420.00, stock: 10 }
      ];
      DB.saveArticles(seed);
    }
    // seed users
    if (DB.getUsers().length === 0) {
      const users = [
        { user: 'admin', pass: 'admin', role: 'admin', station: 'Principal' }
      ];
      DB.saveUsers(users);
    }
  }
};

// ========================================
// FILTRAR VENTAS POR FECHA
// ========================================
DB.getSalesByDate = function (desde, hasta) {
    const ventas = DB.getSales(); // usa la función existente
    if (!ventas.length) return [];

    // Normalizamos fechas
    const fDesde = new Date(desde + "T00:00:00");
    const fHasta = new Date(hasta + "T23:59:59");

    return ventas.filter(v => {
        const f = new Date(v.fecha);
        return f >= fDesde && f <= fHasta;
    });
};

// Compatibilidad para el catálogo (Bloque 2)

// get sale by ticket number
DB.getSaleByTicket = function(ticketNumber) {
  const ventas = DB.getSales();
  return ventas.find(v => Number(v.ticket) === Number(ticketNumber)) || null;
};

// Obtener todos los artículos
DB.getArticulos = function () {
  return DB.getArticles();
};

// Obtener un artículo específico
DB.getArticulo = function (id) {
  return DB.getArticles().find(a => a.id == id);
};

// Alias requerido para el POS moderno
DB.getArticleById = function(id) {
  return DB.getArticulo(id);
};

// Guardar o actualizar artículo
DB.saveArticulo = function (art) {
  const lista = DB.getArticles();
  const idx = lista.findIndex(a => a.id == art.id);

  if (idx >= 0) {
    lista[idx] = art; // actualizar
  } else {
    lista.push(art); // agregar nuevo
  }

  DB.saveArticles(lista);
};

// Eliminar artículo
DB.deleteArticulo = function (id) {
  const lista = DB.getArticles().filter(a => a.id != id);
  DB.saveArticles(lista);
};

// ============================
// MÓDULO DE CORTES DE CAJA
// ============================

DB.saveCut = function (cut) {
    const cuts = JSON.parse(localStorage.getItem("cuts") || "[]");
    cuts.push(cut);
    localStorage.setItem("cuts", JSON.stringify(cuts));
};

DB.getCuts = function () {
    return JSON.parse(localStorage.getItem("cuts") || "[]");
};

DB.ensureSeed();

// --- USERS (simple localStorage)
DB.key_users = 'pos_users_v1';
DB.getUsers = function(){ return DB.load(DB.key_users, [{ user:'admin', pass:'admin', name:'Administrador', role:'admin', shift:'matutino' }]); };
DB.saveUsers = function(list){ DB.save(DB.key_users, list); };
DB.saveUser  =  function(u){
   const  list  =  DB.getUsers();
   const  idx  =  list.findIndex(x  => x.user  ===  u.user);
    u.modified =  new  Date().toISOString();  //  ←  nueva propiedad
    if(idx  >=  0) list[idx]  =  u;
    else list.push(u);
    DB.saveUsers(list);
};

DB.deleteUser = function(user){
  const list = DB.getUsers().filter(x=>x.user!==user);
  DB.saveUsers(list);
};

DB.getSaleByTicket = function(ticket){
  const ventas = DB.getSales();
  return ventas.find(v => Number(v.ticket) === Number(ticket));
};


