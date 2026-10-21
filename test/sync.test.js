/* Merge + sync against a fake GitHub Contents API. Run: node test/sync.test.js */
var assert = require('assert');
var fs = require('fs'), path = require('path'), vm = require('vm');

function makeCtx() {
  var mem = {};
  var ctx = { console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, parseFloat: parseFloat, isFinite: isFinite,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, Error: Error, btoa: btoa, atob: atob, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, escape: escape, unescape: unescape,
    localStorage: { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } },
    navigator: { onLine: true, userAgent: 'test' } };
  ctx.globalThis = ctx; vm.createContext(ctx);
  ['util.js', 'rules.js', 'store.js', 'sync.js'].forEach(function (f) { var p = path.join(__dirname, '..', 'js', f); vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p }); });
  return ctx;
}
/* a tiny GitHub: one repo, files keyed by path, sha = counter */
function fakeGitHub() {
  var files = {}, n = 0, log = [];
  function sha() { return 'sha' + (++n); }
  return {
    files: files, log: log,
    fetch: function (url, opt) {
      var m = url.match(/\/repos\/([^/]+)\/([^/]+)\/contents\/([^?]+)/), method = opt.method;
      log.push(method + ' ' + url.replace('https://api.github.com', ''));
      var res = function (status, body) { return Promise.resolve({ status: status, ok: status < 300, text: function () { return Promise.resolve(JSON.stringify(body)); } }); };
      if (!m) return res(200, { full_name: 'x/y', private: true });
      var p = decodeURIComponent(m[3]);
      if (method === 'GET') { if (!files[p]) return res(404, { message: 'Not Found' }); return res(200, { sha: files[p].sha, content: btoa(unescape(encodeURIComponent(files[p].text))), path: p }); }
      var body = JSON.parse(opt.body);
      if (files[p] && files[p].sha !== body.sha) return res(409, { message: 'sha mismatch' });
      if (!files[p] && body.sha) return res(422, { message: 'no file' });
      files[p] = { sha: sha(), text: decodeURIComponent(escape(atob(body.content))), msg: body.message };
      return res(200, { content: { sha: files[p].sha } });
    }
  };
}
var fails = 0, n = 0;
function t(name, fn) { n++; return Promise.resolve().then(fn).then(function () { console.log('ok   ' + name); }, function (e) { fails++; console.log('FAIL ' + name + '\n     ' + (e.stack || e.message)); }); }

(async function () {
  await t('merge: newest stamp wins per path, deletions carried', function () {
    var c = makeCtx(), St = c.Gaji.St;
    var a = { settings: { basic: 3900 }, months: { '2026-10': { '01': { k: 'W', out: '18:00' }, '02': { k: 'AL' } } }, records: {}, targets: {}, meta: { stamps: { 'months/2026-10/01': '2026-10-21T10:00:00Z', 'months/2026-10/02': '2026-10-21T10:00:00Z' }, updatedAt: '2026-10-21T10:00:00Z' } };
    var b = { settings: { basic: 3900 }, months: { '2026-10': { '01': { k: 'W', out: '19:00' }, '03': { k: 'MC' } } }, records: { '2026-10-1': { payslip: { net: 1 } } }, targets: {}, meta: { stamps: { 'months/2026-10/01': '2026-10-21T11:00:00Z', 'months/2026-10/02': '2026-10-21T12:00:00Z', 'months/2026-10/03': '2026-10-21T09:00:00Z', 'records/2026-10-1': '2026-10-21T09:00:00Z' }, updatedAt: '2026-10-21T12:00:00Z' } };
    var m = St.merge(a, b);
    assert.equal(m.months['2026-10']['01'].out, '19:00', 'remote newer on day 1');
    assert.ok(!m.months['2026-10']['02'], 'day 2 deleted remotely later');
    assert.equal(m.months['2026-10']['03'].k, 'MC'); assert.ok(m.records['2026-10-1']);
    var m2 = St.merge(b, a);
    assert.equal(m2.months['2026-10']['01'].out, '19:00', 'symmetric');
    assert.ok(!m2.months['2026-10']['02']);
  });

  await t('first push creates state.json; second device pulls it', async function () {
    var gh = fakeGitHub();
    var A = makeCtx(); A.Gaji.Sy._setFetch(gh.fetch); A.Gaji.St.load(); A.Gaji.Sy.init();
    A.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' });
    A.Gaji.St.S.settings.basic = 3900; A.Gaji.St.touch('settings', 'Settings');
    A.Gaji.St.S.months['2026-10'] = { '21': { k: 'W', out: '18:30' } }; A.Gaji.St.touchDay('2026-10', 21, 'Calendar');
    assert.equal(await A.Gaji.Sy.pull(), 'created');
    assert.ok(gh.files['state.json']); assert.ok(!A.Gaji.St.dirty());
    var B = makeCtx(); B.Gaji.Sy._setFetch(gh.fetch); B.Gaji.St.load(); B.Gaji.Sy.init();
    B.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' });
    assert.equal(await B.Gaji.Sy.pull(), 'updated');
    assert.equal(B.Gaji.St.S.months['2026-10']['21'].out, '18:30'); assert.equal(B.Gaji.St.S.settings.basic, 3900);
    assert.equal(B.Gaji.Sy.status.state, 'synced');
  });

  await t('conflict: both devices change, push merges instead of overwriting', async function () {
    var gh = fakeGitHub();
    var A = makeCtx(); A.Gaji.Sy._setFetch(gh.fetch); A.Gaji.St.load(); A.Gaji.Sy.init(); A.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' });
    A.Gaji.St.S.settings.basic = 3900; A.Gaji.St.touch('settings'); await A.Gaji.Sy.pull();
    var B = makeCtx(); B.Gaji.Sy._setFetch(gh.fetch); B.Gaji.St.load(); B.Gaji.Sy.init(); B.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' }); await B.Gaji.Sy.pull();
    // A edits day 5, B edits day 6, A pushes first
    A.Gaji.St.S.months['2026-10'] = { '05': { k: 'AL' } }; A.Gaji.St.touchDay('2026-10', 5); assert.equal(await A.Gaji.Sy.push('A'), 'pushed');
    await new Promise(function (r) { setTimeout(r, 5); });
    B.Gaji.St.S.months['2026-10'] = { '06': { k: 'MC' } }; B.Gaji.St.touchDay('2026-10', 6); assert.equal(await B.Gaji.Sy.push('B'), 'pushed');
    var remote = JSON.parse(gh.files['state.json'].text);
    assert.equal(remote.months['2026-10']['05'].k, 'AL'); assert.equal(remote.months['2026-10']['06'].k, 'MC');
    assert.equal(await A.Gaji.Sy.pull(), 'updated'); assert.equal(A.Gaji.St.S.months['2026-10']['06'].k, 'MC');
  });

  await t('import upload goes to imports/<name>', async function () {
    var gh = fakeGitHub(); var A = makeCtx(); A.Gaji.Sy._setFetch(gh.fetch); A.Gaji.St.load(); A.Gaji.Sy.init(); A.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' });
    await A.Gaji.Sy.uploadImport('2026-10-H2_x.json', '{"a":1}', 'Import Oct 2026 H2');
    assert.equal(gh.files['imports/2026-10-H2_x.json'].text, '{"a":1}');
    assert.equal((await A.Gaji.Sy.listImports()).length, 0, 'dir listing not emulated');
  });

  await t('offline: push fails softly and status says offline', async function () {
    var A = makeCtx(); A.navigator.onLine = false; A.Gaji.Sy._setFetch(function () { return Promise.reject(new Error('Failed to fetch')); });
    A.Gaji.St.load(); A.Gaji.Sy.init(); A.Gaji.Sy.saveCfg({ owner: 'o', repo: 'r', token: 't' }); A.Gaji.St.touch('settings');
    await A.Gaji.Sy.push().catch(function () {});
    assert.equal(A.Gaji.Sy.status.state, 'offline'); assert.ok(A.Gaji.St.dirty());
  });

  await t('old gaji-backup v2 restores into v2 state', function () {
    var c = makeCtx(); c.Gaji.St.load();
    var err = c.Gaji.St.restore({ type: 'gaji-backup', version: 2, settings: { basic: 3900, basicBefore: 3000, raiseFrom: '2026-08', alAsOf: '2026-10-19', alLeft: 0 }, months: { '2026-09': { '07': { k: 'UPL' } } }, records: { '2026-07-2': { source: 'history', payslip: { net: 1283.63 } } }, targets: {} });
    assert.equal(err, null); assert.equal(c.Gaji.St.S.settings.basic, 3900); assert.ok(c.Gaji.St.S.months['2026-09']['07']); assert.ok(c.Gaji.St.S.meta.stamps['records/2026-07-2']);
  });

  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})();
