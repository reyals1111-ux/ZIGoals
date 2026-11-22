# Lane 2 round 2 — body and mind (Rise, Reflectly, Moodnotes, Fitbod): builder registry

Branch `lane2/bodymind-r2`, from `lane2/batch2` at `dddaace8`. Rows: LEDGER "Round 2: rows #223–#255", groups R2 (Rise,
#235–#238), R3 (Reflectly, #230, #231), R4 (Moodnotes, #232, #233), R6 (Fitbod, #239–#241). One section per commit.
Every stored change is listed under "Stored changes" for the lead's TIER 3 (stored formats) label.

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|

## Shared to-do for the lead (all features)

- engine.ts wiring (one line, after `av2BodyAnswer`, same shape):
  `if (!subject) { const own = av2BodymindR2Answer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2BodymindR2Answer} from './av2-bodymind-r2';`.
- Corpus: add `AV2_BODYMIND_R2` (`lib/ai/evals/as/cases-av2-bodymind-r2.ts`) to `CORPUS` in `cases.ts` and record `expected.json`.
- New specs for the shard lists: see each feature.
- CSS files touched (for the theme sheets): see each feature.

## 1. Naps in the sleep balance and on the energy curve; a sleep need from your own nights — LEDGER #237 built, #238 built

- What: Health → Sleep → "Your last 7 days" → Sleep balance gains a line when a nap fell on a logged day in the last 14
  days: "With your 2 naps counted (55 min, each on the day it ended, marked as naps): about … a night." The nights-only
  balance and the sleep debt stay as they were (pinned figures unchanged); the debt's note now says it is nights only
  (it said "Naps count toward the day they end on", which the code never did). A nap only counts on a day with a logged
  night, so it never stands in for a missing night. Today's naps sit on the energy curve as a "Nap" band, with a small
  estimated lift after each (a groggy dip first after a nap over 40 minutes), named in the key, listed under the curve
  ("Your nap today 13:00–13:25 · 25 min"), in the chart's spoken summary and in Why?. Under "Your sleep goal", "Your sleep
  need, an estimate": the middle of the person's weekend nights over the last 30 days (at least four; else the longer half
  of at least ten nights), rounded to 15 minutes, between 5 and 11 hours, labelled an estimate and not medical advice,
  with "Use 8 h 30 min as my goal" (the existing goal write, the bedtime window kept, with Undo). The empty state says how
  many nights it needs.
- Files: `lib/sleep/naps-need.ts` (new, pure), `lib/energy-curve/curve.ts` (`naps`, `napLiftAt`, summary and Why),
  `components/sleep/energy-curve.tsx`, `components/sleep/energy-curve.css` (the nap band), `components/health/sleep/sleep-view.tsx`
  (the balance line, the debt note, the lazy need card), `components/health/sleep/sleep-need.tsx` (new, its own chunk),
  `components/health/sleep/av2-bodymind-sleep.css` (new).
- Tests: `lib/sleep/av2-naps-need.test.ts`, `lib/ai/local-answers/av2-bodymind-r2.test.ts`; existing `lib/energy-curve/*`
  and `lib/sleep/*` tests unchanged and green. Spec: `tests/av2-naps-need.spec.ts`.
- Stored: nothing (derived; keeping the estimate is the existing goal write).
- Help (EN): **Do naps count in my sleep?** Yes. A nap on a day you also logged a night is added to the sleep balance on
  the day it ended, marked as a nap, beside the nights-only balance. Today's nap also shows on the energy curve with a
  small lift after it, an estimate. **How much sleep do I need?** Health → Sleep → Your sleep goal shows an estimate from
  your own log: the middle of your weekend nights over the last 30 days, when most people wake without an alarm. "Use … as
  my goal" keeps it; nothing changes until you do. It is an estimate, not medical advice.
- What's new: "Sleep: naps count in your balance and lift your energy curve, and an estimate of your own sleep need."
- Answers: "what is my sleep need" / "wat is mijn slaapbehoefte", "how much sleep do I need" / "hoeveel slaap heb ik
  nodig", "do my naps count in my sleep balance" / "tellen mijn dutjes mee in de slaapbalans".
- Showcase hook: none needed (the Showcase's sleep already has a nap two days back and weekend nights: the balance line
  and the estimate show there; no pinned count reads them).
- Device keys / catalogue / export / erase: nothing new. Search (static.ts): "sleep need", "naps" → `/app/health?view=sleep`.
- CSS: `components/sleep/energy-curve.css`, `components/health/sleep/av2-bodymind-sleep.css` (new). Nothing on Today.
