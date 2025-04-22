// index.js actualizado para usar IndexedDB en lugar de localStorage
import { initDB, crearAdminPorDefecto, login, agregarObjeto, obtenerTodos } from './indexdb.js';


// Inicialización de la aplicación cuando el DOM está completamente cargado
document.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  await crearAdminPorDefecto();

  const user = sessionStorage.getItem("loggedUser");
  if (user) {
    ocultarBarraDeNavegacion();
    navigateTo("dashboard");
  } else {
    mostrarBarraDeNavegacion();
    navigateTo("login");
  }
});
function validarImagen(file) {
  if (!file) return { valido: false, mensaje: 'Debes seleccionar una imagen' };
  if (!file.type.startsWith('image/')) return { valido: false, mensaje: 'El archivo debe ser una imagen' };
  if (file.size > 2 * 1024 * 1024) return { valido: false, mensaje: 'La imagen no debe superar 2MB' };
  return { valido: true };
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function mostrarMensaje(tipo, texto, duracion = 3000) {
  const mensajesAnteriores = document.querySelectorAll('.mensaje');
  mensajesAnteriores.forEach(msg => msg.remove());

  const mensaje = document.createElement('div');
  mensaje.className = `mensaje mensaje-${tipo}`;
  let icono = '';
  switch (tipo) {
    case 'exito': icono = '✅'; break;
    case 'error': icono = '❌'; break;
    case 'info': icono = 'ℹ️'; break;
    case 'advertencia': icono = '⚠️'; break;
  }
  mensaje.innerHTML = `
    <div class="mensaje-icono">${icono}</div>
    <div class="mensaje-contenido">${texto}</div>
    <button class="mensaje-cerrar">×</button>
  `;
  document.body.appendChild(mensaje);
  mensaje.querySelector('.mensaje-cerrar').addEventListener('click', () => {
    mensaje.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => mensaje.remove(), 300);
  });
  if (duracion > 0) {
    setTimeout(() => {
      if (mensaje.parentNode) {
        mensaje.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => mensaje.remove(), 300);
      }
    }, duracion);
  }
  return mensaje;
}

function ocultarBarraDeNavegacion() {
  const barra = document.getElementById("barra-navegacion");
  if (barra) barra.style.display = "none";
}

function mostrarBarraDeNavegacion() {
  const barra = document.getElementById("barra-navegacion");
  if (barra) barra.style.display = "flex";
}

function navigateTo(view) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  switch (view) {
    case "login": app.appendChild(document.createElement("login-form")); break;
    case "registerUser": app.appendChild(document.createElement("user-register")); break;
    case "dashboard":
      const user = JSON.parse(sessionStorage.getItem("loggedUser"));
      if (user.cargo === "Administrador") {
        app.appendChild(document.createElement("dashboard-view"));
      } else if (user.cargo === "Profesor") {
        app.appendChild(document.createElement("dashboard-profesor"));
      } else {
        app.appendChild(document.createElement("dashboard-estudiante"));
      }
      break;
  }
}

// Login actualizado para usar IndexedDB
class LoginForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <form id="loginForm">
        <h2>Login</h2>
        <input type="email" id="email" placeholder="Email" required />
        <input type="password" id="password" placeholder="Contraseña" required />
        <button type="submit">Ingresar</button>
        <div id="loginError" style="color: red;"></div>
      </form>
    `;
    this.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = this.querySelector("#email").value;
      const password = this.querySelector("#password").value;

      const user = await login(email, password);
      if (user) {
        sessionStorage.setItem("loggedUser", JSON.stringify(user));
        ocultarBarraDeNavegacion();
        navigateTo("dashboard");
        mostrarMensaje('exito', `Bienvenido, ${user.nombre}`);
      } else {
        this.querySelector("#loginError").textContent = "Credenciales incorrectas";
        mostrarMensaje('error', 'Credenciales incorrectas. Intenta nuevamente.');
      }
    });
  }
}
customElements.define("login-form", LoginForm);

// Panel de administrador (DashboardView)
class DashboardView extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-menu">
            <button id="createCourseBtn">📚 Crear Curso</button>
            <button id="evaluateBtn">📝 Evaluar Curso</button>
            <button id="addStudentBtn">👨‍🎓 Registrar Estudiante</button>
            <button id="registerUserBtn">➕ Registrar Usuario</button>
            <button id="logoutBtn">🚪 Cerrar sesión</button>
          </div>
        </div>
        <div id="dashboardContent"></div>
      </div>
    `;

    const content = this.querySelector("#dashboardContent");

    this.querySelector("#createCourseBtn").addEventListener("click", () => {
      content.innerHTML = "";
      content.appendChild(document.createElement("course-create"));
    });

    this.querySelector("#evaluateBtn").addEventListener("click", () => {
      content.innerHTML = "";
      content.appendChild(document.createElement("course-grades"));
    });

    this.querySelector("#addStudentBtn").addEventListener("click", () => {
      content.innerHTML = "";
      content.appendChild(document.createElement("student-register"));
    });

    this.querySelector("#registerUserBtn").addEventListener("click", () => {
      content.innerHTML = "";
      content.appendChild(document.createElement("user-register"));
    });

    this.querySelector("#logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem("loggedUser");
      mostrarBarraDeNavegacion();
      navigateTo("login");
      mostrarMensaje('info', 'Has cerrado sesión correctamente');
    });

    content.appendChild(document.createElement("course-create"));
  }
}
customElements.define("dashboard-view", DashboardView);
class DashboardProfesor extends HTMLElement {
  async connectedCallback() {
    const user = JSON.parse(sessionStorage.getItem("loggedUser"));
    const cursos = await obtenerTodos("cursos");

    const cursosAsignados = cursos.filter(curso => curso.profesorId === user.id);

    this.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-menu">
            <button id="logoutBtn">🚪 Cerrar sesión</button>
          </div>
        </div>
        <div id="profesorCursos">
          <h2>Cursos Asignados</h2>
          ${cursosAsignados.length === 0 ? '<p>No tienes cursos asignados aún.</p>' : ''}
          ${cursosAsignados.map(curso => `
            <div class="card-curso">
              <h3>${curso.nombre}</h3>
              <p>${curso.descripcion}</p>
              <button onclick='verNotas("${curso.id}")'>Calificar</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.querySelector("#logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem("loggedUser");
      mostrarBarraDeNavegacion();
      navigateTo("login");
      mostrarMensaje('info', 'Has cerrado sesión correctamente');
    });
  }
}
customElements.define("dashboard-profesor", DashboardProfesor);

// Panel de estudiante
class DashboardEstudiante extends HTMLElement {
  async connectedCallback() {
    const user = JSON.parse(sessionStorage.getItem("loggedUser"));
    const cursos = await obtenerTodos("cursos");

    const inscritos = cursos.filter(curso => curso.estudiantes.includes(user.id));

    this.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-menu">
            <button id="logoutBtn">🚪 Cerrar sesión</button>
          </div>
        </div>
        <div id="estudianteCursos">
          <h2>Mis Cursos</h2>
          ${inscritos.length === 0 ? '<p>No estás inscrito en ningún curso.</p>' : ''}
          ${inscritos.map(curso => {
            const nota = curso.notas?.[user.id] || { parcial1: 0, parcial2: 0, parcial3: 0 };
            const final = (nota.parcial1 * 0.3 + nota.parcial2 * 0.3 + nota.parcial3 * 0.4).toFixed(2);
            return `
              <div class="card-curso">
                <h3>${curso.nombre}</h3>
                <p>${curso.descripcion}</p>
                <p>Nota Final: <strong>${final}</strong></p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.querySelector("#logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem("loggedUser");
      mostrarBarraDeNavegacion();
      navigateTo("login");
      mostrarMensaje('info', 'Has cerrado sesión correctamente');
    });
  }
}
customElements.define("dashboard-estudiante", DashboardEstudiante);
  
 // Componente: Registro de Usuario
class UserRegister extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `
      <form id="registerUserForm">
        <h2>Registro de Usuario</h2>
        <input type="text" placeholder="Identificación" id="id" required />
        <input type="text" placeholder="Nombre" id="nombre" required />
        <select id="cargo">
          <option value="Profesor">Profesor</option>
          <option value="Administrativo">Administrativo</option>
        </select>
        <input type="email" placeholder="Email corporativo" id="email" required />
        <input type="password" placeholder="Contraseña" id="password" required />
        <button type="submit">Registrar</button>
      </form>
    `;

    this.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      
      try {
        const id = this.querySelector("#id").value;
        const nombre = this.querySelector("#nombre").value;
        const cargo = this.querySelector("#cargo").value;
        const email = this.querySelector("#email").value;
        const password = this.querySelector("#password").value;

        // Validaciones básicas
        if (!id || !nombre || !email || !password) {
          mostrarMensaje('error', 'Todos los campos son obligatorios.');
          return;
        }

        // Validar formato de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          mostrarMensaje('error', 'El formato del email no es válido.');
          return;
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
          mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres.');
          return;
        }

        // Verificar duplicados usando IndexedDB
        const usuarios = await obtenerTodos('usuarios');
        
        if (usuarios.some(u => u.id === id)) {
          mostrarMensaje('error', 'Ya existe un usuario con esta identificación.');
          return;
        }

        if (usuarios.some(u => u.email === email)) {
          mostrarMensaje('error', 'Ya existe un usuario con este email.');
          return;
        }

        // Crear nuevo usuario
        const nuevoUsuario = {
          id,
          nombre,
          cargo,
          email,
          password
        };

        // Guardar en IndexedDB
        await agregarObjeto('usuarios', nuevoUsuario);
        
        mostrarMensaje('exito', 'Usuario registrado correctamente');
        this.querySelector("form").reset();

      } catch (error) {
        console.error('Error al registrar usuario:', error);
        mostrarMensaje('error', 'Ocurrió un error al registrar el usuario. Intente nuevamente.');
      }
    });
  }
}

customElements.define("user-register", UserRegister);
  
  // Componente: Registro de Estudiante
  class StudentRegister extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <form id="registerStudentForm">
          <h2>Registro de Estudiante</h2>
          <input type="text" placeholder="Identificación" id="id" required />
          <input type="text" placeholder="Nombres" id="nombres" required />
          <input type="text" placeholder="Apellidos" id="apellidos" required />
          <input type="email" placeholder="Email" id="email" required />
          <input type="password" placeholder="Contraseña" id="password" required />
          <input type="date" id="fecha" required />
          <input type="file" id="foto" accept="image/*" required />
          <button type="submit">Registrar Estudiante</button>
        </form>
      `;
  
      this.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const fileInput = this.querySelector("#foto");
        const file = fileInput.files[0];
        const id = this.querySelector("#id").value;
        const nombres = this.querySelector("#nombres").value;
        const apellidos = this.querySelector("#apellidos").value;
        const email = this.querySelector("#email").value;
        const password = this.querySelector("#password").value;
        const fecha = this.querySelector("#fecha").value;
  
        // Validaciones básicas
        if (!id || !nombres || !apellidos || !email || !fecha || !password) {
          mostrarMensaje('error', 'Todos los campos son obligatorios.');
          return;
        }
  
        if (!email.includes('@') || !email.includes('.')) {
          mostrarMensaje('error', 'El formato del email no es válido.');
          return;
        }
  
        if (password.length < 6) {
          mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres.');
          return;
        }
  
        const validacionImagen = validarImagen(file);
        if (!validacionImagen.valido) {
          mostrarMensaje('error', validacionImagen.mensaje);
          return;
        }
  
        const estudiantes = await obtenerTodos('estudiantes');
if (estudiantes.some(est => est.id === id)) {
  mostrarMensaje('error', 'Ya existe un estudiante con esta identificación.');
  return;
}

if (estudiantes.some(est => est.email === email)) {
  mostrarMensaje('error', 'Ya existe un estudiante con este email.');
  return;
}

  
        try {
          const base64Image = await convertToBase64(file);
  
          const estudiante = {
            id,
            nombres,
            apellidos,
            email,
            password, // ✅ Guardamos la contraseña
            fecha,
            foto: base64Image,
          };
  
          await agregarObjeto('estudiantes', estudiante);

  
          mostrarMensaje('exito', 'Estudiante registrado correctamente');
          this.querySelector("form").reset();
        } catch (error) {
          console.error('Error al procesar la imagen:', error);
          mostrarMensaje('error', 'Error al procesar la imagen. Intenta con otra imagen.');
        }
      });
    }
  }
  
  customElements.define("student-register", StudentRegister);
  
  
  // Componente: Creación de Curso
  class CourseCreate extends HTMLElement {
    async connectedCallback() {
      this.innerHTML = `
        <form id="createCourseForm">
          <h2>Crear Curso</h2>
          <input type="text" placeholder="Nombre del curso" id="nombre" required />
          <textarea placeholder="Descripción del curso" id="descripcion" required></textarea>
  
          <label for="profesor">Profesor encargado:</label>
          <select id="profesor" required>
            <option value="">Selecciona un profesor</option>
          </select>
  
          <input type="file" id="imagen" accept="image/*" required />
          
          <h3>Agregar Estudiantes</h3>
          <input type="text" id="busquedaEstudiante" placeholder="Buscar por ID, nombre o apellido" />
          <ul id="resultadosBusqueda"></ul>
  
          <button type="submit">Crear Curso</button>
        </form>
      `;
  
      this.estudiantesSeleccionados = [];
  
      // 🔥 Cargar profesores en el select
      const profesores = (await obtenerTodos('usuarios')).filter(u => u.cargo === 'Profesor');
      const selectProfe = this.querySelector('#profesor');
  
      profesores.forEach(profe => {
        const option = document.createElement('option');
        option.value = profe.id;
        option.textContent = `${profe.nombre} (${profe.email})`;
        selectProfe.appendChild(option);
      });
  
      // 🔍 Búsqueda de estudiantes
      this.querySelector("#busquedaEstudiante").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) return;
        
        const estudiantes = JSON.parse(localStorage.getItem("estudiantes")) || [];
        const resultados = estudiantes.filter(est =>
          est.id.includes(query) ||
          est.nombres.toLowerCase().includes(query) ||
          est.apellidos.toLowerCase().includes(query)
        );
  
        const resultadosUL = this.querySelector("#resultadosBusqueda");
        resultadosUL.innerHTML = "";
  
        if (resultados.length === 0) {
          const li = document.createElement("li");
          li.textContent = "No se encontraron estudiantes";
          li.style.color = "#999";
          resultadosUL.appendChild(li);
          return;
        }
  
        resultados.forEach(est => {
          const li = document.createElement("li");
          li.textContent = `${est.nombres} ${est.apellidos} (${est.id})`;
          li.style.cursor = "pointer";
  
          if (this.estudiantesSeleccionados.includes(est.id)) {
            li.style.color = "green";
            li.textContent += " ✅";
          }
  
          li.addEventListener("click", () => {
            if (!this.estudiantesSeleccionados.includes(est.id)) {
              this.estudiantesSeleccionados.push(est.id);
              li.style.color = "green";
              li.textContent += " ✅";
              mostrarMensaje('info', `Estudiante ${est.nombres} agregado al curso`, 1500);
            } else {
              this.estudiantesSeleccionados = this.estudiantesSeleccionados.filter(id => id !== est.id);
              li.style.color = "";
              li.textContent = `${est.nombres} ${est.apellidos} (${est.id})`;
              mostrarMensaje('info', `Estudiante ${est.nombres} removido del curso`, 1500);
            }
          });
  
          resultadosUL.appendChild(li);
        });
      });
  
      // Envío del formulario
      this.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const fileInput = this.querySelector("#imagen");
        const file = fileInput.files[0];
        const nombre = this.querySelector("#nombre").value;
        const descripcion = this.querySelector("#descripcion").value;
        const profesorId = this.querySelector("#profesor").value;
  
        if (!nombre || !descripcion || !profesorId) {
          mostrarMensaje('error', 'Todos los campos son obligatorios.');
          return;
        }
  
        const validacionImagen = validarImagen(file);
        if (!validacionImagen.valido) {
          mostrarMensaje('error', validacionImagen.mensaje);
          return;
        }
  
        const cursos = JSON.parse(localStorage.getItem("cursos")) || [];
        if (cursos.some(curso => curso.nombre.toLowerCase() === nombre.toLowerCase())) {
          mostrarMensaje('error', 'Ya existe un curso con este nombre. Por favor elige otro nombre.');
          return;
        }
  
        try {
          const base64Img = await convertToBase64(file);
  
          const curso = {
            id: "curso-" + Date.now(),
            nombre,
            descripcion,
            imagen: base64Img,
            profesorId, // 👨‍🏫 aquí guardamos el ID del profe
            estudiantes: this.estudiantesSeleccionados,
            notas: {}
          };
  
          await agregarObjeto('cursos', curso);

  
          mostrarMensaje('exito', 'Curso creado con éxito');
          this.querySelector("form").reset();
          this.estudiantesSeleccionados = [];
          this.querySelector("#resultadosBusqueda").innerHTML = "";
        } catch (error) {
          console.error('Error al procesar la imagen:', error);
          mostrarMensaje('error', 'Error al procesar la imagen. Intenta con otra imagen.');
        }
      });
    }
  }
  
  customElements.define("course-create", CourseCreate);
  
  
  // Componente: Evaluación de Cursos
  class CourseGrades extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <div class="course-grades">
          <h3>Evaluar Curso</h3>
          <select id="selectorCurso">
            <option value="">Selecciona un curso</option>
          </select>
  
          <div id="cursoInfo" style="margin-top: 20px;"></div>
  
          <div id="agregarEstudiante">
            <h4>Agregar estudiante al curso</h4>
            <input type="text" id="busquedaEstudiante" placeholder="Buscar por ID, nombre o apellido" />
            <ul id="resultadosBusquedaCurso"></ul>
          </div>
  
          <div id="tablaNotasContainer"></div>
        </div>
      `;
  
      // Inicializar datos
      this.cursos = JSON.parse(localStorage.getItem("cursos")) || [];
      this.estudiantes = JSON.parse(localStorage.getItem("estudiantes")) || [];
  
      this.selector = this.querySelector("#selectorCurso");
      this.container = this.querySelector("#tablaNotasContainer");
  
      // Renderizar selector de cursos
      this.renderSelector();
      
      // Configurar búsqueda de estudiantes para agregar al curso
      this.querySelector("#busquedaEstudiante").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) return; // Mínimo 2 caracteres para buscar
        
        const resultadosUL = this.querySelector("#resultadosBusquedaCurso");
        resultadosUL.innerHTML = "";
      
        const cursoID = this.selector.value;
        const curso = this.cursos.find(c => c.id === cursoID);
        if (!curso) {
          mostrarMensaje('advertencia', 'Primero debes seleccionar un curso');
          return;
        }
      
        const resultados = this.estudiantes.filter(est =>
          (est.id.includes(query) ||
          est.nombres.toLowerCase().includes(query) ||
          est.apellidos.toLowerCase().includes(query)) &&
          !curso.estudiantes.includes(est.id) // Solo si no está ya en el curso
        );
        
        if (resultados.length === 0) {
          const li = document.createElement("li");
          li.textContent = "No se encontraron estudiantes o ya están todos asignados";
          li.style.color = "#999";
          resultadosUL.appendChild(li);
          return;
        }
      
        resultados.forEach(est => {
          const li = document.createElement("li");
          li.textContent = `${est.nombres} ${est.apellidos} (${est.id})`;
          li.style.cursor = "pointer";
          li.addEventListener("click", () => {
            curso.estudiantes.push(est.id);
            localStorage.setItem("cursos", JSON.stringify(this.cursos));
            mostrarMensaje('exito', `Estudiante ${est.nombres} ${est.apellidos} agregado al curso`);
            this.renderTabla(); // Recargar tabla
            e.target.value = "";
            resultadosUL.innerHTML = "";
          });
          resultadosUL.appendChild(li);
        });
      });
      
      // Actualizar tabla al cambiar el curso seleccionado
      this.selector.addEventListener("change", () => {
        if (this.selector.value) {
          this.renderTabla();
        } else {
          this.container.innerHTML = "";
          this.querySelector("#cursoInfo").innerHTML = "";
        }
      });
    }
  
    // Método para renderizar el selector de cursos
    renderSelector() {
      // Limpiar opciones existentes excepto la primera
      while (this.selector.options.length > 1) {
        this.selector.remove(1);
      }
      
      if (this.cursos.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay cursos disponibles";
        option.disabled = true;
        this.selector.appendChild(option);
        mostrarMensaje('info', 'No hay cursos disponibles. Crea un curso primero.');
        return;
      }
      
      this.cursos.forEach(curso => {
        const option = document.createElement("option");
        option.value = curso.id;
        option.textContent = curso.nombre;
        this.selector.appendChild(option);
      });
    }
  
    // Método para renderizar la tabla de notas
    renderTabla() {
      const cursoID = this.selector.value;
      const curso = this.cursos.find(c => c.id === cursoID);
      const info = this.querySelector("#cursoInfo");
      
      // Si no hay curso seleccionado o no existe
      if (!curso) {
        this.container.innerHTML = `<p>Curso no encontrado.</p>`;
        return;
      }
      
      // Mostrar información del curso
      info.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 10px;">
          <img src="${curso.imagen}" alt="Imagen del curso" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
          <div>
            <h4 style="margin: 0;">${curso.nombre}</h4>
            <p style="margin: 5px 0;">${curso.descripcion}</p>
          </div>
        </div>
      `;
  
      // Verificar si el curso tiene estudiantes
      if (!curso.estudiantes || curso.estudiantes.length === 0) {
        this.container.innerHTML = `<p>⚠️ Este curso aún no tiene estudiantes asignados.</p>`;
        return;
      }
  
      // Inicializar objeto de notas si no existe
      if (!curso.notas) curso.notas = {};
  
      // Crear tabla de notas
      const tabla = document.createElement("table");
      tabla.innerHTML = `
        <thead>
          <tr>
            <th>Foto</th>
            <th>Estudiante</th>
            <th>Identificación</th>
            <th>Email</th>
            <th>Fecha</th>
            <th>Nota Final</th>
          </tr>
        </thead>
        <tbody>
          ${curso.estudiantes.map(id => {
            const est = this.estudiantes.find(e => e.id === id);
            if (!est) return ''; // estudiante no existe
  
            const notas = curso.notas[id] || { parcial1: 0, parcial2: 0, parcial3: 0 };
  
            return `
              <tr data-id="${id}">
                <td><img src="${est.foto || ''}" alt="Foto" width="50" height="50" style="border-radius: 50%; object-fit: cover;" /></td>
                <td>${est.nombres} ${est.apellidos}</td>
                <td>${est.id}</td>
                <td>${est.email}</td>
                <td>${est.fecha}</td>
                <td class="nota-final">${this.calcularNotaFinal(notas)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
  
      this.container.innerHTML = "";
      this.container.appendChild(tabla);
  
      // Configurar eventos para actualizar notas
      this.container.querySelectorAll(".nota").forEach(input => {
        input.addEventListener("input", () => {
          const fila = input.closest("tr");
          const estudianteID = fila.getAttribute("data-id");
          const parcial = input.getAttribute("data-parcial");
  
          let valor = parseFloat(input.value);
          if (isNaN(valor)) valor = 0;
          if (valor < 0) valor = 0;
          if (valor > 100) valor = 100;
          input.value = valor;
  
          if (!curso.notas[estudianteID]) {
            curso.notas[estudianteID] = { parcial1: 0, parcial2: 0, parcial3: 0 };
          }
  
          curso.notas[estudianteID][`parcial${parcial}`] = valor;
  
          const notas = curso.notas[estudianteID];
          const notaFinal = this.calcularNotaFinal(notas);
          fila.querySelector(".nota-final").textContent = notaFinal;
  
          // Guardar cambios
          localStorage.setItem("cursos", JSON.stringify(this.cursos));
          mostrarMensaje('info', 'Nota actualizada', 1500);
        });
      });
    }
  
    // Método para calcular la nota final
    calcularNotaFinal(n) {
      const nf = (n.parcial1 * 0.3 + n.parcial2 * 0.3 + n.parcial3 * 0.4);
      return nf.toFixed(2);
    }
  }
  customElements.define("course-grades", CourseGrades);
  