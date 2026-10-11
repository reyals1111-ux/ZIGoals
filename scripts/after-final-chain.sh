#!/bin/bash
# Session Z-Local, after the final Claude runs (one suite at a time): a fresh production build on :3103 with every commit in,
# the pages stage once more on Sonnet (its first attempt lost 32 of 34 cases to the write race, L61), then the ZIGi suites
# in Chrome and in WebKit on that build (owner item 2), then summaries, both tables, the commit and the push.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
SUMS=docs/verification/z-local/real-model/summaries
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
unset DEBUG PWDEBUG
step() { echo "== $* $(date -u +%FT%TZ) =="; }
mark() { echo "$1 $2 $(date -u +%FT%TZ)${3:+ $3}" >> "$RUNS/hours.log"; }
step "waiting for END part6c-chain in hours.log"
until /usr/bin/grep -q '^END part6c-chain ' "$RUNS/hours.log"; do sleep 120; done
step "part6c-chain ended"
# 1. The build, and the server on :3103 (killed by port, L58).
for i in $(seq 1 10); do PIDS=$(lsof -nP -tiTCP:3103 -sTCP:LISTEN); [ -z "$PIDS" ] && break; echo "$PIDS" | xargs -I{} kill {} 2>/dev/null; sleep 2; done
PIDS=$(lsof -nP -tiTCP:3103 -sTCP:LISTEN); [ -n "$PIDS" ] && echo "$PIDS" | xargs -I{} kill -9 {} 2>/dev/null; sleep 1
mark START build-3103-4; NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build 2>&1 | tail -3; RC=${PIPESTATUS[0]}; mark END build-3103-4 "rc=$RC"; [ $RC -eq 0 ] || exit $RC
( cd apps/web && nohup pnpm exec next start --hostname 127.0.0.1 --port 3103 > "$SC/serve-3103.log" 2>&1 & )
for i in $(seq 1 30); do sleep 2; curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' && break; done
lsof -nP -tiTCP:3103 -sTCP:LISTEN | head -1 > "$SC/serve-3103.pid"
# The served bundle, not the disk (convention 63): every chunk the page references answers 200.
BAD=0; for p in $(curl -s -m 10 http://127.0.0.1:3103/app/habits | /usr/bin/grep -o -E '/_next/static/chunks/[A-Za-z0-9_.-]+\.(js|css)' | sort -u); do c=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:3103$p"); [ "$c" = 200 ] || BAD=$((BAD+1)); done
step "served chunks not 200: $BAD"; [ "$BAD" -eq 0 ] || { step "the served build is broken; stopping"; exit 7; }
# 2. The pages stage once more (the lock in record(), L61).
mark START ui-pages-sonnet-2b; "$SC/ui-stage.sh" ui-pages-sonnet-2 claude-sonnet-5-5 zigi-pages-conversations.spec.ts both 4.5; RC=$?; mark END ui-pages-sonnet-2b "rc=$RC"
# 3. The ZIGi suites on the build: Chrome, then WebKit (both projects, 2 workers, one suite at a time).
cd apps/web
mark START suites-chrome; PLAYWRIGHT_BASE_URL=http://127.0.0.1:3103 pnpm exec playwright test tests/zigi-*.spec.ts --workers=2 --reporter=line 2>&1 | tail -6; RC=${PIPESTATUS[0]}; mark END suites-chrome "rc=$RC"
# The WebKit set as CI runs it (the ZIGi suites and the webkit-* specs: the freeze, the smoke, the phone set), traces kept on a failure by the config.
mark START suites-webkit; PLAYWRIGHT_BASE_URL=http://127.0.0.1:3103 pnpm exec playwright test -c playwright.webkit.config.ts tests/zigi-*.spec.ts tests/webkit-*.spec.ts --workers=2 --reporter=line 2>&1 | tail -8; RC=${PIPESTATUS[0]}; mark END suites-webkit "rc=$RC"
cd /Users/AIUSER/Documents/ZIGoals-Claude
# 4. Summaries, both tables, the commit.
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out "$SUMS" >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 440/440
git add "$SUMS" docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local — the pages stage on Sonnet again (under the lock), summaries and both tables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
mark END after-final-chain "rc=0"
step "after-final chain done"
