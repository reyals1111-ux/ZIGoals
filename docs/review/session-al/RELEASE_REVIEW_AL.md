# Release review "as if 1.0" (Session AL, owner rule 12 · RELEASE_REVIEW_AL)

**Reviewer.** A fresh, read-only agent that built none of ZIGoals. Date: 8 Nov 2026, 21:30–22:05 local.

**Build.** The production build at `127.0.0.1:3103`: `/home/user/zig-branch2` at `a81b18dd`, with `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`.
- **Not in this build:** later commits on the branch (head `ab580b9d`). They add the security delta A fixes and the Part 15 items. A finding below may already be fixed there; none was re-checked on them.

**Method.**
- Playwright (`@playwright/test` from zig-branch2), headless, Chrome channel (the sandbox's Chromium), deviceScaleFactor 1. Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser and one worker.
- Every `/api/**` request was answered 503, so market prices and the asset catalog were offline. No model was connected, so ZIGi and NOVA gave on-device answers.
- **Widths:** 390×844 (touch) and 1440×900.
- **Profiles:**
  - a brand-new profile: the real first visit, and the welcome flow;
  - a fresh profile with the welcome marked as seen;
  - the Showcase, loaded through Settings → Load Showcase Demo.
- **Themes:** Nebula and Light.
- **Pages:** Today, Quick add, Habits, Health, Goals (list, wizard, detail), Wealth, Tasks, Life review, NOVA (HUD, quick actions, chat), ZIGi, and Settings → backup and restore.
- **Evidence.** About 200 screenshots and the scripts are in `/tmp/claude-0/release-al/` (shots in `shots/`). They are not committed. Every finding below was reproduced in the browser. Causes quoted from source were only read to confirm a finding, never to stand in for one.

**Not repeated here (known, still visible in this build):**
- the hero's "Onchain · ZIGChain vision" pillar on a profile that chose no crypto (R28, waiting for the owner);
- the floating launcher stack overlapping right-column cards at 1440 (AL-LAUNCHER-OVERLAP-001);
- "Japan adventure 41.66 %" in ZIGi and NOVA answers next to "42 %" everywhere else (EX-16).

**What works well.** First-run setup (8 steps), Quick add (water, weight, a task with a day and time, P1), Habits check-ins with Undo, Tasks (natural-language repeats and projects, mark done), the Life review, NOVA quick actions with Undo, and Export → Restore with per-part choices and Undo all work end to end at both widths. Measured on this build:
- pages hydrate in 0.4–1.4 s;
- Finish setup lands on Today in about 230 ms;
- Export everything takes about 200 ms;
- no horizontal page scroll at 390 on any page visited;
- no console errors other than the deliberate 503s.

---

## The 8 journeys

**J1 · First run to a first habit and goal** (390, brand-new, Nebula). Script and log: `j1.js`, `j1-390.log`.
1. `/app` opens on the hero, with a Welcome card and a "Set up in a minute · Start" toast.
2. Start setup → Let's begin → choose Goals & money, Habits, and Health & food.
3. Focuses: Drink more water, Save for something, Read more. "3 of 3 chosen" with the cap said.
4. Starters are pre-ticked (Put money aside, Read, Drink water) and the goal "Emergency fund" is prefilled. I typed 3000 as the target.
5. Tour, 4 cards → Install → ZIGi; I typed the name "Sam".
6. The summary lists everything that will be saved. Finish lands on Today: "You're set, Sam · Your goal 'Emergency fund' · 3 habits for today".
7. "Tick your first habit ↓" scrolls to the habits. Habits and Goals show what was chosen.

Result: it works, and it is calm and clear. Three problems:
- the focus card's words do not match the habit made (RR-15);
- the water habit does not count logged water (RR-1);
- "Emergency fund" is repeated four times on Today (RR-17).

**J2 · Logging a morning** (390, fresh, Light; repeated at 390 Nebula after the welcome). Logs: `j2-390-light.log`, `j2b.log`, `ev.log`.
1. Quick add "drank 2 glasses of water" previews "Water · 2 glasses (500 mL) · today". Save shows "Saved: Water · 500 mL".
2. "weight 78.4" → "Weight · 78.4 kg · today". Saved.
3. "oatmeal with blueberries for breakfast" shows a card badged **AI ESTIMATE** with every value unknown. Add → "Added".
4. Today:
   - the Water card shows 500 mL;
   - the Health card shows "Unknown" four times;
   - the coach shows the weight.
5. Health shows "WEIGHT TREND 78.4 kg · smoothed, six weeks" after one reading.

After the welcome with "Drink more water": Today's Water card says 750 mL of 2,000 mL, while the "Drink water" habit on the same page stays at 0 / 2 liters. Result: logging is fast. What it shows afterwards is wrong or confusing (RR-1, RR-5, RR-6).

**J3 · A savings goal funded from Wealth** (1440 Nebula fresh, then 390 Light fresh). Logs: `j3c.log`, `j3d.log`.
1. Wealth → Add an account or debt → Savings "ING Savings", $2,400 → "ING Savings added". The filter row reads "All 1 · Accounts 1" over the line "No assets in this category yet".
2. + Add asset → Cash "Rainy day cash", $600 → saved.
3. Goals → + Create a goal → the idea "Emergency fund", $6,000 → Step 2, "Count money I already have". Only "Rainy day cash" is offered. The savings account is not (RR-2).
4. On 390, with the savings recorded as a Cash asset instead:
   - Include → Review "Savings account: 2,400 USD allocated" → Create;
   - the goal shows **40 %**, $3,600 remaining;
   - Today shows "1 active · 40 % funded";
   - the goal's stat row overlaps itself (RR-11).
5. Fund Goal opens "Fund your goal · Record history only".

Result: it works only if the person picks the Cash asset path and not the account path that the word "Savings" invites.

**J4 · Tasks planned and done with Quick add** (390 Nebula fresh; 1440 Showcase). Logs: `j4.log`, `f.log`.
1. Quick add "task: call the bank tomorrow 9am" → "Will add a task: 'call the bank' · Mon, Nov 9 · 9:00 AM" → Add task → "Task added".
2. "task: buy groceries today p1" → today · P1 · High → added.
3. On Tasks, typing "Pay rent every month on the 1st #home" previews "Tue, Dec 1 · Every month on the 1st · #home (a new project)". Added.
4. Today shows "Tasks due today: 1 · buy groceries →".
5. In the Showcase, ticking "Mark 'Example · Book the dentist' done" leaves "Done today: 1 →".

Result: good. Two issues: the overdue counts disagree (RR-8), and the two look-alike checkboxes (RR-18).

**J5 · A weekly review** (1440, Showcase, Nebula and Light). Logs: `j5.log`, `j5b.log`.
1. Today's first card reads "REMINDER · Weekly review · Your weekly review is open · Open".
2. Pressing Open changes nothing: the link is `/app`, and both the URL and the scroll position stay as they were (RR-3).
3. Reaching `/app/review` by URL instead gives the Life review. It has highlights, a pillar summary, ZIGi's note, wins, goals that moved with their why and if-then, streaks, a Health trend table, wealth by currency and "on the same days" signs. It is 8 screens at 1440 and very good.
4. Its Wealth chapter disagrees with Today's line for the same week (RR-14).

**J6 · Asking ZIGi about the records** (no model; 1440 Nebula, 390 Light; Showcase). Logs: `j6-1440.log`, `j6-390.log`.

| Question | Answer |
|---|---|
| "How far am I on my goals?" | 7 goals with figures |
| "What is due today?" | Open habits, tasks and the review |
| "How much did I spend this month?" | 167.69 EUR, by category |
| "What is my net worth?" | Per currency, with debts |
| "Am I on track for my emergency fund?" | "ahead by 250 USD … At this pace it completes around 2028-08-11". The goal page says "At this pace: about Jan 22, 2028" (RR-4). |
| "How much water did I drink today?" | A three-level Settings path, no button (RR-13) |
| "How did I sleep this week?" | A three-level Settings path, no button (RR-13) |
| "Which habits did I miss yesterday?" | "That isn't something I can answer" (RR-13) |

On 390, ZIGi opens from the "Apps & extras" sheet.

**J7 · NOVA HUD daily use with a quick action** (1440 Nebula, 390 Light; Showcase, plus a fresh 1440 profile). Logs: `j7-1440.log`, `j7-390.log`, `f.log`.
1. `/app/nova`: the opening finishes in about 3.5 s. Then four HUD panels, the core rings and "What's on your mind?" show (fresh: honest empty states with "Set a goal →" and "Add a habit →").
2. Health HUD ⚡ → "Log 250 mL of water" → "Water logged: 250 mL · Undo". The HUD shows 1,250 mL and so does Today's line afterwards.
3. The same sheet's "Drink water 1 / 2 liters · Partial" does not move (RR-1). The water row in the panel is cut: "2,000 n" (RR-9).
4. Habits HUD ⚡ lists all habits with ± and Complete, plus a focus timer.
5. "What is due today?" is answered from the records. A Health question offers "Open NOVA → Permissions".
6. On 390, the water toast stays up and covers the chat's message box (RR-10). "Talk to NOVA" opens the chat sheet with three suggested questions.

**J8 · Backup export and restore preview** (1440, Light, after the welcome). Logs: `j1b.log` (and `j8-390.log` for an empty profile).
1. Settings → "Everything you've saved, in one file." → tick the consent → Export everything → a 17 KB ZIP, "Your export is ready and downloading. Keep it private."
2. The habits were then removed on the device.
3. Settings → Your data → Restore from a backup → choose the ZIP. The preview shows, per part, the backup against this device ("Habits: 3" / "Nothing here yet") with Leave / Merge / Replace and a list of what is never restored.
4. Every part also says "Saved by an earlier version of ZIGoals" for a file made seconds earlier by this build (RR-7).
5. Replace Habits → confirm → "Restored: Habits." The three habits are back on Habits.
6. With an empty profile the preview says "This export holds nothing this version can restore": true and clear.

---

## Findings

### Major

**RR-1 · Major · Habits ↔ Health (Today, Habits, NOVA) · 390 and 1440 · fresh after the welcome and the Showcase · Nebula and Light**
- **Steps:**
  1. Welcome → Habits + Health & food → the focus "Drink more water" (and "Move more") → Finish.
  2. Today → Add 250 mL three times, or Quick add "drank 2 glasses of water".
- **Saw:**
  - Today's Water card reads "750 mL of 2,000 mL today". On the same page and on Habits, "Drink water" reads "0 / 2 liters · Due".
  - In the Showcase, NOVA's Health quick actions log 250 mL (1,250 mL). Right below, "Drink water 1 / 2 liters · Partial" does not move, while "Walk" beside it reads "Done automatically · from your activity log".
  - Quick add "walked 4000 steps" asks "Did you mean… Walk (activity) / Walk (habit)".
- **Expected:** the water habit that the welcome makes counts the water journal, as Habits' one-tap "Drink water" idea already does (MO-123, `linkWaterIdea`). The same applies to the welcome's Walk and steps, and to the Showcase's Drink water (PR-002, still open). Two water figures that disagree on one screen read as a bug to every daily user.
- **Screens:** `shots/ev-a2-water-card.png`, `shots/j2b-390-nebula-a-today-full.png`, `shots/j7-1440-nebula-showcase-c-after-water.png`, `shots/ev-a4-steps.png`

**RR-2 · Major · Wealth → Goals · 1440 (wizard the same at 390) · fresh · Nebula**
- **Steps:**
  1. Wealth → Add an account or debt → Kind Savings, "ING Savings", USD, 2400 → Add.
  2. Goals → + Create a goal → the idea "Emergency fund", 6000 → Continue → "Count money I already have".
- **Saw:**
  - Step 2 offers only Wealth *assets* ("Rainy day cash"). The savings account is never listed, so a person's real savings cannot fund their savings goal. The wizard says nothing about why.
  - On Wealth, "What you have" (whose own subtitle says it lists "each account and debt") shows "All 1 · Accounts 1" over "No assets in this category yet". The account appears only further down, under Accounts, debts & net worth.
- **Expected:** an account counts toward a goal, or the wizard says plainly to add it as a Cash asset. Also, "What you have" should list what its count says.
- **Cause:** the wizard's sources come from `store.data.positions` only (`unified-goal-wizard.tsx`).
- **Screens:** `shots/j3c-1440-nebula-a-account-added.png`, `shots/j3c-1440-nebula-d-wizard2.png`

**RR-3 · Major · Weekly review (Today) · 1440 (any width) · Showcase · Light and Nebula**
- **Steps:** Today → the first card "REMINDER · Weekly review · Your weekly review is open" → Open.
- **Saw:** nothing happens. The link is `/app`, the page already open; the URL and the scroll position stay as they were. The review itself, the Life review at `/app/review`, is excellent but is not reachable from this reminder.
- **Expected:** Open goes to `/app/review`.
- **Cause:** `lib/reminders-plan/due.ts` sets `href: … kind === 'review' ? '/app' …`.
- **Screens:** `shots/j5b-1440-light-a-reminder.png`, `shots/j5b-1440-light-b-after-open.png`

**RR-4 · Major · ZIGi and NOVA answers (Goals) · 1440 and 390 · Showcase · Nebula and Light**
- **Steps:** ask ZIGi "Am I on track for my emergency fund?".
- **Saw:** "Against your plan: ahead by 250 USD. At this pace it completes around 2028-08-11; target 2028-11-07."
  - The goal page says "PACE FORECAST · At this pace: about Jan 22, 2028" and, separately, "With your plan · About Aug 11, 2028".
  - The NOVA Goals HUD says "At this pace: about Jan 22, 2028".
  - So ZIGi gives the *plan* date as "at this pace", seven months off the page, and in ISO format where the rest of the answer uses "Wed, Nov 11".
- **Expected:** the same words and figure as the goal page, in the app's date format.
- **Screens:** `shots/j6-1440-nebula-b-zigi-q0.png`, `shots/c1-goal-detail.png`

**RR-5 · Major · Health logging, a meal through Quick add · 390 · fresh · Light (no model)**
- **Steps:** Quick add "oatmeal with blueberries for breakfast" → Add → Today.
- **Saw:**
  - The card is badged **AI ESTIMATE**: "Log a food with an AI estimate", "AI estimate per serving: kcal unknown, protein unknown…", "recorded as 100 g per serving (an AI estimate…)".
  - The food is saved to Foods & recipes as "AI estimate", with no AI anywhere.
  - Today's Health card then reads "Unknown" four times ("Unknown · 0/1 entries supplied calories") and never names the meal.
- **Expected:** a plain on-device card, such as "Breakfast: oatmeal with blueberries · nutrition not given · add it in Foods & recipes", and Today showing the meal by name. P-LA-12 and LA-044 record this badge as removed (fixed-pending-proof); it is still present in this build. An "AI" claim with no AI is untrue in an app whose promise is "nothing is sent anywhere".
- **Screens:** `shots/j2-390-light-b2-preview.png`, `shots/j2-390-light-b2-saved.png`, `shots/j2-390-light-c-today-full.png`

### Minor

**RR-6 · Minor · Health · 390 · fresh · Light.**
- **Steps:** Quick add "weight 78.4", the first reading ever → Health.
- **Saw:** "WEIGHT TREND 78.4 kg · smoothed, six weeks · an estimate". One reading is not a six-week smoothed trend; the weight view's own subtitle says "Two or three readings a week draw the line".
- **Expected:** "First reading. Two or three a week draw the line."
- **Screen:** `shots/j2-390-light-d-health-full.png`

**RR-7 · Minor · Backup restore preview · 1440 · after the welcome · Light.**
- **Steps:** Export everything, then restore the same ZIP seconds later.
- **Saw:** the header reads "Exported Nov 8, 2026 by ZIGoals 0.1.0". Yet Goals and Wealth, Habits, Today preferences and Health each say "Saved by an earlier version of ZIGoals. This version still reads it". That is untrue and worrying for a backup made seconds earlier.
- **Cause:** `lib/restore/plan.ts:366` compares each part's stored version with `CURRENT_VERSIONS`, while the stores still write lower versions. Possibly related to the stored-format change in `a81b18dd`; that is a guess.
- **Screen:** `shots/j1b-1440-light-d-preview.png`

**RR-8 · Minor · Tasks · 1440 · Showcase · Nebula** (clock 21:45, a task due "today 10:30 AM").
- **Saw:** four overdue counts that disagree:
  - the side list says "Overdue 1";
  - the header says "Today 2 tasks · 1 overdue in all";
  - the list section says "Overdue 2";
  - Today's card says "Tasks due today: 2 · 2 overdue".
- **Expected:** one count everywhere. Related: AL-DATES-007, recorded as fixed.
- **Screen:** `shots/ev-b1-tasks-counts.png`

**RR-9 · Minor · NOVA HUD · 1440×900 · Showcase · Nebula.**
- **Saw:** the Health HUD's Water row is cut at the panel edge: "1,000 mL / 2,000 n". The other rows fit.
- **Screens:** `shots/crop-hud-water.png` (from `shots/j7-1440-nebula-showcase-a-open-3s.png`)

**RR-10 · Minor · Undo toasts (Quick add, NOVA) · 390 · fresh and Showcase · Light.**
- **Saw:** a "Saved…" or "Water logged… Undo" toast stays up through later actions and covers what comes next:
  - in NOVA's chat sheet it sits over the message box after a quick action and two questions;
  - in Quick add, the weight toast covers the following meal card.
- **Expected:** the toast leaves once the person moves on, or sits clear of the composer.
- **Screens:** `shots/j7-390-light-showcase-e-ask.png`, `shots/j2-390-light-b2-preview.png`

**RR-11 · Minor · Goal detail · 390 · fresh · Light.**
- **Steps:** create a goal with no plan and no date (J3).
- **Saw:** the stat row's "Saving plan · No saving plan yet" runs into "Target date · Your own pace", so the words read "No saving planYour own pace".
- **Screen:** `shots/j3d-390-light-e-created.png`

**RR-12 · Minor · Today (fresh) · 1440 · Nebula.**
- **Saw:** the Recent activity empty state breaks words mid-word: "Your / next / step / belo / ngs / here." The card is squeezed beside the art.
- **Screens:** `shots/crop-fresh-today-recent.png` (from `shots/tour-fresh-nebula-1440-app-full.png`)

**RR-13 · Minor · ZIGi · 1440 and 390 · Showcase.**
- "How much water did I drink today?" and "How did I sleep this week?" answer with a path, "Settings → ZIGi · Your Personal AI Companion → Privacy & data: 'Health page data' and 'Include Health' (Health has to be one of Today's sections)", and no button. Meanwhile, Today's line behind the panel shows "1,000 mL water". NOVA already offers "Open NOVA → Permissions".
- "Which habits did I miss yesterday?" is not answered at all.
- **Expected:** a one-tap switch like NOVA's, and the yesterday question answered from the habit records.
- **Screen:** `shots/j6-1440-nebula-b-zigi-q0.png` (log `j6-1440.log`)

**RR-14 · Minor · Wealth figures (Today and Life review) · 1440 · Showcase · Nebula** (prices offline).
- **Saw:** for the same week, Today's line says "tracked wealth $501,800.00 (+$16,163.50 this week)", while the Life review says "USD −$19,442.60 · $521,242.60 → $501,800.00".
- **Note:** a guess, not checked with live prices. It may appear only while prices are unavailable, a state real users also reach ("Automatic prices are unavailable"). Today's line takes the week's change from recorded history (`today-line.tsx`); the review takes it from the current total.
- **Log:** `j5b.log`

**RR-15 · Minor · Welcome (first run) · 390 · brand-new · Nebula.**
- **Saw:** the focus cards promise one target and the habit made has another:
  - "Read more · Twenty minutes with a book" creates "Read · 30 minutes a day";
  - "Meditate · Ten quiet minutes" creates "Meditate · 1 / 1 per day".
- **Expected:** the habit matches the card, or the card says what will be made.
- **Logs:** `j1-390.log`, `h.log`

### Polish

**RR-16 · Polish · Wealth length · 1440 · Showcase.** Wealth is 20,713 px (23 screens) at 1440 against 9.6 phone screens, because the desktop unfolds every analysis section. Today is 15.3 screens. **Screen:** `shots/tour-showcase-nebula-1440-app_wealth-full.png`.

**RR-17 · Polish · Today after the welcome · 390.** "Emergency fund" appears in the Setup-finished card, Today's focus, What matters today and Your goals, all within the first screens. **Screen:** `shots/j1-390-i-finish-full.png`.

**RR-18 · Polish · Tasks · 1440.** Each task row starts with two identical 18 px checkboxes ("Select" and "Mark … done") side by side. A first-time user cannot tell which one completes the task. **Screen:** `shots/ev-b1-tasks-counts.png`.

---

## Summary

| ID | Severity | Flow | Width · profile · theme |
|---|---|---|---|
| RR-1 | Major | Habits ↔ Health water and steps | 390 / 1440 · welcome and Showcase · Nebula / Light |
| RR-2 | Major | Wealth account → Goal funding | 1440 (390) · fresh · Nebula |
| RR-3 | Major | Weekly review reminder's Open goes nowhere | 1440 · Showcase · Light / Nebula |
| RR-4 | Major | ZIGi "at this pace" date contradicts the goal page | 1440 / 390 · Showcase |
| RR-5 | Major | "AI estimate" meal card with no AI; Today shows Unknown ×4 | 390 · fresh · Light |
| RR-6 | Minor | One weigh-in called a six-week smoothed trend | 390 · fresh · Light |
| RR-7 | Minor | A fresh backup said to be "an earlier version" | 1440 · Light |
| RR-8 | Minor | Four overdue counts disagree | 1440 · Showcase |
| RR-9 | Minor | NOVA Health HUD water row cut ("2,000 n") | 1440 · Showcase · Nebula |
| RR-10 | Minor | Undo toast covers NOVA composer and Quick add cards | 390 · Light |
| RR-11 | Minor | Goal detail stat row overlaps | 390 · fresh · Light |
| RR-12 | Minor | Recent activity empty state breaks mid-word | 1440 · fresh · Nebula |
| RR-13 | Minor | ZIGi Health path with no switch; "missed yesterday" unanswered | 1440 / 390 · Showcase |
| RR-14 | Minor | Week's wealth change differs between Today and the review (prices offline; guess) | 1440 · Showcase |
| RR-15 | Minor | Welcome focus targets differ from the habits made | 390 · brand-new |
| RR-16 | Polish | Desktop Wealth is 23 screens | 1440 · Showcase |
| RR-17 | Polish | Emergency fund ×4 on Today after setup | 390 · welcome |
| RR-18 | Polish | Twin checkboxes on task rows | 1440 |

Count: Blocker 0 · Major 5 · Minor 10 · Polish 3.

## Ready for 1.0? (per flow)

| Flow | Verdict |
|---|---|
| Today | **Not yet.** It works and reads well. The review reminder dead-ends (RR-3), and water disagrees with its own habit (RR-1). |
| Quick add | **Nearly.** Fast, previews first, has Undo, handles tasks well. Fix the "AI estimate" meal card (RR-5) and the toast covering things (RR-10). |
| Habits | **Yes**, once the welcome's water and walk habits are linked (RR-1). |
| Health logging | **Not yet.** RR-1, RR-5 and RR-6 make what is shown after logging untrue or empty. |
| Goals | **Nearly.** The wizard is clear. RR-2 (accounts) and RR-11 (overlap) remain. |
| Wealth | **Not yet** for "fund my goal". Accounts and assets are two worlds, and only one can fund a goal (RR-2). |
| Tasks | **Yes.** RR-8 and RR-18 are small. |
| NOVA HUD | **Nearly.** Striking and useful; quick actions write real records with Undo. RR-9 and RR-10 remain. |
| ZIGi | **Not yet.** Good on-device answers, but one money date contradicts the page (RR-4), and Health needs a switch (RR-13). |
| Backup and restore | **Yes.** It round-trips with a clear preview and Undo; RR-7 is copy. |

**Overall: not yet 1.0.** There are no Blockers, and every flow completes end to end. The five Majors are what a demanding daily user meets within a week:
- two numbers that disagree on one screen (RR-1);
- savings that cannot fund the savings goal (RR-2);
- a weekly prompt that goes nowhere (RR-3);
- an assistant that contradicts the page (RR-4);
- an "AI" label with no AI (RR-5).

## Outcomes (integrator, 8 Nov; proven on the production build of 596e675a)
Specs: tests/grok53/release/rr-life.spec.ts, rr-money.spec.ts, rr-ai-tasks.spec.ts — each fails on 78be2446 and passes on
596e675a (with the Checklist, Tasks, NOVA dashboard, Life review and first-run specs: 201 passed, 43 skipped for the other
width; route weights all under budget).

| Id | Severity | Outcome | Commit |
|---|---|---|---|
| RR-1 | Major | Fixed: the welcome links its water and walk habits as the Habits ideas do; NOVA reads the shared Health snapshot; Quick add saves a linked measure directly | 07357b31 |
| RR-2 | Major | Fixed (designed): the wizard names the accounts and offers "Record <account> as cash" through the pre-filled Cash form; "What you have" says where accounts are | 1f80da56 |
| RR-3 | Major | Fixed: the review reminder opens /app/review | 07357b31 |
| RR-4 | Major | Fixed: ZIGi uses the page's pace forecast and date format, and names "With your plan" | 596e675a |
| RR-5 | Major | Fixed: no "AI" badge or brand without a model; Today names the meals | 07357b31, 596e675a |
| RR-6 | Minor | Fixed: one weigh-in says it is the first reading | 07357b31 |
| RR-7 | Minor | Fixed: "earlier version" only when a part is migrated on read | 596e675a |
| RR-8 | Minor | Fixed: one overdue rule (day + time in the app's zone) everywhere | 596e675a |
| RR-9 | Minor | Fixed: the Health HUD water row fits | 596e675a |
| RR-10 | Minor | Fixed: on a phone the Undo toast keeps clear of a focused field | 596e675a |
| RR-11 | Minor | Fixed: a goal's word facts wrap at 600 px and below | 1f80da56 |
| RR-12 | Minor | Fixed: no mid-word break in Today's Recent activity empty state | 07357b31 |
| RR-13 | Minor | Fixed: ZIGi's Health-settings answers open the switch; "missed yesterday" answered on the device | 596e675a |
| RR-14 | Minor | Fixed: one reckoning of the week's wealth change; unknown while a holding has no value | 1f80da56 |
| RR-15 | Minor | Fixed: the welcome makes the habits its cards describe | 07357b31 |
| RR-16 | Polish | Owner decision: Wealth at 1440 is 20,720 px; shortening it folds desktop sections (protected baseline) | — |
| RR-17 | Polish | Owner decision: the goal's name is in four Today modules; removing one changes the protected Today layout | — |
| RR-18 | Polish | Fixed: one done checkbox per task; a Select mode for bulk actions | 596e675a |
