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
