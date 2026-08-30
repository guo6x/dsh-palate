# 🍷 dsh-palate — an eye that grows

[![ci](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml/badge.svg)](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml) [中文说明](README.zh.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin

> **Design-audit tools measure with a fixed ruler. dsh-palate trains an eye that grows.**

Most design-review plugins ship a static ruleset and apply it forever — use them once or a thousand times, the judgment is identical. dsh-palate is the opposite: it keeps a **taste corpus** that *accumulates*. Every example you feed it and every principle you distill sharpens the judgment your agent draws on. The more you use it, the better its eye gets.

## Why this exists

Taste is not a gift — it's **pattern recognition built from exposure**. See enough good and bad design, and the rules emerge. dsh-palate turns that into a mechanism an agent can actually use:

1. **Observe** — inspect a screenshot, URL, or design and name concrete visual evidence
2. **Stage** — turn that analysis into examples and principles that wait in a reviewable candidate queue
3. **Confirm** — only an explicit accept/reject decision changes the corpus; rejected ideas stay visible without changing taste
4. **Review** — critique a new design against the accumulated taste, not a generic checklist
5. **Calibrate** — record which recommendations actually helped; only confirmed helpful principles gain evidence, so the palate compounds honestly

## What the agent gets

| Tool | What it does |
|---|---|
| `palate_intake` | Stage a structured visual analysis as **pending** example/principle candidates; it never changes taste by itself |
| `palate_candidates` | Inspect pending, accepted, or rejected visual-training candidates and their source sessions |
| `palate_decide` | Apply the user’s explicit accept/reject decision; this is the only candidate-to-palate mutation path |
| `palate_review` | Assemble the accumulated taste (principles + relevant past examples) as context, so the agent critiques grounded in *learned* judgment |
| `palate_feedback` | Use a `review_id` to record whether a critique helped and which principles were accepted or rejected; only accepted principles gain evidence |
| `palate_add` | Feed an example (`good`/`bad`/`note` + reason + tags) into the corpus — grows the palate |
| `palate_learn` | Distill a new principle from experience and add it to the codified taste |
| `palate_packs` | Inspect opt-in visual-reference packs and whether they are already applied |
| `palate_seed` | Apply one or more visual-reference packs exactly once, without overwriting existing taste |
| `palate_list` | Browse the accumulated corpus |
| `palate_principles` | List the codified principles, ordered by evidence |
| `palate_effectiveness` | See which principles were accepted or rejected in real review feedback |
| `palate_stats` | How much taste has accumulated: examples studied, principles distilled |

Ships with a **starter palate** of 12 foundational principles plus four transparent teaching examples (good and bad dashboards, a readable table, and generic landing-page boilerplate), so the first review has concrete evidence — then it grows from there.

The four starter examples are inserted only when the local taste database is empty. Installing or upgrading the plugin never overwrites an existing palate.

## Visual reference packs: Apple and X

`dsh-palate` also ships two **opt-in** visual-reference packs:

- `apple-product-storytelling` — one product subject per viewport, proof-led imagery, restrained CTA choices, and a calm sequence of mini-campaigns.
- `x-direct-utility` — high-contrast identity, a decisive primary route, ranked secondary actions, and almost invisible supporting detail.

They are transparent abstractions of public pages observed on 2026-08-27, not scraped assets, brand copy, or templates to imitate. Start by calling `palate_packs`, then explicitly apply one or both with `palate_seed`. Use `tag: "apple"` or `tag: "x"` in `palate_review`: the tag filters **both** matching examples and style-scoped principles, while universal principles remain available.

For example, ask an agent:

> Inspect `palate_packs`, then apply `apple-product-storytelling` and `x-direct-utility` with `palate_seed`. Review our product-launch page with tag `apple`, and separately review our sign-in entry flow with tag `x`. Cite the evidence; do not copy either brand’s assets, copy, or identity.

## Visual training desk: observe → compare → confirm

`palate_intake` is deliberately a **staging** tool, not a hidden auto-learning button. First have the agent inspect a screenshot or page with a browser/vision capability. Then it records a compact, structured analysis: hierarchy, typography, color, spacing, interaction, and any other relevant dimension. The intake creates one example candidate plus any proposed principles; none are added to the corpus yet.

It can also record an explicit comparison with Apple, X, or future reference packs:

- `aligned` — the observed evidence supports named abstract reference principles
- `conflicts` — the evidence conflicts with named reference principles
- `insufficient_evidence` — the screenshot/page does not show enough to judge

Comparing against a pack that has not been seeded is allowed for research, but the record is marked **reference-only** and does not activate or inject the pack. This keeps analysis separate from style adoption.

Use `palate_candidates` to show the evidence and candidate IDs to the user. Only after they clearly say accept or reject should the agent call `palate_decide`. Accepted records preserve their training-session provenance; rejected records remain in `training.md` so a team can revisit the judgment later.

## How it works

```
inspect screenshot / URL with vision or browser
        │
        ▼
palate_intake (structured observations + pack comparison)
        │
        ▼
pending example / principle candidates ──▶ palate_candidates ──▶ user explicitly accepts or rejects
        │                                                                  │
        └──────────────────────────── palate_decide ◀─────────────────────┘
                                           │
                   accepted only ─────────┼───────── rejected stays auditable in training.md
                                           ▼
                    taste corpus + codified principles
                                           │
palate_review (a design) ──▶ review_id + learned evidence ──▶ agent writes grounded critique
        ▲                                                               │
        └── palate_feedback (accept/reject + why) ──▶ effectiveness + accepted-principle evidence ─┘
```

- **Storage**: `node:sqlite` (built into Node ≥ 22) at `$DSH_HOME/palate/`, plus human-readable `taste.md` / `principles.md` / `feedback.md` / `training.md` mirrors. Zero runtime dependencies.
- **Retrieval**: a review ranks examples against the current description using local words, tags, and Chinese word fragments; when no precedent is relevant, it leaves the evidence empty instead of padding with recent entries.
- **Feedback loop**: every `palate_review` snapshots its evidence; `palate_feedback` records the outcome, while `feedback.md` and the panel show actual acceptance/rejection data.
- **The panel**: a draggable overlay shows examples studied, principles distilled, the visual-training queue, recent review subjects, the exact example refs cited by each review, and recent judgments.
- **Vision pairing**: inspect screenshots with a vision tool first (e.g. `modlens_read_image`) or pages with a browser, then pass the evidence to `palate_intake` or `palate_review`. The plugin never fetches, screenshots, or claims to see a raw URL by itself.

## Honest framing

This is **accumulated retrieval + codified principles + explicit decisions and feedback**, not model fine-tuning. The plugin supplies learned taste as context; *the model* renders the critique. `palate_intake` does not count as learning: only a user-confirmed `palate_decide` adds a candidate, and only a user/agent-confirmed `palate_feedback` adds effectiveness evidence. That keeps judgment auditable through `taste.md`, `principles.md`, `feedback.md`, and `training.md` without retraining anything.

## Install — copy, paste, confirm

```sh
# GitHub is the supported release channel.
dsh plugin --profile web add github:guo6x/dsh-palate
```

Restart a running `dsh web` process, then refresh the page. **Installation is complete when a 👁️ button appears at the bottom of the sidebar.** Click it to see the starter palate, its principles, feedback history, and any staged training candidates.

Requirements: the DeepSeek Harness web profile and Node ≥ 22. The plugin uses only local SQLite storage — no account, API key, or embedding service is required.

Developing from a checkout instead? Run `dsh plugin --profile web add .` from the repository directory. The repository commits the `lib/` entrypoints, so GitHub and path installs can start immediately without running an install-time build script.

## First-run proof in 60 seconds

Use this short path to verify the install before teaching the palate:

1. Install with the command above, restart `dsh web`, and open a new chat.
2. Paste this prompt:

   > Call `palate_stats`, then use `palate_review` to critique “a dashboard with twelve equal KPI cards, one primary revenue metric, and a small trend chart”. Tell me which stored principles and examples you used, and return the `review_id`.

3. Confirm the response contains the starter principles, grounded evidence, and a `review_id`. Open the 👁️ panel: the review should also appear there.

This proves the complete useful path — host discovery, local storage, retrieval, and Web rendering — without an account, API key, screenshot upload, or remote service. To see the corpus grow, follow the 90-second loop below and add `palate_feedback` only after you have actually judged the recommendation.

## See the learning loop in 90 seconds

Start a new chat and paste this safe, local-first task:

> Build our first taste record for a dense analytics dashboard. Use `palate_add` to save one **bad** example: “all 12 KPI cards have equal visual weight, so the decision signal is buried”; tag it `dashboard, hierarchy`. Then use `palate_review` to critique “an analytics dashboard with twelve equal KPI cards, one primary revenue metric, and a small trend chart.” Explain which learned principles you used.

The response should name the matched record and starter principles instead of applying a generic checklist. Open the 👁️ panel to see the example count grow and the new review appear. If you adopt a recommendation, ask the agent to record `palate_feedback` for that review; only confirmed helpful principles gain evidence.

### Try the training desk safely

After the agent has actually inspected a screenshot or page, paste this task:

> Analyze the inspected product landing page with `palate_intake`. Record at least hierarchy, typography, color, spacing, and interaction observations; stage one example candidate and up to two concrete principle candidates. Compare it with `apple-product-storytelling` as `aligned`, `conflicts`, or `insufficient_evidence`, citing the exact reference principle(s). Show me the pending candidates and **do not call `palate_decide` until I explicitly choose accept or reject**.

The 👁️ panel should show a new training session and pending count, while the example and principle totals stay unchanged. Once you make an explicit decision, the agent can call `palate_decide`; `training.md` preserves both the analysis and the result.

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
- **Training decisions are explicit** — `palate_intake` stages evidence but does not inspect a raw URL/image or learn automatically; `palate_decide` needs a clear human accept/reject decision.
- **Markdown mirrors are read-only exports** (human edit-and-merge-back is planned).
- **Vision is delegated** — pair with a vision tool to inspect screenshots, or a browser to inspect URLs, before staging evidence.
- **Reference packs are not cloning kits** — they preserve observable layout and hierarchy lessons, not protected assets, copy, or a promise that every page from a referenced brand is appropriate for every product.
