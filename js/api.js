// js/api.js
document.addEventListener("DOMContentLoaded", () => {
    const locationElement = document.getElementById('api-location');

    function obtenerUbicacionClima() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        // API gratuita para convertir coordenadas a ciudad
                        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`;
                        
                        const response = await fetch(url);
                        if (!response.ok) throw new Error("Error en la respuesta de la API");
                        
                        const data = await response.json();
                        const ciudad = data.city || data.locality || "Ciudad desconocida";
                        
                        locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${ciudad}, ${data.countryCode}`;
                    } catch (error) {
                        console.error("Error al obtener la ciudad:", error);
                        locationElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ubicación no disponible`;
                    }
                },
                (error) => {
                    console.warn("Geolocalización denegada o fallida.");
                    locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> Modo Offline`;
                }
            );
        } else {
            locationElement.innerHTML = `<i class="fas fa-ban"></i> Geo no soportada`;
        }
    }

    obtenerUbicacionClima();
});