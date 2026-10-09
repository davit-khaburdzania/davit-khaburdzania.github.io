// Keyboard + on-screen buttons (mouse and multi-touch via pointer events).
// poll() returns what is held now and what was pressed since the last poll.

const KEYS = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  KeyZ: "a", Space: "a", KeyK: "a",
  KeyX: "b", ShiftLeft: "b", ShiftRight: "b", KeyJ: "b",
  Enter: "start", NumpadEnter: "start", KeyP: "start", Escape: "start",
  KeyM: "select", Backspace: "select",
};
const NAMES = ["left", "right", "up", "down", "a", "b", "start", "select"];

export function createInput(root, onGesture) {
  const keyHeld = new Set();
  const pointers = new Map(); // pointerId -> Set of buttons
  const latch = new Set();
  const els = {};
  root.querySelectorAll("[data-btn]").forEach((el) => { els[el.dataset.btn] = el; });

  const held = (name) => keyHeld.has(name) || [...pointers.values()].some((s) => s.has(name));

  function refresh() {
    for (const name of ["a", "b", "start", "select"]) els[name]?.classList.toggle("on", held(name));
    const pad = els.dpad;
    if (pad) for (const [n, c] of [["left", "l"], ["right", "r"], ["up", "u"], ["down", "d"]]) pad.classList.toggle(c, held(n));
  }

  // ---- keyboard ----
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const name = KEYS[e.code];
    if (!name) return;
    e.preventDefault();
    onGesture();
    if (!e.repeat) latch.add(name);
    keyHeld.add(name);
    refresh();
  });
  addEventListener("keyup", (e) => {
    const name = KEYS[e.code];
    if (!name) return;
    keyHeld.delete(name);
    refresh();
  });

  // ---- pointers ----
  function buttonsAt(x, y) {
    const out = new Set();
    const el = document.elementFromPoint(x, y)?.closest("[data-btn]");
    if (!el || !root.contains(el)) return out;
    const name = el.dataset.btn;
    if (name !== "dpad") { out.add(name); return out; }
    const r = el.getBoundingClientRect();
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
    if (Math.abs(dx) > 0.2 && Math.abs(dx) >= Math.abs(dy) * 0.6) out.add(dx < 0 ? "left" : "right");
    if (Math.abs(dy) > 0.2 && Math.abs(dy) >= Math.abs(dx) * 0.6) out.add(dy < 0 ? "up" : "down");
    return out;
  }
  function track(e) {
    const now = buttonsAt(e.clientX, e.clientY);
    const before = pointers.get(e.pointerId) || new Set();
    for (const n of now) if (!before.has(n)) latch.add(n);
    pointers.set(e.pointerId, now);
    refresh();
  }
  root.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("[data-btn]")) return;
    e.preventDefault();
    onGesture();
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    track(e);
  });
  root.addEventListener("pointermove", (e) => { if (pointers.has(e.pointerId)) track(e); });
  const release = (e) => { if (pointers.delete(e.pointerId)) refresh(); };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);
  root.addEventListener("lostpointercapture", release);
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  // stop iOS pinch / double-tap zoom on the handheld
  for (const t of ["gesturestart", "gesturechange", "dblclick"]) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });

  addEventListener("blur", () => { keyHeld.clear(); pointers.clear(); refresh(); });

  return {
    poll() {
      const h = {}, p = {};
      for (const n of NAMES) { h[n] = held(n); p[n] = latch.has(n); }
      latch.clear();
      return { held: h, pressed: p };
    },
  };
}
