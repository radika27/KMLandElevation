// Deklarasi variabel global
let chart;
let cumulativeDistances = [];
let totalDistance = 0;

// Memicu dialog pemilihan file
function triggerFileInput() {
  document.getElementById('kmlFile').click();
}

// Memproses file KML dan menangani chart serta statistik
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
      const { coordinates, markers } = processKMLMap(kmlText); // Panggil fungsi dari map.js

      // Hitung jarak total
      totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        totalDistance += map.distance([coordinates[i].lat, coordinates[i].lng], [coordinates[i + 1].lat, coordinates[i + 1].lng]) / 1000;
      }
      totalDistance = Math.round(totalDistance * 10) / 10;

      // Hitung jarak kumulatif
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
      let totalElevationGain = 0;
      let totalElevationLoss = 0;
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

      // Hitung kalori
      const caloriesPer100mGain = 10;
      const caloriesPer100mLoss = 5;
      const gainCalories = (totalElevationGain / 100) * caloriesPer100mGain * totalDistance;
      const lossCalories = (totalElevationLoss / 100) * caloriesPer100mLoss * totalDistance;
      const totalCalories = Math.round(gainCalories + lossCalories);

      // Perbarui statistik
      document.getElementById('elevation').textContent = `${maxElevation} Mdpl`;
      document.getElementById('distance').textContent = `${totalDistance} Km`;
      document.getElementById('duration').textContent = `${duration} Jam`;
      document.getElementById('calories').textContent = `${totalCalories} Kal`;

      // Hapus grafik sebelumnya
      if (chart) chart.destroy();

      // Hapus marker posisi sebelumnya
      document.querySelectorAll('.position-marker').forEach(marker => marker.remove());

      // Buat elemen marker kustom (sekarang berbentuk titik dengan posisi dinamis)
        let chartMarker = document.querySelector('.chart-marker');
        if (!chartMarker) {
          chartMarker = document.createElement('div');
          chartMarker.className = 'chart-marker';
          chartMarker.style.backgroundColor = 'red';
                  chartMarker.style.borderRadius = '50%';
          chartMarker.style.position = 'absolute';
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
            x: { title: { display: false }, ticks: { display: false }, grid: { display: false } },
            y: { title: { display: false }, ticks: { display: false }, grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: false, // false untuk mati true untuk hidupkan tooltip
              mode: 'nearest',
              intersect: false,
              callbacks: {
                title: tooltipItems => `Jarak: ${tooltipItems[0].label} km`,
                label: context => `Elevasi: ${Math.round(context.raw)} meter`
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
            updateTempMarker(coord);
            document.getElementById('elevationValue').textContent = `${Math.floor(coord.alt)} m`;
            document.getElementById('distanceValue').textContent = `${cumulativeDistances[closestIndex].toFixed(1)} km`;
            chartMarker.style.left = `${xPos}px`;
          });

          document.querySelector('.chart-section').appendChild(markerElement);
        }
      });

      let isPositionLocked = false;
let lockedIndex = 0;

// Event listener untuk hover (mousemove)
const canvas = document.getElementById('elevationChart');
canvas.addEventListener('mousemove', (e) => {
  if (!isPositionLocked) {
    updateMarkerPosition(e);
  }
});

// Event listener untuk toggle penguncian posisi (klik)
canvas.addEventListener('click', (e) => {
  isPositionLocked = !isPositionLocked;
  if (isPositionLocked) {
    updateMarkerPosition(e);
    lockedIndex = Math.round((e.clientX - canvas.getBoundingClientRect().left - chart.chartArea.left) / (chart.chartArea.right - chart.chartArea.left) * (coordinates.length - 1));
  }
});

// Event listener untuk saat mouse keluar
canvas.addEventListener('mouseleave', () => {
  if (isPositionLocked) {
    const coord = coordinates[lockedIndex];
    const distance = cumulativeDistances[lockedIndex];
    const chartArea = chart.chartArea;
    const chartWidth = chartArea.right - chartArea.left;
    const percentageX = lockedIndex / (coordinates.length - 1);
    const xPos = chartArea.left + (percentageX * chartWidth);
    const yPos = chart.scales.y.getPixelForValue(coord.alt); // Gunakan skala y dari Chart.js
    chartMarker.style.left = `${xPos}px`;
    chartMarker.style.top = `${yPos}px`;

    updateTempMarker(coord);
    document.getElementById('elevationValue').textContent = `Elevasi: ${Math.floor(coord.alt)} mdpl`;
    document.getElementById('distanceValue').textContent = `Jarak: ${distance.toFixed(1)} km`;
  } else {
    chartMarker.style.left = '0px';
    chartMarker.style.top = '50%';
    if (tempMarker) map.removeLayer(tempMarker);
    document.getElementById('elevationValue').textContent = '0 m';
    document.getElementById('distanceValue').textContent = '0 km';
  }
});

// Fungsi untuk memperbarui posisi marker
function updateMarkerPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const chartArea = chart.chartArea;
  const chartWidth = chartArea.right - chartArea.left;

  const boundedX = Math.max(chartArea.left, Math.min(x, chartArea.right));
  const percentageX = (boundedX - chartArea.left) / chartWidth;
  const index = Math.round(percentageX * (coordinates.length - 1));

  if (index >= 0 && index < coordinates.length) {
    const coord = coordinates[index];
    const distance = cumulativeDistances[index];

    // Gunakan skala y dari Chart.js untuk posisi vertikal
    const yPos = chart.scales.y.getPixelForValue(coord.alt);

    chartMarker.style.left = `${boundedX}px`;
    chartMarker.style.top = `${yPos}px`; // Perbarui posisi vertikal berdasarkan elevasi
    updateTempMarker(coord);
    document.getElementById('elevationValue').textContent = `Elevasi: ${Math.floor(coord.alt)} mdpl`;
    document.getElementById('distanceValue').textContent = `Jarak: ${distance.toFixed(1)} km`;

    if (isPositionLocked) {
      lockedIndex = index;
    }

    console.log('Index:', index, 'Distance:', distance, 'Elevation:', coord.alt, 'Y Pos:', yPos);
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