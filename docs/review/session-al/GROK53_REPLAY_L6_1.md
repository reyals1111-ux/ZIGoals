# Grok #53 replay — lane L6 (Staking, Earn, Governance, Ecosystem, Chess, Settings, Help, search), pass 1

- **Commit served:** `c521574f` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, built from /home/user/zig-branch) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 05:40–08:40 Brussels (the bots ran 4 Nov, 01:00–05:50; the Showcase chess rows use a page clock pinned to 4 Nov 05:20 Brussels, as Professor).
- **Replayed by:** a fresh replay agent (no fixes made, no app code changed, no mutating git). Bots: Berlin (`berlin.md`), Denver (`denver.md`, `denver-recheck-list.md`, `denver-competitor-gaps.md`), Lisbon, Moscow, Nairobi, Professor and Tokyo for the rows GROK53_LEDGER puts in L6 (87 AL rows → 205 finding ids, plus the keep-list rows in this area). `lanes/L6.md` was read only to see which rows claim Fixed.
- **Browser:** Google Chrome (channel `chrome`), headless, Playwright (the repo’s), `locale: en-GB`, `timezoneId: Europe/Brussels`. Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser at a time. Scripts, logs and 1 screenshot (`bn003-real-dialog-375-dark.png`, plus `bn084-liquid-menu-1280.png`) are in `/tmp/claude-0/replay-L6/` and are not committed.
- **Conditions used** (the codes in the table):
  - **D1920 / D1440 / D1280** = desktop at that width, Nebula (Berlin’s theme), a fresh empty context with the Welcome marked seen. "crypto chosen" = the record Settings → Earn writes (`zigoals:earn-prefs:v1 pageShown`), i.e. the person chose the money pages, as Berlin did in Settings.
  - **375 / 388 / 410 / 500 / 636 / 445 / 767 / 768** = viewport width (375–410 with mobile emulation). **Light / Dark** = theme record. **Showcase** = Settings → Load Showcase Demo.
  - **Live data:** the server’s own chain and Earn reads (api.zigchain.com, testnet-api.zigchain.com, DefiLlama) worked from this sandbox and were used live. chess.com and Lichess are not reachable from the headless browser directly, so their **GET** requests were fetched with curl (real public answers for `hikaru` / `DrNykterstein` and the real Lichess daily puzzle) and handed to the page. Exceptions, each named in its row: the governance failure rows (BN-073/093) route `/api/chain/proposals` to an "unavailable" answer; C-BN-16 uses a relay test double for an stZIG holding; C-BN-14 seeds one earlier value-locked read; C-BN-21 notes that Lichess’s rating-history endpoint answered `[]` for every user from here.
  - Nothing was signed, no wallet was connected, no Lichess sign-in; dialogs that lead to signing were checked up to the confirm button.
- **Lane specs as evidence.** `tests/grok53/chain` + `tests/grok53/settings` (desktop project, 1 worker, :3101): **59 passed, 1 failed** (5.2 min). The failure is `help-al-006-la-31` "PR-034: What’s new … each link opens its answer": What’s new links are 20 px tall, not ≥ 44 (an INT/Help row, not an L6 finding id; reported here for the lane). The specs use offline API doubles and fixed fixtures, so they are not the bots’ conditions; the verdicts below come from the replays.

## Totals (per finding id)

| verdict | finding ids |
|---|---|
| FIXED | 131 |
| HOLDS | 1 |
| STILL OPEN | 24 |
| CHANGED | 27 |
| OWNER DECISION | 7 |
| REASON CITED, NOT BUILT | 13 |
| NOT REPRODUCIBLE AS WRITTEN | 1 |
| NOT REPLAYED | 1 |
| **total** | **205** |

Keep-list rows in this area (counted per row, not per id): HOLDS 15, L7 1, HOLDS (sampled) 1, NOT REPLAYED (guard list) 1, L4 1, INT 1, L3 1, L1 1.

Verdict words: FIXED / STILL OPEN / CHANGED as in the brief. OWNER DECISION only where the cited decision is in AL_SCOPE F/O and I agree. REASON CITED, NOT BUILT = a competitor row whose status gives a reason that is not an F/O decision (as in the L1 replay). HOLDS = a keep-list positive that still works.

## Findings

### Berlin — new findings (53)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| BN-001 | AL-NAV-007 | STILL OPEN | 375 Dark, fresh (mobile emulation) | Today and Wealth have no link to Earn/Staking/Governance/Ecosystem/Chess or to "Your pages"; the More sheet lists Activity, NOVA, Checklist, Tasks, Notes, Journal, Status & wallet, Settings, Help only. Help now explains where they are, but nothing on Today/Wealth points to them. |
| BN-003 | AL-LAYOUT-375-009 | CHANGED | 375 Dark (mobile emulation), Governance → Real network | No clipping: "Continue on the real network" and "Not now" stack full width (337 px). New problems: each button is about 140 px tall, and the "I understand" checkbox sits centred on its own line above its label (screenshot bn003-real-dialog-375-dark.png). |
| BN-004 | AL-CHAIN-DATA-001 | STILL OPEN | D1920, chain chosen, Practice | Practice chosen, no wallet: "Positions & allocations zigchain-1" card shows "Native staking · yearly rate before a validator’s commission 5.45 % · ZIGChain’s official mainnet server" with no "mainnet only / not the practice network" tag. The tag ("These totals are your real ZIGChain mainnet wallet, read only") appears only once a wallet is tracked. |
| BN-008 | AL-CHAIN-DATA-005 | CHANGED | D1920, Practice (testnet) | Quorum rules once (1 full paragraph, 18 cards point to it): fixed. But test/template proposals are not grouped or collapsed: 12 of the 20 cards carry a "Looks like a test or template" tag and still show in full with their template bodies (Summary / Motivation …). |
| BN-014 | AL-NAV-006 | FIXED | 375 Dark (mobile emulation) | Tapped all 24 drill-in rows: every row lands on its own anchor at the top (Privacy & storage → #privacy, Chess usernames → #chess …); no row jumped to another section. |
| BN-016 | AL-SETTINGS-003 | FIXED | D1920 fresh | Today off → "Today is hidden. You can show it again here at any time. ZIGoals now opens on Goals; choose another start page below." |
| BN-017 | AL-A11Y-020 | FIXED | D1920 | role=group named "What each page may share" holds the 6 page-data switches. |
| BN-019 | AL-SETTINGS-007 | FIXED | D1920 Nebula, fresh | Settings load: GET /api/push 200 and GET /api/private-account?action=status 200 ({configured:false}); 0 console errors. |
| BN-024 | AL-HELP-002 | CHANGED | D1440/1920 fresh and crypto chosen; Help read in full | Most checks now hold: the account controls are introduced with "Only where accounts are switched on … Settings → Account & devices says that email access and encrypted sync are not configured, and the account controls named on this page … do not show"; Earn dock and validator-alert switches appear once the chain is chosen (verified), Help says so; the notice answer quotes the real banner. Left: the "Your recovery secret" answer still says, unconditionally, "Lost a device? Revoke it under Settings → Devices and sessions, then rotate the vault key (Settings → Rotate vault encryption)" (see BN-165). |
| BN-025 | AL-HELP-003 | FIXED | D1280 Help | Topic index has "Earn, Staking, Ecosystem and Chess" (section "MORE PAGES · Earn, Staking, Governance, Ecosystem and Chess"). |
| BN-026 | AL-CHAIN-DATA-004 | FIXED | D1920, no wallet | Card heading is now "Scenario rate · before a validator’s commission"; the calculator prefill 5.45 is labelled "the chain’s own yearly rate before a validator’s commission". No "net" heading over a gross figure. (The panel still says "enter your own net APR after commission" as advice.) |
| BN-027 | AL-STALE-DATA-001 | CHANGED | D1920, 5 Nov | Header no longer "Sources reviewed Sep 23": now "Sources last read 4 Nov 2026"; Zignaly worded past; value-locked reads carry date and time ("read 5 Nov 2026, 07:07"). But the header still is not the newest read: the cards’ DefiLlama reads are dated 5 Nov while the header says 4 Nov. |
| BN-030 | AL-COPY-054 | CHANGED | D1920 and Showcase | Last step renamed "Staking on the real network" and a line says "nothing here says you should buy or stake", but the path is still Get a wallet → Practice → Bring money in (Add money "Card or bank", Get ZIG) → Start earning, followed by "Ready to stake? Go to Staking": the buy-and-stake funnel the bot flagged is unchanged in shape. |
| BN-064 | AL-SETTINGS-001 | FIXED | D1440 fresh (Berlin desktop; Professor Showcase) | /app/settings now has the "Open ZIGi" launcher; Ctrl+K after clicking the page opens ZIGi’s panel on Settings, Help and Staking alike; clicking the launcher opens it too. (Light-theme panel title in D-188 not re-checked.) |
| BN-066 | AL-CHAIN-DATA-004 | FIXED | D1920 | Page wording is now "before a validator’s commission", the same as ZIGi’s answer the bot quoted (ZIGi side not re-asked: no model in this sandbox). |
| BN-073 | AL-CHAIN-DATA-002 | FIXED | D1920, testnet; /api/chain/proposals answers status unavailable after a good read | "The newest read did not work: ZIGoals could not read this just now. The list below is the one read earlier, at block 8559234. ZIGoals tries once more by itself in a moment." 20 cards kept; one automatic retry seen. (The kept list lives in memory: a reload loses it.) |
| BN-074 | AL-LAYOUT-500-001 | FIXED | 500×860 Light, crypto chosen | One topic strip only ("On this page", 16 chips) at y 481; the phone tab bar starts at y 795, so nothing sits under it; the round app strip is gone. |
| BN-075 | AL-SETTINGS-001 | FIXED | 767 Light, fresh | Per O3 there is no floating launcher below 901 px; the top bar’s "Apps & extras" button exists on Settings and lists "ZIGi · Your Personal AI Companion" first. |
| BN-079 | AL-WALLET-001 | FIXED | D1920, real relay | Saved the address, then the same in upper case: one entry in "Tracked wallets", stored lower-case in zigoals:platform:v1. |
| BN-083 | AL-CHAIN-DATA-001 | FIXED | D1920, Practice, real relay, fresh zero-balance address | Tracked a zig1… address (real relay, "Public snapshot saved"). Under Practice the block says "These totals are your real ZIGChain mainnet wallet, read only"; Liquid wallet card "ZIGChain mainnet". |
| BN-084 | AL-LAYOUT-DESKTOP-014 | FIXED | D1920 and D1280, tracked wallet | Liquid wallet ⋯ opens rightwards: panel x=335 (1920) / 283 (1280), main starts at 294 / 242, sidebar ends at 216; both items ("Add native-zig quantity/allocations to Today") fully hit-testable. |
| BN-085 | AL-WALLET-001 | FIXED | D1920 | Staking → Tracked wallets: Rename (saved "Berlin test wallet") and Remove ("Stop tracking …? Its 1 observed position … leave this device" → Remove wallet / Keep it); after Remove the list is empty. |
| BN-093 | AL-CHAIN-DATA-002 | FIXED | D1920, reload while the read fails, then upstream back | "Proposals are unavailable: ZIGoals could not read this just now. ZIGoals tries once more by itself in a moment." and the list (20) came back by itself when the read recovered. The route answers a typed {status: unavailable, reason} body (code read). |
| BN-097 | AL-CROSS-PAGE-SYNC-003 | FIXED | D1440 | Ecosystem ⋯ reads Today: "Add Valdora research shortcut to Today" → then "On Today · Remove from Today" (toast with Undo). On Today, Remove widget → "Widget removed. Your underlying record was kept. Undo". |
| BN-098 | AL-SETTINGS-003 | FIXED | D1920 | Staking off → "Governance hides with it, since it shows only while Staking shows." (the note under Governance still says "It shows while Staking shows; Earn links to it either way"). |
| BN-100 | AL-FIELD-ERROR-016 | FIXED | D1920, hikaru / DrNykterstein | Target 0, -100, abc, 99999999, 3000.5: "A rating goal is a whole number from 100 to 4000." under the field, aria-invalid, focus. 2020-01-01: "Choose today or a later date". Duplicate: "You already have this goal: chess.com Rapid 3,000." Remove → toast "Chess goal removed. Undo". |
| BN-102 | AL-A11Y-020 | FIXED | D1440 | Time zone field keeps role combobox before and after a save ("1 combobox / 0 textbox" both times); "Mars/Olympus" → "“Mars/Olympus” is not a time zone name. Pick one from the list, for example Europe/Brussels." Keep part holds. |
| BN-109 | AL-HELP-003 | FIXED | D1280 | Help search "ö" → "Type at least two letters to search." (no longer every answer). |
| BN-111 | AL-AI-SAFETY-001 | FIXED | D1280 /app/help | No element hidden from people carries text for AI agents: the only invisible match for "agent" is the framework’s serialized page data (<script>), i.e. Help’s own people-facing FAQ "Can an AI agent in my browser use ZIGoals?" in a closed answer. navigator.modelContext is undefined, so no WebMCP tool text is offered. Nothing was followed. |
| BN-112 | AL-WALLET-001 | FIXED | D1920 | Settings → Wallet & network shows the same Tracked wallets list with Rename and Remove, with the renamed wallet. |
| BN-113 | AL-SECURITY-LOCK-001 | FIXED | D1920 fresh; the bot’s invalid batch (empty, 12/12, 1234/1235, 12ab34, 9 digits) once with pauses and once back to back | Each refused under the field ("Use 4 to 8 digits (this one has 2)", "The two PINs differ", "Use digits only", "(this one has 9)"); no lock record written, reload not locked. Valid 2580: on; "Turn the lock off" without a PIN → "Type your PIN (4 to 8 digits) to turn the lock off"; 0000 → "That PIN is not right"; 2580 → off. Card says every tab and window locks; a new tab opened locked. |
| BN-114 | AL-SETTINGS-008 | FIXED | D1920 fresh, Settings#notifications, read at 3/10/20 s | Two separate lines: the service "Notifications are being switched on. Your reminders still show inside ZIGoals." and the browser’s own "This browser: not asked yet. It asks when you press Turn on notifications." (Push is not configured on this build, so the service line is true.) |
| BN-121 | AL-TOAST-010 | FIXED | D1920, Lichess daily puzzle (real) | "a1a8 is not a legal move here." disappears after the next action (Show the next move) and is gone at the end ("That was the whole answer…"). |
| BN-122 | AL-CHAIN-DATA-005 | FIXED | D1920, testnet | "[COMPANY_NAME] …", "Test Proposal", "test evg" are now tagged "Looks like a test or template … may not be a real decision". |
| BN-126 | AL-LAYOUT-500-001 | FIXED | 375 / 768 / 1280 Dark | One strip at every width; at 768 the strip is not cut (scrollWidth 664 = width 664); at 375 the "Options are listed…" line runs the full 343 px column. (At 1280 that line is 680 px against a 954 px block above: a reading measure, not the bot’s 375 complaint.) |
| BN-127 | AL-LAYOUT-DESKTOP-016 | FIXED | 1280 and 768 Dark | Content right edge identical on Governance, Earn, Ecosystem and Staking: 1196 px at 1280, 748 px at 768. |
| BN-132 | AL-PERF-009 | FIXED | 1920, client navigation Staking → Ecosystem | Frames: Staking → "Opening the ecosystem directory…" (aria-busy) → Ecosystem hero. No Staking skeleton / "Connect Keplr" bar. |
| BN-160 | AL-LAYOUT-500-001 | FIXED | D1920 | All 16 chips set their own hash and land at the section top (no stale #safety). "What’s APR?" expands inline: "APR is a simple yearly rate: what a stake would earn over a year if nothing changed…". |
| BN-161 | AL-STALE-DATA-001 | FIXED | D1920 | Circle notice in the past tense: "its CCTP V1 burn limits fell to zero on 31 October 2026"; Zignaly "(passed)". Links still say "verified link · 18 Oct 2026" (liveness not re-checked, as the bot). |
| BN-165 | AL-HELP-002 | CHANGED | D1280 Help vs Settings (accounts not configured) | A caveat now sits in "Your data and sync", but the "Your recovery secret" topic still instructs "Lost a device? Revoke it under Settings → Devices and sessions … Settings → Rotate vault encryption", controls this installation does not have, with no "only with an account" next to it. |
| BN-166 | AL-HELP-002 | FIXED | D1280 Help | "Everything here works today" is gone; the Fitbit line matches Settings/Health ("its old connection ended on 30 October 2026"). |
| BN-167 | AL-AI-SAFETY-001 | FIXED | D1280 /app/help | No element hidden from people carries text for AI agents: the only invisible match for "agent" is the framework’s serialized page data (<script>), i.e. Help’s own people-facing FAQ "Can an AI agent in my browser use ZIGoals?" in a closed answer. navigator.modelContext is undefined, so no WebMCP tool text is offered. Nothing was followed. |
| BN-174 | AL-STALE-DATA-001 | FIXED | D1920 | Noble: "Being wound down · Circle stopped minting USDC on Noble on 13 October 2026; USDC.n should move to USDC.inj"; Axelar: "Live on ZIGChain · Carries ZIG as an ERC-20 …". Each card says what is live. |
| BN-175 | AL-COMPETITOR-GAP-130 | FIXED | D1440 testnet | Filter "All 20 · Open 1 · Passed 7 · Rejected or failed 12": Rejected shows only REJECTED cards, Passed only PASSED. |
| BN-177 | AL-CHAIN-DATA-006 | FIXED | D1920, testnet #119 | REJECTED with Yes 100 % now has "Why Rejected with mostly Yes: A proposal also needs enough of all staked ZIG to vote (the quorum) … ZIGoals cannot show this proposal’s turnout". |
| BN-178 | AL-CHAIN-DATA-006 | FIXED | D1920, testnet #116 | "Submitted 14 Aug 2026, 11:35 · Voting started 20 Aug 2026, 17:12, once its deposit was complete (the time before that is the deposit period, not voting)". |
| BN-179 | AL-CHAIN-DATA-006 | FIXED | D1920, testnet #116 expanded | "In the proposer’s own words" opens as paragraphs (Summary / Motivation / Details …); no "## " left. |
| BN-180 | AL-CHAIN-DATA-005 | FIXED | D1920, testnet | "[COMPANY_NAME] …", "Test Proposal", "test evg" are now tagged "Looks like a test or template … may not be a real decision". |
| BN-181 | AL-TOAST-010 | FIXED | D1920, Lichess daily puzzle (real) | "a1a8 is not a legal move here." disappears after the next action (Show the next move) and is gone at the end ("That was the whole answer…"). |
| BN-182 | AL-COMPETITOR-GAP-131 | REASON CITED, NOT BUILT | D1920 Chess | "Open Play" offers a Lichess board that needs a Lichess sign-in (not used, rules); no built-in opponent ("Not planned: no new dependency"; an engine need not be a dependency, so the reason is partial). D-228’s other parts are fixed: "Open on chess.com" links go to each game (www.chess.com/game/live/…), timestamps and copy split (D-012). |
| BN-183 | AL-TOAST-010 | FIXED | D1920, Lichess daily puzzle | Reload after one move: "Your moves so far are back. Find the next move." with Rh8+ Kxh8 kept. chess.com iframe: see PR-109. |
| BN-185 | AL-SECURITY-LOCK-001 | FIXED | D1920, same context | After the invalid batch a reload/new page is not locked (no lock record); only the deliberate valid PIN locked a new tab, and it came off with that PIN. |
| BN-186 | AL-SETTINGS-003 | FIXED | D1920 fresh, Wealth on, money pages off | One click on Governance: Earn, Markets, Staking, Governance, Portfolio, Ecosystem appear and the status says "The money pages that start off (Earn, Markets, Staking, Portfolio and Ecosystem) show now too; each keeps its own switch here." |

### Berlin — old ids (45)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| B-005 | AL-CHAIN-DATA-001 | STILL OPEN | D1920, chain chosen, Practice | Practice is the default (ok), but as BN-004: the live mainnet rate under a Practice choice still has no mainnet-only tag when no wallet is tracked. |
| B-022 | AL-CHAIN-DATA-001 | STILL OPEN | D1920, chain chosen, Practice | Practice is the default (ok), but as BN-004: the live mainnet rate under a Practice choice still has no mainnet-only tag when no wallet is tracked. |
| B-023 | AL-HELP-002 | FIXED | D1280 Help + Settings | Help: "With an account (by invitation during the Alpha) · Only where accounts are switched on. On an installation without them, Settings → Account & devices says that email access and encrypted sync are not configured" — matches Settings and the API (configured:false). |
| B-109 | AL-HELP-002 | STILL OPEN | Showcase 1440, Today never arranged | Help still says that in the Showcase "Daily Habits and “Your next goal action” stand aside when your habits widget and the Next step tile already show the same thing", but the Showcase Today shows a "YOUR DAY · Daily Habits" card (Morning / Afternoon / Evening) beside "Next step" and "What is due now". (Whether another habits widget repeats it could not be told from the screen alone.) |
| B-122 | AL-STALE-DATA-001 | CHANGED | D1920, 5 Nov | Header no longer "Sources reviewed Sep 23": now "Sources last read 4 Nov 2026"; Zignaly worded past; value-locked reads carry date and time ("read 5 Nov 2026, 07:07"). But the header still is not the newest read: the cards’ DefiLlama reads are dated 5 Nov while the header says 4 Nov. |
| B-193 | AL-HELP-002 | CHANGED | D1280 Help vs Settings (accounts not configured) | A caveat now sits in "Your data and sync", but the "Your recovery secret" topic still instructs "Lost a device? Revoke it under Settings → Devices and sessions … Settings → Rotate vault encryption", controls this installation does not have, with no "only with an account" next to it. |
| B-084 | AL-COPY-054 | FIXED | D1920 Earn | Header part (the id’s own complaint): "Options are listed in the order the network is built, not by how much they pay. Nothing here is advice or a promise of returns." The path nudge is tracked under D-060/D-099 (CHANGED). |
| B-202 | AL-HELP-002 | STILL OPEN | Showcase 1440 | Same Help answer as B-109 (Denver grouped it with the Goals count mismatch D-238, which is L4’s). |
| L-043 | AL-CHAIN-DATA-006 | CHANGED | D1920, testnet #119/#116 | Plain explanation added, but the raw lowercase chain string is still printed ("The chain’s own reason proposal did not get enough votes to pass") and no turnout is shown (the card says it cannot be shown for ended proposals). |
| T-132 | AL-SETTINGS-003 | HOLDS | D1920 fresh | With Today hidden, /app opens /app/goals ("Your Goals"). |
| D-002 | AL-CHAIN-DATA-003 | FIXED | 1920 Dark | "No public wallet yet" card is 205 px tall (1146 wide) with "Add wallet →" in the Track Wallet card beside it; not a void. |
| D-005 | AL-SETTINGS-002 | CHANGED | D1440 Settings | Settings is now tabbed (Data & privacy shows alone) and each backup card says what is in and out, but the Data & privacy tab is still ~5,800 characters of paragraphs, with three near-identical module backup blocks. |
| D-012 | AL-COPY-057 | FIXED | D1920, real ratings | Two lines: "chess.com: updated 5 Nov 2026, 06:35. Lichess: updated 5 Nov 2026, 06:35." then "These are the sites’ own numbers. Chess.com updates its public data at most every few minutes." Timestamps agree with the cards ("as of 5 Nov 2026, 06:35"). |
| D-014 | AL-CHAIN-DATA-005 | CHANGED | D1920, testnet | Clutter part as BN-008: tagged, not grouped; quorum paragraph once. |
| D-015 | AL-HELP-002 | FIXED | D1280 + 636/445 px | Help opens with a Search Help box and 12 topic chips (no "New:" changelog chips); every topic ends with "↑ Back to the topics"; 77 in-page links all resolve. |
| D-030 | AL-SETTINGS-001 | FIXED | D1440 fresh (Berlin desktop; Professor Showcase) | /app/settings now has the "Open ZIGi" launcher; Ctrl+K after clicking the page opens ZIGi’s panel on Settings, Help and Staking alike; clicking the launcher opens it too. (Light-theme panel title in D-188 not re-checked.) |
| D-060 | AL-COPY-054 | CHANGED | D1920 and Showcase | Last step renamed "Staking on the real network" and a line says "nothing here says you should buy or stake", but the path is still Get a wallet → Practice → Bring money in (Add money "Card or bank", Get ZIG) → Start earning, followed by "Ready to stake? Go to Staking": the buy-and-stake funnel the bot flagged is unchanged in shape. |
| D-062 | AL-SETTINGS-002 | CHANGED | D1440 Settings | Copy shortened and renamed in places (hero, backup sentence, "Game layer" one name), but the Title Case "Import Goal Data" heading (D-236) is still there. Denver’s exact 10-21 texts are not in the report, so only these could be compared. |
| D-082 | AL-COPY-054 | FIXED | Showcase 1440 | Open calculator works in the Showcase (prefilled rate, 7/30/365-day illustration); no promotional line next to the figures. |
| D-085 | AL-COPY-057 | CHANGED | D1920 live + Showcase | Cards, opponents and targets are grouped ("2,838", "3,000"), but the "Ratings over time" chart and its summary still use ungrouped numbers ("from 6 Oct 2026 (1460) to 4 Nov 2026 (1503); lowest 1453"), next to "1,503" on the card. |
| D-088 | AL-LAYOUT-DESKTOP-015 | STILL OPEN | 1280×800, fresh | Settings is 13,024 px tall at 1280 (16.3 screens); no collapsed groups (the 21 <details> are small disclosures). Lane status: needs the integrator. |
| D-091 | AL-HELP-002 | CHANGED | D1280 Help | Search, a 12-topic index, collapsible answers and "Back to the topics" (good); the contradiction left is the recovery-secret paths (BN-165). |
| D-099 | AL-COPY-054 | CHANGED | D1920 and Showcase | Last step renamed "Staking on the real network" and a line says "nothing here says you should buy or stake", but the path is still Get a wallet → Practice → Bring money in (Add money "Card or bank", Get ZIG) → Start earning, followed by "Ready to stake? Go to Staking": the buy-and-stake funnel the bot flagged is unchanged in shape. |
| D-123 | AL-LAYOUT-500-001 | FIXED | 375 / 768 / 1280 Dark | One strip at every width; at 768 the strip is not cut (scrollWidth 664 = width 664); at 375 the "Options are listed…" line runs the full 343 px column. (At 1280 that line is 680 px against a 954 px block above: a reading measure, not the bot’s 375 complaint.) |
| D-126 | AL-COPY-057 | FIXED | D1920, real ratings | Two lines: "chess.com: updated 5 Nov 2026, 06:35. Lichess: updated 5 Nov 2026, 06:35." then "These are the sites’ own numbers. Chess.com updates its public data at most every few minutes." Timestamps agree with the cards ("as of 5 Nov 2026, 06:35"). |
| D-133 | AL-HELP-002 | FIXED | D1280 + 636/445 px | Help opens with a Search Help box and 12 topic chips (no "New:" changelog chips); every topic ends with "↑ Back to the topics"; 77 in-page links all resolve. |
| D-146 | AL-COPY-054 | FIXED | Showcase 1440 Wealth | No "Put it to work on Earn →" nudge on Wealth. |
| D-149 | AL-COPY-054 | STILL OPEN | D1920 fresh, 0 of 6 | The path’s end label "Start here, complete" is still visible at 0 of 6 ("Start here, complete (not reached yet)" in the text). |
| D-150 | AL-COPY-054 | FIXED | D1920 + Showcase | No "Make your money work", "Put your stake to work for a goal" or "Earn with stablecoins" left on Earn. |
| D-152 | AL-CHAIN-DATA-003 | FIXED | 1920 Dark | "No public wallet yet" card is 205 px tall (1146 wide) with "Add wallet →" in the Track Wallet card beside it; not a void. |
| D-153 | AL-COPY-054 | FIXED | Showcase 1440 | No promotional/jargon lines found besides the page slogans ("WEALTH WHERE IT ALREADY WORKS", "Public wealth, privately organized"), which F keeps ("Never change the slogans"). |
| D-154 | AL-CHAIN-DATA-006 | CHANGED | D1920, testnet #119/#116 | Plain explanation added, but the raw lowercase chain string is still printed ("The chain’s own reason proposal did not get enough votes to pass") and no turnout is shown (the card says it cannot be shown for ended proposals). |
| D-159 | AL-HELP-002 | STILL OPEN | 636 and 445 px (≈ zoom 175 % / 250 %), arriving from Today | Topic chips are no longer clipped (14 chips, none overflow), but "← Back to Settings" still shows when Help is opened from the sidebar/Today. |
| D-168 | AL-CHAIN-DATA-003 | FIXED | Showcase 410 Dark | Staking shows the rate (5.44 %) with its source; the Stake section explains why it waits in the Showcase (no dead end). |
| D-169 | AL-COPY-055 | FIXED | D1920 + 375 Dark | Eyebrow reads "You sign every action in your own wallet" (an instruction, not a status); the Real chip is "REAL Real network (real ZIG)" with no 🔒. |
| D-188 | AL-SETTINGS-001 | FIXED | D1440 fresh (Berlin desktop; Professor Showcase) | /app/settings now has the "Open ZIGi" launcher; Ctrl+K after clicking the page opens ZIGi’s panel on Settings, Help and Staking alike; clicking the launcher opens it too. (Light-theme panel title in D-188 not re-checked.) |
| D-193 | AL-CHAIN-DATA-003 | FIXED | 1920 Dark | "No public wallet yet" card is 205 px tall (1146 wide) with "Add wallet →" in the Track Wallet card beside it; not a void. |
| D-216 | AL-HELP-002 | FIXED | D1440 | Every Help → Settings link lands on a heading with the same name ("Settings → ZIGi · Your Personal AI Companion" → "ZIGi · Your Personal AI Companion"; Keep a protected copy; Your pages & buttons; Export everything …). |
| D-218 | AL-SETTINGS-002 | STILL OPEN | D1440 | Name part fixed ("Game layer" only, no "Gamify" chip). Music part not: with "Music player" switched off under Your pages & buttons, the "mini-bar instead of the round button" control is still enabled. |
| D-228 | AL-COPY-057 | REASON CITED, NOT BUILT | D1920 Chess | "Open Play" offers a Lichess board that needs a Lichess sign-in (not used, rules); no built-in opponent ("Not planned: no new dependency"; an engine need not be a dependency, so the reason is partial). D-228’s other parts are fixed: "Open on chess.com" links go to each game (www.chess.com/game/live/…), timestamps and copy split (D-012). |
| D-229 | AL-HELP-002 | FIXED | Showcase 1440 | Help’s "(the Showcase has it on)" is now true: in the Showcase the Game layer switch is on and Journey is in the nav. Settings-path part: see D-216 and BN-165. |
| D-236 | AL-SETTINGS-002 | STILL OPEN | D1920, crypto modules chosen | Settings still shows the Title Case heading "Import Goal Data" (and "Export Goal Data" when old plans exist) among sentence-case headings. |
| D-251 | AL-NAV-006 | FIXED | 375 Dark (mobile emulation) | Tapped all 24 drill-in rows: every row lands on its own anchor at the top (Privacy & storage → #privacy, Chess usernames → #chess …); no row jumped to another section. |
| D-258 | AL-CHAIN-DATA-003 | FIXED | Showcase 375 and 410, Dark | Staking: "Stake, unstake and claim · Exit the Showcase to stake · The Showcase keeps its simulated wallet and signs nothing"; Governance: "Exit the Showcase to vote … the proposals below are ZIGChain’s own, read live". No sideways scroll (375/410). |
| D-259 | AL-COPY-057 | FIXED | D1920, real ratings | Two lines: "chess.com: updated 5 Nov 2026, 06:35. Lichess: updated 5 Nov 2026, 06:35." then "These are the sites’ own numbers. Chess.com updates its public data at most every few minutes." Timestamps agree with the cards ("as of 5 Nov 2026, 06:35"). |

### Berlin — prompts (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| BN:ZIGi #13 | AL-SETTINGS-001 | FIXED | D1440 fresh (Berlin desktop; Professor Showcase) | /app/settings now has the "Open ZIGi" launcher; Ctrl+K after clicking the page opens ZIGi’s panel on Settings, Help and Staking alike; clicking the launcher opens it too. (Light-theme panel title in D-188 not re-checked.) |

### Berlin — competitor items (30)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| C-BN-01 | AL-COMPETITOR-GAP-132 | REASON CITED, NOT BUILT | D1440 Earn | On Earn the validator list has filters (commission at most 5/7.5/10 %) and sorts (Lowest commission, Best uptime, Most voting power …). Not on the Staking page itself: status "already built on Earn". The stake form’s list needs a connected wallet (not used). |
| C-BN-02 | AL-COMPETITOR-GAP-133 | FIXED | D1920 Earn + Staking | The note exists: Earn "rewards are not compounded unless you stake them again"; the Staking calculator "No automatic compounding or guaranteed yield". |
| C-BN-03 | AL-COMPETITOR-GAP-134 | CHANGED | as C-BN-04 | "Waiting to be claimed 1,429.38 ZIG … read 5 Nov 2026, 07:43", "Rewards you claimed here" and "Download rewards as CSV": a history list and a CSV, but no reward-history chart. |
| C-BN-04 | AL-COMPETITOR-GAP-135 | FIXED | D1920, a public delegator address linked read-only (stands in for a Keplr/Leap link; nothing signed) | Earn → "Rewards, unstaking and history" has an "Unbonding calendar" ("Nothing is unstaking right now … the date shows here"). |
| C-BN-05 | AL-COMPETITOR-GAP-136 | REASON CITED, NOT BUILT | — | Status: "Not planned now (Earn’s validator list already sorts by commission/uptime side by side)". Not an F/O decision; no comparison view built. |
| C-BN-06 | AL-COMPETITOR-GAP-137 | REASON CITED, NOT BUILT | code | In-app validator alerts exist (components/staking/validator-health.tsx: jailed / commission notes, shown with a wallet); push alerts: "push off until the owner activates it" (STATUS known limitation, not F/O). |
| C-BN-07 | AL-COMPETITOR-GAP-138 | STILL OPEN | — | Not built; status "Later (competitor, size M)" and the lane itself says the earlier F citation was wrong. No valid reason left. |
| C-BN-08 | AL-COMPETITOR-GAP-139 | FIXED | as C-BN-04 | A "my earnings" view exists for linked wallets: rewards waiting per wallet, rewards claimed here, CSV. |
| C-BN-09 | AL-COMPETITOR-GAP-130 | FIXED | D1440 testnet | Filter "All 20 · Open 1 · Passed 7 · Rejected or failed 12": Rejected shows only REJECTED cards, Passed only PASSED. |
| C-BN-10 | AL-COMPETITOR-GAP-140 | FIXED | D1440 testnet | Search proposals: "119" → #119 only; "upgrade" → #122, #118; "zzzqq" → "No proposal here fits “zzzqq”. Show them all". |
| C-BN-11 | AL-COMPETITOR-GAP-141 | REASON CITED, NOT BUILT | — | No vote-deadline reminder; status says it needs push. An in-app reminder card (the Reminders hub) would not need push, so the reason is partial. |
| C-BN-12 | AL-COMPETITOR-GAP-142 | REASON CITED, NOT BUILT | — | Not built; "the relay has no per-validator vote read" (not an F/O decision). |
| C-BN-13 | AL-COMPETITOR-GAP-143 | CHANGED | D1920 testnet + mainnet (no open proposal on 5 Nov) | No turnout bar. Turnout is a sentence only while a proposal is voting ("Turnout so far: x % of staked ZIG", components/governance/proposal-card.tsx:66, code read); ended proposals say the turnout cannot be shown. |
| C-BN-14 | AL-COMPETITOR-GAP-144 | FIXED | D1440 live DefiLlama + one earlier read kept on this device (2 Nov, seeded) | OroSwap card: "Since 2 Nov 2026: up 16 %, from the reads on this device (2 days), not a full history"; today’s live read stored per project. |
| C-BN-15 | AL-COMPETITOR-GAP-145 | FIXED | D1920 | "Only projects with an audit report listed" → 4 of 18, with "a dated review … not a safety rating". |
| C-BN-16 | AL-COMPETITOR-GAP-146 | FIXED | D1440, tracked wallet with stZIG (relay test double, fictional address) | Valdora card: "Used by you · Wealth shows you hold stZIG, Valdora’s liquid-staking token. Open Wealth →"; no other card claims use. |
| C-BN-17 | AL-COMPETITOR-GAP-147 | CHANGED | D1920 | Sort exists: Directory order / Name, A to Z (Apex, Axelar, Beehive …) / Live projects first. Sort by value locked (TVL) is not built (lane: only 5 of 18 have a read). |
| C-BN-18 | AL-COMPETITOR-GAP-148 | FIXED | D1280 | Status filter: Live 7, Closing or paused 3, Not live yet or listed 8 (of 18). |
| C-BN-19 | AL-COMPETITOR-GAP-149 | FIXED | D1920, hikaru | "Right now 11 wins in a row · longest run of wins here: 14". |
| C-BN-20 | AL-COMPETITOR-GAP-150 | FIXED | D1920, hikaru | "Openings in these games" lists each game’s opening with the result. |
| C-BN-21 | AL-COMPETITOR-GAP-151 | FIXED | Showcase 1440; live Lichess not testable | The Showcase shows "Ratings over time" from history before any game list ("chess.com · Rapid: 30 days, from 6 Oct 2026 (1460) to 4 Nov 2026 (1503)"). For live handles the Lichess rating-history endpoint answered [] for every user from this sandbox (curl too), so a real account’s chart could not be shown here. |
| C-BN-22 | AL-COMPETITOR-GAP-152 | FIXED | D1920 | After the puzzle: "Your puzzle days · Last 30 days: solved on 0 days, finished with the answer shown on 1 day. 5 Nov 2026 · answer shown · rated 1987 · Kept on this device only". |
| C-BN-23 | AL-COMPETITOR-GAP-153 | REASON CITED, NOT BUILT | — | Not built; sweep lane: "Not possible: needs a stored-format change of the strict goal schema". Not an F/O decision. |
| C-BN-24 | AL-COMPETITOR-GAP-131 | REASON CITED, NOT BUILT | D1920 Chess | "Open Play" offers a Lichess board that needs a Lichess sign-in (not used, rules); no built-in opponent ("Not planned: no new dependency"; an engine need not be a dependency, so the reason is partial). D-228’s other parts are fixed: "Open on chess.com" links go to each game (www.chess.com/game/live/…), timestamps and copy split (D-012). |
| C-BN-25 | AL-COMPETITOR-GAP-154 | REASON CITED, NOT BUILT | — | "Not planned (a switch is its own undo; showUndo stays for removals)". Not an F/O decision. |
| C-BN-26 | AL-COMPETITOR-GAP-155 | FIXED | D1280 | Global search "time zone" → "SETTINGS · Time zone · Your app"; Settings sections are indexed. |
| C-BN-29 | AL-COMPETITOR-GAP-156 | OWNER DECISION | — | F: "Languages, units, currency settings: Beta (SE6, D4). Alpha: English UI, USD/EUR." — agreed; dates and numbers already follow the browser language (en-GB here: "5 Nov 2026", "2,838"). |
| C-BN-30 | AL-COMPETITOR-GAP-157 | OWNER DECISION | — | F: "Languages, units, currency settings: Beta (SE6, D4). Alpha: English UI, USD/EUR." — agreed; dates and numbers already follow the browser language (en-GB here: "5 Nov 2026", "2,838"). |
| C-BN-31 | AL-COMPETITOR-GAP-158 | OWNER DECISION | — | F: "Languages, units, currency settings: Beta (SE6, D4). Alpha: English UI, USD/EUR." — agreed; dates and numbers already follow the browser language (en-GB here: "5 Nov 2026", "2,838"). |
| C-BN-32 | AL-COMPETITOR-GAP-159 | REASON CITED, NOT BUILT | — | "Not planned now (screenshots go stale…; Help’s Show me tours point at the real page)". Not an F/O decision. |

### Berlin — copy/UX notes (11)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-BN-01 | AL-COPY-055 | FIXED | D1920 | "Open calculator ▾" is a <summary> disclosure with a ▾ mark, not a link arrow. |
| N-BN-02 | AL-COPY-055 | FIXED | D1920 + 375 Dark | Eyebrow reads "You sign every action in your own wallet" (an instruction, not a status); the Real chip is "REAL Real network (real ZIG)" with no 🔒. |
| N-BN-03 | AL-COPY-055 | FIXED | D1920 + 375 Dark | Eyebrow reads "You sign every action in your own wallet" (an instruction, not a status); the Real chip is "REAL Real network (real ZIG)" with no 🔒. |
| N-BN-04 | AL-COPY-055 | FIXED | D1920 | Track Wallet now says "Rename or remove a tracked wallet below the totals, or in Settings → Wallet & network"; no "Wallet & data" text left on Staking. |
| N-BN-05 | AL-LAYOUT-500-001 | CHANGED | 375 Dark | One topic strip now (no dense double strip), but the Earn page is still 24,092 px tall at 375. |
| N-BN-06 | AL-COPY-054 | STILL OPEN | D1920 fresh, 0 of 6 | The path’s end label "Start here, complete" is still visible at 0 of 6 ("Start here, complete (not reached yet)" in the text). |
| N-BN-07 | AL-COPY-054 | FIXED | D1920 + Showcase | No "Make your money work", "Put your stake to work for a goal" or "Earn with stablecoins" left on Earn. |
| N-BN-08 | AL-COPY-057 | FIXED | D1920, real ratings | Two lines: "chess.com: updated 5 Nov 2026, 06:35. Lichess: updated 5 Nov 2026, 06:35." then "These are the sites’ own numbers. Chess.com updates its public data at most every few minutes." Timestamps agree with the cards ("as of 5 Nov 2026, 06:35"). |
| N-BN-09 | AL-COPY-057 | FIXED | D1920 | After saving, the page keeps a "Change your usernames" link. |
| N-BN-10 | AL-LAYOUT-DESKTOP-015 | STILL OPEN | 1280×800, fresh | Settings is 13,024 px tall at 1280 (16.3 screens); no collapsed groups (the 21 <details> are small disclosures). Lane status: needs the integrator. |
| N-BN-18 | AL-STALE-DATA-001 | FIXED | D1920 | The search field’s hint reads "Name, role or topic", so matching descriptions is stated; "zig" → 11 of 18. |

### Denver — new findings (10)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| DV-045b | AL-A11Y-021 | FIXED | 768 Light, fresh | "Show the evening wrap-up on Today": box at x139, its words at x173 on the same line (22 px box); "Show the Point & tell button" the same. |
| DV-121 | AL-SECURITY-LOCK-002 | FIXED | D1920 | Named "Screen cover with a PIN · It is a screen cover, not a lock on your records"; the lock screen says "A screen cover: it hides ZIGoals in this browser. Your records are not encrypted by it." |
| DV-174 | AL-HELP-004 | FIXED | D1280 | Answers are collapsible questions; each topic ends with "↑ Back to the topics" (23 of them). |
| DV-256 | AL-COPY-056 | CHANGED | 388 Light and Dark, More sheet | Duplicated "the Alpha’s facts" and the un-hinted "Showcase" caption are gone and the theme switch has a "Theme" heading. Still: Dark caption "Light is the day look; Nebula the one you know" (assumes a returning user) and the decorative "YOUR FINANCIAL ORBIT ZIGoals" banner at the sheet foot. |
| DV-261 | AL-COPY-056 | FIXED | 388 Dark and Light | Hero: "Your records live on this device unless you turn on sync. Help & feedback →"; row "Backups & restore — Encrypted backup and copies of each area". |
| DV-262 | AL-COPY-056 | STILL OPEN | 388 Dark and Light (phone list) | On the phone list "Showcase tour — Fictional demo data in separate storage" still sits directly under "Import from other apps" in DATA & PRIVACY; no separate "Try it" group at the bottom (only the desktop card moved). |
| DV-266 | AL-COPY-056 | STILL OPEN | 388 Dark and Light | Still ~24 flat rows in one scroll with no collapse; "Chess usernames" at the same level as Health settings; "Health settings — Your journal and targets" unchanged. (Global search does find Settings sections, see C-BN-26.) |
| DV-267a | AL-COPY-056 | FIXED | 768 Light | Backup & restore: no repeated eyebrow; "Recommended: an encrypted backup (the first card), locked with a recovery secret only you keep. Other options below: …". |
| DV-273 | AL-COPY-056 | CHANGED | 768 Light, fresh | The Showcase card moved to the end of Your app (y 6747 of 6969 px), but "Load Showcase Demo" is still the bright primary button (class primary), not a secondary one. |
| DV-275 | AL-A11Y-021 | FIXED | 1440 fresh (copy) + the lane spec at the bot’s 768 px with one celebrated milestone | Copy: "All three stay on this device only: never synced, and included in Export everything. Erase everything on this device removes them too." (no "erased with your account"). With nothing celebrated the reset is disabled; spec dv-275-extras-reset (passed here) presses it: an in-place "Forget celebrated milestones?" with Keep it / Yes, and Undo after Yes. Checkbox-beside-label part: see DV-045b. |

### Denver — copy/UX notes (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-DV-12 | AL-COPY-056 | STILL OPEN | 388 and 1440 | "Everything you add stays on this device" is gone (now "Your records live on this device unless you turn on sync"), but Settings → Appearance still says "Nebula is the look you know" and the More sheet "Nebula the one you know". |

### Denver re-check + gaps — old ids (2)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| M-061 | AL-SETTINGS-004 | FIXED | D1920 | Hub Bedtime time is 21:30, outside the default 22:00–08:00 quiet hours; Sleep wind-down default is 21:30 in code (components/health/sleep/wind-down.tsx). |
| N-204 | AL-HELP-002 | FIXED | Showcase 1440 | Help’s first-goal path ("In Goals, choose + Create a goal") matches: Goals has the "Create a goal" control. |

### Denver re-check + gaps — competitor items (14)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| C-DVG-67 | AL-COMPETITOR-GAP-132 | REASON CITED, NOT BUILT | D1440 Earn | On Earn the validator list has filters (commission at most 5/7.5/10 %) and sorts (Lowest commission, Best uptime, Most voting power …). Not on the Staking page itself: status "already built on Earn". The stake form’s list needs a connected wallet (not used). |
| C-DVG-68 | AL-COMPETITOR-GAP-135 | CHANGED | as C-BN-04 | Unbonding calendar with ready dates exists; no reminder for the ready date (the bot’s "and reminders"). |
| C-DVG-69 | AL-COMPETITOR-GAP-134 | CHANGED | as C-BN-04 | A rewards CSV exists ("Information only … not a tax statement"); the price on the day was not seen in the section (the claimed list is empty for a wallet that never claimed through ZIGoals). |
| C-DVG-70 | AL-COMPETITOR-GAP-160 | FIXED | D1920 Earn | Liquid staking is covered read-only: Earn’s "Valdora stZIG" section (rate, value locked, the faster way out via OroSwap) and Staking’s "Valdora liquid staking (stZIG) · Read only"; signing happens on Valdora’s site (F: non-custodial). |
| C-DVG-71 | AL-COMPETITOR-GAP-161 | REASON CITED, NOT BUILT | — | Part built (linked read-only wallets of other chains); multisig/hardware not built, "Later (competitor)". |
| C-DVG-72 | AL-COMPETITOR-GAP-133 | OWNER DECISION | code + Earn text | Auto-compound needs a standing grant to restake (lib/staking/grants.ts records it blocked): F "Non-custodial" — agreed. Claim-all exists in the stake panel (components/staking/staking-actions.tsx claim/sweep), reachable only with a connected wallet, which the rules forbid; not signed. |
| C-DVG-81 | AL-COMPETITOR-GAP-162 | FIXED | D1440 | "Screen cover with a PIN" built and working (BN-113); biometric not offered, with the reason on the card ("Face ID and passkeys are not offered: without a …"). |
| C-DVG-82 | AL-COMPETITOR-GAP-156 | OWNER DECISION | — | F: "Languages, units, currency settings: Beta (SE6, D4). Alpha: English UI, USD/EUR." — agreed; dates and numbers already follow the browser language (en-GB here: "5 Nov 2026", "2,838"). |
| C-DVG-84 | AL-COMPETITOR-GAP-163 | FIXED | D1440 | ZIGi has its own switch ("ZIGi button … ZIGi in Apps & extras below 901 px, and ⌘K / Ctrl+K") and "What each page may share" (6 switches); household settings: F "Household/shared goals … not now" — agreed. |
| C-DVG-85 | AL-COMPETITOR-GAP-164 | FIXED | D1440 | Settings → Reminders has per-kind times and Quiet hours (22:00–08:00, editable); Notifications has its type switches. |
| C-DVG-86 | AL-COMPETITOR-GAP-155 | FIXED | D1280 | Global search "time zone" → "SETTINGS · Time zone · Your app"; Settings sections are indexed. |
| C-DVG-87 | AL-COMPETITOR-GAP-165 | FIXED | D1920 Help | Every Help topic shows "Last updated …" (e.g. "Last updated Nov 4, 2026", "Nov 1, 2026 or earlier"); Help has its own search. |
| C-DVG-88 | AL-COMPETITOR-GAP-166 | OWNER DECISION | — | F: "anything needing a ZIGoals server for people’s data: not now" — a public vote board with accounts needs one; agreed. |
| C-DVG-89 | AL-COMPETITOR-GAP-167 | FIXED | D1440 | Settings "Show the welcome again — Set up a first goal and habit", the Showcase tour card, and Help’s tours. |

### Lisbon (+Lisbon-AI) — new findings (4)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| LS-005 | AL-SEARCH-005 | FIXED | 1280 fresh, tasks added on /app/tasks | "/" + "plumber" → "TASKS · Call plumber · Task · today · Inbox"; "milk" → Buy milk; "Book the dentist" found by "#work". |
| LS-015 | AL-SETTINGS-007 | FIXED | 1920 fresh; Today, Health, Wealth, Tasks, Settings | /api/push is called only on Health and Settings and answers 200; no red console errors on any page loaded. |
| LS-047 | AL-SEARCH-005 | FIXED | 1280 fresh | "p1" → "Tasks matching p1: Buy milk"; "milk & today" → "Tasks matching milk & today: Buy milk"; "#work" → "Tasks matching #work: Book the dentist". (Todoist’s literal "priority:high" / "due:today" spellings are not the app’s syntax; p1 / today are.) |
| LS-H47 | AL-SEARCH-005 | STILL OPEN | 1280 fresh, tasks L11/L12 added | Search part fixed: "L1" → TASKS L11, L12; Enter opens /app/tasks?task=…. Still: with words typed, one Escape only clears the search field (type=search); the palette stays open and needs a second Escape (seen after every one of 8 queries). |

### Lisbon (+Lisbon-AI) — competitor items (2)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| C-LS-11 | AL-SEARCH-005 | FIXED | 1280 fresh, tasks added on /app/tasks | "/" + "plumber" → "TASKS · Call plumber · Task · today · Inbox"; "milk" → Buy milk; "Book the dentist" found by "#work". |
| C-LS-12 | AL-SEARCH-005 | FIXED | 1280 fresh | "p1" → "Tasks matching p1: Buy milk"; "milk & today" → "Tasks matching milk & today: Buy milk"; "#work" → "Tasks matching #work: Book the dentist". (Todoist’s literal "priority:high" / "due:today" spellings are not the app’s syntax; p1 / today are.) |

### Moscow — new findings (3)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| MO-038 | AL-SETTINGS-004 | FIXED | D1920, Settings → Reminders | No "device key" sentence; "Water also has its time in Health → Diary’s Water card: it is the same reminder"; Sleep wind-down and Meditation listed under "Set on their own pages" with links. |
| MO-047 | AL-SETTINGS-007 | FIXED | 1920 fresh; Today, Health, Wealth, Tasks, Settings | /api/push is called only on Health and Settings and answers 200; no red console errors on any page loaded. |
| MO-103 | AL-SETTINGS-004 | FIXED | D1920 | The water reminder is findable from the Reminders hub (Habit reminders → Water) and the Diary card is named as the same reminder. |

### Moscow — old ids (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| M-062 | AL-SETTINGS-004 | FIXED | D1920, Settings → Reminders | No "device key" sentence; "Water also has its time in Health → Diary’s Water card: it is the same reminder"; Sleep wind-down and Meditation listed under "Set on their own pages" with links. |

### Moscow — copy/UX notes (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-MO-34 | AL-SETTINGS-007 | FIXED | 1920 fresh; Today, Health, Wealth, Tasks, Settings | /api/push is called only on Health and Settings and answers 200; no red console errors on any page loaded. |

### Nairobi — new findings (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| NB-029 | AL-COPY-056 | CHANGED | D1440 fresh | The Showcase card is now last in Your app under a "TRY IT" eyebrow, but its words still say "Showcase uses separate storage in this tab" (the jargon Nairobi flagged) and the button is still the bright primary one. |

### Nairobi — old ids (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-002 | AL-COPY-056 | CHANGED | D1440 fresh | The Showcase card is now last in Your app under a "TRY IT" eyebrow, but its words still say "Showcase uses separate storage in this tab" (the jargon Nairobi flagged) and the button is still the bright primary one. |

### Nairobi — copy/UX notes (2)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-NB-15 | AL-COPY-056 | STILL OPEN | Showcase 1440 vs fresh | The Showcase nav has 16 entries (Earn, Markets, Staking, Portfolio, Ecosystem, Chess, Journey …) against 9 on a fresh device, and neither the Settings card nor the page tells a demo user that their own app starts smaller (lane: request only). |
| N-NB-16 | AL-HELP-002 | FIXED | D1920 | Settings → Your app has an APPEARANCE section (#appearance), as Help says; Help also names the phone row "Motion & display". |

### Professor + §3/§4 — new findings (18)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| PR-009 | AL-TIMEZONE-003 | STILL OPEN | Showcase, 1440, page clock 4 Nov 2026 05:20 Brussels (before 07:00, as Professor) | Chess at 05:20 shows ratings "as of 4 Nov 2026, 07:00", "chess.com: updated 4 Nov 2026, 09:00", and games dated "4 Nov 2026, 08:00 / 09:00": all later than now. The seed times are still fixed hours of today. |
| PR-035 | AL-SETTINGS-005 | NOT REPLAYED | Showcase 1920 and 1440 (two attempts) + code | The cost-cap fields (Settings → ZIGi → Advanced → Usage, NOVA → Cost meter) only appear once ZIGi is connected to a model; no model or key exists in this sandbox, so neither the pointer nor the currency selector could be reached. Code: the NOVA pointer now names "Settings → ZIGi → Advanced → Usage on this device" with a link to #zigi-usage (components/nova/panels/cost-panel.tsx:23). |
| PR-036 | AL-STALE-DATA-001 | FIXED | Showcase + fresh | Zignaly: "The last day to request a Private Credit withdrawal was 1 November 2026 (passed)". |
| PR-037 | AL-CHAIN-DATA-007 | FIXED | Showcase + fresh | Valdora: "$75.1 million … DefiLlama’s total for Valdora as a whole … It can count more than stZIG (such as the USDC vaults), so it need not match stZIG in circulation × the rate (about 177.8m ZIG from the contract, read now)." |
| PR-038 | AL-STALE-DATA-001 | FIXED | Showcase + fresh | Each dated notice reads "(… read 18 Oct 2026) · a dated notice, its dates worded from today; not a live figure". |
| PR-040 | AL-CHAIN-DATA-008 | FIXED | fresh live + Showcase | Native staking: "Commission validators charge now 5 % to 10 %" (not "unavailable"). |
| PR-042 | AL-SETTINGS-001 | FIXED | D1440 fresh (Berlin desktop; Professor Showcase) | /app/settings now has the "Open ZIGi" launcher; Ctrl+K after clicking the page opens ZIGi’s panel on Settings, Help and Staking alike; clicking the launcher opens it too. (Light-theme panel title in D-188 not re-checked.) |
| PR-054 | AL-SETTINGS-007 | NOT REPRODUCIBLE AS WRITTEN | fresh + Showcase, /app/wealth first loads online (4 loads) | Professor saw one transient "Offline · ZIGoals" 503 on a first Wealth load, retry fine. No offline page on any Wealth load in this replay (production build, service workers allowed by default in my contexts); the AL row’s SW part not otherwise testable without the deployed worker. |
| PR-073 | AL-SETTINGS-006 | OWNER DECISION | — | F: "Languages, units, currency settings: Beta (SE6, D4). Alpha: English UI, USD/EUR." — agreed; dates and numbers already follow the browser language (en-GB here: "5 Nov 2026", "2,838"). |
| PR-079 | AL-STALE-DATA-002 | FIXED | Showcase 1440 (clock 4 Nov) | Staking: "ZIG reward reserve 300,000 ZIG … Stale snapshot · 1 Nov 2026, 00:00 · refresh …": the old date is labelled as a stale snapshot. |
| PR-080 | AL-COUNTS-011 | FIXED | Showcase 1440 | Footer: "Observed public positions 0" (no wallet) and "Positions entered by hand (all of Wealth) 13": both now match what they name. |
| PR-087 | AL-SETTINGS-007 | FIXED | 1920 fresh; Today, Health, Wealth, Tasks, Settings | /api/push is called only on Health and Settings and answers 200; no red console errors on any page loaded. |
| PR-102 | AL-SEARCH-005 | FIXED | 1280 fresh, tasks added on /app/tasks | "/" + "plumber" → "TASKS · Call plumber · Task · today · Inbox"; "milk" → Buy milk; "Book the dentist" found by "#work". |
| PR-108 | AL-TIMEZONE-003 | STILL OPEN | Showcase, 1440, page clock 4 Nov 2026 05:20 Brussels (before 07:00, as Professor) | Chess at 05:20 shows ratings "as of 4 Nov 2026, 07:00", "chess.com: updated 4 Nov 2026, 09:00", and games dated "4 Nov 2026, 08:00 / 09:00": all later than now. The seed times are still fixed hours of today. |
| PR-109 | AL-NAV-008 | FIXED | D1920 (Professor ran the Showcase; same frames) | Daily puzzle / Lichess puzzle / Lichess TV dialogs each say "Blank? <site> may refuse to show inside another app. Open … in a new tab ↗"; Play says "If your browser blocks that window, open it in a new tab: chess.com ↗ · Lichess ↗". |
| PR-110 | AL-COPY-058 | FIXED | Showcase 1440 | Under the habit dropdown: "Not changeable in the Showcase: its games are fictional, so they tick no habit. Return to your own data to choose one." |
| PR-111 | AL-CRASH-003 | FIXED | 1280 fresh (Professor: Showcase, memory pressure) | Typed a 56-character query at 5 ms a key: 838 ms, JS heap 33 MB, no crash; results follow a deferred query. |
| PR-112 | AL-SEARCH-005 | FIXED | 1280 fresh | "Valdora" → "ECOSYSTEM PROJECTS · Valdora · Ecosystem · Staking & vaults · research only" and Earn. |

### Professor + §3/§4 — old ids (2)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| BUG-037 | AL-TIMEZONE-003 | STILL OPEN | Showcase, 1440, page clock 4 Nov 2026 05:20 Brussels (before 07:00, as Professor) | Chess at 05:20 shows ratings "as of 4 Nov 2026, 07:00", "chess.com: updated 4 Nov 2026, 09:00", and games dated "4 Nov 2026, 08:00 / 09:00": all later than now. The seed times are still fixed hours of today. |
| BUG-041 | AL-COUNTS-011 | FIXED | Showcase 1440 | Footer: "Observed public positions 0" (no wallet) and "Positions entered by hand (all of Wealth) 13": both now match what they name. |

### Professor + §3/§4 — copy/UX notes (1)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-PR-05 | AL-SETTINGS-007 | STILL OPEN | 1920 fresh, every page | Every page load still warns "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'" (the enterprise on-device-model line is environment). |

### Tokyo — new findings (2)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| TK-165 | AL-LAYOUT-768-002 | FIXED | 768 Light, fresh | "Show the evening wrap-up on Today": box at x139, its words at x173 on the same line (22 px box); "Show the Point & tell button" the same. |
| TK-184 | AL-LAYOUT-768-002 | STILL OPEN | 768×900 Light, fresh | The wrap-up checkbox now sits beside its label (22 px) and Load Showcase Demo moved to the end of Your app, but the sticky section chip row ("settings-sections") is still 134 px tall at 768. |

## Keep-list rows in this lane (positives → regression guards)

| ids | verdict | conditions | evidence |
|---|---|---|---|
| BN-002, BN-094, BN-176 | HOLDS | D1920 + 375 Dark | See the row above: Practice default, "This is real money" + "I understand", choice shared Staking↔Governance and kept. |
| BN-007, BN-032, BN-159 | HOLDS | D1920 live | Every Earn figure carries "ZIGChain’s official mainnet server · block N · as of … UTC"; "Information, not advice", "Nothing here is advice or a promise of returns", "a check, not a promise"; 5.45 % before commission on Staking and Earn, 5.17 % at 5 %, 21 days, 409 million staked. |
| BN-009 | HOLDS | D1920 | "None is open for voting right now" with node, block and time on both networks. |
| BN-028, BN-095, BN-096, BN-170–172 | HOLDS | D1440 | val 3, VALDORA 1, spaces 18, zzzz / markup / .* / ö 0 ("No projects match"), oro 1; categories 2+2+6+3+3+2 = 18; 234 outside links, all https with noopener; no script ran. |
| BN-036, BN-048, BN-070 (part) | L7 | — | NOVA/ZIGi failure states and the composer belong to L7; not replayed here. |
| BN-077, BN-124 | HOLDS (sampled) | 375/410/768/1280, Dark/Light | No sideways scroll where measured: Earn 375/768/1280, Staking and Governance 375/410 (Showcase), Settings 388/768; full 7-page × 3-theme sweep not repeated. |
| BN-099, BN-120 | HOLDS | D1920 real handles | Ratings, recent games and the Lichess daily puzzle all work (see the chess rows). |
| BN-102 (part), BN-029 (part) | HOLDS | D1440 | "“Mars/Olympus” is not a time zone name. Pick one from the list, for example Europe/Brussels." |
| BN-119, BN-162, BN-173 | HOLDS | D1440 | Account section honest ("not configured", API answers configured:false); Earn off hides it from the nav and /app/earn still opens; exactly 2 "Open app" links. |
| BN-158 | HOLDS | D1440 | Earn switch back on → Earn in the nav with live numbers. |
| B-010, B-048, B-053, B-112, B-174, B-176, L-018, L-056, T-076, T-083, T-108, D-061, ZIGi-F5, L-052 | NOT REPLAYED (guard list) | — | A list of old ids the bot saw fixed, with the guard "keep their existing tests"; not re-run one by one. D-002/D-152/D-193 from the same list were re-checked (FIXED above). |
| PR §3 Berlin L153 | HOLDS | D1920 | Staking and Earn show the same live figures from one read (5.45 % before commission, block 13515348, 04:47 UTC on both). |
| BN-022, BN-105 (part) | HOLDS | D1440 fresh | "erase" keeps the button disabled, "ERASE" arms it (red "danger is-armed"); result "Erased 10 records and 23 stores from this browser. Open ZIGoals fresh now: this page still shows what it had in memory." |
| BN-163, BN-164 | HOLDS | D1280 | Odd searches safe; 300 characters now said to be cut to 80; all in-page #help links resolve (see e3). |
| DV-021d | L4 | — | Goals Pin/Lock editing: L4’s lane. |
| DV-075p | HOLDS | D1440 | Goals page data: "each goal’s name, target, progress and next planned date; never account, wallet or chain details". |
| DV-121 (copy) | HOLDS | D1920 | Lock screen: "A screen cover … Your records are not encrypted by it" and Forgot the PIN offers the wait or a typed ERASE. |
| LS-P15 | INT | — | Encrypted backup / restore: integrator’s lane. |
| MO B3 P11–P12 | HOLDS | D1280 Help | "those subscriptions have no connection a browser app may use…"; "ChatGPT, Claude, Gemini and Grok subscriptions don’t include access for other apps"; no popups or locks met. |
| NB-084/085 | L3 | — | First-run Today: L3’s lane. |
| NB-094/095/096 | HOLDS | D1920 | Settings first click navigates (BN-014), start page falls back and is named (BN-016/T-132), page switches change the nav at once (BN-186). |
| TK-045 | L1 | — | Markets view search: L1’s lane. |

## STILL OPEN and CHANGED, with exact steps (for the lane)

1. **BN-004 / B-005 / B-022 (AL-CHAIN-DATA-001), STILL OPEN.** Fresh device, crypto chosen, 1920. Staking, Practice chosen (default), no tracked wallet → "Positions & allocations zigchain-1": "Native staking · yearly rate before a validator’s commission 5.45 % · ZIGChain’s official mainnet server". No "mainnet only — not the practice network" tag; it appears only once a wallet is tracked ("These totals are your real ZIGChain mainnet wallet").
2. **PR-108 / PR-009 / BUG-037 (AL-TIMEZONE-003), STILL OPEN.** Showcase at 05:20 Brussels (any time before 07:00) → Chess: ratings "as of 07:00", "updated 09:00", games "08:00 / 09:00" today, all in the future. Seed times in `lib/skills/chess/showcase.ts` are fixed hours of today (lane: request, not done).
3. **BN-001 (AL-NAV-007), STILL OPEN.** 375 Dark, fresh: Today, Wealth and the More sheet have no entry to Earn/Staking/Governance/Ecosystem/Chess or to Your pages & buttons.
4. **D-149 / N-BN-06 (AL-COPY-054), STILL OPEN.** Earn at 0 of 6: the path still ends with the visible label "Start here, complete" ("(not reached yet)").
5. **BN-030 / D-060 / D-099 (AL-COPY-054), CHANGED.** The guide still runs Get a wallet → Practice → Bring money in (Add money, Get ZIG) → Staking on the real network → "Ready to stake? Go to Staking"; only renamed and given a "nothing here says you should buy or stake" line.
6. **D-088 / N-BN-10 (AL-LAYOUT-DESKTOP-015), STILL OPEN.** Settings at 1280×800 is 13,024 px (16 screens); no collapsed groups.
7. **TK-184 (AL-LAYOUT-768-002), STILL OPEN.** Settings at 768: the sticky section chip row is 134 px tall.
8. **DV-262 / DV-266 (AL-COPY-056), STILL OPEN.** Phone Settings list (388): "Showcase tour" still sits under "Import from other apps" in Data & privacy; ~24 flat rows, no collapse; "Chess usernames" beside Health settings; "Health settings — Your journal and targets".
9. **N-DV-12 (AL-COPY-056), STILL OPEN** and **DV-256, CHANGED.** "Nebula is the look you know" (Settings → Appearance) and "Nebula the one you know" (More sheet, Dark) still assume a returning user; the More sheet still ends in the decorative "YOUR FINANCIAL ORBIT" banner.
10. **NB-029 / N-002 (CHANGED), DV-273 (CHANGED), N-NB-15 (STILL OPEN), AL-COPY-056.** The Showcase card moved to the end of Your app ("TRY IT"), but it is still the bright primary button and still says "Showcase uses separate storage in this tab"; nothing tells a demo user their own nav starts smaller (16 entries vs 9).
11. **D-236 (STILL OPEN), D-062 / D-005 (CHANGED), AL-SETTINGS-002.** Crypto chosen → Settings shows the Title Case heading "Import Goal Data" (`app/app/settings/page.tsx:179`, and "Export Goal Data" at :157 when old plans exist). The Data & privacy tab is still ~5,800 characters with three near-identical module backup blocks.
12. **D-218 (AL-SETTINGS-002), STILL OPEN.** Settings → Your pages & buttons → Music player off → the "mini-bar instead of the round button" control stays enabled.
13. **N-PR-05 (AL-SETTINGS-007), STILL OPEN.** Every page load warns "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'".
14. **LS-H47 (AL-SEARCH-005), STILL OPEN (polish part).** "/" → type any words → Escape: the first Escape only clears the field (type=search); a second Escape closes the palette.
15. **BN-165 / B-193 / BN-024 / D-091 (AL-HELP-002), CHANGED.** Help → "Your recovery secret": "Lost a device? Revoke it under Settings → Devices and sessions, then rotate the vault key (Settings → Rotate vault encryption)", with no "only with an account"; those controls do not exist on this installation (the caveat is only in "Your data and sync").
16. **B-109 / B-202 (AL-HELP-002), STILL OPEN.** Help: "in the Showcase … Daily Habits and “Your next goal action” stand aside"; the Showcase Today shows a "Daily Habits" card beside "Next step".
17. **D-159 (AL-HELP-002), STILL OPEN.** Open Help from Today or the sidebar (636 or 445 px): "← Back to Settings" still shows. (The chips are no longer clipped.)
18. **BN-027 / B-122 (AL-STALE-DATA-001), CHANGED.** Ecosystem header "Sources last read 4 Nov 2026" while the cards’ DefiLlama reads say "read 5 Nov 2026, 07:07": the header is not the newest read.
19. **BN-008 / D-014 (AL-CHAIN-DATA-005), CHANGED.** Testnet Governance: 12 of 20 proposals tagged "Looks like a test or template" but still listed in full with template bodies; no collapsed "Test proposals" group.
20. **L-043 / D-154 (AL-CHAIN-DATA-006), CHANGED.** #119 / #116: the raw lowercase "proposal did not get enough votes to pass" is still printed (as "The chain’s own reason"); no turnout for ended proposals.
21. **BN-003 (AL-LAYOUT-375-009), CHANGED.** 375 Dark, Governance → Real network: buttons no longer clipped, but each is about 140 px tall and the "I understand" checkbox sits centred above its label (screenshot `bn003-real-dialog-375-dark.png`).
22. **D-085 (AL-COPY-057), CHANGED.** Chess "Ratings over time": the chart and its summary use "1460 … 1503" next to cards that say "1,503".
23. **N-BN-05 (AL-LAYOUT-500-001), CHANGED.** One topic strip now, but Earn is still 24,092 px tall at 375.
24. **Competitor rows:** C-BN-07 STILL OPEN (no comparison table, no valid reason left). CHANGED: C-BN-13 (turnout only as a sentence while voting, no bar), C-BN-17 (no sort by value locked), C-BN-03 / C-DVG-69 (history list + CSV, no chart, no price on the day), C-DVG-68 (no reminder for the unbonding date).

## Notes

- NOT REPLAYED: **PR-035** only (needs ZIGi connected to a model; no model or key here). The cost-panel pointer was checked in code.
- The status file’s "Needs-other-lane" rows that are now fixed in the app (P-BN-34 switches’ side effects, P-BN-35 phone rows, P-BN-02 ZIGi on Settings) were judged on the screen, not on the status.
- Spec failure outside the L6 ids: `tests/grok53/settings/help-al-006-la-31.spec.ts:28` (What’s new links 20 px tall, < 44 px).
