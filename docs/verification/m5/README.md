# M5 evidence index

Records separate owner observations, independent live reads, local validation and actual CI. Live source remains the owner's M4 merge build; M5 does not redeploy either Worker.

| Record | Provenance and scope |
|---|---|
| [OWNER_LIVE_ALPHA_EVIDENCE.json](OWNER_LIVE_ALPHA_EVIDENCE.json) | OWNER_OBSERVED: URLs, Worker versions, source, real hosted extension rejection/reconnect, 0 ZIG, no financial signing, reload and CTA. Owner observation time absent; record creation time is separate. |
| [RELEASE_VERIFICATION.json](RELEASE_VERIFICATION.json) | Existing run 34772005556 and exact M4 source; downloaded Wasm/source/validator and both GitHub native attestations independently verified. ATTESTED_CANDIDATE_NOT_APPROVED only. |
| [HOSTED_SMOKE.json](HOSTED_SMOKE.json) | Fresh ephemeral Chrome context, actual HTTPS origins, no wallet or network mocks; fictional lifecycle/backup/diagnostics/reload, full-header application request capture, headers/resources/layout and real findings. |
| [HOSTED_PERFORMANCE.json](HOSTED_PERFORMANCE.json) | Small live response and initial browser resource sample. Separate later dashboard CPU snapshot; no load-test or Core Web Vitals claim. |
| [CLOUDFLARE_READ_ONLY.json](CLOUDFLARE_READ_ONLY.json) | Read-only UI: Workers Free, active-version median CPU30.43ms, zero displayed errors in Last24h, Alpha domains/bindings. Capacity risk relative to stated10ms. |
| [PUBLIC_DNS.json](PUBLIC_DNS.json) | Public A/MX/SPF/DKIM answers and read-only dashboard Worker/DNS table; unsuccessful DMARC lookup. Private routing/forwarding and mail delivery not inspected. No writes. |
| [LOCAL_RESULTS.json](LOCAL_RESULTS.json) | Resumable local gate record; pending stages are explicit until final acceptance. |
| [DEPENDENCY_SCAN.json](DEPENDENCY_SCAN.json) | Fresh production/full npm and RustSec scans; zero vulnerability findings, two unmaintained Rust notices, existing official download-action warning. |

The completed hosted sample captured **83 application/page/resource requests**, reading each request's URL, body and `allHeaders()`. None contained the tested fictional name, target, date or note. Alpha traffic used only its origin and canonical RPC/REST. Existing apex Google Fonts requests were separately identified. Browser-managed implicit favicon requests appeared as console 404s outside those request events, so this is bounded application-flow evidence, not a universal browser traffic/privacy guarantee.

Actual hosted findings: landing width335 at viewport320 (other measured widths fit), and missing favicons on both origins. There were no JavaScript page errors, captured HTTP errors, or failed application requests in the completed sample. These pre-M5 findings remain live until the owner deploys reviewed fixes. Earlier development probes corrected test locators and asynchronous waits; no live app was changed to make a probe pass.

The safe diagnostics fallback was inspected and contained only build/mode/session and endpoint status/time. Current chain checksum/code/contract remained NOT DEPLOYED. Real Keplr proof is the separately supplied owner evidence; M5's isolated browser never connected a wallet.

To repeat the manual hosted probe from repository root, with Node24.19.0 and pnpm11.19.0 dependencies installed:

```sh
node scripts/verify-hosted-alpha.mjs /tmp/zigoals-hosted-new-observation
```

The script uses only fixed public origins and fictional ephemeral local data. It performs no wallet/financial/cloud management operation. Exit0 means all asserted checks passed without recorded findings; exit2 means capture completed with findings; exit1 means a required check failed. It is deliberately not run automatically in CI. Each output is dated independently; do not overwrite prior observations or relabel the deployed source.

[Run 5 report](../../RUN_5_REPORT.md) provides final local/CI totals, review disposition and exact owner-only next steps. Historical M1–M4 reports and evidence are unchanged.

A later permitted Cloudflare dashboard inspection established **Workers Free** and active-version median CPU **30.43ms**, with zero displayed invocation/CPU-limit errors in the last24h view. This exceeds the stated10ms allowance and is a concrete capacity risk. Successful requests do not establish sustainable Free-plan headroom. No upgrade, observability toggle, cache-policy weakening or production change was made.
