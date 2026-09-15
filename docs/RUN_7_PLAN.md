# Astra Run 7 implementation plan

**Goal:** One premium ZIGoals product connecting Today, Goals, Habits and Health without changing financial authority.
**Architecture:** Existing Next/React app and GoalProvider stay authoritative for money/wallet state. Separate versioned browser stores contain Habits and Health. Shared shell, artwork, tokens and activity projections connect them without server APIs.
**Stack:** Node 24.19.0, pnpm 11.19.0, Next 16.3.5, React 19.3.0, TypeScript 5.9.3, Zod 4.6.2, OpenNext 1.20.6, Wrangler 4.131.1; no new runtime dependency.
**Spec:** Owner's complete Run #7 instruction and `ZIGoals_Final_UI_Mockup_V2.png`; approved exact base `b81262f1b9ae7e4a07efb9a6415e64d90fe120f9`.

## Binding boundaries
- Branch `feat/run7-visual-v2-habits-health`; one unmerged PR. No deployment, merge, outreach, chain actions, signatures, contract/release/config changes.
- Keep all original Goal/strategy/ecosystem/mobile/passkey/AI roadmap directions. AI never signs or broadcasts.
- Preserve existing storage keys, Goal math and providers; new module namespaces are independent, private to this browser, and not wallet credentials or automatically linked across wallet accounts.
- Goal links carry an explicit scope (`chainId`, `owner`, `goalId`), not an ambiguous numeric ID. UI only offers links in the active Goal scope; unmatched links remain stored and are described as another scope.
- New stores fail closed on malformed/future-version/oversized data and preserve the original bytes. Atomic edits re-read under existing Web Locks. Imports validate before replacement; exports contain private data and no secrets.
- Real local calendar dates, integer kcal, macro milligrams, food serving grams and body weight grams. No inferred nutrition/medical advice or remote lookups.
- CSS/SVG art only; no raster mockup background, remote fonts, chart/animation library, or CSP relaxation.

## Composition and design decisions
- 224px desktop sidebar; content split into wide cinematic primary column and quieter 300px companion rail at 1440px. Tablet reduces the rail; mobile has a compact header/core navigation and a deliberate short daily summary.
- A curved planetary horizon, sparse stars, nebula glow and original destination art recreate the reference's depth. Build individual vector layers, never a screenshot backdrop.
- Four surface levels and semantic nebula/health tokens; Goals use orbit rings, Habits cadence/heatmaps, Health aurora/gauges, Activity a timeline.
- Three original ZG marks live in `docs/brand/run7/`; chosen SVG in public assets is consumed by one BrandMark. Existing static `/icon.svg` route stays static.
- Empty state has actionable setup with no seeded personal data. Real Local Demo Goal balances remain explicitly simulated; Habits/Health are private user entries, not fake chain state.
- New modules are separate exports/imports to avoid changing proven Goal backup semantics. Nova Health source is available read-only under `~/hermes-company/dashboard/frontend/nebula`; reuse useful concepts only, no personal database or server integration.
- No existing ZIGoals-specific Obsidian/n8n workflow was found in workspace documentation; repository reporting is authoritative. Do not invent a new external recording path.

## Shared private-store interface
`usePrivateStore<T>(key, schema: z.ZodType<T>, createEmpty: () => T)` returns `{ data, loaded, error, update(updater), importData(raw), exportData(), refresh() }`. `update` and import are async, reject on failure, and only publish validated durable writes. No optimistic success. The hook is in `components/use-private-store.ts`; pure validation/locked storage helpers are in `lib/private-storage.ts`.

## Phases and checks
- [x] **0 Audit:** exact clean base, versions, reference and V1 read; current docs reconciled, historical reports preserved. Review doc diff, checkpoint and push.
- [ ] **1 Foundation:** `app/visual-theme.css`, `components/brand-mark.tsx`, `components/scene-art.tsx`, `public/icon.svg`, `docs/brand/run7/`; semantic surfaces and restrained reduced-motion-safe animations. Inspect original mark comparison. Lint/types and static icon tests; checkpoint.
- [ ] **2 Shell:** `components/shell.tsx` plus shell CSS; seven real routes, desktop sidebar/mobile core navigation, existing exact wallet handlers/dialogs and safety text. Existing wallet-reload/route tests; checkpoint.
- [ ] **3 Today:** `app/app/page.tsx`, Today components; reference composition, truthful Goal summaries, daily Habit actions, Health summary and recent local activity. Implement connected cards after module data is available; new persistence is an explicit dependency adjustment ahead of final Today wiring. Empty/populated layout tests; checkpoint.
- [ ] **4 Goals:** dedicated `app/app/goals/page.tsx`; update `goal-card.tsx`, wizard/detail presentation and scoped supporting Habit links. Preserve old URLs and exact financial math/actions. Run existing Goal lifecycle and damaged-storage tests; checkpoint.
- [ ] **5 Habits:** `lib/habits.ts`, `lib/habits.test.ts`, `components/habits/`, `app/app/habits/page.tsx`; strict schema, daily/weekdays, CRUD/pause/archive, counted completions, local-date streaks and heatmap, scoped Goal links. Test daily/weekdays, today grace, missed/not scheduled, pauses, DST/date boundaries, reload/corruption/imports; checkpoint.
- [ ] **6 Health:** `lib/health.ts`, `lib/health.test.ts`, `components/health/`, `app/app/health/page.tsx`; targets, foods, meal diary/edit/removal, deterministic recipe calculations, weight/trend/history, manual activity. Test arithmetic, units, recipe snapshots, corrections, reload/corruption/exports and sentinel egress; checkpoint.
- [ ] **7 Integration:** local unified activity, Ecosystem presentation retaining exact statuses, grouped Settings with secondary diagnostics and separate private exports. Migration test with representative V1 Goal/reconnect keys; checkpoint.
- [ ] **8 Refinement:** up to three substantive 1440px comparisons to the reference, then 1280/768/390/320×800; keyboard/focus/reduced motion and touch controls. No fake state or dead actions. Save screenshots and checkpoint.
- [ ] **9 Gate:** full lint/types/JS tests, production Next build, OpenNext Alpha build/dry-run, deployment-config validation, relevant desktop/mobile/workerd/CSP/wallet/private-egress suites. No local Rust rebuild. Measure gzip delta from ~1623 KiB; investigate >10%. One final bounded independent read-only review, resolve real issues, checkpoint/push, open PR, inspect/fix CI, final visual package.

## Execution discipline
Small coherent commits are pushed at each phase. Pure domain tests precede new behavior; visual changes use browser evidence instead of tests that merely mirror CSS. A bounded Habit and Health implementation track may run alongside shared UI work with exclusive file ownership; integration and all commits remain controlled here. Avoid exploratory agents and repeated whole-suite runs. On a usage/resource warning, finish only the current safe atomic edit, validate, push, record exact remaining work, and stop with no merge.
