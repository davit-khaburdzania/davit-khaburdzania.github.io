// Voxel models: the lavender Shiba, robot vacuums, crows, bones and hearts.
// Models face +x. Origin is at the feet, centred.
import * as THREE from "../vendor/three.module.min.js";
import { mat, box, merge, xform, G } from "./assets.js";

function part(parent, w, h, d, grey, x, y, z) {
  const m = new THREE.Mesh(box(w, h, d), mat(grey));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- Shiba ----------
export function makeShiba() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);       // bobs while running
  const s = 1.2;
  body.scale.setScalar(s);

  // legs hang from hip pivots so they can swing
  const legs = [];
  for (const [lx, lz] of [[0.19, 0.12], [0.19, -0.12], [-0.19, 0.12], [-0.19, -0.12]]) {
    const hip = pivot(body, lx, 0.26, lz);
    part(hip, 0.13, 0.2, 0.12, G.fur, 0, -0.1, 0);
    part(hip, 0.14, 0.07, 0.13, G.white, 0.01, -0.22, 0); // white paw
    legs.push(hip);
  }

  part(body, 0.6, 0.3, 0.38, G.fur, -0.02, 0.4, 0);          // torso
  part(body, 0.2, 0.26, 0.4, G.white, 0.2, 0.36, 0);         // chest
  part(body, 0.44, 0.08, 0.34, G.white, -0.02, 0.26, 0);     // belly

  const head = pivot(body, 0.3, 0.7, 0);
  part(head, 0.5, 0.42, 0.46, G.fur, 0, 0, 0);
  part(head, 0.3, 0.2, 0.5, G.white, 0.12, -0.12, 0);        // cheeks / mask
  part(head, 0.14, 0.16, 0.3, G.white, 0.3, -0.1, 0);        // muzzle
  part(head, 0.07, 0.07, 0.12, G.ink, 0.38, -0.04, 0);       // nose
  const eyes = [];
  for (const z of [0.236, -0.236]) eyes.push(part(head, 0.09, 0.12, 0.02, G.ink, 0.1, 0.05, z));
  for (const z of [0.237, -0.237]) part(head, 0.05, 0.04, 0.02, G.white, 0.0, 0.14, z); // brow dots
  const tongue = part(head, 0.08, 0.1, 0.1, G.pink, 0.26, -0.25, 0);
  const ears = [];
  for (const z of [0.13, -0.13]) {
    const ear = pivot(head, -0.06, 0.2, z);
    part(ear, 0.16, 0.18, 0.1, G.fur, 0, 0.09, 0);
    part(ear, 0.08, 0.1, 0.02, G.white, 0.02, 0.08, z > 0 ? 0.055 : -0.055);
    ears.push(ear);
  }

  const tail = pivot(body, -0.3, 0.5, 0);
  part(tail, 0.14, 0.16, 0.16, G.fur, -0.04, 0.06, 0);
  part(tail, 0.16, 0.14, 0.16, G.fur, 0.0, 0.2, 0);
  part(tail, 0.12, 0.1, 0.14, G.white, 0.1, 0.24, 0);

  return { root, body, head, legs, eyes, ears, tail, tongue };
}

// Pose the Shiba. state: { run, air, vy, t, phase, blink, pant }
export function poseShiba(m, p) {
  const swing = p.air ? 0 : Math.sin(p.phase) * 0.75 * p.run;
  if (p.air) {
    const k = THREE.MathUtils.clamp(p.vy / 12, -1, 1);
    m.legs[0].rotation.z = m.legs[1].rotation.z = 0.7;   // front legs reach forward
    m.legs[2].rotation.z = m.legs[3].rotation.z = -0.6;  // back legs kick
    m.body.rotation.z = k * 0.18;
    m.body.position.y = 0;
  } else {
    m.legs[0].rotation.z = swing; m.legs[3].rotation.z = swing;
    m.legs[1].rotation.z = -swing; m.legs[2].rotation.z = -swing;
    m.body.rotation.z = 0;
    m.body.position.y = Math.abs(Math.sin(p.phase)) * 0.06 * p.run + (1 - p.run) * Math.sin(p.t * 3) * 0.008;
  }
  const wag = Math.sin(p.t * (p.run > 0.2 ? 22 : 9)) * (p.run > 0.2 ? 0.5 : 0.35);
  m.tail.rotation.x = wag;
  m.tail.rotation.z = -0.15 + Math.abs(wag) * 0.2;
  m.head.rotation.z = p.air ? 0.08 : Math.sin(p.phase * 2) * 0.04 * p.run;
  for (const e of m.ears) e.rotation.z = p.air ? -0.35 : -0.08 - Math.abs(Math.sin(p.phase)) * 0.15 * p.run;
  const eyeY = p.blink ? 0.2 : 1;
  for (const e of m.eyes) e.scale.y = eyeY;
  m.tongue.visible = p.pant;
}

// ---------- Robot vacuum ----------
let shellGeo = null, bumperGeo = null;
export function makeVacuum() {
  if (!shellGeo) {
    shellGeo = new THREE.CylinderGeometry(0.47, 0.5, 0.3, 14);
    bumperGeo = new THREE.CylinderGeometry(0.51, 0.51, 0.1, 14);
  }
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const shell = new THREE.Mesh(shellGeo, mat(0.42));
  shell.position.y = 0.24;
  body.add(shell);
  const bumper = new THREE.Mesh(bumperGeo, mat(0.12));
  bumper.position.y = 0.14;
  body.add(bumper);
  // the face always looks at the camera and slides toward where it is heading
  const face = pivot(body, 0, 0, 0);
  part(face, 0.6, 0.14, 0.06, 0.98, 0.0, 0.29, 0.45);       // light visor
  part(face, 0.1, 0.1, 0.02, G.ink, -0.12, 0.29, 0.485);    // eyes
  part(face, 0.1, 0.1, 0.02, G.ink, 0.12, 0.29, 0.485);
  part(body, 0.05, 0.24, 0.05, 0.25, 0.0, 0.5, 0);           // antenna
  const led = part(body, 0.13, 0.13, 0.13, G.white, 0.0, 0.66, 0);
  for (const x of [-0.28, 0.28]) part(body, 0.16, 0.09, 0.54, G.ink, x, 0.05, 0); // wheels
  return { root, body, face, led };
}

// ---------- Crow ----------
export function makeCrow() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  part(body, 0.5, 0.28, 0.3, G.crow, 0, 0, 0);
  part(body, 0.28, 0.26, 0.28, G.crow, 0.3, 0.12, 0);
  part(body, 0.18, 0.07, 0.1, 0.78, 0.5, 0.1, 0);           // beak
  for (const z of [0.142, -0.142]) part(body, 0.07, 0.07, 0.02, G.white, 0.35, 0.16, z);
  part(body, 0.24, 0.06, 0.22, G.crow, -0.34, 0.04, 0);       // tail
  const wings = [];
  for (const side of [1, -1]) {
    const w = pivot(body, -0.02, 0.1, 0.14 * side);
    part(w, 0.34, 0.05, 0.42, 0.3, 0, 0, 0.2 * side);
    wings.push(w);
  }
  return { root, body, wings };
}

// ---------- Pickups ----------
let boneGeo = null, heartGeo = null;
export function boneGeometry() {
  if (!boneGeo) {
    const parts = [[box(0.56, 0.16, 0.16), xform(0, 0, 0)]];
    for (const x of [-0.3, 0.3]) for (const y of [-0.09, 0.09]) parts.push([box(0.2, 0.2, 0.2), xform(x, y, 0)]);
    boneGeo = merge(parts);
  }
  return boneGeo;
}
export function makeBone() {
  return new THREE.Mesh(boneGeometry(), mat(G.white));
}

export function makeHeart() {
  if (!heartGeo) {
    heartGeo = merge([
      [box(0.2, 0.2, 0.16), xform(-0.1, 0.08, 0)],
      [box(0.2, 0.2, 0.16), xform(0.1, 0.08, 0)],
      [box(0.36, 0.14, 0.16), xform(0, -0.06, 0)],
      [box(0.2, 0.1, 0.16), xform(0, -0.17, 0)],
    ]);
  }
  return new THREE.Mesh(heartGeo, mat(0.5));
}
