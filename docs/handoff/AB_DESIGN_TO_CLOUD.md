# Handoff: Session AB-Design → Session AB-Cloud

**AB-Design's branch:** `feature/session-ab-design` (base `main` `6c1052b2`, Alpha #39 per the owner), on the owner's
Mac. Captures: `review/session-ab-design-screens`. AB-Design never edits a path AB-Cloud owns; requests go here.
AB-Design reads `docs/handoff/AB_CLOUD_TO_DESIGN.md` on `origin/feature/session-ab-cloud` at every gate (A, B, C).
Dated entries, newest last. Evidence labels as docs/STATUS.md. Decisions: ADR-024.

## Paths AB-Design owns (please don't edit; ask here)
- **All visual work:** `apps/web/components/**` and the styles of every page (`apps/web/app/*.css`,
  `components/**/*.css`), the shell, sidebar, top bar, phone tab bar, backgrounds, footer, and the visuals of
  Today/Goals/Habits/Health/Wealth/Markets/Portfolio/Staking/Journey/Life review/search/onboarding/Settings — **except**
  Settings → Sync and Settings → Your data files, the Restore flow and the "Point & tell" feedback mode (yours).
- **New art:** `apps/web/public/art/v24/**`, `apps/web/public/showcase/vision/**`, `apps/web/art-src/**`.
- **Device key names:** `apps/web/lib/ab-design-keys.ts` (names only, no imports; the `aa-device-keys.ts` pattern) and the
  ui-prefs reader `apps/web/lib/ui-prefs/**`; the local read-only card-art mirror `apps/web/lib/card-art/**`.
- **Records:** `docs/architecture/ADR-024-session-ab-design.md`, `docs/product/OWNER_UI_REQUESTS_AB.md`,
  `docs/verification/ab-design/**`, this file, AB-Design's STATUS entry.

## Paths AB-Cloud owns (I never edit; I ask here)
`apps/web/lib/vault/**`, sync schemas, `lib/goal-extras/**` schema and mutators, `lib/export/**`, the stores you move
into sync, `workers/**`, `.github/workflows/**`, `scripts/**`, `docs/**` except mine, Settings → Sync, Settings → Your
data files, the Restore flow, "Point & tell". Where a shared file needs one line from me (`lib/onboarding.ts`
`NON_PERSONAL_KEYS`, `lib/export/everything.ts` `DEVICE_KEYS`, `lib/data-health/catalog.ts` `DEVICE_LABELS`), I add that
one line, announce it here, and the second merger keeps both sides.

## 2026-10-14 — opened (Part 0, within the first hour)

### What I need in your files (please apply; I re-check at every gate and wire whatever is missing after your merge)
1. **Goal card art (owner request 17):** the optional `cardArt` art-id field on a goal's extras (`extras.goals[key].cardArt`,
   a string id from my catalogue, e.g. `"garden"`, `"skyline"`) and a `setGoalCardArt(goalKey, artId | null)` mutator in
   `lib/goal-extras/store.ts`. I read the field today through a tolerant read-only mirror (`lib/card-art/mirror.ts`); the
   picker's Save shows "Soon" until your mutator is on `origin/feature/session-ab-cloud`, then I switch one import
   (`lib/card-art/save.ts`). If your commit is not merged before mine, the one-line switch is listed in both handoffs
   for the second merger.
2. **Showcase wording (persona #5):** the tiny "Showcase" chip's popover carries your agreed wording. Until it arrives I
   show: "Fictional records. Exit returns to your own data; Load again resets the Showcase." Please confirm or replace.
3. **`scripts/verify-hosted-alpha.mjs` (lines 92–130):** the "PRACTICE MONEY · PUBLIC ALPHA" box, the LOCAL SIMULATION
   mode strip and the Showcase bar leave the top of every page (owner request 8). The same sentences move into the
   footer's full disclaimer line, where I keep the `network-banner` and `mode-strip` class names on the spans so your
   verifier stays green without a change. You may retarget the selectors to `.site-footer .alpha-disclaimer` when you
   touch that file; nothing is needed before the merge.
4. **Base currency (owner request 24):** when your `defaultCurrency()` lands, I default `baseCurrency` in ui-prefs from it
   (euro-area → EUR, else USD); until then USD.
5. **Vitamins view (owner request 33):** when your data lands, tell me the reader; the view is built on it.

### What I add to shared files (one line each; announced here)
- `lib/onboarding.ts` `NON_PERSONAL_KEYS`: `zigoals:ui-prefs:v1`.
- `lib/export/everything.ts` `DEVICE_KEYS` and `lib/data-health/catalog.ts` `DEVICE_LABELS`: `uiPrefs` / "Display preferences".
- `lib/whats-new.ts`, Help answers, `scripts/weight-budgets.json` (never raised), `lib/search/static.ts`: carried by whichever
  PR merges second, with a merge commit.

## 2026-10-14 — Part 1 (the shell)
- Done on my side: the compact Alpha notice, the Showcase chip (landmark still "Showcase data"), the footer banner with the
  disclaimer line (`.site-footer .alpha-disclaimer`; the `.network-banner` and `.mode-strip` spans keep your verifier's
  selectors and sentences), five phone tabs with More in the top bar; Settings has no icon of its own in the phone top
  bar (owner decision D2, kept by the owner's follow-up).
- **Please retarget (your lane, scripts/**):** on phones (390 px) your journeys open Settings as a visible link —
  `scripts/run10/account-browser.test.mjs` (lines 81, 88, 98, …: `getByRole('link',{name:'Settings',exact:true}).first()`),
  `scripts/run11/account-switch-browser.test.mjs`, `scripts/run11/packaged-runtime.test.mjs`,
  `scripts/run11/packaged-consumer-journey.mjs`, and `scripts/verify-hosted-alpha.mjs` where it does the same. Settings is now
  a row of the More sheet: open More first (`page.getByRole('button',{name:'More',exact:true})`, then the link inside
  `getByRole('dialog',{name:'More'})`), or go to `/app/settings` directly. The desktop sidebar is unchanged. Until you
  retarget, those phone steps would fail against my branch's build; the second merger carries whichever lands last.
- Shared one-liners applied (please keep at the merge): `lib/onboarding.ts` NON_PERSONAL_KEYS, `lib/export/everything.ts`
  DEVICE_KEYS (`uiPrefs`), `lib/data-health/catalog.ts` DEVICE_LABELS.
- Still open from you: items 1 (card art), 2 (Showcase wording), 4 (base currency), 5 (vitamins).

## 2026-10-14 — Parts 2–3 (Today, Goals)
- Card art (item 1): built on my side as a read-only mirror (`lib/card-art/mirror.ts` reads `goals[key].cardArt` from
  `zigoals:goal-extras:v1`'s bytes; the catalogue is `lib/card-art/catalog.ts`, fifteen ids). The picker's Save is
  "Soon" until your `setGoalCardArt(goalKey, artId | null)` lands; the one-line switch is in `lib/card-art/save.ts`.
  Please define `cardArt` as an optional string on `goalExtraSchema` (any string is fine; I validate against the catalogue).
- The Showcase's card arts and vision pictures are keyed by goal id outside the extras record (`lib/showcase/card-art.ts`,
  `lib/showcase/vision-art.ts`), so your `showcaseGoalExtras` needs no change.
- Shared one-liners: `lib/search/static.ts` (two Help entries: `z-status` reworded, `z-alpha` new).

## 2026-10-14 — Parts 4–6 (Habits, Health, Wealth)
- Base currency (item 4): `useBaseCurrency()` in `components/platform/wealth-total.tsx` reads ui-prefs' `baseCurrency` and
  falls back to USD; when your `defaultCurrency()` lands, the fallback becomes it (one line there).
- `lib/wealth.ts`: `WealthHistory.points[].classes` (derived per asset class) feeds the new chart; nothing stored changes.
- `lib/wealth-total.ts`: `splitWealthTotals(subtotals, base?)` gained the optional base; callers without it behave as before.

## 2026-10-14 — Part 7 (identity, Journey, polish)
- Nothing new is asked of you. Shared one-liners this part: none. `lib/routines/templates.ts` renames the "Stretch"
  template to "Morning stretch" (a template title, not a stored record); `components/platform/asset-quantity.ts` only
  renders a metal's quantity as "2 troy ounces of Gold" — the stored asset name and denom are untouched.
- Still open from you: items 1 (card art), 2 (Showcase wording — my chip now reads "Fictional records for <date>. Exit
  returns to your own data; Load again resets the Showcase."), 4 (base currency), 5 (vitamins — request 33 was not built
  this run, so no reader is needed yet).
