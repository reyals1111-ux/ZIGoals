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
  Session U adds an optional partition of the daily rows: see [Two apps, one budget](#two-apps-one-budget).
- **Cached prices keep serving**, and manual valuation always works. Nothing fails open.
- **Per-client limits** apply to every public market route (`apps/web/lib/server/market-route-coverage.test.ts`): one address group (an IPv4 address or an IPv6 /48) gets at most a quarter of the per-minute and in-flight limits, a 31st of the monthly credits per day, and a 16th of the day's new works. Cancellation fences are limited too: a 64th of the row budget per day, and an eighth of that per client.
- **The policy window** ends **2026-10-31 16:00 UTC**. After it the coordinator refuses every price, cached ones too, **for both apps**, until the next period's policy is deployed. See [Next policy period](#next-policy-period) below: prepare around 28 October, switch right after the boundary.

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
   | `LOCAL_BUDGET` | A local budget refused it: the daily row budget, the monthly or per-minute credits, a client share, or the setup gate (unbound coordinator, or a `MARKET_POLICY` outside its window). **After the window ends, cached prices are refused too**, until the policy is regenerated | Cloudflare dashboard → Workers → `zigoals-acctest-market-coordinator` → Durable Objects metrics (rows written today, compared with `dailyRowBudget`); CoinGecko Developer Dashboard → usage this month; the policy window date |
   | `LOCAL_QUEUE` | Too many reads waiting at once, **or a breaker open after repeated provider failures** (an open breaker shows here, not as the provider's category) | Wait; a queue clears within seconds, a breaker after its cooldown (at most 5 minutes with the template policy) |
   | `THROTTLED`, `UPSTREAM_5XX`, `TIMEOUT`, `NETWORK` | CoinGecko refused (429) or failed (5xx, timeout, connection) this read | CoinGecko status page; wait |
   | `AUTHENTICATION` | The coordinator has no key, or CoinGecko answered 401 (the key is wrong or revoked) | CoinGecko dashboard: the key. Then `secret list` on the **coordinator** (names only) |
   | `ENTITLEMENT` | In the vocabulary, but **nothing produces it today**: a plan refusal shows as `UNKNOWN` | — |
   | `MALFORMED`, `UNSUPPORTED`, `UNKNOWN` | An unexpected answer. `UNKNOWN` includes **every CoinGecko 403** (a generic refusal proves neither key nor plan), a 404 or other status, and coordinator refusals outside this table | Keep the evidence and report it; do not retry in a loop. Before Session U's fix, `UNKNOWN` was the missing User-Agent (below) |

3. **Only change something** when the read-only check names a cause:
   - a regenerated key (step 7);
   - a regenerated policy (ACTIVATION Stage 6);
   - a reviewed `dailyRowBudget` change (below).
4. **If the probe answer is MALFORMED** (not a price envelope at all), the smoke fails and the run ends in NEEDS_OWNER_REVIEW. The summary's "Live prices" line then reads **NOT_CHECKED** (no market row was recorded); the reason is the smoke error in `deployment.json`. Inspect it like any failed smoke; roll back only by your decision.

## Session U: why deploy #28 showed UNAVAILABLE (UNKNOWN), and the fix
**Cause** (evidence labels in STATUS, Session U Part 2a):
- CoinGecko refuses a request that has no User-Agent: `403`, "Please add a descriptive User-Agent to your request" (real provider, keyless, 2026-10-04 22:36 UTC, both `/simple/price` and `/simple/token_price`).
- Workers' `fetch` sends no User-Agent, and the coordinator set none. A 403 is `UNKNOWN` by design.
- ZIG kept working through its documented token-price fallback, which CoinGecko serves from a different backend (`x-data-source: 1.0`; `/simple/price` comes through CloudFront, `x-data-source: 2.0`). In production only that fallback got through.
- `scripts/run11/market-user-agent.test.mjs` reproduces the live answer byte for byte in workerd (503, `PROVIDER_UNAVAILABLE`, `UNKNOWN`, the same error text) and passes with the fix.
- **Not confirmed with the coordinator's own key** (no session uses it). Your probe after the redeploy below confirms it.

**Fix:** every CoinGecko read sends `User-Agent: ZIGoals/1.0 (+https://zigoals.app)` (`apps/web/lib/server/provider-user-agent.ts`). It names the app and its public site only. CoinGecko answered 200 to that exact value (keyless, 2026-10-04 22:38 UTC).

**Owner steps after the merge** (the coordinator does the provider reads, so it carries the fix; the Alpha needs no redeploy for prices):
1. Steps 1–3 above at the merged main: ops checkout, `deployments list` (write down the live version: today `4754e86f-42c2-4ea3-8373-3c0a7031036b`, your rollback), `deploy`, verify.
2. Probe once: `node scripts/verify-hosted-alpha.mjs <new dir>` (it requires VERIFIED), or the Markets page.
3. **VERIFIED:** done; record it. **Still `UNKNOWN`:** roll back only if something else broke (`wrangler rollback 4754e86f-42c2-4ea3-8373-3c0a7031036b --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"`), keep the evidence and report it: the cause is then on CoinGecko's side for the key, and the CoinGecko dashboard is the next read-only check.

## Two apps, one budget
Session U Part 2e. Off until you set it; nothing changes without it.
- **What it does:** each app labels its coordinator requests from its own bindings: the acceptance app (it has `PRIVATE_SYNC`) as `friends`, the public Alpha as `public`. A browser cannot change the label. With `"partition": {"publicPercent": N}` in `MARKET_POLICY`, the public Alpha stops starting new price work once its rows reach N% of `dailyRowBudget` that UTC day (it answers `LOCAL_BUDGET`; cached prices keep serving); the acceptance app keeps the rest.
- **Order:**
  1. the coordinator from a main that has Session U (it understands the label);
  2. the acceptance app's final redeploy (22–24 October, [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md)): before it, the Stage 7 build sends no label and counts as public;
  3. only then a policy with `partition`: add `"partition": {"publicPercent": 50}` to the owner file's `coordinator` block and regenerate (`market-policy.mjs`, or the next period with `next-market-policy.mjs`), then `make-private-configs.mjs --set-market-policy` and the coordinator `deploy`.
- **Suggested value:** 50 (an owner decision; 10 to 90 are accepted). `inspect` on the account object reports `publicRowsToday` and `publicRowBudget` when it is set.
- **Public cold work (Part 2f, on by default):** all public callers together may start at most an eighth of `dailyRowBudget` new works per UTC day (2,500 with 20,000), on top of each client's share. Cached prices and waiting for a fetch in flight never count; the acceptance app is not capped by it. A refused request answers `LOCAL_BUDGET` until the next UTC day. Set `"publicColdWorks": N` in the owner file's `coordinator` block to change it (1 to 10,000,000). Unknown assets are refused once an authoritative catalog index exists (Session S; the first catalog load writes it).
- **Rollback:** a policy without `partition` (regenerate without it), or roll the coordinator back; the label is ignored by older coordinators.

## Next policy period
The coordinator's `MARKET_POLICY` covers one CoinGecko billing period (exact window). **It cannot take the next period early:** the coordinator refuses a period that has not started, and the old one refuses everything once it has ended (Session U found this; the earlier advice to "regenerate around 28 October" could not work). So:

- **Around 28 October (read only): prepare.** In the ops checkout, with the current filled owner file:
  ```sh
  node scripts/run11/next-market-policy.mjs --owner-file <name>.market-policy.owner.json --window-end <next reset from the CoinGecko dashboard, UTC, e.g. 2026-11-30T16:00:00Z> --credits-used 0 [--daily-row-budget 100000]
  ```
  - A dry run: it checks the next period's figures as of its start, prints the period and every step below, and writes nothing.
  - `--daily-row-budget 100000` is the [advice below](#advice-dailyrowbudget-on-workers-paid-no-change-made) for Workers Paid; leave it out to keep 20,000.
- **On 31 October, at or after 16:00 UTC: switch.** Run the command the dry run printed (with `--credits-used` from the dashboard for the new period, `--write --out <name>.market-policy.private.json`), then:
  1. `node scripts/run11/make-private-configs.mjs --set-market-policy <name>.market-policy.private.json`
  2. `wrangler login`, `deployments list` on the coordinator (read only: your rollback), then `deploy` (step 2 above, the same commands).
  3. `node scripts/verify-hosted-alpha.mjs <new dir>` prints "Market policy period ends 2026-11-30T16:00:00.000Z" (or your new end). Then `wrangler logout`.
  4. Set the owner file's `provider.reset` to the new period, as the tool printed, for the period after.
- **Between 16:00 UTC and step 2 every price is refused** (LOCAL_BUDGET), on both apps. Manual valuation keeps working. Keep the gap short; nothing else is affected.
- `--write` refuses before 16:00 UTC; it writes only the policy file (inside the checkout, ignored by git, 0600, never overwritten) and runs no command.
- **Where you see the end:** the Manual Alpha workflow summary ("Market policy period ends …", with a **Warning** below 7 days) and `verify-hosted-alpha.mjs`. Both read `GET /api/market-status`; "not reported" means the coordinator predates Session U.

## Advice: `dailyRowBudget` on Workers Paid (no change made)
**Facts** (Cloudflare Durable Objects pricing, read 2026-10-04: https://developers.cloudflare.com/durable-objects/platform/pricing/):
- **Rows written:** Workers Free allows 100,000 a day. Workers Paid includes "First 50 million / month", then $1.00 per million.
- **Requests:** Workers Paid includes 1 million a month, then $0.15 per million.

**Measured** (Session R1, `market-request-cost.test.ts`):
- a cold 64-pair request writes about 146 rows, roughly 2.3 rows per new pair;
- cached requests write none.

**Recommendation: `dailyRowBudget: 100000`** in the private `MARKET_POLICY`, set with the next period's policy (`--daily-row-budget 100000`, [Next policy period](#next-policy-period)).
- **Volume:** 100,000 a day is at most about 3.1 million rows a month, about 6% of the included 50 million. That leaves plenty for private sync, food, sign-in admission and the acceptance app, which share the account's allowance.
- **Capacity:** it covers about 40,000 new pairs a day, far more than the CoinGecko Demo credits allow. On a normal day the provider budget, not rows, is what stops new work. The row budget stays as the abuse ceiling.
- **Worst case if fully spent every day:** inside the included amount, $0. If the rest of the account had already used it all, about $3 a month.
- **Side effects:** the per-client daily share of new works becomes ⌊100,000/16⌋ = 6,250, and the cancellation fences 1,562 a day (195 per client).
- **Keep the default (20,000)** while the account is on Workers Free: 100,000 there is the whole free daily allowance.

Raising it is a policy value, not code: `coordinator.dailyRowBudget` in the owner file (Session U; absent means 20,000), or `--daily-row-budget` below. Record the change in your private checklist.
