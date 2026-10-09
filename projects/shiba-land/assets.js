// Shared textures, materials and geometry helpers. Everything here lives for the whole session.
// Colours are plain greys: the post pass turns brightness into the four lavender shades,
// so a "colour" here is really "which shade should this face land on".
import * as THREE from "../vendor/three.module.min.js";

THREE.ColorManagement.enabled = false; // keep greys exactly as written

// Grey 8x8 texture from a list of rows. Characters map to brightness.
const LUT = { k: 0.06, d: 0.25, m: 0.42, n: 0.55, l: 0.7, h: 0.85, w: 1.0, ".": 0.62 };
function pixTex(rows, lut = LUT) {
  const h = rows.length, w = rows[0].length;
  const data = new Uint8Array(w * h * 4);
  rows.forEach((row, r) => {
    const y = h - 1 - r; // DataTexture rows start at the bottom
    [...row].forEach((ch, x) => {
      const v = Math.round((lut[ch] ?? 0.5) * 255);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    });
  });
  const t = new THREE.DataTexture(data, w, h);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

const TEX = {
  dirt: pixTex([
    "mmmmmmmm",
    "mmmdmmmm",
    "mmmmmmdm",
    "mdmmmmmm",
    "mmmmmmmm",
    "mmmmdmmm",
    "mmmmmmmm",
    "dmmmmmmd",
  ]),
  crust: pixTex([
    "hhhhhhhh",
    "hhwhhhhw",
    "lhllhlhl",
    "dddddddd",
    "mmmmmmmm",
    "mmmdmmmm",
    "mmmmmmdm",
    "mdmmmmmm",
  ]),
  grass: pixTex([
    "wwwwwwww",
    "wwhwwwww",
    "wwwwwhww",
    "wwwwwwww",
    "hwwwwwww",
    "wwwwhwww",
    "wwwwwwww",
    "wwhwwwwh",
  ]),
  brick: pixTex([
    "dddddddd",
    "lhhhdlhh",
    "lnnndlnn",
    "dddddddd",
    "hdlhhhhd",
    "ndlnnnnd",
    "ndlnnnnd",
    "dddddddd",
  ]),
  brickTop: pixTex([
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
    "hhhhhhhh",
  ]),
  bone: pixTex([
    "kkkkkkkk",
    "kddddddk",
    "kwddddwk",
    "kdwwwwdk",
    "kdwwwwdk",
    "kwddddwk",
    "kddddddk",
    "kkkkkkkk",
  ]),
  used: pixTex([
    "kkkkkkkk",
    "klmmmmlk",
    "kmmmmmmk",
    "kmmmmmmk",
    "kmmmmmmk",
    "kmmmmmmk",
    "klmmmmlk",
    "kkkkkkkk",
  ]),
  stone: pixTex([
    "wwwwwwwh",
    "whhhhhhd",
    "whllllnd",
    "whllllnd",
    "whllllnd",
    "whllllnd",
    "whnnnnmd",
    "hddddddd",
  ]),
  plank: pixTex([
    "dddddddd",
    "hhhhhhhh",
    "lldlllll",
    "llllllll",
    "dddddddd",
    "hhhhhhhh",
    "llllldll",
    "dddddddd",
  ]),
  column: pixTex([
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
    "hlhhhlhh",
  ]),
  wall: pixTex([
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
    "hhlhhhlh",
  ]),
  roof: pixTex([
    "mmmmmmmm",
    "dmmmdmmm",
    "mmmmmmmm",
    "mmdmmmdm",
    "mmmmmmmm",
    "dmmmdmmm",
    "mmmmmmmm",
    "mmdmmmdm",
  ]),
};
// Bigger repeating tiles for background walls, windows look like little dark squares.
TEX.windows = pixTex([
  "hhhhhhhh",
  "hddhhddh",
  "hddhhddh",
  "hhhhhhhh",
  "hhhhhhhh",
  "hddhhddh",
  "hddhhddh",
  "hhhhhhhh",
]);
TEX.windows.wrapS = TEX.windows.wrapT = THREE.RepeatWrapping;

const matCache = new Map();
// Lambert material keyed by grey level and texture name.
export function mat(grey, texName = null) {
  const key = `${grey}|${texName}`;
  if (!matCache.has(key)) {
    const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(grey, grey, grey), map: texName ? TEX[texName] : null });
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// Box geometry cache by size.
const boxCache = new Map();
export function box(w, h, d) {
  const key = `${w},${h},${d}`;
  if (!boxCache.has(key)) boxCache.set(key, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(key);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function xform(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return _m.clone().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

// Merge [geometry, matrix, uvRepeat?] parts into one non-indexed geometry (position, normal, uv).
export function merge(parts) {
  const chunks = parts.map(([g, m, uv]) => {
    const ng = g.index ? g.toNonIndexed() : g.clone();
    ng.applyMatrix4(m);
    if (uv) { const a = ng.attributes.uv.array; for (let i = 0; i < a.length; i += 2) { a[i] *= uv[0]; a[i + 1] *= uv[1]; } }
    return ng;
  });
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const size = name === "uv" ? 2 : 3;
    const total = chunks.reduce((n, g) => n + g.attributes[name].count * size, 0);
    const arr = new Float32Array(total);
    let off = 0;
    for (const g of chunks) { arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  chunks.forEach((g) => g.dispose());
  out.computeBoundingSphere();
  return out;
}

// Small seeded RNG so the background is the same every run.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Greys used across the models.
export const G = { fur: 0.74, white: 1.0, ink: 0.05, pink: 0.6, metal: 0.85, crow: 0.16 };
