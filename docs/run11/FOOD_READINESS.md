# Food lookup readiness (#6): service side, 2026-09-29

Status: **no provider call, account, contact or deployment was made.** The food-lookup Worker, parser and UI are unchanged. This page rechecks them against Open Food Facts (OFF) documentation for Stage 6.

## Evidence limits (read first)
- The official OFF pages (`openfoodfacts.github.io`, `world.openfoodfacts.org`) are **blocked by this session's network egress**, both through direct fetch and curl. They could not be opened.
- A web search restricted to the official OFF domains returned result summaries that name the official pages. These are labelled **SEARCH-SUMMARY** below. They are not full-page reads, and conflicting summaries are recorded as conflicting.
- On 2026-09-30 the owner's own chat session read the official API page and supplied its rate-limit statements. Those are labelled **doc-verified (owner's chat session)** below.
- On 2026-10-01 (UTC) the owner checked the live API, the terms of use and the API docs in a normal browser (details below). Those are labelled **owner browser check, 2026-10-01**.
- Anything not covered by these sources is **UNVERIFIED**. Nothing was filled in from memory.
- The last full read of the official docs is Run10's, on 2026-09-23 ([Run10 food evidence](../run10/FOOD_EVIDENCE.md)). That is where the v3.4 pin comes from.

## Fields the service reads (verified against the source)
| Where | What |
|---|---|
| `workers/food-lookup/worker.mjs` | `GET https://world.openfoodfacts.org/api/v3.4/product/<barcode>?fields=code,product_name,brands_tags,nutrition_data_per,nutriments`. Sends only `User-Agent: $FOOD_USER_AGENT` and `accept: application/json`, `redirect: manual`, with an 8 s timeout and a 128 kB response limit. |
| `apps/web/lib/food-lookup.ts` `parseFoodProduct` | `status`, `product.code` (must match the requested barcode after normalization), `product_name`, `brands_tags`, `nutriments["energy-kcal_100g" \| "proteins_100g" \| "carbohydrates_100g" \| "fat_100g"]`. Only explicit `_100g` numbers are accepted; a missing or invalid value stays `null` (unknown), never 0. `nutrition_data_per` is requested but not interpreted. |
| Tests that pin it | `apps/web/lib/food-lookup.test.ts` (parser), `scripts/run10/food-runtime.test.mjs` (shared budget, cache, restart, destination) and new `scripts/run11/food-user-agent.test.mjs` (the User-Agent template is sent unchanged with only these fields; an unusable value fails closed before any call). |

**Schema drift check:** Run10 recorded that API 3.6 changed nutrition and tags, and deliberately pinned v3.4 with no guessed conversion.
- **v3.4 is still served: verified 2026-10-01 (owner browser check).**
  - `GET /api/v3.4/product/3017624010701` with our exact fields returned status `"success"`, `product_name` "Nutella" and per-100g `nutriments`.
  - The API docs list v3 as current, with v3.6 the latest (a new tags schema), and v2 as deprecated. They carry **no v3.4 deprecation notice**.
- No parser change is needed for v3.4. The move to v3.6 is an open item (below).
- A future v3.4 retirement would surface as `PROVIDER_UNAVAILABLE` or a parse failure, never as zero nutrients.

## Rate limits and the Worker budget
**Documented limits** (**doc-verified: official page, read via the owner's chat session, 2026-09-30**, from https://openfoodfacts.github.io/openfoodfacts-server/api/):
- **15 requests/min per IP for all product reads** (`GET /api/v*/product` or a product page). This is the binding limit for this Worker.
- 10 requests/min per IP for search. The Worker makes no search or facet calls.
- Exceeding these limits can lead to an IP ban.
- When requests come directly from users (for example a mobile app), the limits apply per user. Ours do not: every lookup goes out through the one server-side Worker, so the limit applies to its egress IP, shared by all our users. This is why the budget is one shared Durable Object.
- Separate global limits, regardless of IP, return HTTP 503.
- The 100/min figure seen in the earlier search summaries appears only in third-party sources. It is not the official limit.

**Worker budget (verified in source, `workers/food-lookup/worker.mjs`):**
- One shared Durable Object (`shared-provider-budget-v1`) admits **one provider request per 12 s**: at most 5 per minute for the whole deployment, a third of the official 15/min. The slot is reserved before I/O and not refunded on failure.
- Successful products are cached for **24 h**, capped at 256 entries; cache hits make no provider call. Not-found and error responses are not cached.

**Throttling from shared egress:** Cloudflare Workers call out from egress IPs that other Cloudflare customers may share, so OFF can answer 429 (per-IP limit) or 503 (global limit) even when we are far below our own budget. Both are handled the same way, pinned by `scripts/run11/food-throttle.test.mjs`:
- **Worker:** an upstream 429 or 503 sets a **60 s** backoff on the shared budget and returns `429 {error:'PROVIDER_THROTTLED', retryAfter:60}`. Other barcodes are then refused locally (`TRY_LATER`) with no further provider call.
- **App route:** a Worker 429 becomes `TRY_LATER` (`apps/web/app/api/food-lookup/route.ts`).
- **UI:** the user sees "Lookup is cooling down. Wait a minute and retry." (`barcode-food-lookup.tsx:32`). "Product not found" appears only for a real 404, so a throttled or overloaded provider is never presented as a missing product. Network errors and other upstream failures show "Food lookup is unavailable…".

**Fit for a ~20-person friends Alpha:** suitable.
- **Capacity:** 5 misses/min is 7,200/day, far above a plausible 20-person load (for example 5 new products per person per day = 100 misses/day), and repeat scans of the same barcode hit the 24 h cache.
- **Headroom:** 5/min leaves two thirds of the per-IP limit for retries and for other tenants on a shared egress IP. Backoff is shared, so one throttle pauses everyone for 60 s rather than letting 20 users each hit OFF.
- **Queue (Session D, 2026-09-30, [PR #50](https://github.com/reyals1111-ux/ZIGoals/pull/50)):** a new barcode that finds the 12 s slot taken now waits for the next slot instead of failing at once. Only one lookup waits at a time and never for more than 15 s; a third new barcode inside that window, or any new barcode during a 60 s backoff, still gets an immediate honest `429 TRY_LATER` with the seconds until the next slot ("cooling down" in the app). A waiting lookup re-checks the cache (another person may have fetched the same product) and the backoff (it returns `PROVIDER_THROTTLED` if the provider throttled us meanwhile) before calling Open Food Facts. The shared 5/min budget, the 60 s backoff and "never not found for a throttled lookup" are unchanged; pinned by `scripts/run11/food-queue.test.mjs` and `scripts/run10/food-runtime.test.mjs`. So two people looking up different uncached barcodes within 12 s both get their product; the second waits up to 12 s (the button shows the lookup as busy).
- **Possible follow-up, not changed here:** short negative caching of 404s, so repeated scans of an unknown product do not spend the budget. A Worker change for a separate reviewed PR.

## FOOD_USER_AGENT template
OFF asks for a custom User-Agent in the form `AppName/Version (ContactEmail)`; its example is `MyApp/1.0 (myapp@example.com)` (SEARCH-SUMMARY). The Worker accepts only `^ZIGoals/[^\r\n]{1,160}$`.

```
ZIGoals/<app version, e.g. 0.1.0 from apps/web/package.json> (<owner contact email>)
```
- Put it in the private food config (`*.acctest.owner.jsonc`, Stage 4) as the `FOOD_USER_AGENT` var with `node scripts/run11/make-private-configs.mjs --set-food-user-agent "…"` ([ACTIVATION.md](ACTIVATION.md) Stage 6, step 4). It refuses anything but this template's form and never prints the value. It is not a secret, but the contact is private, so never commit, log or report the filled value.
- Use a contact you are willing to have OFF reach you at, for example a dedicated alias. Choosing it is an owner decision.
- `scripts/run11/food-user-agent.test.mjs` proves that a filled template is sent unchanged. A missing value, another app name, CR/LF, or more than 160 characters after `ZIGoals/` returns `PROVIDER_SETUP_REQUIRED` without contacting OFF.

## Licensing and attribution
- **Terms (owner browser check of the official terms of use, 2026-10-01; it matches the earlier SEARCH-SUMMARY):**
  - database under ODbL;
  - individual contents under DbCL;
  - product images under CC BY-SA, possibly with third-party rights;
  - reuse conditions are attribution and share-alike (a combined database must stay open).
- **What the app shows today** (`apps/web/components/health/barcode-food-lookup.tsx:42`, below the lookup): links to "Open Food Facts" (https://world.openfoodfacts.org), "ODbL database" (ODbL 1.0) and "DbCL contents" (DbCL 1.0), the text "No provider images used." and a "Scanner notices" link. Food snapshots keep `source: 'Open Food Facts'` and `apiVersion: '3.4'`.
- **Assessment, verified 2026-10-01 (owner browser check):** attribution of the source and both licences is visible where OFF data is used, which matches the terms. No images are fetched or shown, so the image licence (CC BY-SA) does not apply. **No UI follow-up is required.**
- **Open owner question (not a code gap):** whether private per-user food snapshots count as a "derived database" under ODbL share-alike is a legal reading, **UNVERIFIED** and not decided here.

## Owner steps (Stage 6, food)
1. Choose the contact and fill the template. Put it only in the private food config.
2. The product-read limit is settled: 15/min per IP, per the official page read on 2026-09-30. **Done 2026-10-01 (owner browser check):** API v3.4 is served and the attribution matches the terms (above). Repeat this check if activation slips by weeks.
3. If OFF ever lowers the product-read limit below the Worker's 5/min, widen the 12 s spacing in a reviewed PR before relying on lookups.

## Open items
1. **ODbL "derived database" (owner, legal reading): open.** Do private per-user food snapshots count as a derived database under ODbL share-alike? Unchanged by the 2026-10-01 check (see Licensing and attribution).
2. **Move from v3.4 to v3.6 (the new tags schema) in a future session.** v3.4 is still served with no deprecation notice (2026-10-01), so there is no urgency. The move needs:
   - a read of the v3.6 docs;
   - parser and fixture updates for `brands_tags` and the nutrition fields, still with no guessed conversion;
   - a re-run of `food-lookup.test.ts`, `food-runtime.test.mjs` and `food-user-agent.test.mjs`;
   - the snapshots' `apiVersion` moving from `'3.4'` to `'3.6'` for new lookups only.
