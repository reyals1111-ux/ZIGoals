# Session Z-Local — status and resume point

Kept current after every finished piece (owner's rule, 2026-10-10). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-z-local`), runs worktree `~/Documents/ZIGoals-Claude-z-runs`
(orphan branch `review/session-z-local-runs`), scratchpad `/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`; copies of the chain scripts are on the runs branch under `scripts/`).

## Resume here (2026-10-10 19:05Z, head: see `git log`)
1. Read this file, `hours.log` on the runs worktree (START/END per stage) and each chain's `.status` file in the scratchpad (`running …` or `done rc=…`).
2. Background chains that were running or queued when the session paused (each writes its own END line in `hours.log`; the chain scripts are copied to the runs branch under `scripts/`):
   - `part2-part3-chain` — the Opus corpus stage (`part2-opus-all`, forecast $18, started 18:20Z; 345/773 turns at 19:10Z). Log `stage-logs/part2-part3-chain.log`.
   - `part2-ui-chain` — the production build on :3103 (done), then the UI stages in Chrome on Sonnet/Haiku/Opus (panel, conversations, day, pages; photos skipped: no plates folder), the WebKit subset on Sonnet, the second half of the caching measurement (`part3-measure.sh` with `multiturn-ids-2.txt`), Haiku once more with the page records (`part6-haiku-after`), then the summaries and the rendered table (not committed by the chain). Log `stage-logs/part2-ui-chain.log`; each UI stage commits its run file to the runs branch.
   - `part6-chain` — waits for `END part2-ui-chain` and `END part2-part3-chain`, then `part6-sonnet-page` (Sonnet corpus with the page records, forecast $10), `part6-spoken-sonnet` ($6), `part6-spoken-haiku` ($0.6), `part6-opus-important` ($6.5), each ledger-guarded; then summaries + render + a feature-branch commit and push. Log `stage-logs/part6-chain.log`.
   - `part6b-chain` — waits for `END part6-chain`, then a fresh production build on :3103 (the panel rounds L30–L36 live in the bundle), the UI panel once more on Sonnet (`ui-panel-sonnet-2`, $3) and Haiku (`ui-panel-haiku-2`, $0.3), then conversations, day and pages on Sonnet once more only where the first run missed its target, then summaries, both tables, a feature-branch commit and push. Log `stage-logs/part6b-chain.log`.
   - `pc-chain` — on the RTX 5090 through the forwarder: `fr-before-gemma4` (worktree at `fe2d64d2`), `fr-after-gemma4`, `qwen38-pc`, `qwen36-pc`, `phi4-pc`, `spoken-gemma4`. Log `stage-logs/pc-chain.log`.
   - `pc-chain2` — waits for `END pc-chain` (today after 19:00Z or later), then `gemma4-page` (the corpus with the page records, the final gemma4 figure), `variance-gemma4` and `variance-qwen38` (important set ×3). Log `stage-logs/pc-chain2.log`.
   - `qwen36-mac-corpus` — qwen3.6 on the Mac's Ollama (slow). Log `stage-logs/qwen36-mac-corpus.log`.
   - `mac-run2` — `qwen36-mac-2` (qwen3.6 on the Mac with the page records and the fix rounds in; the first Mac run was 578/725). The queued `mac-chain` copy died at once on a one-minute transform error in the corpus file; this is the relaunch on a green tree. Log `stage-logs/mac-run2.log`.
3. Every push from the runs worktree goes through the repository's own pre-push hook (`.git/hooks/pre-push`, shared by worktrees), so the key sweep runs there too; the chains need no gate of their own.
4. The forwarder (`forwarder.mjs`, 127.0.0.1:11435 → the PC) must be started with `PC_OLLAMA_URL` set to the Tailscale address (the tailnet IP in `~/CLAUDE.md`):
   Node gets `EHOSTUNREACH` on the LAN address in `~/.config/zigoals/local-llm.env` (macOS's Local Network permission is not granted to Node; curl and Python reach it). Never print either address. If it is down, every PC stage fails its probe and `pc-status.log` on the runs worktree records the error.
4. When every chain has its END line: commit the summaries and the rendered table if the Part 6 chain's commit did not land (`git status`), re-score the earlier runs (`ZIGI_RESCORE`), render the targets table (`node scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 397/397`, after the golden tests ran) and the run table (`render-claude-doc.mjs`), and carry each "not met" into ADR-020 with its reason.
5. Then Part 2's document (recommendation per job, cost per 100 messages from the rendered rows), Part 9, the STATUS entry, Gates A/B/C (CI green on a quiet head: every push cancels the running Milestone quality run), the second security read, and stop caffeinate (`caffeinate.pid`), the forwarder (`forwarder.pid`) and the :3103 server (`serve-3103.pid`).

## Results so far (the tables in `ZIGI_CLAUDE_TEST_Z.md` are the record)
- Met: Sonnet, Haiku and Opus conversations 15/15 each; the day on Sonnet 36/36 (desktop and phone); gemma4 on the PC 645/725 (88.97 %: 0.03 pt short of the 89 % line, so the table says not met; a run with the page records is queued in `pc-chain2`); the WebKit conversations 5/5; the golden sets. Reported: the WebKit panel on Sonnet 57/60; Opus panel 57/60 (target 97 %).
- Not met yet (re-runs queued after the fix rounds): Sonnet corpus 89.7 %, Haiku corpus 87.5 %, Opus corpus 91.7 %, the Sonnet and Haiku UI panels (80.7 %, 83.3 %, both before the panel round), qwen3.6 on the Mac 79.7 % (before the fix rounds).

## Done (commits on the feature branch)
- Part 0, Part 1 (WebKit freeze), Part 3 (caching −81 % Sonnet / −78 % Opus input cost on the first half), Part 2 corpus stages (Sonnet ×1, important ×2, Haiku ×3; Opus running), Part 4 (spoken EN/NL, 1,880 generated asks, golden-spoken 397, French out), Part 5 (every action a kind, a navigation intent or a deliberate no), Part 7 (F5–F16 with tests), Part 8 (monthly tool + dry run $0.16), fix rounds 1–3 (ADR-020 L19–L29).
- Ledger: $36.99 of $130 before the Opus stage (its forecast is $18).

## Open
- UI, conversations, day, pages, photos and WebKit-subset stages (the UI chain); Part 2's document; Part 6's final runs and verdicts; Part 9; the STATUS entry; the gates.
