# First Manual Alpha deploy on wrangler 4.144.0: owner checklist

> **Session S (2026-10-04): the pin is now 4.147.0.** The same checks apply to the first Manual Alpha deploy after that PR: the build log shows `⛅️ wrangler 4.147.0`; the deploy output and upload requests are unchanged from 4.144.0 (`scripts/fixtures/wrangler-output/4.147.0/`, captured offline); the Alpha bundle is byte-identical. Since 4.145.0 `wrangler login` asks for extra K2 scopes. In the ops checkout, `wrangler --version` must print 4.147.0.

Use this for the **first** Manual Alpha deployment after [PR #50](https://github.com/reyals1111-ux/ZIGoals/pull/50) merges (wrangler 4.131.1 → 4.144.0). Everything else follows [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) as usual. Nothing in the workflow file changed; only the pinned wrangler did.

## Before you dispatch
1. Main CI (Milestone quality) is green on the exact `main` SHA you will paste into `expected_commit`.
2. Note the live version from the latest STATUS deploy record. After deploy #14 it is **`48806961-9b29-41a5-a402-f24851d32e6f`**. If a later deploy happened first, use that record's new version instead.
3. Have the rollback commands below open, with that ID filled in.

## What to watch, step by step
**build job**
- **"Deployment config and regression gates"**: `pnpm test` now also runs `wrangler-cli-surface.test.mjs`, which calls `wrangler <command> --help` only, and the real-output tests in `alpha-deployment.test.mjs`. They must pass.
- **"Build and dry-run Alpha without deployment credentials"**: the log shows `⛅️ wrangler 4.144.0`.
  - Compare `Total Upload: … KiB / gzip: … KiB` with the value in the PR's STATUS entry: 13,560.94 KiB / gzip 2,625.33 KiB for the PR head.
  - A different app commit changes it a little. A jump of hundreds of KiB, or new modules or bindings in the dry-run output, is a reason to stop and ask.
  - The bindings table must still be exactly `env.WORKER_SELF_REFERENCE (zigoals-alpha)` and `env.ASSETS`.
- **"Pack the built Worker and record its hash"**: as before.

**deploy job** (after you approve the `alpha` environment)
- **"Capture current rollback version and validate live Alpha"**: this step uses the Cloudflare REST API, not wrangler, so it is unchanged. The logged rollback ID must be the ID you noted above.
- **"Recheck main and rollback, deploy only Alpha, verify rollout and HTTP security"**: this is the only step where wrangler talks to Cloudflare. Two things are new in 4.144.0; both were checked against a local mock API, never against Cloudflare.
  1. The script upload carries `code_update_strategy: {mode: "deferred", max_delay: 300}`. This affects only Durable Objects, and the Alpha has none. The server-side effect is **UNVERIFIED**, but nothing in this Worker should notice.
  2. After the upload, wrangler reads the Worker resource `GET /accounts/<id>/workers/workers/zigoals-alpha` for its workers.dev settings. It used to call `GET …/workers/scripts/zigoals-alpha/subdomain`. The token has account-wide Workers Scripts Read, which should cover it (4.136.1 made this change precisely to need fewer permissions).
     - **If this step fails with an authentication/permission error (for example code 10000) after "Uploaded zigoals-alpha", the new version may already be live.** The run then ends `NEEDS_OWNER_REVIEW` without a `deploy` output entry.
     - Do not re-run. Inspect it with `versions view` / `deployments list` below, then decide: roll back, or fix the token and dispatch fresh.
- **"Report version IDs even after failure"**: a correct report looks like this.
  ```
  - Result: **VERIFIED**
  - Worker: `zigoals-alpha`
  - Reviewed source: `<the full main SHA you dispatched>`
  - New version ID: `<a new UUID, not 48806961-…>`
  - Rollback version ID: `48806961-9b29-41a5-a402-f24851d32e6f`
  - Last observed live version: `<the same UUID as New version ID>`
  ```
  - Any other result, a `NOT_CONFIRMED` new ID, or a rollback ID other than the one you noted: go to **Rollback** before anything else.
  - The new ID comes from wrangler's output file. Its `deploy` entry keeps the same fields in 4.144.0; this is pinned against real output in `scripts/fixtures/wrangler-output/`.
- Then do your usual browser checks: appearance, real Keplr, reload to Local Demo, reconnect, Habit/Health persistence, mobile.

## Rollback (ready to paste)
Run these from a clean checkout of the **same** `main`, after `pnpm install --frozen-lockfile`, with owner credentials:
```sh
ROLLBACK_VERSION_ID=48806961-9b29-41a5-a402-f24851d32e6f   # the ID the run logged as rollback
pnpm --filter @zigoals/web exec wrangler versions view "$ROLLBACK_VERSION_ID" --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler rollback "$ROLLBACK_VERSION_ID" --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
node scripts/alpha-deploy.mjs smoke
```
- `rollback` in 4.144.0 has one new optional flag, `--durable-objects-code-update-mode`. Leave it out; the Alpha has no Durable Objects.
- If you suspect the new wrangler itself, run the same commands from the pre-upgrade commit. `git switch --detach 39fdcf0` (main before this PR) then `pnpm install --frozen-lockfile` gives wrangler 4.131.1 again.

## The ops checkout (activation Stage 7)
The Stage 4 private configs and dry runs were made from an ops checkout with wrangler 4.131.1. Before Stage 7 uses wrangler there (`secret put`, the first deployments or migrations of the private Workers), update that checkout:
```sh
git switch main && git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @zigoals/web exec wrangler --version   # must print 4.144.0
node scripts/run11/activation-check.mjs --private
```
Then repeat the Stage 7 local dry runs with the new wrangler before approving anything. The private Workers **do** use Durable Objects, so 4.144.0 sends the `code_update_strategy` above with their deployments; see "DO migrations and bindings" in [WRANGLER_UPGRADE_ASSESSMENT.md](WRANGLER_UPGRADE_ASSESSMENT.md). Their first deployment creates new Workers, so no live instance exists to defer to.
