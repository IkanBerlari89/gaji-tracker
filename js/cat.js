/* A pixel cat that lives on the page. It walks, sits, sleeps and eats on its own, and you can play with it:
   tap = pet, double-tap = throw it a fish, drag = pick it up by the scruff, let go while moving = throw it.
   It also reacts to each day saved on Home (Cat.react): overtime, leave, unpaid and so on each get their own scene.
   Decorative; can be turned off in More. Every pose is drawn on a 32×24 grid and outlined automatically. */
(function (G) {
  'use strict';
  var Ga = G.Gaji, St = Ga.St, U = Ga.U;
  var W = 32, H = 24, SC = 2, CW = W * SC, CH = H * SC, KEY = 'gaji-cat', TIPKEY = 'gaji-cat-tip';
  var host, el, cv, ctx, timer = null, raf = 0, lastT = 0, lastFrame = 0, sayT = null, reduced = false, g = [];
  var C = { x: 30, top: 0, vx: 0, vy: 0, rot: 0, spin: 0, hit: 0, dir: 1, state: 'sit', frame: 0, until: 0, target: 0, mood: '', pose: '', opt: null, dance: false, speed: 0 };
  var drag = null, lastTap = 0, fish = null;
  var PAL = { b: '#F7A84F', d: '#D97F2B', w: '#FFF1DC', o: '#4A2E1B', k: '#2B2233', s: '#FFFFFF', p: '#F58CA0', r: '#FBB7A8', m: '#B5475B', u: '#6C9BE8', v: '#3F6FBE', f: '#B9703F', y: '#8FB8F0', x: '#FF6B8B', h: '#FFC2D0', t: '#F6C343', g: '#57D496', c: '#AEB8C4', e: '#A8D08D' };
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- drawing on the grid ---- */
  function clear() { g = []; for (var y = 0; y < H; y++) { var row = []; for (var x = 0; x < W; x++) row.push(''); g.push(row); } }
  function set(x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; }
  function rect(x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) set(x + i, y + j, c); }
  function outline() {
    var add = [], x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (g[y][x]) continue;
      if ((y > 0 && g[y - 1][x]) || (y < H - 1 && g[y + 1][x]) || (x > 0 && g[y][x - 1]) || (x < W - 1 && g[y][x + 1])) add.push([x, y]);
    }
    add.forEach(function (q) { g[q[1]][q[0]] = 'o'; });
  }
  /* The head, seen from the front: 18 wide, 14 tall. Left half; the right half is its mirror.
     Pointed ears on the corners, forehead stripes, cream muzzle. */
  var HEAD = ['..b......', '..bb.....', '..bpb....', '..bppb...', '..bppbbbb', '.bbbbbdbd', 'bbbbbbdbd', 'bbbbbbbbb', 'bbbbbbbbb', 'bbbbbbbbb', 'bbbbbbwww', 'bbbbbwwww', '.bbbbwwww', '..bbbbwww'];
  /* Sitting body below the head, rows 15–22. Left half of the 32-wide grid, mirrored. */
  var BODY_SIT = ['...........bbbbb', '..........bbbbww', '.........bbbbwww', '.........bbbbwww', '........bbbbbwww', '........bbbbbbww', '.......bbbbbwwbb', '.......bbbbbwwbb'];
  function mirror(rows, oy) { rows.forEach(function (r, j) { for (var i = 0; i < 16; i++) { var ch = r.charAt(i); if (ch !== '.') { set(i, oy + j, ch); set(31 - i, oy + j, ch); } } }); }
  /* Sad or sick faces: no upright ears (the top five rows of HEAD are replaced) and a flap hanging off each side instead. */
  var HEAD_DROOP = ['.........', '.........', '.........', '.........', '..bbbbbbb'];
  /* mode: open | blink | happy | meow | wide | dizzy | coin | shades | sick | sad | cry0 | cry1 */
  function head(ox, oy, mode, droop) {
    HEAD.forEach(function (r0, j) { var r = droop && j < 5 ? HEAD_DROOP[j] : r0; for (var i = 0; i < 9; i++) { var ch = r.charAt(i); if (ch !== '.') { set(ox + i, oy + j, ch); set(ox + 17 - i, oy + j, ch); } } });
    if (droop) [[ox - 2, 1], [ox + 19, -1]].forEach(function (q) { var x = q[0], s = q[1]; rect(Math.min(x, x + 2 * s), oy + 5, 3, 1, 'b'); rect(Math.min(x, x + s), oy + 6, 2, 1, 'b'); set(x, oy + 7, 'b'); set(x + s, oy + 5, 'p'); });
    var ey = oy + 8, xl = ox + 4, xr = ox + 12, mouth = 'w';
    if (mode === 'blink') { rect(xl - 1, ey + 1, 4, 1, 'k'); rect(xr - 1, ey + 1, 4, 1, 'k'); }
    else if (mode === 'happy') { [xl - 1, xr - 1].forEach(function (x) { set(x, ey + 1, 'k'); set(x + 1, ey, 'k'); set(x + 2, ey, 'k'); set(x + 3, ey + 1, 'k'); }); }
    else if (mode === 'dizzy') { [xl - 1, xr].forEach(function (x) { set(x, ey, 'k'); set(x + 2, ey, 'k'); set(x + 1, ey + 1, 'k'); set(x, ey + 2, 'k'); set(x + 2, ey + 2, 'k'); }); mouth = 'o'; }
    else if (mode === 'wide') { rect(xl - 1, ey - 1, 4, 4, 's'); rect(xl, ey, 2, 2, 'k'); rect(xr - 1, ey - 1, 4, 4, 's'); rect(xr, ey, 2, 2, 'k'); mouth = 'o'; }
    else if (mode === 'coin') { [xl - 1, xr - 1].forEach(function (x) { rect(x, ey - 1, 4, 4, 'f'); rect(x + 1, ey, 2, 2, 't'); set(x + 1, ey, 's'); }); mouth = 'O'; }
    else if (mode === 'shades') { rect(xl - 1, ey, 4, 2, 'k'); rect(xr - 1, ey, 4, 2, 'k'); rect(xl + 3, ey, 4, 1, 'k'); set(xl, ey, 's'); set(xr, ey, 's'); }
    else if (mode === 'sick') { rect(xl - 1, ey + 1, 4, 1, 'k'); rect(xr - 1, ey + 1, 4, 1, 'k'); mouth = 'n'; }
    else if (mode === 'sad' || mode === 'cry0' || mode === 'cry1') {
      rect(xl, ey + 1, 2, 2, 'k'); rect(xr, ey + 1, 2, 2, 'k');
      set(xl, ey - 1, 'o'); set(xl + 1, ey - 2, 'o'); set(xr + 1, ey - 1, 'o'); set(xr, ey - 2, 'o');   // brows lifted in the middle
      if (mode !== 'sad') { var tl = mode === 'cry0' ? 2 : 3; rect(xl, ey + 3, 1, tl, 'u'); rect(xr + 1, ey + 3, 1, tl, 'u'); }
      mouth = 'n';
    }
    else { rect(xl, ey, 2, 3, 'k'); set(xl, ey, 's'); rect(xr, ey, 2, 3, 'k'); set(xr, ey, 's'); }
    rect(ox + 8, oy + 10, 2, 1, 'p');
    if (mode === 'meow' || mouth === 'O') rect(ox + 8, oy + 11, 2, 2, 'm');
    else if (mouth === 'o') rect(ox + 8, oy + 11, 2, 1, 'm');
    else if (mouth === 'n') { set(ox + 7, oy + 12, 'o'); set(ox + 8, oy + 11, 'o'); set(ox + 9, oy + 11, 'o'); set(ox + 10, oy + 12, 'o'); }
    else { set(ox + 6, oy + 11, 'o'); set(ox + 8, oy + 11, 'o'); set(ox + 9, oy + 11, 'o'); set(ox + 11, oy + 11, 'o'); set(ox + 7, oy + 12, 'o'); set(ox + 10, oy + 12, 'o'); }
    rect(ox + 1, oy + 11, 2, 1, mode === 'sick' ? 'e' : 'r'); rect(ox + 15, oy + 11, 2, 1, mode === 'sick' ? 'e' : 'r');
  }
  function whiskers(ox, oy, left, right) {
    if (left) { rect(ox - 3, oy + 9, 2, 1, 'o'); rect(ox - 3, oy + 11, 2, 1, 'o'); }
    if (right) { rect(ox + 19, oy + 9, 2, 1, 'o'); rect(ox + 19, oy + 11, 2, 1, 'o'); }
  }

  /* ---- poses (facing right; the ground is row 23) ---- */
  /* opt.prop: wave (one paw up) | crown | thermo (thermometer); opt.droop: ears flat */
  function sit(f, mode, opt) {
    opt = opt || {};
    var wag = f % 8 < 4, a = f % 4 < 2;
    rect(24, 21, 5, 2, 'b');
    if (wag) { rect(28, 16, 2, 6, 'b'); rect(27, 15, 2, 1, 'b'); } else { rect(28, 17, 2, 5, 'b'); rect(29, 15, 2, 2, 'b'); }
    rect(28, 18, 2, 1, 'd'); rect(28, 20, 2, 1, 'd');
    mirror(BODY_SIT, 15);
    if (opt.prop === 'wave') { rect(6, a ? 15 : 16, 4, 2, 'b'); rect(4, a ? 13 : 15, 3, 3, 'b'); rect(4, a ? 13 : 15, 2, 2, 'w'); }
    if (mode === 'cry') mode = 'cry' + (a ? 0 : 1);
    head(7, 1, mode || (f % 24 < 2 ? 'blink' : 'open'), opt.droop);
    if (opt.prop === 'crown') { rect(13, 3, 6, 2, 't'); set(13, 2, 't'); set(15, 2, 't'); set(16, 2, 't'); set(18, 2, 't'); set(15, 4, 'x'); set(16, 4, 'x'); }
    outline(); whiskers(7, 1, opt.prop !== 'wave', true);
    if (opt.prop === 'thermo') { set(17, 13, 's'); set(18, 14, 's'); set(19, 15, 's'); set(20, 16, 'x'); set(21, 17, 'x'); }
  }
  /* a long stretch: rump up, front paws out, eyes shut */
  function stretch(f) {
    var a = f % 6 < 3;
    rect(1, a ? 5 : 6, 2, a ? 7 : 6, 'b'); rect(2, a ? 4 : 5, 2, 1, 'b'); rect(1, 8, 2, 1, 'd');
    rect(2, 11, 9, 7, 'b'); rect(10, 13, 5, 6, 'b'); rect(14, 15, 5, 5, 'b');
    rect(4, 11, 1, 3, 'd'); rect(7, 11, 1, 3, 'd');
    rect(3, 18, 2, 4, 'b'); rect(3, 22, 2, 1, 'w'); rect(7, 18, 2, 4, 'b'); rect(7, 22, 2, 1, 'w');
    head(11, 8, 'blink');
    rect(22, 21, 7, 2, 'b'); rect(27, 21, 3, 2, 'w');
    outline();
  }
  function torso(legs) {
    rect(3, 13, 16, 6, 'b'); rect(2, 14, 1, 4, 'b'); rect(19, 14, 1, 4, 'b');
    rect(5, 18, 11, 1, 'w'); rect(5, 13, 1, 3, 'd'); rect(8, 13, 1, 3, 'd');
    legs.forEach(function (x) { rect(x, 19, 2, 3, 'b'); rect(x, 22, 2, 1, 'w'); });
  }
  function walk(f) {
    var a = f % 2 === 0;
    if (a) { rect(1, 6, 2, 10, 'b'); rect(2, 5, 2, 1, 'b'); } else { rect(1, 7, 2, 9, 'b'); rect(0, 5, 2, 2, 'b'); }
    rect(1, 9, 2, 1, 'd'); rect(1, 12, 2, 1, 'd');
    torso(a ? [3, 7, 13, 17] : [4, 6, 14, 16]);
    head(11, 1, f % 24 < 2 ? 'blink' : 'open');
    outline(); whiskers(11, 1, false, true);
  }
  var FISH3 = ['.yyyy..y', 'ykyyyyy.', '.yyyy..y'];
  function eat(f, mood) {
    var bob = f % 4 < 2 ? 0 : 1;
    rect(0, 11, 2, 2, 'b'); rect(1, 12, 2, 4, 'b');
    torso([3, 7, 13, 17]);
    head(11, 5 + bob, 'blink');
    if (mood === 'fish') {
      var gone = Math.min(8, Math.floor(f / 2));   // eaten from the head end
      FISH3.forEach(function (r, j) { for (var i = gone; i < 8; i++) { var ch = r.charAt(i); if (ch !== '.') set(22 + i, 20 + j, ch); } });
    } else { rect(21, 20, 10, 3, 'u'); rect(21, 22, 10, 1, 'v'); rect(22, 19, 8, 1, 'f'); }
    outline();
  }
  function sleep(f, mode) {
    var breath = f % 16 < 8;
    rect(3, 15, 20, 7, 'b'); rect(2, 16, 1, 5, 'b'); rect(5, 14, 16, 1, 'b'); if (breath) rect(7, 13, 12, 1, 'b');
    rect(6, 14, 1, 3, 'd'); rect(9, 14, 1, 3, 'd'); rect(12, 14, 1, 3, 'd');
    head(13, 8, mode || 'blink');
    rect(1, 20, 2, 2, 'b'); rect(2, 21, 12, 2, 'b'); rect(6, 21, 1, 2, 'd'); rect(10, 21, 1, 2, 'd');
    rect(16, 22, 3, 1, 'w');
    outline();
  }
  /* held by the scruff: body hangs, paws out, legs paddle */
  function hang(f) {
    var a = f % 2 === 0;
    rect(20, 18, a ? 3 : 4, 2, 'b'); rect(a ? 22 : 23, 19, 2, 4, 'b'); rect(a ? 22 : 23, 21, 2, 1, 'd');
    rect(12, 15, 8, 6, 'b'); rect(14, 15, 4, 5, 'w');
    rect(9, a ? 15 : 16, 3, 2, 'b'); rect(8, a ? 15 : 16, 2, 2, 'w');
    rect(20, a ? 16 : 15, 3, 2, 'b'); rect(22, a ? 16 : 15, 2, 2, 'w');
    rect(a ? 12 : 11, 21, 3, 2, 'b'); rect(a ? 12 : 11, 22, 3, 1, 'w');
    rect(a ? 17 : 18, 21, 3, 2, 'b'); rect(a ? 17 : 18, 22, 3, 1, 'w');
    head(7, 1, 'wide');
    outline(); whiskers(7, 1, true, true);
  }
  function compose(pose, f, mood, opt) {
    clear();
    if (pose === 'walk') walk(f);
    else if (pose === 'sleep') sleep(f, mood);
    else if (pose === 'eat') eat(f, mood);
    else if (pose === 'stretch') stretch(f);
    else if (pose === 'hang' || pose === 'air') hang(f);
    else if (pose === 'dizzy') sit(f, 'dizzy', opt);
    else if (pose === 'pet') sit(f, 'happy', opt);
    else sit(f, pose === 'meow' ? (mood || 'meow') : mood, opt);
  }
  function paint(c2, flip) {
    c2.clearRect(0, 0, W, H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var c = g[y][x]; if (c) { c2.fillStyle = PAL[c]; c2.fillRect(flip ? W - 1 - x : x, y, 1, 1); } }
  }
  /* small pixel props: heart, star, fish */
  var HEART = ['.xx.xx.', 'xhxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'], STAR = ['..t..', '.ttt.', 'ttttt', '.ttt.', '..t..'], FISH = ['..yyy...y', '.yyyyy.yy', 'ykyyyyyy.', '.yyyyy.yy', '..yyy...y'];
  function pix(rows, scale, cls) {
    var c = document.createElement('canvas'), x2; c.width = rows[0].length; c.height = rows.length; x2 = c.getContext('2d');
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r.charAt(x); if (ch !== '.') { x2.fillStyle = PAL[ch]; x2.fillRect(x, y, 1, 1); } } });
    c.style.width = c.width * scale + 'px'; c.style.height = c.height * scale + 'px'; c.className = cls; return c;
  }

  /* ---- where it can go: the viewport, minus the navigation ---- */
  function bounds() {
    var nav = document.querySelector('.nav'), l = 0, fl = G.innerHeight;
    if (nav) { var r = nav.getBoundingClientRect(); if (G.innerWidth >= 1000) l = Math.max(0, r.right); else fl = r.top; }
    return { l: l, r: Math.max(l, G.innerWidth - CW), floor: fl - CH };
  }
  function place() {
    el.style.transform = 'translate(' + Math.round(C.x) + 'px,' + Math.round(C.top) + 'px)';
    cv.style.transform = C.rot ? 'rotate(' + Math.round(C.rot) + 'deg)' : '';
  }
  function draw() { compose(C.pose || C.state, C.frame, C.mood, C.opt); paint(ctx, C.dir < 0); place(); }

  /* ---- behaviour ---- */
  function set2(state, ms, mood) {
    C.state = state; C.until = Date.now() + ms; C.frame = 0; C.mood = mood || '';
    C.pose = ''; C.opt = null; C.dance = false; C.speed = 0; if (cv) cv.className = 'cat-body';
    var z = el.querySelector('.cat-z');
    if (state === 'sleep' && !z) { z = document.createElement('span'); z.className = 'cat-z'; z.textContent = 'z'; el.appendChild(z); }
    if (state !== 'sleep' && z) z.remove();
    var stars = el.querySelectorAll('.cat-star');
    if (state === 'dizzy' && !stars.length) { el.appendChild(pix(STAR, 2, 'cat-star')); el.appendChild(pix(STAR, 2, 'cat-star')); }
    if (state !== 'dizzy') stars.forEach(function (s) { s.remove(); });
  }
  function chase() {
    var b = bounds(), right = fish.x > C.x + CW / 2;
    C.dir = right ? 1 : -1; C.target = clamp(right ? fish.x - 44 : fish.x - 4, b.l, b.r); set2('walk', 60000);
  }
  function pick() {
    if (fish && fish.ready) { chase(); return; }
    var r = Math.random(), b = bounds();
    if (reduced) { set2(r < 0.5 ? 'sit' : 'sleep', 10000 + rnd(15000)); return; }
    if (r < 0.46) { C.target = b.l + 8 + Math.random() * Math.max(1, b.r - b.l - 16); C.dir = C.target > C.x ? 1 : -1; set2('walk', 60000); }
    else if (r < 0.62) set2('sit', 2500 + rnd(4000));
    else if (r < 0.8) set2('sleep', 9000 + rnd(14000));
    else if (r < 0.92) set2('eat', 4200);
    else { set2('meow', 1500); say(['meow', 'mrrp', 'meow?'][rnd(3)], 1400); }
  }
  function tick() {
    if (document.hidden || !el) return;
    C.frame++;
    if (C.state === 'hang') { C.rot *= 0.75; draw(); return; }
    if (C.state === 'air') {
      /* if the browser is not giving animation frames (throttled tab), keep the fall going from this timer */
      if (Date.now() - lastFrame > 300) for (var i = 0; i < 5 && C.state === 'air'; i++) step(30);
      draw(); return;
    }
    var b = bounds(); C.top = b.floor; C.x = clamp(C.x, b.l, b.r);
    if (C.state === 'react' && C.dance) C.dir = (C.frame >> 1) % 2 ? -1 : 1;   // dancing: turn left and right
    if (C.state === 'walk') {
      C.x += C.dir * (C.speed || 2.6);
      if ((C.dir > 0 && C.x >= C.target) || (C.dir < 0 && C.x <= C.target)) {
        C.x = C.target;
        if (fish && fish.ready) { fish.el.remove(); fish = null; set2('eat', 2700, 'fish'); } else set2('sit', 1800 + rnd(2500));
      }
    } else if (Date.now() > C.until) {
      if (C.state === 'eat' && C.mood === 'fish') { set2('meow', 1500, 'happy'); say('nyam!', 1300); hearts(2); } else pick();
    }
    draw();
  }
  function keepIn(node) {
    var r = node.getBoundingClientRect(), w = G.innerWidth;
    if (r.left < 4) node.style.marginLeft = Math.round(4 - r.left) + 'px'; else if (r.right > w - 4) node.style.marginLeft = Math.round(w - 4 - r.right) + 'px';
    return node;
  }
  function say(text, ms) {
    if (!el) return;
    var b = el.querySelector('.cat-say'); if (b) b.remove();
    b = document.createElement('span'); b.className = 'cat-say'; b.textContent = text; el.appendChild(b); keepIn(b);
    clearTimeout(sayT); sayT = setTimeout(function () { b.remove(); }, ms || 2200);
  }
  function hearts(n) {
    for (var i = 0; i < n; i++) (function (i) {
      var h = pix(HEART, 2, 'cat-heart'); h.style.left = (8 + i * 18 + rnd(8)) + 'px'; h.style.setProperty('--dx', (rnd(21) - 10) + 'px'); h.style.animationDelay = (i * 130) + 'ms';
      el.appendChild(h); setTimeout(function () { h.remove(); }, 1300 + i * 130);
    })(i);
  }
  function petLine() {
    try {
      var n = Ga.missing().length;
      if (n && Math.random() < 0.5) return n + ' day' + (n === 1 ? '' : 's') + ' to fill, meow';
      if (!St.isSetUp()) return 'set your pay first';
    } catch (e) {}
    return ['purr', 'purrr~', 'mrrp', 'more pets', 'nice work'][rnd(5)];
  }

  /* ---- playing with it ---- */
  function pet() {
    set2('pet', 1700, 'happy'); hearts(3); say(petLine(), 1900); draw();
    if (!St.lsGet(TIPKEY)) { St.lsSet(TIPKEY, '1'); setTimeout(function () { say('drag me · double-tap = fish', 3600); }, 2100); }
  }
  /* a fish drops near the cat; it walks over and eats it */
  function feed() {
    if (fish || C.state === 'hang' || C.state === 'air' || C.state === 'dizzy') return;
    var b = bounds(), mid = C.x + CW / 2, side = mid < (b.l + b.r + CW) / 2 ? 1 : -1, fx = clamp(mid + side * (70 + rnd(50)), b.l + 4, b.r + CW - 24);
    var f = pix(FISH, 2, 'cat-fish'); f.style.left = Math.round(fx) + 'px'; f.style.top = '-24px'; host.appendChild(f);
    fish = { el: f, x: fx, ready: false };
    f.getBoundingClientRect(); f.style.top = (b.floor + CH - 12) + 'px';
    C.dir = fx > mid ? 1 : -1; set2('meow', 700, 'happy'); say('fish!', 900); draw();
    setTimeout(function () { if (!fish) return; fish.ready = true; if (el && C.state !== 'hang' && C.state !== 'air') { chase(); draw(); } }, 650);
  }
  function tap() {
    var now = Date.now(), dbl = now - lastTap < 380; lastTap = now;
    if (dbl) { feed(); return; }
    if (C.state === 'dizzy') return;
    if (C.state === 'sleep') { set2('sit', 2600); say('...mrow?', 1500); draw(); return; }
    pet();
  }
  function land() {
    C.rot = 0; C.vx = 0; C.vy = 0;
    if (C.hit > 1.15) { set2('dizzy', 1900); say('@_@', 1500); } else { set2('meow', 1100, 'happy'); say(['oof', 'mrrp!', 'again!'][rnd(3)], 1100); }
    draw();
  }
  function fly(ts) {
    if (!el || C.state !== 'air') return;
    var dt = lastT ? Math.min(34, ts - lastT) : 16; lastT = ts; lastFrame = Date.now();
    if (step(dt)) raf = G.requestAnimationFrame(fly);
  }
  /* one physics step; false once the cat has landed */
  function step(dt) {
    var b = bounds();
    C.vy += 0.0028 * dt; C.x += C.vx * dt; C.top += C.vy * dt; C.rot += C.spin * dt;
    if (C.x < b.l) { C.x = b.l; C.vx = -C.vx * 0.55; C.spin = -C.spin * 0.6; }
    if (C.x > b.r) { C.x = b.r; C.vx = -C.vx * 0.55; C.spin = -C.spin * 0.6; }
    if (C.top < 0) { C.top = 0; C.vy = Math.abs(C.vy) * 0.4; }
    if (C.top >= b.floor) {
      C.top = b.floor; C.hit = Math.max(C.hit, C.vy);
      if (C.vy > 0.5) { C.vy = -C.vy * 0.42; C.vx *= 0.7; C.spin *= 0.6; } else { land(); return false; }
    }
    place(); return true;
  }
  function launch(vx, vy, thrown) {
    C.vx = vx; C.vy = vy; C.spin = thrown ? clamp(vx * 0.55, -1.1, 1.1) : 0; C.hit = 0; if (!thrown) C.rot = 0;
    set2('air', 600000); lastT = 0; lastFrame = Date.now(); G.cancelAnimationFrame(raf); raf = G.requestAnimationFrame(fly); draw();
  }
  function onDown(e) {
    if (e.button) return;
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
    G.cancelAnimationFrame(raf);
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - C.x, oy: e.clientY - C.top, moved: false, hist: [] };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved) {
      if (dx * dx + dy * dy < 49) return;
      drag.moved = true; el.classList.add('held'); set2('hang', 600000); say(['mew?!', 'put me down!', 'wheee'][rnd(3)], 1100);
    }
    var b = bounds(), nx = clamp(e.clientX - drag.ox, b.l, b.r), ny = clamp(e.clientY - drag.oy, 0, b.floor), now = G.performance.now(), last = drag.hist[drag.hist.length - 1];
    if (last && now > last.t && !reduced) C.rot = clamp(C.rot * 0.7 - ((nx - last.x) / (now - last.t)) * 16, -30, 30);   // the body swings behind the hand
    C.x = nx; C.top = ny; drag.hist.push({ t: now, x: nx, y: ny }); if (drag.hist.length > 6) drag.hist.shift();
    place();
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null; el.classList.remove('held'); try { el.releasePointerCapture(e.pointerId); } catch (x) {}
    if (!d.moved) { if (C.state === 'air') launch(0, 0, false); else tap(); return; }
    var h = d.hist, a = h[0], z = h[h.length - 1], dt = a && z ? z.t - a.t : 0, vx = 0, vy = 0;
    if (dt > 0 && G.performance.now() - z.t < 90) { vx = clamp((z.x - a.x) / dt, -2.6, 2.6); vy = clamp((z.y - a.y) / dt, -2.8, 2.8); }
    launch(vx, vy, !reduced && Math.sqrt(vx * vx + vy * vy) > 0.45);
  }

  /* ---- reactions to what was filled in on Home ---- */
  var COIN = ['.ttt.', 'tsttf', 'ttttf', 'ttttf', '.fff.'], SUN = ['...t...', '.t.t.t.', '..ttt..', 'ttttttt', '..ttt..', '.t.t.t.', '...t...'], CLOUD = ['..ccc....', '.ccccccc.', 'ccccccccc', 'ccccccccc', '.ccccccc.'],
    CROSS = ['..g..', '..g..', 'ggggg', '..g..', '..g..'], CHECK = ['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'], LOCK = ['..ccc..', '.c...c.', '.c...c.', 'ttttttt', 'tttkttt', 'tttkttt', 'ttttttt'];
  var CONF = ['#35C7DD', '#F6C343', '#FF7B63', '#57D496', '#A9AAF6', '#F58CA0'];
  function later(node, ms) { setTimeout(function () { node.remove(); }, ms); return node; }
  function label(text, cls) { var s = document.createElement('span'); s.className = cls; s.textContent = text; return s; }
  /* something small shown above the cat for a moment */
  function above(node, ms) { el.appendChild(node); return later(node, ms); }
  function moneyText(text, neg, big) { later(keepIn(el.appendChild(label(text, 'cat-rm' + (neg ? ' neg' : '') + (big ? ' big' : '')))), 1900); }
  /* a few sprites pop out of the cat */
  function pop(rows, n) {
    for (var i = 0; i < n; i++) {
      var c = pix(rows, 2, 'cat-fx cat-pop'); c.style.left = (24 + rnd(12)) + 'px'; c.style.top = '8px';
      c.style.setProperty('--dx', (rnd(81) - 40) + 'px'); c.style.setProperty('--dy', -(28 + rnd(26)) + 'px'); c.style.animationDelay = (i * 70) + 'ms';
      el.appendChild(c); later(c, 1100 + i * 70);
    }
  }
  /* sprites fall from the top of the screen to the ground */
  function rain(make, n) {
    var b = bounds(), fall = b.floor + CH + 16, wid = Math.max(60, G.innerWidth - b.l - 20);
    for (var i = 0; i < n; i++) {
      var c = make(i), d = rnd(900), t = 900 + rnd(700); c.classList.add('cat-fx', 'cat-rain');
      c.style.left = Math.round(b.l + 4 + Math.random() * wid) + 'px'; c.style.top = '-26px';
      c.style.setProperty('--fall', fall + 'px'); c.style.setProperty('--t', t + 'ms'); c.style.setProperty('--d', d + 'ms');
      host.appendChild(c); later(c, d + t + 80);
    }
  }
  function confetti(n) { rain(function (i) { var d = document.createElement('i'), s = 4 + rnd(2) * 2; d.style.width = s + 'px'; d.style.height = s + 'px'; d.style.background = CONF[i % CONF.length]; return d; }, n); }
  /* o: { pose, mood, ms, droop, prop, anim, dance, say } */
  function act(o) {
    var ms = o.ms || 1800;
    set2('react', ms, o.mood); C.pose = o.pose || ''; C.opt = { droop: !!o.droop, prop: o.prop || '' }; C.dance = !!o.dance;
    cv.className = 'cat-body' + (o.anim ? ' ' + o.anim : '');
    if (o.say) say(o.say, ms - 100);
    draw();
  }

  var Cat = {};
  /* The cat answers what was just saved for a day.
     kind: normal | ot | bigot | x2 | al | mc | leave | uph | upl | early | clear | locked
     o.rm: money gained (+) or lost (−) that day; o.left: missed days still to fill; o.allDone: that was the last missed day. */
  Cat.react = function (kind, o) {
    o = o || {};
    if (!host) return;
    var rm = o.rm || 0, money = rm ? (rm > 0 ? '+RM' : '−RM') + U.fm(Math.abs(rm)) : '';
    if (!el) { if (money) later(host.appendChild(label(money, 'cat-rm loose' + (rm < 0 ? ' neg' : ''))), 1900); return; }   // cat switched off: only the figure
    if (C.state === 'hang' || C.state === 'air') return;
    el.querySelectorAll('.cat-fx,.cat-rm').forEach(function (n) { n.remove(); });   // a new reaction replaces what is left of the last one
    if (o.allDone) { act({ mood: 'happy', dance: true, anim: 'hop2', ms: 2800, say: 'semua siap!' }); confetti(36); }
    else if (kind === 'normal') { act({ pose: 'stretch', ms: 1900, say: 'balik awal~' }); hearts(1); }
    else if (kind === 'ot') { act({ mood: 'happy', anim: 'hop', ms: 1700, say: 'nice!' }); pop(COIN, 4); }
    else if (kind === 'bigot') { act({ mood: 'coin', anim: 'hop2', ms: 2300, say: 'kaya!' }); rain(function () { return pix(COIN, 2, ''); }, 18); }
    else if (kind === 'x2') { act({ mood: 'happy', prop: 'crown', dance: true, ms: 2500, say: '2×!!' }); rain(function (i) { return pix(i % 3 ? COIN : STAR, 2, ''); }, 24); }
    else if (kind === 'al') { act({ pose: 'sleep', mood: 'shades', ms: 2700, say: 'cuti~' }); above(pix(SUN, 2, 'cat-fx cat-sun'), 2700); }
    else if (kind === 'mc') { act({ mood: 'sick', droop: true, prop: 'thermo', ms: 2400, say: 'rehat ye' }); above(pix(CROSS, 2, 'cat-fx cat-cross'), 1700); }
    else if (kind === 'leave') { act({ mood: 'happy', prop: 'wave', ms: 1700, say: 'ok!' }); }
    else if (kind === 'uph') { act({ mood: 'sad', droop: true, ms: 2000, say: 'aduh' }); above(pix(COIN, 2, 'cat-fx cat-gone'), 1300); }
    else if (kind === 'upl') {
      act({ mood: 'cry', droop: true, ms: 2700, say: 'sedih...' }); above(pix(CLOUD, 2, 'cat-fx cat-cloud'), 2700);
      for (var i = 0; i < 3; i++) { var dr = document.createElement('i'); dr.className = 'cat-fx cat-drop'; dr.style.left = (26 + i * 6) + 'px'; dr.style.animationDelay = (i * 160) + 'ms'; above(dr, 2700); }
    }
    else if (kind === 'early') {
      var b = bounds(), dir = C.x + CW / 2 < (b.l + b.r + CW) / 2 ? 1 : -1;
      C.dir = dir; C.target = clamp(C.x + dir * 80, b.l, b.r); set2('walk', 60000); C.speed = 1; say('shh...', 1700); draw();
    }
    else if (kind === 'clear') { act({ prop: 'wave', anim: 'tilt', ms: 1600, say: 'eh?' }); above(label('?', 'cat-fx cat-q'), 1600); }
    else if (kind === 'locked') { act({ mood: 'blink', anim: 'shake', ms: 1300, say: 'kunci tu' }); above(pix(LOCK, 2, 'cat-fx cat-lock'), 1300); }
    else return;
    if (money) moneyText(money, rm < 0, kind === 'bigot' || kind === 'x2');
    if (!o.allDone && o.left) { say('tinggal ' + o.left + ' lagi', 1900); above(pix(CHECK, 2, 'cat-fx cat-check'), 1500); }
  };
  Cat.on = function () { return St.lsGet(KEY) !== '0'; };
  Cat.set = function (on) { St.lsSet(KEY, on ? '1' : '0'); Cat.init(); };
  Cat.cheer = function () { if (!el || C.state === 'sleep' || C.state === 'hang' || C.state === 'air' || C.state === 'dizzy') return; set2('meow', 1600, 'happy'); hearts(2); say(['nice!', 'purr', 'saved'][rnd(3)], 1500); draw(); };
  Cat.say = say;
  /* Draw one pose onto any 32×24 canvas (used by the payday quest on Home). */
  Cat.sprite = function (canvas, pose, f, mood, opt) { compose(pose, f || 0, mood, opt); paint(canvas.getContext('2d'), false); };
  Cat.init = function () {
    host = document.getElementById('cat'); if (!host) return;
    clearInterval(timer); timer = null; G.cancelAnimationFrame(raf); host.innerHTML = ''; el = null; fish = null; drag = null;
    if (!Cat.on()) return;
    try { reduced = G.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    el = document.createElement('div'); el.className = 'cat';
    cv = document.createElement('canvas'); cv.className = 'cat-body'; cv.width = W; cv.height = H; el.appendChild(cv); ctx = cv.getContext('2d');
    host.appendChild(el);
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); }); el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var b = bounds(); C.x = clamp(b.l + 24 + rnd(60), b.l, b.r); C.top = b.floor; C.rot = 0; C.dir = 1; set2('sit', 2500); draw();
    timer = setInterval(tick, 150);
  };
  Ga.cat = Cat;
})(window);
