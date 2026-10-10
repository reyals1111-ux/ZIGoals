#!/bin/bash
# Session Z-Local Part 4: wait for the spoken-corpus batch, then fetch it (the key only inside this process).
set -u
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
set -a; . "$HOME/.config/zigoals/anthropic-test.env"; set +a
[ -n "${ANTHROPIC_TEST_KEY:-}" ] || { echo "no key in the environment"; exit 2; }
node --no-warnings scripts/zigi/spoken-corpus-gen.mjs wait "$1"
RC=$?
echo "== spoken wait rc=$RC =="
exit $RC
