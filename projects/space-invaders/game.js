/* Space Invaders for davit.cc: a pixel Shiba guards the playground from a lavender fleet.
   One canvas, a fixed 480×640 logical screen scaled to fit, and a fixed-step simulation. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const W = 480, H = 640;               // logical screen size
  const P = 3;                          // logical units per sprite pixel
  const STEP = 1 / 120;                 // simulation step, seconds
  const HI_KEY = 'davit.cc/space-invaders/hi';
  const SANS = '"Geist", "Helvetica Neue", Arial, sans-serif';
  const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';

  const COLS = 8, ROWS = 5, COL_W = 48, ROW_H = 36, CELL_W = 36;
  const FLEET_Y = 112, DX = 6, DY = 12, EDGE = 12;
  const HUD_H = 58, UFO_Y = 68, BUNKER_Y = 462, PLAYER_Y = 536, GROUND_Y = 592;
  const PLAYER_SPEED = 230, BONE_SPEED = 600, MAX_BONES = 2, COOLDOWN = 0.3;

  const C = {
    bg: '#16161B', text: '#F4F4FA', dim: 'rgba(208,207,238,.5)', line: 'rgba(208,207,238,.16)',
    white: '#FFFFFF', mist: '#E9E8FC', lilac: '#D0CFEE', fur: '#B9B7E6', deep: '#8F8CC8',
    brick: ['#5A5890', '#605E98'], ink: '#111114', pink: '#F2A7B5', hole: '#2C2B38',
  };

  // ------------------------------------------------------------------ sprites
  // Each frame is a list of rows; characters map to colours through the palette.
  const ART = {
    squid: { pal: { X: C.mist }, frames: [
      ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.', 'X.X..X.X'],
      ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X', '.X....X.'],
    ] },
    crab: { pal: { X: C.lilac }, frames: [
      ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
      ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'],
    ] },
    octopus: { pal: { X: C.fur }, frames: [
      ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '...XX..XX...', '..XX.XX.XX..', 'XX........XX'],
      ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '..XXX..XXX..', '.XX..XX..XX.', '..XX....XX..'],
    ] },
    // the mystery ship: two frames so its little pink lights blink
    ufo: { pals: [{ X: C.deep, L: C.pink }, { X: C.deep, L: C.hole }], frames: [
      ['.....XXXXXX.....', '...XXXXXXXXXX...', '..XXXXXXXXXXXX..', '.XXLXXLXXLXXLXX.', 'XXXXXXXXXXXXXXXX', '..XXX..XX..XXX..', '...X........X...'],
    ] },
    boom: { pal: { X: C.mist }, frames: [
      ['...X...X...', 'X...X.X...X', '.X.......X.', '..X.....X..', 'XX.......XX', '..X.....X..', '.X..X.X..X.', 'X..X...X..X', '...X...X...'],
    ] },
    // the site's Shiba: lavender fur, pale inner ears, white mask, dark eyes and nose, pink tongue
    shiba: { pal: { F: C.fur, I: C.mist, W: C.white, E: C.ink, N: C.ink, D: C.ink, T: C.pink }, frames: [
      ['.FF.........FF.', '.FIF.......FIF.', '.FIIF.....FIIF.', '.FIIFFFFFFFIIF.', 'FFIFFFFFFFFFIFF',
       'FFFFFWFFFWFFFFF', 'FFFFFEFFFEFFFFF', 'FFFWWEFFFEWWFFF', 'FWWWWWWFWWWWWWF', 'WWWWWWNNNWWWWWW',
       'WWWWWWWNWWWWWWW', '.WWWWWDTDWWWWW.', '..WWWWWWWWWWW..'],
    ] },
    bone: { pal: { X: C.white }, frames: [['X.X', 'XXX', '.X.', '.X.', '.X.', '.X.', 'XXX', 'X.X']] },
    zig: { pal: { X: C.fur }, frames: [
      ['.X.', 'X..', '.X.', '..X', '.X.', 'X..', '.X.'],
      ['.X.', '..X', '.X.', 'X..', '.X.', '..X', '.X.'],
    ] },
    twist: { pal: { X: C.fur }, frames: [
      ['X.X', '.X.', 'X.X', '.X.', 'X.X', '.X.', 'X.X'],
      ['.X.', 'X.X', '.X.', 'X.X', '.X.', 'X.X', '.X.'],
    ] },
  };
  const dims = (name, px = P) => ({ w: ART[name].frames[0][0].length * px, h: ART[name].frames[0].length * px });

  const SHIBA = dims('shiba');                      // 45 × 39
  const BONE = dims('bone', 2), SHOT = dims('zig', 2);
  const UFO = dims('ufo'), BOOM = dims('boom');
  const TYPES = {
    squid:   { art: 'squid', pts: 30, color: C.mist, ...dims('squid') },
    crab:    { art: 'crab', pts: 20, color: C.lilac, ...dims('crab') },
    octopus: { art: 'octopus', pts: 10, color: C.fur, ...dims('octopus') },
  };
  const ROW_TYPES = ['squid', 'crab', 'crab', 'octopus', 'octopus'];

  // Bunkers: a 22×16 grid of P-sized blocks with an arch cut into the bottom.
  const BW = 22, BH = 16;
  const BUNKER_SHAPE = new Uint8Array(BW * BH).map((_, i) => {
    const x = i % BW, y = Math.floor(i / BW);
    const corner = Math.max(0, 4 - y);
    if (x < corner || x >= BW - corner) return 0;
    if (y >= 11 && Math.abs(x - (BW - 1) / 2) < 3.5 + (y - 11) * 0.6) return 0;
    return 1;
  });

  // ---------------------------------------------------------------------- DOM
  const root = document.getElementById('si');
  const screenEl = document.getElementById('si-screen');
  const canvas = document.getElementById('si-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const padEl = document.getElementById('si-pad');
  const hintEl = root.querySelector('.si-hint');
  const bar = document.querySelector('.lab-bar');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n, len = 5) => String(n).padStart(len, '0');
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const prune = list => { let j = 0; for (const o of list) if (!o.dead) list[j++] = o; list.length = j; };

  // ------------------------------------------------------------------- state
  let S = 1;        // device pixels per logical unit
  let unit = 1;     // css pixels per logical unit
  let ox = 0, oy = 0; // camera offset (screen shake)

  const game = { state: 'title', resumeTo: 'playing', t: 0, clock: 0, score: 0, hi: 0, best: 0, bestAtStart: 0, lives: 3, wave: 1, nextLife: 1500 };
  const player = { x: (W - SHIBA.w) / 2, alive: true, cool: 0, kick: 0 };
  const fleet = { list: [], alive: 0, total: ROWS * COLS, rowX: [], rowY: [], rowFrame: [], rowAlive: [], dir: 1, queue: [], drop: false, timer: 0, fireTimer: 0 };
  const bones = [], shots = [], particles = [], popups = [], booms = [];
  let bunkers = [];
  let ufo = null, ufoTimer = 15, shakeT = 0;

  // input
  const keys = { left: false, right: false, fire: false };   // keyboard
  const held = { left: false, right: false, fire: false };   // on-screen buttons
  let tapFire = 0;  // a tap asks for one shot; it stays valid for a moment if the cooldown is running
  let dragDX = 0;   // logical units dragged since the last step
  let drag = null;  // the pointer currently dragging on the screen

  // a fixed sprinkle of faint stars
  const stars = (() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 46 }, () => ({ x: rnd() * W, y: HUD_H + rnd() * (GROUND_Y - HUD_H - 20), s: rnd() < 0.2 ? 2 : 1.5, a: 0.08 + rnd() * 0.22, ph: rnd() * 6.3, sp: 0.6 + rnd() * 1.4 }));
  })();

  // ------------------------------------------------------------ high score
  function loadHi() {
    try { return Math.max(0, parseInt(localStorage.getItem(HI_KEY), 10) || 0); } catch { return 0; }
  }
  function saveHi() {
    if (game.hi <= game.best) return;
    game.best = game.hi;
    try { localStorage.setItem(HI_KEY, String(game.hi)); } catch { /* storage blocked: keep it in memory */ }
  }
  game.best = game.hi = loadHi();

  // ----------------------------------------------------------- sprite cache
  // Sprites are baked at device resolution with snapped pixel edges, then blitted at whole device pixels.
  const cache = new Map();
  function bake(rows, pal, px) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(rows[0].length * px * S));
    c.height = Math.max(1, Math.round(rows.length * px * S));
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      const y0 = Math.round(y * px * S), y1 = Math.round((y + 1) * px * S);
      for (let x = 0; x < row.length; x++) {
        const fill = pal[row[x]];
        if (!fill) continue;
        const x0 = Math.round(x * px * S), x1 = Math.round((x + 1) * px * S);
        g.fillStyle = fill;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    });
    return c;
  }
  function sprite(name, frame = 0, px = P) {
    const key = `${name}/${frame}/${px}`;
    let img = cache.get(key);
    if (!img) {
      const a = ART[name];
      img = bake(a.frames[frame % a.frames.length], a.pals ? a.pals[frame % a.pals.length] : a.pal, px);
      cache.set(key, img);
    }
    return img;
  }

  // ---------------------------------------------------------------- drawing
  function draw(img, x, y, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round((x + ox) * S), Math.round((y + oy) * S));
    ctx.globalAlpha = 1;
  }
  function rect(x, y, w, h, color, alpha = 1) {
    const x0 = Math.round((x + ox) * S), y0 = Math.round((y + oy) * S);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.max(1, Math.round((x + w + ox) * S) - x0), Math.max(1, Math.round((y + h + oy) * S) - y0));
    ctx.globalAlpha = 1;
  }
  function text(str, x, y, { size = 12, weight = 500, font = MONO, color = C.text, align = 'left', spacing = 0, alpha = 1 } = {}) {
    ctx.font = `${weight} ${size * S}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * S}px`;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(str, (x + ox) * S, (y + oy) * S);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ layout
  // Fit the 3:4 screen into the space under the top bar, leaving room for the hint or touch buttons.
  function layout() {
    const touch = root.classList.contains('is-touch');
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const side = touch && vw > vh * 1.1;
    root.classList.toggle('is-side', side);
    const top = Math.ceil(bar.getBoundingClientRect().bottom) + 2;
    root.style.setProperty('--top', `${top}px`);
    const gap = 14, bottom = 16;
    let below = 0;
    if (!side) {
      if (touch) below += padEl.offsetHeight + gap;
      below += hintEl.offsetHeight + gap;
    }
    const availW = vw - 32 - (side ? 2 * 150 : 0);
    const availH = vh - top - bottom - below;
    const fit = clamp(Math.min(availW / W, availH / H), 0.3, 1.5);
    const cw = Math.max(144, Math.floor((W * fit) / 3) * 3);  // a multiple of 3 keeps 3:4 exact
    const ch = (cw / 3) * 4;
    unit = cw / W;
    screenEl.style.width = `${cw}px`;
    screenEl.style.height = `${ch}px`;
    padEl.style.width = side ? '' : `${cw}px`;
    root.style.setProperty('--u', unit.toFixed(4));

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    S = canvas.width / W;
    ctx.imageSmoothingEnabled = false;
    cache.clear();
    for (const b of bunkers) b.dirty = true;
  }
  let layoutRaf = 0;
  function scheduleLayout() {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => { layoutRaf = 0; layout(); render(); });
  }

  // ------------------------------------------------------------- the waves
  function buildFleet() {
    fleet.list.length = 0;
    const span = (COLS - 1) * COL_W + CELL_W;
    const x0 = Math.round((W - span) / 2);
    const y0 = FLEET_Y + Math.min(game.wave - 1, 5) * DY;  // each wave starts a little lower
    for (let r = 0; r < ROWS; r++) {
      const type = TYPES[ROW_TYPES[r]];
      fleet.rowX[r] = x0; fleet.rowY[r] = y0; fleet.rowFrame[r] = 0; fleet.rowAlive[r] = COLS;
      for (let c = 0; c < COLS; c++) {
        fleet.list.push({ r, c, type, alive: true, ox: c * COL_W + (CELL_W - type.w) / 2, oy: r * ROW_H, x: 0, y: 0 });
      }
      placeRow(r);
    }
    fleet.alive = fleet.total = ROWS * COLS;
    fleet.dir = 1; fleet.queue.length = 0; fleet.drop = false;
    fleet.timer = 0.4; fleet.fireTimer = 1.2;
  }
  function placeRow(r) {
    for (const a of fleet.list) if (a.r === r) { a.x = fleet.rowX[r] + a.ox; a.y = fleet.rowY[r] + a.oy; }
  }
  function makeBunkers() {
    bunkers = [72, 184, 296, 408].map(cx => ({ x: cx - (BW * P) / 2, y: BUNKER_Y, cells: BUNKER_SHAPE.slice(), dirty: true, img: null }));
  }
  function setupWave() {
    buildFleet();
    makeBunkers();
    bones.length = shots.length = 0;
    ufo = null; ufoTimer = rand(12, 22);
    player.alive = true; player.x = (W - SHIBA.w) / 2; player.cool = 0;
  }

  // ------------------------------------------------------------- the fleet
  // The fleet moves one row at a time, bottom row first, like the arcade original.
  // Fewer aliens means shorter steps between moves, so it speeds up as it thins out.
  const stepInterval = () => Math.max(0.022, (0.03 + 0.52 * (fleet.alive / fleet.total) ** 1.5) * 0.86 ** (game.wave - 1));
  const aliveRows = () => fleet.rowAlive.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);

  function startPass() {
    let minX = Infinity, maxX = -Infinity;
    for (const a of fleet.list) if (a.alive) { minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x + a.type.w); }
    fleet.drop = fleet.dir > 0 ? maxX + DX > W - EDGE : minX - DX < EDGE;
    for (let r = ROWS - 1; r >= 0; r--) if (fleet.rowAlive[r] > 0) fleet.queue.push(r);
  }
  function fleetStep() {
    if (!fleet.queue.length) startPass();
    let r = fleet.queue.shift();
    while (r !== undefined && fleet.rowAlive[r] === 0) r = fleet.queue.shift();
    if (r === undefined) return;
    if (fleet.drop) fleet.rowY[r] += DY; else fleet.rowX[r] += DX * fleet.dir;
    fleet.rowFrame[r] ^= 1;
    placeRow(r);
    if (!fleet.queue.length && fleet.drop) fleet.dir *= -1;

    for (const a of fleet.list) {
      if (!a.alive || a.r !== r) continue;
      if (a.y + 24 >= BUNKER_Y) eraseBunkers(a);           // aliens chew through the bunkers
      if (a.y + 24 >= PLAYER_Y + 8) { invade(); return; }  // they reached the Shiba
    }
  }
  function updateFleet(dt) {
    fleet.timer -= dt;
    for (let guard = 0; fleet.timer <= 0 && guard < 4; guard++) {
      fleetStep();
      if (game.state !== 'playing') return;
      fleet.timer += stepInterval() / Math.max(1, aliveRows());
    }
    if (fleet.timer < 0) fleet.timer = 0;

    fleet.fireTimer -= dt;
    if (fleet.fireTimer <= 0) {
      fleet.fireTimer = Math.max(0.28, rand(0.65, 1.6) * 0.9 ** (game.wave - 1));
      if (shots.length < Math.min(3 + Math.floor((game.wave - 1) / 2), 5)) fleetFire();
    }
  }
  function fleetFire() {
    // the lowest alien of a column shoots; often the column above the Shiba
    const bottom = [];
    for (const a of fleet.list) if (a.alive && (!bottom[a.c] || a.r > bottom[a.c].r)) bottom[a.c] = a;
    const cands = bottom.filter(Boolean);
    if (!cands.length) return;
    let a = cands[Math.floor(Math.random() * cands.length)];
    if (Math.random() < Math.min(0.25 + 0.05 * game.wave, 0.55)) {
      const px = player.x + SHIBA.w / 2;
      const dist = b => Math.abs(b.x + b.type.w / 2 - px);
      a = cands.reduce((best, b) => (dist(b) < dist(best) ? b : best));
    }
    shots.push({ x: a.x + a.type.w / 2 - SHOT.w / 2, y: a.y + 22, kind: Math.random() < 0.55 ? 'zig' : 'twist', t: 0, dead: false });
  }

  // ------------------------------------------------------------- bunkers
  function bunkerHit(r, dir) {
    for (const b of bunkers) {
      if (!overlap(r, { x: b.x, y: b.y, w: BW * P, h: BH * P })) continue;
      const c0 = clamp(Math.floor((r.x - b.x) / P), 0, BW - 1), c1 = clamp(Math.floor((r.x + r.w - 0.01 - b.x) / P), 0, BW - 1);
      const r0 = clamp(Math.floor((r.y - b.y) / P), 0, BH - 1), r1 = clamp(Math.floor((r.y + r.h - 0.01 - b.y) / P), 0, BH - 1);
      // scan from the side the shot came from, so the dent lands where it first touched
      for (let i = 0; i <= r1 - r0; i++) {
        const y = dir < 0 ? r1 - i : r0 + i;
        for (let x = c0; x <= c1; x++) {
          if (b.cells[y * BW + x]) { erode(b, x, y); return true; }
        }
      }
    }
    return false;
  }
  function erode(b, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= BW || y >= BH) continue;
        const d = Math.hypot(dx, dy);
        if (d <= 1.05 || (d <= 2.3 && Math.random() < 0.45)) b.cells[y * BW + x] = 0;
      }
    }
    b.dirty = true;
    burst(b.x + (cx + 0.5) * P, b.y + (cy + 0.5) * P, C.deep, 5, 60, 2);
  }
  function eraseBunkers(a) {
    const r = { x: a.x, y: a.y, w: a.type.w, h: 24 };
    for (const b of bunkers) {
      if (!overlap(r, { x: b.x, y: b.y, w: BW * P, h: BH * P })) continue;
      for (let y = 0; y < BH; y++) {
        for (let x = 0; x < BW; x++) {
          const cx = b.x + x * P, cy = b.y + y * P;
          if (b.cells[y * BW + x] && cx < r.x + r.w && cx + P > r.x && cy < r.y + r.h && cy + P > r.y) { b.cells[y * BW + x] = 0; b.dirty = true; }
        }
      }
    }
  }
  function bakeBunker(b) {
    const c = b.img || document.createElement('canvas');
    c.width = Math.round(BW * P * S);
    c.height = Math.round(BH * P * S);
    const g = c.getContext('2d');
    const gap = S * P >= 5 ? 1 : 0;
    for (let y = 0; y < BH; y++) {
      const y0 = Math.round(y * P * S), y1 = Math.round((y + 1) * P * S);
      for (let x = 0; x < BW; x++) {
        if (!b.cells[y * BW + x]) continue;
        const x0 = Math.round(x * P * S), x1 = Math.round((x + 1) * P * S);
        // each block keeps a hairline gap so the bunker reads as little bricks
        g.fillStyle = C.brick[(x + y) & 1];
        g.fillRect(x0, y0, Math.max(1, x1 - x0 - gap), Math.max(1, y1 - y0 - gap));
      }
    }
    b.img = c;
    b.dirty = false;
  }

  // ---------------------------------------------------------------- effects
  function burst(x, y, color, n, speed = 90, sz = 3) {
    for (let i = 0; i < n && particles.length < 420; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.3, 0.75), c: color, s: Math.random() < 0.5 ? sz : sz * 0.67, dead: false });
    }
  }
  function popup(str, x, y) { popups.push({ str, x, y, t: 0, dead: false }); }
  function shake() { shakeT = 0.45; }

  function updateFx(dt) {
    const drag = Math.exp(-3.2 * dt);
    for (const p of particles) {
      p.t += dt;
      if (p.t >= p.life) { p.dead = true; continue; }
      p.vx *= drag; p.vy = p.vy * drag + 40 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const b of booms) if ((b.t += dt) > 0.2) b.dead = true;
    for (const p of popups) if ((p.t += dt) > 1) p.dead = true;
    prune(particles); prune(booms); prune(popups);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  }

  // ---------------------------------------------------------------- scoring
  function addScore(n) {
    game.score += n;
    game.hi = Math.max(game.hi, game.score);
    if (game.score >= game.nextLife) {
      game.nextLife += 1500;
      if (game.lives < 5) { game.lives++; popup('+1 life', player.x + SHIBA.w / 2, PLAYER_Y - 10); }
    }
  }
  function killAlien(a) {
    a.alive = false;
    fleet.alive--; fleet.rowAlive[a.r]--;
    addScore(a.type.pts);
    const cx = a.x + a.type.w / 2, cy = a.y + 12;
    booms.push({ x: cx, y: cy, t: 0, dead: false });
    burst(cx, cy, a.type.color, 10, 100);
  }
  function killUfo() {
    const pts = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
    const cx = ufo.x + UFO.w / 2, cy = UFO_Y + UFO.h / 2;
    addScore(pts);
    popup(String(pts), cx, cy + 4);
    burst(cx, cy, C.deep, 14, 120);
    burst(cx, cy, C.pink, 4, 80, 2);
    ufo = null; ufoTimer = rand(18, 28);
  }

  // ------------------------------------------------------------------ player
  function movePlayer(dt) {
    const dir = (keys.right || held.right ? 1 : 0) - (keys.left || held.left ? 1 : 0);
    player.x = clamp(player.x + dir * PLAYER_SPEED * dt + dragDX, EDGE, W - EDGE - SHIBA.w);
    dragDX = 0;
  }
  function shoot(dt) {
    player.cool -= dt;
    player.kick = Math.max(0, player.kick - dt);
    const want = keys.fire || held.fire || tapFire > 0;
    if (!want || player.cool > 0 || bones.length >= MAX_BONES) return;
    bones.push({ x: player.x + (SHIBA.w - BONE.w) / 2, y: PLAYER_Y - BONE.h + 4, dead: false });
    player.cool = COOLDOWN;
    player.kick = 0.09;  // a tiny recoil
    tapFire = 0;
  }
  const playerRect = () => ({ x: player.x + 5, y: PLAYER_Y + 4, w: SHIBA.w - 10, h: SHIBA.h - 6 });

  function explodePlayer() {
    player.alive = false;
    const cx = player.x + SHIBA.w / 2, cy = PLAYER_Y + SHIBA.h / 2;
    burst(cx, cy, C.fur, 22, 170);
    burst(cx, cy, C.white, 14, 130);
    burst(cx, cy, C.mist, 10, 90, 2);
    shots.length = 0;
    shake();
  }
  function playerHit() {
    game.lives = Math.max(0, game.lives - 1);
    explodePlayer();
    setState('dying');
  }
  function invade() {
    game.lives = 0;
    explodePlayer();
    setState('dying');
  }

  // ------------------------------------------------------- bones and shots
  function alienAt(r) {
    for (const a of fleet.list) {
      if (a.alive && r.x < a.x + a.type.w && r.x + r.w > a.x && r.y < a.y + 24 && r.y + r.h > a.y) return a;
    }
    return null;
  }
  function updateBones(dt) {
    for (const b of bones) {
      b.y -= BONE_SPEED * dt;
      const r = { x: b.x, y: b.y, w: BONE.w, h: BONE.h };
      if (b.y < HUD_H) { b.dead = true; burst(b.x + BONE.w / 2, HUD_H, C.lilac, 3, 40, 2); continue; }
      const a = alienAt(r);
      if (a) { b.dead = true; killAlien(a); continue; }
      if (ufo && overlap(r, { x: ufo.x, y: UFO_Y, w: UFO.w, h: UFO.h })) { b.dead = true; killUfo(); continue; }
      const s = shots.find(sh => !sh.dead && overlap(r, { x: sh.x, y: sh.y, w: SHOT.w, h: SHOT.h }));
      if (s) { s.dead = b.dead = true; burst(b.x + BONE.w / 2, b.y, C.mist, 6, 70, 2); continue; }
      if (bunkerHit(r, -1)) b.dead = true;
    }
    prune(bones);
  }
  function updateShots(dt) {
    const speed = Math.min(170 + 14 * (game.wave - 1), 260);
    for (const s of shots) {
      if (s.dead) continue;
      s.y += speed * dt; s.t += dt;
      const r = { x: s.x, y: s.y, w: SHOT.w, h: SHOT.h };
      if (s.y + SHOT.h >= GROUND_Y) { s.dead = true; burst(s.x + SHOT.w / 2, GROUND_Y - 1, C.lilac, 4, 50, 2); continue; }
      if (bunkerHit(r, 1)) { s.dead = true; continue; }
      if (game.state === 'playing' && player.alive && overlap(r, playerRect())) { s.dead = true; playerHit(); }
    }
    prune(shots);
  }
  function updateUfo(dt) {
    if (!ufo) {
      ufoTimer -= dt;
      if (ufoTimer <= 0) {
        ufoTimer = rand(18, 28);
        if (fleet.alive >= 8) { const dir = Math.random() < 0.5 ? 1 : -1; ufo = { x: dir > 0 ? -UFO.w : W, dir }; }
      }
      return;
    }
    ufo.x += ufo.dir * 95 * dt;
    if (ufo.x > W + 4 || ufo.x < -UFO.w - 4) ufo = null;
  }

  // ------------------------------------------------------------ state flow
  function setState(s) {
    game.state = s;
    game.t = 0;
    sync();
  }
  function startGame(force = false) {
    if (!(game.state === 'title' || (game.state === 'over' && (force || game.t > 0.7)))) return;
    Object.assign(game, { score: 0, lives: 3, wave: 1, nextLife: 1500, bestAtStart: game.best });
    particles.length = popups.length = booms.length = 0;
    root.classList.remove('is-record');
    setupWave();
    setState('ready');
    if (screenEl.contains(document.activeElement)) screenEl.focus({ preventScroll: true });
    wake();
  }
  function respawn() {
    player.alive = true;
    player.x = (W - SHIBA.w) / 2;
    fleet.fireTimer = 1.1;
    setState('playing');
  }
  function waveCleared() {
    shots.length = bones.length = 0;
    ufo = null;
    setState('cleared');
  }
  function gameOver() {
    saveHi();
    document.getElementById('si-final-score').textContent = pad(game.score);
    document.getElementById('si-final-wave').textContent = pad(game.wave, 2);
    root.classList.toggle('is-record', game.score > game.bestAtStart && game.score > 0);
    setState('over');
  }
  const ACTIVE = ['ready', 'playing', 'dying', 'cleared'];
  function pause() {
    if (!ACTIVE.includes(game.state)) return;
    game.resumeTo = game.state;
    game.state = 'paused';
    releaseAll();
    saveHi();
    sync();
  }
  function resume() {
    if (game.state !== 'paused') return;
    game.state = game.resumeTo;
    sync();
    if (screenEl.contains(document.activeElement)) screenEl.focus({ preventScroll: true });
    wake();
  }
  const togglePause = () => (game.state === 'paused' ? resume() : pause());

  // the "main button": start, restart, resume or shoot depending on the state
  function primary() {
    if (game.state === 'title' || game.state === 'over') startGame();
    else if (game.state === 'paused') resume();
    else if (game.state === 'playing') tapFire = 0.2;
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    game.t += dt;
    game.clock += dt;
    updateFx(dt);
    switch (game.state) {
      case 'ready':
        movePlayer(dt);
        if (game.t > 1.5) setState('playing');
        break;
      case 'playing':
        movePlayer(dt);
        shoot(dt);
        updateFleet(dt);
        updateUfo(dt);
        updateBones(dt);
        updateShots(dt);
        if (game.state === 'playing' && fleet.alive === 0) waveCleared();
        break;
      case 'dying':
        updateBones(dt);
        if (game.t > 1.4) (game.lives > 0 ? respawn() : gameOver());
        break;
      case 'cleared':
        movePlayer(dt);
        if (game.t > 1.8) { game.wave++; setupWave(); setState('ready'); }
        break;
    }
    tapFire = Math.max(0, tapFire - dt);
    dragDX = 0;
  }

  // ---------------------------------------------------------------- render
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const still = reduceMotion.matches;
    for (const s of stars) {
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(game.clock * s.sp + s.ph);
      rect(s.x, s.y, s.s, s.s, C.lilac, s.a * tw);
    }

    // screen shake moves the playfield, never the HUD
    if (shakeT > 0 && !still) {
      const k = (shakeT / 0.45) ** 2 * 6;
      ox = rand(-k, k); oy = rand(-k, k);
    }

    if (game.state === 'title') drawTitle();
    else drawField();

    for (const p of particles) rect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s, p.c, 1 - (p.t / p.life) ** 2);
    for (const p of popups) text(p.str, p.x, p.y - p.t * 22, { size: 13, color: C.mist, align: 'center', alpha: Math.min(1, (1 - p.t) * 2) });

    ox = oy = 0;
    drawHud();
    drawBanner();
  }

  function drawField() {
    for (const b of bunkers) {
      if (b.dirty || !b.img) bakeBunker(b);
      draw(b.img, b.x, b.y);
    }
    for (const a of fleet.list) if (a.alive) draw(sprite(a.type.art, fleet.rowFrame[a.r]), a.x, a.y);
    if (ufo) draw(sprite('ufo', Math.floor(game.clock * 5) % 2), ufo.x, UFO_Y);
    for (const b of booms) draw(sprite('boom'), b.x - BOOM.w / 2, b.y - BOOM.h / 2, 1 - b.t / 0.2);
    if (player.alive && game.state !== 'over') draw(sprite('shiba'), player.x, PLAYER_Y + (player.kick > 0 ? 2 : 0));
    for (const b of bones) draw(sprite('bone', 0, 2), b.x, b.y);
    for (const s of shots) draw(sprite(s.kind, Math.floor(s.t * 10) % 2, 2), s.x, s.y);
  }

  function drawTitle() {
    const bob = reduceMotion.matches ? 0 : Math.round(Math.sin(game.clock * 2.4) * 3);
    const big = dims('shiba', 5);
    draw(sprite('shiba', 0, 5), (W - big.w) / 2, 96 + bob);

    // score table
    const table = [['ufo', '? mystery'], ['squid', '30 pts'], ['crab', '20 pts'], ['octopus', '10 pts']];
    const frame = Math.floor(game.clock * 1.6) % 2;
    table.forEach(([name, label], i) => {
      const y = 418 + i * 40, sz = dims(name);
      draw(sprite(name, frame), 200 - sz.w / 2, y - sz.h / 2);
      text(`= ${label}`, 232, y + 5, { size: 13, color: C.lilac, alpha: 0.85 });
    });
  }

  function drawHud() {
    text('SCORE', 22, 27, { size: 11, color: C.dim, spacing: 1.8 });
    text(pad(game.score), 22, 48, { size: 19, color: C.text });
    text('HI SCORE', W - 20, 27, { size: 11, color: C.dim, spacing: 1.8, align: 'right' });
    text(pad(game.hi), W - 22, 48, { size: 19, color: C.text, align: 'right' });

    rect(16, GROUND_Y, W - 32, 1.5, C.line);
    const mini = sprite('shiba', 0, 1.2);
    for (let i = 0; i < game.lives; i++) draw(mini, 22 + i * 25, GROUND_Y + 16);
    text('WAVE', W - 50, GROUND_Y + 30, { size: 11, color: C.dim, spacing: 1.8, align: 'right' });
    text(pad(game.wave, 2), W - 22, GROUND_Y + 30, { size: 13, color: C.text, align: 'right' });
  }

  function drawBanner() {
    let title, sub, dur;
    if (game.state === 'ready') { title = `Wave ${game.wave}`; sub = 'GET READY'; dur = 1.5; }
    else if (game.state === 'cleared') { title = 'Wave cleared'; sub = 'THE NEXT ONE IS FASTER'; dur = 1.8; }
    else return;
    const a = clamp(Math.min(game.t / 0.2, (dur - game.t) / 0.25), 0, 1);
    text(title, W / 2, 408, { font: SANS, size: 34, color: C.white, align: 'center', spacing: -1.2, alpha: a });
    text(sub, W / 2, 434, { size: 11, color: C.dim, align: 'center', spacing: 1.8, alpha: a });
  }

  // ------------------------------------------------------------------ loop
  let raf = 0, last = 0, acc = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (game.state !== 'paused') {
      acc += dt;
      while (acc >= STEP) { update(STEP); acc -= STEP; }
    }
    render();
    sync();
    if (game.state !== 'paused' && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || document.hidden) return;
    last = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  }

  // mirror a few values onto the root, for CSS and for anyone peeking at the DOM
  const shown = {};
  function sync() {
    const vals = { state: game.state, score: game.score, lives: game.lives, wave: game.wave, aliens: fleet.alive };
    for (const k in vals) {
      const v = String(vals[k]);
      if (shown[k] !== v) { shown[k] = v; root.dataset[k] = v; }
    }
  }

  // ------------------------------------------------------------------ input
  const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire', ArrowUp: 'fire', KeyW: 'fire' };
  function releaseAll() {
    keys.left = keys.right = keys.fire = false;
    held.left = held.right = held.fire = false;
    tapFire = 0; dragDX = 0; drag = null;
    padEl.querySelectorAll('.is-down').forEach(b => b.classList.remove('is-down'));
  }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onControl = e.target instanceof Element && e.target.closest('a, button');
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (e.code === 'Escape' && game.state !== 'paused' && !ACTIVE.includes(game.state)) return;
      e.preventDefault();
      if (!e.repeat) togglePause();
      return;
    }
    const k = KEYS[e.code];
    if (k) {
      if (onControl && e.code === 'Space') return;  // a focused button handles its own Space
      e.preventDefault();
      keys[k] = true;
      if (k === 'fire' && !e.repeat) primary();
    } else if (e.code === 'Enter' && !onControl && !e.repeat) {
      primary();
    }
  });
  addEventListener('keyup', e => {
    const k = KEYS[e.code];
    if (k) keys[k] = false;
  });
  addEventListener('blur', () => { keys.left = keys.right = keys.fire = false; });

  document.getElementById('si-start').addEventListener('click', () => startGame());
  document.getElementById('si-again').addEventListener('click', () => startGame(true));
  document.getElementById('si-resume').addEventListener('click', resume);

  function enableTouch() {
    if (root.classList.contains('is-touch')) return;
    root.classList.add('is-touch');
    layout();
    render();
  }

  // on-screen buttons: held while the finger is down
  padEl.querySelectorAll('[data-key]').forEach(btn => {
    const k = btn.dataset.key;
    const up = () => {
      btn.classList.remove('is-down');
      if (k !== 'pause') held[k] = false;
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      btn.classList.add('is-down');
      if (k === 'pause') togglePause();
      else {
        held[k] = true;
        if (k === 'fire') primary();
      }
    });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  });

  // dragging on the screen moves the Shiba; a tap shoots
  screenEl.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (game.state === 'title' || game.state === 'paused') { e.preventDefault(); primary(); return; }
    if (!ACTIVE.includes(game.state)) return;
    e.preventDefault();
    drag = { id: e.pointerId, x: e.clientX };
    try { screenEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (game.state === 'playing') tapFire = 0.2;
  });
  screenEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    dragDX += (e.clientX - drag.x) / unit;
    drag.x = e.clientX;
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  screenEl.addEventListener('pointerup', endDrag);
  screenEl.addEventListener('pointercancel', endDrag);

  // no page scroll, pinch or long-press menus around the game
  root.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  root.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouch(); }, { passive: true, capture: true });

  // pause when the tab is hidden; resume drawing when it comes back
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : wake()));
  addEventListener('pagehide', saveHi);
  addEventListener('resize', scheduleLayout);
  if (window.visualViewport) visualViewport.addEventListener('resize', scheduleLayout);
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`500 16px ${MONO}`), document.fonts.load(`500 16px ${SANS}`)]).then(() => render(), () => {});
  }

  // ------------------------------------------------------------------- boot
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) root.classList.add('is-touch');
  layout();
  sync();
  render();
  wake();
})();
