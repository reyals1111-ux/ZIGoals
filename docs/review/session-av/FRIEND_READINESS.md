# Session AV — friend-readiness pass (owner follow-up 6, step 3)

Four fresh helpers who wrote none of lane 2 lived AU's personas' first week on one production build of PR #109's head `9db304c9`
(batches 1–6 integrated), on an empty profile and then on the Showcase, at 390 and 1440, in Nebula plus one other theme, with
Playwright's clock moving across 23–30 Nov and past midnight. Browser runs one at a time, at most 2 pages. Their reports follow
unchanged; each finding's fix (commit) or Carried cause is recorded in "Fixes" below once it lands.

| walk | Blocker | Major | Minor |
|---|---|---|---|
| Sanne | 0 | 10 | 10 |
| Tom and Jules | 0 | 11 | 13 |
| Lina | 1 | 7 | 10 |
| Max | 0 | 5 | 8 |
| **All (before duplicates are merged)** | **1** | **33** | **41** |

Shared across walks: Tasks' New task field below the phone's first screen (FR-L-5, FR-MAX-2, FR-S-7, FR-TJ-8); Journal's Write
below it (FR-L-6, FR-MAX-3, FR-S-8, FR-TJ-9); the restore path (FR-L-7, FR-MAX-10); ZIGi's phone button in the docs (FR-L-8,
FR-S-10); Dutch water and words-meals answers (FR-S-1/2, FR-TJ-2/3). Sandbox note (not the app): Playwright's default headless
shell crashes when ZIGi opens; full Chromium works.

## Fixes

Counts before duplicates: 1 Blocker, 33 Majors, 41 Minors. Every Blocker and Major has a fix commit; the fresh re-check (a fifth helper, read only, on `63798740`) found **30 Fixed, 4 Partly, 0 Not fixed, no new Blocker or Major**. "Re-check" is that helper's verdict; "—" means it was not re-checked (unit tests or a spec cover it).

| Id | Sev | Commits | Re-check | Note |
|---|---|---|---|---|
| FR-S-1 | Major | `f68b7791` | Fixed |  |
| FR-S-2 | Major | `aeb0ae7a` | Fixed |  |
| FR-S-3 | Major | `bb0f40ce` | Fixed |  |
| FR-S-4 | Major | `bcd2ac8c` | Fixed |  |
| FR-S-5 | Major | `8e748281`, `cc1f99cd` | Fixed |  |
| FR-S-6 | Major | `afefc212` | Fixed |  |
| FR-S-7 | Major | `75959bb8` | Fixed |  |
| FR-S-8 | Major | `baf96c7a` | Fixed |  |
| FR-S-9 | Major | `7bf23ce3` | Fixed |  |
| FR-S-10 | Major | `4a12169d` | Fixed |  |
| FR-S-11 | Minor | `e65501ba` | — |  |
| FR-S-12 | Minor | `01858ef3`, `307b8122` | — | 307b8122 put the name in `?name=`; CI run 2012's Alpha gate caught it reaching the server; 01858ef3 hands it over in memory. |
| FR-S-13 | Minor | — | Still open | Carried: the goal-progress line is shared with the English goal cards ("7.9 h a night"); a Dutch duration and percent is a wording pass with a corpus re-record. Re-check: still open. |
| FR-S-14 | Minor | — | — | Carried: choosing Health's example counters, the coach and NOVA's tiles from the chosen pillars changes three first screens, one of them NOVA's protected composition. |
| FR-S-15 | Minor | — | — | Carried with FR-TJ-12: the first five's Log a meal opens the sheet directly; the hero's Log food still scrolls to the card (the sheet would have to load with Health's first screen, on its route weight). |
| FR-S-16 | Minor | — | — | NOVA's reply is FR-TJ-1 (e2f33a4d, re-check Fixed). ZIGi's reply still names its own Privacy switches: Carried (ZIGi's gate is a separate record, `zigoals:ai:v1`). |
| FR-S-17 | Minor | `4a12169d` | Fixed |  |
| FR-S-18 | Minor | `3d4a3d4a`, `88ee25e3` | Fixed |  |
| FR-S-19 | Minor | — | — | Carried: every route is within its weight budget; a time-to-usable pass on Help is its own work. |
| FR-S-20 | Minor | `d8e44ce2`, `24e656da` | — |  |
| FR-TJ-1 | Major | `de08b409`, `e2f33a4d` | Fixed |  |
| FR-TJ-2 | Major | `f68b7791` | Fixed |  |
| FR-TJ-3 | Major | `aeb0ae7a` | Fixed |  |
| FR-TJ-4 | Major | `ba53955e`, `8e748281`, `d8e44ce2`, `24e656da` | Partly | Second pass on lane2/fr-recheck (see below). |
| FR-TJ-5 | Major | `93fa0909` | Partly | Second pass on lane2/fr-recheck (see below). |
| FR-TJ-6 | Major | `a656417d`, `85a13ca7` | Fixed |  |
| FR-TJ-7 | Major | `f30ec1ee` | Partly | Carried on the phone and in the Showcase: Complete sits under the accepted Habits baseline's hero and cards; moving it is a redesign of a protected baseline (owner approval). |
| FR-TJ-8 | Major | `75959bb8` | Fixed |  |
| FR-TJ-9 | Major | `baf96c7a` | Fixed |  |
| FR-TJ-10 | Major | `8d2002a6`, `299896e4` | Fixed |  |
| FR-TJ-11 | Major | `4a12169d`, `3de11b8e` | Fixed |  |
| FR-TJ-12 | Minor | — | — | Carried, as FR-S-15. |
| FR-TJ-13 | Minor | — | Fixed | Fixed with FR-S-6 (afefc212). |
| FR-TJ-14 | Minor | `4a12169d` | — |  |
| FR-TJ-15 | Minor | `88ee25e3` | — |  |
| FR-TJ-16 | Minor | — | Still open | Carried: the Dutch screen names are in about 40 answer lines and 114 recorded corpus answers; a wording pass with a corpus re-record. Re-check: still open. |
| FR-TJ-17 | Minor | `306b7241` | — | "1 weeks" fixed (306b7241). Carried: a habit named Gym before workout weeks changes which intent answers (router and corpus). |
| FR-TJ-18 | Minor | `f30ec1ee` | — |  |
| FR-TJ-19 | Minor | — | — | Carried: the top-bar logo belongs to the protected shell navigation and the locked look (owner decision). |
| FR-TJ-20 | Minor | — | — | Carried: Health Diary's card layout; a polish item for the next session. |
| FR-TJ-21 | Minor | `4a12169d` | Fixed |  |
| FR-TJ-22 | Minor | — | — | Carried, as FR-S-19 (Showcase Wealth and Today). |
| FR-TJ-23 | Minor | — | — | Carried with FR-L-16: an "Add money" control on a goal's hero is a new control (follow-up 6: nothing new). Quick add → Contribution does it today. |
| FR-TJ-24 | Minor | — | — | Carried: the first five sit under the protected Today hero (owner decision). |
| FR-L-1 | Blocker | `44eb4aeb` | Fixed |  |
| FR-L-2 | Major | `44eb4aeb` | Fixed |  |
| FR-L-3 | Major | `fe764ca6` | Fixed |  |
| FR-L-4 | Major | `63798740`, `8d2002a6`, `fd7eba80` | Partly | Second pass on lane2/fr-recheck (see below). |
| FR-L-5 | Major | `75959bb8` | Fixed | Carried in the Showcase at 390 (949 px): the hero, two link rows, the explainer, the Showcase note and three rows of view chips sit above New task; re-check confirmed the cause. |
| FR-L-6 | Major | `baf96c7a` | Fixed |  |
| FR-L-7 | Major | `3d4a3d4a`, `88ee25e3` | Fixed |  |
| FR-L-8 | Major | `4a12169d` | Fixed |  |
| FR-L-9 | Minor | `fd7eba80` | Fixed |  |
| FR-L-10 | Minor | — | Fixed | Fixed with FR-MAX-10 (cb28ae50). |
| FR-L-11 | Minor | `fe764ca6` | Fixed |  |
| FR-L-12 | Minor | `f2121eea` | — |  |
| FR-L-13 | Minor | `f2121eea` | — |  |
| FR-L-14 | Minor | — | — | Carried: suggesting Bills for a confirmed bill's payee changes the import's category rules; re-check confirmed. |
| FR-L-15 | Minor | `552162b1` | — |  |
| FR-L-16 | Minor | — | — | Carried, as FR-TJ-23. |
| FR-L-17 | Minor | — | — | Carried: the guide and Help agree ("Settings → Backup & restore ends with …"); the walker found Erase after "Bring your history with you" and no phone row. A page check and one wording change for the guide and Help, next session. |
| FR-L-18 | Minor | `a5d4213c` | Fixed |  |
| FR-MAX-1 | Major | `999f6f37` | Fixed |  |
| FR-MAX-2 | Major | `75959bb8` | Fixed |  |
| FR-MAX-3 | Major | `baf96c7a` | Fixed |  |
| FR-MAX-4 | Major | `cc1f99cd` | Fixed |  |
| FR-MAX-5 | Major | `8e748281`, `f96b671c` | Fixed |  |
| FR-MAX-6 | Minor | `c2df5398` | — | English fixed. Carried in Dutch: "Welke gewoonte sla ik … het vaakst over?" reaches the open-habits intent ("mis ik het vaakst" is right); a router change and a corpus re-record. |
| FR-MAX-7 | Minor | `36aa70f8` | — |  |
| FR-MAX-8 | Minor | `36aa70f8` | — |  |
| FR-MAX-9 | Minor | `4a12169d` | — |  |
| FR-MAX-10 | Minor | `88ee25e3`, `cb28ae50` | Fixed |  |
| FR-MAX-11 | Minor | — | — | Carried: NOVA's answer widget body (its size is part of NOVA's protected composition). |
| FR-MAX-12 | Minor | `cc1f99cd` | Fixed |  |
| FR-MAX-13 | Minor | `a41b29ec` | — |  |

Minors (41): 23 fixed (two of them with the Major they repeat), 3 partly (FR-MAX-6, FR-S-16, FR-TJ-17) and 15 Carried, each with its cause above. The Carried rows are listed in ADR-045's closing table.

### Second pass (the re-check's Partly rows)

A builder fixed the three Partly rows that were not Carried (merge `ed454d25`); FR-TJ-7 stays Carried (above).
- **FR-L-4** (`fd8a4d93`): Log spending sits right under the headline total, in its own block. The Showcase now measures 661–708 at 390 (tab bar 779; it was 1000) and 704–752 at 1440 (fold 900); the figure stays above it (546–591). `pillar-phone-length` now checks the Showcase too, at both sizes (stricter; it fails on `63798740`).
- **FR-TJ-4** (`c91d1e7a`): nutrient totals ("137,6 g") and the answer chart's caption, stat card, labels and table ("5.750 mL") use the display locale; en-US is unchanged. Tests through NOVA and ZIGi fail on the old code.
- **FR-TJ-5** (`6cb5df5b`): "Wat is mijn vermogen?" names the linked wallet (view only), as the English net-worth answer does.
- The corpus is unchanged: no recorded intent's answer differs (5 of 5 as recorded). On the production build of `ed454d25`, the 11 touched spec files pass: 82 passed, 6 skipped by design. Every route is within its budget (the tightest is Settings, 521.4 of 531 kB).
- Not re-checked by a fresh helper after the second pass. The specs above are the proof.


## Walk: sanne


Build: `feature/session-av-2` @ `9db304c9`, served at :3101. Browser: Playwright Chromium (`channel: 'chromium'`), locale nl-NL, Europe/Amsterdam, DSF 1.
Walks: an empty profile at 390 Light (setup with Habits + Health and the focuses Sleep better and Drink more water, then Mon 23 to Mon 30 Nov: water, sleep, Lights out, meals in words, an average sleep goal, past midnight), 1440 Nebula (setup, pillars, NOVA and ZIGi), and the Showcase at 390 Light and 1440 Nebula. Scripts and screenshots: `/tmp/claude-0/-home-user-ZIGoals/04cd60ac-4211-5372-87a4-15f012c2e70f/scratchpad/fr-sanne/` (screenshot names are relative to that folder).

Her records at the time of the questions (Sun 29 Nov, 21:30): water 1000/1000/1250/500/1000/750/250 mL (5,750 in total); 6 nights (7h45, 7h20, 6h45, 8h10, 9h00, 8h30, an average of 7h55); Lights out done 4 of 7; meals in words on 23, 25 (stamppot) and 28 Nov (pasta pesto); an average goal "Elke nacht 8 uur slapen" (8 h, 7 days).

| Id | Sev | Page | Width / theme / profile | What a friend meets | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| FR-S-1 | Major | NOVA, ZIGi | 1440 Nebula + 390 Light, own week | She asks water questions in Dutch and gets the answers in English: "Hoeveel water heb ik vandaag/deze week/gisteren gedronken?" gives "You logged 250 mL of water today…", in both NOVA and ZIGi. Sleep, habit and goal answers do come in Dutch. | nova.js log (Q1, Q2, Q9; q-nova2 Q1), zigi.js q-zigi2 Q1; `nova-d-q4.png`, `zigi-open-p-q4.png` | Add the NL template for the water answers (today, week, day) in the shared local answer. Add a corpus case for each. |
| FR-S-2 | Major | NOVA, ZIGi | all, own week | Meals logged in words are never seen. "Wat heb ik gisteren gegeten?" gives "Er staat gisteren niets in je eetdagboek (za 28 nov)", although she logged "Pasta pesto met salade". "What did I eat on Wednesday?" gives "Nothing is logged" (stamppot was logged). ZIGi says "Nog geen eten gelogd." "Welke maaltijden heb ik deze week gelogd?" gives "Vandaag tot nu toe: 250 mL water." Help says the assistants don't read words entries, but the answers say she logged nothing, which is wrong. | nova.js Q7, Q11; q-nova2 Q4 (`nova-p-q4.png`); zigi q-zigi2 Q3 | Let the food-diary answers list the words entries ("you wrote: … · calories unknown"), or at least say "1 meal in words, not read for figures". Never say "nothing logged". |
| FR-S-3 | Major | NOVA, Today | all, own week | A water habit that is partly done is shown as 0. With 250 mL logged, NOVA's "Wat staat er vandaag nog open?" says "Drink water (0 van 2 liters)". Today's "Yesterday, still open" says "Drink water · 0 of 2". Today's own Habits card says "0,5 / 2 liters · Counting from your water journal". The habit gets an entry only when it reaches the target, and these readers ignore the journal link. (The brief's rule "a wrong figure about health" would make this a Blocker. I rate it Major because the water total itself is right everywhere.) | q-nova2 Q3; `p10-01-midnight-today.png`; p8 log | Read linked-habit progress from the water journal (the same source the Habits card uses) in NOVA's open list and in the carry-over card. |
| FR-S-4 | Major | NOVA | 390 Light, own week | "Hoe laat moet ik vanavond naar bed?" gives "Het is 21:30, Sun, 29 Nov 2026." That is the clock, not a bedtime, and it is half English. | q-nova2 Q2 | Answer from the Health sleep goal ("Set your sleep goal…" when there is none). Don't fall through to the clock intent. |
| FR-S-5 | Major | ZIGi | 1440 Nebula, own week | "Haal ik mijn slaapdoel?" and "Hoe vaak ben ik deze week op tijd naar bed gegaan?" get "…voorlopig in het Engels", with examples that include "What is my net worth?" (she has no money pillar). NOVA answers the goal question; ZIGi answers the English form. | zigi.js q-zigi Q4, Q6 | Add NL goal-progress and "op tijd naar bed" (Lights out habit) intents. Pick example questions from the pillars she has turned on. |
| FR-S-6 | Major | Settings → Your data, Restore | 390 Light, own week | Export everything → Erase everything → Restore brings back every record (habits, health with 6 nights and 31 water entries, meals in words, the average goal: byte-identical). But `zigoals:ai:v1` (her Allow Health) is not in the export. After the restore NOVA says "Health staat aan voor NOVA, maar het delen van Health staat uit op dit apparaat… Zet in NOVA → Permissions Health page data en Include Health aan", and Health questions stop working. Also not restored: onboarding, onboarding-setup, zigi-metrics. | ex2.js / ex3.js log (key-by-key SAME/MISSING); nova-restored log | Either export and restore the AI sharing settings, or make the restore end by asking "Allow Health again?" with the one button. At least make the half-open state's reply offer the single Allow Health. |
| FR-S-7 | Major | /app/tasks | 390 Light, empty + Showcase | On the phone, the page's own "Add task" is below the fold (top 1020 px empty, 1296 px Showcase). The first screen is views, chips, Projects and Priority. The top bar's + Quick add is the only way in that she can see. | `pw-_app_tasks.png`, `sp-_app_tasks.png`; dbg.js | Put the add field right under the header on phones. Fold "Plan and views", Projects and Priority behind one "Views" row. |
| FR-S-8 | Major | /app/journal | 390 Light, Showcase | The "On this day" card comes first and pushes "Write" to top 1056 px (also 965 px at 1440×900). On the empty profile it is fine (Write about 370 px). | `sp-_app_journal.png`; d1.js log | Put "On this day" below Write, or fold it to one line on phones. |
| FR-S-9 | Major | /app/health?view=sleep | 390 Light, own week | In the morning, Today's Sleep card "Enter the times →" opens Sleep on "Tonight · I'm going to bed". The night form (Went to bed / Woke up / Save) is about 2,300 px down, nearly three screens, and has no anchor. | `p5-03-sleep.png`; p5/p11 log ("Night form top (morning) 2386") | Link to `#log-night` and scroll there. In the morning, put "Last night" above "Tonight". |
| FR-S-10 | Major | /app/help | all | Two current Help answers say "On a phone ZIGi stays the one floating button…" and "Phones keep ZIGi as the one floating button and show a Checklist pill…". On this build a phone has no ZIGi button: ZIGi opens from Apps & extras in the top bar (as other Help answers say). A friend looking for the button finds nothing. | help.txt ("Why does the music button look like ZIGi's?", "Where is the Checklist button…") | Rewrite both to "On a phone ZIGi is in Apps & extras (top bar)". FRIENDS_GUIDE §8 line 98 says the same (release notes, but read as current). |
| FR-S-11 | Minor | Today Water button | 390 Light | Taps on "Add 250 mL" less than 350 ms apart are dropped on purpose (a double-tap guard). Logging 4 glasses quickly saved 750 mL, and in my week script about half the taps were lost. The total is visible, but nothing says a tap was ignored. | p8 log (gap 250 ms: 750 of 1000) | Lower the guard to about 150 ms, or count rapid taps ("+3 glasses"). |
| FR-S-12 | Minor | /app/goals/new → Keep an average | 390 Light | She types "Elke nacht 8 uur slapen", follows the hint "Keep an average instead →", and the name field is empty again. The goal she made then doesn't tick the first five's "Set a goal" (still unticked a week later and after the restore). | `p6-03-average.png`; `ex-09-crop.png`; `dw-_app.png` | Carry the name in the link (`?name=`). Count average goals in the first five. |
| FR-S-13 | Minor | NOVA, ZIGi goal answer | all | "7.9 h a night van at least 8 h a night (99%)" and ZIGi's "7.9 h a night (99,17% of the target)": mixed separators, decimal hours, and English inside a Dutch answer. "(some nights estimated)" is in English too. | nova.js Q8; q-zigi2 Q7, Q2 | Use "7 h 55 min", the locale's separators and whole percents. |
| FR-S-14 | Minor | Health, Today, NOVA, Today top | 390 Light, 1440 | Things a person with no fitness, weight or money interest still sees: Push-ups, Pull-ups and Squats example counters on Health's first screen; "Weekly check-in · Your coach · Log a weight" in Today's focus; NOVA's quick tiles "Weight this month" and "Tracked wealth"; "Game layer" and "Unlock layout" on Today; an "Unlock layout" pill on every phone page. | `p4-02-health.png`, `ex-09-crop.png`, `dw-_app.png`, `pw-_app_habits.png` | Seed counters only when Fitness is picked. Show the coach only after a weigh-in. Choose NOVA tiles from the pillars she turned on. Move Unlock layout and Game layer into a ⋯ menu. |
| FR-S-15 | Minor | /app/health | 390 Light | The header's "Log food" only scrolls to a second "Log a meal" button. She needs two taps to reach "Just describe it". | `p5-01-logfood.png` | Make "Log food" open the meal sheet directly on phones. |
| FR-S-16 | Minor | NOVA, ZIGi Health-closed replies | all, before Allow | NOVA's reply still names "Health page data en Include Health (Include Health werkt zodra Health op je Today-pagina staat)" beside the button. ZIGi's names "Settings → ZIGi · your companion → Privacy & data: Health page data en Include Health", and its button goes there, not to the single Allow Health that FIRST_WEEK and FRIENDS_GUIDE (line 223) describe. | nova.js "BEFORE ALLOW"; zigi.js q-zigi Q1 | One sentence and one button to NOVA → Permissions → Allow Health, in both. |
| FR-S-17 | Minor | /app/nova (phone) | 390 Light | FIRST_WEEK says "NOVA → Permissions → Allow Health", but the phone NOVA has no visible Permissions entry. It can be reached only through a Health-closed reply's button (or `#nova-permissions`). | p11 log ("NOVA permissions direct count 0") | Add Permissions to NOVA's phone ⋯ menu, or reword the doc to "ask NOVA a Health question, then tap Open NOVA → Permissions". |
| FR-S-18 | Minor | Settings (phone) | 390 Light | FIRST_WEEK's "Settings → Your data → Restore" works, but the "Your data" link sits about 5,700 px down the phone Settings and Erase everything about 9,970 px down. The phone index names "Backups & restore" and "Import from other apps", while FRIENDS_GUIDE says "Switch to ZIGoals" and "Keep a protected copy". | ex2 log | Add "Your data (restore, report)" to the phone Settings index. Align the guide's names with the index. |
| FR-S-19 | Minor | Help | 390, 1440 | /app/help takes about 3.1 s to be usable (2,574 ms empty at 390; 3,078 ms Showcase at 390; 3,109 ms at 1440); everything else is 1.3–2.6 s. | pillars logs | For the lead's route weights. |
| FR-S-20 | Minor | Onboarding / setup | 390 Light | Mixed number formats on one screen in nl-NL: "1,5 L of water" next to "8,000 steps", and "2.000 mL" next to NOVA's "5,750 mL". | `p3-02-start.png`; nova log | Format every number with the locale. |

## Checked and fine
- Setup with Habits, Health and two focuses gives "You're set, Sanne", a "Drink water" habit (2 L, counted from the water journal) and "Lights out by 23:00". The first five has no hidden-page or second-setup prompt (F-1 and F-3 hold), and Goals joins the menu after "Set a goal".
- The meal sheet opens on "Just describe it"; she typed words alone and got "Logged in words … Calories unknown", and the first five ticks "Log a meal". The sleep form refuses a wake time later than now with a clear alert. The water habit ticks itself at 2 L ("Done automatically · from your water journal").
- NOVA is correct, in Dutch, after one "Allow Health": last night 8 h 30 min (estimated), average 7 h 55 min over 6 nights, Lights out 4 of 7, water streak (none, then 1 day), the missed water days, today's open habits, and the week's water total with a figures table. ZIGi: average sleep 7 h 55 min, "1 van 2 gewoontes", "Slaap: 9 h gisteren", the most consistent habit. No money advice; estimates are labelled.
- Past midnight (Mon 00:20): Today moves to the new day and offers "Yesterday, still open"; no wrong-day ticks.
- No page errors, no error boundaries, and no NaN, undefined, Infinity, null or [object Object] on any pillar (empty, own week or Showcase; 390 and 1440). No horizontal overflow after load. The only console errors are the walk's own 503 API fixture.
- Main actions above the fold at 390: Today (Open Health / Quick add, plus the "Set up in a minute · Start" pill on the empty profile), Habits (+ New habit), Health (Log water / Log food), Notes, Goals, Wealth, NOVA (the message field), ZIGi. At 1440 every pillar's main action is above 900 px except Journal on the Showcase (FR-S-8).
- Export everything (a 50 KB ZIP, with an "I understand" tick) → Erase (it names each area and store, "Type ERASE") → Restore (preview per part, Merge every part, confirm tick, "Undo this restore" for 7 days): 15 of 19 keys come back byte-identical. The other 4 are under FR-S-6.
- Light theme stays Light on every page (NOVA keeps its own dark stage, by design). Every pillar except Help loads in under 2.7 s at 390.
- Docs: "Just describe it", "Keep an average", "My day ends at" (Settings → Your app), "Hide calories and weight" (Health → Targets), Plan my day (a Tasks fold), Send feedback, "Restore a backup from Safari" and More → NOVA on the phone all exist as described.
- Environment note, not an app fault: opening ZIGi kills the renderer in Playwright's chromium-headless-shell ("No binder found for interface media.mojom.OnDeviceSpeechRecognition", bad-IPC termination). Full Chromium (`channel: 'chromium'`) and real Chrome open it fine. Other helpers using the default `chromium.launch()` will hit this.

## Walk: tom-jules


The walks, the scripts and the screenshots are in `fr-tom-jules/`, and `<prefix>.log` holds each run's output and answers.
- **Tom** (gym and food): an empty profile at 390 Dark (t1–t7, c1, z1) and at 1440 Nebula (d2–d4), then the Showcase at 390 Dark (sct, sct2).
- **Jules** (crypto, careful with money): an empty profile at 390 Light (j1–j5) and at 1440 Nebula (jd1, j7), then the Showcase at 390 Light (scj) and at 1440 Nebula (scd).
- **Timeline:** clock Mon 23 Nov 07:00 → Sun 29 Nov 23:55 → Mon 30 Nov 00:05, Europe/Amsterdam, locale en-NL.
- **Browser:** headless Chromium (channel `chromium`). The default headless shell crashes when ZIGi opens on every page (t6.log). That is a property of this sandbox and is not counted below.
- **APIs:** the server's `/api` routes answer 503 here (quotes, Earn, validators). The only console errors seen were those 503s. mempool.space answered.

Prefix map: `t*` / `c1` / `z1` = Tom on the phone, `d*` = Tom on the desktop, `j*` = Jules on the phone, `jd*` / `j7` = Jules on the desktop, `sc*` = Showcase.

| Id | Sev | Page | Width / theme / profile | What a friend meets | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| FR-TJ-1 | Major | /app/nova → Permissions | 390 Dark, 1440 Nebula · empty, Showcase, after restore | A Health question gets "Health is off for NOVA … Turn on Health in NOVA → Permissions, with Health page data and Include Health there (Include Health works once Health is on your Today page)", which is still the three-switch wording. "Open NOVA → Permissions" opens a list of switches, and **Allow Health** sits below the fold (y 1333 at 390, y 925 at 1440). The first Health switch Tom sees (y 578) turns on NOVA's scope only. After that, NOVA still refuses with "Health is on for NOVA, but Health sharing is off… turn on Health page data and Include Health". | t3-n1-health-off.png, t3-n2-permissions.png, t3b-health-switch-flipped.png, t3b.log, d3b.log | When the panel is opened from a refusal, put Allow Health first (scroll to it and focus it). Make the reply say "tap Allow Health". |
| FR-TJ-2 | Major | NOVA and ZIGi | all · empty and Showcase · en-NL and nl-NL | "Hoeveel water heb ik vandaag gedronken?" is answered in English: "You logged 250 mL of water today (Mon, 23 Nov)". The other Dutch Health questions in the same chat are answered in Dutch. | t3.log, z1-en-NL.log, z1-nl-NL.log, sct2.log | Add the Dutch water reply (corpus case). |
| FR-TJ-3 | Major | NOVA and ZIGi | all · empty | Tom logged breakfast with Log a meal → Just describe it, and Health shows "Logged in words … Calories unknown" (t2-a8). Then "What did I eat today?" answers "Nothing is logged in your food diary today", "Wat heb ik vandaag gegeten?" answers "Er staat vandaag niets in je eetdagboek", "Hoeveel calorieën…" answers "Nog geen eten gelogd", and "calories today" answers "no entries". All four are wrong. The guide's AU update covers this only as "ZIGi and NOVA don't read it". | z1-*.log, t3.log, t2-a8-meal-logged.png | Read `zigoals:meal-words:v1` and answer "1 meal in words (Breakfast: …); calories unknown". |
| FR-TJ-4 | Major (a reader could rate it Blocker) | NOVA and ZIGi answers | all · Showcase and empty · en-NL | Number formats are mixed within one locale. Some answers use en-US style: "1,970 kcal", "137.6 g", "1,000 mL", "65,000 USD". Others use the device's style: "1.850 kcal", "73,48 kg", "US$501.800,00". With a decimal comma, "1,000 mL" reads as 1 mL and "1,970 kcal" as about 2 kcal. | sct2.log (calories today, protein yesterday, water), scj.log (bitcoin worth) | Use the locale formatter for every figure in the energy, protein, water and Portfolio-price answers. |
| FR-TJ-5 | Major | NOVA and ZIGi | 390 Light, 1440 · empty | Jules watches a Bitcoin address. Wealth's linked wallets and Portfolio show 0,182342 BTC. Yet "How much BTC do I have?" answers "You have no BTC recorded in Wealth". "What is bitcoin worth today?" answers "BTC is not tracked in Wealth or Portfolio". "What is my net worth?" answers "No holdings are tracked". The NL answers say the same. | j1-fail-search_watch.png (0,182342 BTC), j2.log, j5.log | Name the watched address's BTC (view-only, its read time, value unknown without a price). |
| FR-TJ-6 | Major | Wealth and Health deep links | 390, 1440 · empty | Links land at the wrong spot on a page. **Search → "Watch a Bitcoin address (view-only)"** lands at Wealth's footer on the phone (scrollY 4772, with the form 2695 px above) and on "What you have" at 1440 (the form 1312 px down). This undoes the fix proven for J-6. **First five → "Log an expense or income"** goes to `/app/wealth#spending` and ends at the footer on the phone (scrollY 5790, #spending at 3471). At 1440 it stops 1700 px above #spending. **First five → "Log a meal"** stays at the top of Health (scrollY 0, target at 2893). Cause: the jump happens before the lazy sections render, and then the page grows. | j1-a3-after-search.png, jd1-a3-after-search.png, j2-a1-expense-landing.png, j3.log, j3d.log, j3m.log | Re-scroll to the hash target once its section has mounted (or scroll it into view on mount), and focus the first field. |
| FR-TJ-7 | Major | /app/habits | 390, 1440 · empty and Showcase | With one habit, its **Complete** button is at y 1680–2004 at 390 and y 2570 at 1440; in the Showcase it is at 2004 at 390 and 2461 at 1440. Above it: three empty groups ("No morning/afternoon/evening habit yet. Add one"), Today's rhythm, Habit ideas, and Reorder/Cards/Compact. At 1440 there are also placeholder cards: "Your week in motion" (all 0) and "Trend per habit · Not enough days yet". | c1-habits-crop.png, d4-habits-crop.png, c1.log, d4.log | Hide empty time-of-day groups. Put today's list above the insight cards, or fold the cards until data exists. |
| FR-TJ-8 | Major | /app/tasks | 390 · empty and Showcase | The **New task** field is at y 966 (1242 in the Showcase). It sits below the lane-2 chip rows: Inbox…Completed, "Plan and views", "Projects", "Priority". | c1-tasks-crop.png, sct.log | Put New task above the views, and fold Plan and views / Projects / Priority under one "Views" control. |
| FR-TJ-9 | Major | /app/journal | 390, 1440 · empty and Showcase | **Today's entry** is at y 1391 at 390 and 1163 at 1440; in the Showcase it is at 2118 at 390 and 1792 at 1440. "Three good things" is open by default with three fields and a Save button, and "Today's question" also sits above the entry. | t1-p-todayjournal.png, d4-journal-crop.png, c1.log | Close Three good things by default and keep the entry box first. |
| FR-TJ-10 | Major | /app/health (Tom's workouts) | 390, 1440 · empty | Tom's main thing is hard to find. On Health it is a closed "Workouts · Show" fold at about y 4300 of 5428 at 390 (card at 5419 at 1440). It is not one of the Health views tabs. Search "workouts" offers templates and Help only, not the Workouts page. | c1-health-crop3.png, dc.log (Search "workouts"), d4.log | Add a Workouts tab (or a hero button) on Health, and a Search entry "Workouts (Health)". |
| FR-TJ-11 | Major | /app/settings | 390, 1440 · empty | The guide (8g) says "Settings → Load Showcase Demo". The button is at y 19027 on the phone and y 5900 at 1440. Search "showcase" finds only Help entries. | sct.log, scd.log, scd-0-settings.png, dc.log | Add a Settings index row and a Search result for Load Showcase Demo. |
| FR-TJ-12 | Minor | /app/health | 390 · empty | The hero's **Log food** scrolls to another card with its own "Log a meal" button, so it takes a second tap to reach the form. | t2-a6-logfood.png, t2-a6b-logameal.png | Open the Log a meal sheet directly. |
| FR-TJ-13 | Minor | Restore → NOVA | 390 · Tom | After Export → Erase → Restore, NOVA's Health scope comes back On, but ZIGi's Health gate (`zigoals:ai:v1`, never restored) does not. Every Health answer then says "Health is on for NOVA, but Health sharing is off…" with the two-switch wording. | t7.log (after restore) | Restore NOVA's Health scope as Off too, or show Allow Health after a restore. |
| FR-TJ-14 | Minor | Restore and FRIENDS_GUIDE | 1440 · Jules | Two things do not come back after a restore: the watched Bitcoin address, and the Light or Dark theme (it returns to Nebula). The preview's "Never restored: …" says so. The guide's 18 Nov update lists only AI settings and keys, display choices, Earn progress and the staking journal. | j7.log (MISSING `linked-wallets`, `ui-prefs`), t7.log | Name "watched wallet addresses" in FRIENDS_GUIDE part 9 (or restore the public address, which is not a secret). |
| FR-TJ-15 | Minor | /app/settings | 390, 1440 | Restoring an Export-everything ZIP happens only on Settings → Your data. The index row a friend would pick, "Backups & restore", holds encrypted and per-area restores only. The "Your data" door is at y 5742 on the phone and not visible in folded Settings at 1440. | t7-s1-settings.png, t7.log, j7.log | Add "Restore from a backup (Export everything ZIP)" to Backups & restore, linking to Your data#restore. |
| FR-TJ-16 | Minor | NOVA and ZIGi (NL) | all | Dutch answers name screens that do not exist: "Vermogen → Uitgaven" and "Markten", while the app says Wealth, Spending and Markets. Another Dutch answer says "Wealth → + Add asset". | j2.log, j5.log, scj.log | Keep the app's English screen names in Dutch answers (as NOVA_PERMISSIONS_NL already does). |
| FR-TJ-17 | Minor | NOVA and ZIGi | all | "What is my gym streak?" is answered as workout weeks, although Tom has a habit called Gym. The answer also says "your longest run is 1 weeks". | t5.log | Prefer a habit whose name matches, and fix the plural. |
| FR-TJ-18 | Minor | /app/habits (empty) | 390 | With no habits, the page says "Create your first one below" while + New habit is above, and shows a Vacation button. | t1-p-todayhabits.png | Change the copy to "above", and hide Vacation until a habit exists. |
| FR-TJ-19 | Minor | Top bar | 390 Light | The top-left logo is almost invisible on the light background. | j1-a1-today.png, j2-a1-expense-landing.png | Give the logo a light-theme variant or more contrast. |
| FR-TJ-20 | Minor | /app/health Diary | 390 | The "Portions today" card is mostly empty space, with one link in it. | c1-health-crop2.png | Shrink the card to its content. |
| FR-TJ-21 | Minor | FRIENDS_GUIDE part 8 | 390 | The guide says "On a phone… ZIGi is the one floating button". At 390 there is no floating ZIGi; it opens from the Apps & extras sheet. ("More → NOVA" is correct.) | dc.log, dc-apps.png | Update part 8, or mark it as history. |
| FR-TJ-22 | Minor | Performance | 390, 1440 · Showcase | Time to usable is over 3 s on two Showcase pages: Wealth takes 3.6 s at 390 and 4.0 s at 1440, Today 2.7–3.9 s. Every empty-profile page is 1.0–2.9 s. | sct.log, scd.log, c1.log | For the lead's route weights. |
| FR-TJ-23 | Minor | /app/goals/tracked/… | 390 · Jules | Within two minutes Jules found no way to put €100 toward "First 0.01 BTC". The page offers only "Link your wealth →" and "⋯". | j4-goal.png, j2.log | Add a visible "Add money to this goal". |
| FR-TJ-24 | Minor | /app (first five) | 390, 1440 · empty | "Your first five" starts at y 626–932 at 390 (Jules 932) and y 921 at 1440, so its first open step is below the fold under the protected hero. | t2.log, j1.log, jd1.log, t1-01-today-after-setup.png | Leave it: the hero is protected. The steps could show as a compact line in the top bar instead. |

## Checked and fine

- **Setup, first five and theme.** The setup worked for both personas, and the first five ticked itself for a habit, a meal in words, a goal and an expense. The Dark and Light themes held on every page (`data-theme`).
- **Errors and odd text.** No page errors and no error boundaries. No NaN, undefined, Infinity or `[object Object]` on any scanned page, and no sideways overflow at 390.
- **Tom's records** saved and read back correctly:
  - squat 80×5 and bench 60×8, with the set row inside its card at 390;
  - a GPX run: preview "5 km, 30:00, 6:00/km, 5 splits";
  - water, weights, and "Just the calories" with protein.
- **NOVA and ZIGi agree with Tom's records:**
  - run: 5 km;
  - workouts: 3, 75 min;
  - weight: 85,8 kg, down 0,6 kg;
  - calories: 1.850 kcal this week, 617 a day on 3 days;
  - protein on Friday: 45 g;
  - best squat: 80×5, with "an estimated one-rep max of 93 kg";
  - Gym: checked in 3 times.
  The Dutch run, workouts, weight and protein answers were in Dutch.
- **NOVA agrees with the Showcase's records:** 1970 kcal, 137.6 g protein, 1000 mL water, 73.48 kg, sleep 7 h 17 min, 2 workouts / 83 min. All were checked against the session-storage records (`sct2-storage.json`).
- **Jules's money answers:**
  - Showcase net worth matches Wealth (US$501.800,00 + €8.000,00).
  - The emergency-fund date is said to be "an estimate … not a promise".
  - Spending: €12,50.
  - Staking: no figure without a measured rate. "Is staking safe?" gives the facts (slashing, unbonding).
  - "Should I buy bitcoin" is refused, so no advice is given.
- **After midnight (00:05 Mon):** Today and Habits start the new day, NOVA's "What day is it?" says Monday 30 Nov, and the 23:55 Gym tick counts as yesterday.
- **Export → Erase → Restore** brings back everything both personas made. The only records left out are display choices, ZIGi settings, the watched address and setup flags, and the preview lists them.
  - Tom: 18 keys → 0 → 14. Habits, check-ins, 5 weights, 3 meals, water, workouts, splits and the meal in words all came back.
  - Jules: his goal and his spending came back.
- **The docs' paths exist:**
  - Health → Targets → Hide calories and weight;
  - Settings → My day ends at;
  - Settings → Export everything (in the phone's Settings index);
  - Your data → Restore from a backup;
  - "Not recorded";
  - Help → Send feedback, What's new, Take the 1-minute tour;
  - Workouts → Calendar;
  - ⋯ → NOVA;
  - Search "watch" offers the view-only address.
- **The watch-only address** read mempool.space, and its value shows as "unavailable", not 0. No signing requests were made.

## Walk: lina


Build: `feature/session-av-2` `9db304c9` at http://127.0.0.1:3101. Lina's week: Mon 23 Nov to Sun 29 Nov 2026, then past midnight into Tue 1 Dec (the rent is due that day), Europe/Amsterdam, browser locale nl-NL.
- **Profiles:** an EMPTY profile, then the SHOWCASE.
- **Widths and themes:** 390×844 (isMobile, touch) in **Dark**, and 1440×900 in **Nebula**. Each pillar was also swept at 390 Nebula and 1440 Dark.
- **What she did on the empty profile:**
  - The setup: Goals & money, the habit "Review your budget", and the goal "Noodfonds" (€3,000).
  - A bank CSV with 14 rows: rent, a phone bill that went from €15.00 to €17.50, a grocer, Albert Heijn, a bakkerij and a salary.
  - A €250 Groceries budget, then she confirmed the phone and rent bills.
  - A lunch logged by hand, then €200 put into the goal.
  - NOVA and ZIGi asked 10 questions in EN and 10 in NL. Export, then Erase, then Restore.
- **Files:**
  - Scripts and screenshots: `/tmp/claude-0/-home-user-ZIGoals/04cd60ac-4211-5372-87a4-15f012c2e70f/scratchpad/fr-lina/`. Screenshots are in `shots/`.
  - Answers: `answers-*.txt`.
  - The Showcase's money records: `showcase-records.json`.

**Environment note, not an app finding:** the default `chromium.launch()` (headless shell) crashes the page ("Page crashed") whenever ZIGi opens, at 390 and 1440, even on a fresh profile. The same steps with `channel: 'chrome'` (full Chromium) work. ZIGi runs used `CH=chrome`.

| Id | Sev | Page | Width / theme / profile | What a friend meets | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| FR-L-1 | **Blocker** | /app/wealth → Upcoming bills; NOVA / ZIGi | all / empty | **The phone bill is saved at €16.25, a price she never paid.** The payments were €15.00, €15.00, €17.50 and €17.50; €16.25 is their median, and the bill is stored as `"amount":"16.25"`. Then:<br>• Bills → This month says "Fictional Phone · Wed, 4 Nov · € 16,25 · date passed, not in your money log", although €17.50 was paid on 4 Nov.<br>• "A typical month (an estimate)" shows €966.25 and "A year of these bills" €11,595.00; both should use €17.50.<br>• NOVA and ZIGi "Hoeveel geef ik per maand uit aan vaste lasten?" both answer €966.25.<br>• "What bills are due today?" lists the phone at €16.25.<br>This comes from the L-4 stepped-bill path. | `shots/w-390-dark-empty-d1-bills.png`; state `state-week-390-dark-empty.json` (`zigoals:bills:v1`); `lib/bills/detect.ts:44,83` (median of the series) | When the amounts step up (a detected price change), offer and save the latest amount, and match "paid" against the latest amount. |
| FR-L-2 | Major | Bills → Price changes; NOVA and ZIGi "did any bill go up?" (EN + NL) | all / empty | "Fictional Grocer went up by € 6,35 since Nov 2026 (€ 48,75 then, € 55,10 now)" appears under Price changes before she has confirmed anything, and stays after. NOVA and ZIGi then answer "Fictional Phone … and Fictional Grocer went up…". Three grocery trips are not a bill. | Wealth text in the run log; `answers-*-questions.txt` Q4, NL Q4 / ZIGi Q14 | Show price changes only for confirmed bills, or at least only for monthly or longer candidates. Leave weekly shopping out. |
| FR-L-3 | Major | /app/nova, ZIGi | all / empty | "Hoeveel is er nog over van mijn boodschappenbudget?" gets the generic fallback ("Tot je me een brein geeft… voorlopig in het Engels", with English examples) in both NOVA and ZIGi. The English "How much is left in my groceries budget?" gets the right answer (€ 54,65 left of € 250,00). | `answers-nova-desk-nebula-…-vragen.txt` Q3; ZIGi Q13 | Add "boodschappenbudget / budget over / nog over" to the corpus, with "boodschappen" mapped to Groceries. |
| FR-L-4 | Major | /app/wealth | 390 Dark + Nebula, 1440 / both | **Lina's daily action, "Log spending", is far below the fold.**<br>• 390: y = 2103 to 2551 on the empty profile, 4416 on the Showcase.<br>• 1440: y = 1593 to 2494 on the empty profile, 6833 on the Showcase.<br>• The first screen offers "+ Add asset".<br>• Quick add has no Expense tile. A typed "spent 12.50 on lunch" or "€8,40 koffie" works, but nothing tells her she can type it. | `shots/p-390-dark-empty_app_wealth.png`, `s-390-dark-show_app_wealth.png`; s3 / s7 logs | Put a "Log spending" (or "Import from your bank") button beside Add asset in Wealth's hero, or add an "Expense" tile to Quick add. |
| FR-L-5 | Major | /app/tasks | 390 / both | "Add task" is below the fold: y = 1084 on the empty profile, 1296 on the Showcase. The hero, two link rows (agenda/checklist; Shortcuts · Import/export · Files), an explainer and about 14 view chips ("Plan and views", "Projects") come first. At 1440 it sits at 597 and 708. | `shots/p-390-dark-empty_app_tasks.png`, `s-390-dark-show_app_tasks.png` | Put the add field directly under the title, and fold the views and links into one "Views" row on a phone. |
| FR-L-6 | Major | /app/journal | 390 (and 1440) / Showcase | With entries, the "On this day" card comes before "Write". "Write" is at y = 1056 on the phone (965 at 1440). On the empty profile it is at about 400. | `shots/s-390-dark-show_app_journal.png` | Put Write first, or fold "On this day" into one line under it. |
| FR-L-7 | Major | Settings → Your data → Restore from a backup | 390 Dark, 1440 / empty | FIRST_WEEK, the keep-data card and Help all say "Settings → Your data → Restore from a backup". Finding it:<br>• The phone Settings list has no "Your data" row. It has Backups & restore, Privacy & storage, Export everything and Import. The "Your data" link card is at y ≈ 5740 of the long page.<br>• "Backups & restore" opens the encrypted backup and per-area restores, not the ZIP restore.<br>• On /app/settings/data the "Restore from a backup" region is at y ≈ 6730 at 390 and ≈ 5100 at 1440, with no jump link. That is about 8 screens of Alpha notes first.<br>This is the iPhone/Safari restore path. | `shots/settings-data-390.png`, probe6 log | Add a "Your data / Restore from a backup" row to the phone Settings list, and put Restore at the top of /app/settings/data (or give the page a jump link). |
| FR-L-8 | Major | FRIENDS_GUIDE.md §8 | 390 | "On a phone: … ZIGi is the one floating button". On a phone there is no ZIGi floating button (0 found); ZIGi opens from the top bar's Apps & extras. Help says Apps & extras, which is right. | probe7 log; `shots/apps-extras-390.png` | Update the line to "ZIGi is in Apps & extras (top bar)". |
| FR-L-9 | Minor | Import preview (Wealth) | 390 / empty | The Category column the doc promises is off-screen. The table is 473 px inside a 352 px sideways-scroll box with no hint; only a 24 px sliver of the select shows. The line "Possible repeats and rows already in your log start unticked" is also clipped at the right edge. | `shots/crop-import-preview.png`, probe8 log | Stack Payee and Category on a phone, or show a scroll hint. Wrap the intro line. |
| FR-L-10 | Minor | Restore from a backup | 390 / empty after Erase | On an emptied device all 9 parts default to "Leave as it is" ("This device: Nothing here yet"), and the confirm box stays disabled until she finds "Merge every part" or sets each dropdown. | `shots/data-390-dark-empty-restore-preview.png` | Default to Merge for each part the device does not hold yet. |
| FR-L-11 | Minor | ZIGi (NL) | 390 Dark | Dutch answers mix formats. Some use "Je gaf deze maand 1,175.35 EUR uit" and "Groceries 195.35 EUR", others "€ 1.175,35". To a Dutch reader, "1,175.35" reads as about €1. | ZIGi answers Q11 and Q17 | Use one locale format in the spend answers (as NOVA does: € 1.175,35). |
| FR-L-12 | Minor | NOVA / ZIGi vs Goals | all | "Noodfonds: € 200,00 van € 3.000,00 (6%)" in NOVA and ZIGi, but Goals shows 7 % (6.67 %). | answers Q19; `shots/w-390-dark-empty-d4-goals.png` | Round the same way everywhere. |
| FR-L-13 | Minor | NOVA / ZIGi | all | "How much have I saved for my emergency fund?" gets "No goal is called 'emergency fund'. Your goals: Noodfonds." She picked "A safety net" in the setup. | answers Q9 | Match the setup kind (safety net / emergency fund / noodfonds) to the goal. |
| FR-L-14 | Minor | Import categories | all | "Fictional Phone" is imported as Other, so the confirmed bill and its spending sit under Other, not Bills. | `log cats` in the s2 log | Suggest Bills for a confirmed monthly bill's payee. |
| FR-L-15 | Minor | Quick add "Type a line" | 390 | "boodschappen 23,10" gives "I didn't understand that yet"; "€8,40 koffie" and "spent 12.50 on lunch" work. | probe3 log | Read a Dutch category word plus an amount as spending. |
| FR-L-16 | Minor | /app/goals/… "Fund Goal" | 390 | Putting money into the goal is deep in the goal page: "Fund Goal" at y = 3392, "Record contribution" at 5386. Quick add → Contribution is the shorter route. | probe log, `shots/w-390-dark-empty-d4-contrib-preview.png` | Put "Add money" in the goal hero beside "Set up a saving plan". |
| FR-L-17 | Minor | FRIENDS_GUIDE.md §8 | 390 | "Erase everything … at the end of Settings → Backup & restore". The phone list has no Erase row, and Erase sits after "Bring your history with you", not at the end of Backup & restore. | probe5 / s6 headings | Name it "Settings → Data & privacy → Erase everything", or add a row. |
| FR-L-18 | Minor | Bills → Price changes wording | all | "went up by € 2,50 since Sept 2026 (€ 15,00 then…)". The rise was in October; "since Sept" reads as if it rose in September. The Showcase's Streaming answer reads the same way ("since Aug"). | Wealth text, NOVA answers | Say "in Oct 2026 (was € 15,00)". |

**Counts:** 1 Blocker, 7 Major, 10 Minor.

## Checked and fine
- **No crashes or broken text:**
  - No page errors and no "could not be opened".
  - No NaN, undefined, Infinity or null on any pillar at 390 or 1440, in Dark or Nebula, empty or Showcase.
  - No horizontal overflow.
  - The only console errors were the 503s from the walk's own /api routing.
- **First screens:** these main actions sit above the fold on a phone: Today "+ Quick add" at 404, Habits "+ New habit" at 375, Health "Log food" at 340–447, Notes field at 494–597, Goals "+ Create a goal" at 361, NOVA "Message NOVA" at 780–794. On her very first visit "Start setup" is at 886, but a sticky "Set up in a minute · Start" bar is on screen.
- **Setup and first five:** the setup (Goals & money, habit, €3,000 EUR goal) worked. The first five ticked itself (5 of 5 after the import). The menu became Today · Goals · Habits · Wealth · Activity.
- **The money figures are right** where FR-L-1 does not touch them:
  - **Import:** 14 rows read and added. Grocer, Albert Heijn and Bakkerij were filed under Groceries (the L-2 fix holds).
  - **Budget and spending:**
    - Groceries: € 195,35 of € 250, € 54,65 left.
    - Ready to assign: € 2.400.
    - Month spent: € 1.175,35; last month € 967,50 (+€ 207,85).
    - Week spent: € 12,50.
    - Income: € 2.650.
    - Next bill: Rent on 1 Dec.
    - "No pace yet" when the goal pace is unknown, not 0.
    - Estimates are labelled as estimates.
  - **The same figures in NOVA and ZIGi**, in EN and NL apart from FR-L-3.
  - **The Showcase's NOVA answers** were checked against its records: € 526,78 month, € 226,80 groceries, € 58,40 week, € 113,19 last month, budgets left € 23,20 / 48,40 / 36,00, Streaming 12,99→13,99, Rent € 950 in 6 days. The emergency-fund estimate says "an estimate…not a promise".
- **Past midnight into 1 Dec:**
  - The late 23:50 entry kept its 30 Nov date.
  - The budget moved to Dec 2026, and "this month" is nothing.
  - "Due now: Fictional Rent Co · Today" shows with "Record it".
  - NOVA "What day is it?" answers Tuesday 1 Dec.
- **Export → Erase → Restore** (390 Dark):
  - The ZIP was 30 KB.
  - Erase left 0 keys and the setup card came back.
  - After "Merge every part" the restore brought back 13 of 15 keys, and every record she made: goals, money log, bills, budgets, habits, review inbox. Wealth, Goals, Habits and Today looked the same on screen.
  - The 3 keys not brought back are the onboarding flags and a market-insights cache; the first five and the menu stayed as they were.
- **Docs that match the app:**
  - Import from your bank: CSV and bank file, with a category select in the preview (see FR-L-9 on a phone).
  - "Bills that come back are offered".
  - "A year of these bills (an estimate)".
  - Settings → Export everything is a phone row.
  - More → NOVA.
  - The NOVA example questions.
- **Speed:** every page was usable in under about 2 s at 390 without throttling. Measured with an 800 ms settle included: 1.2–2.7 s, slowest Wealth on the Showcase at 2.7 s.

## Walk: max


Build: http://127.0.0.1:3101 (`feature/session-av-2` @ 9db304c9). Week: Mon 23 Nov 21:30 to Sun 29 Nov 01:00 (Europe/Amsterdam), using Playwright's clock.
- **Empty profile**: 390×844 phone (isMobile, touch) in **Light**, and 1440×900 in **Nebula**. Max did the setup with Habits, set Settings → My day ends at 3:00 and "A day counts as done at" 3 dots. He made the habits Read 20 pages and Stretch, plus the Checklist items Plan tomorrow and Tidy desk (all four on the path). He added 3 tasks in words. He ticked habits after midnight on most nights, ticked a task at Wed 00:40 and wrote a journal entry at Wed 00:45.
- **Showcase**: 390 Light and 1440 Nebula, at Tue 01:30.

Scripts, logs and screenshots are in `fr-max/` (screenshots in `fr-max/shots/`, logs `fr-max/s*.log` and `fr-max/q-*.out`).
Note: Playwright's default `chromium.launch()` (chrome-headless-shell) **crashes the renderer whenever ZIGi opens** (phone and 1440, fresh or seeded, with or without the clock). Full Chromium (`channel: 'chromium'`) opens it fine, and all ZIGi results below use full Chromium. This is probably the environment, not the app, but the lead may want to know.

| Id | Severity | Page | Width / theme / profile | What a friend meets | Evidence (screenshot, steps) | Suggested fix |
|---|---|---|---|---|---|---|
| FR-MAX-1 | Major | /app/checklist, NOVA, ZIGi | 390 Light and 1440 Nebula, empty | Max ticks his habits on **Habits** (or on Today's habits card), not by tapping the planets. The Checklist then **never keeps a day**: the streak flame stays 0, "Orbit consistency" is empty for Mon (3 of 4, which counts under his 3-dot rule), and NOVA and ZIGi answer "How many days this week did I finish my checklist?" with "no earlier day kept yet". The right answer is Mon (3 of 4) and Tue (4 of 4). The same 3 ticks made by tapping the planets are kept, and NOVA then says "done on 1 of 1 day: Mon 23 Nov (3 of 4)". `zigoals:checklist-days:v1` stays null for the whole week. | `shots/p-light-empty-60-ck-tue-via-habits.png` vs `-via-path.png`; `s8-habits.log`; `s7-p-light-empty.log`; `q-s15.out`. Steps: path with 4 habit items, tick 3 on /app/habits Mon 23:50, open Checklist Tue 12:00. Cause: `components/checklist/use-checklist.ts` seals only a held `days.today`, and `lib/checklist/day.ts` `sealDay` has nothing to seal when no path tick ever started one. | When no day is held, seal the previous day(s) from the derived dots (the habits record), as the backfill already does for the gap days. Or let any habit tick start today's entry. |
| FR-MAX-2 | Major | /app/tasks | 390 Light, empty and Showcase | The **New task** field is below the fold: top 966 px on the empty profile and 1242 px on the Showcase. Above it are 5 link rows, the view chips, lane 2's "Plan and views" chips, Projects and Priority. | `shots/p-light-empty-10-tasks.png`, `p-light-empty-22-tasks-scrolled.png`, `p-light-show-80-tasks.png`; `q-s14-pl.out` | On a phone, put the New task field first (under the title) and fold "Plan and views", Projects and Priority into one "Views" disclosure. |
| FR-MAX-3 | Major | /app/journal | 390 Light, Showcase (also 1440 Nebula Showcase: 965 > 900) | **Write** starts at 1056 px. The "On this day" card ("1 year ago and 1 more", with lane 2's day stepper) fills the first screen. On the empty profile Write is at about 343 px, so this hits only once there are memories. | `shots/p-light-show-80-journal.png`; `q-s14-pl.out`, `q-s14-dn.out` | Put Write first, or fold On this day into one line ("1 year ago today · Show"). |
| FR-MAX-4 | Major | /app/nova, ZIGi | all | Asking when a task is due fails. "When is Email Sam due?" gets **"No goal is called 'Email Sam'. You have no goals yet…"** (NOVA and ZIGi). "When is the dentist?" and "Wanneer is de tandarts?" (Showcase task "Book the dentist", Tue 10:30) get "That isn't something I can answer". "Wanneer moet ik Sam mailen?" gets the generic English fallback. | `s9-p-light-empty.log`, `q-s15.out`, `q-s18.out`, `q-s18d.out` | Find an open task by title words for "when is / wanneer" before the goal lookup, and answer with its due day and time. |
| FR-MAX-5 | Major | /app/nova, ZIGi | all, empty | The streak start date is wrong while today is still open. "What is my streak for Read 20 pages?" says "2 days … **The current one runs since Fri 27 Nov**", but the 2 days are Thu 26 and Fri 27, so it should say since Thu 26. The same happens every morning before a habit is ticked. | `s7-p-light-empty.log`, `s9-p-light-empty.log`. Cause: `lib/ai/tools/habits.ts` `streakSince` counts back from today and assumes today is in the streak. | Count back from the streak's last day (yesterday when today is open). |
| FR-MAX-6 | Minor | /app/nova, ZIGi | all, empty | "Which habit do I skip most this month?" is an example question in FRIENDS_GUIDE 8g. It answers "**You skipped no habit this month**" although Tidy desk was missed 4 days, because "skip" only means planned skips. | `s7-p-light-empty.log` | When there are no planned skips, add "Missed most: Tidy desk (4 days)", or change the guide's example to "miss". |
| FR-MAX-7 | Minor | /app/journal | 390 Light, empty | At Wed 00:45 (still Tuesday for Max), the entry "Long Tuesday, finished the library book." and its energy are filed under **Wed 25 Nov**. The My day ends at text names habits, Checklist, streaks and Tasks, and Help says meditation follows it, but the Journal does not. | `shots/p-light-empty-62-journal-saved.png`; `q-s16.out` | Let the Journal's "today" follow My day ends at, or say "the Journal keeps the calendar day" under the setting. |
| FR-MAX-8 | Minor | Settings → My day ends at | 390 Light, Showcase | When it is chosen at 01:30, nothing changes tonight: NOVA still says "It's Tuesday", and Monday's task is still Overdue. The status line only says "Your day now ends at 3:00." This matches the stated rule, but Max sets it exactly when he needs it and sees nothing happen. | `q-s18.out` (NOVA@3:00 lines) | Status: "From tonight on. Today already started at midnight." |
| FR-MAX-9 | Minor | Help, FRIENDS_GUIDE | 390 | Help ("Can a day count as done before every dot is lit?") and the guide send him to "Settings → Your app → Checklist → A day counts as done at". On a phone there is no Checklist row: the setting sits under **Pages & start page**. | `shots/p-light-empty-24-daygoal.png`; `s3.log` | Add a phone row "Checklist: A day counts as done at" (target `day-goal`), or name "Pages & start page" in the docs for phones. |
| FR-MAX-10 | Minor | Settings → restore | 390 Light | On a phone, "**Backups & restore**" opens the encrypted backup, not the Export-everything restore. The ZIP restore is behind the "Your data" link, about 6000 px down /app/settings/data. In the preview every part starts as "Leave as it is", so a restore without first pressing "Merge every part" is not possible (the confirm box is not there). After Merge every part, everything Max made came back (15 of 16 keys: habits and check-ins, tasks, Checklist path, day-ends, day-goal, energy). Not restored: the onboarding "seen" flag and the celebrations record. | `shots/p-light-empty-71-backups-row.png`, `p-light-empty-72-restore-preview.png`, `p-light-empty-76-restored.png`; `q-s17.out`, `s13.out` | Add a "Restore from a backup" link in the Backups & restore section. On the data page, put the restore near the top on phones. |
| FR-MAX-11 | Minor | /app/nova | 1440 Nebula, empty | The "Habits by day" widget shows "4 days NOT DONE · THIS WEEK" (correct: Mon, Wed, Thu, Fri) above a large empty panel. | `shots/d-nebula-empty-93-nova-misses-wait.png` | Fill it with the day strip, or shrink the widget to its content. |
| FR-MAX-12 | Minor | /app/nova | 1440 | "What did I finish this week?" gets "That isn't something I can answer", although What's new lists "tasks finished per day". | `q-s15.out` | Answer it from the tasks done log (`task-plan` `doneLog`) and the habits. |
| FR-MAX-13 | Minor | /app/tasks | 390 | Known M-11 is still there: "Email Sam about the weekend" is saved as "Email Sam about", due Sat. The preview does show it ("Keep as text" is offered). Its title then breaks FR-MAX-4's question. | `s3.log` | (Holds per AU; listed for completeness.) |

## Checked and fine
- **Night owl rules** (empty profile, 390 Light and 1440 Nebula):
  - At Tue 01:30, Today's line says "2 of 4 habits" and the Checklist says "3 of 4 · Mon 23 Nov".
  - Habits ticked after midnight are filed on his day (entries 23, 24, 26, 27).
  - Monday's task is in Today at 01:30, not Overdue, and becomes Overdue at 03:05. Today's line reads "0 of 4" after 03:00.
- **NOVA and ZIGi, EN and NL, figures checked against the records**:
  - "What day is it?" / "Welke dag is het?" (Saturday 28 for him, calendar Sunday).
  - Habits missed this week: 4 of 4 habits, 10 missed days (Tidy 4, Plan 3, Stretch 2, Read 1). This is correct, and the Misses per habit widget matches.
  - Overdue (none, 2 open) and "what is left today" (EN and NL).
  - Tasks tomorrow (Plan the week, Sun 29).
  - "Did I stretch today?" and streak lengths (2 days).
  - Showcase: overdue "Sketch the garden bed", due today "Book the dentist 10:30", Checklist "Mon 23 Nov 5 of 5", Read streak 26 days since 30 Oct (correct, because today is ticked) and the Dutch overdue answer.
- **Errors and odd values**: no page errors, no app console errors (only the routed 503s) and no error boundaries. No NaN, undefined, Infinity or null in page text on any pillar page in either profile, at either width. No horizontal overflow.
- **Main action above the fold**: on the phone, Today (Quick add / First five), Habits (+ New habit 311–376), Health (Log food 340–383), Wealth (377), Notes (Save to inbox 574–741), NOVA (input 780) and Checklist are all above the fold. At 1440 every pillar's action is above 900, except the Showcase Journal (FR-MAX-3).
- **Speed**: every page was usable within 0.5–1.4 s at 390 and 1440, with no throttling. Nothing felt slow.
- **Export, Erase and Restore**: Export everything (25 KB ZIP) → Erase everything ("Erased 17 records and 29 stores") → Restore with "Merge every part" brought back every record Max made (see FR-MAX-10 for the two flags and the path).
- **Docs**: FIRST_WEEK "Settings → My day ends at" exists as a phone row. "Settings → Your data → Restore from a backup" exists ("Your data" link). "Plan my day" exists in Tasks. The guide's NOVA examples about habits and tasks answer, apart from FR-MAX-6. The guide's line that NOVA's clock keeps the calendar date matches what the app does.
