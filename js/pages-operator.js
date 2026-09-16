/* ==========================================================================
   SIM EVENT — Operator (Superadmin)
   Operator Console, pengaturan global, akun panitia, log aktivitas
   ========================================================================== */
'use strict';

var LOG_ICON = { LOGIN: 'login', DAFTAR: 'userPen', VERIFIKASI_SYARAT: 'clipboard', BATCH_VERIFIKASI: 'shieldCheck', LOLOS_VERIFIKASI: 'userCheck', VERIFIKASI_PEMBAYARAN: 'wallet', ABSEN: 'scan', ABSEN_MANUAL: 'scan', EVALUASI: 'star', GENERATE_SERTIFIKAT: 'award', PENGATURAN: 'sliders', BUAT_EVENT: 'calendar', UBAH_EVENT: 'edit', STATUS_EVENT: 'calendar', BUAT_AKUN: 'userCheck', RESET_PASSWORD: 'key', BUKA_SESI: 'unlock', TUTUP_SESI: 'lock' };

function fmtBytes(b) {
  if (b < 0) return '-';
  var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return b.toFixed(i > 1 ? 1 : 0) + ' ' + u[i];
}

function feedHtml(logs) {
  return '<div class="feed">' + (logs.length ? logs.map(function (l) {
    return '<div class="feed-item"><span class="feed-dot">' + icon(LOG_ICON[l.aksi] || 'activity', 'ic-sm') + '</span><div style="min-width:0"><div class="small"><b>' + esc(l.aktor) + '</b> · ' + esc(String(l.aksi).replace(/_/g, ' ').toLowerCase()) + '</div>' +
      '<div class="xs muted ellipsis" style="max-width:260px">' + esc(l.detail) + '</div><div class="xs muted">' + esc(timeAgo(l.waktu)) + '</div></div></div>';
  }).join('') : '<p class="small muted">Belum ada aktivitas.</p>') + '</div>';
}

// --------------------------------------------------------------------------
// OPERATOR CONSOLE
// --------------------------------------------------------------------------
function pageOperator(params, query, rid) {
  Layout.app(skeleton(5), 'operator');
  return API.swrAll([['operatorOverview', {}], ['listUsers', {}]], function (res) {
    if (!Router.alive(rid)) return;
    var d = res[0], users = res[1].users, st = d.settings;
    var mailUsed = d.email_kuota_sisa >= 0 ? Math.max(0, 100 - d.email_kuota_sisa) : 0;
    var mailPct = d.email_kuota_sisa >= 0 ? Math.min(100, Math.round(mailUsed / Math.max(100, mailUsed + d.email_kuota_sisa) * 100)) : 0;
    var storagePct = d.storage_bytes >= 0 ? Math.min(100, Math.round(d.storage_bytes / (15 * 1073741824) * 100)) : 0;
    var tab = 'all';

    $('#page').innerHTML = adminHead('Operator Console <span>›</span> <b>Operasi Global & Pengaturan</b>', 'Operator Global Dashboard',
      '<span class="row wrap" style="gap:8px">' + badge('Sistem: ' + (st.MAINTENANCE ? 'Pemeliharaan' : 'Operasional'), st.MAINTENANCE ? 'amber' : 'green', true) + badge('Backend v' + d.versi, 'gray') + '</span><span class="small mt-8" style="display:block">Tata kelola pusat seluruh event: notifikasi email, kuota Google Workspace, antrean sertifikat, dan akses akun panitia.</span>',
      '<button class="btn btn-secondary" id="op-cache">' + icon('refresh', 'ic-sm') + ' Bersihkan Cache</button><button class="btn btn-secondary" id="op-audit">' + icon('download', 'ic-sm') + ' Ekspor Audit (.csv)</button><button class="btn btn-primary" id="op-invite">' + icon('userCheck', 'ic-sm') + ' Tambah Panitia</button>') +
      '<div class="grid-4">' +
      '<div class="card kpi"><span class="kpi-icon">' + icon('calendar') + '</span><div class="kpi-label">Infrastruktur Event</div><div class="kpi-value">' + num(d.total_event) + '</div><div class="kpi-foot">' + badge(d.events.aktif + ' Aktif', 'green') + badge(d.events.draft + ' Draft', 'gray') + badge(d.events.selesai + ' Selesai', 'blue') + '</div></div>' +
      '<div class="card kpi"><span class="kpi-icon">' + icon('users') + '</span><div class="kpi-label">Total Leads Sistem</div><div class="kpi-value">' + num(d.pendaftar) + '</div><div class="kpi-foot" style="color:var(--accent-dark)">' + icon('activity', 'ic-sm') + ' +' + num(d.pendaftar_minggu_ini) + ' minggu ini · ' + num(d.peserta) + ' peserta aktif</div></div>' +
      '<div class="card kpi"><span class="kpi-icon">' + icon('mail') + '</span><div class="kpi-label">Sisa Kuota Email Harian</div><div class="kpi-value">' + (d.email_kuota_sisa >= 0 ? num(d.email_kuota_sisa) : '-') + '</div><div class="progress navy mt-8" style="position:relative;z-index:1"><span style="width:' + (100 - mailPct) + '%"></span></div><div class="kpi-foot">MailApp · reset tiap 24 jam</div></div>' +
      '<div class="card kpi"><span class="kpi-icon">' + icon('drive') + '</span><div class="kpi-label">Penyimpanan Drive</div><div class="kpi-value" style="font-size:26px">' + fmtBytes(d.storage_bytes) + '</div><div class="progress navy mt-8" style="position:relative;z-index:1"><span style="width:' + storagePct + '%"></span></div><div class="kpi-foot">dari kuota akun pemilik skrip</div></div></div>' +

      '<div class="split mt-24" style="grid-template-columns:minmax(0,1fr) 340px"><div class="card card-pad stack">' +
      '<div class="row between wrap"><div class="row">' + icon('sliders') + '<div><h3>Mesin Sistem & Kontrol Kuota</h3><p class="small muted">Berlaku langsung ke seluruh ' + d.total_event + ' event tanpa ubah kode.</p></div></div><span class="badge b-blue">Runtime: V8</span></div>' +
      '<div class="q-box row between wrap"><div class="row-top">' + icon('mail') + '<div><div class="row"><b>Notifikasi Email Global</b>' + badge(st.EMAIL_NOTIF ? 'Aktif' : 'Nonaktif', st.EMAIL_NOTIF ? 'green' : 'gray') + '</div><p class="small muted">Konfirmasi daftar, hasil verifikasi, kode akses, dan kiriman sertifikat.</p></div></div><label class="switch"><input type="checkbox" data-set="EMAIL_NOTIF"' + (st.EMAIL_NOTIF ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="q-box row between wrap"><div class="row-top">' + icon('award') + '<div><b>Lampirkan PDF Sertifikat di Email</b><p class="small muted">Nonaktifkan jika kuota email menipis — peserta tetap bisa unduh di portal.</p></div></div><label class="switch"><input type="checkbox" data-set="KIRIM_SERTIFIKAT_EMAIL"' + (st.KIRIM_SERTIFIKAT_EMAIL ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="q-box stack-sm"><b>' + icon('key', 'ic-sm') + ' Mode Login Peserta</b><p class="xs muted">Perangkat tepercaya: kode diminta sekali per HP/laptop, selanjutnya login 1-tap. "Cukup email" paling praktis namun rawan titip absen.</p><div class="segmented" data-segs="LOGIN_PESERTA">' + [['perangkat', 'Perangkat tepercaya (disarankan)'], ['email', 'Cukup email'], ['kode', 'Selalu kode']].map(function (o) { return '<button class="' + (st.LOGIN_PESERTA === o[0] ? 'active' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="grid-2"><div class="q-box stack-sm"><b>' + icon('award', 'ic-sm') + ' Sertifikat PDF</b><p class="xs muted">PDF dibuat di browser (persis pratinjau desain event), lalu diarsipkan ke Drive & dikirim ke email peserta.</p><a class="btn btn-secondary btn-sm" href="#/admin/sertifikat?tab=desain">' + icon('edit', 'ic-sm') + ' Buka Desain Sertifikat</a></div>' +
      '<div class="q-box stack-sm"><b>' + icon('qr', 'ic-sm') + ' Rotasi QR Dinamis</b><p class="xs muted">Semakin singkat, semakin sulit titip absen.</p><div class="segmented" data-seg="QR_ROTASI_DETIK">' + [[20, '20 dtk'], [30, '30 dtk'], [60, '60 dtk']].map(function (o) { return '<button class="' + (st.QR_ROTASI_DETIK === o[0] ? 'active' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="grid-2"><div class="field"><label class="label">Nama penerbit (email & sertifikat)</label><input class="input" data-text="NAMA_PENERBIT" value="' + esc(st.NAMA_PENERBIT) + '"></div><div class="field"><label class="label">Prefix nomor sertifikat</label><input class="input mono" data-text="PREFIX_SERTIFIKAT" value="' + esc(st.PREFIX_SERTIFIKAT) + '" style="text-transform:uppercase"></div></div>' +
      '<div class="field"><label class="label">URL situs frontend (GitHub Pages)</label><div class="row"><input class="input" data-text="URL_FRONTEND" value="' + esc(st.URL_FRONTEND) + '" placeholder="https://username.github.io/sim-event/"><button class="btn btn-secondary btn-sm" id="use-url">Pakai URL ini</button></div><span class="hint">Dipakai untuk tautan di email & QR verifikasi pada sertifikat.</span></div>' +
      '<div class="q-box row between wrap" style="background:#fffbeb"><div class="row-top">' + icon('wrench') + '<div><b>Mode Pemeliharaan</b><p class="small muted">Hanya Operator yang bisa memakai aplikasi selama aktif.</p></div></div><label class="switch"><input type="checkbox" data-set="MAINTENANCE"' + (st.MAINTENANCE ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" id="op-save-text">' + icon('check', 'ic-sm') + ' Simpan Teks Pengaturan</button></div></div>' +

      '<div class="stack"><div class="card card-pad stack"><div class="row between"><h3>Telemetri Workspace</h3><span class="xs muted">Siklus 24 jam</span></div>' +
      '<div class="center q-box" style="padding:22px">' + donut([{ value: d.sertifikat_terbit, color: '#1e3a5f' }, { value: d.sertifikat_antri, color: '#f59e0b' }], 130) + '<div class="small muted mt-8">Sertifikat terbit vs antrean</div></div>' +
      '<div class="stack-sm small"><div class="row between"><span class="muted">Sertifikat terbit</span><b>' + num(d.sertifikat_terbit) + '</b></div><div class="row between"><span class="muted">Antrean sertifikat</span><b>' + num(d.sertifikat_antri) + '</b></div><div class="row between"><span class="muted">Akun pengelola aktif</span><b>' + d.users.aktif + ' / ' + d.users.total + '</b></div><div class="row between"><span class="muted">Sesi</span><b>' + esc(S.user.email) + '</b></div></div></div>' +
      '<div class="card card-pad stack"><div class="row between"><h3>' + icon('activity', 'ic-sm') + ' Feed Lintas Event</h3><span class="pulse"></span></div>' + feedHtml(d.log.slice(0, 8)) + '<a class="btn btn-secondary btn-block" href="#/operator/log">Lihat Log Lengkap</a></div></div></div>' +

      '<div class="card mt-24" id="acc-card"></div>';

    var saveSetting = function (patch) {
      return API.act('saveSettings', { settings: patch }).catch(function (e) { errToast(e); Router.resolve(); });
    };
    $$('[data-set]').forEach(function (c) { on(c, 'change', function () { var p = {}; p[c.dataset.set] = c.checked; saveSetting(p).then(function () { if (c.dataset.set === 'MAINTENANCE' || c.dataset.set === 'EMAIL_NOTIF') Router.resolve(); }); }); });
    $$('[data-segs]').forEach(function (g) {
      $$('button', g).forEach(function (b) { on(b, 'click', function () { $$('button', g).forEach(function (x) { x.classList.toggle('active', x === b); }); var p = {}; p[g.dataset.segs] = b.dataset.v; saveSetting(p); }); });
    });
    $$('[data-seg]').forEach(function (g) {
      $$('button', g).forEach(function (b) { on(b, 'click', function () { $$('button', g).forEach(function (x) { x.classList.toggle('active', x === b); }); var p = {}; p[g.dataset.seg] = +b.dataset.v; saveSetting(p); }); });
    });
    on($('#use-url'), 'click', function () { $('[data-text="URL_FRONTEND"]').value = location.origin + location.pathname.replace(/index\.html$/, ''); });
    on($('#op-save-text'), 'click', function () { var p = {}; $$('[data-text]').forEach(function (i) { p[i.dataset.text] = i.dataset.text === 'PREFIX_SERTIFIKAT' ? i.value.toUpperCase() : i.value; }); var b = this; btnLoading(b, true); saveSetting(p).then(function () { btnLoading(b, false); }); });
    on($('#op-cache'), 'click', function () { API.act('clearCache').then(function () { EventCtx.list = null; }).catch(errToast); });
    on($('#op-audit'), 'click', function () {
      API.call('listLog', { limit: 500 }).then(function (r) { exportCSV('audit-sim-event-' + new Date().toISOString().slice(0, 10) + '.csv', [['waktu', 'Waktu'], ['aktor', 'Aktor'], ['aksi', 'Aksi'], ['event_id', 'Event'], ['detail', 'Detail']], r.log); }).catch(errToast);
    });
    on($('#op-invite'), 'click', function () { userModal(null, function () { Router.resolve(); }); });

    var drawAcc = function () {
      var rows = users.filter(function (u) { return tab === 'all' || (tab === 'aktif' ? u.status === 'aktif' : u.status !== 'aktif'); });
      $('#acc-card').innerHTML = '<div class="card-head"><div><h3>Akun Pengelola (Panitia & Operator)</h3><p class="small muted">Email yang terdaftar di sini yang dapat masuk ke panel pengelola.</p></div>' +
        '<div class="segmented">' + [['all', 'Semua', users.length], ['aktif', 'Aktif', users.filter(function (u) { return u.status === 'aktif'; }).length], ['nonaktif', 'Nonaktif', users.filter(function (u) { return u.status !== 'aktif'; }).length]].map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'active' : '') + '">' + t[1] + ' (' + t[2] + ')</button>'; }).join('') + '</div></div>' +
        usersTable(rows);
      $$('#acc-card [data-tab]').forEach(function (b) { on(b, 'click', function () { tab = b.dataset.tab; drawAcc(); }); });
      bindUserActions($('#acc-card'), users, function () { Router.resolve(); });
    };
    drawAcc();
  });
}

function usersTable(rows) {
  return '<div class="table-wrap"><table class="table"><thead><tr><th>Anggota</th><th>Event Dikelola</th><th>Peran</th><th>Status</th><th>Login Terakhir</th><th class="right">Aksi</th></tr></thead><tbody>' +
    (rows.length ? rows.map(function (u) {
      return '<tr><td><div class="row"><span class="avatar" style="background:' + (u.role === 'OPERATOR' ? 'var(--navy)' : 'var(--primary-fixed)') + ';color:' + (u.role === 'OPERATOR' ? '#fff' : 'var(--navy)') + '">' + esc(initials(u.nama)) + '</span><div><div class="cell-name">' + esc(u.nama) + '</div><div class="xs muted">' + esc(u.email) + '</div></div></div></td>' +
        '<td class="small" style="max-width:240px">' + (u.events.length ? esc(u.events[0].nama) + (u.events.length > 1 ? '<div class="xs" style="color:var(--primary)">+' + (u.events.length - 1) + ' event lainnya</div>' : '') : '<span class="muted">Belum ditugaskan</span>') + '</td>' +
        '<td>' + badge(u.role === 'OPERATOR' ? 'Operator' : 'Panitia', u.role === 'OPERATOR' ? 'navy' : 'blue') + '</td><td>' + statusBadge(u.status) + '</td><td class="xs muted">' + esc(u.login_terakhir ? timeAgo(u.login_terakhir) : 'Belum pernah') + '</td>' +
        '<td class="right nowrap"><button class="btn btn-ghost btn-xs" data-uedit="' + esc(u.id) + '" title="Edit">' + icon('edit', 'ic-sm') + '</button>' +
        '<button class="btn btn-ghost btn-xs" data-ureset="' + esc(u.id) + '" title="Reset kata sandi">' + icon('key', 'ic-sm') + '</button>' +
        (u.id !== S.user.id ? '<button class="btn btn-ghost btn-xs" data-ustatus="' + esc(u.id) + '" data-to="' + (u.status === 'aktif' ? 'nonaktif' : 'aktif') + '" title="' + (u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan') + '">' + icon(u.status === 'aktif' ? 'lock' : 'unlock', 'ic-sm') + '</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="6">' + emptyState('users', 'Tidak ada akun') + '</td></tr>') + '</tbody></table></div>';
}

function bindUserActions(root, users, reload) {
  $$('[data-uedit]', root).forEach(function (b) { on(b, 'click', function () { userModal(users.filter(function (u) { return u.id === b.dataset.uedit; })[0], reload); }); });
  $$('[data-ureset]', root).forEach(function (b) {
    on(b, 'click', function () {
      confirmDialog({ title: 'Reset kata sandi?', message: 'Kata sandi baru akan dibuat dan ditampilkan untuk Anda sampaikan.', ok: 'Reset' }).then(function (ok) {
        if (!ok) return;
        API.act('resetUserPassword', { id: b.dataset.ureset }, { silent: true }).then(function (r) { showPassword(r.data.password, users.filter(function (u) { return u.id === b.dataset.ureset; })[0].email); }).catch(errToast);
      });
    });
  });
  $$('[data-ustatus]', root).forEach(function (b) { on(b, 'click', function () { API.act('setUserStatus', { id: b.dataset.ustatus, status: b.dataset.to }).then(reload).catch(errToast); }); });
}

function showPassword(pw, email) {
  openModal({ title: 'Kredensial Akun', body: '<p class="small muted">Sampaikan kredensial ini secara pribadi. Kata sandi hanya ditampilkan sekali.</p><div class="kode-box mt-16"><div class="xs" style="color:#adc8f5">' + esc(email) + '</div><div class="kode" style="font-size:24px;letter-spacing:3px">' + esc(pw) + '</div><button class="btn btn-light btn-sm" onclick="copyText(\'' + esc(pw) + '\',\'Kata sandi\')">' + icon('copy', 'ic-sm') + ' Salin</button></div>', foot: '<button class="btn btn-primary" data-close>Selesai</button>' });
}

function userModal(u, reload) {
  var m = openModal({
    title: u ? 'Edit Akun' : 'Tambah Akun Panitia',
    body: '<form id="uf" class="stack"><div class="field"><label class="label">Nama lengkap</label><input class="input" name="nama" required value="' + esc(u ? u.nama : '') + '"></div>' +
      '<div class="field"><label class="label">Email (untuk login)</label><input class="input" name="email" type="email" required value="' + esc(u ? u.email : '') + '"></div>' +
      '<div class="grid-2"><div class="field"><label class="label">Peran</label><select class="select" name="role"><option value="PANITIA"' + (!u || u.role === 'PANITIA' ? ' selected' : '') + '>Panitia (Admin event)</option><option value="OPERATOR"' + (u && u.role === 'OPERATOR' ? ' selected' : '') + '>Operator (Superadmin)</option></select></div>' +
      '<div class="field"><label class="label">No. HP</label><input class="input" name="hp" value="' + esc(u ? u.hp : '') + '"></div></div>' +
      (u ? '' : '<div class="field"><label class="label">Kata sandi awal <span class="muted">(kosongkan untuk dibuat otomatis)</span></label><input class="input" name="password" type="text" minlength="8" autocomplete="off"></div>') +
      '<div class="alert small">' + icon('info', 'ic-sm') + '<span>Tugaskan panitia ke event dengan menambahkan emailnya di kolom <b>Panitia Pengelola</b> pada form event.</span></div></form>',
    foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="u-save">' + icon('check', 'ic-sm') + ' Simpan</button>'
  });
  on($('#u-save', m.el), 'click', function () {
    var f = $('#uf', m.el);
    if (!f.reportValidity()) return;
    var b = this; btnLoading(b, true);
    API.act('saveUser', { id: u ? u.id : '', nama: f.nama.value, email: f.email.value, role: f.role.value, hp: f.hp.value, password: f.password ? f.password.value : '' })
      .then(function (r) { m.close(); if (r.data && r.data.password) showPassword(r.data.password, f.email.value); if (reload) reload(); })
      .catch(function (e) { btnLoading(b, false); errToast(e); });
  });
}

// --------------------------------------------------------------------------
// AKUN PANITIA
// --------------------------------------------------------------------------
function pageOperatorAkun(params, query, rid) {
  Layout.app(skeleton(3), 'akun', { search: 'Cari nama atau email…' });
  return API.swr('listUsers', {}, function (d) {
    if (!Router.alive(rid)) return;
    $('#page').innerHTML = adminHead('Operator <span>/</span> <b>Akun Panitia</b>', 'Akun Panitia & Operator', 'Pengelola tidak mendaftar sendiri — akun dibuat dan dikontrol Operator.', '<button class="btn btn-primary" id="u-add">' + icon('plus', 'ic-sm') + ' Tambah Akun</button>') +
      '<div class="card" id="u-table"></div>';
    var draw = function () {
      var q = ($('#top-search').value || '').toLowerCase();
      $('#u-table').innerHTML = usersTable(d.users.filter(function (u) { return !q || (u.nama + u.email).toLowerCase().indexOf(q) > -1; }));
      bindUserActions($('#u-table'), d.users, function () { Router.resolve(); });
    };
    draw();
    on($('#top-search'), 'input', debounce(draw, 200));
    on($('#u-add'), 'click', function () { userModal(null, function () { Router.resolve(); }); });
  });
}

// --------------------------------------------------------------------------
// LOG AKTIVITAS
// --------------------------------------------------------------------------
function pageOperatorLog(params, query, rid) {
  Layout.app(skeleton(3), 'log', { search: 'Filter aktor, aksi, detail…' });
  return API.swr('listLog', { limit: 500 }, function (d) {
    if (!Router.alive(rid)) return;
    var state = { page: 1 };
    $('#page').innerHTML = adminHead('Operator <span>/</span> <b>Log Aktivitas</b>', 'Log Aktivitas', 'Jejak audit otomatis seluruh tindakan penting (500 entri terbaru).', '<button class="btn btn-secondary" id="lg-exp">' + icon('download', 'ic-sm') + ' Ekspor CSV</button>') + '<div class="card" id="lg"></div>';
    var draw = function () {
      var q = ($('#top-search').value || '').toLowerCase();
      var rows = d.log.filter(function (l) { return !q || (l.aktor + l.aksi + l.detail).toLowerCase().indexOf(q) > -1; });
      var pg = paginate(rows, state.page, 25);
      $('#lg').innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (l) { return '<tr><td class="nowrap small">' + esc(fmtDateTime(l.waktu)) + '</td><td class="small">' + esc(l.aktor) + '</td><td><span class="badge b-gray">' + icon(LOG_ICON[l.aksi] || 'activity', 'ic-sm') + ' ' + esc(l.aksi) + '</span></td><td class="small">' + esc(l.detail) + '</td></tr>'; }).join('') : '<tr><td colspan="4">' + emptyState('activity', 'Tidak ada log') + '</td></tr>') +
        '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div>';
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; draw(); }); });
    };
    draw();
    on($('#top-search'), 'input', debounce(function () { state.page = 1; draw(); }, 200));
    on($('#lg-exp'), 'click', function () { exportCSV('log-aktivitas.csv', [['waktu', 'Waktu'], ['aktor', 'Aktor'], ['aksi', 'Aksi'], ['event_id', 'Event'], ['detail', 'Detail']], d.log); });
  });
}
