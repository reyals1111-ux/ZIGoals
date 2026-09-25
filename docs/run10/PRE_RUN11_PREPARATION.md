# Pre-Run 11 preparation resume

Source branch: `codex/pre-run11-preparation`, based on verified `origin/main` `901e2a6600fb8292b7956717d45341f050fd377c` (merged PR20).

| Item | State | Next command or action |
| --- | --- | --- |
| PRE11-01 release/NovaVault | Complete; vault notes backed up and read back | Continue PRE11-02 |
| PRE11-02 offline checker | Complete locally; focused tests pass | Continue PRE11-03 |
| PRE11-03 email helper | Complete locally; LIVE_DELIVERY_NOT_RUN | Continue PRE11-04 |
| PRE11-04 current CI | Investigated; unresolved, no source correction justified | Isolate browser failures in Run 11 before changing limits |

Recovery: `.superpowers/pre-run11-recovery/source-901e2a6.tar.gz` is a source-only archive of deployed main. No preview or owner browser data was touched. No real email or physical sync was tested.

Offline setup checker: privately fill ignored `apps/web/.env.local` with `ZIGOALS_AUTH_ORIGIN`, `ZIGOALS_AUTH_PUBLIC_KEY`, `ZIGOALS_SYNC_ORIGIN`, `AUTH_PUBLIC_KEY`, and `ZIGOALS_OWNER_WORKER_CONFIG=workers/private-sync/wrangler.preview.owner.jsonc`. The owner Worker file must be ignored, mode 0600, and include an isolated name, HTTPS `vars.AUTH_ORIGIN`/`vars.APP_ORIGIN`, and the VAULTS SQLite binding/migration. No key goes in that Worker file. Run:

```sh
chmod 600 apps/web/.env.local workers/private-sync/wrangler.preview.owner.jsonc
node --env-file=apps/web/.env.local scripts/pre-run11-setup.mjs
```

This command only checks local shape and relationships. It never contacts providers, verifies packaged runtime exposure or establishes real email/physical encrypted sync. Missing services are expected today. Focused test: `node --test scripts/pre-run11-setup.test.mjs` (5/5).

Email-code helper: see [template and exact commands](PRE_RUN11_EMAIL_TEMPLATE.md). `node --test scripts/pre-run11-email.test.mjs` passed 6/6 offline. No real mail was sent and no provider user was created in this preparation job.

Current main [Milestone quality run 36166832282](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36166832282) at exact `901e2a6600fb8292b7956717d45341f050fd377c` was cancelled. Its `contract` job passed. The `web` job passed install, doctor, config/landing, lint/type/unit/build, audit and browser installation. The combined Playwright step started 17:26:04Z, reported 358 tests using two workers, emitted multiple `F` failure markers and one `T` timeout marker, then was cancelled 17:38:54Z near its 15-minute job limit. Later Alpha build/security/secret steps were skipped. The truncated cancellation log gives no reliable failed test names or assertion details. This is not evidence of a timeout-only issue; no CI limit was changed and no green quality gate is claimed. Next: run the browser suite with a reporter that preserves failed test names and diagnostics, repair the actual failures, then reconsider the job limit with evidence. Successful [Manual Alpha deployment 36167099005](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36167099005) is a separate gate.

Final local verification: 11/11 focused offline tests, direct ESLint on all four new script/test files, both script syntax checks, `git diff --check`, source archive hash and both vault read-back hashes passed. The isolated worktree has no installed workspace dependencies, so its full repository TypeScript command could not resolve application packages; the current main hosted web job had already passed its typecheck at the deployed source. No full application typecheck is claimed for this preparation branch.

NovaVault: `/Users/AIUSER/Documents/NovaVault/30-Projects/Personal AI Lab/ZIGoals/Project Map.md` SHA256 `c45b84bc6ef3aa272ada4b56344a0c33bebcd30b15eaa9abeb71164dffbebc0e`; `Release Evidence/Run 10 Actual Checkpoint.md` SHA256 `64d1918f1552f656cd5fd5d14967cf0397843e3cd5d4faa20ae84eec2ed22998`. Both have `.bak-20260925T193900Z` backups.
