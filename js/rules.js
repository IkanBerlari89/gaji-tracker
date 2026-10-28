/* Gaji Tracker v2 — pay rules. Pure functions over a bound state object; no DOM.
   Ported 1:1 from gaji-tracker.html (sections 2–6 of the handoff). Do not invent new formulas here. */
(function (G) {
  'use strict';
  var U = G.Gaji.U, PH = U.PH, SCHED = U.SCHED, LEAVES = U.LEAVES;
  var pad = U.pad, parseYm = U.parseYm, daysIn = U.daysIn, iso = U.iso, dayType = U.dayType, tmin = U.tmin, mtime = U.mtime, r2 = U.r2, fh1 = U.fh1, ymOf = U.ymOf, today = U.today, addYm = U.addYm;

  var S = null;                       // bound state: { settings, months, records, targets }
  var AL = { over: {}, left: {}, used: {} };
  var R = {};

  R.bind = function (state) { S = state; R.computeAL(); return R; };
  R.state = function () { return S; };
  R.AL = function () { return AL; };

  R.DEFAULT_TG = { wkMax: '18:30', frMax: '18:30', satOn: true, satMax: '17:00', sun: false, ph: false, from: 'today', prio: 'sat', extend: false, dow: [1, 2, 3, 4, 5] };

  /* ---- rates (section 2) ---- */
  R.basicFor = function (ym) { var st = S.settings; return ym >= st.raiseFrom ? +st.basic : +(st.basicBefore || st.basic); };
  R.rates = function (ym) { var b = R.basicFor(ym), h = b / 26 / 8, p = parseYm(ym); return { basic: b, hour: r2(h), r15: r2(h * 1.5), r20: r2(h * 2), day: b / 26, unpaid: b / daysIn(p.y, p.m) }; };
  R.epfFor = function (w) { if (w <= 0) return 0; return Math.ceil(Math.ceil(w / 20) * 20 * 0.11 - 1e-9); };
  R.bandMid = function (g) { return Math.ceil(g / 100) * 100 - 50; };

  /* ---- clock-out → OT on the 30-minute grid (section 4) ---- */
  R.fromOut = function (t, out) {
    var raw = tmin(out); if (raw == null) return { ot: 0, paid: null, label: '?', kind: 'norm' };
    var x = raw - raw % 30, lab = mtime(raw);
    if (t === 'SA') {
      if (x < 690) { var n = (690 - x) / 30; return { ot: 0, paid: Math.max(0, 3.5 - 0.75 * n), label: lab, kind: 'early', early: true }; }
      var h = (x - 690) / 60; if (x > 840) h -= 0.5;
      return { ot: h, paid: 3.5 + 1.5 * h, label: lab, kind: h > 0 ? 'ot' : 'norm', est: true };
    }
    var base = t === 'FR' ? 7.5 : 8.5;
    if (x <= 810) return { ot: 0, paid: 4.5, label: lab, kind: 'half', half: true };
    if (x < 1050) { var n2 = (1050 - x) / 30; return { ot: 0, paid: base - 0.75 * n2, label: lab, kind: 'early', early: true }; }
    var o = (x - 1050) / 60;
    return { ot: o, paid: base + 1.5 * o, label: lab, kind: o > 0 ? 'ot' : 'norm', nr: x >= 1140 };
  };
  R.monthSched = function (ym) { var p = parseYm(ym), s = 0; for (var d = 1; d <= daysIn(p.y, p.m); d++) s += SCHED[dayType(p.y, p.m, d)]; return s; };
  R.baseShare = function (ym, t) { var r = R.rates(ym); if (t === 'SU') return 0; return S.settings.baseMode === 'hour' ? r.basic / R.monthSched(ym) * SCHED[t] : r.day; };

  /* ---- one day ---- */
  R.dayCalc = function (ym, d, e) {
    var p = parseYm(ym), t = dayType(p.y, p.m, d), ph = PH[iso(p.y, p.m, d)] || null, r = R.rates(ym);
    var c = { t: t, ph: ph, ot: 0, ot2: 0, up: 0, paid: null, label: '', kind: 'empty', nr: false, base: R.baseShare(ym, t), real: !!(e && e.real), remark: e && e.remark || '' };
    if (!e) { if (ph) { c.label = 'PH'; c.kind = 'leave'; } }
    else if (e.k === 'W') {
      if (ph || t === 'SU') { c.ot2 = 8; c.paid = 16; c.label = ph ? 'PH ×2' : 'Sun ×2'; c.kind = 'x2'; }
      else { var o = R.fromOut(t, e.out); c.ot = o.ot; c.paid = o.paid; c.label = o.label; c.kind = o.kind; c.nr = !!o.nr; c.early = !!o.early; c.est = !!o.est; c.half = !!o.half; }
    }
    else if (e.k === 'X2') { c.ot2 = 8; c.paid = 16; c.label = ph ? 'PH ×2' : 'Work ×2'; c.kind = 'x2'; }
    else if (e.k === 'UPH') { c.up = 0.5; c.label = '½ unpaid'; c.kind = 'unpaid'; c.paid = 4.5; }
    else if (e.k === 'UPL') { c.up = 1; c.label = 'Unpaid'; c.kind = 'unpaid'; c.paid = 0; }
    else if (e.k === 'AL' && AL.over[iso(p.y, p.m, d)]) { c.up = 1; c.over = true; c.label = 'AL ✕'; c.kind = 'unpaid'; c.paid = 0; }
    else if (LEAVES[e.k]) { c.label = e.k === 'CL' ? 'Leave' : e.k; c.kind = e.k === 'OFF' ? 'empty' : 'leave'; c.paid = 0; }
    if (e && e.real && typeof e.paid === 'number') c.paid = e.paid;
    if (c.remark && /NR/i.test(c.remark)) c.nr = true;
    c.dh = null; c.dlab = '';
    if (e && e.k === 'W' && !(ph || t === 'SU')) {
      var x0 = tmin(e.out);
      if (x0 != null) {
        x0 -= x0 % 30; var end = t === 'SA' ? 690 : 1050;
        if (c.half) { c.dh = -(end - 780) / 60; c.dlab = '½ day'; }
        else if (x0 < end) { c.dh = -(end - x0) / 60; c.dlab = '−' + fh1(-c.dh) + 'h'; }
        else if (c.ot > 0) { c.dh = c.ot; c.dlab = '+' + fh1(c.ot) + 'h'; }
        else { c.dh = 0; c.dlab = 'on time'; }
      }
    }
    else if (c.ot2) { c.dh = c.ot2; c.dlab = '+' + c.ot2 + 'h ×2'; }
    else if (c.up) { c.dh = null; c.dlab = c.up === 1 ? '−1 day' : '−½ day'; }
    c.otAmt = c.ot * r.r15; c.x2Amt = c.ot2 * r.r20; c.upAmt = c.up * r.unpaid;
    c.total = c.base + c.otAmt + c.x2Amt - c.upAmt;
    return c;
  };

  /* ---- halves and money (sections 3 and 6) ---- */
  R.halves = function (ym, days) {
    var p = parseYm(ym), n = daysIn(p.y, p.m), H = [null, { ot: 0, ot2: 0, up: 0, paid: 0, nr: 0, days: 0 }, { ot: 0, ot2: 0, up: 0, paid: 0, nr: 0, days: 0 }];
    days = days || S.months[ym] || {};
    for (var d = 1; d <= n; d++) { var c = R.dayCalc(ym, d, days[pad(d)]), h = H[d <= 15 ? 1 : 2]; h.ot += c.ot; h.ot2 += c.ot2; h.up += c.up; h.paid += c.paid || 0; if (c.nr) h.nr++; if (days[pad(d)]) h.days++; }
    return H;
  };
  R.money = function (ym, H) {
    var r = R.rates(ym), b = r.basic;
    var o1 = r2(H[1].ot * r.r15), o2 = r2(H[2].ot * r.r15), x1 = r2(H[1].ot2 * r.r20), x2 = r2(H[2].ot2 * r.r20), u1 = r2(H[1].up * r.unpaid), u2 = r2(H[2].up * r.unpaid);
    var gross = b + o1 + o2 + x1 + x2 - u1 - u2, mid = R.bandMid(gross);
    var epf = R.epfFor(b - u1 - u2), socso = r2(mid * 0.005), eis = r2(mid * 0.002), skbbk = S.settings.skbbk ? r2(gross * 0.0075) : 0, ded = epf + socso + eis + skbbk;
    var e1 = b / 2 + o1 + x1 - u1, e2 = b / 2 + o2 + x2 - u2;
    return { r: r, o1: o1, o2: o2, x1: x1, x2: x2, u1: u1, u2: u2, gross: gross, epf: epf, socso: socso, eis: eis, skbbk: skbbk, ded: ded, earn1: e1, earn2: e2, half1: e1, half2: e2 - ded, net: gross - ded,
      ot: H[1].ot + H[2].ot, ot2: H[1].ot2 + H[2].ot2, up: H[1].up + H[2].up, nr: H[1].nr + H[2].nr };
  };
  R.monthMoney = function (ym) { return R.money(ym, R.halves(ym)); };
  R.recEstimate = function (key) { var p = key.split('-'), ym = p[0] + '-' + p[1], h = +p[2], M = R.monthMoney(ym); return h === 1 ? M.half1 : M.half2; };

  /* ---- annual-leave ledger (section 5) ---- */
  R.computeAL = function () {
    var st = S.settings, list = [], over = {}, left = {}, used = {};
    Object.keys(S.months).forEach(function (ym) { var m = S.months[ym]; Object.keys(m).forEach(function (dd) { if (m[dd] && m[dd].k === 'AL') list.push(ym + '-' + dd); }); });
    list.sort();
    var y0 = +String(st.alAsOf || '').slice(0, 4);
    list.forEach(function (d) {
      var y = +d.slice(0, 4); used[y] = (used[y] || 0) + 1;
      if (d < st.alAsOf) return;
      if (left[y] == null) left[y] = y === y0 ? +st.alLeft : +st.alQuota;
      if (left[y] > 0) left[y]--; else over[d] = 1;
    });
    AL = { over: over, left: left, used: used };
    return AL;
  };
  R.alLeft = function (y) { var st = S.settings, y0 = +String(st.alAsOf || '').slice(0, 4); if (AL.left[y] != null) return AL.left[y]; return y < y0 ? null : y === y0 ? +st.alLeft : +st.alQuota; };

  /* ---- target engine ---- */
  R.WK_STEPS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  R.SA_STEPS = ['12:30', '13:00', '15:00', '16:30', '17:00', '17:30'];
  function stepsUpTo(list, max) { var m = tmin(max); return list.filter(function (t) { return tmin(t) <= m; }); }
  R.withSugg = function (ym) { var d = Object.assign({}, S.months[ym] || {}), sg = (S.targets[ym] || {}).sugg || {}; Object.keys(sg).forEach(function (k) { d[k] = sg[k]; }); return d; };
  R.suggest = function (ym, target, rules, baseDays) {
    var Rl = rules || S.settings.tg;
    var p = parseYm(ym), n = daysIn(p.y, p.m), base = Object.assign({}, baseDays || S.months[ym] || {}), td = today(), cur = ymOf(td.y, td.m);
    var startD = Rl.from === 'month' ? 1 : (ym < cur ? 99 : ym === cur ? td.d + 1 : 1), wk = [], sa = [], rest = [];
    for (var d = startD; d <= n; d++) {
      var k = pad(d), t = dayType(p.y, p.m, d), ph = PH[iso(p.y, p.m, d)], e = base[k], dow = new Date(p.y, p.m - 1, d).getDay();
      if (e && !(Rl.extend && e.k === 'W' && !ph && t !== 'SU')) continue;
      if (ph) { if (Rl.ph) rest.push({ k: k, steps: ['X2'], ph: 1 }); continue; }
      if (t === 'SU') { if (Rl.sun) rest.push({ k: k, steps: ['X2'] }); continue; }
      if (t !== 'SA' && Rl.dow.indexOf(dow) < 0) continue;
      var cur0 = e ? tmin(e.out) : null;
      var st = t === 'SA' ? (Rl.satOn ? stepsUpTo(R.SA_STEPS, Rl.satMax) : []) : stepsUpTo(R.WK_STEPS, t === 'FR' ? Rl.frMax : Rl.wkMax);
      if (cur0 != null) st = st.filter(function (x) { return tmin(x) > cur0 - cur0 % 30; });
      if (!st.length) continue;
      (t === 'SA' ? sa : wk).push({ k: k, steps: st });
    }
    var spread = function (list) { var a = list.filter(function (x) { return +x.k <= 15; }), b = list.filter(function (x) { return +x.k > 15; }), o = []; while (a.length || b.length) { if (a.length) o.push(a.shift()); if (b.length) o.push(b.shift()); } return o; };
    var order;
    if (Rl.prio === 'wk') order = spread(wk).concat(sa);
    else if (Rl.prio === 'spread') order = spread(wk.concat(sa).sort(function (x, y) { return +x.k - +y.k; }));
    else order = sa.concat(spread(wk));
    order = order.concat(rest);
    var net = function (days) { return R.money(ym, R.halves(ym, days)).net; };
    var mk = function (s) { return s === 'X2' ? { k: 'X2' } : { k: 'W', out: s }; };
    var now = net(base), days = Object.assign({}, base), sg = {}, reached = now >= target;
    for (var i = 0; i < order.length && !reached; i++) {
      var c = order[i], top = c.steps[c.steps.length - 1];
      days[c.k] = mk(top); sg[c.k] = mk(top);
      if (net(days) >= target) {
        reached = true;
        for (var j = 0; j < c.steps.length - 1; j++) { days[c.k] = mk(c.steps[j]); if (net(days) >= target) { sg[c.k] = mk(c.steps[j]); break; } }
        days[c.k] = sg[c.k];
      }
    }
    var H0 = R.halves(ym, base), H1 = R.halves(ym, days), ty = { sa: 0, wk: 0, x2: 0 };
    Object.keys(sg).forEach(function (k) { var t = dayType(p.y, p.m, +k); if (sg[k].k === 'X2') ty.x2++; else if (t === 'SA') ty.sa++; else ty.wk++; });
    return { now: now, net: net(days), sugg: sg, reached: reached, otNeed: (H1[1].ot + H1[2].ot) - (H0[1].ot + H0[2].ot), x2Need: (H1[1].ot2 + H1[2].ot2) - (H0[1].ot2 + H0[2].ot2), otTotal: H1[1].ot + H1[2].ot, count: Object.keys(sg).length, free: order.length, ty: ty };
  };

  /* ---- plan A/B ---- */
  R.planMonth = function (ym, P) {
    var p = parseYm(ym), n = daysIn(p.y, p.m), days = {};
    for (var d = 1; d <= n; d++) {
      var t = dayType(p.y, p.m, d), ph = PH[iso(p.y, p.m, d)], k = pad(d);
      if (ph) { if (P.ph === 'work') days[k] = { k: 'X2' }; continue; }
      if (t === 'SU') continue;
      if (t === 'SA') { if (P.sa === 'off') days[k] = { k: 'OFF' }; else days[k] = { k: 'W', out: P.sa }; continue; }
      days[k] = { k: 'W', out: t === 'FR' ? P.fr : P.mt };
    }
    return R.money(ym, R.halves(ym, days));
  };

  R.todayIso = function () { var t = today(); return iso(t.y, t.m, t.d); };
  R.DEFAULT_ASSUME = { wk: '17:30', sa: '13:00' };
  /* Home forecast: real days, plus an assumed clock-out for every empty working day after today. */
  R.assumedDays = function (ym, assume) {
    assume = assume || S.settings.assume || R.DEFAULT_ASSUME;
    var p = parseYm(ym), n = daysIn(p.y, p.m), days = Object.assign({}, S.months[ym] || {}), t0 = R.todayIso();
    for (var d = 1; d <= n; d++) {
      var k = pad(d); if (days[k]) continue; var k2 = iso(p.y, p.m, d); if (k2 <= t0) continue;
      var t = dayType(p.y, p.m, d); if (t === 'SU' || PH[k2]) continue;
      days[k] = { k: 'W', out: t === 'SA' ? assume.sa : assume.wk, assumed: 1 };
    }
    return days;
  };
  R.assumedMoney = function (ym, assume) { var H = R.halves(ym, R.assumedDays(ym, assume)), M = R.money(ym, H); M.H = H; return M; };
  /* Plan scenario view of a month: a planned day overrides the real one; otherwise the real day shows. Any date can be planned. */
  R.planDays = function (ym) {
    var p = parseYm(ym), n = daysIn(p.y, p.m), real = S.months[ym] || {}, pl = (S.plans && S.plans.days[ym]) || {}, out = {};
    for (var d = 1; d <= n; d++) { var k = pad(d); if (pl[k]) out[k] = pl[k]; else if (real[k]) out[k] = real[k]; }
    return out;
  };
  /* One month ahead in the plan: real + planned days stay; remaining empty days after today follow pattern P (null = normal hours, no OT). */
  R.forecastMonth = function (ym, P) {
    var p = parseYm(ym), n = daysIn(p.y, p.m), days = R.planDays(ym), td = today(), cur = ymOf(td.y, td.m);
    if (P) for (var d = 1; d <= n; d++) {
      var k = pad(d); if (days[k]) continue;
      if (ym < cur || (ym === cur && d < td.d)) continue;
      var t = dayType(p.y, p.m, d), ph = PH[iso(p.y, p.m, d)];
      if (ph) { if (P.ph === 'work') days[k] = { k: 'X2' }; continue; }
      if (t === 'SU') continue;
      if (t === 'SA') { if (P.sa !== 'off') days[k] = { k: 'W', out: P.sa }; continue; }
      days[k] = { k: 'W', out: t === 'FR' ? P.fr : P.mt };
    }
    var H = R.halves(ym, days), M = R.money(ym, H); M.H = H; M.set = Object.keys(days).length; return M;
  };
  R.forecast = function (fromYm, months, P) {
    var out = [], tot = { net: 0, gross: 0, ot: 0, ot2: 0, up: 0, ded: 0 };
    for (var i = 0; i < months; i++) { var ym = addYm(fromYm, i), M = R.forecastMonth(ym, P); out.push({ ym: ym, M: M }); tot.net += M.net; tot.gross += M.gross; tot.ot += M.ot; tot.ot2 += M.ot2; tot.up += M.up; tot.ded += M.ded; }
    return { months: out, total: tot };
  };

  /* Days that should have an entry but don't: Mon–Sat, not a public holiday, from the tracker start date to 'toIso' (inclusive). */
  R.missingDays = function (fromIso, toIso) {
    var out = [];
    if (!fromIso || !toIso || fromIso > toIso) return out;
    var d = new Date(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
    for (; ; d.setDate(d.getDate() + 1)) {
      var y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate(), k = iso(y, m, dd);
      if (k > toIso) break;
      if (d.getDay() === 0 || PH[k]) continue;
      var e = (S.months[ymOf(y, m)] || {})[pad(dd)];
      if (!e) out.push(k);
    }
    return out;
  };
  R.yesterdayIso = function () { var t = new Date(); t.setDate(t.getDate() - 1); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); };

  /* ---- time-card JSON → calendar entries ---- */
  R.normalize = function (o) {
    var num = U.num, MON3 = U.MON3;
    var y = +o.year, m = +o.month, half = +o.half;
    if (!Array.isArray(o.days) || !o.days.length) return { error: 'This file has no "days" list. Use the prompt from the Import tab.' };
    if (!y || !m) { var d0 = String(o.days[0].date || '').match(/^(\d{4})-(\d{2})/); if (d0) { y = +d0[1]; m = +d0[2]; } }
    if (!y || !m) return { error: 'Could not tell which month this is.' };
    var ym = ymOf(y, m), days = {}, warn = [], n = daysIn(y, m);
    o.days.forEach(function (r) {
      var dm = String(r.date || '').match(/(\d{4})-(\d{2})-(\d{2})/); if (!dm) { warn.push('Row without a date skipped'); return; }
      if (+dm[1] !== y || +dm[2] !== m) return;
      var d = +dm[3], st = String(r.status || '').toUpperCase(), out = r.out && tmin(r.out) != null ? mtime(tmin(r.out)) : null, inn = r['in'] && tmin(r['in']) != null ? mtime(tmin(r['in'])) : null;
      var e = { real: 1, 'in': inn, out: out, paid: num(r.paid_hours), remark: r.remark || null };
      var t = dayType(y, m, d), ph = PH[iso(y, m, d)];
      if (out && st !== 'AL' && st !== 'MC') e.k = 'W';
      else if (st === 'AL') e.k = 'AL';
      else if (st === 'MC') e.k = 'MC';
      else if (st === 'ABSENT') { e.k = 'UPL'; warn.push(d + ' ' + MON3[m - 1] + ': no swipe and no remark, marked unpaid. Change it if that day was leave.'); }
      else if (st === 'LEAVE_OTHER') e.k = 'CL';
      else if (st === 'UNCLEAR') { e.k = null; warn.push(d + ' ' + MON3[m - 1] + ': the AI could not read this row.'); }
      else e.k = null;
      if (e.k === null) { if (!e.remark && e.paid == null && !inn) return; e.k = 'OFF'; }
      if (t === 'SU' && e.k === 'OFF' && !e.remark && !inn) return;
      if (ph && e.k === 'OFF') return;
      days[pad(d)] = e;
    });
    if (!half) { var ds = Object.keys(days).map(Number); half = ds.length && Math.min.apply(null, ds) >= 16 ? 2 : 1; }
    var ps = o.payslip && typeof o.payslip === 'object' ? {} : null;
    if (ps) ['basic', 'ot15_rate', 'ot15_hours', 'ot15_amount', 'ot20_rate', 'ot20_hours', 'ot20_amount', 'allowance', 'unpaid_days', 'unpaid_amount', 'total_earnings', 'epf', 'socso', 'eis', 'skbbk', 'pcb', 'advance', 'other_deductions', 'total_deductions', 'net'].forEach(function (k) { ps[k] = num(o.payslip[k]); });
    if (ps && ps.ot15_hours != null && ps.ot15_rate != null && ps.ot15_hours > ps.ot15_rate && ps.ot15_rate < 20) { var sw = ps.ot15_hours; ps.ot15_hours = ps.ot15_rate; ps.ot15_rate = sw; warn.push('OT rate and hours looked swapped on the payslip; fixed.'); }
    (o.notes || []).forEach(function (x) { warn.push('AI note: ' + x); });
    return { ym: ym, half: half, days: days, payslip: ps, name: o.name || '', warn: warn, n: n };
  };
  R.mergedDays = function (P) { var cur = Object.assign({}, S.months[P.ym] || {}), from = P.half === 1 ? 1 : 16, to = P.half === 1 ? 15 : P.n; for (var d = from; d <= to; d++) delete cur[pad(d)]; return Object.assign(cur, P.days); };

  G.Gaji.R = R;
})(typeof window !== 'undefined' ? window : globalThis);
