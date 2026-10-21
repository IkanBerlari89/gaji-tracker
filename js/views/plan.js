/* Plan: compare two monthly plans (A vs B). */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R;
  var fm = U.fm, fh = U.fh, MONTHS = U.MONTHS;
  var V = Ga.V = Ga.V || {};

  function planSel(id, val, sa) {
    var opts = sa ? [['off', 'Off'], ['11:30', '11:30 (normal)'], ['12:30', '12:30'], ['13:00', '13:00'], ['15:00', '15:00'], ['16:30', '16:30'], ['17:00', '17:00'], ['17:30', '17:30']] :
      [['17:30', '17:30 (normal)'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 · NR'], ['19:30', '19:30 · NR'], ['20:00', '20:00 · NR'], ['20:30', '20:30 · NR']];
    return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  V.plan = function (UI) {
    var ym = UI.planYm, A = R.planMonth(ym, UI.planA), B = R.planMonth(ym, UI.planB), p = U.parseYm(ym), cnt = { MT: 0, FR: 0, SA: 0 };
    for (var d = 1; d <= U.daysIn(p.y, p.m); d++) { var t = U.dayType(p.y, p.m, d); if (!U.PH[U.iso(p.y, p.m, d)] && cnt[t] != null) cnt[t]++; }
    var col = function (id, P, M, name) {
      return '<div class="stack" style="gap:10px"><h3>' + name + '</h3>' +
        '<div class="field"><label for="' + id + 'mt">Mon–Thu out</label>' + planSel(id + 'mt', P.mt) + '</div>' +
        '<div class="field"><label for="' + id + 'fr">Friday out</label>' + planSel(id + 'fr', P.fr) + '</div>' +
        '<div class="field"><label for="' + id + 'sa">Saturday out</label>' + planSel(id + 'sa', P.sa, 1) + '</div>' +
        '<div class="field"><label for="' + id + 'ph">Public holiday</label><select id="' + id + 'ph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work (2×)</option></select></div>' +
        '<div class="plan-res"><div class="eyebrow">Take-home</div><div class="v">RM' + fm(M.net) + '</div><div class="tiny muted">OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + ' · gross ' + fm(M.gross) + '</div><div class="tiny muted">1st half ' + fm(M.half1) + ' · 2nd half ' + fm(M.half2) + '</div></div></div>';
    };
    var diff = B.net - A.net;
    var h = '<div class="stack"><section class="card"><div class="card-h"><h2>Compare two plans</h2><div class="field" style="flex:0 0 190px"><select id="planYm" aria-label="Month">' + Ga.ymOptions(ym) + '</select></div></div>' +
      '<p class="small muted" style="margin-bottom:12px">' + MONTHS[p.m - 1] + ' has ' + cnt.MT + ' Mon–Thu, ' + cnt.FR + ' Fridays and ' + cnt.SA + ' Saturdays (public holidays excluded). Sundays off.</p>' +
      '<div class="plan-cols">' + col('pa', UI.planA, A, 'Plan A') + col('pb', UI.planB, B, 'Plan B') + '</div>' +
      '<div class="note" style="margin-top:12px">Plan B is <b>' + (diff >= 0 ? '+' : '−') + 'RM' + fm(Math.abs(diff)) + '</b> a month vs Plan A.</div></section>';
    h += '<p class="small muted">To set a take-home target and get suggested days, use the Target card in the Calendar tab.</p></div>';
    return h;
  };
})(window);
