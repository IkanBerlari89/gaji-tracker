/* Plan: compare two monthly plans (A vs B). */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R;
  var fm = U.fm, fh = U.fh, MONTHS = U.MONTHS;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};

  function planSel(id, val, sa) {
    var opts = sa ? [['off', 'Off'], ['11:30', '11:30 (normal)'], ['12:30', '12:30'], ['13:00', '13:00'], ['15:00', '15:00'], ['16:30', '16:30'], ['17:00', '17:00'], ['17:30', '17:30']] :
      [['17:30', '17:30 (normal)'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 · NR'], ['19:30', '19:30 · NR'], ['20:00', '20:00 · NR'], ['20:30', '20:30 · NR']];
    return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  V.plan = function (UI) {
    var S = Ga.St.S, start = UI.plStart, n = UI.plN, F = R.forecast(start, n, null), p0 = U.parseYm(start), last = U.parseYm(U.addYm(start, n - 1)), P = UI.planA;
    var h = '<div class="stack">';
    h += '<section class="card"><div class="card-h"><div><h2>Plan ' + n + ' month' + (n > 1 ? 's' : '') + '</h2><span class="small muted">' + MONTHS[p0.m - 1] + ' ' + p0.y + (n > 1 ? ' – ' + MONTHS[last.m - 1] + ' ' + last.y : '') + '</span></div>' +
      '<div class="row"><div class="field" style="flex:0 0 170px"><select id="plStart" aria-label="First month">' + Ga.ymOptions(start) + '</select></div><div class="seg">' + [1, 2, 3, 6, 12].map(function (k) { return '<button data-pln="' + k + '" aria-pressed="' + (k === n) + '">' + k + '</button>'; }).join('') + '</div></div></div>';
    h += '<div class="plan-res"><div class="eyebrow">Take-home total · ' + n + ' month' + (n > 1 ? 's' : '') + '</div><div class="v">RM' + fm(F.total.net) + '</div><div class="tiny muted">OT ' + fh(F.total.ot) + 'h' + (F.total.ot2 ? ' + ' + fh(F.total.ot2) + 'h 2×' : '') + ' · gross RM' + fm(F.total.gross) + ' · deductions RM' + fm(F.total.ded) + (F.total.up ? ' · unpaid ' + F.total.up + 'd' : '') + '</div></div>';
    h += '<details class="tg-rules" style="margin-top:12px"' + (UI.plFillOpen ? ' open' : '') + ' id="plFillDet"><summary><b>Fill empty days</b><span class="small muted">&nbsp;· ' + planLabel(P) + '</span></summary><div class="stack" style="gap:10px;margin-top:12px">' +
      '<div class="row"><div class="field"><label for="pamt">Mon–Thu out</label>' + planSel('pamt', P.mt) + '</div><div class="field"><label for="pafr">Friday out</label>' + planSel('pafr', P.fr) + '</div><div class="field"><label for="pasa">Saturday out</label>' + planSel('pasa', P.sa, 1) + '</div><div class="field"><label for="paph">Public holiday</label><select id="paph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work (2×)</option></select></div></div>' +
      '<div class="row"><button class="btn primary" data-act="plFill">Fill empty days in these ' + n + ' month' + (n > 1 ? 's' : '') + '</button><button class="btn danger" data-act="plClear">' + (UI.plClearArm ? 'Tap again to remove planned days' : 'Remove planned days') + '</button></div>' +
      '<p class="tiny muted">Fill only touches empty days from today onward. Remove only takes out days you set by hand or by fill; imported time-card days and days before today stay.</p></div></details>';
    h += '</section>';
    h += V.brushBar(UI, p0.y, F.months[0].M);
    h += '<div class="grid2 plgrid">';
    F.months.forEach(function (m) {
      var q = U.parseYm(m.ym), days = S.months[m.ym] || {}, M = m.M, rec = S.records[m.ym + '-1'] || S.records[m.ym + '-2'];
      h += '<section class="card" style="padding:10px"><div class="card-h" style="margin-bottom:6px"><div><h3 style="font-size:15px">' + MONTHS[q.m - 1] + ' ' + q.y + '</h3><span class="tiny muted">OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + (M.up ? ' · unpaid ' + M.up + 'd' : '') + ' · H1 ' + fm(M.half1) + ' · H2 ' + fm(M.half2) + '</span></div><div style="text-align:right"><span class="chip accent">RM' + fm(M.net) + '</span>' + (rec ? '<br><span class="tiny muted">payslip saved</span>' : '') + '</div></div>' + V.monthGrid(m.ym, days, null, true) + '<div class="row" style="margin-top:6px;justify-content:flex-end"><button class="btn ghost sm" data-goym="' + m.ym + '" data-go="cal">Open in Calendar</button></div></section>';
    });
    h += '</div>';
    h += '<p class="tiny muted">Same brushes as the Calendar: pick one, then tap days in any month. Everything you set here is the same data the Calendar and Home use.</p>';
    h += '<details class="card"' + (UI.cmpOpen ? ' open' : '') + ' id="cmpDet"><summary style="cursor:pointer;font-weight:600">Compare two patterns for one month</summary><div style="margin-top:12px">' + compare(UI) + '</div></details>';
    return h + '</div>';
  };
  function planLabel(P) { return P.mt + (P.fr !== P.mt ? ' / Fri ' + P.fr : '') + ' · Sat ' + (P.sa === 'off' ? 'off' : P.sa) + (P.ph === 'work' ? ' · PH 2×' : ''); }
  function compare(UI) {
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
    return '<div class="row" style="margin-bottom:10px"><div class="field" style="flex:0 0 190px"><select id="planYm" aria-label="Month">' + Ga.ymOptions(ym) + '</select></div><span class="small muted">' + MONTHS[p.m - 1] + ' has ' + cnt.MT + ' Mon–Thu, ' + cnt.FR + ' Fridays and ' + cnt.SA + ' Saturdays (public holidays excluded). Sundays off.</span></div>' +
      '<div class="plan-cols">' + col('pA', UI.planA, A, 'Pattern A (also used by Fill)') + col('pB', UI.planB, B, 'Pattern B') + '</div>' +
      '<div class="note" style="margin-top:12px">Pattern B is <b>' + (diff >= 0 ? '+' : '−') + 'RM' + fm(Math.abs(diff)) + '</b> a month vs Pattern A.</div>';
  }
  /* Fill: empty days from today onward in the planner range follow Pattern A. */
  A.plFill = function (UI) {
    var S = Ga.St.S, P = UI.planA, td = U.today(), cur = U.ymOf(td.y, td.m), paths = [], count = 0;
    for (var i = 0; i < UI.plN; i++) {
      var ym = U.addYm(UI.plStart, i); if (ym < cur) continue;
      var p = U.parseYm(ym), days = S.months[ym] || (S.months[ym] = {});
      for (var d = 1; d <= U.daysIn(p.y, p.m); d++) {
        var k = U.pad(d); if (days[k]) continue; if (ym === cur && d < td.d) continue;
        var t = U.dayType(p.y, p.m, d), ph = U.PH[U.iso(p.y, p.m, d)], ent = null;
        if (ph) { if (P.ph === 'work') ent = { k: 'X2' }; }
        else if (t === 'SU') ent = null;
        else if (t === 'SA') { if (P.sa !== 'off') ent = { k: 'W', out: P.sa }; }
        else ent = { k: 'W', out: t === 'FR' ? P.fr : P.mt };
        if (ent) { ent.plan = 1; days[k] = ent; paths.push('months/' + ym + '/' + k); count++; }
      }
      if (!Object.keys(days).length) delete S.months[ym];
    }
    if (!count) { Ga.toast('No empty days to fill'); return; }
    Ga.St.touch(paths, 'Plan: fill ' + count + ' days'); Ga.render(); Ga.toast(count + ' days filled');
  };
  /* Remove: planned (non-imported) days from today onward in the range. */
  A.plClear = function (UI) {
    var S = Ga.St.S, td = U.today(), cur = U.ymOf(td.y, td.m), paths = [];
    for (var i = 0; i < UI.plN; i++) {
      var ym = U.addYm(UI.plStart, i), days = S.months[ym]; if (!days || ym < cur) continue;
      Object.keys(days).forEach(function (k) { if (days[k].real) return; if (ym === cur && +k < td.d) return; delete days[k]; paths.push('months/' + ym + '/' + k); });
      if (!Object.keys(days).length) delete S.months[ym];
    }
    if (!paths.length) { Ga.toast('Nothing to remove'); return; }
    Ga.St.touch(paths, 'Plan: remove ' + paths.length + ' days'); Ga.render(); Ga.toast(paths.length + ' days removed');
  };
})(window);
