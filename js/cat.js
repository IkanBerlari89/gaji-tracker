/* A small pixel cat that lives along the bottom edge: walks, sits, sleeps, eats, meows. Purely decorative; can be turned off in More. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, St = Ga.St;
  var W = 20, H = 14, KEY = 'gaji-cat';
  var host, el, ctx, timer = null, sayT = null, reduced = false;
  var C = { x: 30, dir: 1, state: 'sit', frame: 0, until: 0, target: 0 };
  var K = { b: '#F2A65A', d: '#D9812F', w: '#FBE6C8', k: '#2B2B33', p: '#F28C9A', bowl: '#5A8FE0', food: '#B9703F' };

  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function rnd(n) { return Math.floor(Math.random() * n); }

  /* ---- poses, drawn facing right on a 20×14 grid; the ground is row 13 ---- */
  function walk(f) {
    var a = f % 2;
    px(1, 5, 1, 4, K.b); px(2, 8, 1, 1, K.b); px(a ? 0 : 2, 4, 1, 1, K.b);                 // tail
    px(3, 7, 10, 4, K.b); px(5, 7, 1, 2, K.d); px(8, 7, 1, 2, K.d); px(11, 7, 1, 1, K.d); px(5, 10, 6, 1, K.w);   // body
    head(12, 3, false);
    var legs = a ? [3, 8, 9, 13] : [4, 7, 10, 12];
    legs.forEach(function (x) { px(x, 11, 1, 2, K.b); px(x, 12, 1, 1, K.w); });
  }
  function head(x, y, closed, open) {
    px(x, y, 6, 6, K.b); px(x, y - 2, 2, 2, K.b); px(x + 4, y - 2, 2, 2, K.b); px(x + 1, y - 1, 1, 1, K.p); px(x + 4, y - 1, 1, 1, K.p);
    if (closed) { px(x + 1, y + 3, 2, 1, K.k); px(x + 4, y + 3, 1, 1, K.k); }
    else { px(x + 2, y + 2, 1, 1, K.k); px(x + 5, y + 2, 1, 1, K.k); }
    px(x + 4, y + 3, 1, 1, K.p);
    if (open) px(x + 4, y + 4, 1, 1, K.k);
  }
  function sit(f, open) {
    px(3, 12, 4, 1, K.b); px(3, 11, 1, 1, K.b);                                              // tail on the ground
    px(6, 7, 7, 6, K.b); px(7, 8, 1, 2, K.d); px(10, 9, 2, 4, K.w);                          // body, chest
    head(8, 2, f % 14 === 0, open);
    px(10, 12, 1, 1, K.w); px(12, 12, 1, 1, K.w);
  }
  function sleep(f) {
    px(2, 12, 4, 1, K.b); px(2, 11, 1, 1, K.b);
    px(4, 9, 12, 4, K.b); if (f % 10 < 5) px(5, 8, 10, 1, K.b);
    px(7, 9, 1, 2, K.d); px(10, 9, 1, 2, K.d);
    px(12, 8, 6, 5, K.b); px(12, 7, 2, 1, K.b); px(16, 7, 2, 1, K.b); px(13, 10, 2, 1, K.k); px(16, 10, 1, 1, K.k); px(15, 11, 1, 1, K.p);
  }
  function eat(f) {
    var bob = f % 2;
    px(1, 5, 1, 4, K.b); px(2, 8, 1, 1, K.b);
    px(3, 7, 10, 4, K.b); px(5, 7, 1, 2, K.d); px(8, 7, 1, 2, K.d); px(5, 10, 6, 1, K.w);
    [4, 7, 10, 12].forEach(function (x) { px(x, 11, 1, 2, K.b); px(x, 12, 1, 1, K.w); });
    px(12, 6 + bob, 6, 5, K.b); px(12, 5 + bob, 2, 1, K.b); px(16, 5 + bob, 2, 1, K.b); px(15, 8 + bob, 1, 1, K.k);
    px(15, 11, 5, 2, K.bowl); px(16, 10, 3, 1, K.food);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (C.dir < 0) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    if (C.state === 'walk') walk(C.frame); else if (C.state === 'sleep') sleep(C.frame); else if (C.state === 'eat') eat(C.frame); else sit(C.frame, C.state === 'meow');
    ctx.restore();
    el.style.transform = 'translateX(' + Math.round(C.x) + 'px)';
  }

  /* ---- behaviour ---- */
  function track() { return Math.max(80, host.clientWidth - 60); }
  function set(state, ms) {
    C.state = state; C.until = Date.now() + ms; C.frame = 0;
    var z = el.querySelector('.cat-z');
    if (state === 'sleep' && !z) { z = document.createElement('span'); z.className = 'cat-z'; z.textContent = 'z'; el.appendChild(z); }
    if (state !== 'sleep' && z) z.remove();
  }
  function pick() {
    var r = Math.random();
    if (reduced) { set(r < 0.5 ? 'sit' : 'sleep', 10000 + rnd(15000)); return; }
    if (r < 0.46) { C.target = 8 + Math.random() * (track() - 16); C.dir = C.target > C.x ? 1 : -1; set('walk', 60000); }
    else if (r < 0.62) set('sit', 2500 + rnd(4000));
    else if (r < 0.8) set('sleep', 9000 + rnd(14000));
    else if (r < 0.92) set('eat', 4200);
    else { set('meow', 1500); say(['meow', 'mrrp', 'meow?'][rnd(3)], 1400); }
  }
  function tick() {
    if (document.hidden || !el) return;
    C.frame++;
    if (C.x > track()) C.x = track();
    if (C.state === 'walk') {
      C.x += C.dir * 2.6;
      if ((C.dir > 0 && C.x >= C.target) || (C.dir < 0 && C.x <= C.target)) { C.x = C.target; set('sit', 1800 + rnd(2500)); }
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
    if (C.state === 'sleep') { set('sit', 3000); say('...mrow?', 1600); }
    else { set('meow', 1800); say(tip(), 2600); }
    draw();
  }

  var Cat = {};
  Cat.on = function () { return St.lsGet(KEY) !== '0'; };
  Cat.set = function (on) { St.lsSet(KEY, on ? '1' : '0'); Cat.init(); };
  Cat.cheer = function () { if (!el) return; if (C.state === 'sleep') return; set('meow', 1500); say(['nice!', 'purr', 'saved'][rnd(3)], 1500); draw(); };
  Cat.say = say;
  /* Draw one pose onto any 20×14 canvas (used by the payday quest on Home). */
  Cat.sprite = function (canvas, pose, f) { var old = ctx; ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, W, H); if (pose === 'sit') sit(f || 1, true); else walk(f || 0); ctx = old; };
  Cat.init = function () {
    host = document.getElementById('cat'); if (!host) return;
    clearInterval(timer); timer = null; host.innerHTML = ''; el = null;
    if (!Cat.on()) return;
    try { reduced = G.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    el = document.createElement('div'); el.className = 'cat';
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; el.appendChild(cv); ctx = cv.getContext('2d');
    host.appendChild(el);
    el.addEventListener('click', onTap);
    C.x = Math.min(track(), 24 + rnd(60)); set('sit', 2500); draw();
    timer = setInterval(tick, 150);
  };
  Ga.cat = Cat;
})(window);
