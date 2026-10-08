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
_(filled in as the runs complete)_

## 6d. Scores per model, before and after the fixes
_(filled in as the runs complete)_

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
| Voice (speaking to ZIGi, read aloud) | `your-ai.spec.ts` (settings, disclosures), `zigi-chat-polish.spec.ts` (read aloud); a dictation run with a synthesised WAV is owner-reported if Chrome's speech service refuses automated Chrome | Gate A, local; dictation: see 6c |
| A meal photo | `zigi-act.spec.ts` (sent once, never stored, only with Health shared and a model that reads photos); the real-model photo runs below | Gate A, MOCK; real: 6c |
| ZIGoals hosted hidden with `NEXT_PUBLIC_ZIGI_HOSTED` off | `zigi-hosted.spec.ts` | Gate A, local |
| Memory ("What ZIGi knows about me"), safety (careful mode), local answers | `zigi-memory.spec.ts`, `zigi-safety.spec.ts`, `zigi-local-answers.spec.ts` | Gate A, local |

## 6f. Safari engine (WebKit)
_(filled in)_

## Photos (owner addition 11): sources and licences
Kept outside the repository (the session's scratch folder), never committed. One generated image plus three real food
photos that are public domain or CC0, downscaled copies at 1,600 px for the upload. The vision models are scored on
what they recognised against what is in the photo; nutrients they could not know must stay unknown, never invented.

| File | Source | Licence | Credit |
|---|---|---|---|
| generated-breakfast-plate.jpg | drawn by a script for this run (an SVG plate rendered by Chrome): toast, a fried egg, tomatoes, leaves, a coffee; fictional, no real photo, no person | own work for this run | — |
| real-1.jpg (and real-1-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Food-plate-morning-breakfast_(23958591649).jpg | CC0 | food-plate-morni |
| real-2.jpg (and real-2-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Full_English_breakfast_-_London,_UK.jpg | CC0 | Own work |
| real-3.jpg (and real-3-1600.jpg, downscaled) | https://commons.wikimedia.org/wiki/File:Good_Food_In_Dishes_-_NCI_Visuals_Online.jpg | Public domain | This image was released by the <a href="https://en.wikipedia.org/wiki/National_Cancer_Institute" class="extiw" title="en |


## Transcripts (sanitised, fictional data only)
_(appended as the runs complete)_
