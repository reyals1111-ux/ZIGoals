# ZIGi comes alive (Session X-Local): the owner's guide

What this release adds to ZIGi, how it decides what ZIGi feels, how to swap in Studio-4's files, and which model fits
which machine. Decisions: [ADR-017](../architecture/ADR-017-session-x-local.md). Evidence: [STATUS.md](../STATUS.md)
and [ZIGI_REAL_MODEL_TEST.md](../verification/x-local/ZIGI_REAL_MODEL_TEST.md). The asset contract:
[ZIGI_ASSET_SPEC.md](ZIGI_ASSET_SPEC.md).

## What is new

| Area | What | Where |
|---|---|---|
| The art | Studio-2's eleven clips (idle, greeting, insight, listening, speaking, presenting, attention, sleepy, celebrate, thinking, error) with their stills and APNG fallbacks; the fourteen other states wear one of them | the launcher, the panel, Meet ZIGi |
| Posters first | A state's still shows at once; its clip loads only when that state shows and ZIGi is on screen; nothing is preloaded | everywhere ZIGi is drawn |
| Idle that feels alive | Under **Full**, a rare glance or thought between the idle loops; **Calm** keeps the idle clip; **Off** holds a still | Customize → Animation |
| Emotions that match | One semantic-event layer: the app and the chat tell ZIGi what happened; a controller applies the rules (below) | every page |
| Calm celebrations | Celebrate and proud only for moments the app confirmed; small successes otherwise; at most 3 celebrations a day | Habits, Goals, Health |
| The AI's hint | Your AI may suggest one mood per reply from a fixed list; the app checks it and never lets it celebrate or knock | the chat |
| Studio-4 ready | Reactions R001–R013, idle variants, the in-place greeting and the gaze set have their slots; one command swaps the files in | `scripts/zigi/import-studio.mjs` |
| Meet ZIGi | Every state with the real art and what it means in plain words | Settings → ZIGi · your AI → Meet ZIGi |

## The state and emotion table

| What happens | Who validates it | ZIGi shows | Rule |
|---|---|---|---|
| The panel opens (first time today) | the launcher | greeting | once a day |
| The microphone is on, or you type in a text field | the chat / any page | listening | stops 3 s after the last key |
| Waiting for your AI's first words | the chat | thinking | — |
| Your AI reads your records through ZIGi's tools | the tool loop | reading your data | — |
| Your AI streams its answer | the chat | speaking | — |
| A proposal card is being written | the chat | writing a proposal | — |
| An answer arrived | the chat | insight | — |
| An answer with cards arrived | the chat | presenting | cards win over a hint |
| An answer on the device, no AI | the lookup engine | success | — |
| A card you accepted, a logged meal, water, weight, a night (not the first), a manual meditation entry, a plain habit completion | the store confirmed the write | success (small) | validated only |
| All of today's scheduled habits done | the habit engine | celebrate | once a day, validated only |
| A streak milestone (3, 7, 14, 21, 30, 50, 100 …) | the habit engine | proud | validated only |
| A goal milestone reached or done; a goal funded | the Goals store | celebrate | once per milestone, validated only |
| A challenge finished | the habit engine | celebrate | once per challenge, validated only |
| A meditation session finished (the timer) | the Meditation store | celebrate | validated only |
| The first night logged for its wake day | the Sleep store | celebrate | validated only |
| Two matches: ZIGi asks which one | the lookup engine | curious | — |
| ZIGi cannot answer that here | the lookup engine | confused | — |
| A sensitive topic (careful mode) | the safety check | empathetic | wins over a hint |
| Your week with ZIGi opens | the panel | encouraging | — |
| A request failed (recoverable) | the chat | error | 8 s cooldown |
| The device goes offline / comes back | the browser | offline / idle | — |
| Chrome's on-device model loads | the panel | loading a model | — |
| A reminder is due (the knock) | the knock | reminder | one per session, none after a dismissal, none 22:00–08:00, none while typing, never on a private screen |
| The panel closes | the launcher | wave goodbye | — |
| The panel has been quiet for 90 s | the machine's timer | sleepy | — |
| Your AI hints `insight`, `curious`, `encouraging`, `empathetic`, `surprised` or `confused` | the app validates the word | that mood | never a celebration, never a knock; cards and careful mode win |

Celebrations are capped at **3 a day**; past the cap a celebration is a small success. Reactions keep **8 s** between
them (the conversation's own flow, listening → thinking → speaking, never waits). Celebrate, proud, attention, reminder
and peek never show on a private screen. Every rule is tested (`lib/ai/zigi-semantic.test.ts`, `tests/zigi-emotions.spec.ts`).

## The idle rotation

Under **Full**: ZIGi rests in its idle clip; every 25–60 s (random) a variation plays once: a *glance* (the listening
clip, weight 0.5; the thinking clip, 0.3) or, rarely, an *accent* (the insight clip, 0.2); the base idle keeps half of
every pick; never the same variation twice in a row; an accent at most once per 3 minutes. It runs only while the tab is
visible, ZIGi is idle, motion is allowed and nobody has typed for 3 s. **Calm** (the default) plays the idle clip only.
**Off**, reduced motion and Motion Off show a still. Sleepy comes only from the 90 s inactivity rule. The Studio-4 idle
variants (X010, X011) join the pool when their files land.

## Auto-accept (Part 5b)
_(filled in with Part 5)_

## The Studio-4 swap, one command per step
_(filled in with Part 8; the importer is `scripts/zigi/import-studio.mjs`)_

## Which model fits which machine
_(filled in with Part 6)_

## The iPhone checklist (≤15 minutes)
_(filled in with Part 8)_
