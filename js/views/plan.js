/* Plan: a what-if scenario kept apart from the real calendar. Month cards; a card opens that month, where every day can be planned. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, fh1 = U.fh1, pad = U.pad, MONTHS = U.MONTHS, MON3 = U.MON3;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};

  function planSel(id, val, sa) {
    var opts = sa ? [['off', 'Off'], ['11:30', '11:30'], ['12:30', '12:30'], ['13:00', '13:00'], ['15:00', '15:00'], ['16:30', '16:30'], ['17:00', '17:00'], ['17:30', '17:30']] :
      [['17:30', '17:30'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00 NR'], ['19:30', '19:30 NR'], ['20:00', '20:00 NR'], ['20:30', '20:30 NR']];
    return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  function planLabel(P) { return P.mt + (P.fr !== P.mt ? ' / Fri ' + P.fr : '') + ' · Sat ' + (P.sa === 'off' ? 'off' : P.sa) + (P.ph === 'work' ? ' · PH 2×' : ''); }
  function monthsInRange(UI) { var out = []; for (var i = 0; i < UI.plN; i++) out.push(U.addYm(UI.plStart, i)); return out; }

  function scopeMonths(UI) { return UI.plOpen ? [UI.plOpen] : monthsInRange(UI); }
  function countPlanned(list) { var c = 0; list.forEach(function (ym) { c += Object.keys(St.S.plans.days[ym] || {}).length; }); return c; }
  function mName(ym) { var q = U.parseYm(ym); return MONTHS[q.m - 1] + ' ' + q.y; }
  function f0(v) { return Math.round(v).toLocaleString('en-US'); }

  /* One row of the control deck. Wide screens: title on the left, controls beside it, always open. Phones: a fold, closed until tapped. */
  function deckRow(UI, id, title, sub, body) {
    if (G.innerWidth >= 760) return '<div class="deck-row"><b class="deck-t">' + title + '</b><div class="deck-c">' + body + '</div></div>';
    return '<details class="deck-row" id="' + id + '"' + Ga.fold(id) + '><summary><b class="deck-t">' + title + '</b><span class="sub">' + sub + '</span></summary><div class="deck-c">' + body + '</div></details>';
  }
  /* Control deck, the same in both views: auto fill, range, target. With a month open, Fill, Clear and Target act on that month only. */
  function planTop(UI) {
    var S = St.S, P = UI.planA, n = UI.plN, open = UI.plOpen, scope = open ? MONTHS[U.parseYm(open).m - 1] : n + ' month' + (n > 1 ? 's' : ''), cnt = countPlanned(scopeMonths(UI));
    var fill = '<div class="fill-f"><div class="field"><label for="pamt">Mon–Thu</label>' + planSel('pamt', P.mt) + '</div><div class="field"><label for="pafr">Friday</label>' + planSel('pafr', P.fr) + '</div><div class="field"><label for="pasa">Saturday</label>' + planSel('pasa', P.sa, 1) + '</div>' +
      '<div class="field"><label for="paph">Holiday</label><select id="paph"><option value="rest"' + (P.ph === 'rest' ? ' selected' : '') + '>Rest</option><option value="work"' + (P.ph === 'work' ? ' selected' : '') + '>Work 2×</option></select></div>' +
      '<button class="btn primary" data-act="plFill">Fill ' + scope + '</button></div>';
    var range = '<div class="plan-ctl"><div class="field"><label for="plStart">From</label><select id="plStart">' + Ga.ymOptions(UI.plStart, false, '2029-12') + '</select></div><div class="field"><label for="plN">How many months</label>' + V.stepper('plN', n, 'plstep') + '</div>' +
      '<button class="btn danger" data-act="plClear"' + (cnt ? '' : ' disabled') + '>' + (UI.plClearArm ? 'Tap again: erase ' + cnt + ' day' + (cnt === 1 ? '' : 's') : 'Clear planned ' + (open ? scope : 'months')) + '</button></div>';
    var tg = S.targets[UI.plTgYm], tgSub = tg && tg.target ? 'RM' + f0(tg.target) + ' · ' + MON3[U.parseYm(UI.plTgYm).m - 1] : 'reach an amount with planned OT';
    return '<section class="card deck">' + deckRow(UI, 'plFillDet', 'Auto fill', planLabel(P), fill) +
      '<div class="deck-row"><b class="deck-t">Range</b><div class="deck-c">' + range + '</div></div>' +
      deckRow(UI, 'plTgDet', 'Target', tgSub, V.target(UI)) + '</section>';
  }
  function monthCard(m, cls) {
    var M = m.M, pc = Object.keys(St.S.plans.days[m.ym] || {}).length;
    return '<button class="mcard' + (cls || '') + '" data-plopen="' + m.ym + '"><span class="mc-m">' + mName(m.ym) + '</span><b class="mc-v"><small>RM</small>' + fm(M.net) + '</b>' +
      '<span class="mc-s">1st ' + f0(M.half1) + ' · 2nd ' + f0(M.half2) + '</span><span class="mc-s">OT ' + fh1(M.ot + M.ot2) + ' h · ' + (pc ? pc + ' planned' : 'no plan') + '</span></button>';
  }

  /* Plan: the control deck, then month cards; tap a card to open that month's calendar. */
  V.plan = function (UI) {
    var S = St.S, start = UI.plStart, n = UI.plN, months = monthsInRange(UI);
    if (UI.plOpen && months.indexOf(UI.plOpen) < 0) UI.plOpen = null;
    var open = UI.plOpen; if (open) UI.plTgYm = open; else if (months.indexOf(UI.plTgYm) < 0) UI.plTgYm = months[0];
    var F = R.forecast(start, n, null), h = '<div class="stack">' + planTop(UI);
    if (!open) {
      h += '<section class="bigstat"><span class="eyebrow">Take-home · ' + n + ' month' + (n > 1 ? 's' : '') + '</span><b>RM' + fm(F.total.net) + '</b><small>OT ' + fh1(F.total.ot + F.total.ot2) + ' h' + (F.total.up ? ' · unpaid ' + F.total.up + ' d' : '') + ' · tap a month to plan its days</small></section>';
      h += '<div class="mcards">' + F.months.map(function (m) { return monthCard(m); }).join('') + '</div>';
      return h + '</div>';
    }
    var i = months.indexOf(open), m = F.months[i], q = U.parseYm(open), M = m.M, tg = S.targets[open], sugg = tg && tg.sugg && Object.keys(tg.sugg).length ? tg.sugg : null;
    h += '<button class="back" data-act="plBack">' + Ga.IC.left + 'All months</button>';
    h += '<div class="mfocus"><button class="icon-btn" data-plnav="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Previous month">' + Ga.IC.left + '</button>' + monthCard(m, ' on') + '<button class="icon-btn" data-plnav="1"' + (i === months.length - 1 ? ' disabled' : '') + ' aria-label="Next month">' + Ga.IC.right + '</button></div>';
    h += '<div class="calwrap"><div class="col"><div class="cal-tools"><button class="tool" data-act="paint" aria-pressed="' + !!UI.paint + '"><i class="ic ic-pencil-edit"></i>Paint</button><span class="chip accent">What-if · every day editable</span><span class="grow"></span><button class="tool" data-act="legend" aria-pressed="' + !!UI.legend + '" aria-label="What the colours mean"><i class="ic ic-info-circle"></i></button></div>' +
      (UI.legend ? V.legend(true) : '') + (UI.paint ? V.brushBar(UI, q.y, M) : '') +
      '<div class="card" style="padding:12px">' + V.monthGrid(open, R.planDays(open), { mode: 'plan', sugg: sugg }) + '</div></div>' +
      '<div class="col"><section class="card">' + V.monthSummary(open, M, M.H, true) + '</section></div></div>';
    return h + '</div>';
  };

  V.stepper = function (id, val, step) {
    return '<div class="stepper" role="group" aria-label="Number of months"><button type="button" data-' + step + '="-1" aria-label="Fewer months">−</button><input id="' + id + '" type="number" inputmode="numeric" min="1" max="48" value="' + val + '" aria-label="Months"><button type="button" data-' + step + '="1" aria-label="More months">+</button></div>';
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
  /* Target: one compact row in the control deck. The month is the open month, or picked from the range. */
  V.target = function (UI) {
    var S = St.S, months = monthsInRange(UI); if (months.indexOf(UI.plTgYm) < 0) UI.plTgYm = months[0];
    var ym = UI.plTgYm, p = U.parseYm(ym), tg = S.targets[ym] || null, M = R.forecastMonth(ym, null);
    var h = '<div class="tg-row' + (UI.plOpen ? ' solo' : '') + '">' + (UI.plOpen ? '' : '<div class="field"><label for="plTgYm">Month</label><select id="plTgYm">' + months.map(function (m) { var q = U.parseYm(m); return '<option value="' + m + '"' + (m === ym ? ' selected' : '') + '>' + MON3[q.m - 1] + ' ' + q.y + '</option>'; }).join('') + '</select></div>') +
      '<div class="field"><label for="tgIn">Take-home target (RM)</label><input id="tgIn" inputmode="numeric" value="' + (tg && tg.target || '') + '" placeholder="now ' + f0(M.net) + '"></div><button class="btn primary" data-act="tgGo">Suggest days</button>' +
      (tg && tg.target ? '<button class="btn" data-act="tgClear">Clear</button>' : '') + '</div>';
    h += tgRules(UI);
    if (tg && tg.res) {
      var Rs = tg.res, n = Object.keys(tg.sugg || {}).length;
      if (Rs.reached && !n) h += '<div class="plan-res"><b>' + MONTHS[p.m - 1] + ' already reaches RM' + fm(tg.target) + '.</b></div>';
      else {
        h += '<div class="plan-res"><div class="eyebrow">' + (Rs.reached ? 'To reach RM' + fm(tg.target) : 'Best possible within your rules') + '</div><div class="v">+' + fh1(Rs.otNeed + (Rs.x2Need || 0)) + ' OT hours</div>' +
          '<div class="small muted">' + n + ' day' + (n === 1 ? '' : 's') + ' marked in the ' + MONTHS[p.m - 1] + ' calendar (' + [Rs.ty && Rs.ty.wk ? Rs.ty.wk + ' weekday' + (Rs.ty.wk > 1 ? 's' : '') : '', Rs.ty && Rs.ty.sa ? Rs.ty.sa + ' Saturday' + (Rs.ty.sa > 1 ? 's' : '') : '', Rs.ty && Rs.ty.x2 ? Rs.ty.x2 + ' Sunday/PH at 2×' : ''].filter(Boolean).join(', ') + '). ' + (Rs.x2Need ? 'Plus ' + fh1(Rs.x2Need) + 'h at 2×. ' : '') + 'Total OT ' + fh1(Rs.otTotal) + 'h. Take-home RM' + fm(Rs.net) + '.</div>' +
          (Rs.reached ? '' : '<div class="small" style="color:var(--bad);margin-top:4px">RM' + fm(tg.target) + ' is out of reach with these rules. Short by RM' + fm(tg.target - Rs.net) + '. Loosen a rule, for example a later weekday time.</div>') +
          '<button class="btn primary sm" data-act="tgApply" style="margin-top:10px"' + (n ? '' : ' disabled') + '>Add these days to the plan</button></div>';
      }
    }
    return h;
  };

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
    var S = St.S, P = UI.planA, paths = [], count = 0, t0 = R.todayIso();
    scopeMonths(UI).forEach(function (ym) {
      var p = U.parseYm(ym), real = S.months[ym] || {}, pl = S.plans.days[ym] || {};
      for (var d = 1; d <= U.daysIn(p.y, p.m); d++) {
        var k = pad(d); if (real[k] || pl[k] || U.iso(p.y, p.m, d) <= t0) continue;
        var t = U.dayType(p.y, p.m, d), ph = U.PH[U.iso(p.y, p.m, d)], ent = null;
        if (ph) { if (P.ph === 'work') ent = { k: 'X2' }; }
        else if (t === 'SU') ent = null;
        else if (t === 'SA') { if (P.sa !== 'off') ent = { k: 'W', out: P.sa }; }
        else ent = { k: 'W', out: t === 'FR' ? P.fr : P.mt };
        if (ent) { A.setPlanDay(ym, d, ent); paths.push('plans/' + ym + '/' + k); count++; }
      }
    });
    if (!count) { Ga.toast('No empty days ahead to fill'); return; }
    St.touch(paths, 'Plan: fill ' + count + ' days'); Ga.render(); Ga.toast(count + ' days planned');
  };
  A.plClear = function (UI) {
    var S = St.S, paths = [];
    scopeMonths(UI).forEach(function (ym) { Object.keys(S.plans.days[ym] || {}).forEach(function (k) { paths.push('plans/' + ym + '/' + k); }); delete S.plans.days[ym]; });
    if (!paths.length) { Ga.toast('Nothing planned here'); return; }
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
