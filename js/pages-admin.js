/* ==========================================================================
   SIM EVENT — Panel Panitia (Admin) & Operator
   Dashboard laporan, kelola event, verifikasi syarat, pembayaran, CRM leads,
   sesi & QR absensi, evaluasi, sertifikat
   ========================================================================== */
'use strict';

function adminHead(crumb, title, sub, right) {
  return '<div class="page-head"><div class="grow"><div class="crumbs">' + crumb + '</div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="muted mt-8">' + sub + '</p>' : '') + '</div>' + (right ? '<div class="row wrap">' + right + '</div>' : '') + '</div>';
}

function kpiCard(label, value, foot, ic, footColor) {
  return '<div class="card kpi">' + (ic ? '<span class="kpi-icon">' + icon(ic) + '</span>' : '') + '<div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
    (foot ? '<div class="kpi-foot" style="color:' + (footColor || 'var(--muted)') + '">' + foot + '</div>' : '') + '</div>';
}

/** Kerangka halaman berbasis event terpilih. build(events, ev) harus mengembalikan Promise. */
function eventScoped(active, crumb, title, sub, rid, build) {
  Layout.app(skeleton(4), active);
  return EventCtx.load().then(function (list) {
    if (!Router.alive(rid)) return;
    Layout.app('', active);
    if (!list.length) {
      $('#page').innerHTML = adminHead(crumb, title) + '<div class="card">' + emptyState('calendar', 'Belum ada event yang Anda kelola', 'Buat event terlebih dahulu untuk mulai menerima pendaftar.', '<a class="btn btn-primary" href="#/admin/event/baru">' + icon('plus', 'ic-sm') + ' Buat Event</a>') + '</div>';
      return;
    }
    var id = EventCtx.currentId(list);
    var ev = list.filter(function (e) { return e.id === id; })[0];
    $('#page').innerHTML = adminHead(crumb, title, sub, EventCtx.selectHtml(list, id)) + '<div id="scoped">' + skeleton(3) + '</div>';
    EventCtx.bind();
    return build(list, ev);
  });
}

// --------------------------------------------------------------------------
// DASHBOARD & LAPORAN
// --------------------------------------------------------------------------
function pageAdminDashboard(params, query, rid) {
  Layout.app(skeleton(5), 'dashboard');
  var filter = query.event || '';
  return API.swrAll([['listEvents', {}], ['adminDashboard', { eventId: filter }]], function (res) {
    if (!Router.alive(rid)) return;
    var list = res[0].events, d = res[1], r = d.ringkasan;
    EventCtx.list = list;
    Layout.pending = list.reduce(function (a, e) { return a + (e.stat ? e.stat.menunggu : 0); }, 0);
    // halaman lain yang sering dibuka dimuat di latar → terbuka instan
    setTimeout(function () { var ce = Store.get('ctx_event', '') || (list[0] || {}).id; if (ce) { API.prefetch('listPendaftar', { eventId: ce }); API.prefetch('listSesi', { eventId: ce }); } }, 800);
    Layout.app('', 'dashboard');
    var sel = '<div class="ctx-select">' + icon('filter', 'ic-sm') + '<select class="select" id="dash-ev"><option value="">Semua event (' + list.length + ')</option>' +
      list.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === filter ? ' selected' : '') + '>' + esc(e.nama) + '</option>'; }).join('') + '</select></div>' +
      '<button class="btn btn-secondary" id="dash-export">' + icon('download', 'ic-sm') + ' Ekspor Laporan</button>' +
      '<a class="btn btn-primary" href="#/admin/event/baru">' + icon('plus', 'ic-sm') + ' Buat Event</a>';

    var verParts = [
      { label: 'Lolos', value: r.lolos, color: '#10b981' }, { label: 'Menunggu', value: r.menunggu, color: '#f59e0b' },
      { label: 'Perlu Perbaikan', value: r.perlu_perbaikan, color: '#fb7185' }, { label: 'Ditolak', value: r.ditolak, color: '#94a3b8' }
    ];
    $('#page').innerHTML = adminHead('SIM Management <span>/</span> <b>Dashboard</b>', 'Dashboard & Laporan', 'Halo, ' + esc(S.user.nama) + '. Ringkasan ' + (filter ? 'event terpilih' : r.event + ' event yang Anda kelola') + '.', sel) +
      '<div class="grid-4">' +
      kpiCard('Total Pendaftar', num(r.pendaftar), icon('clock', 'ic-sm') + ' ' + num(r.menunggu) + ' menunggu review', 'users', r.menunggu ? 'var(--warning)' : '') +
      kpiCard('Lolos Verifikasi', num(r.lolos), icon('checkCircle', 'ic-sm') + ' ' + pct(r.lolos, r.pendaftar) + '% dari pendaftar', 'userCheck', 'var(--accent-dark)') +
      kpiCard('Pembayaran Lunas', num(r.pembayaran_lunas), icon('wallet', 'ic-sm') + ' ' + rupiah(r.pendapatan), 'card', 'var(--accent-dark)') +
      kpiCard('Sertifikat Terbit', num(r.sertifikat_terbit), icon('star', 'ic-sm') + ' ' + num(r.evaluasi) + ' evaluasi masuk', 'award') + '</div>' +
      '<div class="split mt-24" style="grid-template-columns:minmax(0,1fr) 340px">' +
      '<div class="card card-pad"><div class="row between"><div><h3>Tren Pendaftaran</h3><p class="small muted">30 hari terakhir</p></div><span class="badge b-blue">' + num(d.tren.reduce(function (a, x) { return a + x.jumlah; }, 0)) + ' pendaftar</span></div>' + barChart(d.tren, 'jumlah', 'tanggal') + '</div>' +
      '<div class="card card-pad"><h3>Status Verifikasi</h3><div class="row mt-16" style="gap:18px;flex-wrap:wrap">' + donut(verParts, 140) +
      '<div class="legend">' + verParts.map(function (p) { return '<div><i style="background:' + p.color + '"></i>' + esc(p.label) + ' <b>' + num(p.value) + '</b></div>'; }).join('') + '</div></div>' +
      '<div class="divider"></div><div class="stack-sm small"><div class="row between"><span class="muted">Hadir memenuhi syarat</span><b>' + num(r.hadir_memenuhi) + '</b></div><div class="row between"><span class="muted">Pembayaran menunggu</span><b>' + num(r.pembayaran_menunggu) + '</b></div></div></div></div>' +
      '<div class="card mt-24"><div class="card-head"><div><h3>Laporan per Event</h3><p class="small muted">Pendaftar, verifikasi, pembayaran, absensi, evaluasi & sertifikat</p></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>Status</th><th>Pendaftar</th><th>Lolos</th><th>Lunas</th><th>Pendapatan</th><th>Hadir</th><th>Rating</th><th>Sertifikat</th><th></th></tr></thead><tbody>' +
      (d.per_event.length ? d.per_event.map(function (e) {
        return '<tr><td><div class="cell-name">' + esc(e.nama) + '</div><div class="cell-sub">' + esc(e.kode) + ' · ' + esc(fmtDate(e.tanggal_mulai)) + '</div></td><td>' + statusBadge(e.status) + '</td>' +
          '<td>' + num(e.pendaftar) + (e.kuota ? '<span class="muted"> / ' + num(e.kuota) + '</span>' : '') + '</td><td>' + num(e.verifikasi.lolos) + (e.verifikasi.menunggu ? ' <span class="badge b-amber">' + e.verifikasi.menunggu + ' antre</span>' : '') + '</td>' +
          '<td>' + num(e.pembayaran_lunas) + '</td><td class="nowrap">' + rupiah(e.pendapatan) + '</td><td>' + num(e.hadir_memenuhi) + '</td><td>' + (e.rating ? '★ ' + e.rating : '-') + '</td><td>' + num(e.sertifikat_terbit) + '</td>' +
          '<td><a class="btn btn-ghost btn-xs" href="#/admin/verifikasi?event=' + esc(e.id) + '">Kelola ' + icon('chevRight', 'ic-sm') + '</a></td></tr>';
      }).join('') : '<tr><td colspan="10">' + emptyState('calendar', 'Belum ada data') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card mt-24"><div class="card-head"><h3>Pendaftar Terbaru</h3><a class="btn btn-ghost btn-sm" href="#/admin/leads">Lihat CRM ' + icon('arrowRight', 'ic-sm') + '</a></div><div class="card-body stack-sm">' +
      (d.terbaru.length ? d.terbaru.map(function (p) {
        var evn = (list.filter(function (e) { return e.id === p.event_id; })[0] || {}).nama || '';
        return '<div class="row between wrap" style="padding:6px 0;border-bottom:1px solid var(--border)"><div class="row" style="min-width:0"><span class="avatar avatar-soft">' + esc(initials(p.nama)) + '</span><div style="min-width:0"><div class="bold ellipsis">' + esc(p.nama) + '</div><div class="xs muted ellipsis">' + esc(p.institusi) + ' · ' + esc(evn) + '</div></div></div><div class="row">' + statusBadge(p.status_verifikasi) + '<span class="xs muted nowrap">' + esc(timeAgo(p.tanggal_daftar)) + '</span></div></div>';
      }).join('') : '<p class="muted small">Belum ada pendaftar.</p>') + '</div></div>';

    on($('#dash-ev'), 'change', function () { Router.go('#/admin' + (this.value ? '?event=' + encodeURIComponent(this.value) : '')); });
    on($('#dash-export'), 'click', function () {
      exportCSV('laporan-sim-event-' + new Date().toISOString().slice(0, 10) + '.csv', [
        ['kode', 'Kode'], ['nama', 'Event'], ['status', 'Status'], ['tanggal_mulai', 'Tanggal'], ['kuota', 'Kuota'], ['pendaftar', 'Pendaftar'],
        [function (e) { return e.verifikasi.menunggu; }, 'Menunggu'], [function (e) { return e.verifikasi.perlu_perbaikan; }, 'Perlu Perbaikan'],
        [function (e) { return e.verifikasi.lolos; }, 'Lolos'], [function (e) { return e.verifikasi.ditolak; }, 'Ditolak'],
        ['pembayaran_lunas', 'Pembayaran Lunas'], ['pendapatan', 'Pendapatan (Rp)'], ['hadir_memenuhi', 'Hadir Memenuhi'], ['evaluasi', 'Evaluasi'], ['rating', 'Rating'], ['sertifikat_terbit', 'Sertifikat Terbit']
      ], d.per_event);
    });
  });
}

// --------------------------------------------------------------------------
// KELOLA EVENT
// --------------------------------------------------------------------------
function pageAdminEvents(params, query, rid) {
  Layout.app(skeleton(4), 'events', { search: 'Cari event…' });
  return EventCtx.load().then(function (list) {
    if (!Router.alive(rid)) return;
    var status = query.status || '';
    var render = function () {
      var q = ($('#top-search') ? $('#top-search').value : '').toLowerCase();
      var rows = list.filter(function (e) { return (!status || e.status === status) && (!q || (e.nama + e.kode + e.kategori).toLowerCase().indexOf(q) > -1); });
      $('#ev-list').innerHTML = rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>Jadwal</th><th>Status</th><th>Kuota</th><th>Syarat</th><th>Absensi</th><th class="right">Aksi</th></tr></thead><tbody>' +
        rows.map(function (e) {
          return '<tr><td><div class="cell-name">' + esc(e.nama) + '</div><div class="cell-sub">' + esc(e.kode) + ' · ' + esc(e.kategori || '-') + ' · ' + (e.biaya ? rupiah(e.biaya) : 'Gratis') + '</div></td>' +
            '<td class="nowrap">' + esc(fmtDate(e.tanggal_mulai)) + '<div class="xs muted">' + esc(e.lokasi || '') + '</div></td>' +
            '<td><select class="select" data-status="' + esc(e.id) + '" style="height:32px;width:auto;min-width:110px">' + ['draft', 'aktif', 'selesai', 'arsip'].map(function (s) { return '<option value="' + s + '"' + (e.status === s ? ' selected' : '') + '>' + STATUS_LABEL[s][0] + '</option>'; }).join('') + '</select></td>' +
            '<td style="min-width:130px"><div class="small">' + num(e.stat.pendaftar) + (e.kuota ? ' / ' + num(e.kuota) : '') + ' <span class="muted">(' + e.stat.lolos + ' lolos)</span></div><div class="progress mt-8"><span style="width:' + (e.kuota ? Math.min(100, pct(e.terisi, e.kuota)) : 0) + '%"></span></div></td>' +
            '<td class="small">' + e.syarat.length + ' syarat</td><td class="small">' + e.sesi_wajib + 'x sesi</td>' +
            '<td class="right nowrap"><a class="btn btn-secondary btn-xs" href="#/admin/event/' + esc(e.id) + '/edit">' + icon('edit', 'ic-sm') + ' Edit</a> ' +
            '<a class="btn btn-secondary btn-xs" href="#/admin/verifikasi?event=' + esc(e.id) + '">' + icon('clipboard', 'ic-sm') + ' Verifikasi</a> ' +
            '<a class="btn btn-secondary btn-xs" href="#/admin/sesi?event=' + esc(e.id) + '">' + icon('qr', 'ic-sm') + ' Sesi</a> ' +
            '<a class="btn btn-ghost btn-xs" href="#/event/' + esc(e.id) + '" target="_blank" title="Lihat halaman publik">' + icon('external', 'ic-sm') + '</a></td></tr>';
        }).join('') + '</tbody></table></div>' : emptyState('calendar', 'Tidak ada event', 'Buat event baru atau ubah filter.');
      $$('[data-status]').forEach(function (s) {
        on(s, 'change', function () {
          var el = this;
          API.act('setEventStatus', { id: el.dataset.status, status: el.value }).then(function () { EventCtx.list = null; PublicCache.set(null); }).catch(function (e) { errToast(e); Router.resolve(); });
        });
      });
    };
    $('#page').innerHTML = adminHead('SIM Management <span>/</span> <b>Kelola Event</b>', 'Kelola Event', 'Buat event, atur syarat kelulusan, jumlah sesi absensi wajib, dan status publikasi.',
      '<div class="segmented" id="st-filter">' + [['', 'Semua'], ['aktif', 'Aktif'], ['draft', 'Draft'], ['selesai', 'Selesai'], ['arsip', 'Arsip']].map(function (s) { return '<button data-s="' + s[0] + '" class="' + (status === s[0] ? 'active' : '') + '">' + s[1] + ' (' + list.filter(function (e) { return !s[0] || e.status === s[0]; }).length + ')</button>'; }).join('') + '</div>' +
      '<a class="btn btn-primary" href="#/admin/event/baru">' + icon('plus', 'ic-sm') + ' Buat Event</a>') +
      '<div class="alert alert-info mb-16">' + icon('info') + '<div class="small">Hanya event berstatus <b>Aktif</b> yang tampil & bisa didaftar di halaman publik. Event <b>Selesai</b> tetap tampil namun pendaftaran tertutup.</div></div>' +
      '<div class="card" id="ev-list"></div>';
    render();
    on($('#top-search'), 'input', debounce(render, 200));
    $$('#st-filter button').forEach(function (b) { on(b, 'click', function () { Router.go('#/admin/events' + (b.dataset.s ? '?status=' + b.dataset.s : '')); }); });
  });
}

var SYARAT_PRESET = {
  pembayaran: { key: 'pembayaran', label: 'Bukti Pembayaran', tipe: 'file', wajib: true, deskripsi: 'Bukti transfer / slip pembayaran' },
  follow: { key: 'follow', label: 'Bukti Follow Akun', tipe: 'file', wajib: true, deskripsi: 'Screenshot follow akun media sosial resmi' },
  share: { key: 'share', label: 'Bukti Share Info', tipe: 'file', wajib: false, deskripsi: 'Story/feed/broadcast info event' },
  identitas: { key: 'identitas', label: 'Kartu Identitas (KTM/KTP)', tipe: 'file', wajib: true, deskripsi: 'Kartu mahasiswa aktif atau KTP' }
};

function pageEventForm(params, query, rid) {
  var isNew = !params.id;
  Layout.app(skeleton(4), 'events');
  return EventCtx.load().then(function (list) {
    if (!Router.alive(rid)) return;
    var ev = isNew ? {
      nama: '', kode: '', kategori: '', deskripsi: '', pembicara: '', lokasi: '', tanggal_mulai: '', tanggal_selesai: '', jam: '08:00 - 16:00', batas_daftar: '',
      kuota: 100, biaya: 0, info_pembayaran: '', cover_url: '', panitia_email: S.user.email, status: 'draft', sesi_wajib: 2,
      syarat: [SYARAT_PRESET.follow, SYARAT_PRESET.share, SYARAT_PRESET.identitas], penandatangan: [{ nama: '', jabatan: 'Ketua Pelaksana' }, { nama: '', jabatan: 'Penanggung Jawab' }]
    } : list.filter(function (e) { return e.id === params.id; })[0];
    if (!ev) throw new Error('Event tidak ditemukan atau Anda tidak memiliki akses.');
    var syarat = JSON.parse(JSON.stringify(ev.syarat || []));
    var ttd = (ev.penandatangan && ev.penandatangan.length ? ev.penandatangan : [{ nama: '', jabatan: '' }]).concat([{ nama: '', jabatan: '' }]).slice(0, 2);
    var sesiWajib = Number(ev.sesi_wajib) || 1;

    var f = function (name, label, type, val, ph, extra) {
      return '<div class="field"><label class="label" for="e-' + name + '">' + label + '</label>' +
        (type === 'textarea' ? '<textarea class="textarea" id="e-' + name + '" name="' + name + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '>' + esc(val) + '</textarea>'
          : '<input class="input" id="e-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '>') + '</div>';
    };

    $('#page').innerHTML = adminHead('Kelola Event <span>/</span> <b>' + (isNew ? 'Buat Baru' : 'Edit') + '</b>', isNew ? 'Buat Event Baru' : 'Edit Event', isNew ? 'Lengkapi informasi event. Sesi absensi akan dibuat otomatis sesuai jumlah wajib.' : esc(ev.nama),
      '<a class="btn btn-secondary" href="#/admin/events">' + icon('arrowLeft', 'ic-sm') + ' Kembali</a>') +
      '<form id="evf" class="split" novalidate><div class="stack">' +
      '<section class="card section-card"><div class="section-head"><span class="section-num">01</span><div><h3>Informasi Event</h3></div></div><div class="stack">' +
      f('nama', 'Nama event <span class="req">*</span>', 'text', ev.nama, 'mis. Seminar Nasional Ekonomi Syariah', 'required minlength="5"') +
      '<div class="grid-2">' + f('kategori', 'Kategori', 'text', ev.kategori, 'mis. Ekonomi Syariah', 'list="kat-list"') + f('kode', 'Kode event (untuk nomor sertifikat)', 'text', ev.kode, 'Otomatis bila kosong', 'maxlength="12" style="text-transform:uppercase"') + '</div>' +
      '<datalist id="kat-list">' + list.map(function (e) { return e.kategori; }).filter(function (k, i, a) { return k && a.indexOf(k) === i; }).map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist>' +
      f('deskripsi', 'Deskripsi', 'textarea', ev.deskripsi, 'Tujuan, materi, sasaran peserta…', 'rows="5"') +
      f('pembicara', 'Pembicara / narasumber', 'text', ev.pembicara, 'Pisahkan dengan koma') + '</div></section>' +

      '<section class="card section-card"><div class="section-head"><span class="section-num">02</span><div><h3>Jadwal, Lokasi & Kuota</h3></div></div><div class="stack">' +
      '<div class="grid-2">' + f('tanggal_mulai', 'Tanggal mulai <span class="req">*</span>', 'date', ev.tanggal_mulai, '', 'required') + f('tanggal_selesai', 'Tanggal selesai', 'date', ev.tanggal_selesai) + '</div>' +
      '<div class="grid-2">' + f('jam', 'Jam', 'text', ev.jam, '08:00 - 16:00') + f('batas_daftar', 'Batas pendaftaran', 'date', ev.batas_daftar) + '</div>' +
      f('lokasi', 'Lokasi', 'text', ev.lokasi, 'Nama gedung / Zoom / Hybrid') +
      '<div class="grid-2">' + f('kuota', 'Kuota peserta (0 = tanpa batas)', 'number', ev.kuota, '', 'min="0"') + f('biaya', 'Biaya (Rp, 0 = gratis)', 'number', ev.biaya, '', 'min="0" step="1000"') + '</div>' +
      f('info_pembayaran', 'Informasi pembayaran (tampil di form)', 'textarea', ev.info_pembayaran, 'Bank, no. rekening, atas nama, catatan…', 'rows="3"') + '</div></section>' +

      '<section class="card section-card"><div class="section-head"><span class="section-num">03</span><div class="grow"><h3>Syarat Kelulusan Verifikasi</h3><p class="small muted">Pendaftar lolos hanya jika SEMUA syarat wajib disetujui panitia. Syarat pembayaran otomatis ditambahkan bila biaya > 0.</p></div></div>' +
      '<div class="row wrap mb-16"><span class="small muted">Tambah cepat:</span>' + Object.keys(SYARAT_PRESET).map(function (k) { return '<button type="button" class="btn btn-secondary btn-xs" data-preset="' + k + '">' + icon('plus', 'ic-sm') + ' ' + esc(SYARAT_PRESET[k].label) + '</button>'; }).join('') +
      '<button type="button" class="btn btn-light btn-xs" data-preset="custom">' + icon('plus', 'ic-sm') + ' Syarat Custom</button></div>' +
      '<div id="syarat-list" class="stack-sm"></div></section>' +
      '</div><aside class="stack" style="position:sticky;top:80px">' +
      '<div class="card card-pad stack"><h4>Publikasi</h4><div class="field"><label class="label">Status</label><select class="select" name="status">' + ['draft', 'aktif', 'selesai', 'arsip'].map(function (s) { return '<option value="' + s + '"' + (ev.status === s ? ' selected' : '') + '>' + STATUS_LABEL[s][0] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label">Jumlah sesi absensi wajib</label><div class="segmented" id="sesi-seg"><button type="button" data-v="1" class="' + (sesiWajib === 1 ? 'active' : '') + '">1x (Masuk)</button><button type="button" data-v="2" class="' + (sesiWajib === 2 ? 'active' : '') + '">2x (Masuk & Keluar)</button></div><span class="hint">Peserta harus scan QR sebanyak ini sebelum dapat mengisi evaluasi.</span></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit" id="ev-save">' + icon('check') + ' ' + (isNew ? 'Buat Event' : 'Simpan Perubahan') + '</button></div>' +
      '<div class="card card-pad stack"><h4>Panitia Pengelola</h4>' + f('panitia_email', 'Email panitia (pisahkan koma)', 'textarea', ev.panitia_email, 'panitia@kampus.ac.id', 'rows="2"') +
      '<p class="xs muted">Setiap email panitia yang terdaftar dapat mengelola event ini.</p></div>' +
      '<div class="card card-pad stack"><h4>Penandatangan Sertifikat</h4>' + ttd.map(function (t, i) {
        return '<div class="grid-2" style="gap:8px"><input class="input" data-ttd-nama="' + i + '" placeholder="Nama ' + (i + 1) + '" value="' + esc(t.nama) + '"><input class="input" data-ttd-jab="' + i + '" placeholder="Jabatan" value="' + esc(t.jabatan) + '"></div>';
      }).join('') + '</div>' +
      '<div class="card card-pad stack"><h4>Cover Event</h4><div class="event-cover" style="border-radius:8px" id="cover-prev">' + (ev.cover_url ? '<img src="' + esc(ev.cover_url) + '" referrerpolicy="no-referrer">' : '<div class="cover-art">' + icon('image') + '</div>') + '</div>' +
      f('cover_url', 'URL gambar cover', 'url', ev.cover_url, 'https://…') +
      (isNew ? '<p class="xs muted">Unggah gambar dari perangkat tersedia setelah event dibuat.</p>' : '<label class="btn btn-secondary btn-sm" style="position:relative;overflow:hidden">' + icon('upload', 'ic-sm') + ' Unggah Gambar<input type="file" id="cover-file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>') + '</div>' +
      '</aside></form>';

    var renderSyarat = function () {
      $('#syarat-list').innerHTML = syarat.length ? '<div class="syarat-row xs muted bold" style="padding:0 4px"><span>LABEL</span><span>KETERANGAN</span><span>TIPE</span><span>WAJIB</span><span></span></div>' + syarat.map(function (s, i) {
        return '<div class="syarat-row q-box" style="padding:8px"><input class="input" data-sy="label" data-i="' + i + '" value="' + esc(s.label) + '" placeholder="Label syarat">' +
          '<input class="input" data-sy="deskripsi" data-i="' + i + '" value="' + esc(s.deskripsi || '') + '" placeholder="Petunjuk singkat">' +
          '<select class="select" data-sy="tipe" data-i="' + i + '">' + [['file', 'Berkas'], ['link', 'Tautan'], ['teks', 'Teks']].map(function (t) { return '<option value="' + t[0] + '"' + (s.tipe === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
          '<label class="checkbox small"><input type="checkbox" data-sy="wajib" data-i="' + i + '"' + (s.wajib ? ' checked' : '') + '> Wajib</label>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-del="' + i + '" aria-label="Hapus">' + icon('trash', 'ic-sm') + '</button></div>';
      }).join('') : '<p class="small muted">Belum ada syarat. Pendaftar akan otomatis lolos? Tidak — tambahkan minimal satu syarat wajib agar bisa diverifikasi.</p>';
      $$('[data-sy]').forEach(function (el) {
        on(el, el.type === 'checkbox' ? 'change' : 'input', function () {
          var s = syarat[+el.dataset.i];
          s[el.dataset.sy] = el.type === 'checkbox' ? el.checked : el.value;
          if (el.dataset.sy === 'label' && s._custom) s.key = el.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
        });
      });
      $$('[data-del]').forEach(function (b) { on(b, 'click', function () { syarat.splice(+b.dataset.del, 1); renderSyarat(); }); });
    };
    renderSyarat();
    $$('[data-preset]').forEach(function (b) {
      on(b, 'click', function () {
        var k = b.dataset.preset;
        if (k === 'custom') syarat.push({ key: 'syarat_' + (syarat.length + 1), label: '', tipe: 'file', wajib: true, deskripsi: '', _custom: true });
        else if (syarat.some(function (s) { return s.key === k; })) return toast('Syarat tersebut sudah ada.', 'warn');
        else syarat.push(JSON.parse(JSON.stringify(SYARAT_PRESET[k])));
        renderSyarat();
      });
    });
    $$('#sesi-seg button').forEach(function (b) { on(b, 'click', function () { sesiWajib = +b.dataset.v; $$('#sesi-seg button').forEach(function (x) { x.classList.toggle('active', x === b); }); }); });
    on($('#e-cover_url'), 'change', function () { $('#cover-prev').innerHTML = this.value ? '<img src="' + esc(this.value) + '" referrerpolicy="no-referrer">' : '<div class="cover-art">' + icon('image') + '</div>'; });
    on($('#cover-file'), 'change', function () {
      var file = this.files[0]; if (!file) return;
      toast('Mengunggah cover…');
      prepareUpload(file).then(function (fl) { return API.act('uploadCover', { eventId: ev.id, file: fl }); })
        .then(function (r) { $('#e-cover_url').value = r.data.cover_url; $('#cover-prev').innerHTML = '<img src="' + esc(r.data.cover_url) + '" referrerpolicy="no-referrer">'; EventCtx.list = null; })
        .catch(errToast);
    });

    on($('#evf'), 'submit', function (e) {
      e.preventDefault();
      var form = this;
      if (!form.nama.value.trim() || form.nama.value.trim().length < 5) { form.nama.classList.add('invalid'); form.nama.focus(); return toast('Nama event minimal 5 karakter.', 'err'); }
      if (!form.tanggal_mulai.value) { form.tanggal_mulai.classList.add('invalid'); form.tanggal_mulai.focus(); return toast('Tanggal mulai wajib diisi.', 'err'); }
      if (syarat.some(function (s) { return !String(s.label).trim(); })) return toast('Semua syarat harus memiliki label.', 'err');
      var payload = { id: ev.id || '', sesi_wajib: sesiWajib, syarat: syarat.map(function (s) { return { key: s.key, label: s.label, tipe: s.tipe, wajib: !!s.wajib, deskripsi: s.deskripsi || '' }; }) };
      ['nama', 'kode', 'kategori', 'deskripsi', 'pembicara', 'lokasi', 'tanggal_mulai', 'tanggal_selesai', 'jam', 'batas_daftar', 'kuota', 'biaya', 'info_pembayaran', 'cover_url', 'panitia_email', 'status'].forEach(function (k) { payload[k] = form[k].value; });
      payload.penandatangan = [0, 1].map(function (i) { return { nama: $('[data-ttd-nama="' + i + '"]').value, jabatan: $('[data-ttd-jab="' + i + '"]').value }; });
      var b = $('#ev-save'); btnLoading(b, true, 'Menyimpan…');
      API.act('saveEvent', payload).then(function (r) {
        EventCtx.list = null; PublicCache.set(null);
        Store.set('ctx_event', r.data.id);
        Router.go('#/admin/events');
      }).catch(function (err) { btnLoading(b, false); errToast(err); });
    });
  });
}

// --------------------------------------------------------------------------
// VERIFIKASI SYARAT (Committee Review)
// --------------------------------------------------------------------------
function pageAdminVerifikasi(params, query, rid) {
  var state = { page: 1, q: '', status: query.status || '', bayar: '', selected: {} };
  return eventScoped('verifikasi', 'SIM Management <span>/</span> <b>Committee Review</b>', 'Verifikasi Syarat & Pembayaran', 'Tinjau bukti dari pendaftar, setujui atau minta perbaikan per syarat.', rid, function (list, ev) {
    var load = function () {
      return API.swr('listPendaftar', { eventId: ev.id }, function (d) {
        if (!Router.alive(rid)) return;
        draw(d);
      });
    };
    var draw = function (d) {
      var r = d.ringkasan, hasBayar = d.syarat.some(function (s) { return s.key === 'pembayaran'; });
      var rows = d.pendaftar.filter(function (p) {
        if (state.status && p.status_verifikasi !== state.status) return false;
        if (state.bayar && p.pembayaran !== state.bayar) return false;
        if (state.q && (p.nama + ' ' + p.email + ' ' + p.id + ' ' + p.institusi).toLowerCase().indexOf(state.q) === -1) return false;
        return true;
      });
      var pg = paginate(rows, state.page);
      var selCount = Object.keys(state.selected).length;
      var shortLabel = function (s) { return s.label.replace(/^(Bukti|Kartu)\s+/i, '').split(/[\s(]/)[0]; };

      $('#scoped').innerHTML =
        '<div class="grid-4">' +
        kpiCard('Menunggu Verifikasi', num(r.menunggu), icon('clock', 'ic-sm') + ' Perlu tindakan panitia', '', 'var(--warning)') +
        kpiCard('Pembayaran Lunas', num(r.lunas), icon('checkCircle', 'ic-sm') + ' ' + (hasBayar ? pct(r.lunas, r.total) + '% rekonsiliasi' : 'Event gratis'), '', 'var(--accent-dark)') +
        kpiCard('Perlu Perbaikan', num(r.perlu_perbaikan), icon('alertCircle', 'ic-sm') + ' Berkas ditolak / tidak sesuai', '', '#b91c1c') +
        kpiCard('Total Pendaftar', num(r.total), icon('userCheck', 'ic-sm') + ' ' + num(r.lolos) + ' lolos · ' + num(r.ditolak) + ' ditolak') + '</div>' +
        '<div class="toolbar mt-24"><div class="input-icon">' + icon('search') + '<input class="input input-soft" id="v-q" placeholder="Cari nama, email, ID pendaftaran…" value="' + esc(state.q) + '"></div>' +
        '<select class="select input-soft" id="v-status"><option value="">Semua Status</option>' + ['menunggu', 'perlu_perbaikan', 'lolos', 'ditolak'].map(function (s) { return '<option value="' + s + '"' + (state.status === s ? ' selected' : '') + '>' + STATUS_LABEL[s][0] + '</option>'; }).join('') + '</select>' +
        (hasBayar ? '<select class="select input-soft" id="v-bayar"><option value="">Pembayaran: Semua</option>' + ['menunggu', 'lunas', 'belum', 'ditolak'].map(function (s) { return '<option value="' + s + '"' + (state.bayar === s ? ' selected' : '') + '>' + (STATUS_LABEL[s] || [s])[0] + '</option>'; }).join('') + '</select>' : '') +
        '<span class="grow"></span><button class="btn btn-secondary" id="v-export">' + icon('download', 'ic-sm') + ' Ekspor</button>' +
        '<button class="btn btn-navy" id="v-batch"' + (selCount ? '' : ' disabled') + '>' + icon('shieldCheck', 'ic-sm') + ' Setujui Terpilih' + (selCount ? ' (' + selCount + ')' : '') + '</button></div>' +
        '<div class="card mt-16"><div class="table-wrap"><table class="table"><thead><tr><th style="width:36px"><input type="checkbox" id="v-all" aria-label="Pilih semua"></th><th>Pendaftar & ID</th>' +
        d.syarat.map(function (s) { return '<th title="' + esc(s.label) + '">' + esc(shortLabel(s)) + (s.wajib ? '' : ' <span style="font-weight:400">(ops)</span>') + '</th>'; }).join('') +
        '<th>Status</th><th>Absen</th><th class="right">Aksi</th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (p) {
          return '<tr><td><input type="checkbox" data-sel="' + esc(p.id) + '"' + (state.selected[p.id] ? ' checked' : '') + '></td>' +
            '<td><div class="cell-name">' + esc(p.nama) + '</div><div class="cell-sub">' + esc(p.id) + '</div><div class="xs muted ellipsis" style="max-width:220px">' + esc(p.institusi) + '</div></td>' +
            d.syarat.map(function (s) { return '<td>' + statusBadge(p.syarat[s.key]) + '</td>'; }).join('') +
            '<td>' + statusBadge(p.status_verifikasi) + '</td><td class="small">' + (p.status_verifikasi === 'lolos' ? p.hadir + '/' + d.event.sesi_wajib : '-') + '</td>' +
            '<td class="right"><button class="btn btn-secondary btn-sm" data-detail="' + esc(p.id) + '">' + icon('eye', 'ic-sm') + ' Tinjau</button></td></tr>';
        }).join('') : '<tr><td colspan="' + (d.syarat.length + 5) + '">' + emptyState('inbox', 'Tidak ada pendaftar', state.q || state.status ? 'Coba ubah filter.' : 'Bagikan tautan pendaftaran event Anda.') + '</td></tr>') +
        '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div></div>';

      on($('#v-q'), 'input', debounce(function () { state.q = this.value.toLowerCase(); state.page = 1; draw(d); var el = $('#v-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 300));
      on($('#v-status'), 'change', function () { state.status = this.value; state.page = 1; draw(d); });
      on($('#v-bayar'), 'change', function () { state.bayar = this.value; state.page = 1; draw(d); });
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; draw(d); }); });
      $$('[data-sel]').forEach(function (c) { on(c, 'change', function () { if (c.checked) state.selected[c.dataset.sel] = true; else delete state.selected[c.dataset.sel]; draw(d); }); });
      on($('#v-all'), 'change', function () { var chk = this.checked; pg.items.forEach(function (p) { if (chk) state.selected[p.id] = true; else delete state.selected[p.id]; }); draw(d); });
      $$('[data-detail]').forEach(function (b) { on(b, 'click', function () { openPendaftarDrawer(b.dataset.detail, load); }); });
      on($('#v-batch'), 'click', function () {
        var ids = Object.keys(state.selected);
        confirmDialog({ title: 'Setujui syarat terpilih?', message: 'Semua syarat berstatus "Menunggu Review" dari ' + ids.length + ' pendaftar akan disetujui. Pendaftar yang seluruh syarat wajibnya disetujui otomatis menjadi Peserta.', ok: 'Setujui ' + ids.length + ' pendaftar' })
          .then(function (ok) {
            if (!ok) return;
            var b = $('#v-batch'); btnLoading(b, true, 'Memproses…');
            API.act('batchVerify', { eventId: ev.id, pendaftarIds: ids }).then(function () { state.selected = {}; EventCtx.list = null; load(); }).catch(function (e) { btnLoading(b, false); errToast(e); });
          });
      });
      on($('#v-export'), 'click', function () {
        exportCSV('pendaftar-' + ev.kode + '.csv', [['id', 'ID'], ['nama', 'Nama'], ['email', 'Email'], ['hp', 'HP'], ['institusi', 'Institusi'], ['tanggal_daftar', 'Tanggal Daftar'], ['status_verifikasi', 'Status']]
          .concat(d.syarat.map(function (s) { return [function (p) { return p.syarat[s.key]; }, s.label]; }))
          .concat([['pembayaran', 'Pembayaran'], ['hadir', 'Sesi Hadir'], [function (p) { return p.evaluasi ? 'ya' : ''; }, 'Evaluasi'], ['sertifikat', 'Sertifikat']]), rows);
      });
    };
    return load();
  });
}

function openPendaftarDrawer(id, onChange) {
  var m = openModal({ drawer: true, title: 'Detail Pendaftar', body: skeleton(4) });
  var changed = false;
  var origClose = m.close;
  m.close = function () { origClose(); if (changed && onChange) onChange(); };

  var render = function () {
    API.swr('getPendaftarDetail', { id: id }, function (d) {
      var p = d.pendaftar;
      var sesiWajib = d.event.sesi_wajib;
      m.body(
        '<div class="card card-pad-sm row-top"><span class="avatar" style="width:48px;height:48px;font-size:15px">' + esc(initials(p.nama)) + '</span><div class="grow" style="min-width:0"><h3>' + esc(p.nama) + '</h3><div class="mono xs muted">' + esc(p.id) + '</div><div class="mt-8">' + statusBadge(p.status_verifikasi) + '</div></div></div>' +
        '<div class="card card-pad-sm mt-16"><dl class="kv"><dt>Email</dt><dd><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></dd><dt>WhatsApp</dt><dd>' + esc(p.hp) + ' <a class="btn btn-accent btn-xs" target="_blank" rel="noopener" href="' + waLink(p.hp, 'Halo ' + p.nama + ', kami panitia ' + d.event.nama + '.') + '">' + icon('message', 'ic-sm') + ' Chat</a></dd>' +
        '<dt>Institusi</dt><dd>' + esc(p.institusi) + '</dd><dt>Tanggal daftar</dt><dd>' + esc(fmtDateTime(p.tanggal_daftar)) + '</dd>' + (p.catatan_verifikasi ? '<dt>Catatan</dt><dd>' + esc(p.catatan_verifikasi) + '</dd>' : '') + '</dl></div>' +
        '<h4 class="mt-24 mb-8">Syarat & Bukti</h4><div class="stack-sm">' +
        d.syarat.map(function (s) {
          var bukti = s.tipe === 'file'
            ? (s.file_id ? '<button class="btn btn-secondary btn-xs" data-prev="' + esc(s.file_id) + '" data-label="' + esc(s.label) + '">' + icon('eye', 'ic-sm') + ' Lihat Bukti</button> <span class="xs muted">' + esc(timeAgo(s.diunggah_at)) + '</span>' : '<span class="xs muted">Belum mengunggah</span>')
            : (s.nilai ? (s.tipe === 'link' ? '<a class="small" href="' + esc(s.nilai) + '" target="_blank" rel="noopener" style="word-break:break-all">' + esc(s.nilai) + '</a>' : '<span class="small">' + esc(s.nilai) + '</span>') : '<span class="xs muted">Belum diisi</span>');
          return '<div class="card card-pad-sm stack-sm"><div class="row between"><div><b>' + esc(s.label) + '</b> <span class="xs muted">' + (s.wajib ? 'wajib' : 'opsional') + '</span></div>' + statusBadge(s.status) + '</div>' +
            '<div class="row wrap">' + bukti + '</div>' +
            (s.catatan ? '<div class="xs" style="color:#93000a">Catatan: ' + esc(s.catatan) + '</div>' : '') +
            (s.diverifikasi_oleh ? '<div class="xs muted">Oleh ' + esc(s.diverifikasi_oleh) + ' · ' + esc(fmtDateTime(s.diverifikasi_at)) + '</div>' : '') +
            (s.id && s.status !== 'belum' && p.status_verifikasi !== 'ditolak' ? '<div class="row wrap">' +
              (s.status !== 'disetujui' ? '<button class="btn btn-accent btn-xs" data-ok="' + esc(s.id) + '">' + icon('check', 'ic-sm') + ' Setujui</button>' : '') +
              (s.status !== 'ditolak' ? '<button class="btn btn-danger btn-xs" data-no="' + esc(s.id) + '" data-label="' + esc(s.label) + '">' + icon('x', 'ic-sm') + ' Tolak / Minta Perbaikan</button>' : '') + '</div>' : '') +
            '</div>';
        }).join('') + '</div>' +
        (d.pembayaran ? '<h4 class="mt-24 mb-8">Pembayaran</h4><div class="card card-pad-sm row between wrap"><div><div class="bold">' + rupiah(d.pembayaran.nominal) + '</div><div class="xs muted">' + esc(d.pembayaran.metode || '') + (d.pembayaran.diverifikasi_oleh ? ' · diverifikasi ' + esc(d.pembayaran.diverifikasi_oleh) : '') + '</div></div>' + statusBadge(d.pembayaran.status) + '</div>' : '') +
        (p.status_verifikasi === 'lolos' ? '<h4 class="mt-24 mb-8">Absensi (' + d.absensi.length + '/' + sesiWajib + ')</h4><div class="card card-pad-sm stack-sm">' + (d.absensi.length ? d.absensi.map(function (a) { return '<div class="row between small"><span>' + icon('checkCircle', 'ic-sm') + ' ' + esc(a.sesi) + '</span><span class="muted">' + esc(fmtDateTime(a.waktu)) + ' · ' + esc(String(a.metode).split(':')[0]) + '</span></div>'; }).join('') : '<span class="small muted">Belum ada scan.</span>') + '</div>' +
          '<h4 class="mt-24 mb-8">Evaluasi & Sertifikat</h4><div class="card card-pad-sm stack-sm small"><div class="row between"><span>Evaluasi</span>' + (d.evaluasi ? badge('Skor ' + d.evaluasi.rata_rata, 'green') : badge('Belum', 'gray')) + '</div><div class="row between"><span>Sertifikat</span>' + (d.sertifikat ? statusBadge(d.sertifikat.status) + ' <span class="mono xs">' + esc(d.sertifikat.nomor) + '</span>' : badge('Belum', 'gray')) + '</div>' + (d.evaluasi && d.evaluasi.takeaway ? '<p class="muted" style="font-style:italic">“' + esc(d.evaluasi.takeaway) + '”</p>' : '') + '</div>' : '')
      );
      $('.modal-foot', m.el) && $('.modal-foot', m.el).remove();
      $('.drawer', m.el).insertAdjacentHTML('beforeend', '<div class="modal-foot" style="justify-content:space-between"><button class="btn btn-secondary btn-sm" id="d-kode">' + icon('key', 'ic-sm') + ' Reset Kode Akses</button><div class="row">' +
        (p.status_verifikasi === 'ditolak' ? '<button class="btn btn-secondary btn-sm" id="d-reopen">' + icon('refresh', 'ic-sm') + ' Buka Kembali</button>' : '<button class="btn btn-danger btn-sm" id="d-reject">' + icon('xCircle', 'ic-sm') + ' Tolak Pendaftaran</button>') + '</div></div>');

      $$('[data-prev]', m.el).forEach(function (b) { on(b, 'click', function () { previewFile(b.dataset.prev, b.dataset.label); }); });
      $$('[data-ok]', m.el).forEach(function (b) {
        on(b, 'click', function () {
          btnLoading(b, true);
          API.act('verifySyarat', { verifId: b.dataset.ok, status: 'disetujui' }).then(function () { changed = true; render(); }).catch(function (e) { btnLoading(b, false); errToast(e); });
        });
      });
      $$('[data-no]', m.el).forEach(function (b) {
        on(b, 'click', function () {
          confirmDialog({ title: 'Tolak: ' + b.dataset.label, message: 'Pendaftar akan diminta mengunggah ulang berkas ini.', input: 'Alasan / catatan perbaikan', required: true, placeholder: 'mis. Foto buram, nama tidak terbaca', ok: 'Tolak & Minta Perbaikan', danger: true })
            .then(function (note) { if (!note) return; return API.act('verifySyarat', { verifId: b.dataset.no, status: 'ditolak', catatan: note }).then(function () { changed = true; render(); }); }).catch(errToast);
        });
      });
      on($('#d-reject', m.el), 'click', function () {
        confirmDialog({ title: 'Tolak pendaftaran?', message: 'Pendaftar tidak dapat lagi mengunggah berkas. Kuota kursinya akan dilepas.', input: 'Alasan penolakan', required: true, ok: 'Tolak Pendaftaran', danger: true })
          .then(function (note) { if (!note) return; return API.act('setStatusPendaftar', { id: p.id, status: 'ditolak', catatan: note }).then(function () { changed = true; render(); }); }).catch(errToast);
      });
      on($('#d-reopen', m.el), 'click', function () { API.act('setStatusPendaftar', { id: p.id, status: 'buka_kembali' }).then(function () { changed = true; render(); }).catch(errToast); });
      on($('#d-kode', m.el), 'click', function () {
        confirmDialog({ title: 'Reset kode akses?', message: 'Kode lama tidak berlaku. Kode baru akan ditampilkan untuk Anda sampaikan ke pendaftar (dan dikirim via email bila aktif).', ok: 'Reset Kode' }).then(function (ok) {
          if (!ok) return;
          API.call('resetKodePendaftar', { id: p.id }).then(function (r) {
            openModal({ title: 'Kode Akses Baru', body: '<div class="kode-box"><div class="kode">' + esc(r.kode) + '</div><div class="xs" style="color:#adc8f5">' + esc(p.email) + ' · email: ' + esc(r.email) + '</div></div>',
              foot: '<a class="btn btn-accent" target="_blank" rel="noopener" href="' + waLink(p.hp, 'Kode akses baru SIM Event Anda: ' + r.kode) + '">' + icon('message', 'ic-sm') + ' Kirim via WhatsApp</a><button class="btn btn-secondary" data-close>Tutup</button>' });
          }).catch(errToast);
        });
      });
    }).catch(function (e) { m.body('<div class="alert alert-err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>'); });
  };
  render();
}

// --------------------------------------------------------------------------
// PEMBAYARAN
// --------------------------------------------------------------------------
function pageAdminPembayaran(params, query, rid) {
  var state = { status: 'menunggu', q: '', page: 1 };
  return eventScoped('pembayaran', 'Committee Review <span>/</span> <b>Pembayaran</b>', 'Dashboard Pembayaran', 'Konfirmasi bukti transfer peserta. Status lunas otomatis menyetujui syarat pembayaran.', rid, function (list, ev) {
    var load = function () { return API.swr('listPembayaran', { eventId: ev.id }, function (d) { if (Router.alive(rid)) draw(d); }); };
    var draw = function (d) {
      var r = d.ringkasan;
      if (!d.event.biaya && !r.total) {
        $('#scoped').innerHTML = '<div class="card">' + emptyState('wallet', 'Event ini gratis', 'Tidak ada pembayaran yang perlu diverifikasi.') + '</div>';
        return;
      }
      var rows = d.pembayaran.filter(function (b) { return (!state.status || b.status === state.status) && (!state.q || (b.nama + b.email + b.pendaftar_id).toLowerCase().indexOf(state.q) > -1); });
      var pg = paginate(rows, state.page);
      $('#scoped').innerHTML = '<div class="grid-4">' +
        kpiCard('Total Terkonfirmasi', rupiah(r.nominal_lunas), icon('checkCircle', 'ic-sm') + ' ' + num(r.lunas) + ' pembayaran lunas', 'wallet', 'var(--accent-dark)') +
        kpiCard('Menunggu Konfirmasi', num(r.menunggu), icon('clock', 'ic-sm') + ' Bukti sudah diunggah', 'receipt', 'var(--warning)') +
        kpiCard('Belum Bayar', num(r.belum), 'Belum mengunggah bukti', 'inbox') +
        kpiCard('Ditolak', num(r.ditolak), 'Bukti tidak valid', 'xCircle', '#b91c1c') + '</div>' +
        '<div class="toolbar mt-24"><div class="segmented">' + [['menunggu', 'Menunggu'], ['lunas', 'Lunas'], ['belum', 'Belum'], ['ditolak', 'Ditolak'], ['', 'Semua']].map(function (s) { return '<button data-st="' + s[0] + '" class="' + (state.status === s[0] ? 'active' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>' +
        '<div class="input-icon">' + icon('search') + '<input class="input input-soft" id="p-q" placeholder="Cari nama / email…" value="' + esc(state.q) + '"></div>' +
        '<button class="btn btn-secondary" id="p-exp">' + icon('download', 'ic-sm') + ' Ekspor</button></div>' +
        '<div class="card mt-16"><div class="table-wrap"><table class="table"><thead><tr><th>Pendaftar</th><th>Nominal</th><th>Tanggal</th><th>Bukti</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (b) {
          return '<tr><td><div class="cell-name">' + esc(b.nama) + '</div><div class="cell-sub">' + esc(b.email) + '</div></td><td class="nowrap bold">' + rupiah(b.nominal) + '</td><td class="small nowrap">' + esc(fmtDateTime(b.tanggal)) + '</td>' +
            '<td>' + (b.ada_berkas ? '<button class="btn btn-secondary btn-xs" data-prev="' + esc(b.file_id) + '" data-label="Bukti bayar — ' + esc(b.nama) + '">' + icon('eye', 'ic-sm') + ' Lihat</button>' : '<span class="xs muted">—</span>') + '</td>' +
            '<td>' + statusBadge(b.status) + (b.catatan ? '<div class="xs muted mt-8">' + esc(b.catatan) + '</div>' : '') + '</td>' +
            '<td class="right nowrap">' + (b.ada_berkas && b.status !== 'lunas' ? '<button class="btn btn-accent btn-xs" data-lunas="' + esc(b.id) + '" data-nom="' + esc(b.nominal) + '">' + icon('check', 'ic-sm') + ' Lunas</button> ' : '') +
            (b.ada_berkas && b.status !== 'ditolak' ? '<button class="btn btn-danger btn-xs" data-tolak="' + esc(b.id) + '">' + icon('x', 'ic-sm') + ' Tolak</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6">' + emptyState('receipt', 'Tidak ada data pembayaran') + '</td></tr>') +
        '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div></div>';
      $$('[data-st]').forEach(function (b) { on(b, 'click', function () { state.status = b.dataset.st; state.page = 1; draw(d); }); });
      on($('#p-q'), 'change', function () { state.q = this.value.toLowerCase(); state.page = 1; draw(d); });
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; draw(d); }); });
      $$('[data-prev]').forEach(function (b) { on(b, 'click', function () { previewFile(b.dataset.prev, b.dataset.label); }); });
      $$('[data-lunas]').forEach(function (b) {
        on(b, 'click', function () {
          var mm = openModal({ title: 'Konfirmasi Lunas', body: '<div class="field"><label class="label">Nominal diterima (Rp)</label><input class="input" type="number" id="nom" value="' + esc(b.dataset.nom) + '"></div>', foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-accent" id="ok-lunas">' + icon('check', 'ic-sm') + ' Tandai Lunas</button>' });
          on($('#ok-lunas', mm.el), 'click', function () { var bb = this; btnLoading(bb, true); API.act('verifyPembayaran', { id: b.dataset.lunas, status: 'lunas', nominal: $('#nom', mm.el).value }).then(function () { mm.close(); load(); }).catch(function (e) { btnLoading(bb, false); errToast(e); }); });
        });
      });
      $$('[data-tolak]').forEach(function (b) {
        on(b, 'click', function () {
          confirmDialog({ title: 'Tolak pembayaran', message: 'Peserta akan diminta mengunggah ulang bukti pembayaran.', input: 'Alasan', required: true, ok: 'Tolak', danger: true })
            .then(function (note) { if (note) return API.act('verifyPembayaran', { id: b.dataset.tolak, status: 'ditolak', catatan: note }).then(load); }).catch(errToast);
        });
      });
      on($('#p-exp'), 'click', function () { exportCSV('pembayaran-' + ev.kode + '.csv', [['pendaftar_id', 'ID'], ['nama', 'Nama'], ['email', 'Email'], ['nominal', 'Nominal'], ['metode', 'Metode'], ['status', 'Status'], ['tanggal', 'Tanggal'], ['diverifikasi_oleh', 'Diverifikasi Oleh'], ['diverifikasi_at', 'Waktu Verifikasi'], ['catatan', 'Catatan']], d.pembayaran); });
    };
    return load();
  });
}

// --------------------------------------------------------------------------
// CRM LEADS
// --------------------------------------------------------------------------
function pageAdminLeads(params, query, rid) {
  Layout.app(skeleton(4), 'leads');
  var state = { ev: query.event || '', st: '', q: '', page: 1 };
  return API.swr('listLeads', {}, function (d) {
    if (!Router.alive(rid)) return;
    var draw = function () {
      var rows = d.leads.filter(function (l) { return (!state.ev || l.event_id === state.ev) && (!state.st || l.status_leads === state.st) && (!state.q || (l.nama + l.email + l.institusi + l.hp).toLowerCase().indexOf(state.q) > -1); });
      var pg = paginate(rows, state.page);
      var ring = {};
      d.status_list.forEach(function (s) { ring[s] = 0; });
      d.leads.filter(function (l) { return !state.ev || l.event_id === state.ev; }).forEach(function (l) { ring[l.status_leads] = (ring[l.status_leads] || 0) + 1; });
      $('#page').innerHTML = adminHead('SIM Management <span>/</span> <b>CRM Leads</b>', 'CRM Leads Pendaftar', 'Kelola tindak lanjut pendaftar lintas event untuk kebutuhan organisasi.',
        '<button class="btn btn-secondary" id="l-exp">' + icon('download', 'ic-sm') + ' Ekspor Leads</button>') +
        '<div class="grid-4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + d.status_list.map(function (s) {
          return '<button class="card kpi" style="text-align:left;cursor:pointer;' + (state.st === s ? 'outline:2px solid var(--primary)' : '') + '" data-kst="' + s + '"><div class="kpi-label">' + esc(STATUS_LABEL[s][0]) + '</div><div class="kpi-value">' + num(ring[s]) + '</div></button>';
        }).join('') + '</div>' +
        '<div class="split mt-24" style="grid-template-columns:minmax(0,1fr) 280px"><div><div class="toolbar"><div class="input-icon">' + icon('search') + '<input class="input input-soft" id="l-q" placeholder="Cari nama, email, institusi, HP…" value="' + esc(state.q) + '"></div>' +
        '<select class="select input-soft" id="l-ev"><option value="">Semua Event</option>' + d.events.map(function (e) { return '<option value="' + esc(e.id) + '"' + (state.ev === e.id ? ' selected' : '') + '>' + esc(e.nama) + '</option>'; }).join('') + '</select>' +
        (state.st ? '<button class="btn btn-ghost btn-sm" id="l-clear">' + icon('x', 'ic-sm') + ' ' + esc(STATUS_LABEL[state.st][0]) + '</button>' : '') + '</div>' +
        '<div class="card mt-16"><div class="table-wrap"><table class="table"><thead><tr><th>Kontak</th><th>Institusi</th><th>Event</th><th>Verifikasi</th><th>Status Leads</th><th>Catatan</th><th></th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (l) {
          return '<tr><td><div class="cell-name">' + esc(l.nama) + '</div><div class="xs muted">' + esc(l.email) + '</div><div class="xs muted">' + esc(l.hp) + '</div></td><td class="small">' + esc(l.institusi) + '</td><td class="small" style="max-width:180px">' + esc(l.event) + '<div class="xs muted">' + esc(fmtDate(l.tanggal_daftar)) + '</div></td>' +
            '<td>' + statusBadge(l.status_verifikasi) + '</td><td><select class="select" data-lst="' + esc(l.id) + '" style="height:32px;min-width:130px">' + d.status_list.map(function (s) { return '<option value="' + s + '"' + (l.status_leads === s ? ' selected' : '') + '>' + STATUS_LABEL[s][0] + '</option>'; }).join('') + '</select></td>' +
            '<td><input class="input" data-lnote="' + esc(l.id) + '" value="' + esc(l.catatan_leads || '') + '" placeholder="Tambah catatan…" style="height:32px;min-width:160px"></td>' +
            '<td><a class="btn btn-accent btn-xs" target="_blank" rel="noopener" href="' + waLink(l.hp, 'Assalamu\'alaikum ' + l.nama + ', ') + '" title="WhatsApp">' + icon('message', 'ic-sm') + '</a></td></tr>';
        }).join('') : '<tr><td colspan="7">' + emptyState('users', 'Tidak ada leads') + '</td></tr>') + '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div></div></div>' +
        '<aside class="card card-pad stack-sm"><h4>Institusi Teratas</h4>' + (d.institusi_teratas.length ? d.institusi_teratas.map(function (i) {
          var max = d.institusi_teratas[0].jumlah;
          return '<div><div class="row between small"><span class="ellipsis">' + esc(i.nama) + '</span><b>' + i.jumlah + '</b></div><div class="progress mt-8 navy"><span style="width:' + pct(i.jumlah, max) + '%"></span></div></div>';
        }).join('') : '<p class="small muted">Belum ada data.</p>') + '</aside></div>';

      $$('[data-kst]').forEach(function (b) { on(b, 'click', function () { state.st = state.st === b.dataset.kst ? '' : b.dataset.kst; state.page = 1; draw(); }); });
      on($('#l-clear'), 'click', function () { state.st = ''; draw(); });
      on($('#l-q'), 'change', function () { state.q = this.value.toLowerCase(); state.page = 1; draw(); });
      on($('#l-ev'), 'change', function () { state.ev = this.value; state.page = 1; draw(); });
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; draw(); }); });
      var saveLead = function (id) {
        var lead = d.leads.filter(function (l) { return l.id === id; })[0];
        lead.status_leads = $('[data-lst="' + id + '"]').value;
        lead.catatan_leads = $('[data-lnote="' + id + '"]').value;
        API.act('updateLead', { id: id, status_leads: lead.status_leads, catatan_leads: lead.catatan_leads }, { silent: true }).then(function () { toast('Leads ' + lead.nama + ' diperbarui.', 'ok', 1800); }).catch(errToast);
      };
      $$('[data-lst]').forEach(function (s) { on(s, 'change', function () { saveLead(s.dataset.lst); }); });
      $$('[data-lnote]').forEach(function (s) { on(s, 'change', function () { saveLead(s.dataset.lnote); }); });
      on($('#l-exp'), 'click', function () { exportCSV('crm-leads.csv', [['nama', 'Nama'], ['email', 'Email'], ['hp', 'HP'], ['institusi', 'Institusi'], ['event', 'Event'], ['tanggal_daftar', 'Tanggal'], ['status_verifikasi', 'Verifikasi'], ['status_leads', 'Status Leads'], ['catatan_leads', 'Catatan']], rows); });
    };
    draw();
  });
}

// --------------------------------------------------------------------------
// SESI & ABSENSI (QR dinamis)
// --------------------------------------------------------------------------
function hmacCode(secret, message) {
  var enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then(function (key) { return crypto.subtle.sign('HMAC', key, enc.encode(message)); })
    .then(function (sig) { return Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, 8).toUpperCase(); });
}

function openQrStage(sesiId, onClose) {
  var stage = document.createElement('div');
  stage.className = 'qr-stage';
  stage.innerHTML = '<div class="center"><span class="spinner"></span></div>';
  document.body.appendChild(stage);
  var timer = null, poll = null, cfg = null, offset = 0, lastWindow = -1, wakeLock = null;
  var close = function () {
    clearInterval(timer); clearInterval(poll);
    if (wakeLock) try { wakeLock.release(); } catch (e) {}
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    stage.remove(); document.removeEventListener('keydown', escKey);
    if (onClose) onClose();
  };
  var escKey = function (e) { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escKey);
  Router.onLeave(close);

  API.call('getSesiQR', { id: sesiId }).then(function (d) {
    cfg = d; offset = d.serverEpochMs - Date.now();
    if (d.sesi.mode === 'dinamis' && !(window.crypto && crypto.subtle)) throw new Error('QR dinamis memerlukan HTTPS (crypto.subtle). Buka aplikasi lewat https://.');
    stage.innerHTML = '<div class="row between" style="position:absolute;top:calc(16px + env(safe-area-inset-top,0px));left:16px;right:16px"><span class="badge ' + (d.sesi.status === 'buka' ? 'b-green' : 'b-red') + '"><span class="dot"></span>' + (d.sesi.status === 'buka' ? 'Sesi dibuka' : 'Sesi DITUTUP — scan akan ditolak') + '</span>' +
      '<div class="row"><button class="btn btn-light btn-sm" id="qs-fs">' + icon('scan', 'ic-sm') + ' Layar Penuh</button><button class="btn btn-light btn-sm" id="qs-close">' + icon('x', 'ic-sm') + ' Tutup</button></div></div>' +
      '<div class="center"><div class="xs" style="letter-spacing:.14em;color:#adc8f5">' + esc(d.event.nama) + '</div><h2 class="mt-8">' + esc(d.sesi.nama) + '</h2></div>' +
      '<div class="qr-canvas" id="qs-qr"></div>' +
      '<div class="center"><div class="xs" style="color:#adc8f5;letter-spacing:.1em">KODE MANUAL</div><div class="qr-code-text" id="qs-code">········</div></div>' +
      (d.sesi.mode === 'dinamis' ? '<div class="stack-sm" style="align-items:center"><div class="ring"><span id="qs-ring" style="width:100%"></span></div><div class="xs" style="color:#adc8f5" id="qs-left">QR berganti otomatis</div></div>' : '<div class="xs" style="color:#adc8f5">Mode statis — kode tidak berubah</div>') +
      '<div class="row" style="color:#d5e3ff">' + icon('users', 'ic-sm') + ' <b id="qs-hadir">' + num(d.hadir) + '</b>&nbsp;peserta tercatat hadir</div>';
    on($('#qs-close', stage), 'click', close);
    on($('#qs-fs', stage), 'click', function () { if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {}); });
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});

    var draw = function () {
      var nowMs = Date.now() + offset;
      if (cfg.sesi.mode === 'statis') {
        if (lastWindow === -1) { lastWindow = 0; $('#qs-qr', stage).innerHTML = qrSvg('SIMEV|' + cfg.sesi.id + '|' + cfg.kode_statis, 8); $('#qs-code', stage).textContent = cfg.kode_statis; }
        return;
      }
      var rot = cfg.rotasi, w = Math.floor(nowMs / 1000 / rot), left = rot - Math.floor((nowMs / 1000) % rot);
      var ring = $('#qs-ring', stage);
      if (ring) { ring.style.width = (left / rot * 100) + '%'; $('#qs-left', stage).textContent = 'Berganti dalam ' + left + ' detik'; }
      if (w !== lastWindow) {
        lastWindow = w;
        hmacCode(cfg.secret, cfg.sesi.id + ':' + w).then(function (code) {
          if (!document.body.contains(stage)) return;
          $('#qs-qr', stage).innerHTML = qrSvg('SIMEV|' + cfg.sesi.id + '|' + code, 8);
          $('#qs-code', stage).textContent = code;
        });
      }
    };
    draw();
    timer = setInterval(draw, 1000);
    poll = setInterval(function () {
      API.call('getSesiQR', { id: sesiId }, { noRedirect: true }).then(function (x) { offset = x.serverEpochMs - Date.now(); var h = $('#qs-hadir', stage); if (h) h.textContent = num(x.hadir); }).catch(function () {});
    }, 20000);
  }).catch(function (e) {
    stage.innerHTML = '<div class="alert alert-err" style="max-width:480px">' + icon('alertCircle') + '<div>' + esc(e.message) + '<div class="mt-16"><button class="btn btn-secondary btn-sm" id="qs-x">Tutup</button></div></div></div>';
    on($('#qs-x', stage), 'click', close);
  });
}

function pageAdminSesi(params, query, rid) {
  return eventScoped('sesi', 'Pelaksanaan <span>/</span> <b>Sesi & Absensi</b>', 'Sesi & Absensi QR', 'Buka sesi, tampilkan QR dinamis di layar/proyektor, dan pantau kehadiran peserta secara langsung.', rid, function (list, ev) {
    var state = { q: '', page: 1 };
    var load = function () {
      return API.swrAll([['listSesi', { eventId: ev.id }], ['listAbsensi', { eventId: ev.id }]], function (res) {
        if (Router.alive(rid)) draw(res[0], res[1]);
      });
    };
    var draw = function (s, a) {
      var rows = a.peserta.filter(function (p) { return !state.q || (p.nama + p.email + p.id).toLowerCase().indexOf(state.q) > -1; });
      var pg = paginate(rows, state.page, 15);
      $('#scoped').innerHTML =
        '<div class="grid-4">' + kpiCard('Peserta Lolos', num(s.peserta_lolos), 'Berhak absen', 'userCheck') +
        kpiCard('Sesi Wajib', s.event.sesi_wajib + 'x', 'untuk sertifikat', 'layers') +
        kpiCard('Memenuhi Absensi', num(a.ringkasan.memenuhi), pct(a.ringkasan.memenuhi, a.ringkasan.peserta) + '% peserta', 'checkCircle', 'var(--accent-dark)') +
        kpiCard('Rotasi QR', s.rotasi + ' dtk', 'Anti screenshot', 'refresh') + '</div>' +
        '<div class="row between mt-24 mb-16 wrap"><h3>Daftar Sesi</h3><button class="btn btn-primary btn-sm" id="s-add">' + icon('plus', 'ic-sm') + ' Tambah Sesi</button></div>' +
        '<div class="grid-3">' + s.sesi.map(function (x) {
          var open = x.status === 'buka';
          return '<div class="card card-pad stack" style="' + (open ? 'border-color:#86efac;box-shadow:0 0 0 3px rgba(16,185,129,.12)' : '') + '"><div class="row between"><span class="xs muted" style="letter-spacing:.08em">SESI ' + esc(x.urutan) + ' · ' + esc(x.mode.toUpperCase()) + '</span>' + statusBadge(x.status) + '</div>' +
            '<h3>' + esc(x.nama) + '</h3><div class="row between"><span class="small muted">' + (x.dibuka_at ? 'Dibuka ' + esc(fmtDateTime(x.dibuka_at)) : 'Belum pernah dibuka') + '</span><b>' + num(x.hadir) + ' hadir</b></div>' +
            '<div class="progress"><span style="width:' + pct(x.hadir, s.peserta_lolos) + '%"></span></div>' +
            '<div class="row wrap"><button class="btn ' + (open ? 'btn-danger' : 'btn-accent') + ' btn-sm" data-toggle="' + esc(x.id) + '" data-to="' + (open ? 'tutup' : 'buka') + '">' + icon(open ? 'lock' : 'unlock', 'ic-sm') + ' ' + (open ? 'Tutup Sesi' : 'Buka Sesi') + '</button>' +
            '<button class="btn btn-navy btn-sm" data-qr="' + esc(x.id) + '">' + icon('qr', 'ic-sm') + ' Tampilkan QR</button>' +
            '<a class="btn btn-secondary btn-sm" href="#/admin/scanner?sesi=' + esc(x.id) + '" title="Pindai Kartu QR peserta beruntun">' + icon('scan', 'ic-sm') + ' Scanner Kios</a>' +
            '<button class="btn btn-ghost btn-sm btn-icon" data-edit-sesi="' + esc(x.id) + '" title="Edit">' + icon('edit', 'ic-sm') + '</button>' +
            (x.hadir ? '' : '<button class="btn btn-ghost btn-sm btn-icon" data-del-sesi="' + esc(x.id) + '" title="Hapus">' + icon('trash', 'ic-sm') + '</button>') + '</div></div>';
        }).join('') + '</div>' +
        '<div class="alert alert-info mt-16">' + icon('info') + '<div class="small"><b>Cara pakai:</b> klik <b>Buka Sesi</b> saat acara dimulai → <b>Tampilkan QR</b> di proyektor/tablet → peserta scan dari menu Absensi di portal mereka. QR dinamis berganti tiap ' + s.rotasi + ' detik dan dihitung langsung di browser Anda (tetap jalan walau koneksi lambat).</div></div>' +
        '<div class="card mt-24"><div class="card-head"><div><h3>Rekap Kehadiran</h3><p class="small muted">Klik ikon + untuk absen manual (bantuan meja registrasi)</p></div><div class="row wrap"><div class="input-icon" style="min-width:220px">' + icon('search') + '<input class="input" id="a-q" placeholder="Cari peserta…" value="' + esc(state.q) + '"></div><button class="btn btn-secondary btn-sm" id="a-exp">' + icon('download', 'ic-sm') + ' Ekspor</button><button class="btn btn-ghost btn-sm" id="a-ref">' + icon('refresh', 'ic-sm') + '</button></div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th>' + a.sesi.map(function (x) { return '<th>' + esc(x.nama) + '</th>'; }).join('') + '<th>Status</th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (p) {
          return '<tr><td><div class="cell-name">' + esc(p.nama) + '</div><div class="xs muted">' + esc(p.institusi) + '</div></td>' +
            a.sesi.map(function (x) { return '<td>' + (p.sesi[x.id] ? '<span class="badge b-green">' + icon('check', 'ic-sm') + ' ' + esc(fmtTime(p.sesi[x.id])) + '</span>' : '<button class="btn btn-ghost btn-xs" data-manual="' + esc(p.id) + '|' + esc(x.id) + '" data-label="' + esc(p.nama) + ' — ' + esc(x.nama) + '" title="Absen manual">' + icon('plus', 'ic-sm') + '</button>'); }).join('') + '</td>' +
            '<td>' + (p.memenuhi ? badge('Memenuhi', 'green', true) : badge(p.hadir + '/' + a.event.sesi_wajib, 'amber', true)) + '</td></tr>';
        }).join('') : '<tr><td colspan="' + (a.sesi.length + 2) + '">' + emptyState('users', 'Belum ada peserta lolos verifikasi') + '</td></tr>') +
        '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div></div>';

      $$('[data-toggle]').forEach(function (b) { on(b, 'click', function () { btnLoading(b, true); API.act('toggleSesi', { id: b.dataset.toggle, status: b.dataset.to }).then(load).catch(function (e) { btnLoading(b, false); errToast(e); }); }); });
      $$('[data-qr]').forEach(function (b) { on(b, 'click', function () { openQrStage(b.dataset.qr, load); }); });
      $$('[data-del-sesi]').forEach(function (b) { on(b, 'click', function () { confirmDialog({ title: 'Hapus sesi?', message: 'Sesi tanpa data absensi akan dihapus permanen.', ok: 'Hapus', danger: true }).then(function (ok) { if (ok) API.act('deleteSesi', { id: b.dataset.delSesi }).then(load).catch(errToast); }); }); });
      var sesiModal = function (x) {
        var mm = openModal({ title: x ? 'Edit Sesi' : 'Tambah Sesi', body: '<div class="stack"><div class="field"><label class="label">Nama sesi</label><input class="input" id="sn" value="' + esc(x ? x.nama : '') + '" placeholder="mis. Absen Sesi Siang"></div>' +
          '<div class="grid-2"><div class="field"><label class="label">Urutan</label><input class="input" type="number" id="su" value="' + esc(x ? x.urutan : s.sesi.length + 1) + '"></div><div class="field"><label class="label">Mode QR</label><select class="select" id="sm"><option value="dinamis"' + (!x || x.mode === 'dinamis' ? ' selected' : '') + '>Dinamis (berganti)</option><option value="statis"' + (x && x.mode === 'statis' ? ' selected' : '') + '>Statis (tetap)</option></select></div></div>' +
          '<p class="xs muted">Mode statis cocok untuk QR yang dicetak; dinamis lebih aman dari titip absen.</p></div>',
          foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="ss">Simpan</button>' });
        on($('#ss', mm.el), 'click', function () { var bb = this; btnLoading(bb, true); API.act('saveSesi', { id: x ? x.id : '', eventId: ev.id, nama: $('#sn', mm.el).value, urutan: $('#su', mm.el).value, mode: $('#sm', mm.el).value }).then(function () { mm.close(); load(); }).catch(function (e) { btnLoading(bb, false); errToast(e); }); });
      };
      on($('#s-add'), 'click', function () { sesiModal(null); });
      $$('[data-edit-sesi]').forEach(function (b) { on(b, 'click', function () { sesiModal(s.sesi.filter(function (x) { return x.id === b.dataset.editSesi; })[0]); }); });
      $$('[data-manual]').forEach(function (b) {
        on(b, 'click', function () {
          var parts = b.dataset.manual.split('|');
          confirmDialog({ title: 'Absen manual', message: 'Catat kehadiran: ' + b.dataset.label + '? Tindakan ini tercatat atas nama Anda.', ok: 'Catat Hadir' }).then(function (ok) { if (ok) API.act('manualAbsensi', { pendaftarId: parts[0], sesiId: parts[1] }).then(load).catch(errToast); });
        });
      });
      on($('#a-q'), 'change', function () { state.q = this.value.toLowerCase(); state.page = 1; draw(s, a); });
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; draw(s, a); }); });
      on($('#a-ref'), 'click', load);
      on($('#a-exp'), 'click', function () {
        exportCSV('absensi-' + ev.kode + '.csv', [['nama', 'Nama'], ['email', 'Email'], ['institusi', 'Institusi']].concat(a.sesi.map(function (x) { return [function (p) { return p.sesi[x.id] || ''; }, x.nama]; })).concat([['hadir', 'Jumlah Hadir'], [function (p) { return p.memenuhi ? 'Memenuhi' : 'Belum'; }, 'Status']]), a.peserta);
      });
    };
    return load();
  });
}

// --------------------------------------------------------------------------
// EVALUASI (laporan)
// --------------------------------------------------------------------------
function pageAdminEvaluasi(params, query, rid) {
  return eventScoped('evaluasi', 'Pelaksanaan <span>/</span> <b>Evaluasi</b>', 'Hasil Evaluasi Event', 'Rekap penilaian peserta untuk kalibrasi materi, pembicara, dan operasional.', rid, function (list, ev) {
    return API.swr('listEvaluasi', { eventId: ev.id }, function (d) {
      if (!Router.alive(rid)) return;
      var labels = { kualitas: 'Kualitas event', materi: 'Materi & pembicara', workshop: 'Praktik / diskusi', registrasi: 'Registrasi & check-in', audio: 'Audio visual', portal: 'Portal & scan absensi' };
      var rekLabel = { pasti: 'Pasti', mungkin: 'Mungkin', ragu: 'Ragu-ragu', tidak: 'Tidak' };
      var nps = d.total ? Math.round((d.rekomendasi.pasti - d.rekomendasi.ragu - d.rekomendasi.tidak) / d.total * 100) : 0;
      $('#scoped').innerHTML = '<div class="grid-4">' + kpiCard('Evaluasi Masuk', num(d.total), 'responden', 'clipboard') + kpiCard('Skor Rata-rata', d.rata_rata ? d.rata_rata + '<small> / 5</small>' : '-', '★'.repeat(Math.round(d.rata_rata)), 'star', '#f59e0b') +
        kpiCard('Pasti Merekomendasikan', pct(d.rekomendasi.pasti, d.total) + '%', num(d.rekomendasi.pasti) + ' responden', 'thumbsUp', 'var(--accent-dark)') + kpiCard('Indeks Rekomendasi', (nps > 0 ? '+' : '') + nps, 'pasti − (ragu + tidak)', 'activity') + '</div>' +
        '<div class="grid-2 mt-24" style="gap:24px"><div class="card card-pad stack"><h3>Nilai per Aspek</h3>' + Object.keys(labels).map(function (k) {
          var v = d.per_pertanyaan[k] || 0;
          return '<div class="hbar"><span class="small">' + labels[k] + '</span><div class="progress lg ' + (v >= 4 ? '' : 'navy') + '"><span style="width:' + (v / 5 * 100) + '%"></span></div><b class="small right">' + v.toFixed(2) + '</b></div>';
        }).join('') + '</div>' +
        '<div class="card card-pad stack"><h3>Rekomendasi</h3><div class="row wrap" style="gap:20px">' + donut([{ value: d.rekomendasi.pasti, color: '#10b981' }, { value: d.rekomendasi.mungkin, color: '#1e3a5f' }, { value: d.rekomendasi.ragu, color: '#f59e0b' }, { value: d.rekomendasi.tidak, color: '#ef4444' }], 140) +
        '<div class="legend">' + [['pasti', '#10b981'], ['mungkin', '#1e3a5f'], ['ragu', '#f59e0b'], ['tidak', '#ef4444']].map(function (x) { return '<div><i style="background:' + x[1] + '"></i>' + rekLabel[x[0]] + ' <b>' + d.rekomendasi[x[0]] + '</b></div>'; }).join('') + '</div></div></div></div>' +
        '<div class="card mt-24"><div class="card-head"><div><h3>Umpan Balik Kualitatif</h3><p class="small muted">Ikon kutip menandakan peserta mengizinkan kutipan anonim.</p></div><button class="btn btn-secondary btn-sm" id="e-exp">' + icon('download', 'ic-sm') + ' Ekspor</button></div><div class="card-body stack">' +
        (d.evaluasi.length ? d.evaluasi.slice().reverse().map(function (x) {
          return '<div class="q-box"><div class="row between wrap"><div class="row"><span class="avatar avatar-soft">' + esc(initials(x.nama)) + '</span><div><b class="small">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.institusi) + ' · ' + esc(fmtDateTime(x.tanggal)) + '</div></div></div><div class="row">' + (x.izin_kutip ? badge('Boleh dikutip', 'blue') : '') + badge('★ ' + x.rata_rata, 'amber') + '</div></div>' +
            '<p class="mt-8" style="font-style:italic">“' + esc(x.takeaway) + '”</p>' + (x.saran ? '<p class="small muted mt-8"><b>Saran:</b> ' + esc(x.saran) + '</p>' : '') + '</div>';
        }).join('') : emptyState('star', 'Belum ada evaluasi', 'Evaluasi terbuka bagi peserta yang memenuhi absensi.')) + '</div></div>';
      on($('#e-exp'), 'click', function () {
        exportCSV('evaluasi-' + ev.kode + '.csv', [['nama', 'Nama'], ['institusi', 'Institusi'], ['tanggal', 'Tanggal'], ['rata_rata', 'Rata-rata']].concat(Object.keys(labels).map(function (k) { return [function (x) { return (x.jawaban.rating || {})[k] || (x.jawaban.logistik || {})[k] || ''; }, labels[k]]; })).concat([[function (x) { return rekLabel[x.jawaban.rekomendasi]; }, 'Rekomendasi'], ['takeaway', 'Pembelajaran'], ['saran', 'Saran'], [function (x) { return x.izin_kutip ? 'ya' : 'tidak'; }, 'Izin Kutip']]), d.evaluasi);
      });
    });
  });
}

// --------------------------------------------------------------------------
// SERTIFIKAT
// --------------------------------------------------------------------------
function pageAdminSertifikat(params, query, rid) {
  var tab = query.tab === 'desain' ? 'desain' : 'daftar';
  return eventScoped('sertifikat', 'Pelaksanaan <span>/</span> <b>Sertifikat</b>', 'Sertifikat Peserta', 'Desain sertifikat per event, lalu terbitkan PDF (persis pratinjau) dan kirim ke email peserta.', rid, function (list, ev) {
    var state = { q: '', page: 1, running: false, stop: false };
    var tabs = function () {
      return '<div class="tabs-line"><button data-tab="daftar" class="' + (tab === 'daftar' ? 'active' : '') + '">' + icon('list', 'ic-sm') + ' Daftar & Kirim</button><button data-tab="desain" class="' + (tab === 'desain' ? 'active' : '') + '">' + icon('edit', 'ic-sm') + ' Desain Sertifikat</button></div>';
    };
    var bindTabs = function () {
      $$('[data-tab]').forEach(function (b) { on(b, 'click', function () { if (state.running) return toast('Tunggu proses PDF selesai.', 'warn'); tab = b.dataset.tab; history.replaceState(null, '', '#/admin/sertifikat?tab=' + tab); render(); }); });
    };
    var render = function () { return tab === 'desain' ? renderDesain() : renderDaftar(); };

    // ------------------------- DAFTAR & KIRIM -------------------------
    var renderDaftar = function () {
      return API.swr('listSertifikat', { eventId: ev.id }, function (d) {
        if (!Router.alive(rid) || tab !== 'daftar' || state.running) return;
        drawDaftar(d);
      });
    };
    var rowData = function (assets, x) { return CertDesign.data(assets, { nama: x.nama, institusi: x.institusi, nomor: x.nomor, tanggal_terbit: x.tanggal_terbit }); };
    var drawDaftar = function (d) {
      var r = d.ringkasan;
      var rows = d.sertifikat.filter(function (x) { return !state.q || (x.nama + x.nomor + x.email).toLowerCase().indexOf(state.q) > -1; });
      var pg = paginate(rows, state.page);
      $('#scoped').innerHTML = tabs() + '<div class="grid-4">' +
        kpiCard('Siap Diterbitkan', num(r.siap_dibuat), 'lolos + hadir + evaluasi', 'sparkle', r.siap_dibuat ? 'var(--warning)' : '') +
        kpiCard('Nomor Terbit', num(r.total), 'tercatat & bisa diverifikasi', 'award', 'var(--accent-dark)') +
        kpiCard('PDF Terarsip', num(r.pdf), r.belum_pdf ? r.belum_pdf + ' belum dibuat' : 'lengkap', 'fileText', r.belum_pdf ? 'var(--warning)' : 'var(--accent-dark)') +
        kpiCard('Email Terkirim', num(r.terkirim), 'lampiran PDF', 'mail') + '</div>' +
        '<div class="toolbar mt-24"><div class="input-icon">' + icon('search') + '<input class="input input-soft" id="c-q" placeholder="Cari nama / nomor / email" value="' + esc(state.q) + '"></div>' +
        (r.siap_dibuat ? '<button class="btn btn-secondary" id="c-gen">' + icon('sparkle', 'ic-sm') + ' Terbitkan Nomor (' + r.siap_dibuat + ')</button>' : '') +
        '<button class="btn btn-primary" id="c-pdf"' + (r.belum_pdf ? '' : ' disabled') + '>' + icon('send', 'ic-sm') + ' Buat & Kirim PDF (' + r.belum_pdf + ')</button>' +
        '<button class="btn btn-ghost" id="c-redo"' + (r.total ? '' : ' disabled') + ' title="Buat ulang PDF semua peserta dengan desain terbaru">' + icon('refresh', 'ic-sm') + ' Buat Ulang Semua</button></div>' +
        '<div id="c-prog" class="mt-16"></div>' +
        '<div class="card mt-16"><div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Nomor</th><th>PDF</th><th>Email</th><th class="right">Aksi</th></tr></thead><tbody>' +
        (pg.items.length ? pg.items.map(function (x) {
          return '<tr><td><div class="cell-name">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.email) + '</div></td><td class="mono nowrap">' + esc(x.nomor) + '<div class="xs muted">' + esc(fmtDate(x.tanggal_terbit)) + '</div></td>' +
            '<td>' + (x.ada_pdf ? badge('Terarsip', 'green', true) : badge('Belum', 'amber', true)) + '</td>' +
            '<td class="xs">' + (x.status_email === 'terkirim' ? badge('Terkirim', 'blue') : esc(x.status_email || '-')) + '</td>' +
            '<td class="right nowrap"><button class="btn btn-secondary btn-xs" data-view="' + esc(x.id) + '" title="Pratinjau">' + icon('eye', 'ic-sm') + '</button> ' +
            '<button class="btn btn-secondary btn-xs" data-dl="' + esc(x.id) + '" title="Unduh PDF">' + icon('download', 'ic-sm') + '</button> ' +
            '<button class="btn btn-secondary btn-xs" data-one="' + esc(x.id) + '" title="' + (x.ada_pdf ? 'Buat ulang & kirim ulang' : 'Buat PDF & kirim') + '">' + icon('send', 'ic-sm') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="5">' + emptyState('award', 'Belum ada sertifikat', 'Nomor sertifikat terbit otomatis saat peserta mengirim evaluasi.') + '</td></tr>') +
        '</tbody></table></div><div class="card-foot">' + pagerHtml(pg) + '</div></div>';
      bindTabs();
      var find = function (id) { return d.sertifikat.filter(function (x) { return x.id === id; })[0]; };
      on($('#c-q'), 'change', function () { state.q = this.value.toLowerCase(); state.page = 1; drawDaftar(d); });
      $$('[data-page]').forEach(function (b) { on(b, 'click', function () { state.page = +b.dataset.page; drawDaftar(d); }); });
      on($('#c-gen'), 'click', function () { var b = this; btnLoading(b, true); API.act('generateSertifikat', { eventId: ev.id }).then(renderDaftar).catch(function (e) { btnLoading(b, false); errToast(e); }); });
      $$('[data-view]').forEach(function (b) {
        on(b, 'click', function () {
          var x = find(b.dataset.view);
          var m = openModal({ title: 'Pratinjau — ' + x.nama, size: 'xl', body: '<div id="pv-host"><div class="skel" style="aspect-ratio:1123/794"></div></div>' });
          CertAssets.get(ev.id, d.desainVersi).then(function (a) { CertDesign.mount($('#pv-host', m.el), rowData(a, x)); }).catch(errToast);
        });
      });
      $$('[data-dl]').forEach(function (b) {
        on(b, 'click', function () {
          var x = find(b.dataset.dl); btnLoading(b, true);
          CertAssets.get(ev.id, d.desainVersi).then(function (a) { var dd = rowData(a, x); return CertDesign.toPdf(dd).then(function (blob) { downloadBlob(blob, CertDesign.fileName(dd)); }); })
            .catch(errToast).then(function () { btnLoading(b, false); });
        });
      });
      var runPdf = function (targets, kirimUlang) {
        if (!targets.length) return;
        state.running = true; state.stop = false;
        var done = 0, gagal = 0, sent = 0, idx = 0;
        var prog = function () {
          $('#c-prog').innerHTML = '<div class="card card-pad-sm stack-sm"><div class="row between wrap"><b>' + icon('fileText', 'ic-sm') + ' Membuat PDF & mengirim… ' + done + '/' + targets.length + '</b><span class="small muted">' + sent + ' email terkirim' + (gagal ? ' · ' + gagal + ' gagal' : '') + '</span><button class="btn btn-danger btn-xs" id="c-stop">Hentikan</button></div>' +
            '<div class="progress lg navy"><span style="width:' + pct(done, targets.length) + '%"></span></div><p class="xs muted">PDF dirender di browser ini (identik pratinjau) — biarkan halaman tetap terbuka.</p></div>';
          on($('#c-stop'), 'click', function () { state.stop = true; });
        };
        prog();
        CertAssets.get(ev.id, d.desainVersi).then(function (a) {
          var worker = function () {
            if (state.stop || idx >= targets.length || !Router.alive(rid)) return Promise.resolve();
            var x = targets[idx++];
            return CertDesign.toPdf(rowData(a, x)).then(CertDesign.blobToBase64).then(function (b64) {
              return API.call('uploadSertifikatPdf', { sertId: x.id, base64: b64, kirimUlang: !!kirimUlang }, { timeout: 120000 });
            }).then(function (res) { if (res.status_email === 'terkirim') sent++; }, function () { gagal++; })
              .then(function () { done++; if ($('#c-prog')) prog(); return worker(); });
          };
          return Promise.all([worker(), worker()]); // 2 paralel: cepat tanpa membebani kuota
        }).catch(errToast).then(function () {
          state.running = false;
          toast(done + ' PDF sertifikat diproses, ' + sent + ' email terkirim' + (gagal ? ', ' + gagal + ' gagal' : '') + '.', gagal ? 'warn' : 'ok', 6000);
          if (Router.alive(rid)) renderDaftar();
        });
      };
      on($('#c-pdf'), 'click', function () { runPdf(d.sertifikat.filter(function (x) { return !x.ada_pdf; }), false); });
      on($('#c-redo'), 'click', function () {
        confirmDialog({ title: 'Buat ulang semua PDF?', message: 'PDF seluruh ' + d.sertifikat.length + ' peserta dibuat ulang dengan desain terbaru dan dikirim ulang ke email masing-masing (memakai kuota email).', ok: 'Buat Ulang & Kirim' })
          .then(function (ok) { if (ok) runPdf(d.sertifikat.slice(), true); });
      });
      $$('[data-one]').forEach(function (b) { on(b, 'click', function () { var x = find(b.dataset.one); runPdf([x], x.ada_pdf); }); });
    };

    // ------------------------- DESAIN -------------------------
    var renderDesain = function () {
      $('#scoped').innerHTML = tabs() + skeleton(2);
      bindTabs();
      return CertAssets.get(ev.id).then(function (assets) {
        if (!Router.alive(rid) || tab !== 'desain') return;
        var A = JSON.parse(JSON.stringify(assets));
        var sample = { nama: 'Khoirul Fajar', institusi: 'STIS Al Wafa', nomor: String(A.desain && ev.kode ? 'SIMEV/' + ev.kode + '/' + String(ev.tanggal_mulai || '').slice(0, 4) + '/0001' : ''), tanggal_terbit: '' };
        var ds = A.desain;
        var slot = function (jenis, label, hint) {
          var uri = A.aset[jenis];
          return '<div class="field"><label class="label">' + label + '</label><div class="asset-slot"><span class="asset-thumb" id="th-' + jenis + '" style="background-image:' + (uri ? 'url(' + uri + ')' : 'none') + '"></span>' +
            '<div class="grow xs muted">' + hint + '</div>' +
            '<label class="btn btn-secondary btn-xs" style="position:relative;overflow:hidden">' + icon('upload', 'ic-sm') + ' ' + (uri ? 'Ganti' : 'Unggah') + '<input type="file" accept="image/png,image/jpeg,image/webp" data-asset="' + jenis + '" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
            (uri ? '<button class="btn btn-ghost btn-xs" data-del-asset="' + jenis + '" title="Hapus">' + icon('trash', 'ic-sm') + '</button>' : '') + '</div></div>';
        };
        var tx = function (k, label, ph) { return '<div class="field"><label class="label">' + label + '</label><input class="input" data-ds="' + k + '" value="' + esc(ds[k] || '') + '" placeholder="' + esc(ph || '') + '"></div>'; };
        $('#scoped').innerHTML = tabs() + '<div class="design-grid"><div class="stack" style="position:sticky;top:80px">' +
          '<div class="card card-pad"><div class="row between mb-16"><div><h3>Pratinjau Langsung</h3><p class="small muted">Tampilan ini = PDF yang diunduh & dikirim ke peserta (A4 landscape).</p></div><span id="ds-versi">' + badge('Versi ' + ds.versi, 'gray') + '</span></div><div id="dz-prev"></div></div>' +
          '<div class="alert alert-info small">' + icon('info', 'ic-sm') + '<span>Tanda tangan paling bagus berupa <b>PNG latar transparan</b> (±800×300 px). Background ideal <b>A4 landscape 2246×1588 px</b>; atur <i>kecerahan lapisan</i> agar teks tetap terbaca.</span></div></div>' +
          '<div class="card card-pad stack"><h3>Pengaturan Desain</h3>' +
          '<div class="grid-2" style="gap:10px">' + tx('penerbit', 'Nama penerbit') + tx('subjudul', 'Sub-judul penerbit') + '</div>' +
          slot('logo', 'Logo lembaga', 'PNG transparan, kotak. Kosong = ikon bawaan.') +
          '<div class="grid-2" style="gap:10px">' + tx('judul', 'Judul sertifikat') + tx('pengantar', 'Kalimat pengantar') + '</div>' +
          '<div class="field"><label class="label"><span>Deskripsi</span><span class="xs muted">{institusi} {sesi} {event} {tanggal} {nama} {kategori}</span></label><textarea class="textarea" rows="3" data-ds="deskripsi">' + esc(ds.deskripsi) + '</textarea></div>' +
          '<div class="grid-2" style="gap:10px">' + tx('kategori', 'Kategori / predikat') + '<div class="field"><label class="label">Warna utama</label><input type="color" class="input" data-ds="warna" value="' + esc(ds.warna) + '" style="padding:4px;height:42px"></div></div>' +
          '<div class="divider" style="margin:4px 0"></div><h4>Background</h4>' + slot('bg', 'Gambar background event', 'JPG/PNG. Dipotong otomatis memenuhi A4.') +
          '<div class="field" id="ov-field"' + (A.aset.bg ? '' : ' hidden') + '><label class="label"><span>Kecerahan lapisan putih</span><b id="ov-val">' + Math.round(ds.overlay * 100) + '%</b></label><input type="range" min="0" max="100" step="5" value="' + Math.round(ds.overlay * 100) + '" data-ds="overlay"></div>' +
          '<div class="divider" style="margin:4px 0"></div><h4>Penandatangan</h4>' +
          [0, 1].map(function (i) {
            return '<div class="q-box stack-sm"><b class="small">Pejabat ' + (i + 1) + '</b><div class="grid-2" style="gap:8px"><input class="input" data-ttd="' + i + '" data-f="nama" value="' + esc(ds.ttd[i].nama) + '" placeholder="Nama & gelar"><input class="input" data-ttd="' + i + '" data-f="jabatan" value="' + esc(ds.ttd[i].jabatan) + '" placeholder="Jabatan"></div>' +
              slot('ttd' + (i + 1), 'Tanda tangan (PNG)', 'Kosong = coretan dekoratif.') + '</div>';
          }).join('') +
          '<button class="btn btn-primary btn-lg btn-block" id="ds-save">' + icon('check') + ' Simpan Desain</button></div></div>';
        bindTabs();

        var preview = debounce(function () { if ($('#dz-prev')) CertDesign.mount($('#dz-prev'), CertDesign.data(A, sample)); }, 120);
        CertDesign.mount($('#dz-prev'), CertDesign.data(A, sample));
        $$('[data-ds]').forEach(function (el) {
          on(el, 'input', function () {
            var k = el.dataset.ds;
            ds[k] = k === 'overlay' ? Number(el.value) / 100 : el.value;
            if (k === 'overlay') $('#ov-val').textContent = el.value + '%';
            preview();
          });
        });
        $$('[data-ttd]').forEach(function (el) { on(el, 'input', function () { ds.ttd[+el.dataset.ttd][el.dataset.f] = el.value; preview(); }); });
        var opts = { bg: { max: 2400, format: 'jpeg' }, logo: { max: 600, format: 'png' }, ttd1: { max: 900, format: 'png' }, ttd2: { max: 900, format: 'png' } };
        var afterAsset = function (jenis, uri, versi) {
          A.aset[jenis] = uri; ds.versi = versi; CertAssets.clear();
          var th = $('#th-' + jenis); if (th) th.style.backgroundImage = uri ? 'url(' + uri + ')' : 'none';
          if (jenis === 'bg') $('#ov-field').hidden = !uri;
          preview();
        };
        $$('[data-asset]').forEach(function (inp) {
          on(inp, 'change', function () {
            var f = inp.files[0], jenis = inp.dataset.asset; if (!f) return;
            prepareImage(f, opts[jenis]).then(function (img) {
              afterAsset(jenis, img.dataUri, ds.versi); // pratinjau instan (optimistic)
              return API.act('uploadCertAsset', { eventId: ev.id, jenis: jenis, file: img });
            }).then(function (res) { ds.versi = res.data.versi; CertAssets.clear(); $('#ds-versi').innerHTML = badge('Versi ' + ds.versi, 'gray'); }).catch(function (e) { errToast(e); renderDesain(); });
          });
        });
        $$('[data-del-asset]').forEach(function (b) {
          on(b, 'click', function () {
            var jenis = b.dataset.delAsset;
            afterAsset(jenis, '', ds.versi);
            API.act('uploadCertAsset', { eventId: ev.id, jenis: jenis }).then(function () { renderDesain(); }).catch(errToast);
          });
        });
        on($('#ds-save'), 'click', function () {
          var b = this; btnLoading(b, true, 'Menyimpan…');
          API.act('saveCertDesign', { eventId: ev.id, judul: ds.judul, pengantar: ds.pengantar, penerbit: ds.penerbit, subjudul: ds.subjudul, kategori: ds.kategori, deskripsi: ds.deskripsi, warna: ds.warna, overlay: ds.overlay, ttd: ds.ttd })
            .then(function (res) { CertAssets.clear(); btnLoading(b, false); if (res.data) { ds.versi = res.data.versi; $('#ds-versi').innerHTML = badge('Versi ' + ds.versi, 'gray'); } toast('PDF yang sudah terarsip memakai desain lama — gunakan "Buat Ulang Semua" bila perlu.', 'warn', 6000); })
            .catch(function (e) { btnLoading(b, false); errToast(e); });
        });
      }).catch(function (e) { $('#scoped').innerHTML = tabs() + '<div class="alert alert-err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>'; bindTabs(); });
    };

    return render();
  });
}

// --------------------------------------------------------------------------
// SCANNER KIOS — panitia memindai Kartu QR peserta beruntun (tanpa antre)
// --------------------------------------------------------------------------
function beep(ok) {
  try {
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    beep.ctx = beep.ctx || new C();
    var o = beep.ctx.createOscillator(), g = beep.ctx.createGain();
    o.frequency.value = ok ? 1150 : 320; o.type = 'sine';
    g.gain.setValueAtTime(0.18, beep.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, beep.ctx.currentTime + (ok ? 0.12 : 0.3));
    o.connect(g); g.connect(beep.ctx.destination); o.start(); o.stop(beep.ctx.currentTime + (ok ? 0.13 : 0.32));
  } catch (e) {}
}

function pageAdminScanner(params, query, rid) {
  return eventScoped('scanner', 'Pelaksanaan <span>/</span> <b>Scanner Kios</b>', 'Scanner Kios Absensi', 'Pindai Kartu QR peserta secara beruntun — setiap scan tampil instan, data dikirim per batch di latar.', rid, function (list, ev) {
    return API.swr('listSesi', { eventId: ev.id }, function (sd) {
      if (!Router.alive(rid) || $('#kios-root')) return;
      if (!sd.sesi.length) { $('#scoped').innerHTML = '<div class="card">' + emptyState('qr', 'Belum ada sesi', 'Tambahkan sesi di menu Sesi & Absensi.') + '</div>'; return; }
      var sesiId = query.sesi && sd.sesi.some(function (x) { return x.id === query.sesi; }) ? query.sesi : ((sd.sesi.filter(function (x) { return x.status === 'buka'; })[0] || sd.sesi[0]).id);
      var qKey = 'kios_q_' + sesiId;
      var queue = Store.get(qKey, []);
      var roster = {}, rosterList = [], logItems = [], inflight = false, sendTimer = null, cooldown = {};
      var stream = null, loop = null, detector = null;

      $('#scoped').innerHTML = '<div id="kios-root" class="split" style="grid-template-columns:minmax(0,1fr) 360px"><div class="stack">' +
        '<div class="card card-pad"><div class="row between wrap mb-16"><div class="field" style="min-width:220px"><label class="label">Sesi</label><select class="select" id="k-sesi">' +
        sd.sesi.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === sesiId ? ' selected' : '') + '>' + esc(x.nama) + ' · ' + (x.status === 'buka' ? 'Dibuka' : 'Ditutup') + '</option>'; }).join('') + '</select></div>' +
        '<div class="row wrap"><div class="center"><div class="kpi-value" id="k-hadir" style="margin:0">–</div><div class="xs muted">hadir</div></div><div class="center"><div class="kpi-value" id="k-q" style="margin:0;color:var(--warning)">' + queue.length + '</div><div class="xs muted">antrean kirim</div></div></div></div>' +
        '<div class="scanner" id="k-scan" style="aspect-ratio:16/10"><video id="k-cam" playsinline muted autoplay hidden></video><canvas id="k-cv" hidden></canvas>' +
        '<div class="scan-frame" id="k-frame" hidden><i></i><i></i><i></i><i></i><div class="scan-line"></div></div>' +
        '<div class="scan-idle" id="k-idle"><div class="qr-ic">' + icon('idCard', 'ic-xl') + '</div><div class="bold" style="font-size:16px">Mode Kios Siap</div><p class="small" style="color:#adc8f5;margin-top:4px">Peserta cukup menunjukkan Kartu QR dari portal — pindai beruntun tanpa jeda.</p><button class="btn btn-light btn-lg mt-16" id="k-start">' + icon('camera', 'ic-sm') + ' Mulai Scanner</button></div>' +
        '<div id="k-flash"></div><div class="scan-pill" id="k-pill" hidden><span class="pulse"></span> Memindai beruntun…</div></div>' +
        '<div class="row wrap mt-16"><select class="select" id="k-camsel" style="flex:1 1 220px"><option value="">Kamera belakang (default)</option></select><button class="btn btn-secondary" id="k-stop" hidden>' + icon('x', 'ic-sm') + ' Matikan</button><button class="btn btn-secondary" id="k-full">' + icon('scan', 'ic-sm') + ' Layar Penuh</button></div></div>' +
        '<div class="card card-pad stack-sm"><b>' + icon('keyboard', 'ic-sm') + ' Absen manual (peserta tanpa HP)</b><div class="input-icon">' + icon('search') + '<input class="input" id="k-find" placeholder="Ketik nama peserta…" autocomplete="off"></div><div id="k-found" class="stack-sm"></div></div>' +
        '</div><aside class="card" style="position:sticky;top:80px"><div class="card-head"><div><h3>Riwayat Scan</h3><p class="small muted" id="k-net">Siap</p></div><button class="btn btn-ghost btn-sm" id="k-sync" title="Kirim sekarang">' + icon('refresh', 'ic-sm') + '</button></div><div class="kios-log" id="k-log"><p class="small muted" style="padding:14px">Belum ada scan.</p></div></aside></div>';

      var setQ = function () { Store.set(qKey, queue); var el = $('#k-q'); if (el) el.textContent = queue.length; };
      var hadirCount = function () { return rosterList.filter(function (p) { return p.hadir; }).length; };
      var drawStats = function () { var el = $('#k-hadir'); if (el) el.textContent = hadirCount() + '/' + rosterList.length; };
      var drawLog = function () {
        var el = $('#k-log'); if (!el) return;
        el.innerHTML = logItems.length ? logItems.slice(0, 60).map(function (l) {
          var st = { kirim: badge('Mengirim', 'amber'), ok: badge('Tercatat', 'green', true), dup: badge('Sudah hadir', 'blue'), err: badge(l.pesan || 'Ditolak', 'red') }[l.st];
          return '<div class="kios-row"><span class="avatar avatar-soft">' + esc(initials(l.nama)) + '</span><div class="grow" style="min-width:0"><div class="bold ellipsis">' + esc(l.nama) + '</div><div class="xs muted">' + esc(l.jam) + (l.manual ? ' · manual' : '') + '</div></div>' + st + '</div>';
        }).join('') : '<p class="small muted" style="padding:14px">Belum ada scan.</p>';
      };
      var flash = function (kind, nama, sub) {
        var el = $('#k-flash'); if (!el) return;
        el.innerHTML = '<div class="kios-flash ' + kind + '">' + icon(kind === 'ok' ? 'checkCircle' : kind === 'dup' ? 'info' : 'xCircle', 'ic-xl') + '<div class="kn">' + esc(nama) + '</div><div class="small">' + esc(sub) + '</div></div>';
        beep(kind === 'ok'); if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? 60 : [60, 40, 60]);
        clearTimeout(flash.t); flash.t = setTimeout(function () { if ($('#k-flash')) $('#k-flash').innerHTML = ''; }, kind === 'ok' ? 650 : 1200);
      };
      var nowStr = function () { var d = new Date(); var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };

      var enqueue = function (pid, payload, manual) {
        var p = roster[pid];
        var nama = p ? p.nama : 'Peserta ' + pid.slice(-5);
        if (p && p.hadir) { flash('dup', nama, 'Sudah tercatat hadir ' + fmtTime(p.hadir)); logItems.unshift({ nama: nama, jam: new Date().toTimeString().slice(0, 5), st: 'dup', manual: manual }); drawLog(); return; }
        if (!p) { flash('err', 'Tidak dikenal', 'Bukan peserta lolos event ini'); return; }
        // Optimistic: tandai hadir seketika, kirim di latar
        var item = { clientId: 'k' + Date.now() + Math.random().toString(36).slice(2, 6), waktu: nowStr(), nama: nama };
        if (payload) item.payload = payload; else { item.pid = pid; item.manual = true; }
        p.hadir = item.waktu;
        queue.push(item); setQ();
        logItems.unshift({ id: item.clientId, nama: nama, jam: item.waktu.slice(11, 16), st: 'kirim', manual: manual });
        flash('ok', nama, p.institusi || 'Hadir');
        drawStats(); drawLog();
        scheduleSend(250);
      };

      var scheduleSend = function (ms) { clearTimeout(sendTimer); sendTimer = setTimeout(send, ms); };
      var send = function () {
        if (inflight || !queue.length || !Router.alive(rid)) return;
        inflight = true;
        var batch = queue.slice(0, 40);
        $('#k-net').textContent = 'Mengirim ' + batch.length + ' data…';
        API.call('absenBatch', { sesiId: sesiId, items: batch }, { noRedirect: true, timeout: 45000 }).then(function (res) {
          var ids = {};
          batch.forEach(function (b) { ids[b.clientId] = true; });
          queue = Store.get(qKey, queue).filter(function (q) { return !ids[q.clientId]; }); setQ();
          res.hasil.forEach(function (h) {
            var l = logItems.filter(function (x) { return x.id === h.clientId; })[0];
            if (l) { l.st = h.ok ? (h.sudah ? 'dup' : 'ok') : 'err'; l.pesan = h.pesan; }
            if (!h.ok && roster[h.pid] && roster[h.pid].hadir && !h.sudah) roster[h.pid].hadir = '';
          });
          $('#k-net').textContent = 'Tersinkron ' + new Date().toTimeString().slice(0, 8);
          drawLog(); drawStats();
        }).catch(function (e) {
          $('#k-net').textContent = e.network ? 'Offline — ' + queue.length + ' data menunggu' : 'Gagal: ' + e.message;
          if (!e.network) toast(e.message, 'err');
        }).then(function () { inflight = false; if (queue.length) scheduleSend(queue.length ? 1500 : 250); });
      };

      var loadRoster = function () {
        return API.call('getRosterSesi', { sesiId: sesiId }).then(function (r) {
          roster = {}; rosterList = r.peserta;
          r.peserta.forEach(function (p) { roster[p.id] = p; });
          queue.forEach(function (q) { var pid = q.pid || String(q.payload || '').split('|')[1]; if (roster[pid]) roster[pid].hadir = roster[pid].hadir || q.waktu; });
          drawStats();
        });
      };

      var tick = function () {
        if (!stream) return;
        var v = $('#k-cam'), c = $('#k-cv');
        if (!v || v.readyState < 2) { loop = setTimeout(tick, 100); return; }
        var handle = function (text) {
          if (text) {
            var m = String(text).match(/^SIMEVP\|([^|]+)\|/i);
            if (m) {
              if (!cooldown[m[1]] || Date.now() - cooldown[m[1]] > 3500) { cooldown[m[1]] = Date.now(); enqueue(m[1], text, false); }
            } else if (/^SIMEV\|/i.test(text)) { if (!cooldown._s || Date.now() - cooldown._s > 3000) { cooldown._s = Date.now(); flash('err', 'QR Sesi', 'Minta peserta membuka Kartu QR di portal'); } }
          }
          loop = setTimeout(tick, text ? 350 : 80);
        };
        if (detector) detector.detect(v).then(function (codes) { handle(codes[0] && codes[0].rawValue); }).catch(function () { detector = null; handle(null); });
        else if (window.jsQR) {
          var side = Math.min(v.videoWidth, v.videoHeight) * 0.8, sx = (v.videoWidth - side) / 2, sy = (v.videoHeight - side) / 2, out = Math.min(520, side);
          c.width = out; c.height = out;
          var cx = c.getContext('2d', { willReadFrequently: true });
          cx.drawImage(v, sx, sy, side, side, 0, 0, out, out);
          var code = window.jsQR(cx.getImageData(0, 0, out, out).data, out, out, { inversionAttempts: 'attemptBoth' });
          handle(code && code.data);
        } else handle(null);
      };
      var start = function () {
        var b = $('#k-start'); btnLoading(b, true, 'Membuka kamera…');
        var det = ('BarcodeDetector' in window)
          ? window.BarcodeDetector.getSupportedFormats().then(function (f) { return f.indexOf('qr_code') > -1 ? new window.BarcodeDetector({ formats: ['qr_code'] }) : loadScript('js/vendor/jsQR.js').then(function () { return null; }); }).catch(function () { return loadScript('js/vendor/jsQR.js').then(function () { return null; }); })
          : loadScript('js/vendor/jsQR.js').then(function () { return null; });
        var camId = Store.get('kios_cam', '');
        Promise.all([det, navigator.mediaDevices.getUserMedia({ audio: false, video: camId ? { deviceId: { exact: camId } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })]).then(function (res) {
          detector = res[0]; stream = res[1];
          if (!Router.alive(rid) || !$('#k-cam')) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; return; }
          var v = $('#k-cam'); v.srcObject = stream; v.hidden = false; v.play().catch(function () {});
          $('#k-idle').hidden = true; $('#k-frame').hidden = false; $('#k-pill').hidden = false; $('#k-stop').hidden = false;
          tick();
          navigator.mediaDevices.enumerateDevices().then(function (devs) {
            var cams = devs.filter(function (x) { return x.kind === 'videoinput'; }), tr = stream && stream.getVideoTracks()[0];
            if ($('#k-camsel') && tr) $('#k-camsel').innerHTML = cams.map(function (cm, i) { return '<option value="' + esc(cm.deviceId) + '"' + (tr.getSettings().deviceId === cm.deviceId ? ' selected' : '') + '>' + esc(cm.label || 'Kamera ' + (i + 1)) + '</option>'; }).join('');
          });
        }).catch(function (e) { btnLoading(b, false); toast(e.name === 'NotReadableError' ? 'Kamera dipakai aplikasi lain.' : (e.message || 'Kamera tidak dapat dibuka.'), 'err', 6000); });
      };
      var stop = function () {
        clearTimeout(loop);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
        if (!$('#k-cam')) return;
        $('#k-cam').hidden = true; $('#k-idle').hidden = false; $('#k-frame').hidden = true; $('#k-pill').hidden = true; $('#k-stop').hidden = true;
        btnLoading($('#k-start'), false);
      };
      Router.onLeave(function () { stop(); clearTimeout(sendTimer); });

      on($('#k-start'), 'click', start);
      on($('#k-stop'), 'click', stop);
      on($('#k-full'), 'click', function () { var el = $('#k-scan'); if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); });
      on($('#k-camsel'), 'change', function () { Store.set('kios_cam', this.value); if (stream) { stop(); start(); } });
      on($('#k-sesi'), 'change', function () { if (queue.length) return toast('Tunggu antrean terkirim sebelum pindah sesi.', 'warn'); Router.go('#/admin/scanner?sesi=' + encodeURIComponent(this.value)); });
      on($('#k-sync'), 'click', function () { scheduleSend(0); loadRoster(); });
      on($('#k-find'), 'input', debounce(function () {
        var q = this.value.trim().toLowerCase();
        $('#k-found').innerHTML = q.length < 2 ? '' : rosterList.filter(function (p) { return (p.nama + ' ' + p.institusi).toLowerCase().indexOf(q) > -1; }).slice(0, 6).map(function (p) {
          return '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border)"><div style="min-width:0"><div class="bold ellipsis">' + esc(p.nama) + '</div><div class="xs muted ellipsis">' + esc(p.institusi) + '</div></div>' +
            (p.hadir ? badge('Hadir', 'green') : '<button class="btn btn-accent btn-xs" data-man="' + esc(p.id) + '">' + icon('check', 'ic-sm') + ' Hadir</button>') + '</div>';
        }).join('') || '<p class="small muted">Tidak ditemukan.</p>';
        $$('[data-man]').forEach(function (b) { on(b, 'click', function () { enqueue(b.dataset.man, null, true); b.outerHTML = badge('Hadir', 'green'); }); });
      }, 120));

      loadRoster().then(function () {
        if (queue.length) scheduleSend(300);
        if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'camera' }).then(function (p) { if (p.state === 'granted' && Router.alive(rid)) start(); }).catch(function () {});
      }).catch(errToast);
    }, { once: true });
  });
}
