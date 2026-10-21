/* Gaji Tracker v2 — shared helpers and constants. Classic script, no modules. */
(function (G) {
  'use strict';
  var U = {};

  /* Johor statutory public holidays flagged by the calculator (section 4 of the handoff). */
  U.PH = {
    '2026-03-23': "Sultan of Johor's Birthday", '2026-05-01': 'Labour Day', '2026-06-01': "Agong's Birthday", '2026-08-31': 'Merdeka Day', '2026-09-16': 'Malaysia Day',
    '2027-03-23': "Sultan of Johor's Birthday", '2027-05-01': 'Labour Day', '2027-06-07': "Agong's Birthday", '2027-08-31': 'Merdeka Day', '2027-09-16': 'Malaysia Day'
  };
  U.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  U.MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  U.DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  U.TIMES = ['13:00', '15:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  U.LEAVES = { AL: 'Annual leave', MC: 'Sick leave', OFF: 'Not working', CL: 'Other leave', UPH: 'Unpaid ½ day', UPL: 'Unpaid full day', X2: 'Worked (2× day)' };
  U.SCHED = { MT: 8.5, FR: 7.5, SA: 3.5, SU: 0 };

  U.r2 = function (x) { return Math.round((x + 1e-9) * 100) / 100; };
  U.fm = function (x) { var n = U.r2(x), s = Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (n < 0 ? '−' : '') + s; };
  U.fh = function (x) { return (Math.round(x * 100) / 100).toFixed(2); };
  U.fh1 = function (x) { return (Math.round(x * 10) / 10).toString(); };
  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  U.ymOf = function (y, m) { return y + '-' + U.pad(m); };
  U.parseYm = function (ym) { var p = ym.split('-'); return { y: +p[0], m: +p[1] }; };
  U.daysIn = function (y, m) { return new Date(y, m, 0).getDate(); };
  U.addYm = function (ym, k) { var p = U.parseYm(ym), d = new Date(p.y, p.m - 1 + k, 1); return U.ymOf(d.getFullYear(), d.getMonth() + 1); };
  U.tmin = function (t) { if (!t || typeof t !== 'string') return null; var m = t.trim().match(/^(\d{1,2})[:.](\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  U.mtime = function (n) { return U.pad(Math.floor(n / 60)) + ':' + U.pad(n % 60); };
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  U.today = function () { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
  U.halfLabel = function (h) { return h === 1 ? '1st half' : '2nd half'; };
  U.periodName = function (ym, h) { var p = U.parseYm(ym); return U.MON3[p.m - 1] + ' ' + p.y + ' · ' + U.halfLabel(h); };
  U.iso = function (y, m, d) { return y + '-' + U.pad(m) + '-' + U.pad(d); };
  U.dayType = function (y, m, d) { var w = new Date(y, m - 1, d).getDay(); return w === 0 ? 'SU' : w === 6 ? 'SA' : w === 5 ? 'FR' : 'MT'; };
  U.num = function (v) { if (v == null || v === '') return null; var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.nowIso = function () { return new Date().toISOString(); };
  U.fmtTime = function (iso) { try { var d = new Date(iso); return d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  U.fmtDate = function (iso) { try { var d = new Date(iso); return d.getDate() + ' ' + U.MON3[d.getMonth()] + ' ' + d.getFullYear() + ', ' + U.fmtTime(iso); } catch (e) { return ''; } };
  U.currentPeriod = function () { var t = U.today(); return { ym: U.ymOf(t.y, t.m), h: t.d <= 15 ? 1 : 2 }; };

  G.Gaji = G.Gaji || {};
  G.Gaji.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
