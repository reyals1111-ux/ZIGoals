#!/bin/bash
# Session Z-Local: one harness run (the Node corpus harness) against a real Claude model or a local model.
# Usage: harness.sh <stage-folder> <provider: anthropic|local> <model> <cases: all|important|ids:…|regex> [extra env...]
#   e.g. harness.sh probe anthropic claude-sonnet-5-5 important ZIGI_LIMIT=20
#        harness.sh corpus local gemma4:12b all ZIGI_MODEL_BASE=http://127.0.0.1:11435 ZIGI_HOST="RTX 5090"
# The key is read from the owner's env file inside this process only (never printed, never an argument).
set -u
STAGE="$1"; PROVIDER="$2"; MODEL="$3"; CASES="$4"; shift 4
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
OUT="$RUNS/real-model/$STAGE"; mkdir -p "$OUT"
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
if [ "$PROVIDER" = anthropic ]; then
  set -a; . "$HOME/.config/zigoals/anthropic-test.env"; set +a
  [ -n "${ANTHROPIC_TEST_KEY:-}" ] || { echo "no key in the environment"; exit 2; }
fi
for kv in "$@"; do export "$kv"; done
export ZIGI_REAL_MODEL=1 ZIGI_PROVIDER="$PROVIDER" ZIGI_MODEL="$MODEL" ZIGI_CASES="$CASES" ZIGI_OUT="$OUT"
pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts --reporter=dot 2>&1 | /usr/bin/grep -vE '^$'
RC=${PIPESTATUS[0]}
echo "== harness rc=$RC =="
exit $RC
