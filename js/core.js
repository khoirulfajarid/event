/* ==========================================================================
   SIM EVENT — core.js
   State, API client (fetch → GAS), router hash, helper UI, ikon, layout
   ========================================================================== */
'use strict';

// --------------------------------------------------------------------------
// Ikon SVG (gaya garis)
// --------------------------------------------------------------------------
var ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  userCheck: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  shieldCheck: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17v.01"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  cloudUp: '<path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  fileText: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4M20 17v3"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  thumbsUp: '<path d="M7 11v10H4V11zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5.5a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 17.7 21H7"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  meh: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7M9 9.5h.01M15 9.5h.01"/>',
  frown: '<circle cx="12" cy="12" r="9"/><path d="M15.5 16a4.5 4.5 0 0 0-7 0M9 9.5h.01M15 9.5h.01"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 8h-6a3 3 0 0 0 0 6h6z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12A9 9 0 0 1 18.5 5.8L21 8M21 3v5h-5M3 21v-5h5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>', chevRight: '<path d="m9 18 6-6-6-6"/>', chevDown: '<path d="m6 9 6 6 6-6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>', arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 12l2 2 4-4"/>',
  message: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8"/>',
  idCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M14 10h5M14 14h3"/>',
  userPen: '<circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 9-5.2M15.5 20.5 20 16l-2-2-4.5 4.5v2z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  flashOff: '<path d="M13 2 9.5 7M16 10h3l-3.5 4.7M11 14H4l3-4M13 22l1-6M3 3l18 18"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  drive: '<path d="M22 12H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/><path d="M6 16h.01M10 16h.01"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  wifiOff: '<path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5a15 15 0 0 1 11.3 3.8M5 12.9a10 10 0 0 1 5-2.4M16.9 11.4a10 10 0 0 1 2.1 1.5M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M2 2l20 20"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="5" height="6" rx="1.5"/><rect x="17" y="14" width="5" height="6" rx="1.5"/>',
  printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L4 12l8-8z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
};

function icon(name, cls) {
  return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>';
}

// --------------------------------------------------------------------------
// Utilitas
// --------------------------------------------------------------------------
function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); }; }
function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
function rupiah(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }
function num(n) { return (Number(n) || 0).toLocaleString('id-ID'); }
function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function parseDate(s) {
  if (!s) return null;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
function fmtDate(s, long) {
  var d = parseDate(s); if (!d) return s || '-';
  return d.getDate() + ' ' + (long ? BULAN_PANJANG : BULAN)[d.getMonth()] + ' ' + d.getFullYear();
}
function fmtDateTime(s) {
  var d = parseDate(s); if (!d) return s || '-';
  return fmtDate(s) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtTime(s) { var d = parseDate(s); return d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '-'; }
function timeAgo(s) {
  var d = parseDate(s); if (!d) return '';
  var sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'baru saja';
  if (sec < 3600) return Math.floor(sec / 60) + ' mnt lalu';
  if (sec < 86400) return Math.floor(sec / 3600) + ' jam lalu';
  return Math.floor(sec / 86400) + ' hari lalu';
}
function daysUntil(s) { var d = parseDate(s); if (!d) return null; var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / 86400000); }
function waLink(hp, text) {
  var n = String(hp || '').replace(/\D/g, '');
  if (n.charAt(0) === '0') n = '62' + n.slice(1);
  return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
}

var Store = {
  get: function (k, def) { try { var v = localStorage.getItem('simev_' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (k, v) { try { localStorage.setItem('simev_' + k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem('simev_' + k); } catch (e) {} }
};

// --------------------------------------------------------------------------
// State sesi
// --------------------------------------------------------------------------
var S = {
  token: Store.get('token', ''),
  user: Store.get('user', null),
  exp: Store.get('exp', 0),
  setSession: function (d) {
    S.token = d.token; S.user = d.user; S.exp = d.kedaluwarsa || 0;
    Store.set('token', S.token); Store.set('user', S.user); Store.set('exp', S.exp);
  },
  clear: function () {
    S.token = ''; S.user = null; S.exp = 0;
    Store.del('token'); Store.del('user'); Store.del('exp');
  },
  isAdmin: function () { return !!S.user && (S.user.role === 'OPERATOR' || S.user.role === 'PANITIA'); },
  isPeserta: function () { return !!S.user && (S.user.role === 'PESERTA' || S.user.role === 'CALON'); }
};
if (S.exp && S.exp < Date.now()) S.clear();

// --------------------------------------------------------------------------
// API client
// --------------------------------------------------------------------------
var API = {
  configured: function () { return CFG.GAS_URL && CFG.GAS_URL.indexOf('GANTI_DENGAN') === -1; },

  call: function (action, data, opt) {
    opt = opt || {};
    if (!API.configured()) return Promise.reject(new Error('GAS_URL belum diisi di js/config.js'));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, opt.timeout || CFG.TIMEOUT_MS);
    return fetch(CFG.GAS_URL, {
      method: 'POST',
      // WAJIB text/plain — application/json memicu preflight OPTIONS yang tidak dilayani GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: data || {}, token: S.token || '' }),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.text();
    }).then(function (txt) {
      clearTimeout(timer);
      var json;
      try { json = JSON.parse(txt); } catch (e) { throw new Error('Balasan server bukan JSON. Pastikan deployment Web App diset "Who has access: Anyone".'); }
      if (!json.success) {
        var err = new Error(json.message || 'Terjadi kesalahan.');
        err.code = json.code;
        if (json.code === 'AUTH' && !opt.noRedirect) {
          S.clear();
          toast(json.message, 'warn');
          Router.go('#/masuk');
        }
        throw err;
      }
      if (json.message && opt.toast !== false && opt.toastOk) toast(json.message, 'ok');
      return json.data !== undefined ? json.data : json;
    }).catch(function (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') err = new Error('Permintaan melebihi batas waktu. Periksa koneksi Anda.');
      else if (err instanceof TypeError) { err = new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.'); err.network = true; }
      throw err;
    });
  },

  /** Panggilan dengan pesan sukses dari server (return {data, message}) */
  act: function (action, data, opt) {
    opt = opt || {};
    if (!API.configured()) return Promise.reject(new Error('GAS_URL belum diisi di js/config.js'));
    return fetch(CFG.GAS_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: data || {}, token: S.token || '' })
    }).then(function (r) { return r.text(); }).then(function (txt) {
      var json;
      try { json = JSON.parse(txt); } catch (e) { throw new Error('Balasan server bukan JSON.'); }
      if (!json.success) {
        var err = new Error(json.message || 'Terjadi kesalahan.'); err.code = json.code;
        if (json.code === 'AUTH') { S.clear(); Router.go('#/masuk'); }
        throw err;
      }
      if (json.message && !opt.silent) toast(json.message, 'ok');
      return json;
    }, function () { throw new Error('Tidak dapat terhubung ke server.'); });
  }
};

// --------------------------------------------------------------------------
// UI helpers
// --------------------------------------------------------------------------
function toast(msg, type, ms) {
  var box = $('#toasts');
  if (!box || !msg) return;
  var ic = { ok: 'checkCircle', err: 'alertCircle', warn: 'alert' }[type] || 'info';
  var el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.innerHTML = icon(ic) + '<div class="grow">' + esc(msg) + '</div>';
  box.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, ms || (type === 'err' ? 5500 : 3500));
}
function errToast(e) { toast(e && e.message ? e.message : String(e), 'err'); }

function badge(text, color, dot) {
  return '<span class="badge b-' + (color || 'gray') + '">' + (dot ? '<span class="dot"></span>' : '') + esc(text) + '</span>';
}

var STATUS_LABEL = {
  // verifikasi pendaftar
  menunggu: ['Menunggu Review', 'amber'], perlu_perbaikan: ['Perlu Perbaikan', 'red'], lolos: ['Lolos Verifikasi', 'green'], ditolak: ['Ditolak', 'red'],
  // syarat
  belum: ['Belum Kirim', 'gray'], disetujui: ['Disetujui', 'green'],
  // pembayaran
  lunas: ['Lunas', 'green'],
  // event
  draft: ['Draft', 'gray'], aktif: ['Aktif', 'green'], selesai: ['Selesai', 'blue'], arsip: ['Arsip', 'gray'],
  // sesi
  buka: ['Dibuka', 'green'], tutup: ['Ditutup', 'gray'],
  // sertifikat
  antri: ['Antrean', 'amber'], terbit: ['Terbit', 'green'], gagal: ['Gagal', 'red'],
  // leads
  baru: ['Baru', 'blue'], dihubungi: ['Dihubungi', 'amber'], tertarik: ['Tertarik', 'green'], tidak_tertarik: ['Tidak Tertarik', 'gray'], konversi: ['Konversi', 'navy'],
  nonaktif: ['Nonaktif', 'gray']
};
function statusBadge(st, override) {
  var d = STATUS_LABEL[st] || [st || '-', 'gray'];
  return badge(override || d[0], d[1], true);
}

function btnLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn.dataset.html = btn.innerHTML; btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>' + (text ? ' ' + esc(text) : '');
  } else {
    btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
  }
}

function emptyState(ic, title, sub, action) {
  return '<div class="empty">' + icon(ic || 'inbox') + '<h4>' + esc(title) + '</h4>' + (sub ? '<p class="small mt-8">' + esc(sub) + '</p>' : '') + (action ? '<div class="mt-16">' + action + '</div>' : '') + '</div>';
}
function skeleton(rows) {
  var h = '';
  for (var i = 0; i < (rows || 4); i++) h += '<div class="skel" style="height:' + (i === 0 ? 110 : 64) + 'px;margin-bottom:14px"></div>';
  return h;
}

/** Modal generik. Mengembalikan objek {el, close}. */
function openModal(opt) {
  var root = document.createElement('div');
  root.className = opt.drawer ? 'drawer-root' : 'modal-root';
  root.innerHTML = '<div class="' + (opt.drawer ? 'drawer' : 'modal ' + (opt.size || '')) + '" role="dialog" aria-modal="true">' +
    '<div class="modal-head"><div class="grow">' + (opt.titleHtml || '<h3>' + esc(opt.title || '') + '</h3>') + '</div>' +
    '<button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
    '<div class="modal-body">' + (opt.body || '') + '</div>' +
    (opt.foot ? '<div class="modal-foot">' + opt.foot + '</div>' : '') + '</div>';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  var m = {
    el: root,
    close: function () { root.remove(); if (!$('.modal-root,.drawer-root')) document.body.style.overflow = ''; if (opt.onClose) opt.onClose(); },
    body: function (html) { $('.modal-body', root).innerHTML = html; }
  };
  root.addEventListener('click', function (e) {
    if (e.target === root && !opt.persistent) m.close();
    if (e.target.closest('[data-close]')) m.close();
  });
  var escFn = function (e) { if (e.key === 'Escape' && document.body.contains(root)) { m.close(); document.removeEventListener('keydown', escFn); } };
  document.addEventListener('keydown', escFn);
  if (opt.onOpen) opt.onOpen(m);
  return m;
}

function confirmDialog(opt) {
  return new Promise(function (resolve) {
    var done = false;
    var m = openModal({
      title: opt.title || 'Konfirmasi',
      body: '<p>' + esc(opt.message || '') + '</p>' + (opt.input ? '<div class="field mt-16"><label class="label">' + esc(opt.input) + (opt.required ? ' <span class="req">*</span>' : '') + '</label><textarea class="textarea" id="cfm-input" placeholder="' + esc(opt.placeholder || '') + '"></textarea></div>' : ''),
      foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn ' + (opt.danger ? 'btn-danger' : 'btn-primary') + '" id="cfm-ok">' + esc(opt.ok || 'Ya, lanjutkan') + '</button>',
      onClose: function () { if (!done) resolve(null); }
    });
    on($('#cfm-ok', m.el), 'click', function () {
      var val = opt.input ? $('#cfm-input', m.el).value.trim() : true;
      if (opt.input && opt.required && !val) { $('#cfm-input', m.el).classList.add('invalid'); return; }
      done = true; m.close(); resolve(val);
    });
  });
}

// ---- Berkas ----
function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(String(r.result).split(',')[1]); };
    r.onerror = function () { reject(new Error('Gagal membaca berkas.')); };
    r.readAsDataURL(file);
  });
}

/** Kompres gambar besar (maks 1600px, JPEG 0.82) agar upload ringan & di bawah limit. */
function prepareUpload(file) {
  var MAX = 5 * 1024 * 1024;
  var okTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (okTypes.indexOf(file.type) === -1) return Promise.reject(new Error('Format tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.'));
  if (file.type === 'application/pdf' || file.size < 700 * 1024) {
    if (file.size > MAX) return Promise.reject(new Error('Ukuran berkas melebihi 5MB.'));
    return readFileAsBase64(file).then(function (b64) { return { name: file.name, mime: file.type, base64: b64, size: file.size }; });
  }
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var data = c.toDataURL('image/jpeg', 0.82);
      var b64 = data.split(',')[1];
      if (b64.length * 0.75 > MAX) return reject(new Error('Ukuran gambar masih melebihi 5MB setelah dikompres.'));
      resolve({ name: file.name.replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', base64: b64, size: Math.round(b64.length * 0.75) });
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
    img.src = url;
  });
}

function b64ToBlob(b64, mime) {
  var bin = atob(b64), len = bin.length, arr = new Uint8Array(len);
  for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
function exportCSV(filename, headers, rows) {
  var q = function (v) { v = v === undefined || v === null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var csv = '﻿' + headers.map(function (h) { return q(h[1]); }).join(',') + '\n' +
    rows.map(function (r) { return headers.map(function (h) { return q(typeof h[0] === 'function' ? h[0](r) : r[h[0]]); }).join(','); }).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}
function copyText(text, label) {
  var ok = function () { toast((label || 'Teks') + ' disalin ke clipboard.', 'ok'); };
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text); ok(); });
  fallbackCopy(text); ok();
}
function fallbackCopy(text) {
  var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove();
}

/** Pratinjau berkas privat dari Drive via API getFile. */
function previewFile(fileId, title) {
  var m = openModal({ title: title || 'Pratinjau Berkas', size: 'lg', body: '<div class="center" style="padding:60px"><span class="spinner"></span><p class="muted mt-8">Memuat berkas…</p></div>' });
  API.call('getFile', { fileId: fileId }).then(function (f) {
    var blob = b64ToBlob(f.base64, f.mime);
    var url = URL.createObjectURL(blob);
    var inner = f.mime.indexOf('image/') === 0
      ? '<img class="preview-img" src="' + url + '" alt="' + esc(f.name) + '">'
      : '<iframe class="preview-frame" src="' + url + '" title="' + esc(f.name) + '"></iframe>';
    m.body(inner + '<div class="row between mt-16"><span class="small muted ellipsis">' + esc(f.name) + '</span><a class="btn btn-secondary btn-sm" href="' + url + '" download="' + esc(f.name) + '">' + icon('download', 'ic-sm') + ' Unduh</a></div>');
  }).catch(function (e) { m.body('<div class="alert alert-err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>'); });
}

/** QR code SVG (library qrcode-generator). */
function qrSvg(text, cell) {
  if (typeof qrcode === 'undefined') return '';
  var q = qrcode(0, 'M');
  q.addData(String(text));
  q.make();
  return q.createSvgTag({ cellSize: cell || 4, margin: 0, scalable: true });
}

// ---- Grafik sederhana (SVG/CSS, tanpa library) ----
function barChart(series, key, labelKey) {
  var max = Math.max.apply(null, series.map(function (s) { return s[key]; }).concat([1]));
  return '<div class="bars">' + series.map(function (s) {
    return '<div class="bar" style="height:' + Math.max(2, s[key] / max * 100) + '%" data-tip="' + esc(fmtDate(s[labelKey]) + ': ' + s[key]) + '"></div>';
  }).join('') + '</div><div class="row between xs muted mt-8"><span>' + esc(fmtDate(series[0] && series[0][labelKey])) + '</span><span>' + esc(fmtDate(series[series.length - 1] && series[series.length - 1][labelKey])) + '</span></div>';
}
function donut(parts, size) {
  var total = parts.reduce(function (a, p) { return a + p.value; }, 0);
  var r = 15.915, off = 25, segs = '';
  parts.forEach(function (p) {
    if (!p.value) return;
    var len = p.value / total * 100;
    segs += '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="5" stroke-dasharray="' + len + ' ' + (100 - len) + '" stroke-dashoffset="' + off + '"/>';
    off -= len;
  });
  return '<svg class="donut" viewBox="0 0 42 42" style="width:' + (size || 150) + 'px;height:' + (size || 150) + 'px">' +
    '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="#eeedf1" stroke-width="5"/>' + segs +
    '<text x="21" y="21" text-anchor="middle" dominant-baseline="central" style="font:600 7px Sora,sans-serif;fill:#022448">' + num(total) + '</text></svg>';
}

// ---- Paginasi tabel klien ----
function paginate(list, page, size) {
  size = size || CFG.PAGE_SIZE;
  var pages = Math.max(1, Math.ceil(list.length / size));
  page = Math.min(Math.max(1, page), pages);
  return { items: list.slice((page - 1) * size, page * size), page: page, pages: pages, from: list.length ? (page - 1) * size + 1 : 0, to: Math.min(page * size, list.length), total: list.length };
}
function pagerHtml(p) {
  return '<div class="pager"><span class="small muted">Menampilkan ' + p.from + '–' + p.to + ' dari ' + num(p.total) + '</span>' +
    '<button class="btn btn-secondary btn-sm btn-icon" data-page="' + (p.page - 1) + '"' + (p.page <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + icon('chevLeft') + '</button>' +
    '<span class="small">' + p.page + ' / ' + p.pages + '</span>' +
    '<button class="btn btn-secondary btn-sm btn-icon" data-page="' + (p.page + 1) + '"' + (p.page >= p.pages ? ' disabled' : '') + ' aria-label="Berikutnya">' + icon('chevRight') + '</button></div>';
}

// --------------------------------------------------------------------------
// Router hash
// --------------------------------------------------------------------------
var Router = {
  routes: [],
  current: null,
  renderId: 0,
  cleanup: [],
  add: function (pattern, handler, opt) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/?]+)'; }) + '/?$');
    Router.routes.push({ re: re, keys: keys, handler: handler, opt: opt || {} });
  },
  go: function (hash) { if (location.hash === hash) Router.resolve(); else location.hash = hash; },
  query: function () {
    var q = {}, i = location.hash.indexOf('?');
    if (i > -1) location.hash.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return q;
  },
  onLeave: function (fn) { Router.cleanup.push(fn); },
  resolve: function () {
    Router.cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
    Router.cleanup = [];
    var hash = location.hash || '#/';
    var path = hash.replace(/^#/, '').split('?')[0].split('#')[0] || '/';
    for (var i = 0; i < Router.routes.length; i++) {
      var r = Router.routes[i], m = path.match(r.re);
      if (!m) continue;
      var params = {};
      r.keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
      var roles = r.opt.roles;
      if (roles) {
        if (!S.user) { Store.set('after_login', hash); return Router.go('#/masuk'); }
        if (roles.indexOf(S.user.role) === -1) {
          if (S.isAdmin()) return Router.go('#/admin');
          if (S.isPeserta()) return Router.go('#/portal');
          return Router.go('#/');
        }
      }
      Router.current = { path: path, params: params, query: Router.query(), opt: r.opt };
      var id = ++Router.renderId;
      window.scrollTo(0, 0);
      document.body.style.overflow = '';
      $$('.modal-root,.drawer-root,.qr-stage').forEach(function (el) { el.remove(); });
      try {
        var res = r.handler(params, Router.current.query, id);
        if (res && res.catch) res.catch(function (e) { if (id === Router.renderId) renderError(e); });
      } catch (e) { renderError(e); }
      return;
    }
    Layout.public('<div class="container" style="padding:80px 16px">' + emptyState('alert', 'Halaman tidak ditemukan', 'Alamat yang Anda buka tidak tersedia.', '<a class="btn btn-primary" href="#/">Kembali ke Beranda</a>') + '</div>');
  },
  alive: function (id) { return id === Router.renderId; }
};

function renderError(e) {
  var el = $('#page') || $('#app');
  el.innerHTML = '<div class="container" style="padding:40px 0"><div class="alert alert-err">' + icon('alertCircle') + '<div><b>Gagal memuat halaman</b><p class="small mt-8">' + esc(e.message || e) + '</p>' +
    '<button class="btn btn-secondary btn-sm mt-16" onclick="Router.resolve()">' + icon('refresh', 'ic-sm') + ' Coba lagi</button></div></div></div>';
}

// --------------------------------------------------------------------------
// Layout
// --------------------------------------------------------------------------
var Layout = {
  public: function (html, active) {
    var u = S.user;
    var right = u
      ? '<a class="btn btn-secondary btn-sm" href="' + (S.isAdmin() ? '#/admin' : '#/portal') + '">' + icon('grid', 'ic-sm') + ' ' + (S.isAdmin() ? 'Dashboard' : 'Portal Saya') + '</a><span class="avatar" title="' + esc(u.nama) + '">' + esc(initials(u.nama)) + '</span>'
      : '<a class="btn btn-primary btn-sm" href="#/masuk">' + icon('login', 'ic-sm') + ' Masuk</a>';
    $('#app').innerHTML =
      '<header class="topnav"><div class="container topnav-in">' +
      '<button class="btn btn-ghost btn-icon menu-btn" id="pub-menu" aria-label="Menu">' + icon('menu') + '</button>' +
      '<a class="brand" href="#/"><span class="brand-mark">' + icon('ticket', 'ic-sm') + '</span>' + esc(CFG.APP_NAME) + '</a>' +
      '<nav class="navlinks" id="pub-nav">' +
      '<a href="#/" class="' + (active === 'home' ? 'active' : '') + '">Beranda</a>' +
      '<a href="#/#events" class="' + (active === 'events' ? 'active' : '') + '" data-scroll="events">Event</a>' +
      '<a href="#/verifikasi" class="' + (active === 'verify' ? 'active' : '') + '">Verifikasi Sertifikat</a></nav>' +
      '<div class="row">' + right + '</div></div></header>' +
      '<main id="page">' + html + '</main>' +
      '<footer class="footer"><div class="container">© ' + new Date().getFullYear() + ' ' + esc(CFG.ORG_NAME) + ' · ' + esc(CFG.APP_NAME) + ' — Sistem Informasi Manajemen Event</div></footer>';
    on($('#pub-menu'), 'click', function () { $('#pub-nav').classList.toggle('open'); });
    $$('[data-scroll]').forEach(function (a) {
      on(a, 'click', function (e) {
        var t = document.getElementById(a.dataset.scroll);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); $('#pub-nav').classList.remove('open'); }
      });
    });
  },

  navFor: function () {
    var r = S.user ? S.user.role : '';
    if (r === 'PESERTA' || r === 'CALON') {
      return [
        { group: 'Portal Peserta' },
        { key: 'status', href: '#/portal', ic: 'clipboard', label: 'Status Pendaftaran' },
        { key: 'absensi', href: '#/portal/absensi', ic: 'scan', label: 'Absensi Sesi', lock: r === 'CALON' },
        { key: 'evaluasi', href: '#/portal/evaluasi', ic: 'star', label: 'Evaluasi Event', lock: r === 'CALON' },
        { key: 'sertifikat', href: '#/portal/sertifikat', ic: 'award', label: 'Sertifikat Saya', lock: r === 'CALON' },
        { group: 'Lainnya' },
        { key: 'home', href: '#/', ic: 'home', label: 'Beranda Event' },
        { key: 'verify', href: '#/verifikasi', ic: 'shieldCheck', label: 'Verifikasi Sertifikat' }
      ];
    }
    var items = [
      { group: 'Ringkasan' },
      { key: 'dashboard', href: '#/admin', ic: 'grid', label: 'Dashboard & Laporan' },
      { key: 'events', href: '#/admin/events', ic: 'calendar', label: 'Kelola Event' },
      { group: 'Committee Review' },
      { key: 'verifikasi', href: '#/admin/verifikasi', ic: 'clipboard', label: 'Verifikasi Syarat', count: Layout.pending },
      { key: 'pembayaran', href: '#/admin/pembayaran', ic: 'wallet', label: 'Pembayaran' },
      { key: 'leads', href: '#/admin/leads', ic: 'users', label: 'CRM Leads' },
      { group: 'Pelaksanaan' },
      { key: 'sesi', href: '#/admin/sesi', ic: 'qr', label: 'Sesi & Absensi' },
      { key: 'evaluasi', href: '#/admin/evaluasi', ic: 'star', label: 'Evaluasi' },
      { key: 'sertifikat', href: '#/admin/sertifikat', ic: 'award', label: 'Sertifikat' }
    ];
    if (r === 'OPERATOR') {
      items.push({ group: 'Operator' });
      items.push({ key: 'operator', href: '#/operator', ic: 'server', label: 'Operator Console' });
      items.push({ key: 'akun', href: '#/operator/akun', ic: 'userCheck', label: 'Akun Panitia' });
      items.push({ key: 'log', href: '#/operator/log', ic: 'activity', label: 'Log Aktivitas' });
    }
    items.push({ group: 'Lainnya' });
    items.push({ key: 'home', href: '#/', ic: 'globe', label: 'Lihat Situs Publik' });
    return items;
  },

  pending: 0,

  app: function (html, active, opt) {
    opt = opt || {};
    var u = S.user || {};
    var nav = Layout.navFor().map(function (it) {
      if (it.group) return '<div class="nav-group">' + esc(it.group) + '</div>';
      return '<a class="nav-item ' + (active === it.key ? 'active' : '') + '" href="' + it.href + '">' + icon(it.ic) + '<span>' + esc(it.label) + '</span>' +
        (it.lock ? '<span style="margin-left:auto">' + icon('lock', 'ic-sm') + '</span>' : '') +
        (it.count ? '<span class="count">' + it.count + '</span>' : '') + '</a>';
    }).join('');
    var roleLabel = { OPERATOR: 'Operator', PANITIA: 'Panitia', PESERTA: 'Peserta', CALON: 'Calon Peserta' }[u.role] || '';
    $('#app').innerHTML =
      '<div class="shell"><aside class="sidebar" id="sidebar">' +
      '<a class="brand" href="' + (S.isAdmin() ? '#/admin' : '#/portal') + '"><span class="brand-mark">' + icon('ticket', 'ic-sm') + '</span>' + (S.isAdmin() ? 'SIM Management' : esc(CFG.APP_NAME)) + '</a>' +
      nav + '</aside><div id="sb-backdrop" class="backdrop" hidden></div>' +
      '<div class="main"><header class="topbar">' +
      '<button class="btn btn-ghost btn-icon menu-btn" id="sb-toggle" aria-label="Menu">' + icon('menu') + '</button>' +
      (opt.search ? '<div class="input-icon">' + icon('search') + '<input class="input" id="top-search" placeholder="' + esc(opt.search) + '"></div>' : '<div class="grow small muted ellipsis">' + esc(opt.subtitle || '') + '</div>') +
      '<div class="row" style="margin-left:auto">' +
      (S.isAdmin() ? '<a class="btn btn-ghost btn-icon" href="#/admin/verifikasi" title="Menunggu verifikasi" style="position:relative">' + icon('bell') + (Layout.pending ? '<span style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:#f59e0b;border-radius:50%"></span>' : '') + '</a>' : '') +
      '<div style="position:relative"><button class="avatar" id="user-btn" title="' + esc(u.nama) + '">' + esc(initials(u.nama)) + '</button>' +
      '<div class="dropdown" id="user-dd" hidden><div style="padding:8px 10px 10px"><div class="bold ellipsis">' + esc(u.nama) + '</div><div class="small muted ellipsis">' + esc(u.email) + '</div><div class="mt-8">' + badge(roleLabel, 'blue') + '</div></div><div class="divider" style="margin:4px 0"></div>' +
      (S.isAdmin() ? '<button id="dd-pass">' + icon('key') + ' Ganti Kata Sandi</button>' : '') +
      '<button id="dd-logout">' + icon('logout') + ' Keluar</button></div></div></div></header>' +
      '<main class="content" id="page">' + html + '</main></div></div>';

    var sb = $('#sidebar'), bd = $('#sb-backdrop');
    on($('#sb-toggle'), 'click', function () { sb.classList.add('open'); bd.hidden = false; });
    on(bd, 'click', function () { sb.classList.remove('open'); bd.hidden = true; });
    on($('#user-btn'), 'click', function (e) { e.stopPropagation(); $('#user-dd').hidden = !$('#user-dd').hidden; });
    document.onclick = function (e) { var dd = $('#user-dd'); if (dd && !e.target.closest('#user-dd')) dd.hidden = true; };
    on($('#dd-logout'), 'click', logout);
    on($('#dd-pass'), 'click', changePasswordModal);
  }
};

function logout() {
  API.call('logout', {}, { noRedirect: true }).catch(function () {});
  S.clear();
  toast('Anda telah keluar.', 'ok');
  Router.go('#/masuk');
}

function changePasswordModal() {
  var m = openModal({
    title: 'Ganti Kata Sandi',
    body: '<form id="pw-form" class="stack"><div class="field"><label class="label">Kata sandi lama</label><input class="input" type="password" name="lama" required autocomplete="current-password"></div>' +
      '<div class="field"><label class="label">Kata sandi baru</label><input class="input" type="password" name="baru" minlength="8" required autocomplete="new-password"><span class="hint">Minimal 8 karakter.</span></div>' +
      '<div class="field"><label class="label">Ulangi kata sandi baru</label><input class="input" type="password" name="ulang" required autocomplete="new-password"></div></form>',
    foot: '<button class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" id="pw-save">Simpan</button>'
  });
  on($('#pw-save', m.el), 'click', function () {
    var f = $('#pw-form', m.el);
    if (!f.reportValidity()) return;
    if (f.baru.value !== f.ulang.value) return toast('Konfirmasi kata sandi tidak sama.', 'err');
    var b = this; btnLoading(b, true);
    API.act('changePassword', { lama: f.lama.value, baru: f.baru.value }).then(function () { m.close(); }).catch(errToast).finally(function () { btnLoading(b, false); });
  });
}

/** Pemilih event aktif untuk halaman admin (disimpan di localStorage). */
var EventCtx = {
  list: null,
  load: function (force) {
    if (EventCtx.list && !force) return Promise.resolve(EventCtx.list);
    return API.call('listEvents').then(function (d) {
      EventCtx.list = d.events;
      Layout.pending = d.events.reduce(function (a, e) { return a + (e.stat ? e.stat.menunggu : 0); }, 0);
      return d.events;
    });
  },
  currentId: function (list) {
    var q = Router.query().event;
    var id = q || Store.get('ctx_event', '');
    if (!list.some(function (e) { return e.id === id; })) {
      var aktif = list.filter(function (e) { return e.status === 'aktif'; })[0];
      id = (aktif || list[0] || {}).id || '';
    }
    Store.set('ctx_event', id);
    return id;
  },
  selectHtml: function (list, id) {
    return '<div class="ctx-select">' + icon('calendar', 'ic-sm') + '<select class="select" id="ctx-event" aria-label="Pilih event">' +
      list.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === id ? ' selected' : '') + '>' + esc(e.nama) + ' · ' + esc((STATUS_LABEL[e.status] || [e.status])[0]) + '</option>'; }).join('') +
      '</select></div>';
  },
  bind: function () {
    on($('#ctx-event'), 'change', function () { Store.set('ctx_event', this.value); Router.go(location.hash.split('?')[0]); });
  }
};
