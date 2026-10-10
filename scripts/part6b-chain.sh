#!/bin/bash
# Session Z-Local Part 6: the UI panel once more on Sonnet and Haiku after the panel round (ADR-020 L30–L33), queued behind the
# Part 6 chain so one Anthropic chain runs at a time; then the summaries, both tables, and the feature-branch commit and push.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
step "waiting for END part6-chain in hours.log"
until /usr/bin/grep -q '^END part6-chain ' "$RUNS/hours.log"; do sleep 120; done
step "part6-chain ended"
curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' || { step ":3103 is not serving: restarting the production server"; ( cd apps/web && nohup pnpm exec next start --hostname 127.0.0.1 --port 3103 > "$SC/serve-3103.log" 2>&1 & echo $! > "$SC/serve-3103.pid" ); sleep 20; }
"$SC/ui-stage.sh" ui-panel-sonnet-2 claude-sonnet-5-5 zigi-real-model.spec.ts desktop 3 ZIGI_UI_CASES=150 || step "ui-panel-sonnet-2 rc=$?"
"$SC/ui-stage.sh" ui-panel-haiku-2 claude-haiku-5-5 zigi-real-model.spec.ts desktop 0.3 ZIGI_UI_CASES=150 || step "ui-panel-haiku-2 rc=$?"
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out docs/verification/z-local/real-model/summaries >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 397/397
git add docs/verification/z-local/real-model/summaries docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the UI panel after the panel round (Sonnet and Haiku), the summaries and both tables (written by the Part 6b chain)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
step "part 6b chain done"
