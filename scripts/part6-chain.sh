#!/bin/bash
# Session Z-Local Part 6: the final paid runs, queued behind the UI chain and the Opus corpus stage (one Anthropic chain at a
# time): Sonnet on the corpus with the page records as the app sends them, the held-out spoken set on Sonnet and Haiku, Opus on
# the important set (its corpus run is under 97 %). Each stage is ledger-guarded; then the summaries, the rendered table, and
# the feature-branch commit (summaries + document) with its push. Usage: part6-chain.sh [stage...]
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
step "waiting for END part2-ui-chain and END part2-part3-chain in hours.log"
until /usr/bin/grep -q '^END part2-ui-chain ' "$RUNS/hours.log" && /usr/bin/grep -q '^END part2-part3-chain ' "$RUNS/hours.log"; do sleep 120; done
step "predecessors ended"
for stage in ${*:-sonnet-page spoken-sonnet spoken-haiku opus-important}; do
  case "$stage" in
    sonnet-page) F=10; ARGS=(part6-sonnet-page anthropic claude-sonnet-5-5 all ZIGI_PAGE_CONTEXT=1) ;;
    spoken-sonnet) F=6; ARGS=(part6-spoken-sonnet anthropic claude-sonnet-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1) ;;
    spoken-haiku) F=0.6; ARGS=(part6-spoken-haiku anthropic claude-haiku-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1) ;;
    opus-important) F=6.5; ARGS=(part6-opus-important anthropic claude-opus-5-5 important ZIGI_PAGE_CONTEXT=1) ;;
    *) echo "unknown stage $stage"; exit 4 ;;
  esac
  step "$stage (forecast \$$F)"
  node scripts/zigi/ledger.mjs --check "$F" || { step "$stage refused by the ledger"; continue; }
  echo "START part6-$stage $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
  "$SC/harness.sh" "${ARGS[@]}"; RC=$?
  echo "END part6-$stage $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
  node scripts/zigi/ledger.mjs | tail -1
  (cd "$RUNS" && git add -A && git commit -q -m "Part 6: $stage run files and the ledger" && git push -q 2>&1 | tail -1)
  [ $RC -eq 0 ] || step "$stage ended rc=$RC (the chain goes on)"
done
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out docs/verification/z-local/real-model/summaries >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
git add docs/verification/z-local/real-model/summaries docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the final run summaries and the rendered run table (written by the Part 6 chain)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
step "part 6 chain done"
