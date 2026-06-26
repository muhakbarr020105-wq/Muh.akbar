// ================================================
//  KONFIGURASI FIRASTIKASHOP
//  Manajemen Toko Skincare & Makeup
// ------------------------------------------------
//  STORAGE_MODE:
//   "local" -> data disimpan di browser (localStorage).
//              Aplikasi LANGSUNG berfungsi tanpa server.
//   "cloud" -> data disinkronkan ke Google Spreadsheet
//              lewat Google Apps Script. Isi APPS_SCRIPT_URL
//              terlebih dahulu. Jika URL kosong, otomatis
//              memakai data lokal sampai URL diisi.
//  Mode juga bisa diubah dari menu Pengaturan.
// ================================================

const STORAGE_MODE = "cloud"; // "local" atau "cloud"

// Tempel URL Web App Apps Script di sini (diakhiri /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwXw-dIVCXaZX6W5-nJgm3TKOAgPtVF3tRzSqVcEFvy4sbgQKhTFFCNcCcKZC5YPVJV/exec"; // contoh: https://script.google.com/macros/s/XXXX/exec

// Akun login demo. Ganti sesuai kebutuhan.
const AUTH = {
  username: "admin",
  password: "admin123",
  displayName: "Admin Toko"
};

const CONFIG = {
  namaToko: "FirastikaShop",
  tagline: "Skincare & Makeup Store",
  mataUang: "Rp",
  kategoriProduk: ["Skincare", "Makeup", "Body Care", "Haircare", "Parfum"],
  kategoriPengeluaran: ["Restock", "Operasional", "Gaji", "Sewa", "Marketing", "Lainnya"]
};

// ================================================
//  DATA AWAL (SEED) - dipakai pertama kali pada mode lokal
//  agar aplikasi langsung berisi contoh data fungsional.
//  Kunci objek = nama kolom pada Google Sheet.
// ================================================
const SEED_DATA = {
  produk: [
    { ID: "PRD-1", Nama: "Serum Vitamin C 20%",        Kategori: "Skincare", Brand: "GlowLab",   "Harga Beli": 45000,  "Harga Jual": 79000,  Stok: 24, "Stok Minimum": 5, "Tanggal Dibuat": "2024-01-05T00:00:00.000Z" },
    { ID: "PRD-2", Nama: "Sunscreen SPF 50 PA++++",     Kategori: "Skincare", Brand: "GlowLab",   "Harga Beli": 38000,  "Harga Jual": 65000,  Stok: 30, "Stok Minimum": 6, "Tanggal Dibuat": "2024-01-05T00:00:00.000Z" },
    { ID: "PRD-3", Nama: "Cushion Matte Natural",       Kategori: "Makeup",   Brand: "Belleza",   "Harga Beli": 52000,  "Harga Jual": 95000,  Stok: 18, "Stok Minimum": 4, "Tanggal Dibuat": "2024-01-06T00:00:00.000Z" },
    { ID: "PRD-4", Nama: "Lip Cream Velvet 04",         Kategori: "Makeup",   Brand: "Belleza",   "Harga Beli": 23000,  "Harga Jual": 45000,  Stok: 40, "Stok Minimum": 8, "Tanggal Dibuat": "2024-01-06T00:00:00.000Z" },
    { ID: "PRD-5", Nama: "Micellar Water 250ml",        Kategori: "Skincare", Brand: "PureSkin",  "Harga Beli": 28000,  "Harga Jual": 49000,  Stok: 3,  "Stok Minimum": 6, "Tanggal Dibuat": "2024-01-07T00:00:00.000Z" },
    { ID: "PRD-6", Nama: "Body Lotion Vanilla",         Kategori: "Body Care",Brand: "PureSkin",  "Harga Beli": 21000,  "Harga Jual": 39000,  Stok: 26, "Stok Minimum": 5, "Tanggal Dibuat": "2024-01-07T00:00:00.000Z" },
    { ID: "PRD-7", Nama: "Hair Serum Argan Oil",        Kategori: "Haircare", Brand: "Lumiere",   "Harga Beli": 33000,  "Harga Jual": 59000,  Stok: 14, "Stok Minimum": 4, "Tanggal Dibuat": "2024-01-08T00:00:00.000Z" },
    { ID: "PRD-8", Nama: "Eau de Parfum Rose 50ml",     Kategori: "Parfum",   Brand: "Lumiere",   "Harga Beli": 75000,  "Harga Jual": 135000, Stok: 9,  "Stok Minimum": 3, "Tanggal Dibuat": "2024-01-08T00:00:00.000Z" }
  ],
  transaksi: [
    { ID: "TRX-1", Tipe: "pemasukan",   Kategori: "Penjualan",  Tanggal: "2024-02-02", Keterangan: "[Order #A1B2C3 \u2014 Sari] Serum Vitamin C 20%", Jumlah: 158000, "Produk ID": "PRD-1", Qty: 2, "Order ID": "A1B2C3" },
    { ID: "TRX-2", Tipe: "pemasukan",   Kategori: "Penjualan",  Tanggal: "2024-02-02", Keterangan: "[Order #A1B2C3 \u2014 Sari] Lip Cream Velvet 04",   Jumlah: 45000,  "Produk ID": "PRD-4", Qty: 1, "Order ID": "A1B2C3" },
    { ID: "TRX-3", Tipe: "pengeluaran", Kategori: "Restock",    Tanggal: "2024-02-03", Keterangan: "Restock Cushion Matte Natural",                  Jumlah: 520000, "Produk ID": "PRD-3", Qty: 10, "Order ID": "" },
    { ID: "TRX-4", Tipe: "pengeluaran", Kategori: "Operasional",Tanggal: "2024-02-05", Keterangan: "Biaya kemasan & paper bag",                      Jumlah: 85000,  "Produk ID": "",    Qty: 0,  "Order ID": "" },
    { ID: "TRX-5", Tipe: "pemasukan",   Kategori: "Penjualan",  Tanggal: "2024-02-06", Keterangan: "[Order #D4E5F6] Sunscreen SPF 50 PA++++",        Jumlah: 130000, "Produk ID": "PRD-2", Qty: 2, "Order ID": "D4E5F6" }
  ]
};
