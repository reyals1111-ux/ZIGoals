# Session AH — full scope (owner-approved, 25 Oct 2026)

Read-only scope file for Session AH. Never copy this branch into main; the session records its own decisions in ADR-033.
Sources: the owner's two answered Grok picklists (20 Oct on Alpha #44, 21 Oct on Alpha #45) plus the open roadmap. Finding IDs (B-, N-, D-, L-, M-, T-, C-, BUG-) refer to the Grok reports; the rows below carry what the bots found.
Overlaps: where a picklist-2 row says "overlaps 20 Oct item X", the two are ONE fix with the union of finding IDs and acceptance criteria.

## A. Picklist 2 (Grok on Alpha #45): every S1 row (163 rows; LA12 excluded by the owner)

### DE · Decisions only you can make
- **DE1** [Next → S1 (polish)] Staking network: testnet or mainnet, and should the Alpha sign?. Settings says testnet zig-test-2; Staking says mainnet zigchain-1 with a live 5.29% APR and offers signing; the phone's More sheet calls Staking 'read-only'; the landing says staking is 'not available'. Berlin holds all staking copy until you answer. (B-005, B-022, B-136, N-198, N-201, T-001, C-001–C-004) *Claude:* Already decided by you on 18 Oct: practice on zig-test-2, real on zigchain-1 after a one-time confirm, signed in Keplr. So the bug is wording only: Settings' network line (AF4), the More sheet's 'read-only', APR 'estimate' labels, and the landing until you redeploy it tonight. (overlaps 20 Oct item AF4)
- **DE4** [Next → S1 (polish)] How a person leaves the demo and starts with their own data. No 'leave demo, start my own' step; sign-in needs leaving the Showcase; Settings only offers 'Reset', not 'Load'. (M-021, M-015, N-002, T-009, M-071) *Claude:* Real gap for friends. Build on your welcome flow (H6): a clear 'Start my own' that keeps or clears the demo, plus a visible 'Try the demo' entry. (overlaps 20 Oct item H6)
- **DE5** [Next → S1 (polish)] Budget / monthly spend cap in scope?. Without it, 'replaces your money app' only covers trackers, not YNAB/Copilot. (T-007, Tokyo top-10 #7) *Claude:* You already put Budgeting on Next (J18). Tokyo suggests the light version: a monthly spend-cap goal + quick-add expense, not a full YNAB. (overlaps 20 Oct item J18)
- **DE8** [Next → S1 (polish)] Workout logging a launch must-have?. The fitness persona can't log a workout (type, duration, sets/reps/weight). Exercise minutes can't carry a type; custom counters are bare numbers. (N-083, N-084, N-085) *Claude:* A real gap for 'all-in-one'. A simple workout log in Health (type, duration, optional sets/reps/weight) is a medium job. **Owner note:** High priority, we incoorporate workout tracking and copy the best use cases of other workout app so it's truly a all in one app

### TR · Numbers you can trust
- **TR1** [Next → S1 (polish)] USD net worth leaves out BTC and ETH ($47,166.74 gap). Shows $531,029 vs expected $578,195.74; '2 holdings have no value' names the wrong two; ZIGi repeats the wrong total. Root cause found: Wealth sums only valuation_value and live-priced BTC/ETH have none. (B-002, BUG-085, M-041, M-077, N-149, N-181, B-049) *Claude:* Valid and now easy to fix with the root cause. One total, computed once, used on Today, Wealth, Life review and by ZIGi. (overlaps 20 Oct item B4)
- **TR2** [Next → S1 (polish)] 'Current' badge on two-day-old prices; prices drift per reload. Last verified Oct 19 22:37 but badged Current; reloads change BTC $83,023→$83,066 while timestamp and 24h% stay frozen; a $100 contribution moved wealth +$114. (B-004, B-015, B-050, B-153, D-001, D-095, D-243, L-030, L-047, L-012, N-054, N-122, N-194, N-026, T-024, T-038, T-092, T-117, M-051, D-200, N-055, B-041, D-262) *Claude:* Valid. Likely the Showcase's frozen snapshot labelled as live; the badge rule must be 'Current only if ≤ 15 min old'. Also check why Showcase values drift. (overlaps 20 Oct item B1)
- **TR3** [Next → S1 (polish)] Portfolio BTC $65,000 vs $83k elsewhere. Labelled 'Showcase fixture price' now, still different; Settings says demo prices are real references. (BUG-006, N-008, T-091, B-042, D-155, D-245) *Claude:* Valid. One price service for every page in the demo too. (overlaps 20 Oct item B1)
- **TR4** [Next → S1 (polish)] Prices with 17 decimals. $83356.64376998547 on Wealth, asset pages, AAPL $337.2697…; Activity shows 23-digit amounts. (BUG-007, BUG-028, B-013, B-039, M-010, M-086, T-090, D-147, D-053, N-025, N-193, D-215, D-195) *Claude:* Valid, quick win. (overlaps 20 Oct item B2)
- **TR5** [Next → S1 (polish)] Manual values silently override quantity × price. AAPL $10,113 vs $7,500, VOO, NVDA, ZIG; history record differs from the headline on the same date. (B-008, B-007, N-196, BUG-074) *Claude:* Valid. Show 'your value' and the market value side by side. (overlaps 20 Oct item B7)
- **TR6** [Next → S1 (polish)] Counts disagree between pages. Manual assets 12 vs 11; active goals 6 vs 7 vs 8; Journey '3 goals reached' vs 1; '13 accounts tracked' counts assets; check-ins 209/186/183; same morning 2/2, 1/2 and part of 2/5. (BUG-031, BUG-041, BUG-062, B-009, B-098, B-116, M-085, D-238, D-239, D-246, M-081, M-083, N-091, B-097, M-055, B-012) *Claude:* Valid. One count function per thing. (overlaps 20 Oct item B5)
- **TR7** [Next → S1 (polish)] 'Totals in EUR' and the wallet currency pills. EUR headline drops to €8,250 (no conversion); EUR picked from browser locale shows €0; Today ring 0% in EUR; only Wealth switches; USD/EUR/BTC pills on Today always 'unavailable'. (N-030, B-040, D-214, L-085, B-034, B-150, D-057, D-201, L-078, M-121) *Claude:* Valid. Either convert properly everywhere or hide the switch until it works.
- **TR8** [Next → S1 (polish)] ZIG reward reserve: two states, two prices. 'Stale snapshot Oct 18' on Staking vs current on Wealth; valued at $0.06 while the shown price is $0.048; Today tells three ZIG stories at once. (B-110, B-111, B-154, M-079, B-103, L-029) *Claude:* Valid; same single-source fix as TR1/TR2.
- **TR9** [Next → S1 (polish)] Health vs Habits disagree. Ring 100% at 248% of kcal target; 'Care for your day 100%' at 3,850/2,200 kcal; 13,000 logged steps leave Walk at 0; water habit 4/8 with 49 L logged; Meditate habit misses Health's minutes. (N-168, N-202, N-036, N-077, N-169, N-015, N-086, B-163, D-220, N-056, B-147, B-191, T-087, L-021, M-037, D-106, B-079, M-038, BUG-043) *Claude:* Valid. Habits should tick from Health's own logs (Tokyo's #5 idea) and the ring should say 'over target'. (overlaps 20 Oct item B8)
- **TR10** [Next → S1 (polish)] Weight trend shown as three different numbers. Real −0.28 kg/week shown as −0.2, −0.1, −0.2; trend 74.2 vs latest 73.48; 165 lb shown as 74.843 kg; lb decimals. (B-011, N-058, N-120, L-070, M-039, D-142, L-081, B-073, B-194) *Claude:* Valid. One computed trend, one rounding rule.
- **TR11** [Next → S1 (polish)] Goal status is computed wrongly. 'AHEAD' with a forecast after the deadline and a $5,000 shortfall; 'Finished' at 38% and 93%; reversed contributions leave a goal Completed; 'contributed' counts the typed amount. (B-006, B-009, B-014, B-113, B-137, B-183, B-184, B-200, M-056, D-235, B-114, M-082, L-040, M-080) *Claude:* Valid and serious for trust. Derive amount and status from saved contributions only.
- **TR12** [Next → S1 (polish)] Fake or duplicate Activity events; 'Showcase example' on your own entries. Funding one goal writes 'Target reached' for another; own entries labelled Showcase example; rows under the wrong date header; '4 ZIG' on a milestone. (B-058, N-037, N-011, N-073, D-084, D-156, D-227, T-086, D-234, B-038, M-049, B-092) *Claude:* Valid. (overlaps 20 Oct item B6)
- **TR13** [Next → S1 (polish)] Life review, Today and Journey disagree. Life review net worth $537,406 vs Wealth $531,029; same area names with very different %; different 'week' definitions. (M-078, M-084, M-027) *Claude:* Valid; folds into TR1/TR6.
- **TR14** [Next → S1 (polish)] Calculator truth. Earn calls the rate simple while the calculator compounds; hidden 3% yearly raise and 2.5% inflation change 'You put in'; 'Turn into a goal' cuts the target and drops the contribution; months not allowed; a stale result stays while a field is invalid; silent saved-scenario limits. (B-010, B-021, N-029, L-057, B-099, B-123, B-156, B-045, B-056, B-043, B-044, L-058, B-130, B-131, B-129, B-155, B-046) *Claude:* Valid. Show every assumption next to the result.

### DS · Data safety
- **DS1** [Next → S1 (polish)] A stale second tab overwrites newer data. Goals and habits saved in one tab vanish after a save in another; a second tab can open a different Showcase state. (BUG-075, N-081, M-142) *Claude:* Valid, still #1. (overlaps 20 Oct item A1)
- **DS2** [Next → S1 (polish)] Checklist Sleep tap saves a 0-minute night over last night. One tap replaced 7 h 17 min; says 'Good morning' at 1:51 PM. (T-110, T-116, M-134) *Claude:* Valid. Session AG only restyles the timer cards; this logic fix belongs in S1.
- **DS3** [Next → S1 (polish)] Naps can be created (not only edited) over a night. Nap edits say 'Night updated'; deleting a nap says 'The night is deleted'; the default sleep form duplicates an existing night. (L-009, L-010, BUG-021, BUG-053, B-062, D-022, L-062) *Claude:* Valid; extends A6 to creating. (overlaps 20 Oct item A6)
- **DS4** [Next → S1 (polish)] Reset Showcase Demo wipes everything instantly. No confirm, no message, no Undo; it's the primary button; the toast's 'Undo' sits next to the banner's 'Undo import'. Denver rates it CRITICAL. (D-087, B-081, M-141, D-031) *Claude:* Valid, small fix. (overlaps 20 Oct item A4)
- **DS5** [Next → S1 (polish)] Removes without confirm or Undo across the app. Portfolio transaction, Health diary row, water entry, measurement, milestone, Health goal 'End goal', Fast record, streak freeze, history reversal. (N-043, D-047, B-117, T-115, T-138, M-104, B-083, M-131, M-136, M-115, D-104) *Claude:* Valid. One rule: every destructive action confirms or gives a labelled Undo. (overlaps 20 Oct item A5)
- **DS6** [Next → S1 (polish)] Exports empty or incomplete. 'Export Goal Data' = {"goals":{}} and shows twice; Portfolio missing from 'Export everything'; moods.csv and vitals.csv header-only; Help says 'every record'. (BUG-036, M-007, N-042, N-033, M-008) *Claude:* Valid; extends A2 with Portfolio. (overlaps 20 Oct item A2)
- **DS7** [Next → S1 (polish)] Second weight reading of the day replaces the first. Saving 72.8 kg replaced the 73 kg morning reading (only in small print). (N-057) *Claude:* Valid. Keep both or ask.
- **DS8** [Next → S1 (polish)] Restore and encrypted backup give no feedback in the demo. Restore from file silent; 'Restore Habits' disabled until a separate tick-box with no hint. (L-006, M-004, N-049) *Claude:* Valid, small.
- **DS9** [Next → S1 (polish)] Drafts lost on Back; Back closes the page instead of the dialog. Goal wizard and forms; Back button closes the page under an open dialog. (M-070, D-206, T-077) *Claude:* Valid. (overlaps 20 Oct item A3)

### VA · Forms, errors and limits
- **VA1** [Next → S1 (polish)] Never show raw validation JSON. Milestone >100 chars, goal target 0, account balance, contribution 0, edit-goal forms all dump error arrays. (Top-30 #5: BUG-003/009/020/026/084, L-023, L-035, L-041, L-044, L-050, L-076, L-079, M-123, T-093, T-121, N-135, N-142, N-151, N-155, D-022, D-024, D-034, D-048, D-071, D-101, D-118, D-199) *Claude:* Valid. Inline errors next to the field, focus the first invalid one, aria-describedby. (overlaps 20 Oct item C1)
- **VA2** [Next → S1 (polish)] Plausibility limits shared by every entry point. Weight 1,000 kg and 5 kg saved; run 500 km in 28 min; habits 100,000 min/day; dates 1900/2199; micronutrients ×1000; 99,999 kcal target; 1,000,000 steps; trillion-coin buys; 27-digit assets; $5,000 fee on a $1 trade; Quick add 'weight 720 kg'. (Top-30 #13: L-001, L-045, L-082, L-053, L-067, BUG-001/011/022/027/083, B-018, B-019, B-020, B-036, B-088, B-141, B-159, B-160, B-173, B-182, B-195, B-199, N-053, N-059, N-117, N-133, N-143, N-157, T-060, T-081, T-089, T-119, T-133, T-137, D-077, D-081, D-088, D-089, D-102, M-016, M-053, M-129, B-165) *Claude:* Valid. Suggested ranges: weight 20–400 kg, ≤ 1,440 min/day, sane date window, money caps, fee ≤ trade warning; same rule in forms, Quick add, ZIGi and Checklist. (overlaps 20 Oct item B3)
- **VA3** [Next → S1 (polish)] Water limits differ per entry point. Checklist 50–3,000 mL; Health up to 10,000 mL; a 5,000 mL button bypasses both; fl oz bypasses the cap; the Checklist water box takes any text ('Log -250 ml'). (L-034, L-082, BUG-083, B-019, B-146, T-112, L-033) *Claude:* Valid. (overlaps 20 Oct item B9)
- **VA4** [Next → S1 (polish)] Names silently cut, with different limits per form. Goal 80 chars mid-word, habit 100, 'Why it matters' 1,000, food names, portfolio names; no counter. (D-043, D-202, D-207, B-138, N-052, T-062, T-064, T-078, T-123, M-011, D-054, B-157, B-149) *Claude:* Valid. A visible counter and one limit per kind of field.
- **VA5** [Next → S1 (polish)] Empty submit: browser bubble only, or nothing. Habit, food, weight, links, time zone forms; empty asset name does nothing; empty goal name says 'saved'. (D-041, D-140, D-141, D-143, D-172, D-173, D-190, L-014, M-014, M-109, M-101, L-076, L-028, D-074) *Claude:* Valid; part of VA1. (overlaps 20 Oct item C1)
- **VA6** [Next → S1 (polish)] Messages appear thousands of pixels from the button. Close Goal confirm ~1,060 px above; edit error ~3,500 px above; Settings confirmations far away; oversell error 1,440 px away. (D-034, D-035, D-088, D-105, L-044, N-024, D-052, T-071, D-144) *Claude:* Valid; the 'click looks dead' problem. (overlaps 20 Oct item C1)
- **VA7** [Next → S1 (polish)] Status messages and toasts pile up. Live region keeps stale messages; old toasts linger; stale 'recorded/removed' after a failed save. (B-170, D-219, M-107, M-111, N-129, N-179, T-072, T-101, B-059, D-046) *Claude:* Valid.
- **VA8** [Next → S1 (polish)] Date formats mixed. ISO dates on goal detail, debt payoff, archived habits; German numbers with English dates; '11:00 PMEurope/Brussels'. (B-057, B-185, L-068, L-075, M-060, M-098, B-201, L-086, L-054) *Claude:* Valid; AD's one date format missed these places.
- **VA9** [Next → S1 (polish)] Plurals and units. '1 times per day', '1 hours', '1 milestones', '1 ingredients', wrong unit words in errors. (B-064, L-052, M-102, L-038, D-048, T-065, T-080) *Claude:* Valid, small. (overlaps 20 Oct item C2)
- **VA10** [Next → S1 (polish)] Time zone settings. 'UTC+13' rejected without a hint; lowercase names saved as typed; no way back to 'follow this device'. (B-067, B-069, B-068, B-175, B-176, N-131) *Claude:* Valid. (overlaps 20 Oct item C8)

### WE · Wealth, Markets, Portfolio
- **WE1** [Next → S1 (polish)] Asset search ranks meme and look-alike tokens above the real asset. 'bitcoin' shows 'HarryPotterObamaSonic10Inu' before Bitcoin; 'gold' lists many 'GOL' coins; no verified marker. A safety issue. (B-148, L-032, L-013, BUG-029, BUG-030, N-023, N-206, T-074, T-143, M-058, D-051, D-079) *Claude:* Valid. Rank by market cap or a verified list; label unverified tokens.
- **WE2** [Next → S1 (polish)] Portfolio transactions. No edit; 'Record a transaction' isn't a real button; realised P&L only on the coin page; future date blocked silently; $0 and negative prices; 1900 dates; form collapses after Remove. (N-146, N-147, N-161, N-165, N-044, B-060, B-061, B-158, L-016, T-073, D-081) *Claude:* Valid. (overlaps 20 Oct item A5)
- **WE3** [Next → S1 (polish)] CSV import (Portfolio and Wealth). No column auto-map even for exact names; 'BTC' refused though the example says 'e.g. BTC'; refused rows without reason; a binary file decoded as a header; a spreadsheet formula accepted as a name; our own export doesn't re-import. (N-099, N-100, T-100, B-087, D-078, D-237, L-072, L-073, T-102) *Claude:* Valid. The formula one is a small safety fix. (overlaps 20 Oct item J14)
- **WE4** [Next → S1 (polish)] Refresh buttons and reloads. Refresh gives no loading/success/failure; a hard reload re-fetches prices silently, shifts the toolbar and loses the currency choice. (D-096, D-200, N-197, M-122) *Claude:* Valid.
- **WE5** [Next → S1 (polish)] Freshness counters contradict themselves. '2 of 2 automatic values current' next to '1 need attention'; 'needs attention' never says what; 'needs review' on the wrong class; '0 of 0' on empty. (B-104, B-106, D-145, D-221, L-069, M-042, B-032, L-049) *Claude:* Valid.
- **WE6** [Next → S1 (polish)] Invented currency codes accepted. 'ZZZ' creates its own net-worth card and can't be fixed; codes cut to 3 letters; GBP asset shows '$'. (L-015, D-080, T-061, B-074, B-076) *Claude:* Valid. Pick from a list.
- **WE7** [Next → S1 (polish)] Debts: $0 payment and overpayment accepted. $10,000 on $6,911 owed; payment missing from Activity; payoff calculator takes any amount. (L-067, B-199, B-152) *Claude:* Valid.
- **WE8** [Next → S1 (polish)] 'Add money' is a real purchase flow inside the demo. No amount field; odd Bitcoin fee line. (M-125, B-140, B-186) *Claude:* Fair. In the Showcase say 'this opens a real provider' or disable.
- **WE9** [Next → S1 (polish)] Gold, Silver, stocks show token logos and token prices. XAU shows the Tether Gold logo; prices are tokenized proxies. (L-063, T-040) *Claude:* Label them as tokenized reference prices (see DE6).
- **WE10** [Next → S1 (polish)] Wealth on phones. Net worth hidden in a collapsed section while text says 'below'; heading twice; Add-asset sheet without padding, scrolls sideways. (B-030, B-026, B-151, T-096, N-145) *Claude:* Valid.
- **WE11** [Next → S1 (polish)] Market insights request sends every holding's id. POST /api/market-insights includes manual holdings' ids (apple, gold…), no amounts. (B-085) *Claude:* Check PRIVACY.md wording matches; send only what the page needs.
- **WE12** [Next → S1 (polish)] Watchlist cap. 9th star silently ignored; error off-screen; '7 / 8' without a unit. (L-064, N-009, N-024, N-207, D-052, D-108, D-223, N-200) *Claude:* Valid, small.
- **WE13** [Next → S1 (polish)] Markets view and charts. Table/Cards choice not remembered; chart ranges; sparkline labels; filters on Owned/Favourites. (T-105, T-117, N-195, D-108, D-215, N-191, N-192, L-031) *Claude:* Valid, small. (overlaps 20 Oct item J17)
- **WE14** [Next → S1 (polish)] Asset cards. Long names repeat in every menu item; no delete in the menu; 'Reference price per property: Unavailable'; uneven heights; archive modal without Cancel; Save/Archive give no feedback. (D-055, D-148, D-056, M-108) *Claude:* Valid.
- **WE15** [Next → S1 (polish)] Ecosystem links and labels. Six doc links 404; Range and ZIGScan links go to testnet tools; stray 'ZW' text; 'Website unavailable' as card text; blank logo tiles in Light. (M-117, M-119, B-093, M-118, M-069, D-183, D-125, D-157, B-122) *Claude:* Valid; verify the link registry.
- **WE16** [Next → S1 (polish)] Market catalog download is 5.1 MB and 2 days old. GET /api/market-assets 1.39 MB compressed, stale:true. (B-094) *Claude:* Worth a look for phone speed.
- **WE17** [Next → S1 (polish)] Price alerts tied to goals. 'Tell me when BTC puts my House goal at 50%'. ZIGi refuses alerts today. (T-006, N-047, Tokyo #8) *Claude:* Already J11; needs push to be useful. (overlaps 20 Oct item J11)
- **WE18** [Next → S1 (polish)] Realised gains export (Koinly-style). CSV of realised P&L per year 'for your accountant'. (T-041) *Claude:* Small and useful for traders.
- **WE19** [Next → S1 (polish)] Hide-amounts mode for screenshots. (T-023) *Claude:* Small privacy feature; good for sharing Stories.
- **WE20** [Next → S1 (polish)] Read-only wallet import into Portfolio. Use the nine balance hosts AF built. (N-103, Tokyo) *Claude:* AF tracks wallets in Wealth; linking into Portfolio is the next step.
- **WE21** [Next → S1 (polish)] Cost basis label and FIFO/LIFO lots. Average cost only, not labelled. (T-050, N-102) *Claude:* Label 'average cost' now; lots later.
- **WE22** [Next → S1 (polish)] 'Since last visit' change on Portfolio. (N-082) *Claude:* Nice, small.

### ST · Staking, Earn, Governance
- **ST1** [Next → S1 (polish)] Network wording everywhere. 'No public wallet yet' next to '1 observed position'; 'read-only' on the More sheet; 'Exit the Showcase to stake' next to network choices; future 'updated' stamps. (B-005, B-012, B-022, B-136, D-258, N-028, B-052) *Claude:* Valid; the fix behind DE1. (overlaps 20 Oct item AF4)
- **ST2** [Next → S1 (polish)] APR shown live on Earn but 'not verified' on Staking. 5.29% with no 'estimate, variable' label; 'reading…' placeholders for >10 s; Earn stamps in UTC. (L-056, B-053, B-048, M-059, T-022, D-168) *Claude:* Valid. Same figure, same source, 'estimate · variable' label. (overlaps 20 Oct item I4)
- **ST3** [Next → S1 (polish)] Staking calculator dead in the demo. No amount field, APR box disabled; 'Open calculator' leads to an unusable calculator. (N-027, N-198, N-201, B-065, L-042, D-082, T-129) *Claude:* Valid. Enable it with the sourced APR, or say why it's off.
- **ST4** [Next → S1 (polish)] Staking empty state is a giant blank card. ~400–600 px near-empty, near-black in Light. (D-002, D-152, D-182, D-193, L-018, T-076, N-028, Denver S-04) *Claude:* Valid.
- **ST5** [Next → S1 (polish)] Advice-like wording next to 'Nothing here is advice'. 'Make your money work', 'From no wallet to your first stake' funnel, 'Put it to work on Earn →', ZIGi's 'OUR SUGGESTION' naming paid products, promo lines near staking figures. (D-060, D-099, D-150, D-146, B-054, B-084, D-092, D-153) *Claude:* Valid. Builds on I2/I3; plain informational wording throughout. (overlaps 20 Oct item I2)
- **ST6** [Next → S1 (polish)] Earn's sticky tabs take 3 rows. 'Start here, complete' shown at 0 of 6; tabs clipped with no scroll cue. (D-149, D-123, N-199, D-098) *Claude:* Valid; overlaps AF12 (Start-here alignment). (overlaps 20 Oct item AF12)
- **ST7** [Next → S1 (polish)] Governance in the demo. Proposals never load, 'Read again' does nothing; real-money warning inside the Showcase; 'REJECTED' with Yes 100% and a raw chain reason; '10 minutes' voting period on old proposals. (T-075, T-107, M-052, D-154, L-043, B-112, D-014, D-169) *Claude:* Valid.
- **ST8** [Next → S1 (polish)] Track Wallet doesn't check the address first. (L-019) *Claude:* Valid, small.
- **ST9** [Next → S1 (polish)] No Earn switch in Settings; Earn vanishes with Wealth. Settings' page list disagrees with the real sidebar (Checklist, Earn, Governance). (B-174, D-217) *Claude:* Valid.
- **ST10** [Next → S1 (polish)] Market the review screen. Zerion sells 'verify, don't trust'; our review screen already shows the exact message before Keplr opens. (Tokyo) *Claude:* A good marketing line once the wording above is right.

### GO · Goals
- **GO1** [Next → S1 (polish)] Opening a goal can crash the app. 'Create 2 hours a day' → Open Goal throws a TypeError. (B-171) *Claude:* Valid, must fix.
- **GO2** [Next → S1 (polish)] Close, Delete and Archive for goals. Delete missing; Close hidden under Goal status and a no-op on some goals; closed goals can still be funded and keep habits. (BUG-010, B-014, B-143, N-040, N-041, N-125, N-158, D-036, D-209, D-035, M-103, M-124, T-122) *Claude:* Valid. (overlaps 20 Oct item C5)
- **GO3** [Next → S1 (polish)] Goal wizard. No Cancel or Escape; step 3 'Optional Habit' has no control; 'No assets yet' with 13 assets; idea cards don't fill the form; EUR goal becomes ZIG; hiding Goals in setup makes creating one impossible; longer than every goal app benchmarked; leftover 'Emergency Fund' in preview. (D-205, D-225, D-026, D-027, D-025, D-226, D-166, D-241, N-109, N-111, N-185, N-205, N-156, N-003, M-046, M-100, N-071, T-014, T-120, D-008, D-038, D-139, D-257, L-026, Denver S-07) *Claude:* Valid. Tokyo suggests 2 steps max (template + amount/date) with an inline habit link. (overlaps 20 Oct item C4)
- **GO4** [Next → S1 (polish)] Reward goal can't be funded from its own reserve. (N-166) *Claude:* Valid.
- **GO5** [Next → S1 (polish)] Editing goals. Edit round-trip loses the contribution plan comparison; edit form stays open after save; a Vision gradient click discards typed text; artwork change only updates the Cards view. (B-196, D-105, T-077, L-066) *Claude:* Valid.
- **GO6** [Next → S1 (polish)] Project goals and charts. Tree % don't follow sub-goals; duplicate milestone names; chart axis to −1 milestones; negative axis on money charts. (L-055, L-024, L-025, N-070, N-080, N-160, B-071, B-115, B-187) *Claude:* Valid.
- **GO7** [Next → S1 (polish)] Finishing a goal is silent. No celebration or confirmation; completed goals still say 'Not on target yet'. (M-047, M-082) *Claude:* Valid; a peak moment for retention.
- **GO8** [Next → S1 (polish)] Goal card ⋯ menu. 'Add to Today' message jams into the card; items repeat the full 80-char name in a 12-line menu. (D-037, D-210, B-142) *Claude:* Valid.
- **GO9** [Next → S1 (polish)] Goals list layout and loading. 3 cards per row at 768 under the dock; artwork pops in late; 5 tab stops per card; blank Vision tile; filters that don't match the view. (D-111, D-112, D-136, D-211, D-029, D-208, D-097, D-019, Denver S-11) *Claude:* Valid.
- **GO10** [Next → S1 (polish)] Goal detail copy. Jargon, ISO dates, '41.66%' truncated. (D-039, L-075, M-098, N-144) *Claude:* Valid.
- **GO11** [Next → S1 (polish)] Health goals. 'Lose 5 kg' shows a 30-day average; two different sleep goals active. (N-004, B-167) *Claude:* Valid.
- **GO12** [Next → S1 (polish)] 'Goal unavailable' dead end; search can't find a Health goal. (M-066, B-177) *Claude:* Valid, small.
- **GO13** [Next → S1 (polish)] Pace chip on every goal card. Strides-style ahead/behind chip. (Tokyo) *Claude:* 'On track?' exists since AA; a chip on the card is the discoverability part.
- **GO14** [Next → S1 (polish)] Optional 'What matters' values step. Lifetick-style: tag goals to 3 values; weekly review shows time and money per value. (Tokyo) *Claude:* Nice later idea.

### HA · Habits
- **HA1** [Next → S1 (polish)] Skipped days count against consistency. 26 done + 4 skipped shows 87%, should be 100%, against the app's own promise. (B-003, B-017, B-189) *Claude:* Valid.
- **HA2** [Next → S1 (polish)] Habits tick automatically from Health logs. Steps, water and meditation logged in Health don't complete the matching habits. (N-169, N-015, B-163, B-079, M-037, L-021, Tokyo top-10 #5) *Claude:* Valid; Tokyo's Streaks-style idea done natively. Closes part of TR9. (overlaps 20 Oct item B8)
- **HA3** [Next → S1 (polish)] Delete and Archive. A new habit can't be deleted the same day; Archive starts tomorrow with no confirm; 'Delete for good' hidden; ⋯ menu lacks archive. (D-045, D-204, B-031, B-145, M-105, N-061, N-078, N-079, N-088, T-085, T-125, T-131, L-011) *Claude:* Valid. (overlaps 20 Oct item C6)
- **HA4** [Next → S1 (polish)] Routines. 'Add routine' creates 3 habits without preview and duplicates 'Drink water'; timed steps credited after 0:00; named after the first step. (T-141, L-083, L-084, N-134) *Claude:* Valid.
- **HA5** [Next → S1 (polish)] Quick add parsing. 'read 20 pages' → +20 minutes; 'meditated' → '+1 minutes'; only Health lines understood. (T-134, B-192, D-244, D-072, T-067) *Claude:* Valid; pairs with J10 (one input box) in S2.
- **HA6** [Next → S1 (polish)] History states. 'Failed' stays after Complete; partial past days; 'Day 0/0 · 0%'; QUIT habit 'Due' and 'Stayed on track' at once. (B-013, N-162, L-005, B-190, L-074, BUG-082) *Claude:* Valid. (overlaps 20 Oct item C7)
- **HA7** [Next → S1 (polish)] Streak freezes. Using one doesn't lower the count, no confirm, no 'how earned'. (M-024, M-025, M-115) *Claude:* Valid.
- **HA8** [Next → S1 (polish)] Vacation. Panel opens off-screen; vacation including today lowers today's score; 'Clear' doesn't restore; 'To' before 'From' silent; header toggle shows no state. (M-033, M-034, M-035, L-050, T-099, T-095, D-100) *Claude:* Valid.
- **HA9** [Next → S1 (polish)] Step size for quantity habits. '+' adds 1 to an 8,000-step habit; water '+' adds a whole litre; 'Set' vs 'Add' unclear. (N-005, N-112, N-087) *Claude:* Valid.
- **HA10** [Next → S1 (polish)] Schedule edits. Switching to 'X times per period' turns 30 min/day into 30 min/week; edits start tomorrow by default. (L-065, D-044, T-124, N-164) *Claude:* Valid.
- **HA11** [Next → S1 (polish)] Timers. Focus writes '30.030783 minutes'; a finished habit shows a paused 25:00 timer; Resume credit odd. (M-138, D-232, B-077) *Claude:* Valid.
- **HA12** [Next → S1 (polish)] Habit form. Overloaded, sticky footer takes 40% on phones, template names read like financial instructions, 2.5 target accepted. (D-007, B-028, D-040, B-144, N-150, N-090, D-113, Denver S-06 quick-create) *Claude:* Valid. Denver's quick-create spec is a good base.
- **HA13** [Next → S1 (polish)] Completing gives no feedback. No toast or Undo when un-completing; repaint after 3–5 s. (D-042, N-069, M-036) *Claude:* Valid.
- **HA14** [Next → S1 (polish)] Habit cards layout. ~3 screens tall on phones; empty hole when expanded; chips clipped at 375. (M-076, M-106, M-132, N-062, D-137) *Claude:* Valid.
- **HA15** [Next → S1 (polish)] 30-day heatmap. Near-invisible empty cells in Light; white numbers on pale cells in Dark; no intensity. (D-178, D-192, N-089) *Claude:* Valid.
- **HA16** [Next → S1 (polish)] Reminders. Default bedtime reminder sits inside default quiet hours; 10:00–10:00 quiet hours accepted; 'until it is done' on every habit; no proof a reminder is set. (M-061, B-127, B-128, N-096, M-062) *Claude:* Valid.
- **HA17** [Next → S1 (polish)] ⋯ menu and keyboard. Not exposed as a menu; Esc ignored; repeated unnamed stops. (T-088, M-040, M-092, D-203) *Claude:* Valid.
- **HA18** [Next → S1 (polish)] Backfill, streak legend, forgiveness. Can't backfill before creation; no forgiveness score. (N-038, T-020, N-163) *Claude:* Already J9. (overlaps 20 Oct item J9)

### HE · Health
- **HE1** [Next → S1 (polish)] Today 'Add 250 mL' fails with a raw error. Blocker for beginners: a new profile's first water tap fails; a screen reader hears 'saved'. (N-105, B-001, B-016, B-164, M-009, M-099, N-050, N-128) *Claude:* Valid. Same payload as Health's own button.
- **HE2** [Next → S1 (polish)] Calorie coach changes the target in one click. −25% with no confirm or Undo, macros not rescaled, no floor; 'Adjust to 1740' next to 3,630 kcal; advice from implausible data. (D-094, L-046, M-054, M-097, B-100, N-035, B-088) *Claude:* Valid; a health-safety item.
- **HE3** [Next → S1 (polish)] Sleep logging. Form at the bottom, squeezed beside the goal; save does nothing with a tiny grey line; card says 'no night' while in bed. (N-006, D-120, D-199, D-144, L-062, B-166) *Claude:* Valid.
- **HE4** [Next → S1 (polish)] Barcode lookup is switched off. 'Provider activation pending'; /api/food-lookup returns PROVIDER_SETUP_REQUIRED. MFP charges for this. (B-086, T-002, T-010) *Claude:* Mostly an owner step: deploy the food Worker with FOOD_USER_AGENT and bind it. Then J5's polish. (overlaps 20 Oct item J5)
- **HE5** [Next → S1 (polish)] Food logging. Impossible nutrition accepted; one food without calories makes the whole day 'Unknown'; nutrient targets read 'Unknown'; quick pick doesn't set the meal; 'Log food or water' doesn't go to water. (D-089, T-133, M-130, L-036, D-046, D-023, D-163, N-072, N-141, Denver S-13) *Claude:* Valid. (overlaps 20 Oct item J8)
- **HE6** [Next → S1 (polish)] Measurements. 'Measured at' empty but required; no delete; chart scale below zero; '69.999999 kg'. (D-075, T-138, L-054, B-120, N-121) *Claude:* Valid. (overlaps 20 Oct item C5)
- **HE7** [Next → S1 (polish)] Fasting. Elapsed time capped at the target; no day on the target time; Checklist saves a 0.0 h fast; one message for every bad input. (L-061, M-136, B-063, B-064) *Claude:* Valid.
- **HE8** [Next → S1 (polish)] 'Late-evening eating' insight from untimed meals. Meal entries carry no time. (L-071, B-119) *Claude:* Valid; a truth issue.
- **HE9** [Next → S1 (polish)] Showcase import banner on every Health tab. Permanent 'Undo / Dismiss' strip; its 'Undo' sits next to a toast's 'Undo'. (D-010, L-037, B-121, M-141, Denver S-01) *Claude:* Valid.
- **HE10** [Next → S1 (polish)] Health forms under the dock and squeezed. Quick counter '+', meal ⋯ menus, submit buttons covered; three summary cards in a row clip the coach text. (D-115, D-116, D-117, D-118, D-119, D-121, D-138, D-161, D-162, D-222) *Claude:* Part of LA1. (overlaps 20 Oct item D2)
- **HE11** [Next → S1 (polish)] Quick counters. Dash for no data; '+' looks disabled on hover; duplicate names; a counter is just a number; long names overflow. (D-011, D-222, B-169, T-097, N-084, N-118, B-168) *Claude:* Valid.
- **HE12** [Next → S1 (polish)] Water list. No time or order; removing has no Undo. (N-060, B-117, D-048) *Claude:* Valid, small.
- **HE13** [Next → S1 (polish)] Meditation totals. 'All sessions 22 · 4 h 03 min' doesn't match the list; Checklist toast '1 min' vs record '6 s'. (B-078, M-135) *Claude:* Valid.
- **HE14** [Next → S1 (polish)] Recipe and nutrition import. Lines starting with a word dropped; '1 ingredients found'; Save at 0; CSV import messages. (L-038, T-139, B-090) *Claude:* Valid.

### TO · Today, Checklist, Journey, first run
- **TO1** [Next → S1 (polish)] Start page other than Today breaks Today (blocker). Start page Goals or Wealth makes /app always redirect; the Today link renders blank; /app/today is 404; every page can be switched off, Today included. (N-178, B-124, T-149, M-095) *Claude:* Valid, must fix.
- **TO2** [Next → S1 (polish)] Evening wrap-up. Switched on but never appears; can't be started; the only setting that needs Save; no confirmation. (M-064, M-063, B-198, B-135, M-093, M-120) *Claude:* Valid.
- **TO4** [Next → S1 (polish)] First run. Stale 'Step 1 of 8 · Opening your private records…'; welcome steps open mid-page; iPhone steps on desktop Chrome; step-4 targets don't match picked habits; weekly review prefilled with demo text. (N-045, N-106, N-108, N-107, N-094) *Claude:* Valid; part of the welcome-flow work. (overlaps 20 Oct item H6)
- **TO5** [Next → S1 (polish)] Checklist leftovers (logic). Focus shows a pre-running 'Read · 25:00' that credits 25 min instantly; Fast/Focus start without confirm; starring a habit adds a second planet with the same name; Undo toast gone in ~5 s; 12-week history missing on phones; sticky bars leave 55% for the path. (M-137, N-095, T-111, M-112, M-110, M-013, D-170) *Claude:* Not in AG's scope (visual only); S1.
- **TO7** [Next → S1 (polish)] Today layout. Arrange-mode handles overlap titles; right third empty; hero feature row clipped; duplicate Quick add; ~173 Tab stops; raw float % in screen-reader names. (M-045, T-098, M-133, D-134, D-016, D-028, D-073) *Claude:* Valid.
- **TO8** [Next → S1 (polish)] Weekly review. Contradicts itself; stale in the demo; 'check-ins this week' includes today against its own rule; no current-day indicator. (M-065, M-027, B-097, M-028) *Claude:* Valid.
- **TO9** [Next → S1 (polish)] Hidden pages and an internal page. Journey, Life review, Stories and ZIGi states are not in the sidebar; /app/zigi shows internal art-review text (frame ids, 'as drawn by the studio'). (D-249, D-247, M-030) *Claude:* The internal copy should go; adding the pages to the nav is your call. **Owner note:** Only do the nternal copy requirement , the hidden pages are there for a reason and can be accesed throughout other buttons so don't add any buttons to the sidebar for now
- **TO10** [Next → S1 (polish)] Music player opens far from its button. Top-left over the hero, no back. (L-077) *Claude:* Fits your launcher direction (AF8). (overlaps 20 Oct item AF8)
- **TO11** [Next → S1 (polish)] Search. Long query overflows; results shift while typing so a click lands on 'Ask ZIGi'; '<b>x</b>' returns unrelated hits; nothing for 'refresh' or 'tax'. (D-093, N-110, N-139, B-072, B-178, B-179, T-082) *Claude:* Valid.
- **TO12** [Next → S1 (polish)] Today changes after load. 'No active goal yet' while loading; 'Needs attention' count changes. (B-066, M-122) *Claude:* Valid.
- **TO13** [Next → S1 (polish)] First click on Settings doesn't navigate. Right after load. (N-001) *Claude:* Valid; check hydration timing.

### SE · Settings, Help, Activity, Chess
- **SE1** [Next → S1 (polish)] Help contradicts Settings and the app. Help says accounts and sync aren't open and data lives only on this device, while Settings has sign-in and sync; 'backed up' promise; Portfolio sync claim; paths to settings that don't exist; 'the Showcase has the game layer on' is false. (B-023, M-022, M-029, B-108, B-089, B-193, D-229, D-216, M-127, M-068, M-128) *Claude:* Valid. Fits RM5 (friends pack + Help refresh). (overlaps 20 Oct item RM5)
- **SE2** [Next → S1 (polish)] Two weekly review days. Friday in Settings, Sunday in Reminders; change without confirmation. (B-126, N-093) *Claude:* Valid.
- **SE3** [Next → S1 (polish)] Settings is an ~8,000 px wall. Sticky tabs take 35%; chips without state; three overlapping import/restore areas. Phone drill-down is tidy. Denver: one 'Backup & restore' card. (D-005, D-088, D-127, D-224, D-062, D-251, M-128, Denver S-05) *Claude:* Valid.
- **SE4** [Next → S1 (polish)] Help page. One 18,000-character page; 17 topic pills; no search; cryptic anchors; links without names; changelog crowding. (D-091, D-015, D-133, N-032, T-083, M-031, N-184, M-126, L-020, D-159, Denver S-14) *Claude:* Valid. (overlaps 20 Oct item H5)
- **SE5** [Next → S1 (polish)] Activity. One entry per screen on phones; filters without counts; read-only; junk stays. Tokyo: filter by module + undo from the log. (D-171, T-113) *Claude:* Valid.
- **SE7** [Next → S1 (polish)] Disabled features look active. Push reminders and Spotify switched off but controls look live; push card copy wrong on desktop. (N-097, M-023) *Claude:* Valid.
- **SE8** [Next → S1 (polish)] 'Gamify' vs 'Game layer'. One switch, two names; turns on silently with the demo. (D-218, M-006) *Claude:* Valid.
- **SE9** [Next → S1 (polish)] Theme and motion settings. Tooltip leaks 'Customize — coming later'; sidebar scrolled after switching to Light; Motion select gives no confirmation. (D-191, N-039, D-230, N-183) *Claude:* Valid.
- **SE10** [Next → S1 (polish)] Help & diagnostics. Inconsistent contact addresses; a leaked build string. (M-067) *Claude:* Valid.
- **SE12** [Next → S1 (polish)] 404 pages. Bare white page outside /app with no link or branding. (D-248, M-005, M-032, N-138) *Claude:* Valid, small.
- **SE13** [Next → S1 (polish)] Header warnings. Permissions-Policy warning on every page; manifest enctype warning. (L-007, B-095) *Claude:* Tier 3 (headers/PWA); small.
- **SE14** [Next → S1 (polish)] Device PIN or Face ID lock. Habitify-style privacy lock. (Tokyo) *Claude:* Already in RM8 (passkey for remembered devices). (overlaps 20 Oct item RM8)

### LA · Layout, accessibility, themes
- **LA1** [Next → S1 (polish)] Floating buttons and ZIGi cover controls. Delete, ⋯ menus, '+', Cancel/Continue, view switches at 375, 768 and 1280, and on real phones; the dock fan menu opens off-screen; no hover labels. (D-110, D-066, D-250, D-254, D-260, D-064, L-017, L-059, L-087, B-027, N-051, N-173, M-012, M-072, T-068, T-069, T-130, T-136, T-145, D-130, D-231, D-033) *Claude:* Valid; your launcher direction (AF8 + one-tap on phones) is the fix. (overlaps 20 Oct item AF8)
- **LA2** [Next → S1 (polish)] 768 px. Navigation becomes a 5×3 grid filling the first screen; one load rendered at ~2.5× with sideways scroll; hero squeezed; More sheet stays half-width after resizing. (D-065, D-261, D-263, T-146, T-148, N-153, D-109, M-074, Denver S-15) *Claude:* Valid. Tab bar or sidebar from 600 px up; check the viewport meta for the 2.5× case.
- **LA3** [Next → S1 (polish)] 375 px top of page. ~380 px before content; alpha banner takes 15%; header icons unlabeled. (D-252, N-048, D-070) *Claude:* Valid.
- **LA4** [Next → S1 (polish)] Chip and tab rows cut off with no scroll cue. (D-068, D-255, T-147, N-062, N-174, D-098) *Claude:* Valid.
- **LA5** [Next → S1 (polish)] Light theme. Dark hero and wallet islands; gradient words wash out; near-black Staking card; blank Ecosystem tiles; faint hover; dock stays dark. (D-174, D-175, D-177, D-179, D-181, D-182, D-188, D-189, D-233, D-063, N-188, N-189) *Claude:* Partly AF9/AF10 (your calls); rest is polish. (overlaps 20 Oct item AF9)
- **LA6** [Next → S1 (polish)] Dark theme. White numbers on pale heatmap cells; ~10 px grey footnotes; column widths differ; header icons differ per page. (D-192, D-198, D-196, D-194) *Claude:* Valid.
- **LA7** [Next → S1 (polish)] Accessibility. Unnamed inputs (Staking wallet/APR, goal page); invalid <dl> on Portfolio; Checklist launcher outside landmarks; duplicate landmarks; live regions; focus after save; toasts not keyboard-dismissable; Quick add focus order; tap targets at 485. (L-022, N-175, BUG-050, L-080, N-119, N-187, N-190, N-124, N-176, M-091, N-186, N-115) *Claude:* Valid. (overlaps 20 Oct item E3)
- **LA8** [Next → S1 (polish)] Blank pages while loading. Markets, Portfolio and Habits show an empty dark void on hard reload, no skeleton. (D-213, D-006) *Claude:* Valid.
- **LA9** [Next → S1 (polish)] One top bar and page titles. Header differs per page; Journey's phone title says 'ZIGoals'. (D-013, D-016, M-075, N-177, Denver S-09) *Claude:* Valid.
- **LA10** [Next → S1 (polish)] Hover feedback inconsistent. (D-212, D-223, D-221) *Claude:* Valid.

### CO · Competitor ideas
- **CO1** [Next → S1 (polish)] One Today line joining money, habits and health. '4/5 habits · 1.6 L water · net worth +2.1% this week', from the same numbers as each module. (Multi) *Claude:* Strong, small once TR1 is fixed.
- **CO4** [Next → S1 (polish)] Week grid with a P&L row. Habits, water, sleep and P&L, one tap per cell. (Habitify) *Claude:* Already J16. (overlaps 20 Oct item J16)
- **CO5** [Next → S1 (polish)] One-tap water tiles + a water reminder. (Lose It) *Claude:* Small; after HE1.
- **CO6** [Next → S1 (polish)] Net worth chart split into wallets, manual and staking with 'why did it change'. (Monarch) *Claude:* Already G11. (overlaps 20 Oct item G11)
- **CO7** [Next → S1 (polish)] Live TVL/APR per Ecosystem card with source and time. (CoinStats) *Claude:* AF does this on Earn; Ecosystem could reuse it. **Owner note:** reuse it in ecosystem where it fits
- **CO8** [Next → S1 (polish)] Daily chess puzzle as a 'brain' habit. (Tokyo) *Claude:* Small, fun.
- **CO11** [Next → S1 (polish)] Complete or snooze from the notification. (T-021) *Claude:* Needs push activation.
- **CO12** [Next → S1 (polish)] Published data-freshness policy. (T-051, T-018) *Claude:* Small Help page once TR2 is fixed.
- **CO13** [Next → S1 (polish)] Landing: one clear promise + interactive glimpse. (Multi, Kubera) *Claude:* Fits RM4 landing upgrade. (overlaps 20 Oct item RM4)

### MO · Money and launch
- **MO3** [Next → S1 (polish)] Retention hooks. Working: Checklist, Journey, streaks, in-app reminders. Missing: push, ZIGi free-form, fresh weekly review. (Part 12 §3) *Claude:* Push activation is your acceptance-stack track.
- **MO4** [Next → S1 (polish)] Landing has no pricing, privacy policy or terms pages. All 404. (C-035) *Claude:* PRIVACY.md exists in the repo; publishing it on the landing is a product-honesty step. Fits RM4. (overlaps 20 Oct item RM4)
- **MO5** [Next → S1 (polish)] Landing claims that are now wrong. 'Staking planned · not available', 'signing disabled', 'mainnet execution disabled'. (C-001–C-004, T-001) *Claude:* Your landing redeploy tonight fixes the main sentence (H62); check the other lines after it.

### NO · Notes on the report
- **NO1** [Next → S1 (polish)] Old bugs: 68 still open, 5 fixed, 8 not reproduced. Fixed: BUG-008, 015, 025, 033, 058. Not reproduced: 005, 017, 018, 037, 040, 043, 065, 081 (005/081 only in headless runs). *Claude:* Most open ones are rows above.
- **NO2** [Next → S1 (polish)] What works and must be kept. Food maths, water conversion, sleep metrics (best screen), weekly review copy, persistence, ZIP export, restore with preview, DST, keyboard focus trap, CSP, Calculator review, Portfolio P&L maths, Habits at 375, Earn glossary. *Claude:* Good evidence for the friends pack.
- **NO4** [Next → S1 (polish)] All testing used the Showcase demo. Some findings are fixture values; they're still real labelling problems. *Claude:*  **Owner note:** If showcase works flawlessly then the real app does too - after this HUGE polish session upgrade we do i will let the grok bosts test the app in depth for hours without the showcase demo activated

## B. Picklist 1 (Grok on Alpha #44): every "Next polish" item except the ZIGi G-items (59 items)
- **A1** Stale second tab overwrites goals (BUG-075)
- **A2** 'Export Goal Data' exports nothing (BUG-036)
- **A3** Drafts lost on Back or reload (BUG-076/077)
- **A4** 'Reset Showcase Demo' has no confirm or undo (BUG-061)
- **A5** Portfolio: no edit-transaction; Remove has no confirm/undo (BUG-032)
- **A6** Nap edits overlap or replace night sleep (BUG-021 + PoC)
- **A7** Junk import shows a raw schema dump (BUG-042)
- **B1** BTC/ETH prices differ between pages and ZIGi (BUG-006/059)
- **B2** Unrounded prices (BUG-007/028)
- **B3** No upper limits on amounts (BUG-001/027/011/022/078/079)
- **B4** Several unexplained totals; Today vs Wealth disagree (BUG-063/085)
- **B5** Count mismatches (BUG-031/041/062/044)
- **B6** Fake goal events and 'Showcase example' on your own data (BUG-004/073/040)
- **B7** AAPL 30 × $341.97 shown as $7,500 (BUG-074)
- **B8** Water habit and water log out of sync (BUG-043 + PoC)
- **B9** Water cap bypassed with fl oz; no daily cap (BUG-083, new)
- **C1** Errors off-screen or silent (BUG-003/009/020/026 + PoC)
- **C2** Wrong unit wording in errors; stale 'Meal logged.' (BUG-020)
- **C3** Water/servings error text wrong, field not highlighted (BUG-084, new)
- **C4** Goal wizard polish (BUG-013/014/015/016/017/065)
- **C5** Goals and measurements can't be deleted (BUG-010)
- **C6** Habit form and schedule issues (BUG-070/071/018/024/025)
- **C7** Unlogged day counts as failed but calendar shows no × (BUG-082, new)
- **C8** Time zone 'Foo/Bar' accepted (BUG-035)
- **C9** Health deep links ?tab= and #sleep ignored (BUG-080)
- **C11** Food can't be logged without a library food (BUG-066)
- **C12** Adding ETH again makes a duplicate card; stock form uses crypto words (PoC)
- **D2** Floating buttons cover content (BUG-005/034/081)
- **D3** Settings links only 18 px tall at 375 (BUG-039)
- **E1** Health link contrast 1.08:1 (BUG-046)
- **E2** Nested interactive chart parts; invalid dl (BUG-047/048)
- **E3** Focus trap, wizard needs 20–30 Tabs, unnamed inputs (BUG-045/049/050)
- **F1** 358 KB ZIGi idle animation on every page
- **F3** Cold load 1.3–1.4 s
- **F5** Market data 503s, 'could not refresh' (BUG-069)
- **F6** No sort or pagination on Goals and Habits lists (BUG-064)
- **H3** Duplicate widgets on first visit; two swan logos (PoC)
- **H5** Help crowded with changelog; Chess 'page is hidden' (BUG-068)
- **H6** 'First 60 seconds' flow — *Owner:* Build upon our excisting welcome options welcome flow
- **I2** Earn headline 'Make your money work' (HOLD)
- **I3** 'Every live way to earn…'
- **I4** Hard-coded 21-day unbonding fallback in the explainer
- **I5** Ramp/Banxa 'integrated'; 'sells nothing'
- **J1** 'Numbers you can trust' package
- **J2** 'Never lose my data' package
- **J3** Habit → savings goal (complete a habit, add €X to a goal)
- **J5** Free barcode scanner (Open Food Facts) — *Owner:* We have it indeed, but it should work flawlessly and if we can incoorporate more data sites to scan stuff easy (even if its a sub later for when we launch officially) we should concider it
- **J8** Fast food logging: Recent/Frequent per meal, copy yesterday, Quick Add
- **J9** Habit skip/backfill, streak legend, grace rule
- **J11** Price alerts and a watchlist
- **J14** CSV import with duplicate check; read-only exchange sync
- **J15** Reward, income and airdrop transaction types
- **J16** Week grid across all modules (log from it) — *Owner:* This should not interfere with our design and be beautifully integrated (also moveable as with all block on our pages)
- **J17** Small Monarch-style polish (remembered chart ranges, green '+' inflows)
- **J18** Budgeting (new)
- **L1** Multi: iPhone all-in-one, $49.99 lifetime — *Owner:* The strongest UX ideas we will try to copy , in a later session we will do this more in depth
- **L2** personalEverything, HALO, Lifemova and others — *Owner:* We keep building upon our strenght of incoorporating alot of tools into one app so people can't resist trying it and staying once they do try - we continue to copy the absolute best ideas from all competitors mentioned / so for next session just like l1 make sure we atleast get features we currently lack compared to other apps
- **L4** MyFitnessPal paywalled its barcode scanner — *Owner:* We got a high advantage kkeeping it free, take not of my other J5 answer and just keep this
- **M2** Session AF may already fix several items — *Owner:* I agree, only use the things I marked as "Next Polish" for now, keep track of items I mark "Later'" to implement later or see if AF session fixed them and the new grok Bots Testing report gives us new things to fix

## C. Session AF leftovers in scope
(AF8 is OUT: the Checklist already has its own phone button and ZIGi's button stays. AF5 goes to the ZIGi session. AF11 is Studio-4 art.)
- **AF1** WalletConnect for phones and Ledger: waits for the owner's Reown project ID (D1). Desktop wallets already work. After the ID: put it in `apps/web/config/public-integrations.json`; the WalletConnect Verify `frame-src` entries are an owner decision (security review S9). *(owner first)* → S1
- **AF2** Pre-filled Ramp and Banxa hand-offs: wait for the owner's public IDs (Ramp host API key, Banxa partner ref; `docs/earn/af/OWNER_ACCOUNTS.md`). The plain sites work today. *(owner first)* → S1
- **AF3** Earn shows your own OroSwap LP and USDC vault shares. Needs an address-bearing smart-query relay (Tier 3 egress; ADR-028 H134). → S1
- **AF4** "What's this?" tap on the wallet card's older "Testnet" label (ledger N1). → S1
- **AF6** Life review date mismatch between 00:00 and 02:00 Brussels (React #418; `useLocalToday` should start from the server's date). This is also why the verifier ends FAIL at night. → S1
- **AF7** Verifier: one aborted `/api/push` just outside the 2 s window keeps the status at "completed with findings". Find what aborts it, or judge it. → S1
- **AF9** Hero slogan: its gradient words measure below the contrast floor in every theme (protected baseline). Includes the old 4–5 px line-box touch at 768/1920. *(owner decision)* → Discuss
- **AF10** Ecosystem page eyebrow by day: 3.2–3.7:1 on the teal glow at phone widths. Say "calm the ecosystem header by day" to soften it. *(owner decision)* → Discuss
- **AF12** Earn's Start-here keeps its older path look beside the new Checklist path: align them. *(owner decision)* → S1
- **AF13** Today repeats some facts across its cards (the market watch is already fixed, H131). → S1
- **AF14** Dependabot moderate alert on `main`: Vite `launch-editor` (dev server, Windows only). The fix is a dependency bump. *(owner approval for the dependency)* → S1
- **AF15** Small layout items the audits judged and left as they are: Habits' time headings just under 3:1, a Checklist name past two lines on a phone's path, two stress-only readings in Health's import view, an Academy name under the "Jump to your next lesson" bubble while scrolling. → S1
- **AF16** CI hardening for the known intermittents:
  - the WebKit "ZIGi box empty after a fill" class;
  - `webkit-phone` cancelled fetches;
  - the `zigi-memory` navigation stall;
  - `zigi-accept-correct:260` in Asia/Tokyo;
  - Canonical reproducibility failing on mismatched runner images. → S1
- **AF1 / AF2 note (owner, 25 Oct):** the public IDs come AFTER this session. Prepare everything so the IDs only need to be filled in (config keys, empty-state copy, tests with placeholder-free fixtures); never invent or commit an ID.

## D. Roadmap items in scope
- **RM4** Landing upgrade (E), `www` → apex redirect, and switching off the landing Worker's workers.dev/preview URLs. The session builds; the owner deploys locally. Also covers **F4** (landing 1.6 MB). → S1
- **RM5** Friends pack + Help refresh (J), before the friends Alpha (Known limitations, FRIENDS_GUIDE, Help/What's new for AF). → S1
- **RM6** Automatic PR-review GitHub Action on the API credits (G), before the friends Alpha (Tier 3 CI; the owner adds the secret). *(owner first: the secret)* → S1
- **RM8** Verify-then-do (Part 0 checks the status in STATUS first): timezone phases 3–4 (incl. QA2-04's reminder day); renaming the `@2x` brand assets (Cloudflare redirects "@"); Portfolio sync and full coin search; Face ID/passkey for remembered devices (needs a real iPhone). → S1 (only what is still open)
- **RM7 (owner, 25 Oct) Fitbit:** Fitbit's legacy Web API switches off 30 Oct 2026. Do NOT build or extend Fitbit. Remove the Fitbit connect/import option from the app (keep any data already imported, readable and exportable), say plainly in Help that Fitbit's old connection has ended, and remove Fitbit from claims. Other fitness syncs are researched later (HE18, not in this session).

## E. Security and dependencies (owner, 25 Oct: "make everything safe again and clear on GitHub")
- Clear every open Dependabot / GitHub security alert on main (9 seen on 23 Oct: 2 high, 6 moderate, 1 low), including AF14 (Vite launch-editor) and the warning-only `glob` 10.3.3 advisory that OpenNext's tooling pulls in.
- Already done before AH (don't redo): next 16.4.2, wrangler 4.148.0, @opennextjs/cloudflare 1.20.12, zod 4.6.6.

## F. CI and deploy stability (seen 22–25 Oct)
Make these reliable (fix the cause in the test or the code; never delete or weaken a check):
- `apps/web/lib/staking/execute.test.ts:116` 60 s timeout (failed in PR CI and blocked Manual Alpha deploy run #50 in "Deployment config and regression gates")
- `scripts/run11/domain-review-race.test.mjs:41` "fetch failed" (blocked deploy run #50)
- `run9-2-product.spec.ts:30` phone Quick add dialog
- `run10-source-pinning.spec.ts:69` Habits → Today: the test navigates before the paint-first save lands
- the WebKit "cancelled request reported as access-control error" class (`/api/music-config`, `/api/push`, `/api/private-account`, `/api/earn/chain`, `/api/earn/oroswap`; `webkit-smoke.spec.ts:39`, the phone set)
- `layout-fixes-ae.spec.ts:24`, `session-x-findings.spec.ts:202`, `run10-motion.spec.ts:5`, `theme-parity-af` timeout
- the older list in AF16
- the hosted verifier's `/api/push` 503 counted as FAIL (AF7)

## G. NOT in this session
- ZIGi session (later): ZI1–ZI15, DE7, G1, G2, G3, G5, G6, G7, G11, G12, G15, J10, L6, RM1, RM2, RM3, AF5, HE17. Session AH does not touch `apps/web/lib/ai/**`, ZIGi components or evals.
- Later: DE2 (no Premium wording changes), DE6, DE11, DE12, HE15, HE16, HE18, SE6, SE11, LA11, CO2, CO3, CO9, CO10, MO1, MO2, MO6, AFL1–AFL9, RM9–RM14, every picklist-1 "Later" item.
- Skipped: DE3, DE9, DE10, NO3, NO5, TO3, TO6 and the picklist-1 Skipped list.
- Out by owner decision 25 Oct: AF8 (phone one-tap launchers) and LA12 (tied to AF8); any further Checklist / AG Polish leftovers (the Checklist path, footer and labels approved on 25 Oct stay exactly as they are).
