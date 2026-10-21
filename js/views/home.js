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

  V.home = function (UI) {
    var S = St.S, cp = U.currentPeriod(), M = R.monthMoney(cp.ym), H = R.halves(cp.ym), isHalf = UI.heroScope === 'half';
    var amt = isHalf ? (cp.h === 1 ? M.half1 : M.half2) : M.net, hh = H[cp.h], rec = S.records[cp.ym + '-' + cp.h], y = U.parseYm(cp.ym).y;
    var h = '<div class="home"><div class="col">';
    h += '<section class="hero" aria-label="Estimate"><div class="row" style="justify-content:space-between;position:relative;z-index:1"><span class="eyebrow">' + (isHalf ? 'Estimated pay · ' + U.periodName(cp.ym, cp.h) : 'Estimated take-home · ' + MONTHS[U.parseYm(cp.ym).m - 1] + ' ' + y) + '</span>' +
      '<div class="hero-seg"><button data-hero="half" aria-pressed="' + isHalf + '">Half</button><button data-hero="month" aria-pressed="' + !isHalf + '">Month</button></div></div>' +
      '<div class="hero-amt"><small>RM</small>' + fm(amt) + '</div>' +
      '<div class="hero-sub">' + (isHalf ? (cp.h === 1 ? '1st half has no deductions.' : 'All of the month\'s deductions come off this half.') : 'Gross RM' + fm(M.gross) + ' − deductions RM' + fm(M.ded)) + (rec && rec.payslip && rec.payslip.net != null ? ' · Payslip: RM' + fm(rec.payslip.net) : '') + '</div>' +
      '<div class="hero-row"><div><span>OT 1.5×</span><b>' + fh(isHalf ? hh.ot : M.ot) + 'h</b></div><div><span>OT 2×</span><b>' + fh(isHalf ? hh.ot2 : M.ot2) + 'h</b></div><div><span>Unpaid</span><b>' + (isHalf ? hh.up : M.up) + 'd</b></div><div><span>NR days</span><b>' + (isHalf ? hh.nr : M.nr) + '</b></div></div></section>';
    h += todayCard(cp);
    var pay = nextPayday(cp), al = R.alLeft(y);
    h += '<div class="tiles">' +
      '<div class="tile"><div class="eyebrow">Next payday</div><div class="v">~' + pay.label + '</div><div class="s">' + (pay.days > 0 ? 'in ' + pay.days + ' day' + (pay.days === 1 ? '' : 's') : pay.days === 0 ? 'today' : 'passed') + ' · ' + U.halfLabel(cp.h) + '</div></div>' +
      '<div class="tile"><div class="eyebrow">Work days left</div><div class="v">' + daysLeft(cp) + '</div><div class="s">in this half</div></div>' +
      '<button class="tile" data-go="cal"><div class="eyebrow">Annual leave ' + y + '</div><div class="v" style="color:var(--' + (al === null ? 'ink' : al <= 0 ? 'bad' : al <= 2 ? 'amber' : 'good') + ')">' + (al === null ? '—' : al + ' left') + '</div><div class="s">' + (al !== null && al <= 0 ? 'AL now counts as unpaid' : 'of ' + S.settings.alQuota + ' a year') + '</div></button>' +
      '<div class="tile"><div class="eyebrow">OT this month</div><div class="v">RM' + fm(M.o1 + M.o2 + M.x1 + M.x2) + '</div><div class="s">' + fh(M.ot) + 'h at RM' + fm(M.r.r15) + (M.ot2 ? ' + ' + fh(M.ot2) + 'h ×2' : '') + '</div></div></div>';
    h += '<div class="row"><button class="btn primary" data-go="cal" style="flex:1">' + IC().cal + 'Calendar</button><button class="btn" data-go="imp" style="flex:1">' + IC().imp + 'Import</button></div>';
    h += '</div><div class="col">';
    h += trendCard(cp);
    h += slipsCard();
    h += '</div></div>';
    return h;
  };

  /* Today: one tap to log the clock-out or a leave code on the phone. */
  function todayCard(cp) {
    var S = St.S, t = U.today(), ym = cp.ym, e = (S.months[ym] || {})[pad(t.d)], c = R.dayCalc(ym, t.d, e), ty = c.t;
    var times = ty === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    var h = '<section class="card"><div class="card-h" style="margin-bottom:8px"><div><div class="eyebrow">Today · ' + U.DOWL[new Date(t.y, t.m - 1, t.d).getDay()] + ' ' + t.d + ' ' + MON3[t.m - 1] + (c.ph ? ' · ' + esc(c.ph) : '') + '</div><h2>' + (e ? (e.k === 'W' ? 'Out ' + esc(e.out) + (c.dlab ? ' · ' + esc(c.dlab) : '') : U.LEAVES[e.k] || e.k) : ty === 'SU' ? 'Sunday · rest day' : 'Not logged yet') + '</h2></div><span class="chip ' + (c.ot || c.ot2 ? 'amber' : c.up ? 'bad' : 'accent') + '">RM' + fm(c.total) + '</span></div>';
    if (ty === 'SU' && !c.ph) { h += '<div class="quick"><button data-today="X2" aria-pressed="' + (!!e && (e.k === 'X2' || e.k === 'W')) + '">Worked (2×)</button>' + (e ? '<button data-today="" class="lv">Clear</button>' : '') + '</div>'; }
    else {
      h += '<div class="quick">' + times.map(function (x) { return '<button data-today="t:' + x + '" aria-pressed="' + (!!e && e.k === 'W' && e.out === x) + '">' + x + '</button>'; }).join('') +
        ['AL', 'MC', 'OFF'].map(function (k) { return '<button class="lv" data-today="' + k + '" aria-pressed="' + (!!e && e.k === k) + '">' + k + '</button>'; }).join('') + (e ? '<button class="lv" data-today="">Clear</button>' : '') + '</div>';
    }
    if (e && e.real) h += '<p class="tiny muted" style="margin-top:8px">From the time card. Changing it here keeps the import mark.</p>';
    return h + '</section>';
  }

  /* Trend: net per half (estimate vs payslip) and OT hours per half, last 8 halves. One axis each, hover tooltip. */
  function series() {
    var S = St.S, cp = U.currentPeriod(), out = [], ym = U.addYm(cp.ym, -4), end = cp.ym;
    for (; ym <= end; ym = U.addYm(ym, 1)) {
      var hasDays = !!(S.months[ym] && Object.keys(S.months[ym]).length), M = R.monthMoney(ym), H = R.halves(ym);
      [1, 2].forEach(function (hf) {
        if (ym === end && hf > cp.h) return;
        var rec = S.records[ym + '-' + hf], act = rec && rec.payslip && rec.payslip.net != null ? rec.payslip.net : null;
        out.push({ ym: ym, h: hf, key: ym + '-' + hf, est: hf === 1 ? M.half1 : M.half2, act: act, ot: H[hf].ot + H[hf].ot2, otRec: rec && rec.payslip && rec.payslip.ot15_hours != null ? rec.payslip.ot15_hours : null, hasDays: hasDays, current: ym === cp.ym && hf === cp.h });
      });
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
      if (opt.lab(p) != null) s += '<text class="lbl" x="' + (x0 + slot / 2) + '" y="' + (y(Math.max.apply(null, vals.filter(function (v) { return v != null; }))) - 5) + '" text-anchor="middle">' + opt.lab(p) + '</text>';
      s += '<text class="ax" x="' + (x0 + slot / 2) + '" y="' + (Hh - 8) + '" text-anchor="middle">' + MON3[U.parseYm(p.ym).m - 1] + ' H' + p.h + '</text>';
      s += '<rect class="hit" data-tip="' + esc(opt.tip(p)) + '" data-ym="' + p.ym + '" x="' + x0 + '" y="' + padT + '" width="' + slot + '" height="' + (Hh - padT) + '"/>';
    });
    return s + '</svg>';
  }
  function narrowScreen() { return G.innerWidth < 600; }
  function trendCard() {
    var pts = series(), lastAct = pts.filter(function (p) { return p.act != null; }).map(function (p) { return p.key; }).pop();
    var h = '<section class="card"><div class="card-h"><h2>Net pay per half</h2><div class="legend"><span><i style="background:var(--c1)"></i>Estimate</span><span><i style="background:var(--c2)"></i>Payslip</span></div></div>';
    h += '<div class="chart" data-chart="1">' + bars(pts, { label: 'Net pay per half', n: 2, vals: function (p) { return [p.est, p.act]; }, step: function (m) { return m > 3000 ? 1000 : 500; }, fmtAx: function (g) { return g ? (g / 1000) + 'k' : '0'; },
      lab: function (p) { return p.current ? Math.round(p.est) : p.act != null && (!narrowScreen() || p.key === lastAct) ? Math.round(p.act) : null; }, tip: function (p) { return U.periodName(p.ym, p.h) + '|Estimate RM' + fm(p.est) + (p.act != null ? ' · Payslip RM' + fm(p.act) + ' (' + (p.act - p.est >= 0 ? '+' : '−') + fm(Math.abs(p.act - p.est)) + ')' : '') + (p.current ? ' · in progress' : ''); } }) + '</div>';
    h += '<p class="tiny muted" style="margin-top:6px">The lighter bar is the half in progress. Tap a bar to open that month.</p>';
    h += '<div class="card-h" style="margin-top:14px"><h2>OT hours per half</h2></div>';
    h += '<div class="chart" data-chart="1">' + bars(pts, { label: 'OT hours per half', n: 1, h: 140, vals: function (p) { return [p.ot]; }, step: function (m) { return m > 20 ? 10 : 5; }, fmtAx: function (g) { return g + 'h'; },
      lab: function (p) { return p.ot && (!narrowScreen() || p.current || p.ot === Math.max.apply(null, pts.map(function (q) { return q.ot; }))) ? U.fh1(p.ot) : null; }, tip: function (p) { return U.periodName(p.ym, p.h) + '|OT ' + fh(p.ot) + 'h' + (p.otRec != null ? ' · payslip ' + fh(p.otRec) + 'h' : ''); } }) + '</div>';
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
