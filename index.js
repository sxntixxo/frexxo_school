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
              <button class="ver-notas" data-id="${curso.id}">Calificar</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.querySelectorAll(".ver-notas").forEach(btn => {
      btn.addEventListener("click", () => {
        const cursoId = btn.getAttribute("data-id");
        // Aquí puedes implementar la vista de calificación
        // Puedes crear un nuevo componente para esto
        mostrarMensaje('info', 'Funcionalidad en desarrollo');
      });
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


// Componente: Evaluación de Cursos
class CourseGrades extends HTMLElement {
    async connectedCallback() {
      this.innerHTML = `
        <div class="course-grades">
          <h3>Evaluar Curso</h3>
          <div class="actions">
            <select id="selectorCurso">
              <option value="">Selecciona un curso</option>
            </select>
            <button id="refreshBtn">🔄 Actualizar cursos</button>
          </div>
  
          <div id="cursoInfo" style="margin-top: 20px;"></div>
  
          <div id="agregarEstudiante">
            <h4>Agregar estudiante al curso</h4>
            <input type="text" id="busquedaEstudiante" placeholder="Buscar por ID, nombre o apellido" />
            <ul id="resultadosBusquedaCurso"></ul>
          </div>
  
          <div id="tablaNotasContainer"></div>
        </div>
      `;
  
      // Inicializar elementos
      this.selector = this.querySelector("#selectorCurso");
      this.container = this.querySelector("#tablaNotasContainer");
      this.refreshBtn = this.querySelector("#refreshBtn");
  
      // Configurar eventos
      this.refreshBtn.addEventListener("click", () => this.cargarDatos());
      
      this.selector.addEventListener("change", () => {
        console.log('Curso seleccionado:', this.selector.value);
        if (this.selector.value) {
          this.renderTabla();
        } else {
          this.container.innerHTML = "";
          this.querySelector("#cursoInfo").innerHTML = "";
        }
      });
  
      // Configurar búsqueda de estudiantes para agregar al curso
      this.querySelector("#busquedaEstudiante").addEventListener("input", async (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) return; // Mínimo 2 caracteres para buscar
        
        const resultadosUL = this.querySelector("#resultadosBusquedaCurso");
        resultadosUL.innerHTML = "";
      
        const cursoID = this.selector.value;
        if (!cursoID) {
          mostrarMensaje('advertencia', 'Primero debes seleccionar un curso');
          return;
        }
        
        // Obtener el curso más actualizado directamente desde IndexedDB
        const curso = await buscarPorClave('cursos', cursoID);
        if (!curso) {
          mostrarMensaje('error', 'Curso no encontrado');
          return;
        }
      
        const resultados = this.estudiantes.filter(est =>
          (est.id.includes(query) ||
          est.nombres.toLowerCase().includes(query) ||
          est.apellidos.toLowerCase().includes(query)) &&
          (!curso.estudiantes || !curso.estudiantes.includes(est.id)) // Solo si no está ya en el curso
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
          li.addEventListener("click", async () => {
            try {
              if (!curso.estudiantes) curso.estudiantes = [];
              curso.estudiantes.push(est.id);
              
              // Actualizar en IndexedDB
              await actualizarObjeto('cursos', curso);
              console.log('Estudiante agregado al curso:', est.id, 'Curso:', curso.id);
              
              mostrarMensaje('exito', `Estudiante ${est.nombres} ${est.apellidos} agregado al curso`);
              
              // Recargar los cursos para tener datos actualizados
              await this.cargarDatos();
              this.renderTabla(); // Recargar tabla
              
              e.target.value = "";
              resultadosUL.innerHTML = "";
            } catch (error) {
              console.error('Error al agregar estudiante:', error);
              mostrarMensaje('error', 'No se pudo agregar el estudiante al curso');
            }
          });
          resultadosUL.appendChild(li);
        });
      });
  
      // Cargar datos iniciales
      await this.cargarDatos();
    }
  
    // Método para cargar datos desde IndexedDB
    async cargarDatos() {
      try {
        mostrarMensaje('info', 'Actualizando lista de cursos...', 1500);
        console.log("Cargando cursos desde IndexedDB...");
        
        // Limpiar datos actuales
        this.cursos = [];
        this.estudiantes = [];
        
        // Cargar datos desde IndexedDB
        try {
          this.cursos = await obtenerTodos('cursos');
          console.log('Cursos encontrados:', this.cursos.length, this.cursos); // Debug info
        } catch (err) {
          console.error('Error al obtener cursos:', err);
          mostrarMensaje('error', 'Error al obtener los cursos');
        }
        
        try {
          this.estudiantes = await obtenerTodos('estudiantes');
          console.log('Estudiantes encontrados:', this.estudiantes.length, this.estudiantes); // Debug info
        } catch (err) {
          console.error('Error al obtener estudiantes:', err);
          mostrarMensaje('error', 'Error al obtener los estudiantes');
        }

        // Renderizar selector de cursos
        this.renderSelector();

        // Si hay un curso seleccionado, actualizar la tabla
        if (this.selector.value) {
          this.renderTabla();
        }

        return true;
      } catch (error) {
        console.error("Error al cargar datos:", error);
        mostrarMensaje('error', 'Error al cargar los datos: ' + error.message);
        return false;
      }
    }
  
    // Método para renderizar el selector de cursos
    renderSelector() {
      console.log("Renderizando selector con", this.cursos ? this.cursos.length : 0, "cursos");
      
      // Guardar el valor seleccionado actual
      const valorSeleccionado = this.selector.value;
      
      // Limpiar selector completamente
      this.selector.innerHTML = '';
      
      // Agregar opción predeterminada
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
        mostrarMensaje('info', 'No hay cursos disponibles. Crea un curso primero.');
        return;
      }
      
      // Depuración para verificar los cursos
      console.log("Cursos disponibles para mostrar:", JSON.stringify(this.cursos));
      
      this.cursos.forEach(curso => {
        console.log("Añadiendo curso al selector:", curso.id, curso.nombre);
        const option = document.createElement("option");
        option.value = curso.id;
        option.textContent = curso.nombre;
        this.selector.appendChild(option);
      });
    
      // Restaurar el valor seleccionado si existe
      if (valorSeleccionado && [...this.selector.options].some(opt => opt.value === valorSeleccionado)) {
        this.selector.value = valorSeleccionado;
      }
    }
  
    // Método para renderizar la tabla de notas
    async renderTabla() {
      const cursoID = this.selector.value;
      console.log("Renderizando tabla para curso ID:", cursoID);
      
      // Obtener el curso más reciente de IndexedDB
      const curso = await buscarPorClave('cursos', cursoID);
      console.log("Curso obtenido:", curso);
      
      // Si no hay curso seleccionado o no existe
      if (!curso) {
          this.container.innerHTML = `<p>Curso no encontrado.</p>`;
          mostrarMensaje('error', 'No se pudo encontrar el curso seleccionado');
          return;
      }
      
      // CORRECCIÓN: Definir la variable info
      const info = this.querySelector("#cursoInfo");
      
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
                  <th>Parcial 1 (30%)</th>
                  <th>Parcial 2 (30%)</th>
                  <th>Parcial 3 (40%)</th>
                  <th>Nota Final</th>
              </tr>
          </thead>
          <tbody>
              ${curso.estudiantes.map(id => {
                  const est = this.estudiantes.find(e => e.id === id);
              
                  if (!est) return `
                      <tr>
                          <td colspan="8">Estudiante ID ${id} no encontrado</td>
                      </tr>
                  `;
      
                  // Obtener notas del estudiante (o inicializar si no existen)
                  const notasEst = curso.notas[id] || { parcial1: 0, parcial2: 0, parcial3: 0 };
                  
                  // Calcular nota final (ponderada)
                  const notaFinal = (notasEst.parcial1 * 0.3 + notasEst.parcial2 * 0.3 + notasEst.parcial3 * 0.4).toFixed(2);
                  
                  return `
                      <tr>
                          <td><img src="${est.foto}" alt="Foto de ${est.nombres}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;" /></td>
                          <td>${est.nombres} ${est.apellidos}</td>
                          <td>${est.id}</td>
                          <td>${est.email}</td>
                          <td>
                              <input type="number" min="0" max="5" step="0.1" 
                              value="${notasEst.parcial1}" 
                              data-est="${id}" 
                              data-tipo="parcial1" 
                              class="nota-input" />
                          </td>
                          <td>
                              <input type="number" min="0" max="5" step="0.1" 
                              value="${notasEst.parcial2}" 
                              data-est="${id}" 
                              data-tipo="parcial2" 
                              class="nota-input" />
                          </td>
                          <td>
                              <input type="number" min="0" max="5" step="0.1" 
                              value="${notasEst.parcial3}" 
                              data-est="${id}" 
                              data-tipo="parcial3" 
                              class="nota-input" />
                          </td>
                          <td class="nota-final">${notaFinal}</td>
                      </tr>
                  `;
              }).join('')}
          </tbody>
      `;

      // Agregar botón de guardar cambios
      const guardarBtn = document.createElement("button");
      guardarBtn.textContent = "Guardar Calificaciones";
      guardarBtn.className = "guardar-notas-btn";
      guardarBtn.style.marginTop = "20px";

      // Limpiar contenedor y agregar tabla y botón
      this.container.innerHTML = "";
      this.container.appendChild(tabla);
      this.container.appendChild(guardarBtn);

      // Manejar cambios en las notas
      tabla.querySelectorAll(".nota-input").forEach(input => {
          input.addEventListener("change", (e) => {
              const estId = e.target.dataset.est;
              const tipoNota = e.target.dataset.tipo;
              const valor = parseFloat(e.target.value);
              
              // Validar valores
              if (isNaN(valor) || valor < 0 || valor > 5) {
                  e.target.value = tipoNota === "parcial1" 
                      ? curso.notas[estId]?.parcial1 || 0 
                      : tipoNota === "parcial2" 
                          ? curso.notas[estId]?.parcial2 || 0 
                          : curso.notas[estId]?.parcial3 || 0;
                  
                  mostrarMensaje('error', 'La nota debe estar entre 0 y 5');
                  return;
              }
              
              // Inicializar nota del estudiante si no existe
              if (!curso.notas[estId]) {
                  curso.notas[estId] = { parcial1: 0, parcial2: 0, parcial3: 0 };
              }
              
              // Actualizar nota
              curso.notas[estId][tipoNota] = valor;
              
              // Actualizar la nota final en la fila
              const fila = e.target.closest("tr");
              const notasEst = curso.notas[estId];
              const notaFinal = (notasEst.parcial1 * 0.3 + notasEst.parcial2 * 0.3 + notasEst.parcial3 * 0.4).toFixed(2);
              fila.querySelector(".nota-final").textContent = notaFinal;
          });
      });

      // Manejar guardado de notas
      guardarBtn.addEventListener("click", async () => {
          try {
              // Actualizar el curso en IndexedDB
              await actualizarObjeto('cursos', curso);
              console.log('Calificaciones guardadas para curso:', curso.id);
              mostrarMensaje('exito', 'Calificaciones guardadas correctamente');
          } catch (error) {
              console.error("Error al guardar calificaciones:", error);
              mostrarMensaje('error', 'Error al guardar calificaciones: ' + error.message);
          }
      });
    }
}

// Esta línea debe estar DESPUÉS de la definición completa de la clase
customElements.define("course-grades", CourseGrades);