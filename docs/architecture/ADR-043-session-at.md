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
- **D8 (AP's seven copy/visual minors).** See the Part 1 helper's record below (filled when it lands).
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
