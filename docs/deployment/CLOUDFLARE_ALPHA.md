# Public Alpha Worker operations

**Run #7 / V2.1: MERGED + DEPLOYED + OWNER-VERIFIED LIVE. PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE:** official [alpha.zigoals.app/app](https://alpha.zigoals.app/app), fallback [zigoals-alpha.reyals1111.workers.dev/app](https://zigoals-alpha.reyals1111.workers.dev/app). Owner-verified Worker `zigoals-alpha`, version `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80` at 100% traffic, source `d0ce4481bbe4be67356602be7106edc516239e8f`, app `0.1.0`. `PUBLIC_ALPHA_UNDEPLOYED` remains correct: web deployed, Goal Manager/Code ID **NOT DEPLOYED**; simulation + wallet connection only, no financial signing/broadcast. The apex Worker `zigoals` is separate; use its [own runbook](LANDING.md).

[Owner observations](../verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json) include real Keplr rejection/reconnection on both HTTPS origins under hosted CSP, no fee/arbitrary-message/financial signing prompt and no broadcast. The account showed 0 ZIG. This closes the M4 hosted-extension evidence limitation. It is **OWNER_VERIFIED_HOSTED_EXTENSION_EVIDENCE**, not a Playwright extension test. [M5 independent checks](../verification/m5/README.md) use a fresh browser context and fictional local data. Historical M4 results remain in [Run 4](../RUN_4_REPORT.md); its prepared state is no longer current web status.

## Root build and local validation

Use Node **24.19.0**, pnpm **11.19.0** and the frozen workspace lock. The adapter is `@opennextjs/cloudflare 1.20.6`, Wrangler `4.131.1`, Next `16.3.5`. Run from repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check:deploy-configs
pnpm --filter @zigoals/web build:alpha
WRANGLER_SEND_METRICS=false pnpm --filter @zigoals/web check:alpha
pnpm --filter @zigoals/web preview:alpha
```

`build:alpha` forces `PUBLIC_ALPHA_UNDEPLOYED` and records full source commit, package version and dirty status in `apps/web/.open-next/alpha-build.json`. Rebuild from the clean reviewed commit before publication; never publish a dirty build or use `--skipNextBuild`. The dry run does not upload. Preview binds loopback 8788 and uses actual workerd. No R2, database, Images, application analytics or paid resource provisioning is configured. ASSETS and a self-reference to `zigoals-alpha` are the only bindings. Config validation rejects target/path/route drift; it does not inspect private account configuration.

## Security and reload behavior

Dynamic rendering and middleware provide a fresh 32-byte Web Crypto nonce per response. Request nonce/CSP/origin headers are overwritten; Next applies the nonce to runtime scripts. HTML is private/no-store. Production scripts allow neither unsafe-inline nor unsafe-eval; connect-src permits same origin and only canonical Testnet RPC/REST. HSTS, no-referrer, nosniff, frame denial, noindex/noarchive and restricted browser permissions are present. CSS still permits inline style attributes used by React; this grants no script permission. Fonts and social image are local. Robots directives discourage indexing, not access.

The adapter supports edge middleware but not Node proxy; the known Next middleware-deprecation notice remains. Public/missing/unknown modes refuse financial preparation and signer/sign/broadcast boundaries independently of manifest shape. All live contract identifiers remain absent. Mock-injected browser tests verify app behavior and cannot prove extension compatibility with CSP.

The app uses explicit reconnect after reload. Local Demo remains the initial mode. A prior successful connection may leave a boolean sessionStorage hint to show **Reconnect Keplr**; it stores no account and grants no permission. No wallet method or transaction preparation runs on mount. Explicit Local demo removes the hint. Existing account/revision/tab isolation remains. Keplr may reuse permission or prompt when the user clicks; automatic restoration is avoided because [enable can unlock/request permission](https://docs.keplr.app/api/guide/enable-connection) and [getKey requires permission/unlocked state](https://docs.keplr.app/api/guide/get-key). The owner reverified real Keplr, reload/reconnect, Testnet diagnostics and 320px layout after the M6 deployment. `icon.svg` and `robots.txt` are direct static assets. Duplicate HSTS and X-Robots-Tag values on dynamic `/app` are a minor cleanup candidate, not a rollback issue.

## Hosting evidence and limits

The owner reports **Workers Paid** ($5/month + usage). [M5 baseline](../verification/m6/CPU_BASELINE.json) remains historical; [M6 post-deploy evidence](../verification/m6/OWNER_POST_DEPLOY.json) records the exact-version last-1h CPU P50/P90/P99/P99.9 **120/229/428/428ms**, 61 invocations, 12 asset requests, 100% cache hit, 0 subrequests, 0 errors and 0 `exceededCpu` events. The **2000ms** invocation CPU limit is present in deployed config but **not separately confirmed by dashboard/version view**. [Cloudflare CPU semantics](https://developers.cloudflare.com/workers/platform/limits/) distinguish CPU from network waiting and describe1102/`exceededCpu` failures. The cap is not a monthly budget or a guarantee that every legitimate request fits.

Controlled CPU: `/app` [524,42,33,28,42], median42ms; `/app/settings` [25,29,26,37,27], median27ms. `/icon.svg` produced no Worker invocation; five client HTTP200 requests plus cache-hit corroboration establish **asset bypass / Worker CPU N/A**. Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window. Bundle remains ~6.84% smaller. The [completed CPU comparison/checklist](CPU_OWNER_CHECKLIST.md) separates route medians, dashboard percentiles, Worker wall and client wall evidence. Housekeeping repeats no live measurement or deployment.

Cloudflare `cf-nel` reporting is infrastructure telemetry, not ZIGoals application analytics. Host/network operators can see IPs, request paths (including goal IDs) and public query identifiers. Local data is unencrypted and remains exposed to profile access, extensions and compromised same-origin code. See [privacy](../PRIVACY.md). Public DNS plus the read-only dashboard confirm web assignments and MX/SPF/DKIM presence, but cannot establish private email routing/forwarding or actual delivery; no email/DNS mutation or delivery test occurs in M5.

## Owner-only update and rollback

Use the [manual GitHub Actions Alpha workflow](MANUAL_ALPHA_WORKFLOW.md) for subsequent reviewed main deployments. It requires explicit owner dispatch and environment approval, retains the actual current rollback version before upload, and never deploys on merge. The local M6 commands below are historical guidance: always substitute the actual recorded rollback ID. Run #7/V2.1 was owner-verified with V1 rollback `af45987b-f792-4755-a9e6-f58bb49f0cfe`.

M6 rollout is complete. The following publication/rollback commands are retained for a **future separately approved owner operation**; this housekeeping does not execute them. After review, green CI and owner merge of that future update, choose a clean exact source and build/validate above. Inspect `alpha-build.json` for expected full commit, `dirty:false`, version and public mode. With an authenticated owner session, verify current account, deployment and known-good Alpha version:

```sh
pnpm --filter @zigoals/web exec wrangler whoami
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler versions view 00799604-7999-4ef4-b75f-268d8a459f6f --config wrangler.alpha.jsonc --name zigoals-alpha
```

The version above is the owner-verified M6 deployment at rollout closure. Reinspect current history and retain the actual last-good version before any future update; the historical pre-M6 version was `d37151a2-d6fd-4744-8b5c-ca4c3da4c433`. Confirm existing `alpha.zigoals.app` assignment is attached only to `zigoals-alpha`; config deliberately does not mutate routes/domains. The owner-only publish command from repository root is:

```sh
pnpm check:deploy-configs
pnpm --filter @zigoals/web exec opennextjs-cloudflare deploy --config wrangler.alpha.jsonc
```

Verify the isolated Worker name, source/version, both HTTPS Alpha origins, CSP, simulation, diagnostics and real Keplr behavior after update. Preserve the apex Worker, DNS/email and browser data. No default root/apex config, paid resource, broad route or automatic main build may substitute for the reviewed Alpha package.

To roll back, inspect and substitute the actual recorded `SAFE_ALPHA_VERSION_ID`, then target only Alpha:

```sh
pnpm --filter @zigoals/web exec wrangler versions view SAFE_ALPHA_VERSION_ID --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler rollback SAFE_ALPHA_VERSION_ID --config wrangler.alpha.jsonc --name zigoals-alpha
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
```

Recheck HTTPS and diagnostics. Do not delete the Worker or alter apex/email records to recover a frontend. Origins have separate browser storage; a rollback neither migrates nor erases plans. Financial contract deployment remains an entirely separate owner-approved process. [OpenNext integration](https://opennext.js.org/cloudflare/get-started) and [Cloudflare guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) explain packaging, not authorization.
