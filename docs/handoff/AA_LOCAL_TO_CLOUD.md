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
