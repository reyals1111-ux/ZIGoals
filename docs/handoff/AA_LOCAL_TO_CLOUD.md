# Handoff: Session AA-Local → Session AA-Cloud

**AA-Local's branch:** `feature/session-aa-local` (base `main` `32cb9c5a`, Alpha #37), on the owner's Mac. Raw model
runs: `review/session-aa-local-runs`; captures: `review/session-aa-local-screens`. AA-Local never edits a path AA-Cloud
owns; requests go here. AA-Local reads `docs/handoff/AA_CLOUD_TO_LOCAL.md` on `origin/feature/session-aa-cloud` at every
gate (A, B, C). Dated entries, newest last. Evidence labels as docs/STATUS.md. Decisions: ADR-022.

## Paths AA-Local owns (please don't edit; ask here)
- **ZIGi entirely:** `apps/web/lib/ai/**`, `components/ai/**`, `components/zigi/**`, `scripts/zigi/**`, the ZIGi specs,
  `docs/product/ZIGI_ACTIONS_Z.md`.
- **Habits:** `components/habits/**`, `lib/habits*`, the new `lib/habits-extras/**`, `lib/routines/**`.
- **Health:** `components/health/**` (except the light top-of-page reorder you announce first), `lib/health*`, the new
  `lib/health-aa/**`, `lib/fasting/**`, sleep, meditation, `app/api/recipe-import/**`, `lib/server/recipe-import*`.
- **The game layer:** `lib/game/**`, `components/game/**`, `app/app/journey/**`.
- **Celebrations** (`components/game/celebration*.tsx`), **swipes** (`components/swipe/**`), **onboarding**
  (`components/onboarding/**`, `lib/onboarding.ts`, `lib/onboarding-setup.ts`), **the reminders plan**
  (`components/reminders/reminders-plan*.tsx`, `lib/reminders-plan/**`, the new route file `app/app/settings/reminders/page.tsx`
  — a new file only, in your Settings folder, so the page exists; the link to it is yours, below).
- **Records:** `docs/architecture/ADR-022-session-aa-local.md`, `docs/verification/aa-local/**`, this file, AA-Local's
  STATUS entry. Device keys: `apps/web/lib/aa-device-keys.ts` (names only, no imports: the `w-device-keys.ts` pattern).

## 2026-10-11 — opened (Part 0, within the first hour)

### What I need in your files (please apply; I re-check at every gate and wire whatever is missing after your merge)
1. **Settings → Your pages & buttons:** mount `components/game/game-setting.tsx` (`<GameSetting/>`, a client component,
   its own chunk; renders the "Game layer" switch and one line of what it does; off by default for real people). It reads
   and writes only `zigoals:game:v1`, never settings v3.
2. **Navigation:** an entry for `/app/journey` ("Journey") in the sidebar, the phone's More sheet and your search index.
   Please show it only while the game layer is on: `import {useGameEnabled} from '../components/game/use-game-enabled'`
   (a hook reading `zigoals:game:v1`, no personal content, hydration-safe: false on the server snapshot).
3. **Settings:** a link "Reminders" to `/app/settings/reminders` in the group where the push and wrap-up settings sit.
4. **Today's slots (your named places, thank you):** I register `today:habit-time` (the habit time-of-day widget),
   `today:game` (the compact quest/XP card; a slim strip that expands on phones) and `today:coach` (the Health coach
   check-in) from my own modules, and `review:coach` for the Life review. Nothing else to do on your side.
5. **Swipes on goal steps:** `components/swipe/use-swipe-actions.ts` exports `useSwipeActions({onComplete, actions})`
   with its CSS in `components/swipe/swipe.css` (right completes, left only reveals, delete needs your confirmation and
   Undo). If you agree, wrap each goal step's row with it after my Part 4 lands; the rules and a usage example are in
   that file's header.
6. **Celebrations: one renderer (owner edit 4).** My `components/game/celebration.tsx` renders every celebration in the
   app. Please emit, never render: a goal reached → `emitValidated('goal_milestone_reached')` (existing), a goal
   finished → `emitValidated('goal_funded')` (existing), and for the new achievements the two new events I add in
   `components/zigi/semantic.ts`: `achievement_unlocked` and `level_up` (ZIGi's lane; you only call `emitValidated`).
   Each is celebrated exactly once per id through `zigoals:celebrations:v1`.

### Life areas (owner edit 1)
I use your `lib/goal-extras/areas.ts` ids exactly: `health`, `mind`, `wealth`, `relationships`, `career`, `learning`,
`fun`, plus the person's custom areas from `zigoals:life-areas:v1`. Until your merge I read that key through a tolerant
mirror that never writes it (`lib/habits-extras/areas-mirror.ts`); after the merge the mirror becomes a one-line
re-export of your module. Please export from `areas.ts`: `DEFAULT_AREA_IDS`, `AREAS` (id → label), a reader
`readLifeAreas(storage)` returning `{id, label, custom}[]`, and the key name. A habit stores only the area id
(`zigoals:habit-extras:v1`, device-only).

### Fields you may want to show
- `lib/habits-extras/store.ts`: `readHabitExtras(storage)` → `{areas: {[habitId]: areaId}, quitCost: {[habitId]: {perDay, currency}}}`
  (device-only); `habitsByArea(habits, extras)` for a Goals-side "habits in this area" line.
- `lib/health-aa/coach.ts`: `coachCheckIn(health, today)` → the week's sentence and the keep/adjust state; the card for
  the Life review is registered at `review:coach` by my module, so you need only the slot.
- The game layer: `lib/game/xp.ts` `xpSummary(stores, today)` (level, XP this week) if the Life review wants a line.

### What I never change
Your pages' order and layout, the shell, global CSS, shared components, `scripts/weight-budgets.json` (the second merger
carries it), What's new and Help (the second merger carries both; my drafts come with Part 9's commit).

## 2026-10-12 — Part 1 pushed (Habits H1–H6, H8) and Part 2 in progress
- **Announced edits to shared files (one line each, additive):** `components/vault-sync-controls.tsx` calls
  `forgetAaDeviceRecords()` beside `forgetZigiFace()` so the account's erase removes this lane's device keys;
  `components/health/health-app.tsx` places `<GameRegistrar/><ProgressSlot page="health"/>` just above the view
  tabs (your light top-of-page reorder can move that one line; it renders nothing while the game layer is off).
- **One more ask (shell):** mount `<GameRegistrar/>` from `components/game/registrar.tsx` once in `components/shell.tsx`
  (a client component that renders nothing; it registers the game cards in every page's progress slot and in
  `today:game`). Until then the Habits, Health and Journey pages mount it themselves, so the cards show there.
- **The slot mirror:** `components/game/slot-local.tsx` mirrors your `components/progress/slot.tsx` exactly (same names and
  shapes); after the merge it becomes `export * from '../progress/slot'`.
- **The habit time-of-day widget for `today:habit-time`** registers from `components/habits/habit-time-card.tsx` (Part 2
  follow-up); Today's existing habits widget already groups the due habits by section (H1).
- **Events you emit, which my renderer celebrates once a day per kind:** `goal_milestone_reached`, `goal_funded`
  (ZIGi's bus carries the type only, so no id can cross). Nothing to render on your side.

## 2026-10-12 — Gate A: your entries read (head `0fbf9746`), Parts 3–5 on the way
- **Followed:** life areas now read from `zigoals:goal-extras:v1` (`areas: [{id: 'custom-…', label, color}]`; B11 corrected,
  no `zigoals:life-areas:v1` anywhere on my side); the slot mirror matches your `components/progress/slot.tsx` exactly
  (`settings:your-app`, `settings:reminders`, the `div[data-slot]` wrapper, `className`), so `GameSetting` and my
  "Reminders" link (`components/reminders/reminders-link-card.tsx`) register at your two Settings places from
  `components/game/register.ts` — nothing to mount on your side any more for those two. `review:coach` and `today:coach`
  are registered by `components/health/coach-card.tsx` (`registerCoachCard`), `today:habit-time` by
  `components/habits/habit-time-card.tsx`, `today:game` by the game module; all four run from `registerGameCards()`.
- **At the merge (mine, as second merger):** `registerNavExtra(['/app/journey', 'Journey', …])` while the game layer is on,
  `<GameRegistrar/>` in the shell, goal-step swipes, `achievement_unlocked` on a finished goal/average goal, your four
  new device keys in `lib/onboarding.ts`, the sleep-features test filter, ZIGi kinds for goal-extras and average goals.
- **New in my lane since Part 2 (nothing of yours touched):** Health N1–N12 (`lib/health-aa/**`, `components/health/*-aa*`,
  the `[TIER 3] (egress/security)` recipe route `app/api/recipe-import/route.ts` with a THREAT_MODEL section), swipes
  (`components/swipe/**`, applied to habit cards, Today's habit rows and diary entries; the hook is ready for your goal
  steps), the welcome's focuses step and Undo setup, the reminders plan page, twelve ZIGi kinds (ADR-022 B37–B39,
  `docs/product/ZIGI_ACTIONS_Z.md`).
- **Gate A, shared files touched (one line each, announced here):** `scripts/sanitize-alpha-tail.mjs` lists the new
  `/api/recipe-import` bucket (its test requires the list to equal the route files); `lib/export/everything.ts` derives
  its eleven AA entries from `AA_PERSONAL_KEYS`/`AA_DISPLAY_KEYS` (same names, same files in the zip);
  `components/vault-sync-controls.tsx` imports `forgetAaDeviceRecords` at run time inside the erase (the shell carries none
  of it). The weight gate: no budget raised; the shell is 1.2 kB below main's build (ADR-022 B41), so your merge has room.
- **Gate B (security read), two more shared-file lines:** `components/export-everything.tsx` adds the progress photos as files to the
  zip through one `await import('../lib/health-aa/photos')` line and a third, optional argument of `buildEverythingZip` (`lib/export/everything.ts`:
  extra entries; default empty, so your call sites are unchanged). The erase in `vault-sync-controls.tsx` now also deletes the photo
  database (inside the helper it already calls; the component's line only gained a `.catch`).
- **Gate A, one condition in your phone module (announced):** `components/phone/use-visual-viewport.ts` marks
  `data-keyboard=open` only while a text field has focus (`textFieldFocused()`; `focusin`/`focusout` re-evaluate). Chrome's
  mobile emulation under Playwright's fake clock reports a layout viewport taller than the visual one for a moment on load,
  which the detector took for a keyboard and hid the ZIGi launcher for the whole page (every ZIGi phone spec on a page
  with the game card). Nothing changes for a person: a keyboard always comes with a focused field (ADR-022 B44).

## Gate C (2026-10-12, head f7251e03): what changed that touches your lane, and how the pieces fit after your merge
- **CI's full browser suite had never finished on this branch** (every Milestone quality run was cancelled by the next push); at Gate C it showed 75 failures from Parts 1–4, all reproduced and fixed locally (ADR-022 B49–B51). Nothing of yours was edited; the shared-file lines above are unchanged.
- **Named places on Today:** my `today:habit-time` card ("Today's focus") stands down while Today's own habits widget is on the page (`document.querySelector('.placed-module[data-module="habits"] .habits-today')`, read in an effect), so no check-in appears twice; keep that rule if your Today keeps the widget, drop it if the widget goes. Today's widget itself lists at most five due habits, the clock's part of the day first (`lib/habits-extras/sections.ts` `todayFocus`), under slim group labels; the Habits page keeps four open `<details>` panels (all open until the person folds one; the clock's one carries `data-now`).
- **The game card is not a layout item** on Habits/Health (it follows the page's own sections, outside the `LayoutRegion`), so the pinned region orders of the existing specs (`ui-design-pass`, `phone-pages`, `ui-evidence`) still hold. After your merge your `ProgressSlot` places it where you decided; the second-merger list in ADR-022 B40 applies.
- **Health:** the weight-trend / energy / coach cards open the journal block (`health:journal`), not a new layout item; `.health-summary + .nutrition-dashboard` stays adjacent (`run9-2-life.spec.ts`). The fasting item renders its timer and timeline inside one block because `PhoneFold` forwards layout attributes only to a single child element — worth knowing if you add a second child to a folded item.
- **Swipe rows** (`components/swipe/swipe-row.tsx`): the row's content stays the host's own direct children (no wrapper), the indicator and the action row come after it; at rest the row makes no stacking context and clips nothing (a row's own menu opens over the rows below); a `div` host carries `role=group`. If you take the hook for goal steps, mount it the same way.
- **Lazy pieces** render inside the existing `LoadBoundary` (quiet) everywhere, so a chunk that cannot be fetched offline never takes the page down (QA-23). The full habit card is static on the Habits page again (a lazy component suspends on a new card's first render even with its chunk cached: focus and the Guide's "Open habit" scroll landed on a fallback); Today imports only `habit-completion.tsx`.
- **Today ceilings** (`tests/today-screens.spec.ts`): 11.5 (Showcase) and 5.5 / 5.0 (seeded Local Demo), from 9.7 and 4.2 / 3.85 — the Showcase's seven habits, the game strip, the coach check-in and the longer What's new card; CI's Linux fonts run ~0.6 screens taller than this Mac. If your Today changes height, recalibrate from CI's `TODAY_SCREENS` line rather than from a Mac.

## Merged (2026-10-12, the second merger)
- `origin/main` `e3fa408d` (your PR #83, Alpha #38) is merged into `feature/session-aa-local` as a merge commit; the eight conflicts were resolved by keeping both sides (ADR-022 B52) and the whole second-merger list is done (B53): the slot and areas mirrors re-export your modules, the registrar is mounted once in the shell with Journey in navigation while the game layer is on, your Settings places carry the game switch and the Reminders link, the coach card sits in `review:coach`, goal milestones swipe, finished goals emit `achievement_unlocked`, `lib/onboarding.ts`/the erase/the data catalog cover both sessions' keys, the search index lists both sessions' pages and answers, and ZIGi learned your features (nine kinds). Your `sleep-features.test.ts` filter is untouched. Nothing of yours was edited beyond the additive wiring named here (`shell.tsx` one mount, `search-trigger.tsx` a `?search=` query, `average-goals.tsx` one signal, `goal-milestones.tsx` the swipe row, `static.ts` entries, `catalog.ts` labels, `use-proposals.ts` a device write before a navigation).

