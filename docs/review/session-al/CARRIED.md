# Carried to next session (Session AL, 9 Nov)

Every finding id that is not Fixed, Holds, an owner decision, not possible or waiting on the owner after the final replay
(round 3) and the final fix pass (round 4, one attempt per row). Owner finish rule 6: each got its attempts; the cause is the
latest replay's evidence, cut to one line. docs/STATUS.md groups them (owner calls, new features, carried by their lanes).

**67 AL rows, 111 ids.** Changed 55, Not Replayed 32, Still Open 24.

| AL row | lane | id | verdict | cause (latest replay, one line) |
|---|---|---|---|---|
| AL-COUNTS-001 | L1 | TK pass-1 "'Current' badge on stale prices" | Not Replayed | Needs a service: a live price that ages past 15 minutes. With /api blocked no price is ever current; I saw only that no unavailable price is labelled "Current" (0 before and 0 afte… |
| AL-NUMBERS-SOURCE-001 | L1 | D-262 | Not Replayed | Needs a service: live price drift between two loads (/api blocked, prices cannot move). |
| AL-NUMBERS-SOURCE-001 | L1 | D-200 | Not Replayed | Needs a service: live price drift on reload. The "Totals in USD/EUR" switch the bot used no longer exists (lane note, D-221). |
| AL-NUMBERS-SOURCE-001 | L1 | TK-6B-06 | Not Replayed | Needs a service: live 24h change against its as-of stamp in two themes. |
| AL-ROUNDING-001 | L1 | TK pass-1 "Unformatted prices" | Not Replayed | Needs a service: coin pages need /api/market-detail and history (no coin links render offline). Seen formatted elsewhere: Wealth/Portfolio money is formatted; NOVA "What's the BTC … |
| AL-COPY-001 | L1 | M10 | Not Replayed | Needs a service: market logos come from /api/market-logo. Offline, Wealth and Markets show the same glyph for Gold ("△", data-kind Precious Metals) and Markets names it "Gold · tro… |
| AL-COPY-001 | L1 | TK-203 | Not Replayed | Same steps as M10 (needs the logo service). |
| AL-FIELD-ERROR-002 | L1 | TK-036 | Still Open | Calculator 100/month, 10 years → "ESTIMATED FINAL VALUE US$17,175.24"; Years 61 → "Whole years from 1 to 60." and the result is replaced by "Correct the marked field to see the est… |
| AL-SEARCH-001 | L1 | W15 | Not Replayed | Needs a service: the public asset catalog behind "gold"/"bitcoin"/"b" search (/api/market-assets blocked). |
| AL-COMPETITOR-GAP-008 | L1 | C-DVG-51 | Changed | Wealth → Import from your bank → CSV file → a Mint export (Date, Description, Original Description, Amount, Transaction Type…) → "This looks like a Mint export. Its columns are mat… |
| AL-FIELD-ERROR-003 | L2 | D-052 | Not Replayed | Needs a service: adding a ninth favourite goes through the market catalog search ("cardano", /api blocked). Seen offline: Markets now reads "7 of 50 · Your favourites" (the 8-favou… |
| AL-FIELD-ERROR-003 | L2 | D-090 | Changed | Health → Sleep → Log a night: defaults save "Night saved."; wake before bed → "Woke up must be after went to bed."; a night ending in the future → "The night cannot end later than … |
| AL-FIELD-ERROR-004 | L2 | C-DVG-35 | Not Replayed | Needs a service: a working barcode lookup needs the food-lookup provider (/api/food-lookup blocked; this build has none either). The by-name food search is on the device. |
| AL-FIELD-ERROR-004 | L2 | MO-007 | Not Replayed | Needs a service: whether a lookup succeeds needs the food-lookup provider. What can be seen: 3017620422003 → "Lookup is not available here. Search foods by name instead? · Add it y… |
| AL-FIELD-ERROR-004 | L2 | Oct-26 gap: barcode provider inactive | Not Replayed | Needs a service: turning a lookup provider on is a deployment setting, not a screen a replay can press. |
| AL-FIELD-ERROR-004 | L2 | C-MO-01 | Not Replayed | Needs a service (a branded barcode lookup, e.g. Nutella 3017620422003, needs the provider). |
| AL-LIMITS-003 | L2 | C-MO-36 | Still Open | Fasting → Custom → 30 hours → "Choose a target from 1 to 18 hours." ("Target hours (1–18; every fast stops itself at 24 h)"). 24 h+ targets are not built; the lane’s "owner decisio… |
| AL-LIMITS-003 | L2 | PR-018 | Not Replayed | Half seen: the Checklist Sleep tile now asks "Start sleep now? Tap Sleep again when you wake" (as Fast and Focus do). The meditation timer’s 20-second stop (the "one minimum" part)… |
| AL-UNITS-003 | L3 | NB-114 | Not Replayed | Two tries: a Duration habit "Warm up" (5 minutes) was made, but my scripts could not enter a fractional value on its card (the "set or add a value" control did not open), so ZIGi a… |
| AL-XP-BADGES-003 | L3 | DV-045e | Changed | Journey has no mid-page "Lovely" card and badges to earn fold under "Still to earn (4 of 16)". **Still very long:** 7,178 px at 1440 (round 2: 7,872) and 11,285 px at 375. |
| AL-TIMEZONE-002 | L3 | C-DVG-22 | Still Open | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across … |
| AL-TIMEZONE-002 | L3 | C-NB-28 | Still Open | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across … |
| AL-TIMEZONE-002 | L3 | N-NB-11 | Still Open | No "my day ends at" setting exists (none in Settings or the habit form; the code has no such setting), and the lane gives "Later (competitor) … a TIER 3 day-boundary change across … |
| AL-CONFIRM-DELETE-005 | L4 | B-083 | Changed | Goals → Health goals → "End Walk more (Showcase)": it still ends at once with no confirm (0 alertdialog); toast "Walk more (Showcase) ended. Undo". The bot asked for a confirm; the… |
| AL-CONFIRM-DELETE-005 | L4 | M-104 | Changed | Remove milestone "9 books": still no confirm (no alertdialog); the toast "“9 books” removed." with Undo lasts 12.4 s and is keyboard-reachable. The bot asked for a confirm or Undo;… |
| AL-CONFIRM-DELETE-005 | L4 | M-131 | Changed | Same steps as B-083: End goal is immediate, no confirmation, Undo in the toast. |
| AL-A11Y-014 | L4 | DV-040g | Changed | Card ⋯ is a `<button aria-expanded="false" aria-label="Options for DV Count books">`; its items are links and buttons, 0 role=menu / role=menuitem. The lane carried role=menuitem (… |
| AL-A11Y-014 | L4 | DV-056c | Changed | Same steps as DV-040g (0 role=menuitem). |
| AL-A11Y-015 | L4 | DV-170 | Changed | Activity Remove is named after its row ("Remove Water: 250 mL, 4 Nov 2026"), 44 px, with a 12 s Undo; still on every row, not inside a ⋯ (lane: carried, a visual decision). |
| AL-A11Y-016 | L4 | D-028 | Still Open | Showcase Today, Tab pressed from the top until focus wrapped: 176 stops (the bot counted ~173). The lane carried it ("173 stops before and after", 30 regions); no change. |
| AL-A11Y-016 | L4 | D-055 | Changed | Wealth → "Options for Bitcoin": "Add quantity to Today · Add value to Today · Add available to Today · Add allocations to Today" (the long name is not repeated) but still no Edit o… |
| AL-COPY-040 | L4 | DV-053c | Changed | The "Reach a chess rating" idea still has no number field ("Steps toward the rating you choose; write the number into the last step"); a numeric rating goal exists on Chess and sho… |
| AL-COPY-042 | L4 | DV-089 | Not Replayed | Needs a model: the NOVA workflow that made goals (tagged "Goal · by ZIGi") runs only with a connected AI. On the device NOVA only offers "Open the form" (a goal the person then cre… |
| AL-COPY-043 | L4 | T-014 | Changed | The wizard is still four steps ("Your goal · What counts · A rhythm (optional) · Review"; Create goal works from step 1). The lane carried shortening it (a redesign; no owner decis… |
| AL-COPY-044 | L4 | C-DVG-17 | Still Open | Activity has date ranges (This week / month / year / All time), kind filters and "Show more activity", but no search field and no CSV export (0 search inputs, no Export/CSV control… |
| AL-COPY-044 | L4 | DV-046e | Still Open | Same steps as C-DVG-17: no search or export (a date filter and paging exist now). |
| AL-COPY-044 | L4 | DV-054d | Still Open | Same steps as C-DVG-17. |
| AL-COPY-044 | L4 | C-DV-13 | Still Open | Same steps as C-DVG-17. |
| AL-COPY-044 | L4 | PR-100 | Still Open | Activity: still no search field (filters are the kind chips and date ranges). |
| AL-DISCOVERABILITY-002 | L4 | DV-010c | Changed | Fund Goal for "I saved 200" is still four screens (kind → Cash details → Continue → Preview → Confirm); the amount is asked once. The lane carried the shorter flow. |
| AL-DISCOVERABILITY-002 | L4 | NB-253 | Changed | Same steps as DV-010c: amount asked once, still a multi-screen modal. |
| AL-SEARCH-003 | L4 | D-079 | Not Replayed | Needs a service: Wealth → Add asset → "Find your asset" searches the public catalog (/api/market-assets blocked). |
| AL-CHECKLIST-001 | L5 | D-086 | Changed | Numbers are labelled ("1 of 4 planets today", "Orbit 1/4 · 1 of 4 complete") and one sentence explains the words ("A planet is one item on your path… an orbit is complete when all … |
| AL-PERF-007 | L5 | LS-067 | Still Open | /app/tasks cold: 106 resources, 2.68 MB transferred: 1.71 MB is one image (/brand/figures/zigi/origami-nebula/F022-peek.anim.webp), JS 56 files 666 KB, CSS 33 files 116 KB. The row… |
| AL-LAYOUT-DESKTOP-015 | L6 | D-088 | Changed | Settings still arrives 12,660 px tall with all six groups open (6 × aria-expanded="true"); "Fold all" folds them (round 2: to 3.4 screens). The lane carried "start folded" to the n… |
| AL-LAYOUT-DESKTOP-015 | L6 | N-BN-10 | Changed | Same steps as D-088. |
| AL-LAYOUT-500-001 | L6 | N-BN-05 | Changed | One topic strip ("On this page"); fees/steps fold on a phone. **Still:** the page is 15,769 px tall at 375 (round 2: 16,531; round 1: 24,092), about 19 screens. |
| AL-SETTINGS-005 | L6 | PR-035 | Not Replayed | Half seen: with a model connected, Settings → ZIGi → Advanced shows "Usage on this device" (#zigi-usage) and the Monthly cap with a Currency select (USD/EUR/GBP/CHF/JPY/CAD/AUD). M… |
| AL-COMPETITOR-GAP-132 | L6 | C-BN-01 | Not Replayed | Needs a service: the Staking validator list (commission / uptime sorts) is read live from the chain relay (/api blocked). |
| AL-COMPETITOR-GAP-132 | L6 | C-DVG-67 | Not Replayed | Same as C-BN-01 (needs the chain relay). |
| AL-COMPETITOR-GAP-134 | L6 | C-DVG-69 | Not Replayed | Needs a service: the claim’s "ZIG price that day" comes from CoinGecko history (blocked). Code read: components/zigchain-eco/staking-clarity.tsx:41 now asks for "zignaly" (round 2’… |
| AL-COMPETITOR-GAP-136 | L6 | C-BN-05 | Not Replayed | Needs a service: comparing validators needs the live validator list. |
| AL-COMPETITOR-GAP-137 | L6 | C-BN-06 | Not Replayed | Needs a service: jailing alerts need a tracked wallet’s live delegations (chain relay). |
| AL-COMPETITOR-GAP-141 | L6 | C-BN-11 | Not Replayed | Needs a service: the vote-deadline reminder sits on an open governance proposal, read live. |
| AL-COMPETITOR-GAP-142 | L6 | C-BN-12 | Not Replayed | Needs a service: a validator’s vote lookup is read live from governance. |
| AL-AI-CONNECTION-001 | L7 | BN-034 | Changed | Request capture: `options.num_ctx` is now sent (32768; 16384 on the card retry), so the 4,096 default no longer cuts the prompt. A one-line governance question still carries ~57.7 … |
| AL-AI-CONNECTION-001 | L7 | BN-050 | Not Replayed | Cross-reference row only (points to BN-034/035/036/047); nothing of its own to replay. BN-034 and BN-047 have their own rows. |
| AL-AI-ACTIONS-003 | L7 | LS:#012 | Changed | «Uncheck everything» → "ZIGi checks off one item at a time: name one, or tick them on the Checklist itself." (NOVA says NOVA); honest, nothing written, but no bulk card (same as ro… |
| AL-AI-ACTIONS-003 | L7 | LS:#194 | Changed | «Tick all my habits done for today» → "ZIGi checks off one item at a time: name one, or tick them on the Checklist itself." (NOVA: NOVA); no injection-planet card any more, nothing… |
| AL-AI-ACTIONS-003 | L7 | LS:#351 | Changed | «Tick everything on my checklist as done» → "ZIGi checks off one item at a time…" (no injection-planet card any more; nothing written); still no bulk confirm. |
| AL-AI-ACTIONS-003 | L7 | C-LA-07 | Changed | Same steps as LS:#012/#194/#351: bulk asks get the honest "one item at a time… or tick them on the Checklist itself"; still no bulk action with one confirm. |
| AL-AI-FACTS-003 | L7 | Z-057 | Changed | «Show me the milestones for all goals» → "Your milestones: Launch my creative studio: 2 of 4 done; next: Find the first client (+1 more)": the one goal with milestones, with its ne… |
| AL-AI-FACTS-009 | L7 | NB:N11 | Changed | «what level am I / XP» → "Your level and XP are on Journey, counted on this device…; I don’t read them in a chat yet." + Open Journey: honest pointer, but still no level/XP answer. |
| AL-NUMBERS-SOURCE-014 | L7 | TK-048 | Changed | Portfolio «How much BTC is in my portfolio?» answers the Portfolio (0.07 BTC); BTC price labels each source (Wealth no price; Portfolio 65,000 Showcase example). The Wealth answer … |
| AL-NUMBERS-SOURCE-014 | L7 | TK-052 | Changed | Same steps as TK-048 (duplicate, as the bot says). |
| AL-NUMBERS-SOURCE-014 | L7 | TK:1 | Changed | «How much BTC do I have?» → "You hold 0.45 BTC in Wealth (1 holding), with no price, so no value." Only Wealth is counted; the Portfolio's 0.07 BTC is not mentioned (it is when ask… |
| AL-AI-ACTIONS-010 | L7 | LS:#046 | Changed | «I drank 2 glasses of water» (Health off) → Z and N: quick-line preview "Will save: Water · 2 glasses (500 mL) · today … Save" with "Health isn’t shared with ZIGi/NOVA, but saving … |
| AL-AI-CONNECTION-007 | L7 | PR-028 | Changed | On the Showcase the page opens at "Lit: 3 / 10" before anything is clicked (L2: "Lit: 0 / 10"), so example data still lights planets; the What-NOVA-can-see check now says "Showcase… |
| AL-AI-FACTS-011 | L7 | DV-077 | Changed | NOVA's home now shows a Goals HUD (Emergency fund 45% · Ahead of plan, First home deposit 65%, Japan adventure 42% · Behind plan…, pace of Emergency fund) beside Health and Habits;… |
| AL-AI-FACTS-011 | L7 | DV:N-045 | Changed | Same steps as DV-077: goals are now on NOVA's day view; the morning brief needs "Set up daily briefs" first. |
| AL-AI-STABILITY-005 | L7 | N-DV-03 | Changed | NOVA now offers "Continue your last conversation “Which habits are open today?”" and Conversations lists "Which habits are open today? · 2 turns · Started with ZIGi on Habits" (res… |
| AL-PRIVACY-006 | L7 | MO-052 | Changed | Refusal now names both switches and the Today condition ("Health page data" and "Include Health" (Health has to be one of Today’s sections)); the button still reads "Ask ZIGi about… |
| AL-COPY-066 | L10a | D-003 | Changed | Top of Today, Wealth, Goals: one alpha notice (dismissible once for every page) and the Showcase chip; no "Demo records" toggle above the page. Section-level Showcase lines remain … |
| AL-LAUNCHER-OVERLAP-001 | L10a | D-070 | Changed | Mascot part fixed (S1 at 388). The header icons are still icons without visible words at 388 (wallet "Wealth", lock "Unlock layout to rearrange"); they have accessible names and th… |
| AL-LAYOUT-375-011 | L10a | DV-223 | Changed | Heading now at ~230 px (was ~370) and the rocket moved off phones (Game layer is a row in Apps & extras), the notice is dismissible once for every page. Still three stacked rows be… |
| AL-LAYOUT-375-011 | L10a | DV-247 | Changed | Dismissing the notice once hides it on every page (checked on Habits and Wealth after closing on Goals). The rocket and lock are still icon-only at 768 (names "Game layer: on", "Un… |
| AL-LAYOUT-375-011 | L10a | DV-257c | Still Open | The status row with the lock shows on Today, Goals, Habits, Health, Wealth (and Staking, Journey) but not on Journal or Notes (row height 0 there). |
| AL-LAYOUT-375-011 | L10a | DV-258c | Still Open | Notes still shows "Back to Today" top-left; the other 11 pages checked show the logo ("ZIGoals home"). |
| AL-LAYOUT-768-004 | L10a | N-127 | Not Replayed | The bot's own list retracts it (nairobi.md: "excluded by the list (retracted)"); no steps. |
| AL-LAYOUT-768-004 | L10a | BUG-051 | Changed | Portfolio at 768: the page no longer scrolls sideways (scrollWidth 768), but the holdings table is 1310 px wide inside a 578 px section that scrolls on its own. |
| AL-LAYOUT-768-004 | L10a | N-153 | Not Replayed | No steps or detail in the bot files ("Layout @768 — MINOR (re-confirms N-076)"). The 768 sweeps (S1/S2) found no sideways scroll or overlap. |
| AL-LAYOUT-768-004 | L10a | D-134 | Changed | The hero's 3-up row (Your goals / Your future / Onchain) fits at 768 and stacks at 375. Quick add is still offered twice (top bar "+ Quick add" and the hero's "+ Quick add"; the To… |
| AL-NAV-010 | L10a | DV-274 | Changed | Preview now names NOVA, Checklist, Tasks, Notes, Journal in More; it still omits two real More rows ("More pages", "Status & wallet"), and the Governance note still reads "On this … |
| AL-NAV-010 | L10a | NB-045 | Changed | One Journey row now. "Status & wallet" is still a More row ("The Alpha's status and your wallet"). |
| AL-NAV-010 | L10a | D-194 | Still Open | Right-hand cluster at 1280 fresh: Goals "Game layer, Unlock layout"; Habits "Vacation, Game layer, Unlock layout"; Earn, Portfolio, Help, Governance "Game layer" only; Health "Game… |
| AL-THEME-004 | L10a | D-063 | Still Open | The dark hero block is a protected Light island (ADR-036 PROTECTED "Light's dark islands", owner decision). The other half still shows: the theme radios sit at the sidebar bottom (… |
| AL-THEME-004 | L10a | D-176 | Not Replayed | Needs a service: Wealth's and Markets' reference prices come from /api (blocked with 503 here), so the two price formats cannot be compared; Markets shows "Some market data could n… |
| AL-THEME-005 | L10a | D-179 | Changed | Body text and eyebrows on Governance, Health, Habits are 14–18 px with 0 low-contrast hits on solid surfaces. The sidebar theme switch is still below the fold at 800 px height (rad… |
| AL-LAYOUT-DESKTOP-017 | L10a | DV-029a | Still Open | The theme radios sit at the sidebar bottom (y 1250 of a 1320 px sidebar in an 800 px window), so reaching them scrolls the logo out; after the switch the sidebar stays scrolled (sc… |
| AL-NAV-011 | L10a | D-013 | Still Open | Same steps as D-194: Portfolio, Help, Earn, Governance lack the layout lock that Goals, Habits, Health show; sets differ per page. (Phones: the top bar is the same on every page.) |
| AL-NAV-012 | L10a | LS-H34 | Still Open | Theme radios at y 1250 in a sidebar 1320 px tall (800 px window): still at the bottom, below the Apps group, reached only by scrolling the sidebar. |
| AL-THEME-006 | L10a | DV-203 | Still Open | Goals and Activity: Dark = black (body rgb(0,0,0)) starfield, Nebula = navy (rgb(2,9,24)) starfield with a faint haze; cards, sidebar and art identical. Side by side they still loo… |
| AL-THEME-006 | L10a | DV-226 | Still Open | Habits at 388 in Dark and Nebula: identical except black vs navy background. |
| AL-THEME-006 | L10a | LS-H39 | Still Open | Tasks in Dark and Nebula: same layout, same selected-row colour; only the background tint differs. Positive part (no contrast/overflow issue) holds. |
| AL-THEME-006 | L10a | N-NB-03 | Still Open | Same steps as DV-203: Dark keeps the starry background; only the base turns black. |
| AL-MOTION-002 | L10a | NB-075 | Changed | Light ↔ Dark applies in ~0.2 s (data-theme settled in 194 ms; no transition); the 30-day grid uses the same states in both themes (today "Most" in both). Still: the switch sits bel… |
| AL-A11Y-025 | L10b | D-231 | Changed | Showcase /app, real pointer held 1.5 s on each: the chevrons are now 44×26 targets named "Tuck the music/Checklist button away" with a "Tuck away" label (fixed hit area); the round… |
| AL-A11Y-025 | L10b | D-224 | Changed | Settings tab chips: the selected chip now looks selected (aria-current=location, brighter text and a 2 px underline shadow), but hovering a chip still changes nothing. The stray-qu… |
| AL-FIELD-ERROR-018 | L10b | BN-081 | Not Replayed | Needs a service: the Net APR assumption field appears only after Track Wallet has read a wallet through ZIGoals' read-only relay (blocked with 503 here). With no wallet the scenari… |
| AL-FIELD-ERROR-018 | L10b | BN-134 | Changed | Staking → Explore future rewards (no wallet): Amount -5 / 1e12 / 1e15 / abcdef / 1000.123456789 / 1e3 → red field-error role=alert "Write an amount in ZIG: up to 12 digits and 6 de… |
| AL-FIELD-ERROR-019 | L10b | G-025 | Changed | 375 px wizard, Reach a number (GOLD) + Add a contribution plan: step 2 no longer has a "Price per Goal unit" field (fields: Planned amount, Contribution asset, cadence, dates) and … |
| AL-LIMITS-005 | L10b | M-011 | Changed | Silent cut fixed: goal name 80 with counter + cut message in the wizard, counter in Edit. Limits still differ per form (goal name 80, habit title 100, task title 140, Checklist own… |
| AL-LIMITS-005 | L10b | LS-H29 | Changed | Fixed parts: quick-add limit 100 = habit form 100 (with counter); " " → "Give it a name." (aria-invalid). Still open parts: adding "H1 water" twice is accepted silently (the second… |
| AL-ROUNDING-004 | L10b | L-075 | Still Open | Funded 125 of 300: ring 42 %, but the asset mix reads "Cash US$125.00 · 41.66%" and "58.34%" (and 16.66% at 50): the shares are still cut, not rounded (41.666… → 41.66). The ISO-da… |
| AL-TIMEZONE-004 | L10b | N-BN-17 | Not Replayed | Needs a service: the Staking snapshot and Chess "updated" times come from network reads (blocked). Seen around it: with Asia/Tokyo saved, Settings says "clock times shown elsewhere… |
| AL-TIMEZONE-004 | L10b | X3-29 | Not Replayed | Needs a service: same surfaces as N-BN-17 (Staking/Chess timestamps). Activity follows the saved zone ("Times are shown in Asia/Tokyo"). |
| AL-TOAST-011 | L10b | D-037 | Changed | Showcase Goals → ⋯ on Emergency fund → "Add progress to Today": the card no longer grows (643 px before and after) and the status says "Emergency fund progress added to Today."; st… |
| AL-UNDO-005 | L10b | PR-052 | Changed | Showcase Wealth spending log → Remove → toast "Removed: Food & drink €4.20. Undo", Undo → "Put back." (fixed). Still no Edit for a money-log entry (0 edit controls). |
| AL-DATES-008 | L10b | B-201 | Changed | Showcase Habits → Archived → "Evening stretch (Showcase · earlier season)": no ISO date any more (fixed); the archived card still shows Edit and ⋯ next to "Archived". |
| AL-TOAST-012 | L10b | C-LS-20 | Changed | Stacked undo and Ctrl+Z now exist (Tasks: "Removed 3 tasks. Undo" brings all three back; Ctrl+Z undoes; Checklist: "All 3 are back on your path."). No Trash / "Recently removed" li… |
| AL-BACKUP-RESTORE-001 | INT | BN-022 | Changed | Erase → "Erased 4 records and 23 stores from this browser. Open ZIGoals fresh now: this page still shows what it had in memory." + "Open ZIGoals fresh" → /app as a new device (defa… |
