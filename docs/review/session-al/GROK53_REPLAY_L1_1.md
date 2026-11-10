# Grok #53 replay — lane L1 (Wealth, Portfolio, Markets, Add money, Calculator), pass 1

- **Commit served:** `5848c55c` (production build, `PUBLIC_ALPHA_UNDEPLOYED`) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 00:25–03:30 Brussels.
- **Replayed by:** a fresh replay agent (no fixes made, no app code changed). Bots: Tokyo (`tokyo.md`, `tokyo-recheck-list.md`) and the Professor rows L1 owns (P-PR-01 and the other P-PR rows GROK53_LEDGER puts in L1: P-PR-02, 05, 28, 55, 59, 65, 72, 73, 74, 75).
- **Browser:** Google Chrome (channel `chrome`), headless, Playwright 1.63, `locale: en-GB`, `timezoneId: Europe/Brussels`. Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser and one worker at a time. Scripts and 4 screenshots are in `/tmp/claude-0/replay-L1/` and are not committed.
- **Conditions used** (the codes are used in the table):
  - **D** = desktop 1280×800, Dark, a fresh empty context. The Welcome is marked seen and the crypto modules are not chosen, as on Tokyo's fresh profile.
  - **D+c** = the same, with the crypto modules chosen (Earn shown).
  - **N** = Nebula. **L** = Light. **375 / 768 / 835** = the viewport width.
  - **Sc** = Showcase (Settings → Load Showcase Demo), with crypto modules on.
  - **off** = market API answers 503, the way the lane's specs run.
- **Live prices.** The production server cannot reach CoinGecko in this sandbox: the hosted mode needs the durable coordinator, so `/api/market-*` answers 503. To match the bots' live conditions, I routed only the browser's `/api/market-{quotes,history,insights,detail,assets}` calls to a local process. That process ran the app's own route handlers from this commit, in their "direct" mode, against real public CoinGecko (via curl, cached for 2 min for prices and 30 min for catalog and history, because the public API throttles hard).
  - Effect: real prices and histories, but two loads within 2 minutes see the same upstream quote. Live drift between loads (TK-6B-06, part of PR-077) therefore cannot be reproduced. The rows that need it say so.
- **Lane specs as evidence.** `tests/grok53/wealth` and `tests/grok53/markets` (desktop project, 1 worker, :3101): **15 passed, 1 failed, 1 skipped**.
  - Failed: `p14d-wealth-375` WE10 (scrollWidth 468 > 375 with the Showcase).
  - Skipped: WE7 (the Showcase has no debt).
  - The specs run with an offline API, so they do not replay the bots' live conditions. Verdicts below come from the replays.

## Totals (counted per finding id; grouped rows expanded)

| verdict | ids |
|---|---|
| FIXED | 159 |
| HOLDS (positive / keep-list still works) | 59 |
| STILL OPEN (incl. regressions TK-026, C-TK-19, W18/W19) | 40 |
| CHANGED | 13 |
| OWNER DECISION (agreed: F / O2) | 7 |
| NOT POSSIBLE (agreed) | 13 |
| REASON CITED, NOT BUILT (competitor rows; the cited decision is outside F/O and could not be checked) | 6 |
| NOT REPLAYED (reason given per row) | 34 |
| OUT OF SCOPE (the bot did not retest, no #53 defect, not in O1) | 20 |
| L7 (not replayed here: ZIGi/NOVA findings, Z rows, prompts #1–53, N-TK-08…10, C-TK-34…37, X3-08) | 104 |
| Screenshot-only ids (follow their parent rows) | 29 |
| **total ids** | **484** |

## Findings (TK-001…TK-226, TK-6B-01…10)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| TK-001 | keep | HOLDS | D | "BTC" → Bitcoin first, Wrapped Bitcoin second, look-alikes "Unverified". 0,5 BTC + 2.25 ETH: hero US$45,695.08 = the two cards. |
| TK-002 | P-TK-05 | FIXED | D | "ETH": Ethereum, Ethereum Classic, Rocket Pool ETH, Lido Staked Ether, then bridged ETH. No Tether / Tether Gold in the top 10. |
| TK-003 | P-TK-06 | FIXED | D | Update balance "1500,75" typed → Net worth · EUR €1,500.75. Field focused on open. |
| TK-004 | (shot of TK-001/006/007) | FIXED | — | Screenshot-only id; see TK-001, TK-006, TK-007. |
| TK-005 | P-TK-07 | FIXED | D | Fast typing (5 ms/key) kept "Savings Test". Status "Savings Test added." → after rename "Savings Test 2 saved." |
| TK-006 | keep | HOLDS | D | Savings €1,500.75 + Car loan €12,000.50 → Net worth · EUR −€10,499.75, exact. |
| TK-007 | P-TK-08 | FIXED | D | The hero says "Your holdings… Net worth adds your accounts and subtracts your debts" and shows "Net worth after debts" per currency under the total. No FX (owner decision F). |
| TK-008 | keep | HOLDS | D | A 15-row, 7-column CSV auto-maps Name/Symbol/Quantity/Class/Value/Currency. Step 2 says "Not imported (no field for it): Account." |
| TK-009 | P-TK-10 | CHANGED | D | "9 rows ready · 6 rows refused", each with a row number and reason, open without a click. But row 10 (quantity −5) reads "the quantity is not a number" (it is a negative number). |
| TK-010 | P-TK-10 | CHANGED | D | ETF still imported as Stocks (note "Class in your file: ETF (kept as Stocks)"), though Wealth has an ETFs class. Vehicle → Custom asset. |
| TK-011 | P-TK-10 | FIXED | D | "Row 13: the same as row 1 … left out to avoid counting it twice." |
| TK-012 | keep | HOLDS | D | After import: €291,700.50 + US$18,260.40, both exact. "Currency totals stay separate." |
| TK-013 | P-TK-10 | FIXED | D | XAG row → "Silver grams · 50 grams of Silver". "Gold bar 100g" ×2 → "200 grams of Gold". Reference "Not linked" with its reason. |
| TK-014 | P-TK-11 | FIXED | D | Add (Custom) and Edit asset with "XYZ": field aria-invalid, "“XYZ” is not a currency code ZIGoals knows. Use one such as USD, EUR or GBP." |
| TK-015 | P-TK-07 | FIXED | D | Edit value: triple-click, type "1234,56", Save → US$1,234.56 and the toast "Silver coins saved." |
| TK-016 | keep | HOLDS | D | Reload keeps the assets. Banner "Your records stay in this browser and are not a backup". |
| TK-017 | keep | HOLDS | D (clock) | Refresh prices → "Prices updated at hh:mm". The 15-minute rule flips the strip (see W9). |
| TK-018 | P-TK-13 | FIXED | D | The Export everything ZIP has `wealth-holdings.csv` (Name, Asset, Quantity, Kind, Value 1850.40, Currency, Notes). Re-imported: 9 rows ready, 0 refused. |
| TK-019 | P-TK-10 (INT) | NOT REPLAYED | D | "Download template" sits inside a `<summary>`. The headless download did not fire, so the header was not seen. The source (P14-D) writes the importer's words. |
| TK-020 | keep | HOLDS | D | 0,5 BTC @60,000 + fee 10 → cost basis US$30,010.00, avg US$60,020.00, value = 0.5 × US$80,372.00. |
| TK-021 | P-TK-15 | FIXED | D | No "Portfolio is off" banner on a fresh profile. Portfolio stays apart from Wealth by design (C-TK-07). |
| TK-022 | P-TK-16 | NOT POSSIBLE | D | Agreed: harness lag. Fast Playwright typing kept every character. |
| TK-023 | keep | HOLDS | D | Sell 0.1 @70,000 fee 5 → "Realized +US$993.00 · unrealized …". |
| TK-024 | P-TK-18 | STILL OPEN | D | Oversell: the message is under Quantity, the field is aria-invalid and focused, in view, nothing at the top (fixed). But Save still moves down 87 px (oversell) and 60 px (empty quantity) in page coordinates. The spec only checks x. |
| TK-025 | keep | NOT REPLAYED | D | Edit and Remove are present on the transactions; Remove→Undo was not exercised. |
| TK-026 | keep | STILL OPEN (regression) | D, D+c, Sc (live) | `/app/portfolio/coin/bitcoin` with a held coin shows "This page could not be shown. Something went wrong while drawing it." (console ZodError) once price history loads. Blocking only market-history avoids it. Cause: C-TK-19's cost key calls `formatHistoryPrice({at:'',…})`, and the history point schema refuses `at:''`. Offline the page, Edit and FIFO/LIFO work. |
| TK-027 | P-TK-21 | STILL OPEN | D+c off | Edit form: Save is a 180×116 gradient block in the grid beside Type (screenshot tk027-edit.png). FIFO/LIFO label text sits 30 px below its dot and starts left of the dot's right edge. |
| TK-028 | P-TK-03 | CHANGED | D (live) | The Portfolio coin page cannot be read: it crashes (TK-026). On the Wealth/Markets coin page the chart price is formatted ("US$80,505.99 · last chart observation"). |
| TK-029 | P-TK-02 | STILL OPEN | D (live) | Portfolio Value US$32,148.80 against Analysis "US$32,155.19 · 5 Nov 2026, 02:30" on the same screen, with no "as of" explanation. |
| TK-030 | P-TK-22 | FIXED | D | Tabs: Coins · Analysis · Transactions. |
| TK-031, TK-032 | (M7/M4 shots) | FIXED | — | Screenshot-only; see M4, M7. |
| TK-033 | P-TK-04 | FIXED | D (live) | BTC and SOL charts differ (different path data). Price formatted. "Change over this chart (Max), not the 24h change". Ranges 24H/7D/30D/90D/Max. Owned→Crypto view kept after Back. (1Y: TK-215.) |
| TK-034 | P-TK-23 | FIXED | D+c, L | Choosing Bitcoin moves focus to "2 Which network?" (scrolled into view). Step 3 adds "Link one here" and "No wallet yet? You can still record what you own by hand on Wealth." |
| TK-035 | keep | HOLDS | D | Defaults US$84,919.37 / put in US$49,000. 100/mo, 10 y → US$17,175.24 / US$13,000.00. Every assumption written. |
| TK-036 | P-TK-24 | STILL OPEN | D+c, L | Years 10100 → "Whole years from 1 to 60." and the results are replaced by "Correct the marked field to see the estimate." The cited owner decision TR14 is not in AL_SCOPE F/O1–O7. No page jump now. |
| TK-037 | P-TK-08 | CHANGED | D (live) | Today now shows "Net worth after debts −€200,400.00 · US$40,364.25" and "Your debts are larger…" (fixed). The strip still reads "Today tracked wealth" (N-TK-22), the USD chip has no "as of" (N-TK-19), and "Make Today yours" stays (N-TK-21). |
| TK-038 | P-TK-27 | FIXED | D | The duplicate sentence is gone: "USD: one value recorded so far. Come back on another day…" per currency. |
| TK-039 | P-TK-08 | FIXED | D | A €999,999,999,999.99 debt asks "more than a billion — Keep this amount". Hero "Net worth after debts −€1,000,000,010,498.24" plus "Your debts are larger than what you own in EUR". |
| TK-040 | P-TK-28 | FIXED | D (live) | Manual AAPL/VOO/metals: "Reference price … Not linked · Added by hand, so no market price is followed. To follow…, add it again from its tab". Wealth BTC = Markets = coin header. Note: Wealth card time 02:07 vs Markets "Observed 02:04" for the same quote. |
| TK-041 | P-TK-18 | STILL OPEN | D | 999999999999999999 → first "US$1,000,000,000,000,000,000.00 is more than a billion — Keep this amount" (a rounded figure, for an amount past the cap). After Keep: "Enter an amount up to a trillion." **below Save** (y 595 vs Save 523); field not aria-invalid and no describedby (tk041.png). |
| TK-042 | keep | HOLDS | D | US$9,999,999,999.99: check asked, Keep → toast "USD Cash added to your wealth.", hero readable, no overflow. |
| TK-043 | keep | HOLDS | D | 8 of 8 favourites and Table view survive F5. |
| TK-044 | P-TK-25 | FIXED | D (live) | First paint shows "Loading…" in 1h/7d, then values (+0.07 % / −0.97 %, US$1.62tn); no "Not provided" flash. |
| TK-045 | keep | HOLDS | D | "zzzz" → "No matching markets … No matches in this view … Find a market". |
| TK-046 | P-TK-15 | FIXED | D | No "Markets is off" banner. Markets is not in the sidebar until crypto is chosen (consumer-first). The one list of 8: C-TK-20. |
| TK-047 | P-TK-30 | NOT POSSIBLE | — | Agreed: harness profile. |
| TK-048…TK-055 | P-TK-31…37 | L7 (not replayed here) | — | ZIGi prompts. |
| TK-056 | P-TK-01 | FIXED | L/D 375, 768 | No floating launcher over content below 901 px; "Apps & extras" button present (O3). |
| TK-057 | P-TK-38 | FIXED | L | Light calculator strokes rgb(0,120,138)/rgb(154,84,0); milestone pill cream with dark text; no mascot at 375. |
| TK-058, 059, 064–068 | (TK-056/057 shots) | FIXED | — | Screenshot-only; see TK-056, TK-057. |
| TK-060 | P-TK-01 (verify) | L7 (not replayed here) | — | ZIGi panel at 358 px. |
| TK-069 | keep | NOT REPLAYED | — | More-menu theme switch not exercised (themes set through the theme record). |
| TK-070…TK-084 | P-TK-31…41 | L7 (not replayed here) | — | NOVA rows (incl. ENV TK-073, TK-077, TK-074 hotkeys from NOVA). |
| TK-075 | keep | HOLDS | D+c 835 | Add money column 108–815 px of 835 (N-TK-11 fixed). |
| TK-076 | (TK-075 shot) | HOLDS | — | Screenshot-only. |
| TK-085 | P-TK-16 | NOT POSSIBLE | — | Agreed: harness lag. |
| TK-086 | keep | HOLDS | D | Markets desktop Dark renders; no page errors. |
| TK-087, 088, 089 | keep | HOLDS | D 375 (no crypto) | No sideways scroll on a fresh profile (scrollWidth 375). With crypto modules on, see TK-224. |
| TK-090 | P-TK-42 | NOT REPLAYED | — | A transient count-up overlap; not captured (NumberTicker, L10a). |
| TK-091 | P-TK-01 | FIXED | 375 | No mascot at 375 (O3). |
| TK-092 | P-TK-32 | L7 (not replayed here) | — | — |
| TK-093…TK-110 | (6B shots) | see TK-6B-01…10 | — | Screenshot-only. |
| TK-111 | P-TK-38 | FIXED | L 1280 | "10k/100k" pill fill rgb(255,243,209), text rgb(90,56,0); hero icons visible (tk164 shot). |
| TK-112 | keep | HOLDS | L 1280 | Add money renders; desktop floats at the edge (allowed, F). |
| TK-113 | P-TK-43 | CHANGED | L 1280 | Portfolio/Markets hero blocks end at x 1196 = the card edge (fixed). But the Portfolio BTC coin page crashes with live history (TK-026). |
| TK-114, TK-115 | P-TK-43 | FIXED | L 1280 | Markets and Portfolio hero right edge 1196 = cards; no "is off" banner. |
| TK-116 | P-TK-44 | FIXED | L 1280/768/375 | "+ €8,000.00 held in EUR" chip right 1142 < card 1196 (wraps inside). |
| TK-117 | P-TK-19 | FIXED | D | Starring the 4th row: order unchanged; remove → "USD Coin removed from your favourites. Undo". |
| TK-118 | P-TK-19 | FIXED | D | At 8/8 the empty stars are disabled with the title "Your favourites are full (8 of 8)…"; a click toasts "Silver was not added…". |
| TK-119 | P-TK-19 | FIXED | D | Coin page at 8/8: "Your watchlist holds up to 8 favourites. Remove one to make room." (no "Error:"). Note: shown twice (alert + toast). |
| TK-120 | P-TK-03 | FIXED | D (live) | SOL header US$95.76; chart "US$95.64 · last chart observation". |
| TK-121 | P-TK-28 | FIXED | D | Manual AAPL says why and how; "Gold bar 100g" ×2 → 200 grams. |
| TK-122 | P-TK-45 | FIXED | D+c | /app/calculator → /app/wealth/calculator. |
| TK-123 | P-TK-07 | FIXED | D (clock) | Half-filled Mortgage form kept "House mortgage" through Refresh prices and a 1-min tick. |
| TK-124, 125, 128, 131 | keep | HOLDS | D | Mortgage 200,000 + Visa 1,200: debts €201,200, net worth exact after each step. |
| TK-126 | P-TK-06 | FIXED | D | "Rainy" in Balance → "Enter a non-negative decimal amount." at the field; inputmode=decimal. |
| TK-127 | P-TK-11 | CHANGED | D | XYZ can no longer be saved (fixed). Huge values are still written in full (−€1,000,000,010,498.24), not abbreviated. |
| TK-129, TK-138 | P-TK-46 | FIXED | D | Edit account / Edit debt: Name focused. |
| TK-132 | P-TK-08 | FIXED | D | "Net worth after debts" under the holdings headline; plain hero sentences. |
| TK-133 | P-TK-47 | FIXED | D | Property: "Owe something on it, such as a mortgage? Add the debt under Accounts, debts & net worth…". |
| TK-134 | P-TK-48 | FIXED | D (live) | "Shares you hold … it is not your broker’s quote". |
| TK-135 | P-TK-09 | OWNER DECISION | — | Agreed: F (Alpha USD/EUR, no invented FX). |
| TK-136 | P-TK-16 | NOT POSSIBLE | — | Agreed: foreign window focus. |
| TK-137 | keep | HOLDS | D | Archive updates totals; Undo now shown ("Rain archived. Undo"). |
| TK-139 | P-TK-07 | FIXED | D | As TK-123. |
| TK-140 | keep | HOLDS | D | "1,5" → +€1.50, "−50" refused, "0" saved, 999,999,999,999 asks once. |
| TK-141, 143, 145, 178, 193 | keep | NOT REPLAYED | N | Goals wizard: my script did not get past step 1. Goals lane. |
| TK-142 | P-TK-50 | STILL OPEN | N | Wizard preview "10000 USD" (no separators). |
| TK-144, 146, 174, 175, 176, 177, 179, 194 | P-TK-50/51/52/59, P-TK-18, P-TK-49 | NOT REPLAYED | Sc | Goal edit/delete flow not reached by my scripts (Goals lane). |
| TK-147 | keep | HOLDS | D (live) | Today "tracked wealth · currencies kept separate US$40,364.25 + €800.00" = Wealth hero. |
| TK-148 | P-TK-26 | STILL OPEN | Sc | "Make Today yours" still above the data with active goals. |
| TK-149 | P-TK-53 | NOT REPLAYED | D | I used fill(), not paste: 229 characters → 100, no message. The fix (`pastedPastLimit`) listens to paste, which I did not simulate. |
| TK-150 | P-TK-16 | NOT POSSIBLE | — | Agreed: lag mis-entry. |
| TK-151 | P-TK-15 | FIXED | D | Fresh profile: New portfolio, Record a transaction (Buy/Sell/Transfer/Staking reward/Income/Airdrop). |
| TK-152 | P-TK-14 | FIXED | D | Goals and Wealth backup: "…accounts and debts are in Export everything." |
| TK-153 | keep | HOLDS | D | Star/unstar/reload consistent. |
| TK-154 | P-TK-15 | FIXED | D | No banner. |
| TK-155 | P-TK-03 | FIXED | D (live) | SOL/BTC chart prices formatted; no raw floats in the page. |
| TK-156 | P-TK-04 | FIXED | D (live) | "Loading observed prices" text while loading; complete chart after; no broken segments seen. |
| TK-157 | keep | HOLDS | D (live) | SOL US$95.76 in Markets = coin header. |
| TK-158 | keep | HOLDS | D+c | USDC → "Base · Recommended". The Ramp fee line was not seen (on-ramp API not reachable from the sandbox server). |
| TK-159 | P-TK-24 | FIXED | D+c | 26 digits → "That is more than this calculator models. Enter an amount below 10 trillion…". |
| TK-160 | keep | HOLDS | D | Archive confirm, Undo restores, re-archive stays after reload. |
| TK-161 | P-TK-01 | FIXED | 375 | No floater (O3). |
| TK-162 | P-TK-55 | STILL OPEN | D 375 | Table view at 375: Price, 24h and star columns off-screen (scrollWidth 504 / 341); no fade or hint. |
| TK-163 | keep | HOLDS | D 375 | No overflow on a fresh profile (see TK-224 for crypto-on). |
| TK-164 | P-TK-39 | FIXED | L 1280 | Total solid ink (no gradient clip); rocket and orbit art visible (tk164 shot). |
| TK-165 | P-TK-56 | FIXED | Sc L | Evening wrap-up checkbox 12 px from its label. |
| TK-166 | P-TK-54 | FIXED | D | Archived asset page: "Holding value Archived · not counted … Unarchive Rain". |
| TK-167, 168, 169 | P-TK-01 | FIXED | 375, 768 L/D | No floaters below 901 px. |
| TK-170 | P-TK-55 | FIXED | D | No "−0 %" (USDC "0% in 1 hour"). |
| TK-171 | P-TK-15 | FIXED | D | No banner on load. |
| TK-172 | P-TK-57 | FIXED | D 768 | Chart plot 600 px in a 640 px card. |
| TK-173 | keep | HOLDS | D 375 | Single column, no overflow (fresh). |
| TK-180 | keep | HOLDS | Sc | Cut Gold 10→2: goal NEEDS REVIEW; asset page explains. |
| TK-181 | P-TK-60 (Goals) | STILL OPEN | Sc | Only a static line "a balance below allocations will require review"; Save goes through with no ask. |
| TK-182 | P-TK-54 | FIXED | D | Debt Edit: Save + Archive; Archived (1) then offers Remove; no FAB at 768. |
| TK-183 | P-TK-61 | NOT REPLAYED | Sc L | The caption was not read in the UI (selector miss). The source has a caption per theme. |
| TK-184 | P-TK-56 | STILL OPEN | Sc 768 | Settings sticky section row is 134 px tall (was ~110). |
| TK-185 | keep | HOLDS | L 768 | Readable, no overflow (fresh). |
| TK-186 | keep | HOLDS | D | Net worth exact after archive and restore. |
| TK-187 | P-TK-60 | FIXED | Sc | "First home deposit 2 GOLD allocated (5 GOLD saved; this asset now holds less, so the Goal counts its share… needs a review)". |
| TK-188 | keep | HOLDS | Sc | Goal NEEDS REVIEW after the cut. |
| TK-189 | keep | HOLDS | D | Restore Visa → debts €201,200 again at once. |
| TK-190 | P-TK-54 | STILL OPEN | D | Archived debt still "Restore" (beside Remove). Assets now say "Unarchive". |
| TK-191 | P-TK-63 | STILL OPEN | D | Every load: "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'." |
| TK-192 | keep | HOLDS | D | BTC/ETH added, totals exact (same maths path). |
| TK-195 | keep | HOLDS | Sc | "These allocations will be released: Emergency fund: 4,000 USDC"; toast honest. |
| TK-196 | P-TK-60 (Goals) | STILL OPEN | Sc | After USDC's release, Emergency fund shows "US$5,000.00 / US$20,000.00 … Existing wealth · active", with no review flag or note. |
| TK-197, TK-198 | keep | HOLDS | D | USD cash and GBP get their own buckets ("Net worth · GBP 500.00 GBP"). |
| TK-199 | P-TK-11 | STILL OPEN | D | Still "500.00 GBP" (code suffix) while USD/EUR use symbols. The status claims fixed; F would allow it, but no owner decision is claimed. |
| TK-200 | P-TK-06 | FIXED | D | autocomplete=off on quantity, value, currency and balance. |
| TK-201 | keep | HOLDS | D (live) | AAPL/VOO/XAU from their tabs: "Tokenized reference price… Current" = Markets (US$350.77 / 704.43 / 4,077.99). A second AAPL add is refused (still 1 asset); the message text was not captured. |
| TK-202 | P-TK-03 | FIXED | D (live) | Same chart component as TK-212: formatted and labelled. |
| TK-203 | P-TK-48 | NOT REPLAYED | — | Logos come from `/api/market-logo`, which my live route did not proxy. |
| TK-204 | P-TK-66 | FIXED | D | Price header click → aria-sort=descending, rows reorder. |
| TK-205 | P-TK-67 | FIXED | D | "Market data updated at 02:13." beside the button. |
| TK-206 | keep | HOLDS | D | Find a market "btc": Bitcoin, Wrapped Bitcoin, then flagged look-alikes. |
| TK-207 | P-TK-15 | FIXED | D | No banner. |
| TK-208 | P-TK-02 | FIXED | D (live, cached 2 min) | Wealth BTC US$80,504.99 Current = Markets US$80,504.99 Current at the same minute (the stub caveat: no drift). |
| TK-209 | P-TK-68 | FIXED | D | = TK-216. |
| TK-210 | P-TK-64 | STILL OPEN | D+c 375 | = TK-224. |
| TK-211 | keep | HOLDS | L 1280 | Readable. |
| TK-212 | P-TK-02 | FIXED | D (live) | Header US$80,504.99 vs chart "US$80,505.99 · last chart observation"; no raw placeholder. |
| TK-213 | P-TK-03 | FIXED | D (live) | No `\d{4,}\.\d{6,}` anywhere on the coin pages. |
| TK-214 | P-TK-15 | FIXED | D | No banner. |
| TK-215 | P-TK-04 | STILL OPEN | D (live) | Ranges 24H/7D/30D/90D/Max — still no 1Y. |
| TK-216 | P-TK-68 | FIXED | D | Real file chooser: picker cancel, then choose → the sheet stays open, Step 2 appears. |
| TK-217 | P-TK-15 | NOT POSSIBLE | — | Agreed: state artefact (the sidebar differs only by the crypto-modules choice; stable per state in my runs). |
| TK-218 | keep | HOLDS | D | 1,000 / 0 / 5.29 % / 3 y → US$1,171.58. |
| TK-219 | P-TK-16 | NOT POSSIBLE | — | Agreed: lag. |
| TK-220 | keep | NOT REPLAYED | — | Appearance selector not read. |
| TK-221, TK-223 | keep / P-TK-06 | NOT REPLAYED | Sc | The 7/30/365-day staking calculator was not found. Earn → Calculator now offers "Open the calculator at 5.19 %" (the compound calculator). |
| TK-222 | P-TK-69 | FIXED | D+c, Sc | Wealth calculator: "adds interest… every month (compounding). The staking calculator on Earn shows a simple yearly rate…". Earn: "…simple yearly rate". |
| TK-224 | P-TK-64 | STILL OPEN | D+c L 375 | The hero now wraps (fixed part). The PUBLIC ALPHA banner "PUBLIC ALPHA · NOTHING MOVES UNLESS YOU S…" runs off-screen and "More" sits at x 468, so every page scrolls 93 px sideways (tk224 shot). The lane spec WE10 fails on the same thing. |
| TK-225 | keep | NOT REPLAYED | — | Needs live drift across reloads. |
| TK-226 | P-TK-60 | STILL OPEN | Sc | "A saved allocation exceeds its current source balance… Review saved sources →" with no dismiss. |
| TK-6B-01 | P-TK-01 | FIXED | L 375 (6 pages) | No floating launcher; "Apps & extras". |
| TK-6B-02 | P-TK-01 | FIXED | L+D 768 | As above. |
| TK-6B-03 | P-TK-15 | FIXED | D | No "X is off" card. |
| TK-6B-04 | P-TK-55 | FIXED | D 375 | The chip row scrolls with an edge fade (mask-image). |
| TK-6B-05 | P-TK-65 | FIXED | L 375 (no crypto) | Banner: "Your records stay in this browser and are not a backup. Saved in this browser only". |
| TK-6B-06 | P-TK-02 | NOT REPLAYED | — | Needs live drift between two loads (stub cache). The status "Not possible" cites no F/O decision, so I do not confirm it. |
| TK-6B-07 | P-TK-39 | FIXED | L 1280/768/375 | Total in solid ink. |
| TK-6B-08 | P-TK-44 | FIXED | L 768 | h1 `text-wrap: balance` (2 even lines). |
| TK-6B-09 | P-TK-40 | STILL OPEN | Sc L 1280 | "Hide amounts" boundary rgba(111,220,255,0.22) 1px on a near-white page: well under 3:1. |
| TK-6B-10 | P-TK-70 | FIXED | D+c / L | One disclaimer under the result. The intro has none. The "More planning tools" footer keeps its own line. |

## Old ids re-checked (recheck list, pass-1 lines, in-run)

| finding id | AL row | verdict | conditions replayed | evidence |
|---|---|---|---|---|
| W1 | P-TK-08 | FIXED | D | Net worth after debts under the headline; labels plain; FX = owner decision. |
| W2 | P-TK-27 | FIXED | D | = TK-038. |
| W3 | keep | HOLDS | D | "Manual value" badge. |
| W4 | keep | HOLDS | D | Trillion cap exists; huge totals readable (placement → W7). |
| W5 | P-TK-11 | FIXED | D | = TK-014. |
| W6 | P-TK-49 | FIXED | D | "more than a billion… Keep this amount" on balances and debts. |
| W7 | P-TK-18 | STILL OPEN | D | = TK-041 (message below Save, field unmarked). |
| W8 | P-TK-03 | CHANGED | D (live) | Fixed on Wealth/Markets coin pages; the Portfolio coin page crashes instead (TK-026). |
| W9 | P-TK-12 | FIXED | D (clock) | With no reload, +16.5 min flips to "Needs refresh … 1 need attention: 1 price older than 15 minutes". |
| W10 | P-TK-25 | FIXED | D (live) | "Loading…" then values; "Market prices as of 02:07" under the total. |
| W11 | P-TK-12 | FIXED | D | The reason is named ("Not linked · Added by hand…"). |
| W12 | P-TK-09 | OWNER DECISION | D | Agreed (F). The headline currency follows the data (USD vs EUR runs). |
| W13 | P-TK-10 | FIXED | D | = TK-009/TK-216. |
| W14, W16, W17, W21, W23 | — | OUT OF SCOPE | — | The bot did not retest; no #53 defect. |
| W18, W19 | (WE10) | STILL OPEN (regression) | Sc/D+c 375 | The lane spec `p14d-wealth-375` WE10 fails: scrollWidth 468 > 375 (alpha banner, crypto on). |
| W20 | P-TK-01 | FIXED | 375/768 | O3. |
| W22 | P-TK-28 | FIXED | D | Says why and how. |
| W24 | P-TK-60 | CHANGED | Sc | Asset page fixed (TK-187); no ask at save (TK-181); no flag after an archive release (TK-196). |
| W25 | P-TK-23 | FIXED | D+c | = TK-034. |
| W26 | P-TK-02 | FIXED | D (live) | = TK-208. |
| C1 | P-TK-69 | FIXED | D+c | = TK-222. |
| C2 | keep | HOLDS | D | US$13,000 put in. |
| C3 | keep | NOT REPLAYED | — | = TK-221. |
| G1, G3 | — | OUT OF SCOPE | — | Not retested. |
| G2 | keep | OUT OF SCOPE | — | N/A in the bot's list. |
| P1 | P-TK-02 | FIXED | D, Sc | Portfolio BTC = Markets BTC (US$80,372.00, same time); Showcase 24h the same on all pages. |
| P2 | keep | HOLDS | D | ZIG US$0.04288. |
| P3 | keep | HOLDS | D | Realised + unrealised in the header. |
| P4, P9–P13 | — | OUT OF SCOPE | — | Not retested. |
| P5 | P-TK-17 | FIXED | D | Staking reward / Income / Airdrop in Type. |
| P6 | P-TK-18 | FIXED | D | Oversell at Quantity, in view (the Save shift is P8). |
| P7 | P-TK-20 | FIXED | D | Edit + Remove in the holdings row. |
| P8 | P-TK-18 | STILL OPEN | D | Save moves 60–87 px when an error appears (TK-024). |
| P14 | keep | HOLDS | D 375 | Fresh: no overflow. |
| P15 | P-TK-13 | FIXED | D | TK-018/TK-152. |
| P16 | P-TK-25 | FIXED | D | TK-044. |
| P17 | P-TK-01 | FIXED | 768 | O3. |
| M1 | P-TK-05 | HOLDS | D | Bitcoin first. |
| M2 | P-TK-66 | FIXED | D | TK-204. |
| M3 | keep | HOLDS | D | TK-045. |
| M4 | P-TK-19 | FIXED | D | TK-118/119. |
| M5, M8, M16 | — | OUT OF SCOPE | — | Not retested. |
| M6 | P-TK-73 | FIXED | D | View kept after Back. |
| M7 | keep | HOLDS | D | Table persists. |
| M9 | P-TK-67 | FIXED | D | TK-205. |
| M10 | P-TK-48 | NOT REPLAYED | — | Logos not proxied; the copy is honest ("not a physical metal spot price"). |
| M11 | P-TK-04 | STILL OPEN | D (live) | No 1Y range. |
| M12 | P-TK-02 | FIXED | D (live) | TK-212. |
| M13, M14 | P-TK-03 | FIXED | D (live) | Formatted; no −0 %. |
| M15 | P-TK-85 | FIXED | D (live) | "Price alert" on Wealth/Markets coin pages. |
| Z1–Z17, Z19–Z21 | P-TK-31…37 | L7 (not replayed here) | — | ZIGi/NOVA. |
| Z18 | P-TK-01 | FIXED | 375/768 | O3. |
| F1 | P-TK-77 | NOT POSSIBLE | — | Agreed (F: no server for people's data). |
| F2 | keep | HOLDS | D | Kraken/Coinbase/Binance read-only connectors listed. |
| F3, F4, F6 | — | OUT OF SCOPE | — | Not retested. |
| F5 | keep | HOLDS | D | TK-023. |
| F7 | P-TK-85 | FIXED | D (live) | Price alert on coin pages. |
| F8 | keep | HOLDS | D | "Realised gains by year (CSV)". |
| F9 | P-TK-82 | OWNER DECISION | — | Agreed (F: no server sharing). |
| F10 | keep | HOLDS | D | "Hide amounts". |
| pass-1 "Net worth omitting BTC/ETH" | keep | HOLDS | D | TK-001. |
| pass-1 "'Current' badge on stale prices" | P-TK-12 | FIXED | D (clock) | W9. |
| pass-1 "Refresh with no feedback" | P-TK-67 | FIXED | D | Wealth and Markets both say "updated at". |
| pass-1 "Unformatted prices" | P-TK-03 | CHANGED | D (live) | Formatted everywhere except the Portfolio coin page, which crashes. |
| pass-1 "Fake currency XYZ" | P-TK-11 | FIXED | D | TK-014. |
| pass-1 "Several totals on one page" | P-TK-08 | FIXED | D | TK-007. |
| pass-1 "CSV Name/Symbol mapping" | P-TK-10 | CHANGED | D | Mapping holds; ETF class still → Stocks (TK-010). |
| pass-1 "'Available for Goals' shrinking" | keep | HOLDS | D | TK-042. |
| pass-1 "No upper limit on values" | P-TK-49 | FIXED | D | Cap + billion check (placement: TK-041). |
| pass-1 "'Explain wealth change' 99 %" | P-TK-27 | FIXED | D | TK-038. |
| in-run TK-121/TK-040 | P-TK-28 | FIXED | D | — |
| in-run TK-129 | P-TK-46 | FIXED | D | — |
| in-run TK-123 | P-TK-07 | FIXED | D | — |
| in-run TK-209 | P-TK-68 | FIXED | D | — |
| in-run TK-210 | P-TK-64 | STILL OPEN | D+c 375 | TK-224. |

## Copy / UX notes (N-TK) and competitor rows (C-TK)

| finding id | AL row | verdict | conditions replayed | evidence |
|---|---|---|---|---|
| N-TK-01 | P-TK-10 | FIXED | D | "Not imported (no field for it): Account." |
| N-TK-02 | P-TK-09 | OWNER DECISION | D | Agreed (F). |
| N-TK-03 | P-TK-12 | FIXED | D (clock) | W9. |
| N-TK-04 | P-TK-17 | FIXED | D | P5. |
| N-TK-05 | P-TK-20 | FIXED | D | Edit + Remove in the row. |
| N-TK-06 | P-TK-29 | FIXED | D | "Silver coins added to your wealth." |
| N-TK-07 | P-TK-19 | FIXED | D | Remove toast with Undo. |
| N-TK-08, 09, 10 | P-TK-32/36/37 | L7 (not replayed here) | — | — |
| N-TK-11 | P-TK-23 | FIXED | D+c 835 | Column to 815 px. |
| N-TK-12 | P-TK-49 | FIXED | D | Check tier. |
| N-TK-13, N-TK-14, N-TK-17, N-TK-20 | P-TK-58/62/42/25 | NOT REPLAYED | — | Today grid, Goals hero art, transient count-up and the pop-in were not measured. |
| N-TK-15 | P-TK-63 | FIXED | D | No console errors on Wealth/Markets/Today loads (only TK-191's warning). |
| N-TK-16 | P-TK-05 | CHANGED | D (live) | "Unverified · check the project…" wraps; VOO in Crypto says "listed under ETFs". New: Stocks tab + "AAPL" shows the real Apple stock **and** "AAPL (Apple (Backpack Securities)) is listed under Crypto. Choose the Crypto tab above to add it." |
| N-TK-18 | P-TK-06 | NOT REPLAYED | — | Staking calculator not located (TK-221). |
| N-TK-19 | P-TK-02 | STILL OPEN | D (live) | Today's tracked-wealth chip has no "as of" (only Wealth's total does). |
| N-TK-21 | P-TK-26 | STILL OPEN | Sc | = TK-148. |
| N-TK-22 | P-TK-08 | STILL OPEN | D | Fresh Today strip still reads "Today tracked wealth US$40,364.25". |
| N-TK-23 | P-TK-25 | FIXED | D (live) | "Loading…" then values; no "Not provided". |
| N-TK-24 | P-TK-72 | FIXED | D | "As listed (owned, favourites, then others)". |
| N-TK-25 | P-TK-23 | FIXED | D+c | "What the route costs and how long it takes (an estimate)… roughly 15 to 30 minutes". |
| N-TK-26 | P-TK-70 | FIXED | D+c | "Milestones: When the estimated balance would first pass 10,000, 100,000…". |
| N-TK-27 | P-TK-71 | FIXED | D (clock) | "9 assets added to Wealth (imported 5 Nov 2026, 01:50)"; none at +25 h. |
| N-TK-28 | P-TK-73 | FIXED | D | M6. |
| N-TK-29 | P-TK-41 | NOT REPLAYED | — | Global single-key shortcuts (L10a) not exercised. |
| N-TK-30 | P-TK-16 | NOT POSSIBLE | — | Agreed: box load. |
| N-TK-31 | P-TK-15 | FIXED | D | No "Portfolio is off". |
| C-TK-01 | P-TK-74 | OWNER DECISION | — | Agreed (F). |
| C-TK-02 | P-TK-13 | FIXED | D | Readable CSV round-trips 9/9. |
| C-TK-03 | P-TK-10 | FIXED | D | Per-row reasons (one wrong reason, TK-009). |
| C-TK-04 | P-TK-11 | FIXED | D | ISO check in add/edit/import. |
| C-TK-05 | P-TK-10 | FIXED | D | Duplicate row refused. |
| C-TK-06 | P-TK-75 | REASON CITED, NOT BUILT | — | M36 (not in F/O). FIFO/LIFO view exists. |
| C-TK-07 | P-TK-76 | REASON CITED, NOT BUILT | — | AK R22 (not in F/O). |
| C-TK-08 | P-TK-77 | NOT POSSIBLE | — | Agreed (F). |
| C-TK-09 | P-TK-78 | NOT REPLAYED | — | L6 watch addresses. |
| C-TK-10 | P-TK-79 | NOT POSSIBLE | — | Agreed (F: unknown is not zero). |
| C-TK-11 | P-TK-80 | REASON CITED, NOT BUILT | — | AK R22. |
| C-TK-12 | P-TK-81 | FIXED | D | "See where your USD holdings could grow →" on Wealth. |
| C-TK-13 | P-TK-82 | OWNER DECISION | — | Agreed (F). |
| C-TK-14 | P-TK-83 | REASON CITED, NOT BUILT | — | New device key + L3. |
| C-TK-15 | P-TK-84 | FIXED | D | "View-only · ZIGoals can’t move your money…". |
| C-TK-16 | P-TK-17 | FIXED | D | Types present. |
| C-TK-17 | P-TK-85 | FIXED | D (live) | Price alert on coin pages. |
| C-TK-18 | P-TK-86 | OWNER DECISION | — | Agreed (O2). |
| C-TK-19 | P-TK-87 | STILL OPEN (regression) | D (live) | Built, but it crashes the Portfolio coin page (TK-026). |
| C-TK-20 | P-TK-88 | STILL OPEN | D | Still one list, 8 max. |
| C-TK-21 | P-TK-89 | FIXED | D | Find a market = full catalogue. |
| C-TK-22 | P-TK-04 | STILL OPEN | D (live) | 90D/Max added; no 1Y. |
| C-TK-23 | P-TK-90 | FIXED | D | Sort by 24h change. |
| C-TK-24 | P-TK-91 | NOT POSSIBLE | — | Agreed (F: no fake integrations). |
| C-TK-25 | P-TK-02 | CHANGED | D (live) | "Market prices as of 02:07" on Wealth; Markets "Observed 02:04" for the same quote; none on Today. |
| C-TK-26 | P-TK-92 | NOT POSSIBLE | — | Agreed (no fee API; F). |
| C-TK-27 | P-TK-93 | FIXED | D+c | "No wallet yet? You can still record… by hand". |
| C-TK-28 | P-TK-94 | FIXED | D | "Rising contributions and inflation (optional)". |
| C-TK-29 | P-TK-95 | FIXED | D | "What would it take?" present (spec passes). |
| C-TK-30 | P-TK-96 | FIXED | D | Saved scenarios (up to 12); sharing = F. |
| C-TK-31 | P-TK-97 | FIXED | D | Download as CSV. |
| C-TK-32 | P-TK-98 | REASON CITED, NOT BUILT | — | L3 (not replayed). |
| C-TK-33 | P-TK-99 | REASON CITED, NOT BUILT | — | Settings lane (not replayed). |
| C-TK-34…37 | P-TK-31…33 | L7 (not replayed here) | — | — |

## ZIGi / NOVA prompt rows (#1–#53)

| finding id | AL row | verdict | conditions replayed | evidence |
|---|---|---|---|---|
| #1–#53 (53 rows) | P-TK-31…37, P-TK-16 | L7 (not replayed here) | — | Owned by lane L7. |

## Professor rows owned by L1

| finding id | AL row | verdict | conditions replayed | evidence |
|---|---|---|---|---|
| PR-016 | P-PR-01 | FIXED | Sc N (live) | BTC +5.08 % on Today, Markets, Wealth and Portfolio; NVDA −2.33 % on Markets and Wealth. Note: SOL "Price unavailable" on Markets vs "US$150.00 Showcase example price" on Portfolio. |
| PR-006 | P-PR-01 | FIXED | Sc | Portfolio 24h = Markets. "Unknown" result only where the cost is unknown (SOL), and it says so. |
| PR-077 | P-PR-01 | FIXED | Sc | Markets BTC/ETH identical across two loads 65 s apart (frozen Showcase). |
| PR-078 | P-PR-01 | FIXED | Sc, D | Markets = Portfolio 24h (Sc +5.08 %; fresh +4.36 % at 02:25/02:26). |
| X3-03 | P-PR-01 | STILL OPEN | D (live) | = TK-029. (In Sc the analysis says "The Showcase’s fixture prices, not market data".) |
| PR-001, PR-048, PR-081 | P-PR-02 | STILL OPEN | Sc N | "2 of 2 market prices current" beside "1 need attention: 1 price older than 15 minutes". |
| X3-04, X3-09 | P-PR-05 | FIXED | D (live) | Charts differ per coin; prices formatted and labelled. |
| X3-08 | P-PR-05 | L7 (not replayed here) | — | NOVA price answer. |
| PR-053 | P-PR-28 | STILL OPEN | D, Sc | Assets: Archive → Unarchive only, no delete for good (the archived value now reads "Archived · not counted"). |
| PR-051, PR-067 | P-PR-55 | FIXED | Sc 1280 | No overlapping controls in the Custom form (bot width unknown). |
| PR-068 | P-PR-59 | STILL OPEN | Sc | Add account defaults to EUR while the headline is USD. |
| PR-084 | P-PR-65 | STILL OPEN | Sc | Find a market "doge": icons "DOG", "@DO" (symbols cut). |
| PR-007 | P-PR-72 | CHANGED | Sc | The per-unit reference price is shown beside the manual value; qty × price is not (30 AAPL × US$350.39 ≠ US$7,500.00, no note). |
| PR-049 | P-PR-73 | STILL OPEN | Sc | Manual "Collectible camera" page still says "The CoinGecko reference price and provider chart below are real public market evidence"; "1 item" vs "1 CUSTOM". |
| X3-01 | P-PR-74 | FIXED | D | = TK-003 ("1500,75" → 1,500.75 on the account form). |
| X3-02, X3-05 | P-PR-75 | FIXED | D | = TK-007, TK-039. |

## STILL OPEN / CHANGED — exact steps for the lane

Common setup: Chrome, 1280×800 Dark, a fresh context (Settings → clear site data), en-GB, unless stated. "Live" means real CoinGecko answers reach the market routes.

1. **TK-026 / C-TK-19 / TK-028 / TK-113 / W8: Portfolio coin page crashes (regression).** Steps:
   - Portfolio → New portfolio → Buy 0.5 BTC at 60,000 → open `/app/portfolio/coin/bitcoin`, with live history.
   - Result: "This page could not be shown…" and a ZodError in the console.
   - Cause: `portfolio-coin-view.tsx` passes `costLine`, and `price-chart.tsx` writes its key with `formatHistoryPrice({at:'',value,decimals})`. `historyPointSchema` requires an ISO `at`, so it throws. Offline (no history) the page is fine.
2. **TK-224 / TK-210 / W18–W19 (spec WE10 fails): sideways scroll at 375 with crypto modules on.**
   - Steps: 375×812, Earn/crypto chosen (or the Showcase), open any page.
   - Result: the PUBLIC ALPHA banner's strong line "PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN" does not wrap and "More" sits at x 468, so the page scrolls 93 px sideways.
3. **TK-041 / W7: cash past the cap.** Steps: Add asset → Cash → 999999999999999999 → Save.
   - First comes "US$1,000,000,000,000,000,000.00 is more than a billion… Keep this amount" (a rounded figure, for an impossible amount).
   - Keep → "Enter an amount up to a trillion." appears below Save, the field is not aria-invalid and has no describedby.
4. **TK-024 / P8: Save moves.** Steps: Portfolio, holding 0.5 BTC → Type Sell → quantity 10 (or empty) → Save. Save moves down 87 px (60 px for empty), and the page scrolls 234 px to the field. The message itself is now correct.
5. **TK-027:** Coin page (offline) → Edit a transaction. Save is a 180×116 block beside Type. FIFO/LIFO label text is 30 px below its radio and starts left of it.
6. **TK-029 / X3-03:** After a buy and a sell, Portfolio → Analysis. The headline "US$32,155.19 · 02:30" sits next to Value "US$32,148.80" with no "as of" explanation (live).
7. **TK-036:** Calculator → Years 10100. The results are replaced by "Correct the marked field…". The cited TR14 is not an AL_SCOPE F/O decision.
8. **TK-162:** Markets → Table → 375. The Price, 24h and star columns are off-screen, with no fade or hint.
9. **TK-215 / M11 / C-TK-22:** Coin page ranges: no 1Y.
10. **TK-190:** Wealth → archive a debt → Archived (1) still says "Restore" (assets say "Unarchive").
11. **TK-199:** A custom asset in GBP shows "500.00 GBP" (code suffix).
12. **TK-191:** Every load warns "Permissions-Policy … Unrecognized feature: 'bluetooth'".
13. **TK-6B-09:** Light: the "Hide amounts" border is rgba(111,220,255,0.22) on a near-white page (< 3:1).
14. **TK-142:** Goals → New → Save an amount, target 10000 → the preview says "10000 USD".
15. **TK-148 / N-TK-21:** Showcase Today with active goals: "Make Today yours" is still above the data.
16. **N-TK-19 / N-TK-22 / C-TK-25:** Fresh Today strip: "Today tracked wealth US$…", with no "as of" on the chip. The Wealth card time (02:07) and Markets "Observed 02:04" differ for one quote.
17. **TK-037:** Today shows the debts now, but items 15 and 16 remain.
18. **TK-181:** Showcase → Gold → Edit asset quantity 10 → 2 → Save. The edit is saved with no ask; only a static line warns about it.
19. **TK-196:** Showcase → USD Coin → Archive (it releases Emergency fund 4,000). Emergency fund shows no review flag and no note.
20. **TK-226:** Today's notice "A saved allocation exceeds its current source balance…" has no dismiss.
21. **TK-184:** Settings at 768: the sticky section row is 134 px tall.
22. **TK-009:** Import a row with quantity −5; the reason reads "the quantity is not a number".
23. **TK-010:** Import class "ETF" → Stocks (only a note), though Wealth has an ETFs class.
24. **TK-127:** 15-digit net-worth figures are written in full.
25. **N-TK-16:** Add asset → Stocks → "AAPL". The real Apple stock is shown, and so is "AAPL (Apple (Backpack Securities)) is listed under Crypto. Choose the Crypto tab above".
26. **TK-119 (note, FIXED):** The limit message shows twice (alert + toast).
27. **W24:** Combines items 18 and 19.
28. **PR-001 / PR-048 / PR-081:** Showcase → Wealth shows "2 of 2 market prices current" beside "1 need attention: 1 price older than 15 minutes".
29. **PR-053:** An archived asset can only be unarchived, never deleted.
30. **PR-068:** The Showcase (USD headline) → Add an account or debt → Currency defaults to EUR.
31. **PR-084:** Find a market "doge" shows the symbols "DOG" and "@DO".
32. **PR-007:** Showcase AAPL: 30 × US$350.39 reference against a US$7,500 manual value, with no gap stated.
33. **PR-049:** The Showcase "Collectible camera" page has the CoinGecko/provider-chart banner and "1 item" vs "1 CUSTOM".
