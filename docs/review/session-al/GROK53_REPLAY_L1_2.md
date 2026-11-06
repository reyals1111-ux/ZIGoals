# Grok #53 replay — lane L1 (Wealth, Portfolio, Markets, Add money, Calculator), round 2

- **Commit served:** `54e32039` (production build from /home/user/zig-branch2, `PUBLIC_ALPHA_UNDEPLOYED`) on http://127.0.0.1:3103.
- **Date:** 5 Nov 2026, about 08:30–12:40 Brussels.
- **Replayed by:** a fresh replay agent (no fixes made, no app code changed, no git writes). Round 1 is `GROK53_REPLAY_L1_1.md` (on 5848c55c); its verdict is in the column "round 1 verdict". The lane's answers to round 1 are `lanes/L1.md`, "Fourth pass", read only to know what claims Fixed.
- **Scope:** every id of round 1 (Tokyo `tokyo.md` / `tokyo-recheck-list.md`, the Professor rows L1 owns, the prompt rows), **plus** every other id in the L1 rows of `GROK53_LEDGER.md` expanded through `ledger/*.md` (Denver D-/DV-/BUG-/C-DVG-, Moscow MO-/N-MO-, Nairobi NB-, Berlin BN-, Lisbon LS-/L-, Professor C-X3-, old N-/G-/Z- ids). Round 1 had not replayed those; they are in their own tables below.
- **Browser:** Google Chrome for Testing 153 (channel `chrome`), headless, Playwright 1.63, `locale: en-GB` (en-US for NB-017), `timezoneId: Europe/Brussels`. Every run went through `flock -o /tmp/claude-0/zig-browser.lock timeout 600 …`, one browser, one worker. Scripts, logs and 1 screenshot (tk026-coin.png) are in `/tmp/claude-0/replay-L1-2/` (not committed).
- **Clock.** The bots ran on 4 Nov 2026 01:00–05:50. Live prices cannot be moved back to 4 Nov (a quote "from the future" is not what a person sees), so live runs used the real clock of 5 Nov; Playwright's clock was installed and moved forward where time matters (the 15-minute rule, the import banner after 25 h, a 1-minute tick under a half-filled form). No L1 row depends on the time of day.
- **Conditions used** (codes in the tables):
  - **D** = desktop 1280×800, Dark, a fresh empty context (Welcome marked seen, crypto modules not chosen). **D+c** = the same with the crypto modules chosen.
  - **N** = Nebula, **L** = Light; **375 / 388 / 731 / 768 / 835 / 1920** = viewport width.
  - **Sc** = Settings → Load Showcase Demo (crypto modules on).
- **Live prices.** The server cannot reach CoinGecko itself in this sandbox, so the browser's `/api/market-{quotes,history,insights,detail,assets}` calls were routed to a local process that runs this commit's own route handlers in their "direct" mode against real public CoinGecko (cached 2 min for prices, 30 min for history and catalog). Real prices and charts; but two loads within 2 minutes see the same quote, so live drift between loads (D-200, D-262, TK-225, TK-6B-06) cannot be reproduced.
- **Lane specs as evidence** (`tests/grok53/wealth`, `markets`, `portfolio`; desktop project, 1 worker, :3103): **41 passed, 6 failed, 1 skipped**. Failed: `l1-pass4-portfolio` "TK-024" (Save moved 99 px — a real defect, see TK-024), `l1-pass4-wealth` "TK-196" (no review note — real, see TK-196), "TK-190" and "PR-053" (the spec's own selectors; the screens work, see those rows), "TK-224" (the spec flags clipped SVG groups; no sideways scroll), `sweep3-count-tally` "DV-057b/DV-147" (a books goal still shows "Needs valuation" on its goal page; Goals lane, not an L1 id). The specs run with an offline API, so they do not replay the bots' live conditions; the verdicts below come from the replays.


## Totals (counted per finding id; grouped rows expanded)

| verdict | ids |
|---|---|
| FIXED | 284 |
| HOLDS (positive / keep-list still works) | 60 |
| STILL OPEN | 7 |
| CHANGED | 7 |
| OWNER DECISION | 11 |
| NOT POSSIBLE | 17 |
| REASON CITED, NOT BUILT | 7 |
| NOT REPLAYED | 42 |
| OUT OF SCOPE | 20 |
| L7 (not replayed here) | 112 |
| see other row (screenshot-only and duplicate ids that follow their parent row) | 18 |
| **total ids** | **585** |

## Findings (TK-001…TK-226, TK-6B-01…10)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-001 | keep | HOLDS | HOLDS | D+c live | "BTC": Bitcoin first, Wrapped Bitcoin second, look-alikes "Unverified". 0,5 BTC + 2.25 ETH: hero US$45,540.72 = US$40,108.71 + US$5,432.01. |
| TK-002 | P-TK-05 | FIXED | FIXED | D live | "ETH": Ethereum, Ethereum Classic, Rocket Pool ETH, Lido Staked Ether, then bridged ETH flagged Unverified; no Tether in the top 10. |
| TK-003 | P-TK-06 | FIXED | FIXED | D | Update balance focused on open; "1500,75" → Net worth · EUR €1,500.75. |
| TK-004 | (shot of TK-001/006/007) | FIXED | FIXED | — | Screenshot-only; follows TK-001/006/007. |
| TK-005 | P-TK-07 | FIXED | FIXED | D | Typed at 5 ms/key: "Savings Test added." then "Savings Test 2 saved.". |
| TK-006 | keep | HOLDS | HOLDS | D | €1,500.75 − €12,000.50 → Net worth · EUR −€10,499.75, exact. |
| TK-007 | P-TK-08 | FIXED | FIXED | D | Hero: "Net worth after debts −€10,499.75 … Your debts are larger than what you own in EUR … The total above counts holdings only." |
| TK-008 | keep | HOLDS | HOLDS | D | 15 rows × 7 columns auto-mapped; "Not imported (no field for it)" for Account. |
| TK-009 | P-TK-10 | CHANGED | FIXED | D | Row 10 (−5) now "the quantity is negative; enter what you hold, above zero"; every refused row has its number and reason, open without a click. |
| TK-010 | P-TK-10 | CHANGED | FIXED | D | VOO (class ETF) lands as "VOO · ETFs" and under the ETFs chip; export keeps "Class in your file: ETF (shown under ETFs)". |
| TK-011 | P-TK-10 | FIXED | FIXED | D | "Row 13: the same as row 1 … left out to avoid counting it twice." |
| TK-012 | keep | HOLDS | HOLDS | D | After import: €291,700.50 + US$18,260.40, "no exchange rate is assumed". |
| TK-013 | P-TK-10 | FIXED | FIXED | D | "50 grams of Silver", "Gold bar 100g ×2 → 200 grams of Gold", reference "Not linked · Added by hand…". |
| TK-014 | P-TK-11 | FIXED | FIXED | D | Add (Custom) and Edit asset with "XYZ": aria-invalid + "“XYZ” is not a currency code ZIGoals knows." |
| TK-015 | P-TK-07 | FIXED | FIXED | D | Edit value "1234,56" → US$1,234.56; toast names the new name ("Silver coins old saved."). |
| TK-016 | keep | HOLDS | HOLDS | D | Reload keeps the assets; banner "Saved in this browser only". |
| TK-017 | keep | HOLDS | HOLDS | D clock | Refresh prices → "Prices updated at 10:06." (with the clock moved +17 min the refreshed quote still reads older than 15 min: harness clock, not app). |
| TK-018 | P-TK-13 | FIXED | FIXED | D | Export everything ZIP has wealth-holdings.csv (Name, Asset, Quantity, Kind of asset, Value, Currency, Notes); re-import 9 ready, 0 refused. |
| TK-019 | P-TK-10 (INT) | NOT REPLAYED | FIXED | D | "No file yet? Download a template" downloads a CSV whose header is the importer's own: Name, Symbol, Quantity, Kind of asset, Value, Currency, Notes, plus a fictional example row. |
| TK-020 | keep | HOLDS | HOLDS | D+c live | 0,5 BTC @60,000 + fee 10 → cost basis US$30,010.00, avg US$60,020.00, value = 0.5 × US$80,547.60. |
| TK-021 | P-TK-15 | FIXED | FIXED | D+c | No "Portfolio is off" banner; "It stays apart from your Wealth and Goals." |
| TK-022 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: harness lag (fast typing kept every character). |
| TK-023 | keep | HOLDS | HOLDS | D+c live | Sell 0.1 @70,000 fee 5 → "Realized +US$993.00 · unrealized …". |
| TK-024 | P-TK-18 | STILL OPEN | STILL OPEN | D+c live | Oversell: message under Quantity, field aria-invalid + focused + in view (good), but Save moves down 101 px in the window (page +87 px); empty quantity: Save moves 60 px. Lane spec l1-pass4-portfolio "TK-024" fails the same way (99 px). |
| TK-025 | keep | NOT REPLAYED | HOLDS | D+c | Edit and Remove on each transaction; Remove gives a toast with Undo. |
| TK-026 | keep | STILL OPEN (regression) | FIXED | D+c live | `/app/portfolio/coin/bitcoin` with real history renders: chart, "Dashed line: your average cost in this portfolio, US$60,020.00.", lots; no crash, no page errors. |
| TK-027 | P-TK-21 | STILL OPEN | FIXED | D+c live | Edit form: Save 180×46 under Type; FIFO/LIFO/HIFO labels 44 px tall, text right of the dot on its line. |
| TK-028 | P-TK-03 | CHANGED | FIXED | D+c live | Portfolio coin page quote "US$80,544.37 5 Nov 2026, 09:25 · last chart observation"; no raw floats. |
| TK-029 | P-TK-02 | STILL OPEN | FIXED | D+c live | Analysis "US$32,217.75 as of 5 Nov 2026, 09:26 … The chart reads dated prices, so it can differ a little from Value above, which uses the latest quote." (Value US$32,219.04). |
| TK-030 | P-TK-22 | FIXED | FIXED | D+c | Tabs Coins · Analysis · Transactions. |
| TK-031, TK-032 | (M7/M4 shots) | FIXED | FIXED | — | Screenshot-only; see M4, M7. |
| TK-033 | P-TK-04 | FIXED | FIXED | D live | BTC, SOL, ETH charts differ (different path data); formatted; "Change over this chart (Max/1Y), not the 24h change"; ranges 24H/7D/30D/90D/1Y/Max; view kept after Back. |
| TK-034 | P-TK-23 | FIXED | FIXED | D+c | Choosing Bitcoin focuses "2 Which network?"; step 3 "Link one here…" and "No wallet yet? You can still record what you own by hand on Wealth." |
| TK-035 | keep | HOLDS | HOLDS | D/L | Defaults US$84,919.37 / US$49,000.00; 100/mo 10 y → US$17,175.24 / US$13,000.00; every assumption written. |
| TK-036 | P-TK-24 | STILL OPEN | CHANGED | D/L | Typing "10100" now stops at "10" (maxlength 2) — the slip is gone. A wrong value (61) still replaces the whole result with "Correct the marked field to see the estimate." instead of keeping the last result dimmed (the bot's ask); the lane cites a pinned assertion (TR14), which is not an AL_SCOPE F/O decision. |
| TK-037 | P-TK-08 | CHANGED | FIXED | D live | Today: "Known tracked wealth · holdings, before debts · currencies kept separate … Market prices as of 09:49 · Net worth after debts −€199,899.50 · Your debts are larger…". |
| TK-038 | P-TK-27 | FIXED | FIXED | D | No duplicate sentence; "USD: one value recorded so far. Come back on another day…" per currency. |
| TK-039 | P-TK-08 | FIXED | FIXED | D | €999,999,999,999.99 debt asks "more than a billion — Keep this amount"; hero "Net worth after debts −€1tn" + plain warning. |
| TK-040 | P-TK-28 | FIXED | FIXED | D live | Manual AAPL/VOO/metals: "Reference price … Not linked · Added by hand, so no market price is followed. To follow…, add it again from its tab". Live AAPL card "Tokenized reference price per AAPL US$351.13 Current". |
| TK-041 | P-TK-18 | STILL OPEN | FIXED | D | 999999999999999999 → "Enter an amount up to a trillion." under the field (y 450, above Save y 831), field aria-invalid, described by the message, focused; no rounded "more than a billion" check. |
| TK-042 | keep | HOLDS | HOLDS | D | US$9,999,999,999.99: check asked, Keep → "USD Cash added to your wealth.", hero readable, no sideways scroll. |
| TK-043 | keep | HOLDS | HOLDS | D | 3 of 50 favourites and Table view survive F5. |
| TK-044 | P-TK-25 | FIXED | FIXED | D live | Sampled every 0.5 s from first paint: "Not provided" never shown in the crypto rows; values after load. (Stocks/metals rows show "Not provided in 1 hour/7 days" by design: no provider figure.) |
| TK-045 | keep | HOLDS | HOLDS | D | "zzzz" → "No matching markets · No matches in this view · Try another name or browse the full CoinGecko catalog." |
| TK-046 | P-TK-15 | FIXED | FIXED | D | No "Markets is off" banner; one list now holds up to 50 favourites (C-TK-20). |
| TK-047 | P-TK-30 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: harness profile. |
| TK-048…TK-055 | P-TK-31…37 | L7 (not replayed here) | L7 (not replayed here) | — | ZIGi prompts (lane L7). |
| TK-056 | P-TK-01 | FIXED | FIXED | 375/768 L/D fresh | No floating launcher over content on Wealth, Portfolio, Markets, coin page, Add money, calculator, Today; "Apps & extras" present (O3). Only the intro logo (logo-intro-phone) is fixed on Wealth at 375 during its intro. |
| TK-057 | P-TK-38 | FIXED | FIXED | L | Light calculator strokes rgb(31,59,115) / rgb(0,120,138) / rgb(154,84,0) on white. |
| TK-058, 059, 064–068 | (TK-056/057 shots) | FIXED | FIXED | — | Screenshot-only; see TK-056/057. |
| TK-060 | P-TK-01 (verify) | L7 (not replayed here) | L7 (not replayed here) | — | ZIGi panel. |
| TK-069 | keep | NOT REPLAYED | NOT REPLAYED | — | More-menu theme switch not exercised (themes set via the theme record). |
| TK-070…TK-084 | P-TK-31…41 | L7 (not replayed here) | L7 (not replayed here) | — | NOVA rows. |
| TK-075 | keep | HOLDS | HOLDS | D+c 835 | Add money column 108–815 px of 835. |
| TK-076 | (TK-075 shot) | HOLDS | HOLDS | — | Screenshot-only. |
| TK-085 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: harness lag. |
| TK-086 | keep | HOLDS | HOLDS | D | Markets desktop Dark renders; no page errors. |
| TK-087, 088, 089 | keep | HOLDS | HOLDS | 375 L/D fresh | scrollWidth 375 on all 7 L1 pages. |
| TK-090 | P-TK-42 | NOT REPLAYED | NOT REPLAYED | — | Transient count-up overlap; see DV-259/268a for the sampled frames. |
| TK-091 | P-TK-01 | FIXED | FIXED | 375 | No mascot at 375 (O3). |
| TK-092 | P-TK-32 | L7 (not replayed here) | L7 (not replayed here) | — | — |
| TK-093…TK-110 | (6B shots) | see TK-6B-01…10 | see TK-6B-01…10 | — | Screenshot-only. |
| TK-111 | P-TK-38 | FIXED | FIXED | L 1280 | "10k" pill fill rgb(255,243,209), text rgb(90,56,0). |
| TK-112 | keep | HOLDS | HOLDS | L 1280 | Add money renders, no sideways scroll. |
| TK-113 | P-TK-43 | CHANGED | FIXED | L 1280 Sc | Markets/Portfolio hero blocks end at 1196 = card edge; the Portfolio BTC coin page renders (no crash). |
| TK-114, TK-115 | P-TK-43 | FIXED | FIXED | L 1280 Sc | Hero right edge 1196 = cards. |
| TK-116 | P-TK-44 | FIXED | FIXED | L 1280/768/375 Sc | "+ €8,000.00 held in EUR" chip right 1142/637/231 inside card 1196/748/359. |
| TK-117 | P-TK-19 | FIXED | FIXED | D live | Starring the 4th row keeps the order; remove → "USD Coin removed from your favourites. Undo". |
| TK-118 | P-TK-19 | FIXED | FIXED | D live | Changed by design: the 9th star is accepted, "Silver added to your favourites. Favourites past 8 are kept on this device only." (limit now 50). |
| TK-119 | P-TK-19 | FIXED | FIXED | D live | No limit message at 8 any more (limit 50), so no "Error:" and no double message. |
| TK-120 | P-TK-03 | FIXED | FIXED | D live | SOL header US$96.49 observed 10:13; chart "US$96.42 · last chart observation". |
| TK-121 | P-TK-28 | FIXED | FIXED | D | Manual AAPL says why and how; "Gold bar 100g" ×2 → 200 grams. |
| TK-122 | P-TK-45 | FIXED | FIXED | D+c | /app/calculator → /app/wealth/calculator. |
| TK-123 | P-TK-07 | FIXED | FIXED | D clock | Half-filled Mortgage form kept "House mortgage" through Refresh prices and a 1-minute tick. |
| TK-124, 125, 128, 131 | keep | HOLDS | HOLDS | D | Mortgage 200,000 + Visa 1,200 + loan: debts €202,400, net worth exact. |
| TK-126 | P-TK-06 | FIXED | FIXED | D | "Rainy" → "Enter a non-negative decimal amount." at the field (aria-invalid); inputmode=decimal. |
| TK-127 | P-TK-11 | CHANGED | FIXED | D | Hero now reads "−€1tn" with the exact −€1,000,000,010,498.24 beside it for screen readers; the net-worth card keeps the exact figure. |
| TK-129, TK-138 | P-TK-46 | FIXED | FIXED | D | Edit account / Edit debt: Name focused. |
| TK-132 | P-TK-08 | FIXED | FIXED | D | "Net worth after debts" under the holdings headline. |
| TK-133 | P-TK-47 | FIXED | FIXED | D | Property: "Owe something on it, such as a mortgage? Add the debt under Accounts, debts & net worth…". |
| TK-134 | P-TK-48 | FIXED | FIXED | D live | "Shares you hold … not your broker’s quote, and ZIGoals does not connect to your broker." |
| TK-135 | P-TK-09 | OWNER DECISION | OWNER DECISION | — | Agreed: F (Alpha USD/EUR, no invented FX). |
| TK-136 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: foreign window focus. |
| TK-137 | keep | HOLDS | HOLDS | D | "Test Loan archived; its history is kept. Undo"; totals update; Undo restores. |
| TK-139 | P-TK-07 | FIXED | FIXED | D clock | As TK-123. |
| TK-140 | keep | HOLDS | HOLDS | D | "1,5" saved, "−50" refused at the field, "0" saved, 999,999,999,999 asks once. |
| TK-141, 143, 145, 178, 193 | keep | NOT REPLAYED | NOT REPLAYED | — | Goals wizard positives (Goals lane L4); see S9 rows for the wizard parts replayed. |
| TK-142 | P-TK-50 | STILL OPEN | FIXED | N 1920 fresh | Wizard "Save an amount", target 10000 → side preview "US$10,000.00" and review "Target US$10,000.00". |
| TK-144, 146, 174, 175, 176, 177, 179, 194 | P-TK-50/51/52/59, P-TK-18, P-TK-49 | NOT REPLAYED | NOT REPLAYED | Sc N | On the Showcase goal page my script found no "Edit Goal details" button to press (the panel is a "Manage ＋" fold); Goals lane rows (L4/L10b). |
| TK-147 | keep | HOLDS | HOLDS | D live | Today "Known tracked wealth … US$0.00 · Market prices as of 09:49" = Wealth hero. |
| TK-148 | P-TK-26 | STILL OPEN | FIXED | Sc N | Showcase Today with active goals: "Make Today yours" now comes after the data (text offset 7486 vs "Known tracked wealth" at 1256). |
| TK-149 | P-TK-53 | NOT REPLAYED | STILL OPEN | D | A real paste (clipboard + Ctrl+V) of 229 characters into Asset name keeps 100 and shows **no** message (checked at 50 ms, 300 ms, 1.2 s). A bare synthetic paste event does show "Names keep 100 characters, so the end of what you pasted was left out (129 characters)…" — so the message exists but is wiped by the input that a real paste fires right after. |
| TK-150 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: lag mis-entry. |
| TK-151 | P-TK-15 | FIXED | FIXED | D+c | Fresh profile: New portfolio; Type list Buy/Sell/Transfer in/out/Staking reward/Income/Airdrop. |
| TK-152 | P-TK-14 | FIXED | FIXED | D | Settings: "…accounts and debts are in Export everything and in Settings → Keep a protected copy." |
| TK-153 | keep | HOLDS | HOLDS | D | Star/unstar/reload consistent (3 of 50 before and after). |
| TK-154 | P-TK-15 | FIXED | FIXED | D | No banner. |
| TK-155 | P-TK-03 | FIXED | FIXED | D live | Chart prices formatted; no raw floats on coin pages. |
| TK-156 | P-TK-04 | FIXED | FIXED | D live | "Loading observed prices" while loading; full chart after. |
| TK-157 | keep | HOLDS | HOLDS | D live | SOL US$96.49 on Markets = coin header. |
| TK-158 | keep | HOLDS | HOLDS | D+c | USDC → "Base is recommended…" (Ramp fee line needs the on-ramp API, not reachable here). |
| TK-159 | P-TK-24 | FIXED | FIXED | D+c | 26 digits → "That is more than this calculator models. Enter an amount below 10 trillion…". |
| TK-160 | keep | HOLDS | HOLDS | D | Archive confirm, "Rain archived. Undo", Undo restores, re-archive stays after reload. |
| TK-161 | P-TK-01 | FIXED | FIXED | 375 | No floater (O3). |
| TK-162 | P-TK-55 | STILL OPEN | FIXED | D 375 | Table at 375: Price (right 232), 24h (302), star (358) on screen; the rest scrolls inside the table with "More columns to the right: swipe the table sideways."; page scrollWidth 375. |
| TK-163 | keep | HOLDS | HOLDS | 375 fresh | scrollWidth 375. |
| TK-164 | P-TK-39 | FIXED | FIXED | L 1280 Sc | Total solid ink (no gradient clip). |
| TK-165 | P-TK-56 | FIXED | FIXED | Sc N | Evening wrap-up checkbox 12 px from its label. |
| TK-166 | P-TK-54 | FIXED | FIXED | D | Archived asset page: "Holding value Archived · not counted … Unarchive Rain · Delete for good…". |
| TK-167, 168, 169 | P-TK-01 | FIXED | FIXED | 375/768 L/D | No floaters below 901 px. |
| TK-170 | P-TK-55 | FIXED | FIXED | D live | No "−0 %" (USDC "0% in 1 hour"). |
| TK-171 | P-TK-15 | FIXED | FIXED | D | No banner on load. |
| TK-172 | P-TK-57 | FIXED | FIXED | D 768 | Chart plot 600 px in a 640 px card. |
| TK-173 | keep | HOLDS | HOLDS | 375 fresh | Single column; scrollWidth 375. |
| TK-180 | keep | HOLDS | HOLDS | Sc N | Gold 10 → 2: the asset page explains the over-allocation; goal NEEDS REVIEW. |
| TK-181 | P-TK-60 (Goals) | STILL OPEN | FIXED | Sc N | Gold 10 → 2 → Save asks once: "2 GOLD is less than the 5 GOLD your Goals have allocated: 3 GOLD over-allocated. Those Goals (First home deposit) would count their share… Keep this amount". |
| TK-182 | P-TK-54 | FIXED | FIXED | D | Debt Edit: Save + Archive; archived debt then offers Unarchive / Remove. |
| TK-183 | P-TK-61 | NOT REPLAYED | NOT REPLAYED | Sc | The Appearance caption was not matched by my script on Settings (Light chosen); no verdict. |
| TK-184 | P-TK-56 | STILL OPEN | CHANGED | L 768 Sc | Settings sticky section row now 74 px tall (bot ~110, round 1 134); the lane claims one 44 px row. Smaller, but still a two-line-high band; the oversized checkbox part was not measured. |
| TK-185 | keep | HOLDS | HOLDS | 768 L fresh | scrollWidth 768 on all pages. |
| TK-186 | keep | HOLDS | HOLDS | D | Net worth exact after archive (€2,500.50) and Undo (€1,300.50). |
| TK-187 | P-TK-60 | FIXED | FIXED | Sc N | "First home deposit 2 GOLD allocated (5 GOLD saved; this asset now holds less, so the Goal counts its share… needs a review)"; "over-allocated: review these Goals". |
| TK-188 | keep | HOLDS | HOLDS | Sc N | First home deposit NEEDS REVIEW after the cut. |
| TK-189 | keep | HOLDS | HOLDS | D | Unarchive Visa → debts €202,400 again at once. |
| TK-190 | P-TK-54 | STILL OPEN | FIXED | D | Archived debt now offers "Unarchive" and "Remove" (no "Restore"). (The lane spec "TK-190" times out on its own selector — it looks for an Archive button in the list row; the button is in Edit.) |
| TK-191 | P-TK-63 | STILL OPEN | STILL OPEN | D | Every load still logs "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'." The lane calls it not possible (pinned deny for Web Bluetooth); that is not an F/O decision, so not agreed here (INT may decide). |
| TK-192 | keep | HOLDS | HOLDS | D | Same maths path as TK-001. |
| TK-195 | keep | HOLDS | HOLDS | Sc N | "These allocations will be released: Emergency fund: 4,000 USDC"; toast "USD Coin archived. Restore it any time from Archived assets…". |
| TK-196 | P-TK-60 (Goals) | STILL OPEN | STILL OPEN | Sc N | After "Release allocations & archive" on USD Coin, Goals shows "Emergency fund SAVINGS GOAL BEHIND … US$5,000.00 / US$20,000.00 … Existing wealth · active", and the goal page has no "archived"/"released"/"review" sentence. The lane spec "TK-196" fails the same way. |
| TK-197, TK-198 | keep | HOLDS | HOLDS | D | GBP gets its own bucket ("Net worth · GBP 500.00 GBP"). |
| TK-199 | P-TK-11 | STILL OPEN | STILL OPEN | D | Still "500.00 GBP" while USD/EUR use symbols. The lane now claims owner decision F ("Alpha: English UI, USD/EUR") — F covers which currencies are supported, not how a third code is written; not agreed. |
| TK-200 | P-TK-06 | FIXED | FIXED | D | autocomplete=off + inputmode=decimal on balance, quantity and value. |
| TK-201 | keep | HOLDS | NOT REPLAYED | D live | First AAPL add from Stocks: "Tokenized reference price per AAPL US$351.13 Current" = Markets (US$351.01). The second add was not completed in this round (catalog search timed out), so the duplicate guard was not seen. |
| TK-202 | P-TK-03 | FIXED | FIXED | D live | Same chart component as TK-212. |
| TK-203 | P-TK-48 | NOT REPLAYED | NOT REPLAYED | — | Logos come from /api/market-logo, not routed to the live stub. |
| TK-204 | P-TK-66 | FIXED | FIXED | D | Price header → aria-sort=descending; rows reorder (Bitcoin, Gold, Ethereum, VOO…). |
| TK-205 | P-TK-67 | FIXED | FIXED | D | "Market data updated at 10:14." |
| TK-206 | keep | HOLDS | HOLDS | D | Find a market "btc": Bitcoin, Wrapped Bitcoin, then flagged look-alikes. |
| TK-207 | P-TK-15 | FIXED | FIXED | D | No banner. |
| TK-208 | P-TK-02 | FIXED | FIXED | D live | Wealth/Portfolio/Markets BTC all US$80,547.60 at the same minute (stub cache: no drift). |
| TK-209 | P-TK-68 | FIXED | FIXED | D | = TK-216. |
| TK-210 | P-TK-64 | STILL OPEN | FIXED | L 375 Sc | = TK-224. |
| TK-211 | keep | HOLDS | HOLDS | L 1280 | Readable. |
| TK-212 | P-TK-02 | FIXED | FIXED | D live | Header "US$80,335.45 · Price observed 10:13" vs chart "US$80,544.37 · 5 Nov 2026, 09:25 · last chart observation": each labelled with its own time. |
| TK-213 | P-TK-03 | FIXED | FIXED | D live | No raw floats on coin pages. |
| TK-214 | P-TK-15 | FIXED | FIXED | D | No banner. |
| TK-215 | P-TK-04 | STILL OPEN | FIXED | D live | Ranges 24H/7D/30D/90D/1Y/Max; 1Y pressed → "Change over this chart (1Y)". |
| TK-216 | P-TK-68 | FIXED | FIXED | D | Real file chooser: cancel, then choose → sheet stays open, Step 2 appears. |
| TK-217 | P-TK-15 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: state artefact. |
| TK-218 | keep | HOLDS | HOLDS | D | 1,000 / 0 / 5.29 % / 3 y → US$1,171.58. |
| TK-219 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: lag. |
| TK-220 | keep | NOT REPLAYED | NOT REPLAYED | — | Appearance selector not read. |
| TK-221, TK-223 | keep / P-TK-06 | NOT REPLAYED | NOT REPLAYED | Sc | The 7/30/365-day "Staking reward scenario" was not reachable from /app/staking in my run (no scenario button); Earn → Calculator now opens the compound calculator at the live rate. |
| TK-222 | P-TK-69 | FIXED | FIXED | D+c, Sc | Calculator: "adds interest… every month (compounding). The staking calculator on Earn shows a simple yearly rate…"; Earn: "simple yearly rate (APR)… rewards are not compounded". |
| TK-224 | P-TK-64 | STILL OPEN | FIXED | L 375 Sc, crypto on | Wealth, Portfolio, Markets, coin pages, Add money, calculator, Today: scrollWidth 375; the PUBLIC ALPHA line wraps (right 375). Only decorative SVG groups in the header art reach 379–392 px, clipped, no scroll. (The lane spec "TK-224" fails on those SVG groups, not on a scroll.) |
| TK-225 | keep | NOT REPLAYED | NOT REPLAYED | — | Needs live drift across reloads. |
| TK-226 | P-TK-60 | STILL OPEN | FIXED | Sc N | Today notice "A saved allocation exceeds its current source balance… Review saved sources → Dismiss"; Dismiss removes it. |
| TK-6B-01 | P-TK-01 | FIXED | FIXED | L 375 | No floating launcher; "Apps & extras". |
| TK-6B-02 | P-TK-01 | FIXED | FIXED | L/D 768 | As above. |
| TK-6B-03 | P-TK-15 | FIXED | FIXED | D | No "X is off" card. |
| TK-6B-04 | P-TK-55 | FIXED | FIXED | D 375 | Chip row scrolls (overflow-x auto) with an edge mask. |
| TK-6B-05 | P-TK-65 | FIXED | FIXED | L 375 | The phone banner keeps "Saved in this browser only" (the short form the bot asked for). |
| TK-6B-06 | P-TK-02 | NOT REPLAYED | NOT REPLAYED | — | Needs live drift between two loads (stub caches 2 min). The lane's "Not possible" cites no F/O decision; not confirmed. |
| TK-6B-07 | P-TK-39 | FIXED | FIXED | L 1280/768/375 Sc | Total solid ink rgb(13,15,21), background-clip border-box. |
| TK-6B-08 | P-TK-44 | FIXED | FIXED | L 1280/768/375 Sc | h1 text-wrap: balance. |
| TK-6B-09 | P-TK-40 | STILL OPEN | FIXED | L 1280/768/375 Sc | "Hide amounts" border rgb(113,125,148): 3.88:1 against the page (lane spec passes too). |
| TK-6B-10 | P-TK-70 | FIXED | FIXED | D/L | One disclaimer under the result ("An estimate; returns are not guaranteed."); the "More planning tools" footer has its own line. |

## Old ids re-checked (recheck list, pass-1 lines, in-run)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| W1 | P-TK-08 | FIXED | FIXED | D | Net worth after debts under the headline; labels plain; FX = owner decision. |
| W2 | P-TK-27 | FIXED | FIXED | D | = TK-038. |
| W3 | keep | HOLDS | HOLDS | D | "Manual value" badge. |
| W4 | keep | HOLDS | HOLDS | D | Trillion cap; huge totals readable ("−€1tn"). |
| W5 | P-TK-11 | FIXED | FIXED | D | = TK-014. |
| W6 | P-TK-49 | FIXED | FIXED | D | "more than a billion… Keep this amount" on balances and debts. |
| W7 | P-TK-18 | STILL OPEN | FIXED | D | = TK-041: message under the field, above Save, field marked and described. |
| W8 | P-TK-03 | CHANGED | FIXED | D live | Formatted on Wealth, Markets and Portfolio coin pages; the Portfolio coin page no longer crashes. |
| W9 | P-TK-12 | FIXED | FIXED | D clock | With no reload, +16.5 min flips to "0 of 1 market price current … 1 need attention: 1 price older than 15 minutes". |
| W10 | P-TK-25 | FIXED | FIXED | D live | No "Not provided" flash; "Market prices as of 09:49" under the total. |
| W11 | P-TK-12 | FIXED | FIXED | D | Reason named ("Not linked · Added by hand…"). |
| W12 | P-TK-09 | OWNER DECISION | OWNER DECISION | D | Agreed (F). |
| W13 | P-TK-10 | FIXED | FIXED | D | = TK-009/TK-216. |
| W14, W16, W17, W21, W23 | — | OUT OF SCOPE | OUT OF SCOPE | — | The bot did not retest; no #53 defect. |
| W18, W19 | (WE10) | STILL OPEN (regression) | FIXED | L 375 Sc | = TK-224. |
| W20 | P-TK-01 | FIXED | FIXED | 375/768 | O3. |
| W22 | P-TK-28 | FIXED | FIXED | D | Says why and how. |
| W24 | P-TK-60 | CHANGED | CHANGED | Sc N | The ask at save (TK-181) and the asset page (TK-187) are fixed; an archive release still leaves the Goal with no flag (TK-196). |
| W25 | P-TK-23 | FIXED | FIXED | D+c | = TK-034. |
| W26 | P-TK-02 | FIXED | FIXED | D live | = TK-208. |
| C1 | P-TK-69 | FIXED | FIXED | D+c | = TK-222. |
| C2 | keep | HOLDS | HOLDS | D | US$13,000 put in. |
| C3 | keep | NOT REPLAYED | NOT REPLAYED | — | = TK-221. |
| G1, G3 | — | OUT OF SCOPE | OUT OF SCOPE | — | Not retested. |
| G2 | keep | OUT OF SCOPE | OUT OF SCOPE | — | N/A in the bot's list. |
| P1 | P-TK-02 | FIXED | FIXED | D, Sc | Portfolio BTC = Markets BTC (US$80,547.60 fresh; Showcase US$80,335.45 on every page). |
| P2 | keep | HOLDS | HOLDS | D live | ZIG US$0.04242. |
| P3 | keep | HOLDS | HOLDS | D | Realised + unrealised in the header. |
| P4, P9–P13 | — | OUT OF SCOPE | OUT OF SCOPE | — | Not retested. |
| P5 | P-TK-17 | FIXED | FIXED | D+c | Staking reward / Income / Airdrop in Type. |
| P6 | P-TK-18 | FIXED | FIXED | D+c | Oversell at Quantity, in view (the Save shift is P8). |
| P7 | P-TK-20 | FIXED | FIXED | D+c | Edit + Remove in each holdings row. |
| P8 | P-TK-18 | STILL OPEN | STILL OPEN | D+c | Save moves 101 px (oversell) / 60 px (empty) when the message appears (TK-024). |
| P14 | keep | HOLDS | HOLDS | 375 | No overflow. |
| P15 | P-TK-13 | FIXED | FIXED | D | TK-018/TK-152. |
| P16 | P-TK-25 | FIXED | FIXED | D | TK-044. |
| P17 | P-TK-01 | FIXED | FIXED | 768 | O3. |
| M1 | P-TK-05 | HOLDS | HOLDS | D | Bitcoin first. |
| M2 | P-TK-66 | FIXED | FIXED | D | TK-204. |
| M3 | keep | HOLDS | HOLDS | D | TK-045. |
| M4 | P-TK-19 | FIXED | FIXED | D | TK-118/119 (limit now 50). |
| M5, M8, M16 | — | OUT OF SCOPE | OUT OF SCOPE | — | Not retested. |
| M6 | P-TK-73 | FIXED | FIXED | D | Owned→Crypto kept after Back. |
| M7 | keep | HOLDS | HOLDS | D | Table persists. |
| M9 | P-TK-67 | FIXED | FIXED | D | TK-205. |
| M10 | P-TK-48 | NOT REPLAYED | NOT REPLAYED | — | Logos not routed; the metals copy step did not complete. |
| M11 | P-TK-04 | STILL OPEN | FIXED | D live | 1Y range present and works. |
| M12 | P-TK-02 | FIXED | FIXED | D live | TK-212. |
| M13, M14 | P-TK-03 | FIXED | FIXED | D live | Formatted; no −0 %. |
| M15 | P-TK-85 | FIXED | FIXED | D live | A "Price alert" region on the Wealth/Markets coin page and on the Portfolio coin page. |
| Z1–Z17, Z19–Z21 | P-TK-31…37 | L7 (not replayed here) | L7 (not replayed here) | — | ZIGi/NOVA. |
| Z18 | P-TK-01 | FIXED | FIXED | 375/768 | O3. |
| F1 | P-TK-77 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed (F). |
| F2 | keep | HOLDS | HOLDS | D+c | Kraken/Coinbase/Binance read-only connectors listed on Portfolio. |
| F3, F4, F6 | — | OUT OF SCOPE | OUT OF SCOPE | — | Not retested. |
| F5 | keep | HOLDS | HOLDS | D | TK-023. |
| F7 | P-TK-85 | FIXED | FIXED | D live | = M15. |
| F8 | keep | HOLDS | HOLDS | D+c | "Realised gains by year (CSV)". |
| F9 | P-TK-82 | OWNER DECISION | OWNER DECISION | — | Agreed (F). |
| F10 | keep | HOLDS | HOLDS | Sc | "Hide amounts" sets data-hide-amounts=on and blurs (7 px) the figures; the button becomes "Show amounts". |
| pass-1 "Net worth omitting BTC/ETH" | keep | HOLDS | HOLDS | D | TK-001. |
| pass-1 "'Current' badge on stale prices" | P-TK-12 | FIXED | FIXED | D clock | W9. |
| pass-1 "Refresh with no feedback" | P-TK-67 | FIXED | FIXED | D | Wealth and Markets both say "updated at". |
| pass-1 "Unformatted prices" | P-TK-03 | CHANGED | FIXED | D live | Formatted everywhere, Portfolio coin page included. |
| pass-1 "Fake currency XYZ" | P-TK-11 | FIXED | FIXED | D | TK-014. |
| pass-1 "Several totals on one page" | P-TK-08 | FIXED | FIXED | D | TK-007. |
| pass-1 "CSV Name/Symbol mapping" | P-TK-10 | CHANGED | FIXED | D | Mapping holds; ETF → ETFs (TK-010). |
| pass-1 "'Available for Goals' shrinking" | keep | HOLDS | HOLDS | D | TK-042. |
| pass-1 "No upper limit on values" | P-TK-49 | FIXED | FIXED | D | Cap + check; placement fixed (TK-041). |
| pass-1 "'Explain wealth change' 99 %" | P-TK-27 | FIXED | FIXED | D | TK-038. |
| in-run TK-121/TK-040 | P-TK-28 | FIXED | FIXED | D | — |
| in-run TK-129 | P-TK-46 | FIXED | FIXED | D | — |
| in-run TK-123 | P-TK-07 | FIXED | FIXED | D | — |
| in-run TK-209 | P-TK-68 | FIXED | FIXED | D | — |
| in-run TK-210 | P-TK-64 | STILL OPEN | FIXED | L 375 Sc | = TK-224. |

## Copy / UX notes (N-TK) and competitor rows (C-TK)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-TK-01 | P-TK-10 | FIXED | FIXED | D | "Not imported (no field for them)". |
| N-TK-02 | P-TK-09 | OWNER DECISION | OWNER DECISION | D | Agreed (F). |
| N-TK-03 | P-TK-12 | FIXED | FIXED | D clock | W9. |
| N-TK-04 | P-TK-17 | FIXED | FIXED | D+c | P5. |
| N-TK-05 | P-TK-20 | FIXED | FIXED | D+c | Edit + Remove in the row. |
| N-TK-06 | P-TK-29 | FIXED | FIXED | D | "Silver coins added to your wealth." |
| N-TK-07 | P-TK-19 | FIXED | FIXED | D | Remove toast with Undo. |
| N-TK-08, 09, 10 | P-TK-32/36/37 | L7 (not replayed here) | L7 (not replayed here) | — | — |
| N-TK-11 | P-TK-23 | FIXED | FIXED | D+c 835 | Column 108–815 px. |
| N-TK-12 | P-TK-49 | FIXED | FIXED | D | Check tier. |
| N-TK-13, N-TK-14, N-TK-17, N-TK-20 | P-TK-58/62/42/25 | NOT REPLAYED | NOT REPLAYED | — | Today grid, Goals hero art, the count-up (see DV-259) and the pop-in were not measured. |
| N-TK-15 | P-TK-63 | FIXED | FIXED | D | No console errors on Wealth/Markets/Today loads (only TK-191's warning). |
| N-TK-16 | P-TK-05 | CHANGED | FIXED | D live | Stocks + "AAPL": only "Apple · Stock"; the contradictory "listed under Crypto" line is gone. VOO found under ETFs; "Unverified · check the project…" not clipped. |
| N-TK-18 | P-TK-06 | NOT REPLAYED | NOT REPLAYED | — | See TK-221. |
| N-TK-19 | P-TK-02 | STILL OPEN | FIXED | D live | Today: "Known tracked wealth … US$0.00 Market prices as of 09:49". |
| N-TK-21 | P-TK-26 | STILL OPEN | FIXED | Sc N | = TK-148. |
| N-TK-22 | P-TK-08 | STILL OPEN | FIXED | D | Today strip now "Today · tracked wealth US$45,540.72" (a visible separator) and the card "Known tracked wealth · holdings, before debts". |
| N-TK-23 | P-TK-25 | FIXED | FIXED | D live | No "Not provided" flash in crypto rows. |
| N-TK-24 | P-TK-72 | FIXED | FIXED | D | "As listed (owned, favourites, then others)". |
| N-TK-25 | P-TK-23 | FIXED | FIXED | D+c | "…Plan on roughly 15 to 30 minutes in all once the ATOM arrives." |
| N-TK-26 | P-TK-70 | FIXED | FIXED | D+c | "Milestones: When the estimated balance would first pass 10,000, 100,000…". |
| N-TK-27 | P-TK-71 | FIXED | FIXED | D clock | "9 assets added to Wealth (imported 5 Nov 2026, 10:03). Undo import · Dismiss"; gone at +25 h. |
| N-TK-28 | P-TK-73 | FIXED | FIXED | D | M6. |
| N-TK-29 | P-TK-41 | NOT REPLAYED | NOT REPLAYED | — | Global single-key shortcuts (L10a) not exercised. |
| N-TK-30 | P-TK-16 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed: box load. |
| N-TK-31 | P-TK-15 | FIXED | FIXED | D | No "Portfolio is off". |
| C-TK-01 | P-TK-74 | OWNER DECISION | OWNER DECISION | — | Agreed (F). |
| C-TK-02 | P-TK-13 | FIXED | FIXED | D | CSV round-trips 9/9. |
| C-TK-03 | P-TK-10 | FIXED | FIXED | D | Per-row reasons, now all correct (TK-009). |
| C-TK-04 | P-TK-11 | FIXED | FIXED | D | ISO check in add/edit/import. |
| C-TK-05 | P-TK-10 | FIXED | FIXED | D | Duplicate row refused. |
| C-TK-06 | P-TK-75 | REASON CITED, NOT BUILT | FIXED | D+c live | Lots view FIFO / LIFO / HIFO on the coin page (stored lots: not built, additive limit cited). |
| C-TK-07 | P-TK-76 | REASON CITED, NOT BUILT | REASON CITED, NOT BUILT | — | AK R22 (not in F/O); "It stays apart from your Wealth and Goals" said on Portfolio. |
| C-TK-08 | P-TK-77 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed (F). |
| C-TK-09 | P-TK-78 | NOT REPLAYED | NOT REPLAYED | — | L6 watch addresses. |
| C-TK-10 | P-TK-79 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed (F: unknown is not zero); "Earlier performance is never invented." |
| C-TK-11 | P-TK-80 | REASON CITED, NOT BUILT | REASON CITED, NOT BUILT | — | AK R22. |
| C-TK-12 | P-TK-81 | FIXED | FIXED | D | "See where your USD holdings could grow →". |
| C-TK-13 | P-TK-82 | OWNER DECISION | OWNER DECISION | — | Agreed (F). |
| C-TK-14 | P-TK-83 | REASON CITED, NOT BUILT | FIXED | Sc | Built: "Count stablecoins as cash · this view only; totals and Goals unchanged". |
| C-TK-15 | P-TK-84 | FIXED | FIXED | D | "View-only · ZIGoals can’t move your money…". |
| C-TK-16 | P-TK-17 | FIXED | FIXED | D+c | Types present. |
| C-TK-17 | P-TK-85 | FIXED | FIXED | D live | = M15. |
| C-TK-18 | P-TK-86 | OWNER DECISION | FIXED | D+c live | Analysis now has time-weighted and money-weighted returns and Bitcoin over the same range (O2 still governs deeper analytics). |
| C-TK-19 | P-TK-87 | STILL OPEN (regression) | FIXED | D+c live | Cost line drawn ("Dashed line: your average cost… US$60,020.00") and the page no longer crashes. |
| C-TK-20 | P-TK-88 | STILL OPEN | FIXED | D live | Built: "0 of 50 Your favourites"; past 8 they are kept on this device ("Favourites past 8 are kept on this device only."). |
| C-TK-21 | P-TK-89 | FIXED | FIXED | D | Find a market = full catalogue. |
| C-TK-22 | P-TK-04 | STILL OPEN | FIXED | D live | 1Y range added and works. |
| C-TK-23 | P-TK-90 | FIXED | FIXED | D | Sort by 24h change. |
| C-TK-24 | P-TK-91 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed (F). |
| C-TK-25 | P-TK-02 | CHANGED | FIXED | D live | Wealth "Market prices as of hh:mm"; Markets cards "24h and 7-day figures observed 10:13"; coin page "Price observed 10:13"; Today "Market prices as of". Each figure names its own read. |
| C-TK-26 | P-TK-92 | NOT POSSIBLE | NOT POSSIBLE | — | Agreed (no fee API; F). |
| C-TK-27 | P-TK-93 | FIXED | FIXED | D+c | "No wallet yet? You can still record what you own by hand on Wealth." |
| C-TK-28 | P-TK-94 | FIXED | FIXED | D | "Rising contributions and inflation (optional)". |
| C-TK-29 | P-TK-95 | FIXED | FIXED | D | "What would it take?" present. |
| C-TK-30 | P-TK-96 | FIXED | FIXED | D | "Save scenario"; a 60-character name wraps (BN-091). |
| C-TK-31 | P-TK-97 | FIXED | FIXED | D | Download as CSV. |
| C-TK-32 | P-TK-98 | REASON CITED, NOT BUILT | REASON CITED, NOT BUILT | — | L3 (not replayed). |
| C-TK-33 | P-TK-99 | REASON CITED, NOT BUILT | REASON CITED, NOT BUILT | — | Settings lane (not replayed). |
| C-TK-34…37 | P-TK-31…33 | L7 (not replayed here) | L7 (not replayed here) | — | — |

## ZIGi / NOVA prompt rows (#1–#53)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| #1–#53 (53 rows) | P-TK-31…37, P-TK-16 | L7 (not replayed here) | L7 (not replayed here) | — | Owned by lane L7. |

## Professor rows owned by L1

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-016 | P-PR-01 | FIXED | FIXED | Sc N live | BTC +2.55 % on Today, Markets, Wealth and Portfolio; NVDA −4.78 % on Markets and Wealth; all marked "Showcase price". |
| PR-006 | P-PR-01 | FIXED | FIXED | Sc N | Portfolio 24h = Markets; "Unknown" only where the cost is unknown (SOL), and it says why. |
| PR-077 | P-PR-01 | FIXED | FIXED | Sc N | Markets BTC/ETH identical across two loads 40 s apart (Showcase frozen). |
| PR-078 | P-PR-01 | FIXED | FIXED | Sc, D | Markets = Portfolio 24h (Showcase +2.55 %; fresh +2.85 % both at 09:26). |
| X3-03 | P-PR-01 | STILL OPEN | FIXED | D+c live, Sc | = TK-029 ("as of … can differ a little from Value above"). |
| PR-001, PR-048, PR-081 | P-PR-02 | STILL OPEN | FIXED | Sc N | Strip now "2 of 2 market prices current … 1 need attention: 1 value that needs a fresh read" — the attention item is named as a non-market value, not a stale price; no "older than 15 minutes" beside "2 of 2". |
| X3-04, X3-09 | P-PR-05 | FIXED | FIXED | D live | Charts differ per coin; prices formatted and labelled. |
| X3-08 | P-PR-05 | L7 (not replayed here) | L7 (not replayed here) | — | NOVA price answer. |
| PR-053 | P-PR-28 | STILL OPEN | FIXED | D | Archived asset page: "Delete for good…" → "Delete Rain for good? Its price records and Activity lines go with it." → "Rain deleted. Undo" → "Rain is back, archived." (The lane spec "PR-053" fails on its last step: it looks for the archived asset as a link on /app/wealth.) |
| PR-051, PR-067 | P-PR-55 | FIXED | FIXED | Sc N 1280 | No overlapping controls in the Custom, Cash or Stocks forms. |
| PR-068 | P-PR-59 | STILL OPEN | FIXED | Sc N | Showcase (USD headline): Add account Currency defaults to USD; fresh profile also USD. |
| PR-084 | P-PR-65 | STILL OPEN | FIXED | Sc N, D | Find a market "doge": every icon reads "DOGE" (no "DOG", no "@DO"). |
| PR-007 | P-PR-72 | CHANGED | FIXED | Sc N live | AAPL page: "At this reference price, 30 AAPL would be US$10,530.53. Your own value, US$7,500.00, is the one your wealth counts." |
| PR-049 | P-PR-73 | STILL OPEN | FIXED | Sc N | Camera page: "It has no market price: its value is the one entered by hand."; "1 item" both places; no CoinGecko/provider banner. |
| X3-01 | P-PR-74 | FIXED | FIXED | D | = TK-003. |
| X3-02, X3-05 | P-PR-75 | FIXED | FIXED | D | = TK-007, TK-039. |

## Other bots' ids in the L1 rows of GROK53_LEDGER (new in round 2; round 1 replayed only Tokyo and the Professor)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-221 | AL-COUNTS-001 | — (not in round 1) | CHANGED | Sc N, D | Counts fixed ("2 of 2 market prices current" beside "1 value that needs a fresh read", PR-001). Hover on Refresh prices (Dark): background goes from transparent to rgb(2,8,23), border and text unchanged — still almost invisible on the dark hero. |
| D-001 | AL-COUNTS-001 | — (not in round 1) | FIXED | D live | Markets: every card "Current" with "24h and 7-day figures observed 10:13" and a "Market data updated at" note; no contradicting banner. |
| D-095 | AL-COUNTS-001 | — (not in round 1) | FIXED | D clock | The 15-minute rule re-ages without a reload (W9: "0 of 1 market price current … 1 price older than 15 minutes"). |
| D-151 | AL-COUNTS-001 | — (not in round 1) | NOT REPLAYED | — | Needs a failing refresh with prices on screen; the live stub did not fail. |
| D-245 | AL-COUNTS-001 | — (not in round 1) | FIXED | Sc N | Showcase: every page says "Showcase price"; Portfolio "priced with the market prices this Showcase loaded… the same on every page". |
| D-147 | AL-COUNTS-001 | — (not in round 1) | FIXED | Sc N, D | No raw 17-digit prices on cards (no `\d{4,}\.\d{6,}` anywhere); labels "Current" only within 15 min. |
| D-243 | AL-COUNTS-001 | — (not in round 1) | FIXED | D live | Each price carries its own observed time ("Price observed 10:13"), the chart its own ("last chart observation 09:25"). |
| D-145 | AL-COUNTS-001 | — (not in round 1) | FIXED | Sc N | = PR-001. |
| D-214 | AL-CURRENCY-001 | — (not in round 1) | OWNER DECISION | — | The display-currency switch is hidden (TR7, owner amendment 6); F: Alpha USD/EUR, no FX. Agreed. |
| D-201 | AL-CURRENCY-001 | — (not in round 1) | FIXED | D | Today has no EUR/USD/BTC wallet toggle and no "EUR unavailable" text. |
| D-080 | AL-CURRENCY-001 | — (not in round 1) | FIXED | D | Add an account with currency XYZ → "“XYZ” is not a three-letter currency code ZIGoals knows…", not saved. |
| D-057 | AL-CURRENCY-001 | — (not in round 1) | FIXED | D | No "EUR unavailable" or "Totals in" on Wealth. |
| DV-031d | AL-CURRENCY-001 | — (not in round 1) | OWNER DECISION | — | Wizard USD/EUR only; F "Alpha: English UI, USD/EUR". Agreed. |
| DV-053b | AL-CURRENCY-001 | — (not in round 1) | OWNER DECISION | — | As DV-031d. |
| N-156 | AL-CURRENCY-002 | — (not in round 1) | NOT REPLAYED | — | The contribution-plan currency (step 3) was not reached by my wizard script. |
| BUG-065 | AL-CURRENCY-002 | — (not in round 1) | FIXED | N 1920 fresh | First Quantity goal: Goal asset starts empty (no ZIG); "Create goal" with it empty is refused at the field: "Name what you count, for example books or BTC." |
| G-024 | AL-CURRENCY-002 | — (not in round 1) | FIXED | N 1920 fresh | The wizard opens on "Save an amount" (checked), not Quantity; currency USD preselected. |
| N-003 | AL-CURRENCY-002 | — (not in round 1) | NOT REPLAYED | — | As N-156. |
| G-022 | AL-CURRENCY-002 | — (not in round 1) | NOT REPLAYED | — | The "Contribution asset" field (step 3) was not reached. |
| LS-H46 | AL-CURRENCY-002 | — (not in round 1) | FIXED | N 1920 fresh | Quantity with an empty asset no longer becomes ZIG (refused with a reason); the preview shows the typed name ("Read 20 books"). |
| N-MO-03 | AL-CURRENCY-002 | — (not in round 1) | L7 (not replayed here) | — | NOVA Cost panel (lane L7/L8). |
| NB-017 | AL-CURRENCY-002 | — (not in round 1) | NOT REPLAYED | en-US | The onboarding did not open on /app after removing the onboarding record (my script’s step 1 timed out); no verdict. Lane L3 owns P-NB-15. |
| D-078 | AL-IMPORT-EXPORT-001 | — (not in round 1) | FIXED | D | A file with unknown columns: Next is disabled and described (aria-describedby) by a line saying the required field is missing; refused rows each have "Row n: reason". |
| D-058 | AL-IMPORT-EXPORT-001 | — (not in round 1) | FIXED | D | Junk JSON on Settings restore: "This file is not a ZIGoals protected (encrypted) backup… Existing data was not changed." — a sentence, no raw exception, beside the input. |
| D-237 | AL-IMPORT-EXPORT-001 | — (not in round 1) | FIXED | D | Step 1 names the columns ("Name and Currency (required); also Asset, Quantity, Kind of asset, Value and Notes") and offers a template. |
| BUG-042 | AL-IMPORT-EXPORT-001 | — (not in round 1) | FIXED | D | Junk JSON gives a plain sentence; no schema dump anywhere on Settings. |
| D-054 | AL-LIMITS-001 | — (not in round 1) | CHANGED | D | Save is no longer silent (toast) and values are capped with a check; the 100-character cut of a pasted name is still silent in my run (TK-149). |
| D-081 | AL-LIMITS-001 | — (not in round 1) | FIXED | D+c | Portfolio: empty → "Enter a quantity above zero."; price 0 → "A buy or a sell needs a price above zero."; 20-digit quantity → "Enter an amount up to a trillion."; oversell refused. |
| BUG-027 | AL-LIMITS-001 | — (not in round 1) | FIXED | D | 999999999999999999 refused at the field ("up to a trillion"); US$9,999,999,999.99 kept exact; layout holds. |
| L-067 | AL-LIMITS-001 | — (not in round 1) | FIXED | D | Record a payment: 0 → "Enter a payment above zero."; 20,000 on 12,000.50 owed → "That is more than the 12000.50 EUR owed…" (the Activity line is the Activity lane's, not checked). |
| BUG-059 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | L7 (not replayed here) | — | ZIGi answer. |
| Z-025 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | L7 (not replayed here) | — | ZIGi answer. |
| Z-021 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | L7 (not replayed here) | — | ZIGi answer. |
| Z-039 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | L7 (not replayed here) | — | ZIGi answer. |
| Z-061 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | L7 (not replayed here) | — | ZIGi answer. |
| D-262 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | NOT REPLAYED | — | Needs live drift between two loads (the stub caches prices 2 min); each total now carries "Market prices as of hh:mm". |
| D-200 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | NOT REPLAYED | — | As D-262; Refresh now says "Prices updated at hh:mm". |
| BUG-006 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | FIXED | D, Sc | BTC the same on Wealth, Markets, Portfolio and the coin page (US$80,547.60 fresh, US$80,335.45 Showcase). |
| BUG-085 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | FIXED | D, Sc | Today "Known tracked wealth" = Wealth "Known tracked wealth" (US$547,603.18 + €8,000.00 Showcase; US$0.00 fresh), both "before debts", net worth after debts beside. |
| D-155 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | STILL OPEN | D+c 731 (≈1280 at 175 %) | BTC price now = Markets (fixed part). Holdings table at 731 px: it scrolls inside its box (1251 in 575 px), Value (right edge 1111) and Result (1373) are off-screen, with no "more columns" line or fade (the Markets table has one). |
| DV-278 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | FIXED | D | "Market prices as of 09:49; the total follows them when prices are refreshed." |
| C-X3-06 | AL-NUMBERS-SOURCE-001 | — (not in round 1) | FIXED | D live | Freshness stamps on every price (C-TK-25). |
| BUG-074 | AL-NUMBERS-SOURCE-002 | — (not in round 1) | FIXED | Sc N | "Manual value" badge; AAPL page states qty × reference beside the own value (PR-007). |
| C-DVG-55 | AL-NUMBERS-SOURCE-003 | — (not in round 1) | FIXED | D live | Period strip 24H/7D/30D/90D/1Y/Max and freshness stamps. |
| C-X3-04 | AL-NUMBERS-SOURCE-003 | — (not in round 1) | FIXED | D live | Ranges beyond 30D (90D, 1Y, Max). |
| MO-128 | AL-NUMBERS-SOURCE-004 | — (not in round 1) | FIXED | D | Savings 2,500,50 + Loan 1,200: hero now "No assets yet · 0 assets · 2 accounts … Net worth after debts €1,300.50" (no "Start your wealth story" over a net worth). |
| BUG-063 | AL-NUMBERS-SOURCE-004 | — (not in round 1) | FIXED | D | Labels per currency; debts not in the holdings headline, shown as net worth after debts. |
| BUG-085 | AL-NUMBERS-SOURCE-004 | — (not in round 1) | FIXED | D, Sc | = above. |
| D-053 | AL-ROUNDING-001 | — (not in round 1) | FIXED | D, Sc | No raw floats on cards; freshness labels follow the 15-minute rule. |
| D-108 | AL-ROUNDING-001 | — (not in round 1) | FIXED | D live | Favourites limit gone (50, said when past 8); chart text formatted and labelled. |
| D-215 | AL-ROUNDING-001 | — (not in round 1) | FIXED | D live | Prices formatted (US$0.04242, US$0.9998, US$80,335.45); sparklines labelled "undated samples". |
| BUG-007 | AL-ROUNDING-001 | — (not in round 1) | FIXED | D live | No "76841.77…" anywhere, Portfolio coin page included. |
| BUG-028 | AL-ROUNDING-001 | — (not in round 1) | FIXED | D live | As BUG-007. |
| MO-158 | AL-COUNTS-002 | — (not in round 1) | FIXED | Sc N | Cut below allocations asks once and names the Goal; the asset page says "over-allocated: review these Goals". |
| N-MO-17 | AL-COUNTS-002 | — (not in round 1) | CHANGED | Sc N | Gold page: "10 GOLD" in header and body (one unit word, but "GOLD" is the symbol, not "troy ounces" as Portfolio's list says "Gold · troy ounces"); no per-item price shown. |
| BUG-030 | AL-A11Y-002 | — (not in round 1) | FIXED | D | = TK-204. |
| DV-145 | AL-COPY-003 | — (not in round 1) | FIXED | D live | Stock: "Shares you hold … not your broker’s quote"; no "physical metal" line under a stock. |
| DV-146 | AL-COPY-003 | — (not in round 1) | CHANGED | D | Rename toast names the new name; the edit field still shows the raw "1500" (no symbol/separator — the lane keeps inputs unlocalized by rule). |
| DV-148 | AL-COPY-003 | — (not in round 1) | FIXED | D | Archive confirm: "It leaves your wealth totals and Goal progress today. Its history… is kept, and you can unarchive it any time."; archived page "Archived · not counted". |
| DV-251 | AL-COPY-003 | — (not in round 1) | FIXED | D | No spliced sentence; "Net worth adds your accounts and subtracts your debts (see Accounts, debts & net worth)." |
| DV-252c | AL-COPY-003 | — (not in round 1) | FIXED | D | Header "0 assets · 2 accounts · …"; chips "All 8 · Accounts 3 · Debts 2 · Assets 3". |
| D-148 | AL-COPY-004 | — (not in round 1) | FIXED | D | Property card has no "Reference price … Unavailable" row. |
| NB-097 | AL-FIELD-ERROR-001 | — (not in round 1) | FIXED | D | Amount fields autocomplete=off; empty Save is the form's own message (noValidate), no native bubble. |
| BN-091 | AL-LAYOUT-DESKTOP-002 | — (not in round 1) | FIXED | D/L | 60-character name wraps inside its card (overflow-wrap:anywhere, text right 547 < card 564); no page scroll. |
| DV-259 | AL-MOTION-001 | — (not in round 1) | NOT REPLAYED | Sc D 388 | Sampled the hero every 120 ms during the count-up: two digit strings are in the DOM at once ("US$501,800.00" and the counting "US$264,888.90…"), but my DOM check cannot tell whether the second is clipped; overlap of their boxes was not shown conclusively. Needs a frame capture. |
| DV-268a | AL-MOTION-001 | — (not in round 1) | NOT REPLAYED | Sc L 768 | As DV-259: no box overlap at 768 Light; inconclusive without a frame capture. |
| BUG-069 | AL-TOAST-002 | — (not in round 1) | FIXED | D | "Market data updated at 10:14." |
| N-DV-06 | AL-CURRENCY-003 | — (not in round 1) | OWNER DECISION | — | Agreed (F: no FX). |
| C-DVG-54 | AL-SEARCH-001 | — (not in round 1) | FIXED | D | Sortable headers (aria-sort) and search with Bitcoin first. |
| BUG-029 | AL-SEARCH-001 | — (not in round 1) | FIXED | D | Bitcoin first; "Unverified · check the project…" not clipped. |
| PR-015 | AL-COPY-008 | — (not in round 1) | FIXED | Sc N | Today: "Known tracked wealth · holdings, before debts · currencies kept separate", net worth after debts beside it; the count reads "2 of 2 market prices current" with each reason; no "No target set" seen where a target exists. |

## Competitor-gap ids (C-DVG, C-X3) in the L1 rows

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-15 | AL-COMPETITOR-GAP-001 | — (not in round 1) | FIXED | Sc D | Built: "Your wealth over time" chart from recorded snapshots, by asset class / by source, 1M/3M/1Y/All. |
| C-DVG-43 | AL-COMPETITOR-GAP-002 | — (not in round 1) | FIXED | Sc D | "Hide amounts" blurs every figure (data-hide-amounts=on, blur 7 px); "Show amounts" undoes it. |
| C-DVG-44 | AL-COMPETITOR-GAP-003 | — (not in round 1) | FIXED | Sc D | "Upcoming bills · next 30 days €1,079.99 … A reminder only: ZIGoals never pays or cancels anything." |
| C-DVG-47 | AL-COMPETITOR-GAP-004 | — (not in round 1) | FIXED | Sc D | "Budgets by category · €350.40 left of €430.00 budgeted · 26 days to go". |
| C-DVG-48 | AL-COMPETITOR-GAP-005 | — (not in round 1) | FIXED | Sc D | Daily recorded totals in the history chart; "A net-worth milestone · Past US$100,000.00". (Weekly recap = NOVA, L7.) |
| C-DVG-49 | AL-COMPETITOR-GAP-006 | — (not in round 1) | FIXED | Sc D | Calculator → More planning tools → "Paying off debts: snowball or avalanche" with the Showcase debts. |
| C-DVG-50 | AL-COMPETITOR-GAP-007 | — (not in round 1) | FIXED | Sc D | "Financial freedom … 1,000 possible paths are drawn from the return and volatility you choose… A model, not advice". |
| C-DVG-51 | AL-COMPETITOR-GAP-008 | — (not in round 1) | NOT REPLAYED | Sc D | "Import from your bank" takes CSV, CAMT.053, OFX/QFX, MT940; the Mint/YNAB column presets need a sample export, not tried. |
| C-DVG-52 | AL-COMPETITOR-GAP-009 | — (not in round 1) | FIXED | D live | "Price alert" region on Wealth/Markets and Portfolio coin pages. |
| C-X3-02 | AL-COMPETITOR-GAP-009 | — (not in round 1) | FIXED | D live | = C-DVG-52. |
| C-DVG-53 | AL-COMPETITOR-GAP-010 | — (not in round 1) | FIXED | D live | Built: up to 50 favourites ("Favourites past 8 are kept on this device only."). Custom columns: not built. |
| C-X3-01 | AL-COMPETITOR-GAP-010 | — (not in round 1) | FIXED | D live | = C-DVG-53. |
| C-DVG-56 | AL-COMPETITOR-GAP-011 | — (not in round 1) | FIXED | D | Coins: Find a market searches the full CoinGecko catalogue; stocks/ETFs stay the tokenized list (F: DE6, D8). |
| C-DVG-57 | AL-COMPETITOR-GAP-012 | — (not in round 1) | NOT POSSIBLE | — | Agreed (F: no news source, no fake integrations). |
| C-X3-05 | AL-COMPETITOR-GAP-012 | — (not in round 1) | NOT POSSIBLE | — | As C-DVG-57. |
| C-DVG-58 | AL-COMPETITOR-GAP-013 | — (not in round 1) | REASON CITED, NOT BUILT | D live | No "explain this chart" on coin pages; the lane cites model work (not an F/O decision). |
| C-DVG-59 | AL-COMPETITOR-GAP-014 | — (not in round 1) | FIXED | D+c live | FIFO / LIFO / HIFO lot views on the coin page (stored lots not built: additive limit cited). |
| C-DVG-60 | AL-COMPETITOR-GAP-015 | — (not in round 1) | FIXED | D+c | "Realised gains by year (CSV)". |
| C-DVG-62 | AL-COMPETITOR-GAP-016 | — (not in round 1) | FIXED | D+c live, Sc | "Time-weighted +0.13 % · Money-weighted +10.77 % · Bitcoin’s price, same range −5.88 %" (index benchmark: F, paid feed). |
| C-DVG-63 | AL-COMPETITOR-GAP-017 | — (not in round 1) | FIXED | Sc | "Your target mix … each share’s distance from your target" (no orders). |
| C-DVG-64 | AL-COMPETITOR-GAP-018 | — (not in round 1) | FIXED | D+c | Portfolio → Transactions → "Trader tools … fees, results by month…" (off until turned on). |
| C-DVG-65 | AL-COMPETITOR-GAP-019 | — (not in round 1) | REASON CITED, NOT BUILT | — | Native positions are read-only; any-address P&L needs a paid indexer (F cited). |
| C-DVG-46 | AL-COMPETITOR-GAP-020 | — (not in round 1) | OWNER DECISION | — | Agreed (F: no FX). |
| C-DVG-45 | AL-COMPETITOR-GAP-022 | — (not in round 1) | NOT POSSIBLE | — | Agreed (F: no server for people's data). |
| C-DVG-61 | AL-COMPETITOR-GAP-022 | — (not in round 1) | NOT POSSIBLE | — | As C-DVG-45. |
| C-X3-03 | AL-COMPETITOR-GAP-032 | — (not in round 1) | FIXED | D | Find a market = full catalogue. |
| C-X3-07 | AL-COMPETITOR-GAP-040 | — (not in round 1) | REASON CITED, NOT BUILT | — | = C-TK-32 (L3). |
| C-DVG-66 | AL-CONFIRM-DELETE-002 | — (not in round 1) | FIXED | D+c, Sc | Edit and Remove on every transaction row. |

## STILL OPEN / CHANGED — exact steps for the lane

Common setup unless stated: Chrome, 1280×800 Dark, a fresh context, en-GB, Europe/Brussels, live prices. No row that round 1 called FIXED or HOLDS is open now (no regression); the rows below were open, changed, or not replayed in round 1.

**STILL OPEN**

1. **TK-024 / P8 (round 1: STILL OPEN): Save moves when the refusal appears.** Portfolio → New portfolio → Buy 0.5 BTC at 60,000 → Type Sell, price 70,000, Quantity 10 → Save. The message under Quantity is right and the field is marked and focused, but Save jumps 101 px down in the window (empty quantity: 60 px). The fourth pass's `holdSaveInPlace` does not hold it; its own spec `l1-pass4-portfolio` "TK-024" fails (99 px).
2. **TK-149 / D-054 (round 1: NOT REPLAYED): a cut paste is silent.** Wealth → + Add asset → Custom → click Asset name → paste (Ctrl+V) a 229-character name. The field keeps 100 characters and no message shows (checked at 50 ms, 300 ms, 1.2 s). The message "Names keep 100 characters… (129 characters)" exists: a bare paste event shows it, so the input event a real paste fires right after clears it (asset-picker.tsx `onPaste` sets the field message, the field's change handler then clears it).
3. **TK-196 (+ W24) (round 1: STILL OPEN): an archive that releases a Goal's allocation leaves no flag.** Showcase → Wealth → USD Coin → Archive asset → Release allocations & archive → Goals. Emergency fund shows "BEHIND · US$5,000.00 / US$20,000.00 · Existing wealth · active"; neither the card nor its goal page says an archived asset no longer counts. The lane spec "TK-196" fails the same way.
4. **D-155 (Denver, new this round): the Portfolio holdings table at zoom 175 % (731 px).** Portfolio with a BTC holding at 731 px wide: the table scrolls inside its box (1251 px in 575 px) and Value and Result are off-screen, with no "more columns" line or fade (the Markets table at 375 has one). The price part is fixed (same as Markets).
5. **TK-199 (round 1: STILL OPEN):** a custom asset in GBP reads "500.00 GBP" while USD/EUR read with symbols. The lane now cites owner decision F; F is about which currencies Alpha supports, not how a supported-elsewhere code is written — not agreed.
6. **TK-191 (round 1: STILL OPEN):** every load logs "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'." The lane calls it not possible (the deny is pinned by tests); that is not an AL_SCOPE F/O decision — INT or the owner to decide.

**CHANGED**

7. **TK-036 (round 1: STILL OPEN):** "10100" can no longer be typed (Years maxlength 2). But a wrong Years (61) still replaces the whole result with "Correct the marked field to see the estimate." — the bot asked to keep the last result dimmed. The cited TR14 pin is not an F/O owner decision.
8. **TK-184 (round 1: STILL OPEN):** Showcase, Light, Settings at 768: the sticky section row is 74 px tall (bot ~110, round 1 134). Smaller, but not the "one 44 px row" the lane claims.
9. **D-221 (Denver, new):** counts fixed; the hover on Wealth's "Refresh prices" in Dark only changes the background from transparent to rgb(2,8,23), border and text unchanged — still almost invisible.
10. **N-MO-17 (Moscow, new):** Showcase Gold page counts "10 GOLD" (the symbol as a unit) while Portfolio's list calls it "Gold · troy ounces"; no per-unit price on the page.
11. **DV-146 (Denver, new):** Edit cash/custom shows the raw "1500" in the value field (no separator/symbol); the rename toast is fixed. The lane keeps inputs unlocalized by rule (not an F/O decision).

**Not replayed this round (reason in the row):** TK-183, TK-201 (second add), TK-221/223 (staking scenario not reachable), TK-141…194 goal rows, NB-017, N-156/N-003/G-022, D-151, D-262/D-200/TK-225/TK-6B-06 (live drift), C-DVG-51 presets, M10, TK-203, TK-069, TK-220, N-TK-13/14/17/20/29.

