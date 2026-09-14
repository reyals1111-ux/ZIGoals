# M6 evidence index

**COMPLETED + MERGED + DEPLOYED + OWNER-VERIFIED LIVE.** Merged/live source `0c953a00d9f3e615289ae286549c74298b95dbdc`; Worker version `00799604-7999-4ef4-b75f-268d8a459f6f`. [OWNER_POST_DEPLOY.json](OWNER_POST_DEPLOY.json) records owner-confirmed deployment/browser/HTTP/dashboard observations plus ten saved sanitized CPU records rechecked during housekeeping. No independent live retest is claimed; unknown absolute observation times remain null.

Production `/app` CPU [524,42,33,28,42], median42ms; `/app/settings` [25,29,26,37,27], median27ms. `/icon.svg` has no Worker invocation, five HTTP200 client requests and cache-hit corroboration: **asset bypass / Worker CPU N/A**. Exact-version last-1h dashboard P50/P90/P99/P99.9 **120/229/428/428ms**, 61 invocations, 12 asset requests, 100% cache hit, 0 subrequests, 0 errors, 0 `exceededCpu` events. Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window. Bundle remains ~6.84% smaller.

Real Keplr/reconnect, Testnet diagnostics, 320px layout and CSP/security checks passed. Icon/robots are direct static assets. Alpha remains simulation + wallet connection only; Goal Manager/Code ID **NOT DEPLOYED**, no financial signing/broadcast. The 2000ms limit is present in deployed config but not separately confirmed by dashboard/version view. Duplicate HSTS and X-Robots-Tag values on dynamic `/app` are a minor cleanup candidate, not a rollback issue.

## Historical baseline and local implementation evidence

Baseline owner CPU is [CPU_BASELINE.json](CPU_BASELINE.json): exact live version/source, Workers Paid, tiny controlled samples and one-hour dashboard values. Missing observation time/Worker wall data remains null. No raw owner trace was collected or committed.

Local comparison uses clean baseline31430b75a257345025bff996c55b0f1447b34b31 (app matches starting main) and clean after0380e6a6b8b667709c5674c7abb22089674bc509. Node24.19.0, Next16.3.5, OpenNext1.20.6, Wrangler4.131.1, local macOS arm64. Independent fresh workerd processes on127.0.0.1:8791; first request `/app`, no HTTP warmup; five sequential requests per route in fixed order,200ms spacing. Same CLI SHA256 in both analysis records. Build, startup profile and timing batches ran separately. The after full browser tests/probes ran only after its timing batch.

| Local measurement | Before | After | Interpretation |
| --- | --- | --- | --- |
| `/app` median wall |14.188ms |22.834ms |Did not improve |
| `/app/settings` median wall |13.070ms |14.626ms |Did not improve |
| `/icon.svg` median wall |10.130ms |7.946ms |Small local reduction; asset bypass proven separately |
| First `/app` wall in fresh process |261.595ms |249.302ms |Both retain substantial first-request work |
| Worker bundle / gzip |9382.72 /1759.83KiB |8740.99 /1621.67KiB |~6.84% /7.85% smaller |
| Sampled local startup active |19.018ms (16samples) |17.429ms (15samples) |Sparse noisy proxy; not invocation CPU |
| Direct icon/robots assets |Absent |Present |No app Worker invocation required for matching assets |
| Next app-route runtime in server metafile |Present |Absent |Removal of metadata handlers also removes that runtime input |

No confidence intervals, causal proof for owner spikes or production CPU improvement is claimed. Wall time includes client/body/emulator overhead. Startup profiling imports the Worker entry and does not invoke the app fetch handler; lazy server import/route initialization remains a plausible source of first-request cost. Original source-map bytes in the baseline analysis are an inventory, not executed or emitted byte attribution.

- [Before wall](LOCAL_BASELINE_WALL.json) / [after wall](LOCAL_AFTER_WALL.json): every status, timing sample and aggregate.
- [Before analysis](LOCAL_BASELINE_ANALYSIS.json) / [after analysis](LOCAL_AFTER_ANALYSIS.json): exact build identities, bundle/startup and source inventory findings.
- [After routing](LOCAL_AFTER_ROUTES.json): icon/robots200 without nonce or HTML no-store, static security headers, HTML404 boundaries. `/icon%2Esvg` receives asset-router307; encoded subpath lookalikes404 retain CSP. No HTML files in direct assets.
- [Local verification](LOCAL_VERIFICATION.json):559JS,25Rust,46production browser,14workerd, full Chrome restart, build/dryrun/format/types/Clippy/schema/secret results and independent review. Historical final implementation-head CI is recorded in [Run 6 section 29](../../RUN_6_REPORT.md#29-ci-runs) and PR #6 checks; these totals are not new housekeeping runs.
- [Owner CPU checklist](../../deployment/CPU_OWNER_CHECKLIST.md): completed exact-version post-deployment comparison, retained sanitization procedure and strict missing-evidence handling.
- [Resume state](RESUME_STATE.md): rollout closure and next documented product gate. [Run report](../../RUN_6_REPORT.md) consolidates all deliverables.

## Reproduce locally (only when needed)

From repository root on the intended clean source, using pinned Node/pnpm:

```sh
pnpm --filter @zigoals/web build:alpha
WRANGLER_SEND_METRICS=false pnpm --filter @zigoals/web exec wrangler deploy --config wrangler.alpha.jsonc --dry-run --outfile /tmp/zigoals-m6-local.bundle
WRANGLER_SEND_METRICS=false pnpm --filter @zigoals/web exec wrangler check startup --config wrangler.alpha.jsonc --worker /tmp/zigoals-m6-local.bundle --outfile /tmp/zigoals-m6-local.cpuprofile
WRANGLER_SEND_METRICS=false pnpm --filter @zigoals/web exec wrangler dev --config wrangler.alpha.jsonc --ip 127.0.0.1 --port 8791
```

After the local Ready message, in another terminal run the following before visiting the preview or any readiness HTTP check. Store the sanitized result in a new file; never overwrite baseline evidence:

```sh
node scripts/measure-alpha-performance.mjs --base http://127.0.0.1:8791 --count 5 --interval-ms 200
```

Official command/source semantics and references are in [SSR/CSP analysis](../../architecture/M6_SSR_CSP_ANALYSIS.md). The saved startup profiles/bundles and full local test logs were temporary artifacts under `/tmp/zigoals-m6-*`; only safe summaries are tracked. Existing evidence is sufficient—do not rerun the whole benchmark merely to obtain more favorable numbers.
