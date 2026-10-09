// Pet the Shiba: a soft plush Shiba built from rounded shapes in three.js.
// Every moving part is driven by second-order springs, so motion stays smooth and a little bouncy.
import * as THREE from "../shiba-land/vendor/three.module.min.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("dog"), stage = document.getElementById("stage"), fx = document.getElementById("fx");
const treatBtn = document.getElementById("treat");

let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
catch (e) { stage.classList.add("nogl"); treatBtn.hidden = true; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, .1, 60);

// Second-order dynamics (f: speed in Hz, z: damping, r: anticipation)
class Spring {
  constructor(f, z, r, x0 = 0) { this.k1 = z / (Math.PI * f); this.k2 = 1 / ((2 * Math.PI * f) ** 2); this.k3 = r * z / (2 * Math.PI * f); this.xp = x0; this.y = x0; this.yd = 0; }
  update(T, x) {
    const xd = (x - this.xp) / T; this.xp = x;
    const k2 = Math.max(this.k2, T * T / 2 + T * this.k1 / 2, T * this.k1);
    this.y += T * this.yd; this.yd += T * (x + this.k3 * xd - this.y - this.k1 * this.yd) / k2;
    return this.y;
  }
  kick(v) { this.yd += v; }
}

// Materials: velvety lavender fur, cream mask, glossy eyes
const fur = new THREE.MeshPhysicalMaterial({color:0xB9B7E6, roughness:.9, sheen:1, sheenRoughness:.45, sheenColor:new THREE.Color(0xF4F3FF)});
const cream = new THREE.MeshPhysicalMaterial({color:0xFCFBFF, roughness:.95, sheen:.7, sheenRoughness:.5, sheenColor:new THREE.Color(0xE9E8FC)});
const innerEar = new THREE.MeshPhysicalMaterial({color:0xEEDCEB, roughness:.95, sheen:.5, sheenColor:new THREE.Color(0xFFFFFF)});
const ink = new THREE.MeshStandardMaterial({color:0x17161F, roughness:.18});
const noseMat = new THREE.MeshStandardMaterial({color:0x26243A, roughness:.4});
const mouthMat = new THREE.MeshStandardMaterial({color:0x2B2738, roughness:.6});
const lineMat = new THREE.MeshStandardMaterial({color:0x1D1C28, roughness:.85});
const pink = new THREE.MeshStandardMaterial({color:0xF2A7B5, roughness:.5});
const shine = new THREE.MeshBasicMaterial({color:0xFFFFFF});

const SPH = new THREE.SphereGeometry(1, 64, 40);
const meshes = [];
const add = (geo, mat, parent, p = [0, 0, 0], s = [1, 1, 1], tag) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); parent.add(m);
  m.userData.tag = tag; meshes.push(m); return m;
};
const both = fn => [-1, 1].map(fn);

// Rig: root (hop, lean) > body (breathing) and neck > head > squash (petting squish)
const root = new THREE.Group(); scene.add(root);
const body = new THREE.Group(); root.add(body);

// Body: a sitting bean turned on a lathe, with a cream chest, haunches, legs and paws
const profile = [[0,0],[.5,.02],[.8,.15],[.9,.42],[.86,.74],[.73,1.04],[.55,1.3],[.36,1.48],[0,1.58]].map(([x, y]) => new THREE.Vector2(x, y));
add(new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(60), 72), fur, body, [0, 0, 0], [.88, .94, .8], "body");
add(SPH, cream, body, [0, .88, .46], [.37, .56, .28], "body");
both(s => add(SPH, fur, body, [s * .54, .33, 0], [.36, .33, .46], "body"));
both(s => add(SPH, cream, body, [s * .6, .08, .36], [.18, .09, .24], "body"));
const LEG = new THREE.CapsuleGeometry(.145, .5, 10, 28), SOCK = new THREE.CapsuleGeometry(.152, .1, 10, 28);
both(s => { add(LEG, fur, body, [s * .21, .44, .6], [1, 1, 1], "body"); add(SOCK, cream, body, [s * .21, .19, .62], [1, 1, 1], "body"); add(SPH, cream, body, [s * .21, .08, .72], [.17, .1, .21], "body"); });

// Tail: a plush curl over the right hip
const tailPivot = new THREE.Group(); tailPivot.position.set(.5, .62, -.5); body.add(tailPivot);
const tailCurl = new THREE.Group(); tailPivot.add(tailCurl);
tailCurl.rotation.set(.1, -.9, -.2);
add(new THREE.TorusGeometry(.28, .15, 28, 72, Math.PI * 1.6), fur, tailCurl, [.06, .3, 0], [1, 1, 1], "body").rotation.z = -.4;
add(SPH, cream, tailCurl, [-.2, .5, .02], [.14, .13, .14], "body");

// Head
const neck = new THREE.Group(); neck.position.set(0, 1.36, .1); root.add(neck);
const head = new THREE.Group(); head.position.set(0, .52, 0); head.rotation.order = "YXZ"; neck.add(head);
const squash = new THREE.Group(); head.add(squash);
add(SPH, fur, squash, [0, 0, 0], [.9, .78, .74], "head");
both(s => add(SPH, fur, squash, [s * .5, -.2, .06], [.34, .3, .34], "head"));
both(s => add(SPH, cream, squash, [s * .24, -.27, .45], [.3, .23, .28], "head"));
const muzzle = add(SPH, cream, squash, [0, -.24, .55], [.3, .21, .28], "head");
add(SPH, cream, squash, [0, -.39, .47], [.25, .15, .24], "head");
both(s => add(SPH, cream, squash, [s * .27, .22, .665], [.075, .05, .03], "head"));
const nose = add(SPH, noseMat, squash, [0, -.135, .79], [.1, .068, .07], "nose");
add(SPH, shine, squash, [-.03, -.11, .855], [.025, .014, .01], "nose");

// Mouth: a soft "w", with an opening and a tongue that come out when happy
const tube = (pts, r = .014) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 10);
add(tube([[0, -.2, .845], [0, -.255, .835]]), mouthMat, squash, [0, 0, 0], [1, 1, 1], "nose");
both(s => add(tube([[0, -.255, .835], [s * .06, -.305, .82], [s * .13, -.275, .795]]), mouthMat, squash, [0, 0, 0], [1, 1, 1], "head"));
const mouthOpen = add(SPH, mouthMat, squash, [0, -.3, .8], [.075, .001, .03], "head");
const tongue = add(SPH, pink, squash, [0, -.33, .815], [.055, .045, .028], "head");

// Eyes: open, happy (^ ^) and sleepy (u u) versions that blend into each other
const eyes = both(s => {
  const g = new THREE.Group(); g.position.set(s * .28, .03, .69); squash.add(g);
  const open = new THREE.Group(); g.add(open);
  add(SPH, ink, open, [0, 0, 0], [.09, .105, .05], "head");
  add(SPH, shine, open, [.028, .042, .04], [.026, .03, .014], "head");
  add(SPH, shine, open, [-.026, -.036, .043], [.011, .011, .007], "head");
  const happy = new THREE.Group(); g.add(happy);
  add(tube([[-.075, -.015, .02], [0, .055, .035], [.075, -.015, .02]], .018), lineMat, happy, [0, 0, 0], [1, 1, 1], "head");
  const sleepy = new THREE.Group(); g.add(sleepy);
  add(tube([[-.08, .005, .025], [0, -.03, .038], [.08, .005, .025]], .013), lineMat, sleepy, [0, 0, 0], [1, 1, 1], "head");
  return {g, open, happy, sleepy, s};
});

// Blush: soft pink glows on the cheeks
const glowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(242,167,181,1)"); g.addColorStop(1, "rgba(242,167,181,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const blushMat = new THREE.MeshBasicMaterial({map:glowTex, transparent:true, opacity:0, depthWrite:false});
both(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(.26, .17), blushMat); b.position.set(s * .47, -.12, .5); b.lookAt(s * 1.6, -.12, 2.2); squash.add(b); });

// Ears: rounded, bevelled triangles that pivot at their base
const earShape = new THREE.Shape();
earShape.moveTo(-.27, 0); earShape.quadraticCurveTo(-.2, .42, -.03, .6); earShape.quadraticCurveTo(.04, .67, .09, .58);
earShape.quadraticCurveTo(.23, .36, .27, 0); earShape.quadraticCurveTo(0, -.05, -.27, 0);
const earGeo = new THREE.ExtrudeGeometry(earShape, {depth:.1, bevelEnabled:true, bevelThickness:.075, bevelSize:.05, bevelSegments:10, curveSegments:32});
earGeo.translate(0, 0, -.05);
const ears = both(s => {
  const pivot = new THREE.Group(); pivot.position.set(s * .42, .52, -.04); squash.add(pivot);
  const tilt = new THREE.Group(); pivot.add(tilt); tilt.rotation.z = -s * .26; tilt.rotation.x = -.1; tilt.rotation.y = s * .18;
  const outer = add(earGeo, fur, tilt, [0, 0, 0], [s, 1, 1], "head");
  add(earGeo, innerEar, tilt, [s * -.005, .07, .1], [s * .6, .66, .3], "head");
  return {pivot, s};
});

// Contact shadow
const shadowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(60,50,120,.42)"); g.addColorStop(.55, "rgba(60,50,120,.14)"); g.addColorStop(1, "rgba(60,50,120,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false}));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = .002; shadow.scale.set(2.9, 1.9, 1); scene.add(shadow);

// The treat
const bone = new THREE.Group(); bone.visible = false; scene.add(bone);
add(new THREE.CapsuleGeometry(.055, .3, 8, 16), cream, bone, [0, 0, 0], [1, 1, 1]).rotation.z = Math.PI / 2;
[[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => add(SPH, cream, bone, [a * .2, b * .055, 0], [.07, .07, .07]));

// Light: soft sky, a warm key from the front, and a cool rim from behind
scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xC4C2E6, 1.6));
const key = new THREE.DirectionalLight(0xFFFFFF, 2.1); key.position.set(2.5, 5, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xECEAFF, .5); fill.position.set(-5, 1.5, 3); scene.add(fill);
const rim = new THREE.DirectionalLight(0xFFFFFF, 1.5); rim.position.set(-2, 4, -6); scene.add(rim);

// Fit the dog to the viewport, leaving room for the top bar and the button
const fit = () => {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const v = camera.fov * Math.PI / 180, hv = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  const d = Math.max(4.3 / 2 / Math.tan(v / 2), 2.7 / 2 / Math.tan(hv / 2));
  camera.position.set(0, 2.05, d); camera.lookAt(0, 1.38, 0);
  camera.updateProjectionMatrix();
};
fit(); addEventListener("resize", fit, {passive:true});

// --- Behaviour ---------------------------------------------------------------
const S = {
  yaw:new Spring(1.6, .55, 1.2), pitch:new Spring(1.6, .55, 1.2), roll:new Spring(1.2, .45, 0),
  eyeX:new Spring(4, .7, 0), eyeY:new Spring(4, .7, 0),
  hop:new Spring(2.4, .28, 0), lean:new Spring(1.2, .5, 0), recoil:new Spring(3, .32, 0),
  squish:new Spring(3, .4, 0, 1), happy:new Spring(3, .9, 0), sleep:new Spring(.8, 1, 0),
  open:new Spring(5, .7, 0), blush:new Spring(2, 1, 0), wag:new Spring(1.5, 1, 0, .16), wagF:new Spring(1.5, 1, 0, 6),
  earL:new Spring(3.2, .3, 0), earR:new Spring(3.2, .3, 0), earBack:new Spring(2.2, .5, 0), chew:new Spring(6, .5, 0),
};
const now = () => performance.now() / 1000;
let lastActive = now(), lastMove = -10, happyUntil = 0, squintUntil = 0, openUntil = 0, chewUntil = 0;
let blinkAt = -1, blinkAt2 = 0, asleep = false, petEnergy = 0, tilt = 0, glance = null, nextGlance = now() + 4, nextBlink = now() + 2, nextTwitch = now() + 3, nextZ = 0;
const look = new THREE.Vector3(0, 2, 8);           // what the dog is looking at
const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let pointer = null;                                 // last pointer position in screen pixels

const toScreen = v => { const p = v.clone().project(camera); return {x:(p.x + 1) / 2 * innerWidth, y:(1 - p.y) / 2 * innerHeight}; };
const headTop = () => toScreen(head.localToWorld(new THREE.Vector3(0, .75, .2)));

const heartSVG = '<svg viewBox="0 0 24 22"><path d="M12 21C5 15.6 1 12 1 7.3 1 3.9 3.6 1.3 6.9 1.3c2.1 0 4 1.1 5.1 2.9 1.1-1.8 3-2.9 5.1-2.9 3.3 0 5.9 2.6 5.9 6 0 4.7-4 8.3-11 13.7z" fill="#F2A7B5"/></svg>';
const heart = (x, y) => {
  const h = document.createElement("div"); h.className = "heart"; h.innerHTML = heartSVG;
  h.style.left = x + "px"; h.style.top = y + "px";
  h.style.setProperty("--dx", (Math.random() * 50 - 25) + "px"); h.style.setProperty("--r", (Math.random() * 30 - 15) + "deg");
  h.addEventListener("animationend", () => h.remove()); fx.appendChild(h);
};
const hearts = n => { for (let i = 0; i < n; i++) setTimeout(() => { const p = headTop(); heart(p.x + (Math.random() - .5) * 110, p.y + Math.random() * 30); }, i * 140); };
const zee = () => { const p = headTop(); const z = document.createElement("div"); z.className = "zz"; z.textContent = "z"; z.style.left = (p.x + 40) + "px"; z.style.top = (p.y + 10) + "px"; z.addEventListener("animationend", () => z.remove()); fx.appendChild(z); };

const active = () => { lastActive = now(); if (asleep) wake(); };
const wake = () => { asleep = false; S.roll.kick(reduce ? 0 : 2.2); S.earL.kick(-6); S.earR.kick(6); };
const hello = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  if (!reduce) S.hop.kick(5.5);
  happyUntil = now() + 1.2; openUntil = now() + .9; S.earL.kick(-8); S.earR.kick(8);
};
const boop = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  S.recoil.kick(reduce ? 0 : -3.2); S.pitch.kick(reduce ? 0 : -2.5); squintUntil = now() + .75; S.blush.kick(3);
  nose.scale.set(.12, .055, .06);
};

// What is under the pointer?
const hit = (x, y) => {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(meshes, false)[0]; return h ? h.object.userData.tag || "body" : null;
};

let down = null;
canvas.addEventListener("pointermove", e => {
  const prev = pointer; pointer = {x:e.clientX, y:e.clientY};
  const d = prev ? Math.hypot(e.clientX - prev.x, e.clientY - prev.y) : 0;
  if (d > 0) lastMove = now();
  const over = hit(e.clientX, e.clientY);
  canvas.style.cursor = over === "head" || over === "nose" ? "grab" : over ? "pointer" : "default";
  // stroking the head (hovering with a mouse, or dragging with a finger) is petting
  const stroking = (over === "head" || over === "nose") && (e.pointerType === "mouse" || down);
  if (stroking && d > 0) {
    petEnergy = Math.min(2.2, petEnergy + d * .009); active();
    S.lean.kick((prev ? e.clientX - prev.x : 0) * .004);
    if (petEnergy > .6 && Math.random() < d * .006) heart(e.clientX + (Math.random() - .5) * 20, e.clientY - 14);
  } else if (d > 2) { lastActive = asleep ? lastActive : now(); if (asleep && d > 30) active(); }
  if (down) down.moved += d;
}, {passive:true});
canvas.addEventListener("pointerleave", () => { pointer = null; canvas.style.cursor = "default"; });
canvas.addEventListener("pointerdown", e => { down = {moved:0, over:hit(e.clientX, e.clientY)}; pointer = {x:e.clientX, y:e.clientY}; canvas.setPointerCapture(e.pointerId); });
const up = () => {
  if (down && down.moved < 8) { if (down.over === "nose") boop(); else if (down.over) hello(); else active(); }
  down = null;
};
canvas.addEventListener("pointerup", up);
canvas.addEventListener("pointercancel", () => { down = null; });
canvas.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hello(); }
  else if (e.key === "b" || e.key === "B") boop();
  else if (e.key === "t" || e.key === "T") giveTreat();
});

// Treat: a bone arcs in from above and the dog follows it into its mouth
let treat = null;
const mouthWorld = () => head.localToWorld(new THREE.Vector3(0, -.3, .85));
const giveTreat = () => {
  if (treat) return;
  lastActive = now(); if (asleep) wake();
  const from = new THREE.Vector3((Math.random() < .5 ? -1 : 1) * (1.1 + Math.random() * .4), 3.4, 1.6);
  treat = {t:0, from, dur:reduce ? .35 : 1.15, spin:(Math.random() < .5 ? -1 : 1) * 9};
  bone.visible = true; treatBtn.disabled = true;
};
treatBtn.addEventListener("click", giveTreat);

// --- Animation loop -----------------------------------------------------------
let last = performance.now(), raf = 0, started = false;
const tmp = new THREE.Vector3(), headPos = new THREE.Vector3();
const frame = ms => {
  raf = 0;
  const T = Math.min(.05, Math.max(.001, (ms - last) / 1000)); last = ms;
  const t = ms / 1000, n = now();

  // fall asleep when nobody plays
  if (!asleep && !treat && n - lastActive > 18) asleep = true;
  petEnergy = Math.max(0, petEnergy - T * .8);
  const petting = petEnergy > .35;
  const happy = n < happyUntil || petting || n < chewUntil;

  // where to look: the treat, the pointer, or a lazy glance around
  if (treat) { look.copy(bone.position); }
  else if (pointer && !asleep) {
    ndc.set(pointer.x / innerWidth * 2 - 1, -(pointer.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(lookPlane, tmp)) look.lerp(tmp, 1 - Math.exp(-T * 18));
    glance = null;
  } else {
    if (n > nextGlance) { glance = Math.random() < .35 ? null : new THREE.Vector3((Math.random() - .5) * 5, 1.5 + Math.random() * 2, 2.2); nextGlance = n + 2.5 + Math.random() * 3; }
    look.lerp(glance || tmp.set(0, 2.1, 6), 1 - Math.exp(-T * 3));
  }
  head.getWorldPosition(headPos);
  const dx = look.x - headPos.x, dy = look.y - headPos.y, dz = Math.max(.6, look.z - headPos.z);
  let yaw = Math.max(-.5, Math.min(.5, Math.atan2(dx, dz) * .7));
  let pitch = Math.max(-.3, Math.min(.38, -Math.atan2(dy, dz) * .6));

  // a curious head tilt when the pointer rests
  if (n - lastMove > 1.6 && !asleep && !petting && !treat && n > chewUntil) { if (!tilt) tilt = Math.random() < .5 ? -.24 : .24; } else tilt = 0;
  let roll = tilt;
  if (asleep) { pitch = .3; yaw *= .3; roll = .12; }
  if (petting) roll += Math.max(-.25, Math.min(.25, S.lean.y * 4));

  head.rotation.y = S.yaw.update(T, yaw);
  head.rotation.x = S.pitch.update(T, pitch);
  head.rotation.z = S.roll.update(T, roll) + S.lean.update(T, 0) * 2;
  head.position.z = S.recoil.update(T, 0) * .1;
  root.rotation.z = -head.rotation.y * .05 + S.lean.y * .6;
  root.position.y = Math.max(0, S.hop.update(T, 0) * .22);
  shadow.scale.set(2.9 - root.position.y * 1.5, 1.9 - root.position.y, 1);
  shadow.material.opacity = 1 - root.position.y * .8;

  // breathing
  const sleepAmt = S.sleep.update(T, asleep ? 1 : 0);
  const breath = Math.sin(t * (2.4 - sleepAmt * 1.1)) * (.011 + sleepAmt * .014);
  body.scale.set(1 + breath * .5, 1 + breath, 1 + breath * .5);
  neck.position.y = 1.36 + breath * 1.4 - sleepAmt * .06;

  // petting squish
  const sq = S.squish.update(T, petting ? .94 : 1);
  squash.scale.set(2 - sq, sq, 1);

  // eyes: look, blink, and blend between open, happy and sleepy
  if (n > nextBlink) { blinkAt = n; nextBlink = n + 2.2 + Math.random() * 3.4; if (Math.random() < .2) blinkAt2 = n + .3; }
  if (blinkAt2 && n > blinkAt2) { blinkAt = n; blinkAt2 = 0; }
  const bk = (n - blinkAt) / .17, blink = bk < 1 ? 1 - Math.sin(bk * Math.PI) * .94 : 1;
  const hap = Math.max(0, Math.min(1, S.happy.update(T, (happy || n < squintUntil) && !asleep ? 1 : 0)));
  const ex = S.eyeX.update(T, Math.max(-1, Math.min(1, dx / 3)) * .018), ey = S.eyeY.update(T, Math.max(-1, Math.min(1, dy / 3)) * .014);
  eyes.forEach(e => {
    const openAmt = (1 - hap) * Math.max(0, 1 - sleepAmt * 1.5);
    e.open.scale.set(1, Math.max(.001, blink * openAmt), 1); e.open.visible = openAmt > .02;
    e.open.position.set(ex, ey, 0);
    e.happy.scale.setScalar(Math.max(.001, hap * (1 - sleepAmt))); e.happy.visible = hap > .02;
    e.sleepy.scale.setScalar(Math.max(.001, sleepAmt)); e.sleepy.visible = sleepAmt > .02;
  });

  // mouth, tongue and blush
  const chewing = n < chewUntil;
  const open = Math.max(0, S.open.update(T, (n < openUntil || (treat && treat.t > .55) ? 1 : happy ? .55 : 0) * (1 - sleepAmt)));
  const chew = chewing ? Math.abs(Math.sin(t * 13)) : 0;
  mouthOpen.scale.y = .001 + open * .045 + chew * .02;
  tongue.scale.set(.055 + open * .01, .045 + open * .04, .028);
  tongue.position.y = -.33 - open * .04;
  muzzle.scale.set(.3 + chew * .012, .21 - chew * .01, .28);
  blushMat.opacity = Math.max(0, Math.min(.85, S.blush.update(T, happy ? .8 : 0)));
  nose.scale.lerp(tmp.set(.1, .068, .07), 1 - Math.exp(-T * 8));

  // ears: perk when awake, fold back with pleasure, flop out a little when asleep, twitch now and then
  if (n > nextTwitch && !asleep) { (Math.random() < .5 ? S.earL : S.earR).kick((Math.random() < .5 ? -1 : 1) * 7); nextTwitch = n + 2.5 + Math.random() * 5; }
  const back = S.earBack.update(T, petting ? 1 : asleep ? .45 : 0);
  ears.forEach(e => {
    const sp = e.s < 0 ? S.earL : S.earR;
    const z = sp.update(T, 0) * .1 - e.s * (back * .32 + head.rotation.z * -.15);
    e.pivot.rotation.set(-back * .75 - Math.min(0, head.rotation.x) * .6, 0, z);
  });

  // tail wag speeds up with happiness
  const amp = S.wag.update(T, asleep ? .03 : happy ? .55 : (n - lastMove < 2 ? .26 : .16));
  const freq = S.wagF.update(T, happy ? 15 : 6);
  tailPivot.rotation.set(0, Math.sin(t * freq) * amp, Math.sin(t * freq) * amp * .3);

  // treat flight
  if (treat) {
    treat.t += T / treat.dur;
    const k = Math.min(1, treat.t), m = mouthWorld();
    bone.position.set(treat.from.x + (m.x - treat.from.x) * k, treat.from.y + (m.y - treat.from.y) * (1 - (1 - k) * (1 - k)) + Math.sin(k * Math.PI) * .45, treat.from.z + (m.z - treat.from.z) * k);
    bone.rotation.set(t * 2, 0, k * treat.spin);
    bone.scale.setScalar(1 - Math.max(0, k - .85) * 4);
    if (k >= 1) {
      treat = null; bone.visible = false; treatBtn.disabled = false;
      chewUntil = n + 1.6; happyUntil = n + 2.6; if (!reduce) S.hop.kick(3.5); hearts(3);
    }
  }

  if (asleep && n > nextZ) { zee(); nextZ = n + 1.8; }

  renderer.render(scene, camera);
  if (!started) { started = true; canvas.classList.add("on"); }
  loop();
};
const loop = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
document.addEventListener("visibilitychange", () => { last = performance.now(); loop(); });
loop();
setTimeout(() => hello(), 650);
