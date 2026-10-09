// Pet the Shiba (line art): one SVG drawing cut into parts (head, ears, eyes, tail, body), each turned
// around its own pivot by second-order springs, so the dog moves softly and settles naturally.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const host = document.getElementById("dog"), fx = document.getElementById("fx");
const boneEl = document.getElementById("bone"), treatBtn = document.getElementById("treat");

host.innerHTML = await fetch("shiba.svg").then(r => r.text());
const svg = host.querySelector("svg");
svg.removeAttribute("width"); svg.removeAttribute("height");
const $ = id => svg.getElementById(id);
const G = {
  root:$("shiba"), tail:$("tail"), body:$("body"), head:$("head"), earL:$("ear-left"), earR:$("ear-right"),
  eyeL:$("eye-left"), eyeR:$("eye-right"), nose:$("nose"), mouth:$("mouth"),
  happy:$("eyes-happy"), sleepy:$("eyes-sleepy"), open:$("mouth-open"),
};
const pivot = el => el.dataset.pivot.split(" ").map(Number);
const show = (el, on) => { el.style.display = on ? "" : "none"; };
G.happy.removeAttribute("display"); G.sleepy.removeAttribute("display"); G.open.removeAttribute("display");

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
  lx:new Spring(3.2, .8, 0), ly:new Spring(3.2, .8, 0), turn:new Spring(1.6, .6, 1), pitch:new Spring(1.6, .6, 1),
  tilt:new Spring(1.3, .5, 1), lean:new Spring(1.4, .6, 0), recoil:new Spring(3, .35, 0),
  earL:new Spring(3.2, .3, 0), earR:new Spring(3.2, .3, 0), earBack:new Spring(2.4, .7, 0),
  wag:new Spring(1.5, 1, 0, .3), wagF:new Spring(1.5, 1, 0, 6), hop:new Spring(2.4, .3, 0),
  sleep:new Spring(.8, 1, 0), blinkS:new Spring(9, 1, 0, 1),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now() / 1000;

let lastActive = now(), lastMove = -10, happyUntil = 0, squintUntil = 0, openUntil = 0, chewUntil = 0, blinkUntil = 0;
let asleep = false, petEnergy = 0, tilt = 0, glance = null, nextGlance = now() + 4, nextBlink = now() + 2, nextTwitch = now() + 3, nextZ = 0;
let pointer = null, treat = null;

// Map a point in the drawing to the screen
const toScreen = (x, y) => { const m = G.head.getScreenCTM(); const p = new DOMPoint(x, y).matrixTransform(m); return {x:p.x, y:p.y}; };
const [NX, NY] = pivot(G.nose), [MX, MY] = pivot(G.mouth), [HX, HY] = [50, 9];

// --- Hearts and z's -------------------------------------------------------------
const heartSVG = '<svg viewBox="0 0 24 22"><path d="M12 20.4C5.4 15.4 1.6 12 1.6 7.6 1.6 4.4 4 2 7.1 2c2 0 3.8 1 4.9 2.7C13.1 3 14.9 2 16.9 2 20 2 22.4 4.4 22.4 7.6c0 4.4-3.8 7.8-10.4 12.8z" fill="#F2A7B5" stroke="#221C3E" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const heart = (x, y) => {
  if (fx.childElementCount > 10) return;
  const h = document.createElement("div"); h.className = "heart"; h.innerHTML = heartSVG;
  h.style.left = x + "px"; h.style.top = y + "px";
  h.style.setProperty("--dx", (Math.random() * 50 - 25) + "px"); h.style.setProperty("--r", (Math.random() * 30 - 15) + "deg");
  h.addEventListener("animationend", () => h.remove()); fx.appendChild(h);
};
const hearts = n => { for (let i = 0; i < n; i++) setTimeout(() => { const p = toScreen(HX, HY); heart(p.x + (Math.random() - .5) * 90, p.y + Math.random() * 20); }, i * 140); };
const zee = () => { const p = toScreen(HX + 6, HY); const z = document.createElement("div"); z.className = "zz"; z.textContent = "z"; z.style.left = p.x + "px"; z.style.top = p.y + "px"; z.addEventListener("animationend", () => z.remove()); fx.appendChild(z); };

// --- What the dog does ----------------------------------------------------------
const wake = () => { asleep = false; S.earL.kick(-40); S.earR.kick(40); };
const active = () => { lastActive = now(); if (asleep) wake(); };
const hello = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  if (!reduce) S.hop.kick(6);
  happyUntil = now() + 1.2; openUntil = now() + .9; S.earL.kick(-50); S.earR.kick(50);
};
const boop = () => {
  lastActive = now();
  if (asleep) { wake(); return; }
  squintUntil = now() + .8; if (!reduce) S.recoil.kick(-9);
  const p = toScreen(NX, NY); heart(p.x + 10, p.y - 14);
};
const giveTreat = () => {
  if (treat) return;
  active();
  const side = Math.random() < .5 ? -1 : 1;
  treat = {t:0, fx:side < 0 ? innerWidth * .12 : innerWidth * .88, fy:innerHeight * .1, x:0, y:0, spin:side * 540, dur:reduce ? .35 : 1.15};
  boneEl.style.display = "block"; treatBtn.disabled = true;
};
treatBtn.addEventListener("click", giveTreat);

// --- Pointer --------------------------------------------------------------------
const hit = (x, y) => {
  const el = document.elementFromPoint(x, y);
  if (!el || !svg.contains(el)) return null;
  const n = toScreen(NX, NY), r = svg.getBoundingClientRect().width * .06;
  if (Math.hypot(x - n.x, y - n.y) < r) return "nose";
  return G.head.contains(el) ? "head" : "body";
};
let down = null;
addEventListener("pointermove", e => {
  const prev = pointer; pointer = {x:e.clientX, y:e.clientY};
  const d = prev ? Math.hypot(e.clientX - prev.x, e.clientY - prev.y) : 0;
  if (d > 0) lastMove = now();
  const over = hit(e.clientX, e.clientY);
  host.style.cursor = over === "head" || over === "nose" ? "grab" : over ? "pointer" : "default";
  // stroking the head (hovering with a mouse, or dragging with a finger) is petting
  if ((over === "head" || over === "nose") && (e.pointerType === "mouse" || down) && d > 0) {
    petEnergy = Math.min(2.2, petEnergy + d * .009); active();
    if (prev) S.lean.kick((e.clientX - prev.x) * .02);
    if (petEnergy > .6 && Math.random() < d * .004) heart(e.clientX + (Math.random() - .5) * 20, e.clientY - 14);
  } else if (asleep && d > 30) active();
  if (down) down.moved += d;
}, {passive:true});
document.addEventListener("pointerleave", () => { pointer = null; });
host.addEventListener("pointerdown", e => { pointer = {x:e.clientX, y:e.clientY}; down = {moved:0, over:hit(e.clientX, e.clientY)}; host.setPointerCapture(e.pointerId); });
host.addEventListener("pointerup", () => {
  if (down && down.moved < 8) { if (down.over === "nose") boop(); else if (down.over) hello(); else active(); }
  down = null;
});
host.addEventListener("pointercancel", () => { down = null; });
host.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hello(); }
  else if (e.key === "b" || e.key === "B") boop();
  else if (e.key === "t" || e.key === "T") giveTreat();
});

// --- Animation loop -------------------------------------------------------------
const rot = (el, deg) => { el.style.transform = `rotate(${deg.toFixed(2)}deg)`; };
let last = performance.now(), raf = 0;
const frame = ms => {
  raf = 0;
  const T = Math.min(.05, Math.max(.001, (ms - last) / 1000)); last = ms;
  const t = ms / 1000, n = now();

  if (!asleep && !treat && n - lastActive > 18) asleep = true;
  petEnergy = Math.max(0, petEnergy - T * .8);
  const petting = petEnergy > .35, chewing = n < chewUntil;
  const happy = n < happyUntil || petting || chewing;

  // where to look: the treat, the pointer, or a lazy glance around
  const eye = toScreen(53, 15.5), size = svg.getBoundingClientRect().height;
  let tx = eye.x + size * .3, ty = eye.y + size * .1;
  if (treat) { tx = treat.x; ty = treat.y; }
  else if (pointer && !asleep) { tx = pointer.x; ty = pointer.y; glance = null; }
  else {
    if (n > nextGlance) { glance = Math.random() < .35 ? null : {x:eye.x + (Math.random() - .3) * size * .8, y:eye.y + (Math.random() - .5) * size * .5}; nextGlance = n + 2.5 + Math.random() * 3; }
    if (glance) { tx = glance.x; ty = glance.y; }
  }
  const dx = (tx - eye.x) / size, dy = (ty - eye.y) / size;
  const sleepAmt = S.sleep.update(T, asleep ? 1 : 0);
  const lx = S.lx.update(T, asleep ? 0 : clamp(dx * 3, -1, 1)), ly = S.ly.update(T, asleep ? 0 : clamp(dy * 3, -1, 1));
  // the head lifts towards things above it and dips towards things below; it leans a touch towards the side
  const pitch = S.pitch.update(T, asleep ? 4 : clamp(dy * 14, -5, 4));
  const turn = S.turn.update(T, asleep ? 0 : clamp(dx * 1.6, -.8, .6));

  // a curious head tilt when the pointer rests, a lean into the hand while petting
  if (n - lastMove > 1.6 && !asleep && !petting && !treat && !chewing) { if (!tilt) tilt = Math.random() < .5 ? -3 : 3; } else tilt = 0;
  const lean = S.lean.update(T, 0);
  const headRot = clamp(pitch + S.tilt.update(T, tilt) + (petting ? clamp(lean, -3, 3) : 0), -7, 6);
  const recoil = S.recoil.update(T, 0);
  const hop = reduce ? 0 : Math.max(0, S.hop.update(T, 0));
  const breath = Math.sin(t * (2.4 - sleepAmt * 1.1));
  G.head.style.transform = `translate(${(turn + recoil * .1).toFixed(3)}px, ${(breath * .18 + sleepAmt * .6).toFixed(3)}px) rotate(${headRot.toFixed(2)}deg)`;
  G.body.style.transform = `scale(1, ${(1 + breath * .006).toFixed(4)})`;
  G.root.style.transform = `translateY(${(-hop * 1.4).toFixed(3)}px)`;

  // ears: twitch now and then, fold back with pleasure, droop a little asleep (negative folds back)
  if (n > nextTwitch && !asleep) { (Math.random() < .5 ? S.earL : S.earR).kick((Math.random() < .5 ? -1 : 1) * 45); nextTwitch = n + 2.5 + Math.random() * 5; }
  const back = S.earBack.update(T, petting ? 1 : asleep ? .5 : 0);
  rot(G.earL, clamp(S.earL.update(T, 0) - back * 7, -8, 8));
  rot(G.earR, clamp(S.earR.update(T, 0) - back * 7, -8, 8));

  // tail wags faster when happy (it only swings up from rest, so no gap opens at the root)
  const amp = S.wag.update(T, asleep ? .05 : happy ? 1 : (n - lastMove < 2 ? .55 : .3));
  const freq = S.wagF.update(T, happy ? 15 : 6);
  rot(G.tail, (Math.sin(t * freq) * .5 + .5) * amp * 8);

  // eyes: look, blink, and swap to happy, squinting or sleepy shapes
  if (n > nextBlink) { blinkUntil = n + .14; nextBlink = n + 2.2 + Math.random() * 3.4; if (Math.random() < .2) nextBlink = n + .35; }
  const blink = S.blinkS.update(T, n < blinkUntil ? .08 : 1);
  const closed = sleepAmt > .5 ? "sleepy" : (n < squintUntil || happy) ? "happy" : null;
  show(G.eyeL, !closed); show(G.eyeR, !closed); show(G.happy, closed === "happy"); show(G.sleepy, closed === "sleepy");
  const eyeT = `translate(${(lx * .35).toFixed(3)}px, ${(ly * .25).toFixed(3)}px) scale(1, ${clamp(blink, .05, 1).toFixed(3)})`;
  G.eyeL.style.transform = eyeT; G.eyeR.style.transform = eyeT;

  // mouth: open when saying hi, petting or catching; chomping while it chews
  const open = chewing ? Math.floor(t * 7) % 2 === 0 : (n < openUntil || petting || (treat && treat.t > .55)) && sleepAmt < .5;
  show(G.mouth, !open); show(G.open, open);
  G.nose.style.transform = n < squintUntil ? `scale(${(1 + Math.max(0, squintUntil - n) * .25).toFixed(3)})` : "";

  // treat flight: a bone arcs in from a top corner into the mouth
  if (treat) {
    treat.t += T / treat.dur;
    const k = Math.min(1, treat.t), m = toScreen(MX + 1.5, MY);
    treat.x = treat.fx + (m.x - treat.fx) * k; treat.y = treat.fy + (m.y - treat.fy) * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 60;
    boneEl.style.transform = `translate(${treat.x}px, ${treat.y}px) rotate(${(k * treat.spin).toFixed(1)}deg) scale(${(1 - Math.max(0, k - .85) * 4).toFixed(3)})`;
    if (k >= 1) { treat = null; boneEl.style.display = "none"; treatBtn.disabled = false; chewUntil = n + 1.6; happyUntil = n + 2.6; if (!reduce) S.hop.kick(4); hearts(3); }
  }
  if (asleep && n > nextZ) { zee(); nextZ = n + 1.8; }
  loop();
};
const loop = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
document.addEventListener("visibilitychange", () => { last = performance.now(); loop(); });
loop();
host.classList.add("on");
setTimeout(hello, 650);
