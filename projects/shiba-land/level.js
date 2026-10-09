// Hand-built ASCII levels. Each level is a list of 13-row chunks glued left to right,
// so every chunk stays small enough to read. Row 0 is the top of the screen (y = 12),
// row 12 the bottom (y = 0). The Shiba stands on y = 2.
//
//   #  ground          B  brick           O  bone block       H  brick hiding a heart (1UP)
//   S  stone step      =  plank platform  C  column           o  bone
//   v  robot vacuum    c  crow            @  start            k  checkpoint post
//   D  doghouse goal (left edge of a 3-wide house)

export const ROWS = 13;

const L1 = [
  [ // home street
    "", "", "", "", "",
    "                o",
    "          O    BOB",
    "", "", "",
    "  @                 v",
    "########################",
    "########################",
  ],
  [ // columns
    "", "", "", "", "", "",
    "                  o",
    "",
    "          C       C",
    "    C     C   o   C",
    "    C  v  C  o o  C    v",
    "############################",
    "############################",
  ],
  [ // first gaps and a shelf
    "", "", "", "", "", "",
    "                            c",
    "          o o o",
    "         =======",
    "",
    "                     v",
    "######   ######   ####   ######",
    "######   ######   ####   ######",
  ],
  [ // two tiers of blocks
    "", "", "",
    "              o o",
    "            BHBBB",
    "", "",
    "  O      BOBBB        O",
    "", "",
    "              v       v",
    "##############################",
    "##############################",
  ],
  [ // checkpoint, steps over a gap
    "", "", "", "", "",
    "              o o",
    "",
    "            S    S",
    "           SS    SS",
    "          SSS    SSS",
    "  k      SSSS    SSSS",
    "#############    #############",
    "#############    #############",
  ],
  [ // vacuum parade, planks over a pit
    "", "", "",
    "                       c",
    "", "",
    "     O O O           o",
    "                    ===",
    "                 ===   ===",
    "",
    "        v   v",
    "##################      ##########",
    "##################      ##########",
  ],
  [ // crows above columns
    "", "", "",
    "           c         c",
    "",
    "    o  o",
    "",
    "   BOOB",
    "                    C",
    "             C      C",
    "        v    C      C   v",
    "############################",
    "############################",
  ],
  [ // the last climb and the doghouse
    "", "", "", "", "",
    "             o",
    "             S",
    "            SS",
    "           SSS",
    "          SSSS",
    "         SSSSS              D",
    "########################################",
    "########################################",
  ],
];

const L2 = [
  [
    "", "", "", "", "", "",
    "",
    "              o o o",
    "             =======",
    "",
    "  @                  v",
    "##########   #############",
    "##########   #############",
  ],
  [
    "", "", "", "", "", "",
    "                    o o o",
    "                   BBOBB",
    "     C       C",
    "     C       C",
    "  v  C   v   C        v",
    "##############    ############",
    "##############    ############",
  ],
  [
    "", "", "",
    "               c",
    "",
    "             o",
    "            ===",
    "        o         ===",
    "       ===          ",
    "",
    "  k                       v",
    "#####                  #########",
    "#####                  #########",
  ],
  [
    "", "", "",
    "                 c",
    "", "",
    "       O   H",
    "", "", "",
    "     v   v    v",
    "##########################",
    "##########################",
  ],
  [
    "", "", "", "", "", "",
    "        o",
    "        S",
    "       SS",
    "      SSS",
    "     SSSS            D",
    "##############################",
    "##############################",
  ],
];

export const LEVELS = [
  { id: "1-1", name: "LAVENDER LANE", theme: "meadow", chunks: L1 },
  { id: "1-2", name: "ROOFTOP RUN", theme: "town", chunks: L2 },
];

// Glue chunks into one grid and pull out the things that are not plain tiles.
export function parseLevel(def) {
  const rows = Array.from({ length: ROWS }, () => "");
  for (const chunk of def.chunks) {
    if (chunk.length !== ROWS) throw new Error(`chunk has ${chunk.length} rows`);
    const w = Math.max(...chunk.map((r) => r.length));
    chunk.forEach((r, i) => { rows[i] += r.padEnd(w, " "); });
  }
  const width = rows[0].length;
  const tiles = [];   // tiles[y][x], y = 0 at the bottom
  const things = [];  // { kind, x, y }
  for (let y = 0; y < ROWS; y++) tiles.push(new Array(width).fill(" "));
  rows.forEach((row, r) => {
    const y = ROWS - 1 - r;
    [...row].forEach((ch, x) => {
      if ("#BOHS=C".includes(ch)) tiles[y][x] = ch;
      else if (ch !== " ") things.push({ kind: ch, x, y });
    });
  });
  return { ...def, width, height: ROWS, tiles, things };
}

export const SOLID = new Set(["#", "B", "O", "H", "U", "S", "=", "C"]);
