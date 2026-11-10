# Grok #53 replay — lane L6 (Staking, Earn, Governance, Ecosystem, Chess, Settings, Help, Search), round 2

- **Commit served:** `37d2370c` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, from `/home/user/zig-branch2`) on http://127.0.0.1:3103. It was answering, so it was not restarted. The commits after `37d2370c` change only ZIGi/NOVA, tests, docs and the HUD shimmer. None of them is in this build.
- **Date:** 8 Nov 2026, about 15:50–17:15 Brussels (14:50–16:15 UTC).
- **Replayed by:** a fresh replay agent. It made no fixes, changed no app or test code and made no git writes.
- **Scope:** the 62 rows of the L6 replay list (AL row, id, latest verdict).
  - The list splits two cells across lines: "N-BN-05 (+ also closes: BN-123)" (AL-LAYOUT-500-001) and "C-BN-24 (+ also closes: D-228)" (AL-COMPETITOR-GAP-131). Each half is replayed as its own id: N-BN-05, BN-123, C-BN-24 and D-228.
  - For each id, only its own block was read: in the bot files (`grok-2026-11-04/*.md`) and in `docs/review/session-al/ledger/*.md`.
  - The round-1 file `GROK53_REPLAY_L6_1.md` (on `c521574f`) was read for its method header and each id's row.
  - The lane file `lanes/L6.md` was read only for "Fourth pass", its requests, and "SET-FOLD", to see what it claims Fixed.
- **Method** (same as round 1):
  - Playwright from zig-branch2, headless, one browser and one worker. Chrome channel `chrome`; in this sandbox it is the preinstalled Chromium.
  - Every run went through `flock -o /tmp/claude-0/zig-browser.lock`.
  - `locale: en-GB`, `timezoneId: Europe/Brussels`.
  - Clock:
    - The Showcase chess rows (PR-009, PR-108, BUG-037, D-085 Showcase) ran with `page.clock.install` set to 4 Nov 2026 05:20 Brussels, as Professor did.
    - All other rows ran on the real clock, as in round 1, because their data is read live.
  - Scripts and logs are in `/tmp/claude-0/replay-L6-2/` and are not committed.
- **Conditions** (codes as round 1):
  - **D1920 / D1440 / D1280** = desktop at that width, Nebula, a fresh empty context with the Welcome marked seen.
  - **crypto chosen** = the record Settings → Earn writes (`zigoals:earn-prefs:v1 pageShown`).
  - **375 / 388 / 445 / 636 / 768** = viewport width. 375 and 388 use mobile emulation; 445 and 636 do not (they stand for zoom 250 % and 175 %).
  - **Light / Dark** = the theme record. **Showcase** = Settings → Load Showcase Demo.
- **Live data:**
  - The server's own chain reads worked from this sandbox: api.zigchain.com and testnet-api.zigchain.com (governance at testnet block 8611551, staking rate and validators at mainnet block about 13607865). Its DefiLlama reads worked too. So chain-read rows use live answers.
  - **CoinGecko is throttled from this sandbox.** `/api/market-history` answered "Market history is unavailable", so C-DVG-69's price could not be read live. The row cites a separate cause that this sandbox does not explain (see C-DVG-69).
  - chess.com and Lichess **GET**s were fetched with curl and handed to the page, as in round 1: `hikaru` and `DrNykterstein`, all answered 200.
- **Test doubles (named in their rows):**
  - **C-BN-03 / C-DVG-69:** three confirmed claim records were seeded into `zigoals:staking-journal:v1` (12.5 ZIG, 4 ZIG, and one sweep with no amount). They stand in for claims signed through ZIGoals. Nothing was signed.
  - **C-DVG-68:** a real public mainnet delegator with live unbonding entries was tracked read-only: `zig1xjhk3wur39l2fmaj50u3awxjfqldrmguz80tdj`, found through the public LCD.
- **Safety:** nothing was signed, no wallet was connected and nobody signed in to Lichess. The real-network dialog was opened only far enough to measure it, then closed with "Not now".
- **Caveats:**
  - The lane specs (`tests/grok53/chain|settings/l6-fourth-*.spec.ts`, sweep4 specs, `d-088-settings-fold.spec.ts`) were not run. All verdicts come from the replays.
  - The "round 1 verdict" column uses this lane's round-1 file. The list's "latest verdict" differs for some ids, given in their rows:
    - OTHER for MO-038, MO-103, M-062, MO-047, N-MO-34, N-NB-16, NB-029 and N-NB-15.
    - UNSEEN for N-BN-05, BN-123, C-BN-24 and D-228.
    - CHANGED for TK-184.
  - BN-123 has no round-1 row (it shows "—"). Only its item #4 belongs to AL-LAYOUT-500-001 (ledger P-BN-48 "BN-123 #4"), so only #4 was replayed.
  - **Owner decisions:** none were accepted this round. N-PR-05 is kept "by design" in INT.md row P-LS-65. That is a lane or INT reason, not AL_SCOPE F or an ADR-037 O-row, so it stays STILL OPEN.

## Totals (counted per list row)

| verdict | rows |
|---|---|
| FIXED | 54 |
| HOLDS | 0 |
| STILL OPEN | 3 |
| CHANGED | 4 |
| OWNER DECISION | 0 |
| NOT REPLAYED | 1 |
| **total** | **62** |

## Findings

### AL-CHAIN-DATA-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-004 | AL-CHAIN-DATA-001 | STILL OPEN | FIXED | D1920, crypto chosen, Practice (the default), no wallet, live mainnet read | Staking says "Chosen network: Practice network (no real value) · ZIGChain Testnet (zig-test-2)". The preview card's figure label now reads "Native staking on the real network (mainnet only) · yearly rate before a validator’s commission" (5.45 %, "ZIGChain’s official mainnet server · block 13607865"). Under it, the note: "Mainnet only: these figures are the real ZIGChain network’s, read only. Staking below is set to the practice network, which has no real value and its own rate." |
| B-005 | AL-CHAIN-DATA-001 | STILL OPEN | FIXED | as BN-004 | The same card and note: the mainnet rate under a Practice choice is now tagged "mainnet only" with no wallet tracked. |
| B-022 | AL-CHAIN-DATA-001 | STILL OPEN | FIXED | as BN-004 | As BN-004. Practice is still the default, and the mainnet figure says it is the mainnet's. |

### AL-CHAIN-DATA-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-014 | AL-CHAIN-DATA-003 | CHANGED | FIXED | D1920, crypto chosen, Governance, Practice (testnet, 20 proposals live) | The clutter part:<br>• 8 cards in the main list.<br>• One closed group, "12 ended proposals that look like tests or templates", with the line "Their titles read like tests or unfilled templates…". Typing "test" in Search proposals opens it.<br>• The full quorum explanation appears once (the other cards carry only "quorum 33.4%" in their turnout line).<br>• One tagged card stays in the main list: #123 "test evg". It is "Collecting its deposit (no voting yet)", so it is not ended, and only ended ones fold (by design). |
| D-154 | AL-CHAIN-DATA-003 | CHANGED | FIXED | D1920, testnet, ended proposals | The reason is a sentence: "Why it ended this way · It did not get enough votes to pass: too few of all staked ZIG voted (the quorum), or Yes did not reach the share it needed." The raw lowercase chain string is gone (0 matches). Turnout now shows on ended proposals as a labelled estimate, e.g. "Turnout about 73.2% of the ZIG staked today (an estimate: the chain does not keep the staked total from when voting ended) · quorum 33.4%". |

### AL-COPY-054

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-030 | AL-COPY-054 | CHANGED | FIXED | D1920 crypto chosen, and Showcase D1920 | Earn → Start here:<br>• Lede: "Two steps to learn it safely (a wallet and a practice round…), then four optional ones, only if you choose real ZIG … Practising is enough, and nothing here tells you to buy or stake."<br>• Progress line: "Six steps · none done yet · next: Get a wallet".<br>• Orbits 2 and 3 are "Only if you choose real ZIG" and "The real network, if you choose", each counted "Optional". "Add money" reads "Optional · real money".<br>• No primary button inside Start here (0). "Ready to stake? Go to Staking" is gone.<br>The Showcase shows the same. |
| D-060 | AL-COPY-054 | CHANGED | FIXED | as BN-030 | As BN-030: the path is a guide that ends with practice. Its real-ZIG steps are optional and never "next", and it has no buy or stake button. |
| D-099 | AL-COPY-054 | CHANGED | FIXED | as BN-030 | As BN-030: "From no wallet to your first stake" is no longer a funnel. The last orbit is "The real network, if you choose". |
| D-149 | AL-COPY-054 | STILL OPEN | FIXED | D1920 fresh, 0 of 6 | The path's end now reads "End of the guide (not reached yet)". "Start here, complete" is gone. |
| N-BN-06 | AL-COPY-054 | STILL OPEN | FIXED | as D-149 | As D-149. |

### AL-HELP-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-024 | AL-HELP-002 | CHANGED | FIXED | D1280 Help, accounts not configured on this build | The caveat "Only where accounts are switched on … the account controls named on this page (Devices and sessions, Rotate vault encryption, Remember or Forget this device, Choose what joins your account) do not show" is still there. The one part left in round 1, the recovery-secret answer, is now conditional (see BN-165). |
| BN-165 | AL-HELP-002 | CHANGED | FIXED | D1280 Help | "Your recovery secret" now reads:<br>• "Lost a device? **With an account only:** revoke it under Settings → Devices and sessions, then rotate the vault key … Without an account there is nothing to revoke: your records were only on that device, so a backup file is what brings them back."<br>• "Lost the secret, but a device still opens your account? **With an account only:** …"<br>The other mentions sit inside the "Only where accounts are switched on" caveat or say "(where accounts are switched on)". |
| B-193 | AL-HELP-002 | CHANGED | FIXED | as BN-165 | As BN-165. |
| D-091 | AL-HELP-002 | CHANGED | FIXED | D1280 Help | Search, the topic index and collapsible answers (230 `<details>`) are kept. The one contradiction round 1 found (the recovery-secret paths) is now conditional. No "← Back to Settings" on arrival from the sidebar. |
| B-202 | AL-HELP-002 | NOT REPLAYED | FIXED | Showcase D1440, Today never arranged | The Showcase Today has one "Daily Habits" card: the habits widget, "Your daily cadence · 4 of 7 complete today …". The other headings are "Your daily rhythm" (life overview), "Your daily balance." (Health) and "Habit check-ins" (inside the 7-day orbit card, a count of records, not a habit list). Help → "Why does Today show fewer cards?" now says: "in the Showcase … today’s habits show in one card named Daily Habits, your habits widget, and the second, built-in copy of that list stands aside". That matches the screen. |
| B-109 | AL-HELP-002 | STILL OPEN | FIXED | as B-202 | As B-202. |
| D-159 | AL-HELP-002 | STILL OPEN | FIXED | 636 and 445 px (no mobile emulation), from Today and from Settings | **636:** Today → the visible Help link → Help. The only Settings link is the nav item "Settings" (NAV.app-nav), and there is no "← Back to Settings". Settings → "Help & feedback →" → Help shows "← Back to Settings".<br>**445:** Today → More → Help: no Settings link at all. From Settings: "← Back to Settings" is there.<br>Topic chips: 0 overflowing at either width. |
| N-NB-16 | AL-HELP-002 | FIXED | FIXED | D1920 fresh (list: OTHER) | Settings has `#appearance` in Your app. Help says "Settings → Your app → Appearance (on a phone, the Settings row “Motion & display”)", and the phone list has "Motion & display — Follow device preference, or Off". |

### AL-LAYOUT-DESKTOP-015

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-088 | AL-LAYOUT-DESKTOP-015 | STILL OPEN | CHANGED | 1280×800 fresh | **New:** each of the six groups folds from its heading, and "Fold all" sits at the end of the sticky index. After Fold all the page is 2,695 px (3.4 screens). Each folded group shows a one-line summary, e.g. "YOUR AREAS Habits, Health targets, chess, Guide, install, notifications, reminders and market data". `/app/settings#settings-zigi` opens only "Your assistant".<br>**Still:** every group is open by default (6/6 `aria-expanded=true`), so Settings still arrives at 13,049 px (16.3 screens), the same as round 1.<br>Where the confirmations appear (the bot's second part) was not re-checked. |
| N-BN-10 | AL-LAYOUT-DESKTOP-015 | STILL OPEN | CHANGED | as D-088 | As D-088: the page can be folded to 3.4 screens but still opens at 16.3. |

### AL-SEARCH-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-H47 | AL-SEARCH-005 | STILL OPEN | FIXED | D1280 fresh, tasks L11 and L12 added in Tasks | "/" opened search for each of 4 queries ("L1" → TASKS L11, L12; "plumber"; "Valdora"; "time zone" → SETTINGS Time zone). After typing, **one** Escape closed the palette in 4 of 4 cases. |

### AL-SETTINGS-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-218 | AL-SETTINGS-002 | STILL OPEN | FIXED | D1440 fresh | "Music player" switch off (default): the "mini-bar" checkbox is **disabled** and described by "Turn the Music player on under Your pages & buttons to choose this." |
| D-062 | AL-SETTINGS-002 | CHANGED | FIXED | D1920 crypto chosen | The Title Case heading is now "Import goal data". No Settings h2/h3 with two or more Title-Case words is left, apart from proper names. Denver's other exact 10-21 texts are not in the report, as in round 1. |
| D-236 | AL-SETTINGS-002 | STILL OPEN | FIXED | D1920 crypto chosen | The heading reads "Import goal data". "Export goal data" is sentence case in the code (shown only when old plans exist; none here). |
| D-005 | AL-SETTINGS-002 | CHANGED | CHANGED | D1440 fresh | **New:** the Data & privacy group folds like the others, with the summary "Your data, backups, export everything, import from other apps and erase everything".<br>**Still:** open (the default), it holds about 8,100 characters (`settings-data` textContent 8,094), with the module backups as separate cards (Goals and Wealth, Habits, Health). The wall of text is now hideable but no shorter. |

### AL-STALE-DATA-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-027 | AL-STALE-DATA-001 | CHANGED | FIXED | D1920 crypto chosen, live DefiLlama | The header reads "Sources last read 8 Nov 2026". The cards' value-locked reads are "read 8 Nov 2026, 15:56". The header and the newest read now agree. |
| B-122 | AL-STALE-DATA-001 | CHANGED | FIXED | as BN-027 | As BN-027. |

### AL-CHAIN-DATA-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-008 | AL-CHAIN-DATA-005 | CHANGED | FIXED | D1920 testnet, live | As D-014:<br>• The 12 ended test/template proposals sit in one closed `<details>` ("12 ended proposals that look like tests or templates"). A search opens it (open=true after typing "test").<br>• The quorum paragraph appears once.<br>• Only #123 "test evg" stays outside the group, because it is still collecting its deposit. |
| D-014 | AL-CHAIN-DATA-005 | CHANGED | FIXED | as BN-008 | As BN-008. |

### AL-CHAIN-DATA-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| L-043 | AL-CHAIN-DATA-006 | CHANGED | FIXED | D1920 testnet, ended proposals | The raw string "proposal did not get enough votes to pass" appears 0 times. Each card shows "Why it ended this way · It did not get enough votes to pass: …" and an estimated turnout with the quorum (see D-154). |
| D-154 | AL-CHAIN-DATA-006 | CHANGED | FIXED | as L-043 | As D-154 above. |

### AL-COPY-056

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-256 | AL-COPY-056 | CHANGED | FIXED | 375 Dark and 388 Light, More sheet | The theme captions now read: Dark "…Light is the day look; Nebula the starry one." and Light "Light is ZIGoals by day … Nebula and Dark are its night looks." There is no "one you know" or "look you know", no "YOUR FINANCIAL ORBIT" banner in the sheet text, and 0 "Alpha’s facts". |
| DV-262 | AL-COPY-056 | STILL OPEN | FIXED | 375 Dark and 388 Light, phone Settings list | The groups now read: Data & privacy, Your app, Your areas, Extras, Account & devices, Your assistant, Help & diagnostics, **Try it**. "Showcase tour — Fictional examples, in this tab only" is the only row in the last group, no longer under "Import from other apps". |
| DV-266 | AL-COPY-056 | STILL OPEN | FIXED | as DV-262 | The rows are grouped:<br>• "Chess usernames — chess.com and Lichess, public data" is in **Extras**, with Music & focus sounds and Links on Today.<br>• "Health targets — Calories, water, steps and units" replaces "Health settings — Your journal and targets".<br>• Search finds Settings sections (e.g. "time zone" → SETTINGS Time zone). |
| DV-273 | AL-COPY-056 | CHANGED | FIXED | 768 Light fresh | "Load Showcase Demo" has `class="secondary"`, at y 12,321 of 14,114 px (the end of Your app, in the "Try it" group). |
| N-DV-12 | AL-COPY-056 | STILL OPEN | FIXED | D1440 (Appearance) and 375/388 (More sheet) | Settings → Appearance reads "Nebula is ZIGoals’ own night-sky look. Light and Dark are the same app by day and by night." The More sheet reads as DV-256. "Your records live on this device unless you turn on sync" is kept. |
| NB-029 | AL-COPY-056 | CHANGED | FIXED | D1440 and 768 fresh (list: OTHER) | The Try it card reads "The Showcase is a separate copy, in this tab only; your own data and wallet records are untouched." The jargon "separate storage" is gone, and the button is secondary (as DV-273). |
| N-NB-15 | AL-COPY-056 | STILL OPEN | FIXED | D1440 fresh vs Showcase (list: OTHER) | **Fresh** (nav 13 links): the card says "The Showcase switches on every page (Earn, Markets, Staking, Chess, Journey and more) so you can see them all. Your own ZIGoals starts with fewer pages, and shows only the ones you switch on under Your pages & buttons."<br>**Inside the Showcase** (nav 20): "The Showcase shows every page. Your own ZIGoals keeps the pages you chose: when you return to your data, its menu is yours again." |

### AL-COPY-057

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-085 | AL-COPY-057 | CHANGED | FIXED | Showcase D1440, page clock 4 Nov 05:20; and D1920 live (hikaru / DrNykterstein) | **Showcase:** the chart summary, axis and table are grouped: "from 6 Oct 2026 (1,460) to 4 Nov 2026 (1,503); lowest 1,453, highest 1,510", axis "1,440 / 1,520", table rows "1,460 …". The Lichess chart matches ("1,612 … 1,632").<br>**Live:** no "over time" chart was drawn with the real answers. Lichess's rating history from here and chess.com have no history, as in round 1's C-BN-21 note, so the live ungrouped case could not show either way. |

### AL-LAYOUT-375-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-003 | AL-LAYOUT-375-009 | CHANGED | FIXED | 375 Dark, mobile emulation, Governance → Real network | The dialog is 375 wide. "Not now" and "Continue on the real network" are each 337 × **46** px (were about 140 px) and not clipped. The "I understand" label is `display:flex; flex-direction:row`, with the 22 px checkbox at x 19 on the label's own line, beside its text. Closed with Not now. |

### AL-LAYOUT-500-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-BN-05 | AL-LAYOUT-500-001 | CHANGED | CHANGED | 375 Dark, mobile emulation, crypto chosen, Earn (list: UNSEEN) | **New:** the page is 16,531 px tall, down from 24,092 in round 1. It has one topic strip ("On this page", 16 chips), at y 560 under the heading and intro. Nawa, DeFa, Permapod, Zignaly, Governance, Goal Vaults and Stablecoins are folded on phones (lane sweep 4).<br>**Still:** 16,531 px is about 20 screens at 812 px. The "very long page" half is improved, not closed. |
| BN-123 | AL-LAYOUT-500-001 | — | FIXED | 375 Dark, Earn, item #4 only (list: UNSEEN) | The "Options are listed…" paragraph is 343 px wide, the same as the paragraph above it and the 343 px column. The topic strip is not cut (scrollWidth 343 = width 343). The round app strip is gone. No horizontal scroll (375). |

### AL-NAV-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-001 | AL-NAV-007 | STILL OPEN | FIXED | 375 Dark and 388 Light, mobile emulation, fresh | The More sheet now has a row "More pages — Earn, Staking, Ecosystem, Chess: switch them on". Tapping it lands on `/app/settings#your-pages`. Today itself still has no link to those pages (0), but the phone shell's own menu now points to them. |

### AL-SETTINGS-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-038 | AL-SETTINGS-004 | FIXED | FIXED | D1920 fresh, Settings → Reminders (`/app/settings/reminders`) (list: OTHER) | The "device key" sentence is gone (0 matches). The page reads "Water also has its time in Health → Diary’s Water card: it is the same reminder." Under "Set on their own pages · Sleep and meditation": Wind-down (Sleep) "Set it in Health → Sleep", Meditation "Set it in Health → Meditation". |
| MO-103 | AL-SETTINGS-004 | FIXED | FIXED | as MO-038 (list: OTHER) | The Reminders hub lists "Habits and water → Habit reminders → Water · While the day is below your water goal", and names the Diary card as the same reminder. |
| M-062 | AL-SETTINGS-004 | FIXED | FIXED | as MO-038 (list: OTHER) | As MO-038: no "device key" sentence. |

### AL-SETTINGS-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-035 | AL-SETTINGS-005 | NOT REPLAYED | NOT REPLAYED | D1440 fresh | The cost-cap fields and their `#zigi-usage` target appear only once ZIGi is connected to a model. Without one, `#zigi-usage` is absent (0), and this sandbox has no model or key. The lane says L7 fixed it (components/nova/panels/cost-panel.tsx:23); that could not be seen on screen. |

### AL-SETTINGS-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-047 | AL-SETTINGS-007 | FIXED | FIXED | D1920 fresh; Today, Health, Wealth, Tasks, Settings (list: OTHER) | `/api/push` is called only on Health and Settings, and it answers 200. `/api/private-account?action=status` answers 200. 0 console errors on all 5 pages. |
| N-MO-34 | AL-SETTINGS-007 | FIXED | FIXED | as MO-047 (list: OTHER) | 0 console errors on each of the 5 pages. |
| N-PR-05 | AL-SETTINGS-007 | STILL OPEN | STILL OPEN | as MO-047 | Every page load (5 of 5) still logs the Permissions-Policy "bluetooth" warning. The served header is `camera=(), microphone=(self), geolocation=(), bluetooth=()`. The lane cites INT.md P-LS-65 "kept by design" ("Dropping it widens Web Bluetooth"). That is not an AL_SCOPE F or ADR-037 O-row, so the owner should decide. |

### AL-TIMEZONE-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-009 | AL-TIMEZONE-003 | STILL OPEN | FIXED | Showcase D1440, page clock Wed 4 Nov 2026 05:20 Brussels | Chess at 05:20 shows "Rapid 1,503 as of 4 Nov 2026, 05:20", "Blitz 1,632 as of 4 Nov 2026, 05:20", "chess.com: updated 4 Nov 2026, 05:20", "Lichess: updated 4 Nov 2026, 05:20". Today's games are dated "4 Nov 2026, 05:20". Earlier days keep 08:00/09:00 (3 Nov, 2 Nov …), all in the past. Nothing is later than now. |
| PR-108 | AL-TIMEZONE-003 | STILL OPEN | FIXED | as PR-009 | As PR-009. |
| BUG-037 | AL-TIMEZONE-003 | STILL OPEN | FIXED | as PR-009 | As PR-009: the seed times are clamped to now. |

### AL-LAYOUT-768-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-184 | AL-LAYOUT-768-002 | STILL OPEN | FIXED | 768×900 Light fresh (list: CHANGED) | The sticky `settings-sections` row is **74 px**: one line of 7 chips of 49 px at the same top (Data & privacy … Help & diagnostics, Fold all) plus 12/12 padding. It was 134 px in round 1 and about 110 px for Tokyo. The "Checklist button and Today card" checkbox is a 22 × 22 box ending at x 130, with its text starting at x 144 (beside, not over, the label). Load Showcase Demo is at the end of Your app (see DV-273). |

### AL-COMPETITOR-GAP-131

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-24 | AL-COMPETITOR-GAP-131 | REASON CITED, NOT BUILT | FIXED | D1920, Chess → Open Play, no sign-in (list: UNSEEN) | "Play the computer, on this device" ("no account and nothing sent … not an engine"), with White/Black and Easy/Medium/… levels. Start the game, then type e4 → computer Nc6; Nf3 → Nf6; Bc4 → Nxe4 (a legal capture). "Take back my move" → moves "e4 Nc6 Nf3 Nf6", "Your move (White)". Resign → "Resigned. The computer won." |
| D-228 | AL-COMPETITOR-GAP-131 | REASON CITED, NOT BUILT | FIXED | as C-BN-24 (list: UNSEEN) | A playable board with moves and an end state (as C-BN-24). "Open on chess.com" links go to each game (`www.chess.com/game/live/186788532630` …). |

### AL-COMPETITOR-GAP-134

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-03 | AL-COMPETITOR-GAP-134 | CHANGED | FIXED | D1920 crypto chosen, Earn → Rewards, unstaking and history; real delegator tracked read-only; 3 seeded confirmed claims (test double) | "Claimed through ZIGoals, by month (real network)" draws 6 bars (Jun–Nov 2026): Sept 2026 "12.5 ZIG", Nov 2026 "4 ZIG · 1 in the transaction", the others "0". It explains that a claim with no amount counts beside its month. The claim list sits above it. |
| C-DVG-69 | AL-COMPETITOR-GAP-134 | CHANGED | STILL OPEN | as C-BN-03 | **Built:** a price line per claim and the CSV columns "ZIG price that day (USD, CoinGecko)" and "Value that day (USD)".<br>**Shown:** every claim says "ZIG’s price that day: unknown (CoinGecko’s history has no point for it)". The CSV has "unknown,unknown" on every row (claims of 29 Sept, 2 Nov and 5 Nov 2026).<br>**Cause (code read + curl):** components/zigchain-eco/staking-clarity.tsx:40 asks for CoinGecko coin id `'zigchain'`. CoinGecko answers `/api/v3/coins/zigchain` with `{"error":"coin not found"}` and `simple/price?ids=zigchain` with `{}`. ZIG's id is `zignaly` (`simple/price?ids=zignaly` → 0.0392 USD), which the app itself uses in lib/wallets/balances/chains.ts:19 (`coingecko: 'zignaly'`).<br>CoinGecko also throttles this sandbox, so `/api/market-history` was unavailable anyway, but the wrong id would make the price unknown even where CoinGecko answers. |

### AL-COMPETITOR-GAP-135

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-68 | AL-COMPETITOR-GAP-135 | CHANGED | FIXED | D1920, real mainnet delegator `zig1xjhk…80tdj` tracked read-only (live unbonding entries) | **Unbonding calendar:** "Mon, 9 Nov 2026 · 9,582.56 ZIG … from BTCS, available in 2 days" and "Tue, 17 Nov 2026 · 53,710.66845 ZIG" (3 validators).<br>**"Add a reminder to your calendar":** downloaded `zigoals-unbonding-2026-11-08.ics` with 2 VEVENTs (DTSTART 20261109 and 20261117, "Unstaked ZIG is back in your wallet (ZIGChain)") and 2 VALARMs at `TRIGGER:PT9H` (09:00 on the day). The page also says "They are on your Agenda too". |

### AL-COMPETITOR-GAP-138

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-07 | AL-COMPETITOR-GAP-138 | STILL OPEN | STILL OPEN | D1920 crypto chosen, Earn | Still no side-by-side table of Earn's options with risk labels. Earn has one `<table>` (the validator list, header "Validator"), and no "compare / side by side / comparison" wording. The lane's third pass says this needs the per-section facts moved into one data table first and was "Not done". The fourth pass and the sweeps do not mention it. No F/O decision is cited (CROSS_LANE lists the old "no advice" reason as not in F). |

### AL-COMPETITOR-GAP-143

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-13 | AL-COMPETITOR-GAP-143 | CHANGED | FIXED | D1920 testnet, live (no proposal open on 8 Nov) | Each ended proposal has a turnout bar: `div.governance-turnout-bar` with role=img, named e.g. "Estimated turnout 73.2% of staked ZIG; the quorum is 33.4%, reached". The words line is beside it. The live (voting) state could not be seen: none was open. |

### AL-COMPETITOR-GAP-147

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-BN-17 | AL-COMPETITOR-GAP-147 | CHANGED | FIXED | D1920, Ecosystem, live DefiLlama | Sort now offers "Value locked, largest first (projects with a read)", next to Directory order, Name A to Z and Live projects first. Chosen, the cards run $74.5M, $3.5M, $3.2M, $2.1M, $1.4M (descending). |

## STILL OPEN for the lane

1. **N-PR-05** (AL-SETTINGS-007), "bluetooth" console warning on every load.
   1. Open any page, e.g. http://127.0.0.1:3103/app, at 1920 in Chrome with DevTools Console open.
   2. A warning shows: "Error with Permissions-Policy header: Unrecognized feature: 'bluetooth'".
   3. The response header is `permissions-policy: camera=(), microphone=(self), geolocation=(), bluetooth=()`.
   4. Seen on 5 of 5 pages (Today, Health, Wealth, Tasks, Settings).
   - INT keeps the header by design (INT.md P-LS-65), which is not an F/O decision. The owner should decide or record it.
2. **C-DVG-69** (AL-COMPETITOR-GAP-134), ZIG's price on the claim day is always "unknown".
   1. Track a public mainnet wallet read-only.
   2. Have a confirmed real-network claim in `zigoals:staking-journal:v1`.
   3. Open Earn → "Rewards, unstaking and history".
   4. Each claim says "ZIG’s price that day: unknown (CoinGecko’s history has no point for it)".
   5. Press "Download rewards as CSV": the price and value columns are "unknown".
   - Cause: `staking-clarity.tsx:40` requests CoinGecko id `zigchain`, which does not exist ("coin not found"). ZIG is `zignaly` on CoinGecko, as in `lib/wallets/balances/chains.ts:19`.
   - Re-check where CoinGecko is not throttled (it was throttled in this sandbox).
3. **C-BN-07** (AL-COMPETITOR-GAP-138), no comparison table of Earn's options.
   1. Open /app/earn at 1920 with the money pages chosen.
   2. Look for a side-by-side table of the ways to earn (who holds the funds, exit, risk).
   3. Only the validator table exists. Not built, and no F/O reason is cited.

CHANGED (not STILL OPEN, for the record):
- **D-088 / N-BN-10 / D-005:** Settings folds and "Fold all" brings it to 3.4 screens at 1280. But every group starts open, so it still arrives at 16.3 screens, and the Data & privacy group still holds about 8,100 characters.
- **N-BN-05:** Earn at 375 is 16,531 px (was 24,092), with one strip and seven sections folded on phones. That is still about 20 screens.
