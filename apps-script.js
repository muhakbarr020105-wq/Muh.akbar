/**
 * ============================================================
 *  AKADEMIKAP — Google Apps Script Backend (opsional / Mode Cloud)
 *  Portal Akademik Administrasi Perkantoran PNUP
 * ------------------------------------------------------------
 *  Aplikasi web SUDAH berfungsi penuh tanpa backend ini
 *  (Mode Lokal). Gunakan file ini hanya bila ingin
 *  menyinkronkan data ke Google Sheets (Mode Cloud).
 *
 *  CARA PAKAI:
 *  1. Buat Google Spreadsheet baru.
 *  2. Extensions → Apps Script, tempel seluruh kode ini.
 *  3. Jalankan setup() sekali untuk membuat semua sheet.
 *  4. Deploy → New deployment → Web app:
 *       Execute as: Me  |  Who has access: Anyone
 *  5. Salin URL (/exec), tempel ke data/config.js (APPS_SCRIPT_URL)
 *     atau ke menu Pengaturan, lalu aktifkan Mode Cloud.
 * ============================================================
 */

const SHEETS = {
  Mahasiswa:  ['ID', 'NIM', 'Nama', 'Angkatan', 'Jenis Kelamin', 'Status', 'Email', 'Tanggal Daftar'],
  Dosen:      ['ID', 'NIDN', 'Nama', 'Jabatan', 'Email', 'Tanggal Daftar'],
  Staf:       ['ID', 'NIP', 'Nama', 'Jabatan', 'Tanggal Daftar'],
  MataKuliah: ['ID', 'Kode', 'Nama Mata Kuliah', 'Semester', 'SKS', 'Dosen Pengampu', 'Tanggal Dibuat'],
  Nilai:      ['ID', 'NIM Mahasiswa', 'Nama Mahasiswa', 'Kode MK', 'Nama Mata Kuliah', 'Semester', 'SKS',
               'Tugas', 'Praktik', 'UTS', 'UAS', 'Absen', 'Skor Mentah', 'Skor Normalisasi', 'Nilai Huruf', 'Bobot IP', 'Tanggal Input']
};

const BOBOT = { tugas: 0.20, praktik: 0.50, uts: 0.25, uas: 0.35, absen: 0.05 };
const TOTAL_BOBOT = 1.35;

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
  if (!sheet) { sheet = ss.insertSheet(name); sheet.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]); }
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

function getGrade(score) {
  if (score >= 85) return { label: 'A',  bobot: 4.0 };
  if (score >= 80) return { label: 'B+', bobot: 3.5 };
  if (score >= 75) return { label: 'B',  bobot: 3.0 };
  if (score >= 70) return { label: 'C+', bobot: 2.5 };
  if (score >= 60) return { label: 'C',  bobot: 2.0 };
  if (score >= 50) return { label: 'D',  bobot: 1.0 };
  return { label: 'E', bobot: 0 };
}

function hitungSkor(tugas, praktik, uts, uas, absen) {
  const skorMentah = (tugas * BOBOT.tugas) + (praktik * BOBOT.praktik) + (uts * BOBOT.uts) + (uas * BOBOT.uas) + (absen * BOBOT.absen);
  const skorNormalisasi = Math.round((skorMentah / TOTAL_BOBOT) * 100) / 100;
  const grade = getGrade(skorNormalisasi);
  return { skorMentah: Math.round(skorMentah * 100) / 100, skorNormalisasi, huruf: grade.label, bobot: grade.bobot };
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getAll';
  try {
    if (action === 'getAll') {
      return jsonOut({ status: 'success', data: {
        mahasiswa: readSheet('Mahasiswa'), dosen: readSheet('Dosen'),
        staf: readSheet('Staf'), mataKuliah: readSheet('MataKuliah'), nilai: readSheet('Nilai')
      }});
    }
    if (action === 'getRapor') return jsonOut({ status: 'success', data: handleGetRapor(e.parameter.nim) });
    return jsonOut({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const handlers = {
      addMahasiswa:   () => addRow('Mahasiswa', ['ID','NIM','Nama','Angkatan','Jenis Kelamin','Status','Email','Tanggal Daftar'], ['MHS', body.nim, body.nama, body.angkatan, body.jenisKelamin, body.status, body.email]),
      editMahasiswa:  () => editRow('Mahasiswa', body.id, { 'NIM': body.nim, 'Nama': body.nama, 'Angkatan': body.angkatan, 'Jenis Kelamin': body.jenisKelamin, 'Status': body.status, 'Email': body.email }),
      deleteMahasiswa:() => deleteRow('Mahasiswa', body.id),
      addDosen:       () => addRow('Dosen', ['ID','NIDN','Nama','Jabatan','Email','Tanggal Daftar'], ['DSN', body.nidn, body.nama, body.jabatan, body.email]),
      editDosen:      () => editRow('Dosen', body.id, { 'NIDN': body.nidn, 'Nama': body.nama, 'Jabatan': body.jabatan, 'Email': body.email }),
      deleteDosen:    () => deleteRow('Dosen', body.id),
      addStaf:        () => addRow('Staf', ['ID','NIP','Nama','Jabatan','Tanggal Daftar'], ['STF', body.nip, body.nama, body.jabatan]),
      editStaf:       () => editRow('Staf', body.id, { 'NIP': body.nip, 'Nama': body.nama, 'Jabatan': body.jabatan }),
      deleteStaf:     () => deleteRow('Staf', body.id),
      addMataKuliah:  () => addRow('MataKuliah', ['ID','Kode','Nama Mata Kuliah','Semester','SKS','Dosen Pengampu','Tanggal Dibuat'], ['MK', body.kode, body.namaMatkul, body.semester, body.sks, body.dosenPengampu]),
      editMataKuliah: () => editRow('MataKuliah', body.id, { 'Kode': body.kode, 'Nama Mata Kuliah': body.namaMatkul, 'Semester': body.semester, 'SKS': body.sks, 'Dosen Pengampu': body.dosenPengampu }),
      deleteMataKuliah:() => deleteRow('MataKuliah', body.id),
      addNilai:       () => addNilai(body),
      editNilai:      () => editNilai(body),
      deleteNilai:    () => deleteRow('Nilai', body.id)
    };
    if (handlers[action]) { handlers[action](); return jsonOut({ status: 'success' }); }
    return jsonOut({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}

function addRow(sheetName, headers, values) {
  const sheet = getSheet(sheetName);
  const id = values[0] + '-' + new Date().getTime();
  const row = headers.map(h => {
    if (h === 'ID') return id;
    if (h === 'Tanggal Daftar' || h === 'Tanggal Dibuat') return new Date().toISOString();
    return '';
  });
  for (let i = 1; i < values.length; i++) row[i] = values[i];
  sheet.appendRow(row);
}

function findRowIndex(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(id)) return i + 1;
  return -1;
}

function editRow(sheetName, id, updates) {
  const sheet = getSheet(sheetName);
  const rowIndex = findRowIndex(sheet, id);
  if (rowIndex === -1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(updates).forEach(key => {
    const col = headers.indexOf(key);
    if (col > -1 && updates[key] !== undefined) sheet.getRange(rowIndex, col + 1).setValue(updates[key]);
  });
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const rowIndex = findRowIndex(sheet, id);
  if (rowIndex > -1) sheet.deleteRow(rowIndex);
}

function addNilai(body) {
  const h = hitungSkor(Number(body.tugas)||0, Number(body.praktik)||0, Number(body.uts)||0, Number(body.uas)||0, Number(body.absen)||0);
  const sheet = getSheet('Nilai');
  sheet.appendRow(['NL-' + new Date().getTime(), body.nim, body.namaMahasiswa, body.kodeMk, body.namaMatkul, body.semester, body.sks,
    body.tugas, body.praktik, body.uts, body.uas, body.absen, h.skorMentah, h.skorNormalisasi, h.huruf, h.bobot, new Date().toISOString()]);
}

function editNilai(body) {
  const h = hitungSkor(Number(body.tugas)||0, Number(body.praktik)||0, Number(body.uts)||0, Number(body.uas)||0, Number(body.absen)||0);
  editRow('Nilai', body.id, {
    'SKS': body.sks, 'Tugas': body.tugas, 'Praktik': body.praktik, 'UTS': body.uts, 'UAS': body.uas, 'Absen': body.absen,
    'Skor Mentah': h.skorMentah, 'Skor Normalisasi': h.skorNormalisasi, 'Nilai Huruf': h.huruf, 'Bobot IP': h.bobot
  });
}

// IPK/IPS berbobot SKS: Σ(bobot × sks) / Σ(sks)
function handleGetRapor(nim) {
  const nilai = readSheet('Nilai').filter(n => String(n['NIM Mahasiswa']) === String(nim));
  const bySem = {};
  nilai.forEach(n => { const s = n.Semester; (bySem[s] = bySem[s] || []).push(n); });
  const ipBerbobot = list => {
    let bs = 0, sks = 0;
    list.forEach(n => { const s = Number(n.SKS) || 1; bs += (Number(n['Bobot IP']) || 0) * s; sks += s; });
    return sks ? Math.round((bs / sks) * 100) / 100 : 0;
  };
  const perSemester = Object.keys(bySem).sort((a, b) => Number(a) - Number(b)).map(sem => ({
    semester: sem, ips: ipBerbobot(bySem[sem]), matkuls: bySem[sem]
  }));
  return { nim, perSemester, ipk: ipBerbobot(nilai), totalMatkul: nilai.length };
}
