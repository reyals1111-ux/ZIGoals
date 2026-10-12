# Session AA-Local — status and resume point

Kept current after every finished piece (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-aa-local`), runs worktree
`~/Documents/ZIGoals-Claude-aa-runs` (orphan `review/session-aa-local-runs`), screens worktree
`~/Documents/ZIGoals-Claude-aa-screens` (orphan `review/session-aa-local-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/84136727-7ff5-4b5b-8f5a-39ab937fc67d/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`, `main-poll.log`).

## Resume here (2026-10-12 ~13:05Z; the PR description carries the same block)
1. HEAD pushed = `f77b3e24`; local commits on top: `1d08a450` (status), `1ff7d805` (two corpus cases accept
   `set-time-of-day`), and an uncommitted Gate C batch (ADR-022 B49–B51). CI on `f77b3e24`: web checks and integration
   green, the three browser-suite shards red (75 failures) — the shards had never finished on this branch (every run
   since Part 2 was cancelled by the next push), so the full-suite regressions from Parts 1–4 surfaced only now. All
   65 reproduced locally (`/tmp/aa-ci-repro2.log`); causes and fixes in ADR-022 B49 (sections open by default, the
   game card and year view out of the layout regions, Health highlights inside the nourishment item, timer control
   names restored, LoadBoundary on every lazy piece, swipe row stacking/clip only while swiping, chip buttons 44 px,
   setup record only when something was made), B50 (no sleep score on short nights), B51 (word match needs a real
   stem), plus the listed spec updates (help topics 12, onboarding/sleep flows pass the focuses step, Showcase counts
   7, habits-aa H1/H2). Verification chain running: `scratchpad/fix-chain.sh` → `/tmp/aa-fix-chain.log` (typecheck,
   lint, build :3103, weights, the 37 failing lines on both projects + help/onboarding + the AA specs).
2. Part 6 final: Sonnet corpus 736/770 → 738 re-scored (95.6/95.8 %) and a second pass 739/770 (96.0 %); Sonnet spoken
   661/681 (97.1 %); Sonnet new features 44/45; 15 conversations 15/15 ×3; Haiku corpus 724/770 (94.0 %), spoken
   635/681 (93.2 %), new features 45/45; gemma4 676/770 (87.8 %); qwen3.8 649/770 and 664/770 (84.3/86.2 %). Ledger
   $26.14 of $50 (runs branch). Golden sets byte-identical since Part 5.
3. Then: when the chain is green, commit + push the batch (key sweep first), CI on the new head (all shards must finish
   green), the remaining Gate C items (full unit suite, WebKit pass, weights vs main on :3104, revert gate on the new
   commits, today-screens ceiling decision), the docs/STATUS.md entry from `STATUS_ENTRY_DRAFT.md` as the last commit,
   `gh pr ready 84`, API check, stop caffeinate/forwarder/poller/servers, the owner report.

## Done
- Part 0; Part 1 (B12–B16); Part 2 (B17–B21); Parts 3–5 built (B22–B39), Gate A reading of AA-Cloud (B40).

## Open
- Everything from Part 1 on; see the plan in ADR-022.
