# ADR-043 — Session AT: "READY FOR FRIENDS"

Status: in progress (18 Nov 2026). Branch `feature/session-at-ready-for-friends` from `main` `3d510124` (Merge PR #106,
Session AS). One Draft PR. Resume file: `docs/handoff/AT_RESUME.md`.

## Why this session exists
The last big session before the friends Alpha: every carried fix, a trust pass (friends will put real data in), a polish
pass across the app, CI reliability, the remaining buildable roadmap items, the release verifier's new stages, and the
owner's weekend checklist.

## The brief (owner, 18 Nov; summary of the scope in priority order)
1. The carried list: AP's seven copy/visual minors; CSV Value and Unit as their own fields; Someday counts in the Tasks
   menu; Today's Tab stops ≤ 90 on every day and time; Earn's Zignaly wording by date (no deploy on the day; Playwright's
   clock); `a11y-wcag-x:271`; `scripts/pre-run11-setup.test.mjs` on any Node; the other open CI_INTERMITTENTS rows; WebKit
   shard 4 near its limit (rebalance or raise, TIER 3 CI); AL's L7 rows replayed against AS's exact layer.
2. Trust pass: backup → restore round trip with every record kind since AL and Showcase-merge safety; erase removes every
   kind; export files open; "unknown is not zero" and as-of; privacy page and in-app list match what the app sends where.
3. Friends-Alpha polish pass (390 and 1440, three themes; phone performance; one fresh-helper UX review).
4. Roadmap items that fit: Help screenshots (backlog #12), What's new / Known limitations for AR and AS, FRIENDS_GUIDE,
   a landing draft for NOVA (landing/ only, for the owner's local preview).
5. Release verifier (TIER 3, behaviour-preserving): stages for AO, AP, AR and AS where a live read-only check is possible.
6. The owner's weekend list (OWNER_STEPS.md rewritten as one ordered checklist).
Budget and stop rules, rules and the end are as in the brief (CLAUDE.md and the session prompt).

## The plan as approved (18 Nov)
The plan is the one presented once in plan mode (Parts 0–6 above with these specifics): Zignaly wording through one date
helper; Tab stops walked across a week of clocks; shard time rebalanced first, a job limit raised by ≤ 15 min only if
rebalancing is not enough; Help screenshots as committed, lazy-loaded WebP labelled as example data; Showcase examples
for mood tags, symptoms, run splits and bill changes (Showcase seed only); Alpha #57's ids a placeholder unless sent.

**Owner approval (verbatim):** "Plan approved, approval items 1–5 included, with two changes:
1. Zignaly by date: every sentence about the closure states only what Zignaly's own closure notice says, with that notice
   linked (the existing verified "closure-notice" link). If the notice does not name 1 December as the last day to
   withdraw, the 1 December text is "Zignaly closes on 1 December" and from 2 December "has closed".
2. Order: do Part 6 (OWNER_STEPS.md, the weekend list) right after Part 1, then Parts 2–5; push it as soon as it is done."

Order of work therefore: 0, 1, 6, 2, 3, 4, 5, end.

## Decisions
(D-numbers are referenced from code comments; added as the session goes.)

### Part 1 — the carried list
- **D1 (Zignaly by date; owner change 1).** Zignaly's recorded closure notice (help centre, read 18 Oct 2026) names
  1 December 2026 as "The last day to withdraw, until 23:59 UTC. The app closes after that." So the owner's fallback
  ("Zignaly closes on 1 December") is not needed: one helper, `lib/earn/dated.ts` `zignalyClosure`/`zignalyWords`, words
  every closure sentence by today's UTC day: until 30 Nov "is closing"; on 1 Dec "today is the last day to withdraw, until
  23:59 UTC; the app closes after that"; from 2 Dec "has closed" (and the how-to-withdraw steps give way to "Its notice";
  the "leave time before the deadline" risk goes). Used by Earn's Zignaly and Nawa sections, the phone fold, the compare
  table, the Ecosystem card (Zignaly's label and line, Nawa's dependency) and the Academy lesson. Every one of those places
  links the verified `closure-notice` (the Ecosystem card and the Academy lesson gained the link). The glossary and the
  Academy lesson are worded so they stay true on any day. The pages read `now` from the minute clock, so nothing needs a
  deploy on the day. Proven by `lib/earn/dated.test.ts` and `tests/at/zignaly-dates.spec.ts` (Playwright's clock on 30 Nov,
  1 Dec and 2 Dec, both projects, 6 of 6); `earn-options.spec.ts:70` now reads on a fixed November day (deliberate).
- **D2 (`scripts/pre-run11-setup.test.mjs` on any Node).** The two CLI tests spawned the script on the test's own Node,
  so on any Node but 24.19.0 the script's (correct) version check failed them. They now run the script with a preload that
  sets `process.version` to the pinned version; every other check is real. A new test pins the version check itself: on
  `v24.22.3` the CLI fails with `INVALID: tool_node` and "Select repository Node 24.19.0." (stricter than before, where the
  check was only covered on the pinned Node). 11 of 11 on Node 22.23.5 and on 24.19.0. The script is unchanged.
- **D3 (Today ≤ 90 Tab stops on every day and time).** Measured on Showcase Today at 1440 for every day of one week
  (16–22 Nov) at 07:30 and 20:30: 89 in the morning, 90 on weekday evenings, 92 on Monday and Sunday evenings. The extra
  stops were date- and time-dependent cards: the evening Guide nudge's action link ("Open habits"), Sunday's review nudge
  ("Open the review") and a planned reminder card's two buttons ("Open", "Dismiss for today") on Sunday and Monday evenings.
  At the cause: the Guide card's actions and the reminder cards' buttons are each one roving Tab stop (AO's
  `useRovingFocus`, arrows reach every control; the reminder hook lives in a small wrapper so it mounts with the section).
  Now 88–89 on all fourteen clocks. `tests/at/today-tab-stops-week.spec.ts` counts all fourteen (≤ 90 each);
  `tests/ao/today-tab-stops.spec.ts` (88) walks the new groups with the arrows; `guide.spec.ts:83` (deliberate) reaches the
  Guide's controls by the arrows and checks one Tab stop and that Tab leaves the actions in one press.
- **D4 (AL's L7 rows against AS's exact layer; TIER 3 AI tools).** Replayed with the corpus's own on-device `ask()` on the
  Showcase and a fresh profile, NOVA and ZIGi alike. **Fixed (5 rows, 8 ids):** Z-057 ("milestones for all goals" names the
  goal with milestones and every other open goal without them; Dutch too); NB:N11 ("what level am I" answers with Journey's
  own count: level, name, XP and XP to the next level; Showcase labelled; with Health or a counted pillar not shared it says
  the level is unknown here, not zero; with the game layer off, that there is no level); TK:1, TK-048, TK-052 ("how much
  BTC do I have" names Wealth's holding and a Real portfolio's coins separately; a Hypothetical portfolio stays uncounted,
  the existing golden rule `btc-total`). The AI context gains one read-only optional source, `game` (the game layer's switch
  and the Earn Academy record), so a level is counted as Journey counts it (`lib/ai/tools/env.ts`,
  `components/ai/use-ai-context.ts`; no tool added, nothing written; mood tags and symptoms still never read). New intents
  `journey-level`, `goals-milestones` in the corpus (EN and NL); `lib/ai/evals/as/at-l7.test.ts`. **Closed with cause:**
  BN-034 (needs a running model), BN-050 (cross-reference only), LS:#012/#194/#351 and C-LA-07 (a bulk tick with one confirm is
  a write path: owner decision; the honest "one item at a time" answer is now pinned), LS:#046, PR-028, DV-077, DV:N-045,
  N-DV-03 (UI, not answers; their current state is AL's "Changed" evidence), MO-052 (the refusal names both switches;
  the inline button is a Health-lane UI call). **Carried:** Dutch coin questions ("hoeveel BTC heb ik") — the holdings
  answer is English-only, so they reach net worth or a goal.
- **D5 (`a11y-wcag-x:271`).** The test waited for one instant with no running transition; a switch that takes its saved
  state a moment after the page is live starts its fade after that instant, so "On" was read mid-fade (1.96:1, 1 run in 7
  under two workers, AR). The wait now needs 400 ms of quiet in a row; the measurement and its thresholds are unchanged.
  2 of 2 (both projects).
- **D6 (CSV Value and Unit as their own fields; AO D17, AP D22).** The weight import read a line's unit from the value's
  words. Now: a header row maps Date, Weight/Value and Unit by name in any order (Dutch names too; "Weight (lb)" gives that
  column's unit); without a header the order is date, value, unit as before; a bare number takes the unit the person
  chooses ("Unit when a line has none", their own unit first). The preview is a table with Date, Value, Unit (marked
  "your choice" or "header" when not from the line) and "Saved as", and says how the columns were read. Its CSS loads with
  the lazy import, not with Health (0.2 kB from its budget at AR). Theme sheets regenerated. `health-weight-csv.test.ts`
  (+2), `tests/at/weight-csv-fields.spec.ts` (new), `mo-029-weight-csv.spec.ts` unchanged and passing.
- **D7 (Someday counts in the Tasks menu; AP D16c).** "This evening" and "Someday" show their counts like the menu's other
  views, from a small chunk of their own (`components/tasks/tasks-when-count.tsx`) loaded after the page shows, so the
  record's code is still out of /app/tasks' first scripts (AP's reason for carrying it). No number while the record is
  unread or unreadable, or the list is empty; the number follows a move at once. `tests/at/tasks-when-counts.spec.ts`;
  `ap-task-when.spec.ts` unchanged and passing. Route weight read at the integration build.
- **D8 (AP's seven copy/visual minors, ADR-040 D22).** Fixed: (1) Health's folds no longer repeat their label as a
  visible heading under it (the heading stays for screen readers: Symptoms and factors, Copy a meal, the meal photo,
  Supplements, Weekly calorie budget); (2) Wealth's category trend draws no line with fewer than three months and says "a
  month without records is unknown, not zero" (`TREND_MIN_MONTHS`); (3) Age of money reads what it is, the figure with its
  meaning, then how it is counted; (4) Agenda's by-hour checkbox draws its own 2 px border at 8.3:1 on Nebula's panel, 24 px
  in a 44 px target, the system box in forced colours (lazy CSS; theme sheets rebuilt); (5) Settings' repeated "YOUR APP"
  eyebrow is gone; (6) Help says "Price changes on bills" and "Trends" as the cards do (the search index too; "Price changes"
  is now a visible title). (7) partly: the Showcase gains labelled example symptoms and run splits
  (`lib/showcase/ap-examples.ts`; ZIGi and NOVA never read symptoms, pinned). **Carried with cause:** example mood tags
  (they need example moods, which move Session AS's pinned Showcase answers: corpus, oracle, mood map) and an example price
  change (two payments in the money log move the pinned money answers and NOVA's budget); AS's engine and corpus are kept
  as they are, so both stay out and a test checks neither is seeded. Light theme: a checked by-hour box keeps Nebula's
  cyan fill on the pale panel; its dark tick carries the state. `tests/at/ap-minors.spec.ts` 13 passed (1 skipped on the
  phone by design); 15 existing specs in these areas 96 passed; `apps/web/lib` 10,514 passed.
- **D9 (TIER 3 CI: shard time).** Read from runs 1832, 1857, 1860, 1863, 1864, 1865 and 1868 (job walls): Chromium main
  shards 3 and 4 had medians of 48.0 and 49.2 min of their 60 and each was cut at the limit once; WebKit shard 1 a median
  of 37.4 of 45 (one cut, when its WebKit install took 24 min); WebKit shard 4 was cut twice (1864, 1865), both times
  because the cached WebKit install missed and took 28 min, leaving its tests at 132 of 136. Main shard 3's ten slowest
  files are 37 of its ~112 worker-minutes, so no single file explains it. **Changes:** Chromium main shards 12 → 14
  (rebalance: each does about six sevenths of the work; the 60 min stays); the WebKit job's limit 45 → 60 (a 28-min install
  miss cannot be balanced away; the owner's ≤ 15 min). No test, list, assertion or timeout of a test changed. Rollback:
  revert the commit.
- **D10 (the other open CI_INTERMITTENTS rows).** Every fix the file proposes is already in the code (install-chrome's
  attempt limits, the launcher's hold by duration, `webkit-earn`'s cancelled-fetch filter, the settings sweep's 5 s poll,
  `exploratory-round3`'s hydration wait, the Wrapped story held open, `zigi-part-boundary`'s one fetch retry,
  `zigi-earn-coach-af`'s 15 s URL wait). What stays open is recorded, not chased: WebKit class A/B (engine), the headless
  Chromium renderer stall, sandbox-only rows, and ADR-041's D34 (`hud-motion` phone stillness) and D36 (ND-1, the first
  WebGL context as one 6 s task without graphics hardware), whose two fix attempts each are spent.

### Part 2 — trust pass
- **D11 (2(e) privacy page against what the app sends).** Read `lib/egress-policy.json` (browser hosts and server-only
  routes), Send feedback and the routes behind them against `landing/privacy.html`. Mismatches, fixed on the page only
  (headers untouched): the ZIGChain read relay that passes a tracked address (kept in memory ≤ 60 s, never stored) was not
  named; the exchange relay (Kraken, Coinbase, Binance; stateless, the signed request only) was not named; recipe import by
  address (ZIGoals' server reads the page after a public-DNS check) was not named; Send feedback was "only what you type"
  while the app adds its version and, if ticked, device details; the weather proxy was "not built yet" while it is built and
  off. MET Norway's opt-in text is unchanged (its test unchanged). Spotify stays unnamed: it connects only for invited
  accounts, which the public Alpha does not have. `scripts/landing-at-privacy.test.mjs`; landing tests 40 of 40; the
  landing dry run passes. The landing needs the owner's redeploy (OWNER_STEPS step 3).
- **D12 (2(a)–(c) backup, restore, erase, export).** (a) A unit test makes restore coverage structural: every record Export
  everything writes is restorable or deliberately left on the device by AL's plan, named by reason (keys and secrets, ZIGi
  and NOVA settings, runs in progress, display choices, caches, Earn progress and the staking journal, derived views); a new
  record in neither list fails it; every record kind since AL (net-worth history, day goal, day end, This evening/Someday,
  countdowns, money tags, mood tags, symptoms, workout splits, Today orbits, NOVA's stage and world) is restorable
  (`lib/restore/at-restore-coverage.test.ts`). The browser round trip on a fresh profile (`tests/at/trust-round-trip.spec.ts`:
  those records → Export everything, a ZIP holding `everything.json` → Erase everything, nothing of ZIGoals left → Restore →
  each record equal) runs at the integration build. (b) Erase is by prefix and `lib/erase-coverage.test.ts` already keeps
  its database list complete. Showcase merge safety: the Showcase lives in the tab (AO's net-worth history and AR's checks
  pin that a restore never writes example records into real storage).

### Part 5 — release verifier
- **D13 (TIER 3 release verifier, behaviour-preserving).** Stage 14 "AT" appended (`scripts/lib/hosted-alpha-at.mjs`; no
  stage renumbered; stages 1–13 unchanged; the deploy workflow does not run the verifier, CI only runs `--help`). On a fresh
  ephemeral profile, read-only towards every server: Settings' "My day ends at" and "A day counts as done at"; Send
  feedback's details (ticked and unticked; theme and screen among them); then on the Showcase (this tab only) Perfect days,
  the priority matrix's four boxes, Health → Activity's "Your orbits", the Goals Bento switch, and NOVA's answers to the
  owner's two questions of 17 Nov checked by shape (the live day decides the figures) and by the widget each makes. A part a
  build lacks is a review reason (never PASS), a part that is wrong fails the stage, as stage 13 does. Unit tests
  `hosted-alpha-at.test.mjs` (3), the order test (11); the browser run against a local production build is recorded in
  STATUS.

### Part 4 — roadmap items
- **D14 (Help screenshots, backlog #12).** `scripts/help-screenshots.mjs` makes 30 WebP pictures (Today, Habits, Health,
  Wealth, NOVA × Nebula, Light, Dark × 1440 and 390) from the Showcase on a local production build (fixed clock, motion
  reduced, /api refused): 1.7 MB in `apps/web/public/help/`. Help → Getting started → "What do the main pages look like?"
  shows them in the viewer's theme (a phone's picture on a narrow screen), inside the closed answer so nothing loads until
  it is opened (`loading="lazy"`), each captioned "Example data" with the Showcase named. Help's route stays inside its
  budget (no picture is a script).
- **D15 (What's new and Known limitations for AR, AS, AT).** What's new opens with NOVA's exact answers (a new answer,
  "Which questions does NOVA answer without an AI?", AS and AR's composition in words, no new in-sentence link) and the
  screenshots. Known limitations: three lines that had become untrue are corrected (weather is opt-in in NOVA since AM, the
  proxy is what is off; Someday is counted in the menu since D7; Today's orbits card exists since AR) and three added
  (NOVA answers from records only, one Checklist item at a time; a restore brings back records, not device settings; Dutch
  coin questions). `send-feedback.spec.ts` 44 → 47 (deliberate, each line checked by its words); the search index lists
  both new answers.
- **D16 (landing draft for the owner, landing/ only).** "New in the Alpha" gains two cards first, "NOVA answers you" (on
  the device, no model, unknown is never zero; your own AI if you want one) and "Plan your day" (hour grid, This evening
  and Someday, the priority matrix, countdowns), and one NOVA picture from the Showcase under the list, tagged "Example
  data" and captioned as fictional (34 kB on a phone, 118 kB on a computer, lazy). The bento's wide cards follow its three
  longest (LR-11's rule unchanged, its names moved, deliberate); the claims test pins the new cards' words and no
  "Jarvis". Landing tests 40 of 40; landing browser specs 75 passed (weight, layout shift, a11y, layout); headers untouched.
  Not deployed: the owner previews and redeploys (OWNER_STEPS step 3).

### Part 2 (d) and Part 3 — first figures, polish and phone performance
- **D19 (2(d) unknown is not zero, as-of).** A sweep of the first pages a friend sees (fresh profile, 12 pages, 390 and
  1440, three themes) looked for a lone "0" where nothing is known: the zeros left are real counts (0 assets, 0 of 10
  weigh-ins, Today's "Next money steps" count); unknowns read as words or a dash (Health's counters "none yet", the weight
  card "No trend yet", Wealth's allocations "—", NOVA's widgets per AS). As-of stays on every figure that has a source
  (AS's widget feet; Wealth's prices). Holds; nothing changed.
- **D17 (Part 3 sweep).** The same sweep: no page scrolls sideways, no page or console error, no visible text cut (the
  flagged items were 1 px screen-reader texts), at any width or theme. **Fixed:** five checkbox rows were 24 px targets
  (Health's fasting reminder, Settings' "Include my Health records in this encrypted download", the music mini-bar, Point &
  tell; a meal-reminder row at 43): the shared `.checkbox` row is 44 px high (`app/globals.css`; components that set it
  themselves unchanged).
- **D18 (phone performance, mid-range profile: CPU 4×, 150 ms / 1.6 Mbit/s).** Fresh and Showcase, five pages, measured on
  the production build (this sandbox has no graphics hardware, so drawing is slower than on a phone): interactive in
  4.8–7.3 s fresh and 5.5–8.5 s on the Showcase; total blocking 0.7–1.8 s fresh, up to 3.6 s (Today) and 4.5 s (NOVA) on
  the Showcase. Profiles: NOVA's cost is its processor-drawn star and widget render (AR's composition, protected; AR
  measured the same without graphics hardware); the other pages are module evaluation and first layout. **Fixed, the one
  clear cause:** Today's skip-link list re-measured its four targets on the next frame after every class change under
  `main`, forcing a layout on almost every frame while Today loads (about 0.4 s of CPU-4× time on the Showcase); it now
  measures after 150 ms of stillness (at most a second apart while the page keeps changing) and at once when it shows, so a
  settled page has the same list. No budget raised.
