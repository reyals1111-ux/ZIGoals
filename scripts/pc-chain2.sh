#!/bin/bash
# Session Z-Local Part 6: the local variance runs on the PC, queued behind pc-chain: the important set three times on gemma4 and
# on qwen3.8 (free). Usage: pc-chain2.sh [stage...]
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
BASE=http://127.0.0.1:11435; HOST="RTX 5090"
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
echo "== waiting for END pc-chain in hours.log $(date -u +%FT%TZ) =="
until /usr/bin/grep -E -q '^END pc-chain 2026-10-10T(1[9]|2[0-3])|^END pc-chain 2026-10-1[1-9]' "$RUNS/hours.log"; do sleep 120; done
echo "== pc-chain ended $(date -u +%FT%TZ) =="
curl -s -m 8 "$BASE/api/tags" | /usr/bin/grep -q '"models"' || { echo "== the PC is not reachable through the forwarder =="; echo "PC unreachable (pc-chain2) $(date -u +%FT%TZ)" >> "$RUNS/pc-status.log"; exit 6; }
run() { local name="$1"; shift; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; (cd "$RUNS" && git add -A && git commit -q -m "PC stage $name run file" && git push -q 2>&1 | tail -1); return $rc; }
for stage in ${*:-variance-gemma4 variance-qwen38}; do
  case "$stage" in
    variance-gemma4) run variance-gemma4 "$SC/harness.sh" variance-gemma4 local gemma4:12b important ZIGI_REPEAT=3 ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    variance-qwen38) run variance-qwen38 "$SC/harness.sh" variance-qwen38 local qwen3.8:27b important ZIGI_REPEAT=3 ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    *) echo "unknown stage $stage"; exit 4 ;;
  esac || echo "== $stage ended with an error (the chain goes on) =="
done
echo "== pc chain 2 done $(date -u +%FT%TZ) =="
