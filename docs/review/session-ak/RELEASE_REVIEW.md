# Release-readiness review "as if 1.0" (Session AK, F1)

Reviewer: a fresh read-only agent that built none of Session AK. Date: 31 Oct 2026.
Build reviewed: the production server on 127.0.0.1:3101, builds of `388603b9` and `e9b3a8d6` (branch `feature/session-ak-number-one`), plus the source at `6e049943`.
Method: I read the code under `apps/web/app/app/**` and the components it mounts. I ran Playwright scripts against the production build through the browser lock (scripts and screenshots are in the F1 scratch folder). Coverage: all 40 static `/app` routes plus the dynamic goal and asset pages. The Showcase and a fresh empty start (with and without the first-run welcome), at 390×844 (touch) and 1440×900, in Nebula, Light and Dark. Each page was checked for horizontal overflow, text under 12 px, contrast, targets under 44 px, unnamed controls, crypto and jargon words, console and page errors, LCP, CLS and long tasks. I also ran keyboard-only Tab order, `prefers-reduced-motion` and Motion Off, the Quick add sheet with a simulated keyboard, offline with the service worker, manifest shortcuts offline, and Event Timing (an INP proxy) with 4× CPU throttling.
Out of scope as findings: `/api/market-*`, `/api/push` and `/api/private-account` return 503 in this sandbox (no secrets), so live prices show "Unavailable". The PROTECTED list (Today hero and slogan, Checklist and its celebrations, footer finale, swan intro, nav bars, Governance hidden, "Premium · free during the Alpha", the ZIGi look) is not up for redesign. Where a finding touches it, it is marked "owner decision" or "bug only".

## Summary

| Severity | Count |
|---|---|
| Blocker | 1 |
| Major | 12 |
| Minor | 11 |
| Polish | 7 |

What matters most:
- One crash: the Showcase's own "Create 2 hours a day" goal page shows "This page could not be shown." (R1).
- A brand-new person who never chose crypto meets it everywhere before they have done anything: a "1,000 ZIG · Simulated balance" wallet card, "Demo records" and "Connect Keplr" in the header, Staking, Earn and Markets in the nav, a ZIG goal as the default in Create a goal, and Testnet and Contract rows in Settings (R2–R5).
- The app still names itself an Alpha in every tab title, in the install and search description ("Independent, unaudited alpha") and in a banner on every page (R8).
- The heaviest pages block the main thread for 3 s or more on a mid-range phone (R9–R11).
- The installed app's own shortcuts open "You are offline" (R12).

Beyond that, the app is in good shape:
- No horizontal overflow on any route, width or theme.
- No running animation under reduced motion or Motion Off.
- A visible focus ring on every control in the first 40 Tab stops.
- Calm 404, error and missing-record pages.
- Honest calculator and offline copy.

---

## Today (`/app`, `/app/today`)

**R2 · Major · Today, header, every page · 1440 (header also on tablet) · all themes · fresh start**
- **Problem:** A device that never opened the Showcase and never chose crypto sees all of this on its first screen:
  - Header buttons "Demo records" (pressed) and "Connect Keplr" (`components/shell.tsx:131–160`).
  - A right-rail card "Your wallet · Demo records · **1,000 ZIG** · Simulated balance · this browser · Practice money has no market value…" (`components/wallet/wallet-card.tsx:21–25`; the 1,000 comes from `lib/local-ledger.ts:28`).
  - A card "Staked ZIG · Read-only · Net APR assumption · Not set · View staking".
- Meanwhile the welcome card underneath says "No wallet or account needed." A made-up balance on a real person's Today, labelled "Demo records" although no demo was opened, breaks "no fake data", "honest labels" and "crypto only in modules people chose".
- **Fix:**
  - Until a wallet is linked or the person picks Wealth or crypto in the welcome or in Settings → Pages, hide the wallet card, the Staked ZIG card and the header wallet buttons. Use the existing page/widget visibility settings; this is not a nav redesign.
  - Drop the "1,000 ZIG" figure from any surface outside the Showcase.
  - Rename the default mode from "Demo records" or "Local demo" to "On this device" (or no label at all).

**R14 · Major · Today · 390 and 1440 · all themes · fresh start**
- **Problem:** The empty Today repeats itself. In one scroll:
  - "No active goal yet" (Today's focus), then "No active Goal yet / No active Goal yet / 0 %" (Life overview › Goals), then "A plan with your name on it… Create your first goal", then "Your destinations · 0 active Goals".
  - "Your first asset starts here" twice.
  - "Daily Habits" twice.
  - "Local demo · simulated ZIG, never wallet funds" under the Goals card.
  - "Your funding agenda… Only contributions explicitly linked to a scheduled date satisfy that installment."
  - Fold rows "Your wallet · Show" and "Staking · Show" on phone.
- A first-time person sees about ten empty widgets before the "Make Today yours" picker matters. On a phone the welcome card starts at y = 690 of 844, below the fold.
- **Fix:**
  - On a brand-new device (the same `brandNew` test as `today-dashboard.tsx:128`), show the welcome card plus one empty card per pillar, and hold the widget grid, funding agenda and Life overview back until there is a first record.
  - Remove the "simulated ZIG" line outside the Showcase.
  - Pull the welcome card directly under the (protected) hero.

**R11 · Major (performance) · Today, Settings · 390 · Nebula · fresh start and Showcase**
- **Problem:** With 4× CPU throttling (a mid-range phone):

  | Route | Data | LCP | Total blocking time | Longest task |
  |---|---|---|---|---|
  | Today | Fresh | 3.4 s | 1.85 s | 538 ms |
  | Today | Showcase | 4.8 s | 5.7 s | 771 ms |
  | Settings | Fresh | 2.6 s | 1.6 s | — |
  | Settings | Showcase | 3.8 s | 2.9 s | 897 ms |

- JS fetched for these routes: Today about 2.1 MB and Settings about 2.5 MB (encoded, including prefetch). Unthrottled, the Showcase Today already has 15 long tasks.
- **Fix:**
  - Profile Today's mount: the widgets, Life overview and the market and insight hooks all run on first paint. Defer every below-the-fold card behind an IntersectionObserver.
  - Stop prefetching every nav route on idle on phones.
  - Split Settings' sections so each card's body loads when it opens.
  - Add a budget test for TBT at 4×.

**R20 · Minor · Today (and all pages with launchers) · 1440 · Light, Nebula · Showcase**
- **Problem:** The right-edge launcher stack (music, Checklist, ZIGi) sits on top of the right-rail cards. On "ZIG reward reserve" it covers the end of "Fictional reward…" and crowds "Not set". On phone, the ZIGi launcher covers the end of text lines, for example Goals' empty card "your next chapter." and the welcome card's corner.
- **Fix:** Reserve a right gutter for the launcher column at ≥1280 px (padding on the main column), and on phone add bottom and right scroll padding equal to the launcher size. The launcher's look stays as it is (bug only).

**R27 · Polish · Today · all · all · Showcase**
- **Problem:** The coach card ends "…has two weeks of logs. an estimate, not medical advice". The fragment starts lowercase.
- **Fix:** Use "An estimate, not medical advice." as its own sentence.

**R28 · Polish · Today hero · all · all (owner decision; PROTECTED)**
- **Problem:** The third hero pillar row reads "Onchain · ZIGChain vision · Alpha simulation." It is the first crypto word a non-crypto person reads, and it says "Alpha".
- **Fix:** None proposed without the owner. Note it for the owner's 1.0 wording decision.

**R29 · Polish · Today · 390 · all · Showcase**
- **Problem:** The demo's "What matters today" leads with the ZIG "Reward income reserve · NEEDS REVIEW · 10,000 ZIG of 20,000 ZIG", so the first goal a demo visitor sees is a crypto goal that needs attention.
- **Fix:** Lead the Showcase with "Emergency fund" (currency, "AHEAD") and keep the ZIG goal further down.

## Welcome and onboarding (`/app/welcome`, Today's welcome card)

**R7 · Major · /app/welcome step 4 "A few things to start with" · 390 · Nebula · fresh start**
- **Problem:** Choosing the focus "Save for something" pre-fills a first goal (the category is selected and the fields are enabled) under the heading "A first goal (optional)". Continue then fails with **"Enter a non-negative decimal amount."**
  - That message is the raw parser message from `lib/amount-input.ts:51`, passed through `checkGoal()` at `components/onboarding/onboarding-flow.tsx:157–171`.
  - It shows in a `role="alert"` paragraph at the bottom of the step, far from the empty "Target amount" field, with no `aria-invalid` or `aria-describedby` on the field.
  - The only way past is a small "No goal for now" text link inside the fine print. In my run Continue was pressed 12 times without leaving step 4.
- **Fix:**
  - Say "Add a target amount, or choose No goal for now." next to the field, with `aria-invalid` and `aria-describedby` on it.
  - Or don't pre-select a goal category from a focus: suggest it, but leave it unticked.
  - Give "No goal for now" a ≥44 px secondary button.
  - Map parser messages to plain copy, as `unified-goal-wizard.tsx:158` already does.

**R21 · Minor · /app/welcome step 4 · 390 · Nebula · fresh start**
- **Problem:** The habit that came from a focus ("Contribute · From your focus · daily") is rendered `checked disabled`. Its text is dimmed, so it looks unavailable rather than chosen, while the unselected cards next to it are brighter.
- **Fix:** Show it as selected (full-strength text and a tick) with a note "From your focus. Untick the focus to remove it", or make it a normal toggle.

## Goals (`/app/goals/**`)

**R1 · Blocker · /app/goals/average/[id] · 390 and 1440 · all themes · Showcase (also reachable with real data)**
- **Problem:** `/app/goals/average/showcase-create` ("Create 2 hours a day", linked from the Showcase's Goals) renders the error boundary "This page could not be shown." The console shows `TypeError: Cannot read properties of null (reading 'kind')`.
- **Cause:**
  - `AverageGoalDetail` (`components/goals/average-goals.tsx:123`) mounts `<GoalPlan>` without a `summary`.
  - In `SubGoals` (`components/goals/goal-plan.tsx:111`), `const r = summary ? rollUp(summary, kids) : null`, so `r` is `null`.
  - Line 122 then calls `rollUpWords(r!, …)` whenever `kids.length > 0`.
  - The Showcase gives this average goal a child (`lib/goal-extras/showcase.ts:28`, `parentKey: 'average:showcase-create'`).
  - A real person hits the same crash as soon as any goal is set "Part of a bigger goal" = an average goal.
- **Fix:** Render the rollup line only when `r` is non-null (fall back to the "n of m sub-goals done" count), or pass an average goal's summary from `AverageGoalDetail`. Add a unit or component test for an average parent with a child, and a Showcase smoke check that opens every Showcase goal link.

**R5 · Major · /app/goals/new · 390 and 1440 · all · fresh start**
- **Problem:** The main "Create a goal" wizard defaults to a crypto goal:
  - `type` starts as `'QUANTITY'` (`components/unified-goal-wizard.tsx:60`), and the asset falls back to `'ZIG'` (line 110). The live summary reads "Quantity · ZIG · Custom · At your own pace".
  - The asset field says "Use a symbol such as BTC or ZIG".
  - The contribution plan asset defaults to `'ZIG'` (line 71), with "Buy ZIG" copy (line 215).
  - The types offered are "Quantity — Build a quantity of an asset you choose", "Value — Track allocated wealth toward a currency target", "Reward — Track rewards that remain unclaimed" and "Project". These are system terms, not a person's words.
- **Fix:**
  - Default to a money goal in the person's currency (`VALUE` with `preferredCurrency`).
  - Word the choices as "Save an amount", "Reach a number of something", "Finish a project". Offer "Reward" only once a wallet is linked.
  - Default the plan asset to the goal's currency.

**R25 · Polish · /app/goals/positions · all · all**
- **Problem:** The route redirects to `/app/staking` (h1 "Staking"). A Goals sub-route that lands on a crypto page is confusing in bookmarks, history and Search.
- **Fix:** Point any remaining links at `/app/staking` directly, and keep the redirect only for old links.

## Health (`/app/health`)

**R6 · Major · /app/health · 390 and 1440 · all · fresh start and Showcase**
- **Problem:** The section "Next on your Health journey" (`components/health/health-app.tsx:302`) still says:
  - "Planned for Beta. Your working journal above is ready today."
  - "Barcode scan · Manual entry and on-device decoding · Provider activation pending"
  - "A photo, a food entry · Food recognition is on the roadmap. · Coming soon · Not available yet"
- The same page already ships "Scan or look up a food barcode" (`barcode-food-lookup.tsx`) and "Estimate a meal from a photo" (`meal-photo-panel.tsx`, under Foods & recipes). For a 1.0 this is both a roadmap card and an untrue label.
- **Fix:** Remove the roadmap card. If a "devices" pointer is wanted, keep one line linking to `?view=devices`. Health's existing feature cards say the rest.

## Wealth (`/app/wealth/**`, Portfolio, Markets)

**R22 · Minor · /app/wealth · all · all · fresh start**
- **Problem:** The core Wealth pillar says "Portfolio is a separate tracker for coins, kept apart from Wealth. Ways to earn on ZIGChain →". There are three overlapping trackers (Wealth, Portfolio, Staking), and a crypto link sits on a non-crypto pillar.
- **Fix:** Show the Portfolio and Earn links only when those pages are switched on (Settings → Pages). Longer term, merge Portfolio's coin tracking into Wealth's asset list (owner decision).

**R30 · Polish · /app/wealth charts · 1440 · all · Showcase**
- **Problem:** Chart axis and value labels are 11 px SVG `tspan`s ("US$320,000", "US$437,700"…), 15 of them on the page.
- **Fix:** Make them ≥12 px (0.75 rem) via the chart's text class.

## Earn (`/app/earn`)

**R9 · Major (performance) · /app/earn · 390 · Nebula · fresh start and Showcase**
- **Problem:** Earn is the heaviest route:
  - Unthrottled, its longest task is 923–999 ms.
  - At 4× CPU, the longest task is **3.3–3.4 s**, total blocking time is 6.4 s (fresh) and 7.8 s (Showcase), and LCP is 3.9 s.
  - The page freezes for seconds on a mid-range phone.
- **Fix:** Profile `components/earn/earn-view.tsx`. Mount the sections below the first screen (`apps-sections`, `wider-sections`, `native-section`, academy) on view. Move live-figure maths off the first render. Keep illustrations as static assets, not render-time SVG generation.

## Checklist (`/app/checklist`, PROTECTED look: bug only)

**R10 · Major (performance) · /app/checklist · 390 · Nebula · Showcase**
- **Problem:** At 4× CPU, the Showcase Checklist has a **3.0 s** longest task and 5.2 s total blocking time (19 long tasks). Unthrottled, it has a 576 ms task and a 3.25 s task in one run and an 813 ms task in another. The fresh Checklist is fine (0.7 s TBT).
- **Fix:** Find which part of the path rendering or celebration preloading scales with the number of planets and days, and defer it until idle. The protected visuals do not change.

## Settings (`/app/settings/**`)

**R4 · Major · /app/settings · 390 and 1440 · all · fresh start**
- **Problem:** A consumer's Settings opens with "Your data. Your control. Goal plans stay on this device. **Your wallet controls onchain funds.**". Its list shows these rows to everyone:
  - "Wallet account · Local Demo or Keplr"
  - "Testnet network · Chain and wallet connection"
  - "Contract status · Deployment status"
  - "Diagnostics & support · Connection checks for this alpha" (`components/phone/phone-settings.tsx:51`)
  - "Separate versioned backups preserve the existing Goal recovery format."
- `/app/settings/data` also shows "© 2025 Reown, Inc. All Rights Reserved. WalletConnect notices".
- **Fix:**
  - Group the wallet, network and contract rows under one "Wallet & network (advanced)" row, shown once a wallet is linked or the crypto pages are on.
  - Hero copy: "Your data. Your control. Everything you add stays on this device."
  - Move third-party notices behind "Licences".

**R23 · Minor · /app/settings/reminders, What's new / Help · all · all**
- **Problem:** The page shows owner-facing status copy: "…until the owner activates push for the Alpha", and "notifications on this device are being switched on".
- **Fix:** Hide the push section while push is unavailable. Or say "Reminders on a closed app aren't available yet. Reminders inside the app work today."

## Navigation and shell (every route)

**R3 · Major · sidebar / tablet rail / Search · 1440 and 768 · all · fresh start (owner decision for the default)**
- **Problem:** With no choice made, the sidebar lists Earn, Markets, Staking, Portfolio and Ecosystem beside the four pillars (Tab order: Today, Goals, Habits, Health, Wealth, **Earn, Markets, Staking, Portfolio, Ecosystem**, Activity…). The welcome's "What do you want to improve?" step can hide them, but the default before (or without) the welcome shows them all, which contradicts the welcome's own "No crypto needed. The blockchain stays out of sight".
- **Fix:** Keep the nav bars as they are (PROTECTED) and change only the default page set: hide the five crypto pages by default, as Governance already is, and show them when the person picks "Goals & money" or links a wallet, or in Settings → Pages.

**R8 · Major · every page title, install and search metadata, top banner · all · all (owner decision for the wording)**
- **Problem:** For a 1.0:
  - `app/layout.tsx:66`: the title template is "%s · ZIGoals Alpha", and the default is "ZIGoals Alpha — Your goals. Onchain.".
  - `app/layout.tsx:68` and `public/manifest.webmanifest` description: "Plan, fund and track goals in a clearly labelled local demo or ZIGChain Testnet. Independent, unaudited alpha." This is what search results, share cards and the install sheet show.
  - The banner "PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN" sits on top of every page (`components/shell.tsx:122`). On a phone it takes 56 px under the top bar, and "sign" means nothing to a non-crypto person.
- **Fix:**
  - Put the release name in one constant (title template, description, manifest).
  - Proposed description: "Goals, habits, health and wealth in one private app. Your records stay on your device."
  - Show the network banner only in Keplr or Testnet mode. "Premium · free during the Alpha" is PROTECTED and stays until the owner decides.

**R15 · Minor (performance/INP) · Quick add sheet · 390 · Nebula · fresh start and Showcase**
- **Problem:** At 4× CPU, opening Quick add takes 288 ms (fresh) and 432 ms (Showcase) from tap to next paint, which is INP "needs improvement" or "poor". Bottom-nav taps are fine (48–152 ms).
- **Fix:** Preload the sheet's chunk on pointerdown or focus of "+", and render the speech and preview parts after the sheet is shown.

## Habits, Journal, Activity and other Life pages

**R16 · Minor · /app/habits · all · all · fresh start**
- **Problem:** The footnote reads as small print: "Streaks count scheduled successful days or completed target periods. Non-scheduled and paused dates do not count against consistency. Skips and failures remain distinct. Saved timers retain timestamps across reloads and require review before logging; browser-closed reminders are not promised." The page also shows a "Habit journal timezone" field.
- **Fix:** Say it in one sentence: "Days you skip or pause never break a streak." Move the timer and reminder detail to Help, and the time zone to Settings → Time zone (already there).

**R17 · Minor · /app/activity · all · all · fresh start**
- **Problem:** "This is private browser history, separate from testnet receipts." and "ON THIS DEVICE · LOCAL SIMULATION HISTORY · Detailed Goal simulation history" are developer words on a consumer page.
- **Fix:** Show the simulation history only in Keplr or Testnet mode or in the Showcase. Elsewhere say "Your history, kept on this device."

**R18 · Minor (a11y) · /app/journal · all · all**
- **Problem:** Screen-reader labels and tooltips use raw ISO dates, for example "2026-10-26: no check-in" (`components/journal/journal-page.tsx:54`) and "2026-10-18: not rated" (line 61, `title`).
- **Fix:** Use `formatDay`/`lib/visual-format.ts` ("Mon, Oct 26: no check-in"), as the rest of the app does.

**R19 · Minor (a11y, touch) · /app/music · 390 · all**
- **Problem:** The 13 sound and preset chips ("Rain-like", "Ocean-like", "Brown noise", … "Workout") measure 59–126 × **31 px**, under the 44 px rule (`.ambient-chip` sets 44 px, so something on the Music page overrides it).
- **Fix:** Restore `min-height: 44px` on `.music-mix-chip`.

**R24 · Minor · /app/help · all · all**
- **Problem:** Help has 188 questions, and about 35 of them are release notes in question form: "What changed in Habits?", "Where are the Alpha notices and the wallet buttons now?", "Are Light and Dark finished now?", "Why is the top of each page plainer now?", "Where did the Alpha's facts below the footer go?"… A 1.0 Help reads as a changelog, and some entries tell people things were unfinished.
- **Fix:** Move the "what changed / now" entries into "Earlier updates" (What's new), and keep Help task-shaped ("How do I…", "Is my data…").

**R26 · Minor · /app/zigi ("Meet ZIGi", from Settings) · all · all**
- **Problem:** The page is a catalogue of every animation state ("Idle · Moves while it lasts…", "Loading a model… When it appears: Chrome's built-in model…"). It reads as a design spec, and the useful control (Animation Full, Calm or Off) is buried at the top.
- **Fix:** Lead with what ZIGi can do and the privacy line. Fold the state gallery under "Every way ZIGi can look". The ZIGi look itself stays as it is (PROTECTED).

**R31 · Polish · several · all · all**
- **Problem:** Capitalisation of "Goal" and "Habit" is inconsistent: "No active goal yet" vs "No active Goal yet", "0 of 0 Habits complete", "Create your first goal" vs "Your Goals".
- **Fix:** Pick one rule (lowercase in running text, capitalised only as page names) and apply it through the shared copy.

**R32 · Polish · /app/music, /app/zigi/memory · 390 · Nebula**
- **Problem:** CLS is 0.094 on both pages (just under the 0.1 "good" line, the highest in the app; every other route is ≤ 0.005).
- **Fix:** Reserve the height of the late-mounting block (the player and memory list) with a placeholder.

## Offline (PWA)

**R12 · Major · installed app, manifest shortcuts · 390 · all · fresh device after one online visit**
- **Problem:** `public/sw.js` precaches only `/app` at install (line 109); other pages are cached only once visited. After visiting `/app` and `/app/habits` and then going offline:
  - Works: `/app?shortcut=water` and `/app/habits`.
  - "You are offline · This page was not saved on this device yet": `/app/today` (the manifest's "Today" shortcut), `/app/checklist` (the "Checklist" shortcut), `/app/health?shortcut=weight#weight` (the "Log weight" shortcut) and `/app/goals`.
  - A tap on the bottom-nav "Health" while offline also shows the full-page offline screen.
- The install copy promises "shortcuts for Today, the Checklist, water and weight" and "works offline with your records on this device".
- **Fix:** At install, also cache the pages the manifest and bottom bar link to: `/app/today`, `/app/goals`, `/app/habits`, `/app/health`, `/app/wealth`, `/app/checklist` and `/app/settings`. They hold no personal data, and the network-first rule stays. Or point the "Today" shortcut at `/app`. Add a test that every manifest shortcut path is in the install list.

---

## What is already release-quality

- **Layout:** no horizontal scroll on any of the 44 routes at 390 or 1440, in Nebula, Light or Dark, with the Showcase or a fresh start. Phone targets are ≥44 px everywhere except Music's chips.
- **Motion:** with `prefers-reduced-motion: reduce` or Motion Off, `document.getAnimations()` has no running animation on Today, Checklist, Goals or Health, and the swan intro is skipped.
- **Keyboard:**
  - The skip link comes first, and the sidebar order is logical.
  - All 40 first Tab stops on Today have a visible ring.
  - The Quick add dialog moves focus to "Close Quick add" and closes on Escape.
  - With a simulated keyboard (480 px tall), the input stays visible.
- **States:**
  - Unknown ids give calm messages: "Goal unavailable…", "Coin not found… ZIGoals does not guess from a name", "Asset unavailable · Return to Wealth".
  - The 404 page says "Page not found… Nothing was changed".
  - The error boundary says "Nothing was changed or lost".
  - The offline banner reads "Offline · this page keeps saving on this device".
- **Trust:**
  - The compound calculator says "Every result is an estimate; returns are not guaranteed", lists every assumption and adds no fees or taxes it can't know.
  - Pace forecasts say "An estimate from your pace so far, not a promise".
  - Health and money copy repeats "not advice".
  - Speech input says plainly that audio goes to Google's service.
  - Showcase data is labelled on every card ("SHOWCASE DATA · fictional plan and history") and kept in separate storage.
  - Unknown values never show as zero ("Not recorded", "No data yet").
- **Empty states with a next step:** Goals, Habits, Health, Review, Stories, Timeline and Journal each say what will appear and offer one action.
- **Themes:** Light's dark islands and Dark hold contrast on the routes checked. The only automated contrast hits outside dark islands were the off-screen skip link and the Wealth pager's "Previous/Next change records" buttons (2.5–2.6:1). Those buttons are disabled when there is nothing to page; confirm they are disabled, otherwise lift their colour.
