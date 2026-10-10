#!/bin/bash
# Session Z-Local Part 2: one UI stage through the real panel in Chrome (or WebKit with ZIGI_ENGINE=webkit) on :3103 against a
# real Claude model, with the Anthropic Playwright config (trace, video, screenshots off; ephemeral contexts).
# Usage: ui-stage.sh <stage-folder> <model> <spec file> <project: desktop|mobile|both> <forecast-usd> [KEY=VAL ...]
# The key is read from the owner's env file inside this process only; after the stage: leftover profiles removed, the key
# sweep, the run files copied to the runs worktree, the ledger rebuilt, the runs branch committed and pushed.
set -u
unset DEBUG PWDEBUG   # Gate C read: Playwright's protocol debug logging would print the init script, which carries the key
STAGE="$1"; MODEL="$2"; SPEC="$3"; PROJECT="$4"; FORECAST="$5"; shift 5
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
OUT="$RUNS/real-model/$STAGE"; mkdir -p "$OUT"
PW_OUT="$SC/pw-$STAGE"; rm -rf "$PW_OUT"; mkdir -p "$PW_OUT"
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
node scripts/zigi/ledger.mjs --check "$FORECAST" || { echo "== refused by the ledger =="; exit 3; }
curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' || { echo "== :3103 is not serving =="; exit 6; }
set -a; . "$HOME/.config/zigoals/anthropic-test.env"; set +a
[ -n "${ANTHROPIC_TEST_KEY:-}" ] || { echo "no key in the environment"; exit 2; }
for kv in "$@"; do export "$kv"; done
export ZIGI_REAL_MODEL=1 ZIGI_PROVIDER=anthropic ZIGI_MODEL="$MODEL" ZIGI_HOST="Anthropic API" ZIGI_OUT="$OUT" PLAYWRIGHT_BASE_URL=http://127.0.0.1:3103 TZ=UTC
PROJ=(); if [ "$PROJECT" != both ]; then PROJ=(--project="$PROJECT"); fi
echo "START ui-$STAGE $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
pnpm --filter @zigoals/web exec playwright test -c playwright.anthropic.config.ts "tests/$SPEC" ${PROJ[@]+"${PROJ[@]}"} --workers=2 --output="$PW_OUT" --reporter=line 2>&1 | /usr/bin/grep -vE '^\s*$'
RC=${PIPESTATUS[0]}
echo "END ui-$STAGE $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
# Owner edit 3 / security read finding 5: no browser profile may be left behind.
for base in "${TMPDIR:-/tmp}" /tmp /private/tmp; do find "$base" -maxdepth 1 -name 'playwright*profile*' -newer "$SC/forecast.env" -exec rm -rf {} + 2>/dev/null; done
node scripts/zigi/key-sweep.mjs --paths "$PW_OUT" >/dev/null 2>&1 || { echo "== KEY SWEEP HIT after $STAGE: stage stopped, artifacts kept for the owner to rotate the key =="; exit 5; }
node scripts/zigi/ledger.mjs | tail -1
(cd "$RUNS" && git add -A && git commit -q -m "Part 2: UI stage $STAGE ($MODEL) run files and the ledger" && git push -q 2>&1 | tail -1)
echo "== ui-stage $STAGE rc=$RC =="
exit $RC
