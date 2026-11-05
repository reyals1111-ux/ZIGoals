# ADR-037 — Session AL: "FIX EVERYTHING"

- **Status:** in progress (branch `feature/session-al-fix-everything`; not merged, not deployed)
- **Base:** `main` `17069c7d` (Merge #99, Session AK), live as Alpha #53
- **Scope sources:** the owner's brief for Session AL (Parts 0–17, the fix-proof rules R1–R9, the non-negotiables), `review/session-al-scope:owner-scope/AL_SCOPE.md` (O1–O7, B, C, D1–D13, E, F, G), the Grok report on #53 (`owner-scope/grok-2026-11-04/`), AH_SCOPE and AI_SCOPE. The scope branches are read-only and never merged.

## Why this session exists
Bots re-tested #53 after Sessions AH–AK. In their conditions, many rows those sessions had closed as Fixed were still open: the width, the theme, an empty profile vs the Showcase, the time of day, and the production build. Across the report "STILL OPEN" appears 962 times against 322 "FIXED". AL closes every row the way a person experiences it, and proves each fix the same way (R1–R9).

## Owner decisions (4 Nov 2026, final; AL_SCOPE A)
- **O1 Fix everything.** Every non-POSITIVE finding is in scope. A finding that conflicts with a standing decision (AL_SCOPE F) closes as "Owner decision"; any honest part of it is still fixed.
- **O2 Placeholder pricing, one-time.**
  - Prices: ZIGoals €20, ZIGoals Premium €50.
  - Every surface says "Placeholder prices · nothing is charged during the Alpha · prices may change".
  - Surfaces: `/app/plans`, a Settings "Plan" row ("Alpha: everything free"), the Premium badge links to Plans, Help and What's new.
  - No payment code, checkout, buy button, server or account. € only. Not on the landing.
- **O3 Launchers.**
  - At ≥ 901 px the floating, edge-foldable ZIGi, Earn dock, Music and Checklist launchers stay.
  - Below 901 px nothing floats. One "Apps & extras" button (phone top bar, tablet rail) opens a sheet with ZIGi, NOVA, Checklist, Tasks, Notes, Journal, Agenda, Earn and Music, each shown only when switched on.
  - The phone top bar's Checklist pill stays. The sheet works on every page, Settings included.
- **O4 Desktop sidebar.**
  - A compact, foldable "Apps" group below the main pages with NOVA, Tasks, Notes, Journal and Agenda (those switched on). The fold state is device-only, and the group is keyboard accessible.
  - The main pages, fold marks, sky and layout stay unchanged.
  - Journey, Life review, Stories and the ZIGi states stay out.
- **O5 NOVA HUD motion exception.**
  - Ambient motion while NOVA is visible. Calm means slower and fewer effects.
  - Motion Off and reduced motion mean fully still.
  - Motion pauses when the page is hidden or off-screen. No pointer tracking.
- **O6 Tasks.**
  - Tasks becomes Todoist/TickTick level (AL_SCOPE C).
  - The Checklist keeps its protected daily orbit. Its List view may gain a "Tasks due today" section.
  - The naming is clarified in copy only.
- **O7 Usage.** The biggest session ever: use the weekly usage fully and never cut scope.
- **Standing decisions that still hold:** AL_SCOPE F (quoted in the brief and AL_SCOPE).

## Owner amendments to the plan (A1–A12, verbatim intent)
- **A1, replays per pillar.**
  - After each pillar lane (L1–L8) says it's done, a fresh replay agent replays that lane's ledger rows on the production build, into `GROK53_REPLAY_<lane>_<n>.md`.
  - STILL OPEN goes straight back to the lane.
  - Then come the two full rounds. A lane's task is ticked only when its own replay shows zero STILL OPEN, apart from Owner decision, Not possible and Waits on owner.
- **A2, a root-cause taxonomy before the ledger** ([`ROOT_CAUSE_KEYS.md`](../review/session-al/ROOT_CAUSE_KEYS.md)).
  - Every ledger helper tags with the same keys and proposes its bot's rows.
  - The integrator merges from the per-bot files and the keys, never by holding every line at once.
- **A3, L10 split** into L10a (shell, launchers, sidebar, chrome, widths, themes, `/app/plans`) and L10b (field-error, limits, Undo/toast, format layer). L10b takes L9's slot when it frees up. At most 10 helpers at once.
- **A4, no idle pillar lanes.**
  - While the primitives are being built, the lanes write failing reproduction specs and make the fixes that don't depend on primitives.
  - They adopt the primitives in a second pass. Primitives land first, as small, stable APIs.
- **A5, the copy audit goes to the owning lanes.** L4 writes a per-file list in `COPY_AUDIT.md`. Each lane applies the fixes in its own files, and the integrator applies only those in shared files.
- **A6, bot conditions as code.**
  - Time-of-day conditions use Playwright's clock API or a fixed time zone, never the real clock.
  - Fresh-profile findings are proven in a fresh empty profile, and also in the Showcase where that applies.
- **A7, the Undo/toast refactor.**
  - Surfaces move lane by lane.
  - The Checklist's protected Undo pins stay unchanged.
  - Every move has a test that checks the store record is restored.
- **A8, the whole verifier import graph.**
  - Erasable syntax only, with `erasableSyntaxOnly` where needed.
  - Proven with plain Node 24.19.0 and with CI's Node.
- **A9, a true task list at every push.** AL_RESUME.md carries live counts: ledger rows, Fixed, Reopened, and STILL OPEN per lane.
- **A10, no early finish.**
  - When everything is closed and usage remains, run cycles: a fresh exploratory round plus a fresh mini release review of the most-used flows, fixing everything found with tests.
  - Repeat until a full cycle finds no Major or Minor, then do Part 17.
  - Never close a row as "out of time".
- **A11, Part 15.** Each competitor or roadmap item gets its own R9 row. Web-possible items that don't conflict with AL_SCOPE F are built, and rank decides only the order.
- **A12, HUD proof.**
  - A two-way interconnection spec covering the HUD, the page and another tab.
  - Idle CPU and 60 fps at CPU 4× in Full motion, recorded.
  - Reduced motion and Motion Off proven fully still.
  - The first-time-viewer review also covers a phone width.

## Readings (taken without asking; the owner pre-accepted Q1–Q5)
- **Q1, branch.** The brief names `feature/session-al-fix-everything`, while the cloud session was handed `claude/upbeat-franklin-wzyrfb`. The brief's branch is used. The git proxy accepted the push on 4 Nov, so no fallback was needed.
- **Q2, test folder.** The repo has no top-level `tests/`, so the reproduction and guard specs live in `apps/web/tests/grok53/<pillar>/`. That folder is inside Playwright's `testDir`, so CI runs it as part of the browser suite.
- **Q3, Node.** The sandbox shipped Node 22. Node 24.19.0, the project's pin, is installed outside the repository (`/opt/node24`). Nothing is committed for it.
- **Q4, ledger files.** `GROK53_LEDGER.md` holds the AL rows, the counts and the keep-list. `ledger/<bot>.md` holds one line per finding id.
- **Q5, Premium label.** "Premium · free during Alpha" is aligned to "Premium · free during the Alpha" (O2), and the badge links to `/app/plans`.
- **Q6, ZIGi on Settings (O3 vs the sensitive-screen rule).** O3 says the Apps & extras sheet, ZIGi included, works on every page, Settings too. Before this, ZIGi stayed off on all of Settings because the page holds a sign-in email field. ZIGi now opens on Settings. The sensitive rule applies only while a sensitive field (email, PIN, password, key, seed or recovery) has focus, or a sensitive section is open. During that time ZIGi reads nothing from the screen and says why.
- **Q7, old ids without new evidence.** 238 old ids that the bots marked NOT RETESTED or out of their area have no 4 Nov evidence. They are not AL defect rows. They are replay-checked with the AH/AI scope rows in Part 14, and whatever fails there becomes a row.
- **Q8, ZIGi's knock and moods below 901 px.** Nothing floats below 901 px (O3), so ZIGi's reminder knock and its closed-panel moods don't show there and nothing is counted for them. Its states still show in the open panel's own figure.
- **Q9, "Hide ZIGi" below 901 px.** The launcher's device hide only applies where a launcher floats. Below 901 px, ZIGi is switched off through Settings → Your pages & buttons. "Ask ZIGi" stays offered until that switch is off.
- **Q10, the goal wizard's "Create goal" before step 4 (P-LS-64).** It stays enabled. Session AK FR-1 made step 1's Create goal deliberate, and a grey button with no reason was itself a finding (MO-108). Missing information now gets a field error at its field instead: an empty Quantity unit says "Name what you count, for example books or BTC.".
- **Q11, ⌘/Ctrl+K (LS-H36).** Lisbon expected ⌘/Ctrl+K to open a command menu, as in Todoist and TickTick; since Session W it opened ZIGi. ⌘/Ctrl+K now opens a command menu whose first row is "Ask ZIGi" (Enter with nothing typed opens ZIGi; typed words go to ZIGi's composer), so ZIGi stays one key and Enter away. ZIGi's own key is ⌘/Ctrl+Shift+Z outside a text field (Redo in a field stays Redo). NOVA keeps ⌘K for its own field. The specs that pinned ⌘K to ZIGi (search-aa, your-ai) change deliberately, naming Q11.
- **Q12, the Goals header at wide widths (DV-204).** From 1400 px, on the Goals page only, the header's primary action sits under the lede instead of at the far right, so the button follows its intro. Other pillars keep their header.
- **Q13, widening a stored bound.** Raising a schema's upper bound (the synced watchlist's 8, a fast's 36 h) would make older builds reject the whole record, which the additive-only rule forbids. Where the need is real it is built additively (Markets favourites beyond eight in `zigoals:markets-watchlist-more:v1`); fasts beyond 36 h close as Not possible (the session schema is strict and about 25 readers use `targetHours` directly).
- **Q14, ZIGi's page switches on the device.** Settings says "these switches decide which pages those answers may read", with or without an AI. So a "page data" switch the person turned off closes that area for ZIGi's and NOVA's on-device answers too, Wealth included (L7-4b had kept Wealth open because lib/nova/zf-security.test.ts Z1A-9 pinned the device brief's money line; the pin now asserts the stricter behaviour). NOVA's two probes per local server stay (EX3-3 pins the order for a reason the earlier session recorded). Money amounts in ZIGi's answers move to the app's format layer when the pin conflict is resolved in the money-format pass.
- **Q15, theme parity classes (CI 1539).** The theme-parity runner (tests/parity/classify.ts) records two deliberate Light-only differences as their own classes, each tied to a finding, instead of failing them as drift: `button-edge` (an enabled secondary button's edge is #717d94 by day, TK-6B-09) and `day-ink` (a gradient word drawn as one solid ink at ≥ 4.5:1 on white, TK-164; a chart or legend paint a deeper shade of the same hue within 12° at ≥ 3:1, TK-057, P-MO-34). They extend ADR-028 H75/H130; every other Light/Dark/Nebula difference still fails. Dark's grey selected nav item in Tasks (P-LS-61) is not covered: it waits for the Tasks lane to follow H75.

## The ledger (R1), in numbers
- **In:** 4,033 item lines from the eight bot files:
  - 1,571 new-finding lines;
  - 1,414 old-id re-checks;
  - 537 ZIGi/NOVA prompt rows;
  - 349 competitor items;
  - 162 copy notes;
  - plus 257 keep-list rows.
  - That is 3,654 distinct ids.
- **Out:** 642 AL rows.
  - 163 merge rows across bots. The launcher overlap spans 8 bots, the safety guard 8, and "questions become write previews" 7.
  - 178 competitor rows, one per item (A11).
- **Reconciliation:** 3,654 ids = 2,798 mapped to an AL row + 613 keep-only + 243 not reproducible in the bots' own words:
  - 238 old ids the bots marked NOT RETESTED or out of their area, with no 4 Nov evidence; these are replay-checked in Part 14;
  - five non-defects, each with its reason.
- **Rows per lane:** L1 91, L2 96, L3 91, L4 69, L5 67, L6 87, L7 80, L8 2 (plus AL_SCOPE B), L9 5, L10a 23, L10b 19, the integrator 12.
- **Files:** [`GROK53_LEDGER.md`](../review/session-al/GROK53_LEDGER.md) and the per-bot files in `docs/review/session-al/ledger/`.

## Lessons (R2: why earlier closes were wrong)
The bots' run reopened **150 AL rows** (226 proposed rows) that earlier sessions had closed. Each one, with the earlier row and the reason, is in [`HISTORY_MAP.md`](../review/session-al/HISTORY_MAP.md).

| Why the earlier close was wrong | AL rows |
|---|---|
| One entry point fixed, not the others | 76 |
| Never wired into the UI | 19 |
| Dev build, mocks or unit-only tests | 11 |
| Showcase-only test | 9 |
| Wrong width | 8 |
| Regression | 2 |
| Other (the logic was still wrong, or no reason was recorded) | 25 |

1. **Fix the shared source, then check every door into it.** Half of the reopened rows (one entry point only) were fixed in one place: the date rule in the wizard but not Edit, the ISO list for accounts but not the asset editor, Refresh feedback on Wealth but not Markets, the answer-only rule on the model path but not the on-device fallback. Before closing a row, list every entry point that reaches the shared source and test each one.
2. **Test the outcome the user sees, not a stand-in.** Rows were closed because the toast appeared (but Undo left the water log), because mocks accepted a tool schema real Ollama rejects, because unit tests passed for the exact phrasings in the spec. A closing test checks the stored record, the real local server and phrasing variants (typos, lowercase, Dutch, follow-ups).
3. **Showcase data is not a fresh profile.** Counts, labels and setup checks passed on Showcase data and fail on an empty or real profile (completed-then-closed goals, NOVA setup planets, "Showcase example" labels). Every closing test also runs on a fresh empty profile.
4. **Test at the widths and window heights people use.** Launcher overlap and phone chrome were closed at 390 px headless or at the page end; the bots saw them at 375 (DevTools), ~388 (zoom), 480–610, 768 and in windows under 1,380 px tall, mid-scroll. Use the fixed width list in a real browser and scroll through the page.
5. **"Built" means reachable from the UI.** Helpers existed but were never called where it mattered (amountMax only on assets, careful mode never consulted by the device fallback or NOVA, a rule editor beside an older field that no longer works). A row is closed only when a search shows every caller uses the helper and a UI test reaches it.
6. **AI fixes need phrasing families and both assistants.** ZIGi/NOVA rows reopened most (33 in L7): fixes covered named questions in one assistant. The eval set holds each intent in several phrasings, in English and Dutch, for the ZIGi panel and NOVA, with and without a model.
7. **Guard what already works.** New work broke earlier fixes (the Checklist launcher re-created the overlap; a parser change made "meditated" unreadable). Keep-list items become specs before the next feature lands near them.
8. **"Not reproduced" is not "fixed".** Rows closed as not reproduced came back under the bot's conditions (before 07:00 local, fresh profile, short windows). Reproduce with the reporter's time, profile and width before closing.

9. **Locale is one of the bot's conditions.** Setup's draft survived a reload in en-US (the spec's locale) and was lost in en-GB: outside en-US the shell remounts the page once in the hydration commit, and the first instance's effect wrote the empty state over the draft (NB-011, found by the L3 replay, fixed in the L3 fourth pass). Specs for anything that is saved or restored now run in en-GB and en-US.
10. **A test helper that retries hides the bug.** The goal creator lost the first key typed on an idle page (a capture-phase input handler re-rendered before onChange). The shared `tests/goal-name.ts` retried the fill until it stuck, so every spec passed for three sessions (BN-153/188). New specs type once, with `pressSequentially`, and never retry a person's action.
11. **A lane's own green specs are not the replay.** In round 1 the lanes' specs passed (health 31/31, L3 39/39) while fresh replays through the screens found 29–45 STILL OPEN per lane: specs that seed storage directly, run in one locale, or skip the scroll a person does. Replays drive the screens, and a lane is ticked only on its replay (A1).
12. **Measure performance after design changes, alone.** The HUD design pass made the motes redraw the window-sized sky under every glass panel (49.9 ms at CPU 4x, alone, against 16.7 ms before). Perf specs run after every HUD change, on a quiet machine, before the change is called done.
13. **Spec measurements must model the browser.** The page-transition spec summed `<html>`'s whole document height for the root picture, which the browser captures at window size; 20 failures were the spec's, not the app's. Before changing an app to satisfy a measuring spec, check what the spec measures.

14. **Run the whole existing suite, not only the new specs.** The integrator proved lanes with tests/grok53 on the production build and the unit suite, and CI run 1539 (ecb00e50) then failed 389 older browser tests: deliberate changes (the ⌘K move, the Health field check, the Showcase in litres, Earn's folds, regenerated theme sheets) that older specs still pinned, plus real regressions they caught (the Fund dialog's Cash button). From here a lane is not done until the older specs that touch its pages pass on the production build too.

## Owner cost rules (5 Nov)
The owner's two messages of 5 Nov (pre-approved; nothing cut, these set the order and the cost for the rest of the session, also after the weekly reset):
1. Until the full CI on the branch head is green, at most 4 helpers at once; for the rest of the session at most 5 (never 10).
2. Order this week: finish the CI fix lanes (CI1–CI5) and get CI green (one re-run per known intermittent); then fill this ADR's closing table for every AL row with a final replay result, and keep it filled; then replay round 2 for L2–L8 in the order L7, L3, L2, L5, L4, L6, L8.
3. Replay and audit agents read only their lane's AL rows in GROK53_LEDGER.md and, per finding id, only that finding's steps in the bot file (search by id); never a whole bot file or FINAL-REPORT.md again.
4. Replays: round 2 for L2–L8, then ONE final full round on the final head; no extra per-pillar round unless a lane's round 2 shows more than 10 STILL OPEN.
5. A10: one cycle only, then Part 17.
6. One production build per integration point, shared by every helper; never one build per helper.
7. Before the weekly limit: everything committed and pushed, AL_RESUME.md current, the task list true; a lane paused mid-way commits its finished files and records the unfinished ones in AL_RESUME.md, never a half-finished fix.

## Closing table (R9)
Outcomes: Fixed (commit, test, replay FIXED) · Already fixed (replay FIXED on main before any change, with the evidence) · Owner decision (named) · Not possible (evidence) · Waits on owner (the named step).

Each AL row's outcome comes from the latest replay of its lane (the replay files' verdict per finding id, rows matched through the ledger's "finding ids" column): **Fixed** when every id replayed FIXED or HOLDS; an owner decision, Not possible or Waits on owner only where the replay agreed with the named reason; **Open** while any id is STILL OPEN or CHANGED (after round 1 those were answered by the lanes' fourth passes and wait for round 2); **Partly replayed** where some ids are not in a replay yet (other lane, not replayed, out of area). Commits and tests per row are in the lane's status file (docs/review/session-al/lanes/<lane>.md, the "Fourth pass" sections). The table is regenerated after every replay round.

State on 5 Nov (replays: L1 round 2 on 54e32039; L2–L7 round 1 on c521574f; L8 by the two HUD reviews and grok53/hud):
- Fixed: 272
- Open — fix committed, awaiting replay round 2: 165
- Partly replayed: 128
- Not replayed yet: 28
- Owner decision: 20
- Open: 11
- Not possible: 11
- Fixed + Owner decision: 5
- Waits on owner: 2

| Row | Lane | Ids | Outcome | Replay | Verdicts of its ids | Commits and tests |
|---|---|---|---|---|---|---|
| AL-COUNTS-001 | L1 | 15 | Open | L1 r2 | Changed 1 Fixed 12 Not Replayed 1 · not in replay 1 | lanes/L1.md |
| AL-CURRENCY-001 | L1 | 13 | Open | L1 r2 | Fixed 7 Holds 1 Owner Decision 3 Still Open 1 · not in replay 1 | lanes/L1.md |
| AL-CURRENCY-002 | L1 | 9 | Partly replayed | L1 r2 | Fixed 4 Not Replayed 5 | lanes/L1.md |
| AL-DECIMAL-INPUT-001 | L1 | 5 | Partly replayed | L1 r2 | Fixed 4 Not Replayed 1 | lanes/L1.md |
| AL-IMPORT-EXPORT-001 | L1 | 14 | Partly replayed | L1 r2 | Fixed 13 · not in replay 1 | lanes/L1.md |
| AL-LIMITS-001 | L1 | 4 | Open | L1 r2 | Changed 1 Fixed 3 | lanes/L1.md |
| AL-NUMBERS-SOURCE-001 | L1 | 27 | Open | L1 r2 | Fixed 18 Not Replayed 8 Still Open 1 | lanes/L1.md |
| AL-NUMBERS-SOURCE-002 | L1 | 8 | Fixed | L1 r2 | Fixed 7 Holds 1 | lanes/L1.md |
| AL-NUMBERS-SOURCE-003 | L1 | 7 | Fixed | L1 r2 | Fixed 7 | lanes/L1.md |
| AL-NUMBERS-SOURCE-004 | L1 | 12 | Partly replayed | L1 r2 | Fixed 11 · not in replay 1 | lanes/L1.md |
| AL-ROUNDING-001 | L1 | 17 | Partly replayed | L1 r2 | Fixed 15 Not Replayed 1 · not in replay 1 | lanes/L1.md |
| AL-COPY-001 | L1 | 3 | Partly replayed | L1 r2 | Fixed 1 Not Replayed 2 | lanes/L1.md |
| AL-COPY-002 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-COUNTS-002 | L1 | 7 | Open | L1 r2 | Changed 2 Fixed 4 Still Open 1 | lanes/L1.md |
| AL-IMPORT-EXPORT-002 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-LAYOUT-DESKTOP-001 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-TOAST-001 | L1 | 5 | Fixed | L1 r2 | Fixed 5 | lanes/L1.md |
| AL-A11Y-001 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-A11Y-002 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-ALLOCATION-001 | L1 | 2 | Partly replayed | L1 r2 | Not Replayed 1 · not in replay 1 | lanes/L1.md |
| AL-CONFIRM-DELETE-001 | L1 | 4 | Fixed | L1 r2 | Fixed 4 | lanes/L1.md |
| AL-COPY-003 | L1 | 5 | Open | L1 r2 | Changed 1 Fixed 4 | lanes/L1.md |
| AL-COPY-004 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COPY-005 | L1 | 4 | Fixed | L1 r2 | Fixed 4 | lanes/L1.md |
| AL-COPY-006 | L1 | 3 | Partly replayed | L1 r2 | Fixed 2 · not in replay 1 | lanes/L1.md |
| AL-COPY-007 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-FIELD-ERROR-001 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-FIELD-ERROR-002 | L1 | 2 | Open | L1 r2 | Changed 1 Fixed 1 | lanes/L1.md |
| AL-LAYOUT-375-001 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-LAYOUT-DESKTOP-002 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-LAYOUT-DESKTOP-003 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-LAYOUT-DESKTOP-004 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-MOTION-001 | L1 | 4 | Partly replayed | L1 r2 | Not Replayed 4 | lanes/L1.md |
| AL-NAV-001 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-TOAST-002 | L1 | 4 | Partly replayed | L1 r2 | Fixed 3 · not in replay 1 | lanes/L1.md |
| AL-UNITS-001 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COPY-008 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COPY-009 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COPY-010 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-CURRENCY-003 | L1 | 4 | Owner decision | L1 r2 | Owner Decision 4 | lanes/L1.md |
| AL-LAYOUT-768-001 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-LAYOUT-DESKTOP-005 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-PERF-001 | L1 | 5 | Partly replayed | L1 r2 | Fixed 4 Not Replayed 1 | lanes/L1.md |
| AL-SEARCH-001 | L1 | 7 | Partly replayed | L1 r2 | Fixed 5 Holds 1 · not in replay 1 | lanes/L1.md |
| AL-COPY-011 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-PERSISTENCE-001 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-TOAST-003 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-TOAST-004 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-001 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-002 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-003 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-004 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-005 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-006 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-007 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-008 | L1 | 1 | Partly replayed | L1 r2 | Not Replayed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-009 | L1 | 5 | Fixed | L1 r2 | Fixed 5 | lanes/L1.md |
| AL-COMPETITOR-GAP-010 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-COMPETITOR-GAP-011 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-012 | L1 | 3 | Not possible | L1 r2 | Not Possible 3 | lanes/L1.md |
| AL-COMPETITOR-GAP-013 | L1 | 1 | Partly replayed | L1 r2 | Reason Cited 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-014 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-015 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-016 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-017 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-018 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-019 | L1 | 1 | Partly replayed | L1 r2 | Reason Cited 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-020 | L1 | 2 | Owner decision | L1 r2 | Owner Decision 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-021 | L1 | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-022 | L1 | 4 | Not possible | L1 r2 | Not Possible 4 | lanes/L1.md |
| AL-COMPETITOR-GAP-023 | L1 | 1 | Partly replayed | L1 r2 | Not Replayed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-024 | L1 | 1 | Not possible | L1 r2 | Not Possible 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-025 | L1 | 1 | Partly replayed | L1 r2 | Reason Cited 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-026 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-027 | L1 | 2 | Owner decision | L1 r2 | Owner Decision 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-028 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-029 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-030 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-031 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-032 | L1 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-033 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-034 | L1 | 1 | Not possible | L1 r2 | Not Possible 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-035 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-036 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-037 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-038 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-039 | L1 | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L1.md |
| AL-COMPETITOR-GAP-040 | L1 | 2 | Partly replayed | L1 r2 | Reason Cited 2 | lanes/L1.md |
| AL-COMPETITOR-GAP-041 | L1 | 1 | Partly replayed | L1 r2 | Reason Cited 1 | lanes/L1.md |
| AL-CONFIRM-DELETE-002 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-COPY-012 | L1 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L1.md |
| AL-CRASH-001 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-CROSS-PAGE-SYNC-001 | L2 | 12 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Fixed 3 Other 1 Out Of Scope 2 Still Open 6 | lanes/L2.md |
| AL-DATES-001 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-DATES-002 | L2 | 4 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 3 | lanes/L2.md |
| AL-FIELD-ERROR-003 | L2 | 36 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 12 Fixed 11 Not Replayed 2 Out Of Scope 5 Still Open 6 | lanes/L2.md |
| AL-FIELD-ERROR-004 | L2 | 5 | Partly replayed | L2 r1 | Not Replayed 5 | lanes/L2.md |
| AL-LIMITS-002 | L2 | 16 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 8 Fixed 6 Out Of Scope 1 Still Open 1 | lanes/L2.md |
| AL-NAV-002 | L2 | 6 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 5 | lanes/L2.md |
| AL-TIMEZONE-001 | L2 | 11 | Fixed | L2 r1 | Fixed 11 | lanes/L2.md |
| AL-UNITS-002 | L2 | 7 | Open — fix committed, awaiting replay round 2 | L2 r1 | Fixed 6 Still Open 1 | lanes/L2.md |
| AL-A11Y-003 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-A11Y-004 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 1 | lanes/L2.md |
| AL-A11Y-005 | L2 | 3 | Fixed | L2 r1 | Fixed 3 | lanes/L2.md |
| AL-A11Y-006 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-042 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 | lanes/L2.md |
| AL-COPY-013 | L2 | 4 | Open — fix committed, awaiting replay round 2 | L2 r1 | Fixed 3 Still Open 1 | lanes/L2.md |
| AL-COPY-014 | L2 | 8 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Fixed 4 Out Of Scope 2 Still Open 2 | lanes/L2.md |
| AL-COPY-015 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-016 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-017 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-018 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-019 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 1 | lanes/L2.md |
| AL-COUNTS-003 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-CROSS-PAGE-SYNC-002 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Still Open 1 | lanes/L2.md |
| AL-DATES-003 | L2 | 4 | Partly replayed | L2 r1 | Fixed 3 Out Of Scope 1 | lanes/L2.md |
| AL-FIELD-ERROR-005 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-HEALTH-SAFETY-001 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-IMPORT-EXPORT-003 | L2 | 4 | Fixed | L2 r1 | Fixed 4 | lanes/L2.md |
| AL-LAYOUT-375-002 | L2 | 4 | Fixed | L2 r1 | Fixed 4 | lanes/L2.md |
| AL-LAYOUT-375-003 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-LIMITS-003 | L2 | 12 | Open — fix committed, awaiting replay round 2 | L2 r1 | Fixed 8 Not Replayed 1 Reason Cited 1 Still Open 2 | lanes/L2.md |
| AL-NUMBERS-SOURCE-005 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Still Open 2 | lanes/L2.md |
| AL-NUMBERS-SOURCE-006 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Still Open 1 | lanes/L2.md |
| AL-PERF-002 | L2 | 3 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 1 Out Of Scope 1 | lanes/L2.md |
| AL-SEARCH-002 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Still Open 1 | lanes/L2.md |
| AL-UNDO-001 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-A11Y-007 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-A11Y-008 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Still Open 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-043 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-CONFIRM-DELETE-003 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-020 | L2 | 3 | Fixed | L2 r1 | Fixed 3 | lanes/L2.md |
| AL-COPY-021 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COPY-022 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Reason Cited 1 Still Open 1 | lanes/L2.md |
| AL-COPY-023 | L2 | 4 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 3 | lanes/L2.md |
| AL-COPY-024 | L2 | 2 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 1 | lanes/L2.md |
| AL-FIELD-ERROR-006 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-IMPORT-EXPORT-004 | L2 | 4 | Fixed | L2 r1 | Fixed 4 | lanes/L2.md |
| AL-LAYOUT-375-004 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-LAYOUT-375-005 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-LAYOUT-DESKTOP-006 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 | lanes/L2.md |
| AL-ROUNDING-002 | L2 | 7 | Open — fix committed, awaiting replay round 2 | L2 r1 | Fixed 3 Not Replayed 1 Still Open 3 | lanes/L2.md |
| AL-TOAST-005 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-A11Y-009 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-LAYOUT-375-006 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-FEATURE-GAP-001 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 | lanes/L2.md |
| AL-FIRST-RUN-001 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-PERSISTENCE-002 | L2 | 1 | Not replayed yet | — |  · not in replay 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-044 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-045 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-046 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-047 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-048 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-049 | L2 | 1 | Partly replayed | L2 r1 | Reason Cited 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-050 | L2 | 1 | Owner decision | L2 r1 | Owner Decision 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-051 | L2 | 1 | Not possible | L2 r1 | Not Possible 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-052 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-053 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-054 | L2 | 2 | Not possible | L2 r1 | Not Possible 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-055 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-056 | L2 | 2 | Not possible | L2 r1 | Not Possible 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-057 | L2 | 2 | Partly replayed | L2 r1 | Reason Cited 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-058 | L2 | 1 | Not possible | L2 r1 | Not Possible 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-059 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-060 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-061 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-062 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-063 | L2 | 1 | Owner decision | L2 r1 | Owner Decision 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-064 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-065 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-066 | L2 | 1 | Partly replayed | L2 r1 | Reason Cited 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-067 | L2 | 1 | Partly replayed | L2 r1 | Reason Cited 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-068 | L2 | 1 | Not possible | L2 r1 | Not Possible 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-069 | L2 | 1 | Partly replayed | L2 r1 | Reason Cited 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-070 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-071 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-072 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-073 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-074 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-075 | L2 | 2 | Partly replayed | L2 r1 | Fixed 1 Reason Cited 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-076 | L2 | 2 | Partly replayed | L2 r1 | Reason Cited 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-077 | L2 | 3 | Owner decision | L2 r1 | Owner Decision 3 | lanes/L2.md |
| AL-COMPETITOR-GAP-078 | L2 | 3 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 Fixed 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-079 | L2 | 2 | Fixed | L2 r1 | Fixed 2 | lanes/L2.md |
| AL-COMPETITOR-GAP-080 | L2 | 1 | Fixed | L2 r1 | Fixed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-081 | L2 | 1 | Open — fix committed, awaiting replay round 2 | L2 r1 | Changed 1 | lanes/L2.md |
| AL-COMPETITOR-GAP-082 | L2 | 2 | Partly replayed | L2 r1 | Reason Cited 2 | lanes/L2.md |
| AL-CONFIRM-DELETE-004 | L3 | 20 | Open — fix committed, awaiting replay round 2 | L2 r1, L3 r1 | Changed 1 Fixed 17 Holds 1 Other 1 | lanes/L3.md |
| AL-COPY-025 | L3 | 8 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 4 Still Open 3 | lanes/L3.md |
| AL-FIRST-RUN-002 | L3 | 3 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 2 | lanes/L3.md |
| AL-NUMBERS-SOURCE-007 | L3 | 13 | Open — fix committed, awaiting replay round 2 | L2 r1, L3 r1, L7 r1 | Changed 4 Fixed 4 Holds 1 Not Possible 1 Other 1 Still Open 2 | lanes/L3.md |
| AL-PERSISTENCE-003 | L3 | 4 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 3 Fixed 1 | lanes/L3.md |
| AL-PERSISTENCE-004 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-STREAKS-001 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-STREAKS-002 | L3 | 1 | Partly replayed | L2 r1 | Other 1 | lanes/L3.md |
| AL-STREAKS-003 | L3 | 8 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 3 Fixed 1 Not Replayed 1 Still Open 3 | lanes/L3.md |
| AL-UNDO-002 | L3 | 6 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Changed 1 Fixed 3 Not Replayed 2 | lanes/L3.md |
| AL-XP-BADGES-001 | L3 | 8 | Partly replayed | L3 r1 | Fixed 6 Not Replayed 2 | lanes/L3.md |
| AL-XP-BADGES-002 | L3 | 14 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 9 Holds 1 Not Replayed 1 Still Open 2 | lanes/L3.md |
| AL-LAYOUT-375-007 | L3 | 3 | Fixed | L1 r2 | Fixed 3 | lanes/L3.md |
| AL-A11Y-010 | L3 | 2 | Open — fix committed, awaiting replay round 2 | L3 r1 | Fixed 1 Still Open 1 | lanes/L3.md |
| AL-A11Y-011 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-A11Y-012 | L3 | 2 | Open — fix committed, awaiting replay round 2 | L3 r1 | Still Open 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-083 | L3 | 6 | Owner decision | L3 r1 | Owner Decision 6 | lanes/L3.md |
| AL-COMPETITOR-GAP-084 | L3 | 3 | Waits on owner | L3 r1 | Waits On Owner 3 | lanes/L3.md |
| AL-COPY-026 | L3 | 2 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 1 | lanes/L3.md |
| AL-COPY-027 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COPY-028 | L3 | 10 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 3 Fixed 4 Not Replayed 2 Still Open 1 | lanes/L3.md |
| AL-COPY-029 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COPY-030 | L3 | 2 | Partly replayed | L3 r1 | Fixed 1 Not Replayed 1 | lanes/L3.md |
| AL-COUNTS-004 | L3 | 5 | Fixed | L3 r1 | Fixed 5 | lanes/L3.md |
| AL-COUNTS-005 | L3 | 2 | Partly replayed | L3 r1 | Fixed 1 Not Replayed 1 | lanes/L3.md |
| AL-DATES-004 | L3 | 2 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 1 | lanes/L3.md |
| AL-DATES-005 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-DISCOVERABILITY-001 | L3 | 6 | Open — fix committed, awaiting replay round 2 | L3 r1 | Fixed 2 Holds 1 Still Open 3 | lanes/L3.md |
| AL-FIELD-ERROR-007 | L3 | 1 | Partly replayed | L2 r1 | Other 1 | lanes/L3.md |
| AL-FIELD-ERROR-008 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-FIELD-ERROR-009 | L3 | 8 | Open — fix committed, awaiting replay round 2 | L2 r1, L3 r1 | Changed 1 Fixed 6 Other 1 | lanes/L3.md |
| AL-FIRST-RUN-003 | L3 | 3 | Open — fix committed, awaiting replay round 2 | L3 r1 | Fixed 2 Still Open 1 | lanes/L3.md |
| AL-FIRST-RUN-004 | L3 | 2 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Not Replayed 1 Still Open 1 | lanes/L3.md |
| AL-FIRST-RUN-005 | L3 | 7 | Fixed + Owner decision | L3 r1, L7 r1 | Fixed 5 Owner Decision 2 | lanes/L3.md |
| AL-FIRST-RUN-006 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-LAYOUT-DESKTOP-007 | L3 | 3 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Owner Decision 2 | lanes/L3.md |
| AL-PERSISTENCE-005 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-PERSISTENCE-006 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-PLURALS-001 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-QUICK-ADD-001 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-QUICK-ADD-002 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-STREAKS-004 | L3 | 4 | Open — fix committed, awaiting replay round 2 | L3 r1 | Fixed 3 Still Open 1 | lanes/L3.md |
| AL-STREAKS-005 | L3 | 3 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Still Open 2 | lanes/L3.md |
| AL-UNDO-003 | L3 | 5 | Fixed | L3 r1 | Fixed 5 | lanes/L3.md |
| AL-UNITS-003 | L3 | 4 | Partly replayed | L3 r1 | Fixed 3 Not Replayed 1 | lanes/L3.md |
| AL-XP-BADGES-003 | L3 | 4 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 Fixed 2 Still Open 1 | lanes/L3.md |
| AL-XP-BADGES-004 | L3 | 4 | Fixed | L3 r1 | Fixed 4 | lanes/L3.md |
| AL-XP-BADGES-005 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-XP-BADGES-006 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-XP-BADGES-007 | L3 | 1 | Open — fix committed, awaiting replay round 2 | L3 r1 | Changed 1 | lanes/L3.md |
| AL-COPY-031 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COUNTS-006 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-FIRST-RUN-007 | L3 | 2 | Partly replayed | L3 r1 | Fixed 1 Not Replayed 1 | lanes/L3.md |
| AL-FIRST-RUN-008 | L3 | 2 | Fixed | L1 r2 | Fixed 2 | lanes/L3.md |
| AL-PERSISTENCE-007 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-ROUNDING-003 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-TOAST-006 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-XP-BADGES-008 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-085 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-A11Y-013 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COPY-032 | L3 | 1 | Not possible | L3 r1 | Not Possible 1 | lanes/L3.md |
| AL-LAYOUT-375-008 | L3 | 2 | Partly replayed | L1 r2, L3 r1 | Fixed 1 Not Replayed 1 | lanes/L3.md |
| AL-PERF-003 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-086 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-087 | L3 | 1 | Open — fix committed, awaiting replay round 2 | L3 r1 | Still Open 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-088 | L3 | 1 | Open — fix committed, awaiting replay round 2 | L3 r1 | Still Open 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-089 | L3 | 1 | Partly replayed | L3 r1 | Not Replayed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-090 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-091 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-092 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-093 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-094 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-095 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-096 | L3 | 2 | Fixed | L3 r1 | Fixed 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-097 | L3 | 3 | Owner decision | L3 r1 | Owner Decision 3 | lanes/L3.md |
| AL-COMPETITOR-GAP-098 | L3 | 3 | Fixed | L3 r1 | Fixed 3 | lanes/L3.md |
| AL-COMPETITOR-GAP-099 | L3 | 1 | Owner decision | L3 r1 | Owner Decision 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-100 | L3 | 1 | Partly replayed | L3 r1 | Not Replayed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-101 | L3 | 1 | Waits on owner | L3 r1 | Waits On Owner 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-102 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-103 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-104 | L3 | 1 | Partly replayed | L3 r1 | Not Replayed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-105 | L3 | 2 | Partly replayed | L3 r1 | Reason Cited 2 | lanes/L3.md |
| AL-COMPETITOR-GAP-106 | L3 | 1 | Partly replayed | L3 r1 | Not Replayed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-107 | L3 | 1 | Fixed | L3 r1 | Fixed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-108 | L3 | 1 | Not replayed yet | — |  · not in replay 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-109 | L3 | 1 | Partly replayed | L3 r1 | Not Replayed 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-110 | L3 | 1 | Owner decision | L3 r1 | Owner Decision 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-111 | L3 | 1 | Partly replayed | L3 r1 | Other 1 | lanes/L3.md |
| AL-COMPETITOR-GAP-112 | L3 | 1 | Not possible | L3 r1 | Not Possible 1 | lanes/L3.md |
| AL-TIMEZONE-002 | L3 | 3 | Partly replayed | L3 r1 | Reason Cited 3 | lanes/L3.md |
| AL-ACTIVITY-001 | L4 | 10 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 7 Not Replayed 1 Still Open 2 | lanes/L4.md |
| AL-CONFIRM-DELETE-005 | L4 | 21 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Fixed 16 Holds 1 Not Replayed 2 | lanes/L4.md |
| AL-CONFIRM-DELETE-006 | L4 | 19 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 7 Fixed 11 Not Replayed 1 | lanes/L4.md |
| AL-COUNTS-007 | L4 | 19 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 14 Not Replayed 2 Still Open 3 | lanes/L4.md |
| AL-CRASH-002 | L4 | 2 | Fixed | L4 r1 | Fixed 1 Holds 1 | lanes/L4.md |
| AL-FIELD-ERROR-010 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-008 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-NAV-003 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-NUMBERS-SOURCE-008 | L4 | 3 | Fixed | L4 r1 | Fixed 3 | lanes/L4.md |
| AL-NUMBERS-SOURCE-009 | L4 | 6 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 3 Not Replayed 2 Still Open 1 | lanes/L4.md |
| AL-NUMBERS-SOURCE-010 | L4 | 2 | Partly replayed | L4 r1 | Fixed 1 Not Replayed 1 | lanes/L4.md |
| AL-NUMBERS-SOURCE-011 | L4 | 8 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 3 Fixed 1 Not Replayed 3 Still Open 1 | lanes/L4.md |
| AL-UNITS-004 | L4 | 8 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 6 Not Replayed 1 Still Open 1 | lanes/L4.md |
| AL-XP-BADGES-009 | L4 | 6 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 1 Not Replayed 2 Still Open 3 | lanes/L4.md |
| AL-A11Y-014 | L4 | 4 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Fixed 2 | lanes/L4.md |
| AL-A11Y-015 | L4 | 2 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 1 Still Open 1 | lanes/L4.md |
| AL-A11Y-016 | L4 | 13 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 4 Not Replayed 2 Still Open 7 | lanes/L4.md |
| AL-ACTIVITY-002 | L4 | 6 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Fixed 3 Still Open 1 | lanes/L4.md |
| AL-ACTIVITY-003 | L4 | 8 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 3 Holds 5 | lanes/L4.md |
| AL-COMPETITOR-GAP-113 | L4 | 4 | Fixed + Owner decision | L4 r1 | Fixed 3 Owner Decision 1 | lanes/L4.md |
| AL-COMPETITOR-GAP-114 | L4 | 4 | Partly replayed | L4 r1 | Fixed 2 · not in replay 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-115 | L4 | 4 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 2 Reason Cited 1 | lanes/L4.md |
| AL-COPY-033 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COPY-034 | L4 | 22 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 8 Fixed 6 Still Open 6 · not in replay 2 | lanes/L4.md |
| AL-COPY-035 | L4 | 8 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 3 Fixed 1 Not Replayed 1 Owner Decision 2 Still Open 1 | lanes/L4.md |
| AL-COPY-036 | L4 | 16 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Fixed 6 Not Replayed 3 Still Open 5 | lanes/L4.md |
| AL-COPY-037 | L4 | 3 | Fixed | L4 r1 | Fixed 3 | lanes/L4.md |
| AL-COPY-038 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COPY-039 | L4 | 6 | Open — fix committed, awaiting replay round 2 | L1 r2, L4 r1 | Fixed 5 Still Open 1 | lanes/L4.md |
| AL-COPY-040 | L4 | 16 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 10 Holds 1 Not Replayed 4 | lanes/L4.md |
| AL-COPY-041 | L4 | 3 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 2 | lanes/L4.md |
| AL-COPY-042 | L4 | 11 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 7 Not Replayed 3 | lanes/L4.md |
| AL-COPY-043 | L4 | 9 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Fixed 1 Holds 2 Not Replayed 2 Still Open 2 | lanes/L4.md |
| AL-COPY-044 | L4 | 10 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 2 Holds 1 Not Replayed 1 Reason Cited 5 | lanes/L4.md |
| AL-COUNTS-008 | L4 | 3 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 1 Not Replayed 1 Still Open 1 | lanes/L4.md |
| AL-COUNTS-009 | L4 | 3 | Fixed | L4 r1 | Fixed 3 | lanes/L4.md |
| AL-CURRENCY-004 | L4 | 5 | Partly replayed | L4 r1 | Fixed 3 Not Replayed 2 | lanes/L4.md |
| AL-DATES-006 | L4 | 6 | Fixed | L4 r1 | Fixed 6 | lanes/L4.md |
| AL-DISCOVERABILITY-002 | L4 | 4 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 Still Open 2 | lanes/L4.md |
| AL-FEATURE-GAP-002 | L4 | 1 | Partly replayed | L4 r1 | Not Replayed 1 | lanes/L4.md |
| AL-FIELD-ERROR-011 | L4 | 6 | Partly replayed | L4 r1 | Fixed 3 Not Replayed 1 · not in replay 2 | lanes/L4.md |
| AL-HELP-001 | L4 | 1 | Open — fix committed, awaiting replay round 2 | L4 r1 | Still Open 1 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-009 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-NAV-004 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-NUMBERS-SOURCE-012 | L4 | 5 | Partly replayed | L4 r1 | Fixed 4 Not Replayed 1 | lanes/L4.md |
| AL-PERF-004 | L4 | 5 | Open — fix committed, awaiting replay round 2 | L4 r1 | Not Replayed 3 Still Open 2 | lanes/L4.md |
| AL-PERF-005 | L4 | 2 | Partly replayed | L4 r1 | Not Replayed 2 | lanes/L4.md |
| AL-PERSISTENCE-008 | L4 | 2 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 1 Still Open 1 | lanes/L4.md |
| AL-SEARCH-003 | L4 | 8 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 1 Fixed 4 Not Replayed 3 | lanes/L4.md |
| AL-TOAST-007 | L4 | 7 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 3 Still Open 2 · not in replay 2 | lanes/L4.md |
| AL-UNDO-004 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-CHARTS-001 | L4 | 3 | Open — fix committed, awaiting replay round 2 | L4 r1 | Fixed 2 Still Open 1 | lanes/L4.md |
| AL-COMPETITOR-GAP-116 | L4 | 3 | Owner decision | L4 r1 | Owner Decision 3 | lanes/L4.md |
| AL-COPY-045 | L4 | 2 | Open — fix committed, awaiting replay round 2 | L4 r1 | Changed 2 | lanes/L4.md |
| AL-FIRST-RUN-009 | L4 | 1 | Partly replayed | L4 r1 | Not Replayed 1 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-010 | L4 | 3 | Open — fix committed, awaiting replay round 2 | L4 r1 | Not Replayed 2 Still Open 1 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-011 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-012 | L4 | 3 | Partly replayed | L4 r1 | Fixed 2 Not Replayed 1 | lanes/L4.md |
| AL-LAYOUT-DESKTOP-013 | L4 | 1 | Partly replayed | L4 r1 | Not Replayed 1 | lanes/L4.md |
| AL-NAV-005 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-COMPETITOR-GAP-117 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-118 | L4 | 3 | Partly replayed | L4 r1 | Fixed 1 Reason Cited 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-119 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-120 | L4 | 1 | Partly replayed | L4 r1 | Reason Cited 1 | lanes/L4.md |
| AL-COMPETITOR-GAP-121 | L4 | 3 | Partly replayed | L4 r1 | Fixed 1 Not Replayed 1 Reason Cited 1 | lanes/L4.md |
| AL-COMPETITOR-GAP-122 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-123 | L4 | 2 | Partly replayed | L4 r1 | Reason Cited 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-124 | L4 | 2 | Fixed | L4 r1 | Fixed 2 | lanes/L4.md |
| AL-COMPETITOR-GAP-125 | L4 | 1 | Fixed | L4 r1 | Fixed 1 | lanes/L4.md |
| AL-CHECKLIST-001 | L5 | 4 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Fixed 2 Owner Decision 1 | lanes/L5.md |
| AL-CHECKLIST-002 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-CHECKLIST-003 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-004 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-005 | L5 | 3 | Owner decision | L5 r1 | Owner Decision 3 | lanes/L5.md |
| AL-COPY-046 | L5 | 6 | Fixed | L5 r1 | Fixed 6 | lanes/L5.md |
| AL-NUMBERS-SOURCE-013 | L5 | 3 | Open — fix committed, awaiting replay round 2 | L5 r1 | Fixed 1 Still Open 2 | lanes/L5.md |
| AL-QUICK-ADD-003 | L5 | 4 | Fixed | L5 r1 | Fixed 4 | lanes/L5.md |
| AL-TASKS-FEATURE-001 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-TASKS-FEATURE-002 | L5 | 12 | Fixed | L5 r1 | Fixed 12 | lanes/L5.md |
| AL-TASKS-FEATURE-003 | L5 | 2 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Fixed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-004 | L5 | 5 | Fixed | L5 r1 | Fixed 5 | lanes/L5.md |
| AL-TASKS-FEATURE-005 | L5 | 7 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Fixed 4 Reason Cited 1 Still Open 1 | lanes/L5.md |
| AL-TASKS-FEATURE-006 | L5 | 4 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 2 Fixed 2 | lanes/L5.md |
| AL-TASKS-FEATURE-007 | L5 | 6 | Fixed | L5 r1 | Fixed 6 | lanes/L5.md |
| AL-TASKS-FEATURE-008 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-TASKS-FEATURE-009 | L5 | 2 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Still Open 1 | lanes/L5.md |
| AL-CHECKLIST-006 | L5 | 5 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 3 Fixed 1 Owner Decision 1 | lanes/L5.md |
| AL-CHECKLIST-007 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-008 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-009 | L5 | 3 | Open — fix committed, awaiting replay round 2 | L5 r1 | Fixed 2 Still Open 1 | lanes/L5.md |
| AL-CHECKLIST-010 | L5 | 3 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 2 Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-011 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-012 | L5 | 2 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Reason Cited 1 | lanes/L5.md |
| AL-CHECKLIST-013 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-COMPETITOR-GAP-126 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-COPY-047 | L5 | 7 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 2 Fixed 4 Still Open 1 | lanes/L5.md |
| AL-COPY-048 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-COPY-049 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-COUNTS-010 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-DATES-007 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-FIELD-ERROR-012 | L5 | 3 | Fixed | L5 r1 | Fixed 3 | lanes/L5.md |
| AL-IMPORT-EXPORT-005 | L5 | 4 | Fixed | L5 r1 | Fixed 4 | lanes/L5.md |
| AL-PERF-006 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-PERF-007 | L5 | 1 | Open — fix committed, awaiting replay round 2 | L5 r1 | Still Open 1 | lanes/L5.md |
| AL-PERSISTENCE-009 | L5 | 1 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 | lanes/L5.md |
| AL-PERSISTENCE-010 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-QUICK-ADD-004 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-QUICK-ADD-005 | L5 | 2 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Fixed 1 | lanes/L5.md |
| AL-SEARCH-004 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-010 | L5 | 6 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 Fixed 5 | lanes/L5.md |
| AL-TASKS-FEATURE-011 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-TASKS-FEATURE-012 | L5 | 2 | Fixed + Owner decision | L5 r1 | Fixed 1 Owner Decision 1 | lanes/L5.md |
| AL-TOAST-008 | L5 | 5 | Partly replayed | L3 r1, L5 r1 | Fixed 2 Other 3 | lanes/L5.md |
| AL-A11Y-017 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-A11Y-018 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-A11Y-019 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-CHECKLIST-014 | L5 | 4 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 2 Fixed 2 | lanes/L5.md |
| AL-CHECKLIST-015 | L5 | 3 | Fixed | L5 r1 | Fixed 3 | lanes/L5.md |
| AL-COPY-050 | L5 | 2 | Fixed + Owner decision | L5 r1 | Fixed 1 Owner Decision 1 | lanes/L5.md |
| AL-COPY-051 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-FIELD-ERROR-013 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-FIELD-ERROR-014 | L5 | 2 | Fixed | L5 r1 | Fixed 2 | lanes/L5.md |
| AL-FIELD-ERROR-015 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-PERF-008 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-013 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-014 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-015 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-THEME-001 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-THEME-002 | L5 | 2 | Owner decision | L5 r1 | Owner Decision 2 | lanes/L5.md |
| AL-TOAST-009 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-COPY-052 | L5 | 3 | Fixed | L5 r1 | Fixed 3 | lanes/L5.md |
| AL-COPY-053 | L5 | 1 | Fixed | L5 r1 | Fixed 1 | lanes/L5.md |
| AL-COMPETITOR-GAP-127 | L5 | 1 | Owner decision | L5 r1 | Owner Decision 1 | lanes/L5.md |
| AL-COMPETITOR-GAP-128 | L5 | 1 | Owner decision | L5 r1 | Owner Decision 1 | lanes/L5.md |
| AL-COMPETITOR-GAP-129 | L5 | 1 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 | lanes/L5.md |
| AL-TASKS-FEATURE-016 | L5 | 1 | Open — fix committed, awaiting replay round 2 | L5 r1 | Changed 1 | lanes/L5.md |
| AL-CHAIN-DATA-001 | L6 | 4 | Open — fix committed, awaiting replay round 2 | L6 r1 | Fixed 1 Still Open 3 | lanes/L6.md |
| AL-CHAIN-DATA-002 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-CHAIN-DATA-003 | L6 | 8 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 Fixed 6 | lanes/L6.md |
| AL-COPY-054 | L6 | 11 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 3 Fixed 6 Still Open 2 | lanes/L6.md |
| AL-HELP-002 | L6 | 16 | Open — fix committed, awaiting replay round 2 | L3 r1, L4 r1, L6 r1 | Changed 4 Fixed 8 Not Replayed 1 Other 1 Still Open 2 | lanes/L6.md |
| AL-LAYOUT-DESKTOP-014 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-LAYOUT-DESKTOP-015 | L6 | 2 | Open — fix committed, awaiting replay round 2 | L6 r1 | Still Open 2 | lanes/L6.md |
| AL-SEARCH-005 | L6 | 7 | Open — fix committed, awaiting replay round 2 | L6 r1 | Fixed 6 Still Open 1 | lanes/L6.md |
| AL-SECURITY-LOCK-001 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-SETTINGS-001 | L6 | 6 | Fixed | L6 r1 | Fixed 6 | lanes/L6.md |
| AL-SETTINGS-002 | L6 | 5 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 Fixed 1 Still Open 2 | lanes/L6.md |
| AL-STALE-DATA-001 | L6 | 7 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 Fixed 5 | lanes/L6.md |
| AL-WALLET-001 | L6 | 3 | Fixed | L6 r1 | Fixed 3 | lanes/L6.md |
| AL-A11Y-020 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-A11Y-021 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-CHAIN-DATA-004 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-CHAIN-DATA-005 | L6 | 4 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 Fixed 2 | lanes/L6.md |
| AL-CHAIN-DATA-006 | L6 | 5 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 Fixed 3 | lanes/L6.md |
| AL-CHAIN-DATA-007 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-CHAIN-DATA-008 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-130 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-COPY-055 | L6 | 5 | Fixed | L6 r1 | Fixed 5 | lanes/L6.md |
| AL-COPY-056 | L6 | 10 | Open — fix committed, awaiting replay round 2 | L3 r1, L6 r1, L7 r1 | Changed 2 Fixed 3 Other 2 Still Open 3 | lanes/L6.md |
| AL-COPY-057 | L6 | 7 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 1 Fixed 5 Reason Cited 1 | lanes/L6.md |
| AL-COUNTS-011 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-CRASH-003 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-CROSS-PAGE-SYNC-003 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-HELP-003 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-LAYOUT-375-009 | L6 | 1 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 1 | lanes/L6.md |
| AL-LAYOUT-500-001 | L6 | 6 | Partly replayed | L6 r1 | Fixed 4 · not in replay 2 | lanes/L6.md |
| AL-NAV-006 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-NAV-007 | L6 | 1 | Open — fix committed, awaiting replay round 2 | L6 r1 | Still Open 1 | lanes/L6.md |
| AL-NAV-008 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-SECURITY-LOCK-002 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-SETTINGS-003 | L6 | 4 | Fixed | L6 r1 | Fixed 3 Holds 1 | lanes/L6.md |
| AL-SETTINGS-004 | L6 | 4 | Partly replayed | L2 r1, L6 r1 | Fixed 1 Other 3 | lanes/L6.md |
| AL-SETTINGS-005 | L6 | 1 | Partly replayed | L6 r1 | Not Replayed 1 | lanes/L6.md |
| AL-SETTINGS-006 | L6 | 1 | Owner decision | L6 r1 | Owner Decision 1 | lanes/L6.md |
| AL-SETTINGS-007 | L6 | 7 | Open — fix committed, awaiting replay round 2 | L2 r1, L6 r1 | Fixed 3 Not Reproducible 1 Other 2 Still Open 1 | lanes/L6.md |
| AL-STALE-DATA-002 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-TIMEZONE-003 | L6 | 3 | Open — fix committed, awaiting replay round 2 | L6 r1 | Still Open 3 | lanes/L6.md |
| AL-TOAST-010 | L6 | 3 | Fixed | L6 r1 | Fixed 3 | lanes/L6.md |
| AL-FIELD-ERROR-016 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-HELP-004 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-LAYOUT-768-002 | L6 | 2 | Open | L1 r2 | Changed 1 Fixed 1 | lanes/L6.md |
| AL-LAYOUT-DESKTOP-016 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-PERF-009 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-SETTINGS-008 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-AI-SAFETY-001 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-COMPETITOR-GAP-131 | L6 | 3 | Partly replayed | L6 r1 | Reason Cited 1 · not in replay 2 | lanes/L6.md |
| AL-COPY-058 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-132 | L6 | 2 | Partly replayed | L6 r1 | Reason Cited 2 | lanes/L6.md |
| AL-COMPETITOR-GAP-133 | L6 | 2 | Fixed + Owner decision | L6 r1 | Fixed 1 Owner Decision 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-134 | L6 | 2 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 2 | lanes/L6.md |
| AL-COMPETITOR-GAP-135 | L6 | 2 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 1 Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-136 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-137 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-138 | L6 | 1 | Open — fix committed, awaiting replay round 2 | L6 r1 | Still Open 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-139 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-140 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-141 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-142 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-143 | L6 | 1 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-144 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-145 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-146 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-147 | L6 | 1 | Open — fix committed, awaiting replay round 2 | L6 r1 | Changed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-148 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-149 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-150 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-151 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-152 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-153 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-154 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-155 | L6 | 2 | Fixed | L6 r1 | Fixed 2 | lanes/L6.md |
| AL-COMPETITOR-GAP-156 | L6 | 2 | Owner decision | L6 r1 | Owner Decision 2 | lanes/L6.md |
| AL-COMPETITOR-GAP-157 | L6 | 1 | Owner decision | L6 r1 | Owner Decision 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-158 | L6 | 1 | Owner decision | L6 r1 | Owner Decision 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-159 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-160 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-161 | L6 | 1 | Partly replayed | L6 r1 | Reason Cited 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-162 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-163 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-164 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-165 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-166 | L6 | 1 | Owner decision | L6 r1 | Owner Decision 1 | lanes/L6.md |
| AL-COMPETITOR-GAP-167 | L6 | 1 | Fixed | L6 r1 | Fixed 1 | lanes/L6.md |
| AL-AI-CONNECTION-001 | L7 | 9 | Open — fix committed, awaiting replay round 2 | L1 r2, L7 r1 | Holds 1 Not Replayed 2 Owner Decision 3 Still Open 1 · not in replay 2 | lanes/L7.md |
| AL-AI-SAFETY-002 | L7 | 4 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Changed 1 Other 2 Still Open 1 | lanes/L7.md |
| AL-AI-ACTIONS-001 | L7 | 3 | Partly replayed | L7 r1 | Fixed 2 Not Replayed 1 | lanes/L7.md |
| AL-AI-ACTIONS-002 | L7 | 3 | Partly replayed | L7 r1 | Fixed 2 · not in replay 1 | lanes/L7.md |
| AL-AI-ACTIONS-003 | L7 | 18 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 2 Fixed 5 Still Open 1 · not in replay 10 | lanes/L7.md |
| AL-AI-ACTIONS-004 | L7 | 21 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 3 Fixed 1 Still Open 1 · not in replay 16 | lanes/L7.md |
| AL-AI-ACTIONS-005 | L7 | 9 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 3 Fixed 2 · not in replay 4 | lanes/L7.md |
| AL-AI-ACTIONS-006 | L7 | 10 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Fixed 2 Other 2 Still Open 2 · not in replay 4 | lanes/L7.md |
| AL-AI-CONNECTION-002 | L7 | 6 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 Fixed 2 Not Replayed 2 · not in replay 1 | lanes/L7.md |
| AL-AI-FACTS-001 | L7 | 14 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 4 Holds 1 Still Open 2 · not in replay 7 | lanes/L7.md |
| AL-AI-FACTS-002 | L7 | 42 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Changed 4 Other 9 Owner Decision 1 Still Open 1 · not in replay 27 | lanes/L7.md |
| AL-AI-FACTS-003 | L7 | 48 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Changed 4 Fixed 4 Holds 5 Other 1 Still Open 3 · not in replay 31 | lanes/L7.md |
| AL-AI-FACTS-004 | L7 | 43 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Changed 4 Fixed 3 Other 2 Owner Decision 1 Still Open 8 · not in replay 25 | lanes/L7.md |
| AL-AI-FACTS-005 | L7 | 47 | Open — fix committed, awaiting replay round 2 | L2 r1, L3 r1, L7 r1 | Changed 4 Fixed 12 Holds 2 Other 7 Still Open 5 · not in replay 17 | lanes/L7.md |
| AL-AI-FACTS-006 | L7 | 11 | Partly replayed | L7 r1 | Fixed 2 · not in replay 9 | lanes/L7.md |
| AL-AI-FACTS-007 | L7 | 6 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 Fixed 3 · not in replay 2 | lanes/L7.md |
| AL-AI-FACTS-008 | L7 | 7 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 · not in replay 6 | lanes/L7.md |
| AL-AI-FACTS-009 | L7 | 23 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Changed 2 Fixed 1 Holds 1 Other 3 Still Open 2 · not in replay 14 | lanes/L7.md |
| AL-AI-FACTS-010 | L7 | 32 | Open — fix committed, awaiting replay round 2 | L1 r2, L7 r1 | Changed 3 Not Replayed 1 Still Open 5 · not in replay 23 | lanes/L7.md |
| AL-AI-SAFETY-003 | L7 | 10 | Partly replayed | L7 r1 | Fixed 7 · not in replay 3 | lanes/L7.md |
| AL-AI-SAFETY-004 | L7 | 58 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Changed 4 Fixed 14 Holds 2 Not Replayed 1 Other 4 Owner Decision 1 Still Open 5 · not in replay 27 | lanes/L7.md |
| AL-AI-STABILITY-001 | L7 | 5 | Partly replayed | L7 r1 | Not Replayed 4 · not in replay 1 | lanes/L7.md |
| AL-AI-STABILITY-002 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-COPY-059 | L7 | 8 | Partly replayed | L7 r1 | Fixed 2 · not in replay 6 | lanes/L7.md |
| AL-CRASH-004 | L7 | 2 | Fixed | L7 r1 | Fixed 2 | lanes/L7.md |
| AL-LAYOUT-768-003 | L7 | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L7.md |
| AL-NUMBERS-SOURCE-014 | L7 | 24 | Open — fix committed, awaiting replay round 2 | L1 r2, L7 r1 | Changed 3 Fixed 3 Not Replayed 1 Still Open 2 · not in replay 15 | lanes/L7.md |
| AL-PRIVACY-001 | L7 | 3 | Partly replayed | L7 r1 | Holds 1 Not Replayed 2 | lanes/L7.md |
| AL-PRIVACY-002 | L7 | 3 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 · not in replay 2 | lanes/L7.md |
| AL-PRIVACY-003 | L7 | 3 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 3 | lanes/L7.md |
| AL-PRIVACY-004 | L7 | 17 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 10 Fixed 1 Still Open 1 · not in replay 5 | lanes/L7.md |
| AL-A11Y-022 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-A11Y-023 | L7 | 3 | Open — fix committed, awaiting replay round 2 | L1 r2, L7 r1 | Changed 2 Not Replayed 1 | lanes/L7.md |
| AL-AI-ACTIONS-007 | L7 | 29 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Not Replayed 1 Other 4 Still Open 3 · not in replay 21 | lanes/L7.md |
| AL-AI-ACTIONS-008 | L7 | 5 | Partly replayed | L7 r1 | Not Replayed 3 · not in replay 2 | lanes/L7.md |
| AL-AI-ACTIONS-009 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-AI-ACTIONS-010 | L7 | 16 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Fixed 5 Other 3 Still Open 1 · not in replay 7 | lanes/L7.md |
| AL-AI-ACTIONS-011 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-AI-CONNECTION-003 | L7 | 9 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 4 · not in replay 5 | lanes/L7.md |
| AL-AI-CONNECTION-004 | L7 | 2 | Partly replayed | L7 r1 | Fixed 1 · not in replay 1 | lanes/L7.md |
| AL-AI-CONNECTION-005 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-AI-CONNECTION-006 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-AI-CONNECTION-007 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 2 | lanes/L7.md |
| AL-AI-FACTS-011 | L7 | 2 | Partly replayed | L7 r1 | Not Replayed 1 · not in replay 1 | lanes/L7.md |
| AL-AI-FACTS-012 | L7 | 25 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Changed 2 Fixed 2 Other 2 Owner Decision 2 Still Open 3 · not in replay 14 | lanes/L7.md |
| AL-AI-FACTS-013 | L7 | 6 | Open — fix committed, awaiting replay round 2 | L7 r1 | Not Replayed 4 Still Open 2 | lanes/L7.md |
| AL-AI-FACTS-014 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 · not in replay 1 | lanes/L7.md |
| AL-AI-FACTS-015 | L7 | 16 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Changed 2 Fixed 6 Holds 1 Other 5 Still Open 2 | lanes/L7.md |
| AL-AI-STABILITY-003 | L7 | 4 | Partly replayed | L7 r1 | Fixed 1 Not Replayed 1 · not in replay 2 | lanes/L7.md |
| AL-AI-STABILITY-004 | L7 | 6 | Partly replayed | L7 r1 | Fixed 3 Not Replayed 1 · not in replay 2 | lanes/L7.md |
| AL-COPY-060 | L7 | 6 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 Fixed 2 Not Replayed 1 · not in replay 2 | lanes/L7.md |
| AL-COPY-061 | L7 | 2 | Partly replayed | L7 r1 | Fixed 1 · not in replay 1 | lanes/L7.md |
| AL-COPY-062 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 2 | lanes/L7.md |
| AL-COPY-063 | L7 | 3 | Fixed | L7 r1 | Fixed 3 | lanes/L7.md |
| AL-HELP-005 | L7 | 3 | Partly replayed | L1 r2, L7 r1 | Fixed 1 Not Replayed 1 · not in replay 1 | lanes/L7.md |
| AL-PRIVACY-005 | L7 | 4 | Fixed | L7 r1 | Fixed 4 | lanes/L7.md |
| AL-A11Y-024 | L7 | 2 | Partly replayed | L7 r1 | Not Replayed 2 | lanes/L7.md |
| AL-AI-CONNECTION-008 | L7 | 1 | Open — fix committed, awaiting replay round 2 | L7 r1 | Still Open 1 | lanes/L7.md |
| AL-AI-SAFETY-005 | L7 | 2 | Partly replayed | L7 r1 | Fixed 1 · not in replay 1 | lanes/L7.md |
| AL-AI-STABILITY-005 | L7 | 4 | Open — fix committed, awaiting replay round 2 | L2 r1, L7 r1 | Changed 3 Other 1 | lanes/L7.md |
| AL-COPY-064 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-COPY-065 | L7 | 7 | Partly replayed | L7 r1 | Fixed 2 · not in replay 5 | lanes/L7.md |
| AL-ENV-ONLY-001 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-FIELD-ERROR-017 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-LAYOUT-375-010 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-PLURALS-002 | L7 | 4 | Open — fix committed, awaiting replay round 2 | L7 r1 | Still Open 2 · not in replay 2 | lanes/L7.md |
| AL-PRIVACY-006 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 Fixed 1 | lanes/L7.md |
| AL-AI-FACTS-016 | L7 | 2 | Fixed | L7 r1 | Fixed 2 | lanes/L7.md |
| AL-AI-FACTS-017 | L7 | 7 | Partly replayed | L2 r1, L7 r1 | Holds 1 Other 6 | lanes/L7.md |
| AL-AI-SAFETY-006 | L7 | 5 | Partly replayed | L1 r2, L2 r1 | Not Replayed 1 Other 2 · not in replay 2 | lanes/L7.md |
| AL-AI-STABILITY-006 | L7 | 6 | Partly replayed | L3 r1, L7 r1 | Fixed 1 Out Of Scope 1 · not in replay 4 | lanes/L7.md |
| AL-AI-FACTS-018 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Fixed 1 Still Open 1 | lanes/L7.md |
| AL-AI-FACTS-019 | L7 | 7 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 1 · not in replay 6 | lanes/L7.md |
| AL-COMPETITOR-GAP-168 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-COMPETITOR-GAP-169 | L7 | 1 | Fixed | L7 r1 | Fixed 1 | lanes/L7.md |
| AL-COMPETITOR-GAP-170 | L7 | 1 | Partly replayed | L7 r1 | Not Replayed 1 | lanes/L7.md |
| AL-COMPETITOR-GAP-171 | L7 | 2 | Open — fix committed, awaiting replay round 2 | L7 r1 | Changed 2 | lanes/L7.md |
| AL-COMPETITOR-GAP-172 | L7 | 1 | Fixed | L7 r1 | Holds 1 | lanes/L7.md |
| AL-COMPETITOR-GAP-173 | L7 | 1 | Fixed | L7 r1 | Holds 1 | lanes/L7.md |
| AL-COMPETITOR-GAP-174 | L7 | 3 | Partly replayed | L7 r1 | Not Replayed 3 | lanes/L7.md |
| AL-HUD-001 | L8 | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L8.md |
| AL-HUD-002 | L8 | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L8.md |
| AL-ENV-ONLY-002 | L9 | 36 | Partly replayed | L3 r1 | Other 13 · not in replay 23 | lanes/L9.md |
| AL-ENV-ONLY-003 | L9 | 9 | Partly replayed | L1 r2 | Not Possible 6 · not in replay 3 | lanes/L9.md |
| AL-CONSOLE-001 | L9 | 5 | Open | L1 r2 | Fixed 1 Still Open 1 · not in replay 3 | lanes/L9.md |
| AL-ENV-ONLY-004 | L9 | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L9.md |
| AL-ENV-ONLY-005 | L9 | 1 | Not replayed yet | — |  · not in replay 1 | lanes/L9.md |
| AL-COPY-066 | L10a | 3 | Not replayed yet | — |  · not in replay 3 | lanes/L10a.md |
| AL-LAUNCHER-OVERLAP-001 | L10a | 101 | Open — fix committed, awaiting replay round 2 | L1 r2, L2 r1, L3 r1, L6 r1, L7 r1 | Fixed 9 Not Replayed 1 Other 26 Still Open 1 · not in replay 64 | lanes/L10a.md |
| AL-LAYOUT-375-011 | L10a | 11 | Open — fix committed, awaiting replay round 2 | L1 r2, L7 r1 | Changed 1 Fixed 1 · not in replay 9 | lanes/L10a.md |
| AL-LAYOUT-375-012 | L10a | 7 | Partly replayed | L2 r1 | Other 2 · not in replay 5 | lanes/L10a.md |
| AL-LAYOUT-768-004 | L10a | 18 | Partly replayed | L3 r1 | Other 1 Out Of Scope 1 · not in replay 16 | lanes/L10a.md |
| AL-NAV-009 | L10a | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L10a.md |
| AL-NAV-010 | L10a | 23 | Partly replayed | L3 r1 | Other 2 · not in replay 21 | lanes/L10a.md |
| AL-PERSISTENCE-011 | L10a | 17 | Partly replayed | L1 r2, L2 r1 | Fixed 5 Other 3 · not in replay 9 | lanes/L10a.md |
| AL-PRICING-001 | L10a | 20 | Partly replayed | L2 r1, L3 r1 | Other 18 · not in replay 2 | lanes/L10a.md |
| AL-THEME-003 | L10a | 8 | Partly replayed | L1 r2, L6 r1 | Fixed 3 · not in replay 5 | lanes/L10a.md |
| AL-THEME-004 | L10a | 13 | Partly replayed | L1 r2 | Not Replayed 1 · not in replay 12 | lanes/L10a.md |
| AL-THEME-005 | L10a | 7 | Not replayed yet | — |  · not in replay 7 | lanes/L10a.md |
| AL-LAYOUT-DESKTOP-017 | L10a | 2 | Not replayed yet | — |  · not in replay 2 | lanes/L10a.md |
| AL-NAV-011 | L10a | 3 | Not replayed yet | — |  · not in replay 3 | lanes/L10a.md |
| AL-NAV-012 | L10a | 7 | Partly replayed | L2 r1 | Other 2 · not in replay 5 | lanes/L10a.md |
| AL-NAV-013 | L10a | 11 | Partly replayed | L1 r2 | Fixed 9 Not Possible 1 · not in replay 1 | lanes/L10a.md |
| AL-PERF-010 | L10a | 1 | Partly replayed | L3 r1 | Other 1 | lanes/L10a.md |
| AL-THEME-006 | L10a | 7 | Open — fix committed, awaiting replay round 2 | L3 r1, L7 r1 | Other 3 Still Open 1 · not in replay 3 | lanes/L10a.md |
| AL-THEME-007 | L10a | 7 | Partly replayed | L1 r2, L2 r1 | Fixed 2 Other 5 | lanes/L10a.md |
| AL-COPY-067 | L10a | 1 | Partly replayed | L1 r2 | Not Replayed 1 | lanes/L10a.md |
| AL-LAYOUT-375-013 | L10a | 2 | Partly replayed | L2 r1 | Other 2 | lanes/L10a.md |
| AL-MOTION-002 | L10a | 2 | Partly replayed | L3 r1 | Other 2 | lanes/L10a.md |
| AL-LAYOUT-768-005 | L10a | 1 | Not replayed yet | — |  · not in replay 1 | lanes/L10a.md |
| AL-A11Y-025 | L10b | 5 | Not replayed yet | — |  · not in replay 5 | lanes/L10b.md |
| AL-FIELD-ERROR-018 | L10b | 23 | Open | L1 r2 | Fixed 3 Still Open 2 · not in replay 18 | lanes/L10b.md |
| AL-FIELD-ERROR-019 | L10b | 35 | Partly replayed | L2 r1, L3 r1 | Other 4 · not in replay 31 | lanes/L10b.md |
| AL-LAYOUT-375-014 | L10b | 9 | Partly replayed | L2 r1 | Other 1 · not in replay 8 | lanes/L10b.md |
| AL-LIMITS-004 | L10b | 39 | Partly replayed | L1 r2, L2 r1 | Fixed 3 Holds 1 · not in replay 35 | lanes/L10b.md |
| AL-LIMITS-005 | L10b | 25 | Open | L1 r2, L2 r1, L3 r1 | Other 2 Out Of Scope 1 Still Open 1 · not in replay 21 | lanes/L10b.md |
| AL-PERF-011 | L10b | 5 | Partly replayed | L3 r1 | Out Of Scope 1 · not in replay 4 | lanes/L10b.md |
| AL-PERSISTENCE-012 | L10b | 12 | Not replayed yet | — |  · not in replay 12 | lanes/L10b.md |
| AL-ROUNDING-004 | L10b | 9 | Partly replayed | L3 r1 | Other 1 · not in replay 8 | lanes/L10b.md |
| AL-ROUNDING-005 | L10b | 4 | Partly replayed | L4 r1 | Fixed 1 · not in replay 3 | lanes/L10b.md |
| AL-TIMEZONE-004 | L10b | 15 | Not replayed yet | — |  · not in replay 15 | lanes/L10b.md |
| AL-TOAST-011 | L10b | 14 | Open — fix committed, awaiting replay round 2 | L1 r2, L6 r1 | Fixed 1 Still Open 1 · not in replay 12 | lanes/L10b.md |
| AL-UNDO-005 | L10b | 8 | Not replayed yet | — |  · not in replay 8 | lanes/L10b.md |
| AL-A11Y-026 | L10b | 7 | Partly replayed | L3 r1 | Other 2 · not in replay 5 | lanes/L10b.md |
| AL-DATES-008 | L10b | 10 | Not replayed yet | — |  · not in replay 10 | lanes/L10b.md |
| AL-PLURALS-003 | L10b | 16 | Partly replayed | L2 r1, L3 r1, L4 r1 | Fixed 2 Other 3 · not in replay 11 | lanes/L10b.md |
| AL-THEME-008 | L10b | 1 | Partly replayed | L2 r1 | Other 1 | lanes/L10b.md |
| AL-TOAST-012 | L10b | 11 | Partly replayed | L2 r1, L3 r1 | Other 4 · not in replay 7 | lanes/L10b.md |
| AL-A11Y-027 | L10b | 1 | Fixed | L1 r2 | Fixed 1 | lanes/L10b.md |
| AL-BACKUP-RESTORE-001 | INT | 3 | Not replayed yet | — |  · not in replay 3 | lanes/INT.md |
| AL-BACKUP-RESTORE-002 | INT | 1 | Not replayed yet | — |  · not in replay 1 | lanes/INT.md |
| AL-BACKUP-RESTORE-003 | INT | 2 | Not replayed yet | — |  · not in replay 2 | lanes/INT.md |
| AL-IMPORT-EXPORT-006 | INT | 5 | Partly replayed | L1 r2, L2 r1 | Fixed 3 Other 2 | lanes/INT.md |
| AL-BACKUP-RESTORE-004 | INT | 3 | Not replayed yet | — |  · not in replay 3 | lanes/INT.md |
| AL-BACKUP-RESTORE-005 | INT | 1 | Fixed | L1 r2 | Fixed 1 | lanes/INT.md |
| AL-HELP-006 | INT | 3 | Not replayed yet | — |  · not in replay 3 | lanes/INT.md |
| AL-PRIVACY-007 | INT | 2 | Partly replayed | L2 r1 | Other 2 | lanes/INT.md |
| AL-COMPETITOR-GAP-175 | INT | 1 | Not replayed yet | — |  · not in replay 1 | lanes/INT.md |
| AL-COMPETITOR-GAP-176 | INT | 1 | Not replayed yet | — |  · not in replay 1 | lanes/INT.md |
| AL-COMPETITOR-GAP-177 | INT | 1 | Not replayed yet | — |  · not in replay 1 | lanes/INT.md |
| AL-COMPETITOR-GAP-178 | INT | 1 | Not replayed yet | — |  · not in replay 1 | lanes/INT.md |

