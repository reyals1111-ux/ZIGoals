#!/bin/bash
# Session Z-Local, resumed 2026-10-11 after the owner's stop: the interrupted Haiku page-records run, then the Part 6 stages
# (each ledger-guarded), then the Part 6b chain (a fresh build on :3103 and the UI re-runs). The UI chain of Part 2 is not
# re-run: every one of its stages ended before the stop except part6-haiku-after, which is first here.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
run() { local name="$1" F="$2"; shift 2; step "$name (forecast \$$F)"; node scripts/zigi/ledger.mjs --check "$F" || { step "$name refused by the ledger"; return 0; }; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$SC/harness.sh" "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; node scripts/zigi/ledger.mjs | tail -1; (cd "$RUNS" && git add -A && git commit -q -m "Part 6: $name run files and the ledger" && git push -q 2>&1 | tail -1); [ $rc -eq 0 ] || step "$name ended rc=$rc (the chain goes on)"; }
run part6-haiku-after 1 part6-haiku-after anthropic claude-haiku-5-5 all ZIGI_PAGE_CONTEXT=1
run part6-sonnet-page 10 part6-sonnet-page anthropic claude-sonnet-5-5 all ZIGI_PAGE_CONTEXT=1
run part6-spoken-sonnet 6 part6-spoken-sonnet anthropic claude-sonnet-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1
run part6-spoken-haiku 0.6 part6-spoken-haiku anthropic claude-haiku-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1
run part6-opus-important 6.5 part6-opus-important anthropic claude-opus-5-5 important ZIGI_PAGE_CONTEXT=1
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out docs/verification/z-local/real-model/summaries >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 413/413
git add docs/verification/z-local/real-model/summaries docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the final harness runs (Haiku and Sonnet with the page records, the spoken set on Sonnet and Haiku, Opus on the important set), summaries and both tables (written by the resumed chain)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
echo "END part6-chain $(date -u +%FT%TZ) rc=0 (resumed in resume-anthropic.sh)" >> "$RUNS/hours.log"
step "part 6 stages done; handing over to the Part 6b chain"
exec "$SC/part6b-chain.sh"
