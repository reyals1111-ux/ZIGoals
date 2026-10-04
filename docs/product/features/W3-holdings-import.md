# W3 · CSV import for holdings and transactions

## Purpose
People arrive with a spreadsheet: coins bought over the years, or a list of what they own. Instead of typing it in, they choose the file, say which column is which, check the preview, and confirm. Transactions go into a Portfolio; holdings go into Wealth as manual assets. The file is read on the device and never uploaded, and one tap undoes the whole import while nothing has been touched.

## Owner principles applied
Private by design (the file is read with `File.text()` on the device; no request carries any cell; tests prove it). Honest numbers (no price is invented for a transfer without one; an unrecognised coin is never guessed from a ticker, `components/portfolio/coin-picker.tsx:34`; unknown stays unknown). Non-custodial and no advice (nothing moves; the import records what the person says they did). Never a chore (optional, with a preview and an undo). Consumer first (no format names or ids in the copy).

## Scope in PR 3
- `lib/csv/`: an RFC 4180-style parser (`,` `;` tab, quotes, BOM, 2 MB cap), header guessing, number and date parsing with explicit choices.
- `lib/import/holdings.ts`: the plan, the atomic apply into a Portfolio (`addTransaction`, `lib/portfolio/store.ts:45`) or into Wealth (`manualSourcePosition` + `saveManualPosition`, `lib/manual-source.ts:7`, `lib/positions.ts:171`), the undo ledger.
- Entry points on Portfolio and Wealth; Help entry (shared with I1); no Showcase import for W3 (the Showcase example import is I1's).

Out of scope: exchange-specific presets, API connections, price lookups during import, importing into chain-observed positions, allocation to Goals, undo after the records were edited, the Portfolio's own JSON import (unchanged).

## Data
**Device key `zigoals:import-undo:v1`** (`lib/import/undo-schema.ts`), shared with I1:
```
{ version: 1, imports: ImportRecord[] ≤ 20 }
ImportRecord = { id: uuid, kind: "portfolio" | "wealth" | "nutrition", at: ISO instant, label: string ≤ 120,
                 portfolioId?: string, createdIds: string[] ≤ 20,000, expiresAt: ISO instant (at + 7 days) }
```
Written when an import is applied (prepended; the 21st drops the oldest) and when one is undone (removed). Expired records are pruned on save. **Stays device-only:** it is an undo ledger for records that already sync as ordinary Portfolio (device-only today) and finance records; the home of a record is unchanged by how it was typed in.

**Through existing mutators:** Portfolio transactions through `addTransaction` into `zigoals:portfolio:v1` (device-only, as today); Wealth holdings through `saveManualPosition` into the synced finance record (ordinary `MANUAL` positions, `assetEvents` "added" as any manual asset). Imported records carry no marker of their own: `createdIds` is the only link, so the formats do not change.

**Read tolerance:** unreadable undo bytes mean "nothing to undo"; the banner is not shown; imports still work and write a fresh ledger only after "Start over…" in the import panel (README).

**No write switch.**

## Engine
### `lib/csv/parse.ts` (pure)
`parseCsv(text, {delimiter?}) → {header: string[], rows: string[][], delimiter: "," | ";" | "\t", warnings: string[]}`
- Strips a leading U+FEFF. Line ends CRLF, LF or CR. Fields may be quoted; a quoted field may hold the delimiter, line breaks and doubled quotes (`""` → `"`); a quote inside an unquoted field is kept as text with a warning. Ragged rows are padded with `""` (warning "Row {n} has fewer columns than the header."). A trailing empty line is ignored. The first row is the header.
- `detectDelimiter(text)`: counts `,` `;` and tab outside quotes over the first five lines; the candidate with the same count on every line wins; ties go to `,`; the mapping step shows the choice and lets the person change it.
- Limits: `MAX_BYTES = 2_000_000` (checked on `file.size` and again on the text, "This file is larger than 2 MB. Nothing was read."), `MAX_ROWS = 20_000` ("This file has more than 20,000 rows."), `MAX_COLUMNS = 64`.
### `lib/csv/mapping.ts`, `numbers.ts`, `dates.ts` (pure)
- `guessMapping(header, fields) → Partial<Record<fieldId, columnIndex>>`: lower-case, strip punctuation and spaces, match each field's synonyms; a column is used once. `fields` for transactions: `coin` (coin, asset, symbol, ticker, currency, pair), `kind` (type, side, action), `quantity` (quantity, amount, qty, units, size), `price` (price, unit price, price per coin, rate), `fee` (fee, fees, commission), `date` (date, time, timestamp, executed at), `note` (note, notes, memo, comment). For holdings: `name`, `asset` (symbol, ticker, currency), `quantity`, `class` (type, category, class), `value`, `currency` (valuation currency), `notes`.
- `parseNumberCell(cell, style: "point" | "comma") → decimal text | null`: blank → `null`; thousands separators of the other sign removed; `"1,234.5"` under `point` → `"1234.5"`, `"1.234,5"` under `comma` → `"1234.5"`; exponent notation, text and negatives are refused with a row reason. `guessNumberStyle(cells)` picks `comma` only when every cell with a comma has 1–2 digits after it and no cell has both; otherwise `point`; the mapping step shows the choice.
- `parseDateCell(cell, format: "iso" | "dmy" | "mdy" | "dmy-dot" | "month-name") → "YYYY-MM-DD" | null`; `guessDateFormat(cells) → {format, ambiguous}`; ambiguous (every day and month value ≤ 12) forces an explicit choice in the mapping step; a time part is ignored; a future date is refused per row.
### `lib/import/holdings.ts` (pure)
```
planTransactionImport({rows, mapping, numberStyle, dateFormat, today, resolveCoin}) → TransactionPlan
TransactionPlan = { ready: {row, coin: PortfolioCoin, kind, quantity, price?, fee?, date, note}[], unknownCoins: {row, text}[], refused: {row, reason}[] }
```
`kind` synonyms: buy/bought/purchase → `buy`; sell/sold → `sell`; deposit/receive/received/transfer in → `transfer-in`; withdraw/withdrawal/send/sent/transfer out → `transfer-out`; blank → `buy` only when a price is present, else refused "Row {n}: say whether this is a buy, a sell, a transfer in or a transfer out." Reasons: "Row {n}: the quantity is not a number above zero.", "Row {n}: a buy or a sell needs its price per coin.", "Row {n}: the date is not {format}.", "Row {n}: the date is in the future.".
`resolveCoin(text) → PortfolioCoin | PortfolioCoin[] | null`: exact symbol match (case-insensitive) in the coin catalog (`createCatalogLoader`, `lib/market-catalog-client.ts:9`), then exact name; with the catalog unavailable, the same against `FEATURED_COINS` (`coin-picker.tsx:12`, BTC, ETH, ZIG, USDC, SOL); several matches → the list; none → `null` (an unknown coin, chosen by hand or skipped).
```
applyTransactionImport(data: PortfolioData, portfolioId, plan.ready, {importId, at}) → PortfolioData
```
One reducer over `addTransaction` with ids `imp_{importId}_{row}`; `updatePortfolios` then runs `checkHistories`: a history below zero refuses the whole import with "Row {n} would sell more {SYMBOL} than the portfolio holds on {date}. Nothing was imported." (`HoldingsBelowZero`). Atomic by construction (one `setItem`).
```
planHoldingsImport({rows, mapping, numberStyle}) → {ready: ManualSource[], refused}
applyHoldingsImport(platform, ready, {importId, at}) → Platform
```
Each ready row → `manualSourcePosition(input, crypto.randomUUID(), at)`; `class` synonyms map to `MANUAL_SOURCES` (cash, crypto, stable/stablecoin, stock/share/etf, gold/silver/metal, property/real estate, else custom asset); `currency` must be three letters (else refused); a row without `value` or `price` and not cash keeps no valuation ("Needs valuation" in Wealth, never zero). One `platform.update` applies every `saveManualPosition` in order; a refusal anywhere leaves the record unchanged (`updatePrivateStore` writes once).
```
undoImport(record, {portfolio?, platform?}) → {portfolio?, platform?, removed: number} | UndoRefused
```
Portfolio: removes transactions whose id is in `createdIds` and whose `createdAt === record.at`; a missing id is skipped; `removeTransaction`'s history check applies (a later sale that would go below zero refuses with its message). Wealth: removes positions whose id is in `createdIds`, `observedAt === record.at` and `snapshots` hold exactly the one import snapshot; a position with an allocation or a later edit refuses: "Some imported assets were already changed or used for a Goal. Remove them in Wealth instead." and nothing is removed.

## UI
### Entry points
- Portfolio, "Keep a copy" (`portfolio-view.tsx:199`): a secondary button "Import transactions from a CSV" (44 px) opening the import panel (phone: `PhoneFormSheet` "Import transactions"; desktop: an in-page panel below).
- Wealth, the "Add to your wealth" sheet (`wealth-view.tsx:73`, `ManualSourceCards`): a last card "Import from a CSV file" opening the same panel for holdings.
### The panel, four steps (one `form`, "Step {n} of 4", Back/Next)
1. **Choose a file.** `<input type="file" accept=".csv,text/csv,text/tab-separated-values">` labelled "CSV file", fine print "Read on this device only. Nothing is uploaded." Refusals: the size and row messages above; "This file has no header row."
2. **Match the columns.** One select per field ("Coin", "Type", "Quantity", "Price per coin", "Fee", "Date", "Note" / holdings: "Name", "Asset", "Quantity", "Kind of asset", "Value", "Currency", "Notes"), each pre-filled by `guessMapping`, with "Not in this file" as an option; required fields marked; "Delimiter" (auto-detected, changeable), "Numbers use" ("Point for decimals · 1,234.56" / "Comma for decimals · 1.234,56"), "Dates are" (ISO / day-month-year / month-day-year / day.month.year / month name), shown with the first three values of the chosen column as examples. Ambiguous dates: "These dates could be read both ways. Choose the order." Portfolio only: "Into portfolio" select (existing portfolios, or "New portfolio" with name, kind real/hypothetical and currency).
3. **Preview.** A table of the first 50 rows with the resolved values; a summary line "{ready} rows ready · {unknown} unknown coins · {refused} rows refused"; unknown coins listed as "Row {n}: "{text}" is not recognised; choose a coin from the list or skip the row." with a `CoinPicker` and a "Skip row" per entry (the choice applies to every row with the same text); refused rows listed with their reasons (they are skipped; nothing stops the import unless no row is ready). Transfers without a price: "Row {n}: no price; the cost of what it brings stays unknown."
4. **Confirm.** "Import {ready} transactions into {portfolio}" / "Add {ready} assets to Wealth" (primary); fine print "You can undo this import from the banner until you change any of these records." After apply: a `role="status"` banner on the page, "{n} transactions imported into {portfolio}. Undo" (the Undo button 44 px, quiet), kept until undone, dismissed or expired (7 days); "Recent imports" rows in the panel list the ledger with "Undo" each.
Errors: the storage message (`storageMessageOr`), the history refusal, "Nothing to import: every row was refused."
### Phone, desktop, tablet
Phone first: the sheet, 16 px selects, the preview table scrolls horizontally inside its own box (no page scroll), 44 px rows. Authorized desktop differences: the two buttons and the panel (README items 7 and 8).
### Motion, keyboard, screen reader
No new motion. The file input, selects and table are native; the summary line is `aria-live="polite"`; step changes move focus to the step heading.

## Showcase data
No W3 fixture (importing into the Showcase portfolio would change its labelled history); the Showcase example import is I1's. The entry points show in Showcase and work on the tab's session storage.

## Help entry (`help-imports`, shared with I1)
**Can I import a CSV from another app?** Yes, from any spreadsheet or export that has a header row: choose the file, match its columns, check the preview and confirm. Transactions go into a Portfolio, holdings into Wealth, meals into Health's diary. The file is read on this device and never uploaded; blank cells stay unknown rather than becoming zero; a coin that isn't recognised is yours to choose or skip. One tap undoes an import until you change any of the records it added. There is no MyFitnessPal preset yet: its export format could not be verified.

## Tests
Unit (`lib/csv/*.test.ts`, `lib/import/holdings.test.ts`):
1. Parser: `a,b\r\n1,"x, y"\r\n2,"say ""hi"""` → rows `[["1","x, y"],["2",'say "hi"']]`; a BOM is stripped; `;` and tab files parse with the detected delimiter; a quoted field with a line break stays one field; a ragged row is padded with a warning; 2,000,001 bytes refused; 20,001 rows refused; CR-only line ends.
2. `guessMapping`: headers `Date,Type,Pair,Amount,Price,Fee,Note` → every field found; `Datum;Menge` → nothing guessed, no crash.
3. Numbers: `"1,234.5"` point → `1234.5`; `"1.234,5"` comma → `1234.5`; `"0,5"` with style guessed comma → `0.5`; `"1e5"` refused; `""` → `null`.
4. Dates: `2026-10-01T12:00:00Z` → `2026-10-01`; `01/10/2026` dmy → `2026-10-01`, mdy → `2026-01-10`; `03/04/2026` is ambiguous; `1 Oct 2026` month-name; `2027-01-01` refused as future on 2026-10-01.
5. Plan: a buy without price refused; a transfer-in without price ready with `price` absent; "Deposit" → `transfer-in`; `resolveCoin("btc")` → Bitcoin with the catalog, and with the fixture failing → the featured Bitcoin; `"DOGE"` without catalog → `null` (unknown).
6. Apply: three ready rows → three transactions with ids `imp_<id>_1…3`, the portfolio's coins extended once per coin; a sell before its buy → the whole import refused and the data unchanged (`checkHistories`).
7. Holdings: `Gold,XAU,2,Precious metals,,EUR` → a `MANUAL` position with asset "Gold grams"… exactly what `manualSourcePosition` returns for that input; `value` blank → no `valuation`; a four-letter currency refused.
8. Undo: removes exactly the created ids; an edited (removed and re-added) transaction is not touched; a Wealth position with an allocation refuses with the message; the ledger drops the record after undo; a 21st import drops the oldest; expired records pruned; unreadable ledger → no banner, import still works.
Browser (`tests/holdings-import.spec.ts`, desktop and mobile; `**/api/**` → 503):
- Portfolio: upload a 4-row CSV (`setInputFiles` with a buffer), the mapping is pre-filled, one row's coin "DOGE" is unknown → choose "Skip row", confirm → 3 transactions listed, the banner "3 transactions imported into Long-term. Undo"; the stored Portfolio key holds the three ids; "Undo" → they are gone and the key is as before.
- Wealth: "Import from a CSV file" with two holdings → two asset cards "Needs valuation" where no value was given; Undo removes both.
- Network: `page.on("request")` collects every request after the file is chosen; none has a body or URL containing any cell of the file, and the only requests are the existing 503-routed catalog calls.
- 390×844: the sheet, 16 px controls, the preview scrolls inside its box, Undo ≥ 44 px.

## Risks and open questions
- A CSV exported by an exchange may list fees in the coin, not the currency; the import treats "Fee" as the portfolio currency and says so under the field ("Fee in {currency}; leave the column unmatched if it is in coins").
- Open: whether an import should be able to create a Wealth position with `valuationMode: "automatic"` (CoinGecko reference) when the coin is recognised. Recommendation: not in PR 3; the person can set it on the asset afterwards.
