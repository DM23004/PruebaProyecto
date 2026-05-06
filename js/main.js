document.addEventListener("DOMContentLoaded", () => {
    // 1. Cargar el menú
    cargarSidebar();

    // 2. Variables del DOM generales
    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalTitle = document.getElementById('modal-title');
    
    // Variables del Calendario
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('calendar-month-year');
    const monthPicker = document.getElementById('month-picker'); // Input oculto de mes
    let navDate = new Date(); 

    // Variables de Filtros y Paginación (Tabla)
    let currentPage = 1;
    const itemsPerPage = 10;
    const filterDate = document.getElementById('filter-date');
    const filterStatus = document.getElementById('filter-status');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('page-info');

    // Escuchadores de Filtros y Paginación
    if (filterDate) filterDate.addEventListener('change', () => { currentPage = 1; renderApp(); });
    if (filterStatus) filterStatus.addEventListener('change', () => { currentPage = 1; renderApp(); });
    if (btnPrevPage) btnPrevPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderApp(); } });
    if (btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderApp(); });

    // Escuchador del Selector de Mes (Centro del Calendario)
    if (monthPicker) {
        monthPicker.addEventListener('change', (e) => {
            if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                // Ajustamos la fecha de navegación al mes seleccionado
                navDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
                renderCalendar();
            }
        });
    }

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
        if (!calendarDays) return; // Solo ejecutar si existe el calendario

        const year = navDate.getFullYear();
        const month = navDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Actualizar título visual
        monthYearText.textContent = `${monthNames[month]} ${year}`;
        
        // Sincronizar el input oculto (month-picker) con el texto
        if (monthPicker) {
            const mesStr = (month + 1).toString().padStart(2, '0');
            monthPicker.value = `${year}-${mesStr}`;
        }
        
        calendarDays.innerHTML = ''; 

        // Cálculos del mes
        const firstDay = new Date(year, month, 1).getDay(); 
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        const tareas = TaskManager.getTasks();

        // 1. Cajas vacías antes del día 1
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day';
            emptyDiv.style.backgroundColor = 'transparent';
            emptyDiv.style.borderColor = 'transparent';
            calendarDays.appendChild(emptyDiv);
        }

        // 2. Días reales
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const diaStr = i.toString().padStart(2, '0');
            const mesStr = (month + 1).toString().padStart(2, '0');
            const dateStr = `${year}-${mesStr}-${diaStr}`;

            dayDiv.innerHTML = `<span class="day-number">${i}</span>`;

            const tareasDelDia = tareas.filter(t => t.fecha === dateStr);
            
            tareasDelDia.forEach(tarea => {
                const statusClass = tarea.estado === 'completed' ? 'completed' : '';
                const icon = tarea.estado === 'completed' ? 'fa-check' : 'fa-circle-notch';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = `cal-task ${statusClass}`;
                taskDiv.innerHTML = `<i class="fas ${icon}"></i> ${tarea.titulo}`;
                taskDiv.title = tarea.descripcion; 
                
                taskDiv.onclick = (e) => {
                    e.stopPropagation(); 
                    editTask(tarea.id);
                };
                
                dayDiv.appendChild(taskDiv);
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    // Botones laterales del Calendario
    const btnPrev = document.getElementById('prev-month');
    const btnNext = document.getElementById('next-month');
    if (btnPrev) btnPrev.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderCalendar(); });
    if (btnNext) btnNext.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderCalendar(); });


    // --- 4. RENDERIZAR TABLA, FILTROS Y PAGINACIÓN ---
    function renderApp() {
        let tareas = TaskManager.getTasks();
        if (metricsWorker) metricsWorker.postMessage(tareas);

        if (tbody) {
            // Aplicar Filtros primero
            if (filterStatus && filterStatus.value !== 'all') {
                tareas = tareas.filter(t => t.estado === filterStatus.value);
            }
            if (filterDate && filterDate.value) {
                tareas = tareas.filter(t => t.fecha === filterDate.value);
            }

            // Calcular Paginación (10 registros)
            const totalPages = Math.ceil(tareas.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedTasks = tareas.slice(startIdx, startIdx + itemsPerPage);

            // Actualizar botones de paginación visualmente
            if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            if (btnPrevPage) {
                btnPrevPage.disabled = currentPage === 1;
                btnPrevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
                btnPrevPage.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
            }
            if (btnNextPage) {
                btnNextPage.disabled = currentPage === totalPages;
                btnNextPage.style.opacity = currentPage === totalPages ? '0.5' : '1';
                btnNextPage.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
            }

            // Dibujar las filas
            tbody.innerHTML = '';
            if (paginatedTasks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-light);">No se encontraron tareas.</td></tr>`;
            } else {
                paginatedTasks.forEach(tarea => {
                    const statusClass = tarea.estado === 'pending' ? 'status-pending' : 'status-completed';
                    const statusText = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#${tarea.id.slice(-4)}</td>
                        <td>${tarea.titulo}</td>
                        <td>${tarea.descripcion}</td>
                        <td><strong>${tarea.fecha || 'Sin fecha'}</strong></td>
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
                fecha: document.getElementById('task-date').value, 
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
            document.getElementById('task-date').value = tarea.fecha || ''; 
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