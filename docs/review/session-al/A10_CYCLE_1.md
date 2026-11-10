# A10 · Cycle 1: exploratory round and mini release review (Session AL)

**Reviewer.** A fresh, read-only agent. It changed no app code and made no git writes. 8 Nov 2026.

**Build.** The production build of `596e675a` at `127.0.0.1:3101` (`/home/user/zig-branch`).

**Method.**
- Playwright `chromium.launch()` (headless shell 153), deviceScaleFactor 1, at most one page at a time. Every run went through `flock /tmp/claude-0/zig-browser.lock`.
- Every `/api/**` request was answered 503, so there were no prices and no model.
- Fixed clocks with `page.clock`, in the browser's zone (UTC):
  - Mon 9 Nov 2026 09:30 by default;
  - 08:10 for Quick add;
  - 18:20 for Health, Goals, Habits and backup;
  - Sun 8 Nov 2026 21:45 for the weekly review and overdue tasks.
- Scripts are in `/tmp/claude-0/a10/` and screenshots in `/tmp/claude-0/a10/shots/`. They are not committed.
- **Profiles:**
  - brand-new: the real first visit, with the welcome walked as a person would (375 Nebula, 390, 1440);
  - after the welcome (Goals & money, Habits, Health; Drink more water, Move more, Save for something);
  - empty;
  - the Showcase (Settings → Load Showcase Demo).
- **Themes** were set with Settings → Appearance (Light, Nebula, Dark buttons; all three switch `data-theme` correctly). For the page tours they were seeded the same way.
- **Tours** visited all 16 sidebar and Apps pages: Today, Goals, Habits, Health, Wealth, Activity, Checklist, NOVA, Tasks, Notes, Journal, Agenda, Life review, ZIGi, Settings and Help.
  - Showcase: 375 Nebula, 768 Light, 1440 Dark.
  - After the welcome: 375 Light, 768 Dark, 1440 Nebula.
- **Automated checks:**
  - horizontal page scroll: none on any page at any width;
  - text clipped by overflow: none found;
  - NaN, undefined, null or Invalid Date in the page text: none found;
  - console errors other than the deliberate 503s: none.

**Environment note (not counted as a finding).** Opening ZIGi (its button or ⌘/Ctrl+Shift+Z) crashes the page renderer in Playwright's default headless-shell Chromium every time. This happened with any profile, with reduced motion, and with `--disable-gpu`. With the same version as real Chrome (`channel: 'chrome'`, 153.0.8010.12), it does not crash, so the ZIGi checks below used that channel. NOVA's chat, which gives the same answers, works in the headless shell. Worth knowing if a test ever runs ZIGi in the default Chromium.

---

## 1. Exploratory round

**What held up.**
- The welcome now matches its cards: "Meditate · Ten quiet minutes" makes 10 minutes and "Read more · Twenty minutes" makes 20.
- The Showcase pill ("Showcase · fictional") is on every page except one (A10-4).
- Reduced motion freezes everything:
  - `document.getAnimations()` found 0 running animations on 17 pages;
  - two screenshots taken 1.2 s apart are pixel-identical on Today, Checklist, NOVA, Habits, ZIGi, Life review and Wealth;
  - without reduced motion, NOVA changes about 10,000 px over the same 1.2 s, which shows the check works.
- **Keyboard:**
  - no trap on Today, NOVA, Checklist, Tasks, Health or the goal wizard (120 Tabs each);
  - Quick add and Search keep focus inside and close on Escape;
  - Quick add returns focus to its trigger.
- **Copy:**
  - "Should I buy more Bitcoin?" gets "I can't advise on buying, selling, staking or investing…";
  - "Is my weight healthy?" is declined;
  - Health and coach copy says "An estimate, not medical advice";
  - unknown values show as "Unknown" or "—", never 0 (meal macros, BTC "Needs valuation", fresh Wealth "Allocated to Goals —").
- **Numbers agree across pages:**
  - Spending: ZIGi says €209.79 this month, and Wealth shows the same total, the same categories and €195.80 room left this week;
  - Budgets: €233 left of €430;
  - the goal pace date is "Jan 23, 2028" on the goal page, the NOVA HUD, NOVA chat and ZIGi;
  - the water figure is the same on Today, Habits and NOVA.

### Findings

**A10-1 · Minor · Health (Log water, Log food) · 390 and 1440 · Nebula · after the welcome**
- **Steps:** Health → focus "Log water" → Enter → Tab.
- **Saw:**
  - The page scrolls about 2,600 px down to the Water card, but focus stays on the button, which is now off screen (its top is at −2,491 px).
  - The next Tab goes to "Log food" and scrolls back to the top (scrollY 0). "Log food" does the same.
  - "Log weight" does move focus, to the Weight (kg) field.
- **Expected:** focus moves to the card it scrolls to (the first water or meal control), as "Log weight" does. A keyboard or screen-reader user cannot reach the water card this way.
- **Reproduced:** 390 (twice) and 1440.
- **Screen:** `shots/fh0-390-Logwater.png`

**A10-2 · Minor · Health food logging · 390 and 1440 · Nebula · after the welcome** (clock 18:20)
- **Steps:** Health → Log food → "Quick add a food that is not in your library" → Apple, 95 kcal, 180 g → Log and save food.
- **Saw:** the Meal field defaults to Breakfast at 6:20 PM, so the evening apple is filed under Breakfast. This happens at both widths. Health has "Name your meals and set their times", but the default ignores it.
- **Cause:** `components/health/health-app.tsx:456` sets `useState(…"Breakfast")`.
- **Expected:** the meal whose time is nearest now (here Dinner or Snacks).
- **Screens:** `shots/fm2-390-a-filled.png`, `shots/fm4-1440-after.png`

**A10-3 · Minor · Wealth and Today, money copy · 1440 and 375 · Dark and Nebula · Showcase** (prices offline)
- **Saw:** under the total, Wealth and Today's Life overview both say "Market prices as of 12:00 AM; the total follows them when prices are refreshed". On the same screen:
  - "Price refresh is unavailable";
  - "0 of 2 market prices current";
  - every asset reads "Reference price … Unavailable";
  - every value in the total is a "Manual value · Nov 9, 2026, 12:00 AM".
- **Why it misleads:** no market price is in the figure. The timestamp is the time of the manual valuations.
- **Cause:** `components/platform/wealth-view.tsx` takes `valuedAt` from any row with a `marketRef`, including rows valued by hand.
- **Expected:** "Your values as of …", or no market-price claim while no price is current.
- **Screens:** `shots/tour-showcase-dark-1440-app_wealth.png`, `shots/c-sc375-today-2.png`

**A10-4 · Minor · Checklist · 375 and 1440 · Nebula and Dark · Showcase**
- **Steps:** load the Showcase → Checklist.
- **Saw:** the full-screen Checklist ("Your orbit", Morning Orbit 1/2, Water, Read, Walk…) shows the Showcase's planets with no "Showcase", "fictional" or "Example" text anywhere on the page. A scan of every visible element found 0 such words. Every other page carries the pill or a "fictional" line.
- **Expected:** the same "Showcase · fictional" marker.
- **Screens:** `shots/tour-showcase-nebula-375-app_checklist.png`, `shots/tour-showcase-dark-1440-app_checklist.png`

**A10-5 · Minor · ZIGi and NOVA answer to "What is due today?" · 1440 and 390 · Nebula and Light · Showcase** (Mon 09:30)
- **Saw:** the same task appears twice, once as late and once as planned for today: "Still open from earlier: Example · Sketch the garden bed (since Sun, Nov 8) · Also planned today: Example · Sketch the garden bed (task), 9:00 AM Goal check-in…".
- **Expected:** the overdue task listed once, under "from earlier".
- **Logs:** `fn-390-nebula.log`; the ZIGi console output is the same at 1440 and 390.
- **Screen:** `shots/fn-1440-nebula-c-ask.png`

**A10-6 · Minor · Wealth, Money tools "Buffer days" · 1440 and 390 · Nebula and Light · Showcase**
- **Saw:** "This cannot be worked out yet: log your USD spending on at least 14 different days in the last 30". Every spending entry in this profile is in EUR, a month of it (€209.79), and the profile holds €8,000.
- **Expected:** the buffer worked out in EUR, or the message names the currency it has and the one it needs.
- **Logs:** `d-wealth-full.log`, `d-wealth-390.log`

**A10-7 · Minor · RR-10 REGRESSED · Undo toasts at 390 · Light and Nebula · after the welcome and Showcase**
- **Steps and what I saw:**
  1. Quick add "weight 78.4" → Save → "oatmeal with blueberries for breakfast". The "Saved: Weight 78.4 kg · Undo" toast covers the lower half of the new meal card (the "Recorded as 100 g" line and the Health note). Add, Edit and Dismiss stay visible.
  2. NOVA → Health HUD ⚡ → Log 250 mL of water. The "Water logged: 250 mL · Undo" toast sits on the Drink water row's −, + and Complete buttons, the very row the person wants to see move.
- **Not reproduced:** the NOVA chat composer is now clear.
- **Reproduced:** twice each (Light and Nebula).
- **Screens:** `shots/fq-390-light-b2-preview.png`, `shots/fq-390-nebula-b2-preview.png`, `shots/fn-390-light-b-after-water.png`, `shots/fn-390-nebula-b-after-water.png`

**A10-8 · Polish · Health · 375 · Light and Nebula · after the welcome and Showcase**
- **Saw:** with nothing focused, the "Skip to Health views" skip link is half visible at the top-left, over the logo and the ✓ button. It is positioned 20 px above the viewport but is 44 px tall. At 1440 it is fully hidden (−66 px).
- **Screens:** `shots/skip-375.png`, `shots/c-skip2.png`

**A10-9 · Polish · Notes, the "This day" timeline · 375 · Nebula and Light · Showcase**
- **Saw:**
  - the chip "Late-night snacks (Showcase)" breaks its status mid-word, "Don / e";
  - the water chip says "1,000 ml logged" where everywhere else says "mL";
  - the day header's → arrow wraps onto its own line under "Today · Mon, Nov 9, 2026".
- **Screens:** `shots/c375-notes-chip.png`, `shots/notes2-375-light.png`

**A10-10 · Polish · Settings · 768 · Light and Dark · Showcase and after the welcome**
- **Saw:** the sticky "Fold all" button sits over the end of the section chip row, and a cut-off "st…" from the next chip shows to its right.
- **Screen:** `shots/c-l768-settings.png`

**A10-11 · Polish · Tasks · 768 · Light and Dark · Showcase and after the welcome**
- **Saw:** the views list (Inbox … Priority) is stacked above the list at full width, so the first task starts below the first screen (about y 1,300 of 1,024). At 375 and 1440 the tasks are in view.
- **Screen:** `shots/c-l768-tasks.png`

### Earlier findings rechecked (RR-1…RR-15, RR-18)

All are fixed on this build except RR-10 (A10-7).

| Id | What I checked | Result |
|---|---|---|
| RR-1 | Water journal and Drink water habit | "0.5 / 2 liters · Counting from your water journal". NOVA moves 1 → 1.25. Steps count Walk. |
| RR-3 | Today's weekly review reminder | Open → `/app/review` |
| RR-4 | ZIGi's pace date | Jan 23, 2028, the same as the goal page |
| RR-5 | Quick add meal card | Plain "Log a food" card. Today names the meal. |
| RR-6 | Health after one weigh-in | "First reading. Two or three a week draw the line." |
| RR-7 | Restore preview of a fresh backup | No "earlier version" |
| RR-8 | Overdue counts | One count everywhere: 2 / 2 / 2 / 2 |
| RR-9 | NOVA Health HUD water row | Wraps, no longer cut |
| RR-11 | Goal detail stat row at 390 | No overlap |
| RR-12 | Recent activity empty state | No mid-word break |
| RR-13 | ZIGi Health questions and "missed yesterday" | A button is offered, and yesterday is answered (7 of 7) |
| RR-14 | Life review wealth change | Now says "Change not known" while a holding has no value |
| RR-15 | Welcome focus cards and habits made | Habits match the cards |
| RR-18 | Task row checkboxes | One checkbox per row |
| RR-2 | Account to goal | Not retested (designed) |

---

## 2. Mini release review "as if 1.0" (390 and 1440)

- **Today** (Showcase, Sun 21:45)
  - The "Weekly review · Open" reminder lands on the Life review.
  - The strip reads "4 of 7 habits · 1,000 mL water · tracked wealth $501,800.00".
  - "Tasks due today: 2 · 2 overdue" matches Tasks, and drops to 1 after a task is marked done.
- **Quick add** (after the welcome, 08:10)
  - Five lines were entered and saved: water, weight, a meal, "walked 4000 steps" and a task for tomorrow at 9am.
  - Each line previewed exactly what it would save, then saved with Undo.
  - Today then showed 500 mL, and the meal by name with "Nutrition not given".
  - Habits showed Drink water 0.5 / 2 L and Walk 4,000 / 8,000 "Counting from your activity log".
  - Toasts still cover cards (A10-7).
- **Habits** (empty and after the welcome)
  - "+ New habit" → "Stretch" → Create habit gives "Habit created".
  - Complete → "Stretch: done for today · Undo" and the rhythm reads 1/4. Undo → 0/4.
  - Today's ring reads 33 % for 1 of 3 once in view.
- **Health logging** (after the welcome, 18:20)
  - Water: Add 250 mL → "250 mL recorded".
  - Weight: 72.5 kg → "First reading…".
  - Food: Apple, 95 kcal → "Apple logged and saved to your library". Today shows "Meals today 95 kcal".
  - It was filed as Breakfast (A10-2), and the keyboard focus issue applies (A10-1).
- **Goals** (empty)
  - Wealth: + Add asset, Cash "Wallet cash" $300.
  - Goals: idea "Holiday fund", $2,000 → Count money I already have → Wallet cash → Review "Wallet cash: 300 USD allocated" → Create.
  - The goal reads 15 %, $1,700 remaining, with the stat row clean at 390.
  - Today agrees: "1 active · 15% funded on average" and "$300.00 of $300.00 for Goals".
  - Fund Goal opens with "0 available of 300 USD".
- **Wealth** (Showcase and the same profile)
  - The totals, the EUR figures kept apart, "Needs valuation" and the spending figures agree with ZIGi and Today.
  - Two copy problems remain (A10-3, A10-6).
- **Tasks** (Showcase, Sun 21:45)
  - "Pay rent every month on the 1st #home" previews "Tue, Dec 1 · Every month on the 1st · #home (a new project)" and is added.
  - Ticking "Mark 'Example · Sketch the garden bed' done" gives "Done today: 1". The counts move together on Tasks and Today.
- **NOVA HUD** (Showcase)
  - The opening finishes and four HUD panels show.
  - Health ⚡ → Log 250 mL → "Water logged · Undo". The habit in the same sheet moves 1 → 1.25 L.
  - The chat answers "due today", the goal pace, "missed yesterday" and offers "Open NOVA → Permissions" for water.
  - At 390, the toast covers that habit row (A10-7).
- **ZIGi** (Showcase, no model; the `chrome` channel, see the note at the top)
  - Eight questions:
    - the goal pace, consistent with the goal page;
    - water and sleep, with a button to Settings;
    - yesterday's habits: 7 of 7;
    - due today (one task listed twice, A10-5);
    - spending: €209.79, consistent;
    - Bitcoin: declined as advice;
    - weight: declined.
  - At 390, ZIGi opens from Apps & extras.

### Counts

| Severity | Count | Ids |
|---|---|---|
| Blocker | 0 | |
| Major | 0 | |
| Minor | 7 | A10-1 to A10-7 (A10-7 is RR-10 regressed) |
| Polish | 4 | A10-8 to A10-11 |

### Ready for 1.0

| Flow | Ready | Why |
|---|---|---|
| Today | **Yes** | |
| Quick add | **Nearly** | The toast covers the next card (A10-7). |
| Habits | **Yes** | |
| Health logging | **Nearly** | The default meal ignores the time (A10-2); Log water and Log food leave focus behind (A10-1). |
| Goals | **Yes** | |
| Wealth | **Nearly** | "Market prices as of" with no prices (A10-3); Buffer days asks for USD (A10-6). |
| Tasks | **Yes** | 768 layout polish (A10-11). |
| NOVA HUD | **Nearly** | The toast over the habit row at 390 (A10-7); the duplicate due-today item (A10-5). |
| ZIGi | **Nearly** | The duplicate due-today item (A10-5). |
