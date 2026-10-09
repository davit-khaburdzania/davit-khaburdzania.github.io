# AGENTS.md

Guide for coding agents working on davit.cc, Davit Khaburdzania's personal site: a "personal playground" with Projects, a Playground of small experiments, Experience, and Writing.

## Ship it

- **Every push to `main` deploys davit.cc** within about a minute. Cloudflare Workers Builds is connected to this repo, and each commit gets a "Workers Builds: davit-cc" check. Running `npx wrangler deploy` by hand isn't needed.
- Work directly on `main`. Davit is the only person on this repo: no pull requests, no feature branches.
- Because a push is a deploy, show Davit a preview of any visual change (a screenshot or a hosted preview) and push once he's happy. Copy fixes and small bug fixes can go straight in.
- After pushing, check the live page with a cache-busting query, e.g. `https://davit.cc/?check=3`. The Cloudflare edge cache can serve the old page for a short while.
- The GitHub Pages workflow still runs on push, but it does not serve davit.cc. The site is the Cloudflare Worker.

## Stack

Plain static HTML, CSS and JS. No framework, no build step, no package.json.

| Path | What it is |
| --- | --- |
| `index.html` | The homepage: hero, Projects, Playground, Experience, Writing, footer |
| `assets/css/site.css` | All homepage styles. Tokens live in `:root` |
| `assets/js/site.js` | Hero dust shader, project card dust, phone menu, Playground tile previews |
| `assets/images/` | `og.jpg` share image, `shiba-pixel.png` (Pet the Shiba frames), `shiba-lavender.svg` (Space Invaders ship) |
| `projects/{dust,shiba,shiba-land,space-invaders}/` | Playground experiments, each its own page sharing `projects/lab.css` |
| `projects/vendor/` | three.js r180, vendored for Shiba Land |
| `projects/workplace/` | Old AngularJS demo, not linked from the site |
| `cv/` | CV page and PDFs. The site links `/cv/v4.pdf` |
| `404.html` | Not-found page, served by the Worker's `404-page` handling |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | Pixel-art Shiba head |
| `src/index.js`, `wrangler.jsonc` | Worker: redirects http and www to https://davit.cc, then serves the repo root as static assets |
| `.assetsignore` | Files the Worker must not serve. Add any new non-site file here (this one is listed) |

## Run it locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. Check layouts at 1440, 800 and 390 px wide. The CSS breakpoints are 1100, 820 and 520 px. Google Analytics (G-YCKV2L39B9) is in each page's head; leave it there.

## Design rules

- Light only. Mostly cool grey with a faint lavender glow. Davit found stronger lilac "too colourful". Never use green accents.
- Type: Geist and Geist Mono from Google Fonts. Big, tight headings with negative letter-spacing; black pill buttons.
- Use the colour tokens in `:root` (`--ground`, `--ink`, `--lilac`, `--lilac-deep` and the rest) instead of new hex values.
- Hero: a grainy, see-through "dust" shader (WebGL) drifting over a flat light page. Its palette and speed were tuned with Davit; don't change them without asking.
- Project cards: the same dust in each product's own soft colour (Rillow soft blue, Bundle lavender, Unposed dusty rose) with the product name and tagline. Illustrated scenes and redrawn product UIs were tried and rejected.
- Playground tiles are dark. New experiments get their own page under `projects/`, use `lab.css`, and get a dark tile.
- Logo: a lavender Shiba Inu head next to "davit.cc", drawn inline in the nav. Favicon: the natural-colour pixel Shiba. Keep pixel art pixel-exact: nearest-neighbour scaling only.
- Motion must respect `prefers-reduced-motion`. WebGL pieces need a non-WebGL fallback.
- Designs live in Paper, in the file "davit.cc redesign": https://app.paper.design/file/01M4EMWTXN1JH52ZAPPE14NV5W. Paper only runs on Davit's Mac.

## Content rules

- 15+ years of experience. The section is "Projects", not "Work". Projects in order: Rillow.ai, bundle.ink, unposed.camera.
- Experience must match Davit's CV: every CV job plus an "Earlier" row, short CV wording, and a tech line. Edit both together.
- Writing shows upcoming posts marked "Upcoming" until real posts exist.
- Davit exports CV PDFs himself. Don't edit the PDFs; swap the link when he sends a new one.
- Links: Twitter/X https://x.com/dkhaburdzania, GitHub davit-khaburdzania, LinkedIn dkhaburdzania. Location: Tbilisi, Georgia.
- No Nintendo characters or look-alikes; Shiba Land uses the Shiba as its hero.

## Code style

Match the surrounding code: compact JS inside one IIFE in `site.js`, terse CSS one rule per line, short comments only where the why isn't obvious. Plain-language commit messages that say what changed for a visitor.
