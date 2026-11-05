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

## Closing table (R9)
Outcomes: Fixed (commit, test, replay FIXED) · Already fixed (replay FIXED on main before any change, with the evidence) · Owner decision (named) · Not possible (evidence) · Waits on owner (the named step).

| Row | Finding ids | Outcome | Commits | Test | Replay |
|---|---|---|---|---|---|
| _Filled in as rows close._ | | | | | |
