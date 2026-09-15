/* ==========================================================================
   SIM EVENT — app.js
   Registrasi rute & inisialisasi aplikasi
   ========================================================================== */
'use strict';

(function () {
  var ADMIN = ['OPERATOR', 'PANITIA'];
  var PESERTA = ['CALON', 'PESERTA'];

  // Publik
  Router.add('/', pageHome);
  Router.add('/event/:id', pageEventDetail);
  Router.add('/daftar/:id', pageDaftar);
  Router.add('/masuk', pageMasuk);
  Router.add('/verifikasi', pageVerifikasi);

  // Portal CalonPeserta & Peserta
  Router.add('/portal', pagePortal, { roles: PESERTA });
  Router.add('/portal/absensi', pageAbsensi, { roles: PESERTA });
  Router.add('/portal/evaluasi', pageEvaluasi, { roles: PESERTA });
  Router.add('/portal/sertifikat', pageSertifikat, { roles: PESERTA });

  // Panitia & Operator
  Router.add('/admin', pageAdminDashboard, { roles: ADMIN });
  Router.add('/admin/events', pageAdminEvents, { roles: ADMIN });
  Router.add('/admin/event/baru', pageEventForm, { roles: ADMIN });
  Router.add('/admin/event/:id/edit', pageEventForm, { roles: ADMIN });
  Router.add('/admin/verifikasi', pageAdminVerifikasi, { roles: ADMIN });
  Router.add('/admin/pembayaran', pageAdminPembayaran, { roles: ADMIN });
  Router.add('/admin/leads', pageAdminLeads, { roles: ADMIN });
  Router.add('/admin/sesi', pageAdminSesi, { roles: ADMIN });
  Router.add('/admin/evaluasi', pageAdminEvaluasi, { roles: ADMIN });
  Router.add('/admin/sertifikat', pageAdminSertifikat, { roles: ADMIN });

  // Operator
  Router.add('/operator', pageOperator, { roles: ['OPERATOR'] });
  Router.add('/operator/akun', pageOperatorAkun, { roles: ['OPERATOR'] });
  Router.add('/operator/log', pageOperatorLog, { roles: ['OPERATOR'] });

  window.addEventListener('hashchange', Router.resolve);

  var updateOnline = function () {
    var bar = document.getElementById('offline');
    if (bar) bar.hidden = navigator.onLine;
    if (navigator.onLine && typeof ScanQueue !== 'undefined') ScanQueue.flush();
  };
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  document.addEventListener('DOMContentLoaded', function () {
    document.title = CFG.APP_NAME + ' — Sistem Informasi Manajemen Event';
    updateOnline();
    Router.resolve();
  });
})();
