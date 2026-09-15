# Owner-run Alpha deployment

The **Manual Alpha deployment** workflow builds and publishes only `zigoals-alpha`. It runs only after a manual dispatch by `reyals1111-ux`, an explicit approval checkbox, and approval of the protected `alpha` environment. Merging a PR never deploys. This workflow does not issue a contract candidate or run contract, chain, mainnet, apex, DNS or email operations.

## Current baseline and authority

Run #7 / V2.1 is **MERGED + DEPLOYED + OWNER-VERIFIED LIVE**, per the owner's [Strategy continuation](chatgpt-conversation://6aa48a36-f198-83ed-a195-c95f8640afce). [PR #9](https://github.com/reyals1111-ux/ZIGoals/pull/9) merged at `d0ce4481bbe4be67356602be7106edc516239e8f`; the owner reported Alpha version `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80` at 100%, with previous V1 rollback `af45987b-f792-4755-a9e6-f58bb49f0cfe`. The owner confirmed visual, real Keplr connect/reload/reconnect, Habit and Health persistence, and mobile checks. These are owner-supplied rollout observations, not a deployment performed while adding this workflow.

Those IDs are historical reference points. Every dispatch reads the actual current live deployment and verifies that its sole version has 100% traffic before retaining it as the new rollback target. `PUBLIC_ALPHA_UNDEPLOYED` remains the required build mode because Goal Manager / Code ID remain absent. Financial signing and broadcasts remain disabled.

## One-time owner setup

The initial repository inspection found no GitHub environments. Workflow code cannot create a protected environment or supply Cloudflare credentials. Complete setup before the first dispatch; the authorization job fails closed if any required protection is missing or unreadable.

1. In repository **Settings → Environments**, create **alpha**.
2. Set **Required reviewers** to the user **reyals1111-ux only**. Leave **Prevent self-review** off: the sole owner dispatches and approves. Disable **Allow administrators to bypass configured protection rules**.
3. Under **Deployment branches and tags**, choose **Selected branches and tags**. Add exactly one **branch** policy, `main`; add no tag policies or wildcards.
4. In this environment, create the variable **CLOUDFLARE_ALPHA_ACCOUNT_ID** with the existing Alpha account's 32-character ID.
5. Create the environment secret **CLOUDFLARE_ALPHA_API_TOKEN**. Use a dedicated Cloudflare API token with **Account / Workers Scripts / Edit**, limited to the account containing the existing Alpha. Grant no DNS, Email, Zone/Workers Routes, R2, D1 or other provisioning permissions. Do not use a Global API Key or copy a broad owner token. Keep this secret at environment scope, with no repository/organization duplicate of the same name.
6. Keep `alpha.zigoals.app` assigned to the existing `zigoals-alpha` Worker in Cloudflare. The checked-in config deliberately has no route/domain declarations. Do not enable Cloudflare Builds or a second deploy-on-merge integration. Verify existing account integrations separately before first use.

The Workers Scripts permission is an account-level authority; this workflow's fixed target and strict configuration checks provide the Worker selection boundary. Do not describe the token as cryptographically restricted to a single Worker. Review changes to deployment code and workflows before merging. Only reviewed main code runs with this authority, and the token is passed only to rollback capture and publication steps. Dependency installation, tests, build and dry run have no Cloudflare token.

GitHub documents [environment reviewer/branch protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) and [environment API access](https://docs.github.com/en/rest/deployments/environments). The workflow's GitHub token has `contents: read` and `actions: read`; it has no repository write, OIDC or attestation permission.

## Every deployment

1. Review and merge the intended change using the existing owner-controlled process. Check the normal main CI is green. Copy the **full current main commit SHA** from GitHub.
2. Open **Actions → Manual Alpha deployment → Run workflow**. Select the **main** branch, paste the full SHA into `expected_commit`, and check `owner_approval` only when approving that exact source for Alpha. There is no target, command, hostname or environment input.
3. The authorization job checks owner identity, manual event, main ref, full SHA, current remote main and the configured environment protections. Review its summary and approve the **alpha** environment as the owner.
4. The approved job checks main again, installs Node **24.19.0** and pnpm **11.19.0**, uses the frozen lockfile with lifecycle scripts disabled, and runs deployment config validation, lint, TypeScript and JS tests. It builds Alpha with OpenNext and runs the existing Wrangler Alpha dry run.
5. The build identity must contain the exact reviewed SHA, current app version, `dirty:false` and `PUBLIC_ALPHA_UNDEPLOYED`. The source tree must be clean, including untracked files. The strict manual configuration envelope rejects all unexpected fields, including routes, environments, extra bindings, build hooks, telemetry or CPU/asset drift.
6. The workflow captures the current deployment/version through the [Cloudflare deployment API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/), confirms the version exists, and checks live Alpha health. Missing state, split traffic, unexpected responses or an unhealthy baseline stop publication. It logs the rollback ID and uploads the rollback evidence **before any upload**.
7. After that artifact succeeds, publication rechecks the owner/environment protections, source/build identity, current remote main and unchanged rollback deployment. It executes exactly one fixed command: `pnpm --filter @zigoals/web exec opennextjs-cloudflare deploy --config wrangler.alpha.jsonc --name zigoals-alpha`.
8. The workflow reads the new version from pinned Wrangler's structured output and checks that Cloudflare serves that exact version at 100%. It checks official Alpha routes, HTTP 200 without redirects, HTML security headers, per-response script nonces, V2.1 Today/Local Demo content, and the expected full build SHA plus public safety mode on Settings. It then confirms the deployment did not change during smoke checks.
9. Read the Actions summary and download **alpha-deployment-RUN_ID-ATTEMPT**. It records `newVersionId`, `rollbackVersionId`, exact source, deployment IDs, smoke result and status. The earlier **alpha-rollback-RUN_ID-ATTEMPT** artifact survives even if publication is interrupted. Both retain evidence for 90 days; save it outside Actions for longer retention.
10. Complete the short owner browser check: appearance, real Keplr, reload to Local Demo, explicit reconnect, Habit/Health persistence and mobile. Automated HTTP checks do not verify extension interaction or browser storage. Record owner acceptance separately.

The checked routes are `/app`, `/app/habits`, `/app/health`, `/app/goals`, `/app/goals/new`, `/app/activity`, `/app/ecosystem` and `/app/settings`, plus a repeated `/app` request for nonce freshness. Smoke GETs target only `https://alpha.zigoals.app`; no wallet, personal browser profile, test data, chain request or apex request is involved. Identical duplicate HSTS/X-Robots-Tag values remain accepted; the existing CSP/nonce architecture is unchanged.

## Failures and recovery

- **Before publication:** a failure blocks upload. Correct the setup or source, then use a new manual dispatch with the reviewed current main SHA. A changed main never silently substitutes newer source.
- **After an upload is attempted:** a nonzero CLI exit, timeout, missing structured output, different live version or failed smoke leaves **NEEDS_OWNER_REVIEW**. A forcibly interrupted runner may leave **DEPLOYMENT_ATTEMPTED**. Either can mean the upload is already live. Do not blindly rerun; inspect Cloudflare deployment history and both evidence artifacts first.
- **New version NOT_CONFIRMED:** the CLI did not provide a trustworthy new ID. `observedLiveVersionId` is only an observation and is never attributed to this run as a successful deployment. Rollback evidence remains the previously captured version.
- **No automatic rollback or retry:** the owner decides recovery after inspecting the live state. Rerunning an old Actions run is rejected; use a fresh dispatch after resolving the cause.
- **Concurrency:** the whole workflow uses a fixed `zigoals-alpha-deployment` group with cancellation disabled. GitHub may replace a pending run when a newer dispatch arrives. This does not lock a human's local Wrangler command or another external integration. Avoid concurrent manual deployments. Main and Cloudflare checks are fresh reads, not an atomic cross-service transaction; an external change in the final request window remains possible and post-deploy verification detects discrepancies it observes.

For owner-approved rollback, set `ROLLBACK_VERSION_ID` to the actual ID saved by this run, inspect that version, then run these commands from a clean local checkout with the pinned toolchain and owner credentials:

```sh
pnpm --filter @zigoals/web exec wrangler versions view "$ROLLBACK_VERSION_ID" --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler rollback "$ROLLBACK_VERSION_ID" --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
node scripts/alpha-deploy.mjs smoke
```

Inspect the live version, then repeat the owner browser checks. A frontend rollback does not erase or migrate browser-local data. Never delete/recreate the Worker, change domains, or use a contract release workflow to recover Alpha.

## Local validation without publication

```sh
pnpm exec vitest run scripts/alpha-deployment.test.mjs scripts/check-deployment-configs.test.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm check:deploy-configs
pnpm --filter @zigoals/web build:alpha
pnpm --filter @zigoals/web check:alpha
```

Use `actionlint .github/workflows/deploy-alpha.yml` to validate Actions syntax. The optional `node scripts/alpha-deploy.mjs smoke` performs only the public HTTP checks. It does not validate a new deployment's source unless called by the publication coordinator with the expected SHA. The coordinator's tests inject the external upload/read boundary; no test deploys, rolls back, contacts a wallet or changes Cloudflare.
