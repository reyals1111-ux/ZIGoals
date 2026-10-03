# Skipped tests: inventory

Supersedes [../verification/SKIPPED_PLAYWRIGHT_TESTS.md](../verification/SKIPPED_PLAYWRIGHT_TESTS.md) (17 Playwright skips at `7fdea68`; the CI #119 baseline at `a59bf03` recorded 17 Playwright and 6 unit skips).

**Source:** every skip call in the source on branch `chore/reliability-readiness-2026-09-29` (`main` at `5dd2ee7` plus Session B's changes, none of which adds or removes a skip call). The totals below come from the source; "Counts" records the measured runs.

Categories: **platform** (the behaviour does not exist on that project/viewport), **opt-in evidence** (a capture tool, not a gate), **env-gated** (skipped in `pnpm test`, run by a dedicated CI step), **real provider** (needs live third-party responses). No skip is a known bug, obsolete or unknown, and there is no `test.fixme`, `test.todo` or `.only`.

## Playwright (`apps/web/tests`, projects `desktop` and `mobile`)
| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| 1 | `primary actions catch one sweep of light on hover, give on press and keep their focus ring` (motion-polish.spec.ts:105; was :91) | project `mobile` | The hover sweep exists only for hover-capable pointers | platform | Keep. Desktop runs it. |
| 2–3 | ~~`the static logo stays when the intro clip fails` / `… is not ready in time` (motion-arrival.spec.ts:89)~~ | — | **Removed by #57 (`c1c0eca`).** The logo intro is no longer desktop only: `logo-fold.spec.ts` covers the sidebar, the narrow-tablet header and the phone top bar, and its failure cases run on both projects with no skip | — | Nothing to keep. |
| 4 | `forced colors: the navigation arrival sweep and pop are off` (a11y-motion-dialogs.spec.ts:40) | `isMobile` | The sidebar navigation is the desktop layout | platform | Keep. Desktop runs it. |
| 5 | `keyboard focus on the logo link is never covered by the intro clip` (a11y-motion-dialogs.spec.ts:57) | `isMobile` | Phones have no sidebar logo (reason updated by #57); `logo-fold.spec.ts:119` covers focus on the phone top bar Z | platform | Keep. Desktop runs it; mobile runs the top-bar case. |
| 6–13 | `visual product audit 1440 / 1024 / 390 / 320` (run9-1-visual.spec.ts:12), both projects | file-level, `RUN91_CAPTURE!=='1'` | Opt-in evidence capture with isolated fixtures; writes screenshots | opt-in evidence | Keep. It is a manual evidence tool, not a gate. |
| 14–21 | `final Showcase visuals 1440 / 1024 / 390 / 320` (run9-2-visual.spec.ts:5, plus a `project!=='desktop'` skip at :12, was :10), both projects | file-level, `RUN92_CAPTURE!=='1'` | Uses real public provider responses and writes into `docs/verification/run9-2` | opt-in evidence, real provider | **Never un-skip in CI.** |

**Playwright total: 21 skipped** = 5 platform + 16 opt-in captures. The 4 new platform skips since the 17-skip inventory (rows 2–5) came with the logo intro tests (#29, `db6aa5c`) and the accessibility specs (#40, `b27d705`).

## Vitest (`pnpm test`)
| # | Test (file:line) | Condition | Reason | Category | Where it runs |
|---|---|---|---|---|---|
| 1–2 | `two real browser profiles use encrypted account transport and persistent Worker (a-first / b-first reconnect)` (scripts/run10/account-browser.test.mjs:13) | `RUN10_BROWSER!=='1'` | Needs a running production server and Chrome | env-gated | CI `web integration`, "Independent browser account and market integration" |
| 3 | `late encrypted account A response cannot enter the actual signed-in B browser workspace` (scripts/run11/account-switch-browser.test.mjs:12) | `RUN10_BROWSER` | same | env-gated | same step |
| 4 | `own held upload plus a concurrent local finance write syncs normally on Sync now` (scripts/run11/sync-self-conflict-browser.test.mjs:14) | `RUN10_BROWSER` | same | env-gated | same step |
| 5–6 | `an edit during an in-flight upload syncs automatically without pausing`; `another device finance edit still pauses automatic sync for review` (scripts/run11/sync-inflight-edit-browser.test.mjs:43, :64) | `RUN10_BROWSER` | same | env-gated | same step |
| 7 | `Health consent ticked during email verification is kept or not yet offered` (scripts/run11/health-consent-verification-browser.test.mjs:13) | `RUN10_BROWSER` | same | env-gated | same step |
| 8–9 | `a refused Health consent is described by its refusal message`; `local-copy choices are labelled and say why they are unavailable` (scripts/run11/health-consent-a11y-browser.test.mjs:27, :38) | `RUN10_BROWSER` | same | env-gated | same step |
| 10 | `wealth browser consumes actual mixed-pair route evidence and retains Bitcoin through failed ZIG refresh` (scripts/run11/market-browser.test.mjs:14) | `RUN11_MARKET_BROWSER!=='1'` | same, plus a local market Worker | env-gated | same step |
| 11 | `full generated OpenNext artifact uses local named account, market and food services across restart` (scripts/run11/packaged-runtime.test.mjs:22) | `RUN11_PACKAGED!=='1'` | Needs the generated Alpha package (`build:alpha` plus `activation-check --dry-run`) | env-gated | CI `web integration`, "Full generated Run11 package and local service topology" |
| 12 | `all supported Goal controls work in the source preview before package generation` (scripts/run11/packaged-runtime.test.mjs:90) | `RUN11_GOAL_SOURCE!=='1'` | A deliberate pre-build check against a source preview (`RUN11_GOAL_ORIGIN`, default port 3113). All `/api/**` calls are answered by a fixture 503, so there are no providers | env-gated | CI `web integration`, "Independent browser account and market integration" (added by Session B; see below) |

**Vitest total in plain `pnpm test`: 12 skipped** (the CI #119 baseline at `a59bf03` had 6: rows 1–3, 10–12. The 6 added since are rows 4–9, the sync and Health-consent browser harnesses). All 12 are skipped only in plain `pnpm test`; the CI steps set their env flags and run them.

## Un-skip decisions
- None of the Playwright skips can be un-skipped. They are platform-specific or opt-in captures, and the captures would call live providers and write into the repo.
- Vitest 1–11 already run in CI. Removing the gate would make `pnpm test` depend on a running server and Chrome.
- Vitest 12 (`RUN11_GOAL_SOURCE`) was the only test no CI step ran. It passed 11 consecutive local runs against the production server (`RUN11_GOAL_ORIGIN=http://127.0.0.1:3101`, about 19 s each). Its `/api/**` calls are fixture-answered, so it needs no provider, secret, wallet or device. The CI integration step now sets `RUN11_GOAL_SOURCE=1` and `RUN11_GOAL_ORIGIN` and runs the file there. The packaged-artifact test in the same file stays gated by `RUN11_PACKAGED` and runs in its own step. The gate stays in plain `pnpm test`, because the test needs a running server.

## Counts
Measured locally on this branch: plain `pnpm test` reports 12 skipped (after removing a local, never-committed profiling copy of account-browser that added 2). A full local Playwright run (2 workers, production build) reports 21 skipped, exactly the rows above. Its 3 failures are the intro-video specs, which this sandbox Chromium cannot play; they pass in CI Chrome.

## Session E additions (2026-10-01, [PR #52](https://github.com/reyals1111-ux/ZIGoals/pull/52))
Two platform skips, one per new phone spec. Both skip only on the `desktop` project, because the landscape phone layout needs a coarse pointer and a desktop window of that size keeps its desktop layout; the `mobile` project runs both.

| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| E1 | `landscape phone: the strip folds into single rows and the title stays on the first screen` (phone-shell.spec.ts:60) | `!isMobile` | Landscape phone layout needs a coarse pointer | platform | Keep. Mobile runs it. |
| E2 | `landscape phone: no sideways scroll and the title on the first screen on every page` (phone-pages.spec.ts:67) | `!isMobile` | Same | platform | Keep. Mobile runs it. |

The full local Playwright run on `main` before Session E reported 34 skipped (Session D entry in docs/STATUS.md); with these two it reports 36. No existing skip changed.

## Session J additions (2026-10-01, branch `platform/session-j-2026-10-01`)

### Platform skip: CI Chrome-install script (non-Linux only)
`scripts/ci/install-chrome.test.mjs` (10 tests) runs `scripts/ci/install-chrome.sh`, which reads `/proc/locks` to find apt/dpkg lock holders. The suite is `describe.skipIf(process.platform!=='linux')`.

| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| J1–J10 | `CI Chrome install retries` (install-chrome.test.mjs:58) | not Linux | `/proc/locks` exists only on Linux | platform | Keep. CI (`ubuntu-24.04`, web checks) and every Linux checkout run all 10; on Linux, plain `pnpm test` gains 10 passed and no skip. |

### Expected failures (`test.fails`, known bugs)
These are not skips. Each test states the behaviour a planned fix must produce, and it fails today. Vitest runs each one and counts it on its own, as "N expected fail", next to "passed" and "skipped". So `pnpm test` stays green, and the skip totals above do not change. When the fix lands, the test passes, Vitest reports "Expect test to fail" and the run turns red. The fix PR then converts it to a plain `test`, which is the flip. Never re-add `.fails` to silence one.

| # | Test (file:line) | Today's failure (checked by converting to `test`) | Known bug | Fix PR action |
|---|---|---|---|---|
| X1 | `a finance edit made after a lost acknowledgement syncs without a false financial conflict` (scripts/run11/sync-lost-ack.test.ts:50) | "Conflicting financial changes…" | [ADR-006](../architecture/ADR-006-sync-lost-confirmation.md): the lost confirmation of the final sync upload | Convert to `test` with option A |
| X2 | `a first upload whose acknowledgement was lost does not read back as unlinked records` (scripts/run11/sync-lost-ack.test.ts:55) | "Unlinked local and cloud records differ…" | ADR-006 | Same |
| X3 | `a field edited again after a lost acknowledgement is a plain local change, not a field conflict` (scripts/run11/sync-lost-ack.test.ts:60) | "Conflicting settings field…" | ADR-006 | Same |
| X4 | `a finance edit after a lost acknowledgement syncs without a false conflict against the real sync Worker` (scripts/run11/sync-lost-ack-runtime.test.mjs:43, Miniflare) | "Conflicting financial changes…" | ADR-006 | Same |

**Guards:** 6 plain tests in the same two files, which pass today and must still pass after the fix:
- the reproduction's preconditions, in memory and against the real Worker, which answers the replay idempotently with `base+1`;
- identical content already syncs quietly (option C);
- another device's newer head is still a real conflict;
- a head write that never applied, overtaken by another device, clears without advancing the base;
- a journal key this build does not know is refused as damaged.

A `test.fails` whose setup broke would "pass" for the wrong reason; the precondition guards fail instead.

**Flip proof (local, never committed):** a throwaway option-A prototype in `cloud-sync.ts` turned X1–X4 red with "Expect test to fail". All 6 guards and the 19 tests in `apps/web/lib/vault/cloud-sync.test.ts` stayed green. The file was then restored.

## Session K update (2026-10-02, branch `quality/session-k-2026-10-02`)
Rows 1–5 and 14–21 above are corrected for #57: the logo intro is no longer desktop-only (rows 2–3 removed, row 5's reason updated), and two line numbers moved. #57 added the platform skips below; the older ones under them were never listed. Every one skips a test on the project whose layout does not have the behaviour; the other project runs it. Line numbers are on this branch before Session K's own changes.

### Added by #57 (Session I)
| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| K1–K2 | `the fold plays once per browser session over the static Z (<layout>) and settles exactly on it` (logo-fold.spec.ts:66, one per layout in its loop) | runtime: the browser decodes neither fold format | The failure tests in the same file cover the static fallback | platform (runtime) | Keep. CI Chrome and this sandbox's Chromium both decode a format, so it runs. |
| K3 | `keyboard focus on the phone top bar Z is never covered by the fold` (logo-fold.spec.ts:119) | `!isMobile` | The top bar Z exists on phones; the sidebar case is row 5 | platform | Keep. Mobile runs it. |
| K4–K5 | `changing pages crossfades the marks once…`; `figure and words never overlap the navigation, the horizon or the star…` (page-marks.spec.ts:64, :91; Session K Part 6 renamed the second and moved both) | `isMobile` | The sidebar planet and its marks are the desktop sidebar | platform | Keep. Desktop runs both. |
| K6–K7 | `phone: Today folds its secondary modules…`; `phone: Wealth folds its secondary modules…` (phone-folds.spec.ts:16, :40) | `!isMobile` | Phone layout only | platform | Keep. Mobile runs both. |
| K8 | `desktop: no module is folded and every one shows as before` (phone-folds.spec.ts:56) | `isMobile` | Desktop layout only | platform | Keep. Desktop runs it. |
| K9–K11 | `phone: the habit editor is a bottom sheet…`; `phone: Log a meal opens… as a sheet…`; `phone: Staking opens the wallet reader and the reward scenario as sheets` (phone-form-sheets.spec.ts:23, :50, :64) | `!isMobile` | Phone sheets only | platform | Keep. Mobile runs all three. |
| K12 | `desktop: the forms stay in the page, no sheet opens` (phone-form-sheets.spec.ts:83) | `isMobile` | Desktop layout only | platform | Keep. Desktop runs it. |
| K13 | `phone: fields are 16 px and every control is at least 44 px tall` (portfolio.spec.ts:95) | `!isMobile` | Phone layout only | platform | Keep. Mobile runs it. |

### Older, never listed until now
| # | Test (file:line) | Condition | Reason | Category | From |
|---|---|---|---|---|---|
| K14 | `the sidebar shows the page mark above the planet, and no longer a Shape & Fold tagline` (ui-design-pass.spec.ts:66) | `isMobile` | The mobile header hides the sidebar planet | platform | Session A (#47), title updated by #57 |
| K15 | `dragging a Goal card with the mouse reorders the collection` (ui-design-pass.spec.ts:208) | `isMobile` | Mouse drag | platform | Session A |
| K16 | `touch: a long-press on the handle picks a card up and moves it` (ui-design-pass.spec.ts:235) | `!isMobile` | Touch only | platform | Session A |
| K17–K18 | `hovering lifts a Goal card and a habit calendar tile…`; `list rows get a rounded glass pill…` (ui-design-pass.spec.ts:264, :283) | `isMobile` | Hover needs a fine pointer | platform | Session A |
| K19 | `keyboard focus gives the same lift with the focus ring` (ui-design-pass.spec.ts:303) | `isMobile` | Keyboard check on desktop | platform | Session A |
| K20–K21 | `<setting>: hover never moves anything; a static highlight only` (ui-design-pass.spec.ts:314, one per setting in its loop) | `isMobile` | Hover needs a fine pointer | platform | Session A |
| K22 | `touch gets press feedback only, never a hover lift` (ui-design-pass.spec.ts:324) | `!isMobile` | Touch only | platform | Session A |
| K23–K24 | `hover intent: a pointer that presses straight away never lifts the tile…`; `long sections and typing stay still; the sidebar star is a plain layer` (ui-design-pass.spec.ts:332, :344) | `isMobile` | Hover needs a fine pointer | platform | Session A |
| K25–K26 | `<setting>: hover and a mouse drag move nothing on their own…` (ui-evidence.spec.ts:30, one per setting in its loop: reduced motion and Motion Off) | `isMobile` | Hover and mouse drag need a fine pointer; its keyboard flow covers phones | platform | Session A |
| K27–K28 | ~~`the equation reveals its four steps in scroll order`; `reduced motion settles the equation on all four steps without scrolling` (landing.spec.ts:138, :224)~~ | — | **Removed by Landing V5 (Session N, [#61](https://github.com/reyals1111-ux/ZIGoals/pull/61)).** The equation now steps one word per viewport on phones too, so both tests (now `landing.spec.ts:140`, `:193`) run in both projects with no skip | — | Session A; struck by Session N |

**Expected totals from the source** (a full local run measures them; see the Session K entry in [STATUS](../STATUS.md)):
- **desktop project:** 19 skipped;
- **mobile project:** 28 skipped;
- **both projects:** 47, including the 16 opt-in captures (rows 6–21). The full local run of Session K's final build counted 47 skipped (Session K, Part 9: K25 first listed one test where its loop makes two).

The runtime row K1–K2 is not counted, because both browsers decode a fold format. No skip is a known bug, obsolete or unknown, and there is still no `test.fixme`, `test.todo` or `.only`.

## Session L additions (2026-10-02, [PR #59](https://github.com/reyals1111-ux/ZIGoals/pull/59))
The Stage 8 rehearsals in `scripts/run11/stage8-rehearsal/` drive real Chrome against a production server, with fixture sign-in and the real Workers in Miniflare. Like rows 1–9 above, each is skipped in plain `pnpm test` and runs in CI `web integration`, "Independent browser account and market integration". That step sets `RUN10_BROWSER=1` and lists the six files. `sign-in-codes.test.mjs` and `reconcile-mode.test.mjs` in the same folder are not gated; they run in plain `pnpm test`.

| # | Test (file:line) | Condition | Reason | Category | Where it runs |
|---|---|---|---|---|---|
| L1 | `the sign-in panel refuses wrong, expired and reused codes without a session, and a second code only after the cooldown` (scripts/run11/stage8-rehearsal/sign-in-codes-browser.test.mjs:8) | `RUN10_BROWSER!=='1'` | Needs a running production server and Chrome | env-gated | CI `web integration`, "Independent browser account and market integration" |
| L2 | `locking hides account records until unlocked, and a second account sees none of the first account's records` (lock-switch-browser.test.mjs:8) | `RUN10_BROWSER` | same | env-gated | same step |
| L3 | `Health is uploaded only after consent, and another device receives it only after its own consent` (health-consent-cloud-browser.test.mjs:8) | `RUN10_BROWSER` | same | env-gated | same step |
| L4–L5 | `a reload while the head write's acknowledgement is held replays the funding and its correction exactly once`; `a dropped acknowledgement of the first write and a retry replay the funding and its correction exactly once` (replay-browser.test.mjs:92, :93) | `RUN10_BROWSER` | same | env-gated | same step |
| L6–L7 | `C1: a refused camera permission is explained and manual entry still logs a food`; `C2: cancelling a scan stops the camera and leaves the saved Health log unchanged` (camera-browser.test.mjs:22, :47) | `RUN10_BROWSER` | same (the camera is a stand-in in the page) | env-gated | same step |
| L8 | `the offer turns sync on through the existing controls; Goals, Habits and Today sync, Health only after each device's own consent…` (sync-offer-browser.test.mjs:13) | `RUN10_BROWSER` | same | env-gated | same step |

**Also gated, from #58 (Session K) and not listed until now:** two sync-race tests in `scripts/run11/sync-inflight-edit-browser.test.mjs`. They extend rows 5–6 above, run in the same step, and are gated by `RUN10_BROWSER`:
- `a review asked for just as an automatic sync starts opens when that sync ends` (:90);
- `an automatic sync scheduled before a review began does not run during the review` (:109).

**Vitest total in plain `pnpm test`: 22 skipped.** That is rows 1–12 (12 tests), the 2 #58 tests above, and L1–L8. Measured on Session L's branch after merging `main` `f3220e1`: 2,172 passed, 4 expected to fail (X1–X4) and 22 skipped. Every one runs in a CI step that sets its flag. The Playwright totals above are unchanged: Session L adds no Playwright skip.

## Session N additions (2026-10-02/03, Landing V5, [PR #61](https://github.com/reyals1111-ux/ZIGoals/pull/61))
Row K27–K28 above is struck: both equation tests in `landing.spec.ts` now run on phones as well. The new landing specs skip only where a check belongs to one project or needs an opt-in:

| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| N1 | `each viewport of scrolling adds exactly one equation word at <size>` (landing-v5-equation.spec.ts:42, one per size in its loop) | project not the size's project | Each viewport size runs in the project that matches it (1440 px desktop; 390, 375 and 320 px mobile) | platform | Keep. Every size runs once. |
| N2 | the four tests in `the fold maths and frame files` (landing-v5-fold.spec.ts:39, :67, :90, :113) | project not `desktop` | Pure maths and file reads give the same answer in both projects | platform | Keep. Desktop runs them. |
| N3 | `no horizontal overflow at <width> px, moving and static` (landing-v5-layout.spec.ts:38, one per width in its loop) | project not the width's project | Widths under 700 px run in `mobile`, the rest in `desktop` | platform | Keep. Every width runs once. |
| N4 | `text is at least 14 px (15 px for body copy) and targets at least 44 px at <width> px` (landing-v5-layout.spec.ts:78, one per width in its loop) | project not the width's project | Same split as N3 | platform | Keep. Every width runs once. |
| N5 | `Tab reaches the invite first after the header, and every focused control shows a visible focus ring` (landing-v5-a11y.spec.ts:36) | project not `desktop` | Phones open the menu instead; the outline and contrast tests run in both projects | platform | Keep. Desktop runs it. |
| N6 | the two tests in `files` (landing-v5-security.spec.ts:22, :27) | project not `desktop` | File reads give the same answer in both projects | platform | Keep. Desktop runs them. |
| N7 | `LCP and long tasks on a mid-range phone and on desktop (LANDING_PERF=1)` (landing-v5-perf.spec.ts:113) | `LANDING_PERF` unset | Machine-dependent; the measured numbers are in `docs/verification/landing-v5/README.md` | opt-in | Keep. Run with `LANDING_PERF=1`. |
| N8 | `refresh the landing's product captures from the Showcase` (landing-v5-captures.spec.ts:140) | `LANDING_CAPTURE!=='1'`; project not `desktop` | Evidence capture against a production build of `main`, run once | opt-in | Keep. Run with `LANDING_CAPTURE=1`. |

**Expected totals from the source, with Session N** (the full local run is in the Session N (PR 1) entry in [STATUS](../STATUS.md)):
- **desktop project:** 31 skipped: the 19 above, plus N1 3, N3 5, N4 2, N7 1 and N8 1;
- **mobile project:** 43 skipped: the 28 above, minus K27–K28, plus N1 1, N2 4, N3 5, N4 2, N5 1, N6 2, N7 1 and N8 1;
- **both projects:** 74. There is still no `test.fixme`, `test.todo` or `.only`.

## Session N additions: timezone phase 1 (2026-10-02, branch `time/session-n-2026-10-02`)
### Expected failures (`test.fails`, the decided timezone behaviour)
These are not bugs in today's code. Each states behaviour the owner decided (TIMEZONE_DESIGN.md: T1–T4) that later phases deliver. Funding and plan days follow the plan's own zone, and today they are UTC (QA-04, unchanged by owner decision). They count as "expected fail", like X1–X4. When a phase delivers the behaviour, the run turns red with "Expect test to fail". That phase converts its rows to plain tests and updates the matching guard. Never re-add `.fails` to silence one.

| # | Test (file) | Today's failure (checked by converting to `test`) | Flips in | Flip PR action |
|---|---|---|---|---|
| Z1 | `Z1 America/New_York, 21:30 on the due day` (apps/web/lib/goal-intelligence.timezone.test.ts) | "expected 'REVIEW' not to be 'REVIEW'": today's strict `contributionSchema` refuses `timeZone`, so funding health falls back to review | phase 3 (R1 reads `plan.timeZone`) | Convert Z1–Z13 to `test`, and update guard G1 |
| Z2 | `Z2 Pacific/Kiritimati (UTC+14), 00:05 on the due day` (same file) | same | phase 3 | same |
| Z3 | `Z3 Etc/GMT+12 (UTC-12), 23:55 on the due day` | same | phase 3 | same |
| Z4 | `Z4 Europe/Brussels, 00:30 on the spring-forward day` (DST gap, 2026-03-29) | same | phase 3 | same |
| Z5 | `Z5 Europe/Brussels, 00:30 on the fall-back day` (DST overlap, 2026-10-25) | same | phase 3 | same |
| Z6 | `Z6 America/Santiago, 23:59:59 just before the skipped midnight` (2026-09-06) | same | phase 3 | same |
| Z7 | `Z7 America/Santiago, 23:30 on the 23-hour day` | same | phase 3 | same |
| Z8 | `Z8 Asia/Kolkata (UTC+5:30)` | same | phase 3 | same |
| Z9 | `Z9 Asia/Kathmandu (UTC+5:45)` | same | phase 3 | same |
| Z10 | `Z10 Pacific/Chatham (UTC+13:45 in summer)` | same | phase 3 | same |
| Z11 | `Z11 Australia/Lord_Howe (UTC+11, 30-minute DST)` | same | phase 3 | same |
| Z12 | `Z12 Australia/Adelaide (UTC+10:30 in summer)` | same | phase 3 | same |
| Z13 | `Z13 travel: a Brussels plan keeps Brussels days on a <device> device`, two devices (America/Los_Angeles, Asia/Tokyo) | same | phase 3 | same |
| Z14 | `Z14 the earliest change is the next day in the plan's zone` (apps/web/lib/plan-revisions.timezone.test.ts) | "expected '2026-10-17' to be '2026-10-16'": today's earliest change is the next UTC day | phase 3 | Convert to `test`, and update guard G2 |
| Z15 | `Z15 a zone change starts the next day in the old zone and keeps earlier instalments` (same file) | `ZodError` (unrecognized key `timeZone`): today's `reviseGoalPlan` refuses a zone | phase 3 | Convert to `test`, and update guard G3 |
| Z16 | `Z16 a new plan defaults to the journal zone, else UTC` (same file) | "expected undefined to be 'Europe/Brussels'": no default exists yet (T1) | phase 4 (R2 adds the default and the UI) | Convert to `test`, and update guard G4 |

**Guards:** plain tests in the same two files that pass today and pin each failure's reason. Like the X-row guards, they make sure a broken fixture can never let an expected failure "pass" for the wrong reason:
- **G1:** `contributionSchema` refuses `timeZone`, and a zoned plan's funding health is `REVIEW` with "Plan requires a compatible price assumption.". The zone-less twin of every Z1–Z13 instant shows today's UTC answer.
- **G2:** the earliest change for a zoned plan is the next UTC day.
- **G3:** `reviseGoalPlan` throws on a plan carrying `timeZone`.
- **G4:** `plan-revisions` exports no `defaultPlanTimeZone`.

**Regression locks (plain tests, green today and after phase 2):**
- 3 + 3 tests per device zone, under 11 device zones (66 runs).
- The zones: UTC, Brussels, New York, Kiritimati, Etc/GMT+12, Kolkata, Kathmandu, Adelaide, Chatham, Lord Howe and Santiago.
- What they lock: funding health around a UTC midnight and at QA-04's 21:30 New York; one capture per UTC day; scenario horizons and scheduled dates; plan effective days; the earliest change; instalment dates across DST ends and Santiago's skipped midnight.

**Flip proof (local, never committed).** A throwaway prototype read the plan's zone (`timeZone` allowed in `contributionSchema`, and `fundingHealth`'s today taken from `zonedDate(now, plan.timeZone ?? "UTC")`).
- Z1–Z13 all turned red with "Expect test to fail". Guard G1 failed as intended, and all 33 locks and the zone-less twin stayed green.
- Both files were then restored (`git checkout`).

**Counts:** plain `pnpm test` gains 17 expected failures (Z1–Z12, Z13 twice, Z14–Z16): 4 + 17 = 21 expected to fail. The skip totals are unchanged. Measured after merging `main` `307a71b` (#60, #63): 2,303 passed, 21 expected to fail, 24 skipped (#63's MB1 and MB2 below included).

## Session M additions, PR B (2026-10-02, [PR #63](https://github.com/reyals1111-ux/ZIGoals/pull/63))

| # | Test (file:line) | Condition | Reason | Category | Where it runs |
|---|---|---|---|---|---|
| MB1 | `a remembered device reopens after a reload, in a new tab and after 15 idle minutes, until Forget or Lock now` (scripts/run11/stage8-rehearsal/remember-device-browser.test.mjs:34) | `RUN10_BROWSER!=='1'` | Needs a running production server, Chrome and the private-sync Worker in Miniflare, like the other rehearsal files | env-gated | CI web integration ("Independent browser account and market integration") |
| MB2 | `rotation on another device, sign-out and another account invalidate it; old material never opens the newer epoch` (remember-device-browser.test.mjs:69) | `RUN10_BROWSER` | same | env-gated | same step |

**Vitest total in plain `pnpm test` on this branch: 24 skipped**, the 22 listed above plus MB1 and MB2. Measured after merging `main` `4d151c7` (#60): 2,222 passed, 4 expected to fail. No Playwright skip was added: `tests/remember-device.spec.ts` runs on both projects.

## Session M additions, PR A (2026-10-02, [PR #60](https://github.com/reyals1111-ux/ZIGoals/pull/60))

| # | Test (file:line) | Condition | Reason | Category | Where it runs |
|---|---|---|---|---|---|
| MA1–MA2 | `QA2-07: every standalone tap target on the main phone pages is at least 44 × 44 px` (apps/web/tests/phone-touch-targets.spec.ts:40); `QA2-07: the title links reach 44 px without moving anything` (:52) | `viewport.width > 767` (file-level `test.skip`) | Phone-only CSS: on the `desktop` project the layout is the desktop one, which the freeze check covers instead | project-scoped | Playwright `mobile` project (CI browser shards) |

**Playwright:** the `desktop` project skips these 2 tests; the `mobile` project runs them. No Vitest skip was added.
