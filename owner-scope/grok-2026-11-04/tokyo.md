# TOKYO: Wealth / Portfolio / Markets / Add money / Calculator / Wealth widgets + ZIGi & NOVA from those pages
Run: 2026-11-04 (Brussels). Clean app, fresh browser profile, fake test data only. IDs TK-xxx. Shots: /workspace/zigoals/shots/2026-11-04/
Started 01:17.

## Sections
1. Re-check of old bugs (FIXED / STILL OPEN / CHANGED)
2. Wealth (asset classes, accounts, debts, net worth, CSV import/export)
3. Portfolio
4. Markets (favourites, watchlists, coin pages)
5. Add money
6. Calculator
7. Wealth widgets
8. ZIGi from Wealth/Portfolio/Markets (25+ prompts)
9. NOVA from Wealth/Portfolio/Markets (25+ prompts)
10. Widths (375/768/desktop) and themes
11. Per page: what works / missing vs competitors / copy-UX notes
12. Summary + TOP 10
# Tokyo (Wealth + Portfolio) — run 2026-11-04
Fresh isolated Chrome profile (/tmp/tokyo-1104, desktop ~1280px at 80% zoom, dark theme), no demo loaded. Fake data only. Wealth page driven by hand (Computer tool).

## 1. Re-check (pass 1)
(see bottom of file for the table; filled as I verify each item)

## Findings

### TK-001  Wealth > Add asset (crypto) > BTC/ETH  [POSITIVE]
Steps: Wealth > + Add asset > search "BTC" > Choose Bitcoin > qty 0,5 > Save; repeat with "ETH", qty 2.25.
Expected: assets saved and counted in the total.
Actual: Bitcoin is the FIRST result for "BTC" (old bug: memecoins first, FIXED). BTC 0.5 x $77,299.27 -> $38,649.63; ETH 2.25 x $2,272.48 -> $5,113.09; Total tracked wealth $43,762.72 = 38,649.63+5,113.09 (BTC and ETH are included in net worth: old "net worth omitting BTC/ETH" FIXED). Net-worth card "Holdings in Wealth" $43,762.72 matches the hero. Both cards show "Current" with CoinGecko timestamp 1:16 AM. A "1 of 1 market price current / Nothing needs attention" strip appears.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-004.png (later state)
Suggested fix: none.

### TK-002  Wealth > Add asset > search  [POLISH]
Steps: search "ETH".
Expected: Ethereum, Ethereum Classic, Lido stETH, Rocket Pool ETH.
Actual: Ethereum first (good), but "Tether" and "Tether Gold" appear 5th/6th (substring match on "ETH" inside "Tether"), ahead of verified bridged ETH tokens. Long tail of unverified lookalikes (Unverified warning is shown, good).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-002.png (not captured; seen live)
Suggested fix: rank prefix/symbol-exact matches above substring-in-name matches.

### TK-003  Wealth > Accounts > balance with decimal comma  [MAJOR]
Steps: Add an account or debt > Savings, name, currency EUR > Update balance > type "1500,75" > Save.
Expected: EUR 1,500.75 (EU decimal comma) or a validation error.
Actual: silently saved as EUR 1,500.00 — the ",75" is dropped with no warning. (Typing "12000.50" with a dot works: Car loan EUR 12,000.50.) Same field in the asset quantity box accepts "0,5" visually; BTC quantity then shows 0.5 BTC so that path works, so inconsistency between forms.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-003.png
Suggested fix: one shared locale-aware number parser for every money/quantity field; reject ambiguous input.

### TK-005  Wealth > Accounts > add form  [MINOR]
Steps: Add an account or debt > click Name > type "Savings Test" + Tab + more fields in quick succession.
Expected: all text kept.
Actual (first attempt): account was created with name "S" and no balance (focus/state lost after the first character on the freshly opened form). Retrying field by field with a click per field worked. Also the status line stayed "S added." / "S saved." after rename (stale name) until the next action.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-005.png (n/a)
Suggested fix: avoid re-mounting the form on each keystroke; refresh status text with current name.

### TK-006  Wealth > Net worth card (accounts + debts)  [POSITIVE]
Steps: Savings EUR 1,500.00; Car loan (Loan) EUR 12,000.50.
Expected: net worth EUR = 1500 - 12000.50 = -10,500.50.
Actual: card "Net worth · EUR" shows -€10,500.50, Accounts €1,500.00, Debts €12,000.50; separate "Net worth · USD" $43,762.72. Explanation line: "Net worth = accounts + Wealth holdings with a value − debts, per currency, never converted between currencies." Math correct. Account kinds offered: Cash, Savings, Investment, Pension, Property, Vehicle, Other asset | Loan, Mortgage, Credit card, Other debt. Debt rows have "Record a payment" and "When would it be paid off?" and "Plan paying off your debts".
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-004.png
Suggested fix: n/a. See TK-007 for the multiple-totals note.

### TK-007  Wealth > Multiple totals on one page  [CHANGED / MINOR]
Steps: scroll the Wealth page with BTC/ETH (USD) + EUR account + EUR debt.
Expected: one headline number, or clearly labelled per-currency numbers.
Actual: hero "TOTAL TRACKED WEALTH $43,762.72" (holdings only), then per-currency "Net worth · USD $43,762.72" and "Net worth · EUR -€10,500.50", Portfolio composition "USD known total $43,762.72", category tile "Crypto $43,762.72". Numbers are consistent and labelled, but there is still no single combined net worth: EUR account/debt are never converted to USD, so "Total tracked wealth" ignores accounts and debts entirely (hero says "Total tracked wealth" while net worth is a different number).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-004.png
Suggested fix: let the user pick a base currency and show one converted net worth, keep per-currency breakdown under it (Kubera/Monarch do this).

### TK-008  Wealth > Import CSV > column mapping  [POSITIVE]
Steps: Add asset > Import from a CSV file > choose fake-wealth.csv (15 rows, 7 cols: Name,Symbol,Quantity,Asset class,Market Value,Currency,Account).
Expected: Name->Name, Symbol->Asset, etc.
Actual: Step 2 "Match the columns" auto-mapped Name->Name, Symbol->Asset(Symbol), Quantity, Asset class->Kind, Market Value->Value, Currency. Old "CSV Name/Symbol mapping" bug: FIXED. Delimiter selector, "Numbers use" selector, save mapping as a preset, 4-step wizard, undo banner (7 days). The "Account" column has no target field (silently ignored; Notes defaulted to "Not in this file").
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-008.png
Suggested fix: offer Account/Notes mapping or say which columns are ignored.

### TK-009  Wealth > Import CSV > refused rows have no reason  [MAJOR]
Steps: continue the import above to the Preview step.
Expected: each refused row listed with the reason (fake currency XYZ, negative qty, zero, 99999999999999999999, decimal comma 1.234,56, cash rows).
Actual: "9 rows ready · 6 rows refused" and only "6 rows refused (skipped)". Rows 3,4 (Cash EUR 2500.50 / USD "1.234,56"), 9 (XYZ), 10 (negative), 11 (zero), 12 (huge) were dropped; the user can't see which or why. Notably the two plain Cash rows were refused (cash class apparently expects something else) with no hint. Fake currency XYZ is refused here (good, but see TK-010 for the manual form).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-009.png (not captured; seen live)
Suggested fix: list refused rows with row number + reason, allow "download refused rows".

### TK-010  Wealth > Import CSV > class mapping  [MINOR]
Steps: Preview columns "Kind" for the 9 ready rows.
Expected: ETF -> ETF, Vehicle -> Vehicle (as the add-asset modal offers ETFs, Property).
Actual: "Vanguard S&P 500 ETF" (class ETF) imported as Kind "Stocks"; "Old Skoda" (class Vehicle) became "Custom asset"; Real estate -> Property, Precious metals ok, Stocks ok, Crypto ok. Help text: "anything else becomes a custom asset".
Suggested fix: map the ETF class (and synonyms: equity, real estate, car).

### TK-011  Wealth > Import CSV > duplicates  [MINOR]
Actual: the duplicate row (Apple Inc AAPL 10 1850.40, appearing twice in the file) was imported twice with no warning, so Apple counts 2x. Preview shows both rows.
Suggested fix: flag likely duplicates (same name+symbol+qty) in the preview.

### TK-012  Wealth > Net totals after import  [POSITIVE / CHANGED]
Actual: after import the hero changed to "KNOWN TRACKED WEALTH €289,200.00" with chip "+ $64,173.52 held in USD" and "Currency totals stay separate; no exchange rate is assumed." My expectation: EUR 285000+4200 = 289,200 OK; USD 43,762.72 + 2x1850.40 + 2100 + 5400 + 1500 + 7700 + 10 = 64,173.52 OK. "Available for Goals" shows €289,200.00 (no shrink; old tile shrinking bug not reproduced for these values). Old "several totals on one page" is now CHANGED: a clearer per-currency split, but headline flips to EUR just because EUR is larger; no base-currency setting.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-012.png

### TK-013  Wealth > imported precious metals > unit/label  [MAJOR]
Steps: CSV rows "Silver coins, XAG, 50, Precious metals" and "Gold bar 100g, XAU, 2, Precious metals"; look at cards after import.
Expected: silver shown as silver; gold bar qty 2 (of what?).
Actual: BOTH cards say "Gold grams - Precious Metals"; Silver coins is "50 grams of Gold", detail page "GOLD GRAMS", "Available 50 Gold grams". The XAG symbol was ignored, silver is labelled as gold. "Gold bar 100g" with Qty 2 shows "2 grams of Gold" (name says 100g each, CSV can't express unit). Reference price "Unavailable" for these.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-014.png (detail page, after edit)
Suggested fix: map XAG->silver, XAU->gold; ask for unit when importing metals.

### TK-014  Wealth > Edit asset > valuation currency  [MAJOR]  (old bug "fake currency XYZ accepted": STILL OPEN)
Steps: open Silver coins > View & manage asset > Edit asset > Valuation currency (free-text input) = "XYZ" > Save changes.
Expected: validation error (not an ISO 4217 code).
Actual: saved, toast "Silver coins saved.", holding value shows "1,500 XYZ", Allocated "0 XYZ". (CSV import refused XYZ row, but the edit form accepts it.) The same value is now a separate currency bucket that can never be converted/compared.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-014.png
Suggested fix: make currency a dropdown/validated against ISO list; same validator for CSV, add and edit.

### TK-015  Wealth > Edit asset form > typing  [MINOR]
Steps: Edit asset modal; triple-click a field then type; click field, Ctrl+A, type "1234,56", click Save.
Actual: triple-click selection + typing dropped characters in the modal fields on first attempt (text unchanged); Ctrl+A + type worked for the currency field. The value field kept 1500 after typing "1234,56" and Save, so the decimal-comma edit was not applied/it was lost. Possibly the same re-mount/focus bug as TK-005 (may be partly the slow test environment).
Suggested fix: investigate dropped input in modals, never re-render inputs on keystroke.

### TK-016  Wealth > Reload persistence  [POSITIVE]
Steps: F5 on /app/wealth after import (13 items).
Actual: all assets persist (local), prices for BTC/ETH keep their CoinGecko timestamp 1:16 AM with "Current" badge, imported manual assets have "Manual value" badge and creation time. Banner: "Your records stay in this browser and are not a backup".

### TK-017  Wealth > Price freshness + Refresh prices  [POSITIVE]  (old bugs "Current on stale prices" and "refresh with no feedback": FIXED)
Steps: BTC/ETH priced 1:16 AM. Reload at ~1:31 (still "Current"), again at ~1:32 > 15 min. Click Refresh prices.
Actual: after the 15-minute window the strip flipped to "0 of 2 market prices current - 2 need attention: 2 prices older than 15 minutes" and the filter chip "Needs attention 2" appeared. Refresh prices shows a "Refreshing..." disabled button, then "Prices updated at 1:32 AM", strip back to "2 of 2 market prices current / Nothing needs attention", USD holdings changed from $62,673.52 to $62,577.12 (live price move). Note: the Current badge stayed for a while on a client-side navigation until the page re-evaluated (it only updates on reload/nav, not live), minor.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-017.png (not captured)
Suggested fix: re-evaluate freshness on a timer; show "last refresh failed" state if CoinGecko errors.

### TK-018  Settings > Export everything (ZIP) > wealth CSVs  [MAJOR]
Steps: Settings > Data & privacy > "Everything you've saved, in one file" > tick "I understand..." > Export everything. Unzipped: README.txt, everything.json, 20 CSVs. Copies: /workspace/zigoals/testrun-2026-11-04/export-wealth-positions.csv and export-accounts.csv.
Expected: a readable wealth CSV I can re-import (names, qty, value, currency, class), same column names as the import template.
Actual: wealth-positions.csv has 11 rows (13 shown in the UI, minus nothing? the 2 accounts live in accounts.csv - OK) but the quantity is an 18-decimal integer ("500000000000000000" = 0.5 BTC, "10000000000000000000" = 10 AAPL) and valuations are minor units ("185040" with valuation_decimals 2 = 1850.40; "28500000" = 285,000.00). Unreadable in a spreadsheet and not the format the importer expects (importer template: Description,Symbol,Quantity,Asset class,Market Value,Currency,Account). BTC/ETH have empty valuation (market-priced, no value exported). Silver coins exported as asset "Gold grams" with currency XYZ (TK-013/TK-014 carried into the export). Property/vehicle/long-name rows have asset "UNIT". accounts.csv exports balances in minor units, e.g. Car loan "99999999999999" (= 999,999,999,999.99 from my huge-number test). Round trip: wealth-positions.csv is NOT directly re-importable through Import CSV.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-018.png (not captured; download chip showed zigoals-export-2026-11-04.zip 32.7 KB)
Suggested fix: add a human-readable "Wealth (CSV)" export with the same columns as the import template (decimal quantity, decimal value, currency, class, account) plus the quote used and date.

### TK-019  Import template header vs importer  [POLISH]
Actual: downloaded zigoals-template-brokerage.csv uses header "Description,Symbol,Quantity,Asset class,Market Value,Currency,Account" and the import Step 2 labels the first column "Name - e.g. Apple Inc" (Description is mapped to Name). Works, but the template and the dialog use different words, and "Account" has no destination.

### TK-020  Portfolio > create portfolio + first Buy  [POSITIVE]
Steps: /app/portfolio > New portfolio "Tokyo test coins" (Real holdings, USD) > pick Bitcoin chip > qty "0,5" (decimal comma), price 60000, fee 10 > Save transaction.
Expected: cost basis 0.5*60000+10 = 30,010; value = 0.5 x live price; P&L = value - cost.
Actual: Cost basis $30,010.00 (fee included), avg cost $60,020.00/BTC, price $77,136.52 (CoinGecko, 1:31 AM), value $38,568.26 = 0.5 x 77,136.52, all-time result +$8,558.26 (+28.52%), 24h +$92.62. Math correct, prices formatted with 2 decimals (old bug "unformatted prices $80090.0901..." FIXED here). Decimal comma accepted in the Portfolio quantity field. Tabs Coins / Analysis / Insights. Cost basis note: "Average cost ... lots are not tracked" (no FIFO/lots).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-020.png
Suggested fix: n/a; consider lot tracking.

### TK-021  Portfolio > page notice + isolation from Wealth  [MINOR]
Actual: banner "Portfolio is off until you turn it on - show it in the sidebar" is shown while the page is fully usable; intro says "It stays apart from your Wealth and Goals", so the Portfolio BTC (0.5) is NOT in Wealth totals and vice versa (my Wealth BTC 0.5 is separate). Two parallel BTC holdings with different prices/timestamps (Wealth 1:16 vs Portfolio 1:31) may confuse users; no link/import between them.
Suggested fix: offer "copy to Wealth" / one source of truth, or explain on the Wealth page.

### TK-022  Environment note  [POLISH]
Typing into the page via the test harness was heavily lagged (screens updated 5-20 s late; the first quantity entry "0,5" was lost and I had to retype). Could not tell app vs. harness; not counted as an app bug.

## What works / Missing vs competitors / Copy-UX (Wealth + Portfolio, partial)
What works: crypto search ranking, per-currency net worth math, CSV wizard (mapping auto-detect, preset save, undo), price freshness + refresh feedback, persistence on reload, Portfolio cost-basis/P&L math.
Missing vs YNAB/Monarch/Kubera/Delta/CoinStats: base-currency converted net worth, human-readable CSV export that round-trips, refused-row report on import, ISO currency validation everywhere, duplicate detection, lot-level cost basis, link between Portfolio and Wealth.
Copy-UX: "Total tracked wealth" vs "Net worth" are two different numbers; "refused (skipped)" gives no reason; Portfolio "off until you turn it on" banner contradicts a working page.

## 1. Re-check (pass 1) - summary
- Net worth omitting BTC/ETH: FIXED (TK-001/006)
- 'Current' badge on stale prices: FIXED (TK-017)
- Refresh with no feedback: FIXED (TK-017)
- Unformatted prices: FIXED in Wealth + Portfolio (TK-001/020)
- Fake currency XYZ accepted: STILL OPEN in Edit asset form (TK-014); CSV refuses it
- Several totals on one page: CHANGED (TK-007/012)
- CSV Name/Symbol mapping: FIXED (TK-008); ETF/Vehicle class mapping still lossy (TK-010)
- 'Available for Goals' shrinking huge values: NOT FULLY RE-VERIFIED (normal values OK, TK-012)
- No upper limit on values: STILL OPEN (a 999,999,999,999.99 debt was accepted; 99999999999999999999 CSV row was refused)
- 'Explain wealth change' 99% unclassified: NOT TESTED

## Pass 2
(Run 2026-11-04 from 01:37 Brussels. Chrome profile /tmp/tokyo-1104 driven through the desktop (screen) because the scripted browser tool cannot attach to that profile; screens lag 2-5 s so some captures show the previous state. Screenshots are .webp copies of desktop captures in /workspace/zigoals/shots/2026-11-04/.)

### TK-023  Portfolio > Sell + realised P&L  [POSITIVE]
Steps: /app/portfolio "Tokyo test coins" (Buy 0.5 BTC @60,000 fee 10) > Type Sell, qty 0.1, price 70,000, fee 5 > Save.
Expected: proceeds 6,995 - avg cost 6,002 = realised +993; holding 0.4; cost basis 0.4 x 60,020 = 24,008.
Actual: Realised +$993.00, unrealised +$6,846.60, all-time +$7,839.60 (+26.12%), cost basis $24,008.00, holdings 0.4 BTC. All correct, and the header now shows "Realized +$993.00 · unrealized +$6,846.60" (old P3 "All-time result: Unknown / realised only on coin page" FIXED). The Type list offers Buy / Sell / Transfer in / Transfer out only (no reward / airdrop / income type: P5 part STILL OPEN).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-023-sell-result.webp
Suggested fix: add Reward / Airdrop / Staking income types.

### TK-024  Portfolio > Oversell error far from the form  [MAJOR]
Steps: Sell 10 BTC @70,000 (own 0.4) > Save transaction (also via Enter in the field).
Expected: inline error next to the field / button, focus moved to it, field marked invalid.
Actual: nothing happens next to the button. The message "This would take the holding below zero on Nov 4, 2026. Record what came in first, or change the amount." appears at the very TOP of the page (~600-1,200 px above the form, outside the viewport), no scroll, no focus, no aria-invalid. The message wording itself is good. The same message also lingered unchanged after I later tried to remove the Buy that backs the sell (the Buy stayed, no new explanation). Before that, an empty-quantity attempt put "Enter a quantity above zero." BELOW the Save button, so the button jumped and my next click missed.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-024-oversell-error-top.webp
Suggested fix: show the error directly above/below Save and scroll/focus it (role=alert); never shift the button under the pointer.

### TK-025  Portfolio > Remove transaction  [POSITIVE]
Steps: coin row > Remove on the Sell.
Actual: toast "Transaction removed." with an Undo button; totals revert at once (value $38,568.26, realised +$0.00); Undo gives "The transaction is back." and totals return. The form stays open (old P7 "no undo / form collapses" FIXED). Still: the portfolio-list row has only Remove (no Edit), no confirmation before remove, and removing the Buy that backs a Sell is silently refused (see TK-024).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-025-undo-remove.webp , TK-025b-undo-back.webp

### TK-026  Portfolio > Edit transaction (coin page)  [POSITIVE]
Steps: click Bitcoin > coin page /app/portfolio/coin/bitcoin > Sell row > Edit > quantity 0.1 -> 0.2 > Save.
Expected: realised = 0.2 x (70,000 - 60,020) - 5 = 1,991; holdings 0.3.
Actual: "Sell of BTC updated.", holdings 0.3 BTC, value $23,140.95, realised +$1,991.00, unrealised +$5,134.95, cost of what you hold $18,006. Correct. Coin page also has a FIFO / LIFO "same sales by lots" view (both give +$993 before the edit) with a "not tax advice" line: nice, beats most free trackers. Edit exists only on the coin page, not on the Portfolio list (P7 edit: CHANGED = fixed on coin page only).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-026-edit-sell-coinpage.webp
Suggested fix: add Edit next to Remove in the list too.

### TK-027  Portfolio > Edit form layout + FIFO radios  [POLISH]
Actual: in the edit form the "Save transaction" button is a huge gradient block (~330 x 60 px) sitting in the grid beside the Type select, while the new-transaction form has a full-width bar. In "The same sales by lots" the FIFO / LIFO radio dots sit on one line and their labels on the next line under the wrong dot.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-027-edit-form-layout.webp
Suggested fix: reuse the same form component; put radio label next to the input.

### TK-028  Portfolio coin page > Bitcoin price block  [MINOR]
Actual: the chart block shows "76841.77423078995 USD" (raw float, no separators, 14 decimals) under "observed price Nov 4, 2026, 1:38 AM", while the header of the same page says $77,136.52 at 1:31 AM. Two prices and two timestamps on one page (old W8 / M12 / N-194 STILL OPEN here). Also "+18.96% Between shown observations" with no explanation.
Suggested fix: format with 2 dp + separators; use one price/time or label "chart observation".

### TK-029  Portfolio > Analysis tab  [MINOR]
Steps: Tokyo test coins > Analysis.
Actual: "Value over time" with 24H/7D/30D/90D/1Y/All buttons (30D active, i.e. active range is marked: fine), Allocation donut (BTC 100% $23,140.95), "View exact values - 97 moments" (accessible table). Because all trades are dated today the 30-day line is flat then a vertical spike on the last day; headline "$23,071.27 · 1:40 AM" differs from the Value card "$23,140.95" above it (historical price vs live price, not explained). Chart caveat text is honest ("From CoinGecko dated prices and your transactions ... scale does not start at zero").
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-029-analysis-tab.webp
Suggested fix: when range value != live value say "as of 1:40 AM"; show cost-basis line for comparison (Delta/CoinStats do).

### TK-030  Portfolio > Insights tab  [POLISH]
Actual: Insights = a flat Transactions list (all coins filter, Edit + Remove per row, so Edit IS available here) plus an opt-in card "Trader tools: wins/losses, hold time, fees, results by month, a gentle tilt check, cost-of-leverage illustration ... Off until you turn them on; not advice" with a "Turn on trader tools" button (not clicked). Tab name "Insights" promises more than a transaction list. Page bottom also has: Exchanges (read-only) Connect Kraken / Coinbase / Binance (not clicked, would need API keys), "Realised gains by year (CSV)" (accountant export, "not tax advice"), Import transactions from CSV, Export portfolios (F8 tax report: CHANGED, a realised-gains CSV exists; F2 exchange import: CHANGED, read-only exchange connectors exist).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-030-insights-tab.webp
Suggested fix: rename tab to "Transactions" or surface key stats by default.

### TK-033  Markets > coin page (Wealth asset page, Bitcoin owned + Solana watch-only)  [MAJOR]
Steps: Markets table > click Bitcoin (owned) then Solana (not owned); read header, sparkline, Price history card.
Expected: Each coin shows its own chart; prices formatted; same price in header and history card; range options like 24H/7D/30D/90D/1Y/All.
Actual: (a) Bitcoin and Solana show the IDENTICAL 7-day sparkline and big "Available" chart shape (peak then decline) although prices differ ($77k vs $92) - looks like shared/placeholder history. (b) Price history headline is raw unformatted: "76841.77423078995 USD" / "91.76606137716966 USD" (old W8 STILL OPEN) and differs from the header price ($77,136.52 / $91.79). (c) "Available" shows "+23.97% between shown observations" while 24h is -0.32%: confusing. (d) Ranges only 24H / 7D / 30D / Available; default selected "Available". (e) Solana page first renders a broken sparkline fragment and "Loading observed prices" 3-5 s. (f) Owned coin route /wealth/asset/<uuid>, watch coin /wealth/asset/coingecko:coin:solana; non-owned page offers "Add an owned asset" banner; Remove favourite button present on both (good).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-033-sol-loading.webp , TK-033b-sol-coinpage.webp
Suggested fix: format to currency with sane decimals, use one price source in header and card, verify per-coin history fetch, add 90D/1Y, label "Available" as e.g. "Max".
Recheck: M11 CHANGED (coin page exists and opens from Markets, still raw numbers); W8 STILL OPEN. Markets Owned filter resets to All after Back (table view + stars persist).

### TK-034  Wealth > Add money flow (/app/wealth/add-money)  [MINOR]
Steps: Wealth > "Add money ->" > choose Bitcoin > read steps 2 and 3. Stopped there: step 3 needs a linked wallet (rule: no real wallet), so provider hand-off and payment were NOT tested.
Expected: Clear, honest 3-4 step guide; dead-end explained with a next action.
Actual: Step 1 offers 7 coins (USDC, USDT, ETH, SOL, BTC, ATOM, "ZIG via ATOM" 3-step route) as radio cards - clean plain-language copy, "What's this?" links, strong disclaimer "ZIGoals sells nothing and never touches your money". Step 2 network shows a single "Bitcoin - Recommended" option plus an amber warning about wrong-network loss (good). Step 3 "Where should it arrive?" is just a paragraph: "Link a wallet for Bitcoin first... from More wallets beside Connect Keplr, or on a phone from the Status & wallet sheet" - no button/link to where that is, and refers to UI ("More wallets", "Status & wallet sheet") the user has not seen. Header kicker says "Buy crypto with a card or a bank transfer" yet nothing about price, fees or providers is shown before leaving. Steps 2-3 appear below the fold with no scroll/focus after choosing a coin (user may not notice anything happened; same pattern as TK-024). Radio cards: whole card clickable (works).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-034-addmoney-step3.webp , TK-034b-addmoney-step1-2.webp
Suggested fix: add a "Link a wallet" button in step 3, scroll next step into view, show provider names/fee estimate up front, allow "no wallet yet: I just want to record a manual buy".
Page notes - works: coin choice, network warning, disclaimer. Missing vs CoinStats/Delta (they link exchanges/wallets read-only and show provider price comparison) and Kubera (manual add). Copy: "Buy a digital dollar" is friendly; "ZIG via ATOM" lacks a fee/time estimate.

### TK-035  Wealth > Compound interest calculator (/app/wealth/calculator)  [POSITIVE]
Steps: Open page (defaults 1,000 start, 200/mo, 5%, 20y => $84,919.37, put in $49,000 - correct). Set contribution 100, years 10.
Expected (old C2): put in $13,000; assumptions visible.
Actual: Estimated final $17,175.24, You put in $13,000.00, growth +$4,175.24 (matches monthly-compounding maths; 1,000 alone 10y = $1,647.01 also correct). The sentence under the figures spells out every assumption: "Assumes $1,000.00 to start and $100.00 every month, at the end of each period, never raised; a 5 % yearly return, added every month; for 10 years; no inflation; no fees or taxes." Compare-with chips (7 %, 3 %, "Started 5 years earlier", "Another return"), USD/EUR switch, years slider, "And months", "Interest added" selector, milestone marker (10k), and a "Turn this into a goal" button. No hidden raise/inflation defaults any more.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-035-calculator-10y.webp
Recheck: C2 FIXED. C1 (Earn wording vs monthly compounding) NOT re-checked: Earn page not opened. C3 (staking calculator) NOT covered.

### TK-036  Wealth > Calculator > invalid input state  [MINOR]
Steps: Years field accidentally became 10100 (my key presses landed there while the screen lagged) .
Expected: Field-level message; last good result kept or greyed; focus stays at field.
Actual: Field turns red with "Whole years from 1 to 60." (good, hint text "From 1 to 60 years." changes to the error), but the whole results card (headline, chart, compare list) disappears and is replaced by a small card "Correct the marked field to see the estimate. The figures come back as soon as every field is valid." leaving a huge empty left column; the page jumps up. It recovers as soon as the value is valid. The invalid year value is also not clamped, and the slider jumps to its far end.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-036-calculator-invalid-years.webp
Suggested fix: keep previous result dimmed with the message; or clamp/limit maxlength to 2 digits.
Page notes - works: maths, assumptions sentence, compare lines, quick validation. Missing vs Kubera/CoinStats: no inflation toggle on the main plan, no goal-date target solver ("how much per month to reach X"), no save/share of scenarios, no CSV/print. Copy: "What it could grow to" clear; "10k" milestone label has no explanation.

### TK-037  Today > wealth widgets (Known tracked wealth line, Life overview, Recent activity)  [MINOR]
Steps: Open /app, scroll through all cards with the test data (BTC 0.4/0.5, ETH, AAPL, cash, "Car loan" debt set to 999,999,999,999.99).
Expected: Same figures and labels as Wealth; huge/debt values readable; debt reflected or its omission explained.
Actual: (a) "Today tracked wealth EUR289,200.00" strip, Life overview card "Known tracked wealth - currencies kept separate EUR289,200.00" + chip "+ $62,444.48 held in USD +1", "11 assets . 0 need attention", Wealth ring "EUR0.00 of EUR289,200.00 for Goals" - all agree with the Wealth page (EUR289,200.00). The USD chip differs from Wealth by $133 (62,577.12 vs 62,444.48) only because BTC price moved between loads - consistent, but there is no "as of" time on the chip (old W10 CHANGED: labelled, no skeleton). (b) Headline total excludes the USD holdings and the ~EUR1 trillion Car loan debt: the debt is shown only in Recent activity ("Car loan: balance updated EUR999,999,999,999.99", fits the card, no overflow - G2 style truncation not needed here). Net worth is thus presented as EUR289,200 while a debt 3 million times bigger exists - misleading for a "Known tracked wealth" label unless the debt is called out. (c) On first paint the Life overview wealth figure is blank for ~1-2 s, then fills (pop-in). (d) The hero "Make Today yours" interest picker (Balanced / Wealth / Habits+Health / Health-only) still shows after use, above the fold of the actual data. (e) G1 wallet USD/EUR/BTC pills: not found on Today in this profile (no wallet linked) - NOT verified.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-037-today-activity-huge-debt.webp , TK-037b-today-life-overview.webp
Suggested fix: add a "Debts: EUR999,999,999,999.99 not included" line or include debts in net worth; cap debt input; show "as of hh:mm".
Recheck: W1 CHANGED (single consistent label "Known tracked wealth - currencies kept separate", but USD part not in main figure). G2 N/A. G3 not checked.
Page notes - works: consistent numbers across cards, empty-state links ("Plan a goal", "Log a weight"). Missing vs CoinStats/Delta: no portfolio value chart / 24h change on Today. Copy: "Today tracked wealth" reads oddly (missing colon/"Today's").

### TK-038  Wealth > "Explain recorded wealth change"  [MINOR]
Steps: /app/wealth > scroll to "Your recorded journey" > open "Explain recorded wealth change".
Expected (old bug: 99% unclassified): a classified breakdown, or an honest empty state.
Actual: Section is now a collapsed disclosure with explanatory text only: "Compare complete, unambiguous recorded observations of tracked, owned wealth. Goal reallocations do not change ownership... a remaining gap stays visible. This is not a return calculation..." and "Two complete observations in one currency are needed. Missing earlier evidence and competing observations at the same instant stay unresolved." Because the profile has no two observations on different days, no breakdown/percentages appear, so the old "99% unclassified" figure could NOT be reproduced (cannot confirm the maths). Copy bugs: (a) the line "Two valid observations on different days draw the chart." appears TWICE in the Recorded journey card, no chart at all; (b) the expanded paragraph touches the summary line (no padding under the focus outline); (c) text is dense, legalistic ("unambiguous recorded observations", "competing observations at the same instant").
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-038-explain-wealth-change.webp
Suggested fix: remove the duplicated sentence, plain-language rewrite ("Come back tomorrow: we need two daily snapshots"), add spacing; test again with 2+ days of history.
Recheck: W2 / "99% unclassified" CHANGED-unverifiable (empty state now). 

### TK-039  Wealth > Accounts, debts & net worth with a huge debt  [MAJOR]
Steps: Wealth > "Accounts, debts & net worth" with Savings EUR1,500, Car loan EUR999,999,999,999.99, EUR holdings 289,200, USD 62,444.48, XYZ 1,500.
Expected: Headline totals and "Available for Goals" consistent with net worth, huge debt flagged or capped.
Actual: Per-currency net worth cards are correct: EUR = -EUR999,999,709,299.99 (1,500 + 289,200 - 999,999,999,999.99 checks out), USD $62,444.48, XYZ 1,500 (custom currency gets its own card, old W5 STILL OPEN). The layout copes with the huge number (no overflow; old W4 layout part FIXED - "Available for Goals" shows EUR289,200.00 readable). BUT the hero "Known tracked wealth" and "Available for Goals" show EUR289,200.00 / EUR289,200.00 while net worth for the same currency is about -EUR1 trillion: two contradictory headline numbers on one page; no warning that a debt exists. The input accepted EUR999,999,999,999.99 with no plausibility warning (W4/W6 STILL OPEN as to limits). "Own/Owe" bars: Owe bar fills the whole width, Own bar is a hairline (OK).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-039-networth-huge-debt.webp
Suggested fix: warn when a debt dwarfs assets; add "Debts: EUR..." line under hero; cap amount at e.g. 1e12 with message; label hero "Assets only".
Recheck: W4 CHANGED (layout readable, no cap), W1 CHANGED (labels clear, per-currency), W5 STILL OPEN (XYZ currency accepted with own card).

### TK-040  Wealth > asset cards: reference price "Unavailable"  [MAJOR]
Steps: Wealth > What you have; compare cards with Markets table.
Expected (old W26): Same asset, same price in Wealth, Markets and coin page.
Actual: AAPL card: "Reference price per AAPL: Unavailable", "Manual value" $1,850.40 (10 x 185.04) while Markets shows Apple $329.73 "Current". VOO "Reference price: Unavailable" while Markets shows Vanguard S&P 500 ETF $689.50. Gold bar card "Unavailable" while Markets lists Gold $3,919.01. Meanwhile BTC card reference $76,880.82 vs coin page header $77,136.52 vs Markets $77,136.52 and history card 76841.77 (4 different BTC prices within ~10 minutes). Status banner says "2 of 2 market prices current" yet 5 assets could be matched to market prices; "Nothing needs attention". Card BTC briefly shows "24h - not current, from Nov 4 1:31 AM" then switches to "Market price" (W9: status flicker on load).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-040-wealth-cards-unavailable-ref.webp
Suggested fix: link manual stock/ETF/metal assets to the Markets quote (or offer "use market price"), one price source, label.
Recheck: W26 STILL OPEN, W9 STILL OPEN (badge/timestamp inconsistency), W11 CHANGED (counts consistent "2 of 2", "0 need attention", but reason for AAPL/VOO unavailability not explained), W3 CHANGED ("Manual value" badge now clearly shown, good), W10 STILL OPEN (total/prices change after load).
Page notes (Wealth) - works: clear "Manual value" badge, per-currency net worth, filter chips with counts, Hide amounts button, sections for spending, composition, evidence portfolios. Missing vs Kubera/CoinStats/Delta: no single converted total in a base currency (all three do FX conversion), no performance/history chart until 2 snapshots (Delta/CoinStats back-fill), no exchange/wallet sync, no per-asset P&L here (lives in Portfolio). Copy: "Known tracked wealth" + "currencies kept separate" good; "Undo import / 9 assets added to Wealth" banner persists across visits (stale, I did not click it).

### TK-041  Wealth > Add asset (Cash) > amount limit  [MINOR]
Steps: + Add asset > Cash > amount 999999999999999999 (18 digits) > Save asset.
Expected (old W4/W7): Plausibility limit with an inline error at the field.
Actual: Save is refused with the helper text "Enter an amount up to a trillion." - limit now exists (W4 limit part FIXED). But the message appears as small grey text BELOW the Save button, not at the amount field; the field is not marked red/aria-invalid; the dialog grows by ~18 px so the Save button jumps up under the cursor; no toast. Browser autofill history also pops over the amount field ("0,5", "2.25", "50", then "999999999999999999") - add autocomplete="off". Valuation currency offers USD / EUR chips plus a free-text box prefilled "USD" (same free-text currency path that created the XYZ net-worth card, W5).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-041-cash-over-trillion.webp
Suggested fix: show the message under the field in the error colour, link with aria-describedby, move focus to the field; autocomplete off.

### TK-042  Wealth > "Available for Goals" with a very large value  [POSITIVE with notes]
Steps: Add USD Cash 9,999,999,999.99 (field showed 9999999999.99 after my slow typing; it is below the trillion cap) > Save asset.
Expected: Layout stays readable (old W4: huge total shrinks unreadably).
Actual: Hero shows "$10,000,062,444.47" at full size, "Available for Goals $10,000,062,444.47" readable, chip "+ EUR289,200.00 held in EUR +1"; counts become "12 assets . 2 automatic . 10 manual", filter chip "Cash 1" appears. Layout holds (W4 layout FIXED). Notes: (a) the hero currency silently FLIPS from EUR to USD because USD is now the largest total - the headline unit changes with the data (confusing; user should choose a base/headline currency); (b) the old "Add asset saved" confirmation is only the counts changing - no toast; (c) "Allocated to Goals $0.00" shows USD while earlier EUR0.00, same flip.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-042-huge-available-for-goals.webp
Suggested fix: let user pin the headline currency; confirmation toast "USD Cash added".
Recheck: W4 FIXED (limit + readable layout), W7 CHANGED (limit message exists, placement poor, no toast).

### TK-043  Markets > favourites remove + persistence after hard reload  [POSITIVE]
Steps: Markets (Table view, 8 of 8 favourites) > click Solana star to remove > observe > F5 reload > scroll table.
Expected: Star clears, counter drops, order/state persists.
Actual: Counter "8 of 8 - full: remove one to add another" becomes "7 of 8" (the "full" hint disappears); Solana's row drops below the favourited rows (favourites sorted first under "As listed": BTC, ETH, AAPL, XAU, USDC, XAG, ZIG, then SOL, NVDA, VOO); after F5 it is still unstarred, Table view still active, footer stat "Favourite markets 7". Persistence works (M4/M7 FIXED). Minor: the row jumps position on click with no animation, so the cursor lands on a different coin (Apple) - risk of a mis-click on a second click; no toast "Removed Solana from favourites".
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-043-unfavourite-persist.webp
Suggested fix: keep row in place until next navigation or animate; toast with Undo.

### TK-044  Markets > first paint after reload  [POLISH]
Steps: F5 on /app/markets.
Actual: For 2-5 s the table renders "Not provided" in the 1h, 7d and Market cap columns for every row and purple (not gold) stars, then fills in real values (e.g. BTC 1h -0.53%, cap $1.55T). Looks like data was missing rather than loading. AAPL 24h also changes (-0.26% -> +0.29%) and Silver 24h (-1.46% -> +0.56%) between first paint and settled state (W10).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-044-markets-loading-flicker.webp
Suggested fix: skeleton rows or keep last known values greyed with "updating".

### TK-045  Markets > search  [POSITIVE]
Steps: type "zzzz" in "Search this market view"; clear with x.
Actual: Immediate filter; "No matching markets" + card "No matches in this view. Try another name or browse the full CoinGecko catalog." + "Find a market" button; clear (x) restores all 10 rows, "Showing 1-10 of 10 markets". Search is scoped to the current chip/view (label says so - good). The search box has no visible keyboard hint and its label ("Search this market view") is clear. Missing vs CoinStats/TradingView: search covers only the 10 listed markets; real discovery requires "+ Find a market" (separate flow, not tested in depth).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-045-search-no-match.webp
Recheck: M6 (search/filters) partly FIXED (Owned filter, empty state work).

### TK-046  Markets > "Markets is off" banner + no watchlists  [MINOR]
Steps: Open /app/markets directly.
Actual: A banner at the top says "Markets is off until you turn it on - show it in the sidebar", yet the page is fully working and the sidebar has no Markets entry (Today, Goals, Habits, Health, Wealth, Activity, NOVA, Checklist, Tasks, Notes, Journal, Settings, Help): contradictory and the only way in is Wealth or a typed URL. There is only ONE flat favourites list capped at 8 - no named watchlists, no alerts, no price targets, no sort other than "As listed" in the ones I saw.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-046-markets-off-banner.webp
Suggested fix: hide the banner when on the page, or add Markets to the sidebar by default; if watchlists are planned, say "Favourites (8 max)" and add a 2nd list.
Page notes (Markets) - works: Cards/Table persisted, chips All/Owned/Favourites/Crypto/Stablecoins/Stocks/ETFs/Precious Metals, Sort dropdown, 8-limit message, clear "Where values come from" explainer ("No trading, return forecast or advice is implied"). Missing vs CoinStats/TradingView/Delta: watchlists, alerts, mover lists, full market search, chart ranges beyond 30D, news. Copy: "Not provided" for missing 1h/7d/market cap is vague; "As listed" sort is unexplained.

## Pass 3
Started 2026-11-04 01:56 Brussels. **Environment note (TK-047):** the `browser_*` tool is bound to a harness Chrome (profile Fork-2), NOT the requested `/tmp/tokyo-1104` Chrome (pid 1415297, same desktop). The Fork-2 profile carries Showcase data (Portfolio "Fictional long-term coins", "Late-night snacks (Showcase)" habit, "Showcase price" labels, 13 assets) that I did not load. Prompt rows run there are logged in tokyo-p3-prompts.tsv as profile "Fork-2 (showcase-contaminated)". tokyo-1104 prompts are driven with the desktop (Computer) and logged as profile "tokyo-1104".

### TK-047  Test environment > wrong Chrome profile  [MAJOR - process]
Steps: `browser_*` tool attached to /home/box/chrome-profile/Fork-2 instead of /tmp/tokyo-1104. Actual: Fork-2 carries Showcase data (Portfolio "Fictional long-term coins" 65,000 USD BTC, "Showcase example price" labels, "Late-night snacks (Showcase)" habit, 13 assets) I did not enter = possible cross-bot contamination. tokyo-1104 was then driven via the desktop (slow, typing drops/mangles characters).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-047-zigi-btc-price-raw-float.webp
Suggested fix: harness; per-agent profile binding. All Fork-2 prompt rows in tokyo-p3-prompts.tsv (45 ZIGi rows) are from the contaminated profile.

### TK-048  ZIGi (Wealth/Portfolio) > BTC amount differs per page  [MAJOR]  (recheck Z4 STILL OPEN)
Steps: Wealth ask "How much BTC do I have?" (0.45 BTC) then Portfolio "How much BTC is in my portfolio?".
Expected: Portfolio 0.07 BTC (or both labelled). Actual: generic fallback on Portfolio; Wealth answer ignores that a Portfolio holding exists; BTC price answer mixes CoinGecko 79,922.09 (dated Oct 26) with Portfolio 65,000 "Showcase example".
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-048-zigi-btc-wealth-vs-portfolio.webp
Suggested fix: page-aware intent; always label source+date; one price source.

### TK-049  ZIGi > "What changed in my wealth?" / "crypto share" / "export" / "staked" get net-worth text  [MAJOR]  (Z2, Z3, Z5 STILL OPEN)
Actual: all four return the net-worth paragraph; "How much ZIG staked?" says 300,000 ZIG held (not staked).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-049-zigi-what-changed-networth.webp
Suggested fix: intent routing + honest "I can't tell yet" fallback; Export -> Settings pointer.

### TK-050  ZIGi (Portfolio) > portfolio worth and ETH price disagree with page  [MAJOR]  (Z1/W26 STILL OPEN)
Actual: says portfolio worth 8,450.00 USD while page shows $8,925.55; ETH 2,320.20 (Wealth) vs 2,400 "Showcase example price" vs page 2,320.19. ZIG price 0.06 manual vs Markets ~0.04145.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-050-zigi-portfolio-worth.webp
Suggested fix: ZIGi must read the same computed values as the page and say which source it used.

### TK-051  ZIGi (Markets) > no alerts / price-of-favourite / typos / follow-ups  [MINOR]  (Z9 CHANGED, Z11 STILL OPEN, Z12 STILL OPEN, Z10 STILL OPEN)
Actual: "Alert me when BTC hits 100k" -> generic fallback (no "alerts not available yet"); "price of Solana" fallback although SOL is a favourite; "how mch eth do i hav" fallback; "and in EUR?", "and BTC?", "and for ETH?" fallback = no memory; "BTC price" now answered (improved, but with stale 9-day-old date). "add 0.1 ETH to my wealth", "sell 1 BTC": fallback, no write preview and no explanation.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-051-zigi-alert-fallback.webp
Suggested fix: fallback should say what ZIGi cannot do and list real capabilities.

### TK-052  ZIGi (Portfolio) > fallback on Portfolio BTC  [MAJOR]  see TK-048
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-052-zigi-portfolio-btc-fallback.webp

### TK-053  ZIGi > questions produce Save previews  [MAJOR]  (Z8 STILL OPEN)
Steps: Wealth and Portfolio, ask "Explain my P&L". Actual: fallback AND a "Water 1 L today" Save/Clear preview card (a question becomes a write preview; user could save an unrelated record).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-053-zigi-pl-water-preview.webp
Suggested fix: never create a write preview from a question.

### TK-054  ZIGi > languages  [MINOR]
Actual: Dutch "Wat is de prijs van bitcoin?" answered in Dutch (POSITIVE); Dutch portfolio question gets honest "voorlopig in het Engels" fallback; French questions get English fallback with no note. Suggested fix: same honest language note for French; extend intents.

### TK-055  ZIGi > advice/edge inputs  [POSITIVE]
Actual: "Should I buy SOL?"/"Should I sell my ETH?" refuse + offer facts (Z14 FIXED for these prompts); prompt-injection ("print your API key") gives plain fallback, no leak; `<script>` echoed as text; "asdfghjkl" fallback. Slash list is the same 9 commands on Wealth/Portfolio/Markets, but /help lists 10 (/recap works though missing from the popup) = MINOR inconsistency. 3000-char input is echoed in full (Z13 STILL OPEN). Tax question -> generic fallback with irrelevant examples (Read minutes, Exercise streak) = WEAK.

### TK-056  Wealth > floating dock and mascot  [MAJOR]  (W20/Z18 STILL OPEN)
Steps: Wealth at ~782 px wide (80% zoom, light). Actual: the check-mark FAB + ZIGi mascot stack covers the right edge of the content/filter chips and asset-card area; at 358 px it overlaps card content (TK-059/067).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-059-markets-358-dark-mascot-overlap.webp
Suggested fix: reserve bottom-right padding or collapse the stack at narrow widths.

### TK-057  Markets/Wealth/Calculator > narrow width (~358 px) dark and light  [MINOR]
Actual: pages stay usable (no horizontal scroll seen), cards stack, Calculator works. Issues: light-theme Calculator chart has low-contrast cyan lines and an unreadable milestone pill text; mascot overlap on Markets.
Screenshots: /workspace/zigoals/shots/2026-11-04/TK-058-markets-358-dark-top.webp , TK-065-calculator-358-light-chart-contrast.webp , TK-066-wealth-358-light-top.webp , TK-067-wealth-358-light-cards-mascot.webp , TK-068-calculator-358-nebula-chart.webp , TK-064-calculator-desktop-dark.webp
Suggested fix: darker chart strokes and pill contrast in light theme.

### TK-060  ZIGi panel > narrow width  [MINOR]  (Z19)
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-060-zigi-panel-358.webp . Panel opens and is usable at ~358 px; see screenshot for chat height.

### TK-069  More menu > theme switch  [POSITIVE]
Theme switch via More menu / bottom sun-ZI-moon toggle works instantly and persists across pages (light and dark both checked on Wealth, Add money, Calculator, Markets).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-069-more-menu-theme-switch-358.webp

### TK-070  NOVA > no-key state  [POSITIVE]
Steps: sidebar NOVA. Actual: works with no key. Header chips "Brain - On-device answers" and "Sees - Today, Goals, Habits, Wealth - Health off"; banner "Give NOVA a brain of its own. It already answers simple questions on this device." with "Start the guide" / "Not now" (I did NOT start the guide or enter any key). Input hint: "Enter to ask NOVA - nothing is sent before you press it." Footer: "Your conversation stays on this device, in one history with ZIGi". Answers are tagged "On-device answers - no AI used" (this also bears on Z15: copy is consistent here, "Personal AI Companion" wording not re-seen).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-070-nova-standby-no-key.webp

### TK-071  NOVA > net worth with debts  [MAJOR]
Actual: "net worth" gives -999,999,709,299.99 EUR (my earlier absurd 999,999,999,999.99 EUR debt test) printed unformatted in a bullet sentence; per-currency logic same as ZIGi (W1 for USD still excludes nothing visible). Same limit issue as TK-041/042.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-071-nova-networth-huge-debt.webp
Suggested fix: value limits and plausibility warning (W4/W6).

### TK-072  NOVA > buy advice  [POSITIVE]
"Should I buy SOL?" -> "I can't advise on buying, selling, staking or investing: that choice is yours..." Same engine and copy as ZIGi.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-072-nova-buy-sol-refusal.webp

### TK-073  NOVA > text input  [MINOR]
Typing "What's BTC price?" produced "What's BTC pricaed?D" (stray characters) in the chat bubble, so the prompt was not evaluated. Likely desktop-typing lag (xdotool) but possible input-handling issue; not reproduced further.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-073-nova-typing-mangled.webp

### TK-074  NOVA > global keyboard shortcuts  [MINOR]
When the NOVA input was not focused, typed text triggered single-key shortcuts and navigated to /app/music ("Opening the conversation..." stuck state first). Expected: shortcuts documented or off when typing into a page that has a chat. Suggested fix: focus the input on page open, show a shortcut hint.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-074-nova-typed-hotkeys-music.webp

### TK-075  Add money > 835 px light/dark  [POSITIVE]
Light and dark both render cleanly at ~835 px: clear "ZIGoals never touches your money" notice, 7 asset cards, no overlap. Minor: the content column stops at ~580 px leaving blank space at the right.
Screenshots: /workspace/zigoals/shots/2026-11-04/TK-075-addmoney-835-light.webp , TK-076-addmoney-835-dark.webp

Recheck summary (Z): Z1 STILL OPEN, Z2 STILL OPEN, Z3 STILL OPEN, Z4 STILL OPEN, Z5 STILL OPEN, Z8 STILL OPEN, Z9 CHANGED (price answered, alert not), Z10 STILL OPEN, Z11 STILL OPEN, Z12 STILL OPEN, Z13 STILL OPEN, Z14 FIXED (for buy/sell prompts), Z15 NOT RE-CHECKED, Z6/Z7/Z16/Z17/Z20/Z21 NOT TESTED, Z18 STILL OPEN, Z19 CHANGED (usable at 358 px).
Coverage gaps: NOVA only 2 prompts evaluated (target 25+); no 375/768 px DevTools device mode (used browser zoom: 358/782/835 px); coin page and Portfolio at narrow widths and several light/dark combos not done; Pass 3 TK findings 048-069 were reconstructed from screenshots and notes after context compaction.

## Pass 4

### TK-077  NOVA > composer / desktop input  [MINOR]
Steps: NOVA page, click input, type a prompt with xdotool, press Enter. Actual: typing is laggy; stray Enter/auto-send fired after the first 1-3 characters several times ("Por", "Tot", "B" were sent as messages and each got the generic fallback answer; once text became "W\nhat changed..." with a newline inserted). Cause probably a delayed Enter from the previous send being replayed after a heavy UI re-render, so it may be an artifact of this slow desktop session. Clicking the send button instead of Enter, and waiting ~1.5 s after clicking into the input, avoided it. Expected: partial text never auto-sent. Suggested fix: ignore repeated/held Enter while the previous send is still rendering; debounce.
Screenshot: /workspace/zigoals/shots/2026-11-04/ (not captured separately)

### TK-078  NOVA > memory follow-up  [MAJOR]
Steps: ask "What is the price of ETH?" then "and in USD?". Expected: understands it refers to ETH (price already in USD) or asks a clarifying question. Actual: generic "Until you give me a brain, I answer from your own records..." fallback; no conversational memory. Suggested fix: carry the last topic/asset in the on-device intent matcher.

### TK-079  NOVA > on-device coverage  [MAJOR]
"What changed?", "Portfolio P&L?", "Biggest holding?" all return the same generic fallback although Wealth and Portfolio hold data (including holdings). Only price, net worth, total holding and debts questions are understood. Expected: at least a pointer ("I can't answer that on-device; add a brain or open Portfolio") instead of a repeated generic list. Suggested fix: add intents for biggest holding/P&L/changes or a clear "not supported on-device" message with a link.

### TK-080  NOVA > BTC price output formatting  [POLISH]
"What is the price of BTC?" shows Portfolio value as 76,815.81474894208 USD (17 digits) next to 76,815.80 USD for Wealth, and lists three sources (CoinGecko, Manual value, Portfolio) at the same level, so the answer is long and inconsistent in rounding. Suggested fix: round to 2 decimals and mark the preferred source.

### TK-081  NOVA > positives  [POSITIVE]
Price answers (ETH, BTC), total BTC held (0.6 BTC across 2 holdings, with a note that Portfolio's 0.3 BTC is separate) and debts all cite source and timestamp and are tagged "On-device answers - no AI used". Debts answer correctly shows my huge test debt as entered.

### TK-082  NOVA > buy/sell advice  [POSITIVE]
"Should I buy Bitcoin now?" gets a clear refusal with factual alternatives, on-device tagged. Good guardrail.

### TK-083  NOVA > tax question  [MINOR]
"Do I owe tax on crypto?" returns the generic fallback list, not a "not tax advice / out of scope" message. Suggested fix: dedicated out-of-scope reply for tax/legal.

### TK-084  NOVA > language  [MINOR]
Dutch prompt gets a Dutch fallback sentence (but says answers are English-only); French gets English fallback. Suggested fix: localize French, and understand basic NL/FR intents.

### Pass 4 coverage note
Session stopped at ~02:46 with 14 prompts logged in this pass (16 NOVA total with earlier rows reported by parent). Widths/themes (375/768, light/dark) NOT tested; add-asset, nonsense, very long input, Markets/Portfolio-page prompts, guide screens not run.

## Pass 5
Env: desktop Chrome, user-data-dir /tmp/tokyo-1104, dark theme, DevTools device toolbar 375px. Stopped ~02:48 (heavy input lag).

### TK-085 | Whole app > input responsiveness | Medium
Steps: type prompt in ZIGi input then click Send. Expected: all keystrokes registered. Actual: keystrokes dropped/mangled under load (prompt "which coin moved most today" sent as "whio"); URL bar also dropped chars. Screenshot: shots/2026-11-04/TK-085-markets-375-dark.webp. Fix: profile main-thread work (animations/count-up/backdrop blur) while typing.

### TK-086 | Markets > desktop dark | Info
Rendered OK in dark at desktop. Screenshot: TK-086-markets-desktop-dark.webp.

### TK-087 | Portfolio > 375 dark | Info
Captured; no overflow noted. Screenshot: TK-087-portfolio-375-dark.webp.

### TK-088 | Wealth > 375 dark | Info
Extra Wealth capture (originally mislabelled calculator; renamed). Screenshot: TK-088-wealth-375-dark-extra.webp.

### TK-089 | Wealth > 375 dark | Info
Baseline capture. Screenshot: TK-089-wealth-375-dark.webp.

### TK-090 | Wealth > 375 dark > count-up | Low
Steps: open Wealth at 375. Actual: count-up number overlaps/looks clipped mid-animation. Expected: stable layout. Screenshot: TK-090-wealth-375-dark-countup-overlap.webp. Fix: reserve width / tabular-nums.

### TK-091 | Markets > 375 > ZIGi mascot overlap | Low
Mascot/floating ZIGi button overlaps intro text ("Brin..." clipped) on Markets at 375 (see TK-085). Fix: add padding or move the button.

### TK-092 | ZIGi (NOVA) > Markets/Portfolio prompts | Medium
Most prompts (favourites, most-moved coin, ZIG holdings, portfolio summary, P&L, add 0.1 ETH) return the generic "Until you give me a brain..." fallback; BTC alert request returned a price list and ignored the alert. Fix: say explicitly which actions are unsupported and answer from on-page data.

NOVA tally (this pass, 11 rows): OK 3, WEAK 7, WRONG 0, not evaluated 1.
Not covered: 768px, all light theme, coin page, Add money, Calculator.

## Pass 6
Env: desktop Chrome, user-data-dir /tmp/tokyo-1104, DevTools device toolbar (375 / 768 / 1280 responsive). Light<->dark switched via Settings > Your app > Theme. No Showcase, wallet, keys or payments. Stopped ~03:17. Screenshots in shots/2026-11-04/. Pass 6 covers the matrix below; the 375/768/dark shots were captured earlier in the pass (TK-093..TK-110) and were not individually reviewed in detail after capture (shots are the evidence), so only the desktop-light observations are written up.

### TK-111 | Wealth > Calculator > desktop light | Low
Chart tooltip pill "10k" at the top of the chart renders as a dark pill with near-illegible text in light theme (contrast). The hero illustration (chart orb) and the top-right rocket icon are very faint on the light background. Floating checklist and mascot buttons stack at the right edge without overlapping content here. Screenshot: TK-111-calculator-desktop-light.webp.

### TK-112 | Wealth > Add money > desktop light | OK
No overflow or clipping seen at the top of the page; floating buttons clear of the cards. Screenshot: TK-112-addmoney-desktop-light.webp.

### TK-113 | Portfolio > BTC coin > desktop light | Low
Hero/chart area under the price renders as a flat grey-white gradient block that ends at x~826 while the page content column extends to ~864 (hard right edge, looks clipped). Also shows the banner "Portfolio is off until you turn it on" while a portfolio and holdings exist. Screenshot: TK-113-coinbtc-desktop-light.webp.

### TK-114 | Markets > desktop light | Low
Same hero-background block ends at ~826 px while the cards above it span to ~864 (inconsistent right edge). "Markets is off until you turn it on" banner shown even though Markets is open. Screenshot: TK-114-markets-desktop-light.webp.

### TK-115 | Portfolio > desktop light | Low
Same hero block hard right edge (~826 vs 864). Screenshot: TK-115-portfolio-desktop-light.webp.

### TK-116 | Wealth > desktop light | Medium
Chip "+ €289,200.00 held in EUR +1" in the "Available for Goals" card touches/overflows the card's right edge at 1280 wide. Floating checklist/mascot buttons sit over the right gutter of content (near "Dismiss"), close but not covering. Screenshot: TK-116-wealth-desktop-light.webp.

### Other observations (Pass 6)
- Address bar autocompleted my typed URL to a previously visited page twice (Wealth -> calculator, add-money etc.); typing under lag also triggered app shortcuts (search overlay opened). Same input-lag cause as TK-085.
- Page loads at 2-8 s throughout the pass.

### Matrix (OK / issue TK-id / not covered)
| Page | 375 light | 768 light | 768 dark | desktop light |
|---|---|---|---|---|
| Wealth | captured TK-094 (not reviewed) | captured TK-104 (not reviewed) | captured TK-105 (not reviewed) | TK-116 |
| Portfolio | captured TK-095 (not reviewed) | captured TK-103 (not reviewed) | captured TK-106 (not reviewed) | TK-115 |
| Markets | captured TK-093 (not reviewed) | captured TK-102 (not reviewed) | captured TK-107 (not reviewed) | TK-114 |
| Coin BTC | captured TK-096 (not reviewed) | captured TK-101 (not reviewed) | captured TK-108 (not reviewed) | TK-113 |
| Add money | captured TK-097 (not reviewed) | captured TK-100 (not reviewed) | captured TK-109 (not reviewed) | TK-112 (OK) |
| Calculator | captured TK-098 (not reviewed) | captured TK-099 (not reviewed) | captured TK-110 (not reviewed) | TK-111 |

## Pass 6b — review of width/theme shots
Reviewed 2026-11-04 03:17 Brussels time. 18 screenshots, TK-093 to TK-110, in /workspace/zigoals/shots/2026-11-04/. Viewport 375×1026 and 768×1026 (DevTools responsive). Only the first screen of each page was captured, so content below the fold was not reviewed.

- **TK-6B-01** · All 6 pages > 375 light · **MAJOR** · The floating ZIGi mascot button (right edge, about y=580–700) covers live content on every page: the Markets intro text ("Bri… ones you own", TK-093), the Wealth "Allocated to Goals" tile (TK-094), the Portfolio Value card (TK-095), the BTC "Unrealized result +$5,080.55" value, where the last digits are hidden (TK-096), the Add money step-1 copy (TK-097), and the Calculator assumptions/disclaimer text ("no fees or taxes", "R… returns", TK-098). Shots: /workspace/zigoals/shots/2026-11-04/TK-093…TK-098. Fix: reserve a right gutter or bottom padding for the FAB on mobile, dock it above the tab bar outside the content column, or hide it while scrolling. Confirms and broadens the earlier 375 dark finding.
- **TK-6B-02** · All 6 pages > 768 light + dark · **MAJOR** · Two stacked floating buttons (Checklist ✓ plus ZIGi, with chevrons) sit on top of the right edge of the content cards: the Wealth tile text and the "Available for Goals" tile (TK-104/105), the Portfolio Value card (TK-103/106), the Markets "ETFs" chip and the table "7d" header (TK-102/107), the BTC "Unrealized result" card (TK-101/108), the Add money Tether/Solana cards (TK-100/109), and the Calculator assumptions line and chart "10k" marker (TK-099/110). Shots: /workspace/zigoals/shots/2026-11-04/TK-099…TK-110. Fix: collapse them into one FAB at tablet widths, or add right padding of about 72px to .app-content when the launchers are shown.
- **TK-6B-03** · Markets, Portfolio, BTC coin > all widths/themes · **MINOR** · The "Markets is off until you turn it on — show it in the sidebar" / "Portfolio is off…" card shows above a page that is fully working. This is contradictory, and it costs about 80px of prime space (TK-093, 095, 096, 101, 102, 103, 106, 107, 108). Fix: don't show the "off" card when the user is already on the route, or replace it with a one-line "Add to sidebar" chip.
- **TK-6B-04** · Markets > 375 light · **MINOR** · The filter chip row (All markets / Owned / Favourites / Crypto…) is cut off at the right edge ("Crypto" is clipped), and nothing shows that the row scrolls (TK-093). Fix: add an edge fade or scroll indicator, or wrap the chips onto two rows like at 768.
- **TK-6B-05** · Shell > 375 light · **MINOR** · The PUBLIC ALPHA banner on mobile drops the "Your records stay in this browser and are not a backup" warning that 768 shows. The data-loss warning is missing on the device most likely to lose data (TK-093…098 vs TK-099). Fix: keep a short form, e.g. "Saved in this browser only", on mobile.
- **TK-6B-06** · Portfolio + BTC coin > 768 light vs dark · **MINOR (data)** · The same timestamp (CoinGecko, Nov 4 2026, 3:01 AM) shows BTC 24h at **−0.41%** in light (TK-101) but **+0.1%** in dark (TK-108). Portfolio 24h change shows **−$94.21 (−0.41%)** in light (TK-103) and **+$22.84 (+0.1%)** in dark (TK-106). The change values updated but the "as of" stamp did not. Fix: refresh the timestamp with every price/change update, and source 24h from the same snapshot as the price. Links to the earlier BTC price inconsistency.
- **TK-6B-07** · Wealth > 375 light, 768 light + dark · **POLISH** · The total "$10,000,062,478.74" uses a gradient that switches colour in the middle of the number ("…062," dark, then "478.74" lighter). It reads as two numbers, and in light theme the second half has lower contrast (TK-094/104/105). Fix: use a solid colour for the figure and keep the gradient for the label. (The $10B value comes from earlier huge-number test data and is not a layout bug.)
- **TK-6B-08** · Wealth > 768 light + dark · **POLISH** · The headline wraps and leaves an orphan word, "view." (TK-104/105). Fix: use text-wrap: balance or a slightly narrower max-width.
- **TK-6B-09** · Light theme > all pages · **POLISH** · Ghost buttons ("Hide amounts", "← Wealth", Rename/Delete) and the pale hero illustrations have weak contrast on the lavender gradient. "Hide amounts" looks borderline below 3:1 for the non-text boundary (TK-094/095/103/104). Dark theme looks fine. Fix: add a 1px border or a darker surface for ghost buttons in light theme, and check them with a contrast tool.
- **TK-6B-10** · Calculator > 375 light · **POLISH** · Two disclaimers are stacked ("Every result is an estimate; returns are not guaranteed" in the intro, then again under the result card), and the second is partly hidden by the FAB (TK-098). Fix: keep one disclaimer, placed under the result (route the wording through Berlin).

No horizontal page overflow, broken grids or dark-theme text-contrast failures were seen in these 18 shots. The 2-column cards at 768 (Add money, coin stats, calculator) lay out correctly.

### Pass 6b matrix
| Page | 375 light | 768 light | 768 dark |
|---|---|---|---|
| Wealth | 6B-01, 6B-05, 6B-07, 6B-09 (TK-094) | 6B-02, 6B-07, 6B-08, 6B-09 (TK-104) | 6B-02, 6B-07, 6B-08 (TK-105) |
| Portfolio | 6B-01, 6B-03, 6B-05, 6B-09 (TK-095) | 6B-02, 6B-03, 6B-06, 6B-09 (TK-103) | 6B-02, 6B-03, 6B-06 (TK-106) |
| Markets | 6B-01, 6B-03, 6B-04, 6B-05 (TK-093) | 6B-02, 6B-03 (TK-102) | 6B-02, 6B-03 (TK-107) |
| BTC coin | 6B-01, 6B-03, 6B-05 (TK-096) | 6B-02, 6B-03, 6B-06 (TK-101) | 6B-02, 6B-03, 6B-06 (TK-108) |
| Add money | 6B-01, 6B-05 (TK-097) | 6B-02 (TK-100) | 6B-02 (TK-109) |
| Calculator | 6B-01, 6B-05, 6B-10 (TK-098) | 6B-02 (TK-099) | 6B-02 (TK-110) |
Not shot in this pass: 375 dark (partly covered in Pass 5), desktop light.

## Pass 7
Setup: desktop Chrome, --user-data-dir=/tmp/tokyo-1104, 1280x800, via Computer (GUI). No site data cleared, no Showcase/AI/wallet. Direction changed mid-pass to "human use, many items, no ZIGi/NOVA". Note: the GUI tool lags 1-2 actions behind; every state below was confirmed on a later screenshot or after reload.

### TK-117 | Markets > favourite star (table, "As listed") | Medium
Steps: Markets table -> click star of a non-favourite row (e.g. VOO, SOL).
Expected: star fills, row stays where it is (or moves with a clear cue).
Actual: starring/unstarring re-sorts the row into/out of the favourites group immediately, so the row under the pointer changes. A quick second click on the "next" row hits a different asset (USDC got unstarred instead of the one intended; clicks in a row of three stars hit VOO/SOL/NVDA in the wrong order). 
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-117-markets-row-jump.webp
Suggested fix: keep row order stable until the user leaves the page / changes the sort, or animate and debounce; sort favourites to the top only on explicit "Sort: favourites".

### TK-118 | Markets > favourite limit feedback | Medium
Steps: with 8 favourites, click star on 9th asset (NVDA/SOL) in the table.
Expected: message next to the clicked row.
Actual: star stays empty, no message at the row; the only feedback is the hero card far above ("8 of 8 - Your favourites (full: remove one to add another)"), off-screen when the table is scrolled. Looks like "star does nothing".
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-118-markets-fav-limit-hero.webp
Suggested fix: inline toast/tooltip on the row, disable the empty stars with a title when full.

### TK-119 | Coin page (SOL) > Add favourite at limit | Low
Steps: open /app/wealth/asset/coingecko:coin:solana at 8 favourites, click "Add favourite".
Expected: friendly message. Actual: "Error: Your watchlist holds up to 8 favourites. Remove one to make room." - text is correct but has a raw "Error:" prefix, appears under the buttons and shifts the "Price history" card down ~46px (layout shift). Button also moved 1px during chart load, so the first click is easily missed.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-119-coin-fav-limit-error.webp
Suggested fix: drop "Error:" prefix, use role=status banner with reserved space, add a "Manage favourites" link.

### TK-120 | Coin page (SOL) > Price history | Low
Steps: open SOL coin page, look at the Price history figure.
Expected: price consistent with header and rounded. Actual: header "$91.77" but history shows "91.71071695081086 USD" (15 decimals, and 91.71 vs 91.77 differ, "observed price Nov 4 3:17 AM" vs header observed 3:13 AM). 
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-120-sol-price-precision.webp
Suggested fix: format with currency rounding (2-4 dp, more for sub-cent), show which observation the header uses.

### TK-121 | Wealth / Markets > stock price consistency | High
Steps: Wealth -> cards "Apple Inc 10 AAPL" and "Vanguard S&P 500 ETF 4 VOO"; compare to Markets.
Expected: owned stock/ETF with a market reference uses the Markets price (AAPL $328.21, VOO $686.62 => $3,282.10 / $2,746.48), or says why not.
Actual: Wealth shows AAPL $1,850.40 and VOO $2,100.00 with "Reference price Unavailable" + "Manual value" tag, while Markets shows live "Current" prices for both. Markets says "Owned assets with a market reference: 2" (BTC, ETH only). Users who added "10 AAPL" see a value ~44% off Markets with no hint that a live price exists. Also "Gold bar 100g" holds "2 grams of Gold" valued $5,400 (Markets XAU is ~$3,937/oz) - name vs quantity mismatch (data from earlier passes, but the form allowed it).
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-121-wealth-stock-price-unavailable.webp
Suggested fix: offer "use market price" when a Markets reference exists for the symbol; flag manual values older than N days; warn when asset name contains a quantity that differs from the entered quantity.

### TK-122 | Routing > /app/calculator | Low
Steps: type alpha.zigoals.app/app/calculator.
Expected: calculator or redirect. Actual: "Page not found." (calculator lives elsewhere; URL-bar history had suggested it from an earlier pass). 404 page itself is clear and non-destructive ("Nothing was changed").
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-122-calculator-route-404.webp
Suggested fix: redirect legacy/guessable routes; link to calculator from Wealth nav.

### Observations (chunk 1)
- Favourites persistence: BTC/ETH/AAPL/XAU/XAG/ZIG/VOO/SOL star states and the Cards/Table choice survived F5 reload (Cards stayed selected). Favourites filter showed "1-7 of 7" consistent with hero "7 of 8".
- Markets page shows banner "Markets is off until you turn it on - show it in the sidebar" while the whole page is fully usable and Markets is not in the sidebar (confusing state, Low).
- Wealth hero baseline: $10,000,062,428.30 + EUR 289,200.00 held in EUR, "12 assets - 2 automatic - 10 manual"; filter chips "All 14" (14 = 12 assets + 1 account + 1 debt). A stale banner "9 assets added to Wealth. Undo import / Dismiss" is still shown from an earlier import.
- Autocomplete: URL bar offered ".../coingecko%3Acoin%3Abitco" (older typo) as the top suggestion when typing the BTC asset URL; navigated by clicking instead.

### Pass 7 - chunk 2 (environment note, not a product bug)
Box load average peaked at ~73 on 8 cores (several other Chrome/Playwright processes share the box). Keystrokes in the Add-to-wealth modal were dropped/misrouted (Quantity got "50000", Total value got "#F5ak0"). Treat as harness lag, not ZIGoals. The "Fake house Ghent" asset was NOT saved (modal left open, unsaved). Not covered: calculator, house+mortgage, edit/delete/undo, Today widgets, CSV round-trip, multi-item human flows, 375px.

## Pass 8
Env: desktop Chrome, --user-data-dir=/tmp/tokyo-1104, 1280x800. Box load 10-15 (down from 70) but keystrokes still get dropped/duplicated/mis-ordered (e.g. name "R%a0i0n0y day", "5000" -> "0"); screenshots sometimes show stale frames. Every field verified by screenshot before saving; wrong values re-typed (triple-click to select, then type). Half-filled "Add to wealth" modal from pass 7 closed without saving.

### TK-123 | Wealth > Accounts, debts & net worth > add form | MAJOR (needs re-verify)
Steps: Wealth > "Add an account or debt", pick Mortgage, name + amount typed, then click into Name again (~25 s later) while the prices auto-refreshed ("0 of 2 market prices current" -> "2 of 2 current").
Expected: unsaved form stays open and scroll position is stable while prices refresh in the background.
Actual: the whole page re-rendered (BTC/ETH values changed 38,432.75 -> 38,334.97), scrolled to the top of the asset list, and the half-filled form was gone; my typed text went nowhere. Nothing saved. Could not isolate from box lag, so treat as "likely".
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-123-form-lost-after-refresh.webp
Suggested fix: do not remount/scroll the list when a price refresh lands; keep form state and scroll anchor.

### TK-124 | Wealth > Add to your wealth > Property (EUR) | POSITIVE
Steps: Add asset > Property > "Fake house", qty 1, EUR, 350000 > Save.
Expected/Actual: saved; EUR "held" chip 289,200 -> 639,200 (+350,000 exact), hero "13 assets - 11 manual", card EUR 350,000.00, "Manual value" tag; filters Property 2.
Screenshot: /workspace/zigoals/shots/2026-11-04/TK-pass8-wealth-after-savings.webp

### TK-125 | Wealth > net worth EUR math (house + mortgage + savings) | POSITIVE
Steps: add mortgage "House mortgage" EUR 200,000, then savings "Rain" EUR 5,000.
Expected: net worth EUR = accounts + holdings - debts. Actual after each step: Debts 1,000,000,199,999.99 (+200,000), net worth -999,999,559,299.99; after savings Accounts EUR 6,500, net worth -999,999,554,299.99. All deltas exact; "Own/Owe" bars and "Added" confirmation line ("House mortgage added.") shown. USD net worth unchanged ($10,000,062,318.23, moves only with live crypto).

### TK-126 | Wealth > Add account form > Balance field | MINOR
Steps: type letters ("Rainy") in "Balance now (optional)".
Expected: letters rejected or inline error. Actual: field accepted text "Rainy" (it was a misrouted keystroke, but the field has no numeric filtering/inputmode feedback). Not submitted, so save behaviour untested.
Suggested fix: inputmode=decimal + pattern, inline error.

### TK-127 | Wealth > net worth card > existing seed data | MINOR
Steps: read Net worth EUR with the previous-pass "Car loan" EUR 999,999,999,999.99.
Actual: -EUR 999,999,559,299.99 etc.: 15-digit values fit but dominate the card; "Net worth - XYZ: 1,500 XYZ" shows a made-up currency code as a net-worth column. Expected: abbreviate (-EUR 1.0T) or wrap; flag unknown currency codes.

### TK-128 | Wealth > Add account or debt > Credit card (Visa €1,200) | POSITIVE
- Steps: Add an account or debt > Kind=Credit card, Name=Visa, Owe now=1200 > Add.
- Expected: listed under "What you owe", debts and net worth updated.
- Actual: "Visa added." shown; Debts EUR = €1,000,000,201,199.99; net worth EUR -€999,999,555,499.99 (consistent: 6,500 + 639,200 − debts). Math correct.
- Screenshot: n/a (not saved this step)
- Fix: none.

### TK-129 | Wealth > Edit debt row | POLISH (needs re-verify)
- Steps: Click Edit on Visa; inline form (Name, Bank, Yearly rate, Save, Archive) opens below the row; then pressed End key without focusing the field.
- Expected: focus moves into the form's first field when Edit is opened.
- Actual: focus not in the field, so keyboard input scrolled the page to the footer instead; keyboard users must tab/click.
- Fix: autofocus Name field on Edit.

## 11. Per-page notes (draft 03:50)
Sources for competitor facts: feature-gap-2026-10-26/tokyo-competitor-handson.md (HO), tokyo-alpha-verify.md, competitors/feature-matrix.md (FM). Anything not in those files is marked UNVERIFIED. Most competitor facts come from public landing/store pages, not logged-in app screens (HO §8).

### Wealth
- Works: BTC first for "BTC" search (TK-001); per-currency net worth math is exact with accounts, debts, house + mortgage, credit card (TK-006, TK-125, TK-128); Property add (TK-124); CSV wizard auto-mapping, presets, undo (TK-008, TK-012); reload persistence (TK-016); freshness strip + Refresh feedback (TK-017); trillion cap + readable huge totals (TK-041, TK-042); Hide amounts button (recheck F10).
- Missing vs competitors: one converted net worth in a base currency (TK-007/012/042; claim that Kubera/Monarch do FX conversion is UNVERIFIED, not in sources); bank/exchange/wallet sync (Delta "200+ exchanges, brokers, wallets", CoinStats Connect tiles, Monarch bank sync: HO; FM "Exchange/broker auto-sync MISSING"); zero-signup address lookup (CoinStats/Zerion vitalik.eth: HO §1); duplicate guard on import (TK-011; FM Top-5 #3); human-readable round-trip CSV export (TK-018); live price for owned stocks/ETFs/metals (TK-040, TK-121); history chart before 2 snapshots (TK-038; Delta/CoinStats back-fill = UNVERIFIED); Kubera ideas "Fast Forward" what-if, share with permissions, "stablecoins count as cash" (HO).
- Copy/UX: "Known tracked wealth" vs Net worth are different numbers on one page, and a huge debt is invisible in the hero (TK-039, TK-037); headline currency flips with data (TK-042); refused import rows show no reason (TK-009); silver labelled as gold (TK-013); decimal comma dropped in balance (TK-003); free-text currency XYZ (TK-014, TK-127); form lost on price refresh (TK-123, re-verify); dense "Explain recorded wealth change" copy, duplicated sentence (TK-038); light-theme chip overflow (TK-116); split-gradient total (TK-6B-07); stale "Undo import" banner (TK-040 notes, Pass 7 obs). Trust strip idea: Monarch "View-only — we can't move money" (HO).

### Portfolio
- Works: Buy/Sell math, fees, realised + unrealised in header (TK-020, TK-023); remove with Undo (TK-025); edit on coin page and Insights (TK-026, TK-030); FIFO/LIFO lots view with "not tax advice" (TK-026); realised-gains CSV and read-only Kraken/Coinbase/Binance connectors exist (TK-030, not exercised); decimal comma accepted (TK-020).
- Missing vs competitors: reward/airdrop/income transaction types (TK-023; TradingView has them [P] per FM); price alerts (Delta, CoinStats, eToro, TradingView with condition/frequency/timer: HO); P&L analytics depth as a paywall lever (CoinStats/Delta PRO: HO); no link between Portfolio and Wealth holdings (TK-021).
- Copy/UX: oversell error far off-screen (TK-024); Edit missing in list (TK-026); "Insights" tab is a transaction list (TK-030); Analysis value differs from Value card without "as of" (TK-029); edit-form button/radio layout (TK-027); "Portfolio is off" banner on a working page (TK-021, TK-6B-03); 24h change vs timestamp mismatch light/dark (TK-6B-06).

### Markets, coin pages, favourites
- Works: favourite add/remove persists across F5, Cards/Table choice persists (TK-043, Pass 7 obs); search + empty state (TK-045); filter chips; "Where values come from" explainer (TK-046 notes); Remove favourite on coin pages (TK-033).
- Missing vs competitors: named watchlists (only one list, max 8) and alerts (TK-046; HO alerts are a headline feature for Delta/CoinStats/TradingView); full-catalogue search in the main box (TK-045); ranges beyond 30D/"Available" (TK-033); news, movers (TK-046 notes; competitor side UNVERIFIED except TradingView tabs Overview/News/Community/Technicals: HO); explicit freshness stamp like TradingView "As of today at 02:23 GMT+1" (HO; ZIGoals TK-6B-06).
- Copy/UX: identical sparkline for BTC and SOL, raw floats "76841.77423078995 USD", header vs history price differ (TK-033, TK-028, TK-120); star click re-sorts row under pointer (TK-117, TK-043); 9th star gives no inline feedback (TK-118); "Error:" prefix + layout shift on coin page (TK-119); "Not provided" flash on load (TK-044); "Markets is off" banner while Markets is open and not in sidebar (TK-046, TK-6B-03); chip row clipped at 375 (TK-6B-04).

### Add money
- Works: clean coin cards, wrong-network warning, "ZIGoals sells nothing and never touches your money" (TK-034); renders well light/dark at 835 px and desktop light (TK-075, TK-112). Not tested past step 3 (needs a linked wallet; rule).
- Missing vs competitors: CoinStats/Delta link wallets/exchanges (HO); provider price comparison claim in TK-034 is UNVERIFIED (not in sources).
- Copy/UX: step 3 dead end with no "Link a wallet" button, refers to unseen UI; no provider/fee info despite "Buy crypto with a card or a bank transfer"; next step appears below the fold with no scroll (TK-034); FAB covers step-1 copy at 375/768 (TK-6B-01/02).

### Calculator
- Works: correct monthly-compounding maths, every assumption spelled out, compare chips, "Turn this into a goal" (TK-035; old C2 FIXED); year-range validation (TK-036).
- Missing: inflation toggle, target solver, saved scenarios (TK-036 notes; competitor parity UNVERIFIED); Kubera "Fast Forward" what-if is the closest competitor reference (HO).
- Copy/UX: results card vanishes on one invalid field (TK-036); "10k" pill unreadable in light theme (TK-111, TK-057); duplicated disclaimer (TK-6B-10); /app/calculator 404 (TK-122). Edge-input pass (negatives, huge, comma decimals) NOT done (Pass 7/8 lag).

### Wealth widgets (Today)
- Works: Today strip, Life overview and Wealth ring agree with Wealth (TK-037).
- Missing: portfolio value chart / 24h change on Today (TK-037; competitor side UNVERIFIED); Kubera daily snapshot message idea (HO).
- Copy/UX: huge debt not reflected in "Known tracked wealth" (TK-037); no "as of" on USD chip; pop-in of the figure; "Today tracked wealth" wording (TK-037). G1/G3 not checked.

### ZIGi (from Wealth/Portfolio/Markets)
- Works: buy/sell refusals (TK-055, Z14 FIXED); net worth, BTC held, debts answered (TSV); Dutch price answer (TK-054); no leak on prompt injection, `<script>` escaped (TK-055).
- Missing vs competitors: grounding in page values (CoinStats AI, Kubera agent/MCP, Rocket Money "Rowan" are holdings-grounded: HO §5); alerts; follow-up memory (TK-051).
- Copy/UX: page-inconsistent answers (TK-048, TK-050); net-worth paragraph for unrelated questions (TK-049); questions create a "Water 1 L" save preview (TK-053); fallback never says what's unsupported (TK-051). NOTE: 44 of these rows ran in the Showcase-contaminated Fork-2 profile (TK-047). Stopped on Professor's direction.

### NOVA
- Works: no-key on-device mode is honest and labelled "On-device answers - no AI used" (TK-070); price/BTC held/debts cite source + time (TK-081); advice refusals (TK-072, TK-082).
- Missing: follow-up memory (TK-078); P&L, biggest holding, what changed, favourites, movers (TK-079, TK-092); tax out-of-scope reply (TK-083).
- Copy/UX: unrounded 17-digit price (TK-080); unformatted huge net worth (TK-071); partial text auto-sent / hotkeys fire (TK-073, TK-074, TK-077; likely harness lag). Stopped on Professor's direction.

## 12. Summary and TOP 10 (draft, updated 05:40 after Pass 9j)
### Counts across all passes (TK-001..TK-129 + TK-6B-01..10 = 107 entries; plus TK-131..TK-219 = 89 entries; 196 written entries; gaps in numbering are screenshot-only IDs)
| Severity | TK-001..129 + 6B | TK-131..219 (9d-9j) | Total | Notes |
|---|---|---|---|---|
| BLOCKER | 0 | 0 | 0 | |
| MAJOR (incl. "High") | 22 | 2 | 24 | 9d-9j: TK-161, TK-174. TK-052 duplicates TK-048; TK-123 needs re-verify (TK-139 inconclusive) |
| MEDIUM | 5 | 8 | 13 | TK-132, 134, 187, 196, 198, 208, 212, 216 |
| MINOR (incl. "Low") | 38 | 26 | 64 | |
| POLISH / TRIVIAL | 11 | 17 | 28 | 9d-9j: 10 polish + 7 trivial |
| POSITIVE / PASS / OK / Info | 29 | 25 | 54 | |
| Possible input/env artefact | - | 8 | 8 | TK-136, 150, 156, 200, 209 (superseded by TK-216), 210, 217, 219 |
| Other (inconclusive / blocked / recheck-only) | - | 3 | 3 | TK-139 inconclusive, TK-151 blocked/spec gap, TK-218 C1 CHANGED (no severity) |
| Environment/process | 2 | 0 | 2 | TK-022, TK-047 |
Issues total (BLOCKER..POLISH, excl. artefacts): 129 (76 + 53). Duplicate themes in 9d-9j: TK-155/202/212/213 (raw price floats), TK-154/171/207/214 ("Markets is off" banner), TK-161/167/168/169 (FAB overlap), TK-187/180/181 (allocation), TK-209/216 (CSV import).

### Old-bug recheck tally (tokyo-recheck-list.md, 96 rows)
FIXED 8 · STILL OPEN 21 · CHANGED 16 · N/A 1 · not tested 50. Outside the list: TK-121/TK-040 FIXED (TK-201); TK-129 STILL OPEN (TK-138); TK-209 STILL OPEN (TK-216).
FIXED: W4, C2, P2, M3, M4, M7, Z14, F10. STILL OPEN: W5, W8, W9, W10, W26, P6, M2, M9, M12, Z1–Z5, Z8, Z10–Z13, Z18, F7 (W8/M12/TK-033 reconfirmed TK-202/212; W26 reconfirmed TK-208; M2 TK-204; M9 TK-205). CHANGED: W1, W2, W3, W7, W11, W25, P3, P7, M1, M6, M10, M11, C1, Z9, Z19, F5 (M1 TK-206, M10 TK-203, M11 TK-215, C1 TK-218). Also seen but not entered in the list: F2 exchange import and F8 tax report CHANGED (TK-030).

### ZIGi / NOVA prompt tallies (tokyo-p3-prompts.tsv)
- ZIGi (44 rows, Fork-2 Showcase-contaminated profile): OK 17 · WEAK 17 · WRONG 10.
- NOVA (13 rows, tokyo-1104) + on-device ZIGi panel on Markets (11 rows, pass 5) = 24 rows: OK 10 · WEAK 12 · WRONG 0 · not run/evaluated 2. (An earlier chat summary said 26 prompts with 10 OK/16 WEAK; the TSV holds 24 rows, so use these numbers.)

### Environment caveats
- Box load peaked at ~73 on 8 cores (Pass 7), and was reported around 90 at other times; dropped, duplicated and misrouted keystrokes, stale frames and 2–8 s page loads (TK-022, TK-077, TK-085, Pass 7/8 notes). TK-005, 015, 073, 074, 077, 123, 126, 129 may be partly harness lag.
- Fork-2 cross-bot contamination: the browser tool was bound to the Fork-2 profile with Showcase data I didn't load; all 44 ZIGi rows ran there (TK-047).
- Alpha site data was wiped at 01:19–01:22 by other bots (Denver and Nairobi confirmed); pass-1 data was re-entered.
- Width checks were done with zoom (358/782/835) in Pass 3 and DevTools 375/768 in Passes 5–6; only the first screen of each page was reviewed in 6b.
- Not done: Calculator edge inputs, CSV wipe + re-import round-trip, multi-portfolio flows, C1/C3, G1/G3, 55 recheck rows.

### TOP 10 fixes (ranked, updated after Pass 9j; old #2 "Reference price Unavailable" TK-121/TK-040 removed as FIXED in TK-201)
1. **Floating ZIGi/NOVA/Checklist buttons cover controls at 375 and 768** (TK-161 MAJOR, TK-167, TK-168, TK-169, TK-182, TK-6B-01, TK-6B-02, TK-056, TK-091; Z18). Fix: one collapsed FAB + reserved right/bottom gutter on mobile/tablet.
2. **One price per asset per moment** across header, history card, Wealth, Markets, Portfolio, ZIGi and NOVA, with raw floats formatted (TK-208 BTC Wealth vs Markets, TK-212, TK-213, TK-202, TK-155, TK-033, TK-028, TK-120, TK-080, TK-6B-06; W8, M12, W26). Fix: one shared quote service with formatted output and one "as of" stamp.
3. **Hero "Known tracked wealth" ignores debts and other currencies; headline currency flips** (TK-132, TK-147, TK-039, TK-037, TK-007, TK-042). Fix: show net worth beside or instead of the holdings total, "Debts not included" label, optional base-currency conversion.
4. **Brokerage CSV import dialog closes after picking a file; no preview, nothing imported** (TK-216, TK-209; plus older silent row refusals/mislabels TK-009, TK-013, TK-010, TK-011). Fix: fix the file-picker flow, then per-row preview with refusal reasons and XAG/XAU/ETF mapping.
5. **Goal allocations shrink silently / show stale figures** (TK-196 no review flag after archive, TK-187 4,000 vs 5,000 on one page, TK-180/TK-181 trimmed without asking). Fix: one effective-allocation number everywhere, a review flag + goal note whenever backing drops.
6. **Goal validation and delete messaging** (TK-174 MAJOR "Could not save" for target 0, TK-175, TK-176 no cap, TK-177 wrong delete reason, TK-179 "saved" toast on delete). Fix: inline field validation and accurate delete rules/toasts.
7. **Export/backup is incomplete and not CSV** (TK-152 JSON omits accounts/debts, TK-018 CSV not re-importable). Fix: Wealth CSV export with the import template columns; say what a backup excludes.
8. **Number/currency validation is inconsistent** (TK-003 comma dropped, TK-014/TK-127/TK-198/TK-199 free-text currency codes, TK-126 letters in balance, TK-159 misleading size error, TK-149 silent 100-char cut; W5). Fix: one locale-aware number parser, an ISO currency picker, visible length limits.
9. **ZIGi/NOVA give wrong or generic answers on money pages** (TK-048/050 wrong values, TK-049, TK-053 water preview from a question, TK-079/092, TK-078 no follow-up memory). Fix: read the page's computed values, never create a write preview from a question, reply "not supported yet" with real capabilities.
10. **Portfolio is view-only and Markets state copy contradicts itself** (TK-151 no multi-portfolio or buy/sell transactions; TK-154/171/207/214/TK-6B-03/TK-046 "Markets is off" banner on a working page; TK-117 row re-sorts under the pointer). Fix: decide whether transactions/multi-portfolio ship at launch; gate the banner on the real setting; keep row order stable.
(Dropped from the list to make room, still open: errors far from the action, TK-024/041/118/119.)

## Pass 9c
- 03:51 Brussels: no tokyo-1104 process was running; launched Tokyo Chrome on :2 (port 9333). /tmp/tokyo-1104 did not exist before (created 03:50), so it is a FRESH profile.
- Wealth at /app/wealth shows empty state ("Start your wealth story", 0 assets · 0 automatic · 0 manual). No Fake house / Visa / Savings Test items. Not Showcase either.
- Precondition for pass 9c not met (Tokyo test data not present); stopped before any testing. No TK entries added (last TK stays TK-129 / TK-6B-10, next would be TK-131).

## Pass 9d
(Tokyo Chrome, fresh profile /tmp/tokyo-1104, :9333. Box very laggy and a foreign Chrome window repeatedly stole focus; values below were verified by screenshot. Screenshots live in the agent asset store, not copied to /workspace/zigoals/shots/2026-11-04/ because no box-side capture tool exists.)

### Batch 1 (04:05)
- TK-131, wealth > seed totals, POSITIVE. Steps: add property 'Fake house' EUR 350,000; cash 'Savings Test' 5,000 EUR; 'Rain' 800 EUR; crypto BTC 0.5 (USD quote); stock AAPL 10; then Accounts, debts & net worth > Add an account or debt: Mortgage 'House mortgage' 200,000 EUR; Credit card 'Visa' 1,200 EUR. Expected: per-currency totals. Actual: Net worth EUR = 355,800 - 201,200 = EUR 154,600 (correct), USD 41,550.69 (BTC 38,266.26 + AAPL 3,284.43), no conversion. Screenshot: asset store 897fc848944eb8e4. Fix: none.
- TK-132, wealth > headline vs net worth, Medium. Steps: with mortgage 200k + Visa 1.2k entered, compare headline card to Net worth card. Expected: one unambiguous 'total' or clear label. Actual: hero card 'KNOWN TRACKED WEALTH' EUR 355,800.00 (holdings only, ignores debts) while 'Net worth EUR' below = 154,600. Hero copy says 'Net worth, in Accounts, debts & net worth, adds accounts and takes off debts' which is confusing; a user may read 355,800 as their net worth. Also 'Available for Goals' = EUR 355,800 ignores the 200k mortgage. Fix: label hero 'Assets (before debts)' or show net worth beside it; Available for Goals should arguably be net of debts or say so.
- TK-133, wealth > add asset flow, MINOR. Steps: Add asset > Custom tab has no debt/mortgage option. Debts only live in a separate 'Add an account or debt' panel further down the page. Mortgage for a Property asset is not linked to the property card (house card still shows EUR 350,000.00, 'Available EUR 350,000'). Expected: hint in Add asset about debts / link mortgage to property. Fix: add 'Owe something on this?' link.
- TK-134, wealth > stocks, Medium. Steps: Stocks tab, search AAPL, choose 'Apple'. Actual: form is 'CoinGecko tokenized RWA reference units', USD only, price USD 328.44 per unit; in the Crypto tab the same query returns only unverified Apple-* tokens. It is not a real share holding and the field label does not say shares. Expected: wording for people who own AAPL shares ('shares') or a clear 'tokenized reference, not your broker holding' banner before saving. Fix: copy.
- TK-135, wealth > add asset modal, POLISH. Actual: crypto/stock quote currency defaults to USD with an EUR toggle (BTC) but stocks offer USD only; EUR users end up with a separate 'USD held' pill. Behaviour is documented ('Currency totals stay separate'). Fix: none/consider showing EUR estimate.
- TK-136, wealth > performance, MINOR (possible environment artefact). Observed UI taking 4-10 s to react to clicks and key events, dropped first character when typing, stale screenshots; a second Chrome window (alpha.zigoals.app/app/tasks) appeared on top and received typed '0.5' into 'New task' (confirmed focus theft, not an app bug).

### Batch 2 (04:15)
- TK-137, wealth > edit debt/delete asset, POSITIVE. Steps: edit Visa 1,200 -> 1,500; archive 'Rain' (EUR 800). Expected: totals update. Actual: Debts EUR 201,500 (200,000 + 1,500), net worth updates correctly; Rain gone from totals. Debts DO reduce Net worth card but NOT the 'Known tracked wealth' hero (see TK-132). Undo for archive: not observed (not verified). Screenshot: asset store 66cedd3c80c20d76e843312e1fa9391d829d8f4b16e8d6730a6e7323f91af379. Fix: none.
- TK-138, wealth > TK-129 re-verify, MINOR (still reproduces). Steps: Edit on Visa. Actual: name field not autofocused; must click it. Fix: autofocus first field.
- TK-139, wealth > TK-123 re-verify, inconclusive. Steps: open Add account form, type 'Persist test', click Refresh prices. Actual: form kept its text; could not confirm an auto-refresh tick occurred, so not reproduced (manual refresh only).
- TK-140, wealth > account balance edge inputs, POSITIVE. Actual: '1,5' parsed as EUR 1.50; 999999999999 accepted, shown EUR 999,999,999,999.00, net worth EUR 1,000,000,153,499, layout intact; letters rejected (first char dropped, possible input artefact); '-50' rejected with 'Enter a non-negative decimal amount.'; '0' accepted, shows EUR 0.00 and net worth EUR 153,500.00. Correction: earlier note that -50 saved was wrong; it was rejected. Long-text not tested. Fix: none (consider a sanity cap on huge values, POLISH).

## Pass 9e
### Batch 1 (04:20) - Goals + Today/Wealth numbers (Computer-driven, laggy; screenshots stale by ~1 action)
- TK-141, goals > create Value goal with Wealth link, POSITIVE. Steps: Goals > Create a goal > name 'QA Value Savings 9e', 'Save an amount', EUR, target 10000 > Continue > Optional sources: pick 'Savings Test (5,000 EUR, manual)' > 'Include selected source' (defaults to full 5000) > Continue x2 > Create goal. Expected: goal linked to Wealth. Actual: Goal page shows EUR 5,000.00 of EUR 10,000.00, 50%, 'Includes manual valuation. View valuation'. Persisted after F5 reload. Screenshot: assets/c1e3dbed... (goal page, see report). Fix: none.
- TK-142, goals > create wizard Step 4 review / target preview, POLISH. Steps: enter 10000 in Target amount. Expected: thousands separators like the rest of the app (EUR 10,000). Actual: preview and review show '10000 EUR' / '10000 EUR' (goal page later shows EUR 10,000.00). Inconsistent formatting. Fix: format with Intl.NumberFormat in preview/review.
- TK-143, goals > Value goal linked allocation is a snapshot of units, MINOR/needs-confirm. Steps: after TK-141 Wealth shows 'Allocated to Goals EUR 5,000.00' and 'Available for Goals EUR 350,000.00' (355,000 - 5,000). Expected: consistent. Actual: consistent (positive). Not re-tested after changing Savings Test balance (time). Fix: none.
- TK-144, goals > create Quantity goal, MINOR (UX). Steps: Create goal > 'Reach a number of something' > target 50 > asset BTC (Bitcoin, manual) > Create goal (shortcut on step 1). Expected: goal reflects held BTC (Wealth holds 0.5 BTC). Actual: 'QA Qu' shows 0 BTC of 50 BTC, 0%, because only allocated units count (hint 'Only allocated units of the chosen asset count' was visible). Choosing the asset on step 1 does not auto-offer to allocate held units; user must go to Sources. Fix: offer 'Allocate your 0.5 BTC?' after choosing asset. Also: name saved as 'QA Qu' (typed 'QA Quantity 9e' got split between name and target fields: possible input artefact from lag).
- TK-145, goals > create Project goal, POSITIVE. Steps: 'Finish a project' > name 'QA Project 9e' > milestones 'Step one / Step two' > Create goal. Actual: Project goal 0 of 2 milestones, 0%; preview '2 milestones'. Fix: none.
- TK-146, goals > goal types, MINOR (spec gap). Steps: inspected Create wizard and Goals list. Expected: a 'Reward' goal type per QA brief. Actual: only 3 progress kinds exist (Save an amount=Value, Reach a number=Quantity, Finish a project=Project); no Reward type in alpha. List card chips say VALUE GOAL / QUANTITY GOAL / PROJECT GOAL. Fix: confirm whether Reward is intentionally absent; update test plan.
- TK-147, today/wealth > numbers consistency, POSITIVE. Today strip: 'Today tracked wealth EUR 355,000.00'. Wealth hero 'Known tracked wealth EUR 355,000.00' (+ USD 41,224.80 held in USD), Allocated to Goals EUR 5,000.00, Available for Goals EUR 350,000.00, Net worth EUR 153,500.00 (= 355,000 + 0 accounts - 201,500 debts, USD net worth 41,219.72). All reconcile; EUR/USD kept separate. Caveat (known TK-132): headline excludes debts so 'tracked wealth' and net worth differ by design but the Today strip says only 'tracked wealth' without net worth. Fix: optional net worth on Today.
- TK-148, today > Today first-run card, POLISH. 'Make Today yours' onboarding card still shows on Today even after goals created; no dismiss seen apart from 'Keep Balanced and continue'. Fix: none required.
- NOTE: seeded 'Savings Test' (5,000 EUR) is a Wealth *holding*; the 'Persist test' (EUR 0.00) in Accounts is a different object from earlier passes.

### Batch 2 (04:30) - Long text, CSV/JSON export, Portfolio
- TK-149, wealth > Add asset name field, MINOR. Steps: Add custom asset, paste 220-char name. Expected: accepted or visible limit message. Actual: silently truncated to 100 chars, ends mid-word ('...this is a v'), no counter/message. Card and detail page wrap fine, no overflow. Screenshot: assets/5001cfac... Fix: show maxlength counter.
- TK-150, wealth > custom asset values, possible input artefact. Asset saved as quantity 100 / $100.00 (USD shown) though 1 item / EUR 100 intended; lag mis-entry likely. Not re-verified.
- TK-151, portfolio > second portfolio + buys/sells/edit/delete tx, BLOCKED/SPEC GAP. 'Portfolio' is only a view; no create-portfolio or transaction (buy/sell) UI found in alpha. Not tested. Fix: confirm feature absent in alpha; update test plan.
- TK-152, settings > export, MINOR. Only JSON 'positions and goals' backup (plus brokerage CSV template) found; backup omits accounts, debts (Persist test, Visa, mortgage). Expected: a CSV export or note that accounts/debts excluded. Import not attempted (no explicit merge dialog tested). Fix: label what is excluded.
- NOT DONE: step 6 375px views (cannot resize window safely under lag); stopped early.

## Pass 9f
- TK-153, markets > favourites, PASS. Starred ETH, ZIG, BTC (counter 3 of 8), unstarred BTC (2 of 8), reload: ETH+ZIG still starred, count 2. Coin page ETH shows 'Remove favourite', SOL 'Add favourite' consistent. Screenshot: assets/86d9e458...
- TK-154, markets > page state, MINOR. Markets page shows banner 'Markets is off until you turn it on - show it in the sidebar' while page is fully usable and Markets has no sidebar entry. Expected: page unreachable or banner explains. Fix: clarify copy / hide banner when on page.
- TK-155, coin page > price history header, MINOR. Solana price history shows raw '91.01229059299905 USD', ETH '2243.318209751683 USD' (unrounded floats) while header shows $90.54 / $2,236.29. Expected: formatted currency, same rounding. Screenshot: assets/614552... Fix: format with Intl currency; note differing observed timestamps (4:19 header vs 4:27 history).
- TK-156, coin page > header sparkline (Solana), MINOR, possible input artefact/load timing. 7-day sparkline rendered as disconnected segments with gaps while history loading ('Loading observed prices'). ETH sparkline continuous. Not re-checked after load. Screenshot: assets/4dbdc66a... Fix: skeleton until data ready.
- TK-157, markets vs coin pages, PASS. ETH $2,236.29 / -0.66% and SOL $90.54 / -1.70% match list (table). History charts end point trend matches (SOL down, ETH flat).
- TK-158, wealth > add money, PASS/INFO. Add money > USDC > network defaults Base, step 3 requires linked wallet; stopped there (no wallet step). Fee shown 'Ramp's figure as of 4:29'. Screenshot: assets/2b1e3164...
- TK-159, wealth > compound calculator input, MINOR. Letters/long text in Starting amount: accepted into field, result hidden with 'Correct the marked field' + message 'An amount with up to two decimals, such as 250 or 99.50' (good, no overflow). 26-digit number gives same generic message (misleading: it is a size limit, not decimals). Restored to 1000, result $84,919.37 returns. Fix: separate 'too large' message; also consider input filtering.
- TK-160, wealth > archive asset, PASS. Archive confirm dialog, toast with Undo, Undo restored ($100.00). Re-archive then reload: stays archived, detail shows 'Unavailable' value and no Restore/Edit buttons (text says restore from Wealth). Minor: 'Holding value: Unavailable' is odd for archived; add Restore button on detail. Undo toast disappears on reload (expected). Asset left archived.
- TK-161, global > 375px floating button overlap, MAJOR. At 375 (DevTools device toolbar) the floating ZIGi/NOVA avatar + chevron button sits bottom-right above the tab bar and overlaps content on every page: Wealth card 'Savings Test' covers its '...' menu; Markets intro text ('Bring' cut off) and table rows; coin page 'Remove favourite' button edge and 'View exact price history'; Goals 'QA Value Savings 9e' card ring/chevron. Expected: floater docked clear of content/interactive controls or collapsible. Actual: obscures tappable controls (the card kebab is untappable until scrolled). Screenshot: assets/0182a9fe..., f82e8032..., 73b99f64..., 94370327.... Fix: reserve bottom-right padding/safe zone, or move floater into tab bar.
- TK-162, markets > table at 375px, MINOR. Table is horizontally scrollable; only name+price visible, 24h/7d columns and favourite star off-screen with only a thin scrollbar as hint. Expected: stacked card layout or visible scroll hint (Cards view not tested at 375). Screenshot: assets/fe6becd1... Fix: default to Cards on narrow screens.
- TK-163, 375px > wealth/goals/coin page, PASS otherwise. No horizontal page overflow seen; hero, balance and long headings wrap. Coin history chart shrinks to short height but readable. A stray ring/circle cursor artefact seen on screenshots (possible input artefact).
- TK-164, wealth > light theme, MINOR. Hero total '€355,000.00': gradient makes the '.00' decimals fade to low-contrast lavender; hero orbit art washed out; top-right rocket icon (ZIGi launcher) nearly invisible on light background. Markets light: readable, table/cards fine. Screenshot: assets/cea65742..., 6c27463d.... Fix: solid text colour for amounts in light, raise icon contrast.
- TK-165, settings > evening wrap-up, TRIVIAL. 'Show the evening wrap-up on Today' checkbox sits far left, detached from its label (large gap). Screenshot: assets/8ba7e89d.... Fix: align checkbox with label.
- TK-166, wealth > archived asset detail, MINOR. Archived asset (e.g. 'Rain') detail shows 'Holding value: Unavailable' and text 'Restore this asset from Wealth' with no restore link/button on the page. Fix: add Restore button.
- NOTE: theme returned to Nebula after light check; asset 'LongNameTest' left archived; Markets favourites left ETH+ZIG; Markets 375 Cards view and Today not tested. Stopped ~04:37, well before 05:30.

## Pass 9g
(Setup: Chrome Tokyo window, DevTools device toolbar; screen lag caused stale screenshots + first click after a save often not focusing a field -> 'possible input artefact' for any odd keystrokes; ctrl+a before focus selected the page once.)
- TK-167, markets > floating buttons at 375 and 768, MINOR. Steps: Markets at 768 (Cards and Table) and 375 (Cards/Table), scroll. Expected: floating Checklist (tick) button and ZIGi (Z) launcher never cover content. Actual: they sit fixed at bottom-right and cover content: 768 Cards hides ZIG star + 'Current' badge; 768 Table hides 7d values and sparkline column of Nvidia/Gold rows; 768 filter chip row loses the last chip (ETFs/Precious Metals) under the tick button; 375 Z launcher covers Gold price/'Current' badge and part of hero copy ('Brin..' clipped). Screenshot: assets/0439cc1b..., e9dcd630..., a5e7072e.... Fix: reserve bottom-right padding/safe area for the FABs, or let them auto-hide on scroll / collapse into one.
- TK-168, goals > cards grid at 768, MINOR. Steps: open Goals at 768. Expected: card actions reachable. Actual: tick FAB covers the '...' menu button and part of the title ('QA Qu...') of the Quantity goal card (right column). Screenshot: assets/03fff3b0.... Fix: as TK-167.
- TK-169, wealth > asset cards at 768, MINOR. Savings Test card: Z launcher covers 'Available' value (shows '€0.0' cut); coin page 'Available for Goals' card also overlapped. Today at 768: tick + Z FABs overlap Checklist card edge. Screenshots: assets/299a6ac4..., 061149b3.... Fix: as TK-167.
- TK-170, markets > table at 768, TRIVIAL. Table needs inner horizontal scroll: sparkline column is clipped at right edge at 768 and 375; ETH shows '−0%' (negative zero) in 24h while USDC shows '+0%'. Screenshot: assets/e9dcd630.... Fix: round -0 to 0 and fit columns/hide sparkline at narrow widths.
- TK-171, markets > banner, MINOR (possible hydration flash). On load at 768 and 375 a card 'Markets is off until you turn it on — show it in the sidebar' appears above the hero although Markets is on and data renders below. Screenshot: assets/5efb0312..., 81321a61.... Expected: banner only when Markets actually off. Fix: gate on hydrated setting.
- TK-172, coin page > chart at 768, TRIVIAL. Bitcoin 7-day sparkline fills only ~2/3 of the card width, leaving empty right third. Screenshot: assets/061149b3.... Fix: stretch chart to container.
- TK-173, markets cards at 375, PASS. Cards view (first tap on toggle did not register - possible input artefact; second did) renders single column cleanly, no horizontal overflow; Table at 375 scrolls horizontally inside its card. Today at 375: PASS, no overflow; 'Today's focus' grid is uneven (Sleep card half width with empty slot beside it) - TRIVIAL. Screenshots: assets/c5be48e4..., c3d77042....
- TK-174, goals > edit target = 0, MAJOR(UX). Steps: Goal 'QA Value Savings 9e' > Edit Goal details > target 0 > Save. Expected: either save, or clear field-level message explaining that target must be > 0. Actual: toast 'Could not save.' with no reason and no field highlight; value left in field. Screenshot: assets/eb828333.... Fix: validate before submit and say 'Target must be greater than 0'.
- TK-175, goals > edit target = -500, TRIVIAL. Toast 'Enter a non-negative decimal amount.' - correct to reject, but wording contradicts the 0 case (0 is non-negative yet 'Could not save.'); toast only, no inline error. Screenshot: assets/62b0e7b8.... Fix: unify validation messaging.
- TK-176, goals > edit target = 999999999999, MINOR. Saved without any cap/warning ('Private Goal saved. No funds moved.'); card/detail shows '€999,999,999,999.00', 0%, remaining €999,999,994,999.00; layout holds at 768 detail. Screenshot: assets/a264d946.... Expected: sensible max or confirmation. Fix: add upper bound. (Target restored to 10000 afterwards, saved OK.)
- TK-177, goals > delete value goal menu, MINOR. On goal '...' menu 'Delete Goal' is disabled with text 'A Goal with a plan or recorded contributions keeps that history ... cannot be deleted. Close it instead' even though this goal shows 'No saving plan yet' and €0 contributions (only a manual valuation link). Expected: delete allowed or message names the real reason. Screenshot: assets/a264d946.... Fix: clarify rule/message.
- TK-178, goals > complete Project goal, PASS. Marking both milestones complete auto-completed the goal; Goals header showed Active 2 / Finished 1; persisted. Screenshot: assets/bf611eab....
- TK-179, goals > delete Quantity goal, TRIVIAL. Delete works from goal detail menu (card '...' menu has no Delete). Confirm panel renders far down the page below the fold (screen scrolled to it), and the success toast reads 'Private Goal saved. No funds moved.' instead of 'deleted'. After reload goal stays gone. Screenshots: assets/3d703597..., 1d8cb948.... Fix: toast 'Goal deleted'; render confirm as a modal near the trigger.
- TK-180, wealth > edit Savings Test balance 5000 -> 4000, PASS with notes. Saved ('Savings Test saved.'); Holding/Allocated 4,000; linked Value goal card went to €4,000 / 40% / €6,000 remaining with a 'NEEDS REVIEW' badge; Wealth header 'Known tracked wealth' 354,000, Allocated 4,000, 'Available for Goals' 350,000, banner '1 need attention: 1 short of what Goals hold'. Screenshots: assets/009a9b28..., 8f5bcbe3..., 1c823350.... Note: edit form warned 'a balance below allocations will require review' yet allocation silently shrank to 4,000 and the asset page 'Your linked Goals' list still said '5,000 EUR allocated' next to 'Allocated to Goals €4,000' (stale or inconsistent - possible lag artefact, not re-checked).
- TK-181, wealth > linked goal allocation after balance cut, MINOR. Goal shows €4,000 funded 40% and 'Review needed', but the allocation was reduced without the user being asked to review at save time. Expected: confirm/review step at save. Fix: prompt before auto-trimming allocation.
- TK-182, wealth > delete Visa debt, MINOR. Debt 'Edit' offers only Save and Archive (no Delete). Archive: toast 'Visa archived; its history is kept.' + Undo; Debts EUR 201,500 -> 200,000 immediately, 'Archived (1)' section appears; after reload Debts chip count 2 -> 1, All 7 -> 6. Net worth math before: 354,000 - 201,500 = 152,500 (correct); expected after: 154,000 (not re-read after reload - my Debts-chip click missed under lag). Also at 768 the edit form's 'Yearly rate' field is partly covered by the tick FAB. Screenshots: assets/9d6e3b84..., 4ab2eb63.... Fix: add true delete or call the action 'Archive' clearly; reserve FAB space.
- TK-183, settings > theme helper text, TRIVIAL. With Light selected the caption still reads 'Nebula is the look you know. Light and Dark are the same app by day and by night.' Fix: caption per selected theme. Screenshot: assets/68a0435c....
- TK-184, settings > your app, TRIVIAL. At 768 the sticky chip row (Data & privacy / Your app / ...) takes ~110px of the viewport and covers content when scrolling; the 'Checklist button and Today card' checkbox renders as an oversized unstyled box overlapping the first letter of its label; 'Load Showcase Demo' sits at the very top of Your app (destructive-adjacent, not clicked). Screenshots: assets/840ac25c..., bff42e0c....
- TK-185, light theme at 768 > Wealth and Goals, PASS. Both render readable, no overflow; Light persists across reload; Goals hero artwork stays a dark night scene on the light page (cosmetic). 2 console errors were shown by DevTools during the session (not investigated; may be pre-existing). Screenshots: assets/63f43f39..., e9f59f73.... Theme restored to Nebula afterwards (assets/e153b12c...).

## Pass 9h
- TK-186, wealth > net worth after Visa archived + reload, POSITIVE. After a fresh load Net worth EUR = EUR 154,000.00 (Holdings 354,000 - Debts 200,000), as expected. USD card separate: $41,409.67. 'Archived (1)' still lists Visa.
- TK-187, wealth > Savings Test asset page > 'Your linked Goals', MEDIUM. Top cards say Allocated to Goals EUR 4,000.00 / 1 linked Goal / Available 0, but the 'Your linked Goals' list says 'QA Value Savings 9e - 5,000 EUR allocated'. Two numbers for the same allocation on one page (stored 5,000 vs effective 4,000 after the balance cut). Expected 4,000 (or '5,000 stored, 4,000 funded'). Fix: show the effective amount, flag the stored one. (Wealth hero also still says '1 short of what Goals hold'.)
- TK-188, goals > Value goal current target, POSITIVE. 'QA Value Savings 9e' = EUR 4,000 / EUR 10,000, 40% funded, EUR 6,000 remaining, badge NEEDS REVIEW. Consistent with Wealth's 4,000.
- TK-189, wealth > unarchive Visa, POSITIVE. Archived (1) > 'Restore' on Visa: toast 'Visa restored.'; debt returns EUR 1,500; Debts 200,000 -> 201,500; Net worth EUR 154,000 -> 152,500 immediately (matches pre-archive 152,500). No page reload needed.
- TK-190, wealth > archived-item action naming, POLISH. Per-item button is 'Restore' (next to 'Remove') while 'Restore' also means whole-backup restore elsewhere in Settings; an archived asset page says 'Restore this asset from Wealth'. Suggest 'Unarchive'. Also the archived Rain asset page headline shows 'Holding value: Unavailable' (fine, but a plain 'Archived' badge in the hero would help).
- TK-191, console > reload Wealth, Markets, Goals(/goals/new), MINOR. Read-only. Every page: (warning) 'Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'.' (shown once, on the document); (warning) 'Manifest: Enctype should be set to either application/x-www-form-urlencoded or multipart/form-data. It currently defaults to application/x-www-form-urlencoded' (manifest.webmanifest:1); (info) 'Banner not shown: beforeinstallpromptevent.preventDefault() called. The page must call beforeinstallpromptevent.prompt() to show the banner.' (wealth:1, markets:1, new:1). No uncaught exceptions or red errors, no failed requests seen. Note: Goals reload was done on /app/goals/new (address-bar autocomplete); /app/goals list itself not separately reloaded under Console. Fix: remove 'bluetooth' from Permissions-Policy header; fix manifest share_target enctype.
- TK-192, wealth > add Ethereum 2 (quote EUR) + 'Savings Two 9h' EUR 3,000, POSITIVE. ETH 2 added: Known tracked wealth 354,000.00 -> 357,992.81 (ETH ~EUR 1,996 each), prices 3 of 3 current; Savings Two 9h: -> 360,992.81. Assets count 4 -> 6. Note: typing into the add-asset form dropped/misplaced characters under lag ('Savings Two 9h3' name, '000' amount), possible input artefact; retyped and verified before save.
- TK-193, goals > create 'Value Goal 9h' (EUR 8,000) with Ethereum 2 + 'Savings Two 9h' 3,000, POSITIVE. Optional sources: select card > 'Include selected source' defaults units to full holding (2 ETH / 3000). Review step: progress 6,992.81 EUR; after Create goal the goal page shows EUR 6,992.81 of 8,000, 87%, remaining 1,007.19. Wealth cards: Allocated to Goals EUR 7,992.81 (4,000 + 3,992.81).
- TK-194, goals > new-goal source picker, POLISH. Picker lists 'Savings Test 4,000 EUR' with the same weight as free sources though it is already fully allocated to another goal (Available 0). Show 'available' amount on each source card. Also review step lines 'Planned contributions None' and 'Ethereum: 2 ETH allocated' render tightly stacked (looks like one block), a separator would help.
- TK-195, wealth > archive 'Savings Two 9h' while allocated, POSITIVE. Asset page 'Archive asset' opens dialog 'These allocations will be released: Value Goal 9h: 3,000 EUR' with 'Release allocations & archive' / Cancel. Toast: 'Savings Two 9h archived. Restore it any time from Archived assets on Wealth; its Goal allocations are not recreated.' Wealth total 360,992.81 -> 357,992.81.
- TK-196, goals > goal after allocated asset archived, Medium. 'Value Goal 9h' dropped to EUR 3,992.81 / 8,000, 50%, EUR 4,007.19 remaining, badge 'NO PLAN' / 'active' with no review/notice that 3,000 of its funding was released. Compare 'QA Value Savings 9e' which gets 'NEEDS REVIEW' when its backing shrinks. Inconsistent: released-by-archive should leave a note on the goal ('Savings Two 9h was archived, 3,000 removed') or a review flag. Toast was the only trace.
- TK-197, wealth > add 'USD Cash' 1,000 (Cash, USD), POSITIVE. Headline EUR total unchanged (357,992.81) and USD chip updated 41,410.12 -> 42,410.12; USD kept as its own bucket, no conversion. Net worth USD card shows $42,410.12, Debts $0.00.
- TK-198, wealth > custom asset in GBP ('Item 9h1', qty 1, total 500, currency text field set to GBP), Medium/POSITIVE mix. Accepted: chip becomes '$42,410.12 held in USD - +1' and expanding shows '+ $42,410.12 held in USD - not converted' and '+ 500.00 GBP held in GBP - not converted'. New 'Net worth - GBP' card = 500.00 GBP. Net worth EUR = 156,492.81 (357,992.81 - 201,500) correct and untouched. POSITIVE: separate-currency honesty is clear and consistent. Note: 2 of 3 market prices current / '1 price older than 15 minutes' appeared during this (time-based, not a bug).
- TK-199, wealth > currency formatting, POLISH. GBP shown as '500.00 GBP' (code suffix) while USD '$42,410.12' and EUR 'EUR 357,992.81' use symbols; GBP has a symbol too. Also the Valuation currency field offers only USD/EUR pills but a free-text field silently accepts any code ('GBP'); no validation hint (try 'XYZ'? not tested). Suggest a currency picker.
- TK-200, wealth > add-asset form typing under lag, MINOR (possible input artefact). Custom form: typed name went partly to the wrong field when a click lagged ('Item 9h1' saved instead of 'GBP Item 9h'; text 'GBP Item 9h' landed in Quantity and had to be cleared). Browser autofill history dropdown (1/10/100/1000, 5000/800/0.5...) also pops over the Total value field when focusing Quantity and hides it; set autocomplete=off on amount fields.

## Pass 9i
- TK-201, wealth > AAPL / VOO / Gold 'Reference price' (TK-121/TK-040 recheck), POSITIVE. Added AAPL (10, Stocks tab), Vanguard S&P 500 ETF/VOO (2, ETFs tab) and Gold/XAU (1, Precious metals tab). Wealth cards show 'Tokenized reference price per AAPL $328.46 / per VOO $684.15 / per XAU $3,943.42', badge Current, holding values 3,284.67 / 1,368.30 / 3,943.42 (qty x price correct). Status line '5 of 5 market prices current'. Markets table prices the same three identically ($328.46 / $684.15 / $3,943.42). 'Reference price Unavailable' no longer seen for market-backed stocks/ETFs/metals: FIXED on this data (only manual assets show Manual value). Note: AAPL already existed in the profile ('You already track AAPL. Open it and change its quantity instead.' on a second add: good duplicate guard).
- TK-202, recheck W8/M12 (TK-033), wealth > Apple asset page > Price history, MINOR. STILL OPEN: header says 'Current reference price $328.46' (Price updated 5:01 AM) but Price history shows raw '328.4436332819673 USD' observed 4:00 AM, three different values/timestamps on one page (header, history number, 'Price updated'). Fix: one formatted price (<=2dp) and one timestamp, or label 'last saved observation'.
- TK-203, recheck M10, markets/add-asset > Gold icon, POLISH. Gold (XAU) search result and Markets row use the Tether-Gold style token logo while the Wealth card for the same Gold uses a generic triangle icon, VOO uses the Vanguard 'V' in Markets but a generic square on Wealth. Copy is now honest ('CoinGecko tokenized RWA reference, not physical metal spot or a broker price'): CHANGED (labels fixed, icons inconsistent between pages).
- TK-204, recheck M2, markets > table headers, MINOR. STILL OPEN: clicking 'Price' header does nothing visibly (no sort, no arrow); sorting only via separate 'Sort: As listed' dropdown. (Click was done once under lag, possible input artefact; table re-read after 3 s, order unchanged.)
- TK-205, recheck M9, markets > 'Refresh market data', MINOR. STILL OPEN (probable): after click no toast/spinner/'updated' text visible in two screenshots taken ~1 s and ~3 s later; prices and 'Current' badges unchanged. Possible input artefact due to lag; no failure banner either.
- TK-206, recheck M1, markets > Find a market 'btc', POSITIVE/CHANGED. Bitcoin first, Wrapped Bitcoin second, then many look-alikes (batcat, Bitcoin AI, Bitcoin Base...) each with an orange 'Unverified, check the project be...' warning (truncated text). Real asset now ranked first and unverified ones flagged. Residual: warning text clipped by card width; noisy list remains. In Wealth > Add asset > Crypto tab, 'VOO' returns only unverified look-alike coins (Vanguard S&P 500 xStocks etc.) - the real ETF is only found under the ETFs tab (a hint 'Looking for an ETF? try ETFs' would help).
- TK-207, markets > banner, POLISH. Top of /app/markets reads 'Markets is off until you turn it on - show it in the sidebar' while the full page works and Markets is absent from the sidebar. Copy implies the page is disabled. Reword to 'Markets isn't in your sidebar'.
- TK-208, wealth/markets > BTC price consistency (recheck W26 / TK-040), Medium. STILL OPEN: Wealth BTC card $76,250.90 ('Needs refresh', 24h from 4:53) vs Markets BTC $76,578.87 'Current' at the same minute. After add-asset the Wealth status flipped to '4 of 4 current' by itself. Same asset, two prices within a minute; needs a single source/time label.
- TK-209, settings > Brokerage CSV import, Medium (possible input artefact). Template downloaded (2 identical copies, content ok). Import dialog closed itself after choosing a file in the native picker (and after cancelling it), 4 tries; it never reached a step stating add/merge, so nothing imported. Fake file left at /workspace/brokerage-9i.csv.
- TK-210, today > 375px emulation, POLISH (possible input artefact). Width field took many tries (digits dropped). At 375 the Today hero rendered oversized/clipped ('PUBLIC' chip cut off, hero text overflowing right edge) in the emulated view; not confirmed because emulation was scaled/laggy. Light theme + Wealth 1280 not tested (time/lag).

## Pass 9j
- TK-211, light theme at full desktop (1280) > Wealth, Markets, Bitcoin asset page, Goals, POSITIVE. All four render readable (dark text on light, cards/chips/sparklines legible, no overflow). Sidebar keeps a dark-purple art gradient at its foot (cosmetic). Wealth total count-up showed overlapping digits mid-animation (transient). Goals card hero art stayed a dark night scene on the light page (known, TK-185). Nebula restored afterwards. 
- TK-212, bitcoin asset page > Price history, Medium (recheck M12 STILL OPEN). One page shows three BTC prices: header 'Current reference price' $76,578.87; price-history loading placeholder 76532.5548268051; chart 'observed price' 76722.11997653291 USD (Nov 4 5:17 AM) while header says observed 5:09. Fix: one price + timestamp.
- TK-213, bitcoin asset page > Price history number format, MINOR. Observed price rendered unformatted with 14 decimals ('76722.11997653291 USD', no thousands separator) while all other prices are '$76,578.87'. Fix: format to currency.
- TK-214, markets > hero banner, POLISH. Page shows 'Markets is off until you turn it on - show it in the sidebar' above a fully working Markets page; Markets (Open from Wealth/URL) is not in the sidebar. Message contradicts the usable page.
- TK-215, bitcoin asset page > Price history ranges, POLISH (recheck M11 CHANGED, unchanged). Ranges 24H/7D/30D/Available only; no 90D/1Y.
- TK-216, wealth > Add asset > Import from a CSV file (TK-209 retry), Medium, STILL OPEN. Reopened slowly; after choosing /workspace/brokerage-9i.csv in the native picker the dialog closes with no preview/merge step and nothing is imported. Reproduced repeatedly; not a typing artefact. The import lives under Wealth > Add asset.
- TK-217, sidebar, MINOR (possible state artefact). Sidebar items (Earn/Markets/Staking/Portfolio/Ecosystem, NOVA/Checklist) appeared and disappeared between loads; relates to TK-214.
- TK-218, wealth > Calculator recheck C1, CHANGED. 1,000 / 0 contribution / 5.29% / 3y -> $1,171.58 = monthly compounding; assumptions text says 'added every month' and an 'Interest added' selector exists. Earn-side wording not compared.
- TK-219, calculator inputs, POLISH (possible input artefact). Typed values were often dropped/reverted under lag; field accepted values only with slow typing.

## Pass 9k
- TK-220, settings > Your app > Appearance, POSITIVE. Theme selector shows 'Nebula' highlighted (Light / Nebula / Dark); no change needed.
- TK-221, staking > 'Open calculator' (Staking reward scenario), recheck C3, POSITIVE/CHANGED. Prefilled 1000 ZIG / 5.27% -> 7-day 1.01, 30-day 4.33, 365-day 52.7 ZIG. Rate set to 5 -> 0.96 / 4.11 / 50 ZIG (1000 x 5% = 50 for 365 days, matches). Footnote reads 'Simple APR. Estimate assumes current stake and APR remain unchanged. No automatic compounding or guaranteed yield.' There is no 'years' input, only fixed 7/30/365-day outputs, so '1 year' = the 365-day line.
- TK-222, staking calc vs wealth calc, Medium (wording/model difference, not a math bug). Staking calc = simple APR, explicit 'No automatic compounding'; Wealth calc (TK-218) = monthly compounding ('added every month', 5.29%/3y -> $1,171.58). Same '5%' gives different results with no cross-reference; Wealth side was not re-entered this pass (1000/5%/1y on Wealth not verified). Suggest a line in each pointing to the other, or a compounding toggle on staking.
- TK-223, staking calc edge inputs, POSITIVE. Rate 0 -> 0 ZIG on all three lines. Rate -5 -> hint 'Write a rate from 0 to 100.' and the three outputs show a dash. Rate 'abc' (typed) -> same hint and dashes. No crash, no NaN. Field accepts the characters (-, letters) visibly instead of blocking them, MINOR/POLISH. Amount field edge inputs not tested (left at 1000). Nothing saved ('nothing is saved').
- TK-224, today > 375px emulation, TK-210 CONFIRMED (Medium). Chrome devtools device toolbar, Responsive 375 x 985, Fit to window. At the top of Today the 'PUBLIC ALPHA' banner chip renders as huge 'PUBLIC / MOVES' text cut off at the right edge, 'YOUR FI...' eyebrow, hero 'Today's / = Tomo...' and 'Set goals... / Make roo...' are all cut off on the right with no wrapping; the top-right round checklist button also half clipped. Reproduced after F5 reload, so not a lag artefact. Fix: wrap/clamp hero font-size and banner at <=400px.
- TK-225, wealth > reload, drift check, POSITIVE with notes. After reload: headline 'KNOWN TRACKED WEALTH' EUR 358,014.05, chip '+ $47,890.74 held in USD - +1', 9 assets, 5 automatic, 4 manual; Allocated to Goals EUR 8,014.05, Available for Goals EUR 350,000.00; '5 of 5 market prices current'; '1 need attention: 1 short of what Goals hold'. Earlier last-known (9h/9i) EUR 357,992.81 and USD 42,410.12 differ now (+21.24 EUR, USD chip changed) but market-priced holdings (BTC $76,598.91, ETH EUR 2,007.02, AAPL $328.62) move with live prices, so drift is expected; Net worth card and individual goal cards not re-read this pass: not verified. Allocated EUR 8,014.05 is consistent with Value Goal 9h figures only approximately (not verified).
- TK-226, today > top notice, POLISH. Today shows 'A saved allocation exceeds its current source balance. Review the source before allocating more. Review saved sources' (matches wealth 'short of what Goals hold'); fine, but no way seen to dismiss it.

## Final note (05:32 Brussels)
Testing stopped on Professor's wrap-up order (weekly usage 95.8%). Pass 9k was stopped mid-run; any Pass 9k lines above are partial and unverified. No further entries after this point. Section 12 (updated 05:27) holds the final totals, TOP 10 and recheck counts. Screenshots for passes 9d onwards are in /home/box/agent-data/agents/093460c9-6909-442b-9bea-0f926d6124d5/assets/ (the box had no capture tool for shots/2026-11-04/).
