# ZIGi on real Claude models — Session Z-Local, Part 2

The first round of ZIGi's brain on Anthropic's own models (Claude Haiku 5.5, Claude Sonnet 5.5, Claude Opus 5.5), on the
owner's test key, with the API's own usage fields as the only source of cost. Every run is the same harness and the same
scorer as the local-model rounds (`lib/ai/evals/real-model.test.ts`, `score.ts`; X-Local's numbers for gemma4, qwen3.8,
qwen3.6 and phi4-mini stand beside these for comparison). Fictional Showcase records only. Raw run files live on the
orphan branch `review/session-z-local-runs`; the summary files on this branch under `real-model/summaries/` are what the
tables below are rendered from (`scripts/zigi/render-claude-doc.mjs`), never typed. The ledger (`ledger.md` on the runs
branch) is the spend against the $130 cap; prices as in `lib/ai/pricing.ts` (as of 2026-10-10).

## How a run is made
- **The pipeline:** the page's specialist system prompt, the question-aware context (the records the question names),
  the read-only tool loop (tools mode) or the records attached (attach mode), the whitelist parser, the app's one bounded
  repair round, the day and quantity cues; the same code the app runs.
- **Prompt caching (Part 3, ADR-020 L3):** the stable prefix of the system prompt and the page's records carry cache
  markers; the quick reply runs at `effort: low`, "Think deeper" at `high`; thinking is never disabled. The before/after
  measurement below is the proof.
- **Counting:** input, cache-write and cache-read tokens and output tokens (thinking tokens are output) per request,
  summed per turn with the tool rounds and the repair round; cost from the dated price table; latency as time to first
  token and total time per turn.
- **The corpus during this round:** the typed corpus was 626 cases (773 turns) when the Sonnet corpus run started; Part 5
  added 60 cases during the round, so later stages ran on the grown corpus (the row says the count it saw). The important
  set grew from 172 to 198 the same way.

## The before/after caching measurement (Part 3, ADR-020 L11)
Every multi-turn case of the corpus, first half (17 cases, 37 turns), in corpus order, cache markers off then on, on
Sonnet and Opus; the second half (16 cases, 143 turns) follows the corpus stages, the ledger permitting.
`scripts/zigi/cache-compare.mjs` renders these rows from the two run files of each pair.

| Model | Turns | Cache markers | Pass | Requests | Input + cache write + cache read tokens | Input cost | Total cost | Input cost lower by |
|---|---:|---|---:|---:|---|---:|---:|---:|
| `claude-sonnet-5-5` | 37 | off | 32/37 | 51 | 671,423 + 0 + 0 | $1.3428 | $1.4745 | — |
| `claude-sonnet-5-5` | 37 | on | 31/37 | 51 | 188 + 75,732 + 595,475 | $0.2493 | $0.3820 | **81.4 %** |
| `claude-opus-5-5` | 37 | off | 30/37 | 47 | 616,187 + 0 + 0 | $2.4647 | $2.6856 | — |
| `claude-opus-5-5` | 37 | on | 33/37 | 43 | 166 + 91,264 + 469,934 | $0.5510 | $0.7670 | **77.6 %** |

The bar was 40 % lower input cost with identical scores: the input cost fell by 81 % on Sonnet and 78 % on Opus, and the
scores moved by one to three turns of 37 in either direction, inside the run-to-run spread the variance stages show.
After the first request on a page, every later request read about 12,000 to 17,000 tokens of stable prefix from the
cache and wrote only the question's own records; the uncached remainder was 4 to 12 tokens per request.

## The runs
<!-- tables:start -->
_Rendered by `scripts/zigi/render-claude-doc.mjs` from 7 summary file(s) on 2026-10-10; the figures are the API's own usage fields at the dated price table._

| Stage | Model | Mode | Cases · turns | Pass (then) | Pass re-scored now (turns still in the corpus) | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |
|---|---|---|---:|---:|---:|---|---|---:|---:|---:|
| Part 2 · the 20-case probe | `claude-sonnet-5-5` | tools | 20 · 22 | **19/22 · 86.4 %** | 19/22 | lookup 7/7 · propose 6/6 · brief 2/2 · unknown 1/1 · refuse 3/3 · multi 0/3 | 5 + 3,289 + 12,944 → 333 | $0.0129 | $0.23 | 810 / 2,900 |
| Part 3 · cache markers off | `claude-sonnet-5-5` | tools, no cache | 17 · 37 | **32/37 · 86.5 %** | 29/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 27/30 | 18,147 + 0 + 0 → 356 | $0.0399 | $1.47 | 1,485 / 3,250 |
| Part 3 · cache markers on | `claude-sonnet-5-5` | tools | 17 · 37 | **31/37 · 83.8 %** | 28/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 27/30 | 5 + 2,047 + 16,094 → 359 | $0.0103 | $0.38 | 1,411 / 3,346 |
| Part 3 · cache markers off | `claude-opus-5-5` | tools, no cache | 17 · 37 | **30/37 · 81.1 %** | 27/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 26/30 | 16,654 + 0 + 0 → 298 | $0.0726 | $2.69 | 2,086 / 4,078 |
| Part 3 · cache markers on | `claude-opus-5-5` | tools | 17 · 37 | **33/37 · 89.2 %** | 30/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 28/30 | 4 + 2,467 + 12,701 → 292 | $0.0207 | $0.77 | 1,673 / 3,161 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools | 626 · 773 | **693/773 · 89.7 %** | 597/667 | lookup 117/120 · propose 210/232 · chat 40/46 · brief 27/29 · unknown 12/15 · refuse 53/57 · advice 9/13 · multi 153/183 · followup 41/45 · privacy 12/13 · injection 19/20 | 5 + 1,543 + 14,674 → 288 | $0.0082 | $5.94 | 812 / 2,650 |
| Part 2 · important ×2 | `claude-sonnet-5-5` | tools | 198 · 608 | **526/608 · 86.5 %** | 501/568 | lookup 50/52 · propose 147/162 · brief 17/18 · unknown 2/2 · refuse 40/46 · multi 215/264 · advice 2/8 · privacy 16/16 · chat 16/18 · injection 17/18 · local-first 4/4 | 5 + 1,951 + 17,965 → 338 | $0.0101 | $5.70 | 930 / 3,045 |

### Cost per 100 messages
| Model | Stage | Cost per 100 messages (one request each, cached prefix, quick reply) |
|---|---|---:|
| `claude-sonnet-5-5` | Part 2 · the 20-case probe | $1.29 |
| `claude-sonnet-5-5` | Part 3 · cache markers on | $1.03 |
| `claude-opus-5-5` | Part 3 · cache markers on | $2.07 |
| `claude-sonnet-5-5` | Part 2 · corpus ×1 | $0.82 |
| `claude-sonnet-5-5` | Part 2 · important ×2 | $1.01 |
<!-- tables:end -->

## Stages still to run in this round
UI panel (150 Sonnet, 150 Haiku, 60 Opus), the 15 conversations ×3, the day on desktop and phone (Sonnet), the pages
(17 × 10, Sonnet desktop and phone, Haiku desktop), the four photo plates ×3, the WebKit subset (60 Sonnet + 5
conversations), and the second half of the caching measurement. Each lands here as a rendered row when its summary is in.

## Recommendation per job
Filled when the round is complete (friends through the relay, budget, deep).

## Owner checklist rows (Part 9): Claude on the phone and on the Mac
What a real phone and a real Mac prove that the harness and Chrome cannot: the keyboard, dictation by the system, the
installed app, Safari's own WebKit. Connect ZIGi to your own Anthropic key first (Settings → ZIGi · your AI → Anthropic,
Claude Sonnet 5.5; "Remember on this device" is your choice), load the Showcase, and tick:

| # | Where | Check | Pass looks like |
|---|---|---|---|
| 1 | iPhone, Safari and the home-screen app | Open Today, tap ZIGi, ask "two glasses of water" | one card in under four seconds; **Add**; the water figure on Today moves; Undo in the toast works |
| 2 | iPhone | Hold the microphone (browser speech recognition on) and say "um, log two and a half litres of water, no wait, three" | the words appear as you said them; the card says 3 litres (3,000 mL); nothing is sent before you release |
| 3 | iPhone | Say in Dutch: "ik heb vanmorgen vijfentwintig minuten gemediteerd" | a meditation card with 25 minutes for today; the reply in Dutch |
| 4 | iPhone | Ask "how many steps did I walk this week?" | an answer from your records with the week's figure; no card; the usage meter (Settings → ZIGi · your AI) shows the turn's cache read |
| 5 | iPhone | Ask "delete my Walk habit" | one card that opens the habit's own delete confirmation on Habits; nothing deleted until you confirm there; **Cancel** leaves it |
| 6 | iPhone | Ask "put 200 euros towards the Japan adventure goal" | the goal's Fund form opens filled in with 200; nothing recorded until you save; close it and nothing changed |
| 7 | iPhone | Switch Health sharing off (Settings → Pages shared with ZIGi), ask "log my weight, 72 kilos" | a refusal in words that names the Health gate; no card; switch it back on and ask again: a weight card that always waits for your tap |
| 8 | Mac, Safari | Ask ZIGi twice after an Undo (ask for water, Add, Undo, then ask two more things) | ZIGi keeps answering both; no frozen page, no stuck "thinking" (the WebKit case of Part 1) |
| 9 | Mac, Safari | Open the panel, press Stop while a long answer streams, then ask again | the first answer stays as far as it got, no marker text shown; the next answer arrives normally |
| 10 | Mac or iPhone | Settings → ZIGi · your AI → the usage meter after ten asks | input, output, cache writes and cache reads all counted; the estimate from your own prices, never a built-in price |
