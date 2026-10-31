# davit.cc API

A small read-only JSON API with the same content as [davit.cc](https://davit.cc/): Davit Khaburdzania's profile, projects, playground, experience and blog posts. It reads the live pages, so it's always up to date.

- Base URL: `https://davit.cc/api`
- No key needed. CORS is open.
- OpenAPI 3.1: https://davit.cc/api/openapi.json
- Optional OAuth for agents that want a token: https://davit.cc/auth.md

## Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/profile` | Name, role, summary, location, email, links, CV |
| GET | `/api/projects` | Products Davit is building |
| GET | `/api/playground` | Small games and toys on the site |
| GET | `/api/experience` | Work history, newest first, matching the CV |
| GET | `/api/posts` | Blog posts, newest first |
| GET | `/api/posts/{slug}` | One post, with its full text as Markdown |
| GET | `/api/health` | `{"status": "pass"}` when the API is up |

## Example

```sh
curl https://davit.cc/api/projects
```

```json
[
  {
    "name": "Rillow.ai",
    "url": "https://rillow.ai",
    "tagline": "Give Claude SEO superpowers",
    "description": "Turns Claude or Codex into an SEO agent, with keyword research, briefs and rank tracking.",
    "platform": "Web"
  }
]
```

## Pages as Markdown

Every HTML page also comes as Markdown. Either send `Accept: text/markdown`, or add `index.md` to the path:

```sh
curl -H "Accept: text/markdown" https://davit.cc/writing/agentic-coding-workflow/
curl https://davit.cc/writing/agentic-coding-workflow/index.md
```

Markdown responses carry an `x-markdown-tokens` header with a rough token count.

## Discovery

- API catalog (RFC 9727): https://davit.cc/.well-known/api-catalog
- Agent skills: https://davit.cc/.well-known/agent-skills/index.json
- ARD catalog: https://davit.cc/.well-known/ai-catalog.json
- llms.txt: https://davit.cc/llms.txt

Content signals: `ai-train=yes, search=yes, ai-input=yes`.
