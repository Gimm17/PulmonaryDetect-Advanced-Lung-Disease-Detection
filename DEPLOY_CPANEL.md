# Panduan Deploy (Hosting) Flask App ke cPanel

Dokumen ini berisi panduan langkah demi langkah untuk meng-hosting aplikasi web **PulmonaryDetect** (Flask) ke layanan hosting berbasis cPanel.

> [!IMPORTANT]
> **Prasyarat Penting:** Pastikan provider hosting Anda memiliki fitur **"Setup Python App"** (berasal dari CloudLinux). Tanpa fitur ini, Anda tidak bisa menjalankan Python di shared hosting cPanel biasa.

---

## Tahap 1: Setup Aplikasi Python di cPanel

1. Login ke akun **cPanel** Anda.
2. Scroll ke bagian **Software** (atau ketik di kolom pencarian), lalu klik **Setup Python App**.
3. Klik tombol biru **Create Application** di sebelah kanan atas.
4. Isi konfigurasi aplikasinya seperti berikut:
   - **Python Version:** Pilih `3.9` atau `3.10` (Sesuaikan, disarankan `3.9` ke atas).
   - **Application Root:** Ketikkan nama folder tempat web akan disimpan (misal: `pulmonarydetect` atau `public_html/pulmonarydetect`).
   - **Application URL:** Pilih domain atau subdomain Anda dari *dropdown*. Kosongkan kolom sebelahnya jika ingin aplikasi berjalan di domain utama tersebut.
   - **Application startup file:** Ketik `passenger_wsgi.py`.
   - **Application Entry point:** Ketik `application`.
   - **Passenger log file:** (Opsional) bisa diisi `logs/passenger.log` untuk memudahkan proses *debugging* jika terjadi *error*.
5. Klik **Create** di pojok kanan atas.

---

## Tahap 2: Upload File Project ke cPanel

Setelah aplikasi Python selesai dibuat di panel, folder root-nya otomatis tercipta. Sekarang waktunya mengunggah kode Anda.

1. Kembali ke beranda cPanel, lalu buka **File Manager**.
2. Masuk ke direktori yang Anda buat di langkah sebelumnya (misal: `/home/user/pulmonarydetect`).
3. Upload seluruh file dari GitHub atau komputer Anda ke direktori ini.
   - Boleh via *Upload* biasa di cPanel (disarankan kompres ke `.zip` dulu lalu di-Extract di File Manager).
   - Atau via fitur **Git Version Control** yang ada di cPanel untuk di-clone langsung dari GitHub.
   
> [!WARNING]
> **Apa saja yang WAJIB di-upload?**
> - `app.py`, `wsgi.py`, `passenger_wsgi.py`, `requirements.txt`
> - Folder `static` dan `templates`
> 
> **Apa yang TIDAK BOLEH di-upload?**
> - Folder `venv/` (karena cPanel akan membuat *virtual environment*-nya sendiri).
> - Folder `__pycache__/`

---

## Tahap 3: Install Dependencies (Packages)

Aplikasi Flask tidak bisa berjalan tanpa meng-install library yang ada di `requirements.txt`.

1. Kembali ke menu **Setup Python App** di cPanel.
2. Edit aplikasi yang sudah dibuat (klik tombol pensil).
3. Di bawah bagian **Configuration files**, ketik `requirements.txt` lalu klik tombol **Add**.
4. Setelah file ditambahkan, klik tombol **Run Pip Install**. 
5. *Tunggu prosesnya berjalan. Ini mungkin membutuhkan waktu sekitar 1-3 menit untuk mengunduh semua module Flask, Werkzeug, dll.*

> [!TIP]
> **Cara Alternatif (Via Terminal cPanel):**
> Jika tombol Run Pip Install gagal (biasanya karena limitasi resource/memori dari provider hosting):
> 1. Di bagian atas halaman aplikasi Python Anda, *copy command* untuk masuk ke virtual environment (contohnya: `source /home/user/virtualenv/pulmonarydetect/3.9/bin/activate`).
> 2. Buka fitur **Terminal** di beranda cPanel.
> 3. *Paste* command tadi dan Enter.
> 4. Ketik: `pip install -r requirements.txt` lalu Enter.

---

## Tahap 4: Restart & Test

1. Kembali ke **Setup Python App**.
2. Klik tombol **Restart** pada aplikasi Anda.
3. Buka URL domain atau subdomain aplikasi Anda di *browser*.

Aplikasi **PulmonaryDetect** Anda seharusnya sudah berhasil diakses publik! 🎉

---

## 🐞 Troubleshooting (Jika Error)

Jika Anda menjumpai halaman *Internal Server Error* atau sejenisnya:
1. Pastikan ekstensi `dcm` (DICOM) tidak diblokir oleh MIME types cPanel. (Bisa ditambahkan di menu *MIME Types* cPanel).
2. Periksa **Passenger log file** atau file `error_log` di direktori aplikasi Anda untuk mengetahui letak errornya (biasanya karena module Python yang kurang atau *Permission* file).
3. Jika Anda memperbarui code (mengubah `app.py` atau `.html`), **WAJIB** klik tombol **Restart** di menu Setup Python App agar perubahan *code* diterapkan.
