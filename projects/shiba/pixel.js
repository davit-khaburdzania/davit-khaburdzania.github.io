// Pixel Shiba: the dog is described as simple shapes, rasterized onto a 64x64 grid and shaded with a small palette.
// Moving a part (head tilt, ears, tail) re-rasterizes it, so every frame stays clean pixel art.
export const W = 64, H = 64;

// materials
const FUR = 1, CREAM = 2, EAR = 3;
// palette slots
export const P = {clear:0, line:1, f0:2, f1:3, f2:4, f3:5, c0:6, c1:7, c2:8, ink:9, glint:10, ear:11, pink:12, shadow:13, brow:14};

const L = (() => { const v = [-.5, -.72, .78]; const m = Math.hypot(...v); return v.map(x => x / m); })();
const rot = (x, y, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };

const ell = (cx, cy, rx, ry, mat, vol, extra) => Object.assign({k:"e", cx, cy, rx, ry, mat, vol}, extra);
const cap = (x1, y1, x2, y2, r, mat, vol, extra) => Object.assign({k:"c", x1, y1, x2, y2, r, mat, vol}, extra);
const poly = (pts, mat, vol, extra) => Object.assign({k:"p", pts, mat, vol}, extra);
const ring = (cx, cy, r1, r2, a0, a1, mat, vol, extra) => Object.assign({k:"r", cx, cy, r1, r2, a0, a1, mat, vol}, extra);

const inside = (s, x, y) => {
  if (s.k === "e") { const u = (x - s.cx) / s.rx, v = (y - s.cy) / s.ry; return u * u + v * v <= 1; }
  if (s.k === "r") {
    const d = Math.hypot(x - s.cx, y - s.cy); if (d < s.r1 || d > s.r2) return false;
    if (s.a0 === undefined) return true; let a = Math.atan2(y - s.cy, x - s.cx); if (a < s.a0) a += Math.PI * 2; return a <= s.a1;
  }
  if (s.k === "c") {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - s.x1 - dx * t, y - s.y1 - dy * t) <= s.r;
  }
  let c = false; const p = s.pts;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
};

// rounded triangle for ears, pointing up from a base centred on (0,0)
const earPts = (w, h, n = 18) => {
  const q = (p0, p1, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  const a = [-w / 2, 0], tip = [0, -h], b = [w / 2, 0], c1 = [-w / 2 + .6, -h * .6], c2 = [w / 2 - .4, -h * .55];
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(q(a, c1, tip, i / n));
  for (let i = 1; i <= n; i++) pts.push(q(tip, c2, b, i / n));
  pts.push([0, 1.5]);
  return {k:"p", pts};
};

// Layout (head-local and body coordinates are the same at rest)
const CX = 32.5, GROUND = 61, NECK = [32.5, 30];
const EYE_Y = 19.5, EYE_DX = 5, NOSE_Y = 24.2;

const mat = new Uint8Array(W * H), lev = new Float32Array(W * H);
// which part each pixel belongs to after the last render: 1 tail, 2 body, 3 legs, 4 head, 5 ears
export const groups = new Uint8Array(W * H);
// where the nose ended up in the last render
export const face = {nose:[0, 0], eyes:[[0, 0], [0, 0]]};

export function render(p = {}, out = new Uint8Array(W * H)) {
  const o = Object.assign({hx:0, hy:0, tilt:0, earL:0, earR:0, earBack:0, tail:0, breath:0, eyes:"open", lx:0, ly:0, mouth:"closed", squish:0}, p);
  const grp = groups; mat.fill(0); grp.fill(0); out.fill(0);

  const headVol = {cx:CX, cy:20.5, rx:15, ry:12.5}, bodyVol = {cx:CX, cy:45, rx:15.5, ry:16.5};
  const tv = {cx:46.6, cy:36.4, rx:6.4, ry:6};
  const tailParts = [
    ell(46.6, 36.4, 6, 5.4, FUR, tv),
    ring(46.6, 37.2, 4.1, 6.4, .2, 2.3, CREAM, tv),
    ring(46.1, 36.2, 1.4, 2.4, 2.8, 2.8 + 4.1, FUR, tv, {force:-1}),
  ];
  const bodyParts = [
    ell(CX, 45.5, 12, 15.5, FUR, bodyVol),
    ell(CX, 31.5, 9.6, 5, FUR, bodyVol),
    ell(22.4, 54, 7, 7, FUR, bodyVol),
    ell(42.6, 54, 7, 7, FUR, bodyVol),
    ell(20.6, 59.6, 3.9, 1.8, CREAM, bodyVol),
    ell(44.4, 59.6, 3.9, 1.8, CREAM, bodyVol),
    ell(CX, 39, 7.6, 12.5, CREAM, bodyVol),
    ell(CX, 54.5, 4.6, 6.5, CREAM, bodyVol, {force:.3}),
  ];
  const legParts = [
    cap(28.6, 43.5, 28.6, 58.4, 2.6, CREAM, {cx:28.6, cy:50, rx:4, ry:14}),
    cap(36.4, 43.5, 36.4, 58.4, 2.6, CREAM, {cx:36.4, cy:50, rx:4, ry:14}),
    ell(28.4, 59.7, 3.2, 1.7, CREAM, bodyVol),
    ell(36.6, 59.7, 3.2, 1.7, CREAM, bodyVol),
  ];
  const headParts = [
    ell(CX, 18.8, 11.2, 9.4, FUR, headVol),
    ell(25, 22.8, 7.8, 5.9, FUR, headVol),
    ell(40, 22.8, 7.8, 5.9, FUR, headVol),
    poly([[18.2, 20.6], [16.4, 26.4], [19.6, 25.6], [19.4, 28], [23, 26.4]], FUR, headVol),
    poly([[46.8, 20.6], [48.6, 26.4], [45.4, 25.6], [45.6, 28], [42, 26.4]], FUR, headVol),
    ell(26.2, 24.8, 6, 3.6, CREAM, headVol),
    ell(38.8, 24.8, 6, 3.6, CREAM, headVol),
    poly([[18.6, 24.6], [17.6, 27.2], [21, 26.4], [21.4, 28.6], [25, 27.6]], CREAM, headVol),
    poly([[46.4, 24.6], [47.4, 27.2], [44, 26.4], [43.6, 28.6], [40, 27.6]], CREAM, headVol),
    ell(CX, 24.6, 4.6, 3.6, CREAM, headVol),
    ell(CX, 27.4, 5.4, 2.5, CREAM, headVol),
    // the red bridge of the nose, narrowing down to the nose
    poly([[29.6, 16.5], [35.4, 16.5], [34.2, 21], [33.2, 23.4], [31.8, 23.4], [30.8, 21]], FUR, headVol),
  ];

  const sq = o.squish;
  const headT = (x, y) => { // world -> head local
    let u = x - o.hx, v = y - o.hy - o.breath * .5;
    [u, v] = rot(u, v, NECK[0], NECK[1], -o.tilt);
    v = NECK[1] + (v - NECK[1]) / (1 - sq * .08); u = CX + (u - CX) / (1 + sq * .05);
    return [u, v];
  };
  const ears = [
    {base:[25, 12.6], ang:-.3 + o.earL - o.earBack * .55, s:-1},
    {base:[40, 12.6], ang:.3 + o.earR + o.earBack * .55, s:1},
  ];
  const outer = earPts(10.6, 8.8 - o.earBack * 2.4), inner = earPts(5.4, 5.6 - o.earBack * 1.8);

  const put = (x, y, s, l, g, m = s.mat) => { const i = y * W + x; mat[i] = m; lev[i] = s.force !== undefined ? s.force : l; grp[i] = g; };
  const shadeAt = (s, u, v, a) => {
    const vol = s.vol || s;
    let nx = (u - vol.cx) / vol.rx, ny = (v - vol.cy) / vol.ry; const r = nx * nx + ny * ny;
    if (r > 1) { const m = Math.sqrt(r); nx /= m; ny /= m; }
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    if (a) [nx, ny] = rot(nx, ny, 0, 0, a);
    return nx * L[0] + ny * L[1] + nz * L[2];
  };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + .5, py = y + .5;
    const by = GROUND - (GROUND - py) / (1 + o.breath * .014);      // breathing lifts the body a hair
    const [tu, tv2] = rot(px, by, 42, 42, -o.tail);                  // tail swings from its root
    for (const s of tailParts) if (inside(s, tu, tv2)) put(x, y, s, shadeAt(s, tu, tv2), 1);
    for (const s of bodyParts) if (inside(s, px, by)) put(x, y, s, shadeAt(s, px, by), 2);
    for (const s of legParts) if (inside(s, px, by)) {
      const outerEdge = s.k === "c" && (px - s.x1) * (s.x1 < CX ? -1 : 1) > 1.4 && by < 55;
      put(x, y, s, shadeAt(s, px, by), 3, outerEdge ? FUR : s.mat);
    }
    const [hu, hv] = headT(px, py);
    for (const e of ears) {
      const [eu, ev] = rot(hu, hv, e.base[0], e.base[1], -e.ang);
      const lu = eu - e.base[0], lv = ev - e.base[1];
      if (inside(outer, lu, lv)) {
        const isIn = inside(inner, lu - e.s * .3, lv + 1);
        const l = .62 - lu * e.s * .08 - (e.s > 0 ? .2 : 0) + (-lv) * .02;
        put(x, y, {}, isIn ? l : l + .05, 5, isIn ? EAR : FUR);
      }
    }
    for (const s of headParts) if (inside(s, hu, hv)) put(x, y, s, shadeAt(s, hu, hv, o.tilt), 4);
  }

  // quantize into palette slots
  for (let i = 0; i < W * H; i++) {
    const m = mat[i], l = lev[i];
    if (!m) continue;
    if (m === FUR) out[i] = l > .86 ? P.f3 : l > .52 ? P.f2 : l > .2 ? P.f1 : P.f0;
    else if (m === CREAM) out[i] = l > .6 ? P.c2 : l > .25 ? P.c1 : P.c0;
    else out[i] = P.ear;
  }
  // contact shadow under the chin and the cheeks
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, g = grp[i];
    if (!mat[i] || g >= 4) continue;
    if (grp[i - W] >= 4) out[i] = mat[i] === CREAM ? P.c0 : P.f0;
    else if (y > 1 && grp[i - 2 * W] >= 4 && mat[i] === FUR) out[i] = P.f0;
  }
  // a darker seam where the front legs meet the chest and the haunches
  for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (grp[i] === 2 && mat[i] && (grp[i - 1] === 3 || grp[i + 1] === 3)) out[i] = mat[i] === CREAM ? P.c0 : P.f0;
  }
  // outline around the silhouette
  const sil = Uint8Array.from(out, v => v ? 1 : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (sil[i]) continue;
    if ((x > 0 && sil[i - 1]) || (x < W - 1 && sil[i + 1]) || (y > 0 && sil[i - W]) || (y < H - 1 && sil[i + W])) out[i] = P.line;
  }

  // face, stamped at head-local positions so it follows the head
  const toWorld = (u, v) => {
    u = CX + (u - CX) * (1 + sq * .05); v = NECK[1] + (v - NECK[1]) * (1 - sq * .08);
    const [x, y] = rot(u, v, NECK[0], NECK[1], o.tilt); return [x + o.hx, y + o.hy + o.breath * .5];
  };
  const stamp = (u, v, rows, map) => {
    const [wx, wy] = toWorld(u, v); const ox = Math.round(wx - rows[0].length / 2), oy = Math.round(wy - rows.length / 2);
    rows.forEach((r, j) => [...r].forEach((ch, k) => { if (map[ch] !== undefined) { const x = ox + k, y = oy + j; if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = map[ch]; } }));
  };
  const F = {"#":P.ink, "o":P.glint, "-":P.line, "p":P.pink, "w":P.brow, "d":P.f0};
  const EYES = {
    open:[[".##.", "#o##", ".##."], [".##.", "##o#", ".##."]],
    blink:[["....", "####", "...."], ["....", "####", "...."]],
    happy:[[".##.", "#..#", "...."], [".##.", "#..#", "...."]],
    sleep:[["....", "#..#", ".##."], ["....", "#..#", ".##."]],
    squint:[["#...", ".##.", "#..."], ["...#", ".##.", "...#"]],
  };
  const lx = Math.max(-1, Math.min(1, Math.round(o.lx))), ly = Math.max(-1, Math.min(1, Math.round(o.ly)));
  const ek = EYES[o.eyes] || EYES.open;
  [-1, 1].forEach((s, side) => {
    stamp(CX + s * EYE_DX + (o.eyes === "open" ? lx : 0), EYE_Y + (o.eyes === "open" ? ly : 0), ek[side], F);
    stamp(CX + s * (EYE_DX + .5), EYE_Y - 3.4, ["ww"], F);
  });
  face.nose = toWorld(CX + lx * .5, NOSE_Y + ly * .4);
  face.eyes = [toWorld(CX - EYE_DX, EYE_Y), toWorld(CX + EYE_DX, EYE_Y)];
  stamp(CX + lx * .5, NOSE_Y + ly * .4, ["###", "###", ".#."], F);
  const MOUTH = {
    closed:["..-..", "--.--"],
    open:["..-..", ".---.", ".-p-.", "..p.."],
    chew:["..-..", ".---.", "....."],
  };
  stamp(CX + lx * .5, NOSE_Y + 2.6 + ly * .4 + (o.mouth === "closed" ? 0 : .5), MOUTH[o.mouth] || MOUTH.closed, F);
  return out;
}

// Small sprites drawn on top of the scene
export const SPRITES = {
  heart:[".pp.pp.", "pwppppp", "ppppppp", ".ppppp.", "..ppp..", "...p..."],
  z:["#####", "...#.", "..#..", ".#...", "#####"],
  bone:[".--.....--.", "-cc-----cc-", ".-ccccccc-.", "-cc-----cc-", ".--.....--."],
};

export const PALETTES = {
  natural:["#00000000", "#3A2621", "#9A4E2A", "#C46A35", "#DE8946", "#F0AE6C", "#E4CFBD", "#F6ECE0", "#FFFBF5", "#1E1715", "#FFFFFF", "#EDB3A0", "#E67E8F", "#3C326A2E", "#FFF4E6"],
  lavender:["#00000000", "#2B2945", "#6F6CAA", "#8E8CC6", "#ADABDF", "#CBCAF0", "#DCDBEE", "#F2F1FA", "#FFFFFF", "#1C1B2B", "#FFFFFF", "#E9C9DE", "#E58FA6", "#3C326A2E", "#F4F3FD"],
};
