# ADR-027: Session AE, "Stunning, finished": session decisions

Status: **In progress** on `feature/session-ae-stunning`, from `main` `11d8408` (Merge #88, Session AD; live as Alpha #43),
in a cloud sandbox. This record holds the owner's decisions at plan approval and every decision the session took without
asking (decide by the project rules and the safest option). Resume point: `docs/handoff/AE_RESUME.md`. Captures: the
orphan branch `review/session-ae-screens`.

## Owner decisions (2026-10-17, plan approval)
- **The brief:** Part 0 records and the verifier; Part 1 Today's hero as one seamless cosmic scene (top priority); Part 2
  the footer banner as a stand-out finale (top priority); Part 3 Light and Dark as final themes, Nebula unchanged and the
  default; Part 4 the sidebar background, the demo-balance line removed, Habits' group spacing and Routines as its own
  block, header art on every other page; Part 5 the four layout issues on `main`; Part 6 wallets (read-only) and on-ramp
  research; Gate C once (start ≤ Sun 18 Oct 06:00 Brussels); the PR out of Draft with CI green before Sun 12:00 Brussels.
  No pre-cut; only "lean finish" shortens it. The owner's five annotated screenshots (S1 the footer banner, S2 Today's top,
  S3 Habits' time-of-day groups, S4 Habits' Routines block in arrange mode, S5 Habits' header) are the visual brief; they
  are not committed.
- **Rule A (budgets):** every page's script weight budget raised by 10 %, rounded up to the next kB, in one commit
  ("Owner-approved budget raise (+10 %)", `57c8017a`); big new pieces still load on demand; every page's new headroom goes
  into STATUS.
- **Rule B (parallel wording, `TIER 3 (project rules)`, `f1d91638`):** CLAUDE.md now says builds and browser test runs run
  one at a time per machine (Playwright at most 2 workers) and subagents may write code, design and research in parallel.
  CLAUDE.md is the only place the rule was stated (ADR-026 F3 quotes the old words as history). `apps/web/AGENTS.md`
  unchanged.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| G1 | 0 | The branch is `feature/session-ae-stunning` (the owner's name), from `main` `11d8408`; the harness's `claude/elegant-archimedes-03eus3` is left untouched. | The owner's instruction, as AC and AD did (ADR-025, ADR-026 F1); nothing can reach `main` by accident. |
| G2 | 0 | The PR opens as a **Draft right after Part 0** so every push gets CI (Milestone quality runs on pull requests). | CI evidence for every part. |
| G3 | all | **Parallel work under one machine lock:** helper agents work in their own git worktrees and branches (`ae/<lane>`), one owner per file, merged into the feature branch by merge commits. Every production build, Playwright run and Chromium screenshot on this machine takes `/tmp/ae-browser.lock` (`flock`); the long-running `next start` server itself does not hold it. Helpers write code, design and research and run typecheck, lint and focused unit files; the lead runs every build and browser suite. | Rule B's wording; builds and browser runs under CPU load caused false failures before. |
| G4 | 3 | **Theme layers per lane:** the generator appends `apps/web/themes/<theme>.extra.css`, then any `<theme>.<part>.css` in name order (`build-themes.mjs` `handLayers`); output unchanged by the change itself. Only the lead regenerates the sheets, after each merge. | Parallel lanes never share a hand-written theme file; the generated sheets stay one owner's. |
| G5 | 4 | **Header art entrance:** the brief asks for "the same one-time entrance motion as Habits'", but Habits' orbit has none. One subtle one-time entrance is designed for the whole family (Habits' orbit included): rings draw in, dots arrive, the glyph's glow blooms once; none under reduced motion or Motion Off. | It keeps the family consistent and respects the brief's intent; Habits gains only a one-time, motion-gated entrance. |
| G6 | 4, 6 | **The demo-balance line** ("1,000 ZIG demo balance") leaves the top bar and the phone Status sheet by the owner's request; the assertions that read it move to the wallet card's "Simulated balance" text and its value at equal strength, in a `TIER 3 (public-safety labels)` commit. | The owner's stated exception to "never remove"; the wallet card keeps the simulated-balance label. |
| G7 | 3 | **Light supersedes ADR-026 F14:** white-family surfaces with dark ink and deeper, matte accents; the sidebar themed (not an island); the hero and the banner as feathered scenes on a soft night (no boxes). | The brief's words; F14 was a preview. |
| G8 | 1, 2 | **Tests of removed features are replaced, not weakened:** AD's bleed spec, "the banner as tall as the planet" and Light's footer colour give way to the new features' stronger assertions (seam gradients, art under content, the arc reaching "= Wealth"); each listed in STATUS. | CLAUDE.md: never weaken an assertion; the features they guarded were removed by the owner. |
| G9 | 0 | **The verifier stays out of CI;** its stages move into a shared module whose local-capable stages a Playwright spec runs in their real order in CI's browser shards (no workflow change). | The script's own rule ("never part of CI") and the brief's ask are both met; a stage-order break fails CI. |
