# ZIGi's monthly evaluation

Once a month, the same fixed set of asks goes through ZIGi's brain on two Claude models, and a short report says how many
came back right and what it cost. The set never changes between months (the corpus's important single-turn cases, fictional
Showcase records only), so a drop is a real drop: a model update, a prompt change or a parser change, never a different
test. One request per case through Anthropic's Message Batches API (half price), scored on the device by the same scorer as
every other ZIGi test. About $2.50 a month on Sonnet and Haiku together; the hard cap refuses anything over the figure you
give.

## What you need
- The test key in `~/.config/zigoals/anthropic-test.env` (one line, `ANTHROPIC_TEST_KEY=…`, file mode 0600). It is read
  inside the command's own shell only; it is never printed, never written and never in the report.
- The repository checked out with its dependencies installed (`pnpm install --frozen-lockfile --ignore-scripts`), and the
  runs worktree at `~/Documents/ZIGoals-Claude-z-runs` (the raw JSON goes there, never on the feature branch).

## Steps, one Terminal command each
1. Go to the repository:
   ```bash
   cd ~/Documents/ZIGoals-Claude
   ```
2. Run the evaluation with a cap of five dollars (it forecasts first and refuses to submit anything over the cap; the
   batches take ten minutes to an hour, the command waits and polls):
   ```bash
   ( set -a; . ~/.config/zigoals/anthropic-test.env; set +a; node scripts/zigi/eval-monthly.mjs --max-usd 5 )
   ```
   Options: `--opus 20` adds a 20-case slice on Opus 5.5 (about $1); `--limit 40` is a dry run on 40 cases (under $1);
   `--month 2026-11` names the report.
3. Read the report it names, `docs/verification/zigi-monthly/<YYYY-MM>.md`: one row per model (pass rate, by kind,
   tokens, cost), the spend against the cap, the previous month's rates, and the list of missed cases with the check that
   failed. Compare the rates with the previous month's line.
4. Commit the report (nothing else changes):
   ```bash
   git add docs/verification/zigi-monthly && git commit -m "ZIGi monthly evaluation $(date +%Y-%m)"
   ```
5. Add the raw run files to the runs branch so the ledger counts them:
   ```bash
   cd ~/Documents/ZIGoals-Claude-z-runs && git add -A && git commit -m "Monthly evaluation $(date +%Y-%m)" && git push
   ```

## What the figures mean
- **Pass**: the reply did what the case expects (the right card with the right fields, the right refusal, the right facts
  from the records), scored by `lib/ai/evals/score.ts` without any model. A miss names the check that failed.
- **Rate**: Session Z-Local's bars were 97 % on Sonnet and 92 % on Haiku on the full corpus in tools mode; attach mode
  without the repair round scores a little lower by construction, so compare months with each other, not with those bars.
- **Cost**: the API's own usage fields at the published prices in `lib/ai/pricing.ts` (dated), at the Batch API's half rate.
  Cache reads inside a batch are not guaranteed, so the cost is the ceiling for the same asks sent one by one.

## If something goes wrong
- "ANTHROPIC_TEST_KEY is not in the environment": run the command exactly as in step 2 (the parentheses and `set -a` matter).
- "refused: the forecast … is over the cap": raise `--max-usd` or use `--limit`.
- A model row missing from the report: that batch failed; the Terminal shows the harness's error; run again next day.
- The report never contains the key; if you ever see a key-shaped string anywhere, rotate the key.
