# Session Z-Local — status and resume point

Kept current after every finished piece (owner's rule, 2026-10-10). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-z-local`), runs worktree `~/Documents/ZIGoals-Claude-z-runs`
(orphan branch `review/session-z-local-runs`), scratchpad `/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`; copies of the chain scripts are on the runs branch under `scripts/`).

## Resume here (2026-10-11 19:10Z) — the session is closed
1. Nothing runs: every chain has its END line in `hours.log`, caffeinate, the forwarder, the dev server on :3102 and the production server on :3103 are stopped at the end of this session (the scratchpad's `caffeinate.pid` and `serve-3103.pid` are stale after that). The PC's Ollama was left as found.
2. The branch `feature/session-z-local` (PR #82) is ready for review and **not merged**; its last commit is the STATUS entry on top of `docs/STATUS.md`. `origin/main` is `a6e8bb9e` (Alpha #36). Raw run data: the orphan branch `review/session-z-local-runs` (the ledger, `hours.log`, every run file and the re-scored copies, the chain scripts under `scripts/`). Ledger: **$93.70 of $130**.
3. The targets: 11 met, 8 not met with the reason, 1 not run (the photo plates: no plates folder on this Mac). The verdict per target with the file behind it: `docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md`.
4. The owner decides: the WebKit job's promotion (one different mobile test per run on CI's runner, L64; the job stays advisory), GitHub push protection for the repository, the golden pin on whole-Dutch device answers (persona finding #4), the photo plates, the design font (Inter is neither shipped nor on the Mac; CI pins Liberation Sans), the three spoken-corpus kinds without a seed. Everything else is recorded in ADR-020 (L1–L67) and the STATUS entry.
5. To pick the work up again: read `docs/STATUS.md` (the top entry), `docs/architecture/ADR-020-session-z-local.md`, this file and `docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md`; start a production build on :3103 and the forwarder (`forwarder.mjs` with `PC_OLLAMA_URL` set to the Tailscale address, never printed) only if a stage needs them.

## Results so far (the tables in `ZIGI_CLAUDE_TEST_Z.md` are the record; the final runs on the L57 brain)
- Met (12): Sonnet, Haiku and Opus conversations 15/15 each; the day on Sonnet 36/36; Haiku corpus 688/725 (94.9 %); Haiku spoken 523/557 (93.9 %); Sonnet spoken 543/557 (97.5 %); the UI panel on Sonnet 143/150 (95.3 %) and on Haiku 140/150 (93.3 %); the pages on Haiku 168/170; gemma4 649/725 raw (89.5 %; 645 re-scored, 89.0 %, on its line); the golden sets (272/272, 440/440); caching second half −79.2 % Sonnet, −79.4 % Opus.
- Not met, with the reason: Sonnet corpus 697/725 (96.1 %, 0.9 pt under; the remaining misses are Sonnet's own, L63); Opus corpus 675/725 (93.1 %) and important set 272/284 (95.8 %, 1.2 pt under; the same pre-fill narration and plan-conversation extras); qwen3.8 632/725 (87.2 %, 2.8 pt under; deletions it does not propose, open-page cards beside answers); qwen3.6 on the PC 602/725 (83.0 %) and on the Mac 600/725 (82.8 %); the Sonnet pages 0.9706 (re-run in the after-final chain). Variance: gemma4 3.2 pt, qwen3.8 3.2 pt, Sonnet 0.0 pt.

## Done (commits on the feature branch)
- Part 0, Part 1 (WebKit freeze), Part 3 (caching −81 % Sonnet / −78 % Opus input cost on the first half), Part 2 corpus stages (Sonnet ×1, important ×2, Haiku ×3; Opus running), Part 4 (spoken EN/NL, 1,880 generated asks, golden-spoken 397, French out), Part 5 (every action a kind, a navigation intent or a deliberate no), Part 7 (F5–F16 with tests), Part 8 (monthly tool + dry run $0.16), fix rounds 1–3 (ADR-020 L19–L29).
- Ledger: $73.10 of $130 after the Opus important run (Haiku $3.5, Sonnet $47.7, Opus $44.2 by the ledger's own rows; L51: every figure read between 13:00Z and 13:45Z on 2026-10-11 counted re-scored copies twice).

## Open
- Owner item (persona finding #4): a whole question in Dutch without an AI gets the English fallback; the golden cases `nl-question`, `x-nl-whole`, `x-nl-sleep` pin it and the set is byte-identical by the owner's rule. Releasing the pin makes the device's Dutch word map a small change.
- Owner item from the Gate C security read: turn on GitHub secret-scanning push protection for the repository (the local pre-push sweep can be skipped with `--no-verify`).
- UI, conversations, day, pages, photos and WebKit-subset stages (the UI chain); Part 2's document; Part 6's final runs and verdicts; Part 9; the STATUS entry; the gates.
