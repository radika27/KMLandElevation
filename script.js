// Deklarasi variabel global
let map;
let chart;
let routeLayer;
let coordinates = []; // Untuk menyimpan semua koordinat dari KML
let tempMarker; // Marker sementara di peta
let cumulativeDistances = []; // Untuk menyimpan jarak kumulatif
let totalDistance = 0;

// Inisialisasi peta saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([-7.7956, 110.3680], 10);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }).addTo(map);
});

// Memicu dialog pemilihan file
function triggerFileInput() {
  document.getElementById('kmlFile').click();
}

// Memproses file KML yang dipilih
function processKML() {
  const fileInput = document.getElementById('kmlFile');
  const file = fileInput.files[0];

  if (!file || !file.name.endsWith('.kml')) {
    alert('Silakan pilih file KML yang valid.');
    fileInput.value = '';
    document.getElementById('fileNameLabel').textContent = '(NAMA FILE DI KML)';
    return;
  }

  console.log('Memulai pemrosesan file:', file.name);
  document.getElementById('fileNameLabel').textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const kmlText = e.target.result;
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

      // Ekstrak koordinat dan hitung data
      coordinates = []; // Reset koordinat
      const markers = []; // Untuk menyimpan data marker dari KML
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

      totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        totalDistance += map.distance([coordinates[i].lat, coordinates[i].lng], [coordinates[i + 1].lat, coordinates[i + 1].lng]) / 1000;
      }
      totalDistance = Math.round(totalDistance * 10) / 10;

      cumulativeDistances = [0];
      let cumulativeSum = 0;
      for (let i = 1; i < coordinates.length; i++) {
        cumulativeSum += map.distance([coordinates[i - 1].lat, coordinates[i - 1].lng], [coordinates[i].lat, coordinates[i].lng]) / 1000;
        cumulativeDistances.push(Math.round(cumulativeSum * 10) / 10);
      }

      const elevations = coordinates.map(c => c.alt);
      const maxElevation = Math.max(...elevations);
      const minElevation = Math.min(...elevations);
      const duration = (totalDistance / 0.58).toFixed(1);

      // Hitung kenaikan dan penurunan elevasi total
      let totalElevationGain = 0; // Naik
      let totalElevationLoss = 0; // Turun
      for (let i = 1; i < elevations.length; i++) {
        const elevationChange = elevations[i] - elevations[i - 1];
        if (elevationChange > 0) {
          totalElevationGain += elevationChange;
        } else if (elevationChange < 0) {
          totalElevationLoss += Math.abs(elevationChange);
        }
      }
      totalElevationGain = Math.round(totalElevationGain);
      totalElevationLoss = Math.round(totalElevationLoss);

      // Hitung kalori berdasarkan naik dan turun
      const caloriesPer100mGain = 10; // 10 kalori per 100m naik per km
      const caloriesPer100mLoss = 5;  // 5 kalori per 100m turun per km
      const gainCalories = (totalElevationGain / 100) * caloriesPer100mGain * totalDistance;
      const lossCalories = (totalElevationLoss / 100) * caloriesPer100mLoss * totalDistance;
      const totalCalories = Math.round(gainCalories + lossCalories);

      // Debug data
      console.log('Total Distance:', totalDistance);
      console.log('Total Elevation Gain:', totalElevationGain);
      console.log('Total Elevation Loss:', totalElevationLoss);
      console.log('Total Calories:', totalCalories);
      console.log('Cumulative Distances:', cumulativeDistances);
      console.log('Coordinates:', coordinates);
      console.log('Markers:', markers);

      // Perbarui statistik
      document.getElementById('elevation').textContent = `${maxElevation} Mdpl`;
      document.getElementById('distance').textContent = `${totalDistance} Km`;
      document.getElementById('duration').textContent = `${duration} Jam`;
      document.getElementById('calories').textContent = `${totalCalories} Kal`;

      // Hapus grafik sebelumnya
      if (chart) chart.destroy();

      // Hapus marker posisi sebelumnya
      document.querySelectorAll('.position-marker').forEach(marker => marker.remove());

      // Buat elemen marker kustom (untuk marker biru yang bergerak)
      let chartMarker = document.querySelector('.chart-marker');
      if (!chartMarker) {
        chartMarker = document.createElement('div');
        chartMarker.className = 'chart-marker';
        document.querySelector('.chart-section').appendChild(chartMarker);
      }

      // Buat grafik elevasi
      const ctx = document.getElementById('elevationChart').getContext('2d');
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: cumulativeDistances,
          datasets: [{
            label: 'Elevasi (m)',
            data: elevations,
            borderColor: '#FFA500',
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
            fill: true,
            pointRadius: 0,
            pointHitRadius: 10
          }]
        },
        options: {
          scales: {
            x: {
              title: { display: false },
              ticks: { display: false },
              grid: { display: false }
            },
            y: {
              title: { display: false },
              ticks: { display: false },
              grid: { display: false }
            }
          },
          plugins: {
            legend: {
              display: false // Nonaktifkan legenda (kotak kuning)
            },
            tooltip: {
              enabled: true,
              mode: 'nearest',
              intersect: false,
              callbacks: {
                title: function(tooltipItems) {
                  return `Jarak: ${tooltipItems[0].label} km`;
                },
                label: function(context) {
                  return `Elevasi: ${Math.round(context.raw)} meter`;
                },
                
              },
              titleFont: {
                size: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--chart-title-font-size')),
                weight: getComputedStyle(document.documentElement).getPropertyValue('--chart-title-font-weight'),
                family: getComputedStyle(document.documentElement).getPropertyValue('--chart-font-family')
              },
              bodyFont: {
                size: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--chart-font-size')),
                family: getComputedStyle(document.documentElement).getPropertyValue('--chart-font-family')
              },
              backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-bg'),
              titleColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-text'),
              bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-text')
            }
          },
          hover: { mode: 'nearest', intersect: false },
          elements: { line: { tension: 0.1 } }
        }
      });

      // Tambahkan marker berdasarkan jarak dari markers KML
      const chartArea = chart.chartArea;
      const chartWidth = chartArea.right - chartArea.left;

      markers.forEach(marker => {
        // Cari jarak terdekat dari cumulativeDistances
        let minDistanceDiff = Infinity;
        let closestIndex = 0;
        cumulativeDistances.forEach((dist, index) => {
          const diff = Math.abs(dist - (map.distance([coordinates[0].lat, coordinates[0].lng], [marker.lat, marker.lng]) / 1000));
          if (diff < minDistanceDiff) {
            minDistanceDiff = diff;
            closestIndex = index;
          }
        });

        if (closestIndex >= 0 && closestIndex < coordinates.length) {
          const percentage = closestIndex / (coordinates.length - 1);
          const xPos = chartArea.left + (percentage * chartWidth);

          const markerElement = document.createElement('div');
          markerElement.className = 'position-marker';
          markerElement.style.left = `${xPos}px`;
          markerElement.title = `${marker.name}: Jarak ${cumulativeDistances[closestIndex].toFixed(1)} km, Elevasi ${Math.round(marker.alt)} m`;

          markerElement.addEventListener('click', () => {
            const coord = coordinates[closestIndex];
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker([coord.lat, coord.lng], {
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              })
            }).addTo(map);
            map.setView([coord.lat, coord.lng], 15);
            document.getElementById('elevationValue').textContent = `${Math.round(coord.alt)} m`;
            document.getElementById('distanceValue').textContent = `${cumulativeDistances[closestIndex].toFixed(1)} km`;
            chartMarker.style.left = `${xPos}px`;
          });

          document.querySelector('.chart-section').appendChild(markerElement);
        }
      });

      // Tambahkan event listener untuk interaksi marker biru yang bergerak
      const canvas = document.getElementById('elevationChart');
      let isDragging = false;

      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateMarkerPosition(e);
      });

      canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
          updateMarkerPosition(e);
        }
      });

      canvas.addEventListener('mouseup', () => {
        isDragging = false;
      });

      canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        chartMarker.style.left = '0px'; // Reset posisi marker saat kursor keluar
        if (tempMarker) map.removeLayer(tempMarker);
        document.getElementById('elevationValue').textContent = '0 m';
        document.getElementById('distanceValue').textContent = '0 km';
      });

      function updateMarkerPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; // Posisi X relatif terhadap canvas
        const chartArea = chart.chartArea;
        const chartWidth = chartArea.right - chartArea.left;

        // Pastikan X berada dalam batas chart
        const boundedX = Math.max(chartArea.left, Math.min(x, chartArea.right));
        const percentage = (boundedX - chartArea.left) / chartWidth;
        const index = Math.round(percentage * (coordinates.length - 1));

        // Pastikan indeks valid
        if (index >= 0 && index < coordinates.length) {
          const coord = coordinates[index];
          const distance = cumulativeDistances[index];

          // Perbarui posisi marker di grafik
          chartMarker.style.left = `${boundedX}px`;

          // Perbarui marker di peta
          if (tempMarker) map.removeLayer(tempMarker);
          tempMarker = L.marker([coord.lat, coord.lng], {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          }).addTo(map);
          map.setView([coord.lat, coord.lng], 15);

          // Perbarui teks jarak dan elevasi
          document.getElementById('elevationValue').textContent = `${Math.round(coord.alt)} m`;
          document.getElementById('distanceValue').textContent = `${distance.toFixed(1)} km`;

          console.log('Index:', index, 'Distance:', distance, 'Elevation:', coord.alt);
        }
      }

      console.log('Pemrosesan selesai:', file.name);
    } catch (error) {
      console.error('Error memproses KML:', error);
      alert('Gagal memproses file KML. Pastikan formatnya benar. Lihat konsol untuk detail.');
      document.getElementById('fileNameLabel').textContent = '(NAMA FILE DI KML)';
    }
  };
  reader.readAsText(file);
}