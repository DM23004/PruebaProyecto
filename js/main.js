// js/main.js
document.addEventListener("DOMContentLoaded", () => {
    // Variables del DOM
    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalTitle = document.getElementById('modal-title');
    
    // Inicializar el Web Worker
    let metricsWorker;
    if (window.Worker) {
        metricsWorker = new Worker('js/worker.js');
        
        // Recibir datos del Worker
        metricsWorker.onmessage = function(e) {
            document.getElementById('metric-total').textContent = e.data.total;
            document.getElementById('metric-completed').textContent = e.data.completadas;
            document.getElementById('metric-pending').textContent = e.data.pendientes;
        };
    } else {
        console.error("Tu navegador no soporta Web Workers.");
    }

    // Función para renderizar la tabla y actualizar métricas
    function renderApp() {
        const tareas = TaskManager.getTasks();
        
        // 1. Enviar datos al Worker para las métricas
        if (metricsWorker) {
            metricsWorker.postMessage(tareas);
        }

        // 2. Dibujar la tabla
        tbody.innerHTML = '';
        tareas.forEach(tarea => {
            const tr = document.createElement('tr');
            
            // Asignar clases visuales dependiendo del estado
            const statusClass = tarea.estado === 'pending' ? 'status-pending' : 'status-completed';
            const statusText = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';

            tr.innerHTML = `
                <td>#${tarea.id.slice(-4)}</td>
                <td>${tarea.titulo}</td>
                <td>${tarea.descripcion}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="action-btns">
                    <button class="btn-edit" onclick="editTask('${tarea.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteTask('${tarea.id}')" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Funciones del Modal
    btnOpenModal.addEventListener('click', () => {
        taskForm.reset();
        document.getElementById('task-id').value = '';
        modalTitle.textContent = "Agregar Nueva Tarea";
        modal.style.display = "flex";
    });

    btnCloseModal.addEventListener('click', () => {
        modal.style.display = "none";
    });

    // Guardar Tarea (Submit del Formulario)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newTask = {
            id: document.getElementById('task-id').value, // Estará vacío si es nueva
            titulo: document.getElementById('task-title').value,
            descripcion: document.getElementById('task-desc').value,
            estado: document.getElementById('task-status').value
        };

        TaskManager.saveTask(newTask);
        modal.style.display = "none";
        renderApp(); // Volver a dibujar
    });

    // Exponer funciones al scope global para que los botones onclick funcionen
    window.deleteTask = function(id) {
        if(confirm("¿Estás seguro de eliminar esta tarea?")) {
            TaskManager.deleteTask(id);
            renderApp();
        }
    };

    window.editTask = function(id) {
        const tareas = TaskManager.getTasks();
        const tarea = tareas.find(t => t.id == id);
        
        if(tarea) {
            document.getElementById('task-id').value = tarea.id;
            document.getElementById('task-title').value = tarea.titulo;
            document.getElementById('task-desc').value = tarea.descripcion;
            document.getElementById('task-status').value = tarea.estado;
            
            modalTitle.textContent = "Editar Tarea";
            modal.style.display = "flex";
        }
    };

    // Renderizado inicial al cargar la página
    renderApp();
});