# 💄 FirastikaShop — Manajemen Toko Skincare & Makeup

Aplikasi web untuk mengelola **pemasukan, pengeluaran, dan stok barang** toko skincare & makeup.
Dapat berjalan **tanpa server** (Mode Lokal) atau **dengan Google Spreadsheet sebagai database** (Mode Cloud).

## 📁 Susunan File

```
firastikashop/
├── index.html        ← struktur halaman
├── css/
│   └── style.css     ← tampilan (tema skincare, mode terang & gelap)
├── js/
│   └── app.js        ← logika aplikasi (engine lokal + sinkron cloud)
├── data/
│   └── config.js     ← pengaturan: mode, URL, akun, & data contoh
├── apps-script.js    ← backend Google Apps Script (untuk Mode Cloud)
└── README.md         ← panduan ini
```

## 🔐 Login

Akun demo (ubah di `data/config.js` bagian `AUTH`):

- Username: **admin**
- Password: **admin123**

## 🚀 Cara Menjalankan

1. Buka `index.html` langsung di browser (klik dua kali), atau letakkan seluruh folder `firastikashop/` di hosting statis (GitHub Pages, Netlify, dll).
2. Login dengan akun di atas.
3. Secara default aplikasi memakai **Mode Lokal** (data tersimpan di browser) bila URL cloud belum diisi — jadi langsung bisa dipakai.

## ☁️ Mengaktifkan Mode Cloud (Google Spreadsheet sebagai Database)

1. Buat **Google Spreadsheet** baru.
2. Menu **Extensions → Apps Script**, hapus kode bawaan, lalu **tempel seluruh isi `apps-script.js`**.
3. Jalankan fungsi **`setup()`** satu kali (pilih `setup` di dropdown lalu klik ▶ Run). Ini membuat sheet **Produk** dan **Transaksi**.
4. **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
5. Salin **URL Web App** (diakhiri `/exec`).
6. Buka aplikasi → menu **Pengaturan** → pilih **☁️ Cloud**, tempel URL, klik **Simpan URL & Muat Ulang**.
   - (Opsional) bisa juga langsung isi `APPS_SCRIPT_URL` di `data/config.js`.

Setelah aktif, seluruh produk & transaksi otomatis tersimpan ke Google Sheet.

## ✨ Fitur

- **Dashboard** — total pemasukan, pengeluaran, laba bersih, nilai stok, grafik arus kas 6 bulan, stok menipis, produk terlaris, transaksi terbaru.
- **Produk & Stok** — tambah/edit/hapus produk, kategori, brand, harga beli/jual, stok minimum, peringatan stok menipis.
- **Penjualan** — **keranjang multi-item**: pelanggan memesan banyak barang sekaligus dalam satu pesanan; stok otomatis berkurang. Plus input pemasukan lain.
- **Pengeluaran** — restock produk (menambah stok) & pengeluaran operasional berkategori.
- **Riwayat** — daftar transaksi, filter tipe & bulan, ekspor **CSV**.
- **Laporan** — rekap bulanan, penjualan per kategori, ringkasan.
- **Pengaturan** — ganti mode penyimpanan, URL Apps Script, ekspor/impor JSON, reset data.
- **Tema** terang & gelap.

## 🗂️ Struktur Data (kolom Sheet)

**Produk**: `ID, Nama, Kategori, Brand, Harga Beli, Harga Jual, Stok, Stok Minimum, Tanggal Dibuat`

**Transaksi**: `ID, Tipe, Kategori, Tanggal, Keterangan, Jumlah, Produk ID, Qty, Order ID`

> Penjualan keranjang menyimpan satu baris transaksi per item dengan `Order ID` yang sama, sehingga satu pesanan berisi banyak barang tetap terlacak.

## 💾 Mode Lokal vs Cloud

| | Mode Lokal | Mode Cloud |
|---|---|---|
| Penyimpanan | Browser (localStorage) | Google Spreadsheet |
| Perlu internet | Tidak | Ya |
| Perlu setup | Tidak | Apps Script + URL |
| Multi-perangkat | Tidak | Ya |

Kedua mode memakai antarmuka & fitur yang sama. Anda bisa berpindah kapan saja lewat menu **Pengaturan**.
