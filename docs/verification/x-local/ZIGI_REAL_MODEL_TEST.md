# ZIGi, the real-model test (Session X-Local Part 6)

Fictional records only (the Showcase, plus the golden set's extra habits and goals). No cloud provider was ever called:
OpenAI, Anthropic, Gemini, xAI and OpenRouter are tested with MOCK streams only, and no key exists on this machine for
them. The PC is reached only through its Ollama HTTP API, from the browser through a throwaway forwarder on
`127.0.0.1:11435` kept outside the repository (ADR-017 S8); its address is never printed here.

Evidence labels: **real model** (name, size, quantisation, host Mac or 5090) · **MOCK** · **Chrome** (Chrome 154, the
Playwright `chrome` channel) · **WebKit** (Playwright's WebKit) · **local** (this Mac) · **owner-reported**.

## 6a. Inventory (2026-10-07/08)

| Host | Ollama | Model | Size | Quantisation | Family | Capabilities | Role |
|---|---|---|---:|---|---|---|---|
| RTX 5090 (PC) | 0.35.1 | `qwen3.6:35b-a3b` | 23.9 GB | Q4_K_M | qwen35moe (36 B, MoE) | completion, vision, tools, thinking | best large (fast) |
| RTX 5090 (PC) | 0.35.1 | `qwen3.8:27b` | 17.7 GB | Q4_K_M | qwen35 (27.3 B, dense) | completion, vision, tools, thinking | large dense; the photo model |
| RTX 5090 (PC) | 0.35.1 | `gemma4:12b` (pulled 2026-10-07 21:47–21:52 UTC) | 8.0 GB | Q4_K_M | gemma4 (11.9 B) | completion, vision, audio, tools, thinking | mid; a second family (owner addition 1) |
| RTX 5090 (PC) | 0.35.1 | `phi4-mini:3.8b` (pulled 2026-10-07 21:52–21:54 UTC) | 2.5 GB | Q4_K_M | phi3 (3.8 B) | completion, tools | quick; a third family |
| Mac M1 Max 64 GB | 0.32.3 | `qwen3.6:35b-a3b` | 23.9 GB | Q4_K_M | qwen35moe (36 B, MoE) | completion, vision, tools, thinking | best on the Mac |
| Mac M1 Max 64 GB | 0.32.3 | `qwen3.6-64k:latest` | 23.9 GB | Q4_K_M | qwen35moe | completion, vision, tools, thinking | same weights, a longer context; not run separately |
| Mac | LM Studio | — | — | — | — | — | **not running** on :1234 during the session (reported, not tested) |

Downloads: two pulls on the PC, 10.5 GB in total (limits: ≤2, ≤40 GB). The Mac kept ≥3 TB free.

## 6b. Corpus

- The golden set: 272 deterministic cases (the first 91 unchanged), 100 % in CI (`lib/ai/evals/golden-set.ts`).
- The model-scored corpus: 338 cases, 361 turns, 100 marked important (`lib/ai/evals/corpus.ts`); 610 cases in all.
- The scorer (`lib/ai/evals/score.ts`): tool choice and arguments, proposal schema validity, facts against the app's own
  data, refusal correctness, privacy (sentinels), the emotion hint, latency and tokens.

## 6c. Volumes and hours

The owner's volumes (addition 2) and what was run, one suite at a time, hours from the shell's clock (`hours.log`,
rendered by the session's `hours-table.py`). "Before" runs use the code as it was when they started; the matrix is
re-run after every app-side fix for the before/after table in 6d.

| Volume asked for | Plan | Done |
|---|---|---:|
| The full corpus (≥600 cases: 272 golden + 338 model-scored, 361 turns) through the Node harness on every model | 5 models × 361 turns, before and after the fixes | _(running)_ |
| The 100 most important cases, 3× per model, for variance | 5 models × 300 runs | _(pending)_ |
| UI-driven cases through the real panel in Chrome: ≥150 per RTX 5090 model, ≥60 on the Mac model | `tests/zigi-real-model.spec.ts`, desktop | _(pending)_ |
| ≥50 multi-turn conversations (plan → correct → accept → undo) | `tests/zigi-conversations.spec.ts`: 15 × 4 PC models + 10 on the Mac = 70 | _(pending)_ |
| ≥10 human-style conversations per page, every page, desktop and phone | `tests/zigi-pages-conversations.spec.ts`: 17 areas × 10 asks, desktop + phone on `qwen3.6:35b-a3b` (PC), desktop on `gemma4:12b` | _(pending)_ |
| Three "day in the life" scenarios end to end, ZIGi's state checked at each step | `tests/zigi-day-in-the-life.spec.ts` on `qwen3.6:35b-a3b` (PC, desktop + phone) and the Mac | _(pending)_ |
| Meal photos through the real panel (owner addition 11): the four photos below on every model that reads images | `tests/zigi-photo.spec.ts` on `qwen3.8:27b`, `gemma4:12b`, `qwen3.6:35b-a3b` (PC) and `qwen3.6:35b-a3b` (Mac); `phi4-mini` reads no images; the weekday scenario's breakfast goes by photo too | _(pending)_ |
| A full re-run of the matrix after the fixes | the harness, all five models | _(pending)_ |

### Hours
_(the table is pasted here at Gate B and again at Part 10)_

## 6d. Scores per model, before and after the fixes

Findings so far (the tables below are rendered from the JSON files by the session's summariser and pasted as the runs complete):

- **`phi4-mini:3.8b` (RTX 5090, before the fixes): 361 runs, 146 passed (40.4 %), first token median 65 ms, total median 249 ms.** It made **no tool call in any of the 361 runs**. Checked on the wire, not assumed: a direct `/api/chat` request to the PC with one tool definition and "Use the tool" returned prose and `tool_calls: null`, while the same request to `gemma4:12b` returned `tool_calls: [{name: "water", arguments: {range: "today"}}]`. So the 113 missed tool checks are the model's (its Ollama template does not produce tool calls in this form), not the app's; its lookups answer from the prompt's own examples instead, which the fact checks catch. Its proposal blocks fail the schema in 74 runs for shapes the parser now repairs (`"type"` for `"kind"`, bare measurement words, a loose category) and for tool names sent as kinds (`habits_due`, `water`, `list_goals`), which stay refused.
- **`gemma4:12b` (RTX 5090, before the fixes): 361 runs, 233 passed (64.5 %), first token median 1,427 ms, total median 2,440 ms; tool calls in 150 runs; refusals 25/25, privacy 6/6, injections 11/11.** Misses: the expected tool not called (74: it answers from the handle list instead of `habit_stats`, `list_habits`, `goal_progress`…), no card where one was asked for (54), five blocks cut off. The cut-offs are the model's hidden thought spending the output cap (a 329-character reply cost 1,251 output tokens). **App-side fix (ADR S35):** Ollama's wire now gets `think: false` unless "Think deeper" asks for thought; measured on the PC, gemma4 answers in 22 tokens and 0.8 s with it off against 200 tokens of hidden thought and 12.7 s with it on.
- **`qwen3.8:27b` (RTX 5090, before the fixes, thought on): 361 runs, 260 passed (72.0 %), first token median 1,735 ms, total median 3,162 ms; tool calls in 146 runs; one wire error (the PC's Ollama answered 500 once).** Misses: the expected tool not called (68), cards (31: a check-in, a reminder or a widget answered in prose, or `edit-habit` where `create-habit` was asked), schema (6: `estimate.serving_ml`, a nap without a wake time, ISO weekdays, a schedule phrase: all repaired since, ADR S36 and the parser's Part 6d tests).
- **`qwen3.6:35b-a3b` (RTX 5090, the first run with thought off): 361 runs, 205 passed (56.8 %), first token median 158 ms, total median 661 ms; tool calls in only 27 runs.** The MoE model answers lookups from the handle list instead of calling the tool (98 tool misses), and refuses handles it was given titles for (repaired since).
- **Thought on or off, measured (the important hundred, 110 turns, `qwen3.6:35b-a3b` on the PC, the same code):** off: 74 passed (67.3 %), first token 160 ms, total 702 ms, output tokens median 64, proposals 21/28, multi-turn 9/15; on: 51 passed (46.4 %), first token 1,252 ms, total 4,694 ms, output tokens median 907, proposals 11/28, multi-turn 0/15 (the cards never arrive: the hidden thought spends the cap). Thought brings more tool calls (25 runs against 7) but not more correct lookups (8/25 against 7/25). The quick reply stays the default (S35); "Think deeper" is the person's choice. This leg ran while the Mac model's full-corpus run was in progress on the other host; its latencies are the PC's own.
- **Attach mode (the records in the prompt instead of tools), the same hundred on `qwen3.6:35b-a3b`:** 65 passed (59.1 %), first token 146 ms, total 537 ms. Lookups no better (7/25), refusals worse (11/18 against 18/18), privacy and injection worse (5/6 and 3/7 against 6/6 and 6/7): with the records in the prompt the model follows what the records say. Tools mode stays the app's "auto" choice for a model that declares tools. (In this leg the harness still scored the expected-tool checks, which attach mode cannot meet by construction; fixed in the harness afterwards, so the 59.1 % is a floor.)
- **`qwen3.6:35b-a3b` on the Mac M1 Max (Ollama 0.32.3, Metal; the run started after the title, serving and nap repairs): 361 runs, 219 passed (60.7 %), first token median 1,323 ms, total median 4,496 ms, 36 minutes for the corpus; tool calls in 38 runs; no wire error.** The same weights score the same on either machine within the corpus's noise (PC 56.8 % with fewer repairs in place); the Mac is bandwidth-bound: about seven times the PC's time to the first token and total. Misses as on the PC: the tool not called (92), prose where a card was asked (53).

#### UI-driven cases, conversations, pages, days and photos (the real panel in Chrome 154 on the dev server, `TZ=UTC`, the Showcase's own day)

The panel's cases are the single-turn corpus in the harness's order (the important hundred first), typed into the real composer with the real
page open, scored by the UI scorer (cards, schema, tools, wording, refusals; facts and hints are the harness's). "Reply median" is the
time from the Send click to the final reply in the panel, including the app's own context work, so it is not the harness's first-token or
total time. Every test of every run was green except phi4-mini's two (explained below); a scored miss is a finding, never a red test.

##### UI-driven cases (`tests/zigi-real-model.spec.ts`, desktop, the real panel in Chrome)

| Model (host) | Runs | Passed | Pass % | Reply median ms | Tool calls | Errors | Most common misses |
|---|---:|---:|---:|---:|---:|---:|---|
| gemma4:12b (RTX 5090) | 150 | 129 | 86.0 | 1551 | 42 | 0 | tool:list_habits 5, schema 5, cards 3, tool:goal_progress 2, tool:habit_stats 2 |
| phi4-mini:3.8b (RTX 5090) | 149 | 104 | 69.8 | 1156 | 39 | 1 | cards 22, schema 15, refusal 7, tool:list_habits 5, tool:goal_progress 2 |
| qwen3.6:35b-a3b (RTX 5090) | 150 | 115 | 76.7 | 849 | 39 | 0 | cards 13, schema 7, tool:list_habits 5, no-numbers 3, tool:goal_progress 2 |
| qwen3.8:27b (RTX 5090) | 150 | 112 | 74.7 | 1982 | 71 | 0 | cards 20, tool:list_habits 5, refusal 4, schema 4, no-numbers 3 |
| qwen3.6:35b-a3b (Mac M1 Max) | 60 | 45 | 75.0 | 5257 | 16 | 0 | cards 6, schema 3, tool:list_habits 2, refusal 2, tool:goal_progress 1 |

- **`phi4-mini:3.8b` on the RTX 5090, 150 cases through the panel (31 minutes): 149 recorded, 104 of 149 scored passes (69.8 %), reply median 1,156 ms, a tool called in 39 replies.** Misses: cards 22, schema 15, refusal 7, tool:list_habits 5, tool:goal_progress 2, tool:habit_stats 2. Two red tests: `x3-settings-sync` waited 15 minutes for a launcher that Settings does not have (the app's own rule; the settings-area asks now go through the panel on Help, and every helper action fails in 20 s), and `sleep-nap`, where the model wrote `zigoals-action` and the JSON without any backticks, so the panel showed them raw (2 of 361 harness replies do the same; no fence, no block, recorded as the model's). The UI rate is above the harness's 40.4 % because the panel's cases are the single-turn corpus without the sentinel and local-first cases, and the UI scorer does not score facts or hints.



## 6e. Surfaces

Each surface, the proof that it works on this branch, and its label. "Gate A" means the production build on :3102
(Chrome 154, both Playwright projects, `TZ=UTC`): 307 passed across the 20 ZIGi specs and the touched areas, one
pre-existing intermittent (`sleep.spec.ts:40`, explained in ADR-017). "Part 5" means the dev server with the Part 5
code. Real-model rows are filled in from the UI runs (6c).

| Surface | Proof | Label |
|---|---|---|
| The launcher (every page, both sides, three sizes, the edge tab) | `zigi-alive.spec.ts`, `zigi-a11y-pass.spec.ts`; the real art, posters first, the idle rotation under Full | Gate A, local |
| The panel and the chat polish (streaming, Stop, regenerate, copy, read aloud, the answer label) | `zigi-chat-polish.spec.ts`, `zigi-act.spec.ts`; Part 5c's robustness spec (almost-JSON, the retry, the stall, Stop) | Gate A + Part 5, MOCK |
| Cards: Add, Edit, Dismiss, Add all, Undo; every writing kind; the four goal types; corrections; auto-accept | `zigi-accept-correct.spec.ts` 138/138 (three time zones), `zigi-auto-accept.spec.ts` 8/8, `zigi-act.spec.ts` | Part 5, MOCK |
| Quick and deep models, the usage meter, "Ask first", the setup chooser | `your-ai.spec.ts`, `zigi-help-settings.spec.ts`, `zigi-tools.spec.ts` | Gate A, MOCK |
| Question-aware context and "What your AI sees", the context pack and its warning | `zigi-question-context.spec.ts`, `zigi-context-pack.spec.ts` | Gate A, local |
| Meet ZIGi (every state with the real art and its plain-words meaning) and Customize (Full / Calm / Off) | `zigi-emotions.spec.ts`, `zigi-alive.spec.ts` (motion test); gallery screenshots on `review/session-x-local-screens` | Gate A, local |
| The knock, the one-time offer, push while the panel is open, the opt-in names | `zigi-knock.spec.ts`, `zigi-proactive.spec.ts`, `push-reminders.spec.ts` | Gate A, local |
| The mini window (document picture-in-picture) | `zigi-mini-window.spec.ts` | Gate A, local (Chrome only) |
| Browser AI agents (WebMCP) | `zigi-browser-agents.spec.ts`: no Health tool offered with the gate closed, results free of Health | Gate A, local (Chrome's flag; what Chrome 154 offers is reported in the spec's own notes) |
| Chrome's on-device model (Prompt API) availability | `zigi-on-device.spec.ts`: availability read, never a download without the owner (S10) | Gate A, local |
| Voice (speaking to ZIGi, read aloud) | `your-ai.spec.ts` (settings, disclosures), `zigi-chat-polish.spec.ts` (read aloud). Dictation tried by hand with a synthesised WAV as the microphone (`say` → `afconvert`, Chrome's fake audio capture; `tests/zigi-voice-dictation.spec.ts`, ZIGI_VOICE=1): SpeechRecognition is present, the control goes to "Stop listening" and the disclosure says the audio goes to Google's speech service, but no words arrived in 15 s: Chrome's speech service does not transcribe in an automated browser. **Owner row:** dictate "Log a glass of water" in a normal Chrome window and in Safari on the phone. | Gate A, local; dictation: owner-reported |
| A meal photo | `zigi-act.spec.ts` (sent once, never stored, only with Health shared and a model that reads photos); the real-model photo runs below | Gate A, MOCK; real: 6c |
| ZIGoals hosted hidden with `NEXT_PUBLIC_ZIGI_HOSTED` off | `zigi-hosted.spec.ts` | Gate A, local |
| Memory ("What ZIGi knows about me"), safety (careful mode), local answers | `zigi-memory.spec.ts`, `zigi-safety.spec.ts`, `zigi-local-answers.spec.ts` | Gate A, local |

## 6f. Safari engine (WebKit)

Playwright's WebKit 26.6 (`playwright install webkit`, the one owner-approved download, 78 MB), run by hand through
`apps/web/playwright.webkit.config.ts` (projects `webkit-desktop`, `webkit-iphone15`; CI's workflow untouched).
Label: **WebKit**, never "Safari on an iPhone" (the iPhone checklist in ZIGI_ALIVE_X.md covers the device).

| Run | Result | Build |
|---|---|---|
| `tests/webkit-smoke.spec.ts` (every app page with the Showcase and no page error, the launcher's poster decoded on each, no launcher on Settings by the app's rule; Sleep, Meditation and Today's surfaces; reduced motion keeps the still) | 6 passed, both projects | dev server (`next dev`, `LOCAL_DEMO`) |
| The ZIGi specs in WebKit (`zigi-*.spec.ts` minus the Chrome-only mini window, on-device model and browser agents, and the real-model runs), both projects | 289 passed, 40 skipped (their own gates), 7 failed, of which 5 were the run's own setup and are fixed: WebKit follows the system clock unless the config pins `timezoneId: 'UTC'` (`zigi-local-answers:28`), the specs branch on the project names `desktop`/`mobile` (`zigi-question-context:35`), and the release-id pin in `zigi-help-settings:58` was Session W's (now `2026-10-session-x`, an assertion change listed in ADR-017). The remaining 2: `zigi-chat-polish:119` on both projects, because Playwright's WebKit has no `clipboard-write` permission to grant for the copy read-back; the Copy button and the note render. Re-run of the four touched specs: 32 passed, those 2. | dev server |
| The same on the production build | _(Gate B)_ | |


## Photos (owner addition 11): sources and licences
Kept outside the repository (the session's scratch folder), never committed. One generated image plus three real food
photos that are public domain or CC0, downscaled copies at 1,600 px for the upload (the app downscales again to 1,024 px
in the browser before sending). `tests/zigi-photo.spec.ts` sends each through the real panel on `/app/health` with
Health shared and the person's word that the model reads photos, asks "What is on this plate? Log it as <meal>.", and
scores: items recognised (a list per photo, read by eye before the run: toast, a fried egg, cherry tomatoes, leaves and
a coffee on the drawn plate; two pancakes and syrup; the full English with eggs, bacon, a sausage, black pudding, a hash
brown, beans, a tomato and toast; bread, broccoli, a pear, corn, a bean salad, carrots, strawberries, rice and cereal on
the spread), items invented (a card for something plainly not there), nutrients only on items that are on the plate,
the estimate badge on the card, and the model's own hedge ("my estimate", "I could not see…"). Results in 6d.

| File | Source | Licence | Credit |
|---|---|---|---|
| generated-breakfast-plate.jpg | drawn by a script for this run (an SVG plate rendered by Chrome): toast, a fried egg, tomatoes, leaves, a coffee; fictional, no real photo, no person | own work for this run | — |
| real-1.jpg (and real-1-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Food-plate-morning-breakfast_(23958591649).jpg | CC0 | food-plate-morni |
| real-2.jpg (and real-2-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Full_English_breakfast_-_London,_UK.jpg | CC0 | Own work |
| real-3.jpg (and real-3-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Good_Food_In_Dishes_-_NCI_Visuals_Online.jpg | Public domain | This image was released by the <a href="https://en.wikipedia.org/wiki/National_Cancer_Institute" class="extiw" title="en |


## Transcripts (sanitised, fictional data only)
_(appended as the runs complete)_
