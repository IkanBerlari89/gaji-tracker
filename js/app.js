/* Gaji Tracker v2 — shell: routing, rendering, sheets, sync pill, first-run setup. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St, Sy = Ga.Sy, V = Ga.V, A = Ga.A;
  var esc = U.esc, MONTHS = U.MONTHS;

  Ga.IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    imp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    flag: '<svg class="flag" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21V4h11l-1.5 3.5L16 11H7v10z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };
  var TABS = [['home', 'Home', 'home'], ['cal', 'Calendar', 'cal'], ['imp', 'Import', 'imp'], ['plan', 'Plan', 'plan'], ['more', 'More', 'more']];

  var t0 = U.today(), cur = U.ymOf(t0.y, t0.m);
  var UI = Ga.UI = { tab: 'home', sub: 'rules', ym: cur, brush: 'edit', heroScope: 'half', chartScope: 'half', ahead: 3, aheadFill: 'none', plStart: cur, plN: 3, plFillOpen: false, plClearArm: false, cmpOpen: false, planYm: cur,
    planA: { mt: '17:30', fr: '17:30', sa: '11:30', ph: 'rest' }, planB: { mt: '18:30', fr: '18:30', sa: '17:00', ph: 'rest' },
    promptYm: cur, promptHalf: t0.d <= 15 ? 1 : 2, pending: null, clearArm: false, targetOpen: false, rulesOpen: false };

  /* ---- helpers shared by views ---- */
  Ga.ymOptions = function (sel, wide, endYm) {
    var out = '', start = wide ? '2025-01' : (St.S.settings.startYm || '2026-01'), end = endYm || U.addYm(cur, 2);
    if (sel && sel < start) start = sel; if (sel && sel > end) end = sel;
    for (var ym = start; ym <= end; ym = U.addYm(ym, 1)) { var p = U.parseYm(ym); out = '<option value="' + ym + '"' + (ym === sel ? ' selected' : '') + '>' + MONTHS[p.m - 1] + ' ' + p.y + '</option>' + out; }
    return out;
  };
  var toastT;
  Ga.toast = function (msg) {
    var l = document.getElementById('toast'); if (!l) { l = document.createElement('div'); l.id = 'toast'; l.className = 'toast'; l.setAttribute('role', 'status'); document.body.appendChild(l); }
    l.textContent = msg; l.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { l.hidden = true; }, 2800);
  };
  Ga.sheet = function (inner, labelId) { document.getElementById('layer').innerHTML = '<div class="scrim" data-close="1"><div class="sheet" role="dialog" aria-modal="true"' + (labelId ? ' aria-labelledby="' + labelId + '"' : '') + '><div class="grab"></div>' + inner + '</div></div>'; };
  Ga.closeLayer = function () { document.getElementById('layer').innerHTML = ''; };
  Ga.go = function (tab) { UI.tab = tab; UI.clearArm = false; Ga.render(); window.scrollTo(0, 0); };
  Ga.readFile = function (f) { var rd = new FileReader(); rd.onload = function () { A.handleText(UI, String(rd.result)); }; rd.onerror = function () { Ga.toast('Could not read that file.'); }; rd.readAsText(f); };
  Ga.saveFile = function (name, text, mime) {
    var blob = new Blob([text], { type: mime });
    try { var f = new File([blob], name, { type: mime }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: name }).then(function () { Ga.toast('Shared ' + name); }, function (e) { if (e && e.name !== 'AbortError') download(blob, name); }); return; } } catch (e) {}
    download(blob, name);
  };
  function download(blob, name) { try { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); Ga.toast('Downloaded ' + name); } catch (e) { showText(name, ''); } }
  function showText(title, t) { Ga.sheet('<div class="sheet-h"><h2>' + esc(title) + '</h2><button class="icon-btn" data-close="1" aria-label="Close">' + Ga.IC.x + '</button></div><p class="small muted" style="margin-bottom:8px">Saving files did not work here. Select this text, copy it and keep it somewhere safe.</p><pre class="prompt-box">' + esc(t) + '</pre>'); }

  /* ---- theme ---- */
  var theme = St.lsGet('gaji-theme') || 'system';
  Ga.theme = function () { return theme; };
  function applyTheme() { var r = document.documentElement; if (theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme); var b = document.getElementById('themeBtn'); b.innerHTML = theme === 'dark' ? Ga.IC.moon : theme === 'light' ? Ga.IC.sun : Ga.IC.auto; b.title = 'Theme: ' + theme; }
  Ga.setTheme = function (t) { theme = t; St.lsSet('gaji-theme', t); applyTheme(); };
  document.getElementById('themeBtn').onclick = function () { Ga.setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'); Ga.toast('Theme: ' + theme); if (UI.tab === 'more') Ga.render(); };

  /* ---- sync pill ---- */
  function pill(s) {
    var el = document.getElementById('sync'); if (!el) return;
    el.className = 'sync ' + s.state;
    el.lastChild.textContent = s.state === 'synced' ? 'Synced ' + U.fmtTime(s.at) : s.msg || s.state;
    el.title = s.error || s.msg || '';
  }
  Sy.on(pill);
  document.getElementById('sync').onclick = function () { if (!Sy.ready()) { UI.sub = 'sync'; Ga.go('more'); return; } if (St.dirty()) Sy.push().catch(function () {}); else Sy.pull().then(function (r) { Ga.toast(r === 'updated' || r === 'merged' ? 'Updated from GitHub' : 'Up to date'); }, function () {}); };
  St.on(function (ev) { if (ev === 'replace') { Ga.render(); } });

  /* ---- render ---- */
  Ga.render = function () {
    R.computeAL();
    document.getElementById('nav').innerHTML = TABS.map(function (t) { return '<button data-tab="' + t[0] + '"' + (UI.tab === t[0] ? ' aria-current="page"' : '') + '>' + Ga.IC[t[2]] + '<span>' + t[1] + '</span></button>'; }).join('');
    var m = document.getElementById('main');
    m.innerHTML = UI.tab === 'home' ? V.home(UI) : UI.tab === 'cal' ? V.cal(UI) : UI.tab === 'imp' ? V.imp(UI) : UI.tab === 'plan' ? V.plan(UI) : V.more(UI);
    if (UI.tab === 'imp') V.wireImport(UI);
    if (UI.tab === 'home') V.wireCharts(m);
    if (UI.tab === 'more') { V.wireSettings(); V.wireHistory(); V.wireBackup(); }
    document.getElementById('sub').textContent = UI.tab === 'home' ? (St.isSetUp() ? 'Basic RM' + U.fm(R.rates(cur).basic) + ' · OT RM' + U.fm(R.rates(cur).r15) + '/h' : 'Set your basic pay in More → Settings') : TABS.filter(function (t) { return t[0] === UI.tab; })[0][1];
    try { location.hash = UI.tab; } catch (e) {}
  };

  /* ---- payslip sheet ---- */
  A.openSlip = function (key) {
    var S = St.S, isNew = !key, r = key ? S.records[key] : null, ps = r && r.payslip || {}, cp = U.currentPeriod(), ym = key ? key.slice(0, 7) : cp.ym, hf = key ? +key.slice(8) : cp.h;
    var h = '<div class="sheet-h"><h2 id="slT">' + (isNew ? 'Add payslip' : U.periodName(ym, hf)) + '</h2><button class="icon-btn" data-close="1" aria-label="Close">' + Ga.IC.x + '</button></div><div class="stack">';
    if (isNew) h += '<div class="row"><div class="field"><label for="sYm">Month</label><select id="sYm">' + Ga.ymOptions(ym) + '</select></div><div class="field" style="flex:0 0 auto"><label for="sH">Half</label><select id="sH"><option value="1"' + (hf === 1 ? ' selected' : '') + '>1–15</option><option value="2"' + (hf === 2 ? ' selected' : '') + '>16–end</option></select></div></div>';
    h += '<div class="row"><div class="field"><label for="sNet">Net pay (RM)</label><input id="sNet" inputmode="decimal" value="' + (ps.net != null ? ps.net : '') + '"></div><div class="field"><label for="sOt">OT 1.5× hours</label><input id="sOt" inputmode="decimal" value="' + (ps.ot15_hours != null ? ps.ot15_hours : '') + '"></div></div>';
    if (!isNew) {
      var keys = ['basic', 'ot15_amount', 'ot20_hours', 'ot20_amount', 'unpaid_days', 'unpaid_amount', 'total_earnings', 'epf', 'socso', 'eis', 'skbbk', 'pcb', 'advance', 'total_deductions'], any = keys.some(function (k) { return ps[k] != null; });
      if (any) h += '<dl class="kv">' + keys.filter(function (k) { return ps[k] != null; }).map(function (k) { return '<dt>' + k.replace(/_/g, ' ').replace('ot15', 'OT 1.5×').replace('ot20', 'OT 2×') + '</dt><dd>' + U.fm(ps[k]) + '</dd>'; }).join('') + '</dl>';
      var est = R.recEstimate(key); h += '<div class="note">Calculator estimate for this half: <b>RM' + U.fm(est) + '</b>' + (ps.net != null ? ' · difference ' + (ps.net - est >= 0 ? '+' : '−') + 'RM' + U.fm(Math.abs(ps.net - est)) : '') + '</div>';
    }
    h += '<div class="row"><button class="btn primary" id="sSave" style="flex:1">Save</button>' + (isNew ? '' : '<button class="btn" data-viewcal="' + ym + '">Calendar</button><button class="btn danger" id="sDel">Delete</button>') + '</div></div>';
    Ga.sheet(h, 'slT');
    document.getElementById('sSave').onclick = function () {
      var k = isNew ? document.getElementById('sYm').value + '-' + document.getElementById('sH').value : key;
      var rr = U.clone(S.records[k] || { source: 'manual', payslip: {} }); rr.payslip = rr.payslip || {}; rr.payslip.net = U.num(document.getElementById('sNet').value); rr.payslip.ot15_hours = U.num(document.getElementById('sOt').value);
      S.records[k] = rr; St.touch('records/' + k, 'Payslip ' + k); Ga.closeLayer(); Ga.render(); Ga.toast('Payslip saved');
    };
    var del = document.getElementById('sDel'); if (del) { var armed = false; del.onclick = function () { if (!armed) { armed = true; del.textContent = 'Tap again to delete'; return; } delete S.records[key]; St.touch('records/' + key, 'Delete payslip ' + key); Ga.closeLayer(); Ga.render(); Ga.toast('Deleted'); }; }
  };

  /* ---- first run ---- */
  function setupSheet() {
    var st = St.S.settings;
    Ga.sheet('<div class="sheet-h"><div><div class="eyebrow">Welcome</div><h2 id="suT">Set up your pay</h2></div></div><div class="stack">' +
      '<p class="small muted">These numbers drive every estimate. You can change them later in More → Settings. If you already use the app on another device, set up Sync instead and everything comes across.</p>' +
      '<div class="row"><div class="field"><label for="suBasic">Basic salary now (RM/month)</label><input id="suBasic" inputmode="decimal" placeholder="e.g. 3900"></div></div>' +
      '<div class="row"><div class="field"><label for="suFrom">Since</label><select id="suFrom">' + Ga.ymOptions(cur, true) + '</select></div><div class="field"><label for="suBefore">Basic before (RM, optional)</label><input id="suBefore" inputmode="decimal" placeholder="e.g. 3000"></div></div>' +
      '<div class="row"><div class="field"><label for="suStart">First month to track</label><select id="suStart">' + Ga.ymOptions(U.addYm(cur, -5), true) + '</select></div></div>' +
      '<div class="row"><div class="field"><label for="suAl">Annual leave left today</label><input id="suAl" inputmode="numeric" value="' + st.alLeft + '"></div><div class="field"><label for="suAlQ">AL per year</label><input id="suAlQ" inputmode="numeric" value="' + st.alQuota + '"></div></div>' +
      '<div class="row"><button class="btn primary" id="suGo" style="flex:1">Start</button><button class="btn" id="suSync">I have a sync repo</button></div></div>', 'suT');
    document.getElementById('suGo').onclick = function () {
      var b = U.num(document.getElementById('suBasic').value); if (!(b > 0)) { Ga.toast('Type your basic salary first'); return; }
      st.basic = b; st.basicBefore = U.num(document.getElementById('suBefore').value) || b; st.raiseFrom = document.getElementById('suFrom').value; st.startYm = document.getElementById('suStart').value;
      st.alLeft = U.num(document.getElementById('suAl').value) || 0; st.alQuota = U.num(document.getElementById('suAlQ').value) || 8; var t = U.today(); st.alAsOf = U.iso(t.y, t.m, t.d);
      St.touch('settings', 'First setup'); Ga.closeLayer(); Ga.render(); Ga.toast('Ready. Tap a day in the calendar to begin.');
    };
    document.getElementById('suSync').onclick = function () { Ga.closeLayer(); UI.sub = 'sync'; Ga.go('more'); };
  }

  /* ---- events ---- */
  document.getElementById('nav').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; Ga.go(b.dataset.tab); });
  document.getElementById('layer').addEventListener('click', function (e) {
    if (e.target.dataset && e.target.dataset.close || e.target.closest('button[data-close]')) Ga.closeLayer();
    var b = e.target.closest('[data-viewcal]'); if (b) { UI.ym = b.dataset.viewcal; Ga.closeLayer(); Ga.go('cal'); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Ga.closeLayer(); });
  document.getElementById('main').addEventListener('click', function (e) {
    if (e.target.closest('summary') && e.target.closest('#tgDet')) { UI.rulesOpen = !document.getElementById('tgDet').open; return; }
    if (e.target.closest('summary') && e.target.closest('#plFillDet')) { UI.plFillOpen = !document.getElementById('plFillDet').open; return; }
    if (e.target.closest('summary') && e.target.closest('#cmpDet')) { UI.cmpOpen = !document.getElementById('cmpDet').open; return; }
    if (e.target.closest('label.chk,label.pill,label.drop,label.btn')) return;
    var t = e.target.closest('button,[data-day]'); if (!t) return; var ds = t.dataset, S = St.S;
    if (ds.hero) { UI.heroScope = ds.hero; Ga.render(); }
    else if (ds.chartScope) { UI.chartScope = ds.chartScope; Ga.render(); }
    else if (ds.ahead) { UI.ahead = +ds.ahead; Ga.render(); }
    else if (ds.goym) { UI.ym = ds.goym; if (ds.go) Ga.go(ds.go); else { Ga.render(); window.scrollTo(0, 0); } }
    else if (ds.plstep) { UI.plN = Math.min(48, Math.max(1, UI.plN + +ds.plstep)); UI.plClearArm = false; Ga.render(); }
    else if (ds.aheadstep) { UI.ahead = Math.min(48, Math.max(1, UI.ahead + +ds.aheadstep)); Ga.render(); }
    else if (ds.act === 'plFill') { UI.plFillOpen = true; A.plFill(UI); }
    else if (ds.act === 'plClear') { UI.plFillOpen = true; if (!UI.plClearArm) { UI.plClearArm = true; Ga.render(); return; } UI.plClearArm = false; A.plClear(UI); }
    else if (ds.go) Ga.go(ds.go);
    else if (ds.sub) { UI.sub = ds.sub; Ga.render(); }
    else if (ds.mon) { UI.ym = U.addYm(UI.ym, +ds.mon); UI.clearArm = false; Ga.render(); }
    else if (ds.brush) { UI.brush = ds.brush; Ga.render(); }
    else if (ds.day) A.applyBrush(UI, +ds.day, ds.ym);
    else if (ds.slip) A.openSlip(ds.slip);
    else if (ds.imp) A.openPastImport(UI, ds.imp);
    else if (ds.restore) A.restoreVersion(ds.restore, t);
    else if (ds.ph) { UI.promptHalf = +ds.ph; Ga.render(); }
    else if (ds.skbbk) { S.settings.skbbk = ds.skbbk === '1'; St.touch('settings', 'Settings'); Ga.render(); }
    else if (ds.base) { S.settings.baseMode = ds.base; St.touch('settings', 'Settings'); Ga.render(); }
    else if (ds.theme) { Ga.setTheme(ds.theme); Ga.render(); }
    else if (ds.today != null) { var td = U.today(), v = ds.today, ent = v === '' ? null : v.indexOf('t:') === 0 ? { k: 'W', out: v.slice(2) } : { k: v }; var old = (S.months[UI.ym] || {})[U.pad(td.d)]; if (ent && old && old.real) ent = Object.assign({}, old, ent); A.setDay(U.ymOf(td.y, td.m), td.d, ent, 'Today ' + (ent ? (ent.out || ent.k) : 'cleared')); Ga.render(); }
    else if (ds.act === 'addSlip') A.openSlip(null);
    else if (ds.act === 'calToday') { UI.ym = cur; Ga.render(); }
    else if (ds.act === 'impSave') A.commitImport(UI);
    else if (ds.act === 'impCancel') { UI.pending = null; Ga.render(); }
    else if (ds.act === 'tgToggle') { var tg = S.targets[UI.ym]; if (UI.targetOpen || (tg && tg.target)) { UI.targetOpen = false; if (tg) { delete S.targets[UI.ym]; St.touch('targets/' + UI.ym, 'Clear target'); } } else UI.targetOpen = true; Ga.render(); }
    else if (ds.act === 'tgGo') { var v2 = U.num(document.getElementById('tgIn').value); if (!v2) { Ga.toast('Type a take-home amount first'); return; } var Rs = R.suggest(UI.ym, v2); S.targets[UI.ym] = { target: v2, sugg: Rs.sugg, res: Rs }; UI.targetOpen = true; St.touch('targets/' + UI.ym, 'Target ' + UI.ym); Ga.render(); }
    else if (ds.act === 'tgApply') { var tg2 = S.targets[UI.ym]; if (!tg2 || !tg2.sugg) return; var mm = S.months[UI.ym] || (S.months[UI.ym] = {}), ps = []; Object.keys(tg2.sugg).forEach(function (k) { mm[k] = tg2.sugg[k]; ps.push('months/' + UI.ym + '/' + k); }); tg2.sugg = {}; tg2.res.applied = true; ps.push('targets/' + UI.ym); St.touch(ps, 'Apply target days'); Ga.render(); Ga.toast('Target days added to the calendar'); }
    else if (ds.act === 'tgReset') { S.settings.tg = U.clone(R.DEFAULT_TG); var t3 = S.targets[UI.ym], ps3 = ['settings']; if (t3 && t3.target) { var r3 = R.suggest(UI.ym, t3.target); t3.sugg = r3.sugg; t3.res = r3; ps3.push('targets/' + UI.ym); } St.touch(ps3, 'Reset target rules'); UI.rulesOpen = true; Ga.render(); }
    else if (ds.act === 'tgClear') { delete S.targets[UI.ym]; UI.targetOpen = false; St.touch('targets/' + UI.ym, 'Clear target'); Ga.render(); }
    else if (ds.act === 'clearMonth') { if (!UI.clearArm) { UI.clearArm = true; Ga.render(); return; } UI.clearArm = false; var ds2 = Object.keys(S.months[UI.ym] || {}); delete S.months[UI.ym]; St.touch(ds2.map(function (d) { return 'months/' + UI.ym + '/' + d; }), 'Clear ' + UI.ym); Ga.render(); Ga.toast('Month cleared'); }
    else if (ds.act === 'sySave') A.sySave();
    else if (ds.act === 'syPull') { Ga.toast('Pulling…'); Sy.pull().then(function (r) { Ga.toast(r === 'updated' || r === 'merged' ? 'Updated from GitHub' : 'Up to date'); Ga.render(); }, function (e) { Ga.toast(e.message); Ga.render(); }); }
    else if (ds.act === 'syPush') { Sy.push('Manual push').then(function () { Ga.toast('Pushed'); Ga.render(); }, function (e) { Ga.toast(e.message); Ga.render(); }); }
    else if (ds.act === 'histReload') V.wireHistory();
    else if (ds.act === 'exJson') Ga.saveFile('gaji-backup-' + U.nowIso().slice(0, 10) + '.json', St.backupText(), 'application/json');
    else if (ds.act === 'exCsv') Ga.saveFile('gaji-days-' + U.nowIso().slice(0, 10) + '.csv', St.csvText(), 'text/csv');
    else if (ds.act === 'exCopy') { var tx = St.backupText(); try { navigator.clipboard.writeText(tx).then(function () { Ga.toast('Backup copied'); }, function () { showText('Backup', tx); }); } catch (err) { showText('Backup', tx); } }
    else if (ds.act === 'wipe') { if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Tap again to clear this device'; return; } ['gaji-tracker-v2', 'gaji-dirty', 'gaji-sync', 'gaji-sync-sha', 'gaji-tracker-v1'].forEach(St.lsDel); location.reload(); }
  });
  document.getElementById('main').addEventListener('change', function (e) {
    var id = e.target.id, v = e.target.value;
    if (e.target.dataset.tgr || e.target.dataset.tgdow) { V.readTgRules(UI); return; }
    if (id === 'planYm') { UI.planYm = v; Ga.render(); }
    else if (id === 'aheadFill') { UI.aheadFill = v; Ga.render(); }
    else if (id === 'plStart') { UI.plStart = v; Ga.render(); }
    else if (id === 'plN') { var nn = Math.min(48, Math.max(1, Math.round(+v) || 1)); UI.plN = nn; UI.plClearArm = false; Ga.render(); }
    else if (id === 'aheadN') { UI.ahead = Math.min(48, Math.max(1, Math.round(+v) || 1)); Ga.render(); }
    else if (/^p[aAbB](mt|fr|sa|ph)$/.test(id)) { (id[1].toLowerCase() === 'a' ? UI.planA : UI.planB)[id.slice(2)] = v; if (/^p[AB]/.test(id)) UI.cmpOpen = true; else UI.plFillOpen = true; Ga.render(); }
  });

  /* ---- boot ---- */
  St.load(); Sy.init(); applyTheme();
  if (location.hash) { var hh = location.hash.slice(1); if (TABS.some(function (x) { return x[0] === hh; })) UI.tab = hh; }
  Ga.render(); pill(Sy.status);
  if (Sy.ready()) Sy.pull().catch(function () {});
  else if (!St.isSetUp()) setupSheet();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
  G.__gaji = Ga;
})(window);
