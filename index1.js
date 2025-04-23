// index.js actualizado para usar IndexedDB en lugar de localStorage
import { initDB, crearAdminPorDefecto, login, agregarObjeto, obtenerTodos, actualizarObjeto, buscarPorClave } from './indexdb.js';


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
        mostrarMensaje('exito', `Bienvenido, ${user.nombre || user.nombres}`);
      } else {
        this.querySelector("#loginError").textContent = "Credenciales incorrectas";
        mostrarMensaje('error', 'Credenciales incorrectas. Intenta nuevamente.');
      }
    });
  }
}
if (!customElements.get('login-form')) {
    customElements.define("login-form", LoginForm);
  }

// Panel de administrador (DashboardView)
// Panel de administrador actualizado (DashboardView)
class DashboardView extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <div class="dashboard-container">
          <div class="dashboard-header">
            <div class="dashboard-menu">
              <button id="createCourseBtn">📚 Crear Curso</button>
              <button id="viewCoursesBtn">👁️ Ver Cursos</button>
              <button id="manageStudentsBtn">👨‍👩‍👧‍👦 Gestionar Estudiantes en Cursos</button>
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
  
      this.querySelector("#viewCoursesBtn").addEventListener("click", () => {
        content.innerHTML = "";
        content.appendChild(document.createElement("course-view"));
      });
  
      this.querySelector("#manageStudentsBtn").addEventListener("click", () => {
        content.innerHTML = "";
        content.appendChild(document.createElement("add-students-to-course"));
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

// Vista de cursos para administradores (solo visualización)
class CourseView extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `
      <div class="course-view">
        <h3>Lista de Cursos</h3>
        <div class="actions">
          <select id="selectorCurso">
            <option value="">Selecciona un curso</option>
          </select>
        </div>

        <div id="cursoInfo" style="margin-top: 20px;"></div>
        <div id="tablaEstudiantesContainer"></div>
      </div>
    `;

    this.selector = this.querySelector("#selectorCurso");
    this.container = this.querySelector("#tablaEstudiantesContainer");
    
    this.selector.addEventListener("change", () => {
      if (this.selector.value) {
        this.renderCursoInfo();
      } else {
        this.container.innerHTML = "";
        this.querySelector("#cursoInfo").innerHTML = "";
      }
    });

    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cursos = await obtenerTodos('cursos');
      this.estudiantes = await obtenerTodos('estudiantes');
      
      this.renderSelector();
      return true;
    } catch (error) {
      console.error("Error al cargar datos:", error);
      mostrarMensaje('error', 'Error al cargar los datos: ' + error.message);
      return false;
    }
  }

  renderSelector() {
    this.selector.innerHTML = '';
    
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Selecciona un curso";
    this.selector.appendChild(defaultOption);
    
    if (!this.cursos || this.cursos.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay cursos disponibles";
      option.disabled = true;
      this.selector.appendChild(option);
      mostrarMensaje('info', 'No hay cursos disponibles.');
      return;
    }
    
    this.cursos.forEach(curso => {
      const option = document.createElement("option");
      option.value = curso.id;
      option.textContent = curso.nombre;
      this.selector.appendChild(option);
    });
  }

  async renderCursoInfo() {
    const cursoID = this.selector.value;
    const curso = await buscarPorClave('cursos', cursoID);
    
    if (!curso) {
      this.container.innerHTML = `<p>Curso no encontrado.</p>`;
      mostrarMensaje('error', 'No se pudo encontrar el curso seleccionado');
      return;
    }
    
    const info = this.querySelector("#cursoInfo");
    
    info.innerHTML = `
      <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 10px;">
        <img src="${curso.imagen}" alt="Imagen del curso" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
        <div>
          <h4 style="margin: 0;">${curso.nombre}</h4>
          <p style="margin: 5px 0;">${curso.descripcion}</p>
        </div>
      </div>
    `;

    if (!curso.estudiantes || curso.estudiantes.length === 0) {
      this.container.innerHTML = `<p>⚠️ Este curso aún no tiene estudiantes asignados.</p>`;
      return;
    }

    const tabla = document.createElement("table");
    tabla.innerHTML = `
      <thead>
        <tr>
          <th>Foto</th>
          <th>Estudiante</th>
          <th>Identificación</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        ${curso.estudiantes.map(id => {
          const est = this.estudiantes.find(e => e.id === id);
        
          if (!est) return `
            <tr>
              <td colspan="4">Estudiante ID ${id} no encontrado</td>
            </tr>
          `;

          return `
            <tr>
              <td><img src="${est.foto}" alt="Foto de ${est.nombres}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;" /></td>
              <td>${est.nombres} ${est.apellidos}</td>
              <td>${est.id}</td>
              <td>${est.email}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    this.container.innerHTML = "";
    this.container.appendChild(tabla);
  }
}
customElements.define("course-view", CourseView);

class DashboardProfesor extends HTMLElement {
  async connectedCallback() {
    const user = JSON.parse(sessionStorage.getItem("loggedUser"));
    const cursos = await obtenerTodos("cursos");

    const cursosAsignados = cursos.filter(curso => curso.profesorId === user.id);

    this.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="dashboard-menu">
            <button id="homeBtn">🏠 Inicio</button>
            <button id="logoutBtn">🚪 Cerrar sesión</button>
          </div>
        </div>
        <div id="profesorContent">
          <div id="profesorCursos">
            <h2>Cursos Asignados</h2>
            ${cursosAsignados.length === 0 ? '<p>No tienes cursos asignados aún.</p>' : ''}
            ${cursosAsignados.map(curso => `
              <div class="card-curso">
                <h3>${curso.nombre}</h3>
                <p>${curso.descripcion}</p>
                <button class="ver-notas" data-id="${curso.id}">Calificar</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.querySelectorAll(".ver-notas").forEach(btn => {
      btn.addEventListener("click", () => {
        const cursoId = btn.getAttribute("data-id");
        const content = this.querySelector("#profesorContent");
        content.innerHTML = "";
        
        const gradeComponent = document.createElement("course-grades");
        gradeComponent.setAttribute("curso-id", cursoId);
        content.appendChild(gradeComponent);
      });
    });

    this.querySelector("#homeBtn").addEventListener("click", () => {
      navigateTo("dashboard");
    });

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

    const inscritos = cursos.filter(curso => curso.estudiantes && curso.estudiantes.includes(user.id));

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
  
        try {
          // Verificar duplicados usando IndexedDB
          const estudiantes = await obtenerTodos('estudiantes');
          
          if (estudiantes.some(est => est.id === id)) {
            mostrarMensaje('error', 'Ya existe un estudiante con esta identificación.');
            return;
          }
  
          if (estudiantes.some(est => est.email === email)) {
            mostrarMensaje('error', 'Ya existe un estudiante con este email.');
            return;
          }
  
          const base64Image = await convertToBase64(file);
  
          const estudiante = {
            id,
            nombres,
            apellidos,
            email,
            password,
            fecha,
            foto: base64Image,
            cargo: "Estudiante" // Agregamos cargo para identificar que es un estudiante
          };
  
          // CORRECCIÓN: Agregar console.log para depuración
          console.log('Intentando guardar estudiante:', estudiante.id);
          
          // Guardar en IndexedDB en lugar de localStorage
          await agregarObjeto('estudiantes', estudiante);
          console.log('Estudiante guardado correctamente en IndexedDB');
  
          mostrarMensaje('exito', 'Estudiante registrado correctamente');
          this.querySelector("form").reset();
        } catch (error) {
          console.error('Error al registrar estudiante:', error);
          mostrarMensaje('error', 'Error al registrar el estudiante: ' + error.message);
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
    this.querySelector("#busquedaEstudiante").addEventListener("input", async (e) => {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) return;

      const estudiantes = await obtenerTodos('estudiantes'); // Leemos desde indexDB
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

      try {
        // Verificar si ya existe un curso con el mismo nombre
        const cursos = await obtenerTodos('cursos');
        if (cursos.some(curso => curso.nombre.toLowerCase() === nombre.toLowerCase())) {
          mostrarMensaje('error', 'Ya existe un curso con este nombre. Por favor elige otro nombre.');
          return;
        }

        const base64Img = await convertToBase64(file);

        const curso = {
          id: "curso-" + Date.now(),
          nombre,
          descripcion,
          imagen: base64Img,
          profesorId,
          estudiantes: this.estudiantesSeleccionados,
          notas: {}
        };

        await agregarObjeto('cursos', curso);
        console.log('Estructura del curso guardado:', JSON.stringify(curso));

        mostrarMensaje('exito', 'Curso creado con éxito');
        this.querySelector("form").reset();
        this.estudiantesSeleccionados = [];
        this.querySelector("#resultadosBusqueda").innerHTML = "";
      } catch (error) {
        console.error('Error al crear el curso:', error);
        mostrarMensaje('error', 'Error al crear el curso. Intenta nuevamente.');
      }
    });
  }
}

customElements.define("course-create", CourseCreate);


// Componente: Evaluación de Cursos (completado)
class CourseGrades extends HTMLElement {
    async connectedCallback() {
      // Si se pasó un curso específico para calificar
      const cursoIdParam = this.getAttribute('curso-id');
      
      this.innerHTML = `
        <div class="course-grades">
          <h3>Evaluar Curso</h3>
          <div class="actions">
            <select id="selectorCurso">
              <option value="">Selecciona un curso</option>
            </select>
            <button id="backBtn">⬅️ Volver</button>
          </div>
  
          <div id="cursoInfo" style="margin-top: 20px;"></div>
          <div id="tablaNotasContainer"></div>
        </div>
      `;
  
      // Inicializar elementos
      this.selector = this.querySelector("#selectorCurso");
      this.container = this.querySelector("#tablaNotasContainer");
      this.backBtn = this.querySelector("#backBtn");
  
      // Configurar eventos
      this.backBtn.addEventListener("click", () => {
        navigateTo("dashboard");
      });
      
      this.selector.addEventListener("change", () => {
        console.log('Curso seleccionado:', this.selector.value);
        if (this.selector.value) {
          this.renderTabla();
        } else {
          this.container.innerHTML = "";
          this.querySelector("#cursoInfo").innerHTML = "";
        }
      });
  
      // Cargar datos iniciales
      await this.cargarDatos();
      
      // Si se pasó un curso específico, seleccionarlo automáticamente
      if (cursoIdParam) {
        this.selector.value = cursoIdParam;
        this.renderTabla();
      }
    }
  
    async cargarDatos() {
      try {
        const user = JSON.parse(sessionStorage.getItem("loggedUser"));
        
        // Cargar cursos asignados al profesor actual
        this.cursos = await obtenerTodos('cursos');
        this.cursos = this.cursos.filter(curso => curso.profesorId === user.id);
        
        // Cargar todos los estudiantes
        this.estudiantes = await obtenerTodos('estudiantes');
        
        this.renderSelector();
        return true;
      } catch (error) {
        console.error("Error al cargar datos:", error);
        mostrarMensaje('error', 'Error al cargar los datos: ' + error.message);
        return false;
      }
    }
  
    renderSelector() {
      this.selector.innerHTML = '';
      
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Selecciona un curso";
      this.selector.appendChild(defaultOption);
      
      if (!this.cursos || this.cursos.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No tienes cursos asignados";
        option.disabled = true;
        this.selector.appendChild(option);
        mostrarMensaje('info', 'No tienes cursos asignados como profesor.');
        return;
      }
      
      this.cursos.forEach(curso => {
        const option = document.createElement("option");
        option.value = curso.id;
        option.textContent = curso.nombre;
        this.selector.appendChild(option);
      });
    }
  
    async renderTabla() {
      const cursoID = this.selector.value;
      const curso = await buscarPorClave('cursos', cursoID);
      
      if (!curso) {
        this.container.innerHTML = `<p>Curso no encontrado.</p>`;
        mostrarMensaje('error', 'No se pudo encontrar el curso seleccionado');
        return;
      }
      
      const info = this.querySelector("#cursoInfo");
      
      info.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 10px;">
          <img src="${curso.imagen}" alt="Imagen del curso" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
          <div>
            <h4 style="margin: 0;">${curso.nombre}</h4>
            <p style="margin: 5px 0;">${curso.descripcion}</p>
          </div>
        </div>
      `;
  
      if (!curso.estudiantes || curso.estudiantes.length === 0) {
        this.container.innerHTML = `<p>⚠️ Este curso aún no tiene estudiantes asignados.</p>`;
        return;
      }
  
      // Si no hay objeto de notas, crearlo
      if (!curso.notas) {
        curso.notas = {};
      }
  
      const tabla = document.createElement("table");
      tabla.innerHTML = `
        <thead>
          <tr>
            <th>Foto</th>
            <th>Estudiante</th>
            <th>ID</th>
            <th>Parcial 1 (30%)</th>
            <th>Parcial 2 (30%)</th>
            <th>Final (40%)</th>
            <th>Nota Final</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaNotas">
          ${curso.estudiantes.map(id => {
            const est = this.estudiantes.find(e => e.id === id);
            
            if (!est) return `
              <tr>
                <td colspan="8">Estudiante ID ${id} no encontrado</td>
              </tr>
            `;
  
            // Obtener notas del estudiante o inicializar si no existen
            const notasEst = curso.notas[id] || { parcial1: 0, parcial2: 0, parcial3: 0 };
            
            // Calcular nota final
            const final = (notasEst.parcial1 * 0.3 + notasEst.parcial2 * 0.3 + notasEst.parcial3 * 0.4).toFixed(2);
  
            return `
              <tr data-id="${id}">
                <td><img src="${est.foto}" alt="Foto de ${est.nombres}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" /></td>
                <td>${est.nombres} ${est.apellidos}</td>
                <td>${est.id}</td>
                <td>
                  <input type="number" min="0" max="5" step="0.1" value="${notasEst.parcial1}" 
                         class="nota-input parcial1" data-estudiante="${id}" />
                </td>
                <td>
                  <input type="number" min="0" max="5" step="0.1" value="${notasEst.parcial2}" 
                         class="nota-input parcial2" data-estudiante="${id}" />
                </td>
                <td>
                  <input type="number" min="0" max="5" step="0.1" value="${notasEst.parcial3}" 
                         class="nota-input parcial3" data-estudiante="${id}" />
                </td>
                <td class="nota-final">${final}</td>
                <td>
                  <button class="guardar-notas" data-estudiante="${id}">💾 Guardar</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
  
      this.container.innerHTML = "";
      this.container.appendChild(tabla);
      
      // Agregar eventos a los botones de guardar
      this.container.querySelectorAll('.guardar-notas').forEach(btn => {
        btn.addEventListener('click', async () => {
          const estudianteId = btn.getAttribute('data-estudiante');
          const tr = this.container.querySelector(`tr[data-id="${estudianteId}"]`);
          
          const parcial1 = parseFloat(tr.querySelector('.parcial1').value);
          const parcial2 = parseFloat(tr.querySelector('.parcial2').value);
          const parcial3 = parseFloat(tr.querySelector('.parcial3').value);
          
          // Validaciones
          if (isNaN(parcial1) || isNaN(parcial2) || isNaN(parcial3)) {
            mostrarMensaje('error', 'Las notas deben ser números válidos');
            return;
          }
          
          if (parcial1 < 0 || parcial1 > 5 || parcial2 < 0 || parcial2 > 5 || parcial3 < 0 || parcial3 > 5) {
            mostrarMensaje('error', 'Las notas deben estar entre 0 y 5');
            return;
          }
          
          try {
            // Actualizar el objeto del curso
            const cursoActualizado = await buscarPorClave('cursos', cursoID);
            
            if (!cursoActualizado.notas) {
              cursoActualizado.notas = {};
            }
            
            cursoActualizado.notas[estudianteId] = {
              parcial1,
              parcial2,
              parcial3
            };
            
            // Guardar en IndexedDB
            await actualizarObjeto('cursos', cursoActualizado);
            
            // Actualizar nota final en la vista
            const final = (parcial1 * 0.3 + parcial2 * 0.3 + parcial3 * 0.4).toFixed(2);
            tr.querySelector('.nota-final').textContent = final;
            
            mostrarMensaje('exito', 'Notas guardadas correctamente');
            
          } catch (error) {
            console.error('Error al guardar notas:', error);
            mostrarMensaje('error', 'Error al guardar las notas: ' + error.message);
          }
        });
      });
      
      // Eventos para recalcular la nota final al cambiar valores
      this.container.querySelectorAll('.nota-input').forEach(input => {
        input.addEventListener('input', event => {
          const tr = event.target.closest('tr');
          const parcial1 = parseFloat(tr.querySelector('.parcial1').value) || 0;
          const parcial2 = parseFloat(tr.querySelector('.parcial2').value) || 0;
          const parcial3 = parseFloat(tr.querySelector('.parcial3').value) || 0;
          
          const final = (parcial1 * 0.3 + parcial2 * 0.3 + parcial3 * 0.4).toFixed(2);
          tr.querySelector('.nota-final').textContent = final;
        });
      });
    }
}
customElements.define("course-grades", CourseGrades);
// Componente: Añadir Estudiantes a Cursos
class AddStudentsToCourse extends HTMLElement {
    async connectedCallback() {
      this.innerHTML = `
        <div class="add-students-container">
          <h3>Añadir Estudiantes a Cursos</h3>
          <div class="actions">
            <select id="selectorCurso">
              <option value="">Selecciona un curso</option>
            </select>
          </div>
  
          <div id="cursoInfo" style="margin-top: 20px;"></div>
          
          <div class="estudiantes-search-section">
            <h4>Buscar Estudiantes</h4>
            <input type="text" id="busquedaEstudiante" placeholder="Buscar por ID, nombre o apellido" />
            <ul id="resultadosBusqueda" class="search-results"></ul>
          </div>
          
          <div id="estudiantesActuales" class="estudiantes-actuales">
            <h4>Estudiantes Inscritos</h4>
            <ul id="listaEstudiantesActuales"></ul>
          </div>
        </div>
      `;
  
      this.selector = this.querySelector("#selectorCurso");
      this.cursoInfo = this.querySelector("#cursoInfo");
      this.listaEstudiantesActuales = this.querySelector("#listaEstudiantesActuales");
      this.resultadosBusqueda = this.querySelector("#resultadosBusqueda");
      
      this.selector.addEventListener("change", () => {
        if (this.selector.value) {
          this.mostrarCursoInfo();
        } else {
          this.cursoInfo.innerHTML = "";
          this.listaEstudiantesActuales.innerHTML = "";
        }
      });
  
      // Configurar búsqueda de estudiantes
      this.querySelector("#busquedaEstudiante").addEventListener("input", e => {
        this.buscarEstudiantes(e.target.value);
      });
  
      await this.cargarCursos();
    }
  
    async cargarCursos() {
      try {
        const cursos = await obtenerTodos('cursos');
        
        // Limpiar selector
        this.selector.innerHTML = '<option value="">Selecciona un curso</option>';
        
        if (cursos.length === 0) {
          this.selector.innerHTML += '<option value="" disabled>No hay cursos disponibles</option>';
          mostrarMensaje('info', 'No hay cursos disponibles');
          return;
        }
        
        // Llenar selector con cursos
        cursos.forEach(curso => {
          const option = document.createElement('option');
          option.value = curso.id;
          option.textContent = curso.nombre;
          this.selector.appendChild(option);
        });
      } catch (error) {
        console.error("Error al cargar cursos:", error);
        mostrarMensaje('error', 'Error al cargar los cursos: ' + error.message);
      }
    }
  
    async mostrarCursoInfo() {
      const cursoId = this.selector.value;
      const curso = await buscarPorClave('cursos', cursoId);
      
      if (!curso) {
        this.cursoInfo.innerHTML = '<p>Curso no encontrado</p>';
        this.listaEstudiantesActuales.innerHTML = '';
        return;
      }
      
      // Mostrar información del curso
      this.cursoInfo.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 10px;">
          <img src="${curso.imagen}" alt="Imagen del curso" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
          <div>
            <h4 style="margin: 0;">${curso.nombre}</h4>
            <p style="margin: 5px 0;">${curso.descripcion}</p>
          </div>
        </div>
      `;
      
      // Cargar estudiantes actuales
      await this.mostrarEstudiantesActuales(curso);
    }
  
    async mostrarEstudiantesActuales(curso) {
      this.listaEstudiantesActuales.innerHTML = '';
      
      if (!curso.estudiantes || curso.estudiantes.length === 0) {
        this.listaEstudiantesActuales.innerHTML = '<p>Este curso no tiene estudiantes inscritos.</p>';
        return;
      }
      
      try {
        const todosEstudiantes = await obtenerTodos('estudiantes');
        
        // Mostrar lista de estudiantes inscritos
        curso.estudiantes.forEach(estudianteId => {
          const estudiante = todosEstudiantes.find(e => e.id === estudianteId);
          
          if (!estudiante) {
            console.warn(`Estudiante con ID ${estudianteId} no encontrado`);
            return;
          }
          
          const li = document.createElement('li');
          li.className = 'estudiante-item';
          li.innerHTML = `
            <div class="estudiante-info">
              <img src="${estudiante.foto}" alt="Foto de ${estudiante.nombres}" class="estudiante-foto" />
              <span>${estudiante.nombres} ${estudiante.apellidos} (${estudiante.id})</span>
            </div>
            <button class="btn-eliminar" data-id="${estudiante.id}">❌</button>
          `;
          
          // Agregar evento para eliminar estudiante del curso
          li.querySelector('.btn-eliminar').addEventListener('click', () => {
            this.eliminarEstudianteDelCurso(curso.id, estudiante.id);
          });
          
          this.listaEstudiantesActuales.appendChild(li);
        });
      } catch (error) {
        console.error("Error al mostrar estudiantes:", error);
        mostrarMensaje('error', 'Error al cargar los estudiantes del curso');
      }
    }
  
    async buscarEstudiantes(query) {
      if (!query || query.length < 2) {
        this.resultadosBusqueda.innerHTML = '';
        return;
      }
      
      try {
        const cursoId = this.selector.value;
        if (!cursoId) {
          mostrarMensaje('advertencia', 'Primero selecciona un curso');
          return;
        }
        
        const curso = await buscarPorClave('cursos', cursoId);
        if (!curso) {
          mostrarMensaje('error', 'El curso seleccionado no existe');
          return;
        }
        
        const estudiantesQuery = query.toLowerCase();
        const todosEstudiantes = await obtenerTodos('estudiantes');
        
        // Filtrar estudiantes que coincidan con la búsqueda y NO estén ya en el curso
        const estudiantesFiltrados = todosEstudiantes.filter(est => 
          (est.id.toLowerCase().includes(estudiantesQuery) || 
           est.nombres.toLowerCase().includes(estudiantesQuery) || 
           est.apellidos.toLowerCase().includes(estudiantesQuery)) && 
          (!curso.estudiantes || !curso.estudiantes.includes(est.id))
        );
        
        // Mostrar resultados
        this.resultadosBusqueda.innerHTML = '';
        
        if (estudiantesFiltrados.length === 0) {
          const li = document.createElement('li');
          li.textContent = 'No se encontraron estudiantes o ya están inscritos';
          li.className = 'no-results';
          this.resultadosBusqueda.appendChild(li);
          return;
        }
        
        estudiantesFiltrados.forEach(est => {
          const li = document.createElement('li');
          li.className = 'estudiante-resultado';
          li.innerHTML = `
            <div class="estudiante-info">
              <img src="${est.foto}" alt="Foto de ${est.nombres}" class="estudiante-foto" />
              <span>${est.nombres} ${est.apellidos} (${est.id})</span>
            </div>
            <button class="btn-agregar" data-id="${est.id}">➕</button>
          `;
          
          // Agregar evento para añadir estudiante al curso
          li.querySelector('.btn-agregar').addEventListener('click', () => {
            this.agregarEstudianteAlCurso(curso.id, est.id);
          });
          
          this.resultadosBusqueda.appendChild(li);
        });
      } catch (error) {
        console.error("Error en búsqueda de estudiantes:", error);
        mostrarMensaje('error', 'Error al buscar estudiantes');
      }
    }
  
    async agregarEstudianteAlCurso(cursoId, estudianteId) {
      try {
        const curso = await buscarPorClave('cursos', cursoId);
        if (!curso) {
          mostrarMensaje('error', 'Curso no encontrado');
          return;
        }
        
        // Inicializar array de estudiantes si no existe
        if (!curso.estudiantes) {
          curso.estudiantes = [];
        }
        
        // Verificar si el estudiante ya está en el curso
        if (curso.estudiantes.includes(estudianteId)) {
          mostrarMensaje('advertencia', 'Este estudiante ya está inscrito en el curso');
          return;
        }
        
        // Añadir estudiante al curso
        curso.estudiantes.push(estudianteId);
        
        // Guardar cambios
        await actualizarObjeto('cursos', curso);
        
        // Actualizar la vista
        await this.mostrarCursoInfo();
        
        // Limpiar búsqueda
        this.querySelector("#busquedaEstudiante").value = '';
        this.resultadosBusqueda.innerHTML = '';
        
        mostrarMensaje('exito', 'Estudiante añadido al curso correctamente');
      } catch (error) {
        console.error("Error al agregar estudiante:", error);
        mostrarMensaje('error', 'Error al añadir estudiante al curso');
      }
    }
  
    async eliminarEstudianteDelCurso(cursoId, estudianteId) {
      try {
        const curso = await buscarPorClave('cursos', cursoId);
        if (!curso || !curso.estudiantes) {
          mostrarMensaje('error', 'Curso no encontrado o sin estudiantes');
          return;
        }
        
        // Eliminar estudiante del array
        curso.estudiantes = curso.estudiantes.filter(id => id !== estudianteId);
        
        // Si el estudiante tenía notas, eliminarlas también
        if (curso.notas && curso.notas[estudianteId]) {
          delete curso.notas[estudianteId];
        }
        
        // Guardar cambios
        await actualizarObjeto('cursos', curso);
        
        // Actualizar la vista
        await this.mostrarCursoInfo();
        
        mostrarMensaje('info', 'Estudiante eliminado del curso');
      } catch (error) {
        console.error("Error al eliminar estudiante:", error);
        mostrarMensaje('error', 'Error al eliminar estudiante del curso');
      }
    }
  }
  
  customElements.define("add-students-to-course", AddStudentsToCourse);

// Exportar las funciones globales para que sean accesibles desde otros archivos
export {
  navigateTo,
  mostrarMensaje,
  validarImagen,
  convertToBase64,
  ocultarBarraDeNavegacion,
  mostrarBarraDeNavegacion
};