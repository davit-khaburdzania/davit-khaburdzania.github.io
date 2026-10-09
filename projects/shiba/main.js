// Pet the Shiba: an SVG dog driven by a small animation loop. Eyes and head follow the pointer, the tail wags with mood, and it naps when ignored.
(()=>{
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const dog = $("dog"), svg = dog.querySelector("svg"), bubble = $("bubble"), treatBtn = $("treat");
  const el = {hop:$("hop"), tail:$("tail"), body:$("body"), head:$("head"), eyes:$("eyes"), happy:$("eyes-happy"), sleep:$("eyes-sleep"),
    tongue:$("tongue"), bl:$("blush-l"), br:$("blush-r"), shadow:$("shadow")};

  // Counts survive a reload
  const stats = {pets:0, boops:0, treats:0};
  try { Object.assign(stats, JSON.parse(localStorage.getItem("shiba-stats") || "{}")); } catch (e) {}
  const showStats = () => { $("n-pets").textContent = stats.pets; $("n-boops").textContent = stats.boops; $("n-treats").textContent = stats.treats; };
  const bump = k => { stats[k]++; showStats(); try { localStorage.setItem("shiba-stats", JSON.stringify(stats)); } catch (e) {} };
  showStats();

  const toSvg = (x, y) => { const m = svg.getScreenCTM(); return m ? new DOMPoint(x, y).matrixTransform(m.inverse()) : {x:32, y:30}; };
  const toScreen = (x, y) => { const m = svg.getScreenCTM(); return m ? new DOMPoint(x, y).matrixTransform(m) : {x:innerWidth/2, y:innerHeight/2}; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // Mood
  let now = performance.now(), lastActive = now, lastMove = 0;
  let happyUntil = 0, munchUntil = 0, squintUntil = 0, sleeping = false, petting = false;
  let ptr = null;
  // Animated values
  const v = {lx:0, ly:0, rot:0, hx:0, hy:0, squish:1, blush:0, kick:0, hop:0, hopT:-1, hops:0, blink:1, nextBlink:now + 2500};

  // Speech bubble
  let bubbleTimer = 0;
  const say = (text, ms = 1300, cls = "") => {
    clearTimeout(bubbleTimer);
    bubble.textContent = text; bubble.className = "bubble on " + cls;
    if (ms) bubbleTimer = setTimeout(() => bubble.classList.remove("on"), ms);
  };

  // Floating hearts
  const HEART = '<svg viewBox="0 0 24 22" width="22" height="20"><path d="M12 20.5C5.2 15.3 1.2 11.8 1.2 7.2 1.2 3.9 3.7 1.4 6.9 1.4c2.1 0 3.9 1.1 5.1 2.9 1.2-1.8 3-2.9 5.1-2.9 3.2 0 5.7 2.5 5.7 5.8 0 4.6-4 8.1-10.8 13.3z" fill="#F2A7B5" stroke="#111114" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const heart = (x, y) => {
    const h = document.createElement("div");
    h.className = "heart"; h.innerHTML = HEART;
    h.style.left = x + "px"; h.style.top = y + "px";
    h.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
    h.style.setProperty("--r", (Math.random() * 40 - 20) + "deg");
    h.addEventListener("animationend", () => h.remove());
    document.body.appendChild(h);
  };
  const heartsAbove = n => { const p = toScreen(32, 10); for (let i = 0; i < n; i++) setTimeout(() => heart(p.x + (Math.random() - .5) * 90, p.y + Math.random() * 20), i * 120); };

  const hop = n => { if (reduce) return; v.hopT = 0; v.hops = n; };
  const wake = () => { if (!sleeping) return; sleeping = false; say("!", 900); hop(1); };
  const active = () => { lastActive = performance.now(); };

  const bark = () => {
    active();
    if (sleeping) { wake(); return; }
    say(pick(["wan!", "wan wan!", "boof.", "hi!", "*happy shiba noises*", "awoo?"]));
    happyUntil = performance.now() + 1600; hop(2);
  };
  const boop = () => {
    active();
    if (sleeping) { wake(); return; }
    bump("boops"); say(pick(["boop!", "hey!", "boop?"]), 1000);
    v.kick = 7; squintUntil = performance.now() + 700;
  };

  // Pointer: anywhere on the page it is watched; on the dog you can pet, say hi, or boop the nose
  addEventListener("pointermove", e => {
    if (ptr && sleeping && Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 3) wakeDist += Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y);
    ptr = {x:e.clientX, y:e.clientY}; lastMove = performance.now(); active();
    if (sleeping && wakeDist > 220) { wakeDist = 0; wake(); }
  }, {passive:true});
  let wakeDist = 0;
  let down = null;
  dog.addEventListener("pointerdown", e => {
    const s = toSvg(e.clientX, e.clientY);
    down = {x:e.clientX, y:e.clientY, moved:0, petDist:0, onHead: s.y < 57 && s.x > 5 && s.x < 59, onNose: Math.hypot(s.x - 32, s.y - 43) < 5.5};
    dog.setPointerCapture(e.pointerId); active();
  });
  dog.addEventListener("pointermove", e => {
    if (!down) return;
    const d = Math.hypot(e.clientX - (down.lx ?? down.x), e.clientY - (down.ly ?? down.y));
    down.lx = e.clientX; down.ly = e.clientY; down.moved += d;
    if (down.onHead && down.moved > 10) {
      if (!petting) { petting = true; dog.classList.add("petting"); if (sleeping) wake(); }
      down.petDist += d; v.hx += (e.movementX || 0) * .02;
      if (down.petDist > 110) { down.petDist = 0; bump("pets"); heart(e.clientX, e.clientY - 10); if (Math.random() < .35) say(pick(["mmm", "more", "♥", "yes. there."]), 900); }
      happyUntil = performance.now() + 500;
    }
  });
  const release = () => {
    if (!down) return;
    if (down.moved < 10) down.onNose ? boop() : bark();
    down = null; petting = false; dog.classList.remove("petting");
  };
  dog.addEventListener("pointerup", release);
  dog.addEventListener("pointercancel", () => { down = null; petting = false; dog.classList.remove("petting"); });
  dog.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bark(); } });

  // Treats fall from above into the mouth
  const BONE = '<svg viewBox="0 0 44 22" width="44" height="22"><path d="M10 6C10 2 4 1 2.6 4.6 1.4 7.6 4 9.6 5.2 11 4 12.4 1.4 14.4 2.6 17.4 4 21 10 20 10 16h24c0 4 6 5 7.4 1.4 1.2-3-1.4-5-2.6-6.4 1.2-1.4 3.8-3.4 2.6-6.4C40 1 34 2 34 6z" fill="#fff" stroke="#111114" stroke-width="2" stroke-linejoin="round"/></svg>';
  treatBtn.addEventListener("click", () => {
    active();
    if (sleeping) { sleeping = false; say("…sniff?", 900); }
    treatBtn.disabled = true;
    const end = toScreen(32, 50), sx = end.x + (Math.random() - .5) * 240, sy = -40;
    const b = document.createElement("div");
    b.className = "treat"; b.innerHTML = BONE; document.body.appendChild(b);
    const kf = [], spin = (Math.random() < .5 ? -1 : 1) * 540;
    for (let i = 0; i <= 12; i++) {
      const k = i / 12, x = sx + (end.x - sx) * k, y = sy + (end.y - sy) * k * k;
      kf.push({transform:`translate(${x - 22}px,${y - 11}px) rotate(${spin * k}deg) scale(${1 - k * .35})`, opacity: k > .92 ? 0 : 1});
    }
    const a = b.animate(kf, {duration: reduce ? 200 : 900, easing:"linear"});
    happyUntil = performance.now() + 900;
    a.onfinish = () => {
      b.remove(); treatBtn.disabled = false;
      bump("treats"); munchUntil = performance.now() + 1300; happyUntil = performance.now() + 2200;
      say(pick(["nom nom nom", "crunch!", "*chomp*", "the best one yet"]), 1500); hop(1); heartsAbove(3);
    };
  });

  // Animation loop
  const ease = (cur, tgt, k, dt) => cur + (tgt - cur) * (1 - Math.exp(-k * dt));
  let last = performance.now(), raf = 0;
  const frame = t => {
    raf = 0;
    const dt = Math.min(.05, (t - last) / 1000); last = t; now = t;
    const s = t / 1000;
    const happy = now < happyUntil || petting, munch = now < munchUntil, squint = now < squintUntil;

    // fall asleep when ignored
    if (!sleeping && !petting && now - lastActive > 14000) { sleeping = true; wakeDist = 0; say("z z z", 0, "zz"); }

    // where to look
    let tx = 0, ty = 0;
    if (ptr && !sleeping) { const p = toSvg(ptr.x, ptr.y); tx = clamp((p.x - 32) / 45, -1, 1); ty = clamp((p.y - 33) / 45, -1, 1); }
    const idle = now - lastMove > 2500 && !happy && !sleeping;
    let rotT = tx * 8 + (idle ? Math.sin(s * .9) * 7 : 0) + (sleeping ? -5 : 0);
    if (petting && down && ptr) rotT += clamp((ptr.x - down.x) / 25, -9, 9);
    v.lx = ease(v.lx, tx * 1.5, 10, dt); v.ly = ease(v.ly, ty * 1.2, 10, dt);
    v.rot = ease(v.rot, rotT, 7, dt);
    v.hx = ease(v.hx, tx * 1.3, 6, dt);
    v.hy = ease(v.hy, (sleeping ? 2.6 : 0) + (petting ? 1.2 : 0), 6, dt);
    v.squish = ease(v.squish, petting ? .955 : 1, 12, dt);
    v.blush = ease(v.blush, happy || munch ? .8 : 0, 6, dt);
    v.kick = ease(v.kick, 0, 9, dt);

    // blink now and then
    if (now > v.nextBlink) { v.blink = 0; v.nextBlink = now + 2200 + Math.random() * 3500; }
    v.blink = ease(v.blink, 1, 22, dt);

    // hops
    let hopY = 0;
    if (v.hopT >= 0) {
      v.hopT += dt;
      const one = .32, k = v.hopT / one;
      if (k >= v.hops) v.hopT = -1;
      else hopY = -Math.sin((k % 1) * Math.PI) * (Math.floor(k) === 0 ? 6 : 3.5);
    }

    // breathing and tail
    const br = sleeping ? Math.sin(s * 1.3) * .022 : Math.sin(s * 2.6) * .01;
    const amp = sleeping ? 2 : happy || munch ? 22 : now - lastMove < 2000 ? 11 : 6;
    const freq = happy || munch ? 19 : 8;
    const tail = reduce ? amp * .3 : Math.sin(s * freq) * amp;

    el.hop.setAttribute("transform", `translate(0 ${hopY.toFixed(2)})`);
    el.shadow.setAttribute("rx", (30 + hopY * .9).toFixed(2));
    el.body.setAttribute("transform", `translate(0 112) scale(1 ${(1 + br).toFixed(4)}) translate(0 -112)`);
    el.tail.setAttribute("transform", `rotate(${tail.toFixed(2)} 50 88)`);
    const headY = v.hy - br * 60 + (munch ? Math.abs(Math.sin(s * 14)) * .8 : 0);
    el.head.setAttribute("transform", `translate(${v.hx.toFixed(2)} ${headY.toFixed(2)}) rotate(${(v.rot + v.kick).toFixed(2)} 32 56) translate(0 56) scale(1 ${v.squish.toFixed(3)}) translate(0 -56)`);
    const closed = happy || munch || squint;
    el.eyes.setAttribute("opacity", closed || sleeping ? 0 : 1);
    el.eyes.setAttribute("transform", `translate(${v.lx.toFixed(2)} ${v.ly.toFixed(2)}) translate(0 33) scale(1 ${Math.max(.08, v.blink).toFixed(3)}) translate(0 -33)`);
    el.happy.setAttribute("opacity", closed && !sleeping ? 1 : 0);
    el.sleep.setAttribute("opacity", sleeping ? 1 : 0);
    el.bl.setAttribute("opacity", v.blush.toFixed(2)); el.br.setAttribute("opacity", v.blush.toFixed(2));
    const tongue = munch ? 1 + Math.abs(Math.sin(s * 14)) * .4 : happy ? 1.3 : sleeping ? .6 : 1;
    el.tongue.setAttribute("transform", `translate(0 49.4) scale(1 ${tongue.toFixed(3)}) translate(0 -49.4)`);

    loop();
  };
  const loop = () => { if (!raf && !document.hidden) { raf = requestAnimationFrame(frame); } };
  document.addEventListener("visibilitychange", () => { last = performance.now(); loop(); });
  loop();
  setTimeout(() => { if (!sleeping) say("wan!", 1200); hop(2); }, 700);
})();
