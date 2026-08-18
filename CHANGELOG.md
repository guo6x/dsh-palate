# Changelog

All notable changes to dsh-palate.

## [0.1.0] - 2026-08-16

### Added

- **Accumulated taste store**: a growing corpus of design examples (good/bad/notes with reasons + tags) plus codified principles, backed by `node:sqlite` with human-readable Markdown mirrors (`taste.md`, `principles.md`).
- **Starter palate**: 12 foundational design principles seeded on first run (hierarchy, contrast, type scale, spacing, alignment, palette discipline, consistency, affordance, proximity, feedback, clarity, anti-AI-slop).
- **Six tools**: `palate_review` (assemble learned taste as critique context), `palate_add` (feed examples), `palate_learn` (distill principles), `palate_list`, `palate_principles`, `palate_stats`.
- **Reinforcement loop**: verdicts can reinforce the principles they support, bumping evidence counts.
- **Growth panel**: draggable Web GUI overlay showing examples studied, principles distilled, and recent judgments.
- Zero runtime dependencies; 17 pure-logic smoke checks; GitHub Actions CI.
