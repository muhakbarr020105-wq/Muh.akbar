/**
 * ============================================================
 *  FIRASTIKASHOP - Google Apps Script Backend (Mode Cloud)
 *  Manajemen Toko Skincare & Makeup
 * ------------------------------------------------------------
 *  Aplikasi web SUDAH berfungsi penuh tanpa backend ini
 *  (Mode Lokal). Gunakan file ini bila ingin menyimpan
 *  data ke Google Spreadsheet (Mode Cloud).
 *
 *  CARA PAKAI:
 *  1. Buat Google Spreadsheet baru.
 *  2. Extensions -> Apps Script, tempel SELURUH kode ini.
 *  3. Jalankan fungsi setup() satu kali (membuat semua sheet).
 *  4. Deploy -> New deployment -> Web app:
 *       Execute as: Me  |  Who has access: Anyone
 *  5. Salin URL (/exec), tempel ke data/config.js (APPS_SCRIPT_URL)
 *     atau lewat menu Pengaturan, lalu aktifkan Mode Cloud.
 * ============================================================
 */

const SHEETS = {
  Produk:    ['ID', 'Nama', 'Kategori', 'Brand', 'Harga Beli', 'Harga Jual', 'Stok', 'Stok Minimum', 'Tanggal Dibuat'],
  Transaksi: ['ID', 'Tipe', 'Kategori', 'Tanggal', 'Keterangan', 'Jumlah', 'Produk ID', 'Qty', 'Order ID']
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clear();
    sheet.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSheet(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getAll';
  try {
    if (action === 'getAll') {
      return jsonOut({ status: 'success', data: {
        produk: readSheet('Produk'),
        transaksi: readSheet('Transaksi')
      }});
    }
    return jsonOut({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const handlers = {
      // Produk
      addProduk:      () => upsertRow('Produk', body.record),
      editProduk:     () => upsertRow('Produk', body.record),
      deleteProduk:   () => deleteRow('Produk', body.id),
      // Transaksi
      addTransaksi:   () => upsertRow('Transaksi', body.record),
      editTransaksi:  () => upsertRow('Transaksi', body.record),
      deleteTransaksi:() => deleteRow('Transaksi', body.id),
      // Pesanan banyak item sekaligus: { items:[record...], produkUpdates:[record...] }
      addOrder:       () => {
        (body.items || []).forEach(r => upsertRow('Transaksi', r));
        (body.produkUpdates || []).forEach(r => upsertRow('Produk', r));
      }
    };
    if (handlers[action]) { handlers[action](); return jsonOut({ status: 'success' }); }
    return jsonOut({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// Tambah baris baru atau perbarui baris lama berdasarkan ID (kolom pertama).
function upsertRow(sheetName, record) {
  if (!record || !record.ID) return;
  const sheet = getSheet(sheetName);
  const headers = SHEETS[sheetName];
  const rowArr = headers.map(h => (record[h] !== undefined && record[h] !== null) ? record[h] : '');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(record.ID)) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowArr]);
      return;
    }
  }
  sheet.appendRow(rowArr);
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); return; }
  }
}
