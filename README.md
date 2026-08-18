# 🍷 dsh-palate — an eye that grows

[![ci](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml/badge.svg)](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml) [中文说明](README.zh.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin

> **Design-audit tools measure with a fixed ruler. dsh-palate trains an eye that grows.**

Most design-review plugins ship a static ruleset and apply it forever — use them once or a thousand times, the judgment is identical. dsh-palate is the opposite: it keeps a **taste corpus** that *accumulates*. Every example you feed it and every principle you distill sharpens the judgment your agent draws on. The more you use it, the better its eye gets.

## Why this exists

Taste is not a gift — it's **pattern recognition built from exposure**. See enough good and bad design, and the rules emerge. dsh-palate turns that into a mechanism an agent can actually use:

1. **Feed** — record designs you judged good or bad, and *why*
2. **Distill** — recurring lessons become codified principles
3. **Review** — critique a new design against the accumulated taste, not a generic checklist
4. **Grow** — every verdict reinforces the principles it supports; the palate compounds

## What the agent gets

| Tool | What it does |
|---|---|
| `palate_review` | Assemble the accumulated taste (principles + relevant past examples) as context, so the agent critiques grounded in *learned* judgment |
| `palate_add` | Feed an example (`good`/`bad`/`note` + reason + tags) into the corpus — grows the palate |
| `palate_learn` | Distill a new principle from experience and add it to the codified taste |
| `palate_list` | Browse the accumulated corpus |
| `palate_principles` | List the codified principles, ordered by evidence |
| `palate_stats` | How much taste has accumulated: examples studied, principles distilled |

Ships with a **starter palate** of 12 foundational principles (hierarchy, contrast, type scale, spacing rhythm, alignment, palette discipline, affordance, feedback, clarity, and an anti-AI-slop rule), so it's useful out of the box — then it grows from there.

## How it works

```
palate_add (good/bad + why)  ──▶  taste corpus (SQLite + Markdown mirror)
palate_learn (new rule)       ──▶  codified principles
palate_review (a design)      ──▶  principles + relevant examples  ──▶  agent writes grounded critique
        ▲                                                                │
        └──────────────────── verdicts reinforce principles ◀───────────┘
```

- **Storage**: `node:sqlite` (built into Node ≥ 22) at `$DSH_HOME/palate/`, plus human-readable `taste.md` / `principles.md` mirrors. Zero runtime dependencies.
- **The panel**: a draggable overlay shows the growth story — examples studied, principles distilled, recent judgments.
- **Vision pairing**: feed it screenshots by reading them with a vision tool first (e.g. `modlens_read_image`), then pass the description to `palate_review`.

## Honest framing

This is **accumulated retrieval + codified principles**, not model fine-tuning. The plugin supplies the learned taste as context; *the model* renders the actual critique. That's deliberate: the judgment stays auditable (you can read `taste.md` and `principles.md`), and it improves as the corpus grows — without retraining anything.

## Install

```sh
dsh plugin --profile web add github:guo6x/dsh-palate
```

Requirements: DeepSeek Harness web profile, Node ≥ 22. Restart `dsh web`, refresh the page — a 👁️ button appears at the sidebar foot.

## Develop

```sh
pnpm install
node build.mjs        # esbuild → lib/index.js (host ESM) + lib/client.js (ModuleLoader bundle)
node tests/smoke.mjs  # 17 pure-logic checks (no browser needed)
```

MIT licensed. Ideas and examples welcome — open an issue.

## Known limitations

- **No semantic matching in the plugin itself** — relevance between a subject and past examples is tag/keyword based; the model does the deeper reasoning from the assembled context.
- **Markdown mirrors are read-only exports** for v0.1 (human edit-and-merge-back is planned).
- **Vision is delegated** — pair with a vision tool to review screenshots.
