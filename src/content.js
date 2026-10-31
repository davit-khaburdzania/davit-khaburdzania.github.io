// Reads the site's own pages and turns them into data for the API and llms.txt,
// so agents always see what visitors see, with nothing to keep in sync by hand.
import { parse, find, findAll, byClass, byTag, text, clean, toMarkdown } from "./html.js";

export async function page(env, origin, path) {
  const res = await env.ASSETS.fetch(new Request(origin + path, { headers: { accept: "text/html" } }));
  return res.ok ? res.text() : null;
}

const own = (n) => clean((n?.children || []).filter((c) => c.text !== undefined).map(text).join(""));
const abs = (origin, u) => new URL(u, origin + "/").href;

export async function home(env, origin) {
  const doc = parse(await page(env, origin, "/"));
  const ld = JSON.parse(text(find(doc, (n) => n.tag === "script" && n.attrs.type === "application/ld+json")) || "{}");
  const person = (ld["@graph"] || []).find((x) => x["@type"] === "Person") || {};
  const where = findAll(find(doc, byClass("where")) || {}, byTag("i")).map((n) => clean(text(n)));
  const cv = find(doc, (n) => n.tag === "a" && n.attrs.download !== undefined)?.attrs.href;
  const profile = {
    name: person.name,
    role: person.jobTitle,
    headline: clean(text(find(doc, byTag("h1")))),
    summary: clean(text(find(doc, byClass("lede")))),
    location: where[0] || "Tbilisi, Georgia",
    availability: where.find((w) => /available/i.test(w)) || null,
    website: origin + "/",
    email: (person.email || "").replace(/^mailto:/, ""),
    links: person.sameAs || [],
    skills: person.knowsAbout || [],
    cv_pdf: cv ? abs(origin, cv) : null,
    cv_page: origin + "/cv/",
  };
  const projects = findAll(doc, byClass("wcard")).map((n) => ({
    name: clean(text(find(n, byClass("wname")))).replace(/\s*↗$/, ""),
    url: n.attrs.href,
    tagline: clean(text(find(find(n, byClass("dname")) || {}, byTag("span")))),
    description: clean(text(find(n, byClass("wdesc")))),
    platform: clean(text(find(n, byClass("wyear")))),
  }));
  const playground = findAll(doc, byClass("ptile")).map((n) => ({
    name: clean(text(find(n, byTag("b")))),
    url: abs(origin, n.attrs.href),
    kind: clean(text(find(n, byClass("tag")))),
    tech: clean(text(find(n, byTag("small")))),
  }));
  const experience = findAll(doc, byClass("xrow")).map((n) => {
    const co = find(n, byClass("xco"));
    const [role, place] = clean(text(find(co, byTag("small")))).split(" · ");
    const tech = clean(text(find(n, byClass("xtech"))));
    return {
      years: clean(text(find(n, byClass("xyear")))),
      company: own(co),
      role: role || null,
      location: place || null,
      summary: clean(text(find(find(n, byClass("xwhat")), byTag("p")))),
      tech: tech ? tech.split(" · ") : [],
    };
  });
  return { profile, projects, playground, experience };
}

export async function posts(env, origin) {
  const doc = parse(await page(env, origin, "/writing/"));
  return findAll(doc, byClass("post")).map((n) => {
    const url = abs(origin, n.attrs.href);
    const img = find(n, byTag("img"))?.attrs.src;
    return {
      slug: url.split("/").filter(Boolean).pop(),
      title: clean(text(find(n, byTag("h3")))),
      summary: clean(text(find(n, byTag("p")))),
      topic: clean(text(find(n, byClass("ptopic")))),
      date: find(n, byTag("time"))?.attrs.datetime || null,
      url,
      markdown_url: url + "index.md",
      image: img ? abs(origin, img) : null,
    };
  });
}

export async function post(env, origin, slug) {
  const list = await posts(env, origin);
  const meta = list.find((p) => p.slug === slug);
  if (!meta) return null;
  const html = await page(env, origin, `/writing/${slug}/`);
  if (!html) return null;
  const doc = parse(html);
  const ld = JSON.parse(text(find(doc, (n) => n.tag === "script" && n.attrs.type === "application/ld+json")) || "{}");
  return {
    ...meta,
    subtitle: clean(text(find(doc, byClass("dek")))) || null,
    description: ld.description || null,
    modified: ld.dateModified || null,
    author: ld.author?.name || "Davit Khaburdzania",
    markdown: toMarkdown(html, meta.url),
  };
}
