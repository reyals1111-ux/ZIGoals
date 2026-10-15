# Session AB-Design — status and resume point

Kept current after every finished part (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-ab-design`), screens worktree
`~/Documents/ZIGoals-Claude-ab-screens` (orphan `review/session-ab-design-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/4c847f6a-9e55-47fa-ac40-bed4f043d9c3/scratchpad`
(`env.sh` selects Node 24.19.0 through fnm; `capture.mjs`; `logs/`). Servers: `main`'s build on `:3103`, this branch's
production build on `:3104`.

## Resume here (checkpoint 2026-10-15 02:10, c13 done except the touch and Chrome audits)
**State.** Head `f3b8a870`. Since `7162a9d2`: the relay size-cap test refuses on the declared size (`05bd23e1`); one
shared 30-second clock (`d77dd66f`: CI's WebKit `zigi-simulated-day` timed out on every branch run — the fake clock costs
~7 ms per timer firing and phone Habits had six 30 s intervals; 6.7 s → 1.8 s per fake hour); 320 px and stress fixes
(`f3b8a870`: life card empty sentence wraps, phone footer chips wrap below 390 px and stay 44 px, charts and the footer
line measure inside their ResizeObserver again, asset-card and ring figures sized from their length, portfolio.spec
waits for Wealth's later sections). ADR-024 "CI: WebKit time on this branch, and one 30-second clock".
**c13 results.** Chain: lint, typecheck, build green; unit 1 failure (the relay race, fixed); 183/185 targeted specs (Help
46 px margin added; a11y-wcag-x keyboard is a local-load flake, green on CI). Full WebKit set 431 passed, 0 failed (2
workers). Stress audit: footer chips, empty Wealth sentence, three stress figures — all fixed. WebKit audit: the empty
Wealth sentence — fixed. Touch and Chrome audits still running on :3104. Scratch worktree `scratchpad/wt14` serves the
working tree on :3103 for checks.
**CI.** `7162a9d2` run 38649650159: checks, integration, alpha gate green; browser shards 1/3 (run10-widgets 320 px,
portfolio) and both WebKit shards (zigi-simulated-day, zigi-alive:190, zigi-accept-correct stop-fast) red — the first
three fixed in `d77dd66f`/`f3b8a870`; `05bd23e1`'s run in progress, `f3b8a870` queued.
**Next.** Finish the c13 audits → fix → rebuild → Gate C (captures, proof table, full unit, full browser suite once, WebKit
phone set, weights, revert gate, design critique) → CI fully green → STATUS → PR Ready.
**Rules for the finish (owner).** today-screens ≤ 5.8 / Showcase ≤ 11.5 by layout only; no ceiling or budget raised; CI
aggregate fully green with the security gate in its own job; a WebKit flake that also failed on AB-Cloud's pre-merge run
and does not reproduce locally under 2-worker load is recorded with evidence, not looped on.
**Keep-awake.** `caffeinate -dimsu` (with -d; owner, after the 00:50 lock). Never stop a running caffeinate. Servers only
from Bash (nohup, 3102–3104).

## Earlier resume point (2026-10-14; Phase 2 on Opus 5.5)
Phase 1 is complete (STATUS entry). Phase 2 ("Finish everything, nothing half done"): Parts 0–13 are built (ADR-024 P1–P20;
Part 12, the second merger with AB-Cloud's PR #85, is in as a merge commit); Part 14 (the phone/tablet sweep), then the
owner's **closing pass**, then Gate C remain. Scratchpad tools: `states.mjs` (named states × widths), `chain-part.sh`
(lint → typecheck → unit → build on :3104 → specs), `serve-prod.sh`, `start-dev.sh` (:3102).
**Owner's closing pass (2026-10-14, after every part, before Gate C):** (1) rings at the source — number and "%" always inside
the inner circle at every size (1–3 digits, 100 %), then every ring in the app; (2) an automated layout audit (every route,
state, dialog and sheet; Showcase and an empty device; 320/390/430/768/1024/1280/1440/1920 Chrome + 390 WebKit): horizontal
scroll, overflow/clipping, overlaps, wrapped numbers, ring labels, targets < 44 px, axe contrast — fix all, commit the clean
report to docs/verification/ab-design/; (3) stress states (40+ character names, US$1,234,567,890.12 and €, 4-digit
counters, 0/100 %, empty/one/many, loading, errors, offline); (4) the 4-in-1 consistency review page by page, listed and
fixed; (5) interaction states (hover, focus, pressed, disabled, keyboard order, reduced motion/Motion Off, dialogs' focus);
(6) a final read-only design-critique agent over fresh 390/1440 captures, everything fixed, re-captured. Record it in
ADR-024 "Closing pass", the gallery and the proof table; then Gate C, STATUS, PR Ready.
Owner items: Inter (D1).

## Done
- Part 0: docs scaffold; before-captures.

## Open
- Parts 1–8 and the gates; see ADR-024 and `docs/product/OWNER_UI_REQUESTS_AB.md`.
