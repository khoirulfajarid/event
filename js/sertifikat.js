/* ==========================================================================
   SIM EVENT — Desain Sertifikat (format "Pratinjau")
   Satu sumber render untuk: pratinjau di layar, PDF yang diunduh peserta,
   dan PDF yang diarsipkan/dikirim via email. Hasil PDF = persis pratinjau.
   Ukuran kanvas: A4 landscape 1123 × 794 px (96 dpi).
   ========================================================================== */
'use strict';

var CertDesign = {
  W: 1123,
  H: 794,

  svgUri: function (svg) { return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); },

  iconUri: function (name, color, stroke) {
    return CertDesign.svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="' + (color || '#fff') +
      '" stroke-width="' + (stroke || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>');
  },

  squiggle: function (seed, color) {
    var h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    var a = 8 + h % 10, b = 22 + h % 14;
    return CertDesign.svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="280" height="72" viewBox="0 0 140 36" fill="none" stroke="' + (color || '#022448') +
      '" stroke-width="1.6" stroke-linecap="round"><path d="M4 26c10-2 14-' + a + ' 22-' + a + 's4 16 12 14 8-' + b / 2 + ' 16-' + b / 2 + ' 6 12 14 10 10-10 18-10 8 8 16 6 12-6 30-4"/></svg>');
  },

  dots: function () {
    return CertDesign.svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="2" cy="2" r="1.2" fill="#022448" fill-opacity=".06"/></svg>');
  },

  /** Susun data render dari aset desain + baris sertifikat peserta. */
  data: function (assets, row) {
    var ds = assets.desain || {}, ev = assets.event || {}, aset = assets.aset || {};
    var nomor = row.nomor || 'SIMEV/KODE/2026/0001';
    var base = assets.urlFrontend || (location.origin + location.pathname);
    var verify = base.replace(/index\.html$/, '').replace(/\/?$/, '/') + '#/verifikasi?nomor=' + encodeURIComponent(nomor);
    return {
      nama: row.nama || 'Nama Peserta', institusi: row.institusi || '', nomor: nomor,
      tanggalTerbit: row.tanggal_terbit ? fmtDate(row.tanggal_terbit, true) : fmtDate(new Date().toISOString().slice(0, 10), true),
      event: ev.nama || 'Nama Event', tanggalEvent: fmtDate(ev.tanggal_mulai, true), sesi: ev.sesi_wajib || 1,
      judul: ds.judul || 'SERTIFIKAT KEIKUTSERTAAN', pengantar: ds.pengantar || 'Diberikan dengan hormat kepada',
      penerbit: ds.penerbit || CFG.ORG_NAME, subjudul: ds.subjudul || 'LEMBAGA PENYELENGGARA', kategori: ds.kategori || ev.kategori || 'Peserta',
      deskripsi: ds.deskripsi || '{institusi}, atas partisipasi aktif, pemenuhan {sesi} sesi validasi kehadiran, dan penyelesaian evaluasi pada kegiatan {event} yang diselenggarakan pada {tanggal}.',
      warna: ds.warna || '#022448', overlay: ds.overlay === undefined ? 0.9 : Number(ds.overlay),
      bg: aset.bg || '', logo: aset.logo || '',
      ttd: [0, 1].map(function (i) { var t = (ds.ttd || [])[i] || {}; return { nama: t.nama || '', jabatan: t.jabatan || '', img: aset['ttd' + (i + 1)] || '' }; }),
      verifyUrl: verify, qr: qrDataUrl(verify, 5)
    };
  },

  deskripsiHtml: function (d) {
    var t = String(d.deskripsi);
    if (!d.institusi) t = t.replace(/^\s*\{institusi\}\s*,?\s*/i, '').replace(/^./, function (c) { return c.toUpperCase(); });
    return esc(t)
      .replace(/\{institusi\}/g, esc(d.institusi))
      .replace(/\{sesi\}/g, esc(d.sesi))
      .replace(/\{tanggal\}/g, esc(d.tanggalEvent))
      .replace(/\{nama\}/g, esc(d.nama))
      .replace(/\{kategori\}/g, esc(d.kategori))
      .replace(/\{event\}/g, '<b style="color:' + esc(d.warna) + ';font-weight:700">' + esc(d.event) + '</b>');
  },

  /** HTML kanvas sertifikat berukuran tetap. Semua gambar berupa data URI (aman untuk html2canvas). */
  html: function (d) {
    var c = d.warna, W = CertDesign.W, H = CertDesign.H;
    var font = "'Inter','Segoe UI',Arial,sans-serif", head = "'Sora','Segoe UI',Arial,sans-serif", mono = "'JetBrains Mono',Consolas,monospace";
    var corner = function (pos) {
      var b = 'position:absolute;width:44px;height:44px;border:2.5px solid #94a3b8;';
      return '<div style="' + b + pos + '"></div>';
    };
    var sig = function (t, i) {
      var img = t.img
        ? '<div style="height:78px;width:250px;background:url(' + t.img + ') left bottom/contain no-repeat;margin-bottom:2px"></div>'
        : '<img src="' + CertDesign.squiggle(t.nama || ('ttd' + i), c) + '" style="height:56px;width:210px;display:block;margin:14px 0 8px">';
      return '<div style="flex:1;min-width:0">' + img +
        '<div style="border-top:2px solid #c4c6cf;padding-top:10px">' +
        '<div style="font-family:' + head + ';font-weight:600;font-size:19px;color:#0f172a;line-height:24px">' + esc(t.nama || ' ') + '</div>' +
        '<div style="font-size:14px;color:#64748b;line-height:20px">' + esc(t.jabatan || ' ') + '</div></div></div>';
    };
    return '<div class="cert-a4" style="position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#fff;font-family:' + font + ';color:#0f172a;box-sizing:border-box">' +
      (d.bg ? '<div style="position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;background:url(' + d.bg + ') center/cover no-repeat"></div>' : '') +
      '<div style="position:absolute;left:0;top:0;right:0;bottom:0;background-color:rgba(255,255,255,' + (d.bg ? d.overlay : 1) + ');background-image:url(' + CertDesign.dots() + ');background-repeat:repeat"></div>' +
      '<div style="position:absolute;left:14px;top:14px;right:14px;bottom:14px;border:1px solid #e2e8f0"></div>' +
      corner('left:34px;top:34px;border-right:0;border-bottom:0') + corner('right:34px;top:34px;border-left:0;border-bottom:0') +
      corner('left:34px;bottom:34px;border-right:0;border-top:0') + corner('right:34px;bottom:34px;border-left:0;border-top:0') +
      '<div style="position:absolute;left:70px;right:70px;top:58px;bottom:56px;display:flex;flex-direction:column">' +
      // Header
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
      (d.logo
        ? '<div style="width:70px;height:70px;background:url(' + d.logo + ') center/contain no-repeat"></div>'
        : '<div style="width:70px;height:70px;border-radius:14px;background:' + c + ';display:flex;align-items:center;justify-content:center"><img src="' + CertDesign.iconUri('award', '#fff', 1.8) + '" style="width:38px;height:38px"></div>') +
      '<div><div style="font-family:' + head + ';font-size:28px;font-weight:600;color:' + c + ';line-height:34px">' + esc(d.penerbit) + '</div>' +
      '<div style="font-size:14px;letter-spacing:3px;color:#43474e;margin-top:2px">' + esc(String(d.subjudul).toUpperCase()) + '</div></div></div>' +
      '<div style="width:104px;height:104px;border-radius:52px;border:3px solid #d5e3ff;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<img src="' + CertDesign.iconUri('award', c, 1.8) + '" style="width:30px;height:30px"><div style="font-size:11px;font-weight:700;color:' + c + ';margin-top:6px;letter-spacing:.5px">RESMI</div></div></div>' +
      // Title
      '<div style="text-align:center;margin-top:26px">' +
      '<div style="font-family:' + head + ';font-size:24px;letter-spacing:7px;color:#1e3a5f;font-weight:500">' + esc(d.judul) + '</div>' +
      '<div style="font-style:italic;font-size:17px;color:#64748b;margin-top:8px">' + esc(d.pengantar) + '</div>' +
      '<div style="font-family:' + head + ';font-size:' + (d.nama.length > 28 ? 50 : 66) + 'px;line-height:1.15;font-weight:700;color:' + c + ';text-transform:uppercase;margin-top:14px;letter-spacing:-1px;word-break:break-word">' + esc(d.nama) + '</div>' +
      '<div style="width:340px;height:2px;background:#c4c6cf;margin:16px auto 0"></div>' +
      '<div style="font-size:20px;line-height:34px;color:#43474e;max-width:900px;margin:18px auto 0">' + CertDesign.deskripsiHtml(d) + '</div></div>' +
      // Meta
      '<div style="display:flex;background:#f1f5f9;border-radius:12px;padding:18px 10px;margin-top:auto;text-align:center">' +
      [['NOMOR SERTIFIKAT', '<span style="font-family:' + mono + ';font-size:17px">' + esc(d.nomor) + '</span>'], ['TANGGAL TERBIT', esc(d.tanggalTerbit)], ['KATEGORI', esc(d.kategori)]].map(function (m) {
        return '<div style="flex:1;min-width:0;padding:0 8px"><div style="font-size:13px;letter-spacing:1.5px;color:#43474e">' + m[0] + '</div>' +
          '<div style="font-size:20px;font-weight:700;color:' + c + ';margin-top:6px;word-break:break-word">' + m[1] + '</div></div>';
      }).join('') + '</div>' +
      // Signatures + QR
      '<div style="display:flex;align-items:flex-end;gap:40px;margin-top:22px">' +
      sig(d.ttd[0], 1) + sig(d.ttd[1], 2) +
      '<div style="flex:none;width:236px;display:flex;gap:12px;align-items:center;background:#f1f5f9;border-radius:12px;padding:10px">' +
      (d.qr ? '<img src="' + d.qr + '" style="width:92px;height:92px;background:#fff;padding:4px;box-sizing:border-box">' : '') +
      '<div style="min-width:0"><div style="font-size:13px;font-weight:700;letter-spacing:.5px;color:#0f172a;line-height:16px">VERIFIKASI<br>PUBLIK</div>' +
      '<div style="font-family:' + mono + ';font-size:10px;color:#64748b;margin-top:5px;word-break:break-all;line-height:13px">' + esc(d.nomor) + '</div>' +
      '<div style="font-size:12px;color:#047857;font-weight:700;margin-top:5px">● Tercatat</div></div></div></div>' +
      '</div></div>';
  },

  /** Pasang pratinjau yang diskalakan agar pas lebar kontainer (tampilan identik dengan PDF). */
  mount: function (container, d) {
    var existing = $('.cert-fit-in', container);
    if (existing) { existing.innerHTML = CertDesign.html(d); return; }
    container.innerHTML = '<div class="cert-fit" style="position:relative;width:100%;aspect-ratio:1123/794;overflow:hidden;border-radius:6px;box-shadow:0 1px 3px rgba(2,36,72,.12)">' +
      '<div class="cert-fit-in" style="position:absolute;left:0;top:0;transform-origin:0 0">' + CertDesign.html(d) + '</div></div>';
    var fit = $('.cert-fit', container), inner = $('.cert-fit-in', container);
    var apply = function () { var w = fit.clientWidth; if (w) inner.style.transform = 'scale(' + (w / CertDesign.W) + ')'; };
    apply();
    if (window.ResizeObserver) { var ro = new ResizeObserver(apply); ro.observe(fit); Router.onLeave(function () { ro.disconnect(); }); }
    else window.addEventListener('resize', apply);
  },

  libs: function () {
    return Promise.all([loadScript('js/vendor/html2canvas.min.js'), loadScript('js/vendor/jspdf.umd.min.js')]);
  },

  /** Render data → PDF A4 landscape (Blob). */
  toPdf: function (d) {
    var host;
    return CertDesign.libs().then(function () {
      host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + CertDesign.W + 'px;height:' + CertDesign.H + 'px;z-index:-1;pointer-events:none';
      host.innerHTML = CertDesign.html(d);
      document.body.appendChild(host);
      var srcs = [d.bg, d.logo, d.ttd[0].img, d.ttd[1].img].filter(Boolean);
      var imgs = $$('img', host).map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); })
        .concat(srcs.map(function (src) { var im = new Image(); im.src = src; return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); }));
      return Promise.all(imgs.concat([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()]));
    }).then(function () {
      return window.html2canvas(host.firstChild, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false, width: CertDesign.W, height: CertDesign.H, windowWidth: CertDesign.W });
    }).then(function (canvas) {
      var pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.setProperties({ title: 'Sertifikat ' + d.nomor + ' - ' + d.nama, subject: d.event, creator: CFG.APP_NAME });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      host.remove();
      return pdf.output('blob');
    }).catch(function (e) { if (host) host.remove(); throw e; });
  },

  blobToBase64: function (blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1]); };
      r.onerror = function () { reject(new Error('Gagal membaca PDF.')); };
      r.readAsDataURL(blob);
    });
  },

  fileName: function (d) { return String(d.nomor).replace(/[\/\\]/g, '-') + ' - ' + d.nama + '.pdf'; }
};

/** Ambil aset desain (data URI) dengan cache memori per event+versi. */
var CertAssets = {
  _c: {},
  get: function (eventId, versi) {
    var k = (eventId || 'saya') + '|' + (versi === undefined ? '' : versi);
    if (CertAssets._c[k]) return Promise.resolve(CertAssets._c[k]);
    return API.call('getCertAssets', eventId ? { eventId: eventId } : {}).then(function (a) {
      CertAssets._c[(eventId || 'saya') + '|' + a.versi] = a;
      CertAssets._c[(eventId || 'saya') + '|'] = a;
      return a;
    });
  },
  clear: function () { CertAssets._c = {}; }
};
