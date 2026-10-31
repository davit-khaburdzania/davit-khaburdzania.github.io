// Discovery documents for agents: API catalog, OpenAPI, ARD catalog, Poppy,
// agent skills index and llms.txt. Built per request from the live pages.
import { home, posts } from "./content.js";

export const SKILLS = [
  { name: "about-davit", path: "/.well-known/agent-skills/about-davit/SKILL.md", description: "Look up Davit Khaburdzania's profile, projects, experience and writing on davit.cc through its public JSON API and Markdown pages." },
];

export function apiCatalog(origin) {
  return {
    linkset: [
      { anchor: origin + "/.well-known/api-catalog", item: [{ href: origin + "/api", title: "davit.cc API" }] },
      {
        anchor: origin + "/api",
        "service-desc": [{ href: origin + "/api/openapi.json", type: "application/vnd.oai.openapi+json;version=3.1" }],
        "service-doc": [{ href: origin + "/api/docs.md", type: "text/markdown" }],
        status: [{ href: origin + "/api/health", type: "application/health+json" }],
      },
    ],
  };
}

export function aiCatalog(origin) {
  const host = new URL(origin).hostname;
  const urn = (ns, name) => `urn:air:${host}:${ns}:${name}`;
  return {
    specVersion: "1.0",
    host: { displayName: "davit.cc", identifier: `did:web:${host}`, url: origin + "/", description: "Personal site of Davit Khaburdzania, senior software engineer and tech lead in Tbilisi, Georgia." },
    entries: [
      {
        identifier: urn("api", "site"),
        displayName: "davit.cc API",
        description: "Read-only JSON API with Davit's profile, projects, playground, experience and blog posts.",
        type: "application/vnd.oai.openapi+json",
        url: origin + "/api/openapi.json",
        representativeQueries: ["What is Davit Khaburdzania working on?", "List Davit's work experience", "What has Davit written about AI agents?"],
      },
      {
        identifier: urn("skill", "about-davit"),
        displayName: "About Davit (agent skill)",
        description: SKILLS[0].description,
        type: "text/markdown",
        url: origin + SKILLS[0].path,
        representativeQueries: ["Summarize Davit Khaburdzania's background", "Which products has Davit built?", "How do I contact Davit?"],
      },
      {
        identifier: urn("docs", "llms-txt"),
        displayName: "llms.txt",
        description: "Short guide to the site for language models, with links to Markdown versions of every page.",
        type: "text/plain",
        url: origin + "/llms.txt",
        representativeQueries: ["Give me an overview of davit.cc", "Where are the Markdown versions of Davit's posts?"],
      },
    ],
  };
}

export function poppy(origin) {
  return { protocol_version: "0.1", organization: { name: "Davit Khaburdzania", domain: new URL(origin).hostname }, web: {} };
}

export function did(origin) {
  const id = `did:web:${new URL(origin).hostname}`;
  return {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id,
    alsoKnownAs: [origin + "/"],
    service: [
      { id: `${id}#website`, type: "LinkedDomains", serviceEndpoint: origin + "/" },
      { id: `${id}#ai-catalog`, type: "AICatalog", serviceEndpoint: origin + "/.well-known/ai-catalog.json" },
    ],
  };
}

export async function skillsIndex(env, origin) {
  const skills = [];
  for (const s of SKILLS) {
    const res = await env.ASSETS.fetch(new Request(origin + s.path));
    if (!res.ok) continue;
    const hash = await crypto.subtle.digest("SHA-256", await res.arrayBuffer());
    const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    skills.push({ name: s.name, type: "skill-md", description: s.description, url: origin + s.path, digest: `sha256:${hex}` });
  }
  return { $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json", skills };
}

export function openapi(origin) {
  const ok = (ref, description) => ({ description, content: { "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } } });
  const list = (ref, description) => ({ description, content: { "application/json": { schema: { type: "array", items: { $ref: `#/components/schemas/${ref}` } } } } });
  const str = { type: "string" };
  const nstr = { type: ["string", "null"] };
  return {
    openapi: "3.1.0",
    info: {
      title: "davit.cc API",
      version: "1.0.0",
      summary: "Read-only data about Davit Khaburdzania: profile, projects, experience and writing.",
      description: "Everything is public and needs no key. A bearer token from the OAuth server is optional and grants the same read access. Each HTML page is also available as Markdown: send `Accept: text/markdown`, or add `index.md` to the path.",
      contact: { name: "Davit Khaburdzania", url: origin + "/", email: "davit.khaburdzania@gmail.com" },
    },
    externalDocs: { description: "API guide", url: origin + "/api/docs.md" },
    servers: [{ url: origin + "/api" }],
    security: [{}, { oauth: ["read"] }],
    paths: {
      "/profile": { get: { operationId: "getProfile", summary: "Who Davit is, where he works from and how to reach him", responses: { 200: ok("Profile", "Profile") } } },
      "/projects": { get: { operationId: "listProjects", summary: "Products Davit is building", responses: { 200: list("Project", "Projects") } } },
      "/playground": { get: { operationId: "listPlayground", summary: "Small games and toys on the site", responses: { 200: list("Experiment", "Experiments") } } },
      "/experience": { get: { operationId: "listExperience", summary: "Work history, newest first, matching the CV", responses: { 200: list("Job", "Jobs") } } },
      "/posts": { get: { operationId: "listPosts", summary: "Blog posts, newest first", responses: { 200: list("Post", "Posts") } } },
      "/posts/{slug}": {
        get: {
          operationId: "getPost",
          summary: "One blog post, with its full text as Markdown",
          parameters: [{ name: "slug", in: "path", required: true, schema: str, example: "agentic-coding-workflow" }],
          responses: { 200: ok("PostWithBody", "Post"), 404: ok("Error", "No post with that slug") },
        },
      },
      "/health": { get: { operationId: "getHealth", summary: "Health check", responses: { 200: { description: "The API is up", content: { "application/health+json": { schema: { type: "object", properties: { status: { const: "pass" } } } } } } } } },
    },
    components: {
      securitySchemes: {
        oauth: {
          type: "oauth2",
          description: "Optional. See /auth.md for the anonymous agent flow.",
          flows: { authorizationCode: { authorizationUrl: origin + "/oauth/authorize", tokenUrl: origin + "/oauth/token", scopes: { read: "Read public data" } } },
        },
      },
      schemas: {
        Profile: {
          type: "object",
          properties: { name: str, role: str, headline: str, summary: str, location: str, availability: nstr, website: str, email: str, links: { type: "array", items: str }, skills: { type: "array", items: str }, cv_pdf: nstr, cv_page: str },
        },
        Project: { type: "object", properties: { name: str, url: str, tagline: str, description: str, platform: str } },
        Experiment: { type: "object", properties: { name: str, url: str, kind: str, tech: str } },
        Job: { type: "object", properties: { years: str, company: str, role: nstr, location: nstr, summary: str, tech: { type: "array", items: str } } },
        Post: { type: "object", properties: { slug: str, title: str, summary: str, topic: str, date: nstr, url: str, markdown_url: str, image: nstr } },
        PostWithBody: { allOf: [{ $ref: "#/components/schemas/Post" }, { type: "object", properties: { subtitle: nstr, description: nstr, modified: nstr, author: str, markdown: str } }] },
        Error: { type: "object", properties: { error: str, error_description: str } },
      },
    },
  };
}

export async function llmsTxt(env, origin) {
  const [{ profile, projects, playground, experience }, list] = await Promise.all([home(env, origin), posts(env, origin)]);
  const md = (path) => origin + path + "index.md";
  return [
    `# ${profile.name}`,
    "",
    `> ${profile.summary} Based in ${profile.location}.`,
    "",
    `${profile.headline} This is Davit's personal site: products he's building, a playground of small experiments, his work history and his writing. Every page is available as Markdown: send \`Accept: text/markdown\` or add \`index.md\` to the path.`,
    "",
    "## Pages",
    "",
    `- [Home](${md("/")}): projects, playground, experience and recent writing`,
    `- [CV](${md("/cv/")}): full CV. PDF: ${profile.cv_pdf}`,
    `- [Writing](${md("/writing/")}): all blog posts`,
    "",
    "## Writing",
    "",
    ...list.map((p) => `- [${p.title}](${p.markdown_url}): ${p.summary}`),
    "",
    "## Projects",
    "",
    ...projects.map((p) => `- [${p.name}](${p.url}): ${p.description}`),
    "",
    "## Experience",
    "",
    ...experience.map((j) => `- ${j.years}, ${j.company}${j.role ? `, ${j.role}` : ""}: ${j.summary}`),
    "",
    "## For agents",
    "",
    `- [API guide](${origin}/api/docs.md): read-only JSON API, no key needed`,
    `- [OpenAPI](${origin}/api/openapi.json)`,
    `- [Agent skill](${origin}${SKILLS[0].path})`,
    `- [auth.md](${origin}/auth.md): optional OAuth for agents that want a token`,
    "",
    "## Optional",
    "",
    ...playground.map((p) => `- [${p.name}](${p.url}): ${p.kind.toLowerCase()}, ${p.tech}`),
    `- Contact: ${profile.email}`,
    ...profile.links.map((l) => `- ${l}`),
    "",
  ].join("\n");
}
