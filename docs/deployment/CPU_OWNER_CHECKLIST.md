# Owner CPU verification after a separately approved M6 deployment

M6 does not deploy. Review the unmerged PR and exact-head green CI, merge only if approved, sync clean exact main, build/dryrun and record the current last-good Alpha version. Separately approve deployment via [Alpha operations](CLOUDFLARE_ALPHA.md), then retest nonce/security headers, real Keplr connection, Local Demo after reload, explicit reconnect,320px layout and no signer/broadcast. Goal Manager/code ID remain NOT DEPLOYED; wallet0ZIG; no financial action is part of this check.

## Pin the version before comparing

Worker **zigoals-alpha**, URL **https://alpha.zigoals.app/app**. Baseline version **d37151a2-d6fd-4744-8b5c-ca4c3da4c433**, source **01ebf00f7a177ab86fb41b52164fa7f5320f644c**. Do not substitute apex Worker `zigoals` or an aggregate over older versions. From repository root, Node24.19.0/pnpm11.19.0 and an authenticated owner Wrangler session:

```sh
pnpm --filter @zigoals/web exec wrangler deployments list --config wrangler.alpha.jsonc --name zigoals-alpha
M6_WORKER_VERSION='REPLACE_WITH_EXACT_DEPLOYED_UUID'
pnpm --filter @zigoals/web exec wrangler versions view "$M6_WORKER_VERSION" --config wrangler.alpha.jsonc --name zigoals-alpha
```

Confirm the active deployment uses that exact version at100%, source matches the owner's clean merged build (`alpha-build.json`), public mode is unchanged, and proposed CPU limit is2000ms. Stop comparisons if there is a mixed rollout, wrong version/source or uncertain identity. These read-only commands do not deploy or change settings.

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

## Compare without claiming a deployment win in advance

| Measurement | BASELINE (owner supplied; small sample) | M6 DEPLOYMENT (owner fills after rollout) |
| --- | --- | --- |
| Exact version | d37151a2-d6fd-4744-8b5c-ca4c3da4c433 | PENDING |
| Source | 01ebf00f7a177ab86fb41b52164fa7f5320f644c | PENDING |
| Plan / configured CPU cap | Workers Paid / not recorded | PENDING /2000ms proposed |
| One-hour P50/P90/P99 | ~67.98/160/200ms | PENDING |
| Invocations / assets |79/74 | PENDING |
| Asset cache hit / errors |100% /0 | PENDING |
| `/app` CPU samples; median |539,26,34,285,23;34ms | PENDING |
| `/app/settings` CPU; median |32,18,19,16,18;18ms | PENDING |
| `/icon.svg` CPU; median |60,29,12,9,6;12ms | PENDING or corroborated asset N/A |
| Controlled Worker wall arrays |Not supplied | PENDING or unavailable |
| Client wall arrays |Not supplied for owner's CPU batch | PENDING, separate metric |
| CPU-limit/other errors |0 observed | PENDING |

The dashboard and controlled samples have different sampling windows. Five requests cannot establish tail risk, confidence intervals, or a production guarantee. A2s cap protects against long CPU use per invocation, not aggregate monthly spend; it is not a wall timeout. Cloudflare has occasional over-limit flexibility and can return1102/`exceededCpu`. If normal use hits the cap or any security/reconnect behavior regresses, pause further rollout and use the separately authorized owner recovery process; do not silently raise the cap or weaken CSP. Only after this evidence should another performance milestone be considered.

References: [Cloudflare CPU semantics](https://developers.cloudflare.com/workers/platform/limits/), [asset-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [M6 analysis](../architecture/M6_SSR_CSP_ANALYSIS.md), [baseline evidence](../verification/m6/CPU_BASELINE.json). The CLI flags and no-disk-log setting were inspected in the pinned Wrangler4.131.1 source; no live tail was opened by M6.
