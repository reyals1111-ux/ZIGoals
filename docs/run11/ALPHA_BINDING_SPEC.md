# Alpha binding spec: connecting Public Alpha to the activated services

**Status: specification only. Nothing here has been applied.** `apps/web/wrangler.alpha.jsonc`, the deploy workflow and the checkers are unchanged. Apply this only after Stages 1–7 of [ACTIVATION.md](ACTIVATION.md) are complete and the owner approves it as a separate, reviewed PR followed by a Manual Alpha deployment.

> **Session S (2026-10-04): the market part is applied in source, not yet deployed.** `wrangler.alpha.jsonc` binds `MARKET_QUOTES` (the existing coordinator's `QuoteService`) with `ZIGOALS_MARKET_QUOTES_MODE: "durable-v1"`. The checkers allow exactly that, and the deploy workflow no longer passes `COINGECKO_DEMO_API_KEY`. The owner order is [ALPHA_PRICES_ROLLOUT.md](ALPHA_PRICES_ROLLOUT.md). Private account, sign-in and food bindings stay unapplied.
>
> **Correction:** §1's last bullet and §3.4 overstated the key's role. In a deployed app, `configuredDurableQuotes` answers every market-quotes request (503 with the sanitized envelope when unbound), so the 502/503 key check ran only in direct local development. The key never changed a production status. Session S moved that development check into `market-service.ts`.

Facts below were read from the source at `7fdea68` (main, 2026-09-28).

## 1. Today
- `apps/web/wrangler.alpha.jsonc` (13 lines): Worker `zigoals-alpha`; one service binding, `WORKER_SELF_REFERENCE → zigoals-alpha`. No vars, no Durable Objects, no migrations, no routes.
- With neither `MARKET_QUOTES` nor `ZIGOALS_MARKET_QUOTES_MODE` present, `apps/web/lib/server/market-runtime.ts:23-24` resolves the market mode to `unavailable` when deployed. The direct-provider path is development-only.
- Private account, email sign-in and food lookup routes have no bindings, so they are unavailable on Alpha.
- `COINGECKO_DEMO_API_KEY` is still published to the **app** Worker as a runtime secret:
  - `.github/workflows/deploy-alpha.yml:204` (line 126 before #36 split the workflow) passes it to `scripts/alpha-deploy.mjs deploy`.
  - That script writes a 0600 secrets file (`alpha-deploy.mjs:101-111`).
  - `opennextjs-cloudflare deploy … -- --secrets-file` uploads it (`scripts/lib/alpha-deployment.mjs:33-46`).
  - In the app, the value only chooses between a 502 and a 503 message (`apps/web/app/api/market-quotes/route.ts:31`).

## 2. Target `apps/web/wrangler.alpha.jsonc`
Session W Part 23 (Session Q D2): `main` is the thin entry `apps/web/alpha/worker.mjs` in front of OpenNext's generated `.open-next/worker.js` (a missing `/_next/static/` file gets a plain 404); keep it when this target is applied.

Replace the angle-bracket names with the reviewed nonproduction Worker names chosen in Stage 4. The file must stay strict JSON, with no comments or trailing commas, because `check-deployment-configs.mjs:126` uses `JSON.parse`.

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "zigoals-alpha",
  "main": "alpha/worker.mjs",
  "compatibility_date": "2026-09-13",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "workers_dev": true,
  "preview_urls": false,
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS", "run_worker_first": false },
  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "zigoals-alpha" },
    { "binding": "MARKET_QUOTES", "service": "<market-coordinator-worker>", "entrypoint": "QuoteService" },
    { "binding": "PRIVATE_SYNC", "service": "<private-sync-worker>" },
    { "binding": "FOOD_LOOKUP", "service": "<food-lookup-worker>" },
    { "binding": "AUTH_ABUSE", "service": "<auth-abuse-worker>", "entrypoint": "AdmissionService" }
  ],
  "vars": {
    "ZIGOALS_MARKET_QUOTES_MODE": "durable-v1",
    "ZIGOALS_AUTH_ORIGIN": "<https Supabase project origin>",
    "ZIGOALS_SYNC_ORIGIN": "<https private-sync origin>"
  },
  "limits": { "cpu_ms": 2000 },
  "observability": { "enabled": false }
}
```
These names and entrypoints mirror the reviewed template `apps/web/wrangler.run11.local.jsonc:10-21`. `ZIGOALS_AUTH_PUBLIC_KEY` is publishable, but it is **not** a var: it is supplied as a Worker secret (§4), because names containing "KEY" are refused as vars by `scripts/run11/activation-check.mjs:15`.

## 3. Code changes that must ship in the same PR
The current guards are designed to refuse the config above:
1. `scripts/lib/alpha-deployment.mjs:86-101` `assertAlphaConfig` requires deep equality with the old 13-line config. Update the `reviewed` object to exactly the new config. Keep the deep-equality check, so any later drift still fails.
2. `scripts/check-deployment-configs.mjs:82-89` requires `services` to be exactly `[WORKER_SELF_REFERENCE]`. Replace it with an exact allow-list of the five bindings above, with their services and entrypoints. Keep the name, main, assets, route-host (`alpha.zigoals.app` only) and `cpu_ms` rules.
3. Update the tests of both checkers (`scripts/*.test.mjs`) so that the new config passes and a sixth binding, a wrong entrypoint or a Worker named `zigoals-alpha-*` fails.
4. `apps/web/app/api/market-quotes/route.ts:31`: base the 502/503 choice on the durable mode (`market-runtime.ts`), not on `process.env.COINGECKO_DEMO_API_KEY`, so the app no longer needs the key.

## 4. Moving `COINGECKO_DEMO_API_KEY` to the market coordinator
1. **Coordinator first.** Put the key on the activated coordinator only, interactively:
   ```
   wrangler secret put COINGECKO_DEMO_API_KEY --config <reviewed coordinator config>
   ```
   It is consumed there at `workers/market-coordinator/worker.ts:22,40` and only reached through `QuoteService`, which is gated by `MARKET_QUOTE_DISPATCH` and `MARKET_ACCOUNT_ID` (`:28`).
2. **Workflow.** In `.github/workflows/deploy-alpha.yml`, delete `COINGECKO_DEMO_API_KEY: ${{ secrets.COINGECKO_DEMO_API_KEY }}` from the `publish` step (line 204 at `5dd2ee7`). The full reference list and owner order are in [MARKET_KEY_CUSTODY.md](MARKET_KEY_CUSTODY.md).
3. **Deploy script.** In `scripts/alpha-deploy.mjs:101-111` and `alphaRuntimeSecrets` (`alpha-deployment.mjs:13-19`), stop requiring and publishing the key. Keep the secrets-file mechanism only if the app gets another secret, such as `ZIGOALS_AUTH_PUBLIC_KEY` (§5); otherwise drop the `--secrets-file` argument and its tests.
4. **Keep the scrubbing.** Keep `delete result.COINGECKO_DEMO_API_KEY` in `alphaDeploymentEnvironment` (`:29`) and `apps/web/scripts/sanitize-alpha-env.mjs:14-24` as defence in depth.
5. **Old app secret.** After the first deployment without the key, the app Worker still holds the previously uploaded secret. Remove it with:
   ```
   wrangler secret delete COINGECKO_DEMO_API_KEY --name zigoals-alpha
   ```
   Or confirm that the deploy replaced the secret set. Record the resulting version.
6. **GitHub secret.** Delete the GitHub `alpha` environment secret `COINGECKO_DEMO_API_KEY` once no workflow reads it.

## 5. Secrets and values the owner must supply
These are names only. Never put a value in Git, CI logs, issues or reports.

| Name | Where | Kind |
|---|---|---|
| `ZIGOALS_AUTH_PUBLIC_KEY` | `zigoals-alpha` (Worker secret) | publishable/anon Supabase key, never the service-role key |
| `ZIGOALS_AUTH_ORIGIN`, `ZIGOALS_SYNC_ORIGIN` | `wrangler.alpha.jsonc` vars | exact HTTPS origins |
| `COINGECKO_DEMO_API_KEY` | market coordinator (Worker secret) | provider key |
| `MARKET_QUOTE_DISPATCH` (=`durable-v1`), `MARKET_ACCOUNT_ID`, `MARKET_POLICY` | market coordinator vars | configuration |
| `AUTH_ORIGIN`, `APP_ORIGIN` (vars), `AUTH_PUBLIC_KEY` (secret) | private sync | `APP_ORIGIN` must be exactly `https://alpha.zigoals.app` |
| `AUTH_ORIGIN`, `RECOVERY_MODE` (=`reconcile`) (vars), `AUTH_ADMIN_KEY` (secret) | lifecycle authority only | admin key never reaches the app |
| `AUTH_ADMISSION_KEY` | auth admission (secret, ≥32 random characters) | |
| `FOOD_USER_AGENT` | food lookup (var) | `ZIGoals/<version> (<owner contact>)` |
| Worker names for the four services | Stage 4 | distinct nonproduction names |
| `CLOUDFLARE_ALPHA_API_TOKEN` scope | GitHub `alpha` environment | must allow binding to the four service Workers; no broader |

## 6. Decisions and risks
- **Two origins.** `APP_ORIGIN` is a single exact origin, so private sync and sign-in will work on `https://alpha.zigoals.app` only, not on the `workers.dev` fallback. Either accept that and say so in the UI copy, or set `"workers_dev": false`, which also changes the fallback URL documented in STATUS.
- **Deploy order.** Service Workers must exist before the app binds to them, or the upload fails. Deploy and verify the coordinator, private sync with lifecycle, food lookup and auth admission first, then the app.
- **Rollback.** Rolling the app back to the current version removes the bindings. Stored data in the services is unaffected, and clients fall back to "unavailable".
- **Smoke tests.** The smoke and security checks (`scripts/verify-hosted-alpha.mjs`, the Workers security gate) must still pass. Extend them with a sanitized, fixture-free check that `/api/market-quotes` returns durable evidence and that `/api/private-account` refuses requests from other origins.
