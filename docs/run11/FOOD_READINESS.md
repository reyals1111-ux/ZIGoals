# Food lookup readiness (#6): service side, 2026-09-29

Status: **no provider call, account, contact or deployment was made.** The food-lookup Worker, parser and UI are unchanged. This page rechecks them against Open Food Facts (OFF) documentation for Stage 6.

## Evidence limits (read first)
- The official OFF pages (`openfoodfacts.github.io`, `world.openfoodfacts.org`) are **blocked by this session's network egress**, both through direct fetch and curl. They could not be opened.
- A web search restricted to the official OFF domains returned result summaries that name the official pages. These are labelled **SEARCH-SUMMARY** below. They are not full-page reads, and conflicting summaries are recorded as conflicting.
- Anything not covered by either source is **UNVERIFIED**. Nothing was filled in from memory.
- The last full read of the official docs is Run10's, on 2026-09-23 ([Run10 food evidence](../run10/FOOD_EVIDENCE.md)). That is where the v3.4 pin comes from.

## Fields the service reads (verified against the source)
| Where | What |
|---|---|
| `workers/food-lookup/worker.mjs` | `GET https://world.openfoodfacts.org/api/v3.4/product/<barcode>?fields=code,product_name,brands_tags,nutrition_data_per,nutriments`. Sends only `User-Agent: $FOOD_USER_AGENT` and `accept: application/json`, `redirect: manual`, with an 8 s timeout and a 128 kB response limit. |
| `apps/web/lib/food-lookup.ts` `parseFoodProduct` | `status`, `product.code` (must match the requested barcode after normalization), `product_name`, `brands_tags`, `nutriments["energy-kcal_100g" \| "proteins_100g" \| "carbohydrates_100g" \| "fat_100g"]`. Only explicit `_100g` numbers are accepted; a missing or invalid value stays `null` (unknown), never 0. `nutrition_data_per` is requested but not interpreted. |
| Tests that pin it | `apps/web/lib/food-lookup.test.ts` (parser), `scripts/run10/food-runtime.test.mjs` (shared budget, cache, restart, destination) and new `scripts/run11/food-user-agent.test.mjs` (the User-Agent template is sent unchanged with only these fields; an unusable value fails closed before any call). |

**Schema drift check:** Run10 recorded that API 3.6 changed nutrition and tags, and deliberately pinned v3.4 with no guessed conversion. Whether v3.4 is still served, and whether anything changed after 2026-09-23, is **UNVERIFIED** (the change log could not be opened). No parser change is justified without that evidence. A future v3.4 retirement would surface as `PROVIDER_UNAVAILABLE` or a parse failure, never as zero nutrients.

## Rate limits and the Worker budget
- **Documented limit:**
  - **SEARCH-SUMMARY, conflicting.** A summary attributed to the official API introduction gives 15 requests/min/IP for product reads and 10/min for search. Other summaries give 100/min for product reads, 10/min for search and 2/min for facets.
  - Exceeding the limit may lead to an IP ban (SEARCH-SUMMARY).
  - Which figure is current is **UNVERIFIED**.
- **Worker budget (verified in source):**
  - One shared Durable Object (`shared-provider-budget-v1`) admits **one provider request per 12 s**, at most 5 per minute for the whole deployment, reserved before I/O and not refunded on failure.
  - A 429 or 503 from OFF sets a **60 s** backoff.
  - Successful products are cached for **24 h**, capped at 256 entries.
  - Only product reads are made; no search or facet calls.
- **Fit:** 5 per minute is below both documented figures (15 and 100). The 12 s spacing (`worker.mjs`, `next=now+12000`) needs no change. Because the limit is per IP, Cloudflare egress IPs are shared with other tenants; the 60 s backoff is the mitigation.

## FOOD_USER_AGENT template
OFF asks for a custom User-Agent in the form `AppName/Version (ContactEmail)`; its example is `MyApp/1.0 (myapp@example.com)` (SEARCH-SUMMARY). The Worker accepts only `^ZIGoals/[^\r\n]{1,160}$`.

```
ZIGoals/<app version, e.g. 0.1.0 from apps/web/package.json> (<owner contact email>)
```
- Put it in the private food config (`*.acctest.owner.jsonc`, Stage 4) as the `FOOD_USER_AGENT` var. It is not a secret, but the contact is private, so never commit, log or report the filled value.
- Use a contact you are willing to have OFF reach you at, for example a dedicated alias. Choosing it is an owner decision.
- `scripts/run11/food-user-agent.test.mjs` proves that a filled template is sent unchanged. A missing value, another app name, CR/LF, or more than 160 characters after `ZIGoals/` returns `PROVIDER_SETUP_REQUIRED` without contacting OFF.

## Licensing and attribution
- **Terms (SEARCH-SUMMARY of the official terms-of-use page):**
  - database under ODbL;
  - individual contents under DbCL;
  - product images under CC BY-SA, possibly with third-party rights;
  - reuse conditions are attribution and share-alike (a combined database must stay open).
- **What the app shows today** (`apps/web/components/health/barcode-food-lookup.tsx:42`, below the lookup): links to "Open Food Facts" (https://world.openfoodfacts.org), "ODbL database" (ODbL 1.0) and "DbCL contents" (DbCL 1.0), the text "No provider images used." and a "Scanner notices" link. Food snapshots keep `source: 'Open Food Facts'` and `apiVersion: '3.4'`.
- **Assessment:** attribution of the source and both licences is visible where OFF data is used. No images are fetched or shown, so the image licence does not apply. **No UI follow-up is required** on current evidence.
- **Open owner question (not a code gap):** whether private per-user food snapshots count as a "derived database" under ODbL share-alike is a legal reading, **UNVERIFIED** and not decided here.

## Owner steps (Stage 6, food)
1. Choose the contact and fill the template. Put it only in the private food config.
2. Before activation, open the official API page and terms from a normal browser. Confirm the current product-read limit, that v3.4 is still served, and the attribution wording. Record the check date.
3. If the limit is below 5/min, raise the Worker spacing in a reviewed PR before activation.
