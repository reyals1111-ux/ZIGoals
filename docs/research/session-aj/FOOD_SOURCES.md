# Free food databases beyond Open Food Facts (Session AJ, item J5)

Research only, written 2026-10-29. Nothing in the app or the Worker changed. "Checked" means the request was run from
the build sandbox on 2026-10-29 and the quoted fields come from the real response. "Docs" means the provider's own
page, read the same day. **Unverified** marks a claim from a secondary source, or one this session could not confirm.

## Today

`workers/food-lookup/worker.mjs` accepts only `GET /lookup?code=<8, 13 or 14 digits>`. A single Durable Object
(`shared-provider-budget-v1`) fetches
`https://world.openfoodfacts.org/api/v3.4/product/<code>?fields=code,product_name,brands_tags,nutrition_data_per,nutriments`
with the required `FOOD_USER_AGENT` (`ZIGoals/…`), `redirect:'manual'`, an 8 s timeout and a 128 kB body cap. Its
limits are:

- one upstream request per 12 s across the whole deployment, with at most one lookup waiting, for up to 15 s;
- a 60 s pause after a 429 or 503;
- per client (an IPv4 address or IPv6 /48, hashed into one of 4,096 buckets under a key that changes daily): 3 lookups
  in any rolling minute and 120 per UTC day;
- found products cached 24 h, unknown barcodes 1 h, at most 256 kept.

The Health screen credits "Open Food Facts · ODbL database · DbCL contents" (`apps/web/components/health/barcode-food-lookup.tsx`).

Open Food Facts' current published limits are **15 product reads/min/IP** and **10 searches/min/IP**. It asks for a
custom `User-Agent` of the form `AppName/Version (ContactEmail)`. The database is ODbL, its contents DbCL and its
images CC BY-SA. Source: <https://openfoodfacts.github.io/openfoodfacts-server/api/>, docs.

Checked: `GET …/api/v3.4/product/5449000000996` returned 200 with `energy-kcal_100g: 42.4`, `carbohydrates_100g: 10.6`,
`sugars_100g: 10.6`, `fat_100g: 0`, `proteins_100g: 0` and `salt_100g: 0`, with no `fiber_100g`. A Dutch-market product
found through search (`8713326030089`, "hagelslag") came back `success` but with **no nutriments at all**. That is a
reminder that an Open Food Facts hit can still lack the nutrition data, not only an Open Food Facts miss.

## Summary table

| Source | Access | Key? | Licence | Barcode? | Text search? | Dutch / English | Fit for the Worker |
|---|---|---|---|---|---|---|---|
| USDA FoodData Central | REST API + bulk CSV | **Yes** (DEMO_KEY only for trying it) | Public domain / CC0 | Branded foods carry `gtinUpc` (US-centric) | Yes | EN | Only with an owner key |
| Health Canada CNF | REST API (JSON/XML) | **No** | OGL–Canada (catalogue tag, see below) | No | No endpoint; full food list is 471 kB | EN, FR | **Yes**, generic foods |
| Swiss Food Composition DB (FSVO) | REST API + Excel | **No** | Free; commercial use "e.g. … nutrition diary app" allowed with acknowledgement | No | **Yes** | EN, DE, FR, IT | **Yes**, generic foods |
| Open Products Facts | REST API | No | ODbL | Non-food only | — | — | No (food barcodes are refused) |
| NEVO (RIVM, NL) | Download after accepting conditions | No | RIVM copyright + conditions | No | Only offline | NL (+EN, unverified) | No API; bundling has conditions |
| CIQUAL 2025 (ANSES, FR) | Download (XML/XLS) | No | **Etalab 2.0** (Licence Ouverte) | No | Only offline | FR, EN | No API; bundling is possible |
| UK CoFID 2021 | Excel download; 2026 API needs a key | Download: no; API: **yes** | OGL v3.0 | No | Only offline | EN | Download only |
| AFCD Release 3 (FSANZ) | Excel download | No | CC BY 4.0 | No | Only offline | EN | Download only |
| FoodRepo (EPFL) | — | — | — | — | — | — | **Gone**: redirects to openfoodfacts.org |
| UPCitemdb trial | REST API | No | Proprietary; trial terms unverified | Yes (names only) | Yes | Mostly EN | No (100/day per IP, no nutrition) |
| Nutritionix, Edamam, FatSecret | REST API | **Yes** | Proprietary | Yes | Yes | — | Excluded |

## Source by source

### USDA FoodData Central (FDC)

- **Access:** a REST API at `https://api.nal.usda.gov/fdc/v1/` (`foods/search`, `food/{fdcId}`, `foods`) plus bulk CSV and
  JSON downloads.
- **Key:** required. The API guide says "a data.gov API key must be incorporated into each API request". Checked: a
  request without one returns `403 {"error":{"code":"API_KEY_MISSING",…}}`. `DEMO_KEY` is for "initial exploration"
  only and is limited to 30 requests per IP per hour and 50 per day. A free personal key gets 1,000 requests per hour
  per IP, and going over blocks the key for an hour. Sources: <https://fdc.nal.usda.gov/api-guide/> and
  <https://api.data.gov/docs/developer-manual/>, docs.
- **Checked on 2026-10-29:** `foods/search?api_key=DEMO_KEY&query=banana raw` returned **429** with
  `x-ratelimit-limit: 10`, `x-ratelimit-remaining: 0` and `retry-after: 32990`. The shared sandbox IP had already used
  up the demo allowance. The limit header said 10, not the documented 30, and this session could not explain why.
  Either way, DEMO_KEY behind a Cloudflare Worker would share a per-IP quota with every other Worker tenant on the same
  egress IP. It is not usable.
- **Licence:** public domain, CC0 1.0. FDC asks to be credited and suggests: "U.S. Department of Agriculture,
  Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov." (docs).
- **Data:** Foundation, SR Legacy and Survey (FNDDS) records cover generic foods. Branded Foods records carry a
  `gtinUpc`, but cover mostly US products. Whether `foods/search?query=<UPC>` matches `gtinUpc` reliably is
  **unverified** here (the request was rate-limited). Nutrients are per 100 g for generic foods. For branded foods they
  come from the label, per serving and per 100 g (unverified field by field).
- **Languages:** English only.
- **Verdict:** the best second barcode source, but it needs an **owner-registered key** stored as a Worker secret.
  That is out of scope for "no key".

### Health Canada: Canadian Nutrient File (CNF) API

- **Base URI:** `https://food-nutrition.canada.ca/api/canadian-nutrient-file/`, with endpoints `foodgroup`, `food`,
  `nutrientname`, `nutrientgroup`, `nutrientsource`, `nutrientamount`, `servingsize`, `refuseamount` and `yieldamount`.
  Parameters are `id`, `lang=en|fr` and `type=json|xml`. Docs: <https://produits-sante.canada.ca/api/documentation/cnf-documentation-en.html>.
- **Key:** none. No rate limit is documented. **Checked:** every call worked without credentials and returned
  `access-control-allow-origin: *`.
- **Checked example:** `GET …/food/?lang=en&type=json&id=4` returned
  `[{"food_code":4,"food_description":"Chop suey, with meat, canned"}]`, and the same with `lang=fr` returned
  `"Chop suey, avec viande, conserve"`. `GET …/nutrientamount/?lang=en&type=json&id=4` returned 97 rows. The relevant
  ones were:
  `{"nutrient_name_id":208,"nutrient_web_name":"Energy (kcal)","nutrient_value":60.0}`,
  `203 Protein 4.074`, `205 Carbohydrate 5.293`, `204 Total Fat 2.799`, `291 Fibre, total dietary 1.149`,
  `269 Sugars, total 3.396` and `307 Sodium, Na 489.79` (mg). The docs define `nutrient_value` as "the mean value in
  100g, edible portion".
- **Search:** there is no text-search endpoint. `GET …/food/?lang=en&type=json` (no `id`) returns the whole list:
  **5,690 foods, 471,337 bytes** (checked). It includes `{"food_code":1704,"food_description":"Banana, raw"}`. A Worker
  could cache that list and match text against it locally.
- **Salt:** not given directly. Salt ≈ sodium (mg) × 2.5 ÷ 1000 g. That is a derived value and should be labelled so.
- **Licence:** the open.canada.ca catalogue record for the "Canadian Nutrient File API Database" carries the Open
  Government Licence – Canada tag (`ca-ogl-lgo`). That was seen in search results for
  <https://open.canada.ca/data/en/dataset/90a31d6a-9131-4f31-a156-cd1f3b2717fe>; the page itself answered 404 or 403
  to this session, so the tag is **partly verified**. The OGL–Canada attribution statement is "Contains information
  licensed under the Open Government Licence – Canada." Source:
  <https://open.canada.ca/en/open-government-licence-canada>, docs.
- **Edition:** the online CNF is the 2015 edition, and a CNF 2026 is in preparation. **Unverified**: this came from a
  secondary listing only.
- **Languages:** English and French. No Dutch.

### Swiss Food Composition Database (FSVO / BLV, naehrwertdaten.ch)

- **Access:** a REST API at `https://api.webapp.prod.blv.foodcase-services.com/BLV_WebApp_WS/webresources/BLV-api`
  (OpenAPI at `…/webresources/openapi.json`), plus an Excel download (version 7.1).
- **Key:** none. FSVO's own API description says the "API is free to use and allows unrestricted access" and that
  "all of the available endpoints and methods are nonrestricted, free to access". Source:
  <https://naehrwertdaten.ch/wp-content/uploads/2025/07/The-Swiss-Food-Composition-Database-API-descripton_V3-separate-API-prod.docx>,
  docs. No rate limit is published.
- **Licence:** the downloads page says, "Downloading is free of charge and the data may also be used for commercial
  purposes (e.g. integration into food composition calculation software or nutrition diary app) and scientific
  purposes, subject to acknowledgment of the source." Footer: "© 2026 Federal Food Safety and Veterinary Office".
  Source: <https://naehrwertdaten.ch/en/downloads/>, docs (page dated 2026-07-15).
- **Checked:**
  - `GET …/versiondb` returned `{"idversion":51,"versiontext":"V 7.1"}`.
  - `GET …/genericCount` returned `[30,1216]`. The meaning of the first number is **unverified**.
  - `GET …/foods?search=apple&lang=en&limit=2` returned
    `[{"id":351915,"foodName":"Apple, fresh","generic":true,"categoryNames":"Fresh fruit",…},{"id":351442,"foodName":"Apple juice",…}]`.
  - `GET …/foods?search=banane&lang=fr` returned `"Banane, crue"`.
  - `GET …/food/351912?lang=en` (`id` is the DBID; `foodid` is a different number) returned about 42 kB:
    `"name":"Banana, raw"`, `ENERCC Energy, kilocalories 90 kcal`, `PROT625 Protein 1.1 g`,
    `CHO Carbohydrates, available 19.7 g`, `FAT Fat, total 0.2 g`, `FIBT Dietary fibres 2.7 g`, `SUGAR Sugars 15.6 g`
    and `NACL Salt (NaCL) 0 g`. Values are per 100 g edible portion. **Unverified** field by field, but it is the
    website's convention.
  - Responses carry `access-control-allow-origin: *`.
  - `lang=nl` answers 200 but there are no Dutch names (an empty result).
- **Data:** about 1,200 generic Swiss foods with salt given directly. No barcodes.
- **Languages:** English, German, French, Italian.

### Open Food Facts' sister databases

Open Products Facts, Open Beauty Facts and Open Pet Food Facts are for non-food and pet products. **Checked:**
`world.openproductsfacts.org/api/v3/product/5449000000996` returned 404 with
`product_found_with_a_different_product_type` (`product_type: food`). None of them is a fallback for human food.

### NEVO (RIVM, Netherlands)

- **Access:** download only, free. You request the link after agreeing to the conditions. There is no API. Current
  version: **NEVO-online 2025/9.0**. Source: <https://www.rivm.nl/en/dutch-food-composition-database/use-of-nevo-online/request-dataset>, docs.
- **Licence** (the conditions PDF, read in full):
  <https://www.rivm.nl/sites/default/files/2025-11/Conditions-of-use-NEVO-online-2025-dataset_0.pdf>
  - The data are "the copyright of … RIVM/the Kingdom of the Netherlands". Use is "only allowed unchanged and stating
    the source and version number", with the reference "NEVO online, version 2025/9.0. RIVM, Bilthoven."
  - Software output "must contain" "Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven" (or "… and other
    data sources").
  - Additions are allowed if clearly separate. Amendments are not.
  - "The user is not allowed to charge (end)users for the use of NEVO online version 2025/9.0 data."
  - Users are asked to replace the data when a new version appears.
- **Data / languages:** about 2,000+ Dutch generic foods and dishes with a full nutrient profile. Dutch names, and
  English names according to earlier editions. Count, languages and formats are **unverified**: the RIVM pages read did
  not state them.
- **Verdict:** the best Dutch generic-food source, but it is a dataset to bundle, not an API. The no-charge clause
  needs the owner's decision if ZIGoals ever charges for access.

### CIQUAL 2025 (ANSES, France)

- **Access:** download from Recherche Data Gouv, DOI `10.57745/RDMHWY`, published 2025-11-19. Files are
  `alim_2025_11_03.xml` (1.6 MB), `compo_2025_11_03.xml` (69 MB), `const_…`, `sources_…`, the XLS/XLSX table and a PDF
  guide. **Checked** through the Dataverse API. There is no official API.
- **Licence:** **Etalab 2.0** (Licence Ouverte), checked in the dataset metadata (`"license":{"name":"etalab 2.0"}`).
  Etalab requires attribution: the source and the date of last update. Suggested wording: "Anses. 2025. Table de
  composition nutritionnelle des aliments Ciqual (version 2025-11-19)". The exact form ANSES prefers is **unverified**.
- **Data:** 3,484 foods and 74 constituents (dataset description). **Checked:** each `<ALIM>` has `alim_nom_fr` and
  `alim_nom_eng` (for example "Pastis" / "Pastis (anise-flavoured spirit)").
- **Languages:** French and English.

### UK CoFID (McCance and Widdowson's), 2021

- **Access:** a 4.42 MB Excel file (plus a "old foods" file and a user guide) at
  <https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid>, page updated
  2021-03-19 (docs).
- **Licence:** the gov.uk footer says "All content is available under the Open Government Licence v3.0" except where
  stated. The standard OGL v3 statement is "Contains public sector information licensed under the Open Government
  Licence v3.0."
- **New API:** the CoFID API v2.2.0 (Quadram FN-NBRI, May 2026) at `https://api.cofid.quadram.ac.uk/` needs an
  `X-API-Key` issued after approval, with 1,000 requests per day. It is **excluded** under the no-key rule. Source:
  <https://fnnbri.quadram.ac.uk/wp-content/uploads/2026/06/CoFID_API_Technical_Documentation.pdf>, docs.
- **Data:** about 2,887 foods (the API docs; other sources say 2,898). English.

### Australian Food Composition Database (AFCD) Release 3 and AUSNUT

- **Access:** Excel files covering 1,588 foods with 58 nutrients each (page updated 2025-12-23):
  <https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/australian-food-composition-database-download-excel-files>.
- **Licence:** CC BY 4.0, with the attribution "© Food Standards Australia New Zealand", which must not imply
  endorsement: <https://www.foodstandards.gov.au/legal-policies/copyright>. Whether third-party material inside AFCD is
  excluded from that licence was not checked file by file (**unverified**).
- AUSNUT (survey foods) was not checked separately.
- English only, and Australian foods.

### FoodRepo (EPFL)

**Checked:** `https://www.foodrepo.org/api/v3/products?barcodes=…` redirects to `foodrepo.org`, which serves "This site
has moved to openfoodfacts.org". Open Food Facts' press pages mention an import from FoodRepo. The service is gone, and
its data is part of Open Food Facts as far as it was imported. How completely it was imported is **unverified**.

### UPCitemdb (trial plan)

- **Endpoint:** `https://api.upcitemdb.com/prod/trial/lookup?upc=<code>`, with no key ("FREE plan" drops the
  `user_key` header).
- **Limits:** "plan FREE allows total of 100 combined requests per day … SearchRequest is limited up to 40 per day",
  with a burst limit of "6 requests per minute", per IP. Source: <https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/>, docs.
- **Checked:** 429 `{"code":"EXCEED_LIMIT","message":"Rate limit exceeded"}`. The sandbox IP was already over the limit.
- **Data:** `ean`, `title`, `brand` and price `offers`. **No nutrition.**
- Whether the trial may be used commercially is **unverified** (the terms were not read).
- **Verdict:** no. It gives a product name only, and a per-IP limit on a shared Cloudflare egress IP is unpredictable.

### Nutritionix, Edamam, FatSecret

All three need an app ID and key or OAuth client credentials (FatSecret: client credentials with Basic auth; free-tier
scopes are limited, per FatSecret's developer group threads
<https://groups.google.com/g/fatsecret-platform-api/c/1_cfWqGnSGI> and
<https://groups.google.com/g/fatsecret-platform-api/c/Yi2L1v2VuFw>; seen in search results only). The Nutritionix and Edamam key schemes were not
re-checked this session. They are **excluded** by the brief.

## Recommendation

1. **Barcode fallback when Open Food Facts misses: none without an owner key.** No key-free source has meaningful
   barcode coverage with nutrition. USDA FDC Branded Foods would be the one real second source, but it needs an
   api.data.gov key; DEMO_KEY is for exploration only, and it was already exhausted on a shared IP. UPCitemdb gives
   names only, 100 per day per IP. If the owner later registers a free FDC key, add it as a Worker secret and call
   `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=<gtin>&dataType=Branded&pageSize=1` with
   `X-Api-Key: <secret>`, keeping today's spacing. The credit would be "Source: USDA FoodData Central
   (fdc.nal.usda.gov), public domain". Whether search by GTIN works reliably needs checking first.

   Until then, the better fallback for both an Open Food Facts miss and a hit with no nutriments is to **offer the
   generic-food search below**, for example "Not found. Search 'banana' instead?".

2. **Generic-food text search behind the Worker: the Swiss Food Composition Database, first choice.** It needs no key,
   is explicitly allowed in "nutrition diary" apps, covers EN/DE/FR/IT, gives salt directly, allows CORS, and was
   checked on 2026-10-29.
   - **Endpoints:**
     `GET https://api.webapp.prod.blv.foodcase-services.com/BLV_WebApp_WS/webresources/BLV-api/foods?search=<q>&lang=en&limit=10`,
     then
     `GET https://api.webapp.prod.blv.foodcase-services.com/BLV_WebApp_WS/webresources/BLV-api/food/<id>?lang=en`
     using the `id` (DBID) from the search hit. Map `ENERCC` → kcal, `PROT625` → protein, `CHO` → carbohydrates,
     `FAT`, `FIBT` → fibre, `SUGAR` and `NACL` → salt, all per 100 g.
   - **Headers:** `Accept: application/json` and the existing `User-Agent: ZIGoals/… (contact)` as a courtesy (it is
     not required). Keep `redirect:'manual'` and the timeout. Raise the body cap for the detail call (about 42 kB per
     food today) or keep only the needed components.
   - **Limits:** FSVO publishes none and calls access unrestricted. The Worker should still apply its own budget: a
     separate Durable Object slot (suggested 1 request per 2 s globally, the same 3 per minute and 120 per day per
     client), and cache search results and food details for 24 h. The data changes about yearly; poll `versiondb` to
     invalidate.
   - **Attribution on each result:** "Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary
     Office FSVO (naehrwertdaten.ch)", linked to `https://naehrwertdaten.ch/en/`.

3. **Second generic source: the Canadian Nutrient File.** It needs no key and covers EN/FR. Because it has no search
   endpoint, the Worker would cache `GET https://food-nutrition.canada.ca/api/canadian-nutrient-file/food/?lang=en&type=json`
   (471 kB, 5,690 foods; refresh weekly), match the query against it, then call
   `GET https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientamount/?lang=en&type=json&id=<food_code>`.
   Map IDs 208 (kcal), 203 (protein), 205 (carbohydrate), 204 (fat), 291 (fibre), 269 (sugars) and 307 (sodium, mg;
   show salt as "derived from sodium").
   - **Headers:** `Accept: application/json` and the `User-Agent`.
   - **Limits:** none published; use the same Worker budget and 24 h caching.
   - **Attribution on each result:** "Source: Canadian Nutrient File, Health Canada. Contains information licensed
     under the Open Government Licence – Canada", linked to the OGL–Canada page. Before shipping, confirm the
     open.canada.ca licence tag, which is partly verified.

4. **For Dutch generic foods, no key-free API exists.** NEVO 2025/9.0 is the right data, but it is download-only, must
   stay unchanged, must be credited on every output ("Based on data from NEVO online version 2025/9.0, RIVM,
   Bilthoven"), and may not be charged for. CIQUAL 2025 (Etalab 2.0, FR/EN names, 3,484 foods) is the most permissive
   dataset to bundle. Bundling either one as a static, versioned file searched on the device would send no query
   anywhere, which is the strongest privacy option. It adds no code dependency, but it is a product and data decision
   for the **owner** (the size and the NEVO terms).
5. **Do not use:** DEMO_KEY, UPCitemdb, FoodRepo (gone), the Open Food Facts sister databases (non-food), the CoFID API
   (key) or Nutritionix, Edamam or FatSecret (keys).

Every result should keep the existing provenance fields (`provider`, `apiVersion`/dataset version, `observedAt`,
`license`), so a diary entry always says which source and licence it came from.
