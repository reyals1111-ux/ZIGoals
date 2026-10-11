# Session Y Part 11: the live human test on Alpha #34 (Pass 3)

**Status:** run 2026-10-10 01:00–01:22 UTC on the live Alpha, read-only for the service: fictional data in the browser
only, one worker, a 250 ms pause between steps, no load. Labels: live (alpha.zigoals.app, deploy #34 = `e30b7c6`), local
(the follow-up re-check of one harness fix). The charter, the journeys and their kit are Session X's
([`docs/verification/x-cloud/HUMAN_TEST.md`](../x-cloud/HUMAN_TEST.md)); this pass adds four journeys for X-Local's ZIGi
without a provider.

## How it ran
- **Build check first:** `curl -sI https://alpha.zigoals.app/app` returned `x-zigoals-build: e30b7c6c0fe6d94500d58908c56f87256e6e61ce`
  at 01:00 UTC; the script stops unless it reads exactly that.
- **The run:** `HUMAN_LIVE=1 pnpm exec playwright test -c playwright.human.config.ts` (the `@live` journeys only), real
  pages over the environment's HTTPS proxy, Playwright's Chromium standing in for Chrome, time zone Europe/Brussels,
  `en-US`. Market requests are answered in the browser (as in Pass 2), so nothing reached the shared CoinGecko key. No
  account, no sign-in, no AI provider: X-Local's ZIGi was met as a person without one meets it.
- **What it is not:** an iPhone. The 13-row iPhone checklist ([ZIGI_ALIVE_X.md](../../product/ZIGI_ALIVE_X.md)) stays the
  owner's.

## Results
68 journeys tagged `@live` (64 from Pass 2, four new), on the viewports each one lists: **216 cells, 188 passed, 1
failed, 27 not applicable**, in 21 min 24 s.

### What #32 failed and #34 passes
Pass 2 on #32 had 16 failed cells, each something Session X added or fixed. All 16 pass on #34 (live):

| Journey | On #32 (Pass 2) | On #34 (this pass) |
|---|---|---|
| J047 an unknown goal: a calm message and a way back | fail D, T, P | pass D, T, P |
| J201 Settings: six groups; chips on computers, the grouped list on phones | fail D, T, P | pass D, T, P |
| J226 Send feedback, without and with my edited details | fail D, T, P | pass D, T, P |
| J228 Help → Known limitations: its links work | fail D, T, P | pass D, T, P |
| J254 an unknown /app route: a calm not-found with a way back | fail D, T, P | pass D, T, P |
| J250 every page at 320, 360 and 390 px in the Showcase (React #418 on Chess, and once at Wealth → Portfolio) | fail P | pass P |

J250 includes the step from Wealth to Portfolio on the phone where #32 showed React's #418 once (the owner item "one look
at Wealth → Portfolio in the phone Showcase after the next deploy"): no hydration error and no page error on #34
(live). Session Y's own verdict on that #418 (ADR-018 Y9: not a server/browser date split) is unchanged.

### The four new journeys (X-Local's ZIGi without a provider)
`apps/web/human-x/10-zigi-alive.spec.ts`:
- **J501** the launcher shows its Studio-2 art (`F001-idle`) on Today, Habits, Health, Wealth and Goals, and rests clear
  of Habits' "+ New habit" (ADR-017 S81): pass D, T, P.
- **J502** Meet ZIGi from Settings → ZIGi's look: every state of the manifest with its code, nothing written on view:
  pass D, T, P.
- **J503** ZIGi plays its idle clip while it waits (Calm, the default), and holds the still poster with its animation
  Off and with Motion Off: pass D; **fail P** (below).
- **J504** in the Showcase the launcher and Meet ZIGi are the same and show nothing personal: pass D, P.

### The one failure: J503 on the phone (harness timing, not the app)
The figure reported "playing" and 25 ms later its `currentSrc` read empty, where `F001-idle.anim.webp` was expected.
The trace shows why: the app swaps the poster for the clip in one render (the `src` changes and the poster's `srcset` is
dropped); on the phone's 3× screen the poster came from its `srcset`, and the browser reports the new file only once it
has selected it. The journey read in between. The check now waits for the file (`expect.poll`, the same exact value);
re-run once on the live Alpha: see "Re-check" below. Not an app defect, so no owner item.

### Re-check
J503 alone, on the live Alpha with the waiting read, 01:38 UTC (build `e30b7c6` read first): **pass D, pass P** (T not
listed), 17.5 s (live). The coverage table below keeps the pass as it ran (the phone cell as "fail"); the re-check's
report is on `review/session-y-runs` beside it.

### Every other journey
Passed on each viewport it lists: the welcome and Today's empty states, Goals, Habits, Health, Wealth, Portfolio,
Markets, Staking and Ecosystem read paths, Activity, Chess, Music, Settings (every group), Help, Install, two tabs, deep
links, the skip link, keyboard paths, reduced motion and Motion Off.

## Raw cells
The JSON report, the run log, the 73 screens the journeys took and the failed cell's trace are on the orphan branch
[`review/session-y-runs`](https://github.com/reyals1111-ux/ZIGoals/tree/review/session-y-runs) (review only; never merged).

## Owner items from this pass
None new. The iPhone checklist for #34 stays pending (owner-reported).

## Coverage (live, #34)
"n/a": a viewport the journey does not list.
| Journey [data] | D 1440 | T 1024 | P 390 |
|---|---|---|---|
| J001 [E] a new device opens Today: the welcome explains Local Demo and nothing is saved yet | pass | pass | pass |
| J002 [E] the welcome: Habits and Health chosen, Finish setup, Today shows exactly those areas | pass | pass | pass |
| J005 [E] Today with no data: every empty state says what to do next; no zero shown as a fact | pass | pass | pass |
| J007 [S] Quick add from Today: the dialog opens, Escape closes it and focus returns | pass | pass | pass |
| J009 [L] the Quick-add line: "drank 2 glasses of water" previewed, saved, shown on Health | pass | pass | pass |
| J027 [S] every Today link lands on its page with the title shown | pass | pass | pass |
| J031 [E] create a goal with the wizard; it appears in Active | pass | pass | pass |
| J031 [L] create a goal with the wizard; it appears in Active | pass | pass | pass |
| J041 [L] "On track?" with zero return: what is left, the pace, the date it points to | pass | pass | pass |
| J047 [E] a goal that does not exist: a calm message and a way back | pass | pass | pass |
| J049 [S] /app/goals/positions leads to Staking | pass | n/a | pass |
| J060 [E] Goals' empty state on a new device explains the first step | pass | pass | pass |
| J061 [E] create a daily habit, check it in, see it done | pass | pass | pass |
| J065 [L] undo a check-in | pass | pass | pass |
| J073 [L] a habit title with emoji and 80 characters stays whole or ellipsed, never overflowing | pass | pass | pass |
| J085 [S] Habits in Showcase writes nothing to my own records | pass | n/a | pass |
| J088 [E] Habits' empty state says what to do first | pass | pass | pass |
| J091 [E] Health's first visit says what stays on the device | pass | pass | pass |
| J092 [E] the diary: a food, then a meal of 1.5 servings, the calories right | pass | pass | pass |
| J092 [L] the diary: a food, then a meal of 1.5 servings, the calories right | pass | pass | pass |
| J099 [L] weight: 78.4 kg saved and listed; a second entry the same day | pass | pass | pass |
| J109 [L] Sleep: "I'm going to bed", then "I woke up"; time asleep marked estimated | pass | pass | pass |
| J115 [L] Meditation: a one-minute session timed to the end | pass | pass | pass |
| J119 [E] Devices: the honest list; without Web Bluetooth it says so | pass | pass | pass |
| J122 [S] Health in Showcase writes nothing to my records | pass | n/a | pass |
| J136 [E] Wealth's empty state | pass | pass | pass |
| J137 [E] a manual cash asset added in Wealth, labelled as my own value | pass | pass | pass |
| J137 [L] a manual cash asset added in Wealth, labelled as my own value | pass | pass | pass |
| J137b [E] Escape closes "Add to your wealth" and focus returns to its button | pass | n/a | pass |
| J138 [L] accounts in EUR, JPY and CHF: net worth per currency, never converted | pass | pass | pass |
| J146 [E] Portfolio: create one; without prices, values stay unknown | pass | pass | pass |
| J156 [S] Markets with the market service unavailable: an honest state, no invented prices | pass | pass | pass |
| J161 [E] Staking: a watch-only address that is not one is refused | pass | pass | pass |
| J162 [S] Staking in Showcase: positions and totals; nothing that moves funds | pass | pass | pass |
| J165 [S] Ecosystem cards: open in place with Enter and Space; several stay open | pass | pass | pass |
| J166 [S] an Ecosystem #project link opens its card and brings it into view | pass | n/a | pass |
| J167 [S] Ecosystem links open safely: new tab, no referrer | pass | n/a | pass |
| J181 [L] Activity lists what I just did | pass | pass | pass |
| J182 [E] Activity's empty state | pass | pass | pass |
| J185 [E] Chess is hidden until shown; showing it adds it to the navigation | pass | pass | pass |
| J189 [E] Chess with no username: an honest empty state, no request to either site | pass | n/a | pass |
| J190 [E] the music player is hidden until shown; Settings → Music shows it | pass | pass | pass |
| J192 [E] Spotify not registered here: it says so and offers no sign-in | pass | n/a | pass |
| J193 [E] Apple Music is a link to its own app, safely | pass | n/a | pass |
| J194 [E] My links: three https links with my own names | pass | pass | pass |
| J195 [E] My links refuses http:// and javascript: addresses | pass | n/a | pass |
| J201 [E] Settings: six groups; computers jump by chips, phones by the grouped list | pass | pass | pass |
| J205 [E] Motion Off from Settings; the choice survives a reload | pass | pass | pass |
| J209 [E] reminders while ZIGoals is closed: unavailable in this build says so; nothing is asked | pass | pass | pass |
| J210 [E] the market data section says what is fetched and from where; its link opens Markets | pass | n/a | pass |
| J211 [E] Account & sync without accounts on this build: it says so; local records stay | pass | pass | pass |
| J224 [E] "Keep my data on this device" asks the browser and says what it answered | pass | n/a | pass |
| J225 [E] diagnostics: the connection check reads only, and the support preview copies nothing until asked | pass | n/a | pass |
| J226 [E] Send feedback: without details, then with my edited details; nothing sent or stored | pass | pass | pass |
| J227 [E] Help: every question opens and closes; a hash link opens its answer | pass | pass | pass |
| J228 [E] Help → Known limitations: its links work | pass | pass | pass |
| J229 [E] Help → Install on iPhone on a phone: the steps for this browser | n/a | n/a | pass |
| J230 [E] Help with the keyboard only: topics, then a question opened and closed with Enter | pass | n/a | n/a |
| J232 [E] Settings at 320 px: every row reachable, nothing sideways, rows at least 44 px | n/a | n/a | pass |
| J235 [E] ZIGi launcher and panel: open, close with Escape; nothing sent without a provider (smoke) | pass | n/a | pass |
| J237 [E] the contract section says NOT DEPLOYED and financial execution is off | pass | n/a | pass |
| J250 [S] every page at 320, 360 and 390 px: no sideways scroll, the title on the first screen | n/a | n/a | pass |
| J251 [S] the navigation reaches every page and marks the current one | pass | pass | pass |
| J252 [S] back and forward across five pages restore each page | pass | pass | pass |
| J253 [E] a deep link to every page in a fresh tab | pass | pass | pass |
| J253 [S] a deep link to every page in a fresh tab | pass | pass | pass |
| J254 [E] an unknown /app route shows a calm not-found with a way back | pass | pass | pass |
| J260 [S] the skip link on every page moves focus to the content | pass | n/a | n/a |
| J501 [E] ZIGi's launcher shows its art on every main page and rests clear of the first action | pass | pass | pass |
| J502 [E] Meet ZIGi from Settings: every state with its code, nothing written on view | pass | pass | pass |
| J503 [E] ZIGi breathes while it waits (Calm), and holds still with its animation Off or Motion Off | pass | n/a | fail |
| J504 [S] in the Showcase ZIGi is the same and Meet ZIGi shows nothing personal | pass | n/a | pass |
