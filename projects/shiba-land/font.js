// Tiny 5x7 bitmap font and pixel sprites, drawn onto the 160x144 overlay in the four lavender shades.
// Shade index: 0 darkest, 1 dark, 2 light, 3 lightest.

export const PALETTE = ["#24233F", "#6A68A8", "#B9B7E6", "#E9E8FC"];

// Rows top to bottom, bit 4 is the leftmost pixel.
const GLYPHS = {
  A: [14, 17, 17, 17, 31, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
  3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0], "-": [0, 0, 0, 31, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8], "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4],
  ":": [0, 12, 12, 0, 12, 12, 0], "'": [12, 4, 8, 0, 0, 0, 0], "/": [0, 1, 2, 4, 8, 16, 0],
  "+": [0, 4, 4, 31, 4, 4, 0], "×": [0, 17, 10, 4, 10, 17, 0], "·": [0, 0, 0, 12, 12, 0, 0],
  "▶": [16, 24, 28, 30, 28, 24, 16], "♥": [0, 10, 31, 31, 14, 4, 0], "©": [14, 17, 23, 25, 23, 17, 14],
};

// Sprites: k darkest, d dark, l light, w lightest, "." transparent.
const SPRITES = {
  face: [
    ".k.......k.",
    "kwk.....kwk",
    "kwlkkkkklwk",
    "klllllllllk",
    "kllklllkllk",
    "kwllwkwllwk",
    "kwwwwkwwwwk",
    ".kwwwwwwwk.",
    "..kkkkkkk..",
  ],
  bone: [
    "kk.....kk",
    "kwkkkkkwk",
    ".kwwwwwk.",
    "kwkkkkkwk",
    "kk.....kk",
  ],
  heart: [
    ".kk.kk.",
    "kwwkllk",
    "kwllllk",
    ".klllk.",
    "..klk..",
    "...k...",
  ],
};

const ORDER = Object.keys(GLYPHS);
const INDEX = new Map(ORDER.map((c, i) => [c, i]));
const SHADE_OF = { k: 0, d: 1, l: 2, w: 3 };

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

// One glyph strip per shade so text is a single drawImage per character.
const atlases = PALETTE.map((color) => {
  const c = makeCanvas(ORDER.length * 6, 7);
  const g = c.getContext("2d");
  g.fillStyle = color;
  ORDER.forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      for (let x = 0; x < 5; x++) if (row & (16 >> x)) g.fillRect(i * 6 + x, y, 1, 1);
    });
  });
  return c;
});

const spriteCanvases = {};
for (const [name, rows] of Object.entries(SPRITES)) {
  const c = makeCanvas(rows[0].length, rows.length);
  const g = c.getContext("2d");
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch in SHADE_OF) { g.fillStyle = PALETTE[SHADE_OF[ch]]; g.fillRect(x, y, 1, 1); }
    });
  });
  spriteCanvases[name] = c;
}

export const textWidth = (str, scale = 1) => (str.length * 6 - 1) * scale;

export function drawText(ctx, str, x, y, shade = 0, scale = 1) {
  const atlas = atlases[shade];
  str = String(str).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const idx = INDEX.get(str[i]);
    if (idx === undefined || str[i] === " ") continue;
    ctx.drawImage(atlas, idx * 6, 0, 5, 7, Math.round(x + i * 6 * scale), Math.round(y), 5 * scale, 7 * scale);
  }
}

export function drawTextCentered(ctx, str, y, shade = 0, scale = 1, cx = 80) {
  drawText(ctx, str, Math.round(cx - textWidth(str, scale) / 2), y, shade, scale);
}

export function drawSprite(ctx, name, x, y) {
  ctx.drawImage(spriteCanvases[name], Math.round(x), Math.round(y));
}

export function spriteSize(name) {
  const c = spriteCanvases[name];
  return [c.width, c.height];
}

// Dialog box: darkest frame, lightest fill, a light inner rule.
export function drawBox(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  ctx.fillRect(x + 2, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
}

export const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, "0");
