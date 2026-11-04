# Tokyo re-check list: Wealth / Portfolio / Markets / Add money / Calculator / widgets / ZIGi — run 2026-11-04
Built 2026-11-04 01:2x Brussels from bugs.md, testrun-2026-10-21 (tokyo, lisbon, berlin, denver, nairobi, moscow) and feature-gap-2026-10-26 (tokyo-alpha-verify, tokyo-zigi-livetests). Deduped: one row per distinct bug; all IDs listed.
**Clean-app setup (do first):** fresh profile / cleared site data, do NOT load Showcase. Wealth → + Add asset: BTC 0.5, ETH 2, ZIG 5,000, AAPL 10 (stock), Cash USD 1,000 "Test cash", Cash EUR 500. Add account: Savings USD 5,000; Debt USD 2,000. Portfolio: create "Test stack", Buy BTC 0.05 @ 64,000, Buy ETH 1.2 @ 2,500, Buy ZIG 5,000 @ 0.04. Markets: favourite 8 assets. Create one USDC goal and one BTC goal (0.1 BTC).
No NOVA entries existed in old sources; test NOVA fresh alongside ZIGi rows.
Status column: fill FIXED / STILL OPEN / CHANGED / N/A.

| # | Original ID(s) | Page > feature | Title | Repro (clean app) | Expected fixed | Status |
|---|---|---|---|---|---|---|
| **WEALTH** |||||||
| W1 | BUG-085, BUG-063, B-002, M-041, M-077, C-015, N-074, N-181, B-020/ZIGi | Wealth > Net worth | USD net worth leaves out auto-priced BTC/ETH; two unexplained totals | Setup data → compare Wealth header "Known tracked wealth", Net worth USD, Today card, ZIGi "what is my net worth" | Net worth = holdings incl. BTC+ETH + accounts − debts; same figure/labels on all pages | CHANGED - labels consistent, USD kept separate, debt excluded from headline (TK-037/039) |
| W2 | B-007, M-078 | Wealth > History | Latest history record ≠ headline on same date (also Life review) | Add assets, wait for a history point, compare history last value vs headline and /app/life-review | Same value per date | CHANGED - unverifiable, empty state (TK-038) |
| W3 | B-008, BUG-074, M-079, N-196 | Wealth > Asset value | Manual value silently overrides qty × price | Add AAPL 10, set manual value $1,000 → card | Shows qty×price, or clearly labelled "Manual value" with both visible | CHANGED - "Manual value" badge shown (TK-040) |
| W4 | BUG-027, B-036, N-126, T-060, T-081, D-054 | Wealth > Add asset | No upper limit on value; huge total shrinks unreadably in "Available for Goals" | Add Cash USD 999999999999999999 | Sane max or plausibility warning; layout stays readable | FIXED - trillion limit + readable layout (TK-041/042); limit msg placement poor |
| W5 | L-015, T-061, D-080 | Wealth > Accounts | Invented currency ("ZZZ"/"ABCD") accepted, cut to 3 letters, own net-worth card, can't fix | Add account currency ZZZ / ABCD | Only ISO list; editable after save | STILL OPEN - XYZ currency gets own card (TK-039/041) |
| W6 | N-135, N-152 | Wealth > Add account | No balance/rate limits; 200-char name accepted | Balance 99999999999999999999, rate 1000, name 200×x | Limits + friendly errors / maxlength | |
| W7 | B-033, M-109, L-014, D-054, M-108 | Wealth > Add asset form | Inconsistent/absent validation: 0 vs −5 messages; empty Save silent; silent 100-char name cut; Save/Archive no feedback | Cash form: 0, −5, abc, 1e15, empty name, 150-char name; edit custom asset → Save/Archive | One rule, inline message at field, toast on save/archive, counter for name | CHANGED - limit msg exists, below Save, no toast (TK-041) |
| W8 | BUG-007, BUG-028, T-090, T-142, D-053, D-147, D-176, M-010, M-086, N-025, N-193 | Wealth/asset page > Price format | Raw floats ($83023.4168767067, 17 decimals, no separators) | Open BTC/ETH/ZIG asset cards and /app/wealth/asset/<btc> | Formatted, ≤2 dp (sensible dp for small coins), separators | STILL OPEN - raw 76841.77423078995 USD on coin page (TK-033) |
| W9 | B-004, B-015, T-092, T-117, L-012, L-047, D-001, D-095, D-151, D-243, M-051, N-026, N-054, N-122, N-194, C-012, C-013, T-038 | Wealth + Markets > Freshness | "Current" badge on days-old prices; price moves while "Last verified" frozen | Add BTC, reload twice, read badge, Last verified, price, 24h % (also Markets cards) | Badge reflects real age (>15 min = stale); timestamp updates with price | STILL OPEN - badge flicker (TK-040) |
| W10 | D-200, D-262, N-016, N-055 | Wealth > Totals | Total changes after load/reload silently | Hard reload Wealth, watch total | Skeleton or "updated just now" | STILL OPEN - values change after load (TK-040/044) |
| W11 | D-145, D-221, M-042, L-069, B-032 | Wealth > Price status | "2 of 2 current" next to "1 need attention"; attention never says what; empty Wealth shows "0 need attention" | Clean empty Wealth, then add BTC + custom asset | Consistent counts, reason shown, hidden when no assets | CHANGED - counts consistent, reason not given (TK-040) |
| W12 | N-030, B-034, L-085, D-057, D-214 | Wealth > Totals in EUR | EUR toggle doesn't convert; default from locale shows €0; only Wealth honours it; lost on reload | Toggle Totals in EUR with USD assets; reload; check Goals/Markets | Clear per-currency or converted totals; persists; EUR empty state | |
| W13 | L-072, D-078, D-237, T-102 | Wealth > Import CSV | Refused rows no reason; binary decoded as header; columns not named; expects holdings not transactions | Import CSV with 1 bad row; import a .png | Row-level reasons; binary refused; sample/columns listed | |
| W14 | L-073 | Wealth > Import CSV | Formula `=HYPERLINK(...)` accepted as asset name | CSV name cell =HYPERLINK("http://x") | Sanitised/escaped on import and export | |
| W15 | T-143, M-058, D-079 | Wealth > Add asset search | "gold"/"bitcoin" show look-alike coins, same badge, noisy one-letter results | Add asset → Crypto search "gold", "bitcoin", "b" | Real high-cap first; distinguishing info (chain, mcap, verified) | |
| W16 | BUG-045 | Wealth > Add asset a11y | Dialog doesn't trap focus | Open Add asset, Tab 40× | Focus stays inside | |
| W17 | BUG-047 | Wealth > Charts a11y | Nested interactive elements (axe) | axe on /app/wealth | 0 nested-interactive | |
| W18 | T-096, N-145 | Wealth > Add asset @phone | No left padding, page scrolls sideways (~375–427 px) | 375 px → + Add asset | Padded, no horizontal scroll | |
| W19 | B-026, B-030 | Wealth > mobile | Heading duplicated; net worth hidden in collapsed accordion but text says "below" | 375 px Wealth | One heading; open by default or reworded | |
| W20 | D-122, L-087 | Wealth > mobile/dock | "Open Portfolio →", asset ⋯ and holdings filter tabs hidden under floating dock | 375/768 px Wealth | Nothing covered | |
| W21 | D-055 | Wealth > Asset card menu | Long names repeat in every item; no delete in menu | Asset with 80-char name → ⋯ | Short items; delete/archive present | |
| W22 | D-148 | Wealth > Manual asset card | "Reference price per property: Unavailable"; uneven cards | Add custom asset "Flat" 200,000 | No meaningless price row | |
| W23 | D-146 | Wealth > Intro copy | Advice-like nudge "Put it to work on Earn →" | Read What you have intro | Neutral copy (Berlin) | |
| W24 | B-020, M-080 | Wealth > Goal allocation | Setting USDC qty 0 silently drops goal allocation; allocated counts completed goal, moves with BTC price | Allocate USDC to goal, set USDC qty 0; complete BTC goal | Warning before drop; completed goals excluded/labelled | |
| W25 | M-125, T-001 | Wealth > Add money | "Add money →" opens real-money purchase (Ramp/Banxa) with no sandbox warning | Wealth → Add money | Clear real-money/third-party warning; alpha-safe | CHANGED - disclaimer present "sells nothing", no explicit real-money/alpha warning; hand-off not tested (TK-034) |
| W26 | BUG-059, N-066, D-083 | Wealth/ZIGi/Portfolio | Same asset, different qty/price across Wealth, Portfolio, ZIGi, Markets | Compare ETH on all four pages | One price source, labelled | STILL OPEN - AAPL/VOO/Gold ref "Unavailable"; 4 BTC prices (TK-040) |
| **CALCULATOR / EARN** |||||||
| C1 | B-010, B-021 | Calculator vs Earn | Earn says "simple yearly rate" but calculator compounds monthly | /app/wealth/calculator 1,000, 5.29%, 3 y vs Earn wording | Wording and maths agree | NOT CHECKED |
| C2 | N-029 | Calculator | Hidden defaults (3% contribution raise, 2.5% inflation) change "You put in" | Start 1,000, 100/mo, 5%, 10 y → check $13,000 | Assumptions visible/editable | FIXED - $13,000, assumptions visible (TK-035) |
| C3 | N-027, T-129, B-022 | Staking calculator | No amount field, APR disabled; tall empty card | /app/staking calculator on clean app | Usable with own amount | NOT CHECKED |
| **TODAY / WEALTH WIDGETS** |||||||
| G1 | L-078, M-121, D-201 | Today > Wallet widget | USD/EUR/BTC pills always "unavailable", layout shifts | Today → toggle EUR/BTC | Converts or pills hidden | NOT VERIFIED - no wallet in profile |
| G2 | T-070 | Today > Recent activity | Long asset name takes over card | Add asset with 80-char name → Today | Truncated with ellipsis | N/A - fit in card (TK-037) |
| G3 | M-133, M-045, T-098 | Today > Widgets layout | Right third empty; arrange handles overlap titles | Today → Arrange this page | Balanced grid; handles clear | NOT CHECKED |
| **PORTFOLIO** |||||||
| P1 | BUG-006, N-008, D-155 | Portfolio > Price | BTC price differs from Markets (fixture vs live) | Compare BTC in Test stack vs Markets | Same source/labelled | |
| P2 | N-007 | Portfolio > ZIG | ZIG "No price yet", totals "Unknown" though priced elsewhere | Buy ZIG 5,000 @0.04 | Priced, totals computed | FIXED - ZIG priced |
| P3 | N-147, T-126, Feature #21 | Portfolio > P&L | Realised P&L only on coin page, header "All-time result: Unknown" | Buy ETH 1.2, sell 0.2 → list/header | Realised + unrealised in header/list | CHANGED - see TK-023 |
| P4 | BUG-001, D-081 | Portfolio > Record tx | Absurd quantities accepted (999,999,999,999 × …) | Buy ETH qty 999999999999 @ 999999999999 | Plausibility limit | |
| P5 | T-073, D-081, N-161 | Portfolio > Record tx | Price $0 accepted; fee > trade value accepted; pre-asset dates (1900/1990) accepted; no reward/airdrop type | Buy 0.01 @ $0; fee $5,000; date 1900-01-01 | Warn/reject; reward/airdrop types | |
| P6 | BUG-003, L-044, L-016 | Portfolio > Oversell | Oversell error shown far off-screen; future date only native tooltip | Sell 10 BTC (own 0.05); date 2030 | Inline error at form | STILL OPEN - error off-screen at top (TK-024) |
| P7 | BUG-032, N-013, N-043, N-044 | Portfolio > Transactions | No edit; Remove has no confirm/undo; form collapses after remove | Coin ETH → Remove a buy | Edit; confirm or Undo; form kept | CHANGED - Undo + Edit on coin page/Insights only (TK-025/026/030) |
| P8 | T-072, T-101, T-127, N-123 | Portfolio > Messages | Stale "recorded/removed"/fee/import messages linger | Failed save after success; reload after import | Messages clear on next action/reload | |
| P9 | T-127 | Portfolio > Name | Portfolio name silently cut ~80 chars | Rename to 120 chars | Counter/error | |
| P10 | T-100, N-099, N-100 | Portfolio > CSV import | "BTC" refused despite "e.g. BTC"; exact column names not auto-mapped | CSV Date,Type,Coin,Quantity,Price,Fee,Note with BTC row | Auto-maps, resolves BTC/ETH | |
| P11 | N-101 | Portfolio > Import search | "AAPL/apple" maps to tokenized/meme coins | Import search "apple" | Message: stocks live in Wealth | |
| P12 | N-146, N-165 | Portfolio > Record tx a11y | "Record a transaction" not a button; "a ETH" grammar | Keyboard-tab to it on list and coin page | Real button; "an ETH"/"Record ETH transaction" | |
| P13 | BUG-048, L-080 | Portfolio > a11y | Invalid <dl> (axe) | axe /app/portfolio | 0 violations | |
| P14 | BUG-051, L-048 | Portfolio > Holdings layout | Table 1058 px at 768; cards at 375 drop qty/price/avg cost | 768 and 375 px | Fits; key fields kept | |
| P15 | N-042, N-033 | Portfolio > Export | Portfolio/Wealth transactions missing from "Export everything" | Settings → Export everything → open ZIP | Portfolio + Wealth included | |
| P16 | D-213 | Portfolio/Markets > Load | Hard reload shows blank dark void, no skeleton | Hard reload /app/portfolio, /app/markets | Skeleton | |
| P17 | D-124, D-196 | Portfolio/Markets > Layout | Rename/Delete/Refresh partly under dock; odd column widths | 768 px | Clear of dock; consistent width | |
| **MARKETS / FAVOURITES / COIN PAGES** |||||||
| M1 | BUG-029, T-074, L-032, D-051, N-023, N-206 | Markets > Find a market | "btc/eth/bitcoin/solana" list junk/meme/bridged before real asset | Find a market: btc, eth, bitcoin, solana, AAPL | Real high-cap first, verified marker | |
| M2 | BUG-030, N-191 | Markets > Table | No sortable headers | Table → click Price/24h/Mcap | Sort with arrow + aria-sort | |
| M3 | L-031 | Markets > Filter | "Search this market view" doesn't filter | Type "eth" in view search | Rows filter | FIXED (TK-045) |
| M4 | N-009, N-024, N-207, L-064, D-108, D-223 | Markets > Favourites cap | 8 cap unexplained; 9th star silently ignored or error off-screen | Favourite 8, star a 9th (cards and search dialog) | "x / 8 (max 8)" visible; inline message; replace option | FIXED - message + toast on 9th (TK-032) |
| M5 | N-200 | Markets > Favourites | No reorder | Favourites → try reorder | Drag/move | |
| M6 | N-192 | Markets > Filters | Owned and Favourites show same list; Owned includes unowned | Own BTC/ETH only, favourite 8 others | Filters distinct and correct | CHANGED - Owned/Favourites distinct; Owned resets after Back (TK-033) |
| M7 | T-105, T-117 | Markets > View | Table/Cards choice lost on reload | Pick Table, reload | Remembered | FIXED - Table persists on reload (TK-031/043) |
| M8 | BUG-031, B-012 | Markets > Counts | Manual assets count differs from Wealth after archive | Add 3 manual, archive 1 → compare | Same count | |
| M9 | BUG-069, D-096, N-197 | Markets/Wealth > Refresh | "could not refresh" banner; Refresh/Favourite give no feedback | Click Refresh market data / Refresh prices; toggle star | Loading + success/failure toast/live region; retry | |
| M10 | L-063, T-040 | Markets > Metals/stocks | Gold/Silver show token logos (XAUT); stocks are tokenized-RWA proxies labelled as real | Find Gold, Silver, AAPL | Correct labels/source | |
| M11 | N-195 | Coin page > Chart | Default 90 d range has no button; only 24H/7D/30D | BTC coin page | Active button marked; 90D/1Y/All | CHANGED - coin page opens, ranges 24H/7D/30D/Available only (TK-033) |
| M12 | N-194 | Coin page > Prices | Three prices + three timestamps on one page | BTC coin page header/chart/source | One price, one timestamp | STILL OPEN - several BTC prices (TK-033/040) |
| M13 | N-196 | Coin page > AAPL | No chart; value ≠ qty×price | AAPL 10 asset page | Chart or clear note; correct value | |
| M14 | D-215 | Markets > Precision | Price precision and sparkline labels inconsistent | Cards vs table vs chart | Consistent | |
| M15 | T-006, N-047, Feature #24 | Markets > Alerts | No price alerts (ZIGi refuses) | Coin page → look for alert | (feature; see Missing list) | |
| M16 | D-187 | Markets > Empty state | Inconsistent empty-state copy | Clean Markets with 0 favourites | Consistent voice | |
| **ZIGi (and NOVA) on Wealth/Portfolio/Markets** |||||||
| Z1 | B-002 (ZIGi), Z-001 | ZIGi > Net worth | Repeats wrong net worth, no BTC/ETH warning | Ask "What is my net worth?" | Matches fixed W1 | STILL OPEN |
| Z2 | Z-007 | ZIGi > Crypto share | "How much of my wealth is in crypto?" gives net-worth text | Ask it | % and value in crypto | STILL OPEN |
| Z3 | Z-023 | ZIGi > Staked | "How much ZIG staked?" answers holdings | Ask it | Staked amount or "none staked" | STILL OPEN |
| Z4 | Z-095 | ZIGi on /app/portfolio | "BTC in my portfolio?" answers Wealth qty | On Portfolio ask it | Portfolio 0.05 BTC (or both, labelled) | STILL OPEN (TK-048) |
| Z5 | Z-070 | ZIGi > Export | "Can you export my wealth data?" gives net-worth text | Ask it | Points to Settings → Export | STILL OPEN |
| Z6 | Z-086 | ZIGi > Goal progress | Goal answer sentence cut off at "in" | Ask "How far am I on my USDC goal?" | Complete sentence | |
| Z7 | BUG-054, Z-065, Z-075, M-002, M-087, M-088, N-063 | ZIGi > Goals | Own chip "How far am I on my goals?" gets fallback | Ask it / click chip | Goals overview | |
| Z8 | N-010, BUG-057, L-004, T-066, N-018, N-075 | ZIGi > Questions → writes | Questions ("Explain my P&L", "how much water") produce Save previews | Ask both | Answer, never a write preview | STILL OPEN (TK-053) |
| Z9 | L-052, T-006 | ZIGi > Price/staking | Can't answer price/staking questions; refuses alerts | "BTC price?", "alert me at 100k" | Answers price; alert or clear "not yet" | CHANGED (price answered, no alerts) |
| Z10 | N-064 | ZIGi > Currency | "Worth in EUR" answered in USD | "What's my wealth in EUR?" | EUR or explicit note | STILL OPEN |
| Z11 | BUG-056 | ZIGi > Typos | "how mch eth do i hav" fails | Ask it | Understood | STILL OPEN |
| Z12 | BUG-055 | ZIGi > Follow-up | No context for "and the second one?" | Ask holdings, then follow-up | Uses context | STILL OPEN |
| Z13 | BUG-038, L-003 | ZIGi > Input | 20k-char input echoed in full | Paste 20,000 chars | Shorter limit, no full echo | STILL OPEN |
| Z14 | D-092, D-061, D-242 | ZIGi > Advice | "Which setup fits me?" names paid products / directives; no "can't advise" | Run Which setup fits me?; ask "should I buy BTC?" | Neutral, not-advice notice; result scrolled into view | FIXED (buy/sell refusals) |
| Z15 | D-160, D-256 | ZIGi > Copy | "Personal AI Companion" vs "with no AI" | Open panel | Consistent copy | |
| Z16 | D-059 | ZIGi > Switch off | Dead "Ask ZIGi about…" links when off | Settings ZIGi off → Wealth/Markets | Links hidden | |
| Z17 | N-067 | ZIGi > Subscription bridge | Connecting ChatGPT bridge disables local answers permanently | Choose bridge, ask net worth, reload | Local answers still available | |
| Z18 | BUG-081, BUG-034, B-027, D-066, D-070, D-250, D-254, M-012, M-072, N-051, N-173, T-069, T-130, T-136, T-144, T-145, L-087 | ZIGi launcher > Overlap | Mascot/FAB stack covers content on Wealth/Markets/Portfolio at 375/768 | 375 and 768 px on the 3 pages | Nothing covered | STILL OPEN (TK-056) |
| Z19 | D-131, D-067, M-073 | ZIGi > Panel size | Chat area ~130 px at narrow width | 375/768 px open panel | Usable height | CHANGED (usable at 358px) |
| Z20 | L-088, M-090, D-032 | ZIGi > Input/a11y | Enter newline at phone width; no timestamps; focus lost on close; disabled Send looks active | 375 px chat; keyboard close | Enter sends; focus returns | |
| Z21 | N-203, D-240 | ZIGi > Hide | Chevron hides ZIGi instantly with no undo | Click chevron under mascot | Confirm/undo or easy restore | |

## The 10 Wealth features MISSING on 2026-10-26 (tokyo-alpha-verify.md) — re-check
| # | Feature (row) | Check on clean app | Status |
|---|---|---|---|
| F1 | Bank sync (#11) | Wealth/Add account: any "connect bank"? | |
| F2 | Exchange import (#12) | + Add asset: exchange list/presets beyond CSV? | |
| F3 | Budgets / spending categories (#16) | Search Wealth/Portfolio/Settings for budget/spend; ZIGi "how much did I spend?" | |
| F4 | Recurring bills / subscriptions (#17) | Any bills/subscriptions screen | |
| F5 | Realized vs unrealized P&L (#21) | Portfolio list/header after a sell (see P3) | CHANGED - see P3/TK-023 |
| F6 | Dividends / income (#23) | Dividend/income field on AAPL or Portfolio | |
| F7 | Price alerts (#24) | Wealth, Markets, coin pages, Settings | STILL OPEN - no alerts (TK-046) |
| F8 | Tax export / report (#30) | Any tax screen; ZIGi "How much tax will I owe?" | |
| F9 | Sharing (Wealth) (#33) | Share/export a wealth view | |
| F10 | Privacy / hide balances (#40) | Hide-amounts toggle in Wealth/Settings | FIXED - Hide amounts button exists (TK-040) |
