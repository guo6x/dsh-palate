# 🍷 dsh-palate — an eye that grows

[![ci](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml/badge.svg)](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml) [中文说明](README.zh.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin

> **Design-audit tools measure with a fixed ruler. dsh-palate trains an eye that grows.**

Most design-review plugins ship a static ruleset and apply it forever — use them once or a thousand times, the judgment is identical. dsh-palate is the opposite: it keeps a **taste corpus** that *accumulates*. Every example you feed it and every principle you distill sharpens the judgment your agent draws on. The more you use it, the better its eye gets.

## Why this exists

Taste is not a gift — it's **pattern recognition built from exposure**. See enough good and bad design, and the rules emerge. dsh-palate turns that into a mechanism an agent can actually use:

1. **Feed** — record designs you judged good or bad, and *why*
2. **Distill** — recurring lessons become codified principles
3. **Review** — critique a new design against the accumulated taste, not a generic checklist
4. **Calibrate** — record which recommendations actually helped; only confirmed helpful principles gain evidence, so the palate compounds honestly

## What the agent gets

| Tool | What it does |
|---|---|
| `palate_review` | Assemble the accumulated taste (principles + relevant past examples) as context, so the agent critiques grounded in *learned* judgment |
| `palate_feedback` | Use a `review_id` to record whether a critique helped and which principles were accepted or rejected; only accepted principles gain evidence |
| `palate_add` | Feed an example (`good`/`bad`/`note` + reason + tags) into the corpus — grows the palate |
| `palate_learn` | Distill a new principle from experience and add it to the codified taste |
| `palate_list` | Browse the accumulated corpus |
| `palate_principles` | List the codified principles, ordered by evidence |
| `palate_effectiveness` | See which principles were accepted or rejected in real review feedback |
| `palate_stats` | How much taste has accumulated: examples studied, principles distilled |

Ships with a **starter palate** of 12 foundational principles (hierarchy, contrast, type scale, spacing rhythm, alignment, palette discipline, affordance, feedback, clarity, and an anti-AI-slop rule), so it's useful out of the box — then it grows from there.

## How it works

```
palate_add (good/bad + why)  ──▶  taste corpus (SQLite + Markdown mirror)
palate_learn (new rule)       ──▶  codified principles
palate_review (a design)      ──▶  review_id + principles + relevant examples  ──▶  agent writes grounded critique
        ▲                                                                            │
        └── palate_feedback (accept/reject + why) ──▶ effectiveness + accepted-principle evidence ─┘
```

- **Storage**: `node:sqlite` (built into Node ≥ 22) at `$DSH_HOME/palate/`, plus human-readable `taste.md` / `principles.md` mirrors. Zero runtime dependencies.
- **Retrieval**: a review ranks examples against the current description using local words, tags, and Chinese word fragments; when no precedent is relevant, it leaves the evidence empty instead of padding with recent entries.
- **Feedback loop**: every `palate_review` snapshots its evidence; `palate_feedback` records the outcome, while `feedback.md` and the panel show actual acceptance/rejection data.
- **The panel**: a draggable overlay shows examples studied, principles distilled, review feedback, and recent judgments.
- **Vision pairing**: feed it screenshots by reading them with a vision tool first (e.g. `modlens_read_image`), then pass the description to `palate_review`.

## Honest framing

This is **accumulated retrieval + codified principles + explicit feedback**, not model fine-tuning. The plugin supplies learned taste as context; *the model* renders the critique. Only a user/agent-confirmed `palate_feedback` adds evidence to a principle, keeping judgment auditable through `taste.md`, `principles.md`, and `feedback.md` without retraining anything.

## Install — copy, paste, confirm

```sh
# GitHub is the supported release channel.
dsh plugin --profile web add github:guo6x/dsh-palate
```

Restart a running `dsh web` process, then refresh the page. **Installation is complete when a 👁️ button appears at the bottom of the sidebar.** Click it to see the starter palate, its principles, and its feedback history.

Requirements: the DeepSeek Harness web profile and Node ≥ 22. The plugin uses only local SQLite storage — no account, API key, or embedding service is required.

Developing from a checkout instead? Run `dsh plugin --profile web add .` from the repository directory. The committed `lib/` files mean GitHub installs do not run a build script.

## See the learning loop in 90 seconds

Start a new chat and paste this safe, local-first task:

> Build our first taste record for a dense analytics dashboard. Use `palate_add` to save one **bad** example: “all 12 KPI cards have equal visual weight, so the decision signal is buried”; tag it `dashboard, hierarchy`. Then use `palate_review` to critique “an analytics dashboard with twelve equal KPI cards, one primary revenue metric, and a small trend chart.” Explain which learned principles you used.

The response should name the matched record and starter principles instead of applying a generic checklist. Open the 👁️ panel to see the example count grow and the new review appear. If you adopt a recommendation, ask the agent to record `palate_feedback` for that review; only confirmed helpful principles gain evidence.

### If the 👁️ button is missing

- Confirm the plugin is installed in the **web** profile: `dsh plugin --profile web list dsh-palate`.
- Restart the `dsh web` process after installing; a browser refresh alone cannot load new host code.
- Check that Node is version 22 or newer. The plugin has no additional runtime dependency to install.

## Develop

```sh
pnpm install
node build.mjs        # esbuild → lib/index.js (host ESM) + lib/client.js (ModuleLoader bundle)
node tests/smoke.mjs  # pure-logic checks (no browser needed)
```

MIT licensed. Ideas and examples welcome — open an issue.

## Known limitations

- **No embedding-based semantic matching in the plugin itself** — it retrieves locally by tags, words, and Chinese word fragments; the model does the deeper reasoning from the assembled context.
- **Feedback is explicit** — the plugin does not guess whether a user adopted a recommendation; call `palate_feedback` after a review to form effectiveness data.
- **Markdown mirrors are read-only exports** for v0.1 (human edit-and-merge-back is planned).
- **Vision is delegated** — pair with a vision tool to review screenshots.
