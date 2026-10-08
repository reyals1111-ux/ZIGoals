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

## The timings, as tuned (Phase 2 P2.5)

Every state was watched on both forms (the close-up clips on `review/session-x-local-screens`, `clips/states/desktop-closeup/`
and `phone-viewport/`) and is held by a spec; none of the values below changed in Phase 2, each was kept for the reason given.

| Timing | Value | Where | Kept because |
|---|---|---|---|
| The greeting, then listening | 2.5 s one-shot, listening follows it | `components/zigi/events.ts` (`listenAfter`) | The composer takes focus the moment the panel opens; before Phase 2 the greeting was never seen on a click-open (ADR S52). On the clip the wave completes, then the lean. |
| Typing guard | 3 s after the last writing key | `components/zigi/alive.ts` (`TYPING_GUARD_MS`) | Only characters, Backspace, Delete and Enter count; Escape, Tab and the arrows no longer hold "listening" or suppress a knock (ADR S54). |
| Sleepy | 90 s of quiet with the panel open | `components/zigi/events.ts` (`SLEEPY_AFTER_MS`) | Long enough that reading a reply never looks like neglect; the next event wakes ZIGi. |
| Reactions apart | ≥ 8 s between non-conversational reactions | `components/zigi/semantic.ts` (`REACTION_GAP_MS`) | The conversation's own flow (listening → thinking → speaking) is exempt, so a reply never waits. |
| Cooldowns per state | greeting 30 s, celebrate and proud 30 s, attention and reminder 45 s, sleepy 90 s, encouraging 20 s, surprised 10 s, error 8 s, success and confused 5 s, the rest 0 | `components/zigi/actions.json` | Ported from the studio's foundation for the eleven delivered states; host facts (open, close, offline, rest, success) are never held by them (ADR S51). |
| Celebrations a day | 3, then a small success | `components/zigi/semantic.ts` (`CELEBRATIONS_PER_DAY`) | Calm celebrations (owner addition 6). |
| Idle variation | one every 25–60 s under Full, an accent at most every 3 min | `components/zigi/idle.ts` | Rare enough to be noticed, never two attention-grabbing clips in a row (74 s clip `idle-full`). |
| The knock's ripple and rest | the ripple 2.4 s; after a close, 10 min before the next due reminder may knock; the due check every 30 s | `components/zigi/knock.tsx` | One knock per session (the nudge budget), none after a dismissal, none 22:00–08:00, none while typing; a knock counts its nudge the moment it is allowed (ADR S54). The simulated day holds all of it. |
| Hide ZIGi, Undo | 10 s | `components/ai/ai-launcher.tsx` (`HIDE_UNDO_MS`) | The same ten seconds as every Undo in the app. |
| A stalled reply | 60 s without a byte | `lib/ai/sse.ts` (`STALL_MS`) | Long enough for a cold local model's first token (measured up to 24 s on the Mac), short enough to notice a dead wire. |

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

Measured in Session X-Local Part 6 on the fictional Showcase (`docs/verification/x-local/ZIGI_REAL_MODEL_TEST.md` has every
run, the hours and the misses). "Panel" is the real chat in Chrome; "harness" is the 361-turn corpus on the wire. Quality is
the share of asks that did what a careful person would expect (the right tool, a valid card, a refusal where one was due).

| Model | Weights | Needs | Panel cases | Conversations (correct → accept → undo) | Photos | Reply (panel median) | Verdict |
|---|---|---|---:|---:|---|---:|---|
| `qwen3.6:35b-a3b` (MoE, 3 B active) | 23 GB | a 24 GB+ GPU, or a 32 GB+ Mac | 77 % (PC), 75 % (Mac) | 13 of 15 (PC), 8 of 10 (Mac) | reads every item, one whole-plate card, honest about what it cannot see | 0.85 s on the PC, 5.3 s on the Mac | **The daily model on the PC**: fastest large model, the best per-page answers (95 %), reads photos. On the Mac it works but every reply is a five-second wait. |
| `gemma4:12b` | 8 GB | a 12 GB GPU, or a 16 GB Mac | 86 % | 14 of 15 | honest ("I could not see what is inside the black rounds"), one card per plate | 1.6 s on the PC | **The card-maker and the safe pick for smaller machines**: the fewest prose-instead-of-card misses (3 of 150), never invented an item on a plate. Misses are tools it does not call (it answers from the handle list). Not a Qwen: proof the app is model-agnostic. |
| `qwen3.8:27b` (dense) | 17.7 GB | a 24 GB GPU | 75 % | 15 of 15 | the most complete recognition (every item of a full English), but read a bean salad as "shredded meat" once | 2.0 s on the PC | **Think deeper and photos**: the most tool calls and the strongest corrections; slower, and the one hallucination of the photo runs is its. |
| `phi4-mini:3.8b` | 2.5 GB | anything | 69 % | 5 of 15 | no vision | 0.8 s | **The quick pair at most**: fast, but it writes the proposal without the fence or without backticks, cannot correct a draft, and reads no photos. |
| Cloud models (OpenAI, Anthropic, Gemini, xAI, OpenRouter) | — | a key | tested with MOCK only (no key in this run) | — | — | — | The wire is covered by the MOCK suites; nothing here says how a cloud model scores. |

**On the RTX 5090 (32 GB):** quick `qwen3.6:35b-a3b`, deep `qwen3.8:27b`, photos on either (qwen3.8 sees more, gemma4 invents
nothing). **On a 16 GB GPU or a 16 GB Mac:** `gemma4:12b`. **On the Mac M1 Max (64 GB) as it is:** `qwen3.6:35b-a3b` runs the
whole app (75 % of the panel cases, every page) at about five seconds a reply; `gemma4:12b` on the Mac is measured below
once its run completes. Thought stays off for the quick reply on every Ollama model (ADR S35: with it on, a 12 B model spent
200 tokens thinking and 12.7 s to say nothing); "Think deeper" turns it on.

The harness numbers (before the session's fixes): phi4-mini 40 %, gemma4 65 %, qwen3.8 72 %, qwen3.6 57 % on the PC and
61 % on the Mac; the after-run is in the test document's 6d table. Every model was run on the same corpus, the same day
(the Showcase's), the same prompts.

### After Phase 2 ("ZIGi to excellence")

The corpus grew to 626 cases (773 turns) and the fix program ran seven rounds, all model-agnostic (a question router that
pre-runs the records in three languages, one bounded repair round, the day named in the prompt and read from the person's
own words, a scorer that no longer penalises a device answer or a model's way of saying no; ADR-017 S43–S70). Every run
below is on the same corpus, the same Showcase day and one scorer; "band" is three runs of the important 172 cases.

| Model | Corpus, before → after | Band (three runs) | Refusals · privacy · injection | First token (median) | What changed for it |
|---|---:|---:|---|---:|---|
| `gemma4:12b` (PC) | 77 % → **89 %** | 86–91 % | 100 % · 100 % · 8–9 of 9 | 0.5 s | lookups 95 → 117 of 120, briefs 12 → 28 of 29, refusals 53 → 56 of 57; the 90 % line is inside its own band |
| `qwen3.8:27b` (PC) | 75 % → **85 %** | 80–86 % | 80–88 % · 75 % · 67–78 % | 0.5 s (p90 3.0 s) | lookups 106 → 118, follow-ups 37 → 42 of 45; what is left is prose where a card was asked, two check-ins for one, a log beside an answer |
| `qwen3.6:35b-a3b` (PC) | 71 % → **82 %** | 79–82 % | 80–88 % · 88–100 % · 89 % | 0.2 s (p90 1.4 s) | lookups 75 → 116 — the model that reads the pre-run records best; refusals 47 of 57 |
| `qwen3.6:35b-a3b` (Mac) | 70 % → **82–84 %** | the two final runs | 46–53 of 57 refusals | 2.3 s (total 5.4 s) | the Mac's own two runs on near-identical code sit 2.4 points apart; the slow first token is the Mac's bandwidth, not the model |
| `phi4-mini:3.8b` (PC) | 46 % → **61 %** | 56–59 % | about half · half · 7–8 of 9 | 0.3 s | lookups 30 → 99 of 120 thanks to the device's own answers; cards 144 of 232 and multi-step 82 of 183 — **chat only, no cards** |

**The recommendations after Phase 2.** On the PC, `gemma4:12b` is the card-maker and the one that meets the refusal,
privacy and injection bar on every run; `qwen3.6:35b-a3b` stays the quick daily model (the fastest first token, the best
reader of records); `qwen3.8:27b` for "Think deeper" and photos. On the Mac, `qwen3.6:35b-a3b` at 82–84 % of the corpus
with a 2-second first token is a good assistant, not a fast one. `phi4-mini:3.8b` answers questions and chats; it is not
for logging by card. **The panel after Phase 2** (150 cases per PC model through the real chat, a harder set than Phase
1's, scored as Phase 1 was and corrected for the router's own reads): gemma4 78 % / 85 %, qwen3.8 75 % / 81 %, qwen3.6
72 % / 79 %, phi4-mini 56 % / 64 %; like for like on the 77 cases both phases ran, every model moved up (gemma4 83 → 84 %,
qwen3.8 71 → 82 %, qwen3.6 75 → 77 %); on the Mac, 60 cases: 78 % / 88 %. Two more fix rounds read off these stages
(ADR S74, S75: a correction of a card only proposed, a decline without a card, a seeded night in the way of the lie-in)
left the multi-turn conversations clean on the three PC models (15 / 15 each) and the Mac (10 / 10), the day scenario at
53 of 54 steps across the PC's two forms and the Mac, the photos at 4 / 4 on qwen3.8 and 3 / 4 on the others. The
conversations, the pages, the day and the photos are in the test document's Phase 2 section.

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
