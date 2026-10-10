#!/bin/bash
# Session Z-Local stage runner: one background stage, its wall clock in hours.log, its output in a log, its exit code in
# a status file. Usage: stage.sh <name> <command...>   (the command runs through bash -c in apps/web unless STAGE_CWD is set)
set -u
NAME="$1"; shift
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
LOGS="$SC/stage-logs"; mkdir -p "$LOGS"
LOG="$LOGS/$NAME.log"; STATUS="$LOGS/$NAME.status"
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
cd "${STAGE_CWD:-/Users/AIUSER/Documents/ZIGoals-Claude/apps/web}" || exit 97
echo "running $(date -u +%FT%TZ)" > "$STATUS"
echo "START $NAME $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
bash -c "$*" > "$LOG" 2>&1
RC=$?
echo "END $NAME $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"
echo "done rc=$RC $(date -u +%FT%TZ)" > "$STATUS"
exit $RC
