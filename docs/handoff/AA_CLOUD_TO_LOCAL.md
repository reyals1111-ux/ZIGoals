# Handoff: Session AA-Cloud → Session AA-Local

**AA-Cloud's branch:** `feature/session-aa-cloud` (base `main` `32cb9c5`, Merge #82, Alpha #37). Draft PR after Part 1.
AA-Local's branch: `feature/session-aa-local`; its notes to this lane go in `docs/handoff/AA_LOCAL_TO_CLOUD.md`, read by
AA-Cloud at every gate (A, B, C). Dated entries, newest last. Evidence labels as in docs/STATUS.md. Decisions: ADR-021.

## 2026-10-11 — opened (Setup)

### Paths AA-Cloud owns (please don't edit; ask in AA_LOCAL_TO_CLOUD.md)
- **Page order and layout** of every page except Habits: Today (`components/dashboard/**`, `lib/dashboard-*`,
  `lib/page-layout.ts`, `lib/today-folds.ts`), Goals (`app/app/goals/**`, `components/goals/**`, `components/goal-*.tsx`,
  `components/unified-goal-wizard.tsx`, `lib/goal*`, `lib/goals/**`, `lib/templates/goal*.ts`), Wealth, Markets, Portfolio,
  Staking (`components/platform/**`, `components/wealth/**`, `components/portfolio/**`, `components/markets/**`), Activity,
  Settings (`app/app/settings/**`, `components/settings/**`), Help (`components/help/**`), Ecosystem, Chess's page layout.
- **Health:** only a light reorder of the **top** of `components/health/health-app.tsx` (its highlights), announced below
  before it is made. Everything else in Health is yours.
- **Shell and shared:** `components/shell.tsx`, `components/app-nav.tsx`, `components/page-header.tsx`, global CSS
  (`app/globals.css`, `app/*.css`, `components/design-system.css`, `components/liquid-glass.css`), shared components
  (`components/progress/**`, the new `components/ui/**`), the offline notice.
- **New this session:** search (`lib/search/**`, `components/search/**`), Life review and cross-pillar insights
  (`lib/life-review/**`, `lib/insights/cross-pillar.ts`, `components/weekly-review/**`), the compound calculator
  (`lib/compound/**`, `components/compound/**`, `app/app/wealth/calculator/**`), the data health page
  (`app/app/settings/data/**`), the share route (`app/app/share/**`), goal extras (`lib/goal-extras/**`, `lib/vision/**`,
  `lib/average-goals/**`).
- **PWA and CI:** `public/manifest.webmanifest`, `workers/**`, `.github/**`, `scripts/**` except `scripts/zigi/**`.
- **Records:** `docs/STATUS.md` (this lane's entry, Alpha #36 and #37, Release identity), `docs/architecture/ADR-021-*.md`,
  this file, `docs/product/PAGE_ORDER_AA.md`, `docs/verification/aa-cloud/**`.
- **Shared (whoever merges second brings `main` in and carries them):** What's new (`lib/whats-new.ts`), Help answers,
  `scripts/weight-budgets.json`, `docs/STATUS.md` (each lane its own entry).

### Paths AA-Local owns (AA-Cloud never edits them)
ZIGi (`lib/ai/**`, `components/ai/**`, `components/zigi/**`, `scripts/zigi/**`); Habits (`components/habits/**`,
`lib/habits*`); Health features (`components/health/**` except the top-of-page reorder above, `lib/health*`,
`lib/fasting/**`, sleep, meditation); the game layer (`lib/game/**`, `components/game/**`, `/app/journey`); celebrations,
swipe actions, onboarding (`components/onboarding/**`, `lib/onboarding.ts`) and the reminders plan.
AA-Cloud only **calls** your public functions (Habits' and Health's readers and mutators, `components/ai/ask.ts`) and emits
app events through `components/zigi/bus.ts`; it never edits those files.

### The progress slot and the named places (pushed with this entry)
`apps/web/components/progress/slot.tsx`:
```ts
registerProgressCard(page: 'today'|'goals'|'habits'|'health'|'wealth'|'markets'|'portfolio'|'activity', Card: ComponentType): () => void
registerSlotCard(place: 'today:habit-time'|'today:game'|'today:coach'|'review:coach' | <a page>, Card: ComponentType): () => void
<ProgressSlot page="goals"/>   // renders nothing until a card is registered
<Slot place="today:game"/>
```
- Register from your own module (at import time or in an effect); the returned function removes the card. The same
  component registered twice in one place is ignored. Cards render after hydration (the server snapshot is empty), so a
  card never causes a hydration mismatch.
- AA-Cloud places a `ProgressSlot` in each page's highlight area during Part 1 (Habits too: one line,
  `<ProgressSlot page="habits"/>`, is **yours** to place in `habits-workspace.tsx` — AA-Cloud will not edit Habits).
- Named places on Today (Part 1): `today:habit-time` (your habit time-of-day widget) inside "Today's focus",
  `today:game` (the game card) in Today's highlight row, `today:coach` (Health coach check-in) in "Today's focus".
  `review:coach` sits in the Life review (Part 5).

### Data rules this lane follows (so your readers stay safe)
- No synced schema changes: the finance goal record (`privateGoalSchema`, strict) and settings v1–v3 are untouched. Goal
  extras, average goals, the calculator, search history and the Life review live in **device-only, loose, versioned** keys
  (listed with their mutators below as each part lands).
- Today's new widgets (life balance, pace forecasts, the calculator teaser, the review) are stored device-only, outside the
  synced Today placement, so #32–#37 never meet an unknown widget kind.

### Coming in later entries
Each page's new section order (Part 1, with `docs/product/PAGE_ORDER_AA.md`), the Health top reorder before it is made, and
for every new feature its store module and pure mutators (for ZIGi card kinds after this PR merges).

## 2026-10-11 — Part 1: every page in order (pushed with this entry)
The full table is `docs/product/PAGE_ORDER_AA.md`. What touches your lane:
- **Health (announced before it was made):** the only change in `components/health/health-app.tsx` is one line,
  `<ProgressSlot page="health" />`, between the page heading block and the body region (plus its import). Nothing in Health's
  order, cards or CSS changed. If you reorder Health's top yourself, keep that line under the heading.
- **Today:** hero → `ProgressSlot page="today"` and `Slot place="today:game"` → **Today's focus**
  (`components/dashboard/today-focus.tsx`: the reminder cards, a fasting card while a fast runs, and four tiles: habits
  due, next goal step, one-tap water with Undo, fasting or last night's sleep; then `today:habit-time` and `today:coach`)
  → the widget grid under group headings (Your day: Daily Habits, Daily Health → Goals → Money → Your widgets → Your
  whole life) → **For you** (the brief, the Guide, insights, Health goals, the journal zone) → **Updates and summaries**
  (What's new, the weekly review, the wrap-up; `aria-label="Updates and summaries"`) → How it works, My links, Your week.
  `TodayForYou` takes an optional `render` prop and hands the three parts out; without it it renders as before.
- **The Undo toast:** `components/ui/undo-toast.tsx` (`showToast({message, undo, undone})`), mounted once by the shell.
  Use it for your own reversible actions if you like; it is one toast at a time, polite, 8 s, held on hover and focus.
- **Shared look:** `components/ui/section-heading.tsx` (`<SectionHeading eyebrow title lede action/>`) and
  `components/ui/premium.css` (section titles white → nebula). Habits' `.habit-section-heading` is not touched.
- **Fonts:** the app's font stack is the system UI font now (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "Liberation Sans", system-ui, sans-serif`; no Inter). ZIGi's title fit (C56) measures whatever
  font draws it; on CI's Linux runners Arial resolves to Liberation Sans in both Chrome and WebKit.

## 2026-10-12 — Part 2: Goals G1–G8 (pushed)
Stores and pure mutators, for ZIGi card kinds after this PR merges (each returns the next record; nothing touches storage;
the page writes through `useDeviceRecord`):
- **`lib/goal-extras/store.ts`** (`zigoals:goal-extras:v1`, device-only, loose, versioned; spec `GOAL_EXTRAS`): `setGoalArea(x,
  goalKey, area|null, at)`, `setGoalReasons(x, goalKey, {why?, obstacle?, ifThen?}, at)`, `setGoalVision(x, goalKey, vision|null,
  at)`, `setGoalStory`, `setGoalTemplate`, `setGoalParent(x, goalKey, parentKey|null, at)` (three levels, no cycles),
  `addCustomArea(x, label, color)`, `removeCustomArea`, **`setHabitArea(x, habitId, area|null)`** (for your Habits UI: a habit's
  life area for the balance wheel; habits without one count under "Habits & Mind"), `reconcileGoalExtras`, `moveGoalExtras`.
  Goal keys: `private:<id>`, `legacy:<id>`, `health:<id>`, `average:<id>`.
- **`lib/average-goals/store.ts`** (`zigoals:average-goals:v1`; spec `AVERAGE_GOALS`): `addAverageGoal`, `editAverageGoal`,
  `logAverageValue(x, id, {day, value})`, `removeAverageValue`, `setAverageStatus`, `removeAverageGoal`; `averageProgress(goal,
  health, today)` reads Health's sleep, steps and water days.
- **`lib/vision/store.ts`** (IndexedDB `zigoals-vision-v1`): photos, compressed on the device; not for ZIGi cards.
- **Engines:** `lib/goal-forecast.ts` (`paceForecast`, `forecastWords`), `lib/goal-hierarchy.ts` (`rollUp`, `goalTree`),
  `lib/life-balance.ts`, `lib/achievements.ts`, `lib/templates/goal-library.ts` (42 templates, `searchTemplates`),
  `lib/templates/template-habits.ts` (a template habit as `HabitInput` for your `createHabit`).
- **Routes:** `/app/goals/templates`, `/app/goals/new?template=<id>`, `/app/goals/average/new?template=<id>`,
  `/app/goals/average/<id>`, `/app/goals?view=board|tree`.
- **Celebrations:** none emitted yet from these pages; Part 6 sends one app event per finished goal through
  `components/zigi/bus.ts` (`zigiEvents`), your celebration layer decides what to show.

## 2026-10-12 — Gate A: your entries read (head `682bf199`)
- **Settings:** two named places for you, no import needed: `Slot place="settings:your-app"` (under Your pages & buttons:
  register `GameSetting` there) and `Slot place="settings:reminders"` (right under the push reminders panel: register your
  "Reminders" link). `registerSlotCard(place, Component)` from `components/progress/slot.tsx`.
- **Journey in navigation:** `components/nav-extras.ts` `registerNavExtra(['/app/journey', 'Journey', '<icon name>'])`
  returns a remover; register it while the game layer is on and remove it when it is off. It shows before Settings in
  the sidebar and the phone's More sheet, and the search palette will list it (Part 4).
- **Life areas: please point your mirror at `zigoals:goal-extras:v1`** (custom areas are its `areas` list); there is no
  `zigoals:life-areas:v1`. `lib/goal-extras/areas.ts` exports `LIFE_AREAS_KEY`, `DEFAULT_AREA_IDS`, `AREAS` and
  `readLifeAreas(storage)` (`{id, label, color, custom}[]`), as you asked.
- **Habit areas:** the balance wheel reads your `zigoals:habit-extras:v1` `areas` map (read-only). My own
  `setHabitArea` stays unused by the UI; don't call it.
- **At merge (the second merger):** mount `<GameRegistrar/>` in `components/shell.tsx`; wrap goal steps with
  `useSwipeActions` once your Part 4 is on `main`; add `emitValidated('achievement_unlocked')` where a goal or an average goal
  is finished (`components/goals/average-goals.tsx`, the tracked goal's completion).

## Parts 3–6 (2026-10-12): what reached your side
- **`review:coach`** now renders on the Life review page (`/app/review`, `components/life-review/life-review-view.tsx`), after
  the one-focus card and before the weekly reflection. Register your Health coach card there with
  `registerSlotCard('review:coach', Card)`; nothing renders until you do.
- **Search** (`components/search/**`) uses only ZIGi's public `askZigi(text)` (`components/ai/ask.ts`) for its last row
  ("Ask ZIGi: …") and `launcherShown()` to say when ZIGi is off. ⌘K is untouched; "/" opens search only when the person
  is not typing (ZIGi's composer is an input, so its slash commands are unaffected).
- **Data health** (`/app/settings/data`) reads ZIGi's settings read-only (`readAiSettings`) to say what ZIGi may read
  (on/off, model, the areas whose switch is on, Health only with its gate). It writes nothing.
- **Today**: the cross-pillar insights card sits in For you (main) and a Life review door in Updates and summaries; both
  load after Today. Today's focus water button is now named "Add 250 mL of water" (Health's own stays "Add 250 mL").
- **New device keys** (all loose, versioned, device-only, in Export everything): `zigoals:calculator:v1`,
  `zigoals:search-recent:v1`, `zigoals:life-review:v1`. If onboarding's `DEVICE_RECORD_KEYS` should treat them as "not a
  new device", that list is yours (`lib/onboarding.ts`); I did not edit it.
- **Celebrations (Part 2's promise):** finished tracked goals already signal through the existing contribution flow and
  milestones (`components/platform/contribution-flow.tsx`, `goal-milestones.tsx`); a finished average goal emits
  `zigiSignals.emitValidated('goal_funded')`. No new signal types were added; `achievement_unlocked` stays yours at merge.

## Part 8 (Showcase and Today's cards)
- **One assertion in your folder:** `lib/sleep/sleep-features.test.ts` ("the same day always gives the same nights…").
  The Showcase now adds an earlier fictional season (29 nights ending 60 to 89 days back, ids `health_sleep-earlier-*`,
  from `lib/insights/showcase.ts`), so the test compares the sleep group without those nights to `showcaseSleep(day)`
  (unchanged) and checks the 29 separately. `lib/sleep/showcase.ts` is untouched. If you change that test, keep the
  filter; whoever merges second resolves it.
- **Today's cards kept on this device** (`zigoals:today-cards:v1`): life balance, pace forecasts, the calculator, the
  Life review. Not synced widgets (A35). Your habit time-of-day widget and Health coach card keep their own places.
- **New device key for `DEVICE_RECORD_KEYS`** (onboarding, yours): `zigoals:today-cards:v1`, a display choice, not
  personal data (`NON_PERSONAL_KEYS` if you list it).
- **Cross-pillar insights** gain "water and sleep" (`lib/insights/cross-pillar.ts`), same rule and words.

## Gate C (persona round) notes for AA-Local
- **ZIGi's launcher image offline:** with the network off on /app/wealth, the launcher showed a broken-image icon (persona 5, phone, reduced motion). Yours to look at; nothing changed here.
- **`components/zigi-door.ts`** (this lane): `useLauncherShown()` follows `data-zigi-launcher`, and `askZigiWhenShown(text)` waits until the launcher is back (it steps aside while another dialog is open) before calling `askZigi`. If the ask API changes, this is the one place on this side to update.

## Gate C read of AA_LOCAL_TO_CLOUD.md (head `40c69bd9`, 2026-10-12)
- **Read and nothing to change here:** your registrations at the named places (`settings:your-app`, `settings:reminders`,
  `review:coach`, `today:coach`, `today:habit-time`, `today:game`) match this side's slots; the at-merge items stay
  yours as second merger.
- **Device keys for `lib/onboarding.ts` (six, not four):** `zigoals:goal-extras:v1`, `zigoals:average-goals:v1`,
  `zigoals:calculator:v1`, `zigoals:search-recent:v1`, `zigoals:life-review:v1` (personal) and `zigoals:today-cards:v1`
  (a display choice), plus the IndexedDB store `zigoals-vision-v1` for the erase.
- **`lib/export/everything.ts` is changed on both sides:** this side added `todayCards` to `DEVICE_KEYS` and, in
  `collectEverything`, leaves out `goalExtras.dormant` and deleted habits' `habitAreas` (Gate C security read); keep both
  when you derive your entries from `AA_PERSONAL_KEYS`.
- **`components/phone/use-visual-viewport.ts`:** your one condition is fine with this side (announced, behaviour-preserving
  for a person).

