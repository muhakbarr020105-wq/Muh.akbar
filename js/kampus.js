// ================================================
//  AKADEMIKAP — KAMPUS
//  Dashboard (role-aware), Pengumuman, Kalender,
//  Keuangan, Tahun Akademik, Profil, Pengaturan
// ================================================
'use strict';

// ================================================ DASHBOARD
async function renderDashboard() {
  await loadAllData();
  const c = document.getElementById('dashboard-content'); if (!c) return;
  const role = currentRole();
  if (role === 'mahasiswa') return renderDashboardMahasiswa(c);
  if (role === 'dosen') return renderDashboardDosen(c);
  return renderDashboardAdmin(c);
}
function statCard(icon, val, label, accent) {
  return `<div class="stat-card"><div class="stat-icon" style="background:${accent}1a;color:${accent};">${icon}</div><div class="stat-info"><div class="stat-value">${val}</div><div class="stat-label">${esc(label)}</div></div></div>`;
}
function pengumumanPreview(limit) {
  const list = (STATE.data.pengumuman || []).slice().sort((a, b) => (b.Pin ? 1 : 0) - (a.Pin ? 1 : 0) || String(b.Tanggal).localeCompare(String(a.Tanggal))).slice(0, limit || 3);
  if (!list.length) return '<div class="sched-empty">Belum ada pengumuman</div>';
  return list.map(p => `<div style="padding:10px 0;border-bottom:1px solid var(--border);"><div style="font-weight:700;font-size:13px;">${p.Pin ? '📌 ' : ''}${esc(p.Judul)}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${esc(p.Kategori)} · ${fmtTanggalSingkat(p.Tanggal)}</div></div>`).join('');
}
function renderDashboardAdmin(c) {
  const d = STATE.data;
  const lunas = (d.keuangan || []).filter(k => k.Status === 'Lunas').length;
  const totalTagihan = (d.keuangan || []).length;
  c.innerHTML = `
    <div class="welcome-banner"><div class="welcome-text"><h1>Selamat datang, ${esc(STATE.session.nama)} 👋</h1><p>${esc(instVal('namaInstitusi'))} · Tahun akademik ${esc(activeTAKode())}</p></div></div>
    <div class="stats-grid">
      ${statCard('🎓', (d.mahasiswa || []).length, 'Mahasiswa', '#4F46E5')}
      ${statCard('🧑‍🏫', (d.dosen || []).length, 'Dosen', '#0891B2')}
      ${statCard('📚', (d.mataKuliah || []).length, 'Mata Kuliah', '#7C3AED')}
      ${statCard('🏫', (d.kelas || []).length, 'Kelas', '#059669')}
      ${statCard('📅', (d.jadwal || []).length, 'Jadwal', '#D97706')}
      ${statCard('💳', `${lunas}/${totalTagihan}`, 'SPP Lunas', '#059669')}
    </div>
    <div class="dash-grid" style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-top:20px;">
      <div class="card"><div class="card-head"><strong>📊 Distribusi Mahasiswa per Kelas</strong></div><div class="card-body">${barChartKelas()}</div></div>
      <div class="card"><div class="card-head"><strong>📢 Pengumuman Terbaru</strong><button class="btn btn-ghost btn-sm" onclick="navigate('pengumuman')">Lihat semua</button></div><div class="card-body">${pengumumanPreview(4)}</div></div>
    </div>`;
  injectDashGridResponsive();
}
function barChartKelas() {
  const kelas = STATE.data.kelas || [];
  if (!kelas.length) return '<div class="sched-empty">Belum ada kelas</div>';
  const counts = kelas.map(k => ({ nama: k.Kode, n: (STATE.data.mahasiswa || []).filter(m => m.Kelas === k.Kode).length }));
  const max = Math.max(1, ...counts.map(x => x.n));
  return counts.map(x => `<div style="margin:8px 0;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>${esc(x.nama)}</span><strong>${x.n}</strong></div><div class="progress"><div class="progress-fill" style="width:${x.n / max * 100}%"></div></div></div>`).join('');
}
function renderDashboardDosen(c) {
  const nama = currentDosenNama();
  const myMk = (STATE.data.mataKuliah || []).filter(m => m['Dosen Pengampu'] === nama);
  const myJadwal = (STATE.data.jadwal || []).filter(j => j.Dosen === nama);
  const mySesi = (STATE.data.presensi || []).filter(p => p.Dosen === nama);
  c.innerHTML = `
    <div class="welcome-banner"><div class="welcome-text"><h1>Halo, ${esc(nama)} 🧑‍🏫</h1><p>Portal Dosen · ${esc(activeTAKode())}</p></div></div>
    <div class="stats-grid">
      ${statCard('📚', myMk.length, 'Mata Kuliah Diampu', '#4F46E5')}
      ${statCard('📅', myJadwal.length, 'Jadwal Mengajar', '#0891B2')}
      ${statCard('✅', mySesi.length, 'Sesi Presensi', '#059669')}
    </div>
    <div class="dash-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px;">
      <div class="card"><div class="card-head"><strong>📅 Jadwal Mengajar</strong><button class="btn btn-ghost btn-sm" onclick="navigate('jadwal')">Lihat</button></div><div class="card-body">${myJadwal.length ? myJadwal.map(j => `<div style="padding:9px 0;border-bottom:1px solid var(--border);"><strong style="font-size:13px;">${esc(j['Nama Mata Kuliah'])}</strong><div style="font-size:11px;color:var(--text-muted);">${esc(j.Hari)} ${esc(j['Jam Mulai'])}–${esc(j['Jam Selesai'])} · ${esc(j.Kelas || '-')} · ${esc(j.Ruangan || '-')}</div></div>`).join('') : '<div class="sched-empty">Belum ada jadwal</div>'}</div></div>
      <div class="card"><div class="card-head"><strong>📢 Pengumuman</strong></div><div class="card-body">${pengumumanPreview(4)}</div></div>
    </div>`;
  injectDashGridResponsive();
}
function renderDashboardMahasiswa(c) {
  const m = currentMahasiswa();
  if (!m) { c.innerHTML = emptyState('⚠️', 'Data mahasiswa tidak ditemukan', 'Hubungi admin'); return; }
  const nilai = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(m.NIM)); nilai.forEach(recalcNilaiRow);
  const ipk = hitungIp(nilai); const totalSks = nilai.reduce((s, n) => s + getSks(n), 0);
  const ta = activeTAKode();
  const myKrs = (STATE.data.krs || []).filter(k => String(k.NIM) === String(m.NIM) && k['Tahun Akademik'] === ta);
  const myJadwal = (STATE.data.jadwal || []).filter(j => j.Kelas === m.Kelas);
  const tagihan = (STATE.data.keuangan || []).filter(k => String(k.NIM) === String(m.NIM));
  const belum = tagihan.filter(k => k.Status !== 'Lunas').length;
  c.innerHTML = `
    <div class="welcome-banner"><div class="welcome-text"><h1>Halo, ${esc(m.Nama)} 🎓</h1><p>${esc(m.NIM)} · Kelas ${esc(m.Kelas || '-')} · ${esc(ta)}</p></div></div>
    <div class="stats-grid">
      ${statCard('🎯', ipk.toFixed(2), 'IPK', '#4F46E5')}
      ${statCard('📘', totalSks, 'SKS Lulus', '#059669')}
      ${statCard('📝', myKrs.length, 'MK Semester Ini', '#0891B2')}
      ${statCard('💳', belum ? `${belum} Belum` : 'Lunas', 'Status SPP', belum ? '#E11D48' : '#059669')}
    </div>
    <div class="dash-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px;">
      <div class="card"><div class="card-head"><strong>📅 Jadwal Kuliah</strong><button class="btn btn-ghost btn-sm" onclick="navigate('jadwal')">Lihat</button></div><div class="card-body">${myJadwal.length ? myJadwal.slice(0, 5).map(j => `<div style="padding:9px 0;border-bottom:1px solid var(--border);"><strong style="font-size:13px;">${esc(j['Nama Mata Kuliah'])}</strong><div style="font-size:11px;color:var(--text-muted);">${esc(j.Hari)} ${esc(j['Jam Mulai'])}–${esc(j['Jam Selesai'])} · ${esc(j.Ruangan || '-')}</div></div>`).join('') : '<div class="sched-empty">Belum ada jadwal</div>'}</div></div>
      <div class="card"><div class="card-head"><strong>📢 Pengumuman</strong><button class="btn btn-ghost btn-sm" onclick="navigate('pengumuman')">Lihat</button></div><div class="card-body">${pengumumanPreview(4)}</div></div>
    </div>`;
  injectDashGridResponsive();
}
function injectDashGridResponsive() {
  if (window.innerWidth <= 900) document.querySelectorAll('.dash-grid').forEach(g => g.style.gridTemplateColumns = '1fr');
}

// ================================================ PENGUMUMAN
async function renderPengumuman() {
  await loadAllData();
  const c = document.getElementById('pengumuman-content'); if (!c) return;
  const canEdit = currentRole() === 'admin';
  const role = currentRole();
  let list = (STATE.data.pengumuman || []).slice();
  list = list.filter(p => !p.Target || p.Target === 'Semua' || (role === 'dosen' && p.Target === 'Dosen') || (role === 'mahasiswa' && p.Target === 'Mahasiswa') || role === 'admin');
  list.sort((a, b) => (b.Pin ? 1 : 0) - (a.Pin ? 1 : 0) || String(b.Tanggal).localeCompare(String(a.Tanggal)));
  c.innerHTML = pageHeader('Informasi', 'Pengumuman', 'Informasi resmi & pengumuman kampus', canEdit ? '<button class="btn btn-primary" onclick="openPengumumanModal()">➕ Buat Pengumuman</button>' : '') +
    (list.length ? `<div class="announce-list">${list.map(p => `<div class="announce-card ${p.Pin ? 'pinned' : ''}"><div class="announce-head"><div><div class="announce-title">${p.Pin ? '📌 ' : ''}${esc(p.Judul)}</div><div class="announce-meta"><span class="chip chip-info">${esc(p.Kategori)}</span><span>👤 ${esc(p.Penulis || '-')}</span><span>📅 ${fmtTanggalSingkat(p.Tanggal)}</span><span>🎯 ${esc(p.Target || 'Semua')}</span></div></div>${canEdit ? `<div class="row-actions"><button class="btn-row-action edit" onclick='openPengumumanModal(${attr(p)})'>✏️</button><button class="btn-row-action delete" onclick="hapusPengumuman('${p.ID}')">🗑️</button></div>` : ''}</div><div class="announce-body">${esc(p.Isi)}</div></div>`).join('')}</div>` : emptyState('📢', 'Belum ada pengumuman', canEdit ? 'Klik “Buat Pengumuman”' : 'Belum ada informasi'));
}
function openPengumumanModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const p = data || {};
  buildFormModal(data ? 'Edit Pengumuman' : 'Buat Pengumuman', 'Informasi untuk warga kampus', [
    { id: 'png-judul', label: 'Judul', required: true, full: true, value: p.Judul },
    { id: 'png-kategori', label: 'Kategori', type: 'select', value: p.Kategori || 'Akademik', options: ['Akademik', 'Keuangan', 'Kegiatan', 'Internal', 'Lainnya'].map(v => ({ value: v, label: v })) },
    { id: 'png-target', label: 'Ditujukan untuk', type: 'select', value: p.Target || 'Semua', options: ['Semua', 'Mahasiswa', 'Dosen'].map(v => ({ value: v, label: v })) },
    { id: 'png-isi', label: 'Isi Pengumuman', type: 'textarea', rows: 5, full: true, value: p.Isi },
    { id: 'png-pin', label: 'Sematkan (pin) di atas?', type: 'select', value: p.Pin ? 'ya' : 'tidak', options: [{ value: 'tidak', label: 'Tidak' }, { value: 'ya', label: 'Ya, sematkan' }] }
  ], 'submitPengumuman()');
}
async function submitPengumuman() {
  const judul = gvt('png-judul');
  if (!judul) { showToast('⚠️ Judul wajib diisi', 'warning'); return; }
  const patch = { Judul: judul, Kategori: gv('png-kategori'), Target: gv('png-target'), Isi: gvt('png-isi'), Pin: gv('png-pin') === 'ya', Penulis: STATE.session.nama };
  if (STATE.editingId) { await dbEdit('pengumuman', STATE.editingId, patch); showToast('✅ Pengumuman diperbarui', 'success'); }
  else { await dbAdd('pengumuman', { ID: nextId('PNG'), ...patch, Tanggal: new Date().toISOString() }); showToast('✅ Pengumuman dibuat', 'success'); }
  closeActiveModal(); renderPengumuman();
}
async function hapusPengumuman(id) { if (!confirm('Hapus pengumuman ini?')) return; await dbDelete('pengumuman', id); showToast('🗑️ Pengumuman dihapus', 'warning'); renderPengumuman(); }

// ================================================ KALENDER AKADEMIK
let calCursor = new Date();
async function renderKalender() {
  await loadAllData();
  calCursor = new Date(calCursor || new Date());
  drawKalender();
}
function drawKalender() {
  const c = document.getElementById('kalender-content'); if (!c) return;
  const canEdit = currentRole() === 'admin';
  const year = calCursor.getFullYear(), month = calCursor.getMonth();
  const first = new Date(year, month, 1); const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const events = STATE.data.kalender || [];
  const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => { const s = e['Tanggal Mulai'], en = e['Tanggal Selesai'] || s; return dateStr >= s && dateStr <= en; });
    cells += `<div class="cal-cell ${dateStr === todayStr ? 'today' : ''}"><div class="cal-date">${day}</div>${dayEvents.map(e => `<div class="cal-event cal-ev-${['Akademik', 'Ujian', 'Libur'].includes(e.Kategori) ? e.Kategori : 'Lainnya'}" title="${esc(e.Judul)}">${esc(e.Judul)}</div>`).join('')}</div>`;
  }
  const upcoming = events.slice().sort((a, b) => String(a['Tanggal Mulai']).localeCompare(String(b['Tanggal Mulai'])));
  c.innerHTML = pageHeader('Informasi', 'Kalender Akademik', 'Agenda & kegiatan akademik', canEdit ? '<button class="btn btn-primary" onclick="openKalenderModal()">➕ Tambah Agenda</button>' : '') +
    `<div class="cal-wrap"><div class="cal-head"><button class="btn btn-ghost btn-sm" onclick="calNav(-1)">←</button><div class="cal-title">${monthName}</div><button class="btn btn-ghost btn-sm" onclick="calNav(1)">→</button></div>
      <div class="cal-grid">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:11px;"><span><span class="cal-event cal-ev-Akademik" style="display:inline-block;">Akademik</span></span><span><span class="cal-event cal-ev-Ujian" style="display:inline-block;">Ujian</span></span><span><span class="cal-event cal-ev-Libur" style="display:inline-block;">Libur</span></span><span><span class="cal-event cal-ev-Lainnya" style="display:inline-block;">Lainnya</span></span></div></div>
      <div class="card" style="margin-top:18px;"><div class="card-head"><strong>🗓️ Daftar Agenda</strong></div><div class="card-body" style="padding:0;"><div class="table-container"><table class="data-table data-table-center"><thead><tr><th class="col-left">Agenda</th><th>Kategori</th><th>Mulai</th><th>Selesai</th>${canEdit ? '<th>Aksi</th>' : ''}</tr></thead><tbody>${upcoming.length ? upcoming.map(e => `<tr><td class="col-left"><strong>${esc(e.Judul)}</strong></td><td><span class="chip chip-info">${esc(e.Kategori)}</span></td><td>${fmtTanggalSingkat(e['Tanggal Mulai'])}</td><td>${fmtTanggalSingkat(e['Tanggal Selesai'] || e['Tanggal Mulai'])}</td>${canEdit ? `<td><div class="row-actions"><button class="btn-row-action edit" onclick='openKalenderModal(${attr(e)})'>✏️</button><button class="btn-row-action delete" onclick="hapusKalender('${e.ID}')">🗑️</button></div></td>` : ''}</tr>`).join('') : `<tr><td colspan="5"><div class="sched-empty">Belum ada agenda</div></td></tr>`}</tbody></table></div></div></div>`;
}
function calNav(delta) { calCursor.setMonth(calCursor.getMonth() + delta); drawKalender(); }
function openKalenderModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const e = data || {};
  buildFormModal(data ? 'Edit Agenda' : 'Tambah Agenda', 'Agenda kalender akademik', [
    { id: 'kal-judul', label: 'Judul Agenda', required: true, full: true, value: e.Judul },
    { id: 'kal-kategori', label: 'Kategori', type: 'select', value: e.Kategori || 'Akademik', options: ['Akademik', 'Ujian', 'Libur', 'Lainnya'].map(v => ({ value: v, label: v })) },
    { id: 'kal-mulai', label: 'Tanggal Mulai', type: 'date', required: true, value: e['Tanggal Mulai'] },
    { id: 'kal-selesai', label: 'Tanggal Selesai', type: 'date', value: e['Tanggal Selesai'] }
  ], 'submitKalender()');
}
async function submitKalender() {
  const judul = gvt('kal-judul'), mulai = gv('kal-mulai');
  if (!judul || !mulai) { showToast('⚠️ Judul dan Tanggal Mulai wajib diisi', 'warning'); return; }
  const patch = { Judul: judul, Kategori: gv('kal-kategori'), 'Tanggal Mulai': mulai, 'Tanggal Selesai': gv('kal-selesai') || mulai };
  if (STATE.editingId) { await dbEdit('kalender', STATE.editingId, patch); showToast('✅ Agenda diperbarui', 'success'); }
  else { await dbAdd('kalender', { ID: nextId('KAL'), ...patch }); showToast('✅ Agenda ditambahkan', 'success'); }
  closeActiveModal(); drawKalender();
}
async function hapusKalender(id) { if (!confirm('Hapus agenda ini?')) return; await dbDelete('kalender', id); showToast('🗑️ Agenda dihapus', 'warning'); drawKalender(); }

// ================================================ KEUANGAN
async function renderKeuangan() {
  await loadAllData();
  const c = document.getElementById('keuangan-content'); if (!c) return;
  const role = currentRole();
  if (role === 'mahasiswa') {
    const m = currentMahasiswa(); if (!m) { c.innerHTML = emptyState('⚠️', 'Data tidak ditemukan', ''); return; }
    const mine = (STATE.data.keuangan || []).filter(k => String(k.NIM) === String(m.NIM));
    const lunas = mine.filter(k => k.Status === 'Lunas').reduce((s, k) => s + (Number(k.Jumlah) || 0), 0);
    const belum = mine.filter(k => k.Status !== 'Lunas').reduce((s, k) => s + (Number(k.Jumlah) || 0), 0);
    c.innerHTML = pageHeader('Administrasi', 'Keuangan Saya', m.Nama, '') +
      `<div class="kpi-grid" style="margin-bottom:18px;"><div class="ministat"><div class="ministat-ic" style="background:rgba(5,150,105,.12);">✅</div><div><div class="ministat-val amount" style="font-size:16px;">${rupiah(lunas)}</div><div class="ministat-lbl">Sudah Dibayar</div></div></div><div class="ministat"><div class="ministat-ic" style="background:rgba(225,29,72,.12);">⚠️</div><div><div class="ministat-val amount" style="font-size:16px;">${rupiah(belum)}</div><div class="ministat-lbl">Tunggakan</div></div></div></div>` +
      keuanganTable(mine, false);
    return;
  }
  const all = STATE.data.keuangan || [];
  const totalLunas = all.filter(k => k.Status === 'Lunas').reduce((s, k) => s + (Number(k.Jumlah) || 0), 0);
  const totalBelum = all.filter(k => k.Status !== 'Lunas').reduce((s, k) => s + (Number(k.Jumlah) || 0), 0);
  c.innerHTML = pageHeader('Administrasi', 'Keuangan & SPP', `Tahun akademik aktif: ${activeTAKode()}`, '<button class="btn btn-primary" onclick="openKeuanganModal()">➕ Tambah Tagihan</button>') +
    `<div class="kpi-grid" style="margin-bottom:18px;"><div class="ministat"><div class="ministat-ic" style="background:rgba(5,150,105,.12);">💰</div><div><div class="ministat-val amount" style="font-size:16px;">${rupiah(totalLunas)}</div><div class="ministat-lbl">Total Diterima</div></div></div><div class="ministat"><div class="ministat-ic" style="background:rgba(225,29,72,.12);">📉</div><div><div class="ministat-val amount" style="font-size:16px;">${rupiah(totalBelum)}</div><div class="ministat-lbl">Total Tunggakan</div></div></div></div>` +
    `<div style="margin-bottom:12px;"><input type="text" id="keu-search" class="filter-input" placeholder="🔍 Cari mahasiswa / NIM / status..." oninput="renderKeuanganTable()" style="max-width:340px;"></div>` +
    '<div id="keu-table-wrap"></div>';
  renderKeuanganTable();
}
function renderKeuanganTable() {
  const wrap = document.getElementById('keu-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.keuangan || [], document.getElementById('keu-search')?.value || '');
  wrap.innerHTML = keuanganTable(rows, true);
}
function keuanganTable(rows, admin) {
  if (!rows.length) return emptyState('💳', 'Belum ada tagihan', admin ? 'Klik “Tambah Tagihan” untuk membuat tagihan SPP' : 'Tidak ada tagihan');
  return `<div class="table-container"><table class="data-table data-table-center"><thead><tr>${admin ? '<th class="col-left">Mahasiswa</th>' : ''}<th>Jenis</th><th>Periode</th><th>Jumlah</th><th>Jatuh Tempo</th><th>Status</th>${admin ? '<th>Aksi</th>' : '<th>Metode</th>'}</tr></thead><tbody>${rows.map(k => `<tr>${admin ? `<td class="col-left"><strong>${esc(k.Nama)}</strong><br><span style="font-size:10.5px;color:var(--text-muted);">${esc(k.NIM)}</span></td>` : ''}<td>${esc(k.Jenis)}</td><td>${esc(k['Tahun Akademik'])}</td><td class="amount">${rupiah(k.Jumlah)}</td><td>${fmtTanggalSingkat(k['Jatuh Tempo'])}</td><td><span class="chip ${k.Status === 'Lunas' ? 'chip-ok' : 'chip-bad'}">${esc(k.Status)}</span></td>${admin ? `<td><div class="row-actions">${k.Status !== 'Lunas' ? `<button class="btn-row-action" onclick="lunasiKeuangan('${k.ID}')" title="Tandai Lunas">✅</button>` : ''}<button class="btn-row-action edit" onclick='openKeuanganModal(${attr(k)})'>✏️</button><button class="btn-row-action delete" onclick="hapusKeuangan('${k.ID}')">🗑️</button></div></td>` : `<td>${esc(k.Metode || '-')}</td>`}</tr>`).join('')}</tbody></table></div>`;
}
function openKeuanganModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const k = data || {};
  buildFormModal(data ? 'Edit Tagihan' : 'Tambah Tagihan', 'Tagihan / pembayaran', [
    { id: 'keu-nim', label: 'Mahasiswa', type: 'select', full: true, value: k.NIM, options: mahasiswaSelectOptions() },
    { id: 'keu-jenis', label: 'Jenis', type: 'select', value: k.Jenis || 'SPP', options: ['SPP', 'Uang Praktik', 'Wisuda', 'Lainnya'].map(v => ({ value: v, label: v })) },
    { id: 'keu-ta', label: 'Tahun Akademik', type: 'select', value: k['Tahun Akademik'] || activeTAKode(), options: taOptions() },
    { id: 'keu-jumlah', label: 'Jumlah (Rp)', type: 'number', required: true, value: k.Jumlah != null ? k.Jumlah : (CONFIG.sppPerSemester || 0), min: 0 },
    { id: 'keu-jatuh', label: 'Jatuh Tempo', type: 'date', value: k['Jatuh Tempo'] },
    { id: 'keu-status', label: 'Status', type: 'select', value: k.Status || 'Belum', options: ['Belum', 'Lunas'].map(v => ({ value: v, label: v })) },
    { id: 'keu-metode', label: 'Metode Bayar', type: 'select', value: k.Metode || '', options: [{ value: '', label: '—' }, { value: 'Transfer Bank', label: 'Transfer Bank' }, { value: 'Virtual Account', label: 'Virtual Account' }, { value: 'Tunai', label: 'Tunai' }] },
    { id: 'keu-tglbayar', label: 'Tanggal Bayar', type: 'date', value: k['Tanggal Bayar'] }
  ], 'submitKeuangan()');
}
async function submitKeuangan() {
  const nim = gv('keu-nim'); const m = mahasiswaByNim(nim);
  if (!nim || !m) { showToast('⚠️ Pilih mahasiswa', 'warning'); return; }
  const patch = { NIM: nim, Nama: m.Nama, Jenis: gv('keu-jenis'), 'Tahun Akademik': gv('keu-ta'), Jumlah: Number(gv('keu-jumlah')) || 0, 'Jatuh Tempo': gv('keu-jatuh'), Status: gv('keu-status'), Metode: gv('keu-metode'), 'Tanggal Bayar': gv('keu-tglbayar') };
  if (STATE.editingId) { await dbEdit('keuangan', STATE.editingId, patch); showToast('✅ Tagihan diperbarui', 'success'); }
  else { await dbAdd('keuangan', { ID: nextId('KEU'), ...patch }); showToast('✅ Tagihan ditambahkan', 'success'); }
  closeActiveModal(); renderKeuangan();
}
async function lunasiKeuangan(id) { await dbEdit('keuangan', id, { Status: 'Lunas', 'Tanggal Bayar': new Date().toISOString().slice(0, 10), Metode: 'Transfer Bank' }); showToast('✅ Pembayaran dicatat', 'success'); renderKeuangan(); }
async function hapusKeuangan(id) { if (!confirm('Hapus tagihan ini?')) return; await dbDelete('keuangan', id); showToast('🗑️ Tagihan dihapus', 'warning'); renderKeuangan(); }

// ================================================ TAHUN AKADEMIK
async function renderTahunAkademik() {
  await loadAllData();
  const c = document.getElementById('tahunakademik-content'); if (!c) return;
  c.innerHTML = filterBar('ta-search', 'Cari periode...', 'renderTaTable()', 'Tambah Tahun Akademik', 'openTaModal()') + '<div id="ta-table-wrap"></div>';
  renderTaTable();
}
function renderTaTable() {
  const wrap = document.getElementById('ta-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.tahunAkademik || [], document.getElementById('ta-search')?.value || '').sort((a, b) => String(b.Kode).localeCompare(String(a.Kode)));
  if (!rows.length) { wrap.innerHTML = emptyState('🗂️', 'Belum ada tahun akademik', 'Klik “Tambah Tahun Akademik”'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center"><thead><tr><th class="col-left">Periode</th><th>Tahun</th><th>Semester</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(t => `<tr><td class="col-left"><strong>${esc(t.Kode)}</strong></td><td>${esc(t.Tahun)}</td><td>${esc(t.Semester)}</td><td>${fmtTanggalSingkat(t.Mulai)}</td><td>${fmtTanggalSingkat(t.Selesai)}</td><td><span class="chip ${t.Status === 'Aktif' ? 'chip-ok' : ''}">${esc(t.Status)}</span></td><td><div class="row-actions">${t.Status !== 'Aktif' ? `<button class="btn-row-action" onclick="aktifkanTa('${t.ID}')" title="Jadikan Aktif">⭐</button>` : ''}<button class="btn-row-action edit" onclick='openTaModal(${attr(t)})'>✏️</button><button class="btn-row-action delete" onclick="hapusTa('${t.ID}')">🗑️</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function openTaModal(data) {
  data = data || null; STATE.editingId = data ? data.ID : null;
  const t = data || {};
  buildFormModal(data ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik', 'Periode akademik', [
    { id: 'ta-tahun', label: 'Tahun', required: true, value: t.Tahun, placeholder: '2024/2025' },
    { id: 'ta-semester', label: 'Semester', type: 'select', value: t.Semester || 'Ganjil', options: ['Ganjil', 'Genap', 'Pendek'].map(v => ({ value: v, label: v })) },
    { id: 'ta-mulai', label: 'Tanggal Mulai', type: 'date', value: t.Mulai },
    { id: 'ta-selesai', label: 'Tanggal Selesai', type: 'date', value: t.Selesai },
    { id: 'ta-status', label: 'Status', type: 'select', full: true, value: t.Status || 'Selesai', options: ['Aktif', 'Selesai', 'Akan Datang'].map(v => ({ value: v, label: v })) }
  ], 'submitTa()');
}
async function submitTa() {
  const tahun = gvt('ta-tahun'), semester = gv('ta-semester');
  if (!tahun) { showToast('⚠️ Tahun wajib diisi', 'warning'); return; }
  const kode = `${tahun} ${semester}`; const status = gv('ta-status');
  const patch = { Kode: kode, Tahun: tahun, Semester: semester, Mulai: gv('ta-mulai'), Selesai: gv('ta-selesai'), Status: status };
  if (status === 'Aktif') (STATE.data.tahunAkademik || []).forEach(t => { if (t.ID !== STATE.editingId) t.Status = 'Selesai'; });
  if (STATE.editingId) { await dbEdit('tahunAkademik', STATE.editingId, patch); showToast('✅ Periode diperbarui', 'success'); }
  else { await dbAdd('tahunAkademik', { ID: nextId('TA'), ...patch }); showToast('✅ Periode ditambahkan', 'success'); }
  persistLocal(); closeActiveModal(); updateBadges(); renderTaTable();
}
async function aktifkanTa(id) {
  (STATE.data.tahunAkademik || []).forEach(t => t.Status = String(t.ID) === String(id) ? 'Aktif' : (t.Status === 'Aktif' ? 'Selesai' : t.Status));
  persistLocal(); updateBadges(); showToast('⭐ Periode aktif diperbarui', 'success'); renderTaTable();
}
async function hapusTa(id) { if (!confirm('Hapus periode ini?')) return; await dbDelete('tahunAkademik', id); showToast('🗑️ Periode dihapus', 'warning'); renderTaTable(); }

// ================================================ PROFIL
async function renderProfil() {
  await loadAllData();
  const c = document.getElementById('profil-content'); if (!c) return;
  const role = currentRole(); const s = STATE.session;
  let cells = [];
  let sub = ROLE_LABELS[role];
  if (role === 'mahasiswa') {
    const m = currentMahasiswa() || {};
    sub = `Mahasiswa · ${m.NIM || ''}`;
    cells = [['NIM', m.NIM], ['Nama', m.Nama], ['Kelas', m.Kelas], ['Angkatan', m.Angkatan], ['Jenis Kelamin', m['Jenis Kelamin'] === 'P' ? 'Perempuan' : 'Laki-laki'], ['Agama', m.Agama], ['TTL', `${m['Tempat Lahir'] || '-'}, ${fmtTanggal(m['Tanggal Lahir'])}`], ['Telepon', m.Telepon], ['Email', m.Email], ['Dosen Wali', m['Dosen Wali']], ['Alamat', m.Alamat], ['Status', m.Status]];
  } else if (role === 'dosen') {
    const d = currentDosen() || {};
    sub = `Dosen · ${d.NIDN || ''}`;
    cells = [['NIDN', d.NIDN], ['Nama', d.Nama], ['Jabatan', d.Jabatan], ['Pendidikan', d.Pendidikan], ['Telepon', d.Telepon], ['Email', d.Email], ['Status', d.Status]];
  } else {
    cells = [['Nama', s.nama], ['Username', s.username], ['Peran', 'Administrator'], ['Institusi', instVal('namaInstitusi')], ['Program Studi', instVal('namaProdi')]];
  }
  c.innerHTML = `<div class="profile-head"><div class="profile-avatar">${esc((s.nama || 'U').charAt(0).toUpperCase())}</div><div><div class="profile-name">${esc(s.nama)}</div><div class="profile-sub">${esc(sub)}</div><div style="margin-top:8px;"><span class="chip chip-${role === 'admin' ? 'violet' : role === 'dosen' ? 'cyan' : 'ok'}">${esc(ROLE_LABELS[role])}</span></div></div></div>
    <div class="info-grid">${cells.map(([l, v]) => `<div class="info-cell"><div class="info-label">${esc(l)}</div><div class="info-value">${esc(v || '-')}</div></div>`).join('')}</div>
    <div style="margin-top:18px;"><button class="btn btn-danger" onclick="handleLogout()">⏻ Keluar dari Portal</button></div>`;
}

// ================================================ PENGATURAN
async function renderPengaturan() {
  await loadAllData();
  const c = document.getElementById('pengaturan-content'); if (!c) return;
  const i = inst();
  const cloudOn = STATE.mode === 'cloud';
  c.innerHTML = `
    <div class="tabs" id="set-tabs">
      <button class="tab active" onclick="setTab('umum',this)">Identitas</button>
      <button class="tab" onclick="setTab('penyimpanan',this)">Penyimpanan</button>
      <button class="tab" onclick="setTab('data',this)">Cadangan Data</button>
    </div>
    <div id="set-umum">
      <div class="card"><div class="card-body">
        <div class="form-grid">
          <div class="form-group full"><label class="form-label">Nama Institusi</label><input id="set-institusi" class="form-input" value="${esc(i.namaInstitusi || CONFIG.namaInstitusi)}"></div>
          <div class="form-group"><label class="form-label">Program Studi</label><input id="set-prodi" class="form-input" value="${esc(i.namaProdi || CONFIG.namaProdi)}"></div>
          <div class="form-group"><label class="form-label">Nama Portal</label><input id="set-portal" class="form-input" value="${esc(i.namaPortal || CONFIG.namaPortal)}"></div>
          <div class="form-group full"><label class="form-label">Alamat</label><input id="set-alamat" class="form-input" value="${esc(i.alamat || CONFIG.alamat || '')}"></div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" onclick="simpanInstitusi()">💾 Simpan Identitas</button></div>
      </div></div>
    </div>
    <div id="set-penyimpanan" style="display:none;">
      <div class="card"><div class="card-body">
        <div class="setting-row"><div><strong>Mode Penyimpanan</strong><div style="font-size:11.5px;color:var(--text-muted);">Lokal (browser) atau Cloud (Google Apps Script)</div></div>
          <label class="switch"><input type="checkbox" id="set-cloud" ${cloudOn ? 'checked' : ''} onchange="toggleCloud()"><span class="switch-slider"></span></label></div>
        <div class="form-group" style="margin-top:14px;"><label class="form-label">URL Apps Script</label><input id="set-appsurl" class="form-input" placeholder="https://script.google.com/macros/s/XXXX/exec" value="${esc(i.appsUrl || (typeof APPS_SCRIPT_URL !== 'undefined' ? APPS_SCRIPT_URL : ''))}"></div>
        <div class="form-actions"><button class="btn btn-primary" onclick="simpanAppsUrl()">💾 Simpan URL</button></div>
        <div class="preview-box" style="margin-top:10px;">Mode aktif saat ini: <strong>${cloudOn ? 'Cloud' : 'Lokal'}</strong></div>
      </div></div>
    </div>
    <div id="set-data" style="display:none;">
      <div class="card"><div class="card-body">
        <div class="setting-row"><div><strong>Ekspor Cadangan</strong><div style="font-size:11.5px;color:var(--text-muted);">Unduh seluruh data sebagai berkas JSON</div></div><button class="btn btn-secondary" onclick="exportBackup()">⬇️ Ekspor JSON</button></div>
        <div class="setting-row"><div><strong>Impor Cadangan</strong><div style="font-size:11.5px;color:var(--text-muted);">Pulihkan data dari berkas JSON</div></div><label class="btn btn-secondary">⬆️ Impor JSON<input type="file" accept="application/json" style="display:none;" onchange="importBackup(event)"></label></div>
        <div class="setting-row"><div><strong>Ekspor Mahasiswa (CSV)</strong><div style="font-size:11.5px;color:var(--text-muted);">Unduh data mahasiswa untuk Excel</div></div><button class="btn btn-secondary" onclick="downloadCsv('mahasiswa')">📄 Unduh CSV</button></div>
        <div class="setting-row"><div><strong style="color:var(--rose);">Reset Data</strong><div style="font-size:11.5px;color:var(--text-muted);">Kembalikan ke data contoh awal</div></div><button class="btn btn-danger" onclick="resetData()">🗑️ Reset</button></div>
      </div></div>
    </div>`;
}
function setTab(tab, btn) {
  document.querySelectorAll('#set-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['umum', 'penyimpanan', 'data'].forEach(t => { const el = document.getElementById('set-' + t); if (el) el.style.display = t === tab ? '' : 'none'; });
}
function simpanInstitusi() {
  const i = inst();
  i.namaInstitusi = gvt('set-institusi'); i.namaProdi = gvt('set-prodi'); i.namaPortal = gvt('set-portal'); i.alamat = gvt('set-alamat');
  localStorage.setItem(LS_KEYS.inst, JSON.stringify(i));
  showToast('✅ Identitas institusi disimpan', 'success');
}
function toggleCloud() {
  STATE.mode = document.getElementById('set-cloud').checked ? 'cloud' : 'local';
  localStorage.setItem(LS_KEYS.mode, STATE.mode); updateStoragePill();
  showToast(STATE.mode === 'cloud' ? '☁️ Mode Cloud aktif' : '💾 Mode Lokal aktif', 'info');
}
function simpanAppsUrl() {
  const i = inst(); i.appsUrl = gvt('set-appsurl'); localStorage.setItem(LS_KEYS.inst, JSON.stringify(i));
  try { window.APPS_SCRIPT_URL = i.appsUrl; } catch (e) {}
  showToast('✅ URL Apps Script disimpan', 'success');
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(STATE.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `akademikap-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  showToast('⬇️ Cadangan diunduh', 'success');
}
function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { const parsed = JSON.parse(reader.result); COLLECTIONS.forEach(k => { if (Array.isArray(parsed[k])) STATE.data[k] = parsed[k]; }); (STATE.data.nilai || []).forEach(recalcNilaiRow); persistLocal(); updateBadges(); showToast('✅ Data berhasil diimpor', 'success'); navigate('dashboard'); } catch (err) { showToast('❌ Berkas tidak valid', 'error'); } };
  reader.readAsText(file);
}
function downloadCsv(collection) {
  const rows = STATE.data[collection] || []; if (!rows.length) { showToast('⚠️ Tidak ada data', 'warning'); return; }
  const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] == null ? '' : r[k]).replace(/"/g, '""')}"`).join(','))).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${collection}.csv`; a.click();
  showToast('📄 CSV diunduh', 'success');
}
function resetData() {
  if (!confirm('Reset semua data ke contoh awal? Tindakan ini tidak dapat dibatalkan.')) return;
  localStorage.removeItem(LS_KEYS.data);
  STATE.data = freshSeed(); persistLocal(); STATE.loaded = true; updateBadges();
  showToast('🔄 Data direset ke contoh awal', 'success'); navigate('dashboard');
}
