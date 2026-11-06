/* Import: AI prompt builder, JSON loader, preview + tally, save (calendar + payslip + raw copy in the repo), past imports. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St, Sy = Ga.Sy;
  var fm = U.fm, fh = U.fh, pad = U.pad, esc = U.esc, MONTHS = U.MONTHS, MON3 = U.MON3;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};
  var IC = function () { return Ga.IC; };

  V.buildPrompt = function (ym, half) {
    var p = U.parseYm(ym), n = U.daysIn(p.y, p.m), from = half === 1 ? 1 : 16, to = half === 1 ? 15 : n, iso = U.iso;
    return 'You are reading a WORKING HOURS TIMESHEET (time card) from my employer and, if attached, the salary slip for the same period.\n' +
      'Period: ' + MONTHS[p.m - 1] + ' ' + p.y + ', ' + U.halfLabel(half) + ' (' + from + '–' + to + ' ' + MONTHS[p.m - 1] + ').\n\n' +
      'Your only job is to copy what is printed into JSON. Do not calculate, round, guess or correct anything.\n\n' +
      'RULES\n' +
      '1. Add one entry to "days" for every date from ' + iso(p.y, p.m, from) + ' to ' + iso(p.y, p.m, to) + ', in date order, including Sundays and rows with no swipe. Ignore rows outside this period.\n' +
      '2. Times are 24-hour "HH:MM" exactly as printed. A dash or empty cell is null.\n' +
      '3. "paid_hours" is the PAID HOUR column as a number (e.g. 10.75). "adjust_hours" is the ADD/DEDUCT HOUR column.\n' +
      '4. "remark" is the REMARKS text copied exactly (e.g. "NR 18.30-19.00", "MC", "CUTI"), or null.\n' +
      '5. "status" must be one of:\n' +
      '   "work"   – the row has a swipe-out time\n' +
      '   "AL"     – annual leave (CUTI, CUTI TAHUNAN, AL)\n' +
      '   "MC"     – sick leave (MC)\n' +
      '   "PH"     – public holiday, not worked\n' +
      '   "OFF"    – Sunday or rest day with no swipe\n' +
      '   "ABSENT" – a Monday–Saturday with no swipe and no remark\n' +
      '   "LEAVE_OTHER" – any other leave remark (e.g. CUTI KEMATIAN)\n' +
      '   "UNCLEAR" – you cannot read the row; say why in "notes"\n' +
      '   If a row has a swipe-out AND a leave remark, use "work" and keep the remark.\n' +
      '6. If a salary slip for this period is attached, fill "payslip" with the numbers printed on it, else set "payslip": null.\n' +
      '   Overtime lines are printed as RATE x HOURS : AMOUNT. "ot15" is the overtime line with the lower rate, "ot20" the higher rate. Put the HOURS figure in *_hours, never the rate.\n' +
      '   "unpaid_days" is the number of days on the Unpaid Leave line, "unpaid_amount" its RM amount.\n' +
      '   Use null for any line that is not printed. Copy amounts exactly, without "RM".\n' +
      '7. Put anything you were unsure about in "notes" as short strings.\n\n' +
      'OUTPUT\n' +
      'Create a downloadable file named timecard-' + ym + '-H' + half + '.json that contains only the JSON. If you cannot create files, reply with one ```json code block and nothing else.\n\n' +
      '{\n' +
      '  "type": "akef-timecard",\n' +
      '  "version": 1,\n' +
      '  "year": ' + p.y + ',\n' +
      '  "month": ' + p.m + ',\n' +
      '  "half": ' + half + ',\n' +
      '  "name": "NAME AS PRINTED",\n' +
      '  "employee_id": "AS PRINTED or null",\n' +
      '  "days": [\n' +
      '    {"date": "' + iso(p.y, p.m, from) + '", "day": "Monday", "in": "07:41", "out": "18:32", "paid_hours": 10.00, "adjust_hours": 0.00, "remark": null, "status": "work"}\n' +
      '  ],\n' +
      '  "payslip": {\n' +
      '    "basic": 1950.00,\n' +
      '    "ot15_rate": 28.13, "ot15_hours": 5.50, "ot15_amount": 154.72,\n' +
      '    "ot20_rate": 37.50, "ot20_hours": 0.00, "ot20_amount": 0.00,\n' +
      '    "allowance": 0.00,\n' +
      '    "unpaid_days": 0.00, "unpaid_amount": 0.00,\n' +
      '    "total_earnings": 0.00,\n' +
      '    "epf": 0.00, "socso": 0.00, "eis": 0.00, "skbbk": 0.00, "pcb": 0.00,\n' +
      '    "advance": 0.00, "other_deductions": 0.00,\n' +
      '    "total_deductions": 0.00,\n' +
      '    "net": 0.00\n' +
      '  },\n' +
      '  "notes": []\n' +
      '}\n\n' +
      'The values above are only an example of the format. Replace every value with what is printed on my documents.';
  };

  V.imp = function (UI) {
    var h = '<div class="stack"><div class="grid2"><section class="card"><div class="card-h"><h2>1 · Get the JSON from any AI chat</h2></div><div class="steps">' +
      '<div class="step"><p>Pick the period, then copy the prompt.</p></div>' +
      '<div class="step"><p>Open a new AI chat. Paste the prompt and attach a photo of the <b>time card</b>. Attach the <b>payslip</b> too if you have it.</p></div>' +
      '<div class="step"><p>Download the <b>.json</b> file it gives you, then load it here.</p></div></div>' +
      '<div class="row" style="margin-top:14px"><div class="field"><label for="pYm">Month</label><select id="pYm">' + Ga.ymOptions(UI.promptYm) + '</select></div>' +
      '<div class="field" style="flex:0 0 auto"><label>Half</label><div class="seg"><button data-ph="1" aria-pressed="' + (UI.promptHalf === 1) + '">1–15</button><button data-ph="2" aria-pressed="' + (UI.promptHalf === 2) + '">16–end</button></div></div></div>' +
      '<pre class="prompt-box" id="promptTxt" tabindex="0" style="margin-top:12px">' + esc(V.buildPrompt(UI.promptYm, UI.promptHalf)) + '</pre>' +
      '<button class="btn primary block" id="copyPrompt" style="margin-top:10px">' + IC().copy + 'Copy prompt</button></section>';
    h += '<section class="card"><div class="card-h"><h2>2 · Load the file</h2></div>' +
      '<label class="drop" id="drop" for="fileIn">' + IC().file.replace('<svg', '<svg style="width:28px;height:28px;color:var(--accent)"') + '<b>Choose the .json file</b><span class="small muted">or drop it here. Backup files work too.</span></label>' +
      '<input type="file" id="fileIn" accept=".json,application/json,text/plain" hidden>' +
      '<details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:600">The AI only gave text? Paste it instead</summary>' +
      '<div class="field" style="margin-top:8px"><label for="pasteIn">JSON text</label><textarea id="pasteIn" rows="5" placeholder="{ &quot;type&quot;: &quot;akef-timecard&quot;, ... }"></textarea></div>' +
      '<button class="btn" id="pasteGo" style="margin-top:8px">Read pasted text</button></details>' +
      '<div id="pastImports" style="margin-top:16px"><h3 style="margin-bottom:6px">Past imports</h3>' + (Sy.ready() ? '<p class="small muted">Loading from GitHub…</p>' : '<p class="small muted">Set up sync in More → Sync to keep a copy of every import in your repo.</p>') + '</div></section></div>';
    h += '<div id="preview">' + (UI.pending ? V.preview(UI.pending) : '') + '</div></div>';
    return h;
  };
  V.wireImport = function (UI) {
    var ps = document.getElementById('pYm'); ps.onchange = function () { UI.promptYm = ps.value; Ga.render(); };
    document.getElementById('copyPrompt').onclick = function () {
      var t = V.buildPrompt(UI.promptYm, UI.promptHalf);
      var done = function () { Ga.toast('Prompt copied'); }, fail = function () { var el = document.getElementById('promptTxt'), rg = document.createRange(); rg.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(rg); Ga.toast('Copy blocked here. Text is selected, copy it manually.'); };
      try { navigator.clipboard.writeText(t).then(done, fail); } catch (e) { fail(); }
    };
    var fi = document.getElementById('fileIn'); fi.onchange = function () { if (fi.files[0]) Ga.readFile(fi.files[0]); fi.value = ''; };
    var dr = document.getElementById('drop');
    dr.addEventListener('dragover', function (e) { e.preventDefault(); dr.classList.add('over'); });
    dr.addEventListener('dragleave', function () { dr.classList.remove('over'); });
    dr.addEventListener('drop', function (e) { e.preventDefault(); dr.classList.remove('over'); if (e.dataTransfer.files[0]) Ga.readFile(e.dataTransfer.files[0]); });
    document.getElementById('pasteGo').onclick = function () { A.handleText(UI, document.getElementById('pasteIn').value); };
    if (Sy.ready()) {
      Sy.listImports().then(function (list) {
        var el = document.getElementById('pastImports'); if (!el) return;
        if (!list.length) { el.innerHTML = '<h3 style="margin-bottom:6px">Past imports</h3><p class="small muted">None yet. Every file you save here is kept in <code>imports/</code> in your repo.</p>'; return; }
        el.innerHTML = '<h3 style="margin-bottom:6px">Past imports</h3><div class="list">' + list.slice(0, 12).map(function (f) { var m = f.name.match(/^(\d{4})-(\d{2})-H(\d)_(\d{8})-(\d{4})/); var lab = m ? U.periodName(m[1] + '-' + m[2], +m[3]) : f.name; var when = m ? m[4].slice(6, 8) + ' ' + MON3[+m[4].slice(4, 6) - 1] + ' ' + m[4].slice(0, 4) + ', ' + m[5].slice(0, 2) + ':' + m[5].slice(2) : ''; return '<button class="item" data-imp="' + esc(f.path) + '"><div><b>' + esc(lab) + '</b><span>' + esc(when) + ' · ' + Math.round(f.size / 1024 * 10) / 10 + ' KB</span></div><span class="chip">Open</span></button>'; }).join('') + '</div>';
      }, function (e) { var el = document.getElementById('pastImports'); if (el) el.innerHTML = '<h3 style="margin-bottom:6px">Past imports</h3><p class="small muted">Could not load: ' + esc(e.message) + '</p>'; });
    }
  };
  A.openPastImport = function (UI, path) {
    Ga.toast('Loading…');
    Sy.getFile(path).then(function (f) { A.handleText(UI, f.text, path); }, function (e) { Ga.toast('Could not load: ' + e.message); });
  };
  A.handleText = function (UI, txt, fromPath) {
    var t = (txt || '').trim(), m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) t = m[1].trim();
    var a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) { Ga.toast('No JSON found. Paste the whole reply from the AI.'); return; }
    var obj; try { obj = JSON.parse(t.slice(a, b + 1)); } catch (e) { Ga.toast('The JSON is broken: ' + e.message.slice(0, 60)); return; }
    if (obj.type === 'gaji-backup' || obj.type === 'gaji-state') { var err = St.restore(obj); Ga.toast(err || 'Backup restored'); if (!err) Ga.go('home'); return; }
    var res = R.normalize(obj);
    if (res.error) { Ga.toast(res.error); return; }
    res.raw = JSON.stringify(obj, null, 1); res.fromPath = fromPath || null;
    UI.pending = res; UI.tab = 'imp'; Ga.render();
    setTimeout(function () { var el = document.getElementById('preview'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  };

  V.preview = function (P) {
    var days = R.mergedDays(P), H = R.halves(P.ym, days), M = R.money(P.ym, H), hf = P.half, ps = P.payslip;
    var from = hf === 1 ? 1 : 16, to = hf === 1 ? 15 : P.n, p = U.parseYm(P.ym);
    var h = '<section class="card"><div class="card-h"><div><div class="eyebrow">Preview' + (P.fromPath ? ' · from repo' : '') + '</div><h2>' + U.periodName(P.ym, hf) + '</h2>' + (P.name ? '<span class="small muted">' + esc(P.name) + '</span>' : '') + '</div><span class="chip accent">' + Object.keys(P.days).length + ' days read</span></div>';
    if (P.warn.length) h += '<div class="note" style="margin-bottom:12px">' + P.warn.map(esc).join('<br>') + '</div>';
    h += '<p class="tiny muted" style="margin-bottom:6px">Check each row against the paper. Fix anything the AI misread here before you save; the tally below updates as you edit.</p>';
    h += '<div class="tbl-wrap"><table class="edit"><thead><tr><th>Date</th><th>Day</th><th>In</th><th>Out</th><th class="r">Paid</th><th class="r">OT</th><th>Remark</th></tr></thead><tbody>';
    var TYPES = [['', '— none'], ['W', 'Worked'], ['AL', 'AL'], ['MC', 'MC'], ['OFF', 'OFF'], ['CL', 'Other leave'], ['UPH', 'Unpaid ½'], ['UPL', 'Unpaid full'], ['X2', 'Worked 2×']];
    for (var d = from; d <= to; d++) {
      var e = days[pad(d)], c = R.dayCalc(P.ym, d, e), t = U.dayType(p.y, p.m, d), k = e ? (e.k === 'W' ? 'W' : e.k) : '', dd = pad(d);
      h += '<tr' + (t === 'SU' ? ' class="sub"' : '') + (e && e.edited ? ' style="background:var(--amber-soft)"' : '') + '><td>' + d + ' ' + U.DOW3[new Date(p.y, p.m - 1, d).getDay()] + (c.ph ? ' ' + IC().flag : '') + '</td>' +
        '<td><select data-pd="' + dd + '" data-pf="k" aria-label="Day type">' + TYPES.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === k ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td>' +
        '<td><input type="time" data-pd="' + dd + '" data-pf="in" value="' + esc(e && e['in'] || '') + '"' + (k === 'W' ? '' : ' disabled') + ' aria-label="Clock in"></td>' +
        '<td><input type="time" data-pd="' + dd + '" data-pf="out" value="' + esc(e && e.out || '') + '"' + (k === 'W' ? '' : ' disabled') + ' aria-label="Clock out"></td>' +
        '<td class="r">' + (c.paid != null ? fh(c.paid) + (e && e.paid == null && k === 'W' ? '~' : '') : '—') + '</td><td class="r">' + (c.ot ? fh(c.ot) : c.ot2 ? fh(c.ot2) + '×2' : '') + '</td>' +
        '<td><input type="text" data-pd="' + dd + '" data-pf="remark" value="' + esc(e && e.remark || '') + '" placeholder="' + (c.nr && !(e && e.remark) ? 'NR' : '') + '" aria-label="Remark" style="min-width:90px"></td></tr>';
    }
    h += '</tbody></table></div><p class="tiny muted" style="margin-top:4px">Paid hours marked ~ are recomputed for rows you changed.</p>';
    var o = hf === 1 ? M.o1 : M.o2, x = hf === 1 ? M.x1 : M.x2, u = hf === 1 ? M.u1 : M.u2, earn = hf === 1 ? M.earn1 : M.earn2, net = hf === 1 ? M.half1 : M.half2, hh = H[hf];
    var lines = [['OT 1.5× hours', hh.ot, ps && ps.ot15_hours, 1], ['OT 1.5× pay', o, ps && ps.ot15_amount], ['OT 2× hours', hh.ot2, ps && ps.ot20_hours, 1], ['OT 2× pay', x, ps && ps.ot20_amount], ['Unpaid days', hh.up, ps && ps.unpaid_days, 1], ['Unpaid amount', u, ps && ps.unpaid_amount], ['Total earnings', earn, ps && ps.total_earnings]];
    if (hf === 2) lines.push(['EPF', M.epf, ps && ps.epf], ['SOCSO', M.socso, ps && ps.socso], ['EIS', M.eis, ps && ps.eis], ['SKBBK', M.skbbk, ps && ps.skbbk]);
    lines.push(['Net pay', net, ps && ps.net]);
    h += '<h3 style="margin:16px 0 6px">Calculator vs payslip</h3>';
    if (!ps) h += '<p class="small muted">No payslip in this file. Only the calculator figures are shown.</p>';
    h += '<div class="tbl-wrap"><table class="match"><thead><tr><th></th><th class="r">Calculator</th>' + (ps ? '<th class="r">Payslip</th><th>Match</th>' : '') + '</tr></thead><tbody>';
    var bad = 0;
    lines.forEach(function (L) {
      var a = L[1], b = L[2], f = L[3] ? fh : fm, ok = b == null ? null : Math.abs(a - b) < (L[3] ? 0.01 : 0.06); if (ok === false) bad++;
      h += '<tr' + (L[0] === 'Net pay' ? ' class="total"' : '') + '><td>' + L[0] + '</td><td class="r">' + f(a) + '</td>' + (ps ? '<td class="r">' + (b == null ? '—' : f(b)) + '</td><td>' + (ok == null ? '' : ok ? '<span class="ok-ic">✓</span>' : '<span class="bad-ic">' + (b - a > 0 ? '+' : '−') + f(Math.abs(b - a)) + '</span>') + '</td>' : '') + '</tr>';
    });
    h += '</tbody></table></div>';
    if (ps && (ps.pcb || ps.advance || ps.other_deductions)) h += '<p class="small muted" style="margin-top:6px">The payslip also deducts PCB ' + fm(ps.pcb || 0) + ', advance ' + fm(ps.advance || 0) + ', other ' + fm(ps.other_deductions || 0) + '. The calculator does not include these.</p>';
    if (ps && bad) h += '<div class="note" style="margin-top:10px">' + bad + ' line' + (bad > 1 ? 's' : '') + ' differ. ' + (hf === 2 ? '2nd-half deductions use the whole month, so a wrong or missing 1st half also changes them. ' : '') + 'Check the day rows above, then fix any day in the calendar after saving.</div>';
    h += '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="impSave" style="flex:1">Save to calendar' + (ps ? ' + payslip' : '') + '</button><button class="btn" data-act="impCancel">Discard</button></div>';
    h += '<p class="tiny muted" style="margin-top:8px">' + (Sy.ready() ? 'Saving also keeps this file in your GitHub repo under imports/.' : 'Set up sync to keep a copy of each import in your repo.') + '</p></section>';
    return h;
  };
  /* Edit one preview row before saving. */
  A.editPending = function (UI, dd, field, value) {
    var P = UI.pending; if (!P) return;
    var e = P.days[dd], p = U.parseYm(P.ym), t = U.dayType(p.y, p.m, +dd);
    if (field === 'k') {
      if (value === '') { delete P.days[dd]; Ga.render(); return; }
      e = P.days[dd] = Object.assign({ real: 1, 'in': null, out: null, remark: null }, e || {}, { k: value, edited: 1 });
      if (value === 'W' && !e.out) e.out = t === 'SA' ? '13:00' : '18:00';
      delete e.paid;
    } else if (field === 'in' || field === 'out') {
      if (!e) return; e[field] = value || null; e.edited = 1; delete e.paid;
    } else if (field === 'remark') {
      if (!e) return; e.remark = value || null; e.edited = 1;
    }
    Ga.render();
  };
  A.commitImport = function (UI) {
    var P = UI.pending; if (!P) return;
    var S = St.S, paths = [];
    S.months[P.ym] = R.mergedDays(P);
    var from = P.half === 1 ? 1 : 16, to = P.half === 1 ? 15 : P.n; for (var d = from; d <= to; d++) paths.push('months/' + P.ym + '/' + pad(d));
    var key = P.ym + '-' + P.half;
    if (P.payslip || !S.records[key]) { S.records[key] = { source: 'import', payslip: P.payslip || {}, name: P.name, importedAt: U.nowIso() }; paths.push('records/' + key); }
    var label = 'Import ' + U.periodName(P.ym, P.half).replace(' · ', ' ');
    St.touch(paths, label);
    if (Sy.ready() && !P.fromPath) {
      var dt = new Date(), stamp = dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()) + '-' + pad(dt.getHours()) + pad(dt.getMinutes());
      Sy.uploadImport(P.ym + '-H' + P.half + '_' + stamp + '.json', P.raw, label + ' (raw file)').then(function () { Ga.toast('Copy kept in GitHub'); }, function (e) { Ga.toast('Saved locally; could not upload the raw file: ' + e.message); });
    }
    UI.pending = null; UI.ym = P.ym; Ga.toast('Saved ' + U.periodName(P.ym, P.half)); Ga.go('cal');
  };
})(window);
