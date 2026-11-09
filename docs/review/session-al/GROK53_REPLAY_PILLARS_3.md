# Grok #53 final replay — PILLARS (L1 money, L2 health, L3 habits/Today, L4 goals/Activity, L5 tasks/Checklist, L6 chain/settings/help, L8 NOVA HUD, L9 release/CI, INT), round 3

- **Commit served:** `1a7b0163` (`1a7b0163c7d21fdee9e1bb1cc998d944ec4e35e4`, "Session AL (integration 8c84d0a6): headroom under Today's phone ceiling…"), production build from `/home/user/zig-branch`, `PUBLIC_ALPHA_UNDEPLOYED`, on http://127.0.0.1:3101. It answered (200 on `/app`); I did not build or start it.
- **Date:** 9 Nov 2026, about 01:30–05:00 UTC (wall clock; most of it waiting on the shared browser lock).
- **Replayed by:** a fresh final-replay agent (owner rule 13). I made no fixes, changed no app or test code and made no git writes; the only repository file written is this one.
- **Scope:** only the 288 rows of `scratchpad/ids/fr-pillars.tsv` (lane, AL row, id, previous verdict). Cut cells are replayed as their own ids: "C-TK-07 (+ also closes: TK-021)" → C-TK-07 and TK-021, and likewise C-DV-12/DV-019e, N-NB-23/DV-022c, DV-109, DV-111/DV-019f, N-BN-05/BN-123, C-BN-24/D-228, TK-047/N-068. `TK pass-1 "Fake currency` and `TK pass-1 "CSV` are the ledger's `TK pass-1 "Fake currency XYZ accepted"` and `TK pass-1 "CSV Name/Symbol mapping"`. For each id I read only its block in the bot files (`grok-2026-11-04/*.md`, never FINAL-REPORT.md) and in `ledger/*.md`, the id's row in the earlier replays, and the lanes' "Fifth pass" sections, `PART15_BUILD.md` and `NEXT_SESSION_BACKLOG.md` to know what claims Fixed.
- **Method** (each lane's round-2 header): Playwright 1.63 (`require('playwright')`), headless Google Chrome for Testing 153 (channel `chrome`), `locale: en-GB` (en-US for NB-017), `timezoneId: Europe/Brussels`, the bots' clock with `page.clock.install` at 4 Nov 2026 03:30 Brussels unless a row says otherwise (LS-016 01:30, Showcase Health 01:26, the Checklist 3 Nov 21:00 → 4 Nov 03:30 and 29 Oct–2 Nov, the freeze run 19–29 Oct), theme through the app's theme record, Welcome marked seen unless "W". Every run went through `flock -o /tmp/claude-0/zig-browser.lock timeout 900 node <script>`, one browser, one page at a time (two for NB-001's second tab). **Every `/api/**` request was answered 503** (no live prices, chain reads, catalog, logos or food lookup): rows that need such a service are NOT REPLAYED "needs a service". No real model: ZIGi/NOVA rows use the on-device answers; PR-035 used the repo's mock-chat pattern (a Playwright route on 127.0.0.1:1234 answering `/v1/models` and `/v1/chat/completions`). Scripts and text snapshots are in `/tmp/claude-0/final-replay-PILLARS/` (not committed).
- **Condition codes:** **D** = 1280×800 Dark, fresh empty profile. **DN** = Denver's 1920×1113 Nebula, fresh. **DL** = 1280×800 Light, fresh. **Sc** = Settings → Load Showcase Demo, 1280×800 Dark, crypto modules chosen (`zigoals:earn-prefs:v1 pageShown`). **+game** = game layer and badges on. **W** = first visit. **375 / 388 / 640 / 731 / 768 / 1097×636 / 1440** = viewport (375, 388 and 640 with mobile emulation).
- **Owner decisions:** accepted only where an ADR-037 O-row or a recorded owner decision says so: O6 (protected Checklist orbit), FR-17 (ADR-036:957, the owner's own "fold the habit FORM's counting fields under More options"), and owner finish rule 11 of 8 Nov (ADR-037: Part 15 builds the top 40 competitor/roadmap items, "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"). A competitor item in that backlog and not built is OWNER DECISION with its rank; one that is neither built nor in the backlog nor covered by F/O stays STILL OPEN. A lane's "Carried to next session" is not an owner decision.
- **L9 rows** are about the bots' harness (a shared Chrome profile, a PIN lock set by another bot, tool lag). Where a browser can check the app side (no app cause: a fresh profile is empty, unlocked, the Showcase is tab-scoped, the console is clean) I did; harness-only notes are NOT POSSIBLE (no app behaviour to replay). `node scripts/verify-hosted-alpha.mjs --help` was read for the release checks (stages 1–12; the owner's manual check, never CI); I did not run it, dispatch any workflow or deploy.
- **Caveats:** live drift, logos, coin pages, the catalog, chain reads (validators, governance, wallets) and the food-lookup provider cannot be seen with `/api` blocked. ZIGi/NOVA rows were answered on the device with no model.


## Totals (per id in the list file)

| verdict | ids |
|---|---|
| FIXED | 163 |
| HOLDS | 18 |
| STILL OPEN | 21 |
| CHANGED | 29 |
| OWNER DECISION | 12 |
| NOT POSSIBLE | 20 |
| NOT REPLAYED | 25 |
| **total ids** | **288** |

## L1 money

### AL-COUNTS-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-221 | AL-COUNTS-001 | CHANGED | FIXED | Sc | Wealth strip reads "0 of 2 market prices current … 3 need attention: 1 value that needs a fresh read, 2 without a value" (one count, the reason given). Hover on "↻ Refresh prices" (Dark): background gradient → flat rgba(111,220,255,0.2), border alpha 0.22 → 0.85, text → white. Visible hover now. |
| D-151 | AL-COUNTS-001 | NOT REPLAYED | FIXED | Sc (refresh fails: /api 503) | Refresh prices fails → live region "Prices could not be refreshed. The last good values stay, with their times."; no card says "Current" (0 on the page); cards read "Price unavailable · 24h · not verified yet". Markets says the same ("Some market data could not refresh…", cards "Price unavailable"). Run at 1280, not the bot’s 175 % zoom. |
| TK pass-1 "'Current' badge on stale prices" | AL-COUNTS-001 | UNSEEN | NOT REPLAYED | Sc, clock +16.5 min | Needs a service: a live price that ages past 15 minutes. With /api blocked no price is ever current; I saw only that no unavailable price is labelled "Current" (0 before and 0 after moving the clock 16.5 min), and the strip states "a price counts as current for 15 minutes". |

### AL-CURRENCY-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-199 | AL-CURRENCY-001 | STILL OPEN | STILL OPEN | D | Wealth → Add asset → Custom "Item GBP", value 500, currency GBP → card "500.00 GBP", In Goals "0.00 GBP", Net worth · GBP "500.00 GBP", while USD reads "US$1,500" and EUR "€8,000.00". The lane’s fifth pass (0f81e147) says a real ISO currency reads with its own symbol ("£500.00"); that is not what this build shows. |
| TK pass-1 "Fake currency XYZ accepted" | AL-CURRENCY-001 | UNSEEN | FIXED | D | Add asset → Custom, currency "XYZ" → Save refused at the field (aria-invalid) "“XYZ” is not a currency code ZIGoals knows."; Edit asset → Valuation currency "XYZ" → refused, "… Use one such as USD, EUR or GBP." |

### AL-CURRENCY-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-156 | AL-CURRENCY-002 | NOT REPLAYED | FIXED | D, crypto chosen | Same steps as G-022: the contribution plan’s currency follows the goal (EUR); a USD goal gets USD. |
| N-003 | AL-CURRENCY-002 | NOT REPLAYED | STILL OPEN | D, crypto chosen | Goal wizard → Value, name "Save €5,000 crypto safety fund", target 5000 → the currency radio stays on "USD · US dollar" and the preview reads "US$5,000.00 Value · USD"; no currency from the name and no prompt. |
| G-022 | AL-CURRENCY-002 | NOT REPLAYED | FIXED | D, crypto chosen | Goal wizard → Value, EUR goal (preview "€5,000.00 Value · EUR") → step 2 "Add a contribution plan" → Contribution asset prefilled "EUR" (follows the goal’s currency, no ZIG). |
| N-MO-03 | AL-CURRENCY-002 | NOT REPLAYED | STILL OPEN | D 1440, MOCK model, one EUR cash holding, Europe/Brussels | Settings → ZIGi → Advanced → "Monthly cap (optional) · Amount · Currency" defaults to USD although the only money on the device is EUR (€500 cash) and the time zone is Brussels. The AL row asks for the cap currency from the person’s money/locale currency. |
| NB-017 | AL-CURRENCY-002 | NOT REPLAYED | FIXED | W, locale en-US, Europe/Brussels | Onboarding step 4 (first goal): Currency "USD | EUR" with EUR preselected for a Brussels time zone. The date field is the browser’s own date input ("Target date (optional)", no format hint): the date half is the owner’s "English dates by design" (VA8, ledger P-NB-15); this row is the currency default. |

### AL-DECIMAL-INPUT-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-TK-18 | AL-DECIMAL-INPUT-001 | NOT REPLAYED | STILL OPEN | D, crypto chosen | Calculator → "Another return" (inputmode decimal, maxlength 8): typing "-abc5" leaves "-abc5" in the field, not aria-invalid and with no message (the bot’s "visibly accepts “-” and letters"). The staking calculator the bot used is now this compound calculator (BN-135). |

### AL-IMPORT-EXPORT-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK pass-1 "CSV Name/Symbol mapping" | AL-IMPORT-EXPORT-001 | UNSEEN | FIXED | D | Import fake-wealth.csv (15 rows × 7 columns, Name/Symbol/Quantity/Asset class/Market Value/Currency/Account): Name and Symbol map to Name and Asset; preview "9 rows ready · 6 rows refused" with each row named. Side note: the preview’s Kind column shows the VOO row (class "ETF") as "Stocks". |

### AL-LIMITS-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-054 | AL-LIMITS-001 | CHANGED | FIXED | D | Custom asset: pasting a 172-character name keeps 100 and says "Names keep 100 characters, so the end of what you pasted was left out (72 characters)." (aria-invalid); value 123456789012345 → "Enter an amount up to a trillion."; a valid save → toast "Item GBP added to your wealth." |

### AL-NUMBERS-SOURCE-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-059 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | FIXED | Sc, ZIGi on-device | ZIGi "Total BTC I hold?" → "You hold 0.45 BTC in Wealth (1 holding), with no price, so no value."; "How much ETH do I hold?" → "4 ETH … with no price, so no value." Wealth shows the same: "0.45 BTC · Needs valuation", "4 ETH · Needs valuation". One source, same state (live values not comparable offline). |
| Z-025 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | CHANGED | Sc, ZIGi on-device | "What is my Walk goal progress?" → "Walk: 32,000 steps this month … Best day: Sun 1 Nov (8,000 steps)". **Fixed:** thousands separators. **Still:** it answers the Walk habit, not the Health goal "Walk more (Showcase)" the bot asked about. |
| Z-021 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | STILL OPEN | Sc, ZIGi on-device | "What is my longest Exercise streak?" → "Your longest Exercise streak is 26 days; the current one is 26 days" over a tile "Exercise · this month · 3 check-ins over 4 days". The bot’s oddity (a streak longer than the check-ins beside it) reads the same; skipped days count as rest (Activity: "Skipped days never count against you"), but ZIGi’s answer does not say so. |
| Z-039 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | FIXED | Sc, ZIGi on-device | "How much ZIG have I staked?" → "No delegation is read in a chat: what is staked on the network shows on Staking once a wallet is connected there. In Wealth, your own entries marked for staking (watch-only): 300,000 ZIG (18,000.00 USD)…". Staked vs held is now said apart. |
| Z-061 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | STILL OPEN | Sc, ZIGi on-device | "/review" → "Every day with a habit planned had a check-in." above a table where every habit has skipped days ("Exercise 6 done · 6 planned · 1 skipped", "Late-night snacks 3 · 5 · 2"). The bot’s contradiction reads the same; only a line "a skipped day is part of a plan" was added. |
| D-262 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | NOT REPLAYED | — | Needs a service: live price drift between two loads (/api blocked, prices cannot move). |
| D-200 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | NOT REPLAYED | — | Needs a service: live price drift on reload. The "Totals in USD/EUR" switch the bot used no longer exists (lane note, D-221). |
| D-155 | AL-NUMBERS-SOURCE-001 | STILL OPEN | FIXED | Sc at 731×800 | Portfolio holdings box scrolls 1385 px in 575 px and now says "More columns to the right: swipe the table sideways" under it. (Portfolio’s BTC is labelled "Showcase example price"; Markets has no price offline, so the price parity was not compared.) |
| TK-6B-06 | AL-NUMBERS-SOURCE-001 | NOT REPLAYED | NOT REPLAYED | — | Needs a service: live 24h change against its as-of stamp in two themes. |

### AL-NUMBERS-SOURCE-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK pass-1 "Several totals on one page" | AL-NUMBERS-SOURCE-004 | UNSEEN | FIXED | Sc | Wealth hero: "KNOWN TRACKED WEALTH US$501,800.00 + €8,000.00 held in EUR · 13 assets · 5 accounts · Your holdings… Net worth adds your accounts and subtracts your debts", then "Net worth after debts €8,000.00 · US$531,029.00", Allocated / Available. It names what it includes; debts and the EUR total sit beside it. |

### AL-ROUNDING-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| X3-08 | AL-ROUNDING-001 | NOT REPLAYED | FIXED | Sc | NOVA (on-device) "What's the BTC price?" → "Wealth: no price for BTC on this device yet (the Wealth page shows the same). Portfolio “Fictional long-term coins”: 65,000 USD (Showcase example price)." Formatted, one line per source; no 17-digit figure. |
| TK pass-1 "Unformatted prices" | AL-ROUNDING-001 | UNSEEN | NOT REPLAYED | Sc | Needs a service: coin pages need /api/market-detail and history (no coin links render offline). Seen formatted elsewhere: Wealth/Portfolio money is formatted; NOVA "What's the BTC price?" → "65,000 USD (Showcase example price)". |

### AL-COPY-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| M10 | AL-COPY-001 | NOT REPLAYED | NOT REPLAYED | Sc | Needs a service: market logos come from /api/market-logo. Offline, Wealth and Markets show the same glyph for Gold ("△", data-kind Precious Metals) and Markets names it "Gold · troy ounces". |
| TK-203 | AL-COPY-001 | NOT REPLAYED | NOT REPLAYED | Sc | Same steps as M10 (needs the logo service). |

### AL-COUNTS-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-MO-17 | AL-COUNTS-002 | CHANGED | FIXED | Sc | Gold page: "10 troy ounces of Gold · US$4,400.00 per troy ounce", "5 troy ounces of Gold allocated"; Markets "Gold · troy ounces". |
| TK-196 | AL-COUNTS-002 | STILL OPEN | FIXED | Sc | USD Coin → Archive → "Release allocations & archive" → Goals: "Emergency fund SAVINGS GOAL NEEDS REVIEW … An archived asset no longer counts toward this goal. Open it to review." Goal page: "USD Coin was archived on 4 Nov 2026; it had counted toward this goal, and no longer does." |
| W24 | AL-COUNTS-002 | CHANGED | FIXED | Sc | Same steps as TK-196 (the remaining part of W24): the release by archive now flags the goal "Needs review" with the reason. |

### AL-ALLOCATION-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-144 | AL-ALLOCATION-001 | NOT REPLAYED | FIXED | Sc | Wizard → Quantity, goal asset BTC: "You hold 0.35 BTC not counted toward any goal, in Bitcoin. Count it toward this …"; step 2 lists "₿ Bitcoin 0.35 available of 0.45 BTC". |
| TK-194 | AL-ALLOCATION-001 | UNSEEN | FIXED | Sc | Wizard step 2 source cards say what is free: "₿ Bitcoin 0.35 available of 0.45 BTC", "ZIG reward reserve 290,000 available of 300,000 ZIG", "USD Coin 8,000 available of 12,000 USDC", "Gold 5 available of 10 GOLD"; unallocated ones show their amount. The review lists each fact as its own row of a definition list ("Planned contributions · None" is a separate dt/dd). No fully allocated asset exists in the Showcase to see "0 available". |

### AL-COPY-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-146 | AL-COPY-003 | CHANGED | FIXED | D | Edit "Silver coins": the value field holds the plain "1500" and is described by "Now US$1,500.00."; renamed to "Silver coins new" → toast "Silver coins new saved." |

### AL-COPY-006

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK pass-1 "'Explain wealth change' 99 % unclassified" | AL-COPY-006 | UNSEEN | FIXED | Sc | "Explain recorded wealth change" reads "+US$83,260.10 over this range · Since 29 Oct 2026: Property +US$2,240.00 · Crypto −US$397.95 · 6 more classes" (and "Cash +€88.00" for EUR). The change is split by class; no "unclassified" share. |

### AL-FIELD-ERROR-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-036 | AL-FIELD-ERROR-002 | CHANGED | STILL OPEN | D | Calculator 100/month, 10 years → "ESTIMATED FINAL VALUE US$17,175.24"; Years 61 → "Whole years from 1 to 60." and the result is replaced by "Correct the marked field to see the estimate." (no last result kept dimmed, the bot’s ask). The lane carries it: the pinned B-123/TR14 assertion forbids figures while a field is wrong; that is a test pin, not an F/O decision. |

### AL-MOTION-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-259 | AL-MOTION-001 | NOT REPLAYED | FIXED | Sc 388×844 Dark | 27 samples every 60 ms from the moment Wealth opens: every frame already shows the settled "US$501,800.00" (no counting digits drawn over each other), the figure is font-variant-numeric tabular-nums. (One pair of digit boxes overlapped in every frame, the settled one too: static layout, not the count-up.) |
| DV-268a | AL-MOTION-001 | NOT REPLAYED | FIXED | Sc 768 Light | 27 samples every 60 ms from the moment Wealth opens: every frame already shows the settled "US$501,800.00" (no counting digits drawn over each other), the figure is font-variant-numeric tabular-nums. No overlap in any frame. |
| TK-090 | AL-MOTION-001 | NOT REPLAYED | FIXED | Sc 375 Dark | 27 samples every 60 ms from the moment Wealth opens: every frame already shows the settled "US$501,800.00" (no counting digits drawn over each other), the figure is font-variant-numeric tabular-nums. (The same static pair as DV-259 in every frame.) |
| N-TK-17 | AL-MOTION-001 | NOT REPLAYED | FIXED | Sc 1280 Light | 27 samples every 60 ms from the moment Wealth opens: every frame already shows the settled "US$501,800.00" (no counting digits drawn over each other), the figure is font-variant-numeric tabular-nums. No overlap in any frame. |

### AL-TOAST-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK pass-1 "Refresh with no feedback" | AL-TOAST-002 | UNSEEN | FIXED | Sc (refresh fails) | Markets → "↻ Refresh market data": the live region says "Some market data could not be refreshed. The last good values stay, with their times." (the request fails at once here, so no busy label was seen). |

### AL-PERF-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-TK-20 | AL-PERF-001 | NOT REPLAYED | FIXED | Sc | Today sampled every 200 ms from navigation: the first sample already reads "tracked wealth US$501,800.00" and "Known tracked wealth · holdings, before debts"; three loading outlines go by 800 ms; no blank-then-pop figure. (Manual values; a live price settle needs a service.) |

### AL-SEARCH-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| W15 | AL-SEARCH-001 | UNSEEN | NOT REPLAYED | — | Needs a service: the public asset catalog behind "gold"/"bitcoin"/"b" search (/api/market-assets blocked). |

### AL-COMPETITOR-GAP-008

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-51 | AL-COMPETITOR-GAP-008 | NOT REPLAYED | CHANGED | D | Wealth → Import from your bank → CSV file → a Mint export (Date, Description, Original Description, Amount, Transaction Type…) → "This looks like a Mint export. Its columns are matched by their own names: Transaction Type says money in or out…". Monarch is recognised too (C-DVG-83). **Not built:** a Copilot preset (PART15_BUILD: "not added", a lane reason; not in the owner’s backlog and not an F/O decision). |

### AL-COMPETITOR-GAP-013

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-58 | AL-COMPETITOR-GAP-013 | REASON CITED | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 6 "An AI copilot that explains a chart" (needs a connected model). Not built; coin pages could not open offline. |

### AL-COMPETITOR-GAP-019

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-65 | AL-COMPETITOR-GAP-019 | REASON CITED | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 5 "DeFi positions and any-address P&L" (new chain/indexer sources). |

### AL-COMPETITOR-GAP-021

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-TK-07 | AL-COMPETITOR-GAP-021 | UNSEEN | FIXED | D, crypto chosen | New portfolio "Tokyo test coins", 0.5 BTC at 60,000 → Bitcoin page offers "Count these 0.5 BTC in Wealth too… A copy: later trades here do not change Wealth. Copy 0.5 BTC to Wealth" → toast "0.5 BTC copied to Wealth. · Open in Wealth"; then "Wealth already tracks BTC as “Bitcoin”. Change its quantity there; Portfolio and Wealth are kept apart." and no second copy button. |
| TK-021 | AL-COMPETITOR-GAP-021 | UNSEEN | FIXED | Sc | Portfolio shows no "Portfolio is off" banner; it says "It stays apart from your Wealth and Goals." |

### AL-COMPETITOR-GAP-023

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-TK-09 | AL-COMPETITOR-GAP-023 | NOT REPLAYED | FIXED | D, crypto chosen | Wealth → "ANY ADDRESS · READ-ONLY Look up an address · No account and no wallet app needed: paste a public ZIGChain, EVM…, Solana or Bitcoin address" → pasted zig1xjhk3wur… → Look up → it is kept as a read-only linked wallet ("Your linked wallets … ZIGChain address"). Its balance read needs the relay (blocked here: "could not read a coherent snapshot of this wallet just now"). |

### AL-COMPETITOR-GAP-025

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-TK-11 | AL-COMPETITOR-GAP-025 | REASON CITED | FIXED | D, crypto chosen | After the copy, Wealth → Bitcoin shows "GAIN OR LOSS · FROM PORTFOLIO · What your BTC cost, and what it is worth · Tokyo test coins: 0.5 BTC, cost US$30,000.00 (average US$60,000.00 per BTC). No current price in USD just now." (the gain itself needs a live price, a service). |

### AL-COMPETITOR-GAP-040

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-X3-07 | AL-COMPETITOR-GAP-040 | REASON CITED | FIXED | Sc | Same steps as C-TK-32. |
| C-TK-32 | AL-COMPETITOR-GAP-040 | REASON CITED | FIXED | Sc | Today: "Net worth after debts €8,000.00 · US$531,029.00 · Unchanged since yesterday · your recorded values, last 30 days" (the 30-day line and the change since yesterday, PART15_BUILD GAP-040). |

### AL-COMPETITOR-GAP-041

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-TK-33 | AL-COMPETITOR-GAP-041 | REASON CITED | OWNER DECISION | Sc | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 2 "Daily snapshot message" (needs a channel; push is off by the owner). In the app Today shows the day line "Unchanged since yesterday". |

## L2 health

### AL-CROSS-PAGE-SYNC-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-016 | AL-CROSS-PAGE-SYNC-001 | STILL OPEN | FIXED | D 01:30 | Health → star Water, Add 250 mL with no water target → Checklist planet "Water: 250 ml today, no daily target yet: not done yet" and "All planets lit (not reached yet)". Done only at a target now. |
| LS-056 | AL-CROSS-PAGE-SYNC-001 | STILL OPEN | FIXED | 375 (target 2,000 mL) | Checklist → Water → "Water in ml" 2.5 → Log → refused at the field (aria-invalid) "Enter an amount of water in whole mL, more than 0 and at most 5,000 mL."; the planet stays "not done yet". |
| LC-002 | AL-CROSS-PAGE-SYNC-001 | STILL OPEN | FIXED | D 01:30, Sc | Fresh: as LS-016. Showcase: "Water: 1,250 ml today of 2,000 ml: not done yet". |
| PR-019 | AL-CROSS-PAGE-SYNC-001 | CHANGED | FIXED | Sc 01:26 | Health +250 mL → "Water 1,250 of 2,000 mL"; Drink water habit "1.25 / 2 liters per day · Partial · Counting from your water journal · 1,250 mL so far; it ticks itself off at the target"; Today "WATER 1,250 mL of 2,000 mL" and the habit row "1.25 / 2 liters"; Checklist "Water: 1,250 ml today of 2,000 ml: not done yet". One figure everywhere. |
| X3-26 | AL-CROSS-PAGE-SYNC-001 | STILL OPEN | FIXED | D 01:30 | Same steps as LS-016. |
| BUG-043 | AL-CROSS-PAGE-SYNC-001 | OUT OF SCOPE | FIXED | Sc 01:26 | Same steps as PR-019: the water-linked habit follows the Health journal (1.25 L after a new 250 mL entry), no stale count. |
| L-021 | AL-CROSS-PAGE-SYNC-001 | OUT OF SCOPE | FIXED | Sc 01:26 | Same steps as PR-019 (L-021 is the cross-reference of BUG-043). |

### AL-FIELD-ERROR-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-173 | AL-FIELD-ERROR-003 | OUT OF SCOPE | STILL OPEN | D 04:00 | Settings → Evening wrap-up: clear "From" (required) and save → only the browser’s native bubble "Please fill out this field." (no field message, not aria-invalid). The time zone is a picker with nothing to clear. |
| D-190 | AL-FIELD-ERROR-003 | OUT OF SCOPE | FIXED | D 04:00 | Settings → My links → Edit "Running club" → Name and Address cleared → Save link → "Give the link a name." shown at the form; the account area now says why its sign-in is limited ("The sign-in is sealed on this device: never synced, exported or put in an address"). |
| D-052 | AL-FIELD-ERROR-003 | OUT OF SCOPE | NOT REPLAYED | Sc | Needs a service: adding a ninth favourite goes through the market catalog search ("cardano", /api blocked). Seen offline: Markets now reads "7 of 50 · Your favourites" (the 8-favourite limit the bot hit is gone). |
| D-090 | AL-FIELD-ERROR-003 | OUT OF SCOPE | CHANGED | D 01:30 | Health → Sleep → Log a night: defaults save "Night saved."; wake before bed → "Woke up must be after went to bed."; a night ending in the future → "The night cannot end later than now (01:30)." (specific, at the form). **Still:** the card is still headed "Sleep debt" (the bot’s "judgemental" word). |
| D-172 | AL-FIELD-ERROR-003 | OUT OF SCOPE | CHANGED | D 04:00 | Settings → Your links → Add a link with Name empty and Address the prefilled "https://" → Add link: no native tooltip now; the focus moves to the Address field, in view (top 178 px). **Still:** no message says what is missing (no field error, nothing aria-invalid). |

### AL-FIELD-ERROR-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-35 | AL-FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | D (env) | Needs a service: a working barcode lookup needs the food-lookup provider (/api/food-lookup blocked; this build has none either). The by-name food search is on the device. |
| MO-007 | AL-FIELD-ERROR-004 | CHANGED | NOT REPLAYED | D (env) | Needs a service: whether a lookup succeeds needs the food-lookup provider. What can be seen: 3017620422003 → "Lookup is not available here. Search foods by name instead? · Add it yourself", and the form keeps "Barcode 3017620422003". |
| MO-107 | AL-FIELD-ERROR-004 | CHANGED | FIXED | D (env) | "12" → "A barcode has 8, 12, 13 or 14 digits; this one has 2." with Look up disabled; 3017620422004 → "The last digit of this EAN-13 code does not match the others (its check digit)…"; 0000000000000 → kept as typed ("Barcode 0000000000000 could not be looked up here", no longer 8 zeros) with Add it yourself. A provider’s real "not found" needs a service. |
| Oct-26 gap: barcode provider inactive | AL-FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | — | Needs a service: turning a lookup provider on is a deployment setting, not a screen a replay can press. |
| C-MO-01 | AL-FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | D (env) | Needs a service (a branded barcode lookup, e.g. Nutella 3017620422003, needs the provider). |

### AL-LIMITS-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-044 | AL-LIMITS-002 | STILL OPEN | FIXED | D | Average goal "Less screen time", own measure in hours, at most 2: day value 30 → "A day holds at most 24 hours. Enter from 0 to 24 hours." (refused); 22 → asks once "If it is right, press Save again to keep it."; the second Save keeps it. |
| B-197 | AL-LIMITS-002 | OUT OF SCOPE | STILL OPEN | D | + New habit: title "P9 <b>x</b>" + 240 letters keeps 100 characters (shown as text, no markup); Measurement Count, target 1,000,000,000 per day → created with no cap or check: card "1,000,000,000 times per day · 0 / 1,000,000,000". The AL row asks for per-measure plausibility caps on habit targets. |

### AL-NAV-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-014 | AL-NAV-002 | STILL OPEN | FIXED | D | Health views are now one role=tablist with 11 role=tab (aria-selected on "Diary"; 0 aria-pressed buttons); /app/health?view=weight opens with "Weight" selected. |

### AL-COPY-014

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-050 | AL-COPY-014 | OUT OF SCOPE | FIXED | D | Health read top to bottom: no NaN/undefined/empty figures; no-data cells read "—" / "No entry today". (The bot gave no exact texts; judged against the row’s "dash for no data".) |
| D-046 | AL-COPY-014 | OUT OF SCOPE | FIXED | Sc 01:26 | Health → Diary → quick pick "Berry overnight oats" → the log form’s "Food or recipe" is set to it (Meal Breakfast, Servings) → Log to diary → "Meal logged." shown in view (top 495 px of 800); no stray Undo visible. |

### AL-DATES-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-117 | AL-DATES-003 | OUT OF SCOPE | NOT POSSIBLE | D | The bot’s tab crash ("Aw, Snap!" after finishing a workout) was unconfirmed and blamed on box memory, and it did not come back in its own re-check. Here "Start an empty workout" → "Workout in progress · Started 03:30 · 0:00"; nothing crashed. |

### AL-LIMITS-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-36 | AL-LIMITS-003 | REASON CITED | STILL OPEN | D | Fasting → Custom → 30 hours → "Choose a target from 1 to 18 hours." ("Target hours (1–18; every fast stops itself at 24 h)"). 24 h+ targets are not built; the lane’s "owner decision P5" is not an AL_SCOPE F / ADR-037 O-row, and the item is not in the owner’s backlog. |
| PR-018 | AL-LIMITS-003 | STILL OPEN | NOT REPLAYED | Sc 01:26, D | Half seen: the Checklist Sleep tile now asks "Start sleep now? Tap Sleep again when you wake" (as Fast and Focus do). The meditation timer’s 20-second stop (the "one minimum" part) could not be reached by my scripts in two tries (the Showcase Meditate planet did not start a timer on tap, and Health showed no meditation timer on its first view). |

### AL-PERF-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-098 | AL-PERF-002 | OUT OF SCOPE | NOT POSSIBLE | — | The bot saw a stuck skeleton once in ~40 navigations on a heavily loaded box and its own 05:28 re-check was "NOT REPRODUCIBLE"; there is no step that brings it back on a normal machine. |

### AL-COPY-022

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-13 | AL-COPY-022 | REASON CITED | FIXED | Sc | Targets → Micronutrients: "More from your foods: Magnesium, zinc, B vitamins and omega-3 show here when a food you logged today carries them…" beside the reference-intake lines. |

### AL-ROUNDING-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-MO-14 | AL-ROUNDING-002 | CHANGED | FIXED | D | 70.55 kg saved → every place says 70.55 kg: "WEIGHT TREND 70.55 kg", "Latest reading 70.55 kg", "Latest in 30 days 70.55 kg", "FIRST OBSERVATION 70.55 kg", "Average 70.55 kg", history row, and Today "Weight recorded 70.55 kg". (Only the chart’s axis ticks read 70.3/70.6/70.9.) |
| N-NB-10 | AL-ROUNDING-002 | CHANGED | FIXED | D | Same steps as N-MO-14. |

### AL-COMPETITOR-GAP-049

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-10 | AL-COMPETITOR-GAP-049 | REASON CITED | FIXED | Sc | Fasting card: "Ask on Today to start a fast after I log [Breakfast/Lunch/Dinner/Snacks] · Quiet hours apply" and "Remind me on Today when a fast reaches its target" (PART15 P15-B). |

### AL-COMPETITOR-GAP-057

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-23 | AL-COMPETITOR-GAP-057 | REASON CITED | FIXED | Sc | Sleep: "an estimate from your sleep · good focus 09:20–11:20 · bedtime tonight 22:05–22:35". |
| C-X3-11 | AL-COMPETITOR-GAP-057 | REASON CITED | FIXED | Sc | Same steps as C-MO-23. |

### AL-COMPETITOR-GAP-066

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-35 | AL-COMPETITOR-GAP-066 | REASON CITED | FIXED | Sc | Fasting card: "Fasts that reached your own target: 1 day in a row · 1 of the last 7 days". |

### AL-COMPETITOR-GAP-067

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-37 | AL-COMPETITOR-GAP-067 | REASON CITED | FIXED | Sc | Beyond "Fasting end": the in-app "start a fast after I log …" ask on Today. A notification while the app is closed is NEXT_SESSION_BACKLOG rank 16 (push stays off by the owner). |

### AL-COMPETITOR-GAP-069

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-MO-39 | AL-COMPETITOR-GAP-069 | REASON CITED | OWNER DECISION | Sc | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 13 "Calorie-burn estimate — by design: “No calorie expenditure is estimated” (owner)". Not built; no expenditure figure on Health. |

### AL-COMPETITOR-GAP-075

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-X3-13 | AL-COMPETITOR-GAP-075 | REASON CITED | FIXED | Sc | Sleep: "Sleep debt 7 h 36 min … added up over the 6 nights" and "Short nights only: 7 h 36 min under your goal (long nights not netted against them)". |

### AL-COMPETITOR-GAP-076

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-36 | AL-COMPETITOR-GAP-076 | REASON CITED | FIXED | Sc | Same steps as C-MO-59. |
| C-MO-59 | AL-COMPETITOR-GAP-076 | REASON CITED | FIXED | Sc | Diary offers "Estimate a meal from a photo" (through the person’s own AI), "Scan or look up a food barcode", a label read, and text/voice lines become food cards (PART15 P15-B GAP-076). An on-device photo estimate is backlog rank 17. |

### AL-COMPETITOR-GAP-081

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-41 | AL-COMPETITOR-GAP-081 | CHANGED | FIXED | Sc | Fasting: presets 12:12 / 14:10 / 16:8 / Custom, "Fasts that reached your own target: 1 day in a row · 1 of the last 7 days", "Remind me on Today when a fast reaches its target", "Ask on Today to start a fast after I log …". |

### AL-COMPETITOR-GAP-082

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-42 | AL-COMPETITOR-GAP-082 | REASON CITED | FIXED | Sc | Same steps as C-MO-04. |
| C-MO-04 | AL-COMPETITOR-GAP-082 | REASON CITED | FIXED | Sc | Targets: "Estimate my maintenance calories (optional)" (labelled an estimate, used only by the person’s choice). |

## L3 habits / Today

### AL-CONFIRM-DELETE-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-124 | AL-CONFIRM-DELETE-004 | OTHER | FIXED | DL 02:10 | New habit → ⋯ offers "Pause from today · Archive habit… · Delete habit… · Duplicate habit" from day one; Archive → "Archive ArchMe? It leaves your lists today. Its history is kept; you can restore it later…" → toast "ArchMe is archived today. Undo". No stale "Habit created." line. |

### AL-COPY-025

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-01 | AL-COPY-025 | CHANGED | FIXED | W 00:28 | First run walked to the end, plus Today: the skip words seen are "Skip this step" (inside a step) and "Skip setup" (leave setup; also Today’s welcome card). "Continue without choosing", "End the tour" and "Not now" are gone. (The tour’s own skip, "Skip the tour" per the lane, was not reached by my walk.) |

### AL-STREAKS-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-093 | AL-STREAKS-003 | STILL OPEN | FIXED | DL | LIMIT, 3× per week, target 2: card "3× per week · Limit 2 times per week · 0 of at most 2 times this week · Within the limit so far"; after 3 taps "3 of at most 2 times this week · Over the limit this week" ("Within limit" gone). One weekly count. |
| BUG-071 | AL-STREAKS-003 | NOT REPLAYED | FIXED | D | Habit → Edit → Schedule "X times per period" = 4 → Save: card "4× per week · 0 / 4 this week"; the stored rule is {frequency, times 4, period week} with target 1 per day unchanged (targetPeriod "day"). |

### AL-UNDO-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LA-019 | AL-UNDO-002 | NOT REPLAYED | FIXED | D, ZIGi on-device (Habits) | "log 2 glasses of water" → preview "Will save: Water · 2 glasses (500 mL) · today" → Save → toast "Saved: Water · 500 mL · today · Undo" → Undo: the Health water entry is gone again (1 → 0). The panel says "Health isn’t shared with ZIGi, but saving this line still saves it to Health." |
| LZ-027 | AL-UNDO-002 | NOT REPLAYED | FIXED | D, ZIGi on-device | Same steps as LA-019 (composer Save now has Undo, which deletes exactly the record it made). |

### AL-XP-BADGES-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-045 | AL-XP-BADGES-002 | NOT REPLAYED | FIXED | DN | Average "Screen time", at most 2 h, 2.3 h entered (target missed) → the only finishing action offered is "Close as not reached" (no "Mark as finished" into the Hall). |

### AL-COPY-028

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-044 | AL-COPY-028 | CHANGED | FIXED | DL | Daily habit ticked today → Edit: "Changes effective from" shows 2026-11-04 (today) and stays today after Weekdays only; it moves to 2026-11-05 only for a target change, live, with the rule said under it ("today when … the change keeps today’s type, unit and target …; else tomorrow"). Not "tomorrow by default" any more. |
| DV-132 | AL-COPY-028 | CHANGED | OWNER DECISION | DL 02:10 | Owner decision FR-17 (ADR-036:957, the owner’s own words: "fold the habit FORM’s counting fields (create/edit) under “More options”"). Type, measure and target are still folded, as decided; the quit explanation was fixed earlier. |
| DV-243 | AL-COPY-028 | CHANGED | FIXED | DL 02:10 | Opened, the fold sits right after "Category / area" and starts with "Habit type", so Habit type is asked before "Reminder time — on this device" (the bot’s order complaint). The fold itself is FR-17. |

### AL-DISCOVERABILITY-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-21 | AL-DISCOVERABILITY-001 | STILL OPEN | OWNER DECISION | DL 02:10 | Owner decision FR-17 (ADR-036:957, the owner’s own words: "fold the habit FORM’s counting fields (create/edit) under “More options”"). Before More options the form shows Template, Title, Time of day, Schedule, Category, Reminder time, Done automatically; Habit type, Measurement, Unit, Target sit in the fold. |

### AL-FIELD-ERROR-009

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-MO-27 | AL-FIELD-ERROR-009 | OTHER | FIXED | DL | Habit title "   " → Create: "Habit title: Give the habit a name." at the field (aria-invalid, aria-describedby names it), focus on the field. |

### AL-STREAKS-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-033 | AL-STREAKS-005 | CHANGED | FIXED | 375 Dark, path QA Read + Water glass, clock 29 Oct → 2 Nov | The flame is named "0-day streak: the days every planet was lit" (title too), and the List opens with "The flame counts the days every planet was lit; a day with nothing on the path rests." |
| LS-070 | AL-STREAKS-005 | STILL OPEN | FIXED | 375 Dark, as LS-033 | QA Read ticked on the Checklist each day 29 Oct–2 Nov, Water glass never: List row "QA Read · 1 time · Habit · 4 day streak · 09:00" (its own streak; one daily tap of the five did not register in my script), flame 0 days, rule beside it. |
| C-LS-34 | AL-STREAKS-005 | STILL OPEN | FIXED | 375 Dark, as LS-033 | Same steps as LS-070: per-item streak in the List view. |

### AL-UNITS-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-114 | AL-UNITS-003 | NOT REPLAYED | NOT REPLAYED | DN, ZIGi/NOVA on-device | Two tries: a Duration habit "Warm up" (5 minutes) was made, but my scripts could not enter a fractional value on its card (the "set or add a value" control did not open), so ZIGi and NOVA had no fractional minutes to word. Not a verdict on the app. |

### AL-XP-BADGES-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-045e | AL-XP-BADGES-003 | CHANGED | CHANGED | Sc 1440×900 +game | Journey has no mid-page "Lovely" card and badges to earn fold under "Still to earn (4 of 16)". **Still very long:** 7,178 px at 1440 (round 2: 7,872) and 11,285 px at 375. |

### AL-XP-BADGES-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-052 | AL-XP-BADGES-007 | STILL OPEN | FIXED | 340 Light, Chess switched on, +game | Journey keeps its four planets and now says why: "Chess has no planet of its own: the four planets are the four parts of ZIGoals. A game or the daily puzzle that ticks off the habit chosen in Chess lights Habits." (the AL row’s "with a note" option). |

### AL-LAYOUT-375-008

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-TK-13 | AL-LAYOUT-375-008 | NOT REPLAYED | FIXED | Sc 375 | Today’s focus at 375: card widths 169 + 169 (a pair), then full 343-px cards; no half-width card alone on a row. |

### AL-COMPETITOR-GAP-087

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-19 | AL-COMPETITOR-GAP-087 | STILL OPEN | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 1 "“Perfect day” view with a backlog of past days" (a new surface; past days are reachable through the month grid, each habit’s History and the Checklist’s "Fill in a day"). Not built. |

### AL-COMPETITOR-GAP-088

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-20 | AL-COMPETITOR-GAP-088 | STILL OPEN | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 3 "Flexible day goal (“4 of 6 counts”) — changes the protected Checklist day rule… an owner decision first" (O6 protects the orbit). Not built. |

### AL-COMPETITOR-GAP-089

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-23 | AL-COMPETITOR-GAP-089 | NOT REPLAYED | FIXED | D, NOVA | NOVA → "Your day" opens "MORNING BRIEF AND EVENING RECAP · Your day · MADE ON THIS DEVICE · A morning brief, and from 18:00 an evening recap, from your own records by ZIGi’s rules; no AI is needed" (empty profile: "Nothing to brief yet…"). |

### AL-COMPETITOR-GAP-100

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-02 | AL-COMPETITOR-GAP-100 | NOT REPLAYED | FIXED | DL | Habit Details: "A reason in your own words helps on the days it is hard. Add your why" and "Add when and where" (the commitment why / plan, PART15 GAP-100). |

### AL-COMPETITOR-GAP-105

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-11 | AL-COMPETITOR-GAP-105 | REASON CITED | FIXED | DL | Habit Details: "A habit with several parts, like a morning routine, can hold its own steps to tick each day. Add a checklist" (PART15 GAP-105). |
| C-NB-35 | AL-COMPETITOR-GAP-105 | REASON CITED | FIXED | DL | Same steps as C-NB-11. |

### AL-COMPETITOR-GAP-108

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-27 | AL-COMPETITOR-GAP-108 | UNSEEN | FIXED | DL | Built within existing links (PART15 GAP-108): a new habit’s form offers "Done automatically when" (Health water, steps, sleep), and the Showcase Drink water habit counts "from your water journal" (PR-019). Live wearable sync is NEXT_SESSION_BACKLOG rank 18 (an outside host per vendor). |

### AL-COMPETITOR-GAP-109

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-31 | AL-COMPETITOR-GAP-109 | NOT REPLAYED | FIXED | DL | Habit Details: "Put your habits in a calendar app · a .ics file from the Agenda, made on this device." (PART15 GAP-109). |

### AL-COMPETITOR-GAP-111

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-36 | AL-COMPETITOR-GAP-111 | OTHER | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 7 "ZIGi as a companion (personality, check-ins over weeks) — a judgement on ZIGi as a whole for L7 and the owner". |

### AL-TIMEZONE-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-22 | AL-TIMEZONE-002 | REASON CITED | STILL OPEN | D | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across stored records; needs its own owner-approved part" (lanes/L3.md P-NB-45). That is a lane reason, not an F/O decision, and the item is not in the owner’s NEXT_SESSION_BACKLOG. |
| C-NB-28 | AL-TIMEZONE-002 | REASON CITED | STILL OPEN | D | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across stored records; needs its own owner-approved part" (lanes/L3.md P-NB-45). That is a lane reason, not an F/O decision, and the item is not in the owner’s NEXT_SESSION_BACKLOG. |
| N-NB-11 | AL-TIMEZONE-002 | REASON CITED | STILL OPEN | W 01:28 | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across stored records; needs its own owner-approved part" (lanes/L3.md P-NB-45). That is a lane reason, not an F/O decision, and the item is not in the owner’s NEXT_SESSION_BACKLOG. (Setup habits stay completable at 01:30, as round 1 saw.) |

## L4 goals / Activity

### AL-CONFIRM-DELETE-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-083 | AL-CONFIRM-DELETE-005 | CHANGED | CHANGED | Sc | Goals → Health goals → "End Walk more (Showcase)": it still ends at once with no confirm (0 alertdialog); toast "Walk more (Showcase) ended. Undo". The bot asked for a confirm; the lane keeps Undo instead (its own reading, not an F/O decision). |
| M-104 | AL-CONFIRM-DELETE-005 | CHANGED | CHANGED | DN | Remove milestone "9 books": still no confirm (no alertdialog); the toast "“9 books” removed." with Undo lasts 12.4 s and is keyboard-reachable. The bot asked for a confirm or Undo; the Undo is there, the confirm is not (as B-083). |
| M-131 | AL-CONFIRM-DELETE-005 | CHANGED | CHANGED | Sc | Same steps as B-083: End goal is immediate, no confirmation, Undo in the toast. |

### AL-CONFIRM-DELETE-006

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-175 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | Sc | Completed "My first 0.1 BTC" card ⋯: "Ask ZIGi about this · Open goal · Edit details · Close… · Delete… · Change artwork…"; no "Add … to Today" on a completed goal. |

### AL-NUMBERS-SOURCE-009

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-164 | AL-NUMBERS-SOURCE-009 | STILL OPEN | FIXED | Sc+chain 1097×636 | Count goal "Test goal", 10 BTC → step 2 "Count what I already hold" lists "₿ Bitcoin 0.35 available of 0.45 BTC · Automatic price" (no "No assets yet"). |

### AL-NUMBERS-SOURCE-010

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-166 | AL-NUMBERS-SOURCE-010 | CHANGED | FIXED | Sc+chain | New Reward goal "QA Reward goal" → its Wealth chooser lists "ZIG reward reserve 290,000 available of 300,000 ZIG · Manual value" and selects it for allocation (the unallocated remainder shown). |

### AL-NUMBERS-SOURCE-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-014 | AL-NUMBERS-SOURCE-011 | CHANGED | FIXED | DN | Average "Walk 8000 steps" at 7,400: card "93 % · 7,400 steps a day on average · 1 of 7 days recorded · Close: within a tenth of your target over the last 7 days." |
| PR-024 | AL-NUMBERS-SOURCE-011 | CHANGED | FIXED | Sc | Emergency fund: pace card "At this pace: about 6 Jan 2028 … about US$771.17 every 30 days"; "On track?" now says "Your pace forecast, with no growth: about US$771.17 every 30 days, reaching it about 6 Jan 2028"; the plan line is "If every planned payment is made". One pace figure and date on the page (no 90-day US$250 figure). |

### AL-UNITS-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-055 | AL-UNITS-004 | CHANGED | FIXED | DN | "Reach a number of something", unit "USD" → Create refused under the unit: "USD is money: choose “Save an amount” to count money you have or will save." |

### AL-XP-BADGES-009

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-092 | AL-XP-BADGES-009 | STILL OPEN | FIXED | Sc+game | Activity, Yesterday 15:45: "Goal · Milestone ticked: “Create the portfolio” · Showcase · Launch my creative studio" (no "Portfolio completed" on an active 50 % goal). |

### AL-A11Y-014

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-040g | AL-A11Y-014 | CHANGED | CHANGED | DN | Card ⋯ is a `<button aria-expanded="false" aria-label="Options for DV Count books">`; its items are links and buttons, 0 role=menu / role=menuitem. The lane carried role=menuitem (a shared-component decision for the owner). |
| DV-056c | AL-A11Y-014 | CHANGED | CHANGED | DN | Same steps as DV-040g (0 role=menuitem). |

### AL-A11Y-015

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-170 | AL-A11Y-015 | CHANGED | CHANGED | DN | Activity Remove is named after its row ("Remove Water: 250 mL, 4 Nov 2026"), 44 px, with a 12 s Undo; still on every row, not inside a ⋯ (lane: carried, a visual decision). |

### AL-A11Y-016

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| M-091 | AL-A11Y-016 | STILL OPEN | FIXED | DN | Today → Quick add: the focus lands in the line field ("Type a line"). |
| D-028 | AL-A11Y-016 | STILL OPEN | STILL OPEN | Sc | Showcase Today, Tab pressed from the top until focus wrapped: 176 stops (the bot counted ~173). The lane carried it ("173 stops before and after", 30 regions); no change. |
| D-230 | AL-A11Y-016 | CHANGED | FIXED | DN | Settings → "Back to top" (Enter): the focus moves to `<main id="main">` (not the bottom link); Motion offers "Full / Calm (entrances only) / Off". |
| D-055 | AL-A11Y-016 | CHANGED | CHANGED | Sc | Wealth → "Options for Bitcoin": "Add quantity to Today · Add value to Today · Add available to Today · Add allocations to Today" (the long name is not repeated) but still no Edit or Delete in the card’s menu. Lane: carried (L1 file). |

### AL-ACTIVITY-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-170 | AL-ACTIVITY-003 | NOT REPLAYED | FIXED | Sc+game | Activity: seeded rows carry "Showcase example"; my own new goal’s row reads "Added by you", untagged. |

### AL-COMPETITOR-GAP-114

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DV-12 | AL-COMPETITOR-GAP-114 | UNSEEN | FIXED | DN | 15 move controls for 5 milestones, "Place: At the end / First / After “3 books” …" when adding; "Move 15 books up" moved it above "12 books". |
| DV-019e | AL-COMPETITOR-GAP-114 | UNSEEN | FIXED | DN | Same steps as C-DV-12. |

### AL-COMPETITOR-GAP-115

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DV-05 | AL-COMPETITOR-GAP-115 | REASON CITED | FIXED | DN | Goals → Tree: "No sub-goals yet · Drag a goal onto another, or use its ⋯ menu here (move it, or add a sub-goal under it)" (PART15 GAP-115). |

### AL-COPY-034

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-015 | AL-COPY-034 | CHANGED | FIXED | DN | "Funding Wealth" and "Link your wealth" are gone from the count goal; no Wealth module on it. |
| DV-018 | AL-COPY-034 | CHANGED | FIXED | Sc | "Launch my creative studio": eyebrow "PROJECT" (not "PROJECT GOAL · PROJECT"), and no Goal Vault / "staked keeps earning" text on the project. |
| DV-034a | AL-COPY-034 | CHANGED | CHANGED | DN | Count goal "DV Count books" page: no Wealth module, no "Counted wealth" chart, no liquidity line, "Your plan · NO PLAN · Add what you count…", timeline "Where it comes from: Your own count for “dv count books”". **Still:** its plan form says "Contribution asset" (a money word round 2 listed). |
| DV-041b | AL-COPY-034 | CHANGED | FIXED | DN | Completed project timeline: "Target reached · goal completed · 4 milestones" (no "4 USD", no money "Exact amount" row on the project). |
| DV-104 | AL-COPY-034 | CHANGED | FIXED | DN | Count wizard steps: "Count what I already hold / Add to it from now on", "Habits help you keep going; only what you add counts toward the target", review "Only what you add counts toward it; nothing is counted for you" (no "A plan, not a transfer", no "CURRENT WEALTH" / "Still to fund" / "(UNIT)"); the count page has no Wealth module or "Counted wealth" chart. |
| MO-120 | AL-COPY-034 | CHANGED | FIXED | DN | Count goal in its own unit ("3 books / 20 books"); the page no longer has the "Wealth … add money you have" module or "UNKNOWN · MANUAL" valuation words. |
| NB-098 | AL-COPY-034 | CHANGED | FIXED | DN | Same steps as DV-041b. |
| N-NB-23 | AL-COPY-034 | UNSEEN | CHANGED | Sc+chain | Reward goal page: "REWARDS GOAL · PRIVATE ALLOCATION … CURRENT HOLDING 0 ZIG of 100 ZIG" (no "CURRENT WEALTH"). **Still:** no sentence on the page now says what a Reward goal tracks (round 2 saw "A Reward Goal grows with your unclaimed rewards…"; not in this page’s text), and the hero still offers "Funding Wealth · NO PLAN" and "Link your wealth →". |
| DV-022c | AL-COPY-034 | UNSEEN | FIXED | DN | Count card "3 books / 20 books · 15 % · Of the way there · 17 books remaining" (no "Of your goal funded" on a count goal). |

### AL-COPY-035

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-007b | AL-COPY-035 | CHANGED | CHANGED | DN | Most mid-sentence "goal" is lower case now ("Retained goal milestones", "Goal details" as a heading). **Still:** "This Goal already has a milestone called…", "1 active Goal has no target date." on Goals, and "Open Goal →" links. |
| DV-120 | AL-COPY-035 | STILL OPEN | FIXED | Sc+chain | With the chain chosen the wizard lists "Quantity · Value · Reward · Project", each "On its card: Count goal / Savings goal / Rewards goal / Project", and none is preselected; name + Create goal → "Choose what kind of progress matters." (no silent Quantity goal). |

### AL-COPY-036

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-039 | AL-COPY-036 | CHANGED | FIXED | DN | Savings goal with a plan: "Your saving plan · ON TRACK", "If every planned payment is made · no return assumed"; no "Funding Wealth: ON TRACK" and no "Unbonding and provider liquidity" line on a cash goal. |
| D-187 | AL-COPY-036 | STILL OPEN | FIXED | DN | Goals → Closed: "No closed goals. Your other destinations are under All. … View all goals"; Ecosystem "zzzz": "No projects match these filters. Try another name, topic or category. Clear search and filters" (an EmptyState: title, line, action). |
| N-167 | AL-COPY-036 | STILL OPEN | FIXED | DN | Count goal timeline: "Where it comes from · Your own count / Added by you / A value reading on this device" in words; no LOCAL_EDIT codes or raw record ids; no "UNKNOWN · MANUAL" labels. |
| N-144 | AL-COPY-036 | CHANGED | FIXED | DN | Same steps as D-039. |
| DV-007a | AL-COPY-036 | STILL OPEN | FIXED | DN | Count goal page: the hero has "3 books of 20 books"; the "Your plan" panel no longer repeats it ("Your plan · NO PLAN · Add what you count…"). |
| X3-19 | AL-COPY-036 | CHANGED | CHANGED | DN | Same casing leftovers as DV-007b; the count page no longer repeats "3 books of 20 books / 17 remaining" (DV-007a fixed). |

### AL-COPY-040

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-071 | AL-COPY-040 | CHANGED | FIXED | DN | "Run a 10K" idea → name "Run a 10K", preview "Run a 10K · 4 milestones · Finish a project · At your own pace" (no "Custom" segment). |
| DV-053c | AL-COPY-040 | CHANGED | CHANGED | DN | The "Reach a chess rating" idea still has no number field ("Steps toward the rating you choose; write the number into the last step"); a numeric rating goal exists on Chess and shows on Goals (C-BN-23). The lane carried the wizard field (a new stored kind). |

### AL-COPY-042

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-089 | AL-COPY-042 | NOT REPLAYED | NOT REPLAYED | DN, NOVA on-device | Needs a model: the NOVA workflow that made goals (tagged "Goal · by ZIGi") runs only with a connected AI. On the device NOVA only offers "Open the form" (a goal the person then creates), so there is no NOVA-made goal row to attribute; Activity filters are "All · Goal · Wealth · Habit · Health" plus ZIGi. |

### AL-COPY-043

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| T-014 | AL-COPY-043 | CHANGED | CHANGED | DN | The wizard is still four steps ("Your goal · What counts · A rhythm (optional) · Review"; Create goal works from step 1). The lane carried shortening it (a redesign; no owner decision asks for it). |
| G-047 | AL-COPY-043 | STILL OPEN | FIXED | DN | Wizard step 1 now has "… like sleep, steps or screen time? Keep an average instead →" and "· or a habit you repeat: Habits" under the three kinds. |

### AL-COPY-044

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-227 | AL-COPY-044 | CHANGED | FIXED | Sc+game | Activity (all pages opened with "Show more activity"): 689 rows marked "Showcase example"; "Counted by you" 0, "Private · this browser" 0 on seeded rows; my own new goal’s row reads "Added by you". Paging is "Show more activity". (Search and CSV export are the gap rows below.) |
| C-DVG-17 | AL-COPY-044 | REASON CITED | STILL OPEN | DN, Sc+game | Activity has date ranges (This week / month / year / All time), kind filters and "Show more activity", but no search field and no CSV export (0 search inputs, no Export/CSV control). Not built, not in the owner’s backlog, no F/O decision. |
| DV-046e | AL-COPY-044 | REASON CITED | STILL OPEN | DN, Sc+game | Same steps as C-DVG-17: no search or export (a date filter and paging exist now). |
| DV-054d | AL-COPY-044 | REASON CITED | STILL OPEN | DN, Sc+game | Same steps as C-DVG-17. |
| C-DV-13 | AL-COPY-044 | REASON CITED | STILL OPEN | DN, Sc+game | Same steps as C-DVG-17. |
| PR-100 | AL-COPY-044 | REASON CITED | STILL OPEN | Sc+game | Activity: still no search field (filters are the kind chips and date ranges). |

### AL-COUNTS-008

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-115 | AL-COUNTS-008 | NOT REPLAYED | STILL OPEN | DN, ZIGi on-device | Habit "Floss" → ZIGi "I did Floss" → card "Check in: Floss" → Add: Activity "All · 1 · Habit · 1 · Actions by ZIGi · 1". Then the check-in is removed on Habits (−): Activity "All · 0 · Habit · 0 · Health · 0" but "Actions by ZIGi · 1", and that filter still lists "Health · by ZIGi · Check-in: Floss · Confirmed from a ZIGi card" — an orphan row no other chip counts, filed under Health for a habit. |

### AL-CURRENCY-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| X3-15 | AL-CURRENCY-004 | CHANGED | FIXED | DN | USD cash asset → "Allocate to DV EUR two" → the allocation form says "Available for this goal: 500 USD … Valued in USD; this goal counts EUR. ZIGoals never converts between currencies, so it adds no value here" before saving. |

### AL-DISCOVERABILITY-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-010c | AL-DISCOVERABILITY-002 | CHANGED | CHANGED | DN | Fund Goal for "I saved 200" is still four screens (kind → Cash details → Continue → Preview → Confirm); the amount is asked once. The lane carried the shorter flow. |
| NB-253 | AL-DISCOVERABILITY-002 | CHANGED | CHANGED | DN | Same steps as DV-010c: amount asked once, still a multi-screen modal. |

### AL-FIELD-ERROR-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-109 | AL-FIELD-ERROR-011 | UNSEEN | FIXED | DN | Adding a second "6 books" → "This Goal already has a milestone called “6 books”. Give this one another name."; edit buttons unique ("Edit milestone 3 books", "… 6 books", …). |

### AL-PERF-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-135 | AL-PERF-004 | CHANGED | FIXED | DN | Calculator decimal fields have a maxlength now: "Yearly return" 7, "Another return" 8, Years 2. |

### AL-SEARCH-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-079 | AL-SEARCH-003 | NOT REPLAYED | NOT REPLAYED | — | Needs a service: Wealth → Add asset → "Find your asset" searches the public catalog (/api/market-assets blocked). |

### AL-TOAST-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-111 | AL-TOAST-007 | UNSEEN | FIXED | DN | Remove "15 books" → focus the toast’s Undo → Enter → "15 books" is back (list 3 / 6 / 15 / 12 books). |
| DV-019f | AL-TOAST-007 | UNSEEN | FIXED | DN | Milestones summary "Milestones · 0 of 5 complete". |

### AL-LAYOUT-DESKTOP-010

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-029d | AL-LAYOUT-DESKTOP-010 | STILL OPEN | FIXED | DN 1920 | Goals with savings, count, plan and average goals: every card in the grid is 591 px tall, the "Keep an average" card included (row 2: 591 / 591). |

### AL-COMPETITOR-GAP-118

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-02 | AL-COMPETITOR-GAP-118 | REASON CITED | OWNER DECISION | DN | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 15 "150+ goal and habit templates — content work". Built: the four kinds in the wizard (G-047) and 53 templates ("53 ready goals across every life area"). |
| C-DV-03 | AL-COMPETITOR-GAP-118 | REASON CITED | FIXED | DN | Same steps as G-047: the wizard offers the fourth kind (Keep an average) and Habits (PART15 GAP-118). |

### AL-COMPETITOR-GAP-120

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-09 | AL-COMPETITOR-GAP-120 | REASON CITED | FIXED | DN | Settings → Reminders (/app/settings/reminders) has "Goal check-in · A weekly look at your goals" beside the plan’s own reminders, quiet hours kept (in-app; closed-app push waits for the owner). |

### AL-COMPETITOR-GAP-121

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-10 | AL-COMPETITOR-GAP-121 | REASON CITED | CHANGED | DN | Built: a goal’s why / plan (C-NB-02), import from other apps (Settings: "From Daylio, Habitica or YNAB"), the life review. **Not seen working:** "time logged in h/min": a Duration habit’s Target value "1:30" is refused ("Target value: Enter a number greater than 0 and at most 1,000,000,000."); PART15 says h/min is taken when logging a value, which my run did not reach. |

### AL-COMPETITOR-GAP-123

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-12 | AL-COMPETITOR-GAP-123 | REASON CITED | FIXED | DN | /app/review: "Life review · A week or a month across your goals, habits, health, wealth and tasks, from your own records" (Last 7 days / This month). |
| C-DV-14 | AL-COMPETITOR-GAP-123 | REASON CITED | FIXED | DN | Same steps as C-DVG-12. |

## L5 tasks / Checklist

### AL-CHECKLIST-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-086 | AL-CHECKLIST-001 | CHANGED | CHANGED | 375 Nebula, own items Stretch 5 min + Floss teeth, built 3 Nov 21:00, read 4 Nov 03:30 | Numbers are labelled ("1 of 4 planets today", "Orbit 1/4 · 1 of 4 complete") and one sentence explains the words ("A planet is one item on your path… an orbit is complete when all its planets are lit"). **Still:** the same thing has two words: the header says "planets", the heat-map day line "4 Nov 2026: Some orbits — 1 of 4 items done so far". Not covered by O6 (the orbit itself is unchanged). |

### AL-TASKS-FEATURE-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-LS-22 | AL-TASKS-FEATURE-005 | REASON CITED | FIXED | 1280×900 Nebula, Tasks | Ctrl+K on Tasks opens the "Command menu" (Ask ZIGi · Quick add · Add a task · Search everything · pages); "?" opens "Keyboard shortcuts · On the Tasks page: q, a or n Add a task · f Filter · j/k · e · Enter · 1–4 · t/T · x · Alt+↑/↓ …". |

### AL-CHECKLIST-010

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-032 | AL-CHECKLIST-010 | CHANGED | FIXED | 375 Nebula, as D-086 | Checklist history now has "Fill in a day: Wed 28 · Thu 29 · Fri 30 · Sat 31 · Sun 1 · Mon 2 · Tue 3" (buttons "Fill in Mon, 2 Nov 2026" …), each opening that day’s own items ("Monday, 2 November 2026" with the path’s habits and own items). The last 7 days, own items included, not only "yesterday". |
| C-LS-35 | AL-CHECKLIST-010 | CHANGED | FIXED | as LS-032 | Same steps as LS-032: any of the last 7 days can be completed on its date. |

### AL-CHECKLIST-012

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-H23 | AL-CHECKLIST-012 | CHANGED | FIXED | 375 Nebula, List view | Checklist List: mouse press on the row name "Floss teeth", drag onto "QA Floss", release → order "Floss teeth, QA Floss, QA Vitamins, Stretch 5 min" with toast "Floss teeth moved to place 1 in Anytime." (Move up / Alt+↑ also there). |
| C-LS-33 | AL-CHECKLIST-012 | REASON CITED | FIXED | 375 Nebula, List view | Same steps as LS-H23: List rows reorder by drag. |

### AL-PERF-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-067 | AL-PERF-007 | STILL OPEN | STILL OPEN | 375 mobile, cold load, service worker blocked, /api 503 | /app/tasks cold: 106 resources, 2.68 MB transferred: 1.71 MB is one image (/brand/figures/zigi/origami-nebula/F022-peek.anim.webp), JS 56 files 666 KB, CSS 33 files 116 KB. The row’s target is under 1 MB. |

## L6 chain / settings / help

### AL-LAYOUT-DESKTOP-015

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-088 | AL-LAYOUT-DESKTOP-015 | CHANGED | CHANGED | 1280×800 Nebula fresh | Settings still arrives 12,660 px tall with all six groups open (6 × aria-expanded="true"); "Fold all" folds them (round 2: to 3.4 screens). The lane carried "start folded" to the next session (suite-wide spec change); unchanged here. |
| N-BN-10 | AL-LAYOUT-DESKTOP-015 | CHANGED | CHANGED | as D-088 | Same steps as D-088. |

### AL-SETTINGS-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-005 | AL-SETTINGS-002 | CHANGED | FIXED | 1440 Nebula fresh | Settings → Data & privacy opened: 3,143 visible characters (round 2: ~8,100), each backup’s "In this file / Not in it" text folded under "More about this file" (4 folds), the file names still in view. |

### AL-LAYOUT-500-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-BN-05 | AL-LAYOUT-500-001 | UNSEEN | CHANGED | 375 Dark, mobile, crypto chosen, Earn | One topic strip ("On this page"); fees/steps fold on a phone. **Still:** the page is 15,769 px tall at 375 (round 2: 16,531; round 1: 24,092), about 19 screens. |
| BN-123 | AL-LAYOUT-500-001 | UNSEEN | FIXED | 375 Dark, Earn, item #4 | The "Options are listed…" paragraph is 343 px wide, the same as the 343-px column; no sideways scroll (scrollWidth 375). |

### AL-SETTINGS-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-035 | AL-SETTINGS-005 | NOT REPLAYED | NOT REPLAYED | D 1440, MOCK model | Half seen: with a model connected, Settings → ZIGi → Advanced shows "Usage on this device" (#zigi-usage) and the Monthly cap with a Currency select (USD/EUR/GBP/CHF/JPY/CAD/AUD). My script could not open NOVA’s Cost panel, so its pointer to that place and whether the currency choice applies were not seen. |

### AL-SETTINGS-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-PR-05 | AL-SETTINGS-007 | STILL OPEN | FIXED | 1280 fresh | Served Permissions-Policy is "camera=(), microphone=(self), geolocation=()" (no "bluetooth"); no Permissions-Policy warning in the console on Settings (91f0c1fb, TIER 3 headers). |

### AL-COMPETITOR-GAP-131

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-182 | AL-COMPETITOR-GAP-131 | REASON CITED | FIXED | DN, Chess → Play | "Play the computer, on this device: a practice game with no account and nothing sent…"; Start → e4 → the computer answers Nc6, "Your move (White)", Take back / Resign / New game / level; Resign → "Resigned". |
| C-BN-24 | AL-COMPETITOR-GAP-131 | UNSEEN | FIXED | DN | Same steps as BN-182 (a playable board with a built-in opponent, no sign-in). |
| D-228 | AL-COMPETITOR-GAP-131 | UNSEEN | FIXED | DN | Same steps as BN-182 for the board. (The per-game "Open on chess.com" links need chess.com reads, a service; round 2 saw them fixed.) |

### AL-COMPETITOR-GAP-132

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-01 | AL-COMPETITOR-GAP-132 | REASON CITED | NOT REPLAYED | — | Needs a service: the Staking validator list (commission / uptime sorts) is read live from the chain relay (/api blocked). |
| C-DVG-67 | AL-COMPETITOR-GAP-132 | REASON CITED | NOT REPLAYED | — | Same as C-BN-01 (needs the chain relay). |

### AL-COMPETITOR-GAP-134

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-69 | AL-COMPETITOR-GAP-134 | STILL OPEN | NOT REPLAYED | — | Needs a service: the claim’s "ZIG price that day" comes from CoinGecko history (blocked). Code read: components/zigchain-eco/staking-clarity.tsx:41 now asks for "zignaly" (round 2’s cause, the wrong id "zigchain", is changed). |

### AL-COMPETITOR-GAP-136

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-05 | AL-COMPETITOR-GAP-136 | REASON CITED | NOT REPLAYED | — | Needs a service: comparing validators needs the live validator list. |

### AL-COMPETITOR-GAP-137

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-06 | AL-COMPETITOR-GAP-137 | REASON CITED | NOT REPLAYED | — | Needs a service: jailing alerts need a tracked wallet’s live delegations (chain relay). |

### AL-COMPETITOR-GAP-138

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-07 | AL-COMPETITOR-GAP-138 | STILL OPEN | FIXED | 1280 Dark, crypto chosen, Earn#compare | "SIDE BY SIDE · The ways to earn, compared · Each way to earn on this page in one table, in the network’s order, not by how much it pays: what it is, its labels, and where its risks are read from…" — one table (Native staking … with "Live on mainnet · You keep the keys"). |

### AL-COMPETITOR-GAP-141

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-11 | AL-COMPETITOR-GAP-141 | REASON CITED | NOT REPLAYED | — | Needs a service: the vote-deadline reminder sits on an open governance proposal, read live. |

### AL-COMPETITOR-GAP-142

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-12 | AL-COMPETITOR-GAP-142 | REASON CITED | NOT REPLAYED | — | Needs a service: a validator’s vote lookup is read live from governance. |

### AL-COMPETITOR-GAP-153

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-23 | AL-COMPETITOR-GAP-153 | REASON CITED | FIXED | Sc | Goals shows "FROM CHESS · Chess rating goals · chess.com Rapid: reach 1,600 · 1,503 now · 97 to go · Open Chess → · Set and removed on Chess". |

### AL-COMPETITOR-GAP-154

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-25 | AL-COMPETITOR-GAP-154 | REASON CITED | FIXED | 1440 Nebula fresh | Settings → Your pages & buttons: switching Health off shows an Undo; Undo turns it back on. |

### AL-COMPETITOR-GAP-159

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-32 | AL-COMPETITOR-GAP-159 | REASON CITED | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 12 "Help: screenshots" (art per theme and width). Not built. |

### AL-COMPETITOR-GAP-161

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-71 | AL-COMPETITOR-GAP-161 | REASON CITED | OWNER DECISION | — | ADR-037 owner finish rule 11 (8 Nov): Part 15 built the top 40 web-possible items and "the rest as a ranked list in NEXT_SESSION_BACKLOG.md (owner decision 8 Nov)"; rank 9 "Multichain portfolio, hardware wallet and multisig — Beta (AL_SCOPE F); wallet signing is out of scope". Read-only wallets of other chains exist (Look up an address, C-TK-09). |

## L8 NOVA HUD

### AL-HUD-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-044 | AL-HUD-001 | UNSEEN | FIXED | D 1440, MOCK local model (mock-chat) | With a brain connected NOVA shows "Memory · on · no notes yet" while Permissions → "Use my memory" is on; switching it off turns the chip to "Memory · off" at once, and back on → "on · no notes yet" (no reload). One source with Permissions. |
| N-BN-11 | AL-HUD-001 | UNSEEN | FIXED | D, NOVA | NOVA’s status chip reads "Reads · Today, Goals, Habits, Wealth · Health off" (title "What NOVA reads: … Change it in Permissions"); no "Sees". |

### AL-HUD-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV:N-049 | AL-HUD-002 | UNSEEN | FIXED | D 1280, nine goals, NOVA Bento | NOVA Bento with nine goals: the Goal pace widget lists three ("Goal 0 0% No plan yet …") and "6 more" (a link to Goals), and its list scrolls (321 px in 219 px); no clipped second card. |
| N-DV-10 | AL-HUD-002 | UNSEEN | FIXED | Sc, NOVA | NOVA → Search open (the only open dialog: "Search") → one click on "Your day" → the only open dialog is "Your day" ("Morning brief and evening recap"). One click does it. |

## L9 release / CI / environment

### AL-ENV-ONLY-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-005 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Withdrawn by the bot: the "1 manual position" was another bot’s data in the shared profile (BN-013). Nothing in the app to replay; a fresh profile’s Wealth holds nothing (see DV-149). |
| BN-011 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | A test-environment note (theme shots, 1920 only); no app behaviour to replay. |
| BN-013 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Cross-bot contamination in a shared Incognito profile (the bot’s own words: "NOT AN APP BUG"). The app side, a fresh profile starting empty, is checked under DV-149 / LS-H01. |
| BN-107 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | Erase says it removes "every ZIGoals record from this browser" and "cannot reach … another device": wiping a shared profile’s other testers’ data is what the bot’s shared profile did, and the app says so. |
| BN-138 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Clicks not registering under DevTools device mode while the keyboard works: the bot calls it a possible input artefact; Playwright mobile emulation clicked normally in every 375/388/640 run here. |
| BN-151 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | "375 px emulation looks enlarged on screen": a DevTools display note, no app behaviour. |
| BN-168 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Screen-grabber showed another session’s tab: test tooling only. |
| BN-184 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | "Chess 375 px: NOT done" (the bot could not resize its window); no finding to replay. |
| DV-001 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | A fresh profile’s navigation lists "Today, Goals, Habits, Health, Wealth, Activity, Checklist, Settings, Help", and Today shows "Your goals"; the bot’s "no Goals / no Wealth" was its profile (it marked the row ENV-ONLY / retracted). |
| DV-048b | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | 640 mobile emulation | Retracted by the bot (a browser-zoom artefact). At 640 with device emulation the page is 640 wide with no sideways scroll and shows the tablet layout (no phone tab bar), as designed for that width (O3). |
| DV-208 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Responsive check "NOT COMPLETED, environment limit"; no finding to replay (the widths are covered by the other rows here). |
| DV-249 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | Sc 768, Light / Dark / Nebula | Habits at 768 shows the "Vacation" chip in all three themes (1 / 1 / 1); the bot’s Nebula shot was cropped. |
| DV:N-066…N-068 | AL-ENV-ONLY-002 | UNSEEN | FIXED | D, NOVA on-device | The bot's batch of three, sent one after another in one NOVA chat: chest pain → emergency guidance (N-066); "Create a goal to save 5.000 EUR by next Friday" → "Goal form, filled in: Savings goal · Target 5000 EUR · Open the form" (N-067); read 12 books → filled form card (N-068). All three readable; no reset. |
| LS-H01 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | A fresh Tasks page has no goal options at all (no "Emergency fund"/"WWWW…" goals): the goal picker reads only this device’s goals. |
| LS-H10 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | Tasks rows are draggable now (2 draggable rows after adding two tasks); the bot only noted "not tested". |
| LS-H24 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | An interrupted mid-drag left the page stuck until mouse release: the bot marks it a probable artefact of its remote pointer; a real mouse drag in the Checklist List view completed here (LS-H23). |
| LS-H37 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | A fresh profile opens unlocked (0 ".device-lock-host"); the PIN lock is stored per device, so another tester’s lock in a shared profile is the harness, not an app path. |
| N-LS-07 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | /app/habits loaded to hydrated in 629 ms here; the bot’s 30 s timeouts were the box (curl answered in 2.5 s for it too). |
| NB-001 | AL-ENV-ONLY-002 | OTHER | HOLDS | Sc, then localStorage cleared, then a new tab | After the Showcase loads, clearing localStorage and reloading still shows "Showcase · fictional" in that tab (the Showcase marker is tab-scoped, by design and labelled); a new tab of the same profile shows no Showcase, and clearing both storages ends it. No self-restore beyond that tab. |
| NB-044 | AL-ENV-ONLY-002 | OTHER | NOT POSSIBLE | — | Window could not be set to 768 px in the bot’s tool; no app behaviour. |
| NB-079 | AL-ENV-ONLY-002 | OTHER | FIXED | as H-012 | Same steps as H-012. |
| NB-144 | AL-ENV-ONLY-002 | OTHER | HOLDS | D fresh | Habit form → More options → Measurement "Duration": Unit, Target value and Target period are all shown (the bot’s missing fields were its tool). |
| NB-145 | AL-ENV-ONLY-002 | OTHER | HOLDS | D fresh | A fresh profile opens unlocked (0 ".device-lock-host"); the PIN lock is stored per device, so another tester’s lock in a shared profile is the harness, not an app path. |
| NB-150 | AL-ENV-ONLY-002 | OTHER | NOT POSSIBLE | — | Screenshot lag in the bot’s tool; not an app bug by its own note. |
| NB-151 | AL-ENV-ONLY-002 | OTHER | HOLDS | D fresh | A fresh profile opens unlocked (0 ".device-lock-host"); the PIN lock is stored per device, so another tester’s lock in a shared profile is the harness, not an app path. |
| NB-157 | AL-ENV-ONLY-002 | OTHER | NOT POSSIBLE | — | A mis-click caused by a stale screenshot; not an app bug by its own note. |
| NB-161 | AL-ENV-ONLY-002 | OTHER | HOLDS | D fresh | A fresh profile is empty and unlocked (DV-149, LS-H37); other testers’ items came from the shared profile. |
| NB-210 | AL-ENV-ONLY-002 | OTHER | NOT POSSIBLE | D fresh | A possible input artefact by the bot’s own label; a fresh Today has no "Choose preset" button to reopen, so the vanished dialog cannot be replayed. |
| NB-219 | AL-ENV-ONLY-002 | OTHER | NOT POSSIBLE | — | First run skipped because the Incognito windows shared storage; no finding. A clean first run is replayed under N-NB-01 (W). |
| H-012 | AL-ENV-ONLY-002 | OTHER | FIXED | D, game on, clock 19 → 29 Oct | Stretch ticked 20–27 Oct, 28 Oct missed: Journey "You have 1 freeze … every seven days in a row on a habit earns one … at most five · Stretch · Wed 28 Oct · Use a freeze" → "Use a freeze on Stretch, Wed 28 Oct? … You will have 0 left." → "Freeze used: 28 Oct now counts as a rest day. None left for now." Testable and working. |
| N-PR-06 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | State left by Professor in the shared profile (an archived asset, a pending archive); harness only. |
| N-PR-07 | AL-ENV-ONLY-002 | UNSEEN | HOLDS | D fresh | A fresh profile opens unlocked (0 ".device-lock-host"); the PIN lock is stored per device, so another tester’s lock in a shared profile is the harness, not an app path. |
| N-SL-06 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | Box network (apt 500, DNS through the box proxy); not the app. |
| TK-047 | AL-ENV-ONLY-002 | UNSEEN | NOT POSSIBLE | — | The bot’s browser tool was bound to a harness Chrome profile holding the Showcase; harness only (as rounds 1–2). |
| N-066 | AL-ENV-ONLY-002 | OTHER | FIXED | D, NOVA on-device | "I have chest pain, should I skip my gym goal?" → "This could be a medical emergency. Call your local emergency number now: 112 in the EU…; NOVA can't assess symptoms or give medical advice". The answer is readable; the panel did not reset mid-batch. |
| N-068 | AL-ENV-ONLY-002 | UNSEEN | FIXED | D, NOVA on-device | "Create a goal: read 12 books by 2026-12-31" → a card "Goal form, filled in: Read 12 books · By 31 Dec 2026 · Open the form" (nothing saved until the person creates it); "Open the form" opens the Goal wizard with "Read 12 books". Readable, no reset. |

### AL-ENV-ONLY-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-073 | AL-ENV-ONLY-003 | UNSEEN | HOLDS | D, NOVA, CPU throttled 4× | Typing "What's BTC price? and my goals today" into NOVA under 4× CPU throttling with no key delay arrives intact; Enter pressed twice sends it once (one user message). |
| TK-077 | AL-ENV-ONLY-003 | UNSEEN | HOLDS | D, NOVA, CPU 4× | Same steps as TK-073: no partial auto-send and no stray hotkey. |
| TK:35 | AL-ENV-ONLY-003 | UNSEEN | FIXED | D, NOVA on-device | "What's BTC price?" is now answered: "BTC is not tracked in Wealth or Portfolio, so this device has no price for it. Prices appear once you track it." (with Showcase data: "65,000 USD (Showcase example price)", X3-08). |

### AL-CONSOLE-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-010 | AL-CONSOLE-001 | UNSEEN | FIXED | D, six pages | The manifest's share_target now names its enctype: {"action":"/app/share","method":"GET","enctype":"application/x-www-form-urlencoded",…}; no "Manifest: Enctype should be set" warning on any of six page loads. |
| B-095 | AL-CONSOLE-001 | UNSEEN | FIXED | D, six pages | The manifest's share_target now names its enctype: {"action":"/app/share","method":"GET","enctype":"application/x-www-form-urlencoded",…}; no "Manifest: Enctype should be set" warning on any of six page loads. |
| LS-H49 | AL-CONSOLE-001 | UNSEEN | FIXED | D, six pages | Every page load (/app, /app/wealth, /app/markets, /app/goals/new, /app/tasks, /app/checklist) serves Permissions-Policy "camera=(), microphone=(self), geolocation=()" (no "bluetooth"), and the console has no Permissions-Policy or Manifest warning. (Tasks and Checklist included.) |
| TK-191 | AL-CONSOLE-001 | STILL OPEN | FIXED | D, six pages | Every page load (/app, /app/wealth, /app/markets, /app/goals/new, /app/tasks, /app/checklist) serves Permissions-Policy "camera=(), microphone=(self), geolocation=()" (no "bluetooth"), and the console has no Permissions-Policy or Manifest warning. |

### AL-ENV-ONLY-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-020c | AL-ENV-ONLY-004 | UNSEEN | HOLDS | D fresh | Five page loads (/app, Wealth, Goals, Habits, Health) opened no Quick add sheet on their own (0). |
| DV-149 | AL-ENV-ONLY-004 | UNSEEN | HOLDS | D fresh | A brand-new profile’s Wealth → Accounts, debts & net worth holds nothing (no "Test Savings €2,500.50"): no seed path; the bot’s account came from the shared profile. |

### AL-ENV-ONLY-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-101 | AL-ENV-ONLY-005 | UNSEEN | HOLDS | Sc | Settings → Export Goals and Wealth downloads "zigoals-showcase-demo-positions-and-goals-backup-2026-11-04.json" under its own name; the Guest-profile temp files were the box. |

## INT backup, export, Help, privacy

### AL-BACKUP-RESTORE-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-022 | AL-BACKUP-RESTORE-001 | UNSEEN | CHANGED | D fresh | Erase → "Erased 4 records and 23 stores from this browser. Open ZIGoals fresh now: this page still shows what it had in memory." + "Open ZIGoals fresh" → /app as a new device (default nav, welcome Today; 0 zigoals keys). **Still:** it does not reload by itself (one press, deliberately: the code keeps the page still while the erase checks run) and it lists counts, not what was erased. |
| BN-023 | AL-BACKUP-RESTORE-001 | UNSEEN | FIXED | D fresh | Erase card: "Removes every ZIGoals record from this browser: goals, habits, Health, Wealth, the Checklist, Tasks, Notes and the Journal, Chess usernames, ZIGi’s and NOVA’s chats, notes and settings, photos, keys and wallets you watch, the screen lock and your choices… The app’s own offline copy … goes too". |
| BN-105 | AL-BACKUP-RESTORE-001 | UNSEEN | FIXED | D fresh | "Erase everything…" → the confirm button stays disabled until ERASE is typed, then turns "danger is-armed" (red rgb(179,38,63), white text). |

### AL-BACKUP-RESTORE-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-036 | AL-BACKUP-RESTORE-002 | UNSEEN | FIXED | Sc | Settings → Export Goals and Wealth → "zigoals-showcase-demo-positions-and-goals-backup-2026-11-04.json", 120,169 bytes, kind "zigoals-platform", 6 goals with positions, allocations, snapshots, contributions, history (not goals:{}). |

### AL-BACKUP-RESTORE-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-025 | AL-BACKUP-RESTORE-003 | UNSEEN | FIXED | D fresh (a task added) | Export everything ZIP now holds tasks.csv (with "Backup me task"), checklist.csv and checklist-days.csv beside everything.json and the other 22 CSVs; Settings says the ZIP is read back under Settings → Your data → Restore from a backup. (The encrypted backup’s module list was not opened: it needs a recovery secret flow.) |
| LS-064 | AL-BACKUP-RESTORE-003 | UNSEEN | FIXED | D fresh (a task added), Settings → Your data | The Export everything ZIP is read back: Your data → "Restore from a backup · Bring back records from an Export everything ZIP: see what it holds, choose per part, confirm, and undo" → the preview lists "Tasks · Backup: 1 record · 4 Nov 2026" and says "The Checklist restores too: its path, favourites and day history…" with "Restore the chosen parts". (I did not press restore.) |

### AL-IMPORT-EXPORT-006

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-016 | AL-IMPORT-EXPORT-006 | OTHER | CHANGED | Sc | Health → Journal settings → Export Health CSV: weights now in "weight_kg" and "weight_lb" columns. **Still:** macros in milligrams ("protein_mg_per_serving" 22000 for 22 g) and no per-entry kcal total (only kcal_per_serving). |
| MO-031 | AL-IMPORT-EXPORT-006 | OTHER | CHANGED | Sc + code read | The Health CSV now carries diary, activity, water, weight (kg and lb), measurement, sleep/nap and meditation rows (seen: diary, activity, water, measurement, sleep, meditation on the Showcase day; lib/health-daily.ts:243–253). **Still missing from the Health CSV:** fasting, workout sets and counters (the bot’s list); workout sets are only in Export everything’s workout-sets.csv, and no export has a fasting file. |

### AL-BACKUP-RESTORE-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-020 | AL-BACKUP-RESTORE-004 | UNSEEN | CHANGED | Sc | Each backup card names its file ("Goals and Wealth backup · Saved as zigoals-positions-and-goals-backup-2026-11-04.json"), so card and file now match. **Still:** wealth-positions.csv writes quantity as raw base units ("45000000" with decimals "8" for 0.45 BTC), no human-readable quantity column. |
| BN-104 | AL-BACKUP-RESTORE-004 | UNSEEN | FIXED | Sc | After Export Goals and Wealth the status says "Your browser is saving “…json”. If it asks where to save it, the copy exists once you choose a place." (not "saved" before the native dialog); each card says what is and is not in the file under "More about this file". |
| BN-106 | AL-BACKUP-RESTORE-004 | UNSEEN | FIXED | D fresh, Your data | The restore says what it does and does not bring back before anything changes: "You see what it holds before anything changes; keys and secrets are never in it and never restored … Today’s ticks stay as they are on this device", per part, with an Undo. |

### AL-HELP-006

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-032 | AL-HELP-006 | UNSEEN | FIXED | Sc | Help no longer says Lichess has no blitz; its Chess answers read "Add your public Lichess or Chess.com username…", "Can I play Lichess inside ZIGoals? Yes…". |
| PR-034 | AL-HELP-006 | UNSEEN | FIXED | Sc | Help → What's new names NOVA, the Checklist and Tasks. |
| X3-27 | AL-HELP-006 | UNSEEN | FIXED | Sc | Help → "What does the notice at the top mean? The notice reads PUBLIC ALPHA “Your records stay in this browser and are not a backup” … If you chose the crypto tools, its label reads “PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN”", the banner shown here word for word. |

### AL-PRIVACY-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-046 | AL-PRIVACY-007 | OTHER | FIXED | repo (landing not served on :3101) | The landing’s privacy page (landing/privacy.html, not part of the app server here; /privacy answers 404 on :3101) now says "When a page fails to load, your browser may also send Cloudflare a short network error report (NEL: the page address, the kind of error and its timing)" (guarded by scripts/landing-al-nel.test.mjs). |
| MO-119 | AL-PRIVACY-007 | OTHER | FIXED | Sc | Markets says "this page sends only which markets it shows and their currency to the ZIGoals server, which asks CoinGecko; never your amounts or records". |

### AL-COMPETITOR-GAP-175

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-27 | AL-COMPETITOR-GAP-175 | UNSEEN | FIXED | D fresh | Settings → Export everything → "Only some dates (optional) · From · To · With both dates, the file holds only those dates’ tables (CSV)"; 4 Nov → 4 Nov → "Export these dates" downloads "zigoals-export-2026-11-04-to-2026-11-04.zip" (25 CSVs, no full JSON). |

### AL-COMPETITOR-GAP-176

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-28 | AL-COMPETITOR-GAP-176 | UNSEEN | FIXED | D fresh, Your data | Settings → Your data → "Erase one area instead · Clears one area on this device and keeps the rest. You see what goes before anything changes, and you can undo it for 7 days…". |

### AL-COMPETITOR-GAP-177

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-83 | AL-COMPETITOR-GAP-177 | UNSEEN | FIXED | D fresh | Backups and export: Export everything gives one ZIP (everything.json + README + 25 CSVs incl. tasks, checklist, checklist-days); migration presets: a Mint export is recognised in Import from your bank → CSV (C-DVG-51), by the same header detector that names Monarch (lib/csv/templates/app-exports.ts; my Monarch file went into the bank-statement input, so its line was not seen). The Strides preset is NEXT_SESSION_BACKLOG rank 14 (no published format). |

### AL-COMPETITOR-GAP-178

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-90 | AL-COMPETITOR-GAP-178 | UNSEEN | FIXED | Sc | Help → "RELEASE HISTORY · Every published version, newest first … Help opens for anyone, with no account, so this list is public": Alpha #53, #52, #51, #50, #46 … #33. |

## STILL OPEN

Exact steps per id (conditions as in the header: `/api` answered 503, en-GB, Europe/Brussels, the clock at the time given). CHANGED ids are in the tables above with their "Still:" part.

- **TK-199** (L1, AL-CURRENCY-001): D 1280 Dark fresh, 4 Nov 03:30. Wealth → + Add asset → Custom → Asset name "Item GBP", Total holding value 500, Other valuation currency "GBP" → Save asset. The card reads "500.00 GBP" and Net worth · GBP "500.00 GBP"; expected "£500.00", as USD/EUR use symbols.
- **TK-036** (L1, AL-FIELD-ERROR-002): D, /app/wealth/calculator → Regular contribution 100, Years 10 (result "US$17,175.24") → Years 61. The result is replaced by "Correct the marked field to see the estimate."; the bot asks for the last good result to stay, dimmed. (Lane: the pinned TR14 assertion conflicts; an owner call, not recorded.)
- **N-TK-18** (L1, AL-DECIMAL-INPUT-001): D, crypto chosen, /app/wealth/calculator → "Another return" field → type "-abc5". The field shows "-abc5" with no message and no aria-invalid.
- **N-003** (L1, AL-CURRENCY-002): D, crypto chosen, /app/goals/new → Value → Goal name "Save €5,000 crypto safety fund", Target 5000. The currency stays "USD · US dollar" and the preview says "US$5,000.00 · USD"; no currency from the name, no prompt.
- **N-MO-03** (L1, AL-CURRENCY-002): D 1440 with a connected (mock) model; Wealth → Add asset → Cash, 500, EUR → Settings → ZIGi → open Advanced → "Monthly cap (optional)": Currency is USD, not the person's EUR.
- **Z-061** (L1, AL-NUMBERS-SOURCE-001): Sc 1280 Dark, ZIGi panel (no model) → "/review". The summary says "Every day with a habit planned had a check-in." above a table where every habit has skipped days (Exercise 6 · 6 · 1 skipped; Late-night snacks 3 · 5 · 2).
- **Z-021** (L1, AL-NUMBERS-SOURCE-001): Sc, ZIGi → "What is my longest Exercise streak?" → "26 days; the current one is 26 days" beside "3 check-ins over 4 days" this month; the answer does not say that skipped days count as rest.
- **B-197** (L2, AL-LIMITS-002): D fresh, Habits → + New habit → title "P9 <b>x</b>" + 240 letters, More options → Measurement Count, Target value 1000000000, Per day → Create habit. It is created with "1,000,000,000 times per day", with no cap or check.
- **D-173** (L2, AL-FIELD-ERROR-003): D fresh 04:00, Settings → Evening wrap-up → clear the "From" time (required) → save. Only the browser bubble "Please fill out this field." appears; there is no field message.
- **C-MO-36** (L2, AL-LIMITS-003): D fresh, Health → Fasting timer → Custom → Target hours 30 → Start fast → "Choose a target from 1 to 18 hours." Fasting targets of 24 h or more are not offered; no F/O decision covers it.
- **DV-115** (L4, AL-COUNTS-008): DN 1920 Nebula fresh. Habits → + New habit "Floss" → Today → ZIGi "I did Floss" → card "Check in: Floss" → Add → Habits → Floss card "−" (the check-in is removed) → Activity: "All · 0 · Habit · 0 · Health · 0" but "Actions by ZIGi · 1", whose list still shows "Health · by ZIGi · Check-in: Floss · Confirmed from a ZIGi card".
- **D-028** (L4, AL-A11Y-016): Sc 1280 Dark, Today → click the page top → press Tab until the focus wraps: 176 stops. The lane carried it unchanged.
- **C-DVG-17, DV-046e, DV-054d, C-DV-13, PR-100** (L4, AL-COPY-044): DN fresh or Sc+game, /app/activity: there is no search field and no CSV export (0 search inputs; no Export/CSV control). The kind chips, This week / month / year / All time and "Show more activity" are there. Not built and not in the owner's backlog.
- **LS-067** (L5, AL-PERF-007): 375 mobile, a cold context with the service worker blocked, /app/tasks: 106 resources, 2.68 MB transferred (1.71 MB is `/brand/figures/zigi/origami-nebula/F022-peek.anim.webp`, JS 666 KB, CSS 116 KB); the target is under 1 MB.
- **C-DVG-22, C-NB-28, N-NB-11** (L3, AL-TIMEZONE-002): D (and W at 01:28): look for a "my day ends at" setting in Settings and the habit form. None exists, and the code has none; a habit done at 01:30 counts for that calendar day. The lane gives "Later … needs its own owner-approved part", not an F/O decision, and the item is not in NEXT_SESSION_BACKLOG.
