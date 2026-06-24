// ================================================
//  KONFIGURASI AKADEMIKAP — Campus Edition
// ------------------------------------------------
//  Sistem Informasi Akademik untuk lingkungan kampus.
//  Mendukung multi-peran (Admin, Dosen, Mahasiswa),
//  tahun akademik, jadwal, presensi, KRS, keuangan,
//  pengumuman, dan kalender akademik.
//
//  STORAGE_MODE:
//   "local" → data disimpan di browser (localStorage).
//   "cloud" → sinkron ke Google Apps Script (isi APPS_SCRIPT_URL).
//  Mode juga dapat diubah dari menu Pengaturan.
// ================================================

const STORAGE_MODE = "local"; // "local" atau "cloud"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNVMrzIDJhMpHHgZQ9W1anrl5bysGAYLQp2dyB3TnnqqaqM1Y3vC-__DQ_OBUquaLKNw/exec";   // Contoh: https://script.google.com/macros/s/XXXX/exec

// ------------------------------------------------
//  AKUN PENGGUNA (multi-peran)
//  role: "admin" | "dosen" | "mahasiswa"
//  ref : untuk dosen = NIDN/ID dosen, untuk mahasiswa = NIM
// ------------------------------------------------
const AKUN = [
  { username: "admin",    password: "admin123", role: "admin",     nama: "Administrator",        ref: "" },
  { username: "dosen",    password: "dosen123", role: "dosen",     nama: "Dr. Hasanuddin, M.M.", ref: "DSN-1" },
  { username: "hasanuddin", password: "dosen123", role: "dosen",   nama: "Dr. Hasanuddin, M.M.", ref: "DSN-1" },
  { username: "rahmawati",  password: "dosen123", role: "dosen",   nama: "Rahmawati, S.E., M.Si.", ref: "DSN-2" },
  { username: "mahasiswa", password: "mhs123",   role: "mahasiswa", nama: "Andi Pratama",        ref: "322210001" },
  { username: "322210001", password: "mhs123",   role: "mahasiswa", nama: "Andi Pratama",        ref: "322210001" },
  { username: "322210002", password: "mhs123",   role: "mahasiswa", nama: "Siti Nurhaliza",      ref: "322210002" }
];

// Kompatibilitas mundur (login admin lama)
const AUTH = { username: "admin", password: "admin123", displayName: "Administrator" };

const CONFIG = {
  namaInstitusi: "Politeknik Negeri Ujung Pandang",
  namaProdi: "Administrasi Perkantoran",
  namaJurusan: "Administrasi Niaga",
  namaPortal: "AkademikAP",
  alamat: "Jl. Perintis Kemerdekaan KM.10, Tamalanrea, Makassar",
  telepon: "(0411) 585365",
  website: "www.pnup.ac.id",
  akreditasi: "B",
  // Bobot komponen nilai. Skor mentah dibagi totalBobot agar ternormalisasi ke skala 0–100.
  bobotNilai: { tugas: 0.20, praktik: 0.50, uts: 0.25, uas: 0.35, absen: 0.05 },
  totalBobot: 1.35,
  sksLulus: 110,          // total SKS minimal untuk lulus (D3)
  sppPerSemester: 2400000 // nominal SPP default per semester
};

// ================================================
//  DATA AWAL (SEED) — Campus Edition
// ================================================
const SEED_DATA = {
  tahunAkademik: [
    { ID: "TA-1", Kode: "2023/2024 Ganjil", Tahun: "2023/2024", Semester: "Ganjil", "Mulai": "2023-09-01", "Selesai": "2024-01-31", Status: "Selesai" },
    { ID: "TA-2", Kode: "2023/2024 Genap",  Tahun: "2023/2024", Semester: "Genap",  "Mulai": "2024-02-01", "Selesai": "2024-07-31", Status: "Selesai" },
    { ID: "TA-3", Kode: "2024/2025 Ganjil", Tahun: "2024/2025", Semester: "Ganjil", "Mulai": "2024-09-01", "Selesai": "2025-01-31", Status: "Aktif" }
  ],
  mahasiswa: [
    { ID: "MHS-1", NIM: "322210001", Nama: "Andi Pratama",   Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "andi@student.pnup.ac.id",   Telepon: "081234567001", "Tempat Lahir": "Makassar", "Tanggal Lahir": "2004-03-12", Agama: "Islam", Alamat: "Jl. Sultan Alauddin No. 12, Makassar", Kelas: "AP-2A", "Dosen Wali": "Dr. Hasanuddin, M.M.", "Nama Wali": "Bapak Pratama", "Telepon Wali": "081234500001", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-2", NIM: "322210002", Nama: "Siti Nurhaliza", Angkatan: "2022", "Jenis Kelamin": "P", Status: "Aktif", Email: "siti@student.pnup.ac.id",   Telepon: "081234567002", "Tempat Lahir": "Gowa",     "Tanggal Lahir": "2004-06-21", Agama: "Islam", Alamat: "Jl. Andi Tonro No. 8, Gowa",        Kelas: "AP-2A", "Dosen Wali": "Dr. Hasanuddin, M.M.", "Nama Wali": "Ibu Halimah", "Telepon Wali": "081234500002", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-3", NIM: "322210003", Nama: "Muhammad Rizki",  Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "rizki@student.pnup.ac.id",  Telepon: "081234567003", "Tempat Lahir": "Maros",    "Tanggal Lahir": "2003-11-05", Agama: "Islam", Alamat: "Jl. Poros Maros No. 21, Maros",     Kelas: "AP-2A", "Dosen Wali": "Rahmawati, S.E., M.Si.", "Nama Wali": "Bapak Sulaiman", "Telepon Wali": "081234500003", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-4", NIM: "322210004", Nama: "Dewi Lestari",    Angkatan: "2022", "Jenis Kelamin": "P", Status: "Aktif", Email: "dewi@student.pnup.ac.id",   Telepon: "081234567004", "Tempat Lahir": "Makassar", "Tanggal Lahir": "2004-01-30", Agama: "Kristen", Alamat: "Jl. Hertasning No. 5, Makassar",  Kelas: "AP-2B", "Dosen Wali": "Rahmawati, S.E., M.Si.", "Nama Wali": "Ibu Maria", "Telepon Wali": "081234500004", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" },
    { ID: "MHS-5", NIM: "322210005", Nama: "Ahmad Fauzan",    Angkatan: "2022", "Jenis Kelamin": "L", Status: "Aktif", Email: "fauzan@student.pnup.ac.id", Telepon: "081234567005", "Tempat Lahir": "Bone",     "Tanggal Lahir": "2003-09-17", Agama: "Islam", Alamat: "Jl. Watampone No. 3, Bone",        Kelas: "AP-2B", "Dosen Wali": "Dr. Hasanuddin, M.M.", "Nama Wali": "Bapak Yusuf", "Telepon Wali": "081234500005", "Tanggal Daftar": "2022-08-01T00:00:00.000Z" }
  ],
  dosen: [
    { ID: "DSN-1", NIDN: "0901018801", Nama: "Dr. Hasanuddin, M.M.",    Jabatan: "Lektor Kepala", "Pendidikan": "S3 Manajemen",   Email: "hasanuddin@pnup.ac.id", Telepon: "081355500001", Status: "Aktif", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "DSN-2", NIDN: "0912029002", Nama: "Rahmawati, S.E., M.Si.",  Jabatan: "Lektor",        "Pendidikan": "S2 Ilmu Ekonomi", Email: "rahmawati@pnup.ac.id",  Telepon: "081355500002", Status: "Aktif", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "DSN-3", NIDN: "0903038503", Nama: "Bambang Sucipto, M.Kom.", Jabatan: "Asisten Ahli",  "Pendidikan": "S2 Ilmu Komputer",Email: "bambang@pnup.ac.id",    Telepon: "081355500003", Status: "Aktif", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" }
  ],
  staf: [
    { ID: "STF-1", NIP: "19850110", Nama: "Hartono",    Jabatan: "Staf Akademik",    Email: "hartono@pnup.ac.id", Telepon: "081244400001", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" },
    { ID: "STF-2", NIP: "19900215", Nama: "Nur Aisyah", Jabatan: "Staf Administrasi", Email: "aisyah@pnup.ac.id",  Telepon: "081244400002", "Tanggal Daftar": "2021-01-01T00:00:00.000Z" }
  ],
  ruangan: [
    { ID: "RNG-1", Kode: "AP-101", Nama: "Ruang Kuliah 101",     Gedung: "Gedung AN", Kapasitas: 40, Jenis: "Kelas" },
    { ID: "RNG-2", Kode: "AP-102", Nama: "Ruang Kuliah 102",     Gedung: "Gedung AN", Kapasitas: 40, Jenis: "Kelas" },
    { ID: "RNG-3", Kode: "LAB-KOMP", Nama: "Laboratorium Komputer", Gedung: "Gedung AN", Kapasitas: 30, Jenis: "Laboratorium" },
    { ID: "RNG-4", Kode: "LAB-PERK", Nama: "Lab. Simulasi Perkantoran", Gedung: "Gedung AN", Kapasitas: 30, Jenis: "Laboratorium" }
  ],
  kelas: [
    { ID: "KLS-1", Kode: "AP-2A", Nama: "Administrasi Perkantoran 2A", Angkatan: "2022", "Dosen Wali": "Dr. Hasanuddin, M.M.",   Jumlah: 3 },
    { ID: "KLS-2", Kode: "AP-2B", Nama: "Administrasi Perkantoran 2B", Angkatan: "2022", "Dosen Wali": "Rahmawati, S.E., M.Si.", Jumlah: 2 }
  ],
  mataKuliah: [
    { ID: "MK-1", Kode: "AP101", "Nama Mata Kuliah": "Pengantar Administrasi Perkantoran", Semester: "1", SKS: 3, Jenis: "Wajib", "Dosen Pengampu": "Dr. Hasanuddin, M.M.",    "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-2", Kode: "AP102", "Nama Mata Kuliah": "Korespondensi Bisnis",              Semester: "1", SKS: 2, Jenis: "Wajib", "Dosen Pengampu": "Rahmawati, S.E., M.Si.",  "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-3", Kode: "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",               Semester: "2", SKS: 3, Jenis: "Wajib", "Dosen Pengampu": "Dr. Hasanuddin, M.M.",    "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" },
    { ID: "MK-4", Kode: "AP202", "Nama Mata Kuliah": "Aplikasi Komputer Perkantoran",     Semester: "2", SKS: 3, Jenis: "Wajib", "Dosen Pengampu": "Bambang Sucipto, M.Kom.", "Tanggal Dibuat": "2022-08-01T00:00:00.000Z" }
  ],
  jadwal: [
    { ID: "JDW-1", Hari: "Senin",  "Jam Mulai": "08:00", "Jam Selesai": "10:30", "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",            Dosen: "Dr. Hasanuddin, M.M.",    Ruangan: "AP-101",   Kelas: "AP-2A", "Tahun Akademik": "2024/2025 Ganjil" },
    { ID: "JDW-2", Hari: "Senin",  "Jam Mulai": "13:00", "Jam Selesai": "15:30", "Kode MK": "AP202", "Nama Mata Kuliah": "Aplikasi Komputer Perkantoran", Dosen: "Bambang Sucipto, M.Kom.", Ruangan: "LAB-KOMP", Kelas: "AP-2A", "Tahun Akademik": "2024/2025 Ganjil" },
    { ID: "JDW-3", Hari: "Selasa", "Jam Mulai": "08:00", "Jam Selesai": "09:40", "Kode MK": "AP102", "Nama Mata Kuliah": "Korespondensi Bisnis",            Dosen: "Rahmawati, S.E., M.Si.",  Ruangan: "AP-102",   Kelas: "AP-2A", "Tahun Akademik": "2024/2025 Ganjil" },
    { ID: "JDW-4", Hari: "Rabu",   "Jam Mulai": "10:00", "Jam Selesai": "12:30", "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",            Dosen: "Dr. Hasanuddin, M.M.",    Ruangan: "AP-102",   Kelas: "AP-2B", "Tahun Akademik": "2024/2025 Ganjil" }
  ],
  krs: [
    { ID: "KRS-1", NIM: "322210001", Nama: "Andi Pratama",   "Tahun Akademik": "2024/2025 Ganjil", "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",            SKS: 3, Status: "Disetujui", "Tanggal": "2024-09-02T00:00:00.000Z" },
    { ID: "KRS-2", NIM: "322210001", Nama: "Andi Pratama",   "Tahun Akademik": "2024/2025 Ganjil", "Kode MK": "AP202", "Nama Mata Kuliah": "Aplikasi Komputer Perkantoran", SKS: 3, Status: "Disetujui", "Tanggal": "2024-09-02T00:00:00.000Z" },
    { ID: "KRS-3", NIM: "322210002", Nama: "Siti Nurhaliza", "Tahun Akademik": "2024/2025 Ganjil", "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan",            SKS: 3, Status: "Menunggu",  "Tanggal": "2024-09-03T00:00:00.000Z" }
  ],
  presensi: [
    { ID: "PRS-1", Tanggal: "2024-09-09", "Kode MK": "AP201", "Nama Mata Kuliah": "Manajemen Kearsipan", Kelas: "AP-2A", Pertemuan: 1, Dosen: "Dr. Hasanuddin, M.M.", "Tahun Akademik": "2024/2025 Ganjil", Rekap: [ { NIM: "322210001", Nama: "Andi Pratama", Status: "Hadir" }, { NIM: "322210002", Nama: "Siti Nurhaliza", Status: "Hadir" }, { NIM: "322210003", Nama: "Muhammad Rizki", Status: "Izin" } ] }
  ],
  pengumuman: [
    { ID: "PNG-1", Judul: "Jadwal UTS Semester Ganjil 2024/2025", Kategori: "Akademik", Target: "Semua", Penulis: "Administrator", Tanggal: "2024-10-01T08:00:00.000Z", Isi: "Ujian Tengah Semester akan dilaksanakan pada 21–26 Oktober 2024. Mohon mahasiswa memastikan tidak ada tunggakan administrasi.", Pin: true },
    { ID: "PNG-2", Judul: "Pembayaran SPP Semester Ganjil", Kategori: "Keuangan", Target: "Mahasiswa", Penulis: "Administrator", Tanggal: "2024-09-05T08:00:00.000Z", Isi: "Batas akhir pembayaran SPP semester ganjil adalah 30 September 2024. Pembayaran dapat dilakukan melalui bank yang ditunjuk.", Pin: false },
    { ID: "PNG-3", Judul: "Rapat Koordinasi Dosen", Kategori: "Internal", Target: "Dosen", Penulis: "Administrator", Tanggal: "2024-09-12T08:00:00.000Z", Isi: "Rapat koordinasi dosen prodi Administrasi Perkantoran diadakan Jumat, 13 September 2024 pukul 14.00 di ruang rapat jurusan.", Pin: false }
  ],
  kalender: [
    { ID: "KAL-1", Judul: "Awal Perkuliahan Semester Ganjil", Kategori: "Akademik", "Tanggal Mulai": "2024-09-02", "Tanggal Selesai": "2024-09-02" },
    { ID: "KAL-2", Judul: "Ujian Tengah Semester (UTS)",       Kategori: "Ujian",    "Tanggal Mulai": "2024-10-21", "Tanggal Selesai": "2024-10-26" },
    { ID: "KAL-3", Judul: "Libur Maulid Nabi",                  Kategori: "Libur",    "Tanggal Mulai": "2024-09-16", "Tanggal Selesai": "2024-09-16" },
    { ID: "KAL-4", Judul: "Ujian Akhir Semester (UAS)",         Kategori: "Ujian",    "Tanggal Mulai": "2024-12-16", "Tanggal Selesai": "2024-12-21" }
  ],
  keuangan: [
    { ID: "KEU-1", NIM: "322210001", Nama: "Andi Pratama",   "Tahun Akademik": "2024/2025 Ganjil", Jenis: "SPP", Jumlah: 2400000, Status: "Lunas",  Metode: "Transfer Bank", "Tanggal Bayar": "2024-09-10", "Jatuh Tempo": "2024-09-30" },
    { ID: "KEU-2", NIM: "322210002", Nama: "Siti Nurhaliza", "Tahun Akademik": "2024/2025 Ganjil", Jenis: "SPP", Jumlah: 2400000, Status: "Belum",  Metode: "",            "Tanggal Bayar": "",           "Jatuh Tempo": "2024-09-30" },
    { ID: "KEU-3", NIM: "322210003", Nama: "Muhammad Rizki",  "Tahun Akademik": "2024/2025 Ganjil", Jenis: "SPP", Jumlah: 2400000, Status: "Lunas",  Metode: "Virtual Account", "Tanggal Bayar": "2024-09-08", "Jatuh Tempo": "2024-09-30" },
    { ID: "KEU-4", NIM: "322210004", Nama: "Dewi Lestari",    "Tahun Akademik": "2024/2025 Ganjil", Jenis: "SPP", Jumlah: 2400000, Status: "Belum",  Metode: "",            "Tanggal Bayar": "",           "Jatuh Tempo": "2024-09-30" }
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
