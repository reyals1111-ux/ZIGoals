# Run #10 restoration and readiness ledger

Authority: owner brief `ZIGoals_RUN10_Restoration_Polish_and_Readiness (1).md` supplied 2026-09-24. This is a continuation of the original 290-row/40-journey ledger, not a replacement. The original SS-01–SS-10 mappings remain in the master ledger. Owner visual verdicts are design feedback, not test evidence. No hosted activation is authorized.

## New attachments in supplied order

| ID | Supplied image | Requirement | Status |
|---|---|---|---|
| POLISH-01 | 21_36_32 | Rejected generic Today composition; restore original cards and rail, preserve widgets | Checkpoint A source restored; isolated desktop/mobile hierarchy tests passed; owner visual review pending |
| POLISH-02 | 21_36_37 | Approved whole-life card above financial attention | Implemented in `today-intelligence.tsx`; isolated Showcase desktop/mobile order tests passed |
| POLISH-03 | 21_36_49 | Wallet artwork and Staked ZIG rail | Restored in `today-dashboard.tsx`; isolated Showcase desktop/mobile tests passed |
| POLISH-04 | 21_36_55 | Recent activity rail | Restored; desktop/mobile presence passed; deep data-scope acceptance pending |
| POLISH-05 | 21_37_02 | Working widgets/Habits to preserve; improve art and controls | Mechanics preserved; compact card menus and selected-widget live binding pass focused checks; final art/visual acceptance pending |
| POLISH-06 | 21_37_08 | Visual widget library instead of native select wall | Visual group/tile/source/metric picker implemented and 320px checks pass; P04 remains partial |
| POLISH-07 | 21_37_13 | Correct ring data; smooth boundaries and motion | Bounded color interpolation and actual Goal-ring motion pass focused Chromium checks; owner/WebKit gate open |
| POLISH-08 | 21_37_19 | Preserve four Goal types; finish creator fields/pickers | P09 pending |
| POLISH-09 | 21_37_23 | Enlarge Wealth hierarchy and bars | Scoped type, swatches and bars enlarged; desktop/mobile Wealth checks pass; owner visual gate open |
| POLISH-10 | 21_37_27 | Make Health nutrition overview always visible | Source restored; focused desktop/mobile tests passed |
| POLISH-11 | 21_37_32 | Rejected hero copy/pillars/plain play button | P06 source restored; isolated desktop/mobile browser checks passed |
| POLISH-12 | 21_37_37 | Approved hero copy/buttons/pillars | Source restored; owner visual verdict pending |

Image names above are the distinctive supplied timestamp suffixes; the owner’s original files remain in Downloads. Do not publish those unsanitized images. Test captures use isolated fictional browser contexts.

## Baseline module and copy disposition

Baseline source is `95ff4d3e:apps/web/app/app/page.tsx` and its contemporary `today-intelligence.tsx`. Current source retains the hero and reinstates the whole-life card, financial attention, funding agenda, needs attention, watchlist, Goal cards/new-destination tile, progress summary, Habit/Health daily cards, next action, wallet, staking, destination, recent activity, and How it works. The existing widget grid and presets remain. Default desktop uses the original main/rail lanes; Health-only omits financial modules. The account-aware Run10 stores remain the source of records. Financial attention receives the dashboard's existing market snapshot instead of issuing its own quote request.

Approved default hero slogan was already present. Supporting two-line copy, `+ Create a goal`, luminous play medallion, and the three original pillars were restored. The status line stays mode-specific: local simulation, watch-only testnet wallet, or Health-only. Quick Add remains in navigation; the removed italic motto remains removed. No unreviewed blanket baseline revert was used.

## Requirement reconciliation

`Done` below means source and stated focused checks only. It never means the full 40-journey or owner-device gate passed.

| ID | Required result | Current state / next evidence |
|---|---|---|
| P01 | Original Today hierarchy, account-safe rail and mobile | Partial: source restored; isolated Showcase desktop/mobile hierarchy and 320px checks passed; owner visual comparison and deeper scopes remain |
| P02 | Versioned built-in/widget placement and recovery | Partial: optional versioned placement, stable built-ins, protected modules, insertion and main/rail moves implemented. Legacy layouts parse and reconcile; actual fictional encrypted settings backup restore, no-duplicate, reload and hide/show pass desktop/mobile. Full integrated/owner acceptance pending. |
| P03 | True selected-widget summary, all chosen instances | Partial: separate illustrated summary uses all visible selected instances and canonical metrics; six-widget hide/remove/reload and bound-Habit change/reload pass desktop/mobile. Locked/no-data and final visual acceptance remain. |
| P04 | Visual widget library and source-card pinning | Partial: visual group/tile/source/metric selection and eligible Goal/Habit/asset/Position/Health/Wealth/ecosystem source menus implemented. No-source staking hidden; bound Habit updates; distinct bindings/reload/duplicate refusal and missing-source rebind pass desktop/mobile. Food-entry/per-meal and remaining source-module coverage plus final integration remain. |
| P05 | Illustrated cards and quiet accessible settings menus | Partial: domain-specific card gradients/glyphs and compact focusable widget/source menus; 320px opening/Escape focus return, source-preserving removal and normal-mode image checked. All menu action/focus paths, zoom and final owner visual acceptance remain. |
| P06 | Approved copy/button treatment | Partial: source restored and focused browser check passed; owner visual verdict pending |
| P07 | Visible motion, preference, reduced-motion proof | Partial: mount/visibility-gated hero/ring/Wealth and Health bar entrances; Settings Appearance Motion preference and preview; timed computed-style checks show visible start/mid/end on desktop/mobile Chromium; off/reduced and no-repeat editing pass. Wealth/Health line-draw coverage, unavailable WebKit engine, physical Safari and full visual clips still open. |
| P08 | Smooth category color transitions with exact data | Partial: narrow per-segment color blends in Goal rings and Wealth composition; tiny segments retain a core; canonical percentages/labels untouched. Focused model and browser checks pass; ranking-bar consistency and owner visual gate open. |
| P09 | Premium progressive Goal creator and themed selectors | Incomplete: four functioning type cards preserved; remaining form/pickers pending |
| P10 | Wealth hierarchy/bars | Partial: scoped larger category labels/values, 18–24px swatches and 12px ranking bars; arrangement and currency separation preserved, relevant browser journey passes 1440→320px. Final screenshot/owner review and full integration open. |
| P11 | Always-visible Health overview | Partial: source and four focused desktop/mobile checks passed; integrated gate pending |
| P12 | Full-width official-logo ecosystem cards | Incomplete |
| P13 | Accepted work and mobile coherence | Partial: source retained; 320px overflow corrected; 26 affected visual checks passed; broader gate pending |
| E01 | Portable CI screenshots | Local pass: hardcoded paths repaired; 26 desktop/mobile affected visual tests passed with runner-owned output paths; hosted quality rerun pending |
| E02 | Real crypto prices/market coordination | Incomplete: local/provider and hosted 503 investigation pending; no quote fallback accepted |
| E03 | Email account integration and physical sync proof | Incomplete: fixture auth does not count; owner has no service; isolated setup path in `OWNER_ACTIVATION.md` |
| E04 | Deletion, no-resurrection, key rotation | Incomplete code; cannot be relabeled owner setup |
| E05 | Conflict and pending-queue recovery | Incomplete code/UI |
| E06 | Durable storage delta/paging/capacity | Incomplete code/performance proof |
| E07 | Financial and Goal-history acceptance | Incomplete integration proof |
| E08 | Practical camera/barcode path | Incomplete physical/device proof and remaining code |
| E09 | Daily-use gaps | Incomplete reconciliation |
| E10 | Cross-cutting security/migration/performance gates | Incomplete final gate |
| E11 | Isolated activation request and friends-ready gate | Pending all prerequisite code gates; no deployment authorized |

Draft PR #20 remains open. Preserve `apps/web/next-env.d.ts` as an unstaged owner-generated preview change.

Checkpoint A focused evidence: `run10-restored-today.spec.ts` 2/2 desktop/mobile; `run10-shared-visuals.spec.ts` plus `run10-ecosystem.spec.ts` 26/26 both projects; affected desktop dashboard/widgets/life suite 20/21 initially, then the sole assertion corrected and passed separately; Health-only request journey 2/2 after excluding only the preview's own `/_next/hmr` socket; Health overview helper 4/4; scoped ESLint and TypeScript passed. These are local preview checks, not hosted or physical-device acceptance. Test screenshots and traces remain in ignored `apps/web/test-results/`.

Checkpoint B focused evidence (2026-09-24): placement model 14/14 unit cases; `run10-dashboard-placement.spec.ts` 2/2 desktop/mobile including real encrypted fictional settings backup and restore; `run10-widget-overview.spec.ts` 2/2; restored Today/summary combined 4/4; shared visuals and existing widget/preset journeys 20/22 on first run, with the two stale fixed-index assertions corrected and the widget/preset journey rerun 4/4; Health-only request journey rerun 2/2. TypeScript, scoped ESLint and diff checks pass. The first placement browser attempt also exposed a test-only missing customization toggle after reload and a broad label selector; both were corrected before the passing rerun. No deployed, real-email or owner-device pass is inferred.

Checkpoint C source `03a61c8e8032d54253589e03deaffa83263ae1b0` (2026-09-24): visual `WidgetLibrary`, shared safe `dashboard-widget-registry`, compact `CardOptions`, source-card `PinToToday`, canonical Health nutrition/Wealth history metrics and same-bound-Habit summary/card update. Focused source/picker/Habit live-update journey 6/6 desktop/mobile; affected source pages 30/30 desktop/mobile; Today/placement/summary/Health-only 10/10; focused unit 22/22, TypeScript and scoped lint pass. Test screenshots in ignored `apps/web/test-results`; no owner private data loaded. PR #20 source head independently matched remote and OPEN/DRAFT. This is a source slice, not full P03/P04/P05 acceptance or an owner visual verdict.

P04 source-module inventory at C/D: registered aggregates are Goals, Habits, Health meals/macros/water/weight/steps/activity/30-day nutrition, Wealth per-currency current/history, ecosystem directory; registered bound records are individual Goal, Habit, asset, eligible staking/reward Position and Position allocation, plus official ecosystem project. Menus exist on Goal/Habit, Health daily/water/weight/activity/nutrition history, Wealth asset/subtotal/history, Position and ecosystem project cards. A missing Habit source stays visible and can be rebound. Food-entry or per-meal-group pinning, any remaining visible trackable source modules and full no-data/locked testing stay **incomplete**; the safe registry does not imply arbitrary cards are supported. `dashboard-widget-registry.ts` controls eligibility and `dashboard-metrics.ts` computes from canonical selectors; no external embed or arbitrary code is accepted.

Checkpoint D source `a57ae1e1e01197dfd83c5385d72dc90c9b519c5b` (2026-09-24): P04 missing-source rebind, P05 domain card styling and source-safe removal, P07 first-visible entrances/replay and Settings preference, P08 bounded color blends, P10 scoped Wealth sizing. Focused source/picker/recovery 8/8; motion (hero/ring/Wealth/Health bars, reduced/off and no-repeat) 6/6; affected Goal/Wealth browser journeys 4/4; visual gradient/Wealth/product model unit 25/25; TypeScript, scoped lint and diff check pass. These suites overlap earlier counts. Cached Playwright WebKit executable was checked and absent; physical Safari/available WebKit acceptance remains **unverified**. Source-only recovery archive `source-a57ae1e.zip` passed CRC, SHA256 `fd9cd2414e96e4c8e14b25848451eb31985611a8402ec4db632b63d91eab101a`. Remote/PR head independently matched, OPEN/DRAFT. None of these local checks is an owner visual or final integrated verdict.
