# CoinGecko key custody: current flow, target flow, owner steps

Status: **documentation only. No workflow, script or app change was made.** Facts were read from the source at `5dd2ee7` (main, 2026-09-29). The key's name appears below; its value never belongs in Git, logs, issues or reports.

## Every reference to `COINGECKO_DEMO_API_KEY`
| Where | Line(s) | What it does |
|---|---|---|
| `.github/workflows/deploy-alpha.yml` | 204 | The deploy job's `publish` step reads the GitHub `alpha` environment secret into the step env. The credential-free build job does not see it. |
| `scripts/alpha-deploy.mjs` | 109 | Writes the key into a 0600 secrets file in `RUNNER_TEMP`, removed after publication. |
| `scripts/lib/alpha-deployment.mjs` | 18 | `alphaRuntimeSecrets` **asserts the key is present** ("CoinGecko Alpha runtime secret missing"), so a deploy without it fails before upload. |
| `scripts/lib/alpha-deployment.mjs` | 29 | `alphaDeploymentEnvironment` deletes the key from the OpenNext child's environment (defence in depth). |
| `apps/web/scripts/sanitize-alpha-env.mjs` | 14–16 | Removes any key that OpenNext compiled from `.env` files and fails if the value remains in any artifact. |
| `apps/web/lib/server/market-service.ts` | 6 | Passes the key to the provider **only** when `directMarketDevelopment()` is true: `NODE_ENV=development` and `ZIGOALS_MARKET_LOCAL_MODE=direct`. Never in production. |
| `apps/web/app/api/market-quotes/route.ts` | 31, 35 | **The only production read.** Its presence selects the error: GET returns 502 "Verified market valuation unavailable…" with the key, 503 "Market pricing is not configured…" without it; POST returns the provider error text with the key, the setup text without it. |
| `workers/market-coordinator/worker.ts` | 22, 40 | Target consumer: the coordinator's `QuoteService` passes it to the provider, gated by `MARKET_QUOTE_DISPATCH` and `MARKET_ACCOUNT_ID`. |
| `workers/market-coordinator/README.md` | 6 | States that the key is coordinator-only in the Run11 topology. |
| `.env.example` | 9 | Empty placeholder for local direct development (`apps/web/.env.local`, gitignored). |
| Tests | `scripts/alpha-deployment.test.mjs` 35–68 (line 66 asserts the workflow passes the key exactly once); `scripts/alpha-env.test.mjs`; `apps/web/lib/market-{quotes,history,insights}-route.test.ts`; `apps/web/lib/server/market-runtime.test.ts`; `scripts/run10/market-dispatch.test.mjs`; `scripts/run11/market-*.test.mjs`, `packaged-runtime.test.mjs`, `make-private-configs.test.mjs` | Fixture values only (`fixture-key`, `must-not-use`, `not-a-real-key`). |
| Docs | `ACTIVATION.md`, `ALPHA_BINDING_SPEC.md`, `docs/run10/MARKET_EVIDENCE.md`, `docs/RUN_9_MARKET_DATA.md`, `docs/RUN_9_PREP.md` | Descriptions; the Run9 documents are historical. |

## Current flow (live Alpha)
1. GitHub `alpha` environment secret → deploy step env (`deploy-alpha.yml:204`).
2. `alpha-deploy.mjs` → 0600 secrets file → `opennextjs-cloudflare deploy -- --secrets-file` → a Worker secret on `zigoals-alpha`.
3. The app never calls CoinGecko in production. `wrangler.alpha.jsonc` has neither `MARKET_QUOTES` nor `ZIGOALS_MARKET_QUOTES_MODE`, so `market-runtime.ts` resolves `unavailable` and prices fail closed. The key only turns the market-quotes errors from 503 "not configured" into 502 "unavailable".

## Target flow
The key lives only on the activated market coordinator Worker. The app binds `MARKET_QUOTES` (entrypoint `QuoteService`) with `ZIGOALS_MARKET_QUOTES_MODE=durable-v1`, and no app path, workflow or GitHub secret holds the key.

## Why the workflow is not changed in this PR
Removing the workflow line alone breaks the next deploy (`alphaRuntimeSecrets` asserts the key), and the deploy-script test pins the line. Doing it properly also changes live behaviour: market-quotes GET turns from 502 into 503 and the error texts change. That needs the route change in `ALPHA_BINDING_SPEC.md` §3.4, which is an app code change, so it belongs in the reviewed binding PR. **The next Manual Alpha deploy behaves exactly as before.**

## Owner steps, in order
1. **Deploy the coordinator** (after Stage 7 approval): put the key on the coordinator only, interactively, `wrangler secret put COINGECKO_DEMO_API_KEY --config <reviewed coordinator config>`, with `MARKET_QUOTE_DISPATCH=durable-v1`, `MARKET_ACCOUNT_ID` and the validated `MARKET_POLICY` (see `scripts/run11/market-policy.mjs`). Verify it.
2. **Bind** it to the app in the reviewed binding PR (`ALPHA_BINDING_SPEC.md` §2–3), then run a Manual Alpha deploy and check that `/api/market-quotes` returns durable evidence.
3. **Remove the key from the app path** in one reviewed PR, followed by a deploy:
   - delete `deploy-alpha.yml:204`;
   - drop `alphaRuntimeSecrets` and `--secrets-file`, unless another app secret such as `ZIGOALS_AUTH_PUBLIC_KEY` needs them, and update `alpha-deployment.test.mjs`;
   - base the market-quotes 502/503 choice on the durable mode (`ALPHA_BINDING_SPEC.md` §3.4).
   Keep the scrubbing in `alphaDeploymentEnvironment` and `sanitize-alpha-env.mjs`.
4. **Remove the old app secret:** `wrangler secret delete COINGECKO_DEMO_API_KEY --name zigoals-alpha` (or confirm the deploy replaced the secret set). Record the resulting version.
5. **Delete the GitHub `alpha` environment secret** `COINGECKO_DEMO_API_KEY` once no workflow reads it.

Do steps 4 and 5 only after the deploy from step 3 is verified. Until then the existing secrets remain the rollback path. Live prices depend only on the coordinator binding, never on the app-side key.
