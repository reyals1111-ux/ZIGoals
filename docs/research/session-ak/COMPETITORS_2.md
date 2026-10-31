# Session AK — competitor research, round 2 (F3, read 2026-10-31)

Research only. It builds on [COMPETITORS.md](COMPETITORS.md) (round 1: gap matrix, BUILD list 1, UI bar (c)). Every
source was read on **2026-10-31**. It is cited as `[n]`, and the list is at the end. **(2°)** marks a secondary source (a
review, an aggregator or a competitor's blog). **(s)** marks a source seen only through a search-result summary, not
opened. App Store "What's New" entries often show no year. Dates below are 2026 unless the listing showed a different
year or the order of versions says otherwise.

**Checked against the code first.** Before an item went on BUILD list 2, `apps/web/lib` and `apps/web/components` were
searched for it. The following **already exist** and are not proposed again: time away that keeps streaks (vacation, sick
and rest days, `components/habits/vacation-panel.tsx`, `lib/habits.ts` `setVacation`); the evening wrap-up
(`lib/wrap-up`); the morning check-in (`lib/checkin`); habit stacks, sections and challenges (`lib/habits-v2`,
`components/habits/habit-stacks.tsx`, `habit-sections.tsx`); the Checklist's soft bell and vibration (`lib/checklist/feedback.ts`);
the first-week and seven-in-a-row badges (`lib/game/badges.ts`); the month review (`lib/review-unified`); Hide amounts;
the clinician report; income and reward receipts on the Portfolio (`lib/portfolio/receipts.ts`); the Sankey purpose flow;
the review inbox, rules and splits; the debt planner (`components/wealth/debt-planner.tsx`, F5 in progress); body
measurements and progress photos; onboarding with pillar choice and the tour; "No ads, no trackers" in onboarding.
**F0 and F5 items** (warm-up, weekly calorie view, Loop export, time-of-day sections, savings challenges, net-worth
milestones, supplements log, unified calendar and .ics, Wrapped, command palette, smart time suggestions) are already
planned. Where this research supports one of them, it says "supports F5" and does not list it again.

## 1. Findings per app

### Health and recovery

- **Bevel** (iPhone) [1][2]. In 2026 it added Google Health import (mid-summer release), **Blood Pressure** tracking and
  **Health Records** (lab results and clinical records with trends). It also added **Ghost Mode chats** (AI chats that are
  not kept), a Fitness redesign (Training Calendar, Muscular Load, Routines, PRs, Timeline, Oct 1–4), calendar syncing for
  training plans (3.2.6), pinned preferred nutrition units (3.2.5) and a lower max-HR setting for people on beta blockers.
  Core scores are free and the AI costs extra (credits from $4.99). The privacy label lists "Identifiers" as
  **used to track you**. Reviews praise "no calorie-goal pressure" and complain about the redesign ("preferred the old
  design").
- **Gentler Streak** [3][4]. **Rest days keep the streak alive.** You can set a status for illness, injury or
  vacation. An optional **Morning Check-In** notification arrived in 5.12.5 (Jun). Other 2026 releases added a Cardio
  Fitness estimate (Apr), on-device AI workout summaries and Siri intents (Sep), RMSSD HRV and a temperature baseline
  (5.13.5, Oct 22), yearly and weekly recaps, and a privacy explainer with an in-app guide (late 2025). Reviews:
  "life-changing" for chronic illness; "reminders felt pushy" (2023, still cited).
- **Athlytic** [5]. The label says **no data collected**. Its **Journal** shows how caffeine or alcohol affect
  Recovery, and its **exportable Journal analysis** came in 27.0.5 (Oct 13). Other features: data export (27.0.6),
  Women's Cycle Insights, a "What if" tool on Athlytic Age, and a 24/7 monitor that checks vitals against your normal range.
  Pro is €5.99/month.
- **Welltory** [6]. Version 4.55 (May 15) added **Self-Discovery experiments**. 4.60 (Aug 11) added **"My Patterns"**:
  which people, places and habits affect stress. 4.62 (Sep 24) turned insights into a **swipeable daily stack**. 4.50
  (Mar 25) added HRV-based health alerts. It also has BP logging, voice notes and a year-in-review (Dec 2025). Lifetime
  costs $499.99. The label lists **location and contact info used to track you**. Reviews mention repeated upgrade
  prompts to people who already pay, and activity messages that assume an able body.
- **Oura** [28]. **Lab Uploads** (Jun 30): a PDF of lab results from any provider sits beside the ring data. 2026 also
  brought Health Radar, GLP-1 insights, Hormonal Birth Control and Menopause insights (May 6), and On-Demand physician care
  in the US (s).
- **WHOOP** [29]. **Behavior Insights** (Mar): a behaviour shows its link with Recovery once it is logged at least
  5 times "yes" and 5 times "no" in 90 days. **Advanced Labs uploads** are free for every member worldwide (PDF or
  screenshot). Announced in Sep: a journal you speak to, and one merged daily experience (s).
- **MacroFactor** [25]. AI recipe import (Apr), AI custom food creation and **label scanning** (Jul). There is no free
  tier ($71.99/year). Reviews: "overwhelming at first".
- **Cronometer** [27](s). Tracks up to 92 nutrients (Feb), a beta of AI photo logging matched against its lab-analysed
  database (Apr), and Apple Watch food logging.
- **Hevy** [26]. Pinned notes on exercises (3.2, Oct), sending workouts to ChatGPT or Claude, Gym Profiles with
  leaderboards, an **RPE colour scale on the set row** (3.1.11), and progressive overload for reps-only exercises. No ads.
  Complaint: bodyweight squats add no volume.

### Mind and journaling

- **Stoic** [7]. A morning and evening routine, **journal templates** (therapy prep, CBT thought dump, dream journal),
  **export for a therapist**, and a lifetime option (Jul). 2026.21 restored missing journal entries and added backup and
  iCloud deletion options. Its label lists no linked data. Complaint: "the interface is overwhelming at times".
- **Reflectly** [8](2°). The most common complaint is **subscription and billing**: unexpected charges and paid features
  that will not open. The prompts and insights sit behind the paywall. It costs $59.99/year.
- **Rosebud** [9]. No free plan since **30 Sep 2026** (2°). Its privacy policy (8 Sep) names five AI providers (2°). A
  **mindful bell** prompts a pause during long sessions (Jun–Jul). It added "keep your words safe" messaging (Oct 16)
  after reviews of **voice recordings lost** before processing (Jun 2025). Bloom costs $107.99/year.
- **Daylio** [24]. **Scales** (1.70, Apr): sliders for sleep, stress and energy. **"On This Day"** (1.74, Jul): entries
  from the same date in past years. A redesigned **PDF export** (Aug) and Apple Watch quick entries (1.78). Entries are
  stored on the device.
- **How We Feel** [30](2°). Spanish throughout (Apr), a screen for **feedback on weekly insights** (1.17.0), and a
  Calendar tab beta with opt-in sleep, steps and caffeine and a **PDF of check-ins**.
- **Finch** [23]. Morning mood and an evening gratitude moment in which the pet "returns with stories". **There is no
  penalty for unfinished goals.** Rating 4.9 from 770K. Complaint: people tick tasks for coins without doing them.

### Planning and habits

- **Structured** [10]. Morning-planning and overdue reminders are **separate** (4.4.9, May). It added **Intervals**
  (focus and break blocks, 4.5.0, Jun), near-real-time sync (Aug), **Replan** for missed tasks (Pro), and Suggested
  Subtasks and colour prediction (Sep). Reviews love the **check-off sound**. They complain that an unplanned task does
  not push the rest of the day later.
- **Sunsama** [11]. The **Daily Shutdown** asks "what did you accomplish, what's moving to tomorrow". Planning warns
  when the day's estimated work runs past your shutdown time. Task Priority came in May. It **celebrates only when every
  task is done or a ritual is finished**, never each task. Planning is now done by an agent (help centre).
- **Tiimo** [12]. AI co-planner, timed subtasks, "Snap to plans" (photo to tasks, Oct 5) and smoother onboarding
  (3.69). It **tracks with identifiers** (privacy label). It partnered with Gentler Streak (Jul).
- **Strides** [20]. Interactive pace and projection lines (Mar), Goal Plan lines, collapsible Due sections (May),
  **shareable achievement images** (Sep 13), and Tasks (20.0, Oct 23). The free tier holds 3 trackers. Reviews call the
  price too high.
- **Habitify** [21]. **Pause-and-reflect after a skipped habit** (Jan). Tiered pricing (Apr) that made extra habits
  "view-only". **Habit stacking in reminders** (Mar). **Week view: check in from the grid** (51.x, Oct). An AI assistant
  with memory (Oct). A public bug report says a **weekly streak reset to 0 over New Year** [40](s).
- **Streaks** [22]. **"Break It Down"**, task suggestions and medication tracking (Sep 2025), then multi-medication
  tasks. It is a **$5.99 one-time purchase**, and the only data it lists is crash data.

### Money

- **Copilot Money** [13]. Money Assistant (acts only on what you approve), **running totals for selected transactions**
  (8.6, Oct 22), totals in search results, a **Month and Year in Review** with shareable slides, and a **legacy app
  icon** after one year. It costs $109/year. Complaints: bank sync loses transactions, posts them on the wrong date and
  needs daily re-syncing.
- **Lunch Money** [14]. The **three most recently used categories show first** in the picker, mobile widgets, and
  custom category order in reports (Aug 31). API v2 has budget periods and rollovers (Feb).
- **Actual Budget** (open source, local-first) [15]. A **Balance Forecast report** and a goal-template UI (26.6, Jun).
  A **mobile calculator** in amount fields (26.7). Age of Money and Payee Locations became stable, and onboarding was
  redesigned (26.8). An **in-app tour for new users** (26.9). A Monte Carlo retirement report, a Sankey of transfers and an
  in-app Notifications page (26.10).
- **YNAB** [18]. **Photos on transactions** (Apr 20). **Net Worth sharing in four formats with hidden amounts**
  (Mar 23). Hide Amounts on the web (Jun 10). **Card Mode**: swipe to approve or skip imported transactions (iOS Sep 16,
  Android Oct 21). **Plan Reset** (Sep 16). Income vs Spending (Feb).
- **Monarch** [19]. **Forecasting** of what-if scenarios (Apr 13), Monarch Plus at $299/year (Apr 20), Goals rebuilt
  (Jun 23), **side-by-side forecasting** and email forwarding (Jul 29), a **treemap** report (Aug 28), and an MCP
  connector for AI tools (Oct 21).
- **Wealthfolio** [16]. Local-first, no account. A goals glide path with on-track status, a FIRE planner with a Monte
  Carlo "Risk Lab", **contribution-limit room** (IRA/401k/TFSA), dividend income and allocation drift. Sync is a paid
  option.
- **Ghostfolio** [17]. A PWA with **Zen mode** (hides absolute values), **static analysis of portfolio risks**, and
  import and export. October brought an ROI calculation and MCP tools.

### Crypto and ZIGChain

- **Keplr** [31]. Its iOS app is now mostly stability releases. 2.1.212 added **"Cancel Unstaking"** and steadier
  WalletConnect. The dashboard has validator updates, liquid staking and **"voting with explanations"**. A 2023 review
  tells of **ATOM lost to a fake pop-up that asked for the seed phrase**.
- **Leap Wallet**: **ended 28 May 2026** [32]. The extension, the mobile apps, Compass, the WebApp, Swapfast and its
  Cosmos Hub validator all closed. Stakers were told to redelegate. There is **no successor**: Leap pointed people to
  Keplr, MetaMask, Phantom and Rabby (s).
- **Cosmostation**: **wallet discontinued from 1 Sep 2026**; only key export remains [33]. **No successor** was named.
  Coverage warns of **fake "migration help" apps** (s).
- **ZIGChain ecosystem** [34](2°). The apps are OroSwap (DEX), Valdora (liquid staking, RWA vaults), Nawa, Permapod
  (lending) and DeFa (private credit). The official ecosystem page returned 404 today. ZIGoals already lists Valdora,
  OroSwap and Nawa (`lib/earn/dock.ts`), and F4 owns this area in depth (ZIGCHAIN_ECOSYSTEM.md). The finding that matters
  here: **ZIGoals' own copy still names Leap as a wallet to connect** in `components/earn/oroswap-section.tsx` ("connect
  your wallet (Keplr or Leap, for example)"), although `lib/wallet-link.ts` already records that Leap ended.

## 2. Themes

### 2a. Newest 2026 features per pillar leader (summary)

| Pillar | Leader(s) | 2026 direction | ZIGoals |
|---|---|---|---|
| Health records | Oura, WHOOP, Bevel | **Lab results and blood pressure** beside daily data [1][28][29] | none → BUILD 2 #4 |
| Recovery insight | WHOOP, Welltory, Athlytic | **Behaviour → outcome** with minimum counts, **experiments** [5][6][29] | Compare exists; experiments missing → #8 |
| Mind | Daylio, Stoic, How We Feel | **Scales, On This Day, templates, PDF** [7][24][30] | PDF report exists; the rest → #3, #12, #13 |
| Planning | Structured, Sunsama | **Intervals, replan, shutdown "moving to tomorrow"** [10][11] | wrap-up exists → #14, #15 |
| Habits | Habitify, Streaks, Strides | **Week grid, stacking, Break It Down, share images** [20][21][22] | mostly exists or in F5 |
| Money | YNAB, Copilot, Monarch, Actual | **Card-mode review, receipt photos, forecasting, treemap, running totals, recent categories** [13][14][15][18][19] | → #6, #7, #9, #10, #11, #18, #19 |
| Wealth (local-first) | Wealthfolio, Ghostfolio | **Zen mode, contribution room, risk checks** [16][17] | Hide amounts exists; rest recorded |
| Crypto | Keplr | **Consolidation**: Leap and Cosmostation closed [31][32][33] | → #1, #2 |

### 2b. Onboarding and retention patterns

- **The first 7 days matter most.** Duolingo found that people who reach a 7-day streak are **3.6×** more likely to
  finish a course. A milestone-day animation raised 7-day retention by **1.7%**. Holding up to **two freezes** raised
  daily users by 0.38%. Early streak days feel big (2 → 3 is +50%) [35]. Fabulous reports **2× return visits** with a
  personalised first journey (vendor case study, 2°). A critique notes that its long onboarding filters people out and its
  gimmicky sharing loses trust [42](2°). Actual Budget (26.9) and Tiimo (3.69) both reworked first-run in 2026 [12][15].
- **Streaks with slack.** Gentler Streak counts rest days [3]. Apple lets you pause Activity rings (watchOS 11) [36].
  Duolingo has freezes [35]. Habitify adds a reflection after a skip [21]. ZIGoals already has time away and skip reasons.
  The thing to say more loudly is that **a missed day never costs points**.
- **Reminders.** Keep one morning reminder and one overdue reminder, separate and each optional (Structured [10]). Make
  the morning check-in opt-in (Gentler Streak [3]). The **complaint side**: reminders "pushy" [3], upgrade prompts sent
  to people who already pay [6], and notifications "too aggressive or too easy to miss" [37](2°).
- **Celebrations.** Celebrate the whole, not every tick: Sunsama celebrates only all-done or a finished ritual [11]. Share
  images on achievements (Strides [20]). A Year in Review with a small reward (Copilot's legacy icon [13]). One milestone
  animation on day 7 (Duolingo [35]). ZIGoals' calm one-time celebrations (`lib/celebrations.ts`) fit this bar.

### 2c. Common complaints in recent reviews → ZIGoals advantages, and where the app should say them

| Complaint (evidence) | ZIGoals advantage (true today) | Where to say it (one calm line) |
|---|---|---|
| **Paywall creep**: MFP's barcode behind Premium, paywalls make up 29% of calorie-app 1–3★ reviews [38][43](2°); Strides' 3-tracker free tier [20][37]; Reflectly prompts paywalled [8]; Rosebud has had no free plan since Sep [9] | Barcode, unlimited habits, trends and export are included; ZIGi with your own key is "Premium · free during Alpha" (`lib/entitlements.ts`). **Do not promise "free forever"**: pricing is the owner's decision | Barcode fold ("Scanning is included"); Habits empty state; Insights → Compare header; landing FAQ |
| **Ads**: 15% of calorie-app complaints; video ads even for paying users [38](2°) | No advertising, no analytics (onboarding already says so) | Settings → About; landing "Private by design" |
| **Privacy**: Bevel and Tiimo track with identifiers [1][12]; Welltory with location and contact [6]; Rosebud names 5 AI providers [9]; Mozilla's mental-health review [41](s) | Journal, mood and health stay on the device; ZIGi only talks to the provider the person chose | Journal and check-in footer (`NOTE_SAVED` exists: keep it on every Mind surface); the ZIGi key screen |
| **Sync loss and lost streaks**: habit trackers lose streaks after a reinstall or sync error [37](2°); Way of Life loses data on a new phone [37]; Habitify's New-Year reset [40](s); Rosebud lost voice recordings [9]; Copilot sync gaps [13] | Streaks are computed from check-ins on the device; Export everything; **Test a backup**; a monthly backup reminder | Habits streak help line ("Your streak is worked out from your own check-ins"); Your data page ("Last tested backup: …") |
| **Nagging**: [3][6][37] | Every reminder type is off until chosen; quiet hours | Settings → Notifications header: "Nothing is sent unless you turn it on" |
| **Clutter and overwhelm**: Stoic, MacroFactor, MFP redesign, Bevel redesign [1][7][25][38] | Pillar choice hides pages; compact habit list | Settings → Pages ("Show only what you use"); onboarding pillar step |
| **Shame mechanics**: 12% of calorie-app complaints [38](2°); Habitica's HP loss [37] | Calm rules: no guilt words, no penalties | Habits help; the rewards shelf note |
| **Wallet companies closing**: Leap (May) and Cosmostation (Sep) [32][33] | Non-custodial: ZIGoals never holds recovery words, so goals, purpose and records do not depend on any wallet company | Wallet sheet and Help → "Can I use a wallet other than Keplr?" (already mentions both endings); BUILD 2 #1 and #2 |
| **Export and account deletion**: 5% [38](2°) | Export everything, Erase everything, no account needed | Landing FAQ; Settings → Your data |

### 2d. Delight details worth copying (calm versions)

1. **Recent categories first** (Lunch Money [14]): less scrolling every day. BUILD 2 #6.
2. **Running total of selected rows** (Copilot [13]): "3 selected · €84.20". BUILD 2 #7.
3. **Swipe cards for review** (YNAB Card Mode [18]). BUILD 2 #9.
4. **On this day** (Daylio [24]). BUILD 2 #3.
5. **A soft bell between focus and rest** (Structured Intervals [10], Rosebud's mindful bell [9]). BUILD 2 #15.
6. **Celebrate the whole, once** (Sunsama [11]). It already fits `lib/celebrations.ts`; keep it.
7. **Save the raw words before any AI touches them** (Rosebud's lost voice recordings [9]). A principle for ZIGi voice
   and journal: the typed or transcribed text is saved first, and AI follow-ups come after.
8. **An RPE colour scale on the set row** (Hevy [26]): a small visual cue for effort, and RPE exists already.
   Recorded as polish for F6.
9. **A share image for a milestone, amounts hidden** (YNAB, Strides [18][20]). BUILD 2 #17.
10. **A calm day-7 moment** (Duolingo [35]). BUILD 2 #5.

## 3. Ranked BUILD list 2

Every item is web-possible and is **not** in ZIGoals or in the F0/F5 plans (code searched 2026-10-31). Each stays inside the
non-negotiables: data stays on the device, no tracking, no new dependency, non-custodial, no projection presented as a
guarantee, information not advice. Every new record uses a NEW key `zigoals:<name>:v1` through `DeviceRecordSpec`
(`z.looseObject`, `version: z.literal(1)`, bounded arrays), or IndexedDB `zigoals-<name>-v1` for photos. The lead wires
export, restore, erase, catalog and frozen readers. Each item has a Showcase example (labelled) and an empty state that
teaches. Effort is "a few hours" unless noted.

### P1

1. **Recovery-words guard on every free-text field** — Keplr review (ATOM lost to a fake seed pop-up) [31]; fake
   Cosmostation "migration" apps [33](s). Reuse the detector in `lib/emergency-sheet/secrets.ts` (its shapes: 12+ short
   words, hex keys, xprv, WIF, PEM…). Build a tiny wrapper, `lib/secret-guard/guard.ts`, that checks text **before it is
   saved or sent**: journal entries, check-in and habit notes, money-entry notes, goal notes, Quick add, and every ZIGi
   message (above all: **never sent to an AI provider**). On a match, the field shows one calm line: "This looks like
   recovery words. ZIGoals never needs them, and nobody helping you should ask for them." It offers **Remove it** and,
   for notes only, **Save anyway**. A ZIGi message has no "anyway". No storage. Tests: each field path; the false-positive
   corpus from the existing secrets tests (ordinary sentences, addresses); the ZIGi transport is never called on a match.
   Help gains a line under the wallet answer.
2. **Retire "Leap" as a suggested wallet** — Leap ended 28 May 2026 [32]; Cosmostation ended 1 Sep [33].
   `components/earn/oroswap-section.tsx` step 1 should read "connect your wallet (Keplr, for example)". Add a unit test
   that scans `components/earn` and `lib/earn/academy.ts` for `Leap` or `Cosmostation` used as a recommendation (the
   names set in `components/earn/words.ts` stays). Effort: 30 min. Copy for Playwright: none.
3. **On this day (Journal)** — Daylio "On This Day" (Jul 2026) [24]; Stoic Journey [7]. Journal top: a collapsible
   card, "On this day · 1 year ago", with the past entry's first lines, its mood word and energy, and a link to open it.
   It covers 1, 2 or 3+ years ago, plus "a month ago" when no year matches. It is hidden when nothing matches. Some
   memories hurt, so it has a **Hide "On this day"** switch, stored as an optional field on a new display key
   `zigoals:journal-display:v1` `{version:1, onThisDay?: boolean}`. Pure function `lib/journal/on-this-day.ts`
   (same-date matching; 29 Feb matches 28 Feb in common years; the date helpers from `lib/local-date.ts`). Tests: leap
   year, none, several years, a hidden entry.
4. **Your numbers: blood pressure and lab values** — Oura Lab Uploads (Jun 30) [28]; WHOOP Advanced Labs uploads, free
   and worldwide [29]; Bevel Blood Pressure and Health Records (3.1.x) [1]; Welltory BP [6]. Health → a "Your numbers"
   fold. Key `zigoals:health-numbers:v1`:
   `{version:1, entries:[{id, date, kind:'bp'|'lab', systolic?, diastolic?, pulse?, name?, value?, unit?, refLow?, refHigh?, note?}] (max 3000)}`.
   Each marker gets a trend line. The only verdict is **"inside / outside the range you copied from your lab sheet"**:
   ZIGoals sets no ranges of its own, gives no interpretation and never says "normal". BP copy: "Your readings. Not a
   diagnosis." There is an optional **photo of the lab sheet → editable draft** through the person's own AI key (the label-scan
   pattern in `lib/label-scan`). The photo is not kept. Adds a "Your numbers" section to the clinician report
   (`lib/clinician-report/build.ts` REPORT_SECTIONS is a const: add the new section id). Tests: bounds, units kept as
   typed, unknown range = no verdict, the report section. Effort: 1 day. ZIGi read tool: F9.
5. **Your first week (optional)** — Duolingo (7-day milestone: +1.7% D7, 3.6× completion) [35]; Fabulous first
   journey (2×, 2°) [42]; Actual's new in-app tour (26.9) [15]. After onboarding, for 7 days only, Today shows one card
   with **one small step per day**, each a link: 1 tick a habit · 2 log water or a meal · 3 add a goal step or contribution ·
   4 try the check-in · 5 Test a backup · 6 open Compare · 7 open the weekly review. Steps can be done in any order.
   Skipping costs nothing. The card ends on day 7 or on **Hide**. On day 7 one calm line uses `lib/celebrations.ts` once:
   "A week of showing up." Key `zigoals:first-week:v1` `{version:1, startedOn, hidden?, done:{[step]: date}}`. Never in
   the Showcase. Not shown to a person who already has 7+ days of data. Tests: day boundaries in the journal zone,
   "already active" detection, hide, no guilt words.
6. **Recent categories first** — Lunch Money (Aug 31) [14]. In Wealth → Spending, the category chips start with the
   three most used in the last 30 days (computed from the log, no storage), followed by the fixed list in its usual order.
   Tests: ties, an empty log keeps the fixed order, income vs expense.
7. **Running total of selected entries** — Copilot 8.5 and 8.6 (Oct) [13]. In the money log list, a "Select" mode
   with checkboxes (44 px rows) shows a sticky line "3 selected · −€84.20 (2 expenses, 1 income)". It handles mixed
   currencies honestly ("2 currencies: €… and $…", never converted silently). Pure `lib/money-log/selection.ts`. Tests:
   decimals, mixed currencies, split entries (count the entry once).

### P2

8. **Experiments ("Try it for 14 days")** — Welltory Self-Discovery (May) [6]; WHOOP Behavior Insights (≥5 yes and ≥5
   no in 90 days, Mar) [29]; Athlytic exportable Journal analysis [5]. Insights → Compare → "Run an experiment". The person
   picks a change (an existing habit or tag, or a new habit made on the spot), one outcome (mood, energy, sleep minutes,
   steps, a scale from #12) and a length of 7, 14, 21 or 28 days. The baseline is the same number of days just before.
   At the end a result card reuses `lib/compare` (`confidenceOf`, the counts "12 days with, 9 without", "happened together",
   never "caused"). Key `zigoals:experiments:v1` `{version:1, items:[{id, title, factor, outcome, start, days, endedAt?, note?}] (max 20)}`.
   The Showcase has one finished example. Tests: too few days → "not enough to say", an ended early run, a timezone change.
   Effort: 1 day.
9. **Card mode for the review inbox** — YNAB Card Mode (iOS Sep 16, Android Oct 21) [18]. `review-inbox.tsx` gets a
   "One at a time" toggle: one large card with the payee, amount, date and a suggested category as big chips. Swipe right
   to accept, left to skip, or use real buttons ("Accept", "Skip", "Make a rule"); keyboard A, S and R. It reuses
   `components/swipe/use-swipe-actions`. Motion Off: no fling animation. No storage beyond an optional display field.
   Tests: the order, an Undo after accept, keyboard only.
10. **A photo on a money entry** — YNAB Photos on transactions (Apr 20) [18]; Monarch receipt scanning [19]. Opt-in:
    "Add a photo" on an entry stores a downscaled JPEG in IndexedDB `zigoals-money-photos-v1` (`{entryId, blob, takenAt}`,
    max 500, ~200 KB each). It is included in the ZIP export, never uploaded, and erased with Erase everything. An optional
    draft of amount, date and payee comes from the photo through the person's own AI key, as an editable draft (the
    label-scan pattern). Reuse the meal-photo store (`lib/meal-estimates/photos`). Tests: quota, an orphan photo after the
    entry is deleted, export manifest. Effort: 1 day.
11. **Cash forecast, next 60 days** — Actual Balance Forecast (26.6) [15]; Monarch Forecasting (Apr) and side-by-side
    forecasting (Jul) [19]. Wealth → Money → "Next 60 days". It starts from cash-like account balances, subtracts known
    bills (`lib/bills/store.ts` dates ahead) and contribution-rhythm amounts, and adds the 90-day average of other income
    and spending. The result is a line with the **lowest point marked** ("lowest around 14 Dec: about €420"). The copy
    "**A model from your own records, not a promise**" stays visible. Unknown balances stay unknown: no line, a teaching
    empty state. No storage. Pure `lib/cash-forecast/model.ts`. Tests: no accounts, only bills, mixed currencies (per
    currency or refused), month ends. Effort: 1 day.
12. **Your own scales** — Daylio Scales (Apr) [24]; WHOOP custom journal behaviours (announced Sep) [29](s). In the
    check-in, up to 5 personal 1–5 sliders (stress, pain, focus…, each with the person's own end words). They are optional
    and skippable. Each becomes a Compare factor and outcome. Key `zigoals:scales:v1`
    `{version:1, scales:[{id, name, low, high}] (max 5), days:{[date]:{[id]: 1..5}} (max 730 days)}`. Tests: removing a
    scale keeps its history readable, bounds.
13. **Start from a prompt (journal templates)** — Stoic templates [7]; Rosebud CBT and gratitude frameworks [9];
    Reflectly's paywalled prompts (complaint) [8]. Journal → "Start from a prompt": 8 authored EN/NL templates (Morning
    intention · Three good things · Worry, then one next step · Gratitude · Week look-back · Before a hard talk · Another
    way to see it (situation / first thought / another view; labelled "a reflection, not therapy") · A letter to future
    you). Each fills the entry with 2–4 short headings. The entry keeps an optional `template` id (the journal schema is
    loose: add optional fields only). The guilt-free word list applies. Tests: every template passes the visible-text and
    forbidden-word checks.
14. **Wrap-up: what's moving to tomorrow** — Sunsama Daily Shutdown [11]; Structured Replan [10]. The evening wrap-up
    card (`lib/wrap-up`) lists today's open **tasks** (`lib/tasks`) with **Move to tomorrow** or **Let it go** for each.
    It never says "missed" and never counts anything. The Checklist's protected look is not touched. Pure helper
    `moveTaskDue(tasks, id, tomorrow)`. Tests: due today vs overdue, a goal-linked task, the zone change at midnight.
15. **Focus intervals** — Structured Intervals (Jun) [10]; Rosebud mindful bell [9]. Focus Sessions gets an optional
    "Rounds" mode: work and break minutes (25/5 × 4 by default, editable). A soft bell (`lib/meditation/bells.ts`)
    sounds at each change, and the focus sound fades during breaks. Only focused minutes count toward the existing
    totals. Optional settings fields on a new key `zigoals:focus-rounds:v1` `{version:1, work, rest, rounds}`. Motion Off
    and reduced motion: no animated ring, just text. Tests: totals exclude breaks, ending early, a background tab.
16. **Cycle log (opt-in, hidden by default)** — Athlytic Women's Cycle Insights [5]; Gentler Streak cycle-phase
    suggestions [3]; MacroFactor period tracker [25]; Oura hormonal birth control and menopause insights (May) [28](s);
    WHOOP cycle-phase lab ranges [29](s). It appears only when turned on in Settings → Pages. It records period days, flow
    (light/medium/heavy), symptom chips and a note. The next-period line reads "an estimate from your past cycles",
    shown only after 3 cycles. Phase can be a Compare factor on the device. ZIGi sees it only behind the existing Health
    consent gate. Key `zigoals:cycle:v1` `{version:1, days:{[date]:{flow?, symptoms?[], note?}} (max 1500)}`. It is never
    synced unless the Health sync choice includes it (lead decides; TIER 3). Copy: "Information for you, not a
    contraceptive or a diagnosis." Tests: estimate with irregular cycles (a range, not a date), fewer than 3 cycles → no
    estimate, erase. Effort: 1–2 days.

### P3

17. **Share a net-worth moment, amounts hidden** — YNAB Net Worth sharing (4 formats, hidden amounts, Mar) [18]; Strides
    share images (Sep) [20]. A new share-card kind `net-worth` in `lib/share-cards/kinds.ts` that shows the % change and a
    milestone line. **Amounts are off by default**, as with Wrapped. Coordinate with F5's net-worth milestones (the same
    moment shares from the milestone celebration). Tests: hidden by default, unknown values not drawn.
18. **Spending map (treemap)** — Monarch treemap (Aug 28) [19]. Wealth → Spending → "Map": each rectangle is sized by
    category spend this month, from a squarified layout written by hand in `lib/spending-map/layout.ts` (pure, no
    dependency). Tap opens the filtered list. A screen-reader table fallback is always present. Labels hide below a
    minimum area and appear in the table. Tests: layout sums to the area, zero categories, one category.
19. **A calculator in the money amount field** — Actual 26.7 mobile calculator [15]. In money-log and budget amount
    fields **only** (not chain amounts, not `parseUnits` paths), "12,50+3,20" or "3*4.99" shows "= 15.70" and is used on
    save. A hand-written parser takes digits, a decimal comma or point, and + − × ÷. No `eval`. Tests: precision to 2
    decimals, division by zero refused, locale commas.
20. **A chat that isn't kept** — Bevel Ghost Mode chats (2026) [1]; Rosebud's AI providers [9](2°). The ZIGi chat gets a
    "Don't keep this chat" switch: no History entry and no memory write for that session. **Verify first**: History
    exists in `components/ai/history-view.tsx`, and no such switch was found by search. Tests: nothing written to the
    history or memory keys.
21. **"Was this useful?" on weekly insights** — How We Feel 1.17 [30]. One optional tap (useful / not for me) under
    ZIGi's weekly insight (8.3). It is stored locally (`zigoals:insight-feedback:v1`, max 200) and used only to show
    fewer insights of a kind the person marked "not for me". Tests: bounds, the ordering effect.

**Supports F5 (already planned, evidence only):** Wrapped and year recaps (Copilot Year in Review [13], Gentler Streak
recaps [3], Welltory year in review [6]); the supplements and medication log (Streaks medication tracking and
multi-medication [22], Oura GLP-1 [28](s)); .ics for training plans (Bevel calendar syncing [1]); savings challenges and
templates (Strides 150+ templates [20]); the FI model polish (Actual Monte Carlo and crossover [15], Wealthfolio Risk Lab
[16], Monarch early-retirement forecasting [19]).

## 4. Recorded, not built

| Feature | Who | Why not |
|---|---|---|
| Biological age, "Athlytic Age", fitness age | Bevel [1], Athlytic [5] | A model shown as a fact about the body; medical-sounding; it breaks "no projection as a guarantee" |
| Lab test booking, on-demand physicians | Oura [28], WHOOP [29] | Human clinical services and partners; not software on a device |
| Camera HRV or heart rate | Welltory [6] | Needs the torch and sensor timing that iOS Safari does not give; accuracy claims would not be honest |
| Widgets, Live Activities, Siri intents, watch apps | Lunch Money [14], Structured [10], Gentler Streak [3] | Native only (round 1 (d)) |
| App blocking during focus | Stoic Shield [7], Tiimo request [12] | Native Screen Time APIs |
| Two-way calendar sync | Bevel [1], Tiimo [12] | OAuth write scopes and a server; the .ics download is in F5 |
| Email forwarding of receipts | Monarch [19] | Needs a server mailbox that holds personal data |
| MCP connectors to outside AI tools | Monarch [19], Habitify [21], Ghostfolio [17] | Opens personal data to outside services through a server; ZIGi with the person's own key covers the need |
| Bank sync (Enable Banking, Akahu) | Actual [15], Copilot [13] | Aggregator and server tokens (round 1); bank files exist |
| Payee locations | Actual [15] | Location on every entry: a privacy cost for little gain |
| Contribution-limit room (IRA/TFSA/jaarruimte) | Wealthfolio [16] | Country tax rules; computing them shades into advice. Possible later as a person-typed "yearly limit" field |
| Static portfolio risk rules, "X-ray" | Ghostfolio [17] | Risk verdicts shade into advice; target mix and drift already show facts |
| Benchmarks vs an index | Wealthfolio [16] | Needs an index price host (a new egress) |
| Cancel unstaking | Keplr [31] | A new message type to sign; F4 allows only types the app already signs. Record for a future TIER 3 (wallet) session |
| Multisig, embedded social-login wallet (Oko) | Keplr [31] | Outside non-custodial scope / new signing |
| Social feeds, gym leaderboards, challenges with friends, follow friends | Hevy [26], Habitify [21], WHOOP [29](s) | Accounts and a shared server |
| Paid streak repair | Duolingo [35] | Paying to keep a streak goes against the calm rules; time-away days already protect streaks |
| HP loss, penalties | Habitica [37] | Guilt mechanics |
| Legacy app icon after a year | Copilot [13] | A PWA's icon is fixed in the manifest; an in-app "one year with ZIGoals" note could go into Wrapped |
| Photo → tasks | Tiimo [12] | Possible with the person's own AI key but off-pillar; Quick add covers text |
| Agent that plans the day | Sunsama [11], Structured [10], Tiimo [12] | ZIGi pre-fills with confirm cards; a full planner agent belongs to F9 or later |
| Sleep audio stories | Welltory Echo [6] | Content licensing (round 1) |
| Bodyweight counted in workout volume | Hevy review [26] | A small complaint; needs a per-exercise multiplier that would be a guess. Revisit with F5 measurements |
| "Usual range" alerts on resting HR or HRV | Athlytic [5], Welltory [6], Oura Health Radar [28](s) | Could be done as information, but alerts on vitals read as medical. Recorded until the owner decides on wording; imported summaries only |
| Gentle activity zone (Activity Path) | Gentler Streak [3] | Needs heart-rate-based load from a watch stream; ZIGoals has imported summaries only |

## Sources (all read 2026-10-31)

1. Bevel App Store <https://apps.apple.com/us/app/bevel-all-in-one-health-app/id6456176249>
2. Bevel Google Health (2°) <https://gadgetsandwearables.com/2026/07/13/bevel-google-health-fitbit-air-integration/>
3. Gentler Streak App Store <https://apps.apple.com/us/app/id1576857102?l=en-us>
4. Gentler Streak 5.5 (2°) <https://www.ithinkdiff.com/gentler-streak-5-5-daily-step-tracking-rpe/>
5. Athlytic App Store <https://apps.apple.com/nl/app/athlytic/id1543571755>
6. Welltory App Store <https://apps.apple.com/au/app/id1074367771>
7. Stoic App Store <https://apps.apple.com/us/app/stoic-journal-mental-health/id1312926037>
8. Reflectly complaint analyses (2°) <https://kimola.com/reports/reflectly-app-feedback-analysis-insights-recommendations-app-store-us-144965>, <https://unstar.app/blog/day-one-journey-reflectly-stoic-finch-journaling-apps-ranked-2026> (s)
9. Rosebud App Store <https://apps.apple.com/us/app/rosebud-ai-journal-diary/id6451135127>; review (2°, s) <https://blog.mylifenote.ai/rosebud-review/>
10. Structured App Store <https://apps.apple.com/US/app/id1499198946>
11. Sunsama help <https://help.sunsama.com/docs/daily-planning>, <https://help.sunsama.com/docs/daily-shutdown>; changelog (s) <https://sunsama.canny.io/changelog/weekly-product-changelog-may-15-2026>; celebrations (s) <https://roadmap.sunsama.com/improvements/p/completing-a-task-should-feel-more-satisfying>
12. Tiimo App Store <https://apps.apple.com/us/app/tiimo-visual-planner-adhd/id1480220328>
13. Copilot Money App Store <https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651>; Month and Year in Review <https://help.copilot.money/en/articles/10310024-month-and-year-in-review>
14. Lunch Money newsletter 31 Aug 2026 <https://lunchmoney.app/blog/2026-08-31-product-newsletter> (features page returned 403)
15. Actual Budget blog <https://actualbudget.org/blog/>
16. Wealthfolio <https://wealthfolio.app/>
17. Ghostfolio <https://github.com/ghostfolio/ghostfolio>, <https://github.com/ghostfolio/ghostfolio/releases>
18. YNAB updates <https://support.ynab.com/en_us/updates-to-ynab-S1f4aRLeC.md>
19. Monarch What's New <https://www.monarch.com/whats-new>
20. Strides App Store <https://apps.apple.com/us/app/strides-habit-tracker/id672401817>
21. Habitify App Store <https://apps.apple.com/us/app/habitify-habit-tracker/id1111447047>
22. Streaks App Store <https://apps.apple.com/us/app/-/id963034692>
23. Finch App Store <https://apps.apple.com/us/app/finch-self-care-pet/id1528595748>
24. Daylio App Store <https://apps.apple.com/us/app/daylio-journal-daily-diary/id1194023242>
25. MacroFactor App Store <https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471>
26. Hevy App Store <https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350>
27. Cronometer updates (s) <https://cronometer.com/blog/cronometer-updates-whats-new-improved>; APKMirror release notes (2°, s) <https://www.apkmirror.com/apk/cronometer-software-inc/calorie-counter-by-cronometer/cronometer-4-53-1-release/>
28. Oura Health Panels and Lab Uploads (s) <https://ouraring.com/blog/health-panels/>; 2026 updates (2°, s) <https://www.tomsguide.com/wellness/smart-rings/your-oura-ring-just-got-new-features-heres-what-launched-today-and-whats-coming-next-week>
29. WHOOP Advanced Labs uploads (s) <https://www.whoop.com/us/en/press-center/whoop-launches-advanced-labs-uploads-us/>; WHOOP 2026 what's new (403 when opened; s) <https://www.whoop.com/us/en/thelocker/2026-whats-new/>; journal preview (2°, s) <https://gadgetsandwearables.com/2026/09/05/whoop-custom-journal-workout-tracking-update/>
30. How We Feel listing (2°, s) <https://apps.appfollow.io/ios/how-we-feel/1562706384?country=us>; blog (s) <https://howwefeel.substack.com/p/finding-the-patterns>
31. Keplr App Store <https://apps.apple.com/us/app/keplr-wallet/id1567851089>; <https://www.keplr.app/>
32. Leap Wallet shutdown, The Block <https://www.theblock.co/post/396325/cosmos-ecosystems-leap-wallet-is-shutting-down>
33. Cosmostation shutdown, Crypto Briefing <https://cryptobriefing.com/cosmostation-wallet-shutdown-september/>
34. ZIGChain ecosystem (2°, s) <https://cointelegraph.com/press-releases/zigchain-launches-mainnet-beta-for-first-layer-1-designed-for-decentralized-wealth-generation-infrastructure>; <https://zigchain.com/ecosystem> returned 404
35. Duolingo streak research (13 May 2024) <https://blog.duolingo.com/duolingo-streak-research/>
36. Apple pause rings (2°, s) <https://9to5mac.com/2024/07/16/close-your-ringsbut-in-watchos-11-its-okay-if-you-dont/>
37. Habit-tracker complaints (2°, a vendor's analysis, 5 May 2026) <https://unstar.app/blog/streaks-habitica-way-of-life-strides-habit-tracking-apps-ranked-2026>
38. Calorie-app complaints (2°, a vendor's analysis, 23 Apr 2026) <https://unstar.app/blog/calorie-tracking-apps-ranked-1-star-reviews-2026>
39. Budgeting-app complaints (2°, s) <https://unstar.app/blog/tag/copilot>
40. Habitify weekly-streak New-Year reset (s) <https://feedback.habitify.me/p/weekly-habit-streak-reset-during-year-transition>
41. Mozilla *Privacy Not Included, mental-health apps (2023, the latest edition found; s) <https://www.mozillafoundation.org/en/blog/shady-mental-health-apps-inch-toward-privacy-and-security-improvements-but-many-still-siphon-personal-data/>
42. Fabulous onboarding (2°, s) <https://www.casestudies.com/company/firebase/case-study/fabulous-app-improved-user-retention-2x-by-customizing-its-onboarding-process-via-firebase>, <https://www.thebehavioralscientist.com/articles/fabulous-app-product-critique-onboarding>
43. MyFitnessPal paywall complaints (2°, s) <https://unstar.app/blog/is-myfitnesspal-premium-worth-it-paywall-app-reviews-2026>

Web page text was treated as data. No page contained instructions that were followed.
