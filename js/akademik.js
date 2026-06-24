// ================================================
//  AKADEMIKAP — AKADEMIK
//  Jadwal, KRS, Presensi, Input Nilai, Rapor/KHS, Transkrip
// ================================================
'use strict';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function matkulOptions(forDosen) {
  let list = STATE.data.mataKuliah || [];
  if (forDosen) { const n = currentDosenNama(); list = list.filter(m => m['Dosen Pengampu'] === n); }
  return [{ value: '', label: '— Pilih Mata Kuliah —' }].concat(list.map(m => ({ value: m.Kode, label: m.Kode + ' — ' + m['Nama Mata Kuliah'] })));
}
function ruanganOptions() { return [{ value: '', label: '— Pilih Ruangan —' }].concat((STATE.data.ruangan || []).map(r => ({ value: r.Kode, label: r.Kode + ' — ' + r.Nama }))); }
function taOptions() { const list = STATE.data.tahunAkademik || []; return list.map(t => ({ value: t.Kode, label: t.Kode + (t.Status === 'Aktif' ? ' (Aktif)' : '') })); }
function matkulByKode(kode) { return (STATE.data.mataKuliah || []).find(m => m.Kode === kode); }

// ================================================ JADWAL KULIAH
async function renderJadwal() {
  await loadAllData();
  const c = document.getElementById('jadwal-content'); if (!c) return;
  const role = currentRole();
  const canEdit = role === 'admin';
  let header = pageHeader('Akademik', 'Jadwal Kuliah', `Tahun akademik aktif: ${activeTAKode()}`, canEdit ? '<button class="btn btn-primary" onclick="openJadwalModal()">➕ Tambah Jadwal</button>' : '');
  let list = (STATE.data.jadwal || []).slice();
  if (role === 'dosen') { const n = currentDosenNama(); list = list.filter(j => j.Dosen === n); }
  if (role === 'mahasiswa') { const m = currentMahasiswa(); const kelas = m ? m.Kelas : null; list = list.filter(j => !kelas || j.Kelas === kelas); }
  if (!list.length) { c.innerHTML = header + emptyState('📅', 'Belum ada jadwal', role === 'admin' ? 'Klik “Tambah Jadwal” untuk menyusun jadwal kuliah' : 'Jadwal belum tersedia untuk Anda'); return; }
  const byDay = {};
  HARI.forEach(h => byDay[h] = []);
  list.forEach(j => { (byDay[j.Hari] = byDay[j.Hari] || []).push(j); });
  let grid = '<div class="sched-grid">';
  HARI.forEach(h => {
    const items = (byDay[h] || []).sort((a, b) => String(a['Jam Mulai']).localeCompare(String(b['Jam Mulai'])));
    grid += `<div class="sched-day"><div class="sched-day-head">${h}<span class="chip chip-info">${items.length}</span></div><div class="sched-day-body">`;
    if (!items.length) grid += '<div class="sched-empty">Tidak ada kelas</div>';
    items.forEach(j => {
      grid += `<div class="sched-item"><div class="sched-time">⏰ ${esc(j['Jam Mulai'])}–${esc(j['Jam Selesai'])}</div>
        <div class="sched-mk">${esc(j['Nama Mata Kuliah'])}</div>
        <div class="sched-meta">🏫 ${esc(j.Kelas || '-')} · 🚪 ${esc(j.Ruangan || '-')}</div>
        <div class="sched-meta">🧑‍🏫 ${esc(j.Dosen || '-')}</div>
        ${canEdit ? `<div class="row-actions" style="margin-top:6px;"><button class="btn-row-action edit" onclick='openJadwalModal(${attr(j)})'>✏️</button><button class="btn-row-action delete" onclick="hapusJadwal('${j.ID}')">🗑️</button></div>` : ''}
      </div>`;
    });
    grid += '</div></div>';
  });
  grid += '</div>';
  c.innerHTML = header + grid;
}
function openJadwalModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const j = data || {};
  buildFormModal(data ? 'Edit Jadwal' : 'Tambah Jadwal', 'Susun jadwal perkuliahan', [
    { id: 'jdw-hari', label: 'Hari', type: 'select', value: j.Hari || 'Senin', options: HARI.map(h => ({ value: h, label: h })) },
    { id: 'jdw-kelas', label: 'Kelas', type: 'select', value: j.Kelas, options: kelasOptions() },
    { id: 'jdw-mulai', label: 'Jam Mulai', type: 'time', value: j['Jam Mulai'] || '08:00' },
    { id: 'jdw-selesai', label: 'Jam Selesai', type: 'time', value: j['Jam Selesai'] || '10:30' },
    { id: 'jdw-mk', label: 'Mata Kuliah', type: 'select', full: true, value: j['Kode MK'], options: matkulOptions(false) },
    { id: 'jdw-dosen', label: 'Dosen', type: 'select', value: j.Dosen, options: dosenOptions() },
    { id: 'jdw-ruangan', label: 'Ruangan', type: 'select', value: j.Ruangan, options: ruanganOptions() },
    { id: 'jdw-ta', label: 'Tahun Akademik', type: 'select', full: true, value: j['Tahun Akademik'] || activeTAKode(), options: taOptions() }
  ], 'submitJadwal()');
}
async function submitJadwal() {
  const kode = gv('jdw-mk'); const mk = matkulByKode(kode);
  if (!kode) { showToast('⚠️ Pilih mata kuliah', 'warning'); return; }
  const patch = { Hari: gv('jdw-hari'), Kelas: gv('jdw-kelas'), 'Jam Mulai': gv('jdw-mulai'), 'Jam Selesai': gv('jdw-selesai'), 'Kode MK': kode, 'Nama Mata Kuliah': mk ? mk['Nama Mata Kuliah'] : kode, Dosen: gv('jdw-dosen'), Ruangan: gv('jdw-ruangan'), 'Tahun Akademik': gv('jdw-ta') };
  if (STATE.editingId) { await dbEdit('jadwal', STATE.editingId, patch); showToast('✅ Jadwal diperbarui', 'success'); }
  else { await dbAdd('jadwal', { ID: nextId('JDW'), ...patch }); showToast('✅ Jadwal ditambahkan', 'success'); }
  closeActiveModal(); renderJadwal();
}
async function hapusJadwal(id) { if (!confirm('Hapus jadwal ini?')) return; await dbDelete('jadwal', id); showToast('🗑️ Jadwal dihapus', 'warning'); renderJadwal(); }

// ================================================ KRS
async function renderKrs() {
  await loadAllData();
  const c = document.getElementById('krs-content'); if (!c) return;
  const role = currentRole();
  const ta = activeTAKode();
  if (role === 'mahasiswa') {
    const m = currentMahasiswa(); if (!m) { c.innerHTML = emptyState('⚠️', 'Data mahasiswa tidak ditemukan', 'Hubungi admin'); return; }
    const mine = (STATE.data.krs || []).filter(k => String(k.NIM) === String(m.NIM) && k['Tahun Akademik'] === ta);
    const totalSks = mine.reduce((s, k) => s + (Number(k.SKS) || 0), 0);
    c.innerHTML = pageHeader('Akademik', 'Kartu Rencana Studi (KRS)', `${m.Nama} · ${ta}`, '<button class="btn btn-primary" onclick="openKrsModal()">➕ Ambil Mata Kuliah</button>') +
      `<div class="kpi-grid" style="margin-bottom:18px;"><div class="ministat"><div class="ministat-ic">📝</div><div><div class="ministat-val">${mine.length}</div><div class="ministat-lbl">Mata Kuliah Diambil</div></div></div><div class="ministat"><div class="ministat-ic">📘</div><div><div class="ministat-val">${totalSks}</div><div class="ministat-lbl">Total SKS</div></div></div></div>` +
      krsTable(mine, true);
    return;
  }
  // admin: rekap semua KRS
  const all = (STATE.data.krs || []).filter(k => k['Tahun Akademik'] === ta);
  c.innerHTML = pageHeader('Akademik', 'Rekap KRS', `Tahun akademik aktif: ${ta}`, '') + krsTable(all, false);
}
function krsTable(rows, ownerView) {
  if (!rows.length) return emptyState('📝', 'Belum ada KRS', ownerView ? 'Klik “Ambil Mata Kuliah” untuk menyusun rencana studi' : 'Belum ada mahasiswa yang mengisi KRS');
  return `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr>${ownerView ? '' : '<th class="col-left">Mahasiswa</th>'}<th>Kode</th><th class="col-left">Mata Kuliah</th><th>SKS</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(k => `<tr>
      ${ownerView ? '' : `<td class="col-left"><strong>${esc(k.Nama)}</strong><br><span style="font-size:10.5px;color:var(--text-muted);">${esc(k.NIM)}</span></td>`}
      <td class="mono">${esc(k['Kode MK'])}</td>
      <td class="col-left">${esc(k['Nama Mata Kuliah'])}</td>
      <td><strong>${esc(k.SKS)}</strong></td>
      <td><span class="chip ${k.Status === 'Disetujui' ? 'chip-ok' : 'chip-warn'}">${esc(k.Status)}</span></td>
      <td><div class="row-actions">
        ${currentRole() === 'admin' && k.Status !== 'Disetujui' ? `<button class="btn-row-action" onclick="setujuiKrs('${k.ID}')" title="Setujui">✅</button>` : ''}
        <button class="btn-row-action delete" onclick="hapusKrs('${k.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openKrsModal() {
  const m = currentMahasiswa(); if (!m) return;
  buildFormModal('Ambil Mata Kuliah', 'Tambahkan mata kuliah ke KRS', [
    { id: 'krs-mk', label: 'Mata Kuliah', type: 'select', full: true, value: '', options: matkulOptions(false) }
  ], 'submitKrs()');
}
async function submitKrs() {
  const m = currentMahasiswa(); if (!m) return;
  const kode = gv('krs-mk'); const mk = matkulByKode(kode);
  if (!kode || !mk) { showToast('⚠️ Pilih mata kuliah', 'warning'); return; }
  const ta = activeTAKode();
  if ((STATE.data.krs || []).some(k => String(k.NIM) === String(m.NIM) && k['Kode MK'] === kode && k['Tahun Akademik'] === ta)) { showToast('⚠️ Mata kuliah sudah ada di KRS', 'warning'); return; }
  await dbAdd('krs', { ID: nextId('KRS'), NIM: m.NIM, Nama: m.Nama, 'Tahun Akademik': ta, 'Kode MK': kode, 'Nama Mata Kuliah': mk['Nama Mata Kuliah'], SKS: mk.SKS, Status: 'Menunggu', Tanggal: new Date().toISOString() });
  showToast('✅ Mata kuliah ditambahkan ke KRS', 'success'); closeActiveModal(); renderKrs();
}
async function setujuiKrs(id) { await dbEdit('krs', id, { Status: 'Disetujui' }); showToast('✅ KRS disetujui', 'success'); renderKrs(); }
async function hapusKrs(id) { if (!confirm('Hapus mata kuliah dari KRS?')) return; await dbDelete('krs', id); showToast('🗑️ Dihapus dari KRS', 'warning'); renderKrs(); }

// ================================================ PRESENSI
async function renderPresensi() {
  await loadAllData();
  const c = document.getElementById('presensi-content'); if (!c) return;
  const role = currentRole();
  if (role === 'mahasiswa') {
    const m = currentMahasiswa(); if (!m) { c.innerHTML = emptyState('⚠️', 'Data tidak ditemukan', ''); return; }
    const recs = [];
    (STATE.data.presensi || []).forEach(p => { (p.Rekap || []).forEach(r => { if (String(r.NIM) === String(m.NIM)) recs.push({ ...p, status: r.Status }); }); });
    const count = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    recs.forEach(r => count[r.status] = (count[r.status] || 0) + 1);
    const total = recs.length || 1;
    c.innerHTML = pageHeader('Akademik', 'Rekap Kehadiran Saya', m.Nama, '') +
      `<div class="kpi-grid" style="margin-bottom:18px;">
        <div class="ministat"><div class="ministat-ic" style="background:rgba(5,150,105,.12);">✅</div><div><div class="ministat-val">${count.Hadir}</div><div class="ministat-lbl">Hadir</div></div></div>
        <div class="ministat"><div class="ministat-ic" style="background:rgba(217,119,6,.13);">✋</div><div><div class="ministat-val">${count.Izin}</div><div class="ministat-lbl">Izin</div></div></div>
        <div class="ministat"><div class="ministat-ic" style="background:rgba(8,145,178,.13);">🤒</div><div><div class="ministat-val">${count.Sakit}</div><div class="ministat-lbl">Sakit</div></div></div>
        <div class="ministat"><div class="ministat-ic" style="background:rgba(225,29,72,.12);">❌</div><div><div class="ministat-val">${count.Alpa}</div><div class="ministat-lbl">Alpa</div></div></div>
      </div>
      <div class="card"><div class="card-body"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;"><span>Persentase Kehadiran</span><strong>${Math.round(count.Hadir / total * 100)}%</strong></div><div class="progress"><div class="progress-fill" style="width:${Math.round(count.Hadir / total * 100)}%"></div></div></div></div>` +
      (recs.length ? `<div class="table-container" style="margin-top:16px;"><table class="data-table data-table-center"><thead><tr><th>Tanggal</th><th class="col-left">Mata Kuliah</th><th>Pertemuan</th><th>Status</th></tr></thead><tbody>${recs.sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))).map(r => `<tr><td>${fmtTanggalSingkat(r.Tanggal)}</td><td class="col-left">${esc(r['Nama Mata Kuliah'])}</td><td>${esc(r.Pertemuan)}</td><td><span class="chip chip-${r.status === 'Hadir' ? 'ok' : r.status === 'Alpa' ? 'bad' : 'warn'}">${esc(r.status)}</span></td></tr>`).join('')}</tbody></table></div>` : emptyState('✅', 'Belum ada data presensi', ''));
    return;
  }
  // admin/dosen: list sessions
  let sessions = (STATE.data.presensi || []).slice();
  if (role === 'dosen') { const n = currentDosenNama(); sessions = sessions.filter(p => p.Dosen === n); }
  sessions.sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)));
  let header = pageHeader('Akademik', 'Presensi Perkuliahan', 'Catat & kelola kehadiran mahasiswa', '<button class="btn btn-primary" onclick="openPresensiModal()">➕ Buat Sesi Presensi</button>');
  c.innerHTML = header + (sessions.length ? `<div class="table-container"><table class="data-table data-table-center"><thead><tr><th>Tanggal</th><th class="col-left">Mata Kuliah</th><th>Kelas</th><th>Pertemuan</th><th>Hadir</th><th>Aksi</th></tr></thead><tbody>${sessions.map(p => { const hadir = (p.Rekap || []).filter(r => r.Status === 'Hadir').length; const tot = (p.Rekap || []).length; return `<tr><td>${fmtTanggalSingkat(p.Tanggal)}</td><td class="col-left"><strong>${esc(p['Nama Mata Kuliah'])}</strong></td><td>${esc(p.Kelas || '-')}</td><td>${esc(p.Pertemuan)}</td><td><span class="chip chip-info">${hadir}/${tot}</span></td><td><div class="row-actions"><button class="btn-row-action edit" onclick="openPresensiDetail('${p.ID}')" title="Isi/Edit">✏️</button><button class="btn-row-action delete" onclick="hapusPresensi('${p.ID}')" title="Hapus">🗑️</button></div></td></tr>`; }).join('')}</tbody></table></div>` : emptyState('✅', 'Belum ada sesi presensi', 'Klik “Buat Sesi Presensi” untuk memulai'));
}
function openPresensiModal() {
  const role = currentRole();
  buildFormModal('Buat Sesi Presensi', 'Tentukan kelas & pertemuan', [
    { id: 'prs-tanggal', label: 'Tanggal', type: 'date', required: true, value: new Date().toISOString().slice(0, 10) },
    { id: 'prs-pertemuan', label: 'Pertemuan ke-', type: 'number', value: 1, min: 1, max: 16 },
    { id: 'prs-mk', label: 'Mata Kuliah', type: 'select', full: true, value: '', options: matkulOptions(role === 'dosen') },
    { id: 'prs-kelas', label: 'Kelas', type: 'select', full: true, value: '', options: kelasOptions() }
  ], 'submitPresensi()');
}
async function submitPresensi() {
  const kode = gv('prs-mk'); const mk = matkulByKode(kode); const kelas = gv('prs-kelas');
  if (!kode || !mk) { showToast('⚠️ Pilih mata kuliah', 'warning'); return; }
  const mhs = (STATE.data.mahasiswa || []).filter(m => !kelas || m.Kelas === kelas);
  const rekap = mhs.map(m => ({ NIM: m.NIM, Nama: m.Nama, Status: 'Hadir' }));
  const dosenNama = currentRole() === 'dosen' ? currentDosenNama() : (mk['Dosen Pengampu'] || '');
  const rec = { ID: nextId('PRS'), Tanggal: gv('prs-tanggal'), Pertemuan: Number(gv('prs-pertemuan')) || 1, 'Kode MK': kode, 'Nama Mata Kuliah': mk['Nama Mata Kuliah'], Kelas: kelas, Dosen: dosenNama, 'Tahun Akademik': activeTAKode(), Rekap: rekap };
  await dbAdd('presensi', rec); showToast('✅ Sesi presensi dibuat', 'success'); closeActiveModal(); openPresensiDetail(rec.ID);
}
function openPresensiDetail(id) {
  const p = (STATE.data.presensi || []).find(x => String(x.ID) === String(id)); if (!p) return;
  const opts = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
  const rows = (p.Rekap || []).map((r, i) => `<div class="att-row"><div class="att-name"><strong>${esc(r.Nama)}</strong><br><span style="font-size:10.5px;color:var(--text-muted);">${esc(r.NIM)}</span></div><div class="att-opts" data-idx="${i}">${opts.map(o => `<button type="button" class="att-opt ${r.Status === o ? 'sel-' + o : ''}" onclick="pickAtt(this,${i},'${o}')">${o}</button>`).join('')}</div></div>`).join('');
  showModal(`<div class="modal-header"><div class="modal-title">Presensi · ${esc(p['Nama Mata Kuliah'])}</div><div class="modal-sub">${fmtTanggal(p.Tanggal)} · Kelas ${esc(p.Kelas || '-')} · Pertemuan ${esc(p.Pertemuan)}</div></div>
    <div id="att-list" data-id="${p.ID}" style="max-height:50vh;overflow:auto;">${rows || '<div class="sched-empty">Tidak ada mahasiswa di kelas ini</div>'}</div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeActiveModal()">Tutup</button><button class="btn btn-primary" onclick="simpanPresensi('${p.ID}')">💾 Simpan Presensi</button></div>`);
}
function pickAtt(btn, idx, status) {
  const group = btn.parentElement;
  group.querySelectorAll('.att-opt').forEach(b => b.className = 'att-opt');
  btn.className = 'att-opt sel-' + status;
  group.setAttribute('data-status', status);
}
async function simpanPresensi(id) {
  const p = (STATE.data.presensi || []).find(x => String(x.ID) === String(id)); if (!p) return;
  document.querySelectorAll('#att-list .att-opts').forEach(group => {
    const idx = Number(group.getAttribute('data-idx'));
    const sel = group.querySelector('.att-opt[class*="sel-"]');
    if (p.Rekap[idx]) p.Rekap[idx].Status = sel ? sel.textContent : 'Alpa';
  });
  await dbEdit('presensi', id, { Rekap: p.Rekap }); showToast('✅ Presensi disimpan', 'success'); closeActiveModal(); renderPresensi();
}
async function hapusPresensi(id) { if (!confirm('Hapus sesi presensi ini?')) return; await dbDelete('presensi', id); showToast('🗑️ Sesi presensi dihapus', 'warning'); renderPresensi(); }

// ================================================ INPUT NILAI
async function renderNilaiPage() {
  await loadAllData();
  const c = document.getElementById('nilai-content'); if (!c) return;
  c.innerHTML = filterBar('nl-search', 'Cari mahasiswa, NIM, mata kuliah...', 'renderNilaiTable()', 'Input Nilai', 'openNilaiModal()') +
    `<div class="card" style="margin-bottom:16px;"><div class="card-body" style="font-size:11.5px;color:var(--text-secondary);">💡 Skor akhir = (Tugas×0,20 + Praktik×0,50 + UTS×0,25 + UAS×0,35 + Absen×0,05) ÷ 1,35, lalu dikonversi ke nilai huruf & bobot IP secara otomatis.</div></div>` +
    '<div id="nl-table-wrap"></div>';
  renderNilaiTable();
}
function renderNilaiTable() {
  const wrap = document.getElementById('nl-table-wrap'); if (!wrap) return;
  let rows = STATE.data.nilai.slice();
  if (currentRole() === 'dosen') { const n = currentDosenNama(); const myKode = (STATE.data.mataKuliah || []).filter(m => m['Dosen Pengampu'] === n).map(m => m.Kode); rows = rows.filter(r => myKode.includes(r['Kode MK'])); }
  rows = filterList(rows, document.getElementById('nl-search')?.value || '');
  rows.forEach(recalcNilaiRow);
  if (!rows.length) { wrap.innerHTML = emptyState('✍️', 'Belum ada nilai', 'Klik “Input Nilai” untuk menambahkan'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th class="col-left">Mahasiswa</th><th class="col-left">Mata Kuliah</th><th>SKS</th><th>Tgs</th><th>Prak</th><th>UTS</th><th>UAS</th><th>Abs</th><th>Skor</th><th>Huruf</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(n => { const g = getGrade(n['Skor Normalisasi']); return `<tr>
      <td class="col-left"><strong>${esc(n['Nama Mahasiswa'])}</strong><br><span style="font-size:10.5px;color:var(--text-muted);">${esc(n['NIM Mahasiswa'])}</span></td>
      <td class="col-left">${esc(n['Nama Mata Kuliah'])}<br><span style="font-size:10.5px;color:var(--text-muted);">${esc(n['Kode MK'])} · Smt ${esc(n.Semester)}</span></td>
      <td>${esc(n.SKS)}</td><td>${esc(n.Tugas)}</td><td>${esc(n.Praktik)}</td><td>${esc(n.UTS)}</td><td>${esc(n.UAS)}</td><td>${esc(n.Absen)}</td>
      <td><strong>${esc(n['Skor Normalisasi'])}</strong></td>
      <td><span class="grade-tag" style="background:${g.color}1a;color:${g.color};">${g.label}</span></td>
      <td><div class="row-actions"><button class="btn-row-action edit" onclick='openNilaiModal(${attr(n)})'>✏️</button><button class="btn-row-action delete" onclick="hapusNilai('${n.ID}')">🗑️</button></div></td></tr>`; }).join('')}
    </tbody></table></div>`;
}
function mahasiswaSelectOptions() { return [{ value: '', label: '— Pilih Mahasiswa —' }].concat((STATE.data.mahasiswa || []).map(m => ({ value: m.NIM, label: m.NIM + ' — ' + m.Nama }))); }
function openNilaiModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const n = data || {};
  buildFormModal(data ? 'Edit Nilai' : 'Input Nilai', 'Komponen nilai (skala 0–100)', [
    { id: 'nl-nim', label: 'Mahasiswa', type: 'select', full: true, value: n['NIM Mahasiswa'], options: mahasiswaSelectOptions() },
    { id: 'nl-mk', label: 'Mata Kuliah', type: 'select', full: true, value: n['Kode MK'], options: matkulOptions(currentRole() === 'dosen') },
    { id: 'nl-tugas', label: 'Tugas', type: 'number', value: n.Tugas != null ? n.Tugas : 0, min: 0, max: 100 },
    { id: 'nl-praktik', label: 'Praktik', type: 'number', value: n.Praktik != null ? n.Praktik : 0, min: 0, max: 100 },
    { id: 'nl-uts', label: 'UTS', type: 'number', value: n.UTS != null ? n.UTS : 0, min: 0, max: 100 },
    { id: 'nl-uas', label: 'UAS', type: 'number', value: n.UAS != null ? n.UAS : 0, min: 0, max: 100 },
    { id: 'nl-absen', label: 'Absen', type: 'number', value: n.Absen != null ? n.Absen : 0, min: 0, max: 100 }
  ], 'submitNilai()');
}
async function submitNilai() {
  const nim = gv('nl-nim'), kode = gv('nl-mk');
  if (!nim || !kode) { showToast('⚠️ Pilih mahasiswa dan mata kuliah', 'warning'); return; }
  const m = mahasiswaByNim(nim); const mk = matkulByKode(kode);
  const rec = { 'NIM Mahasiswa': nim, 'Nama Mahasiswa': m ? m.Nama : nim, 'Kode MK': kode, 'Nama Mata Kuliah': mk ? mk['Nama Mata Kuliah'] : kode, Semester: mk ? mk.Semester : '', SKS: mk ? mk.SKS : 1, Tugas: Number(gv('nl-tugas')) || 0, Praktik: Number(gv('nl-praktik')) || 0, UTS: Number(gv('nl-uts')) || 0, UAS: Number(gv('nl-uas')) || 0, Absen: Number(gv('nl-absen')) || 0 };
  recalcNilaiRow(rec);
  if (STATE.editingId) { await dbEdit('nilai', STATE.editingId, rec, 'editNilai'); showToast('✅ Nilai diperbarui', 'success'); }
  else { await dbAdd('nilai', { ID: nextId('NL'), ...rec, 'Tanggal Input': new Date().toISOString() }, 'addNilai'); showToast('✅ Nilai ditambahkan', 'success'); }
  closeActiveModal(); renderNilaiTable();
}
async function hapusNilai(id) { if (!confirm('Hapus nilai ini?')) return; await dbDelete('nilai', id, 'deleteNilai'); showToast('🗑️ Nilai dihapus', 'warning'); renderNilaiTable(); }

// ================================================ RAPOR / KHS
async function renderRaporPage() {
  await loadAllData();
  const c = document.getElementById('rapor-content'); if (!c) return;
  const role = currentRole();
  let selectorHtml = '';
  let nim = null;
  if (role === 'mahasiswa') { const m = currentMahasiswa(); nim = m ? m.NIM : null; }
  else {
    const opts = mahasiswaSelectOptions();
    selectorHtml = `<div class="filter-bar-wrap"><div class="filter-row"><div class="filter-group" style="flex:1;"><label class="filter-label">Pilih Mahasiswa</label><select id="rapor-nim" class="filter-input" onchange="drawRapor()">${opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select></div></div></div>`;
  }
  c.innerHTML = selectorHtml + '<div id="rapor-body"></div>';
  if (role === 'mahasiswa') drawRapor(nim); else drawRapor();
}
function drawRapor(forcedNim) {
  const body = document.getElementById('rapor-body'); if (!body) return;
  const nim = forcedNim || (document.getElementById('rapor-nim') ? document.getElementById('rapor-nim').value : null);
  if (!nim) { body.innerHTML = emptyState('📋', 'Pilih mahasiswa', 'Pilih mahasiswa untuk melihat KHS'); return; }
  const m = mahasiswaByNim(nim);
  const nilai = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(nim)); nilai.forEach(recalcNilaiRow);
  if (!nilai.length) { body.innerHTML = emptyState('📋', 'Belum ada nilai', `${m ? m.Nama : nim} belum memiliki nilai`); return; }
  const semesters = {};
  nilai.forEach(n => { const s = n.Semester || '-'; (semesters[s] = semesters[s] || []).push(n); });
  const ipk = hitungIp(nilai);
  const totalSks = nilai.reduce((s, n) => s + getSks(n), 0);
  const semKeys = Object.keys(semesters).sort((a, b) => Number(a) - Number(b));
  let html = `<div class="ipk-card" style="margin-bottom:20px;"><div class="ipk-ring-wrap"><div class="ipk-ring" style="--p:${Math.min(ipk / 4 * 100, 100)};"><div class="ipk-ring-inner"><div class="ipk-num">${ipk.toFixed(2)}</div><div class="ipk-lbl">IPK</div></div></div></div>
    <div class="ipk-info"><div class="ipk-name">${esc(m ? m.Nama : nim)}</div><div class="ipk-sub">${esc(nim)} · ${esc(m ? (m.Kelas || '-') : '-')}</div>
    <div class="ipk-stats"><div class="ipk-stat"><div class="ipk-stat-val">${totalSks}</div><div class="ipk-stat-lbl">Total SKS</div></div><div class="ipk-stat"><div class="ipk-stat-val">${nilai.length}</div><div class="ipk-stat-lbl">Mata Kuliah</div></div><div class="ipk-stat"><div class="ipk-stat-val" style="font-size:13px;">${esc(predikatFor(ipk))}</div><div class="ipk-stat-lbl">Predikat</div></div></div>
    <button class="btn btn-secondary btn-sm no-print" style="margin-top:12px;" onclick="cetakKHS('${nim}')">🖨️ Cetak KHS</button></div></div>`;
  semKeys.forEach(s => {
    const list = semesters[s]; const ips = hitungIp(list); const sks = list.reduce((a, n) => a + getSks(n), 0);
    html += `<div class="card" style="margin-bottom:16px;"><div class="card-head"><div><strong>Semester ${esc(s)}</strong></div><div class="chip chip-info">IPS ${ips.toFixed(2)} · ${sks} SKS</div></div><div class="card-body" style="padding:0;"><div class="table-container"><table class="data-table data-table-center"><thead><tr><th class="col-left">Mata Kuliah</th><th>SKS</th><th>Skor</th><th>Huruf</th><th>Bobot</th></tr></thead><tbody>${list.map(n => { const g = getGrade(n['Skor Normalisasi']); return `<tr><td class="col-left">${esc(n['Nama Mata Kuliah'])}</td><td>${esc(n.SKS)}</td><td>${esc(n['Skor Normalisasi'])}</td><td><span class="grade-tag" style="background:${g.color}1a;color:${g.color};">${g.label}</span></td><td>${g.bobot.toFixed(1)}</td></tr>`; }).join('')}</tbody></table></div></div></div>`;
  });
  body.innerHTML = html;
}
function cetakKHS(nim) {
  const m = mahasiswaByNim(nim);
  const nilai = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(nim)); nilai.forEach(recalcNilaiRow);
  const ipk = hitungIp(nilai); const totalSks = nilai.reduce((s, n) => s + getSks(n), 0);
  const rows = nilai.sort((a, b) => Number(a.Semester) - Number(b.Semester)).map(n => { const g = getGrade(n['Skor Normalisasi']); return `<tr><td>${esc(n['Kode MK'])}</td><td style="text-align:left;">${esc(n['Nama Mata Kuliah'])}</td><td>${esc(n.Semester)}</td><td>${esc(n.SKS)}</td><td>${esc(n['Skor Normalisasi'])}</td><td>${g.label}</td><td>${g.bobot.toFixed(1)}</td></tr>`; }).join('');
  printDoc('KARTU HASIL STUDI (KHS)', m, `<table class="data-table" style="width:100%;border-collapse:collapse;"><thead><tr><th>Kode</th><th>Mata Kuliah</th><th>Smt</th><th>SKS</th><th>Skor</th><th>Huruf</th><th>Bobot</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:14px;font-size:13px;"><strong>Total SKS:</strong> ${totalSks} &nbsp;&nbsp; <strong>IPK:</strong> ${ipk.toFixed(2)} &nbsp;&nbsp; <strong>Predikat:</strong> ${esc(predikatFor(ipk))}</div>`);
}

// ================================================ TRANSKRIP
async function renderTranskrip() {
  await loadAllData();
  const c = document.getElementById('transkrip-content'); if (!c) return;
  const role = currentRole();
  let nim = null, selectorHtml = '';
  if (role === 'mahasiswa') { const m = currentMahasiswa(); nim = m ? m.NIM : null; }
  else {
    const opts = mahasiswaSelectOptions();
    selectorHtml = `<div class="filter-bar-wrap"><div class="filter-row"><div class="filter-group" style="flex:1;"><label class="filter-label">Pilih Mahasiswa</label><select id="trk-nim" class="filter-input" onchange="drawTranskrip()">${opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select></div></div></div>`;
  }
  c.innerHTML = pageHeader('Akademik', 'Transkrip Nilai', 'Rekap seluruh mata kuliah & IPK kumulatif', '') + selectorHtml + '<div id="trk-body"></div>';
  drawTranskrip(nim);
}
function drawTranskrip(forcedNim) {
  const body = document.getElementById('trk-body'); if (!body) return;
  const nim = forcedNim || (document.getElementById('trk-nim') ? document.getElementById('trk-nim').value : null);
  if (!nim) { body.innerHTML = emptyState('📜', 'Pilih mahasiswa', ''); return; }
  const m = mahasiswaByNim(nim);
  const nilai = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(nim)).sort((a, b) => Number(a.Semester) - Number(b.Semester)); nilai.forEach(recalcNilaiRow);
  if (!nilai.length) { body.innerHTML = emptyState('📜', 'Belum ada nilai', `${m ? m.Nama : nim} belum memiliki nilai`); return; }
  const ipk = hitungIp(nilai); const totalSks = nilai.reduce((s, n) => s + getSks(n), 0); const target = CONFIG.sksLulus || 110;
  body.innerHTML = `<div class="kpi-grid" style="margin-bottom:18px;">
      <div class="ministat"><div class="ministat-ic">🎯</div><div><div class="ministat-val">${ipk.toFixed(2)}</div><div class="ministat-lbl">IPK Kumulatif</div></div></div>
      <div class="ministat"><div class="ministat-ic">📘</div><div><div class="ministat-val">${totalSks}</div><div class="ministat-lbl">SKS Lulus</div></div></div>
      <div class="ministat"><div class="ministat-ic">🎓</div><div><div class="ministat-val" style="font-size:14px;">${esc(predikatFor(ipk))}</div><div class="ministat-lbl">Predikat</div></div></div></div>
    <div class="card" style="margin-bottom:16px;"><div class="card-body"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;"><span>Progres Kelulusan (target ${target} SKS)</span><strong>${Math.min(Math.round(totalSks / target * 100), 100)}%</strong></div><div class="progress"><div class="progress-fill" style="width:${Math.min(totalSks / target * 100, 100)}%"></div></div></div></div>
    <div style="text-align:right;margin-bottom:10px;"><button class="btn btn-secondary btn-sm no-print" onclick="cetakTranskrip('${nim}')">🖨️ Cetak Transkrip</button></div>
    <div class="table-container"><table class="data-table data-table-center"><thead><tr><th>Kode</th><th class="col-left">Mata Kuliah</th><th>Smt</th><th>SKS</th><th>Skor</th><th>Huruf</th><th>Bobot</th></tr></thead><tbody>${nilai.map(n => { const g = getGrade(n['Skor Normalisasi']); return `<tr><td class="mono">${esc(n['Kode MK'])}</td><td class="col-left">${esc(n['Nama Mata Kuliah'])}</td><td>${esc(n.Semester)}</td><td>${esc(n.SKS)}</td><td>${esc(n['Skor Normalisasi'])}</td><td><span class="grade-tag" style="background:${g.color}1a;color:${g.color};">${g.label}</span></td><td>${g.bobot.toFixed(1)}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function cetakTranskrip(nim) {
  const m = mahasiswaByNim(nim);
  const nilai = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(nim)).sort((a, b) => Number(a.Semester) - Number(b.Semester)); nilai.forEach(recalcNilaiRow);
  const ipk = hitungIp(nilai); const totalSks = nilai.reduce((s, n) => s + getSks(n), 0);
  const rows = nilai.map((n, i) => { const g = getGrade(n['Skor Normalisasi']); return `<tr><td>${i + 1}</td><td>${esc(n['Kode MK'])}</td><td style="text-align:left;">${esc(n['Nama Mata Kuliah'])}</td><td>${esc(n.SKS)}</td><td>${esc(n['Skor Normalisasi'])}</td><td>${g.label}</td><td>${g.bobot.toFixed(1)}</td></tr>`; }).join('');
  printDoc('TRANSKRIP AKADEMIK', m, `<table class="data-table" style="width:100%;border-collapse:collapse;"><thead><tr><th>No</th><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Skor</th><th>Huruf</th><th>Bobot</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:14px;font-size:13px;"><strong>Total SKS Lulus:</strong> ${totalSks} &nbsp;&nbsp; <strong>IPK:</strong> ${ipk.toFixed(2)} &nbsp;&nbsp; <strong>Predikat:</strong> ${esc(predikatFor(ipk))}</div>`);
}

// Shared print helper (KHS & Transkrip)
function printDoc(judul, m, innerTable) {
  const w = window.open('', '_blank'); if (!w) { showToast('⚠️ Popup diblokir browser', 'warning'); return; }
  const inst = instVal('namaInstitusi'); const prodi = instVal('namaProdi');
  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${esc(judul)} · ${esc(m ? m.Nama : '')}</title>
    <style>body{font-family:'Times New Roman',serif;padding:36px;color:#111;}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}th,td{border:1px solid #444;padding:6px 8px;text-align:center;}thead th{background:#eee;}
    .lh{display:flex;align-items:center;gap:16px;border-bottom:3px double #111;padding-bottom:10px;}.lh .logo{font-size:46px;}.lh .inst{font-size:18px;font-weight:bold;}.lh .sub{font-size:12px;}
    .judul{text-align:center;font-weight:bold;font-size:15px;text-transform:uppercase;letter-spacing:1px;margin:16px 0;}
    .bio{font-size:13px;margin:10px 0;}.bio div{margin:2px 0;}
    .sign{display:flex;justify-content:flex-end;margin-top:40px;}.sign .box{text-align:center;font-size:12px;min-width:240px;}.space{height:64px;}</style></head><body>
    <div class="lh"><div class="logo">🎓</div><div><div class="inst">${esc(inst)}</div><div class="sub">Program Studi ${esc(prodi)}</div><div class="sub">${esc(instVal('alamat') || '')}</div></div></div>
    <div class="judul">${esc(judul)}</div>
    <div class="bio"><div><strong>Nama</strong> : ${esc(m ? m.Nama : '-')}</div><div><strong>NIM</strong> : ${esc(m ? m.NIM : '-')}</div><div><strong>Kelas</strong> : ${esc(m ? (m.Kelas || '-') : '-')}</div><div><strong>Angkatan</strong> : ${esc(m ? m.Angkatan : '-')}</div></div>
    ${innerTable}
    <div class="sign"><div class="box">Makassar, ${fmtTanggal(new Date().toISOString())}<div>Ketua Program Studi</div><div class="space"></div><div><strong>______________________</strong></div></div></div>
    <script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
}
