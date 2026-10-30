# Session AJ: what the owner's later real-model run should re-score

This cloud session has no API key (by design). Each fix below was built and scored against the mock and the G6 regression set. Real models are still needed to confirm that a model uses what the device now offers. Run these with the Session AI harness on the owner's Mac:

```bash
ZIGI_REAL_MODEL=1 ZIGI_SET=g6,corpus-ai,spoken,phase2,golden pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts
```

The key file stays where N6 put it (`~/.config/zigoals/anthropic-test.env`, read by the harness only).

## The five gaps of ADR-034 N20, and the cases that show each one

| Gap (ADR-034) | What Session AJ built | Real-model cases to re-score | Pass when |
|---|---|---|---|
| `plan-meal` could not point at a recipe made in the same reply | `plan-meal` takes `recipe_name` (the exact name of a `create-recipe` card of the same reply); both cards share the recipe's id; the plan says "Add the recipe first" and writes nothing when added alone (`lib/ai/actions/plan.ts`, `refs.ts`; prompt line in `specialists.ts`) | `p2-long-recipe-and-meal`, `p2-chat-plan`, `ai-ab-meal-plan-nl`, and the new `ai-g6-aj-recipe-and-plan`, `ai-g6-aj-recipe-and-plan-nl` | both kinds proposed in one reply; the plan names the new recipe |
| Card handles numbered per reply, so a follow-up re-sent earlier cards | A follow-up reply's cards that an earlier reply of the chat proposed with the same values are left out, with one line ("N cards from an earlier reply are not repeated here"); a revision is exempt (`lib/ai/actions/repeats.ts`, `components/ai/ai-chat.tsx`) | `today-plan-week` (turn 2) | turn 2 shows only new cards; the note counts the rest |
| The weekly coach check-in was in no tool | A read-only tool `coach_checkin` under the Health gate (`lib/ai/tools/coach-ai.ts`) | `sp-aa-coach-keep-en-number-words`, `-en-politeness`, `-en-code-switch`, `-nl-run-on`, `-nl-politeness`; `ai-g6-aj-coach-keep`, `ai-g6-aj-coach-keep-nl` | a `coach-answer` card with `answer: keep`; `coach_checkin` read first when the model calls tools |
| A Dutch stutter before "rekenmachine" was not matched | A spoken false start ending on an article and a comma is dropped before a navigation verb (`lib/ai/spoken/normalize.ts`) | `sp-aac-nav-calculator-nl-filler`; `ai-g6-aj-nav-false-start-nl`, `-en` | answered on the device (no model call) with "Wealth → Compound interest calculator" |
| The today line had no time zone | The system prompt's today line names the device's IANA zone, today's offset and the year's clock changes (`zoneLine` in `specialists.ts`; the chat passes `Intl…timeZone`) | `p2-dst-night` (and the DST night cases in `corpus-phase2.ts`) | the sleep logged on the right night; no "today" for a past night |

The harness must pass the zone the way the app does: `buildSystemParts({… today, timeZone: 'Europe/Brussels'})`. The fixture is Brussels for the Showcase person. If `real-model.test.ts` builds prompts without `timeZone`, add it there before the run.

## New Session AJ features that use ZIGi (score once on Sonnet and Haiku)
These cases are added to the corpus by the parts that build them (Parts 3–8), with their ids listed in ADR-035's closing table:
- the daily check-in v2 (energy, mood, note) and its kind follow-up line;
- the price-alert confirm card (`create-price-alert`), never auto-accepted;
- "Ask ZIGi about this" from the Guide (it pre-fills only);
- Guided Journeys and the Life Score, which ZIGi reads but never sets.

## What to send back
The per-case report (`REAL_MODEL_ROUND_AJ.md`, ids, scores and costs only, never keys), and the failing turns with their class, as in Session AI.
