# Run #9.2 verification

Local branch `codex/run9-goal-intelligence-live-wealth`; starting HEAD `21b5f6d9edcea948b7a31db65cbc95d6ef056210`. Node 24.19.0, pnpm 11.19.0. Final source only; nothing deployed, merged, pushed or opened as a PR.

## Quality gates

| Check | Verified result |
|---|---|
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm test | **1006 passed, 76 files** |
| pnpm build | PASS |
| Full production Next browser suite | **220 passed**, desktop/mobile; 16 opt-in capture cases skipped |
| OpenNext Alpha build | PASS; compiled environment sanitized |
| Wrangler Alpha dry run | PASS; explicitly exited after dry run |
| Full packaged Alpha/Workers browser suite | **220 passed**, desktop/mobile; 16 opt-in capture cases skipped |
| Packaged Alpha security and funding flows | **32 passed**, desktop/mobile |
| Rapid repeated Quick Add, packaged Alpha | **6 passed**, desktop/mobile |
| Final Alpha screenshot suite | **4 passed**, all four widths, **100 PNGs** |
| Deployment configuration isolation | PASS |
| Production dependency audit | No known vulnerabilities found |
| Credential patterns and exact configured-key scan | PASS; **5237 files**, zero exact-key matches, zero diff matches; values suppressed |
| Alpha without configured market key | HTTP 503, null history, explicit saved-observation fallback |
| Whitespace/diff check | PASS |
| Fresh independent compliance review | **PASS**, all three P2 gaps closed; separate 320px CTA correction verified |

The public Alpha/security subset includes the original production-header, nonce/script rejection, private-data egress, backup/recovery, icon/robots and ten Run #9.1 owner workflows, plus a new test rejecting private fields/query injection and arbitrary logo destinations. No baseline cases were removed. Original text assertions now use the owner’s new slogan and Funding Wealth. The favourites, Activity and Habit reflection tests verify committed removal/check-in/save before leaving the page; the public-insights exception checks exact allowed public request shapes, not an unrestricted POST exemption.

## Financial and privacy evidence

The mandatory 20,000 USD into 2,000 USD Goal flow passes: 100% funding, one contribution, 2,000 allocated, 18,000 available, timeline/Activity updated, no double counting. History-only entries preserve balances/allocations. Unit cases retain exact retries, surplus, schedule credits, reversals, stale previews, v1/v2 migration, v3 backup, future/corrupt rejection and recovery bytes.

Showcase tests cover staging/reset failure, deterministic inventory, separate tabs, scoped locks, denied storage, load/edit/reset/exit with byte-exact normal storage preservation, queued Goal-save scope transitions and delayed public-cache responses across mode changes. No wallet connection/signing or financial execution is added.

The exact-key scan covers tracked/untracked source, production .next, sanitized .open-next, final evidence and Run #9.2 logs. The active development preview initially retained a key in its private, unshipped Turbopack cache; the preview was stopped and that generated cache cleared before the final zero-match scan. Configured .env.local remains private and ignored. No key value was printed. See [machine scan result](exact-secret-scan.json).

## Packaged runtime correction

Real-provider screenshot capture exposed a Workers incompatibility: server fetch rejected redirect:error before network I/O. Both the CoinGecko adapter and raster proxy now use manual redirects and reject non-2xx or redirected responses before reading the body. Two regressions reproduced the defect; actual Workers provider history then returned 2,161 Bitcoin observations. Browser client redirect handling stays unchanged. Concurrent real-provider capture then exposed request-context lifetime hazards in shared server waiters. The server admission and pending-load paths were corrected with bounded request-owned waiting, cancellation recovery and ownership checks; independent Workers concurrency tests and final capture verify the correction. Browser-scoped promise sharing remains local to its context. The [independent Workers harness](worker-lifetime-final-green.json) uses synthetic timed responses and an explicit clock advance to test expired owners; these fixtures never supply the final product screenshots. All final gates were repeated after these corrections. See [runtime evidence](edge-runtime-fix.json) and the [Cloudflare request-lifetime guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

The full browser run also emitted intermittent OpenNext response-stream cancellation diagnostics during rapid navigation. Their association with canceled navigation/prefetch streams is an inference; a warning-free framework runtime is not claimed. No market API 5xx or cross-request promise warning appeared. A separate quiet check read complete bodies from four pages and actual history/insights/logo endpoints: seven HTTP 200 responses, 2,161 observations and no error in that isolated window. See [diagnostic review](runtime-notes.txt) and [quiet response checks](quiet-runtime-final.json).

## Final screenshots

All portfolio quantities, Goals, contributions, Habit and Health history are **SHOWCASE / fictional examples** in an isolated disposable browser. Actual public CoinGecko prices, logos, 24h changes and seven-day sequences are labelled separately. Final Bitcoin charts use real configured provider responses, with no mocked market history. RWA data stays a tokenized reference; it is not physical-metal spot or an exchange execution price.

| Surface | 1440 | 1024 | 390 | 320 |
|---|---|---|---|---|
| Landing | [1440](landing-1440.png) | [1024](landing-1024.png) | [390](landing-390.png) | [320](landing-320.png) |
| Today | [1440](today-1440.png) | [1024](today-1024.png) | [390](today-390.png) | [320](today-320.png) |
| Corrected hero | [1440](hero-slogan-1440.png) | [1024](hero-slogan-1024.png) | [390](hero-slogan-390.png) | [320](hero-slogan-320.png) |
| Goals | [1440](goals-1440.png) | [1024](goals-1024.png) | [390](goals-390.png) | [320](goals-320.png) |
| Goal creation | [1440](goal-create-1440.png) | [1024](goal-create-1024.png) | [390](goal-create-390.png) | [320](goal-create-320.png) |
| Goal Detail | [1440](goal-detail-1440.png) | [1024](goal-detail-1024.png) | [390](goal-detail-390.png) | [320](goal-detail-320.png) |
| Funding Wealth | [1440](funding-wealth-1440.png) | [1024](funding-wealth-1024.png) | [390](funding-wealth-390.png) | [320](funding-wealth-320.png) |
| Wealth | [1440](wealth-1440.png) | [1024](wealth-1024.png) | [390](wealth-390.png) | [320](wealth-320.png) |
| Markets | [1440](markets-1440.png) | [1024](markets-1024.png) | [390](markets-390.png) | [320](markets-320.png) |
| Watchlist | [1440](watchlist-1440.png) | [1024](watchlist-1024.png) | [390](watchlist-390.png) | [320](watchlist-320.png) |
| Portfolio Composition | [1440](portfolio-composition-1440.png) | [1024](portfolio-composition-1024.png) | [390](portfolio-composition-390.png) | [320](portfolio-composition-320.png) |
| Asset Add | [1440](asset-add-1440.png) | [1024](asset-add-1024.png) | [390](asset-add-390.png) | [320](asset-add-320.png) |
| Asset Detail | [1440](asset-detail-1440.png) | [1024](asset-detail-1024.png) | [390](asset-detail-390.png) | [320](asset-detail-320.png) |
| Market Chart | [1440](market-chart-1440.png) | [1024](market-chart-1024.png) | [390](market-chart-390.png) | [320](market-chart-320.png) |
| Stake / Positions | [1440](positions-1440.png) | [1024](positions-1024.png) | [390](positions-390.png) | [320](positions-320.png) |
| Habits | [1440](habits-1440.png) | [1024](habits-1024.png) | [390](habits-390.png) | [320](habits-320.png) |
| Habit history | [1440](habit-history-1440.png) | [1024](habit-history-1024.png) | [390](habit-history-390.png) | [320](habit-history-320.png) |
| Health | [1440](health-1440.png) | [1024](health-1024.png) | [390](health-390.png) | [320](health-320.png) |
| Activity | [1440](activity-1440.png) | [1024](activity-1024.png) | [390](activity-390.png) | [320](activity-320.png) |
| Ecosystem | [1440](ecosystem-1440.png) | [1024](ecosystem-1024.png) | [390](ecosystem-390.png) | [320](ecosystem-320.png) |
| Settings | [1440](settings-1440.png) | [1024](settings-1024.png) | [390](settings-390.png) | [320](settings-320.png) |
| Quick Add open | [1440](quick-add-1440.png) | [1024](quick-add-1024.png) | [390](quick-add-390.png) | [320](quick-add-320.png) |
| Needs Attention | [1440](needs-attention-1440.png) | [1024](needs-attention-1024.png) | [390](needs-attention-390.png) | [320](needs-attention-320.png) |
| Showcase activation | [1440](showcase-activation-1440.png) | [1024](showcase-activation-1024.png) | [390](showcase-activation-390.png) | [320](showcase-activation-320.png) |
| Showcase control | [1440](showcase-control-1440.png) | [1024](showcase-control-1024.png) | [390](showcase-control-390.png) | [320](showcase-control-320.png) |


The final set was captured against the packaged Alpha at 127.0.0.1:8789. Every route asserts no document overflow. Both landing and Today enforce the exact two-line capitalized slogan. Additional tests check child-span bounds, matching gradients, contained hero buttons, 14px functional text, keyboard/focus and repeated Quick Add. Asset Add waits for a settled catalog and visible Bitcoin results. Images were inspected across all four widths, including populated dashboards, charts, card hierarchy, modal scrolling and shared visual treatment.

Actual public chart text: [1440](public-chart-1440.txt), [1024](public-chart-1024.txt), [390](public-chart-390.txt), [320](public-chart-320.txt). These contain public observations only. Historical portfolio charts remain visibly fictional and do not masquerade as actual returns.

## Independent review and corrections

[Full read-only review and closure](independent-review.txt). The reviewer received the complete request, 202-row manifest, final diff and screenshots. The first pass identified unbounded Markets rendering/acquisition, non-numeric sparkline alternatives and unsettled Asset Add captures. Fixes now bound Markets to 24 cards/request identities, keep typing local, provide exact first/last/min/max/sample-count descriptions, and capture the usable dialog state. Main-agent visual review also corrected 320px hero CTA clipping. Final packaged checks exposed and fixed a rapid repeated Quick Add URL-cleanup race; synchronous intent consumption has dedicated history-integration regressions and repeated actual browser coverage. New regression cases reproduced the functional gaps before their fixes.

## Delivery record and limits

The complete [report](../../RUN_9_2_REPORT.md) and [202-row manifest](../../RUN_9_2_DELIVERABLES.md) contain individual evidence links. Exact final HEAD and clean status are recorded after the local commit in `.superpowers/run9-2/final-git.txt` and the delivery response. The Alpha build identity correctly records its precommit starting HEAD plus dirty flag; nothing was uploaded. Raw commands/traces remain in ignored `.superpowers/run9-2/` and test-results.

This remains local private tracking. Eight favourites, bounded financial history and per-process CoinGecko admission remain explicit limits. Missing prices are unavailable, unsupported RWA history uses local evidence, currencies are not silently converted, and recorded wealth movement is not investment performance. Barcode, photo-food recognition and wearables remain planned/unconnected. See the [genuine Beta backlog](../../RUN_9_1_BETA_BACKLOG.md).
