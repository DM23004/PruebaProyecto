document.addEventListener("DOMContentLoaded", () => {
    // 1. Cargar el menú
    cargarSidebar();

    // 2. Variables del DOM generales
    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    const selectAllCheckbox = document.getElementById('select-all-tasks');
    let selectedTaskIds = new Set(); // Guardará los IDs seleccionados
    const modalTitle = document.getElementById('modal-title');

    // Variables del Modal de Visualización
    const viewModal = document.getElementById('view-task-modal');
    const btnCloseView = document.getElementById('btn-close-view');
    const btnEditFromView = document.getElementById('btn-edit-from-view');
    let currentViewTaskId = null;
    
    // Variables del Calendario
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('calendar-month-year');
    const monthPicker = document.getElementById('month-picker'); 
    let navDate = new Date(); 

    // Variables de Filtros, Búsqueda, Ordenamiento y Paginación
    let currentPage = 1;
    const itemsPerPage = 15; 
    let dateSortOrder = 'desc'; // Por defecto, orden descendente

    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-select') || document.getElementById('filter-status');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterDateSingle = document.getElementById('filter-date');
    
    const thFecha = document.getElementById('th-fecha');
    const sortIcon = document.getElementById('sort-icon');
    
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('page-info');

    // === SISTEMA DE NOTIFICACIONES (TOASTS) ===
    window.showToast = function(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                     type === 'danger' ? '<i class="fas fa-trash-alt"></i>' : 
                     '<i class="fas fa-info-circle"></i>';
                     
        toast.innerHTML = `${icon} <span>${message}</span>`;
        container.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Quitar después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); 
        }, 3000);
    };

    // Escuchadores de Búsqueda, Filtros y Paginación
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderApp(); });
    if (filterStatus) filterStatus.addEventListener('change', () => { currentPage = 1; renderApp(); });
    if (filterDateStart) filterDateStart.addEventListener('change', () => { currentPage = 1; renderApp(); });
    if (filterDateEnd) filterDateEnd.addEventListener('change', () => { currentPage = 1; renderApp(); });
    if (filterDateSingle) filterDateSingle.addEventListener('change', () => { currentPage = 1; renderApp(); });
    
    // Escuchador para hacer clic en el encabezado de Fecha
    if (thFecha) {
        thFecha.addEventListener('click', () => {
            dateSortOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';
            if (dateSortOrder === 'asc') sortIcon.className = 'fas fa-sort-up';
            else sortIcon.className = 'fas fa-sort-down';
            
            currentPage = 1;
            renderApp();
        });
    }
    
    if (btnPrevPage) btnPrevPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderApp(); } });
    if (btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderApp(); });

    if (monthPicker) {
        monthPicker.addEventListener('change', (e) => {
            if (e.target.value) {
                const [year, month] = e.target.value.split('-');
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
        if (!calendarDays) return; 

        const year = navDate.getFullYear();
        const month = navDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        monthYearText.textContent = `${monthNames[month]} ${year}`;
        
        if (monthPicker) {
            const mesStr = (month + 1).toString().padStart(2, '0');
            monthPicker.value = `${year}-${mesStr}`;
        }
        
        calendarDays.innerHTML = ''; 

        const firstDay = new Date(year, month, 1).getDay(); 
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        const tareas = TaskManager.getTasks();

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day';
            emptyDiv.style.backgroundColor = 'transparent';
            emptyDiv.style.borderColor = 'transparent';
            calendarDays.appendChild(emptyDiv);
        }

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
                    viewTask(tarea.id);
                };
                
                dayDiv.appendChild(taskDiv);
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    const btnPrev = document.getElementById('prev-month');
    const btnNext = document.getElementById('next-month');
    if (btnPrev) btnPrev.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderCalendar(); });
    if (btnNext) btnNext.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderCalendar(); });


    // --- 4. RENDERIZAR TABLA, FILTROS, ORDENAMIENTO Y PAGINACIÓN ---
    function renderApp() {
        let tareas = TaskManager.getTasks();
        if (metricsWorker) metricsWorker.postMessage(tareas);

        if (tbody) {
            if (searchInput && searchInput.value.trim() !== '') {
                const term = searchInput.value.toLowerCase().trim();
                tareas = tareas.filter(t => 
                    (t.titulo && t.titulo.toLowerCase().includes(term)) ||
                    (t.id && t.id.toString().toLowerCase().includes(term))
                );
            }

            if (filterStatus && filterStatus.value !== 'all') {
                tareas = tareas.filter(t => t.estado === filterStatus.value);
            }

            if (filterDateStart && filterDateStart.value) tareas = tareas.filter(t => t.fecha >= filterDateStart.value);
            if (filterDateEnd && filterDateEnd.value) tareas = tareas.filter(t => t.fecha <= filterDateEnd.value);
            if (filterDateSingle && filterDateSingle.value) tareas = tareas.filter(t => t.fecha === filterDateSingle.value);

            // Ordenamiento por Fecha dinámico
            tareas.sort((a, b) => {
                const dateA = a.fecha || '';
                const dateB = b.fecha || '';
                if (dateSortOrder === 'asc') return dateA.localeCompare(dateB); 
                return dateB.localeCompare(dateA); 
            });

            const totalPages = Math.ceil(tareas.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedTasks = tareas.slice(startIdx, startIdx + itemsPerPage);

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

            tbody.innerHTML = '';
            if (paginatedTasks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-light);">No se encontraron tareas con estos filtros.</td></tr>`;
            } else {
                paginatedTasks.forEach(tarea => {
                    const statusClass = tarea.estado === 'pending' ? 'status-pending' : 'status-completed';
                    const statusText = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';

                    const isChecked = selectedTaskIds.has(tarea.id) ? 'checked' : '';
                    const tr = document.createElement('tr');
                    
                    const checkboxCol = selectAllCheckbox ? `
                        <td style="text-align: center;">
                            <input type="checkbox" class="task-checkbox" value="${tarea.id}" ${isChecked}>
                        </td>` : '';

                    // AQUÍ ESTÁ EL CAMBIO PARA EL ID COMPLETO: #${tarea.id} en vez de #${tarea.id.slice(-4)}
                    tr.innerHTML = `
                        ${checkboxCol}
                        <td>#${tarea.id}</td>
                        <td>${tarea.titulo}</td>
                        <td>${tarea.descripcion}</td>
                        <td><strong>${tarea.fecha || 'Sin fecha'}</strong></td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td class="action-btns">
                            <button class="btn-view" onclick="viewTask('${tarea.id}')" style="color: var(--primary-color);" title="Ver"><i class="fas fa-eye"></i></button>
                            <button class="btn-edit" onclick="editTask('${tarea.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete" onclick="deleteSingleTask('${tarea.id}')" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // --- NUEVA LÓGICA DE CHECKBOXES PARA EVITAR BUGS ---
                const checkboxes = document.querySelectorAll('.task-checkbox');
                
                // 1. Al hacer clic en un checkbox individual
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        if (e.target.checked) selectedTaskIds.add(e.target.value);
                        else selectedTaskIds.delete(e.target.value);
                        
                        updateDeleteButtonState();
                        updateSelectAllCheckboxState(checkboxes); // Validar si el maestro debe marcarse/desmarcarse
                    });
                });

                // 2. Validar el estado del maestro al cargar la página (por si cambias de pág y vuelves)
                updateSelectAllCheckboxState(checkboxes);
            }
        }

        renderCalendar();
    }

    // Función auxiliar para actualizar el Checkbox Maestro dependiendo de los individuales
    function updateSelectAllCheckboxState(checkboxes) {
        if (selectAllCheckbox && checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
        } else if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }

    // 5. Eventos de los Modales (Crear/Editar)
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
            
            const existingId = document.getElementById('task-id').value;
            const isEditing = !!existingId; 
            
            const newTask = {
                id: existingId || Date.now().toString(),
                titulo: document.getElementById('task-title').value,
                descripcion: document.getElementById('task-desc').value,
                fecha: document.getElementById('task-date').value, 
                estado: document.getElementById('task-status').value
            };
            
            TaskManager.saveTask(newTask);
            modal.style.display = "none";
            renderApp(); 
            
            if (isEditing) {
                showToast("Tarea actualizada correctamente.", "info");
            } else {
                showToast("Nueva tarea creada exitosamente.", "success");
            }
        });
    }

    // Función para mostrar/ocultar el botón de borrado masivo
    function updateDeleteButtonState() {
        if (btnDeleteSelected) {
            if (selectedTaskIds.size > 0) {
                btnDeleteSelected.style.display = 'inline-flex';
                btnDeleteSelected.innerHTML = `<i class="fas fa-trash-alt"></i> Eliminar (${selectedTaskIds.size})`;
            } else {
                btnDeleteSelected.style.display = 'none';
            }
        }
    }

    // Acción del Checkbox Maestro (Selecciona/Deselecciona SOLO los de la página visible)
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.task-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) selectedTaskIds.add(cb.value);
                else selectedTaskIds.delete(cb.value);
            });
            updateDeleteButtonState();
        });
    }

    // ==========================================
    // LÓGICA DEL MODAL DE ELIMINACIÓN CUSTOM
    // ==========================================
    let idsToDelete = []; 
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    window.deleteSingleTask = function(id) {
        idsToDelete = [id];
        if(deleteModalTitle) deleteModalTitle.textContent = "¿Eliminar Tarea?";
        if(deleteModalText) deleteModalText.textContent = "Esta acción es permanente. ¿Estás seguro?";
        if(deleteModal) deleteModal.style.display = 'flex';
    };

    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            idsToDelete = Array.from(selectedTaskIds);
            if(deleteModalTitle) deleteModalTitle.textContent = `¿Eliminar ${idsToDelete.length} Tareas?`;
            if(deleteModalText) deleteModalText.textContent = `Vas a eliminar permanentemente ${idsToDelete.length} tareas. ¿Estás seguro?`;
            if(deleteModal) deleteModal.style.display = 'flex';
        });
    }

    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            if(deleteModal) deleteModal.style.display = 'none';
            idsToDelete = [];
        });
    }

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', () => {
            if (idsToDelete.length > 0) {
                TaskManager.deleteMultipleTasks(idsToDelete);
                
                // Eliminamos los ids borrados de nuestro Set de selección actual
                idsToDelete.forEach(id => selectedTaskIds.delete(id));
                updateDeleteButtonState();
                
                renderApp(); 
                showToast(idsToDelete.length > 1 ? `${idsToDelete.length} tareas eliminadas.` : "La tarea ha sido eliminada.", "danger");
            }
            if(deleteModal) deleteModal.style.display = 'none';
            idsToDelete = [];
            if(selectAllCheckbox) selectAllCheckbox.checked = false;
        });
    }

    // ==========================================
    // LÓGICA DEL MODAL DE VISUALIZACIÓN DE TAREA
    // ==========================================
    
    window.viewTask = function(id) {
        const tarea = TaskManager.getTasks().find(t => t.id == id);
        if(tarea && viewModal) {
            currentViewTaskId = tarea.id;
            
            document.getElementById('view-task-title').textContent = tarea.titulo;
            document.getElementById('view-task-id').textContent = `#${tarea.id}`;
            document.getElementById('view-task-date').textContent = tarea.fecha || 'Sin fecha asignada';
            document.getElementById('view-task-desc').textContent = tarea.descripcion || 'Sin descripción...';
            
            const statusEl = document.getElementById('view-task-status');
            statusEl.textContent = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';
            statusEl.className = `status-badge ${tarea.estado === 'pending' ? 'status-pending' : 'status-completed'}`;
            
            viewModal.style.display = "flex";
        }
    };

    if(btnCloseView) {
        btnCloseView.addEventListener('click', () => {
            viewModal.style.display = "none";
            currentViewTaskId = null;
        });
    }

    if(btnEditFromView) {
        btnEditFromView.addEventListener('click', () => {
            viewModal.style.display = "none"; 
            editTask(currentViewTaskId); 
        });
    }

    window.editTask = function(id) {
        const tarea = TaskManager.getTasks().find(t => t.id == id);
        if(tarea) {
            document.getElementById('task-id').value = tarea.id;
            document.getElementById('task-title').value = tarea.titulo;
            document.getElementById('task-desc').value = tarea.descripcion;
            document.getElementById('task-date').value = tarea.fecha || ''; 
            document.getElementById('task-status').value = tarea.estado;
            if(modalTitle) modalTitle.textContent = "Editar Tarea";
            if(modal) modal.style.display = "flex";
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

        const path = window.location.pathname;
        if (path.includes('tareas.html')) document.getElementById('nav-tareas').parentElement.classList.add('active');
        else if (path.includes('calendario.html')) document.getElementById('nav-calendario').parentElement.classList.add('active');
        else if (path.includes('configuracion.html')) document.getElementById('nav-config').parentElement.classList.add('active');
        else document.getElementById('nav-dashboard').parentElement.classList.add('active');
    } catch (error) {
        console.error('Error cargando el sidebar:', error);
    }
}