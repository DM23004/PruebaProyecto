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
            const index = tareas.findIndex(t => t.id == task.id);
            if (index !== -1) {
                // Actualizar existente
                tareas[index] = task;
            } else {
                // ¡AQUÍ ESTABA EL ERROR! Si trae ID pero no está en el array, es nueva.
                tareas.push(task);
            }
        } else {
            // Por si acaso llega sin ID
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
    }, // <-- Importante: esta coma separa las funciones

    // Eliminar Múltiples Tareas (NUEVO)
    deleteMultipleTasks: function(idsArray) {
        let tareas = this.getTasks();
        // Filtramos dejando solo las tareas cuyo ID NO esté en el arreglo de IDs a borrar
        tareas = tareas.filter(t => !idsArray.includes(t.id));
        this.saveTasks(tareas);
        return tareas;
    }
};