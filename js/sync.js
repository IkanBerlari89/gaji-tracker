/* Gaji Tracker v2 — sync with a private GitHub repo through the Contents API.
   state.json holds the app state; imports/ holds every raw time-card JSON that was saved. */
(function (G) {
  'use strict';
  var U = G.Gaji.U, St = G.Gaji.St;
  var LS_CFG = 'gaji-sync', LS_SHA = 'gaji-sync-sha';
  var Sy = {};
  var fetchFn = function () { return G.fetch.apply(G, arguments); };
  Sy._setFetch = function (f) { fetchFn = f; };          // tests

  Sy.cfg = { owner: '', repo: '', branch: 'main', token: '' };
  Sy.status = { state: 'nosetup', msg: '', at: null, error: '' };   // nosetup | synced | syncing | dirty | offline | error
  var subs = [], pushT, busy = false, again = false;
  Sy.on = function (fn) { subs.push(fn); };
  function setStatus(state, msg, err) { Sy.status = { state: state, msg: msg || '', at: U.nowIso(), error: err || '' }; subs.forEach(function (f) { try { f(Sy.status); } catch (e) {} }); }

  Sy.loadCfg = function () { try { Object.assign(Sy.cfg, JSON.parse(St.lsGet(LS_CFG) || '{}')); } catch (e) {} Sy.cfg.branch = Sy.cfg.branch || 'main'; return Sy.cfg; };
  Sy.saveCfg = function (c) { Object.assign(Sy.cfg, c); St.lsSet(LS_CFG, JSON.stringify(Sy.cfg)); refreshIdle(); };
  Sy.ready = function () { return !!(Sy.cfg.owner && Sy.cfg.repo && Sy.cfg.token); };
  Sy.sha = function () { return St.lsGet(LS_SHA) || null; };
  function setSha(s) { if (s) St.lsSet(LS_SHA, s); else St.lsDel(LS_SHA); }
  function refreshIdle() { if (!Sy.ready()) setStatus('nosetup', 'Not set up'); else if (St.dirty()) setStatus('dirty', 'Changes waiting'); else setStatus('synced', 'Synced'); }

  /* ---- low-level ---- */
  function b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64dec(b) { return decodeURIComponent(escape(atob(String(b).replace(/\n/g, '')))); }
  Sy.api = function (method, path, body, raw) {
    var url = 'https://api.github.com' + path;
    var h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (Sy.cfg.token) h.Authorization = 'Bearer ' + Sy.cfg.token;
    if (body) h['Content-Type'] = 'application/json';
    return fetchFn(url, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }).then(function (res) {
      if (res.status === 204) return { status: 204 };
      return res.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (!res.ok) { var err = new Error((j && j.message) || ('HTTP ' + res.status)); err.status = res.status; throw err; }
        return raw ? { status: res.status, body: j } : j;
      });
    });
  };
  function base() { return '/repos/' + Sy.cfg.owner + '/' + Sy.cfg.repo; }
  Sy.getFile = function (path, ref) {
    return Sy.api('GET', base() + '/contents/' + path + '?ref=' + encodeURIComponent(ref || Sy.cfg.branch)).then(function (j) { return { sha: j.sha, text: b64dec(j.content), path: j.path }; });
  };
  Sy.putFile = function (path, text, message, sha) {
    var body = { message: message, content: b64enc(text), branch: Sy.cfg.branch };
    if (sha) body.sha = sha;
    return Sy.api('PUT', base() + '/contents/' + path, body).then(function (j) { return j.content ? j.content.sha : null; });
  };
  Sy.listDir = function (path) {
    return Sy.api('GET', base() + '/contents/' + path + '?ref=' + encodeURIComponent(Sy.cfg.branch)).then(function (j) { return Array.isArray(j) ? j : []; }, function (e) { if (e.status === 404) return []; throw e; });
  };
  Sy.listCommits = function (path, n) {
    return Sy.api('GET', base() + '/commits?sha=' + encodeURIComponent(Sy.cfg.branch) + '&per_page=' + (n || 30) + (path ? '&path=' + encodeURIComponent(path) : ''));
  };
  Sy.test = function () { return Sy.api('GET', base()).then(function (j) { return { ok: true, name: j.full_name, priv: !!j.private }; }); };

  /* ---- state.json ---- */
  function parseState(text) { var j = JSON.parse(text); if (!j || typeof j !== 'object' || !('settings' in j)) throw new Error('state.json is not a Gaji state'); return j; }

  /* Pull: remote newer and no local changes → replace; both changed → merge, then push the merge. */
  Sy.pull = function () {
    if (!Sy.ready()) { refreshIdle(); return Promise.resolve('nosetup'); }
    if (busy) { again = true; return Promise.resolve('busy'); }
    busy = true; setStatus('syncing', 'Syncing…');
    return Sy.getFile('state.json').then(function (f) {
      var remote = parseState(f.text), local = St.snapshot(), result;
      var same = f.sha === Sy.sha();
      setSha(f.sha);
      if (St.dirty()) {
        if (!same) { St.mergeIn(remote); result = 'merged'; } else result = 'local-newer';
        busy = false;
        return Sy.push(result === 'merged' ? 'Merge changes from another device' : undefined).then(function () { return result; });
      }
      if (!same || (remote.meta && remote.meta.updatedAt || '') !== (local.meta.updatedAt || '')) { St.replaceWith(remote); result = 'updated'; } else result = 'same';
      busy = false; setStatus('synced', 'Synced'); return result;
    }, function (e) {
      busy = false;
      if (e.status === 404) { setSha(null); if (St.dirty() || St.isSetUp()) return Sy.push('First upload from ' + deviceName()).then(function () { return 'created'; }); setStatus('synced', 'Repo is empty'); return 'empty'; }
      fail(e); throw e;
    }).then(function (r) { if (again) { again = false; Sy.pull(); } return r; });
  };

  /* Push local state. On a sha conflict, pull (merge) and try once more. */
  Sy.push = function (message, retried) {
    if (!Sy.ready()) { refreshIdle(); return Promise.resolve('nosetup'); }
    if (busy) { again = true; return Promise.resolve('busy'); }
    if (!St.dirty() && Sy.sha()) { refreshIdle(); return Promise.resolve('clean'); }
    busy = true; setStatus('syncing', 'Saving to GitHub…');
    var text = St.text(), msg = (message || lastMsg || 'Update') + ' · ' + deviceName();
    return Sy.putFile('state.json', text, msg, Sy.sha()).then(function (sha) {
      setSha(sha); St.setDirty(false); lastMsg = ''; busy = false; setStatus('synced', 'Synced');
      if (again) { again = false; Sy.pull(); }
      return 'pushed';
    }, function (e) {
      busy = false;
      if ((e.status === 409 || e.status === 422) && !retried) {
        // someone else wrote first: fetch their version, merge, push again
        return Sy.getFile('state.json').then(function (f) { setSha(f.sha); St.mergeIn(parseState(f.text)); return Sy.push('Merge changes from another device', true); });
      }
      fail(e); throw e;
    });
  };
  function fail(e) {
    if (!navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(e.message)) setStatus('offline', 'Offline · will retry', e.message);
    else if (e.status === 401) setStatus('error', 'Token rejected', e.message);
    else if (e.status === 403 || e.status === 404) setStatus('error', 'No access to repo', e.message);
    else setStatus('error', 'Sync error', e.message);
  }

  var lastMsg = '';
  Sy.schedule = function (msg) {
    lastMsg = msg || lastMsg;
    if (!Sy.ready()) { refreshIdle(); return; }
    setStatus('dirty', 'Saving…');
    clearTimeout(pushT); pushT = setTimeout(function () { Sy.push().catch(function () {}); }, 1800);
  };

  /* Upload the raw import JSON next to the state, so every import is kept as it was loaded. */
  Sy.uploadImport = function (name, text, message) {
    if (!Sy.ready()) return Promise.resolve(null);
    var path = 'imports/' + name;
    return Sy.getFile(path).then(function (f) { return f.sha; }, function () { return null; }).then(function (sha) { return Sy.putFile(path, text, message, sha); });
  };
  Sy.listImports = function () {
    return Sy.listDir('imports').then(function (a) { return a.filter(function (x) { return x.type === 'file' && /\.json$/.test(x.name); }).map(function (x) { return { name: x.name, path: x.path, size: x.size, sha: x.sha }; }).sort(function (a, b) { return a.name < b.name ? 1 : -1; }); });
  };
  Sy.versions = function () {
    return Sy.listCommits('state.json', 30).then(function (a) { return a.map(function (c) { return { sha: c.sha, short: c.sha.slice(0, 7), msg: (c.commit.message || '').split('\n')[0], at: c.commit.committer && c.commit.committer.date || c.commit.author.date }; }); });
  };
  Sy.restoreVersion = function (sha) {
    return Sy.getFile('state.json', sha).then(function (f) { var st = parseState(f.text); st.meta = st.meta || {}; st.meta.updatedAt = U.nowIso(); St.replaceWith(st); St.setDirty(true); return Sy.push('Restore version ' + sha.slice(0, 7)); });
  };

  function deviceName() { var ua = navigator.userAgent || ''; return /Android/i.test(ua) ? 'phone' : /iPhone|iPad/i.test(ua) ? 'iPhone' : 'laptop'; }
  Sy.deviceName = deviceName;

  Sy.init = function () {
    Sy.loadCfg(); refreshIdle();
    St.on(function (ev, msg) { if (ev === 'change') Sy.schedule(msg); });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', function () { if (St.dirty()) Sy.push().catch(function () {}); else Sy.pull().catch(function () {}); });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') Sy.pull().catch(function () {}); });
    }
  };

  G.Gaji.Sy = Sy;
})(typeof window !== 'undefined' ? window : globalThis);
