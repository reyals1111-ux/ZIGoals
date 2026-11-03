# Session AK — food composition sources: licences, downloads, nutrient columns (lane R, read 2026-10-31)

Research only. **Checked** = request run from this sandbox on 2026-10-31 (HEAD or small GET; no large file was
downloaded). **Docs** = the provider's own page or file. **Unverified** = could not be confirmed today; source named.
This builds on [../session-aj/FOOD_SOURCES.md](../session-aj/FOOD_SOURCES.md) (2026-10-29).

## Summary

| Source | Licence | Attribution required | Official file | Direct download? | Formats | Foods (approx.) | Names |
|---|---|---|---|---|---|---|---|
| **CIQUAL 2025** (ANSES, FR) | **Licence Ouverte / Etalab 2.0** | Source (at least ANSES) **and** date of last update | Recherche Data Gouv DOI `10.57745/RDMHWY`, V1, 2025-11-19 | **Yes**: Dataverse `api/access/datafile/<id>` → 303 to a signed S3 URL (14,400 s expiry) | XML (alim, alim_grp, compo, const, sources), XLS, XLSX, PDF guide | **3,484** foods × 74 constituents | FR + EN |
| **CoFID 2021** (PHE/OHID, UK) | **Open Government Licence v3.0** (GOV.UK default) | "Contains public sector information licensed under the Open Government Licence v3.0." | GOV.UK publication page (updated 2021-03-19) | **Yes**: `assets.publishing.service.gov.uk` HEAD 200, `content-length: 4629542` | XLSX (main + "old foods"), PDF user guide | ~2,887 (secondary) + old foods | EN |
| **Fineli** (THL, FI) | **CC BY 4.0** (THL open data catalogue: `cc-by-4.0`). Fineli's own page **could not be read** | Credit THL / Fineli; must not imply THL endorsement (secondary) | `fineli.fi` open-data page | **Unknown**: every fineli.fi URL answered **403 with a Cloudflare "Just a moment…" challenge** | ZIP of CSV (unverified) | "over 5,000 foodstuffs and 55 nutritional factors" (suomi.fi, updated 2026-05-13) | FI, SV, EN |
| **USDA FoodData Central** | **Public domain, CC0 1.0** | Requested, not required: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, [year]. fdc.nal.usda.gov." | `fdc.nal.usda.gov/download-datasets/` | **Yes**: `/fdc-datasets/*.zip` HEAD 200 | CSV and JSON ZIPs; REST API (key) | Foundation **424** (Oct 2026, counted); SR Legacy ~7.8k (secondary); Branded ~hundreds of thousands (3 GB unzipped) | EN |
| **NEVO 2025/9.0** (RIVM, NL) | RIVM copyright + "Conditions of use" | "Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven" on every output | RIVM webform | **No**: a Drupal webform with a required "I agree conditions of use" checkbox | (after the form) | ~2,000+ (unverified) | NL (EN unverified) |

**Exclude NEVO** (details at the end): the conditions forbid charging end users, require the data to be used **unchanged**
and need a credit on every output. The download sits behind an agreement form, so it cannot be fetched automatically or
redistributed inside a static bundle without accepting the terms on the owner's behalf.

---

## CIQUAL 2025 (ANSES)

- **Official pages:** <https://ciqual.anses.fr/> (**checked: 503 "Maintenance en cours"** today) and the data deposit
  <https://doi.org/10.57745/RDMHWY> → <https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY>.
- **Licence (checked, Dataverse API):** `"license":{"name":"etalab 2.0","uri":"https://spdx.org/licenses/etalab-2.0.html"}`.
  Etalab 2.0 requires the reuser to "mentionner la paternité de l'« Information » : sa source (a minima le nom du
  « Concédant »)" and "la date de la dernière mise à jour de l'« Information » réutilisée"
  (<https://www.data.gouv.fr/pages/legal/licences/etalab-2.0>).
- **Citation (checked, Dataverse citation endpoint):** "Du Chaffaut, Laure; Oseredczuk, Marine; Gauvreau-Béziat, Julie,
  2025, "Table de composition nutritionnelle des aliments Ciqual 2025", https://doi.org/10.57745/RDMHWY, Recherche Data
  Gouv, V1".
- **Suggested in-app credit:** "Source: Anses, Table de composition nutritionnelle des aliments Ciqual 2025 (mise à jour
  2025-11-19), Licence Ouverte Etalab 2.0", linked to the DOI.
- **Files (checked, `api/datasets/:persistentId`):**

  | File | Bytes | Dataverse id |
  |---|---|---|
  | `alim_2025_11_03.xml` (foods, FR/EN names) | 1,581,031 | 666252 |
  | `alim_grp_2025_11_03.xml` (groups) | 80,421 | 666250 |
  | `compo_2025_11_03.xml` (values) | 69,243,149 | 666249 |
  | `const_2025_11_03.xml` (constituents) | 17,955 | 666246 |
  | `sources_2025_11_03.xml` | 871,783 | 666248 |
  | `Table Ciqual 2025_FR_2025_11_03.xlsx` | 1,541,998 | 666260 |
  | `Table Ciqual 2025_FR_2025_11_03.xls` | 4,489,728 | 666245 |
  | `Table Ciqual 2025 doc FR_2025_11_19.pdf` | 4,236,848 | 666748 |

  Download URL pattern: `https://entrepot.recherche.data.gouv.fr/api/access/datafile/<id>`. **Checked:** HEAD on 666249
  → `303` to a pre-signed `opens3r-tls.stockage.inrae.fr` URL (`X-Amz-Expires=14400`). Response has
  `access-control-allow-headers` but no fixed file URL, so fetch the **Dataverse URL** each time.
- **Rows:** "3484 aliments … pour 74 constituants" (dataset description). Names: `alim_nom_fr` and `alim_nom_eng`.
- **Constituents (checked, `const_2025_11_03.xml`, codes → our fields)** — all per 100 g:

  | Our field | CIQUAL code: name |
  |---|---|
  | kcal | 328 Energy, Regulation EU No 1169/2011 (kcal/100g) (also 333 N×Jones' factor with fibres) |
  | protein | 25000 Protein (g) |
  | carbs | 31000 Carbohydrate (g) |
  | fat | 40000 Fat (g) |
  | fibre | 34100 Fibres (g) |
  | sugars | 32000 Sugars (g) |
  | saturated fat | 40302 FA saturated (g) |
  | sodium / salt | 10110 Sodium (mg); **10004 Salt (g) given directly** |
  | potassium, calcium, iron, magnesium, zinc | 10190, 10200, 10260, 10120, 10300 (mg) |
  | vitamin A | 51104 Vitamin A activity, retinol equivalent (the label says "µg/100**mg**", a typo in the source file; treat as µg/100 g); 51200 retinol; 51330 β-carotene |
  | vitamin C | 55100 (mg) |
  | vitamin D | 52100 (µg) (+ D2 52200, D3 52300) |
  | vitamin E | 53100 (mg) (+ 71010 α-tocopherol) |
  | vitamin K | 54101 K1, 54104 K2 (µg) — **sum for K** |
  | B1, B2, B3, B6, B12 | 56100, 56200, 56310, 56500 (mg); 56600 (µg) |
  | folate | 56700 total folates (µg); 56702 DFE |
  | omega-3 | **no total**: 41833 ALA 18:3 n-3, 42053 EPA, 42263 DHA (g) — sum for "omega-3 (ALA+EPA+DHA)" and label it so |

  Values may be `-`, `traces` or `< x` in the XML (CIQUAL convention; **unverified** today in `compo`, not downloaded).
  Encoding: the const file decodes as UTF-8 (µ appeared as `Âµ` when read as cp1252).

## CoFID 2021 (McCance and Widdowson's)

- **Official page:** <https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid>
  (GOV.UK content API checked: first published 2015-03-25, updated 2021-03-19).
- **Licence:** GOV.UK footer: all content under the **Open Government Licence v3.0** except where stated
  (<https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>). The guide carries "© Crown copyright
  2021". OGL v3 requires: "Contains public sector information licensed under the Open Government Licence v3.0."
- **Suggested credit:** "Contains public sector information licensed under the Open Government Licence v3.0. Source:
  McCance and Widdowson's The Composition of Foods Integrated Dataset 2021 (PHE)."
- **Files (checked, attachments):**
  - `https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx`
    (4,629,542 B; HEAD 200, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) — note the double dot.
  - `https://assets.publishing.service.gov.uk/media/60538ba4e90e07527f645f88/CoFID_oldFoods.xlsx` (649,329 B).
  - User guide PDF `…/60538e66d3bf7f03249bac58/McCance_and_Widdowsons_Composition_of_Foods_integrated_dataset_2021.pdf`
    (777,103 B; read).
- **Structure (guide):** worksheets Factors, Proximates, Inorganics, Vitamins, Vitamin Fractions, SFA/MUFA/PUFA per 100 g
  fatty acids and per 100 g food, Phytosterols, Organic acids. "Each sheet contains column headings in rows 1 to 3 …
  data values for a specific food code will occur in the same row in each of the worksheets." Values per 100 g (alcoholic
  drinks per 100 ml); trace = `Tr`. **An XLSX reader is needed (zip + XML), which can be hand-written with
  `DecompressionStream`; no dependency.** Better: convert once at build time to JSON.
- **Columns (guide's code table) → our fields:** kcal `KCALS`; protein `PROT`; carbs `CHO` (available, as
  monosaccharides); fat `FAT`; fibre `AOACFIB` (and `ENGFIB` = NSP, lower — prefer AOAC, fall back to NSP and label it);
  sugars `TOTSUG`; saturated fat `SATFOD`; sodium `NA` (salt = Na × 2.5, the guide says so); potassium `K`; calcium `CA`;
  iron `FE`; magnesium `MG`; zinc `ZN`; vitamin A `RETEQU`; C `VITC`; D `VITD`; E `VITE`; K `VITK1`; B1 `THIA`; B2 `RIBO`;
  B3 `NIAC` (or `NIACEQU`); B6 `VITB6`; B12 `VITB12`; folate `FOLT`; **omega-3 `TOTn3PFOD`** (total n-3 PUFA per 100 g
  food), plus `FOD18:3cn3`, `FOD20:5cn3`, `FOD22:6cn3`.
- **Rows:** ~2,887 (CoFID API documentation, via Session AJ; not counted today). Names: English only.

## Fineli (THL, Finland)

- **Official pages:** <https://fineli.fi/fineli/en/index> and the open-data page <https://fineli.fi/fineli/en/avoin-data>.
  **Checked: both, and even `robots.txt`, return HTTP 403 with a Cloudflare "Just a moment…" challenge** to a plain
  request from this sandbox. (A retry with a browser user-agent was refused by this session's safety controls as bot-check
  circumvention and was **not** done.) **This matters for the build:** a Worker or a browser `fetch` may hit the same
  challenge. Plan to download the open-data ZIP by hand and ship a converted file, not to fetch it at runtime.
- **Licence:** THL's dataset record on the Finnish open data portal (`avoindata.suomi.fi`, package `thl-n-avoin-data`,
  checked through the CKAN API) is `cc-by-4.0` "Creative Commons Attribution 4.0". That record covers THL open data in
  general and points to `http://www.thl.fi/avoindata`. **Partly verified**: Fineli's own wording was not readable today.
- **Attribution (to confirm on fineli.fi):** credit "Finnish Institute for Health and Welfare (THL), Fineli", plus the
  release number. Fineli is a THL trademark, and reuse "cannot give an impression that the service is produced or
  recommended by THL or part of the Fineli online service" (secondary, from a search snippet of THL's terms; **unverified**).
- **Content (suomi.fi service card, updated 2026-05-13):** "over 5,000 foodstuffs and 55 nutritional factors"; languages
  "Finnish, Swedish, English" (<https://www.suomi.fi/services/eservice/fineli-finnish-food-composition-database-the-national-institute-for-health-and-welfare-thl/ba003f23-14e6-46b9-985c-30d654e35ef2>).
- **Format and columns: unverified.** From earlier Fineli releases (memory and the `mafredri/fineli-sql` project, which
  packages Releases 16.0 and 18.0): a ZIP of semicolon-separated CSVs (`food.csv`, `component.csv`,
  `component_value.csv`, `foodname_EN.csv`, …) with EuroFIR component codes. The likely mapping is ENERC (kJ; kcal = ÷ 4.184),
  PROT, CHOAVL, FAT, FIBC, SUGAR, FASAT, NA, NACL, K, CA, FE, MG, ZN, VITA, VITC, VITD, VITE, VITK, THIA, RIBF, NIA,
  VITPYRID, VITB12, FOL, F18D3CN3, FAPUN3 (n-3 PUFA). **Confirm against the real ZIP before writing the importer.**

## USDA FoodData Central

- **Official pages:** API guide <https://fdc.nal.usda.gov/api-guide/>; downloads <https://fdc.nal.usda.gov/download-datasets/>.
- **Licence (Docs):** "USDA FoodData Central data are in the public domain and they are not copyrighted. They are
  published under CC0 1.0 Universal (CC0 1.0). No permission is needed for their use, but we request that users list
  FoodData Central as the source of the data, and when possible, notify us of the product that uses the data … The
  suggested citation is: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019.
  fdc.nal.usda.gov. Note: Release numbers and years change as new versions are released."
- **API terms (Docs):** needs a data.gov key. "It is the API Key holder's responsibility to ensure that their key is not
  made publicly available. **Any API keys discovered online, such as those in a code repository, will be deactivated**."
  So the key **cannot ship in the PWA**. It must be a Worker secret. Limit: "1,000 requests per hour per IP address …
  Exceeding this limit will cause the API key to be temporarily blocked for 1 hour". The `X-RateLimit-Limit` and
  `X-RateLimit-Remaining` headers report the limit. DEMO_KEY: "30 requests per IP address per hour", "50 requests per IP
  address per day".
- **Endpoints:** `GET /fdc/v1/food/{fdcId}`, `GET|POST /fdc/v1/foods` (multiple ids), `GET|POST /fdc/v1/foods/list`,
  `GET|POST /fdc/v1/foods/search` (query keywords). Base `https://api.nal.usda.gov`.
- **Branded GTIN search:** `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=<GTIN>&dataType=Branded&pageSize=1`
  with header `X-Api-Key`. **Still unverified today.** The DEMO_KEY call returned **429**, `x-ratelimit-limit: 10`,
  `x-ratelimit-remaining: 0`, `retry-after: 26776`. The sandbox's shared IP is exhausted, as on 2026-10-29. The same
  response carried **`access-control-allow-origin: *`**, so CORS is not the blocker; the key rule is. Match the hit's
  `gtinUpc` exactly against the scanned code (with and without the leading zero, for UPC-A ↔ EAN-13) before trusting it.
- **Downloads (checked, HEAD 200 on each):**
  - Foundation Foods Oct 2026: `/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip` (696,866 B) and
    `…_csv_2026-10-29.zip` (page: 4.1 MB zipped, 35 MB unzipped).
  - SR Legacy Apr 2018: JSON 12.3 MB / CSV 6.7 MB zipped (page).
  - Branded Oct 2026: `/fdc-datasets/FoodData_Central_branded_food_csv_2026-10-29.zip` (451,954,262 B; page says 432 MB
    zipped, 3 GB unzipped). **Too big to bundle**, so branded foods must go through the API.
  - "Full Download of All Data Types" Oct 2026: 463 MB zipped / 3.1 GB.
- **Rows (checked):** Foundation Foods Oct 2026 = **424** foods (`FoundationFoods` array, counted after a 0.7 MB
  download).
- **Nutrient numbers → our fields** (FDC "nutrient.number"; coverage counted in the 424 Foundation foods):

  | Our field | FDC number: name (coverage /424) |
  |---|---|
  | kcal | 208 Energy kcal (**95**) → fall back to **957 Atwater General (279)** or 958 Atwater Specific (200) |
  | protein / carbs / fat | 203 (407) / 205 by difference (374), 205.2 by summation (30) / 204 (393) |
  | fibre | 291 (234); 293 AOAC 2011.25 (34) |
  | sugars | **269.3 "Sugars, Total" (161)**; 269 "Total Sugars" (5) |
  | saturated fat | 606 (174) |
  | sodium, potassium, calcium, iron, magnesium, zinc | 307 (378), 306, 301, 303, 304, 309 (396 each) |
  | vitamin A | 320 RAE µg (52) |
  | C, D, E, K | 401 (118), 328 D2+D3 µg (78), 323 α-tocopherol (86), 430 phylloquinone (85) |
  | B1, B2, B3, B6, B12, folate | 404 (214), 405 (194), 406 (221), 415 (258), 418 (76), 417 total (172) |
  | omega-3 | no total in Foundation: 851 ALA (66), 629 EPA (63), 621 DHA (63) |

  **Lesson:** Foundation foods are sparse, and kcal is often only under 957/958. The importer must try 208 → 958 → 957 and
  store which one it used. SR Legacy (older, much fuller) is the better generic set for vitamins.

## NEVO 2025/9.0 (RIVM): exclude

- **Pages (checked):** <https://www.rivm.nl/en/dutch-food-composition-database/use-of-nevo-online/request-dataset> says
  "all foods in NEVO-online version 2025/9.0 is downloadable for free. Please note: before you can download, you need to
  agree with the conditions set in the agreement for the use of the dataset". "Download dataset" leads to
  <https://www.rivm.nl/en/dutch-food-composition-database/nevo-online-request-dataset>, a **Drupal webform** with a
  required checkbox `i_agree[Conditions of use]`. **There is no direct file URL.** Conditions:
  <https://www.rivm.nl/documenten/condition-of-use-nevo-online-2025>.
- **Why exclude** (conditions as read in full by Session AJ, 2026-10-29, PDF
  <https://www.rivm.nl/sites/default/files/2025-11/Conditions-of-use-NEVO-online-2025-dataset_0.pdf>):
  1. "The user is not allowed to charge (end)users for the use of NEVO online version 2025/9.0 data". A paid tier or a
     paid app would breach it.
  2. Use "only allowed unchanged". ZIGoals' per-portion scaling, merging and derived salt may count as changes. Additions
     must be kept "clearly separate".
  3. Every software output "must contain" "Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven".
  4. The download needs the owner's personal agreement, so an agent cannot accept it, and a redistributed bundle extends
     the terms to every installation.
  5. Copyright stays with RIVM ("RIVM/the Kingdom of the Netherlands"), not an open licence. CIQUAL plus CoFID plus Fineli
     cover generic foods openly. Dutch names can come from the person's own library and Open Food Facts.

## Sources (all read or checked 2026-10-31)

- CIQUAL: <https://doi.org/10.57745/RDMHWY>; Dataverse API `https://entrepot.recherche.data.gouv.fr/api/datasets/:persistentId/?persistentId=doi:10.57745/RDMHWY` and `…/versions/:latest-published/citation`; `api/access/datafile/666246` (const, 18 kB, read) and `666249` (HEAD); <https://ciqual.anses.fr/> (503 maintenance); Etalab 2.0 text <https://www.data.gouv.fr/pages/legal/licences/etalab-2.0>
- CoFID: <https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid>; GOV.UK content API `https://www.gov.uk/api/content/government/publications/composition-of-foods-integrated-dataset-cofid`; user guide PDF (read); xlsx (HEAD); OGL v3 <https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>
- Fineli: <https://fineli.fi/fineli/en/avoin-data> (403 Cloudflare challenge); <https://avoindata.suomi.fi/data/api/3/action/package_search?q=fineli> (THL open data, cc-by-4.0); suomi.fi service card (above); <https://github.com/mafredri/fineli-sql> (secondary)
- USDA FDC: <https://fdc.nal.usda.gov/api-guide/>, <https://fdc.nal.usda.gov/download-datasets/>; HEAD of the 2026-10-29 Foundation and Branded ZIPs; Foundation JSON (0.7 MB) read; `api.nal.usda.gov/fdc/v1/foods/search` with DEMO_KEY (429)
- NEVO: RIVM pages above; conditions PDF as read in [../session-aj/FOOD_SOURCES.md](../session-aj/FOOD_SOURCES.md)
