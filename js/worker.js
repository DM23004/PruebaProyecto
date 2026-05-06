// js/worker.js

// Escuchamos los mensajes enviados desde el hilo principal (main.js)
self.onmessage = function(event) {
    const tareas = event.data;
    
    // Procesamiento de métricas
    const metricas = {
        total: tareas.length,
        completadas: 0,
        pendientes: 0
    };

    tareas.forEach(tarea => {
        if (tarea.estado === 'completed') {
            metricas.completadas++;
        } else if (tarea.estado === 'pending') {
            metricas.pendientes++;
        }
    });

    // Simulamos un ligero retraso de carga pesado (opcional, para demostrar el worker)
    // En la vida real, los workers se usan para miles de registros.
    
    // Devolvemos los resultados al hilo principal
    self.postMessage(metricas);
};