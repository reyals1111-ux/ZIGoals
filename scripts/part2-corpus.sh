#!/bin/bash
# Part 2, the corpus stages on real Claude, one after the other, each guarded by the ledger (a stage whose forecast would
# cross the cap is refused, the chain stops). Forecasts per stage come from forecast.env, written after the Sonnet probe.
# Usage: part2-corpus.sh [stage...]   (default: sonnet-all sonnet-important-x2 haiku-all-x3 opus-all)
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
. "$SC/forecast.env"   # F_SONNET_ALL, F_SONNET_IMPORTANT_X2, F_HAIKU_ALL_X3, F_OPUS_ALL (USD)
STAGES="${*:-sonnet-all sonnet-important-x2 haiku-all-x3 opus-all}"
for stage in $STAGES; do
  case "$stage" in
    sonnet-all) F=$F_SONNET_ALL; ARGS=(corpus anthropic claude-sonnet-5-5 all) ;;
    sonnet-important-x2) F=$F_SONNET_IMPORTANT_X2; ARGS=(variance anthropic claude-sonnet-5-5 important ZIGI_REPEAT=2) ;;
    haiku-all-x3) F=$F_HAIKU_ALL_X3; ARGS=(corpus anthropic claude-haiku-5-5 all ZIGI_REPEAT=3) ;;
    opus-all) F=$F_OPUS_ALL; ARGS=(corpus anthropic claude-opus-5-5 all) ;;
    *) echo "unknown stage $stage"; exit 4 ;;
  esac
  echo "== $stage (forecast \$$F) $(date -u +%FT%TZ) =="
  node scripts/zigi/ledger.mjs --check "$F" || { echo "== refused by the ledger =="; exit 3; }
  echo "START part2-$stage $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
  "$SC/harness.sh" "${ARGS[@]}"; RC=$?
  echo "END part2-$stage $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
  node scripts/zigi/ledger.mjs
  (cd "$RUNS" && git add -A && git commit -q -m "Part 2: $stage run files and the ledger" && git push -q 2>&1 | tail -1)
  [ $RC -eq 0 ] || { echo "== $stage failed rc=$RC =="; exit $RC; }
done
echo "== corpus stages done $(date -u +%FT%TZ) =="
