/* More: Rules · Settings · Sync · History · Backup */
(function (G) {
  'use strict';
  var Ga = G.Gaji, U = Ga.U, R = Ga.R, St = Ga.St, Sy = Ga.Sy;
  var fm = U.fm, fh = U.fh, esc = U.esc, MONTHS = U.MONTHS, MON3 = U.MON3, PH = U.PH;
  var V = Ga.V = Ga.V || {}, A = Ga.A = Ga.A || {};
  var SUB = [['rules', 'Rules'], ['settings', 'Settings'], ['sync', 'Sync'], ['history', 'History'], ['backup', 'Backup']];

  V.more = function (UI) {
    var h = '<div class="stack"><div class="subnav" role="tablist">' + SUB.map(function (s) { return '<button role="tab" data-sub="' + s[0] + '" aria-pressed="' + (UI.sub === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    h += UI.sub === 'settings' ? settings(UI) : UI.sub === 'sync' ? sync(UI) : UI.sub === 'history' ? history(UI) : UI.sub === 'backup' ? backup(UI) : rules(UI);
    return h + '</div>';
  };

  function rules(UI) {
    var ym = UI.ym, r = R.rates(ym), st = St.S.settings, p = U.parseYm(ym);
    var rowT = function (t, list) { return list.map(function (o) { var c = R.fromOut(t, o); return '<tr><td>' + o + (c.nr ? ' <span class="chip amber">NR</span>' : '') + (c.early ? ' <span class="chip bad">early</span>' : '') + '</td><td class="r">' + fh(c.paid) + (c.est ? '~' : '') + '</td><td class="r">' + fh(c.ot) + '</td><td class="r">' + fm(c.ot * r.r15) + '</td></tr>'; }).join(''); };
    var tbl = function (title, t, list) { return '<section class="card"><h2 style="margin-bottom:8px">' + title + '</h2><div class="tbl-wrap"><table><thead><tr><th>Clock out</th><th class="r">Paid h</th><th class="r">OT h</th><th class="r">OT RM</th></tr></thead><tbody>' + rowT(t, list) + '</tbody></table></div></section>'; };
    var h = '<section class="card"><div class="card-h"><h2>Rates · ' + MONTHS[p.m - 1] + ' ' + p.y + '</h2></div><dl class="kv">' +
      '<dt>Basic</dt><dd>RM' + fm(r.basic) + ' (RM' + fm(r.basic / 2) + ' each half)</dd><dt>Hourly (' + fm(r.basic) + ' ÷ 26 ÷ 8)</dt><dd>RM' + fm(r.hour) + '</dd><dt>OT 1.5× · weekday & Saturday</dt><dd>RM' + fm(r.r15) + '/h</dd><dt>OT 2× · Sunday & public holiday</dt><dd>RM' + fm(r.r20) + '/h</dd>' +
      '<dt>Public holiday worked</dt><dd>8.00h × 2× = RM' + fm(8 * r.r20) + '</dd><dt>Unpaid leave (÷ days in month)</dt><dd>RM' + fm(r.unpaid) + '/day</dd></dl></section>';
    h += '<div class="grid2">' + tbl('Mon–Thu (end 17:30)', 'MT', ['13:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']) + tbl('Friday (end 17:30)', 'FR', ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']) + tbl('Saturday (end 11:30)', 'SA', ['11:30', '12:30', '13:00', '15:00', '16:30', '17:00', '17:30']) +
      '<section class="card"><h2 style="margin-bottom:8px">How it counts</h2><div class="stack" style="gap:8px;font-size:14px">' +
      '<p>Every scan drops to the previous :00 or :30. 18:29 counts as 18:00.</p><p>Weekday OT = time after 17:30. Saturday OT = time after 11:30, minus a 30-minute break once you stay past 14:00.</p>' +
      '<p>Paid hours = normal hours + OT × 1.5 (Mon–Thu 8.50, Fri 7.50, Sat 3.50). Saturday paid hours are estimates (~).</p>' +
      '<p><b>NR</b> shows on the time card from 19:00. On an hourly-OT basic it is a label only; some pay structures get RM50 per NR day instead.</p>' +
      '<p>Unpaid leave (UPL, or AL with no balance) is charged per calendar day: weekday 1 day, Saturday ½ day, Sunday nothing (Sep 2026 payslip: Sat + Mon + Tue = 2.5 days).</p>' +
      '<p>The 1st half has no deductions. EPF, SOCSO, EIS and SKBBK all come off the 2nd half.</p></div></section></div>';
    h += '<section class="card"><h2 style="margin-bottom:8px">Deductions (monthly, 2nd half)</h2><dl class="kv"><dt>EPF 11%</dt><dd class="small">of (basic − unpaid), rounded up to the RM20 band</dd><dt>SOCSO 0.5%</dt><dd class="small">of the RM100 band midpoint of gross</dd><dt>EIS 0.2%</dt><dd class="small">same band as SOCSO</dd><dt>SKBBK 0.75%</dt><dd class="small">of gross' + (st.skbbk ? '' : ' · off') + '</dd><dt>PCB</dt><dd class="small">not included</dd></dl></section>';
    h += '<section class="card"><h2 style="margin-bottom:8px">Public holidays (statutory, Johor)</h2><div class="tbl-wrap"><table><tbody>' + Object.keys(PH).filter(function (d) { return d.slice(0, 4) === String(p.y); }).map(function (d) { var q = d.split('-'); return '<tr><td>' + (+q[2]) + ' ' + MON3[+q[1] - 1] + ' ' + q[0] + '</td><td>' + PH[d] + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    return h;
  }

  function settings(UI) {
    var st = St.S.settings;
    var h = '<section class="card"><h2 style="margin-bottom:12px">Pay</h2><div class="stack">' +
      '<div class="row"><div class="field"><label for="setBasic">Basic now (RM)</label><input id="setBasic" inputmode="decimal" value="' + st.basic + '"></div><div class="field"><label for="setFrom">Since</label><select id="setFrom">' + Ga.ymOptions(st.raiseFrom) + '</select></div><div class="field"><label for="setBefore">Basic before (RM)</label><input id="setBefore" inputmode="decimal" value="' + st.basicBefore + '"></div></div>' +
      '<div class="row"><div class="field"><label for="setStart">First month to show</label><select id="setStart">' + Ga.ymOptions(st.startYm, true) + '</select></div><div class="field"><label for="setTrack">Daily tracker counts missing days from</label><input id="setTrack" type="date" value="' + esc(Ga.trackFrom()) + '"></div></div>' +
      '<div class="row" style="justify-content:space-between"><div><b>SKBBK 0.75%</b><p class="tiny muted">Charged in Jun and Jul 2026; 0.00 on the Sep 2026 payslip. Turn off if it stays 0.</p></div><div class="seg"><button data-skbbk="1" aria-pressed="' + !!st.skbbk + '">On</button><button data-skbbk="0" aria-pressed="' + !st.skbbk + '">Off</button></div></div>' +
      '<div class="row" style="justify-content:space-between"><div><b>Day base shown in calendar</b><p class="tiny muted">Per day = basic ÷ 26. Per hour = basic ÷ the month’s scheduled hours.</p></div><div class="seg"><button data-base="day" aria-pressed="' + (st.baseMode === 'day') + '">Per day</button><button data-base="hour" aria-pressed="' + (st.baseMode === 'hour') + '">Per hour</button></div></div></div></section>';
    h += '<section class="card"><h2 style="margin-bottom:6px">Annual leave</h2><p class="tiny muted" style="margin-bottom:10px">AL added on or after the balance date uses up the balance. With no balance left, AL counts as an unpaid day. The balance resets to the yearly entitlement on 1 January.</p>' +
      '<div class="row"><div class="field"><label for="setAlLeft">AL left on</label><input id="setAlLeft" inputmode="numeric" value="' + st.alLeft + '"></div><div class="field"><label for="setAlAsOf">Balance date</label><input id="setAlAsOf" type="date" value="' + st.alAsOf + '"></div><div class="field"><label for="setAlQuota">AL per year</label><input id="setAlQuota" inputmode="numeric" value="' + st.alQuota + '"></div></div></section>';
    h += '<section class="card"><h2 style="margin-bottom:6px">Appearance</h2><div class="row" style="justify-content:space-between"><div><b>Theme</b><p class="tiny muted">Per device.</p></div><div class="seg">' + [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (t) { return '<button data-theme="' + t[0] + '" aria-pressed="' + (Ga.theme() === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div></section>';
    return h;
  }
  V.wireSettings = function () {
    var b = document.getElementById('setBasic'); if (!b) return;
    var save = function () { var st = St.S.settings, v = U.num(b.value), w = U.num(document.getElementById('setBefore').value); if (v > 0) st.basic = v; if (w != null && w >= 0) st.basicBefore = w; st.raiseFrom = document.getElementById('setFrom').value; st.startYm = document.getElementById('setStart').value; var tf = document.getElementById('setTrack').value; if (/^\d{4}-\d{2}-\d{2}$/.test(tf)) st.trackFrom = tf; St.touch('settings', 'Settings'); Ga.render(); Ga.toast('Settings saved'); };
    ['setBasic', 'setBefore', 'setFrom', 'setStart', 'setTrack'].forEach(function (id) { document.getElementById(id).onchange = save; });
    var al = function () { var st = St.S.settings, l = U.num(document.getElementById('setAlLeft').value), q = U.num(document.getElementById('setAlQuota').value), a = document.getElementById('setAlAsOf').value; if (l != null && l >= 0) st.alLeft = l; if (q != null && q >= 0) st.alQuota = q; if (/^\d{4}-\d{2}-\d{2}$/.test(a)) st.alAsOf = a; St.touch('settings', 'Annual leave settings'); Ga.render(); Ga.toast('Annual leave updated'); };
    ['setAlLeft', 'setAlQuota', 'setAlAsOf'].forEach(function (id) { document.getElementById(id).onchange = al; });
  };

  function sync(UI) {
    var c = Sy.cfg, s = Sy.status, dirty = St.dirty();
    var h = '<section class="card"><div class="card-h"><h2>Sync with GitHub</h2><span class="chip ' + (s.state === 'synced' ? 'good' : s.state === 'error' ? 'bad' : s.state === 'nosetup' ? '' : 'amber') + '">' + esc(s.msg || s.state) + '</span></div>' +
      '<p class="small muted" style="margin-bottom:12px">Your data lives in a <b>private</b> GitHub repo as <code>state.json</code>. Every change is a commit, so the phone and the laptop always see the same thing and you can go back to any version.</p>' +
      '<div class="stack">' +
      '<div class="row"><div class="field"><label for="syOwner">GitHub username</label><input id="syOwner" autocapitalize="off" autocomplete="off" value="' + esc(c.owner) + '" placeholder="username"></div><div class="field"><label for="syRepo">Private repo</label><input id="syRepo" autocapitalize="off" autocomplete="off" value="' + esc(c.repo) + '" placeholder="gaji-data"></div></div>' +
      '<div class="field"><label for="syToken">Fine-grained token (Contents: read and write, only this repo)</label><input id="syToken" type="password" autocomplete="off" value="' + esc(c.token) + '" placeholder="github_pat_…"></div>' +
      '<div class="row"><button class="btn primary" data-act="sySave">Save & test</button><button class="btn" data-act="syPull"' + (Sy.ready() ? '' : ' disabled') + '>Pull now</button><button class="btn" data-act="syPush"' + (Sy.ready() && dirty ? '' : ' disabled') + '>Push changes</button></div>' +
      (s.error ? '<div class="note warn">' + esc(s.error) + '</div>' : '') +
      '<div class="note"><b>How to make the token</b><br>GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token.<br>Repository access: <b>Only select repositories</b> → your private data repo.<br>Permissions → Repository permissions → <b>Contents: Read and write</b>. Expiry: up to 1 year.<br>Paste it here on each device. It is stored only in this browser.</div>' +
      '<p class="tiny muted">Last sync: ' + (s.at ? U.fmtDate(s.at) : '—') + ' · this device: ' + Sy.deviceName() + (Sy.sha() ? ' · file ' + Sy.sha().slice(0, 7) : '') + '</p>' +
      '</div></section>';
    return h;
  }
  A.sySave = function () {
    var o = document.getElementById('syOwner').value.trim(), r = document.getElementById('syRepo').value.trim(), t = document.getElementById('syToken').value.trim();
    Sy.saveCfg({ owner: o, repo: r, token: t });
    if (!Sy.ready()) { Ga.render(); Ga.toast('Fill in all three fields'); return; }
    Ga.toast('Testing…');
    Sy.test().then(function (x) { if (!x.priv) Ga.toast('Connected, but ' + x.name + ' is PUBLIC. Make it private.'); else Ga.toast('Connected to ' + x.name); return Sy.pull(); }).then(function () { Ga.render(); }, function (e) { Ga.render(); Ga.toast('Could not connect: ' + e.message); });
  };

  function history(UI) {
    if (!Sy.ready()) return '<section class="card"><h2>Versions</h2><p class="small muted" style="margin-top:6px">Set up sync first. Every save becomes a version you can restore.</p></section>';
    return '<section class="card"><div class="card-h"><h2>Versions</h2><button class="btn ghost sm" data-act="histReload">Reload</button></div><div id="histList"><p class="small muted">Loading…</p></div><p class="tiny muted" style="margin-top:8px">Restoring makes a new version with the old content; nothing is lost.</p></section>';
  }
  V.wireHistory = function () {
    var el = document.getElementById('histList'); if (!el) return;
    Sy.versions().then(function (list) {
      if (!list.length) { el.innerHTML = '<p class="small muted">No versions yet.</p>'; return; }
      el.innerHTML = '<div class="list">' + list.map(function (v, i) { return '<div class="item"><div><b>' + esc(v.msg) + '</b><span>' + U.fmtDate(v.at) + ' · ' + v.short + '</span></div>' + (i === 0 ? '<span class="chip good">Current</span>' : '<button class="btn sm" data-restore="' + v.sha + '">Restore</button>') + '</div>'; }).join('') + '</div>';
    }, function (e) { el.innerHTML = '<p class="small muted">Could not load: ' + esc(e.message) + '</p>'; });
  };
  A.restoreVersion = function (sha, btn) {
    if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Tap again to restore'; return; }
    Ga.toast('Restoring…');
    Sy.restoreVersion(sha).then(function () { Ga.toast('Restored ' + sha.slice(0, 7)); Ga.render(); }, function (e) { Ga.toast('Restore failed: ' + e.message); });
  };

  function backup(UI) {
    return '<section class="card"><h2 style="margin-bottom:6px">Backup</h2><p class="small muted" style="margin-bottom:12px">Sync already keeps everything in GitHub. A backup file is still handy for Excel or for moving data from the old single-file app.</p>' +
      '<div class="stack"><button class="btn primary block" data-act="exJson">Backup · all data (.json)</button><button class="btn block" data-act="exCsv">Days + payslips for Excel (.csv)</button><button class="btn ghost block" data-act="exCopy">Copy backup as text</button>' +
      '<label class="btn block" for="bkIn">Restore a backup file (old app files work)</label><input type="file" id="bkIn" accept=".json,application/json" hidden>' +
      '<p class="tiny muted">On Android the share sheet opens so you can send the file to yourself on WhatsApp or Telegram.</p></div></section>' +
      '<section class="card"><h2 style="margin-bottom:6px">This device</h2><p class="small muted">Data cached in this browser: ' + Object.keys(St.S.months).length + ' months, ' + Object.keys(St.S.records).length + ' payslips' + (St.dirty() ? ' · unsynced changes' : '') + '.</p>' +
      '<div class="row" style="margin-top:10px"><button class="btn danger" data-act="wipe">Clear this device</button></div><p class="tiny muted" style="margin-top:6px">Removes the local copy and the token on this device only. Your GitHub repo is not touched.</p></section>';
  }
  V.wireBackup = function () { var bk = document.getElementById('bkIn'); if (bk) bk.onchange = function () { if (bk.files[0]) Ga.readFile(bk.files[0]); bk.value = ''; }; };
})(window);
