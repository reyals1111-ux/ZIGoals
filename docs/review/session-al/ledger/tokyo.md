# Ledger — Tokyo (Wealth, Portfolio, Markets, Add money, Calculator, Wealth widgets, ZIGi/NOVA from those pages)
Source files read in full: `tokyo.md` (839 lines), `tokyo-recheck-list.md` (114 lines). Not supplied to this helper: `tokyo-p3-prompts.tsv` (the bot's prompt log; only its tallies, quoted in tokyo.md §12, are used).

Conditions legend (used in the tables; theme/width only where the bot stated them):
- **P1** = Pass 1, 01:17–01:35, fresh Chrome profile `/tmp/tokyo-1104` with the bot's own fake data (no Showcase), desktop ~1280 px at 80 % zoom, Dark.
- **P2** = Pass 2 (01:37–), same profile, desktop, screen-driven (theme not restated).
- **P3** = Pass 3 (01:56–): ZIGi rows TK-048…055 ran in the **Fork-2 profile contaminated with Showcase data** (TK-047); NOVA and width rows in tokyo-1104; widths by zoom (358 / 782 / 835 px).
- **P4** = Pass 4 NOVA, tokyo-1104, desktop. **P5** = Pass 5, DevTools 375 px, Dark. **P6** = Pass 6, 1280 px Light. **6B** = 375 Light, 768 Light + Dark (first screen only).
- **P7/P8** = 1280×800 desktop, tokyo-1104 (theme —). **P9d…9k** = 03:51 onward, a NEW fresh profile (`/tmp/tokyo-1104` re-created 03:50) with re-seeded data; desktop unless a width is given; theme Nebula unless stated.
- Heavy box lag throughout (load up to ~73–90 on 8 cores; dropped/misrouted keystrokes); ids the bot flags as possible artefacts are marked.

## Counts
- New finding ids: **203** written ids (TK-001…TK-226 minus numbering gaps, plus TK-6B-01…10): BLOCKER 0 / MAJOR 24 / MEDIUM 14 / MINOR 60 / POLISH 29 / INFO-defect 2 / ENV-artefact 13 / see-file 1 / POSITIVE 60. Plus 29 screenshot-only ids (TK-004, 031, 032, 058, 059, 064–068, 076, 093–110), each mapped in the completeness check to the finding that cites it.
  - The bot's own §12 tally reads MAJOR 24, MEDIUM 13, MINOR 64, POLISH 28, POSITIVE 54, artefact 8, other 3, env 2. The differences: Pass 9k (TK-220…226) is not in the bot's tally. I count TK-085 and TK-209 as ENV and TK-073/077 as ENV (the bot calls them likely harness lag). I count mixed "POSITIVE with notes" entries and the four Info captures as POSITIVE, with their defect parts as N-TK notes. TK-143 (labelled MINOR, but the actual result was consistent) is POSITIVE.
- Old ids re-checked by the bot: **96 recheck rows + 10 pass-1 summary lines + 5 in-run re-checks**. Bot verdicts on the 96 rows: STILL OPEN 21 / CHANGED 16 (still wrong 8: W1, W7, W11, W25, M6, M10, M11, Z9; unverifiable or half-checked 2: W2, C1; ok 6: W3, P3, P7, M1, Z19, F5) / FIXED 8 / N/A 1 / NOT RETESTED 50 (20 of them have body evidence, noted per row).
- ZIGi/NOVA prompt ids: 53 prompts quoted inline → **41 failing or weak (FAIL 28, WRONG 5, WEAK 8) / 11 passing / 1 not evaluated (input artefact)**. Bot TSV tallies: ZIGi 44 rows OK 17 · WEAK 17 · WRONG 10 (Showcase-contaminated profile); NOVA + panel 24 rows OK 10 · WEAK 12 · WRONG 0 · n/e 2.
- Competitor-gap items: **37**.
- Proposed rows: **99** (P-TK-01…P-TK-73 defect rows; P-TK-74…P-TK-99 competitor rows).

## Findings
| id | sev | page > feature | problem (one line, concrete) | conditions | key | P-row |
|---|---|---|---|---|---|---|
| TK-001 | POSITIVE | Wealth > Add asset BTC/ETH | BTC first for "BTC"; BTC/ETH valued and in total ($43,762.72 exact); old BTC/ETH-omission FIXED | P1 | POSITIVE | keep |
| TK-002 | POLISH | Wealth > Add asset search | "ETH" ranks Tether/Tether Gold (substring in name) 5th/6th above bridged ETH tokens | P1 | SEARCH | P-TK-05 |
| TK-003 | MAJOR | Wealth > Accounts > Update balance | "1500,75" saved silently as EUR 1,500.00 (",75" dropped); dot works; asset qty "0,5" works (inconsistent). NB TK-140 later saw "1,5" → 1.50 in the add form | P1 | DECIMAL-INPUT | P-TK-06 |
| TK-005 | MINOR | Wealth > Accounts > add form | fast typing on fresh form saved name "S", no balance (state lost after 1st char); status line kept stale "S added." after rename (poss. lag) | P1 | PERSISTENCE | P-TK-07 |
| TK-006 | POSITIVE | Wealth > Net worth card | accounts + debts per currency exact (−€10,500.50); formula line shown | P1 | POSITIVE | keep |
| TK-007 | MINOR | Wealth > totals | hero "Total tracked wealth" = holdings only, ignores accounts/debts; no single combined net worth; EUR never converted (CHANGED) | P1 | NUMBERS-SOURCE | P-TK-08 |
| TK-008 | POSITIVE | Wealth > Import CSV > mapping | Name/Symbol auto-map FIXED; preset, undo; (defect note: "Account" column silently ignored → N-TK-01) | P1 | POSITIVE | keep |
| TK-009 | MAJOR | Wealth > Import CSV > preview | "6 rows refused (skipped)" with no row number or reason (cash rows, XYZ, negative, zero, huge, "1.234,56") | P1 | IMPORT-EXPORT | P-TK-10 |
| TK-010 | MINOR | Wealth > Import CSV > class | ETF → "Stocks", Vehicle → "Custom asset" | P1 | IMPORT-EXPORT | P-TK-10 |
| TK-011 | MINOR | Wealth > Import CSV > duplicates | identical row (AAPL 10 1850.40) imported twice, no warning | P1 | IMPORT-EXPORT | P-TK-10 |
| TK-012 | POSITIVE | Wealth > totals after import | per-currency totals exact (€289,200 / $64,173.52); (defect note: headline flips to EUR because EUR is larger → N-TK-02) | P1 | POSITIVE | keep |
| TK-013 | MAJOR | Wealth > Import CSV > metals | XAG silver imported as "Gold grams" ("50 grams of Gold"); "Gold bar 100g" qty 2 = "2 grams"; reference "Unavailable" | P1 | IMPORT-EXPORT+UNITS | P-TK-10 |
| TK-014 | MAJOR | Wealth > Edit asset > Valuation currency | free-text "XYZ" saved ("1,500 XYZ"), own currency bucket; CSV refuses XYZ but editor accepts (W5 STILL OPEN) | P1 | CURRENCY | P-TK-11 |
| TK-015 | MINOR | Wealth > Edit asset modal | triple-click+type dropped chars; "1234,56" then Save kept 1500 (decimal edit lost); poss. lag | P1 | PERSISTENCE+DECIMAL-INPUT | P-TK-07 |
| TK-016 | POSITIVE | Wealth > reload | all 13 items persist; timestamps/badges kept; "not a backup" banner | P1 | POSITIVE | keep |
| TK-017 | POSITIVE | Wealth > freshness + Refresh prices | >15 min flips to "need attention"; Refresh shows Refreshing…/updated; (defect note: badge only re-evaluated on reload/nav → N-TK-03) | P1, 01:16–01:32 | POSITIVE | keep |
| TK-018 | MAJOR | Settings > Export everything > wealth CSVs | wealth-positions.csv qty as 18-decimal integers, values in minor units, BTC/ETH value empty, "UNIT" assets, XYZ carried; accounts.csv minor units; not re-importable | P1 | IMPORT-EXPORT | P-TK-13 |
| TK-019 | POLISH | Wealth > Import template | template header "Description" vs dialog "Name"; "Account" has no destination | P1 | IMPORT-EXPORT+COPY | P-TK-10 |
| TK-020 | POSITIVE | Portfolio > first Buy | cost basis incl. fee, P&L maths, 2-dp prices, decimal comma accepted | P1 | POSITIVE | keep |
| TK-021 | MINOR | Portfolio > page notice + isolation | "Portfolio is off until you turn it on" banner on a fully working page; Portfolio BTC separate from Wealth BTC, two prices/timestamps, no link | P1 | NAV | P-TK-15 |
| TK-022 | ENV (POLISH) | Harness > typing lag | screens 5–20 s late, first "0,5" lost; bot did not count as app bug | P1 | ENV-ONLY | P-TK-16 |
| TK-023 | POSITIVE | Portfolio > Sell + realised P&L | realised/unrealised exact, header shows both (P3 FIXED); (defect note: Type list has no reward/airdrop/income → N-TK-04) | P2 | POSITIVE | keep |
| TK-024 | MAJOR | Portfolio > Sell > oversell error | oversell message at page TOP (600–1,200 px above, off-screen), no focus/aria-invalid; lingers; "Enter a quantity above zero." below Save shifts the button | P2 | FIELD-ERROR | P-TK-18 |
| TK-025 | POSITIVE | Portfolio > Remove tx | toast with Undo, totals revert, form kept (P7 part FIXED); (defect note → N-TK-05) | P2 | POSITIVE | keep |
| TK-026 | POSITIVE | Portfolio coin page > Edit tx | edit maths correct; FIFO/LIFO view with not-tax-advice; (defect note: Edit only on coin page/Insights → N-TK-05) | P2 | POSITIVE | keep |
| TK-027 | POLISH | Portfolio > edit form layout | Save is a 330×60 gradient block beside Type select; FIFO/LIFO radio labels on the line below, under the wrong dot | P2 | LAYOUT-DESKTOP | P-TK-21 |
| TK-028 | MINOR | Portfolio coin page > price block | "76841.77423078995 USD" raw float under chart vs header $77,136.52 at a different time; "+18.96 % between shown observations" unexplained | P2 | ROUNDING | P-TK-03 |
| TK-029 | MINOR | Portfolio > Analysis | headline $23,071.27 · 1:40 AM differs from Value card $23,140.95, no "as of" explanation; flat-then-spike line | P2 | NUMBERS-SOURCE | P-TK-02 |
| TK-030 | POLISH | Portfolio > Insights tab | "Insights" is only a transaction list (trader tools opt-in) | P2 | COPY | P-TK-22 |
| TK-033 | MAJOR | Markets > coin page (Wealth asset page) | BTC and SOL show the IDENTICAL sparkline/"Available" chart; raw "91.76606137716966 USD"; history ≠ header price; "+23.97 % between observations" vs 24h −0.32 %; only 24H/7D/30D/Available; SOL broken sparkline while loading; Owned filter resets after Back | P2 | NUMBERS-SOURCE | P-TK-04 |
| TK-034 | MINOR | Wealth > Add money | step 3 is a paragraph naming unseen UI ("More wallets", "Status & wallet sheet"), no Link-a-wallet button; no provider/fee info despite "Buy crypto with a card"; steps 2–3 appear below the fold with no scroll/focus | P2 | COPY+NAV | P-TK-23 |
| TK-035 | POSITIVE | Calculator | maths correct; every assumption written; compare chips; "Turn this into a goal" (C2 FIXED) | P2 | POSITIVE | keep |
| TK-036 | MINOR | Calculator > invalid years | whole results card replaced by a small "Correct the marked field" card, huge empty column, page jumps; value not clamped; slider jumps to end | P2 | FIELD-ERROR | P-TK-24 |
| TK-037 | MINOR | Today > wealth widgets | "Known tracked wealth" EUR 289,200 while a ~€1 T debt exists (debt only in Recent activity); no "as of" on USD chip; Life overview figure pops in 1–2 s; "Make Today yours" picker stays; "Today tracked wealth" wording | P2 | NUMBERS-SOURCE | P-TK-08 |
| TK-038 | MINOR | Wealth > Explain recorded wealth change | "Two valid observations on different days draw the chart." shown TWICE, no chart; summary text touches expanded paragraph; legalistic wording; "99 % unclassified" unverifiable | P2 | COPY | P-TK-27 |
| TK-039 | MAJOR | Wealth > Accounts, debts & net worth | hero "Known tracked wealth" and "Available for Goals" EUR 289,200 while EUR net worth is −€999,999,709,299.99 — two contradictory headlines; no debt warning; €999,999,999,999.99 debt accepted without plausibility note | P2 | NUMBERS-SOURCE | P-TK-08 |
| TK-040 | MAJOR | Wealth > asset cards reference price | AAPL/VOO/Gold "Reference price Unavailable" + Manual value while Markets prices them; BTC shows 4 prices in ~10 min; "2 of 2 current" though 5 matchable; on-load badge flicker (W26/W9/W10 STILL OPEN) | P2 | NUMBERS-SOURCE | P-TK-28 |
| TK-041 | MINOR | Wealth > Add asset (Cash) > amount limit | "Enter an amount up to a trillion." in small grey text BELOW Save, field not marked, Save jumps under pointer, no toast; browser autofill list covers amount; free-text currency box | P2 | FIELD-ERROR | P-TK-18 |
| TK-042 | POSITIVE | Wealth > Available for Goals huge value | $10,000,062,444.47 readable (W4 layout FIXED); (defect notes: headline currency flips EUR→USD, no save toast → N-TK-02, N-TK-06) | P2 | POSITIVE | keep |
| TK-043 | POSITIVE | Markets > unfavourite + reload | counter, star and Table view persist after F5 (M4/M7 FIXED); (defect note: row jumps under pointer, no toast → N-TK-07) | P2 | POSITIVE | keep |
| TK-044 | POLISH | Markets > first paint | 2–5 s of "Not provided" in 1h/7d/Mcap and purple stars before values fill; 24h values change after settle | P2 | PERF | P-TK-25 |
| TK-045 | POSITIVE | Markets > search this view | instant filter, honest empty state, clear restores (M3 FIXED) | P2 | POSITIVE | keep |
| TK-046 | MINOR | Markets > "Markets is off" banner | banner says Markets is off while page works and sidebar has no Markets entry; one flat 8-cap favourites list, no watchlists/alerts | P2 | NAV | P-TK-15 |
| TK-047 | ENV (MAJOR-process) | Harness > browser profile | browser tool bound to Fork-2 profile with Showcase data → 44 ZIGi rows contaminated | P3 | ENV-ONLY | P-TK-30 |
| TK-048 | MAJOR | ZIGi (Wealth/Portfolio) > BTC amount | Portfolio "How much BTC is in my portfolio?" → fallback; Wealth answer ignores Portfolio holding; BTC price mixes CoinGecko 79,922.09 (Oct 26) with Portfolio 65,000 "Showcase example" (Z4) | P3 Fork-2 (Showcase-contaminated) | AI-FACTS | P-TK-31 |
| TK-049 | MAJOR | ZIGi > intents | "What changed in my wealth?", crypto share, export, staked all get the net-worth paragraph; "ZIG staked" answers 300,000 held (Z2/Z3/Z5) | P3 Fork-2 | AI-FACTS | P-TK-32 |
| TK-050 | MAJOR | ZIGi (Portfolio) > worth/prices | portfolio worth 8,450 vs page 8,925.55; ETH 2,320.20 / 2,400 / 2,320.19; ZIG 0.06 vs Markets ~0.04145 (Z1/W26) | P3 Fork-2 | AI-FACTS | P-TK-31 |
| TK-051 | MINOR | ZIGi (Markets) > fallbacks | alert request, "price of Solana", typo "how mch eth do i hav", follow-ups "and in EUR?/and BTC?", "add 0.1 ETH", "sell 1 BTC" → generic fallback, no "can't do this" (Z9/Z10/Z11/Z12) | P3 Fork-2 | AI-FACTS | P-TK-32 |
| TK-052 | MAJOR | ZIGi (Portfolio) > BTC fallback | duplicate of TK-048 (bot says so) | P3 Fork-2 | AI-FACTS | P-TK-31 |
| TK-053 | MAJOR | ZIGi > question → write preview | "Explain my P&L" (Wealth, Portfolio) → fallback AND a "Water 1 L today" Save card (Z8) | P3 Fork-2 | AI-FACTS | P-TK-35 |
| TK-054 | MINOR | ZIGi > languages | Dutch price answered in Dutch (good); French gets English fallback with no language note | P3 Fork-2 | COPY | P-TK-34 |
| TK-055 | POSITIVE | ZIGi > advice/edge inputs | buy/sell refusals (Z14 FIXED), injection no leak, `<script>` escaped; (defect notes: slash popup 9 vs /help 10, 3,000-char echo, tax WEAK → N-TK-08/09/10) | P3 Fork-2 | POSITIVE | keep |
| TK-056 | MAJOR | Wealth > floating dock + mascot | Checklist FAB + ZIGi stack covers right edge of content/filter chips/asset cards (W20/Z18) | P3, ~782 px (80 % zoom), Light; 358 px | LAUNCHER-OVERLAP | P-TK-01 |
| TK-057 | MINOR | Markets/Wealth/Calculator > ~358 px | Light Calculator chart low-contrast cyan lines + unreadable milestone pill; mascot overlap on Markets | P3, ~358 px, Light/Dark/Nebula | THEME | P-TK-38 |
| TK-060 | see-file | ZIGi panel > ~358 px | "usable at ~358 px; see screenshot for chat height" (Z19 CHANGED) | P3, ~358 px | A11Y | P-TK-01 (verify only) |
| TK-069 | POSITIVE | More menu > theme switch | instant, persists across pages | P3, 358 px | POSITIVE | keep |
| TK-070 | POSITIVE | NOVA > no-key state | honest on-device mode, labelled answers, nothing sent before Enter | P3 tokyo-1104 | POSITIVE | keep |
| TK-071 | MAJOR | NOVA > net worth | −999,999,709,299.99 EUR printed unformatted in a sentence (huge test debt) | P3 tokyo-1104 | AI-FACTS+ROUNDING | P-TK-31 |
| TK-072 | POSITIVE | NOVA > buy advice | "Should I buy SOL?" refused with facts | P3 | POSITIVE | keep |
| TK-073 | ENV (MINOR) | NOVA > text input | "What's BTC price?" became "What's BTC pricaed?D" (likely xdotool lag) | P3 | ENV-ONLY | P-TK-16 |
| TK-074 | MINOR | NOVA > global shortcuts | typing while input unfocused fires single-key shortcuts, navigated to /app/music ("Opening the conversation…" stuck) | P3 | A11Y | P-TK-41 |
| TK-075 | POSITIVE | Add money > 835 px | clean in Light and Dark; (defect note: content column stops at ~580 px → N-TK-11) | P3, ~835 px, Light+Dark | POSITIVE | keep |
| TK-077 | ENV (MINOR) | NOVA > composer | partial text ("Por", "Tot", "B") auto-sent after 1–3 chars; newline inserted (probably delayed Enter replay) | P4 | ENV-ONLY+AI-STABILITY | P-TK-16 |
| TK-078 | MAJOR | NOVA > follow-up | "What is the price of ETH?" then "and in USD?" → generic fallback, no memory | P4 | AI-FACTS | P-TK-33 |
| TK-079 | MAJOR | NOVA > on-device coverage | "What changed?", "Portfolio P&L?", "Biggest holding?" → same generic list | P4 | AI-FACTS | P-TK-32 |
| TK-080 | POLISH | NOVA > BTC price output | Portfolio value "76,815.81474894208 USD" (17 digits) beside 76,815.80; three sources at same level | P4 | AI-FACTS+ROUNDING | P-TK-31 |
| TK-081 | POSITIVE | NOVA > price/holding/debts | cite source + time; 0.6 BTC across 2 holdings with Portfolio note; debts correct | P4 | POSITIVE | keep |
| TK-082 | POSITIVE | NOVA > buy advice | clear refusal with facts | P4 | POSITIVE | keep |
| TK-083 | MINOR | NOVA > tax question | "Do I owe tax on crypto?" → generic list, no out-of-scope reply | P4 | AI-FACTS | P-TK-32 |
| TK-084 | MINOR | NOVA > language | Dutch fallback says English-only; French gets English with no note | P4 | COPY | P-TK-34 |
| TK-085 | ENV (MEDIUM) | Whole app > input responsiveness | keystrokes dropped under load ("which coin moved most today" sent as "whio"); bot suggests profiling count-up/blur | P5, 375 px, Dark | ENV-ONLY+PERF | P-TK-16 |
| TK-086 | POSITIVE | Markets > desktop Dark | capture only, rendered OK | P5, desktop, Dark | POSITIVE | keep |
| TK-087 | POSITIVE | Portfolio > 375 Dark | capture only, no overflow | P5, 375, Dark | POSITIVE | keep |
| TK-088 | POSITIVE | Wealth > 375 Dark | capture only | P5, 375, Dark | POSITIVE | keep |
| TK-089 | POSITIVE | Wealth > 375 Dark | baseline capture | P5, 375, Dark | POSITIVE | keep |
| TK-090 | MINOR | Wealth > 375 > count-up | count-up number overlaps/clips mid-animation | P5, 375, Dark | MOTION | P-TK-42 |
| TK-091 | MINOR | Markets > 375 > mascot | ZIGi button clips intro text ("Brin…") | P5, 375, Dark | LAUNCHER-OVERLAP | P-TK-01 |
| TK-092 | MEDIUM | ZIGi panel on Markets > prompts | favourites, most-moved, ZIG holdings, portfolio summary, P&L, add 0.1 ETH → fallback; BTC alert → price list, alert ignored | P5, 375, Dark, tokyo-1104 | AI-FACTS | P-TK-32 |
| TK-111 | MINOR | Calculator > desktop Light | "10k" pill dark with near-illegible text; hero orb and rocket icon very faint | P6, 1280, Light | THEME | P-TK-38 |
| TK-112 | POSITIVE | Add money > desktop Light | no overflow; floats clear | P6, 1280, Light | POSITIVE | keep |
| TK-113 | MINOR | Portfolio BTC coin > desktop Light | hero/chart gradient block ends at x≈826 while column runs to ≈864 (hard edge); "Portfolio is off" banner | P6, 1280, Light | LAYOUT-DESKTOP | P-TK-43 |
| TK-114 | MINOR | Markets > desktop Light | same hero block edge 826 vs 864; "Markets is off" banner | P6, 1280, Light | LAYOUT-DESKTOP | P-TK-43 |
| TK-115 | MINOR | Portfolio > desktop Light | same hero block edge | P6, 1280, Light | LAYOUT-DESKTOP | P-TK-43 |
| TK-116 | MEDIUM | Wealth > desktop Light | chip "+ €289,200.00 held in EUR +1" touches/overflows the Available-for-Goals card edge; floats close to "Dismiss" | P6, 1280, Light | LAYOUT-DESKTOP | P-TK-44 |
| TK-117 | MEDIUM | Markets > star (table, As listed) | starring re-sorts the row immediately, the row under the pointer changes; second click hits a different asset | P7, 1280×800 | TOAST+CONFIRM-DELETE | P-TK-19 |
| TK-118 | MEDIUM | Markets > 9th favourite | star stays empty, no message at the row; only the hero card far above says "full" | P7, 1280×800 | TOAST | P-TK-19 |
| TK-119 | MINOR | Coin page SOL > Add favourite at limit | "Error: Your watchlist holds up to 8…" raw prefix, under buttons, shifts Price history ~46 px | P7, 1280×800 | TOAST | P-TK-19 |
| TK-120 | MINOR | Coin page SOL > Price history | header $91.77 vs history "91.71071695081086 USD" (15 dp), different observed times | P7, 1280×800 | ROUNDING | P-TK-03 |
| TK-121 | MAJOR | Wealth vs Markets > AAPL/VOO | Wealth AAPL $1,850.40 / VOO $2,100 "Reference price Unavailable · Manual value" while Markets prices them live (~44 % off); Gold bar "100g" holds "2 grams" | P7, 1280×800 | NUMBERS-SOURCE | P-TK-28 |
| TK-122 | MINOR | Routing > /app/calculator | "Page not found" (calculator is /app/wealth/calculator) | P7 | NAV | P-TK-45 |
| TK-123 | MAJOR (re-verify) | Wealth > Add account form | auto price refresh re-rendered page, scrolled to top, half-filled form lost (TK-139 could not reproduce) | P8, 1280×800 | PERSISTENCE | P-TK-07 |
| TK-124 | POSITIVE | Wealth > Property EUR | saved, EUR chip +350,000 exact | P8 | POSITIVE | keep |
| TK-125 | POSITIVE | Wealth > net worth EUR maths | house + mortgage + savings deltas exact | P8 | POSITIVE | keep |
| TK-126 | MINOR | Wealth > Add account > Balance | field accepts letters "Rainy" (no numeric filtering/inputmode) | P8 | DECIMAL-INPUT | P-TK-06 |
| TK-127 | MINOR | Wealth > net worth card | 15-digit values dominate the card; "Net worth · XYZ" column for an invented code | P8 | CURRENCY | P-TK-11 |
| TK-128 | POSITIVE | Wealth > Credit card debt | "Visa added.", debts/net worth correct | P8 | POSITIVE | keep |
| TK-129 | POLISH (re-verify) | Wealth > Edit debt row | Edit opens inline form without focus in Name; keys scroll the page | P8 | A11Y | P-TK-46 |
| TK-131 | POSITIVE | Wealth > seed totals | per-currency net worth correct (EUR 154,600) | P9d, new fresh profile | POSITIVE | keep |
| TK-132 | MEDIUM | Wealth > headline vs net worth | hero "Known tracked wealth" €355,800 (holdings only) vs Net worth €154,600; "Available for Goals" ignores the 200k mortgage; hero sentence confusing | P9d | NUMBERS-SOURCE | P-TK-08 |
| TK-133 | MINOR | Wealth > Add asset | no debt/mortgage route in Add asset; mortgage not linked to the property card | P9d | COPY | P-TK-47 |
| TK-134 | MEDIUM | Wealth > Add asset > Stocks AAPL | form is "CoinGecko tokenized RWA reference units", USD only, no "shares" wording or not-your-broker banner before saving | P9d | COPY | P-TK-48 |
| TK-135 | POLISH | Wealth > Add asset > quote currency | stocks USD only; EUR users get a separate "USD held" pill | P9d | CURRENCY | P-TK-09 |
| TK-136 | ENV (MINOR) | Wealth > performance | 4–10 s reactions, dropped chars; foreign Chrome window stole focus (confirmed) | P9d | ENV-ONLY | P-TK-16 |
| TK-137 | POSITIVE | Wealth > edit debt / archive asset | totals update correctly (archive Undo not observed) | P9d | POSITIVE | keep |
| TK-138 | MINOR | Wealth > Edit debt (TK-129 re-verify) | Name field still not autofocused (reproduces) | P9d | A11Y | P-TK-46 |
| TK-139 | INFO-defect (inconclusive) | Wealth > Add account (TK-123 re-verify) | form kept text after manual Refresh; auto-refresh tick not confirmed | P9d | PERSISTENCE | P-TK-07 |
| TK-140 | POSITIVE | Wealth > account balance edge inputs | "1,5" → 1.50; −50 refused; letters refused; 999,999,999,999 accepted (note: sanity cap → N-TK-12) | P9d | POSITIVE | keep |
| TK-141 | POSITIVE | Goals > Value goal with Wealth source | linked, 50 %, persists | P9e | POSITIVE | keep |
| TK-142 | POLISH | Goals > wizard preview/review | "10000 EUR" without separators (page later shows EUR 10,000.00) | P9e | ROUNDING | P-TK-50 |
| TK-143 | POSITIVE | Goals > allocation snapshot | Allocated 5,000 / Available 350,000 consistent (bot label MINOR/needs-confirm; no defect seen) | P9e | POSITIVE | keep |
| TK-144 | MINOR | Goals > Quantity goal | choosing BTC in step 1 doesn't offer to allocate the held 0.5 BTC → 0 of 50 BTC; (name split = lag artefact) | P9e | ALLOCATION (proposed) | P-TK-51 |
| TK-145 | POSITIVE | Goals > Project goal | 0 of 2 milestones, correct | P9e | POSITIVE | keep |
| TK-146 | MINOR (spec gap) | Goals > goal types | no "Reward" goal type (QA brief expected one) | P9e | HELP | P-TK-52 |
| TK-147 | POSITIVE | Today/Wealth > numbers | Today strip, hero, Allocated, Available, Net worth reconcile (caveat TK-132) | P9e | POSITIVE | keep |
| TK-148 | POLISH | Today > "Make Today yours" | onboarding card stays after goals exist; only "Keep Balanced and continue" | P9e | FIRST-RUN | P-TK-26 |
| TK-149 | MINOR | Wealth > Add asset name | 220-char paste cut silently to 100 mid-word, no counter/message | P9e | LIMITS | P-TK-53 |
| TK-150 | ENV (artefact) | Wealth > custom asset values | saved 100 / $100 instead of 1 / €100 (lag mis-entry, not re-verified) | P9e | ENV-ONLY | P-TK-16 |
| TK-151 | INFO-defect (blocked/spec gap) | Portfolio > second portfolio / transactions | bot found "only a view; no create-portfolio or buy/sell UI" in the new fresh profile — contradicts TK-020/023 (guess: page-off state on a fresh profile) | P9e, new fresh profile | NAV+FIRST-RUN | P-TK-15 |
| TK-152 | MINOR | Settings > export | only JSON "positions and goals" backup found; omits accounts/debts (Visa, mortgage), no note | P9e | BACKUP-RESTORE | P-TK-14 |
| TK-153 | POSITIVE | Markets > favourites | star/unstar/reload consistent, coin pages agree | P9f | POSITIVE | keep |
| TK-154 | MINOR | Markets > banner | "Markets is off until you turn it on" on a usable page, no sidebar entry | P9f | NAV | P-TK-15 |
| TK-155 | MINOR | Coin page > price history | SOL "91.01229059299905 USD", ETH "2243.318209751683 USD" vs header $90.54 / $2,236.29; times 4:19 vs 4:27 | P9f | ROUNDING | P-TK-03 |
| TK-156 | ENV (MINOR) | Coin page SOL > sparkline | 7-day sparkline in disconnected segments while "Loading observed prices" (poss. load timing) | P9f | NUMBERS-SOURCE | P-TK-04 |
| TK-157 | POSITIVE | Markets vs coin pages | ETH/SOL price and 24h match the table | P9f | POSITIVE | keep |
| TK-158 | POSITIVE | Add money > USDC | network defaults Base; fee "Ramp's figure as of 4:29"; stopped at wallet step | P9f | POSITIVE | keep |
| TK-159 | MINOR | Calculator > Starting amount | 26-digit number gets "An amount with up to two decimals…" (it is a size limit) | P9f | FIELD-ERROR+LIMITS | P-TK-24 |
| TK-160 | POSITIVE | Wealth > archive asset | confirm, Undo toast, stays archived after reload; (note: no Restore on detail → TK-166) | P9f | POSITIVE | keep |
| TK-161 | MAJOR | Global > 375 > floating button | ZIGi avatar+chevron overlaps content on every page: Wealth card ⋯ menu untappable, Markets intro/table, coin "Remove favourite", Goals card ring | P9f, 375 (DevTools) | LAUNCHER-OVERLAP | P-TK-01 |
| TK-162 | MINOR | Markets > table 375 | only name+price visible; 24h/7d/star off-screen behind a thin scrollbar | P9f, 375 | LAYOUT-375 | P-TK-55 |
| TK-163 | POSITIVE | 375 > Wealth/Goals/coin | no page overflow; headings wrap | P9f, 375 | POSITIVE | keep |
| TK-164 | MINOR | Wealth > Light | hero "€355,000.00" gradient fades ".00" to low-contrast lavender; orbit art washed out; rocket launcher nearly invisible | P9f, Light | THEME | P-TK-39 |
| TK-165 | POLISH | Settings > evening wrap-up | checkbox far left, detached from its label | P9f | LAYOUT-DESKTOP | P-TK-56 |
| TK-166 | MINOR | Wealth > archived asset detail | "Holding value: Unavailable", "Restore this asset from Wealth" with no Restore button | P9f | CONFIRM-DELETE | P-TK-54 |
| TK-167 | MINOR | Markets > floats 375/768 | tick + Z launchers hide ZIG star/"Current" badge, 7d/sparkline column, last chip, Gold price | P9g, 768 + 375 | LAUNCHER-OVERLAP | P-TK-01 |
| TK-168 | MINOR | Goals > cards 768 | tick FAB covers ⋯ menu and title of right-column card | P9g, 768 | LAUNCHER-OVERLAP | P-TK-01 |
| TK-169 | MINOR | Wealth/coin/Today > 768 | Z launcher covers "Available" value ("€0.0"), coin "Available for Goals", Today Checklist card edge | P9g, 768 | LAUNCHER-OVERLAP | P-TK-01 |
| TK-170 | POLISH | Markets > table 768/375 | sparkline column clipped; ETH 24h "−0 %" vs USDC "+0 %" | P9g, 768 + 375 | LAYOUT-768+ROUNDING | P-TK-55 |
| TK-171 | MINOR | Markets > banner on load | "Markets is off…" card appears above hero although Markets is on (poss. hydration flash) | P9g, 768 + 375 | NAV | P-TK-15 |
| TK-172 | POLISH | Coin page > sparkline 768 | BTC 7-day sparkline fills ~2/3 of card width | P9g, 768 | LAYOUT-768 | P-TK-57 |
| TK-173 | POSITIVE | Markets cards 375 / Today 375 | single column clean; (note: Today's focus grid uneven → N-TK-13) | P9g, 375 | POSITIVE | keep |
| TK-174 | MAJOR (UX) | Goals > edit target 0 | toast "Could not save." with no reason, no field highlight | P9g | FIELD-ERROR | P-TK-18 |
| TK-175 | POLISH | Goals > edit target −500 | toast-only "Enter a non-negative decimal amount." contradicts the 0 case | P9g | FIELD-ERROR | P-TK-18 |
| TK-176 | MINOR | Goals > edit target 999,999,999,999 | saved with no cap/warning | P9g, 768 | LIMITS | P-TK-49 |
| TK-177 | MINOR | Goals > Delete menu | Delete disabled with "has a plan or recorded contributions" though goal has no plan and €0 contributions | P9g | CONFIRM-DELETE | P-TK-59 |
| TK-178 | POSITIVE | Goals > complete Project goal | auto-completes, counts, persists | P9g | POSITIVE | keep |
| TK-179 | POLISH | Goals > delete Quantity goal | card ⋯ has no Delete; confirm renders below the fold; success toast says "Private Goal saved. No funds moved." | P9g | CONFIRM-DELETE+TOAST | P-TK-59 |
| TK-180 | POSITIVE | Wealth > edit Savings Test 5000→4000 | totals, NEEDS REVIEW, attention line correct; (note: asset "Your linked Goals" still 5,000 → TK-187) | P9g | POSITIVE | keep |
| TK-181 | MINOR | Wealth > linked goal after balance cut | allocation trimmed 5,000→4,000 without asking at save time | P9g | ALLOCATION (proposed) | P-TK-60 |
| TK-182 | MINOR | Wealth > debt Edit | only Save and Archive (no Delete); FAB covers "Yearly rate" at 768 | P9g, 768 | CONFIRM-DELETE | P-TK-54 |
| TK-183 | POLISH | Settings > theme caption | with Light selected caption still talks about Nebula | P9g, Light | COPY | P-TK-61 |
| TK-184 | POLISH | Settings > Your app 768 | sticky chip row ~110 px covers content; "Checklist button and Today card" checkbox oversized/unstyled over its label; Load Showcase Demo at top | P9g, 768 | LAYOUT-768 | P-TK-56 |
| TK-185 | POSITIVE | Light 768 > Wealth/Goals | readable, persists; (notes: Goals hero art stays dark; 2 console errors not investigated → N-TK-14, N-TK-15) | P9g, 768, Light | POSITIVE | keep |
| TK-186 | POSITIVE | Wealth > net worth after archive + reload | EUR 154,000 correct | P9h | POSITIVE | keep |
| TK-187 | MEDIUM | Wealth > asset page > Your linked Goals | top cards Allocated €4,000 but list says "5,000 EUR allocated" (stored vs effective) | P9h | ALLOCATION (proposed) | P-TK-60 |
| TK-188 | POSITIVE | Goals > value goal after cut | €4,000 / 40 %, NEEDS REVIEW, consistent | P9h | POSITIVE | keep |
| TK-189 | POSITIVE | Wealth > unarchive Visa | toast, debts and net worth restore immediately | P9h | POSITIVE | keep |
| TK-190 | POLISH | Wealth > archived item naming | per-item "Restore" collides with backup "Restore"; suggest "Unarchive"; no "Archived" badge in hero | P9h | CONFIRM-DELETE+COPY | P-TK-54 |
| TK-191 | MINOR | Console > reload Wealth/Markets/Goals | Permissions-Policy "Unrecognized feature: 'bluetooth'"; manifest enctype warning; beforeinstallprompt info | P9h | CONSOLE (proposed) | P-TK-63 |
| TK-192 | POSITIVE | Wealth > add ETH (EUR quote) + savings | totals and counts correct | P9h | POSITIVE | keep |
| TK-193 | POSITIVE | Goals > value goal from two sources | 87 %, allocations correct | P9h | POSITIVE | keep |
| TK-194 | POLISH | Goals > source picker | fully allocated "Savings Test" shown with same weight (Available 0 not shown); review lines stacked without separator | P9h | ALLOCATION (proposed) | P-TK-51 |
| TK-195 | POSITIVE | Wealth > archive allocated asset | dialog lists released allocations; toast honest | P9h | POSITIVE | keep |
| TK-196 | MEDIUM | Goals > after allocated asset archived | goal drops to €3,992.81 with no review flag/note (other path gets NEEDS REVIEW) | P9h | ALLOCATION (proposed) | P-TK-60 |
| TK-197 | POSITIVE | Wealth > USD cash | own USD bucket, no conversion, correct | P9h | POSITIVE | keep |
| TK-198 | MEDIUM | Wealth > custom asset in GBP | free-text currency accepted (any code), new "Net worth · GBP" card (honest separate totals = positive part) | P9h | CURRENCY | P-TK-11 |
| TK-199 | POLISH | Wealth > currency formatting | "500.00 GBP" code suffix while USD/EUR use symbols; free-text box accepts any code silently | P9h | CURRENCY | P-TK-11 |
| TK-200 | ENV (MINOR) | Wealth > add-asset typing | name text landed in Quantity under lag; browser autofill history pops over Total value (needs autocomplete=off) | P9h | DECIMAL-INPUT | P-TK-06 |
| TK-201 | POSITIVE | Wealth > AAPL/VOO/XAU reference (TK-121/040 recheck) | newly added via Stocks/ETFs/Metals tabs: "Tokenized reference price", Current, = Markets; duplicate guard "You already track AAPL" | P9i | POSITIVE | keep |
| TK-202 | MINOR | Apple asset page > Price history (W8/M12) | "328.4436332819673 USD" observed 4:00 vs header $328.46 updated 5:01 — three values/timestamps | P9i | ROUNDING | P-TK-03 |
| TK-203 | POLISH | Markets/Add asset > Gold icon (M10) | Gold uses Tether-Gold-style logo in Markets/search but generic icon on Wealth; VOO "V" vs generic square | P9i | COPY | P-TK-48 |
| TK-204 | MINOR | Markets > table headers (M2) | clicking "Price" header does nothing; sort only via dropdown | P9i (one click under lag) | A11Y | P-TK-66 |
| TK-205 | MINOR | Markets > Refresh market data (M9) | no toast/spinner/"updated" text after click (probable; lag) | P9i | TOAST | P-TK-67 |
| TK-206 | POSITIVE | Markets > Find a market "btc" (M1) | Bitcoin first, look-alikes flagged; (residual notes → N-TK-16) | P9i | POSITIVE | keep |
| TK-207 | POLISH | Markets > banner | "Markets is off…" wording implies disabled page | P9i | NAV | P-TK-15 |
| TK-208 | MEDIUM | Wealth vs Markets > BTC (W26) | Wealth $76,250.90 "Needs refresh" vs Markets $76,578.87 "Current" same minute; status flips by itself | P9i | NUMBERS-SOURCE | P-TK-02 |
| TK-209 | ENV (MEDIUM) | Wealth > Brokerage CSV import | dialog closed itself after picking a file, 4 tries (later confirmed as TK-216) | P9i | IMPORT-EXPORT | P-TK-68 |
| TK-210 | ENV (POLISH) | Today > 375 | hero oversized/clipped in emulation (later confirmed as TK-224) | P9i, 375 | LAYOUT-375 | P-TK-64 |
| TK-211 | POSITIVE | Light 1280 > Wealth/Markets/BTC/Goals | readable; (notes: count-up overlapping digits, sidebar foot gradient, Goals hero art dark → N-TK-14, N-TK-17) | P9j, 1280, Light | POSITIVE | keep |
| TK-212 | MEDIUM | BTC asset page > Price history (M12) | header $76,578.87; loading placeholder 76532.5548268051; observed 76722.11997653291 at 5:17 vs header 5:09 | P9j | NUMBERS-SOURCE | P-TK-02 |
| TK-213 | MINOR | BTC asset page > Price history format | "76722.11997653291 USD" no separators, 14 dp | P9j | ROUNDING | P-TK-03 |
| TK-214 | POLISH | Markets > banner | "Markets is off…" above a working page | P9j | NAV | P-TK-15 |
| TK-215 | POLISH | BTC asset page > ranges (M11) | only 24H/7D/30D/Available; no 90D/1Y | P9j | NUMBERS-SOURCE | P-TK-04 |
| TK-216 | MEDIUM | Wealth > Add asset > Import CSV (TK-209 retry) | after choosing the file the dialog closes, no preview/merge, nothing imported; reproduced repeatedly, not lag | P9j | IMPORT-EXPORT | P-TK-68 |
| TK-217 | ENV (MINOR) | Sidebar | Earn/Markets/Staking/Portfolio/Ecosystem, NOVA/Checklist appear and disappear between loads (poss. state artefact) | P9j | NAV | P-TK-15 |
| TK-218 | POSITIVE (recheck) | Calculator C1 | 1,000/5.29 %/3 y = $1,171.58 monthly compounding, stated; Earn wording not compared (C1 CHANGED) | P9j | POSITIVE | keep |
| TK-219 | ENV (POLISH) | Calculator inputs | typed values dropped/reverted under lag | P9j | ENV-ONLY | P-TK-16 |
| TK-220 | POSITIVE | Settings > Appearance | Nebula shown selected | P9k | POSITIVE | keep |
| TK-221 | POSITIVE | Staking > calculator (C3) | prefilled, maths correct, simple-APR footnote | P9k | POSITIVE | keep |
| TK-222 | MEDIUM | Staking calc vs Wealth calc | same 5 % gives simple APR vs monthly compounding, no cross-reference | P9k | COPY | P-TK-69 |
| TK-223 | POSITIVE | Staking calc > edge inputs | 0/−5/abc handled, no NaN; (note: field visibly accepts "-" and letters → N-TK-18) | P9k | POSITIVE | keep |
| TK-224 | MEDIUM | Today > 375 | "PUBLIC ALPHA" chip renders as huge "PUBLIC / MOVES" cut off; eyebrow, hero title, lede cut on the right, no wrap; checklist button half clipped; reproduces after F5 | P9k, 375×985 DevTools | LAYOUT-375 | P-TK-64 |
| TK-225 | POSITIVE | Wealth > reload drift | drift explained by live prices; net worth not re-read | P9k | POSITIVE | keep |
| TK-226 | POLISH | Today > top notice | "A saved allocation exceeds its current source balance…" has no dismiss | P9k | ALLOCATION (proposed) | P-TK-60 |
| TK-6B-01 | MAJOR | All 6 pages > 375 Light | ZIGi mascot (y≈580–700) covers Markets intro, Wealth "Allocated to Goals", Portfolio Value, BTC "Unrealized result" digits, Add money step-1 copy, Calculator disclaimer | 6B, 375, Light | LAUNCHER-OVERLAP | P-TK-01 |
| TK-6B-02 | MAJOR | All 6 pages > 768 Light+Dark | Checklist + ZIGi stack over right edge of Wealth tiles, Portfolio Value, Markets "ETFs" chip and "7d" header, BTC card, Add money cards, Calculator assumptions/"10k" | 6B, 768, Light + Dark | LAUNCHER-OVERLAP | P-TK-01 |
| TK-6B-03 | MINOR | Markets/Portfolio/BTC > all widths | "X is off until you turn it on" card above a working page, ~80 px | 6B, all | NAV | P-TK-15 |
| TK-6B-04 | MINOR | Markets > 375 Light | filter chip row clipped ("Crypto"), no scroll cue | 6B, 375, Light | LAYOUT-375 | P-TK-55 |
| TK-6B-05 | MINOR | Shell > 375 Light | mobile PUBLIC ALPHA banner drops "records stay in this browser and are not a backup" (shown at 768) | 6B, 375 vs 768, Light | COPY | P-TK-65 |
| TK-6B-06 | MINOR (data) | Portfolio + BTC coin > 768 | same 3:01 AM stamp shows 24h −0.41 % (Light) vs +0.1 % (Dark); change updates, stamp doesn't | 6B, 768, Light vs Dark, ~03:01 | NUMBERS-SOURCE | P-TK-02 |
| TK-6B-07 | POLISH | Wealth > total | gradient switches colour mid-number ("…062," dark, "478.74" lighter); low contrast in Light | 6B, 375 Light, 768 Light+Dark | THEME | P-TK-39 |
| TK-6B-08 | POLISH | Wealth > headline 768 | orphan word "view." | 6B, 768, Light+Dark | LAYOUT-768 | P-TK-44 |
| TK-6B-09 | POLISH | Light > all pages | ghost buttons ("Hide amounts", "← Wealth", Rename/Delete) and pale hero art below ~3:1 non-text contrast | 6B, 375/768, Light | A11Y+THEME | P-TK-40 |
| TK-6B-10 | POLISH | Calculator > 375 Light | disclaimer twice; second partly under the FAB | 6B, 375, Light | COPY | P-TK-70 |

## Old ids re-checked
Recheck-list rows (96) first, then pass-1 summary lines and in-run re-checks. "Body:" = evidence from tokyo.md where the list cell is blank.

| old id | bot verdict | one line | conditions | key | P-row | earlier closing row (R2) |
|---|---|---|---|---|---|---|
| W1 (BUG-085, BUG-063, B-002, M-041, M-077, C-015, N-074, N-181, B-020) | CHANGED-but-wrong | BTC/ETH now included (pass 1 FIXED); labels consistent; USD kept separate and debts excluded from the headline (TK-037/039/132) | P1–P9 | NUMBERS-SOURCE | P-TK-08 | TR1 Fixed (`0dc8ae4d`, M16), M19; ZI3. Not reopened (TR1 symptom fixed; new headline-vs-net-worth contradiction) |
| W2 (B-007, M-078) | CHANGED (unverifiable) | empty state, no 2 days of history (TK-038) | P2 | COPY | P-TK-27 | TR5 / TR13 Fixed |
| W3 (B-008, BUG-074, M-079, N-196) | CHANGED-ok | "Manual value" badge clearly shown (TK-040) | P2 | POSITIVE | keep | TR5 Fixed |
| W4 (BUG-027, B-036, N-126, T-060, T-081, D-054) | FIXED | trillion limit + readable "Available for Goals" (TK-041/042); pass 1 said STILL OPEN (a €999,999,999,999.99 debt is under the limit) | P2 | LIMITS | keep (debt plausibility → P-TK-49) | VA2–VA4 / M23 |
| W5 (L-015, T-061, D-080) | STILL OPEN | XYZ via Edit asset gets its own net-worth card (TK-014/039/127) | P1–P8 | CURRENCY | P-TK-11 | WE6 Fixed (`351c51c5`, "currencies from the list only") — **REOPENED**: list applied to accounts/CSV; asset editor's free-text "Valuation currency" box missed |
| W6 (N-135, N-152) | NOT RETESTED (body: €999,999,999,999.99 debt and 999,999,999,999 balance accepted without warning, TK-039/140) | — | P2, P9d | LIMITS | P-TK-49 | VA1 (N-135) Fixed; M23 |
| W7 (B-033, M-109, L-014, D-054, M-108) | CHANGED-but-wrong | limit message exists but below Save, field unmarked, no toast (TK-041/042) | P2 | FIELD-ERROR | P-TK-18 (toast: P-TK-29) | VA1/C1 (`cd216935`, "assets… mark and focus the field"), WE14 (M-108), VA4 — **REOPENED**: add-asset dialog's amount limit not routed through the field-error path |
| W8 (BUG-007, BUG-028, T-090, T-142, D-053, D-147, D-176, M-010, M-086, N-025, N-193) | STILL OPEN | raw "76841.77423078995 USD" on coin/asset pages (TK-028/033/155/202/213); pass 1: FIXED in Wealth cards + Portfolio | P2–P9j | ROUNDING | P-TK-03 | TR4 / B2 Fixed (M17 formatPrice) — **REOPENED**: formatPrice used in lists/cards; price-chart's "observed price" line and loading placeholder print the raw number |
| W9 (B-004, B-015, T-092, T-117, L-012, L-047, D-001, D-095, D-151, D-243, M-051, N-026, N-054, N-122, N-194, C-012, C-013, T-038) | STILL OPEN | 15-min rule works (pass 1 FIXED, TK-017) but badge flickers on load and Wealth/Markets disagree on "Current" (TK-040/208) | P1–P9i | STALE-DATA | P-TK-12 | TR2 Fixed — **REOPENED (partial)**: rule right, evaluation only on load/nav and per page |
| W10 (D-200, D-262, N-016, N-055) | STILL OPEN | totals/prices change after load with no skeleton or "updated" (TK-040/044) | P2 | PERF | P-TK-25 | TR2, WE4 (`8a7e9727`), LA8 — **REOPENED**: no loading state for the settle |
| W11 (D-145, D-221, M-042, L-069, B-032) | CHANGED-but-wrong | counts consistent ("2 of 2"), reason for AAPL/VOO "Unavailable" not given (TK-040); later "1 short of what Goals hold" does name a reason (TK-180) | P2 | STALE-DATA | P-TK-12 | WE5 Fixed (`351c51c5`) |
| W12 (N-030, B-034, L-085, D-057, D-214) | NOT RETESTED (body: headline currency flips with data, TK-012/042) | — | P1–P2 | CURRENCY | P-TK-09 | TR7 Fixed (hidden, owner amendment 6, M19) — protected decision (ADR-036 list) |
| W13 (L-072, D-078, D-237, T-102) | NOT RETESTED (body: refused rows without reasons TK-009; dialog closes after file pick TK-216) | — | P1, P9j | IMPORT-EXPORT | P-TK-10 | WE3 Fixed (`351c51c5`, "reasons per row") — **REOPENED**: Wealth holdings preview shows only the count |
| W14 (L-073) | NOT RETESTED | formula name | — | IMPORT-EXPORT | — | WE3 Fixed |
| W15 (T-143, M-058, D-079) | NOT RETESTED (body: BTC/Bitcoin first; "ETH" substring noise TK-002; VOO only look-alikes in Crypto tab TK-206) | — | P1, P9i | SEARCH | P-TK-05 | WE1 Fixed (M34) |
| W16 (BUG-045) | NOT RETESTED | focus trap | — | A11Y | — | — |
| W17 (BUG-047) | NOT RETESTED | nested interactive | — | A11Y | — | LA7 |
| W18 (T-096, N-145) | NOT RETESTED | add-asset padding at 375 | — | LAYOUT-375 | — | WE10 Fixed |
| W19 (B-026, B-030) | NOT RETESTED | mobile heading/net worth | — | LAYOUT-375 | — | WE10 Fixed |
| W20 (D-122, L-087) | STILL OPEN | dock/mascot cover content (TK-056) | P3 ~782 Light; 375/768 | LAUNCHER-OVERLAP | P-TK-01 | LA1 "Already fixed" (M45: "nothing stays covered at a page's end"); AK R20 (gutter ≥1280 only) — **REOPENED**: fixed at page end and ≥1280 px only |
| W21 (D-055) | NOT RETESTED | asset menu items | — | CONFIRM-DELETE | — | WE14 Fixed |
| W22 (D-148) | NOT RETESTED (body: manual metals/stock cards still show "Reference price … Unavailable", TK-013/040) | — | P1–P2 | NUMBERS-SOURCE | P-TK-28 | WE14 Fixed |
| W23 (D-146) | NOT RETESTED | Earn nudge copy | — | COPY | — | — |
| W24 (B-020, M-080) | NOT RETESTED (body: allocation trimmed without asking TK-181, stored vs effective TK-187, no flag after archive release TK-196) | — | P9g–P9h | ALLOCATION | P-TK-60 | TR11 Fixed (M-080) — **REOPENED (partial)**: status from saved allocations, but the asset page and archive path show/handle the stored figure |
| W25 (M-125, T-001) | CHANGED-but-wrong | disclaimer "sells nothing" present; no explicit real-money/alpha warning; step 3 dead end (TK-034) | P2 | COPY | P-TK-23 | WE8 Fixed (`8a7e9727`) |
| W26 (BUG-059, N-066, D-083) | STILL OPEN | 4 BTC prices; AAPL/VOO/Gold "Unavailable" (TK-040); BTC Wealth vs Markets same minute (TK-208). TK-201: AAPL/VOO/XAU added via market tabs now match Markets | P2–P9i | NUMBERS-SOURCE | P-TK-02 | TR3 / B1 Fixed (`0dc8ae4d`, `05037e8b`) — **REOPENED**: one quote service, but each page keeps its own fetch time and the asset page reads a separate observation series |
| C1 (B-010, B-021) | CHANGED (TK-218; Earn wording not compared) | calculator states monthly compounding; staking calc says simple APR, no cross-reference (TK-222) | P9j–P9k | COPY | P-TK-69 | TR14 Fixed (`521dba16`) |
| C2 (N-029) | FIXED | $13,000 put in, assumptions visible (TK-035) | P2 | POSITIVE | keep | TR14 Fixed |
| C3 (N-027, T-129, B-022) | NOT CHECKED in list; body CHANGED-ok (TK-221) | staking calculator usable, simple APR | P9k | POSITIVE | keep | ST3 |
| G1 (L-078, M-121, D-201) | NOT VERIFIED | no wallet in profile | — | CURRENCY | — | TR7 Fixed (hidden) |
| G2 (T-070) | N/A | long name fit (TK-037) | P2 | POSITIVE | keep | — |
| G3 (M-133, M-045, T-098) | NOT CHECKED | — | — | LAYOUT-DESKTOP | — | TO7 |
| P1 (BUG-006, N-008, D-155) | NOT RETESTED (body: ZIGi mixes Portfolio 65,000 Showcase price TK-048/050 — contaminated profile; 24h vs stamp TK-6B-06) | — | P3 Fork-2; 6B 768 | NUMBERS-SOURCE | P-TK-02 | TR3 / B1 Fixed |
| P2 (N-007) | FIXED | ZIG priced | — | POSITIVE | keep | — |
| P3 (N-147, T-126, Feature #21) | CHANGED-ok (TK-023 says FIXED) | realised + unrealised in header | P2 | POSITIVE | keep | WE2 / WE18 |
| P4 (BUG-001, D-081) | NOT RETESTED | absurd quantities | — | LIMITS | — | WE2, M23 |
| P5 (T-073, D-081, N-161) | NOT RETESTED; body: reward/airdrop type not found (TK-023 "P5 part STILL OPEN") | — | P2 | COPY | P-TK-17 | J15 Built (ADR-034, `b0e44cb2`, "Received as" under Transfer in) — **REOPENED?** feature exists one level down (`transaction-form.tsx` shows "Received as" only for Transfer in); bot looked in Type list |
| P6 (BUG-003, L-044, L-016) | STILL OPEN | oversell error off-screen at top (TK-024) | P2 | FIELD-ERROR | P-TK-18 | VA1/C1 + VA6 Fixed (`cd216935`, M24); WE2 — **REOPENED**: Portfolio transaction form not on the field-error path |
| P7 (BUG-032, N-013, N-043, N-044) | CHANGED-ok (partial) | Undo + Edit on coin page/Insights; list row Remove only (TK-025/026/030) | P2 | CONFIRM-DELETE | P-TK-20 | A5 / DS5 / WE2 Fixed |
| P8 (T-072, T-101, T-127, N-123) | NOT RETESTED (body: oversell message lingered after next action, TK-024) | — | P2 | FIELD-ERROR | P-TK-18 | — |
| P9 (T-127) | NOT RETESTED | portfolio name cut | — | LIMITS | — | VA4 |
| P10 (T-100, N-099, N-100) | NOT RETESTED | — | — | IMPORT-EXPORT | — | WE3 |
| P11 (N-101) | NOT RETESTED | — | — | SEARCH | — | — |
| P12 (N-146, N-165) | NOT RETESTED | — | — | A11Y | — | WE2 |
| P13 (BUG-048, L-080) | NOT RETESTED | — | — | A11Y | — | LA7 |
| P14 (BUG-051, L-048) | NOT RETESTED (body: Portfolio 375 Dark no overflow, TK-087) | — | P5 375 | LAYOUT-375 | — | — |
| P15 (N-042, N-033) | NOT RETESTED (body: export present but unreadable/not re-importable TK-018; JSON backup omits accounts/debts TK-152) | — | P1, P9e | IMPORT-EXPORT | P-TK-13 | DS6 / A2 Fixed (`749e2d75`) |
| P16 (D-213) | NOT RETESTED (body: Markets "Not provided" flash, TK-044) | — | P2 | PERF | P-TK-25 | LA8 Fixed |
| P17 (D-124, D-196) | NOT RETESTED (body: 768 stack covers Portfolio/Markets, TK-6B-02) | — | 6B 768 | LAUNCHER-OVERLAP | P-TK-01 | LA1 |
| M1 (BUG-029, T-074, L-032, D-051, N-023, N-206) | CHANGED-ok | Bitcoin first, unverified flagged; noise remains (TK-206) | P9i | SEARCH | P-TK-05 | WE1 Fixed (M34) |
| M2 (BUG-030, N-191) | STILL OPEN | header click does nothing, no aria-sort (TK-204) | P9i | A11Y | P-TK-66 | WE1 (BUG-030) / WE13 (N-191) Fixed — **REOPENED**: closed under rows that never added header sorting |
| M3 (L-031) | FIXED | view search filters (TK-045) | P2 | POSITIVE | keep | WE13 |
| M4 (N-009, N-024, N-207, L-064, D-108, D-223) | FIXED (message + toast on 9th, TK-032) — but TK-118/119 later: no message at the row, raw "Error:" prefix | — | P2; P7 | TOAST | P-TK-19 | WE12 Fixed — **REOPENED (partial)**: hero-card message only |
| M5 (N-200) | NOT RETESTED | reorder | — | COMPETITOR-GAP | — | WE12 |
| M6 (N-192) | CHANGED-but-wrong | Owned/Favourites distinct; Owned resets to All after Back (TK-033) | P2 | PERSISTENCE | P-TK-73 | WE13 Fixed ("layout and ranges remembered") — **REOPENED (partial)**: filter chip not remembered |
| M7 (T-105, T-117) | FIXED | Table persists (TK-031/043) | P2 | POSITIVE | keep | WE13 |
| M8 (BUG-031, B-012) | NOT RETESTED | — | — | COUNTS | — | TR6 |
| M9 (BUG-069, D-096, N-197) | STILL OPEN | Refresh market data gives no feedback (TK-205) | P9i | TOAST | P-TK-67 | WE4 Fixed (`8a7e9727`), F5 — **REOPENED**: Wealth "Refresh prices" fixed (TK-017), Markets' button not |
| M10 (L-063, T-040) | CHANGED-but-wrong | labels honest; Gold logo token-style in Markets vs generic on Wealth (TK-203) | P9i | COPY | P-TK-48 | WE9 Fixed ("no token logo for metals") — **REOPENED (partial)**: Markets/search rows still show it |
| M11 (N-195) | CHANGED-but-wrong | coin page opens; ranges 24H/7D/30D/Available only (TK-033/215) | P2, P9j | NUMBERS-SOURCE | P-TK-04 | WE13 Fixed |
| M12 (N-194) | STILL OPEN | 3 prices + timestamps on one coin page (TK-033/040/212) | P2–P9j | NUMBERS-SOURCE | P-TK-02 | TR2 Fixed (N-194) — **REOPENED** |
| M13 (N-196) | NOT RETESTED (body: AAPL asset page raw history value, TK-202) | — | P9i | ROUNDING | P-TK-03 | TR5 |
| M14 (D-215) | NOT RETESTED (body: TK-120, "−0 %" TK-170) | — | P7, P9g | ROUNDING | P-TK-03 | TR4 / WE13 |
| M15 (T-006, N-047, Feature #24) | NOT RETESTED (see F7) | — | — | COMPETITOR-GAP | P-TK-85 | WE17/J11 |
| M16 (D-187) | NOT RETESTED | — | — | COPY | — | — |
| Z1 (B-002, Z-001) | STILL OPEN | net worth answer (TK-050 context) | P3 Fork-2 (Showcase-contaminated) | AI-FACTS | P-TK-31 | ZI3 / G7 Fixed (`83055397`) — **REOPENED** (caveat: contaminated profile) |
| Z2 (Z-007) | STILL OPEN | crypto share → net-worth text (TK-049) | P3 Fork-2 | AI-FACTS | P-TK-32 | ZI2 Fixed — **REOPENED**: ZI2 added other natural questions, not this one |
| Z3 (Z-023) | STILL OPEN | "ZIG staked" → holdings (TK-049) | P3 Fork-2 | AI-FACTS | P-TK-32 | ZI12 Fixed ("staking answers") — **REOPENED** |
| Z4 (Z-095) | STILL OPEN | Portfolio BTC → fallback (TK-048) | P3 Fork-2 | AI-FACTS | P-TK-31 | ZI3 Fixed ("Portfolio (separate from Wealth)") — **REOPENED**: works for ETH-by-name; "in my portfolio" phrasing on Portfolio falls back |
| Z5 (Z-070) | STILL OPEN | export → net-worth text (TK-049) | P3 Fork-2 | AI-FACTS | P-TK-32 | ZI2 — **REOPENED** |
| Z6 (Z-086) | NOT TESTED | — | — | AI-FACTS | — | — |
| Z7 (BUG-054, Z-065, Z-075, M-002, M-087, M-088, N-063) | NOT TESTED | — | — | AI-FACTS | — | ZI2 / G2 Fixed |
| Z8 (N-010, BUG-057, L-004, T-066, N-018, N-075) | STILL OPEN | "Explain my P&L" → Water 1 L preview (TK-053) | P3 Fork-2 | AI-FACTS | P-TK-35 | ZI1 / G1 Fixed (`83055397`, decline.ts) — **REOPENED**: guess "P&L" ends in "L" and is parsed as 1 litre by the quick-log parser |
| Z9 (L-052, T-006) | CHANGED-but-wrong | price answered (stale 9-day date); alert request → fallback (TK-051) | P3 Fork-2 | AI-FACTS | P-TK-32 | ZI12 Fixed; WE17 |
| Z10 (N-064) | STILL OPEN | "worth in EUR" / "and in EUR?" → fallback (TK-051) | P3 Fork-2 | AI-FACTS | P-TK-31 | ZI3 Fixed ("in euros answered per currency") — **REOPENED** |
| Z11 (BUG-056) | STILL OPEN | "how mch eth do i hav" → fallback (TK-051) | P3 Fork-2 | AI-FACTS | P-TK-33 | G4 Fixed (`79670c8c`) — **REOPENED** |
| Z12 (BUG-055) | STILL OPEN | follow-ups no context (TK-051, TK-078) | P3 Fork-2; P4 | AI-FACTS | P-TK-33 | G4 Fixed — **REOPENED** |
| Z13 (BUG-038, L-003) | STILL OPEN | 3,000-char input echoed in full (TK-055) | P3 Fork-2 | AI-STABILITY | P-TK-37 | ZI15 / G5 Fixed ("fold after 600 chars") — **REOPENED?** guess: fold applies to model answers, not the device echo |
| Z14 (D-092, D-061, D-242) | FIXED | buy/sell refusals (TK-055/072/082) | P3, P4 | POSITIVE | keep | ZI10 / ZI8 Fixed |
| Z15 (D-160, D-256) | NOT RE-CHECKED (TK-070 copy consistent on NOVA) | — | P3 | COPY | — | ZI7 Fixed |
| Z16 (D-059) | NOT TESTED | — | — | AI-FACTS | — | ZI9 Fixed |
| Z17 (N-067) | NOT TESTED | — | — | AI-CONNECTION | — | ZI4 Fixed |
| Z18 (BUG-081, BUG-034, B-027, D-066, D-070, D-250, D-254, M-012, M-072, N-051, N-173, T-069, T-130, T-136, T-144, T-145, L-087) | STILL OPEN | launcher stack covers content (TK-056/161/167–169/6B-01/02) | 375, 768, ~782 | LAUNCHER-OVERLAP | P-TK-01 | LA1 "Already fixed" (M45), AK R20 / FR-19, H125/H137 recorded (ADR-036 d) — **REOPENED**: fixed for page end and ≥1280 px; phone/tablet mid-page overlap remains |
| Z19 (D-131, D-067, M-073) | CHANGED-ok | panel usable at ~358 px (TK-060) | P3 358 | POSITIVE | keep | ZI6 Fixed |
| Z20 (L-088, M-090, D-032) | NOT TESTED | — | — | A11Y | — | ZI6 Fixed |
| Z21 (N-203, D-240) | NOT TESTED | — | — | AI-FACTS | — | ZI9 |
| F1 (#11 bank sync) | NOT RETESTED (missing list: no bank sync) | — | — | COMPETITOR-GAP | P-TK-77 | — |
| F2 (#12 exchange import) | CHANGED-ok (TK-030: read-only Kraken/Coinbase/Binance connectors) | — | P2 | POSITIVE | keep | J14 Built (ADR-034) |
| F3 (#16 budgets) | NOT RETESTED (TK-040 saw "sections for spending") | — | — | COMPETITOR-GAP | — | DE5/J18 |
| F4 (#17 bills) | NOT RETESTED | — | — | COMPETITOR-GAP | — | — |
| F5 (#21 realised vs unrealised) | CHANGED-ok (TK-023) | — | P2 | POSITIVE | keep | WE18 / WE21 |
| F6 (#23 dividends) | NOT RETESTED | — | — | COMPETITOR-GAP | — | — |
| F7 (#24 price alerts) | STILL OPEN | no alerts on Wealth/Markets/coin pages (TK-046) | P2 | COMPETITOR-GAP | P-TK-85 | WE17/J11; AJ item 15 / D9 built — **REOPENED (partial)**: the alert form lives only on a goal's page (`tracked-detail.tsx`), none on Markets or coin pages |
| F8 (#30 tax report) | CHANGED-ok (TK-030: "Realised gains by year (CSV)") | — | P2 | POSITIVE | keep | WE18 |
| F9 (#33 sharing) | NOT RETESTED | — | — | COMPETITOR-GAP | P-TK-82 | — |
| F10 (#40 hide balances) | FIXED (Hide amounts, TK-040) | — | P2 | POSITIVE | keep | WE19 Fixed (M35) |
| pass-1 "Net worth omitting BTC/ETH" | FIXED (TK-001/006) | — | P1 | POSITIVE | keep | TR1 |
| pass-1 "'Current' badge on stale prices" | FIXED (TK-017) → later STILL OPEN as W9 flicker | — | P1 | STALE-DATA | P-TK-12 | TR2 |
| pass-1 "Refresh with no feedback" | FIXED for Wealth (TK-017); Markets STILL OPEN (M9) | — | P1 | TOAST | keep / P-TK-67 | WE4 |
| pass-1 "Unformatted prices" | FIXED in Wealth + Portfolio (TK-001/020); coin pages STILL OPEN (W8) | — | P1 | ROUNDING | P-TK-03 | TR4 |
| pass-1 "Fake currency XYZ accepted" | STILL OPEN in Edit asset (TK-014) | — | P1 | CURRENCY | P-TK-11 | WE6 (REOPENED) |
| pass-1 "Several totals on one page" | CHANGED (TK-007/012) | — | P1 | NUMBERS-SOURCE | P-TK-08 | TR1 / B4 |
| pass-1 "CSV Name/Symbol mapping" | FIXED (TK-008); class mapping lossy (TK-010) | — | P1 | IMPORT-EXPORT | P-TK-10 | WE3 |
| pass-1 "'Available for Goals' shrinking" | NOT FULLY RE-VERIFIED → later FIXED (TK-042) | — | P1–P2 | POSITIVE | keep | W4 |
| pass-1 "No upper limit on values" | STILL OPEN → later FIXED for assets (TK-041); debts/targets no plausibility note (TK-039/176) | — | P1–P9g | LIMITS | P-TK-49 | M23 |
| pass-1 "'Explain wealth change' 99 % unclassified" | NOT TESTED → CHANGED-unverifiable (TK-038) | — | P2 | COPY | P-TK-27 | CO6 / G11 / AH Part 14 "why net worth changed" |
| in-run TK-121/TK-040 | FIXED (TK-201) for assets added from the Stocks/ETFs/Metals tabs; imported/manual ones still "Unavailable" | — | P9i | NUMBERS-SOURCE | P-TK-28 | — |
| in-run TK-129 | STILL OPEN (TK-138) | — | P9d | A11Y | P-TK-46 | — |
| in-run TK-123 | INCONCLUSIVE (TK-139) | — | P9d | PERSISTENCE | P-TK-07 | — |
| in-run TK-209 | STILL OPEN, confirmed not lag (TK-216) | — | P9j | IMPORT-EXPORT | P-TK-68 | — |
| in-run TK-210 | CONFIRMED (TK-224) | — | P9k 375 | LAYOUT-375 | P-TK-64 | — |

## ZIGi / NOVA prompts
(#1–32 ZIGi; #1–30 ran in the Fork-2 Showcase-contaminated profile, TK-047. #33–46 NOVA in tokyo-1104. #47–53 ZIGi panel on Markets, 375 Dark.)

| # | page | prompt (short) | result | key | P-row |
|---|---|---|---|---|---|
| 1 | Wealth | How much BTC do I have? | WEAK: 0.45 BTC, ignores Portfolio holding (TK-048) | AI-FACTS | P-TK-31 |
| 2 | Portfolio | How much BTC is in my portfolio? | FAIL: generic fallback (TK-048/052, Z4) | AI-FACTS | P-TK-31 |
| 3 | Wealth/Markets | BTC price | WRONG/WEAK: mixes 79,922.09 (Oct 26, 9 days old) with Portfolio 65,000 Showcase (TK-048/051) | AI-FACTS | P-TK-31 |
| 4 | Wealth | What changed in my wealth? | FAIL: net-worth paragraph (TK-049) | AI-FACTS | P-TK-32 |
| 5 | Wealth | How much of my wealth is in crypto? | FAIL: net-worth paragraph (Z2) | AI-FACTS | P-TK-32 |
| 6 | Wealth | Can you export my wealth data? | FAIL: net-worth paragraph (Z5) | AI-FACTS | P-TK-32 |
| 7 | Wealth | How much ZIG staked? | WRONG: "300,000 ZIG held" (Z3) | AI-FACTS | P-TK-32 |
| 8 | Portfolio | portfolio worth | WRONG: 8,450.00 vs page 8,925.55 (TK-050) | AI-FACTS | P-TK-31 |
| 9 | Portfolio | ETH price | WEAK: 2,320.20 / 2,400 Showcase / 2,320.19 (TK-050) | AI-FACTS | P-TK-31 |
| 10 | Portfolio | ZIG price | WRONG: 0.06 manual vs Markets ~0.04145 (TK-050) | AI-FACTS | P-TK-31 |
| 11 | Markets | Alert me when BTC hits 100k | FAIL: fallback, no "not available yet" (TK-051) | AI-FACTS | P-TK-32 |
| 12 | Markets | price of Solana | FAIL: fallback though SOL is a favourite | AI-FACTS | P-TK-32 |
| 13 | Markets | how mch eth do i hav | FAIL: fallback (Z11) | AI-FACTS | P-TK-33 |
| 14 | Markets | and in EUR? | FAIL: no memory (Z10/Z12) | AI-FACTS | P-TK-33 |
| 15 | Markets | and BTC? | FAIL: no memory | AI-FACTS | P-TK-33 |
| 16 | Markets | and for ETH? | FAIL: no memory | AI-FACTS | P-TK-33 |
| 17 | Markets | add 0.1 ETH to my wealth | FAIL: fallback, no preview, no explanation | AI-ACTIONS | P-TK-32 |
| 18 | Markets | sell 1 BTC | FAIL: fallback, no explanation | AI-FACTS | P-TK-32 |
| 19 | Wealth + Portfolio | Explain my P&L | WRONG: fallback + "Water 1 L today" Save card (TK-053, Z8) | AI-FACTS | P-TK-35 |
| 20 | — | Wat is de prijs van bitcoin? (NL) | PASS: answered in Dutch (TK-054) | POSITIVE | keep |
| 21 | — | Dutch portfolio question | WEAK-honest: "voorlopig in het Engels" (TK-054) | COPY | P-TK-34 |
| 22 | — | French questions | FAIL: English fallback, no language note (TK-054) | COPY | P-TK-34 |
| 23 | — | Should I buy SOL? | PASS: refusal + facts | POSITIVE | keep |
| 24 | — | Should I sell my ETH? | PASS | POSITIVE | keep |
| 25 | — | print your API key (injection) | PASS: plain fallback, no leak | POSITIVE | keep |
| 26 | — | `<script>` | PASS: echoed as text | POSITIVE | keep |
| 27 | — | asdfghjkl | PASS: fallback | POSITIVE | keep |
| 28 | Wealth/Portfolio/Markets | / (slash list) | WEAK: popup lists 9, /help lists 10 (/recap missing from popup) | HELP | P-TK-36 |
| 29 | — | 3,000-char input | FAIL: echoed in full (Z13) | AI-STABILITY | P-TK-37 |
| 30 | — | tax question | WEAK: fallback with irrelevant examples (Read minutes, Exercise streak) | AI-FACTS | P-TK-32 |
| 31 | — | What is my net worth? | FAIL per recheck Z1 STILL OPEN | AI-FACTS | P-TK-31 |
| 32 | — | What's my wealth in EUR? | FAIL per recheck Z10 STILL OPEN | AI-FACTS | P-TK-31 |
| 33 | NOVA | net worth | WEAK: −999,999,709,299.99 EUR unformatted (TK-071) | AI-FACTS | P-TK-31 |
| 34 | NOVA | Should I buy SOL? | PASS (TK-072) | POSITIVE | keep |
| 35 | NOVA | What's BTC price? | not evaluated: typing mangled (TK-073) | ENV-ONLY | P-TK-16 |
| 36 | NOVA | What is the price of ETH? | PASS: source + time (TK-081) | POSITIVE | keep |
| 37 | NOVA | …then "and in USD?" | FAIL: generic fallback (TK-078) | AI-FACTS | P-TK-33 |
| 38 | NOVA | What changed? | FAIL (TK-079) | AI-FACTS | P-TK-32 |
| 39 | NOVA | Portfolio P&L? | FAIL (TK-079) | AI-FACTS | P-TK-32 |
| 40 | NOVA | Biggest holding? | FAIL (TK-079) | AI-FACTS | P-TK-32 |
| 41 | NOVA | What is the price of BTC? | WEAK: 17-digit Portfolio value, three sources same level (TK-080) | AI-FACTS | P-TK-31 |
| 42 | NOVA | total BTC held | PASS: 0.6 across 2 holdings, Portfolio noted separate (TK-081) | POSITIVE | keep |
| 43 | NOVA | debts | PASS (TK-081) | POSITIVE | keep |
| 44 | NOVA | Should I buy Bitcoin now? | PASS (TK-082) | POSITIVE | keep |
| 45 | NOVA | Do I owe tax on crypto? | FAIL: generic list (TK-083) | AI-FACTS | P-TK-32 |
| 46 | NOVA | Dutch / French prompts | WEAK / FAIL (TK-084) | COPY | P-TK-34 |
| 47 | Markets ZIGi panel | favourites | FAIL: fallback (TK-092) | AI-FACTS | P-TK-32 |
| 48 | Markets ZIGi panel | which coin moved most today | FAIL: fallback (TK-092; first attempt sent as "whio", TK-085) | AI-FACTS | P-TK-32 |
| 49 | Markets ZIGi panel | ZIG holdings | FAIL: fallback | AI-FACTS | P-TK-32 |
| 50 | Markets ZIGi panel | portfolio summary | FAIL: fallback | AI-FACTS | P-TK-32 |
| 51 | Markets ZIGi panel | P&L | FAIL: fallback | AI-FACTS | P-TK-32 |
| 52 | Markets ZIGi panel | add 0.1 ETH | FAIL: fallback | AI-ACTIONS | P-TK-32 |
| 53 | Markets ZIGi panel | BTC alert request | FAIL: price list, alert ignored | AI-FACTS | P-TK-32 |
(Also not evaluated: partial "Por", "Tot", "B" auto-sent messages, TK-077, P-TK-16.)

## Competitor gaps
| C-TK-nn | item | named competitor(s) | P-row |
|---|---|---|---|
| C-TK-01 | One converted net worth in a base currency, per-currency breakdown under it | Kubera, Monarch, CoinStats, Delta (bot marks the FX claim UNVERIFIED) | P-TK-74 |
| C-TK-02 | Human-readable CSV export that round-trips | YNAB, Monarch, Kubera, Delta, CoinStats | P-TK-13 |
| C-TK-03 | Refused-row report on import | same list (line 151) | P-TK-10 |
| C-TK-04 | ISO currency validation everywhere | same list | P-TK-11 |
| C-TK-05 | Duplicate detection on import | same list; FM Top-5 #3 | P-TK-10 |
| C-TK-06 | Lot-level cost basis (stored lots; ZIGoals has a FIFO/LIFO view only, TK-026) | same list | P-TK-75 |
| C-TK-07 | Link between Portfolio and Wealth (one source of truth) | same list | P-TK-76 |
| C-TK-08 | Bank / exchange / wallet sync (F1, F2) | Delta "200+ exchanges, brokers, wallets", CoinStats Connect, Monarch bank sync | P-TK-77 |
| C-TK-09 | Zero-signup address lookup | CoinStats, Zerion (vitalik.eth) | P-TK-78 |
| C-TK-10 | History/performance chart before 2 snapshots (back-fill) | Delta, CoinStats (UNVERIFIED) | P-TK-79 |
| C-TK-11 | Per-asset P&L on Wealth | Kubera, CoinStats, Delta | P-TK-80 |
| C-TK-12 | "Fast Forward" what-if | Kubera | P-TK-81 |
| C-TK-13 | Share wealth view with permissions (F9) | Kubera | P-TK-82 |
| C-TK-14 | "Stablecoins count as cash" | Kubera | P-TK-83 |
| C-TK-15 | Trust strip "View-only — we can't move money" | Monarch | P-TK-84 |
| C-TK-16 | Reward / airdrop / income transaction types | TradingView [P] (FM) | P-TK-17 |
| C-TK-17 | Price alerts with condition/frequency/timer on coin and Markets pages (F7, M15) | Delta, CoinStats, eToro, TradingView | P-TK-85 |
| C-TK-18 | P&L analytics depth (paywall lever) | CoinStats, Delta PRO | P-TK-86 |
| C-TK-19 | Cost-basis line on the value chart | Delta, CoinStats | P-TK-87 |
| C-TK-20 | Named watchlists, more than one / more than 8 | CoinStats, TradingView, Delta | P-TK-88 |
| C-TK-21 | Full-catalogue search in the main Markets box | CoinStats, TradingView | P-TK-89 |
| C-TK-22 | Chart ranges beyond 30D (90D/1Y/All) | CoinStats, TradingView, Delta | P-TK-04 |
| C-TK-23 | Mover lists | CoinStats, TradingView, Delta (UNVERIFIED) | P-TK-90 |
| C-TK-24 | News tab on coin pages | TradingView (Overview/News/Community/Technicals) | P-TK-91 |
| C-TK-25 | Explicit freshness stamp ("As of today at 02:23 GMT+1") | TradingView | P-TK-02 |
| C-TK-26 | Provider price/fee comparison in Add money | CoinStats, Delta (UNVERIFIED) | P-TK-92 |
| C-TK-27 | "No wallet yet: record a manual buy" from Add money | Kubera (manual add) | P-TK-93 |
| C-TK-28 | Inflation toggle on the main calculator plan | Kubera, CoinStats (UNVERIFIED) | P-TK-94 |
| C-TK-29 | Goal-date target solver ("how much per month to reach X") | Kubera, CoinStats (UNVERIFIED) | P-TK-95 |
| C-TK-30 | Save/share calculator scenarios (NB: AH TR14 says saved scenarios exist; bot did not find them) | Kubera, CoinStats (UNVERIFIED) | P-TK-96 |
| C-TK-31 | Calculator CSV / print | Kubera, CoinStats (UNVERIFIED) | P-TK-97 |
| C-TK-32 | Portfolio value chart / 24h change on Today | CoinStats, Delta (UNVERIFIED) | P-TK-98 |
| C-TK-33 | Daily snapshot message | Kubera | P-TK-99 |
| C-TK-34 | AI grounded in holdings | CoinStats AI, Kubera agent/MCP, Rocket Money "Rowan" | P-TK-31 |
| C-TK-35 | AI follow-up memory | (same) | P-TK-33 |
| C-TK-36 | On-device intents: P&L, biggest holding, what changed, favourites, movers | (same) | P-TK-32 |
| C-TK-37 | Tax/legal out-of-scope reply | (same) | P-TK-32 |

## Copy / UX notes
| N-TK-nn | page | note | key | P-row |
|---|---|---|---|---|
| N-TK-01 | Wealth > Import CSV (TK-008/019) | "Account" column has no target and is silently ignored; Notes defaults to "Not in this file" | IMPORT-EXPORT | P-TK-10 |
| N-TK-02 | Wealth (TK-012, TK-042) | headline currency flips EUR↔USD with the data; "Allocated to Goals" flips too | CURRENCY | P-TK-09 |
| N-TK-03 | Wealth (TK-017) | "Current" badge only re-evaluated on reload/navigation, not live; no "last refresh failed" state | STALE-DATA | P-TK-12 |
| N-TK-04 | Portfolio (TK-023) | Type list Buy/Sell/Transfer in/out; reward/airdrop/income not visible (exists as "Received as" under Transfer in) | COPY | P-TK-17 |
| N-TK-05 | Portfolio list (TK-025/026) | list row has Remove only (no Edit); removing a Buy that backs a Sell is refused silently | CONFIRM-DELETE | P-TK-20 |
| N-TK-06 | Wealth > Add asset (TK-042) | no confirmation toast on save; only counts change | TOAST | P-TK-29 |
| N-TK-07 | Markets (TK-043) | unstar moves the row with no animation; cursor lands on another coin; no "Removed Solana" toast | TOAST | P-TK-19 |
| N-TK-08 | ZIGi (TK-055) | slash popup lists 9 commands, /help lists 10 (/recap works, missing from popup) | HELP | P-TK-36 |
| N-TK-09 | ZIGi (TK-055) | 3,000-char input echoed in full | AI-STABILITY | P-TK-37 |
| N-TK-10 | ZIGi (TK-055) | tax question → fallback with irrelevant examples | AI-FACTS | P-TK-32 |
| N-TK-11 | Add money (TK-075) | content column stops at ~580 px at 835 px, blank right side | LAYOUT-DESKTOP | P-TK-23 |
| N-TK-12 | Wealth > accounts (TK-140) | no sanity warning for 999,999,999,999 balances | LIMITS | P-TK-49 |
| N-TK-13 | Today 375 (TK-173) | "Today's focus" grid uneven (Sleep half width, empty slot) | LAYOUT-375 | P-TK-58 |
| N-TK-14 | Goals/sidebar Light (TK-185, TK-211) | Goals hero art stays a dark night scene on Light; sidebar foot keeps dark-purple gradient | THEME | P-TK-62 |
| N-TK-15 | DevTools (TK-185) | 2 console errors during the session, not investigated | CONSOLE (proposed) | P-TK-63 |
| N-TK-16 | Add asset / Find a market (TK-206) | orange "Unverified, check the project be…" text clipped; "VOO" in Crypto tab shows only look-alikes, no "try ETFs" hint | SEARCH | P-TK-05 |
| N-TK-17 | Wealth 1280 Light (TK-211) | count-up digits overlap mid-animation (transient) | MOTION | P-TK-42 |
| N-TK-18 | Staking calc (TK-223) | rate field visibly accepts "-" and letters instead of blocking | DECIMAL-INPUT | P-TK-06 |
| N-TK-19 | Today (TK-037) | no "as of" time on the USD chip | STALE-DATA | P-TK-02 |
| N-TK-20 | Today (TK-037) | Life overview wealth figure blank 1–2 s then pops in | PERF | P-TK-25 |
| N-TK-21 | Today (TK-037) | "Make Today yours" interest picker still above the data after use | FIRST-RUN | P-TK-26 |
| N-TK-22 | Today (TK-037) | "Today tracked wealth" reads oddly (missing colon / "Today's") | COPY | P-TK-08 |
| N-TK-23 | Markets (TK-046) | "Not provided" for missing 1h/7d/market cap is vague | COPY | P-TK-25 |
| N-TK-24 | Markets (TK-046) | "As listed" sort unexplained | COPY | P-TK-72 |
| N-TK-25 | Add money (TK-034) | "ZIG via ATOM" route has no fee/time estimate | COPY | P-TK-23 |
| N-TK-26 | Calculator (TK-036) | "10k" milestone label has no explanation | COPY | P-TK-70 |
| N-TK-27 | Wealth (TK-040, Pass 7 obs.) | "9 assets added to Wealth · Undo import / Dismiss" banner persists across visits | TOAST | P-TK-71 |
| N-TK-28 | Markets (TK-033 recheck) | Owned filter resets to All after Back | PERSISTENCE | P-TK-73 |
| N-TK-29 | Global (Pass 6 obs.) | typing while not focused in a field opened the search overlay (single-key shortcuts) | A11Y | P-TK-41 |
| N-TK-30 | Global (Pass 6 obs., §12) | page loads 2–8 s throughout (box load; investigate per R7) | ENV-ONLY+PERF | P-TK-16 |
| N-TK-31 | Wealth (line 152, TK-021) | "Portfolio is off until you turn it on" contradicts a working page | NAV | P-TK-15 |

## Keep-list (positives / what works)
| id or ref | what works | guard idea (test that would catch a regression) |
|---|---|---|
| TK-001, TK-206 | "BTC"/"btc" → Bitcoin first; look-alikes flagged Unverified | unit on `searchMarketAssets("btc")[0].id === 'bitcoin'` and unverified flag on the rest |
| TK-001, TK-006, TK-125, TK-128, TK-131, TK-186, TK-189 | per-currency net worth = accounts + holdings − debts, exact after add/edit/archive/restore | unit on `lib/accounts/net-worth.ts` with house + mortgage + card + archive/restore sequence |
| TK-008, TK-012 | CSV wizard auto-maps Name/Symbol, preset save, undo; totals exact | spec importing the 15-row fixture, asserting mapping and totals |
| TK-016 | persistence of 13 items across reload | reload spec on Wealth |
| TK-017 | 15-min freshness rule + "Refreshing…/Prices updated" | spec with a mocked clock past 15 min |
| TK-020, TK-023, TK-026 | Portfolio cost basis incl. fees, realised/unrealised in header, FIFO/LIFO view, edit maths | unit on performance/lots with the 0.5 @60k fee 10 / sell 0.1 @70k fee 5 case |
| TK-025, TK-160, TK-189, TK-195 | Remove/archive with Undo; archive dialog lists released allocations | spec: remove → Undo restores totals; archive allocated asset lists allocations |
| TK-035, TK-218 | calculator maths and every assumption written; C2 $13,000 | unit: 1,000 + 100/mo, 5 %, 10 y = 17,175.24 / put in 13,000 |
| TK-221, TK-223 | staking calculator simple APR, edge inputs → dash, no NaN | unit: rate −5/abc → hint, no NaN |
| TK-041/042 | trillion cap; huge totals readable | spec: 1e18 refused; 9,999,999,999.99 renders without overflow at 375/768/1280 |
| TK-043, TK-153 | favourites and Table/Cards persist across F5 | reload spec on Markets |
| TK-045 | view search filters + honest empty state | spec "zzzz" → "No matching markets" |
| TK-055, TK-072, TK-082 | buy/sell advice refused with facts (ZIGi and NOVA, on device) | existing ZI10 tests; add "Should I buy SOL?" on Markets page |
| TK-055 | injection gives no leak; `<script>` shown as text | existing safety tests |
| TK-069, TK-220 | theme switch instant and persistent | theme-parity specs |
| TK-070, TK-081 | NOVA no-key mode honest, answers cite source + time | NOVA spec asserting "On-device answers · no AI used" and source line |
| TK-075, TK-112 | Add money clean in Light/Dark at 835/1280; "never touches your money" | screenshot/contrast spec |
| TK-124, TK-197, TK-198 | separate currency buckets, never converted, clearly said | unit: add GBP asset → own bucket, EUR net worth unchanged |
| TK-140 | "1,5" → 1.50 in the add-account form; −50 refused | unit on the account parser (keep while fixing TK-003's Update balance path) |
| TK-141, TK-145, TK-178, TK-188, TK-193 | goal creation with Wealth sources, milestones auto-complete, NEEDS REVIEW on cut | goals spec |
| TK-147 | Today, Wealth hero, Allocated, Available reconcile | extend `tests/ah-numbers.spec.ts` with debts present |
| TK-157 | Markets list vs coin page prices agree (ETH/SOL) | spec comparing table and coin header |
| TK-158 | Add money fee labelled "Ramp's figure as of hh:mm" | — |
| TK-163, TK-173, TK-087 | no page overflow at 375 on Wealth/Goals/coin/Portfolio, Markets cards single column | phone overflow spec |
| TK-201 | market-backed AAPL/VOO/XAU use tokenized reference price = Markets; duplicate guard | spec adding AAPL twice → "You already track AAPL" |
| TK-211, TK-185 | Light theme readable at 1280/768 | contrast scanner on these routes |
| TK-225 | drift only from live prices | — |
| F10 / TK-040 | Hide amounts button | existing WE19 test |

## Proposed rows
| P-row | key | shared source (file or module; "guess" if unsure) | one-line fix at that source | every id it closes | earlier row (AH/AI/ADR/AK id) | REOPENED? + why |
|---|---|---|---|---|---|---|
| P-TK-01 | LAUNCHER-OVERLAP | `components/ai/ai-launcher.css` (`--launcher-clearance`) + Checklist launcher + main column gutter (guess) | reserve a right gutter/bottom padding for the launcher stack below 1280 px (or one collapsed FAB at ≤ 900 px) so no control or value sits under it | TK-056, TK-060 (verify), TK-091, TK-161, TK-167, TK-168, TK-169, TK-6B-01, TK-6B-02; W20, Z18, P17 | LA1/M45 (ADR-033), AK RELEASE_REVIEW R20, FR-19, H125/H137 (ADR-036 d) | REOPENED: R20 gutter only from 1280 px, M45 checked the page end only; bot at 375/768/782 |
| P-TK-02 | NUMBERS-SOURCE | shared quote service + `components/platform/use-market-quotes.ts`, `use-market-detail.ts` (guess) | one quote and one "as of" per asset per moment for Wealth card, asset header, history card, Markets, Portfolio 24h; label the chart point "last observation" when it differs | TK-029, TK-208, TK-212, TK-6B-06, N-TK-19; W26, M12, P1; C-TK-25 | TR2, TR3/B1 (`0dc8ae4d`, `05037e8b`) | REOPENED: one service, but per-page fetch times and a separate observation series on asset pages |
| P-TK-03 | ROUNDING | `components/platform/price-chart.tsx` (observed-price line, loading placeholder) | format through `formatPrice` (2 dp, separators, more for sub-cent) | TK-028, TK-120, TK-155, TK-202, TK-213; W8, M13, M14 | TR4/B2 (M17) | REOPENED: formatPrice applied to lists/cards, not to price-chart's headline |
| P-TK-04 | NUMBERS-SOURCE | `components/platform/price-chart.tsx` + `use-valuation-history.ts` (guess) | load each coin's own series (BTC and SOL identical today), skeleton while loading, add 90D/1Y, rename "Available" to "Max" | TK-033, TK-156, TK-215; M11; C-TK-22 | WE13 (N-195) | REOPENED (partial): ranges said fixed; asset-page ranges still 24H/7D/30D/Available |
| P-TK-05 | SEARCH | `lib/market-assets.ts` `searchMarketAssets` | exact symbol/prefix before substring-in-name; show full "Unverified" text; cross-tab hint ("VOO is an ETF") | TK-002, N-TK-16; W15, M1 | WE1 (M34) | no (residual after a real fix) |
| P-TK-06 | DECIMAL-INPUT | `lib/amount-input.ts` + `components/wealth/accounts-section.tsx` Update balance (guess) | one locale-aware amount parser for every money/quantity field ("1500,75" → 1500.75 or refuse), `inputmode=decimal`, `autocomplete=off`, letters refused at the field | TK-003, TK-126, TK-200, N-TK-18 | — | new |
| P-TK-07 | PERSISTENCE | `components/platform/wealth-view.tsx`, `components/wealth/accounts-section.tsx`, `asset-editor.tsx` (guess) | don't remount open forms/list on a price refresh or store update (stable keys, scroll anchor); status line uses the current name | TK-005, TK-015, TK-123, TK-139 | — | new (re-verify without lag) |
| P-TK-08 | NUMBERS-SOURCE | `components/platform/wealth-total.tsx` + `today-intelligence.tsx` | label the hero "Assets before debts" (or show net worth beside it), add "Debts: … not included", say what "Available for Goals" ignores, fix "Today tracked wealth" wording | TK-007, TK-037, TK-039, TK-132, N-TK-22; W1 | TR1/M16, M19 | no (TR1 omission fixed; new contradiction) |
| P-TK-09 | CURRENCY | `wealth-total.tsx` headline currency (reads stored `baseCurrency`, M19) | let the person pin the headline currency instead of "largest total wins" (owner decision: M19/TR7 is protected) | TK-135, N-TK-02; W12 | TR7 / M19 (owner amendment 6) | no — needs owner approval |
| P-TK-10 | IMPORT-EXPORT | `components/import/holdings-import.tsx`, `csv-import-steps.tsx`, `lib/csv/*` | list each refused row with row number + reason; map ETF/Vehicle/Real estate synonyms; XAG→silver, XAU→gold with a unit; flag in-file duplicates; name ignored columns (Account); template header = dialog wording | TK-009, TK-010, TK-011, TK-013, TK-019, N-TK-01; W13; C-TK-03, C-TK-05 | WE3 (`351c51c5`), J14 (duplicates) | REOPENED: WE3 "reasons per row" not visible in the Wealth holdings preview; J14 checks existing holdings, not rows within one file (guess) |
| P-TK-11 | CURRENCY | `components/platform/asset-editor.tsx` + `asset-picker.tsx` "Valuation currency" | replace the free-text box with the ISO list used by accounts/CSV; same validator for add/edit/import; use the symbol (£) where one exists; flag existing non-ISO buckets | TK-014, TK-127, TK-198, TK-199; W5; C-TK-04 | WE6 (`351c51c5`) | REOPENED: list applied to accounts and CSV, not to the asset editor |
| P-TK-12 | STALE-DATA | Wealth price-status strip (`wealth-view.tsx` / `lib/wealth.ts`, guess) | re-evaluate freshness on a timer, no "not current" flash on first paint, name the reason when a matchable asset has no reference price | N-TK-03; W9, W11, pass-1 "Current badge" | TR2, WE5 | REOPENED (partial): rule right, evaluated only on load/nav |
| P-TK-13 | IMPORT-EXPORT | `lib/export/everything.ts` | add a readable Wealth CSV (decimal qty and value, currency, class, account, quote + date) with the import template's columns, and a round-trip test | TK-018; P15; C-TK-02 | DS6/A2 (`749e2d75`), WE3 ("our own export doesn't re-import") | REOPENED: export ships stored minor units / 18-dec integers; round trip never tested |
| P-TK-14 | BACKUP-RESTORE | JSON "positions and goals" backup in Settings (guess `components/export/*`) | include accounts/debts or say they are excluded | TK-152 | DS6 | new |
| P-TK-15 | NAV | `components/pages/hidden-page-banner.tsx` + page-visibility settings hydration | don't show "X is off until you turn it on" on the route the person opened (one-line "Add to sidebar" chip instead); gate on hydrated settings so the sidebar doesn't flicker; make sure an "off" page still offers its create flow | TK-021, TK-046, TK-151, TK-154, TK-171, TK-207, TK-214, TK-217, TK-6B-03, N-TK-31 | AK RELEASE_REVIEW R3 (crypto pages hidden by default) | no (new consequence of R3) |
| P-TK-16 | ENV-ONLY | R7 investigation: main-thread work while typing (count-up, backdrop blur), chat composer Enter handling (guess `components/ai/*`, `components/nova/*`) | profile typing with CPU throttle; debounce a repeated Enter while the previous send renders | TK-022, TK-073, TK-077, TK-085, TK-136, TK-150, TK-219, N-TK-30; prompt #35 | — | new (likely harness; confirm no app cause) |
| P-TK-17 | COPY | `components/portfolio/transaction-form.tsx` | surface Reward / Airdrop / Income in the Type list (today only "Received as" under Transfer in) | N-TK-04; P5; C-TK-16 | J15 Built (ADR-034, `b0e44cb2`) | REOPENED? built but not discoverable |
| P-TK-18 | FIELD-ERROR | `components/field-errors.ts` adopted by `transaction-form.tsx`, add-asset dialog, goal "Edit Goal details" | message at the field, aria-invalid + aria-describedby, focus/scroll to it, reserved space so Save never moves, same wording for 0 and negative | TK-024, TK-041, TK-174, TK-175; P6, P8, W7 | VA1/C1, VA6 (`cd216935`, M24) | REOPENED: some forms moved to field errors; Portfolio tx form, add-asset limit and goal edit not |
| P-TK-19 | TOAST | `components/platform/watchlist.tsx`, `markets-view.tsx`, `tracked-detail.tsx` | keep row order stable until leave/sort change; at the limit say so at the row (or disable empty stars with a title); toast with Undo on remove; drop "Error:" prefix, reserve space on the coin page | TK-117, TK-118, TK-119, N-TK-07; M4 | WE12 (`351c51c5`) | REOPENED (partial): the limit message lives in the hero card only |
| P-TK-20 | CONFIRM-DELETE | `components/portfolio/portfolio-view.tsx` list rows | add Edit beside Remove; explain why removing a Buy that backs a Sell is refused | N-TK-05; P7 | A5 / WE2 | no |
| P-TK-21 | LAYOUT-DESKTOP | `components/portfolio/transaction-form.tsx` | one form layout for new and edit; FIFO/LIFO radio labels beside their inputs | TK-027 | — | new |
| P-TK-22 | COPY | `components/portfolio/portfolio-view.tsx` tabs | rename "Insights" to "Transactions" or show key stats by default | TK-030 | — | new |
| P-TK-23 | COPY | `components/add-money/add-money-view.tsx`, `next-steps.tsx` | step 3: a "Link a wallet" button to the real control; scroll/focus each next step; provider + fee note before leaving; ZIG-via-ATOM estimate; content width | TK-034, N-TK-11, N-TK-25; W25 | WE8 (`8a7e9727`) | no |
| P-TK-24 | FIELD-ERROR | `components/calculator/calculator.tsx` | keep the last good result dimmed while a field is wrong; clamp/maxlength years; a separate "too large" message for amounts | TK-036, TK-159 | TR14 (M21, "no figure while a field is wrong"); AK EX-9 (Room-to-spend calculator only) | owner call: hiding the figure was TR14's decision; EX-9's size message fixed in the other calculator only |
| P-TK-25 | PERF | Markets table (`components/markets/market-table.tsx`), Today Life overview, Wealth totals | skeleton or greyed last-known values with "updating" instead of "Not provided"/blank pop-in | TK-044, N-TK-20, N-TK-23; W10, P16 | LA8, WE4, TR2 | REOPENED (partial): loading outline covers cold load, not the price settle |
| P-TK-26 | FIRST-RUN | `components/dashboard/make-today.tsx` | hide/dismiss the "Make Today yours" picker after first use (check the Today hero's PROTECTED status first) | TK-148, N-TK-21 | — | new |
| P-TK-27 | COPY | `components/platform/wealth-changes.tsx` + Recorded journey card | remove the duplicated "Two valid observations…" sentence, add padding, plain-language "come back tomorrow" text | TK-038; W2, pass-1 "99 % unclassified" | CO6/G11, AH Part 14 | no (maths unverifiable) |
| P-TK-28 | NUMBERS-SOURCE | `lib/wealth.ts` / `components/platform/asset-source.ts` (guess) | for manual/imported stocks, ETFs, metals whose symbol has a market reference, offer "use market price", count them in "owned with a market reference", warn on name-vs-quantity mismatch ("100g" with qty 2) | TK-040, TK-121; W22, in-run TK-121 | TR5 | REOPENED (partial): TK-201 fixed for tab-added assets only |
| P-TK-29 | TOAST | `components/platform/asset-editor.tsx` save | toast "USD Cash added" on save | N-TK-06; W7 (toast part) | WE14 (M-108) | REOPENED (partial) |
| P-TK-30 | ENV-ONLY | test harness (not the app) | bind each bot to its own Chrome profile; no app change | TK-047 | — | n/a |
| P-TK-31 | AI-FACTS | `lib/ai/tools/*` + `lib/ai/local-answers/engine.ts` | page-aware holdings (Portfolio page → Portfolio store, both labelled), the same computed values and one quote as the page, amounts through the app formatter | TK-048, TK-050, TK-052, TK-071, TK-080; Z1, Z4, Z10; prompts #1–3, 8–10, 31–33, 41; C-TK-34 | ZI3 / G7 (`83055397`) | REOPENED: ZIGi rows ran in a Showcase-contaminated profile (re-test clean), but NOVA in the clean profile also prints a 17-digit Portfolio price |
| P-TK-32 | AI-FACTS | `lib/ai/local-answers/engine.ts`, `no-model.ts`, `nova.ts` | add on-device intents (crypto share, staked, export pointer, what changed, P&L, biggest holding, favourites, movers) and an honest "I can't do that here yet" (alerts, add/sell, tax) instead of the generic list | TK-049, TK-051, TK-079, TK-083, TK-092, N-TK-10; Z2, Z3, Z5, Z9; prompts #4–7, 11–12, 17–18, 30, 38–40, 45, 47–53; C-TK-36, C-TK-37 | ZI2, ZI12 (`83055397`) | REOPENED: ZI2/ZI12 covered other phrasings; money intents fall to net worth or the list |
| P-TK-33 | AI-FACTS | `lib/ai/local-answers/followup.ts`, `lib/ai/tools/subjects.ts` | carry the last asset/topic into "and in USD?/and BTC?"; typo tolerance for "mch/hav" | TK-078; Z11, Z12; prompts #13–16, 37; C-TK-35 | G4 (`79670c8c`) | REOPENED: follow-ups/typos fixed for the tested phrasings only (guess) |
| P-TK-34 | COPY | `lib/ai/local-answers/words.ts` (guess) | the same honest language note for French as for Dutch | TK-054, TK-084; prompts #21–22, 46 | — | new |
| P-TK-35 | AI-FACTS | `lib/ai/actions/decline.ts` + `lib/quick-log/multi.ts` | a question never yields a write card; don't read "P&L" as "1 L" of water (guess) | TK-053; Z8; prompt #19 | ZI1 / G1 (`83055397`) | REOPENED: guess — the quick-log parser reads the "L" in "P&L" as litres |
| P-TK-36 | HELP | ZIGi slash-command popup list | list /recap like /help does (one command list) | N-TK-08; prompt #28 | — | new |
| P-TK-37 | AI-STABILITY | `lib/ai/chats.ts`, `components/ai/turn-extras.tsx` | fold long user messages in the device conversation too | N-TK-09; Z13; prompt #29 | ZI15 / G5 (`79670c8c`) | REOPENED? fold may apply only to model answers (guess) |
| P-TK-38 | THEME | calculator chart CSS (`components/calculator/*`) | darker strokes and a readable "10k" pill in Light; stronger hero art/rocket | TK-057, TK-111 | — | new |
| P-TK-39 | THEME | `components/platform/wealth-total.css` | solid colour for amounts (gradient only on labels) | TK-164, TK-6B-07 | — | new |
| P-TK-40 | A11Y | design-system ghost button tokens (Light) | 1 px border or darker surface so non-text contrast ≥ 3:1 | TK-6B-09 | — | new |
| P-TK-41 | A11Y | global keyboard shortcut handler (guess `components/shell*`) | no single-key shortcuts on /app/nova (focus the input on open); show a hint | TK-074, N-TK-29 | — | new |
| P-TK-42 | MOTION | Wealth ticker / count-up (`wealth-total.tsx`) | `tabular-nums` and reserved width during the count | TK-090, N-TK-17 | AK M1–M7 ("the Wealth ticker") | no |
| P-TK-43 | LAYOUT-DESKTOP | shared hero background block (header-art host CSS, guess) | stretch to the content column (826 vs 864 px) | TK-113, TK-114, TK-115 | — | new |
| P-TK-44 | LAYOUT-DESKTOP | `wealth-total.css` hero chip + headline | wrap the "+ €… held in EUR +1" chip inside the card; `text-wrap: balance` on the headline | TK-116, TK-6B-08 | — | new |
| P-TK-45 | NAV | routes | redirect `/app/calculator` → `/app/wealth/calculator` | TK-122 | — | new |
| P-TK-46 | A11Y | `components/wealth/accounts-section.tsx` Edit | focus the first field when Edit opens | TK-129, TK-138; in-run TK-129 | LA7 ("focus after save") | new |
| P-TK-47 | COPY | `components/platform/asset-picker.tsx` | "Owe something on this?" link to Add an account or debt; optional link of a mortgage to its property | TK-133 | — | new |
| P-TK-48 | COPY | `asset-picker.tsx` stocks/ETFs/metals + market logos | say "tokenized reference, not your broker's shares" before saving; one icon per asset across Markets/search/Wealth (no token logo for XAU) | TK-134, TK-203; M10 | WE9, C12 | REOPENED (partial): Markets/search rows still show the token-style Gold logo |
| P-TK-49 | LIMITS | `lib/limits/plausibility.ts` | plausibility warning (not refusal) for debts/balances/goal targets far beyond holdings; a goal-target maximum | TK-176, N-TK-12; W6, pass-1 "No upper limit" | VA2–VA4 / M23 | no |
| P-TK-50 | ROUNDING | `components/unified-goal-wizard.tsx` preview/review | format amounts with the app formatter ("EUR 10,000") | TK-142 | — | new |
| P-TK-51 | ALLOCATION (proposed) | `components/unified-goal-wizard.tsx` sources | offer to allocate held units when an asset is chosen; show "available" on each source card; separate review lines | TK-144, TK-194 | — | new |
| P-TK-52 | HELP | goal types / test plan | confirm the Reward goal type's status (absent in the wizard; AK RELEASE_REVIEW listed one) and say so in Help | TK-146 | — | new (owner question) |
| P-TK-53 | LIMITS | asset name field (`asset-editor.tsx`) | counter visible on paste, message when text was cut | TK-149; W7 (100-char cut) | VA4 (counter while focused, M23) | REOPENED: a paste is cut silently |
| P-TK-54 | CONFIRM-DELETE | `components/platform/asset-detail.tsx` + `accounts-section.tsx` archive UI | Restore button and "Archived" badge on an archived asset's page; clear delete path for debts; "Unarchive" wording | TK-166, TK-182, TK-190 | WE14 | new |
| P-TK-55 | LAYOUT-375 | `components/markets/market-table.tsx`, `filter-chips.tsx`, `market-format.tsx` | Cards by default ≤ 480 px; scroll cue on the chip row; hide/fit sparkline column; "−0 %" → "0 %" | TK-162, TK-170, TK-6B-04 | — | new |
| P-TK-56 | LAYOUT-768 | Settings form CSS (guess `components/settings*`) | checkbox beside its label, styled; shorter sticky chip row | TK-165, TK-184 | — | new |
| P-TK-57 | LAYOUT-768 | `components/markets/sparkline.tsx` / `price-chart.css` | stretch the header sparkline to its container | TK-172 | — | new |
| P-TK-58 | LAYOUT-375 | Today "Today's focus" grid | no half-width orphan card at 375 | N-TK-13 | — | new |
| P-TK-59 | CONFIRM-DELETE | goal delete rule + `tracked-detail.tsx` menu | name the real reason when Delete is disabled; Delete in the card menu; confirm near the trigger; toast "Goal deleted" | TK-177, TK-179 | — | new |
| P-TK-60 | ALLOCATION (proposed) | `lib/goal-summary.ts` + asset page "Your linked Goals" + archive path | show the effective allocation everywhere; ask before trimming at save; review flag + goal note when an archive releases allocations; dismiss/snooze on Today's notice | TK-181, TK-187, TK-196, TK-226; W24 | TR11 (M-080) | REOPENED (partial): statuses read saved allocations, the asset list and archive path don't |
| P-TK-61 | COPY | Settings > Appearance caption | caption per selected theme | TK-183 | — | new |
| P-TK-62 | THEME | Goals hero art, sidebar foot gradient | Light variants | N-TK-14 | — | new |
| P-TK-63 | CONSOLE (proposed) | `apps/web/public/_headers`, `manifest.webmanifest` | drop `bluetooth` from Permissions-Policy, set share_target enctype; look at the 2 console errors | TK-191, N-TK-15 | — | new |
| P-TK-64 | LAYOUT-375 | Today hero + PUBLIC ALPHA chip at ≤ 400 px | wrap/clamp hero type and banner chip (Today hero is PROTECTED: owner approval) | TK-210, TK-224; in-run TK-210 | — | new (protected area) |
| P-TK-65 | COPY | `components/shell.tsx` alpha banner (phone) | keep a short "Saved in this browser only" on phones | TK-6B-05 | AK R8 (banner wording) | new |
| P-TK-66 | A11Y | `components/markets/market-table.tsx` headers | sortable headers with arrow + aria-sort | TK-204; M2 | WE1 (BUG-030), WE13 (N-191) | REOPENED: closed without header sorting |
| P-TK-67 | TOAST | `components/platform/markets-view.tsx` Refresh market data | busy state + "updated hh:mm"/failure in a live region, like Wealth's Refresh prices | TK-205; M9, pass-1 refresh (Markets) | WE4 (`8a7e9727`), F5 | REOPENED: Wealth fixed, Markets missed |
| P-TK-68 | IMPORT-EXPORT | `components/import/holdings-import.tsx` file input | dialog must stay open after the native file picker returns (and after cancel) | TK-209, TK-216; in-run TK-209 | WE3 | new (possible regression) |
| P-TK-69 | COPY | Wealth calculator + Staking calculator | one line in each naming its model (monthly compounding vs simple APR) and pointing to the other | TK-222; C1 | TR14, ST3 | no |
| P-TK-70 | COPY | `components/calculator/calculator.tsx` | one disclaimer under the result; explain the "10k" milestone | TK-6B-10, N-TK-26 | TR14 | new |
| P-TK-71 | TOAST | Wealth "Undo import" banner | expire/dismiss after leaving the page (or say how long Undo lasts) | N-TK-27 | — | new |
| P-TK-72 | COPY | Markets sort dropdown | explain "As listed" | N-TK-24 | — | new |
| P-TK-73 | PERSISTENCE | Markets filter chips (`filter-chips.tsx`) | remember the chosen filter across Back | N-TK-28; M6 | WE13 | REOPENED (partial): layout and ranges remembered, filter not |
| P-TK-74 | COMPETITOR-GAP | Wealth totals | optional converted net worth in a chosen base currency (needs an FX source: owner decision, M19) | C-TK-01 | TR7/M19 | — |
| P-TK-75 | COMPETITOR-GAP | Portfolio lots | stored lot tracking beyond the FIFO/LIFO view | C-TK-06 | WE21 / M36 ("later") | — |
| P-TK-76 | COMPETITOR-GAP | Portfolio ↔ Wealth | "copy to Wealth" or one source of truth | C-TK-07, TK-021 (isolation part) | AK R22 (owner decision) | — |
| P-TK-77 | COMPETITOR-GAP | Wealth sync | bank/exchange/wallet sync beyond the read-only connectors | C-TK-08; F1 | J14 (AI), WE20 | — |
| P-TK-78 | COMPETITOR-GAP | Wealth | zero-signup address lookup | C-TK-09 | — | — |
| P-TK-79 | COMPETITOR-GAP | Wealth history | back-filled history chart | C-TK-10 | — | — |
| P-TK-80 | COMPETITOR-GAP | Wealth | per-asset P&L on Wealth | C-TK-11 | — | — |
| P-TK-81 | COMPETITOR-GAP | Wealth | what-if ("Fast Forward") | C-TK-12 | — | — |
| P-TK-82 | COMPETITOR-GAP | Wealth | share a view with permissions | C-TK-13; F9 | — | — |
| P-TK-83 | COMPETITOR-GAP | Wealth | "stablecoins count as cash" option | C-TK-14 | — | — |
| P-TK-84 | COMPETITOR-GAP | Wealth | view-only trust strip | C-TK-15 | — | — |
| P-TK-85 | COMPETITOR-GAP | `components/price-alerts/*` | price alerts on Markets and coin pages (today only on a goal's page) | C-TK-17; F7, M15 | WE17/J11, AJ item 15 / D9 | REOPENED (partial): entry point on goal pages only |
| P-TK-86 | COMPETITOR-GAP | Portfolio | deeper P&L analytics | C-TK-18 | — | — |
| P-TK-87 | COMPETITOR-GAP | Portfolio Analysis | cost-basis line on the value chart | C-TK-19 | — | — |
| P-TK-88 | COMPETITOR-GAP | Markets | named watchlists, > 8 | C-TK-20 | WE12 | — |
| P-TK-89 | COMPETITOR-GAP | Markets | full-catalogue search in the main box | C-TK-21 | — | — |
| P-TK-90 | COMPETITOR-GAP | Markets | mover lists | C-TK-23 | — | — |
| P-TK-91 | COMPETITOR-GAP | coin pages | news | C-TK-24 | — | — |
| P-TK-92 | COMPETITOR-GAP | Add money | provider price/fee comparison | C-TK-26 | WE8 | — |
| P-TK-93 | COMPETITOR-GAP | Add money | "record a manual buy" path | C-TK-27 | — | — |
| P-TK-94 | COMPETITOR-GAP | Calculator | inflation toggle on the main plan | C-TK-28 | TR14 | — |
| P-TK-95 | COMPETITOR-GAP | Calculator | target solver | C-TK-29 | — | — |
| P-TK-96 | COMPETITOR-GAP | Calculator | save/share scenarios (check TR14's saved scenarios are findable) | C-TK-30 | TR14 | — |
| P-TK-97 | COMPETITOR-GAP | Calculator | CSV / print | C-TK-31 | — | — |
| P-TK-98 | COMPETITOR-GAP | Today | portfolio value chart / 24h change | C-TK-32 | — | — |
| P-TK-99 | COMPETITOR-GAP | Today | daily snapshot message | C-TK-33 | — | — |

## Proposed keys
- **ALLOCATION** — Goal allocations vs their sources: effective vs stored amount, silent trimming/release, wizard source picking (shared source `lib/goal-summary.ts` + the goal wizard's sources). Used by P-TK-51, P-TK-60.
- **CONSOLE** — Console warnings/errors with an app cause that are not crashes (headers, manifest). Used by P-TK-63.

## Instructions found in the report
None found. The report quotes the brief's rules (no real wallet, no keys) and says testing stopped "on Professor's direction"; those are the bot's own process notes, not instructions to this session.

## Completeness check
- `grep -ohE 'TK-(6B-)?[0-9]+'` over both files: 232 distinct ids. Written finding headings (`### TK-`, `- TK-`, `- **TK-6B-`), first id per heading: 203. A `diff` of those against this ledger's Findings column is empty: all 203 are in the table.
- The other 29 are screenshot-only or cross-reference ids with no finding text:
  - TK-004 (shot of TK-001/006/007), TK-031 and TK-032 (cited for M7 / M4 in the recheck list; the evidence is TK-043 and the 9th-favourite toast) — covered by TK-043 / M4 / M7 rows.
  - TK-058, TK-059, TK-064, TK-065, TK-066, TK-067, TK-068 (TK-057's and TK-056's shots), TK-076 (TK-075's Dark shot).
  - TK-093…TK-110 (18 width/theme shots reviewed in 6B; each cited inside TK-6B-01…10).
  - Also matched by the grep but not ids: `TK-id`, `TK-pass8` (a screenshot name), `TK-xxx`, `TK-025b`, `TK-033b`, `TK-034b`, `TK-037b` (screenshot suffixes).
- Old ids: all 96 recheck-list rows (W1–W26, C1–C3, G1–G3, P1–P17, M1–M16, Z1–Z21, F1–F10) are in the Old ids table, plus the 10 pass-1 summary lines and 5 in-run re-checks (TK-121/040, TK-129, TK-123, TK-209, TK-210). The bot's §12 tally (FIXED 8, STILL OPEN 21, CHANGED 16, N/A 1, not tested 50) matches; CHANGED is split here into 8 still wrong, 2 unverifiable or half-checked and 6 ok.
- Every finding row points to exactly one P-row or "keep". Every P-row's "closes" list is drawn from those rows, the N-TK notes, the old ids or the C-TK items.
- Not checked: the bot's prompt log `tokyo-p3-prompts.tsv` was not supplied, so the 44 ZIGi + 24 NOVA TSV rows are counted only from the tallies; the prompts listed above are the ones quoted in tokyo.md.
