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

## Owner amendment "Checklist header, phone title, counters" (2026-10-25, during Part 3; pre-approved)
Part 18, after Part 17 and before the final STATUS commit and CI round. **Owner exception to PROTECTED:** the Checklist's TOP BAR may change as below; the path, river, labels, banners and planets stay exactly as approved and their pin tests keep passing.
1. **Checklist top bar (phone and computer).** The "0 of 9 planets today" text goes (kept for screen readers only, visually hidden, with the same live update). In its place, next to X: the Path / List switch exactly as it looks in the ⋯ menu (same icons, labels, size, active one highlighted). "Edit path" and "Options" also go in the bar if they fit at 360 px with ≥ 44 px targets (icon buttons with accessible names are fine); whatever does not fit stays in ⋯, which keeps "How it works". The streak, + and ⋯ stay; nothing is listed twice. Computer: the same switch next to X; "Your orbit" stays; only the count goes (screen-reader-only).
2. **Phone top bar on every page:** the page-name text next to the logo goes (the selected bottom-bar button shows where you are); the name stays for screen readers and in the document title; the freed space keeps the Checklist pill and the other buttons from truncating.
3. **Health quick counters:** (a) −, the number and + in a fixed right-aligned group with a fixed-width tabular number column (4 digits), so every row's − lines up; (b) tapping the number makes it a numeric input (numeric keyboard on phones), prefilled and selected; Enter or blur saves, Escape cancels; validated by the shared plausibility limits (VA2) with an inline error; a labelled Undo after saving; saves to the Health journal's selected day (Part 17); accessible name such as "Push-ups count, edit". Tests at 360 and 390, Nebula/Light/Dark, reduced motion respected.

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

- **M11 — DS1 needs no stored revision stamp (amendment 3).** The "already fixed" check found every write path applying its change to the latest stored record under a lock (`usePrivateStore` → `updatePrivateStore`, device records, the legacy ledger), the Goal details form letting untouched fields follow the stored Goal (Session X J054), and habit edits carrying the habit's fingerprint (`checkChange`, "This Habit changed while you were editing"). A two-tab spec proves it (`tests/ah-multitab.spec.ts`). So no stamp was added and amendment 3's stored-format change did not arise. The Showcase is per tab by design and says so ("kept in this tab only"); a duplicated tab starts as a copy (M-142).
- **M12 — The old "Export Goal Data".** It holds local simulation Goal plans only; on a device without them it exported `{"goals":{}}` (BUG-036). It now shows only when there are such plans; "Export everything" is the one export otherwise. "Import Goal Data" stays (an older file may still need it). The hosted verifier's stage 4 creates a simulation Goal first, so it still finds the button.
- **M13 — A second weight of the day (DS7).** `weights` allows one reading per date in every build's schema (a second would make older builds refuse the Health record), so "Keep both" stores the second as a timed weight measurement, the record's existing kind for readings with a time (already in the weights CSV). No format change.
- **M14 — Back closes a dialog (DS9).** `useBackCloses` adds one history entry while a sheet, modal or Quick add is open, copying the page's own history state so the router sees the same page; closing it otherwise takes the entry back out, except when a link inside it was followed (that would undo the navigation; found by the hosted verifier's goal stage).
- **M15 — Undo after a Showcase reset (DS4) and Health removals (DS5).** The reset keeps the replaced generation in the tab's sessionStorage until the next load, reset or exit (about 290 KB). Removals are said once, in the app's one toast with "Undo" (the page's own status line no longer repeats them; three specs read the toast now).

- **M16 — One price service, one valuation, one net worth (TR1–TR3, TR5, TR8, TR13).** Every page asks the shared quote service, the Showcase too; the Showcase holds the quotes it loaded when it opened (`setFrozenPrices`: never stale, labelled "Showcase price"), so its values never drift per reload. One valuation rule (lib/wealth.ts, lib/positions.ts): a newer market quote replaces a stored snapshot that is not the person's own; a MANUAL value stays, with the market value beside it. One net worth (`netWorthTotal`) values holdings as Wealth does and names the ones without a value.
- **M17 — Quantities to 8 decimals in lists (TR4).** `formatQuantity` cuts to 8 decimals with "≈" and keeps the exact value in the title; prices round by size (`formatPrice`).
- **M18 — A part-logged habit day completes from Health (TR9/HA2, amendment 5).** H7 said a part-logged day meant "the person already acted"; TR9 reports exactly that as the bug (4 of 8 glasses with 2.2 L logged). The tick now sets the day to its target (never adds), Undo still keeps it off for the day and a full tap still wins (H7 spec updated). A new habit in steps, mL or meditation minutes starts with that link filled in. The Showcase keeps one linked habit: more would make viewing it write records.
- **M19 — No currency switch while nothing converts (TR7, amendment 6).** The headline, Allocated, Available and Today's ring lead with the currency that holds the largest total; others stay in their chip ("coming later"). Today's wallet card shows ZIG only (practice money and testnet ZIG have no market value). Stored choices (`baseCurrency`, the wallet `display`) are kept unread; wallet holdings and Add money still ask real quotes in the person's currency.
- **M20 — One count per thing (TR6/B5).** lib/numbers/counts.ts: a check-in is a scheduled habit day completed (once per habit); habits due today leave out a skipped (rest) day; active and finished Goals come from each Goal's derived status plus average goals (Today, the goals widget, Goals, the Hall, Journey); live-priced assets follow Wealth's rule (Markets' "Manual assets"); Journey and Stories say "assets tracked".
- **M21 — Calculator months (TR14), additive.** `months` (0–11) is an optional field after the whole years in the calculator's device record (`zigoals:calculator:v1`, loose; older builds ignore it). A plan stays at least one year so every saved scenario still reads in #37–#49. A rate from Earn is added once a year and the banner says so.
- **M22 — "Ahead" needs the target by its date (TR11).** Ahead of the plan's schedule is not ahead of the Goal: a shortfall or a later finish reads "Behind". The Showcase's Emergency fund (ahead of schedule, $5,000 short) now has a later date and a plan that reaches it, so the Showcase still shows every status honestly.

- **M23 — Limits on the writes, not the records (VA2–VA4).** lib/limits/plausibility.ts guards the write functions (Health, Habits, the Checklist, Portfolio, manual assets, accounts), so every entry point shares it and a record saved before keeps reading. Stored length limits stay per record (a goal name 80, a habit title 100): raising one would make older builds refuse the record, lowering one would make this build refuse old ones. Instead every limited field shows its count while focused. Day bounds at the write layer are 1990 on only; future days are refused by the page in its journal zone (a clock bound would refuse a backup from a device ahead).
- **M24 — Errors are sentences (VA1, C1, C2, C3).** `plainErrorMessage` turns a schema issue into a short sentence or the form's own fallback; 74 forms outside ZIGi use it. Where a page shows results far from the button (the Goal page), the result also shows in the app's one toast; a confirm takes the focus where it opens.
- **M25 — Time zones as typed (VA10, C8).** A typed zone is matched to the browser's own list whatever its case; a fixed offset is explained with places that have it today (no offset is stored: it has no daylight-saving rules).

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

### Part 3 — Data safety
| ID | Outcome | Findings / evidence |
|---|---|---|
| DS1 / A1 | Already fixed (evidence) | BUG-075, N-081: two-tab spec 6 of 6 (`bce3ac48`), M11. M-142: the Showcase is per tab by design, stated in its sheet |
| DS2 | Fixed | T-110, T-116, M-134 (`749e2d75`): the ten-minute rule, naps, the greeting by hour; adapter unit tests |
| DS3 / A6 | Fixed | BUG-021, BUG-053, L-009, L-010, B-062, D-022, L-062 (`749e2d75`; nap wording `3bc64a6d`): every overlap refused, new or edited; "last night is already logged" |
| DS4 / A4 | Fixed | BUG-061, D-087, B-081, M-141, D-031 (`9dab86af`): confirm in place, a secondary button, Undo once. D-031's "Undo next to Undo import" is HE9 (Part 6) |
| DS5 | Fixed | N-043, D-047, B-117, T-115, T-138, M-104, B-083, M-131, M-136, M-115, D-104 (`3bc64a6d`): Undo or confirm on every removal; already present on milestones (M-104), history reversal (a review sheet). M-115 (a streak freeze) is HA7 (Part 7). T-138 (a measurement) has no delete yet: HE6 (Part 6) adds it with Undo |
| A5 | Fixed (Remove) | BUG-032 (`3bc64a6d`): a transaction's Remove has Undo. Editing a transaction is WE2 (Part 9) |
| DS6 / A2 | Fixed | BUG-036, M-007, N-042, N-033, M-008 (`749e2d75`): Portfolio in the export, its CSV, README with row counts, the old export only with its plans (M12). M-008 ("Help says every record"): Help's words, SE1 (Part 12) |
| DS7 | Fixed | N-057 (`749e2d75`): "Keep both" (M13) |
| DS8 | Fixed | L-006, M-004, N-049 (`749e2d75`): hints beside the disabled Restore; the Showcase states up front what works on your own records |
| DS9 / A3 | Fixed | BUG-076/077, M-070, D-206, T-077 (`749e2d75`): Back closes dialogs first (M14); the wizard's draft survives a reload |
| A7 | Fixed | BUG-042 (`749e2d75`): `plainErrorMessage`; the rest of the raw messages are VA1 (Part 5) |
| J2 | Fixed (package) | The DS rows above |

### Part 4 — Numbers you can trust
| ID | Outcome | Findings / evidence |
|---|---|---|
| TR1 | Fixed | B-002, BUG-085, M-041, M-077, N-149, N-181, B-049 (`0dc8ae4d`, M16): BTC/ETH valued from live quotes in the one net worth; the unvalued holdings are named. ZIGi reads the same modules later (lane rule) |
| TR2 | Fixed | B-004, B-015, B-050, B-153, D-001, D-095, D-243, L-030, L-047, L-012, N-054, N-122, N-194, N-026, T-024, T-038, T-092, T-117, M-051, D-200, N-055, B-041, D-262 (`0dc8ae4d`): "Current" only within 15 minutes; the Showcase holds its loaded quotes ("Showcase price"), so nothing drifts per reload |
| TR3 / B1 | Fixed | BUG-006, BUG-059, N-008, T-091, B-042, D-155, D-245 (`0dc8ae4d`, `05037e8b`): Portfolio reads the same quotes as every page |
| TR4 / B2 | Fixed | BUG-007, BUG-028, B-013, B-039, M-010, M-086, T-090, D-147, D-053, N-025, N-193, D-215, D-195 (`0dc8ae4d`, M17) |
| TR5 / B7 | Fixed | B-008, B-007, N-196, BUG-074 (`0dc8ae4d`): your value and the market value side by side |
| TR6 / B5 | Fixed | BUG-031, BUG-041, BUG-062, BUG-044, B-009, B-098, B-116, M-085, D-238, D-239, D-246, M-081, M-083, N-091, B-097, M-055, B-012 (`1e8946ad`, M20); tests/ah-numbers.spec.ts checks five pages agree |
| TR7 | Fixed (hidden, amendment 6) | N-030, B-040, D-214, L-085, B-034, B-150, D-057, D-201, L-078, M-121 (`9e865423`, M19) |
| TR8 | Fixed | B-110, B-111, B-154, M-079, B-103, L-029 (`0dc8ae4d`): one valuation rule for the ZIG reserve on every page |
| TR9 / B8 / HA2 | Fixed | N-168, N-202, N-036, N-077, N-169, N-015, N-086, B-163, D-220, N-056, B-147, B-191, T-087, L-021, M-037, D-106, B-079, M-038, BUG-043 (`7abfbfda`, M18): part-logged days complete from Health once; "over target" on the rings |
| TR10 | Fixed | B-011, N-058, N-120, L-070, M-039, D-142, L-081, B-073, B-194 (`1b5d218a`): one weekly rate (least squares, 28 days), one decimal in kg and lb, the latest reading beside the trend |
| TR11 | Fixed | B-006, B-014, B-113, B-137, B-183, B-184, B-200, M-056, D-235, B-114, M-082, L-040, M-080 (`cdb6f967`, M22); status derives from saved allocations (lib/goal-summary.ts), and the counts read it (TR6); a reversal says why progress stays |
| TR12 / B6 | Fixed | B-058, N-037, N-011, N-073, D-084, D-156, D-227, T-086, D-234, B-038, M-049, B-092, BUG-004, BUG-073, BUG-040 (`6dc444a0`): "Target reached" only on a crossing; rows under their own day; "4 milestones", not "4 ZIG"; Showcase labels only on examples |
| TR13 | Fixed | M-078, M-084, M-027 (`0dc8ae4d`, `1e8946ad`): Life review values with live quotes through the one net worth; the counts agree |
| TR14 | Fixed | B-010, B-021, N-029, L-057, B-099, B-123, B-156, B-045, B-056, B-043, B-044, L-058, B-130, B-131, B-129, B-155, B-046 (`521dba16`, M21): every assumption beside the result, months, no figure while a field is wrong, the exact target and plan into a goal, the scenario count shown |
| B3, B9 | Part 5 | Limits and the water cap are VA2/VA3 (one limits module) |
| B4 | Fixed | BUG-063, BUG-085 (`0dc8ae4d`): Today and Wealth read one net worth |
| J1 | Fixed (package) | The TR and B rows above |

### Part 5 — Forms, errors and limits
| ID | Outcome | Findings / evidence |
|---|---|---|
| VA1 / C1 | Fixed | BUG-003, BUG-009, BUG-020, BUG-026, BUG-084, L-023, L-035, L-041, L-044, L-050, L-076, L-079, M-123, T-093, T-121, N-135, N-142, N-151, N-155, D-022, D-024, D-034, D-048, D-071, D-101, D-118, D-199 (`cd216935`, M24): no validation JSON anywhere; the forms with field errors (Habits, assets, accounts, Health's highlighted fields) mark and focus the field |
| VA2 / B3 | Fixed | L-001, L-045, L-082, L-053, L-067, BUG-001, BUG-011, BUG-022, BUG-027, BUG-078, BUG-079, BUG-083, B-018, B-019, B-020, B-036, B-088, B-141, B-159, B-160, B-173, B-182, B-195, B-199, N-053, N-059, N-117, N-133, N-143, N-157, T-060, T-081, T-089, T-119, T-133, T-137, D-077, D-081, D-088, D-089, D-102, M-016, M-053, M-129, B-165 (`cd216935`, `24da254e`, M23). Micronutrients and ZIGi's Quick add parse go through the same Health writes |
| VA3 / B9 | Fixed | L-034, L-082, BUG-083, B-019, B-146, T-112, L-033 (`cd216935`): one water limit after fl oz, per entry and per day, the Checklist's range included |
| VA4 | Fixed (counter) | D-043, D-202, D-207, B-138, N-052, T-062, T-064, T-078, T-123, M-011, D-054, B-157, B-149 (`24da254e`, M23) |
| VA5 | Fixed | D-041, D-140, D-141, D-143, D-172, D-173, D-190, L-014, M-014, M-109, M-101, L-076, L-028, D-074 (`cd216935`): an empty required field says "This can't be empty." in the form's own message |
| VA6 | Fixed | D-034, D-035, D-088, D-105, L-044, N-024, D-052, T-071, D-144 (`cd216935`, M24) |
| VA7 | Fixed | B-170, D-219, M-107, M-111, N-129, N-179, T-072, T-101, B-059, D-046 (`24da254e`); the toast already replaces, never stacks |
| VA8 | Fixed | B-057, B-185, L-068, L-075, M-060, M-098, B-201, L-086, L-054 (`24da254e`). Numbers follow the display locale while dates are English by design (AD's one date format) |
| VA9 / C2 | Fixed | B-064, L-052, M-102, L-038, D-048, T-065, T-080, BUG-020 (`24da254e`) |
| VA10 / C8 | Fixed | B-067, B-069, B-068, B-175, B-176, N-131, BUG-035 (`24da254e`, M25) |
| C3 | Fixed | BUG-084 (`24da254e`): the range and unit in the message; Health shows the reason |

