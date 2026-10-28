/* Plan: a what-if scenario kept apart from the real calendar. Real days show locked; days after today can be planned. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, fh1 = U.fh1, pad = U.pad, MONTHS = U.MONTHS, MON3 = U.MON3;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};

  function planSel(id, val, sa) {
    var opts = sa ? [['off', 'Off'], ['11:30', '11:30 (normal)'], ['12:30', '12:30'], ['13:00', '13:00'], ['15:00', '15:00'], ['16:30', '16:30'], ['17:00', '17:00'], ['17:30', '17:30']] :
      [['17:30', '17:30 (normal)'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 · NR'], ['19:30', '19:30 · NR'], ['20:00', '20:00 · NR'], ['20:30', '20:30 · NR']];
    return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  function planLabel(P) { return P.mt + (P.fr !== P.mt ? ' / Fri ' + P.fr : '') + ' · Sat ' + (P.sa === 'off' ? 'off' : P.sa) + (P.ph === 'work' ? ' · PH 2×' : ''); }
  function monthsInRange(UI) { var out = []; for (var i = 0; i < UI.plN; i++) out.push(U.addYm(UI.plStart, i)); return out; }

  V.plan = function (UI) {
    var S = St.S, start = UI.plStart, n = UI.plN, F = R.forecast(start, n, null), p0 = U.parseYm(start), last = U.parseYm(U.addYm(start, n - 1)), P = UI.planA, planCount = 0;
    monthsInRange(UI).forEach(function (ym) { planCount += Object.keys((S.plans.days[ym]) || {}).length; });
    var h = '<div class="stack">';
    h += '<section class="card"><div class="card-h"><div><h2>Plan ' + n + ' month' + (n > 1 ? 's' : '') + '</h2><span class="small muted">' + MONTHS[p0.m - 1] + ' ' + p0.y + (n > 1 ? ' – ' + MONTHS[last.m - 1] + ' ' + last.y : '') + ' · what-if, separate from the Calendar</span></div>' +
      '<div class="row"><div class="field" style="flex:0 0 170px"><select id="plStart" aria-label="First month">' + Ga.ymOptions(start, false, '2029-12') + '</select></div>' + V.stepper('plN', n, 'plstep') + '</div></div>';
    h += '<div class="plan-res"><div class="eyebrow">Take-home total · ' + n + ' month' + (n > 1 ? 's' : '') + '</div><div class="v">RM' + fm(F.total.net) + '</div><div class="tiny muted">OT ' + fh(F.total.ot) + 'h' + (F.total.ot2 ? ' + ' + fh(F.total.ot2) + 'h 2×' : '') + ' · gross RM' + fm(F.total.gross) + ' · deductions RM' + fm(F.total.ded) + (F.total.up ? ' · unpaid ' + F.total.up + 'd' : '') + ' · ' + planCount + ' planned day' + (planCount === 1 ? '' : 's') + '</div></div>';
    h += V.breakdown(F, start);
    h += '<details class="tg-rules" style="margin-top:12px"' + (UI.plFillOpen ? ' open' : '') + ' id="plFillDet"><summary><b>Fill empty days</b><span class="small muted">&nbsp;· ' + planLabel(P) + '</span></summary><div class="stack" style="gap:10px;margin-top:12px">' +
      '<div class="row"><div class="field"><label for="pamt">Mon–Thu out</label>' + planSel('pamt', P.mt) + '</div><div class="field"><label for="pafr">Friday out</label>' + planSel('pafr', P.fr) + '</div><div class="field"><label for="pasa">Saturday out</label>' + planSel('pasa', P.sa, 1) + '</div><div class="field"><label for="paph">Public holiday</label><select id="paph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work (2×)</option></select></div></div>' +
      '<div class="row"><button class="btn primary" data-act="plFill">Fill empty days in these ' + n + ' month' + (n > 1 ? 's' : '') + '</button><button class="btn danger" data-act="plClear">' + (UI.plClearArm ? 'Tap again to remove planned days' : 'Remove planned days') + '</button></div>' +
      '<p class="tiny muted">Fill touches days in this range that have nothing on the Calendar and nothing planned yet. Remove clears every planned day in this range, so the months fall back to the Calendar. The Calendar is never changed from here.</p></div></details>';
    h += V.target(UI);
    h += '</section>';
    h += V.brushBar(UI, p0.y, F.months[0].M, 'plan');
    h += '<div class="grid2 plgrid">';
    F.months.forEach(function (m) {
      var q = U.parseYm(m.ym), M = m.M, rec = S.records[m.ym + '-1'] || S.records[m.ym + '-2'], tg = S.targets[m.ym], sugg = tg && tg.sugg && Object.keys(tg.sugg).length ? tg.sugg : null;
      h += '<section class="card" style="padding:10px"><div class="card-h" style="margin-bottom:6px"><div><h3 style="font-size:15px">' + MONTHS[q.m - 1] + ' ' + q.y + '</h3><span class="tiny muted">OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + (M.up ? ' · unpaid ' + M.up + 'd' : '') + ' · H1 ' + fm(M.half1) + ' · H2 ' + fm(M.half2) + '</span></div><div style="text-align:right"><span class="chip accent">RM' + fm(M.net) + '</span>' + (rec ? '<br><span class="tiny muted">payslip saved</span>' : '') + '</div></div>' + V.monthGrid(m.ym, R.planDays(m.ym), { compact: true, mode: 'plan', sugg: sugg }) + '<div style="margin-top:8px">' + V.monthSummary(m.ym, M, M.H, true) + '</div>' + '<div class="row" style="margin-top:6px;justify-content:flex-end"><button class="btn ghost sm" data-goym="' + m.ym + '" data-go="cal">Open in Calendar</button></div></section>';
    });
    h += '</div>' + V.legend(true);
    h += '<p class="tiny muted">Pick a brush, then tap any day in any month, past or future. A planned day overrides the real one here only; the Calendar keeps the real data.</p>';
    h += '<details class="card"' + (UI.cmpOpen ? ' open' : '') + ' id="cmpDet"><summary style="cursor:pointer;font-weight:600">Compare two patterns for one month</summary><div style="margin-top:12px">' + compare(UI) + '</div></details>';
    return h + '</div>';
  };

  V.stepper = function (id, val, step) {
    return '<div class="stepper" role="group" aria-label="Number of months"><button type="button" data-' + step + '="-1" aria-label="Fewer months">−</button><input id="' + id + '" type="number" inputmode="numeric" min="1" max="48" value="' + val + '" aria-label="Months"><button type="button" data-' + step + '="1" aria-label="More months">+</button></div>';
  };
  V.breakdown = function (F, start) {
    var h = '<div class="tbl-wrap" style="margin-top:10px"><table class="brk"><thead><tr><th>Period</th><th class="r">OT 1.5× h</th><th class="r">OT 2× h</th><th class="r">Basic</th><th class="r">OT RM</th><th class="r">Unpaid</th><th class="r">Earnings</th><th class="r">Deduct.</th><th class="r">Net</th></tr></thead><tbody>';
    var T = { ot: 0, ot2: 0, basic: 0, otRm: 0, up: 0, earn: 0, ded: 0, net: 0 };
    var row = function (lab, ot, ot2, basic, otRm, up, earn, ded, net, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + lab + '</td><td class="r">' + fh(ot) + '</td><td class="r">' + (ot2 ? fh(ot2) : '—') + '</td><td class="r">' + fm(basic) + '</td><td class="r">' + (otRm ? '+' + fm(otRm) : '—') + '</td><td class="r">' + (up ? '−' + fm(up) : '—') + '</td><td class="r">' + fm(earn) + '</td><td class="r">' + (ded ? '−' + fm(ded) : '—') + '</td><td class="r"><b>' + fm(net) + '</b></td></tr>'; };
    F.months.forEach(function (m) {
      var q = U.parseYm(m.ym), M = m.M, H = M.H, name = MON3[q.m - 1] + ' ' + String(q.y).slice(2);
      h += row('<button class="chip accent" data-goym="' + m.ym + '" data-go="cal" style="border:0;cursor:pointer">' + name + '</button> · 1st half', H[1].ot, H[1].ot2, M.r.basic / 2, M.o1 + M.x1, M.u1, M.earn1, 0, M.half1, 'sub');
      h += row(name + ' · 2nd half', H[2].ot, H[2].ot2, M.r.basic / 2, M.o2 + M.x2, M.u2, M.earn2, M.ded, M.half2, 'sub');
      h += row('<b>' + MONTHS[q.m - 1] + ' ' + q.y + '</b>', M.ot, M.ot2, M.r.basic, M.o1 + M.o2 + M.x1 + M.x2, M.u1 + M.u2, M.gross, M.ded, M.net, 'mo');
      T.ot += M.ot; T.ot2 += M.ot2; T.basic += M.r.basic; T.otRm += M.o1 + M.o2 + M.x1 + M.x2; T.up += M.u1 + M.u2; T.earn += M.gross; T.ded += M.ded; T.net += M.net;
    });
    h += row('<b>Total · ' + F.months.length + ' month' + (F.months.length > 1 ? 's' : '') + '</b>', T.ot, T.ot2, T.basic, T.otRm, T.up, T.earn, T.ded, T.net, 'total');
    h += '</tbody></table></div>';
    h += '<p class="tiny muted" style="margin-top:6px">Net = basic + OT RM − unpaid − deductions. Real days come from the Calendar; planned days are yours to change here. The 1st half carries no deductions; all of a month\'s EPF, SOCSO, EIS' + (St.S.settings.skbbk ? ' and SKBBK' : '') + ' come off the 2nd half.</p>';
    return h;
  };

  /* ---- target engine (plan scenario) ---- */
  function rulesSel(id, val, list, label) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-tgr="1">' + list.map(function (o) { var v = o[0] || o; return '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + (o[1] || o) + '</option>'; }).join('') + '</select></div>'; }
  function chk(id, on, label) { return '<label class="chk"><input type="checkbox" id="' + id + '" data-tgr="1"' + (on ? ' checked' : '') + '><span>' + label + '</span></label>'; }
  function rulesSummary(Rl) { var a = ['weekday ≤' + Rl.wkMax + (Rl.frMax !== Rl.wkMax ? ' (Fri ≤' + Rl.frMax + ')' : ''), Rl.satOn ? 'Sat ≤' + Rl.satMax : 'no Sat']; if (Rl.sun) a.push('Sun'); if (Rl.ph) a.push('PH'); if (Rl.extend) a.push('extend planned days'); return a.join(' · '); }
  function tgRules(UI) {
    var Rl = St.S.settings.tg, wk = [['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 · NR'], ['19:30', '19:30 · NR'], ['20:00', '20:00 · NR'], ['20:30', '20:30 · NR']];
    var h = '<details class="tg-rules"' + (UI.rulesOpen ? ' open' : '') + ' id="tgDet"><summary><b>Rules</b><span class="small muted">&nbsp;· ' + rulesSummary(Rl) + '</span></summary><div class="stack" style="gap:12px;margin-top:12px">';
    h += '<div class="row">' + rulesSel('tgWk', Rl.wkMax, wk, 'Mon–Thu latest') + rulesSel('tgFr', Rl.frMax, wk, 'Friday latest') + '</div>';
    h += '<div class="row" style="align-items:flex-end">' + chk('tgSatOn', Rl.satOn, 'Extend Saturdays') + rulesSel('tgSat', Rl.satMax, [['12:30'], ['13:00'], ['15:00'], ['16:30'], ['17:00'], ['17:30']], 'Saturday latest') + '</div>';
    h += '<div><div class="field" style="margin-bottom:6px"><label>Weekdays I can stay late</label></div><div class="dow-pick">' + [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri']].map(function (d) { return '<label class="pill"><input type="checkbox" data-tgdow="' + d[0] + '"' + (Rl.dow.indexOf(d[0]) >= 0 ? ' checked' : '') + '><span>' + d[1] + '</span></label>'; }).join('') + '</div></div>';
    h += '<div class="chk-grid">' + chk('tgSun', Rl.sun, 'Work Sundays (2×, last resort)') + chk('tgPh', Rl.ph, 'Work public holidays (2×, last resort)') + chk('tgExt', Rl.extend, 'Also extend days already planned') + '</div>';
    h += '<div class="row">' + rulesSel('tgPrio', Rl.prio, [['sat', 'Saturdays first'], ['wk', 'Weekdays first'], ['spread', 'Spread evenly']], 'Fill order') + '</div>';
    h += '<button class="btn ghost" data-act="tgReset" style="align-self:flex-start">Reset rules</button></div></details>';
    return h;
  }
  V.readTgRules = function (UI) {
    var Rl = St.S.settings.tg, g = function (id) { return document.getElementById(id); };
    Rl.wkMax = g('tgWk').value; Rl.frMax = g('tgFr').value; Rl.satMax = g('tgSat').value; Rl.satOn = g('tgSatOn').checked; Rl.sun = g('tgSun').checked; Rl.ph = g('tgPh').checked; Rl.extend = g('tgExt').checked; Rl.prio = g('tgPrio').value; Rl.from = 'month';
    Rl.dow = [].slice.call(document.querySelectorAll('[data-tgdow]')).filter(function (x) { return x.checked; }).map(function (x) { return +x.dataset.tgdow; });
    var ym = UI.plTgYm, tg = St.S.targets[ym], paths = ['settings'];
    if (tg && tg.target) { var res = R.suggest(ym, tg.target, null, R.planDays(ym)); tg.sugg = res.sugg; tg.res = res; paths.push('targets/' + ym); }
    St.touch(paths, 'Target rules'); UI.rulesOpen = true; Ga.render();
  };
  V.target = function (UI) {
    var S = St.S, months = monthsInRange(UI); if (months.indexOf(UI.plTgYm) < 0) UI.plTgYm = months[0];
    var ym = UI.plTgYm, p = U.parseYm(ym), tg = S.targets[ym] || null, M = R.forecastMonth(ym, null), open = UI.targetOpen || !!(tg && tg.target);
    var h = '<details class="tg-rules" style="margin-top:12px"' + (open ? ' open' : '') + ' id="tgOuter"><summary><b>Target</b><span class="small muted">&nbsp;· reach a take-home amount by adding planned OT days</span></summary><div class="stack" style="gap:10px;margin-top:12px">';
    h += '<div class="row"><div class="field" style="flex:0 0 170px"><label for="plTgYm">Month</label><select id="plTgYm">' + months.map(function (m) { var q = U.parseYm(m); return '<option value="' + m + '"' + (m === ym ? ' selected' : '') + '>' + MONTHS[q.m - 1] + ' ' + q.y + '</option>'; }).join('') + '</select></div><div class="field"><label for="tgIn">Take-home target (RM)</label><input id="tgIn" inputmode="numeric" value="' + (tg && tg.target || '') + '" placeholder="e.g. 4500"></div><button class="btn primary" data-act="tgGo" style="align-self:flex-end">Suggest days</button></div>';
    h += '<p class="tiny muted">' + MONTHS[p.m - 1] + ' now: RM' + fm(M.net) + ' take-home with what is planned.</p>';
    h += tgRules(UI);
    if (tg && tg.res) {
      var Rs = tg.res, n = Object.keys(tg.sugg || {}).length;
      if (Rs.reached && !n) h += '<div class="plan-res"><b>' + MONTHS[p.m - 1] + ' already reaches RM' + fm(tg.target) + '.</b></div>';
      else {
        h += '<div class="plan-res"><div class="eyebrow">' + (Rs.reached ? 'To reach RM' + fm(tg.target) : 'Best possible within your rules') + '</div><div class="v">+' + fh1(Rs.otNeed + (Rs.x2Need || 0)) + ' OT hours</div>' +
          '<div class="small muted">' + n + ' day' + (n === 1 ? '' : 's') + ' marked <b>TARGET</b> in the ' + MONTHS[p.m - 1] + ' grid (' + [Rs.ty && Rs.ty.wk ? Rs.ty.wk + ' weekday' + (Rs.ty.wk > 1 ? 's' : '') : '', Rs.ty && Rs.ty.sa ? Rs.ty.sa + ' Saturday' + (Rs.ty.sa > 1 ? 's' : '') : '', Rs.ty && Rs.ty.x2 ? Rs.ty.x2 + ' Sunday/PH at 2×' : ''].filter(Boolean).join(', ') + '). ' + (Rs.x2Need ? 'Plus ' + fh1(Rs.x2Need) + 'h at 2×. ' : '') + 'Total OT ' + fh1(Rs.otTotal) + 'h. Take-home RM' + fm(Rs.net) + '.</div>' +
          (Rs.reached ? '' : '<div class="small" style="color:var(--bad);margin-top:4px">RM' + fm(tg.target) + ' is out of reach with these rules. Short by RM' + fm(tg.target - Rs.net) + '. Loosen a rule, for example a later weekday time.</div>') + '</div>' +
          '<div class="row"><button class="btn primary" data-act="tgApply" style="flex:1"' + (n ? '' : ' disabled') + '>Add to plan</button><button class="btn" data-act="tgClear">Clear target</button></div>';
      }
      h += '<p class="tiny muted">Leave, unpaid and days already set are never changed unless the rule says to extend them. Suggestions update when you change a rule.</p>';
    }
    return h + '</div></details>';
  };

  function compare(UI) {
    var ym = UI.planYm, A2 = R.planMonth(ym, UI.planA), B = R.planMonth(ym, UI.planB), p = U.parseYm(ym), cnt = { MT: 0, FR: 0, SA: 0 };
    for (var d = 1; d <= U.daysIn(p.y, p.m); d++) { var t = U.dayType(p.y, p.m, d); if (!U.PH[U.iso(p.y, p.m, d)] && cnt[t] != null) cnt[t]++; }
    var col = function (id, P, M, name) {
      return '<div class="stack" style="gap:10px"><h3>' + name + '</h3>' +
        '<div class="field"><label for="' + id + 'mt">Mon–Thu out</label>' + planSel(id + 'mt', P.mt) + '</div>' +
        '<div class="field"><label for="' + id + 'fr">Friday out</label>' + planSel(id + 'fr', P.fr) + '</div>' +
        '<div class="field"><label for="' + id + 'sa">Saturday out</label>' + planSel(id + 'sa', P.sa, 1) + '</div>' +
        '<div class="field"><label for="' + id + 'ph">Public holiday</label><select id="' + id + 'ph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work (2×)</option></select></div>' +
        '<div class="plan-res"><div class="eyebrow">Take-home</div><div class="v">RM' + fm(M.net) + '</div><div class="tiny muted">OT ' + fh(M.ot) + 'h' + (M.ot2 ? ' + ' + fh(M.ot2) + 'h 2×' : '') + ' · gross ' + fm(M.gross) + '</div><div class="tiny muted">1st half ' + fm(M.half1) + ' · 2nd half ' + fm(M.half2) + '</div></div></div>';
    };
    var diff = B.net - A2.net;
    return '<div class="row" style="margin-bottom:10px"><div class="field" style="flex:0 0 190px"><select id="planYm" aria-label="Month">' + Ga.ymOptions(ym, false, '2029-12') + '</select></div><span class="small muted">' + MONTHS[p.m - 1] + ' has ' + cnt.MT + ' Mon–Thu, ' + cnt.FR + ' Fridays and ' + cnt.SA + ' Saturdays (public holidays excluded). Sundays off. A full month on each pattern, ignoring the Calendar.</span></div>' +
      '<div class="plan-cols">' + col('pA', UI.planA, A2, 'Pattern A (also used by Fill)') + col('pB', UI.planB, B, 'Pattern B') + '</div>' +
      '<div class="note" style="margin-top:12px">Pattern B is <b>' + (diff >= 0 ? '+' : '−') + 'RM' + fm(Math.abs(diff)) + '</b> a month vs Pattern A.</div>';
  }

  /* ---- actions on the plan scenario ---- */
  A.setPlanDay = function (ym, d, ent) {
    var S = St.S, days = S.plans.days[ym] || (S.plans.days[ym] = {}), k = pad(d);
    if (!ent) delete days[k]; else days[k] = Object.assign({}, ent, { plan: 1 });
    if (!Object.keys(days).length) delete S.plans.days[ym];
  };
  A.planBrush = function (UI, d, ym) {
    var b = UI.brush;
    if (b === 'edit') { A.openPlanDay(UI, d, ym); return; }
    var ent = b === 'erase' ? null : b.indexOf('t:') === 0 ? { k: 'W', out: b.slice(2) } : { k: b };
    A.setPlanDay(ym, d, ent); St.touch('plans/' + ym + '/' + pad(d), 'Plan ' + MON3[U.parseYm(ym).m - 1] + ' ' + d); Ga.render();
  };
  A.openPlanDay = function (UI, d, ym) {
    var S = St.S, p = U.parseYm(ym), pe = (S.plans.days[ym] || {})[pad(d)], re = (S.months[ym] || {})[pad(d)], e = pe || re, c = R.dayCalc(ym, d, e), val = e ? (e.k === 'W' ? 'W' : e.k) : '', LEAVES = U.LEAVES;
    var h = '<div class="sheet-h"><div><div class="eyebrow">Plan · ' + U.DOWL[new Date(p.y, p.m - 1, d).getDay()] + (c.ph ? ' · ' + c.ph : '') + '</div><h2 id="dayT" style="font-size:20px">' + d + ' ' + MONTHS[p.m - 1] + ' ' + p.y + '</h2></div><button class="icon-btn" data-close="1" aria-label="Close">' + Ga.IC.x + '</button></div><div class="stack">' +
      '<div class="row"><div class="field"><label for="dType">Planned day</label><select id="dType"><option value="">' + (re ? 'Same as the Calendar (' + (re.k === 'W' ? 'out ' + re.out : LEAVES[re.k] || re.k) + ')' : 'Nothing planned · normal day') + '</option><option value="W"' + (val === 'W' ? ' selected' : '') + '>Worked · clock-out time</option>' + Object.keys(LEAVES).map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + LEAVES[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="max-width:150px"><label for="dOut">Clock out</label><input id="dOut" type="time" value="' + (e && e.out || (c.t === 'SA' ? '13:00' : '18:30')) + '"></div></div>' +
      '<div class="quick" id="dQuick">' + (c.t === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']).map(function (x) { return '<button type="button" data-q="' + x + '">' + x + '</button>'; }).join('') + '</div>' +
      '<dl class="kv" id="dRes"></dl><div class="row"><button class="btn primary" id="dSave" style="flex:1">Save to plan</button><button class="btn" id="dClear">Clear</button></div></div>';
    Ga.sheet(h, 'dayT');
    var upd = function () {
      var t = document.getElementById('dType').value, o = document.getElementById('dOut').value; document.getElementById('dOut').disabled = t !== 'W';
      document.querySelectorAll('#dQuick button').forEach(function (b) { b.setAttribute('aria-pressed', t === 'W' && b.dataset.q === o); });
      var cc = R.dayCalc(ym, d, t === '' ? null : t === 'W' ? { k: 'W', out: o } : { k: t });
      document.getElementById('dRes').innerHTML = '<dt>OT 1.5×</dt><dd>' + fh(cc.ot) + ' h · RM' + fm(cc.otAmt) + '</dd>' + (cc.ot2 ? '<dt>OT 2×</dt><dd>' + fh(cc.ot2) + ' h · RM' + fm(cc.x2Amt) + '</dd>' : '') + (cc.up ? '<dt>Unpaid</dt><dd>−RM' + fm(cc.upAmt) + '</dd>' : '') + '<div class="sep"></div><dt>Day total</dt><dd class="big">RM' + fm(cc.total) + '</dd>';
    };
    document.getElementById('dType').onchange = upd; document.getElementById('dOut').oninput = upd; upd();
    document.getElementById('dQuick').onclick = function (ev) { var b = ev.target.closest('[data-q]'); if (!b) return; document.getElementById('dType').value = 'W'; document.getElementById('dOut').value = b.dataset.q; upd(); };
    document.getElementById('dSave').onclick = function () { var t = document.getElementById('dType').value, o = document.getElementById('dOut').value; A.setPlanDay(ym, d, t === '' ? null : t === 'W' ? { k: 'W', out: o } : { k: t }); St.touch('plans/' + ym + '/' + pad(d), 'Plan ' + ym + '-' + pad(d)); Ga.closeLayer(); Ga.render(); };
    document.getElementById('dClear').onclick = function () { A.setPlanDay(ym, d, null); St.touch('plans/' + ym + '/' + pad(d), 'Plan clear'); Ga.closeLayer(); Ga.render(); };
  };
  /* Fill: days after today with nothing real and nothing planned follow Pattern A. */
  A.plFill = function (UI) {
    var S = St.S, P = UI.planA, paths = [], count = 0;
    monthsInRange(UI).forEach(function (ym) {
      var p = U.parseYm(ym), real = S.months[ym] || {}, pl = S.plans.days[ym] || {};
      for (var d = 1; d <= U.daysIn(p.y, p.m); d++) {
        var k = pad(d); if (real[k] || pl[k]) continue;
        var t = U.dayType(p.y, p.m, d), ph = U.PH[U.iso(p.y, p.m, d)], ent = null;
        if (ph) { if (P.ph === 'work') ent = { k: 'X2' }; }
        else if (t === 'SU') ent = null;
        else if (t === 'SA') { if (P.sa !== 'off') ent = { k: 'W', out: P.sa }; }
        else ent = { k: 'W', out: t === 'FR' ? P.fr : P.mt };
        if (ent) { A.setPlanDay(ym, d, ent); paths.push('plans/' + ym + '/' + k); count++; }
      }
    });
    if (!count) { Ga.toast('No empty days to fill'); return; }
    St.touch(paths, 'Plan: fill ' + count + ' days'); Ga.render(); Ga.toast(count + ' days planned');
  };
  A.plClear = function (UI) {
    var S = St.S, paths = [];
    monthsInRange(UI).forEach(function (ym) { Object.keys(S.plans.days[ym] || {}).forEach(function (k) { paths.push('plans/' + ym + '/' + k); }); delete S.plans.days[ym]; });
    if (!paths.length) { Ga.toast('Nothing planned in this range'); return; }
    St.touch(paths, 'Plan: remove ' + paths.length + ' days'); Ga.render(); Ga.toast(paths.length + ' planned days removed');
  };
  A.tgGo = function (UI) {
    var v = U.num(document.getElementById('tgIn').value); if (!v) { Ga.toast('Type a take-home amount first'); return; }
    var ym = UI.plTgYm, Rs = R.suggest(ym, v, null, R.planDays(ym)); St.S.targets[ym] = { target: v, sugg: Rs.sugg, res: Rs }; UI.targetOpen = true; St.touch('targets/' + ym, 'Target ' + ym); Ga.render();
  };
  A.tgApply = function (UI) {
    var ym = UI.plTgYm, tg = St.S.targets[ym]; if (!tg || !tg.sugg) return; var paths = [];
    Object.keys(tg.sugg).forEach(function (k) { A.setPlanDay(ym, +k, tg.sugg[k]); paths.push('plans/' + ym + '/' + k); });
    tg.sugg = {}; tg.res.applied = true; paths.push('targets/' + ym); St.touch(paths, 'Apply target days to plan'); Ga.render(); Ga.toast('Target days added to the plan');
  };
  A.tgClear = function (UI) { var ym = UI.plTgYm; delete St.S.targets[ym]; UI.targetOpen = false; St.touch('targets/' + ym, 'Clear target'); Ga.render(); };
  A.tgReset = function (UI) { St.S.settings.tg = U.clone(R.DEFAULT_TG); var ym = UI.plTgYm, t3 = St.S.targets[ym], ps = ['settings']; if (t3 && t3.target) { var r3 = R.suggest(ym, t3.target, null, R.planDays(ym)); t3.sugg = r3.sugg; t3.res = r3; ps.push('targets/' + ym); } St.touch(ps, 'Reset target rules'); UI.rulesOpen = true; Ga.render(); };
})(window);
