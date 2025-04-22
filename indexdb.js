// indexeddb.js (componente completo modularizado de IndexedDB)
const DB_NAME = 'FerxxoSchoolDB';
const DB_VERSION = 1;
let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('No se pudo abrir la base de datos');

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (e) => {
      db = e.target.result;

      if (!db.objectStoreNames.contains('usuarios')) {
        const userStore = db.createObjectStore('usuarios', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
      }

      if (!db.objectStoreNames.contains('estudiantes')) {
        db.createObjectStore('estudiantes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('cursos')) {
        db.createObjectStore('cursos', { keyPath: 'id' });
      }
    };
  });
}

export function agregarObjeto(storeName, objeto) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.add(objeto);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function obtenerTodos(storeName) {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

export function buscarPorClave(storeName, clave) {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(clave);
    req.onsuccess = () => resolve(req.result);
  });
}

export function actualizarObjeto(storeName, objeto) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(objeto);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function crearAdminPorDefecto() {
  const usuarios = await obtenerTodos('usuarios');
  const existeAdmin = usuarios.some(u => u.cargo === 'Administrador');

  if (!existeAdmin) {
    await agregarObjeto('usuarios', {
      id: 'admin001',
      nombre: 'Admin Principal',
      cargo: 'Administrador',
      email: 'admin@ferxxo.edu',
      password: 'admin123'
    });
    console.log('✅ Admin predeterminado creado');
  }
}

export async function login(email, password) {
  const usuarios = await obtenerTodos('usuarios');
  return usuarios.find(u => u.email === email && u.password === password);
}
