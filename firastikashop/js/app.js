/* ============================================================
   FIRASTIKASHOP - Frontend
   Engine lokal + sinkron cloud (Google Spreadsheet via Apps Script)
============================================================ */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.prototype.slice.call(p.querySelectorAll(s));
  const rp = (n) => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
  const todayStr = () => { const d = new Date(); const z = x => (x < 10 ? '0' : '') + x; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const uid = (p) => (p || 'ID') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function fmtDate(s) { if (!s) return '-'; const d = new Date(s); if (isNaN(d)) return String(s); return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function monthKey(s) { const d = new Date(s); if (isNaN(d)) return String(s).slice(0, 7); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }

  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast'); t.textContent = msg;
    t.className = 'toast show' + (kind === 'err' ? ' err' : kind === 'warn' ? ' warn' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = 'toast', 2800);
  }
  function showLoader(on) { $('#loader').classList.toggle('show', !!on); }

  /* ---------- State ---------- */
  const LS = { data: 'firastika_data', mode: 'firastika_mode', url: 'firastika_url', theme: 'firastika_theme', auth: 'firastika_auth' };
  const STATE = {
    data: { produk: [], transaksi: [] },
    loaded: false,
    mode: localStorage.getItem(LS.mode) || (typeof STORAGE_MODE !== 'undefined' ? STORAGE_MODE : 'local')
  };
  function appsUrl() { return localStorage.getItem(LS.url) || (typeof APPS_SCRIPT_URL !== 'undefined' ? APPS_SCRIPT_URL : '') || ''; }
  function isCloud() { return STATE.mode === 'cloud' && !!appsUrl(); }
  const conf = () => (typeof CONFIG !== 'undefined' ? CONFIG : { kategoriProduk: [], kategoriPengeluaran: [] });

  // shortcuts to collections
  const PR = () => STATE.data.produk;
  const TX = () => STATE.data.transaksi;
  const findProduk = (id) => PR().find(p => String(p.ID) === String(id));

  /* ---------- Storage engine ---------- */
  function persistLocal() { try { localStorage.setItem(LS.data, JSON.stringify(STATE.data)); } catch (e) {} }

  function seedIfEmpty() {
    const raw = localStorage.getItem(LS.data);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    const seed = JSON.parse(JSON.stringify(typeof SEED_DATA !== 'undefined' ? SEED_DATA : { produk: [], transaksi: [] }));
    localStorage.setItem(LS.data, JSON.stringify(seed));
    return seed;
  }

  async function cloudGet(action) {
    const url = appsUrl() + '?action=' + action;
    const attempts = [
      () => fetch(url, { signal: AbortSignal.timeout(12000) }),
      () => fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) }),
      () => fetch('https://corsproxy.io/?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) })
    ];
    for (const attempt of attempts) {
      try { const res = await attempt(); if (!res.ok) continue; const json = await res.json(); if (json.status === 'success') return json; } catch (e) {}
    }
    return null;
  }

  async function cloudPost(action, payload) {
    try {
      await fetch(appsUrl(), {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action }, payload))
      });
      return true;
    } catch (e) { return false; }
  }

  async function loadAllData(force) {
    if (STATE.loaded && !force) return;
    if (isCloud()) {
      showLoader(true);
      const result = await cloudGet('getAll');
      showLoader(false);
      if (result && result.data) {
        STATE.data.produk = (result.data.produk || []).map(normProduk);
        STATE.data.transaksi = (result.data.transaksi || []).map(normTrx);
        STATE.loaded = true; return;
      }
      toast('⚠️ Gagal terhubung ke cloud. Memakai data lokal.', 'warn');
    }
    STATE.data = seedIfEmpty();
    if (!STATE.data.produk) STATE.data.produk = [];
    if (!STATE.data.transaksi) STATE.data.transaksi = [];
    STATE.loaded = true;
  }

  // Normalisasi tipe angka dari Sheets (kadang string)
  function normProduk(p) {
    return {
      ID: p.ID, Nama: p.Nama, Kategori: p.Kategori, Brand: p.Brand,
      'Harga Beli': Number(p['Harga Beli']) || 0, 'Harga Jual': Number(p['Harga Jual']) || 0,
      Stok: Number(p.Stok) || 0, 'Stok Minimum': Number(p['Stok Minimum']) || 0,
      'Tanggal Dibuat': p['Tanggal Dibuat'] || ''
    };
  }
  function normTrx(t) {
    return {
      ID: t.ID, Tipe: t.Tipe, Kategori: t.Kategori, Tanggal: String(t.Tanggal || '').slice(0, 10),
      Keterangan: t.Keterangan, Jumlah: Number(t.Jumlah) || 0,
      'Produk ID': t['Produk ID'] || '', Qty: Number(t.Qty) || 0, 'Order ID': t['Order ID'] || ''
    };
  }

  /* ---------- CRUD (lokal + sinkron cloud) ---------- */
  async function syncProdukAdd(rec) { persistLocal(); if (isCloud()) await cloudPost('addProduk', { record: rec }); }
  async function syncProdukEdit(rec) { persistLocal(); if (isCloud()) await cloudPost('editProduk', { record: rec }); }
  async function syncProdukDelete(id) { persistLocal(); if (isCloud()) await cloudPost('deleteProduk', { id: id }); }
  async function syncTrxAdd(rec) { persistLocal(); if (isCloud()) await cloudPost('addTransaksi', { record: rec }); }
  async function syncTrxDelete(id) { persistLocal(); if (isCloud()) await cloudPost('deleteTransaksi', { id: id }); }
  async function syncOrder(items, produkUpdates) { persistLocal(); if (isCloud()) await cloudPost('addOrder', { items: items, produkUpdates: produkUpdates }); }

  /* ---------- Auth ---------- */
  function isLoggedIn() { return localStorage.getItem(LS.auth) === 'true'; }
  function doLogin(e) {
    e.preventDefault();
    const u = $('#loginUser').value.trim(), p = $('#loginPass').value;
    const A = (typeof AUTH !== 'undefined') ? AUTH : { username: 'admin', password: 'admin123' };
    if (u === A.username && p === A.password) {
      localStorage.setItem(LS.auth, 'true');
      $('#loginError').textContent = '';
      startApp();
    } else {
      $('#loginError').textContent = 'Username atau password salah.';
    }
  }
  function doLogout() { localStorage.removeItem(LS.auth); location.reload(); }

  /* ---------- Navigation ---------- */
  const TITLES = { dashboard: 'Dashboard', produk: 'Produk & Stok', penjualan: 'Penjualan', pengeluaran: 'Pengeluaran', riwayat: 'Riwayat Transaksi', laporan: 'Laporan', pengaturan: 'Pengaturan' };
  function switchView(name) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const v = $('#view-' + name); if (v) v.classList.add('active');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
    $('#pageTitle').textContent = TITLES[name] || 'FirastikaShop';
    $('#sidebar').classList.remove('open');
    if (name === 'pengaturan') renderPengaturan();
  }

  /* ---------- Calculations ---------- */
  const totalBy = (type) => TX().filter(t => t.Tipe === type).reduce((s, t) => s + (Number(t.Jumlah) || 0), 0);
  const stockValue = () => PR().reduce((s, p) => s + p.Stok * p['Harga Beli'], 0);

  /* ---------- Render: Dashboard ---------- */
  function renderDashboard() {
    const inc = totalBy('pemasukan'), exp = totalBy('pengeluaran');
    $('#statIncome').textContent = rp(inc);
    $('#statExpense').textContent = rp(exp);
    $('#statProfit').textContent = rp(inc - exp);
    $('#statStock').textContent = rp(stockValue());

    // low stock
    const low = PR().filter(p => p.Stok <= p['Stok Minimum']).sort((a, b) => a.Stok - b.Stok);
    $('#lowStockList').innerHTML = low.length ? low.map(p =>
      `<div class="mini-row"><div><div class="ml-main">${esc(p.Nama)}</div><div class="ml-sub">${esc(p.Kategori)}</div></div><div class="ml-val low">${p.Stok} / min ${p['Stok Minimum']}</div></div>`
    ).join('') : '<div class="empty">Semua stok aman 🌸</div>';

    // top products by qty sold
    const sold = {};
    TX().filter(t => t.Tipe === 'pemasukan' && t['Produk ID']).forEach(t => { sold[t['Produk ID']] = (sold[t['Produk ID']] || 0) + (Number(t.Qty) || 0); });
    const top = Object.keys(sold).map(id => ({ p: findProduk(id), qty: sold[id] })).filter(x => x.p).sort((a, b) => b.qty - a.qty).slice(0, 5);
    $('#topProductList').innerHTML = top.length ? top.map(x =>
      `<div class="mini-row"><div class="ml-main">${esc(x.p.Nama)}</div><div class="ml-val">${x.qty} terjual</div></div>`
    ).join('') : '<div class="empty">Belum ada penjualan</div>';

    // recent
    const recent = TX().slice().sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))).slice(0, 6);
    $('#recentList').innerHTML = recent.length ? recent.map(t =>
      `<div class="mini-row"><div><div class="ml-main">${esc(t.Keterangan)}</div><div class="ml-sub">${fmtDate(t.Tanggal)} · ${esc(t.Kategori)}</div></div><div class="ml-val ${t.Tipe === 'pemasukan' ? 'pill-in' : 'pill-out'}">${t.Tipe === 'pemasukan' ? '+' : '-'}${rp(t.Jumlah)}</div></div>`
    ).join('') : '<div class="empty">Belum ada transaksi</div>';

    drawChart();
  }

  function monthlySeries() {
    const now = new Date(); const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2), label: d.toLocaleDateString('id-ID', { month: 'short' }) }); }
    return months.map(m => {
      let inc = 0, exp = 0;
      TX().forEach(t => { if (monthKey(t.Tanggal) === m.key) { if (t.Tipe === 'pemasukan') inc += t.Jumlah; else exp += t.Jumlah; } });
      return { label: m.label, inc: inc, exp: exp };
    });
  }

  function drawChart() {
    const cv = $('#barChart'); if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 480, H = 240;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const data = monthlySeries();
    const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp)));
    const padB = 28, padT = 12, padL = 8, padR = 8;
    const chartH = H - padB - padT, chartW = W - padL - padR;
    const groupW = chartW / data.length, barW = Math.min(20, groupW / 3.2);
    const css = getComputedStyle(document.documentElement);
    const cIn = css.getPropertyValue('--pink').trim() || '#E48AAE';
    const cOut = css.getPropertyValue('--plum').trim() || '#7E4E63';
    const cMuted = css.getPropertyValue('--muted').trim() || '#999';
    ctx.font = '11px Poppins, sans-serif'; ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const hIn = (d.inc / max) * chartH, hOut = (d.exp / max) * chartH;
      ctx.fillStyle = cIn; roundRect(ctx, cx - barW - 2, padT + chartH - hIn, barW, hIn, 5); ctx.fill();
      ctx.fillStyle = cOut; roundRect(ctx, cx + 2, padT + chartH - hOut, barW, hOut, 5); ctx.fill();
      ctx.fillStyle = cMuted; ctx.fillText(d.label, cx, H - 8);
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0) return; r = Math.min(r, h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------- Render: Produk ---------- */
  function renderProduk() {
    const q = ($('#searchProduk').value || '').toLowerCase();
    const fk = $('#filterKategori').value;
    const rows = PR().filter(p =>
      (!q || (p.Nama + ' ' + (p.Brand || '')).toLowerCase().includes(q)) && (!fk || p.Kategori === fk)
    );
    $('#produkBody').innerHTML = rows.length ? rows.map(p => {
      const low = p.Stok <= p['Stok Minimum'];
      return `<tr><td><strong>${esc(p.Nama)}</strong></td><td><span class="badge gold">${esc(p.Kategori)}</span></td><td>${esc(p.Brand || '-')}</td>` +
        `<td class="right">${rp(p['Harga Beli'])}</td><td class="right">${rp(p['Harga Jual'])}</td>` +
        `<td class="right ${low ? 'low' : ''}">${p.Stok}${low ? ' ⚠️' : ''}</td>` +
        `<td class="right"><button class="act-btn" data-edit="${p.ID}">✎</button><button class="act-btn del" data-del="${p.ID}">✕</button></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">Tidak ada produk</td></tr>';
  }

  /* ---------- Produk modal ---------- */
  function openProdukModal(p) {
    $('#produkModalTitle').textContent = p ? 'Edit Produk' : 'Tambah Produk';
    $('#produkId').value = p ? p.ID : '';
    $('#pNama').value = p ? p.Nama : '';
    $('#pKategori').value = p ? p.Kategori : (conf().kategoriProduk[0] || '');
    $('#pBrand').value = p ? (p.Brand || '') : '';
    $('#pBeli').value = p ? p['Harga Beli'] : '';
    $('#pJual').value = p ? p['Harga Jual'] : '';
    $('#pStok').value = p ? p.Stok : 0;
    $('#pMin').value = p ? p['Stok Minimum'] : 5;
    $('#produkModal').classList.add('open');
  }
  function closeProdukModal() { $('#produkModal').classList.remove('open'); }

  /* ---------- Selects ---------- */
  function fillSelect(sel, items, value, label) {
    sel.innerHTML = items.map(it => `<option value="${esc(value(it))}">${esc(label(it))}</option>`).join('');
  }
  function refreshSelects() {
    const prodOpts = PR().slice().sort((a, b) => a.Nama.localeCompare(b.Nama));
    [['#saleProduk', 'Harga Jual'], ['#reProduk', 'Harga Beli']].forEach(([sel]) => {
      const el = $(sel); if (!el) return; const prev = el.value;
      el.innerHTML = prodOpts.map(p => `<option value="${p.ID}">${esc(p.Nama)} (stok ${p.Stok})</option>`).join('');
      if (prev) el.value = prev;
    });
    // kategori filter & modal & pengeluaran
    const kat = conf().kategoriProduk || [];
    $('#filterKategori').innerHTML = '<option value="">Semua Kategori</option>' + kat.map(k => `<option>${esc(k)}</option>`).join('');
    $('#pKategori').innerHTML = kat.map(k => `<option>${esc(k)}</option>`).join('');
    $('#expCat').innerHTML = (conf().kategoriPengeluaran || []).map(k => `<option>${esc(k)}</option>`).join('');
    syncSalePrice(); syncRePrice();
  }

  /* ---------- Penjualan: keranjang ---------- */
  let cart = [];
  function cartQtyFor(pid) { return cart.filter(c => c.productId === pid).reduce((s, c) => s + c.qty, 0); }
  function syncSalePrice() { const p = findProduk($('#saleProduk').value); if (p && !$('#salePrice').dataset.touched) $('#salePrice').value = p['Harga Jual']; syncSaleSub(); }
  function syncSaleSub() {
    const qty = +$('#saleQty').value || 0, price = +$('#salePrice').value || 0;
    $('#saleSub').textContent = rp(qty * price);
    const p = findProduk($('#saleProduk').value);
    $('#saleStockInfo').textContent = p ? '— sisa stok: ' + (p.Stok - cartQtyFor(p.ID)) : '';
  }
  function renderCart() {
    const body = $('#cartBody'); if (!body) return; body.innerHTML = '';
    if (!cart.length) body.innerHTML = '<tr><td colspan="5" class="empty">Keranjang masih kosong</td></tr>';
    cart.forEach((c, i) => {
      const p = findProduk(c.productId);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(p ? p.Nama : '(dihapus)')}</td><td class="right">${c.qty}</td><td class="right">${rp(c.price)}</td>` +
        `<td class="right">${rp(c.qty * c.price)}</td><td class="right"><button type="button" class="act-btn del" data-cartrm="${i}">&times;</button></td>`;
      body.appendChild(tr);
    });
    $('#cartCount').textContent = cart.length;
    $('#saleTotal').textContent = rp(cart.reduce((s, c) => s + c.qty * c.price, 0));
    syncSaleSub();
  }

  /* ---------- Restock helpers ---------- */
  function syncRePrice() { const p = findProduk($('#reProduk').value); if (p && !$('#rePrice').dataset.touched) $('#rePrice').value = p['Harga Beli']; syncReTotal(); }
  function syncReTotal() { $('#reTotal').textContent = rp((+$('#reQty').value || 0) * (+$('#rePrice').value || 0)); }

  /* ---------- Render: Riwayat ---------- */
  function renderRiwayat() {
    const ft = $('#filterTipe').value, fb = $('#filterBulan').value;
    const rows = TX().filter(t => (!ft || t.Tipe === ft) && (!fb || monthKey(t.Tanggal) === fb))
      .sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)));
    $('#riwayatBody').innerHTML = rows.length ? rows.map(t =>
      `<tr><td>${fmtDate(t.Tanggal)}</td><td>${esc(t.Keterangan)}</td><td>${esc(t.Kategori)}</td>` +
      `<td><span class="badge ${t.Tipe === 'pemasukan' ? 'green' : 'red'}">${t.Tipe}</span></td>` +
      `<td class="right ${t.Tipe === 'pemasukan' ? 'pill-in' : 'pill-out'}">${t.Tipe === 'pemasukan' ? '+' : '-'}${rp(t.Jumlah)}</td>` +
      `<td class="right"><button class="act-btn del" data-trxdel="${t.ID}">✕</button></td></tr>`
    ).join('') : '<tr><td colspan="6" class="empty">Tidak ada transaksi</td></tr>';
  }

  /* ---------- Render: Laporan ---------- */
  function renderLaporan() {
    const map = {};
    TX().forEach(t => { const k = monthKey(t.Tanggal); (map[k] = map[k] || { inc: 0, exp: 0 }); if (t.Tipe === 'pemasukan') map[k].inc += t.Jumlah; else map[k].exp += t.Jumlah; });
    const keys = Object.keys(map).sort((a, b) => b.localeCompare(a));
    $('#rekapBulananBody').innerHTML = keys.length ? keys.map(k => {
      const m = map[k]; const lbl = new Date(k + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return `<tr><td>${esc(lbl)}</td><td class="right pill-in">${rp(m.inc)}</td><td class="right pill-out">${rp(m.exp)}</td><td class="right"><strong>${rp(m.inc - m.exp)}</strong></td></tr>`;
    }).join('') : '<tr><td colspan="4" class="empty">Belum ada data</td></tr>';

    const kat = {};
    TX().filter(t => t.Tipe === 'pemasukan' && t['Produk ID']).forEach(t => { const p = findProduk(t['Produk ID']); const k = p ? p.Kategori : 'Lainnya'; kat[k] = (kat[k] || 0) + t.Jumlah; });
    const kk = Object.keys(kat).sort((a, b) => kat[b] - kat[a]);
    $('#rekapKategori').innerHTML = kk.length ? kk.map(k => `<div class="mini-row"><div class="ml-main">${esc(k)}</div><div class="ml-val">${rp(kat[k])}</div></div>`).join('') : '<div class="empty">Belum ada penjualan</div>';

    const inc = totalBy('pemasukan'), exp = totalBy('pengeluaran');
    const totalJual = TX().filter(t => t.Tipe === 'pemasukan' && t['Produk ID']).reduce((s, t) => s + t.Jumlah, 0);
    const totalQty = TX().filter(t => t.Tipe === 'pemasukan' && t['Produk ID']).reduce((s, t) => s + t.Qty, 0);
    const items = [
      ['Total Pemasukan', rp(inc)], ['Total Pengeluaran', rp(exp)], ['Laba Bersih', rp(inc - exp)],
      ['Total Item Terjual', totalQty + ' pcs'], ['Rata-rata Nilai/Item', rp(totalQty ? Math.round(totalJual / totalQty) : 0)],
      ['Jumlah Produk', PR().length], ['Nilai Stok Saat Ini', rp(stockValue())]
    ];
    $('#laporanRingkasan').innerHTML = items.map(([a, b]) => `<div class="mini-row"><div class="ml-main">${a}</div><div class="ml-val">${b}</div></div>`).join('');
  }

  /* ---------- Render: Pengaturan ---------- */
  function renderPengaturan() {
    $$('#modeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === STATE.mode));
    $('#setUrl').value = appsUrl();
    updateModePill();
  }
  function updateModePill() {
    const cloud = isCloud();
    $('#modePill').textContent = 'Mode: ' + (cloud ? '☁️ Cloud' : '💾 Lokal');
  }

  function renderAll() {
    renderDashboard(); renderProduk(); renderRiwayat(); renderLaporan(); refreshSelects(); updateModePill();
  }

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const rows = [['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Qty', 'Nominal']];
    TX().slice().sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))).forEach(t => rows.push([t.Tanggal, t.Keterangan, t.Kategori, t.Tipe, t.Qty || '', t.Jumlah]));
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadBlob('\uFEFF' + csv, 'firastika-transaksi.csv', 'text/csv;charset=utf-8;');
    toast('CSV berhasil diekspor');
  }
  function downloadBlob(content, name, type) {
    const blob = new Blob([content], { type: type }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  /* ---------- Theme ---------- */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem(LS.theme, t); $('#themeToggle').textContent = t === 'dark' ? '☀️' : '🌙'; }

  /* ---------- Bind ---------- */
  function bind() {
    $('#loginForm').addEventListener('submit', doLogin);
    $('#logoutBtn').addEventListener('click', doLogout);
    $$('.nav-item').forEach(n => n.addEventListener('click', () => switchView(n.dataset.view)));
    $('#hamburger').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#themeToggle').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

    // produk
    $('#addProdukBtn').addEventListener('click', () => openProdukModal(null));
    $('#closeModal').addEventListener('click', closeProdukModal);
    $('#produkModal').addEventListener('click', e => { if (e.target.id === 'produkModal') closeProdukModal(); });
    $('#searchProduk').addEventListener('input', renderProduk);
    $('#filterKategori').addEventListener('change', renderProduk);
    $('#produkBody').addEventListener('click', async e => {
      const ed = e.target.dataset.edit, dl = e.target.dataset.del;
      if (ed) openProdukModal(findProduk(ed));
      if (dl) { const p = findProduk(dl); if (p && confirm('Hapus produk "' + p.Nama + '"?')) { STATE.data.produk = PR().filter(x => x.ID !== dl); await syncProdukDelete(dl); renderAll(); toast('Produk dihapus'); } }
    });
    $('#produkForm').addEventListener('submit', async e => {
      e.preventDefault();
      const id = $('#produkId').value;
      const rec = {
        ID: id || uid('PRD'), Nama: $('#pNama').value.trim(), Kategori: $('#pKategori').value, Brand: $('#pBrand').value.trim(),
        'Harga Beli': +$('#pBeli').value || 0, 'Harga Jual': +$('#pJual').value || 0,
        Stok: +$('#pStok').value || 0, 'Stok Minimum': +$('#pMin').value || 0,
        'Tanggal Dibuat': id ? (findProduk(id) || {})['Tanggal Dibuat'] || new Date().toISOString() : new Date().toISOString()
      };
      if (id) { const i = PR().findIndex(x => x.ID === id); if (i > -1) PR()[i] = rec; await syncProdukEdit(rec); toast('Produk diperbarui'); }
      else { PR().push(rec); await syncProdukAdd(rec); toast('Produk ditambahkan'); }
      closeProdukModal(); renderAll();
    });

    // penjualan keranjang
    $('#saleProduk').addEventListener('change', () => { $('#salePrice').dataset.touched = ''; syncSalePrice(); });
    $('#salePrice').addEventListener('input', () => { $('#salePrice').dataset.touched = '1'; syncSaleSub(); });
    $('#saleQty').addEventListener('input', syncSaleSub);
    $('#cartAddForm').addEventListener('submit', e => {
      e.preventDefault();
      const p = findProduk($('#saleProduk').value); if (!p) { toast('Pilih produk dulu', 'err'); return; }
      const qty = +$('#saleQty').value || 0, price = +$('#salePrice').value || 0;
      if (qty <= 0) { toast('Jumlah tidak valid', 'err'); return; }
      const already = cartQtyFor(p.ID);
      if (qty + already > p.Stok) { toast('Stok tidak cukup! Sisa ' + (p.Stok - already), 'err'); return; }
      const ex = cart.find(c => c.productId === p.ID && c.price === price);
      if (ex) ex.qty += qty; else cart.push({ productId: p.ID, qty: qty, price: price });
      renderCart(); $('#saleQty').value = 1; $('#salePrice').dataset.touched = ''; syncSalePrice();
      toast(qty + ' x ' + p.Nama + ' masuk keranjang');
    });
    $('#cartBody').addEventListener('click', e => { const rm = e.target.dataset.cartrm; if (rm == null) return; cart.splice(+rm, 1); renderCart(); });
    $('#saleForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (!cart.length) { toast('Keranjang masih kosong', 'err'); return; }
      const cust = $('#saleCustomer').value.trim(), date = $('#saleDate').value;
      const orderId = uid('').replace(/^-/, '').slice(0, 6).toUpperCase();
      const need = {}; cart.forEach(c => { need[c.productId] = (need[c.productId] || 0) + c.qty; });
      for (const pid in need) { const p = findProduk(pid); if (!p || need[pid] > p.Stok) { toast('Stok "' + (p ? p.Nama : '?') + '" tidak cukup!', 'err'); return; } }
      const btn = $('#saveOrderBtn'); btn.disabled = true;
      const items = [], affected = {};
      let total = 0;
      cart.forEach(c => {
        const p = findProduk(c.productId); p.Stok -= c.qty; affected[p.ID] = p; total += c.qty * c.price;
        const rec = { ID: uid('TRX'), Tipe: 'pemasukan', Kategori: 'Penjualan', Tanggal: date, Keterangan: `[Order #${orderId}${cust ? ' — ' + cust : ''}] ${p.Nama}`, Jumlah: c.qty * c.price, 'Produk ID': p.ID, Qty: c.qty, 'Order ID': orderId };
        TX().push(rec); items.push(rec);
      });
      await syncOrder(items, Object.values(affected).map(normProduk));
      btn.disabled = false;
      const n = cart.length; cart = []; renderCart();
      $('#saleCustomer').value = ''; $('#saleDate').value = todayStr();
      renderAll(); toast('Pesanan tersimpan (' + n + ' item, +' + rp(total) + ')');
    });

    // pemasukan lain
    $('#incomeForm').addEventListener('submit', async e => {
      e.preventDefault();
      const rec = { ID: uid('TRX'), Tipe: 'pemasukan', Kategori: 'Pemasukan Lain', Tanggal: $('#incDate').value, Keterangan: $('#incDesc').value.trim(), Jumlah: +$('#incAmount').value || 0, 'Produk ID': '', Qty: 0, 'Order ID': '' };
      TX().push(rec); await syncTrxAdd(rec);
      e.target.reset(); $('#incDate').value = todayStr(); renderAll(); toast('Pemasukan tercatat (+' + rp(rec.Jumlah) + ')');
    });

    // restock
    $('#reProduk').addEventListener('change', () => { $('#rePrice').dataset.touched = ''; syncRePrice(); });
    $('#rePrice').addEventListener('input', () => { $('#rePrice').dataset.touched = '1'; syncReTotal(); });
    $('#reQty').addEventListener('input', syncReTotal);
    $('#restockForm').addEventListener('submit', async e => {
      e.preventDefault();
      const p = findProduk($('#reProduk').value); if (!p) { toast('Pilih produk dulu', 'err'); return; }
      const qty = +$('#reQty').value || 0, price = +$('#rePrice').value || 0;
      if (qty <= 0) { toast('Jumlah tidak valid', 'err'); return; }
      p.Stok += qty;
      const rec = { ID: uid('TRX'), Tipe: 'pengeluaran', Kategori: 'Restock', Tanggal: $('#reDate').value, Keterangan: 'Restock ' + p.Nama, Jumlah: qty * price, 'Produk ID': p.ID, Qty: qty, 'Order ID': '' };
      TX().push(rec);
      await syncTrxAdd(rec); await syncProdukEdit(normProduk(p));
      e.target.reset(); $('#reDate').value = todayStr(); $('#rePrice').dataset.touched = ''; renderAll(); toast('Restock +' + qty + ' ' + p.Nama);
    });

    // pengeluaran operasional
    $('#expenseForm').addEventListener('submit', async e => {
      e.preventDefault();
      const rec = { ID: uid('TRX'), Tipe: 'pengeluaran', Kategori: $('#expCat').value, Tanggal: $('#expDate').value, Keterangan: $('#expDesc').value.trim(), Jumlah: +$('#expAmount').value || 0, 'Produk ID': '', Qty: 0, 'Order ID': '' };
      TX().push(rec); await syncTrxAdd(rec);
      e.target.reset(); $('#expDate').value = todayStr(); renderAll(); toast('Pengeluaran tercatat (-' + rp(rec.Jumlah) + ')');
    });

    // riwayat
    $('#filterTipe').addEventListener('change', renderRiwayat);
    $('#filterBulan').addEventListener('change', renderRiwayat);
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#riwayatBody').addEventListener('click', async e => {
      const id = e.target.dataset.trxdel; if (!id) return;
      const t = TX().find(x => x.ID === id); if (!t) return;
      if (!confirm('Hapus transaksi ini? Stok akan dikembalikan bila perlu.')) return;
      if (t['Produk ID']) { const p = findProduk(t['Produk ID']); if (p) { if (t.Tipe === 'pemasukan') p.Stok += t.Qty; else if (t.Kategori === 'Restock') p.Stok -= t.Qty; await syncProdukEdit(normProduk(p)); } }
      STATE.data.transaksi = TX().filter(x => x.ID !== id); await syncTrxDelete(id); renderAll(); toast('Transaksi dihapus');
    });

    // pengaturan
    $$('#modeSeg .seg-btn').forEach(b => b.addEventListener('click', async () => {
      STATE.mode = b.dataset.mode; localStorage.setItem(LS.mode, STATE.mode);
      renderPengaturan();
      if (STATE.mode === 'cloud' && !appsUrl()) { toast('Isi URL Apps Script dulu untuk Mode Cloud', 'warn'); return; }
      STATE.loaded = false; await loadAllData(true); renderAll(); toast('Mode: ' + (isCloud() ? 'Cloud' : 'Lokal'));
    }));
    $('#saveUrlBtn').addEventListener('click', async () => {
      localStorage.setItem(LS.url, $('#setUrl').value.trim());
      STATE.loaded = false; await loadAllData(true); renderAll(); renderPengaturan(); toast('URL disimpan & data dimuat ulang');
    });
    $('#exportJsonBtn').addEventListener('click', () => { downloadBlob(JSON.stringify(STATE.data, null, 2), 'firastika-backup.json', 'application/json'); toast('Backup JSON diekspor'); });
    $('#importJsonBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { try { const d = JSON.parse(r.result); STATE.data.produk = (d.produk || []).map(normProduk); STATE.data.transaksi = (d.transaksi || []).map(normTrx); persistLocal(); renderAll(); toast('Data berhasil diimpor'); } catch (err) { toast('File JSON tidak valid', 'err'); } };
      r.readAsText(f); e.target.value = '';
    });
    $('#resetBtn').addEventListener('click', async () => {
      if (!confirm('Reset semua data ke contoh awal? Data lokal saat ini akan hilang.')) return;
      localStorage.removeItem(LS.data); STATE.data = seedIfEmpty(); renderAll(); toast('Data direset ke contoh');
    });

    // default dates
    ['#saleDate', '#incDate', '#reDate', '#expDate'].forEach(s => { const el = $(s); if (el) el.value = todayStr(); });
  }

  /* ---------- Boot ---------- */
  async function startApp() {
    $('#loginScreen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    await loadAllData(false);
    renderAll(); renderCart();
    switchView('dashboard');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(localStorage.getItem(LS.theme) || 'light');
    bind();
    if (isLoggedIn()) { await startApp(); }
    else { $('#loginScreen').classList.remove('hidden'); }
    window.addEventListener('resize', () => { if ($('#view-dashboard').classList.contains('active')) drawChart(); });
  });
})();
