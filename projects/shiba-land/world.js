// Builds the three.js scene for one level: instanced tiles, parallax background, doghouse and pickups.
// Everything created here is owned by the returned object and released by dispose().
import * as THREE from "../vendor/three.module.min.js";
import { mat, box, merge, xform, rng } from "./assets.js";
import { makeBone, boneGeometry } from "./models.js";

const GROUND_D = 2.2; // ground strip depth (z), gives the floor a visible top in perspective
const ZERO = xform(0, -50, 0, 0, 0, 0, 0, 0, 0);

const KINDS = {
  groundTop: () => [box(1, 1, GROUND_D), [mat(1, "crust"), mat(1, "crust"), mat(1, "grass"), mat(1, "dirt"), mat(1, "crust"), mat(1, "crust")]],
  groundFill: () => [box(1, 1, GROUND_D), mat(1, "dirt")],
  B: () => [box(1, 1, 1), [mat(1, "brick"), mat(1, "brick"), mat(1, "brickTop"), mat(1, "brick"), mat(1, "brick"), mat(1, "brick")]],
  O: () => [box(1, 1, 1), [mat(1, "bone"), mat(1, "bone"), mat(0.5), mat(0.3), mat(1, "bone"), mat(1, "bone")]],
  U: () => [box(1, 1, 1), mat(1, "used")],
  S: () => [box(1, 1, 1), mat(1, "stone")],
  "=": () => [box(1, 1, 1), [mat(1, "plank"), mat(1, "plank"), mat(0.9), mat(0.45), mat(1, "plank"), mat(1, "plank")]],
  C: () => [box(0.8, 1, 0.8), mat(1, "column")],
  cap: () => [box(1.02, 0.24, 1.02), mat(0.92)],
};

export function buildWorld(level) {
  const group = new THREE.Group();
  const owned = [];   // geometries made for this level only
  const tiles = level.tiles;
  const W = level.width;

  // ---- tiles ----
  const lists = {};
  const add = (k, x, y, yOff = 0.5) => (lists[k] || (lists[k] = [])).push([x, y, yOff]);
  let bumpable = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      if (t === " ") continue;
      if (t === "#") add(tiles[y + 1]?.[x] === "#" ? "groundFill" : "groundTop", x, y);
      else if (t === "H") add("B", x, y);
      else add(t, x, y);
      if (t === "C" && tiles[y + 1]?.[x] !== "C") add("cap", x, y, 0.95);
      if ("BOH".includes(t)) bumpable++;
    }
  }
  if (bumpable) lists.U = new Array(bumpable).fill(null);

  const meshes = {};
  const blocks = new Map(); // "x,y" -> { mesh, index, x, y }
  for (const [k, list] of Object.entries(lists)) {
    const [geo, mats] = KINDS[k]();
    const im = new THREE.InstancedMesh(geo, mats, list.length);
    im.frustumCulled = false; // instances move (bumps), skip stale bounds
    list.forEach((it, i) => {
      if (!it) { im.setMatrixAt(i, ZERO); return; }
      const [x, y, yOff] = it;
      im.setMatrixAt(i, xform(x + 0.5, y + yOff, 0));
      if (k === "B" || k === "O") blocks.set(`${x},${y}`, { mesh: im, index: i, x, y });
    });
    im.instanceMatrix.needsUpdate = true;
    meshes[k] = im;
    group.add(im);
  }
  let usedNext = 0;

  // ---- background ----
  const goalThing = level.things.find((t) => t.kind === "D");
  buildBackground(level, group, owned, goalThing ? goalThing.x + 1.5 : -99);

  // ---- doghouse, checkpoint, bones ----
  let goal = null, checkpoint = null, start = { x: 2.5, y: 2 };
  const bones = [];
  const spawns = [];
  for (const th of level.things) {
    if (th.kind === "o") {
      const m = makeBone();
      m.position.set(th.x + 0.5, th.y + 0.5, 0);
      group.add(m);
      bones.push({ mesh: m, x: th.x + 0.5, y: th.y + 0.5, alive: true });
    } else if (th.kind === "@") start = { x: th.x + 0.5, y: th.y };
    else if (th.kind === "k") {
      checkpoint = { x: th.x + 0.5, y: th.y };
      group.add(signpost(th.x + 0.5, th.y, owned));
    } else if (th.kind === "D") goal = doghouse(th.x, th.y, group, owned);
    else if (th.kind === "v" || th.kind === "c") spawns.push(th);
  }

  // ---- block bumps ----
  const bumps = [];
  function setBlockMatrix(b, dy) {
    b.mesh.setMatrixAt(b.index, xform(b.x + 0.5, b.y + 0.5 + dy, 0));
    b.mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    group, tiles, width: W, height: level.height, goal, checkpoint, start, bones, spawns,
    blockAt: (x, y) => blocks.get(`${x},${y}`),
    bump(x, y) {
      const b = blocks.get(`${x},${y}`);
      if (b && !bumps.some((q) => q.b === b)) bumps.push({ b, t: 0 });
    },
    // Swap a bone/heart block for an empty riveted one.
    spend(x, y) {
      const b = blocks.get(`${x},${y}`);
      if (!b || !meshes.U) return;
      b.mesh.setMatrixAt(b.index, ZERO);
      b.mesh.instanceMatrix.needsUpdate = true;
      b.mesh = meshes.U; b.index = usedNext++;
      setBlockMatrix(b, 0);
      tiles[y][x] = "U";
    },
    update(dt) {
      for (let i = bumps.length - 1; i >= 0; i--) {
        const q = bumps[i];
        q.t += dt;
        const k = Math.min(q.t / 0.2, 1);
        setBlockMatrix(q.b, Math.sin(k * Math.PI) * 0.3);
        if (k >= 1) bumps.splice(i, 1);
      }
    },
    dispose() {
      group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      owned.forEach((g) => g.dispose());
      group.removeFromParent();
    },
  };
}

// Gabled roof: a three-sided prism with its ridge running into the screen.
let prismGeo = null;
function prism() {
  if (!prismGeo) prismGeo = new THREE.CylinderGeometry(1, 1, 1, 3);
  return prismGeo;
}
// width w, height h, depth d, base at y
function roofMatrix(x, y, z, w, h, d) {
  // the prism's triangle spans 1.732 wide and 1.5 tall at radius 1
  return xform(x, y + h / 3, z, -Math.PI / 2, 0, 0, w / 1.732, d, h / 1.5);
}

function buildBackground(level, group, owned, goalX) {
  const r = rng(level.id === "1-1" ? 7 : 23);
  const W = level.width;
  const parts = new Map(); // material -> [geo, matrix]
  const put = (m, g, mx, uv) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push([g, mx, uv]); };
  const town = level.theme === "town";

  // a pale field behind the play strip for the houses and trees to stand on
  put(mat(0.66), box(W + 80, 2, 30), xform(W / 2, -1.5, -17));

  // far hills or skyline
  for (let x = -24; x < W + 40; ) {
    if (town) {
      const w = 3 + Math.floor(r() * 4), h = 7 + Math.floor(r() * 9);
      put(mat(1, "windows"), box(w, h, 3), xform(x + w / 2, -4 + h / 2, -40), [w / 2, h / 2]);
      if (r() < 0.5) put(mat(0.7), box(0.4, 1.6, 0.4), xform(x + w * 0.7, -4 + h + 0.8, -40)); // antenna
      x += w + 1 + Math.floor(r() * 3);
    } else {
      const steps = 3 + Math.floor(r() * 2);
      let w = 9 + r() * 6, y = -8;
      const cx = x + w / 2;
      for (let s = 0; s < steps; s++) {
        const h = s === 0 ? 10 + r() * 3 : 1.3;
        put(mat(0.97), box(w, h, 6), xform(cx, y + h / 2, -36));
        y += h; w -= 2.6 + r();
      }
      x += 11 + r() * 10;
    }
  }

  // clouds
  for (let x = -10; x < W + 30; x += 11 + r() * 12) {
    const y = 9.2 + r() * 2.2, z = -20 - r() * 6;
    put(mat(1), box(2.6, 0.9, 1.2), xform(x, y, z));
    put(mat(1), box(1.4, 0.7, 1.2), xform(x - 1.3, y - 0.1, z));
    put(mat(1), box(1.2, 0.8, 1.2), xform(x + 0.5, y + 0.55, z));
    if (r() < 0.5) put(mat(1), box(1.0, 0.5, 1.2), xform(x + 1.6, y - 0.15, z));
  }

  // mid layer houses and trees
  const crown = new THREE.IcosahedronGeometry(0.95, 0);
  owned.push(crown);
  for (let x = 4; x < W + 10; ) {
    const z = -9 - r() * 1.5;
    if (Math.abs(x - goalX) < 9) { x += 2; continue; }
    if (r() < (town ? 0.75 : 0.45)) {
      const w = 2.6 + r() * 1.4, h = (town ? 2.6 : 2) + r() * (town ? 2.4 : 0.8), base = -0.5;
      put(mat(1, "wall"), box(w, h, 2.4), xform(x + w / 2, base + h / 2, z));
      put(mat(0.38, "roof"), prism(), roofMatrix(x + w / 2, base + h, z, w + 0.6, 1.4, 2.8));
      for (let wx = 0.6; wx < w - 0.5; wx += 1.1) put(mat(0.2), box(0.5, 0.5, 0.06), xform(x + wx + 0.25, base + h - 0.8, z + 1.21));
      if (r() < 0.6) put(mat(0.5), box(0.4, 1, 0.4), xform(x + w * 0.72, base + h + 0.7, z));
      x += w + 2 + r() * (town ? 2 : 6);
    } else {
      const h = 1.6 + r() * 1.2;
      put(mat(0.32), box(0.3, h, 0.3), xform(x, -0.5 + h / 2, z + 1));
      put(mat(0.62), crown, xform(x, -0.5 + h + 0.55, z + 1, r(), r(), 0, 1, 1.15, 1));
      x += 3 + r() * 5;
    }
  }
  // moon over the town
  if (town) {
    const moon = new THREE.CylinderGeometry(2.2, 2.2, 0.4, 16);
    owned.push(moon);
    put(mat(1), moon, xform(W * 0.55, 13, -60, Math.PI / 2, 0, 0));
  }

  for (const [m, list] of parts) {
    const g = merge(list);
    owned.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
}

function signpost(x, y, owned) {
  const g = new THREE.Group();
  const geo = merge([
    [box(0.12, 1.3, 0.12), xform(0, 0.65, 0)],
  ]);
  owned.push(geo);
  g.add(new THREE.Mesh(geo, mat(0.3)));
  const board = new THREE.Mesh(box(0.9, 0.42, 0.08), mat(0.95));
  board.position.set(0, 1.15, 0.08);
  g.add(board);
  const bone = new THREE.Mesh(boneGeometry(), mat(0.3));
  bone.scale.setScalar(0.9);
  bone.position.set(0, 1.15, 0.14);
  g.add(bone);
  g.position.set(x, y, -0.9);
  return g;
}

// The goal: a doghouse with its door facing the camera and a pennant on the roof.
function doghouse(col, y, group, owned) {
  const x = col + 1.5, z = -1.15, w = 2.3, h = 1.7, d = 2;
  const parts = new Map();
  const put = (m, g, mx) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push([g, mx]); };
  put(mat(1, "wall"), box(w, h, d), xform(x, y + h / 2, z));
  put(mat(0.2, "roof"), prism(), roofMatrix(x, y + h, z, w + 0.7, 1.5, d + 0.4));
  put(mat(0.02), box(0.95, 1.05, 0.08), xform(x, y + 0.525, z + d / 2 + 0.01));   // door
  put(mat(0.02), box(0.65, 0.2, 0.08), xform(x, y + 1.1, z + d / 2 + 0.01));      // arch
  put(mat(0.4), box(0.3, 0.2, 0.3), xform(x + 1.9, y + 0.1, 0.5));                // food bowl
  put(mat(0.9), box(0.5, 0.12, 0.5), xform(x + 1.9, y + 0.26, 0.5));
  put(mat(0.25), box(0.07, 1.9, 0.07), xform(x, y + h + 1.9, z));                  // flag pole
  put(mat(0.25), box(0.16, 0.16, 0.16), xform(x, y + h + 2.9, z));
  for (const [m, list] of parts) {
    const g = merge(list);
    owned.push(g);
    group.add(new THREE.Mesh(g, m));
  }
  const sign = new THREE.Mesh(boneGeometry(), mat(0.3));
  sign.position.set(x, y + 1.45, z + d / 2 + 0.12);
  group.add(sign);
  const flag = new THREE.Mesh(box(0.8, 0.46, 0.05), mat(0.32));
  const flagLow = y + h + 1.35, flagHigh = y + h + 2.55;
  flag.position.set(x + 0.43, flagLow, z);
  group.add(flag);
  return { x, doorX: x, z, y, flag, flagLow, flagHigh };
}
