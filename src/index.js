import { toMarkdown } from "./html.js";
import { home, posts, post } from "./content.js";
import * as auth from "./auth.js";
import { apiCatalog, aiCatalog, poppy, did, skillsIndex, openapi, llmsTxt } from "./discovery.js";

// Advertised on every HTML page (RFC 8288) so agents can find the machine-readable side of the site.
const LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</api/docs.md>; rel="service-doc"; type="text/markdown"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json"',
];
const SIGNALS = "ai-train=yes, search=yes, ai-input=yes";
const CORS = { "access-control-allow-origin": "*" };

const json = (body, type = "application/json") =>
  new Response(JSON.stringify(body, null, 2), { headers: { "content-type": `${type}; charset=utf-8`, "cache-control": "public, max-age=300", ...CORS } });
const notFound = () => new Response(JSON.stringify({ error: "not_found", error_description: "No such endpoint. See /api/docs.md." }), { status: 404, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

// Markdown wins when the client asks for it at least as strongly as HTML.
function wantsMarkdown(request) {
  const q = (type) => {
    for (const part of (request.headers.get("accept") || "").split(",")) {
      const [t, ...params] = part.trim().toLowerCase().split(";");
      if (t.trim() !== type) continue;
      const qv = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return qv ? parseFloat(qv.slice(2)) || 0 : 1;
    }
    return -1;
  };
  const md = q("text/markdown");
  return md > 0 && md >= q("text/html");
}

function markdownPath(path) {
  return path === "/" ? "/index.md" : path.endsWith("/") ? path + "index.md" : null;
}

async function asMarkdown(res, url, status = res.status) {
  const md = toMarkdown(await res.text(), url);
  return new Response(md, {
    status,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": res.headers.get("cache-control") || "public, max-age=0, must-revalidate",
      vary: "Accept",
      "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      "content-signal": SIGNALS,
      link: `<${url}>; rel="canonical"; type="text/html"`,
      ...CORS,
    },
  });
}

async function api(env, request, origin, path) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, HEAD, OPTIONS" } });
  const denied = await auth.checkBearer(env, request, origin);
  if (denied) return denied;
  const p = path.replace(/\/$/, "");
  if (p === "/api") return json({ name: "davit.cc API", docs: origin + "/api/docs.md", openapi: origin + "/api/openapi.json", endpoints: ["profile", "projects", "playground", "experience", "posts", "posts/{slug}", "health"].map((e) => `${origin}/api/${e}`) });
  if (p === "/api/openapi.json") return json(openapi(origin), "application/vnd.oai.openapi+json");
  if (p === "/api/health") return json({ status: "pass", service: "davit.cc", time: new Date().toISOString() }, "application/health+json");
  if (p === "/api/posts") return json(await posts(env, origin));
  const slug = p.match(/^\/api\/posts\/([a-z0-9-]+)$/)?.[1];
  if (slug) return (await post(env, origin, slug).then((x) => x && json(x))) || notFound();
  const section = p.match(/^\/api\/(profile|projects|playground|experience)$/)?.[1];
  if (section) return json((await home(env, origin))[section]);
  return notFound();
}

async function agents(env, request, origin, path) {
  switch (path) {
    case "/.well-known/api-catalog": {
      const res = json(apiCatalog(origin), 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
      res.headers.set("link", `<${origin}/.well-known/api-catalog>; rel="api-catalog"`);
      return request.method === "HEAD" ? new Response(null, { headers: res.headers }) : res;
    }
    case "/.well-known/oauth-authorization-server":
      return json(auth.authorizationServer(origin));
    case "/.well-known/oauth-protected-resource":
      return json(auth.protectedResource(origin));
    case "/.well-known/jwks.json":
      return json(auth.jwks(), "application/jwk-set+json");
    case "/.well-known/ai-catalog.json":
      return json(aiCatalog(origin));
    case "/.well-known/poppy.json":
      return json(poppy(origin));
    case "/.well-known/did.json":
      return json(did(origin), "application/did+json");
    case "/.well-known/agent-skills/index.json":
      return json(await skillsIndex(env, origin));
    case "/llms.txt":
      return new Response(await llmsTxt(env, origin), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300", ...CORS } });
  }
  if (path.startsWith("/oauth/") || path.startsWith("/agent/")) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST, OPTIONS" } });
    return auth.handle(env, request, origin, path);
  }
  if (path === "/api" || (path.startsWith("/api/") && !path.endsWith(".md"))) return api(env, request, origin, path);
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.davit.cc" || (url.protocol === "http:" && url.hostname === "davit.cc")) {
      url.protocol = "https:";
      url.hostname = "davit.cc";
      return Response.redirect(url.toString(), 301);
    }
    const origin = url.origin;
    const path = url.pathname;

    const special = await agents(env, request, origin, path);
    if (special) return special;

    const markdown = wantsMarkdown(request);
    // Ask for the page fresh so a cached HTML ETag can't stand in for the Markdown version.
    const assetReq = markdown ? new Request(request.url, { method: request.method, headers: { accept: "text/html" } }) : request;
    const res = await env.ASSETS.fetch(assetReq);

    // /some/page/index.md: the Markdown version of /some/page/.
    if (res.status === 404 && path.endsWith(".md")) {
      const base = path.slice(0, -3).replace(/\/index$/, "/");
      const page = base.endsWith("/") ? base : base + "/";
      const html = await env.ASSETS.fetch(new Request(origin + page, { headers: { accept: "text/html" } }));
      if (html.ok && (html.headers.get("content-type") || "").includes("text/html")) return asMarkdown(html, origin + page);
      return res;
    }

    if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
    if (markdown && (request.method === "GET" || request.method === "HEAD")) {
      const out = await asMarkdown(res, res.status === 404 ? origin + "/404" : origin + path);
      return request.method === "HEAD" ? new Response(null, out) : out;
    }

    const out = new Response(res.body, res);
    const md = markdownPath(path);
    for (const l of md ? [...LINKS, `<${md}>; rel="alternate"; type="text/markdown"`] : LINKS) out.headers.append("link", l);
    out.headers.append("vary", "Accept");
    return out;
  },
};
