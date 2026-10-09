// Pet the Shiba: a pixel-art Shiba drawn live on a tiny canvas and scaled up with crisp pixels.
// Springs drive every movement and the renderer snaps the result to whole pixels, so it moves like hand-made sprite animation.
import {render, groups, face, PALETTES, SPRITES, W, H, P} from "./pixel.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("dog"), treatBtn = document.getElementById("treat");

// The scene is 84x86 pixels with the 64x64 dog standing in the middle
const SW = 84, SH = 86, OX = 10, OY = 18;
canvas.width = SW; canvas.height = SH;
const ctx = canvas.getContext("2d");
const img = ctx.createImageData(SW, SH), px = new Uint32Array(img.data.buffer);

// palette as packed RGBA (little-endian ABGR)
const pack = (h, alpha) => {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  const a = alpha !== undefined ? alpha : h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255;
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
};
const PAL = PALETTES.natural.map(h => pack(h));
const SHADOW = pack("#3C326A", 34);

// Fit: scale by a whole number of device pixels so every art pixel stays square and sharp
const fit = () => {
  const dpr = devicePixelRatio || 1;
  const k = Math.max(2, Math.min(Math.floor(Math.min((innerWidth - 24) * dpr / SW, (innerHeight - 210) * dpr / SH)), Math.round(8 * dpr)));
  canvas.style.width = SW * k / dpr + "px"; canvas.style.height = SH * k / dpr + "px";
};
fit(); addEventListener("resize", fit, {passive:true});

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
const S = {
  lx:new Spring(3.2, .8, 0), ly:new Spring(3.2, .8, 0), hx:new Spring(1.8, .7, 0), hy:new Spring(2.2, .6, 0),
  tilt:new Spring(1.4, .5, 1), lean:new Spring(1.4, .6, 0),
  earL:new Spring(3.2, .3, 0), earR:new Spring(3.2, .3, 0), earBack:new Spring(2.4, .7, 0),
  wag:new Spring(1.5, 1, 0, .14), wagF:new Spring(1.5, 1, 0, 6), hop:new Spring(2.4, .3, 0),
  squish:new Spring(3, .6, 0), sleep:new Spring(.8, 1, 0),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const step = (v, s) => Math.round(v / s) * s;
const now = () => performance.now() / 1000;

let lastActive = now(), lastMove = -10, happyUntil = 0, squintUntil = 0, openUntil = 0, chewUntil = 0, blinkUntil = 0;
let asleep = false, petEnergy = 0, tilt = 0, glance = null, nextGlance = now() + 4, nextBlink = now() + 2, nextTwitch = now() + 3, nextZ = 0;
let pointer = null, hopPx = 0, treat = null;
const parts = [];   // hearts and z's floating up

// --- Sprites ------------------------------------------------------------------
const blit = (rows, x, y, map, alpha = 1) => {
  const ox = Math.round(x - rows[0].length / 2), oy = Math.round(y - rows.length / 2);
  rows.forEach((r, j) => { for (let k = 0; k < r.length; k++) {
    const c = map[r[k]]; if (c === undefined) continue;
    const X = ox + k, Y = oy + j; if (X < 0 || Y < 0 || X >= SW || Y >= SH) continue;
    px[Y * SW + X] = alpha < 1 ? ((c & 0xFFFFFF) | (Math.round(((c >>> 24) / 255) * alpha * 255) << 24)) >>> 0 : c;
  } });
};
const heartMap = {p:PAL[P.pink], w:PAL[P.glint]}, zMap = {"#":pack("#8F6A5A")}, boneMap = {c:PAL[P.c1], "-":PAL[P.line]};
const heart = (x, y) => parts.filter(p => p.kind === "heart").length < 7 && parts.push({kind:"heart", x, y, vx:(Math.random() - .5) * 6, vy:-14 - Math.random() * 8, age:0, life:1.3});
const hearts = n => { for (let i = 0; i < n; i++) setTimeout(() => heart(OX + 32 + (Math.random() - .5) * 26, OY + 6 + Math.random() * 6), i * 140); };
const zee = () => parts.push({kind:"z", x:OX + 46, y:OY + 8, vx:5, vy:-9, age:0, life:2.4});

// --- What the dog does ----------------------------------------------------------
const wake = () => { asleep = false; S.earL.kick(-6); S.earR.kick(6); };
const active = () => { lastActive = now(); if (asleep) wake(); };
const hello = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  if (!reduce) S.hop.kick(6);
  happyUntil = now() + 1.2; openUntil = now() + .9; S.earL.kick(-7); S.earR.kick(7);
};
const boop = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  squintUntil = now() + .8; if (!reduce) S.hy.kick(-14); heart(OX + face.nose[0] + 4, OY + face.nose[1] - 6);
};
const giveTreat = () => {
  if (treat) return;
  active();
  const side = Math.random() < .5 ? -1 : 1;
  treat = {t:0, fx:side < 0 ? 6 : SW - 6, fy:4, x:0, y:0, dur:reduce ? .35 : 1.15};
  treatBtn.disabled = true;
};
treatBtn.addEventListener("click", giveTreat);

// --- Pointer --------------------------------------------------------------------
const toScene = e => { const r = canvas.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width * SW, y:(e.clientY - r.top) / r.height * SH}; };
const hit = s => {
  const x = Math.floor(s.x - OX), y = Math.floor(s.y - OY + hopPx);
  if (x < 0 || y < 0 || x >= W || y >= H || !groups[y * W + x]) return null;
  if (Math.hypot(x + .5 - face.nose[0], y + .5 - face.nose[1]) < 3.2) return "nose";
  return groups[y * W + x] >= 4 ? "head" : "body";
};
let down = null;
addEventListener("pointermove", e => {
  const s = toScene(e), prev = pointer; pointer = s;
  const d = prev ? Math.hypot(s.x - prev.x, s.y - prev.y) : 0;
  if (d > 0) lastMove = now();
  const over = hit(s);
  canvas.style.cursor = over === "head" || over === "nose" ? "grab" : over ? "pointer" : "default";
  // stroking the head (hovering with a mouse, or dragging with a finger) is petting
  if ((over === "head" || over === "nose") && (e.pointerType === "mouse" || down) && d > 0) {
    petEnergy = Math.min(2.2, petEnergy + d * .05); active();
    if (prev) S.lean.kick((s.x - prev.x) * .03);
    if (petEnergy > .6 && Math.random() < d * .012) heart(s.x, s.y - 4);
  } else if (d > .4 && asleep && d > 6) active();
  if (down) down.moved += d;
}, {passive:true});
document.addEventListener("pointerleave", () => { pointer = null; });
canvas.addEventListener("pointerdown", e => { const s = toScene(e); pointer = s; down = {moved:0, over:hit(s)}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointerup", () => {
  if (down && down.moved < 2) { if (down.over === "nose") boop(); else if (down.over) hello(); else active(); }
  down = null;
});
canvas.addEventListener("pointercancel", () => { down = null; });
canvas.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hello(); }
  else if (e.key === "b" || e.key === "B") boop();
  else if (e.key === "t" || e.key === "T") giveTreat();
});

// --- Animation loop -------------------------------------------------------------
const dogBuf = new Uint8Array(W * H);
let lastKey = "", last = performance.now(), raf = 0;
const frame = ms => {
  raf = 0;
  const T = Math.min(.05, Math.max(.001, (ms - last) / 1000)); last = ms;
  const t = ms / 1000, n = now();

  if (!asleep && !treat && n - lastActive > 18) asleep = true;
  petEnergy = Math.max(0, petEnergy - T * .8);
  const petting = petEnergy > .35, chewing = n < chewUntil;
  const happy = n < happyUntil || petting || chewing;

  // where to look: the treat, the pointer, or a lazy glance around
  const fxs = OX + 32.5, fys = OY + 20;
  let tx = fxs, ty = fys + 30;
  if (treat) { tx = treat.x; ty = treat.y; }
  else if (pointer && !asleep) { tx = pointer.x; ty = pointer.y; glance = null; }
  else {
    if (n > nextGlance) { glance = Math.random() < .35 ? null : {x:fxs + (Math.random() - .5) * 60, y:fys + (Math.random() - .3) * 40}; nextGlance = n + 2.5 + Math.random() * 3; }
    if (glance) { tx = glance.x; ty = glance.y; }
  }
  const dx = tx - fxs, dy = ty - fys;
  const sleepAmt = S.sleep.update(T, asleep ? 1 : 0);
  const lx = S.lx.update(T, asleep ? 0 : clamp(dx / 14, -1, 1)), ly = S.ly.update(T, asleep ? 0 : clamp(dy / 16, -1, 1));
  const hx = S.hx.update(T, asleep ? 0 : clamp(dx / 34, -1, 1));

  // a curious head tilt when the pointer rests, a lean into the hand while petting
  if (n - lastMove > 1.6 && !asleep && !petting && !treat && !chewing) { if (!tilt) tilt = Math.random() < .5 ? -.15 : .15; } else tilt = 0;
  const lean = S.lean.update(T, 0);
  const tiltV = S.tilt.update(T, asleep ? -.08 : tilt) + (petting ? clamp(lean, -.18, .18) : 0);
  const hy = S.hy.update(T, sleepAmt > .5 ? 1 : 0);

  // ears: twitch now and then, fold back with pleasure, droop a little asleep
  if (n > nextTwitch && !asleep) { (Math.random() < .5 ? S.earL : S.earR).kick((Math.random() < .5 ? -1 : 1) * 6); nextTwitch = n + 2.5 + Math.random() * 5; }
  const earBack = S.earBack.update(T, petting ? 1 : asleep ? .5 : 0);
  const earL = S.earL.update(T, 0) * .5, earR = S.earR.update(T, 0) * .5;

  // tail wags faster when happy
  const amp = S.wag.update(T, asleep ? .02 : happy ? .45 : (n - lastMove < 2 ? .22 : .14));
  const freq = S.wagF.update(T, happy ? 14 : 6);

  // hop and breath
  hopPx = reduce ? 0 : Math.round(Math.max(0, S.hop.update(T, 0)) * 4);
  const breath = Math.round(Math.sin(t * (2.4 - sleepAmt * 1.1)) * .9);
  const squish = S.squish.update(T, petting ? 1 : 0);

  // eyes and mouth
  if (n > nextBlink) { blinkUntil = n + .13; nextBlink = n + 2.2 + Math.random() * 3.4; if (Math.random() < .2) nextBlink = n + .35; }
  const eyes = sleepAmt > .5 ? "sleep" : n < squintUntil ? "squint" : happy ? "happy" : n < blinkUntil ? "blink" : "open";
  const mouth = chewing ? (Math.floor(t * 7) % 2 ? "chew" : "closed") : (n < openUntil || petting || (treat && treat.t > .55)) && sleepAmt < .5 ? "open" : "closed";

  const pose = {
    hx:Math.round(hx), hy:Math.round(hy), tilt:step(tiltV, .05), earL:step(earL, .08), earR:step(earR, .08), earBack:step(earBack, .25),
    tail:step(Math.sin(t * freq) * amp, .1), breath, eyes, lx, ly, mouth, squish:step(squish, .5),
  };
  const key = JSON.stringify(pose, (k, v) => k === "lx" || k === "ly" ? Math.round(v) : v);
  if (key !== lastKey) { render(pose, dogBuf); lastKey = key; }

  // treat flight: a bone arcs in from a top corner into the mouth
  if (treat) {
    treat.t += T / treat.dur;
    const k = Math.min(1, treat.t), mx = OX + face.nose[0], my = OY - hopPx + face.nose[1] + 3;
    treat.x = treat.fx + (mx - treat.fx) * k; treat.y = treat.fy + (my - treat.fy) * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 8;
    if (k >= 1) { treat = null; treatBtn.disabled = false; chewUntil = n + 1.6; happyUntil = n + 2.6; if (!reduce) S.hop.kick(4); hearts(3); }
  }
  if (asleep && n > nextZ) { zee(); nextZ = n + 1.8; }

  // compose the scene
  px.fill(0);
  const sw = 21 - hopPx * 1.2;
  for (let y = OY + 59; y <= OY + 63; y++) for (let x = 0; x < SW; x++) {
    const gx = (x + .5 - OX - 32.5) / sw, gy = (y + .5 - OY - 61.2) / 2.4;
    if (gx * gx + gy * gy < 1) px[y * SW + x] = SHADOW;
  }
  for (let y = 0; y < H; y++) {
    const Y = y + OY - hopPx; if (Y < 0 || Y >= SH) continue;
    for (let x = 0; x < W; x++) { const v = dogBuf[y * W + x]; if (v) px[Y * SW + x + OX] = PAL[v]; }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += T; if (p.age > p.life) { parts.splice(i, 1); continue; }
    p.x += p.vx * T; p.y += p.vy * T;
    const a = p.age < .15 ? p.age / .15 : p.age > p.life * .6 ? 1 - (p.age - p.life * .6) / (p.life * .4) : 1;
    if (p.kind === "heart") blit(SPRITES.heart, p.x, p.y, heartMap, a);
    else blit(SPRITES.z, p.x + Math.sin(p.age * 3) * 1.5, p.y, zMap, a * .9);
  }
  if (treat) blit(SPRITES.bone, treat.x, treat.y, boneMap);
  ctx.putImageData(img, 0, 0);
  loop();
};
const loop = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
document.addEventListener("visibilitychange", () => { last = performance.now(); loop(); });
loop();
canvas.classList.add("on");
setTimeout(hello, 650);
