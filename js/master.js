// ================================================
//  AKADEMIKAP — MASTER DATA
//  Mahasiswa, Dosen, Staf, Mata Kuliah, Kelas, Ruangan
// ================================================
'use strict';

// Generic form modal builder ------------------------------------
function gv(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function gvt(id) { return gv(id).trim(); }
function formField(f) {
  const req = f.required ? ' <span class="req">*</span>' : '';
  let input;
  if (f.type === 'select') {
    input = `<select id="${f.id}" class="form-select">${(f.options || []).map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value == null ? '' : f.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${f.id}" class="form-input" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}" style="resize:vertical;font-family:inherit;">${esc(f.value == null ? '' : f.value)}</textarea>`;
  } else {
    input = `<input type="${f.type || 'text'}" id="${f.id}" class="form-input" placeholder="${esc(f.placeholder || '')}" value="${esc(f.value == null ? '' : f.value)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`;
  }
  return `<div class="form-group ${f.full ? 'full' : ''}"><label class="form-label">${esc(f.label)}${req}</label>${input}${f.hint ? `<div class="form-hint">${esc(f.hint)}</div>` : ''}</div>`;
}
function buildFormModal(title, sub, fields, submitFn, submitLabel) {
  showModal(`<div class="modal-header"><div class="modal-title">${esc(title)}</div>${sub ? `<div class="modal-sub">${esc(sub)}</div>` : ''}</div>
    <div class="form-grid">${fields.map(formField).join('')}</div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeActiveModal()">Batal</button><button class="btn btn-primary" onclick="${submitFn}">💾 ${esc(submitLabel || 'Simpan')}</button></div>`);
}
function dosenOptions(selected) {
  return [{ value: '', label: '— Pilih Dosen —' }].concat((STATE.data.dosen || []).map(d => ({ value: d.Nama, label: d.Nama })));
}
function kelasOptions() {
  return [{ value: '', label: '— Pilih Kelas —' }].concat((STATE.data.kelas || []).map(k => ({ value: k.Kode, label: k.Kode + ' — ' + k.Nama })));
}

// ================================================ MAHASISWA
async function renderMahasiswaPage() {
  await loadAllData();
  const c = document.getElementById('mahasiswa-content'); if (!c) return;
  c.innerHTML = filterBar('mhs-search', 'Cari nama, NIM, kelas, status...', 'renderMahasiswaTable()', 'Tambah Mahasiswa', 'openMahasiswaModal()') + '<div id="mhs-table-wrap"></div>';
  renderMahasiswaTable();
}
function renderMahasiswaTable() {
  const wrap = document.getElementById('mhs-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.mahasiswa, document.getElementById('mhs-search')?.value || '').sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('🎓', 'Belum ada data mahasiswa', 'Klik “Tambah Mahasiswa” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIM</th><th class="col-left">Nama</th><th>Kelas</th><th>Angkatan</th><th>JK</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(m => `<tr>
      <td class="mono">${esc(m.NIM)}</td>
      <td class="col-left"><strong>${esc(m.Nama)}</strong>${m.Email ? `<br><span style="font-size:10.5px;color:var(--text-muted);">${esc(m.Email)}</span>` : ''}</td>
      <td>${esc(m.Kelas || '-')}</td>
      <td>${esc(m.Angkatan)}</td>
      <td>${esc(m['Jenis Kelamin'] || '-')}</td>
      <td><span class="pill ${m.Status === 'Aktif' ? 'pill-ok' : 'pill-off'}">${esc(m.Status)}</span></td>
      <td><div class="row-actions">
        <button class="btn-row-action" onclick="viewMahasiswa('${m.ID}')" title="Detail">👁️</button>
        <button class="btn-row-action edit" onclick='openMahasiswaModal(${attr(m)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusMahasiswa('${m.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function mhsFields(d) {
  d = d || {};
  return [
    { id: 'mhs-nim', label: 'NIM', required: true, value: d.NIM, placeholder: '322210101' },
    { id: 'mhs-angkatan', label: 'Angkatan', required: true, value: d.Angkatan, placeholder: '2022' },
    { id: 'mhs-nama', label: 'Nama Lengkap', required: true, full: true, value: d.Nama },
    { id: 'mhs-jk', label: 'Jenis Kelamin', type: 'select', value: d['Jenis Kelamin'] || 'L', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
    { id: 'mhs-status', label: 'Status', type: 'select', value: d.Status || 'Aktif', options: ['Aktif', 'Cuti', 'Lulus', 'Non-Aktif'].map(v => ({ value: v, label: v })) },
    { id: 'mhs-kelas', label: 'Kelas', type: 'select', value: d.Kelas, options: kelasOptions() },
    { id: 'mhs-agama', label: 'Agama', type: 'select', value: d.Agama || 'Islam', options: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(v => ({ value: v, label: v })) },
    { id: 'mhs-tempat', label: 'Tempat Lahir', value: d['Tempat Lahir'] },
    { id: 'mhs-tgllahir', label: 'Tanggal Lahir', type: 'date', value: d['Tanggal Lahir'] },
    { id: 'mhs-telepon', label: 'Telepon', value: d.Telepon, placeholder: '0812xxxx' },
    { id: 'mhs-email', label: 'Email', type: 'email', value: d.Email, placeholder: 'nama@student.pnup.ac.id' },
    { id: 'mhs-alamat', label: 'Alamat', type: 'textarea', full: true, value: d.Alamat },
    { id: 'mhs-wali', label: 'Dosen Wali', type: 'select', value: d['Dosen Wali'], options: dosenOptions() },
    { id: 'mhs-namawali', label: 'Nama Orang Tua/Wali', value: d['Nama Wali'] },
    { id: 'mhs-telpwali', label: 'Telepon Orang Tua/Wali', value: d['Telepon Wali'] }
  ];
}
function openMahasiswaModal(data) {
  STATE.editingId = data ? data.ID : null;
  buildFormModal(data ? 'Edit Mahasiswa' : 'Tambah Mahasiswa', 'Lengkapi biodata mahasiswa', mhsFields(data), 'submitMahasiswa()');
}
async function submitMahasiswa() {
  const nim = gvt('mhs-nim'), nama = gvt('mhs-nama'), angkatan = gvt('mhs-angkatan');
  if (!nim || !nama || !angkatan) { showToast('⚠️ NIM, Nama, dan Angkatan wajib diisi', 'warning'); return; }
  const dup = STATE.data.mahasiswa.find(m => String(m.NIM) === nim && m.ID !== STATE.editingId);
  if (dup) { showToast('⚠️ NIM sudah terdaftar', 'warning'); return; }
  const patch = { NIM: nim, Nama: nama, Angkatan: angkatan, 'Jenis Kelamin': gv('mhs-jk'), Status: gv('mhs-status'), Kelas: gv('mhs-kelas'), Agama: gv('mhs-agama'), 'Tempat Lahir': gvt('mhs-tempat'), 'Tanggal Lahir': gv('mhs-tgllahir'), Telepon: gvt('mhs-telepon'), Email: gvt('mhs-email'), Alamat: gvt('mhs-alamat'), 'Dosen Wali': gv('mhs-wali'), 'Nama Wali': gvt('mhs-namawali'), 'Telepon Wali': gvt('mhs-telpwali') };
  if (STATE.editingId) { await dbEdit('mahasiswa', STATE.editingId, patch, 'editMahasiswa'); showToast('✅ Data mahasiswa diperbarui', 'success'); }
  else { await dbAdd('mahasiswa', { ID: nextId('MHS'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addMahasiswa'); showToast('✅ Mahasiswa ditambahkan', 'success'); }
  closeActiveModal(); renderMahasiswaTable();
}
function viewMahasiswa(id) {
  const m = STATE.data.mahasiswa.find(x => String(x.ID) === String(id)); if (!m) return;
  const cells = [
    ['NIM', m.NIM], ['Nama Lengkap', m.Nama], ['Kelas', m.Kelas], ['Angkatan', m.Angkatan],
    ['Jenis Kelamin', m['Jenis Kelamin'] === 'P' ? 'Perempuan' : 'Laki-laki'], ['Agama', m.Agama],
    ['Tempat, Tanggal Lahir', `${m['Tempat Lahir'] || '-'}, ${fmtTanggal(m['Tanggal Lahir'])}`],
    ['Telepon', m.Telepon], ['Email', m.Email], ['Status', m.Status],
    ['Dosen Wali', m['Dosen Wali']], ['Alamat', m.Alamat],
    ['Orang Tua/Wali', m['Nama Wali']], ['Telepon Wali', m['Telepon Wali']]
  ];
  showModal(`<div class="modal-header"><div class="modal-title">Detail Mahasiswa</div><div class="modal-sub">${esc(m.Nama)} · ${esc(m.NIM)}</div></div>
    <div class="info-grid">${cells.map(([l, v]) => `<div class="info-cell"><div class="info-label">${esc(l)}</div><div class="info-value">${esc(v || '-')}</div></div>`).join('')}</div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeActiveModal()">Tutup</button></div>`);
}
async function hapusMahasiswa(id) {
  if (!confirm('Hapus data mahasiswa ini? Data nilai terkait tidak ikut terhapus.')) return;
  await dbDelete('mahasiswa', id, 'deleteMahasiswa'); showToast('🗑️ Mahasiswa dihapus', 'warning'); renderMahasiswaTable();
}

// ================================================ DOSEN
async function renderDosenPage() {
  await loadAllData();
  const c = document.getElementById('dosen-content'); if (!c) return;
  c.innerHTML = filterBar('dsn-search', 'Cari nama, NIDN, jabatan...', 'renderDosenTable()', 'Tambah Dosen', 'openDosenModal()') + '<div id="dsn-table-wrap"></div>';
  renderDosenTable();
}
function renderDosenTable() {
  const wrap = document.getElementById('dsn-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.dosen, document.getElementById('dsn-search')?.value || '').sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('🧑‍🏫', 'Belum ada data dosen', 'Klik “Tambah Dosen” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIDN</th><th class="col-left">Nama</th><th class="col-left">Jabatan</th><th>Pendidikan</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(d => `<tr>
      <td class="mono">${esc(d.NIDN)}</td>
      <td class="col-left"><strong>${esc(d.Nama)}</strong>${d.Email ? `<br><span style="font-size:10.5px;color:var(--text-muted);">${esc(d.Email)}</span>` : ''}</td>
      <td class="col-left">${esc(d.Jabatan || '-')}</td>
      <td>${esc(d.Pendidikan || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openDosenModal(${attr(d)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusDosen('${d.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openDosenModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const d = data || {};
  buildFormModal(data ? 'Edit Dosen' : 'Tambah Dosen', 'Lengkapi data dosen', [
    { id: 'dsn-nidn', label: 'NIDN', required: true, value: d.NIDN, placeholder: '0912345678' },
    { id: 'dsn-jabatan', label: 'Jabatan Fungsional', value: d.Jabatan, placeholder: 'Lektor' },
    { id: 'dsn-nama', label: 'Nama Lengkap & Gelar', required: true, full: true, value: d.Nama },
    { id: 'dsn-pendidikan', label: 'Pendidikan Terakhir', value: d.Pendidikan, placeholder: 'S2 Manajemen' },
    { id: 'dsn-status', label: 'Status', type: 'select', value: d.Status || 'Aktif', options: ['Aktif', 'Tugas Belajar', 'Pensiun'].map(v => ({ value: v, label: v })) },
    { id: 'dsn-telepon', label: 'Telepon', value: d.Telepon },
    { id: 'dsn-email', label: 'Email', type: 'email', full: true, value: d.Email, placeholder: 'nama@pnup.ac.id' }
  ], 'submitDosen()');
}
async function submitDosen() {
  const nidn = gvt('dsn-nidn'), nama = gvt('dsn-nama');
  if (!nidn || !nama) { showToast('⚠️ NIDN dan Nama wajib diisi', 'warning'); return; }
  const patch = { NIDN: nidn, Nama: nama, Jabatan: gvt('dsn-jabatan'), Pendidikan: gvt('dsn-pendidikan'), Status: gv('dsn-status'), Telepon: gvt('dsn-telepon'), Email: gvt('dsn-email') };
  if (STATE.editingId) { await dbEdit('dosen', STATE.editingId, patch, 'editDosen'); showToast('✅ Data dosen diperbarui', 'success'); }
  else { await dbAdd('dosen', { ID: nextId('DSN'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addDosen'); showToast('✅ Dosen ditambahkan', 'success'); }
  closeActiveModal(); renderDosenTable();
}
async function hapusDosen(id) {
  if (!confirm('Hapus data dosen ini?')) return;
  await dbDelete('dosen', id, 'deleteDosen'); showToast('🗑️ Dosen dihapus', 'warning'); renderDosenTable();
}

// ================================================ STAF
async function renderStafPage() {
  await loadAllData();
  const c = document.getElementById('staf-content'); if (!c) return;
  c.innerHTML = filterBar('stf-search', 'Cari nama, NIP, jabatan...', 'renderStafTable()', 'Tambah Staf', 'openStafModal()') + '<div id="stf-table-wrap"></div>';
  renderStafTable();
}
function renderStafTable() {
  const wrap = document.getElementById('stf-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.staf, document.getElementById('stf-search')?.value || '').sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('👥', 'Belum ada data staf', 'Klik “Tambah Staf” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIP</th><th class="col-left">Nama</th><th class="col-left">Jabatan</th><th>Telepon</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(s => `<tr>
      <td class="mono">${esc(s.NIP || '-')}</td>
      <td class="col-left"><strong>${esc(s.Nama)}</strong></td>
      <td class="col-left">${esc(s.Jabatan)}</td>
      <td>${esc(s.Telepon || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openStafModal(${attr(s)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusStaf('${s.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openStafModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const s = data || {};
  buildFormModal(data ? 'Edit Staf' : 'Tambah Staf', 'Lengkapi data staf', [
    { id: 'stf-nip', label: 'NIP', value: s.NIP },
    { id: 'stf-jabatan', label: 'Jabatan', required: true, value: s.Jabatan, placeholder: 'Staf Akademik' },
    { id: 'stf-nama', label: 'Nama Lengkap', required: true, full: true, value: s.Nama },
    { id: 'stf-telepon', label: 'Telepon', value: s.Telepon },
    { id: 'stf-email', label: 'Email', type: 'email', value: s.Email }
  ], 'submitStaf()');
}
async function submitStaf() {
  const nama = gvt('stf-nama'), jabatan = gvt('stf-jabatan');
  if (!nama || !jabatan) { showToast('⚠️ Nama dan Jabatan wajib diisi', 'warning'); return; }
  const patch = { NIP: gvt('stf-nip'), Nama: nama, Jabatan: jabatan, Telepon: gvt('stf-telepon'), Email: gvt('stf-email') };
  if (STATE.editingId) { await dbEdit('staf', STATE.editingId, patch, 'editStaf'); showToast('✅ Data staf diperbarui', 'success'); }
  else { await dbAdd('staf', { ID: nextId('STF'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addStaf'); showToast('✅ Staf ditambahkan', 'success'); }
  closeActiveModal(); renderStafTable();
}
async function hapusStaf(id) {
  if (!confirm('Hapus data staf ini?')) return;
  await dbDelete('staf', id, 'deleteStaf'); showToast('🗑️ Staf dihapus', 'warning'); renderStafTable();
}

// ================================================ MATA KULIAH
async function renderMatkulPage() {
  await loadAllData();
  const c = document.getElementById('matkul-content'); if (!c) return;
  c.innerHTML = filterBar('mk-search', 'Cari kode, nama, dosen...', 'renderMatkulTable()', 'Tambah Mata Kuliah', 'openMatkulModal()') + '<div id="mk-table-wrap"></div>';
  renderMatkulTable();
}
function renderMatkulTable() {
  const wrap = document.getElementById('mk-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.mataKuliah, document.getElementById('mk-search')?.value || '').sort((a, b) => Number(a.Semester) - Number(b.Semester) || String(a.Kode).localeCompare(String(b.Kode)));
  if (!rows.length) { wrap.innerHTML = emptyState('📚', 'Belum ada mata kuliah', 'Klik “Tambah Mata Kuliah” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>Kode</th><th class="col-left">Nama Mata Kuliah</th><th>SKS</th><th>Smt</th><th>Jenis</th><th class="col-left">Dosen Pengampu</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(m => `<tr>
      <td class="mono">${esc(m.Kode)}</td>
      <td class="col-left"><strong>${esc(m['Nama Mata Kuliah'])}</strong></td>
      <td><strong>${esc(m.SKS || '-')}</strong></td>
      <td>${esc(m.Semester)}</td>
      <td><span class="chip ${m.Jenis === 'Pilihan' ? 'chip-violet' : 'chip-info'}">${esc(m.Jenis || 'Wajib')}</span></td>
      <td class="col-left">${esc(m['Dosen Pengampu'] || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openMatkulModal(${attr(m)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusMatkul('${m.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openMatkulModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const m = data || {};
  buildFormModal(data ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah', 'Lengkapi data mata kuliah', [
    { id: 'mk-kode', label: 'Kode', required: true, value: m.Kode, placeholder: 'AP101' },
    { id: 'mk-sks', label: 'SKS', type: 'number', required: true, value: m.SKS, min: 1, max: 6 },
    { id: 'mk-nama', label: 'Nama Mata Kuliah', required: true, full: true, value: m['Nama Mata Kuliah'] },
    { id: 'mk-semester', label: 'Semester', type: 'number', required: true, value: m.Semester, min: 1, max: 14 },
    { id: 'mk-jenis', label: 'Jenis', type: 'select', value: m.Jenis || 'Wajib', options: ['Wajib', 'Pilihan'].map(v => ({ value: v, label: v })) },
    { id: 'mk-dosen', label: 'Dosen Pengampu', type: 'select', full: true, value: m['Dosen Pengampu'], options: dosenOptions() }
  ], 'submitMatkul()');
}
async function submitMatkul() {
  const kode = gvt('mk-kode'), nama = gvt('mk-nama'), sks = Number(gv('mk-sks')), semester = gvt('mk-semester');
  if (!kode || !nama || !semester || !sks) { showToast('⚠️ Kode, Nama, SKS, dan Semester wajib diisi', 'warning'); return; }
  const patch = { Kode: kode, 'Nama Mata Kuliah': nama, SKS: sks, Semester: semester, Jenis: gv('mk-jenis'), 'Dosen Pengampu': gv('mk-dosen') };
  if (STATE.editingId) { await dbEdit('mataKuliah', STATE.editingId, patch, 'editMataKuliah'); showToast('✅ Mata kuliah diperbarui', 'success'); }
  else { await dbAdd('mataKuliah', { ID: nextId('MK'), ...patch, 'Tanggal Dibuat': new Date().toISOString() }, 'addMataKuliah'); showToast('✅ Mata kuliah ditambahkan', 'success'); }
  closeActiveModal(); renderMatkulTable();
}
async function hapusMatkul(id) {
  if (!confirm('Hapus data mata kuliah ini?')) return;
  await dbDelete('mataKuliah', id, 'deleteMataKuliah'); showToast('🗑️ Mata kuliah dihapus', 'warning'); renderMatkulTable();
}

// ================================================ KELAS
async function renderKelasPage() {
  await loadAllData();
  const c = document.getElementById('kelas-content'); if (!c) return;
  c.innerHTML = filterBar('kls-search', 'Cari kode, nama, angkatan...', 'renderKelasTable()', 'Tambah Kelas', 'openKelasModal()') + '<div id="kls-table-wrap"></div>';
  renderKelasTable();
}
function renderKelasTable() {
  const wrap = document.getElementById('kls-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.kelas, document.getElementById('kls-search')?.value || '').sort((a, b) => String(a.Kode).localeCompare(String(b.Kode)));
  if (!rows.length) { wrap.innerHTML = emptyState('🏫', 'Belum ada kelas', 'Klik “Tambah Kelas” untuk menambahkan rombongan belajar'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>Kode</th><th class="col-left">Nama Kelas</th><th>Angkatan</th><th class="col-left">Dosen Wali</th><th>Jml Mhs</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(k => { const jml = (STATE.data.mahasiswa || []).filter(m => m.Kelas === k.Kode).length; return `<tr>
      <td class="mono">${esc(k.Kode)}</td>
      <td class="col-left"><strong>${esc(k.Nama)}</strong></td>
      <td>${esc(k.Angkatan || '-')}</td>
      <td class="col-left">${esc(k['Dosen Wali'] || '-')}</td>
      <td><span class="chip chip-info">${jml}</span></td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openKelasModal(${attr(k)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusKelas('${k.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`; }).join('')}
    </tbody></table></div>`;
}
function openKelasModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const k = data || {};
  buildFormModal(data ? 'Edit Kelas' : 'Tambah Kelas', 'Rombongan belajar', [
    { id: 'kls-kode', label: 'Kode Kelas', required: true, value: k.Kode, placeholder: 'AP-2A' },
    { id: 'kls-angkatan', label: 'Angkatan', value: k.Angkatan, placeholder: '2022' },
    { id: 'kls-nama', label: 'Nama Kelas', required: true, full: true, value: k.Nama, placeholder: 'Administrasi Perkantoran 2A' },
    { id: 'kls-wali', label: 'Dosen Wali', type: 'select', full: true, value: k['Dosen Wali'], options: dosenOptions() }
  ], 'submitKelas()');
}
async function submitKelas() {
  const kode = gvt('kls-kode'), nama = gvt('kls-nama');
  if (!kode || !nama) { showToast('⚠️ Kode dan Nama kelas wajib diisi', 'warning'); return; }
  const patch = { Kode: kode, Nama: nama, Angkatan: gvt('kls-angkatan'), 'Dosen Wali': gv('kls-wali') };
  if (STATE.editingId) { await dbEdit('kelas', STATE.editingId, patch); showToast('✅ Kelas diperbarui', 'success'); }
  else { await dbAdd('kelas', { ID: nextId('KLS'), ...patch }); showToast('✅ Kelas ditambahkan', 'success'); }
  closeActiveModal(); renderKelasTable();
}
async function hapusKelas(id) {
  if (!confirm('Hapus kelas ini?')) return;
  await dbDelete('kelas', id); showToast('🗑️ Kelas dihapus', 'warning'); renderKelasTable();
}

// ================================================ RUANGAN
async function renderRuanganPage() {
  await loadAllData();
  const c = document.getElementById('ruangan-content'); if (!c) return;
  c.innerHTML = filterBar('rng-search', 'Cari kode, nama, gedung...', 'renderRuanganTable()', 'Tambah Ruangan', 'openRuanganModal()') + '<div id="rng-table-wrap"></div>';
  renderRuanganTable();
}
function renderRuanganTable() {
  const wrap = document.getElementById('rng-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.ruangan, document.getElementById('rng-search')?.value || '').sort((a, b) => String(a.Kode).localeCompare(String(b.Kode)));
  if (!rows.length) { wrap.innerHTML = emptyState('🚪', 'Belum ada ruangan', 'Klik “Tambah Ruangan” untuk menambahkan ruang'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>Kode</th><th class="col-left">Nama Ruangan</th><th>Gedung</th><th>Jenis</th><th>Kapasitas</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td class="mono">${esc(r.Kode)}</td>
      <td class="col-left"><strong>${esc(r.Nama)}</strong></td>
      <td>${esc(r.Gedung || '-')}</td>
      <td><span class="chip ${r.Jenis === 'Laboratorium' ? 'chip-cyan' : 'chip-info'}">${esc(r.Jenis || 'Kelas')}</span></td>
      <td>${esc(r.Kapasitas || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openRuanganModal(${attr(r)})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusRuangan('${r.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openRuanganModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const r = data || {};
  buildFormModal(data ? 'Edit Ruangan' : 'Tambah Ruangan', 'Ruang kuliah / laboratorium', [
    { id: 'rng-kode', label: 'Kode', required: true, value: r.Kode, placeholder: 'AP-101' },
    { id: 'rng-kapasitas', label: 'Kapasitas', type: 'number', value: r.Kapasitas, min: 1 },
    { id: 'rng-nama', label: 'Nama Ruangan', required: true, full: true, value: r.Nama },
    { id: 'rng-gedung', label: 'Gedung', value: r.Gedung, placeholder: 'Gedung AN' },
    { id: 'rng-jenis', label: 'Jenis', type: 'select', value: r.Jenis || 'Kelas', options: ['Kelas', 'Laboratorium', 'Aula', 'Ruang Rapat'].map(v => ({ value: v, label: v })) }
  ], 'submitRuangan()');
}
async function submitRuangan() {
  const kode = gvt('rng-kode'), nama = gvt('rng-nama');
  if (!kode || !nama) { showToast('⚠️ Kode dan Nama ruangan wajib diisi', 'warning'); return; }
  const patch = { Kode: kode, Nama: nama, Gedung: gvt('rng-gedung'), Jenis: gv('rng-jenis'), Kapasitas: Number(gv('rng-kapasitas')) || '' };
  if (STATE.editingId) { await dbEdit('ruangan', STATE.editingId, patch); showToast('✅ Ruangan diperbarui', 'success'); }
  else { await dbAdd('ruangan', { ID: nextId('RNG'), ...patch }); showToast('✅ Ruangan ditambahkan', 'success'); }
  closeActiveModal(); renderRuanganTable();
}
async function hapusRuangan(id) {
  if (!confirm('Hapus ruangan ini?')) return;
  await dbDelete('ruangan', id); showToast('🗑️ Ruangan dihapus', 'warning'); renderRuanganTable();
}
