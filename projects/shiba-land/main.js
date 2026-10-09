// Shiba Land: a tiny Game Boy style platformer. Game state, physics and the main loop live here.
import * as THREE from "../vendor/three.module.min.js";
import "./assets.js";
import { LEVELS, parseLevel, SOLID } from "./level.js";
import { buildWorld } from "./world.js";
import { makeShiba, poseShiba, makeVacuum, makeCrow, makeBone, makeHeart } from "./models.js";
import { createRenderer, GW, GH } from "./render.js";
import { createInput } from "./input.js";
import { createAudio } from "./audio.js";
import { drawText, drawTextCentered, drawSprite, drawBox, textWidth, pad, PALETTE } from "./font.js";

// ---------- tuning (tiles and seconds) ----------
const DT = 1 / 60;
const P = {
  walk: 5.6, run: 9.2, accG: 30, accA: 20, fric: 26, skid: 50,
  gHold: 40, gFall: 70, gCut: 120, maxFall: 17,
  jump: 17.4, runBonus: 1.6, coyote: 0.1, buffer: 0.12, bounce: 11, bounceHold: 16,
};
const HERO_W = 0.62, HERO_H = 0.92;
const VIEW_HALF = 6.3;   // half the visible width at the play plane
const TIME_TICK = 0.4;   // seconds per clock unit
const TOP_KEY = "shiba-land-top";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// ---------- DOM, renderer, input, sound ----------
const gbEl = document.getElementById("gb");
const canvas = document.getElementById("screen");
const gfx = createRenderer(canvas);
const ctx = gfx.octx;
const audio = createAudio();
const sfx = audio.sfx;
const input = createInput(gbEl, () => audio.init());

// ---------- scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(1, 1, 1);
scene.fog = new THREE.Fog(0xffffff, 34, 120);
scene.add(new THREE.AmbientLight(0xffffff, 0.5 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, 0.56 * Math.PI);
sun.position.set(0.4, 1, 0.9);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(30, GW / GH, 1, 200);
const shiba = makeShiba();
scene.add(shiba.root);

// ---------- game state ----------
const game = {
  state: "title", t: 0, stateT: 0, level: 0, score: 0, bones: 0, lives: 3, time: 300, timeAcc: 0,
  top: 0, checkpoint: false, toast: "", toastT: 0, clearPhase: 0, hurried: false, pitDeath: false,
};
try { game.top = parseInt(localStorage.getItem(TOP_KEY) || "0", 10) || 0; } catch (_) { /* storage blocked */ }

const hero = {
  x: 0, y: 0, z: 0, w: HERO_W, h: HERO_H, vx: 0, vy: 0, prevY: 0, onGround: false, facing: 1, angle: 0,
  coyote: 0, buffer: 0, jumping: false, combo: 0, phase: 0, blinkT: 2, visible: true, hopped: false,
};
const cam = { x: 0, y: 6.1, shake: 0 };
let world = null;
let enemies = [];
let pops = [];      // items rising out of blocks
let floaters = [];  // score popups on the overlay
let curInp = { held: {}, pressed: {} };

function setState(s) { game.state = s; game.stateT = 0; }

function saveTop() {
  if (game.score > game.top) game.top = game.score;
  try { localStorage.setItem(TOP_KEY, String(game.top)); } catch (_) { /* ignore */ }
}

// ---------- level setup ----------
function loadLevel(i, fromCheckpoint = false) {
  if (world) world.dispose();
  enemies = []; pops = []; floaters = [];
  world = buildWorld(parseLevel(LEVELS[i]));
  scene.add(world.group);
  for (const s of world.spawns) enemies.push(makeEnemy(s));
  const start = fromCheckpoint && world.checkpoint ? world.checkpoint : world.start;
  Object.assign(hero, { x: start.x, y: start.y, z: 0, vx: 0, vy: 0, onGround: true, facing: 1, angle: 0, jumping: false, combo: 0, visible: true });
  game.time = 300; game.timeAcc = 0; game.hurried = false;
  cam.x = clampCam(hero.x + 2.5); cam.y = 6.1;
  shiba.root.rotation.set(0, 0, 0);
}

function makeEnemy(s) {
  if (s.kind === "v") {
    const m = makeVacuum();
    world.group.add(m.root);
    return { type: "vac", m, x: s.x + 0.5, y: s.y, vx: -1.5, vy: 0, w: 0.9, h: 0.55, active: false, state: "walk", t: 0 };
  }
  const m = makeCrow();
  world.group.add(m.root);
  return { type: "crow", m, x: s.x + 0.5, y: s.y + 0.2, baseY: s.y + 0.2, vx: -2.3, vy: 0, w: 0.72, h: 0.5, active: false, state: "fly", t: Math.random() * 6 };
}

function clampCam(x) {
  const lo = VIEW_HALF + 0.2, hi = world.width - VIEW_HALF - 0.2;
  return Math.min(Math.max(x, lo), hi);
}

// ---------- tile collision ----------
function solidAt(tx, ty) {
  if (tx < 0 || tx >= world.width) return true;
  if (ty < 0 || ty >= world.height) return false;
  return SOLID.has(world.tiles[ty][tx]);
}

// Move along x and stop at walls. Returns true when blocked.
function moveX(e, dx) {
  e.x += dx;
  const y0 = Math.floor(e.y + 0.02), y1 = Math.floor(e.y + e.h - 0.02);
  if (dx > 0) {
    const tx = Math.floor(e.x + e.w / 2);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = tx - e.w / 2 - 0.001; return true; }
  } else if (dx < 0) {
    const tx = Math.floor(e.x - e.w / 2);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = tx + 1 + e.w / 2 + 0.001; return true; }
  }
  return false;
}

// Move along y. Returns "floor", a ceiling hit { tx, ty }, or null.
function moveY(e, dy, isHero = false) {
  e.y += dy;
  const x0 = Math.floor(e.x - e.w / 2 + 0.02), x1 = Math.floor(e.x + e.w / 2 - 0.02);
  if (dy < 0) {
    const ty = Math.floor(e.y);
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) { e.y = ty + 1; e.vy = 0; return "floor"; }
  } else if (dy > 0) {
    const ty = Math.floor(e.y + e.h);
    const l = solidAt(x0, ty), r = solidAt(x1, ty);
    if (!l && !r) return null;
    if (isHero && l !== r) {
      // corner correction: slide past a block edge we only clipped a little
      const over = l ? x0 + 1 - (e.x - e.w / 2) : e.x + e.w / 2 - x1;
      if (over < 0.26) { e.x += l ? over + 0.002 : -over - 0.002; return null; }
    }
    e.y = ty - e.h; e.vy = 0;
    const cx = Math.floor(e.x);
    return { tx: solidAt(cx, ty) ? cx : (l ? x0 : x1), ty };
  }
  return null;
}

// ---------- scoring helpers ----------
function addScore(n, x, y, label) {
  game.score += n;
  if (x !== undefined) floaters.push({ text: label || String(n), x, y, t: 0 });
}
function addLife(x, y) {
  game.lives = Math.min(99, game.lives + 1);
  sfx.life();
  if (x !== undefined) floaters.push({ text: "1UP", x, y, t: 0 });
}
function addBones(n, x, y) {
  game.bones += n;
  if (game.bones >= 100) { game.bones -= 100; addLife(x, y + 0.6); }
}

// ---------- hero ----------
function updateHero(inp) {
  const h = hero;
  const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
  const max = inp.held.b ? P.run : P.walk;

  if (dir) {
    const skidding = h.onGround && h.vx * dir < -0.5;
    h.vx += dir * (skidding ? P.skid : h.onGround ? P.accG : P.accA) * DT;
    if (Math.abs(h.vx) > max) h.vx = Math.sign(h.vx) * Math.max(max, Math.abs(h.vx) - P.fric * DT);
    h.facing = dir;
  } else {
    const f = (h.onGround ? P.fric : P.fric * 0.3) * DT;
    h.vx = Math.abs(h.vx) <= f ? 0 : h.vx - Math.sign(h.vx) * f;
  }

  // jump buffering + coyote time
  h.buffer = inp.pressed.a ? P.buffer : Math.max(0, h.buffer - DT);
  h.coyote = h.onGround ? P.coyote : Math.max(0, h.coyote - DT);
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = P.jump + P.runBonus * Math.min(1, Math.abs(h.vx) / P.run);
    h.onGround = false; h.coyote = 0; h.buffer = 0; h.jumping = true;
    sfx.jump();
  }

  // variable height: releasing A while rising pulls you down faster
  let g = P.gFall;
  if (h.vy > 0) g = inp.held.a ? P.gHold : (h.jumping ? P.gCut : P.gHold);
  h.vy = Math.max(h.vy - g * DT, -P.maxFall);

  h.prevY = h.y;
  if (moveX(h, h.vx * DT)) h.vx = 0;
  h.onGround = false;
  const hit = moveY(h, h.vy * DT, true);
  if (hit === "floor") {
    h.onGround = true; h.jumping = false; h.combo = 0;
  } else if (hit) hitBlock(hit.tx, hit.ty);

  if (h.y < -1.6) die(true);
}

function hitBlock(tx, ty) {
  const t = world.tiles[ty]?.[tx];
  if (t === "O" || t === "H") {
    world.spend(tx, ty);
    world.bump(tx, ty);
    spawnPop(t === "O" ? "bone" : "heart", tx + 0.5, ty + 1);
    sfx.pop();
  } else if (t === "B" || t === "U") {
    world.bump(tx, ty);
    sfx.bump();
  } else sfx.bump();
  if (t === "B" || t === "O" || t === "H" || t === "U") {
    shake(0.08);
    // knock out anything standing on the block
    for (const e of enemies) {
      if (e.type === "vac" && e.state === "walk" && Math.abs(e.x - (tx + 0.5)) < 0.9 && Math.abs(e.y - (ty + 1)) < 0.15) knock(e, 200);
    }
  }
}

function spawnPop(kind, x, y) {
  const mesh = kind === "bone" ? makeBone() : makeHeart();
  mesh.position.set(x, y + 0.3, 0);
  world.group.add(mesh);
  pops.push({ kind, mesh, x, y: y + 0.3, vy: kind === "bone" ? 10 : 5, t: 0 });
}

function updatePops() {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += DT;
    if (p.kind === "bone") {
      p.vy -= 32 * DT; p.y += p.vy * DT;
      p.mesh.rotation.y += DT * 14;
      if (p.t > 0.45) {
        addBones(1, p.x, p.y); addScore(100, p.x, p.y); sfx.bone();
        p.mesh.removeFromParent(); pops.splice(i, 1); continue;
      }
    } else {
      p.y += Math.max(0, p.vy - p.t * 8) * DT;
      p.mesh.rotation.y = Math.sin(p.t * 6) * 0.6;
      if (p.t > 0.9) { addLife(p.x, p.y); p.mesh.removeFromParent(); pops.splice(i, 1); continue; }
    }
    p.mesh.position.set(p.x, p.y, 0);
  }
}

function collectBones() {
  const h = hero;
  for (const b of world.bones) {
    if (!b.alive) continue;
    if (Math.abs(b.x - h.x) < h.w / 2 + 0.22 && b.y > h.y - 0.25 && b.y < h.y + h.h + 0.25) {
      b.alive = false; b.mesh.visible = false;
      addBones(1, b.x, b.y); addScore(100);
      sfx.bone();
    }
  }
}

// ---------- enemies ----------
function knock(e, points) {
  e.state = "knock"; e.vy = 9; e.t = 0;
  addScore(points, e.x, e.y + 0.8);
  sfx.stomp();
}

function updateEnemies() {
  const h = hero;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.active) {
      if (e.x < cam.x + VIEW_HALF + 2.5) e.active = true; else continue;
    }
    e.t += DT;
    if (e.state === "walk") {
      e.vy = Math.max(e.vy - 60 * DT, -P.maxFall);
      if (moveX(e, e.vx * DT)) e.vx = -e.vx;
      // turn at ledges so vacuums patrol their platform
      if (moveY(e, e.vy * DT) === "floor") {
        const ahead = Math.floor(e.x + Math.sign(e.vx) * (e.w / 2 + 0.05));
        if (!solidAt(ahead, Math.floor(e.y) - 1)) e.vx = -e.vx;
      }
      if (e.y < -3) e.state = "gone";
    } else if (e.state === "fly") {
      e.x += e.vx * DT;
      e.y = e.baseY + Math.sin(e.t * 3) * 1.3;
    } else if (e.state === "flat") {
      if (e.t > 0.55) { e.state = "knock"; e.vy = 5; e.t = 0; }
    } else if (e.state === "knock") {
      e.vy -= 40 * DT; e.y += e.vy * DT; e.x += (e.type === "crow" ? 1 : 0.6) * DT;
      if (e.y < -4) e.state = "gone";
    }
    if (e.state === "gone" || e.x < cam.x - VIEW_HALF - 6) {
      e.m.root.removeFromParent(); enemies.splice(i, 1); continue;
    }

    // hero contact
    if (game.state !== "play" || (e.state !== "walk" && e.state !== "fly")) continue;
    const ex0 = e.x - e.w / 2, ex1 = e.x + e.w / 2, ey0 = e.y, ey1 = e.y + e.h;
    const overlap = h.x + h.w / 2 > ex0 && h.x - h.w / 2 < ex1 && h.y + h.h > ey0 && h.y < ey1;
    if (!overlap) continue;
    if (h.vy <= 0 && h.prevY >= ey0 + e.h * 0.45) {
      // stomp: chain bounces for bigger points
      h.combo++;
      const pts = [200, 400, 800, 1600, 3200][Math.min(h.combo - 1, 4)];
      if (h.combo > 5) addLife(e.x, e.y + 0.8); else addScore(pts, e.x, e.y + 0.8);
      h.vy = curInp.held.a ? P.bounceHold : P.bounce;
      h.jumping = true;
      h.y = ey1;
      if (e.type === "vac") { e.state = "flat"; e.t = 0; } else { e.state = "knock"; e.vy = 2; e.t = 0; }
      sfx.stomp();
      shake(0.1);
    } else {
      die(false);
      return;
    }
  }
}

function die(pit) {
  if (game.state !== "play") return;
  setState("dying");
  game.pitDeath = pit;
  hero.hopped = false;
  hero.vx = 0; hero.vy = 0;
  sfx.die();
}

function loseLife() {
  game.lives--;
  if (game.lives <= 0) { saveTop(); setState("over"); return; }
  loadLevel(game.level, game.checkpoint);
  setState("intro");
}

// ---------- level clear ----------
function startClear() {
  setState("clear");
  game.clearPhase = 0;
  hero.vx = 0;
}

function updateClear() {
  const h = hero, goal = world.goal;
  const t = game.stateT;
  if (game.clearPhase === 0) {
    // land, then trot to the door
    h.vy = Math.max(h.vy - P.gFall * DT, -P.maxFall);
    h.onGround = moveY(h, h.vy * DT) === "floor";
    const dx = goal.doorX - h.x;
    h.vx = Math.abs(dx) < 0.06 ? 0 : Math.sign(dx) * 3;
    h.facing = h.vx < 0 ? -1 : 1;
    h.x += h.vx * DT;
    if (h.onGround && Math.abs(dx) < 0.06) { h.x = goal.doorX; game.clearPhase = 1; game.stateT = 0; }
  } else if (game.clearPhase === 1) {
    // turn and walk into the doghouse
    h.vx = 0;
    if (t > 0.25) h.z -= 2.2 * DT;
    if (h.z < -1.5) { h.visible = false; game.clearPhase = 2; game.stateT = 0; sfx.clear(); }
  } else if (game.clearPhase === 2) {
    const k = Math.min(t / 1.1, 1);
    goal.flag.position.y = goal.flagLow + (goal.flagHigh - goal.flagLow) * (1 - Math.pow(1 - k, 3));
    if (t > 1.4) { game.clearPhase = 3; game.stateT = 0; }
  } else if (game.clearPhase === 3) {
    // count the clock into the score
    if (game.time > 0) {
      const n = Math.min(3, game.time);
      game.time -= n; game.score += n * 10;
      if (Math.floor(t * 60) % 4 === 0) sfx.tick();
    } else if (t > 0.3) { game.clearPhase = 4; game.stateT = 0; saveTop(); }
  } else if (t > 1.6) {
    if (game.level + 1 < LEVELS.length) {
      game.level++; game.checkpoint = false;
      loadLevel(game.level);
      setState("intro");
    } else {
      setState("end");
      h.visible = true; h.z = 0.4; h.x = goal.doorX + 1.2; h.y = goal.y; h.vx = 0;
      cam.x = clampCam(h.x + 2);
    }
  }
}

// ---------- tick ----------
function shake(n) { if (!reduceMotion.matches) cam.shake = Math.max(cam.shake, n); }

function startGame() {
  audio.init();
  sfx.start();
  Object.assign(game, { level: 0, score: 0, bones: 0, lives: 3, checkpoint: false });
  loadLevel(0);
  setState("intro");
}

function tick() {
  const inp = (curInp = input.poll());
  game.t += DT; game.stateT += DT;
  if (game.toastT > 0) game.toastT -= DT;

  if (inp.pressed.select) {
    audio.init();
    const muted = audio.toggle();
    game.toast = muted ? "SOUND OFF" : "SOUND ON"; game.toastT = 1.4;
    if (!muted) sfx.pause();
  }

  const s = game.state;
  if (s === "title") {
    if (inp.pressed.start || inp.pressed.a) startGame();
  } else if (s === "intro") {
    if (game.stateT > 2.2 || (game.stateT > 0.4 && inp.pressed.start)) setState("play");
  } else if (s === "play") {
    if (inp.pressed.start) { setState("pause"); sfx.pause(); return; }
    updateHero(inp);
    if (game.state === "play") {
      collectBones();
      updatePops();
      updateEnemies();
    }
    if (world.checkpoint && hero.x > world.checkpoint.x) game.checkpoint = true;
    // clock
    game.timeAcc += DT;
    if (game.timeAcc >= TIME_TICK) {
      game.timeAcc -= TIME_TICK;
      game.time = Math.max(0, game.time - 1);
      if (game.time === 100 && !game.hurried) { game.hurried = true; sfx.hurry(); }
      if (game.time === 0) die(false);
    }
    if (game.state === "play" && world.goal && hero.x >= world.goal.doorX - 0.3) startClear();
  } else if (s === "pause") {
    if (inp.pressed.start) { setState("play"); sfx.pause(); }
  } else if (s === "dying") {
    // short freeze, then the classic hop off the screen
    if (!game.pitDeath && game.stateT > 0.5) {
      if (!hero.hopped) { hero.hopped = true; hero.vy = 13; }
      hero.vy -= 36 * DT; hero.y += hero.vy * DT;
    }
    if (game.stateT > (game.pitDeath ? 1.4 : 2.6)) loseLife();
  } else if (s === "clear") {
    updateClear();
    updatePops();
  } else if (s === "over" || s === "end") {
    if (game.stateT > 0.8 && (inp.pressed.start || inp.pressed.a)) {
      saveTop();
      loadLevel(0);
      setState("title");
    }
  }

  world.update(DT);
  animateHero();
  updateCamera();
}

// Facing, run phase and blinking advance with the simulation, not the display rate.
function animateHero() {
  const h = hero, s = game.state;
  // facing: 0 = right, -PI = left, -PI/2 looks at the camera
  let target = h.facing > 0 ? 0 : -Math.PI;
  if (s === "dying" || s === "end") target = -Math.PI / 2;
  if (s === "clear" && game.clearPhase >= 1) target = h.angle > -Math.PI / 2 ? Math.PI / 2 : -1.5 * Math.PI;
  if (s === "title" || s === "intro") target = 0;
  h.angle += (target - h.angle) * Math.min(1, DT * 18);
  if (s === "play" || s === "clear") h.phase += Math.abs(h.vx) * DT * 2.6 + (s === "clear" && game.clearPhase === 1 ? DT * 8 : 0);
  h.blinkT -= DT;
  if (h.blinkT < -0.12) h.blinkT = 2 + Math.random() * 3;
}

function updateCamera() {
  const s = game.state;
  if (s === "play" || s === "clear") {
    const tx = clampCam(hero.x + 2.2);
    cam.x += (tx - cam.x) * (1 - Math.exp(-6 * DT));
    const ty = 6.1 + Math.max(0, hero.y - 7.2) * 0.8;
    cam.y += (ty - cam.y) * (1 - Math.exp(-4 * DT));
  }
  cam.shake *= Math.exp(-12 * DT);
  if (cam.shake < 0.004) cam.shake = 0;
}

// ---------- drawing ----------
const _v = new THREE.Vector3();
function project(x, y) {
  _v.set(x, y, 0).project(camera);
  return [(_v.x + 1) * 0.5 * GW, (1 - _v.y) * 0.5 * GH];
}

function textOutlined(str, x, y, shade = 0, bg = 3) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) drawText(ctx, str, x + dx, y + dy, bg);
  drawText(ctx, str, x, y, shade);
}

function drawHUD() {
  ctx.fillStyle = PALETTE[3]; ctx.fillRect(0, 0, GW, 19);
  ctx.fillStyle = PALETTE[2]; ctx.fillRect(0, 19, GW, 1);
  drawSprite(ctx, "face", 3, 1);
  drawText(ctx, "×" + game.lives, 16, 2, 0);
  drawText(ctx, pad(game.score, 6), 3, 11, 0);
  drawSprite(ctx, "bone", 50, 3);
  drawText(ctx, "×" + pad(game.bones, 2), 61, 2, 0);
  drawText(ctx, "WORLD", 92, 2, 0);
  drawText(ctx, LEVELS[game.level].id, 98, 11, 0);
  drawText(ctx, "TIME", 132, 2, 0);
  const hurry = game.time <= 100 && game.state === "play" && Math.floor(game.t * 4) % 2 === 0;
  drawText(ctx, pad(game.time, 3), 135, 11, hurry ? 1 : 0);
}

function drawFloaters() {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    if (game.state === "play" || game.state === "clear") f.t += 1 / 60;
    if (f.t > 0.8) { floaters.splice(i, 1); continue; }
    const [sx, sy] = project(f.x, f.y + f.t * 1.4);
    if (sy < 22) continue;
    textOutlined(f.text, Math.round(sx - textWidth(f.text) / 2), Math.round(sy - 4), 0, 3);
  }
}

const blink = () => Math.floor(game.t * 2.2) % 2 === 0;

function drawOverlay() {
  ctx.clearRect(0, 0, GW, GH);
  const s = game.state;
  if (s === "title") {
    drawBox(ctx, 10, 10, 140, 50);
    drawText(ctx, "SHIBA LAND", 22, 19, 1, 2);
    drawText(ctx, "SHIBA LAND", 21, 18, 0, 2);
    drawTextCentered(ctx, "LAVENDER EDITION", 39, 1);
    drawSprite(ctx, "bone", 22, 50); drawSprite(ctx, "bone", 129, 50);
    drawTextCentered(ctx, "2026 DAVIT.CC", 49, 1);
    drawBox(ctx, 28, 68, 104, 26);
    if (blink()) drawText(ctx, "▶PRESS START", 45, 73, 0);
    drawTextCentered(ctx, "A JUMP · B RUN", 83, 1);
    drawBox(ctx, 44, 129, 72, 13);
    drawTextCentered(ctx, "TOP " + pad(game.top, 6), 132, 0);
    return;
  }
  if (s === "intro") {
    ctx.fillStyle = PALETTE[3]; ctx.fillRect(0, 0, GW, GH);
    drawTextCentered(ctx, "WORLD " + LEVELS[game.level].id, 44, 0);
    drawTextCentered(ctx, LEVELS[game.level].name, 58, 1);
    drawSprite(ctx, "face", 60, 80);
    drawText(ctx, "× " + game.lives, 76, 81, 0);
    drawTextCentered(ctx, "TOP " + pad(game.top, 6), 120, 1);
    return;
  }
  drawHUD();
  drawFloaters();
  if (s === "pause") {
    drawBox(ctx, 36, 56, 88, 30);
    drawTextCentered(ctx, "PAUSE", 63, 0);
    drawTextCentered(ctx, "SELECT: SOUND", 74, 1);
  } else if (s === "over") {
    drawBox(ctx, 22, 40, 116, 58);
    drawTextCentered(ctx, "GAME OVER", 47, 0, 2);
    drawTextCentered(ctx, "SCORE " + pad(game.score, 6), 66, 0);
    drawTextCentered(ctx, "TOP   " + pad(game.top, 6), 76, 1);
    if (blink()) drawTextCentered(ctx, "▶PRESS START", 87, 0);
  } else if (s === "clear" && game.clearPhase >= 2) {
    drawBox(ctx, 24, 88, 112, 50);
    drawTextCentered(ctx, "WELL DONE!", 95, 0);
    const row = (label, value, y, shade) => {
      drawText(ctx, label, 34, y, shade);
      drawText(ctx, value, 126 - textWidth(value), y, shade);
    };
    row("TIME", pad(game.time, 3) + "×10", 106, 1);
    row("BONES", "×" + pad(game.bones, 2), 116, 1);
    row("SCORE", pad(game.score, 6), 126, 0);
  } else if (s === "end") {
    drawBox(ctx, 10, 24, 140, 64);
    drawTextCentered(ctx, "THE END", 31, 1, 2); drawTextCentered(ctx, "THE END", 30, 0, 2, 79);
    drawTextCentered(ctx, "THANKS FOR PLAYING", 50, 0);
    drawTextCentered(ctx, "SCORE " + pad(game.score, 6), 63, 0);
    drawTextCentered(ctx, "TOP   " + pad(game.top, 6), 73, 1);
    if (blink() && game.stateT > 0.8) { drawBox(ctx, 38, 98, 84, 15); drawText(ctx, "▶PRESS START", 45, 102, 0); }
  }
  if (game.toastT > 0) {
    drawBox(ctx, 46, 122, 68, 15);
    drawTextCentered(ctx, game.toast, 126, 0);
  }
}

// Sync 3D objects to the simulation.
function syncScene() {
  const h = hero, s = game.state, t = game.t;
  const dying = s === "dying";
  shiba.root.position.set(h.x, h.y, h.z);
  shiba.root.rotation.y = h.angle;
  shiba.root.visible = h.visible;
  const running = s === "clear" && game.clearPhase === 1 ? 0.6 : Math.min(1, Math.abs(h.vx) / P.walk);
  poseShiba(shiba, {
    run: dying ? 0 : running, air: dying ? game.stateT > 0.5 : !h.onGround && s !== "title" && s !== "intro",
    vy: h.vy, t, phase: h.phase, blink: h.blinkT < 0 || dying,
    pant: dying || s === "end" || Math.abs(h.vx) > P.walk * 0.85,
  });

  for (const b of world.bones) if (b.alive) { b.mesh.rotation.y = t * 3; b.mesh.position.y = b.y + Math.sin(t * 4 + b.x) * 0.05; }
  for (const e of enemies) {
    const r = e.m.root;
    r.position.set(e.x, e.y, 0);
    if (e.type === "vac") {
      e.m.led.visible = Math.floor(t * 3) % 2 === 0;
      e.m.face.position.x = Math.sign(e.vx) * 0.09;
      e.m.body.rotation.z = e.state === "walk" ? Math.sin(e.t * 20) * 0.03 : Math.PI;
      e.m.body.position.y = e.state === "walk" ? 0 : 0.5;
      e.m.body.scale.y = e.state === "flat" ? 0.7 : 1;
    } else {
      r.rotation.y = Math.PI;
      const flap = Math.sin(e.t * 14) * 0.9;
      e.m.wings[0].rotation.x = -flap; e.m.wings[1].rotation.x = flap;
      e.m.body.rotation.z = e.state === "knock" ? e.t * 9 : Math.cos(e.t * 3) * 0.25;
      e.m.body.position.y = 0.25;
    }
  }

  // camera with optional shake
  const sx = cam.shake ? (Math.random() - 0.5) * cam.shake * 2 : 0;
  const sy = cam.shake ? (Math.random() - 0.5) * cam.shake * 2 : 0;
  camera.position.set(cam.x + 1.4 + sx, cam.y + 2.4 + sy, 21); // a little to the right and above
  camera.lookAt(cam.x + sx, cam.y + sy, 0);
}

function draw() {
  syncScene();
  drawOverlay();
  gfx.render(scene, camera, game.state === "intro" ? 0 : 0.15);
}

// ---------- layout: fit the handheld, keep the screen at an integer scale when we can ----------
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 3);
  const hint = document.getElementById("hint");
  const hintH = getComputedStyle(hint).display === "none" ? 0 : hint.offsetHeight + 16;
  const top = vw <= 640 ? 58 : 66;
  const fitW = Math.max(220, Math.min(vw - 32, (vh - top - hintH - 26) / 1.66, 520));
  const maxDev = fitW * 0.7 * dpr;
  const s = Math.floor(maxDev / GW);
  const devW = s >= 1 && s * GW >= maxDev * 0.86 ? s * GW : Math.round(maxDev);
  const devH = Math.round(devW * GH / GW);
  const cssW = devW / dpr;
  gbEl.style.fontSize = cssW / 70 + "px";
  canvas.style.width = cssW + "px";
  canvas.style.height = devH / dpr + "px";
  gfx.resize(devW, devH);
}
addEventListener("resize", layout);
layout();

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (document.hidden) return;
  acc += dt;
  let steps = 0;
  while (acc >= DT && steps < 5) { tick(); acc -= DT; steps++; }
  if (steps === 5) acc = 0;
  draw();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (game.state === "play") setState("pause");
    audio.suspend();
  } else {
    last = performance.now();
    audio.resume();
  }
});

loadLevel(0);
requestAnimationFrame(frame);

