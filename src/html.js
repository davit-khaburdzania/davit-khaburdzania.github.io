// A tiny HTML parser and HTML-to-Markdown converter for the site's own pages.
// The pages are hand-written, well-formed HTML, so this stays small on purpose.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", middot: "·", copy: "©", rarr: "→", larr: "←", darr: "↓" };

export function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

export function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith("<!")) continue;
    if (!m[2]) { top.children.push({ text: m[0] }); continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const i = stack.findLastIndex((n) => n.tag === tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const node = { tag, attrs: attrs(m[3]), children: [] };
    top.children.push(node);
    if (RAW.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      node.raw = html.slice(re.lastIndex, end < 0 ? html.length : end);
      re.lastIndex = end < 0 ? html.length : html.indexOf(">", end) + 1;
    } else if (!VOID.has(tag) && !m[3].trim().endsWith("/")) stack.push(node);
  }
  return root;
}

export const hasClass = (n, c) => (n.attrs?.class || "").split(/\s+/).includes(c);

export function findAll(n, test, out = []) {
  for (const c of n.children || []) {
    if (c.tag && test(c)) out.push(c);
    if (c.children) findAll(c, test, out);
  }
  return out;
}

export const find = (n, test) => findAll(n, test)[0];
export const byClass = (c) => (n) => hasClass(n, c);
export const byTag = (t) => (n) => n.tag === t;

export function text(n) {
  if (!n) return "";
  if (n.text !== undefined) return decode(n.text);
  if (n.raw !== undefined) return n.tag === "script" || n.tag === "style" ? n.raw : decode(n.raw);
  return (n.children || []).map(text).join("");
}

export const clean = (s) => s.replace(/\s+/g, " ").trim();

// Elements an agent never needs: page chrome, drawings, scripts and decoration.
const SKIP = new Set(["head", "script", "style", "svg", "canvas", "noscript", "template", "iframe", "nav", "button", "form", "input", "select", "textarea", "video", "audio", "object"]);
const BLOCK = new Set(["p", "div", "section", "article", "main", "header", "footer", "figure", "aside", "address", "details", "summary", "body", "html", "dl", "dt", "dd"]);
const SPACED = new Set(["span", "small", "time", "label"]);

function skip(n) {
  return SKIP.has(n.tag) || n.attrs["aria-hidden"] === "true" || hasClass(n, "navwrap") || n.attrs.hidden !== undefined;
}

function wrap(s, mark) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : s;
}

function render(n, ctx) {
  if (n.text !== undefined) return decode(n.text).replace(/\s+/g, " ");
  if (n.tag === "#root") return kids(n, ctx);
  if (skip(n)) return "";
  const t = n.tag;
  const abs = (u) => { try { return new URL(u, ctx.base).href; } catch { return u; } };
  if (n.attrs.role === "img" && n.attrs["aria-label"]) return `\n\n${clean(n.attrs["aria-label"])}\n\n`;
  if (/^h[1-6]$/.test(t)) return `\n\n${"#".repeat(+t[1])} ${clean(kids(n, ctx))}\n\n`;
  if (t === "br") return "\u0001";
  if (t === "hr") return "\n\n---\n\n";
  if (t === "img") return n.attrs.alt ? `![${clean(n.attrs.alt)}](${abs(n.attrs.src || "")})` : "";
  if (t === "pre") {
    const code = find(n, byTag("code"));
    const lang = ((code?.attrs.class || "").match(/language-(\S+)/) || [])[1] || "";
    ctx.pre.push("```" + lang + "\n" + text(n).replace(/\n+$/, "") + "\n```");
    return `\n\n\u0002${ctx.pre.length - 1}\u0002\n\n`;
  }
  if (t === "code") return "`" + text(n) + "`";
  if (t === "strong" || t === "b") return wrap(kids(n, ctx), "**");
  if (t === "em" || t === "i") return wrap(kids(n, ctx), "*");
  if (t === "a") {
    const href = n.attrs.href || "";
    if (href.startsWith("#")) return ""; // in-page jumps: buttons and menus
    const inner = kids(n, ctx);
    if (!href || href.startsWith("javascript:")) return inner;
    const url = abs(href);
    if (!/\n/.test(inner)) return clean(inner) ? `[${clean(inner)}](${url})` : "";
    // A link around a whole card: link its first line of text.
    const lines = inner.split("\n");
    const ok = (l) => /\w/.test(l) && !l.includes("](") && !/^\u0002/.test(l.trim());
    let i = lines.findIndex((l) => /^\s*#/.test(l) && ok(l));
    if (i < 0) i = lines.findIndex(ok);
    if (i < 0) return `${inner}\n\n${url}\n\n`;
    const [, hashes, body] = lines[i].trim().match(/^(#+ )?(.*)$/);
    lines[i] = `${hashes || ""}[${body}](${url})`;
    return `\n\n${lines.join("\n")}\n\n`;
  }
  if (t === "ul" || t === "ol") {
    const items = n.children.filter((c) => c.tag === "li");
    const start = +(n.attrs.start || 1);
    const out = items.map((li, i) => {
      const mark = t === "ol" ? `${start + i}. ` : "- ";
      const body = tidy(kids(li, ctx)).trim().replace(/\n/g, "\n" + " ".repeat(mark.length));
      return mark + body;
    });
    return `\n\n${out.join("\n")}\n\n`;
  }
  if (t === "blockquote") return `\n\n${tidy(kids(n, ctx)).trim().replace(/^/gm, "> ")}\n\n`;
  if (t === "figcaption") return `\n\n*${clean(kids(n, ctx))}*\n\n`;
  if (t === "table") {
    const rows = findAll(n, byTag("tr")).map((tr) => tr.children.filter((c) => c.tag === "td" || c.tag === "th").map((c) => clean(kids(c, ctx)).replace(/\|/g, "\\|")));
    if (!rows.length) return "";
    const line = (r) => `| ${r.join(" | ")} |`;
    return `\n\n${[line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n")}\n\n`;
  }
  if (t === "span" && hasClass(n, "sep") && !n.children.length) return " · ";
  if (SPACED.has(t)) return ` ${kids(n, ctx)} `;
  const els = n.children.filter((c) => c.tag);
  if (t === "div" && els.length > 1 && els.every((c) => c.tag === "a")) {
    const items = els.map((c) => render(c, ctx)).filter((x) => x.trim());
    if (items.every((x) => !x.includes("\n"))) return items.length ? `\n\n${items.map((x) => "- " + clean(x)).join("\n")}\n\n` : "";
  }
  if (BLOCK.has(t) || t === "li") return `\n\n${kids(n, ctx)}\n\n`;
  return kids(n, ctx);
}

function kids(n, ctx) {
  return (n.children || []).map((c) => render(c, ctx)).join("");
}

function tidy(s) {
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\u0001 ?/g, "  \n")
    .replace(/\n{3,}/g, "\n\n");
}

export function toMarkdown(html, url) {
  const doc = parse(html);
  const ctx = { base: url, pre: [] };
  const title = clean(text(find(doc, byTag("title"))));
  const desc = find(doc, (n) => n.tag === "meta" && n.attrs.name === "description")?.attrs.content;
  const body = find(doc, byTag("body")) || doc;
  let md = tidy(render(body, ctx)).trim();
  md = md.replace(/\u0002(\d+)\u0002/g, (_, i) => ctx.pre[+i]);
  const yaml = (s) => JSON.stringify(s);
  const front = ["---", title && `title: ${yaml(title)}`, desc && `description: ${yaml(clean(desc))}`, `url: ${yaml(url)}`, "---"].filter(Boolean).join("\n");
  return `${front}\n\n${md}\n`;
}
