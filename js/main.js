document.addEventListener("DOMContentLoaded", () => {
    // 1. CARGAR EL PANEL LATERAL DINÁMICAMENTE
    cargarSidebar();

    // 2. Variables del DOM (Comprobamos si existen en la página actual)
    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalTitle = document.getElementById('modal-title');
    
    // 3. Inicializar el Web Worker
    let metricsWorker;
    if (window.Worker) {
        metricsWorker = new Worker('js/worker.js');
        metricsWorker.onmessage = function(e) {
            // Solo actualiza si los elementos existen en la página actual (ej. index.html)
            const elTotal = document.getElementById('metric-total');
            if(elTotal) elTotal.textContent = e.data.total;
            
            const elComp = document.getElementById('metric-completed');
            if(elComp) elComp.textContent = e.data.completadas;
            
            const elPend = document.getElementById('metric-pending');
            if(elPend) elPend.textContent = e.data.pendientes;
        };
    }

    // 4. Renderizar la aplicación
    function renderApp() {
        const tareas = TaskManager.getTasks();
        if (metricsWorker) metricsWorker.postMessage(tareas);

        // Solo dibuja la tabla si estamos en tareas.html
        if (tbody) {
            tbody.innerHTML = '';
            tareas.forEach(tarea => {
                const tr = document.createElement('tr');
                const statusClass = tarea.estado === 'pending' ? 'status-pending' : 'status-completed';
                const statusText = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';

                tr.innerHTML = `
                    <td>#${tarea.id.slice(-4)}</td>
                    <td>${tarea.titulo}</td>
                    <td>${tarea.descripcion}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editTask('${tarea.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="deleteTask('${tarea.id}')"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // 5. Eventos del Modal (Si existe el botón en la página)
    if(btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            taskForm.reset();
            document.getElementById('task-id').value = '';
            modalTitle.textContent = "Agregar Nueva Tarea";
            modal.style.display = "flex";
        });
    }

    if(btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            modal.style.display = "none";
        });
    }

    if(taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTask = {
                id: document.getElementById('task-id').value,
                titulo: document.getElementById('task-title').value,
                descripcion: document.getElementById('task-desc').value,
                estado: document.getElementById('task-status').value
            };
            TaskManager.saveTask(newTask);
            modal.style.display = "none";
            renderApp(); 
            // Si estamos en el index y creamos una tarea, redirigimos o solo dejamos que el worker actualice
            if(!tbody) alert("Tarea guardada. Ve a 'Mis Tareas' para verla.");
        });
    }

    // Funciones globales
    window.deleteTask = function(id) {
        if(confirm("¿Eliminar esta tarea?")) {
            TaskManager.deleteTask(id);
            renderApp();
        }
    };

    window.editTask = function(id) {
        const tarea = TaskManager.getTasks().find(t => t.id == id);
        if(tarea) {
            document.getElementById('task-id').value = tarea.id;
            document.getElementById('task-title').value = tarea.titulo;
            document.getElementById('task-desc').value = tarea.descripcion;
            document.getElementById('task-status').value = tarea.estado;
            modalTitle.textContent = "Editar Tarea";
            modal.style.display = "flex";
        }
    };

    renderApp();
});

// Función para inyectar el HTML del panel lateral
async function cargarSidebar() {
    try {
        // MUY IMPORTANTE: Usar ./ para que GitHub encuentre la ruta
        const response = await fetch('./components/sidebar.html');
        
        if (!response.ok) {
            throw new Error(`No se pudo encontrar el archivo: ${response.status}`);
        }
        
        const html = await response.text();
        document.getElementById('sidebar-container').innerHTML = html;

        // Resaltar la página en la que estamos actualmente
        const path = window.location.pathname;
        if (path.includes('tareas.html')) {
            document.getElementById('nav-tareas').parentElement.classList.add('active');
        } else if (path.includes('calendario.html')) {
            document.getElementById('nav-calendario').parentElement.classList.add('active');
        } else if (path.includes('configuracion.html')) {
            document.getElementById('nav-config').parentElement.classList.add('active');
        } else {
            // Por defecto estamos en el Dashboard
            document.getElementById('nav-dashboard').parentElement.classList.add('active');
        }
    } catch (error) {
        console.error('Error cargando el sidebar:', error);
        document.getElementById('sidebar-container').innerHTML = '<h3 style="color:white; padding:20px;">Menú no encontrado</h3>';
    }
}