# 🗺️ KML and Elevation Viewer

**KMLandElevation** adalah aplikasi WebGIS berbasis Leaflet dan ArcGIS yang memungkinkan pengguna:
- Mengunggah file `.kml` jalur pendakian
- Menampilkan peta interaktif
- Melihat grafik elevasi berdasarkan jalur KML
- Menampilkan total jarak & elevasi naik
- Menandai titik-titik pos (marker) dari KML ke dalam grafik elevasi

🔗 **Demo online**: [https://radika27.github.io/KMLandElevation/](https://radika27.github.io/KMLandElevation/)

---

## ✨ Fitur Utama

- 📍 Upload file KML jalur pendakian
- 📈 Grafik elevasi dinamis dari file KML
- ⛰️ Hitung total jarak dan elevasi naik otomatis
- 🧭 Marker (Pos 1, Puncak, dll) dari KML juga muncul di grafik elevasi
- 🌍 Peta interaktif dengan basemap ArcGIS

---

## 📂 Cara Menggunakan

1. Buka halaman [KMLandElevation](https://radika27.github.io/KMLandElevation/)
2. Klik tombol **Upload File**
3. Pilih file `.kml` berisi jalur dan marker pendakian
4. Peta dan grafik elevasi akan terupdate secara otomatis
5. Cek bagian bawah:
   - 📏 Total jarak (km)
   - 📶 Elevasi naik (m)

---

## 📌 Format KML yang Didukung

Pastikan file `.kml` Anda berisi:
- Fitur `LineString` untuk jalur pendakian
- Fitur `Point` untuk titik-titik pos (optional)

Contoh struktur:
```xml
<Placemark>
  <name>Pos 1</name>
  <Point>
    <coordinates>110.23456,-7.12345,1400</coordinates>
  </Point>
</Placemark>

<Placemark>
  <name>Jalur</name>
  <LineString>
    <coordinates>
      110.23456,-7.12345,1400
      110.23500,-7.12380,1420
      ...
    </coordinates>
  </LineString>
</Placemark>
