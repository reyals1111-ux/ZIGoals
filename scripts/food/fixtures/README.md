# Generic-food build fixtures (SYNTHETIC)

Every file here is made up for `scripts/food/build-generic-db.test.mjs`. The layouts follow the real files (CIQUAL 2025's
XML tables, the CoFID 2021 workbook's sheets and header rows, Fineli's open-data CSV files); the names, codes and numbers
do not come from any dataset. `cofid-xlsx/` holds the parts of a workbook; the test zips them into an .xlsx.

The Fineli layout (`component.csv`, `component_value.csv` with decimal commas, `food.csv`, `foodname_EN.csv`) is from
memory of earlier open-data releases: fineli.fi could not be read from the build sandbox (a Cloudflare challenge), so it
is **unverified** against the current release. The build checks every unit it reads and refuses what it does not know.
