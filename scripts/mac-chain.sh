#!/bin/bash
# Session Z-Local Part 6: qwen3.6 on the Mac's Ollama once more, with the page records and the fix rounds in, queued behind the
# first Mac run (one Mac model run at a time: the Mac is bandwidth-bound).
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
echo "== waiting for END qwen36-mac-corpus in hours.log $(date -u +%FT%TZ) =="
until /usr/bin/grep -q '^END qwen36-mac-corpus ' "$RUNS/hours.log"; do sleep 120; done
echo "== first Mac run ended $(date -u +%FT%TZ) =="
curl -s -m 8 http://127.0.0.1:11434/api/tags | /usr/bin/grep -q 'qwen3.6:35b-a3b' || { echo "== qwen3.6 is not on the Mac's Ollama =="; exit 6; }
echo "START qwen36-mac-2 $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
"$SC/harness.sh" qwen36-mac-2 local qwen3.6:35b-a3b all ZIGI_MODEL_BASE=http://127.0.0.1:11434 ZIGI_HOST='Mac M1 Max' ZIGI_PAGE_CONTEXT=1; RC=$?
echo "END qwen36-mac-2 $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
(cd "$RUNS" && git add -A && git commit -q -m "Mac stage qwen36-mac-2 run file" && git push -q 2>&1 | tail -1)
echo "== mac chain done rc=$RC $(date -u +%FT%TZ) =="
