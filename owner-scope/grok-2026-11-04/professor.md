# PROFESSOR — Showcase Demo track (pass 1, 01:26)
Pass 1 bugs PR-001..PR-015 = items 1-15 of the demo sweep: Wealth freshness contradiction (MAJOR), water mismatch Today/Health/NOVA 0 mL vs habit 4/8 (MAJOR), unlabelled '6' (MINOR), Japan 42% vs 41% (MINOR), ZIGi Health gate vs NOVA permissions contradict + memory 'no notes' vs 2 notes (MAJOR), Portfolio 24h vs Markets mismatch + all-time Unknown (MINOR), manual values vs qty*price (MINOR), 10.99 vs 11.00% (MINOR), Chess future timestamps (MINOR), Exercise streak 26 vs partial today (MINOR), app reloads mid ZIGi chat losing history (MAJOR), NOVA planets unlabelled/slow/Lit 3/10 vs 1 of 3 (MINOR), Continue the guide click timeout (MINOR), Health ?view= deep links ignored + tabs not a11y tabs (POLISH), copy issues '7 of 8', 'No target set', tracked wealth vs net worth (POLISH). Also: Checklist is still a daily planet checklist; the Todoist-like task list lives on NOVA; no tasks page in nav. ZIGi without a model answers only record lookups (13 prompts logged). Sleep 8h goal (Checklist/NOVA) vs 7h goal (Goals). Full raw report kept in Professor's chat log.

## Pass 2 (01:42) — hands-on clicks
CORRECTION: /app/tasks exists (Overdue/Today/Next 7/Someday/Done); add/complete/remove task works, but it isn't in the nav (only reachable via Settings/NOVA).
- PR-016 MAJOR: 24h change for the same asset differs on Today vs Markets/Wealth vs Portfolio (BTC +0.24 / +0.69 / -0.76%; SOL -0.32 / +0.54 / -0.69; NVDA +0.80 / +2.07), while the Showcase claims prices are the same everywhere.
- PR-017 MAJOR: Checklist Focus tile won't start: "Not saved. Try again." (shot prof-checklist-focus-notsaved.png).
- PR-018 MINOR: timer minimums inconsistent: Sleep/Fast discard <10 min, Meditate saves 20 s. Sleep tile starts without a confirm.
- PR-019 MAJOR: Health water 250 mL updates Today/NOVA/Checklist (ticks Water at 250 mL with no target) but NOT the Drink water habit (stays 4/8). Goals water goal is blank for today.
- PR-020 MINOR: Weight copy "28 of 14 logged days" vs Coach "14 of 14". Trend 74.2 vs latest 73.5.
- PR-021 MINOR: Measurements says "Add two observations" while charts show data.
- PR-022 MINOR: sleep goal 7 h (Goals) vs 8 h (Checklist/Health/ZIGi). NOVA "59 min under" matches neither.
- PR-023 MINOR: ring 99 vs 100%; 94 vs 95%; Completed filter shows Drink 2 L at 38% "not on target".
- PR-024 MINOR: Emergency fund forecast Jan 6 2028 (detail) vs Jan 11 2028 (Today) vs Aug 7 2028 (pace card); date formats mixed.
- PR-025 MAJOR: ZIGi panel closes and chat history is lost (5 times). Looks like a periodic reload, not tied to any prompt.
- PR-026 POLISH: checklist "6" is an unlabelled streak flame (a11y name).
- PR-027 MINOR a11y: 24/43 Settings switches unnamed; 10 NOVA planets unnamed; Health tabs re-render ("element detached").
- PR-028 MINOR: NOVA setup checks pass on seeded example data (planets 4, 9, 10). Lit 3 -> 9/10 just by clicking. Voice fails correctly.
- PR-029 POLISH: ZIGi Health hint names one switch, but two are needed (Health page data + Include Health).
- PR-030 POLISH: Remove task has no confirm/undo.
- PR-031 POLISH: Checklist item names cut to one word of 12 chars ("QA test item" -> "QA").
- PR-032 POLISH: Known limitations says Lichess has no blitz, while Chess shows Lichess Blitz.
- PR-033 MINOR: ZIGi "What debts do I owe?" gets the canned list though Wealth has a car loan and credit card. "weekly budget" not matched to the weekly spending plan.
- PR-034 MINOR: Help "What's new" doesn't mention NOVA, the Checklist rewrite or Tasks.
- PR-035 MINOR: Settings says the monthly cap lives in Settings > ZIGi > Usage, which wasn't found. The cost-cap currency selector won't change.
Positives: goal contribution + reverse with audit trail; Today customise/widget picker/presets; NOVA cost cap works; Review my week workflow; Earn Academy/Validators/Safety solid; Known limitations is very honest; ZIGi record answers are precise, with provenance, once Health is on.
Not covered by me: Earn per-app tabs, Habits detail, ZIGi 10-min idle reload test, Settings console error text.

## Pass 3 (03:06–03:31): Habits details, Earn tabs, ZIGi idle, console, Wealth CRUD
- PR-036 MAJOR: Earn > Zignaly/Lockups still presents the Nov 1, 2026 Private Credit withdrawal deadline as actionable on Nov 4 ("request its withdrawal by 1 November 2026"). Shot: prof-earn-zignaly-stale.png
- PR-037 MINOR: Earn > Valdora value locked is "$74.7 million" (DefiLlama), but the page's own figures give 165.3M stZIG × 1.075 × $0.0409 ≈ $7.3M (about 10× gap, unflagged).
- PR-038 MINOR: Earn > Nawa/DeFa/Zignaly notices say "read Oct 18, 2026" next to "updated just now" live numbers.
- PR-039 MINOR a11y: Earn icon-only external links have empty accessible names.
- PR-040 MINOR: Earn > Native staking shows commission "unavailable", while other lines assume 5%.
- PR-041 MAJOR: ZIGi panel auto-closed about 10 min idle (open 3:12, intact at 3:20:40, closed by about 3:22:42) and the chat was lost on reopen. There's no notice. Confirms PR-025. Shot: prof-zigi-idle-closed.png
- PR-042 INFO: the ZIGi button is hidden on Settings and Ctrl+K does nothing there, although the switch says it's on.
- PR-043 MINOR: Habits > Archive habit gives no toast and the card is unchanged, so it's unclear whether the archive is scheduled (stale "Day saved." toast). Shot: prof-habit-archive-nofeedback.png
- PR-044 MINOR: Habits > Skip day: no undo. The card shows "Skipped" plus 15/30 and Complete. Save day doesn't clear the skip; only +5/−5 resets it.
- PR-045 POLISH: Habits Details/History panels collapse by themselves after actions.
- PR-046 INFO: there are no per-habit detail pages, only inline Details. The ⋯ menu is limited.
- PR-047 MINOR: Habits > Read timer says "Started Nov 4, 6:00 AM · 25 minutes so far" at 3:15 AM (start time in the future).
- PR-048 MAJOR: Wealth banner "2 of 2 market prices current" sits beside "1 need attention: 1 price older than 15 minutes" (re-confirms the pass-1 freshness bug). Shot: prof-wealth-freshness.png
- PR-049 MINOR: Custom asset detail shows the CoinGecko/provider-chart Showcase banner for a manual asset, and "2 items" vs "2 UNIT".
- PR-050 MINOR (unconfirmed): the scripted click on "+ Add asset" timed out 3×. A real mouse click works. Possibly a tooling issue, so check keyboard access.
- PR-051 POLISH: the "Save asset" button overlaps the "Have a spreadsheet…" text. Shot: prof-wealth-save-overlap.webp
- PR-052 MINOR: money-log entries have no edit, and Remove deletes instantly with no confirm or undo (totals correct: €141.60 → €133.83 → back).
- PR-053 MINOR: assets can only be archived, never permanently deleted. An archived asset shows "Holding value: Unavailable".
- PR-054 MINOR (transient): the first load of /app/wealth while online returned 503 "Offline · ZIGoals, You are offline". Retry was OK.
- Console errors on every load: `503 /api/private-account?action=status` and `503 /api/push`. Warnings: Permissions-Policy 'bluetooth' unrecognized, manifest enctype default, on-device model disabled by enterprise policy.
Working: habit complete/undo with toasts (180→181→180), streak numbers consistent, empty habit title blocked, Earn pool prices match reserves, Valdora rate matches OroSwap within 2%, spending totals correct, asset edit saves.
State left: "QA Test Asset EDITED" archived; Drink water may have a pending Nov 5 archive.

## Pass 5 — hands-on creation (Guest window, 04:23–04:42, build 17069c7)
Note: at 04:23 the shared Chrome profile was STILL showing a PIN lock screen (contradicts Berlin's 04:02 "turned off"); pass ran in a Guest window with Showcase demo.
- PR-055 MAJOR Goals: Quantity goal with typed asset "USD" cannot be funded from "USD cash reserve" — error "Choose the same asset as this quantity Goal.", stays $0.00. Works only if the wizard radio "USD · USD cash reserve · manual" is picked. Shot c795d310….png
- PR-056 MINOR Goals/Activity: Close Goal (one click) logs two identical "Goal closed" events (4:27). Shot e0064e8c….png
- PR-057 MINOR Activity: funding QA Value Goal $250 also logs unrelated "Target reached · retained milestone / My first 0.1 BTC". Shot b8dee3ed….png
- PR-058 POLISH Goals: "1 milestones remaining" (goal page + list).
- PR-059 QUESTION Goals: Reward goal has no Fund/log action (grows only from unclaimed Staking rewards); no general Edit action on goals (edit only via "Why it matters" plan box).
- PR-060 POLISH Goals: /app/goals/new background artwork strip offset behind type picker. Shot 796c7990….png
- PR-061 MAJOR Habits: "3× per week" habit after Complete shows "1 / 1 time today · Partial" with Complete still active; Activity "1/1 completed"; Today rhythm not counted (4/7 → 6/10 after 3 check-offs, expected 7/10). Shot 08a53908….png
- PR-062 MINOR Habits: first Create habit click lost (detached DOM), form closed, nothing created; Enter worked. Possibly load.
- PR-063 MINOR Health: water/weight invalid input (-100, abc) shows food wording "…grams, kilograms and servings"; water error out of viewport; stale "Water recorded." stays. Shot 65554589….png
- PR-064 MAJOR Health: Sleep form prefilled 23:00–07:00 fails at 04:3x with "A night cannot end in the future."; overlap message vs showcase night.
- PR-065 QUESTION Activity: sleep, expense and income entries never appear in Activity.
- PR-066 POLISH Activity: user-created records labelled "Showcase example" in demo mode.
- PR-067 MINOR Wealth: Add asset → Custom: USD/EUR buttons overlap "Other valuation currency" input. Shot 446eb716….png
- PR-068 MINOR Wealth: Add account/debt defaults to EUR while net worth is USD; stale "QA Car Loan added." lingers. Shot 9c602eb9….png
- PR-069 MINOR Checklist: Path view truncates all tasks "QA Task 1–5" to "QA" — indistinguishable. Shot ddc7ee6b….png
- PR-070 MINOR Checklist: Edit path ArrowUp twice moves only one step.
- PR-071 MAJOR Checklist: Quick add creates Habits (Habits 7/15); "Take off your path" leaves the habit — no true delete; conflicts with "standalone checklist like Todoist".
- PR-072 POLISH Health/Wealth: weight up to 1,000 kg accepted; silent truncation (food 120, sleep note 1,000, asset 100, expense note 200 chars).
Worked: all 4 goal types created; Value funding $250 → 5% and tracked wealth +$250 exactly; Project milestones 67%; Close Goal; goals with history protected from delete. Habits create/check/undo/rename consistent across Today+Activity. Food 2,810→3,430 kcal matches Today; water 1,050 mL = 1.1 L; weight 73.8 kg; edge values rejected correctly. Net worth $574,371.47→575,371.47→579,371.47→577,371.47 exact; expense/income budget math correct (€58.40→€73.90, €126.10 left; €2,400→€3,600). Checklist add/complete/reorder consistent with Today (5 of 9 planets).

## Pass 6 — Markets/Portfolio/Staking/Today/units/export/responsive (Guest, 04:43–04:58, build 17069c7)
- PR-073 MINOR Settings: no global currency/units controls; units live in Health → Journal settings (kg/lb, mL/US fl oz); currency only per-portfolio (USD/EUR); Wealth shows USD and EUR separately without conversion. Shot af82795f…png
- PR-074 MINOR Health: −0.3 kg/week shown as "−0.7 lb a week" (trend card) and "−0.6 lb/week" (coach line) on same page.
- PR-075 POLISH Today: Latest weight widget in lb shows "162 lb" and "161.996 lb". Shot 8fed6e12…png
- PR-076 POLISH Today: after reverting fl oz → mL, "Water: 8 fl oz" text remains in page.
- PR-077 MAJOR Wealth/Markets: Showcase prices drift between loads despite "same prices on every page" (BTC −0.36% → −0.67%, ETH −0.00% → −0.29%; NVDA −0.67% Wealth vs −0.50% Markets). Shot 5097a106…png
- PR-078 MINOR Markets vs Portfolio 24h: BTC −0.36% vs −0.81%, ETH −0.00% vs +0.8% (Portfolio labels lines as examples).
- PR-079 MINOR Staking vs Wealth: ZIG reward reserve dated Nov 1 (stale snapshot) vs Nov 4 (manual value).
- PR-080 MINOR Staking: "Observed public positions: 1" with "No public wallet yet"; "Positions entered by hand: 12" vs 4 crypto cards.
- PR-081 MINOR Wealth: banner "2 of 2 market prices current" next to "1 need attention: 1 price older than 15 minutes". Shot ae02b9eb…webp
- PR-082 MINOR Today: "Your financial progress" 5 active goals vs "Your destinations" "7 active goals · 3 completed" vs Goals Active 7 / Finished 3. Shot 2d675890…png
- PR-083 MAJOR Portfolio: transactions have no Edit; Remove acts instantly with no confirm/undo. Shot 86427f46…png
- PR-084 POLISH Markets: favourites cap 8 (clear message); Dogecoin as "doge" in Portfolio market watch; search results truncate symbols ("DOG", "@DO"). Shot 01f4f39c…png
- PR-085 MINOR Checklist: "All planets lit" while Evening 0/2 and Meditate/Read are open. Shot 5f4cd934…png
- PR-086 POLISH Layout: floating ZIGi button covers "Edit personal targets" (Health, 400px); tight card edges at 768px; no horizontal overflow.
- PR-087 INFO Console: 503 on /api/push and /api/private-account?action=status (sync/email not configured).
Worked: Markets search/add/remove/favourites filter/sort; Portfolio totals reconcile (BTC 0.07×$76,244.93=$5,337.14; ETH buy $8,491.49→$10,736.04); Wealth net worth reconciles 36,780+545,088.38−7,551=$574,317.38 and €8,000; APR 5.27% matches Staking/Earn; Today widget reorder/hide/add persists after reload; lb/fl oz conversion and revert; Export Habits → valid 34.7 KB JSON (schemaVersion 2); 760px and ~400px (zoom) layouts clean with bottom tab bar. Not run: Health/Goals+Wealth/Everything exports; window min width ~500px.

## Pass 7 — goal wizard edges, habit types, health edit/delete, Activity, Help, exports (Guest, 04:59–05:12, build 17069c7)
- PR-088 MINOR Today vs Health: foods without calorie data make Today headline "Unknown kcal logged / 2,200 target" while Health shows "2,010 kcal known so far". Shot 1829660f….png
- PR-089 MINOR Goal wizard: target 99999999999999999999 accepted, no max.
- PR-090 POLISH Goal wizard: name silently truncated to ~72 chars, no counter.
- PR-091 POLISH Goal wizard Review shows raw "5000 USD" vs goal page "$5,000.00".
- PR-092 POLISH Goals: target date 9999-12-31 accepted ("Dec 31, 9999").
- PR-093 MINOR Habits: LIMIT 3×/week qty 2 — form text "1 times each time, 1 time a week"; card "0 / 2 times today" for a weekly limit.
- PR-094 MINOR Habits: new habit created Nov 4 gets start date 2026-10-28 while review range limited to Nov 4.
- PR-095 POLISH Habits: stale "Habit created." status persists across actions.
- PR-096 POLISH Health: food search no-match shows "Log a food or recipe to see it here." instead of "No matches".
- PR-097 MINOR Health Weight tab: Energy estimate "27 of 14 logged days" vs Coach "14 of 14".
- PR-098 POLISH Health Sleep: after delete, status still "Night updated." (delete works).
- PR-099 POLISH Activity: user records tagged "Showcase example" (repeat of PR-066).
- PR-100 MINOR Activity: no search field, only 5 filter pills.
- PR-101 INFO Exports in Guest profile land as hidden Chrome temp files in Downloads (likely box quirk); content valid.
Worked: wizard validation messages (empty name, 0, negative/text/1e3, past date, over-allocation); emoji/CJK names; 2 Value goals funded (Dream 🏠 $1,200/5,000 24%; Holiday ✈️ 日本 €800/3,000 27%); Wealth "Allocated to Goals" $72,924.49 + €800 matches Today (9 active); 3 habits (duration weekdays, QUIT every 2 days, LIMIT 3×/week) counted on Today 4/7→5/10; backfill + streak/stats correct; food search/log/edit (810→730 kcal)/delete with Undo; water/weight/sleep edit+delete propagate to Today; Activity All 539 = Goal 27 + Wealth 69 + Habit 207 + Health 236; Help 32 anchors and internal routes load; Health export schemaVersion 4 with 124 entries, Goals+Wealth export 13 positions/8 goals/9 allocations — both valid JSON.

## Pass 8 — Notes, Tasks, Review, Agenda, Ecosystem, Earn, Chess, '/' search (Guest, 05:14–05:25, build 17069c7)
- PR-102 MAJOR Search: '/' never finds tasks (new or seeded, e.g. "Compare two savings accounts", "Book the dentist"); notes/goals/habits found. Confirms Lisbon LS-H47. Shot 45aa834b….png
- PR-103 MAJOR Today: tasks (incl. seeded "Book the dentist" due today 10:30) never appear on Today or /app/timeline; only on Agenda and Tasks.
- PR-104 MINOR Tasks: due date before today rejected ("Value must be 11/04/2026 or later.") on create and edit; can't create overdue tasks. Shot 234d021f….png
- PR-105 MINOR Notes: search "zzzz" shows "0 results · No note has those words." but full list remains below. Shot e2783e71….png
- PR-106 POLISH Notes: "deleted · Undo" toast persists after switching tabs.
- PR-107 POLISH Notes: edited inbox note title shown twice.
- PR-108 MINOR Chess: future timestamps at 05:2x — ratings "as of 7:00 AM", "updated 9:00 AM", games 8:00/9:00 AM (Showcase seed). Shots c81b6c41….png, e918d37e….png
- PR-109 MINOR Chess: Daily puzzle / Lichess puzzle / Lichess TV open blank white frame ("Empty? Open it on chess.com/Lichess"); Play buttons show modal, no new tab. Shot 1bfe6ece….png
- PR-110 INFO Chess: "A habit chess ticks off" dropdown disabled in Showcase.
- PR-111 MINOR(env?) Browser: tab crash "Aw, Snap! Error 9" during fast '/' typing on Today, recurred on reload; not reproducible alone, likely memory pressure. Shot 4a64c00f….webp
- PR-112 POLISH Search: "Valdora" returns only Earn, not Ecosystem entry.
Worked: Notes create/edit/delete+Undo/search; Tasks sections Today/Next 7/Later/Someday, edit, complete, remove (counts right); Agenda places tasks, habits, planned contributions, meals, workouts on correct days, Week/Month views; Review week/month, totals 3+1+2+1=7 (no tasks section); Ecosystem 18/18, category sums, search, Today shortcut; value-locked matches Earn (Valdora $74.7M, OroSwap $3.3M, Nawa $3.5M, PermaPod $1.4M); Earn APR math 5.01%@5% = 5.27% gross, calculator $79,024.82; Chess W/D/L per filter correct, rating series 1453–1510 ends 1503, goal gap 97 to 1600.
