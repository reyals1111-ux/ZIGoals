#!/bin/bash
# Part 3's measurement: the fixed 50-case multi-turn slice (multiturn-ids.txt, corpus order) through the harness with the
# cache markers off ("before") and on ("after"), on Sonnet and Opus; identical scores expected, ≥ 40 % lower input cost.
# Usage: part3-measure.sh [sonnet|opus ...]   Forecasts from forecast.env (F_P3_SONNET, F_P3_OPUS, each for both runs).
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
. "$SC/forecast.env"
IDS_FILE="${IDS_FILE:-$SC/multiturn-ids.txt}"; SUFFIX="${STAGE_SUFFIX:-}"
IDS="ids:$(cat "$IDS_FILE")"
for m in ${*:-sonnet opus}; do
  case "$m" in sonnet) MODEL=claude-sonnet-5-5; F=${F_P3_SONNET_OVERRIDE:-$F_P3_SONNET} ;; opus) MODEL=claude-opus-5-5; F=${F_P3_OPUS_OVERRIDE:-$F_P3_OPUS} ;; *) echo "unknown $m"; exit 4 ;; esac
  node scripts/zigi/ledger.mjs --check "$F" || { echo "== refused by the ledger =="; exit 3; }
  for mode in before after; do
    echo "== part3 $m $mode $(date -u +%FT%TZ) =="
    echo "START part3-$m-$mode $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
    if [ "$mode" = before ]; then "$SC/harness.sh" "cache-before$SUFFIX" anthropic "$MODEL" "$IDS" ZIGI_NO_CACHE=1; else "$SC/harness.sh" "cache-after$SUFFIX" anthropic "$MODEL" "$IDS"; fi
    RC=$?
    echo "END part3-$m-$mode $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
    node scripts/zigi/ledger.mjs
    node scripts/zigi/key-sweep.mjs >/dev/null 2>&1 || { echo "== key sweep hit before the runs push: stage stopped =="; exit 5; }
    (cd "$RUNS" && git add -A && git commit -q -m "Part 3: $m $mode run file and the ledger" && git push -q 2>&1 | tail -1)
    [ $RC -eq 0 ] || exit $RC
  done
done
echo "== part3 measurement done $(date -u +%FT%TZ) =="
