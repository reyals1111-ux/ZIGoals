#!/bin/bash
# Session Z-Local Part 2, after the corpus chain: a production build of the branch on :3103, then the UI stages in Chrome
# (panel 150 Sonnet / 150 Haiku / 60 Opus; 15 conversations on each; the day on desktop and phone (Sonnet); the pages on
# Sonnet desktop+phone and Haiku desktop; the photos when the plates folder exists), the WebKit subset on Sonnet (60 panel
# cases + 5 conversations), then the second half of the caching measurement (19 cases, 130 turns, Sonnet and Opus).
# Every stage is ledger-guarded; the chain stops at the first failure.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
. "$SC/forecast.env"
PHOTOS="${ZIGI_PHOTOS_DIR:-}"
step() { echo "== $* $(date -u +%FT%TZ) =="; }
# 1. The production build and the server on :3103 (the old server goes first).
if [ -f "$SC/serve-3103.pid" ] && kill -0 "$(cat "$SC/serve-3103.pid")" 2>/dev/null; then kill "$(cat "$SC/serve-3103.pid")"; sleep 3; fi
step build; echo "START build-3103 $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build 2>&1 | tail -5
RC=${PIPESTATUS[0]}; echo "END build-3103 $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"; [ $RC -eq 0 ] || exit $RC
( cd apps/web && nohup pnpm exec next start --hostname 127.0.0.1 --port 3103 > "$SC/serve-3103.log" 2>&1 & echo $! > "$SC/serve-3103.pid" )
for i in $(seq 1 30); do sleep 2; curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' && break; done
curl -s -m 3 -o /dev/null -w 'server %{http_code}\n' http://127.0.0.1:3103/app
# 2. The UI stages (Chrome).
S=claude-sonnet-5-5; H=claude-haiku-5-5; O=claude-opus-5-5
"$SC/ui-stage.sh" ui-panel-sonnet $S zigi-real-model.spec.ts desktop "$F_UI_PANEL_SONNET" ZIGI_UI_CASES=150 || exit $?
"$SC/ui-stage.sh" ui-panel-haiku $H zigi-real-model.spec.ts desktop "$F_UI_PANEL_HAIKU" ZIGI_UI_CASES=150 || exit $?
"$SC/ui-stage.sh" ui-panel-opus $O zigi-real-model.spec.ts desktop "$F_UI_PANEL_OPUS" ZIGI_UI_CASES=60 || exit $?
"$SC/ui-stage.sh" ui-conv-sonnet $S zigi-conversations.spec.ts desktop "$F_UI_CONV_SONNET" || exit $?
"$SC/ui-stage.sh" ui-conv-haiku $H zigi-conversations.spec.ts desktop "$F_UI_CONV_HAIKU" || exit $?
"$SC/ui-stage.sh" ui-conv-opus $O zigi-conversations.spec.ts desktop "$F_UI_CONV_OPUS" || exit $?
"$SC/ui-stage.sh" ui-day-sonnet $S zigi-day-in-the-life.spec.ts both "$F_UI_DAY_SONNET" ${PHOTOS:+ZIGI_PHOTOS=$PHOTOS} || exit $?
"$SC/ui-stage.sh" ui-pages-sonnet $S zigi-pages-conversations.spec.ts both "$F_UI_PAGES_SONNET" || exit $?
"$SC/ui-stage.sh" ui-pages-haiku $H zigi-pages-conversations.spec.ts desktop "$F_UI_PAGES_HAIKU" || exit $?
if [ -n "$PHOTOS" ] && [ -f "$PHOTOS/real-2-1600.jpg" ]; then
  for m in $S $H $O; do "$SC/ui-stage.sh" "ui-photos-${m#claude-}" "$m" zigi-photo.spec.ts desktop "$F_UI_PHOTOS" ZIGI_PHOTOS="$PHOTOS" || exit $?; done
else step "photos skipped: no plates folder (ZIGI_PHOTOS_DIR)"; fi
# 3. The WebKit subset on Sonnet: 60 panel cases and 5 conversations.
"$SC/ui-stage.sh" ui-webkit-panel-sonnet $S zigi-real-model.spec.ts desktop "$F_UI_WEBKIT_SONNET" ZIGI_ENGINE=webkit ZIGI_UI_CASES=60 || exit $?
"$SC/ui-stage.sh" ui-webkit-conv-sonnet $S zigi-conversations.spec.ts desktop 0.5 ZIGI_ENGINE=webkit ZIGI_CONVERSATIONS=5 || exit $?
# 4. The second half of the caching measurement.
IDS_FILE="$SC/multiturn-ids-2.txt" STAGE_SUFFIX=-2 F_P3_SONNET_OVERRIDE="$F_P3_2_SONNET" F_P3_OPUS_OVERRIDE="$F_P3_2_OPUS" "$SC/part3-measure.sh" sonnet opus || exit $?
# 4b. Part 6: Haiku once more on the corpus with the prompt rounds in (cheap), to read the fix rounds' effect before Sonnet's final run.
node scripts/zigi/ledger.mjs --check 1 && { echo "START part6-haiku-after $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$SC/harness.sh" part6-haiku-after anthropic claude-haiku-5-5 all ZIGI_PAGE_CONTEXT=1; echo "END part6-haiku-after $(date -u +%FT%TZ) rc=$?" >> "$RUNS/hours.log"; node scripts/zigi/ledger.mjs | tail -1; node scripts/zigi/key-sweep.mjs >/dev/null 2>&1 && (cd "$RUNS" && git add -A && git commit -q -m "Part 6: Haiku after the prompt rounds, and the ledger" && git push -q 2>&1 | tail -1); }
# 5. Summaries and the document's tables.
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary") --out docs/verification/z-local/real-model/summaries >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
step "ui chain done"
