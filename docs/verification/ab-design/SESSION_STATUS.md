# Session AB-Design — status and resume point

Kept current after every finished part (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-ab-design`), screens worktree
`~/Documents/ZIGoals-Claude-ab-screens` (orphan `review/session-ab-design-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/4c847f6a-9e55-47fa-ac40-bed4f043d9c3/scratchpad`
(`env.sh` selects Node 24.19.0 through fnm; `capture.mjs`; `logs/`). Servers: `main`'s build on `:3103`, this branch's
production build on `:3104`.

## Resume here (2026-10-14; Parts 1–7 built, checked and committed)
Parts 1–7 are built (Part 7 lean: 28, 29, 31, 34, 36, 37, 38, 39 — ADR-024 D23–D30; 30, 32, 33, 35 not built) and committed
per part (Tier 3 commits first). The broad spec subset after the fixes (ADR-024 "Assertions changed", rounds 2–4):
437 passed, 3 failed — `goals-best-aa` share image (local-only: this Mac's Chrome opens a share sheet instead of
downloading), `a11y-wcag-x` keyboard ("Afternoon"/"Evening" filter button not on screen when focused) and contrast
(Health's sleep/meditation primary button 4.09:1) — both pass when run alone and only fail in the 2-worker run on this
Mac; to be judged on CI. The unit run's `scripts/worker-types.test.mjs` timed out spawning wrangler under load (passed in
the previous chain). Next: push, open the Draft PR, Gate A (CI must finish; read `AB_CLOUD_TO_DESIGN.md`), the gallery's
gate-a captures and `index.md`, then Part 8 (phone sweep, Chrome + WebKit) and Gate C.
Owner items: Inter (D1); AB-Cloud's `setGoalCardArt` (the picker's Save says "Soon" until it lands); the hosted verifier's
phone journeys open Settings through More (handoff); Today's "Life overview" rings (D23: no room in Today's script
budget); requests 30, 32, 33, 35 (not built this run).

## Done
- Part 0: docs scaffold; before-captures.

## Open
- Parts 1–8 and the gates; see ADR-024 and `docs/product/OWNER_UI_REQUESTS_AB.md`.
