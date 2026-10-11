# Run #9.1 verification

Local branch: `codex/run9-goal-intelligence-live-wealth`. Starting commit: `f5d04a01fc7a6b97a574b5ca900f3e2b251dcd9b`. Runtime: Node 24.19.0, pnpm 11.19.0. No deployment, merge, push, PR, wallet signature or financial transaction occurred.

## Quality gates

| Check | Result |
|---|---|
| `pnpm lint` | Pass; existing JSX parser advisory about TSNonNullExpression, no lint errors |
| `pnpm typecheck` | Pass |
| `pnpm test` | **924 passed, 59 files** |
| `pnpm build` | Pass |
| Production Next browser suite | **186 passed, 8 opt-in visual cases skipped**, desktop + mobile |
| `pnpm --filter @zigoals/web build:alpha` | Pass; OpenNext bundle generated and environment sanitized |
| `pnpm --filter @zigoals/web check:alpha` | Pass; Wrangler explicitly exited after dry run |
| Packaged Alpha security + owner flows | **32 passed**, desktop + mobile; nonce/CSP, private-data egress, diagnostics and ten new flows |
| Packaged Alpha full browser suite | **186 passed, 8 opt-in visual cases skipped**, final source in Workers emulation |
| Final Alpha visual capture | **4 passed**, 1440 / 1024 / 390 / 320 widths, 44 screenshots |
| `pnpm check:deploy-configs` | Pass; deployment configurations remain isolated |
| `pnpm audit --prod` | No known vulnerabilities found |
| Build/evidence exact credential scan | **3,807 files, zero matches** across `.next`, `.open-next` and screenshot evidence; no secret printed |
| Alpha runtime without market key | History endpoint returns **503**, no history, clear saved-observation fallback |
| Tracked-file credential and whitespace scans | Pass; zero known secret-pattern or exact-key matches; no whitespace errors |
| Independent final review | [Approved review](accounting-review.md); **36 focused tests passed** |

The full unit suite was rerun without simultaneous builds after a resource-contended run timed out; no timeout or assertion was weakened. The Alpha bundle records the starting HEAD plus dirty working-tree flag because it was built before the final local commit. It has not been deployed. The delivery response supplies the final commit SHA.

## Acceptance evidence

The ten automated flows cover: Bitcoin add/live-reference quote/chart/edit/filter; Gold RWA identity/edit/archive; cash creation/edit/allocation; Bitcoin/Nvidia/Gold watchlist reorder/remove/Today/detail without ownership; existing BTC plus new ETH funding sources without double-counting; **20,000 USD into a 2,000 USD Goal, one contribution and 18,000 USD available**; history-only balance invariance; Activity filters/links; exact recorded wealth/Goal history; working Health diary with truthful planned modules.

Additional accounting regressions cover partially funded Goals, exact retries and conflicting retry rejection, manual Quantity valuation, explicit partial schedule credits and reversals, original quote timestamps, migration/recovery/backup, atomic quota failure, indivisible-unit cap rejection, retained archive/restoration history under Activity eviction, and mixed-precision ISO boundary validation. Asset balances and Goal allocations share the existing private-store lock.

## Visual evidence

All portfolios, market curves, Goal history, Habits and Health entries in these application screenshots are **controlled disposable fixtures**. They are not the owner's data, real investment returns or proof of a provider quote. The 31-point example market curve is deterministic test data. No write test used the owner's browser storage.

| Surface | Desktop | Tablet | Mobile | Narrow mobile |
|---|---|---|---|---|
| Landing / slogan | [1440](landing-1440.png) | [1024](landing-1024.png) | [390](landing-390.png) | [320](landing-320.png) |
| Today | [1440](today-1440.png) | [1024](today-1024.png) | [390](today-390.png) | [320](today-320.png) |
| Wealth | [1440](wealth-1440.png) | [1024](wealth-1024.png) | [390](wealth-390.png) | [320](wealth-320.png) |
| Asset detail / chart | [1440](asset-detail-1440.png) | [1024](asset-detail-1024.png) | [390](asset-detail-390.png) | [320](asset-detail-320.png) |
| Goal detail | [1440](goal-detail-1440.png) | [1024](goal-detail-1024.png) | [390](goal-detail-390.png) | [320](goal-detail-320.png) |
| Funding Wealth | [1440](funding-wealth-1440.png) | [1024](funding-wealth-1024.png) | [390](funding-wealth-390.png) | [320](funding-wealth-320.png) |
| Activity | [1440](activity-1440.png) | [1024](activity-1024.png) | [390](activity-390.png) | [320](activity-320.png) |
| Health | [1440](health-1440.png) | [1024](health-1024.png) | [390](health-390.png) | [320](health-320.png) |
| Goals | [1440](goals-1440.png) | [1024](goals-1024.png) | [390](goals-390.png) | [320](goals-320.png) |
| Stake / Positions | [1440](positions-1440.png) | [1024](positions-1024.png) | [390](positions-390.png) | [320](positions-320.png) |
| Add asset dialog | [1440](asset-add-1440.png) | [1024](asset-add-1024.png) | [390](asset-add-390.png) | [320](asset-add-320.png) |

The final set was captured against local Workers emulation at `127.0.0.1:8789`, using the actual Alpha bundle and production CSP. Every route asserts no document horizontal overflow; Today additionally checks that its progress ring remains circular. Manual inspection covered hero contrast, card hierarchy, chart controls, funding metrics, Activity type distinctions, Health roadmap labels, modal scrolling and narrow-screen wrapping. Visual refinements corrected a stretched Today ring, cramped asset-detail spacing, ambiguous duplicated picker headings, the Health roadmap heading layout and hero contrast.

Supplementary chart evidence: [1440](price-chart-1440.png), [1024](price-chart-1024.png), [390](price-chart-390.png), [320](price-chart-320.png), [RWA fallback at 320](price-chart-rwa-320.png). These are also fixtures. The screenshot set contains **49 PNGs** in total.

## Real provider check

A real local adapter request for public Bitcoin/USD/90-day history returned **HTTP 200 and 2,161 observations**. The result spans 2026-06-22T21:00:00Z through 2026-09-20T20:30:20Z. [Machine-recorded result](live-history-check.json) contains no credential or private portfolio input. RWA provider history remains unsupported; physical metals are not mapped silently to tokenized prices.

## Practical limits

This is private browser tracking. Funding records new wealth locally; no money moves. History-only reversals do not undo asset balances. Recorded wealth movement is not an investment return. Manual prices retain their provenance, and missing evidence is not filled in. Archives retain financial facts and durable membership; bounded storage eventually rejects further writes safely. Watchlist 24h changes/sparklines require additional provider evidence. Barcode, food-photo and wearable modules remain explicitly planned. See the [full report](../../RUN_9_1_REPORT.md) and [Beta backlog](../../RUN_9_1_BETA_BACKLOG.md).

Raw test/build logs and review working notes remain in ignored `.superpowers/run9-1/`. Browser traces and disposable profiles are ignored. The existing server credential stays in gitignored `.env.local`; the sanitized Alpha package requires a separately configured runtime binding for automatic prices.
