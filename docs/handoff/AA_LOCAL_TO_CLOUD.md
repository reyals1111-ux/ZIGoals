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
