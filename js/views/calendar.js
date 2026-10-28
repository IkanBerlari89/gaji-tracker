/* Calendar: real data only. Past and today are editable; future days accept only AL / UPH / UPL; imported days are locked. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, pad = U.pad, esc = U.esc, MON3 = U.MON3, MONTHS = U.MONTHS, TIMES = U.TIMES, LEAVES = U.LEAVES;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};
  var IC = function () { return Ga.IC; };
  var FUTURE_OK = { AL: 1, UPH: 1, UPL: 1 };

  function brushList() {
    var b = [['edit', 'Edit', 'tap a day']];
    TIMES.forEach(function (t) { var n = U.tmin(t), sub = n === 780 ? '½ day' : n < 1050 ? 'Sat' : n === 1050 ? 'normal' : n >= 1140 ? 'NR' : 'OT'; b.push(['t:' + t, t, sub]); });
    return b;
  }
  /* Brush toolbar (shared by Calendar and Plan). */
  V.brushBar = function (UI, year, M, mode) {
    var h = '<div class="brushes"><div class="brush-scroll" role="toolbar" aria-label="Brush">';
    brushList().forEach(function (b) { h += '<button class="brush" data-brush="' + b[0] + '" aria-pressed="' + (UI.brush === b[0]) + '">' + b[1] + '<small>' + b[2] + '</small></button>'; });
    h += '<span class="brush-grp">Leave</span>';
    Object.keys(LEAVES).forEach(function (k) { h += '<button class="brush lv" data-brush="' + k + '" aria-pressed="' + (UI.brush === k) + '">' + (k === 'X2' ? '×2' : k === 'CL' ? 'Leave' : k) + '<small>' + LEAVES[k].replace('Unpaid ', '') + '</small></button>'; });
    h += '<button class="brush lv" data-brush="erase" aria-pressed="' + (UI.brush === 'erase') + '">Erase<small>clear day</small></button>';
    h += '</div>' + (UI.brush === 'AL' && R.alLeft(year) !== null && R.alLeft(year) <= 0 ? '<div class="note warn" style="margin-top:6px">AL balance for ' + year + ' is 0. Any AL you add now counts as <b>unpaid</b> (−RM' + fm(M.r.unpaid) + ' a day).</div>' : '') +
      (mode === 'plan' ? '<p class="tiny muted" style="margin-top:4px">Plan mode: only days after today can be changed here. Real days are shown locked.</p>' : '<p class="tiny muted" style="margin-top:4px">Past days and today can be edited. Days after today take only AL, UPH or UPL. Imported time-card days are locked.</p>') + '</div>';
    return h;
  };

  /* One month grid. opts: { compact, mode: 'cal'|'plan', sugg } */
  V.monthGrid = function (ym, days, opts) {
    opts = opts || {};
    var p = U.parseYm(ym), n = U.daysIn(p.y, p.m), td = U.today(), todayIso = U.iso(td.y, td.m, td.d), first = new Date(p.y, p.m - 1, 1).getDay(), lead = (first + 6) % 7, isCur = td.y === p.y && td.m === p.m;
    var compact = !!opts.compact, plan = opts.mode === 'plan', sugg = opts.sugg || null;
    var h = '<div class="cal' + (compact ? ' compact' : '') + '">', missSet = {}; Ga.missing().forEach(function (k) { missSet[k] = 1; });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<div class="dow' + (d === 'Sun' ? ' sun' : '') + '">' + d + '</div>'; });
    var cells = [], i;
    for (i = 0; i < lead; i++) cells.push('<div class="day pad"></div>');
    for (var d = 1; d <= n; d++) {
      if (d === 16 && !compact) {
        var rem = cells.length % 7; for (i = 0; rem && i < 7 - rem; i++) cells.push('<div class="day pad"></div>'); cells.push('<div class="half-split">2nd half · 16–' + n + '</div>');
        var lead2 = (new Date(p.y, p.m - 1, 16).getDay() + 6) % 7; for (i = 0; i < lead2; i++) cells.push('<div class="day pad"></div>');
      }
      var iso = U.iso(p.y, p.m, d), future = iso > todayIso, e = days[pad(d)], sg = sugg ? sugg[pad(d)] || null : null, c = R.dayCalc(ym, d, sg || e), isT = isCur && td.d === d;
      var real = !!(e && e.real), planned = !!(e && e.plan);
      var locked = plan ? (!future || real) : (real || (future && !(e && FUTURE_OK[e.k])));
      var k = c.kind === 'early' ? 'k-early' : c.kind === 'half' ? 'k-norm' : c.kind === 'empty' ? '' : 'k-' + c.kind, isMiss = !e && missSet[iso];
      var lbl = c.label || (c.t === 'SU' ? '' : isMiss ? '?' : future ? '' : '—');
      if (real && e.k === 'W' && e['in']) lbl = esc(e['in']) + '–' + esc(e.out);
      var rm = c.t === 'SU' && !c.ot2 ? '' : (c.ot || c.ot2 ? '<b>' + Math.round(c.total) + '</b>' : Math.round(c.total));
      cells.push('<button class="day ' + k + (sg ? ' sugg' : '') + (planned ? ' planned' : '') + (real ? ' real' : '') + (locked ? ' locked' : '') + (future && !plan && !e ? ' future' : '') + (isMiss ? ' miss' : '') + (c.t === 'SU' ? ' sun' : '') + (isT ? ' today' : '') + '" data-day="' + d + '" data-ym="' + ym + '" aria-label="' + d + ' ' + MONTHS[p.m - 1] + (c.ph ? ' ' + esc(c.ph) : '') + ' ' + esc(c.label || lbl) + (real ? ' (time card, locked)' : locked ? ' (locked)' : '') + '">' +
        '<span class="dn">' + d + (c.ph ? IC().flag : '') + '</span>' +
        '<span class="lbl' + (real && e.k === 'W' && e['in'] ? ' io' : '') + '">' + lbl + '</span>' + (c.dlab ? '<span class="dl ' + (c.dh > 0 ? 'pos' : c.dh < 0 || c.up ? 'neg' : '') + '">' + esc(c.dlab) + '</span>' : '') +
        (sg ? '<span class="tag sg">TARGET</span>' : real ? '<span class="tag lock" title="From time card">' + IC().lock + '</span>' : planned ? '<span class="tag sg">PLAN</span>' : c.nr ? '<span class="tag">NR</span>' : '') +
        '<span class="rm">' + (rm === '' ? '' : 'RM' + rm) + '</span></button>');
    }
    return h + cells.join('') + '</div>';
  };
  V.alChip = function (y) { var l = R.alLeft(y); if (l === null) return ''; return '<span class="chip ' + (l <= 0 ? 'bad' : l <= 2 ? 'amber' : 'good') + '" title="Annual leave left in ' + y + '">AL ' + y + ': ' + (l <= 0 ? '0 left' : l + ' left') + '</span>'; };
  V.legend = function (plan) {
    return '<div class="legend"><span><i style="background:var(--amber-soft)"></i>OT</span><span><i style="background:var(--good-soft)"></i>2× day</span><span><i style="background:var(--blue-soft)"></i>Leave / PH</span><span><i style="background:var(--bad-soft)"></i>Unpaid / AL ✕</span><span>' + IC().flag + 'Public holiday</span><span><i style="border-left:3px solid var(--good);background:var(--surface)"></i>Time card (locked)</span>' + (plan ? '<span><i style="border:1.5px dashed var(--accent);background:transparent"></i>Planned</span><span><i style="border:1.5px dashed var(--accent);background:var(--accent-soft)"></i>Target</span>' : '<span><i style="background:var(--surface);opacity:.5"></i>Future (locked)</span>') + '<span><i style="border:1.5px dashed var(--bad);background:transparent"></i>Not filled yet</span></div>';
  };

  V.cal = function (UI) {
    var S = St.S, ym = UI.ym, p = U.parseYm(ym), days = S.months[ym] || {}, H = R.halves(ym, days), M = R.money(ym, H);
    var td = U.today(), isCur = td.y === p.y && td.m === p.m;
    var h = '<div class="calwrap"><div class="col">';
    h += '<div class="cal-head"><button class="icon-btn" data-mon="-1" aria-label="Previous month">' + IC().left + '</button><div style="text-align:center"><h2>' + MONTHS[p.m - 1] + ' ' + p.y + '</h2><span class="tiny muted">Basic RM' + fm(M.r.basic) + ' · OT RM' + fm(M.r.r15) + '/h</span><div class="row" style="margin-top:4px;justify-content:center;gap:6px">' + V.alChip(p.y) + (isCur ? '' : ' <button class="chip accent" data-act="calToday" style="border:0;cursor:pointer">Today</button>') + '<button class="chip" data-act="extract" style="border:0;cursor:pointer" title="Open this month in Plan to try what-ifs">' + IC().plan.replace('<svg', '<svg style="width:13px;height:13px"') + ' Extract to Plan</button></div></div><button class="icon-btn" data-mon="1" aria-label="Next month">' + IC().right + '</button></div>';
    h += V.brushBar(UI, p.y, M, 'cal');
    h += '<div class="card" style="padding:10px">' + V.monthGrid(ym, days, { mode: 'cal' }) + '</div>';
    h += V.legend(false);
    h += '<p class="tiny muted">Each day shows clock-out, <b style="color:var(--good)">+</b>/<b style="color:var(--bad)">−</b> hours against the normal end (17:30, Sat 11:30), and the day total in RM (base ' + (S.settings.baseMode === 'hour' ? 'by scheduled hours' : 'RM' + fm(M.r.day) + '/day') + ' + OT − unpaid). An empty weekday counts as a normal day. To try what-ifs for the days ahead, use Extract to Plan.</p>';
    h += '</div><div class="col">';
    h += V.monthSummary(ym, M, H);
    h += '<div class="row"><button class="btn danger" data-act="clearMonth">' + (UI.clearArm ? 'Tap again to clear ' + MON3[p.m - 1] : 'Clear this month') + '</button><span class="tiny muted">Clears only days you entered by hand; time-card days stay.</span></div>';
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
    if (rec1 || rec2) { var a = rec1 && rec1.payslip && rec1.payslip.net, b = rec2 && rec2.payslip && rec2.payslip.net; h += row('Payslip', a != null ? fm(a) : '—', b != null ? fm(b) : '—', a != null && b != null ? fm(a + b) : '—', 'sub'); }
    h += '</tbody></table></div><p class="tiny muted" style="margin-top:8px">Deductions: EPF RM' + fm(M.epf) + ' · SOCSO ' + fm(M.socso) + ' · EIS ' + fm(M.eis) + ' · SKBBK ' + fm(M.skbbk) + (S.settings.skbbk ? '' : ' (off)') + '</p>' + (bare ? '' : '</section>');
    return h;
  };

  /* ---- actions on the real calendar ---- */
  A.isFuture = function (ym, d) { var t = U.today(); return ym + '-' + pad(d) > U.iso(t.y, t.m, t.d); };
  A.applyBrush = function (UI, d, ymArg) {
    var S = St.S, ym = ymArg || UI.ym, b = UI.brush, e = (S.months[ym] || {})[pad(d)], future = A.isFuture(ym, d);
    if (e && e.real) { Ga.toast('From the time card · locked. Import the time card again to change it.'); return; }
    if (b === 'edit') { A.openDay(UI, d, ym); return; }
    if (future && !(FUTURE_OK[b] || b === 'erase')) { Ga.toast('Days ahead are locked. Only AL, UPH or UPL can be set now. Use Plan for what-ifs.'); return; }
    var days = S.months[ym] || (S.months[ym] = {}), k = pad(d);
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
  function dayHead(p, d, c, extra) { return '<div class="sheet-h"><div><div class="eyebrow">' + U.DOWL[new Date(p.y, p.m - 1, d).getDay()] + (c.ph ? ' · ' + esc(c.ph) : '') + (extra ? ' · ' + extra : '') + '</div><h2 id="dayT" style="font-size:20px">' + d + ' ' + MONTHS[p.m - 1] + ' ' + p.y + '</h2></div><button class="icon-btn" data-close="1" aria-label="Close">' + IC().x + '</button></div>'; }
  function resKv(cc) {
    return '<dt>OT 1.5×</dt><dd>' + fh(cc.ot) + ' h · RM' + fm(cc.otAmt) + '</dd>' + (cc.ot2 ? '<dt>OT 2×</dt><dd>' + fh(cc.ot2) + ' h · RM' + fm(cc.x2Amt) + '</dd>' : '') + (cc.up ? '<dt>Unpaid</dt><dd>−RM' + fm(cc.upAmt) + '</dd>' : '') +
      '<dt>Paid hours</dt><dd>' + (cc.paid != null ? fh(cc.paid) + (cc.est ? ' (est.)' : '') : '—') + '</dd><dt>Base share</dt><dd>RM' + fm(cc.base) + '</dd><div class="sep"></div><dt>Day total</dt><dd class="big">RM' + fm(cc.total) + '</dd>' +
      (cc.early ? '<dt class="tiny" style="grid-column:1/-1;color:var(--bad)">Left before the scheduled end. No OT, and the time card drops to the previous 30-minute mark.</dt>' : '') +
      (cc.nr ? '<dt class="tiny" style="grid-column:1/-1">NR appears on the time card from 19:00. For you it is a label; the money is the OT hours.</dt>' : '');
  }
  A.openDay = function (UI, d, ymArg) {
    var S = St.S, ym = ymArg || UI.ym, p = U.parseYm(ym), e = (S.months[ym] || {})[pad(d)], c = R.dayCalc(ym, d, e), future = A.isFuture(ym, d);
    var val = e ? (e.k === 'W' ? 'W' : e.k) : '';
    if (e && e.real) {
      Ga.sheet(dayHead(p, d, c, 'from time card') + '<div class="stack"><div class="note good"><b>Locked.</b> This day comes from the imported time card. To change it, import the time card again from the Import tab.</div>' +
        '<dl class="kv"><dt>Clock in</dt><dd>' + esc(e['in'] || '—') + '</dd><dt>Clock out</dt><dd>' + esc(e.out || '—') + '</dd><dt>Type</dt><dd>' + (e.k === 'W' ? 'Worked' : LEAVES[e.k] || e.k) + '</dd>' + (e.remark ? '<dt>Remark</dt><dd>' + esc(e.remark) + '</dd>' : '') + '<div class="sep"></div>' + resKv(c) + '</dl>' +
        '<div class="row"><button class="btn" data-close="1" style="flex:1">Close</button><button class="btn ghost" data-go="imp">Import tab</button></div></div>', 'dayT');
      return;
    }
    var h = dayHead(p, d, c, future ? 'ahead · leave only' : '') + '<div class="stack">';
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
      A.setDay(ym, d, ent); Ga.closeLayer(); Ga.render();
    };
    document.getElementById('dClear').onclick = function () { A.setDay(ym, d, null); Ga.closeLayer(); Ga.render(); };
  };
})(window);
