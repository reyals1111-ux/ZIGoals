# Grok #53 replay — lane L3 (Habits, Today, widgets, Journey/XP, onboarding / first run), pass 1

- **Commit served:** `c521574f` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, built from the session branch) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 03:00–05:40 Brussels (02:00–04:40 UTC).
- **Replayed by:** a fresh replay agent. It made no fixes and changed no app code.
  - Bot: Nairobi (`ledger/nairobi.md`, every id), plus every id from other bots that GROK53_LEDGER puts in an L3 row: Denver, Denver re-check and gaps, Lisbon, Moscow, Professor, Tokyo, and old ids.
  - `lanes/L3.md` was read only to see which rows claim Fixed.
- **Browser:** Google Chrome (channel `chrome`), headless, Playwright 1.63, `timezoneId: Europe/Brussels`, `locale: en-GB` (as the brief asks), live API (no routing).
  - The bots' clock was set with `page.clock.install` to 4 Nov 2026, 01:00–05:30 Brussels (before 07:00). LS-036 used Mon 2 Nov, as Lisbon did.
  - Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser and one worker.
  - Scripts and 1 screenshot are in `/tmp/claude-0/replay-L3/` and are not committed.
- **Conditions used** (codes in the table):
  - **D** = desktop 1280×800, Nebula (default theme), fresh empty context with the welcome marked seen. **DL / DD** = the same in Light / Dark.
  - **W** = first visit (welcome not seen).
  - **G** = game layer on; **GB** = game layer + badges on.
  - **340L** = 340×740 Light; **375D** = 375×812 Dark; **375** = 375×812 Nebula. **1440** = 1440×900 fresh.
  - **Sc** = Showcase (Settings → Load Showcase Demo), 1440×900. **+crypto** = Earn/crypto modules chosen.
  - "spec" = the lane spec's own steps were checked against the bot's and accepted only where they match.
- **Lane specs as evidence.** `tests/grok53/{habits,today,first-run,journey}` (desktop project, 1 worker, :3101): **39 passed**.
  - They run with every `/api` answered 503, in the runner's default en-US locale and UTC.
  - **NB-011 shows that this matters:** its spec passes, but the same steps in en-GB lose the wizard draft.
  - Verdicts below come from the replays.
- **How CHANGED is used:** the bot's main complaint is gone, but a named part of the same finding remains, or the fix behaves differently from what was asked. **STILL OPEN** means the main complaint still shows.
- **Owner decisions** were accepted only where AL_SCOPE F (or G for owner steps) says so. These were *not* accepted, because they are outside F/O:
  - "Later" (NB-006);
  - the AK "owner decision 5" fold of the habit form (N-NB-21, DV-132, DV-243);
  - "kept, not a defect" (N-NB-01, "Step N of 8").
- **Incidental (other lane, L10a):** at ~300 CSS px Today scrolls 12 px sideways. The phone top bar's "+ Quick add" ends at x 312 (NB-238 condition).

## Totals (counted per finding id)

| verdict | ids |
|---|---|
| FIXED | 164 |
| HOLDS | 77 |
| STILL OPEN | 27 |
| CHANGED | 24 |
| OWNER DECISION (agreed, F) | 16 |
| WAITS ON OWNER (agreed, G) | 4 |
| NOT POSSIBLE (agreed) | 3 |
| REASON CITED, NOT BUILT | 5 |
| NOT REPLAYED | 53 |
| OUT OF SCOPE | 46 |
| ENV-ONLY (L9) | 12 |
| L7 | 82 |
| OTHER LANE (not replayed here: L1 2, L10a 22, L10b 9, L2 5, L4 9, L5 3, L6 4, L7 32) | 86 |
| **total ids** | **599** |

## Findings

### Findings (NB-001…NB-254)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| NB-001 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-002 | AL-FIRST-RUN-002 | FIXED | W D 05:22 | Welcome → "Not now" → reload: "YOUR FIRST MINUTE · Set up ZIGoals in about a minute" with Start setup. /welcome, /onboarding, /start → /app/welcome. |
| NB-003 | keep | HOLDS | D/W D/340L | Step 1: honest welcome, pillars, privacy blocks, no paywall. |
| NB-004 | keep | HOLDS | D/W D/340L | 7 pillars, crypto optional/last, "Continue without choosing". |
| NB-005 | keep | HOLDS | D/W D/340L | Focuses with one-line promises, skippable. |
| NB-006 | AL-COPY-025 | STILL OPEN | W D | No optional name anywhere in setup. Lane: "Later (feature)", which is not an AL_SCOPE F/O decision. |
| NB-007 | AL-FIRST-RUN-006 | FIXED | W D | Step 3 counts "1 of 3 chosen". |
| NB-008 | keep | HOLDS | D/W D/340L | Starter habits pre-ticked from focuses ("3 SELECTED"). |
| NB-009 | AL-FIRST-RUN-006 | FIXED | W 340L, W D | Step 4 legend "3 SELECTED"; at 340 px Continue is position:sticky. |
| NB-010 | keep | HOLDS | D/W D/340L | 4 tour cards, skippable. |
| NB-011 | AL-PERSISTENCE-003 | CHANGED | W D, 4 locale/zone runs | Reload at Step 3: en-US (the bot's browser locale, NB-017) → back on Step 3, picks kept. **en-GB → back on Step 1, picks lost** (draft overwritten to step "welcome"), in UTC and Brussels, live API or /api 503. The spec passes only because it runs en-US. |
| NB-012 | keep | HOLDS | D/W D/340L | WELCOME card with Start setup / Explore the demo / Not now. |
| NB-013 | keep | HOLDS | D/W D/340L | Live "You'll see: …" line. |
| NB-014 | keep | HOLDS | D/W D/340L | Focus list follows pillars (sleep/water/eat focuses for Health). |
| NB-015 | keep | HOLDS | D/W D/340L | Habits, first goal, targets, sleep in one step. |
| NB-016 | AL-FIELD-ERROR-008 | FIXED | W D | With no money focus nothing is preselected and Continue passes. With "Save for something" the goal is preselected (the focus's promise); the message sits under the amount, focus moves there, and it clears as soon as 1200 is typed. |
| NB-017 | AL-CURRENCY-002 | OTHER LANE (L1) | — | AL-CURRENCY-002 is in lane L1; not replayed here. |
| NB-018 | keep | HOLDS | D/W D/340L | Tour 4 cards, end any time. |
| NB-019 | AL-LAYOUT-DESKTOP-007 | CHANGED | W D | Next stays put (y 461/461/459/459), and Back shows from card 2. "+ Quick add" is described but still not highlighted. |
| NB-020 | keep | HOLDS | D/W D/340L | Honest Home-screen copy. |
| NB-021 | keep | HOLDS | D/W D/340L | "Meet ZIGi": nothing sent until connected. |
| NB-022 | AL-COPY-025 | FIXED | W D | The ZIGi step says "NOVA is my full-page view. NOVA in the sidebar shows your whole day…". |
| NB-023 | keep | HOLDS | D/W D/340L | "When you finish" receipt. |
| NB-024 | keep | HOLDS | D/W D/340L | "SETUP FINISHED … Tick your first habit ↓", first tick "Day 1 of your streak" + Undo toast. |
| NB-025 | AL-FIRST-RUN-005 | FIXED | D, 5 goals | Rail reads "YOUR DESTINATIONS · 5 goals in motion. Room for another… Plan my next goal →". With no goal it keeps "Plan my first goal". |
| NB-026 | AL-LAYOUT-DESKTOP-007 | OWNER DECISION (agreed, F) | W D | The marketing footer (739 px, "SAME YOU. A BRIGHTER TOMORROW") still shows under every step. The footer finale is PROTECTED (F). |
| NB-027 | keep | HOLDS | D/W D/340L | Journey "Small steps, counted kindly", unlit universe. |
| NB-028 | AL-NAV-010 | OTHER LANE (L10a) | — | AL-NAV-010 is in lane L10a; not replayed here. |
| NB-029 | AL-COPY-056 | OTHER LANE (L6) | — | AL-COPY-056 is in lane L6; not replayed here. |
| NB-030 | keep | HOLDS | D/W D/340L | Light chosen in Settings survives a reload (body background changes, radio stays checked). |
| NB-031 | AL-THEME-006 | OTHER LANE (L10a) | — | AL-THEME-006 is in lane L10a; not replayed here. |
| NB-032 | keep | HOLDS | D/W D/340L | 340 px: phone shell, scrollWidth 340. |
| NB-033 | AL-FIRST-RUN-002 | CHANGED | W D 04:22 | "Make Today yours" and "Keep Balanced" are gone from the empty Today. Three primary buttons remain: "+ Quick add", "Start setup", "Plan my first goal →", plus "See how it works". |
| NB-034 | keep | HOLDS | D/W D/340L | Live summary per pillar. |
| NB-035 | AL-FIRST-RUN-006 | FIXED | W D | With 3 ticked: "3 of 3 chosen · that's the most for now: untick one to pick another"; the 4th box is disabled. |
| NB-036 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-037 | AL-LAYOUT-DESKTOP-007 | OWNER DECISION (agreed, F) | W D | The footer and planet hero stay (PROTECTED footer finale, F). The skip links are unchanged. |
| NB-038 | keep | HOLDS | D/W D/340L | "Skip the tour" works. |
| NB-039 | keep | HOLDS | D/W D/340L | ZIGi step copy. |
| NB-040 | AL-COPY-025 | FIXED | W D | Receipt: "2 habits: Deep work, Read." in one list, and Today says "2 habits for today". |
| NB-041 | AL-FIRST-RUN-005 | FIXED | W 340L + D | Habits + Health + Chess setup: no "Your goals" region, no destination panel, no goal focus tile. The hero text is unchanged (PROTECTED, see N-113). |
| NB-042 | keep | HOLDS | D/W D/340L | "Tick your first habit ↓". |
| NB-043 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-044 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-045 | AL-NAV-010 | OTHER LANE (L10a) | — | AL-NAV-010 is in lane L10a; not replayed here. |
| NB-046 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-047 | AL-COPY-031 | FIXED | 340L | Card buttons read "+0.25 L" (aria "Add 0.25 to Drink water") and "+5 min". |
| NB-048 | keep | HOLDS | D/W D/340L | "New badge · First step" card after the first check-in. |
| NB-049 | AL-XP-BADGES-002 | FIXED | 340L GB | First check-in → one dialog "New badge · First step… Lovely"; Esc → none; no "A goal finished". |
| NB-050 | AL-XP-BADGES-002 | FIXED | 340L GB | As NB-049: one card, Escape closes it. |
| NB-051 | keep | HOLDS | D/W D/340L | Journey: "a missed day leaves a faint ring". |
| NB-052 | AL-XP-BADGES-007 | CHANGED | W 340L, Sc | Journey still draws four planets, Chess has none. It now says so: "One planet for each of the four parts… (other pages, such as Chess…)" and "Goals is not on your pages. Its planet stays, quietly…". |
| NB-053 | AL-FIELD-ERROR-009 | FIXED | DL 01:55 | Title "   " → "Habit title: Give the habit a name." right under the field; focus on the field; aria-invalid. |
| NB-054 | keep | HOLDS | D/W D/340L | "Start from an idea" in the form; Sort present. |
| NB-055 | AL-THEME-006 | OTHER LANE (L10a) | — | AL-THEME-006 is in lane L10a; not replayed here. |
| NB-056 | AL-FIELD-ERROR-009 | FIXED | DL | No weekday → "Scheduled weekdays: Choose at least one day." under the group; focus moves to Mon. |
| NB-057 | keep | HOLDS | D/W D/340L | Build/Quit/Limit, 5 measurements, 5 schedules. |
| NB-058 | AL-PERSISTENCE-004 | FIXED | DL | Mon+Wed survive a Measurement change and a refused submit; the card reads "Mon · Wed · 10 minutes per day". |
| NB-059 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-060 | keep | HOLDS | D/W D/340L | +5 min / +0.25 L steps. |
| NB-061 | keep | HOLDS | D/W D/340L | "Drink water 1 day streak". |
| NB-062 | AL-CONFIRM-DELETE-004 | FIXED | DL 03:3x | The ⋯ menu has "Pause from 5 Nov", "Archive habit…", "Delete habit…". The archive confirm opens in view (y 589). |
| NB-063 | AL-UNITS-003 | FIXED | D 04:00 clock | Morning routine run with the clock: Activity rows read "49 s of 10 minutes", "2 s of 5 minutes". |
| NB-064 | keep | HOLDS | D/W D/340L | Details: when-and-where, skip, note/mood, timer, challenge, history. |
| NB-065 | keep | HOLDS | D/W D/340L | Routine templates; the player opens (STEP 1 OF 4). |
| NB-066 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-067 | AL-COUNTS-006 | FIXED | DL | "Vacation marked for 6 habits, 7 days. 41 habit days were set aside; days you had already checked in or skipped kept what you wrote." |
| NB-068 | AL-UNDO-003 | FIXED | DL | Skip today (reason optional) → toast "Skip me skipped today… Undo" and "Undo skip" on the card; toast Undo puts it back to Due. |
| NB-069 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-070 | keep | HOLDS | D/W D/340L | Calendar, legend, "Log days before…". |
| NB-071 | AL-DATES-004 | CHANGED | DL | Hint under the calendar: "Days before 4 Nov 2026 are greyed: this habit started then…". Cells are still 119 px tall (calendar 781 px). |
| NB-072 | AL-DISCOVERABILITY-001 | STILL OPEN | DL | "Start from an idea" (inside the new-habit form) opens the panel at top 1356 px in an 800 px window. Focus stays on the button and the page does not scroll. Ideas now have a line each. |
| NB-073 | AL-COUNTS-005 | FIXED | DL | Today's cell with 1 of 6 done is level "some" (pale, rgb 199,212,239), with a title. Legend: None done / Under half / Most / All. |
| NB-074 | AL-DISCOVERABILITY-001 | STILL OPEN | DL | As NB-072: the panel is off-screen and nothing scrolls to it. The lane left its placement unchanged. |
| NB-075 | AL-MOTION-002 | OTHER LANE (L10a) | — | AL-MOTION-002 is in lane L10a; not replayed here. |
| NB-076 | AL-STREAKS-003 | CHANGED | D 02:10 | The 3×/week card now adds "0 of 3 this week" but keeps "0 / 1 time today" and "Due". |
| NB-077 | AL-PERSISTENCE-005 | FIXED | DL | F5 with a typed title → "+ New habit" brings it back: "Your unsaved habit from earlier in this tab is filled in. Start blank". |
| NB-078 | keep | HOLDS | D/W D/340L | Enter submits. |
| NB-079 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-080 | keep | HOLDS | D/W D/340L | Add 250 mL: toast with Undo/×, no Zod text. |
| NB-081 | AL-UNDO-002 | FIXED | DD 02:13 | Add 250 mL → Undo → "Water entry removed.", tile 0 mL, store empty. |
| NB-082 | AL-NUMBERS-SOURCE-007 | CHANGED | D | Today tile 2,250 mL, Health 2,250 mL, habit "2 / 2 liters" (done). The habit note keeps 2,000 mL (NB-200). |
| NB-083 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-084 | keep | HOLDS | D/W D/340L | Empty cards have CTAs (Plan a goal →, Add 250 mL, Build your path →). |
| NB-085 | keep | HOLDS | D/W D/340L | Reload keeps water (250 mL) and habits. |
| NB-086 | AL-MOTION-002 | OTHER LANE (L10a) | — | AL-MOTION-002 is in lane L10a; not replayed here. |
| NB-087 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-088 | keep | HOLDS | D/W D/340L | "drank 2 glasses of water" → 500 mL. |
| NB-089 | AL-UNDO-002 | FIXED | DD | Two adds, Undo on the second → after reload 250 mL, one entry left; the Health journal agrees. |
| NB-090 | keep | HOLDS | D/W D/340L | Customize: ↑/↓, "+ Add widget after …". |
| NB-091 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-092 | AL-A11Y-012 | STILL OPEN | D | Arrange mode still shows "Daily Habits is hidden from Today." right above a live Daily Habits card. |
| NB-093 | AL-TOAST-008 | OTHER LANE (L5) | — | AL-TOAST-008 is in lane L5; not replayed here. |
| NB-094 | keep | HOLDS | D/W D/340L | Nav clicks navigate first time. |
| NB-095 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-096 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-097 | AL-FIELD-ERROR-001 | OTHER LANE (L1) | — | AL-FIELD-ERROR-001 is in lane L1; not replayed here. |
| NB-098 | AL-COPY-034 | OTHER LANE (L4) | — | AL-COPY-034 is in lane L4; not replayed here. |
| NB-099 | keep | HOLDS | D/W D/340L | Rewards shelf opt-in, "No penalties, no negative points". |
| NB-100 | AL-PERSISTENCE-006 | FIXED | D G | "Film night" typed at 5 ms/key is kept whole. |
| NB-101 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-102 | AL-AI-SAFETY-004 | OTHER LANE (L7) | — | AL-AI-SAFETY-004 is in lane L7; not replayed here. |
| NB-103 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| NB-104 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| NB-105 | AL-NUMBERS-SOURCE-014 | OTHER LANE (L7) | — | AL-NUMBERS-SOURCE-014 is in lane L7; not replayed here. |
| NB-106 | AL-AI-ACTIONS-007 | OTHER LANE (L7) | — | AL-AI-ACTIONS-007 is in lane L7; not replayed here. |
| NB-107 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| NB-108 | AL-AI-STABILITY-004 | OTHER LANE (L7) | — | AL-AI-STABILITY-004 is in lane L7; not replayed here. |
| NB-109 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| NB-110 | AL-AI-SAFETY-004 | OTHER LANE (L7) | — | AL-AI-SAFETY-004 is in lane L7; not replayed here. |
| NB-111 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| NB-112 | AL-PRIVACY-004 | OTHER LANE (L7) | — | AL-PRIVACY-004 is in lane L7; not replayed here. |
| NB-113 | AL-NUMBERS-SOURCE-014 | OTHER LANE (L7) | — | AL-NUMBERS-SOURCE-014 is in lane L7; not replayed here. |
| NB-114 | AL-UNITS-003 | NOT REPLAYED | — | ZIGi/NOVA number words (the L7 part) were not exercised; the habit card and Activity part is NB-063. |
| NB-115 | AL-AI-STABILITY-004 | OTHER LANE (L7) | — | AL-AI-STABILITY-004 is in lane L7; not replayed here. |
| NB-116 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| NB-117 | AL-AI-CONNECTION-006 | OTHER LANE (L7) | — | AL-AI-CONNECTION-006 is in lane L7; not replayed here. |
| NB-118 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| NB-119 | AL-AI-FACTS-008 | OTHER LANE (L7) | — | AL-AI-FACTS-008 is in lane L7; not replayed here. |
| NB-120 | AL-A11Y-022 | OTHER LANE (L7) | — | AL-A11Y-022 is in lane L7; not replayed here. |
| NB-121 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| NB-122 | AL-AI-STABILITY-004 | OTHER LANE (L7) | — | AL-AI-STABILITY-004 is in lane L7; not replayed here. |
| NB-123 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-124 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| NB-126 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-127 | AL-TOAST-012 | OTHER LANE (L10b) | — | AL-TOAST-012 is in lane L10b; not replayed here. |
| NB-128 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-129 | keep | HOLDS | D/W D/340L | ✓ Done unticks back to Due. |
| NB-130 | keep | HOLDS | D/W D/340L | Edit copy "Today keeps its current rule". |
| NB-131 | AL-UNDO-003 | FIXED | D | As NB-068. |
| NB-132 | AL-CONFIRM-DELETE-004 | FIXED | DL 03:3x | With nothing recorded today the menu says "Pause from today" → card "Paused", toast "…is paused today. Undo". With a check-in it says "Pause from 5 Nov". |
| NB-133 | AL-CONFIRM-DELETE-004 | CHANGED | DL | The ⋯ menu now has Pause and Delete (and "Open its own page"), but still no Duplicate (lane: a feature, not built). |
| NB-134 | keep | HOLDS | D/W D/340L | Heatmap tooltip "8 Oct 2026: Before you started". |
| NB-135 | AL-CONFIRM-DELETE-004 | FIXED | DL 03:35 | Ticked "Typo habbit" → Archive → "Delete for good…" the same day → typed "TYPO HABBIT" → gone, toast "…was deleted for good. Undo". |
| NB-136 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-137 | keep | HOLDS | D/W D/340L | Water ×2 with toast + Undo. |
| NB-138 | AL-QUICK-ADD-001 | FIXED | D 03:45 (before 07:00) | Sleep tile "7 h" → "Last night saved: 7 h of sleep. Undo" → tile "7 h 00 min"; Undo → "No night logged". |
| NB-139 | AL-TIMEZONE-001 | OTHER LANE (L2) | — | AL-TIMEZONE-001 is in lane L2; not replayed here. |
| NB-140 | AL-COPY-030 | NOT REPLAYED | D, game on | The "already on Today" refusal could not be triggered (Save with Water today closed the dialog). Code clears it on a chip change (today-dashboard.tsx:126). |
| NB-141 | keep | HOLDS | D/W D/340L | Journey widget tiles in the library. |
| NB-142 | AL-NUMBERS-SOURCE-007 | CHANGED | D | As NB-082: three surfaces agree on done and mL; the habit note shows a stale 2,000 mL. |
| NB-143 | keep | HOLDS | D/W D/340L | All schedules, types, measurements present. |
| NB-144 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-145 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-146 | keep | HOLDS | D/W D/340L | Title + Create → card. |
| NB-147 | AL-DISCOVERABILITY-001 | FIXED | DL | Second "+ New habit": focus on Habit title; typing "Study" lands in the title, and the template stays Blank. |
| NB-148 | keep | HOLDS | D/W D/340L | Reload drops nothing saved (the draft now comes back by design, NB-077). |
| NB-149 | keep | HOLDS | D/W D/340L | Habits persist. |
| NB-150 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-151 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-152 | keep | HOLDS | D/W D/340L | Unsubmitted text is never saved as a habit. |
| NB-153 | keep | HOLDS | D/W D/340L | Duration → minutes ("10 minutes per day"). |
| NB-154 | keep | HOLDS | D/W D/340L | Quit "Avoid completely", "Stayed on track". |
| NB-155 | AL-FIELD-ERROR-009 | FIXED | DL | Enter in Target value creates the habit. |
| NB-156 | keep | HOLDS | D/W D/340L | Limit "Within limit". |
| NB-157 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-158 | AL-STREAKS-003 | CHANGED | D | As NB-076: after a check-in it shows "1 / 1 time today · 1 of 3 this week · Partial". |
| NB-159 | keep | HOLDS | D/W D/340L | X-per-week complete: toast + Undo. |
| NB-160 | AL-CONFIRM-DELETE-004 | FIXED | DL | The card says "Scheduled change from 5 Nov 2026: archived. Today keeps its current rule." and the toast says it leaves tomorrow. |
| NB-161 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-162 | AL-COPY-030 | FIXED | D, game on | Journey widgets: "a tap adds or removes one at once, no Save needed". |
| NB-163 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-164 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-165 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-166 | AL-FIRST-RUN-007 | FIXED | D, Sc | With goals, an un-arranged Today shows "Your destinations · 5 active goals". |
| NB-167 | keep | HOLDS | D/W D/340L | Tick +10, untick back to 0. |
| NB-168 | AL-XP-BADGES-002 | FIXED | D GB | No "A goal finished" after habit ticks; the cabinet says "A goal finished: not yet". |
| NB-169 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-170 | AL-XP-BADGES-002 | FIXED | D GB | Modal and cabinet agree. |
| NB-171 | AL-XP-BADGES-002 | FIXED | 340L GB | After untick, "First step: earned" stays; XP goes back to 0. |
| NB-172 | AL-CONFIRM-DELETE-006 | OTHER LANE (L4) | — | AL-CONFIRM-DELETE-006 is in lane L4; not replayed here. |
| NB-173 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-174 | AL-COPY-034 | OTHER LANE (L4) | — | AL-COPY-034 is in lane L4; not replayed here. |
| NB-175 | AL-CONFIRM-DELETE-006 | OTHER LANE (L4) | — | AL-CONFIRM-DELETE-006 is in lane L4; not replayed here. |
| NB-176 | AL-FIRST-RUN-007 | NOT REPLAYED | D | The goal chips (with "+N more", code today-dashboard.tsx:240) show only when the "Your goals" section is off Today; that layout was not reproduced. |
| NB-177 | AL-FIELD-ERROR-009 | CHANGED | DL | A duplicate name now asks "You already have a habit called “After Dup”… Create it anyway / Change the name". A 200-character paste is still cut to 100 with no message. |
| NB-178 | keep | HOLDS | D/W D/340L | Button names "Complete Gym3", "Within limit". |
| NB-179 | keep | HOLDS | D/W D/340L | Creation 0 XP, tick +10, untick −10. |
| NB-180 | AL-CONFIRM-DELETE-004 | FIXED | DL | Schedule → weekdays: "Scheduled change from 5 Nov 2026: Mon · Tue · Wed · Thu · Fri · 1 time per day." |
| NB-181 | AL-CONFIRM-DELETE-004 | FIXED | DL | As NB-135/NB-160. |
| NB-182 | AL-CONFIRM-DELETE-006 | OTHER LANE (L4) | — | AL-CONFIRM-DELETE-006 is in lane L4; not replayed here. |
| NB-183 | AL-FIELD-ERROR-019 | OTHER LANE (L10b) | — | AL-FIELD-ERROR-019 is in lane L10b; not replayed here. |
| NB-184 | AL-CONFIRM-DELETE-006 | OTHER LANE (L4) | — | AL-CONFIRM-DELETE-006 is in lane L4; not replayed here. |
| NB-185 | AL-XP-BADGES-001 | FIXED | D G 04:36 | FarmA close/reopen ×3 via Goal status: XP stays at 0. |
| NB-186 | keep | HOLDS | D/W D/340L | Journey total equals the deltas (flips net 0). |
| NB-187 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-188 | AL-UNDO-003 | FIXED | D | Skip with no reason saves ("A reason is optional"). |
| NB-189 | AL-FIELD-ERROR-019 | OTHER LANE (L10b) | — | AL-FIELD-ERROR-019 is in lane L10b; not replayed here. |
| NB-190 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-191 | AL-XP-BADGES-004 | FIXED | D G | Journey "What earns XP": "Water logged +2 each, up to 10 a day…". |
| NB-192 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-193 | AL-TOAST-008 | OTHER LANE (L5) | — | AL-TOAST-008 is in lane L5; not replayed here. |
| NB-194 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-195 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-196 | AL-TIMEZONE-001 | OTHER LANE (L2) | — | AL-TIMEZONE-001 is in lane L2; not replayed here. |
| NB-197 | AL-XP-BADGES-002 | FIXED | D GB | As NB-168. |
| NB-198 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-199 | AL-NUMBERS-SOURCE-007 | FIXED | D 04:42 | 2 L logged first, then the "Drink water" template → card "2 / 2 liters ✓ Done · Done automatically · from your water journal · 2,000 mL", also after reload. |
| NB-200 | AL-NUMBERS-SOURCE-007 | CHANGED | D | The habit stays done after more water, but its note still says "from your water journal · 2,000 mL" while the journal and Today say 2,250 mL. |
| NB-201 | AL-NUMBERS-SOURCE-007 | CHANGED | D | The form link now ticks the habit by itself. "Auto-complete rules · Set up rules" is still a second automatic setting with the same promise. |
| NB-202 | AL-FIELD-ERROR-003 | OTHER LANE (L2) | — | AL-FIELD-ERROR-003 is in lane L2; not replayed here. |
| NB-203 | AL-XP-BADGES-001 | FIXED | D G | Milestone tick → 25 XP, untick → 0, re-tick → 25, untick → 0. |
| NB-204 | keep | HOLDS | D/W D/340L | `<b>…<img onerror>` title shown as text, nothing runs. |
| NB-205 | keep | HOLDS | D/W D/340L | Five sort options. |
| NB-206 | AL-XP-BADGES-008 | FIXED | D G | Focus "For a goal" lists "No goal", "FarmA"; the completed DoneProj is not offered. |
| NB-207 | AL-TOAST-012 | OTHER LANE (L10b) | — | AL-TOAST-012 is in lane L10b; not replayed here. |
| NB-208 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-209 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-210 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-211 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-212 | AL-XP-BADGES-001 | FIXED | D G | As NB-185. |
| NB-213 | AL-XP-BADGES-001 | FIXED | D G | As NB-203 (net 0 after four flips). |
| NB-214 | AL-XP-BADGES-004 | FIXED | D G | As NB-191 (the cap is shown). |
| NB-215 | keep | HOLDS | D/W D/340L | A no-record habit archives today (spec al-second-habits, steps as the bot). |
| NB-216 | keep | HOLDS | D/W D/340L | Delete for good: typed name, toast Undo. |
| NB-217 | AL-XP-BADGES-004 | FIXED | D G | XP table, "Untick, remove or reverse the entry and its XP goes with it. Closing or reopening a goal earns nothing", and the lede "A badge, once earned, stays; XP follows your records". |
| NB-218 | AL-XP-BADGES-001 | FIXED | D G | Rewards shelf "Points to spend: 0 · 0 XP earned" after the flips. |
| NB-219 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| NB-220 | AL-A11Y-012 | STILL OPEN | D | Move status now names the widget ("Moved Daily Habits to position 3 of 11"). Still: arrows read "Move Health metric up" and "Move Widget summary up", "Move Daily Habits" twice, and "Watchlist is hidden with its page" for a widget this profile never had. |
| NB-221 | AL-A11Y-011 | FIXED | DL | Completions input: aria-label, inputmode numeric, hint "A whole number from 1 to 100,000…". |
| NB-222 | AL-A11Y-011 | FIXED | DL | After the last completion: "All 1 completion done: this habit has reached its end with today's check-in. It rests from tomorrow." |
| NB-223 | AL-CONFIRM-DELETE-004 | FIXED | DL | Archive → Restore: the "archived" pending line goes (only the real weekday change stays), toast "…is restored. Undo". |
| NB-224 | AL-XP-BADGES-002 | FIXED | D G (seeded 7/8 milestones) | Ticking the 8th milestone crosses level 2. A "LEVEL UP · Level 2 · Ember" card shows on the next page. |
| NB-225 | AL-A11Y-011 | FIXED | DL | Card: "Every day · ends 30 Nov 2026". |
| NB-226 | AL-A11Y-026 | OTHER LANE (L10b) | — | AL-A11Y-026 is in lane L10b; not replayed here. |
| NB-227 | AL-XP-BADGES-005 | FIXED | D G | Life review: "FarmA: Milestones changed 4 times · 0 of 2 milestones done now", period "Last 7 days"; the quest links "Open it →". |
| NB-228 | AL-TOAST-008 | OTHER LANE (L5) | — | AL-TOAST-008 is in lane L5; not replayed here. |
| NB-229 | AL-XP-BADGES-004 | FIXED | server HTML | Help has "Where does XP come from, and why does water stop adding it?" and says the weekly-review quest shows on the chosen day. |
| NB-230 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-231 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-232 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-233 | keep | HOLDS | D/W D/340L | Clean Today: welcome card and empty states with CTAs. |
| NB-234 | AL-COPY-025 | CHANGED | W D 1280×800 | Fixed: the stale goal error and the missing health/sleep focuses. Still: "STEP 8 OF 8" on content steps, and Finish setup at y 1006 in an 800 px window (below the fold). |
| NB-235 | AL-FIRST-RUN-005 | FIXED | W D | As NB-025: with goals the rail says "N goals in motion"; with none, "Plan my first goal". |
| NB-236 | keep | HOLDS | D/W D/340L | Inline "Day 1" line + toast with Undo. |
| NB-237 | keep | HOLDS | D/W D/340L | Game layer off by default. |
| NB-238 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-239 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| NB-240 | AL-QUICK-ADD-002 | FIXED | W D (Habits only; Habits+Goals) | Quick add has no Health tile when Health is hidden. The Habits-only Today has no Health/Water/Sleep focus tiles, and nav has no Health. |
| NB-241 | AL-PERSISTENCE-003 | CHANGED | W D | Undo setup now toasts "Setup undone: 2 habits removed. Your page choices stay; change them in Settings…". Page prefs are still not restored (they are said instead). |
| NB-242 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| NB-243 | AL-COPY-034 | OTHER LANE (L4) | — | AL-COPY-034 is in lane L4; not replayed here. |
| NB-244 | AL-FIRST-RUN-005 | FIXED | D 04:00, one habit | "Make Today yours" → Balanced on a zero-data profile shows no "WEEKLY CHECK-IN / Your coach" card. |
| NB-245 | AL-LAYOUT-768-004 | OTHER LANE (L10a) | — | AL-LAYOUT-768-004 is in lane L10a; not replayed here. |
| NB-246 | AL-PERSISTENCE-003 | FIXED | W D 05:24 | After a pick: "Skip setup leaves without saving what you picked." above Skip setup. |
| NB-247 | AL-PERF-010 | OTHER LANE (L10a) | — | AL-PERF-010 is in lane L10a; not replayed here. |
| NB-248 | AL-XP-BADGES-006 | FIXED | D G | With one due habit the quests include "Complete every habit due today". |
| NB-249 | AL-DATES-004 | FIXED | DL | Yesterday's cell is disabled, labelled "Before you started", and the hint explains it. |
| NB-250 | AL-DISCOVERABILITY-001 | FIXED | DL | The form scrolls into view (title at y 244) with focus on the title. |
| NB-251 | AL-XP-BADGES-002 | FIXED | D GB 05:28 | Habit tick + weight + new goal on day one: only "First step"; no "Balanced week", no "A goal finished". |
| NB-252 | AL-ROUNDING-004 | OTHER LANE (L10b) | — | AL-ROUNDING-004 is in lane L10b; not replayed here. |
| NB-253 | AL-DISCOVERABILITY-002 | OTHER LANE (L4) | — | AL-DISCOVERABILITY-002 is in lane L4; not replayed here. |
| NB-254 | AL-NAV-002 | OTHER LANE (L2) | — | AL-NAV-002 is in lane L2; not replayed here. |

### Old ids re-checked by Nairobi

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| BUG-026 | AL-FIELD-ERROR-009 | FIXED | DL | As NB-053. |
| H-006 | keep (+P-NB-22) | HOLDS | DL | "Start from an idea" is visible in the form (the panel position is NB-074). |
| BUG-064 | keep | HOLDS | D/W D/340L | Sort present. |
| N-052 | AL-THEME-006 | OTHER LANE (L10a) | — | AL-THEME-006 is in lane L10a; not replayed here. |
| N-164 | AL-FIELD-ERROR-009 | FIXED | DL | As NB-056. Mon–Fri is still pre-ticked (the default). |
| N-096 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| N-005 | keep | HOLDS | D/W D/340L | Step size shown. |
| N-112 | keep | HOLDS | D/W D/340L | 0.25 L step. |
| N-014 | keep | HOLDS | D/W D/340L | 1-day streak on card. |
| BUG-070 | keep (Delete → P-NB-24) | HOLDS | D | Same-day archive with confirm works. |
| N-061 | keep | HOLDS | D/W D/340L | As BUG-070. |
| N-079 | AL-CONFIRM-DELETE-004 | FIXED | DL | Pause and Delete are in the ⋯ menu. |
| N-088 | AL-CONFIRM-DELETE-004 | FIXED | DL | As N-079. |
| N-134 | keep (+P-NB-29) | FIXED | D | Real time recorded and shown in seconds. |
| H-013 | AL-UNITS-003 | FIXED | D | As NB-063 (seconds, no decimals of a minute). |
| BUG-044 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| N-091 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| BUG-024 | AL-COUNTS-006 | FIXED | DL | As NB-067. |
| H-004 | AL-CONFIRM-DELETE-004 | FIXED | DL | As NB-132: pause from today is offered, and the date is named. |
| N-038 | keep | HOLDS | D/W D/340L | "Log days before…". |
| N-089 | AL-COUNTS-005 | NOT REPLAYED | DL | Light mapping by share is correct (NB-073). Theme parity (Dark/Nebula) could not be measured: the cell selector found nothing after the theme switch. |
| N-162 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| H-008 | AL-STREAKS-003 | CHANGED | D | As NB-076. |
| BUG-077 | AL-PERSISTENCE-005 | FIXED | DL | As NB-077. |
| H-012 | AL-ENV-ONLY-002 | ENV-ONLY (L9) | — | Bot environment (shared profile, PIN lock, tool lag); no app change asked. |
| N-050 | keep (+P-NB-27) | HOLDS | DD | Add 250 mL saves, toast with Undo. |
| N-105 | keep | HOLDS | D/W D/340L | As N-050. |
| N-128 | keep | HOLDS | D/W D/340L | As N-050. |
| N-056 | AL-NUMBERS-SOURCE-007 | STILL OPEN | D, Sc | Showcase Walk: "8,000 / 8,000 steps … from your activity log · 8,800 steps". Own water habit: 2,000 vs 2,250 mL. |
| N-086 | AL-NUMBERS-SOURCE-007 | STILL OPEN | Sc | As N-056 (same root: the auto note keeps another number). |
| BUG-005 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| BUG-081 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| N-051 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |
| N-113 | AL-FIRST-RUN-005 | OWNER DECISION (agreed, F) | W 340L/D | A Habits + Health user still sees "YOUR FINANCIAL ORBIT … = Tomorrow's Wealth". The Today hero and slogan are PROTECTED (F). |
| BUG-067 | AL-FIRST-RUN-005 | OWNER DECISION (agreed, F) | W D | As N-113: hero unchanged (PROTECTED, F). Goal tiles are gone (NB-041). |
| N-046 | AL-FIRST-RUN-005 | OWNER DECISION (agreed, F) | W D | As N-113. |
| N-001 | keep | HOLDS | D/W D/340L | First Settings click navigates. |
| N-178 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| N-168 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-036 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-035 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-202 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-175 | AL-A11Y-026 | OTHER LANE (L10b) | — | AL-A11Y-026 is in lane L10b; not replayed here. |
| N-064 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| BUG-055 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| N-021 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| N-020 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| N-066 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| BUG-059 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| N-019 | keep | L7 | — | ZIGi/NOVA positive; L7 replays it. |
| BUG-054 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| N-063 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| BUG-057 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| N-018 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| N-075 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| N-010 | AL-AI-FACTS-005 | OTHER LANE (L7) | — | AL-AI-FACTS-005 is in lane L7; not replayed here. |
| BUG-056 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| BUG-060 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| N-065 | AL-AI-FACTS-009 | OTHER LANE (L7) | — | AL-AI-FACTS-009 is in lane L7; not replayed here. |
| N-022 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-067 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-038 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-085 | AL-NUMBERS-SOURCE-014 | OTHER LANE (L7) | — | AL-NUMBERS-SOURCE-014 is in lane L7; not replayed here. |
| N-181 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-078 | AL-CONFIRM-DELETE-004 | FIXED | DL | As NB-223. |
| N-150 | AL-FIELD-ERROR-009 | FIXED | DL | Duplicate title asked once (NB-177). |
| N-015 | AL-NUMBERS-SOURCE-007 | FIXED | D | Health → habit auto-complete works for water (NB-199). |
| N-169 | AL-NUMBERS-SOURCE-007 | FIXED | D | As N-015. |
| N-062 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-009 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-108 | AL-COPY-025 | FIXED | W D Chrome/Linux | Step 6 gives the browser's own words ("In Chrome or Edge on a computer, use Install…"), with one line for iPhone; no iPhone step-by-step guide on desktop. |
| N-107 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| N-109 | AL-QUICK-ADD-002 | FIXED | W D | Quick add shows no Health tile when Health is hidden (NB-240). |
| N-002 | AL-COPY-056 | OTHER LANE (L6) | — | AL-COPY-056 is in lane L6; not replayed here. |
| N-170 | keep | NOT REPLAYED | — | Positive not exercised in this replay. |
| N-011 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-071 | — | NOT REPLAYED | — | An old id with no text (the bot did not retest it); the related NB-076, PR-061 and PR-093 rows are above. |
| BUG-082 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-069 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-085 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-087 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-163 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-001 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-002 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-003 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-005 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-007 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-010 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-016 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-011 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-014 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| H-015 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-072 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-090 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-171 | — | STILL OPEN | 1440 fresh, Sc | No "Supports: <goal>" line on the linked habit's card (only a "Goal linked" filter exists). |
| N-104 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-062 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-115 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-119 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-129 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-172 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-190 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-094 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-203 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-016 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-055 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-186 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| BUG-052 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-045 | — | FIXED | W D | Leaving /app/welcome at once by Today: no "Step 1 of 8" text on Today. |
| N-106 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-111 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-127 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| N-207 | — | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |

### Competitor items (C-NB)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| C-NB-01 | AL-COMPETITOR-GAP-099 | OWNER DECISION (agreed, F) | — | Agreed: F "the locked ZIGi look". |
| C-NB-02 | AL-COMPETITOR-GAP-100 | NOT REPLAYED | — | Lane: "Already exists" (goal why + if-then plan); not an onboarding step, not checked in UI. |
| C-NB-03 | AL-COMPETITOR-GAP-101 | WAITS ON OWNER (agreed, G) | — | Agreed: push activation is an owner step (AL_SCOPE G; STATUS:259). Per-habit reminder times exist. |
| C-NB-04 | AL-COMPETITOR-GAP-102 | FIXED | W D, game off | First tick with the game layer off: "Your first step is logged. Day 1 of your streak." |
| C-NB-05 | AL-COMPETITOR-GAP-103 | FIXED | spec | al-third-first-run GAP-103 opens the ZIGi step and finds "Lv 1 · Spark"; nothing stored. |
| C-NB-06 | AL-PRICING-001 | OTHER LANE (L10a) | — | AL-PRICING-001 is in lane L10a; not replayed here. |
| C-NB-07 | AL-COPY-025 | FIXED | W D | As NB-022. |
| C-NB-08 | AL-PERSISTENCE-003 | CHANGED | W D | As NB-011: works in en-US, lost in en-GB. |
| C-NB-09 | AL-FIRST-RUN-002 | FIXED | W D | As NB-002. |
| C-NB-10 | AL-COMPETITOR-GAP-104 | NOT REPLAYED | — | beforeinstallprompt cannot fire in headless Chrome; Step 6 shows the browser's own steps. |
| C-NB-11 | AL-COMPETITOR-GAP-105 | REASON CITED, NOT BUILT | — | Lane: Routines (ordered steps with a stepper) stand in; no subtasks inside one habit. |
| C-NB-12 | AL-COMPETITOR-GAP-097 | OWNER DECISION (agreed, F) | — | Agreed: F accountability partners / friends: not now. |
| C-NB-13 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | Agreed: F home-screen widgets and native apps: Beta. |
| C-NB-14 | AL-COMPETITOR-GAP-174 | OTHER LANE (L7) | — | AL-COMPETITOR-GAP-174 is in lane L7; not replayed here. |
| C-NB-15 | AL-COMPETITOR-GAP-098 | FIXED | D fresh, empty Habits | The empty Habits page links "Bring your habits and their history →" to /app/settings#switch-import. |
| C-NB-16 | none (retracted) | OUT OF SCOPE | — | Bot did not retest it and filed no #53 defect. |
| C-NB-17 | AL-COMPETITOR-GAP-106 | NOT REPLAYED | — | Freeze rule shown on Journey; using a freeze needs a seeded streak + gap (not reproduced). |
| C-NB-18 | AL-NUMBERS-SOURCE-007 | FIXED | D | Water is linked to the habit (NB-199). |
| C-NB-19 | AL-COMPETITOR-GAP-107 | FIXED | D | "TODAY'S RHYTHM 1 / 3 scheduled habits complete" on Habits. |
| C-NB-20 | AL-COMPETITOR-GAP-084 | WAITS ON OWNER (agreed, G) | — | As C-NB-03. |
| C-NB-21 | AL-COMPETITOR-GAP-093 | FIXED | D/Sc | Card steppers (+5 min) and a working Duration timer in Details. |
| C-NB-22 | AL-CONFIRM-DELETE-004 | FIXED | D | Skip, pause and undo are in the ⋯ menu and toasts. |
| C-NB-23 | none (present) | HOLDS | D | Quit and limit habits exist. |
| C-NB-24 | AL-COMPETITOR-GAP-095 | FIXED | D | Routine templates (Morning, Evening, Workout, Focus, Study, Weekly reset) and "Guided journeys →". |
| C-NB-25 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | As C-NB-13. |
| C-NB-26 | AL-COMPETITOR-GAP-086 | FIXED | D | Note "Calm morning walk" on a check-in → "Your notes and moods" fold → search "calm" → "1 of 1 reflection match. 4 Nov 2026 · Journal". |
| C-NB-27 | AL-NUMBERS-SOURCE-007 | NOT POSSIBLE (agreed) | D | Default part fixed (NB-199). Outside sources: agreed, F "no fake integrations". |
| C-NB-28 | AL-TIMEZONE-002 | REASON CITED, NOT BUILT | — | Lane: a day-boundary change is TIER 3 and needs its own owner-approved part (not an F/O decision). |
| C-NB-29 | AL-COMPETITOR-GAP-096 | FIXED | D | "As a 30-day challenge" on each idea. |
| C-NB-30 | AL-COMPETITOR-GAP-098 | FIXED | D | As C-NB-15. |
| C-NB-31 | AL-COMPETITOR-GAP-109 | NOT REPLAYED | — | Agenda calendar export (L5) not checked. |
| C-NB-32 | AL-COMPETITOR-GAP-097 | OWNER DECISION (agreed, F) | — | As C-NB-12. |
| C-NB-33 | AL-COMPETITOR-GAP-174 | OTHER LANE (L7) | — | AL-COMPETITOR-GAP-174 is in lane L7; not replayed here. |
| C-NB-34 | AL-COMPETITOR-GAP-110 | OWNER DECISION (agreed, F) | — | Agreed: F native apps: Beta. |
| C-NB-35 | AL-COMPETITOR-GAP-105 | REASON CITED, NOT BUILT | — | As C-NB-11. |
| C-NB-36 | AL-COMPETITOR-GAP-111 | L7 | — | ZIGi companion (L7). |
| C-NB-37 | AL-COMPETITOR-GAP-112 | NOT POSSIBLE (agreed) | — | Agreed: a web app cannot geofence or ring alarms in the background. |

### Copy / UX notes (N-NB)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-NB-01 | AL-COPY-025 | STILL OPEN | W D | Still four skip wordings: "Continue without choosing", "Skip the tour", "Skip setup", "Not now". Lane keeps them as different actions; that is not an F/O decision. |
| N-NB-02 | AL-COPY-025 | STILL OPEN | W D | Preview "You'll see: Today, Goals, Habits, Wealth, Activity, Settings." The nav then also shows Checklist (and the Apps group), which the preview never names. |
| N-NB-03 | AL-THEME-006 | OTHER LANE (L10a) | — | AL-THEME-006 is in lane L10a; not replayed here. |
| N-NB-04 | AL-PLURALS-003 | OTHER LANE (L10b) | — | AL-PLURALS-003 is in lane L10b; not replayed here. |
| N-NB-05 | AL-PLURALS-003 | OTHER LANE (L10b) | — | AL-PLURALS-003 is in lane L10b; not replayed here. |
| N-NB-06 | AL-ROUNDING-003 | FIXED | DD | Status line "Today 250 mL water", same as the tile. |
| N-NB-07 | AL-ROUNDING-003 | FIXED | DD | 750 mL then "1,000 mL" on the tile and the status line (no switch to L). |
| N-NB-08 | AL-COPY-032 | NOT POSSIBLE (agreed) | D | Water still shows in the focus tile, the status line and the habit row. Agreed: the focus tile carries the water shortcut (components/shortcut-host.tsx:22). The units now agree (N-NB-06). |
| N-NB-09 | AL-PLURALS-003 | FIXED | W D | "Your last setup is still fresh. 2 habits can be taken back for a day." |
| N-NB-10 | AL-ROUNDING-002 | OTHER LANE (L2) | — | AL-ROUNDING-002 is in lane L2; not replayed here. |
| N-NB-11 | AL-TIMEZONE-002 | REASON CITED, NOT BUILT | W D 01:28 | Both setup habits are in ANYTIME, completable at 01:30. Day-boundary rule: Later (TIER 3), not built. |
| N-NB-12 | AL-LAYOUT-375-008 | FIXED | 375, 300 | At 375 Next step and Water share a row and Sleep is full width; at 300 all are full width. |
| N-NB-13 | AL-A11Y-013 | FIXED | 340L | The − and + buttons are 48×48 with a 1 px border. |
| N-NB-14 | AL-A11Y-013 | FIXED | DL | Sort is a native <select> (Your order, Due first, Name, Longest streak, Newest first). |
| N-NB-15 | AL-COPY-056 | OTHER LANE (L6) | — | AL-COPY-056 is in lane L6; not replayed here. |
| N-NB-16 | AL-HELP-002 | OTHER LANE (L6) | — | AL-HELP-002 is in lane L6; not replayed here. |
| N-NB-17 | AL-A11Y-023 | OTHER LANE (L7) | — | AL-A11Y-023 is in lane L7; not replayed here. |
| N-NB-18 | AL-PERF-003 | FIXED | DL | Pause → toast in 98 ms. |
| N-NB-19 | AL-CONFIRM-DELETE-004 | FIXED | DL | The archive confirm is in the viewport, next to the menu. |
| N-NB-20 | AL-COUNTS-006 | FIXED | DL | Radios sit beside their labels (dx −20, dy −3). |
| N-NB-21 | AL-DISCOVERABILITY-001 | STILL OPEN | DL | Type, Measurement and Target are still under "More options" (lane cites AK owner decision 5 / FR-17, which is not in AL_SCOPE F/O). |
| N-NB-22 | AL-COPY-031 | FIXED | 340L | Read card shows "+5 min". |
| N-NB-23 | AL-COPY-034 | OTHER LANE (L4) | — | AL-COPY-034 is in lane L4; not replayed here. |
| N-NB-24 | AL-LAUNCHER-OVERLAP-001 | OTHER LANE (L10a) | — | AL-LAUNCHER-OVERLAP-001 is in lane L10a; not replayed here. |

### Ids from other bots in L3 rows (Denver, Lisbon, Moscow, Professor, Tokyo, old ids)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| D-045 | AL-CONFIRM-DELETE-004 | FIXED | Nebula 1440 fresh | Same-day delete works (NB-135); archive toasts with Undo. |
| D-204 | AL-CONFIRM-DELETE-004 | FIXED | D | Same-day delete works. The ~500 px grid hole at 1920 was not measured. |
| LS-H32 | AL-CONFIRM-DELETE-004 | FIXED | D | Archive with a check-in says "it leaves your lists tomorrow"; with nothing recorded, "archived today". Both are stated on the card and in the toast. |
| N-LS-04 | AL-CONFIRM-DELETE-004 | FIXED | D | Archive toast with Undo. |
| MO-124 | AL-CONFIRM-DELETE-004 | FIXED | D | No stale "Habit created." in the page status. Archive toast plus a pending "Scheduled change … archived" line on the card. |
| B-163 | AL-NUMBERS-SOURCE-007 | STILL OPEN | Sc | As D-220. |
| D-220 | AL-NUMBERS-SOURCE-007 | STILL OPEN | Sc | Walk 8,000 on the card vs 8,800 in its note. |
| B-189 | AL-STREAKS-001 | FIXED | Sc | Exercise Consistency: "○ 3 skipped", Month 26/26 100 %, "skipped and rest days don't count". |
| B-190 | AL-STREAKS-001 | FIXED | Sc | No "Day 0/0 0%": Week 5/5, Month 26/26. |
| D-232 | AL-STREAKS-001 | FIXED | Sc | Finished Read (30/30) Details shows "Duration timer · Start timer", not a paused 25:00 with Finish. |
| MO-125 | AL-STREAKS-002 | FIXED | D 04:00 | Weight 80.5 → "Weigh in" auto ✓ Done → remove the weight → toast "Weigh in is open again: the Health entry that ticked it off was removed." → 0/1 Due after reload. |
| LS-036 | AL-STREAKS-003 | FIXED | 375D, Mon 2 Nov | The planet goes from "0 of 2 this week: not done yet" to "1 of 2 this week: done" on the first tap. |
| PR-010 | AL-STREAKS-003 | STILL OPEN | Sc 01:26 | Unchanged: "Current streak 26 days" beside today's "15 / 30 minutes · Partial", with no word that today is still open. |
| PR-061 | AL-STREAKS-003 | STILL OPEN | D | After Complete on a 3×/week habit: "1 / 1 time today … Partial" and Complete is still active. |
| PR-093 | AL-STREAKS-003 | STILL OPEN | D | Limit 3×/week, qty 2: the card still reads "0 / 2 times today" for a weekly limit. |
| LS-041 | AL-UNDO-002 | FIXED | D | Quick add "drank 2 glasses of water" → Save → "Saved: Water · 500 mL · today Undo". |
| LA-019 | AL-UNDO-002 | NOT REPLAYED | — | ZIGi composer Save (AI path, L7) not exercised. |
| LZ-027 | AL-UNDO-002 | NOT REPLAYED | — | As LA-019. |
| DV-023c | AL-XP-BADGES-001 | NOT REPLAYED | — | A history-only record (backdated contribution) was not reproduced. |
| DV-023d | AL-XP-BADGES-001 | FIXED | D G | As NB-203. |
| DV-045d | AL-XP-BADGES-001 | NOT REPLAYED | — | As DV-023c. |
| G-045 | AL-XP-BADGES-002 | NOT REPLAYED | — | Hall of achievements not checked (bot NOT RETESTED). |
| M-047 | AL-XP-BADGES-002 | HOLDS | D G | Finishing DoneProj shows "Completed 100 % · MILESTONES COMPLETED". |
| M-140 | AL-XP-BADGES-002 | STILL OPEN | D G | The level-up exists but blocks the next page (DV-118). |
| G-031 | AL-XP-BADGES-002 | STILL OPEN | D G | A full-screen card on page open (Activity) with focus on Lovely. |
| T-039 | AL-XP-BADGES-002 | CHANGED | D G | Celebrations wait while typing and on the goal page itself, then open on the next page; there is still no interstitial-free rule for logging flows. |
| D-246 | AL-XP-BADGES-002 | FIXED | Sc | Journey says "13 assets tracked" (not "accounts"). The Health "Lit today" part was not checked. |
| TK-210 | AL-LAYOUT-375-007 | FIXED | 375 | As TK-224. |
| TK-224 | AL-LAYOUT-375-007 | FIXED | 375×812 fresh+crypto, Showcase+crypto | scrollWidth 375 with the PUBLIC ALPHA banner. Only decorative hero-star layers extend past the edge, and they are clipped. (L1 replay on 5848c55c saw 468 px; not seen on c521574f.) |
| DV-154 | AL-A11Y-010 | FIXED | D | Card ⋯ → Edit widget opens the editor with "Title and display size". |
| DV-155 | AL-A11Y-010 | STILL OPEN | D | Card names are unique, but the move list still says "Health metric", "Widget summary", and two "Daily Habits". |
| T-012 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | As C-DVG-07. |
| C-DVG-07 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | Agreed: F widgets/watch: Beta. |
| C-DVG-21 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | As C-DVG-07. |
| C-DVG-77 | AL-COMPETITOR-GAP-083 | OWNER DECISION (agreed, F) | — | As C-DVG-07. |
| T-021 | AL-COMPETITOR-GAP-084 | WAITS ON OWNER (agreed, G) | — | As C-NB-03 (complete/snooze from the notification needs push). |
| C-DVG-27 | AL-COMPETITOR-GAP-084 | WAITS ON OWNER (agreed, G) | — | As C-NB-03. |
| DV-186a | AL-COPY-026 | FIXED | DL | "…you can restore it later, or delete it for good from Archived." |
| DV-187 | AL-COPY-026 | CHANGED | DL | The name match ignores case and the hint says so. The text is still about 70 words, and "Only an unnamed placeholder stays…" still sounds as if something is kept. |
| DV-129 | AL-COPY-027 | FIXED | DL | A Yes/no habit shows only "Complete" (no −/+). |
| DV-131 | AL-COPY-027 | FIXED | DL | Quit card: "0 slips today · On track so far · Stayed on track"; no "Complete" beside it. |
| D-100 | AL-COPY-028 | FIXED | DL | The Vacation button has aria-expanded; the panel explains itself and the result is said (NB-067). |
| D-007 | AL-COPY-028 | FIXED | DL | The form opens in view with 7 fields before More options. |
| D-040 | AL-COPY-028 | FIXED | DL | Templates: Walk, Exercise, Drink water, Read, Study, Review budget, My savings plan, No-spend day. |
| D-044 | AL-COPY-028 | STILL OPEN | DL | A schedule edit still starts tomorrow by default ("Scheduled change from 5 Nov… Today keeps its current rule"). It is now said, but the row asks for changes that start today. |
| D-107 | AL-COPY-028 | NOT REPLAYED | — | The Details "◈ Area" value was not checked. |
| DV-132 | AL-COPY-028 | CHANGED | DL | Quit now explains "A quit habit has no target". Type, measure and target are still folded under More options (cited owner decision 5, not in F/O). |
| DV-188b | AL-COPY-028 | NOT REPLAYED | — | The Edit form's Health rule radios were not measured. |
| DV-188c | AL-COPY-028 | FIXED | DL | Cancel with an edited title → "Discard changes" asked first. |
| DV-242 | AL-COPY-028 | CHANGED | DL | Quit hides Target value and period; Measurement and Unit fields remain. |
| DV-243 | AL-COPY-028 | CHANGED | DL | More options now starts with Habit type; it is still folded. |
| DV-057c | AL-COPY-029 | FIXED | D, Sc | "Your first asset starts here" appears at most once. |
| D-106 | AL-COUNTS-004 | FIXED | Sc | Showcase: "4 of 7 habits" everywhere; the Checklist says "2 of 5 planets today" (its own path). |
| D-239 | AL-COUNTS-004 | FIXED | D, Sc | As LS-024; the Checklist count says planets (O6, PROTECTED path). |
| LS-024 | AL-COUNTS-004 | FIXED | D 04:00 | Read done, Walk and Weekly review open: Today "1 of 3 habits", Daily Habits "1 of 3", Habits "1 / 3 scheduled habits complete". |
| LC-014 | AL-COUNTS-004 | FIXED | D | As LS-024. |
| X3-10 | AL-COUNTS-004 | FIXED | D | Habits ring 33 % beside "1 of 3 habits". |
| PR-094 | AL-DATES-005 | FIXED | DL, Sc | A new habit's start is 2026-11-04 (fresh and Showcase). |
| MO-161 | AL-FIELD-ERROR-007 | FIXED | D G | Prices −5 and 0 → "Enter a price of 1 point or more." under Points, with focus; Goals has "Your rewards shelf →". |
| N-MO-27 | AL-FIELD-ERROR-009 | FIXED | DL | As NB-053: the message names the field. |
| DV-024a | AL-FIRST-RUN-003 | FIXED | D, 5 goals | Today's focus "NEXT STEP · G1 · Next: set a contribution plan". |
| DV-024b | AL-FIRST-RUN-003 | STILL OPEN | D | "Daily Habits is hidden from Today." while it is visible; two exits remain, "Finish customizing" and "Done". |
| N-DV-14 | AL-FIRST-RUN-003 | FIXED | D | As DV-024a. |
| D-184 | AL-FIRST-RUN-004 | STILL OPEN | W D | "How it works" still uses arrow shorthand ("Goals → + Create a goal", "Habits → + New habit, then −/+ and Done…") and "Watch the film (16 s)". |
| DV-130 | AL-PLURALS-001 | FIXED | DL | Weekly card subtitle reads "3× per week" (no "1 time per week" repeat). |
| DV-241 | AL-PLURALS-001 | FIXED | DL | "Each check-in counts 1 time; you aim for 3 check-ins a week." |
| BUG-017 | AL-STREAKS-004 | FIXED | 1440 fresh | As DV-028. |
| DV-028 | AL-STREAKS-004 | FIXED | 1440 fresh | After linking, "Add weekly Goal review habit" is gone, and the habit reads "Consistency: Not due yet this week". |
| X3-20 | AL-STREAKS-004 | FIXED | 1440 fresh | Today: "0 of 0 habits complete · Nothing is scheduled today" on a non-due day (no 0 %). |
| LS-033 | AL-STREAKS-005 | CHANGED | 375D Mon 2 Nov | "1-day streak" / "1 day streak" is now singular. List view still shows "0 of 1" then "0 of 1 complete" visibly, and no rule next to the flame (only in How it works). |
| LS-070 | AL-STREAKS-005 | STILL OPEN | 375D | No per-item streak in List view; the streak rule is only in "How it works". |
| C-LS-34 | AL-STREAKS-005 | STILL OPEN | 375D | No per-item streak in the Checklist List view (LS-070). |
| C-DVG-29 | AL-UNDO-003 | FIXED | D/Sc | Skip, pause and vacation are in the ⋯ menu and Details, each with Undo. |
| PR-044 | AL-UNDO-003 | FIXED | Sc 01:26 | Read → Skip → toast with Undo, then "Undo skip" on the card → back to Done. (Save day clearing a skip was not exercised.) |
| DV-023a | AL-XP-BADGES-003 | FIXED | Sc, D G | The popover says XP shows "on your Journey, with a small card at the bottom of Habits, Health, Wealth and Activity". The card is there ("No Habits quest today · 1 of 3 quests done"). |
| DV-023e | AL-XP-BADGES-003 | FIXED | Sc | Journey discovery in plain words ("DISCOVERY · STEPS AND SLEEP On days you walked…"). |
| DV-045e | AL-XP-BADGES-003 | CHANGED | Sc | The modal-like mid-page "Lovely" card is gone; the page is still 8,162 px tall. |
| DV-118 | AL-XP-BADGES-003 | STILL OPEN | D G | The level-up card blocks /app/activity on arrival and says "Every check-in and log you made brought you here", but the XP came from a goal. |
| TK-148 | AL-FIRST-RUN-008 | FIXED | D, one habit | With a record, "Make Today yours" sits after the data ("Your records are already on Today… either way this card goes away"). |
| N-TK-21 | AL-FIRST-RUN-008 | FIXED | D | As TK-148. |
| PR-045 | AL-PERSISTENCE-007 | FIXED | Sc | Details and History stay open after a +5 min on Read. |
| DV-159 | AL-ROUNDING-003 | FIXED | DD | As N-NB-07: the line and the card use one unit. |
| DV-156 | AL-TOAST-006 | FIXED | D | Saving a widget gives no "Day 1 of your streak" toast or live text. |
| PR-046 | AL-COMPETITOR-GAP-085 | FIXED | D | As C-PR-02. |
| C-PR-02 | AL-COMPETITOR-GAP-085 | FIXED | spec + D | The ⋯ menu has "Open its own page" (seen). Spec GAP-085 opens /app/habits?habit=… with History open and "← All habits". |
| N-TK-13 | AL-LAYOUT-375-008 | FIXED | 375 | As N-NB-12. |
| C-DVG-16 | AL-COMPETITOR-GAP-086 | FIXED | D | As C-NB-26. |
| C-DVG-19 | AL-COMPETITOR-GAP-087 | STILL OPEN | — | No "perfect day" backlog of past days; no status or reason in lanes/L3.md. |
| C-DVG-20 | AL-COMPETITOR-GAP-088 | STILL OPEN | — | No flexible day goal ("4 of 6 counts"); no status or reason in lanes/L3.md. |
| C-DVG-23 | AL-COMPETITOR-GAP-089 | NOT REPLAYED | — | NOVA "Your day" brief exists (lib/ai/proactive/brief.ts; L7); not run. |
| C-DVG-24 | AL-COMPETITOR-GAP-090 | FIXED | D | Quick add "Speak a line" (browser speech) and "Type a line" → items. |
| C-DVG-25 | AL-COMPETITOR-GAP-091 | FIXED | D | Customize Today: add, move, edit, hide widgets. |
| C-DVG-26 | AL-COMPETITOR-GAP-092 | FIXED | D | Streak on each card ("1 day streak"), 30-day grid, week grid. |
| C-DVG-28 | AL-COMPETITOR-GAP-093 | FIXED | D | As C-NB-21. |
| C-DVG-30 | AL-COMPETITOR-GAP-094 | FIXED | D | Quit and limit habits. |
| C-DVG-31 | AL-COMPETITOR-GAP-095 | FIXED | D | As C-NB-24. |
| C-DVG-32 | AL-COMPETITOR-GAP-096 | FIXED | D | Challenges exist ("As a 30-day challenge"). Leaderboards need people's data on a server: F, agreed. |
| C-DVG-33 | AL-COMPETITOR-GAP-097 | OWNER DECISION (agreed, F) | — | As C-NB-12. |
| C-DVG-34 | AL-COMPETITOR-GAP-098 | FIXED | D | As C-NB-15. |
| C-DVG-22 | AL-TIMEZONE-002 | REASON CITED, NOT BUILT | — | As C-NB-28. |

### ZIGi / NOVA prompts (L7)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| P1 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P2 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P3 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P4 | AL-AI-FACTS-005 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P5 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P6 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P7 | AL-NUMBERS-SOURCE-014 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P8 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P9 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P10 | AL-AI-SAFETY-006 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P11 | AL-AI-SAFETY-004 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P12 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P13 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P14 | AL-AI-FACTS-005 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P15 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P16 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P17 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P18 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P19 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P20 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P21 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P22 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P23 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P24 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P25 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P26 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P27 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P28 | AL-AI-STABILITY-004 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P29 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P30 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| P31 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N1 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N2 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N3 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N4 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N5 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N6 | AL-AI-SAFETY-004 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N7 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N8 | AL-AI-SAFETY-006 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N9 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N10 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N11 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N12 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N13 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N14 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N15 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N16 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N17 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N18 | AL-NUMBERS-SOURCE-014 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N19 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N20 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N21 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N22 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N23 | AL-AI-ACTIONS-007 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| N24 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T1 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T2 | AL-AI-FACTS-005 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T3 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T4 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T5 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T6 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T7 | AL-AI-FACTS-009 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T8 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| T9 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H1 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H2 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H3 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H4 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H5 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H6 | AL-AI-FACTS-005 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H7 | keep | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
| H8 | AL-AI-FACTS-008 | L7 | — | ZIGi/NOVA prompt; L7 replays it. |
## STILL OPEN / CHANGED — exact steps for the lane

Common setup: Chrome, a fresh context, `Europe/Brussels`, clock 4 Nov 2026 before 07:00, unless stated.

1. **NB-011 / C-NB-08 (CHANGED, MAJOR): the setup draft is lost in en-GB.**
   - Steps: `locale: en-GB` (any zone, live API or `/api` 503) → /app/welcome → Let's begin → Habits → Continue → tick Read more → F5.
   - Result: back on "Welcome to ZIGoals." with nothing ticked. `zigoals:welcome-draft:v1` now holds `{"step":"welcome","pillars":[]…}`. In en-US the same steps keep Step 3, which is why `nb-011-wizard-draft.spec` passes.
   - Likely cause: in `onboarding-flow.tsx:181–186` the write effect runs in the same commit as the restore effect and saves the initial state. A remount right after (a locale-dependent first render) then reads that state.
2. **NB-072 / NB-074: the ideas panel opens off-screen.** Steps: DL → Habits → + New habit → "Start from an idea". The panel's top is at 1356 px in an 800 px window, focus stays on the button, and nothing scrolls.
3. **NB-092 / DV-024b / NB-220 / DV-155: Arrange mode.** Steps: D, one habit → Today → Customize Today.
   - "Daily Habits is hidden from Today." sits above the live Daily Habits card.
   - "Watchlist is hidden with its page…" shows for a widget this profile never had.
   - The arrows read "Move Health metric up" and "Move Widget summary up", and "Move Daily Habits" appears twice.
   - Two exits remain: "Finish customizing" and "Done".
4. **DV-118 / M-140 / G-031 (T-039 CHANGED): the level-up blocks the next page.**
   - Steps: G, a project goal with 7 of 8 milestones ticked → tick the 8th → open Activity.
   - Result: a full-screen "LEVEL UP · Level 2 · Ember — Every check-in and log you made brought you here … Lovely" blocks Activity on arrival. The copy names check-ins, but the XP came from the goal.
5. **PR-061 / PR-093 (NB-076 / NB-158 / H-008 CHANGED): X-per-week cards.**
   - Steps: D → new habit, Schedule "X times per period" 3/week → Complete.
   - Result: "1 / 1 time today · 1 of 3 this week · Partial", and Complete stays active. Before the tick it reads "0 / 1 time today … Due".
   - Limit 3/week, qty 2: the card says "0 / 2 times today".
6. **N-056 / N-086 / D-220 / B-163 (NB-082 / NB-142 / NB-200 CHANGED): the auto-tick note keeps another number.**
   - Showcase Walk reads "8,000 / 8,000 steps … from your activity log · 8,800 steps".
   - Own data: log 2 L, create "Drink water" from the template, then add 250 mL. The card says "from your water journal · 2,000 mL" while Today and Health say 2,250 mL.
7. **NB-201 (CHANGED):** the form's "Done automatically when" now works. But "Auto-complete rules · Set up rules" is still a second automatic setting with the same promise.
8. **N-171:** a goal's linked "Review …" habit shows no "Supports: <goal>" line on its card (fresh 1440 and Showcase).
9. **PR-010:** Showcase Exercise shows "Current streak 26 days" next to today's "15 / 30 minutes · Partial", with no word that today is still open.
10. **D-044:** an edit's schedule change still starts tomorrow by default ("Scheduled change from 5 Nov … Today keeps its current rule"). The row asks for changes that start today.
11. **D-184:** Today → See how it works. The text still reads "Goals → + Create a goal", "Habits → + New habit, then −/+ and Done…" and "Watch the film (16 s)".
12. **N-NB-02:** Step 2's preview "You'll see: Today, Goals, Habits, Wealth, Activity, Settings." never names Checklist, which then shows in the nav.
13. **N-NB-01 / NB-234 (CHANGED):**
    - Four skip wordings remain ("Continue without choosing", "Skip the tour", "Skip setup", "Not now").
    - "STEP n OF 8" shows on content-only steps.
    - At 1280×800, Finish setup is at y 1006, below the fold.
14. **NB-006:** setup has no optional "what should ZIGi call you" (lane: Later; not an F/O decision).
15. **N-NB-21 / DV-132 / DV-243 / DV-242 (CHANGED):**
    - Habit type, Measurement and Target are still under "More options". The habit type now comes first there.
    - A quit habit still shows Measurement and Unit.
    - The cited "owner decision 5" is not in AL_SCOPE F/O.
16. **NB-033 (CHANGED):** on the empty Today after "Not now", three primary buttons compete ("+ Quick add", "Start setup", "Plan my first goal →"), plus "See how it works".
17. **NB-019 (CHANGED):** the tour describes "+ Quick add" but does not highlight it. Next is stable and Back exists now.
18. **NB-052 (CHANGED):** Journey draws four planets for a Habits + Health + Chess user, with a note. Chess still has none.
19. **NB-241 (CHANGED):** Undo setup toasts what it removed, but page choices are not restored, only pointed to.
20. **NB-177 (CHANGED):** a 200-character title paste is cut to 100 with no message. The duplicate-name question works.
21. **NB-133 (CHANGED):** the ⋯ menu has Pause and Delete but no Duplicate.
22. **NB-071 (CHANGED):** the History calendar cells are still 119 px tall (781 px calendar). The pre-start hint is fixed.
23. **DV-187 (CHANGED):** the delete-for-good text is still about 70 words, and "Only an unnamed placeholder stays…" still reads as if something is kept. The case-insensitive match is fixed.
24. **DV-045e (CHANGED):** the Showcase Journey page is 8,162 px tall. The mid-page modal-like card is gone.
25. **LS-033 / LS-070 / C-LS-34:**
    - Checklist List view (375 Dark) shows "0 of 1" then "0 of 1 complete" visibly.
    - The streak rule is only in "How it works", not by the flame.
    - There is no per-item streak.
26. **C-DVG-19 / C-DVG-20:** no "perfect day" backlog of past days and no flexible day goal. Neither row has a status or a reason in `lanes/L3.md`.
