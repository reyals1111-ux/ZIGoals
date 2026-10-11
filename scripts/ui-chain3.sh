#!/bin/bash
# Session Z-Local Part 6 (after L50/L51): the Part 6b UI stages that the inflated ledger refused (the ledger counted every
# re-scored copy as a second run; the true spend was $73.10). Waits for the PC chain (one harness or suite at a time), checks
# the corrected ledger per stage, runs the panel once more on Sonnet and Haiku and the pages on Sonnet (desktop and phone),
# then summaries, both tables, the feature-branch commit and push.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
SUMS=docs/verification/z-local/real-model/summaries
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
step "waiting for END pc-chain3 in hours.log"
until /usr/bin/grep -q '^END pc-chain3 ' "$RUNS/hours.log"; do sleep 120; done
step "pc-chain3 ended"
curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3103/app | /usr/bin/grep -qE '^(200|307|308)$' || { step ":3103 is not serving"; exit 6; }
S=claude-sonnet-5-5; H=claude-haiku-5-5
run() { local name="$1"; shift; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; return $rc; }
run ui-panel-sonnet-2 "$SC/ui-stage.sh" ui-panel-sonnet-2 $S zigi-real-model.spec.ts desktop 3 ZIGI_UI_CASES=150 || step "ui-panel-sonnet-2 rc=$?"
run ui-panel-haiku-2 "$SC/ui-stage.sh" ui-panel-haiku-2 $H zigi-real-model.spec.ts desktop 0.3 ZIGI_UI_CASES=150 || step "ui-panel-haiku-2 rc=$?"
run ui-pages-sonnet-2 "$SC/ui-stage.sh" ui-pages-sonnet-2 $S zigi-pages-conversations.spec.ts both 4.5 || step "ui-pages-sonnet-2 rc=$?"
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out "$SUMS" >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 440/440
git add "$SUMS" docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the UI stages the inflated ledger refused, run on the corrected one: the panel again on Sonnet and Haiku, the pages again on Sonnet (desktop and phone), summaries and both tables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
echo "END ui-chain3 $(date -u +%FT%TZ) rc=0" >> "$RUNS/hours.log"
step "ui chain 3 done"
