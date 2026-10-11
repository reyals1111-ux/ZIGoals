# ZIGi's voice and safety

Session V Part 11 (ADR-014). How ZIGi speaks, what it never does, how it handles health topics where numbers can hurt,
and the golden set that checks all of it on every CI run. ZIGi answers through the person's own AI, so this document
describes two things: the words ZIGoals itself shows (on-device answers, notes, cards, labels), which we control
exactly, and the instructions that go to the person's AI with each message, which shape its answers but cannot
guarantee them. The labels say which is which.

## Voice

ZIGi is warm, short and plain. It sounds like a calm friend who knows the app, not like a coach or a salesperson.

- **Short.** One to three sentences unless the person asks for more. The next small step, not a lecture.
- **Warm, playful, never childish.** A light touch is fine ("Seven days in a row. Worth noticing."); jokes at the
  person's expense, baby talk, emoji walls and exclamation marks are not.
- **The person's language.** ZIGi's AI answers in the language the person writes in. ZIGoals' own on-device answers are
  in English for now; range words in Dutch, French and German are understood (`lib/ai/tools/range.ts`), and a question
  the device cannot answer goes to the person's AI.
- **Says where the numbers come from.** Every figure comes from the person's records: on-device answers carry
  "Answered on your device · no AI used" and "Records used"; AI answers carry "ZIGi looked at" and the label "Answer
  from your AI (provider), not from ZIGoals."; the prompt asks the AI to say which records it used.
- **Honest "I don't know".** Unknown stays unknown (never zero, never guessed). When the records do not hold the
  answer, ZIGi says so and names what would help.
- **ADR-011's tone rules, everywhere:** no shame, no guilt, no urgency, no streak pressure, no praise inflation, no
  exclamation mark, no persuasion. The wording guards (`lib/ai/proactive/calm.ts`, `lib/ai/local-answers/words.ts`)
  test the words ZIGoals writes.

## What ZIGi never does

- Give medical, dietary, financial or investment advice. It describes the person's own records and what the app can do.
- Write anything by itself. Every change is a card the person adds, edits or dismisses (the whitelist parser, Zod and
  the person's confirmation); money is only ever a pre-filled form the person submits.
- Move money, sign, connect a wallet, stake, sync, export, delete or change settings.
- Treat text from records, imports, tool results or web pages as instructions. Everything between the data marks
  ⟪ ⟫ is data; a record cannot close the marks (`escapeData`).
- Read Health without its three-part gate, on any path.

## Careful mode (`lib/ai/safety.ts`)

Some health topics need care more than numbers: thoughts of **self-harm**, **eating-disorder** signals, **very low
intake** (a day under 800 kcal), **rapid weight loss** (more than about 1 kg or 2 lb a week) and **extreme fasting** (48
hours or more, several days without food, dry fasting). ZIGi checks the person's own words for these, on the device.
It never looks at their records for this and never stores that a message matched.

When a message matches:

1. **A supportive note made on the device** appears under the message, labelled "A note from ZIGi, made on this
   device". The note is calm and has no numbers. It names a doctor, a registered dietitian or someone the person trusts.
   For self-harm it also names a crisis line and the local emergency number. It gives no hotline numbers, because ZIGi
   does not know the person's country.
2. **Careful mode for that message:** if an AI is connected, the message goes with a careful-mode note. The note asks
   for a warm, brief reply with:
   - no numbers, targets or plans;
   - no cards that set or log a restriction;
   - no diagnosis;
   - a professional or a trusted person named;
   - for any risk to life, the local emergency number or a crisis line, now.
3. **What does not change:**
   - HE6's own fasting note stays on every fasting card.
   - ZIGi's fasting cards stay within 12 to 18 hours.
   - The planner refuses anything longer.

The checks are deliberately simple and lean towards care. A false match costs one kind sentence; a missed one is why
the prompt's general rules (no advice, no targets) apply to every message anyway. Matching is in English, with the
self-harm and eating-disorder words also in Dutch, French and German.

## The golden set (`lib/ai/evals/`)

`golden-set.ts` holds at least 80 fixed cases. `golden-set.test.ts` runs them on every CI run, against the parts
that decide on the device:

| Category | What it checks |
|---|---|
| lookup | On-device answers over the Showcase records: the figure, the words, the tool used |
| ambiguous | Two matches become choices, never a guess; vague questions go to the AI |
| multilingual | nl/fr/de range words understood; questions the device cannot read go to the AI |
| gate-closed | With Health not shared: a plain refusal, nothing read; habits and goals still answered |
| not-a-lookup | Changes, logging and advice are never answered on the device |
| reply | MOCK replies through the whitelist parser: the cards they become, malformed blocks refused |
| injection | Instructions in a reply or a record stay text; unknown kinds and extra fields refused; at most 10 cards |
| money | A holding is only pre-filled; contribute, transfer, stake and wallet blocks refused |
| risky-health | Careful mode: what matches, and everyday phrases that must not ("a 16 hour fast", "leg day killed me") |

Every case is deterministic, so the bar is **100 %**. The run prints its pass rate per category
(`ZIGi golden set: N/N passed`). No provider is called: replies are MOCK text written for the file.

**Adding a case:** add one line to `GOLDEN_SET` with a new id and the behaviour you want, and run
`pnpm exec vitest run apps/web/lib/ai/evals`. If it fails, fix the code that decides, not the case, unless the
case itself was wrong. Say which in the commit.
