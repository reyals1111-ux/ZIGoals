# Session Z-Local — status and resume point

Kept current after every finished piece (owner's rule, 2026-10-10). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-z-local`), runs worktree `~/Documents/ZIGoals-Claude-z-runs`
(orphan branch `review/session-z-local-runs`), scratchpad `/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`; copies of the chain scripts are on the runs branch under `scripts/`).

## Resume here (2026-10-11 13:05Z)
1. `origin/main` (Alpha #36, Z-Cloud's PR #81) is merged into this branch (`df34fbfb`, a merge commit): STATUS, What's new, Help and the weight budgets merged clean; `proposal-list.tsx` keeps Z-Cloud's receipts, the cards fingerprint and the freeze fix; the chat panel keeps Z-Cloud's source line with the "Records sent" line after it. The production build of the merged tree keeps every weight budget (Help 408.9 of 409.0 kB, the shell 405.0 of 406.0 kB).
2. Pushed head `282f1170` carries the merge, the persona round (L43), the spoken navigation forms (L44), the examples that outranked the rules (L45, L46), the WebKit CI commits (a) and (b), and the browser specs that follow the decisions (listed in ADR-020). Its Milestone quality run is the one to read: the earlier failures on the pre-merge head were pinned expectations now updated, plus two WebKit-only failures that pass locally in WebKit (the freeze spec, the memory spec). Local commits since then (L47, L48, summaries) wait for that run to conclude, then push together.
3. Chains (each writes its END line in `hours.log`): `resume-anthropic` — Haiku spoken, then Opus on the important set, then `part6b-chain.sh` (fresh build, the UI panel again on Sonnet and Haiku, conversations/day/pages again where the first run missed); `pc-chain2` — qwen3.8 variance; the Mac run is done (601/725). Logs in the scratchpad's `stage-logs/`; scripts copied to the runs branch under `scripts/`.
4. After every chain has its END line: re-score the earlier runs (`ZIGI_RESCORE`), render both tables (`render-claude-doc.mjs`, `targets.mjs --golden 272/272 --golden-spoken 440/440`), re-run the ZIGi suites in Chrome and WebKit on the production build on :3103 (owner item 2), then Part 2's document (recommendation per job), Part 9, the STATUS entry on top of Z-Cloud's, Gates A/B/C on a quiet head, the WebKit job's promotion after two green runs in a row (Y41's way), and stop caffeinate, the forwarder and the servers.
5. The forwarder (`forwarder.mjs`, 127.0.0.1:11435 → the PC) runs with `PC_OLLAMA_URL` set to the Tailscale address (Node gets `EHOSTUNREACH` on the LAN address: macOS's Local Network permission). Never print either address.

## Results so far (the tables in `ZIGI_CLAUDE_TEST_Z.md` are the record)
- Met (7): Sonnet, Haiku and Opus conversations 15/15 each; the day on Sonnet 36/36; Haiku on the corpus with the page records 668/725 (92.1 %); gemma4 with the page records 647/725 (89.2 %); the pages on Haiku 168/170; the golden sets. Close: Sonnet corpus 687/725 (94.8 %), Sonnet spoken 524/557 re-scored (94.1 %), qwen3.6 on the PC 616/725 (85.0 % line missed by one turn), Opus corpus 677/725 re-scored (93.4 %), qwen3.6 on the Mac 601/725 (82.9 %). Reported: gemma4 spoken 460/557, phi4-mini 457/725, the WebKit panel 57/60.
- Not met yet (re-runs queued after the fix rounds): Sonnet corpus 89.7 %, Haiku corpus 87.5 %, Opus corpus 91.7 %, the Sonnet and Haiku UI panels (80.7 %, 83.3 %, both before the panel round), qwen3.6 on the Mac 79.7 % (before the fix rounds).

## Done (commits on the feature branch)
- Part 0, Part 1 (WebKit freeze), Part 3 (caching −81 % Sonnet / −78 % Opus input cost on the first half), Part 2 corpus stages (Sonnet ×1, important ×2, Haiku ×3; Opus running), Part 4 (spoken EN/NL, 1,880 generated asks, golden-spoken 397, French out), Part 5 (every action a kind, a navigation intent or a deliberate no), Part 7 (F5–F16 with tests), Part 8 (monthly tool + dry run $0.16), fix rounds 1–3 (ADR-020 L19–L29).
- Ledger: $36.99 of $130 before the Opus stage (its forecast is $18).

## Open
- Owner item (persona finding #4): a whole question in Dutch without an AI gets the English fallback; the golden cases `nl-question`, `x-nl-whole`, `x-nl-sleep` pin it and the set is byte-identical by the owner's rule. Releasing the pin makes the device's Dutch word map a small change.
- Owner item from the Gate C security read: turn on GitHub secret-scanning push protection for the repository (the local pre-push sweep can be skipped with `--no-verify`).
- UI, conversations, day, pages, photos and WebKit-subset stages (the UI chain); Part 2's document; Part 6's final runs and verdicts; Part 9; the STATUS entry; the gates.
