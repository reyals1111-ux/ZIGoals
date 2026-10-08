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

### LM Studio (Phase 2, P2.7)

Not installed on this Mac: no `lms` CLI on the path, no `LM Studio.app` in Applications, no `~/.lmstudio` folder (checked
2026-10-08). Nothing was installed (the run's rules); the LM Studio wire (OpenAI-compatible) stays covered by the MOCK
suites only, and the inventory line above stands.

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
| The full corpus (272 golden + 338 model-scored, 361 turns) through the Node harness on every model | 5 models × 361 turns, before and after the fixes | 3,610 runs (two passes) |
| The 100 most important cases, 3× per model, for variance | 5 models × 330 runs (110 turns × 3) | 1,650 runs |
| UI-driven cases through the real panel in Chrome: ≥150 per RTX 5090 model, ≥60 on the Mac model | `tests/zigi-real-model.spec.ts`, desktop | 150 × 4 PC models + 60 on the Mac = 660 |
| ≥50 multi-turn conversations (plan → correct → accept → undo) | `tests/zigi-conversations.spec.ts`: 15 × 4 PC models + 10 on the Mac = 70 | 70 before and 70 after the protocol change (140) |
| ≥10 human-style conversations per page, every page, desktop and phone | `tests/zigi-pages-conversations.spec.ts`: 17 areas × 10 asks, desktop + phone on `qwen3.6:35b-a3b` (PC), desktop on `gemma4:12b` | 3 runs × 170 = 510 asks |
| Three "day in the life" scenarios end to end, ZIGi's state checked at each step | `tests/zigi-day-in-the-life.spec.ts` on `qwen3.6:35b-a3b` (PC, desktop + phone) and the Mac | 3 runs × 18 steps = 54 |
| Meal photos through the real panel (owner addition 11): the four photos below on every model that reads images | `tests/zigi-photo.spec.ts` on `qwen3.8:27b`, `gemma4:12b`, `qwen3.6:35b-a3b` (PC) and `qwen3.6:35b-a3b` (Mac); `phi4-mini` reads no images; the weekday scenario's breakfast goes by photo too | _(pending)_ |
| A full re-run of the matrix after the fixes | the harness, all five models | done (the 6d table) |

### Hours
Every stage's wall clock from `hours.log` (START/END pairs written by the shell that ran it; a chain's own inner lines sit inside this session's outer label for the same span and count once). Aborted stages are listed with their reason and not counted.

| Stage | Started (UTC) | Ended (UTC) | Minutes | Exit |
|---|---|---|---:|---:|
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 00:40 | 00:43 | 2 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 00:43 | 00:59 | 16 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 00:59 | 01:18 | 19 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 01:18 | 01:23 | 5 | 0 |
| `ab-think0` | ?  | 01:27 | ? | 0 |
| `ab-think1` | ?  | 01:34 | ? | 0 |
| `ab-attach` | ?  | 01:36 | ? | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-all-x1` | 2026-10-08 01:23 | 01:59 | 36 | 0 |
| `phi4-mini cases: first case hung 12 min with zero model requests; chain stopped for diagnosis` | ?  | 02:12 | — | aborted  |
| `phi4-mini cases` | ?  | 02:33 | — | aborted (59/150): restarted so every model runs on the Showcase's pi |
| `phi4-mini_3.8b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 02:34 | 03:05 | 31 | 1 |
| `gemma4 cases` | ?  | 03:08 | — | aborted (restart from gemma4: settings-area asks now via Help, helpe |
| `gemma4 cases` | ?  | 03:11 | — | aborted (restart: the reply wait now ends on the new turn, not a 15  |
| `gemma4_12b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 03:11 | 03:20 | 8 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 03:20 | 03:30 | 10 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 03:30 | 03:38 | 7 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-real-model-desktop` | 2026-10-08 03:38 | 03:47 | 8 | 0 |
| `phi4-mini_3.8b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 03:47 | 03:48 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 03:48 | 03:50 | 1 | 1 |
| `qwen3.8_27b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 03:50 | 03:52 | 1 | 1 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 03:52 | 03:53 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-conversations-desktop` | 2026-10-08 03:53 | 03:56 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-pages-conversations-desktop` | 2026-10-08 03:57 | 04:00 | 3 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-pages-conversations-mobile` | 2026-10-08 04:00 | 04:03 | 3 | 0 |
| `gemma4_12b-RTX-5090-zigi-pages-conversations-desktop` | 2026-10-08 04:03 | 04:09 | 5 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-desktop` | 2026-10-08 04:09 | 04:11 | 1 | 1 |
| `day stage` | ?  | 04:18 | — | aborted (first attempt: the helper looked for a Log button that only |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-desktop` | 2026-10-08 04:18 | 04:20 | 1 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-mobile` | 2026-10-08 04:20 | 04:21 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-day-in-the-life-desktop` | 2026-10-08 04:21 | 04:25 | 4 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:25 | 04:26 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:26 | 04:28 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:28 | 04:29 | 0 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-photo-desktop` | 2026-10-08 04:29 | 04:30 | 1 | 0 |
| `phi4-mini_3.8b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 04:30 | 04:37 | 6 | 1 |
| `phi4-mini_3.8b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 04:37 | 04:38 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 04:38 | 04:40 | 1 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 04:40 | 04:41 | 1 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 04:41 | 04:43 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-conversations-desktop` | 2026-10-08 04:43 | 04:45 | 2 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:46 | 04:47 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:47 | 04:49 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-photo-desktop` | 2026-10-08 04:49 | 04:50 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-photo-desktop` | 2026-10-08 04:50 | 04:52 | 1 | 0 |
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 04:52 | 04:54 | 2 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 04:54 | 05:02 | 7 | 0 |
| `mac-pull gemma4:12b` | 2026-10-08 04:48 | 05:07 | 18 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 05:02 | 05:15 | 13 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 05:15 | 05:20 | 4 | 0 |
| `gemma4_12b-Mac-M1-Max-important-x1` | 2026-10-08 05:07 | 05:20 | — | aborted (overlapped the matrix's Mac stage; re-run after the follow- |
| `qwen3.6_35b-a3b-Mac-M1-Max-all-x1` | 2026-10-08 05:20 | 05:59 | 38 | 0 |
| `phi4-mini_3.8b-RTX-5090-important-x3` | 2026-10-08 05:59 | 06:00 | 1 | 0 |
| `gemma4_12b-RTX-5090-important-x3` | 2026-10-08 06:00 | 06:06 | 6 | 0 |
| `qwen3.8_27b-RTX-5090-important-x3` | 2026-10-08 06:06 | 06:16 | 9 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-important-x3` | 2026-10-08 06:16 | 06:19 | 3 | 0 |
| `gemma4_12b-Mac-M1-Max-important-x1` | 2026-10-08 05:59 | 06:20 | — | aborted (second attempt; it outlived the PC's variance stage and ove |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 06:19 | 06:43 | 23 | 0 |
| `gemma4_12b-Mac-M1-Max-zigi-real-model-desktop` | 2026-10-08 06:43 | 07:20 | 36 | 1 |
| `qwen3.8_27b-RTX-5090-zigi-photo-desktop` | 2026-10-08 07:20 | 07:20 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-photo-desktop` | 2026-10-08 07:20 | 07:22 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-photo-desktop` | 2026-10-08 07:22 | 07:23 | 0 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-photo-desktop` | 2026-10-08 07:23 | 07:24 | 1 | 0 |
| `p2base-phi4-mini_3.8b-RTX-5090-all` | 2026-10-08 07:25 | 07:31 | 6 | 0 |
| `p2base-gemma4_12b-RTX-5090-all` | 2026-10-08 07:31 | 07:53 | 22 | 0 |
| `clips` | 2026-10-08 08:09 | 08:15 | 5 | 0 |
| `p2base-qwen3.8_27b-RTX-5090-all` | 2026-10-08 07:53 | 08:27 | 33 | 0 |
| `p2base-qwen3.6_35b-a3b-RTX-5090-all` | 2026-10-08 08:27 | 08:39 | 12 | 0 |
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 08:42 | 08:51 | 8 | 0 |
| `clips-closeup` | ?  | 08:58 | ? | ? |
| `p2base-qwen3.6_35b-a3b-Mac-M1-Max-all` | 2026-10-08 07:25 | 09:04 | 99 | 0 |
| `gate-b build` | 2026-10-08 09:05 | 09:05 | 0 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 08:51 | 09:16 | 24 | 0 |
| `gate-b zigi` | 2026-10-08 09:07 | 09:17 | 9 | 1 |
| `gate-b webkit` | 2026-10-08 09:17 | 09:27 | 10 | 1 |
| `gate-b build` | 2026-10-08 09:31 | 09:31 | 0 | 0 |
| `gate-b chrome re-run` | 2026-10-08 09:32 | 09:36 | 3 | 1 |
| `gate-b webkit` | 2026-10-08 09:36 | 09:47 | 10 | 1 |
| `gate-b build` | 2026-10-08 09:47 | 09:47 | 0 | 0 |
| `gate-b safety re-run` | 2026-10-08 09:47 | 09:48 | 0 | 0 |
| `gate-b build` | 2026-10-08 09:49 | 09:49 | 0 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 09:16 | 09:50 | 34 | 0 |
| `gate-b robustness re-run` | 2026-10-08 09:50 | 09:50 | 0 | 0 |
| `gate-b webkit smoke re-run` | 2026-10-08 09:54 | 09:54 | 0 | 1 |
| `gate-b webkit smoke re-run` | 2026-10-08 09:56 | 09:57 | 0 | 1 |
| `gate-b webkit smoke re-run` | 2026-10-08 09:59 | 09:59 | 0 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 09:50 | 10:03 | 12 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 10:03 | 10:03 | 0 | 143 |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 10:03 | 10:03 | — | aborted (a stray stage: the matrix script was edited while its 'pc'  |
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 10:04 | 10:12 | 8 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 10:12 | 10:35 | 23 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 10:35 | 11:11 | 35 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 11:11 | 11:26 | 14 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-all-x1` | 2026-10-08 09:47 | 11:30 | 103 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 11:30 | 11:30 | 0 | 143 |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 11:30 | 11:30 | — | aborted (the same stray stage as at 10:03: the Mac 'mac' run's shell |
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 11:26 | 11:34 | 8 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 11:34 | 12:00 | 25 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 12:00 | 12:35 | 35 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 12:35 | 12:50 | 14 | 0 |
| `phi4-mini_3.8b-RTX-5090-all-x1` | 2026-10-08 12:50 | 12:58 | 7 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-all-x1` | 2026-10-08 11:31 | 13:19 | 108 | 0 |
| `gemma4_12b-RTX-5090-all-x1` | 2026-10-08 12:58 | 13:25 | 27 | 0 |
| `qwen3.8_27b-RTX-5090-all-x1` | 2026-10-08 13:25 | 14:01 | 36 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-all-x1` | 2026-10-08 14:01 | 14:15 | 13 | 0 |
| `phi4-mini_3.8b-RTX-5090-important-x3` | 2026-10-08 14:15 | 14:23 | 8 | 0 |
| `gemma4_12b-RTX-5090-important-x3` | 2026-10-08 14:23 | 14:47 | 24 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-all-x1` | 2026-10-08 13:19 | 15:05 | 106 | 0 |
| `qwen3.8_27b-RTX-5090-important-x3` | 2026-10-08 14:47 | 15:16 | 29 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-important-x3` | 2026-10-08 15:16 | 15:28 | 11 | 0 |
| `phi4-mini_3.8b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 15:28 | 15:40 | 11 | 1 |
| `gemma4_12b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 15:40 | 15:56 | 15 | 1 |
| `qwen3.8_27b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 15:56 | 16:14 | 18 | 1 |
| `qwen3.6_35b-a3b-Mac-M1-Max-important-x3` | 2026-10-08 15:05 | 16:26 | 80 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-real-model-desktop` | 2026-10-08 16:14 | 16:27 | 13 | 1 |
| `phi4-mini_3.8b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 16:27 | 16:28 | 1 | 0 |
| `gemma4_12b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 16:28 | 16:30 | 1 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 16:30 | 16:32 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 16:32 | 16:34 | 1 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-pages-conversations-desktop` | 2026-10-08 16:34 | 16:37 | 3 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-pages-conversations-mobile` | 2026-10-08 16:37 | 16:41 | 3 | 0 |
| `gemma4_12b-RTX-5090-zigi-pages-conversations-desktop` | 2026-10-08 16:41 | 16:47 | 6 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-desktop` | 2026-10-08 16:47 | 16:49 | 1 | 1 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-mobile` | 2026-10-08 16:49 | 16:50 | 1 | 1 |
| `qwen3.8_27b-RTX-5090-zigi-photo-desktop` | 2026-10-08 16:50 | 16:51 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-photo-desktop` | 2026-10-08 16:51 | 16:53 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-photo-desktop` | 2026-10-08 16:53 | 16:54 | 0 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-real-model-desktop` | 2026-10-08 16:54 | 17:03 | 8 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-conversations-desktop` | 2026-10-08 17:03 | 17:05 | 2 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-day-in-the-life-desktop` | 2026-10-08 17:05 | 17:10 | 4 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-photo-desktop` | 2026-10-08 17:10 | 17:11 | 1 | 0 |
| `phi4-mini_3.8b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:16 | 17:17 | 1 | 0 |
| `gemma4_12b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:17 | 17:19 | 1 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:19 | 17:21 | 1 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:21 | 17:22 | 1 | 0 |
| `phi4-mini_3.8b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:26 | 17:27 | 1 | 0 |
| `gemma4_12b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:27 | 17:29 | 1 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:29 | 17:31 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-conversations-desktop` | 2026-10-08 17:31 | 17:33 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-conversations-desktop` | 2026-10-08 17:33 | 17:36 | 3 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-desktop` | 2026-10-08 17:36 | 17:37 | 1 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-day-in-the-life-mobile` | 2026-10-08 17:37 | 17:38 | 1 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-day-in-the-life-desktop` | 2026-10-08 17:38 | 17:43 | 4 | 0 |
| `qwen3.8_27b-RTX-5090-zigi-photo-desktop` | 2026-10-08 17:43 | 17:44 | 0 | 0 |
| `gemma4_12b-RTX-5090-zigi-photo-desktop` | 2026-10-08 17:44 | 17:46 | 2 | 0 |
| `qwen3.6_35b-a3b-RTX-5090-zigi-photo-desktop` | 2026-10-08 17:46 | 17:46 | 0 | 0 |
| `qwen3.6_35b-a3b-Mac-M1-Max-zigi-photo-desktop` | 2026-10-08 17:46 | 17:47 | 0 | 0 |
| `gate-b build` | 2026-10-08 17:47 | 17:47 | 0 | 0 |
| `gate-b zigi` | 2026-10-08 17:47 | 17:57 | 9 | 1 |
| `gate-b chain on 4c94fa6` | ?  | 17:58 | — | aborted (six ZIGi-suite failures: the programmatic refocus after a s |
| `gate-b build` | 2026-10-08 18:01 | 18:01 | 0 | 0 |
| `gate-b zigi` | 2026-10-08 18:01 | 18:11 | 9 | 0 |
| `gate-b webkit` | 2026-10-08 18:11 | 18:21 | 10 | 1 |
| `gate-b freeze` | 2026-10-08 18:21 | 18:31 | 9 | 1 |
| `gate-b weights` | 2026-10-08 18:31 | 18:31 | 0 | 0 |
| `part9 browser suite` | 2026-10-08 18:31 | 19:08 | 37 | 1 |
| `part9 unit suite` | 2026-10-08 19:08 | 19:09 | 1 | 0 |
| `part9 alpha checks build:alpha` | ?  | 19:09 | ? | 0 |
| `gate-b build` | 2026-10-08 19:23 | 19:24 | 0 | 0 |
| `h2 weights A` | ?  | 19:24 | ? | 0 |
| `h2 typecheck` | ?  | 19:24 | ? | 0 |
| `gate-b build` | 2026-10-08 19:24 | 19:24 | 0 | 0 |
| `h2 weights B` | ?  | 19:24 | ? | 0 |
| `post-merge zigi suites` | 2026-10-08 19:26 | 19:37 | 10 | 0 |
| `post-merge webkit suites` | 2026-10-08 19:37 | 19:49 | 11 | 0 |
| `post-merge isolated re-runs` | 2026-10-08 19:49 | 19:53 | 4 | 0 |
| `post-merge unit suite` | 2026-10-08 19:53 | 19:54 | 1 | 0 |
| `main build` | 2026-10-08 19:54 | 19:55 | 0 | 0 |
| `post-merge freeze` | 2026-10-08 19:55 | 19:56 | — | aborted (:3103 still served main 72ad872 — the old server survived t |
| `freeze: :3103 serves 72ad872a73ec14dd264260975d15a2fd3db8c699, not 757b3b1` | ?  | 19:56 | — | aborted  |
| `post-merge freeze` | 2026-10-08 19:57 | 20:06 | 9 | 0 |
| `gate-b build` | 2026-10-08 20:07 | 20:07 | 0 | 0 |
| `final zigi suites` | 2026-10-08 20:07 | 20:17 | 10 | 0 |
| `final webkit suites` | 2026-10-08 20:17 | 20:29 | 11 | 0 |
| `final alpha gate` | ?  | 20:29 | ? | 0 |
| `final memory spec WebKit run 1` | ?  | 20:29 | ? | 0 |
| `final memory spec WebKit run 2` | ?  | 20:29 | ? | 0 |
| `revert gate 1` | 2026-10-08 20:30 | 20:30 | 0 | 1 |
| `revert gate 2` | 2026-10-08 20:30 | 20:30 | 0 | 1 |
| `revert gate 1` | 2026-10-08 20:31 | 20:32 | 0 | 0 |
| `revert gate 2` | 2026-10-08 20:32 | 20:32 | 0 | 0 |
| `revert gates` | ?  | 20:38 | — | aborted (typecheck in the worktree lacked the packages' own node_mod |
| `revert gate 1` | 2026-10-08 20:38 | 20:44 | 5 | 0 |
| `revert gate 2` | 2026-10-08 20:44 | 20:44 | 0 | 0 |

Total: 1596 minutes (26.6 h) of recorded stages so far.


## 6d. Scores per model, before and after the fixes

**The full corpus (361 turns) on every model, before the session's app-side fixes and after all of them** (the same corpus, the same
Showcase day, the same scorer; "first token" is the harness's own clock on the wire, thought off on both passes):

| Model | Host | Before (runs, rate) | After (runs, rate) | First token before → after (median ms) |
|---|---|---|---|---|
| `gemma4:12b` | RTX 5090 | 361, 64.5 % | 361, 70.6 % | 1427 → 227 |
| `phi4-mini:3.8b` | RTX 5090 | 361, 40.4 % | 361, 46.8 % | 65 → 134 |
| `qwen3.6:35b-a3b` | RTX 5090 | 361, 56.8 % | 361, 61.2 % | 158 → 159 |
| `qwen3.8:27b` | RTX 5090 | 361, 72.0 % | 361, 73.4 % | 1735 → 371 |
| `qwen3.6:35b-a3b` | Mac M1 Max | 361, 60.7 % | 361, 62.0 % | 1323 → 2088 |

Every model gains from the fixes between the passes (ADR S34–S36, S40: shape repairs, titles for habits and goals, a drink's
serving, a nap that just ended, ISO weekdays, schedule phrases, a reminder's record, the correction sentence): gemma4 +6.1
points, phi4-mini +6.4, qwen3.6 +4.4 on the PC and +1.3 on the Mac, qwen3.8 +1.4. The first token falls where thought was
on in the first pass (gemma4 1.4 s → 0.23 s, qwen3.8 1.7 s → 0.37 s; S35). The Mac's first token rose (1.3 s → 2.1 s):
the second pass carried the longer protocol of the fixes through a bandwidth-bound machine, and 38 seconds of it overlapped
two local browser specs run by mistake (noted in the hours log); the PC's qwen3.6 shows no such change (158 → 159 ms).

**Variance: the important hundred (110 turns), three runs per model, after the fixes.** The spread is the gap between the
best and the worst run; "in every run" and "in none" count the cases that are stable either way, "mixed" the ones that
depend on the draw.

- `qwen3.6:35b-a3b` (Mac M1 Max): pass rate per run 56.4 %, 65.5 %, 67.3 % (spread 10.9 points); cases passing in every run 54, in none 27, mixed 29 of 110; total-latency medians per run 4644, 2548, 2878 ms
- `gemma4:12b` (RTX 5090): pass rate per run 70.9 %, 71.8 %, 69.1 % (spread 2.7 points); cases passing in every run 70, in none 26, mixed 14 of 110; total-latency medians per run 880, 614, 515 ms
- `phi4-mini:3.8b` (RTX 5090): pass rate per run 54.5 %, 55.5 %, 48.2 % (spread 7.3 points); cases passing in every run 48, in none 40, mixed 22 of 110; total-latency medians per run 268, 193, 203 ms
- `qwen3.6:35b-a3b` (RTX 5090): pass rate per run 65.5 %, 61.8 %, 60.0 % (spread 5.5 points); cases passing in every run 50, in none 25, mixed 35 of 110; total-latency medians per run 673, 437, 404 ms
- `qwen3.8:27b` (RTX 5090): pass rate per run 65.5 %, 60.9 %, 64.5 % (spread 4.5 points); cases passing in every run 55, in none 24, mixed 31 of 110; total-latency medians per run 2083, 1398, 1333 ms

gemma4 is the steadiest (2.7 points), the Mac the widest (10.9 points): its first run overlapped the first minute of a
gemma4 harness attempt on the same Mac (aborted at 06:21, noted in the hours log), which also explains that run's slower
median. A case that passes in some runs and not others is a model's coin flip, not an app defect: the fix program (Phase
2) targets the "in none" cases first.


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
| phi4-mini:3.8b (RTX 5090) | 150 | 103 | 68.7 | 798 | 39 | 1 | cards 22, schema 13, refusal 7, tool:list_habits 5, tool:goal_progress 2 |
| qwen3.6:35b-a3b (RTX 5090) | 150 | 115 | 76.7 | 849 | 39 | 0 | cards 13, schema 7, tool:list_habits 5, no-numbers 3, tool:goal_progress 2 |
| qwen3.8:27b (RTX 5090) | 150 | 112 | 74.7 | 1982 | 71 | 0 | cards 20, tool:list_habits 5, refusal 4, schema 4, no-numbers 3 |
| qwen3.6:35b-a3b (Mac M1 Max) | 60 | 45 | 75.0 | 5257 | 16 | 0 | cards 6, schema 3, tool:list_habits 2, refusal 2, tool:goal_progress 1 |

##### Multi-turn conversations (`tests/zigi-conversations.spec.ts`: plan → correct → accept → undo)

| Model (host) | Conversations | Card of the kind after the correction | Correction applied exactly | Undo exact | Errors |
|---|---:|---:|---:|---:|---:|
| gemma4:12b (RTX 5090) — before | 15 | 10 | 10 | 10 | 1 |
| phi4-mini:3.8b (RTX 5090) — before | 15 | 4 | 4 | 4 | 0 |
| qwen3.6:35b-a3b (RTX 5090) — before | 15 | 14 | 14 | 14 | 0 |
| qwen3.8:27b (RTX 5090) — before | 15 | 12 | 12 | 12 | 1 |
| gemma4:12b (RTX 5090) | 15 | 14 | 14 | 14 | 0 |
| phi4-mini:3.8b (RTX 5090) | 15 | 5 | 5 | 5 | 0 |
| qwen3.6:35b-a3b (RTX 5090) | 15 | 13 | 13 | 13 | 0 |
| qwen3.8:27b (RTX 5090) | 15 | 15 | 15 | 15 | 0 |
| qwen3.6:35b-a3b (Mac M1 Max) — before | 10 | 6 | 6 | 6 | 0 |
| qwen3.6:35b-a3b (Mac M1 Max) | 10 | 8 | 8 | 8 | 0 |

##### Per-page conversations (`tests/zigi-pages-conversations.spec.ts`, ten asks per area)

| Model (host) | Project | Areas | Asks | Passed | Pass % | Reply median ms | Most common misses |
|---|---|---:|---:|---:|---:|---:|---|
| gemma4:12b (RTX 5090) | desktop | 17 | 170 | 162 | 95.3 | 1182 | no card 6, refused 2 |
| qwen3.6:35b-a3b (RTX 5090) | desktop | 17 | 170 | 161 | 94.7 | 684 | no card 5, refused 5 |
| qwen3.6:35b-a3b (RTX 5090) | mobile | 17 | 170 | 157 | 92.4 | 706 | no card 12, refused 2 |

##### Day in the life (`tests/zigi-day-in-the-life.spec.ts`, three scenarios, the launcher's state at each step)

| Model (host) | Project | Steps | Steps as expected | States while waiting | States after an add | Misses |
|---|---|---:|---:|---|---|---|
| qwen3.6:35b-a3b (RTX 5090) | desktop | 18 | 17 | thinking 15, success 2, insight 1 | success 11 | card:log-sleep 1 |
| qwen3.6:35b-a3b (RTX 5090) | mobile | 18 | 16 | thinking 14, success 2, writing-proposal 1, insight 1 | success 10 | card:log-sleep 1, card:log-meditation 1 |
| qwen3.6:35b-a3b (Mac M1 Max) | desktop | 18 | 16 | thinking 15, success 2, insight 1 | success 10 | card:log-sleep 1, card:log-meditation 1 |

**Findings from the UI stages (every test green except the two named; a scored miss is the model's, recorded, never a red build):**

- **phi4-mini:3.8b (RTX 5090), 150 cases in 6.8 minutes: 103 of 150 scored passes (68.7 %), reply median 798 ms, a tool in 39 replies.** Misses: prose where a card was asked (22), a card the schema refused (13), refusals (7), the expected tool not called. One red test (`health-counter`): the model wrote `zigoals-action` and the JSON without any backticks, so the panel showed them raw (the harness saw the same in 2 of 361 replies; no fence, no block, the model's). A first pass of this run (31 minutes) was discarded: it waited 15 minutes for a launcher on Settings and measured fast tool replies at a 15-second floor (ADR S39).
- **gemma4:12b: 129 of 150 (86.0 %), median 1,551 ms.** The best card-maker of the five through the panel: three prose-instead-of-card misses in 150. Misses are mostly the expected tool not called (`list_habits`, `goal_progress`, `habit_stats`: it answers from the handle list in the context).
- **qwen3.8:27b: 112 of 150 (74.7 %), median 1,982 ms, a tool in 71 replies** (the most tool use). Misses: prose where a card was asked (20), then the same tool misses.
- **qwen3.6:35b-a3b (PC): 115 of 150 (76.7 %), median 849 ms**, the fastest large model; **the same weights on the Mac: 45 of 60 (75.0 %), median 5,257 ms**, six times slower, the same shape of misses (cards 6, schema 3).
- **Conversations (plan → correct → accept → undo).** Before the protocol change (ADR S40) the two smaller models corrected a just-proposed habit with an `edit-habit` by its title (refused when the title matched nothing; aimed at the Showcase's own "Walk" when it did) and qwen3.8 did it once. After one sentence in the protocol: gemma4 10 → 14 of 15, qwen3.8 12 → 15, the Mac 6 → 8 of 10, phi4-mini 4 → 5, qwen3.6 14 → 13 (noise). **Wherever a card of the right kind came back, the accept was exact and the undo restored the record byte for byte: 55 of 55.** The remaining misses are a correction answered with no card at all, or with a card of another kind (a meditation correction as a check-in).
- **Per page (170 asks per run, every area, desktop and phone): 94 to 95 % on both models**; the misses are a card where a plain answer was wanted (a reminder on a lookup) and a refusal that came as a hedge. The question-aware context reaches the model on every page: the answers quote the page's own records (a sleep list by night, the week's dates).
- **Day in the life (3 scenarios × 18 steps, three runs): 49 of 54 steps as expected**, the launcher thinking while waiting, presenting after a reply with cards, success at once after every add, empathetic on the careful topic, insight after a plain answer. The breakfast went by photo (three food cards from the drawn plate). The first attempt of this stage found two defects, both fixed before the recorded run: the helper looked for a Log button that only exists in log mode, and **an added card seconds after the reply left ZIGi on `presenting`: the controller's reaction gap and the presenting clip's hold were swallowing the person's own success (ADR S41, an app-side fix with a unit test).** The five misses are the model's: a sleep block without the bedtime for "midnight", a meditation log answered without a card on two runs.



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
| The same on the production build (Phase 2 P2.6, `next build` of the branch on `:3104`), both projects | 328 passed, 50 skipped, 4 failed on the first pass, all four fixed at the cause and re-run green: the robustness spec's log-mode retry (the first cut of S59 had lost it; refined, 14/14 in Chrome and WebKit), and the smoke's "no page error" on two projects, explained by a timestamped probe — WebKit rejects the router's in-flight link prefetches as "access control checks" when a page is left (the framework, not CSP; nothing on the dev server, which never prefetches); the smoke now identifies those by shape and moment and reports them (3 and 7 on the final pass, 0 other errors), any other page error still fails it (S64; X-Cloud has L2). Earlier passes on the same build had found the greeting holding a fast reply's whole flow (S60) and the request-count specs changed by the repair round (S59, S63); Chrome's ZIGi suites went 20 failed → 0 across the re-runs. The whole suite runs once more on the final head at Gate B. | production build |


## Phase 2 — "ZIGi to excellence" (P2.1–P2.3): the corpus at 626 cases, baseline and after

**The corpus** grew from 338 to 626 model-scored cases (`lib/ai/evals/corpus-phase2.ts`, ADR-017 S43–S44), 172 of them marked
important; the scorer gained field checks and tool-any. **The baseline** is the frozen code at `f7d9fe6` (the end of Phase 1)
run through the aligned harness on the 626 cases in tools mode, so the before and after differ only in the app's code; the
raw files are on `review/session-x-local-runs` under `real-model/phase2/`, one summary per run under `real-model/summaries/`.

### The baseline (frozen `f7d9fe6`, 626 cases, 773 turns, tools mode, thought off)

Two rates per run: **raw**, as the harness scored it that night, and **corrected** under ADR-017 S61 (a turn the device
answered carries no model tool call, so its tool expectation is moot: the same 32 turns on every model and run). Every run
after the baseline is scored with the corrected rule directly.

| Model | Host | Passed (raw) | Raw | Corrected (S61) | First token (median ms) | Total (median ms) | Most-missed checks (raw) | Minutes |
|---|---|---:|---:|---:|---:|---:|---|---:|
| `gemma4:12b` | RTX 5090 | 564 / 773 | 73.0 % | 596 / 773 · 77.1 % | 609 | 1528 | tool 81, cards 81, schema 42, fields 30, never 9 | 22 |
| `qwen3.8:27b` | RTX 5090 | 544 / 773 | 70.4 % | 576 / 773 · 74.5 % | 535 | 2112 | cards 125, tool 59, schema 35, fields 34, never 10 | 33 |
| `qwen3.6:35b-a3b` | RTX 5090 | 513 / 773 | 66.4 % | 545 / 773 · 70.5 % | 190 | 642 | tool 106, cards 103, schema 45, fields 34, tool-any 16 | 12 |
| `phi4-mini:3.8b` | RTX 5090 | 322 / 773 | 41.7 % | 354 / 773 · 45.8 % | 215 | 426 | cards 241, schema 143, tool 120, fields 76, refusal 26 | 6 |
| `qwen3.6:35b-a3b` | Mac M1 Max | 505 / 773 | 65.3 % | 537 / 773 · 69.5 % | 2119 | 5345 | tool 106, cards 106, schema 54, fields 30, tool-any 18 | 99 |

By kind (passed / cases) on the baseline — the lookups are the weakest family on every model (gemma4 63/120, qwen3.8 74/120,
qwen3.6 41/120, phi4-mini 30/120), then the briefs (12, 20, 9, 9 of 29); refusals, privacy and injection are near the ceiling
already (gemma4 53/57, 11/13, 19/20).

### After the fix program (the current code, the same 626 cases)

**The first after-run** (the code as pushed that morning: `0fb7066` for phi4-mini, gemma4 and qwen3.8; qwen3.6 ran on
`696df3c`, already with S59, S61 and S62): raw and corrected (S61) rates, the per-kind movement against the baseline.

| Model | Host | After (raw) | After (corrected) | Baseline → after, corrected | Lookups | Proposals | Multi-step | Refusals | First token (median ms) |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| `gemma4:12b` | RTX 5090 | 607 / 773 · 78.5 % | 639 / 773 · 82.7 % | 77.1 → 82.7 % | 63 → 78 of 120 | 174 → 185 of 232 | 132 → 158 of 183 | 53 → 45 of 57 | 609 → 1126 |
| `qwen3.8:27b` | RTX 5090 | 591 / 773 · 76.5 % | 623 / 773 · 80.6 % | 74.5 → 80.6 % | 74 → 78 | 162 → 181 | 128 → 157 | 43 → 37 | 535 → 582 |
| `qwen3.6:35b-a3b` | RTX 5090 | 612 / 773 · 79.2 % | 612 / 773 · 79.2 % (scored with S61 already) | 70.5 → 79.2 % | 41 → 103 | 166 → 191 | 135 → 143 | 48 → 42 | 190 → 215 |
| `phi4-mini:3.8b` | RTX 5090 | 418 / 773 · 54.1 % | 450 / 773 · 58.2 % | 45.8 → 58.2 % | 30 → 61 | 99 → 130 | 67 → 86 | 34 → 28 | 215 → 345 |
| `qwen3.6:35b-a3b` | Mac M1 Max | 620 / 773 · 80.2 % | 620 / 773 · 80.2 % (S61 already) | 69.5 → 80.2 % | 43 → 107 | 167 → 183 | 133 → 146 | 41 → 48 | 2119 → 2265 |

The refusals fell on every PC model in this run: that is the repair round firing after a correct decline and inventing a
card (S59, fixed before the re-run). The lookups rose everywhere (the router's pre-run facts and S61), most on qwen3.6,
which reads the pre-run records best. The Mac run (103 min, from 09:47 UTC) carried S59's first cut, which repaired
nothing on refused blocks (0 repairs; the PC's qwen3.6 run started three minutes later on the refined cut and repaired
32), so its 80.2 % is the router, S61 and S62 alone; its final run on the rounds 1–5 code is the Mac's measurement.

**The first after-run (the P2.2 fix program as pushed that morning, code `0fb7066`)** moved phi4-mini 41.7 → 54.1 % raw and
gemma4 73.0 → 78.5 % raw (lookups 63 → 78 of 120, multi-step 132 → 158 of 183, briefs 12 → 18 of 29), and showed two things
the fix program had introduced:
- the repair round fired on lookups, refusals and injection cases whenever a stray block had been refused, and the second
  ask with the schema then invented cards (phi4-mini: 156 of 773 replies repaired, 26 passing; 29 passed before and failed
  after, 13 of them refusals, injection and lookups; ten of its eleven over-proposal dumps were repair replies) — narrowed
  in **fix round 1** (ADR S59: only an ask that wants a card, never deletes, money or secrets, never after a decline);
- the same 32 turns failed on every model and run on a tool expectation a device answer made moot — the oracle
  contradiction corrected in the scorer (ADR S61; the baseline's corrected rates above).

**Fix round 2 (ADR S62)** was read off gemma4's remaining misses (cards 73, tool 44, schema 28, fields 27, refusal 14 of
166): the corpus's relative days derived from the harness's own Showcase day and the schedule expectations in the schema's
shape (oracle), the goal-edit, recipe, edit-versus-create and cards-over-figures sentences in the specialists, no pre-run
for widget and link asks, two intent cues (prompt and router). Rounds 1 and 2 run together as the PC re-run on
`5bd7f2d`; the Mac after-run is on the same code.

**Fix round 3 (ADR S65)** came from qwen3.8's after-run (39 unasked cards): the specialists say an answer carries no card,
a decline sends no block of any kind, Remember only on request, a missing value is asked for. **The re-run with rounds 1–3**
(PC, from 10:04 UTC) gave phi4-mini 58.3 % (flat) and gemma4 84.6 % (refusals back to 55 of 57, lookups 110 of 120; the
multi-step cases dipped 158 → 149, which the "only asks" sentence caused on messages that ask *and* log). **Fix round 4
(ADR S66)**, read off gemma4's remaining misses: the prompt now names the day (models wrote "today" for "hier",
"eergisteren" and weekday names because nothing told them the date), the Dutch and French clock idioms ("half acht" is
07:30), the person's own words for today and yesterday in `day`, a dozen router cues and families in three languages
(debts, net worth beside the totals, mindful minutes, sleep questions without a period, deadlines, holdings, "what should I
pay attention to", the longest session, imports and devices, the time of day, weekends), explicit widget, goal-edit
(category included, in any language) and challenge lines, and the mixed-ask wording. The PC re-runs on round 4 after the
rounds 1–3 run; the Mac's final run follows on the same code.

**The rounds 1–3 run, complete (PC, 10:04–11:26 UTC, code `18d06fc` + the round-3 sentences, scored with S61):**

| Model | Rate | Corrected baseline → here | Lookups | Proposals | Multi-step | Refusals | Briefs | Repairs (passing) | First token (median ms) | Misses left |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| `gemma4:12b` | 654 / 773 · **84.6 %** | 77.1 → 84.6 | 110 / 120 | 193 / 232 | 149 / 183 | 55 / 57 | 21 / 29 | 23 (8) | 1260 | cards 64, schema 28, fields 20, tool 12 |
| `qwen3.8:27b` | 646 / 773 · **83.6 %** | 74.5 → 83.6 | 114 / 120 | 180 / 232 | 158 / 183 | 46 / 57 | 26 / 29 | 17 (11) | 600 | cards 83, fields 24, schema 9, never 9 |
| `qwen3.6:35b-a3b` | 636 / 773 · **82.3 %** | 70.5 → 82.3 | 114 / 120 | 183 / 232 | 144 / 183 | 47 / 57 | 25 / 29 | 41 (21) | 281 | cards 90, schema 27, fields 27, refusal 12 |
| `phi4-mini:3.8b` | 451 / 773 · **58.3 %** | 45.8 → 58.3 | 80 / 120 | 134 / 232 | 90 / 183 | 32 / 57 | 19 / 29 | 122 (35) | 355 | cards 178, schema 113, fields 48, refusal 29 |

What is left on the three larger models is mostly a card asked for and prose returned, and in a good share of those the
model was right against the case (two Showcase habits tie at 27 days, a target "raised" below what the goal already
holds, a habit already done today, a reminder "on weekdays" no single card can hold): **fix round 5 (ADR S67)** corrected
those cases and added the reminder, unit and self-correction sentences. **The rounds 1–5 run** (PC, from 11:26 UTC, code
`76a1bc5`) is the measurement for the targets; the Mac's final run follows on the same code.

### The final runs (rounds 1–6, code `e7da285`) and every Phase 2 run on one scorer

Every run below is re-scored by the scorer as it stands (ADR S61: a device-answered turn carries no model tool call;
ADR S70: the refusal cue reads every way the models decline), so the columns compare like with like; the raw rate as
recorded that night is in the runs branch's index. Rounds 1–6 are the PC's final code for the corpus; round 7 (S70) is
the scorer alone.

| Model | Host | Baseline (frozen `f7d9fe6`) | After the first fix program | Rounds 1–3 | Rounds 1–5 | **Rounds 1–6** | Target (P2.3) |
|---|---|---:|---:|---:|---:|---:|---|
| `gemma4:12b` | RTX 5090 | 77.1 % | 82.8 % | 84.6 % | 89.3 % | **89.4 %** (691 / 773) | ≥ 90 %: 0.6 points short, inside the run-to-run spread (89.3 → 89.4 on identical code except S69; 32 lost, 34 gained between those two runs) |
| `qwen3.8:27b` | RTX 5090 | 74.5 % | 80.6 % | 83.7 % | 84.0 % | **85.1 %** (658 / 773) | ≥ 90 %: not met; what is left is the model's own judgement (a card asked for and prose returned, two check-ins for one, a log beside an answer) |
| `qwen3.6:35b-a3b` | RTX 5090 | 70.6 % | 79.6 % | 82.4 % | 81.1 % | **82.1 %** (635 / 773) | ≥ 85 %: not met on the PC; its runs move ±1.5 points on identical code |
| `qwen3.6:35b-a3b` | Mac M1 Max | 69.7 % | 80.3 % (S59's first cut) | — | 84.0 % (649 / 773) | **81.6 %** (631 / 773) | ≥ 85 %: not met; the two Mac runs on near-identical code (rounds 1–5, then 1–6, which only adds the day cue) sit 2.4 points apart (refusals 53 → 46 of 57, multi-step 151 → 141), so the Mac's own spread is at least that |
| `phi4-mini:3.8b` | RTX 5090 | 45.9 % | 58.6 % | 58.7 % | 60.2 % | **60.5 %** (468 / 773) | measured: proposals 144 of 232, multi-step 82 of 183 — "chat only, no cards" is the honest label |

By kind on the final PC run: gemma4 lookups 117 / 120, proposals 204 / 232, briefs 28 / 29, refusals 56 / 57, multi-step
156 / 183, follow-ups 41 / 45; qwen3.8 lookups 118 / 120, proposals 191 / 232, refusals 51 / 57, follow-ups 42 / 45;
qwen3.6 (PC) lookups 116 / 120, proposals 186 / 232, refusals 47 / 57; phi4-mini lookups 99 / 120, proposals 144 / 232.
On the Mac, qwen3.6's lookups 114 / 120, proposals 182 / 232, refusals 46 / 57, multi-step 141 / 183 (rounds 1–6; 106 min, first
token median about 2.3 s). The lookups are near the ceiling on every model but phi4-mini (the router's pre-run facts, the device's own answers, the
Dutch and French cues); the proposals and the multi-step turns carry what is left, and the variance runs (the important
172 cases, three times per model) size how much of the gap to the targets is spread rather than skill.

### Variance on the final PC code (the important 172 cases, 284 turns, three runs per model, 14:15–15:29 UTC)

| Model | Three runs | Spread | Mean | Refusals · privacy · injection, per run | First token median / p90 (ms) | Total median (ms) |
|---|---|---:|---:|---|---:|---:|
| `gemma4:12b` | 90.5 % / 86.3 % / 87.3 % | 4.2 pts | 88.0 % | 25/25 · 8/8 · 9/9 ; 25/25 · 8/8 · 8/9 ; 25/25 · 8/8 · 9/9 | 480 / 1536 | 1493 |
| `qwen3.8:27b` | 79.9 % / 82.0 % / 85.6 % | 5.6 pts | 82.5 % | 20/25 · 6/8 · 6/9 ; 22/25 · 6/8 · 7/9 ; 22/25 · 6/8 · 7/9 | 513 / 3013 | 1605 |
| `qwen3.6:35b-a3b` | 82.4 % / 78.9 % / 82.0 % | 3.5 pts | 81.1 % | 21/25 · 7/8 · 8/9 ; 22/25 · 7/8 · 8/9 ; 20/25 · 8/8 · 8/9 | 221 / 1405 | 562 |
| `phi4-mini:3.8b` | 58.5 % / 55.6 % / 55.6 % | 2.8 pts | 56.6 % | 13/25 · 4/8 · 7/9 ; 14/25 · 4/8 · 8/9 ; 14/25 · 3/8 · 7/9 | 265 / 500 | 488 |
| `qwen3.6:35b-a3b` (Mac M1 Max, 15:06–16:26 UTC) | 79.9 % / 81.0 % / 79.6 % | 1.4 pts | 80.2 % | 22/25 · 8/8 · 8/9 ; 22/25 · 6/8 · 8/9 ; 19/25 · 8/8 · 8/9 | 1920 / 7248 | 4323 |

What the spread says about the targets: gemma4's 89.4 % on the full corpus sits inside a 4-point band whose top run is
at 90.5 %, so the 90 % line is reached within its own run-to-run spread, and its refusals and privacy are 100 % in every
run with one injection case missed once; qwen3.8's band (80–86 %) and qwen3.6's (79–82 % on the PC; on the Mac 80–81 % on the important set, 81.6–84.0 % on
the full corpus) do not reach their targets in any run, and their refusals, privacy and injection sit at 80–95 %: the model's own
judgement, not the app, as the per-case reading above shows. phi4-mini is measured, not targeted: 56–60 %, refusals
about half, no cards to speak of.

### The panel, Phase 2 (150 cases per PC model through the real chat in Chrome, 15:28–16:28 UTC, dev server)

The panel spec takes the important cases first, and Phase 2 marked 72 more as important, so 73 of the 150 are new
`p2-*` cases (long multi-step asks, mixed intents, dates and times, units, Dutch and French) and only 77 are cases Phase
1 ran: the Phase 2 column is a harder set than Phase 1's, and the like-for-like column compares the 77 both ran, raw
against raw. "Corrected" counts the question router's own reads for the ask (ADR S72, the panel's S61) and the S70
refusal cue; Phase 1's panel numbers were never scored that way, so the comparison stays on the raw column.

| Model | Host | Phase 2 set (raw, as Phase 1 scored) | Corrected (S72: the router's reads, S70) | Like for like, raw (cases both phases ran): Phase 1 → Phase 2 | New cases only (raw) | Reply median (ms) | Errors | Checks missed (raw) |
|---|---|---:|---:|---|---:|---:|---:|---|
| `gemma4:12b` | RTX 5090 (desktop) | 116 / 149 · 77.9 % | 126/149 84.6% | 64 → 65 of 77 (83.1 % → 84.4 %) | 51 / 72 · 70.8 % | 2147 | 1 | tool 10, cards 10, schema 9, fields 9, never 3 |
| `phi4-mini:3.8b` | RTX 5090 (desktop) | 84 / 149 · 56.4 % | 95/149 63.8% | 52 → 54 of 77 (67.5 % → 70.1 %) | 30 / 72 · 41.7 % | 987 | 1 | cards 32, fields 18, schema 12, tool 11, refusal 11 |
| `qwen3.6:35b-a3b` | RTX 5090 (desktop) | 107 / 149 · 71.8 % | 118/149 79.2% | 58 → 59 of 77 (75.3 % → 76.6 %) | 48 / 72 · 66.7 % | 1599 | 1 | cards 21, tool 11, fields 11, schema 5, tool-any 4 |
| `qwen3.8:27b` | RTX 5090 (desktop) | 112 / 149 · 75.2 % | 120/149 80.5% | 55 → 63 of 77 (71.4 % → 81.8 %) | 49 / 72 · 68.1 % | 3600 | 1 | cards 21, fields 12, tool 9, never 3, schema 3 |
| `qwen3.6:35b-a3b` | Mac M1 Max (desktop), 60 cases, 16:54–17:03 UTC | 47 / 60 · 78.3 % | 53/60 88.3% | 38 → 39 of 51 (74.5 % → 76.5 %) | 8 / 9 · 88.9 % | 4410 | 0 | tool 7, cards 5, never 2, refusal 1, schema 1 |

Against the P2.3 panel targets (gemma4 and qwen3.8 ≥ 95 %, qwen3.6 ≥ 90 %): not met on this set in either scoring. Like
for like, every model moved up (gemma4 83 → 84 %, qwen3.8 71 → 82 %, qwen3.6 75 → 77 %, phi4-mini 68 → 70 %), and the
new cases are where the misses sit (gemma4 51 of 72, qwen3.8 49, qwen3.6 48, phi4-mini 30). The misses by check are the
same classes as the corpus: a card asked for and prose returned, a field off (a day, a time, a unit), a block the schema
refused; the panel adds the reply-time budget (one case per model timed out at 20 s).
The Mac's 60 (the important cases first, so 51 are cases Phase 1 ran on it): 78.3 % raw and **88.3 % corrected**, 1.7
points under its ≥ 90 % line (one case); its seven remaining misses are five cards asked for and answered in prose and
two stray blocks beside an answer — the model's judgement, the same classes as on the PC.

### Conversations, pages, the day and the photos, Phase 2 (PC, 16:28–16:54 UTC; raw / corrected as above)

| Stage | `gemma4:12b` | `qwen3.8:27b` | `qwen3.6:35b-a3b` | `phi4-mini:3.8b` | Target (P2.3) |
|---|---:|---:|---:|---:|---|
| Conversations (15 each: plan → correct → accept → undo, the accepted record checked on its page) | 14 / 15 (the laptop goal) | 14 / 15 (meditation minutes) | 11 / 15 | 7 / 15 | 15 of 15 on three PC models: not met; Phase 1 after its fixes had 14, 15, 13 and 5 |
| Pages (17 pages × 10 asks, desktop) | **170 / 170** | — | 160 / 170 · 94.1 % raw, **166 / 170 · 97.6 %** corrected (S70's cue, S73's two water asks; the four left are cards nobody asked for) | — | ≥ 98 % desktop and phone: gemma4 meets it; qwen3.6 0.4 points under |
| Pages (phone) | — | — | 164 / 170 · 96.5 % raw, 166 / 170 · 97.6 % corrected | — | as above |
| The day in the life (18 steps, with the photo step) | — | — | 16 / 18 on the desktop and 16 / 18 on the phone; the two misses are one scored step each and the run's end-of-day rest check (`idle` alone; since S71 the box keeps the focus, so it rests `listening` — the check now reads idle or listening and the day re-runs after the Mac's stages) | — | 54 of 54: not met |
| Photos (4 fictional and public-domain plates) | 3 / 4 | **4 / 4** | **4 / 4** | no vision | — |
| Reply medians (ms): conversations / pages / day / photos | 4176 / 1604 / — / 10036 | 4613 / — / — / 6792 | 2448 / 786 (810 phone) / 2117 (1680) / 4761 | 1927 / — / — / — | |

The Mac's first pass (16:54–17:11 UTC, the same code): 60 cases as in the panel table above; conversations **5 / 10**
(the five misses all one shape, below); the day **14 / 18** (the lie-in refused, the breakfast photo answered as "I
cannot see a real photo", a pre-fill card beside a money refusal, a card on the morning brief); photos **3 / 4** (the full
English: "I don't know how much oil was used, so I've kept servings and some nutrients out", which the hedge cue did not
read). Reply medians 19.5 s (conversations), 17.6 s (the day), 12.4 s (photos).

### Gate B and Part 9 on the production build (after the UI stages)

Gate B's ZIGi suites in Chrome found one more cause (S76: the message box's refocus after a send read as `listening`
and displaced thinking, success and the hints; six tests) and WebKit two test corrections (S77); after the owner's merge of
X-Cloud's PR #78 the suites found the auto-accept wording lost on X-Cloud's feed (S83) and one WebKit timeout that did
not recur. On the final production build: Chrome **366 passed, 0 failed** (422 real-model specs skip themselves), WebKit
**344 passed, 0 failed**, the Alpha gate green on both projects, the memory spec alone twice green. The full story with
every count is in STATUS.

### Fix rounds 8 and 9, read off the UI stages (ADR S74, S75), and their re-runs

**Round 8 (S74).** The conversations' one miss in common on every model and both hosts was a correction of a card nobody
had accepted yet: "Make it 15 minutes, not 10" after a proposed habit came back as `edit-habit` for a record that does
not exist (an invented handle, `h7`, refused by the planner as "Nothing proposed"), and "Change the note to …" after a
proposed goal note as an `edit-goal` of the goal's notes. The protocol sentence (the corrected card again, `"revise":
true`) was already in the prompt and did not hold on its own, so the device now rewrites such a reply before the cards
are read (`lib/ai/actions/revise.ts`, beside the day cue in the app and the harness): an edit whose target names no
record of the context, right after a reply that proposed a create-habit or create-goal, becomes that proposal again with
the changed fields and the revise flag; when a record with the proposed title exists by then (the card was accepted after
all) the edit keeps its kind and takes that record's handle; a notes-only edit of the goal whose note was proposed becomes
that note again. The planner's own resolver decides what "exists". One prompt sentence beside it: a corrected amount
replaces the proposed amount, never a counter of the difference (qwen3.6 had answered "It was 6500 steps" with a counter
of 500). Re-run on the PC (17:16–17:22 UTC, code `3796a5c`): gemma4 **15 / 15**, qwen3.6 14 / 15 (the challenge's days
read as the habit's target), qwen3.8 13 / 15, phi4-mini 7 / 15. qwen3.8's two were not corrections at all: "I want to
read 20 pages a day as a habit" became an edit of the Showcase's own Read habit (30 minutes) with the correction applied
to it, and "a 30 minute walk on Monday, Wednesday and Friday" a question about its Walk habit (8,000 steps) — correct
answers the oracle could not score.

**Round 9 (S75)**, read off the Mac's day and photo stages and round 8: (1) a money ask the reply declines in words
carries no card (`lib/ai/actions/decline.ts`; the decline cue is now one exported regex for the app and the scorer, so
the repair round also stops after "I do not move money"); (2) the weekend's lie-in had been refused on all six runs on
every host, including a block that was exactly right (`bedtime 00:00, wake 09:30, quality 5`), because the Showcase
seeds a night for every one of its 30 days but three and the lie-in overlaps the night that ended that morning — the
app's refusal was the correct product answer and the oracle asked for the impossible; the scenario now removes that
seeded night first, and a prompt idiom says midnight is 00:00 (the PC's blocks had no bedtime at all); (3) the photo
oracle's hedge cue reads "don't know" and "kept … out"; (4) the two colliding conversation asks now name habits the
Showcase has not got (journal pages, a bike ride). No assertion weakened; each change is listed in ADR-017.

**After rounds 8 and 9 (one run per stage, 17:26–17:48 UTC, code `4c94fa6`, dev server):**

| Stage | `gemma4:12b` (PC) | `qwen3.8:27b` (PC) | `qwen3.6:35b-a3b` (PC) | `phi4-mini:3.8b` (PC) | `qwen3.6:35b-a3b` (Mac) | Target (P2.3) |
|---|---:|---:|---:|---:|---:|---|
| Conversations (15 per PC model, 10 on the Mac) | **15 / 15** | **15 / 15** | **15 / 15** | 9 / 15 | **10 / 10** | 15 of 15 on three PC models: **met on this code** (one run each; the Phase 2 runs before the fix sat at 14, 14 and 11, which sizes the spread) |
| The day in the life (18 steps) | — | — | **17 / 18** desktop (the one miss: "Meditated for 20 minutes this evening" at 19:00 given a 19:00 start, which would end in the future — the planner's refusal is right, the start was invented), **18 / 18** phone | — | **18 / 18** | 54 of 54: 53 of 54 across the three runs, the one miss the model's |
| Photos (4 plates) | 3 / 4 (the spread: 1 of 9 items recognised) | **4 / 4** | 3 / 4 (a cookie invented on the drawn plate) | no vision | 3 / 4 (the spread: nothing recognised, no card) | — |
| Reply medians (ms): conversations / day / photos | 3344 / — / 7399 | 5001 / — / 8254 | 2641 / 1917 (1713 phone) / 5415 | 2144 / — / — | 19492 / 18688 / 9720 | |

Across every Phase 2 UI run on a stage (the runs before and after the fixes together, as the runs branch's index counts
them): conversations gemma4 44 / 45, qwen3.8 42 / 45, qwen3.6 40 / 45 (PC) and 15 / 20 (Mac), phi4-mini 23 / 45; the day
33 / 36 (PC desktop), 34 / 36 (PC phone), 32 / 36 (Mac); photos qwen3.8 8 / 8, gemma4 6 / 8, qwen3.6 7 / 8 (PC) and
6 / 8 (Mac). The photo misses are vision judgement on the one crowded plate (the spread) and one invented item; the day
and conversation misses before the fixes were the three defects above, now gone, plus the model's own.


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
