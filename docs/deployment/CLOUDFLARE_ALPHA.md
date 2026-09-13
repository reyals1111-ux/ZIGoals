# Isolated public Alpha on Cloudflare

The Next16.3.5 application is packaged using pinned `@opennextjs/cloudflare1.20.6` and `wrangler4.131.1`. This is a separate `zigoals-alpha` Worker, with no routes, custom domains, R2, database, images, analytics or paid resource provisioning. The existing apex Worker and email/DNS configuration are outside this package. Only the release controller may publish after the release gates; these instructions do not authorize chain deployment or wallet signing.

## Build and local validation

Use the repository's Node24.19.0 and pnpm11.19.0. From the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @zigoals/web build:alpha
pnpm --filter @zigoals/web check:alpha
pnpm --filter @zigoals/web preview:alpha
```

`build:alpha` unconditionally selects `PUBLIC_ALPHA_UNDEPLOYED` and records the exact Git commit, package version and dirty status in `apps/web/.open-next/alpha-build.json`; the rendered diagnostics also contain that identity. Rebuild from the clean reviewed commit before publication. Never publish a dirty build or use `--skipNextBuild`. `check:alpha` is a non-uploading Wrangler dry run; `preview:alpha` binds loopback port 8788 and runs the actual workerd runtime. These commands do not publish/upload code or mutate chain, R2 or account state.

The wrapper runs the ordinary Next build through the adapter; canonical Wasm workflows are unchanged. Public mode blocks preparation, signer acquisition, signing and broadcasting even if a structurally valid deployed manifest is supplied. Missing and invalid build modes fail closed. Simulation and explicit wallet connection/read-only verification remain available. Test fixtures can stub the mode module; production has no runtime bypass flag.

## Browser security and compatibility

The installed Next docs require dynamic rendering for per-response nonces. The root layout awaits `connection()`. Edge `middleware.ts` generates 32 random bytes with Web Crypto, overwrites incoming nonce/CSP headers, applies nonce CSP to request and response, and returns private/no-store HTML. Next applies the nonce to runtime scripts. Legacy middleware produces a known Next deprecation warning; it is retained because the adapter supports edge middleware but does not support Node proxy. This is a deliberate compatibility boundary, not a framework migration.

Production scripts have neither unsafe-inline nor unsafe-eval. Connections allow same origin and only the canonical ZIGChain Testnet RPC/REST origins. Frames, objects and base URLs are denied. Security headers include no-referrer, nosniff, restricted browser permissions, frame denial, noindex/noarchive and HSTS for HTTPS responses. CSS allows inline styles because existing React progress bars and component styles use style attributes; that exception cannot authorize scripts. Fonts and the static social PNG are local; the SVG source is retained. Robots disallows crawling; this is discovery control, not access control.

Local Chrome tests on workerd verify fresh nonce headers, dynamic rendering/navigation, untrusted HTML-response script rejection, local goal creation/deposit/withdraw/close, backup import/export, diagnostics with clipboard fallback, narrow safe-field copying, no sentinel in request URLs/headers/bodies, keyboard focus and 320px/reduced-motion layout. Goal IDs in `/app/goals/<id>` remain visible to hosting; private names/targets/notes do not belong in URLs. Wallet mocks installed through Playwright `addInitScript` test the app injection boundary only; they bypass CSP and do not establish real Keplr extension compatibility. The controller records actual extension detection separately, without signing.

## Evidence and resource limits

Initial local probe: Next production build and OpenNext packaging succeeded; workerd browser security/lifecycle checks passed; Wrangler dry run reported 8707.06 KiB uncompressed / 1616.54 KiB gzip and only ASSETS+self-reference bindings. Figures are a measured probe, not a final artifact identity or deployment claim. Final clean build and hosted checks must be recorded by the controller. A cold local production `/app` browser sample loaded 292772 compressed JavaScript bytes versus 577954 before lazy signing-transport imports. No synthetic performance score or hosted latency/CPU claim is made.

Current official Workers limits allow 64 MiB uncompressed Worker code; Free has 100,000 requests/day, 10 ms CPU per invocation, 128 MB memory and 1 second startup. Dynamic uncached SSR consumes a Worker invocation per HTML request and can exceed the free CPU budget. Local wall time and successful dry run do not prove hosted CPU suitability. If the free hosted preview fails, retain PREPARED_NOT_DEPLOYED and report the error; do not activate paid service or weaken CSP/caching guarantees.

New packages use npm integrity-pinned lock entries. Installation scripts were disabled for installation; `allowBuilds` explicitly denies esbuild/workerd/unrs-resolver scripts. Their optional platform packages supplied working binaries for the local build and preview. workerd/esbuild install fallbacks can invoke npm/download platform binaries; they remain disabled. Both production and full dependency audits returned zero advisories during this probe; this is a dated advisory snapshot, not a security guarantee. Added adapter build dependencies materially expand the trusted build toolchain, including OpenNext AWS helpers/minifiers despite no AWS deployment.

## Owner publication and rollback

After local, hosted CI and independent review gates pass, inspect `wrangler.alpha.jsonc`, the exact source commit and `alpha-build.json`. Publish only through an authenticated owner-controlled flow explicitly targeting this isolated config. Do not substitute root Wrangler settings. Verify actual HTTPS CSP/HSTS/no-store/noindex, version/commit/mode, navigation, diagnostics, no signing and real extension detection before considering a separate Alpha hostname. Leave apex, MX/SPF/DKIM/DMARC and all existing routes untouched. For rollback, disable or revert only the isolated Alpha Worker/its optional Alpha hostname; preserve browser data and do not alter chain state.

Official references: [manual OpenNext integration](https://opennext.js.org/cloudflare/get-started), [adapter support](https://opennext.js.org/cloudflare), [Cloudflare OpenNext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/). Package-local Next CSP and middleware docs were read before implementation.

RPC integer bounds follow generated CosmWasm Uint64/Uint128 fields and the [Cosmos SDK 256-bit bank integer](https://github.com/cosmos/cosmos-sdk/blob/main/math/int.go). Amounts must be canonical decimal strings, never coerced numbers. Goal pages cap at 100 and enforce strictly increasing numeric IDs across page cursors.

Hosted quality CI pins public mode for the ordinary production-browser suite, then builds the adapter package, performs a non-uploading dry run and runs desktop/mobile Alpha security plus diagnostics tests on workerd. The job retains contents:read only; publication remains a separate owner action.

## Exact owner-only publish path

Working directory is the repository root, never `landing/`. With an authenticated owner session and all reviewed gates passed, rebuild clean, inspect `apps/web/.open-next/alpha-build.json` (PUBLIC_ALPHA_UNDEPLOYED, expected full commit, dirty:false), then the owner may run:

```sh
pnpm --filter @zigoals/web exec opennextjs-cloudflare deploy --config wrangler.alpha.jsonc
```

This command is documented only; the implementer did not execute it. The config resolves within `apps/web`, pins the isolated `zigoals-alpha` name and has no routes or custom domains. Never use the root apex deploy command. If CLI authentication is unavailable, the owner must complete authentication or explicitly configure an isolated Workers project in the Cloudflare UI with root `/` (repository root), build `pnpm --filter @zigoals/web build:alpha`, deploy `pnpm --filter @zigoals/web exec opennextjs-cloudflare deploy --config wrangler.alpha.jsonc`, and the reviewed feature commit/branch. Repository dependency installation still requires the workspace root lockfile. Do not let a default-main build substitute for the reviewed feature; do not enable any paid resources. If those settings cannot be verified, stay PREPARED_NOT_DEPLOYED. For an initial faulty publication, disable workers.dev for this isolated Worker or roll its deployment back in its own Deployments view; do not delete or change the apex Worker.

NextURL normalizes loopback 127.0.0.1 to localhost in local metadata. Hosted social metadata derives its origin from the served request URL through a middleware-overwritten header; it never accepts a caller-supplied metadata origin header. No public origin is invented at build time.

## M4 observed publication status

**PREPARED_NOT_DEPLOYED.** No Alpha URL or deployment ID was created. The exact clean0f6f023 package passed local workerd tests and a dry run:9361.11 KiB raw/1753.55 KiB gzip,32 assets. See [publication evidence](../verification/m4/PUBLICATION.json) and [current report](../RUN_4_REPORT.md) for final integrated checks. The first probe numbers above remain labelled historical measurements.

Direct Cloudflare dashboard access later failed because the browser could not verify its admin-enforced policy; normal retry confirmed that block. The installed Wrangler CLI reported loggedIn:false. No OAuth/login, token creation, deployment or workaround was attempted. The separate existing apex Worker remains unchanged; its latest automatic build was already failed before this run while its manual deployment remained live. No DNS/mail setting was changed and no mail-delivery test was performed.

The minimal owner path is to review the PR, choose a clean reviewed commit, complete Cloudflare authentication personally, then use the isolated build/check/deploy commands above. To authenticate the pinned CLI, the owner may run `pnpm --filter @zigoals/web exec wrangler login`, inspect the requested account permissions, and confirm the intended account using `pnpm --filter @zigoals/web exec wrangler whoami`. Never paste credentials in chat. Authentication is not evidence that the package passed live HTTPS/CPU tests.

The initial new-Worker GitHub form inspected in this run did not offer a production-branch selector. For the UI route, the simplest reviewed-source path is after the owner's PR merge, when main contains these commands/config. Do not submit the unmodified default project name (`zigoals`), accidentally deploy the apex config or assume an initial form selected the feature branch. Use only `zigoals-alpha`, disable nonproduction automatic builds for deliberate publication, retain existing email records, and keep the custom Alpha hostname unbound until the isolated HTTPS preview passes the checklist. If those controls cannot be verified, stop before upload and keep prepared status.
