# ADR-033: Session AH, "The Big Polish": session decisions

Status: **In progress** on `feature/session-ah-polish`, from `main` `f13abb0` (Merge #94, Session AG Polish 3; live as Alpha #49), in a cloud session. This record holds the owner's decisions at plan approval, the owner's amendments, every decision the session took without asking (M1…), and the closing table for every ID in the brief's index. Resume point: `docs/handoff/AH_RESUME.md`.

## Owner decisions (2026-10-25, plan approval)
- **The brief:** Session AH, "The Big Polish": every owner-approved finding from the two Grok reports (Alpha #44 picklist 1, Alpha #45 picklist 2), the open roadmap (RM4–RM8), security (scope E) and CI stability (scope F), in Parts 0–16. No UI redesign; every item is a logical fix to a real problem. After plan approval the session runs to the end without owner steps.
- **The scope file:** `origin/review/session-ah-scope:owner-scope/AH_SCOPE.md`, read into the session scratchpad with `git show`, never committed or merged.
- **Lane rule:** `apps/web/lib/ai/**`, ZIGi components and ZIGi evals belong to the later ZIGi session. Shared numbers and limits go into shared modules; ZIGi wires to them later.
- **Non-negotiables:** never merge, deploy, approve environments or log in to Cloudflare; no change to wallet signing, keys, transaction building or contract calls; no new dependency except Part 1's security bumps (pre-approved); reduced motion and Motion Off; theme parity; phones native-feel, computers and tablets keep their layout; route weights within budget; no fake data shown as real; the Checklist path, phone river, labels, footer and everything AG Polish 3 shipped are protected; the NO2 keep-list stays working; the Showcase and the empty start both clean.
- **Not in AH:** AF1, AF2, AF8, AF9, LA12; ZIGi items (ZI1–ZI15, DE7, the G-items, J10, L6, RM1–RM3, AF5, HE17); everything Later or Skipped in the scope file.
- **The approved plan:** `/root/.claude/plans/snug-fluttering-hartmanis.md` (summarised in the resume file).

## Owner amendments (2026-10-25, after approval; pre-approved)
1. **Every finding, not every row.** For each scope row, every finding ID (B-, N-, D-, L-, M-, T-, C-, BUG-) is fixed, or recorded as already fixed (with evidence) or not possible (with the reason). The closing table lists them per row.
2. **The "already fixed" check runs per part.** At the start of each part, for that part's rows only. Part 0 keeps the records, this ADR, the resume file, the Draft PR and RM8.
3. **DS1's revision stamp** is a stored-format change: additive (an optional field or a new device-only key), labelled TIER 3 (stored format), proven with the frozen readers #37–#49.
4. **SE14 device lock:** optional and off by default. It never makes the person's own local data unreachable: a clear recovery path, no encryption of data by the lock itself, no lockout beyond a short delay after failed attempts. If that cannot be done safely without dependencies, it is recorded instead of built.
5. **HA2/TR9 auto-tick from Health never double-counts.** A manual tick or log plus a Health log counts the day once. Unticking a Health-derived tick explains why it is ticked.
6. **TR7:** if the app has no exchange-rate source already, the currency switch hides with an honest "coming later"; no new outside data source or egress.
7. **RM6 PR-review Action:** `pull_request` only (never `pull_request_target`), never on forks, least-privilege permissions, the secret never echoed, a clean skip without it.
8. **CO11 notification actions and any service-worker or manifest change:** TIER 3 (PWA), with rollback.

## Owner amendment "Health journal date" (2026-10-25, during Part 2; pre-approved)
Part 17, the last part before the final STATUS commit and the final CI round: **one chosen day drives the whole Health page.**
1. **Behaviour (a bug today).** Changing the Journal date (← / →, the date itself, "Today") switches the WHOLE page to that day: quick counters (the owner's example: on 22 Oct the counters still showed 25 Oct's values, "Today in your Health journal · 25 Oct 2026"), water, food, meals, sleep, weight, measurements, meditation, fasting, workouts (DE8) and every other day-based widget.
   - Logging while a past day is selected logs to THAT day, clearly labelled ("Logging for Thu 22 Oct"). Future days can't be logged.
   - Trends and summaries over many days stay as they are, but mark the selected day.
   - A widget stored only as "today" gets per-day storage, additively (TIER 3 (stored format), frozen readers #37–#49), keeping today's values.
   - Deep links `?date=YYYY-MM-DD` (with C9's `?tab=`) open that day.
   - Tests: switching days shows that day's counters and values; logging on a past day stays on that day; Today returns.
2. **The date bar:** more interactive and visually stunning, never taller than now.
   - ← / → as nebula-gradient buttons (≥ 44 px, liquid-glass hover without pointer tracking, focus rings).
   - "Today" a real pill button in the nebula style, hidden or disabled when today is selected.
   - The date in ONE English format (VA8; e.g. "Thu 22 Oct" with a small "3 days ago" / "Yesterday" / "Today" hint); tapping it opens a date picker. (The owner's screenshot shows the native field in the device's language, "22 okt 2026", beside English copy.)
   - Phones: swipe left/right on the bar changes the day. Keyboard: ← / → when the bar is focused.
   - A one-time subtle change animation, off under reduced motion and Motion Off; theme parity in Nebula, Light and Dark.

## Decisions taken without asking
- **M1 — The branch.** The owner named `feature/session-ah-polish`; the harness branch `claude/wizardly-albattani-zc9cco` stays untouched, as L1 and K1 did.
- **M2 — The sandbox runs Node 22.22.0 against the project's 24.19.0.** As in AG Polish 2 and 3, a handful of unit files fail only here (`pre-run11-setup`, `run11/domain-review-race`, `visual-format` ja-JP, `vault/finance-homes`); CI on Node 24 is the judge for them. The Chrome channel points at the preinstalled Playwright Chromium (153) locally only.
- **M3 — The alert list.** The GitHub Security tab is not readable from this session; Part 1 works from `pnpm audit` on the lockfile of `f13abb0` (25 Oct): 16 advisories in five packages — `vite` 8.3.0–8.3.2 (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm high, GHSA-9jrq-w75r-8gcw low, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg; through `vitest` → `@vitest/mocker`; AF14), `@vitest/mocker` < 5.0.3 (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp), `glob` 10.3.3 (GHSA-5j98-mcp5-4vw2 high; `@node-minify/core` under OpenNext), `body-parser` < 2.4.0 (GHSA-27r3-jxmh-p828 high; `express` under OpenNext), `undici` < 7.30.1 / < 8.12.2 (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c high; `miniflare` and `jsdom`). STATUS lists exactly which are cleared.

- **M4 — RM8, verify-then-do (Part 0).**
  - *Timezone phase 3 (R1, read support):* done in Session P (`5b91f72`, PR #68). *Phase 4 (R2, writes and UI):* done in Session W Part 17 (`e5a1554`, `44e96e1`). Nothing open.
  - *QA2-04 (a reminder's day by the journal's zone, its time by the device clock):* left as an owner question in QA sweep 2; with phase 4 live it is a plain inconsistency, so fixed here: `zoneClock` in `lib/reminders/due.ts` reads the time in the same zone as the day (the Habit journal's zone for habits, the Health journal's for water; the device clock when a journal follows the device). Test: `lib/reminders/reminders.test.ts` (Tokyo journal, device elsewhere). ZIGi's own reminder rules (`lib/ai/knock/*`) still use the device clock: the ZIGi session's lane.
  - *The `@2x` brand assets:* already renamed to `-2x` in `37ca600` (no file under `apps/web/public` has `@` in its name; `lib/brand-assets.test.ts` guards it).
  - *Portfolio sync:* done in Session U (`c043105`, opt-in, ADR-013). *Full coin search:* both Portfolio searches (`CoinSearch`, `CoinPicker`) search the whole market catalog through `searchMarketAssets`; its ranking is WE1 (Part 9).
  - *Face ID / passkey for remembered devices:* ADR-008 option 2 (a passkey with PRF) still needs a test on a real iPhone (Safari's PRF `get()` support disagrees between Apple's notes and MDN). Not buildable or provable from this sandbox; stays open for the owner's device test. The separate device lock (SE14) is Part 12, under amendment 4.

- **M5 — Part 1, how each dependency commit was checked.** Every commit: lint, typecheck, the full unit suite (its failures compared file by file with `main`'s in this sandbox: identical, M2) and `pnpm audit`. The commits that touch build or Worker tooling (glob, body-parser under OpenNext; undici under miniflare) also ran `build:alpha` (next build + OpenNext), `check:alpha` (wrangler dry-run) and the local preview smoke (`preview:alpha`, wrangler dev, no login, no deploy: 21 app routes 200, `/` 307 to `/app`, robots and manifest 200, no Worker error). vitest, vite and jsdom's undici reach only the unit runner, so a build cannot change with them; after the last commit the production build, the route weights (all 21 pages and the shell within their lines, unchanged) and the frozen readers #37–#49 (13 builds × 33 records) ran once on the final tree. `pnpm audit` (full and `--prod`): no known vulnerabilities.
- **M6 — `scripts/frozen-readers.mjs`.** Its default list now runs #37–#49 (#45 `8778497`, #46 `98a29b4`, #47 `b0fe242`, #48 `261f32a`, #49 `f13abb0` added), and without `--out` it no longer drops its first SHA argument (the open item AG Polish 3 recorded).
- **M7 — Node 22's `createRequire` (the sandbox).** 76 of the unit files that fail here (`scripts/run10/*-runtime`, `scripts/run11/*`) load Miniflare through `createRequire(apps/web/node_modules/wrangler/package.json)`. Node 22 resolves from the symlinked path, where pnpm puts no `miniflare`; CI's Node 24 passes them. The same files fail on `main` here; nothing changed for them.

- **M8 — Part 2, how the intermittents were found.** A helper read every failed job of AG Polish 3's 13 failed Milestone quality runs (24–25 Oct; 58 jobs, logs whole) and catalogued each failure with its error; the reproducibility failures were read from run 39445348581's own artifacts. Each fix names its CI evidence in its commit. Not intermittents: the Checklist geometry failures, `path-engine`, `checklist-quick-add` and the staking guard's `Math.sign(` were AG Polish 3's work in progress, green on its final head. One-offs with no cause found (`hosted-verifier-order:16`, `page-marks:96`, WebKit's "internal error" / "Target crashed" in four ZIGi specs) are WebKit or runner instability; they stay under the one-re-run rule.
- **M9 — Reproducibility and the kernel (AF16).** The two canonical legs failed "environment disagreement" whenever they ran on different runner images, because the kernel (`osRelease`) comes with the image (run 39445348581: 7.0.0-1017-azure on 20261018.339.1 against 6.17.0-1022-azure on 20261012.334.1, identical Wasm). The image version was already per-build provenance; now a kernel difference passes only together with an image difference, and on the same image it still fails. Bytes, source, compiler, toolchain, flags and the other environment fields stay exact. A deliberate assertion change, TIER 3 (CI, release reproducibility), listed in STATUS.
- **M10 — Taps before hydration (TO13 family).** Specs that interact right after a load wait for `html[data-app-hydrated]` only where their subject is something else (J055: going offline); taps before hydration are fixed in the app in Part 11 (TO13) with their own spec.

## The "already fixed" checks (per part, amendment 2)
Filled at the start of each part.

## Closing table (every ID in the brief's index)
Filled part by part: per row, the finding IDs fixed, already fixed (evidence) or not possible (reason).

### Part 0 and 1
| ID | Outcome | Findings / evidence |
|---|---|---|
| RM8 | Done | Timezone phases 3–4 done before AH; QA2-04 fixed (`dd4dc885`); `@2x` renamed before AH (`37ca600`); Portfolio sync done before AH (`c043105`); full coin search present (ranking is WE1); passkey/Face ID: not possible here (needs the owner's iPhone, ADR-008 option 2) — M4 |
| M2 (picklist) | Done | The per-part "already fixed" checks (amendment 2) |
| Scope E | Done | 16 advisories cleared in 5 commits (M3, M5); `pnpm audit` full and prod clean |
| AF14 | Done | vite 8.3.3 (`a0a1fab4`) |

### Part 2
| ID | Outcome | Findings / evidence |
|---|---|---|
| Scope F: `execute.test.ts:116` | Fixed | `9b1dd80f`; reproduced under CPU stress (60 s timeout), passes in < 2 s under the same stress |
| Scope F: `domain-review-race:41` | Fixed | `ba33c973`; cause "invalid content-length header" in the DO probe; 20 probe files 77 passed |
| Scope F: `run9-2-product:30` | Fixed | Quick add's early tap (this part's last commit); 8 of 8 repeated |
| Scope F: `run10-source-pinning:69` | Fixed | `6966c04d`; the spec waits for the save; the app starts a waiting save on pagehide |
| Scope F: WebKit cancelled-request class | Fixed | `05173f41`; tests/webkit-cancelled.ts; the five fetch sites handle their rejections |
| Scope F: `layout-fixes-ae:24`, `session-x-findings:202`, `run10-motion:5`, `theme-parity-af` | Fixed | `6055f5ab` |
| Scope F: the deploy gate's unit tests | Fixed | The two deploy-blocking unit intermittents above; the deploy workflow unchanged |
| AF16 | Fixed | ZIGi box empty after a fill, zigi-memory's navigation stall, zigi-accept-correct in Tokyo (`ea7aaca9`); canonical reproducibility (`b1cdba48`, M9); WebKit cancelled fetches (`05173f41`) |
| AF7 | Fixed | TIER 3 (verifier): a request cut off by a navigation counts as aborted however late it is reported; the 503 answers were already named items |
| AF6 | Fixed | `75766fec`; #418 reproduced on the old build, gone on ten pages |
