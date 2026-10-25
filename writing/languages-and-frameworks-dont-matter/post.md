---
title: "Languages and frameworks don't matter anymore"
subtitle: "Any language works, as long as the agent can check its own work."
description: "With AI agents writing most of the code, the stack matters much less. What the best language for AI coding really comes down to, and what still matters."
date: 2026-10-23
modified: 2026-10-25
author: Davit Khaburdzania
slug: languages-and-frameworks-dont-matter
topic: Opinion
card: "After 15+ years across Rails, Elixir, React and Node, why the stack matters less than ever with AI."
order: 3
---

# Languages and frameworks don't matter anymore

![A small robot holding a screwdriver handle shrugs at a row of different screwdriver bits](/assets/images/writing/robot-screwdriver-shrug.webp)
*Any bit will do.*

I've shipped Rails, Elixir, Node, TypeScript, Python and React professionally. For 15 years, picking the stack was the first big decision on every project.

It isn't anymore.

If you're asking what the best language for AI coding is, my answer is anything where the agent can check its own work fast. The syntax barely matters.

## What changed

Agents write most of the code now, in whatever language you give them.

This year I've worked on a Next.js app for [Rillow](https://rillow.ai), an iPhone app, an Android app and a Chrome extension for [Bundle](https://bundle.ink), and this site in plain HTML. Each time the platform picked the language. Claude handled all of them.

Andrej Karpathy says agents now write almost all of his code ([Yahoo Tech](https://tech.yahoo.com/ai/chatgpt/articles/ai-agents-wrote-80-karpathys-175030864.html)). Simon Willison puts it simply: [writing code is cheap now](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/).

When code is cheap, the language you write it in is a detail.

## But languages aren't equal

To be fair, there's evidence they differ:

- **Elixir** scored highest on one benchmark, as its creator José Valim [points out](https://dashbit.co/blog/why-elixir-best-language-for-ai).
- **TypeScript** catches the most common mistake. In one study, almost all compile errors in AI-written code were type errors ([GitHub](https://github.blog/2025-12-09-why-ai-is-pushing-developers-toward-typed-languages/)).
- **Go** gets praise from Armin Ronacher for being easy for agents to read and test ([A Language for Agents](https://lucumr.pocoo.org/2026/2/9/a-language-for-agents/)).

Look at why each one wins, though. It's the same reason every time: the agent finds out fast when it's wrong.

That comes from the tooling. The syntax has little to do with it.

![A small robot building something at a workbench pauses and looks up at a desk lamp that has just lit up](/assets/images/writing/robot-lamp-lights-up.webp)
*All it needs is a light that comes on when it's wrong.*

## What still matters

1. **Fast feedback.** Tests that run in seconds and a strict type checker beat any language switch.
2. **One way to do things.** Conventions help agents for the same reason they help new hires.
3. **The platform.** An iPhone app goes through Xcode and App Review whatever you write it in.
4. **Code you can read.** You still review it. You still own it.

## So what should you pick?

**A new web app:** TypeScript, with strict checks on.

**Your team already knows Rails or Elixir:** keep it and write good tests.

**Performance-critical, native, or brand new with little public code:** this is where the choice still deserves real thought.

**Everything else:** pick what fits the platform and move on.

![A balance scale with a different small stone in each pan, its beam almost level](/assets/images/writing/balance-scale-stones.webp)
*Close enough.*

## What this means for hiring

Years in one framework tell you less than they used to. The agent already knows the framework.

I'd look for someone who splits work into small pieces, checks the results properly and knows what not to build.

## The short version

The best language for AI coding is the one that tells the agent it's wrong. Everything else is preference.

Here's [how I work with agents day to day](https://davit.cc/writing/agentic-coding-workflow/), and here's [my CV](https://davit.cc/cv/).
