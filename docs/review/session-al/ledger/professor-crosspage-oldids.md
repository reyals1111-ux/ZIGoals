# Ledger — Professor (PR-, Showcase Demo track) + FINAL-REPORT §3 "Cross-page consistency" + §4 "Re-check of old bugs" + berlin-nova-setup-log + BRIEF (context)
Source files read in full: professor.md (122 lines), FINAL-REPORT.md lines 1020–1764 (§2 tail, §3 = L1032–1370, §4 = L1371–1764; 745 lines), berlin-nova-setup-log.md (21 lines), BRIEF.md (25 lines). For the old-id master list, the bot files were also grepped (not read in full; their owners read them) for each BUG-0xx / §4-named id with a FIXED / STILL OPEN / CHANGED / NOT RETESTED word nearby, so the Nov 4 verdict could be given where §4 itself only carries the Oct 21 status.

Conditions shorthand: **Sc** = Showcase demo loaded (shared Chrome profile, passes 1–3); **G+Sc** = Guest window with Showcase demo (passes 5–8). Local times (Brussels): pass 1 01:26, pass 2 01:42, pass 3 03:06–03:31, pass 5 04:23–04:42, pass 6 04:43–04:58, pass 7 04:59–05:12, pass 8 05:14–05:25 — **every Professor pass ran before 07:00 local**. Width/theme are "—" unless the bot stated them. Build 17069c7.

PR-001…PR-015 exist only as a one-line list in pass 1 ("items 1-15 of the demo sweep", full text in Professor's chat log, not in the file). Ids are assigned in list order (PR-001 = item 1 …); this mapping is an inference from "PR-001..PR-015 = items 1-15".

## Counts
- New finding ids: 112 (PR-001…PR-112) — BLOCKER 0 / MAJOR 19 / MINOR 59 / POLISH 27 / INFO 5 (4 describe a defect: PR-042, PR-046, PR-087, PR-110; 1 env-only: PR-101) / QUESTION (see-file) 2 (PR-059, PR-065) / POSITIVE 0 (Professor's positives are untagged lines, see Keep-list)
- §3 cross-page lines without an id in the line text: 29 (X3-01…X3-29), each with a P-row; §3 lines that carry an id or sit directly under an id heading: recorded as dups (table "§3 lines owned by other helpers"); §3 lines that describe no mismatch: listed by L# in the completeness check.
- Old ids recorded (master list): 151 rows = 85 BUG ids (87 rows incl. two §3 combined rows) + 28 rows for the 31 other Oct-20/21 ids named in §4 + 36 rows for old-id status lines quoted in §3 (STILL OPEN 55 / CHANGED-but-wrong 9 / CHANGED-ok 16 / FIXED 24 / NOT RETESTED, not reproduced, inconclusive or out of area 47). Oct 26 ids: §4 names none; §3 carries Z-001, Z-043 and the Include Health change.
- ZIGi/NOVA prompt ids: 2 failing (+13 pass-1 prompts logged only in Professor's chat log, not itemised) / 3 passing
- Competitor-gap items: 2 own (C-PR-01, C-PR-02) + 13 quoted in §3 from Tokyo/Moscow (dups, C-X3-01…13)
- Copy/UX notes without an id: 10 (N-PR-01…N-PR-10) + 7 from the NOVA setup log (N-SL-01…N-SL-07)
- Proposed rows: 84 (P-PR-01…P-PR-84)

## Findings
| id | sev | page > feature | problem (one line, concrete) | conditions | key | P-row |
|---|---|---|---|---|---|---|
| PR-001 | MAJOR | Wealth > price freshness | Freshness contradiction (detail in PR-048/PR-081: "2 of 2 market prices current" beside "1 need attention: 1 price older than 15 minutes") | Sc, 01:26 | COUNTS | P-PR-02 |
| PR-002 | MAJOR | Today/Health/NOVA vs Habits > water | Today, Health and NOVA show water 0 mL while the "Drink water" habit shows 4/8 | Sc, 01:26 | CROSS-PAGE-SYNC | P-PR-03 |
| PR-003 | MINOR | Checklist > streak flame | Unlabelled "6" (streak flame with no accessible name; see PR-026) | Sc, 01:26 | A11Y | P-PR-14 |
| PR-004 | MINOR | Wealth/Portfolio > allocation % | Japan 42% on one surface vs 41% on another | Sc, 01:26 | ROUNDING | P-PR-04 |
| PR-005 | MAJOR | ZIGi vs NOVA > Health gate + memory | ZIGi Health gate and NOVA Permissions contradict; NOVA memory says "no notes" while 2 notes exist | Sc, 01:26 | PRIVACY | P-PR-06 |
| PR-006 | MINOR | Portfolio vs Markets > 24h change | Portfolio 24h change differs from Markets; all-time result "Unknown" | Sc, 01:26 | NUMBERS-SOURCE | P-PR-01 |
| PR-007 | MINOR | Wealth > asset value | Manual values don't equal qty × price (old BUG-074 family) | Sc, 01:26 | NUMBERS-SOURCE | P-PR-72 |
| PR-008 | MINOR | Wealth/Goals > percentage | 10.99% on one surface vs 11.00% on another | Sc, 01:26 | ROUNDING | P-PR-04 |
| PR-009 | MINOR | Chess > timestamps | Future timestamps (ratings/games dated later today) | Sc, 01:26 (before 07:00) | TIMEZONE | P-PR-09 |
| PR-010 | MINOR | Habits/Today > Exercise streak | Exercise streak 26 shown while today is only partial | Sc, 01:26 | STREAKS | P-PR-11 |
| PR-011 | MAJOR | ZIGi > panel | App reloads mid ZIGi chat; history lost | Sc, 01:26 | AI-STABILITY | P-PR-07 |
| PR-012 | MINOR | NOVA > setup planets | Planets unlabelled and slow; "Lit 3/10" vs "1 of 3" counts disagree | Sc, 01:26 | AI-CONNECTION | P-PR-13 |
| PR-013 | MINOR | NOVA > banner | "Continue the guide" click times out | Sc, 01:26 | PERF | P-PR-08 |
| PR-014 | POLISH | Health > deep links + tabs | `?view=` deep links ignored; Health tabs are not ARIA tabs | Sc, 01:26 | NAV | P-PR-15 |
| PR-015 | POLISH | Today/Wealth > copy | Copy: "7 of 8", "No target set", "tracked wealth" vs "net worth" labels confuse | Sc, 01:26 | COPY | P-PR-16 |
| PR-016 | MAJOR | Today vs Markets/Wealth vs Portfolio > 24h change | Same asset, three 24h changes: BTC +0.24 / +0.69 / −0.76 %; SOL −0.32 / +0.54 / −0.69; NVDA +0.80 / +2.07, while Showcase claims prices are the same everywhere | Sc, 01:42 | NUMBERS-SOURCE | P-PR-01 |
| PR-017 | MAJOR | Checklist > Focus tile | Focus tile won't start: "Not saved. Try again." | Sc, 01:42 | CHECKLIST | P-PR-18 |
| PR-018 | MINOR | Checklist timers | Sleep/Fast discard < 10 min but Meditate saves 20 s; Sleep tile starts with no confirm | Sc, 01:42 | LIMITS | P-PR-22 |
| PR-019 | MAJOR | Health water → Today/NOVA/Checklist/Habits/Goals | 250 mL updates Today/NOVA/Checklist (Checklist ticks Water at 250 mL with no target) but NOT the Drink water habit (stays 4/8); Goals water goal blank for today | Sc, 01:42 | CROSS-PAGE-SYNC | P-PR-03 |
| PR-020 | MINOR | Health > Weight | "28 of 14 logged days" vs Coach "14 of 14"; trend 74.2 vs latest 73.5 | Sc, 01:42 | COUNTS | P-PR-23 |
| PR-021 | MINOR | Health > Measurements | Says "Add two observations" while charts show data | Sc, 01:42 | COPY | P-PR-24 |
| PR-022 | MINOR | Goals vs Checklist/Health/ZIGi/NOVA > sleep goal | Sleep goal 7 h (Goals) vs 8 h (Checklist/Health/ZIGi); NOVA "59 min under" matches neither | Sc, 01:42 | NUMBERS-SOURCE | P-PR-25 |
| PR-023 | MINOR | Goals/Habits rings | Ring 99 vs 100 %, 94 vs 95 %; Completed filter lists "Drink 2 L" at 38 % "not on target" | Sc, 01:42 | ROUNDING | P-PR-04 |
| PR-024 | MINOR | Goals detail vs Today vs pace card > forecast | Emergency fund forecast Jan 6 2028 (detail) vs Jan 11 2028 (Today) vs Aug 7 2028 (pace card); date formats mixed | Sc, 01:42 | NUMBERS-SOURCE | P-PR-26 |
| PR-025 | MAJOR | ZIGi > panel | Panel closes and chat history lost (5×); looks like a periodic reload, not tied to a prompt | Sc, 01:42 | AI-STABILITY | P-PR-07 |
| PR-026 | POLISH | Checklist > "6" | "6" is an unlabelled streak flame (a11y name) | Sc, 01:42 | A11Y | P-PR-14 |
| PR-027 | MINOR | Settings / NOVA / Health > a11y | 24/43 Settings switches unnamed; 10 NOVA planets unnamed; Health tabs re-render ("element detached") | Sc, 01:42 | A11Y | P-PR-14 |
| PR-028 | MINOR | NOVA > setup checks | Setup checks pass on seeded example data (planets 4, 9, 10); "Lit 3 → 9/10" just by clicking (voice fails correctly) | Sc, 01:42 | AI-CONNECTION | P-PR-13 |
| PR-029 | POLISH | ZIGi > Health hint | Hint names one switch, but two are needed (Health page data + Include Health) | Sc, 01:42 | PRIVACY | P-PR-06 |
| PR-030 | POLISH | Tasks > Remove | Remove task has no confirm/undo | Sc, 01:42 | CONFIRM-DELETE | P-PR-27 |
| PR-031 | POLISH | Checklist > item names | Names cut to one word of 12 chars ("QA test item" → "QA") | Sc, 01:42 | CHECKLIST | P-PR-17 |
| PR-032 | POLISH | Help > Known limitations | Says Lichess has no blitz; Chess shows Lichess Blitz | Sc, 01:42 | HELP | P-PR-30 |
| PR-033 | MINOR | ZIGi > Wealth questions | "What debts do I owe?" → canned list though Wealth has a car loan + credit card; "weekly budget" not matched to the weekly spending plan | Sc, 01:42 | AI-FACTS | P-PR-34 |
| PR-034 | MINOR | Help > What's new | Doesn't mention NOVA, the Checklist rewrite or Tasks | Sc, 01:42 | HELP | P-PR-30 |
| PR-035 | MINOR | Settings > ZIGi cost cap | Copy points to "Settings > ZIGi > Usage" (not found); cost-cap currency selector won't change | Sc, 01:42 | SETTINGS | P-PR-31 |
| PR-036 | MAJOR | Earn > Zignaly/Lockups | Nov 1, 2026 Private Credit withdrawal deadline still shown as actionable on Nov 4 | Sc, 03:06–03:31 | STALE-DATA | P-PR-35 |
| PR-037 | MINOR | Earn > Valdora | Value locked "$74.7 million" (DefiLlama) vs page's own 165.3M stZIG × 1.075 × $0.0409 ≈ $7.3M (~10×), unflagged | Sc, 03:xx | CHAIN-DATA | P-PR-36 |
| PR-038 | MINOR | Earn > Nawa/DeFa/Zignaly | Notices "read Oct 18, 2026" next to "updated just now" live numbers | Sc, 03:xx | STALE-DATA | P-PR-35 |
| PR-039 | MINOR | Earn > external links | Icon-only external links have empty accessible names | Sc, 03:xx | A11Y | P-PR-14 |
| PR-040 | MINOR | Earn > Native staking | Commission "unavailable" while other lines assume 5 % | Sc, 03:xx | CHAIN-DATA | P-PR-37 |
| PR-041 | MAJOR | ZIGi > idle | Panel auto-closed after ~10 min idle (open 3:12, intact 3:20:40, closed by ~3:22:42); chat lost on reopen, no notice (confirms PR-025) | Sc, 03:12–03:23 | AI-STABILITY | P-PR-07 |
| PR-042 | INFO | Settings > ZIGi launcher | ZIGi button hidden on Settings and Ctrl+K does nothing there although the switch says on | Sc, 03:xx | SETTINGS | P-PR-32 |
| PR-043 | MINOR | Habits > Archive | Archive habit gives no toast, card unchanged; stale "Day saved." toast | Sc, 03:xx | TOAST | P-PR-44 |
| PR-044 | MINOR | Habits > Skip day | No undo; card shows "Skipped" + 15/30 + Complete; Save day doesn't clear skip, only +5/−5 resets | Sc, 03:xx | UNDO | P-PR-46 |
| PR-045 | POLISH | Habits > Details/History | Panels collapse by themselves after actions | Sc, 03:xx | PERSISTENCE | P-PR-47 |
| PR-046 | INFO | Habits > detail | No per-habit detail pages, only inline Details; ⋯ menu limited | Sc, 03:xx | COMPETITOR-GAP | P-PR-48 |
| PR-047 | MINOR | Habits > Read timer | "Started Nov 4, 6:00 AM · 25 minutes so far" at 3:15 AM (start in the future) | Sc, 03:15 (before 07:00) | DATES | P-PR-10 |
| PR-048 | MAJOR | Wealth > banner | "2 of 2 market prices current" beside "1 need attention: 1 price older than 15 minutes" (re-confirms PR-001) | Sc, 03:xx | COUNTS | P-PR-02 |
| PR-049 | MINOR | Wealth > custom asset detail | Shows the CoinGecko/provider-chart Showcase banner for a manual asset; "2 items" vs "2 UNIT" | Sc, 03:xx | UNITS | P-PR-73 |
| PR-050 | MINOR | Wealth > + Add asset | Scripted click timed out 3×; real mouse works (possible tooling; check keyboard access) | Sc, 03:xx | PERF | P-PR-08 |
| PR-051 | POLISH | Wealth > Add asset form | "Save asset" button overlaps "Have a spreadsheet…" text | Sc, 03:xx, width — | LAYOUT-DESKTOP | P-PR-55 |
| PR-052 | MINOR | Wealth > money log | Entries have no edit; Remove deletes instantly, no confirm/undo (totals correct €141.60 → €133.83 → back) | Sc, 03:xx | CONFIRM-DELETE | P-PR-27 |
| PR-053 | MINOR | Wealth > assets | Assets can only be archived, never deleted; archived asset shows "Holding value: Unavailable" | Sc, 03:xx | CONFIRM-DELETE | P-PR-28 |
| PR-054 | MINOR | Wealth > first load | First load of /app/wealth while online returned 503 "Offline · ZIGoals, You are offline"; retry OK (transient) | Sc, 03:xx | ENV-ONLY | P-PR-67 |
| PR-055 | MAJOR | Goals > Quantity goal funding | Typed asset "USD" can't be funded from "USD cash reserve" ("Choose the same asset as this quantity Goal."), stays $0.00; works only via the wizard radio "USD · USD cash reserve · manual" | G+Sc, 04:23–04:42 | UNITS | P-PR-56 |
| PR-056 | MINOR | Goals/Activity > Close Goal | One click logs two identical "Goal closed" events (4:27) | G+Sc, 04:27 | ACTIVITY-LOG (proposed) | P-PR-49 |
| PR-057 | MINOR | Activity > funding | Funding QA Value Goal $250 also logs unrelated "Target reached · retained milestone / My first 0.1 BTC" | G+Sc | ACTIVITY-LOG (proposed) | P-PR-49 |
| PR-058 | POLISH | Goals > milestones | "1 milestones remaining" (goal page + list) | G+Sc | PLURALS | P-PR-53 |
| PR-059 | QUESTION | Goals > Reward goal / edit | Reward goal has no Fund/log action (grows only from unclaimed staking rewards); no general Edit on goals (only via "Why it matters") | G+Sc | CONFIRM-DELETE | P-PR-29 |
| PR-060 | POLISH | Goals > /app/goals/new | Background artwork strip offset behind type picker | G+Sc, width — | LAYOUT-DESKTOP | P-PR-54 |
| PR-061 | MAJOR | Habits > "3× per week" | After Complete shows "1 / 1 time today · Partial" with Complete still active; Activity "1/1 completed"; Today rhythm 4/7 → 6/10 after 3 check-offs (expected 7/10) | G+Sc | STREAKS | P-PR-11 |
| PR-062 | MINOR | Habits > Create habit | First click lost (detached DOM), form closed, nothing created; Enter worked (possibly load) | G+Sc | PERF | P-PR-08 |
| PR-063 | MINOR | Health > water/weight validation | −100 / "abc" show food wording "…grams, kilograms and servings"; water error out of viewport; stale "Water recorded." stays | G+Sc | FIELD-ERROR | P-PR-57 |
| PR-064 | MAJOR | Health > Sleep form | Prefilled 23:00–07:00 fails at 04:3x with "A night cannot end in the future."; overlap message vs Showcase night | G+Sc, 04:3x (before 07:00) | DATES | P-PR-10 |
| PR-065 | QUESTION | Activity | Sleep, expense and income entries never appear in Activity | G+Sc | ACTIVITY-LOG (proposed) | P-PR-51 |
| PR-066 | POLISH | Activity | User-created records labelled "Showcase example" in demo mode | G+Sc | ACTIVITY-LOG (proposed) | P-PR-50 |
| PR-067 | MINOR | Wealth > Add asset → Custom | USD/EUR buttons overlap "Other valuation currency" input | G+Sc, width — | LAYOUT-DESKTOP | P-PR-55 |
| PR-068 | MINOR | Wealth > Add account/debt | Defaults to EUR while net worth is USD; stale "QA Car Loan added." lingers | G+Sc | CURRENCY | P-PR-59 |
| PR-069 | MINOR | Checklist > Path view | Truncates "QA Task 1–5" to "QA" — indistinguishable | G+Sc | CHECKLIST | P-PR-17 |
| PR-070 | MINOR | Checklist > Edit path | ArrowUp twice moves only one step | G+Sc | CHECKLIST | P-PR-19 |
| PR-071 | MAJOR | Checklist > Quick add | Quick add creates Habits (Habits 7/15); "Take off your path" leaves the habit — no true delete; conflicts with "standalone checklist like Todoist" | G+Sc | CHECKLIST | P-PR-20 |
| PR-072 | POLISH | Health/Wealth > limits | Weight up to 1,000 kg accepted; silent truncation (food 120, sleep note 1,000, asset 100, expense note 200 chars) | G+Sc | LIMITS | P-PR-58 |
| PR-073 | MINOR | Settings > currency/units | No global currency/units controls (units in Health → Journal settings; currency per portfolio); Wealth shows USD and EUR without conversion | G+Sc, 04:43–04:58 | SETTINGS | P-PR-33 |
| PR-074 | MINOR | Health > weight rate | −0.3 kg/week shown as "−0.7 lb a week" (trend card) and "−0.6 lb/week" (coach) on the same page | G+Sc, lb | UNITS | P-PR-62 |
| PR-075 | POLISH | Today > Latest weight widget | In lb shows "162 lb" and "161.996 lb" | G+Sc, lb | UNITS | P-PR-62 |
| PR-076 | POLISH | Today > water | After reverting fl oz → mL, "Water: 8 fl oz" text remains | G+Sc | UNITS | P-PR-62 |
| PR-077 | MAJOR | Wealth/Markets > Showcase prices | Prices drift between loads despite "same prices on every page" (BTC −0.36 % → −0.67 %, ETH −0.00 % → −0.29 %; NVDA −0.67 % Wealth vs −0.50 % Markets) | G+Sc | NUMBERS-SOURCE | P-PR-01 |
| PR-078 | MINOR | Markets vs Portfolio > 24h | BTC −0.36 % vs −0.81 %, ETH −0.00 % vs +0.8 % (Portfolio labels lines as examples) | G+Sc | NUMBERS-SOURCE | P-PR-01 |
| PR-079 | MINOR | Staking vs Wealth > ZIG reward reserve | Dated Nov 1 (stale snapshot) vs Nov 4 (manual value) | G+Sc | STALE-DATA | P-PR-38 |
| PR-080 | MINOR | Staking > footer | "Observed public positions: 1" with "No public wallet yet"; "Positions entered by hand: 12" vs 4 crypto cards (old BUG-041) | G+Sc | COUNTS | P-PR-39 |
| PR-081 | MINOR | Wealth > banner | "2 of 2 market prices current" next to "1 need attention: 1 price older than 15 minutes" | G+Sc | COUNTS | P-PR-02 |
| PR-082 | MINOR | Today > goal widgets | "Your financial progress" 5 active goals vs "Your destinations" "7 active goals · 3 completed" vs Goals Active 7 / Finished 3 (old BUG-062) | G+Sc | COUNTS | P-PR-63 |
| PR-083 | MAJOR | Portfolio > transactions | No Edit; Remove acts instantly with no confirm/undo (old BUG-032) | G+Sc | CONFIRM-DELETE | P-PR-27 |
| PR-084 | POLISH | Markets > search/favourites | Favourites cap 8 (clear message); Dogecoin as "doge" in Portfolio watch; results truncate symbols ("DOG", "@DO") | G+Sc | SEARCH | P-PR-65 |
| PR-085 | MINOR | Checklist > path summary | "All planets lit" while Evening 0/2 and Meditate/Read open | G+Sc | COUNTS | P-PR-21 |
| PR-086 | POLISH | Health/Today > layout | Floating ZIGi button covers "Edit personal targets" (Health, ~400 px zoom); tight card edges at 768; no horizontal overflow | G+Sc, ~400 px (zoom) + 768 | LAUNCHER-OVERLAP | P-PR-66 |
| PR-087 | INFO | Console | 503 on /api/push and /api/private-account?action=status (sync/email not configured) | G+Sc, every load | ENV-ONLY | P-PR-67 |
| PR-088 | MINOR | Today vs Health > kcal | Foods without kcal make Today headline "Unknown kcal logged / 2,200 target" while Health shows "2,010 kcal known so far" | G+Sc, 04:59–05:12 | NUMBERS-SOURCE | P-PR-64 |
| PR-089 | MINOR | Goal wizard > target | 99999999999999999999 accepted, no max | G+Sc | LIMITS | P-PR-58 |
| PR-090 | POLISH | Goal wizard > name | Name silently truncated to ~72 chars, no counter | G+Sc | LIMITS | P-PR-58 |
| PR-091 | POLISH | Goal wizard > Review | Raw "5000 USD" vs goal page "$5,000.00" | G+Sc | CURRENCY | P-PR-60 |
| PR-092 | POLISH | Goals > target date | 9999-12-31 accepted ("Dec 31, 9999") | G+Sc | LIMITS | P-PR-58 |
| PR-093 | MINOR | Habits > LIMIT 3×/week qty 2 | Form text "1 times each time, 1 time a week"; card "0 / 2 times today" for a weekly limit | G+Sc | STREAKS | P-PR-11 |
| PR-094 | MINOR | Habits > new habit | Habit created Nov 4 gets start date 2026-10-28 while review range limited to Nov 4 | G+Sc | DATES | P-PR-12 |
| PR-095 | POLISH | Habits > status | Stale "Habit created." persists across actions | G+Sc | TOAST | P-PR-44 |
| PR-096 | POLISH | Health > food search | No-match shows "Log a food or recipe to see it here." instead of "No matches" | G+Sc | COPY | P-PR-24 |
| PR-097 | MINOR | Health > Weight tab | Energy estimate "27 of 14 logged days" vs Coach "14 of 14" | G+Sc | COUNTS | P-PR-23 |
| PR-098 | POLISH | Health > Sleep | After delete, status still "Night updated." (delete works) | G+Sc | TOAST | P-PR-44 |
| PR-099 | POLISH | Activity | User records tagged "Showcase example" (repeat of PR-066) | G+Sc | ACTIVITY-LOG (proposed) | P-PR-50 |
| PR-100 | MINOR | Activity | No search field, only 5 filter pills | G+Sc | ACTIVITY-LOG (proposed) | P-PR-52 |
| PR-101 | INFO | Exports | In the Guest profile exports land as hidden Chrome temp files in Downloads (box quirk); content valid | G+Sc | ENV-ONLY | P-PR-68 |
| PR-102 | MAJOR | Search > "/" | Never finds tasks (new or seeded: "Compare two savings accounts", "Book the dentist"); notes/goals/habits found (confirms Lisbon LS-H47) | G+Sc, 05:14–05:25 | SEARCH | P-PR-40 |
| PR-103 | MAJOR | Today / Timeline > tasks | Tasks (incl. seeded "Book the dentist" due today 10:30) never appear on Today or /app/timeline; only on Agenda and Tasks | G+Sc | TASKS-FEATURE | P-PR-41 |
| PR-104 | MINOR | Tasks > due date | Due date before today rejected ("Value must be 11/04/2026 or later.") on create and edit; no overdue tasks | G+Sc | TASKS-FEATURE | P-PR-42 |
| PR-105 | MINOR | Notes > search | "zzzz" → "0 results · No note has those words." but the full list stays below | G+Sc | SEARCH | P-PR-43 |
| PR-106 | POLISH | Notes > toast | "deleted · Undo" toast persists after switching tabs | G+Sc | TOAST | P-PR-44 |
| PR-107 | POLISH | Notes > inbox | Edited inbox note title shown twice | G+Sc | COPY | P-PR-45 |
| PR-108 | MINOR | Chess > timestamps | Future times at 05:2x: ratings "as of 7:00 AM", "updated 9:00 AM", games 8:00/9:00 AM (Showcase seed) | G+Sc, 05:2x (before 07:00) | TIMEZONE | P-PR-09 |
| PR-109 | MINOR | Chess > embeds | Daily puzzle / Lichess puzzle / Lichess TV open a blank white frame ("Empty? Open it on chess.com/Lichess"); Play buttons show a modal, no new tab | G+Sc | NAV | P-PR-69 |
| PR-110 | INFO | Chess > habit link | "A habit chess ticks off" dropdown disabled in Showcase (no reason given) | G+Sc | COPY | P-PR-70 |
| PR-111 | MINOR (env?) | Browser > Today '/' search | Tab crash "Aw, Snap! Error 9" during fast '/' typing, recurred on reload; not reproducible alone, likely memory pressure | G+Sc | CRASH | P-PR-71 |
| PR-112 | POLISH | Search | "Valdora" returns only Earn, not the Ecosystem entry | G+Sc | SEARCH | P-PR-40 |

### §3 cross-page lines without an id (X3-)
"ctx" = the id heading directly above that line in the bot file (owner helper); the integrator can merge the X3 row into the owner's row.

| id | sev | page > feature | problem (one line, concrete) | conditions | key | P-row |
|---|---|---|---|---|---|---|
| X3-01 | MINOR | Wealth > debt vs asset form (Tokyo L43, ctx TK-003) | "1,500,75" saved as €1,500.00 in the debt form while the asset quantity box accepts "0,5" → inconsistent decimal-comma handling between forms | fresh profile (Tokyo), — | DECIMAL-INPUT | P-PR-74 |
| X3-02 | MINOR | Wealth > totals (Tokyo L64, ctx TK-007) | Hero "Total tracked wealth $43,762.72" ignores accounts and debts; EUR net worth never converted, so no single combined net worth | fresh (Tokyo) | NUMBERS-SOURCE | P-PR-75 |
| X3-03 | MINOR | Portfolio > Analysis (Tokyo L206, ctx TK-029) | Headline "$23,071.27 · 1:40 AM" differs from Value card "$23,140.95" (historical vs live price, unexplained) | fresh, 01:40 | NUMBERS-SOURCE | P-PR-01 |
| X3-04 | MAJOR | Markets coin page (Tokyo L218, ctx TK-033) | BTC and SOL show identical sparkline/"Available" shapes; price-history headline raw "76841.77423078995 USD" and differs from header $77,136.52 | fresh | ROUNDING | P-PR-05 |
| X3-05 | MINOR | Wealth/Today totals (Tokyo L265, ctx TK-039) | Headline totals and "Available for Goals" not consistent with net worth; a huge debt is not flagged | fresh | NUMBERS-SOURCE | P-PR-75 |
| X3-06 | MINOR | Markets (Tokyo L316, ctx TK-046) | Banner "Markets is off until you turn it on" while the page works by URL, and the sidebar has no Markets entry | fresh | NAV | P-PR-76 |
| X3-07 | MINOR | ZIGi > slash commands (Tokyo L362, ctx TK-055) | Slash popup lists 9 commands on Wealth/Portfolio/Markets, `/help` lists 10 (`/recap` works but missing from popup) | fresh | COPY | P-PR-78 |
| X3-08 | POLISH | NOVA > BTC price answer (Tokyo L422, ctx TK-080) | Portfolio value "76,815.81474894208 USD" (17 digits) next to Wealth "76,815.80 USD"; three sources listed at the same level | fresh | ROUNDING | P-PR-05 |
| X3-09 | POLISH | Coin page SOL (Tokyo L556, ctx TK-120) | Header "$91.77" vs history "91.71071695081086 USD", different observation times (3:17 vs 3:13 AM) | fresh, 03:1x | ROUNDING | P-PR-05 |
| X3-10 | MINOR | Today > Habits card (Moscow L443, ctx MO-037) | Habits ring shows 13 % → 25 % following water while "0 of 0 habits complete" (possible mislabel of a Health ring) | fresh (Moscow) | COUNTS | P-PR-79 |
| X3-11 | MAJOR | NOVA > setup planet 5 (Moscow L579, ctx MO-058) | Preview says "Nothing NOVA may read holds records yet" with Habits/Wealth ticked and filled; "Check what NOVA sees" then lists Today and Goals though their boxes are unticked, while the preview says Health is not shared | fresh | PRIVACY | P-PR-06 |
| X3-12 | MINOR | NOVA Water card vs Health (Moscow L608, ctx MO-063) | NOVA "Set a daily target on Health to see a bar" while Health shows "of 2,000 mL" | fresh | NUMBERS-SOURCE | P-PR-03 |
| X3-13 | MINOR | Health > skeleton (Moscow L831, ctx MO-098) | Page stuck on skeleton 11+ s with a different bottom nav (Today/Goals/Habits/Health/Wealth instead of Today/Habits/Health/Activity) | 375, fresh, once in ~40 navigations | NAV | P-PR-77 |
| X3-14 | MINOR | Settings > ZIGi vs Health page (Moscow L1110+L1112, ctx Moscow ZIGi §A / ZP-) | Switches arrive Today Off/Goals Off vs copy "starts on"; refusal says "turn it on … with Health on Today" and the Health page's "Ask ZIGi about my health" doesn't say the switch is off until asked | fresh | PRIVACY | P-PR-06 |
| X3-15 | MINOR | Wealth asset → Goal allocation (Moscow L1484, ctx MO-145) | Allocating a USD asset to a EUR goal turns the goal into "CURRENT VALUE Unavailable … valuation needs review" with no currency reason or fix | Guest, fresh | CURRENCY | P-PR-61 |
| X3-16 | MINOR | Health > Weight coach (Moscow L1502, ctx MO-149) | Coach "Not enough readings yet" while the page counts 7 readings and Energy estimate "7 of 10"; trend 180.6 lb lags readings (178.2) by 2.4 lb | fresh, lb | COUNTS | P-PR-23 |
| X3-17 | POLISH | Theme switch across widths (Moscow L1533, ctx MO-157) | Theme radios in the sidebar at 1280 and in More at 375, absent at 768 (only Settings) | 768 | NAV | P-PR-77 |
| X3-18 | POLISH | Goal wizard review (Denver L39, ctx DV-005) | Review says "Progress source: Existing wealth" though "Save toward it from now on" was the default; "1000 USD" vs goal page "$1,000.00" | fresh (Denver) | CURRENCY | P-PR-60 |
| X3-19 | POLISH | Goal page copy (Denver L47, ctx DV-007) | Same facts three times; "Goal" capitalised mid-sentence vs "goal" elsewhere | fresh | COPY | P-PR-80 |
| X3-20 | MINOR | Goal supporting habit vs Today (Denver L181, ctx DV-028) | "Behavior consistency 0 %" on a not-due habit reads as failure; Today "0 of 1 habits" doesn't list the goal-review habit | fresh | COUNTS | P-PR-81 |
| X3-21 | MAJOR | Vision board + Tree (Denver L270, ctx DV-043) | Closed project goal ring 99 % while caption says "100 % of the way"; card/detail say 100 % | fresh | ROUNDING | P-PR-04 |
| X3-22 | POLISH | Settings > Pages preview (Denver L277, ctx DV-045) | Pages-list preview "Sidebar: Today, Goals, Habits, Health, Wealth, Activity, Settings, Help" omits NOVA/Checklist/Journey that the real sidebar shows | fresh | NAV | P-PR-77 |
| X3-23 | MAJOR | NOVA setup planet 5 (Denver L463, ctx DV-061; DV-062 per L501) | "Nothing NOVA may read holds records yet" + "Checked: it works" while Goals/Habits exist and NOVA answers from them | fresh, 02:42 | PRIVACY | P-PR-06 |
| X3-24 | MINOR | NOVA Permissions copy vs defaults (Denver L514, ctx DV-065) | "Earn and staking (only once you chose the chain)" is On by default; setup copy says sharing starts on for Today, Goals, Habits, Wealth and Help (Earn not listed; Help not in panel) | fresh | PRIVACY | P-PR-06 |
| X3-25 | POLISH | Nav across widths (Denver L1318–L1324, ctx DV-243/DV-245) | 768 rail adds Tasks, Notes, Journal; desktop sidebar lacks them; mobile More has them; Agenda in none | 768 / 1280 / 388 | NAV | P-PR-77 |
| X3-26 | MINOR | Checklist Water planet vs Health target (Lisbon L109, ctx LS-016, re-check LC-002 STILL OPEN) | "Water: 250 ml today: done" with no target used (Health waterTargetMl null, no prompt) | fresh (Lisbon) | CROSS-PAGE-SYNC | P-PR-03 |
| X3-27 | MINOR | Help notice vs on-screen banner (Berlin L120, ctx BN-024) | Help notice "Practice money (no real value) · Public Alpha…" doesn't match the banner "PUBLIC ALPHA Your records stay in this browser and are not a backup." | fresh (Berlin) | HELP | P-PR-30 |
| X3-28 | MINOR | Goal wizard step 2 (Berlin L1288, ctx BN-156) | A USD asset is offered for a EUR goal with no warning although the copy says only same-currency wealth counts | fresh (shared data) | CURRENCY | P-PR-61 |
| X3-29 | POLISH | Settings time zone vs timestamps (Berlin L925, ctx BN-102) | With Asia/Tokyo chosen, Staking/Chess timestamps stay in browser time ("3:19 AM", "3:33 AM") | fresh | TIMEZONE | P-PR-82 |

### §3 lines owned by other helpers (dups; no P-row here)
| §3 line(s) | id (owner) | mismatch in one line |
|---|---|---|
| Tokyo L246, L249, L252, L253, L652, L654 | dup of TK-037 | Today USD chip $133 off Wealth with no "as of"; headline excludes USD holdings and a huge debt; W1 CHANGED |
| Tokyo L482 | dup of TK-114 | "Markets is off" banner on an open Markets; hero right edge 826 vs 864 px |
| Tokyo L512, L634 | dup of TK-6B-06 (+TK-024/026/029/030/027/021/6B-03 summary) | Same "as of" stamp shows BTC 24h −0.41 % (light) and +0.1 % (dark) |
| Tokyo L560/L563/L565 | dup of TK-121 | AAPL/VOO manual values vs live Markets prices (~44 % off), "Gold bar 100g" holds "2 grams" |
| Tokyo L659 | dup of TK-048/TK-049/TK-050/TK-051/TK-053 | ZIGi page-inconsistent answers; questions create a "Water 1 L" save preview |
| Tokyo L704 | dup of TK-003/TK-014/TK-127/TK-198/TK-199/TK-126/TK-159/TK-149 | Number/currency validation inconsistent between forms |
| Tokyo L734 | dup of TK-142 | Wizard preview "10000 EUR" vs page "EUR 10,000.00" |
| Tokyo L782 | dup of TK-180 | Asset page "5,000 EUR allocated" next to "Allocated to Goals €4,000" |
| Tokyo L800 | dup of TK-196 | Archive-released goal funding gets no NEEDS REVIEW, unlike a shrunk balance |
| Tokyo L809 | dup of TK-203 (old M10 CHANGED) | Gold/VOO icons differ between Markets and Wealth |
| Tokyo L814 | dup of TK-208 (old W26 / TK-040 STILL OPEN) | Wealth BTC $76,250.90 "Needs refresh" vs Markets $76,578.87 "Current" in the same minute |
| Tokyo L735, L739, L751, L792, L802, L835 | dup of TK-143, TK-147, TK-153, TK-188, TK-198, TK-225 (POSITIVE consistency checks) | — |
| Tokyo L740, L834 | dup of TK-148, TK-224 | not cross-page (first-run card; 375 clipping) |
| Moscow L31, L228 | dup of MO-007 | barcode lookup inconsistent (not cross-page) |
| Moscow L511/L513, L1491, L1558 | dup of MO-048 | Settings default text vs switches (later FIXED on fresh state) |
| Moscow L584/L586, L1492 | dup of MO-059 | NOVA chip lists Today/Goals while Settings has them Off (CHANGED: chip ignores Settings toggle) |
| Moscow L589 | dup of MO-060 | NOVA lacks water/weight/sleep cards and safety notes ZIGi has |
| Moscow L622/L624, L1493, L1560 | dup of MO-066 | NOVA Permissions vs Settings switches are separate though copy says "the same switches" |
| Moscow L1157 | dup of MO-063 | NOVA Water card "set a target" vs Health 2,000 mL |
| Moscow L1118 | dup of ZP-01 (old Z-001 STILL OPEN) | Health-off refusal + stray "Will save: Water" card |
| Moscow L1192 | dup of NP-27 | NOVA answers Dutch, ZIGi says "English for now" |
| Moscow L1206 | dup of ZP-37 | sleep write consistent across surfaces; disabled Save unexplained |
| Moscow L1277 | dup of MO-110 | Journal date min 1900 vs Entry date min 1990; max today vs 2199 |
| Moscow L1290 | dup of MO-114 | Sleep delete has no Undo unlike food/water/fasting |
| Moscow L1308 | dup of MO-118 (confirms MO-043/MO-044, old M-018) | no pricing surface anywhere |
| Moscow L1320 | dup of MO-068/MO-069/MO-087 | 375 launcher overlap; BUG-005 STILL OPEN |
| Moscow L1327, L1382, L1404 | dup of MO-120, MO-130, MO-133 | goal-type names / macro precision inconsistent |
| Moscow L1650 | dup of MO-005 | not reproducible (cross-tab contamination) |
| Nairobi L134 | dup of NB-073 | 30-day grid colour differs light vs dark for the same data |
| Nairobi L177, L203 | dup of NB-082 (old N-056/N-086 STILL OPEN) | Today vs Drink water habit vs Health water |
| Nairobi L246, L315, L328 | dup of NB-105 / NB-113 | "No portfolio yet" while Wealth holds 1,234 USD; NOVA cards show Health while chat says Health off |
| Nairobi L299, L340, L1172 (P4) | dup of NB-103 / NB-118 (old BUG-057) | question → water write preview in ZIGi, not NOVA |
| Nairobi L458, L510 | dup of NB-171 / NB-217 | "Nothing is ever taken away" vs badge revoked |
| Nairobi L520 | dup of NB-227 | Journey "this week from Mon" vs Life review rolling 7 days |
| Nairobi L555 | dup of NB-252 | toast 16 % vs card 17 % |
| Nairobi L28 (sic L40), L56, L60, L23, L24, L425 | dup of NB-028, NB-041, NB-043, NB-012, NB-013 | nav set differs between runs / pillars; preview vs result |
| Denver L138/L140 | dup of DV-023 | Game-layer popover promises XP at page bottoms, shown only on Journey |
| Denver L146–149, L202, L666 | dup of DV-024 (downgraded) | goals on Today: counts only |
| Denver L107 | dup of DV-016 | milestone limit 100 in wizard vs 150 saved on goal page |
| Denver L361 | old D-238/B-009/B-098/B-202 (see old ids) | Journey "0 goals reached" vs Goals "Closed 100 %" |
| Denver L385–L388 | dup of DV-057 | 1e28 target leaks to Today |
| Denver L410, L424, L435 | dup of Z-003, Z-017, Z-028 (Denver prompt ids) | "0.00 USD" vs "$0.00"; medical vs chest-pain inconsistency; BUG-057 FIXED here |
| Denver L476, L496, L501, L606, L609, L624 | dup of N-007, N-027 (DV-063), DV-062, N-046, N-049, N-057 | NOVA voice/claims inconsistent |
| Denver L949 | dup of DV-101 | Fund asks the amount twice |
| Denver L1042, L1064 | dup of DV-003/DV-049, DV-100 | wizard wording 0 vs −5; Delete reason detached |
| Denver L1115, L1166, L1209, L1230, L1207 | dup of DV-144, DV-166, DV-176 (DV-174 ctx for L1207), DV-182 | validation copy, priority label, template names |
| Denver L1145, L1151 | dup of DV-157, DV-159 | nav sets differ by width; "0.8 L water" vs "750 mL" |
| Denver L1253, L1257, L1301 | dup of DV-188, DV-189, DV-224 | Cancel w/o discard vs wizard asks; Journal/Notes/Agenda missing from desktop sidebar |
| Denver L1303, L1351, L1353, L1369, L1388 | dup of DV-212, DV-257, DV-258, DV-266, DV-274 | hero dark in Light; lock icon inconsistent; Today link vs logo; Settings IA; Pages preview vs real More sheet |
| Lisbon L463, L582, L587, L686, L708, L794 | dup of LS-159, LS-187 (vs LS-054), LS-055, LS-228, LS-031, LS-H40 | Checklist/Tasks consistency notes |
| Berlin L15, L775 | dup of BN-001 | Staking "off until you turn it on" |
| Berlin L82 | dup of BN-017 | 6 "page data" switches have no group label |
| Berlin L593, L639, L652 | dup of BN-044, BN-052, NOVA Settings answer | NOVA header/permissions consistency |
| Berlin L937/L939 | dup of BN-105 | Erase doesn't return to first-run defaults |
| Berlin L1173/L1177, L1208/L1212, L1294/L1295 | dup of BN-141, BN-146, BN-157 | wizard vs edit validation wording differs ("Could not save.") |
| Berlin L1438 | dup of BN-177 | REJECTED with Yes 100 % and no quorum note |
| Professor L2, L6, L8, L78, L85, L94 | PR-001…015, PR-016, PR-018, PR-075, PR-082, PR-088 (this file) | — |

## Old ids re-checked
Verdict tokens: STILL-OPEN, CHANGED-WRONG (changed but still wrong), CHANGED-OK, FIXED, NOT-RETESTED (incl. not reproduced / inconclusive / out of area). "§4" = the verdict FINAL-REPORT §4 itself carries (for most BUG ids only the Oct 21 table, build 8778497); "Nov 4" = latest bot line (§4's own Nov 4 lines for BUG-004/005/009, otherwise the bot files). Old ids not re-tested on Nov 4 keep their Oct 21 status in the "one line".

| old id | bot verdict | one line | conditions | key | P-row | earlier closing row (R2) |
|---|---|---|---|---|---|---|
| BUG-001 | NOT-RETESTED | Nov 4: no bot by id (Tokyo P4 row blank). §4 Oct 21 STILL OPEN (999,999,999,999 × 999,999,999,999 ETH accepted) | — | LIMITS | P-PR-58 (limits table) | AH VA2/B3 Fixed (`cd216935`) |
| BUG-002 | NOT-RETESTED | Nov 4 none. Oct 21 STILL OPEN (318-char note clipped) | — | LAYOUT-DESKTOP | → Tokyo helper | AH NO1: recorded, undescribed |
| BUG-003 | STILL-OPEN | Tokyo P6/TK-024: oversell error off-screen at top. §4 Oct 21 STILL OPEN (partly improved) | fresh (Tokyo) | FIELD-ERROR | → Tokyo helper | AH VA1/C1 Fixed → REOPENED |
| BUG-004 | NOT-RETESTED | §4 Nov 4: Denver L372 + Berlin L176 NOT RETESTED; Denver L157 related (lowering a target below funded flips to Completed with celebration) | — | ACTIVITY-LOG | P-PR-49 (related PR-056/057) | AH TR12/B6 Fixed |
| BUG-005 | STILL-OPEN | §4 Nov 4: Moscow STILL OPEN (MO-069/086, dark+light); Berlin STILL OPEN (BN-031 375, BN-071 500/767); Nairobi CHANGED/partly fixed (NB-123, ~335 px: covers cards, not nav) | 375 / ~335 / 500 / 767, fresh | LAUNCHER-OVERLAP | P-PR-66 | AH LA1/D2/HE10 "Already fixed" → REOPENED (Oct 21 "not reproduced" was headless only) |
| BUG-006 | STILL-OPEN | Not by id; same symptom: PR-016/PR-077 (24h change differs per page), Tokyo TK-208/W26 (two BTC prices in one minute) | Sc + fresh | NUMBERS-SOURCE | P-PR-01 | AH TR3/B1 Fixed → REOPENED (price level unified, change/as-of not) |
| BUG-007 | STILL-OPEN | Tokyo W8 (TK-033/TK-202): "76841.77423078995 USD", "328.4436332819673 USD" on coin pages | fresh | ROUNDING | P-PR-05 | AH TR4/B2 Fixed → REOPENED |
| BUG-008 | FIXED | Oct 21 FIXED (maxlength 80); Nov 4 not by id | — | LIMITS | keep | — |
| BUG-009 | STILL-OPEN | §4 Moscow L72/L436/L976: water form field y=433 vs status y=−1,006 (MO-036); weight uses same component | fresh | FIELD-ERROR | P-PR-57 | AH VA1/C1 Fixed → REOPENED |
| BUG-010 | CHANGED-WRONG | Denver L355: Close works with confirm + Reopen; no Delete for tracked goals; Keep-an-average "Remove this goal" deletes with no confirm/undo (DV-052) | fresh | CONFIRM-DELETE | P-PR-29 | AH GO2/C5 Fixed |
| BUG-011 | STILL-OPEN | Denver L350: no cap on amounts (DV-050); money Fund path not retested | fresh | LIMITS | P-PR-58 | AH VA2/B3 Fixed → REOPENED |
| BUG-012 | STILL-OPEN | Not by id; Denver DV-003/049 (L1042): 0 → "positive", −5 → "non-negative"; NB-183; BN-141/146. Oct 21 STILL OPEN | fresh | FIELD-ERROR | → Denver helper | AH NO1: recorded, undescribed |
| BUG-013 | FIXED | Denver L43: no longer shows unchosen template | fresh | COPY | keep | AH C4 Fixed |
| BUG-014 | NOT-RETESTED | Denver L374: habit option moved to step 1 for templates | — | — | — | AH C4 |
| BUG-015 | FIXED | §4 Oct 21 FIXED. Note: Denver L265 sees "Target reached · target 1 USD · counted 4 USD" on a Project goal log (same pattern, unlabelled) → verify | fresh | COUNTS | → Denver helper | AH TR12 ("4 milestones, not 4 ZIG") — possible REOPENED |
| BUG-016 | STILL-OPEN | Denver L110/L160/L717: "1 milestones"; edit name cut at 80 with no counter; Professor PR-058 | fresh + G+Sc | PLURALS | P-PR-53 | AH C4 / VA9 Fixed → REOPENED |
| BUG-017 | STILL-OPEN | Denver DV-028: "Add weekly Goal review habit" remains | fresh | COPY | → Denver helper | AH C4 Fixed → REOPENED |
| BUG-018 | NOT-RETESTED | Oct 21 NOT REPRODUCED; Nov 4 none | — | — | — | AH C6 |
| BUG-019 | STILL-OPEN | Denver L129/L373 (DV-043): Holiday mountains in Cards vs gradient in Vision board | fresh | COPY | → Denver helper | AH NO1: recorded, undescribed |
| BUG-020 | STILL-OPEN | Moscow L54/L73: improved range texts, but −1/abc/−5 kcal still grams/kilograms/servings text; status 1,440 px away | fresh | FIELD-ERROR | P-PR-57 | AH VA1/C1 + VA9/C2 Fixed → REOPENED |
| BUG-021 | FIXED | Moscow L74: overlapping nap edit refused | fresh | DATES | keep | AH DS3/A6 Fixed |
| BUG-022 | CHANGED-WRONG | Moscow L76/L237/L325: 999,999 and 1,000.1 rejected, 1,000 kg still accepted, misleading storage message (MO-008, MO-020); PR-072 | fresh + G+Sc | LIMITS | P-PR-58 | AH VA2/B3 Fixed |
| BUG-023 | STILL-OPEN | Moscow L77/L332: nap mode labels; default night now "A night cannot end in the future." at 02:00; PR-064 at 04:3x | before 07:00 | DATES | P-PR-10 | AH NO1: recorded, undescribed |
| BUG-024 | NOT-RETESTED | Nairobi NB-067: STILL OPEN / INCONCLUSIVE (6 habits, 7 days) | fresh | STREAKS | → Nairobi helper | AH C6 |
| BUG-025 | FIXED | Oct 21 FIXED; Nov 4 none | — | STREAKS | keep | AH HA1 Fixed |
| BUG-026 | STILL-OPEN | Nairobi NB-053: whitespace title → generic line ~600 px below | fresh | FIELD-ERROR | → Nairobi helper | AH VA1/C1 Fixed → REOPENED |
| BUG-027 | FIXED | Tokyo W4 (TK-041/042): trillion limit, readable layout; limit message placement poor | fresh | LIMITS | keep | AH VA2/B3 Fixed |
| BUG-028 | STILL-OPEN | Tokyo W8: raw price on asset/coin page | fresh | ROUNDING | P-PR-05 | AH TR4/B2 Fixed → REOPENED |
| BUG-029 | CHANGED-OK | Tokyo M1/TK-206: Bitcoin first, look-alikes flagged; warning text clipped | fresh | SEARCH | → Tokyo helper | AH WE1 Fixed |
| BUG-030 | STILL-OPEN | Tokyo M2/TK-204: clicking "Price" header doesn't sort; only a separate dropdown | fresh | SEARCH | → Tokyo helper | AH WE1 Fixed → REOPENED (partial) |
| BUG-031 | NOT-RETESTED | Tokyo M8 row blank | — | COUNTS | — | AH TR6/B5 Fixed |
| BUG-032 | CHANGED-WRONG | Tokyo P7: Undo + Edit only on coin page/Insights (TK-025/026/030); PR-083: tx list Remove instant, no Edit | fresh + G+Sc | CONFIRM-DELETE | P-PR-27 | AH A5 / WE2 Fixed → REOPENED |
| BUG-033 | STILL-OPEN | Moscow conflict: B1 FIXED (body width), B5 STILL OPEN (real 375×844 emulation pans ~140 px, MO-068) — B5 stronger | 375, dark+light | LAYOUT-375 | → Moscow helper | Oct 21 FIXED → REOPENED |
| BUG-034 | STILL-OPEN | Moscow MO-087/091 at 768; Lisbon L330 CHANGED (Checklist launcher joined the stack, covers "Increase Pull-ups") | 768 | LAUNCHER-OVERLAP | P-PR-66 | AH LA1/D2 "Already fixed" → REOPENED |
| BUG-035 | FIXED | Berlin L144: "Foo/Bar" refused with a reason | fresh | SETTINGS | keep | AH VA10/C8 Fixed |
| BUG-036 | FIXED | Berlin L92: Goals and Wealth export 1,666 B with data | fresh | IMPORT-EXPORT | keep | AH DS6/A2 Fixed |
| BUG-037 | STILL-OPEN | Not by id; PR-009/PR-108: Chess "as of 7:00 AM", "updated 9:00 AM", games 8:00/9:00 AM at 05:2x | Sc, before 07:00 | TIMEZONE | P-PR-09 | Oct 21 NOT REPRODUCED; AH NO1 → REOPENED (only shows before the seed hour) |
| BUG-038 | STILL-OPEN | Tokyo Z13: 3,000-char input echoed in full; Berlin L-003: 5,000 chars → generic list, no echo; Nairobi NOT TESTED | fresh | LIMITS | → Tokyo helper | ADR-034 G5 Fixed (`79670c8c`) → REOPENED |
| BUG-039 | NOT-RETESTED | none | — | A11Y | — | AH D3 Fixed |
| BUG-040 | STILL-OPEN | Denver L364 (DV-046) two "Goal closed" rows; PR-056 one click → two events | fresh + G+Sc | ACTIVITY-LOG | P-PR-49 | AH TR12/B6 Fixed → REOPENED |
| BUG-041 | STILL-OPEN | Not by id; PR-080: "Observed public positions: 1" with no wallet; manual 12 vs 4 cards | G+Sc | COUNTS | P-PR-39 | AH TR6/B5 Fixed → REOPENED |
| BUG-042 | FIXED | Not by id; Berlin L100: NOT_A_BACKUP / WRONG_MODULE plain messages | fresh | IMPORT-EXPORT | keep | AH A7 Fixed |
| BUG-043 | NOT-RETESTED | Moscow L85 N/A (no habits); related open: PR-002/PR-019 Showcase water habit ignores Health water | Sc | CROSS-PAGE-SYNC | P-PR-03 | AH TR9/B8 Fixed → REOPENED (related) |
| BUG-044 | CHANGED-OK | Nairobi NB-066: Habits 1 = Journey 1 (small profile) | fresh | COUNTS | — | AH TR6/B5 Fixed |
| BUG-045 | NOT-RETESTED | Tokyo W16 blank | — | A11Y | — | AH LA7/E3 |
| BUG-046 | CHANGED-WRONG | Moscow MO-090: still ~1.1:1, now underlined | fresh | A11Y | → Moscow helper | AH E1 "Already fixed" → REOPENED |
| BUG-047 | NOT-RETESTED | Tokyo W17 blank | — | A11Y | — | AH E2 |
| BUG-048 | NOT-RETESTED | Tokyo P13 blank | — | A11Y | — | AH E2 |
| BUG-049 | NOT-RETESTED | none | — | A11Y | — | AH E3 |
| BUG-050 | FIXED | Moscow L79: "Water amount", "Water unit", "Weight (kg)" | fresh | A11Y | keep | AH LA7 |
| BUG-051 | NOT-RETESTED | Tokyo P14 blank | — | LAYOUT-768 | — | AH NO1: recorded |
| BUG-052 | NOT-RETESTED | Nairobi L205 "not checked" | — | PERF | — | AH NO1 / F1 |
| BUG-053 | CHANGED-OK | Moscow L78: create toast "Nap saved."; edit/delete wording not rechecked | fresh | COPY | → Moscow helper | AH DS3/A6 (`3bc64a6d`) |
| BUG-054 | STILL-OPEN | Nairobi P24/NB-104; Denver L572: open in ZIGi panel, FIXED in NOVA | fresh | AI-FACTS | P-PR-34 | ADR-034 ZI2/G2 Fixed → REOPENED (ZIGi panel path) |
| BUG-055 | STILL-OPEN | Denver Z-022 + Tokyo Z12: "and the second one?" → fallback; Nairobi P23 "and this week?" FIXED | fresh | AI-FACTS | P-PR-34 | ADR-034 G4 Fixed → REOPENED |
| BUG-056 | STILL-OPEN | Nairobi P6, Denver Z-006/Z-023, Tokyo Z11 | fresh | AI-FACTS | P-PR-34 | ADR-034 G4 Fixed → REOPENED |
| BUG-057 | STILL-OPEN | Nairobi NB-103/NB-118, Moscow ZP-01, Tokyo Z8/TK-053, Lisbon-AI L-004, Berlin BN-068 (Dutch); Denver Z-028/Z-036 FIXED (conflict) | fresh, Health switches off | AI-FACTS | P-PR-34 | ADR-034 ZI1/G1 Fixed → REOPENED (refusal path still attaches a save card) |
| BUG-058 | STILL-OPEN | Denver Z-038/Z-039: "check in Drink water", "mark … done" not understood; Oct 21 FIXED | fresh | AI-ACTIONS | → Denver helper | ADR-034 G4 Fixed → REOPENED |
| BUG-059 | STILL-OPEN | Tokyo W26 STILL OPEN (TK-040/208); Nairobi CHANGED (no ETH, EUR/USD consistent) | fresh | NUMBERS-SOURCE | P-PR-01 | AH TR3/B1 Fixed → REOPENED |
| BUG-060 | STILL-OPEN | Nairobi P5/NB-107: generic help above the write preview | fresh | AI-FACTS | P-PR-34 | ADR-034 G5 Fixed → REOPENED |
| BUG-061 | NOT-RETESTED | Berlin marked D-087 "OUT OF AREA: Professor"; Professor's file never tests Reset Showcase Demo (coverage gap) | — | CONFIRM-DELETE | — (gap) | AH DS4/A4 Fixed |
| BUG-062 | STILL-OPEN | Not by id; PR-082 Today 5 active vs 7 active/3 completed (Showcase); Nairobi NB-176/205 agree in own profile | G+Sc | COUNTS | P-PR-63 | AH TR6/B5 Fixed (tests/ah-numbers.spec.ts) → REOPENED (Showcase widget) |
| BUG-063 | CHANGED-OK | Tokyo W1: labels consistent, per-currency, debt excluded from headline | fresh | NUMBERS-SOURCE | P-PR-75 | AH B4 Fixed |
| BUG-064 | FIXED | Nairobi L138: Habits sort control (Goals sort not checked) | fresh | — | keep | AH F6 Fixed |
| BUG-065 | NOT-RETESTED | Oct 21 NOT REPRODUCED; Nov 4 none | — | — | — | AH C4 |
| BUG-066 | FIXED | Moscow L58: quick add a food not in the library | fresh | — | keep | AH C11 Fixed |
| BUG-067 | NOT-RETESTED | Not by id; Nairobi NB-002/NB-233: "/" still redirects to /app (Welcome card shows) | fresh | FIRST-RUN | → Nairobi helper | AH NO1: recorded |
| BUG-068 | STILL-OPEN | Moscow L63/L80: 3 preset counters on an empty app (Chess part changed) | fresh | FIRST-RUN | → Moscow helper | AH H5 Fixed (Chess) → REOPENED (Health part) |
| BUG-069 | STILL-OPEN | Tokyo M9/TK-205 (probable): Refresh market data gives no feedback | fresh | STALE-DATA | → Tokyo helper | AH F5 "Already fixed" |
| BUG-070 | FIXED | Nairobi NB-062: same-day archive with confirm | fresh | — | keep | AH HA3/C6 Fixed |
| BUG-071 | NOT-RETESTED | Nairobi L142 "not yet checked"; related open: NB-076/H-008, PR-061, PR-093 | — | STREAKS | P-PR-11 (related) | AH C6 |
| BUG-072 | NOT-RETESTED | Nairobi L142 "not yet checked" | — | — | — | AH NO1: recorded |
| BUG-073 | STILL-OPEN | Not by id; PR-057 funding $250 logs "Target reached · My first 0.1 BTC"; Denver L371 NOT REPRODUCED (fund-with-asset path not run) | G+Sc | ACTIVITY-LOG | P-PR-49 | AH TR12/B6 Fixed → REOPENED |
| BUG-074 | CHANGED-OK | Tokyo W3: "Manual value" badge; PR-007 still flags (pass 1) | fresh / Sc | NUMBERS-SOURCE | P-PR-72 | AH TR5/B7 Fixed |
| BUG-075 | FIXED | Denver L344: two-tab test kept all 8 goals | fresh | PERSISTENCE | keep | AH DS1/A1 |
| BUG-076 | FIXED | Not by id; Berlin BN-15x draft restored after reload (L1283) | fresh | PERSISTENCE | keep | AH DS9/A3 Fixed |
| BUG-077 | STILL-OPEN | Nairobi NB-077: habit form draft lost on F5, no warning | fresh | PERSISTENCE | → Nairobi helper | AH DS9/A3 Fixed → REOPENED (wizard only) |
| BUG-078 | NOT-RETESTED | Not by id; related PR-089 (no max) | — | LIMITS | P-PR-58 (related) | AH VA2/B3 |
| BUG-079 | CHANGED-WRONG | Moscow L81: untouched sleep form → "A night cannot end in the future." at night | before 07:00 | DATES | P-PR-10 | AH VA2/B3 |
| BUG-080 | CHANGED-WRONG | Moscow B1: ?tab=/#targets work; B2: ?view=weight opens Diary, ?tab= ignored; PR-014 ?view= ignored | fresh + Sc | NAV | P-PR-15 | AH C9 Fixed (`2361b562`) → REOPENED (partial) |
| BUG-081 | STILL-OPEN | Nairobi L196 (partly); Tokyo Z18/TK-056 | 375/768 | LAUNCHER-OVERLAP | P-PR-66 | AH D2 "Already fixed" → REOPENED |
| BUG-082 | NOT-RETESTED | none | — | STREAKS | — | AH HA6/C7 Fixed |
| BUG-083 | FIXED | Moscow L56/L83: 1000 fl oz → "Enter 0.001 to 169 fl oz." | fresh | LIMITS | keep | AH VA3/B9 Fixed |
| BUG-084 | STILL-OPEN | Moscow L84/L988: "Check the highlighted fields…" but nothing highlighted; PR-063 | fresh + G+Sc | FIELD-ERROR | P-PR-57 | AH C3 Fixed → REOPENED |
| BUG-085 | CHANGED-OK | Tokyo W1 CHANGED; Nairobi P8 partial | fresh | NUMBERS-SOURCE | P-PR-75 | AH TR1/B4 Fixed |
| B-001 / M-099 / N-050 | FIXED | Moscow L87, Nairobi NB-080: Today "Add 250 mL" → "Water logged: 250 mL. Undo" | fresh | TOAST | keep | — |
| B-003 | NOT-RETESTED | named in §4 Oct 21 list only | — | STREAKS | — | AH HA1 Fixed |
| B-005 | CHANGED-OK | Berlin L28/L178: Practice default; live rate not labelled mainnet-only | fresh | CHAIN-DATA | → Berlin helper | — |
| B-027 | STILL-OPEN | Berlin L185 | 375/500/767 | LAUNCHER-OVERLAP | P-PR-66 | AH LA1 → REOPENED |
| B-092 | NOT-RETESTED | Denver L372 | — | ACTIVITY-LOG | — | AH TR12 |
| B-171 | NOT-RETESTED | Denver L359 (Showcase); own average goal accepts 25 h sleep | — | LIMITS | — | — |
| D-066 | STILL-OPEN | Berlin L334 | 375/500/767 | LAUNCHER-OVERLAP | P-PR-66 | AH LA1 → REOPENED |
| D-074 | NOT-RETESTED | Denver L372 | — | — | — | — |
| D-087 | NOT-RETESTED | Berlin L341 OUT OF AREA (Professor); not in professor.md | — | CONFIRM-DELETE | — (gap) | AH DS4/A4 Fixed |
| D-181 | NOT-RETESTED | Denver L372, Berlin L380 | — | THEME | — | — |
| D-196 | NOT-RETESTED | Denver L372, Berlin L391 | — | LAYOUT-DESKTOP | — | — |
| D-234 | NOT-RETESTED | Denver L372/L857 | — | ACTIVITY-LOG | — | AH TR12 |
| H-008 | STILL-OPEN | Nairobi NB-076: "3× per week" shows "0 / 1 time today" | fresh | STREAKS | P-PR-11 | — |
| L-001 | CHANGED-WRONG | via BUG-022: 1,000 kg still accepted | fresh | LIMITS | P-PR-58 | AH VA2 |
| L-003 | NOT-RETESTED | Berlin L256 (20k not tried; 5k no echo); Tokyo Z13 STILL OPEN at 3k | fresh | LIMITS | → Tokyo helper | ADR-034 G5 |
| L-004 | STILL-OPEN | Lisbon-AI L106, Berlin L257 (Dutch) | fresh | AI-FACTS | P-PR-34 | ADR-034 ZI1 → REOPENED |
| L-008 | NOT-RETESTED | cross-ref of BUG-078 | — | LIMITS | — | AH VA2 |
| L-009 | FIXED | Moscow L75: overlapping nap create blocked | fresh | DATES | keep | AH DS3 |
| L-013 | CHANGED-OK | cross-ref of BUG-029 (Tokyo M1) | fresh | SEARCH | — | AH WE1 |
| L-017 | NOT-RETESTED | cross-ref (desktop overlap); BUG-005 open | — | LAUNCHER-OVERLAP | P-PR-66 (related) | AH LA1 |
| L-021 | NOT-RETESTED | cross-ref of BUG-043; related PR-002/019 | — | CROSS-PAGE-SYNC | P-PR-03 (related) | AH TR9/HA2 |
| L-022 | NOT-RETESTED | Berlin L262 | — | A11Y | — | AH LA7 |
| L-026 | NOT-RETESTED | cross-ref of BUG-065 | — | — | — | AH GO3/C4 |
| L-060 | NOT-RETESTED | Denver L372 | — | ACTIVITY-LOG | — | — |
| N-051 | STILL-OPEN | Nairobi L196/L203 (partly) | ~340 px | LAUNCHER-OVERLAP | P-PR-66 | AH LA1 → REOPENED |
| N-056 / N-086 | STILL-OPEN | Nairobi NB-082: Today vs Drink water habit vs Health water differ | fresh | CROSS-PAGE-SYNC | P-PR-03 | AH TR9/B8 Fixed → REOPENED |
| N-178 | FIXED | Nairobi NB-095: start page Habits, sidebar Today renders (Goals path not testable) | fresh | NAV | keep | — |
| T-110 | FIXED | Lisbon L312: Sleep/Fast stop < 10 min saves nothing | fresh | LIMITS | keep | AH DS2 Fixed |
| W1 (Tokyo row; BUG-085/063) | CHANGED-OK | §3 Tokyo L252/L269 | fresh | NUMBERS-SOURCE | P-PR-75 | AH TR1/B4 |
| W3 (BUG-074) | CHANGED-OK | §3 Tokyo L277 | fresh | NUMBERS-SOURCE | P-PR-72 | AH TR5 |
| W9 | STILL-OPEN | §3 Tokyo L277: badge/timestamp inconsistency | fresh | STALE-DATA | P-PR-02 | AH TR2/WE5 Fixed → REOPENED |
| W10 | STILL-OPEN | §3 Tokyo L277: total/prices change after load | fresh | NUMBERS-SOURCE | P-PR-01 | AH TR2 Fixed → REOPENED |
| W11 | CHANGED-OK | §3 Tokyo L277: counts "2 of 2", reason for AAPL/VOO unavailable not explained | fresh | COUNTS | P-PR-02 | AH WE5 |
| W26 (BUG-059) | STILL-OPEN | §3 Tokyo L277/L814 | fresh | NUMBERS-SOURCE | P-PR-01 | AH TR3/B1 → REOPENED |
| W8 (BUG-007/028) | STILL-OPEN | §3 Tokyo L218 context | fresh | ROUNDING | P-PR-05 | AH TR4 → REOPENED |
| M10 | CHANGED-WRONG | §3 Tokyo L809: labels honest, icons differ between pages | fresh | COPY | → Tokyo helper | — |
| G2 / G3 (Tokyo rows) | NOT-RETESTED | §3 Tokyo L252: G2 N/A, G3 not checked | — | — | — | — |
| Z13 (BUG-038) / Z14 | STILL-OPEN / FIXED | §3 Tokyo L362: 3,000 chars echoed; buy/sell refusal fixed | fresh | LIMITS | → Tokyo helper | ADR-034 G5 |
| Z-001 (Oct 26) | STILL-OPEN | §3 Moscow L1118 (ZP-01): Health-off refusal + "Will save: Water" card | fresh | AI-FACTS | P-PR-34 | ADR-034 ZI1 → REOPENED |
| Z-043 (Oct 26) | CHANGED-OK | §3 Moscow L1152: chat resets after reload, restorable from History | fresh | AI-STABILITY | P-PR-07 (related) | — |
| Include Health (Oct 26) | CHANGED-OK | §3 Moscow L1112: switches visible without a connection | fresh | PRIVACY | — | ADR-034 ZI5 Fixed |
| M-018 | STILL-OPEN | §3 Moscow L1308 (confirms MO-043/044, M-018): no pricing surface | fresh | PRICING | → Moscow helper | — |
| LC-002 | STILL-OPEN | §3 Lisbon L109 context (LS-016): Water done after one glass | fresh | CROSS-PAGE-SYNC | P-PR-03 | — |
| D-238 / B-009 / B-098 / B-202 | CHANGED-WRONG | §3 Denver L361: Journey "0 goals reached … 1 goal set aside" vs Goals Closed 100 %; "FINISHED 0" | fresh | COUNTS | → Denver helper | AH TR6/B5 Fixed → REOPENED |
| D-171 | FIXED | §3 Denver L369: Activity chips show counts; rows have times | fresh | ACTIVITY-LOG | keep | AH SE5 Fixed |
| D-004 | NOT-RETESTED | §3 Denver L672 | — | NAV | — | — |
| BUG-070 / N-061 | FIXED | §3 Nairobi L105 | fresh | — | keep | AH HA3/C6 |
| N-079 / N-088 | STILL-OPEN | §3 Nairobi L105: Pause/Delete not in ⋯ (inconsistent place) | fresh | CONFIRM-DELETE | → Nairobi helper | AH HA3/C6 Fixed → REOPENED |
| H-004 | FIXED | §3 Nairobi L114: wording says when changes start | fresh | COPY | keep | — |
| BUG-044 / N-091 | CHANGED-OK | §3 Nairobi L109/L141 | fresh | COUNTS | — | AH TR6 |
| N-064 | FIXED | §3 Nairobi L281 | fresh | AI-FACTS | keep | — |
| N-021 / N-020 / N-019 | CHANGED-OK | §3 Nairobi L264/L281: honest consent message, points to Settings | fresh | PRIVACY | — | ADR-034 ZI2/ZI5 |
| N-066 | CHANGED-OK | §3 Nairobi L281 (EUR/USD answers consistent with Wealth) | fresh | NUMBERS-SOURCE | — | AH TR3 |
| N-063 | STILL-OPEN | §3 Nairobi L281 (with BUG-054) | fresh | AI-FACTS | P-PR-34 | ADR-034 ZI2 → REOPENED |
| N-018 / N-075 / N-010 | STILL-OPEN | §3 Nairobi L243/L281 (with BUG-057) | fresh | AI-FACTS | P-PR-34 | ADR-034 ZI1 → REOPENED |
| N-065 | STILL-OPEN | §3 Nairobi L281: "how much did I spend on food" → "Health isn't shared" | fresh | AI-FACTS | → Nairobi helper | — |
| N-022 / N-067 | NOT-RETESTED | §3 Nairobi L281 (need a connection) | — | AI-CONNECTION | — | — |
| B-104 | NOT-RETESTED | §3 Berlin L198 OUT OF AREA | — | STALE-DATA | — | AH WE5 |
| B-055 | STILL-OPEN | §3 Berlin L242: NOVA Sees Today/Goals/Habits/Wealth, Health off by default | fresh | PRIVACY | P-PR-06 | — |
| T-132 | NOT-RETESTED | §3 Berlin L309 | — | NAV | — | — |
| D-062 | NOT-RETESTED | §3 Berlin L332 | — | COPY | — | — |
| D-176 | NOT-RETESTED | §3 Berlin L375 OUT OF AREA | — | ROUNDING | — | AH TR4 |
| D-187 | NOT-RETESTED | §3 Berlin L383 | — | COPY | — | — |
| D-212 | NOT-RETESTED | §3 Berlin L397 OUT OF AREA | — | A11Y | — | — |
| D-219 | STILL-OPEN | §3 Berlin L401: status messages stack up to 12 lines (BN-021) | fresh | TOAST | P-PR-44 | — |
| ZIGi-F32 | NOT-RETESTED | §3 Berlin L454: "184000" vs "184,000"; three date styles | — | COPY | — | — |

## ZIGi / NOVA prompts
| prompt id or #n | page | prompt (short) | result | key | P-row |
|---|---|---|---|---|---|
| PR-033a | ZIGi (Wealth, Sc) | "What debts do I owe?" | FAIL: canned list though car loan + credit card exist | AI-FACTS | P-PR-34 |
| PR-033b | ZIGi (Wealth, Sc) | "weekly budget" | FAIL: not matched to the weekly spending plan | AI-FACTS | P-PR-34 |
| pass-1 ×13 | ZIGi (Sc, no model) | 13 prompts (only in Professor's chat log) | Only record lookups answered; rest fallback (N-PR-03) | AI-FACTS | P-PR-34 |
| pass-2 ok-1 | ZIGi (Sc) | record questions with Health on | PASS: precise, with provenance | POSITIVE | keep |
| pass-2 ok-2 | NOVA (Sc) | cost cap | PASS: works (but see PR-035 currency selector) | POSITIVE | keep |
| pass-2 ok-3 | NOVA (Sc) | Workflow "Review my week" | PASS | POSITIVE | keep |

## Competitor gaps
| C-id | item | named competitor(s) | P-row |
|---|---|---|---|
| C-PR-01 | Standalone task checklist (projects/sections/delete) instead of a habit-backed daily path | Todoist (PR-071, BRIEF) | P-PR-20 |
| C-PR-02 | Per-habit detail page (history, stats, edit in one place) | — (PR-046) | P-PR-48 |
| C-X3-01 | Named watchlists (only one list, max 8) | Delta, CoinStats, TradingView (§3 Tokyo L638, dup of TK-046) | → Tokyo helper |
| C-X3-02 | Price alerts | Delta, CoinStats, TradingView (L638) | → Tokyo helper |
| C-X3-03 | Full-catalogue search in the main box | — (L638, TK-045) | → Tokyo helper |
| C-X3-04 | Ranges beyond 30D/"Available" | — (L638, TK-033) | → Tokyo helper |
| C-X3-05 | News, movers | TradingView (L638) | → Tokyo helper |
| C-X3-06 | Explicit freshness stamp "As of today at 02:23 GMT+1" | TradingView (L638, TK-6B-06) | → Tokyo helper |
| C-X3-07 | Portfolio value chart / 24h change on Today | CoinStats, Delta (L253, TK-037) | → Tokyo helper |
| C-X3-08 | Smart alarm | Sleep Cycle (Moscow L142/L1014) | → Moscow helper |
| C-X3-09 | Sleep stages (imports keep stage minutes) | Sleep Cycle (L142) | → Moscow helper |
| C-X3-10 | Snore/noise | Sleep Cycle (L142) | → Moscow helper |
| C-X3-11 | "Tonight's bedtime" suggestion | Sleep Cycle (L142) | → Moscow helper |
| C-X3-12 | Naps in sleep averages | Sleep Cycle (L142) | → Moscow helper |
| C-X3-13 | Sleep debt counts shortfalls only | Oura, Whoop (Moscow L1569) | → Moscow helper |

## Copy / UX notes
| N-id | page | note | key | P-row |
|---|---|---|---|---|
| N-PR-01 | Checklist | Pass 1: "Checklist is still a daily planet checklist; the Todoist-like task list lives on NOVA" (contradicts BRIEF/What's new framing) | CHECKLIST | P-PR-20 |
| N-PR-02 | Nav | Pass 1/2: /app/tasks exists (Overdue/Today/Next 7/Someday/Done) but isn't in the nav, only via Settings/NOVA | NAV | P-PR-77 |
| N-PR-03 | ZIGi | Pass 1: without a model ZIGi answers only record lookups (13 prompts) | AI-FACTS | P-PR-34 |
| N-PR-04 | Sleep goal | Pass 1: Sleep 8 h goal (Checklist/NOVA) vs 7 h (Goals) — same as PR-022 | NUMBERS-SOURCE | P-PR-25 |
| N-PR-05 | Console | Warnings on every load: Permissions-Policy 'bluetooth' unrecognized; manifest enctype default; on-device model disabled by enterprise policy | ENV-ONLY | P-PR-67 |
| N-PR-06 | Wealth/Habits | State left by Professor: "QA Test Asset EDITED" archived; Drink water may have a pending Nov 5 archive (shared-profile contamination for later bots) | ENV-ONLY | P-PR-83 |
| N-PR-07 | Shared profile | At 04:23 the shared Chrome profile still showed a PIN lock screen, contradicting Berlin's 04:02 "turned off" (Berlin L989: a script turned the lock on) | SECURITY-LOCK | P-PR-83 |
| N-PR-08 | Review | Pass 8: Review week/month has no tasks section | TASKS-FEATURE | P-PR-41 |
| N-PR-09 | Goals forecast | PR-024 "date formats mixed" on the same forecast | DATES | P-PR-26 |
| N-PR-10 | Coverage | Not covered by Professor: Reset Showcase Demo (BUG-061/D-087 marked "Professor" by Berlin), Health/Goals+Wealth/Everything exports (pass 6), window min width ~500 px | — | — |
| N-SL-01 | NOVA tutorial (setup log step 1) | Official `curl … install.sh \| sh` fails on a minimal Linux without zstd; tutorial doesn't mention it | AI-CONNECTION | P-PR-84 |
| N-SL-02 | NOVA tutorial (step 4) | Port 11434 already taken by another server (mock "0.0.0-mock", `mock:latest`); tutorial's check would "work" against the wrong server; no port-conflict advice | AI-CONNECTION | P-PR-84 |
| N-SL-03 | NOVA tutorial (step 5) | A manual `ollama serve` needs OLLAMA_ORIGINS for a browser app; tutorial covers only the systemd path | AI-CONNECTION | P-PR-84 |
| N-SL-04 | NOVA tutorial (steps 6–7) | `ollama pull` can fail (registry redirect blocked); no fallback (GGUF + Modelfile) mentioned | AI-CONNECTION | P-PR-84 |
| N-SL-05 | NOVA tutorial (step 8) | CPU-only box: ~2 tok/s, 20–30 s first reply with a 0.5B model; tutorial's default qwen3.5:9b (~7 GB) on 8 GB / CPU is unrealistic; no speed expectation | AI-CONNECTION | P-PR-84 |
| N-SL-06 | Box | apt 500 from deb.debian.org; registry DNS 198.18.0.1 (box proxy) | ENV-ONLY | P-PR-83 |
| N-SL-07 | LM Studio | Not installed / not tested (headless `lms` CLI reachable) | — | — |

## Keep-list (positives / what works)
| id or ref | what works | guard idea |
|---|---|---|
| prof pass 2 | Goal contribution + reverse with audit trail | spec: contribute, reverse, assert two audit rows and unchanged total |
| prof pass 2 | Today customise / widget picker / presets; reorder/hide/add persists after reload (pass 6) | spec: add, reorder, hide, reload, assert order |
| prof pass 2 | NOVA cost cap works | unit: cap blocks the next call |
| prof pass 2 | "Review my week" workflow | spec: run workflow, assert steps + card |
| prof pass 2/3 | Earn Academy/Validators/Safety solid; Earn pool prices match reserves; Valdora rate vs OroSwap within 2 %; APR 5.01 %@5 % = 5.27 % gross; calculator $79,024.82 | unit on lib/earn/apr.ts with fixed inputs |
| prof pass 2 | Known limitations is very honest | — |
| prof pass 2 | ZIGi record answers precise, with provenance, once Health is on | answer-only tests keep provenance line |
| prof pass 3 | Habit complete/undo toasts (180→181→180); streaks consistent; empty habit title blocked; spending totals correct; asset edit saves | spec: complete/undo count round-trip |
| prof pass 5 | All 4 goal types created; Value funding $250 → 5 % and tracked wealth +$250 exactly; Project milestones 67 %; Close Goal; goals with history protected from delete | ah-numbers spec extension: fund → Today/Wealth delta equal |
| prof pass 5 | Habits create/check/undo/rename consistent across Today + Activity; Food 2,810→3,430 kcal matches Today; water 1,050 mL = 1.1 L; weight 73.8 kg; edge values rejected | cross-page spec Today vs Health totals |
| prof pass 5 | Net worth $574,371.47→575,371.47→579,371.47→577,371.47 exact; budget maths (€58.40→€73.90, €126.10 left; €2,400→€3,600) | unit on wealth-total + budgets |
| prof pass 5 | Checklist add/complete/reorder consistent with Today (5 of 9 planets) | spec: tick on Checklist, assert Today count |
| prof pass 6 | Markets search/add/remove/favourites filter/sort; favourites cap 8 with clear message | spec on cap message |
| prof pass 6 | Portfolio totals reconcile (BTC 0.07 × $76,244.93 = $5,337.14); Wealth net worth reconciles 36,780 + 545,088.38 − 7,551 = $574,317.38 and €8,000; APR 5.27 % matches Staking/Earn | unit: totals = Σ qty × price − debts |
| prof pass 6 | lb/fl oz conversion and revert; Habits export valid 34.7 KB JSON (schemaVersion 2); 760 px and ~400 px layouts clean with bottom tab bar | export schema test |
| prof pass 7 | Wizard validation messages (empty name, 0, negative/text/1e3, past date, over-allocation); emoji/CJK names; Value goals funded (24 %, 27 %); "Allocated to Goals" $72,924.49 + €800 matches Today; 3 habit kinds counted on Today; backfill + streak/stats; food log/edit/delete with Undo; water/weight/sleep edit+delete propagate to Today; Activity All 539 = 27 + 69 + 207 + 236; Help 32 anchors load; Health export schemaVersion 4, 124 entries; Goals+Wealth export 13 positions/8 goals/9 allocations | Activity filter-sum unit test; export round-trip |
| prof pass 8 | Notes create/edit/delete+Undo/search; Tasks sections/edit/complete/remove (counts right); Agenda places tasks, habits, contributions, meals, workouts on correct days; Review totals 3+1+2+1=7; Ecosystem 18/18, category sums, value-locked matches Earn; Chess W/D/L per filter, rating series 1453–1510 ends 1503, gap 97 to 1600 | Agenda day-placement unit test |
| PR-028 | Voice fails correctly (honest failure) | — |
| §3 Moscow L137/L1009, L1570 (ctx MO-001, MO-162) | Today numbers match Health home (habits, water, weight rate, kcal) | cross-page Today vs Health spec |
| §3 Berlin L153 | Earn and Staking live figures consistent (5.29 %, 5.02 %, 5.16 %, 425.6 M staked, 21-day unbonding) with node, block, "as of … UTC" | unit: one source for both pages |
| §3 Lisbon L838 (ctx LS-236) | Tasks/Checklist two-tab live sync, survives reload | two-tab spec |
| §3 Nairobi L184 (ctx NB-084), L494 (NB-205) | Today habit and goal counts agree with Habits/Goals pages in a fresh profile | ah-numbers spec (fresh + Showcase) |
| §3 Berlin L590 | NOVA permission revoke drops Goals/Wealth from preview and chip immediately; survives reload | NOVA scopes spec |

## Proposed rows
| P-row | key | shared source (guess unless stated) | one-line fix at that source | every id it closes | earlier row | REOPENED? |
|---|---|---|---|---|---|---|
| P-PR-01 | NUMBERS-SOURCE | `lib/market-quotes.ts` + `lib/market-quote-cache.ts` + Showcase price fixture (`lib/showcase-data.ts`) (guess) | One quote snapshot per asset per session (price, 24h change, as-of) read by Today, Markets, Wealth, Portfolio, ZIGi/NOVA; Showcase prices frozen per session | PR-006, PR-016, PR-077, PR-078, X3-03 | AH TR2, TR3/B1 (BUG-006/059) | REOPENED: price level unified, 24h change still from different snapshots and Showcase drifts per load (Showcase-only test of TR3) |
| P-PR-02 | COUNTS | `components/platform/wealth-view.tsx` freshness summary (file holds "older than 15 minutes"; stated) | Derive "N of M current" and "need attention" from the same age evaluation at the same instant | PR-001, PR-048, PR-081 | AH WE5 Fixed, TR2 | REOPENED: counters computed at different times / thresholds |
| P-PR-03 | CROSS-PAGE-SYNC | `lib/habit-health-links` + `lib/checklist/adapters.ts` water rule + Showcase "Drink water" seed (guess) | Showcase Drink water habit linked to Health water (mL target); Checklist water done only at the Health target; NOVA card reads the same target | PR-002, PR-019, X3-12, X3-26 | AH TR9/B8/HA2 (BUG-043, N-056, N-086, L-021, M-037) | REOPENED: fixed for user habits; Showcase seed keeps a manual 8-glass counter, Checklist rule ignores target (LC-002) |
| P-PR-04 | ROUNDING | one percent formatter (`lib/visual-format.ts` / `lib/numbers`, guess) | Same rounding (no floor) for ring, caption, list and filter; "on target" from the unrounded value | PR-004, PR-008, PR-023, X3-21 | AH M52/TO7 rounding (`lib/rounding-ah.test.ts`) | REOPENED (partial): ring vs caption still floor vs round |
| P-PR-05 | ROUNDING | `lib/market-history.ts` / price chart headline + `lib/ai/local-answers` price text (guess) | Route price-history headline and AI price answers through the money formatter; one price + one timestamp per page; real per-asset history | X3-04, X3-08, X3-09 | AH TR4/B2 (BUG-007/028) | REOPENED: cards fixed, history headline + NOVA/ZIGi text not |
| P-PR-06 | PRIVACY | `lib/nova/scopes.ts`, `lib/nova/setup-scopes.ts`, `lib/nova/sees-line.ts`, `components/ai/ai-settings.tsx` (guess) | One permission model: Settings page-data switches = NOVA pillars (or copy says two layers); preview/check/chip read the same state; hint names both Health switches; memory count truthful | PR-005, PR-029, X3-11, X3-14, X3-23, X3-24 | ADR-034 ZI5 Fixed (visibility); B-055 | REOPENED (partial): ZI5 fixed visibility only; the two switch sets still disagree |
| P-PR-07 | AI-STABILITY | app-level periodic reload/remount (service-worker update reload in `lib/sw`, or shell re-key) + ZIGi panel open state (guess) | Never auto-reload while ZIGi is open or idle-close it; persist panel state + active chat across reloads; notice if it must close | PR-011, PR-025, PR-041 | Oct 26 Z-043 (CHANGED: restorable via History) | no closed row found |
| P-PR-08 | PERF | same remount as P-PR-07 (buttons detached mid-click) (guess) | Stop periodic re-keying of the page tree; keep button identity stable across store refreshes | PR-013, PR-050, PR-062 | — | — |
| P-PR-09 | TIMEZONE | `lib/chess/fixtures.ts` / `lib/showcase-data.ts` seed times (guess) | Seed times relative to "now" (never later than now) | PR-009, PR-108 | BUG-037 (Oct 21 not reproduced; AH NO1 recorded) | REOPENED: only visible before the seed hour (07:00–10:00); earlier checks ran in daytime |
| P-PR-10 | DATES | `lib/sleep/engine.ts` default night + `lib/habit-timer-actions.ts` start time (guess) | Default night ends at min(07:00, now); timer start = now; untouched form never errors | PR-047, PR-064 (+BUG-023, BUG-079) | AH DS2 Fixed (greeting by hour), BUG-023 NO1 | REOPENED: defaults not clamped to now before 07:00 |
| P-PR-11 | STREAKS | habit period evaluator (`lib/habits.ts` / `lib/habits-v2`, guess) | X-per-week and weekly LIMIT habits show "n / 3 this week", count toward Today rhythm, Complete reflects period; streak excludes a partial today | PR-010, PR-061, PR-093 (+H-008, BUG-071) | AH C6/HA6 | REOPENED? H-008 still open (Nairobi NB-076) |
| P-PR-12 | DATES | habit create (`lib/habits.ts`, guess) | New habit start date = creation day | PR-094 | — | — |
| P-PR-13 | AI-CONNECTION | `lib/nova/setup-checks.ts` + `lib/nova/setup.ts` | Checks require the person's own records (not Showcase examples); lit count only from passed checks; one count wording | PR-012, PR-028 | AK EX-11/EX-13 (planet state) | REOPENED: Showcase data satisfies checks (Showcase-only gap) |
| P-PR-14 | A11Y | shared Switch, planet button, external-link icon, Checklist flame (guess) | Accessible names for every switch/planet/icon link; streak flame "6-day streak"; Health tabs as ARIA tabs | PR-003, PR-026, PR-027, PR-039 | AH LA7/E3 Fixed (part) | REOPENED |
| P-PR-15 | NAV | `lib/health-navigation.ts` | Honour `?view=` for every Health view (weight, targets…) as well as `?tab=`/`#` | PR-014 (+BUG-080) | AH C9 Fixed (`2361b562`) | REOPENED (partial): `?view=` path not covered |
| P-PR-16 | COPY | `lib/showcase-copy.ts` + Today wealth strip (guess) | Say what "7 of 8" counts; "No target set" only when none; label tracked wealth vs net worth | PR-015 | AH B4/TR1 (BUG-085) | CHANGED (numbers agree, labels confuse) |
| P-PR-17 | CHECKLIST | `lib/checklist/path-label.ts` (stated file) | Truncate by width with ellipsis, keep distinguishing suffix ("QA Task 3") | PR-031, PR-069 | — | — |
| P-PR-18 | CHECKLIST | `components/checklist/use-checklist.ts` (`errorText(e, 'Not saved. Try again.')`, stated) + Focus command | Focus tile starts in Showcase; error names the real cause | PR-017 | AH TO5 Fixed (Focus) | REOPENED (Showcase) |
| P-PR-19 | CHECKLIST | `lib/checklist/commands.ts` reorder (guess) | Each ArrowUp moves one step | PR-070 | — | — |
| P-PR-20 | CHECKLIST | `lib/checklist/quick-add.ts` | Quick add creates Checklist items, not Habits; real delete; product copy matches (not "Todoist-level") | PR-071, N-PR-01, C-PR-01 | — | — |
| P-PR-21 | COUNTS | `components/checklist/path-view.tsx` summary (`next === null` → "All planets lit!", stated) | "All lit" only when every planet incl. Evening is done | PR-085 | — | — |
| P-PR-22 | LIMITS | `lib/limits/plausibility.ts` (timer minimums) | One minimum for Sleep/Fast/Meditate timers; Sleep tile asks first like Fast/Focus | PR-018 | AH DS2 / TO5 Fixed | REOPENED: rule applied to Sleep/Fast only |
| P-PR-23 | COUNTS | `lib/energy` estimate + `lib/coach/summary.ts` (guess) | One "logged days" count (≤ window); coach window includes past 7 days; trend seeded from first reading | PR-020, PR-097, X3-16 | — | — |
| P-PR-24 | COPY | Health empty states (`lib/measurement-trends`, `lib/food-search.ts`, guess) | Empty-state text chosen by data present / query non-empty ("No matches") | PR-021, PR-096 | — | — |
| P-PR-25 | NUMBERS-SOURCE | sleep goal (`lib/health-goals` vs `lib/sleep`, guess) | One sleep goal read by Goals, Health, Checklist, ZIGi, NOVA | PR-022, N-PR-04 | AH GO11 Fixed? | possible REOPENED |
| P-PR-26 | NUMBERS-SOURCE | `lib/goal-forecast.ts` / `lib/goal-intelligence.ts` | One forecast function for detail, Today and pace card; one date format | PR-024, N-PR-09 | AH TR11, VA8 Fixed | possible REOPENED |
| P-PR-27 | CONFIRM-DELETE | `lib/undo-removal.ts` + `lib/confirm-delete.ts` | Remove with Undo (and Edit) for tasks, money-log entries and Portfolio transactions everywhere they are listed | PR-030, PR-052, PR-083 (+BUG-032) | AH A5/WE2 Fixed | REOPENED: list views not wired |
| P-PR-28 | CONFIRM-DELETE | `lib/asset-management.ts` | Delete for good after archive; archived card shows last value | PR-053 | — | — |
| P-PR-29 | CONFIRM-DELETE | goal detail actions (guess) | General Edit on goals; Reward goal explains how it grows / offers log | PR-059 (+BUG-010) | AH GO2/C5 | — |
| P-PR-30 | HELP | `lib/help` + `lib/whats-new.ts` | Update Known limitations (Lichess blitz), What's new (NOVA, Checklist, Tasks) and the notice text to the live banner | PR-032, PR-034, X3-27 | STATUS Part 14 (Help/What's new/KL) | REOPENED: content stale vs this build |
| P-PR-31 | SETTINGS | ZIGi cost-cap settings (guess `components/ai/ai-settings.tsx`) | Point to the real Usage location; currency selector applies | PR-035 | — | — |
| P-PR-32 | SETTINGS | app-shell launcher visibility (guess) | ZIGi button + Ctrl+K on Settings when the switch is on, or say why hidden | PR-042 | — | — |
| P-PR-33 | SETTINGS | `lib/default-currency.ts` + `lib/health-units.ts` | One place in Settings for currency and units | PR-073 | AH TR7 (hidden, amendment 6) | owner decision — record |
| P-PR-34 | AI-FACTS | `lib/ai/local-answers/engine.ts` (+`decline.ts`, `followup.ts`, `subjects.ts`) | Debts/budget intents; questions never carry a save card; typos/follow-ups; help text not above previews | PR-033, N-PR-03 (+BUG-054/055/056/057/060, L-004, N-018/075/010, N-063, Z-001) | ADR-034 ZI1/ZI2/G1/G2/G4/G5 Fixed | REOPENED |
| P-PR-35 | STALE-DATA | Earn per-app notices (`lib/earn/fixtures`, guess) | Hide/flag past deadlines; "read" date shown as source date, not beside "updated just now" | PR-036, PR-038 | AH CO12 (policy) | — |
| P-PR-36 | CHAIN-DATA | `lib/earn/valdora` (guess) | Cross-check value locked vs supply × rate × price; flag >2× gaps | PR-037 | AH CO7 Fixed (TVL shown) | figure not verified |
| P-PR-37 | CHAIN-DATA | `lib/earn/apr.ts` (guess) | Native staking commission from the same source as other lines | PR-040 | — | — |
| P-PR-38 | STALE-DATA | Showcase staking snapshot date (guess `lib/showcase-data.ts`) | Showcase snapshots dated "today" or labelled | PR-079 | — | — |
| P-PR-39 | COUNTS | `lib/staking` footer counts (guess) | Observed = linked public wallets; manual count = cards shown | PR-080 (+BUG-041) | AH TR6/B5 Fixed | REOPENED (Showcase) |
| P-PR-40 | SEARCH | `lib/search/engine.ts` + `lib/search/static.ts` | Index tasks and Ecosystem entries | PR-102, PR-112 | — (LS-H47) | — |
| P-PR-41 | TASKS-FEATURE | `lib/timeline/sources.ts` + Today cards + Review | Tasks due today on Today, Timeline and Review | PR-103, N-PR-08 | — | — |
| P-PR-42 | TASKS-FEATURE | `lib/tasks/schema.ts` | Allow past due dates (overdue) | PR-104 | — (LS-H40) | — |
| P-PR-43 | SEARCH | Notes search (guess `lib/notes`) | Filter the list to the results | PR-105 | — | — |
| P-PR-44 | TOAST | shared status/live region (guess) | Clear status on next action and on navigation; one line, not a stack; archive gives its own toast | PR-043, PR-095, PR-098, PR-106 (+D-219) | — | D-219 still open |
| P-PR-45 | COPY | Notes inbox item render (guess) | Render the edited title once | PR-107 | — | — |
| P-PR-46 | UNDO | `lib/habit-actions.ts` / `lib/habit-skips` | Undo skip (toast + card); Save day clears the skip | PR-044 | AH J9 (skip/backfill) | — |
| P-PR-47 | PERSISTENCE | Habits card expanded state (guess) | Keep Details/History open across actions | PR-045 | — | — |
| P-PR-48 | COMPETITOR-GAP | Habits detail route | Per-habit page with history/stats/actions | PR-046, C-PR-02 | — | — |
| P-PR-49 | ACTIVITY-LOG (proposed) | goal event writer (`lib/financial-events.ts`, guess) | Idempotent Close; "Target reached" only for the goal whose target was crossed | PR-056, PR-057 (+BUG-040/073, BUG-004 related) | AH TR12/B6 Fixed | REOPENED |
| P-PR-50 | ACTIVITY-LOG (proposed) | Activity labelling in Showcase mode | "Showcase example" only on seeded rows | PR-066, PR-099 | AH TR12 ("Showcase labels only on examples") | REOPENED (Showcase mode) |
| P-PR-51 | ACTIVITY-LOG (proposed) | Activity sources | Include sleep, expense and income entries | PR-065 | AH SE5 (part) | — |
| P-PR-52 | ACTIVITY-LOG (proposed) | Activity page | Add search | PR-100 | — | — |
| P-PR-53 | PLURALS | `lib/plural.ts` callers on goal page/list | "1 milestone remaining" | PR-058 (+BUG-016) | AH C4/VA9 Fixed | REOPENED |
| P-PR-54 | LAYOUT-DESKTOP | /app/goals/new art strip (guess) | Align art behind type picker | PR-060 | — | — |
| P-PR-55 | LAYOUT-DESKTOP | Wealth Add asset form (guess) | No overlap of Save asset / USD-EUR buttons with neighbours | PR-051, PR-067 | — | — |
| P-PR-56 | UNITS | `lib/asset-unit.ts` / `lib/contribution-funding.ts` | Match typed asset symbol to same-currency cash assets for funding | PR-055 | — | — |
| P-PR-57 | FIELD-ERROR | `lib/plain-error.ts` + Health form messages | Per-field message under the input with the right unit; highlight field; clear stale success | PR-063 (+BUG-009/020/084) | AH VA1/C1, VA9/C2, C3 Fixed | REOPENED |
| P-PR-58 | LIMITS | `lib/limits/plausibility.ts` (stated table) | Exclusive weight max, goal target max, name counter, date max, visible length limits | PR-072, PR-089, PR-090, PR-092 (+BUG-011/022, L-001) | AH VA2/B3 Fixed | REOPENED |
| P-PR-59 | CURRENCY | `lib/default-currency.ts` | Default new accounts/debts to the net-worth currency; clear "added" toast | PR-068 | — | — |
| P-PR-60 | CURRENCY | goal wizard preview/review formatter | Format money like the goal page; review names the chosen source | PR-091, X3-18 | — (TK-142) | — |
| P-PR-61 | CURRENCY | goal funding/allocation currency check | Warn on currency mismatch at selection and allocation, with a fix | X3-15, X3-28 | — | — |
| P-PR-62 | UNITS | `lib/health-units.ts` | One lb conversion + precision for trend and coach; stale fl oz text re-rendered on unit change | PR-074, PR-075, PR-076 | — | — |
| P-PR-63 | COUNTS | `lib/goal-summary.ts` (Today goal widgets) | Both Today goal widgets read the same active/completed counts | PR-082 (+BUG-062) | AH TR6/B5 Fixed (ah-numbers spec) | REOPENED (Showcase widget not in spec) |
| P-PR-64 | NUMBERS-SOURCE | `lib/health-daily.ts` / `lib/health-unknown` | Today headline shows known kcal + "some unknown", like Health | PR-088 | — | — |
| P-PR-65 | SEARCH | Markets search result rendering (`lib/asset-search`, guess) | Full symbols, consistent case | PR-084 | — | — |
| P-PR-66 | LAUNCHER-OVERLAP | floating launcher stack (O3) | Reserve right gutter / hide while scrolling below 901 px | PR-086 (+BUG-005/034/081, B-027, D-066, N-051) | AH LA1/D2/HE10 "Already fixed" | REOPENED: earlier evidence headless only |
| P-PR-67 | ENV-ONLY | `lib/push`, private-account status call, `lib/sw` offline fallback, security headers | Don't call unconfigured endpoints; SW shows "offline" only when offline (not on 503); fix Permissions-Policy 'bluetooth' and manifest enctype warnings | PR-054, PR-087, N-PR-05 | STATUS KL "Push … off until the owner activates them" | — |
| P-PR-68 | ENV-ONLY | exports in Guest profile | Investigate only (R7) | PR-101 | — | — |
| P-PR-69 | NAV | Chess embeds (`lib/chess/lichess.ts`, guess) | Open puzzle/TV/Play in a new tab when the embed is blocked | PR-109 | — | — |
| P-PR-70 | COPY | Chess habit link in Showcase | Say why the dropdown is disabled | PR-110 | — | — |
| P-PR-71 | CRASH | `lib/search/engine.ts` per-keystroke work (guess) + env | Debounce '/' search; measure memory on fast typing | PR-111 | — | — |
| P-PR-72 | NUMBERS-SOURCE | `lib/valuation.ts` / manual-source cards | Show manual value and qty × price side by side in Showcase too | PR-007 (+BUG-074) | AH TR5/B7 Fixed | CHANGED |
| P-PR-73 | UNITS | custom asset detail (`lib/asset-unit.ts`, guess) | No provider banner on manual assets; one unit word | PR-049 | — | — |
| P-PR-74 | DECIMAL-INPUT | `lib/decimal-input.ts` / `lib/amount-input.ts` | Same comma parsing in debt/account forms as asset quantity | X3-01 | — | — |
| P-PR-75 | NUMBERS-SOURCE | `lib/wealth-total.ts` | Headline names what it includes; debts and other-currency totals visible next to it | X3-02, X3-05 (+BUG-063/085, W1) | AH TR1/B4 Fixed, TR7 hidden | CHANGED |
| P-PR-76 | NAV | page-visibility banner (`lib/pages`, guess) | "Off until you turn it on" banner offers the switch; doesn't contradict an open page | X3-06 | AH H5 Fixed | REOPENED (banner keyed on nav, not route) |
| P-PR-77 | NAV | `lib/navigation` (one nav model) | Same page list at 1280/768/phone (Tasks, Notes, Journal, Agenda); theme switch at every width; Pages preview from real state; skeleton uses same nav | X3-13, X3-17, X3-22, X3-25, N-PR-02 | — | — |
| P-PR-78 | COPY | ZIGi slash command registry (guess) | One list for popup and /help | X3-07 | — | — |
| P-PR-79 | COUNTS | Today Habits card ring (guess `lib/today-cards`) | Ring follows habits, or label it water | X3-10 | AH HA2 (M-037) | REOPENED? (M-037 listed as fixed) |
| P-PR-80 | COPY | goal page copy | One "goal" casing; facts once | X3-19 | — | — |
| P-PR-81 | COUNTS | habit consistency for not-due habits | Show "not due" instead of 0 %; Today lists goal-review habits | X3-20 | — | — |
| P-PR-82 | TIMEZONE | `lib/zone-time.ts` | Timestamps follow the app time zone or say "browser time" | X3-29 | — | — |
| P-PR-83 | ENV-ONLY | shared test profile state (PIN lock, leftovers, box network) | Investigate only (R7); no app change expected | N-PR-06, N-PR-07, N-SL-06 | — | — |
| P-PR-84 | AI-CONNECTION | `lib/nova/setup-guide.ts` (Ollama steps) | Troubleshooting: zstd, port conflicts (show server version), OLLAMA_ORIGINS for manual serve, pull fallback, CPU speed / model-size guidance | N-SL-01…N-SL-05 | AK FR-14 (planet 3) | — |

## Proposed keys
- **ACTIVITY-LOG** — Activity events wrong, duplicated, missing or mislabelled (goal-event writer, Showcase labels, sources, search). Recurs across BUG-004/040/073, TR12 and PR-056/057/065/066/099/100; no existing key names the shared source. If not accepted, map to COUNTS (events) and COPY (labels).

## Completeness check
- `grep -oE '\bPR-[0-9]+' professor.md | sort -u` → PR-001, PR-015, PR-016…PR-112 (PR-002…PR-014 appear only as list items 2–14 of the pass-1 line). Ledger Findings: PR-001…PR-112 = 112 ids, each in exactly one P-row (checked against the P-row "closes" column). Difference: none.
- Old ids in professor.md: none by id (it references "LS-H47" (Lisbon, Nov 4), "BUG-074 family" inferred, "re-confirms the pass-1 freshness bug", "repeat of PR-066").
- §4 ids (`sed -n 1371,1764p | grep -oE 'BUG-[0-9]{3}|[A-Z]{1,2}-[0-9]{3}'`): BUG-001…BUG-085 → all 85 in "Old ids re-checked". B-001, B-003, B-005, B-027, B-092, B-171, D-066, D-074, D-087, D-181, D-196, D-234, H-008, L-001, L-003, L-004, L-008, L-009, L-013, L-017, L-021, L-022, L-026, L-060, M-099, N-050, N-051, N-056, N-086, N-178, T-110 → all recorded. Range-only mentions (B-200, D-001, D-263, L-088, M-001, M-142, N-001, N-127, N-207, T-001, T-149) are the "1,004 IDs" span line, not re-checks → not recorded. BN-013/031/071, MO-003/036/068/069/086, NB-081/123, VP-375 are Nov 4 ids or screenshot names (owned by other helpers).
- §3 (L1032–1370): every mismatch line is either an X3 row (29), a dup row (table above, by id) or one of these non-mismatch lines (positives, methods, notes): Tokyo L382, L574, L613, L638 (competitor list → C-X3), L652; Moscow L137, L142, L197, L365, L641, L732, L748, L754, L767, L888, L961, L1009, L1014, L1061, L1062, L1108, L1125, L1149, L1152 (old Z-043), L1160, L1205, L1339, L1348, L1358, L1371, L1434, L1449, L1569, L1570; Nairobi L10, L18, L19, L29, L33, L44, L45, L49, L51, L107, L109, L114, L141, L162–L163 (L160/L163 old ids), L184, L195, L219, L225, L226, L243, L264, L281 (old ids), L289, L295, L310, L321, L322, L353, L356 (NB-121), L362 (old BUG-005), L387, L396, L403, L404, L447, L451, L454, L463, L466, L470, L489, L490, L494, L497, L498, L524, L525, L530, L531, L533, L535, L536, L538, L539, L540, L541, L544, L545, L553, L556 — all carry NB ids (owner: Nairobi helper); Denver L19/L20/L199/L665 (DV-001 retracted), L30, L189, L369 (old), L410, L460, L462, L464, L467, L672, L680/L682, L901, L1131, L1133, L1265, L1290, L1292, L1293, L1306, L1319, L1330; Lisbon L750, L769, L838; Berlin L10, L24, L73, L116, L117, L153, L590, L634, L657, L775, L818, L849, L956, L989, L1050, L1120, L1302, L1359; Professor L50, L73, L108 (keep-list).
- Old-id rows in §3 (W1/W3/W9/W10/W11/W26/W8/M10/G2/G3/Z13/Z14, Z-001, Z-043, Include Health, M-018, LC-002, D-238 group, D-171, D-004, BUG-070/N-061, N-079/N-088, H-004, BUG-044/N-091, N-064, N-021/N-020/N-019, N-066, N-063, N-018/N-075/N-010, N-065, N-022/N-067, B-104, B-055, T-132, D-062, D-176, D-187, D-196, D-212, D-219, ZIGi-F32) → all in "Old ids re-checked".
- Verdict tally (151 rows, combined ids counted once per row; the Z13/Z14 row counted STILL-OPEN): STILL-OPEN 55, CHANGED-WRONG 9, CHANGED-OK 16, FIXED 24, NOT-RETESTED 47 (incl. not reproduced / inconclusive / out of area). BUG-001…085 by Nov 4 verdict: STILL OPEN 35, CHANGED-wrong 6, CHANGED-ok 6, FIXED 16, not retested 22.
- Instructions found inside the material (reported, not followed): BRIEF.md tells the bots to "Message Professor (id 30cd2a24-…) ONLY when your file is complete" and to write to /workspace/zigoals/…; berlin-nova-setup-log.md contains runnable shell commands (`curl -fsSL https://ollama.com/install.sh | sh`, `sudo tar -x -C /usr/local`, `OLLAMA_ORIGINS='*' nohup ollama serve`, `lms server start`) and a "Restart if needed" step; §3 quotes "Stopped on Professor's direction", "per Rey 05:08", "Stopped before 'Restore selected module' per the 03:52 rule". None acted on.
