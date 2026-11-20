# ADR-044 — Session AU: "FRIENDS DRESS REHEARSAL"

Status: complete (19–20 Nov 2026); not merged, not deployed. Branch `feature/session-au-dress-rehearsal` from `main` `836534c3` (Merge PR #107,
Session AT; live as Alpha #57). One Draft PR. Resume file: `docs/handoff/AU_RESUME.md`. Friction log:
`docs/review/session-au/REHEARSAL.md`.

## Why this session exists
Before friends get the Alpha, use ZIGoals the way they will: five fresh people, a real first week each, phone and
desktop, and fix everything that gets in their way. Then close what Session AT carried.

## The brief (owner, 19 Nov; summary, in priority order)
1. **The dress rehearsal.** On a production build (`PUBLIC_ALPHA_UNDEPLOYED`), five fresh profiles, each a first week
   compressed with Playwright's clock (day 1, day 2, day 7; morning and evening), each at 390 and 1440, Nebula plus one
   other theme: Sanne (sleep and water, Dutch questions), Tom (gym, food logging with recorded barcode fixtures, workouts,
   a GPX import, a weight goal), Lina (bank-file import, budgets, bills, spending questions; never Earn), Max (habits,
   night owl: day ends at 03:00, the day goal, Checklist, streaks, Tasks), Jules (Earn read-only, a watch-only address,
   Markets, money questions to NOVA). Each sets up from "Your first five", uses its pillars, asks NOVA and ZIGi at least
   ten real questions, exports a backup and reloads on day 7. Every friction is a row in REHEARSAL.md; every blocker and
   major is fixed, and every cheap minor; each fix is proven by a spec in its persona's conditions; a wrong or vague
   answer becomes a corpus case (AS's corpus) and is fixed.
2. **AT's carried list:** the UX review's three majors (a meal in words alone; "when will I reach…" leading with the
   pace estimate instead of the target date; an "Allow Health" control in a NOVA reply) and its minors; Dutch coin
   questions (ADR-043 D4); Showcase examples for mood tags and a bill price change (D8: AS's pinned answers updated
   deliberately, marked, equally strict); the roving focus helper measuring every item on each change (D18); ADR-041 D34
   and D36 one more bounded look.
3. **CI headroom (TIER 3 CI):** every main shard with ≥ 10 min headroom, rebalanced by measured durations; the
   account-browser "no progress for 20000 ms" looked at (fixed if the cause is in the test, else recorded).
4. **Friends docs:** FRIENDS_GUIDE.md and Help's Known limitations from what the rehearsal found; a two-minute "First week
   with ZIGoals" note in docs/friends-alpha/.
Budget, stop rules, rules and the end are as in the brief (CLAUDE.md and the session prompt).

## The plan as approved (19 Nov)
Presented once in plan mode; approved as written. In short: Part 0 records (Alpha #57, frozen reader #57); Part 1 the
walks as scratchpad scripts on the production build (fixtures only: food lookup, Earn, Markets, mempool; everything else
503), each persona at 390 and 1440 in Nebula and one more theme (Sanne Light, Tom Dark, Lina Light, Max Dark, Jules
Light), screenshots and console logs reviewed, rows in REHEARSAL.md, fixes proven by `tests/au/` specs; Part 2 the
carried list (a words-only meal as an additive diary entry with unknown nutrients; a goal-ETA intent in the exact layer
that leads with the widget's pace estimate; the existing open-page action to NOVA → Permissions in the "Health is not
shared" reply; Dutch holdings; Showcase mood tags and a price change with AS's pinned answers moved deliberately; the
roving helper measuring only what changed; D34/D36 one look); Part 3 explicit duration-balanced main shard lists
(`playwright.main.shards.ts`, the WebKit pattern) and the account-browser stall; Part 4 the friends docs. Helpers write
code only; builds and browser runs one at a time.

**Owner approval (verbatim):** "Plan approved as written. Two additions:
1. Fresh eyes: after each persona walk, one fresh helper (not the integrator) reviews that walk's screenshots and console
   log, given only the persona's goal and the routes, and lists the frictions it sees; merge its rows into REHEARSAL.md
   (marked as found by the reviewer) before fixing.
2. iPhone Safari: the phone (390) part of each persona's proving spec also runs in CI's WebKit job (name it so the WebKit
   set picks it up, add it to the shortest WebKit shard list, keep every WebKit shard with ≥ 10 min headroom)."

## Decisions
(D-numbers are referenced from code comments; added as the session goes.)

- **D1 (Part 0 records).** PR #107 merged into `main` as `836534c3`. Main CI run 1869 on `3d510124` failed once on the
  integration job's account-browser sync test ("a step made no progress for 20000 ms"); run 1895 on `836534c3` (after
  #107) was green on the first attempt, so it did not recur on main. Alpha #57 = Manual Alpha deployment run 60, source
  `836534c3e9f1d430e52c029594ab29b4e8cd55b9`, version `e0bc17f3-27c0-4900-aa55-416f20ece6f6`, rollback
  `064ff8bc-8cc3-4ae7-8be4-783225ae75dd` (#56), VERIFIED after 4 reads, live prices verified (owner). Frozen readers gain
  #57 (`scripts/frozen-readers.mjs`).
- **D-CI (Part 3, TIER 3 CI).** Run 1895's fourteen main shards took 17.7–50.3 min (Playwright's `--shard` cuts by test
  count); run 1893's shard 4 took 55. The main suite now runs `MAIN_SHARD=n/14`: fourteen explicit file lists in
  `apps/web/playwright.main.shards.ts`, packed from the per-file durations of runs 1895 and 1893 (retries included, the
  larger per file and project, about 883 worker-minutes), simulating two workers; predicted 34–38 min per shard (worst
  order 40), so every shard keeps ≥ 20 min of its 60. The config and `scripts/ci/main-shards.test.ts` check that every
  main-suite spec is in exactly one list and name the list for a new one. The a11y suite keeps `--shard=n/3`.
- **D-SYNC (the account-browser stall).** Run 1869's integration job failed in `scripts/run10/account-browser.test.mjs`
  (b-first) in step "L56 A: waist measurement" (20 s without progress), the same step as AR's run 1830. In both, an
  automatic sync lands about a second into that step (+8.7 s in run 1869: three `sync` POSTs) while the measurement form is
  being filled, and the form's "80 cm" row never appears. The cause is in the app, not the test: a sync that arrives during a
  half-filled Health form (Measurements tab) appears to reset it; it lives in the sync/Health area (TIER 3) and did not recur
  on main after #107 (run 1895). Recorded, not chased here (no second sighting to work from); for a session that owns sync.
- **F-1 (first five).** The setup leaves out of the menu the pages of areas not picked, so "Set a goal" could open a page
  that says "This page is hidden". A step whose page is out of the menu says "Adds <page> to your menu." and its tap adds the
  page back first (the banner's own stamped choice).
- **F-2 (Allow Health).** For a person who set up for Health, NOVA needed three separate switches. NOVA → Permissions shows
  one "Allow Health" button while Health is closed and Today holds Health; it turns on exactly those three on the person's
  tap; defaults stay off; each stays a switch. The replies carry the existing open-page action to where the switches are
  (D-ALLOW-HEALTH); no new action kind, nothing written from a reply.
- **F-3, F-4, F-5 (the setup card; one day for a night owl).** No "Set up ZIGoals" card after a finished setup. Today's habit
  count uses the Habits journal's day. Tasks follow "My day ends at" like Habits and the Checklist (the setting's own words
  now say so); while a day runs past midnight a timed task reads as late. The Agenda's day and NOVA's clock keep the
  calendar (a clock tells the time).
- **F-6 (goal kind).** While the kind is still the money default, a name that sounds like a daily number or a count points
  to "Keep an average" or "Reach a number"; nothing changes until the person taps.
- **F-MEAL (TIER 3 stored formats; AT D20 carried).** Health's foods and diary are strict schemas in every released build,
  so a meal in words goes to its own additive device-only Health-type record `zigoals:meal-words:v1` (the meal-estimates
  precedent): in export, catalogue, welcome check, erase and restore; never synced; not read by ZIGi or NOVA (so they say
  nothing about it rather than count it as zero). "Just describe it" comes first where the person meets "Log a meal".
- **D-ETA, D-NL-COINS, D-ALLOW-HEALTH (TIER 3 AI tools; AT D20, D4 carried).** "When will I reach…" leads with the Goal
  widget's own pace estimate ("an estimate from your pace so far, not a promise"), then the target date; Dutch holdings
  questions answer in Dutch; ZIGi's Health-closed reply follows the question's language and carries one button.
- **The fresh reviewers (owner addition 1).** After each persona's four walks, one fresh helper reviewed that walk's
  screenshots and console log, given only the persona's goal and routes; its rows are in REHEARSAL.md marked **R** and were
  merged before fixing. Five reviews: Sanne 25 rows, Max 25, Lina 25 + 15 minors, Jules 25, Tom 22. Where a reviewer's
  row was the walk script's own doing (a goal created without a target, a mistyped fixture, a form the script did not
  open) it is marked Holds with that cause; where the screenshot was a full-page capture of lazily drawn content (Earn's
  `content-visibility` sections, 15 of them, render when scrolled to: probe on the integration build) it is Holds too.
- **T-6 (privacy).** NOVA's "Day at a glance" read Health's water, meals and sleep while NOVA's Health permission was off
  (its header said "Health off"). The widget now reads those lines only with the permission on — the same second lock the
  Health widgets' bodies use (`useHealthGate`); off, they are left out, never shown as zero.
- **L-2, L-4, L-5 (money).** Imported shop names "grocer", "bakery", "butcher" (and NL) read as Groceries. A bill whose
  price stepped (€15.00 ×2, €17.50 ×2) is one series when every payment is within ±25 % of their middle (variable, lower
  confidence); the price notice compares the latest payment with the most recent one at another price within ~100 days.
  goals.csv and contributions.csv gain a readable amount column at the end; the base-unit columns are unchanged.
- **J-6, T-5, T-7, T-8, T-11.** Search offers "Watch a Bitcoin address (view-only)". A barcode answer that cannot be read
  names the way on. On a phone the workout set table scrolls inside its card and a recent scan's buttons go under its
  name. The export note says what the file is.
- **NOVA at 1440, the Allow Health path.** At 1440 a Health-closed answer sits under the star with "Open the
  conversation"; the conversation's reply holds the Permissions button. Adding a page button under the star would change
  AR's composition (protected), so the path is two taps there, one on a phone (tests/au/sanne.spec.ts).
- **D-ROVING (AT D18).** The roving Tab stop measures only the item used last and walks in order to the first usable one
  instead of measuring every item on every change; the same item is chosen; arrows unchanged.
- **Route weights.** At the first integration build Health was 531.2 of 531 kB: the words-only meal's lazy chunk shared the
  meal-names module with Health's first scripts and the bundler moved code into them. The words form reads the meal names
  from their record instead (re-measured at the next build).
- **D34 and D36, one more bounded look (AT carried).** Neither failed in CI since AT (runs 1893 and 1895 green). D34
  reproduces locally on `main`'s own code: `hud-motion` "fully still (phone)" ×12 under two workers on the baseline
  production build failed 3, 1, 1 and ≥ 2 times in four runs; this branch's build 2 and 2 in two runs under the same
  conditions (6 in a run that overlapped a unit-test job), so this branch does not change it. The failing check is always
  the sky frames counter (1 → 3 inside the two still seconds). Candidate mechanism, read from the code: in still mode the
  star (components/nova/core/star-system.tsx `still()`) draws a frame again on any wake while that frame is not yet
  "proven" by reading its pixels back, and without graphics hardware that read-back can come back empty, so a focus or
  visibility wake inside the window draws twice more. Not changed: the star is NOVA's protected composition (AR), and
  counting those frames differently would weaken the spec. D36 (the first WebGL context as one 6 s task) had no new
  sighting to work from. Both stay carried, D34 now with this mechanism for a session that owns NOVA's star.
- **AT D20's minors (Part 2 item 4).** The rehearsal met two of them and fixed them at their cause: the meal (F-MEAL) and
  the goal creator sending a non-money goal to the money kind (F-6). The others were not hit by any of the five people as
  a block and stay carried as one polish pass, each with its cause: the setup's preselected empty goal amount, its phone
  keyboard hint and "Balanced" unexplained (setup copy and layout); the goal creator's two buttons on step 1 and its 0/80
  counter (a creator design call, also the Max reviewer's M-9); "$0.00" plan lines on a goal with no plan; the habits week
  chart before a habit exists; Wealth's "Refresh prices" with nothing priced; Tasks' filter before "New task"; Agenda's
  future "(0 done)"; the first-five card's focus order; NOVA's two "no AI used" lines and its phone hint (AR's NOVA
  composition, protected).
- **D-SHOWCASE (AT D8 carried).** Labelled example moods and mood tags and a streaming bill whose price went up once are
  seeded (lib/showcase/au-examples.ts). AS's pinned answers moved deliberately, each marked, the oracle recomputing the
  new facts from the raw records. The seed exposed three faults, fixed: a price question reached the bill list (the typo
  fixer reads "expensive" as "expense"); the price answer named the latest payment's month ("in Oct") where the Bills
  page says "since <month>"; NOVA's Bill changes card ignored bills found but not confirmed (Bills and ZIGi count them).
  Spending pace now computes on the Showcase and reads "usual €0.00" (earlier months hold only the late-month streaming
  payment): that is its owner-approved definition (a month with one record counts), kept as it is.

## Closing table

| Item | Verdict | Where |
|---|---|---|
| The dress rehearsal: 5 personas × 390/1440 × Nebula + a second theme, day 1, 2, 7 on a production build | Done: 20 walks (+ reruns), 5 fresh reviews, 57 rows | REHEARSAL.md |
| Blockers and Majors from the rehearsal | Fixed (every Blocker; 32 of 33 Majors), each proven by a persona spec or a unit/corpus case; 1 Major carried (L-6, import preview categories) | REHEARSAL.md, tests/au/ |
| Wrong or vague NOVA/ZIGi answers | Fixed as cases: R-1…R-14, T-12 | lib/ai/evals/as, au-rehearsal.test.ts |
| Privacy: NOVA's glance read Health while closed | Fixed (T-6) | tom.spec |
| AT carried: a meal in words alone | Fixed (F-MEAL, TIER 3 stored formats, additive) | webkit-au-sanne, meal-words tests, frozen readers #37–#57 |
| AT carried: "when will I reach…" leads with the pace estimate | Fixed (D-ETA) | corpus, oracle |
| AT carried: "Allow Health" from a NOVA reply | Fixed (F-2 + D-ALLOW-HEALTH: one button in Permissions, reply buttons) | sanne.spec |
| AT carried: Dutch coin questions | Fixed (D-NL-COINS) | corpus |
| AT carried: Showcase mood tags and a bill price change | Fixed (D-SHOWCASE; AS's pinned answers moved deliberately, marked) | corpus, oracle, ap-minors |
| AT carried: the roving helper measuring every item | Fixed (D-ROVING) | Tab-stop specs unchanged and passing |
| AT carried: D20 minors | 2 fixed by the rehearsal, the rest carried as one polish pass with causes | above |
| AT carried: D34, D36 | Carried with a candidate mechanism (D34 reproduces on main's code) | above |
| CI headroom (TIER 3 CI) | Fixed: 14 duration-balanced main shard lists (predicted ≤ 40 min of 60) | D-CI |
| account-browser "no progress for 20000 ms" | Recorded with cause (an automatic sync during a half-filled Health form); not in the test | D-SYNC |
| Friends docs | Built: FIRST_WEEK.md, FRIENDS_GUIDE 8i and part 9, Known limitations | Part 4 |
| Route weights | Every page inside its budget, none raised; Health at 531.0 of 531.0 kB (no room left) | build 4 |
