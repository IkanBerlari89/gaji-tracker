/* App shell cache. Network first so updates arrive at once; falls back to cache when offline. GitHub API is never cached. */
var VERSION = 'gaji-v2.2.0';
var SHELL = ['./', 'index.html', 'css/app.css', 'js/util.js', 'js/rules.js', 'js/store.js', 'js/sync.js', 'js/views/home.js', 'js/views/calendar.js', 'js/views/import.js', 'js/views/plan.js', 'js/views/more.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname === 'api.github.com') return;
  if (url.origin !== location.origin) {
    e.respondWith(caches.open(VERSION).then(function (c) { return fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; }).catch(function () { return c.match(e.request); }); }));
    return;
  }
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('./'); }); }));
});
