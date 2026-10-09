// Quiet square/triangle blips through WebAudio. The context is created on the first user gesture.
const KEY = "shiba-land-muted";

export function createAudio() {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (_) { /* storage blocked */ }

  function init() {
    if (ctx) { if (ctx.state === "suspended" && !document.hidden) ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }

  // One envelope-shaped note, optionally sliding in pitch.
  function tone(type, f0, f1, dur, vol = 0.05, delay = 0) {
    if (!ctx || muted || ctx.state !== "running") return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  const seq = (type, notes, step, vol) => notes.forEach((f, i) => tone(type, f, f, step * 0.95, vol, i * step));

  const sfx = {
    jump: () => tone("square", 240, 480, 0.11, 0.035),
    bone: () => tone("triangle", 660, 1320, 0.09, 0.08),
    pop: () => tone("triangle", 330, 990, 0.16, 0.07),
    stomp: () => { tone("square", 380, 120, 0.1, 0.04); tone("triangle", 180, 90, 0.08, 0.06, 0.02); },
    bump: () => tone("triangle", 150, 80, 0.08, 0.09),
    life: () => seq("triangle", [587, 740, 880, 1175], 0.07, 0.07),
    die: () => seq("square", [466, 392, 311, 233, 175], 0.13, 0.035),
    clear: () => seq("square", [392, 494, 587, 784, 587, 784], 0.11, 0.03),
    tick: () => tone("square", 1480, 1480, 0.025, 0.012),
    pause: () => seq("triangle", [880, 660], 0.06, 0.06),
    start: () => seq("triangle", [523, 784, 1047], 0.07, 0.06),
    hurry: () => seq("square", [880, 880, 880], 0.1, 0.025),
  };

  return {
    init, sfx,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (_) { /* ignore */ }
      return muted;
    },
    suspend() { if (ctx && ctx.state === "running") ctx.suspend().catch(() => {}); },
    resume() { if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); },
  };
}
