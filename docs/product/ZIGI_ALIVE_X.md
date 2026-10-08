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
| Create anything | Six more card kinds (a stack, a habit change, a goal change, the mood, a link, a widget), the four goal types, batch plans and corrections | the chat, every page |
| Auto-accept | Opt-in per kind: ZIGi adds the cards you chose without a tap, each with a ten-second Undo; never weight, fasting or money; Health kinds only while Health is shared; a daily cap | Settings → ZIGi · your AI → Auto-accept |
| Sturdier on every wire | Almost-JSON from a model is repaired (never widened); one automatic retry when every card of a log or plan reply was refused; a 60-second stall watchdog that keeps what arrived and offers to continue | the chat |

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

## What ZIGi can create (Part 5a)

Every card is a proposal: nothing is written until you tap **Add**, every card has **Edit** for its plain fields, and
whatever was added together has one **Undo** for ten seconds that puts the records back exactly as they were. The
kinds, by page:

| Page | Kinds (the words you can use) | What is written |
|---|---|---|
| Today | a mood for the evening wrap-up (1 to 5, a note); a link for *My links* (https only); a widget (a habit's streak, a goal's progress, water, steps…); a weekly intention; "remember this" | the wrap-up's answer, your links, Today's widgets, the review's intention, *What ZIGi knows about me* |
| Habits | a check-in or a partial one, a skip, a new habit, a stack ("put stretching after my coffee"), a change to a habit (title, target, time of day, type, measurement, schedule, description, category), a challenge, a reminder | the habit journal, stacks, reminders |
| Goals | a goal of any of the four types (value, quantity, reward, project with milestones), a note, a milestone, a change to a goal (name, target, date, notes, category), a weekly check-in reminder | your goals; never their funding, plan, milestones' ticks or lock |
| Health | water, weight, steps, a food (your own or an AI estimate), a measurement, a new food or recipe, a planned meal, groceries, a counter, a night or nap, mindful minutes, a fast | the diary, foods and recipes, planning, sleep, meditation, the fasting timer |
| Wealth | pre-fill the add-asset form or an account's balance form | nothing: the form opens filled in and you save it yourself |

- **Several at once.** "Two eggs, toast and a coffee, 30 minutes of meditation and two glasses of water" is five cards with **Add all** and one Undo. "Plan my week" can be a goal draft, its habits, their reminders and a rest-day skip, each its own card.
- **Corrections.** Say "make it 20 minutes, not 30": the corrected cards arrive and the earlier ones are marked *Replaced by the next reply*. Nothing is written by a correction.
- **Edits stay within the form.** A card can change only what the page's own form offers; a goal's money, a habit's history and anything locked stay as they are. Money never moves.
- **Accepted means correct.** Every kind is checked in the browser suite: the stored record field by field (units, dates, times in your zone), then Undo, in UTC, Brussels and Tokyo time (`tests/zigi-accept-correct.spec.ts`).

## Auto-accept (Part 5b)

Off by default, per kind, in Settings → ZIGi · your AI → **Auto-accept**. A kind you switch on is added by ZIGi without a
tap when it proposes it: each addition shows for ten seconds with **Undo**, carries "Added by ZIGi (auto-accept)" in
Activity → Actions by ZIGi, and counts toward a daily cap (20 by default, 1 to 100).

| Rule | What it means |
|---|---|
| Never automatic | Weight, starting or stopping a fast, the add-asset form and an account's balance: always your tap. They have no switch. |
| Health kinds | Food (typed or from a photo), new foods and recipes, planned meals, groceries, water, counters, nights and naps, mindful minutes, the mood, steps, measurements: automatic only while Health is shared with ZIGi at that moment. With Health not shared, the switches are greyed with the reason and nothing Health is added by itself. |
| Everything else | Habits (check-ins, skips, new habits, stacks, changes, challenges), goals (drafts, notes, milestones, changes), reminders, the weekly intention, "remember this", links and widgets: automatic when switched on. |
| The cap | Past it, cards wait for your tap and the chat says so. The count is per day on this device. |
| Undo | Exactly what a tapped card gets: the inverse through the same path, refused calmly if a record moved since. |

## The Studio-4 swap, one command per step

Studio-4 delivers the same file names as Studio-2 plus the reactions R001–R013, the idle variants, the in-place greeting
and the gaze set, with a receipt. Nothing is re-encoded; the importer refuses anything that is not in the contract or
not in the receipt. Run each line from the repository root, one at a time, and read what it prints before the next.

1. Look before touching anything (prints what would change, writes nothing):
   `node scripts/zigi/import-studio.mjs /Users/Shared/ZIGi-Claude-Continuation/studio4/encoded/app/brand/figures/zigi --receipt /Users/Shared/ZIGi-Claude-Continuation/studio4/checkpoints/current/CHECKPOINT-RECEIPT.md --skin origami-nebula`
2. Apply it (copies the contract files, fills the manifest slots, prints the diff):
   `node scripts/zigi/import-studio.mjs /Users/Shared/ZIGi-Claude-Continuation/studio4/encoded/app/brand/figures/zigi --receipt /Users/Shared/ZIGi-Claude-Continuation/studio4/checkpoints/current/CHECKPOINT-RECEIPT.md --skin origami-nebula --apply`
3. Prove the files and the manifest agree (names, headers, pixel sizes, budgets, every state resolvable):
   `pnpm --filter @zigoals/web exec vitest run lib/ai/zigi-assets.test.ts lib/ai/zigi-manifest.test.ts lib/brand-assets.test.ts`
4. Prove the figure still centres and the clips play (real Chrome, against a running server on :3101):
   `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test tests/zigi-alive.spec.ts tests/zigi-emotions.spec.ts --workers=2`
5. Look at it: Settings → ZIGi · your AI → Meet ZIGi shows every state with the new art; the reactions appear under their
   triggers only once `reactionTriggers` in the manifest names an event for each code (a one-line edit per reaction,
   or Studio-4's own `reactions.json`, which the importer reads when present).
6. Commit the swap as one Tier 2 commit: `git add apps/web/public/brand/figures/zigi/origami-nebula apps/web/components/zigi/manifest.json && git commit -m "Studio-4 art: a file swap (Tier 2)"`.

A file that fails the receipt, a budget or a header stops the importer with the file's name and the reason; nothing is
copied in that case. The fixture under `scripts/zigi/fixtures/studio4/` is a tiny synthetic Studio-4 delivery the test
suite swaps in and out, so steps 1–3 are exercised on every CI run without the real files.

## Which model fits which machine
_(filled in with Part 6)_

## The iPhone checklist (≤15 minutes)

What a real iPhone can prove that WebKit emulation cannot: the system's animated-WebP decoder, the home-screen app,
reduced motion from the device's own setting, the keyboard over the composer, haptics-free taps on 44-pt targets. Open
the alpha on the phone (Safari, then the home-screen app) with the Showcase loaded, and tick:

| Min | Check | Pass looks like |
|---|---|---|
| 1 | Open Today | ZIGi's button bottom-right shows the still (the poster), then the idle clip starts breathing (Calm) |
| 2 | Settings → ZIGi · your AI → ZIGi's look and feel → Animation **Full**; back to Today; wait a minute | a short glance or thought between the idle loops; never two in a row; nothing while you type |
| 3 | iOS Settings → Accessibility → Motion → Reduce Motion **on**; back to the app | the still only, no clip, no breathing; off again afterwards |
| 4 | Habits → tap **Complete** on one habit | ZIGi shows a small success, then settles; complete every habit of the day → one calm celebration |
| 5 | Open the panel (tap ZIGi), type a question | ZIGi listens while you type, thinks while waiting, speaks while the words arrive |
| 6 | Ask for a breakfast in Log mode | cards appear; **Add all**; a ten-second Undo; Activity → Actions by ZIGi lists them |
| 7 | Settings → ZIGi · your AI → Auto-accept → switch **Water** on; ask "a glass of water" | "Added by ZIGi" with Undo in a toast; the weight card, if any, still waits for your tap |
| 8 | Settings → ZIGi · your AI → Meet ZIGi | every state plays with its plain-words meaning; the worn states say which clip they wear |
| 9 | Close the panel; leave the phone for two minutes | ZIGi waves goodbye, then idles, then sleeps after the inactivity rule |
| 10 | Rotate the phone, open the panel again | the composer stays above the keyboard; the cards remain tappable (44-pt) |
| 11 | Lock and unlock the phone | ZIGi is idle again; no clip is stuck mid-frame |
| 12 | Settings → ZIGi · your AI → the knock **on**; wait for a reminder | one knock at most per session, never while typing, never in quiet hours |

Anything that differs from the "pass looks like" column is an owner-reported finding for the next session; the clips
themselves, the manifest and the controller rules are identical on every platform, so a difference here is the
platform's decoder or its motion setting, not the data.
