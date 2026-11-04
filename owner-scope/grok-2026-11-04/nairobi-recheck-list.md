# Nairobi recheck list — Nov 4 2026 run (Habits · Today · home widgets · Journey/XP · onboarding · ZIGi)
Sources: /workspace/zigoals/bugs.md (status from its 2026-10-21 re-test table; FIXED / NOT REPRODUCED excluded), testrun-2026-10-21/nairobi.md (N-001..N-207, N-127 retracted, N-111 fixed and excluded), feature-gap-2026-10-26/nairobi-parts/zigoals-habits-verified.md (H-001..H-016).
Mark each line FIXED / STILL OPEN / CHANGED. Retest from a CLEAN app; seed your own habits first (BUG-0xx/N-xxx entries were found on Showcase data).
Format: old ID | area | one-line repro | expected

## Habits (46 lines)
### MAJOR
- N-005 | Habits | Quantity habit "Walk 8k steps" (8000) → tap "+" | step size or typed value, not +1 per tap
- N-015 / N-169 | Habits↔Health | Log 13,000 steps in Health; own "Walk 8k steps" habit | habit offers/auto-uses Health steps; not 0/8,000 Due
- N-134 | Habits/Routines | Routines → Workout routine → Start → "Done · next" ×3 within 15 s | steps count only real minutes (not 5/5 min done in 0 min); template name kept
- N-162 | Habits/History | Details → History → past day 10 of 30 → Save day | shows "Partial", not "Failed"; field labelled "Minutes"
### MINOR
- BUG-026 | Habits/Create | Create habit with whitespace-only title | inline error at the field, not generic text ~600px below
- BUG-070 / N-061 | Habits/Archive | Create habit, then Archive/Delete same day | archive/delete works today (or clear toast + Undo); Delete reachable
- BUG-071 | Habits/Schedule | Edit → "X times per period" = 4 → Save | banner reflects 4×/period; target period unchanged
- BUG-077 | Habits/Create | Fill new-habit form, reload | draft kept or unsaved-changes warning
- BUG-082 | Habits/Streaks | Leave a scheduled day unlogged | stats and History calendar agree (both show failed/missed)
- N-014 | Habits/Streaks | Create + complete a habit today | "1 day" streak on card and in Consistency
- N-056 / N-086 | Habits/Steps | Compare Walk caption, Walk value, own step habit, toast, Health steps | one steps number everywhere
- N-069 | Habits/mobile | Un-complete a habit at 375px | instant repaint + "Marked not done · Undo" toast
- N-078 | Habits/Archive | Archive a habit, read card | "Archived from <date>", not "Scheduled change … archived"
- N-079 / N-088 | Habits/Card menu | Open ⋯ on a habit card | Archive/Pause/Delete in one consistent place (⋯)
- N-085 | Habits/Exercise | Exercise → Set value 45 | optional activity-type tag
- N-087 | Habits/Values | Exercise at 15/30 → type 45 → Set | clear "replace / add" labels; undo toast
- N-112 | Habits/Water | Drink water (L) habit → "+" | adds a glass/250 mL, not 1 L
- N-163 | Habits/Streaks | Look at Best streaks chips + cards | per-card streak number; ties distinguishable
- H-001 | Habits/Create | Done automatically = Steps, Target 5000 → Create | rule target prefilled or error points at the field
- H-004 | Habits/Pause | Pause habit | option to pause from today; wording says when it starts
- H-006 | Habits/Ideas | Habits page at 1920px | "Habit ideas" button visible on desktop too
- H-007 | Habits/Reminders | Save quiet hours 22:00–08:00 explicitly, past reminder time at night | reminder hidden as with factory default
- H-008 | Habits/Weekly | 3×/week habit card | "0 / 3 this week", not "0 / 1 time today"
- H-012 | Habits/Streak freeze | Journey → Streak repair → Use a freeze | freeze count decrements; earn/refill rule; undo
- H-013 | Habits/Timer | Duration habit timer → read count | rounded seconds/0.1 min, not 9 decimals
### POLISH
- BUG-024 | Habits/Vacation | Vacation 7 days incl. today | confirm count = days actually marked (INCONCLUSIVE last time)
- BUG-044 / N-091 | Habits/Journey | Compare header check-ins vs backup preview vs Journey | same number or labelled window
- BUG-064 | Habits/List | Habits list with many habits | sort control (and pagination)
- BUG-072 | Habits/Water auto | Water auto-habit with empty mL threshold → Create | error names the mL field (INCONCLUSIVE)
- N-038 | Habits/Backfill | Backfill a day before creation | clear explanation or allowed start-date choice
- N-052 | Habits/Create | 120-char title | counter, no silent cut at 100
- N-062 / H-009 | Habits/mobile | Filter chips at 375–500px | edge fade/arrow; no clipped "Afte…"
- N-089 | Habits/Calendar | 30-day calendar cells | shade by check-ins, tooltip
- N-090 | Habits/Water form | Water habit form, bad mL | inline layout, field-level error
- N-096 | Habits/Reminder | Create habit with reminder 21:00 | card shows bell + "21:00"
- N-150 | Habits/Create | Create same title twice; target 999,999,999 | duplicate warning; soft cap
- N-164 | Habits/Schedule | Selected weekdays, none ticked → Create | require choice or show defaults ticked
- N-171 | Habits/Linked goal | Link habit to a goal | "Supports: <goal>" chip on card
- H-002 | Habits/Auto unit | Auto source = Steps | unit switches to steps, not "times"
- H-003 | Habits/Reminders | Reminder suppressed by quiet hours | "Reminders paused until 8:00" line
- H-005 | Habits/Routine 500px | Start Read routine at 500px | title doesn't collide with controls
- H-010 / H-016 | Habits/ZIGi overlay | Habit cards at ≤500px, light theme | ZIGi bubble doesn't cover Details row; star readable
- H-011 | Habits/Tap targets | Reminder on/off checkboxes | ≥44px tap area
- H-014 | Habits/Timer | Start timer, read immediately | never negative minutes
- H-015 | Habits/A11y | "Finish" button accessible name | name includes "Finish"
- N-104 | Habits/Portfolio | Record a trade note | ticks "Journal my trades" (idea)

## Today page (16 lines)
### BLOCKER
- N-178 | Today/Start page | Settings → Start page = Goals → click sidebar Today | Today renders; /app reachable
- N-050 / N-105 / N-128 | Today/Water | Fresh profile → Today → "Add 250 mL" (click + Enter) | +250 mL, toast w/ Undo; no raw Zod JSON
### MAJOR
- N-113 / BUG-067 / N-046 | Today/First screen | Fresh user opens /app | no Keplr/1,000 ZIG/staking jargon or "Demo records" before opt-in
### MINOR
- BUG-062 | Today/Goals counts | Compare Today completed/active vs Goals filters | same counts
- BUG-085 / N-181 | Today/Wealth | Compare Today tracked wealth vs Wealth net worth vs ZIGi | same or clearly labelled
- BUG-005 / BUG-081 / N-051 | Today/mobile | Today at 320–375px real window | ZIGi button covers no tiles/banner (closed headless; still seen in real windows)
- N-115 | Today/A11y | Accessibility tree near "+ Quick add" / journey card | no unnamed button/link
- N-119 / N-129 / N-172 | Today/Status region | Load Today | no stale "Undone · won't be ticked off" message
- N-170 / N-011 | Today/Activity feed | Create a goal, check feed | own events not tagged "Showcase example"
- N-190 | Today/Toast | Trigger an error toast by keyboard | toast reachable; Esc dismisses
- N-094 | Today/Weekly review | Weekly review step 6 | empty or my last intention, not showcase text
- N-203 | Today/ZIGi launcher | Click small ZIGi control | confirm before hide; Undo restores fully
### POLISH
- N-016 / N-055 | Today/Totals | Watch totals with no action | timestamp/explanation for moves
- N-186 | Today/Habit row A11y | Tab to −/+ on Today habit row | labels include habit name (partly fixed)
- BUG-052 | Today/Perf | Cold load / and /app | TTFB <1s; no 358KB idle ZIGi animation
- N-001 | Today/Nav | Click sidebar Settings right after load | navigates first time

## Home widgets (Your whole life / coach) (4 lines + note)
- N-168 | Widget/Health ring | Log 5,460 kcal vs 2,200 target → Your whole life | ring flags overshoot, not 100% (MAJOR)
- N-036 | Widget/Care ring | 3,850 kcal vs 2,200 | not "Care for your day 100%" (MINOR)
- N-035 | Widget/Coach | Compare kcal target/estimate/coach | one explained number (MINOR)
- N-202 | Widget/Health ring | Log food without kcal | dashed/needs-data ring, not 0% (MINOR)
- N-181 note: see Today; also add every new widget to the retest (not in old reports)

## Journey / XP / gamification (2 lines + cross-ref)
- N-175 | Journey/A11y | Journey accessibility tree | no unnamed 22px checkbox (MINOR)
- (H-012, BUG-044/N-091 listed under Habits — also check from Journey)
- N-163 XP check | Journey | Set past day 0 then back | XP/streak recompute (was correct — confirm still OK)

## Onboarding / first run (6 lines)
- N-109 | Onboarding | Welcome: pick only Habits + Health | Goals still reachable via search/Quick add (MAJOR)
- N-045 | Onboarding | Start setup → leave via sidebar quickly | no stale "Step 1 of 8" shell (MINOR)
- N-106 | Onboarding | Go through welcome steps | each step opens at its heading, focus moved (MINOR)
- N-107 | Onboarding | Step 4 with Walk + Water ticked | matching targets preselected (POLISH)
- N-108 | Onboarding | Home-screen step on desktop Chrome | platform-correct instructions (POLISH)
- N-002 | First run/Settings | Settings demo controls on clean app | clear Load/Loaded state (POLISH)

## ZIGi asked from Habits/Today (16 lines)
### MAJOR
- BUG-054 / N-063 | ZIGi | "How far am I on my goals?", "did I sleep enough?", "which goals do i have" | real answer, not canned help
- BUG-057 / N-018 / N-075 | ZIGi | "how much water did i drink today" | answer, no write preview
- N-010 | ZIGi | "Explain my P&L" | explanation or "not connected", no "Will save: Water"
- N-019 | ZIGi/Settings | Look for "Include Health" | visible without picking a connection
- N-022 | ZIGi | "Summarise my day" with a connection chosen | in-app answer too
- N-066 | ZIGi | Ask ETH holdings; compare Wealth/Portfolio | one holdings source or labelled
- N-067 | ZIGi | Connect ChatGPT subscription, reload | local answers still possible; way back shown
### MINOR
- BUG-055 | ZIGi | "and the second one?" follow-up | keeps context
- BUG-056 | ZIGi | "how mch eth do i hav" | typo-tolerant
- BUG-059 | ZIGi | ETH value vs Wealth | same price/time
- N-020 | ZIGi | "Did I hit my calories?" | yes/no for today
- N-021 | ZIGi | "Which habit am I worst at?" (from Habits) | named habit, no empty card
- N-064 | ZIGi | "Worth in EUR" | EUR or honest note
### POLISH
- BUG-038 | ZIGi | 20k+ char input | limit message, no echo
- BUG-060 | ZIGi | "log 250 ml water" | preview without generic help
- N-065 | ZIGi | "food data spend" question | "I don't track food spending"

---
## Missing vs top competitors — Habits (from habits-missing-ranked.md; the source ranks 19, not 20)
1. Progress you can see at a glance (F02)
2. Delivered, actionable reminders (F01)
3. Fast numeric logging and a timer that works (F03)
4. Skip, pause and undo that people can find (F04)
5. Limit and quit habits (F05) — note: alpha check Oct 26 found QUIT/LIMIT types exist
6. Starter packs and guided programs (F09)
7. Home-screen and lock-screen quick-log (F06)
8. Reflections: note + mood at check-in, searchable feed (F11)
9. Health auto-complete by default and from outside sources (F07)
10. A day that ends when you do (F08)
11. Time-boxed challenges (F12)
12. Import from other trackers (F17)
13. Calendar link (F15)
14. Friends and accountability buddies (F10)
15. Public API, webhooks and an MCP server for habits (F14)
16. Wrist and quick-launch logging (F13)
17. Checklists inside a habit (F16)
18. A companion that earns its place (F18)
19. Location-aware and alarm-style reminders (F19)
