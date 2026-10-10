#!/bin/bash
# Session Z-Local, the PC stages (RTX 5090 through the loopback forwarder on 127.0.0.1:11435), run when the PC is reachable:
#   1. gemma4 "before" French removal from a worktree at fe2d64d2 (the last commit with French) and "after" from the branch head (L7's proof);
#   2. qwen3.8 and qwen3.6 on the corpus (Part 6 targets), both with the page records as the app sends them;
#   3. gemma4 on the held-out spoken corpus (Part 4).
# Usage: pc-chain.sh [stage...]   (default: all)   Each stage leaves its run file on the runs worktree; nothing is paid.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
REPO=/Users/AIUSER/Documents/ZIGoals-Claude
PRE=/Users/AIUSER/Documents/ZIGoals-Claude-pre-french
BASE=http://127.0.0.1:11435; HOST="RTX 5090"
cd "$REPO" || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
PROBE=$(curl -s -m 8 -w " HTTP %{http_code}" "$BASE/api/tags" 2>&1); echo "$PROBE" | /usr/bin/grep -q '"models"' || { ERR=$(echo "$PROBE" | tail -c 200); echo "== the PC is not reachable through the forwarder: $ERR =="; echo "PC unreachable $(date -u +%FT%TZ): $ERR" >> "$RUNS/pc-status.log"; exit 6; }
curl -s -m 8 "$BASE/api/tags" | /usr/bin/grep -q 'gemma4:12b' || { echo "== gemma4:12b is not on the PC =="; exit 6; }
run() { local name="$1"; shift; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; (cd "$RUNS" && git add -A && git commit -q -m "PC stage $name run file" && git push -q 2>&1 | tail -1); return $rc; }
for stage in ${*:-fr-before fr-after qwen38 qwen36 phi4 spoken-gemma4}; do
  case "$stage" in
    fr-before)
      if [ ! -d "$PRE" ]; then git worktree add "$PRE" fe2d64d2 >/dev/null 2>&1 || exit 7; (cd "$PRE" && pnpm install --frozen-lockfile --ignore-scripts --offline >/dev/null 2>&1 || pnpm install --frozen-lockfile --ignore-scripts >/dev/null 2>&1) || exit 7; fi
      # The old harness from the old checkout: the same command the main harness runs, from the worktree.
      run fr-before-gemma4 bash -c "cd '$PRE' && ZIGI_REAL_MODEL=1 ZIGI_PROVIDER=local ZIGI_MODEL=gemma4:12b ZIGI_HOST='$HOST' ZIGI_MODEL_BASE='$BASE' ZIGI_CASES=all ZIGI_OUT='$RUNS/real-model/fr-before' pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts --reporter=dot 2>&1 | /usr/bin/grep --line-buffered -vE '^\s*$'" ;;
    fr-after) run fr-after-gemma4 "$SC/harness.sh" fr-after local gemma4:12b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ;;
    qwen38) run qwen38-pc "$SC/harness.sh" qwen38-pc local qwen3.8:27b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    qwen36) run qwen36-pc "$SC/harness.sh" qwen36-pc local qwen3.6:35b-a3b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    phi4) run phi4-pc "$SC/harness.sh" phi4-pc local phi4-mini:3.8b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_PAGE_CONTEXT=1 ;;
    spoken-gemma4) run spoken-gemma4 "$SC/harness.sh" spoken-gemma4 local gemma4:12b all ZIGI_MODEL_BASE="$BASE" ZIGI_HOST="$HOST" ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1 ;;
    *) echo "unknown stage $stage"; exit 4 ;;
  esac || { echo "== $stage failed =="; exit 5; }
done
echo "== pc chain done $(date -u +%FT%TZ) =="
