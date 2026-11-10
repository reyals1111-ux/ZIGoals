# Grok #53 replay — lane L3 (Habits, Today, widgets, Journey/XP, onboarding / first run), round 2

- **Commit served:** `37d2370c` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, from `/home/user/zig-branch2`) on http://127.0.0.1:3103. The server stopped once during the run (8 Nov) and was restarted with `next start`, without a rebuild; same commit.
- **Date:** 6–8 Nov 2026.
- **Replayed by:** a fresh replay agent. It made no fixes, changed no app or test code and made no git writes.
- **Scope** (owner rules of 8 Nov, relayed by the integrator):
  - Every id round 1 (`GROK53_REPLAY_L3_1.md`, `c521574f`) marked STILL OPEN (27), CHANGED (24) or NOT REPLAYED (53): **104 ids**, each replayed the way the bot did.
  - The lane's claims came from `lanes/L3.md` "Fourth pass" and the sweep-3 notes in it.
  - **Regression checks on FIXED/HOLDS ids:** 68 rows below. They were run before the 8 Nov rule change. They are kept because every file behind them changed between `c521574f` and `37d2370c` (habits, dashboard, onboarding, game, checklist and lib/habit-actions all changed), and the results were already in hand. No further regression checks were run.
- **Method** (same as round 1):
  - Playwright 1.63 from zig-branch2, headless Google Chrome (channel `chrome`), one browser and one worker.
  - Every run went through `flock /tmp/claude-0/zig-browser.lock`.
  - `locale: en-GB`, `timezoneId: Europe/Brussels`, live API (no routing).
  - The bots' clock was set with `page.clock.install` / `setFixedTime`: 4 Nov 2026, 01:10–05:05 Brussels (before 07:00), as each bot had it.
    - LS-036 and LS-070 used Mon 2 Nov, and Lisbon's 29 Oct–2 Nov run used `setFixedTime` per day.
    - The freeze flow (C-NB-17) used 19–29 Oct.
    - The real clock was never used.
  - Scripts and logs are in `/tmp/claude-0/replay-L3-2/` and are not committed.
- **Conditions** (codes as round 1):
  - **D** = 1280×800 Nebula, fresh empty context, welcome marked seen. **DL** = the same in Light.
  - **W** = first visit (welcome not seen).
  - **G** = game layer on; **GB** = game layer + badges on.
  - **340L** = 340×740 Light; **375D** = 375×812 Dark (isMobile); **375** = 375×812 Nebula.
  - **Sc** = Settings → Load Showcase Demo, 1440×900.
  - Some seeded states were written into the device store: goals (`zigoals:platform:v1`) and game prefs (`zigoals:game:v1`). They match what the bot had already done by hand: "5 active goals", "a project with 7 of 8 milestones".
- **Caveats:**
  - **ZIGi/NOVA rows belong to L7** and were not replayed here: NB-114, LA-019, LZ-027 and C-DVG-23, plus ZIGi greeting by name for NB-006. Three L7 fix lanes were editing `/home/user/ZIGoals` (ZIGi/NOVA files) during this run; that does not touch the `:3103` build.
  - The lane specs (`tests/grok53/...al-fourth-*`) were **not** run (owner cost rules); verdicts come from the replays only.
  - Lisbon's own Checklist item "QA Read" was replayed as a starred habit "QA Read" plus a second starred habit "Water glass", ticked on the Checklist each day.
  - Owner decisions were accepted only where AL_SCOPE F or an ADR-037 O-row says so; none applied this round.
    - The habit form's More options fold (N-NB-21, DV-132, DV-243) is the owner's own verbatim FR-17 decision (ADR-036:957). That is outside F/O, so these rows stay open and need an owner ruling.
    - "Later" for C-DVG-19/20 is not an F/O decision.
- **Incidental:**
  - At 375 a Checklist celebration frame ("All 1 planet lit!") lay over the top bar's View switch: a normal click on "List" timed out.
  - On a fresh Settings load, the first click on the Wealth page switch did nothing; the next clicks worked (NB-096).
  - Neither is in an L3 row.

## Totals (counted per finding id)

| verdict | in scope (round 1 STILL OPEN / CHANGED / NOT REPLAYED) | regression checks (round 1 FIXED / HOLDS) |
|---|---|---|
| FIXED | 47 | 67 |
| HOLDS | 30 | 1 |
| STILL OPEN | 7 | 0 |
| CHANGED | 6 | 0 |
| OWNER DECISION | 0 | 0 |
| NOT REPLAYED | 14 | 0 |
| **total ids** | **104** | **68** |

Round 2 in-scope ids: 104 (round 1: 27 STILL OPEN + 24 CHANGED + 53 NOT REPLAYED). Regression ids are counted separately.

## Findings (in scope: round 1 STILL OPEN, CHANGED, NOT REPLAYED)

#### AL-COPY-025

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-006 | AL-COPY-025 | STILL OPEN | FIXED | W D 05:05 | Step 7 has "What should ZIGi call you? (optional)" ("Kept on this device only…"). Typed "  Sam  " → receipt "ZIGi calls you “Sam” (on this device only)." → Finish → Today heading "You’re set, Sam."; `zigoals:profile-name:v1` = {version 1, name "Sam"}. ZIGi greeting by name is L7's part (not replayed here). |
| NB-234 | AL-COPY-025 | CHANGED | FIXED | W D 1280×800 05:05 | Steps 5 and 6 read "STEP 5 OF 8 · nothing to choose here" / "STEP 6 OF 8 · nothing to choose here"; Finish setup at y 731–777 in the 800 px window, scrollY 0 (in view). |
| N-NB-01 | AL-COPY-025 | STILL OPEN | CHANGED | W D | Step skips now read "Skip this step" (steps 2, 3), "Skip the tour", "Skip setup". Still other wordings: the tour's own "End the tour" (next to Next/Done) and "Not now" on Today's welcome card. |
| N-NB-02 | AL-COPY-025 | STILL OPEN | FIXED | W D | With Habits: "You’ll see: Today, Habits, Activity, Settings." plus "The Checklist and the small apps (NOVA, Tasks, Notes, Journal, Agenda) show too while they are switched on…". Nav after Finish: Today, Habits, Activity, Checklist, Settings, Help (matches). |

#### AL-PERSISTENCE-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-011 | AL-PERSISTENCE-003 | CHANGED | FIXED | W D 01:28; en-GB Brussels, en-GB via Today card, en-US Brussels, en-GB UTC | Let’s begin → Habits → Continue → Read more → F5: all four runs come back on "Two or three things to focus on." with Read more ticked; a second F5 the same; Back shows Habits still ticked. |
| C-NB-08 | AL-PERSISTENCE-003 | CHANGED | FIXED | as NB-011 | Same runs: the draft resumes after reload in en-GB and en-US. |
| NB-241 | AL-PERSISTENCE-003 | CHANGED | FIXED | W D 05:05 | Habits-only setup hid Health/Goals/Wealth (nav Today, Habits, Activity, Checklist, Settings, Help). /app/welcome banner "Your last setup is still fresh. 1 habit can be taken back for a day." → Undo setup → toast "Setup undone: 1 habit removed, and the pages it switched are back as they were."; nav back to Today, Goals, Habits, Health, Wealth, Activity, Checklist; Habits empty. |

#### AL-LAYOUT-DESKTOP-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-019 | AL-LAYOUT-DESKTOP-007 | CHANGED | FIXED | W D 1280×800 | Tour Next/Done at y 461/461/459/459; Back from card 2 on; on card 3 "Quick add" the real "+ Quick add" (x 242, y 68) carries `data-tour-spot` with a 3 px outline ring; the ring is gone on card 4. |

#### AL-FIRST-RUN-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-033 | AL-FIRST-RUN-002 | CHANGED | FIXED | W D 04:22 | Not now → reload: "YOUR FIRST MINUTE · Set up ZIGoals in about a minute". The only `.primary` on the page is "Start setup"; "+ Quick add" is `secondary` (transparent); no "Make Today yours"/"Keep Balanced"; "See how it works" stays as a secondary link. |

#### AL-XP-BADGES-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-052 | AL-XP-BADGES-007 | CHANGED | STILL OPEN | W 340L, setup Habits + Health + Chess, G | Journey draws Habits, Health, Goals, Wealth ("Your four planets"); no Chess planet, and no line on the page now names Chess (round 1's "other pages, such as Chess…" sentence was not found in this state). Goals planet says "Goals is not on your pages. Its planet stays, quietly…". Lane: "Open, needs a design choice" (not an F/O decision). |

#### AL-DATES-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-071 | AL-DATES-004 | CHANGED | FIXED | DL | Stretch → Details → History & reflection: cells 61×61 px, calendar 430 px tall (round 1: 119 px cells, 781 px); hint "Days before 4 Nov 2026 are greyed: this habit started then." |

#### AL-DISCOVERABILITY-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-072 | AL-DISCOVERABILITY-001 | STILL OPEN | FIXED | DL 02:10 | + New habit → Start from an idea: page scrolls (scrollY 1832), "Habit ideas" heading at y 122 in the 800 px window and focused; Close returns focus to "Start from an idea". |
| NB-074 | AL-DISCOVERABILITY-001 | STILL OPEN | FIXED | DL 02:10 | As NB-072: the panel comes into view and takes the focus. |
| N-NB-21 | AL-DISCOVERABILITY-001 | STILL OPEN | STILL OPEN | DL | Before More options only Template, Title, Time of day, Schedule, Category, Reminder time, Done automatically when show; Habit type, Measurement, Unit, Target value/period are inside "More options". Lane: "Waits on owner" — the fold is the owner's own verbatim FR-17 decision (ADR-036:957), which is not an AL_SCOPE F / ADR-037 O-row; needs an owner ruling. |

#### AL-STREAKS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-076 | AL-STREAKS-003 | CHANGED | FIXED | DL 02:10 | Gym3, 3× per week: "0 / 3 this week · Not done today" → Complete → "1 / 3 this week · Done today", button "✓ Done" (aria "Undo completion for Gym3", pressed); no "time today", no "Partial". |
| NB-158 | AL-STREAKS-003 | CHANGED | FIXED | DL | As NB-076. |
| H-008 | AL-STREAKS-003 | CHANGED | FIXED | DL | As NB-076. |
| PR-061 | AL-STREAKS-003 | STILL OPEN | FIXED | DL | As NB-076: after Complete it reads "Done today" and the button is ✓ Done, not an active Complete. |
| PR-093 | AL-STREAKS-003 | STILL OPEN | STILL OPEN | DL | LIMIT, 3× per week, target 2: subtitle "3× per week · Limit 2 times per week" but the count reads "0 of at most 2 times today" and "0 of 3 days within the limit this week". After 3 taps: "3 of at most 2 times today … Partial … Within limit" (over the limit, yet Partial and Within limit). Form sentence: "Each check-in counts 2 times; you aim for 3 check-ins a week." Weekly vs per-day still disagree. |
| PR-010 | AL-STREAKS-003 | STILL OPEN | FIXED | Sc 1440×900 01:26 | Exercise ("15 / 30 minutes per day · Partial"): under Current streak "Up to yesterday; today is still open and counts once it is done." |

#### AL-NUMBERS-SOURCE-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-082 | AL-NUMBERS-SOURCE-007 | CHANGED | FIXED | D 02:10 | Health 2,000 mL → Drink water template: "2 / 2 liters per day · from your water journal · 2,000 mL". +250 mL on Health → habit "2.25 / 2 liters per day", note "2,250 mL"; Today status "2,250 mL water", tile "WATER 2,250 mL · 2 entries today", habit row "2.25 / 2 liters". |
| NB-142 | AL-NUMBERS-SOURCE-007 | CHANGED | FIXED | D | As NB-082: one number (2,250 mL / 2.25 L) on Today, the habit card and its note. |
| NB-200 | AL-NUMBERS-SOURCE-007 | CHANGED | FIXED | D | As NB-082: the note now follows the journal (2,250 mL). |
| NB-201 | AL-NUMBERS-SOURCE-007 | CHANGED | FIXED | D | Set up rules opens "Workout and contribution rules": "For water, steps, sleep or active minutes, edit the habit and choose “Done automatically when”." The When select offers only "A workout", "A contribution to a goal". |
| N-056 | AL-NUMBERS-SOURCE-007 | STILL OPEN | FIXED | Sc 01:26, D | Showcase Walk "8,800 / 8,000 steps per day", note "from your activity log · 8,800 steps", Health "8,800 steps logged". Own water habit as NB-082. |
| N-086 | AL-NUMBERS-SOURCE-007 | STILL OPEN | FIXED | Sc | As N-056. |
| B-163 | AL-NUMBERS-SOURCE-007 | STILL OPEN | FIXED | Sc | As N-056 (card and note both 8,800). |
| D-220 | AL-NUMBERS-SOURCE-007 | STILL OPEN | FIXED | Sc | As N-056. |

#### AL-A11Y-012

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-092 | AL-A11Y-012 | STILL OPEN | FIXED | D, one habit, G | Customize Today: the placeholder reads "Daily Habits is hidden from Today. Your Daily Habits widget shows the same list, so this card stands down; Show card brings it back as well."; its controls are "Arrange Daily Habits (hidden)" vs "Arrange Daily Habits". |
| NB-220 | AL-A11Y-012 | STILL OPEN | FIXED | D | 14 arrange groups, all names unique ("Meals today", "Your snapshot", "Tracked Wealth · USD"…); no "Health metric"/"Widget summary"; no "Watchlist is hidden with its page"; move status "Moved Daily Habits (hidden) to position 3 of 10." |

#### AL-UNITS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-114 | AL-UNITS-003 | NOT REPLAYED | NOT REPLAYED (L7: ZIGi/NOVA number words) | — | The habit card/Activity part is NB-063 (Activity "49 s of 10 minutes"); the ZIGi/NOVA answer part belongs to L7. |

#### AL-CONFIRM-DELETE-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-133 | AL-CONFIRM-DELETE-004 | CHANGED | FIXED | DL | ⋯ menu: Add check-in/streak to Today, Pause from 5 Nov, Archive habit…, Delete habit…, Duplicate habit, Ask ZIGi, Open its own page. Duplicate → "Read (copy)" Due, toast "“Read (copy)” added: the same rule, no history yet. Undo"; Undo removes it, Read stays Complete. |

#### AL-COPY-030

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-140 | AL-COPY-030 | NOT REPLAYED | FIXED | D G | Add widget → Water today → Save (added); again Water today → Save: "That metric is already on Today." Switch chip to Steps today: message gone; Save adds it and closes. |

#### AL-FIRST-RUN-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-176 | AL-FIRST-RUN-007 | NOT REPLAYED | FIXED | D, 5 active goals, Your Goals card hidden (⋯ → Hide card) | "Your destinations · 5 active goals" with chips Emergency fund, QtyG, ValG and "+2 more" (link to Goals). |

#### AL-FIELD-ERROR-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-177 | AL-FIELD-ERROR-009 | CHANGED | FIXED | DL | "after dup" beside "After Dup": "You already have a habit called “after dup”…". 200-char paste → 100 kept and "Your title had 200 characters; a habit title holds 100, so it was cut after the 100th." |

#### AL-COUNTS-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-089 | AL-COUNTS-005 | NOT REPLAYED | FIXED | D, 6 habits, 1 done; Light, Dark, Nebula | Today's 30-day cell "4 Nov 2026: 1 check-in, 1 completed" is level `some` in all three themes (Light rgb 199,212,239; Dark and Nebula rgb 55,85,115). |

#### keep

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-036 | keep | NOT REPLAYED | HOLDS | W 340L, Habits+Health+Chess, Drink more water + Read more + Deep work | Step 4 pre-ticks Deep work ("From your focus · daily"), Read 30 minutes, Drink water 2 liters and "2 L of water a day"; chess starters offered. |
| NB-046 | keep | NOT REPLAYED | HOLDS | 340L | Bottom bar More → sheet ends with "Theme · Light · Nebula · Dark" and "Light is ZIGoals by day…". |
| NB-059 | keep | NOT REPLAYED | HOLDS | DL | Reminder 21:30 set in Edit → card meta "Every day · reminder 21:30 on this device". |
| NB-066 | keep | NOT REPLAYED | HOLDS | D G | 1 tick: Habits "1 / 30 days you checked in · 1 recorded check-ins", Journey "1 habit check-in in all". |
| NB-069 | keep | NOT REPLAYED | HOLDS | DL | Add a note or mood: Energized/Good/Calm/Neutral/Difficult, Note for today, Save note/Cancel; saved note "note 🌿 test", mood calm. |
| NB-083 | keep | NOT REPLAYED | HOLDS | D | Widget ⋯ → Edit widget: categories (Goals 2, Habits 4, Health 5…), chips, "PREVIEW · YOUR CURRENT RECORDS". |
| NB-091 | keep | NOT REPLAYED | HOLDS | D G | Added Level & XP ("Added to Today · tap to remove"), order identical after reload. |
| NB-095 | keep | NOT REPLAYED | HOLDS | D | Start page = Habits (kept after reload); sidebar Today renders /app. |
| NB-096 | keep | NOT REPLAYED | HOLDS | D | Wealth switch off/on in Settings → sidebar entry goes/returns at once. (The first click after load did nothing; the next ones worked.) |
| NB-101 | keep | NOT REPLAYED | HOLDS | D G | Freezes: "every seven days in a row on a habit earns one… you keep at most five." |
| NB-126 | keep | NOT REPLAYED | HOLDS | DL | Target 1,000,000,000: step "+10,000", "10,000 / 1,000,000,000" → Complete → full, toast with Undo. |
| NB-128 | keep | NOT REPLAYED | HOLDS | DL | Edit (from 2026-11-04) → rename to Gym → "Habit saved." |
| NB-136 | keep | NOT REPLAYED | HOLDS | D G | After a tick 10 XP; skip + pause another habit: 10; archive Gym: 10. |
| NB-163 | keep | NOT REPLAYED | HOLDS | D G | Add 250 mL ×2: 500 mL kept after reload; XP 0 → 4; quest "Log water three times 2 of 3". |
| NB-164 | keep | NOT REPLAYED | HOLDS | D 04:15 | Default wake 04:15 (now); wake 03:30 → "4 h 30 min (estimated)"; Today "SLEEP 4 h 30 min asleep last night". |
| NB-165 | keep | NOT REPLAYED | NOT REPLAYED (Goals wizard, L4 page; not exercised) | — | Not exercised in this replay. |
| NB-173 | keep | NOT REPLAYED | NOT REPLAYED (Goals page XP for a finished project not isolated) | — | DV-118 run finished a project goal (badge "A goal finished"), but the +50 was not isolated. |
| NB-190 | keep | NOT REPLAYED | NOT REPLAYED (Goals contribution flow, L4; not exercised) | — | Not exercised. |
| NB-192 | keep | NOT REPLAYED | HOLDS | DL | As NB-069: note + Calm saved on the day's entry. |
| NB-194 | keep | NOT REPLAYED | HOLDS | DL | Target 0/−4/abc/99999999999 → "Target value: Enter a whole number from 1 to 1,000,000,000."; every 0/400 → "Repeat every (days): Enter a whole number from 2 to 365."; 3 → "Habit created." |
| NB-195 | keep | NOT REPLAYED | HOLDS | D | / → "Gym": 3 results (habit, template, action) + "Ask ZIGi: “Gym”… nothing is sent"; "🚀" → "0 results Nothing on this device matches “🚀”." |
| NB-198 | keep | NOT REPLAYED | NOT REPLAYED (sub-goal nesting, L4; not exercised) | — | Not exercised. |
| NB-208 | keep | NOT REPLAYED | HOLDS | DL | Year view: "2026: 0 of 1 days with every scheduled habit complete.", legend, "Days before a habit started and days ahead stay blank." |
| NB-209 | keep | NOT REPLAYED | HOLDS | D | Choose preset: "Choose your Today layout" with "2 existing widgets will be kept but hidden…". |
| NB-211 | keep | NOT REPLAYED | HOLDS | DL | End date 2020-01-01 → "An end date cannot be before this habit begins." |
| NB-230 | keep | NOT REPLAYED | HOLDS | D G | CntT target 2: + → 13 (+3), + → 20 (+7), + (3/2) → 20; − → 20, − → 13, − → 10: exact reversal. |
| NB-231 | keep | NOT REPLAYED | HOLDS | D G | Tea 5 points claimed → after reload "enjoyed once", "Points to spend: 5 · 10 XP earned, 5 claimed"; Remove asks "Take Tea off the shelf? What you already enjoyed stays counted."; after removal + reload "No treats yet.", points line unchanged. |
| NB-232 | keep | NOT REPLAYED | HOLDS | D G | Preset dialog as NB-209; Level widget "4 of 200 XP to level 2" = Journey. |
| NB-242 | keep | NOT REPLAYED | HOLDS | Sc | Showcase chip → "…kept in this tab only… your own records are never touched", Load again / Exit Showcase; Exit → /app, own habits 0, chip gone. |
| N-096 | keep | NOT REPLAYED | HOLDS | DL | As NB-059. |
| BUG-044 | keep | NOT REPLAYED | HOLDS | D G | As NB-066 (1 = 1). |
| N-091 | keep | NOT REPLAYED | HOLDS | D G | As NB-066. |
| N-162 | keep | NOT REPLAYED | NOT REPLAYED (backfill entry not made) | D | History shows "Log days before 4 Nov 2026…"; a backfilled Partial day was not entered. |
| N-178 | keep | NOT REPLAYED | HOLDS | D | As NB-095. |
| N-107 | keep | NOT REPLAYED | HOLDS | W 340L | As NB-036 (targets follow picks). |
| N-170 | keep | NOT REPLAYED | NOT REPLAYED (own goal event tagging, L4; not exercised) | — | Not exercised. |

#### —

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-071 | — | NOT REPLAYED | NOT REPLAYED (old id with no text) | — | Its related rows NB-076, PR-061, PR-093 are above. |
| N-171 | — | STILL OPEN | FIXED | Sc 1440×900 01:26 | Emergency fund → Add weekly Goal review habit → Habits, Goal linked: card face shows "Supports Emergency fund ↗" with Details closed. |

#### AL-COMPETITOR-GAP-100

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-02 | AL-COMPETITOR-GAP-100 | NOT REPLAYED | NOT REPLAYED (only step 1 of the goal wizard read) | D | /app/goals/new step 1 has no "why" or if-then plan field (labels: Life area…); later steps not walked; lane says the why and plan exist. |

#### AL-COMPETITOR-GAP-104

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-10 | AL-COMPETITOR-GAP-104 | NOT REPLAYED | FIXED | W D, synthetic `beforeinstallprompt` | Install step buttons before: Continue/Back/Skip setup/Explore the demo; after dispatching the event: "Install ZIGoals" added. |

#### AL-COMPETITOR-GAP-106

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-17 | AL-COMPETITOR-GAP-106 | NOT REPLAYED | FIXED | D G, clock 19 Oct → 29 Oct | Stretch ticked 20–27 Oct, 28 Oct missed: Journey "You have 1 freeze… Stretch · Wed 28 Oct · Use a freeze" → "Use a freeze on Stretch, Wed 28 Oct? That missed day becomes a rest day and the streak holds. You will have 0 left." → "Freeze used: 28 Oct now counts as a rest day." |

#### AL-COMPETITOR-GAP-109

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-31 | AL-COMPETITOR-GAP-109 | NOT REPLAYED | NOT REPLAYED (L5 Agenda; file content not checked) | D | Agenda has "Choose what to export" and "Choose a calendar file"; whether habits are in the export was not checked. |

#### AL-UNDO-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LA-019 | AL-UNDO-002 | NOT REPLAYED | NOT REPLAYED (L7: ZIGi composer Save) | — | ZIGi/NOVA answer path belongs to L7. |
| LZ-027 | AL-UNDO-002 | NOT REPLAYED | NOT REPLAYED (L7) | — | As LA-019. |

#### AL-XP-BADGES-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-023c | AL-XP-BADGES-001 | NOT REPLAYED | FIXED | D GB | Count goal "Read 20 books" → Record history only 3 books: XP stays "0 XP all told", Wealth "0 contributions to your goals", no celebration. |
| DV-045d | AL-XP-BADGES-001 | NOT REPLAYED | FIXED | D GB | As DV-023c. |

#### AL-XP-BADGES-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-045 | AL-XP-BADGES-002 | NOT REPLAYED | NOT REPLAYED (Hall of achievements, L4) | — | Not exercised. |
| M-140 | AL-XP-BADGES-002 | STILL OPEN | FIXED | D GB, project 7/8 → 8th tick → Activity | Level-up shows on arrival as a non-modal card (aria-modal false, no backdrop, 340×275 at the corner), focus not taken, the page heading takes a click; Activity opens at the top (scrollY 0). |
| G-031 | AL-XP-BADGES-002 | STILL OPEN | FIXED | 375 GB, then /app/journey | Journey on open: the same non-modal card (16,453, 343×275) at the bottom, no backdrop, focus not taken. It covers about a third of the 812 px screen until "Lovely". |
| T-039 | AL-XP-BADGES-002 | CHANGED | FIXED | D GB | No celebration on the goal page while ticking; the arrival card is non-modal (as M-140), so no interstitial blocks a logging flow. |

#### AL-A11Y-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-155 | AL-A11Y-010 | STILL OPEN | FIXED | D | As NB-220: arrow names unique and from headings. |

#### AL-COPY-026

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-187 | AL-COPY-026 | CHANGED | FIXED | DL | Delete for good: "…Goals and Health stop using it. Backups you made earlier, your notes and ZIGi’s past chats still hold what they had. Type “Stretch” (capital letters don’t matter)"; no "placeholder" / "settings stay". |

#### AL-COPY-028

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-044 | AL-COPY-028 | STILL OPEN | CHANGED | DL | Daily habit ticked today → Edit → Weekdays only → Save: the rule is stored from 2026-11-04 (today) and the card shows Mon–Fri at once, but the "Changes effective from" field showed 2026-11-05 before and after the change. A target change still starts tomorrow ("Scheduled change from 5 Nov 2026… Today keeps its current rule"), as the hint says. |
| D-107 | AL-COPY-028 | NOT REPLAYED | FIXED | DL | No area chosen: chip "◈ Choose an area" (aria "Area for Stretch: none"). |
| DV-132 | AL-COPY-028 | CHANGED | CHANGED | DL | Quit explains "A quit habit has no target: you aim for none, and each event you record is a slip…"; type/measure/target still under More options (owner FR-17, ADR-036:957, not F/O). |
| DV-188b | AL-COPY-028 | NOT REPLAYED | FIXED | D 1280 | Edit Drink water: "the day reaches at least [2000] mL" is one left-aligned row (47 px tall), "anything is recorded" its own row (44 px). |
| DV-242 | AL-COPY-028 | CHANGED | FIXED | DL | Quit: Measurement, Target value and Target period gone; Unit stays, "counted in the unit above". |
| DV-243 | AL-COPY-028 | CHANGED | CHANGED | DL, 388 | More options starts with Habit type, but Habit type still comes after Reminder time (bot's fix) and is folded (owner FR-17); at 388 the summary is 354×50 px. |

#### AL-FIRST-RUN-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-024b | AL-FIRST-RUN-003 | STILL OPEN | FIXED | D | Arrange mode: placeholder explains why it stands down (NB-092); one exit, "Finish customizing". |

#### AL-FIRST-RUN-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-184 | AL-FIRST-RUN-004 | STILL OPEN | FIXED | W D | How it works: "On Goals, tap “+ Create a goal”…", "On Habits, tap “+ New habit”, then use − and + or Complete…", "On Wealth, tap “+ Add asset”…"; "Watch the 16-second film". Arrows only on the link labels ("Open Habits →"). |

#### AL-STREAKS-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-033 | AL-STREAKS-005 | CHANGED | CHANGED | 375D, path QA Read + Water glass, Mon 2 Nov | List view: the visible count is "1 of 2" once; "1 of 2 complete" is now visually hidden; "1 day streak" singular. Still no rule next to the flame (no "every planet" text on the page). |
| LS-070 | AL-STREAKS-005 | STILL OPEN | STILL OPEN | 375D, page.clock 29 Oct–2 Nov | QA Read ticked on the Checklist each day, Water glass never: flame "0-day streak" every day; List row "QA Read 1 time · Habit · 09:00" with no per-item streak; no rule shown. |
| C-LS-34 | AL-STREAKS-005 | STILL OPEN | STILL OPEN | 375D | As LS-070. |

#### AL-XP-BADGES-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-045e | AL-XP-BADGES-003 | CHANGED | CHANGED | Sc 1440×900 GB | Journey now has "On this page" (My universe, Level, Quests, Badges, Path, Freezes, Rewards) and no mid-page card; the page is still 7,872 px tall (round 1: 8,162). |
| DV-118 | AL-XP-BADGES-003 | STILL OPEN | FIXED | D GB | As M-140; the line reads "Your goal steps brought you here." (XP from the goal). |

#### AL-COMPETITOR-GAP-087

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-19 | AL-COMPETITOR-GAP-087 | STILL OPEN | STILL OPEN | — | Nothing built. Lane now gives "Later (competitor)" with a reason (past days reachable via month grid and History); "Later" is not an AL_SCOPE F / O decision. |

#### AL-COMPETITOR-GAP-088

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-20 | AL-COMPETITOR-GAP-088 | STILL OPEN | STILL OPEN | — | Nothing built; lane "Later (competitor)" with a reason (changes the protected Checklist day rule); not an F/O decision. |

#### AL-COMPETITOR-GAP-089

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-23 | AL-COMPETITOR-GAP-089 | NOT REPLAYED | NOT REPLAYED (L7: NOVA "Your day") | — | NOVA brief belongs to L7. |
## Regression checks (round 1 FIXED / HOLDS; files changed since round 1, results in hand)

#### AL-A11Y-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-154 | AL-A11Y-010 | FIXED | FIXED | D | Widget ⋯ → Edit widget opens the editor with categories and preview. |

#### AL-A11Y-011

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-221 | AL-A11Y-011 | FIXED | FIXED | DL | "Completion count" labelled, inputmode numeric, default 30; 0 → "Completion count: Enter a whole number from 1 to 100,000." |

#### AL-A11Y-013

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-13 | AL-A11Y-013 | FIXED | FIXED | DL | Water card − 44×46 and "+0.25 L" 92×46, 1 px border. |

#### AL-COMPETITOR-GAP-085

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-046 | AL-COMPETITOR-GAP-085 | FIXED | FIXED | Sc | Read ⋯ → "Open its own page" → /app/habits?habit=<id>. |

#### AL-COMPETITOR-GAP-086

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-26 | AL-COMPETITOR-GAP-086 | FIXED | FIXED | DL | Note "Calm morning walk" → reflections search "calm" → "1 of 1 reflection match. 4 Nov 2026 · Journal". |

#### AL-COMPETITOR-GAP-090

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-24 | AL-COMPETITOR-GAP-090 | FIXED | FIXED | D | Quick add offers "Type a line" and "Speak a line". |

#### AL-COMPETITOR-GAP-091

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-25 | AL-COMPETITOR-GAP-091 | FIXED | FIXED | D | Customize Today: add, move, hide, preset (NB-140, NB-220 runs). |

#### AL-COMPETITOR-GAP-092

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-26 | AL-COMPETITOR-GAP-092 | FIXED | FIXED | D | Today habit row "Drink water 1 day streak"; 30-day grid (N-089). |

#### AL-COMPETITOR-GAP-093

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-21 | AL-COMPETITOR-GAP-093 | FIXED | FIXED | DL | Duration habit: "+" stepper and "Duration timer · Start timer" in Details. |

#### AL-COMPETITOR-GAP-094

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-30 | AL-COMPETITOR-GAP-094 | FIXED | FIXED | DL | Quit and limit habits created (DV-242, PR-093 runs). |

#### AL-COMPETITOR-GAP-096

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-29 | AL-COMPETITOR-GAP-096 | FIXED | FIXED | D | Habit ideas: 7 × "As a 30-day challenge". |

#### AL-COMPETITOR-GAP-098

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-15 | AL-COMPETITOR-GAP-098 | FIXED | FIXED | DL | Empty Habits: "Bring your habits and their history →" → /app/settings#switch-import. |

#### AL-COMPETITOR-GAP-102

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-04 | AL-COMPETITOR-GAP-102 | FIXED | FIXED | D, game off | First (automatic) tick: Today shows "Your first step is logged". |

#### AL-COMPETITOR-GAP-103

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-05 | AL-COMPETITOR-GAP-103 | FIXED | FIXED | W D | ZIGi step aside "A game layer, if you like one · Lv 1 Spark 0 of 200 XP"; `zigoals:game:v1` stays null. |

#### AL-COMPETITOR-GAP-107

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-19 | AL-COMPETITOR-GAP-107 | FIXED | FIXED | DL | "TODAY’S RHYTHM 0 / 4 scheduled habits complete". |

#### AL-CONFIRM-DELETE-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-062 | AL-CONFIRM-DELETE-004 | FIXED | FIXED | DL | ⋯: Pause from 5 Nov, Archive habit…, Delete habit… (NB-133 run). |

#### AL-COPY-025

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-022 | AL-COPY-025 | FIXED | FIXED | W D | ZIGi step: "NOVA is my full-page view. NOVA in the sidebar shows your whole day on one screen…". |

#### AL-COPY-026

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-186a | AL-COPY-026 | FIXED | FIXED | DL | "Archive Skip me? It leaves your lists from 5 Nov 2026. Its history is kept; you can restore it later, or delete it for good from Archived." |

#### AL-COPY-027

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-129 | AL-COPY-027 | FIXED | FIXED | DL | Yes/no habit shows only "Complete". |

#### AL-COPY-029

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-057c | AL-COPY-029 | FIXED | FIXED | D, 2 goals | "Your first asset starts here" once on Today. |

#### AL-COPY-030

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-162 | AL-COPY-030 | FIXED | FIXED | D G | Journey widgets: "a tap adds or removes one at once, no Save needed". |

#### AL-COPY-031

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-047 | AL-COPY-031 | FIXED | FIXED | DL | "+0.25 L" (aria "Add 0.25 to Drink water"). |

#### AL-COUNTS-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-106 | AL-COUNTS-004 | FIXED | FIXED | Sc | Today "4 of 7 habits" twice, Habits "4 / 7 scheduled habits complete", Checklist "2 of 5 planets today" (its own path). |

#### AL-COUNTS-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-073 | AL-COUNTS-005 | FIXED | FIXED | DL | 1 of 6 done → level `some`, pale rgb 199,212,239. |

#### AL-COUNTS-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-067 | AL-COUNTS-006 | FIXED | FIXED | DL | "Vacation marked for 5 habits, 7 days. 30 habit days were set aside…" |

#### AL-DATES-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-249 | AL-DATES-004 | FIXED | FIXED | DL | Hint "Days before 4 Nov 2026 are greyed…" (NB-071 run). |

#### AL-DATES-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-094 | AL-DATES-005 | FIXED | FIXED | DL | New habits start 2026-11-04. |

#### AL-DISCOVERABILITY-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-147 | AL-DISCOVERABILITY-001 | FIXED | FIXED | DL | Second + New habit: focus on Habit title. |

#### AL-FIELD-ERROR-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-161 | AL-FIELD-ERROR-007 | FIXED | FIXED | D G, shelf on | −5 and 0 → "Enter a price of 1 point or more.", focus on the price; Goals has "Your rewards shelf →". |

#### AL-FIELD-ERROR-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-016 | AL-FIELD-ERROR-008 | FIXED | FIXED | W D | No money focus: nothing preselected, Continue passes with no error. |

#### AL-FIELD-ERROR-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-053 | AL-FIELD-ERROR-009 | FIXED | FIXED | DL | "   " → "Habit title: Give the habit a name.", focus on the field, aria-invalid. |

#### AL-FIRST-RUN-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-002 | AL-FIRST-RUN-002 | FIXED | FIXED | W D | Not now → reload: "YOUR FIRST MINUTE · Set up ZIGoals in about a minute". |

#### AL-FIRST-RUN-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-024a | AL-FIRST-RUN-003 | FIXED | FIXED | D, 2 goals | "NEXT STEP · FarmA · Next milestone: Step 1 · Open Goal →". |

#### AL-FIRST-RUN-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-025 | AL-FIRST-RUN-005 | FIXED | FIXED | D, 2 goals | Rail "YOUR DESTINATIONS · 2 goals in motion. Room for another… Plan my next goal →". |

#### AL-FIRST-RUN-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-007 | AL-FIRST-RUN-006 | FIXED | FIXED | W D | Step 3 "1 of 3 chosen". |

#### AL-FIRST-RUN-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-166 | AL-FIRST-RUN-007 | FIXED | FIXED | D, 5 goals | "Your destinations · 5 active goals". |

#### AL-FIRST-RUN-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-148 | AL-FIRST-RUN-008 | FIXED | FIXED | D | With records: "Make Today yours. Your records are already on Today…". |

#### AL-LAYOUT-375-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-224 | AL-LAYOUT-375-007 | FIXED | FIXED | 375, 300 | Today: scrollWidth = innerWidth at 375 and 300 (no sideways scroll). |

#### AL-LAYOUT-375-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-12 | AL-LAYOUT-375-008 | FIXED | FIXED | 375, 300 | 375: next goal step and water share a row, sleep full width; 300: all full width. |

#### AL-NUMBERS-SOURCE-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-199 | AL-NUMBERS-SOURCE-007 | FIXED | FIXED | D | 2,000 mL first, then template: "2 / 2 liters · from your water journal · 2,000 mL", Complete. |

#### AL-PERF-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-18 | AL-PERF-003 | FIXED | FIXED | DL | Pause → toast in 140 ms. |

#### AL-PERSISTENCE-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-246 | AL-PERSISTENCE-003 | FIXED | FIXED | W D | After a pick: "Skip setup leaves without saving what you picked." |

#### AL-PERSISTENCE-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-058 | AL-PERSISTENCE-004 | FIXED | FIXED | DL | Mon+Wed kept through a Measurement change and a refused submit; card "Mon · Wed · 10 minutes per day". |

#### AL-PERSISTENCE-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-077 | AL-PERSISTENCE-005 | FIXED | FIXED | DL | F5 → + New habit: "Draft title kept" and "Your unsaved habit from earlier in this tab is filled in. Start blank". |

#### AL-PERSISTENCE-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-100 | AL-PERSISTENCE-006 | FIXED | FIXED | D G | "Film night" typed at 5 ms/key kept whole. |

#### AL-PERSISTENCE-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-045 | AL-PERSISTENCE-007 | FIXED | FIXED | Sc | Details and History & reflection stay open after + on Read. |

#### AL-PLURALS-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-130 | AL-PLURALS-001 | FIXED | FIXED | DL | Subtitle "3× per week". |

#### AL-PLURALS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-09 | AL-PLURALS-003 | FIXED | FIXED | W D | "1 habit can be taken back for a day." |

#### AL-QUICK-ADD-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-138 | AL-QUICK-ADD-001 | FIXED | FIXED | D 03:45 | Sleep tile 7 h → "Last night saved: 7 h of sleep. Undo", tile "7 h 00 min asleep last night". |

#### AL-QUICK-ADD-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-240 | AL-QUICK-ADD-002 | FIXED | FIXED | W D, Habits only | No water/sleep focus tiles; Quick add: Type/Speak a line, Habit, Note, Task (no Health). |

#### AL-ROUNDING-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-NB-06 | AL-ROUNDING-003 | FIXED | FIXED | D | Status line "Today· 250 mL water", same unit as the tile. |

#### AL-STREAKS-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-189 | AL-STREAKS-001 | FIXED | FIXED | Sc | Exercise: "26 success × 0 failed ○ 3 skipped… skipped and rest days don’t count". |

#### AL-STREAKS-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-125 | AL-STREAKS-002 | FIXED | FIXED | D | Weight 80.5 → Weigh in Complete → weight removed → Due. |

#### AL-STREAKS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-036 | AL-STREAKS-003 | FIXED | FIXED | 375D Mon 2 Nov | Planet "0 of 2 this week: not done yet" → "1 of 2 this week: done". |

#### AL-STREAKS-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-017 | AL-STREAKS-004 | FIXED | FIXED | Sc | After adding the review habit, "Add weekly Goal review habit" is gone; panel "Consistency: Not due yet this week". |

#### AL-TOAST-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-156 | AL-TOAST-006 | FIXED | FIXED | D | Saving a Steps widget: no "Day 1" toast or live line. |

#### AL-UNDO-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-081 | AL-UNDO-002 | FIXED | FIXED | D | Add 250 mL → Undo → "Water entry removed.", tile back to —. |

#### AL-UNDO-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-068 | AL-UNDO-003 | FIXED | FIXED | DL | Skip → "Skip me skipped today. Your streak keeps its place. Undo" and "Undo skip"; Undo → Due. |

#### AL-UNITS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-063 | AL-UNITS-003 | FIXED | FIXED | D 04:00 clock | Morning routine: Activity "49 s of 10 minutes", "2 s of 5 minutes". |

#### AL-XP-BADGES-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-185 | AL-XP-BADGES-001 | FIXED | FIXED | D G | FarmA close/reopen ×2: 0 XP throughout. |

#### AL-XP-BADGES-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-049 | AL-XP-BADGES-002 | FIXED | FIXED | 340L GB | First check-in → one modal "New badge · First step · Your first check-in. Lovely" (follows the tap). |

#### AL-XP-BADGES-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-023a | AL-XP-BADGES-003 | FIXED | FIXED | D G | Popover "…on your Journey, with a small card at the bottom of Habits, Health, Wealth and Activity"; card present on Habits. |

#### AL-XP-BADGES-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-191 | AL-XP-BADGES-004 | FIXED | FIXED | D G | "What earns XP": "A habit day completed +10…", "Closing or reopening a goal earns nothing". |

#### AL-XP-BADGES-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-227 | AL-XP-BADGES-005 | FIXED | FIXED | D | Life review "FarmA: Milestones changed 2 times · 0 of 2 milestones done now"; no raw repeated rows. |

#### AL-XP-BADGES-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-248 | AL-XP-BADGES-006 | FIXED | FIXED | D G | Quests include "Complete every habit due today 0 of 1 day". |

#### AL-XP-BADGES-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-206 | AL-XP-BADGES-008 | FIXED | FIXED | D G | Focus "For a goal": No goal, FarmA (completed DoneProj not offered). |

#### —

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-045 | — | FIXED | FIXED | W D | Leaving /app/welcome by Today: no "Step 1 of 8" on Today. |

#### none (present)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-NB-23 | none (present) | HOLDS | HOLDS | DL | Quit and limit habits exist. |

## STILL OPEN for the lane

Common setup: Chrome, a fresh context, `en-GB`, `Europe/Brussels`, clock 4 Nov 2026 before 07:00, unless stated.

1. **PR-093 (STILL OPEN): a limit habit on a weekly schedule mixes per-day and per-week.**
   - Steps: DL → + New habit "Snacks" → Schedule "X times per period", 3 → More options → Habit type LIMIT, Target value 2 → Create → tap + three times.
   - Result: the subtitle reads "3× per week · Limit 2 times per week", but the card reads "0 of at most 2 times today" and "0 of 3 days within the limit this week". After three taps it reads "3 of at most 2 times today … Partial … Within limit".
   - The form sentence says "Each check-in counts 2 times; you aim for 3 check-ins a week."
   - One period rule is needed for subtitle, count and result. Over the limit must not read "Within limit" or "Partial".
2. **NB-052 (STILL OPEN): Journey's planets ignore the pages picked.**
   - Steps: W 340L → setup with Habits + Health & food + Chess → Finish → game layer on → /app/journey.
   - Result: four planets, Habits, Health, Goals and Wealth ("Your four planets"). Chess has none, and no line on the page names Chess.
   - Lane: "Open, needs a design choice". That is not F/O; it needs a design decision or an owner ruling.
3. **LS-070 / C-LS-34 (STILL OPEN): no per-item streak, no rule by the flame.**
   - Steps: 375D, clock 29 Oct → star "QA Read" and "Water glass" habits onto the path → for each day 29 Oct–2 Nov (`setFixedTime`), open /app/checklist and tap the QA Read planet only → on 2 Nov switch View → List.
   - Result: the flame reads "0-day streak" every day. The List row reads "QA Read 1 time · Habit · 09:00" with no streak of its own, and no "streak = every planet lit" text appears on the page.
   - Lane: Needs-other-lane (the Checklist lane, protected path).
4. **N-NB-21 (STILL OPEN; DV-132 and DV-243 CHANGED): habit type, measure and target folded under More options.**
   - Steps: DL → + New habit. Only Template, Title, Time of day, Schedule, Category, Reminder time and Done automatically show. Habit type, Measurement, Unit and Target sit in More options, and Habit type comes after Reminder time.
   - The honest parts are done: the quit explanation, and Measurement/Target hidden for quit.
   - The rest conflicts with the owner's verbatim FR-17 decision (ADR-036:957), which is not an AL_SCOPE F / O-row. **Owner ruling needed.**
5. **C-DVG-19 / C-DVG-20 (STILL OPEN): "perfect day" backlog and flexible day goal.**
   - Nothing is built. The lane now records "Later (competitor)" with reasons (past days via month grid/History; "4 of 6" changes the protected Checklist day rule).
   - That is not an F/O decision. The owner to accept "Later", or the lane to build.

### CHANGED (main complaint gone, a named part remains)

6. **D-044: a schedule edit applies today, but the form says tomorrow.**
   - Steps: DL → habit "Sched" → Complete → Edit → Schedule "Weekdays only" → Save.
   - Result: the stored rule starts 2026-11-04 and the card shows Mon–Fri at once. But "Changes effective from" showed **2026-11-05** before and after picking Weekdays, so the field promises tomorrow while today is changed.
   - The field should show the day the save will use.
   - A target change still starts tomorrow, which the hint states.
7. **N-NB-01: the step skips now share "Skip …".**
   - Inside the tour, "End the tour" sits beside Next/Done. That is a second wording for "Skip the tour".
   - Today's welcome card keeps "Not now".
8. **LS-033: plural and the visible double count are fixed.**
   - "1 of 2 complete" is now visually hidden, and "1 day streak" is singular.
   - No rule next to the flame (as LS-070).
9. **DV-045e: Journey now has an "On this page" row, and the mid-page card is gone.**
   - The Showcase Journey (1440×900, game + badges on) is still 7,872 px tall (round 1: 8,162).
   - The bot's "one very long page" stands, though it is now navigable.

### NOT REPLAYED this round (reason in the row)
- **L7 (ZIGi/NOVA):** NB-114, LA-019, LZ-027, C-DVG-23.
- **Goals pages (L4):** NB-165, NB-173, NB-190, NB-198, N-170, G-045.
- **Other:**
  - C-NB-31: Agenda export present; habit content not checked (L5).
  - C-NB-02: goal wizard step 1 only.
  - N-162: no backfill entry made.
  - BUG-071: an old id with no text.
