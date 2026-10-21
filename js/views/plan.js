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
      '<div class="row"><div class="field" style="flex:0 0 170px"><select id="plStart" aria-label="First month">' + Ga.ymOptions(start, false, '2029-12') + '</select></div>' + V.stepper('plN', n, 'plstep') + '</div></div>';
    h += '<div class="plan-res"><div class="eyebrow">Take-home total · ' + n + ' month' + (n > 1 ? 's' : '') + '</div><div class="v">RM' + fm(F.total.net) + '</div><div class="tiny muted">OT ' + fh(F.total.ot) + 'h' + (F.total.ot2 ? ' + ' + fh(F.total.ot2) + 'h 2×' : '') + ' · gross RM' + fm(F.total.gross) + ' · deductions RM' + fm(F.total.ded) + (F.total.up ? ' · unpaid ' + F.total.up + 'd' : '') + '</div></div>';
    h += V.breakdown(F, start);
    h += '<details class="tg-rules" style="margin-top:12px"' + (UI.plFillOpen ? ' open' : '') + ' id="plFillDet"><summary><b>Fill empty days</b><span class="small muted">&nbsp;· ' + planLabel(P) + '</span></summary><div class="stack" style="gap:10px;margin-top:12px">' +
      '<div class="row"><div class="field"><label for="pamt">Mon–Thu out</label>' + planSel('pamt', P.mt) + '</div><div class="field"><label for="pafr">Friday out</label>' + planSel('pafr', P.fr) + '</div><div class="field"><label for="pasa">Saturday out</label>' + planSel('pasa', P.sa, 1) + '</div><div class="field"><label for="paph">Public holiday</label><select id="paph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work (2×)</option></select></div></div>' +
      '<div class="row"><button class="btn primary" data-act="plFill">Fill empty days in these ' + n + ' month' + (n > 1 ? 's' : '') + '</button><button class="btn danger" data-act="plClear">' + (UI.plClearArm ? 'Tap again to remove planned days' : 'Remove planned days') + '</button></div>' +
      '<p class="tiny muted">Fill only touches empty days from today onward. Remove only takes out days you set by hand or by fill; imported time-card days and days before today stay.</p></div></details>';
    h += '</section>';
    h += V.brushBar(UI, p0.y, F.months[0].M);
    h += '<div class="grid2 plgrid">';
    F.months.forEach(function (m) {
      var q = U.parseYm(m.ym), days = S.months[m.ym] || {}, M = m.M, rec = S.records[m.ym + '-1'] || S.records[m.ym + '-2'];
      h += '<section class="card" style="padding:10px"><div class="card-h" style="margin-bottom:6px"><div><h3 style="font-size:15px">' + MONTHS[q.m - 1] + ' ' + q.y + '</h3><span class="tiny muted">OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + (M.up ? ' · unpaid ' + M.up + 'd' : '') + ' · H1 ' + fm(M.half1) + ' · H2 ' + fm(M.half2) + '</span></div><div style="text-align:right"><span class="chip accent">RM' + fm(M.net) + '</span>' + (rec ? '<br><span class="tiny muted">payslip saved</span>' : '') + '</div></div>' + V.monthGrid(m.ym, days, null, true) + '<div style="margin-top:8px">' + V.monthSummary(m.ym, M, M.H, true) + '</div>' + '<div class="row" style="margin-top:6px;justify-content:flex-end"><button class="btn ghost sm" data-goym="' + m.ym + '" data-go="cal">Open in Calendar</button></div></section>';
    });
    h += '</div>';
    h += '<p class="tiny muted">Same brushes as the Calendar: pick one, then tap days in any month. Everything you set here is the same data the Calendar and Home use.</p>';
    h += '<details class="card"' + (UI.cmpOpen ? ' open' : '') + ' id="cmpDet"><summary style="cursor:pointer;font-weight:600">Compare two patterns for one month</summary><div style="margin-top:12px">' + compare(UI) + '</div></details>';
    return h + '</div>';
  };
  /* −/+ stepper with a typed number; data-<step>="-1|1" buttons, input id = idName */
  V.stepper = function (id, val, step) {
    return '<div class="stepper" role="group" aria-label="Number of months"><button type="button" data-' + step + '="-1" aria-label="Fewer months">−</button><input id="' + id + '" type="number" inputmode="numeric" min="1" max="36" value="' + val + '" aria-label="Months"><button type="button" data-' + step + '="1" aria-label="More months">+</button></div>';
  };
  /* How the total is built: one row per month, then the total. */
  V.breakdown = function (F, start) {
    var h = '<div class="tbl-wrap" style="margin-top:10px"><table class="brk"><thead><tr><th>Period</th><th class="r">OT 1.5× h</th><th class="r">OT 2× h</th><th class="r">Basic</th><th class="r">OT RM</th><th class="r">Unpaid</th><th class="r">Earnings</th><th class="r">Deduct.</th><th class="r">Net</th></tr></thead><tbody>';
    var T = { ot: 0, ot2: 0, basic: 0, otRm: 0, up: 0, earn: 0, ded: 0, net: 0 };
    var row = function (lab, ot, ot2, basic, otRm, up, earn, ded, net, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + lab + '</td><td class="r">' + fh(ot) + '</td><td class="r">' + (ot2 ? fh(ot2) : '—') + '</td><td class="r">' + fm(basic) + '</td><td class="r">' + (otRm ? '+' + fm(otRm) : '—') + '</td><td class="r">' + (up ? '−' + fm(up) : '—') + '</td><td class="r">' + fm(earn) + '</td><td class="r">' + (ded ? '−' + fm(ded) : '—') + '</td><td class="r"><b>' + fm(net) + '</b></td></tr>'; };
    F.months.forEach(function (m) {
      var q = U.parseYm(m.ym), M = m.M, H = M.H, name = U.MON3[q.m - 1] + ' ' + String(q.y).slice(2);
      h += row('<button class="chip accent" data-goym="' + m.ym + '" data-go="cal" style="border:0;cursor:pointer">' + name + '</button> · 1st half', H[1].ot, H[1].ot2, M.r.basic / 2, M.o1 + M.x1, M.u1, M.earn1, 0, M.half1, 'sub');
      h += row(name + ' · 2nd half', H[2].ot, H[2].ot2, M.r.basic / 2, M.o2 + M.x2, M.u2, M.earn2, M.ded, M.half2, 'sub');
      h += row('<b>' + U.MONTHS[q.m - 1] + ' ' + q.y + '</b>', M.ot, M.ot2, M.r.basic, M.o1 + M.o2 + M.x1 + M.x2, M.u1 + M.u2, M.gross, M.ded, M.net, 'mo');
      T.ot += M.ot; T.ot2 += M.ot2; T.basic += M.r.basic; T.otRm += M.o1 + M.o2 + M.x1 + M.x2; T.up += M.u1 + M.u2; T.earn += M.gross; T.ded += M.ded; T.net += M.net;
    });
    h += row('<b>Total · ' + F.months.length + ' month' + (F.months.length > 1 ? 's' : '') + '</b>', T.ot, T.ot2, T.basic, T.otRm, T.up, T.earn, T.ded, T.net, 'total');
    h += '</tbody></table></div>';
    h += '<p class="tiny muted" style="margin-top:6px">Net = basic + OT RM − unpaid − deductions. The 1st half carries no deductions; all of a month\'s EPF, SOCSO, EIS' + (Ga.St.S.settings.skbbk ? ' and SKBBK' : '') + ' come off the 2nd half. Tap a month name to open it in the Calendar.</p>';
    return h;
  };
  /* Short money summary under a month grid in the planner. */
  V.miniSummary = function (M, S, ym) {
    var otRm = M.o1 + M.o2 + M.x1 + M.x2, up = M.u1 + M.u2, rec1 = S.records[ym + '-1'], rec2 = S.records[ym + '-2'], a = rec1 && rec1.payslip && rec1.payslip.net, b = rec2 && rec2.payslip && rec2.payslip.net;
    var h = '<dl class="kv mini" style="margin-top:8px"><dt>Basic</dt><dd>' + fm(M.r.basic) + '</dd><dt>OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + '</dt><dd>' + (otRm ? '+' + fm(otRm) : '0.00') + '</dd>';
    if (up) h += '<dt>Unpaid ' + M.up + 'd</dt><dd>−' + fm(up) + '</dd>';
    h += '<dt>EPF · SOCSO · EIS' + (M.skbbk ? ' · SKBBK' : '') + '</dt><dd>−' + fm(M.ded) + '</dd><div class="sep"></div><dt>Net · H1 ' + fm(M.half1) + ' · H2 ' + fm(M.half2) + '</dt><dd class="big">' + fm(M.net) + '</dd>';
    if (a != null || b != null) h += '<dt class="muted">Payslip</dt><dd>' + (a != null ? fm(a) : '—') + ' · ' + (b != null ? fm(b) : '—') + '</dd>';
    return h + '</dl>';
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
