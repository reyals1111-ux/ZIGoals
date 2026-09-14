# M6 owner CPU results and repeatable verification

**COMPLETED + MERGED + DEPLOYED + OWNER-VERIFIED LIVE.** The owner deployed merged source `0c953a00d9f3e615289ae286549c74298b95dbdc` as Worker version `00799604-7999-4ef4-b75f-268d8a459f6f` and completed the live checks: nonce/security headers, real Keplr, Local Demo after reload, explicit reconnect, Testnet diagnostics and 320px layout. Alpha remains simulation + wallet connection only; Goal Manager/Code ID **NOT DEPLOYED**, no financial signing/broadcast. [Sanitized post-deploy evidence](../verification/m6/OWNER_POST_DEPLOY.json) records the results; this housekeeping did not repeat production requests or deploy. The procedure below is retained for a future separately approved measurement, not an outstanding M6 step.

## Pin the version before comparing

Worker **zigoals-alpha**, URL **https://alpha.zigoals.app/app**. Baseline version **d37151a2-d6fd-4744-8b5c-ca4c3da4c433**, source **01ebf00f7a177ab86fb41b52164fa7f5320f644c**. Do not substitute apex Worker `zigoals` or an aggregate over older versions. From repository root, Node24.19.0/pnpm11.19.0 and an authenticated owner Wrangler session:

```sh
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
M6_WORKER_VERSION='00799604-7999-4ef4-b75f-268d8a459f6f'
pnpm --filter @zigoals/web exec wrangler versions view "$M6_WORKER_VERSION" --config wrangler.alpha.jsonc --name zigoals-alpha
```

For any repeat, confirm the active deployment uses the selected exact version at 100%, source matches the owner's clean merged build (`alpha-build.json`) and public mode is unchanged. M6's 2000ms limit is present in deployed config but was not separately confirmed by dashboard/version view; an omitted field there is not independent confirmation. Stop comparisons if there is a mixed rollout, wrong version/source or uncertain identity. These read-only commands do not deploy or change settings.

In Workers & Pages → **zigoals-alpha** → Metrics, choose **last one hour** and the exact deployed version. Record the observation window, plan=Workers Paid, P50/P90/P99 (P99.9 if available), invocation count, asset requests/cache hit, errors and error rate. Inspect Errors → Invocation Statuses for **Exceeded CPU Time Limits**/`exceededCpu`, memory and other failures. Do not enable paid observability or add resources. Save only the numbers and version, not dashboard screenshots with account/client details.

## Controlled tail, sanitized before any file write

The sanitizer is offline and never authenticates or creates a tail. In terminal A, from repository root, set the exact UUID above, then:

```sh
set -o pipefail
M6_CAPTURE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/zigoals-m6-cpu.XXXXXX")
chmod 700 "$M6_CAPTURE_DIR"
WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false WRANGLER_LOG_SANITIZE=true WRANGLER_LOG=error \
  pnpm --filter @zigoals/web exec wrangler tail zigoals-alpha \
  --config wrangler.alpha.jsonc --version-id "$M6_WORKER_VERSION" --method GET --ip self --format json \
  | node scripts/sanitize-alpha-tail.mjs "$M6_WORKER_VERSION" > "$M6_CAPTURE_DIR/cpu.sanitized.ndjson"
```

Never add `tee`, raw redirection, debug logging or `2>&1`. Wrangler4.131.1 JSON events are read directly in memory; `WRANGLER_WRITE_LOGS=false` disables its debug-file writer. The sanitizer emits only fixed routes, numeric CPU/wall/status, known outcome, exact version and UTC hour. Headers/IP/TLS/location/logs/exceptions/private paths are discarded. Schema-missing CPU/wall remains `null`, not zero. Errors are generic. Invalid input stops capture; only already-sanitized preceding records may remain. Limits:90seconds,60matching records,10MiB input and1,048,576characters per event. It never persists raw traces. Stop the tail with Ctrl-C after terminal B completes; an interrupted tail exit is expected, but validate every saved record and count before using it.

In terminal B, from the same clean repository, make exactly five sequential GETs to each route:

```sh
M6_WALL_FILE=$(mktemp "${TMPDIR:-/tmp}/zigoals-m6-wall.XXXXXX")
node scripts/measure-alpha-performance.mjs --base https://alpha.zigoals.app --count 5 --interval-ms 200 > "$M6_WALL_FILE"
```

That is15requests total to `/app`, `/app/settings`, `/icon.svg`, no warmup/redirect/credentials. It saves **client wall time**, not Cloudflare CPU, with statuses and arithmetic median/nearest-rank p90/p95. `ok` must be true. Do not retry failures away; retain partial/failed results, inspect the error and label any new batch separately. Keep the browser idle during capture. `--ip self` must resolve the same egress IP in both terminals; if it does not, no samples is missing evidence. Do not widen it to unrelated client traffic to make a test pass.

Check matching version/outcome/status and route counts in the sanitized file. Expect five Worker samples per dynamic route when capture is complete. A direct asset may produce **no Worker invocation event** for `/icon.svg`: verify its five HTTP200 wall records, direct asset package/routing and dashboard asset metrics; mark its Worker CPU as **N/A (asset bypass)** only with that corroboration. Absence of tail events alone proves neither bypass nor zero CPU. If timing fields are absent in the installed tail schema, record them as unavailable and use version-specific dashboard CPU; do not infer CPU from wall time or raw metadata. No raw trace export is needed as a fallback.

## Completed owner comparison

| Measurement | BASELINE (owner supplied; small sample) | M6 DEPLOYMENT (owner-verified live) |
| --- | --- | --- |
| Exact version | d37151a2-d6fd-4744-8b5c-ca4c3da4c433 | 00799604-7999-4ef4-b75f-268d8a459f6f |
| Source | 01ebf00f7a177ab86fb41b52164fa7f5320f644c | 0c953a00d9f3e615289ae286549c74298b95dbdc |
| Plan / configured CPU cap | Workers Paid / not recorded | Workers Paid / 2000ms in deployed config; not separately confirmed by dashboard/version view |
| Exact-version last-1h P50/P90/P99/P99.9 | ~67.98/160/200/200ms | 120/229/428/428ms |
| Invocations / asset requests | 79/74 | 61/12 |
| Asset cache hit / subrequests / errors | 100% / 0 / 0 | 100% / 0 / 0 |
| `/app` CPU samples; median | [539,26,34,285,23]; 34ms | [524,42,33,28,42]; 42ms |
| `/app/settings` CPU; median | [32,18,19,16,18]; 18ms | [25,29,26,37,27]; 27ms |
| `/icon.svg` CPU; median | [60,29,12,9,6]; 12ms | No Worker invocation; asset bypass / Worker CPU N/A |
| `/icon.svg` bypass corroboration | Invoked Worker | Five HTTP 200 client requests, direct asset routing, cache HIT and dashboard asset metrics |
| Controlled Worker wall arrays | Not supplied | `/app` [562,60,34,29,43]ms; `/app/settings` [35,34,29,38,28]ms; icon N/A |
| Client wall arrays | Not supplied for owner's CPU batch | Not retained in this record; separate metric, not reconstructed from Worker wall |
| CPU-limit/other errors | 0 observed | 0 `exceededCpu`; 0 errors |

All ten sanitized dynamic records have HTTP 200 and outcome `ok`, rounded UTC hour `2026-09-14T19:00:00.000Z`. The dashboard's absolute start/end were not supplied; retain its exact-version **last 1 hour** label without inventing timestamps. Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window. Bundle remains ~6.84% smaller. Do not treat the icon's N/A as 0ms or combine dashboard percentiles with controlled-route medians. Duplicate HSTS and X-Robots-Tag values on dynamic `/app` are a minor cleanup candidate, not a rollback issue.

The dashboard and controlled samples have different sampling windows. Five requests cannot establish tail risk, confidence intervals, or a production guarantee. A2s cap protects against long CPU use per invocation, not aggregate monthly spend; it is not a wall timeout. Cloudflare has occasional over-limit flexibility and can return1102/`exceededCpu`. If normal use hits the cap or any security/reconnect behavior regresses, pause further rollout and use the separately authorized owner recovery process; do not silently raise the cap or weaken CSP. Only after this evidence should another performance milestone be considered.

References: [Cloudflare CPU semantics](https://developers.cloudflare.com/workers/platform/limits/), [asset-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [M6 analysis](../architecture/M6_SSR_CSP_ANALYSIS.md), [baseline evidence](../verification/m6/CPU_BASELINE.json). The CLI flags and no-disk-log setting were inspected in pinned Wrangler4.131.1 during implementation. The owner subsequently ran the sanitized production capture; housekeeping rechecked those saved sanitized records, without opening a new live tail.
