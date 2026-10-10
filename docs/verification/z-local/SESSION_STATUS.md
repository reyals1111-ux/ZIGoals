# Session Z-Local — status and resume point

Kept current after every finished piece (owner's rule, 2026-10-10). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-z-local`), runs worktree `~/Documents/ZIGoals-Claude-z-runs`
(orphan branch `review/session-z-local-runs`), scratchpad `/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`; copies of the chain scripts are on the runs branch under `scripts/`).

## Resume here (2026-10-10 18:55Z, head `d2d99d4d`)
1. Read this file, `hours.log` on the runs worktree (START/END per stage) and each chain's `.status` file in the scratchpad.
2. Background chains that were running when the session paused (each writes its own END line in `hours.log`):
   - `part2-part3-chain` — the Opus corpus stage (`part2-opus-all`, forecast $18, started 18:20Z, ~3 h). Log `stage-logs/part2-part3-chain.log`.
     When it ends: `scripts/zigi/summarise.mjs` on the run file, `ZIGI_RESCORE` through `rescore.test.ts`, `render-claude-doc.mjs`, commit the summary (feature) and the run file + ledger (runs).
   - `pc-chain` — on the RTX 5090 through the forwarder: `fr-before-gemma4` (worktree at `fe2d64d2`), `fr-after-gemma4`, `qwen38-pc`, `qwen36-pc`, `phi4-pc`, `spoken-gemma4`. Log `stage-logs/pc-chain.log`; each stage commits its run file to the runs branch.
   - `qwen36-mac-corpus` — qwen3.6 on the Mac's Ollama (slow, ~50 s a turn). Log `stage-logs/qwen36-mac-corpus.log`.
3. The forwarder (`forwarder.mjs`, 127.0.0.1:11435 → the PC) must be started with `PC_OLLAMA_URL` set to the Tailscale address (the tailnet IP in `~/CLAUDE.md`):
   Node gets `EHOSTUNREACH` on the LAN address in `~/.config/zigoals/local-llm.env` (macOS's Local Network permission is not granted to Node; curl and Python reach it). Never print either address.
4. After the Opus stage: stop the dev server on :3102, then run `part2-ui-chain.sh` in the background (production build on :3103, UI panel Sonnet/Haiku/Opus, WebKit subset, Part 3's second half, the Haiku page-context re-run, summaries and the rendered table).
5. Decide `p2-delete-weight` (`corpus-phase2.ts`): "last Monday" from the harness date has no Showcase weight reading (readings every fourth day from 2026-09-06), so the card cannot name a record; change the ask to a day with a reading and list it in ADR-020.
6. Part 6 to the targets: Sonnet corpus once with `ZIGI_PAGE_CONTEXT=1` after the fix rounds; the spoken set on Sonnet (ledger-guarded) and gemma4 (in `pc-chain`); variance ×3 local on the important set; one verdict line per target with evidence.
7. Then Part 2's document, Part 9, the STATUS entry, Gates A/B/C (CI green on a quiet head), the second security read, and stop caffeinate, the forwarder and every server.

## Done (commits on the feature branch)
- Part 0, Part 1 (WebKit freeze), Part 3 (caching −81 % Sonnet / −78 % Opus input cost on the first half), Part 2 corpus stages (Sonnet ×1, important ×2, Haiku ×3; Opus running), Part 4 (spoken EN/NL, 1,880 generated asks, golden-spoken 397, French out), Part 5 (every action a kind, a navigation intent or a deliberate no), Part 7 (F5–F16 with tests), Part 8 (monthly tool + dry run $0.16), fix rounds 1–3 (ADR-020 L19–L29).
- Ledger: $36.99 of $130 before the Opus stage (its forecast is $18).

## Open
- UI, conversations, day, pages, photos and WebKit-subset stages (the UI chain); Part 2's document; Part 6's final runs and verdicts; Part 9; the STATUS entry; the gates.
