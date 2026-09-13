# Landing Worker operations

The static landing page and the application Alpha are separate Cloudflare Workers. `landing/wrangler.jsonc` names the apex Worker `zigoals`; `apps/web/wrangler.alpha.jsonc` names the application Worker `zigoals-alpha`. The apex may serve only `zigoals.app`, and Alpha may serve only `alpha.zigoals.app`. Never substitute one config, Worker name, route, or version for the other.

## Local validation

Run these commands from the repository root. They use the checked-in Wrangler 4.131.1 dependency from `@zigoals/web`; no global Wrangler installation is used.

```sh
pnpm check:deploy-configs
WRANGLER_SEND_METRICS=false pnpm check:landing
```

`check:deploy-configs` reads both repository configs without network access and fails on a target, path, route, binding, or static-asset isolation mismatch. `check:landing` is the canonical apex dry run. It compiles and inspects the static upload without contacting the deployment API or changing Cloudflare. Wrangler reports three directory entries before ignore filtering; `.assetsignore` and `wrangler.jsonc` are ignored, leaving only `index.html` in the upload manifest. For a local audit of those decisions, set `WRANGLER_LOG=debug` and direct `WRANGLER_LOG_PATH` to a scratch file outside `landing/`.

## Owner-only deployment

The following commands mutate or inspect the owner’s Cloudflare account. They are documented for an authenticated owner and were not run while preparing this change. Keep the explicit config path and Worker name on every Worker/version command. Before an upload, verify the authenticated account, inspect the current deployment, and record its known-good version ID for rollback:

```sh
pnpm --filter @zigoals/web exec wrangler whoami
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler versions list --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler versions view SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
```

Stop if the account, Worker name, current version, or existing apex assignment is unexpected. The repository config deliberately contains no route or custom-domain mutation, so confirm that the existing `zigoals.app` assignment is already attached to `zigoals` before continuing. After reviewing the dry-run manifest and the exact source commit, the owner may publish only the static apex Worker:

```sh
pnpm --filter @zigoals/web exec wrangler deploy --config ../../landing/wrangler.jsonc --name zigoals --strict
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
```

Verify `https://zigoals.app/` and the CTA links after publication. This procedure does not publish `zigoals-alpha`, add routes, change DNS or email records, sign a release, or authorize any chain upload.

## Rollback

Choose the previously recorded known-good apex version, inspect it again, and roll back only `zigoals`:

```sh
pnpm --filter @zigoals/web exec wrangler versions view SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler rollback SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
```

Recheck the apex and CTA links. Do not delete the Worker, change its domain or DNS assignment, or roll back `zigoals-alpha` as part of apex recovery.
