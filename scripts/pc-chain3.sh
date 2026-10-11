#!/bin/bash
# Session Z-Local Part 6 (after L50): the local models on the PC again, free, on the L50 brain — gemma4 on the held-out spoken
# set and on the corpus with the page records, then qwen3.8 and qwen3.6 on the corpus with the page records.
# Usage: pc-chain3.sh [stage...]   (launched by hand once no other harness run is going; no wait loop of its own)
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
BASE=http://127.0.0.1:11435; HOST="RTX 5090"
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
curl -s -m 8 "$BASE/api/tags" | /usr/bin/grep -q '"models"' || { echo "== the PC is not reachable through the forwarder =="; echo "PC unreachable (pc-chain3) $(date -u +%FT%TZ)" >> "$RUNS/pc-status.log"; exit 6; }
run() { local name="$1"; shift; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; (cd "$RUNS" && git add -A && git commit -q -m "PC stage $name run file" && git push -q 2>&1 | tail -1); return $rc; }
for stage in ${*:-spoken-gemma4-2 gemma4-page-2 qwen38-pc-2 qwen36-pc-2}; do
  case "$stage" in
    spoken-gemma4-2) run spoken-gemma4-2 "$SC/harness.sh" spoken-gemma4-2 local gemma4:12b all ZIGI_SET=spoken ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    gemma4-page-2) run gemma4-page-2 "$SC/harness.sh" gemma4-page-2 local gemma4:12b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    qwen38-pc-2) run qwen38-pc-2 "$SC/harness.sh" qwen38-pc-2 local qwen3.8:27b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    qwen36-pc-2) run qwen36-pc-2 "$SC/harness.sh" qwen36-pc-2 local qwen3.6:35b-a3b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    *) echo "unknown stage $stage"; exit 4 ;;
  esac || echo "== $stage ended with an error (the chain goes on) =="
done
echo "END pc-chain3 $(date -u +%FT%TZ) rc=0" >> "$RUNS/hours.log"
echo "== pc chain 3 done $(date -u +%FT%TZ) =="
