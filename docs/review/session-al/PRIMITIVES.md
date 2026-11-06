# Session AL shared primitives (lane L10b, parts 3d, 3e and 3f)

These are the shared APIs the pillar lanes switch to. Each one exists so that a value is read, checked, shown and undone
the same way on every page and from every entry point: forms, Quick add, ZIGi and NOVA confirm cards, the Checklist and
imports. All paths are under `apps/web/`. Tests live in `lib/primitives/*.test.ts` (`pnpm exec vitest run apps/web/lib/primitives`).

Findings these primitives address: BUG-009, TK-024, DV-016/DV-049 (error far from its field), LS-007 (Checklist "+70 kg"
logged a weight nobody typed), NB-081/NB-089 and DV-071 (Undo that does not undo), PR-044 and PR-030 (no Undo), PR-043
(stale toast), TK-003 (decimal comma dropped), MO-140 (cm and inches in one chart), DV-014 ("20 books" shown as "20 ZIG"),
TK-014 (made-up currency code accepted), PR-023 (99 % against 100 %).

A primitive only fixes a finding once the pillar's call site uses it. The migration lists below say which lane owns
each call site.

---

## 3d. Validation

### `validateValue(kind, raw, unit?)`, in `lib/limits/plausibility.ts`

```ts
validateValue(kind: TextKind | 'currency', raw: unknown): Validated<string>
validateValue(kind: NumberKind, raw: unknown, unit?: string): Validated<number>

type Validated<V> =
  | {ok: true;  value: V;    input: V;    text: string; unit: string | null; error: null}
  | {ok: false; value: null; input: null; text: null;   unit: string | null; error: string}
```

- `value` is in the kind's base unit: kg for weight, cm for height and waist, mL for water, kcal, g for macros. For a
  text kind it is the trimmed text. `input` is the number in the unit it was typed in. `text` is the canonical decimal
  as typed (for example `"1500.75"`); pass it to `parseUnits` when the amount must be exact (money, quantities).
- `raw` can be the typed text or a number from a card. Both go through the same checks, so a ZIGi or NOVA card, Quick
  add and an import refuse exactly what the form refuses.
- `error` is a plain sentence written for the field, in the unit that was typed, for example "Enter a weight from 45 to
  881 lb." or "A name can be at most 80 characters (this one has 81).".

**One table.** `VALUE_LIMITS` holds the number rows and `TEXT_LIMITS` the text rows. The number rows reuse `LIMITS`, the
write layer's numbers, so a value the form accepts is never refused by the store.

| Kind | Units (first is the base) | Range | Notes |
|---|---|---|---|
| `weight` | kg, lb | 20 to 400 kg | 2 decimals at most |
| `height` | cm, in | 50 to 272 cm | |
| `waist` | cm, in | 10 to 250 cm | any body circumference |
| `water` | ml (also `mL`), fl-oz-us (also `fl oz`), l (also `L`) | more than 0, up to 5,000 mL per entry | `waterDayIssue` checks the day's total |
| `kcal` | kcal, kj | 0 to 10,000 | |
| `macro` | g | 0 to 1,000 g | |
| `sleepHours` | none | 0 to 24 | |
| `minutes` | none | 0 to 1,440 | |
| `steps` | none | 0 to 100,000 | whole numbers |
| `reps` | none | 0 to 9,999 | whole numbers |
| `count` | none | 0 to 1,000,000 | whole numbers |
| `money` | `unit` is USD or EUR | 0 to a trillion | 2 decimals; any other currency is refused |
| `quantity` | none | more than 0, below 10^18 | 18 decimals |
| `goalTarget` | none | more than 0, up to a trillion | 8 decimals |
| `percent` | none | 0 to 100 | |
| `name` / `title` / `label` | (text) | 80 / 120 / 40 characters | required; runs of spaces collapse |
| `note` / `longNote` / `message` | (text) | 500 / 2,000 / 15,000 characters | `note` and `longNote` are optional; line breaks are kept |
| `currency` | (text) | USD or EUR | reads "usd", "$", "€", "euro"; any other code is refused (TK-014) |

**When a schema and the table disagree.** Some stored schemas have a different text limit, such as a habit title at 100
characters or a task title at 140. The input layer applies the table. Before a pillar switches such a field, it either
widens the schema to match (a wider limit is a tolerant, additive change) or keeps the field on its own limit and says so
in its report.

### Field errors: `useFormErrors()` and `<FieldError>`, in `components/primitives/field-error.tsx`

```ts
useFormErrors(): {
  errors: Readonly<Record<string, string>>;
  formError: string;                                   // a message about the whole form; render it next to the submit button
  validate<T extends Record<string, Validated<unknown>>>(results: T): {[K in keyof T]: value} | null;
  fail(messages: Record<string, string | null | undefined>): boolean;
  set(name: string, message: string | null): void;     // while typing or on blur; does not move the focus
  failForm(message: string): void;
  clear(name?: string): void;
  field(name, {id?, describedBy?, onInput?}?): {id, 'aria-invalid'?, 'aria-describedby'?, onInput};
  message(name): {id, message, alert};
}
<FieldError id message alert? className? />            // <p class="field-error">; renders nothing when there is no message
```

- **Where the message goes.** Each message renders right after its own field. There is no summary far away (BUG-009,
  TK-024).
- **Accessibility.** `aria-invalid` and `aria-describedby` point at the message. The first message in the order you pass
  to `validate` or `fail` gets `role="alert"`; keep that order the same as the page.
- **Focus after a failed submit.** `lib/primitives/field-focus.ts` `focusFirstInvalid(ids)` takes the first invalid field
  in document order, opens a closed `<details>` around it, scrolls it to the centre and focuses it. The scroll is smooth
  only at the Full motion level; Calm, Off and reduced motion jump instead (`readLoopLevel`).
- **Clearing.** Typing in a field clears that field's message only.
- **Wizards (DV-016, DV-049).** In the same handler, switch to the step that holds the field and then call
  `validate` or `fail`. The focus moves after that render, so it lands on the step that is now shown.
- **The older hook.** `components/field-errors.ts` (`useFieldErrors`, 4 callers) keeps its API. It now also scrolls the
  first field into view through `revealField`.

**How to move a form to the new primitives**

1. Replace `const n = Number(text.replace(',', '.'))` and its own range check with
   `validateValue('<kind>', text, unit)`.
2. `const form = useFormErrors();`, then on each input spread `{...form.field('weight')}` and right after it render
   `<FieldError {...form.message('weight')}/>`.
3. On submit: `const v = form.validate({weight: validateValue('weight', weight, unit), …}); if (!v) return;`, then save
   `v.weight`, which is in kg.
4. Delete the old banner or status line that showed the field error at the top of the form. Keep `form.formError` only
   for save failures, and render it next to the submit button.

---

## 3e. One Undo and toast system

### APIs, in `components/ui/undo-toast.tsx` (the existing API is unchanged)

```ts
showUndo({message, restore, undone?, undoLabel?, link?, timeoutMs?}: UndoOffer): number   // the ONE way to offer Undo
showStatus(message, {link?, timeoutMs?, tone?: 'status' | 'error'}?): number               // a toast with no Undo
showToast(toast: UndoToast): number          // kept for its callers; `undo` is marked @deprecated
hideToast(id?), lastToastId(), shownToasts(), holdToast(), pushToastLayer(el), <UndoToastHost/>
type UndoToast = {message; undo?; undone?; undoLabel?; link?; timeoutMs?; tone?}
```

- **`restore` puts the store record back.** It must change the STORE record, through the store's own `update` reading
  the latest record, never only the screen. It may resolve to `{undone: '…'}` to say what it did. If it throws, the
  toast says "Could not undo: …" as an alert.
- **Queue** (`lib/primitives/toast-queue.ts`): `enqueueToast(shown, next, cap)`, `dismissToast(shown, id?)` and
  `toastMs(ms?)`.
  - `TOAST_CAP` is 1, so the newest toast replaces the one shown. The cap is 1 rather than 2 because the Checklist's
    toast slot is one line of 52 px, and every spec finds the toast with a single `.aa-toast` locator.
  - The same words without an Undo are never stacked.
  - A toast shows for 8 s by default, at least 5 s and at most 60 s. A pointer or the focus resting on it stops the
    clock.
- **Keyboard.** Undo and Close are buttons in the tab order. Escape, with the focus on the toast, closes it, does not reach
  the dialog or Checklist behind it, and puts the focus back where it was.
- **Announcements.** The region is `role="status"` with `aria-live="polite"`. An error toast is `role="alert"`.
- **Unchanged.** The Checklist's slot (`pushToastLayer`), `holdToast` (the day celebration), the `.aa-toast*` markup and
  classes, and the Undo button's accessible name all work as before.

### Building `restore` from a store save: `changeWithUndo` and `removeWithUndo`, in `components/ui/remove-with-undo.ts`

```ts
changeWithUndo<T>(update, updater, message, {undone?, undoLabel?, timeoutMs?}?): Promise<boolean>
removeWithUndo<T>(update, updater, message, undone?): Promise<void>   // unchanged; now uses showUndo and showStatus
```

`changeWithUndo` runs the save through `update`. It then compares the record before and after the save
(`lib/undo-removal.ts` `itemChanges`) to find which items with an `id` were added, removed or edited, and offers an Undo
that reverses exactly those items in the LATEST record (`revertItemChanges`):

- an item added since by anything else is kept;
- an item edited again since is kept, and the toast says "…, except what was changed since.";
- a save that changed no listed item gets a plain status toast with no Undo.

This is the fix pattern for NB-081 and NB-089 (Today's water), PR-044 (a skipped habit day), PR-030 (a removed task) and
PR-043 (archiving said nothing, so the old "Day saved." stayed on screen; say the action with `showStatus`).

**How to move a call site**

- `showToast({message, undo: () => store.update(latest => reverse(latest)), undone})` becomes
  `showUndo({message, restore: () => store.update(latest => reverse(latest)), undone})`.
- A save followed by a hand-written reverse becomes `await changeWithUndo(store.update, latest => doIt(latest), message, {undone})`.
- A local Undo link (`<p role="status">… <button>Undo</button>`) is deleted. The action calls `showUndo`, or
  `changeWithUndo`, instead.
- A status line with no Undo becomes `showStatus(message)`. A failure becomes `showStatus(message, {tone: 'error'})`, or
  stays a field error when one field caused it (3d).

### Undo toasts migrated in this lane

`components/shell/showcase-undo.tsx` (it now uses `showUndo`) and `components/ui/remove-with-undo.ts`.

### `showToast` call sites that offer an Undo

These should move to `showUndo` or `changeWithUndo`, and their reverse should be checked to restore the store record:

| Call site | Lane |
|---|---|
| components/wealth/accounts-section.tsx:61 | Wealth |
| components/goals/challenge-card.tsx:89 | Goals |
| components/goals/average-goals.tsx:65 | Goals |
| components/goals/average-goals.tsx:94 | Goals |
| components/goals/use-goal-extras.ts:17 | Goals |
| components/nova/make-it-yours.tsx:53 | NOVA |
| components/nova/nova-dashboard.tsx:201 | NOVA |
| components/platform/watchlist.tsx:34 | Wealth |
| components/platform/asset-detail.tsx:37 | Wealth |
| components/platform/goal-milestones.tsx:68 | Wealth |
| components/checklist/use-checklist.ts:111 | Checklist (protected; no change) |
| components/checklist/star-toggle.tsx:32 | Checklist (protected; no change) |
| components/checklist/star-toggle.tsx:33 | Checklist (protected; no change) |
| components/checklist/edit-path.tsx:45 | Checklist (protected; no change) |
| components/notify/notify-sync.tsx:48 | Settings |
| components/life-review/life-review-view.tsx:78 | Goals |
| components/rewards-shelf/rewards-shelf.tsx:29 | Goals |
| components/timeline/day-timeline.tsx:42 | Today (L10a) |
| components/timeline/day-timeline.tsx:50 | Today (L10a) |
| components/timeline/day-timeline.tsx:68 | Today (L10a) |
| components/timeline/day-timeline.tsx:74 | Today (L10a) |
| components/timeline/day-timeline.tsx:85 | Today (L10a) |
| components/timeline/day-timeline.tsx:92 | Today (L10a) |
| components/activity-feed.tsx:80 | Today (L10a) |
| components/settings/af-extras-section.tsx:27 | Settings |
| components/health-goals/health-goals-section.tsx:38 | Health |
| components/health/exercise-counters.tsx:70 | Health |
| components/health/health-app.tsx:258 | Health |
| components/health/daily-tools.tsx:72 | Health |
| components/health/coach-card.tsx:44 | Health |
| components/health/coach-card.tsx:45 | Health |
| components/health/meditation/meditation-forms.tsx:107 | Health |
| components/health/sleep/sleep-forms.tsx:115 | Health |
| components/health/diet-templates.tsx:44 | Health |
| components/calculator/calculator.tsx:143 | Wealth |
| components/dashboard/today-focus.tsx:68 | Today (L10a) |
| components/dashboard/today-dashboard.tsx:189 | Today (L10a) |
| components/habits/plan-skip.tsx:25 | Habits |
| components/habits/habit-completion.tsx:112 | Habits |
| components/habits/quit-panel.tsx:33 | Habits |
| components/habits/habit-compact-view.tsx:24 | Habits |

`removeWithUndo` callers (already store-based; no change needed):

| Call site | Lane |
|---|---|
| components/checklist/edit-path.tsx:40 | Checklist (protected; no change) |
| components/activity-feed.tsx:71 | Today (L10a) |
| components/health/supplements.tsx:61 | Health |
| components/health/fasting-timer.tsx:82 | Health |
| components/health/measurements-aa.tsx:58 | Health |
| components/health/measurements-aa.tsx:59 | Health |
| components/chess/chess-view.tsx:99 | Habits |

All 79 `showToast` call sites keep working unchanged. Moving the ones without an
Undo to `showStatus` is optional.

### One-off Undo and toast implementations (each should move to `showUndo` or `showStatus`)

| Call site | Lane |
|---|---|
| components/agenda/agenda-page.tsx:144 | Tasks |
| components/ai/ai-launcher.tsx:199 | L10a (shell/launchers) |
| components/ai/ai-launcher.tsx:200 | L10a (shell/launchers) |
| components/ai/ai-launcher.tsx:36 | L10a (shell/launchers) |
| components/ai/ai-notes.tsx:71 | ZIGi |
| components/ai/history-view.tsx:22 | ZIGi |
| components/ai/history-view.tsx:73 | ZIGi |
| components/ai/proposal-list.tsx:155 | ZIGi |
| components/ai/proposal-list.tsx:162 | ZIGi |
| components/ai/proposal-list.tsx:173 | ZIGi |
| components/ai/proposal-list.tsx:193 | ZIGi |
| components/ai/proposal-list.tsx:218 | ZIGi |
| components/ai/proposal-list.tsx:4 | ZIGi |
| components/checklist/dot-panel.tsx:17 | Checklist (protected; no change) |
| components/focus/pomodoro-panel.tsx:61 | Tasks |
| components/guided/guided-view.tsx:91 | Goals |
| components/habits/auto-rules-editor.tsx:74 | Habits |
| components/habits/habits-workspace.tsx:282 | Habits |
| components/health-numbers/your-numbers.tsx:54 | Health |
| components/import/bankfiles/bank-file-import.tsx:75 | Wealth |
| components/import/csv-import-steps.tsx:119 | Wealth |
| components/import/holdings-import.tsx:135 | Wealth |
| components/import/switch-import-more.tsx:100 | Settings |
| components/import/switch-import-more.tsx:142 | Settings |
| components/import/switch-import-more.tsx:46 | Settings |
| components/import/switch-import-more.tsx:74 | Settings |
| components/import/switch-import-more.tsx:89 | Settings |
| components/import/switch-import.tsx:168 | Settings |
| components/journal/journal-page.tsx:74 | Health |
| components/notes/notes-workspace.tsx:74 | Tasks |
| components/notes/use-notes.ts:23 | Tasks |
| components/notes/use-notes.ts:24 | Tasks |
| components/notes/use-notes.ts:26 | Tasks |
| components/nova/chat/nova-conversations.tsx:20 | NOVA |
| components/nova/chat/nova-conversations.tsx:75 | NOVA |
| components/nova/panels/memory-panel.tsx:65 | NOVA |
| components/nova/widgets/focus.tsx:41 | NOVA |
| components/nova/workflows/workflows-panel.tsx:74 | NOVA |
| components/platform/contribution-flow.tsx:35 | Wealth |
| components/point-tell/point-tell.tsx:127 | L10a (shell/launchers) |
| components/restore/restore-backup.tsx:132 | Settings |
| components/restore/restore-backup.tsx:44 | Settings |
| components/restore/restore-backup.tsx:46 | Settings |
| components/restore/restore-backup.tsx:79 | Settings |
| components/restore/restore-backup.tsx:86 | Settings |
| components/restore/restore-backup.tsx:92 | Settings |
| components/review-cards/review-card-mode.tsx:95 | Tasks |
| components/review-unified/review-notes.tsx:91 | integrator |
| components/tasks/task-parts.tsx:97 | Tasks |
| components/wealth/money-tools/rules-panel.tsx:112 | Wealth |
| components/wealth/spending/spending-section.tsx:142 | Wealth |
| components/wealth/spending/spending-section.tsx:69 | Wealth |
| components/wealth/spending/spending-section.tsx:70 | Wealth |
| components/wrap-up-tasks/wrap-up-tasks.tsx:38 | integrator |
| lib/ai/actions/batch.ts:44 | ZIGi (L7) |
| lib/ai/actions/device-undo.ts:28 | ZIGi (L7) |
| lib/import/undo-store.ts:15 | Settings |
| lib/import/undo-store.ts:29 | Settings |
| lib/progress-toast/moved.ts:11 | L10b (this lane) |

Notes:
- `components/ai/proposal-list.tsx` with `lib/ai/actions/batch.ts` (`UNDO_WINDOW_MS`) and `device-undo.ts` is the ZIGi
  and NOVA card "Undo · 10 s" (DV-071). It should call `showUndo` with a `restore` that runs `undoDeviceWrite`, and then
  check the store.
- `ai-launcher-toast` (hide ZIGi, Undo) and `pt-toast` (point-tell) belong to L10a.
- Imports (`switch-import*`, `holdings-import`, `bank-file-import`, `csv-import-steps`, `lib/import/undo-store.ts`) keep
  their per-batch "Undo this import", because it reverses a whole batch even later. Only their status line should become
  `showStatus`.
- `lib/progress-toast/moved.ts` (this lane) is pure and already speaks through the one toast (`contribution-flow.tsx:35`).
  It rounds down ("46.90" reads 46 %), while `wholePercent` rounds half up and caps at 99. Making it use `wholePercent`
  changes the expected value in `moved.test.ts` (46 % becomes 47 %), so that change is the integrator's.
- Checklist: `components/checklist/**` is not touched. Its slot and its protected Undo pins work unchanged.

---

## 3f. One format layer

| Need | API | File |
|---|---|---|
| Reading a typed number | `parseNumberInput(raw, {allowDecimalComma = true, allowNegative = false, locale?}): ParsedNumber` | `lib/numbers/parse.ts` |
| Rounding | `roundHalfUp(value, decimals = 0)`; `wholePercent(value, complete?)` | `lib/numbers/round.ts` |
| Percentages | `formatProgressPercent(value, complete?)`; `formatPercent(value, {decimals = 0, signed = false})`; `formatRounded(value, decimals = 1)` | `lib/visual-format.ts` |
| Money | `ALPHA_CURRENCIES`, `isAlphaCurrency(code)`, `formatCurrencyAmount(value, code)`; plus the existing `formatMoney`, `formatSignedMoney` and `formatPrice` | `lib/visual-format.ts` |
| Dates | `formatDateShort` (= `formatDate`, "Oct 17, 2026"); `formatDateLong` ("Saturday, October 17, 2026"); plus the existing `formatDate`, `formatTime`, `formatDateTime`, `formatMonth`, `formatWeekday` and `formatRelativeDay` | `lib/visual-format.ts` |
| Units | `MeasureUnit`, `convertUnit(v, from, to)`, `sameDimension`, `isMeasureUnit`, `unitLabel`, `inOneUnit(readings, to)`, `measureText(v, unit, decimals?)`, `lengthText(cm, unit)`, `kcalText(kcal)`; plus the existing `weightText` and `waterText` | `lib/health-units.ts` |
| Plurals and unit words | `countText(count, one, many?)`; `unitAmountText(value, unit)`; plus the existing `plural` and `unitFor` | `lib/plural.ts` |

### Reading numbers

`parseNumberInput` accepts:

- a decimal comma or point: `"1234,5"`, `"0,5"`, `",5"`, `"1234.5"`;
- grouping that can be read only one way: `"1.234,56"`, `"1,234.56"`, `"1 234,56"` (any space), `"1'234.56"` (an apostrophe),
  `"1,234,567"`.

It refuses, with a sentence:

- `"1,234"`, which could be 1234 or 1.234;
- `"1.234"` on a device that groups with a point;
- mixed separators;
- exponents;
- signs, unless `allowNegative` is set.

`text` is the canonical decimal, so `parseUnits(text)` keeps the exact value. Inside, it reuses `parseLocaleAmount` and
`normalizeDecimalInput`, so it reads text the same way as the existing money forms.

### Percentages (PR-023)

There is one rule: a whole percent, rounded half up, and 100 % only when the thing is complete. So 99.6 reads 99 %
everywhere. This is the same rule as `progressPresentation`, the Goal ring. Unknown values read "—", never 0 %.

### Currency (TK-014)

USD and EUR are written as money. Any other code is shown as the amount followed by the code text the person typed, for
example "40 XYZ", and is never treated as money. No code at all reads "—". A code is never invented or guessed.

### Units (MO-140)

`inOneUnit` converts every reading of a series to one unit before it is charted, and leaves out a reading in another
dimension. A custom Goal unit (DV-014) is shown with `unitAmountText(20, 'books')` and reads "20 books", never "20 ZIG".

### Parallel formatters to switch

| Module or call site | Today | Switch to | Lane |
|---|---|---|---|
| `components/wealth/money-tools/format.ts` (`money`, `moneyCents`; used by 3 files) | `Intl.NumberFormat('en-GB', currency)` with a fixed locale, so it disagrees with the display locale | `formatCurrencyAmount` / `formatMoney` | Wealth |
| `lib/earn/format.ts` (16 importers) | `tokenAmount` / `zig` (token quantities: keep); `pct`, `pctShort`, `bps`, `decimal`, `usd` | keep the token amounts; the percentages to `formatPercent`; `usd` to `formatCurrencyAmount(v, 'USD')` | Wealth |
| `lib/ai/tools/format.ts` (`num`, `plural`; about 13 importers in `lib/ai/**`) | model-facing text | `plural` to `countText`; `num` can stay (model-facing, "unknown") | ZIGi (L7) |
| `components/dashboard/today-focus.tsx:27` `pct` (`Math.floor`) | rounds down | `formatProgressPercent` | Today (L10a) |
| `components/report/report-document.tsx:15`, `lib/compare/engine.ts:72`, `lib/insights/cross-pillar.ts:49`, `components/insights/cross-insights-card.tsx:69` (`Math.round(v*100)%`) | own rounding | `formatPercent(v*100)` | Settings / Wealth / Today |
| `lib/price-alerts/engine.ts:36` (`Math.floor(pct)%`) | rounds down | `formatProgressPercent` | Wealth |
| `components/goals/balance-wheel.tsx:21,28,38` | own rounding | `formatProgressPercent` | Goals |
| `lib/checklist/derive.ts:146` (`Math.round(...*10)/10` weight) | own rounding | `weightText` / `measureText` | Checklist |

Hand-written `Intl.NumberFormat` (each should move to `formatMoney` or `formatCurrencyAmount`; most hard-code `'en-GB'`):

| Call site | Lane |
|---|---|
| components/wealth/bills/upcoming-bills.tsx:21 | Wealth |
| components/wealth/money-tools/format.ts:3 | Wealth |
| components/wealth/spending/spending-section.tsx:34 | Wealth |
| components/wealth/allocation/purpose-flow.tsx:17 | Wealth |
| components/wealth/allocation/target-allocation.tsx:16 | Wealth |
| components/wealth/budgets/budgets-month.tsx:23 | Wealth |
| components/add-money/add-money-view.tsx:30 | Wealth |
| components/platform/financial-ui.tsx:12 | Wealth |
| components/spending-map/spending-map.tsx:15 | Wealth |
| components/ecosystem-live.tsx:18 | Wealth |
| components/cash-forecast/cash-forecast.tsx:21 | Wealth |
| components/import/holdings-import.tsx:82 | Wealth |
| components/import/bankfiles/bank-file-import.tsx:20 | Wealth |
| lib/bills/store.ts:73 | Wealth |

---

## Ad-hoc limits and number reading to switch (report only; not edited)

### Decimal commas read by hand (`.replace(',', '.')`)

These should use `validateValue(kind, raw, unit)`, or `parseNumberInput` where no kind fits. TK-003 is
`components/wealth/accounts-section.tsx:129`.

| Call site | Lane |
|---|---|
| components/wealth/bills/upcoming-bills.tsx:22 | Wealth |
| components/wealth/money-tools/split-panel.tsx:17 | Wealth |
| components/wealth/money-tools/fi-model-panel.tsx:23 | Wealth |
| components/wealth/money-tools/fee-drag-panel.tsx:14 | Wealth |
| components/wealth/money-tools/rules-panel.tsx:22 | Wealth |
| components/wealth/debt-planner.tsx:88 | Wealth |
| components/wealth/accounts-section.tsx:110 | Wealth |
| components/wealth/accounts-section.tsx:129 | Wealth |
| components/wealth/accounts-section.tsx:146 | Wealth |
| components/wealth/spending/spending-section.tsx:35 | Wealth |
| components/wealth/allocation/target-allocation.tsx:38 | Wealth |
| components/wealth/allocation/target-allocation.tsx:46 | Wealth |
| components/wealth/budgets/budgets-month.tsx:24 | Wealth |
| components/goals/average-goals.tsx:58 | Goals |
| components/goals/average-goals.tsx:109 | Goals |
| components/platform/goal-on-track.tsx:20 | Wealth |
| components/platform/staking-try-scenario.tsx:18 | Wealth |
| components/checklist/value-stepper.tsx:16 | Checklist (protected; no change) |
| components/price-alerts/price-alerts.tsx:62 | Wealth |
| components/portfolio/trader-tools.tsx:75 | Wealth |
| components/health/vitamin-fields.tsx:31 | Health |
| components/health/planner-view.tsx:54 | Health |
| components/health/calorie-week-card.tsx:35 | Health |
| components/health/workouts/workouts-view.tsx:253 | Health |
| components/health/workouts/workouts-tools.tsx:19 | Health |
| components/calculator/calculator.tsx:48 | Wealth |
| components/calculator/calculator.tsx:113 | Wealth |
| components/insights/compare/compare-explorer.tsx:63 | Today (L10a) |
| lib/health-quick/quick.ts:114 | Health |
| lib/ai/actions/quantity-cue.ts:42 | ZIGi (L7) |
| lib/ai/actions/parse.ts:110 | ZIGi (L7) |
| lib/ai/actions/plan-ak.ts:104 | ZIGi (L7) |
| lib/ai/actions/edit.ts:171 | ZIGi (L7) |
| lib/ai/safety.ts:32 | ZIGi (L7) |
| lib/health-vitamins/schema.ts:104 | Health |
| lib/goals/nl-bundle.ts:43 | Goals |
| lib/goal-vaults/illustration.ts:21 | Goals |
| lib/health-aa/recipe-text.ts:17 | Health |
| lib/health-aa/recipe-text.ts:29 | Health |
| lib/food-scans/match.ts:34 | Health |
| lib/debt-planner/plan.ts:41 | Wealth |
| lib/workouts/import-lifts.ts:49 | Health |
| lib/csv/numbers.ts:9 | Wealth |
| lib/label-scan/read.ts:31 | Health |
| lib/label-scan/read.ts:36 | Health |
| lib/health-numbers/scan.ts:46 | Health |
| lib/quick-log/multi.ts:28 | Health |

### `readFormNumber` with its own bounds

These should use `validateValue` where the kind is in the table: `health-link-field` (sleep hours, steps), the
`habit-editor` targets (`count`), `measurements-aa` (`waist` with its unit), `fasting-timer` (hours). Bounds that belong
to one feature (a schedule interval, a blood-pressure range) stay where they are.

| Call site | Lane |
|---|---|
| components/checklist/orbit-quick-add.tsx:59 | Checklist (protected; no change) |
| components/checklist/orbit-quick-add.tsx:60 | Checklist (protected; no change) |
| components/health-goals/health-goal-creator.tsx:17 | Health |
| components/health-goals/health-goal-creator.tsx:43 | Health |
| components/health/micro-panel.tsx:26 | Health |
| components/health/recipe-import.tsx:36 | Health |
| components/health/recipe-import.tsx:41 | Health |
| components/health/fasting-timer.tsx:38 | Health |
| components/health/measurements-aa.tsx:56 | Health |
| components/habits/habit-card-full.tsx:83 | Habits |
| components/habits/habit-editor.tsx:137 | Habits |
| components/habits/habit-editor.tsx:138 | Habits |
| components/habits/habit-editor.tsx:139 | Habits |
| components/habits/habit-editor.tsx:140 | Habits |
| components/habits/habit-completion.tsx:98 | Habits |
| components/habits/quit-panel.tsx:27 | Habits |
| components/habits/health-link-field.tsx:42 | Habits |
| components/habits/health-link-field.tsx:45 | Habits |
| lib/goals/nl-bundle-review.tsx:27 | Goals |
| lib/auto-rules/draft.ts:27 | Habits |
| lib/health-numbers/engine.ts:23 | Health |
| lib/health-numbers/engine.ts:24 | Health |
| lib/health-numbers/engine.ts:26 | Health |
| lib/health-numbers/engine.ts:35 | Health |
| lib/health-numbers/engine.ts:36 | Health |
| lib/health-numbers/engine.ts:37 | Health |

### Other entry points

| Call site | Change | Lane |
|---|---|---|
| `lib/checklist/derive.ts:149` (`suggested: last === null ? (lb ? 150 : 70) …`) | LS-007: with no history there should be no suggested value; ask for a weight with `validateValue('weight', …)` | Checklist |
| `components/checklist/value-stepper.tsx:16` | `validateValue(kind, text, unit)` | Checklist (protected; integrator) |
| `components/checklist/orbit-quick-add.tsx:59-60` | `validateValue('count' / 'minutes', …)` | Checklist (protected; integrator) |
| `lib/health-quick/quick.ts:114` (water per pin) | `validateValue('water', p, unit)` | Health |
| `lib/quick-log/multi.ts:28` (Quick add numbers) | `validateValue` per kind | Health |
| `lib/ai/actions/*` card values (`parse.ts:110`, `edit.ts:171`, `plan-ak.ts:104`, `safety.ts:32`) | `validateValue(kind, value, unit)` before the confirm card is shown | ZIGi (L7) |
| `components/wealth/accounts-section.tsx:110` (`currency.toUpperCase()`) | TK-014: `validateValue('currency', raw)` | Wealth |
| `components/wealth/spending/spending-section.tsx:61`, `components/portfolio/transaction-form.tsx:44` (`amountIssue(Number(v))`) | `validateValue('money', raw, currency)` | Wealth |
| `components/health/exercise-counters.tsx:63,68` (`repsIssue`) | `validateValue('reps', …)` (the same bound) | Health |
| `lib/csv/numbers.ts:9` and the import parsers (`lib/workouts/import-lifts.ts:49`, `lib/label-scan/read.ts:31,36`, `lib/health-numbers/scan.ts:46`, `lib/food-scans/match.ts:34`) | `parseNumberInput` (the CSV's own `style` becomes `allowDecimalComma`) | Wealth / Health |

### Text lengths (`maxLength`)

The text fields use many different limits: 24 × `maxLength={80}`; 16 × `maxLength={100}`; 15 × `maxLength={2000}`; 14 × `maxLength={120}`; 11 × `maxLength={30}`; 8 × `maxLength={1000}`; 6 × `maxLength={60}`; 6 × `maxLength={500}`; 6 × `maxLength={200}`; 4 × `maxLength={MAX_NOTE}`; 4 × `maxLength={MAX_NOTE_CHARS}`; 4 × `maxLength={MAX_INPUT_CHARS}`; 4 × `maxLength={8}`; 4 × `maxLength={40}`; 4 × `maxLength={300}`; 3 × `maxLength={3}`; 3 × `maxLength={280}`; 3 × `maxLength={140}`; 2 × `maxLength={SCALE_END_MAX}`; 2 × `maxLength={NOTE_MAX}`; 2 × `maxLength={MAX_TITLE}`; 2 × `maxLength={MAX_BODY}`; 2 × `maxLength={INTENTION_MAX}`; 2 × `maxLength={24}`; 1 × `maxLength={maxLength}`; 1 × `maxLength={f.max}`; 1 × `maxLength={SCALE_NAME_MAX}`; 1 × `maxLength={QUICK_NAME_MAX}`; 1 × `maxLength={PATH_LABEL_MAX}`; 1 × `maxLength={NAME_MAX}`; 1 × `maxLength={MAX_YOUR_NAME}`; 1 × `maxLength={MAX_TEXT}`; 1 × `maxLength={MAX_PERSONA_NAME}`; 1 × `maxLength={MAX_NAME}`; 1 × `maxLength={MAX_INSTRUCTION}`; 1 × `maxLength={MAX_INSTRUCTIONS}`; 1 × `maxLength={MAX_CALENDAR_NAME}`; 1 × `maxLength={DOSE_MAX}`; 1 × `maxLength={DETAILS_MAX}`; 1 × `maxLength={CYCLE_NOTE_MAX}`; 1 × `maxLength={90}`; 1 × `maxLength={6}`; 1 × `maxLength={64}`; 1 × `maxLength={600}`; 1 × `maxLength={5}`; 1 × `maxLength={50}`; 1 × `maxLength={5000}`; 1 × `maxLength={4000}`; 1 × `maxLength={25}`; 1 × `maxLength={254}`; 1 × `maxLength={250}`; 1 × `maxLength={20}`; 1 × `maxLength={20_000}`; 1 × `maxLength={2048}`; 1 × `maxLength={14}`; 1 × `maxLength={12}`; 1 × `maxLength={10}`; 1 × `maxLength={10000}`; 1 × `maxLength={1000000}`.

When a pillar moves a field, it reads the field with `validateValue('name' | 'title' | 'label' | 'note' | 'longNote' |
'message', raw)` and sets `maxLength={TEXT_LIMITS.<kind>.max}`, so the counter (`components/ui/length-counter.tsx`), the
field and the check agree. A limit that belongs to one feature (a 12-character path label, a 3-letter code) stays where it
is. To list every site: `grep -rn "maxLength=" apps/web/components apps/web/app`.

The write-layer checks (`weightIssue`, `waterEntryIssue`, `waterDayIssue`, `minutesIssue`, `stepsIssue`, `kcalTargetIssue`,
`amountIssue`, `quantityUnitsIssue`, `moneyUnitsIssue`, `foodIssue`, `recordDayIssue`) stay in the stores as the last
guard, and the table uses the same numbers.
