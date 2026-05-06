// js/crud.js

// Funciones para manejar LocalStorage
const TaskManager = {
    // Clave para guardar en LocalStorage
    storageKey: 'mis_tareas',

    // Leer tareas
    getTasks: function() {
        try {
            const tareasStr = localStorage.getItem(this.storageKey);
            return tareasStr ? JSON.parse(tareasStr) : [];
        } catch (error) {
            console.error("Error al leer tareas del LocalStorage:", error);
            return [];
        }
    },

    // Guardar tareas
    saveTasks: function(tareas) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(tareas));
        } catch (error) {
            console.error("Error al guardar tareas en LocalStorage:", error);
            alert("Hubo un error al intentar guardar la tarea.");
        }
    },

    // Crear o Actualizar
    saveTask: function(task) {
        const tareas = this.getTasks();
        
        if (task.id) {
            // Actualizar existente
            const index = tareas.findIndex(t => t.id == task.id);
            if (index !== -1) {
                tareas[index] = task;
            }
        } else {
            // Crear nueva (Generar ID simple usando timestamp)
            task.id = Date.now().toString();
            tareas.push(task);
        }
        
        this.saveTasks(tareas);
        return tareas; // Devolvemos el array actualizado
    },

    // Eliminar
    deleteTask: function(id) {
        let tareas = this.getTasks();
        tareas = tareas.filter(t => t.id != id);
        this.saveTasks(tareas);
        return tareas;
    }
};