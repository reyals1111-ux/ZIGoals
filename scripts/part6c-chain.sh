#!/bin/bash
# Session Z-Local Part 6, the final Claude runs on the L57 brain (after ui-chain3; one harness or suite at a time), each
# ledger-guarded on the corrected ledger (L51): Haiku and Sonnet on the corpus with the page records, Haiku and Sonnet on the
# spoken set, Opus on the important set. Then summaries, both tables, the feature-branch commit and push.
set -u
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
RUNS=/Users/AIUSER/Documents/ZIGoals-Claude-z-runs
SUMS=docs/verification/z-local/real-model/summaries
cd /Users/AIUSER/Documents/ZIGoals-Claude || exit 97
eval "$(/opt/homebrew/bin/fnm env)"; fnm use 24.19.0 >/dev/null 2>&1
step() { echo "== $* $(date -u +%FT%TZ) =="; }
step "waiting for END ui-chain3 in hours.log"
until /usr/bin/grep -q '^END ui-chain3 ' "$RUNS/hours.log"; do sleep 120; done
step "ui-chain3 ended"
run() { local name="$1" F="$2"; shift 2; step "$name (forecast \$$F)"; node scripts/zigi/ledger.mjs --check "$F" || { step "$name refused by the ledger"; return 0; }; echo "START $name $(date -u +%FT%TZ)" >> "$RUNS/hours.log"; "$SC/harness.sh" "$@"; local rc=$?; echo "END $name $(date -u +%FT%TZ) rc=$rc" >> "$RUNS/hours.log"; node scripts/zigi/ledger.mjs >/dev/null 2>&1; (cd "$RUNS" && git add -A && git commit -q -m "Stage $name run file and ledger" && git push -q 2>&1 | tail -1); return $rc; }
run final-haiku-page 1 final-haiku-page anthropic claude-haiku-5-5 all ZIGI_PAGE_CONTEXT=1
run final-sonnet-page 11 final-sonnet-page anthropic claude-sonnet-5-5 all ZIGI_PAGE_CONTEXT=1
run final-spoken-haiku 0.4 final-spoken-haiku anthropic claude-haiku-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1
run final-spoken-sonnet 7 final-spoken-sonnet anthropic claude-sonnet-5-5 all ZIGI_SET=spoken ZIGI_PAGE_CONTEXT=1
run final-opus-important 5.5 final-opus-important anthropic claude-opus-5-5 important ZIGI_PAGE_CONTEXT=1
step "summaries and the document's tables"
node --no-warnings scripts/zigi/summarise.mjs $(ls "$RUNS"/real-model/*/*.json | /usr/bin/grep -vE "summary|rescored") --out "$SUMS" >/dev/null 2>&1
node --no-warnings scripts/zigi/render-claude-doc.mjs
node --no-warnings scripts/zigi/targets.mjs --golden 272/272 --golden-spoken 440/440
git add "$SUMS" docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md
git commit -q -m "Session Z-Local Part 6 — the final Claude runs on the L57 brain (Haiku and Sonnet on the corpus with the page records and on the spoken set, Opus on the important set), summaries and both tables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -q origin feature/session-z-local 2>&1 | tail -2
echo "END part6c-chain $(date -u +%FT%TZ) rc=0" >> "$RUNS/hours.log"
step "part 6c chain done"
