# Pre-Run 11 preparation resume

Source branch: `codex/pre-run11-preparation`, based on verified `origin/main` `901e2a6600fb8292b7956717d45341f050fd377c` (merged PR20).

| Item | State | Next command or action |
| --- | --- | --- |
| PRE11-01 release/NovaVault | Complete; vault notes backed up and read back | Continue PRE11-02 |
| PRE11-02 offline checker | Complete locally; focused tests pass | Continue PRE11-03 |
| PRE11-03 email helper | Complete locally; LIVE_DELIVERY_NOT_RUN | Continue PRE11-04 |
| PRE11-04 current CI | Pending | Inspect current main quality gate once, last |

Recovery: `.superpowers/pre-run11-recovery/source-901e2a6.tar.gz` is a source-only archive of deployed main. No preview or owner browser data was touched. No real email or physical sync was tested.

Offline setup checker: privately fill ignored `apps/web/.env.local` with `ZIGOALS_AUTH_ORIGIN`, `ZIGOALS_AUTH_PUBLIC_KEY`, `ZIGOALS_SYNC_ORIGIN`, `AUTH_PUBLIC_KEY`, and `ZIGOALS_OWNER_WORKER_CONFIG=workers/private-sync/wrangler.preview.owner.jsonc`. The owner Worker file must be ignored, mode 0600, and include an isolated name, HTTPS `vars.AUTH_ORIGIN`/`vars.APP_ORIGIN`, and the VAULTS SQLite binding/migration. No key goes in that Worker file. Run:

```sh
chmod 600 apps/web/.env.local workers/private-sync/wrangler.preview.owner.jsonc
node --env-file=apps/web/.env.local scripts/pre-run11-setup.mjs
```

This command only checks local shape and relationships. It never contacts providers, verifies packaged runtime exposure or establishes real email/physical encrypted sync. Missing services are expected today. Focused test: `node --test scripts/pre-run11-setup.test.mjs` (5/5).

Email-code helper: see [template and exact commands](PRE_RUN11_EMAIL_TEMPLATE.md). `node --test scripts/pre-run11-email.test.mjs` passed 6/6 offline. No real mail was sent and no provider user was created in this preparation job.

NovaVault: `/Users/AIUSER/Documents/NovaVault/30-Projects/Personal AI Lab/ZIGoals/Project Map.md` SHA256 `c45b84bc6ef3aa272ada4b56344a0c33bebcd30b15eaa9abeb71164dffbebc0e`; `Release Evidence/Run 10 Actual Checkpoint.md` SHA256 `64d1918f1552f656cd5fd5d14967cf0397843e3cd5d4faa20ae84eec2ed22998`. Both have `.bak-20260925T193900Z` backups.
