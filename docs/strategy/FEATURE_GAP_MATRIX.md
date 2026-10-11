# Feature gap matrix: ZIGoals today against the category leaders (research, 2026-10-03)

> **Research only. It decides nothing.**
> - **Pricing is NOT decided.** COST_MODEL.md once noted 4.99 as an early idea, not a working or chosen price.
> - "ZIGoals today" comes from `main` at `57275a6` and the product docs. It does not include Session M's or N's branches in flight.
> - Competitor facts come from [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md), read on 2026-10-03, where each one is linked to its source.

**Part of the [strategy pack](README.md).**

**Legend:**
- ✓ in the app today;
- ◐ built but limited, or waiting for activation;
- ✗ not in the app;
- — not applicable.

## In one minute
- **Already unique:**
  - all four pillars with one Today;
  - links between the pillars (habits ↔ goals ↔ money);
  - a privacy architecture that is local by default, with end-to-end encrypted sync (once activated);
  - honest numbers;
  - ZIGChain-native, non-custodial wealth.
- **Behind:**
  - the platform: native apps, notifications, widgets, Apple Health and Health Connect;
  - food capture speed;
  - reach: stores, languages, importing from rival apps;
  - planning depth;
  - AI;
  - social.
- **What paying users pay for elsewhere, in evidence order:**
  1. fast food capture;
  2. reminders that arrive when the app is closed;
  3. data flowing in from phones and wearables;
  4. native apps with widgets;
  5. sync that just works;
  6. switching tools.

  Details are in the last section.

## 1. Health and nutrition
Compared with MyFitnessPal, Lose It!, Cronometer, Yazio, Lifesum, MacroFactor, FatSecret, Noom and Cal AI ([MARKET_LANDSCAPE §1](MARKET_LANDSCAPE.md#1-nutrition-and-calorie-tracking), [§6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)).

| Capability | ZIGoals today | Leaders: who has it, and who charges for it |
|---|---|---|
| Food diary by meal; own foods and recipes; saved meals; copy a meal or day | ✓ | Everyone has a diary. Saved meals and copying are common |
| A large shared food database | ◐ own foods, plus an Open Food Facts lookup once activated | <ul><li>Company claims: MyFitnessPal 20.5M+, Lose It! 56M+, Yazio 4M+, MacroFactor 1.36M+ verified (plus Open Food Facts), Cronometer 1.1M+ verified.</li><li>**This is the biggest single gap in Health**</li></ul> |
| Barcode scanning | ◐ the decoder runs on the device; the lookup provider is not active yet | <ul><li>**Free** at Cronometer, FatSecret and Lifesum.</li><li>**Paid** at MyFitnessPal and Lose It!.</li><li>Inside the subscription at MacroFactor</li></ul> |
| Photo (AI) meal logging | ✗ (shown as "Coming soon") | <ul><li>Paid at MyFitnessPal, Lose It!, Cronometer Gold, Lifesum and Cal AI.</li><li>Inside MacroFactor's subscription.</li><li>FatSecret lists photo recognition in its free store text.</li><li>**Accuracy is the top complaint** (Cal AI, Lifesum)</li></ul> |
| Voice or text logging | ✗ | Paid at MyFitnessPal, Lose It!, Cronometer Gold and Lifesum; part of MacroFactor and Cal AI |
| Micronutrients | ◐ 7 optional label nutrients (fiber, sugars, saturated fat, sodium, potassium, calcium, iron); unknown ≠ zero | Cronometer: 95 nutrients, **free**. MacroFactor tracks micronutrients |
| Macro targets | ✓ set by the person, free | MyFitnessPal charges for custom macro goals |
| Meal plans and grocery list | ✓ free | Paid at MyFitnessPal Premium+, Lose It!, Yazio PRO and FatSecret Premium |
| Recipe import from a URL | ✗ | Cronometer Gold; MacroFactor |
| Fasting timer | ✗ | Paid at MyFitnessPal, Lose It! and Cronometer Gold; part of Yazio |
| Water, weight, body measurements | ✓ free | FatSecret puts water tracking behind Premium |
| Adaptive targets ("coach" that sets calories) | ✗ by design: no recommendations | MacroFactor's core; Noom's program. Health-claim flag LC§4 |
| AI coach | ✗ | MyFitnessPal Coach; Cronometer's Crono Coach (Gold); Noom |
| Wearables and health platforms | ✗ ("Planned · Not connected") | <ul><li>Nearly all leaders: MyFitnessPal (35+ claimed), Cronometer (the widest list), Lose It!, Yazio PRO, Lifesum, MacroFactor and others.</li><li>Needs native apps or cloud APIs ([§9](MARKET_LANDSCAPE.md#9-health-platforms-and-wearables-integration-facts))</li></ul> |
| GLP-1 medication companion | ✗ | MyFitnessPal, Lose It!, Noom (Noom Med). A medical flag (LC§4) |
| Export | ✓ CSV of selected Health records; an encrypted backup | <ul><li>Cronometer says everything is exportable.</li><li>MacroFactor exports spreadsheets.</li><li>Lifesum exports only 7 days self-serve.</li><li>MyFitnessPal's export is reportedly Premium-only (**UNVERIFIED**)</li></ul> |
| No ads; no tracking | ✓ by design, with no trackers ([PRIVACY.md](../PRIVACY.md)) | Free tiers show ads at MyFitnessPal, Lose It!, Cronometer and Yazio. 7 of the 9 nutrition apps declare "data used to track you"; MacroFactor and FatSecret do not |
| Watch and native apps | ✗ (web app; installable) | All leaders have iOS and Android apps, most have a watch app, and some have a web app |
| Community or friends | ✗ | MyFitnessPal, Lose It!, Yazio "Buddies", FatSecret, Noom "Circles" |

## 2. Habits
Compared with Streaks, Habitica, Fabulous, Habitify, Loop, Finch, Way of Life and Productive ([MARKET_LANDSCAPE §2](MARKET_LANDSCAPE.md#2-habit-trackers)).

| Capability | ZIGoals today | Leaders |
|---|---|---|
| Build and quit habits; flexible schedules (weekdays, N per week or month) | ✓ | Standard (Streaks, Habitify, Loop, Way of Life) |
| Measurable habits (count, quantity, duration) and a timer | ✓ | Loop (numeric), Habitify (timer), Streaks (timed tasks) |
| Streaks, best streak, weekly consistency, 30-day and monthly history, corrections, notes | ✓ | <ul><li>Standard.</li><li>Loop's forgiving "score".</li><li>Way of Life's skip days.</li><li>Habitify's "off mode"</li></ul> |
| **No cap on the number of habits** | ✓ (up to 200) | <ul><li>Habitify: 3 free.</li><li>Way of Life and Productive cap their free tiers.</li><li>The cap is a top complaint</li></ul> |
| Reminders that work while the app is closed | ◐ in-app cards on Today only | <ul><li>Everyone has push reminders.</li><li>Location-based reminders are paid (Habitify Plus, Productive Premium)</li></ul> |
| Home-screen widgets, watch complications | ✗ | Streaks (all complications), Habitify, Loop, Way of Life, Productive (Watch) |
| Auto-completion from health data | ✗. Health and Habits sit in one app, but don't feed each other yet | Streaks (Apple Health, on the device); Habitify Pro (Apple Health, Google Fit, Fitbit, Strava) |
| Social: parties, challenges, shared tasks, friends | ✗ | Habitica, Productive, Habitify, Finch, Streaks (iCloud shared tasks) |
| Game layer (pets, RPG) | ✗ (streaks only) | Habitica (RPG); Finch (a pet, rated 4.9 from 758K ratings) |
| Guided programs or coaching | ✗ | Fabulous (journeys; AI-generated coaching content), Productive (programs) |
| Mood and journaling | ✗ (habit notes only) | Finch, Habitify (mood), Fabulous (journal) |
| **A habit linked to a goal** | ✓ habits supporting a Goal, including money goals | Fabulous and Habitify have goals or areas, but none links a habit to a money or health goal |
| Export | ✓ JSON (Habits backup) | Habitica (CSV, XML, JSON), Loop (CSV, SQLite), Habitify (CSV, SQLite), Way of Life (CSV, Excel, JSON) |
| Import from other habit apps | ✗ | None of the leaders documents one (**UNVERIFIED**), so it is open ground |
| Private by default | ✓ local by default; encrypted sync optional (not activated) | Loop (nothing collected, no account) and Streaks (no servers, iCloud only) set the bar |

## 3. Goals and planning
Compared with Todoist, TickTick, Things 3, Notion, Strides, Any.do, Structured and Microsoft To Do ([MARKET_LANDSCAPE §3](MARKET_LANDSCAPE.md#3-goals-and-planning)).

| Capability | ZIGoals today | Leaders |
|---|---|---|
| A goal with a target value and date, progress and pace | ✓ Value and Quantity goals, a contribution plan, and a funding scenario with a projected date (a scenario, not a promise) | Strides ("Target" with a pace line). Todoist counts tasks, not life goals |
| Projects with milestones | ✓ Project goals | Strides (Project), Things (projects with deadlines) |
| **Money-funded goals** (contributions, allocations from holdings) | ✓ | <ul><li>Budgeting apps have targets or savings goals (YNAB, Monarch, Copilot).</li><li>No planner has them</li></ul> |
| **Goals linked to habits** | ✓ | <ul><li>Strides keeps goals and habits in one app, but without money or health.</li><li>TickTick's habits sit apart from tasks</li></ul> |
| Next steps or sub-tasks inside a goal | ✗ (milestones only) | Todoist, TickTick, Things, Notion, Any.do, Structured |
| Calendar view, time blocking | ✗ | TickTick, Structured, Any.do, Todoist |
| Templates | ◐ (a few goal templates, such as Emergency Fund, First Home, Travel) | Strides (150+), Notion (marketplace) |
| Reflection or review | ✗ | TickTick's daily review prompts; Todoist's productivity view; Exist's weekly email |
| Reminders | ◐ in-app only | Everyone (push) |
| Sharing and collaboration | ✗ | Todoist, TickTick, Notion, Any.do (Family), Strides (iCloud partners) |
| Import from other planners | ✗ | TickTick (Todoist, To Do, Any.do, OmniFocus and more), Things (Reminders, Todoist) |
| AI assist | ✗ | Todoist Assist, Notion AI, Structured AI, TickTick |

## 4. Wealth
Compared with YNAB, Monarch, Copilot, Empower, Kubera, Rocket Money, Emma and Finary, and the crypto apps CoinStats, Delta, CoinTracker, Zerion and getquin ([MARKET_LANDSCAPE §4](MARKET_LANDSCAPE.md#4-personal-wealth-net-worth-budgets-and-crypto-portfolios)).

| Capability | ZIGoals today | Leaders |
|---|---|---|
| Net worth across asset classes, including manual values | ✓ crypto, stocks, metals, cash, property and custom assets; manual values are labelled; currencies are never mixed | Kubera (the widest), Finary, getquin, Empower, Monarch |
| Bank and broker aggregation | ✗ **excluded by principle** (no third party sees bank data) | <ul><li>The norm: YNAB, Monarch, Copilot, Empower, Kubera, Rocket Money, Emma, Finary, getquin.</li><li>**Its sync failures are the top complaint**</li></ul> |
| Budgeting and spending | ✗ | YNAB, Monarch, Copilot, Rocket Money, Emma; Finary's cash flow |
| Crypto portfolio with cost basis | ✓ average cost, real or hypothetical portfolios, USD or EUR | CoinStats, Delta, CoinTracker, Kubera |
| Read-only tracking by public address | ◐ ZIGChain only, through a read-only Keplr connection | Zerion (watch-only, 50+ networks), Kubera, CoinStats, CoinTracker |
| Exchange API keys | ✗ **excluded by the repo's rules:** "No exchange trading keys" ([PRODUCT_PLATFORM_BETA_MASTER_PLAN.md](../roadmap/PRODUCT_PLATFORM_BETA_MASTER_PLAN.md)); no external financial integrations ([CONTRIBUTING](../../CONTRIBUTING.md)) | CoinStats, Delta, CoinTracker, Kubera (read-only keys) |
| Live prices and markets | ◐ CoinGecko through the shared market coordinator; on the Alpha since deploy #28, verified after Session U's coordinator fix is deployed | Everyone |
| Staking view | ◐ read-only native ZIGChain staking | Wallets and DeFi trackers (Zerion, CoinStats) |
| Let it work (staking, earn), user-signed | ✗ design only, in Session N's lane (testnet first) | <ul><li>Finary Invest (MiCA-licensed, with custody through a partner).</li><li>Zerion swaps for a fee.</li><li>Different custody models</li></ul> |
| Price alerts | ✗ | CoinStats, Delta |
| Tax reports | ✗ | CoinTracker (by transaction count), CoinStats |
| Currencies | ◐ USD and EUR | Kubera and Finary (multi-currency); YNAB uses one currency per plan |
| **Goals funded by holdings** (allocations) | ✓ | <ul><li>Monarch goals, Copilot savings goals, YNAB targets.</li><li>None allocates holdings to life goals with habits</li></ul> |
| Household sharing | ✗ | YNAB (6 people), Monarch, Rocket Money, Finary (family mode), Kubera; Copilot only by a shared sign-in |
| AI | ✗ | Monarch, Copilot (a model per person), Rocket Money, Delta (metered), CoinStats, getquin; Kubera and Finary connect to AI assistants (MCP) |
| Export | ✓ private backups, including the Portfolio "Keep a copy" | CSV at YNAB, Copilot, Rocket Money, CoinStats. Paid at Zerion (CSV history), CoinStats (portfolio export) and Emma (live Sheets) |
| End-to-end encryption | ◐ built for sync (not activated) | No budgeting leader claims it on its own pages. Kubera says it is not end-to-end encrypted; CoinTracker's listing claims it (company claim) |

## 5. Platform and cross-cutting
| Capability | ZIGoals today | Leaders |
|---|---|---|
| Native iOS and Android apps | ✗ | Every leader in the research except Kubera (web plus PWA only) |
| Web app | ✓ | Many: MyFitnessPal, Cronometer, Todoist, TickTick, Notion, YNAB, Monarch, Copilot, Kubera, Finary, getquin, Habitica, Habitify, Structured |
| Installable web app (PWA) | ✓ manifest only (no service worker) | Kubera |
| Offline | ◐ the data is local, but the app shell needs the network | Loop and Streaks (fully on the device) |
| Notifications when the app is closed | ✗ | Everyone |
| Home-screen widgets, watch | ✗ | Most leaders |
| Health platforms and wearables | ✗ | Most nutrition and habit leaders |
| Sync across devices | ◐ end-to-end encrypted sync built; hosted services not activated (Stage 7/8) | Cloud apps sync. Daylio doesn't, which is its top complaint; Strides loses history on a new phone |
| No ads, no trackers | ✓ | Most free tiers carry ads or tracking |
| Languages | ✗ English UI (locale-aware numbers) | MyFitnessPal 20, Yazio 20, Streaks 28, Habitify 40, TickTick 41, Microsoft To Do 34 |
| Import from rival apps | ✗ (own backups only; one JSON observation import for measurements) | TickTick, Things, YNAB (a Mint migration); none in nutrition |
| Export | ✓ per-module JSON, Health CSV, an encrypted backup | Varies; some paywall it (Strides, Zerion; MyFitnessPal **UNVERIFIED**) |
| AI | ✗ | Widespread (§7 of MARKET_LANDSCAPE) |
| Social | ✗ | Widespread in habits and fitness (§8) |
| Accessibility | ◐ keyboard focus, text states, reduced motion; accessibility tests exist | Not compared: no official, comparable data |

## Where ZIGoals is already unique
1. **All four pillars in one app, with one Today.**
   - No established, well-rated competitor covers Goals, Habits, Health and Wealth natively ([MARKET_LANDSCAPE §5](MARKET_LANDSCAPE.md#5-all-in-one-and-life-os-apps)).
   - Today has 17 in-app widget kinds across the pillars (`apps/web/lib/dashboard-widget-registry.ts`).
2. **Links between the pillars:**
   - habits that support goals, money goals included;
   - contribution habits ("Add to savings", "No-spend day");
   - staking that supports a goal;
   - allocations from holdings to goals.
   - No wealth app links money to habits or health, and no habit or health app links to money.
3. **A privacy architecture, once sync is activated:**
   - local by default;
   - end-to-end encrypted sync with a recovery secret only the person holds, and a separate consent for Health;
   - no ads or trackers.
   - **The comparison:**
     - in nutrition, 7 of 9 leaders track;
     - no budgeting leader claims end-to-end encryption;
     - the privacy-loved apps (Streaks, Loop, Daylio, Strides) each cover one pillar and rely on the platform's cloud or on no sync.
   - Until Stage 7/8 activation, this is **◐ built, not live**.
4. **Honest numbers as a product trait:**
   - unknown is kept separate from zero (nutrients, prices);
   - manual values and quotes are labelled;
   - no recommended targets;
   - projections are labelled as scenarios.
   - The leaders' complaints include inaccurate AI estimates (Cal AI, Lifesum) and adaptive targets people don't understand.
5. **ZIGChain-native wealth, chain kept in the background:**
   - read-only Keplr;
   - the native staking view;
   - a sourced ecosystem directory;
   - a non-custodial, testnet-first earn design in progress (Session N).
   - No leader offers this.
6. **Free features that leaders charge for** (today; pricing undecided):
   - meal plans and a grocery list;
   - water;
   - custom macro targets;
   - unlimited habits;
   - export.
   - Whether they stay free is a pricing-brainstorm question.
7. **Start without an account:** Local works without sign-in. Forced account creation is a complaint at Any.do.

## Where ZIGoals is behind (in short)
- **Platform:**
  - native apps;
  - notifications when closed;
  - widgets and watch;
  - Apple Health and Health Connect.
- **Health capture:**
  - a food database;
  - activated barcode lookup;
  - photo and voice logging;
  - fasting;
  - micronutrient depth.
- **Planning depth:** next steps, a calendar, reviews.
- **Wealth breadth** (by principle in part):
  - no aggregation or exchange keys;
  - no budgeting;
  - one chain for address tracking;
  - two currencies;
  - no alerts or tax exports.
- **Reach:** one language, no stores, no import from rivals.
- **Social and AI:** none yet.

## The gaps that matter most for paying users
The ranking uses evidence: what leaders charge for ([MARKET_LANDSCAPE §6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)) and repeated complaint themes. **It is not a roadmap.** The [backlog](BETA_IDEAS_BACKLOG.md) turns gaps into ideas, and the brainstorm chooses.

| # | Gap | Evidence | Principle note |
|---|---|---|---|
| 1 | **Fast food capture:** barcode, a database, later voice or photo | <ul><li>Paid at MyFitnessPal and Lose It! (barcode), and across the leaders (AI capture); free at Cronometer.</li><li>"Paywall creep" on barcode is a top complaint</li></ul> | <ul><li>✓ for barcode (only the code leaves the device).</li><li>⚠ **private** if photos go to a cloud model</li></ul> |
| 2 | **Reminders that arrive when the app is closed** | <ul><li>Every habit and planning leader has them.</li><li>Missed reminders are a complaint at Todoist, Productive and Habitica.</li><li>Smart reminders are paid at Habitify and Productive</li></ul> | ⚠ **private:** Web Push needs a server that knows when to send; native apps can schedule on the device |
| 3 | **Data flowing in from the phone and wearables** | <ul><li>Paid syncs at Lose It!, Habitify Pro and Yazio PRO.</li><li>Streaks' Apple Health auto-completion</li></ul> | <ul><li>✓ on the device (HealthKit, Health Connect).</li><li>⚠ **private** with cloud APIs</li></ul> |
| 4 | **Native apps with widgets and a watch** | Standard among the leaders; widget bugs are a complaint when they fail | ✓ |
| 5 | **Sync that just works across devices** | <ul><li>Daylio's top complaint is no sync.</li><li>Strides loses history on a new phone.</li><li>Sync failures dominate the wealth complaints</li></ul> | ✓ the activation of the existing encrypted sync |
| 6 | **Switching from the four apps** | <ul><li>Planners and money apps invest in migration (TickTick, YNAB).</li><li>No nutrition import exists, and MyFitnessPal's export may be Premium-only (**UNVERIFIED**)</li></ul> | ✓ files parsed on the device |
| 7 | **The person's own language** | <ul><li>The leaders ship 20–41 languages.</li><li>Belgium uses Dutch, French and German ([GLOBAL_READINESS](GLOBAL_READINESS.md))</li></ul> | ✓ |
| 8 | **Household sharing** | <ul><li>YNAB includes 6 people.</li><li>Monarch: partners.</li><li>Family plans at Any.do and Habitify</li></ul> | ⚠ **private** (new sharing keys); LC-new (children) |
| 9 | **An AI assist that respects privacy** | <ul><li>Paid tiers everywhere.</li><li>But accuracy and forced-AI backlash</li></ul> | <ul><li>✓ on the device.</li><li>⚠ **private** in the cloud; LC§4</li></ul> |
| 10 | **Planning depth:** next steps and a review ritual | Standard in planners; Strides shows that goal users want pace and milestones | ✓ |

**Gaps not to close, by principle** (listed so the brainstorm can confirm):
- **Bank aggregation:** ✗ **private**.
- **Exchange API keys:** excluded by the repo's rules (master plan, CONTRIBUTING).
- **Money stakes as in Beeminder or stickK:** ✗ **non-custodial**.
- **An ad-funded free tier:** ✗ **private**.
- **Custodial earn products:** ✗ **non-custodial**.
- **Adaptive calorie targets presented as advice:** ⚠ **honest**, LC§4.

## Sources
- **This document links no external page directly.** Every competitor fact here is sourced, with its URL and access date (2026-10-03), in [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md).
- **"ZIGoals today"** comes from this repository at `main` `57275a6`: the files named in the tables, [STATUS.md](../STATUS.md), and the product docs in `docs/product/`.
