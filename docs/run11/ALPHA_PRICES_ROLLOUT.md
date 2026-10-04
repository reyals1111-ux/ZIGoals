# Live prices on the public Alpha: owner rollout

**What changes:** `alpha.zigoals.app` gets prices through the existing market coordinator `zigoals-acctest-market-coordinator`, by a service binding to its `QuoteService` entrypoint. The app no longer holds or publishes the CoinGecko key. Owner decision 2026-10-03/04 (STATUS): coordinator first, then the Alpha.

**Order:** do this **before** [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md). Note the commit you deploy the coordinator from here; the final redeploy can skip the coordinator if nothing changed since.

Written by Session S (2026-10-04). **Nothing here was run by a session.** The session proved it locally only:
- the config and deploy tests;
- the generated Alpha artifact with a stand-in coordinator (`scripts/run11/alpha-packaged-prices.test.mjs`): VERIFIED, and UNAVAILABLE when unbound or failing;
- `preview:alpha` with the public-Alpha specs.

**Rules:**
- One command per step, with a read-only check before every change.
- Never paste output that shows an email, a UUID, a version ID with your account, or a `workers.dev` subdomain anywhere public.

## What the PR changed
- **`apps/web/wrangler.alpha.jsonc`:**
  - `MARKET_QUOTES` → `zigoals-acctest-market-coordinator`, entrypoint `QuoteService`;
  - `ZIGOALS_MARKET_QUOTES_MODE: "durable-v1"`.

  Nothing else changed. `assertAlphaConfig` and `check-deployment-configs.mjs` allow exactly this.
- **The deploy path carries no market key:**
  - `deploy-alpha.yml` no longer reads `COINGECKO_DEMO_API_KEY`;
  - `alpha-deploy.mjs` writes no secrets file and passes no `--secrets-file`;
  - any inherited key is still scrubbed from the deploy child.
- **The workflow's smoke** sends one BTC/USD probe to `/api/market-quotes` and requires only a well-formed answer. VERIFIED or UNAVAILABLE is shown in the run summary as information. **UNAVAILABLE never fails, retries or rolls back the deployment.**
- **`scripts/verify-hosted-alpha.mjs`** (your manual check) requires VERIFIED.
- **The coordinator** bounds anonymous cancellation fences per day and per client (Part 8a), and Parts 2 and 4 change it too. That is why it is redeployed first.

## Shared budget: read this once
- There is **one** coordinator, one account object (`MARKET_ACCOUNT_ID`), one CoinGecko Demo key and one set of breakers for **both** apps: the acceptance app and the public Alpha.
- **Everything is shared:**
  - the CoinGecko monthly and per-minute credits (the private `MARKET_POLICY`);
  - the daily row budget (`dailyRowBudget`, default 20,000 rows a day);
  - the per-client shares;
  - the breakers.

  A busy or abusive day on the public Alpha can therefore leave the acceptance app without new prices until the next UTC day (rows) or month (credits), and the other way round.
- **Cached prices keep serving**, and manual valuation always works. Nothing fails open.
- **Per-client limits** apply to every public market route (`apps/web/lib/server/market-route-coverage.test.ts`): one address group (an IPv4 address or an IPv6 /48) gets at most a quarter of the per-minute and in-flight limits, a 31st of the monthly credits per day, and a 16th of the day's new works. Cancellation fences are limited too: a 64th of the row budget per day, and an eighth of that per client.
- **The policy window** ends **2026-10-31 16:00 UTC**. Regenerate `MARKET_POLICY` around 28 October (ACTIVATION Stage 6), or the coordinator fails closed **for both apps**.

## Steps
### 1. Ops checkout at the merged main, hermetic, then log in
```sh
cd ~/ops/ZIGoals
git status --short                                 # read only: nothing but your ignored files
git fetch origin && git checkout --detach <merged main SHA>
git rev-parse HEAD                                 # read only: the merged SHA; note it as the rollout SHA
pnpm install --frozen-lockfile --ignore-scripts
ls -a apps/web | grep '^\.env' ; ls -a | grep '^\.env'   # read only: only .env.example
pnpm --filter @zigoals/web exec wrangler login     # browser sign-in with 2FA; no local agent running
pnpm --filter @zigoals/web exec wrangler whoami    # read only; never paste
```

### 2. Redeploy the coordinator from the merged source (no secret change)
```sh
pnpm --filter @zigoals/web exec wrangler deployments list --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"  # read only: write down the live version (rollback)
pnpm --filter @zigoals/web exec wrangler secret list --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"       # read only: names only
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"
```
- **Expected:** "No targets deployed".
- **Do not** run `secret put`: the key is already on the coordinator.

### 3. Verify the coordinator (read only)
- `deployments list`: the new version at 100%.
- `secret list`: the **same names** as before.
- The dashboard shows no route, custom domain, `workers.dev` URL or preview URL for the coordinator.
- On the acceptance app (while its hostname is attached), Markets still shows prices or the usual "unavailable" state. The acceptance app is unchanged.

### 4. Manual Alpha deployment of the merged main
- Follow [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) with the same SHA.
- Before approving the environment, read the build summary: the dry run lists `env.MARKET_QUOTES (zigoals-acctest-market-coordinator#QuoteService)` and `env.ZIGOALS_MARKET_QUOTES_MODE ("durable-v1")`, and nothing else besides `WORKER_SELF_REFERENCE` and `ASSETS`.
- **After the run, the summary line "Live prices"** reads VERIFIED or UNAVAILABLE. **Neither** changes the deployment result. If it reads UNAVAILABLE, go to [UNAVAILABLE](#if-prices-are-unavailable) below; do not redeploy.
- **The deploy token:** the Alpha token has Account / Workers Scripts / Edit on the account. Whether Cloudflare needs more for a service binding to another Worker of the same account is **UNVERIFIED**. If the upload is refused for a binding reason, the run fails with **no new version live**: the old Alpha keeps serving. Report the refusal text; do not widen the token on a guess.

### 5. Check prices on alpha.zigoals.app
1. **Markets:** BTC shows a price with its observed time and source.
2. **Wealth:** a holding priced in USD shows a value.
3. **BTC detail:** the history chart loads.
4. **Then the manual verifier** (requires VERIFIED; writes evidence to a new directory):
   ```sh
   mkdir -p ~/zigoals-evidence
   node scripts/verify-hosted-alpha.mjs ~/zigoals-evidence/alpha-prices-$(date -u +%Y%m%d%H%M)   # a new directory each run
   ```
   Its `marketProbe` field holds only closed-vocabulary values: `result`, `pair`, `failure`.

### 6. Remove the old app-side key
```sh
pnpm --filter @zigoals/web exec wrangler secret list --name zigoals-alpha            # read only: is COINGECKO_DEMO_API_KEY still listed?
pnpm --filter @zigoals/web exec wrangler secret delete COINGECKO_DEMO_API_KEY --name zigoals-alpha   # only if it is listed
pnpm --filter @zigoals/web exec wrangler secret list --name zigoals-alpha            # read only: it is gone
```
- **The old key is still there after the deploy.** A deploy without `--secrets-file` still asks Cloudflare to keep the Worker's existing secrets: Wrangler 4.147.0 sends `keep_bindings: ["secret_text", "secret_key"]`, captured offline (`scripts/fixtures/wrangler-output/4.147.0/upload-metadata-no-secrets-file.json`). Delete it here.
- Deleting a secret creates a new Worker version with the same code. Check `deployments list` once more.
- Then, in GitHub, **Settings → Environments → alpha**, delete the environment secret `COINGECKO_DEMO_API_KEY`. No workflow reads it now.

### 7. Optional: regenerate the CoinGecko Demo key
The old key passed through the app path and GitHub. To end that exposure:
1. Regenerate it in the CoinGecko Developer Dashboard.
2. Store it in Bitwarden.
3. Set it **on the coordinator only**, typing the value at the prompt:
   ```sh
   pnpm --filter @zigoals/web exec wrangler secret put COINGECKO_DEMO_API_KEY --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"
   ```

   Prices are unavailable for a few seconds in between.
4. Repeat step 5.

### 8. Log out
```sh
pnpm --filter @zigoals/web exec wrangler logout
```
Close the dashboard browser profile.

## Rollback
- **The Alpha:** roll back to the version written down in the workflow's rollback evidence, per [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md), "Failures and recovery". Prices go back to "unavailable", as before this rollout. Nothing else on the Alpha changes.
  - **If you already did step 6,** the old version has no key. That changes nothing visible: the old app never called CoinGecko in production either (its market route answered "unavailable" without a binding).
- **The coordinator:** `wrangler rollback <version from step 2> --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"`. Its new rows and fields are additive, and older code ignores them. The Alpha keeps working against the older coordinator: the binding and envelope predate Session S.

## If prices are UNAVAILABLE
UNAVAILABLE is a safe state: cached prices and manual valuation keep working, and nothing is charged. **Never redeploy blindly**: a redeploy changes nothing in a shared budget or an open breaker, and it costs a new rollback point.

1. **Wait** 5–10 minutes and probe again (`node scripts/verify-hosted-alpha.mjs <new dir>`, or the Markets page). Breakers close after their cooldown, and per-minute limits reset.
2. **Read the category** in the probe's `failure` (or the workflow summary):

   | `failure` | Meaning | What to check (read only) |
   |---|---|---|
   | `LOCAL_BUDGET` | A local budget refused it: the daily row budget, the monthly or per-minute credits, a client share, or the setup gate (unbound coordinator, or a `MARKET_POLICY` outside its window) | Cloudflare dashboard → Workers → `zigoals-acctest-market-coordinator` → Durable Objects metrics (rows written today, compared with `dailyRowBudget`); CoinGecko Developer Dashboard → usage this month; the policy window date |
   | `LOCAL_QUEUE` | Too many reads waiting at once | Wait; it clears within seconds |
   | `THROTTLED`, `UPSTREAM_5XX`, `TIMEOUT`, `NETWORK` | CoinGecko refused or failed, or a breaker is open after repeated failures | CoinGecko status page; wait for the cooldown |
   | `AUTHENTICATION`, `ENTITLEMENT` | The key is wrong, revoked or out of plan | CoinGecko dashboard: the key and plan. Then `secret list` on the **coordinator** (names only) |
   | `MALFORMED`, `UNSUPPORTED`, `UNKNOWN` | An unexpected answer | Keep the evidence and report it; do not retry in a loop |

3. **Only change something** when the read-only check names a cause:
   - a regenerated key (step 7);
   - a regenerated policy (ACTIVATION Stage 6);
   - a reviewed `dailyRowBudget` change (below).
4. **If the probe answer is MALFORMED** (not a price envelope at all), the deployment summary says so and the run ends in NEEDS_OWNER_REVIEW. Inspect it like any failed smoke; roll back only by your decision.

## Advice: `dailyRowBudget` on Workers Paid (no change made)
**Facts** (Cloudflare Durable Objects pricing, read 2026-10-04: https://developers.cloudflare.com/durable-objects/platform/pricing/):
- **Rows written:** Workers Free allows 100,000 a day. Workers Paid includes "First 50 million / month", then $1.00 per million.
- **Requests:** Workers Paid includes 1 million a month, then $0.15 per million.

**Measured** (Session R1, `market-request-cost.test.ts`):
- a cold 64-pair request writes about 146 rows, roughly 2.3 rows per new pair;
- cached requests write none.

**Recommendation: `dailyRowBudget: 100000`** in the private `MARKET_POLICY`, set when you next regenerate it (around 28 October).
- **Volume:** 100,000 a day is at most about 3.1 million rows a month, about 6% of the included 50 million. That leaves plenty for private sync, food, sign-in admission and the acceptance app, which share the account's allowance.
- **Capacity:** it covers about 40,000 new pairs a day, far more than the CoinGecko Demo credits allow. On a normal day the provider budget, not rows, is what stops new work. The row budget stays as the abuse ceiling.
- **Worst case if fully spent every day:** inside the included amount, $0. If the rest of the account had already used it all, about $3 a month.
- **Side effects:** the per-client daily share of new works becomes ⌊100,000/16⌋ = 6,250, and the cancellation fences 1,562 a day (195 per client).
- **Keep the default (20,000)** while the account is on Workers Free: 100,000 there is the whole free daily allowance.

Raising it is a policy value, not code. Regenerate the policy with `scripts/run11/market-policy.mjs`, set it as the coordinator's `MARKET_POLICY`, and record the change in your private checklist.
