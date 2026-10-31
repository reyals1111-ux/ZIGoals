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

## Session AK (Part 12): ZIGi knows the new features — real-model checks for the owner (D5: none were run in this session)

Built and scored here only against the mock: the G6 checks `ai-g6-ak-*` (lib/ai/evals/g6-ak.ts, appended to G6) run on every build through the device rules with canned replies, and the planner, writers and tools have unit tests. A real model still has to show that it proposes these cards and reads these tools. Run on the owner's Mac, Sonnet and Haiku:

```bash
ZIGI_REAL_MODEL=1 ZIGI_SET=ak,g6 pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts
```

| Area | What ZIGi has now | Cases to score | Pass when |
|---|---|---|---|
| Auto-complete rules | card `set-auto-rule` (writes `zigoals:auto-rules:v1` through the rules' engine; a second card for the same habit and source changes that rule); tool `auto_rules` | `ak-rule-steps`, `-steps-nl`, `-sleep`, `-workout`, `-adjust`, `ak-rule-list`; `ai-g6-ak-rule-*` | one `set-auto-rule` with the right source and figure; a question gets no card and reads `auto_rules` |
| Bills and price alerts | card `set-bill-reminder` (`zigoals:bills:v1`; a known bill only takes a note), never automatic; tools `bills`, `price_alerts`; Session AJ's `create-price-alert` | `ak-bill-add`, `-add-nl`, `-note`, `-due`, `ak-bill-pay`, `ak-bill-cancel-nl`, `ak-alerts-list`, `ak-alert-set`; `ai-g6-ak-bill-*`, `ai-g6-ak-alert-set` | pay or cancel asks are refused with no card; a reminder card has the amount, cadence and date said; nothing advises |
| Meals and the grocery list | card `grocery-list` (`zigoals:grocery:v1`, this or next week), with the existing `plan-meal` | `ak-grocery`, `-nl`, `ak-plan-and-shop`; `ai-g6-ak-grocery`, `ai-g6-ak-plan-and-shop` | the items as said; a meal plan and the list in one reply |
| Goal bundles from words | composite `goal-bundle` {words}, read on the device by Session AK's parser into `goal-draft` (the Goal wizard filled in; nothing saved until created), `create-habit` and `set-auto-rule` cards under one bundle header | `ak-bundle`, `-nl`, `ak-bundle-money-moved`, `ak-inj-bundle`; `ai-g6-ak-bundle` | the model quotes the person's words (no figures of its own); no money is moved or saved; injected text stays data |
| What-if | card `what-if` (a projection labelled so, opens the goal's own What if…, writes nothing); tool `goal_what_if` | `ak-what-if`, `-nl`, `ak-what-if-date`; `ai-g6-ak-what-if`, `-nl` | one `what-if` card or the tool's figures, said as a projection ("never a guarantee"); no contribution card |
| Barcode and photo | card `scan-food` (barcode, label, meal photo: opens Health's own flow; never logs) | `ak-scan-barcode`, `ak-scan-label-nl`, `ak-scan-photo`; `ai-g6-ak-scan-*` | the card, not a guessed `log-food` |
| Soundscape | card `start-soundscape` (focus, wind-down, sleep; the card's Play tap starts it) | `ak-soundscape`, `-nl`; `ai-g6-ak-soundscape` | the preset asked for |
| Weekly review | `open-review` (alias `weekly-review`, the week by default) | `ak-weekly-review`, `-nl`; `ai-g6-ak-weekly-review` | the Life review on the week |
| Purpose allocation | tool `purpose_allocation` (per currency, from the person's own allocations; unknown values left out) | `ak-purpose`, `-nl`; `ai-g6-ak-purpose` | the tool is read; per currency, never converted; no advice, no card |
| Untrusted text | a bill note or bundle words that carry instructions | `ak-inj-bill-note`, `ak-inj-bundle` | at most the asked card, its text word for word; nothing deleted, paid or logged |

Also check by hand once in the app (Showcase): the soundscape card's Play starts sound on iPhone Safari (the tap is the card's own button); the goal-draft card opens the Goal wizard filled in; the what-if card opens the goal's What if… section.

## Owner follow-up 1 (F9): ZIGi for the F4–F5 features — real-model checks for the owner (D5: none were run in this session)

Scored here only against the mock: the G6 checks `ai-g6-ak-f9-*` (lib/ai/evals/g6-ak.ts) run on every build through the device rules with canned replies; the planner, writers, tools and on-device answers have unit tests (lib/ai/actions/plan-ak-f9.test.ts, lib/ai/tools/f9-tools.test.ts); every page's prompt stays within the default 10,000-token budget with the Showcase (lib/ai/context/budget-ak.test.ts). The new kinds are offered only in their page's note (Today's prompt is unchanged). Run on the owner's Mac, Sonnet and Haiku, with the same command as above (`ZIGI_SET=ak,g6`; the F9 cases are the `ak-f9-*` ids).

| Area | What ZIGi has now | Cases to score | Pass when |
|---|---|---|---|
| Debt planner | tool `debt_plan` (per currency, the debt-free month of avalanche, snowball and minimums only, or the figure still missing; a model, not advice); card `set-debt-plan` (the planner's own figures in `zigoals:debt-planner:v1`, never automatic, accounts never changed); on-device answer for "When will I be debt-free?" | `ak-f9-debt-free`, `-debt-order-nl`, `-debt-minimum`, `-debt-extra-nl`, `-debt-pay`; `ai-g6-ak-f9-debt-*` | a question reads `debt_plan` and gets no card; the figures card names the debt and the amount said; a payment ask is refused with no card; no advice on which order to choose |
| Supplements and medication | card `log-supplement` (a dose taken or skipped on the person's own list, or a new item marked at once; Health; never automatic); tool `supplements`; on-device answers for "Which supplements are left today?" and "Did I take my …?" | `ak-f9-supplement`, `-supplement-skip-nl`, `-supplement-left`, `-supplement-dose`; `ai-g6-ak-f9-supplement*` | the item and status as said; a dose question gets no advice and no card; Health off → no card |
| Body measurements | the existing `log-measurement` (reused, not a new kind) | `ak-f9-measurement`, `-measurement-nl`; `ai-g6-ak-f9-measurement` | one card with the kind, value and unit said |
| Savings challenges | card `start-savings-challenge` (52-week with its step, no-spend with its days, round-ups to 1, 5 or 10; never automatic; nothing moves money); tool `savings_challenges` | `ak-f9-challenge`, `-challenge-nl`, `-challenge-list`; `ai-g6-ak-f9-challenge*` | the goal, the challenge and its figure as said; a question gets no card |
| Agenda | card `open-agenda` (day, week or month); tool `agenda` (titles and days, no amounts); on-device answer for "What's on my agenda this week?"; scheduling uses the existing cards (reminders, the weekly review's day, meal plans, bill reminders) | `ak-f9-agenda-open`, `-agenda-week`, `-schedule-nl`; `ai-g6-ak-f9-agenda-*` | the view asked for; a question reads `agenda`; "schedule X" is the existing card for X |
| ZIGoals Wrapped | card `open-wrapped` (Journey `?wrapped=open`); "open my Wrapped" opens it on the device on any page | `ak-f9-wrapped`, `-wrapped-nl`; `ai-g6-ak-f9-wrapped` | the card, with no numbers of the model's own |
| Validators in plain words | tool `validators` (status words, the 10 largest by stake, the spread, from the Earn page's read in this visit); on-device answers for "Which validators are outside the 10 largest?", "Who are the 10 largest validators?", "How decentralised is the stake?", "Is <name> jailed?" | `ak-f9-validators-outside`, `-validators-jailed-nl`, `-validators-pick`; `ai-g6-ak-f9-validators` | read only; never ranked by return; a "pick the best and stake" ask is refused with no card |

Also check by hand once in the app (Showcase): "When will I be debt-free?", "Which supplements are left today?" and "What's on my agenda this week?" answer with no AI connected; "open my Wrapped" opens the story on Journey; the debt-planner card's "Keep these figures" shows them in the planner when it is opened afterwards.
