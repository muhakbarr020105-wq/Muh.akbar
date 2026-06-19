# 🎓 AkademikAP — Portal Akademik Administrasi Perkantoran (Professional Edition)

Portal akademik untuk **Program Studi Administrasi Perkantoran — Politeknik Negeri Ujung Pandang (PNUP)**.
Mengelola data mahasiswa, dosen, staf, mata kuliah, input nilai, serta perhitungan **IPS & IPK berbobot SKS** lengkap dengan **Kartu Hasil Studi (KHS)**.

---

## ✨ Yang Baru di Edisi Profesional

- **Desain profesional baru** — tampilan institusional yang bersih, tema **Terang & Gelap**, responsif penuh (desktop & mobile).
- **Berfungsi tanpa server (Mode Lokal)** — data tersimpan otomatis di browser (localStorage) dengan **data contoh** siap pakai. Tidak ada error koneksi.
- **Layar Login** — akun demo `admin` / `admin123`.
- **Edit Nilai** langsung dari tabel (sebelumnya hanya tambah/hapus).
- **IPK & IPS berbobot SKS** — rumus akademik resmi: `Σ(bobot × SKS) / Σ(SKS)`.
- **Grafik distribusi nilai** & **peringkat IPK** di dashboard.
- **Cetak KHS** (print) dan **Ekspor CSV** nilai.
- **Cadangan data** — ekspor/impor JSON & reset ke data contoh.
- **Halaman Pengaturan** — atur mode penyimpanan, URL Apps Script, dan identitas institusi.
- **Sinkronisasi Cloud opsional** ke Google Sheets via Apps Script.

---

## 🚀 Cara Menjalankan (Mode Lokal — paling mudah)

1. Ekstrak folder ini.
2. Buka **`index.html`** di browser (klik dua kali atau seret ke browser).
3. Login dengan **`admin` / `admin123`**.
4. Selesai — aplikasi langsung berisi data contoh dan dapat dipakai sepenuhnya.

> Semua perubahan otomatis tersimpan di perangkat Anda. Untuk memulai dari kosong, buka **Pengaturan → Reset Data** atau impor file cadangan Anda sendiri.

Untuk pengalaman terbaik, jalankan melalui server lokal sederhana (opsional):
```bash
cd akademikap
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

---

## ☁️ Mode Cloud (opsional — sinkron ke Google Sheets)

1. Buat **Google Spreadsheet** baru.
2. **Extensions → Apps Script**, tempel seluruh isi `apps-script.js`.
3. Jalankan fungsi **`setup()`** sekali (membuat semua sheet otomatis).
4. **Deploy → New deployment → Web app** — *Execute as: Me*, *Who has access: Anyone*.
5. Salin URL Web App (diakhiri `/exec`).
6. Tempel URL di **`data/config.js`** (`APPS_SCRIPT_URL`) **atau** lewat menu **Pengaturan**, lalu aktifkan **Mode Cloud**.

---

## 📐 Skema Penilaian

**Skor akhir** dihitung dari bobot komponen lalu dinormalisasi ke skala 0–100:

| Komponen | Bobot |
|----------|-------|
| Tugas    | 20%   |
| Praktik  | 50%   |
| UTS      | 25%   |
| UAS      | 35%   |
| Absen    | 5%    |

`Skor Mentah = (Tugas×0.20)+(Praktik×0.50)+(UTS×0.25)+(UAS×0.35)+(Absen×0.05)`
`Skor Akhir = Skor Mentah / 1.35`

**Konversi nilai huruf & bobot IP:**

| Skor | Huruf | Bobot |
|------|-------|-------|
| ≥ 85 | A  | 4.0 |
| ≥ 80 | B+ | 3.5 |
| ≥ 75 | B  | 3.0 |
| ≥ 70 | C+ | 2.5 |
| ≥ 60 | C  | 2.0 |
| ≥ 50 | D  | 1.0 |
| < 50 | E  | 0.0 |

**IPS / IPK** dihitung berbobot SKS: `Σ(Bobot IP × SKS) / Σ(SKS)`.

---

## 📁 Struktur Proyek

```
akademikap/
├─ index.html        — struktur halaman (login, dashboard, data master, nilai, rapor, pengaturan)
├─ css/style.css     — desain profesional (tema terang & gelap, responsif, gaya cetak)
├─ js/app.js         — logika aplikasi (mesin data lokal + sinkron cloud, CRUD, IPK, grafik, ekspor)
├─ data/config.js    — konfigurasi, akun login, dan data contoh (seed)
├─ apps-script.js    — backend Google Apps Script (opsional, Mode Cloud)
└─ README.md
```

---

## 🔑 Akun Demo

| Username | Password   |
|----------|------------|
| `admin`  | `admin123` |

Ganti melalui objek `AUTH` di `data/config.js`.
