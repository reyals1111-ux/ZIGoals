# ADR-046 — Session AW: "FINISH LINE"

Status: in progress (25 Nov 2026). Branch `feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59, PR #109
merged). Draft PR "Session AW — Finish line". Resume file: `docs/handoff/AW_RESUME.md`. Reviews and walks:
`docs/review/session-aw/`.

## Why this session exists
The last big session before the friends Alpha: after it, the owner does every manual step once (OWNER_STEPS.md, Part 7).
Nothing a session can do may be left open.

## The brief (owner, 25 Nov 2026, verbatim)

SESSION AW — "FINISH LINE" (Claude Code cloud, Opus 5.5, effort High). The last big session before the friends Alpha: after it, the owner does every manual step once. Nothing a session can do may be left open.

START
1. Pull the latest main (expected `8fa8aa1ddc4edd6243c87621b4775f7897410964`, Alpha #59) and create `feature/session-aw-finish-line`. Open a Draft PR "Session AW — Finish line".
2. Read CLAUDE.md, apps/web/AGENTS.md, CONTRIBUTING.md, SECURITY.md, docs/STATUS.md, ADR-045 (both closing tables), and in docs/review/session-av/: LEDGER.md, COMPETITORS.md, UNFINISHED.md, QUALITY.md, FRIEND_READINESS.md. Also docs/review/session-al/CI_INTERMITTENTS.md and docs/friends-alpha/OWNER_STEPS.md, FIRST_WEEK.md and FRIENDS_GUIDE.md.
3. Plan mode once, with one owner approval; after that no questions. Record the plan, the approval and any amendments verbatim in ADR-046. Keep docs/handoff/AW_RESUME.md current (done / in progress / next / team), with "Safe to merge now: yes/no (CI run N)" at every part, also in the PR description.

EXIT CRITERIA (the session ends only when all hold, or the owner writes "wrap up")
E1 CI: two consecutive full runs on the final head green on the first attempt. Fallback, defined now: the last full run is green except jobs that failed only on a registered known intermittent and passed on their one allowed re-run, each named exactly. A red job blocks the end, whoever caused it.
E2 Every row has its own verdict: LEDGER round 7 (#432–#464), every Carried or "built in part" row in LEDGER.md, every open or Carried row in UNFINISHED.md, QUALITY.md and FRIEND_READINESS.md. A verdict is built (commit) / already have (file, opened) / Carried with a cause from this list only: needs an outside service; needs a model; native-only; against a named rule; a new dependency the owner declined; a protected area outside FR-TJ-7; 2 failed attempts. "Effort", "time", "low priority" and "not daily" are not causes.
E3 A fresh-agent check (a reviewer helper who did not write the code) on every batch, with all Blockers and Majors fixed.
E4 The persona walks of Part 3 pass at 390 and 1440.
E5 Records and docs (Part 8).

PART 0 — RECORDS
- Alpha #59 = Manual Alpha deployment run 62, from main 8fa8aa1ddc4edd6243c87621b4775f7897410964 (merge of PR #109), 24 Nov 2026: new version 3a68c327-91c0-490a-b909-c04912b3695e, rollback f2729d28-e9db-436f-a66a-67922cf5d924 (#58), VERIFIED after 3 reads, live prices VERIFIED, build archive SHA-256 29d0a5f2f2548b4a932419f29920413afa1d99a48ddfa5f45c23eb384cac1925, the market policy warning (period ends 2026-11-30T16:00Z).
- PR #103 is closed. Add #59 = 8fa8aa1d to the frozen readers (#37–#59). STATUS Part 0 entry; ADR-046 and AW_RESUME created.

PART 1 — OWNER DECISIONS (22–25 Nov; build exactly these)
a. kcal on manual activities: no estimated calorie burn anywhere. A manual activity shows its minutes, distance and effort. Calories appear only when the person typed them or an imported file carries them, labelled with their source ("from your file", "you entered"). Estimated maintenance on the energy card stays (owner, AK 4.5), labelled "estimate, not medical advice".
b. Passkey unlock (#41): not now. Carried as "owner: Beta". The device lock stays as it is.
c. New dependencies: declined for Mermaid, KaTeX/MathJax, pdf.js and Tesseract (#274, #322, #368, #443). Carried with "a new dependency the owner declined". Their fallbacks stay readable: code, text, the browser's own PDF viewer.
d. Content made for ZIGoals: YES to written content in the repository, NO to recorded audio or video.
 - Write programmes as text: a 4-week beginner strength plan, a 0→5 km running plan in 8 weeks, a 14-day habit starter, a 7-day sleep reset, and a 10-day meditation starter from the written guides.
 - Each programme gets days and steps, progress, Showcase and Help. Every health programme says "general guidance, not medical advice; stop if something hurts". Nothing promises a result.
 - Add "Read aloud" with the device's own voice (Web Speech `speechSynthesis`: no dependency, offline, nothing sent) for written meditations, stretches and programme steps. Offer it only where the browser has a voice; Motion Off and reduced motion are unaffected.
 - Habitica classes and skills stay Carried (game content, game layer off by default).
e. FR-TJ-7: APPROVED as a scoped change inside the protected Habits baseline, phone and desktop.
 - Today's habits and their Complete buttons come first.
 - Empty morning/afternoon/evening groups fold into one "Add a habit" line.
 - Cards with nothing to show yet ("Your week in motion" at all 0, "Trend per habit · Not enough days yet") stay hidden until there is data, with one teaching line instead.
 - Same visual language, hero and card styles. Nothing else in the baseline changes.

PART 2 — STABILISE (CI and real-phone speed)
- Speed on slow devices: measure first load and time-to-interactive of Today, Habits, Health, Wealth, Tasks, Journal, Settings and NOVA on the production build. Use Playwright Chromium with CPU throttling 4× and a phone viewport, before and after, and record it in ADR-046.
 - Fix the worst at the cause: Settings' first scripts and hydration (the WebKit slow-load class: `zigi-voice-z:199`, `zigi-alive:54`), and NOVA's start on a busy machine (`nova-dashboard:210`, the D36 family). Use lazy sections, less work before first paint and no blocking timers.
 - Route budgets are never raised; keep ≥ 5 kB headroom everywhere.
- Every registered or recorded intermittent gets fixed at its cause, at most 2 attempts each: the WebKit slow load, NOVA's slow start, `zigi-browser-agents:126`, `earn-guide-zigi:54`, `sign-in-codes-browser` after A45-1, D34, D-SYNC. A fixed one is removed from the registry with its evidence.
- CI headroom (TIER 3 CI): no WebKit or main shard over 45 min on the slowest measured runner. Add WebKit shards (4 → up to 6) or rebalance by measured minutes; keep the 60-min limit and 2 workers.
- Suite health: merge duplicate or overlapping specs only where the replacement is equally strict (labelled deliberate), so worker-minutes drop. No spec loses an assertion; no check is narrowed (axe scope, timeouts, assertions).

PART 3 — SIMPLICITY PASS (calm first screens, no redesign)
- For Today, Goals, Habits, Health, Wealth, Tasks, Journal, Notes, Agenda, NOVA's entry and Settings, at 390 and 1440, empty and Showcase:
 - the pillar's main action (log, complete, add, check) is visible without scrolling more than one screen on a phone;
 - cards that would show nothing, 0 or "not enough data" stay hidden until they have data, replaced by one teaching line;
 - optional and advanced tools sit behind each section's "More" or "Customise", never deleted;
 - no new card is added to a first screen.
- Settings: groups in a clear order, plus a search that finds every setting by its name and common words (EN and NL).
- Help search: finds every feature by its own name and by the competitor's common name ("snowball", "time blocking", "streak freeze"…). Each Help entry says where to find the feature.
- "Your first five" and first-run guidance updated, so each persona (Sanne, Tom, Lina, Max, Jules) reaches their daily core in under a minute. What's new stays short and grouped.
- Measure it with fresh persona walks, before and after: taps and scroll depth to the main action per pillar. Write them to docs/review/session-aw/SIMPLICITY.md.
- Protected areas stay untouched (Today hero and slogan, Checklist orbit path, footer finale, swan intro, Light's dark islands, shell navigation, Governance hidden by default, the locked ZIGi look, AR's NOVA composition), except FR-TJ-7 as scoped in Part 1e.

PART 4 — ROUND 7 (LEDGER #432–#464)
Build all 31 "to build" rows (Amazing Marvin, Due, Evernote, The Five Minute Journal, Strides, Paprika, Happy Scale, Sleep as Android, Cashew, Money Manager). The drafts from AV exist only on its local branches: rebuild from the ledger rows. Each row is built to the definition of done:
- reachable from its natural place, with an empty state that teaches;
- 320/390/1440 in Nebula, Light, Dark, pure black and high contrast;
- keyboard and axe clean, Motion Off and reduced motion still;
- every new record in export, erase, backup/restore, the catalogue and sync consent;
- where it holds data, NOVA/ZIGi answer about it (corpus case EN + NL);
- a labelled Showcase example, Help and a grouped What's new line;
- unit tests and a spec, route budgets kept (lazy chunks).
New rows land behind Part 3's rules: no new first-screen cards.

PART 5 — EVERYTHING CARRIED, ONCE MORE
Re-read every Carried and "built in part" row (LEDGER, UNFINISHED, the three QUALITY batch-1 Minors, FRIEND_READINESS' 15 Carried and 3 Partly Minors) and every open item in ADR-045. Build what is possible now, and give the rest its E2 cause.

PART 6 — TRUST AND FRIEND-READINESS, FINAL
- Export → erase → restore round trip for every record kind incl. #59's and AW's.
- Encrypted backup restore across #58 → #59 → this head; frozen readers #37–#59 green.
- The privacy page matches what the app really sends.
- Fresh-agent persona walks of all five personas over a first week with Playwright's clock (empty and Showcase, 390 and 1440, two themes) → docs/review/session-aw/FRIEND_READINESS.md. Fix every Blocker and Major and the quick Minors, then re-check with a fresh helper.

PART 7 — ONE OWNER SITTING
- Rewrite OWNER_STEPS.md as one ordered checklist the owner does once after this PR merges: deploy #60, private-sync, verifier, landing, food Worker, Reown, optional switches, acceptance redeploy + Stage 8, hardening, friends.
- Touch `workers/*` or `landing/` only where needed. Every such change is listed in OWNER_STEPS with why. The landing copy must match the app ("ZIGi · your companion", features, privacy).
- Note that the market policy window is the owner's separate task with its own date.

PART 8 — DOCS AND END
- FIRST_WEEK.md, FRIENDS_GUIDE.md, Known limitations and Help screenshots (labelled Showcase) match the app.
- ADR-046 closing table: E1–E5; the ledger counts; the speed before and after; the worker-minutes per run; the intermittents fixed, registered and carried.
- STATUS final entry as the final commit, and a ≤ 12-line report with preview steps.

TEAM AND PACE (owner-approved)
- Up to 6 builder helpers at once, each in its own git worktree on a sub-branch, plus up to 2 helpers for review and research.
- Builders write code, unit tests, specs, Help text and Showcase data, and run typecheck, lint and unit tests in their worktree. They never start a production build or a browser run.
- Shared files only the integrator (you) edits: Help page, What's new, CI shard lists, theme sheets, data catalogue and export/erase/backup registries, device-key lists, the frozen-reader fixture, the NOVA corpus `expected.json`, docs/STATUS.md. A builder returns a short registry list.
- The integrator merges each finished group with a merge commit, then runs typecheck, lint, the full unit suite, frozen readers, ONE production build per batch, route budgets, and the batch's specs plus the touched areas' specs (Playwright at most 2 workers, through the shared lock, one browser run at a time). Then push.
- Push only when no CI run is in progress on the PR. Keep integrating locally meanwhile: nobody waits idle, and no part waits on CI to start. Push at least after every batch.

USAGE
This is meant to be very large. Use the whole remaining weekly budget, and continue from AW_RESUME after any pause or reset without asking. There is no "if time" anywhere. The owner may type "wrap up": then finish the fix in hand, unwire anything half-done, push, and END honestly as in Part 8.

RULES (unchanged)
- Never merge, enable auto-merge, dispatch a workflow, approve a deployment, deploy, or log in to Cloudflare.
- No new dependencies (runtime, dev or Actions) and no outside services. No wallet, contract-signing or key changes.
- Stored data only additive: TIER 3 (stored formats) commits, frozen readers #37–#59.
- TIER 3 labels for CI, PWA, stored formats, sync, auth, AI tools, release verifier, CSP, landing headers, Workers.
- Lint, typecheck and focused tests before every push. Deliberate test changes are labelled "Session AW (<id>, deliberate)", each with an equally strict replacement. Never weaken an assertion, raise a timeout or budget, or narrow a check to get green.
- At most 2 fix attempts per problem, then Carried with its cause.
- Consumer first, chain invisible; private by design; unknown is never 0; estimates say so; no simulated data shown as real (Showcase labelled).
- Design language and readability: headings white → nebula, liquid-glass hover without pointer tracking, labels ≥ 14 px, body 15–16 px, phone inputs ≥ 16 px, targets ≥ 44 px, contrast ≥ 4.5:1, no tiny grey copy.
- Motion Off and reduced motion still and complete.
- English UI, USD/EUR; ZIGi and NOVA in EN and NL.
- Merge commits only, never rebase or force-push. Commit and push per part or batch. The STATUS entry is the final commit.

## The plan as presented (25 Nov 2026, verbatim)


### Context
This is the last big session before the friends Alpha. Branch `feature/session-aw-finish-line` from `main` `8fa8aa1d`
(Alpha #59). Draft PR #110 is open. Part 0 is done and pushed in `485bd80b`: frozen readers #37–#59, ADR-046 with the
brief verbatim, AW_RESUME and the STATUS Part 0 entry. CI run 2031 on Part 0 is the baseline. After this session the
owner does every manual step once. This plan, your approval and any amendments go verbatim into ADR-046, and there are
no questions after it.

**What I read (25 Nov).** The inventory of every row that needs a verdict:
- Round 7: 31 rows to build and 2 Carried (#443 OCR, and #448, which is now buildable as written content).
- 23 whole-row Carried rows and one built in part (#124).
- 41 built rows with a Carried part.
- UNFINISHED: 19 carried, 0 open (the file's counts line is stale), 38 that need the owner (all decided 21 Nov).
- QUALITY: 3 batch-1 Minors.
- FRIEND_READINESS: 15 Carried, 3 Partly, FR-TJ-7 and FR-L-5's Showcase part.

**Measured "before"** (production build of `8fa8aa1d`, Chromium, CPU 4×, 390×844 phone, median of 3, empty profile):

| route | FCP | hydrated (TTI proxy) | blocking time | JS kB | weight / budget (kB) |
|---|---|---|---|---|---|
| Today | 740 | **4312** | 2200 | 989 | 533.9 / 567 |
| Habits | 436 | 3276 | 1508 | 823 | 471.9 / 504 |
| Health | 476 | 3397 | 1813 | 869 | 504.9 / 531 |
| Wealth | 476 | 3217 | 1625 | 998 | 477.3 / 512 |
| Tasks | 468 | 3264 | 1646 | 779 | 442.0 / 468 |
| Journal | 448 | 2968 | 1322 | 783 | 442.8 / 458 |
| Settings | 512 | **4386** | 2049 | 913 | 521.7 / 531 (9.3 kB headroom, the least) |
| NOVA | 356 | 3092 | **2039** | 1148 | 392.4 / 458 |

Settings and Today are the slowest to hydrate. NOVA has the most JS and a long blocking time. The probe script stays
in the scratchpad and is described in ADR-046, so the "after" numbers are taken the same way.

### How the work runs (team and pace, as you approved)
- I am the integrator, on `feature/session-aw-finish-line`.
- Up to 6 builder helpers at once. Each works in its own worktree on `aw/<group>` and runs typecheck, lint and unit
  tests there. No builds, no browser runs.
- Up to 2 review/research helpers. One fresh reviewer, who did not write the code, checks each batch. Every Blocker and
  Major is fixed before the batch is pushed.
- Only I edit the shared files: Help, What's new, the shard lists, the theme sheets, the catalogue, the
  export/erase/backup and restore registries, the device-key lists, the frozen-reader fixture, the corpus
  `expected.json` and STATUS. Each builder hands back a short registry list.
- Per batch I merge each group with a merge commit and run typecheck, lint, the full unit suite and the frozen readers.
  Then one production build, the route budgets (≥ 5 kB headroom everywhere, no budget raised) and the batch's specs plus
  the touched areas' specs (2 workers, one run at a time). Then I push, but only when no CI run is in progress. While CI
  runs I keep integrating locally. AW_RESUME and the PR description carry "Safe to merge now: yes/no (CI run N)".

### Batches (each one: builders → reviewer → fixes → integrate → push)

**Batch 1: owner decisions, speed and round 7 groups X1 and X2**
1. **1a kcal (TIER 3 stored formats).**
   - Remove `activityKcalEstimate`/`ACTIVITY_MET` (`lib/health-activity-types.ts`) and its one display
     (`components/health/health-app.tsx:736`). I'll also sweep workouts, NOVA and answers for any estimated burn.
   - A manual activity gets optional distance, effort and "calories (you entered)". These live in a new additive side
     record keyed by activity id, because `activitySchema` is strict: changing it would break readers #37–#59.
   - Imported calories read "from your file".
   - The energy card's maintenance stays, labelled "estimate, not medical advice".
   - UNFINISHED BL-13 becomes true again. The record goes into export, erase, restore, the catalogue, sync (health
     consent) and the frozen fixture.
2. **1d written programmes and Read aloud.**
   - Five programmes in `lib/guided/programs.ts`: 4-week beginner strength, 0→5 km in 8 weeks, 14-day habit starter,
     7-day sleep reset, and a 10-day meditation starter built from `lib/meditation/guides.ts`.
   - They need days with steps, so the existing guided schema gets an additive extension, and progress is kept in the
     existing `zigoals:guided-journeys:v1` record (also additive).
   - Each health programme carries the care line: "general guidance, not medical advice; stop if something hurts".
     Nothing promises a result.
   - A shared `ReadAloud` button using `speechSynthesis`, shown only when `getVoices()` has a voice. It goes on the
     meditation guides, the stretches player and programme steps. It reuses the voice choice in
     `lib/ai/voice-privacy.ts`, and nothing is sent anywhere.
   - Showcase, Help and What's new for both.
   - This closes ledger #54, #72 (written part), #78, #113, #120, #125, #330, and #195/#196/#278/#448 as written
     content.
3. **1e FR-TJ-7, inside the Habits baseline, phone and desktop.**
   - Today's habits and their Complete buttons come first.
   - Empty time groups fold into one "Add a habit" line.
   - "Your week in motion" at all 0 and "Trend per habit · Not enough days yet" stay hidden until there is data, each
     with one teaching line instead.
   - Files: `components/habits/habit-sections.tsx`, `habits-workspace.tsx`, `habit-consistency.tsx`,
     `habit-trend-list.tsx`. Styles unchanged.
4. **Speed and the slow-load class.**
   - Settings: groups below the first screen move to lazy sections, and the ZIGi body mounts without waiting on the
     whole page's hydration. Less work runs before first paint, and there are no blocking timers.
   - This is the cause of `zigi-voice-z:199` and `zigi-alive:54/137`.
   - Today's first scripts get the same treatment.
   - NOVA: work that is not part of the first frame starts after first paint (D36, `nova-dashboard:210`, ND-1). AR's
     composition and look stay unchanged.
   - Each is measured before and after with the probe and recorded in ADR-046.
5. **Round 7 X1 (Due): #438–#440.** Remind again, own snooze times, and named timers (a new device record; TIER 3
   stored formats and PWA).
6. **Round 7 X2 (Amazing Marvin): #432–#437 and #448.** Task fields are additive optional fields (TIER 3). Everything
   lands behind "More" or Review: no first-screen cards.

**Batch 2: the rest of round 7 and the simplicity pass**
- X3 (Evernote and Five Minute Journal): #441, #442 (the transcript part stays Carried: needs a model), #444, #445.
- X4 (Strides): #446, and #447 only if count goals live in the local store. If they live in a vault or chain record,
  #447 is Carried as a protected area.
- X5 (Paprika): #449–#455.
- X6 (Happy Scale and Sleep as Android): #456–#460.
- X7 (Cashew and Money Manager): #461–#464.
- **Simplicity (Part 3)**, split over three builders:
  - (a) Today, Goals, Health, Wealth.
  - (b) Tasks, Journal, Notes, Agenda and NOVA's entry.
  - (c) A search on the Settings page (EN and NL words, from one index shared with `lib/search/static.ts`) with the
    groups in a clear order. Help search aliases for competitor names ("snowball", "time blocking", "streak freeze"…),
    with "where to find it" on each entry. Also "Your first five" and first-run guidance for the five personas, and
    What's new grouped and short.
  - Rule for every first screen: the main action within one phone screen; empty, 0 and "not enough data" cards hidden
    behind one teaching line; advanced tools behind "More"/"Customise"; no new cards. Protected areas stay untouched.
  - Before and after persona walks go to `docs/review/session-aw/SIMPLICITY.md`, run by a review helper with
    Playwright: taps and scroll depth to each pillar's main action at 390 and 1440, empty and Showcase.

**Batch 3: everything Carried, once more (Part 5)**
- **Answers in Dutch and NL** (one builder): FR-S-13, FR-TJ-16, FR-MAX-6, FR-TJ-17, FR-S-16 (ZIGi's Health-closed
  reply), S-10. Router fixes, with the corpus re-recorded by me.
- **Small app fixes** (one builder):
  - CR-22 (14 px labels);
  - QUALITY b1 #9 (44 px day buttons), #13 (Showcase data within the pinned counts), #17 (task photo count);
  - FR-S-15/FR-TJ-12 ("Log food" opens the sheet lazily);
  - FR-TJ-20, FR-L-14 (bill categories on import), FR-TJ-23/FR-L-16 ("Add money to this goal" on its page);
  - FR-L-17 (an Erase row on the phone), FR-L-5's Showcase part, FR-S-14's Health and Today parts;
  - S-8 (only if it is outside the shell navigation);
  - the water card's late drinks row;
  - #93 (one retry of the CIQUAL download; otherwise it needs an outside service).
- **Already-have checks.** I open each file and record "already have (file)" for BL-10 chess, CR-19, M-9, PK-6, PK-10,
  PK-16, L-9 and PK-18.
- **Speed rows** FR-S-19 and FR-TJ-22 (Help, Showcase Wealth/Today to usable) are fixed in batch 1's speed work, and the
  numbers are re-measured.

**Batch 4: trust, friend-readiness and fixes (Part 6)**
- A unit and spec round trip: export → erase → restore for every record kind, including #59's and AW's new records.
- An encrypted backup restore across #58 → #59 → this head, and the frozen readers #37–#59 green.
- A privacy page audit against what the app really sends: the network calls in the code, compared line by line.
- Fresh-agent persona walks of Sanne, Tom, Lina, Max and Jules over a first week with Playwright's clock (empty and
  Showcase, 390 and 1440, Nebula and Light) → `docs/review/session-aw/FRIEND_READINESS.md`. Every Blocker and Major and
  the quick Minors get fixed, then a fresh helper re-checks.

**Running through all batches (Part 2, mine)**
- **Intermittents**, each fixed at its cause with at most 2 attempts in this session: the WebKit slow load and NOVA's
  slow start (the speed work above), `zigi-browser-agents:126`, `earn-guide-zigi:54` (the popup wait), D34,
  `sign-in-codes-browser` after A45-1, and D-SYNC (the account-browser form reset; TIER 3 sync, in its own commit).
  Each one fixed leaves the registry with its evidence. Each one not fixed is Carried with "2 failed attempts".
- **CI (TIER 3 CI).** WebKit goes from 4 to 6 shards, and the main lists are repacked from the measured minutes of the
  AW runs. The aim is no shard over 45 min on the slowest runner. The 60-min limit and the 2 workers stay.
- **Suite health.** Overlapping specs are merged only where the replacement is equally strict, labelled
  "Session AW (<id>, deliberate)". I report the worker-minutes per run.

**Part 7, then Part 8**
- OWNER_STEPS.md is rewritten as one ordered checklist: deploy #60, private-sync, verifier, landing, food Worker, Reown,
  optional switches, acceptance redeploy + Stage 8, hardening, friends. The market policy window gets its own date
  note.
- I touch `workers/*` and `landing/` only where needed. Each such change is listed with its reason. The landing copy is
  checked against the app ("ZIGi · your companion", features, privacy).
- Then FIRST_WEEK, FRIENDS_GUIDE, Known limitations and the Help screenshots (labelled Showcase). Then ADR-046's closing
  table (E1–E5, ledger counts, speed before and after, worker-minutes, intermittents), the STATUS final entry as the
  last commit, and a ≤ 12-line report.

### Verdicts I will give unless you amend (E2 causes only)
- **Recorded audio or video** (#73, #74, #75, #76, #122, #211's audio, #290's video, #325, #77's recorded library):
  against a named rule, owner decision 1d.
- **Declined dependencies** #274, #322, #368, #443: a new dependency the owner declined (1c).
- **#41 passkey and PK-17**: Carried, "owner: Beta" (1b).
- **#47 Habitica classes and skills**: Carried as decided in 1d ("game content, game layer off by default"), under
  "against a named rule: owner decision 1d".
- **#124's population benchmarks**: against a named rule, the "no comparing with others" rule that round 7 already cites
  for Sleep as Android's national average.
- **#285 licensed glycemic table**: needs an outside service (licensed third-party data).
- **#234 expert articles**: the written self-help part is built; clinical content stays Carried, against a named rule
  (no medical advice).
- **CI-2 (WebKit segfault) and CI-3 (GPU-less renderer stall)**: against a named rule, owner rule 7 (engine crashes are
  recorded, not chased).
- **KL-8 "English only"**: against a named rule (English UI).
- **Parts Carried inside built rows**: they keep their causes where these are already E2 causes (outside service, model,
  native-only, named rule, protected area).
- **UNFINISHED's 38 "needs the owner" rows**: each gets the owner's 21 Nov decision as its verdict ("already have",
  "against a named rule: owner decision", or an owner step in OWNER_STEPS).

### Rules I keep
- No merge, deploy, dispatch or new dependency.
- Stored data only additive, in TIER 3 commits.
- No assertion, timeout or budget loosened.
- At most 2 attempts per problem.
- Merge commits only.
- Labels ≥ 14 px, targets ≥ 44 px, contrast ≥ 4.5:1.
- Motion Off stays still.
- ZIGi and NOVA in EN and NL.
- The STATUS entry is the final commit.

### Verification
- **Per batch:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (the registry, erase-coverage, shard and theme tests and the
  corpus), and `node scripts/frozen-readers.mjs`. Then `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`,
  `node scripts/check-weight-budget.mjs http://127.0.0.1:3101`, the speed probe, and Playwright on the batch's and
  touched areas' specs at 320, 390 and 1440 in five themes (axe, keyboard, Motion Off).
- **CI:** E1, two consecutive first-attempt green full runs on the final head, or the defined fallback with each
  registered intermittent named.


## Owner approval (verbatim, 25 Nov 2026)
The plan-mode approval ("User has approved your plan. You can now start coding."), followed by this message from the owner:

APPROVED, with these amendments (they override the plan where they differ). After this: no more questions; record this message verbatim in ADR-046, then continue in auto mode.

1. NEVER IDLE, OVERLAP THE BATCHES. Batches are integration points, not waiting rooms. While batch N is reviewed, built, measured or in CI, builders already work on batch N+1's groups in their worktrees (round 7 X3–X7, the simplicity groups, the Part 5 builders). Keep up to 6 builders busy for the whole session. Only integration, builds and browser runs are serialized.

2. SPEED TARGETS (Part 2, measured with your probe, same settings, median of 3):
 - every route "hydrated" ≤ 3,000 ms (Today 4,312 and Settings 4,386 now);
 - blocking time down ≥ 30 % on Today, Settings and NOVA;
 - NOVA blocking ≤ 1,500 ms;
 - no route's JS grows.
 If a target is not met after 2 attempts, record the numbers and the cause in ADR-046. Speed is also measured with the Showcase loaded (FR-S-19, FR-TJ-22), not only empty.

3. READ ALOUD PRIVACY (Part 1d). Chrome's network voices (`localService === false`, e.g. "Google …") send the text to a server. Offer only voices with `localService === true`. If none exist, the button is not shown. One line in Help and on the privacy page says so ("uses your device's own voice; nothing is sent"). A spec proves a non-local voice is never chosen.

4. NO ESTIMATED BURN ANYWHERE (Part 1a). Also sweep NOVA and ZIGi answers, widgets, the corpus, exports, Showcase and Help for estimated calories burned. A question like "how many calories did I burn" answers with what was entered or imported, with its source, or says honestly that ZIGoals does not estimate it. Corpus cases EN + NL.

5. CARRIED PARTS INSIDE BUILT ROWS (Part 5). For each of the 41: if a part's cause is not one of the E2 causes (outside service, model, native-only, named rule, declined dependency, protected area outside FR-TJ-7, 2 failed attempts), build that part now. Fix UNFINISHED.md's stale counts line.

6. A WHOLE-APP SWEEP (new, Part 6). On the production build, every route × 390 and 1440 × empty and Showcase:
 - no console errors or warnings (hydration mismatches, React keys, failed requests other than the deliberate offline ones);
 - every button, link and menu item has an accessible name and does something (open safe controls only; never money, wallet, signing, erase or send);
 - no "NaN", "undefined", "null", "Invalid Date", raw keys or `{placeholders}` visible;
 - no text cut off at 320 px or at 200 % zoom.
 Write results to docs/review/session-aw/SWEEP.md and fix every finding.

7. OFFLINE AND WEBKIT FOR NEW WORK (Part 6).
 - Every new record and screen from AV and AW works offline after one online visit (PWA), with a spec.
 - Add the key new flows to the WebKit phone set: FR-TJ-7's Habits, a programme day, Read aloud absent without a local voice, kcal "you entered", the Settings search, and a round 7 timer.

8. SIMPLICITY GUARD. Every tool moved behind "More" or "Customise" stays findable by Help search and the Settings or app search, with a spec per pillar. The before/after walks in SIMPLICITY.md include the number of cards on each first screen.

9. CI TARGETS.
 - Worker-minutes per run reported every run; aim below 1,300 by merging overlapping specs only where the replacement is equally strict.
 - WebKit 4 → 6 shards is approved (TIER 3 CI).
 - If two consecutive first-attempt green runs aren't reached after the last batch, spend up to two more CI rounds fixing causes before using the fallback.

10. PRIVACY AND LANDING (Part 6/7).
 - The privacy audit covers the app's privacy page and `landing/privacy.html`; both must match what the app sends, incl. Read aloud and every lane-2/AW feature.
 - The landing's feature copy matches #60 (ZIGi · your companion; main features by pillar; no claims beyond what is built).
 - Landing changes are owner-deployed: list them in OWNER_STEPS.

11. VERDICT WORDING. #124's population benchmarks: cite the exact rule text and its source file in the verdict. If no such rule exists in the repo, mark it "needs an outside service (published reference data)" instead. #47 stays Carried as planned.

12. FINAL REPORT ADDS. The ≤ 12-line report also states:
 - the speed before → after per route;
 - the ledger totals across AV + AW (built / Carried by cause);
 - worker-minutes per run;
 - any owner decision still open (should be none).
 OWNER_STEPS.md ends with what friends receive.

Everything else in the plan is approved as written. Use the whole budget; continue after any pause or reset from AW_RESUME without asking; the owner may type "wrap up".

## Decisions

### D-CI2031 — the baseline run on Part 0 (main's code)
[Run 2031](https://github.com/reyals1111-ux/ZIGoals/actions/runs/45632710558) on `485bd80b` (docs only over `main`):
29 of 32 jobs green on the first attempt. Red: main shard 10, `earn-guide-zigi:54` (mobile, both attempts; third
sighting after runs 1937 and 2028), and WebKit shard 2, `zigi-voice-z:199` (both attempts; the registered WebKit
slow-load class). Main shard walls 26.9–53.6 min (shard 2), WebKit 22.4–29.9, a11y 12.7–25.5. Measured from the
JSON reports: **main suite 1,227 worker-minutes** (retries included), a11y 97.

### D-EARN54 — `earn-guide-zigi:54`, fixed at its cause (attempt 1)
Reproduced locally: 3 of 4 failed with tracing on, 0 of 4 with tracing off. The trace showed no hang, only the test
timeout: three guides, a reload and every phone fold twice made the one test longer than 45 s once CI's
`retain-on-failure` tracing records every action. The "Open Valdora" click was just the step in flight at 45 s. The test
is now two tests with the same setup and every step and assertion kept (`3115574d`, labelled deliberate in the spec):
24 of 24 with tracing on, both projects, two workers. No timeout raised.

### D-SPEED — Part 2, speed (probe: `scratchpad/tools/speed.cjs`)
The probe opens each route in Playwright's Chromium (the sandbox build) on the production build: CPU throttled 4× over
CDP, a 390×844 touch viewport and an empty profile. It records FCP, DCL, load, "hydrated" (the moment `<html
data-app-hydrated>` is set, which the shell writes after hydration), the long-task blocking time until 1.5 s after load
and the scripts' transfer size. Each figure is the median of 3 runs. A/B runs alternate the base build (`8fa8aa1d`,
:3102) and the new build (:3101) route by route, so the machine's load (six builders) hits both alike.
- **Attempt 1, Settings** (`1df5ca90`): the parts of the five lower groups (27 components, about 130 modules only they
  use) load as their own chunk, still rendered by the server, with their 18 stylesheets kept with the page. Settings'
  weight is 521.7 → 409.5 kB. Traced A/B: hydrated 5,563 → 4,913 ms, blocking 3,093 → 2,482 ms. Untraced A/B: hydrated
  5,118 → 4,998 ms. The largest single task (about 1.6 s, React's hydration of the page's server HTML) is unchanged. Each
  of the other routes measures +1.2 kB: turbopack cut the shared shell into one more chunk, with the same modules in it
  (each module's code is unchanged; gzip of six chunks is about 1.2 kB more than five).
- **Attempt 1, NOVA** (`3e2153c1`, D36): the star's first-frame read-back (`readPixels`) ran in the same task as its
  draw, which held the page until the GPU process had finished the frame. On a runner's software GPU that is about
  200 ms a frame unthrottled (dev profile, `StarSystem…prove`). It now runs 120 ms later, on the same frames, with the
  same "two empty frames mean empty" rule. The probe's CPU throttle does not slow the GPU process, so this sandbox shows
  no change (blocking 2,047 → 2,072 ms, noise). The fix is aimed at CI's loaded runners.
- To be continued (attempt 2), with the numbers in the closing table.

### D-CI-WEBKIT6 and D-CI-SHARDS-AW — TIER 3 CI (`48eb8149`)
- WebKit runs in six shards, not four (owner amendment 9). The lists are packed from run 2031's WebKit logs (each test
  start's gap at two workers). Shard 1 holds `zigi-accept-correct` alone, the old floor (about 25 min on one worker in
  WebKit desktop). Its independent cases now run in parallel on the job's two workers (`describe.configure({mode:
  'parallel'})`, deliberate, every case unchanged).
- The WebKit results JSON is uploaded for every shard on every run, so later packing reads measured durations.
- The twenty main lists are repacked from run 2031's JSON per-file durations, about 62 worker-min each (AV's lists
  measured 45–85).
- The 60-min limit, the two workers and every test stay.
