# Session X Part 7: Session W's open items, swept once more (2026-10-08)

Sources re-read: Session W's STATUS entry (its "Owner items", "Known CI intermittents" and "Decide" lists), ADR-015
S1–S145, `docs/performance/SESSION_W_PERFORMANCE.md`, `docs/product/WHOLE_LIFE_W.md` and PR #77's description. Each item
is closed here or listed with the reason it stays open. Labels: local / source (dated) / owner-reported.

## Closed in Session X
| Item (source) | What was done | Where |
|---|---|---|
| Export everything's consent checkbox sat above its sentence, centred (ADR-015 S141, STATUS W "Decide") | the row sets its direction and the checkbox drops the global input padding; a layout test on both projects | `export-everything.css`, `tests/export-everything.spec.ts` |
| `/api/market-logo`'s headers replaced by middleware (STATUS W "Decide") | Part 4: the route keeps its own sandbox policy and day-long cache | ADR-016 X7, X8 |
| The performance options (SESSION_W_PERFORMANCE, WHOLE_LIFE_W action 7, ADR-015 S134) | Part 5: static manifest, fewer prefetches, wallet and sync code on use, zod's locales out; the shell 497.7 → 401.0 kB | SESSION_X_PERFORMANCE.md |
| WHOLE_LIFE_W owner action 1 said the acceptance redeploy goes "through the Manual Alpha workflow" | corrected: the owner deploys it locally from the ops checkout per FINAL_ACCTEST_REDEPLOY.md; the public Alpha is the Manual Alpha workflow | `WHOLE_LIFE_W.md` |
| WHOLE_LIFE_W owner action 2 (market coordinator before the app) | marked done with the owner-reported deploy (2026-10-07 19:45:57 UTC from `72ad872`) | `WHOLE_LIFE_W.md` |
| Fitbit's date: IMPORT_FORMATS said support ended 2026-09-30, the brief 2026-10-30 | both are right: Google's notice (dev.fitbit.com/build/reference/web-api/, read 2026-10-08) says support ended 30 September 2026 and the API is turned off on 30 October 2026; IMPORT_FORMATS now gives both with the quote, and the Devices page no longer says the access "ended" (it "is ending": support stopped 30 September, turned off 30 October) | `IMPORT_FORMATS.md`, `devices-view.tsx` |
| PUSH_ACTIVATION and WATCHED_DEPLOY_WRANGLER's ops-checkout check named wrangler 4.144.0 | 4.147.0, and the two delete commands checked in it (`--help`, local, 2026-10-08) | `PUSH_ACTIVATION.md` (rewritten in Part 8) |
| MANUAL_ALPHA_WORKFLOW did not name the Alpha's Worker entry | names `apps/web/alpha/worker.mjs` (Session W Part 23) and what it does | `MANUAL_ALPHA_WORKFLOW.md` |
| Docs written before W merged | dated notes "merged as `72ad872`, live as #32": ADR-015's status, FINAL_ACCTEST_REDEPLOY "Session W changes", SYNC_WRITES_ON | those files |
| Known CI intermittents (STATUS W) | Part 6: five fixed at the cause, two monitored with evidence | `part6/CI_INTERMITTENTS.md` |
| The post-deploy curl for Part 23's static miss (PR #77 owner actions) | done by the owner: `GET /_next/static/zigoals-missing.js` → 404, `text/plain; charset=utf-8`, the deny-all policy (2026-10-07 20:32 UTC, owner-reported); recorded with deploy #32 in STATUS | STATUS (Part 16) |
| The stale secret-allowlist question (ADR-016 X5) | X-LOCAL fixed `memory.test.ts` on its branch (`1cea510`); the entry warns once that branch is in main and the second merge removes it | handoff H1 |

## Still open, with the reason
| Item (source) | Why it stays open | Owner action |
|---|---|---|
| The acceptance redeploy (WHOLE_LIFE_W action 1, STATUS W) | a deploy; never an agent's | run FINAL_ACCTEST_REDEPLOY.md from the ops checkout |
| The 20-row owner test (WHOLE_LIFE_W) and the W gallery | needs the owner's Mac, iPhone and two signed-in devices | as listed there |
| Spotify, health links, Apple Music (WHOLE_LIFE_W 3–5) | registrations, accounts and a paid membership | optional, as listed |
| The finance homes switch (ADR-015 S2, WHOLE_LIFE_W 6) | scheduled at least seven days after the W deploy, with the rollback target at or after W; out of scope for this session (the brief) | a later PR |
| braces 3.0.3 (ADR-015 S13) | no fixed release published (registry read 2026-10-07); development tooling only | as AUDIT_FIXES's option 1 |
| LEGAL_CHECKLIST §9 for counsel (STATUS W) | needs counsel | as listed |
| The local-only failures Session W listed (the 320 px checks, "Showcase Today 9.90", `run11-goal-options-pointer:5` on the phone, `today-screens:23`) | they pass in CI's real Chrome; the first is now known to be a real overflow with the Inter font installed (Part 6 record) | none: Part 14 examines each and fixes what is real |
| Older run evidence naming wrangler 4.131.1 or 4.144.0 (`docs/verification/run8/…`, `run9/…`, `WRANGLER_UPGRADE_ASSESSMENT.md`, `PENDING_UPGRADES_2026-10.md`, older STATUS entries, and the dated observations in LANDING.md:30, CPU_OWNER_CHECKLIST.md:70 and ADR-007:67) | historical captures and records of their date; rewriting them would falsify evidence | none |
