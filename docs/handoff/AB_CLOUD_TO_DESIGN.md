# Handoff: Session AB-Cloud → Session AB-Design

**AB-Cloud's branch:** `feature/session-ab-cloud` (base `main` `6c1052b2`, Alpha #39), in a cloud sandbox. Decisions:
ADR-023. AB-Cloud never restyles a page; requests to AB-Design go here, and AB-Cloud reads
`docs/handoff/AB_DESIGN_TO_CLOUD.md` on `origin/feature/session-ab-design` at every gate (A, B, C). Dated entries, newest
last. Evidence labels as docs/STATUS.md.

## Paths AB-Cloud owns (please don't edit; ask here)
- **Sync and storage:** `apps/web/lib/vault/**`, the sync schemas, `apps/web/lib/goal-extras/**` (schema + mutators; the
  visuals that read them are yours), `apps/web/lib/export/**`, every lib store this session moves into sync (the device
  records listed in ADR-023 C4), the new `apps/web/lib/restore/**`, `apps/web/lib/point-tell/**`,
  `apps/web/lib/showcase-copy.ts`, `apps/web/lib/image-header.ts`, `apps/web/lib/health-vitamins/**`.
- **Workers, CI, scripts, docs:** `workers/**`, `.github/workflows/**`, `scripts/**`, `docs/**` (except your ADR-024, your
  handoff and your verification folder).
- **Settings → Sync** (`components/vault-sync-controls.tsx`, `components/vault-sync-panel.tsx`, the new
  `components/sync/**`) and **Settings → Your data** (`app/app/settings/data/**`, `components/data-health/**`,
  `lib/data-health/**`), the new **Restore** flow (`components/restore/**`) and the new **Point & tell** mode
  (`components/point-tell/**`). You may restyle Restore and Point & tell later; please tell me here first.
- **Records:** ADR-023, `docs/verification/ab-cloud/**`, this file, AB-Cloud's STATUS entry.

## Shared files (whichever PR merges second carries both sides)
docs/STATUS.md, What's new (`lib/whats-new*`, release id), Help (`components/help/help-page.tsx`), the search index
(`lib/search/static.ts`), `scripts/weight-budgets.json`, the Your data catalog (`lib/data-health/catalog.ts`), the
welcome's key lists (`lib/onboarding.ts`), Export everything's key lists (`lib/export/everything.ts`).

## 2026-10-13 — opened (Part 0, within the first hour)

### The early contract (Part 1; I announce here when it is pushed)
1. **`cardArt` on a goal.** The goal-extras record (`zigoals:goal-extras:v1`, `lib/goal-extras/store.ts`) gains an
   optional `cardArt` on each goal entry: an art id string, `/^[a-z0-9][a-z0-9-]{0,59}$/`. Loose and versioned like the
   rest of the record: an id your renderer does not know is ignored (fall back to the default card), and a new version of
   an art is a new id (for example `nebula-2`). The pure mutator:
   ```ts
   import {setGoalCardArt} from '../lib/goal-extras/store';
   // extras: GoalExtras, goalKey: 'private:<id>' | 'legacy:<id>' | 'health:<id>' | 'average:<id>', at: ISO time
   const next = setGoalCardArt(extras, goalKey, 'nebula-1', new Date().toISOString()); // null clears it
   ```
   Undo: call it through `components/goals/use-goal-extras.ts` → `change(goalKey, next, message)`, which already keeps
   the entry as it was and restores it from the toast. `cardArt` syncs in the encrypted `goals` extras section (Part 2),
   so a choice made on one device shows on the other.
2. **Your device keys, never synced.** I wire `lib/ab-design-keys.ts` into Export everything, the account erase, the
   welcome's key lists (`NON_PERSONAL_KEYS`) and the Your data catalog. Until your file is on `main` I keep a stub with
   exactly this export (please keep these names, or tell me the new ones here):
   ```ts
   export const UI_PREFS_KEY = 'zigoals:ui-prefs:v1';
   /** Display preferences with nothing personal in them: exported, erased with the account, never synced. */
   export const AB_DESIGN_DISPLAY_KEYS: readonly string[] = [UI_PREFS_KEY];
   ```
   The second merger keeps your version of the file and drops my stub.
3. **The Showcase's words** (owner edit 2): `lib/showcase-copy.ts` exports `SHOWCASE_CHIP` (a few words for the chip) and
   `SHOWCASE_SHEET` (the longer explanation for the first-visit notice and the chip's sheet), both plain strings, plus
   `SHOWCASE_FOOTER` (one line for the footer disclaimer). They say what the Showcase does exactly: fictional examples,
   Load or Reset starts them fresh for today and clears anything added in the demo, Exit returns to your own data.
   Pushed with Part 8; the exact strings will be here.

### What will appear in your areas (each a new file + a one-line insertion; please keep both sides at merge)
| Part | New component | One-line insertion in |
|---|---|---|
| 2 | `components/sync/extras-sync-choice.tsx` (the extras switch, the one-time note, "Remove from the cloud") | `components/vault-sync-panel.tsx` (mine) |
| 4 | `components/health/vitamin-fields.tsx` (vitamin inputs on the food form) | `components/health/health-app.tsx` (food form) |
| 4 | `components/health/vitamin-rows.tsx` (vitamin rows after the seven, with editable targets) | `components/health/micro-panel.tsx` |
| 4 | vitamin totals in a recipe | `components/health/health-app.tsx` (recipe section) |
| 5 | `components/restore/restore-backup.tsx` (Restore from a backup) | `components/data-health/data-health-view.tsx` (mine) |
| 6 | `components/point-tell/*` (the pin button, the pins, the list panel) | `components/shell.tsx` (one lazy mount) and `app/app/settings/page.tsx` (the switch) |
| 8 | the History Delete Undo | `components/ai/history-view.tsx` |
Every insertion is one line (an import plus one element) placed at the end of its block, so a restyle around it keeps it.

### Data shapes you may want for visuals
- **Vitamins (Part 4)** — device key `zigoals:health-vitamins:v1`, synced in the `health` extras section (Health
  consent): `{version: 1, foods?: {[foodId]: Vitamins}, entries?: {[diaryEntryId]: Vitamins}, targets?: Partial<Vitamins>}`
  where `Vitamins = {aUg?, cMg?, dUg?, eMg?, kUg?, b12Ug?, folateUg?}` — integers in micro-units: `Ug` keys are
  micrograms × 1000 (nanograms), `Mg` keys are milligrams × 1000 (micrograms). This keeps 2.4 µg of B12 an integer. Unknown
  values are absent, never 0. The view helpers will be `vitaminDay(...)` (today's totals: total, known count, entries,
  target, direction) like `microDay`.
- **Extras sync state (Part 2)** for any status visual: `useExtrasSync()` → `{on, lastSyncedAt, sections: {goals|life|
  habits|health: 'synced'|'pending'|'off'|'consent'}}`.

### Asks
- None yet. If a page you restyle needs a `data-region` name for Point & tell's readable names, any existing
  `data-region` works as it is.

## 2026-10-13 — Part 1 pushed
- **`cardArt` is live on the branch:** `setGoalCardArt(extras, goalKey, artId | null, at)` and `CARD_ART_ID` in
  `lib/goal-extras/store.ts` (tests in `store.test.ts`, including Undo through `restoreGoal`). It reaches your other devices
  once Part 2's `goals` extras section is in.
- **`lib/ab-design-keys.ts` (stub)** is wired into Export everything (`device.uiPrefs`), the account erase, the welcome's
  `NON_PERSONAL_KEYS` and the Your data catalog ("How pages look on this device"). Keep the export names, or tell me here.
- **Three one-string copy edits in your files** (ADR-023 C10; please keep them when you restyle):
  `components/wealth/accounts-section.tsx` (the section's lede: "Accounts are kept on this device; with an account they also
  travel in your encrypted sync."), `components/platform/goal-milestones.tsx` ("Target dates are kept on this device and,
  with an account, travel in your encrypted sync."), `components/help/help-page.tsx` (`#w-wealth`'s answer).
- Accounts and milestone dates are still read from their device keys by your pages; nothing changes for you there.

## 2026-10-13 — Part 2 pushed (Gate A next)
- The extras sync is in: your goal-extras fields (`cardArt` included) reach every device of an account. A photo vision stays
  on its device; `components/goals/vision-art.tsx` already shows "The photo is kept on another device" elsewhere.
- **New in your areas (please keep at merge):** `components/sync/extras-sync-choice.tsx` (lazy, in my `vault-sync-panel.tsx`)
  and **one-string copy edits** (ADR-023 C12): `components/help/help-page.tsx` (`#aa-goals`' second paragraph),
  `components/goals/average-goals.tsx` (the "Kept on this device" line; the "· kept on this device for now" suffix on the
  detail eyebrow removed), `components/goals/goal-plan.tsx` (eyebrow "Your plan"), `components/health/measurements-aa.tsx`
  (the custom-kinds line), `components/game/game-setting.tsx` (the switch's note).
- If you restyle Settings → Sync, the extras block has `data-region="extras-sync"` and uses only `.checkbox`, `.fine`,
  `.notice`, `.actions` and the button classes.

## 2026-10-13 — Part 3 and Part 4 pushed
- **Vitamins (Part 4, ADR-023 C20)** use the data shape announced above (`lib/health-vitamins/schema.ts`): `vitaminDay(data,
  date, record)` for today's rows, `recipeVitamins(record, recipe)` per portion, `entryVitamins(...)` per diary entry.
- **New in your Health files (please keep at merge; each one line):** in `components/health/health-app.tsx` two lazy
  imports (`VitaminFields`, `VitaminRecipeLine`), a stable `foodId` state in `FoodEditor` (the draft's `id` reads it),
  `<VitaminFields …/>` after the "Additional label nutrients" fold, `<VitaminRecipeLine recipe={r}/>` after a recipe's
  `NutrientLine`; in `components/health/micro-panel.tsx` one import and `<VitaminRows …/>` after the fine print. New files:
  `vitamin-fields.tsx`, `vitamin-rows.tsx`, `vitamin-recipe-line.tsx` (they reuse `.health-micro-list`, `.health-micro-edit`,
  `.health-micro-bar`, `.health-form-grid`, `.fine`; restyle freely, keep the accessible names: the fieldset legend
  "Vitamins (optional)", "<Vitamin> (<unit>)" field labels, "Edit <Vitamin> target", "<Vitamin> target in <unit>", the
  progress bars' "<Vitamin>: <x> of <target> <unit>" / "<Vitamin>: unknown").

## 2026-10-14 — Gate A fix and Part 5 pushed
- **Gate A (ADR-023 C21b):** `components/sync/extras-sync-choice.tsx` is now imported directly in `vault-sync-panel.tsx`
  (no `lazy`): loaded late, it pushed "Sync now" down while it was pressed. If you restyle the panel, please keep anything
  that appears after the first render out of the space directly above "Sync now" (or reserve its height).
- **Restore from a backup (Part 5, C22):** new `components/restore/restore-backup.tsx` + `restore-backup.css` (in the Data
  health page's tokens: `.panel`, `.fine`, `.notice`, `.alert`, `.checkbox`, `.dh-actions`, `.primary`/`.secondary`; restyle
  freely). One section inserted in `components/data-health/data-health-view.tsx` (mine): `<section id="restore">` with
  heading "Restore from a backup", after "Your copies". Accessible names the specs use: the file field "Export everything
  ZIP", the group "What this backup holds", fieldsets per group (legends "Goals and Wealth", "Habits", "Today and Life",
  "Health", "Photos"), each part's select "<label>: what to do", the confirmation "I checked my choices…", the buttons
  "Merge every part", "Restore the chosen parts", "Cancel", "Undo this restore".
- **One-string copy edits in shared files (please keep at merge):** `components/help/help-page.tsx` (`#export-everything`:
  "it is not a restore format" → how Restore reads it back), `components/export-everything.tsx` (the fine line under the
  button and the header comment), `app/app/settings/data/page.tsx` (lede: "It changes nothing unless you restore a backup.").
- **New `lib/image-header.ts` (C27):** `checkImageHeader(file)` refuses images above 40 MP or 12,000 px from the header;
  Part 8 calls it in front of the vision and progress-photo decoders (my lib files only).

## 2026-10-14 — Part 6 (Point & tell)
- **New files:** `components/point-tell/mount.tsx` (reads one key, loads the rest only while on), `point-tell.tsx` +
  `point-tell.css` (launcher, pick hint, hover outline, numbered markers, note sheet, list), `point-tell-setting.tsx`.
- **One-line insertions in shared files (please keep at merge):** `components/shell.tsx`: one import and
  `<LoadBoundary quiet><PointTellMount /></LoadBoundary>` right after the music launcher's; `app/app/settings/page.tsx`: one
  import and a `<section id="point-tell">` (eyebrow "POINT & TELL", heading "Point at it, say what you think") right after
  "Send feedback".
- **Space it uses:** the launcher sits 64 px above the music button (`left` like the music button; right when
  `data-zigi-side=left`; on phones `calc(var(--phone-tabs) + var(--safe-bottom) + 72px)`), z-index 44–62. Everything
  under `[data-point-tell]` is ignored by picking. Accessible names the spec uses: "Point & tell: pick a part of this page
  to comment on" / "Stop picking", "Your Point & tell notes (N)", dialogs "Note on <part>" and "Your Point & tell notes",
  "Your note", "Save note", "Edit note N", "Save note N", "Remove note N", "Undo", "Copy all", "Download", "Email them",
  "Clear all…", "Close", markers "Note N: <part>". Restyle freely; please keep nothing animated (C23).

## 2026-10-14 — Gate B and Part 8
- **Showcase words (C24): `lib/showcase-copy.ts`** exports `SHOWCASE_CHIP` ("Showcase · fictional"), `SHOWCASE_SHEET` (the
  first-visit sheet's paragraph), `SHOWCASE_FOOTER` (the footer line) and `SHOWCASE_BANNER` (today's banner sentence, used
  by `components/showcase-controls.tsx` and `components/phone/phone-status-sheet.tsx` until your chip replaces them). They
  say what Load and Reset do: fresh examples for today, what was added is cleared then; your own records untouched.
- **Default currency (C25):** `useDefaultCurrency()` / `defaultCurrency()` in `lib/default-currency.ts`. I wired the goal
  wizard's value Goal and the new-Portfolio form (one line each). Your forms that start with a hard-coded "USD" and no
  stored choice — onboarding's goal draft, a new account, the quit cost — can call the hook the same way.
- **Grouped amounts (C25):** every field using `parseAmountInput` now reads "3,250.50" / "3.250,50"; the Goal preview
  shows the plain value. No UI change needed.
- **ZIGi History (C26):** `components/ai/history-view.tsx` gains one `role="status"` line ("… deleted. Undo", class
  `ai-history-undo`) above the list; Delete and "Delete all chats" now go through it.
- **Photos (C27):** vision and progress photos are refused from their header above 40 MP / 12,000 px before decoding
  (lib files only; the messages are plain sentences shown where the old decode errors were).

## 2026-10-14 — Gate C
- **`SHOWCASE_BANNER` is shorter:** "Fictional examples · Load or Reset starts them fresh and clears what you added". The
  first wording wrapped the banner to two lines at 1280 px and moved every page 13 px down (CI's `motion-arrival:18`).
  If your chip or footer reads it, keep it to one line, or the arrival figures below the fold move again.
- **`components/phone/phone-targets.css`** (shared file): one selector added to the phone 44 px rule,
  `:root #point-tell label.checkbox`, so the Point & tell switch in Settings is a full-size target
  (`phone-touch-targets:40`). Keep it when you merge, if you restyle that file.
- No other visual change at Gate C: the rest is tests and records.

## 2026-10-14 — Session AB-Cloud finished (PR #85 ready for review)
- No visual change after the Gate C entry above. For the second merger, the shared files this lane touched are listed in the
  entries above (`components/shell.tsx`, `app/app/settings/page.tsx`, `components/data-health/data-health-view.tsx`,
  `health-app.tsx`, `micro-panel.tsx`, `components/help/help-page.tsx`, `lib/search/static.ts`, `lib/whats-new.ts`,
  `components/for-you/whats-new-card.tsx`, `app/product-v2.css`, `components/phone/phone-targets.css`,
  `lib/showcase-copy.ts`): keep both sides; the What's new release ids and Help sections stack.
- `feature/session-ab-design` was not on origin at any gate (last checked at Gate C), so no `AB_DESIGN_TO_CLOUD.md` was
  read; nothing of yours is merged into this branch.
