/* Calendar: real data only, as month cards; a card opens that month. Days are changed from Home; future days accept only AL / UPH / UPL; imported days are locked. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, pad = U.pad, esc = U.esc, MON3 = U.MON3, MONTHS = U.MONTHS, TIMES = U.TIMES, LEAVES = U.LEAVES;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};
  var IC = function () { return Ga.IC; };
  var FUTURE_OK = { AL: 1, UPH: 1, UPL: 1 };

  /* Paint bar: pick a value, then tap days. Only shown while Paint is on. */
  V.brushBar = function (UI, year, M) {
    var h = '<div class="brushes"><div class="brush-scroll" role="toolbar" aria-label="Paint with">';
    TIMES.forEach(function (t) { h += '<button class="brush" data-brush="t:' + t + '" aria-pressed="' + (UI.brush === 't:' + t) + '">' + t + '</button>'; });
    Object.keys(LEAVES).forEach(function (k) { h += '<button class="brush lv" data-brush="' + k + '" aria-pressed="' + (UI.brush === k) + '" title="' + LEAVES[k] + '">' + (k === 'X2' ? '2×' : k === 'CL' ? 'Leave' : k) + '</button>'; });
    h += '<button class="brush lv" data-brush="erase" aria-pressed="' + (UI.brush === 'erase') + '">Erase</button></div>';
    if (UI.brush === 'AL' && R.alLeft(year) !== null && R.alLeft(year) <= 0) h += '<div class="note warn" style="margin-top:6px">AL balance for ' + year + ' is 0, so AL counts as <b>unpaid</b> (−RM' + fm(M.r.unpaid) + ' a day).</div>';
    return h + '</div>';
  };

  /* One month grid. A cell shows the day number and one label (clock-out or code); colour says the rest. opts: { compact, mode: 'cal'|'plan', sugg } */
  V.monthGrid = function (ym, days, opts) {
    opts = opts || {};
    var p = U.parseYm(ym), n = U.daysIn(p.y, p.m), td = U.today(), todayIso = U.iso(td.y, td.m, td.d), first = new Date(p.y, p.m - 1, 1).getDay(), lead = (first + 6) % 7, isCur = td.y === p.y && td.m === p.m;
    var compact = !!opts.compact, plan = opts.mode === 'plan', sugg = opts.sugg || null;
    var h = '<div class="cal' + (compact ? ' compact' : '') + '">', missSet = {}; Ga.missing().forEach(function (k) { missSet[k] = 1; });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<div class="dow' + (d === 'Sun' ? ' sun' : '') + '">' + (compact ? d.charAt(0) : d) + '</div>'; });
    var cells = [], i;
    for (i = 0; i < lead; i++) cells.push('<div class="day pad"></div>');
    for (var d = 1; d <= n; d++) {
      if (d === 16 && !compact) {
        var rem = cells.length % 7; for (i = 0; rem && i < 7 - rem; i++) cells.push('<div class="day pad"></div>'); cells.push('<div class="half-split">2nd half</div>');
        var lead2 = (new Date(p.y, p.m - 1, 16).getDay() + 6) % 7; for (i = 0; i < lead2; i++) cells.push('<div class="day pad"></div>');
      }
      var iso = U.iso(p.y, p.m, d), future = iso > todayIso, e = days[pad(d)], sg = sugg ? sugg[pad(d)] || null : null, ee = sg || e, c = R.dayCalc(ym, d, ee), isT = isCur && td.d === d;
      var real = !!(e && e.real), planned = !!(e && e.plan), isMiss = !e && !plan && missSet[iso];
      var locked = plan ? false : (real || (future && !(e && FUTURE_OK[e.k])));
      var k = c.kind === 'early' ? 'k-early' : c.kind === 'half' || c.kind === 'norm' || c.kind === 'empty' ? '' : 'k-' + c.kind;
      var lbl = '';
      if (ee) lbl = c.ot2 ? '2×' : ee.k === 'W' ? esc(ee.out || '') : c.over ? 'AL✕' : ee.k === 'CL' ? 'Leave' : ee.k === 'UPL' ? 'Unpaid' : ee.k === 'UPH' ? '½ unp.' : ee.k;
      else if (c.ph) lbl = 'PH'; else if (isMiss) lbl = '?';
      var say = ee ? (ee.k === 'W' ? 'out ' + (ee.out || '') + (c.ot ? ', OT ' + U.fh1(c.ot) + ' hours' : '') : (LEAVES[ee.k] || ee.k)) : c.ph ? 'public holiday' : isMiss ? 'not filled' : 'empty';
      cells.push('<button class="day ' + k + (sg ? ' sugg' : '') + (planned ? ' planned' : '') + (locked ? ' locked' : '') + (future && !plan && !e ? ' future' : '') + (isMiss ? ' miss' : '') + (c.t === 'SU' ? ' sun' : '') + (isT ? ' today' : '') + '" data-day="' + d + '" data-ym="' + ym + '" aria-label="' + d + ' ' + MONTHS[p.m - 1] + ', ' + esc(say) + (real && !plan ? ', from time card' : planned ? ', planned' : '') + '">' +
        '<span class="dn">' + d + (c.ph ? IC().flag : '') + '</span><span class="lbl">' + lbl + '</span>' + ((c.t === 'SU' && !c.ot2) || isMiss ? '' : '<span class="rm"><i>RM</i>' + (c.ot || c.ot2 ? '<b>' + Math.round(c.total) + '</b>' : Math.round(c.total)) + '</span>') +
        (real && !plan ? '<span class="tag lock' + (e.edited ? ' ed' : '') + '" title="' + (e.edited ? 'From time card, edited by hand' : 'From time card') + '">' + IC().lock + '</span>' : '') + '</button>');
    }
    return h + cells.join('') + '</div>';
  };
  V.legend = function (plan) {
    return '<div class="card" style="padding:12px 14px"><div class="legend"><span><i style="background:var(--amber-soft)"></i>Overtime</span><span><i style="background:var(--blue-soft)"></i>Leave or holiday</span><span><i style="background:var(--bad-soft)"></i>Unpaid</span><span><i style="background:var(--good-soft)"></i>2× day</span>' +
      (plan ? '<span><i style="border:1.5px dashed var(--accent)"></i>Planned</span>' : '<span><i style="background:var(--good)"></i>From time card, locked</span><span><i style="border:1.5px dashed var(--bad)"></i>Not filled</span><span><i style="background:var(--surface-2);opacity:.45"></i>Ahead: leave only</span>') + '</div></div>';
  };

  /* Months the Calendar lists, oldest first: every month that has saved days, this month, and next month (only for booking leave). */
  V.calMonths = function () {
    var S = St.S, t = U.today(), cur = U.ymOf(t.y, t.m), set = {}; set[cur] = 1; set[U.addYm(cur, 1)] = 1;
    Object.keys(S.months).forEach(function (ym) { if (Object.keys(S.months[ym]).length) set[ym] = 1; });
    return Object.keys(set).sort();
  };
  function calCard(ym, cur) {
    var S = St.S, p = U.parseYm(ym), days = S.months[ym] || {}, n = Object.keys(days).length, H = R.halves(ym, days), M = R.money(ym, H), ahead = ym > cur;
    var r1 = S.records[ym + '-1'], r2 = S.records[ym + '-2'], a = r1 && r1.payslip && r1.payslip.net, b = r2 && r2.payslip && r2.payslip.net;
    var miss = Ga.missing().filter(function (k) { return k.slice(0, 7) === ym; }).length;
    var note = ahead ? (n ? n + ' leave day' + (n === 1 ? '' : 's') + ' booked' : 'Leave only') : miss ? miss + ' day' + (miss === 1 ? '' : 's') + ' to fill' : a != null && b != null ? 'Payslips ' + fm(a + b) : ym === cur ? 'In progress' : a != null || b != null ? 'One payslip saved' : 'No payslip yet';
    var h = '<button class="mcard' + (ym === cur ? ' now' : '') + (ahead ? ' ahead' : '') + '" data-calopen="' + ym + '"><span class="mc-m">' + MONTHS[p.m - 1] + ' ' + p.y + '</span>';
    if (ahead && !n) h += '<b class="mc-v sm">Book leave</b>';
    else h += '<b class="mc-v"><small>RM</small>' + fm(M.net) + '</b><span class="mc-s">OT ' + U.fh1(M.ot + M.ot2) + ' h' + (M.up ? ' · unpaid ' + M.up + ' d' : '') + '</span>';
    return h + '<span class="mc-s' + (miss ? ' bad' : '') + '">' + note + '</span></button>';
  }

  V.cal = function (UI) {
    var S = St.S, td = U.today(), cur = U.ymOf(td.y, td.m), list = V.calMonths();
    if (UI.calList) {
      return '<div class="stack"><p class="small muted">Real data only: this month and every month you have filled or imported. Tap a month to see its days.</p>' +
        '<div class="mcards">' + list.filter(function (m) { return m <= cur; }).reverse().concat(list.filter(function (m) { return m > cur; })).map(function (m) { return calCard(m, cur); }).join('') + '</div></div>';
    }
    var ym = UI.ym, p = U.parseYm(ym), days = S.months[ym] || {}, H = R.halves(ym, days), M = R.money(ym, H), al = R.alLeft(p.y);
    var i = list.indexOf(ym), older = i > 0 ? list[i - 1] : null, newer = i >= 0 ? list[i + 1] : null, pc = Object.keys(S.plans.days[ym] || {}).length;
    var nav = function (to, ic, lab) { return '<button class="icon-btn"' + (to ? ' data-calopen="' + to + '"' : ' disabled') + ' aria-label="' + lab + '">' + ic + '</button>'; };
    var h = '<div class="stack"><button class="back" data-act="calBack">' + IC().left + 'All months</button><div class="calwrap"><div class="col">';
    h += '<div class="cal-head">' + nav(older, IC().left, 'Older month') + '<h2>' + MONTHS[p.m - 1] + ' ' + p.y + '</h2>' + nav(newer, IC().right, 'Newer month') + '</div>';
    h += '<div class="cal-tools"><button class="tool ex' + (UI.exArm ? ' armed' : '') + '" data-act="extract"><i class="ic ic-horizontal-sliders-lines"></i><span>' + (UI.exArm ? 'Tap again: erase ' + pc + ' planned day' + (pc === 1 ? '' : 's') : 'Extract to Plan') + '</span></button><span class="chip"><i class="ic ic-lock-keyhole"></i>Real data</span><span class="grow"></span><button class="tool" data-act="legend" aria-pressed="' + !!UI.legend + '" aria-label="What the colours mean"><i class="ic ic-info-circle"></i></button></div>';
    if (UI.exArm) h += '<p class="tiny muted">The Plan for ' + MONTHS[p.m - 1] + ' holds ' + pc + ' planned day' + (pc === 1 ? '' : 's') + '. Extract erases them, so the Plan starts as a clean copy of this month.</p>';
    if (UI.legend) h += V.legend(false);
    h += '<div class="card" style="padding:12px">' + V.monthGrid(ym, days, { mode: 'cal' }) + '</div>';
    h += '</div><div class="col">';
    h += '<section class="card"><div class="stats3"><div><span>Take-home</span><b>' + fm(M.net) + '</b></div><div><span>Overtime</span><b>' + U.fh1(M.ot + M.ot2) + ' h</b></div><div><span>Unpaid</span><b>' + (M.up ? M.up + ' d' : 'none') + '</b></div></div>' +
      (al === null ? '' : '<p class="small muted" style="margin-top:12px">Annual leave ' + p.y + ': <b style="color:var(--' + (al <= 0 ? 'bad' : 'ink') + ')">' + al + ' left</b>' + (al <= 0 ? ', so AL counts as unpaid' : '') + '</p>') +
      '<details class="fold-in" id="calDet"' + Ga.fold('calDet') + '><summary><span>Breakdown by half</span></summary>' + V.monthSummary(ym, M, H, true) +
      '<div class="row" style="margin-top:12px"><button class="btn danger sm" data-act="clearMonth">' + (UI.clearArm ? 'Tap again to clear ' + MON3[p.m - 1] : 'Clear days I entered') + '</button></div></details></section>';
    return h + '</div></div></div>';
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
    if (rec1 || rec2) { var a = rec1 && rec1.payslip && rec1.payslip.net, b = rec2 && rec2.payslip && rec2.payslip.net; h += row('Payslip', a != null ? fm(a) : '—', b != null ? fm(b) : '—', a != null && b != null ? fm(a + b) : '—', 'sub'); }
    h += '</tbody></table></div><p class="tiny muted" style="margin-top:8px">Deductions: EPF RM' + fm(M.epf) + ' · SOCSO ' + fm(M.socso) + ' · EIS ' + fm(M.eis) + ' · SKBBK ' + fm(M.skbbk) + (S.settings.skbbk ? '' : ' (off)') + '</p>' + (bare ? '' : '</section>');
    return h;
  };

  /* ---- actions on the real calendar ---- */
  A.isFuture = function (ym, d) { var t = U.today(); return ym + '-' + pad(d) > U.iso(t.y, t.m, t.d); };
  A.applyBrush = function (UI, d, ymArg) {
    var S = St.S, ym = ymArg || UI.ym, b = UI.brush, e = (S.months[ym] || {})[pad(d)], future = A.isFuture(ym, d);
    A.openDay(UI, d, ym, false, true); return;   // the Calendar never edits past days itself
    if (e && e.real) { Ga.toast('From the time card · locked. Tap it with the Edit brush and choose Unlock to correct it.'); return; }
    if (future && !(FUTURE_OK[b] || b === 'erase')) { Ga.toast('Days ahead are locked. Only AL, UPH or UPL can be set now. Use Plan for what-ifs.'); return; }
    var days = S.months[ym] || (S.months[ym] = {}), k = pad(d);
    if (b === 'erase') delete days[k];
    else if (b.indexOf('t:') === 0) days[k] = { k: 'W', out: b.slice(2) };
    else days[k] = { k: b };
    St.touchDay(ym, d, 'Calendar ' + MON3[U.parseYm(ym).m - 1] + ' ' + d); Ga.render();
  };
  A.setDay = function (ym, d, ent, msg) {
    var S = St.S, days = S.months[ym] || (S.months[ym] = {}), k = pad(d), paths = ['months/' + ym + '/' + k], pl = S.plans.days[ym], missBefore = Ga.missing ? Ga.missing() : [];
    if (!ent) delete days[k]; else days[k] = ent;
    if (ent && pl && pl[k]) { delete pl[k]; if (!Object.keys(pl).length) delete S.plans.days[ym]; paths.push('plans/' + ym + '/' + k); }
    St.touch(paths, msg || 'Calendar ' + MON3[U.parseYm(ym).m - 1] + ' ' + d);
    A.reactDay(ym, d, ent, missBefore);
  };
  /* Sort the saved day into one of the cat's reactions (see Cat.react). */
  A.reactDay = function (ym, d, ent, missBefore) {
    if (!Ga.cat || !Ga.cat.react) return;
    R.computeAL();
    var c = R.dayCalc(ym, d, ent), iso = ym + '-' + pad(d), miss = Ga.missing ? Ga.missing() : [], was = (missBefore || []).indexOf(iso) >= 0, kind, rm = 0;
    if (!ent) kind = 'clear';
    else if (c.ot2) { kind = 'x2'; rm = (c.x2Amt || 0) + (c.otAmt || 0); }
    else if (ent.k === 'W') { kind = c.early ? 'early' : c.ot >= (c.t === 'SA' ? 2 : 1.5) ? 'bigot' : c.ot > 0 ? 'ot' : 'normal'; rm = c.otAmt || 0; }
    else if (ent.k === 'AL') { kind = c.over ? 'upl' : 'al'; if (c.over) rm = -(c.upAmt || 0); }
    else if (ent.k === 'MC') kind = 'mc';
    else if (ent.k === 'UPH' || ent.k === 'UPL') { kind = ent.k === 'UPH' ? 'uph' : 'upl'; rm = -(c.upAmt || 0); }
    else kind = 'leave';
    Ga.cat.react(kind, { rm: rm, left: was && ent ? miss.length : 0, allDone: was && !!ent && !miss.length });
  };
  function dayHead(p, d, c, extra) { return '<div class="sheet-h"><div><div class="eyebrow">' + U.DOWL[new Date(p.y, p.m - 1, d).getDay()] + (c.ph ? ' · ' + esc(c.ph) : '') + (extra ? ' · ' + extra : '') + '</div><h2 id="dayT" style="font-size:20px">' + d + ' ' + MONTHS[p.m - 1] + ' ' + p.y + '</h2></div><button class="icon-btn" data-close="1" aria-label="Close">' + IC().x + '</button></div>'; }
  function resKv(cc) {
    return '<dt>OT 1.5×</dt><dd>' + fh(cc.ot) + ' h · RM' + fm(cc.otAmt) + '</dd>' + (cc.ot2 ? '<dt>OT 2×</dt><dd>' + fh(cc.ot2) + ' h · RM' + fm(cc.x2Amt) + '</dd>' : '') + (cc.up ? '<dt>Unpaid</dt><dd>−RM' + fm(cc.upAmt) + '</dd>' : '') +
      '<dt>Paid hours</dt><dd>' + (cc.paid != null ? fh(cc.paid) + (cc.est ? ' (est.)' : '') : '—') + '</dd><dt>Base share</dt><dd>RM' + fm(cc.base) + '</dd><div class="sep"></div><dt>Day total</dt><dd class="big">RM' + fm(cc.total) + '</dd>' +
      (cc.early ? '<dt class="tiny" style="grid-column:1/-1;color:var(--bad)">Left before the scheduled end. No OT, and the time card drops to the previous 30-minute mark.</dt>' : '') +
      (cc.nr ? '<dt class="tiny" style="grid-column:1/-1">NR appears on the time card from 19:00. For you it is a label; the money is the OT hours.</dt>' : '');
  }
  A.openDay = function (UI, d, ymArg, unlocked, readonly) {
    var S = St.S, ym = ymArg || UI.ym, p = U.parseYm(ym), e = (S.months[ym] || {})[pad(d)], c = R.dayCalc(ym, d, e), future = A.isFuture(ym, d);
    var val = e ? (e.k === 'W' ? 'W' : e.k) : '', isReal = !!(e && e.real);
    if (isReal && !unlocked) {
      Ga.sheet(dayHead(p, d, c, 'from time card') + '<div class="stack"><div class="note good"><b>Locked.</b> This day comes from the imported time card' + (e.edited ? ', edited by hand' : '') + '.</div>' +
        '<dl class="kv"><dt>Clock in</dt><dd>' + esc(e['in'] || '—') + '</dd><dt>Clock out</dt><dd>' + esc(e.out || '—') + '</dd><dt>Type</dt><dd>' + (e.k === 'W' ? 'Worked' : LEAVES[e.k] || e.k) + '</dd>' + (e.remark ? '<dt>Remark</dt><dd>' + esc(e.remark) + '</dd>' : '') + '<div class="sep"></div>' + resKv(c) + '</dl>' +
        '<div id="unlockBox"><div class="row"><button class="btn" data-close="1" style="flex:1">Close</button><button class="btn ghost" id="dUnlock">' + IC().lock + ' Unlock</button></div></div></div>', 'dayT');
      document.getElementById('dUnlock').onclick = function () {
        document.getElementById('unlockBox').innerHTML = '<div class="note warn"><b>Unlock ' + d + ' ' + MONTHS[p.m - 1] + '?</b> Only do this if the AI misread the time card. The day locks again as soon as you save.</div><div class="row" style="margin-top:8px"><button class="btn danger" id="dUnlockYes" style="flex:1">Yes, unlock</button><button class="btn" id="dUnlockNo">Cancel</button></div>';
        document.getElementById('dUnlockYes').onclick = function () { A.openDay(UI, d, ym, true); };
        document.getElementById('dUnlockNo').onclick = function () { A.openDay(UI, d, ym); };
      };
      return;
    }
    if (isReal) future = false;
    if (readonly && !isReal && !future) {
      var isoD = U.iso(p.y, p.m, d);
      Ga.sheet(dayHead(p, d, c, 'real data') + '<div class="stack"><dl class="kv"><dt>What happened</dt><dd>' + (e ? (e.k === 'W' ? 'Worked · out ' + esc(e.out) : (c.over ? 'Annual leave, no balance' : LEAVES[e.k] || e.k)) : (c.t === 'SU' ? 'Rest day' : c.ph ? 'Public holiday' : 'Not filled yet')) + '</dd><div class="sep"></div>' + resKv(c) + '</dl>' +
        '<div class="note"><b>The Calendar shows real data.</b> Change this day from Home, or try a what-if in Plan.</div>' +
        '<div class="row"><button class="btn primary" id="dEditHome" style="flex:1">' + (e ? 'Edit in Home' : 'Fill in Home') + '</button><button class="btn" data-close="1">Close</button></div></div>', 'dayT');
      document.getElementById('dEditHome').onclick = function () { Ga.UI.trackDate = isoD; Ga.UI.trkType = null; Ga.UI.trkOut = null; Ga.closeLayer(); Ga.go('home'); };
      return;
    }
    var h = dayHead(p, d, c, isReal ? 'unlocked · locks again on save' : future ? 'ahead · leave only' : '') + '<div class="stack">';
    if (isReal) h += '<div class="note warn">Unlocked. Time card: in ' + esc(e['in'] || '—') + ', out ' + esc(e.out || '—') + (e.paid != null ? ', paid ' + fh(e.paid) + 'h' : '') + '. Change what happened, then Save; paid hours are recomputed.</div>';
    if (future) {
      h += '<div class="note">Days ahead are locked for clock-out times. You can mark planned <b>AL</b>, <b>UPH</b> or <b>UPL</b> now; set working hours on the day itself, or try what-ifs in Plan.</div>';
      h += '<div class="field"><label for="dType">Day</label><select id="dType"><option value="">Not set</option>' + ['AL', 'UPH', 'UPL'].map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + LEAVES[k] + '</option>'; }).join('') + '</select></div>';
    } else {
      h += '<div class="row"><div class="field"><label for="dType">Day</label><select id="dType"><option value="">Normal / not set</option><option value="W"' + (val === 'W' ? ' selected' : '') + '>Worked · clock-out time</option>' +
        Object.keys(LEAVES).map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + LEAVES[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="max-width:150px"><label for="dOut">Clock out</label><input id="dOut" type="time" value="' + esc(e && e.out || (c.t === 'SA' ? '13:00' : '18:00')) + '"></div></div>';
      h += '<div class="quick" id="dQuick">' + (c.t === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']).map(function (x) { return '<button type="button" data-q="' + x + '">' + x + '</button>'; }).join('') + '</div>';
    }
    if (R.alLeft(p.y) !== null && R.alLeft(p.y) <= 0) h += '<div class="note warn" id="alWarn" hidden>AL balance for ' + p.y + ' is 0. This AL counts as unpaid.</div>';
    h += '<dl class="kv" id="dRes"></dl><div class="row"><button class="btn primary" id="dSave" style="flex:1">Save day</button><button class="btn" id="dClear">Clear</button></div></div>';
    Ga.sheet(h, 'dayT');
    var upd = function () {
      var t = document.getElementById('dType').value, oEl = document.getElementById('dOut'), o = oEl ? oEl.value : ''; if (oEl) oEl.disabled = t !== 'W'; var aw = document.getElementById('alWarn'); if (aw) aw.hidden = t !== 'AL';
      document.querySelectorAll('#dQuick button').forEach(function (b) { b.setAttribute('aria-pressed', t === 'W' && b.dataset.q === o); });
      var ent = t === '' ? null : t === 'W' ? { k: 'W', out: o } : { k: t };
      if (ent && ent.k === 'AL' && !(e && e.k === 'AL') && R.alLeft(p.y) !== null && R.alLeft(p.y) <= 0 && U.iso(p.y, p.m, d) >= S.settings.alAsOf) R.AL().over[U.iso(p.y, p.m, d)] = 1;
      document.getElementById('dRes').innerHTML = resKv(R.dayCalc(ym, d, ent));
    };
    document.getElementById('dType').onchange = upd; var oi = document.getElementById('dOut'); if (oi) oi.oninput = upd; upd();
    var q = document.getElementById('dQuick'); if (q) q.onclick = function (ev) { var b = ev.target.closest('[data-q]'); if (!b) return; document.getElementById('dType').value = 'W'; document.getElementById('dOut').value = b.dataset.q; upd(); };
    document.getElementById('dSave').onclick = function () {
      var t = document.getElementById('dType').value, oEl = document.getElementById('dOut'), o = oEl ? oEl.value : '', ent;
      if (t === '') ent = null; else if (t === 'W') ent = { k: 'W', out: o }; else ent = { k: t };
      if (isReal && ent) { ent = Object.assign({ real: 1, 'in': e['in'] || null, remark: e.remark || null }, ent, { edited: 1 }); }
      A.setDay(ym, d, ent, isReal ? 'Calendar ' + MON3[p.m - 1] + ' ' + d + ' (unlocked edit)' : undefined); Ga.closeLayer(); Ga.render(); if (isReal) Ga.toast('Saved and locked again');
    };
    document.getElementById('dClear').onclick = function () { A.setDay(ym, d, null); Ga.closeLayer(); Ga.render(); };
  };
  /* mark a hand-edited time-card day in the grid */
})(window);
