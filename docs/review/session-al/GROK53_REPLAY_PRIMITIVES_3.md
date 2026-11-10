# Grok #53 final replay — lane L10b (shared primitives: field errors, limits, Undo/toasts, number/date formats, plurals), pass 3

- **Commit served:** `1a7b0163` (`git -C /home/user/zig-branch log --oneline -1`: "Session AL (integration 8c84d0a6): headroom under Today's phone ceiling …"), production build, `PUBLIC_ALPHA_UNDEPLOYED`, on http://127.0.0.1:3101.
- **Date:** Mon 9 Nov 2026, about 02:05–04:55 UTC (03:05–05:55 Brussels).
- **Replayed by:** a fresh replay agent (name PRIMITIVES), final replay (owner rule 13). It made no fixes, changed no app or test code and made no git writes. Scripts and screenshots are in `/tmp/claude-0/final-replay-primitives/` (not committed).
- **List:** the 230 ids of `scratchpad/ids/fr-primitives.tsv` (lane L10b), each looked up by grepping its exact token in the bot files (`owner-scope/grok-2026-11-04/*.md`, never FINAL-REPORT.md) and in `ledger/*.md`; only that block was read. `DV:Z-032` is Denver's 11-04 prompt Z-032 (`denver.md`: empty / spaces + Enter); `BN:ZIGi #22` is Berlin's ZIGi prompt #22 (`ledger/berlin.md`, 5,000 characters). No earlier L10b replay file exists; the method follows the header of `GROK53_REPLAY_L3_1.md`.
- **Browser:** Playwright 1.63, Google Chrome (channel `chrome`), headless; `locale: en-GB`; time zone Europe/Brussels unless a row says otherwise (B-038: Pacific/Honolulu; LS-066: America/New_York and Asia/Tokyo). Every `/api/**` request answered 503. The bots' clock set with `page.clock.install`: 4 Nov 2026 03:30 Brussels (02:30 UTC) by default; Lisbon rows 4 Nov 10:00 Brussels; LS-031 4 Nov 23:30 Brussels; LS-066 5 Nov 00:01:30 Brussels; B-038 3 Nov 22:30 Honolulu. ZIGi rows used the on-device answers (no model).
- **Runs:** every browser run went through `flock -o /tmp/claude-0/zig-browser.lock`, one browser, at most 2 pages; each script was capped at 7 minutes and at most two scripts ran per lock hold.
- **Paste:** limit findings that say "paste" were replayed with a real clipboard paste (Ctrl+V), because the app answers a cut paste with its own message.
- **Conditions used** (codes in the tables):
  - **D** = desktop 1920×1113, Nebula, fresh empty profile with the welcome marked seen (Denver's 11-04 condition, also used for Berlin desktop and Nairobi desktop rows).
  - **D12** = desktop 1280×800 or 1280×900 fresh (Tokyo P2/P9, Moscow 1280, Lisbon "RC desktop", Berlin Settings). **D14** = 1440×900 fresh.
  - **375** = 375×812 phone (isMobile), fresh (Lisbon's width); **375 Dark** = the same in Dark; **388** = 388×844 (Denver's phone width), Nebula and Light; **384×222** = Denver's 500 % zoom box; **768** = 768×1024.
  - **Sc** suffix (e.g. **Sc14**) = Showcase via Settings → Load Showcase Demo (Professor at 1440×900; Denver's 21 Oct ids at 1280×800 "D12" are also Showcase where the row says so).
- **How CHANGED is used** (as in L3_1): the bot's main complaint is gone, but a named part of the same finding remains, or the fix behaves differently from what was asked. **STILL OPEN** = the main complaint still shows.
- **Caveats:**
  - Findings that need a network service (Track Wallet's read-only relay, Staking/Chess timestamps, the market catalog) are NOT REPLAYED with that reason.
  - Old ids whose bot block is only a title (e.g. N-148, M-060) were replayed on the page and steps their ledger row names; duplicates say "same steps as <id>".
  - The shared length counter is a badge beside the focused field (components/ui/length-counter.tsx); a row that says "counter" means that badge was read while the field had focus ("0 characters left" / "72 / 80").
  - D-094 could not be replayed: the Showcase coach no longer offers a one-click "Adjust to 1650 kcal" on 4 Nov.

## Totals (counted per finding id)

| verdict | ids |
|---|---|
| FIXED | 173 |
| HOLDS | 0 |
| STILL OPEN | 25 |
| CHANGED | 25 |
| OWNER DECISION | 1 |
| NOT POSSIBLE | 3 |
| NOT REPLAYED | 3 |
| **total** | **230** |

## AL-A11Y-025

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-212 | AL-A11Y-025 | UNSEEN | STILL OPEN | D12 | Showcase Goals, hover with a real pointer: "+ Create a goal" lifts and glows; "Open Goal →" underlines (fixed); the "Completed" filter chip changes nothing (background, colour, border, shadow, transform, filter, opacity, underline and outline all identical). |
| D-231 | AL-A11Y-025 | UNSEEN | CHANGED | D12 | Showcase /app, real pointer held 1.5 s on each: the chevrons are now 44×26 targets named "Tuck the music/Checklist button away" with a "Tuck away" label (fixed hit area); the round buttons ("Open the music player", "Open ZIGi…", 56×56) still show no hover label (no title, no tooltip, no visible text). |
| D-222 | AL-A11Y-025 | UNSEEN | STILL OPEN | D12 | Showcase Health quick counters: hovering "Increase Push-ups" (+) drops its bright gradient fill (background-image linear-gradient(135deg, rgb(95,224,240) …) → none) for a faint 11 % white, so it still looks switched off; Pull-ups still reads "No entry today − — No entry today +". |
| D-223 | AL-A11Y-025 | UNSEEN | STILL OPEN | D12 | Showcase Markets: hovering the "Stocks" chip and the empty star "Add USD Coin favourite" changes nothing (all style values identical, no tooltip). The counter part is fixed: "7 of 50 Your favourites". |
| D-224 | AL-A11Y-025 | UNSEEN | CHANGED | D12 | Settings tab chips: the selected chip now looks selected (aria-current=location, brighter text and a 2 px underline shadow), but hovering a chip still changes nothing. The stray-quote part was not found in the Data & privacy intro. |

## AL-FIELD-ERROR-018

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-080 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Staking → Track Wallet, empty address → Read public positions: "Type a public ZIG address first. It starts with zig1 and is 42 characters long. Nothing was read or saved." under the field, focus on the field, aria-invalid (0 / 90 counter). |
| BN-081 | AL-FIELD-ERROR-018 | UNSEEN | NOT REPLAYED | — | Needs a service: the Net APR assumption field appears only after Track Wallet has read a wallet through ZIGoals' read-only relay (blocked with 503 here). With no wallet the scenario fields were replayed instead (BN-134). |
| BN-089 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Wealth calculator, Starting amount: -1000 → "Enter an amount of 0 or more."; 99999999999999999999 → "That is more than this calculator models. Enter an amount below 10 trillion (13 digits before the point)."; 12.345 → "An amount with up to two decimals …" (the right reason). Letters ("abc", "1e5") also get the two-decimals sentence. |
| BN-134 | AL-FIELD-ERROR-018 | UNSEEN | CHANGED | 375 Dark | Staking → Explore future rewards (no wallet): Amount -5 / 1e12 / 1e15 / abcdef / 1000.123456789 / 1e3 → red field-error role=alert "Write an amount in ZIG: up to 12 digits and 6 decimals, like 1000 or 250.5.", aria-invalid, results "—"; rate -5 → red "Write a rate from 0 to 100, with up to 4 decimals." (notes a and b fixed). Remaining part (c): letters are still accepted into the inputmode=decimal box ("abcdef" stays typed). |
| BN-157 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Edit target 0 on an existing goal → "Enter an amount above 0." at the field (same sentence as the wizard's 0), not "Could not save.". |
| N-BN-16 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Wrong prefix and wrong length now get different messages: cosmos1… → "this address is for another network (cosmos1…)"; 0x… → "this looks like an Ethereum-style address (0x…)"; zig1abc → "this zig1 address is 7 characters long; a public ZIG address is 42". |
| DV-012b | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | /app/goals/average/new, target 0 → "Choose a target above zero."; -3 → "Enter a number that is not negative." (role=alert). Nothing is silent now. Focus stays on Save goal. |
| DV-019b | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Milestones → Add milestone with an empty name: "Give the milestone a name." (role=alert 20 px under Add milestone). Focus stays on the button. |
| DV-025d | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Edit details, empty name → "A name can’t be empty." with focus on the field (was: silently nothing). |
| DV-027a | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Goals → Health goals → + Health goal → Create with all empty: "Give the goal a name." (focus moved to Name, aria-invalid) and "Enter a target above zero." on Target (aria-invalid); with a name only: "Enter a target above zero." focused. |
| DV-040d | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Same as DV-019b: empty milestone → "Give the milestone a name.". |
| DV-107 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Milestone Edit → name cleared → Save milestone: "Give the milestone a name." (role=alert under the row). Focus stays on Save milestone; the field is not marked invalid. |
| DV-152 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Today → Customize Today → Add widget → Goal → a goal tile: Save widget is enabled; pressing it gives a reason when it cannot save ("That metric is already on Today. Edit or show the existing widget." as role=alert), not a silently disabled button. |
| DV-188a | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Edit habit, title cleared → Save habit: "Habit title: Give the habit a name." in the app's style at the field, focused, aria-invalid; no native "Please fill out this field." (validationMessage empty). |
| DV:Z-032 | AL-FIELD-ERROR-018 | UNSEEN | STILL OPEN | D | ZIGi from Goals (on-device answers): type only spaces + Enter → nothing is sent and Send stays disabled, with no title, no aria-describedby and no hint near the box saying why. |
| BUG-003 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D12 | Same as TK-024: the oversell error is at the Quantity field, focused, not off-screen at the top. |
| TK-024 | AL-FIELD-ERROR-018 | STILL OPEN | FIXED | D12 | Portfolio, Buy 0.4 BTC, then Sell 10 → Save transaction: "This would take the holding below zero on 1 Sept 2026. Record what came in first, or change the amount." as the Quantity field's own alert (y 1964, Save at 2209, focus on Quantity, aria-invalid), not at the page top. Empty quantity → "Enter a quantity above zero." at the field; the Save button moved 2 px (no jump). |
| TK-174 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Edit Goal details → target 0 → Save: "Enter an amount above 0." under the field, field highlighted (aria-invalid) and focused; no "Could not save." toast. |
| TK-175 | AL-FIELD-ERROR-018 | UNSEEN | FIXED | D | Edit target -5 → "Enter an amount above 0." inline (not toast-only), the same sentence as 0, so the two no longer contradict. |
| P8 | AL-FIELD-ERROR-018 | STILL OPEN | FIXED | D12 | After the refused oversell, a valid Sell 0.1 → the "below zero" alert is gone (no lingering message). |

## AL-FIELD-ERROR-019

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-034 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Goal page → Edit goal details → Edit target -5 → Save Goal details: "Enter an amount above 0." in a role=alert 41 px above the Save button (y 4946 vs 4987), the field focused and aria-invalid, described by the message. Not 3,500 px away. |
| D-101 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Record contribution → Record history only → amount 0 → Save history only: "Enter an amount above 0." (role=alert in the dialog); no raw validation dump. Focus stays on Save and the field is not marked invalid. |
| M-123 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit goal details → target 0 → Save: "Enter an amount above 0." under the field, field focused, aria-invalid; no raw dump; the message goes when a valid value is saved. |
| N-142 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Record history only, amount 0 / -3 / abc: "Enter an amount above 0." / "Enter an amount above 0." / "Enter a number, like 1500 or 12.50."; no raw schema text. |
| N-155 | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Contribution plan, amount 0 / -5 → "Enter an amount above 0." (no raw schema text; fixed). But the alert is drawn outside the plan form, about 4,400 px above the Planned amount field (off-screen), focus stays on Save contribution plan and the field is not marked invalid. |
| D-141 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Wizard step 1, all empty, Continue: "Give your goal a name." (role=alert) right under Goal name (alert y 1149, counter y 1131), focus moved to Goal name, aria-invalid. No browser bubble (the app's own message appears). |
| G-006 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Record history only, amount 0: "Enter an amount above 0."; no JSON `[{"code":"custom",…}]`; -3 gets the same sentence (no "non-negative"). |
| G-025 | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | 375 | 375 px wizard, Reach a number (GOLD) + Add a contribution plan: step 2 no longer has a "Price per Goal unit" field (fields: Planned amount, Contribution asset, cadence, dates) and Continue goes on to step 3 with no message, so the off-screen price error cannot arise; the plan asks for no price. |
| M-101 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit goal details, name emptied → Save: "A name can’t be empty." at the field, focused, aria-invalid; nothing reports "saved". |
| N-148 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Same steps as N-142 (Record history only): amount 0 → "Enter an amount above 0."; no raw schema text. |
| T-093 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Goal forms checked (wizard target, Edit target, Record history only, milestones, plan): every refusal is a plain sentence ("Enter an amount above 0.", "Enter a number, like 1500 or 12.50.", "Use at most 2 decimal places.", "Enter an amount up to a trillion (1,000,000,000,000)."); no raw developer text anywhere. |
| T-121 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit target 0 → "Enter an amount above 0." (no JSON); Edit deadline 2020-01-01 → "Choose today or a later date for the deadline." at the field (aria-invalid, focused; min=2026-11-04). |
| B-024 | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Wizard target: 0 and -5 now both say "Enter an amount above 0." at the field (fixed there). Still inconsistent elsewhere: the wizard's live preview card says "Unreadable amount · Enter a non-negative decimal amount." for -5 / abc, and Fund Goal says "non-negative" for -5 while refusing 0. |
| BUG-012 | AL-FIELD-ERROR-019 | UNSEEN | STILL OPEN | D | Goal → Fund Goal → Cash → Cash amount: 0 → "Enter an amount above 0."; -5, abc and 1e3 → "Enter a non-negative decimal amount." (role=alert at the field, focused, aria-invalid). The copy still implies 0 is fine while 0 is refused. |
| G-001 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Wizard step 1, name filled, Target empty, Continue: "Enter your target." at the Target field (alert y 1673), focus moved to Target amount, aria-invalid; the page scrolls to it. |
| G-007 | AL-FIELD-ERROR-019 | UNSEEN | STILL OPEN | D | Savings goal (200 USD), Milestones: add "Too big" with value 300 → alert "A milestone's value is above zero and at most the Goal's target."; then tick another milestone, then open and close Record contribution: the same role=alert sentence is still shown under the form. |
| G-008 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Milestone with an empty name → "Give the milestone a name."; with value "abc" → "Enter a non-negative decimal amount." (role=alert). Something is said now (was: nothing happens). |
| L-025 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Wizard, Finish a project, no milestones, Continue: "Add at least one milestone." at the "Milestones, one per line" field (not in the preview card), field focused and aria-invalid. |
| M-057 | AL-FIELD-ERROR-019 | UNSEEN | STILL OPEN | D | Same Fund Goal form as BUG-012: 0 → "Enter an amount above 0." but -5 / abc / 1e3 → "Enter a non-negative decimal amount.". The placement is fixed (at the field, focused); the wording is not. |
| DV-003a | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Wizard target 0 → "Enter an amount above 0.", -5 → "Enter an amount above 0.", abc → "Enter a number, like 1500 or 12.50." (field fixed). The preview card next to the field still shows "Unreadable amount · Enter a non-negative decimal amount." for -5 and abc, so the same screen still carries the contradictory sentence. |
| DV-003c | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Wizard target "1,5": the field keeps "1,5" and the preview reads "US$1.50"; Review says "Target US$1.50"; the goal page "of US$1.50". The comma reading is shown before Create (PRIMITIVES 3d reads a decimal comma on purpose). |
| DV-009 | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | History only 0 → "Enter an amount above 0." (a reason now, was "History was not saved."). Remaining part of the finding ("no focus"): focus stays on Save history only and the amount field is not marked invalid. |
| DV-025a | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit target 0 → "Enter an amount above 0." inline (not a toast), focus + aria-invalid; -5 gets the same sentence (no "non-negative"). |
| DV-033a | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Contribution plan amount 0 → refused "Enter an amount above 0." (no 0 plan, no BEHIND) and -5 gets the same sentence (no "non-negative"). New placement problem: the alert sits outside #contribution-plan, ~4,400 px above the field (top -4467 in a 1113-px viewport), focus on Save, field not aria-invalid. |
| DV-049a | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Field: 0 / -5 → "Enter an amount above 0.", empty → "Enter your target." (each true). Same screen, preview card for -5: "Unreadable amount · Enter a non-negative decimal amount." (the old copy). |
| DV-050a | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | History only 0 → "Enter an amount above 0." (a reason now). |
| DV-055a | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit target 0 → one inline "Enter an amount above 0." under the field (not "Could not save." twice). |
| DV-097 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit target 0 → "Enter an amount above 0."; -10 class (-5) → same; 2500.555 → "Use at most 2 decimal places.". |
| DV-144 | AL-FIELD-ERROR-019 | UNSEEN | STILL OPEN | D | Wealth → + Add asset → Cash: 0 → "Enter an amount above 0."; blank → "Enter an amount." (fixed parts); -50, abc and 1e3 → still "Enter a non-negative decimal amount." while 0 is refused. Empty stock save: the stock form needs the price catalog (offline here, "Automatic prices are unavailable … Use manual entry"), so that part was not reproduced. |
| N-157 | AL-FIELD-ERROR-019 | UNSEEN | FIXED | D | Edit Goal details: no-cap part — 1e20 and 1e28 refused with the trillion message; 0 refused with "Enter an amount above 0." at the field. |
| N-DV-16 | AL-FIELD-ERROR-019 | UNSEEN | CHANGED | D | Adopted: "Enter an amount above 0." (wizard, Edit target, Record history only, plan, Fund 0), "1 milestone" (cards and page). Not adopted everywhere: Fund Goal's -5 / abc still "Enter a non-negative decimal amount.", and the wizard preview card still uses it. Other suggested strings were not exercised. |
| MO-121 | AL-FIELD-ERROR-019 | OTHER | CHANGED | D | Wizard field: 0 and -5 → "Enter an amount above 0."; "1e9" → "Enter a number, like 1500 or 12.50."; 1e21 → the trillion cap (fixed). The preview card beside it still reads "Enter a non-negative decimal amount." for -5. |
| N-MO-33 | AL-FIELD-ERROR-019 | OTHER | FIXED | D | Wealth → Accounts, debts & net worth → Add (Savings) balance 1000000000000 → "€1,000,000,000,000.00 is more than a billion — unusually large for a balance. Check the digits; if it is right, save again to keep it." with Keep this amount (no "non-negative" text). |
| NB-183 | AL-FIELD-ERROR-019 | OTHER | FIXED | D | Edit target 0 → "Enter an amount above 0." at the field; −3 → the same sentence (no "non-negative" while 0 is refused). Name length: Edit goal name has a visible "0 / 80" counter, so the cut is no longer silent (it is 80 now, not 100). |
| NB-189 | AL-FIELD-ERROR-019 | OTHER | STILL OPEN | D | Record contribution → Fund your goal → Cash amount -5, "abc", "1e3" → all "Enter a non-negative decimal amount." (wrong for a negative and for letters), unchanged. |

## AL-LAYOUT-375-014

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-098 | AL-LAYOUT-375-014 | UNSEEN | FIXED | 384×222 | At 384×222 (the 500 % zoom box) Earn, Activity, Health, Habits, Wealth and Markets have no page-wide sideways scroll (scrollWidth = width); the Earn and Activity chip rows are fading scrollers. The "navigation differs by breakpoint" part was not judged. |
| D-068 | AL-LAYOUT-375-014 | UNSEEN | FIXED | 388 / 375 / 384×222 | Showcase at 388 Nebula, 388 Light, 375 Dark and 384×222 (the 500 % zoom box): every sideways tab/filter row on Habits ("Filter habits"), Wealth ("Show"), Markets ("Market views"), Health ("Health views"), Activity ("Activity categories") and Earn (chips rail) has a right-edge fade (CSS mask) and a data-scroll-more marker; no page-wide sideways scroll. (One Health card carousel, "Maintenance estimate", has no fade; it is a card row, not a tab row.) |
| D-255 | AL-LAYOUT-375-014 | UNSEEN | FIXED | 375 / 388 | 375 Dark: Habits filter chips, Markets filters, Activity category cards and intro cards, Earn provider chips are scrollers with an edge fade (mask gradient); the cut item sits under the fade. |
| T-147 | AL-LAYOUT-375-014 | UNSEEN | FIXED | 375 | Same as D-255: each chip row that is cut at 375 has an edge fade cue. |
| DV-087a | AL-LAYOUT-375-014 | UNSEEN | FIXED | 375 Dark | Activity at 375 Dark: "Activity categories" ("Habit · 206" under the fade) and the intro cards row both have a right-edge fade. |
| DV-222 | AL-LAYOUT-375-014 | UNSEEN | FIXED | 388 | Activity at 388 (Nebula and Light): the filter row and the intro cards row ("Every kind of wealth" cut) both fade at the edge (mask gradient, data-scroll-more). |
| DV-252a | AL-LAYOUT-375-014 | UNSEEN | FIXED | 388 | Wealth at 388: the "Show" holdings filter row (1408 / 388 px) fades at the right edge. |
| DV-267b | AL-LAYOUT-375-014 | UNSEEN | FIXED | 768 | 768×1024 Settings: the 6 tab chips sit on one row (44 px high, one top position), a sideways row (scrollWidth 872 / 541), not two rows of ~80 px. |
| MO-080 | AL-LAYOUT-375-014 | OTHER | FIXED | 375 | 375×844 Health: the view strip scrolls sideways (1151 / 341 px) and now has a right-edge fade (mask linear-gradient to transparent over the last 76 px) plus a scroll button; "Meals & planning" sits under the fade. |

## AL-LIMITS-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-070 | AL-LIMITS-004 | UNSEEN | FIXED | D | ZIGi box: a 5,000-character paste is kept and the box shows "5,000 of 15,000 characters" (a stated limit and counter); no freeze. |
| BN-140 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard Goal name, a 247-character paste: kept 80 and the field says "Names hold up to 80 characters; the last 157 were left out." with a "0 / 80" counter ("0 characters left" announced). |
| BN-141 | AL-LIMITS-004 | UNSEEN | CHANGED | D | Target 99,999,999,999,999,999,999,999 → refused "Enter an amount up to a trillion …" (cap fixed). Wording: the field says "Enter an amount above 0." for both 0 and -5 (fixed), but the live preview card beside it still says "Unreadable amount · Enter a non-negative decimal amount." for -5 and abc. |
| BN-163 | AL-LIMITS-004 | UNSEEN | FIXED | D | Help search, a 300-character paste: kept 80 and the page says "Help search reads the first 80 characters; the rest was left out. …". |
| BN:ZIGi #22 | AL-LIMITS-004 | UNSEEN | FIXED | D | Same steps as BN-070 ("Tell me about staking." × ~217): "5,000 of 15,000 characters" is shown beside Send. |
| N-BN-19 | AL-LIMITS-004 | UNSEEN | FIXED | D | The wizard date field now has max=2126-12-31; a far year is refused with "Choose a target date up to 2126.". |
| D-071 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard target 999999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)." at the field (alert y 1673, field focused, aria-invalid); 0 / -5 → "Enter an amount above 0.", empty → "Enter your target." (each true, at the field, not 1,550 px away). |
| D-102 | AL-LIMITS-004 | UNSEEN | FIXED | D | Record history only, amount 99999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)."; dialog stays open, nothing recorded. |
| N-143 | AL-LIMITS-004 | UNSEEN | FIXED | D | History path: 1e20 refused at the cap (see D-102); Fund path: see BUG-011 row. |
| BUG-011 | AL-LIMITS-004 | UNSEEN | FIXED | D | Fund Goal → Cash 999999999999 → Continue: "US$999,999,999,999.00 is more than a billion — unusually large for a value. Check the digits; if it is right, save again to keep it." with Keep this amount; 9999999999999 → "Enter an amount up to a trillion.". (Cash path; the bot used USD Coin in the same dialog.) |
| BUG-078 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard target 0.0001 → "Use at most 2 decimal places." (field aria-invalid, focused); not accepted. |
| L-008 | AL-LIMITS-004 | UNSEEN | FIXED | D | Target 0.0001 can no longer be entered ("Use at most 2 decimal places."), so "0 123 of 0 123" cannot arise. Numeric symbol part: not replayed separately. |
| T-119 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard 21-digit target (999999999999999999999) is blocked with the trillion message; negative/zero/text/3-decimal still blocked ("Enter an amount above 0.", "Enter a number, like 1500 or 12.50.", "Use at most 2 decimal places."). |
| DV-003b | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard target 999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)."; stays on step 1. |
| DV-025c | AL-LIMITS-004 | UNSEEN | FIXED | D | Edit target 99999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)." at the field; not saved. |
| DV-049b | AL-LIMITS-004 | UNSEEN | FIXED | D | Same as D-071: 1e21 is refused at the field with "Enter an amount up to a trillion (1,000,000,000,000).". |
| DV-050b | AL-LIMITS-004 | UNSEEN | FIXED | D | Same as D-102: 1e20 history refused at the trillion cap. |
| DV-054a | AL-LIMITS-004 | UNSEEN | FIXED | D | Same as D-195: amounts above a trillion are refused at the field, so the unclamped 1e20 Activity row cannot arise. |
| DV-055b | AL-LIMITS-004 | UNSEEN | FIXED | D | Edit target 12345678901234567890123456789 → "Enter an amount up to a trillion (1,000,000,000,000)."; not saved. |
| DV-057d | AL-LIMITS-004 | UNSEEN | FIXED | D | The largest allowed target reaches Today as "US$1,000,000,000,000.00 remaining" inside its card; the 1e28 target cannot be saved (trillion cap). |
| DV-084b | AL-LIMITS-004 | UNSEEN | FIXED | 375 Dark | The largest target now allowed is 1,000,000,000,000 (a "more than a billion … Keep this amount" check first); at 375 Dark the card's "/ US$1,000,000,000,000.00" stays on one line inside the card. |
| DV-085 | AL-LIMITS-004 | UNSEEN | FIXED | 768 Dark | At 768 Dark the same target line is one line (no mid-number wrap), inside the card. |
| DV-098 | AL-LIMITS-004 | UNSEEN | FIXED | D | Edit target 99999999999999999999 → trillion message; no "Target revised" event, nothing saved. |
| DV-125 | AL-LIMITS-004 | UNSEEN | FIXED | D12 | Goals list card with the largest allowed target: "/ US$1,000,000,000,000.00" on one line, not past the card edge (the 1e20 target that overflowed can no longer be saved). |
| D-195 | AL-LIMITS-004 | UNSEEN | FIXED | D | The 23-digit amount can no longer be recorded: Record history only 99999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)."; Fund Goal 9999999999999 → "Enter an amount up to a trillion.". So no "$99,999,999,999,999,999,999.00" row can reach Activity. |
| PR-072 | AL-LIMITS-004 | UNSEEN | FIXED | D12 | Health → Weight: 1000 and 401 kg → "Enter a weight from 20 to 400 kg." (aria-invalid); 400 → "Weight saved.". Length limits now speak: a 1,100-character sleep note stops at 1,000 with the "0 characters left" counter; a long asset name says "Names keep 100 characters, so the end … was left out" (TK-149 row). |
| PR-089 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard target 99999999999999999999 → "Enter an amount up to a trillion (1,000,000,000,000)." at the field; not accepted. |
| PR-090 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard name: limit 80 with a counter and the cut message (was ~72 with no counter). |
| PR-092 | AL-LIMITS-004 | UNSEEN | FIXED | D | Wizard Target date 9999-12-31 → "Choose a target date up to 2126." at the field (max=2126-12-31, aria-invalid, focused). |
| BUG-001 | AL-LIMITS-004 | UNSEEN | FIXED | D12 | Wealth → + Add asset → Custom, Quantity 99999999999999999999 → "Enter a quantity with at most 18 digits before the decimal point." at the field (aria-invalid); not saved. |
| L-001 | AL-LIMITS-004 | UNSEEN | FIXED | D12 | Same as PR-072: a 1,000 kg weight is refused ("Enter a weight from 20 to 400 kg."). |
| TK-176 | AL-LIMITS-004 | UNSEEN | FIXED | D | Edit target 999999999999 → not saved silently: "US$999,999,999,999.00 is more than a billion — unusually large for a goal. Check the digits; if it is right, choose “Keep this amount”." with a Keep this amount button (focus on Save). |
| TK pass-1 "No upper limit on values" | AL-LIMITS-004 | UNSEEN | FIXED | D12 | Wealth → Add an account or debt → Credit card, owed 999999999999.99 → "€999,999,999,999.99 is more than a billion — unusually large for a debt. Check the digits; if it is right, save again to keep it." (Keep this amount); 99999999999999999999 → "Enter an amount up to a trillion.". |

## AL-LIMITS-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-207 | AL-LIMITS-005 | UNSEEN | FIXED | D | 247-character paste in the wizard: cut at 80, and said so ("Names hold up to 80 characters; the last 157 were left out."). Not silent. |
| L-023 | AL-LIMITS-005 | UNSEEN | FIXED | 375 | 375 px wizard, Finish a project: the "Milestones, one per line" field is on step 1; a 120-character milestone → "Milestone 1 is 120 characters long; use at most 100." at the field (focused, aria-invalid, in the viewport at y 487). |
| BUG-008 | AL-LIMITS-005 | UNSEEN | FIXED | D | Same as BN-140: the goal name has a stated 80-character limit, a counter, and a message when a paste is cut. |
| BUG-016 | AL-LIMITS-005 | UNSEEN | FIXED | D | Plural: "3 milestones of 4 milestones · Remaining 1 milestone", card "1 milestone remaining", "1 milestone / 4 milestones"; name cut: the wizard says what was cut, Edit shows the counter. |
| M-011 | AL-LIMITS-005 | UNSEEN | CHANGED | D | Silent cut fixed: goal name 80 with counter + cut message in the wizard, counter in Edit. Limits still differ per form (goal name 80, habit title 100, task title 140, Checklist own item 60, milestone 100), as the one limits table defines them. |
| T-062 | AL-LIMITS-005 | UNSEEN | FIXED | D | Wizard name cut at 80 with the message; Edit goal name has a "0 / 80" counter. |
| T-078 | AL-LIMITS-005 | UNSEEN | FIXED | D | "Why it matters to you", a 1,200-character paste: kept 1,000 with the counter badge "0 characters left" beside the field while focused. |
| T-079 | AL-LIMITS-005 | UNSEEN | STILL OPEN | D | "An emoji on it (optional)": typed "abcdefgh" → Save the plan → "Vision saved. Undo" and "abcdefgh" shows on the goal; any 8 characters are still accepted. |
| D-202 | AL-LIMITS-005 | UNSEEN | FIXED | D | Habits → + New habit, a 234-character paste: kept 100 and "Your title had 234 characters; a habit title holds 100, so it was cut after the 100th. Check the end of it.". |
| D-043 | AL-LIMITS-005 | UNSEEN | FIXED | D | Edit habit, a 190-character paste: the same message under Habit title ("… cut after the 100th"), not silent. |
| DV-019c | AL-LIMITS-005 | UNSEEN | FIXED | D | Limits agree: the wizard refuses a 150-character milestone ("Milestone 1 is 150 characters long; use at most 100.") and the goal page's New milestone field holds 100 (maxlength 100, "0 characters left" counter); a 150-character milestone can no longer be saved there. |
| DV-025e | AL-LIMITS-005 | UNSEEN | FIXED | D | Edit goal name: a 230-character paste keeps 80; the Edit field now has the "0 / 80" counter ("0 characters left" announced). It does not repeat the wizard's "were left out" sentence. |
| DV-040e | AL-LIMITS-005 | UNSEEN | FIXED | D | New milestone, a 200-character paste: kept 100 and the shared counter beside the focused field reads "0 characters left"; the wizard has the same 100 limit with "Milestone 1 is … characters long; use at most 100.". |
| DV-106 | AL-LIMITS-005 | UNSEEN | FIXED | D | 300-class paste in the wizard name: counter "0 / 80" and the "… were left out." message. |
| DV-153 | AL-LIMITS-005 | UNSEEN | FIXED | D | Today → Customize Today → Add widget → Title and display size → Card title, a 93-character paste: kept 40 with "40 / 40" shown ("0 characters left"). |
| DV-167 | AL-LIMITS-005 | UNSEEN | FIXED | D12 | Tasks title, a 315-character paste: kept 140, "Cut to 140 characters: the pasted text had 315."; blank title → "Type a task first." with a "0 / 140" counter. |
| LS-050 | AL-LIMITS-005 | UNSEEN | FIXED | 375 | Tasks → New task, a 200-character paste: kept 140 and the field says "Cut to 140 characters: the pasted text had 200." with a "0 / 140" counter. |
| LS-H03 | AL-LIMITS-005 | UNSEEN | FIXED | D12 | Same field: a long paste is cut to 140 with "Cut to 140 characters: the pasted text had N." before Add; the toast then says "Added “…”". |
| LS-H14 | AL-LIMITS-005 | UNSEEN | FIXED | D12 | Checklist → Quick add → Name, a 105-character paste: kept 100 (the habit form's own limit, no longer 80) with the "0 characters left" counter beside the field. |
| LS-H29 | AL-LIMITS-005 | UNSEEN | CHANGED | D12 | Fixed parts: quick-add limit 100 = habit form 100 (with counter); "   " → "Give it a name." (aria-invalid). Still open parts: adding "H1 water" twice is accepted silently (the second becomes "H1 water (2)"), and the path label still shows "Water" for "H1 water" (planet name "H1 water: not done yet"). |
| LC-007 | AL-LIMITS-005 | UNSEEN | FIXED | D12 | Edit path → Your own item → What to do: the limit is written under the field ("Up to 60 characters · 2 of 60 items on your path.") and a 200-character paste stops at 60 with the "0 characters left" counter. |
| MO-105 | AL-LIMITS-005 | OTHER | FIXED | D12 | Health → Foods & recipes → New food, Food name of 250 "A" + Save food: "A name can be at most 120 characters (this one has 250)." at the field (focused, aria-invalid); nothing is cut silently. |
| MO-131 | AL-LIMITS-005 | OTHER | FIXED | D | Edit Goal details, 200+ character name: the field holds 80 with a visible "0 / 80" counter (was a silent cut to 100). |
| TK-149 | AL-LIMITS-005 | STILL OPEN | FIXED | D12 | Wealth → + Add asset → Custom → Asset name, a 237-character paste: kept 100 and "Names keep 100 characters, so the end of what you pasted was left out (137 characters). Check the name before saving." under the field. |

## AL-PERF-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-211 | AL-PERF-011 | UNSEEN | FIXED | D12 | Showcase, Habits → Goals: at ~120 ms nothing yet, at ~240–480 ms each of the first three cards shows a skeleton in its art box, then the art (no empty dark header blocks). |
| B-066 | AL-PERF-011 | UNSEEN | FIXED | 375 | 375 with one goal (Emergency fund): sampled every 120 ms while Today loads, "No active goal yet" never appears; the goal name shows beside "Loading habits…". |
| BUG-052 | AL-PERF-011 | OUT OF SCOPE | OWNER DECISION | — | L10b P-DVR-29 records the 358 KB ZIGi idle animation as the locked ZIGi look (AL_SCOPE F, standing decisions, ADR-037 O1). The cold-TTFB part was not measured: a local production server is not the deployed host. |
| D-213 | AL-PERF-011 | UNSEEN | FIXED | D12 | Hard loads of /app/markets and /app/portfolio: at ~100 ms the page already has its h1 and a skeleton (.aa-skeleton), then the content; no blank dark void. |
| D-006 | AL-PERF-011 | UNSEEN | FIXED | D12 | Direct load of /app/habits: h1 and a skeleton at ~100 ms, then the page. |

## AL-PERSISTENCE-012

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-155 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | Wizard: type "Berlin draft", 1500, Continue twice (the tab's draft is stored: step 2, name, target), reload: a "Leave site?" (beforeunload) prompt again; after accepting, the stored draft is gone and the wizard opens empty on step 1 with no "Your unfinished Goal is back" line. The reload still asks, and now nothing comes back (the review-habit tick cannot come back either). |
| N-BN-20 | AL-PERSISTENCE-012 | UNSEEN | FIXED | D | Wizard: name "Switch test", target 1200, then pick "Reach a number of something": no "Change how this Goal is measured?" dialog and the target stays 1200. |
| N-BN-21 | AL-PERSISTENCE-012 | UNSEEN | FIXED | D | Reloading an untouched goal page and leaving it with Edit goal details open but unchanged: no "Leave site?" prompt. The prompt now comes only with unsaved typing (wizard with typed values, Edit with a changed name). |
| D-205 | AL-PERSISTENCE-012 | UNSEEN | CHANGED | D | The wizard has "Cancel and go back" on every step and Escape in the name field leaves to /app/goals (fixed). Leaving with typed text through the sidebar still uses the browser's own confirm(): "Discard your unsaved Goal changes?". |
| BUG-076 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | Type a name and target, browser Back: a "Leave site?" prompt now warns, but on returning to /app/goals/new the wizard is empty (no draft), and a reload also loses it (BN-155 row). |
| T-077 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D12 | 1280 fresh goal page: type "If it rains, then I walk indoors." in "Your if-then plan" (not saved), click "The ocean gradient" swatch → "Vision saved. Undo" and the plan field is empty: the unsaved plan text is thrown away. |
| G-026 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | The wizard writes its draft to this tab (sessionStorage `zigoals:draft:goal-wizard:v1` holds the typed name), but leaving and coming back (sidebar, Escape, Back or reload) always shows an empty wizard with no "unfinished Goal" line: no draft comes back in the app. |
| D-206 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | Habits → + New habit → type "Kbd" → focus Cancel → Enter: the form closes with no question, and reopening + New habit shows an empty title (the text is lost). (Edit habit with an unsaved change does ask "Discard changes".) |
| DV-004 | AL-PERSISTENCE-012 | UNSEEN | FIXED | D | Steps 1, 2 and 3 of a wizard never left show no "Your unfinished Goal is back…" banner. |
| DV-056b | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | Type "Esc test", press Escape: the wizard leaves to /app/goals with no question (the draft is in sessionStorage), and reopening /app/goals/new shows an empty name: the typed text is lost to the person. |
| DV-064 | AL-PERSISTENCE-012 | UNSEEN | NOT POSSIBLE | D | No draft is restored any more (BN-155/G-026 rows), so there is no "restored, untouched draft" to leave. Leaving an empty wizard asked nothing. |
| N-DV-02 | AL-PERSISTENCE-012 | UNSEEN | STILL OPEN | D | Leaving the wizard with a typed name through the sidebar: the guard is still the browser's native, unthemed confirm "Discard your unsaved Goal changes?". |

## AL-ROUNDING-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-013 | AL-ROUNDING-004 | UNSEEN | FIXED | D12 | Showcase Goals Cards / Vision board / Tree: each goal shows one percentage in all three (Emergency fund 45 %, Sleep 8 hours a night 88 %, Create 2 hours a day 95 %, …); ring and caption agree ("88 %" / "88% of the way"). No 99 % vs 100 %. |
| G-049 | AL-ROUNDING-004 | UNSEEN | FIXED | D12 | Same as G-013: the average goal (now "Sleep 8 hours a night") reads 88 % in Tree and 88 % in Vision board. |
| L-075 | AL-ROUNDING-004 | UNSEEN | STILL OPEN | D | Funded 125 of 300: ring 42 %, but the asset mix reads "Cash US$125.00 · 41.66%" and "58.34%" (and 16.66% at 50): the shares are still cut, not rounded (41.666… → 41.66). The ISO-date part is fixed (dates read "21 Oct 2027"). |
| DV-043a | AL-ROUNDING-004 | UNSEEN | FIXED | D | Run a 10K (4 milestones) all ticked → goal page "100 % MILESTONES COMPLETE"; Goals → Cards / Vision board / Tree (All and Completed): ring "100 %", progressbar 100, caption "Finished". No 99 % vs 100 %. (Goal completed; Close was not reached by the script.) |
| NB-252 | AL-ROUNDING-004 | OTHER | FIXED | D | Trip fund 300 USD, Fund Goal 50 cash → toast "That moved Trip fund 2 to 17%." and the ring/card "17 %" (asset mix "16.66%"): toast and card agree. |
| PR-004 | AL-ROUNDING-004 | UNSEEN | FIXED | Sc14 | Showcase 1440: "Japan adventure" (US$2,500 of US$6,000 = 41.7 %) reads 42 % on Today ("BEHIND 42 %"), on the Goals card, Vision board and Tree; no 41 % anywhere looked at (Today, Goals, Wealth, Portfolio, Markets). |
| PR-008 | AL-ROUNDING-004 | UNSEEN | NOT POSSIBLE | Sc14 | No 10.99 % or 11 % value appears on Wealth, Goals, Portfolio or Today in the Showcase (folds opened), so the pair the bot compared cannot be found to compare. |
| PR-023 | AL-ROUNDING-004 | UNSEEN | FIXED | Sc14 | Showcase Goals: ring and caption agree in Cards, Vision board and Tree for every goal (45, 65, 42, 50, 50, 95, 88 %); Completed filter: "Drink 2 litres a day Finished 100 %", "8,000 steps a day, all summer Finished 93 %" (not "38 % not on target"). |
| X3-21 | AL-ROUNDING-004 | UNSEEN | FIXED | D | Same as DV-043a: ring 100 % = caption in Vision board and Tree for the finished project goal. |

## AL-ROUNDING-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-090 | AL-ROUNDING-005 | UNSEEN | FIXED | D | Calculator 1,000 + 100/month at 100 % for 60 years: "Too large to estimate here. With these numbers the result passes US$1,000,000,000,000,000.00, beyond what this calculator models" instead of a 22-digit amount. |
| L-060 | AL-ROUNDING-005 | UNSEEN | CHANGED | D12 | Showcase Activity: no "0 / 0 completed" and no unseparated "8000 / 8000" seen; still "Contribution Emergency fund · 1 unit of a custom asset". The feed says "Times are shown in Europe/Brussels". |

## AL-TIMEZONE-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-029 | AL-TIMEZONE-004 | UNSEEN | FIXED | D12 | Settings → Your time zone: "Foo/Bar" → "“Foo/Bar” is not a time zone name. Pick one from the list…"; "UTC+13" → "UTC+13 is a fixed offset, with no daylight-saving rules. Choose the place instead, such as … Pacific/Auckland." under the field (aria-invalid, focused); "europe/paris" saved and shown as "Your days follow Europe/Paris.". |
| B-175 | AL-TIMEZONE-004 | UNSEEN | FIXED | D12 | Empty field → Save my time zone: "Not written down yet: your days follow this device (Europe/Brussels)."; after a zone is saved a "Follow this device (Europe/Brussels)" button is offered. |
| B-067 | AL-TIMEZONE-004 | UNSEEN | FIXED | D12 | "UTC+13" and "UTC-10" are each explained under the field ("… is a fixed offset … Choose the place instead, such as America/Adak or Pacific/Honolulu or Pacific/Rarotonga."), not the generic sentence. |
| B-069 | AL-TIMEZONE-004 | UNSEEN | FIXED | D12 | "europe/paris" and " Europe/Paris " are both saved as "Europe/Paris" ("Your days follow Europe/Paris."). |
| N-BN-17 | AL-TIMEZONE-004 | UNSEEN | NOT REPLAYED | — | Needs a service: the Staking snapshot and Chess "updated" times come from network reads (blocked). Seen around it: with Asia/Tokyo saved, Settings says "clock times shown elsewhere stay in this device’s own time" and Activity says "Times are shown in Asia/Tokyo" (11:32). |
| D-076 | AL-TIMEZONE-004 | UNSEEN | STILL OPEN | D12 | Journal settings: timezone "Mars/Phobos" → "Check the numbers: each needs a number …" (a numbers error, nothing highlighted); Personal water target 1 → "Journal preferences saved." with no caution (1 mL accepted silently). Fixed parts: -5 → highlighted "… not below zero."; 99999999 → "Enter 1 to 100,000.". |
| B-038 | AL-TIMEZONE-004 | UNSEEN | FIXED | D12 | Showcase, device Pacific/Honolulu at 22:30 on 3 Nov (08:30 UTC 4 Nov): Activity's "Today" group lists only records dated "3 Nov 2026" (Honolulu's today). |
| DV-033c | AL-TIMEZONE-004 | UNSEEN | STILL OPEN | D | Contribution plan form: "Plan time zone" is prefilled "UTC" and the form says "Dates use UTC." for a Europe/Brussels device. |
| DV-038d | AL-TIMEZONE-004 | UNSEEN | STILL OPEN | D | Goal page timeline filters are still labelled "From date (UTC)" / "Through date (UTC)". |
| DV-046f | AL-TIMEZONE-004 | UNSEEN | FIXED | D | /app/activity now says "Times are shown in Europe/Brussels" beside the clock times ("03:30"). |
| DV-054e | AL-TIMEZONE-004 | UNSEEN | FIXED | D | Same: Activity names the zone ("Times are shown in Europe/Brussels"). |
| N-DV-15 | AL-TIMEZONE-004 | UNSEEN | FIXED | D | The suggested time-zone line exists on Activity: "Times are shown in Europe/Brussels". |
| LS-031 | AL-TIMEZONE-004 | UNSEEN | STILL OPEN | 375 | 375 fresh, device Europe/Brussels at 23:30 on Wed 4 Nov, Settings → time zone Pacific/Auckland saved ("Your days follow Pacific/Auckland."). Checklist shows "Thu 5 Nov"; Tasks still lists a task due 4 Nov under Today as "Due today". |
| LS-066 | AL-TIMEZONE-004 | UNSEEN | STILL OPEN | D12 | Same stored task (due 4 Nov 23:59) at the same instant: New York shows it under Today, Tokyo under Overdue (floating device date), and with an app zone saved Tasks still ignores it (LS-031 row). |
| X3-29 | AL-TIMEZONE-004 | UNSEEN | NOT REPLAYED | — | Needs a service: same surfaces as N-BN-17 (Staking/Chess timestamps). Activity follows the saved zone ("Times are shown in Asia/Tokyo"). |

## AL-TOAST-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-021 | AL-TOAST-011 | UNSEEN | CHANGED | D12 | Fixed: several refused files leave one line under the card used last; a non-encrypted file in "Restore an encrypted backup" is answered at once ("This file is not a ZIGoals protected (encrypted) backup. … Existing data was not changed."). Still: the module message ends with the internal code "(NOT_A_BACKUP)". |
| D-219 | AL-TOAST-011 | UNSEEN | FIXED | D12 | Settings toggles: Quick add / ZIGi button / Music player each announce in one form ("Quick add is hidden. You can show it again here at any time." / "Music player shows again."), each replacing the last; three refused backup files leave exactly one line in the backups grid. The wrap-up switch was not found in the page text to compare. |
| D-037 | AL-TOAST-011 | UNSEEN | CHANGED | D12 | Showcase Goals → ⋯ on Emergency fund → "Add progress to Today": the card no longer grows (643 px before and after) and the status says "Emergency fund progress added to Today."; still no link to Today and no Undo (no toast). |
| D-105 | AL-TOAST-011 | UNSEEN | FIXED | D | Edit goal details → change the name → Save Goal details: the edit panel closes, the title is the new name, and "Goal details saved." is shown inside the viewport (top 1023 of 1113). |
| D-240 | AL-TOAST-011 | UNSEEN | FIXED | D12 | Showcase /app: the control under the mascot is now "Hide ZIGi" (44×44, not an 8 px chevron); pressing it shows the app's one toast "ZIGi is hidden. Show it again from the tab at the edge of the screen, or Settings → … Undo" at the bottom centre, visible for 9.6 s (was ~5 s). |
| D-042 | AL-TOAST-011 | UNSEEN | FIXED | D | Complete on a new habit → toast "T9 Water: done for today. Undo"; its ⋯ menu (Options for T9 Run) reads "Add check-in to Today, Add streak to Today, Pause from today, Archive habit…, Delete habit…, Duplicate habit, Ask ZIGi about this habit" (plain words). |
| DV-128 | AL-TOAST-011 | UNSEEN | FIXED | D | Create habit ("Habit created."), then Complete two habits: the live region shows "T9 Stretch: done for today. Undo", then "T9 Run: done for today. Undo"; "Habit created." is not repeated, and each check-off toasts. |
| DV-186b | AL-TOAST-011 | UNSEEN | FIXED | D | ⋯ → Archive habit… → "Archive T9 Run? It leaves your lists today. … you can restore it later, or delete it for good from Archived." → Archive habit: toast "T9 Run is archived today. Undo" and the card leaves. |
| PR-043 | AL-TOAST-011 | UNSEEN | FIXED | Sc14 | Showcase Habits → Options for Read → Archive habit… → Archive habit: toast "Read is archived from 5 Nov 2026. Today keeps its check-in; it leaves your lists tomorrow. Undo" (says what will happen; card stays today as stated). |
| PR-095 | AL-TOAST-011 | UNSEEN | FIXED | D | Same as DV-128: the status follows the latest action; no stale "Habit created.". |
| PR-098 | AL-TOAST-011 | UNSEEN | FIXED | D12 | Health → Sleep: log a night (23:15 → 03:00), Delete the night ending 4 Nov 2026 → status "The night is deleted. Undo" (not a stale "Night updated."). Showcase: removing the sleep goal says "Your sleep goal is removed. Undo". |
| PR-106 | AL-TOAST-011 | UNSEEN | STILL OPEN | Sc14 | Showcase Notes → Notes → delete a note → toast "“2026-11-04” deleted. Undo"; after switching to the Days tab and then the Graph tab the same toast is still on screen. |

## AL-UNDO-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-094 | AL-UNDO-005 | UNSEEN | NOT POSSIBLE | — | Showcase on 4 Nov: the coach offers "Keep my target / Adjust (needs the estimate)" and says "The adjustment appears once the energy estimate has two weeks of logs", so there is no one-click "Adjust to 1650 kcal" to press. |
| D-010 | AL-UNDO-005 | UNSEEN | FIXED | D12 | Showcase Health → Weight and → Import: no "SHOWCASE DATA · fictional example import" strip and no unexplained Undo button. |
| D-047 | AL-UNDO-005 | UNSEEN | FIXED | D12 | Showcase Health diary → "Remove Berry overnight oats": no confirmation, but the toast "Diary entry removed. Undo" (Undo restores). The two-star part was not re-checked. |
| D-056 | AL-UNDO-005 | UNSEEN | FIXED | D12 | Showcase → Wealth → Bitcoin → Archive asset: the dialog has "Release allocations & archive" and "Cancel" (and ×). |
| PR-030 | AL-UNDO-005 | UNSEEN | FIXED | Sc14 | Showcase Tasks → Remove the task → toast "Removed “Example · Sketch the garden bed”. Undo" (no confirm; Undo present). |
| PR-052 | AL-UNDO-005 | UNSEEN | CHANGED | Sc14 | Showcase Wealth spending log → Remove → toast "Removed: Food & drink €4.20. Undo", Undo → "Put back." (fixed). Still no Edit for a money-log entry (0 edit controls). |
| PR-083 | AL-UNDO-005 | UNSEEN | FIXED | D12 | Portfolio coin page (/app/portfolio/coin/bitcoin) has Edit and Remove per transaction; Remove → toast "Transaction removed. Undo", Undo → "The transaction is back.". |
| BUG-032 | AL-UNDO-005 | UNSEEN | FIXED | D12 | Same as PR-083: a transaction can be edited (Edit on the coin page), not only removed. |

## AL-A11Y-026

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-072b | AL-A11Y-026 | UNSEEN | FIXED | D | NOVA → the "Reads · Today, Goals, Habits, Wealth · Health off" chip (Enter) → Permissions: each toggle is a button with role=switch and aria-checked (true/false), named by its row ("Goals and their pace", "Health: food, water, …"); the visible "On"/"Off" is the state of a switch, as switches show. |
| NB-226 | AL-A11Y-026 | OTHER | FIXED | D | Game layer on, /app/journey: the switches are named "Badges", "Rewards shelf" and "Game layer". |
| N-175 | AL-A11Y-026 | OTHER | FIXED | D | Same as NB-226: every Journey switch has an accessible name. |
| PR-003 | AL-A11Y-026 | UNSEEN | FIXED | Sc14 | Same as PR-026: the streak flame has the name "6-day streak: the days every planet was lit". |
| PR-026 | AL-A11Y-026 | UNSEEN | FIXED | Sc14 | Showcase Checklist: the "6" is aria-hidden inside an element named "6-day streak: the days every planet was lit". |
| PR-027 | AL-A11Y-026 | UNSEEN | FIXED | Sc14 | Showcase Settings with every fold opened: 58 switches/checkboxes in the accessibility tree, 0 without a name; NOVA: 79 visible controls, 0 unnamed; Health views are a tablist of 11 tabs with aria-selected (fresh Settings: 69 / 0). |
| PR-039 | AL-A11Y-026 | UNSEEN | FIXED | Sc14 | Showcase Earn with all folds open: the accessibility tree has 115 links and none without a name; the external links read e.g. "ZIGChain docs", "Open Keplr staking" (each with ↗). |

## AL-DATES-008

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-185 | AL-DATES-008 | UNSEEN | CHANGED | D | Help → "Why do dates look the same everywhere now?" says every page writes dates one way ("17 Oct 2026"). The goal page's target date now agrees ("21 Oct 2027"), but the same page's plan panel still prints "Plan terms effective 2026-11-04". |
| B-057 | AL-DATES-008 | UNSEEN | FIXED | D | Goal with target date 2027-10-21: Review "Target date 21 Oct 2027"; goal page "Target date 21 Oct 2027", "On track? By 21 Oct 2027". No ISO date on the page. |
| B-201 | AL-DATES-008 | UNSEEN | CHANGED | D12 | Showcase Habits → Archived → "Evening stretch (Showcase · earlier season)": no ISO date any more (fixed); the archived card still shows Edit and ⋯ next to "Archived". |
| G-003 | AL-DATES-008 | UNSEEN | FIXED | D | Wizard Review: "Target US$1.50", "Target date 21 Oct 2027" (money and date formatted like the rest); no raw "5000 USD" / "2026-12-31". |
| M-060 | AL-DATES-008 | UNSEEN | CHANGED | D | Dates now read one way on goal pages, Activity and Tasks ("21 Oct 2027", "Due Thu, 4 Nov 2027", "Next contribution 4 Nov 2026"); one ISO date is left: "Plan terms effective 2026-11-04" in the contribution plan panel. |
| M-098 | AL-DATES-008 | UNSEEN | FIXED | D | Goal detail: dates read "21 Oct 2027" throughout (hero, plan, On track?); no ISO date. Contribution label part: "Record contribution" / "Fund Goal" / "Record history only". |
| DV-033d | AL-DATES-008 | UNSEEN | CHANGED | D | After saving a 25 USD monthly plan: "Next contribution 4 Nov 2026" and "Next planned date · 4 Nov 2026" (fixed), but the plan panel still says "Plan terms effective 2026-11-04" in ISO. |
| DV-140 | AL-DATES-008 | UNSEEN | FIXED | D12 | Health → Sleep: the form's times are 24-hour (23:15 / 03:00) and so is every summary ("23:15–03:00", "Bedtime · wake time 23:15 · 03:00", "Night ending 4 Nov 2026 23:15 → 03:00"); no "11:15 PM" mix. |
| LS-060 | AL-DATES-008 | UNSEEN | FIXED | 375 | Task due 2027-11-04 → "Due Thu, 4 Nov 2027" (year shown); this year's 20 Nov → "Due Fri 20 Nov". |
| LS-H44 | AL-DATES-008 | UNSEEN | FIXED | 375 | Task due 2099-12-31 → "Due Thu, 31 Dec 2099". |

## AL-PLURALS-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-148 | AL-PLURALS-003 | UNSEEN | FIXED | D | Run a 10K (4 milestones), tick one: hero "1 milestone of 4 milestones", list card "1 milestone / 4 milestones". |
| N-070 | AL-PLURALS-003 | UNSEEN | FIXED | D | Tick a milestone: "1 milestone of 4 milestones" and a status "Milestone done: “Run 3 km without stopping”." (was no toast, and "Private Goal saved. No funds moved." elsewhere). |
| G-028 | AL-PLURALS-003 | UNSEEN | FIXED | D | Header "1 milestone of 4 milestones"; with 3 of 4 ticked the card reads "1 milestone remaining" and the page "Remaining 1 milestone". |
| N-160 | AL-PLURALS-003 | UNSEEN | FIXED | D | Same steps as N-070: singular/plural right on the project page and card. |
| DV-019f-1 | AL-PLURALS-003 | UNSEEN | FIXED | D | Project header: "1 milestone of 4 milestones". |
| DV-022c-1 | AL-PLURALS-003 | UNSEEN | FIXED | D | Project card at 3 of 4: "1 milestone remaining". |
| DV-040b | AL-PLURALS-003 | UNSEEN | FIXED | D | Project hero: "1 milestone of 4 milestones", "3 milestones of 4 milestones". |
| DV-108 | AL-PLURALS-003 | UNSEEN | FIXED | D | Page "3 milestones of 4 milestones · Remaining 1 milestone"; card "1 milestone / 4 milestones", "1 milestone remaining". |
| MO-159 | AL-PLURALS-003 | OTHER | FIXED | D | Goals cards: "1 milestone / 4 milestones", "3 milestones remaining", "1 milestone remaining". |
| N-NB-04 | AL-PLURALS-003 | OTHER | STILL OPEN | D14 Dark | One habit "Drink water" completed once: /app/review shows "Longest streak: Drink water, 1 day" (fixed line) but the same review also says "Habits 1 check-in · longest streak 1 days" and "Your longest running streak: Drink water, 1 days.". |
| N-NB-05 | AL-PLURALS-003 | OTHER | FIXED | D | "1 milestone of 4 milestones" on the goal page (the bot's "1 milestones of 2 milestones" form is gone). |
| PR-058 (+ also closes: | AL-PLURALS-003 | UNSEEN | FIXED | D | Fresh Run a 10K at 3 of 4: card "1 milestone remaining", page "Remaining 1 milestone"; Showcase card "2 milestones remaining" (Sc14). |

## AL-THEME-008

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-139 | AL-THEME-008 | OTHER | FIXED | 375 Light | 375×667 Light → More → "Status & wallet": a styled bottom sheet (rounded top, handle, 16 px padding, light surface, "Status" heading, spaced PUBLIC ALPHA / LOCAL SIMULATION / STORAGE & SYNC sections, bordered × button); screenshot mo-139-375-light.png. |

## AL-TOAST-012

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-051 | AL-TOAST-012 | UNSEEN | FIXED | 375 | Three quick Removes ("QA task 10/11/12"): one toast "Removed 3 tasks. Undo"; Undo brought all three back. |
| LS-058 | AL-TOAST-012 | UNSEEN | FIXED | 375 | 375 fresh, Edit path with 4 own items: three quick removals → one toast "3 items are off your path. Their records stay on their pages. Undo"; Undo → "All 3 are back on your path." and the order is exactly as before (01, 02, 03, 04). |
| LS-072 | AL-TOAST-012 | UNSEEN | FIXED | D12 | 1280 fresh: Remove "QA A", click the page, Ctrl+Z → the list is again QA A, QA B, QA C (Ctrl+Z runs the toast's Undo). |
| LS-075 | AL-TOAST-012 | UNSEEN | FIXED | 375 | Tick QA L1 item 01, 02, 03 (toast "QA L1 item 03 logged for today. Undo"), press Ctrl+Z → item 03 is "not done yet", 01 and 02 stay done. |
| LS-H07 | AL-TOAST-012 | UNSEEN | FIXED | D12 | Remove now shows the app's one toast ("Removed “QA A”. Undo ×", .aa-toast), not small inline text. Remove still has no confirmation; Undo is the safety (as the bot's fix asked). |
| LS-H31 | AL-TOAST-012 | UNSEEN | FIXED | D12 | After Remove the status line is empty with height 0 (data-empty), so no blank gap above the list; the removal persists across reload. |
| C-LS-20 | AL-TOAST-012 | UNSEEN | CHANGED | D | Stacked undo and Ctrl+Z now exist (Tasks: "Removed 3 tasks. Undo" brings all three back; Ctrl+Z undoes; Checklist: "All 3 are back on your path."). No Trash / "Recently removed" list exists on Tasks. |
| N-MO-25 | AL-TOAST-012 | OTHER | FIXED | D12 | Diary → Remove Whole Milk (12 s after logging, no other toast) → "Diary entry removed. Undo" stays on screen 8.0 s (the bot saw ≈6 s on a slow machine); Undo works (D-047 row). |
| N-MO-26 | AL-TOAST-012 | OTHER | FIXED | D12 | Health → Measurements: "Remove the chosen one" now asks "Remove Neck and its 0 readings? You can undo it right after. Remove Neck / Keep it"; after Remove the toast "Neck removed with its readings. Undo" stays when Escape is pressed. |
| NB-127 | AL-TOAST-012 | OTHER | FIXED | D | Complete → toast "T9 Run: done for today. Undo ×" still on screen at 3.5 s and at 6.5 s (was gone in ~3 s). |
| NB-207 | AL-TOAST-012 | OTHER | FIXED | D | Star T9 Water → toast "T9 Water added to your path. Undo"; with the clock run 6 min 10 s on, no toast and no old text in any status region. |

## STILL OPEN

Every run: production build `1a7b0163` on http://127.0.0.1:3101, Chrome, locale en-GB, time zone Europe/Brussels, `/api/**` answered 503, clock 4 Nov 2026 03:30 Brussels unless stated; "fresh" = empty profile with the welcome marked seen.

- **DV-033c** (D, fresh 1920×1113): create a goal (Save an amount, 200 USD) → goal page → Contribution plan → Manage ＋ → Create contribution plan. "Plan time zone" is prefilled `UTC` and the form says "Dates use UTC." on a Europe/Brussels device.
- **DV-038d** (D): same goal page → the timeline's date filters are labelled "From date (UTC)" and "Through date (UTC)".
- **BUG-012** (D): goal → Fund Goal → Cash → Cash amount `-5` (or `abc`, `1e3`) → Continue with this asset → "Enter a non-negative decimal amount."; `0` → "Enter an amount above 0.". The two sentences contradict each other.
- **M-057** (D): same steps and result as BUG-012 (Fund Goal modal wording).
- **NB-189** (D): Record contribution → Fund your goal → Cash amount `-5`, `abc`, `1e3` → each "Enter a non-negative decimal amount." (wrong for a negative and for letters).
- **G-007** (D): goal 200 USD → Milestones → add "Good" value 50, then "Too big" value 300 → alert "A milestone's value is above zero and at most the Goal's target." → tick "Good", then open and close Record contribution: the alert is still shown.
- **L-075** (D): goal "Trip fund 2" 300 USD → Fund Goal → Cash 50 → Continue → Preview → Confirm; again with 75 → the asset mix reads "Cash US$125.00 · 41.66%" and "58.34%" (cut, not rounded; the ring says 42 %).
- **T-079** (D12, 1280): goal page → "An emoji on it (optional)" → type `abcdefgh` → Save the plan → "Vision saved." and `abcdefgh` shows on the goal.
- **DV-144** (D): Wealth → + Add asset → Cash → Cash amount `-50` / `abc` / `1e3` → Save asset → "Enter a non-negative decimal amount."; `0` → "Enter an amount above 0.".
- **D-206** (D): Habits → + New habit → type `Kbd` in Habit title → focus Cancel → Enter: the form closes with no question; + New habit again shows an empty title.
- **LS-031** (375×812 fresh, clock Wed 4 Nov 23:30 Brussels): Settings → Your time zone `Pacific/Auckland` → Save my time zone. /app/checklist shows "Thu 5 Nov"; /app/tasks with a task due 2026-11-04 lists it under Today, "Due today".
- **LS-066** (1280 fresh): store one task due 2026-11-04 at 23:59; open /app/tasks at 2026-11-04T23:01:30Z in America/New_York (Today) and in Asia/Tokyo (Overdue); with an app zone saved, Tasks still ignores it (LS-031).
- **D-212** (D12 Showcase 1280×800): Goals → move the real pointer onto the "Completed" filter chip: no visual change (background, colour, border, shadow, transform, filter, opacity, underline, outline identical).
- **D-076** (D12 fresh): Health → Journal settings → Journal timezone `Mars/Phobos` → Save journal preferences → "Check the numbers: each needs a number …" (a numbers error, nothing highlighted); Personal water target `1` → "Journal preferences saved." with no caution.
- **DV:Z-032** (D fresh): Goals → Ask ZIGi → type three spaces → Enter: nothing is sent; Send is disabled with no title, description or hint saying why.
- **N-NB-04** (1440×900 Dark fresh): Habits → + New habit "Drink water" → Complete → /app/review: "Habits 1 check-in · longest streak 1 days" and "Your longest running streak: Drink water, 1 days." (the card line itself reads "1 day").
- **D-223** (D12 Showcase): Markets → hover the "Stocks" chip and the empty star "Add USD Coin favourite": no visual change.
- **BN-155** (D fresh): Goals → Create a goal → name `Berlin draft`, target 1500 → Continue → Continue → reload → "Leave site?" (accept): the wizard opens empty on step 1, no "unfinished Goal" line, although the draft was stored before the reload.
- **BUG-076** (D fresh): wizard with a name and target → browser Back → "Leave site?" (accept) → open /app/goals/new again: empty, no draft.
- **G-026** (D fresh): type a name in the wizard → leave by the sidebar (accept "Discard your unsaved Goal changes?"), by Escape, by Back or by reload → come back: the draft held in sessionStorage is not shown.
- **DV-056b** (D fresh): wizard → type `Esc test` → Escape → /app/goals with no question → /app/goals/new shows an empty name.
- **N-DV-02** (D fresh): wizard → type a name → click Habits in the sidebar → the browser's native confirm "Discard your unsaved Goal changes?" (unthemed).
- **D-222** (D12 Showcase): Health → quick counters → hover "Increase Push-ups" (+): its gradient fill is replaced by a faint 11 % white, so it looks disabled; the Pull-ups row still reads "No entry today − — No entry today +".
- **PR-106** (Showcase 1440×900): Notes → Notes → delete a note → toast "“2026-11-04” deleted. Undo" → switch to the Days tab, then Graph: the toast is still on screen.
- **T-077** (D12, 1280 fresh): create a goal → goal page → "Your if-then plan": type a sentence (do not save) → click a gradient swatch (e.g. "The ocean gradient") → "Vision saved. Undo" and the if-then plan field is empty.
