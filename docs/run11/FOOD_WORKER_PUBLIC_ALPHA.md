# Food lookup on the public Alpha: owner steps (Session AK Part 1b, ADR-036 Q5, A10)

> **Deploy the food Worker FIRST, then Alpha #53.** Since Session AK the Alpha binds `FOOD_LOOKUP` →
> `zigoals-acctest-food-lookup` (`apps/web/wrangler.alpha.jsonc`). Cloudflare refuses to deploy a Worker whose service
> binding names a Worker that does not exist (error **10056 "Binding not found"**; Cloudflare's service-binding docs:
> "the target Worker … must be deployed first … Otherwise … deployment will fail"). `pnpm check:deploy-configs` and the
> deploy script's source step print this order too.

**Status (Session AK, 31 Oct):** the Worker change (Open Food Facts → USDA FoodData Central) and the app binding are
built and tested locally (`scripts/run11/food-*.test.mjs`, `scripts/check-deployment-configs.test.ts`). Nothing here has
run against Cloudflare. Until the Worker is deployed with this code and the Alpha is deployed with the binding, the Alpha
says "Barcode lookup is being switched on" and the person's own food library and the offline food library still work.

## What the chain does
1. **On the device, before any request:** the person's own food library (a barcode saved before is found at once).
2. **Open Food Facts** (`world.openfoodfacts.org`), as since Run 11: one request per 12 s for the deployment, per-client
   shares, 24 h cache, the `FOOD_USER_AGENT` header.
3. **Swiss food database (FSVO)** for searches by name (Session AJ).
4. **USDA FoodData Central Branded Foods** by GTIN (`api.nal.usda.gov`), only when Open Food Facts says "not found" and
   only with the `FDC_API_KEY` secret; without it the step is skipped and nothing is sent. One request per 4 s, its own
   back-off, the same client shares and user agent.
5. **"Not found, add it yourself"**: the app offers the private custom food and the offline library search.
Every answer names its source; FDC answers carry FDC's citation (public domain, CC0 1.0).

## Steps
1. **Secrets on the food Worker** (the acceptance stack's private config, `workers/food-lookup/wrangler.acctest.owner.jsonc`):
   ```sh
   pnpm --filter @zigoals/web exec wrangler secret put FDC_API_KEY --config "$PWD/workers/food-lookup/wrangler.acctest.owner.jsonc"
   ```
   Paste the key from Bitwarden at the prompt (never in a file, a config's `vars`, a report or a chat). `FOOD_USER_AGENT`
   stays as set in Run 11; check it with `wrangler secret list` (names only). If it is missing:
   ```sh
   pnpm --filter @zigoals/web exec wrangler secret put FOOD_USER_AGENT --config "$PWD/workers/food-lookup/wrangler.acctest.owner.jsonc"
   ```
   with a value of the form `ZIGoals/<version> (contact: hello@zigoals.app)` (`docs/run11/FOOD_READINESS.md`).
2. **Deploy the food Worker** from the merged `main`:
   ```sh
   pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/food-lookup/wrangler.acctest.owner.jsonc"
   ```
   Record the version id and the rollback id in STATUS.
3. **Deploy Alpha #53** through the Manual Alpha workflow as usual (the binding is in the reviewed config).
4. **Verify:**
   - Health → Foods → "Look up barcode" with `3017620422003` (a common Open Food Facts product): a match card that
     names Open Food Facts.
   - A US product Open Food Facts lacks: a match card that names USDA FoodData Central with its citation (needs the key).
   - An unknown barcode such as `00000000`: "Product not found in the food databases. Add it yourself…".
   - "Search foods by name" → `apple`: offline library results (Ciqual, CoFID) first, then the Swiss database.
   - The hosted verifier's food stage (it skips while the binding answers 503).

## Roll back
- Food Worker: `wrangler rollback` to the recorded previous version (the app's answers stay the same shape).
- App binding: revert the `TIER 3 (deploy config)` commit `8b0ae98c` and deploy; the barcode lookup answers 503 again
  ("being switched on").
