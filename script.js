// Deklarasi variabel global
let map;
let chart;
let routeLayer;

// Inisialisasi peta saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi peta dengan koordinat default (dekat Tawangmangu)
  map = L.map('map').setView([-7.7956, 110.3680], 10);

  // Gunakan ArcGIS World Imagery (satelit) sebagai layer peta
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }).addTo(map);
});

// Fungsi untuk memperbarui nama file di label
function updateFileName() {
  const fileInput = document.getElementById('kmlFile');
  const fileNameLabel = document.getElementById('fileNameLabel');
  if (fileInput.files.length > 0) {
    fileNameLabel.textContent = fileInput.files[0].name;
  } else {
    fileNameLabel.textContent = '(NAMA FILE DI KML)';
  }
}

// Fungsi untuk memuat dan memproses file KML
function loadKML() {
  const fileInput = document.getElementById('kmlFile');
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        // Parsing file KML menjadi GeoJSON
        const kmlText = e.target.result;
        const kmlDoc = new DOMParser().parseFromString(kmlText, 'text/xml');
        const geojson = toGeoJSON.kml(kmlDoc);

        // Hapus layer sebelumnya dari peta
        map.eachLayer(layer => {
          if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        // Tambahkan rute dan marker ke peta
        routeLayer = L.geoJSON(geojson, {
          style: { color: '#FF0000', weight: 2 }, // Warna merah untuk jalur
          pointToLayer: function (feature, latlng) {
            const elevation = feature.geometry.coordinates[2] || 0;
            const popupContent = feature.properties.name || `Marker at ${latlng.lat}, ${latlng.lng}<br>Elevation: ${Math.round(elevation * 10) / 10} m`;
            const marker = L.marker(latlng).bindPopup(popupContent);
            marker.on('click', () => map.setView(latlng, 15)); // Zoom saat marker diklik
            return marker;
          }
        }).addTo(map);

        // Sesuaikan peta agar sesuai dengan batas layer
        map.fitBounds(routeLayer.getBounds());

        // Ekstrak koordinat dan elevasi dari jalur (LineString)
        const coordinates = [];
        geojson.features.forEach(feature => {
          if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach(coord => {
              const [lng, lat, alt] = coord;
              coordinates.push({ lat, lng, alt: alt || 0 });
            });
          }
        });

        // Hitung total panjang jalur dalam km
        let totalDistance = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
          const start = coordinates[i];
          const end = coordinates[i + 1];
          const d = map.distance([start.lat, start.lng], [end.lat, end.lng]) / 1000; // Jarak dalam km
          totalDistance += d;
        }
        totalDistance = Math.round(totalDistance * 10) / 10; // Bulatkan ke 1 desimal

        // Buat label sumbu X berdasarkan jarak kumulatif
        const cumulativeDistances = [];
        let cumulativeSum = 0;
        for (let i = 0; i < coordinates.length; i++) {
          if (i > 0) {
            const start = coordinates[i - 1];
            const end = coordinates[i];
            const d = map.distance([start.lat, start.lng], [end.lat, end.lng]) / 1000;
            cumulativeSum += d;
          }
          cumulativeDistances.push(Math.round(cumulativeSum * 10) / 10);
        }

        // Ambil data elevasi dari jalur
        const elevations = coordinates.map(c => c.alt);

        // Hapus grafik sebelumnya jika ada
        if (chart) chart.destroy();

        // Gambar grafik elevasi
        const ctx = document.getElementById('elevationChart').getContext('2d');
        chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: cumulativeDistances,
            datasets: [{
              label: 'Elevation (m)',
              data: elevations,
              borderColor: 'orange',
              backgroundColor: 'rgba(255, 165, 0, 0.2)', // Area di bawah garis
              fill: true,
              pointRadius: 0,
              pointHitRadius: 10,
            }]
          },
          options: {
            scales: {
              x: {
                title: { display: true, text: `Distance (Total: ${totalDistance} km)` },
                grid: { display: false }
              },
              y: {
                title: { display: true, text: 'Elevation (m)' },
                grid: { display: false }
              }
            },
            plugins: {
              tooltip: {
                enabled: true,
                mode: 'nearest',
                intersect: false,
                callbacks: {
                  label: function(context) {
                    const distance = context.label;
                    const elevation = context.raw;
                    return `${distance} km, ${elevation} m`;
                  }
                }
              }
            },
            hover: {
              mode: 'nearest',
              intersect: false
            },
            elements: {
              line: {
                tension: 0.1 // Membuat garis lebih halus
              }
            }
          }
        });
      } catch (error) {
        console.error('Error processing KML:', error);
        alert('Terjadi kesalahan saat memproses file KML. Silakan periksa format file atau konsol untuk detail.');
      }
    };
    reader.readAsText(file);
  }
}