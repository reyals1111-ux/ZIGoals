# ADR-045 — Session AV: "ALPHA QUALITY"

Status: in progress (20 Nov 2026). Branch `feature/session-au-dress-rehearsal` (PR #108, "Session AU + AV", Draft), from
Session AU's head `3ea87dff` (`main` `836534c3` already merged in; `main` has not moved). Resume file:
`docs/handoff/AV_RESUME.md`. Audit: `docs/review/session-av/UNFINISHED.md`. Competitors: `docs/review/session-av/COMPETITORS.md`.

## Why this session exists
The last session before the friends Alpha goes out (Sunday 22 Nov): green CI on the first attempt, nothing that can lose a
friend's data or crash after a deploy, every carried item closed, headroom on every page, an accessibility sweep, and the
best remaining competitor features.

## The brief (owner, 20 Nov; summary, in priority order)
1. CI green on the first attempt (run 1925's ND-1/D36, `p3-nova-polish:111`, `dashboard-visual:11` mobile; D34; the
   account-browser stall); two consecutive full CI runs green on the first attempt.
2. No crash or stale app after a deploy (TIER 3 PWA): chunk-load and "module factory is not available" recover by one reload
   with "Updated to the newest version"; "A new version is ready" when an update waits; a spec serving build A then build B.
3. No lost data on a friend's phone: persistent storage where supported; iPhone Safari outside the Home Screen gets a calm
   one-time explanation with Add to Home Screen steps; a gentle backup reminder after meaningful new data.
4. Carried items: AU's L-6; AT's D20 minors; the button under the star at 1440; anything else AU or AT carried that needs no
   outside service or model.
5. Headroom: every route ≥ 5 kB under its budget (budgets never raised).
6. Accessibility sweep: axe on every route × three themes × empty/Showcase × 390/1440; a keyboard-only walk; names on every
   control.
7. Competitor gaps: a shortlist in the plan, built after approval, each with a Showcase example, Help, unit tests and a spec.
8. Friends docs: FIRST_WEEK, FRIENDS_GUIDE, What's new, Known limitations; OWNER_STEPS checked against the final code.
Budget, stop rules, rules and the end are as in the brief (CLAUDE.md and the session prompt).

## The plan as presented (20 Nov)

### Context
Last session before the friends Alpha (Sunday). Branch `feature/session-au-dress-rehearsal` (PR #108, head `3ea87dff`; `main` `836534c3` is already merged in, nothing to merge). PR retitled "Session AU + AV", stays Draft. Run 1925 on `3ea87dff`: 24 of 26 green; red = main shard 12 (`p3-nova-polish:62` ND-1 1920 Showcase on both tries, `:111` flaky — both the same signature: `.nova-frame` not `data-opening=done` within 5 s, D36) and main shard 2 (`dashboard-visual:11` mobile, 45 s test timeout inside `openAllSettingsGroups`, both tries). Decisions go to `docs/architecture/ADR-045-session-av.md`; resume file `docs/handoff/AV_RESUME.md` (done / in progress / next), kept current; push after each part and ≥ every 30 min.

### Part 0 — records (first commit)
ADR-045 (brief + this plan + the approval verbatim), AV_RESUME, STATUS stub, PR retitle. Frozen readers stay #37–#57.

### Part 1 — CI green on the first attempt (TIER 3 CI only if CI files change)
- **D36 (ND-1/ND-3, I own the star):** measure on a production build with a trace which task holds the main thread after `/app/nova` mounts (the probe is already in a worker since AS; the page's own `getContext('webgl')` in `components/nova/core/star-system.tsx` setup is the suspect). Fix at the cause in the star's start, look unchanged: the page context and shader compile are created after the dashboard's first paint (idle, bounded) and, where the worker already reported software rendering, the first still frame is drawn from that deferred start — so the opening's `done` is committed and painted before any multi-second task. Spec unchanged (5 s stays 5 s).
- **D34 (AU's mechanism):** in still mode a wake that changes nothing re-reads the kept frame (`preserveDrawingBuffer` is on) instead of drawing it again; two empty reads still mean "empty" → the picture, as now. Same strictness, no extra frame counted. `hud-motion` ×12 under two workers on the build as proof (it failed 1–3 of 12 per run on `main`).
- **`dashboard-visual:11` (mobile):** reproduce on the build; read the trace for where the 45 s go (two viewports + Settings' groups at 320 px). Fix the cause (app or helper wait), never a longer timeout as the only change.
- **account-browser stall (D-SYNC):** an automatic sync landing while the Measurements form is half filled resets it. Reproduce with `scripts/run10/account-browser.test.mjs` locally (Miniflare); fix in the app so an incoming sync never resets a form being edited (TIER 3 sync, separate commit, behaviour-preserving otherwise). If it cannot be reproduced in two attempts: Carried with the trace evidence.
- Goal: two consecutive full CI runs green on the first attempt (poll ≤ every 10 min).

### Part 2 — no crash or stale app after a deploy (TIER 3 PWA, own commits)
Today: `public/sw.js?v=<commit>` waits for "Reload" (`components/notify/notify-sync.tsx`), but an old tab only learns of a new build when it loads new HTML; a client navigation can fetch the new server's RSC payload and chunks that the old runtime cannot use ("module factory is not available", ChunkLoadError on a deleted chunk); `LoadBoundary` and `app/app/error.tsx` then show "could not be opened".
- **Version skew:** set Next's own `deploymentId` to the build commit (`next.config.ts`; docs `deploymentId.md`: a mismatch on navigation becomes a full page load). The SW keeps hashed files with `ignoreSearch` so `?dpl=` does not break the offline install. If the release verifier, CSP or `check-alpha-artifact` refuse `?dpl=`, fall back to an app-level check: the server answers the commit in a header the client compares on visibility/navigation (decided by measurement, ADR-045).
- **Chunk failure → one reload:** a small client guard (`lib/sw/update-recovery.ts`, loaded from `instrumentation-client.ts`) recognises chunk-load and module-factory errors (window `error`, `unhandledrejection`, `LoadBoundary`, `app/app/error.tsx`, `global-error.tsx`), reloads once (session-scoped guard: never twice within 60 s, never while a form holds unsaved text → then the existing "Reload" note), and after the reload a calm one-time toast "Updated to the newest version." (Motion Off respected; no toast if nothing reloaded).
- **"A new version is ready":** the waiting worker is also checked on focus/visibility (`registration.update()` + a fetch of the current commit), so an open tab is told, not only a fresh one. Words unchanged ("A new version of ZIGoals is ready…").
- **Proof:** `tests/av-update.spec.ts` builds nothing itself: CI-free local script `scripts/av/two-builds.mjs` serves build A then build B (two `.next` outputs, same port, same browser profile via `launchPersistentContext`) — old tab navigates after the swap: no page error, one reload, the notice, then the new commit in Settings. Also a unit test of the error matcher and the guard. The browser spec runs in CI against a single build by serving a recorded "build B" manifest (a route that answers a different `x-nextjs-deployment-id`/missing chunk 404), so CI proves the recovery path every run.

### Part 3 — no lost data on a friend's phone
- `lib/install/persist.ts` already asks only on a tap (owner decision L3; this brief supersedes it, recorded in ADR-045): ask `navigator.storage.persist()` once automatically after the first meaningful saved record, **only where it never prompts** (Chromium, Safari/WebKit; Firefox keeps the tap). Result kept in a new additive device record.
- **iPhone Safari outside the Home Screen** (`navigator.standalone === false`, iOS WebKit): a calm one-time card on Today after the first records: why (7 days without a visit can clear data), the Add to Home Screen steps (reuse `components/help/install-guide.tsx`), "Got it" / "Remind me later" — never again after "Got it".
- **Backup reminder:** extend `lib/backup-reminder.ts` with "meaningful new data since the last marked copy" (e.g. ≥ 25 new records or 14 days with new records): one dismissable toast-free card on Today linking to Export everything; "Not now" quiets it 14 days; off switch stays in Settings → Your data; Motion Off → no entrance motion.
- Stored data additive only: `zigoals:keep-notes:v1` ({version, persistAskedOn, persistResult, iosNoteSeen, backupAskedOn}) — device-only, in export/erase/catalogue/welcome check; frozen readers #37–#57 must pass (TIER 3 stored formats, own commit). Spec in Chromium + a `webkit-av-keep` phone spec in the shortest WebKit list. FIRST_WEEK.md and Known limitations updated.

### Part 4 — carried items
- **L-6:** a Category column in the bank-import preview (`components/wealth/…import…`), each row's guessed category editable before import (uses the same rules as "To review"); spec + unit test.
- **AT D20 minors** (each fixed or Carried with cause in ADR-045): setup's preselected empty goal amount, phone keyboard hint, "Balanced" explained; the goal creator's two step-1 buttons and 0/80 counter; "$0.00" plan lines on a goal without a plan; habits week chart before a habit; Wealth "Refresh prices" with nothing priced; Tasks' filter before "New task"; Agenda future "(0 done)"; first-five focus order; S-12 "Night saved" note covering averages; M-12 the "Added…" note covering the row, filter chips without scroll hint, P3 in the priority list; L-7 weekly-budget card. NOVA's two "no AI used" lines stay (AR composition).
- **The button under the star at 1440:** the Health-closed answer under the star gets the same existing open-page action as the conversation ("Open Permissions"), placed in the answer's own action row (the answer card's existing slot; star, rings, stage and layout unchanged). The brief names it; this is the only touch near AR's composition, measured at 1440/1920 with the ND-1 layout audit.
- S-8 (409 px for a moment after reload): find the element, fix if cheap.

### Part 5 — ≥ 5 kB headroom on every route (budgets never raised)
Measure every route on the first build (`scripts/check-weight-budget.mjs`), then lazy-load what first paint does not need, constants-only modules, no new shared chunks in the shell. Known: Health 531.0/531 (needs ≥ 5), Tasks 463.6/468, Settings ~527/531, Today 560.4/567 (6.6, and Parts 2–3 add a little to the shell/Today, so trimmed too). Every new feature in Parts 2–3/7 ships as its own lazy chunk.

### Part 6 — accessibility sweep
- axe (existing `tests/p6-axe-all.spec.ts`/`a11y-audit.ts` pattern) on every route × Nebula/Light/Dark × empty/Showcase × 390/1440 as `tests/av-axe-sweep.spec.ts` (local run; CI gets it in the a11y shards if it fits their headroom, else one theme per shard).
- Keyboard-only walk spec `tests/av-keyboard.spec.ts`: Your first five, log a habit, a meal (words), a money record, ask NOVA, Settings — every step by Tab/Enter/Space/Escape, visible focus, focus returns after sheets.
- Every serious/critical finding fixed; names on unnamed controls.

### Part 7 — competitor gaps: the shortlist (10; each web-only, on-device, no service, no model)
Swept 32 candidates from the 17 apps; most already exist (habits quit/skip/notes, subtasks, matrix, Pomodoro, This evening, age of money, rollover budgets, savings challenges, recipes, micronutrients, weight trend, year in pixels, rewards, FI, net-worth history, snowball/avalanche). Gaps or halves:
1. **Debt payoff: both orders side by side** (Undebt.it): snowball vs avalanche vs minimums with "interest saved" and every date labelled "an estimate from today's balances and rates, not a promise" (polish of `components/wealth/debt-planner.tsx`).
2. **Prompt of the day in the Journal** (Day One): one daily prompt shown on the compose screen, rotating by date from `lib/journal-prompts`, "Another prompt", never stored unless written.
3. **Three good things** (Finch/Day One): a gratitude template with its own count and a calm streak in the Journal (existing journal entries, tagged; no new store).
4. **Tasks done per day and week** (Todoist karma, without points): a small chart in Tasks from `completedLog` (last 14 days / 8 weeks), lazy.
5. **Workouts: weekly distance and volume** (Strava): 8-week bars from the workout log (Health, lazy chunk).
6. **Running bests** (Strava): fastest 1 km / 5 km / 10 km from GPX splits already parsed, labelled "from your imported files".
7. **Spending vs last month per category** (Copilot): a delta column in the category trend view.
8. **Subscriptions: yearly total** (Rocket Money): monthly-equivalent and yearly total of recurring bills, with each bill's "cancel by" note listed.
9. **Bill calendar on Wealth → Bills** (Rocket Money/Monarch): the month grid NOVA already has (`components/nova/widgets/bill-calendar.tsx` logic), lazy.
10. **Cash flow: income → categories flow** (Monarch): a simple flow diagram in the cash-flow view (SVG, no library), from the month's records.
Each: Showcase example (labelled), Help text (What's new), unit tests, a spec. Not taken: YNAB "save X by date" targets (new stored field), a Finch pet (art + design call). **Owner note:** `lib/health-aa/energy.ts` / `components/health/energy-card.tsx` show an "energy estimate" from intake vs weight trend — this may conflict with your rule "no calorie expenditure is estimated"; left as is, listed for your decision.

### Part 8 — friends docs
FIRST_WEEK.md, FRIENDS_GUIDE.md, Help's What's new and Known limitations for AU and AV (counts in `send-feedback`/help specs moved deliberately, marked); OWNER_STEPS.md checked against the final code (Sunday order; market policy deadline 2026-11-30 16:00 UTC).

### Budget, order, rules
Order 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (Part 5 runs alongside each build; features land lazy). ≤ 4 helpers (code only); one build / one browser run at a time, Chromium ≤ 2 workers; new phone specs also in the WebKit set (shortest list), new main specs in the shard list the config names. ≤ 2 fix attempts per problem, then Carried with cause. TIER 3 commits labelled (PWA, CI, stored formats, sync). Lint, typecheck, focused tests before every push. Never merge, dispatch, deploy or log in to Cloudflare.

### Verification
Per part: unit tests (vitest) + the named specs on a production build (`PUBLIC_ALPHA_UNDEPLOYED`, port 3101); route weights after each build; frozen readers #37–#57; theme sheets `--check`; the two-build update script locally; CI: two consecutive runs green on the first attempt on the final head (or each red job explained in STATUS). End: ADR-045 closing table, STATUS entry as the final commit, a ≤ 12-line report.

## Owner approval (verbatim, 20 Nov)
APPROVED, with these amendments (they override the plan where they differ). After this: no more questions; record this message verbatim in ADR-045.

1. NO HALF WORK. Definition of done for every feature, carried item and fix: reachable from its natural place (pillar, Today, or NOVA where it fits); an empty state that teaches; works at 320, 390 and 1440 in Nebula, Light and Dark; keyboard and axe clean; every new record included in export, erase, backup/restore, the catalogue and sync consent; where it holds data, NOVA/ZIGi answer at least one real question about it (corpus case, EN and NL); a Showcase example (labelled); Help and What's new; unit tests and a spec; route weights inside budget (lazy chunks). Anything that cannot meet this is not shown (not wired into navigation) and is Carried with the cause. Nothing visible may be half-built. The branch is shippable at every push.

2. NEW PART 4b, UNFINISHED-FEATURE AUDIT (before Part 7). Sweep the app and docs for everything started and not finished: every open row in CARRIED.md, NEXT_SESSION_BACKLOG.md, CI_INTERMITTENTS.md, REHEARSAL.md, the carried lists of ADR-038 to ADR-044 and the polish picklists; TODO/FIXME in apps/web; "coming soon" or placeholder copy; settings or buttons that do nothing; controls disabled without saying why; features reachable from only one place or from none; NOVA widgets or tools without a data path; Help or Known limitations describing something that isn't there. Put it in one table in docs/review/session-av/UNFINISHED.md (id, what, file, status: finished / hidden honestly / Carried with cause / needs an outside service, a model or the owner). Finish every row that needs no outside service, model, dependency or protected-area change.

3. COMPETITOR SWEEP IN DEPTH. Write the full matrix to docs/review/session-av/COMPETITORS.md: all 17 apps, at least 8 top features each, and ZIGoals' status per feature (have / half / missing / not web-possible / against a rule), naming the file that proves "have" and saying what is missing for "half". Then build up to 16 features (not 12), ranked by how often friends would use them daily. Keep the 10 proposed ("Spending vs last month" and "Subscriptions: yearly total" may merge if both are small). Add these if the matrix confirms they are missing or half:
 a. YNAB-style budget targets ("save X by a date", "spend up to X a month"). An additive stored field is allowed (TIER 3 stored formats, frozen readers #37–#57); every date is an estimate and says so.
 b. Bearable-style "What affects your mood, sleep and energy": on-device patterns across habits, sleep, mood, workouts, water and caffeine, labelled "a pattern in your records, not a cause", only behind the Health switches, with a minimum amount of data before anything is shown.
 c. A guided weekly review across the pillars (Things/Todoist/Sunsama): last week's wins, misses, money and health, then three focuses for next week, ending in tasks or goals.
 d. Faster meal logging (MyFitnessPal/Cronometer): copy yesterday's meal or a whole day, saved meals, recent and frequent foods first.
 e. Tasks quick add in natural language, EN and NL ("tomorrow 9am call mum p1 #health"), and flexible repeats ("every 3 days after done").
 f. "On this day" in the Journal (Day One).
 Skip the Finch pet.

4. ENERGY CARD: not a conflict. The owner asked for MacroFactor-style estimated maintenance and adaptive targets in Session AK (4.5). Keep it. Check that every number it shows says "estimate, not medical advice" and that unknown is never shown as zero.

5. iPHONE STORAGE (Part 3). On iOS, a Home Screen web app can have storage that is separate from Safari's tabs. Verify this (docs and WebKit). If it is separate, the Add to Home Screen card first says "Export a backup here, then open ZIGoals from your Home Screen and restore it", with a one-tap export, and the Home Screen app's first run offers "Restore a backup from Safari". A friend must never open the Home Screen app and think their data is gone. The card sits below Today's hero (protected), never on it. The automatic persist request superseding L3 is approved (only where it never prompts).

6. UPDATE RECOVERY (Part 2). Never reload automatically while a form, sheet, import, restore or confirm card (money or wallet) is open; show only the "Reload" note then. No reload loop (session guard). In CI, prove recovery with Playwright route interception (a faked 404 chunk, a different deployment id), not an app route: nothing test-only ships in the Alpha artifact. Do not use OpenNext's skew protection or anything that needs Cloudflare API tokens, preview URLs or worker version settings. check-alpha-artifact and the release verifier must pass; if deploymentId changes what they check, use a TIER 3 (release verifier) commit, behaviour-preserving.

7. ORDER AND SUNDAY. 0 → 1 → 2 → 3 → 5 → 4 → 4b → 6 → 8 (first pass, OWNER_STEPS included) → 7 → 8 (final pass). Parts 1–6 and the first pass of 8 must be green and pushed before Part 7 starts. Each Part 7 feature lands as a complete commit series; if the limit stops you mid-feature, it is not wired in. Use the whole budget; after the Sunday 12:00 reset, continue from AV_RESUME without asking. At every part, write "Safe to merge now: yes/no (CI run N)" in AV_RESUME and the PR description.

8. ACCESSIBILITY (Part 6) also covers 320 px width and 200 % text zoom (reflow, nothing cut off), focus never hidden under sticky bars or the shell navigation, and reduced motion / Motion Off on every new widget.

9. END. ADR-045's closing table also summarises the competitor matrix (built / already had / carried, with reasons) and the audit table's counts.

## Decisions
(D-numbers are referenced from code comments; added as the session goes.)

- **D0 (Part 0).** PR #108 continues; `main` `836534c3` is already in the branch (no merge needed). Frozen readers stay
  #37–#57. The automatic persistence request supersedes owner decision L3 (approved, amendment 5: only where it never
  prompts). The energy card stays (amendment 4).

- **D36 (ND-1, ND-3; run 1925 main shard 12).** Measured on this branch's production build at 1920 × 1080 with the
  Showcase (CPU profile and long-task log, scratchpad `probe/`): the star's WebGL was not the cost (the page's context took
  7–15 ms and came after the opening's end; the first ask is in a worker since AS). The opening's 2.1 s timer ended 3 s
  late because the whole-rows fitter (`components/nova/cards/whole-rows.tsx`) forced about 60 page layouts of about 30 ms
  each while the widgets arrived (1.9 s of the main thread). Two causes fixed in the app, both answer-preserving:
  (1) React writes an empty `name` on the Tasks widget's checkbox and takes it away again on every render; the fitter read
  that as a change of content and forced a full measure each time (about ten during the opening, and once a second after,
  on NOVA's clock). A field's `name` never changes a size, so it is no longer content (DOM test: zero reads for it, a real
  change still measures). (2) The rows that fit are found by halving instead of one row at a time
  (`lib/nova/cards/whole-rows.ts`); a property test over 4,000 random panels (stacked and side by side, uneven rows,
  minimums) proves the counts equal the old walk's. The fitter's main-thread time fell from 1.9 s to 1.0 s. Then the spec's
  own setup: its `showcase()` helper wrote NOVA's "already seen" record (and the eight widgets ND-2 counts) to
  `localStorage`, but the Showcase reads only its own tab store (`lib/showcase-storage.ts`), so every Showcase case played
  the two-second opening under its 5 s wait. The helper now writes the record where the Showcase reads it
  (`Session AV (D36, deliberate)`; every assertion and the 5 s are unchanged; the opening is covered by the opening specs).
  Evidence: before, 1920 Showcase failed 2 of 3 and 3 of 5 under two workers; after, the whole `p3-nova-polish` spec ×3 under
  two workers 78 of 78.
- **D34 (`hud-motion` "fully still (phone)").** Measured with a draw log on every canvas (a temporary probe spec, not
  kept): in each failure the window fired two `resize` events ~110 ms apart right before the counted two seconds, and the
  star drew one still frame for each (1 → 3). They come from the spec's own element screenshot: a stage taller than the
  390 px window is captured by widening the window and putting it back, and a still star is rightly drawn again for each new
  size. AU's candidate (an unproven frame drawn again on a wake) is not what happens, so the star is unchanged (a change made
  for it was measured, found not to be the cause, and reverted). The spec takes its first picture before counting, waits out
  the capture's redraws like the stage's arrival, then demands the same two still seconds, the same frame count and the
  same pixels (`Session AV (D34, deliberate)`). Evidence: before, 5 of 20 phone runs failed under two workers; after, 20 of 20.
- **D-DV (`dashboard-visual:11` mobile; run 1925 main shard 2).** A trace showed 18.5 of the test's 33.5 s in its two
  full-page evidence screenshots: the phone project draws three device pixels per CSS pixel, so the 1440-wide Today was a
  very large image (13.6 s), and on CI the test then ran out of its 45 s in Settings. No assertion reads the picture; it is
  now taken at CSS pixels (`scale: "css"`). Every check unchanged; the mobile run fell from 39 s to 14 s (6 of 6 on both
  projects).

- **D-SYNC (the account-browser stall, AU's D-SYNC).** Three local runs of `scripts/run10/account-browser.test.mjs`
  (both cases each, real Chrome, Miniflare, this branch's production build): 6 of 6 passed, the step "L56 A: waist
  measurement" included. Read for a mechanism: the measurement form's state is local to `components/health/body-measurements.tsx`
  and survives a data change; it is lost only if the Health page unmounts, which happens when every private store reloads on
  an account event (`components/use-private-store.ts` `onAccount`, from `lib/account-session.ts` announce: lock, unlock,
  adopt). No automatic sync path found that announces one. Two sightings in about 60 CI runs (1830, 1869), none since.
  **Carried** with this evidence (stop rule: no reproduction to work from; sync is TIER 3).
- **D-PWA ([TIER 3] (PWA), Part 2).** What a deploy does to an open tab, read from the code: Next 16.4 already compares the
  server's build id with the page's own on every page change and falls back to a full page load on a mismatch
  (`next/dist/client/components/router-reducer/fetch-server-response.js`: `x-nextjs-deployment-id` or the payload's build
  id), so `deploymentId` is **not** set (no `?dpl=` on asset addresses, nothing for the release verifier or
  `check-alpha-artifact` to change; no OpenNext skew protection, no Cloudflare setting). What was left is code the old
  version loads later on demand: the deploy removes those files, and the part (or, without a `LoadBoundary`, the page)
  failed. Now (`lib/sw/update-recovery.ts`): a failure to load code ("Loading chunk … failed", "Failed to fetch dynamically
  imported module", "module factory is not available", Safari's "Importing a module script failed") first asks the app's own
  server which version it serves (a HEAD to `/app`, never stored; the `X-ZIGoals-Build` header every page already carries).
  The same version is a network hiccup: nothing reloads, the part keeps its own words. Another version: one reload into it,
  and the reloaded page says "Updated to the newest version." once; never while the person is in the middle of something
  (an open dialog, sheet or confirm card, `data-update-hold`, a field they changed that still holds what they put in), never
  offline, never twice in ten minutes (a tab-only guard, `zigoals:update-reload:v1` in sessionStorage, listed in
  erase-coverage's NOT_RECORDS): then only "A new version of ZIGoals is ready · Reload". Hooked into window `error` and
  `unhandledrejection` (instrumentation-client.ts), `LoadBoundary`, `app/app/error.tsx` and `global-error.tsx`. An open tab
  also asks its server's version when it comes back to the front (at most every ten minutes) and shows the same note; a
  waiting worker of the page's own version (a page loaded after the deploy) takes over quietly instead of asking for a
  reload it does not need. Proof in CI (amendment 6, interception only, nothing test-only in the app):
  `tests/av-update.spec.ts` (main shard 2): a removed on-demand file after a deploy → one reload, the view opens; the same
  version → no reload, the part's own words; the toast once; busy → the note, no reload, the half-typed text kept; no loop;
  a page change answered by another deployment → a full page load, no crash; an open tab hears of a new version → the note,
  Reload loads it. Unit: `lib/sw/update-recovery.test.ts` (34). Locally with two real production builds (A `de32b3fc`, B `972af640`; 11 chunk files
  removed, 11 added) served one after the other on one port to one browser profile, service worker on
  (`scripts/av/two-builds.mjs`): 10 of 10 (A's open tab hears of B, a page change loads B fully, no crash screen, Settings
  names B, a page already on B never asks to reload for B, B's worker takes over quietly, no chunk or module error).
- **D-J4 (journey 4b, found while proving D-PWA).** Offline, the Checklist's history heat map (loaded on demand) had no
  `LoadBoundary`: when it had not been fetched online, the whole page said "This page could not be shown." (2 of 6 local
  runs). It now fails as itself and the orbit keeps working (`components/checklist/checklist-page.tsx`; the orbit path is
  untouched). Journey 4 offline 12 of 12 after.

## Closing table
(filled at the end)
