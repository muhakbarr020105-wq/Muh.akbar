// ================================================
//  AKADEMIKAP — CORE (Campus Edition)
//  State, storage engine, multi-role auth, RBAC router, utilities
// ================================================
'use strict';

const LS_KEYS = {
  data:  'akademikap_data_v3',
  theme: 'akademikap_theme',
  auth:  'akademikap_session_v3',
  mode:  'akademikap_storage_mode',
  inst:  'akademikap_institusi'
};

const COLLECTIONS = ['tahunAkademik','mahasiswa','dosen','staf','ruangan','kelas','mataKuliah','jadwal','krs','presensi','pengumuman','kalender','keuangan','nilai'];

const STATE = {
  currentPage: 'dashboard',
  data: {},
  loaded: false,
  editingId: null,
  session: null,
  mode: (localStorage.getItem(LS_KEYS.mode) || (typeof STORAGE_MODE !== 'undefined' ? STORAGE_MODE : 'local')),
  loginRole: 'admin'
};
COLLECTIONS.forEach(k => STATE.data[k] = []);

function inst() { try { return JSON.parse(localStorage.getItem(LS_KEYS.inst)) || {}; } catch (e) { return {}; } }
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
function hitungIp(daftarNilai) {
  let totalBobotSks = 0, totalSks = 0;
  daftarNilai.forEach(n => { const sks = getSks(n); totalBobotSks += (Number(n['Bobot IP']) || 0) * sks; totalSks += sks; });
  return totalSks ? Math.round((totalBobotSks / totalSks) * 100) / 100 : 0;
}
function predikatFor(ipk) {
  if (ipk >= 3.51) return 'Dengan Pujian (Cumlaude)';
  if (ipk >= 3.01) return 'Sangat Memuaskan';
  if (ipk >= 2.76) return 'Memuaskan';
  if (ipk > 0)     return 'Cukup';
  return '-';
}
function recalcNilaiRow(n) {
  const h = hitungSkor(Number(n.Tugas)||0, Number(n.Praktik)||0, Number(n.UTS)||0, Number(n.UAS)||0, Number(n.Absen)||0);
  n['Skor Mentah'] = h.skorMentah; n['Skor Normalisasi'] = h.skorNormalisasi;
  n['Nilai Huruf'] = h.grade.label; n['Bobot IP'] = h.grade.bobot;
  return n;
}

// ================================================
// ACADEMIC PERIOD HELPERS
// ================================================
function getActiveTA() {
  const list = STATE.data.tahunAkademik || [];
  return list.find(t => t.Status === 'Aktif') || list[list.length - 1] || null;
}
function activeTAKode() { const t = getActiveTA(); return t ? t.Kode : ''; }

// ================================================
// STORAGE ENGINE
// ================================================
function isCloud() { return STATE.mode === 'cloud' && typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL; }
function persistLocal() { try { localStorage.setItem(LS_KEYS.data, JSON.stringify(STATE.data)); } catch (e) {} }

function freshSeed() {
  const seed = JSON.parse(JSON.stringify(typeof SEED_DATA !== 'undefined' ? SEED_DATA : {}));
  COLLECTIONS.forEach(k => { if (!Array.isArray(seed[k])) seed[k] = []; });
  (seed.nilai || []).forEach(recalcNilaiRow);
  return seed;
}
function seedIfEmpty() {
  const raw = localStorage.getItem(LS_KEYS.data);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      COLLECTIONS.forEach(k => { if (!Array.isArray(parsed[k])) parsed[k] = []; });
      return parsed;
    } catch (e) {}
  }
  const seed = freshSeed();
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
    try { const res = await attempt(); if (!res.ok) continue; const json = await res.json(); if (json.status === 'success') return json; } catch (e) { continue; }
  }
  return null;
}
async function cloudPost(action, payload) {
  try {
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) });
    return true;
  } catch (e) { return false; }
}

async function loadAllData(force) {
  if (STATE.loaded && !force) return;
  if (isCloud()) {
    const result = await cloudGet('getAll');
    if (result && result.data) {
      COLLECTIONS.forEach(k => { STATE.data[k] = result.data[k] || []; });
      (STATE.data.nilai || []).forEach(recalcNilaiRow);
      STATE.loaded = true; updateBadges(); return;
    }
    showToast('⚠️ Gagal terhubung ke server cloud. Beralih ke data lokal.', 'warning');
  }
  STATE.data = seedIfEmpty();
  COLLECTIONS.forEach(k => { if (!STATE.data[k]) STATE.data[k] = []; });
  (STATE.data.nilai || []).forEach(recalcNilaiRow);
  STATE.loaded = true; updateBadges();
}

function nextId(prefix) { return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

async function dbAdd(collection, record, cloudAction) {
  if (!STATE.data[collection]) STATE.data[collection] = [];
  STATE.data[collection].push(record); persistLocal();
  if (isCloud() && cloudAction) await cloudPost(cloudAction, recordToPayload(collection, record));
  updateBadges();
}
async function dbEdit(collection, id, patch, cloudAction) {
  const idx = STATE.data[collection].findIndex(r => String(r.ID) === String(id));
  if (idx > -1) STATE.data[collection][idx] = { ...STATE.data[collection][idx], ...patch };
  persistLocal();
  if (isCloud() && cloudAction) await cloudPost(cloudAction, { id, ...recordToPayload(collection, STATE.data[collection][idx]) });
  updateBadges();
}
async function dbDelete(collection, id, cloudAction) {
  STATE.data[collection] = STATE.data[collection].filter(r => String(r.ID) !== String(id));
  persistLocal();
  if (isCloud() && cloudAction) await cloudPost(cloudAction, { id });
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
// AUTH (multi-role)
// ================================================
function accounts() { return (typeof AKUN !== 'undefined' && Array.isArray(AKUN)) ? AKUN : []; }
function getSession() { try { return JSON.parse(localStorage.getItem(LS_KEYS.auth)); } catch (e) { return null; } }
function isLoggedIn() { return !!getSession(); }
function currentRole() { return STATE.session ? STATE.session.role : 'admin'; }

const ROLE_LABELS = { admin: 'Administrator', dosen: 'Dosen', mahasiswa: 'Mahasiswa' };
const ROLE_HINTS = {
  admin: 'Akun demo Admin — <code>admin</code> / <code>admin123</code>',
  dosen: 'Akun demo Dosen — <code>dosen</code> / <code>dosen123</code>',
  mahasiswa: 'Akun demo Mahasiswa — <code>mahasiswa</code> / <code>mhs123</code>'
};
function selectLoginRole(role) {
  STATE.loginRole = role;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.toggle('active', t.dataset.role === role));
  const hint = document.getElementById('login-hint'); if (hint) hint.innerHTML = ROLE_HINTS[role] || '';
}
function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const acc = accounts().find(a => a.username === u && a.password === p);
  if (acc) {
    STATE.session = { username: acc.username, role: acc.role, nama: acc.nama, ref: acc.ref || '' };
    localStorage.setItem(LS_KEYS.auth, JSON.stringify(STATE.session));
    showApp();
    showToast(`👋 Selamat datang, ${acc.nama}`, 'success');
    return false;
  }
  // backward compat (old AUTH admin)
  if (typeof AUTH !== 'undefined' && u === AUTH.username && p === AUTH.password) {
    STATE.session = { username: AUTH.username, role: 'admin', nama: AUTH.displayName, ref: '' };
    localStorage.setItem(LS_KEYS.auth, JSON.stringify(STATE.session));
    showApp(); return false;
  }
  showToast('❌ Username atau password salah', 'error');
  return false;
}
function handleLogout() {
  if (!confirm('Keluar dari portal?')) return;
  localStorage.removeItem(LS_KEYS.auth);
  STATE.session = null;
  document.getElementById('app-shell').classList.remove('show');
  document.getElementById('login-screen').classList.add('show');
  document.getElementById('login-pass').value = '';
}
function showApp() {
  STATE.session = STATE.session || getSession();
  document.getElementById('login-screen').classList.remove('show');
  document.getElementById('app-shell').classList.add('show');
  const nama = STATE.session.nama || 'Pengguna';
  setText('user-name', nama);
  document.getElementById('user-avatar').textContent = nama.charAt(0).toUpperCase();
  const roleEl = document.getElementById('user-role');
  roleEl.textContent = ROLE_LABELS[STATE.session.role] || STATE.session.role;
  roleEl.className = 'user-role role-' + STATE.session.role;
  applyRoleNav();
  updateStoragePill();
  navigate('dashboard');
}
function applyRoleNav() {
  const role = currentRole();
  document.querySelectorAll('#sidebar-nav [data-roles]').forEach(el => {
    const roles = el.getAttribute('data-roles').split(',');
    el.style.display = roles.includes(role) ? '' : 'none';
  });
}

// ================================================
// ROUTER (RBAC)
// ================================================
const PAGES = {
  dashboard:    { title: 'Dashboard',          sub: 'Ringkasan akademik',                                roles: ['admin','dosen','mahasiswa'], render: () => renderDashboard() },
  pengumuman:   { title: 'Pengumuman',         sub: 'Informasi & pengumuman kampus',                     roles: ['admin','dosen','mahasiswa'], render: () => renderPengumuman() },
  kalender:     { title: 'Kalender Akademik',  sub: 'Agenda & jadwal kegiatan akademik',                 roles: ['admin','dosen','mahasiswa'], render: () => renderKalender() },
  jadwal:       { title: 'Jadwal Kuliah',      sub: 'Jadwal perkuliahan per kelas & dosen',              roles: ['admin','dosen','mahasiswa'], render: () => renderJadwal() },
  krs:          { title: 'KRS',                sub: 'Kartu Rencana Studi — rencana ambil mata kuliah',   roles: ['admin','mahasiswa'],          render: () => renderKrs() },
  presensi:     { title: 'Presensi',           sub: 'Kehadiran perkuliahan',                             roles: ['admin','dosen','mahasiswa'], render: () => renderPresensi() },
  nilai:        { title: 'Input Nilai',        sub: 'Input & kelola nilai mahasiswa',                    roles: ['admin','dosen'],             render: () => renderNilaiPage() },
  rapor:        { title: 'Rapor & KHS',        sub: 'IPS, IPK kumulatif & cetak KHS',                    roles: ['admin','dosen','mahasiswa'], render: () => renderRaporPage() },
  transkrip:    { title: 'Transkrip Nilai',    sub: 'Transkrip akademik resmi & cetak',                  roles: ['admin','dosen','mahasiswa'], render: () => renderTranskrip() },
  mahasiswa:    { title: 'Data Mahasiswa',     sub: 'Data induk mahasiswa',                              roles: ['admin'],                     render: () => renderMahasiswaPage() },
  dosen:        { title: 'Data Dosen',         sub: 'Data induk dosen',                                  roles: ['admin'],                     render: () => renderDosenPage() },
  staf:         { title: 'Data Staf',          sub: 'Data induk staf administrasi',                      roles: ['admin'],                     render: () => renderStafPage() },
  matkul:       { title: 'Mata Kuliah',        sub: 'Kurikulum mata kuliah & SKS',                       roles: ['admin'],                     render: () => renderMatkulPage() },
  kelas:        { title: 'Kelas',              sub: 'Rombongan belajar & dosen wali',                    roles: ['admin'],                     render: () => renderKelasPage() },
  ruangan:      { title: 'Ruangan',            sub: 'Ruang kuliah & laboratorium',                       roles: ['admin'],                     render: () => renderRuanganPage() },
  keuangan:     { title: 'Keuangan',           sub: 'Tagihan & pembayaran SPP',                          roles: ['admin','mahasiswa'],         render: () => renderKeuangan() },
  tahunakademik:{ title: 'Tahun Akademik',     sub: 'Periode akademik & periode aktif',                  roles: ['admin'],                     render: () => renderTahunAkademik() },
  profil:       { title: 'Profil Saya',        sub: 'Informasi akun & biodata',                          roles: ['admin','dosen','mahasiswa'], render: () => renderProfil() },
  pengaturan:   { title: 'Pengaturan',         sub: 'Penyimpanan, identitas & cadangan',                 roles: ['admin'],                     render: () => renderPengaturan() }
};

async function navigate(page) {
  if (!PAGES[page]) page = 'dashboard';
  if (!PAGES[page].roles.includes(currentRole())) { page = 'dashboard'; }
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
function updateTopbar(title, sub) { setText('topbar-title', title); setText('topbar-sub', sub); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function attr(o) { return JSON.stringify(o).replace(/'/g, '&#39;'); }
function fmtTanggal(d) { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt)) return esc(d); return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
function fmtTanggalSingkat(d) { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt)) return esc(d); return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
function rupiah(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }

function updateBadges() {
  setText('badge-mahasiswa', (STATE.data.mahasiswa||[]).length);
  setText('badge-dosen', (STATE.data.dosen||[]).length);
  setText('badge-staf', (STATE.data.staf||[]).length);
  setText('badge-matkul', (STATE.data.mataKuliah||[]).length);
  setText('badge-kelas', (STATE.data.kelas||[]).length);
  setText('badge-ruangan', (STATE.data.ruangan||[]).length);
  const ta = getActiveTA();
  setText('ta-pill-text', ta ? ta.Kode : '—');
}
function updateStoragePill() {
  const pill = document.getElementById('storage-pill'); const txt = document.getElementById('storage-pill-text');
  if (!pill || !txt) return;
  if (isCloud()) { pill.classList.add('cloud'); txt.textContent = 'Mode Cloud'; }
  else { pill.classList.remove('cloud'); txt.textContent = 'Mode Lokal'; }
}
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container'); if (!container) return;
  const colors = { success: '#059669', error: '#E11D48', info: '#4F46E5', warning: '#D97706' };
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.style.borderLeftColor = colors[type] || colors.info;
  toast.innerHTML = `<span>${msg}</span>`; container.appendChild(toast);
  setTimeout(() => { toast.style.transition = 'opacity .3s, transform .3s'; toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 2900);
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('sidebar-overlay')?.classList.remove('open'); }
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next); localStorage.setItem(LS_KEYS.theme, next); applyThemeLabels(next);
}
function applyThemeLabels(theme) {
  document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap');
  document.querySelectorAll('#theme-btn-top').forEach(b => b.textContent = theme === 'dark' ? '☀️' : '🌙');
}

// Dynamic modal host
function showModal(innerHtml) {
  const host = document.getElementById('modal-host');
  host.innerHTML = `<div class="modal-overlay open" id="active-modal"><div class="modal-box">${innerHtml}</div></div>`;
  const overlay = document.getElementById('active-modal');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeActiveModal(); });
}
function closeActiveModal() { const host = document.getElementById('modal-host'); if (host) host.innerHTML = ''; }
function closeModal() { closeActiveModal(); }

function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-title">${esc(title)}</div><div class="empty-state-text">${esc(text)}</div></div>`;
}
function pageHeader(eyebrow, title, sub, actionHtml) {
  return `<div class="section-header" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;">
    <div><div class="section-eyebrow">${esc(eyebrow)}</div><h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="section-sub">${esc(sub)}</p>` : ''}</div>
    ${actionHtml ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">${actionHtml}</div>` : ''}
  </div>`;
}
function filterList(arr, search) {
  if (!search) return arr;
  const q = search.toLowerCase();
  return arr.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
}
function filterBar(searchId, placeholder, onInput, addLabel, addFn) {
  return `<div class="filter-bar-wrap"><div class="filter-row">
      <div class="filter-group" style="flex:1;"><label class="filter-label">🔍 Cari</label>
      <input type="text" id="${searchId}" class="filter-input" placeholder="${esc(placeholder)}" oninput="${onInput}"></div>
      ${addFn ? `<button class="btn btn-primary" onclick="${addFn}">➕ ${esc(addLabel)}</button>` : ''}
    </div></div>`;
}

// Helpers shared across modules
function mahasiswaByNim(nim) { return (STATE.data.mahasiswa || []).find(m => String(m.NIM) === String(nim)); }
function dosenById(id) { return (STATE.data.dosen || []).find(d => String(d.ID) === String(id)); }
function currentMahasiswa() { return STATE.session && STATE.session.role === 'mahasiswa' ? mahasiswaByNim(STATE.session.ref) : null; }
function currentDosen() { return STATE.session && STATE.session.role === 'dosen' ? dosenById(STATE.session.ref) : null; }
function currentDosenNama() { const d = currentDosen(); return d ? d.Nama : (STATE.session ? STATE.session.nama : ''); }

// ================================================
// INIT
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem(LS_KEYS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  applyThemeLabels(theme);
  try { const i = inst(); if (i.appsUrl && typeof APPS_SCRIPT_URL !== 'undefined' && !APPS_SCRIPT_URL) { window.APPS_SCRIPT_URL = i.appsUrl; } } catch (e) {}

  document.querySelectorAll('.nav-item[data-page]').forEach(item => item.addEventListener('click', () => navigate(item.dataset.page)));
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActiveModal(); });

  const sess = getSession();
  if (sess) { STATE.session = sess; showApp(); }
  else { selectLoginRole('admin'); document.getElementById('login-screen').classList.add('show'); }
});
