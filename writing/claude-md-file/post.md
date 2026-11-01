---
title: "CLAUDE.md file: why I only keep an AGENTS.md"
subtitle: "Claude reads AGENTS.md now. So that's the one file I keep."
description: "What a CLAUDE.md file is, why Claude Code no longer needs one when you have an AGENTS.md, and the real AGENTS.md that runs this website."
date: 2026-11-02
author: Davit Khaburdzania
slug: claude-md-file
topic: Claude
card: "Claude Code reads AGENTS.md now. What mine says, what stays out, and why there's no CLAUDE.md file."
order: 1
---

# I don't have a CLAUDE.md file

![Two small robots of different shapes reading the same open notebook on a desk, one from each side](/assets/images/writing/two-robots-one-notebook.webp)
*Same notebook. Different robots.*

This website's code has no CLAUDE.md file. It has an `AGENTS.md`, and Claude Code reads that instead.

A CLAUDE.md file is a plain Markdown file that Claude Code reads at the start of every session. It's where you tell Claude what it can't work out from the code: how you ship, what you've already rejected, what never to touch.

[AGENTS.md](https://agents.md) is the same idea under the name other coding tools use: "a README for agents". Codex, Cursor, Copilot and Gemini CLI read it. Since version 2.1.277, [Claude Code reads it too](https://code.claude.com/docs/en/memory#agents-md), so one file covers all of them.

Here's what's in this post:

1. What Claude does with AGENTS.md.
2. What my AGENTS.md says.
3. What stays out.
4. How it stays right.

## 1. What Claude does with AGENTS.md

When a Claude Code session starts, Claude looks for a `CLAUDE.md` or `CLAUDE.local.md` in the folder you opened and the folders above it. If there isn't one, it loads every `AGENTS.md` it finds there instead, and you see a line like this:

```text
no CLAUDE.md found; AGENTS.md loaded: /home/you/repo/AGENTS.md
```

A few more things from [Anthropic's docs](https://code.claude.com/docs/en/memory#agents-md) that are worth knowing:

- An `AGENTS.md` inside a subfolder loads when Claude opens a file in that folder.
- Your own `~/.claude/CLAUDE.md` still loads next to it, so your personal rules don't go away.
- If the repo has a `CLAUDE.md` or a `CLAUDE.local.md`, Claude reads that and skips `AGENTS.md`, unless you change **Project instructions** in `/config` to read both.
- Older Claude Code versions don't read `AGENTS.md` on their own. On those, a `CLAUDE.md` with the single line `@AGENTS.md` pulls it in.

That last trick is what I used to have. My `CLAUDE.md` was that one line. Claude reads `AGENTS.md` by itself now, so I deleted it.

![A small round robot reading a single index card pinned to a door, with a thick notebook lying open on the floor behind it](/assets/images/writing/robot-reads-door-note.webp)
*It checks the door for a note first. Then it reads the notebook.*

## 2. What my AGENTS.md says

It has seven short sections, in this order:

| Section | What it tells Claude |
|---|---|
| Ship it | Every push to `main` goes live. Show me a preview first |
| Stack | Plain HTML, CSS and JS, and what each file is for |
| Agents | The Markdown pages, API and discovery files the site serves to AI agents |
| Run it locally | One command, and the screen widths to check |
| Design rules | Colours, type, the hero, the logo, and what I already said no to |
| Content rules | Facts that must match my CV, and how blog posts get built |
| Code style | Match the code around you. Short comments, plain commit messages |

The first section matters most, because it's the one Claude can't guess from the code:

```md
## Ship it

- Every push to `main` deploys davit.cc within about a minute.
- Work directly on `main`. Davit is the only person on this repo:
  no pull requests, no feature branches.
- Because a push is a deploy, show Davit a preview of any visual change
  and push once he's happy. Copy fixes and small bug fixes can go straight in.
```

That second rule exists because I typed this into a thread once:

> since i am only one working on this no need to create prs just push to main

I said it once. It's been in the file since.

The design rules work the same way. Each one is a decision I already made, written down so I don't make it again:

```md
- Light only. Mostly cool grey with a faint lavender glow.
  Davit found stronger lilac "too colourful". Never use green accents.
- Project cards: the same dust in each product's own soft colour.
  Illustrated scenes and redrawn product UIs were tried and rejected.
```

"Tried and rejected" saves the most time. Without that line, a new session has no way to know I already turned those ideas down.

The content rules are short facts with no room for guessing: "15+ years of experience", the section is called "Projects", not "Work", and "Experience must match Davit's CV".

## 3. What stays out

**Anything the code already says.** Claude can see the framework, the folders and the function names. Repeating them just makes the file longer.

**Long how-tos.** Writing a blog post here takes a style guide, image rules and a build script. That lives in a [skill](https://code.claude.com/docs/en/skills) in `.claude/skills/`, which Claude loads only when it writes a post. My `AGENTS.md` gives it one line: follow the `write-blog-post` skill.

**Rules that must never break.** These files are advice, and Claude can miss advice. If something must never happen, the docs point you to a [hook](https://code.claude.com/docs/en/hooks-guide) that blocks it instead.

**Secrets.** The file is in git. Mine names the `AUTH_SECRET` setting but never its value.

Anthropic suggests [keeping each file under 200 lines](https://code.claude.com/docs/en/memory), because longer files get followed less. Mine is about 80.

![A small robot holding a single sheet of paper next to a tall wobbly stack of paper it has decided not to carry](/assets/images/writing/robot-one-sheet.webp)
*It took the one page that mattered.*

## 4. How it stays right

Instructions go stale like any other doc. My first project instructions for this site still said it deployed from the `master` branch through GitHub Pages, after I had moved it to `main` and Cloudflare.

Now the rule is simple. When a convention changes, `AGENTS.md` changes in the same commit. And when I correct a choice, like "too colourful", it becomes a line in the file.

So the file keeps growing, one line per "no", and I rewrite lines when they stop being true.

## Questions people ask

### Do I still need a CLAUDE.md file?

Only in a few cases: you want rules that only Claude should read, or you're on a Claude Code version older than 2.1.277. Otherwise an `AGENTS.md` is enough. If you do keep both, put `@AGENTS.md` at the top of the `CLAUDE.md`, because Claude reads the `CLAUDE.md` and skips the other one.

### Should AGENTS.md be in git?

Yes, so everyone on the project, people and agents, gets the same rules. Personal rules go in `~/.claude/CLAUDE.md`, which stays on your machine. Skip `CLAUDE.local.md` here: having one makes Claude stop reading `AGENTS.md`.

### Is it the same as Claude Projects instructions?

No. `AGENTS.md` lives in the code and travels with it. Project instructions live in [Claude Projects](https://davit.cc/writing/how-to-use-claude-projects/) and cover how you work: where the repo is, who approves what. I keep both short. They overlap only on how to ship, because that rule matters everywhere.

## Start yours

1. Run `/init` in Claude Code. It reads the codebase and writes a first `CLAUDE.md`.
2. Rename it to `AGENTS.md`, so every agent reads it.
3. Delete everything Claude could find by reading the code.
4. Add how you ship and what you've already said no to.
5. Each time you correct Claude, add one line.

Write down the "no". Skip the rest.

More on how this site gets built in [my agentic coding workflow](https://davit.cc/writing/agentic-coding-workflow/), or see what I've worked on in [my CV](https://davit.cc/cv/).
