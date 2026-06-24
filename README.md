# 🎓 AkademikAP — Sistem Informasi Akademik Kampus

**Campus Edition** · Portal Akademik Program Studi Administrasi Perkantoran, Politeknik Negeri Ujung Pandang (PNUP).

Aplikasi web *single-page* (HTML + CSS + JavaScript murni, tanpa framework) yang siap pakai untuk operasional akademik kampus. Berjalan langsung di browser, dengan opsi sinkronisasi data ke Google Sheets.

---

## ✨ Fitur Utama

### 🔐 Multi-Peran (Role-Based Access)
Satu portal, tiga jenis pengguna dengan menu & hak akses berbeda:

| Peran | Akun Demo | Akses |
|-------|-----------|-------|
| **Administrator** | `admin` / `admin123` | Seluruh fitur & data master |
| **Dosen** | `dosen` / `dosen123` | Jadwal mengajar, input nilai, presensi, pengumuman |
| **Mahasiswa** | `mahasiswa` / `mhs123` | KRS, jadwal, nilai/KHS, transkrip, presensi, keuangan |

> Akun mahasiswa juga bisa login dengan NIM (mis. `322210001` / `mhs123`).

### 📚 Akademik
- **Data Master**: Mahasiswa (biodata lengkap), Dosen, Staf, Mata Kuliah, Kelas/Rombel, Ruangan.
- **Tahun Akademik**: kelola periode & tentukan periode aktif.
- **Jadwal Kuliah**: tersusun per hari dengan ruangan, dosen, dan kelas.
- **KRS (Kartu Rencana Studi)**: mahasiswa memilih mata kuliah, admin menyetujui.
- **Presensi/Kehadiran**: dosen membuat sesi & mencatat status (Hadir/Izin/Sakit/Alpa); mahasiswa melihat rekap & persentase.
- **Input Nilai**: 5 komponen (Tugas, Praktik, UTS, UAS, Absen) dengan konversi otomatis ke nilai huruf & bobot IP.
- **Rapor & KHS**: IPS per semester, IPK kumulatif berbobot SKS, predikat, dan cetak Kartu Hasil Studi.
- **Transkrip Nilai**: rekap seluruh mata kuliah, progres kelulusan, dan cetak transkrip resmi berkop.

### 🏫 Administrasi Kampus
- **Keuangan/SPP**: tagihan per mahasiswa, status lunas/tunggakan, metode & tanggal bayar, rekap total.
- **Pengumuman**: pengumuman bertarget (Semua/Dosen/Mahasiswa), dapat disematkan (*pin*).
- **Kalender Akademik**: tampilan kalender bulanan + daftar agenda (Akademik/Ujian/Libur/Lainnya).
- **Profil**: biodata akun sesuai peran.

### 🛠️ Sistem
- **Tema terang/gelap** tersimpan otomatis.
- **Pengaturan**: identitas institusi, mode penyimpanan, dan cadangan data.
- **Cadangan data**: ekspor/impor JSON, ekspor CSV, reset ke data contoh.
- **Responsif** untuk desktop & mobile.

---

## 🧮 Rumus Penilaian

```
Skor Mentah = (Tugas×0,20)+(Praktik×0,50)+(UTS×0,25)+(UAS×0,35)+(Absen×0,05)
Skor Akhir  = Skor Mentah ÷ 1,35   (skala 0–100)
```

| Skor | Huruf | Bobot |
|------|-------|-------|
| ≥ 85 | A  | 4,0 |
| ≥ 80 | B+ | 3,5 |
| ≥ 75 | B  | 3,0 |
| ≥ 70 | C+ | 2,5 |
| ≥ 60 | C  | 2,0 |
| ≥ 50 | D  | 1,0 |
| < 50 | E  | 0   |

```
IPK / IPS = Σ(Bobot IP × SKS) ÷ Σ(SKS)
```

**Predikat:** ≥3,51 Dengan Pujian · ≥3,01 Sangat Memuaskan · ≥2,76 Memuaskan · lainnya Cukup.

---

## 🚀 Cara Menjalankan

1. Ekstrak berkas zip.
2. Buka `index.html` di browser (klik dua kali). Tidak perlu server.
3. Login menggunakan salah satu akun demo di atas.

> Data tersimpan otomatis di browser (localStorage). Untuk berbagi data antar perangkat, aktifkan **Mode Cloud** (lihat di bawah).

---

## ☁️ Mode Cloud (opsional — Google Sheets)

1. Buat Google Spreadsheet baru.
2. **Extensions → Apps Script**, tempel isi `apps-script.js`.
3. Jalankan fungsi `setup()` satu kali (membuat semua sheet).
4. **Deploy → New deployment → Web app** — *Execute as: Me*, *Access: Anyone*.
5. Salin URL Web App ke menu **Pengaturan → Penyimpanan**, aktifkan **Mode Cloud**.

---

## 📁 Struktur Berkas

```
akademikap/
├─ index.html          # Kerangka halaman & navigasi multi-peran
├─ css/
│  └─ style.css        # Desain sistem (tema terang/gelap) + komponen kampus
├─ js/
│  ├─ core.js          # State, penyimpanan, autentikasi multi-peran, router (RBAC)
│  ├─ master.js        # Data master: mahasiswa, dosen, staf, matkul, kelas, ruangan
│  ├─ akademik.js      # Jadwal, KRS, presensi, nilai, KHS, transkrip
│  └─ kampus.js        # Dashboard, pengumuman, kalender, keuangan, tahun akademik, profil, pengaturan
├─ data/
│  └─ config.js        # Konfigurasi, akun, & data contoh (seed)
├─ apps-script.js      # Backend Google Apps Script (mode cloud)
└─ README.md
```

---

## 🔑 Mengubah Akun & Identitas

- **Akun pengguna**: ubah array `AKUN` di `data/config.js`.
- **Identitas institusi**: ubah objek `CONFIG` di `data/config.js`, atau lewat menu **Pengaturan → Identitas**.
- **Data contoh**: ubah objek `SEED_DATA` di `data/config.js`.

> Setelah mengubah `SEED_DATA`, lakukan **Pengaturan → Cadangan Data → Reset** agar data contoh baru dimuat.

---

© AkademikAP — Sistem Informasi Akademik Kampus. Dibuat untuk Program Studi Administrasi Perkantoran PNUP.
