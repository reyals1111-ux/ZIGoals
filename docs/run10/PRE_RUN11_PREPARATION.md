# Pre-Run 11 preparation resume

Source branch: `codex/pre-run11-preparation`, based on verified `origin/main` `901e2a6600fb8292b7956717d45341f050fd377c` (merged PR20).

| Item | State | Next command or action |
| --- | --- | --- |
| PRE11-01 release/NovaVault | Complete; vault notes backed up and read back | Continue PRE11-02 |
| PRE11-02 offline checker | Complete locally; focused tests pass | Continue PRE11-03 |
| PRE11-03 email helper | Complete locally; LIVE_DELIVERY_NOT_RUN | Continue PRE11-04 |
| PRE11-04 current CI | Investigated; unresolved, no source correction justified | Isolate browser failures in Run 11 before changing limits |

Recovery: `.superpowers/pre-run11-recovery/source-901e2a6.tar.gz` is a source-only archive of deployed main. No preview or owner browser data was touched. No real email or physical sync was tested.

Offline setup checker: privately fill ignored `apps/web/.env.local` with `ZIGOALS_AUTH_ORIGIN`, `ZIGOALS_AUTH_PUBLIC_KEY`, `ZIGOALS_SYNC_ORIGIN`, `AUTH_PUBLIC_KEY`, and `ZIGOALS_OWNER_WORKER_CONFIG=workers/private-sync/wrangler.preview.owner.jsonc`. The owner Worker file must be ignored, mode 0600, and include an isolated name, HTTPS `vars.AUTH_ORIGIN`/`vars.APP_ORIGIN`, and the VAULTS SQLite binding/migration. No key goes in that Worker file. For email-only setup, add `ZIGOALS_ALLOWED_AUTH_ORIGIN` and `ZIGOALS_TEST_RECIPIENTS` to the private environment file and run `node --env-file=apps/web/.env.local scripts/pre-run11-setup.mjs --auth-only`; it does not require the sync Worker. For full local consistency, run:

```sh
chmod 600 apps/web/.env.local workers/private-sync/wrangler.preview.owner.jsonc
node --env-file=apps/web/.env.local scripts/pre-run11-setup.mjs
```

This command only checks local shape and relationships. It never contacts providers, verifies packaged runtime exposure or establishes real email/physical encrypted sync. Missing services are expected today. Focused current test: `fnm exec --using 24.19.0 pnpm exec vitest run scripts/pre-run11-setup.test.mjs scripts/pre-run11-email.test.mjs` (22/22).

Email-code helper: see [template and exact commands](PRE_RUN11_EMAIL_TEMPLATE.md). The pinned Vitest entry point passes the helper regression tests offline. No real mail was sent and no provider user was created in this preparation job.

Current main [Milestone quality run 36166832282](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36166832282) at exact `901e2a6600fb8292b7956717d45341f050fd377c` was cancelled. Its `contract` job passed. The `web` job passed install, doctor, config/landing, lint/type/unit/build, audit and browser installation. The combined Playwright step started 17:26:04Z, reported 358 tests using two workers, emitted multiple `F` failure markers and one `T` timeout marker, then was cancelled 17:38:54Z near its 15-minute job limit. Later Alpha build/security/secret steps were skipped. The truncated cancellation log gives no reliable failed test names or assertion details. This is not evidence of a timeout-only issue; no CI limit was changed and no green quality gate is claimed. Next: run the browser suite with a reporter that preserves failed test names and diagnostics, repair the actual failures, then reconsider the job limit with evidence. Successful [Manual Alpha deployment 36167099005](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36167099005) is a separate gate.

Final local verification: 11/11 focused offline tests, direct ESLint on all four new script/test files, both script syntax checks, `git diff --check`, source archive hash and both vault read-back hashes passed. The isolated worktree has no installed workspace dependencies, so its full repository TypeScript command could not resolve application packages; the current main hosted web job had already passed its typecheck at the deployed source. No full application typecheck is claimed for this preparation branch.

NovaVault: `/Users/AIUSER/Documents/NovaVault/30-Projects/Personal AI Lab/ZIGoals/Project Map.md` SHA256 `c45b84bc6ef3aa272ada4b56344a0c33bebcd30b15eaa9abeb71164dffbebc0e`; `Release Evidence/Run 10 Actual Checkpoint.md` SHA256 `64d1918f1552f656cd5fd5d14967cf0397843e3cd5d4faa20ae84eec2ed22998`. Both have `.bak-20260925T193900Z` backups.

## Pre-Run 11B continuation — checkpoint A

A complete locally on this branch: shared fail-closed Supabase public-key shape classification; bounded JSONC owner config reading with path, ignore and 0600 checks; auth-only configuration mode; bounded email response reading and sanitized response classes; normal Vitest registration. Synthetic CLI fixtures use private temporary Git roots and no live provider. Email request remains `LIVE_DELIVERY_NOT_RUN`; `create_user:true` can create a user only when the owner explicitly runs the manual request tomorrow. Local shape never proves provider validity or application readiness.

Pinned runtime `fnm exec --using 24.19.0` reports Node 24.19.0; pnpm 11.19.0. Focused tests 22/22, full unit 1,380 passed/1 skipped (localhost-enabled run), TypeScript exit 0, lint exit 0 with one preexisting `use-private-store.ts` warning, diff check clean. A sandbox-only first unit run hit loopback EPERM in four existing Worker fixture tests; the permitted localhost rerun passed. No app/browser data or live service was used.

B instrumentation checkpoint: `scripts/pre-run11-browser.mjs diagnostic|full` builds and starts only this worktree on an unused loopback port, uses the pinned runtime, line+JSON reporters, zero retries and run-owned output under ignored `.superpowers/pre11b-browser/`. The summary parser distinguishes passed, failed, skipped, not-run and interrupted. Disposable pass/fail/timeout fixtures proved line names and nonzero failure exit; fixture removed. CI now uses line+JSON and retains fixture-only browser artifacts where cleanup can run; all gates remain. B diagnostic run still pending. C pending: repair at most three proven small cause groups. Next: commit instrumentation for clean build identity, then run `fnm exec --using 24.19.0 node scripts/pre-run11-browser.mjs diagnostic`.

## Pre-Run 11B browser diagnostic — checkpoint B

At source `4df2a9c927e93770ad62dd96d47b26ab9a3dfb43`, a pinned production build and owned localhost server ran the desktop/mobile Playwright plan on Mac arm64, Chrome 153.0.8010.53. The five-failure diagnostic stopped with 142 passed, 5 failed, 8 skipped, 202 not run and 1 interrupted out of 358 planned. Zero server errors were found. The five named desktop failures and three specific cause groups are recorded in [the structured browser report](evidence/pre-run11b-browser-report.json). This is a partial Mac diagnosis, not hosted CI or full-suite acceptance. The reporter now counts planned tests it never reached as not run, including opt-in skips; parser regression passes 4/4. Next: repair those three small stale test assertions while preserving the current UI and security intent, then run the affected tests and full suite if viable.

## Pre-Run 11B bounded repairs — checkpoint C

Three confirmed stale-test cause groups were repaired without changing product UI or accounting: Noble research now checks its informational HTTPS link and absence of wallet-action buttons; the production CSP lifecycle uses the current optional category radio tiles; and Showcase/Today checks use the accepted widget placement, heading and numeric Goal count. The full production browser run at `2c720bc3f75f3436ae4a7fb79c5a936ebddecf2f` reached all 358 desktop/mobile cases: 338 passed, 16 skipped, four failed. The original five failures were absent. Two failures were the same 320px caption-size issue; two were an older Today visual assertion in the third group. The latter passed 2/2 on both projects after the narrow correction at `1edb0373a14a31ccd533e803c75ab6b86d5117ab`. The exact before/after runs and remaining two named cases are in the linked report. The final full-suite and hosted Linux CI are not claimed green. Pinned final ordinary checks: 1,384 unit tests passed/1 skipped, typecheck exit 0, lint exit 0 with the existing `use-private-store.ts:44` warning; production build passed in the final focused browser run. Tomorrow: address the two 13.44px caption failures with an owner-approved design decision, run full desktop/mobile and hosted CI from the chosen source, then use the email helper only with the owner's private nonproduction provider details. No live email or sync was attempted here.
