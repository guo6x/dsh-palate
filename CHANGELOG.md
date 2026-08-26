# Changelog

All notable changes to dsh-palate.

## [0.4.2] - 2026-08-26

### Fixed

- Run the build through `prepare` when the plugin is installed as a Git dependency, while retaining committed `lib/` entrypoints as a fallback.

## [0.4.1] - 2026-08-26

### Fixed

- Dock the growth panel below the browser cockpit by default and cap its height so opening the DSH plugin panels together does not hide controls.

## [0.4.0] - 2026-08-25

### Added

- Four transparent starter examples are seeded only when a profile has no taste examples, giving the first review concrete good/bad evidence without overwriting existing user data.
- The growth panel now shows recent tracked reviews and the exact example refs captured as evidence through the read-only `/palate/reviews` route.

## [0.3.3] - 2026-08-25

### Changed

- Make the GitHub first-run path explicit in both READMEs: install, restart, visible success signal, a safe 90-second learning-loop demo, and recovery steps.

## [0.3.2] - 2026-08-25

### Fixed

- Declare the client-side `slots` dependency before registering the sidebar button and overlay, so the DSH Web UI loads the palate panel instead of rejecting the plugin at startup.
- Make the sidebar button and overlay subscribe to the same open state; dragging now uses the title bar only and calculates from the pointer-down position.
- Add a generated-client contract test that verifies the injection declaration, both slot registrations, and shared panel state.

## [0.3.1] - 2026-08-25

### Fixed

- Commit the built `lib/` entrypoints required by GitHub/path installations, so the published plugin always contains the files declared by `main` and `exports`.

## [0.3.0] - 2026-08-25

### Added

- Tracked `palate_review` records with a `review_id` and a snapshot of the principles and examples used as evidence.
- `palate_feedback` records one helpful/mixed/unhelpful outcome per review, plus accepted and rejected reviewed principles. Only accepted principles gain evidence.
- `palate_effectiveness`, a loopback `/palate/effectiveness` endpoint, `feedback.md`, and the growth panel expose real acceptance/rejection history separately from raw corpus size.

## [0.2.0] - 2026-08-25

### Changed

- `palate_review` now ranks examples against the actual review subject instead of returning merely recent examples.
- Local zero-dependency retrieval scores words and tags, includes Chinese word fragments, exposes matched terms, and omits unrelated evidence when no tag filter was requested.

## [0.1.0] - 2026-08-16

### Added

- **Accumulated taste store**: a growing corpus of design examples (good/bad/notes with reasons + tags) plus codified principles, backed by `node:sqlite` with human-readable Markdown mirrors (`taste.md`, `principles.md`).
- **Starter palate**: 12 foundational design principles seeded on first run (hierarchy, contrast, type scale, spacing, alignment, palette discipline, consistency, affordance, proximity, feedback, clarity, anti-AI-slop).
- **Six tools**: `palate_review` (assemble learned taste as critique context), `palate_add` (feed examples), `palate_learn` (distill principles), `palate_list`, `palate_principles`, `palate_stats`.
- **Reinforcement loop**: verdicts can reinforce the principles they support, bumping evidence counts.
- **Growth panel**: draggable Web GUI overlay showing examples studied, principles distilled, and recent judgments.
- Zero runtime dependencies; 17 pure-logic smoke checks; GitHub Actions CI.
