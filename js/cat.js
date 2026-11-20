/* A pixel cat that lives along the bottom edge: walks, sits, sleeps, eats, meows. Decorative; can be turned off in More.
   Each pose is composed on a 32×24 grid from simple shapes, then outlined automatically, so every frame has the same line weight. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, St = Ga.St;
  var W = 32, H = 24, KEY = 'gaji-cat';
  var host, el, ctx, timer = null, sayT = null, reduced = false, g = [];
  var C = { x: 30, dir: 1, state: 'sit', frame: 0, until: 0, target: 0, mood: '' };
  var PAL = { b: '#F6AA54', d: '#DE8530', w: '#FFEBCF', o: '#4A2E1B', k: '#2B2233', s: '#FFFFFF', p: '#F58CA0', r: '#FBB7A8', m: '#B5475B', u: '#6C9BE8', v: '#3F6FBE', f: '#B9703F' };
  function rnd(n) { return Math.floor(Math.random() * n); }

  /* ---- drawing on the grid ---- */
  function clear() { g = []; for (var y = 0; y < H; y++) { var row = []; for (var x = 0; x < W; x++) row.push(''); g.push(row); } }
  function set(x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; }
  function rect(x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) set(x + i, y + j, c); }
  function ell(cx, cy, rx, ry, c) { for (var j = -ry; j <= ry; j++) for (var i = -rx; i <= rx; i++) if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1.06) set(cx + i, cy + j, c); }
  function outline() {
    var add = [], x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (g[y][x]) continue;
      if ((y > 0 && g[y - 1][x]) || (y < H - 1 && g[y + 1][x]) || (x > 0 && g[y][x - 1]) || (x < W - 1 && g[y][x + 1])) add.push([x, y]);
    }
    add.forEach(function (q) { g[q[1]][q[0]] = 'o'; });
  }
  function ear(x, y) { rect(x + 1, y, 2, 1, 'b'); rect(x, y + 1, 4, 3, 'b'); rect(x + 1, y + 1, 2, 2, 'p'); }
  /* eyes, nose, mouth, blush. hw = half width of the head; mode: open | blink | happy | meow */
  function face(cx, cy, mode, hw) {
    var eL = cx - Math.round(hw / 2), eR = cx + Math.round(hw / 2) - 1;
    if (mode === 'blink') { rect(eL, cy, 2, 1, 'k'); rect(eR, cy, 2, 1, 'k'); }
    else if (mode === 'happy') { set(eL - 1, cy, 'k'); set(eL, cy - 1, 'k'); set(eL + 1, cy, 'k'); set(eR, cy, 'k'); set(eR + 1, cy - 1, 'k'); set(eR + 2, cy, 'k'); }
    else { rect(eL, cy - 1, 2, 3, 'k'); set(eL, cy - 1, 's'); rect(eR, cy - 1, 2, 3, 'k'); set(eR, cy - 1, 's'); }
    set(cx, cy + 2, 'p');
    if (mode === 'meow') { rect(cx - 1, cy + 3, 3, 2, 'm'); set(cx, cy + 4, 'p'); } else { set(cx - 1, cy + 3, 'o'); set(cx + 1, cy + 3, 'o'); }
    rect(eL - 2, cy + 2, 2, 1, 'r'); rect(eR + 2, cy + 2, 2, 1, 'r');
  }
  function whiskers(cx, cy, hw, left) {
    if (left) { rect(cx - hw - 3, cy + 1, 2, 1, 'o'); rect(cx - hw - 3, cy + 3, 2, 1, 'o'); }
    rect(cx + hw + 2, cy + 1, 2, 1, 'o'); rect(cx + hw + 2, cy + 3, 2, 1, 'o');
  }

  /* ---- poses (facing right; the ground is row 23) ---- */
  function sit(f, mode) {
    var wag = f % 8 < 4;
    rect(21, 20, 5, 2, 'b'); if (wag) { rect(25, 15, 2, 6, 'b'); rect(25, 14, 2, 1, 'd'); } else { rect(26, 16, 2, 5, 'b'); rect(27, 15, 2, 1, 'd'); }
    ell(15, 17, 7, 5, 'b'); ell(15, 18, 3, 4, 'w');
    rect(11, 21, 3, 2, 'w'); rect(16, 21, 3, 2, 'w');
    ear(8, 1); ear(19, 1); ell(15, 9, 8, 7, 'b');
    rect(12, 2, 1, 2, 'd'); rect(15, 2, 1, 3, 'd'); rect(18, 2, 1, 2, 'd');
    face(15, 9, mode || (f % 22 < 2 ? 'blink' : 'open'), 8);
    outline(); whiskers(15, 9, 8, true);
  }
  function body(legsA, tailUp) {
    if (tailUp) { rect(1, 6, 2, 3, 'b'); rect(1, 5, 2, 1, 'd'); rect(2, 8, 2, 7, 'b'); } else { rect(3, 5, 2, 3, 'b'); rect(3, 4, 2, 1, 'd'); rect(2, 7, 2, 8, 'b'); }
    ell(12, 15, 9, 5, 'b'); rect(7, 18, 11, 2, 'w');
    rect(8, 11, 1, 3, 'd'); rect(11, 11, 1, 3, 'd'); rect(14, 11, 1, 3, 'd');
    (legsA ? [5, 10, 14, 19] : [6, 9, 15, 18]).forEach(function (x) { rect(x, 19, 2, 4, 'b'); rect(x, 22, 2, 1, 'w'); });
  }
  function walk(f) {
    var a = f % 2 === 0;
    body(a, a);
    ear(17, 1); ear(24, 1); ell(22, 10, 6, 6, 'b'); rect(21, 4, 1, 2, 'd'); rect(23, 4, 1, 2, 'd');
    face(22, 10, f % 22 < 2 ? 'blink' : 'open', 6);
    outline(); whiskers(22, 10, 6, false);
  }
  function eat(f) {
    var bob = f % 4 < 2 ? 0 : 1;
    body(false, false);
    ear(17, 4 + bob); ear(24, 4 + bob); ell(22, 13 + bob, 6, 6, 'b'); rect(21, 7 + bob, 1, 2, 'd'); rect(23, 7 + bob, 1, 2, 'd');
    face(22, 13 + bob, 'blink', 6);
    rect(23, 20, 8, 3, 'u'); rect(23, 22, 8, 1, 'v'); rect(24, 19, 6, 1, 'f');
    outline();
  }
  function sleep(f) {
    var breath = f % 14 < 7;
    rect(4, 20, 10, 2, 'b'); rect(13, 20, 2, 2, 'd');
    ell(14, 17, 11, 5, 'b'); if (breath) rect(8, 11, 12, 1, 'b');
    rect(7, 13, 1, 3, 'd'); rect(10, 12, 1, 3, 'd'); rect(13, 12, 1, 3, 'd');
    ear(16, 8); ear(23, 8); ell(21, 16, 6, 5, 'b');
    rect(18, 16, 2, 1, 'k'); rect(23, 16, 2, 1, 'k'); set(21, 18, 'p'); rect(16, 18, 2, 1, 'r'); rect(25, 18, 2, 1, 'r');
    outline(); rect(29, 17, 2, 1, 'o'); rect(29, 19, 2, 1, 'o');
  }
  function compose(pose, f, mood) {
    clear();
    if (pose === 'walk') walk(f); else if (pose === 'sleep') sleep(f); else if (pose === 'eat') eat(f); else sit(f, pose === 'meow' ? (mood || 'meow') : mood);
  }
  function paint(c2, flip) {
    c2.clearRect(0, 0, W, H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var c = g[y][x]; if (c) { c2.fillStyle = PAL[c]; c2.fillRect(flip ? W - 1 - x : x, y, 1, 1); } }
  }
  function draw() {
    compose(C.state, C.frame, C.mood); paint(ctx, C.dir < 0);
    el.style.transform = 'translateX(' + Math.round(C.x) + 'px)';
  }

  /* ---- behaviour ---- */
  function track() { return Math.max(80, host.clientWidth - el.offsetWidth); }
  function set2(state, ms, mood) {
    C.state = state; C.until = Date.now() + ms; C.frame = 0; C.mood = mood || '';
    var z = el.querySelector('.cat-z');
    if (state === 'sleep' && !z) { z = document.createElement('span'); z.className = 'cat-z'; z.textContent = 'z'; el.appendChild(z); }
    if (state !== 'sleep' && z) z.remove();
  }
  function pick() {
    var r = Math.random();
    if (reduced) { set2(r < 0.5 ? 'sit' : 'sleep', 10000 + rnd(15000)); return; }
    if (r < 0.46) { C.target = 8 + Math.random() * (track() - 16); C.dir = C.target > C.x ? 1 : -1; set2('walk', 60000); }
    else if (r < 0.62) set2('sit', 2500 + rnd(4000));
    else if (r < 0.8) set2('sleep', 9000 + rnd(14000));
    else if (r < 0.92) set2('eat', 4200);
    else { set2('meow', 1500); say(['meow', 'mrrp', 'meow?'][rnd(3)], 1400); }
  }
  function tick() {
    if (document.hidden || !el) return;
    C.frame++;
    if (C.x > track()) C.x = track();
    if (C.state === 'walk') {
      C.x += C.dir * 2.6;
      if ((C.dir > 0 && C.x >= C.target) || (C.dir < 0 && C.x <= C.target)) { C.x = C.target; set2('sit', 1800 + rnd(2500)); }
    } else if (Date.now() > C.until) pick();
    draw();
  }
  function say(text, ms) {
    if (!el) return;
    var b = el.querySelector('.cat-say'); if (b) b.remove();
    b = document.createElement('span'); b.className = 'cat-say'; b.textContent = text; el.appendChild(b);
    clearTimeout(sayT); sayT = setTimeout(function () { b.remove(); }, ms || 2200);
  }
  function tip() {
    try {
      var n = Ga.missing().length;
      if (n) return n + ' day' + (n === 1 ? '' : 's') + ' to fill, meow';
      if (!St.isSetUp()) return 'set your pay first';
    } catch (e) {}
    return ['purr', 'meow', 'all days filled', 'feed me', 'nice work'][rnd(5)];
  }
  function onTap() {
    if (C.state === 'sleep') { set2('sit', 3000); say('...mrow?', 1600); }
    else { set2('meow', 1800); say(tip(), 2600); }
    draw();
  }

  var Cat = {};
  Cat.on = function () { return St.lsGet(KEY) !== '0'; };
  Cat.set = function (on) { St.lsSet(KEY, on ? '1' : '0'); Cat.init(); };
  Cat.cheer = function () { if (!el || C.state === 'sleep') return; set2('meow', 1600, 'happy'); say(['nice!', 'purr', 'saved'][rnd(3)], 1500); draw(); };
  Cat.say = say;
  /* Draw one pose onto any 32×24 canvas (used by the payday quest on Home). */
  Cat.sprite = function (canvas, pose, f, mood) { compose(pose, f || 0, mood); paint(canvas.getContext('2d'), false); };
  Cat.init = function () {
    host = document.getElementById('cat'); if (!host) return;
    clearInterval(timer); timer = null; host.innerHTML = ''; el = null;
    if (!Cat.on()) return;
    try { reduced = G.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    el = document.createElement('div'); el.className = 'cat';
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; el.appendChild(cv); ctx = cv.getContext('2d');
    host.appendChild(el);
    el.addEventListener('click', onTap);
    C.x = Math.min(track(), 24 + rnd(60)); set2('sit', 2500); draw();
    timer = setInterval(tick, 150);
  };
  Ga.cat = Cat;
})(window);
