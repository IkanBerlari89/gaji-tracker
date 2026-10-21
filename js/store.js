/* Gaji Tracker v2 — state, local cache, stamps and merge. No DOM except localStorage. */
(function (G) {
  'use strict';
  var U = G.Gaji.U, R = G.Gaji.R;
  var LS = 'gaji-tracker-v2', LS_V1 = 'gaji-tracker-v1', LS_DIRTY = 'gaji-dirty';
  var St = {};

  St.DEFAULTS = { basic: 0, basicBefore: 0, raiseFrom: '2026-01', skbbk: true, baseMode: 'day', alQuota: 8, alAsOf: '2026-01-01', alLeft: 0, startYm: '2026-01', trackFrom: '', tg: U.clone(R.DEFAULT_TG) };

  var S = { settings: U.clone(St.DEFAULTS), months: {}, records: {}, targets: {}, meta: { stamps: {}, updatedAt: null } };
  St.S = S;
  var listeners = [];
  St.on = function (fn) { listeners.push(fn); };
  function emit(ev, arg) { listeners.forEach(function (f) { try { f(ev, arg); } catch (e) { console.error(e); } }); }

  St.lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  St.lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  St.lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) {} };

  /* ---- shape ---- */
  function fix(s) {
    s.settings = Object.assign({}, St.DEFAULTS, s.settings || {});
    s.settings.tg = Object.assign({}, R.DEFAULT_TG, s.settings.tg || {});
    s.months = s.months || {}; s.records = s.records || {}; s.targets = s.targets || {};
    s.meta = s.meta || {}; s.meta.stamps = s.meta.stamps || {}; s.meta.updatedAt = s.meta.updatedAt || null;
    return s;
  }
  function assign(src) { S.settings = src.settings; S.months = src.months; S.records = src.records; S.targets = src.targets; S.meta = src.meta; if (R.state() !== S) R.bind(S); else R.computeAL(); }
  St.snapshot = function () { return { type: 'gaji-state', version: 2, settings: S.settings, months: S.months, records: S.records, targets: S.targets, meta: S.meta }; };
  St.text = function () { return JSON.stringify(St.snapshot(), null, 1); };
  St.isSetUp = function () { return +S.settings.basic > 0; };

  /* ---- paths ---- */
  // 'settings' | 'months/2026-10/21' | 'records/2026-10-2' | 'targets/2026-11'
  St.get = function (s, path) {
    var p = path.split('/');
    if (p[0] === 'settings') return s.settings;
    if (p[0] === 'months') return s.months[p[1]] ? s.months[p[1]][p[2]] : undefined;
    return s[p[0]][p[1]];
  };
  St.set = function (s, path, v) {
    var p = path.split('/');
    if (p[0] === 'settings') { s.settings = v; return; }
    if (p[0] === 'months') {
      if (v === undefined) { if (s.months[p[1]]) { delete s.months[p[1]][p[2]]; if (!Object.keys(s.months[p[1]]).length) delete s.months[p[1]]; } }
      else { (s.months[p[1]] = s.months[p[1]] || {})[p[2]] = v; }
      return;
    }
    if (v === undefined) delete s[p[0]][p[1]]; else s[p[0]][p[1]] = v;
  };
  St.allPaths = function (s) {
    var out = ['settings'];
    Object.keys(s.months).forEach(function (ym) { Object.keys(s.months[ym]).forEach(function (d) { out.push('months/' + ym + '/' + d); }); });
    Object.keys(s.records).forEach(function (k) { out.push('records/' + k); });
    Object.keys(s.targets).forEach(function (k) { out.push('targets/' + k); });
    Object.keys(s.meta.stamps || {}).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  };

  /* ---- persistence ---- */
  var saveT;
  St.persist = function () { St.lsSet(LS, JSON.stringify(St.snapshot())); };
  St.dirty = function () { return St.lsGet(LS_DIRTY) === '1'; };
  St.setDirty = function (on) { if (on) St.lsSet(LS_DIRTY, '1'); else St.lsDel(LS_DIRTY); };

  /* Record a change at one or more paths, save locally and tell listeners (sync schedules a push). */
  St.touch = function (paths, msg) {
    var now = U.nowIso();
    (Array.isArray(paths) ? paths : [paths]).forEach(function (p) { S.meta.stamps[p] = now; });
    S.meta.updatedAt = now;
    Object.keys(S.months).forEach(function (ym) { if (!Object.keys(S.months[ym]).length) delete S.months[ym]; });
    R.computeAL();
    St.persist(); St.setDirty(true);
    clearTimeout(saveT); saveT = setTimeout(function () { emit('change', msg || 'Update'); }, 50);
  };
  St.touchDay = function (ym, d, msg) { St.touch('months/' + ym + '/' + U.pad(+d), msg); };
  St.touchMonth = function (ym, msg) { var ds = Object.keys(S.months[ym] || {}); St.touch(ds.length ? ds.map(function (d) { return 'months/' + ym + '/' + d; }) : ['months/' + ym + '/00'], msg); };

  /* ---- merge: newest stamp wins per path; paths without stamps on either side keep the remote value ---- */
  St.merge = function (local, remote) {
    local = fix(U.clone(local)); remote = fix(U.clone(remote));
    var out = fix({ settings: remote.settings, months: remote.months, records: remote.records, targets: remote.targets, meta: { stamps: Object.assign({}, remote.meta.stamps), updatedAt: null } });
    var paths = {};
    St.allPaths(local).concat(St.allPaths(remote)).forEach(function (p) { paths[p] = 1; });
    Object.keys(paths).forEach(function (p) {
      var ls = local.meta.stamps[p] || '', rs = remote.meta.stamps[p] || '';
      if (ls > rs) { St.set(out, p, St.get(local, p)); out.meta.stamps[p] = ls; }
      else if (!rs && !ls && St.get(remote, p) === undefined && St.get(local, p) !== undefined) { St.set(out, p, St.get(local, p)); }
    });
    var a = local.meta.updatedAt || '', b = remote.meta.updatedAt || '';
    out.meta.updatedAt = a > b ? a : b;
    return out;
  };
  St.replaceWith = function (remote) { assign(fix(U.clone(remote))); St.persist(); emit('replace'); };
  St.mergeIn = function (remote) { var m = St.merge(St.snapshot(), remote); assign(m); St.persist(); emit('replace'); return m; };

  /* ---- backups (old gaji-backup v2 files from gaji-tracker.html are accepted as-is) ---- */
  St.backupText = function () { return JSON.stringify({ type: 'gaji-backup', version: 3, exportedAt: U.nowIso(), settings: S.settings, months: S.months, records: S.records, targets: S.targets, meta: S.meta }, null, 1); };
  St.restore = function (o) {
    if (!o || (!o.months && !o.records && !o.settings)) return 'That backup is empty.';
    var paths = [];
    Object.keys(o.months || {}).forEach(function (ym) { S.months[ym] = o.months[ym]; Object.keys(o.months[ym]).forEach(function (d) { paths.push('months/' + ym + '/' + d); }); });
    Object.keys(o.records || {}).forEach(function (k) { S.records[k] = o.records[k]; paths.push('records/' + k); });
    if (o.settings) { var keep = { basic: S.settings.basic, basicBefore: S.settings.basicBefore, raiseFrom: S.settings.raiseFrom }; S.settings = Object.assign({}, St.DEFAULTS, o.settings); if (!(+o.settings.basic > 0)) Object.assign(S.settings, keep); S.settings.tg = Object.assign({}, R.DEFAULT_TG, S.settings.tg || {}); paths.push('settings'); }
    if (o.targets) { Object.keys(o.targets).forEach(function (k) { S.targets[k] = o.targets[k]; paths.push('targets/' + k); }); }
    St.touch(paths, 'Restore backup');
    return null;
  };

  St.csvText = function () {
    var fh = U.fh, LEAVES = U.LEAVES;
    var rows = [['date', 'day', 'type', 'clock_in', 'clock_out', 'paid_hours', 'ot_1_5x_hours', 'ot_2x_hours', 'plus_minus_hours', 'unpaid_days', 'day_total_rm', 'remark', 'from_time_card']];
    Object.keys(S.months).sort().forEach(function (ym) {
      var p = U.parseYm(ym), m = S.months[ym];
      for (var d = 1; d <= U.daysIn(p.y, p.m); d++) {
        var e = m[U.pad(d)]; if (!e) continue; var c = R.dayCalc(ym, d, e);
        rows.push([U.iso(p.y, p.m, d), U.DOW3[new Date(p.y, p.m - 1, d).getDay()], c.over ? 'AL (no balance)' : e.k === 'W' ? 'Work' : LEAVES[e.k] || e.k, e['in'] || '', e.out || '', c.paid != null ? fh(c.paid) : '', fh(c.ot), fh(c.ot2), c.dh != null ? fh(c.dh) : '', c.up, fh(c.total), e.remark || '', e.real ? 'yes' : '']);
      }
    });
    var rr = [['period', 'source', 'net', 'ot_1_5x_hours', 'calculator_estimate']];
    Object.keys(S.records).sort().forEach(function (k) { var r = S.records[k], ps = r.payslip || {}; rr.push([k, r.source || '', ps.net != null ? ps.net : '', ps.ot15_hours != null ? ps.ot15_hours : '', fh(R.recEstimate(k))]); });
    var q = function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return rows.map(function (r) { return r.map(q).join(','); }).join('\n') + '\n\n' + rr.map(function (r) { return r.map(q).join(','); }).join('\n') + '\n';
  };

  /* ---- boot ---- */
  St.load = function () {
    var raw = St.lsGet(LS), c = null;
    try { c = JSON.parse(raw || 'null'); } catch (e) {}
    if (!c) {
      try { var v1 = JSON.parse(St.lsGet(LS_V1) || 'null'); if (v1 && (v1.months || v1.records)) { c = { settings: v1.settings, months: v1.months, records: v1.records, targets: v1.targets, meta: { stamps: {}, updatedAt: U.nowIso() } }; St.setDirty(true); } } catch (e) {}
    }
    assign(fix(c || { settings: U.clone(St.DEFAULTS), months: {}, records: {}, targets: {}, meta: { stamps: {}, updatedAt: null } }));
    return S;
  };

  G.Gaji.St = St;
})(typeof window !== 'undefined' ? window : globalThis);
