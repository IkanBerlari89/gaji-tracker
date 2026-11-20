/* Home: one number (predicted pay), a one-tap daily tracker, one chart. Everything else sits behind Details or a fold. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St;
  var fm = U.fm, fh = U.fh, fh1 = U.fh1, pad = U.pad, esc = U.esc, MON3 = U.MON3, MONTHS = U.MONTHS;
  var V = Ga.V = Ga.V || {};
  var IC = function () { return Ga.IC; };

  function nextPayday(cp) {
    var p = U.parseYm(cp.ym), t = U.today(), d;
    if (cp.h === 1) d = new Date(p.y, p.m - 1, 20); else d = new Date(p.y, p.m, 5);
    var days = Math.round((d - new Date(t.y, t.m - 1, t.d)) / 864e5);
    return { label: d.getDate() + ' ' + MON3[d.getMonth()], days: days };
  }
  function daysLeft(cp) { var p = U.parseYm(cp.ym), t = U.today(), end = cp.h === 1 ? 15 : U.daysIn(p.y, p.m), n = 0; for (var d = t.d; d <= end; d++) if (U.dayType(p.y, p.m, d) !== 'SU') n++; return n; }
  function parseIso(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10), ym: s.slice(0, 7) }; }
  function shortDate(s) { var p = parseIso(s); return U.DOW3[new Date(p.y, p.m - 1, p.d).getDay()] + ' ' + p.d + ' ' + MON3[p.m - 1]; }
  function niceDate(s) { var p = parseIso(s); return U.DOW3[new Date(p.y, p.m - 1, p.d).getDay()] + ', ' + p.d + ' ' + MON3[p.m - 1] + ' ' + p.y; }
  Ga.trackFrom = function () { var tf = St.S.settings.trackFrom; if (/^\d{4}-\d{2}-\d{2}$/.test(tf || '')) return tf; var t = U.today(); return U.iso(t.y, t.m, 1); };
  Ga.missing = function () { return R.missingDays(Ga.trackFrom(), R.yesterdayIso()); };

  V.home = function (UI) {
    var t = U.today(), todayIso = U.iso(t.y, t.m, t.d);
    if (!UI.trackDate || UI.trackDate > todayIso) UI.trackDate = todayIso;
    var td = parseIso(UI.trackDate), cp = { ym: td.ym, h: td.d <= 15 ? 1 : 2 }, M = R.assumedMoney(cp.ym), miss = Ga.missing();
    return '<div class="home"><div class="col">' + hero(UI, cp, M, td) + trackerCard(UI, todayIso, miss) + '</div><div class="col">' + trendCard(UI) + slipsFold(UI) + '</div></div>';
  };

  /* Hero: the predicted payslip for the half of the tracked date. Three supporting numbers; the breakdown is behind Details. */
  function hero(UI, cp, M, td) {
    var S = St.S, H = M.H, hh = H[cp.h], half = cp.h === 1 ? M.half1 : M.half2, rec = S.records[cp.ym + '-' + cp.h], as = S.settings.assume || R.DEFAULT_ASSUME;
    var pay = nextPayday(cp), otH = hh.ot + hh.ot2, upRm = cp.h === 1 ? M.u1 : M.u2, al = R.alLeft(td.y), mon = MONTHS[td.m - 1];
    var h = '<section class="hero" aria-label="Predicted payslip"><span class="eyebrow">Predicted pay · ' + U.periodName(cp.ym, cp.h) + '</span>' +
      '<div class="hero-amt"><small>RM</small>' + fm(half) + '</div>' +
      '<div class="hero-sub">' + mon + ' total <b>RM' + fm(M.net) + '</b></div>' +
      '<div class="hero-row three"><div><span>Overtime</span><b>' + fh1(otH) + ' h</b></div><div><span>Unpaid</span><b>' + (hh.up ? hh.up + ' d' : 'none') + '</b></div><div><span>Payday</span><b>~' + pay.label + '</b></div></div>';
    var kv = function (a, b, cls) { return '<dt' + (cls ? ' class="' + cls + '"' : '') + '>' + a + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + b + '</dd>'; };
    h += '<details class="hero-det" id="heroDet"' + (UI.heroOpen ? ' open' : '') + '><summary>Details</summary><dl class="kv">' +
      kv('Basic · ' + U.halfLabel(cp.h), fm(M.r.basic / 2)) +
      kv('OT 1.5× · ' + fh(hh.ot) + ' h', '+' + fm(cp.h === 1 ? M.o1 : M.o2)) +
      (hh.ot2 ? kv('OT 2× · ' + fh(hh.ot2) + ' h', '+' + fm(cp.h === 1 ? M.x1 : M.x2)) : '') +
      (hh.up ? kv('Unpaid · ' + hh.up + ' d', '−' + fm(upRm)) : '') +
      (cp.h === 2 ? kv('EPF ' + fm(M.epf) + ' · SOCSO ' + fm(M.socso) + ' · EIS ' + fm(M.eis) + (M.skbbk ? ' · SKBBK ' + fm(M.skbbk) : ''), '−' + fm(M.ded)) : kv('Deductions', 'all on the 2nd half')) +
      '<div class="sep"></div>' + kv('1st half', fm(M.half1)) + kv('2nd half', fm(M.half2)) + kv(mon + ' total', fm(M.net), 'big') +
      (rec && rec.payslip && rec.payslip.net != null ? kv('Actual payslip · ' + U.halfLabel(cp.h), fm(rec.payslip.net)) : '') +
      '<div class="sep"></div>' + kv('Payday', '~' + pay.label + (pay.days > 0 ? ' · in ' + pay.days + ' d' : pay.days === 0 ? ' · today' : '')) +
      kv('Work days left this half', daysLeft(U.currentPeriod())) + kv('Annual leave left ' + td.y, al === null ? '—' : al) + '</dl>' +
      '<div class="assume">Days ahead counted as weekday out <select id="asWk" aria-label="Assumed weekday clock-out">' + ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(function (x) { return '<option value="' + x + '"' + (x === as.wk ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>, Saturday out <select id="asSa" aria-label="Assumed Saturday clock-out">' + ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00'].map(function (x) { return '<option value="' + x + '"' + (x === as.sa ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></details>';
    return h + '</section>';
  }

  /* Daily tracker: one tap on a clock-out saves the day. Anything else (leave, unpaid, exact time, unlock) is behind Other. */
  function trackerCard(UI, todayIso, miss) {
    var S = St.S, iso = UI.trackDate, p = parseIso(iso), e = (S.months[p.ym] || {})[pad(p.d)], c = R.dayCalc(p.ym, p.d, e), ty = c.t, isToday = iso === todayIso, isReal = !!(e && e.real), isMiss = miss.indexOf(iso) >= 0;
    var rest = ty === 'SU' || !!c.ph, times = rest ? [] : ty === 'SA' ? ['11:30', '12:30', '13:00', '15:00', '17:00'] : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
    var cur = e && e.k === 'W' && U.tmin(e.out) != null ? U.mtime(U.tmin(e.out) - U.tmin(e.out) % 30) : null, status, tone = '';
    if (!e) { status = rest ? (c.ph ? esc(c.ph) : 'Sunday') + ' · rest day' : 'Not filled yet'; tone = isMiss ? ' bad' : ''; }
    else if (e.k === 'W' || e.k === 'X2') { status = (e.out ? 'Out ' + esc(e.out) : 'Worked') + (c.ot2 ? ' · ' + c.ot2 + ' h at 2×' : c.ot ? ' · OT ' + fh1(c.ot) + ' h' : c.half ? ' · half day' : c.early ? ' · left early' : ' · on time'); tone = ' good'; }
    else { status = c.over ? 'Annual leave · no balance, unpaid' : (U.LEAVES[e.k] || e.k); tone = c.up ? ' bad' : ' blue'; }
    var h = '<section class="card trk"><div class="trk-head"><button class="icon-btn" data-trk="-1" aria-label="Previous day">' + IC().left + '</button>' +
      '<button class="trk-date" data-act="trkPick" aria-label="Pick a date"><span class="eyebrow">' + (isToday ? 'Today' : 'Daily tracker') + '</span><b>' + niceDate(iso) + '</b></button>' +
      '<input type="date" id="trkDate" class="trk-pick" value="' + iso + '" max="' + todayIso + '" tabindex="-1" aria-hidden="true">' +
      '<button class="icon-btn" data-trk="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>' + IC().right + '</button></div>';
    h += '<div class="trk-status"><span class="st' + tone + '">' + status + (isReal ? ' · time card' : '') + '</span>' + (e ? '<b>RM' + fm(c.total) + '</b>' : '') + '</div>';
    h += '<div class="chips">' + (rest ? '<button data-trkq="X2" aria-pressed="' + (!!e && (e.k === 'X2' || e.k === 'W')) + '"' + (isReal ? ' disabled' : '') + '>Worked 2×</button>' :
      times.map(function (x) { return '<button data-trkq="t:' + x + '" aria-pressed="' + (cur === x) + '"' + (isReal ? ' disabled' : '') + '>' + x + '</button>'; }).join('')) +
      '<button class="other" data-act="trkOther">' + (isReal ? 'View' : 'Other') + '</button></div>';
    h += '<p class="tiny muted trk-hint">' + (isReal ? 'From the time card and locked. View lets you unlock it.' : 'Tap your clock-out to save. Other: leave, unpaid, exact time.') + (isToday ? '' : ' <button class="link" data-trk="today">Back to today</button>') + '</p>';
    if (miss.length) {
      var show = miss.slice(0, 6);
      h += '<div class="trk-miss"><b>' + miss.length + ' day' + (miss.length === 1 ? '' : 's') + ' not filled</b><div class="quick">' + show.map(function (s) { return '<button data-jump="' + s + '" aria-pressed="' + (s === iso) + '">' + shortDate(s) + '</button>'; }).join('') + (miss.length > show.length ? '<span class="chip">+' + (miss.length - show.length) + '</span>' : '') + '</div></div>';
    }
    return h + '</section>';
  }

  /* Trend: net pay by half (last 8) or by month (last 8). One axis, value on every bar, hover tooltip. */
  function series(byMonth) {
    var S = St.S, cp = U.currentPeriod(), out = [], ym = U.addYm(cp.ym, byMonth ? -7 : -4), end = cp.ym;
    for (; ym <= end; ym = U.addYm(ym, 1)) {
      var M = R.monthMoney(ym), r1 = S.records[ym + '-1'], r2 = S.records[ym + '-2'], q = U.parseYm(ym);
      var n1 = r1 && r1.payslip && r1.payslip.net != null ? r1.payslip.net : null, n2 = r2 && r2.payslip && r2.payslip.net != null ? r2.payslip.net : null;
      if (byMonth) {
        out.push({ ym: ym, key: ym, label: MON3[q.m - 1] + (q.m === 1 ? ' ' + String(q.y).slice(2) : ''), name: MONTHS[q.m - 1] + ' ' + q.y, est: M.net, act: n1 != null && n2 != null ? n1 + n2 : null, partial: (n1 != null) !== (n2 != null), current: ym === cp.ym });
      } else {
        [1, 2].forEach(function (hf) {
          if (ym === end && hf > cp.h) return;
          out.push({ ym: ym, key: ym + '-' + hf, label: MON3[q.m - 1] + ' H' + hf, name: U.periodName(ym, hf), est: hf === 1 ? M.half1 : M.half2, act: hf === 1 ? n1 : n2, current: ym === cp.ym && hf === cp.h });
        });
      }
    }
    return out.slice(-8);
  }
  function narrowScreen() { return G.innerWidth < 600; }
  function bars(pts, opt) {
    var narrow = narrowScreen(), W = narrow ? 380 : 640, Hh = narrow ? 170 : 200, padL = 36, padB = 24, padT = 16, max = 0;
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
        s += '<text class="lbl' + (ns > 1 ? ' sm' : '') + '" x="' + (x + bw / 2) + '" y="' + (yy - 4) + '" text-anchor="middle">' + opt.lab(v) + '</text>';
      });
      s += '<text class="ax" x="' + (x0 + slot / 2) + '" y="' + (Hh - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>';
      s += '<rect class="hit" data-tip="' + esc(opt.tip(p)) + '" data-ym="' + p.ym + '" x="' + x0 + '" y="' + padT + '" width="' + slot + '" height="' + (Hh - padT) + '"/>';
    });
    return s + '</svg>';
  }
  function trendCard(UI) {
    var byMonth = UI.chartScope === 'month', unit = byMonth ? 'month' : 'half', pts = series(byMonth);
    return '<section class="card"><div class="card-h"><h2>Net pay per ' + unit + '</h2><div class="seg"><button data-chart-scope="half" aria-pressed="' + !byMonth + '">Half</button><button data-chart-scope="month" aria-pressed="' + byMonth + '">Month</button></div></div>' +
      '<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--c1)"></i>Estimate</span><span><i style="background:var(--c2)"></i>Payslip</span></div>' +
      '<div class="chart" data-chart="1">' + bars(pts, { label: 'Net pay per ' + unit, n: 2, vals: function (p) { return [p.est, p.act]; }, step: function (m) { return m > 3000 ? 1000 : 500; }, fmtAx: function (g) { return g ? (g / 1000) + 'k' : '0'; },
        lab: function (v) { return narrowScreen() ? (v / 1000).toFixed(1) + 'k' : Math.round(v); }, tip: function (p) { return p.name + '|Estimate RM' + fm(p.est) + (p.act != null ? ' · Payslip RM' + fm(p.act) + ' (' + (p.act - p.est >= 0 ? '+' : '−') + fm(Math.abs(p.act - p.est)) + ')' : p.partial ? ' · payslip for one half only' : '') + (p.current ? ' · in progress' : ''); } }) + '</div></section>';
  }

  /* Payslips: folded away until wanted. */
  function slipsFold(UI) {
    var S = St.S, keys = Object.keys(S.records).sort().reverse();
    var h = '<details class="card fold" id="slipsDet"' + (UI.slipsOpen ? ' open' : '') + '><summary><h2>Payslips</h2><span class="chip">' + keys.length + '</span></summary>';
    if (!keys.length) h += '<div class="empty">None yet. Import a time card with its payslip, or add one by hand.</div>';
    else {
      h += '<div class="slips">';
      keys.forEach(function (k) {
        var r = S.records[k], p = k.split('-'), ym = p[0] + '-' + p[1], hf = +p[2], net = r.payslip && r.payslip.net, hasDays = !!(S.months[ym] && Object.keys(S.months[ym]).length);
        var est = R.recEstimate(k), diff = net != null && hasDays ? net - est : null;
        h += '<button class="slip" data-slip="' + k + '"><div class="slip-ic">' + MON3[+p[1] - 1] + '</div><div class="slip-t"><b>' + U.periodName(ym, hf) + '</b><span>' + (r.payslip && r.payslip.ot15_hours != null ? 'OT ' + fh(r.payslip.ot15_hours) + ' h' : r.source === 'history' ? 'Earlier payslip' : 'No OT line') + '</span></div>' +
          '<div class="slip-v"><b>' + (net != null ? 'RM' + fm(net) : '—') + '</b>' + (diff != null ? '<span class="chip ' + (Math.abs(diff) < 1 ? 'good' : 'bad') + '">' + (Math.abs(diff) < 1 ? 'Matches' : (diff > 0 ? '+' : '−') + fm(Math.abs(diff))) + '</span>' : '') + '</div></button>';
      });
      h += '</div>';
    }
    return h + '<button class="btn ghost sm" data-act="addSlip" style="margin-top:10px">+ Add a payslip by hand</button></details>';
  }

  /* chart hover/tap layer */
  V.wireCharts = function (root) {
    root.querySelectorAll('.chart[data-chart]').forEach(function (ch) {
      var tip = null;
      var show = function (el) {
        if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; ch.appendChild(tip); }
        var t = (el.dataset.tip || '').split('|'); tip.innerHTML = '<b>' + esc(t[0]) + '</b>' + esc(t[1] || '');
        var r = ch.getBoundingClientRect(), b = el.getBoundingClientRect();
        tip.style.left = Math.min(r.width - 90, Math.max(90, b.left - r.left + b.width / 2)) + 'px'; tip.style.top = (b.top - r.top + 10) + 'px';
      };
      ch.addEventListener('pointerover', function (e) { var el = e.target.closest('.hit'); if (el) show(el); });
      ch.addEventListener('pointerout', function (e) { if (tip && !ch.contains(e.relatedTarget)) { tip.remove(); tip = null; } });
      ch.addEventListener('click', function (e) { var el = e.target.closest('.hit'); if (el && el.dataset.ym) { Ga.UI.ym = el.dataset.ym; Ga.go('cal'); } });
    });
  };
})(window);
