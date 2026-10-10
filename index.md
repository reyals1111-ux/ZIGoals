# Session Y Part 11: raw cells of the live human test on Alpha #34 (review only, never merged)

Labels: live (alpha.zigoals.app, deploy #34 = `e30b7c6`, read before each run), fictional data in the browser only, one
worker, a 250 ms pause between steps, market requests answered in the browser. The summary and the coverage table are in
`docs/verification/y-cloud/HUMAN_TEST.md` on `feature/session-y-cloud` (PR #80).

- `pass3/` — Pass 3, 2026-10-10 01:00:34–01:21:58 UTC: 68 `@live` journeys, 216 cells, 188 passed, 1 failed, 27 not
  applicable. `results.json` (Playwright's JSON report), `run.log` (the line reporter), `screens/` (the 73 captures the
  journeys took), `output/` (the one failed cell, J503 on the phone: error context, screenshot and trace).
- `recheck-J503/` — J503 alone after its harness fix (the check waits for the swapped file), 01:38 UTC: passed on D and P.

The traces record requests through the sandbox's local proxy (`127.0.0.1`); they carry no credentials, accounts or
personal data.
