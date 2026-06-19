// ================================================
//  KONFIGURASI AKADEMIKAP — Professional Edition
// ------------------------------------------------
//  STORAGE_MODE:
//   "local" → data disimpan di browser (localStorage).
//             Aplikasi LANGSUNG berfungsi tanpa server.
//   "cloud" → data disinkronkan ke Google Apps Script.
//             Isi APPS_SCRIPT_URL terlebih dahulu, lalu
//             ubah STORAGE_MODE menjadi "cloud".
//  Mode dapat juga diubah langsung dari menu Pengaturan.
// ================================================

const STORAGE_MODE = "cloud"; // "local" atau "cloud"

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdOn8k4XCW6-dAjOjHmnIVzYhzobhXdyEtGPNW-DA9jS3Xi8iS0P3im-CLueKUK5BbXA/exec"; // Contoh: https://script.google.com/macros/s/XXXX/exec

// Akun login demo (mode lokal). Ganti sesuai kebutuhan.
const AUTH = {
  username: "admin",
  password: "admin123",
  displayName: "Administrator"
};

const CONFIG = {
  namaInstitusi: "Politeknik Negeri Ujung Pandang",
  namaProdi: "Administrasi Perkantoran",
  namaPortal: "AkademikAP",
  // Bobot komponen nilai. Skor mentah dibagi totalBobot agar ternormalisasi ke skala 0–100.
  bobotNilai: { tugas: 0.20, praktik: 0.50, uts: 0.25, uas: 0.35, absen: 0.05 },
  totalBobot: 1.35
};

// ================================================
//  DATA AWAL (SEED) — dipakai pertama kali pada mode lokal
//  agar portal langsung berisi contoh data yang fungsional.
// ================================================
const SEED_DATA = {
  mahasiswa: [
    { ID: "MHS-1", NIM: "322210001", Nama: "Andi Pratama",        Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "andi@student.pnup.ac.id",  "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-2", NIM: "322210002", Nama: "Siti Nurhaliza",       Angkatan: "2022", "Jenis Kelamin": "P", Status: "Aktif", Email: "siti@student.pnup.ac.id",  "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-3", NIM: "322210003", Nama: "Muhammad Rizki",        Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "rizki@student.pnup.ac.id", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-4", NIM: "322210004", Nama: "Dewi Lestari",          Angkatan: "2022", "Jenis Kelamin": "P", Status: "Aktif", Email: "dewi@student.pnup.ac.id",  "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-5", NIM: "322210005", Nama: "Ahmad Fauzan",          Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "fauzan@student.pnup.ac.id","Tanggal Daftar": "2022-08-01T00:00:00.000Z" }
  ],
  dosen: [
    { ID: "DSN-1", NIDN: "0901018801", Nama: "Dr. Hasanuddin, M.M.",     Jabatan: "Lektor Kepala", Email: "hasanuddin@pnup.ac.id", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "DSN-2", NIDN: "0912029002", Nama: "Rahmawati, S.E., M.Si.",   Jabatan: "Lektor",        Email: "rahmawati@pnup.ac.id",  "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "DSN-3", NIDN: "0903038503", Nama: "Bambang Sucipto, M.Kom.",  Jabatan: "Asisten Ahli",  Email: "bambang@pnup.ac.id",    "Tanggal Daftar": "2021-01-01T00:00:00.000Z" }
  ],
  staf: [
    { ID: "STF-1", NIP: "19850110", Nama: "Hartono",      Jabatan: "Staf Akademik",      "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "STF-2", NIP: "19900215", Nama: "Nur Aisyah",   Jabatan: "Staf Administrasi",   "Tanggal Daftar": "2021-01-01T00:00:00.000Z" }
  ],
  mataKuliah: [
    { ID: "MK-1", Kode: "AP101", "Nama Mata Kuliah": "Pengantar Administrasi Perkantoran", Semester: "1", SKS: 3, "Dosen Pengampu": "Dr. Hasanuddin, M.M.",   "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-2", Kode: "AP102", "Nama Mata Kuliah": "Korespondensi Bisnis",              Semester: "1", SKS: 2, "Dosen Pengampu": "Rahmawati, S.E., M.Si.", "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-3", Kode: "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",               Semester: "2", SKS: 3, "Dosen Pengampu": "Dr. Hasanuddin, M.M.",   "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-4", Kode: "AP202", "Nama Mata Kuliah": "Aplikasi Komputer Perkantoran",     Semester: "2", SKS: 3, "Dosen Pengampu": "Bambang Sucipto, M.Kom.","Tanggal Dibuat": "2022-08-01T00:00:00.000Z" }
  ],
  nilai: [
    { ID: "NL-1", "NIM Mahasiswa": "322210001", "Nama Mahasiswa": "Andi Pratama",  "Kode MK": "AP101", "Nama Mata Kuliah": "Pengantar Administrasi Perkantoran", Semester: "1", SKS: 3, Tugas: 85, Praktik: 88, UTS: 80, UAS: 90, Absen: 95, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-01-10T00:00:00.000Z" },
    { ID: "NL-2", "NIM Mahasiswa": "322210001", "Nama Mahasiswa": "Andi Pratama",  "Kode MK": "AP102", "Nama Mata Kuliah": "Korespondensi Bisnis", Semester: "1", SKS: 2, Tugas: 78, Praktik: 82, UTS: 75, UAS: 80, Absen: 90, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-01-11T00:00:00.000Z" },
    { ID: "NL-3", "NIM Mahasiswa": "322210001", "Nama Mahasiswa": "Andi Pratama",  "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan", Semester: "2", SKS: 3, Tugas: 90, Praktik: 92, UTS: 88, UAS: 91, Absen: 100, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-07-10T00:00:00.000Z" },
    { ID: "NL-4", "NIM Mahasiswa": "322210002", "Nama Mahasiswa": "Siti Nurhaliza", "Kode MK": "AP101", "Nama Mata Kuliah": "Pengantar Administrasi Perkantoran", Semester: "1", SKS: 3, Tugas: 92, Praktik: 95, UTS: 90, UAS: 93, Absen: 100, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-01-10T00:00:00.000Z" },
    { ID: "NL-5", "NIM Mahasiswa": "322210002", "Nama Mahasiswa": "Siti Nurhaliza", "Kode MK": "AP202", "Nama Mata Kuliah": "Aplikasi Komputer Perkantoran", Semester: "2", SKS: 3, Tugas: 80, Praktik: 85, UTS: 78, UAS: 82, Absen: 95, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-07-12T00:00:00.000Z" },
    { ID: "NL-6", "NIM Mahasiswa": "322210003", "Nama Mahasiswa": "Muhammad Rizki", "Kode MK": "AP101", "Nama Mata Kuliah": "Pengantar Administrasi Perkantoran", Semester: "1", SKS: 3, Tugas: 70, Praktik: 72, UTS: 65, UAS: 68, Absen: 80, "Skor Mentah": 0, "Skor Normalisasi": 0, "Nilai Huruf": "", "Bobot IP": 0, "Tanggal Input": "2023-01-13T00:00:00.000Z" }
  ]
};
