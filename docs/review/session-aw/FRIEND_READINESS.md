# Session AW Part 6 (E4): friend-readiness walk

One fresh reviewer, who wrote none of the code, walked five friends through their first week. The build was the production build of `feature/session-aw-finish-line` served at http://127.0.0.1:3101 (HEAD `105c12f6` when the walk began).

Each friend started on an empty device, went through the welcome with their own areas and focuses, and then lived Mon 30 Nov to Sun 6 Dec 2026 on Playwright's clock: day 1 morning, day 1 evening, day 2, day 4 and day 7.

**Setup**
- Views: 390×844 (the mobile project, touch) and 1440×900, with the theme alternating per friend. Jules also walked at 820×1180, as a tablet.
- The Showcase was walked once at 390 Nebula and once at 1440 Light.
- Browser runs went one at a time under the machine lock, with one worker. Zone Europe/Amsterdam; Sanne in nl-NL, the others in en-GB. Every `/api` call answered 503.
- Screenshots (DSF 1) and the logs, including each NOVA and ZIGi answer, are in `the integrator's scratchpad (persona/, not committed)`. Screenshot names below are relative to that folder.
- The temporary `zz-persona-*` specs are deleted. The working tree's other modified files belong to another agent; this walk did not touch them.

**Measured on every first screen and step**
- Time to usable (hydrated, h1 shown, no "Opening…").
- Text and labels under 14 px.
- Sideways overflow.
- NaN, undefined, Infinity and null.
- Promise, advice and calorie-burn wording.
- Console and page errors.
- axe (WCAG 2.0–2.2 A/AA): 132 runs, **0 violations**.

## Summary

| walk | Blocker | Major | Minor | 390 | 1440 |
|---|---|---|---|---|---|
| Sanne (habits, sleep, Dutch, phone) | 0 | 0 | 5 | pass | pass |
| Tom (pay off a debt, computer) | 0 | 3 | 5 | pass (3 Majors) | pass (3 Majors) |
| Lina (food and health) | 0 | 1 | 2 | pass (1 Major) | pass (1 Major) |
| Max (fitness, NOVA power user) | 0 | 1 | 3 | pass (1 Major) | pass (1 Major) |
| Jules (journal and notes, tablet) | 1 | 0 | 2 | **fail** | **fail** (820 tablet: fail) |
| Showcase | 0 | 0 | 4 | pass | pass |
| **All (after merging duplicates)** | **1** | **5** | **21** | | |

A row passes when the friend can do their daily thing at that size without a Blocker.

**Checked and fine everywhere**
- No console errors (beyond the routed 503s), no page errors, no error boundaries.
- No NaN, undefined or Infinity, and no sideways scroll at 390, 820 or 1440.
- Themes held: Light stayed Light, and Nebula stayed Nebula.
- No estimated calorie burn anywhere. NOVA and ZIGi say "ZIGoals doesn't work out calories burned from your movement", and the Workouts summary shows kg lifted only.
- No money or medical advice, and nothing promised:
  - "Should I buy bitcoin", "pay off or invest" and "Is my portfolio a good investment" are refused.
  - "Should I take vitamin D?" gets "not medical advice… a doctor or pharmacist".
  - The emergency-fund date is "an estimate… not a promise".
  - The debt planner says "A model, not advice". The only "guarantee" hits are "returns are not guaranteed".
- **Read aloud offers only device voices.** The voice list was stubbed: an online and an on-device voice, in English and in Dutch.
  - With both kinds, Read aloud (and "Voorlezen" in Dutch) used only the on-device voice.
  - With online voices only, no Read aloud button was shown at all.
  - Headless Chromium has no voices, so without the stub nothing is offered, which is correct.

## Findings

| Id | Sev | Persona | Page | View | What happened | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|---|
| FR-AW-1 | **Blocker** | Jules (anyone who journals) | /app/journal | 390, 820, 1440 | **A typed journal page is lost without a word.** At 390 "Save entry" is at y 1314, 770 px below the entry box (y 544). In between are the format bar, Today's question, Link another day, Tags, letter, "This entry is about", prompts and photos. It sits at about y 1246 at 1440 (fold 900) and below 1180 on the tablet. Jules typed a page and tapped Today in the tab bar: no warning, and back on Journal the box is empty with nothing stored. A reload loses it too. No draft is kept. | `crop-jules-journal-390.png`, `crop-jules-journal-1440.png`, `jules-820-light-29-d7-journal.png`, `journalcheck-390-01-after-leave.png`, `journalcheck-390-02-back.png` | Keep an unsaved draft of Today's entry on the device, as Notes' capture box does. Put Save entry right under the box, or make it sticky. At least warn on leaving with unsaved words. |
| FR-AW-2 | Major | Tom | Wealth → Accounts → Add an account or debt | 390, 1440 | The debt form's Currency starts at **USD** for a friend whose spending is all in €. Tom typed "2400" for his card, which was saved as **US$2,400.00**. Wealth then says "Net worth after debts −US$2,400.00 · Your debts are larger than what you own in USD", NOVA says "You owe US$2,400.00" and ZIGi says "2,400.00 USD". | `tom-390-nebula-09-debt-form.png`, `tom-1440-light-29-d7-wealth.png` | Start new accounts and debts in the currency the money log or the setup goal uses (EUR here), or ask once when there is none. |
| FR-AW-3 | Major | Tom | NOVA, ZIGi | 390, 1440 | **Debt answers ignore payments he recorded.** After "Record a payment" of 150, Wealth's row says "US$2,250.00 after 1 payment since". But NOVA's "How much do I owe?" on day 2, after the payment, and ZIGi's "How much is left on my credit card?" on day 4 both still answer **US$2,400.00 owed on Mon 30 Nov**. | `tom-390-nebula-18-payment-saved.png`; `tom-*.log` | Answer from the same "owed after payments" figure Wealth shows, and say "after 1 payment since your statement". |
| FR-AW-4 | Major | Tom | NOVA | 390, 1440 | "How much have I paid off this week?" answers **"€127.44 spent this week… most on Groceries (79%), in 5 entries"**. That is spending presented as debt paid off. | `tom-1440-light-33-nova-week.png` | Route "paid off / afgelost / paid down" to debt payments ("150 paid on Credit card this week"), or say there are none. Never fall back to spending. |
| FR-AW-5 | Major | Lina | NOVA average calories | 390, 1440 | "What was my average calories this week?" answers **"On average 550 kcal a day… over the 2 days whose entries all say"**. Day 1 held a breakfast in words with no calories, and NOVA itself had said that day's "true total is higher and unknown". So an incomplete day is counted as complete, and the average reads low: 550 kcal a day for an adult. | `lina-*-nova-week.png`; `lina-*.log` | Leave out days with a words meal (or an unknown entry) from "all say", or say "at least 550". Name the days counted. |
| FR-AW-6 | Major | Max | NOVA | 390, 1440 | "What is due tomorrow?" answers **"That is still ahead: NOVA reads only what is recorded up to today."** A power user cannot ask about tomorrow's tasks. "When is Book physio appointment due?" does work. | `max-*-nova-power.png`; `max-*.log` | Read task and agenda questions about tomorrow before the future-date guard (tasks are recorded today). |
| FR-AW-7 | Minor | Sanne | /app/welcome, starters | 390, 1440 | Her focus is "Sleep better", but "A sleep goal (optional)" stays on "No sleep goal". On day 4 ZIGi's "Haal ik mijn slaapdoel?" says "Je hebt nog geen slaapdoel". | `sanne-390-light-05-welcome-starters.png` | Pre-select 8 h (or a suggestion) when Sleep better is picked. |
| FR-AW-8 | Minor | Sanne | Health → Sleep, Log a night | 390, 1440 | She went to bed at 00:30, typed 00:30 and kept the default bed date (yesterday). The form refuses: "The night can last at most 24 hours: check the dates." She has to work out which date is wrong. | `sanne-390-light-19-FAIL-sleep_00_30_07_00.png` | When the bed time is after midnight and before the wake time, move the bed date to the wake date, or offer "Did you mean 3 Dec 00:30?". |
| FR-AW-9 | Minor | All | NOVA and ZIGi Health-closed reply | all | "Tap Allow Health in NOVA → Permissions: one tap opens Health **(the button is there once Health is on your Today page)**". Allow Health was there anyway (y 428 at 390), so the bracket makes friends doubt it. The Showcase's ZIGi card also shows the raw path "Opens /app/nova#nova-permissions, where Allow Health is · Nothing is written" (in English in a Dutch reply). | `sanne-390-light-16-nova-closed.png`, `sanne-390-light-17-nova-permissions.png`; `showcase-*.log` | Drop the bracket and the raw path. |
| FR-AW-10 | Minor | Sanne | NOVA, ZIGi (NL) | all | English inside Dutch answers: the water chart caption "Water per day: 4 days with a record from 30 Nov 2026…", "8 h 15 min (estimated)", and ZIGi's follow-up chips "How did I sleep last night?" and "How consistent is my bedtime?". | `sanne-390-light-21-zigi-answers.png`, `sanne-390-light-32-nova-week.png` | Dutch caption, "(geschat)", and Dutch follow-up chips. |
| FR-AW-11 | Minor | Tom | ZIGi | 390, 1440 | "Is it smart to take a loan to pay my card?" answers with his task list ("1 open task, 1 overdue: Pay the credit card minimum"). No advice is given, which is good, but the answer is beside the point. | `tom-*-zigi-money.png` | Send loan, invest and "is it smart" questions to the no-advice reply, as NOVA does. |
| FR-AW-12 | Minor | Tom | Setup → Today → Wealth | 390, 1440 | The focus "Pay off a debt" suggests only "widgets on Today". The first five has no "Add what you owe", and "Add an account or debt" sits in the folded "Accounts, debts & net worth" (y about 1660 at 390, 1175 at 1440). For a money-only setup the Today hero also shows "Onchain · ZIGChain vision · Alpha simulation" (protected hero). | `tom-390-nebula-07-today-after-setup.png`, `tom-390-nebula-08-d1-wealth.png` | With the debt focus, add a first-five step "Add what you owe" that opens the form. |
| FR-AW-13 | Minor | Tom | NOVA "When will I be debt-free?" | all | "The planner needs the minimum monthly payment for Credit card", but the add form never asks for one. | `tom-*.log` | Add "Minimum monthly payment (optional)" to the debt form. |
| FR-AW-14 | Minor | Tom, Showcase | ZIGi vs NOVA (en-GB) | all | ZIGi writes "100.75 EUR" and "2,400.00 USD" where NOVA writes "€55.45" and "US$2,400.00" for the same records (FR-TJ-4 / FR-L-11 in English). | `tom-*.log` | One currency formatter for both. |
| FR-AW-15 | Minor | Tom | /app/tasks | 390 | Once a reminder has gone off, the Reminders card pushes New task to y 989 (fold 844). It is at 550–615 otherwise. | `tom-390-nebula-16-d2-tasks.png` | Fold gone-off reminders to one line above New task on phones, or put New task first. |
| FR-AW-16 | Minor | Lina, Sanne | /app/health first screen | 390, 1440 | After Lina's first weigh-in, the example Quick counters (Push-ups…) fill Health's first screen at 390 and her food diary moves below. Sanne, who chose sleep and water, sees "Log weight" first and a weight-trend line, but not her water or sleep (FR-S-14, still there). | `lina-390-light-23-d7-health.png`, `sanne-1440-nebula-27-d7-health.png` | Seed the example counters only for Fitness, and order the hero buttons by the chosen focuses. |
| FR-AW-17 | Minor | Lina | NOVA | all | "Am I eating healthy?" answers with water and weight ("Nothing recorded for: sleep, steps…") and not a word about food. | `lina-*.log` | Answer from the food diary (meals, words entries), with no judgement. |
| FR-AW-18 | Minor | Max | Health → Workouts | 390, 1440 | "Start an empty workout" is at y 910 at 390 on day 1. By day 7 the 12-week chart has pushed it to 1269 at 390 and 1172 at 1440. | `max-390-nebula-32-d7-health-workouts.png`, `max-1440-light-32-d7-health-workouts.png` | Put Start a workout above the week figures. |
| FR-AW-19 | Minor | Max | NOVA | all | "Compare this week with last week" offers to add a task named "Compare this week with last week". The agenda clock lists the overdue timed task "Book physio appointment" as "any time". | `max-1440-light-24-nova-power.png` | Route compare questions to the week-vs-week answer, and mark overdue tasks as overdue on the clock. |
| FR-AW-20 | Minor | Jules (tablet) | Side rail | 820 | The rail's labels (Today, Habits, Health, Activity, NOVA, Checklist, Tasks, Notes, Journal) are 12 px on every page. | `jules-820-light-29-d7-journal.png` | 14 px, or icons with a visible tooltip plus labels at 14 px. |
| FR-AW-21 | Minor | Tom (1440) | /app/habits ideas | 1440 | The idea cards' notes ("2 liters a day", "8,000 steps a day", "30 minutes a day") are 13 px. | `tom-1440-light-27-d7-habits.png` | 14 px. |
| FR-AW-22 | Minor | Jules | ZIGi | all | "Do I seem depressed?" gets the full crisis reply (112, 988, Samaritans, 113). That is safe, but heavy for a reflective question. | `jules-*-zigi-journal.png` | Consider a gentler first line with the help numbers kept. |
| FR-AW-23 | Minor | Showcase | Speed | 1440 | Time to usable on a shared machine: Today 5.2 s, Wealth 4.0 s, Help 3.95 s, NOVA 3.4 s, Health 3.3 s and Sleep 3.1 s. Loading the Showcase took 10.2 s. At 390 every page is under 2.8 s and the Showcase loads in 5.6 s. On empty profiles at 1440: Sanne's first Today 2.9 s, Sleep's night form 3.5 s. | `showcase-1440-light.log` | Lead's route weights (FR-TJ-22, FR-S-19). |
| FR-AW-24 | Minor | Tom, Showcase | Today | 1440 | On Today the floating Music, Checklist and ZIGi buttons sit half off the right edge, over the right-hand card. On Health and other pages they sit inside the window. | `crop-showcase-today-right.png`, `tom-1440-light-25-d7-today.png` | Give Today the same right inset as the other pages. |
| FR-AW-25 | Minor | Max | /app/checklist | 1440 Light | The planet art shows a hard-edged dark block on the light background. | `max-1440-light-36-d7-checklist.png` | Fade the art's dark side in Light. |
| FR-AW-26 | Minor | Showcase | Checklist, Wealth | 390, 1440 | "Showcase · fictional" is 12 px on Checklist, and a Wealth figure ("US$437,700.00") is 13.7 px. | `showcase-1440-light-11-checklist.png`, `showcase-1440-light-07-wealth.png` | 14 px. |
| FR-AW-27 | Minor | All | Native date and time fields | all | The sleep, debt and task date fields show US order ("12/02/2026", "12:30 AM") in an nl-NL browser. **Probably the sandbox's browser UI language, not the app**: check on a real Dutch phone before acting. | `sanne-390-light-19-FAIL-sleep_00_30_07_00.png` | None if a real device shows dd-mm. |

**What each walk did, apart from the rows above**
- **Sanne:**
  - Water was right everywhere: 1.000 mL per day, 3.000 mL a week, 750 mL on 4 days, and "3 days without water (not counted as 0)".
  - Sleep was right: 8 h 15 min last night and an average of 7 h 37 min over 3 nights.
  - Lights out was right: done on 2 of 7 days, Mon and Thu.
  - The Habits card showed "1 / 2 liters".
  - The night form's `#log-night` link lands on the form.
  - Allow Health was one tap at y 428.
  - ZIGi answered in Dutch.
- **Tom:**
  - Spending was right: €55.45 this week, €84.49 this month, €100.75 on groceries.
  - The task reminder (!1h) fired at 09:00 with Done, Start focus and Snooze.
- **Lina:**
  - Calories in words were handled honestly: "620 kcal known… plus 1 meal in words without calories… the true total is higher and unknown".
  - Her weight change, −0.3 kg, was right.
- **Max:**
  - Lifts were right: 450 / 420 / 360 / 462.5 kg lifted.
  - Each lift reads with its estimated one-rep max, and two personal bests were named.
  - The walk streak and the task due time were right.
  - (The "0 min" workout durations come from the script finishing each workout in seconds; they are not counted.)
- **Jules:**
  - Journal and Notes were on the first screen (Today's entry at 480–531, Capture a note at 415–457).
  - The task reminder was saved.
  - NOVA's Journal and Notes are off until Permissions, which is by design and comes with one button.

## Re-check of AV's still-open rows (current build)

| AV id | AV status | Now | Evidence |
|---|---|---|---|
| FR-S-13 | Carried | **Still there (partly)** | The Dutch sleep answer says "8 h 15 min (estimated)" and the water chart caption is English (FR-AW-10). The average-goal line was not re-tested. |
| FR-S-14 | Carried | **Still there** | "Log weight" is the first Health button for everyone, and the Push-ups counters fill the first screen after a weigh-in (FR-AW-16). NOVA's tiles "Weight this month" and "Tracked wealth" show for Max. "Unlock layout" is on every phone page, and Game layer at 1440. |
| FR-S-15 / FR-TJ-12 | Carried | **Fixed** | On the phone, Health's "Log food" opens the Log a meal sheet in one tap. |
| FR-S-16 | Partly | **Partly** | ZIGi now names Allow Health with one card (fixed). Both replies still carry the "(…once Health is on your Today page)" bracket, and the Showcase card shows a raw path (FR-AW-9). |
| FR-S-19 | Carried | **Still there at 1440** | Help is usable after 3.95 s in the Showcase at 1440, and 2.4 s at 390. |
| FR-TJ-4 | Partly → second pass | **Fixed in Dutch, still mixed in English** | Dutch answers read "1.000 mL" and "€ 55,60". In en-GB, ZIGi writes "100.75 EUR" where NOVA writes "€" (FR-AW-14). |
| FR-TJ-5 | Partly → second pass | Not re-checked | No watched address in these walks. |
| FR-TJ-7 | Partly / Carried | **Fixed at 1440, still there at 390** | On an empty profile at 1440, Complete is at 711–773 (fold 900). At 390 the first habit's Complete is at 801–1380 and the second's at 1277–1380 (fold 844). |
| FR-TJ-16 | Carried | **Fixed** | The Dutch answers use the app's names: "Wealth → Spending", "Health → Sleep". |
| FR-TJ-17 | Partly | **Fixed** | "What is my gym streak?" answers from the habit named Gym. |
| FR-TJ-19 | Carried | **Mostly fixed** | In Light at 390 the logo is in colour once the page has loaded; it is faint on the very first open while the intro plays (`jules-390-light-01-first-open-today.png`). |
| FR-TJ-20 | Carried | Not re-checked | |
| FR-TJ-22 | Carried | **Still there at 1440** | Showcase Today 5.2 s and Wealth 4.0 s at 1440; at 390 everything is ≤ 2.7 s (FR-AW-23). |
| FR-TJ-23 / FR-L-16 | Carried | Not re-checked | No goal was funded in these walks. |
| FR-TJ-24 | Carried | **Still there** | The first five starts under the protected hero at 390 and 1440 (owner decision). |
| FR-L-4 | Partly → second pass | **Fixed** | Log spending is in the headline card on an empty Wealth, and at y 591 (390) / 572–688 (1440) with entries. |
| FR-L-5 (Showcase 390) | Carried | **Fixed** | New task is at y 714 at 390 in the Showcase. |
| FR-L-6 / FR-S-8 / FR-MAX-3 | Fixed | **Still fixed** | Showcase Journal: Today's entry at y 597 (390) and 621 (1440). |
| FR-L-14 | Carried | Not re-checked | No bank import in these walks. |
| FR-L-17 | Carried | **Fixed** | The phone Settings list has "Erase everything" and "Restore a backup (Your data)" rows, and the guide says "Settings → Data & privacy → Erase everything". |
| FR-MAX-6 | Partly | **Still there** | "Which habit do I skip most this month?" still means planned skips only: "You skipped no habit this month (no planned skip)". The Dutch question gets the same meaning. |
| FR-MAX-11 | Carried | Not re-checked | |

Not counted (environment, not the app):
- Headless Chromium has no speech voices; Read aloud was checked with a stubbed voice list.
- Native date and time pickers follow the browser's UI language (FR-AW-27).
- The 1440 Showcase timings were taken on a machine shared with other runs.

## Integrator: what happens to each row (26 Nov)
- Being fixed by builders (each merged, reviewed by a fresh agent and re-walked before the STATUS entry):
  - FR-AW-1 (journal draft, and Save near the box);
  - FR-AW-2/3/4/11/13/14 (debts and money answers);
  - FR-AW-5/6/9/10/17/19 (NOVA and ZIGi answers);
  - FR-AW-7/8/15/18/20/21/24/26 (UI Minors, or a verdict where a row is in a protected area).
- FR-AW-22 (the crisis reply to "Do I seem depressed?"): being fixed by the answers builder. A reflective question gets
  a gentler first line, with the help lines kept in the same reply. Self-harm and suicide words keep today's reply
  exactly (`lib/ai/safety-guard.ts`).
- FR-AW-23 (Showcase speed at 1440): Carried, 2 failed attempts (ADR-046 D-SPEED; FR-TJ-22 and FR-S-19).
- FR-AW-25 (the Checklist planet art in Light): Carried, a protected area outside FR-TJ-7 (the Checklist orbit path).
- FR-AW-27 (the date order in native pickers): no app change. The browser's own language sets it.
- Found by the corpus while wiring FR-AW-9 (not a walk row): "can you see my health?" gets the trust answer. "Is my health
  shared" gets the Health summary instead, and the Dutch "kun je mijn gezondheid zien?" opens Health with an English
  line. One attempt (answering the trust question first, in `alFirst`) did not reach them, because earlier layers answer
  first. It was reverted. Open: the next attempt is in the local-answers order (`lib/ai/local-answers/no-model.ts`).

## Re-walk by a fresh helper (26 Nov, production build of `fa4d3002`, 390 and 1440)
- **FR-AW-1 to FR-AW-6 (the Blocker and the five Majors): Fixed**, each checked as a person would.
  - Journal: the draft comes back after Today and after a reload, with its letter and journal choices. Save entry is
    371 px under the box's top at 390. Recovery words are never kept.
  - Wealth: a debt starts in €, and Wealth, NOVA and ZIGi all read €2,250.00 after a payment.
  - Answers: "paid off" counts payments only; the average leaves out a day with a meal in words, and says so;
    "due tomorrow" lists tomorrow's tasks.
- **Minors 7, 8, 9, 10, 11, 13, 15, 17, 18, 22: Fixed.**
- Every screen it walked: no console or page errors, no NaN or undefined, no sideways scroll at 390, changed labels
  ≥ 14 px.
- **New, found by the re-walk:**
  - **Major, fixed** (`a0820f3c`): at 390 a debt row with a payment squeezed its name to 0 px. The cause dates from AV.
  - Minor, fixed (`5a4fc824`): a payment on the balance's own day is kept and said ("1 payment on the balance's day,
    not taken off") in Wealth, NOVA and ZIGi alike. The two entries have no times, so they cannot be ordered.
  - Minor, Carried, against a named rule (ADR-023 C25: the browser's region sets the first currency, and a stored choice
    always wins): with no spending yet, en-GB in Amsterdam still starts a debt in USD. Once there is spending, a new
    debt follows it (FR-AW-2). A time-zone fallback was tried and reverted, because eight specs pin C25's dollars for
    en-GB.
  - Minor, fixed (`a522ab78`): on a week's or month's first day, "Compare this week with last week" sets today beside the
    whole of the period before.
