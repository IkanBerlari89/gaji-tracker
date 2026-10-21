/* Calendar: month grid with brushes, day sheet, target engine card, month summary. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, fh1 = U.fh1, pad = U.pad, esc = U.esc, MON3 = U.MON3, MONTHS = U.MONTHS, TIMES = U.TIMES, LEAVES = U.LEAVES;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};
  var IC = function () { return Ga.IC; };

  function brushList() {
    var b = [['edit', 'Edit', 'tap a day']];
    TIMES.forEach(function (t) { var n = U.tmin(t), sub = n === 780 ? '½ day' : n < 1050 ? 'Sat' : n === 1050 ? 'normal' : n >= 1140 ? 'NR' : 'OT'; b.push(['t:' + t, t, sub]); });
    return b;
  }
  /* Brush toolbar (shared by Calendar and Plan). */
  V.brushBar = function (UI, year, M) {
    var h = '<div class="brushes"><div class="brush-scroll" role="toolbar" aria-label="Brush">';
    brushList().forEach(function (b) { h += '<button class="brush" data-brush="' + b[0] + '" aria-pressed="' + (UI.brush === b[0]) + '">' + b[1] + '<small>' + b[2] + '</small></button>'; });
    h += '<span class="brush-grp">Leave</span>';
    Object.keys(LEAVES).forEach(function (k) { h += '<button class="brush lv" data-brush="' + k + '" aria-pressed="' + (UI.brush === k) + '">' + (k === 'X2' ? '×2' : k === 'CL' ? 'Leave' : k) + '<small>' + LEAVES[k].replace('Unpaid ', '') + '</small></button>'; });
    h += '<button class="brush lv" data-brush="erase" aria-pressed="' + (UI.brush === 'erase') + '">Erase<small>clear day</small></button>';
    h += '</div>' + (UI.brush === 'AL' && R.alLeft(year) !== null && R.alLeft(year) <= 0 ? '<div class="note warn" style="margin-top:6px">AL balance for ' + year + ' is 0. Any AL you add now counts as <b>unpaid</b> (−RM' + fm(M.r.unpaid) + ' a day).</div>' : '') + '</div>';
    return h;
  };
  /* One month grid (shared). Every day button carries data-ym so the Plan tab can show many months at once. */
  V.monthGrid = function (ym, days, sugg, compact) {
    var p = U.parseYm(ym), n = U.daysIn(p.y, p.m), td = U.today(), first = new Date(p.y, p.m - 1, 1).getDay(), lead = (first + 6) % 7, isCur = td.y === p.y && td.m === p.m;
    var h = '<div class="cal' + (compact ? ' compact' : '') + '">', missSet = {}; Ga.missing().forEach(function (k) { missSet[k] = 1; });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<div class="dow' + (d === 'Sun' ? ' sun' : '') + '">' + d + '</div>'; });
    var cells = [], i;
    for (i = 0; i < lead; i++) cells.push('<div class="day pad"></div>');
    for (var d = 1; d <= n; d++) {
      if (d === 16 && !compact) {
        var rem = cells.length % 7; for (i = 0; rem && i < 7 - rem; i++) cells.push('<div class="day pad"></div>'); cells.push('<div class="half-split">2nd half · 16–' + n + '</div>');
        var lead2 = (new Date(p.y, p.m - 1, 16).getDay() + 6) % 7; for (i = 0; i < lead2; i++) cells.push('<div class="day pad"></div>');
      }
      var e = days[pad(d)], sg = sugg ? sugg[pad(d)] || null : null, c = R.dayCalc(ym, d, sg || e), isT = isCur && td.d === d;
      var k = c.kind === 'early' ? 'k-early' : c.kind === 'half' ? 'k-norm' : c.kind === 'empty' ? '' : 'k-' + c.kind, isMiss = !e && missSet[U.iso(p.y, p.m, d)];
      var lbl = c.label || (c.t === 'SU' ? '' : isMiss ? '?' : '—');
      var rm = c.t === 'SU' && !c.ot2 ? '' : (c.ot || c.ot2 ? '<b>' + Math.round(c.total) + '</b>' : Math.round(c.total));
      cells.push('<button class="day ' + k + (sg ? ' sugg' : '') + (isMiss ? ' miss' : '') + (c.t === 'SU' ? ' sun' : '') + (isT ? ' today' : '') + '" data-day="' + d + '" data-ym="' + ym + '" aria-label="' + d + ' ' + MONTHS[p.m - 1] + (c.ph ? ' ' + esc(c.ph) : '') + ' ' + esc(lbl) + '">' +
        '<span class="dn">' + d + (c.ph ? IC().flag : '') + (c.real ? '<span class="real-dot" title="From time card"></span>' : '') + '</span>' +
        '<span class="lbl">' + esc(lbl) + '</span>' + (c.dlab ? '<span class="dl ' + (c.dh > 0 ? 'pos' : c.dh < 0 || c.up ? 'neg' : '') + '">' + esc(c.dlab) + '</span>' : '') + (sg ? '<span class="tag sg">TARGET</span>' : c.nr ? '<span class="tag">NR</span>' : '') +
        '<span class="rm">' + (rm === '' ? '' : 'RM' + rm) + '</span></button>');
    }
    return h + cells.join('') + '</div>';
  };
  V.alChip = function (y) { var l = R.alLeft(y); if (l === null) return ''; return '<span class="chip ' + (l <= 0 ? 'bad' : l <= 2 ? 'amber' : 'good') + '" title="Annual leave left in ' + y + '">AL ' + y + ': ' + (l <= 0 ? '0 left' : l + ' left') + '</span>'; };

  V.cal = function (UI) {
    var S = St.S, ym = UI.ym, p = U.parseYm(ym), n = U.daysIn(p.y, p.m), days = S.months[ym] || {}, H = R.halves(ym, days), M = R.money(ym, H), tg = S.targets[ym] || null, sugg = tg && tg.sugg || null;
    var td = U.today(), isCur = td.y === p.y && td.m === p.m;
    var h = '<div class="calwrap"><div class="col">';
    h += '<div class="cal-head"><button class="icon-btn" data-mon="-1" aria-label="Previous month">' + IC().left + '</button><div style="text-align:center"><h2>' + MONTHS[p.m - 1] + ' ' + p.y + '</h2><span class="tiny muted">Basic RM' + fm(M.r.basic) + ' · OT RM' + fm(M.r.r15) + '/h</span><div style="margin-top:4px">' + V.alChip(p.y) + (isCur ? '' : ' <button class="chip accent" data-act="calToday" style="border:0;cursor:pointer">Today</button>') + '</div></div><button class="icon-btn" data-mon="1" aria-label="Next month">' + IC().right + '</button></div>';
    h += V.brushBar(UI, p.y, M);
    h += '<div class="card" style="padding:10px">' + V.monthGrid(ym, days, sugg) + '</div>';
    h += '<div class="legend"><span><i style="background:var(--amber-soft)"></i>OT</span><span><i style="background:var(--good-soft)"></i>2× day</span><span><i style="background:var(--blue-soft)"></i>Leave / PH</span><span><i style="background:var(--bad-soft)"></i>Unpaid / AL ✕</span><span>' + IC().flag + 'Public holiday</span><span><span class="real-dot"></span>From time card</span><span><i style="border:1.5px dashed var(--accent);background:transparent"></i>Target suggestion</span><span><i style="border:1.5px dashed var(--bad);background:transparent"></i>Not filled yet</span></div>';
    h += '<p class="tiny muted">Each day shows clock-out, <b style="color:var(--good)">+</b>/<b style="color:var(--bad)">−</b> hours against the normal end (17:30, Sat 11:30), and the day total in RM (base ' + (S.settings.baseMode === 'hour' ? 'by scheduled hours' : 'RM' + fm(M.r.day) + '/day') + ' + OT − unpaid). An empty weekday counts as a normal day.</p>';
    h += '</div><div class="col">';
    h += V.target(UI, ym, M, tg);
    h += V.monthSummary(ym, M, H);
    h += V.forecast(UI, ym);
    h += '<div class="row"><button class="btn danger" data-act="clearMonth">' + (UI.clearArm ? 'Tap again to clear ' + MON3[p.m - 1] : 'Clear this month') + '</button></div>';
    return h + '</div></div>';
  };

  V.monthSummary = function (ym, M, H, bare) {
    var S = St.S, rec1 = S.records[ym + '-1'], rec2 = S.records[ym + '-2'];
    var row = function (l, a, b, t, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + l + '</td><td class="r">' + a + '</td><td class="r">' + b + '</td><td class="r">' + t + '</td></tr>'; };
    var h = (bare ? '' : '<section class="card"><div class="card-h"><h2>Month summary</h2><span class="chip accent">Take-home RM' + fm(M.net) + '</span></div>') + '<div class="tbl-wrap"><table' + (bare ? ' class="brk"' : '') + '><thead><tr><th></th><th class="r">1–15</th><th class="r">16–end</th><th class="r">Month</th></tr></thead><tbody>';
    h += row('Paid hours', fh(H[1].paid), fh(H[2].paid), fh(H[1].paid + H[2].paid), 'sub');
    h += row('OT 1.5× hours', fh(H[1].ot), fh(H[2].ot), fh(M.ot));
    h += row('OT 2× hours', fh(H[1].ot2), fh(H[2].ot2), fh(M.ot2));
    h += row('NR days', H[1].nr, H[2].nr, H[1].nr + H[2].nr, 'sub');
    h += row('Basic', fm(M.r.basic / 2), fm(M.r.basic / 2), fm(M.r.basic));
    h += row('OT pay', fm(M.o1 + M.x1), fm(M.o2 + M.x2), fm(M.o1 + M.o2 + M.x1 + M.x2));
    h += row('Unpaid leave', M.u1 ? '−' + fm(M.u1) : '0.00', M.u2 ? '−' + fm(M.u2) : '0.00', M.u1 + M.u2 ? '−' + fm(M.u1 + M.u2) : '0.00');
    h += row('Earnings', fm(M.earn1), fm(M.earn2), fm(M.gross));
    h += row('Deductions', '0.00', '−' + fm(M.ded), '−' + fm(M.ded));
    h += row('Net pay', fm(M.half1), fm(M.half2), fm(M.net), 'total');
    var tg = S.targets[ym]; if (tg && tg.sugg && Object.keys(tg.sugg).length) { var MS = R.money(ym, R.halves(ym, R.withSugg(ym))); h += row('With target days', fm(MS.half1), fm(MS.half2), fm(MS.net), 'sub'); }
    if (rec1 || rec2) { var a = rec1 && rec1.payslip && rec1.payslip.net, b = rec2 && rec2.payslip && rec2.payslip.net; h += row('Payslip', a != null ? fm(a) : '—', b != null ? fm(b) : '—', a != null && b != null ? fm(a + b) : '—', 'sub'); }
    h += '</tbody></table></div><p class="tiny muted" style="margin-top:8px">Deductions: EPF RM' + fm(M.epf) + ' · SOCSO ' + fm(M.socso) + ' · EIS ' + fm(M.eis) + ' · SKBBK ' + fm(M.skbbk) + (S.settings.skbbk ? '' : ' (off)') + '</p>' + (bare ? '' : '</section>');
    return h;
  };

  /* forecast card: total for the next 1/2/3/6/12 months from the viewed month */
  V.forecast = function (UI, ym) {
    var n = UI.ahead || 3, fill = UI.aheadFill || 'none', P = fill === 'A' ? Ga.UI.planA : fill === 'B' ? Ga.UI.planB : null, F = R.forecast(ym, n, P), p0 = U.parseYm(ym), last = U.parseYm(U.addYm(ym, n - 1));
    var h = '<section class="card"><div class="card-h"><div><h2>Next ' + n + ' month' + (n > 1 ? 's' : '') + '</h2><span class="small muted">' + MON3[p0.m - 1] + ' ' + p0.y + (n > 1 ? ' – ' + MON3[last.m - 1] + ' ' + last.y : '') + '</span></div>' + V.stepper('aheadN', n, 'aheadstep') + '</div>';
    h += '<div class="plan-res" style="margin-bottom:10px"><div class="eyebrow">Take-home total</div><div class="v">RM' + fm(F.total.net) + '</div><div class="tiny muted">OT ' + fh(F.total.ot) + 'h' + (F.total.ot2 ? ' + ' + fh(F.total.ot2) + 'h 2×' : '') + ' · gross RM' + fm(F.total.gross) + ' · deductions RM' + fm(F.total.ded) + (F.total.up ? ' · unpaid ' + F.total.up + 'd' : '') + '</div></div>';
    h += '<div class="field" style="margin-bottom:10px"><label for="aheadFill">Days not yet on the calendar</label><select id="aheadFill"><option value="none"' + (fill === 'none' ? ' selected' : '') + '>Normal hours, no OT</option><option value="A"' + (fill === 'A' ? ' selected' : '') + '>Follow Plan A (' + planLabel(Ga.UI.planA) + ')</option><option value="B"' + (fill === 'B' ? ' selected' : '') + '>Follow Plan B (' + planLabel(Ga.UI.planB) + ')</option></select></div>';
    if (n > 1) {
      h += '<div class="tbl-wrap"><table><thead><tr><th>Month</th><th class="r">OT h</th><th class="r">Net</th></tr></thead><tbody>';
      F.months.forEach(function (m) { var q = U.parseYm(m.ym); h += '<tr><td><button class="chip' + (m.ym === ym ? ' accent' : '') + '" data-goym="' + m.ym + '" style="border:0;cursor:pointer">' + MON3[q.m - 1] + ' ' + q.y + '</button>' + (m.M.set ? ' <span class="tiny muted">' + m.M.set + ' set</span>' : '') + '</td><td class="r">' + fh(m.M.ot + m.M.ot2) + '</td><td class="r">' + fm(m.M.net) + '</td></tr>'; });
      h += '<tr class="total"><td>Total</td><td class="r">' + fh(F.total.ot + F.total.ot2) + '</td><td class="r">' + fm(F.total.net) + '</td></tr></tbody></table></div>';
    }
    h += '<p class="tiny muted" style="margin-top:8px">Days already on the calendar are kept as they are; past days are never changed. Plans A and B are set in the Plan tab.</p>';
    return h + '</section>';
  };
  function planLabel(P) { return P.mt + (P.fr !== P.mt ? '/' + P.fr : '') + ', Sat ' + (P.sa === 'off' ? 'off' : P.sa); }

  /* target card */
  function rulesSel(id, val, list, label) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-tgr="1">' + list.map(function (o) { var v = o[0] || o; return '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + (o[1] || o) + '</option>'; }).join('') + '</select></div>'; }
  function chk(id, on, label) { return '<label class="chk"><input type="checkbox" id="' + id + '" data-tgr="1"' + (on ? ' checked' : '') + '><span>' + label + '</span></label>'; }
  function rulesSummary(Rl) { var a = ['weekday ≤' + Rl.wkMax + (Rl.frMax !== Rl.wkMax ? ' (Fri ≤' + Rl.frMax + ')' : ''), Rl.satOn ? 'Sat ≤' + Rl.satMax : 'no Sat']; if (Rl.sun) a.push('Sun'); if (Rl.ph) a.push('PH'); if (Rl.extend) a.push('extend set days'); return a.join(' · '); }
  function tgRules(UI) {
    var Rl = St.S.settings.tg, wk = [['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 · NR'], ['19:30', '19:30 · NR'], ['20:00', '20:00 · NR'], ['20:30', '20:30 · NR']];
    var h = '<details class="tg-rules"' + (UI.rulesOpen ? ' open' : '') + ' id="tgDet"><summary><b>Rules</b><span class="small muted">&nbsp;· ' + rulesSummary(Rl) + '</span></summary><div class="stack" style="gap:12px;margin-top:12px">';
    h += '<div class="row">' + rulesSel('tgWk', Rl.wkMax, wk, 'Mon–Thu latest') + rulesSel('tgFr', Rl.frMax, wk, 'Friday latest') + '</div>';
    h += '<div class="row" style="align-items:flex-end">' + chk('tgSatOn', Rl.satOn, 'Extend Saturdays') + rulesSel('tgSat', Rl.satMax, [['12:30'], ['13:00'], ['15:00'], ['16:30'], ['17:00'], ['17:30']], 'Saturday latest') + '</div>';
    h += '<div><div class="field" style="margin-bottom:6px"><label>Weekdays I can stay late</label></div><div class="dow-pick">' + [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri']].map(function (d) { return '<label class="pill"><input type="checkbox" data-tgdow="' + d[0] + '"' + (Rl.dow.indexOf(d[0]) >= 0 ? ' checked' : '') + '><span>' + d[1] + '</span></label>'; }).join('') + '</div></div>';
    h += '<div class="chk-grid">' + chk('tgSun', Rl.sun, 'Work Sundays (2×, last resort)') + chk('tgPh', Rl.ph, 'Work public holidays (2×, last resort)') + chk('tgExt', Rl.extend, 'Also extend days I already set') + '</div>';
    h += '<div class="row">' + rulesSel('tgFrom', Rl.from, [['today', 'From today onward'], ['month', 'Whole month']], 'Which days') + rulesSel('tgPrio', Rl.prio, [['sat', 'Saturdays first'], ['wk', 'Weekdays first'], ['spread', 'Spread evenly']], 'Fill order') + '</div>';
    h += '<button class="btn ghost" data-act="tgReset" style="align-self:flex-start">Reset rules</button></div></details>';
    return h;
  }
  V.readTgRules = function (UI) {
    var Rl = St.S.settings.tg, g = function (id) { return document.getElementById(id); };
    Rl.wkMax = g('tgWk').value; Rl.frMax = g('tgFr').value; Rl.satMax = g('tgSat').value; Rl.satOn = g('tgSatOn').checked; Rl.sun = g('tgSun').checked; Rl.ph = g('tgPh').checked; Rl.extend = g('tgExt').checked; Rl.from = g('tgFrom').value; Rl.prio = g('tgPrio').value;
    Rl.dow = [].slice.call(document.querySelectorAll('[data-tgdow]')).filter(function (x) { return x.checked; }).map(function (x) { return +x.dataset.tgdow; });
    var tg = St.S.targets[UI.ym]; if (tg && tg.target) { var res = R.suggest(UI.ym, tg.target); tg.sugg = res.sugg; tg.res = res; St.touch(['settings', 'targets/' + UI.ym], 'Target rules'); } else St.touch('settings', 'Target rules');
    UI.rulesOpen = true; Ga.render();
  };
  V.target = function (UI, ym, M, tg) {
    var p = U.parseYm(ym), open = UI.targetOpen || !!(tg && tg.target);
    var h = '<section class="card target"><div class="card-h" style="margin-bottom:' + (open ? '12px' : '0') + '"><div><h2>Target for ' + MONTHS[p.m - 1] + '</h2><span class="small muted">Now RM' + fm(M.net) + ' take-home</span></div><button class="btn ghost sm" data-act="tgToggle">' + (open ? 'Hide' : 'Set target') + '</button></div>';
    if (!open) return h + '</section>';
    h += tgRules(UI);
    h += '<div class="row" style="margin-top:12px"><div class="field"><label for="tgIn">Take-home target (RM)</label><input id="tgIn" inputmode="numeric" value="' + (tg && tg.target || '') + '" placeholder="e.g. 4500"></div><button class="btn primary" data-act="tgGo" style="align-self:flex-end">Suggest days</button></div>';
    if (tg && tg.res) {
      var Rs = tg.res, n = Object.keys(tg.sugg || {}).length;
      if (Rs.reached && !n) h += '<div class="plan-res" style="margin-top:12px"><b>Your calendar already reaches RM' + fm(tg.target) + '.</b></div>';
      else {
        h += '<div class="plan-res" style="margin-top:12px"><div class="eyebrow">' + (Rs.reached ? 'To reach RM' + fm(tg.target) : 'Best possible within your limits') + '</div><div class="v">+' + fh1(Rs.otNeed + (Rs.x2Need || 0)) + ' OT hours</div>' +
          '<div class="small muted">' + n + ' day' + (n === 1 ? '' : 's') + ' marked <b>TARGET</b> on the calendar (' + [Rs.ty && Rs.ty.wk ? Rs.ty.wk + ' weekday' + (Rs.ty.wk > 1 ? 's' : '') : '', Rs.ty && Rs.ty.sa ? Rs.ty.sa + ' Saturday' + (Rs.ty.sa > 1 ? 's' : '') : '', Rs.ty && Rs.ty.x2 ? Rs.ty.x2 + ' Sunday/PH at 2×' : ''].filter(Boolean).join(', ') + '). ' + (Rs.x2Need ? 'Plus ' + fh1(Rs.x2Need) + 'h at 2×. ' : '') + 'Total OT ' + fh1(Rs.otTotal) + 'h. Take-home RM' + fm(Rs.net) + '.</div>' +
          (Rs.reached ? '' : '<div class="small" style="color:var(--bad);margin-top:4px">RM' + fm(tg.target) + ' is out of reach with these rules. Short by RM' + fm(tg.target - Rs.net) + '. Loosen a rule above, for example a later weekday time.</div>') + '</div>' +
          '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="tgApply" style="flex:1"' + (n ? '' : ' disabled') + '>Put on calendar</button><button class="btn" data-act="tgClear">Clear target</button></div>';
      }
      h += '<p class="tiny muted" style="margin-top:8px">Leave, unpaid and imported days are never changed. Suggestions update when you change a rule.</p>';
    }
    return h + '</section>';
  };

  /* actions */
  A.applyBrush = function (UI, d, ymArg) {
    var S = St.S, ym = ymArg || UI.ym, b = UI.brush, days = S.months[ym] || (S.months[ym] = {}), k = pad(d);
    if (b === 'edit') { A.openDay(UI, d, ym); return; }
    if (b === 'erase') delete days[k];
    else if (b.indexOf('t:') === 0) days[k] = { k: 'W', out: b.slice(2) };
    else days[k] = { k: b };
    St.touchDay(ym, d, 'Calendar ' + MON3[U.parseYm(ym).m - 1] + ' ' + d); Ga.render();
  };
  A.setDay = function (ym, d, ent, msg) {
    var S = St.S, days = S.months[ym] || (S.months[ym] = {});
    if (!ent) delete days[pad(d)]; else days[pad(d)] = ent;
    St.touchDay(ym, d, msg || 'Calendar ' + MON3[U.parseYm(ym).m - 1] + ' ' + d);
  };
  A.openDay = function (UI, d, ymArg) {
    var S = St.S, ym = ymArg || UI.ym, p = U.parseYm(ym), e = (S.months[ym] || {})[pad(d)], c = R.dayCalc(ym, d, e);
    var val = e ? (e.k === 'W' ? 'W' : e.k) : '';
    var h = '<div class="sheet-h"><div><div class="eyebrow">' + U.DOWL[new Date(p.y, p.m - 1, d).getDay()] + (c.ph ? ' · ' + esc(c.ph) : '') + '</div><h2 id="dayT" style="font-size:20px">' + d + ' ' + MONTHS[p.m - 1] + ' ' + p.y + '</h2></div><button class="icon-btn" data-close="1" aria-label="Close">' + IC().x + '</button></div>' +
      '<div class="stack">' +
      '<div class="row"><div class="field"><label for="dType">Day</label><select id="dType"><option value="">Normal / not set</option><option value="W"' + (val === 'W' ? ' selected' : '') + '>Worked · clock-out time</option>' +
      Object.keys(LEAVES).map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + LEAVES[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="max-width:150px"><label for="dOut">Clock out</label><input id="dOut" type="time" value="' + esc(e && e.out || '18:30') + '"></div></div>';
    h += '<div class="quick" id="dQuick">' + (c.t === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']).map(function (x) { return '<button type="button" data-q="' + x + '">' + x + '</button>'; }).join('') + '</div>';
    if (R.alLeft(p.y) !== null && R.alLeft(p.y) <= 0) h += '<div class="note warn" id="alWarn" hidden>AL balance for ' + p.y + ' is 0. This AL counts as unpaid.</div>';
    if (e && e.real) h += '<div class="note"><b>From time card:</b> in ' + esc(e['in'] || '—') + ' · out ' + esc(e.out || '—') + ' · paid ' + (e.paid != null ? fh(e.paid) : '—') + 'h' + (e.remark ? ' · “' + esc(e.remark) + '”' : '') + '</div>';
    h += '<dl class="kv" id="dRes"></dl>' +
      '<div class="row"><button class="btn primary" id="dSave" style="flex:1">Save day</button><button class="btn" id="dClear">Clear</button></div></div>';
    Ga.sheet(h, 'dayT');
    var upd = function () {
      var t = document.getElementById('dType').value, o = document.getElementById('dOut').value; document.getElementById('dOut').disabled = t !== 'W'; var aw = document.getElementById('alWarn'); if (aw) aw.hidden = t !== 'AL';
      document.querySelectorAll('#dQuick button').forEach(function (b) { b.setAttribute('aria-pressed', t === 'W' && b.dataset.q === o); });
      var ent = t === '' ? null : t === 'W' ? { k: 'W', out: o } : { k: t }; if (ent && e && e.real && t === e.k && (t !== 'W' || o === e.out)) ent = e;
      if (ent && ent.k === 'AL' && !(e && e.k === 'AL') && R.alLeft(p.y) !== null && R.alLeft(p.y) <= 0 && U.iso(p.y, p.m, d) >= S.settings.alAsOf) R.AL().over[U.iso(p.y, p.m, d)] = 1;
      var cc = R.dayCalc(ym, d, ent);
      document.getElementById('dRes').innerHTML = '<dt>OT 1.5×</dt><dd>' + fh(cc.ot) + ' h · RM' + fm(cc.otAmt) + '</dd>' + (cc.ot2 ? '<dt>OT 2×</dt><dd>' + fh(cc.ot2) + ' h · RM' + fm(cc.x2Amt) + '</dd>' : '') + (cc.up ? '<dt>Unpaid</dt><dd>−RM' + fm(cc.upAmt) + '</dd>' : '') +
        '<dt>Paid hours</dt><dd>' + (cc.paid != null ? fh(cc.paid) + (cc.est ? ' (est.)' : '') : '—') + '</dd><dt>Base share</dt><dd>RM' + fm(cc.base) + '</dd><div class="sep"></div><dt>Day total</dt><dd class="big">RM' + fm(cc.total) + '</dd>' +
        (cc.early ? '<dt class="tiny" style="grid-column:1/-1;color:var(--bad)">Left before the scheduled end. No OT, and the time card drops to the previous 30-minute mark.</dt>' : '') +
        (cc.nr ? '<dt class="tiny" style="grid-column:1/-1">NR appears on the time card from 19:00. For you it is a label; the money is the OT hours.</dt>' : '');
    };
    document.getElementById('dType').onchange = upd; document.getElementById('dOut').oninput = upd; upd();
    document.getElementById('dQuick').onclick = function (ev) { var b = ev.target.closest('[data-q]'); if (!b) return; document.getElementById('dType').value = 'W'; document.getElementById('dOut').value = b.dataset.q; upd(); };
    document.getElementById('dSave').onclick = function () {
      var t = document.getElementById('dType').value, o = document.getElementById('dOut').value, ent;
      if (t === '') ent = null; else if (t === 'W') ent = Object.assign({}, e && e.real && e.k === 'W' && e.out === o ? e : {}, { k: 'W', out: o }); else ent = Object.assign({}, e && e.real && e.k === t ? e : {}, { k: t });
      A.setDay(ym, d, ent); Ga.closeLayer(); Ga.render();
    };
    document.getElementById('dClear').onclick = function () { A.setDay(ym, d, null); Ga.closeLayer(); Ga.render(); };
  };
})(window);
