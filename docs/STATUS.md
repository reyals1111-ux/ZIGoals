# UI design pass (Session A) — 2026-09-30, PR #47 (open; not merged or deployed)

Evidence labels: **local** = this session's cloud checkout (Node 24.19.0, production build `PUBLIC_ALPHA_UNDEPLOYED`, Chromium via the `chrome` channel); **CI** = Milestone quality on the PR head; **dev** = `next dev` only. Baseline: main `5dd2ee7` (Alpha deploy #12 is recorded by Session B, not here).

**Parts** (branch `ui/design-pass-2026-09-29`, [PR #47](https://github.com/reyals1111-ux/ZIGoals/pull/47)):
1. `b036d12` Readability and headers: shared text tokens (`components/design-system.css`), one `PageHeader` system, Goals "+ Create a goal" at the far right, sidebar signature "Shape & Fold" / "Your Own Future" with a star, Habits actions beside the orbit and the journal timezone at the bottom. Also fixes a pre-existing hydration warning on Habits/Health (PageArrival marked nodes before hydration).
2. `9c68600`, `67a05e1` Drag-and-drop layouts on Today, Goals, Habits, Health, Wealth, Markets, Stake/Positions and Activity (unlock → drag handle or Move buttons → Done/Reset; touch after a long-press). **TIER 3 (new persistence key).**
3. `7799ba2`, `e572385` Liquid-glass hover/press/focus lift: one delegated handler, one shared overlay, transform/opacity only, static under reduced motion / Motion Off / forced colours.
4. `f05d06c` Health gradient titles; `3680569` quick exercise counters (Push-ups, Pull-ups, Squats by default; up to 6; 8 original icons). **TIER 3 (Health data format).**
5. `c91f169` Wealth single-total headline in one currency; other currencies on their own line, "not converted"; no FX.
6. `c084b9c`, `3f13854` Journey banner in the orbit theme; the Alpha truths stay visible.
7. `f1bb8bb` Six new Today widget choices (next Goal milestone, best streak, week check-ins, top holding share, exercise counters, calories and macros) and a clearer Customize menu. **TIER 3 (settings data format).**
8. `f5e1ea4` A closing section on each page (week across areas, milestones, weekday consistency, 7-day Health trends, allocation and coverage, how values are sourced, where data lives).
9. `4187724`, `a8a4e89`, `c0cf409`, `8b3abc0`, `0e5ee0f` Quality sweep: performance fixes found through CI (below); `button.text-link` without the browser's grey button face (pre-existing, 3.6:1); Ecosystem labels at 14px; the Part 2 tests updated for Part 8's new sections. Sweep (local, production build, Showcase): every app page at 1440×900, 1920×1080, 1280×800 and 390×844 with no document overflow and no console errors beyond the offline market fixture; Motion Off and reduced motion leave no running animation; Tab through each page shows a focus ring at every stop; forced colours load cleanly.

**Layout key `zigoals:layout:v1`** (TIER 3): per device in browser storage (Showcase: the tab's session storage). Stores page, region and card IDs and their order only; Goal/Habit/holding cards use hashed IDs, so no names or keys are written. Not synced and not in backups. Corrupt or oversized data falls back to the default layout; unknown IDs are ignored; new cards appear in their default spot. Today's main column and rail keep using the existing synced Today placement in `zigoals:settings:v1` (no format change; new `resetDashboardPlacement`). Rollback: delete the key or use Reset this page; older builds ignore it.

**Health data change** (TIER 3): optional `exercise: {version: 1, counters: [{id, name, icon}] (≤6), days: [{id, counterId, date, count}]}` on the strict Health schema. Health without it reads byte-identically, and nothing is written before the first tap. Records carry IDs, so the existing generic sync merge combines them; the same day edited on two devices surfaces as the existing conflict review. No change to the sync protocol, encryption or backup format version. **Older builds (deploy #12) cannot read Health data that contains `exercise`:** they show "Private data could not be read" for Health and refuse such a backup, keeping existing data. Deleting counters does not remove the group; rolling back needs an older backup. Known gap (vault code, off-limits): the backup preview's record counts do not include counter days.

**Settings data change** (TIER 3): new widget kinds `milestone`, `streak`, `checkins`, `holding-share`, `exercise` and the Health metric `macros-ring` in `zigoals:settings:v1` (synced, backed up). Presets and existing widgets are unchanged. **Older builds cannot read a settings record that contains a new widget:** Today settings show "Private data could not be read" there until the widget is removed in a newer build or an older backup is restored. See **Compatibility and rollback** below: it also hides the Alpha top bar and the Local simulation strip on every page.

**Performance** (local, production builds, same machine): Part 3 slowed `scripts/run10/account-browser` by about 8 s (bisect: main 70.6/70.5 s, Part 2 68.7/67.3 s, Part 3 77.6/78.1 s). A Chrome timeline traced most of it to the display compositor. Fixed in `4187724` (no blend mode or filled animation on the sidebar star, idle glass overlay hidden, sections taller than 1.25 screens never lift, typing never lifts its card, PageArrival reads mutations once per frame) and `c0cf409` (hover intent: an element lifts after the pointer rests 70 ms; a press cancels a pending lift). After: 71.6/71.1 s against 70.6/70.5 s on main. Hover trace earlier (dev): 0 long tasks, frame p50/p95/max 16.7/16.8/16.8 ms over 732 pointer moves.

**Tests** (counts are per run; they overlap and are not summed):
- Unit (local, Node 24.19.0, `c0cf409`): 186 files passed, 8 skipped; 1686 tests passed, 12 skipped. New: `page-layout`, `health-counters`, `wealth-total`, `dashboard-widgets-design-pass`, `bottom-insights` and one `dashboard-settings` test.
- Playwright full suite (local, production build of `a8a4e89`, desktop + mobile, 2 workers): 531 passed, 31 skipped, 4 failed. Two are the intro-video test (desktop, mobile), which needs H.264 and fails only in this sandbox's Chromium. `wealth.spec.ts:23` (desktop, a click that never completed) and `run10-widgets.spec.ts:20` (mobile, 45 s timeout) then passed 12/12 alone and in CI.
- Playwright on `c0cf409` (local): ui-design-pass, motion-polish, goal-choice-controls and brand-nav-polish, 75 passed; the new hover-intent check 3/3.
- New spec `tests/ui-design-pass.spec.ts` covers Parts 1–9. Updated with reasons in their commits: `logo-quickadd-goals-header` (Create at the far right), `brand-nav-polish` (tagline above the planet), `motion-arrival` (sub-pixel layout measurement).
- CI on `a8a4e89`: web checks, all three browser shards, contract and canonical reproducibility passed; web integration failed only on account-browser a-first (below), also on its one re-run.
- CI on `9383f15` (after hover intent): **web integration passed**, including account-browser in both orders; web checks, shards 1 and 3, contract and reproducibility passed. Shard 2 failed only the new hover-intent check, which was timing-dependent on the runner and is made deterministic in the next commit.
- **CI on `0e5ee0f`: all green** (Milestone quality: web checks, web integration including account-browser in both orders, all three browser shards, contract; canonical reproducibility).
- Unit (local, Node 24.19.0, `dc667f3`): 187 files passed, 8 skipped; 1690 tests passed, 12 skipped (new: `deploy12-compat`).
- Playwright full suite (local, production build of `dc667f3`, desktop + mobile, 2 workers): 552 passed, 33 skipped, 3 failed.
  - The intro-video test (desktop, mobile) needs H.264 and fails only in this sandbox's Chromium.
  - `run10-widgets.spec.ts:20` (mobile) hit its 45 s budget in the six-width loop, then passed 3/3 alone.
- **CI on `dc667f3`: all green** (web checks, web integration, all three browser shards, contract, canonical reproducibility). The two red "web" roll-ups on `86633a6` and `99b5cc3` were browser suites cancelled by the next push.

**Known CI intermittents on this PR:** `account-browser` 90 s timeouts on `67a05e1`, `f1bb8bb`, `f5e1ea4` (a-first and b-first), then a-first only on `4187724` and `a8a4e89` (re-run once, failed again); passed on `9383f15` and `0e5ee0f` after the hover-intent change. The root-cause fix (`8ca0e03`, #46) is still worth merging: without it this test has little margin on main too. The fix is Session B's `8ca0e03` (run the integration files one at a time, `.github/workflows/ci.yml`), which this PR may not touch; it takes effect once #46 merges. `run11-route-mobile-acceptance` (desktop) hit its 45 s budget once on `f1bb8bb`; locally it takes 24.6–26.0 s on this branch and 23.0–25.0 s on main.

**Not done / skipped:** half/full width toggle (only Today's existing compact/wide sizes); Ecosystem is a filtered directory, not a card layout, so it stays fixed; Markets catalog cards are not reorderable (they follow the catalog filter); backup preview counts for counter days (vault, off-limits).

**Follow-up (Parts 10–14, same PR):**
10. `86633a6` Compatibility and data-safety analysis for the counters and widgets, with a rollback guard test (below).
11. `3369799` Test hygiene: the one unjustified skip now runs (below).
12. `5f2c813`, `ebdf693` Evidence checks and a performance trace (below).
13. `8f81c17`, `4b22a9f`, `99b5cc3`, `dc667f3` Polish fixes (below).
14. Review gallery: [PR #47 comment](https://github.com/reyals1111-ux/ZIGoals/pull/47#issuecomment-5906382196). It has 53 WebP images (≤206 KB each) on branch `review/pr47-screenshots`, which is not for merging: every main page at 1440×900 and 390×844, before (`5dd2ee7`) and after (`dc667f3`), plus close-ups. Showcase data only.

**Compatibility and rollback** (Part 10, `86633a6`; evidence: code reading of 5dd2ee7 = deploy #12, a local cross-version unit check importing 5dd2ee7's own modules, and a local browser run with both production builds on one origin)

What changed in stored data:
- Health (`zigoals:health:v1`, schemaVersion 1, unchanged): one optional top-level field `exercise {version:1, counters ≤6, days}`, written only by a counter change (tap, add, rename, icon, delete). Records carry IDs and join the Health-wide unique-ID check.
- Today settings (`zigoals:settings:v1`, schemaVersion 1, unchanged): five widget kinds (`milestone`, `streak`, `checkins`, `holding-share`, `exercise`) and one Health metric (`macros-ring`), written only when such a widget is saved.
- New device-only key `zigoals:layout:v1` (never synced, never in backups; deploy #12 ignores it).
- Unchanged: the backup format (`zigoals-encrypted-backup` version 1/2), the sync protocol and envelope, the vault, `use-private-store`, `private-storage`, workers and packages (no diff against 5dd2ee7).

Who is affected by a rollback to deploy #12:
- Nobody who never tapped a counter and never saved one of the new widgets: their records keep exactly deploy #12's fields (guarded by `lib/deploy12-compat.test.ts`; confirmed against 5dd2ee7's own schemas). The layout key is ignored.
- Someone who used a counter: deploy #12 shows "Private data could not be read. It has not been changed." on Health (the whole Health page is unavailable) and a Health notice on Today. Goals, Habits, Wealth and the Alpha banners are unaffected (browser run).
- Someone who saved a new widget: deploy #12 cannot read Today settings. Today shows the read error and "Your saved layout needs recovery in Settings"; Pin to Today is disabled everywhere; encrypted backup creation is refused while a store is unreadable; and — because deploy #12's Shell shows the "ZIGChain testnet · Public Alpha" top bar and the Local simulation / demo balance strip only when Today settings read — those honesty labels disappear on every page (browser run: 0 of 1 on Today, Goals, Habits, Health, Wealth). Today settings are one store of their own (`zigoals:settings:v1`); they do not share a store with Goals or Positions (`zigoals:platform:v1`).
- Account sync on deploy #12 (code reading): each sync validates every captured domain before and after the merge (`captureData` → `validateData`, `synchronize(..., validateData)`). Once the cloud copy (Health with consent, or settings) contains the new data, a deploy #12 device's sync stops with an error for all domains; nothing is uploaded or applied, its local edits stay local and pending, and nothing in the cloud is overwritten.

Data-loss paths in deploy #12 (none silent):
- Normal edits: `updatePrivateStore` and `updateDurableStore` re-read the stored record under the cross-tab lock and parse it strictly before calling the edit; a record with the new data fails the parse, so the edit throws and nothing is written ("Could not save private data. Nothing was applied."). `enableDurableStore` (sync migration) parses strictly too.
- Schemas are strict (`z.strictObject` for Health, `.strict()` plus an enum for widgets), so unknown fields are refused, never stripped and re-saved without them.
- Stale tab (browser run): a deploy #12 Health/Today tab left open while a new-build tab tapped a counter and saved a widget refreshes on the cross-tab events, shows the read error and hides its forms; its save attempt changed nothing (Health and settings bytes identical before and after). No page errors.
- Explicit replacement only: restoring an older module backup in deploy #12 replaces the store but keeps the newer record as a recovery copy (`<key>:recovery:<uuid>`, or the durable store's recovery copy); counters and widgets would then only be in that copy.
- No deploy #12 code writes or removes the Health or settings keys outside those paths.

Recovery: deploy forward. The new build reads everything back (browser run: counter value and widgets intact after the rollback visits). Before a planned rollback, removing new widgets (Customize Today → the widget → Remove widget) makes Today settings readable again; counters cannot be removed that way (deleting counters keeps the group), so Health stays unreadable in deploy #12 until forward. Stale-tab risk: an old tab cannot damage data, but a new-build tab left open after a rollback can keep writing counters/widgets.

**Test hygiene** (Part 11, `3369799`)
- **Skips.** Full suite on `dc667f3` (local): 33 skipped against 21 on main. All 12 added skips are platform checks (conditional `test.skip` on the project); none skips a test outright.
  - Count history: 31 at `a8a4e89`, then 32 with the hover-intent check, 31 after the fix below, and 33 with two `ui-evidence` skips.
  - `tests/ui-design-pass.spec.ts` (10):
    - Hover with a fine pointer, skipped on mobile (5): Goal card and tile lift, reduced motion, Motion Off, hover intent, long sections.
    - Keyboard-focus lift, skipped on mobile; the lift CSS applies to fine pointers only (1).
    - Mouse drag, skipped on mobile; the touch long-press test covers phones (1).
    - Sidebar signature, skipped on mobile, where the sidebar planet is hidden (1).
    - Two touch-only checks, skipped on desktop (2).
  - `tests/ui-evidence.spec.ts` (2): hover and mouse drag under reduced motion and Motion Off, skipped on mobile; the keyboard layout flow covers phones.
  - Unjustified, fixed in `3369799`: the Habits header check skipped the whole mobile project, though only its side-by-side placement and first-view budget are desktop facts. It now runs on mobile.
- Existing tests modified by this PR (each in its commit message; none weakened):
  - `logo-quickadd-goals-header` (Part 1): "+ Create a goal" moved from right after the title to the far right of the title row at the owner's request; now asserted within 2px of the row's right edge (was: within 32px of the title), still right of the title and vertically centred within 8px.
  - `brand-nav-polish` (Part 1): assertions added only (tagline above the planet, new text, star aria-hidden).
  - `motion-arrival` (Part 1): layout equality now uses sub-pixel boxes with transforms neutralised for one synchronous read (was integer offsetLeft/offsetTop sums that round per offsetParent level); still exact equality, at 0.01px instead of 1px.
  - `tests/ui-design-pass.spec.ts` Part 2 layout tests (4187724): expected order now includes Part 8's new last section (`habits:rhythm`, "position 2 of 4", `health:trends`).
  - `lib/dashboard-settings.test.ts`: one test added; existing tests unchanged.

**Evidence** (Part 12, `5f2c813`, `ebdf693`; local production build)
- `tests/ui-evidence.spec.ts` (desktop + mobile): reduced motion and Motion Off (no sweep, entrance or arrival on any main page; hover and a mouse drag run no motion), forced colours (every main page renders; the first 14 Tab stops each show a real outline), keyboard-only layout flow on Health and Wealth (unlock → move → announcement → reset → lock), no hydration or page errors on any main page (client navigation and cold load), no horizontal overflow at 390px. Local on `dc667f3`: 18 passed, 2 platform skips (this includes the Part 13 toolbar check).
- Found and fixed: Motion Off did not stop three older card hover lifts from main (Goal cards on dashboards, watch cards, owned-asset cards); layout move buttons ran empty background-position transitions.
- Performance (1,098 pointer moves over 18 sweeps, 1440×900, Showcase): 30-day habit calendar main 0.75–0.90 ms main-thread work per frame, this branch 2.5 ms (was 2.7–3.0 before `ebdf693`); Wealth asset list main 1.2–1.8 ms, this branch 2.0–2.1 ms. Both hold 60 fps (p50/p95 16.7/16.7–16.8 ms), no long tasks.
- The earlier ~8 s account-browser slowdown: mostly Playwright element-stability waits, not rendering. Actions that needed "element is not stable" retries took 15.5 s on the pre-fix branch (39 actions) against 10.7 s on main (21 actions), which is the whole action-time difference of that run; lifts starting as the test pointer arrived moved targets for 220 ms. After hover intent: 22 actions, 11.3 s. The sidebar star's blend mode was a smaller real compositor cost (fixed in `4187724`).

**Polish** (Part 13; local production build, Showcase, every main page reviewed at 1440×900 and 390×844; fixes only):
- `8f81c17` Goal cards: the caption no longer repeats the asset-class count; the legend below lists each class.
- `4b22a9f`:
  - The mode strip is readable over the Today hero.
  - The Staking "Explore" link wraps as one unit.
  - Portfolio composition has one divider instead of two.
  - Settings "Where your data lives" has no orphan card.
  - The Wealth total label clears the options button.
  - On phones, the mode dot sits inline with its text, and the layout lock is a 44 px square at the top right of the Positions, Activity and Health headings, with hero eyebrows kept clear of it.
- `99b5cc3` Unlocked layouts:
  - Goals: the section's move controls sat on the middle card's controls (desktop) or the only card's (phone).
  - Activity: the page's own `.activity-context>div` card rule turned the toolbar into a tall column over the text.
  - Health on phones: counter toolbars spilled over the neighbouring tile.
  - Now every card's controls stay inside it on one row and never overlap. A new check in `tests/ui-evidence.spec.ts` failed on the previous build and passes now. Edit mode only.
- `dc667f3` The "Add a widget" category counts line up when a label wraps.
- Left as is:
  - Staked principal shows "—" when unknown (correct; Positions is wallet-adjacent).
  - Today's widget grid can end on a half-empty row (fixing it needs layout rework).
  - Goal cards show "VALUE GOAL" twice, in the art caption and the header; this is the same on main.
  - The decorative orbit dot beside "Available for Goals" is main's artwork.

**Remaining "The Goal Layer for ZIGChain":** `README.md:2`, `apps/web/components/ecosystem-directory.tsx:11` (Ecosystem eyebrow), `landing/index.html:7` (page title), and 12 historical files under `docs/`. The app sidebar no longer shows it.

# Alpha deploy — 2026-09-29 evening, `07f5c90` live

Evidence labels: **workflow log** = `gh run view 36604090817 --log`, with line numbers from that output; **PR API** / **Actions API** = GitHub read on 2026-09-29; **owner-reported** = as the owner reports it.

- **Run:** Manual Alpha deployment #11, [run 36604090817](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36604090817), 2026-09-29 17:19–17:27 UTC, one attempt. Result **success**, deploy summary `Result: VERIFIED` (line 1710). It is the only Alpha deploy after run 36593359096. (workflow log, Actions API)
- **Source:** `07f5c90fb3a02cf3ba54903e10e1de570e3092e9`, the merge of #40. It already contains #41 and #36, so this deploy covers both. (PR API)
- **Live Alpha:** version `f15bb757-328f-46a6-b9c4-193f44fb83d3` (lines 1693, 1711). The last observed live version is the same (line 1713). (workflow log)
- **Rollback:** `e30684f9-6aa0-4e17-ae50-90cb3d7413b6`, captured before upload (lines 1612, 1712). This is the version run #10 deployed earlier the same day, so the chain holds. (workflow log)
- **Log masking fixed:** no "Skip output … may contain secret" lines. Hyphens are visible in the version IDs (lines 1612, 1693, 1711–1713), and the job set its `new_version_id`/`rollback_version_id` outputs (lines 1765–1766). Only tokens and the market-data key's environment line (line 1654) show as `***`. (workflow log)
- **#36 first real use:** the build job ran without the alpha environment or deployment credentials. Its step "Build and dry-run Alpha without deployment credentials" passed, and the alpha environment deployment was created at 17:23:34 UTC, when the build finished. The deploy job's step "Verify the build archive hash and unpack only .open-next" passed with `open-next.tar: OK` (line 1587), followed by "Verify the unpacked build is this exact source". (workflow log, Actions API)
- **CI on `07f5c90`:** Milestone quality #180 ([run 36602033343](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36602033343)): success. (Actions API)
- **Owner manual checks** (visual, real Keplr/reload/reconnect, Habit/Health persistence, mobile): owner-reported: pending.

**Merged since the last record:** (PR API)
- [#41](https://github.com/reyals1111-ux/ZIGoals/pull/41) (`e8589ca`): record of the `ebd8a9b` deploy.
- [#36](https://github.com/reyals1111-ux/ZIGoals/pull/36) (`bf84cc5`): deploy hardening: credential-free build, hash-verified deploy.
- [#40](https://github.com/reyals1111-ux/ZIGoals/pull/40) (`07f5c90`): accessibility fixes for the new motion and dialogs.

**Open PRs:**
- [#39](https://github.com/reyals1111-ux/ZIGoals/pull/39): backups include legacy Local simulation Goals. Tier 3, blocked on an integration flake.
- [#42](https://github.com/reyals1111-ux/ZIGoals/pull/42): sync harness diagnostics (logs failing requests, test-only).

**Known issues:** two intermittent web-integration failures:
- `sync-inflight-edit-browser`: "Sync was not confirmed".
- `account-browser`: vitest timeout.

**Resolved:** the run #10 log masking (every `-` shown as `***`) came from a malformed secret in the alpha environment. The owner re-saved it as a single line; run #11 shows clean masking. (owner-reported, workflow log)

**Activation:** Stage 4 local configuration **PASS**, run by the owner from an ops checkout at source `ebd8a9b`: private configs, dry runs and the setup checker. `wrangler secret put` is deferred until after Stage 7 approval, because it creates the Worker remotely. (owner-reported)

**Gaps found in Stage 4** (fixes follow in a separate PR):
- The lifecycle template lacks `AUTH_ORIGIN`.
- `activation-check` does not validate the private copies of the templates.
- The packaged-runtime test picks up a developer's `apps/web/.env.local`, which adds one extra request.

The section below still lists #36 and #40 as open; it was accurate when written.

# Alpha deploy — 2026-09-29, `ebd8a9b` live

Evidence labels: **workflow log** = `gh run view 36593359096 --log`; **PR API** / **Actions API** = GitHub read on 2026-09-29. Owner manual checks are recorded only as the owner reports them.

- **Run:** Manual Alpha deployment #10, [run 36593359096](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36593359096), 2026-09-29 15:51–15:56 UTC. Result **success**, deploy summary `Result: VERIFIED`. (workflow log)
- **Live Alpha:** Worker `zigoals-alpha` version `e30684f9-6aa0-4e17-ae50-90cb3d7413b6` from exact source `ebd8a9be017c986ff33bc813acefbc4c0abad4fc`. The last observed live version is the same. (workflow log)
- **Rollback:** `05de2b25-1ff8-4b5b-a867-e1f685e1f2bb`, captured before upload. It matches the previously live version (PR #22 deploy). (workflow log)
- **Smoke:** the deploy step verified rollout and HTTP security as part of `VERIFIED`. The log prints no per-route count; the `alpha-deployment-36593359096-1` artifact was not read for this record. (workflow log)
- **Log note:** GitHub secret masking replaced every `-` with `***` in this log, so the IDs above restore the hyphens. For the same reason, the job skipped its `new_version_id`/`rollback_version_id` outputs.
- **CI on `ebd8a9b`:** Milestone quality #171 ([run 36591715433](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36591715433)): success. (Actions API)
- **Owner manual checks** (visual, real Keplr/reload/reconnect, Habit/Health persistence, mobile): owner-reported: pending.

**Merged since the last record:** [#37](https://github.com/reyals1111-ux/ZIGoals/pull/37) (merge `ebd8a9b`): Health consent is disabled until sign-in finishes. This is also the first deploy since `a59bf03` (PR #22), so it ships #23–#31 and #33–#35 too, merged 2026-09-28/29. The sections below still call #26–#35 open; they were accurate when written. (PR API)

**Closed unmerged:** [#38](https://github.com/reyals1111-ux/ZIGoals/pull/38) (click-hang experiment) and [#32](https://github.com/reyals1111-ux/ZIGoals/pull/32) (integration check).

**Open PRs:**
- [#36](https://github.com/reyals1111-ux/ZIGoals/pull/36): deploy hardening, Tier 3. The next deploy is its first real test.
- [#39](https://github.com/reyals1111-ux/ZIGoals/pull/39): backups include legacy Local simulation Goals, Tier 3, review pending.
- [#40](https://github.com/reyals1111-ux/ZIGoals/pull/40): accessibility fixes for the new motion and dialogs.
- [#45](https://github.com/reyals1111-ux/ZIGoals/pull/45) (added 2026-09-29): consent checkboxes in the account/sync flow get explicit labels, linked reasons and refusals, and focus after sign-in. Tier 2, owner visual OK pending. #37's consent logic is unchanged.

# Overnight readiness run — 2026-09-28/29 (open PRs, nothing merged or deployed)

Evidence labels: **CI** = GitHub Actions run, **local** = this session's sandbox (Node 24.19.0, Chromium without H.264, max 2 Playwright workers), with commit SHAs.

- **A. CI headroom** — [PR #27](https://github.com/reyals1111-ux/ZIGoals/pull/27) (`ci/web-job-headroom`, `85ddfff`).
  - Milestone quality `web` is split into parallel jobs: checks, three Playwright shards (2 workers each) and integration/Alpha gates. A final `web` gate keeps the check name.
  - CI run 36489960661 (`613a552`) was green in **8.6 min wall**, down from 28.4.
  - Timeouts are now 10/18/15 min, about 2× the measured time.
- **B. Test reliability** — [PR #28](https://github.com/reyals1111-ux/ZIGoals/pull/28) (`test/flake-hardening`, `9f48bdb`).
  - The intermittent `goal-provider.test.ts` failure was a real bug: "Refresh journal" dropped its receipt check while a background journal load ran. Fixed in `goal-provider.tsx`.
  - The account sync harnesses now require a fresh completion.
  - Local: 20/20 sequential runs for each.
  - The two sync waits in files touched by PR #26 are left as a follow-up.
- **PR #26 CI fixes** — pushed to `ui/logo-quickadd-goals-header`.
  - `2f0ca33`: the motion-recording spec used the old sidebar Quick add on desktop Wealth.
  - `307d055` + `34d0a73`: merged main. PR #25's new sync harness still clicked the removed "+ Create a goal" hero link.
  - Local: specs pass. The intro-video autoplay spec fails locally only because the sandbox Chromium has no H.264 decoder.
- **E. Motion polish** — [PR #29](https://github.com/reyals1111-ux/ZIGoals/pull/29) (`ui/motion-polish`, `530727f`). Stacked on PR #26; retarget it to `main` after #26 merges.
  - Nav arrival (icon pop + one nebula sweep), page arrival (title sweep, card settle, figure shine) and a once-per-session desktop logo intro with crossfade.
  - All respect reduced motion and Motion Off. Settled pages are pixel-identical to the baseline.
  - Local full suite at `db6aa5c`: 465 passed, 19 skipped, 2 failed (the H.264 autoplay spec).
- **D. Readiness and housekeeping** — this PR (`docs/readiness-housekeeping`).
  - ACTIVATION.md audited and corrected.
  - New: `ALPHA_BINDING_SPEC.md` (not applied), `FRIENDS_ALPHA_CHECKLIST.md`, a skipped-test inventory and `scripts/status-snapshot.mjs`.
  - `use-private-store` lint warning fixed; stale STATUS headings retitled.
- **C. Sync follow-up** — [PR #30](https://github.com/reyals1111-ux/ZIGoals/pull/30) (`fix/sync-followup-after-inflight-edit`, `a1b90f3`).
  - An edit made during a running sync now schedules exactly one follow-up sync.
  - `ADR-006` (PROPOSED) covers the lost-final-confirmation gap. No format change was made.

Live Alpha is unchanged (Worker `05de2b25-1ff8-4b5b-a867-e1f685e1f2bb`). Nothing was merged or deployed.

## Daytime run — 2026-09-29 (open PRs, nothing merged or deployed)

- **Merge readiness:** tonight's order is #27 → #26 → #29 → #28 → #30 → #31.
  - Draft [PR #32](https://github.com/reyals1111-ux/ZIGoals/pull/32) (DO NOT MERGE; later closed unmerged and its branch removed) builds exactly that stack.
  - Run 1 (`5b97cdb`): one browser test hung once. It did not reproduce in 60 local production runs.
  - Run 2 (`c9c91d5`, final PR tips): **CI green**.
  - #28 conflicts with #26 in one sync harness file. A pre-resolved fast-forward is on branch `resolve/pr28-after-29`.
  - #31 and #30 now contain #28's changes, so the rest of the order merges cleanly (local simulation).
- **C. Sync follow-up** ([PR #30](https://github.com/reyals1111-ux/ZIGoals/pull/30)): a local edit made during a sync no longer pauses automatic sync; one follow-up uploads it. Real conflicts still pause. New browser tests are included, and CI runs them.
- **New PRs:**
  - [#33](https://github.com/reyals1111-ux/ZIGoals/pull/33): auth hardening. Hosted sessions will need one fresh sign-in.
  - [#34](https://github.com/reyals1111-ux/ZIGoals/pull/34): export → wipe → import round-trip tests for all four modules; no bugs found.
  - [#35](https://github.com/reyals1111-ux/ZIGoals/pull/35): new logo in the favicon, apple-touch-icon and social cards.
  - [#36](https://github.com/reyals1111-ux/ZIGoals/pull/36): Alpha deploy split into a credential-free build and a hash-verified deploy. **Merge only after tonight's deploy.**
- **Owner decision:** legacy "Local simulation" Goals are not included in any backup. "Export Goal Data" saves only their plans.

---

# Sync self-conflict race fix — 2026-09-28, [PR #25](https://github.com/reyals1111-ux/ZIGoals/pull/25) merged into `main` as `7fdea686517cee322a37896b3e7a56931ce0ed6a` (not deployed)

**Race (fixed).** `synchronize()` published this device's snapshot but advanced the sync journal only in `commit()`. When a local edit landed during the sync, `applyData()` correctly refused to overwrite it, `commit()` was skipped, and the next sync reported this device's *own* upload as "Unlinked local and cloud records differ" (or as a false financial conflict after an earlier sync). Now, once the cloud acknowledges the catalog head, the same journal write that clears the pending operation records each section whose published bytes equal the snapshot read at the start of that sync. Sections that merged another device's edits keep their previous base until `commit()`, so they cannot be silently overwritten. Merge rules, conflict checks, retries and timeouts are unchanged. The newer local edit stays pending and uploads on the next sync. Evidence: unit harness in `apps/web/lib/vault/cloud-sync.test.ts` and the single-profile browser harness `scripts/run11/sync-self-conflict-browser.test.mjs`. Both failed deterministically before the fix and pass after it.

**Test matcher.** `apps/web/tests/unified-goals.spec.ts` now flags chain RPC by hostname or pathname, and `/api/positions` by pathname. It ignores only the query string, so Next `?_rsc=` fetches are no longer misreported.

**Run11 anomaly #1 (profile B "Breakfast today 150 kcal" timeout, `docs/run11/evidence/attempts.json`).** This race is not a likely explanation. In that journey it would have made profile A's own final "Sync now" fail visibly ("Needs attention" plus an Unlinked error), so the failure would have appeared on A, not on B. The root cause remains unresolved; the failed run captured no state. More likely candidates:
- The failed source `d2ae5728` did not yet verify that A had saved the Breakfast widget before syncing; that precondition was added later, and three passes followed.
- `waitPackagedSync` can accept a stale "Account records synced and acknowledged" message in the moment between the click and the busy state rendering.

**Open follow-up — lost acknowledgement of the final head write.** If the cloud applies the catalog head but its acknowledgement never reaches the browser (tab closed, network drop), the head stays `pending` and is replayed on the next sync without recording the uploaded snapshot. A local edit made in that window can still surface as a false "Unlinked" or financial conflict, which currently needs manual review. Closing this safely requires persisting the prospective base with the pending operation and applying it only after a confirmed replay; that is a sync-journal format change and was deliberately left out of this fix.

**Observation (no change).** "Sync now" is disabled while any sync runs, and the panel shows "Syncing encrypted account records…". A click in the brief window before the busy state renders is ignored without feedback. An edit made while a sync is running does not schedule its own follow-up sync; it waits for the next 30-second, focus or online trigger.

---

# Current accepted baseline (2026-09-28)

**Handover rule:** every merged change updates this section. Sections below it are earlier records.

## Release identity
Updated 2026-09-29 evening for the [Alpha deploy](#alpha-deploy--2026-09-29-evening-07f5c90-live) above.
- Deployed source `07f5c90fb3a02cf3ba54903e10e1de570e3092e9`, the merge of [PR #40](https://github.com/reyals1111-ux/ZIGoals/pull/40) (after #41 and #36). Verified: PR API.
- CI: Milestone quality #180 ([run 36602033343](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36602033343)) on `07f5c90`: success. Verified: Actions API.
- Deployment: Manual Alpha deployment #11 ([run 36604090817](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36604090817)), exact source `07f5c90`: success, `VERIFIED`. Verified: workflow log.
- Alpha Worker: live version `f15bb757-328f-46a6-b9c4-193f44fb83d3`; rollback `e30684f9-6aa0-4e17-ae50-90cb3d7413b6` (the run #10 deployment), captured before upload. Verified: workflow log. Owner manual checks: owner-reported: pending.

Previous release identity (PR #37, earlier on 2026-09-29):
- `main` = `ebd8a9be017c986ff33bc813acefbc4c0abad4fc`, the merge of [PR #37](https://github.com/reyals1111-ux/ZIGoals/pull/37). Verified: PR API.
- CI: Milestone quality #171 ([run 36591715433](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36591715433)) on `ebd8a9b`: success. Verified: Actions API.
- Deployment: Manual Alpha deployment #10 ([run 36593359096](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36593359096)), exact source `ebd8a9b`: success, `VERIFIED`. Verified: workflow log.
- Worker `zigoals-alpha`: live version `e30684f9-6aa0-4e17-ae50-90cb3d7413b6`; rollback `05de2b25-1ff8-4b5b-a867-e1f685e1f2bb` (the PR #22 deployment), captured before upload. Verified: workflow log. Owner manual checks: owner-reported: pending.

Previous release identity (PR #22), checked against GitHub on 2026-09-28:
- `main` = `a59bf038a44966eb3816878d935a2c5111ef5b3a`, the merge of [PR #22](https://github.com/reyals1111-ux/ZIGoals/pull/22) (`claude/brand-nav-polish`, head `7e8d2d178d490b5c39200feabacc6d86d8068208`), merged 2026-09-27. Verified: PR API.
- CI: Milestone quality #119 ([run 36354823188](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36354823188)) on `a59bf03`: success. Verified: Actions API.
- Deployment: Manual Alpha deployment #9 ([run 36357209395](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36357209395)), exact source `a59bf03`: success. Verified: Actions API.
- Worker `zigoals-alpha`: new version `05de2b25-1ff8-4b5b-a867-e1f685e1f2bb` (also the observed live version); rollback version `c7c67184-0449-48dd-8feb-7e3d0752090e` (the PR21 deployment), captured and validated before upload; 11/11 smoke routes returned 200 with security PASS. Verified: `deployment.json`/`rollback.json` in the run's `alpha-deployment-36357209395-1` artifact (status `VERIFIED`).

## PR #22 changes
- Glowing nebula Z above the ZIGoals wordmark. On desktop, a larger Z is centred above the sidebar, and the wordmark with the nebula tagline sits above the sidebar planet.
- The nav highlight glides between items, with a fallback where ResizeObserver is unavailable. Stake / Positions moved below Markets.
- The hero star rises along the planet's rim into its flare. The slogan cascades and carries one sweep of light to Wealth.
- Motion polish: buttons get a gliding hover, a tactile press and one sheen pass on primary buttons. Progress bars and gauges grow in once, then glide to new values. Chart marks, sparklines, the donut and Habit history settle into view. Habit week bars and Health nutrition bars keep no leftover transform after rising.
- Goal choice tiles in the app's theme replace the native Goal dropdowns.
- iPhone Safari no longer zooms into 14px fields, and small disclosures are larger.
- A root `CLAUDE.md` quick start, and the record of PR21 as merged and deployed.

**Rule:** PR #22 is the accepted baseline. Build on top of it. Don't revert or redesign any of it without owner approval.

## The 10 targets
| # | Status | Note |
|---|---|---|
| 1 | OPEN | |
| 2 | PARTLY | `CLAUDE.md` done |
| 3 | PARTLY | Run11 final evidence (`414aa52b56bf2de049561dbbd248584d1c29c91b`, docs only) is backed up on branch `backup/run11-final-evidence` and not yet merged |
| 4 | OPEN | Next: Supabase/Resend/Cloudflare activation ([activation stages](run11/ACTIVATION.md)) |
| 5 | OPEN | |
| 6 | OPEN | |
| 7 | PARTLY | Real-iPhone check remains |
| 8 | DONE | |
| 9 | OPEN | |
| 10 | OPEN | |

Target statuses come from the owner. The full target definitions are not recorded in this repository.

## CI runner image (resolved)
GitHub's `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19 (date supplied by the owner, not checked here). Milestone quality used to run on `ubuntu-latest`; all workflows now pin `ubuntu-24.04`, so the move does not affect CI until the pin is changed deliberately.
- [PR #24](https://github.com/reyals1111-ux/ZIGoals/pull/24) was merged (`acf48aa93bf4d241034a676e4e1b97433ad3c5d3`): both Milestone quality jobs (`web`, `contract`) are now pinned to `ubuntu-24.04`.

---

# Run #11 (PR21) — merged and deployed 2026-09-27; superseded as live Alpha by PR #22, owner activation still pending

[PR21](https://github.com/reyals1111-ux/ZIGoals/pull/21) was merged into `main` on 2026-09-27 as `fb1e3d9690098fb9958f3a93e9028fa4804f6074` (preparation `3ca2f42303724ef1317aded6982c9fdd6fd8775d`; tested implementation/build `44e4424e5e6e75e490fedfd5e35c27265a336113`). Integrated local account, market, Goal/Habit/Health/preset and recovery journeys are implemented and accepted. See [Run11 final report](run11/FINAL_REPORT.md), [source-bound evidence](run11/EVIDENCE.md), [full closure](run11/CLOSURE.json) and [resume state](run11/STATE.md). The eight [owner activation stages](run11/ACTIVATION.md) remain separate.

Manual Alpha deployment run [36339307897](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36339307897) deployed exact `fb1e3d9690098fb9958f3a93e9028fa4804f6074` on 2026-09-27: SUCCESS, Worker version `c7c67184-0449-48dd-8feb-7e3d0752090e`, rollback `1438406e-4ede-423b-81cc-5eeb0d1c1a8a`. The previous Alpha deployment was Run10 (PR20) at `901e2a6600fb8292b7956717d45341f050fd377c`.

### 2026-09-28 — Brand + layout polish (open PR, not merged or deployed)

Branch `ui/logo-quickadd-goals-header`, owner-approved changes to PR #22 baseline elements only: the new Z logo leads the desktop sidebar (Quick add removed there) and replaces the mobile header Z; Quick add replaces the Today hero's "+ Create a goal"; the Goals header reads "Your Goals" with Create beside it and a single compact controls row; "See how it works" opens a placeholder brand intro video dialog. No CSP, wallet, contract, key or sync change. Favicon, app icons, landing and social images are unchanged.

## Historical release reports below

Their original pending/draft descriptions apply to their observation dates, not to the state recorded above.

# Run #10 (PR #20) — historical record; PR #20 was later merged and deployed (`901e2a6`), then superseded by Run #11

The authoritative expanded Run10 is implemented in part on `codex/run10-beta-reliability-foundation`; it is not merged or deployed. Local four-domain encrypted continuity, Health/Habit/financial/UI work and canonical CI improvements have concrete evidence. Account/domain deletion, key rotation, incremental sync/conflict UI, larger-history and several integrated journeys remain incomplete. Hosted email/backend and physical acceptance are separately unconfigured.

See [Run10 final report](run10/FINAL_REPORT.md), [full ledger](run10/REQUIREMENTS.json), [verification](run10/VERIFICATION.md), [blockers](run10/BLOCKERS.md) and [exact resume](run10/RESUME_STATE.md). Earlier Run11/12 scheduling exclusions and open sync decisions are superseded by [the preserved authoritative brief](run10/MASTER_PROMPT.md); required gaps remain inside Run10. The deployed Alpha and financial-execution gates are unchanged.

---

# Run #9.2 — MERGED + PUBLIC ALPHA LIVE

Run #9.2 is merged and publicly hosted on the owner-controlled Alpha. PR #17 delivered Goal Intelligence, Live Wealth, Markets, Showcase, Funding Wealth, Today, Activity, Habits/Health productization and the final consumer visual system. PR #18 added the protected CoinGecko runtime-secret publication boundary. The release-closure source adds a native-ZIG CoinGecko token-address fallback and updates the deployment smoke from the obsolete V2.1 hero to the Run #9.2 surface.

The Alpha remains `PUBLIC_ALPHA_UNDEPLOYED` with respect to Goal Manager: no Goal Manager/code ID is deployed and no financial signing/broadcast is enabled. Product UI deployment and contract deployment are separate states.

An isolated Showcase now fills Goals, Wealth, Markets, Habits, Health and Activity with clearly fictional examples. Today connects funding pace, upcoming contributions, attention items and Life + Wealth. Markets adds canonical logos, actual public movement and seven-day sequences; portfolio composition and the Life dashboards add usable depth. The hero uses the owner’s exact capitalized two-line slogan.

See [Run #9.2 report](RUN_9_2_REPORT.md), [complete deliverables](RUN_9_2_DELIVERABLES.md), [verification](verification/run9-2/README.md) and [remaining Beta backlog](RUN_9_1_BETA_BACKLOG.md). The Run #9/#9.1/#9.2 product line is now merged into `main` and hosted on Public Alpha. Exact deployment source/version and rollback evidence are retained by the owner-approved Manual Alpha workflow.

Final Run #9.2 closure PR #19 is merged and deployed. Reviewed closure head: `2a9deead68ddd187b13f0505319cf0962f97adff`; deployed main: `95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90`. Deployment [35702856008](https://github.com/reyals1111-ux/ZIGoals/actions/runs/35702856008): **SUCCESS / VERIFIED**, deployment/security smoke **11 / 11 PASS**. Live Worker: `768673e8-9d39-4022-b1c0-fdd805fa2318`; preserved rollback: `cca2b972-3b40-47a6-affe-1249fe260465`. See [exact release evidence](verification/run9-2-release/README.md).

Separate immediate market acceptance recorded native ZIG quote 503, Bitcoin quote 200 / VERIFIED, catalog 503 and Bitcoin history 503. Subsequent Run #10.0 cloud testing was BLOCKED by HTTP 403 / Cloudflare Error 1010 / access_denied. The original live market incident remains **UNCONFIRMED**; runner access denial is not provider-failure evidence and does not undo successful deployment/security verification. [Run #10 master plan](RUN_10_BETA_RELIABILITY_MASTER_PLAN.md) defines the reliability foundation and remaining owner decisions; documentation correction does not require a deployment.

---

## Historical snapshots — superseded by the Run #9.2 state above

All sections below describe their original observation window. References to local-only work, current Alpha versions or pending funding are historical, not the current release state.

# Run #9.1 — local Beta productization

Wealth is the canonical asset home, with shared asset selection/editing, eight favourites, CoinGecko history and atomic Fund Goal / explicit history-only modes. Funding Wealth, Today, Activity, Health groundwork and consumer branding are redesigned. Public Alpha is unchanged; no merge, push, deployment or financial execution occurred.

See [implementation report](RUN_9_1_REPORT.md), [verification](verification/run9-1/README.md), [market/accounting guide](RUN_9_MARKET_DATA.md) and [remaining Beta backlog](RUN_9_1_BETA_BACKLOG.md).

---

# Run #9 — Goal Intelligence + Live Wealth (local owner review)

Run #9 is implemented on `codex/run9-goal-intelligence-live-wealth`, starting from the owner’s prep commit `a6950f7f7cfeeef0c5be286179e5bc99235d9a66`. The public Alpha remains unchanged. Nothing was merged, pushed, deployed, signed or executed financially.

The local upgrade adds server-only CoinGecko discovery/valuation, schema v2 migration, explicit contributions and reversals, current-plan pace, zero-return Funding Wealth, separate recorded income, bounded evidence history, and updated Wealth / Goal Detail / Today / Activity. Automatic and manual values remain distinct. Full verification and remaining Beta limits are recorded in [Run #9 report](RUN_9_REPORT.md), [market/accounting guide](RUN_9_MARKET_DATA.md), and [Beta backlog](RUN_9_BETA_BACKLOG.md).

---

# Run #8 / #8.1 release closure — 2026-09-19

**HISTORICAL PUBLIC ALPHA — RUN #8/#8.1 MERGED + DEPLOYED + OWNER-VERIFIED LIVE.**
PR #15 merged to exact `main` source `c3997841c7b07b6adcc430616c86e4e4728d3222`. Post-merge Milestone quality passed. The owner-approved Alpha rollout published Worker version `30468b51-fb8d-4f9e-bd6c-b36d4a9f89e5` with rollback `836e3ad7-af0a-46cd-8e32-e050d747e6f2` preserved before upload.

Both official Alpha origins subsequently served the exact merged SHA and `PUBLIC_ALPHA_UNDEPLOYED`; the repository's complete nine-request production smoke passed, followed by owner browser acceptance of Wealth, Value Goal multi-asset progress, Today, Goals, Habits, Health, reload/reconnect and mobile behavior.

Manual deployment run `35444908631` uploaded successfully but its immediate exact-source hostname check raced propagation and recorded `NEEDS_OWNER_REVIEW`. The later exact-source/full-smoke evidence proved the intended version live. GitHub Alpha deployment `6541222439` was therefore subsequently marked `success`. The original red Actions attempt is retained as historical evidence and was not rerun.

Goal Manager / Code ID remain **NOT DEPLOYED**. Public Alpha remains simulation, private local data, watch-only/public reads and explicit wallet connection only. No contract upload/instantiation, staking transaction, financial signing or broadcast occurred.

See [Run #8/#8.1 release closure](verification/run8-1-release/README.md).

---

# Run #8 superseding direction — 2026-09-17

Run #8 is implemented on [draft PR #15](https://github.com/reyals1111-ux/ZIGoals/pull/15) with required local checks and all five hosted quality/reproducibility checks passing; owner review remains pending. See [delivery report](RUN_8_REPORT.md), [explicit partial/deferred scope](RUN_8_BETA_BACKLOG.md), and [verification](verification/run8/README.md). No merge or deployment occurred. Complete implementation scope is [the complete master brief](RUN_8_ASTRA_MASTER_PROMPT.md). V2.1 visuals and Health V1 are frozen. Goals, Positions, native staking read-only, allocations, projections, Habits Beta and Today are the active milestone. Prior references to Run #8 Health Beta/UI V3 are superseded.

Owner-supplied new evidence: funding SOLVED (5,000 test ZIG); self-transfer 0.01 ZIG succeeded, hash 53216EEFF500DDD5D5A69B6EABF2E844ADC3988BE8D61CA277C1A979BCE5EA4C, height 7812205, sequence now 1. Post-transaction balance 4999997258125000000000 azig. Fee 2741875000000000 azig / 109675 gas wanted = 25000000000 azig/gas, versus configured 2500000000. No fee-policy change authorized without further evidence. Upload whitelist AnyOfAddresses excludes dedicated wallet; instantiate default Everybody does not authorize upload. Goal Manager/Code ID NOT DEPLOYED. No live financial execution, mainnet signing, upload or production deployment. Historical text below is dated evidence, not current funding status.

---

# Historical project status — 2026-09-17

**HISTORICAL PUBLIC ALPHA — OWNER-VERIFIED LIVE (2026-09-17).** Manual Alpha run `35153444566` deployed exact source `69aa0260eaa6bde3294ba7a778086839246c030a` to `zigoals-alpha` as Cloudflare version `836e3ad7-af0a-46cd-8e32-e050d747e6f2`. Rollback version `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80` was captured before upload. Automated deployment/security verification passed, followed by owner verification of build identity, real Keplr connect, reload to Local Demo, explicit reconnect, Habits persistence, Health persistence and mobile. Goal Manager and Code ID remain **NOT DEPLOYED**; no financial signing/broadcast is enabled.

**Run #7 / V2.1: MERGED + DEPLOYED + OWNER-VERIFIED LIVE.** Owner confirmation is recorded in the [manual Alpha runbook](deployment/MANUAL_ALPHA_WORKFLOW.md). Visual Refresh v1 remains historical: [PR #8](https://github.com/reyals1111-ux/ZIGoals/pull/8) merged at `b81262f1b9ae7e4a07efb9a6415e64d90fe120f9`. M6 and PR #7 housekeeping remain completed historical infrastructure work. [PR #6](https://github.com/reyals1111-ux/ZIGoals/pull/6) merged at `0c953a00d9f3e615289ae286549c74298b95dbdc`. **PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE:** [official Alpha](https://alpha.zigoals.app/app), [fallback](https://zigoals-alpha.reyals1111.workers.dev/app), and [apex landing](https://zigoals.app) are live.

- **Run #7 V2.1: OWNER-VERIFIED LIVE.** Merged [PR #9](https://github.com/reyals1111-ux/ZIGoals/pull/9) contains the product expansion and owner-requested visual correction. [Review package](verification/run7-v21/README.md): 17 visual corrections, 610 JS tests, 82 production browser tests, 22 local Workers checks, clean Alpha build/dry run and five successful implementation CI checks. The owner confirmed visual, real Keplr connect/reload/reconnect, Habit/Health persistence and mobile checks.
- **CONTRACT_NOT_DEPLOYED**: Goal Manager/code ID/onchain checksum absent. `PUBLIC_ALPHA_UNDEPLOYED` means web deployed, contract absent. Simulation, local metadata/backups, diagnostics and explicit wallet connection/public reads only. Financial preparation/signing/broadcast refuse at low-level boundaries.
- Live Alpha: Worker `zigoals-alpha`, owner-verified version `836e3ad7-af0a-46cd-8e32-e050d747e6f2`, exact source `69aa0260eaa6bde3294ba7a778086839246c030a`; verified rollback `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80`; successful manual run `35153444566`. Current Alpha remains simulation + explicit wallet connection only; Goal Manager and Code ID **NOT DEPLOYED**, no financial signing/broadcast.
- Live apex: Worker `zigoals`, owner version `de83a26a-d2ce-4f19-8067-09fa46a49fff` (new source SHA not supplied). CTA **Explore the Alpha →** targets the exact official `/app` URL with simulation/connection-only and no-transaction disclaimers.
- Real hosted Keplr rejection/reconnection is **OWNER_VERIFIED_HOSTED_EXTENSION_EVIDENCE** at both Alpha origins under production CSP. Correct truncated disposable account, 0 ZIG, no fee prompt/arbitrary-message/financial signature/broadcast. This closes the M4 hosted-extension limitation; mocks remain separate evidence.
- **ATTESTED CONTRACT CANDIDATE / NOT_APPROVED / HISTORICAL SOURCE**: release-candidate run `35023262754`, source `5765e356dcab1047f8f488515dfe44dd01eda5b4`, Wasm SHA256 `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. Its reproducibility/attestation remains valid evidence, but later merges moved `main`; a fresh exact-current-main candidate plus explicit owner approval is required before any future upload.
- Owner verified real Keplr/reload to Local Demo/explicit reconnect, testnet diagnostics, mobile layout, CSP/security headers and no financial signing/broadcast on the current Alpha. PR #13 completed the duplicate HSTS/X-Robots cleanup while preserving Next/static coverage.
- Fresh read-only `zig-test-2` verification confirms the dedicated test wallet has **0 azig** and is not in `code_upload_access.addresses`. Owner-reported ZIGChain support communication on 2026-09-16 says CosmWasm whitelisting is on hold while a broad EVM integration is completed/tested, with no due date; support expects announcements and offered to ping the owner when things settle. The separate testnet-funding request remains pending. This DM is planning evidence, not a public protocol commitment. Real financial signing/upload remains **NOT RUN**.
- Owner reports **Workers Paid**, $5/month + usage. Exact M6 version, last 1 hour: CPU P50/P90/P99/P99.9 **120/229/428/428ms**, 61 invocations, 12 asset requests, 100% cache hit, 0 subrequests, 0 errors, 0 `exceededCpu` events. The **2000ms** limit is present in deployed config, **not separately confirmed by dashboard/version view**.
- Controlled production CPU: `/app` [524,42,33,28,42], median **42ms**; `/app/settings` [25,29,26,37,27], median **27ms**. `/icon.svg`: no Worker invocation, five HTTP 200 client requests and cache-hit corroboration; **asset bypass / Worker CPU N/A**, never 0ms. Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window. Bundle remains **~6.84% smaller**; spike attribution is unproven.
- [Owner post-deploy evidence](verification/m6/OWNER_POST_DEPLOY.json), [M6 report](RUN_6_REPORT.md), [resume state](verification/m6/RESUME_STATE.md) and [CPU comparison/checklist](deployment/CPU_OWNER_CHECKLIST.md) close the rollout. Historical [M5 evidence](verification/m5/README.md), [Run 5](RUN_5_REPORT.md) and [Run 4](RUN_4_REPORT.md) retain their original findings. That historical housekeeping changed documentation only; Run #7 was subsequently merged/deployed and owner-verified; adding the manual workflow performs no production mutation.
- **Next documented product gate:** owner-controlled testnet readiness, then first idle Goal Manager deployment and deposit/withdraw/close proof via the [owner checklist](deployment/OWNER_TESTNET_CHECKLIST.md). Funding, upload permission and approval of the exact attested artifact remain prerequisites. Run #7 is closed with [merged PR #9](https://github.com/reyals1111-ux/ZIGoals/pull/9) and owner verification; see [report](RUN_7_REPORT.md). The [manual Alpha workflow](deployment/MANUAL_ALPHA_WORKFLOW.md) adds explicit owner dispatch/review, exact-main checks and rollback evidence; protected environment/credential setup precedes first use. This does not advance the contract deployment gate. The existing [Alpha tester guide](testing/ALPHA_TESTER_GUIDE.md) supports simulation-only feedback while those gates remain blocked.

Run #7 starts from the exact owner-approved V1 main. V1 final owner checks: clean exact-source Alpha build (dirty:false), dry-run, 14/14 desktop and 8/8 mobile checks, isolated preview, 100% rollout, custom-domain HTTP 200, live hero and CSP/security headers. These are owner-supplied production evidence, not new Run #7 production actions.
