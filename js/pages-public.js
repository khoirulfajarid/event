/* ==========================================================================
   SIM EVENT — Halaman Publik
   Beranda (daftar event), detail event, form pendaftaran, masuk, verifikasi
   ========================================================================== */
'use strict';

var KATEGORI_ICON = function (k) {
  k = String(k || '').toLowerCase();
  if (/ekonomi|bisnis|keuangan|zakat|wakaf|filantropi/.test(k)) return 'wallet';
  if (/fiqh|hukum|syariah|kajian/.test(k)) return 'layers';
  if (/teknolog|digital|cloud|ai|data|it/.test(k)) return 'server';
  if (/pelatihan|workshop|kelas/.test(k)) return 'wrench';
  return 'calendar';
};

function eventCover(ev) {
  return '<div class="event-cover">' +
    (ev.cover_url ? '<img src="' + esc(ev.cover_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
    '<div class="cover-art"' + (ev.cover_url ? ' style="z-index:-1"' : '') + '>' + icon(KATEGORI_ICON(ev.kategori)) + '</div>' +
    (ev.kategori ? '<span class="chip tl">' + esc(ev.kategori) + '</span>' : '') +
    '<span class="chip br">' + icon('clock', 'ic-sm') + ' ' + esc(fmtDate(ev.tanggal_mulai)) + '</span></div>';
}

function eventCard(ev) {
  var kuota = ev.kuota || 0, terisi = ev.terisi || 0;
  var persen = kuota ? Math.min(100, pct(terisi, kuota)) : Math.min(100, terisi);
  var penuh = ev.penuh;
  var cta;
  if (ev.status === 'selesai') cta = '<span class="btn btn-secondary btn-sm" aria-disabled="true">Selesai</span>';
  else if (penuh) cta = '<span class="btn btn-secondary btn-sm" aria-disabled="true">Kuota Penuh</span>';
  else if (!ev.pendaftaran_dibuka) cta = '<span class="btn btn-secondary btn-sm" aria-disabled="true">Ditutup</span>';
  else cta = '<a class="btn btn-navy btn-sm" href="#/daftar/' + esc(ev.id) + '">Daftar</a>';
  var pembicara = String(ev.pembicara || '').split(/[,;]/)[0].trim();
  return '<article class="card event-card">' +
    '<a href="#/event/' + esc(ev.id) + '" style="text-decoration:none">' + eventCover(ev) + '</a>' +
    '<div class="event-body">' +
    '<div class="event-meta">' + icon('pin', 'ic-sm') + '<span class="ellipsis">' + esc(ev.lokasi || 'Lokasi menyusul') + '</span></div>' +
    '<a href="#/event/' + esc(ev.id) + '" class="event-title" style="text-decoration:none">' + esc(ev.nama) + '</a>' +
    '<p class="small muted clamp-2">' + esc(ev.deskripsi || '') + '</p>' +
    '<div class="quota-row"><span>Kuota Pendaftaran</span><b style="color:' + (penuh ? '#b91c1c' : 'var(--text)') + '">' +
    (kuota ? num(terisi) + ' / ' + num(kuota) + ' Kursi' + (penuh ? ' (Penuh)' : '') : num(terisi) + ' pendaftar') + '</b></div>' +
    '<div class="progress ' + (penuh ? 'red' : '') + '"><span style="width:' + persen + '%"></span></div>' +
    '<div class="event-foot"><div class="row" style="min-width:0">' +
    (pembicara ? '<span class="avatar avatar-soft">' + esc(initials(pembicara)) + '</span><span class="small ellipsis">' + esc(pembicara) + '</span>' : '<span class="small muted">' + (ev.biaya ? rupiah(ev.biaya) : 'Gratis') + '</span>') +
    '</div>' + cta + '</div></div></article>';
}

var PublicCache = {
  get: function () { try { return JSON.parse(sessionStorage.getItem('simev_pub') || 'null'); } catch (e) { return null; } },
  set: function (d) { try { sessionStorage.setItem('simev_pub', JSON.stringify(d)); } catch (e) {} }
};

// --------------------------------------------------------------------------
// BERANDA
// --------------------------------------------------------------------------
function pageHome(params, query, rid) {
  Layout.public(
    '<section class="hero"><div class="container">' +
    '<span class="hero-eyebrow">' + icon('shieldCheck', 'ic-sm') + ' Portal Event & Sertifikasi Terpadu</span>' +
    '<h1>Temukan & Daftar Event Pilihan Anda</h1>' +
    '<p>Daftar seminar, workshop, dan pelatihan. Pantau verifikasi, absen dengan scan QR, isi evaluasi, lalu unduh sertifikat — semuanya di satu tempat.</p>' +
    '</div></section>' +
    '<div class="container"><div class="card search-card">' +
    '<div class="input-icon">' + icon('search') + '<input class="input input-soft" id="q" placeholder="Cari event, topik, pembicara…" value="' + esc(query.q || '') + '"></div>' +
    '<select class="select input-soft" id="f-kat"><option value="">Semua Kategori</option></select>' +
    '<select class="select input-soft" id="f-date"><option value="">Semua Tanggal</option><option value="7">7 hari ke depan</option><option value="30">30 hari ke depan</option><option value="buka">Pendaftaran dibuka</option><option value="selesai">Sudah selesai</option></select>' +
    '<button class="btn btn-primary" id="btn-filter">' + icon('filter', 'ic-sm') + ' Filter</button></div>' +
    '<div class="row between wrap mt-24 mb-16" id="events" style="scroll-margin-top:80px"><h2>Event Mendatang</h2><span class="small muted" id="ev-count"></span></div>' +
    '<div id="ev-grid" class="event-grid">' + [1, 2, 3].map(function () { return '<div class="skel" style="height:380px;border-radius:12px"></div>'; }).join('') + '</div>' +
    '<section class="band mt-24" style="margin-top:48px"><div><h2>Sudah mendaftar?</h2><p>Masuk sekali, berikutnya cukup satu ketukan. Pantau verifikasi, absensi, dan unduh sertifikat semua event Anda.</p></div>' +
    '<div class="row wrap"><a class="btn btn-light btn-lg" href="#/masuk">' + icon('login') + ' Masuk Portal Peserta</a><a class="btn btn-ghost btn-lg" style="color:#fff" href="#/verifikasi">' + icon('shieldCheck') + ' Cek Sertifikat</a></div></section>' +
    '</div>', 'home');

  var data = null;
  var render = function () {
    if (!data) return;
    var q = $('#q').value.trim().toLowerCase(), kat = $('#f-kat').value, df = $('#f-date').value;
    var list = data.events.filter(function (e) {
      if (kat && e.kategori !== kat) return false;
      if (q && (e.nama + ' ' + e.deskripsi + ' ' + e.pembicara + ' ' + e.lokasi + ' ' + e.kategori).toLowerCase().indexOf(q) === -1) return false;
      var dd = daysUntil(e.tanggal_mulai);
      if (df === '7' && !(dd !== null && dd >= 0 && dd <= 7)) return false;
      if (df === '30' && !(dd !== null && dd >= 0 && dd <= 30)) return false;
      if (df === 'buka' && !e.pendaftaran_dibuka) return false;
      if (df === 'selesai' && e.status !== 'selesai') return false;
      return true;
    });
    $('#ev-count').textContent = 'Menampilkan ' + list.length + ' dari ' + data.events.length + ' event';
    $('#ev-grid').innerHTML = list.length ? list.map(eventCard).join('')
      : '<div style="grid-column:1/-1">' + emptyState('calendar', 'Belum ada event yang cocok', 'Coba ubah kata kunci atau filter.') + '</div>';
  };
  var fill = function (d) {
    data = d;
    var sel = $('#f-kat');
    if (sel && sel.options.length <= 1) d.kategori.forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o); });
    render();
  };

  var cached = PublicCache.get();
  if (cached) fill(cached);
  if (!API.configured()) {
    $('#ev-grid').innerHTML = '<div style="grid-column:1/-1" class="alert alert-warn">' + icon('alert') + '<div><b>GAS_URL belum diisi.</b><p class="small mt-8">Buka file <span class="mono">js/config.js</span> lalu isi URL Web App Apps Script (berakhiran /exec).</p></div></div>';
    return;
  }
  API.call('getPublicEvents').then(function (d) {
    PublicCache.set(d);
    if (Router.alive(rid)) fill(d);
  }).catch(function (e) {
    if (!Router.alive(rid)) return;
    if (!cached) $('#ev-grid').innerHTML = '<div style="grid-column:1/-1" class="alert alert-err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>';
  });

  on($('#q'), 'input', debounce(render, 200));
  on($('#f-kat'), 'change', render);
  on($('#f-date'), 'change', render);
  on($('#btn-filter'), 'click', render);
  if (location.hash.indexOf('#events') > -1) setTimeout(function () { var t = $('#events'); if (t) t.scrollIntoView(); }, 50);
}

// --------------------------------------------------------------------------
// DETAIL EVENT
// --------------------------------------------------------------------------
function pageEventDetail(params, query, rid) {
  Layout.public('<div class="container" style="padding-top:28px">' + skeleton(3) + '</div>', 'events');
  return API.swr('getEventDetail', { id: params.id }, function (d) {
    if (!Router.alive(rid)) return;
    var ev = d.event;
    var hari = daysUntil(ev.batas_daftar || ev.tanggal_mulai);
    $('#page').innerHTML = '<div class="container" style="padding-top:24px">' +
      '<a href="#/" class="small row">' + icon('arrowLeft', 'ic-sm') + ' Kembali ke daftar event</a>' +
      '<div class="split mt-16"><div class="stack">' +
      '<div class="card" style="overflow:hidden">' + eventCover(ev) + '<div class="card-pad">' +
      '<div class="eyebrow">' + esc(ev.kategori || 'Event') + ' • ' + esc(ev.kode) + '</div>' +
      '<h1 class="mt-8">' + esc(ev.nama) + '</h1>' +
      '<p class="mt-16" style="white-space:pre-line;line-height:22px">' + esc(ev.deskripsi || '') + '</p></div></div>' +
      '<div class="card card-pad"><h3>Syarat Pendaftaran</h3><p class="small muted mt-8">Siapkan dokumen berikut sebelum mendaftar. Format PDF/JPG/PNG maks. 5MB.</p><div class="stack-sm mt-16">' +
      ev.syarat.map(function (s) {
        return '<div class="row-top" style="padding:10px 0;border-top:1px solid var(--border)">' + icon(s.tipe === 'file' ? 'file' : 'link') +
          '<div class="grow"><div class="bold">' + esc(s.label) + '</div><div class="small muted">' + esc(s.deskripsi || '') + '</div></div>' + badge(s.wajib ? 'Wajib' : 'Opsional', s.wajib ? 'blue' : 'gray') + '</div>';
      }).join('') + '</div></div></div>' +
      '<aside class="card card-pad stack" style="position:sticky;top:80px">' +
      '<div><div class="small muted">Biaya</div><div class="kpi-value" style="margin-top:2px">' + (ev.biaya ? rupiah(ev.biaya) : 'Gratis') + '</div></div>' +
      '<dl class="kv">' +
      '<dt>Tanggal</dt><dd>' + esc(fmtDate(ev.tanggal_mulai, true)) + (ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai ? ' – ' + esc(fmtDate(ev.tanggal_selesai, true)) : '') + '</dd>' +
      '<dt>Waktu</dt><dd>' + esc(ev.jam || '-') + '</dd><dt>Lokasi</dt><dd>' + esc(ev.lokasi || '-') + '</dd>' +
      '<dt>Pembicara</dt><dd>' + esc(ev.pembicara || '-') + '</dd><dt>Absensi wajib</dt><dd>' + ev.sesi_wajib + ' sesi (scan QR)</dd>' +
      (ev.batas_daftar ? '<dt>Batas daftar</dt><dd>' + esc(fmtDate(ev.batas_daftar, true)) + '</dd>' : '') + '</dl>' +
      '<div><div class="quota-row"><span>Kuota</span><b>' + (ev.kuota ? num(ev.terisi) + ' / ' + num(ev.kuota) : num(ev.terisi) + ' pendaftar') + '</b></div><div class="progress mt-8 ' + (ev.penuh ? 'red' : '') + '"><span style="width:' + (ev.kuota ? Math.min(100, pct(ev.terisi, ev.kuota)) : 30) + '%"></span></div></div>' +
      (ev.pendaftaran_dibuka
        ? '<a class="btn btn-primary btn-lg btn-block" href="#/daftar/' + esc(ev.id) + '">Daftar Sekarang ' + icon('arrowRight') + '</a>' + (hari !== null && hari >= 0 ? '<p class="small muted center">' + icon('clock', 'ic-sm') + ' Pendaftaran ditutup ' + (hari === 0 ? 'hari ini' : 'dalam ' + hari + ' hari') + '</p>' : '')
        : '<div class="alert">' + icon('lock') + '<div class="small">' + (ev.penuh ? 'Kuota event sudah penuh.' : ev.status === 'selesai' ? 'Event telah selesai.' : 'Pendaftaran sudah ditutup.') + '</div></div>') +
      '<div class="divider" style="margin:0"></div><div class="small muted">' + icon('checkCircle', 'ic-sm') + ' Alur: Daftar → Verifikasi panitia → Absen QR ' + ev.sesi_wajib + 'x → Evaluasi → Sertifikat</div>' +
      '</aside></div></div>';
  });
}

// --------------------------------------------------------------------------
// FORM PENDAFTARAN
// --------------------------------------------------------------------------
var SYARAT_ICON = { pembayaran: 'receipt', follow: 'userCheck', share: 'megaphone', identitas: 'idCard' };

function pageDaftar(params, query, rid) {
  Layout.public('<div class="container narrow" style="padding-top:28px">' + skeleton(4) + '</div>', 'events');
  return API.swr('getEventDetail', { id: params.id }, function (d) {
    if (!Router.alive(rid)) return;
    var ev = d.event;
    var draftKey = 'draft_reg_' + ev.id;
    var draft = Store.get(draftKey, {});
    // Member yang sudah login → biodata terisi otomatis
    var member = S.isPeserta() ? S.user : null;
    if (member) ['nama', 'email', 'hp', 'institusi'].forEach(function (k) { if (member[k]) draft[k] = member[k]; });
    var files = {};
    var hari = daysUntil(ev.batas_daftar || ev.tanggal_mulai);

    if (!ev.pendaftaran_dibuka) {
      $('#page').innerHTML = '<div class="container narrow" style="padding:48px 16px">' + emptyState('lock', ev.penuh ? 'Kuota event sudah penuh' : 'Pendaftaran ditutup', ev.nama, '<a class="btn btn-primary" href="#/">Lihat event lain</a>') + '</div>';
      return;
    }

    var fileSyarat = ev.syarat.filter(function (s) { return s.tipe === 'file'; });
    var otherSyarat = ev.syarat.filter(function (s) { return s.tipe !== 'file'; });

    var inputField = function (name, label, ic, type, ph, hint, right) {
      return '<div class="field"><label class="label" for="f-' + name + '"><span>' + label + ' <span class="req">*</span></span>' + (right ? '<span class="xs muted">' + right + '</span>' : '') + '</label>' +
        '<div class="input-icon">' + icon(ic) + '<input class="input input-soft" id="f-' + name + '" name="' + name + '" type="' + type + '" placeholder="' + esc(ph) + '" value="' + esc(draft[name] || '') + '" required' + (name === 'email' && member ? ' readonly' : '') + '></div>' +
        (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
    };

    $('#page').innerHTML = '<div class="container narrow" style="padding-top:24px;padding-bottom:12px">' +
      '<div class="row between wrap"><a href="#/event/' + esc(ev.id) + '" class="small row">' + icon('arrowLeft', 'ic-sm') + ' Kembali ke Detail Event</a>' +
      (hari !== null && hari >= 0 ? '<span class="small muted row">' + icon('clock', 'ic-sm') + ' Ditutup ' + (hari === 0 ? '<b>hari ini</b>' : 'dalam <b>' + hari + ' hari</b>') + '</span>' : '') + '</div>' +
      '<div class="row between wrap mt-24" style="align-items:flex-end"><div><div class="eyebrow">' + esc(ev.kategori || 'Event') + ' • ' + esc(ev.kode) + '</div>' +
      '<h1 class="mt-8">' + esc(ev.nama) + '</h1><p class="muted mt-8">Lengkapi data diri dan dokumen persyaratan untuk mengamankan kursi Anda.</p></div>' +
      '<div class="stack-sm" style="align-items:flex-end"><span class="small row"><span class="status-dot"></span> Status: Dibuka</span><span class="badge b-navy">' + (ev.biaya ? rupiah(ev.biaya) : 'Gratis') + '</span></div></div>' +

      '<div id="member-banner" class="mt-24"></div>' +
      '<form id="reg-form" class="stack gap-lg mt-24" novalidate>' +
      // Section 01
      '<section class="card section-card"><div class="section-head"><div class="section-icon">' + icon('idCard') + '</div><div class="grow"><h3>Data Diri</h3><p class="small muted" id="dd-sub">' + (member ? 'Diisi otomatis dari akun member Anda — periksa & perbarui bila perlu.' : 'Semua kolom wajib diisi.') + '</p></div><span class="tag-section">Bagian 01</span></div>' +
      '<div class="stack">' + inputField('nama', 'Nama Lengkap', 'user', 'text', 'mis. Ahmad Fauzan', '', 'Sesuai kartu identitas') +
      '<div class="grid-2">' + inputField('email', 'Alamat Email', 'mail', 'email', 'nama@contoh.com', 'Kode akses & notifikasi dikirim ke sini') +
      inputField('hp', 'WhatsApp / No. HP', 'phone', 'tel', '0812-3456-7890', 'Untuk konfirmasi panitia') + '</div>' +
      inputField('institusi', 'Institusi / Kampus / Organisasi', 'building', 'text', 'mis. STIS Al Wafa Bogor') + '</div></section>' +

      // Section 02
      '<section class="card section-card"><div class="section-head"><div class="section-icon">' + icon('cloudUp') + '</div><div class="grow"><h3>Unggah Persyaratan</h3><p class="small muted">Format: PDF, JPG, PNG, WEBP • Maks. 5MB per berkas</p></div><span class="tag-section">Bagian 02</span></div>' +
      (ev.biaya && ev.info_pembayaran ? '<div class="alert alert-info mb-16">' + icon('card') + '<div><b>Informasi Pembayaran — ' + rupiah(ev.biaya) + '</b><p class="small mt-8" style="white-space:pre-line">' + esc(ev.info_pembayaran) + '</p></div></div>' : '') +
      (fileSyarat.length ? '<div class="req-grid">' + fileSyarat.map(function (s) {
        return '<div class="req-box"><div class="row between"><b>' + esc(s.label) + (s.wajib ? ' <span class="req" style="color:var(--error)">*</span>' : '') + '</b>' + badge(s.wajib ? 'Wajib' : 'Opsional', s.wajib ? 'blue' : 'gray') + '</div>' +
          '<span class="small muted">' + esc(s.deskripsi || '') + '</span>' +
          '<label class="dropzone" data-key="' + esc(s.key) + '"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-key="' + esc(s.key) + '">' +
          '<span class="dz-icon">' + icon(SYARAT_ICON[s.key] || 'upload') + '</span><span class="dz-title">Seret berkas atau klik untuk memilih</span><span class="xs muted dz-sub">PDF, JPG atau PNG hingga 5MB</span></label></div>';
      }).join('') + '</div>' : '') +
      (otherSyarat.length ? '<div class="stack mt-16">' + otherSyarat.map(function (s) {
        return '<div class="field"><label class="label">' + esc(s.label) + (s.wajib ? ' <span class="req">*</span>' : '') + '</label>' +
          (s.tipe === 'link' ? '<div class="input-icon">' + icon('link') + '<input class="input input-soft" type="url" data-nilai="' + esc(s.key) + '" placeholder="https://…" value="' + esc((draft.nilai || {})[s.key] || '') + '"></div>'
            : '<textarea class="textarea" data-nilai="' + esc(s.key) + '" placeholder="' + esc(s.deskripsi || '') + '">' + esc((draft.nilai || {})[s.key] || '') + '</textarea>') +
          (s.deskripsi ? '<span class="hint">' + esc(s.deskripsi) + '</span>' : '') + '</div>';
      }).join('') + '</div>' : '') +
      '<div class="alert mt-16">' + icon('shieldCheck') + '<div class="small"><b>Privasi & Keamanan Data:</b> dokumen disimpan privat di Google Drive penyelenggara dan hanya dapat dibuka panitia event untuk keperluan verifikasi.</div></div></section>' +

      // Declaration
      '<section class="card card-pad"><label class="checkbox"><input type="checkbox" id="f-setuju"><span><b>Pernyataan Keaslian Data & Ketentuan Peserta <span style="color:var(--error)">*</span></b><br><span class="small muted">Saya menyatakan seluruh data dan dokumen yang saya lampirkan benar dan asli. Saya memahami bahwa pemalsuan data dapat menyebabkan diskualifikasi dari <b>' + esc(ev.nama) + '</b> tanpa pemberitahuan.</span></span></label></section>' +

      '<div class="alert row between wrap"><span class="small row">' + icon('help', 'ic-sm') + ' Kendala unggah berkas atau butuh bantuan akses?</span><a class="small bold" href="#/masuk">Sudah pernah daftar? Masuk ' + icon('external', 'ic-sm') + '</a></div>' +

      '<div class="sticky-bar"><a class="btn btn-secondary" href="#/event/' + esc(ev.id) + '">' + icon('x', 'ic-sm') + ' Batal</a>' +
      '<span class="small muted row" id="draft-state"><span class="status-dot"></span> Draf tersimpan di perangkat</span>' +
      '<button type="submit" class="btn btn-primary" id="btn-submit">Kirim Pendaftaran ' + icon('arrowRight', 'ic-sm') + '</button></div>' +
      '</form></div>';

    var form = $('#reg-form');

    // ---------- Isi otomatis untuk member lama ----------
    var fillMember = function (u) {
      member = u;
      ['nama', 'email', 'hp', 'institusi'].forEach(function (k) { if (u[k]) { form[k].value = u[k]; form[k].classList.remove('invalid'); } });
      form.email.readOnly = true;
      $('#dd-sub').textContent = 'Diisi otomatis dari akun member Anda — periksa & perbarui bila perlu.';
      $('#member-banner').innerHTML = '<div class="member-banner ok">' + icon('userCheck') + '<div class="grow small"><b>Masuk sebagai ' + esc(u.nama) + '</b> · ' + esc(u.email) + '<br><span class="muted">Data diri sudah terisi. Cukup lengkapi persyaratan unggah di bawah.</span></div></div>';
      var target = $('.req-grid', form) || $('#f-setuju');
      if (target) setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150);
    };
    var loginThen = function (email, btn) {
      var dev = Devices.find(email);
      var viaDevice = dev ? Devices.login(dev) : Promise.reject({ code: 'NEED_KODE' });
      if (btn) btnLoading(btn, true, 'Masuk…');
      return viaDevice.catch(function (e) {
        if (e && e.code && e.code !== 'NEED_KODE') throw e;
        // tanpa perangkat tepercaya: mode "email" langsung, selain itu minta kode sekali
        return API.call('loginPeserta', { email: email }, { noRedirect: true }).then(function (d) { S.setSession(d); return d; }).catch(function (e2) {
          if (e2.code !== 'NEED_KODE') throw e2;
          return askKode(email).then(function (kode) {
            return API.call('loginPeserta', { email: email, kode: kode }, { noRedirect: true }).then(function (d) { S.setSession(d); return d; });
          });
        });
      }).then(function (d) {
        fillMember(d.user);
        toast('Selamat datang kembali, ' + d.user.nama + '!', 'ok');
      }).catch(function (e) { if (e && e.message) errToast(e); }).then(function () { if (btn) btnLoading(btn, false); });
    };
    var showMemberOffer = function (html) { $('#member-banner').innerHTML = html; };
    if (member) {
      showMemberOffer('<div class="member-banner ok">' + icon('userCheck') + '<div class="grow small"><b>Mendaftar sebagai ' + esc(member.nama) + '</b> · ' + esc(member.email) + '<br><span class="muted">Data diri terisi otomatis dari akun member. Cukup lengkapi persyaratan unggah.</span></div></div>');
    } else {
      var devs = Devices.list();
      if (devs.length) {
        showMemberOffer('<div class="member-banner">' + icon('users') + '<div class="grow small"><b>Pernah ikut event sebelumnya?</b><br><span class="muted">Pilih akun Anda — data diri akan terisi otomatis.</span></div>' +
          devs.slice(0, 3).map(function (dv) { return '<button type="button" class="btn btn-primary btn-sm" data-dev="' + esc(dv.email) + '">' + icon('login', 'ic-sm') + ' ' + esc(dv.nama.split(' ')[0]) + '</button>'; }).join('') + '</div>');
        $$('[data-dev]').forEach(function (b) { on(b, 'click', function () { loginThen(b.dataset.dev, b); }); });
      }
      on(form.email, 'blur', function () {
        var em = form.email.value.trim().toLowerCase();
        if (member || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return;
        API.call('cekMember', { email: em }, { noRedirect: true }).then(function (c) {
          if (!c.member || member || form.email.value.trim().toLowerCase() !== em) return;
          showMemberOffer('<div class="member-banner">' + icon('userCheck') + '<div class="grow small"><b>Email ini sudah terdaftar sebagai member</b> (' + esc(c.nama_samar) + ', ' + c.jumlah_event + ' event).<br><span class="muted">Masuk untuk mengisi data diri secara otomatis.</span></div>' +
            '<button type="button" class="btn btn-primary btn-sm" id="btn-isi">' + icon('login', 'ic-sm') + ' Masuk & Isi Otomatis</button></div>');
          on($('#btn-isi'), 'click', function () { loginThen(em, this); });
        }).catch(function () {});
      });
    }

    var saveDraft = debounce(function () {
      var nilai = {};
      $$('[data-nilai]', form).forEach(function (el) { nilai[el.dataset.nilai] = el.value; });
      Store.set(draftKey, { nama: form.nama.value, email: form.email.value, hp: form.hp.value, institusi: form.institusi.value, nilai: nilai });
      var ds = $('#draft-state');
      if (ds) ds.innerHTML = '<span class="status-dot"></span> Draf tersimpan ' + new Date().toTimeString().slice(0, 5);
    }, 500);
    on(form, 'input', saveDraft);

    $$('.dropzone', form).forEach(function (dz) {
      var input = $('input', dz);
      ['dragenter', 'dragover'].forEach(function (t) { on(dz, t, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
      ['dragleave', 'drop'].forEach(function (t) { on(dz, t, function () { dz.classList.remove('drag'); }); });
      on(dz, 'drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
      on(input, 'change', function () { if (input.files[0]) handle(input.files[0]); });
      function handle(file) {
        $('.dz-title', dz).textContent = 'Memproses…';
        prepareUpload(file).then(function (f) {
          files[dz.dataset.key] = f;
          dz.classList.add('has-file');
          $('.dz-icon', dz).innerHTML = f.mime.indexOf('image') === 0 ? '<img class="thumb" style="width:38px;height:38px;border-radius:50%" src="data:' + f.mime + ';base64,' + f.base64 + '">' : icon('fileText');
          $('.dz-title', dz).textContent = f.name;
          $('.dz-sub', dz).textContent = (f.size / 1024).toFixed(0) + ' KB • klik untuk ganti';
        }).catch(function (e) {
          delete files[dz.dataset.key];
          dz.classList.remove('has-file');
          $('.dz-title', dz).textContent = 'Seret berkas atau klik untuk memilih';
          errToast(e);
        });
      }
    });

    on(form, 'submit', function (e) {
      e.preventDefault();
      var invalid = null;
      ['nama', 'email', 'hp', 'institusi'].forEach(function (n) {
        var el = form[n], bad = !el.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) || (n === 'hp' && el.value.replace(/\D/g, '').length < 9);
        el.classList.toggle('invalid', bad);
        if (bad && !invalid) invalid = el;
      });
      if (invalid) { invalid.focus(); return toast('Periksa kembali data diri yang ditandai merah.', 'err'); }
      var missing = ev.syarat.filter(function (s) {
        if (!s.wajib) return false;
        if (s.tipe === 'file') return !files[s.key];
        var el = $('[data-nilai="' + s.key + '"]', form); return !el || !el.value.trim();
      });
      if (missing.length) return toast('Lengkapi syarat wajib: ' + missing.map(function (s) { return s.label; }).join(', '), 'err');
      if (!$('#f-setuju').checked) return toast('Centang pernyataan keaslian data terlebih dahulu.', 'err');

      var nilai = {};
      $$('[data-nilai]', form).forEach(function (el) { if (el.value.trim()) nilai[el.dataset.nilai] = el.value.trim(); });
      var btn = $('#btn-submit');
      btnLoading(btn, true, 'Mengirim…');
      var keys = Object.keys(files);
      var prog = openModal({ title: 'Mengirim pendaftaran', persistent: true, body: '<div class="stack"><p class="small muted">Mohon tidak menutup halaman ini.</p><div class="progress lg navy"><span id="up-bar" style="width:5%"></span></div><div id="up-log" class="stack-sm small"></div></div>' });
      var logLine = function (t, ok) { $('#up-log', prog.el).insertAdjacentHTML('beforeend', '<div class="row">' + icon(ok === false ? 'xCircle' : 'checkCircle', 'ic-sm') + ' ' + esc(t) + '</div>'); };
      var reg;
      API.call('register', { eventId: ev.id, nama: form.nama.value, email: form.email.value, hp: form.hp.value, institusi: form.institusi.value, nilai: nilai }, { noRedirect: true })
        .then(function (r) {
          reg = r;
          if (r.member) {
            S.user.nama = r.user.nama; S.user.hp = r.user.hp; S.user.institusi = r.user.institusi; Store.set('user', S.user);
            S.setPid(r.pendaftarId);
          } else S.setSession(r);
          if (!r.member || !S.user.role) { S.user.role = 'CALON'; Store.set('user', S.user); }
          logLine('Data pendaftaran tersimpan (ID ' + r.pendaftarId + ')');
          var gagal = [];
          var chain = Promise.resolve();
          keys.forEach(function (k, i) {
            chain = chain.then(function () {
              var label = (ev.syarat.filter(function (s) { return s.key === k; })[0] || {}).label || k;
              return API.call('pesertaUpload', { syaratKey: k, file: files[k] }, { noRedirect: true })
                .then(function () { logLine(label + ' terunggah'); })
                .catch(function (err) { gagal.push(label); logLine(label + ' gagal: ' + err.message, false); })
                .then(function () { $('#up-bar', prog.el).style.width = Math.round((i + 1) / keys.length * 100) + '%'; });
            });
          });
          return chain.then(function () { return gagal; });
        })
        .then(function (gagal) {
          Store.del(draftKey);
          prog.close();
          PublicCache.set(null);
          renderRegSuccess(ev, reg, gagal);
        })
        .catch(function (err) {
          prog.close();
          btnLoading(btn, false);
          errToast(err);
          if (err.code === 'DUPLICATE') setTimeout(function () { Router.go(S.isPeserta() ? '#/portal' : '#/masuk'); }, 1800);
        });
    });
  }, { once: true });
}

function renderRegSuccess(ev, reg, gagal) {
  $('#page').innerHTML = '<div class="container narrow" style="padding:40px 16px">' +
    '<div class="card card-pad stack center" style="align-items:center">' +
    '<div class="section-icon" style="width:64px;height:64px;border-radius:50%;background:var(--accent-soft);color:var(--accent-dark)">' + icon('checkCircle', 'ic-xl') + '</div>' +
    '<h1>Pendaftaran Terkirim!</h1><p class="muted">Terima kasih, <b>' + esc(reg.user.nama) + '</b>. Pendaftaran Anda di <b>' + esc(ev.nama) + '</b> sedang menunggu verifikasi panitia.</p>' +
    (reg.member || !reg.kode ? '<div class="alert alert-ok" style="text-align:left;width:100%">' + icon('userCheck') + '<div class="small"><b>Tercatat di akun member Anda.</b> Tidak perlu kode baru — pantau semua event Anda dari satu portal. Pada perangkat ini Anda bisa langsung masuk tanpa kode.</div></div>' : '') +
    (!reg.kode ? '' : '<div class="kode-box" style="width:100%;max-width:420px"><div class="xs" style="letter-spacing:.1em;color:#adc8f5">KODE AKSES ANDA</div><div class="kode">' + esc(reg.kode) + '</div>' +
    '<div class="xs" style="color:#adc8f5">ID ' + esc(reg.pendaftarId) + '</div>' +
    '<button class="btn btn-light btn-sm mt-16" id="cp-kode">' + icon('copy', 'ic-sm') + ' Salin Kode</button></div>' +
    '<div class="alert alert-warn" style="text-align:left;width:100%">' + icon('key') + '<div class="small"><b>Simpan kode ini baik-baik.</b> Kode akses berlaku untuk <b>semua event</b> Anda. Di perangkat ini Anda akan otomatis dikenali (login 1-tap); kode hanya diminta saat masuk dari HP/laptop lain. Kode juga dikirim ke email bila notifikasi aktif.</div></div>') +
    (gagal.length ? '<div class="alert alert-err" style="text-align:left;width:100%">' + icon('alertCircle') + '<div class="small">Berkas berikut gagal diunggah: <b>' + esc(gagal.join(', ')) + '</b>. Silakan unggah ulang dari Portal Peserta.</div></div>' : '') +
    '<div class="row wrap" style="justify-content:center"><a class="btn btn-primary btn-lg" href="#/portal">' + icon('clipboard') + ' Buka Portal Status</a><a class="btn btn-secondary btn-lg" href="#/">Kembali ke Beranda</a></div>' +
    '</div></div>';
  on($('#cp-kode'), 'click', function () { copyText(reg.kode, 'Kode akses'); });
}

// --------------------------------------------------------------------------
// MASUK
// --------------------------------------------------------------------------
/** Modal minta kode akses (sekali per perangkat). Resolve(kode) atau reject saat dibatalkan. */
function askKode(email) {
  return new Promise(function (resolve, reject) {
    var done = false;
    var m = openModal({
      title: 'Masukkan Kode Akses',
      body: '<p class="small muted">Perangkat ini belum dikenali untuk <b>' + esc(email) + '</b>. Masukkan kode akses Anda <b>sekali saja</b> — berikutnya cukup satu ketukan.</p>' +
        '<input class="input mono mt-16" id="ask-kode" maxlength="12" placeholder="8 karakter" style="text-transform:uppercase;letter-spacing:6px;font-size:22px;height:56px;text-align:center" autocomplete="one-time-code">' +
        '<p class="xs muted mt-8">Lupa kode? Tutup jendela ini lalu gunakan tautan "Lupa kode?" di halaman masuk.</p>',
      foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="ask-ok">' + icon('check', 'ic-sm') + ' Lanjut</button>',
      onClose: function () { if (!done) reject({}); }
    });
    var inp = $('#ask-kode', m.el); setTimeout(function () { inp.focus(); }, 50);
    var go = function () { var v = inp.value.trim(); if (v.length < 6) return inp.classList.add('invalid'); done = true; m.close(); resolve(v); };
    on($('#ask-ok', m.el), 'click', go);
    on(inp, 'keydown', function (e) { if (e.key === 'Enter') go(); });
  });
}

function pageMasuk(params, query) {
  if (S.user) return Router.go(S.isAdmin() ? '#/admin' : '#/portal');
  var tab = query.tab === 'admin' ? 'admin' : 'peserta';
  var devs = Devices.list();
  var mode = (API.peek(API.key('publicConfig', {})) || { d: { loginPeserta: 'perangkat' } }).d.loginPeserta;
  var accHtml = function () {
    devs = Devices.list();
    return devs.length ? '<div class="stack-sm"><div class="xs muted bold" style="letter-spacing:.06em">MASUK CEPAT DI PERANGKAT INI</div>' + devs.map(function (dv) {
      return '<div class="row"><button type="button" class="acc-card" data-acc="' + esc(dv.email) + '"><span class="avatar">' + esc(initials(dv.nama)) + '</span><div class="grow"><div class="bold ellipsis">Masuk sebagai ' + esc(dv.nama) + '</div><div class="xs muted ellipsis">' + esc(dv.email) + '</div></div>' + icon('arrowRight') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-icon" data-forget="' + esc(dv.email) + '" title="Lupakan akun di perangkat ini">' + icon('x', 'ic-sm') + '</button></div>';
    }).join('') + '<div class="row small muted" style="gap:10px;margin:6px 0"><span class="grow" style="height:1px;background:var(--border)"></span>atau akun lain<span class="grow" style="height:1px;background:var(--border)"></span></div></div>' : '';
  };
  Layout.public('<div class="auth-wrap"><div class="auth-card card card-pad stack">' +
    '<div class="center"><span class="brand-mark" style="width:48px;height:48px;margin:0 auto;border-radius:12px">' + icon('ticket', 'ic-lg') + '</span><h2 class="mt-16">Masuk ke ' + esc(CFG.APP_NAME) + '</h2><p class="small muted mt-8">Pilih jenis akun Anda</p></div>' +
    '<div class="tabs" role="tablist"><button data-tab="peserta" class="' + (tab === 'peserta' ? 'active' : '') + '">Peserta</button><button data-tab="admin" class="' + (tab === 'admin' ? 'active' : '') + '">Panitia / Operator</button></div>' +
    '<div id="f-peserta-wrap" class="stack" ' + (tab === 'peserta' ? '' : 'hidden') + '><div id="acc-list">' + accHtml() + '</div>' +
    '<form id="f-peserta" class="stack">' +
    '<div class="field"><label class="label">Email pendaftaran</label><div class="input-icon">' + icon('mail') + '<input class="input" name="email" type="email" required autocomplete="email" placeholder="nama@contoh.com"></div></div>' +
    '<div class="field" id="kode-field"' + (mode === 'email' ? ' hidden' : '') + '><label class="label"><span>Kode akses</span><a href="#" id="lupa" class="xs">Lupa kode?</a></label><div class="input-icon">' + icon('key') + '<input class="input mono" name="kode" maxlength="12" placeholder="8 karakter" style="text-transform:uppercase;letter-spacing:3px;font-size:15px"></div><span class="hint" id="kode-hint">' + (mode === 'kode' ? 'Kode akses diminta setiap kali masuk.' : 'Cukup sekali di perangkat ini — berikutnya login 1-tap tanpa kode.') + '</span></div>' +
    '<button class="btn btn-primary btn-lg btn-block" type="submit">' + icon('login') + ' Masuk Portal Peserta</button>' +
    '<p class="small muted center">Belum pernah mendaftar? <a href="#/">Lihat daftar event</a></p></form></div>' +
    '<form id="f-admin" class="stack" ' + (tab === 'admin' ? '' : 'hidden') + '>' +
    '<div class="field"><label class="label">Email panitia / operator</label><div class="input-icon">' + icon('mail') + '<input class="input" name="email" type="email" required autocomplete="username"></div></div>' +
    '<div class="field"><label class="label">Kata sandi</label><div class="input-icon">' + icon('lock') + '<input class="input" name="password" type="password" required autocomplete="current-password"></div></div>' +
    '<button class="btn btn-navy btn-lg btn-block" type="submit">' + icon('shieldCheck') + ' Masuk Panel Pengelola</button>' +
    '<p class="xs muted center">Akun panitia dibuat oleh Operator — tidak tersedia pendaftaran mandiri.</p></form>' +
    '</div></div>');

  API.swr('publicConfig', {}, function (c) {
    mode = c.loginPeserta;
    var kf = $('#kode-field'); if (!kf) return;
    kf.hidden = mode === 'email';
    $('#kode-hint').textContent = mode === 'kode' ? 'Kode akses diminta setiap kali masuk.' : 'Cukup sekali di perangkat ini — berikutnya login 1-tap tanpa kode.';
  }).catch(function () {});

  $$('[data-tab]').forEach(function (b) {
    on(b, 'click', function () {
      $$('[data-tab]').forEach(function (x) { x.classList.toggle('active', x === b); });
      $('#f-peserta-wrap').hidden = b.dataset.tab !== 'peserta';
      $('#f-admin').hidden = b.dataset.tab !== 'admin';
    });
  });
  var after = function () {
    var dest = Store.get('after_login', '');
    Store.del('after_login');
    PublicCache.set(null);
    if (dest && ((S.isAdmin() && /^#\/(admin|operator)/.test(dest)) || (S.isPeserta() && /^#\/(portal|daftar)/.test(dest)))) return Router.go(dest);
    Router.go(S.isAdmin() ? '#/admin' : '#/portal');
  };
  var bindAcc = function () {
    $$('[data-acc]').forEach(function (b) {
      on(b, 'click', function () {
        var dv = Devices.find(b.dataset.acc);
        b.style.opacity = '.6'; b.querySelector('.ic:last-child').outerHTML = '<span class="spinner"></span>';
        Devices.login(dv).then(function (d) { toast('Selamat datang, ' + d.user.nama + '!', 'ok'); after(); })
          .catch(function (e) {
            $('#acc-list').innerHTML = accHtml(); bindAcc();
            if (e.code === 'NEED_KODE') { $('#f-peserta').email.value = dv.email; $('#kode-field').hidden = false; $('#f-peserta').kode.focus(); toast(e.message, 'warn'); }
            else errToast(e);
          });
      });
    });
    $$('[data-forget]').forEach(function (b) { on(b, 'click', function () { Devices.remove(b.dataset.forget); $('#acc-list').innerHTML = accHtml(); bindAcc(); }); });
  };
  bindAcc();

  on($('#f-peserta'), 'submit', function (e) {
    e.preventDefault();
    var f = this, b = $('button[type=submit]', f);
    if (!f.reportValidity()) return;
    var email = f.email.value.trim().toLowerCase(), kode = f.kode.value.trim();
    var dev = Devices.find(email);
    btnLoading(b, true, 'Memeriksa…');
    var p = (!kode && dev) ? Devices.login(dev) : API.call('loginPeserta', { email: email, kode: kode }, { noRedirect: true }).then(function (d) { S.setSession(d); return d; });
    p.then(function (d) { toast('Selamat datang, ' + d.user.nama + '!', 'ok'); after(); })
      .catch(function (err) {
        btnLoading(b, false);
        if (err.code === 'NEED_KODE') { $('#kode-field').hidden = false; f.kode.focus(); toast('Masukkan kode akses Anda (sekali di perangkat ini).', 'warn'); }
        else errToast(err);
      });
  });
  on($('#f-admin'), 'submit', function (e) {
    e.preventDefault();
    var f = this, b = $('button[type=submit]', f);
    if (!f.reportValidity()) return;
    btnLoading(b, true, 'Memeriksa…');
    API.call('loginAdmin', { email: f.email.value, password: f.password.value }, { noRedirect: true })
      .then(function (d) {
        S.setSession(d); EventCtx.list = null; toast('Selamat datang, ' + d.user.nama + '!', 'ok');
        API.prefetch('listEvents', {}); API.prefetch('adminDashboard', { eventId: '' });
        after();
      })
      .catch(function (err) { btnLoading(b, false); errToast(err); });
  });
  on($('#lupa'), 'click', function (e) {
    e.preventDefault();
    var m = openModal({
      title: 'Lupa Kode Akses',
      body: '<p class="small muted">Masukkan email pendaftaran. Kode akses baru akan dikirim ke email tersebut, dan kode lama tidak berlaku lagi.</p><div class="field mt-16"><label class="label">Email</label><input class="input" id="lupa-email" type="email" value="' + esc($('#f-peserta').email.value) + '"></div>',
      foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="lupa-send">' + icon('send', 'ic-sm') + ' Kirim Kode Baru</button>'
    });
    on($('#lupa-send', m.el), 'click', function () {
      var b = this; btnLoading(b, true);
      API.act('lupaKode', { email: $('#lupa-email', m.el).value }).then(function () { m.close(); }).catch(function (err) { btnLoading(b, false); errToast(err); });
    });
  });
}

// --------------------------------------------------------------------------
// VERIFIKASI SERTIFIKAT PUBLIK
// --------------------------------------------------------------------------
function pageVerifikasi(params, query, rid) {
  var wrap = S.isPeserta() || S.isAdmin() ? null : 'public';
  var html = '<div class="container narrow" style="padding:36px 16px">' +
    '<div class="center"><span class="section-icon" style="margin:0 auto;width:56px;height:56px">' + icon('shieldCheck', 'ic-lg') + '</span><h1 class="mt-16">Verifikasi Sertifikat</h1><p class="muted mt-8">Periksa keaslian sertifikat yang diterbitkan melalui ' + esc(CFG.APP_NAME) + '.</p></div>' +
    '<form id="vf" class="card search-card" style="margin-top:24px"><div class="input-icon">' + icon('hash') + '<input class="input input-soft mono" name="nomor" placeholder="mis. SIMEV/EV1AB/2026/0001" value="' + esc(query.nomor || '') + '" required></div><button class="btn btn-primary" type="submit">' + icon('search', 'ic-sm') + ' Verifikasi</button></form>' +
    '<div id="vres" class="mt-24"></div></div>';
  if (wrap) Layout.public(html, 'verify'); else Layout.app(html, 'verify');

  var run = function (nomor) {
    $('#vres').innerHTML = '<div class="center" style="padding:30px"><span class="spinner"></span></div>';
    API.call('verifyCertificate', { nomor: nomor }, { noRedirect: true }).then(function (d) {
      if (!Router.alive(rid)) return;
      if (!d.valid) {
        $('#vres').innerHTML = '<div class="alert alert-err">' + icon('xCircle', 'ic-lg') + '<div><b>Sertifikat tidak ditemukan</b><p class="small mt-8">Nomor <span class="mono">' + esc(d.nomor) + '</span> tidak terdaftar atau belum diterbitkan. Pastikan penulisan nomor sama persis.</p></div></div>';
        return;
      }
      $('#vres').innerHTML = '<div class="card" style="overflow:hidden"><div class="alert alert-ok" style="border:0;border-radius:0">' + icon('checkCircle', 'ic-lg') + '<div><b>Sertifikat ASLI & Valid</b><p class="small">Tercatat di basis data ' + esc(d.penerbit || CFG.APP_NAME) + '.</p></div></div>' +
        '<div class="card-pad"><div class="row-top"><div class="grow"><div class="small muted">Diberikan kepada</div><h2>' + esc(d.nama) + '</h2>' + (d.institusi ? '<div class="muted">' + esc(d.institusi) + '</div>' : '') + '</div><div class="qr-mini" style="background:#fff">' + qrSvg(location.href) + '</div></div>' +
        '<div class="divider"></div><dl class="kv"><dt>Nomor</dt><dd class="mono">' + esc(d.nomor) + '</dd><dt>Event</dt><dd>' + esc(d.event) + '</dd><dt>Tanggal event</dt><dd>' + esc(fmtDate(d.tanggal_event, true)) + '</dd>' +
        (d.lokasi ? '<dt>Lokasi</dt><dd>' + esc(d.lokasi) + '</dd>' : '') + '<dt>Diterbitkan</dt><dd>' + esc(fmtDateTime(d.tanggal_terbit)) + '</dd></dl></div></div>';
    }).catch(function (e) { $('#vres').innerHTML = '<div class="alert alert-err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>'; });
  };
  on($('#vf'), 'submit', function (e) {
    e.preventDefault();
    var n = this.nomor.value.trim();
    if (!n) return;
    history.replaceState(null, '', '#/verifikasi?nomor=' + encodeURIComponent(n));
    run(n);
  });
  if (query.nomor) run(query.nomor);
}
