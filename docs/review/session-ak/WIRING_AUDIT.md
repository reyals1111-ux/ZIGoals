# Session AK — Q1 wiring audit (ADR-036 Built / Finished rows)

Fresh read-only auditor. **Checked:** the production server on http://127.0.0.1:3101, a `next start` build of **1f9a7f23** (built 00:46 UTC on 2026-11-01, from the lead's scratch `ak-build/`; the brief said 271420e7, but the running process serves 1f9a7f23, which is also this branch's HEAD at audit time). Every outside host and every app `/api/*` route was answered by `page.route` (503 or a fixture, as the specs do); nothing reached a third party.
Evidence (scripts, page dumps, screenshots, downloads): `/tmp/claude-0/-home-user-ZIGoals/a64d6793-df8d-5435-a8c1-37163e44c609/scratchpad/q1/` (`run1.js`…`run17.js`, `out/*.txt|png`). Below, `out/x` means that folder's `out/x`.

**The five checks per row:** **R** reachable from the app's navigation · **E** works end to end in this build · **S** saves, survives a reload, and is in Export everything / restore where it is personal data · **H** a Help answer mentions it · **T** a test that would fail if it broke (E2E = a browser spec on the UI path; U = unit or jsdom only, which would not catch the page losing the feature).

**Statuses:** Working · Partly working (exact gap named) · Not reachable · Stub.

## Cross-cutting results

- **Save → reload → Export everything → Restore (fresh profile, run4):** bills, budgets, emergency sheet, auto-rules, supplements, money log, money review, habits and habit extras were made through the UI, survived a reload, were all in `everything.json`, and came back byte for byte after "Restore the chosen parts" on a new browser profile (`out/f-export-report.txt`, `out/f-restore-report.txt`). Statically, all 30 `AK_PERSONAL_KEYS` are in `DEVICE_KEYS` (lib/export/everything.ts:118-170) and the restorable ones in `DEVICE_PARTS` (lib/restore/plan.ts:116-150). Device-only by design: notify prefs, linked wallets, Lichess token, meal photos (exported as files, not restored).
- **Showcase records live in this tab's storage** (`getAppStorage`), so all persistence checks were done on a fresh, non-Showcase profile.
- **Navigation:** the sidebar shows Today, Goals, Habits, Health, Wealth, Activity, Checklist, Settings and Help on a fresh start; Earn, Markets, Staking, Portfolio, Ecosystem and Chess appear once the chain is chosen or switched on (`out/nav-fresh.txt`, `out/nav-showcase.txt`). A link crawl of 20 pages with every fold opened (`out/links.json`) found **no link to `/app/journal` or `/app/music`** from any page, and **Search has no page entry for either** (run17: "journal" → only templates and Help; "music" → only Help). The Journal opens only from Today → "Show more" → "How was today?" → "Open your journal" (run9); the Music page only from the music button's panel, and that button is hidden for new people until Settings → Music → "Show the music player" (`out/s9-settings.txt:312`).
- **Environment note, not a product finding:** in this sandbox, Playwright's *headless shell* renderer crashes whenever the ZIGi panel opens (fresh and Showcase alike, with or without video; run14). The full Chromium that the specs use (`channel: 'chrome'`) opens ZIGi normally, so runs 13 and up used it.

## Rows

### Parts 1–12

| Row | Status | Evidence / exact gap |
|---|---|---|
| 1a WalletConnect (Reown id, CSP, QR, deep links, A7–A9) | Working | R: wallet menu "Connect by WalletConnect", after the chain is chosen (Settings → Your pages & buttons). E: tests/journeys/j07-wallet-chain.spec.ts:95 pairs over a routed relay (not driven again here). S: linked wallets exported, never restored (by design). H: Help `ak-wallets`. T: E2E j07, U walletconnect*.test. Live pairing needs Reown to approve the domain (A9). |
| AFL9 Keplr Mobile staking over WalletConnect | Partly working | Pairing and "never signs by itself" are covered by j07:128. **Gap:** signing a reviewed delegation over WalletConnect has no browser test (`@journey 7b` is still `test.fixme`, j07:144); only lib/staking/walletconnect-signer.test.ts. |
| 1b food Worker: FDC after OFF | Working | E: barcode → lookup (`/api/food-lookup` fixture) → "Confirm and log food" → "Added to your private diary" (run7 `s7-barcode`). The FDC fallback is server-side and proven only by lib/server/food-lookup-route.test.ts and the Worker tests; it cannot be proven offline. H: `ak-food`. T: E2E j02, run10-barcode. |
| 1c EU generic library | Working | E: "Search foods by name" → "apple" gives Ciqual 2025 and CoFID rows from the offline library (`out/s10-eu.txt`). H: `ak-food`. T: E2E j02 ("Offline food library results"). Fineli is still waiting (not built). |
| 1d music for everyone (/app/music, mix, links, BYO Spotify, focus and wind-down hooks) | Partly working | E: /app/music renders the mix, playlists and Spotify parts (`out/sc_app_music.txt`). S: `musicMix` is exported and restorable. H: `ak-music`. **Gaps:** (1) /app/music is in neither the sidebar nor Search; a new person must first turn the music button on in Settings → Music. (2) No browser test opens /app/music or plays a mix (only lib/audio unit tests). |
| Part 2 push (built, switched off) | Partly working | E: Settings → "Notifications, even when ZIGoals is closed." shows "Being switched on", with every kind including Bills and Supplements (`out/sc_app_settings.txt:591-640`). The in-app flow with stubs: tests/pwa-ak.spec.ts:72,85 and j05. H: `ak-notify`. **Gap (owner action, not a defect):** no notification can reach a device until the owner activates push (VAPID keys and the Worker). |
| Part 3 PWA (A4 caching, A18 assets, install, update prompt, offline queue) | Working | E: sw.js registered; after one visit, /app/habits opened offline (run10, `out/s10-offline.png`); the manifest has 4 screenshots and 7 shortcuts, and pages carry 9 startup images; Settings → Install ZIGoals. H: `ak-offline`. T: E2E pwa-ak.spec, j04, install-manifest.spec. |
| A6 storage headroom (Part 3 row) | Partly working | lib/storage-headroom.ts is used once, in components/notify/notify-sync.tsx:74 (a one-time line when storage is nearly full). T: U storage-headroom.test.ts only. **Gaps:** no Help answer mentions the "nearly full" line, and no browser test. |
| 4.1 barcode (history, library first, amounts, not-found draft) | Working | E+S: logged a looked-up product, reloaded, and "Recent scans" lists it (run7, "recent scans shown true"). `foodScans` is exported and restorable (Health). H: `ak-food`. T: E2E j02 ("Log … again"). |
| 4.2 meal photo (honest copy, opt-in device photo, exported as files) | Working | R: Health → Foods & recipes → "A photo of a meal". Without an AI it says so honestly (`out/s10-label-scan.txt`). T: E2E j02 (estimate through a mocked AI), U photos.test. H: `ak-food`. Photos are exported as files and not restored (Help says so). |
| 4.4 micronutrients (7 extras, report, top sources) | Partly working | E: Targets → "Open the nutrient report" opens the report (run15, `out/s15-nutrient-report.png`); "Which of my foods are high in…" shows (`out/health-tab-Targets.txt`). H: `ak-nutrition`. **Gap:** no browser test of the report or the top sources (U nutrition-ak.test.ts only). |
| 4.5 weekly coach card | Working | E: Health shows "YOUR COACH · THIS WEEK" and Today shows "Keep my target" (`out/sc_app_health.txt`, `out/s5-qa-bundle.txt`). H: coach answers. T: E2E j02 ("Your coach", "Keep my target"). |
| 4.6 planner and grocery | Working | R: Health → Planner and Meals & planning. H: `ak-nutrition`. T: E2E health-aa.spec (grocery), j08 (grocery card). S: `grocery` exported and restorable. |
| 4.7 wearables (FIT, Strava ZIP; Garmin via FIT) | Partly working | E: a Strava ZIP (activities.csv plus GPX) through Workouts → "Import a GPX or TCX file…" → "Add 2 workouts" (run7). FIT was not driven (no fixture outside the test encoder). H: `ak-switch` and the workouts line. **Gap:** no browser test uploads a FIT file or a Strava ZIP (workouts-import-aj covers GPX/TCX; j10 only says Garmin is "not read yet"). |
| 4.8 recipe polish (per-row match, food picker) | Partly working | R: Health → Import. **Gaps:** the per-row match state was not shown working here, and no browser test covers it. The ADR's "recipe-match tests" exist only as cases inside lib/health-aa/nutrition-ak.test.ts; there is no recipe-match test file. |
| 4.9 training and sleep (supersets, RPE, plates, rest, PRs, volume, wake consistency) | Partly working | Training works and is tested end to end (j02: superset, RPE, plates, warm-up, rest). Sleep shows "Wake-time consistency" (`out/health-view-sleep.txt:107`). **Gaps:** wake-time consistency is in no Help answer and no browser test. |
| A15 Switch to ZIGoals: Strong, Hevy, Daylio, Habitica, YNAB | Working | E: a Daylio CSV → "Import from Daylio" → journal entries saved (run7). H: `ak-switch`. T: E2E switch-more-ak.spec, j10. |
| 5.1–5.4 habits (due/optional, skip reasons, Strength, routine full screen and share) | Partly working | E: Strength and skips show (`out/sc_app_habits.txt:250`); "Add routine" → "Add 2 habits" → Start → "Full screen" plays step 1 of 4 (`out/s12-routine-fullscreen.png`); "Share or add" opens (run10). H: `ak-habits`. **Gap:** no browser test of the routine's full screen or of sharing (U routines tests only). |
| 5.6 auto-complete rules | Working | E+S: Habits → "Set up rules" → saved; `auto-rules` exported and restored identically (run4). H: `ak-habits`. T: E2E j08 (auto-rule card), auto-checkins.spec; U lib/auto-rules. |
| 5.7 reorder, compact list | Working | E: "Show habits as" Cards/Compact switched (run4); the order is kept in habit extras (exported and restored, run4). H: `ak-habits`. T: U compact-toggle.test.ts (jsdom). |
| 6.1 goal bundles from Quick add | Partly working | E: Quick add "save €5,000 for a trip by June and walk 8k steps most days" → "Check each part" with the goal, milestones and habit (`out/s5-qa-bundle.png`). H: `ak-goals`. **Gap:** no browser test (only U nl-bundle-wiring.test.ts). |
| 6.2 30-day pace and what-if | Working | E: goal page "What if…" and "about $750.00 every 30 days" (`out/s5-goal-0.txt:92,685`). H: `ak-goals`. T: E2E j08 (what-if card), goals-v2.spec. |
| 6.3 progress card | Partly working | E: goal → "Share progress" → "Share your progress" image card (`out/s5-goal-share.png`). H: `ak-goals`. **Gap:** no browser test (U what-if-progress-card.test.ts only). |
| 6.4 milestone templates, habit links | Partly working | E: "Suggested milestones · Save for a trip" with "Add 4 milestones" (`out/s5-goal-2.txt:641`). H: `ak-goals`. **Gap:** no browser test. The ADR's "milestone-suggest" test is not a file; its cases are in nl-bundle-wiring.test.ts and milestone-templates.test.ts. |
| 7.1 CSV templates, saved mappings; A14 CAMT.053/OFX/MT940 | Working | E: an OFX file → "Add 3 to my money log" → "To review (3)" survives a reload (run3, `out/m-import-add.png`); the CSV template downloads (run16, `out/template.csv`). S: money log restored identically (run4). H: `ak-money-tools`. T: E2E j03. |
| 7.2 exchange auto-refresh | Partly working | R: Portfolio → "Exchanges (read-only)"; the Showcase connects none (`out/m-exchanges.txt`). H: `ak-wealth` ("refreshes itself every 15 minutes"). **Gap:** not shown working end to end (it needs a connected, mocked exchange), and no browser test covers the refresh or "Last synced" (only the jsdom lib/allocation/wiring.test.ts). |
| 7.3 bills with push | Working | E+S: "+ Add a bill by hand" saved; `bills` restored identically (run4). Notifications list "Bills due". H: `ak-wealth`. T: E2E j03, j08. |
| 7.4 target mix and drift | Partly working | E: Wealth "TARGET MIX · YOUR OWN" and "Set a target mix" open (run3). H: `ak-wealth`. **Gap:** no browser test saves a target mix and reads the drift back (whats-new.spec only finds the words). |
| 7.5 purpose flow | Working | E: "PURPOSE · WHERE IT GOES" (`out/sc_app_wealth.txt:1108`). H: `ak-wealth`. T: E2E j03. |
| 7.6 contribution rhythm (pre-fill only) | Working | E: "Reminder on · turn off" on Wealth. H: `ak-wealth`. T: E2E j03, j03b, j03c. |
| 7.7 category and month budgets | Working | E+S: "Set a monthly budget" saved; restored identically (run4). H: `ak-wealth`. T: E2E j03 (rollover). |
| 8.8 export bridges (A16) | Partly working | E: Settings → Your data → "Save the file for Loop" downloads a HabitBull CSV (`out/loop.csv`). H: `ak-data`. **Gap:** no browser test of the bridge (U lib/export/bridges/loop.test.ts only). |
| 8.9 test restore, backup reminder | Working | E: Restore from an Export everything ZIP on a new profile (run4). "I saved a copy today" and "Turn the monthly reminder off" show (`out/sc_app_settings_data.txt`). H: `ak-data`. T: E2E j06 (Test a backup); U backup-reminder.test. |
| 8.10 AFL8 Checklist extras section | Partly working | **Gap (owner action):** this needs the private-sync redeploy and cannot run against this build without an account server. Help (`ak-data`) says so. T: scripts/run11/extras-two-device.test.mjs, extras-keyspace.test.mjs. |
| Part 9 Lichess Board play and daily puzzle | Working | E: Chess → "Open Play" → "Connect Lichess" (run13). H: `ak-chess`. T: E2E chess-play-ak.spec, j09 (game, resign, daily puzzle; Lichess routed). |
| 8.1 unified weekly Life review | Working | E: /app/review "YOUR WEEK, BY PILLAR · At a glance" (`out/s5-review-share.txt`), linked from Today and Help. T: E2E life-review-aa.spec. |
| 8.2 daily orbit card | Partly working | E: Customize Today → "Daily orbit" → the card renders (run7, `#orbit-card-title` count 1). H: `ak-review`. **Gap:** no test renders the card; showcase-today-aa.spec:65 only counts six chooser buttons (U orbit-card/summary.test.ts). |
| 8.3 weekly ZIGi insight | Partly working | E: "ZIGi's note on your week" in the review (`out/s5-review-share.txt`). H: `ak-review`. **Gap:** no browser test (U insight-notes). |
| 8.4 monthly balance note | Partly working | E: review "This month" → "A note on your balance · Nov 2026" (`out/s15-month.txt:47`). H: `ak-review`. **Gap:** no browser test. |
| 8.5 one share-card system | Working | E: review "Share as an image" → "Share your week" sheet, numbers off by default (`out/s5-review-share.txt`). T: E2E life-review-aa.spec. |
| 8.6 badges off by default | Working | E: Journey "Badges · Optional. Off…" (`out/sc_app_journey.txt:232`). H: `ak-review`. T: E2E journey.spec; U badges-setting.test. |
| 8.7 point-and-tell (A17) | Working | E: Settings switch → the "Point & tell" button shows (run10). H: `ak-data`. T: E2E point-tell.spec:22 ("the page never receives the pick"). |
| P10 #1 transaction rules | Working | E: "Rules (2)" panel opens; the imported "Music subscription" got its category from a rule (`out/m-tool-review.png`). T: E2E j03. H: `ak-money-tools`. |
| P10 #2 "does X affect Y?" (Compare) | Partly working | E: Health → Insights → "Compare: does one thing go with another?" (run8). H: `ak-days`. S: `comparePair` restorable. **Gap:** no browser test. |
| P10 #3 nutrition-label scan | Partly working | R: Foods & recipes → New food → "Read the label from a photo". Without an AI it says so honestly (`out/s10-label-scan.txt`). H: `ak-food`. **Gap:** no browser test, not even with a mocked AI (U lib/label-scan only). |
| P10 #4 top sources of a nutrient | Partly working | Same place and gap as 4.4: no browser test. |
| P10 #5 warm-up calculator | Partly working | E: tested end to end in j02 ("Warm-up" region). **Gap:** Help names the plate calculator but never the warm-up sets. |
| P10 #6 mood words | Partly working | E: "Feeling:" in the Journal compose (`out/sc_app_journal.txt:69`). H: `ak-days`. **Gaps:** no browser test, and the Journal is in neither the sidebar nor Search (see Cross-cutting). |
| P10 #7 weekly calorie budget | Partly working | E: Targets → "Weekly calorie budget (optional)" opens (run15). H: `ak-nutrition`. **Gap:** no browser test. |
| P10 #8 muscle freshness | Partly working | E: Workouts "Freshness (an estimate)" and "Recovery days per muscle group" (`out/health-view-workouts.txt:182,218`). H: workouts line. **Gap:** no browser test. |
| P10 #9 energy curve | Partly working | E: Sleep → "Your energy today: an estimate from your sleep" (run8). H: `ak-days`. **Gap:** no browser test opens it (U energy-curve render and curve tests). |
| P10 #10 review inbox | Working | E: "To review (3)" after an OFX import, with "Looks right" and "Make a rule" (`out/m-tool-review.png`). T: E2E j03. |
| P10 #11 buffer days | Working | E: the tile shows; T: E2E j03. Observation: after one imported USD spend of $42.10 in 30 days it says "9178 days" (`out/m-tool-sheet.png`). That is correct arithmetic, but the 14-day rule seems to count the span of the window, not days with spending. |
| P10 #12 financial-independence model | Partly working | E: Calculator → "Financial freedom" (`out/m-calcpanel-Financial_freedom.txt`). The calculator is linked from Wealth, Today and Earn. H: `ak-plan`. **Gap:** no browser test. |
| P10 #13 year in pixels | Partly working | E: Journal "Year: one square a day" (`out/sc_app_journal.txt:129`). H: `ak-days`. **Gaps:** no browser test, and the Journal is not in the sidebar or Search. |
| P10 #14 report for a visit | Partly working | E: Settings → Your data → "Make a report" opens the builder (run8). H: `ak-days`. **Gap:** no browser test. |
| P10 #15 Nutri-Score (off by default) | Working | E: "Food quality letter (Nutri-Score)" beside the lookup (`out/s10-eu.txt`). H: `ak-food`. T: E2E j02; U food-lookup-route. |
| P10 #16 export to Loop | Partly working | Same as 8.8: no browser test. |
| P10 #17 family emergency sheet | Partly working | E+S: "If something happens to me" → note saved; exported and restored identically (run4). H: `ak-money-tools`. **Gap:** no browser test (including the refusal to print key-like text). |
| P10 #18 fee drag | Partly working | E: Calculator → "What a yearly fee costs" (run3). H: `ak-plan`. **Gap:** no browser test. |
| P10 #19 rewards shelf | Partly working | E: Journey "Rewards shelf" with "Add to the shelf" and "Claim" (`out/s15-shelf.txt`). H: `ak-review`. **Gap:** no browser test. |
| P10 #20 diet templates | Partly working | E: Planner → "Start from a template (Mediterranean…" → "Add to this week" (run15). H: `ak-nutrition`. **Gap:** no browser test. |
| P10 #21 recurrence phrase box | Partly working | E: New habit → "Type the schedule in words" → "every other tue 7am" → "Use this schedule" saves `{kind:"interval",every:14,anchor:"2026-11-03"}` (run11). H: `ak-habits`. **Gap:** no browser test (U phrase-box.test.ts). |
| P10 #22 split an entry | Working | E: "Split an entry" opens (run3). T: E2E j03. H: `ak-money-tools`. |
| Part 12 ZIGi tools and Studio-4 preparation | Working | T: E2E j08 (every AK card is proposed, never auto-accepted for money); U lib/ai AK tests, G6, lib/zigi-studio4. H: `ak-zigi-more`. |

### A1–A22 (Built rows)

| Row | Status | Evidence / exact gap |
|---|---|---|
| A1 notification snapshot and action queue | Working | E2E j05 (Done, Snooze and Undo through the queue, with stubs); U lib/notify. It runs live only after the owner's push activation (Part 2). |
| A2 every push shows a notification | Working | E2E pwa-ak.spec:85 ("a push with no payload is composed here"); sw tests. |
| A3 one push path; subscription survives | Working | E2E pwa-ak.spec, j05, j06. |
| A4 caching rules; Erase clears caches | Working | Offline navigation (run10). E2E j06 and j06b (no ZIGoals cache after Erase). |
| A5 free-plan sizing | Working | A document (PUSH_PUBLIC_ALPHA.md); nothing to reach in the UI. |
| A6 storage headroom | Partly working | Same as the Part 3 row: no Help mention of the nearly-full line, and no browser test. |
| A7 wallet honesty | Working | Help `ak-wallets` matches WALLETS.md (read-only wallets, Keplr signs only through review). |
| A8 QR v1–20 | Working | U lib/qr encode and qr-code tests; the WalletConnect panel shows it (j07). |
| A9 Reown allowed domains | Partly working | The copy is built ("being switched on"). **Gap (owner action):** Reown must approve the domain before live pairing works. |
| A10 food binding deploy order | Working | A deploy script (check-deployment-configs prints the order); nothing in the UI. |
| A14 bank files | Working | The OFX end-to-end run above; E2E j03. |
| A15 importers | Working | Daylio end to end (run7); switch-more-ak.spec, j10. |
| A16 honest export bridges | Partly working | As 8.8: no browser test. |
| A17 point-and-tell never records visible text | Working | E2E point-tell.spec:22; U lib/point-tell. |
| A18 manifest screenshots, iOS startup images | Working | 4 screenshots and 9 apple-touch-startup-image links (run10); install-manifest.spec. |
| A19 first-run tour | Working | Today "Take the 1-minute tour" → "Stop 1 of 7" (`out/s10-tour.txt`); TourOffer also in Help. T: help-page.spec, whats-new.spec; U ak-tour.test. |
| A20 landing refresh (copy) | Working | landing/index.html (a separate static site, not part of the 3101 build) has the AK sections. T: scripts/landing-ak-claims.test.mjs. |
| A22 pacing and quality lines | Working | A document only (ADR-036 quality lines). |

### F0–F11

| Row | Status | Evidence / exact gap |
|---|---|---|
| F0 finish what is open | Partly working | "First Monday of the month": the habit editor's "Which Mondays" control (habit-editor.tsx:161); U habit-month-weekday tests; Help `ak-health-more`. Sync status: Help "Each row says when it last synced". **Gap:** the 6.5 cross-pillar progress toast (contribution-flow.tsx:35, lib/progress-toast/moved.ts) is in no Help answer and no browser test. |
| F1 release-readiness review | Working | docs/review/session-ak/RELEASE_REVIEW.md. The fixes have specs (goals-best-aa R1, onboarding); the fresh start shows no wallet or chain words (run1 nav, j01). R28 is left for the owner. |
| F2 full app testing (journeys) | Partly working | tests/journeys/j01–j11 exist and cover most of AK (see above). **Gap:** `@journey 7b` (Keplr Mobile signs a reviewed delegation) is still `test.fixme` (j07:144). |
| F3 competitor research round 2 | Working | A document (COMPETITORS_2.md). |
| F4 ZIGChain ecosystem, deeper (read-only) | Partly working | E: Ecosystem "What is this token?" / "Check a token"; Earn "Practice first" and validator spread wording (`out/sc_app_earn.txt:73,146`); Wealth "Staked ZIG and your Goals". The claims, unbonding calendar and rewards CSV need a stake, and none was shown here. **Gaps:** Help does not cover staking clarity (waiting to be claimed, unbonding calendar, rewards CSV), validator spread, the practice round or ecosystem status (only the token check and vote reminders); no browser test for the token check or staking clarity (U lib/zigchain-eco). |
| F5 new features | Partly working | Working end to end: supplements (saved, restored, run4), agenda + .ics (`out/agenda.ics`), Wrapped (`out/s10-wrapped.txt`), debt planner (Calculator and ZIGi, run13), savings challenges (goals-best-aa.spec), Your first week (showcase-today-aa.spec), Experiments and On this day show, search actions. All have Help (`ak-money-more`, `ak-health-more`, `ak-journal-more`, `ak-agenda`). **Gap:** no browser test for supplements, net-worth milestones, measurement trends and the photo-compare slider, On this day, Experiments, the debt planner or the .ics export. |
| F6 visual upgrade (helper part) | Working | Pillar art in empty states; U pillar-art.test.ts. |
| F7 landing visual refresh | Working | Static landing (owner deploys); scripts/landing-f7-visual.test.mjs. |
| F8 performance and accessibility | Working | docs/performance/SESSION_AK_F8.md. Earn hydrated in about 2.1 s here, with the Showcase (run13). |
| F9 ZIGi for everything new | Working | E: with no AI connected, "When will I be debt-free?" is answered on the device from the debt planner (`out/s13-zigi-debt.png`, "On your device · no AI"). T: E2E j08; U budget-ak.test, lib/ai. H: `ak-zigi-more`. |
| F10 security delta review | Working | A document (SESSION_AK_F10.md). |
| F11 Studio-4 preparation | Working | scripts/zigi/studio4-dry-run.test.mjs; STUDIO4_SWAP_RUNBOOK.md. |

Not audited: Part 0 and Research (documents outside Parts 1–12), "Already done", "Recorded" and "Open" rows, and the D rows. MUSIC repeats 1d.

## Counts

95 rows: **Working 52 · Partly working 43 · Not reachable 0 · Stub 0.**

Of the 43 Partly rows:
- **3 wait on an owner action, not a defect:** Part 2 push, 8.10 Checklist extras, A9 Reown domains.
- **31 have only one gap: no browser test on the UI path** (the feature itself works in the build): AFL9 (j07b fixme), 4.4, 4.7, 4.8, 5.1–5.4, 6.1, 6.3, 6.4, 7.2, 7.4, 8.2, 8.3, 8.4, 8.8, #2, #3, #4, #7, #8, #9, #12, #14, #16, #17, #18, #19, #20, #21, A16, F2 (j07b), F5.
- **9 have a Help or discoverability gap** (some also lack a browser test):
  - 1d and #6/#13: the Music and Journal pages are in neither the sidebar nor Search.
  - Help says nothing about: wake-time consistency (4.9), warm-up sets (#5), the storage nearly-full line (A6, twice), the 6.5 progress toast (F0), or F4's staking clarity, validator spread and practice round.

Smaller notes:
- The "Import spending and income" sheet shows its title twice: the sheet header and the panel's own h2 (`out/m-import-add.png`).
- The buffer-days figure is very large after a sparse import (#11, above).
