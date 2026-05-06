document.addEventListener("DOMContentLoaded", () => {
    // 1. Cargar el menú
    cargarSidebar();

    // 2. Variables del DOM
    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalTitle = document.getElementById('modal-title');
    
    // Variables del Calendario
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('calendar-month-year');
    let navDate = new Date(); // Fecha actual para navegar meses

    // 3. Inicializar el Web Worker
    let metricsWorker;
    if (window.Worker) {
        metricsWorker = new Worker('js/worker.js');
        metricsWorker.onmessage = function(e) {
            const elTotal = document.getElementById('metric-total');
            if(elTotal) elTotal.textContent = e.data.total;
            const elComp = document.getElementById('metric-completed');
            if(elComp) elComp.textContent = e.data.completadas;
            const elPend = document.getElementById('metric-pending');
            if(elPend) elPend.textContent = e.data.pendientes;
        };
    }

    // --- FUNCIÓN PARA DIBUJAR EL CALENDARIO ---
    function renderCalendar() {
        if (!calendarDays) return; // Solo ejecutar si estamos en la vista de calendario

        const year = navDate.getFullYear();
        const month = navDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Actualizar título (Ej. Mayo 2026)
        monthYearText.textContent = `${monthNames[month]} ${year}`;
        calendarDays.innerHTML = ''; // Limpiar grilla

        // Cálculos del mes
        const firstDay = new Date(year, month, 1).getDay(); // Día de la semana que inicia el mes
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // Total de días del mes

        const tareas = TaskManager.getTasks();

        // 1. Agregar cajas vacías antes del día 1
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day';
            emptyDiv.style.backgroundColor = 'transparent';
            emptyDiv.style.borderColor = 'transparent';
            calendarDays.appendChild(emptyDiv);
        }

        // 2. Dibujar los días reales del mes
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            // Formatear la fecha como YYYY-MM-DD para compararla con el Input de Fecha
            const diaStr = i.toString().padStart(2, '0');
            const mesStr = (month + 1).toString().padStart(2, '0');
            const dateStr = `${year}-${mesStr}-${diaStr}`;

            dayDiv.innerHTML = `<span class="day-number">${i}</span>`;

            // 3. Buscar y agregar las tareas que pertenecen a este día
            const tareasDelDia = tareas.filter(t => t.fecha === dateStr);
            
            tareasDelDia.forEach(tarea => {
                const statusClass = tarea.estado === 'completed' ? 'completed' : '';
                const icon = tarea.estado === 'completed' ? 'fa-check' : 'fa-circle-notch';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = `cal-task ${statusClass}`;
                taskDiv.innerHTML = `<i class="fas ${icon}"></i> ${tarea.titulo}`;
                taskDiv.title = tarea.descripcion; // Mostrar descripción al pasar el mouse
                
                // Permitir editar la tarea haciendo clic en ella desde el calendario
                taskDiv.onclick = (e) => {
                    e.stopPropagation(); // Evitar comportamientos raros
                    editTask(tarea.id);
                };
                
                dayDiv.appendChild(taskDiv);
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    // Botones de Anterior/Siguiente mes en el calendario
    const btnPrev = document.getElementById('prev-month');
    const btnNext = document.getElementById('next-month');
    if (btnPrev) btnPrev.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderCalendar(); });
    if (btnNext) btnNext.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderCalendar(); });


    // 4. Renderizar la aplicación principal (Tabla y Métricas)
    function renderApp() {
        const tareas = TaskManager.getTasks();
        if (metricsWorker) metricsWorker.postMessage(tareas);

        // Renderizar la tabla si estamos en la vista de Mis Tareas
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

        // Siempre que haya un cambio, actualizamos el calendario (si estamos en esa vista)
        renderCalendar();
    }

    // 5. Eventos del Modal
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
                fecha: document.getElementById('task-date').value, // Guardamos la fecha
                estado: document.getElementById('task-status').value
            };
            TaskManager.saveTask(newTask);
            modal.style.display = "none";
            renderApp(); 
            if(!tbody && !calendarDays) alert("Tarea guardada exitosamente.");
        });
    }

    // Funciones globales (Ventanas Modales y CRUD)
    window.deleteTask = function(id) {
        if(confirm("¿Seguro que deseas eliminar esta tarea?")) {
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
            document.getElementById('task-date').value = tarea.fecha || ''; // Cargamos la fecha
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
        const response = await fetch('./components/sidebar.html');
        if (!response.ok) throw new Error(`No se pudo encontrar el archivo: ${response.status}`);
        
        const html = await response.text();
        document.getElementById('sidebar-container').innerHTML = html;

        // Resaltar la pestaña activa
        const path = window.location.pathname;
        if (path.includes('tareas.html')) document.getElementById('nav-tareas').parentElement.classList.add('active');
        else if (path.includes('calendario.html')) document.getElementById('nav-calendario').parentElement.classList.add('active');
        else if (path.includes('configuracion.html')) document.getElementById('nav-config').parentElement.classList.add('active');
        else document.getElementById('nav-dashboard').parentElement.classList.add('active');
    } catch (error) {
        console.error('Error cargando el sidebar:', error);
    }
}