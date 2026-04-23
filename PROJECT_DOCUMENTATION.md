# 🫁 PulmonaryDetect: In-Depth Project Documentation

Dokumen ini menjelaskan secara rinci tentang arsitektur, teknologi, logika kerja, dan spesifikasi AI (Model) dari aplikasi **PulmonaryDetect**. 

---

## 🛠️ 1. Technology Stack (Teknologi yang Digunakan)

Aplikasi ini dibangun menggunakan pendekatan hibrida (*hybrid web app*) yang memisahkan logika backend dan eksekusi AI di frontend:

- **Backend / Web Server:** 
  - **Python 3.9+** & **Flask (2.3.3)**: Berfungsi sebagai *routing server* yang ringan, menangani *upload* file sementara, serta melayani penyediaan *file statis* dan *model machine learning*.
  - **Werkzeug**: Menangani utilitas WSGI dan pengamanan *filename* (melalui `secure_filename`).
- **Frontend / UI:** 
  - **HTML5 & CSS3 (Vanilla)**: Tidak menggunakan *framework* (seperti Bootstrap atau Tailwind) untuk kontrol penuh atas desain, memastikan ukuran file sangat kecil, dan memungkinkan *Dark Mode* kustom.
  - **Vanilla JavaScript (ES6)**: Digunakan untuk logika UI interaktif, drag & drop, serta sistem navigasi SPA (Single Page Application) kustom.
- **Machine Learning Engine:** 
  - **TensorFlow.js (TF.js)** & **Teachable Machine API**: Library JavaScript yang memungkinkan eksekusi model *deep learning* **langsung di dalam browser client** dengan akselerasi GPU/WebGL.

---

## 🏗️ 2. System Architecture (Arsitektur Sistem)

Arsitektur aplikasi ini sangat difokuskan pada **Keamanan Privasi (Client-Side Inference)** dan **Performa Cepat (SPA Routing)**.

### a. SPA-Like Navigation (Navigasi Tanpa Reload)
Meskipun menggunakan Flask (yang biasanya berbasis SSR - Server Side Rendering), frontend aplikasi ini dimodifikasi menggunakan skrip `spa-navigation.js`. Setiap kali *user* pindah menu (misalnya dari Home ke About), JavaScript akan melakukan *fetch* secara *asynchronous* ke backend untuk mengambil isi halaman baru dan menimpanya ke DOM. Ini memberikan pengalaman penggunaan secepat aplikasi native/React/Vue.

### b. Zero-Server-Inference (Prediksi di Client)
Arsitektur paling krusial di sistem ini adalah bagaimana AI dijalankan:
1. Saat web dimuat, browser pengguna mengunduh struktur model (`model.json`) dan beban bobot neural network (`weights.bin`) sebesar beberapa megabyte dari server Flask.
2. Ketika *user* mengunggah foto rontgen (X-Ray), gambar tersebut **tidak dikirim ke server backend untuk diprediksi**. 
3. Model TensorFlow.js di frontend langsung memproses gambar tersebut dari memori RAM komputer/HP pengguna (menggunakan `model.predict(canvasElement)`).
4. **Keuntungan:** Keamanan privasi terjamin 100% (data medis tidak berpindah ke server eksternal saat proses prediksi) dan latensi prediksi sangat rendah (instan).

---

## ⚙️ 3. Detail Logic (Alur Logika Aplikasi)

### Mode 1: Image Upload (Drag & Drop)
1. Pengguna meletakkan gambar (JPG/PNG/DCM) ke area unggah.
2. JavaScript (`script_new.js`) memvalidasi ekstensi dan tipe MIME file.
3. Gambar diubah menggunakan API `FileReader` dan ditampilkan di kanvas pratinjau (`imagePreview`).
4. Gambar langsung diproses oleh fungsi `processFrame()`.
5. *Progress bar* hasil diagnosa (Normal / Pneumonia / Tuberculosis) langsung dirender dengan efek animasi.

### Mode 2: Live Camera / Real-Time Analysis
1. JavaScript mengakses API WebRTC (`navigator.mediaDevices.getUserMedia`) untuk mengaktifkan kamera pengguna.
2. Terdapat sistem "High Performance Mode" (opsional):
   - Jika aktif: Kamera merekam di 30 FPS, model AI menganalisis di 5 FPS.
   - Jika non-aktif: Kamera merekam di 15 FPS, model AI menganalisis di 3 FPS (menghemat baterai/RAM).
3. Frame dari kamera digambar ke *hidden HTML Canvas*.
4. Fitur `requestAnimationFrame` digunakan untuk melakukan siklus *loop* (menggambar ke layar) tanpa membebani *Main Thread* browser.
5. Secara asinkron, fungsi `processFrame()` mencuplik gambar dari kanvas secara periodik untuk dilempar ke TensorFlow.js.

---

## 🧠 4. Model Details (Spesifikasi Model AI)

Model pendeteksi penyakit paru-paru ini dibangun di atas arsitektur **MobileNet**, yang di-transfer-learning (dilatih ulang) menggunakan Google Teachable Machine.

- **Kategori Klasifikasi (Classes):**
  1. Paru-paru Normal (Normal)
  2. Pneumonia (Infeksi Paru)
  3. Tuberculosis (TBC)
  4. Other (Kondisi lainnya / Gambar non-paru)

- **Performa Metrik Penelitian (Evaluasi Terakhir):**
  Model ini telah teruji dengan sangat baik melalui penelitian:
  - **Akurasi (Accuracy):** 99.51%
  - **F1-Score (Macro):** 99.51%
  - **ROC-AUC Score:** 0.999994
  
- **Visualisasi Hasil (UI Logic):**
  Untuk mempermudah tenaga medis membaca hasil, *confidence level* dari AI diubah menjadi indikator warna (*severity*):
  - **Merah (High Confidence):** > 90%
  - **Kuning (Medium Confidence):** 70% - 90%
  - **Biru/Hijau (Low Confidence):** < 70%

---

## 🔒 5. File System & Backend Logic
Meskipun inferensi dilakukan di *frontend*, Flask di `app.py` tetap memiliki peran penting:
1. **Model Delivery:** File AI (`.bin` dan `.json`) tidak bisa disajikan sembarangan karena masalah CORS dan tipe MIME. Flask memastikan file `weights.bin` dikirim dengan header `application/octet-stream` dan header `Access-Control-Allow-Origin: *` agar TensorFlow.js bisa merakit ulang neural network-nya di browser.
2. **Image Archiving (Opsional):** Saat pengguna mengunggah gambar, Flask memproses `secure_filename` dengan penambahan `uuid` acak agar tidak bentrok, lalu menyimpan salinan gambar di `static/uploads/`. Ini berguna jika di masa depan pengembang ingin membuat fitur *history* atau *caching*.

---

*Dokumen ini dibuat secara otomatis untuk membantu pengembang, peneliti, dan kontributor lain dalam memahami keseluruhan ekosistem web PulmonaryDetect.*
