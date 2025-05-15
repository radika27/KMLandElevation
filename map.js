// Deklarasi variabel global
let map;
let routeLayer;
let tempMarker;
let coordinates = []; // Untuk menyimpan semua koordinat dari KML

// Inisialisasi peta saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([-7.7956, 110.3680], 10);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }).addTo(map);
});

// Fungsi untuk memproses KML dan menambahkan layer ke peta
function processKMLMap(kmlText) {
  try {
    const kmlDoc = new DOMParser().parseFromString(kmlText, 'text/xml');
    const geojson = toGeoJSON.kml(kmlDoc);

    // Hapus layer sebelumnya
    map.eachLayer(layer => {
      if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Tambahkan rute dan marker
    routeLayer = L.geoJSON(geojson, {
      style: { color: '#FFA500', weight: 3 },
      pointToLayer: (feature, latlng) => {
        const elevation = feature.geometry.coordinates[2] || 0;
        const popupContent = feature.properties.name || `Titik: ${latlng.lat}, ${latlng.lng}<br>Elevasi: ${Math.round(elevation * 10) / 10} m`;
        let icon;
        if (feature.properties && feature.properties.name === 'Tawangmangu') {
          icon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41] });
        } else {
          icon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
        }
        const marker = L.marker(latlng, { icon }).bindPopup(popupContent);
        marker.on('click', () => map.setView(latlng, 15));
        return marker;
      }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds());

    // Ekstrak koordinat dari KML
    coordinates = []; // Reset koordinat
    const markers = [];
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        feature.geometry.coordinates.forEach(coord => {
          const [lng, lat, alt] = coord;
          coordinates.push({ lat, lng, alt: alt || 0 });
        });
      } else if (feature.geometry.type === 'Point' && feature.properties) {
        const [lng, lat, alt] = feature.geometry.coordinates;
        markers.push({
          lat: lat,
          lng: lng,
          alt: alt || 0,
          name: feature.properties.name || `Posisi ${markers.length + 1}`
        });
      }
    });

    // Kirim data koordinat ke fungsi chart
    return { coordinates, markers };
  } catch (error) {
    console.error('Error memproses KML:', error);
    throw error; // Lempar error untuk ditangani di chart.js
  }
}

// Fungsi untuk memperbarui marker sementara di peta
function updateTempMarker(coord) {
  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker([coord.lat, coord.lng], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
  }).addTo(map);
  map.setView([coord.lat, coord.lng], 15);
}