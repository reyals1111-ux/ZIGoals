# Second release review "as if 1.0" (Session AK, G2 · RELEASE_REVIEW_2)

Reviewer: a fresh read-only agent that built none of ZIGoals. Date: 1 Nov 2026.
Build: the production server on 127.0.0.1:3101, head `367b6b65` (`feature/session-ak-number-one`).
Method: Playwright (full Chromium, `/api/**` answered 503) through the browser lock. I looked at a brand-new device (with and without the first-run welcome), the welcome flow end to end (including the "Goals & money" choice), and the Showcase. Widths were 390×844 (touch) and 1440×900, in Nebula, Light and Dark. Pages: Today, Goals, Habits, Health, Wealth, Settings, NOVA (dashboard and chat), Notes, Tasks and Quick add. I also asked NOVA real questions on both widths. I read page text and source only to confirm causes. 21 screenshots are in the G2R2 scratch folder; none are committed.
Not repeated here: every R-finding in [RELEASE_REVIEW.md](RELEASE_REVIEW.md) that is fixed or recorded. The "Alpha" product name (R8's `RELEASE_NAME`) and the hero's "Onchain" line (R28) wait for the owner's decision. Two findings re-open part of an earlier one; each says so. Bugs are G5's lane. I list one bug (R2-1) only because it decides whether NOVA works at all on a phone.
PROTECTED, not up for redesign: Today hero and slogan, Checklist and celebrations, footer finale, swan intro, nav bars, Governance hidden, "Premium · free during the Alpha", the ZIGi look. Every proposal below changes copy, defaults, order or folding, never those surfaces.

## Verdict

**Not yet.** On trust, ZIGoals is already better than every competitor I compared it with: everything stays on the device, there are no ads or tracking, the Showcase is labelled on every surface (NOVA and Tasks too), "unknown" mostly stays unknown, and money and health copy reads as information, not advice. No single competitor covers Goals + Habits + Health + purpose-driven Wealth in one place. A brand-new phone now opens on a calm Today with no crypto in sight (R2/R3/R14 hold at 390 px). Someone who values privacy and breadth would try it.

They would not yet *choose* it over the best single-pillar apps:
- **NOVA cannot answer from your records on a phone.** On a desktop it answers only exact phrasings, and a first-time person meets a developer console.
- **Choosing "Goals & money" in the welcome turns the whole crypto layer on** for someone who only wants to save.
- **Health, Wealth and Settings are 12, 16 and 20 phone screens long** and repeat themselves, where MacroFactor, Monarch and YNAB lead with one number and one action.
- **Notes and Tasks are hard to find.**

Fix the Blocker and the Majors below and the answer becomes yes for the privacy-minded "one app for my life" person.

| Severity | Count |
|---|---|
| Blocker | 1 |
| Major | 8 |
| Minor | 12 |
| Polish | 4 |

**Status after lane P2 (owner follow-up 4, 1 Nov):** every finding has a status line below. 24 fixed (R2-7 and R2-10's desktop half in lane P2, the rest in lanes RA, RB, RC and EXF); R2-24 re-checked and not reproducible (pinned by a test); kept with the reason: R2-5's dark NOVA stage and R2-15's default counters (owner decisions), and R2-16's other backup ways stay open rather than folded (their anchors and links).

---

## NOVA (`/app/nova`), the personal command center

**R2-1 · Blocker · NOVA chat · 390 (any width where the chat opens as a sheet) · all themes · fresh and Showcase**
- **What a person experiences:** On a phone, they tap "What's on your mind?" and ask NOVA anything, even NOVA's own example "How far am I on my goals?". The answer is the generic list "I answer questions about your own records… For example:", followed by **"Paused on this private screen: nothing is read from your records."** The chat's status reads "On-device answers · paused on a private screen". I tried three questions on the Showcase and all three got the same answer.
- **Cause:** NOVA's chat opens inside `NovaSheet`, a `<dialog>` with no `data-ai-dialog` (`components/nova/nova-sheet.tsx:21`). `SENSITIVE_SELECTOR` treats every `dialog[open]:not([data-ai-dialog])` as a private screen (`components/ai/use-sensitive-screen.ts`), and `nova-chat.tsx:85/127` then reads nothing.
- **Why it matters:** The phone is the main device, and NOVA is billed as "your private command center". Here it answers nothing about your life.
- **Proposal:** Mark NOVA's own chat sheet as the assistant's dialog (`data-ai-dialog`), keeping every other dialog sensitive. Add a phone spec that asks the Showcase "How far am I on my Emergency fund goal?" and expects the figure.

> **Status (P2, 1 Nov):** Fixed in `52bd5286` (NOVA's sheet carries `data-ai-dialog`, so it is not taken for a private screen). Test: `tests/wiring-2-r2.spec.ts` "R2-1: on a phone, a NOVA question in the chat sheet is answered from the records" (lane WB).

**R2-2 · Major · NOVA local answers · 1440 · Showcase**
- **What a person experiences:** Without a model connected, which is the default for nearly everyone:

  | Question | Answer |
  |---|---|
  | "How far am I on my **Emergency fund** goal?" | A clear answer (45 %, $11,000 to go, next contribution Nov 4) |
  | "How far am I on my goals?" (NOVA's own phone example) | The examples list |
  | "What is due today?" (the command-center question) | The examples list |
  | "How did I sleep this week?" | "Health isn't shared with ZIGi — turn it on in Settings → ZIGi…" |

- **Why it matters:** NOVA promises "your day, your four pillars… one tap away" (Help → What is NOVA?). Today, ZIGi's Today brief and the Agenda already know what is due. A person tries two natural questions, gets examples back, and leaves.
- **Compared with:** Sunsama and Structured open on "what's next today"; the AI companions in COMPETITORS_2 (Bevel, Welltory) answer the overview question first.
- **Proposal:**
  - Route plural and overview questions ("my goals", "due today", "my day", "what's next") to the brief NOVA already writes (the "Your day" button and `briefChatText`), on the device.
  - Show only examples that the local engine answers verbatim.
  - When Health is off, say "Health is off for NOVA" with a one-tap switch, instead of a path through ZIGi's settings.

> **Status (P2, 1 Nov):** Fixed in `981f6537` and `0ef32f0d` (lane RA): on-device overview answers (goals, due today, my day, sleep, habits, water, tasks), examples limited to what the engine answers, a closed area offers "Open NOVA → Permissions". Tests: `lib/ai/local-answers/nova-evals.test.ts` (53 cases), `lib/nova/local-env.test.ts`, `lib/ai/context-pack/nova-today.test.ts`, `tests/nova-chat.spec.ts`.

**R2-3 · Major · NOVA first run · 1440 (and the phone's dashboard panels) · all themes · fresh**
- **What a person experiences:** The first desktop screen contains:
  - 13 icon-only round buttons.
  - The chips "Brain On-device answers · Privacy not chosen yet · Memory off · Sees 4 of 5 pillars · Health off · Test my setup".
  - An open right panel "Behind the intelligence" with "Look for local servers", "Connect your Hermes Agent · Nous Research", "localhost", "Processor cores 4 logical", "Memory About 16 GB or more", "Cost meter and daily cap", "Models per task" and "Model routing: Automatic · best fit".
  - The person's actual day ("Today's orbit", "Next three") starts below the fold.
- **Why it matters:** Consumer first. This is a power-user console for a module everyone sees in the nav. The words most people need (what NOVA knows about today) are hidden; the words few people need (agents, routing, cores) are shown.
- **Proposal:** No redesign of NOVA's look.
  - Until a brain other than on-device is set up, start with the right panel folded (its toggle exists) and the setup card collapsed to one line.
  - Put "Today's orbit" and "Next three" directly under the orb.
  - Give the icon buttons visible labels at ≥ 1280 px, or keep at most 6 with labels and move the rest into the existing quick-access grid.
  - Move hardware, routing, cost and Hermes into "Brain setup".

> **Status (P2, 1 Nov):** Fixed in `981f6537` (and `09c216e9`, EX-1): "Behind the intelligence" starts hidden, servers, Hermes, device facts, cost and models sit behind disclosures, routing shows once a brain is connected, Your day sits beside the orb; Search, Workflows and Customize carry visible labels and every other icon button a name and a tooltip. Tests: `tests/nova-dashboard.spec.ts` (R2-3 blocks), `lib/nova/store.test.ts`. NOVA's look beyond this is lane P3's (NOVA_DESIGN_REVIEW.md).

**R2-4 · Major · NOVA and ZIGi: two assistants · every page · all**
- **What a person experiences:**
  - Today and each pillar offer "Ask ZIGi about my …".
  - The nav offers NOVA.
  - NOVA's settings live under "Settings → ZIGi · Your Personal AI Companion".
  - NOVA tells you to turn Health on "for ZIGi".
  - The chat footer says "one history with ZIGi".
  - The left panel lists both under "Agents · 2".
- **Why it matters:** A new person can't tell which one to talk to, or whether they differ. Every competitor companion (Finch, Rosebud, Bevel) has one name.
- **Proposal (copy and settings only; ZIGi's look is PROTECTED):**
  - Say it once, everywhere: "ZIGi is your companion; NOVA is ZIGi's full-screen command center."
  - Rename the settings group "Your assistant (ZIGi & NOVA)".
  - Make NOVA's messages name the setting by its place in NOVA ("NOVA → Memory and scopes"), not ZIGi's.

> **Status (P2, 1 Nov):** Fixed in `981f6537` (NOVA's one sentence: "NOVA is your command center for everything; ZIGi is the same assistant inside each page.") and `15c1e159` (Settings' group "Your assistant" with NOVA's links; NOVA names "NOVA → Permissions"). Tests: `tests/nova-dashboard.spec.ts` (R2-4), `tests/settings-groups.spec.ts`, `tests/page-order-aa.spec.ts`, `tests/phone-pages.spec.ts`.

**R2-5 · Minor · NOVA · Light theme · 390 and 1440**
- **What a person experiences:** NOVA stays dark in Light while the bottom tab bar turns light under it.
- **Proposal:** If the dark stage is deliberate (like the PROTECTED hero), record it as an owner decision and give the bottom bar NOVA's dark treatment while NOVA is open. Otherwise give NOVA a Light stage.

> **Status (P2, 1 Nov):** Kept as an owner decision (ADR-036, follow-up 2): NOVA's stage is a Light dark island like the Today hero; fixed in `981f6537`: the phone bar wears NOVA's dark colours while NOVA is open (`themes/light.nova.css`). Test: `tests/nova-dashboard.spec.ts` (R2-5).

## Consumer first: the chain stays invisible

**R2-6 · Major · /app/welcome step 2 "Goals & money" · all · fresh (re-opens part of R3)**
- **What a person experiences:** A person picks "Goals & money · Plans, wealth and the money tools" and the focus "Save for something". After Finish, Today shows:
  - "Connect Keplr", a "Your wallet" card and "Staked ZIG · Read-only · Net APR assumption".
  - The banner "PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN".
  - "Local demo · simulated ZIG, never wallet funds".
  - Nav items Earn, Markets, Staking, Portfolio and Ecosystem.

  The welcome's own first step had promised "No crypto needed. The blockchain stays out of sight."
- **Cause:** `lib/chain-choice.ts` counts the welcome's "Goals & money" as choosing the chain (a stamped crypto page).
- **Why it matters:** "Save money" is the most common reason to pick a money app. Choosing it should give Monarch/YNAB-like money tools, not a crypto wallet.
- **Proposal:** "Goals & money" shows Goals and Wealth (money log, budgets, bills) only. Add a separate, explicit seventh tile, "Crypto & ZIGChain · wallets, staking, markets (optional)", that sets the chain choice. Extend `tests/consumer-first-x1.spec.ts` to cover "Goals & money" with no chain words.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` (lane RC): "Goals & money" shows Goals and Wealth only; the welcome's one chain choice is "Crypto & ZIGChain" under Extras. Tests: `tests/consumer-first-x1.spec.ts`, `tests/onboarding.spec.ts`, `lib/templates/templates.test.ts`, `lib/whats-new-chain/filter.test.ts`.

**R2-7 · Major (owner decision) · banner on every page · ≥ 1024 px · all · fresh**
- **What a person experiences:** On a device that never chose crypto, the desktop banner still reads "PUBLIC ALPHA · Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys." (`components/shell.tsx:133`). On the phone it folds to "PUBLIC ALPHA · More", which is fine.
- **Why it matters:** These are the first crypto words a desktop newcomer reads, on every page. The sentence is pinned by the owner's hosted check (`scripts/lib/hosted-alpha-stages.mjs:114`), so it stays until the owner decides.
- **Proposal:** Until the chain is chosen, show "PUBLIC ALPHA · Your records stay in this browser and are not a backup." and keep the staking sentence inside "More". The owner updates the hosted check to look for the sentence in "More".

> **Status (P2, 1 Nov):** Fixed now (lane P2, per ADR-036 Q31; `TIER 3 (public-safety labels)`): on a device that never chose the chain the notice reads "PUBLIC ALPHA · Your records stay in this browser and are not a backup."; the staking sentence is behind its More (Help → About this Alpha quotes it word for word; Settings' facts block carries it as before), and shows with the essentials when the page cannot (no scripts, a stalled read). Once the chain is chosen the notice carries it again. The owner's hosted check moved in the same change: `scripts/lib/hosted-alpha-stages.mjs` stage 2 reads the consumer line, follows More and reads the sentence in Help, then Settings as before. It is not the deploy workflow (`.github/workflows/**` unchanged; no workflow runs `scripts/verify-hosted-alpha.mjs`). Tests: `tests/release-review-2-p2.spec.ts` (R2-7, two tests), `scripts/lib/hosted-alpha-stages.test.mjs` (stage 2 reads it where it lives), `tests/hosted-verifier-order.spec.ts` (runs stage 2 on the build); `tests/ab-shell.ts` `expectAlphaFacts` and `tests/private-read-delay.spec.ts` re-pointed at equal strength (the line, the sentence's absence there, More's target).

## Pillars: density, first action, repetition

**R2-8 · Major · /app/health and /app/wealth · 390 and 1440 · all · fresh and Showcase**
- **What a person experiences (page heights at 390 px):**

  | Page | Fresh | Showcase |
  |---|---|---|
  | Health | 8,638 px (≈ 10 screens) | 10,107 px (12) |
  | Wealth | 8,168 px | 13,645 px (16); 21,218 px at 1440 |

- **Health repeats itself:**
  - Weight trend, Energy estimate and Your coach appear as tiles at the top, then again as full cards ("SIX WEEKS", "ADAPTIVE", "WEEKLY CHECK-IN").
  - Breakfast, Lunch, Dinner and Snacks appear twice ("Your day, meal by meal", then the Diary tab).
  - The empty "Seven days of care" table has 35 "— No entry" cells.
  - A "Faster ways to log" card advertises features of the same page.
- **Empty Wealth shows complete forms at once:** the money-log entry form, the weekly budget form, the monthly budget form, "Add a bill by hand", nine "Show" folds and a calculator promo.
- **Why it matters:** Our own bar (COMPETITORS.md §(c)): "at most one number above the fold; primary action at the bottom; lists dense enough for 8–10 rows". MacroFactor and Cronometer open on remaining calories and one "+" sheet; Monarch and YNAB open on a few widgets with drill-ins. Here the one action ("Log food", "+ Add asset") is lost in a long scroll, and "overwhelming" is the top complaint the research found against Stoic, MacroFactor and Bevel.
- **Proposal (order and folding; the visual system stays):**
  - **Health:** keep the date bar, quick counters, today's calories and macros, and water above the fold. Remove the duplicate summary tiles, or the duplicate full cards and link the tiles to them. Show meals once (the Diary). Fold "Seven days of care" until there are 2 or more logged days. Drop "Faster ways to log" (the features are in the Log food sheet).
  - **Wealth:** keep the total, "What you have" and one "Log spending" button. Open the entry and budget forms as sheets from their buttons, not inline. Collapse the analytic sections into one "More about your wealth" group until there are 2 or more assets.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` and `1d6902be` (lane RB): duplicate tiles and cards, meals twice, "Faster ways to log" and the empty care table gone or folded; Wealth's forms open from their buttons and the analytic rows fold until a second asset. Measured at 390 px: Health 10.2 → 6.23 screens (fresh), 12.0 → 7.38 (Showcase); Wealth 9.7 → 5.13 and 16.2 → 9.14. Test: `tests/pillar-phone-length.spec.ts` (ceilings ≤ 69 % of before), with `tests/health-aa.spec.ts` and `tests/run11-wealth-changes.spec.ts`.

**R2-9 · Major · Today with data · 390 and 1440 · all · Showcase (any real person with goals)**
- **What a person experiences:** The same goal appears up to five times in one scroll. Japan adventure shows in "What matters today", "Your goals", "Your funding agenda", "Needs attention" and the "Your destinations" widget. "Your destinations / 7 active goals" and "Meals today / 1,970 kcal" each render twice (a widget summary row, then the same widget expanded). The water tile says "0 mL · 0 entries today" while the Life overview gives Health 90 %. R14 fixed the empty Today; the full Today still reads as every module's card stacked up.
- **Compared with:** Sunsama and Structured show one day list; Monarch shows widgets, each once.
- **Proposal (non-protected cards only):**
  - Show a goal once on Today: in "What matters today" if it needs attention, otherwise in "Your goals".
  - Merge "Your funding agenda" and "Needs attention" into one "Next money steps" list.
  - Remove the duplicated widget summary row.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` and `1d6902be`: a goal shows once on Today, "Your funding agenda" and "Needs attention" are one "Next money steps" list, the widget overview no longer repeats widgets with cards. Tests: `lib/today/next-money-steps.test.ts`, `tests/run9-2-product.spec.ts`, `tests/run10-widget-overview.spec.ts`, `tests/today-roles-af.spec.ts`.

**R2-10 · Major · finding Notes and Tasks · 390 and 1440 · all · fresh**
- **What a person experiences:** Notes, Tasks, Agenda and Journal are not in the desktop sidebar (Today, Goals, Habits, Health, Wealth, Activity, NOVA, Checklist, Settings, Help) or the phone tab bar. They are reached through NOVA's left panel, a Today widget once tasks exist, Quick add → Note, or Search actions. A new person who reads in What's new about Notes and Tasks can't find a page for them.
- **Why it matters:** Todoist, TickTick and Obsidian make their list the home. Here two headline features are effectively hidden.
- **Proposal (the nav bars' design stays PROTECTED):** Register Notes and Tasks as nav entries the same way NOVA and Checklist already are (`registerNavExtra`), shown by default and switchable in Settings → Pages. Add "Notes" and "Tasks" as plain page results in Search.

> **Status (P2, 1 Nov):** Phone and tablet fixed in `15c1e159` and `fa5643ce`: Tasks, Notes and the Journal are navigation entries in the phone's More sheet and the tablet rail, and page results in Search. Desktop fixed now (lane P2, per ADR-036 Q31): they join the desktop sidebar where the window has room for them, at least 1380 px tall (`components/navigation.css`; measured: with the full spacing of windows over 1000 px the Showcase's fullest list of nineteen ends Help at 1336 px), before Settings, in the last group; in a 900 px window they stay out, so the PROTECTED fit check stands. Settings → Your pages & buttons names them ("in a tall window also …") and Help says where they are. Tests: `tests/release-review-2-p2.spec.ts` (R2-10: the list, Help inside the window with 24 px to spare, 44 px rows, keyboard order, gone again at 900 px); `tests/brand-nav-polish.spec.ts` (1440×900 fit) and `tests/page-marks.spec.ts` unchanged.

## First run and Quick add

**R2-11 · Minor · Today, brand-new device · 390 · all**
- **What a person experiences:** Two onboarding cards follow each other: "Welcome to ZIGoals · Start setup / Explore the demo / Not now", then "Make Today yours · Balanced / Wealth / Habits + Health / Health-only · Keep Balanced and continue". They ask the same question twice. The brand-new Today also shows pillar cards for Health and Goals only, not Habits or Wealth.
- **Proposal:** Show "Make Today yours" only after "Not now". Add one empty card each for Habits and Wealth, as R14 intended.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` (lane RB): "Make Today yours" waits until the welcome is answered; the brand-new Today has one empty card each for Habits and Wealth. Tests: `tests/onboarding.spec.ts`, `tests/consumer-first-x1.spec.ts`, `tests/run10-source-pinning.spec.ts`.

**R2-12 · Minor · /app/welcome · all · fresh**
- **What a person experiences:**
  - Step 2 puts Chess and Music beside Goals, Habits and Health as "what you want to improve".
  - With only "Goals & money" chosen, Habits is hidden from the nav, while the welcome itself created a "Contribute" habit that Today then shows with "All habits →".
- **Proposal:**
  - Move Chess and Music to a later "Extras" line.
  - Keep the Habits page shown whenever the welcome creates a habit.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` (lane RC): Chess, Music and the chain are an Extras line; a habit the welcome creates keeps the Habits page shown. Tests: `lib/templates/templates.test.ts`, `tests/consumer-first-x1.spec.ts`.

**R2-13 · Minor · Quick add sheet · 390 · all**
- **What a person experiences:**
  - The options run Note, Goal, Asset, Contribution, Habit, Health entry, so the daily logs (water, meal, a habit tick) come last and the rare creations first.
  - "Note" is left-aligned while the other rows are centred.
  - A four-line speech disclosure sits above the options, so the options start below the fold.
- **Compared with:** MacroFactor and Daylio put the most frequent log first in the "+" sheet.
- **Proposal:**
  - Order by frequency: Health entry, Habit, Note, Contribution, then Goal and Asset.
  - Use one row alignment.
  - Shorten the disclosure to one line with "How speech works" behind it.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: Health entry, Habit, Note, Contribution, then Goal and Asset; Note is one of the sheet's own rows; the speech disclosure is one line with "How speech works" behind it. Test: `tests/logo-quickadd-goals-header.spec.ts` (R2-13; one of the intro-video specs that pass in CI only, CLAUDE.md).

## Honest numbers and copy

**R2-14 · Minor · /app/health "Energy estimate" tile · all · Showcase**
- **What a person experiences:** The tile reads **"28 of 14 days · logged so far; about two weeks of logs make the estimate"** (`components/health/health-highlights.tsx:47`). The card below says the real gap: "7 of 10 weight readings". The tile tells the person days are missing when it is weigh-ins.
- **Proposal:** Name the missing input: "3 more weigh-ins to go".

> **Status (P2, 1 Nov):** Fixed in `15c1e159` (lane RB): the tile names the missing input ("3 more weigh-ins to go"). Tests: `lib/health-aa/energy-progress.test.ts`; on the page `tests/release-review-2-p2.spec.ts` (R2-14, lane P2).

**R2-15 · Minor · /app/health, /app/habits · all · fresh (unknown is not zero)**
- **What a person experiences:** With nothing logged:
  - Health shows "0 kcal logged", "Protein 0 g", and "0 kcal · No entry" under each meal. The same page elsewhere says "A dash means no entry, not zero".
  - Habits' "Consistency by weekday" shows 0 under every weekday although no habit exists.
  - Three quick counters (Push-ups, Pull-ups, Squats) are pre-made that the person never chose.
- **Proposal:**
  - Use "—" until the first entry of the day.
  - Hide the weekday strip until there is a habit.
  - Start quick counters empty with "+ Add counter" and the three as suggestions.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: Health shows "—" / "No entry" until the first entry, and Habits hides the weekday strip until there is a habit. Kept, with the reason (owner decision, ADR-036 Q31): the three default quick counters stay, because they feed the protected Checklist's default path. Test: `tests/wiring-2-r2.spec.ts` (R2-15, lane WB).

**R2-16 · Minor · /app/settings · 390 and 1440 · all · fresh (re-opens part of R4)**
- **What a person experiences:** Settings is 16,112 px tall at 390 px (about 20 screens). It offers four backup paths one after another: encrypted backup, three per-module backups, Export everything and account sync. Developer words remain:
  - "Positions and Goals backup"
  - "Transactional local storage · Move this module to IndexedDB" (`components/private-vault-tools.tsx:77`)
  - "Browser storage health"
  - "Separate versioned backups preserve the existing Goal recovery format." (R4 listed this sentence; it is still there.)
- **Compared with:** Daylio offers one "Backup & restore".
- **Proposal:**
  - Lead with one recommended path ("Make an encrypted backup"), then "More ways to back up" folded.
  - Rename "Positions and Goals" to "Goals and wealth".
  - Move storage internals under Diagnostics.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: "Goals and Wealth" (was "Positions and Goals"), the developer sentence gone, storage health and the storage upgrade under Help & diagnostics. Fixed now (lane P2): Backup & restore leads with one recommended path ("Recommended: a protected copy, the first card below…", then "More ways to back up" named once), and the last two "Positions and Goals" mentions (Help, the older Goal export) read "Goals and Wealth". Kept, with the reason: the other three ways stay open below rather than folded, because Health's, Habits' and the backup notices' links land on their anchors (`#backup-health`, `#export-everything`, …) and six specs drive them. Tests: `tests/copy-polish.spec.ts`, `tests/storage-health-wording.spec.ts`, `tests/settings-groups.spec.ts`.

**R2-17 · Minor · /app/tasks · 390 · all**
- **What a person experiences:**
  - The hero and a five-line explanation fill the first screen, the add form the second, and the list starts on the third.
  - The page explains internal decisions: "The Checklist on Today stays as it is: tasks are one-off things to do; the Checklist is your daily path."
  - The Goal picker offers finished goals ("My first 0.1 BTC").
- **Compared with:** Todoist opens on the list with the add field at the bottom.
- **Proposal:**
  - Put the list first and a one-line "Add a task" field above it, with priority, day and goal behind "More".
  - Move the Checklist sentence to Help.
  - Offer active goals only.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: the list first with a one-line add (priority, day, time and goal behind More), the Checklist sentence moved to Help, active goals only. Test: `tests/tasks-time.spec.ts` (R2-17).

**R2-18 · Minor · /app/notes · 390 · all**
- **What a person experiences:** The capture box shows four buttons (Capture a note, Save to inbox, Add a photo, Speak a note…), and the page explains "[[links]]" in its subtitle before the person has written anything. Journal, Notes' daily note and the check-in are three places to write about a day; Notes links the Journal entry but never says which one to use.
- **Proposal:** Use one primary "Save" with photo and voice as icons. Explain `[[` in the field's placeholder only. Add one sentence on Notes and Journal: "Journal is how the day felt; a note is anything you want to keep."

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: one primary Save, photo and voice as named icon buttons, `[[` explained in the placeholder only, one line on Notes and the Journal. Test: `tests/wiring-2-r2.spec.ts` (R2-18, lane WB).

**R2-19 · Minor · /app/health header · 390 · all**
- **What a person experiences:** The header's three buttons are "Log water", "Privacy & backups" and "Log food". A settings link takes a primary spot on the busiest logging page.
- **Proposal:** Replace "Privacy & backups" with "Log weight" (or the "+" sheet), and keep privacy in the text links beside "Ask ZIGi".

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: Log weight, Log water, Log food; privacy stays in the text links. Test: `tests/wiring-2-r2.spec.ts` (R2-19, lane WB).

**R2-20 · Minor · /app/wealth total · all · Showcase**
- **What a person experiences:** The total says "One total in a single currency is coming later." (`components/platform/wealth-total.tsx:21`). This is roadmap copy in a 1.0, as R6 was.
- **Proposal:** "Currency totals stay separate; no exchange rate is assumed." Drop the promise.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: "Currency totals stay separate; no exchange rate is assumed." Tests: `tests/ui-design-pass.spec.ts`, `tests/ah-numbers.spec.ts`.

**R2-21 · Minor · /app/habits · all · Showcase**
- **What a person experiences:** Five Showcase habits carry the same filler line, "A small daily step toward tomorrow." (`lib/showcase-data.ts:151`), on every card.
- **Proposal:** Give each Showcase habit its own short "why", or none.

> **Status (P2, 1 Nov):** Fixed in `15c1e159` and `1d6902be`: each Showcase habit has its own short why. Test: `tests/wiring-2-r2.spec.ts` (R2-21, lane WB).

## Polish

**R2-22 · Polish · NOVA greeting · all.** The phone and desktop text dumps read "Still up? NOVA is online." twice (a hidden copy for assistive technology beside the visible one). Check that screen readers announce it once.

> **Status (P2, 1 Nov):** Fixed in `981f6537`: the greeting is read once. Test: `tests/nova-dashboard.spec.ts` (R2-22).

**R2-23 · Polish · Goals · all · Showcase.** A finished goal shows "Finished · Finish day not recorded". Prefer "Finished" alone when the date is unknown.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: "Finished" alone when the finish day is unknown. Test: `tests/goals-best-aa.spec.ts` (R2-23).

**R2-24 · Polish · Health and Wealth headers · 1440.** The action buttons float mid-right, detached from the heading and subtitle (Health: "Privacy & backups / Log water / Log food" sit between the title and the art). Align them with the subtitle row, as Goals and Habits do.

> **Status (P2, 1 Nov):** Re-checked by lane P2 at 1280, 1440 and 1920 px (fresh and Showcase, build of `50b71ba2`): not reproducible since `15c1e159` (R2-19's buttons). Health now uses the same header grid as Goals and Habits (its buttons beside the subtitle, flush with the title's right edge, "Ask ZIGi" and the backup link under them); Wealth's longer title stacks its actions on the line under the subtitle, flush with its left edge. Nothing floats apart, so the layout is kept. Test: `tests/release-review-2-p2.spec.ts` (R2-24 pins both layouts and that Health matches Goals and Habits).

**R2-25 · Polish · Habits empty state · all · fresh.** The bar in COMPETITORS.md §(c) asks for "a short template list rather than a blank form". "Habit ideas" exists as a chip. Show three one-tap ideas ("Drink water", "Walk 10 min", "Read 10 pages") in the empty card itself.

> **Status (P2, 1 Nov):** Fixed in `15c1e159`: three one-tap ideas in Habits' empty card. Test: `tests/wiring-2-r2.spec.ts` (R2-25, lane WB).

---

## What already beats the competitors

- **Privacy and honesty:**
  - "Everything you add stays on this device"; no ads, no analytics (welcome step 1).
  - Every Showcase surface is labelled, including NOVA ("Showcase · fictional example data") and Tasks ("These example tasks are not yours").
  - Life balance says "an area with nothing known… is never counted as zero"; "Price unavailable" never shows as 0.
  - Health estimates say "an estimate, not medical advice"; money tools say "Not financial advice".
- **Consumer first on a fresh phone:** no wallet, staking or crypto pages; a calm Today with the welcome under the hero (R2, R3 and R14 hold at 390 px).
- **Breadth:** money log, rules, splits, bills, budgets, buffer days, net worth, goal pace, routines, quit habits, an adaptive energy estimate, notes with backlinks and a graph, tasks with Pomodoro. No single competitor combines these.
- **Themes:** Light and Dark give identical page layouts (the same height on all eight routes measured at 390 px) and keep the hero's protected dark island.
- **NOVA on a desktop,** when it does answer, answers exactly, from the device, and says so ("Answered on your device · no AI used").

## Environment note (not a finding)

In this sandbox, Playwright's default *headless shell* crashed the renderer on `/app/nova` at 1440 px (three runs), not at 1024. Full Chromium (the `chrome` channel the project's specs use) did not crash. Nothing points to a product fault; G5 or the lead may confirm once on real Chrome.
