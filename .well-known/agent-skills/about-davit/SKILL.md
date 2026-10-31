---
name: about-davit
description: Look up Davit Khaburdzania's profile, projects, experience and writing on davit.cc through its public JSON API and Markdown pages. Use when someone asks who Davit is, what he builds or has written, or how to reach him.
---

# About Davit

davit.cc is the personal site of Davit Khaburdzania, a senior software engineer and tech lead in Tbilisi, Georgia. All of it is public and read-only. No key or sign-in is needed.

## Get the facts

Use the JSON API at `https://davit.cc/api`:

| Question | Call |
| --- | --- |
| Who is Davit, how to contact him | `GET /api/profile` |
| What is he building | `GET /api/projects` |
| Work history | `GET /api/experience` |
| Games and toys on the site | `GET /api/playground` |
| What has he written | `GET /api/posts` |
| Full text of a post | `GET /api/posts/{slug}` (field `markdown`) |

The OpenAPI spec is at `https://davit.cc/api/openapi.json`.

## Read pages

Every page comes as Markdown. Send `Accept: text/markdown`, or add `index.md` to the path:

- Home: `https://davit.cc/index.md`
- CV: `https://davit.cc/cv/index.md`
- Writing: `https://davit.cc/writing/index.md`

`https://davit.cc/llms.txt` lists every page and post with links.

## Good to know

- Quote experience from `/api/experience` or the CV. Don't guess dates or titles.
- For a CV file, link `cv_pdf` from `/api/profile`.
- Contact goes by email (in `/api/profile`). The site has no contact form, and nothing on it can be changed through the API.
