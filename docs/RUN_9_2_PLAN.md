# Run #9.2 implementation plan

> Execute in this existing worktree using subagent-driven-development for the independent public-market subsystem and fresh compliance review; root implements integrated showcase and product surfaces. Never create a new checkout, branch, release, PR or remote mutation.

**Goal:** complete the owner's 202 tracked requirements and make the app immediately reviewable through isolated Showcase Demo.
**Architecture:** retain Platform v3 and all pure financial reducers. A session-selected, namespaced sessionStorage adapter isolates showcase private/legacy data without touching real localStorage. Its deterministic builder emits validated Platform, Habit and Health schemas, dated showcase evidence and public identities. Markets reuses canonical identities and cached CoinGecko evidence. New composition, funding agenda, attention, consistency and nutrition selectors consume existing stores.
**Stack:** Next 16.3.5 / React 19 / TypeScript / Zod / exact BigInt / Vitest / Playwright. Node 24.19.0, pnpm 11.19.0.
**Spec:** `.superpowers/run9-2/request.txt`; checklist `docs/RUN_9_2_DELIVERABLES.md`.

## Tasks and checks

### Task 1: Public market identity and movement
- Own `lib/server/coingecko.ts`, new market-insights types/cache/route/hook and tests; extend public metadata only. Do not edit private schema, core quote schema, or root-owned UI.
- Expose one batched public request taking exact `MarketAssetRef[]` and currency, returning validated logo URL, 24h change and bounded dated sparkline where supported. Use existing shared provider admission and credential header. Long-lived logo metadata; never one request per render/card. Only allow validated CoinGecko asset hosts and prevent redirects/SSRF.
- Tests first: exact identity, real supported movement, no RWA fiction, malformed URL/response, bounds, deduplication, missing key, quota, last-good cache, public-only route schema.
- Return documented hook/types for root integration; root supplies all refs at page level and passes props to icons. Independently review subsystem before final integration.

### Task 2: Isolated Showcase Demo
- Create `lib/showcase.ts`, `lib/showcase-data.ts`, `components/showcase-controls.tsx`, `lib/showcase.test.ts`; modify private store consumers, legacy Goal provider and Settings to use explicit scoped storage.
- Public functions: `isShowcase(): boolean`, `getAppStorage(): Storage`, `showcaseStorageKey(key): string`, `buildShowcase(day: string)` returning validated private module data plus deterministic simulated market/history evidence, `loadShowcase()` / `resetShowcase()` / `exitShowcase()`.
- Use sessionStorage namespaced stores and a session marker. Prepare/validate complete dataset before writes, preserve prior session bytes and roll back on storage failure. Reload after explicit mode change; no implicit seeding or normal-store writes. Prevent wallet connection in showcase and retain original normal connection behavior outside it.
- Write red tests: real localStorage sentinels byte-identical after load/edit/reset/exit; independent tabs; deterministic inventory and funding states; histories valid; no real network used for fixture evidence; backup/import and failure rollback.
- Dataset: all required 13 holdings, 7/8 favourites with owned-only and favourite-only examples; six Goal types/examples and five statuses; plans/contributions/match/unmatch/history/reversal/surplus; six Habits with 30-day logs; meals/macros/weight/activity supported data; dated Goal/wealth/Activity evidence.

### Task 3: Consumer product surfaces
- Create `/app/markets`, portfolio composition, funding agenda, needs attention, Quick Add dialog, logo/market movement presentation. Modify Today, Wealth, watchlist, asset detail, picker and cards without new financial reducers.
- Use only canonical data: USD and EUR separate, contributions explicitly matched, unknown values missing not zero; attention items link to corrective flow. Use existing form destinations.
- Exact four-span slogan with two identical gradients; improve Financial Orbit; align consumer contexts and classify remaining Funding Health strings.
- Tests first for attention and agenda selectors, composition totals, Markets ownership separation, exact wording, logo fallback, keyboard Quick Add and supported chart ranges.

### Task 4: Life and page audit
- Improve Health via actual nutrition summary, meal timeline/distribution and diary; preserve planned modules. Improve Habits via consistency heatmap/weekly momentum using existing logs. Audit Goals/create/edit/detail, Activity, Ecosystem, Settings and all forms.
- Shared readable functional text >=14px, body 15–16px; preserve high-contrast decorative eyebrows and smooth gradient rings. Responsive composition 1440/1024/390/320, accessible exact chart tables, image fallback, reduced motion.
- Browser tests verify fields/controls and actual saved state, not CSS existence alone. Screenshot every requested surface using explicit Showcase mode.

### Task 5: Final verification and compliance
- Run complete unit/static/build/production browser gates. Existing tests remain; documented justified selector updates only.
- Build/sanitize Alpha, local Workers full browser/security checks and Wrangler dry run only. Dependency audit, generic secret and exact existing-key scans with values suppressed.
- Capture final code at all four widths, inspect screenshots, refine and repeat affected checks. At least 21 surfaces / four widths where applicable.
- Fresh independent reviewer receives complete prompt, manifest, diff and screenshots and first returns gaps without implementation. Fix every valid mandatory gap and re-review.
- Update manifest to evidence-backed VERIFIED (or precisely proven external provider block with fallback). Produce 35-point report with full checklist, verification README, STATUS and genuine remaining backlog. Local commit only; report exact HEAD and clean git status.

## Interface conflict audit
| Tasks | Shared interface | Resolution |
|---|---|---|
| 1/2 | Canonical market refs and fixture evidence | Public insights types are additive; fixture evidence labelled by root outside provider cache |
| 1/3 | Hook/type consumed by UI | Worker owns public subsystem only; root owns all UI integration |
| 2/3/4 | Current scoped stores | Root owns storage adapter integration before populated page QA |
| 3/4 | Typography and page layout | Root consolidates final global stylesheet; component module styles remain scoped |
| All/5 | Final evidence and manifest | Single coordinator updates statuses from observed test/browser/artifact results |

Each task's tests target its public behavior and each implements the files listed above; no mandatory requirement is intentionally deferred. The user has explicitly authorized this product direction and execution; no additional design-approval pause is required.

## Owner steering — 21 September
Exact corrected hero: **Today's Goals, Habits & Health = Tomorrow's Wealth**. Capitalize Goals. Keep the complete first phrase on line 1; only **= Tomorrow's Wealth** on line 2. Same two gradient spans; bright remaining text. Verify both lines at 1440/1024/390/320 and refresh final screenshots. This supersedes lowercase Goals and free wrapping in the original attached specification.
