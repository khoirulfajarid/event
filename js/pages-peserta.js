/* ==========================================================================
   SIM EVENT — Portal Calon Peserta & Peserta
   Status verifikasi, absensi scan QR, evaluasi wajib, sertifikat
   ========================================================================== */
'use strict';

var Portal = {
  data: null,
  load: function () {
    return API.call('pesertaStatus').then(function (d) {
      Portal.data = d;
      // sinkronkan peran (CALON → PESERTA setelah lolos)
      var role = d.pendaftar.status_verifikasi === 'lolos' ? 'PESERTA' : 'CALON';
      if (S.user && S.user.role !== role) { S.user.role = role; Store.set('user', S.user); }
      return d;
    });
  },
  head: function (d, crumb, title, sub) {
    return '<div class="page-head"><div class="grow"><div class="crumbs">Portal Peserta <span>/</span> <b>' + esc(crumb) + '</b></div>' +
      '<div class="row wrap"><h1>' + esc(title) + '</h1><span class="badge b-blue">' + icon('calendar', 'ic-sm') + ' ' + esc(d.event.nama) + '</span></div>' +
      (sub ? '<p class="muted mt-8">' + sub + '</p>' : '') + '</div>' +
      '<div class="user-pill"><div class="right"><div class="bold row" style="justify-content:flex-end">' + esc(d.pendaftar.nama) + (d.pendaftar.status_verifikasi === 'lolos' ? ' <span style="color:var(--accent)">' + icon('checkCircle', 'ic-sm') + '</span>' : '') + '</div>' +
      '<div class="xs muted mono">' + esc(d.pendaftar.id) + '</div></div><span class="avatar">' + esc(initials(d.pendaftar.nama)) + '</span></div></div>';
  },
  steps: function (d) {
    var st = d.pendaftar.status_verifikasi;
    var s = [
      { l: 'Pendaftaran', done: true },
      { l: 'Verifikasi', done: st === 'lolos', cur: st !== 'lolos' },
      { l: 'Absensi', done: d.absensi.memenuhi, cur: st === 'lolos' && !d.absensi.memenuhi },
      { l: 'Evaluasi', done: d.evaluasi.sudah, cur: d.absensi.memenuhi && !d.evaluasi.sudah },
      { l: 'Sertifikat', done: !!(d.sertifikat && d.sertifikat.status === 'terbit'), cur: d.evaluasi.sudah && !(d.sertifikat && d.sertifikat.status === 'terbit') }
    ];
    return s;
  },
  audit: function (d) {
    var steps = [
      { t: '1. Pendaftaran & Data Diri', sub: 'Terdaftar ' + fmtDateTime(d.pendaftar.tanggal_daftar), done: true, tag: 'Selesai' },
      { t: '2. Verifikasi Syarat', sub: d.ringkasSyarat.disetujui + ' dari ' + d.ringkasSyarat.total + ' syarat wajib disetujui', done: d.pendaftar.status_verifikasi === 'lolos', tag: (STATUS_LABEL[d.pendaftar.status_verifikasi] || [''])[0] }
    ];
    d.absensi.sesi.forEach(function (s, i) {
      steps.push({ t: (3 + i) + '. ' + s.nama, sub: s.hadir ? 'Scan tercatat ' + fmtTime(s.waktu_scan) : (s.status === 'buka' ? 'Sesi sedang dibuka' : 'Menunggu sesi dibuka'), done: s.hadir, tag: s.hadir ? 'Hadir' : '' });
    });
    steps.push({ t: (3 + d.absensi.sesi.length) + '. Evaluasi Wajib', sub: d.evaluasi.sudah ? 'Terkirim ' + fmtDateTime(d.evaluasi.tanggal) : 'Belum diisi', done: d.evaluasi.sudah, tag: d.evaluasi.sudah ? 'Skor ' + d.evaluasi.rata_rata : 'Wajib' });
    var doneCount = steps.filter(function (s) { return s.done; }).length;
    var firstOpen = steps.findIndex(function (s) { return !s.done; });
    return {
      done: doneCount, total: steps.length,
      html: '<div class="audit">' + steps.map(function (s, i) {
        return '<div class="audit-item ' + (s.done ? 'done' : (i === firstOpen ? 'current' : '')) + '"><span class="ai-icon">' + icon(s.done ? 'check' : (i === firstOpen ? 'clock' : 'lock'), 'ic-sm') + '</span>' +
          '<div class="grow"><div class="row between"><span class="ai-title">' + esc(s.t) + '</span>' + (s.tag ? '<span class="xs bold" style="color:' + (s.done ? 'var(--accent-dark)' : 'var(--warning)') + '">' + esc(s.tag) + '</span>' : '') + '</div><div class="ai-sub">' + esc(s.sub) + '</div></div></div>';
      }).join('') + '</div>'
    };
  }
};

function portalLocked(d, crumb, title, msg, cta) {
  return Portal.head(d, crumb, title) +
    '<div class="card card-pad narrow" style="max-width:640px"><div class="locked">' +
    '<div class="lk-icon">' + icon('lock') + '</div><h4>' + esc(title) + ' Terkunci</h4><p>' + esc(msg) + '</p>' +
    (cta ? '<div class="mt-16">' + cta + '</div>' : '') + '</div>' +
    '<div class="mt-24">' + Portal.audit(d).html + '</div></div>';
}

// --------------------------------------------------------------------------
// STATUS PENDAFTARAN
// --------------------------------------------------------------------------
function pagePortal(params, query, rid) {
  Layout.app(skeleton(4), 'status', { subtitle: 'Portal Peserta' });
  return Portal.load().then(function (d) {
    if (!Router.alive(rid)) return;
    var st = d.pendaftar.status_verifikasi;
    var canEdit = st !== 'lolos' && st !== 'ditolak';
    var steps = Portal.steps(d);

    var alertHtml = '';
    if (st === 'menunggu') alertHtml = '<div class="alert alert-info">' + icon('clock') + '<div><b>Menunggu verifikasi panitia</b><p class="small mt-8">' + (d.ringkasSyarat.terkirim < d.ringkasSyarat.total ? 'Masih ada syarat wajib yang belum Anda kirim. Lengkapi di bawah agar dapat diverifikasi.' : 'Semua syarat wajib sudah terkirim. Panitia akan meninjau berkas Anda.') + '</p></div></div>';
    if (st === 'perlu_perbaikan') alertHtml = '<div class="alert alert-warn">' + icon('alert') + '<div><b>Perbaikan berkas diperlukan</b><p class="small mt-8">Panitia menolak sebagian syarat. Baca catatan pada kartu berwarna merah, lalu unggah ulang berkas yang benar.</p></div></div>';
    if (st === 'ditolak') alertHtml = '<div class="alert alert-err">' + icon('xCircle') + '<div><b>Pendaftaran ditolak</b><p class="small mt-8">' + esc(d.pendaftar.catatan_verifikasi || 'Hubungi panitia untuk informasi lebih lanjut.') + '</p></div></div>';
    if (st === 'lolos') alertHtml = '<div class="alert alert-ok">' + icon('checkCircle') + '<div class="grow"><b>Selamat! Anda resmi menjadi Peserta.</b><p class="small mt-8">Pada hari acara, buka menu <b>Absensi Sesi</b> lalu scan QR yang ditampilkan panitia (' + d.absensi.wajib + 'x sesi wajib).</p></div><a class="btn btn-accent btn-sm" href="#/portal/absensi">' + icon('scan', 'ic-sm') + ' Absensi</a></div>';

    var syaratCards = d.syarat.map(function (s) {
      var tone = s.status === 'ditolak' ? 'border-color:#fecaca;background:#fffafa' : s.status === 'disetujui' ? 'border-color:#bbf7d0' : '';
      var editable = canEdit && s.status !== 'disetujui';
      var content = '';
      if (s.tipe === 'file') {
        content = s.ada_berkas ? '<div class="row small">' + icon('fileText', 'ic-sm') + '<span class="ellipsis">' + esc(s.file_nama || 'Berkas terkirim') + '</span><span class="muted nowrap">· ' + esc(timeAgo(s.diunggah_at)) + '</span></div>' : '<div class="small muted">Belum ada berkas.</div>';
        if (editable) content += '<label class="dropzone mt-8" style="min-height:84px;padding:12px"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-up="' + esc(s.key) + '"><span class="dz-title">' + icon('upload', 'ic-sm') + ' ' + (s.ada_berkas ? 'Ganti berkas' : 'Unggah berkas') + '</span><span class="xs muted">PDF/JPG/PNG · maks 5MB</span></label>';
      } else {
        content = s.nilai ? '<div class="small" style="word-break:break-all">' + (s.tipe === 'link' ? '<a href="' + esc(s.nilai) + '" target="_blank" rel="noopener">' + esc(s.nilai) + '</a>' : esc(s.nilai)) + '</div>' : '<div class="small muted">Belum diisi.</div>';
        if (editable) content += '<div class="row mt-8"><input class="input" data-val="' + esc(s.key) + '" placeholder="' + (s.tipe === 'link' ? 'https://…' : 'Isi di sini') + '" value="' + esc(s.nilai || '') + '"><button class="btn btn-primary btn-sm" data-save="' + esc(s.key) + '">Kirim</button></div>';
      }
      return '<div class="card card-pad-sm stack-sm" style="' + tone + '"><div class="row between"><div class="row">' +
        '<span class="section-icon" style="width:34px;height:34px">' + icon(SYARAT_ICON[s.key] || (s.tipe === 'file' ? 'file' : 'link'), 'ic-sm') + '</span>' +
        '<div><div class="bold">' + esc(s.label) + '</div><div class="xs muted">' + (s.wajib ? 'Wajib' : 'Opsional') + '</div></div></div>' + statusBadge(s.status) + '</div>' +
        (s.status === 'ditolak' && s.catatan ? '<div class="small" style="color:#93000a">' + icon('message', 'ic-sm') + ' Catatan panitia: ' + esc(s.catatan) + '</div>' : '') +
        content + '</div>';
    }).join('');

    var ev = d.event;
    $('#page').innerHTML = Portal.head(d, 'Status Pendaftaran', 'Status Pendaftaran', 'Pantau progres verifikasi dan lengkapi kekurangan berkas Anda.') +
      '<div class="card card-pad mb-16"><div class="stepper">' + steps.map(function (s) {
        return '<div class="step ' + (s.done ? 'done' : s.cur ? 'current' : '') + '"><div class="bar"></div><span class="st-label">' + (s.done ? '✓ ' : '') + esc(s.l) + '</span></div>';
      }).join('') + '</div></div>' +
      alertHtml +
      '<div class="split mt-16"><div class="stack"><div class="row between"><h3>Syarat Pendaftaran</h3><span class="small muted">' + d.ringkasSyarat.disetujui + '/' + d.ringkasSyarat.total + ' wajib disetujui</span></div>' +
      '<div class="grid-2">' + syaratCards + '</div></div>' +
      '<aside class="stack">' +
      '<div class="card card-pad-sm stack-sm"><h4>Detail Event</h4><dl class="kv"><dt>Tanggal</dt><dd>' + esc(fmtDate(ev.tanggal_mulai, true)) + '</dd><dt>Waktu</dt><dd>' + esc(ev.jam || '-') + '</dd><dt>Lokasi</dt><dd>' + esc(ev.lokasi || '-') + '</dd><dt>Absensi</dt><dd>' + ev.sesi_wajib + ' sesi wajib</dd></dl></div>' +
      (d.pembayaran ? '<div class="card card-pad-sm stack-sm"><div class="row between"><h4>Pembayaran</h4>' + statusBadge(d.pembayaran.status) + '</div><div class="kpi-value" style="font-size:22px;margin:0">' + rupiah(d.pembayaran.nominal) + '</div>' +
        (ev.info_pembayaran ? '<p class="small muted" style="white-space:pre-line">' + esc(ev.info_pembayaran) + '</p>' : '') +
        (d.pembayaran.catatan ? '<p class="small" style="color:#93000a">' + esc(d.pembayaran.catatan) + '</p>' : '') + '</div>' : '') +
      '<div class="card card-pad-sm stack-sm"><h4>Data Pendaftar</h4><dl class="kv"><dt>Email</dt><dd>' + esc(d.pendaftar.email) + '</dd><dt>WhatsApp</dt><dd>' + esc(d.pendaftar.hp) + '</dd><dt>Institusi</dt><dd>' + esc(d.pendaftar.institusi) + '</dd></dl>' +
      '<div class="alert small">' + icon('key', 'ic-sm') + '<span>Simpan kode akses Anda. Lupa kode? Gunakan tautan <b>Lupa kode</b> di halaman masuk.</span></div></div>' +
      '</aside></div>';

    var busy = false;
    $$('[data-up]').forEach(function (inp) {
      on(inp, 'change', function () {
        if (!inp.files[0] || busy) return;
        busy = true;
        var label = inp.closest('.dropzone');
        $('.dz-title', label).innerHTML = '<span class="spinner"></span> Mengunggah…';
        prepareUpload(inp.files[0])
          .then(function (f) { return API.act('pesertaUpload', { syaratKey: inp.dataset.up, file: f }); })
          .then(function () { Router.resolve(); })
          .catch(function (e) { errToast(e); $('.dz-title', label).textContent = 'Coba unggah lagi'; })
          .finally(function () { busy = false; });
      });
    });
    $$('[data-save]').forEach(function (b) {
      on(b, 'click', function () {
        var v = $('[data-val="' + b.dataset.save + '"]').value.trim();
        if (!v) return toast('Isian tidak boleh kosong.', 'err');
        btnLoading(b, true);
        API.act('pesertaUpload', { syaratKey: b.dataset.save, nilai: v }).then(function () { Router.resolve(); }).catch(function (e) { btnLoading(b, false); errToast(e); });
      });
    });
  });
}

// --------------------------------------------------------------------------
// ABSENSI — scan QR kamera + antrean offline
// --------------------------------------------------------------------------
var ScanQueue = {
  get: function () { return Store.get('scan_queue', []); },
  add: function (item) { var q = ScanQueue.get(); q.push(item); Store.set('scan_queue', q); },
  flush: function () {
    var q = ScanQueue.get();
    if (!q.length || !S.token || !navigator.onLine) return Promise.resolve(0);
    var sent = 0, rest = [];
    return q.reduce(function (p, item) {
      return p.then(function () {
        return API.call('scanAbsensi', item, { noRedirect: true }).then(function (r) { sent++; toast('Absensi tertunda terkirim: ' + r.sesi, 'ok'); })
          .catch(function (e) { if (e.network) rest.push(item); else toast('Absensi tertunda ditolak: ' + e.message, 'err'); });
      });
    }, Promise.resolve()).then(function () { Store.set('scan_queue', rest); return sent; });
  }
};

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  });
}

function pageAbsensi(params, query, rid) {
  Layout.app(skeleton(3), 'absensi', { subtitle: 'Portal Peserta' });
  return Portal.load().then(function (d) {
    if (!Router.alive(rid)) return;
    if (d.pendaftar.status_verifikasi !== 'lolos') {
      $('#page').innerHTML = portalLocked(d, 'Absensi', 'Absensi Sesi', 'Absensi aktif setelah pendaftaran Anda lolos verifikasi panitia.', '<a class="btn btn-light" href="#/portal">Lihat Status Verifikasi</a>');
      return;
    }
    var stream = null, loopTimer = null, processing = false, detector = null, deviceId = Store.get('cam_id', '');
    var ab = d.absensi;
    var active = ab.sesi.filter(function (s) { return s.status === 'buka' && !s.hadir; })[0] || ab.sesi.filter(function (s) { return !s.hadir; })[0];

    var sessionsHtml = function () {
      return ab.sesi.map(function (s) {
        var b = s.hadir ? '<span class="badge b-navy">' + icon('checkCircle', 'ic-sm') + ' Hadir</span>' : s.status === 'buka' ? statusBadge('buka', 'Sedang Dibuka') : badge('Belum Dibuka', 'gray');
        return '<div class="session-card ' + (s.hadir ? 'ok' : '') + '"><div class="row between"><span class="xs muted" style="letter-spacing:.06em">SESI ' + esc(s.urutan) + '</span>' + b + '</div>' +
          '<div class="bold mt-8">' + esc(s.nama) + '</div>' +
          '<div class="small muted row mt-8">' + icon(s.hadir ? 'clock' : 'lock', 'ic-sm') + (s.hadir ? 'Tercatat ' + esc(fmtDateTime(s.waktu_scan)) : 'Scan hanya bisa saat panitia membuka sesi') + '</div></div>';
      }).join('');
    };

    var persen = Math.min(100, pct(ab.hadir, ab.wajib));
    $('#page').innerHTML = Portal.head(d, 'Absensi Sesi', 'Absensi Sesi', 'Scan QR dinamis yang ditampilkan panitia di lokasi untuk mencatat kehadiran Anda.') +
      '<div class="split"><div class="stack">' +
      '<div class="card card-pad"><div class="row between wrap mb-16"><div class="row"><span class="pulse"></span><div><div class="xs muted" style="letter-spacing:.06em">SESI AKTIF</div><h3>' + esc(active ? active.nama : 'Semua sesi sudah tercatat') + '</h3></div></div>' +
      '<span class="badge b-gray">' + icon('pin', 'ic-sm') + ' ' + esc(d.event.lokasi || '-') + '</span></div>' +
      '<div class="scanner" id="scanner"><video id="cam" playsinline muted hidden></video><canvas id="cv" hidden></canvas>' +
      '<div class="scan-frame" id="frame" hidden><i></i><i></i><i></i><i></i><div class="scan-line"></div></div>' +
      '<div class="scan-idle" id="idle"><div class="qr-ic">' + icon('qr', 'ic-xl') + '</div><div class="bold" style="font-size:16px">Arahkan ke QR Sesi</div><p class="small" style="color:#adc8f5;margin-top:4px">Pastikan kode berada di dalam bingkai</p>' +
      '<button class="btn btn-light mt-16" id="btn-start">' + icon('camera', 'ic-sm') + ' Aktifkan Kamera</button></div>' +
      '<div class="scan-pill" id="pill" hidden><span class="pulse"></span> Kamera aktif — memindai…</div></div>' +
      '<div class="row wrap mt-16"><select class="select" id="cam-sel" style="flex:1 1 200px" aria-label="Pilih kamera"><option value="">Kamera belakang (default)</option></select>' +
      '<button class="btn btn-secondary btn-icon" id="btn-torch" title="Lampu kilat" hidden>' + icon('zap') + '</button>' +
      '<button class="btn btn-secondary" id="btn-manual">' + icon('keyboard', 'ic-sm') + ' Input Kode Manual</button>' +
      '<button class="btn btn-secondary" id="btn-stop" hidden>' + icon('x', 'ic-sm') + ' Matikan</button></div></div>' +
      '<div class="card card-pad-sm row-top" style="background:var(--surface-alt)"><span class="section-icon" style="background:#fff">' + icon('shield') + '</span><div><b>QR Dinamis Terenkripsi</b><p class="small muted mt-8">QR di layar panitia berganti otomatis tiap beberapa detik. Tangkapan layar atau kode yang diteruskan akan kedaluwarsa dan ditolak sistem.</p></div></div>' +
      '</div><aside class="stack">' +
      '<div class="card card-pad stack"><div class="row between"><div><div class="xs muted" style="letter-spacing:.06em">STATUS VALIDASI</div><h3>Kelayakan Sertifikat</h3></div><div class="right"><div class="kpi-value" style="margin:0">' + persen + '%</div><div class="xs muted">' + ab.hadir + ' dari ' + ab.wajib + ' sesi</div></div></div>' +
      '<div class="progress lg navy"><span style="width:' + persen + '%"></span></div>' +
      '<div class="alert small">' + icon('shieldCheck', 'ic-sm') + '<span>Wajib <b>' + ab.wajib + ' sesi</b> tervalidasi untuk membuka evaluasi & sertifikat.</span></div>' +
      '<div class="stack-sm" id="sess-list">' + sessionsHtml() + '</div>' +
      (ab.memenuhi ? '<a class="btn btn-accent btn-block" href="#/portal/evaluasi">' + icon('star', 'ic-sm') + ' Lanjut Isi Evaluasi</a>' : '') + '</div>' +
      '<div class="card card-pad-sm row-top"><span class="section-icon">' + icon('headset') + '</span><div><b>Kendala Scan?</b><p class="small muted mt-8">Jika kamera tidak dapat dibuka (izin ditolak, dipakai aplikasi lain, atau buram), gunakan <b>Input Kode Manual</b> — kode 8 karakter tertera di bawah QR. Atau tunjukkan ID pendaftaran Anda ke meja panitia.</p></div></div>' +
      '</aside></div>';

    var video = $('#cam'), canvas = $('#cv'), ctx2d = canvas.getContext('2d', { willReadFrequently: true });

    var submitScan = function (payload, isManual) {
      if (processing) return;
      processing = true;
      var item = { clientId: 'c' + Date.now() + Math.random().toString(36).slice(2, 7), scannedAt: Date.now() };
      if (isManual) item.kode = payload; else item.payload = payload;
      $('#pill').innerHTML = '<span class="spinner"></span> Memverifikasi kode…';
      API.call('scanAbsensi', item, { noRedirect: true }).then(function (r) {
        toast((r.sudah ? 'ℹ️ ' : '✅ ') + (r.sudah ? 'Sudah tercatat' : 'Hadir tercatat') + ' — ' + r.sesi + ' (' + r.hadir + '/' + r.wajib + ')', r.sudah ? 'warn' : 'ok', 5000);
        if (navigator.vibrate) navigator.vibrate(120);
        stopCam();
        setTimeout(function () { if (Router.alive(rid)) Router.resolve(); }, 700);
      }).catch(function (e) {
        if (e.network) {
          ScanQueue.add(item);
          toast('Koneksi terputus. Scan disimpan & akan dikirim otomatis saat online.', 'warn', 6000);
          stopCam();
        } else {
          errToast(e);
          setTimeout(function () { processing = false; if (stream) $('#pill').innerHTML = '<span class="pulse"></span> Kamera aktif — memindai…'; }, 1800);
          return;
        }
        processing = false;
      }).then(function () { if (!stream) processing = false; });
    };

    var tick = function () {
      if (!stream || video.readyState < 2) { loopTimer = setTimeout(tick, 250); return; }
      if (processing) { loopTimer = setTimeout(tick, 400); return; }
      var done = function (text) {
        if (text && /^SIMEV\|/i.test(text)) submitScan(text, false);
        else if (text) { toast('QR ini bukan QR absensi SIM Event.', 'warn'); }
        loopTimer = setTimeout(tick, text ? 1500 : 220);
      };
      if (detector) {
        detector.detect(video).then(function (codes) { done(codes[0] && codes[0].rawValue); }).catch(function () { detector = null; done(null); });
      } else if (window.jsQR) {
        var w = video.videoWidth, h = video.videoHeight, scale = Math.min(1, 720 / Math.max(w, h));
        canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
        var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        done(code && code.data);
      } else done(null);
    };

    var startCam = function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Browser tidak mendukung kamera. Gunakan Input Kode Manual.', 'err');
      if (!window.isSecureContext) return toast('Kamera hanya bisa diakses lewat HTTPS.', 'err');
      var b = $('#btn-start'); btnLoading(b, true, 'Membuka kamera…');
      var libs = ('BarcodeDetector' in window)
        ? window.BarcodeDetector.getSupportedFormats().then(function (f) { if (f.indexOf('qr_code') > -1) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); else return loadScript('js/vendor/jsQR.js'); }).catch(function () { return loadScript('js/vendor/jsQR.js'); })
        : loadScript('js/vendor/jsQR.js');
      libs.then(function () {
        var constraints = { audio: false, video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };
        return navigator.mediaDevices.getUserMedia(constraints);
      }).then(function (s) {
        if (!Router.alive(rid)) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s;
        video.srcObject = s; video.hidden = false; video.play();
        $('#idle').hidden = true; $('#frame').hidden = false; $('#pill').hidden = false; $('#btn-stop').hidden = false;
        var track = s.getVideoTracks()[0];
        var caps = track.getCapabilities ? track.getCapabilities() : {};
        $('#btn-torch').hidden = !caps.torch;
        return navigator.mediaDevices.enumerateDevices().then(function (devs) {
          var cams = devs.filter(function (x) { return x.kind === 'videoinput'; });
          var sel = $('#cam-sel');
          sel.innerHTML = cams.map(function (c, i) { return '<option value="' + esc(c.deviceId) + '"' + (track.getSettings().deviceId === c.deviceId ? ' selected' : '') + '>' + esc(c.label || 'Kamera ' + (i + 1)) + '</option>'; }).join('');
          tick();
        });
      }).catch(function (e) {
        btnLoading(b, false);
        var msg = e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, atau gunakan Input Kode Manual.'
          : e.name === 'NotReadableError' ? 'Kamera sedang dipakai aplikasi lain (Zoom/WA/kamera bawaan). Tutup aplikasi tersebut atau gunakan Input Kode Manual.'
          : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'Kamera tidak ditemukan. Gunakan Input Kode Manual.'
          : (e.message || 'Kamera tidak dapat dibuka.');
        toast(msg, 'err', 7000);
        if (deviceId) { deviceId = ''; Store.del('cam_id'); }
      });
    };
    var stopCam = function () {
      clearTimeout(loopTimer);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
      if (!$('#cam')) return;
      video.hidden = true; $('#frame').hidden = true; $('#pill').hidden = true; $('#btn-stop').hidden = true; $('#btn-torch').hidden = true;
      $('#idle').hidden = false; btnLoading($('#btn-start'), false);
    };
    Router.onLeave(stopCam);

    on($('#btn-start'), 'click', startCam);
    on($('#btn-stop'), 'click', stopCam);
    on($('#cam-sel'), 'change', function () { deviceId = this.value; Store.set('cam_id', deviceId); if (stream) { stopCam(); startCam(); } });
    var torchOn = false;
    on($('#btn-torch'), 'click', function () {
      if (!stream) return;
      torchOn = !torchOn;
      stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: torchOn }] }).catch(function () { toast('Lampu kilat tidak didukung.', 'warn'); });
    });
    on($('#btn-manual'), 'click', function () {
      var m = openModal({
        title: 'Input Kode Sesi Manual',
        body: '<p class="small muted">Masukkan kode 8 karakter yang tertera di bawah QR pada layar panitia.</p><input class="input mono mt-16" id="man-code" maxlength="8" placeholder="A1B2C3D4" style="text-transform:uppercase;letter-spacing:6px;font-size:22px;height:56px;text-align:center" autocomplete="off">',
        foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="man-ok">' + icon('check', 'ic-sm') + ' Kirim Absensi</button>'
      });
      var inp = $('#man-code', m.el); inp.focus();
      var send = function () { var v = inp.value.trim().toUpperCase(); if (v.length < 6) return toast('Kode minimal 6 karakter.', 'err'); m.close(); submitScan(v, true); };
      on($('#man-ok', m.el), 'click', send);
      on(inp, 'keydown', function (e) { if (e.key === 'Enter') send(); });
    });

    if (ScanQueue.get().length) ScanQueue.flush().then(function (n) { if (n && Router.alive(rid)) Router.resolve(); });
  });
}

// --------------------------------------------------------------------------
// EVALUASI
// --------------------------------------------------------------------------
var EVAL_Q = {
  rating: [
    { k: 'kualitas', t: 'Kualitas Event & Nilai Materi Secara Keseluruhan', s: 'Struktur, alur acara, relevansi topik, dan manfaat profesional.' },
    { k: 'materi', t: 'Kedalaman Materi & Kompetensi Pembicara', s: 'Penguasaan materi, kejelasan penyampaian, dan sesi tanya jawab.' },
    { k: 'workshop', t: 'Sesi Praktik / Diskusi & Fasilitasi', s: 'Interaksi, studi kasus, dan pendampingan fasilitator.' }
  ],
  logistik: [
    { k: 'registrasi', t: 'Kemudahan Registrasi & Meja Check-in' },
    { k: 'audio', t: 'Audio Visual, Panggung & Kualitas Siaran' },
    { k: 'portal', t: 'Portal SIM Event & Pengalaman Scan Absensi' }
  ],
  rekomendasi: [
    { k: 'pasti', t: 'Pasti', ic: 'thumbsUp' }, { k: 'mungkin', t: 'Mungkin', ic: 'smile' }, { k: 'ragu', t: 'Ragu-ragu', ic: 'meh' }, { k: 'tidak', t: 'Tidak', ic: 'frown' }
  ]
};
var RATING_LABEL = ['', 'Buruk', 'Kurang', 'Cukup', 'Sangat Baik', 'Istimewa'];

function pageEvaluasi(params, query, rid) {
  Layout.app(skeleton(4), 'evaluasi', { subtitle: 'Portal Peserta' });
  return Portal.load().then(function (d) {
    if (!Router.alive(rid)) return;
    if (d.pendaftar.status_verifikasi !== 'lolos') {
      $('#page').innerHTML = portalLocked(d, 'Evaluasi', 'Evaluasi Event', 'Evaluasi terbuka setelah Anda lolos verifikasi dan memenuhi absensi.', '<a class="btn btn-light" href="#/portal">Lihat Status</a>');
      return;
    }
    if (!d.absensi.memenuhi) {
      $('#page').innerHTML = portalLocked(d, 'Evaluasi', 'Evaluasi Event', 'Selesaikan ' + d.absensi.wajib + ' sesi absensi wajib (' + d.absensi.hadir + '/' + d.absensi.wajib + ' tercatat) untuk membuka evaluasi.', '<a class="btn btn-light" href="#/portal/absensi">' + icon('scan', 'ic-sm') + ' Ke Halaman Absensi</a>');
      return;
    }
    if (d.evaluasi.sudah) {
      $('#page').innerHTML = Portal.head(d, 'Evaluasi', 'Evaluasi Event') +
        '<div class="card card-pad center stack narrow" style="align-items:center;max-width:620px"><span class="section-icon" style="width:60px;height:60px;border-radius:50%;background:var(--accent-soft);color:var(--accent-dark)">' + icon('checkCircle', 'ic-xl') + '</span>' +
        '<h2>Terima kasih atas evaluasi Anda!</h2><p class="muted">Dikirim ' + esc(fmtDateTime(d.evaluasi.tanggal)) + ' · skor rata-rata ' + esc(d.evaluasi.rata_rata) + '/5</p>' +
        '<a class="btn btn-accent btn-lg" href="#/portal/sertifikat">' + icon('award') + ' Lihat Sertifikat Saya</a></div>';
      return;
    }

    var draftKey = 'draft_eval_' + d.pendaftar.id;
    var A = Store.get(draftKey, { rating: {}, logistik: {}, rekomendasi: '', takeaway: '', saran: '', izin_kutip: true });
    var audit = Portal.audit(d);
    var progress = Math.round(audit.done / audit.total * 100);

    $('#page').innerHTML =
      '<div class="page-head"><div class="grow"><div class="crumbs">Portal Peserta <span>/</span> ' + esc(d.event.nama) + ' <span>/</span> <b>Evaluasi Pasca-Event</b></div>' +
      '<h1>Evaluasi & Umpan Balik Event</h1><p class="muted mt-8">Lengkapi evaluasi wajib ini untuk membuka sertifikat dan arsip materi.</p></div>' +
      '<div class="row wrap"><span class="badge b-navy" style="height:30px;padding:0 12px">' + icon('calendar', 'ic-sm') + ' ' + esc(d.event.nama) + '</span><span class="badge b-gray" style="height:30px">' + icon('clock', 'ic-sm') + ' ± 3 menit</span></div></div>' +
      '<div class="alert alert-warn mb-16">' + icon('lock') + '<div class="grow"><div class="row wrap"><b>Evaluasi Wajib untuk Membuka Sertifikat</b><span class="badge b-amber">LANGKAH ' + (audit.total) + ' DARI ' + audit.total + '</span></div><p class="small mt-8">Masukan jujur Anda membantu panitia menyempurnakan materi dan pembicara. Setelah dikirim, sertifikat PDF Anda langsung diterbitkan.</p></div><span class="small row nowrap"><span class="status-dot amber"></span> Belum dikirim</span></div>' +
      '<div class="split"><form id="ev-form" class="stack" novalidate>' +
      '<section class="card section-card"><div class="section-head"><span class="section-num">01</span><div class="grow"><h3>Pengalaman Event & Pembicara</h3><p class="small muted">Nilai kualitas materi, relevansi sesi, dan kesiapan pembicara.</p></div><span class="xs" style="color:var(--error)">* Wajib</span></div><div class="stack">' +
      EVAL_Q.rating.map(function (q, i) {
        return '<div class="q-box"><div class="row between wrap"><b>' + (i + 1) + '. ' + esc(q.t) + '</b><span class="small bold" data-rlabel="' + q.k + '">' + (A.rating[q.k] ? RATING_LABEL[A.rating[q.k]] + ' (' + A.rating[q.k] + '/5)' : '') + '</span></div><p class="small muted">' + esc(q.s) + '</p>' +
          '<div class="stars" data-stars="' + q.k + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="star ' + (A.rating[q.k] >= n ? 'on' : '') + '" data-v="' + n + '" aria-label="' + n + ' bintang">' + icon('star') + '</button>'; }).join('') + '</div></div>';
      }).join('') +
      '<div><b>4. Apakah Anda akan merekomendasikan event ini kepada rekan?</b><div class="choice-grid mt-8">' +
      EVAL_Q.rekomendasi.map(function (c) { return '<button type="button" class="choice ' + (A.rekomendasi === c.k ? 'active' : '') + '" data-rek="' + c.k + '">' + icon(c.ic, 'ic-lg') + esc(c.t) + '</button>'; }).join('') + '</div></div></div></section>' +

      '<section class="card section-card"><div class="section-head"><span class="section-num">02</span><div class="grow"><h3>Logistik, Platform & Operasional</h3><p class="small muted">Skala 1 (Buruk) hingga 5 (Istimewa).</p></div><span class="xs" style="color:var(--error)">* Wajib</span></div><div class="stack">' +
      EVAL_Q.logistik.map(function (q) {
        return '<div class="q-box"><div class="row between wrap"><b>' + esc(q.t) + '</b><span class="small muted" data-slabel="' + q.k + '">' + (A.logistik[q.k] ? 'Nilai: ' + A.logistik[q.k] + ' — ' + RATING_LABEL[A.logistik[q.k]] : '') + '</span></div>' +
          '<div class="scale" data-scale="' + q.k + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="' + (A.logistik[q.k] === n ? 'active' : '') + '" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div></section>' +

      '<section class="card section-card"><div class="section-head"><span class="section-num">03</span><div class="grow"><h3>Umpan Balik Kualitatif</h3><p class="small muted">Tanggapan tertulis untuk ditinjau panitia.</p></div><span class="xs" style="color:var(--error)">* Wajib</span></div><div class="stack">' +
      '<div class="field"><label class="label">Apa pembelajaran paling berharga yang Anda dapat dari event ini? <span class="req">*</span></label><span class="hint">Jelaskan bagaimana materi dapat Anda terapkan.</span>' +
      '<textarea class="textarea" id="takeaway" maxlength="500" rows="4">' + esc(A.takeaway) + '</textarea><div class="row between xs"><span class="muted">Minimal 30 karakter</span><span id="tk-count"></span></div></div>' +
      '<div class="field"><label class="label">Topik, pembicara, atau materi yang ingin Anda lihat berikutnya? <span class="muted">(opsional)</span></label><textarea class="textarea" id="saran" maxlength="500" rows="3" placeholder="mis. Fintech syariah, manajemen risiko wakaf, kelas lanjutan…">' + esc(A.saran) + '</textarea></div>' +
      '<div class="q-box"><b>Bolehkah umpan balik Anda dikutip secara anonim dalam laporan event?</b><p class="small muted">Kutipan dilepaskan dari identitas pribadi.</p><div class="row wrap mt-8" style="gap:18px">' +
      '<label class="checkbox"><input type="radio" name="izin" value="1"' + (A.izin_kutip ? ' checked' : '') + '> Ya, boleh dikutip anonim</label><label class="checkbox"><input type="radio" name="izin" value="0"' + (!A.izin_kutip ? ' checked' : '') + '> Tidak, rahasiakan</label></div></div>' +
      '</div></section>' +
      '<div class="sticky-bar"><span class="small muted row" id="ev-draft"><span class="status-dot"></span> Draf tersimpan otomatis</span>' +
      '<div class="row wrap"><a class="btn btn-secondary" href="#/portal">Simpan & Lanjut Nanti</a><button class="btn btn-navy" type="submit" id="ev-submit">' + icon('shieldCheck', 'ic-sm') + ' Kirim Evaluasi & Buka Sertifikat ' + icon('arrowRight', 'ic-sm') + '</button></div></div>' +
      '</form>' +
      '<aside class="stack"><div class="card card-pad-sm stack-sm"><div class="row between"><h4>Audit Prasyarat</h4><span class="badge b-blue">' + audit.done + ' DARI ' + audit.total + ' SELESAI</span></div>' + audit.html +
      '<div class="q-box" style="padding:10px 12px"><div class="row between xs"><span>Progres Pembukaan Sertifikat</span><b>' + progress + '%</b></div><div class="progress mt-8"><span style="width:' + progress + '%"></span></div></div>' +
      '<div class="locked"><div class="lk-icon">' + icon('lock') + '</div><h4>Sertifikat Terkunci</h4><p>Mengirim evaluasi ini langsung membuka unduhan PDF & tautan verifikasi publik sertifikat Anda.</p></div></div>' +
      '<div class="card card-pad-sm stack-sm"><div class="row">' + icon('shield') + '<b>Kerahasiaan Terjaga</b></div><p class="small muted">Jawaban diolah secara agregat. Data mentah hanya dapat diakses panitia event untuk evaluasi program.</p></div>' +
      '</aside></div>';

    var save = debounce(function () { Store.set(draftKey, A); var el = $('#ev-draft'); if (el) el.innerHTML = '<span class="status-dot"></span> Draf tersimpan ' + new Date().toTimeString().slice(0, 5); }, 400);
    var tk = $('#takeaway');
    var countTk = function () { var n = tk.value.trim().length; $('#tk-count').innerHTML = '<span style="color:' + (n >= 30 ? 'var(--accent-dark)' : 'var(--warning)') + '">' + n + ' / 500 karakter</span>'; };
    countTk();

    $$('[data-stars]').forEach(function (wrap) {
      $$('.star', wrap).forEach(function (b) {
        on(b, 'click', function () {
          var v = +b.dataset.v, k = wrap.dataset.stars;
          A.rating[k] = v;
          $$('.star', wrap).forEach(function (x) { x.classList.toggle('on', +x.dataset.v <= v); });
          $('[data-rlabel="' + k + '"]').textContent = RATING_LABEL[v] + ' (' + v + '/5)';
          save();
        });
      });
    });
    $$('[data-rek]').forEach(function (b) {
      on(b, 'click', function () { A.rekomendasi = b.dataset.rek; $$('[data-rek]').forEach(function (x) { x.classList.toggle('active', x === b); }); save(); });
    });
    $$('[data-scale]').forEach(function (wrap) {
      $$('button', wrap).forEach(function (b) {
        on(b, 'click', function () {
          var v = +b.dataset.v, k = wrap.dataset.scale;
          A.logistik[k] = v;
          $$('button', wrap).forEach(function (x) { x.classList.toggle('active', x === b); });
          $('[data-slabel="' + k + '"]').textContent = 'Nilai: ' + v + ' — ' + RATING_LABEL[v];
          save();
        });
      });
    });
    on(tk, 'input', function () { A.takeaway = tk.value; countTk(); save(); });
    on($('#saran'), 'input', function () { A.saran = this.value; save(); });
    $$('input[name=izin]').forEach(function (r) { on(r, 'change', function () { A.izin_kutip = r.value === '1'; save(); }); });

    on($('#ev-form'), 'submit', function (e) {
      e.preventDefault();
      var miss = EVAL_Q.rating.filter(function (q) { return !A.rating[q.k]; }).length + EVAL_Q.logistik.filter(function (q) { return !A.logistik[q.k]; }).length;
      if (miss) return toast('Masih ada ' + miss + ' penilaian yang belum diisi.', 'err');
      if (!A.rekomendasi) return toast('Pilih jawaban pertanyaan rekomendasi.', 'err');
      if (A.takeaway.trim().length < 30) { tk.classList.add('invalid'); tk.focus(); return toast('Pembelajaran paling berharga minimal 30 karakter.', 'err'); }
      var b = $('#ev-submit'); btnLoading(b, true, 'Mengirim & menerbitkan sertifikat…');
      API.act('submitEvaluasi', A).then(function () {
        Store.del(draftKey);
        Router.go('#/portal/sertifikat');
      }).catch(function (err) { btnLoading(b, false); errToast(err); });
    });
  });
}

// --------------------------------------------------------------------------
// SERTIFIKAT
// --------------------------------------------------------------------------
function verifyUrl(nomor, base) {
  var root = base || (location.origin + location.pathname);
  return root.replace(/\/?$/, '/').replace(/index\.html\/$/, '') + '#/verifikasi?nomor=' + encodeURIComponent(nomor);
}

function sigSvg(seed) {
  var h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  var a = 8 + h % 10, b = 22 + h % 14;
  return '<svg class="sig-draw" viewBox="0 0 140 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 26c10-2 14-' + a + ' 22-' + a + 's4 16 12 14 8-' + b / 2 + ' 16-' + b / 2 + ' 6 12 14 10 10-10 18-10 8 8 16 6 12-6 30-4"/></svg>';
}

function pageSertifikat(params, query, rid) {
  Layout.app(skeleton(4), 'sertifikat', { subtitle: 'Portal Peserta' });
  return Portal.load().then(function (d) {
    if (!Router.alive(rid)) return;
    var audit = Portal.audit(d);
    if (d.pendaftar.status_verifikasi !== 'lolos' || !d.absensi.memenuhi || !d.evaluasi.sudah) {
      var cta = d.pendaftar.status_verifikasi !== 'lolos' ? '<a class="btn btn-light" href="#/portal">Lihat Status</a>'
        : !d.absensi.memenuhi ? '<a class="btn btn-light" href="#/portal/absensi">' + icon('scan', 'ic-sm') + ' Selesaikan Absensi</a>'
        : '<a class="btn btn-accent" href="#/portal/evaluasi">' + icon('star', 'ic-sm') + ' Isi Evaluasi (± 3 menit)</a>';
      $('#page').innerHTML = portalLocked(d, 'Sertifikat', 'Sertifikat', 'Selesaikan seluruh prasyarat — verifikasi, absensi ' + d.absensi.wajib + ' sesi, dan evaluasi wajib — untuk membuka sertifikat Anda.', cta);
      return;
    }
    var sert = d.sertifikat || { nomor: '', status: 'antri' };
    var url = sert.nomor ? verifyUrl(sert.nomor, d.urlFrontend) : '';
    var ttd = (d.penandatangan || []).slice(0, 2);
    var terbit = sert.status === 'terbit';

    $('#page').innerHTML =
      '<div class="page-head"><div class="grow"><div class="crumbs">Portal Peserta <span>/</span> <b>Repositori Sertifikat</b></div><div class="row wrap"><h1>Sertifikat Saya</h1><span class="badge b-blue">' + icon('calendar', 'ic-sm') + ' ' + esc(d.event.nama) + '</span></div></div>' +
      '<div class="user-pill"><div class="right"><div class="bold">' + esc(d.pendaftar.nama) + ' <span style="color:var(--accent)">' + icon('checkCircle', 'ic-sm') + '</span></div><div class="xs muted">ID ' + esc(d.pendaftar.id) + (sert.tanggal_terbit ? ' • Terbit ' + esc(fmtDate(sert.tanggal_terbit)) : '') + '</div></div><span class="avatar">' + esc(initials(d.pendaftar.nama)) + '</span></div></div>' +
      (terbit
        ? '<div class="alert alert-ok mb-16">' + icon('shieldCheck', 'ic-lg') + '<div class="grow"><div class="row wrap"><b style="font-size:16px">Sertifikat Terverifikasi & Diterbitkan</b><span class="badge b-green">Tercatat di Basis Data</span></div><p class="small mt-8">Absensi ' + d.absensi.hadir + '/' + d.absensi.wajib + ' sesi dan evaluasi wajib tervalidasi 100% pada ' + esc(fmtDateTime(sert.tanggal_terbit)) + ' WIB.</p></div><span class="badge b-green" style="height:30px;padding:0 14px">Status: Aktif & Valid</span></div>'
        : '<div class="alert alert-info mb-16">' + icon('clock') + '<div class="grow"><b>Sertifikat sedang disiapkan</b><p class="small mt-8">Klik <b>Unduh PDF</b> untuk menerbitkan sekarang, atau tunggu proses antrean otomatis.</p></div></div>') +
      '<div class="split"><div class="stack">' +
      '<div class="card card-pad-sm row wrap"><span class="small muted row">' + icon('shield', 'ic-sm') + ' Nomor unik: <b class="mono">' + esc(sert.nomor || '-') + '</b></span><span class="grow"></span>' +
      (url ? '<button class="btn btn-secondary btn-sm" id="cp-link">' + icon('link', 'ic-sm') + ' Salin Tautan Publik</button>' +
        '<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) + '">' + icon('share', 'ic-sm') + ' Bagikan ke LinkedIn</a>' +
        '<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="' + waLink('', 'Sertifikat saya untuk ' + d.event.nama + ': ' + url) + '">' + icon('message', 'ic-sm') + ' WhatsApp</a>' : '') + '</div>' +
      '<div class="card card-pad"><div class="cert" id="cert-preview"><span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>' +
      '<div class="row between"><div class="row"><span class="brand-mark" style="width:44px;height:44px;border-radius:10px">' + icon('award', 'ic-lg') + '</span><div><div style="font-family:var(--font-head);font-size:18px;font-weight:600;color:var(--navy)">' + esc(d.penerbit || CFG.ORG_NAME) + '</div><div class="xs muted" style="letter-spacing:.12em">LEMBAGA PENYELENGGARA</div></div></div>' +
      '<span style="width:62px;height:62px;border-radius:50%;border:2px solid var(--primary-fixed);display:grid;place-items:center;color:var(--primary);font-size:9px;font-weight:700;text-align:center;line-height:10px">' + icon('award') + '<br>RESMI</span></div>' +
      '<div class="cert-title">SERTIFIKAT KEIKUTSERTAAN</div><p class="center small muted" style="font-style:italic;margin-top:6px">Diberikan dengan hormat kepada</p>' +
      '<div class="cert-name">' + esc(d.pendaftar.nama) + '</div><div class="cert-line"></div>' +
      '<p class="center" style="line-height:24px;color:var(--muted-2);max-width:560px;margin:0 auto">' + (d.pendaftar.institusi ? esc(d.pendaftar.institusi) + ', ' : '') + 'atas partisipasi aktif, pemenuhan ' + d.absensi.wajib + ' sesi validasi kehadiran, dan penyelesaian evaluasi pada kegiatan <b style="color:var(--navy)">' + esc(d.event.nama) + '</b> yang diselenggarakan pada ' + esc(fmtDate(d.event.tanggal_mulai, true)) + '.</p>' +
      '<div class="cert-meta"><div><span>NOMOR SERTIFIKAT</span><b class="mono" style="font-size:13px">' + esc(sert.nomor || '—') + '</b></div><div><span>TANGGAL TERBIT</span><b>' + esc(sert.tanggal_terbit ? fmtDate(sert.tanggal_terbit, true) : '—') + '</b></div><div><span>KATEGORI</span><b>' + esc(d.event.kategori || 'Peserta') + '</b></div></div>' +
      '<div class="cert-sign">' + (ttd.length ? ttd : [{ nama: 'Ketua Panitia', jabatan: 'Penyelenggara' }]).map(function (t) { return '<div>' + sigSvg(t.nama) + '<div class="sig"><b>' + esc(t.nama) + '</b><div class="xs muted">' + esc(t.jabatan) + '</div></div></div>'; }).join('') +
      (url ? '<div class="qr-mini">' + qrSvg(url, 3) + '<div class="xs"><b style="letter-spacing:.04em">VERIFIKASI PUBLIK</b><div class="muted mono" style="font-size:9px;word-break:break-all">' + esc(sert.nomor) + '</div><div style="color:var(--accent-dark);font-weight:700">● Tercatat</div></div></div>' : '') +
      '</div></div></div>' +
      '<div class="grid-3" style="gap:12px"><button class="btn btn-navy btn-lg" id="btn-dl" style="height:60px">' + icon('download') + ' Unduh PDF Resmi</button>' +
      '<button class="btn btn-secondary btn-lg" style="height:60px" onclick="window.print()">' + icon('printer') + ' Cetak Pratinjau</button>' +
      '<a class="btn btn-secondary btn-lg" style="height:60px" href="' + esc(url ? '#/verifikasi?nomor=' + encodeURIComponent(sert.nomor) : '#/verifikasi') + '">' + icon('shieldCheck') + ' Halaman Verifikasi</a></div>' +
      '</div><aside class="stack">' +
      '<div class="card card-pad-sm stack-sm"><div class="row between"><h4>' + icon('clipboard', 'ic-sm') + ' Audit Prasyarat</h4><span class="badge b-green">' + audit.done + '/' + audit.total + ' Lulus</span></div><p class="small muted">Seluruh kriteria diverifikasi otomatis oleh sistem.</p>' + audit.html + '</div>' +
      (url ? '<div class="card card-pad-sm stack-sm"><h4>' + icon('globe', 'ic-sm') + ' Registri Publik</h4><p class="small muted">Siapa pun dengan tautan atau QR ini dapat memverifikasi keaslian sertifikat Anda tanpa login.</p>' +
        '<div class="row" style="background:var(--surface-alt);border-radius:8px;padding:6px 6px 6px 10px"><span class="mono ellipsis grow" style="font-size:11px">' + esc(url) + '</span><button class="btn btn-primary btn-xs" id="cp-link2">' + icon('copy', 'ic-sm') + ' Salin</button></div>' +
        '<div class="row-top q-box"><div style="width:84px;flex:none;background:#fff;padding:4px;border-radius:6px">' + qrSvg(url, 3) + '</div><div><b class="small">Scan dari Ponsel</b><p class="xs muted mt-8">Arahkan kamera ke QR untuk membuka halaman validasi langsung.</p></div></div></div>' : '') +
      '</aside></div>';

    on($('#cp-link'), 'click', function () { copyText(url, 'Tautan verifikasi'); });
    on($('#cp-link2'), 'click', function () { copyText(url, 'Tautan verifikasi'); });
    on($('#btn-dl'), 'click', function () {
      var b = this; btnLoading(b, true, terbit ? 'Mengunduh…' : 'Menerbitkan…');
      API.call('downloadSertifikat').then(function (f) {
        downloadBlob(b64ToBlob(f.base64, f.mime), f.fileName || 'sertifikat.pdf');
        toast('Sertifikat ' + f.nomor + ' diunduh.', 'ok');
        if (!terbit) Router.resolve();
      }).catch(errToast).finally(function () { btnLoading(b, false); });
    });
  });
}
