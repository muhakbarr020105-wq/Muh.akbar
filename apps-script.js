/**
 * ====================================================================
 *  AKADEMIKAP — Backend Google Apps Script (Campus Edition)
 * --------------------------------------------------------------------
 *  Sinkronisasi data ke Google Sheets untuk mode "cloud".
 *
 *  CARA PAKAI:
 *  1. Buat Google Spreadsheet baru.
 *  2. Menu Extensions → Apps Script, tempel seluruh kode ini.
 *  3. Jalankan fungsi `setup()` sekali untuk membuat semua sheet.
 *  4. Deploy → New deployment → Web app:
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Salin URL Web App ke APPS_SCRIPT_URL pada data/config.js
 *     atau ke menu Pengaturan → Penyimpanan di aplikasi.
 *
 *  Catatan: data disimpan sebagai 1 kolom JSON per baris (ID, JSON)
 *  sehingga skema fleksibel untuk semua koleksi.
 * ====================================================================
 */

var COLLECTIONS = ['tahunAkademik','mahasiswa','dosen','staf','ruangan','kelas','mataKuliah','jadwal','krs','presensi','pengumuman','kalender','keuangan','nilai'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  COLLECTIONS.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(['ID', 'JSON']);
  });
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(['ID', 'JSON']); }
  return sheet;
}

function readCollection_(name) {
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][1]) continue;
    try { out.push(JSON.parse(values[i][1])); } catch (e) {}
  }
  return out;
}

function findRowIndex_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 1; // 1-based row
  }
  return -1;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getAll';
  try {
    if (action === 'getAll') {
      var data = {};
      COLLECTIONS.forEach(function (name) { data[name] = readCollection_(name); });
      return json_({ status: 'success', data: data });
    }
    if (action === 'getCollection') {
      var name = e.parameter.collection;
      return json_({ status: 'success', data: readCollection_(name) });
    }
    return json_({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    // Format aksi: add/edit/delete + NamaKoleksi (mis. addMahasiswa, editNilai)
    var op = action.replace(/^(add|edit|delete)/, '').charAt(0).toLowerCase() + action.replace(/^(add|edit|delete)/, '').slice(1);
    // Map nama aksi ke nama koleksi yang dipakai aplikasi
    var map = {
      mahasiswa: 'mahasiswa', dosen: 'dosen', staf: 'staf', mataKuliah: 'mataKuliah',
      nilai: 'nilai', jadwal: 'jadwal', krs: 'krs', presensi: 'presensi',
      pengumuman: 'pengumuman', kalender: 'kalender', keuangan: 'keuangan',
      ruangan: 'ruangan', kelas: 'kelas', tahunAkademik: 'tahunAkademik'
    };
    var collection = map[op] || body.collection;
    if (!collection) return json_({ status: 'error', message: 'Unknown collection for action: ' + action });
    var sheet = getSheet_(collection);

    if (action.indexOf('delete') === 0) {
      var rowDel = findRowIndex_(sheet, body.id);
      if (rowDel > -1) sheet.deleteRow(rowDel);
      return json_({ status: 'success' });
    }

    // record lengkap dikirim aplikasi pada field "record" (disarankan)
    var record = body.record || body;
    var id = record.ID || body.id;
    if (action.indexOf('edit') === 0) {
      var rowEdit = findRowIndex_(sheet, id);
      if (rowEdit > -1) { sheet.getRange(rowEdit, 1, 1, 2).setValues([[id, JSON.stringify(record)]]); }
      else { sheet.appendRow([id, JSON.stringify(record)]); }
      return json_({ status: 'success' });
    }
    // add
    sheet.appendRow([id, JSON.stringify(record)]);
    return json_({ status: 'success' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}
