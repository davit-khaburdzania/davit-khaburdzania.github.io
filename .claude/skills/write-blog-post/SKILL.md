---
name: write-blog-post
description: Write, illustrate and publish a post for davit.cc/writing in Davit's blog style (short, funny, captioned pictures, modelled on The Building Machine). Use for a new post or when rewriting an existing one.
---

# Writing a davit.cc blog post

Posts go out under Davit's name, so they must sound like him and only say true things. Davit reviews every post before it goes live.

## The style

Davit's model is Calvin Grunewald's blog The Building Machine, especially [My New Agentic Workflow](https://thebuildingmachine.com/p/my-new-agentic-workflow) and [Stet: Shotgunning an Editor My Agents Can Drive](https://thebuildingmachine.com/p/stet-shotgunning-an-editor-my-agents). In his words: "this is the quality blog post i like, format and language and everything". What that means in practice:

- **Title plus a short, dry subtitle.** "My agentic coding workflow" / "Mostly, I say no."
- **The first line is the result.** "I rebuilt this website in two days and didn't write a line of code." Then one or two lines of setup, then a short numbered list of what the post covers.
- **Numbered sections** that match that list ("1. One project per product"), plus a few plain ones at the end ("What still goes wrong", "Try it").
- **Short paragraphs**, one to three sentences. Many are a single punchy line: "It isn't anymore."
- **Real material, quoted.** Davit's actual prompts as blockquotes, and lists of his actual short replies ("too colourful", "Pixel is better", "mario in threejs"). Take these from thread history or from what he says. Never make them up.
- **Bold lead-ins** for lists of problems or options: "**Instructions go stale.** My first setup said..."
- **A small table** when there are real numbers worth showing ("By the numbers"). Keep it to a few rows.
- **Dry, self-deprecating humour**, mostly in captions and asides. "With a Shiba instead of Mario, because I'd like to keep this website."
- **Pictures with captions** every section or two (see Images).
- **The ending** is a short line that restates the idea ("Brief it once. Let it remember the rest."), then a "Try it" list or links to another post and the CV.
- **Length:** about 600 to 1,000 words. Short beats complete.

## Voice rules (from Davit's feedback)

- First person, to engineers, founders and CTOs. Plain words, like one engineer talking to another.
- **Say things simply.** "I made it in two days", not "I sent the first message on Tuesday night around ten". Skip exact times, counts and step-by-step narration unless the number is the point. Davit rejected the first drafts as "too robotic" and the next ones for "too much details... it sounds like a computer written".
- **Never invent** numbers, quotes, clients, results or anecdotes. Every fact about Davit comes from his CV, his projects, the repo, or something he said. Experience is "15+ years".
- Link the people you cite (Simon Willison, Mitchell Hashimoto, Boris Cherny and so on) and be fair to them.
- No hype words, no em dashes, no arrows in the text.
- Finish with a pass of the `humanize-writing` skill if it's available, then reread it out loud in your head as Davit.

## Images

All post images are 16:9, 1600x900 WebP in `assets/images/writing/<descriptive-name>.webp`, made with Rillow's `generate_image` (Rillow project `3192b2da-22ae-4ecc-9b70-9636b59287ba`, `aspect: "16:9"`).

- **Look:** a grainy two-colour print in soft lavender and near-black ink on cool light grey paper, fine dense grain, flat simple shapes, soft edges, lots of empty grey space. Calm, never colourful.
- **Subject:** a small scene with a light joke that stands for the section. Either everyday desk objects (paper planes leaving a notebook, threads running to spools, a rubber stamp on three sheets) or a small round tin robot with dot eyes doing the work, next to a person seen from behind or just their hands.
- **Never:** words, logos, screenshots, UI, realistic faces, green, or anything Nintendo-like.
- **Captions:** one short dry italic line under each picture. "Three versions. Pick one." "Many threads. One hand." "Close enough."
- **Covers:** the first image becomes the cover, the homepage card and the share image. When rewriting, show Davit old and new covers side by side and let him pick. In October 2026 he kept the plain object covers for two posts and chose the robot scene for the third, so neither style always wins.

Prompt pattern that worked: describe the scene in two or three plain sentences, then end with "Lots of empty grey space." Put the post's point in `purpose` and the section's point in `section`, and write real `alt_text`.

rillow.ai is blocked from Claude's cloud containers. Download images on Davit's Mac (a local session, or Remote Control from the cloud), then commit them.

## Files

Each post is `writing/<slug>/post.md`. It's the source of truth. `writing/<slug>/index.html` is generated, so don't edit it by hand.

```md
---
title: "Full SEO title, can be longer than the H1"
subtitle: "The short dry line under the title."
description: "Meta description, about 150 characters."
date: 2026-10-23
modified: 2026-10-25
author: Davit Khaburdzania
slug: agentic-coding-workflow
topic: AI workflow
card: "One-sentence blurb for the homepage and /writing/ cards."
order: 1
---

# The H1 shown on the page

![Alt text](/assets/images/writing/cover-name.webp)
*Cover caption.*

First line is the result.
```

- The first image is the cover. A `*caption*` line right under any image becomes its caption.
- `order` only breaks ties between posts with the same `date` (lower comes first). Newest posts come first.
- Tables, fenced code and blockquotes work as usual.
- A small step diagram: `<div class="flow" role="img" aria-label="..."><span>Step</span><span>Step</span>...</div>`. Arrows are added by CSS, and it stacks on phones.

Build everything with:

```sh
python3 .claude/skills/write-blog-post/build.py   # needs: pip install markdown pillow
```

It writes every post page, the `<slug>-og.jpg` share image (1200x630) and `<slug>-card.webp` (800x450) from the cover, `writing/index.html`, `writing/feed.xml`, the newest three cards on the homepage (between the `writing-cards` markers in `index.html`), and the post entries in `sitemap.xml`. Styles live in `assets/css/post.css`.

## Steps

1. **Pick the topic.** In Rillow, `get_project` for the project above, then `get_brief` for the plan item. Existing plan items: "agentic coding workflow" (card `d23c3d44-0c09-4e9a-a1c5-09bf8cf41702`), "how to use claude projects" (`e707fdbb-e83b-4d3b-b81b-1533c776bdd8`), "best language for ai coding" (`601e2a4f-9740-4db2-94d8-bf9c77da3e0a`). New topics go through `update_plan` after Davit picks them.
2. **Research.** Read what ranks and what the people Davit respects have written on it. Collect real links. Pull Davit's own examples from the repo, git history and project memory.
3. **Write** `writing/<slug>/post.md` in the style above, with the target keyword in the title or the first lines.
4. **Make the images** and add captions.
5. **Humanize**, then build.
6. **Preview.** Serve the repo (`python3 -m http.server 8765 --bind 127.0.0.1`) and screenshot the post, `/writing/` and the homepage Writing section at 1440, 800 and 390 px. Send them to Davit.
7. **Publish when he says yes.** Commit and push to `main`, which deploys davit.cc in about a minute. Check the live page with a cache-busting query (`/writing/<slug>/?check=1`).
8. **Tell Rillow.** `save_article` with the full Markdown (absolute `https://davit.cc/...` image URLs), then `mark_published` with the live URL so rankings get tracked.
