// ================================================
//  AKADEMIKAP — Main Application Logic (Professional Edition)
//  Portal Akademik Administrasi Perkantoran PNUP
// ================================================

'use strict';

const LS_KEYS = {
  data:   'akademikap_data_v2',
  theme:  'akademikap_theme',
  auth:   'akademikap_session',
  mode:   'akademikap_storage_mode',
  inst:   'akademikap_institusi'
};

const STATE = {
  currentPage: 'dashboard',
  data: { mahasiswa: [], dosen: [], staf: [], mataKuliah: [], nilai: [] },
  loaded: false,
  editingId: null,
  mode: (localStorage.getItem(LS_KEYS.mode) || (typeof STORAGE_MODE !== 'undefined' ? STORAGE_MODE : 'local'))
};

function inst() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.inst)) || {}; } catch (e) { return {}; }
}
function instVal(key) { return inst()[key] || CONFIG[key]; }

// ================================================
// GRADE / SCORE LOGIC
// ================================================
function getGrade(score) {
  score = Number(score) || 0;
  if (score >= 85) return { label: 'A',  color: '#059669', bobot: 4.0 };
  if (score >= 80) return { label: 'B+', color: '#0891B2', bobot: 3.5 };
  if (score >= 75) return { label: 'B',  color: '#2563EB', bobot: 3.0 };
  if (score >= 70) return { label: 'C+', color: '#D97706', bobot: 2.5 };
  if (score >= 60) return { label: 'C',  color: '#F59E0B', bobot: 2.0 };
  if (score >= 50) return { label: 'D',  color: '#EA580C', bobot: 1.0 };
  return { label: 'E', color: '#E11D48', bobot: 0 };
}

function hitungSkor(tugas, praktik, uts, uas, absen) {
  const b = CONFIG.bobotNilai;
  const skorMentah = (tugas * b.tugas) + (praktik * b.praktik) + (uts * b.uts) + (uas * b.uas) + (absen * b.absen);
  const skorNormalisasi = Math.round((skorMentah / CONFIG.totalBobot) * 100) / 100;
  return { skorMentah: Math.round(skorMentah * 100) / 100, skorNormalisasi, grade: getGrade(skorNormalisasi) };
}

function getSks(n) { return Number(n.SKS) || 1; }

// IPK/IPS berbobot SKS: Σ(bobot × sks) / Σ(sks)
function hitungIp(daftarNilai) {
  let totalBobotSks = 0, totalSks = 0;
  daftarNilai.forEach(n => {
    const sks = getSks(n);
    totalBobotSks += (Number(n['Bobot IP']) || 0) * sks;
    totalSks += sks;
  });
  return totalSks ? Math.round((totalBobotSks / totalSks) * 100) / 100 : 0;
}

function predikatFor(ipk) {
  if (ipk >= 3.51) return 'Dengan Pujian (Cumlaude)';
  if (ipk >= 3.01) return 'Sangat Memuaskan';
  if (ipk >= 2.76) return 'Memuaskan';
  if (ipk > 0)     return 'Cukup';
  return '-';
}

// Pastikan setiap baris nilai punya skor/grade terhitung (untuk data seed & impor)
function recalcNilaiRow(n) {
  const h = hitungSkor(Number(n.Tugas)||0, Number(n.Praktik)||0, Number(n.UTS)||0, Number(n.UAS)||0, Number(n.Absen)||0);
  n['Skor Mentah'] = h.skorMentah;
  n['Skor Normalisasi'] = h.skorNormalisasi;
  n['Nilai Huruf'] = h.grade.label;
  n['Bobot IP'] = h.grade.bobot;
  return n;
}

// ================================================
// STORAGE ENGINE (local + optional cloud sync)
// ================================================
function isCloud() { return STATE.mode === 'cloud' && typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL; }

function persistLocal() {
  try { localStorage.setItem(LS_KEYS.data, JSON.stringify(STATE.data)); } catch (e) {}
}

function seedIfEmpty() {
  const raw = localStorage.getItem(LS_KEYS.data);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  const seed = JSON.parse(JSON.stringify(typeof SEED_DATA !== 'undefined' ? SEED_DATA : { mahasiswa:[],dosen:[],staf:[],mataKuliah:[],nilai:[] }));
  seed.nilai.forEach(recalcNilaiRow);
  localStorage.setItem(LS_KEYS.data, JSON.stringify(seed));
  return seed;
}

async function cloudGet(action, extraParams) {
  let url = `${APPS_SCRIPT_URL}?action=${action}`;
  if (extraParams) url += '&' + extraParams;
  const attempts = [
    () => fetch(url, { signal: AbortSignal.timeout(12000) }),
    () => fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) }),
    () => fetch('https://corsproxy.io/?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) })
  ];
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status === 'success') return json;
    } catch (e) { continue; }
  }
  return null;
}

async function cloudPost(action, payload) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    return true;
  } catch (e) { return false; }
}

async function loadAllData(force) {
  if (STATE.loaded && !force) return;
  if (isCloud()) {
    const result = await cloudGet('getAll');
    if (result && result.data) {
      STATE.data.mahasiswa  = result.data.mahasiswa  || [];
      STATE.data.dosen      = result.data.dosen      || [];
      STATE.data.staf       = result.data.staf       || [];
      STATE.data.mataKuliah = result.data.mataKuliah || [];
      STATE.data.nilai      = (result.data.nilai || []).map(recalcNilaiRow);
      STATE.loaded = true;
      updateBadges();
      return;
    }
    showToast('⚠️ Gagal terhubung ke server cloud. Beralih ke data lokal.', 'warning');
  }
  STATE.data = seedIfEmpty();
  ['mahasiswa','dosen','staf','mataKuliah','nilai'].forEach(k => { if (!STATE.data[k]) STATE.data[k] = []; });
  STATE.data.nilai.forEach(recalcNilaiRow);
  STATE.loaded = true;
  updateBadges();
}

// Generic local CRUD then optional cloud sync
function nextId(prefix) { return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

async function dbAdd(collection, record, cloudAction) {
  STATE.data[collection].push(record);
  persistLocal();
  if (isCloud()) await cloudPost(cloudAction, recordToPayload(collection, record));
  updateBadges();
}
async function dbEdit(collection, id, patch, cloudAction) {
  const idx = STATE.data[collection].findIndex(r => String(r.ID) === String(id));
  if (idx > -1) STATE.data[collection][idx] = { ...STATE.data[collection][idx], ...patch };
  persistLocal();
  if (isCloud()) await cloudPost(cloudAction, { id, ...recordToPayload(collection, STATE.data[collection][idx]) });
  updateBadges();
}
async function dbDelete(collection, id, cloudAction) {
  STATE.data[collection] = STATE.data[collection].filter(r => String(r.ID) !== String(id));
  persistLocal();
  if (isCloud()) await cloudPost(cloudAction, { id });
  updateBadges();
}

function recordToPayload(collection, r) {
  if (!r) return {};
  if (collection === 'mahasiswa') return { nim: r.NIM, nama: r.Nama, angkatan: r.Angkatan, jenisKelamin: r['Jenis Kelamin'], status: r.Status, email: r.Email };
  if (collection === 'dosen')     return { nidn: r.NIDN, nama: r.Nama, jabatan: r.Jabatan, email: r.Email };
  if (collection === 'staf')      return { nip: r.NIP, nama: r.Nama, jabatan: r.Jabatan };
  if (collection === 'mataKuliah')return { kode: r.Kode, namaMatkul: r['Nama Mata Kuliah'], semester: r.Semester, sks: r.SKS, dosenPengampu: r['Dosen Pengampu'] };
  if (collection === 'nilai')     return { nim: r['NIM Mahasiswa'], namaMahasiswa: r['Nama Mahasiswa'], kodeMk: r['Kode MK'], namaMatkul: r['Nama Mata Kuliah'], semester: r.Semester, sks: r.SKS, tugas: r.Tugas, praktik: r.Praktik, uts: r.UTS, uas: r.UAS, absen: r.Absen };
  return {};
}

// ================================================
// AUTH
// ================================================
function isLoggedIn() { return localStorage.getItem(LS_KEYS.auth) === 'true'; }

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  if (u === AUTH.username && p === AUTH.password) {
    localStorage.setItem(LS_KEYS.auth, 'true');
    showApp();
    showToast('👋 Selamat datang, ' + AUTH.displayName, 'success');
  } else {
    showToast('❌ Username atau password salah', 'error');
  }
  return false;
}

function handleLogout() {
  if (!confirm('Keluar dari portal?')) return;
  localStorage.removeItem(LS_KEYS.auth);
  document.getElementById('app-shell').classList.remove('show');
  document.getElementById('login-screen').classList.add('show');
  document.getElementById('login-pass').value = '';
}

function showApp() {
  document.getElementById('login-screen').classList.remove('show');
  document.getElementById('app-shell').classList.add('show');
  document.getElementById('user-name').textContent = AUTH.displayName || 'Administrator';
  document.getElementById('user-avatar').textContent = (AUTH.displayName || 'A').charAt(0).toUpperCase();
  updateStoragePill();
  navigate('dashboard');
}

// ================================================
// ROUTER
// ================================================
const PAGES = {
  dashboard: { title: 'Dashboard',      sub: 'Ringkasan data akademik Program Studi Administrasi Perkantoran', render: renderDashboard },
  mahasiswa: { title: 'Data Mahasiswa', sub: 'Kelola data induk mahasiswa', render: renderMahasiswaPage },
  dosen:     { title: 'Data Dosen',     sub: 'Kelola data induk dosen pengajar', render: renderDosenPage },
  staf:      { title: 'Data Staf',      sub: 'Kelola data induk staf administrasi', render: renderStafPage },
  matkul:    { title: 'Mata Kuliah',    sub: 'Kelola mata kuliah beserta bobot SKS', render: renderMatkulPage },
  nilai:     { title: 'Input Nilai',    sub: 'Input & kelola nilai mahasiswa per mata kuliah', render: renderNilaiPage },
  rapor:     { title: 'Rapor & KHS',    sub: 'IPS per semester, IPK kumulatif, dan cetak KHS', render: renderRaporPage },
  pengaturan:{ title: 'Pengaturan',     sub: 'Penyimpanan data, identitas institusi & cadangan', render: renderPengaturan }
};

async function navigate(page) {
  if (!PAGES[page]) page = 'dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  STATE.currentPage = page;
  updateTopbar(PAGES[page].title, PAGES[page].sub);
  closeSidebar();
  window.scrollTo(0, 0);
  await PAGES[page].render();
}

async function refreshData() {
  showToast('🔄 Memuat ulang data...', 'info');
  await loadAllData(true);
  await navigate(STATE.currentPage);
  showToast('✅ Data dimuat ulang', 'success');
}

// ================================================
// UI UTILITIES
// ================================================
function updateTopbar(title, sub) {
  setText('topbar-title', title); setText('topbar-sub', sub);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function updateBadges() {
  setText('badge-mahasiswa', STATE.data.mahasiswa.length);
  setText('badge-dosen', STATE.data.dosen.length);
  setText('badge-staf', STATE.data.staf.length);
  setText('badge-matkul', STATE.data.mataKuliah.length);
}

function updateStoragePill() {
  const pill = document.getElementById('storage-pill');
  const txt = document.getElementById('storage-pill-text');
  if (!pill || !txt) return;
  if (isCloud()) { pill.classList.add('cloud'); txt.textContent = 'Mode Cloud'; }
  else { pill.classList.remove('cloud'); txt.textContent = 'Mode Lokal'; }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const colors = { success: '#059669', error: '#E11D48', info: '#4F46E5', warning: '#D97706' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = colors[type] || colors.info;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.transition = 'opacity .3s, transform .3s'; toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 2900);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem(LS_KEYS.theme, next);
  applyThemeLabels(next);
}
function applyThemeLabels(theme) {
  document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap');
  document.querySelectorAll('#theme-btn-top').forEach(b => b.textContent = theme === 'dark' ? '☀️' : '🌙');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-title">${title}</div><div class="empty-state-text">${text}</div></div>`;
}

// ================================================
// DASHBOARD
// ================================================
async function renderDashboard() {
  await loadAllData();
  setText('dash-mahasiswa', STATE.data.mahasiswa.length);
  setText('dash-dosen', STATE.data.dosen.length);
  setText('dash-matkul', STATE.data.mataKuliah.length);
  setText('dash-nilai', STATE.data.nilai.length);

  const byMhs = {};
  STATE.data.nilai.forEach(n => {
    const nim = n['NIM Mahasiswa'];
    (byMhs[nim] = byMhs[nim] || []).push(n);
  });
  const ipkList = Object.values(byMhs).map(hitungIp);
  const avgIpk = ipkList.length ? (ipkList.reduce((a,b)=>a+b,0) / ipkList.length) : 0;

  renderIpkRing('dash-ipk-card', avgIpk, `Berdasarkan ${ipkList.length} mahasiswa yang memiliki nilai tersimpan`, 'Rata-rata IPK', 'Performa Akademik Program Studi');
  renderGradeChart();
  renderTopMahasiswa(byMhs);
  renderRecentNilai();
}

function renderIpkRing(containerId, ipk, subtitle, ringLabel, title) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const pct = Math.min((ipk / 4) * 100, 100);
  const radius = 66, circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  const predikat = predikatFor(ipk);
  container.innerHTML = `
    <div class="ipk-ring-wrap">
      <svg width="152" height="152" viewBox="0 0 152 152">
        <circle cx="76" cy="76" r="${radius}" fill="none" stroke="var(--border)" stroke-width="11"/>
        <circle cx="76" cy="76" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="11"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ}" stroke-linecap="round"
          id="${containerId}-ring" style="transition:stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1);"/>
      </svg>
      <div class="ipk-ring-inner"><div class="ipk-num">${ipk.toFixed(2)}</div><div class="ipk-num-lbl">${ringLabel}</div></div>
    </div>
    <div class="ipk-detail">
      <div class="ipk-detail-title">${esc(title)}</div>
      <div class="ipk-detail-sub">${esc(subtitle)}</div>
      <span class="ipk-badge" style="background:var(--accent-subtle); color:var(--accent);">🏅 ${esc(predikat)}</span>
    </div>`;
  setTimeout(() => { const r = document.getElementById(containerId + '-ring'); if (r) r.style.strokeDashoffset = circ - dash; }, 100);
}

function renderGradeChart() {
  const container = document.getElementById('grade-chart');
  if (!container) return;
  const order = ['A','B+','B','C+','C','D','E'];
  const counts = {}; order.forEach(g => counts[g] = 0);
  STATE.data.nilai.forEach(n => { const g = n['Nilai Huruf']; if (counts[g] != null) counts[g]++; });
  const max = Math.max(1, ...Object.values(counts));
  if (STATE.data.nilai.length === 0) { container.innerHTML = emptyState('📊','Belum ada nilai','Distribusi muncul setelah ada nilai tersimpan'); return; }
  container.innerHTML = `<div class="bars">${order.map(g => {
    const c = counts[g]; const h = (c / max) * 100; const color = getGrade(g === 'A' ? 90 : g === 'B+' ? 82 : g === 'B' ? 77 : g === 'C+' ? 72 : g === 'C' ? 62 : g === 'D' ? 52 : 0).color;
    return `<div class="bar-col"><div class="bar-value">${c}</div><div class="bar-track"><div class="bar-fill" style="height:0;background:linear-gradient(180deg, ${color}, ${color}cc);" data-h="${h}"></div></div><div class="bar-label">${g}</div></div>`;
  }).join('')}</div>`;
  setTimeout(() => container.querySelectorAll('.bar-fill').forEach(b => b.style.height = b.dataset.h + '%'), 80);
}

function renderTopMahasiswa(byMhs) {
  const container = document.getElementById('top-mahasiswa');
  if (!container) return;
  const entries = Object.entries(byMhs).map(([nim, list]) => {
    const mhs = STATE.data.mahasiswa.find(m => String(m.NIM) === String(nim));
    return { nim, nama: mhs ? mhs.Nama : nim, ipk: hitungIp(list) };
  }).sort((a,b) => b.ipk - a.ipk).slice(0, 5);
  if (!entries.length) { container.innerHTML = emptyState('🏆','Belum ada data','Peringkat muncul setelah ada nilai'); return; }
  const medals = ['🥇','🥈','🥉'];
  container.innerHTML = entries.map((e, i) => `
    <div class="list-row">
      <span class="rank-num">${i < 3 ? medals[i] : '#' + (i+1)}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(e.nama)}</div>
        <div class="mono" style="font-size:11px; color:var(--text-muted);">${esc(e.nim)}</div>
      </div>
      <div style="font-weight:800; color:var(--accent); font-size:15px;" class="display">${e.ipk.toFixed(2)}</div>
    </div>`).join('');
}

function renderRecentNilai() {
  const container = document.getElementById('recent-nilai');
  if (!container) return;
  const recent = [...STATE.data.nilai].sort((a,b) => new Date(b['Tanggal Input']) - new Date(a['Tanggal Input'])).slice(0, 8);
  if (!recent.length) { container.innerHTML = emptyState('📝','Belum ada nilai','Input nilai untuk melihat aktivitas terbaru'); return; }
  container.innerHTML = recent.map(n => {
    const grade = getGrade(n['Skor Normalisasi']);
    return `<div class="list-row">
      <div class="grade-chip" style="background:${grade.color}1c; color:${grade.color};">${n['Nilai Huruf']}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(n['Nama Mahasiswa'])}</div>
        <div style="font-size:11.5px; color:var(--text-muted);">${esc(n['Nama Mata Kuliah'])} · Semester ${esc(n.Semester)}</div>
      </div>
      <div style="font-weight:800; color:${grade.color}; font-size:14px;" class="display">${n['Skor Normalisasi']}</div>
    </div>`;
  }).join('');
}

// ================================================
// GENERIC FILTERED LIST RENDER HELPER
// ================================================
function filterList(arr, search) {
  if (!search) return arr;
  const q = search.toLowerCase();
  return arr.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
}

function filterBar(searchId, placeholder, onInput, addLabel, addFn) {
  return `<div class="filter-bar-wrap"><div class="filter-row">
      <div class="filter-group" style="flex:1;"><label class="filter-label">🔍 Cari</label>
      <input type="text" id="${searchId}" class="filter-input" placeholder="${placeholder}" oninput="${onInput}"></div>
      <button class="btn btn-primary" onclick="${addFn}">➕ ${addLabel}</button>
    </div></div>`;
}

// ================================================
// MAHASISWA
// ================================================
async function renderMahasiswaPage() {
  await loadAllData();
  const c = document.getElementById('mahasiswa-content'); if (!c) return;
  c.innerHTML = filterBar('mhs-search', 'Cari nama, NIM, angkatan, status...', 'renderMahasiswaTable()', 'Tambah Mahasiswa', 'openMahasiswaModal()') + '<div id="mhs-table-wrap"></div>';
  renderMahasiswaTable();
}
function renderMahasiswaTable() {
  const wrap = document.getElementById('mhs-table-wrap'); if (!wrap) return;
  const search = document.getElementById('mhs-search')?.value || '';
  const rows = filterList(STATE.data.mahasiswa, search).sort((a,b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('🎓','Belum ada data mahasiswa','Klik “Tambah Mahasiswa” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIM</th><th class="col-left">Nama</th><th>Angkatan</th><th>JK</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(m => `<tr>
      <td class="mono">${esc(m.NIM)}</td>
      <td class="col-left"><strong>${esc(m.Nama)}</strong>${m.Email ? `<br><span style="font-size:10.5px;color:var(--text-muted);">${esc(m.Email)}</span>` : ''}</td>
      <td>${esc(m.Angkatan)}</td>
      <td>${esc(m['Jenis Kelamin'] || '-')}</td>
      <td><span class="pill ${m.Status === 'Aktif' ? 'pill-ok' : 'pill-off'}">${esc(m.Status)}</span></td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openMahasiswaModal(${JSON.stringify(m).replace(/'/g,"&#39;")})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusMahasiswa('${m.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openMahasiswaModal(data) {
  STATE.editingId = data ? data.ID : null;
  setText('modal-mhs-title', data ? 'Edit Mahasiswa' : 'Tambah Mahasiswa');
  document.getElementById('mhs-nim').value = data ? data.NIM : '';
  document.getElementById('mhs-nama').value = data ? data.Nama : '';
  document.getElementById('mhs-angkatan').value = data ? data.Angkatan : '';
  document.getElementById('mhs-jk').value = data ? (data['Jenis Kelamin'] || 'L') : 'L';
  document.getElementById('mhs-status').value = data ? data.Status : 'Aktif';
  document.getElementById('mhs-email').value = data ? (data.Email || '') : '';
  openModal('modal-mahasiswa');
}
async function submitMahasiswa() {
  const nim = document.getElementById('mhs-nim').value.trim();
  const nama = document.getElementById('mhs-nama').value.trim();
  const angkatan = document.getElementById('mhs-angkatan').value.trim();
  const jk = document.getElementById('mhs-jk').value;
  const status = document.getElementById('mhs-status').value;
  const email = document.getElementById('mhs-email').value.trim();
  if (!nim || !nama || !angkatan) { showToast('⚠️ NIM, Nama, dan Angkatan wajib diisi', 'warning'); return; }
  const dup = STATE.data.mahasiswa.find(m => String(m.NIM) === nim && m.ID !== STATE.editingId);
  if (dup) { showToast('⚠️ NIM sudah terdaftar', 'warning'); return; }
  const patch = { NIM: nim, Nama: nama, Angkatan: angkatan, 'Jenis Kelamin': jk, Status: status, Email: email };
  if (STATE.editingId) { await dbEdit('mahasiswa', STATE.editingId, patch, 'editMahasiswa'); showToast('✅ Data mahasiswa diperbarui', 'success'); }
  else { await dbAdd('mahasiswa', { ID: nextId('MHS'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addMahasiswa'); showToast('✅ Mahasiswa ditambahkan', 'success'); }
  closeModal('modal-mahasiswa'); renderMahasiswaTable();
}
async function hapusMahasiswa(id) {
  if (!confirm('Hapus data mahasiswa ini? Data nilai terkait tidak ikut terhapus.')) return;
  await dbDelete('mahasiswa', id, 'deleteMahasiswa'); showToast('🗑️ Mahasiswa dihapus', 'warning'); renderMahasiswaTable();
}

// ================================================
// DOSEN
// ================================================
async function renderDosenPage() {
  await loadAllData();
  const c = document.getElementById('dosen-content'); if (!c) return;
  c.innerHTML = filterBar('dsn-search', 'Cari nama, NIDN, jabatan...', 'renderDosenTable()', 'Tambah Dosen', 'openDosenModal()') + '<div id="dsn-table-wrap"></div>';
  renderDosenTable();
}
function renderDosenTable() {
  const wrap = document.getElementById('dsn-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.dosen, document.getElementById('dsn-search')?.value || '').sort((a,b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('🧑‍🏫','Belum ada data dosen','Klik “Tambah Dosen” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIDN</th><th class="col-left">Nama</th><th>Jabatan</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(d => `<tr>
      <td class="mono">${esc(d.NIDN)}</td>
      <td class="col-left"><strong>${esc(d.Nama)}</strong>${d.Email ? `<br><span style="font-size:10.5px;color:var(--text-muted);">${esc(d.Email)}</span>` : ''}</td>
      <td>${esc(d.Jabatan || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openDosenModal(${JSON.stringify(d).replace(/'/g,"&#39;")})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusDosen('${d.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openDosenModal(data) {
  STATE.editingId = data ? data.ID : null;
  setText('modal-dsn-title', data ? 'Edit Dosen' : 'Tambah Dosen');
  document.getElementById('dsn-nidn').value = data ? data.NIDN : '';
  document.getElementById('dsn-nama').value = data ? data.Nama : '';
  document.getElementById('dsn-jabatan').value = data ? (data.Jabatan || '') : '';
  document.getElementById('dsn-email').value = data ? (data.Email || '') : '';
  openModal('modal-dosen');
}
async function submitDosen() {
  const nidn = document.getElementById('dsn-nidn').value.trim();
  const nama = document.getElementById('dsn-nama').value.trim();
  const jabatan = document.getElementById('dsn-jabatan').value.trim();
  const email = document.getElementById('dsn-email').value.trim();
  if (!nidn || !nama) { showToast('⚠️ NIDN dan Nama wajib diisi', 'warning'); return; }
  const patch = { NIDN: nidn, Nama: nama, Jabatan: jabatan, Email: email };
  if (STATE.editingId) { await dbEdit('dosen', STATE.editingId, patch, 'editDosen'); showToast('✅ Data dosen diperbarui', 'success'); }
  else { await dbAdd('dosen', { ID: nextId('DSN'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addDosen'); showToast('✅ Dosen ditambahkan', 'success'); }
  closeModal('modal-dosen'); renderDosenTable();
}
async function hapusDosen(id) {
  if (!confirm('Hapus data dosen ini?')) return;
  await dbDelete('dosen', id, 'deleteDosen'); showToast('🗑️ Dosen dihapus', 'warning'); renderDosenTable();
}

// ================================================
// STAF
// ================================================
async function renderStafPage() {
  await loadAllData();
  const c = document.getElementById('staf-content'); if (!c) return;
  c.innerHTML = filterBar('stf-search', 'Cari nama, NIP, jabatan...', 'renderStafTable()', 'Tambah Staf', 'openStafModal()') + '<div id="stf-table-wrap"></div>';
  renderStafTable();
}
function renderStafTable() {
  const wrap = document.getElementById('stf-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.staf, document.getElementById('stf-search')?.value || '').sort((a,b) => String(a.Nama).localeCompare(String(b.Nama)));
  if (!rows.length) { wrap.innerHTML = emptyState('👥','Belum ada data staf','Klik “Tambah Staf” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>NIP</th><th class="col-left">Nama</th><th class="col-left">Jabatan</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(s => `<tr>
      <td class="mono">${esc(s.NIP || '-')}</td>
      <td class="col-left"><strong>${esc(s.Nama)}</strong></td>
      <td class="col-left">${esc(s.Jabatan)}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openStafModal(${JSON.stringify(s).replace(/'/g,"&#39;")})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusStaf('${s.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openStafModal(data) {
  STATE.editingId = data ? data.ID : null;
  setText('modal-stf-title', data ? 'Edit Staf' : 'Tambah Staf');
  document.getElementById('stf-nip').value = data ? (data.NIP || '') : '';
  document.getElementById('stf-nama').value = data ? data.Nama : '';
  document.getElementById('stf-jabatan').value = data ? data.Jabatan : '';
  openModal('modal-staf');
}
async function submitStaf() {
  const nip = document.getElementById('stf-nip').value.trim();
  const nama = document.getElementById('stf-nama').value.trim();
  const jabatan = document.getElementById('stf-jabatan').value.trim();
  if (!nama || !jabatan) { showToast('⚠️ Nama dan Jabatan wajib diisi', 'warning'); return; }
  const patch = { NIP: nip, Nama: nama, Jabatan: jabatan };
  if (STATE.editingId) { await dbEdit('staf', STATE.editingId, patch, 'editStaf'); showToast('✅ Data staf diperbarui', 'success'); }
  else { await dbAdd('staf', { ID: nextId('STF'), ...patch, 'Tanggal Daftar': new Date().toISOString() }, 'addStaf'); showToast('✅ Staf ditambahkan', 'success'); }
  closeModal('modal-staf'); renderStafTable();
}
async function hapusStaf(id) {
  if (!confirm('Hapus data staf ini?')) return;
  await dbDelete('staf', id, 'deleteStaf'); showToast('🗑️ Staf dihapus', 'warning'); renderStafTable();
}

// ================================================
// MATA KULIAH
// ================================================
async function renderMatkulPage() {
  await loadAllData();
  const c = document.getElementById('matkul-content'); if (!c) return;
  c.innerHTML = filterBar('mk-search', 'Cari kode, nama, dosen...', 'renderMatkulTable()', 'Tambah Mata Kuliah', 'openMatkulModal()') + '<div id="mk-table-wrap"></div>';
  renderMatkulTable();
}
function renderMatkulTable() {
  const wrap = document.getElementById('mk-table-wrap'); if (!wrap) return;
  const rows = filterList(STATE.data.mataKuliah, document.getElementById('mk-search')?.value || '').sort((a,b) => Number(a.Semester) - Number(b.Semester) || String(a.Kode).localeCompare(String(b.Kode)));
  if (!rows.length) { wrap.innerHTML = emptyState('📚','Belum ada mata kuliah','Klik “Tambah Mata Kuliah” untuk menambahkan data baru'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th>Kode</th><th class="col-left">Nama Mata Kuliah</th><th>SKS</th><th>Semester</th><th class="col-left">Dosen Pengampu</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(m => `<tr>
      <td class="mono">${esc(m.Kode)}</td>
      <td class="col-left"><strong>${esc(m['Nama Mata Kuliah'])}</strong></td>
      <td><strong>${esc(m.SKS || '-')}</strong></td>
      <td>${esc(m.Semester)}</td>
      <td class="col-left">${esc(m['Dosen Pengampu'] || '-')}</td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick='openMatkulModal(${JSON.stringify(m).replace(/'/g,"&#39;")})' title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusMatkul('${m.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function openMatkulModal(data) {
  STATE.editingId = data ? data.ID : null;
  setText('modal-mk-title', data ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah');
  document.getElementById('mk-kode').value = data ? data.Kode : '';
  document.getElementById('mk-nama').value = data ? data['Nama Mata Kuliah'] : '';
  document.getElementById('mk-sks').value = data ? (data.SKS || '') : '';
  document.getElementById('mk-semester').value = data ? data.Semester : '';
  const sel = document.getElementById('mk-dosen');
  sel.innerHTML = '<option value="">— Pilih Dosen —</option>' + STATE.data.dosen.map(d => `<option value="${esc(d.Nama)}" ${data && data['Dosen Pengampu'] === d.Nama ? 'selected' : ''}>${esc(d.Nama)}</option>`).join('');
  openModal('modal-matkul');
}
async function submitMatkul() {
  const kode = document.getElementById('mk-kode').value.trim();
  const nama = document.getElementById('mk-nama').value.trim();
  const sks = Number(document.getElementById('mk-sks').value);
  const semester = document.getElementById('mk-semester').value.trim();
  const dosen = document.getElementById('mk-dosen').value;
  if (!kode || !nama || !semester || !sks) { showToast('⚠️ Kode, Nama, SKS, dan Semester wajib diisi', 'warning'); return; }
  const patch = { Kode: kode, 'Nama Mata Kuliah': nama, SKS: sks, Semester: semester, 'Dosen Pengampu': dosen };
  if (STATE.editingId) { await dbEdit('mataKuliah', STATE.editingId, patch, 'editMataKuliah'); showToast('✅ Mata kuliah diperbarui', 'success'); }
  else { await dbAdd('mataKuliah', { ID: nextId('MK'), ...patch, 'Tanggal Dibuat': new Date().toISOString() }, 'addMataKuliah'); showToast('✅ Mata kuliah ditambahkan', 'success'); }
  closeModal('modal-matkul'); renderMatkulTable();
}
async function hapusMatkul(id) {
  if (!confirm('Hapus data mata kuliah ini?')) return;
  await dbDelete('mataKuliah', id, 'deleteMataKuliah'); showToast('🗑️ Mata kuliah dihapus', 'warning'); renderMatkulTable();
}

// ================================================
// INPUT NILAI
// ================================================
async function renderNilaiPage() {
  await loadAllData();
  const c = document.getElementById('nilai-content'); if (!c) return;
  c.innerHTML = `
    <div class="nilai-layout" style="display:grid; grid-template-columns:380px 1fr; gap:22px; align-items:flex-start;">
      <div class="card"><div class="card-body">
        <div class="section-eyebrow" style="margin-bottom:14px;">✍️ Form Input Nilai</div>
        <div style="display:flex; flex-direction:column; gap:13px;">
          <div class="form-group"><label class="form-label">Mahasiswa <span class="req">*</span></label>
            <select id="nl-mahasiswa" class="form-select"><option value="">— Pilih Mahasiswa —</option>
            ${STATE.data.mahasiswa.map(m => `<option value="${esc(m.NIM)}" data-nama="${esc(m.Nama)}">${esc(m.Nama)} (${esc(m.NIM)})</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Mata Kuliah <span class="req">*</span></label>
            <select id="nl-matkul" class="form-select"><option value="">— Pilih Mata Kuliah —</option>
            ${STATE.data.mataKuliah.map(m => `<option value="${esc(m.Kode)}" data-nama="${esc(m['Nama Mata Kuliah'])}" data-semester="${esc(m.Semester)}" data-sks="${esc(m.SKS||'')}">${esc(m.Kode)} — ${esc(m['Nama Mata Kuliah'])} (Smt ${esc(m.Semester)})</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Semester <span class="req">*</span></label>
            <input type="number" id="nl-semester" class="form-input" placeholder="Otomatis dari mata kuliah" min="1" max="14">
            <div class="form-hint">Terisi otomatis dari mata kuliah, dapat diubah manual</div></div>
          <div style="border-top:1px solid var(--border); padding-top:13px; display:grid; grid-template-columns:1fr 1fr; gap:11px;">
            <div class="form-group"><label class="form-label">Tugas (20%)</label><input type="number" id="nl-tugas" class="form-input" placeholder="0-100" min="0" max="100" oninput="updatePreviewNilai()"></div>
            <div class="form-group"><label class="form-label">Praktik (50%)</label><input type="number" id="nl-praktik" class="form-input" placeholder="0-100" min="0" max="100" oninput="updatePreviewNilai()"></div>
            <div class="form-group"><label class="form-label">UTS (25%)</label><input type="number" id="nl-uts" class="form-input" placeholder="0-100" min="0" max="100" oninput="updatePreviewNilai()"></div>
            <div class="form-group"><label class="form-label">UAS (35%)</label><input type="number" id="nl-uas" class="form-input" placeholder="0-100" min="0" max="100" oninput="updatePreviewNilai()"></div>
            <div class="form-group full"><label class="form-label">Absen (5%)</label><input type="number" id="nl-absen" class="form-input" placeholder="0-100" min="0" max="100" oninput="updatePreviewNilai()"></div>
          </div>
          <div id="nilai-preview-box" class="preview-box" style="display:none;">
            <div class="preview-label">Pratinjau Hasil</div>
            <div class="preview-row">
              <div class="preview-stat"><div class="preview-stat-val" id="preview-skor">0</div><div class="preview-stat-lbl">Skor Akhir</div></div>
              <div class="preview-div"></div>
              <div class="preview-stat"><div class="preview-stat-val" id="preview-huruf">-</div><div class="preview-stat-lbl">Nilai Huruf</div></div>
              <div class="preview-div"></div>
              <div class="preview-stat"><div class="preview-stat-val" id="preview-bobot">0</div><div class="preview-stat-lbl">Bobot IP</div></div>
            </div>
          </div>
          <button class="btn btn-primary btn-block" onclick="submitNilai()">💾 Simpan Nilai</button>
        </div>
      </div></div>
      <div>
        <div class="filter-bar-wrap"><div class="filter-row">
          <div class="filter-group"><label class="filter-label">🎓 Mahasiswa</label>
            <select id="nl-filter-mhs" class="filter-select" onchange="renderNilaiTable()"><option value="all">— Semua —</option>
            ${STATE.data.mahasiswa.map(m => `<option value="${esc(m.NIM)}">${esc(m.Nama)}</option>`).join('')}</select></div>
          <div class="filter-group"><label class="filter-label">📚 Mata Kuliah</label>
            <select id="nl-filter-mk" class="filter-select" onchange="renderNilaiTable()"><option value="all">— Semua —</option>
            ${STATE.data.mataKuliah.map(m => `<option value="${esc(m.Kode)}">${esc(m['Nama Mata Kuliah'])}</option>`).join('')}</select></div>
          <div class="filter-group" style="flex:1;"><label class="filter-label">🔍 Cari</label>
            <input type="text" id="nl-filter-search" class="filter-input" placeholder="Cari nama, NIM, mata kuliah..." oninput="renderNilaiTable()"></div>
          <button class="btn btn-secondary" onclick="exportNilaiCsv()">⬇️ Ekspor CSV</button>
        </div></div>
        <div id="nl-table-wrap"></div>
      </div>
    </div>`;
  document.getElementById('nl-matkul').addEventListener('change', e => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset.semester) document.getElementById('nl-semester').value = opt.dataset.semester;
  });
  renderNilaiTable();
}
function updatePreviewNilai() {
  const v = id => Number(document.getElementById(id).value) || 0;
  const t = v('nl-tugas'), p = v('nl-praktik'), u = v('nl-uts'), a = v('nl-uas'), b = v('nl-absen');
  const box = document.getElementById('nilai-preview-box');
  if (!t && !p && !u && !a && !b) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const h = hitungSkor(t, p, u, a, b);
  const set = (id, val, col) => { const el = document.getElementById(id); el.textContent = val; el.style.color = col; };
  set('preview-skor', h.skorNormalisasi, h.grade.color);
  set('preview-huruf', h.grade.label, h.grade.color);
  set('preview-bobot', h.grade.bobot.toFixed(2), h.grade.color);
}
async function submitNilai() {
  const mhsSel = document.getElementById('nl-mahasiswa');
  const mkSel = document.getElementById('nl-matkul');
  const nim = mhsSel.value;
  const namaMhs = mhsSel.selectedOptions[0]?.dataset.nama;
  const kodeMk = mkSel.value;
  const namaMk = mkSel.selectedOptions[0]?.dataset.nama;
  const sks = Number(mkSel.selectedOptions[0]?.dataset.sks) || 0;
  const semester = document.getElementById('nl-semester').value;
  const v = id => Number(document.getElementById(id).value) || 0;
  const t = v('nl-tugas'), p = v('nl-praktik'), u = v('nl-uts'), a = v('nl-uas'), ab = v('nl-absen');
  if (!nim || !kodeMk || !semester) { showToast('⚠️ Mahasiswa, Mata Kuliah, dan Semester wajib diisi', 'warning'); return; }
  const h = hitungSkor(t, p, u, a, ab);
  await dbAdd('nilai', {
    ID: nextId('NL'), 'NIM Mahasiswa': nim, 'Nama Mahasiswa': namaMhs, 'Kode MK': kodeMk, 'Nama Mata Kuliah': namaMk,
    Semester: semester, SKS: sks, Tugas: t, Praktik: p, UTS: u, UAS: a, Absen: ab,
    'Skor Mentah': h.skorMentah, 'Skor Normalisasi': h.skorNormalisasi, 'Nilai Huruf': h.grade.label, 'Bobot IP': h.grade.bobot,
    'Tanggal Input': new Date().toISOString()
  }, 'addNilai');
  showToast(`✅ Nilai tersimpan: ${namaMhs} → ${h.grade.label} (${h.skorNormalisasi})`, 'success');
  ['nl-tugas','nl-praktik','nl-uts','nl-uas','nl-absen'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('nilai-preview-box').style.display = 'none';
  renderNilaiTable();
}
function renderNilaiTable() {
  const wrap = document.getElementById('nl-table-wrap'); if (!wrap) return;
  const fMhs = document.getElementById('nl-filter-mhs')?.value || 'all';
  const fMk = document.getElementById('nl-filter-mk')?.value || 'all';
  const search = (document.getElementById('nl-filter-search')?.value || '').toLowerCase();
  const rows = STATE.data.nilai.filter(n =>
    (fMhs === 'all' || String(n['NIM Mahasiswa']) === fMhs) &&
    (fMk === 'all' || n['Kode MK'] === fMk) &&
    (!search || Object.values(n).some(v => String(v).toLowerCase().includes(search)))
  ).sort((a,b) => new Date(b['Tanggal Input']) - new Date(a['Tanggal Input']));
  if (!rows.length) { wrap.innerHTML = emptyState('📝','Belum ada nilai','Gunakan form di samping untuk menambahkan nilai'); return; }
  wrap.innerHTML = `<div class="table-container"><table class="data-table data-table-center">
    <thead><tr><th class="col-left">Mahasiswa</th><th class="col-left">Mata Kuliah</th><th>Smt</th><th>SKS</th><th>Tgs</th><th>Prk</th><th>UTS</th><th>UAS</th><th>Abs</th><th>Skor</th><th>Grade</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(n => { const g = getGrade(n['Skor Normalisasi']); return `<tr>
      <td class="col-left"><strong>${esc(n['Nama Mahasiswa'])}</strong><br><span class="mono" style="font-size:10px;color:var(--text-muted);">${esc(n['NIM Mahasiswa'])}</span></td>
      <td class="col-left">${esc(n['Nama Mata Kuliah'])}</td>
      <td>${esc(n.Semester)}</td><td>${esc(n.SKS||'-')}</td>
      <td>${esc(n.Tugas)}</td><td>${esc(n.Praktik)}</td><td>${esc(n.UTS)}</td><td>${esc(n.UAS)}</td><td>${esc(n.Absen)}</td>
      <td><strong style="color:${g.color};">${n['Skor Normalisasi']}</strong></td>
      <td><span class="grade-tag" style="background:${g.color};">${n['Nilai Huruf']}</span></td>
      <td><div class="row-actions">
        <button class="btn-row-action edit" onclick="openEditNilai('${n.ID}')" title="Edit">✏️</button>
        <button class="btn-row-action delete" onclick="hapusNilai('${n.ID}')" title="Hapus">🗑️</button>
      </div></td></tr>`; }).join('')}
    </tbody></table></div>`;
}
function openEditNilai(id) {
  const n = STATE.data.nilai.find(x => String(x.ID) === String(id)); if (!n) return;
  STATE.editingId = id;
  document.getElementById('enl-mhs').value = `${n['Nama Mahasiswa']} (${n['NIM Mahasiswa']})`;
  document.getElementById('enl-mk').value = `${n['Nama Mata Kuliah']} · Semester ${n.Semester}`;
  document.getElementById('enl-tugas').value = n.Tugas;
  document.getElementById('enl-praktik').value = n.Praktik;
  document.getElementById('enl-uts').value = n.UTS;
  document.getElementById('enl-uas').value = n.UAS;
  document.getElementById('enl-absen').value = n.Absen;
  openModal('modal-nilai');
}
async function submitEditNilai() {
  const v = id => Number(document.getElementById(id).value) || 0;
  const t = v('enl-tugas'), p = v('enl-praktik'), u = v('enl-uts'), a = v('enl-uas'), ab = v('enl-absen');
  const h = hitungSkor(t, p, u, a, ab);
  await dbEdit('nilai', STATE.editingId, {
    Tugas: t, Praktik: p, UTS: u, UAS: a, Absen: ab,
    'Skor Mentah': h.skorMentah, 'Skor Normalisasi': h.skorNormalisasi, 'Nilai Huruf': h.grade.label, 'Bobot IP': h.grade.bobot
  }, 'editNilai');
  closeModal('modal-nilai');
  showToast(`✅ Nilai diperbarui → ${h.grade.label} (${h.skorNormalisasi})`, 'success');
  renderNilaiTable();
}
async function hapusNilai(id) {
  if (!confirm('Hapus data nilai ini? IPS & IPK terkait akan berubah.')) return;
  await dbDelete('nilai', id, 'deleteNilai'); showToast('🗑️ Nilai dihapus', 'warning'); renderNilaiTable();
}
function exportNilaiCsv() {
  if (!STATE.data.nilai.length) { showToast('⚠️ Belum ada nilai untuk diekspor', 'warning'); return; }
  const cols = ['NIM Mahasiswa','Nama Mahasiswa','Kode MK','Nama Mata Kuliah','Semester','SKS','Tugas','Praktik','UTS','UAS','Absen','Skor Normalisasi','Nilai Huruf','Bobot IP'];
  downloadCsv('nilai_akademikap.csv', cols, STATE.data.nilai);
  showToast('⬇️ File CSV nilai diunduh', 'success');
}
function downloadCsv(filename, cols, rows) {
  const escCsv = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => escCsv(r[c])).join(','))).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ================================================
// RAPOR / KHS
// ================================================
async function renderRaporPage() {
  await loadAllData();
  const c = document.getElementById('rapor-content'); if (!c) return;
  c.innerHTML = `
    <div class="filter-bar-wrap no-print"><div class="filter-row">
      <div class="filter-group" style="flex:1;"><label class="filter-label">🎓 Pilih Mahasiswa</label>
        <select id="rapor-mhs-select" class="filter-select" style="width:100%;" onchange="loadRapor()"><option value="">— Pilih mahasiswa untuk melihat rapor —</option>
        ${STATE.data.mahasiswa.map(m => `<option value="${esc(m.NIM)}">${esc(m.Nama)} (${esc(m.NIM)})</option>`).join('')}</select></div>
      <button class="btn btn-secondary" id="btn-print-khs" onclick="window.print()" disabled>🖨️ Cetak KHS</button>
    </div></div>
    <div id="rapor-detail">${emptyState('📋','Pilih mahasiswa','Pilih nama mahasiswa di atas untuk melihat rapor & KHS lengkapnya')}</div>`;
}
function computeRapor(nim) {
  const all = STATE.data.nilai.filter(n => String(n['NIM Mahasiswa']) === String(nim));
  const bySem = {};
  all.forEach(n => { (bySem[n.Semester] = bySem[n.Semester] || []).push(n); });
  const perSemester = Object.keys(bySem).sort((a,b) => Number(a) - Number(b)).map(sem => ({
    semester: sem, ips: hitungIp(bySem[sem]),
    totalSks: bySem[sem].reduce((s,n) => s + getSks(n), 0),
    matkuls: bySem[sem].map(n => ({ kode: n['Kode MK'], nama: n['Nama Mata Kuliah'], sks: getSks(n), skor: n['Skor Normalisasi'], huruf: n['Nilai Huruf'], bobot: n['Bobot IP'] }))
  }));
  const ipk = hitungIp(all);
  const totalSks = all.reduce((s,n) => s + getSks(n), 0);
  const sksLulus = all.filter(n => n['Nilai Huruf'] !== 'E').reduce((s,n) => s + getSks(n), 0);
  let status = 'Sedang Berjalan';
  if (all.length && ipk < 2.0) status = 'Perlu Perbaikan (IPK < 2.00)';
  else if (ipk >= 2.0) status = 'Memenuhi Syarat Akademik';
  return { nim, perSemester, ipk, totalMatkul: all.length, totalSks, sksLulus, predikat: predikatFor(ipk), status };
}
async function loadRapor() {
  const nim = document.getElementById('rapor-mhs-select').value;
  const detail = document.getElementById('rapor-detail');
  const btn = document.getElementById('btn-print-khs');
  if (!nim) { detail.innerHTML = emptyState('📋','Pilih mahasiswa','Pilih nama mahasiswa untuk melihat rapor'); if (btn) btn.disabled = true; return; }
  if (btn) btn.disabled = false;
  const rapor = computeRapor(nim);
  const mhs = STATE.data.mahasiswa.find(m => String(m.NIM) === String(nim));
  drawRapor(rapor, mhs);
}
function drawRapor(rapor, mhs) {
  const detail = document.getElementById('rapor-detail');
  const ipk = rapor.ipk;
  const pct = Math.min((ipk / 4) * 100, 100);
  const radius = 66, circ = 2 * Math.PI * radius, dash = (pct / 100) * circ;
  const statusColor = rapor.status.includes('Memenuhi') ? 'var(--emerald)' : rapor.status === 'Sedang Berjalan' ? 'var(--cyan)' : 'var(--rose)';
  detail.innerHTML = `
    <div class="ipk-card fade-in" style="margin-bottom:22px;">
      <div class="ipk-ring-wrap"><svg width="152" height="152" viewBox="0 0 152 152">
        <circle cx="76" cy="76" r="${radius}" fill="none" stroke="var(--border)" stroke-width="11"/>
        <circle cx="76" cy="76" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="11" stroke-dasharray="${circ}" stroke-dashoffset="${circ - dash}" stroke-linecap="round"/>
      </svg><div class="ipk-ring-inner"><div class="ipk-num">${ipk.toFixed(2)}</div><div class="ipk-num-lbl">IPK Kumulatif</div></div></div>
      <div class="ipk-detail">
        <div class="ipk-detail-title">${esc(mhs ? mhs.Nama : rapor.nim)}</div>
        <div class="ipk-detail-sub">NIM ${esc(rapor.nim)} · ${rapor.totalMatkul} mata kuliah · ${rapor.totalSks} SKS ditempuh · ${rapor.sksLulus} SKS lulus</div>
        <span class="ipk-badge" style="background:var(--accent-subtle); color:var(--accent);">🏅 ${esc(rapor.predikat)}</span>
        <span class="ipk-badge" style="background:${statusColor}22; color:${statusColor};">${esc(rapor.status)}</span>
      </div>
    </div>
    <div class="section-header"><div class="section-eyebrow">Kartu Hasil Studi</div><div class="section-title" style="font-size:17px;">Riwayat Nilai per Semester</div></div>
    ${rapor.perSemester.length === 0 ? emptyState('📭','Belum ada nilai','Mahasiswa ini belum memiliki nilai tersimpan') :
      rapor.perSemester.map(sem => `
      <div class="card fade-in" style="margin-bottom:16px;"><div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:800; font-size:15px;" class="display">📘 Semester ${esc(sem.semester)} · ${sem.totalSks} SKS</div>
          <div style="display:flex; align-items:center; gap:8px;"><span style="font-size:11px; color:var(--text-muted);">IPS</span><span class="display" style="font-size:21px; font-weight:800; color:var(--accent);">${sem.ips.toFixed(2)}</span></div>
        </div>
        <div class="table-container"><table class="data-table data-table-center">
          <thead><tr><th class="col-left">Mata Kuliah</th><th>Kode</th><th>SKS</th><th>Skor</th><th>Huruf</th><th>Bobot</th></tr></thead><tbody>
          ${sem.matkuls.map(mk => { const g = getGrade(mk.skor); return `<tr>
            <td class="col-left">${esc(mk.nama)}</td><td class="mono">${esc(mk.kode)}</td><td>${mk.sks}</td>
            <td><strong style="color:${g.color};">${mk.skor}</strong></td>
            <td><span class="grade-tag" style="background:${g.color};">${mk.huruf}</span></td>
            <td>${Number(mk.bobot).toFixed(2)}</td></tr>`; }).join('')}
        </tbody></table></div>
      </div></div>`).join('')}`;
}

// ================================================
// PENGATURAN
// ================================================
async function renderPengaturan() {
  await loadAllData();
  const c = document.getElementById('pengaturan-content'); if (!c) return;
  const i = inst();
  const cloudOn = STATE.mode === 'cloud';
  c.innerHTML = `
    <div class="card" style="margin-bottom:20px;"><div class="card-head"><div class="card-head-title">📦 Penyimpanan Data</div></div><div class="card-body">
      <div class="setting-row">
        <div><div class="setting-info-title">Mode Cloud (Google Apps Script)</div>
          <div class="setting-info-sub">Nonaktif = data tersimpan di perangkat ini (selalu berfungsi). Aktif = sinkron ke Google Sheets melalui URL Apps Script.</div></div>
        <label class="switch"><input type="checkbox" id="set-cloud" ${cloudOn ? 'checked' : ''} onchange="toggleCloudMode(this.checked)"><span class="switch-slider"></span></label>
      </div>
      <div class="setting-row">
        <div style="flex:1; min-width:240px;"><div class="setting-info-title">URL Apps Script</div>
          <div class="setting-info-sub">Tempel URL Web App dari Google Apps Script (diakhiri /exec).</div>
          <input type="text" id="set-url" class="form-input" style="margin-top:10px;" placeholder="https://script.google.com/macros/s/XXXX/exec" value="${esc((typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL) || i.appsUrl || '')}">
        </div>
      </div>
      <div class="setting-row"><div><div class="setting-info-title">Status koneksi</div><div class="setting-info-sub">Saat ini: <strong>${cloudOn ? 'Mode Cloud' : 'Mode Lokal'}</strong></div></div>
        <button class="btn btn-secondary" onclick="saveAppsUrl()">💾 Simpan URL</button></div>
    </div></div>

    <div class="card" style="margin-bottom:20px;"><div class="card-head"><div class="card-head-title">🏛️ Identitas Institusi</div></div><div class="card-body">
      <div class="form-grid">
        <div class="form-group full"><label class="form-label">Nama Institusi</label><input type="text" id="set-institusi" class="form-input" value="${esc(instVal('namaInstitusi'))}"></div>
        <div class="form-group full"><label class="form-label">Nama Program Studi</label><input type="text" id="set-prodi" class="form-input" value="${esc(instVal('namaProdi'))}"></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" onclick="saveInstitusi()">💾 Simpan Identitas</button></div>
    </div></div>

    <div class="card"><div class="card-head"><div class="card-head-title">📤 Cadangan &amp; Pemulihan Data</div></div><div class="card-body">
      <div class="setting-row"><div><div class="setting-info-title">Ekspor seluruh data</div><div class="setting-info-sub">Unduh semua data (JSON) sebagai cadangan.</div></div>
        <button class="btn btn-secondary" onclick="exportBackup()">⬇️ Ekspor JSON</button></div>
      <div class="setting-row"><div><div class="setting-info-title">Impor data</div><div class="setting-info-sub">Pulihkan data dari file cadangan JSON.</div></div>
        <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">⬆️ Impor JSON</button>
        <input type="file" id="import-file" accept="application/json" style="display:none;" onchange="importBackup(event)"></div>
      <div class="setting-row"><div><div class="setting-info-title" style="color:var(--rose);">Reset ke data contoh</div><div class="setting-info-sub">Menghapus semua perubahan lokal dan memuat ulang data contoh awal.</div></div>
        <button class="btn btn-danger" onclick="resetData()">♻️ Reset Data</button></div>
    </div></div>`;
}
function toggleCloudMode(on) {
  STATE.mode = on ? 'cloud' : 'local';
  localStorage.setItem(LS_KEYS.mode, STATE.mode);
  updateStoragePill();
  if (on && !(typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL) && !inst().appsUrl) {
    showToast('⚠️ Isi & simpan URL Apps Script terlebih dahulu', 'warning');
  } else {
    showToast(on ? '☁️ Mode Cloud aktif' : '💾 Mode Lokal aktif', 'info');
  }
}
function saveAppsUrl() {
  const url = document.getElementById('set-url').value.trim();
  const i = inst(); i.appsUrl = url; localStorage.setItem(LS_KEYS.inst, JSON.stringify(i));
  if (url) { try { window.APPS_SCRIPT_URL = url; } catch (e) {} }
  showToast('✅ URL Apps Script disimpan. Muat ulang halaman untuk menerapkan penuh.', 'success');
}
function saveInstitusi() {
  const i = inst();
  i.namaInstitusi = document.getElementById('set-institusi').value.trim() || CONFIG.namaInstitusi;
  i.namaProdi = document.getElementById('set-prodi').value.trim() || CONFIG.namaProdi;
  localStorage.setItem(LS_KEYS.inst, JSON.stringify(i));
  showToast('✅ Identitas institusi disimpan', 'success');
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(STATE.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'backup_akademikap.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('⬇️ Cadangan JSON diunduh', 'success');
}
function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      ['mahasiswa','dosen','staf','mataKuliah','nilai'].forEach(k => { if (!Array.isArray(data[k])) throw new Error('format'); });
      STATE.data = data; STATE.data.nilai.forEach(recalcNilaiRow);
      persistLocal(); updateBadges();
      showToast('✅ Data berhasil diimpor', 'success');
      navigate('dashboard');
    } catch (err) { showToast('❌ File cadangan tidak valid', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}
function resetData() {
  if (!confirm('Reset semua data ke contoh awal? Perubahan lokal akan hilang.')) return;
  localStorage.removeItem(LS_KEYS.data);
  STATE.loaded = false;
  loadAllData(true).then(() => { showToast('♻️ Data direset ke contoh awal', 'success'); navigate('dashboard'); });
}

// ================================================
// INIT
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem(LS_KEYS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  applyThemeLabels(theme);

  // Apply saved Apps Script URL override if user set one in Pengaturan
  try { const i = inst(); if (i.appsUrl && typeof APPS_SCRIPT_URL !== 'undefined' && !APPS_SCRIPT_URL) { window.APPS_SCRIPT_URL = i.appsUrl; } } catch (e) {}

  document.querySelectorAll('.nav-item[data-page]').forEach(item => item.addEventListener('click', () => navigate(item.dataset.page)));
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

  if (isLoggedIn()) showApp();
  else document.getElementById('login-screen').classList.add('show');
});
