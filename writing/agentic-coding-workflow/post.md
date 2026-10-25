---
title: "My agentic coding workflow: what I hand off and keep"
subtitle: "Mostly, I say no."
description: "How I build with AI agents: Claude writes the code, I write the rules once and make the calls. With the real prompts I used to rebuild this site."
date: 2026-10-23
modified: 2026-10-25
author: Davit Khaburdzania
slug: agentic-coding-workflow
topic: AI workflow
card: "How I build with AI agents every day: what I hand off, what I keep, and the setup behind it."
order: 1
---

# My agentic coding workflow

![An open notebook and a coffee cup on a desk, with five paper planes flying off from the notebook in different directions](/assets/images/writing/notebook-paper-planes.webp)
*Write it once. Send it off.*

I rebuilt this website in two days and didn't write a line of code.

Claude wrote it. I said yes or no. Mostly no.

That's my agentic coding workflow, and it comes down to three things:

1. One project per product.
2. Rules I write down once.
3. Short answers.

## 1. One project per product

Every product I work on gets its own Claude Project: this site, [Rillow](https://rillow.ai), [Bundle](https://bundle.ink) and [Unposed](https://unposed.camera).

I tell the project what I want. It starts a separate thread for each task, and each thread works on its own copy of the code. Three things can be in progress while I'm doing something else.

When I come back, I check what's done and what's waiting on me. It works from my phone too.

Boris Cherny, who made Claude Code, used to juggle ten or more sessions by hand ([VentureBeat](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are)). A project does the juggling for me. More on that in [how I use Claude Projects](https://davit.cc/writing/how-to-use-claude-projects/).

## 2. Rules I write down once

Every project starts with one paragraph of instructions. Mine says where the code lives, that I'm the only one working on it, and that every push goes live, so show me a preview first.

The code has its own rulebook too, an `AGENTS.md` file. A few real lines from it:

```md
- Light only. Mostly cool grey with a faint lavender glow. Davit found stronger lilac "too colourful". Never use green accents.
- Keep pixel art pixel-exact: nearest-neighbour scaling only.
```

Almost every rule in there is a "no" I said once.

When I correct Claude, I tell it to remember. Then I never say it again.

![A small robot on tiptoe pins another card onto a cork board full of pinned cards](/assets/images/writing/robot-cork-board.webp)
*Every "no" ends up on the board.*

Mitchell Hashimoto calls this [engineering the harness](https://mitchellh.com/writing/my-ai-adoption-journey): every mistake becomes a rule, so it doesn't happen twice.

<div class="flow" role="img" aria-label="The loop: I write the rules, Claude builds, I look at a preview. Yes means it ships. No means Claude tries again and remembers why.">
  <span>I write the rules</span>
  <span>Claude builds</span>
  <span>I look at a preview</span>
  <span><b>Yes:</b> it ships<br><b>No:</b> it tries again and remembers why</span>
</div>

## 3. Short answers

Here's what I actually typed during the redesign:

- "too colourful"
- "i love it"
- "childish"
- "not real"
- "Pixel is better"
- "mario in threejs"

That last one became [Shiba Land](https://davit.cc/projects/shiba-land/), a small platformer. With a Shiba instead of Mario, because I'd like to keep this website.

None of this is code review. It's taste, and taste is most of my job now.

Simon Willison says [writing code is cheap now](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/). When three versions of a page take a few minutes, picking one is the work.

![A person at a desk with a coffee looks at three small robots, each holding up a different drawing of a house](/assets/images/writing/robots-three-drawings.webp)
*Three versions. Pick one.*

If a choice changes what I'm building, Claude asks on a card with a few options and a recommendation. I pick one and go back to what I was doing.

## By the numbers

| The redesign | |
| --- | ---: |
| Time | About two days |
| Pull requests | 1 |
| Files changed | 43 |
| Lines of code I wrote | 0 |
| Replies in the thread | 165 |

## What I keep for myself

I decide what gets built. I approve anything that can't be undone. On this site every push goes live, so I see a preview first.

![A hand pressing a rubber stamp onto the middle of three sheets of paper, each showing a slightly different shape](/assets/images/writing/rubber-stamp-three-sheets.webp)
*The part I keep.*

And I read anything with my name on it. Including this post, which has been rewritten three times. The first version sounded like a robot. The second had too many details. The third was fine, and then I found a style I liked better.

## What still goes wrong

**Instructions go stale.** My first setup said the site deploys from the master branch. It doesn't. The first thread read the code and fixed it. Trust the code over your own summary.

**Drawing from scratch.** The first hand-coded Shiba came out "silly". The 3D one was too red. Claude does much better with clear rules, like pixel art, or with a design I've already made.

**Long threads get heavy.** After a while every new message costs more. New work gets a new thread.

## Try it

Pick one side project and make it a project.

1. Write one paragraph of instructions: where the code is, how to check a change, what needs your OK.
2. Put the rules for the code in `AGENTS.md`.
3. Ask for a preview before anything ships.
4. When you correct it, tell it to remember.

Then mostly say no.

If you're hiring someone who works like this, [here's my CV](https://davit.cc/cv/).
