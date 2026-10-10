#!/bin/bash
# Session Z-Local Part 6: after the Part 6 chain (one Anthropic chain at a time): a fresh production build on :3103 with the panel
# round in (ADR-020 L30–L33: the device's answers engine and two prompt lines live in the bundle), then the UI panel once more
# on Sonnet and Haiku, then the conversation, day and pages stages on Sonnet once more when their first run missed the target;
# then the summaries, both tables, and the feature-branch commit and push.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
SUMS=docs/verification/z-local/real-model/summaries
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
step "waiting for END part6-chain in hours.log"
until /usr/bin/grep -q '^END part6-chain ' "$RUNS/hours.log"; do sleep 120; done
step "part6-chain ended"
# 1. The production build with the panel round in, and the server on :3103 (the old one goes first).
if [ -f "$SC/serve-3103.pid" ] && kill -0 "$(cat "$SC/serve-3103.pid")" 2>/dev/null; then kill "$(cat "$SC/serve-3103.pid")"; sleep 3; fi
step build; echo "START build-3103-2 $(date -u +%FT%TZ)" >> "$RUNS/hours.log"
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build 2>&1 | tail -3
RC=${PIPESTATUS[0]}; echo "END build-3103-2 $(date -u +%FT%TZ) rc=$RC" >> "$RUNS/hours.log"; [ $RC -eq 0 ] || exit $RC
( cd apps/web && nohup pnpm exec next start --hostname 127.0.0.1 --port 3103 > "$SC/serve-3103.log" 2>&1 & echo $! > "$SC/serve-3103.pid" )
for i in $(seq 1 30); do sleep 2; curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' && break; done
curl -s -m 3 -o /dev/null -w 'server %{http_code}\n' http://127.0.0.1:3103/app
# 2. The panel once more.
S=claude-sonnet-5-5; H=claude-haiku-5-5
"$SC/ui-stage.sh" ui-panel-sonnet-2 $S zigi-real-model.spec.ts desktop 3 ZIGI_UI_CASES=150 || step "ui-panel-sonnet-2 rc=$?"
"$SC/ui-stage.sh" ui-panel-haiku-2 $H zigi-real-model.spec.ts desktop 0.3 ZIGI_UI_CASES=150 || step "ui-panel-haiku-2 rc=$?"
# 3. Conversations, the day and the pages once more on Sonnet when the first run missed its target (read off its summary).
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out "$SUMS" >/dev/null 2>&1
rate() { node -e 'const fs=require("fs"),d=process.argv[1],st=process.argv[2];let p=0,n=0;for(const f of fs.readdirSync(d))if(f.startsWith(st+"--")){const s=JSON.parse(fs.readFileSync(d+"/"+f,"utf8"));for(const g of Object.values(s.groups||{})){p+=g.passed;n+=g.runs}}console.log(n?(p/n).toFixed(4):"none")' "$SUMS" "$1"; }
again() { local stage="$1" target="$2"; shift 2; local r; r=$(rate "$stage"); step "$stage first run rate $r (target $target)"; if [ "$r" = none ] || [ "$(echo "$r < $target" | bc -l)" = 1 ]; then "$SC/ui-stage.sh" "$stage-2" "$@" || step "$stage-2 rc=$?"; else step "$stage met its target: no second run"; fi; }
again ui-conv-sonnet 1.0 $S zigi-conversations.spec.ts desktop 1
again ui-day-sonnet 1.0 $S zigi-day-in-the-life.spec.ts both 1
again ui-pages-sonnet 0.99 $S zigi-pages-conversations.spec.ts both 4.5
# 4. Summaries, both tables, the commit.
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out "$SUMS" >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 397/397
git add "$SUMS" docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the UI stages after the panel round on a fresh build (panel on Sonnet and Haiku; conversations, day and pages again where the first run missed), the summaries and both tables (written by the Part 6b chain)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
step "part 6b chain done"
