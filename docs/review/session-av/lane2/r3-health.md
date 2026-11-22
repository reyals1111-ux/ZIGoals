# Lane 2 round 3 — health (Waterllama, Way of Life, Carb Manager, Nike Training Club): builder registry

Branch `lane2/r3-health`, from `lane2/batch2` at `3d27688e`. Rows: LEDGER "Round 3: rows #256–#299", groups T2
(Waterllama, #280–#283), T4 (Way of Life, #275, #276), T7 (Carb Manager and Nike Training Club, #284, #286–#289). One
section per feature. Every stored change is listed under "Stored changes" for the lead's TIER 3 (stored formats) label;
every notification-plan change under "TIER 3 (PWA)".

Health's rules kept throughout: every Health part sits inside the Health route (its gate and consent); no calorie
expenditure is estimated anywhere new; no medical claim, range or verdict. Every new Health UI is in the lazy
`components/health/r3/health-r3.tsx` entry (one `lazy()` line each in `health-app.tsx` and `daily-tools.tsx`; the first
chunk carries only those lines, two small props and the water form's two-line handle on the energy fields).

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:notify:v1` (existing, device-only, loose) | optional `waterSpread` `{on, from, to, every: 60 \| 120 \| 180}` and `weighIn` `{time, repeat: daily \| weekdays \| monthly, weekdays? (mask 1–127), day? (1–28)}`, each `.optional().catch(undefined)` (a part of `weighIn` it cannot read is dropped alone). Commit `cec6b6ee`. | Kept untouched; an older build keeps its one water time and has no weigh-in type. |
| `zigoals:health-extras:v1` (existing, device-only, loose) | optional `ownDrinks` (≤ 30 `{id, name 1–24, type (a fixed drink type), sizeMl 1–2000, symbol?, colour?, caffeineMg?, kcal? 0–2000, sugarG? 0–300}`; an unreadable drink is dropped, the others kept), `waterTips` (boolean); a drink note gains optional `own` (its own drink's id), `kcal`, `sugarG`, each `.optional().catch(undefined)`. Commit `cec6b6ee`. | A drink note keeps its fixed `type` and `caffeineMg`, so an older build reads every entry as before. |

## TIER 3 (PWA)

- `lib/notify/plan.ts`: `waterSpread` items (the `water` kind, ids `water-1`…`water-12`, recurring wakes; skipped today
  once on pace; refused inside quiet hours; when present they stand in for the one water time). The service worker's
  existing water line composes them (`Water: 400 mL to be on pace`); `public/sw.js` unchanged. Feature 1.

## Shared to-do for the lead (all features)

- engine.ts wiring: see "Answers" at the end.
- Search (static.ts): see each feature.
- Showcase hook: see "Showcase" at the end.
- CSS files touched (for the theme sheets): `components/health/r3/health-r3.css` (new) and those listed per feature.
- Nothing is added to Today.

## 1. Water: reminders through the day, your own drinks, energy and sugar from drinks, a tip a day — LEDGER #280 built, #281 built, #282 built, #283 built

- What: Health → Diary → the Water card, under the one-tap row (its own chunk):
  - Your own drinks as one-tap buttons (symbol, name, usual size; the colour as an edge), each a water entry with its
    drink, its caffeine, energy and sugar copied on, and Undo. "Your drinks (n of 30)" makes, edits, moves and removes
    them: a name, what it counts as (one of the fixed drink types, so older builds read it), a usual size, caffeine,
    energy (kcal) and sugar (g), a symbol and a colour (each named for screen readers). The empty state teaches. Removing
    a drink keeps what was logged with it.
  - The water form gains "Energy (kcal, optional)" and "Sugar (g, optional)" (blank is unknown, never zero), kept with the
    entry; Edit shows them again. The card says "From today's drinks, as you typed them: 250 kcal · 21.5 g sugar", and the
    food day's summary gets a drink line ("Drinks: 250 kcal · 21.5 g sugar from 2 drinks as you typed them (1 more
    without an amount, not counted). Food and drinks together: 1,980 kcal."). The food total, its ring and the targets
    stay food only, as before: nothing pinned moves. Nothing is looked up or guessed.
  - "Show a water tip each day" (a pressed button, off by default) shows one practical tip a day from 28 written in the
    repository in English and Dutch ("Put a glass by the kettle…"), with Another tip and In het Nederlands. No health
    claims (a unit test bans the words).
  - "Reminders through the day": from, to, every 1, 2 or 3 hours (default 09:00–21:00 every 2 hours); each reminder is
    skipped when today is on pace (a straight line from nothing at the start to the whole target at the end; the first
    once anything is logged); the card lists today's times with "skipped: you are on pace", "400 mL to be on pace" or
    "inside your quiet hours, not sent"; with no target every reminder comes and the card says so. Switching it on
    switches the Water notification type on; the card says when notifications are off on this device or Water is muted.
- Files: `lib/water-spread.ts`, `lib/own-drinks.ts`, `lib/water-tips.ts` (new, pure); `lib/health-extras.ts`,
  `lib/notify/prefs.ts` (stored commit); `lib/notify/plan.ts`, `lib/notify/sync.ts`; `components/health/r3/health-r3.tsx`,
  `water-more.tsx`, `drink-fields.tsx`, `health-r3.css` (new); `components/health/daily-tools.tsx` (one lazy line, the
  form's handle), `components/health/health-app.tsx` (one lazy line, the drink line).
- Tests: `lib/av2-r3-water.test.ts`, `lib/notify/av2-r3-health-stored.test.ts`; existing notify, health-extras and sw
  tests unchanged and green. Spec: `tests/av2-water-day.spec.ts`.
- Stored: see the table (commit `cec6b6ee`).
- Help (EN): **Can I make my own drinks?** Yes. In Health → Water, open "Your drinks" and add up to 30: a name, a symbol
  and colour, a usual size, and the caffeine, calories and sugar if you know them. Each one is a button above: one tap logs
  it. **Are calories from drinks counted?** Only when you type them, on one of your drinks or in the water form. The day's
  drinks show as their own line beside your food, with food and drinks together; nothing is guessed, and every drink still
  counts as water as you logged it. **Can water reminders follow my day?** Yes. "Reminders through the day" reminds you
  every one, two or three hours between the times you choose, and skips a reminder when you are on pace for your target.
  Quiet hours are kept. Notifications must be on for this device. **What are the water tips?** One small, practical idea a
  day for having water at hand, in English or Dutch. They are off until you choose "Show a water tip each day".
- What's new: "Water: your own drinks in one tap, calories and sugar from drinks as you type them, reminders that follow
  your pace, and a tip a day."
- Search (static.ts): "own drinks", "drink calories", "water reminders", "water tip" → `/app/health#water`.
- Device keys / catalogue / export / erase: nothing new (both records are registered).
- CSS: `components/health/r3/health-r3.css`. Nothing on Today.
