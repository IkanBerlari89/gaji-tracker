/* Home: hero estimate, today quick-log, stat tiles, trend charts, payslip list. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, pad = U.pad, esc = U.esc, MON3 = U.MON3, MONTHS = U.MONTHS;
  var V = Ga.V = Ga.V || {};
  var IC = function () { return Ga.IC; };

  function nextPayday(cp) {
    var p = U.parseYm(cp.ym), t = U.today(), d;
    if (cp.h === 1) d = new Date(p.y, p.m - 1, 20); else d = new Date(p.y, p.m, 5);
    var days = Math.round((d - new Date(t.y, t.m - 1, t.d)) / 864e5);
    return { label: d.getDate() + ' ' + MON3[d.getMonth()], days: days, approx: true };
  }
  function daysLeft(cp) { var p = U.parseYm(cp.ym), t = U.today(), end = cp.h === 1 ? 15 : U.daysIn(p.y, p.m), n = 0; for (var d = t.d; d <= end; d++) if (U.dayType(p.y, p.m, d) !== 'SU') n++; return n; }
  function parseIso(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10), ym: s.slice(0, 7) }; }
  function shiftIso(s, k) { var p = parseIso(s), d = new Date(p.y, p.m - 1, p.d + k); return U.iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function niceDate(s) { var p = parseIso(s); return U.DOWL[new Date(p.y, p.m - 1, p.d).getDay()] + ', ' + p.d + ' ' + MON3[p.m - 1] + ' ' + p.y; }
  Ga.trackFrom = function () { var tf = St.S.settings.trackFrom; if (/^\d{4}-\d{2}-\d{2}$/.test(tf || '')) return tf; var t = U.today(); return U.iso(t.y, t.m, 1); };
  Ga.missing = function () { return R.missingDays(Ga.trackFrom(), R.yesterdayIso()); };

  V.home = function (UI) {
    var S = St.S, t = U.today(), todayIso = U.iso(t.y, t.m, t.d);
    if (!UI.trackDate) UI.trackDate = todayIso;
    if (UI.trackDate > todayIso) UI.trackDate = todayIso;
    var td = parseIso(UI.trackDate), cp = { ym: td.ym, h: td.d <= 15 ? 1 : 2 }, M = R.assumedMoney(cp.ym), H = M.H, hh = H[cp.h], as = S.settings.assume || R.DEFAULT_ASSUME;
    var half = cp.h === 1 ? M.half1 : M.half2, rec = S.records[cp.ym + '-' + cp.h], y = td.y, miss = Ga.missing();
    var h = '<div class="home"><div class="col">';
    // hero: predicted payslip for the half of the tracked date, month total underneath
    h += '<section class="hero" aria-label="Predicted payslip"><span class="eyebrow">Predicted payslip · ' + U.periodName(cp.ym, cp.h) + '</span>' +
      '<div class="hero-amt"><small>RM</small>' + fm(half) + '</div>' +
      '<div class="hero-sub">Month ' + MONTHS[td.m - 1] + ' ' + y + ': <b style="color:var(--hero-ink)">RM' + fm(M.net) + '</b> · 1st half ' + fm(M.half1) + ' + 2nd half ' + fm(M.half2) + (rec && rec.payslip && rec.payslip.net != null ? ' · actual payslip RM' + fm(rec.payslip.net) : '') + '</div>' +
      '<div class="hero-sub" style="margin-top:4px">' + (cp.h === 1 ? '1st half has no deductions.' : 'EPF, SOCSO, EIS' + (S.settings.skbbk ? ', SKBBK' : '') + ' (RM' + fm(M.ded) + ') come off this half.') + (miss.length ? ' <b style="color:var(--amber-strong)">' + miss.length + ' past day' + (miss.length === 1 ? '' : 's') + ' not filled</b>: counted with no OT until you fill them.' : '') + '</div>' +
      '<div class="hero-sub assume" style="margin-top:10px">Days ahead assumed: weekday out <select id="asWk" aria-label="Assumed weekday clock-out">' + ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(function (x) { return '<option value="' + x + '"' + (x === as.wk ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select> · Saturday out <select id="asSa" aria-label="Assumed Saturday clock-out">' + ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'].map(function (x) { return '<option value="' + x + '"' + (x === as.sa ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></section>';
    h += trackerCard(UI, todayIso, miss);
    if (miss.length) h += missingCard(miss);
    h += otCard(UI, cp, M, H);
    var pay = nextPayday(cp), al = R.alLeft(y);
    h += '<div class="tiles">' +
      '<div class="tile"><div class="eyebrow">Next payday</div><div class="v">~' + pay.label + '</div><div class="s">' + (pay.days > 0 ? 'in ' + pay.days + ' day' + (pay.days === 1 ? '' : 's') : pay.days === 0 ? 'today' : 'passed') + ' · ' + U.halfLabel(cp.h) + '</div></div>' +
      '<div class="tile"><div class="eyebrow">Work days left</div><div class="v">' + daysLeft(U.currentPeriod()) + '</div><div class="s">in the current half</div></div>' +
      '<button class="tile" data-go="cal"><div class="eyebrow">Annual leave ' + y + '</div><div class="v" style="color:var(--' + (al === null ? 'ink' : al <= 0 ? 'bad' : al <= 2 ? 'amber' : 'good') + ')">' + (al === null ? '—' : al + ' left') + '</div><div class="s">' + (al !== null && al <= 0 ? 'AL now counts as unpaid' : 'of ' + S.settings.alQuota + ' a year') + '</div></button>' +
      '<div class="tile"><div class="eyebrow">Unpaid · ' + MON3[td.m - 1] + '</div><div class="v">' + (M.up ? '−RM' + fm(M.u1 + M.u2) : 'none') + '</div><div class="s">' + (M.up ? M.up + ' day' + (M.up === 1 ? '' : 's') + ' at RM' + fm(M.r.unpaid) : 'no unpaid days this month') + '</div></div></div>';
    h += '<div class="row"><button class="btn primary" data-go="cal" style="flex:1">' + IC().cal + 'Calendar</button><button class="btn" data-go="imp" style="flex:1">' + IC().imp + 'Import</button></div>';
    h += '</div><div class="col">';
    h += trendCard(UI);
    h += slipsCard();
    h += '</div></div>';
    return h;
  };

  /* Daily tracker: pick a date, set what happened, save. */
  function trackerCard(UI, todayIso, miss) {
    var S = St.S, iso = UI.trackDate, p = parseIso(iso), e = (S.months[p.ym] || {})[pad(p.d)], c = R.dayCalc(p.ym, p.d, e), ty = c.t, isToday = iso === todayIso, locked = !!(e && e.real);
    var type = UI.trkType != null ? UI.trkType : (e ? (e.k === 'W' ? 'W' : e.k) : ''), out = UI.trkOut || (e && e.out) || (ty === 'SA' ? '13:00' : '18:00');
    var ent = type === '' ? null : type === 'W' ? { k: 'W', out: out } : { k: type };
    if (ent && e && e.real && type === e.k && (type !== 'W' || out === e.out)) ent = e;
    var cc = R.dayCalc(p.ym, p.d, ent), isMiss = miss.indexOf(iso) >= 0, dirty = JSON.stringify(ent ? { k: ent.k, out: ent.out || null } : null) !== JSON.stringify(e ? { k: e.k, out: e.out || null } : null);
    var times = ty === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    var h = '<section class="card trk"><div class="card-h" style="margin-bottom:10px"><div><div class="eyebrow">Daily tracker' + (isToday ? ' · today' : '') + (c.ph ? ' · ' + esc(c.ph) : '') + '</div><h2>' + niceDate(iso) + '</h2></div>' +
      '<span class="chip ' + (e ? (e.k === 'W' ? 'good' : 'blue') : isMiss ? 'bad' : '') + '">' + (e ? (e.k === 'W' ? 'Saved · out ' + esc(e.out) : 'Saved · ' + (U.LEAVES[e.k] || e.k)) : isMiss ? 'Not filled' : ty === 'SU' ? 'Sunday' : 'Empty') + '</span></div>';
    h += '<div class="row trk-nav"><button class="icon-btn" data-trk="-1" aria-label="Previous day">' + IC().left + '</button><input type="date" id="trkDate" value="' + iso + '" max="' + todayIso + '" aria-label="Pick a date" style="flex:1;min-width:0"><button class="icon-btn" data-trk="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>' + IC().right + '</button>' + (isToday ? '' : '<button class="btn sm" data-trk="today">Today</button>') + '</div>';
    h += '<div class="row" style="margin-top:10px"><div class="field"><label for="trkType">What happened</label><select id="trkType"><option value=""' + (type === '' ? ' selected' : '') + '>Not set' + (ty === 'SU' ? ' · rest day' : ' · counts as normal day') + '</option><option value="W"' + (type === 'W' ? ' selected' : '') + '>Worked · clock-out time</option>' +
      Object.keys(U.LEAVES).map(function (k) { return '<option value="' + k + '"' + (type === k ? ' selected' : '') + '>' + U.LEAVES[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="max-width:140px"><label for="trkOut">Clock out</label><input id="trkOut" type="time" value="' + esc(out) + '"' + (type === 'W' ? '' : ' disabled') + '></div></div>';
    if (locked) h += '';
    else if (ty !== 'SU' || c.ph) h += '<div class="quick" style="margin-top:8px">' + times.map(function (x) { return '<button data-trkq="t:' + x + '" aria-pressed="' + (type === 'W' && out === x) + '">' + x + '</button>'; }).join('') + ['AL', 'MC', 'OFF', 'UPH', 'UPL'].map(function (k) { return '<button class="lv" data-trkq="' + k + '" aria-pressed="' + (type === k) + '">' + k + '</button>'; }).join('') + '</div>';
    else h += '<div class="quick" style="margin-top:8px"><button data-trkq="X2" aria-pressed="' + (type === 'X2') + '">Worked (2×)</button></div>';
    if (type === 'AL' && R.alLeft(p.y) !== null && R.alLeft(p.y) <= 0 && iso >= S.settings.alAsOf) h += '<div class="note warn" style="margin-top:8px">AL balance for ' + p.y + ' is 0. This AL counts as unpaid (−RM' + fm(R.rates(p.ym).unpaid) + ').</div>';
    h += '<dl class="kv" style="margin-top:10px"><dt>OT 1.5×</dt><dd>' + fh(cc.ot) + ' h · RM' + fm(cc.otAmt) + '</dd>' + (cc.ot2 ? '<dt>OT 2×</dt><dd>' + fh(cc.ot2) + ' h · RM' + fm(cc.x2Amt) + '</dd>' : '') + (cc.up ? '<dt>Unpaid</dt><dd>−RM' + fm(cc.upAmt) + '</dd>' : '') + '<dt>Paid hours</dt><dd>' + (cc.paid != null ? fh(cc.paid) + (cc.est ? ' (est.)' : '') : '—') + '</dd><div class="sep"></div><dt>Day total</dt><dd class="big">RM' + fm(cc.total) + '</dd></dl>';
    if (cc.nr) h += '<p class="tiny muted" style="margin-top:4px">NR shows on the time card from 19:00. The money is the OT hours.</p>';
    if (e && e.real) h += '<div class="note good" style="margin-top:8px"><b>Locked.</b> From the time card (in ' + esc(e['in'] || '—') + ', out ' + esc(e.out || '—') + ', paid ' + (e.paid != null ? fh(e.paid) : '—') + 'h). Import again to change it.</div>';
    else h += '<div class="row" style="margin-top:12px"><button class="btn primary" data-act="trkSave" style="flex:1"' + (dirty ? '' : ' disabled') + '>' + (dirty ? 'Save ' + p.d + ' ' + MON3[p.m - 1] : 'Saved') + '</button>' + (e ? '<button class="btn" data-act="trkClear">Clear day</button>' : '') + '</div>';
    return h + '</section>';
  }
  function missingCard(miss) {
    var show = miss.slice(0, 12);
    return '<section class="card" style="border-color:var(--bad)"><div class="card-h" style="margin-bottom:8px"><div><div class="eyebrow" style="color:var(--bad)">Not filled yet</div><h2>' + miss.length + ' day' + (miss.length === 1 ? '' : 's') + ' missing since ' + (function (s) { var p = parseIso(s); return p.d + ' ' + MON3[p.m - 1]; })(Ga.trackFrom()) + '</h2></div><span class="chip bad">tap to fill</span></div>' +
      '<div class="quick">' + show.map(function (s) { var p = parseIso(s); return '<button class="lv" data-jump="' + s + '" style="border-color:var(--bad);color:var(--bad)">' + U.DOW3[new Date(p.y, p.m - 1, p.d).getDay()] + ' ' + p.d + ' ' + MON3[p.m - 1] + '</button>'; }).join('') + (miss.length > show.length ? '<span class="chip">+' + (miss.length - show.length) + ' more</span>' : '') + '</div>' +
      '<p class="tiny muted" style="margin-top:8px">An empty weekday is counted as a normal day with no OT until you fill it. These days are also outlined in red on the Calendar. Change the start date in More → Settings.</p></section>';
  }
  function otCard(UI, cp, M, H) {
    var isHalf = UI.otScope !== 'month', hh = H[cp.h], ot = isHalf ? hh.ot : M.ot, ot2 = isHalf ? hh.ot2 : M.ot2, otRm = isHalf ? (cp.h === 1 ? M.o1 + M.x1 : M.o2 + M.x2) : M.o1 + M.o2 + M.x1 + M.x2;
    return '<section class="card"><div class="card-h" style="margin-bottom:8px"><h2>Overtime · ' + (isHalf ? U.periodName(cp.ym, cp.h) : MONTHS[U.parseYm(cp.ym).m - 1] + ' ' + U.parseYm(cp.ym).y) + '</h2><div class="seg"><button data-ot-scope="half" aria-pressed="' + isHalf + '">Half</button><button data-ot-scope="month" aria-pressed="' + !isHalf + '">Month</button></div></div>' +
      '<div class="tiles"><div class="tile" style="box-shadow:none"><div class="eyebrow">OT 1.5×</div><div class="v">' + fh(ot) + 'h</div><div class="s">RM' + fm(ot * M.r.r15) + ' at RM' + fm(M.r.r15) + '/h</div></div>' +
      '<div class="tile" style="box-shadow:none"><div class="eyebrow">OT 2× (Sun / PH)</div><div class="v">' + fh(ot2) + 'h</div><div class="s">RM' + fm(ot2 * M.r.r20) + ' at RM' + fm(M.r.r20) + '/h</div></div>' +
      '<div class="tile" style="box-shadow:none"><div class="eyebrow">OT pay</div><div class="v">RM' + fm(otRm) + '</div><div class="s">on top of basic RM' + fm(M.r.basic / (isHalf ? 2 : 1)) + '</div></div>' +
      '<div class="tile" style="box-shadow:none"><div class="eyebrow">NR days</div><div class="v">' + (isHalf ? hh.nr : M.nr) + '</div><div class="s">clock-out 19:00 or later</div></div></div></section>';
  }

  /* Trend: net and OT, by half (last 8) or by month (last 8). One axis each, hover tooltip. */
  function series(byMonth) {
    var S = St.S, cp = U.currentPeriod(), out = [], ym = U.addYm(cp.ym, byMonth ? -7 : -4), end = cp.ym;
    for (; ym <= end; ym = U.addYm(ym, 1)) {
      var M = R.monthMoney(ym), H = R.halves(ym), r1 = S.records[ym + '-1'], r2 = S.records[ym + '-2'], q = U.parseYm(ym);
      var n1 = r1 && r1.payslip && r1.payslip.net != null ? r1.payslip.net : null, n2 = r2 && r2.payslip && r2.payslip.net != null ? r2.payslip.net : null;
      if (byMonth) {
        var o1 = r1 && r1.payslip && r1.payslip.ot15_hours != null ? r1.payslip.ot15_hours : null, o2 = r2 && r2.payslip && r2.payslip.ot15_hours != null ? r2.payslip.ot15_hours : null;
        out.push({ ym: ym, h: 0, key: ym, label: MON3[q.m - 1] + (q.m === 1 ? ' ' + String(q.y).slice(2) : ''), name: U.MONTHS[q.m - 1] + ' ' + q.y, est: M.net, act: n1 != null && n2 != null ? n1 + n2 : null, partial: (n1 != null) !== (n2 != null), ot: M.ot + M.ot2, otRec: o1 != null || o2 != null ? (o1 || 0) + (o2 || 0) : null, current: ym === cp.ym });
      } else {
        [1, 2].forEach(function (hf) {
          if (ym === end && hf > cp.h) return;
          var rec = hf === 1 ? r1 : r2, act = hf === 1 ? n1 : n2;
          out.push({ ym: ym, h: hf, key: ym + '-' + hf, label: MON3[q.m - 1] + ' H' + hf, name: U.periodName(ym, hf), est: hf === 1 ? M.half1 : M.half2, act: act, ot: H[hf].ot + H[hf].ot2, otRec: rec && rec.payslip && rec.payslip.ot15_hours != null ? rec.payslip.ot15_hours : null, current: ym === cp.ym && hf === cp.h });
        });
      }
    }
    return out.slice(-8);
  }
  function bars(pts, opt) {
    var narrow = G.innerWidth < 600, W = narrow ? 380 : 640, Hh = opt.h || (narrow ? 150 : 170), padL = 36, padB = 24, padT = 12, max = 0;
    pts.forEach(function (p) { opt.vals(p).forEach(function (v) { if (v != null && v > max) max = v; }); });
    if (!max) max = 1;
    var step = opt.step(max), top = Math.ceil(max / step) * step, slot = (W - padL - 6) / pts.length, ns = opt.n;
    var y = function (v) { return padT + (Hh - padT - padB) * (1 - v / top); }, y0 = y(0);
    var s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + esc(opt.label) + '">';
    for (var g = 0; g <= top + 1e-9; g += step) s += '<line class="grid" x1="' + padL + '" x2="' + W + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="ax" x="' + (padL - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + opt.fmtAx(g) + '</text>';
    pts.forEach(function (p, i) {
      var x0 = padL + i * slot, vals = opt.vals(p), bw = Math.min(narrow ? 14 : 22, (slot - 8) / ns), gap = 2, total = ns * bw + (ns - 1) * gap, start = x0 + (slot - total) / 2;
      vals.forEach(function (v, k) {
        if (v == null) return;
        var x = start + k * (bw + gap), yy = y(v), hgt = Math.max(0, y0 - yy);
        s += '<path d="M' + x + ' ' + y0 + ' v-' + Math.max(0, hgt - 4) + ' a4 4 0 0 1 4 -4 h' + (bw - 8) + ' a4 4 0 0 1 4 4 v' + Math.max(0, hgt - 4) + ' z" fill="var(--c' + (k + 1) + ')"' + (p.current && k === 0 ? ' opacity=".55"' : '') + '/>';
      });
      vals.forEach(function (v, k) { if (v == null) return; var x = start + k * (bw + gap) + bw / 2, vl = opt.lab(v); s += '<text class="lbl' + (ns > 1 ? ' sm' : '') + '" x="' + x + '" y="' + (y(v) - 4) + '" text-anchor="middle">' + vl + '</text>'; });
      s += '<text class="ax" x="' + (x0 + slot / 2) + '" y="' + (Hh - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>';
      s += '<rect class="hit" data-tip="' + esc(opt.tip(p)) + '" data-ym="' + p.ym + '" x="' + x0 + '" y="' + padT + '" width="' + slot + '" height="' + (Hh - padT) + '"/>';
    });
    return s + '</svg>';
  }
  function narrowScreen() { return G.innerWidth < 600; }
  function trendCard(UI) {
    var byMonth = UI.chartScope === 'month', unit = byMonth ? 'month' : 'half';
    var pts = series(byMonth);
    var seg = '<div class="seg"><button data-chart-scope="half" aria-pressed="' + !byMonth + '">Half</button><button data-chart-scope="month" aria-pressed="' + byMonth + '">Month</button></div>';
    var h = '<section class="card"><div class="card-h"><h2>Net pay per ' + unit + '</h2>' + seg + '</div><div class="legend" style="margin-bottom:8px"><span><i style="background:var(--c1)"></i>Estimate</span><span><i style="background:var(--c2)"></i>Payslip</span></div>';
    h += '<div class="chart" data-chart="1">' + bars(pts, { label: 'Net pay per ' + unit, n: 2, vals: function (p) { return [p.est, p.act]; }, step: function (m) { return m > 3000 ? 1000 : 500; }, fmtAx: function (g) { return g ? (g / 1000) + 'k' : '0'; },
      lab: function (v) { return narrowScreen() ? (v / 1000).toFixed(1) + 'k' : Math.round(v); }, tip: function (p) { return p.name + '|Estimate RM' + fm(p.est) + (p.act != null ? ' · Payslip RM' + fm(p.act) + ' (' + (p.act - p.est >= 0 ? '+' : '−') + fm(Math.abs(p.act - p.est)) + ')' : p.partial ? ' · payslip for one half only' : '') + (p.current ? ' · in progress' : ''); } }) + '</div>';
    h += '<p class="tiny muted" style="margin-top:6px">The lighter bar is the ' + unit + ' in progress.' + (byMonth ? ' A payslip bar needs both halves saved.' : '') + ' Tap a bar to open that month.</p>';
    h += '<div class="card-h" style="margin-top:14px"><h2>OT hours per ' + unit + '</h2></div>';
    h += '<div class="chart" data-chart="1">' + bars(pts, { label: 'OT hours per ' + unit, n: 1, h: 140, vals: function (p) { return [p.ot]; }, step: function (m) { return m > 40 ? 20 : m > 20 ? 10 : 5; }, fmtAx: function (g) { return g + 'h'; },
      lab: function (v) { return v ? U.fh1(v) : ''; }, tip: function (p) { return p.name + '|OT ' + fh(p.ot) + 'h' + (p.otRec != null ? ' · payslip ' + fh(p.otRec) + 'h' : ''); } }) + '</div>';
    return h + '</section>';
  }

  function slipsCard() {
    var S = St.S, keys = Object.keys(S.records).sort().reverse();
    var h = '<section class="card"><div class="card-h"><h2>Payslips</h2><button class="btn ghost sm" data-act="addSlip">+ Add manually</button></div>';
    if (!keys.length) return h + '<div class="empty">No payslips saved yet.<br>Import a time card with its payslip, or add the net amount manually.</div></section>';
    h += '<div class="slips">';
    keys.forEach(function (k) {
      var r = S.records[k], p = k.split('-'), ym = p[0] + '-' + p[1], hf = +p[2], net = r.payslip && r.payslip.net, hasDays = !!(S.months[ym] && Object.keys(S.months[ym]).length);
      var est = R.recEstimate(k), diff = net != null && hasDays ? net - est : null;
      h += '<button class="slip" data-slip="' + k + '"><div class="slip-ic">' + MON3[+p[1] - 1] + '</div><div class="slip-t"><b>' + U.periodName(ym, hf) + '</b><span>' + (r.source === 'import' ? 'Imported time card' : r.source === 'history' ? 'Earlier payslip' : 'Added manually') + (r.payslip && r.payslip.ot15_hours != null ? ' · OT ' + fh(r.payslip.ot15_hours) + 'h' : '') + '</span></div>' +
        '<div class="slip-v"><b>' + (net != null ? 'RM' + fm(net) : '—') + '</b>' + (diff != null ? '<span class="chip ' + (Math.abs(diff) < 1 ? 'good' : diff > 0 ? 'good' : 'bad') + '">' + (Math.abs(diff) < 1 ? 'Matches' : (diff > 0 ? '+' : '−') + 'RM' + fm(Math.abs(diff)) + ' vs est.') + '</span>' : '') + '</div></button>';
    });
    return h + '</div></section>';
  }

  /* chart hover/tap layer */
  V.wireCharts = function (root) {
    root.querySelectorAll('.chart[data-chart]').forEach(function (ch) {
      var tip = null;
      var show = function (el, ev) {
        if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; ch.appendChild(tip); }
        var t = (el.dataset.tip || '').split('|'); tip.innerHTML = '<b>' + esc(t[0]) + '</b>' + esc(t[1] || '');
        var r = ch.getBoundingClientRect(), b = el.getBoundingClientRect();
        tip.style.left = (b.left - r.left + b.width / 2) + 'px'; tip.style.top = (b.top - r.top + 10) + 'px';
      };
      ch.addEventListener('pointerover', function (e) { var el = e.target.closest('.hit'); if (el) show(el, e); });
      ch.addEventListener('pointerout', function (e) { if (tip && !ch.contains(e.relatedTarget)) { tip.remove(); tip = null; } });
      ch.addEventListener('click', function (e) { var el = e.target.closest('.hit'); if (el && el.dataset.ym) { Ga.UI.ym = el.dataset.ym; Ga.go('cal'); } });
    });
  };
})(window);
