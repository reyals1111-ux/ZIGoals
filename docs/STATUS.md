# Landing V4 integration — the apex company site (2026-10-01, branch `landing/final-v4-integration`, not merged or deployed)

The owner-approved V4 landing page replaces the one-page hero that `landing/` has carried until now, so a future apex deploy can no longer publish the obsolete page. The design came from the isolated standalone concept at `/Users/Shared/ZIGoals-Website-Concept`, which was read and left unmodified; this PR imports it, hardens it and documents it. It does not touch the Alpha application.

Evidence labels:
- **local**: this machine (Node 24.19.0 via the repository pin, pnpm 11.19.0, Chrome `chrome` channel driven by Playwright 1.63.0).
- **Workers-Assets**: the deployable bytes served by `wrangler dev --config ../../landing/wrangler.jsonc --name zigoals`, so `_headers` applies exactly as Cloudflare applies it.

No Cloudflare account, secret or deploy was used, and no wrangler command reached Cloudflare. Base: main `75bf649` (merge of PR #53). The apex Worker remains `zigoals`; the Alpha Worker `zigoals-alpha` was neither configured, deployed nor read from an account. No DNS, route or custom-domain change is in this PR.

## Parts
| Part | Result | Commits |
|---|---|---|
| 1 | **TIER 3 (deploy config checks).** The apex upload allowlist becomes deny-by-default instead of "exactly `index.html`", and `landing/_headers` adds the security policy the apex has never had. Every existing isolation rule is unchanged | `3262534` |
| 2 | **The V4 page.** `index.html`, 7 stylesheets, 4 scripts, brand mark and favicons, the Open Graph card, and the 19 real public-Alpha captures the page references. Byte-identical to the approved source | `976f616` |
| 3 | **Film and origami scroll.** The two optimized film encodes, the poster, and 162 scroll assets — six shapes × (20 desktop frames + 6 mobile frames + 1 settled still) | `8944e83` |
| 4 | **Verification package** (`docs/verification/landing-v4/`) and the corrected apex procedure in `docs/deployment/LANDING.md` | `70f7ee4` |
| 5 | This entry | `bbb56d0` |
| 6 | **The landing contract tests carried over to V4**, plus checks for the equation's stepped reveal and its reduced-motion settled state | `014d7b3`, `5288263` |
| 7 | **The equation's stepped reveal repaired** — owner-instructed, fifteen added lines confined to the equation, fully lit state measured unchanged. Below | this commit |

## What changed in the page
Four edits. One is the equation reveal repair below, which restores authored behaviour rather than introducing design. The other three are not design at all: the `noindex, nofollow` meta is gone (the apex is the public company site), the comment calling the canonical and social URLs "illustrative" is gone, and the footer's `LOCAL WEBSITE CONCEPT` label is gone — its decorative mark stays, so the footer's three-column balance is unchanged. Copy, layout, palette, motion, the equation treatment and the exact owner slogan are the approved bytes. The old landing's Google Fonts CDN link and fabricated CSS "Z" favicon go with the old page.

## TIER 3 commit and risk
- `3262534` **(deploy config checks):** `landing/.assetsignore` still opens with `*`; only ten approved public paths may be re-included, type denials follow them, and `check-deployment-configs.mjs` additionally walks the real `landing/` tree and fails on any non-public file. Risk: a stricter check could refuse a legitimate future file — it refuses only configs, docs, review material, build tools, capture sources, dev-server state and test files, which must never reach the public apex. Worker names, `assets.directory`, host-scoped routes and the ban on bindings/vars/services are untouched, as are all Alpha-side rules. Behaviour-preserving for `zigoals-alpha`.
- `landing/_headers` introduces **no HSTS**, no `includeSubDomains`, no `preload` and no Cloudflare zone change. The live apex returns no security headers at all today (`curl -sSI https://zigoals.app/`, 2026-10-01), so this only adds protection.

## Numbers (local unless stated)
- **Payload:** 204 files, 7,481,170 bytes. First view — HTML, all CSS, all JS, the preloaded brand mark and the favicon — is 220,290 bytes across 14 files. The hero requests no origami frame and no video.
- **Film:** 2,601,932 bytes desktop, 814,441 bytes mobile, 71,338 bytes poster, re-measured after import. The 15,737,961-byte 4K master is not committed.
- **Origami:** 120 desktop frames / 1,934,676 bytes, 36 mobile frames / 258,896 bytes, 6 settled stills / 200,488 bytes — reproducing the standalone measurements exactly. The frames provably come from the approved film: the provenance manifest's source hash `219ecaae…447e` matches the master on disk.
- **Contrast:** the standalone QA's "violet large-text stop at 2.89:1" came from a synthetic all-white backdrop. Against the real page background that stop is 8.25:1, and rendered pixels sampled with the origami screen-blend layer at full strength measure 7.40:1 to 17.95:1 across ten text elements. No design change.

## Tests
- `pnpm check:deploy-configs` pass; `WRANGLER_SEND_METRICS=false pnpm check:landing` pass (Wrangler 4.144.0 reads 225 entries — 204 files plus 21 directories — then ignores `.assetsignore`, `wrangler.jsonc` and `_headers`).
- `pnpm typecheck` pass; `pnpm lint` pass.
- `pnpm test`: **213 files passed, 8 skipped; 1989 tests passed, 12 skipped.** `scripts/check-deployment-configs.test.ts` goes from 20 to 59 tests; each new rule was run as a negative control before being trusted, with 34 deliberately broken variants each producing their specific error.
- **Workers-Assets, 65 browser checks, all passing.** Five viewport sizes (1920×1080, 1440×900, 768×1024, 430×932, 390×844), each loaded and scrolled end to end: no horizontal overflow, no broken image, no failed request, no page error, no console error or warning, and zero third-party network requests at every width. Muted desktop autoplay with opt-in sound and a Replay offer; a phone downloads no video and keeps the poster; all six origami chapters render in order; reduced motion hides the canvas, downloads no transition frame and shows the settled stills; keyboard focus rings on the first 14 stops; FAQ, image dialog and mobile menu operate and return focus. `/wrangler.jsonc`, `/.assetsignore` and `/_headers` each answer 404 while the header rule is applied.
- **Links:** every external destination is one of the four approved ones, each `target="_blank" rel="noopener noreferrer"`, every in-page anchor resolves, and all four answer HTTP 200. X refuses automated browsers (403 to Playwright's client, `ERR_HTTP_RESPONSE_CODE_FAILURE` to automated Chrome), so the two X links were confirmed with an ordinary client; they are the pair worth one manual click before release.
- **Claims:** every substantive claim re-validated against this base and the live Alpha, not the 30 September snapshot. Unaudited Alpha, disabled financial signing and broadcasting, undeployed Goal Manager, disabled mainnet execution and built-but-inactive hosted sync all still hold; Sessions E, G and H moved none of those boundaries. See [CLAIMS.md](verification/landing-v4/CLAIMS.md).
- **Privacy:** all 19 captures were opened and read, not sampled — no email address, wallet address, account identifier, person's name, real balance or real health record.

## Landing contract tests and an inherited defect
`apps/web/tests/landing.spec.ts` is the landing's own contract test and the import invalidated all of it — it asserted the old `Explore the Alpha →` CTA, the old `.alpha-note` copy, the old `.consumer-slogan` markup and a `data:` favicon, and served `index.html` alone from an in-memory server, which cannot render a multi-file site. It is rewritten against V4 with no assertion dropped: the harness serves the real `landing/` directory with Cloudflare's content types, every original assertion has a V4 equivalent, and four are new (no third-party request, no Google Fonts link, the equation's stepped reveal, its reduced-motion settled state). The same two ported assertions were applied to `tests/run9-2-visual.spec.ts` and `scripts/verify-hosted-alpha.mjs`. Those three files are the only ones this work touches outside `landing/` and `docs/`. Local: 6 passed, 2 platform skips; the reveal check fails as a negative control when `motion.js` is forced to activate every word at once.

**The equation's four-step reveal did not reach the words** (owner-reported, reproduced, now fixed). The state machine and the four progress bars stepped correctly — `Goals`, `+ Habits`, `+ Health`, `= Wealth` — but every word measured `opacity: 1` throughout, because `styles/final-v4.css` carried an unconditional rule with the same selector and specificity as the dimming rule in `styles/motion.css` and loads last. Removing it only half works: V4 paints one continuous spectrum from the parent `.equation-inputs` with `background-clip: text` and forces `color: transparent !important` on the children, so a child's `opacity` cannot dim a glyph the parent fills — measured with the rule removed, `= Wealth` faded correctly while the three inputs stayed bright and only shifted 10px. The standalone package has identical bytes and behaved identically, so this was **not** an import regression; it was a latent defect in the approved V4.

Fixed on the owner's instruction (option 3 of the three written up): an inactive part carries the existing quiet `#6a7c9c` from `base.css` and hands the glyph back to the parent gradient when its step lights, with each `+` lighting alongside the word it introduces. Fifteen added lines in `styles/final-v4.css`, no deletions, nothing outside the equation. **The fully lit state is unchanged and that was measured, not assumed:** at step 4 every part is `color: transparent` exactly as before, and a pixel comparison of the 1328×900 equation crop against the same frame from the committed stylesheet differs by at most 3/255 per channel, where two runs of the same stylesheet differ by up to 2/255. The quiet colour sits at 4.40:1 on the section background and below every stop of the equation's own gradient (luminance 0.199 against 0.246–0.560), so a quiet part always reads as subordinate while staying legible — the authored `opacity: .13` computed to about 1.56:1. Measured unchanged in every other mode: `prefers-reduced-motion: reduce`, `?motion=off` and phones at 390px light all four steps with no scrolling, and `forced-colors: active` still paints the whole equation `CanvasText`, because the new rules live inside `@media (forced-colors: none)`.

## Not verified / deliberately not done
- **Physical iPhone Safari in the foreground is unverified.** Everything above is Chrome on macOS; the standalone package said the same, and importing does not change it. Do not read these results as a Safari pass.
- `prefers-contrast: more` is unhandled by the stylesheets (`prefers-reduced-motion` and `forced-colors: active` are handled). The minimal fix would be additive — one media block that hides the origami layer and paints gradient headings in the solid text token — and is deliberately left out of this PR for a separate owner decision.
- No WCAG certification, Core Web Vitals measurement, Low Power Mode test, slow-network test, back/forward-cache test, screen-reader pass or security audit is claimed.
- The local dev server answers `Range` with `200` and the whole file rather than `206`, so range behaviour could not be exercised locally. Cloudflare's production asset server supports ranges; the page has no seek control.
- **No deployment happened.** `zigoals` was not published, `zigoals-alpha` was not touched, no DNS or custom-domain assignment changed, and no automatic deploy was enabled. Publication is a separate owner gate; the procedure is in [LANDING.md](deployment/LANDING.md).

# Alpha deploy — 2026-10-01 afternoon, `75bf649` live

Evidence labels:
- **CI log:** the deploy job's step "Report version IDs even after failure" in the run below, read via the Actions API by the Session G cloud session on 2026-10-01.
- **Actions API** / **git:** read at the same time.

- **Run:** Manual Alpha deployment #18, [run 36893334826](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36893334826), 2026-10-01 16:37–16:45 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `75bf6497400f1c19915a0e8ec20634faf1baf65f`, `main` after #53. (Actions API, CI log)
- **Live Alpha:** Worker `zigoals-alpha`, new version `84cf9652-f7fc-4bd8-a83b-0f1c663172ff`. The last observed live version is the same. (CI log)
- **Rollback:** `be41026f-1be9-423e-b4d8-71d4be54aea0`, the version deploy #17 published, so the chain holds. (CI log)
- **CI on `75bf649`:** Milestone quality #297 ([run 36882221079](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36882221079)): success on attempt 2. Attempt 1 failed only in browser shard 2's "Install Chrome for Playwright (up to 3 attempts)" step, before any test ran (the known Chrome-download intermittent); every other job passed. (Actions API)
- **Owner manual checks:** not reported with this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#53](https://github.com/reyals1111-ux/ZIGoals/pull/53) (`75bf649`): Session H, the owner recovery admin tool (ADR-007 A), recovery-copy cleanup and stable storage error codes (QA-02/QA-03), zod `jitless` on the client (QA-25), and activation readiness (Stage 7 preflight, Stage 8 sheet).

**QA-02 and QA-25 are fixed on the live Alpha** with this deploy. Not re-measured on the live site by this session; the local evidence is in the Session H entry below.

# Session G — correctness fixes, Habits speed, worldwide number formatting, phone refinements (2026-10-01, [PR #54](https://github.com/reyals1111-ux/ZIGoals/pull/54), not merged or deployed)

Evidence labels:
- **local**: this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, production build `PUBLIC_ALPHA_UNDEPLOYED`, Playwright at most 2 workers and one run at a time, Chromium 141 standing in for `chrome`).
- **CI**: Milestone quality on the PR.

No account, secret, wallet or deploy was used. Base: main `61035dc`; main `75bf649` (Session H, #53) was merged in as `6659073`. Input: Session F's QA backlog ([QA_SWEEP_2026-09-30.md](qa/QA_SWEEP_2026-09-30.md)).

## Parts
| Part | Result | Commits |
|---|---|---|
| 0 | Alpha deploy #17 (`61035dc`, after #52) recorded; release identity updated. Alpha deploy #18 (`75bf649`, after #53) recorded in the final STATUS commit, at the owner's request. | `3f00127`, (final STATUS commit) |
| 1 | **Correctness**, one bug per commit, each with a test that failed first:<ul><li>Habits value fields read a decimal comma; "1,234" is refused with its reason (QA-01's twin).</li><li>Money and quantity fields: decimal comma and surrounding spaces read like Health; the Goal preview shows what saving reads, or why it refuses (QA-14). Chain amounts and `parseUnits` are unchanged.</li><li>An open Health page follows the journal day across midnight and keeps a half-typed entry (QA-16).</li><li>Titles made only of zero-width characters are refused in every create/edit form (QA-32); schemas unchanged.</li><li>Focus returns to a Wealth sheet's trigger, a new habit gets focus, one heading id on Today (QA-19, QA-20, QA-30).</li><li>Showcase exports are named `showcase-demo`; restoring demo data into real data needs its own confirmation (QA-17). Detected from the demo's fixed markers; backup format unchanged.</li><li>A fully allocated source cannot be included; a 0-unit source is refused by name (QA-15).</li><li>Today's Health card uses the journal day (QA-24); empty days get words, not "0 more chances" (QA-31); the timer day key comes from date parts (QA-34); Settings says what the older Goal export covers (QA-33).</li></ul> | `e960cf9`, `6405258`, `cc49284`, `800eb23`, `15ad75c`, `0d20012`, `a2bfc06`, `a593a5b`, `98da853`, `804aa43`, `9bd1dee` |
| 2 | **Performance** (QA-05): Habits day/stats/trends kept per habit object; one check-in re-renders one card (memoized cards, stable props, shared habit objects); a store no longer parses its own save again (**TIER 3**); Wealth and Today formatters built once, wealth history and overview linear and reused. Numbers below. | `877e203`, `798bde0`, `b65143b`, `c0c27f6` |
| 3 | **Locale-aware display** (QA-06, QA-29): one module, `lib/visual-format.ts`. Numbers and money follow the browser's locale, each currency keeps its own code, nothing is converted. Dates with words are English for the user's region (en-GB, en-DE…), so weekday and month names are English everywhere; digit-only dates follow the locale; ISO dates stay ISO. en-US is unchanged (freeze check: no difference from this part). | `5383293`, `e528cc5` |
| 4 | **Phone** (phone query only; freeze check: no difference from this part): "Show all N" for long Wealth and Today lists, Today's week folded into one line of totals; Habits calendar days ≥ 44 px down to 360 px; drag a sheet's grabber down to close it. | `81c3fc8`, `fe12e13`, `a05c5f7` |
| — | Merge main (Session H, #53) with a merge commit. Only `docs/STATUS.md` conflicted; both entries kept. When the owner later asked to merge main again (for deploy #18), `main` was still `75bf649`, already in this branch, so there was nothing new to merge. | `6659073` |
| 5 | **Copy and small UX:** one unlock restores several modules, readable module names (QA-21, UI only); one export file-name pattern (QA-26); one date format for contributions (QA-27); "1 time", "1 asset", "1 serving" (QA-28). One existing spec expected the old "1 pages" and now expects "1 page" (`d8d49f5`). | `89af0a0`, `8d3595b`, `b06cf56`, `a8c42e9`, `d8d49f5` |
| 6 | **Safari:** not run. Playwright's WebKit download is refused here (`cdn.playwright.dev`: CONNECT 403, organization network policy). | — |
| 7 | Evidence (below); review gallery: 37 WebP on `review/polish-g-screenshots` (`faf27fd`, never merged) and [one PR comment](https://github.com/reyals1111-ux/ZIGoals/pull/54#issuecomment-5935683736). This entry. | (this commit) |

`8d3595b` (QA-26) and `b06cf56` (QA-27) also carry QA-28's plural changes in the same files, which import `lib/plural.ts` from `a8c42e9`; on their own they do not build, together with `a8c42e9` they do. History was not rewritten.

**TIER 3 commit and risk:**
- `b65143b` **(private store)**, behaviour-preserving: `usePrivateStore` skips re-reading a localStorage store when the stored text is exactly what this instance just wrote or already holds; instances on one page share one parse of the same text (keyed by storage, key, schema and raw text). Transactional (IndexedDB) stores, other tabs and other keys refresh as before. Risk: a stale view if two different texts compared equal, which a string comparison rules out. Guard: `lib/private-store-echo.test.ts`.
- No new persistence key: the display locale, "Show all" and folded sections are not stored.

Not touched: auth/OTP, vault/recovery/encryption (`lib/vault/**`), the sync engine, wallet/Keplr, `parseUnits`, contracts/, workers/, scripts/, packages/, .github/workflows, deploy scripts, secrets, apps/web/AGENTS.md, CLAUDE.md. No new dependency; no data-format, sync-protocol or key change. CSP unchanged; no new network request.

## Intended desktop and tablet differences
Freeze check (`scripts/desktop-freeze-check.mjs`, run unchanged; it is Session H's lane) of the final build against `61035dc`: **52 of 130 captures differ, all intended**, 0 page errors. Parts 3 and 4 each added none (checked after each part).
| Change | Captures | Before → after |
|---|---|---|
| QA-31 (Part 1) | empty Today ×6 | "0% exact progress … 0 more chances to take a small step." → "No Habits scheduled today … Create your first habit to see today's rhythm." |
| QA-33 (Part 1) | Settings, empty and Showcase ×12 | one added line under Export Goal Data |
| QA-27 (Part 5) | Showcase Today ×6, Goal detail ×6, Quick add over Today ×2 | "1 CUSTOM · 9/30/2026" → "1 CUSTOM · 2026-09-30" |
| QA-28 (Part 5) | Showcase Habits ×6, Health ×6, Wealth ×6, Add asset over Wealth ×2 | "1 times per day" → "1 time per day", "1 servings" → "1 serving", "1 assets" → "1 asset" |

Also intended, not in the captures: the restore preview after a module restore (QA-21), export file names (QA-26), focus after closing a sheet or creating a habit (QA-19, QA-20), the new refusal messages (QA-14, QA-15, QA-32, Habits comma), the Showcase restore confirmation (QA-17), and any browser locale other than en-US (Part 3).

## Evidence
**Performance** (local, production builds, same machine, 45 habits / ~12,900 check-ins, 3 years of Health, 200 positions, restored through Settings; 3 runs × 10 taps each, Event Timing tap → next paint):
| | main `61035dc` | this branch |
|---|---|---|
| Habits: tap a check-in, median (p90, max) | 899 ms (1051, 1144) | **139 ms** (158, 170) |
| Habits: page ready / long tasks | 1325 ms / 977 ms | 763 ms / 481 ms |
| Today: page ready / long tasks | 1506 ms / 1676 ms | 834 ms / 564 ms |
| Wealth: page ready / long tasks | 1501 ms / 2699 ms | 788 ms / 765 ms |
| Health: page ready / long tasks | 610 ms / 402 ms | 576 ms / 340 ms |

The < 100 ms target was not reached. One tap still costs one long task (79–124 ms, median 94 ms), most of it `updatePrivateStore` in `lib/private-storage.ts` (Session H's file): it validates the new data twice (schema, then a parse of the serialized text), parses the previous text again for its version and measures the size with a `TextEncoder`. Proposal for its owner: validate `next` once and reuse the serialized text and its size.

**Phone audit** (Session E's method: page height ÷ viewport, production build, fixed clock; the driver stays in the scratchpad):
| Showcase | 390×844 | 375×667 | 360×800 |
|---|---|---|---|
| Today | 14.6 → **13.5** | 18.9 → 17.5 | 16.4 → 15.2 |
| Wealth | 15.7 → **11.3** | 20.1 → 14.5 | 17.3 → 12.6 |
| Settings | 14.1 → 14.1 | 18.0 → 18.2 | 15.5 → 15.7 (QA-33's added line) |

Empty data at 390×844: Today 10.4 → 10.1, Wealth 5.5 → 5.3. Every other page is unchanged within 0.1 screen. No page scrolls sideways at any size. Habits calendar days at 360×800: 40.3 px → ≥ 44 px (`tests/phone-refinements.spec.ts`).

**Tests:**
- Unit (local): 225 files, 1998 passed, 12 skipped.
- Full Playwright suite on the final build (local, app code of `a8c42e9`, one project at a time): desktop 361 passed, 12 skipped, 2 failed; mobile 350 passed, 24 skipped, 1 failed. The failures: `logo-quickadd-goals-header.spec.ts:52` (intro video, both projects), which this sandbox's Chromium cannot play (CLAUDE.md; it passes in CI); and on desktop `run10-source-pinning.spec.ts:67`, which still expected "1 pages" (updated in `d8d49f5`; 8 of 8 on both projects afterwards; the mobile run already had the update).
- New specs: `habits-decimal-comma`, `amount-input`, `health-midnight`, `invisible-names`, `focus-return`, `showcase-export-guard`, `goal-source-allocation`, `health-today-journal-day`, `today-empty-copy`, `display-locale` (en-US, de-DE, nl-BE, ja-JP; no hydration error), `phone-refinements`, `copy-polish`. New unit tests: `decimal-input`, `amount-input`, `visible-text`, `showcase-detect`, `habit-timer-day`, `habit-replace`, `habit-sharing`, `habit-card-render` (45 cards, one check-in → one card renders), `private-store-echo`, `wealth-cache`, `visual-format` (en-US parity with `toLocale…String`; en-GB, de-DE, nl-BE, fr-FR, ja-JP, hi-IN), `plural`.
- CI: on `a8c42e9` browser shards 1 and 3 failed on the one "1 pages" spec above (all else green); on `d8d49f5` Milestone quality #301 ([run 36893511772](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36893511772)) and Canonical reproducibility ([run 36893511489](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36893511489)) succeeded on attempt 1. This docs-only commit runs CI again.

**Known CI intermittents** (table below updated): `run11-recovery-failures.spec.ts:22` (mobile) hit the 45 s budget at `page.reload` (`net::ERR_ABORTED`) once, on `9bd1dee` ([run 36868939969](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36868939969)); it passed on every later run and 30/30 locally. On `15ad75c` ([run 36865907188](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36865907188)) two motion-timing specs failed once each: `run10-motion.spec.ts:5` (desktop, the hero's mid-entrance sample already equalled its end) and `brand-nav-polish.spec.ts:51` (mobile, the navigation glide). Neither file nor the code it measures changed afterwards, and both passed on every later run and in both local full suites. On the merge commit `6659073` ([run 36884511291](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36884511291)) browser shard 2 failed in "Install Chrome for Playwright" (all 3 attempts) before any test ran; the next push ran everything again.

## Decisions made without the owner
- **en-US stays exactly as before**, so QA-06's dropped trailing zero ("$47,900.5") is unchanged: keeping cents would change en-US. Owner decision.
- **Hydration:** the server render and hydration always use en-US. Right after hydration the Shell switches to the browser's locale in a layout effect and remounts the page content once, before the first paint and while the workspace is still hidden; en-US never remounts. No hydration error in en-US, de-DE, nl-BE or ja-JP (`display-locale.spec.ts`).
- **What follows the locale:** grouping, decimal sign and digits for numbers and money; currency stays per currency (`501.800 $` in de-DE, `US$ 501.800` in nl-BE). Raw amounts shown without grouping today ("1234.5 ZIG", percentages, habit counts) keep their digits ungrouped and change only the decimal sign. Form inputs are never localized.
- **Dates:** a date or time with words is written in English with the region's order (en-DE "1 October 2026"); digit-only dates follow the locale ("1.10.2026"); ISO dates shown as ISO stay ISO.
- **Typing in dot-grouping locales:** fields keep reading "." as the decimal sign everywhere. Refusing "1.234" in de-DE would also refuse values the app itself prefills (Health pounds such as "154.324"). The Goal preview shows the parsed amount in the user's locale, so a mistaken "1.234" is visible before saving.
- **Today is 13.5 screens, not ~10:** its lists were already capped (Needs attention 4, Recent activity 4, habits 3). The rest is the user's own arrangement of modules, each with its honesty line; folding whole modules would hide them. Wealth reached 11.3.
- **Recent activity on phones** shows the 2 latest records (the other lists keep every item in the page behind "Show all"); its existing "View all →" opens Activity.
- **Forms stay in place, with their action pinned** (habit editor and food log, as since Session E): the food log, Water and the wallet/APR forms are permanent forms in the page, not opened by a trigger; a modal habit editor would make the rest of the page inert while Quick add, focus return and existing journeys drive it in place. Water and APR forms are one or two fields with the button right below, so nothing needed pinning.
- **Drag-to-dismiss** is one phone-only listener, not an edit of each dialog: no dialog's markup changed (the transaction review included), and a completed drag closes through the same `cancel` path as Escape.
- **QA-21:** the decrypted preview stays in memory until Done, Cancel or an account change (it was already in memory while previewed); the secret is still cleared at unlock.
- **QA-26:** the date in export names is the local date; encrypted and recovery file names are unchanged.
- **QA-28:** only the plural units the app offers ("times", "minutes", "days"…) become singular after 1; a unit the person typed stays as typed.
- **Session H's UI hand-off** (map `STORAGE_FULL`/`MODULE_LIMIT`/`CONFLICT` in the UI: QA-03's check-in message, QA-18, QA-22) is left for a follow-up: it changes `use-private-store.ts` (TIER 3) and H marked it "later".
- `scripts/desktop-freeze-check.mjs` is Session H's lane: it ran unchanged and the intended differences are listed above instead of in its `INTENDED` list. No phone audit script was committed (scripts/** is H's); the method is the one Session E recorded.
- The render-count guard uses React's own `Profiler` and `createRoot` in jsdom (no new testing library).

## Deferred / not done
- **WebKit / Safari:** not run; the environment's network policy refuses `cdn.playwright.dev`. The owner can allow that host (or a broader access level) under Network access in the cloud environment's settings.
- **Habits < 100 ms:** 139 ms median (proposal above, in Session H's file).
- **Today ~10 screens:** 13.5 (above).
- **Storage error codes in the UI** (QA-03 message, QA-18, QA-22): follow-up on top of #53's codes.
- **Owner decisions, unchanged:** QA-04 (funding days in UTC), QA-23 (offline shell), QA-35–38 (format and honesty decisions), QA-06's trailing zero.
- **No real-device check.**

## How the owner can review
1. `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101`, then Settings → Load Showcase Demo.
2. **Locale:** Chrome → Settings → Languages, put Deutsch (Deutschland) or Nederlands (België) first and reload: money, numbers and digit-only dates follow it; month and weekday names stay English. Back to English (United States): exactly as before.
3. **Habits speed:** restore a large Habits backup and tap Complete; one card updates.
4. **Phone:** DevTools device mode at 390×844 and 360×800: Wealth "Show all 13 assets", Today's folded week, the Habits calendar, and drag a sheet's grabber (Add asset, More).
5. **Restore:** Settings → Restore an encrypted backup → restore one module, then another without the secret again.
6. **Review screenshots:** the gallery comment on the PR.

# Session H — owner recovery admin tool (ADR-007 A), recovery-copy cleanup, activation readiness (2026-10-01, [PR #53](https://github.com/reyals1111-ux/ZIGoals/pull/53), not merged or deployed)

Evidence labels:
- **local**: this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, production build `PUBLIC_ALPHA_UNDEPLOYED`, Playwright at most 2 workers, Chromium 141 standing in for `chrome`).
- **Miniflare**: local workerd through Miniflare; no Cloudflare account.
- **CI**: Milestone quality on the PR.

No account, secret, wallet or deploy was used, and no wrangler command reached Cloudflare. Base: main `61035dc`. Session G records Alpha deploy #17; this entry does not.

## Parts
| Part | Result | Commits |
|---|---|---|
| 1 | [ADR-007](architecture/ADR-007-owner-recovery-admin.md) accepted: option A (owner decision 2026-10-01). Alternatives kept as recorded, with an implementation note added | `a986111` |
| 2 | **Owner recovery admin tool**, delivered as:<ul><li>a local-only admin Worker and an unconfigured template;</li><li>a seventh ignored 0600 config (`make-private-configs.mjs --recovery-admin`);</li><li>`activation-check` admin rules, plus a scan of every Worker config;</li><li>the CLI `scripts/run11/recovery-admin.mjs` (status, export, verify, dry-run, reconcile);</li><li>Miniflare end-to-end tests;</li><li>the [owner runbook](run11/OWNER_RECOVERY_ADMIN.md);</li><li>ACTIVATION Stages 5 and 8, with the owner's Stage 5 decisions.</li></ul> | `22cc9af`, `9e51020`, `ef44979`, `0593850`, `94c6172`, `9dba9ac` |
| 3 | **QA-02/QA-03.** After a successful restore, only the newest recovery copy per module is kept. Storage errors carry stable codes (`STORAGE_FULL`, `MODULE_LIMIT`, `NEWER_VERSION`, `CONFLICT`) with plain messages | `77483a2`, `2ffee65` |
| 4 | **QA-25.** zod `jitless` on the client removes the blocked-eval CSP violation from every page. Applied: identical results, and no slowdown on the browser's path | `d8d6cd6` |
| 5 | Done:<ul><li>Stage 7 preflight (read-only, offline);</li><li>the [Stage 8 acceptance sheet](run11/STAGE8_ACCEPTANCE.md);</li><li>the [timezone backlog](product/TIMEZONE_BACKLOG.md);</li><li>the `status-snapshot` fix.</li></ul> | `3a59906`, `3c6e2c4`, `96bbdc6` |
| 6 | Evidence (below), and the root cause and fix of the `market-disconnect.test.mjs` intermittent (Known CI intermittents, below). This entry | `aa7cdaa`, `e73142c`; `11222cb` and this commit (STATUS) |

**TIER 3 commits and risk:**
- `22cc9af` **(admin tooling):** a new local-only Worker and template. Risk: none at runtime. Nothing binds or deploys it.
- `9e51020` **(admin tooling):** new checker rules and a generator flag; the six-config rules are unchanged. Risk: a stricter check could refuse an owner's existing setup. It refuses only routes or bindings that must never exist.
- `ef44979` **(admin tooling):** the owner CLI.
  - Risk: it runs `wrangler dev` with a remote binding under the owner's login. That behaviour is **UNVERIFIED** until the Stage 7 rehearsal.
  - No deployed surface; it fails closed.
- `77483a2` **(vault):** deletes old `:recovery:` copies after a successful restore.
  - Risk: this deletes user bytes by design (owner-approved). Safeguards:
    - only that module's copies, and only after success;
    - only when the replaced store read as valid;
    - never the current copy;
    - put back byte for byte if a make-room retry fails.
  - Formats, keys, sync and UI are unchanged.
- `2ffee65` **(vault):** one more guard. A stored module whose refinement throws counts as unreadable, so the restore proceeds and keeps every copy.

Not touched: wallet, contracts, key derivation, the sync protocol, user data formats, `.github/workflows`, the deploy scripts, CLAUDE.md and AGENTS.md. No new dependency.

Out-of-lane files, each checked against G's branch before editing. Re-checked at G's `9bd1dee`: no file is changed by both branches. G's `private-backups.tsx` change adds the Showcase-file confirmation; the restore error text is as before.
- `apps/web/lib/private-storage.ts`: call sites only;
- `apps/web/instrumentation-client.ts`: new, one import.

## Part 2 — recovery admin (details)
- **The CLI:**
  - It refuses unless the ignored owner configs name one private lifecycle Worker: admin binding → that Worker; private sync's `LIFECYCLE` → the same Worker. No other config may bind the entrypoint.
  - It starts `wrangler dev` itself on 127.0.0.1, with the dev registry off and a per-run session token, then stops it after one command. wrangler's output is never printed.
  - `export` writes a new 0600 file outside the checkout and prints the digest and counts only.
  - `reconcile` requires `RECOVERY_MODE=reconcile`, then a dry run, then the owner typing the UUID and digest. It then re-exports and compares digests.
- **Miniflare end to end** (`recovery-admin.test.mjs`, 7 tests): the real admin Worker → a local binding → the real `LifecycleRecoveryAdmin`, using the lifecycle-recovery fictional identities.
  - Flow: export → verify → dry-run → reconcile after a total loss → re-export → replay.
  - Refusals: wrong mode (CLI and Worker), wrong digest, foreign anchor, wrong account, missing or wrong typed confirmation, non-0600 input or output, output inside the repo, a stray binding, `.dev.vars`, a missing session token.
  - The output never contains the UUIDs or checkpoint fields.
  - Mutation checks: removing the token check or the mode check fails the tests.
- **Checker tests** (`recovery-admin-config.test.mjs`, 38): the admin config is refused for each of:
  - a route, `workers_dev`, preview URLs or a cron;
  - a queue, KV, DO, vars, an account id, a second binding or `remote:false`;
  - a wrong entrypoint or service, logging, or the Alpha name.

  A recovery binding added to any of the six runtime configs, the Alpha config or landing is reported.
- **UNVERIFIED (owner rehearsal at Stage 7, runbook steps 3–8):**
  - that a named-entrypoint remote binding works on the owner's account;
  - that wrangler's remote proxy session is not reachable from outside.

  Read from wrangler 4.144's code: it uploads a temporary edge-preview proxy (with `workers_dev` on) that holds the binding, and it creates a `workers.dev` subdomain if the account has none. Fallback if the rehearsal fails: option B, with Stage 5 staying paused.

## Part 3 — recovery copies and storage errors (details)
- **Policy (all three restore paths: browser-storage modules, transactional modules, legacy simulation):**
  - after the module write succeeds, remove that module's other copies;
  - in browser storage, if the write is refused for space, older copies are held in memory, removed, and the write retried once. If the retry fails, they are put back.
  - The one-time cleanup of copies piled up by earlier builds happens on the **next successful restore**. Existing copies have random keys with no order, so only a restore makes a known-newest copy.
- **Unit tests, failing first on `61035dc`: 13 of 17 failed** (the 4 guards pass on both), and `storage-errors.test.ts` (3) cannot load there. `2ffee65`'s added test failed first on `77483a2`.
  - Session F's sequence (10 large restores, Chromium-like quota): on main, restore 7 is refused (`QuotaExceededError`, 4 Habits and 2 Health copies). On this branch all 10 succeed, with 1 copy each and 3.2 of 5.24 M units used.
- **Browser** (local, Settings UI, F-sized files of 1.38/1.96/1.41 MB Habits and 1.16 MB Health):

  | | main `61035dc` | this branch |
  |---|---|---|
  | F's 8 restores | restores 1–3 ok; 4–8 fail ("A newer stored version cannot be replaced") | 7 of 8 ok, one Habits copy throughout |
  | A store plus 2 piled-up copies, then a restore | fails | ok; copies 2 → 1 |

  Restore 7 still fails on the branch, and correctly. A Health copy no longer fits beside Habits at 1.96 MB with its own copy. Removing another module's copy is not allowed, so this is genuinely full: `STORAGE_FULL` in the lib. The remedy is transactional storage.
- **For Session G (UI, later; nothing needs to change now):** `storageErrorCode(error)` in `lib/vault/storage-errors.ts`.
  - `components/use-private-store.ts` (`importData`/`update`) currently throws a new Error without the cause. Keeping `{cause: error}` there lets `private-backups.tsx` and the check-in surfaces map these codes:

    | Code | Suggested text |
    |---|---|
    | `STORAGE_FULL` | "Your browser storage is full…" (`storageErrorMessage`) |
    | `MODULE_LIMIT` | "…more than the 2 MB this module can hold…" (QA-03) |
    | `NEWER_VERSION` | the current text, which is accurate only for this case |
    | `CONFLICT` | "changed on another tab or device" |

- **Found by the Part 4 corpus, not changed:** some schema refinements throw a TypeError on malformed input instead of reporting an issue. One example is `habits.ts:74` (`rules[0]` when `rules` is empty); finance has similar cases. `safeParse` then throws. Every caller already treats that as a failure, so no data is at risk. A fix belongs to the module owner.

## Part 4 — zod CSP probe (details)
- **CSP:** across 11 pages, main showed 11 blocked-`eval` violations and this branch 0. `__zod_globalConfig.jitless` is true on every page (local, production builds, Chromium).
- **Equivalence** (`lib/vault/zod-jitless.test.ts`): JIT-built and jitless-built copies of 13 stored-data schemas agree on **10,802** valid, mutated and invalid inputs, for acceptance, output, issues, and the 24 inputs where a refinement throws. A `Function` spy shows that the jitless copies never compile.
- **Timing** (`scripts/zod-jitless-benchmark.mjs`, Node 24, power-user stores: 45 habits / 12,915 check-ins, 3 years / 3,288 meals, 200 positions). Median ms: JIT / eval blocked as in the browser / jitless.

  | Store | JIT | Eval blocked | Jitless | Jitless vs eval blocked |
  |---|---|---|---|---|
  | finance | 4.5 | 7.1 | 7.9 | +10.4% |
  | habits | 36.5 | 51.9 | 55.3 | +6.4% |
  | health | 39.3 | 69.0 | 68.0 | −1.4% |

  Both of the last two columns run the same interpreted parser, so the differences are noise (finance moved ±25% between rounds). JIT never ran in production browsers; only `next dev` loses it.

## Part 5 (details)
- `scripts/run11/stage7-preflight.mjs` (10 tests) checks:
  - clean git, HEAD containing main, and full history;
  - Node, pnpm and wrangler pins;
  - all seven configs ignored and 0600;
  - `--private`, with `MARKET_POLICY` reported apart as **KNOWN (Stage 6)**;
  - `RECOVERY_MODE=reconcile`;
  - the admin config.

  It prints the five Stage 7 secret names with their sources and commands, never values.
- `status-snapshot.mjs` reported `05de2b25-…` (2026-09-28) as the live Worker: its pattern expected a colon, and newer entries write a comma. It now reads the current "Release identity". Session E's note itself was not found in the repo or on PR #52; this was the stale version the script printed.

## Numbers (local unless stated)
| | Result |
|---|---|
| `pnpm lint` / `pnpm typecheck` | clean / clean |
| `pnpm test` | 1,954 passed, 12 skipped (221 files); the same in CI on `aa7cdaa` |
| Lifecycle and Worker harnesses (`lifecycle-recovery` 4, `lifecycle-runtime` 5, `domain-deletion` 2, `recovery-admin` 7, `recovery-admin-config` 38, `activation-check` 9, `make-private-configs` 24, `stage7-preflight` 10, `status-snapshot` 2, `market-disconnect` 2) | 103/103 |
| Focused browser specs (export-roundtrip, local-simulation-backup, product-data, run10-private-vault, run10-restored-today, run11-recovery-failures, private-read-delay) | 38/38 (3.1 min) |
| Playwright full suite, 2 workers, production build of the final app code (`96bbdc6`; later commits change docs and one script test only) | 634 passed, 36 skipped, 8 failed (46.4 min). Of the 8, 2 are the intro-video specs (this sandbox's Chromium cannot play the video; known). The other 6 are timing under two-worker load: `run11-route-mobile-acceptance:4` and `ui-evidence:97` (45 s budget, desktop and mobile), `motion-polish:166` and `run10-motion:5` (mobile, animation sampled at rest). Run alone with 1 worker, all 8 pass on this branch and on main `61035dc`, with equal timings (route 33.4/35.3 s here vs 35.6/34.7 s on main), so this is not a regression |
| CI | Green on `aa7cdaa`: Milestone quality ([run 36872688014](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36872688014)) passed web checks, browser shards 1–3, web integration (with the Run11 package and the Alpha Workers gate) and contract. Canonical reproducibility ([run 36872687891](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36872687891)) passed builds A and B and the compare step. On `11222cb`, web checks failed in `market-disconnect` (below); `e73142c` fixes it. This commit's run is on the PR |

**Known CI intermittents:** `scripts/run11/market-disconnect.test.mjs` "abort of an actual app request…" (web checks; already in the table below from #42 and #52) timed out at 30 s on `96bbdc6` ([run 36863279127](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36863279127)). It timed out again on the next commit, `9dba9ac` ([run 36864633479](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36864633479)), which served as the one re-run. A second failure means investigate, so it was not re-run again.
- **Not caused by this branch.** Its Worker bundles are byte-identical to main's (after path normalisation), and this branch does not change the market code it exercises. Locally it did not reproduce: alone, in the full suite, with and without the Vitest cache.
- **Why the message said nothing.** Two things hid the cause:
  - `finally` awaited the in-page follower, which never settles once a step has failed;
  - Chrome's start shared the case's 30 s with Playwright's own 30 s launch timeout.

  Either one surfaced only as "Test timed out in 30000ms".
- **`aa7cdaa` (test only, no assertion changed):** it builds the bundles once, names the setup steps, closes the browser before settling and bounds the settle. It passed CI. But its 10 s step limit was tighter than the setup had before.
- **Root cause, named on `11222cb`** ([run 36875302540](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36875302540)): "Chrome launch did not finish within 10000 ms", in both cases. This is Chrome's cold start on a busy runner. When the 10 s limit fired, the launch also left its browser unclosed.
- **`e73142c` (test only; no assertion changed, case timeout still 30 s):**
  - Chrome starts once in `beforeAll`, outside each case's budget, still under Playwright's 30 s launch timeout;
  - each case uses its own browser context;
  - setup steps get what is left of the case's budget.
- **Reproduced locally** by delaying Chrome's start in temporary copies:
  - the `aa7cdaa` version with 12 s fails both cases at 10.5 s with CI's message;
  - `e73142c` with 25 s passes both;
  - a follower that never settles is still named at 11.7 s.

  Full `pnpm test` passed (1,954). The table row is updated.

## Decisions made without the owner
- **Branch:** `platform/recovery-admin-2026-10-01`, as in the brief. The harness proposed another name.
- **The CLI starts and stops `wrangler dev` itself.** It adds a per-run session token (DNS rebinding, other local processes) and turns the dev registry off. ADR-007 had the owner run `wrangler dev` separately.
- **The admin Worker lives in `workers/recovery-admin/`, and its copy is `wrangler.acctest.owner.jsonc`.** That follows the Stage 4 convention, so the existing ignore rule and file checks apply. The ADR had `scripts/run11/recovery-admin/` and `<prefix>.recovery-admin.owner.jsonc`.
- **Lowercase account UUIDs only.** The lifecycle authority keys its Durable Object by the exact string, and the provider issues lowercase.
- **A committed fictional rehearsal checkpoint** (`scripts/run11/fixtures/recovery-rehearsal-checkpoint.json`), so the owner's rehearsal uses no real account.
- **The deploy workflow is not changed.** It deploys a fixed `wrangler.alpha.jsonc`, and the new scan covers every config in the checkout.
- **One-time cleanup on the next successful restore**, not after a plain read. Existing copies have no order. A make-room retry keeps that reachable when storage is already full.
- **"A failed restore keeps its copy"** is read as "the module's existing copies are kept". F's merged fix still removes the failed attempt's own copy, which duplicates the unchanged store.
- **Durable restores also remove that module's older browser-storage copies.** They predate its move to transactional storage.
- **Migration copies** (`updatePrivateStore`) follow the same per-module rule on the next restore.
- **Storage messages:** the lib's quota message still contains "quota", so F's assertion is unchanged.
- **The zod init point** is `apps/web/instrumentation-client.ts` (new, runs before hydration), importing H's `lib/vault/zod-jitless.ts`. `app/layout.tsx` is G's file.
- **No new browser spec**, since UI tests are G's lane. Scratch Playwright drivers (not committed) gave the browser evidence.

## Owner next steps
1. **Stage 7 rehearsal**, with fictional data, following [OWNER_RECOVERY_ADMIN.md](run11/OWNER_RECOVERY_ADMIN.md) steps 1–10. Until it passes, hosted recovery is not relied on.
2. **Custody setup:**
   - two Bitwarden items per export (file, digest);
   - an AES-256 Disk Utility image on an offline stick;
   - an account inventory note.
3. **Before Stage 7 approval:** `node scripts/run11/stage7-preflight.mjs` in the ops checkout.
4. **Stage 8:** fill a copy of [STAGE8_ACCEPTANCE.md](run11/STAGE8_ACCEPTANCE.md).

# Alpha deploy — 2026-10-01 morning, `61035dc` live

Evidence labels:
- **CI log:** the deploy job's step "Report version IDs even after failure" in the run below, read via the Actions API by the Session G cloud session on 2026-10-01.
- **Actions API** / **git:** read at the same time.

- **Run:** Manual Alpha deployment #17, [run 36836555458](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36836555458), 2026-10-01 08:28–08:35 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `61035dc5ba3b26bafe41276599a0452b45c3208b`, `main` after #52. (Actions API, CI log)
- **Live Alpha:** Worker `zigoals-alpha`, new version `be41026f-1be9-423e-b4d8-71d4be54aea0`. The last observed live version is the same. (CI log)
- **Rollback:** `f00a117f-a283-4b6e-a8f7-ab0bfed248af`, the version deploy #16 published, so the chain holds. (CI log)
- **CI on `61035dc`:** Milestone quality #276 ([run 36834550733](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36834550733)): success on attempt 1. (Actions API)
- **Owner manual checks:** not reported with this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#52](https://github.com/reyals1111-ux/ZIGoals/pull/52) (`61035dc`): Session E, the phone experience and first-run welcome, plus the UI half of QA-01 (Health number fields are text fields with a decimal keypad).

**QA-01 is fixed on the live Alpha** with this deploy: both halves (#51's parser, #52's text fields) are now live. Not re-measured on the live site by this session; the local evidence is in the Session E entry below.

# Session E — native-quality phone experience + first-run welcome (2026-09-30 → 10-01, [PR #52](https://github.com/reyals1111-ux/ZIGoals/pull/52), not merged or deployed)

Evidence labels:
- **local**: this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, production build `PUBLIC_ALPHA_UNDEPLOYED`, Playwright at most 2 workers, Chromium 141 standing in for `chrome`).
- **CI**: Milestone quality on the PR.

No account, secret, wallet or deploy was used. Base: main `d21ba8f`. Session D was merged into this branch as `a2f11bc`, and main `771e2ad` (Session F, #51) as `e170f00`.

**Scope.** A phone experience only below 768 CSS px, or on a landscape phone (coarse pointer and at most 500 px tall): one query, `PHONE_QUERY` in `components/phone/use-phone-layout.ts`, guards every phone rule. Desktop and tablet are unchanged (freeze check below), except for one owner-authorized fix: QA-01.

## Parts
| Part | Result | Commits |
|---|---|---|
| 0 | Phone audit of every page at 390×844, 375×667, 430×932, 412×915 and 844×390 (Showcase and empty) and the design plan; owner-approved with four additions. | — |
| 1 | **Desktop/tablet freeze check** `scripts/desktop-freeze-check.mjs` (+ unit test): 130 full-page captures (11 pages × Showcase/empty × 1440×900, 1280×800, 1024×768, 820×1180, plus 820×1180 and 1180×820 with a coarse pointer, plus Quick add and Add asset open at 1024×768 and 820×1180-touch), compared pixel for pixel and by accessibility snapshot. Fixed clock, 503 API fixture, reduced motion; each capture waits for running animations. | `707e355`, `b8500ab`, `40aaada`, `5521773` |
| — | Merge main (Session D, PR #50) with a merge commit; its slow-read panel gets phone gutters. | `a2f11bc` |
| — | Merge main (Session F, PR #51) with a merge commit. Only `docs/STATUS.md` conflicted (both PRs add an entry at the top). | `e170f00` |
| 2 | **Phone shell**: top bar (logo or "Back to Goals/Wealth", compact title, Quick add, Settings), glass tab bar Today · Goals · Habits · Health · More, More sheet (the other six, plus the brand signature). The honesty banners are the same elements restyled into one strip on every page's first screen; "Status details" only clamps the long sentences, never the labels. The layout lock keeps its Part 18.4 place. Wealth and Settings are also top-bar links (CI's integration journeys click them by name at 390×844). | `d28bee7`, `b755563`, `6fcaeaa`, `2f5db8d`, `212c61e` |
| 3 | **Phone layouts for every page** (CSS, plus small phone-only JSX): Health title → journal date → counters; Habits and Wealth phone default orders (a saved order still wins); Wealth total right after the title; Settings grouped list; compact cards and rows; carousels; no sideways scroll. | `173fb5f`, `d106a8a`, `fd42f70`, `ac56641`, `41514e8`, `604ef8e`, `2b51a93`, `80d3dc4` |
| 4 | **Sheets**: every existing dialog is a bottom sheet on phones (grabber, sticky header, sticky primary, above the keyboard via `visualViewport`); the habit editor and food log stay in place with their action pinned. | `b6f8145` |
| 5 | **First-run welcome**: a card on Today for brand-new devices only; `/app/welcome` (welcome → what matters → first goal → first habit → your data); "Show the welcome again" in Settings on phones. | `114ebac` (TIER 3), `c687248`, `32453d4`, `df8164e` |
| 6 | Native polish, folded into Parts 2 and 4 (press feedback, title fade, frosting bar, sheet slide-up; each static under reduced motion and Motion Off). | — |
| 7 | Quality pass (below); landscape overflow fixed; phone specs measure against the device width; three CI-only failures fixed (below); 44 px Habits calendar days. Skip list updated (34 → 36). | `d75fdba`, `c0b4221`, `7907c8f`, `f244986`, `7ade6a9` |
| QA-01 | **Owner request (Session F blocker QA-01):** every Health number field is a text field with a decimal keypad (`type="text"`, `inputMode="decimal"`; whole-number fields keep the numeric keypad), read by the existing `parseHealthNumber`. An English Chrome dropped a typed comma from `type="number"`, so "72,5" kg was saved as 725 kg and "1,5" mL of water as 15 mL. With #51's parser (`cab9133`, merged in `e170f00`) "72,5" kg is saved as 72.5 kg and "1,5" mL as 1.5 mL; an ambiguous "1,234" is refused with the form's message. The freeze check reports this change apart (below). | `bcdd0f1`, `c27f4ae`, `6872a64` |
| 8 | Review gallery: 58 WebP on `review/mobile-e-screenshots` (`b8197ff`, never merged) and [one PR comment](https://github.com/reyals1111-ux/ZIGoals/pull/52#issuecomment-5924740102). This entry. | (this commit) |

**TIER 3 commit and risk:**
- `114ebac` **(new persistence key)** `zigoals:onboarding:v1` = `{"version":1,"seen":true}`:
  - Device-only localStorage, no personal content, not synced, not in backups.
  - Loading fails closed: any stored value or storage error counts as "seen", so the welcome never returns to someone with data.
  - Risk: a device whose storage refuses writes may see the welcome again; nothing else reads the key.
  - No existing key or data format changed.

Not touched: auth/OTP, vault/recovery/encryption, the sync engine, wallet/Keplr logic, contracts/, workers/, packages/, .github/workflows, deploy scripts, secrets, apps/web/AGENTS.md, CLAUDE.md. No new dependency. CSP unchanged; no new network request.

**Files touched outside `components/phone/` and `components/onboarding/`** (all phone-gated or additive):
- `components/shell.tsx`: one import and two elements (`PhoneTopBar`, `PhoneTabBar`).
- `app/layout.tsx`: `viewport` export (`viewportFit:"cover"`, `themeColor` only for the phone query). Head-only; no visual effect on desktop or tablet browsers.
- `components/app-icon.tsx` (two glyphs), `components/app-nav.tsx` (`isNavActive` export; no arrival mark on a nav that is not rendered).
- `habits-workspace.tsx`, `health-app.tsx`, `wealth-view.tsx`, `app/app/settings/page.tsx`: phone-only order or placement (`usePhoneActive`, false on the server and on desktop).
- `habit-editor.tsx`: exports `habitTemplateInput` (the editor's own templates as a valid `HabitInput`).
- `dashboard/today-dashboard.tsx`: the welcome card for brand-new devices.
- `health/health-app.tsx`, `health/daily-tools.tsx`, `health/body-measurements.tsx`: QA-01 only, at every size. Their number fields are now text fields with a decimal or numeric keypad and no `min`/`max`/`step` attributes; each form's `parseHealthNumber` call already enforces the range. No parser, data or storage change.

## Freeze check (desktop and tablet unchanged, apart from QA-01)
Final run of `scripts/desktop-freeze-check.mjs`:
- **Baseline:** a fresh capture from a production build of main `771e2ad`, after #51.
- **Candidate:** this branch at `e170f00`, whose app code is the final head's (`6872a64` changes only a test), captured with the same script.
- **Result:** **118 of 130 captures identical; the other 12 differ only by the owner-authorized QA-01 change. 0 differ otherwise.** The 12 are the Health page at every size, Showcase and empty. In each, the pixels are identical, and "Servings" and "Water amount" are a textbox instead of a spinbutton, with the same name and value.
- **Earlier runs:** against main `d21ba8f`, `bcdd0f1` gave the same 118 + 12. Before QA-01, `f244986` and `7907c8f` matched 130 of 130.
- **How the rule works:** `INTENDED` in the script names this single change. A capture counts as intended only when its pixels are identical and every changed snapshot line on the Health page is that role change. Anything else, on any page, still fails.

**Matrix:**
- Sizes: 1440×900, 1280×800, 1024×768 and 820×1180, plus 820×1180 and 1180×820 with touch.
- 11 pages in Showcase and empty.
- The Quick add and Add asset dialogs open.

The check also ran after every part. It caught two real leaks: `text-size-adjust` and `user-select` inside the phone query (which does not match at these sizes) still moved Chromium's desktop render of a dialog by a sub-pixel. Both are gone (`b755563`, `2f5db8d`).

The freeze captures mark onboarding as seen, so the welcome card on Today for a brand-new device (no records, not Showcase; approved in the plan) is not in them. `first-run` captures it separately as evidence, at 1440×900 and 820×1180.

**The script itself, made robust along the way:**
- It waits for running animations (`b8500ab`).
- It parks the pointer (`40aaada`). Seven tablet captures had differed only by a hover state under the resting pointer.
- It bounds its settle step (`5521773`). One run hung.

## Phone numbers (local, Showcase data, production build)
"After" is the Part 7 after-audit; Habits targets were re-measured on `f244986`. Screens are page height ÷ viewport height. "Title" is the page `h1`'s top edge in CSS px. Targets are visible controls under 44×44 px. Small text is text under 15 px.

| Page (390×844) | Screens before → after | Title at | Targets < 44 | Text < 15 px |
|---|---|---|---|---|
| Today | 18.2 → 14.6 | 953 → 401 | 41 → 19 | 153 → 66 |
| Goals | 7.0 → 5.5 | 981 → 418 | 15 → 11 | 20 → 14 |
| Goal detail | 11.4 → 10.6 | 1083 → 548 | 31 → 13 | 106 → 57 |
| Create goal | 5.3 → 4.5 | 912 → 398 | 26 → 26 ¹ | 10 → 3 |
| Habits | 11.2 → 9.4 | 930 → 389 | 190 → 2 ² | 87 → 37 |
| Health | 12.4 → 10.2 | **1548** → 409 | 34 → 11 | 213 → 179 |
| Wealth | **23.9** → 15.7 | 950 → 401 | 35 → 14 | 165 → 74 |
| Markets | 9.5 → 6.7 | 955 → 397 | 29 → 12 | 53 → 1 |
| Stake / Positions | 10.0 → 9.4 | 945 → 402 | 32 → 4 | 42 → 9 |
| Ecosystem | 14.1 → 11.4 | 921 → 402 | 150 → 9 | 166 → 19 |
| Activity | 11.9 → 8.7 | 937 → 402 | 33 → 32 ³ | 63 → 1 |
| Settings | 13.6 → 14.1 ⁴ | 917 → 403 | 10 → 4 | 14 → 2 |

1. Radio inputs that are visually hidden inside 44 px+ labelled tiles; the tile is the target.
2. Mostly the calendar's day buttons, seven across, 43.7 px at the time of the audit. `f244986` makes them 44.6 px at 390 and 40.3 px at 360; a 44 px day at 360 would need the calendar edge to edge.
3. Each Activity row is one whole-row link; its title anchor (23 px tall) still counts.
4. The grouped Settings list (13 rows) is added above the existing sections.

At 375×667 every page is shorter, too (e.g. Today 23.5 → 18.9, Wealth 30.6 → 20.1, Health 16.0 → 13.0), and every title is now on the first screen.
- **360×800:** Today 20.1 → 16.4, Wealth 26.3 → 17.3, Health 13.7 → 11.1, Habits 12.9 → 10.4.
- **Landscape (844×390, coarse pointer):** Today 32.6 → 29.6, Wealth 33.3 → 24.1, Habits 22.2 → 17.8, Health 18.7 → 14.6, Positions 16.8 → 14.8, Goals 10.1 → 7.6. Settings is 22.0 → 22.3 because of the added list.

No page scrolls sideways at any of these sizes (strict check against the device width).

At **360×800** (owner addition 4) the strip's first row (`ZIGCHAIN TESTNET · PUBLIC ALPHA` and ⓘ) never truncates its label. `phone-shell.spec.ts` asserts it on every page, along with no sideways scroll and the title above the tab bar.

**Quality pass** (Chromium, 390×844, Showcase, 11 pages): 36 of 36 checks pass.
- **130% text:** no sideways scroll, and the status labels stay whole.
- **Forced colours:** the tab bar and strip keep a solid edge.
- **Reduced motion and Motion Off:** no running animation after load on any page or on the welcome.
- **4× CPU, Today:** 18 long tasks while loading (max 431 ms; main: 16, max 329 ms). Scrolling: 0 long tasks, 0 of 98 frames over 50 ms.
- **4× CPU, Wealth, Habits and Health:** 16, 10 and 7 long tasks while loading. Scrolling: 0.

## Tests
- **Unit:** `pnpm test` 1874 passed, 12 skipped after the #51 merge (`e170f00`). Earlier: 1774 at `c27f4ae` and 1773 at `f244986`. Includes `lib/onboarding.test.ts` and the freeze-check unit test.
- **New browser specs:**
  - `phone-shell` (tabs, More, back links, strip and lock on every first screen at 390×844 and 360×800, landscape, no-JS, Session D's panel, the link names CI's journeys click);
  - `phone-pages` (no sideways scroll at 390×844, 360×800, 320×568 and landscape; phone default orders and a saved order winning; Wealth total on the first screen; Settings list);
  - `health-decimal-comma` (QA-01, locale en-US):
    - "72,5" kg is saved as 72.5 kg and "1,5" mL of water as 1.5 mL, never as 725 kg or 15 mL;
    - an ambiguous "1,234" is refused with the form's message and nothing is saved;
    - no Health view has a number field.
    - It failed first against main `771e2ad`, where the fields read "725" and "1234". It now passes 6 of 6. The Health specs plus `ui-design-pass` pass 145, with 11 skipped;
  - `onboarding` (brand-new devices only; never with records, a chosen Today or Showcase; Skip and Not now write only the flag; templates create real records; reduced motion; phone-only reopen).
- **Existing mobile-project specs**, only where the phone UI intentionally changed, never loosened:
  - navigation goes through `tests/phone-nav.ts` (`navLink` opens More first; `openMore` returns the sheet at rest);
  - Quick add uses the top-bar trigger;
  - Habits and Health use per-project expected orders;
  - `ui-evidence` expects the Wealth phone label.
  - The desktop project's assertions are unchanged.
- **Owner addition 3:** the welcome card did not affect any existing desktop-size spec, so no shared setup seeds the onboarding flag. The freeze check seeds it for its empty-state captures only.
- **Playwright full suite, 2 workers:**
  - On `e170f00` (after the #51 merge): 637 passed, 36 skipped, 3 failed (32.0 min). Two failures are the intro-video test (desktop and mobile), which this sandbox's Chromium cannot play; CI runs it. The third is `run11-motion-recording.spec.ts:4` on desktop: under full-suite load it stalled 45 s scrolling after a reload on Wealth, a page QA-01 does not touch. It then passed 3 of 3 alone (about 7.5 s each), and in CI on the same code.
  - On `bcdd0f1`: 638 passed, 36 skipped, 2 failed (29.9 min).
  - On `f244986`: 634 passed, 36 skipped, 2 failed (29.4 min). The 36 skips are the previous 34 plus the 2 new landscape-phone platform skips (`docs/testing/SKIPPED_TESTS.md` E1, E2).
- **CI:** green on `6872a64` ([run 36829162312](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36829162312)), on `e170f00` ([run 36824039909](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36824039909)), on `f244986` ([run 36812115852](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36812115852)) and on `7907c8f` ([run 36806633019](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36806633019)): web checks, the three browser shards, web integration (including the RUN11_PACKAGED package and the Alpha Workers gate), contract, and canonical builds A/B with compare.
- **Known intermittent:** `market-disconnect.test.mjs` timed out once at 30 s on `212c61e` ([run 36804922026](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36804922026)). This PR does not touch `scripts/run11` or `workers/`. It passed on the next run (the policy's one re-run). The table below records the recurrence.

**CI-only failures fixed on the way** (`212c61e`, `7907c8f`, `7ade6a9`). Each was reproduced locally first:
- **Packaged consumer journey** (`scripts/run11`, unchanged): it clicks a visible "Wealth" link at 390×844, so Wealth became a top-bar link as well as staying in More.
- **`dashboard-visual` (mobile project, unchanged):** a full-page screenshot in Chromium's mobile emulation briefly shrinks the viewport to 1×1 px, where the phone query matches. A page whose content is clipped to the viewport then kept a 4× zoom afterwards. The content clip now applies to landscape phones only, where the overflow was.
- **`brand-nav-polish` (mobile):** the More sheet was measured mid-slide; `openMore` now waits for the slide to finish.
- **`ui-design-pass` Part 4 "quick counters" (mobile):** this failed on the docs-only `0403cd7` after passing on `f244986`, reading a counter button as 43.99994 px against ≥ 44. The test measured while the page entrance (a 6 px slide) was still running; the race exists on main too.
  - Reproduced at 0.05× animation speed: 102 of 424 measurements were under 44 px mid-slide, 0 at rest.
  - The test now measures once the entrance ends; the assertion is unchanged. It then passed 80 of 80 runs.

## Decisions made without the owner
- Tabs: Today · Goals · Habits · Health · More (daily-use pages first; Wealth first in More).
- Settings and Wealth are also top-bar links (gear and wallet icons), as well as in More: CI integration journeys (scripts/run10, scripts/run11 packaged) click visible "Settings" and "Wealth" links at 390×844 and must stay unchanged. Wealth was added after CI's packaged journey failed on 40aaada.
- Onboarding entry is an inline welcome card on Today (not a takeover), because fresh test browsers are brand-new users.
- Health quick counters stay 1 bar per row on phones (Part 18.6 accepted baseline), not a carousel.
- The layout lock keeps its Part 18.4 place (status row, after the balance), now on the phone's first screen.
- Back links in the top bar are named "Back to Goals" / "Back to Wealth" so they never collide with the "Goals" tab link.
- viewport-fit=cover is global (<head> only); no visual effect on desktop/tablet browsers.
- Habit cards on phones are compacted with CSS only; history, trends, notes and pause/archive stay visible (a "Details" wrapper would hide controls that existing flows and tests use).
- No `text-size-adjust` and no `user-select` in the phone CSS: their mere presence, even inside the phone-only query, changes Chromium's render of a desktop dialog by a sub-pixel, which the freeze check caught (bisected on an idle machine). iOS keeps its default text sizing; a long press on a control is kept from selecting text by a phone-only selectstart guard instead.
- While arranging a page on a phone, the tab bar stays and the Arrange bar (Reset / Done) docks just above it (the plan had the Arrange bar replace the tab bar); every page stays one tap away, as on desktop, and the existing hero-star journey keeps working unchanged.
- Settings rows on phones use names that exist nowhere else on the page or in the phone chrome ("Habit settings", not "Habits"), so name-based lookups (tests, CI journeys, assistive tech) still find exactly one element.
- Habit templates offered in the welcome exclude "Buy ZIG" and "Add to savings" (money-moving wording and a monthly target on a daily schedule could read as advice); the six offered are Walk, Drink water, Read, Exercise, Study and Review budget.
- Part 4: the existing dialogs (Quick add, Today's widget and preset dialogs, exercise counters, every Wealth/Markets sheet, the transaction review) become bottom sheets with phone-only CSS. The New/Edit habit editor, the food/water log and the wallet/APR forms stay in place (the plan had them as sheets): many existing flows and tests drive them in place, and a modal would make the rest of the page inert. On phones they scroll into view when opened and their primary action stays pinned above the tab bar or keyboard.
- Today on phones is 14.6 screens with Showcase data (18.2 before), not the ~9 targeted; Wealth is 15.7 (23.9 before), not ~10. Going further would mean hiding content or honesty lines. Empty-state Today is 10.4 screens.
- Part 6 (native polish) was folded into Parts 2 and 4: press feedback (transform only), no tap highlight, no text selection on a long press of a control (selectstart guard), the large-title fade, the frosting top bar and sheet slide-ups, each with a static state under reduced motion and Motion Off. Not added: drag-to-dismiss on sheet grabbers (the grabber is a visual cue; Close, Cancel, Escape and the backdrop dismiss as before, with no custom touch handlers competing with iOS gestures) and skeleton placeholders while stores open (the existing "Loading…" status lines stay; nothing data-shaped is drawn).
- The welcome card sits right after Today's hero (the slogan keeps the first screen), not above it.
- Owner addition 3 did not trigger: in the full suite on the build with the welcome card, no existing spec at a desktop or tablet size failed because of it (fresh browsers do see it). So no shared test setup seeds the onboarding flag; the freeze check seeds it for its own empty-state captures only.
- While Today is being arranged on a phone, compact widgets take the full width and the summary strip and journey steps stack, so move controls never cover a card's own buttons and nothing sits past the screen edge (existing customize specs).
- Goal cards on phones keep their title and "Open Goal" links rather than becoming one whole-card link (a whole-card link turns every touch into a navigation); Markets cards and Activity rows are whole-row links.
- Habits calendar on phones: 2 px gaps give 44 px day buttons from 390 px up; at 360 px they are about 40 px (above WCAG 2.2 AA's 24 px) rather than running the calendar edge to edge of its card.
- QA-01: whole-number Health fields (steps, minutes, kcal and step targets, serving weight in g, the water target in mL) keep `inputMode="numeric"`, as before; every field with decimals uses `inputMode="decimal"`. `autoComplete` is off on these fields, since a number field never offered autofill.
- The content clip that stops landscape overflow applies to landscape phones only: in portrait there was no overflow, and the clip made Chromium's mobile emulation keep a 4x zoom after a full-page screenshot (an emulation artefact that broke an unchanged spec in CI).

## Deferred / not done
- **Habits value fields** (check-in values and targets) are still `type="number"`, so they likely drop a decimal comma in the same way. They are outside the owner's Health scope and were not changed.
- **WebKit / Safari:** not tested. The environment's network policy blocks Playwright's WebKit download (cdn.playwright.dev, playwright.download.prss.microsoft.com). The owner can allow those hosts in the environment's network settings. Until then, Safari-specific behaviour (the `visualViewport` keyboard inset, safe areas, `@starting-style`) is unverified here. Chromium with iPhone emulation only.
- **Today and Wealth are not at the ~9 / ~10 screens planned** (14.6 / 15.7 with Showcase data). Going further would mean hiding content or honesty lines.
- **Not modal sheets:** the habit editor, the food/water log and the wallet/APR forms stay in place, with their action pinned. Not added: drag-to-dismiss, skeleton placeholders.
- **No real-device check:** no real phone was available in this session.

## How the owner can review
1. Start the dev server: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101` (as in CLAUDE.md). Open http://127.0.0.1:3101/app in Chrome DevTools device mode (iPhone 12/13/14, Pixel 7, and 360×800). Rotate for landscape. Settings → Load Showcase Demo fills in example data.
2. **The welcome:** a fresh profile or Incognito window shows the card on Today. On a phone, Settings → "Show the welcome again" reopens it.
3. **Desktop and tablet:** any width ≥ 768 px should look exactly as the live Alpha.
4. **A real phone on the same Wi-Fi:** the dev server would need `--hostname 0.0.0.0`, and even then `http://<laptop-ip>:3101` is not a secure context. `crypto.randomUUID` and WebCrypto are unavailable there, so creating goals and anything encrypted fails. That is the address, not the app. Instead:
   - Android: USB with Chrome's port forwarding (chrome://inspect → Port forwarding 3101 → localhost:3101). The phone then uses `localhost`, which counts as secure.
   - iPhone: an HTTPS tunnel the owner trusts (Safari's Web Inspector on a Mac can then inspect the page).
5. **Review screenshots:** branch `review/mobile-e-screenshots` (never merged) and the gallery comment on the PR.

# Alpha deploy — 2026-10-01 morning, `771e2ad` live

Evidence labels:
- **CI log:** the deploy job's step "Report version IDs even after failure" in the run below, read via the Actions API by the Session E cloud session on 2026-10-01.
- **Actions API** / **git:** read at the same time.
- **local:** the Session E sandbox, production build of `771e2ad`.

- **Run:** Manual Alpha deployment #16, [run 36826122295](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36826122295), 2026-10-01 06:41–06:47 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `771e2ad4f3ab1bbc976d58662b896448e06a99e6`, `main` after #51. (Actions API, CI log)
- **Live Alpha:** Worker `zigoals-alpha`, new version `f00a117f-a283-4b6e-a8f7-ab0bfed248af`. The last observed live version is the same. (CI log)
- **Rollback:** `c1b3c40c-3559-4b7d-a3d7-04f2f9657e6d`, the version deploy #15 published, so the chain holds. (CI log)
- **CI on `771e2ad`:** Milestone quality #272 ([run 36820681369](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36820681369)): success on attempt 1. (Actions API)
- **Owner manual checks:** not reported with this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#51](https://github.com/reyals1111-ux/ZIGoals/pull/51) (`771e2ad`): Session F QA sweep. It brings 7 logic fixes, including the Health decimal-comma parser, plus regression tests, the QA report and the ADR-007 proposal.

**QA-01 is still live.** The UI half of the fix (Health text fields) is in PR #52, not in this deploy. So on the live Alpha, an English Chrome still saves "72,5" kg as 725 kg until #52 is merged and deployed. Measured locally on the `771e2ad` build: 725 kg and 15 mL, with "Weight saved.".

# Session F — QA sweep: user simulation, logic fixes, regression tests (2026-09-30/10-01, [PR #51](https://github.com/reyals1111-ux/ZIGoals/pull/51), not merged or deployed)

Evidence labels:
- **browser**: Playwright-driven sessions against a local production build (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`) in this sandbox. Node 24.19.0, pnpm 11.19.0, Chromium 141 standing in for `chrome`, one browser at a time.
- **unit**: vitest, local.
- **code**: read only, not reproduced.
- **CI**: Milestone quality on the PR.
- **Actions API**: GitHub, read by this session.

No account, secret, wallet, provider or deploy was used; market, food and positions APIs were answered with 503 fixtures. Base: main `d21ba8f`. Full report: [docs/qa/QA_SWEEP_2026-09-30.md](qa/QA_SWEEP_2026-09-30.md).

## Parts
| Part | Result | Commits |
|---|---|---|
| 0 | Branch and draft PR. Before each lib edit, Session E's branch diff was checked (E touches `lib/onboarding.ts` and components, none of the files fixed here) | `88bd98d` |
| 1 | Four personas (Nina, Tom, Robin, Power user) at 1440×900, 1280×800, 1024×768 and 820×1180. Robin logged 49 simulated days across 2026-10-25; Tom funded monthly for 8 simulated months at 21:30 New York; Power user used 45 habits (12,882 and 18,783 check-ins), 3 years of Health and 200 positions (browser) | — |
| 2 | Torture matrix: time, locales, backups, storage, inputs, honesty, privacy and network, a11y, performance (browser, unit) | — |
| 3 | 7 logic fixes, each with a failing-first test and its own commit (below) | `9cb79e1`, `cab9133`, `596f826`, `d4d8bcc`, `ebb3a9f`, `a0dc0cf`, `b675934` |
| 4 | Regression tests: calendar days and streaks across both DST ends, rollovers, year end and the leap day, switching TZ per case, so CI runs them under UTC, Brussels and New York with no ci.yml change; backup round-trips for counters, measurements, timers, financial evidence and v1 Habits | `13c44bc`, `46e7569` |
| 5 | Findings report (38 findings, top 10, UI backlog with file:line), screenshots on the unmerged `review/qa-sweep-screenshots` (`5bf9e60`), linked from one PR comment | `73f08dd` |
| 6 | [ADR-007](architecture/ADR-007-owner-recovery-admin.md): owner-only recovery admin caller. Proposal, awaiting owner decision; recommends option A (local CLI, remote named-entrypoint binding, nothing deployed) | `27b5856` |
| — | Alpha deploy #15 recorded (below), release identity updated, and this entry | (this commit) |

## Fixes (failing first on `d21ba8f`)
| Commit | Fix | Failing first |
|---|---|---|
| `9cb79e1` | Health: today's latest weight uses the reading's own zone day (a New York 21:00 reading was hidden until the next day; a Brussels 00:30 reading was dated the day before) | 9/12 in `latest-weight-day.test.ts` (3 device zones) |
| `cab9133` | Health parser accepts an unambiguous decimal comma ("72,5", "0,125") and refuses "1,234" with a reason. Owner-approved. Users only see it once the UI half of QA-01 lands | 9/21 in `health-decimal-comma.test.ts` |
| `596f826` | **TIER 3 (vault backup):** a refused legacy-simulation restore no longer half-applies (ledger replaced, plans not) | 2/4 in `local-simulation-restore-atomic.test.ts` |
| `d4d8bcc` | **TIER 3 (private store):** a refused module restore leaves no orphan `:recovery:` copy | 1/3 in `private-storage-import-refused.test.ts` |
| `ebb3a9f` | **TIER 3 (vault backup):** an unreadable encrypted backup gets a plain reason, not a JSON position or a zod dump | 4/5 in `backup-unreadable-file.test.ts` |
| `a0dc0cf` | Habits: "add" sums exactly (0.7 + 0.1 completes a 0.8 target) | 2/5 in `habit-add-exact.test.ts` |
| `b675934` | Goals: UNKNOWN liquidity (manual stocks, property, custom) is reported as unknown, not "not liquid" | 1/3 in `goal-liquidity-honesty.test.ts` |

**TIER 3 risk.** All three change only failure paths:
- a rollback of bytes read under the same storage locks;
- removing this attempt's own recovery copy;
- the message for an unparseable file.

The success paths, formats, sync, encryption and keys are unchanged. No data-format or sync-protocol change was made anywhere in this PR. No contract, wallet or key code changed, and no dependency was added.

## Open findings (31)
- **By severity:** 1 blocker, 5 major, 15 minor, 10 polish. Fixed: 3 major, 4 minor.
- **Blocker QA-01 (UI lane):** Health `<input type="number">` fields drop a typed decimal comma in Chrome with an English UI. "72,5" kg is saved as 725 kg with "Weight saved.". Suggested fix: `type="text" inputMode="decimal"` in `components/health/health-app.tsx:42` and the water and measurement fields (E touches `health-app.tsx`).
- **Majors:**
  - recovery copies are never pruned, so after a few large restores localStorage is full and restores fail with a misleading reason (owner decision on retention);
  - the 2 MB module limit shows "Try again";
  - funding and plan days are UTC, so New York evenings see "behind" on the due day (owner decision);
  - Habits is slow with 45 habits (1.5 s per tap);
  - money is always formatted en-US.
- **Also:** 5 owner decisions and the UI backlog are listed in the report. **Security:** nothing exploitable was found.

## Numbers (local unless stated)
| | Result |
|---|---|
| `pnpm lint` / `pnpm typecheck` | clean / clean |
| `pnpm test` | 1862 passed, 12 skipped (the same 12 env-gated skips as SKIPPED_TESTS.md), including the 9 new test files in this PR |
| Date regression tests under host TZ UTC, Brussels, New York, Auckland, Kolkata | 54/54 each |
| Playwright full suite, 2 workers, production build of this branch | 589 passed, 34 skipped, 3 failed (32.0 min, `27b5856` build). Two failures are the intro-video spec (desktop, mobile), which needs H.264 and fails only in this sandbox's Chromium. The third is `run11-route-mobile-acceptance.spec.ts:4` (desktop), at its 45 s budget; it then passed 3/3 alone. An A/B on this machine gives 27.6–29.8 s on main against 27.5–28.4 s on this branch, so the PR does not slow it. The 34 skips equal Session D's 34; no skip was added |
| CI | **Green on `27b5856`**: Milestone quality #261 ([run 36792897491](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36792897491)) passed web checks, all three browser shards, web integration and contract, and canonical reproducibility passed (compare plus builds a and b). The red `web` roll-ups on `cab9133`, `a0dc0cf`, `b675934`, `46e7569` and `73f08dd` are runs cancelled by the next push (job log: "web-checks: cancelled; web-browser: cancelled; web-integration: cancelled"); `88bd98d` was green. This final push is docs only and shows its own result on the PR |

**Known CI intermittents:** none new. Locally, `run11-route-mobile-acceptance.spec.ts:4` (desktop) hit its 45 s budget once in the full run, as already noted in the Session A entry. It passed in CI and 3/3 alone (see the A/B above).

**Not done / notes:**
- Phones were not tested (Session E); the 820×1180 tablet shows the phone navigation, so layout findings there are left to E.
- Firefox and Safari were not tested. The decimal-comma behaviour of `type="number"` differs per browser and browser language.
- No Playwright spec was added. The fixes are proven by unit tests, and E is editing many specs.
- Exploratory drivers are not committed.

# Alpha deploy — 2026-09-30 night, `d21ba8f` live

Evidence labels: **CI log** = the deploy job's step "Report version IDs even after failure" in the run below, read via the Actions API by the Session F cloud session on 2026-10-01; **Actions API** / **git** = read at the same time; **owner-reported** = as the owner reports it.

- **Run:** Manual Alpha deployment #15, [run 36785808558](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36785808558), 2026-09-30 22:28–22:35 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `d21ba8fdc6eefdd2af3418dfb2d104831c60467f`, `main` after #50. (Actions API, CI log)
- **Live Alpha:** Worker `zigoals-alpha`, new version `c1b3c40c-3559-4b7d-a3d7-04f2f9657e6d`. The last observed live version is the same. (CI log)
- **Rollback:** `48806961-9b29-41a5-a402-f24851d32e6f`, the version deploy #14 published, so the chain holds. (CI log)
- **CI on `d21ba8f`:** Milestone quality #254 ([run 36783131097](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36783131097)): success on attempt 2. Attempt 1 was not examined by this session. (Actions API)
- **Owner manual checks:** not reported with this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#49](https://github.com/reyals1111-ux/ZIGoals/pull/49) (`39fdcf0`): STATUS for PR #47 Part 18 and Alpha deploys #13–#14 (docs).
- [#50](https://github.com/reyals1111-ux/ZIGoals/pull/50) (`d21ba8f`): Session D platform hardening (vault read hang, Wrangler 4.144, food queue, test/type fixes).

# Session D — platform hardening (2026-09-30, [PR #50](https://github.com/reyals1111-ux/ZIGoals/pull/50), not merged or deployed)

Evidence labels:
- **local**: this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, production build `PUBLIC_ALPHA_UNDEPLOYED`, Playwright at most 2 workers, Chromium 141 standing in for `chrome`).
- **CI**: Milestone quality on the PR.
- **changelog**: the official `cloudflare/workers-sdk` release notes.
- **captured**: real wrangler output recorded offline, as in `scripts/fixtures/wrangler-output/README.md`.

No account, secret, wallet or deploy was used. No wrangler command reached Cloudflare. Base: main `39fdcf0`.

## Parts
| Part | Result | Commits |
|---|---|---|
| 0 | Deploys #13 and #14 were already recorded on main (`68cecc8`, PR #49; #14's rollback is `c4dda780-…`). No commit. | — |
| 1 | **Private reads that never finish.** After 8 s the page shows "Your private data is taking longer than usual to open" instead of staying blank, with Retry and a pointer to Settings backups. Writes stay blocked until a read succeeds, and a late read renders without a reload. At the source: a stalled `indexedDB.open` can be retried onto the same pending connection, and a connection the browser closes is reopened (below). | `9b2c8f2` |
| 2 | **wrangler 4.131.1 → 4.144.0.** Worker types regenerated. The deploy path's real output is pinned by tests. New [owner checklist for the first watched deploy](run11/WATCHED_DEPLOY_WRANGLER.md). | `2d11e22`, `f976340`, `bb5519a` |
| 3 | eslint-config-next 16.3.5 → 16.3.6. Package contents are identical apart from the version; lint output is identical (0 problems). | `82af17d` |
| 4 | `product-data.spec.ts:72`: the root cause is not a market request (below). Test-only fix, 40/40. | `0a11876` |
| 5 | **Food lookup queue.** A second new barcode within 12 s now waits for the next slot instead of "cooling down". | `7d749ff` |
| 6 | The 6 `.mjs` Workers are type-checked (checkJs + JSDoc), and the market fault fixture is really checked now. | `59ca984`, `7527e88` |
| — | This entry | (this commit) |

**TIER 3 commits and risk:**
- `9b2c8f2` **(private store)**:
  - Change: the vault connection code (`retryOpen`, `onclose`, one reopen on `InvalidStateError` during a read), plus the read-delay notice.
  - Risk: a retry opens a second IndexedDB request that feeds the same pending promise; a surplus connection is closed.
  - No data-format or sync-protocol change.
- `2d11e22` **(dependencies)**:
  - Change: wrangler, miniflare, workerd and undici. The same Alpha build bundles byte-identically under 4.131.1 and 4.144.0.
  - Risk: the deploy step itself runs new wrangler code. See the watched-deploy checklist.
- `f976340` **(deploy tooling)**:
  - Change: tests and fixtures only. No script or workflow changed.
  - Risk: none at runtime.
- `59ca984` **(auth/sync)**:
  - Change: JSDoc in the private-sync and auth-abuse Workers.
  - Two behaviour-neutral code edits (see Part 6); verified by re-printing old and new code with esbuild.
  - Risk: none intended.

No `.github/workflows` file changed (none pins wrangler). No contract, wallet/Keplr or crypto/key-derivation code changed.

**UI files touched** (Part 1 only):
- `apps/web/components/shell.tsx`: the notice, and `<main>` hidden while Today settings are the pending store.
- `apps/web/components/private-vault-tools.tsx`: "Upgrade selected module storage" is disabled until that module has read.

## Part 1 — private reads that never finish (details)
**Where rendering waited:**
- The Shell hides `.workspace` until Today settings (`zigoals:settings:v1`) load. That means every page, including Settings.
- Pages gate their own stores ("Loading…").

**Causes, and what changed:**
- An `indexedDB.open` that fires no event, such as the Safari first-open hang or an open queued behind another tab's blocked upgrade or deletion. The cached pending promise made every later read, and any retry, wait forever.
  - Retry now starts one more open for the same pending connection. Readers and lock-holding writers continue on whichever succeeds.
- A connection the browser closes itself (eviction, cleared site data) failed every later read until reload. Now it is forgotten and reopened.
- Already handled, and kept:
  - `blocked` rejects ("Close older ZIGoals tabs…");
  - `versionchange` closes the connection;
  - a newer database version shows the read error;
  - private mode fails fast.
- Web Locks: the durable read takes no lock, so a held lock cannot stall a read.
- A transaction stuck behind another tab's transaction cannot be fixed at the source. The bounded wait covers it.

**Safety:**
- `loaded` is never set by the timer.
- No default data is rendered as real.
- `update` already refused while loading; now `importData` does too (it did not before). Storage migration is disabled until that module has read.
- The banners stay visible throughout, and the server-rendered output is unchanged.

**Tests (failing first):**
- Unit:
  - `lib/vault/database-lifecycle.test.ts` (3 new): on main, `retryOpen` is missing and the forced-close case fails with InvalidStateError.
  - `lib/private-read-delay.test.ts` (3): on main, the module is missing.
  - One importData guard in `lib/use-private-store.test.ts`: on main, it resolved and called the durable restore.
- Browser: `tests/private-read-delay.spec.ts`, desktop + mobile.
  - Cases:
    - a stalled Today-settings open (notice, no page, no readwrite transaction or store write, banners, late release renders in place);
    - Retry;
    - a stalled page store (the Settings link);
    - another tab's blocked upgrade (recovers when the other tab closes).
  - 8/8 on this build; **8/8 fail on main** (no notice).
  - Related specs: 72/72 (honesty-banners, layout stability, private vault, export/backup, recovery/migration, multitab).
- CI green on `9b2c8f2` ([run 36767626937](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36767626937)).

## Part 2 — wrangler 4.144.0 (details)
- **Lockfile:**
  - wrangler 4.144.0, miniflare 5.20260926.1-alpha, workerd 1.20260926.1 (+ binaries), `@cloudflare/unenv-preset` 2.16.2, undici 7.29.1. Nothing else.
  - OpenNext 1.20.7 peers `wrangler ^4.125.0`: satisfied, with no peer warning.
  - pnpm 11 refused 4.144.0 in a frozen install until it was 24 h old (published 2026-09-29 21:09 UTC). No `minimumReleaseAgeExclude` was committed; the push waited, and a frozen install passed at 21:09:47 UTC.
- **Release notes** 4.131.2–4.144.0 and miniflare 5.20260911.1–5.20260926.1 were all read (changelog). Nothing touches the commands, flags or output our deploy path uses. Relevant items:
  - `code_update_strategy` sent with every deploy (4.141.0; Durable Objects only; the Alpha has none);
  - workers.dev settings read from the Worker resource (4.136.1);
  - the types header whitespace fix (4.136.2);
  - asset-upload retries on 502/503/504 (4.132.0);
  - undici 7.29.1 (4.143.1).
- **Real output, captured** (`scripts/fixtures/wrangler-output/`):
  - Method: a real `wrangler deploy --secrets-file` of a throwaway Worker against a local mock API, inside a network namespace with no route off the machine, for both versions.
  - The JSONL `deploy` entry has the same fields and types.
  - The upload metadata adds only `code_update_strategy {deferred, 300}`.
  - `--secrets-file` is still additive.
  - After the upload, deploy reads `GET …/workers/workers/<name>` instead of `…/scripts/<name>/subdomain`.
  - A dry run writes a `deploy` entry with `version_id: null`, which `deployedVersion` refuses (tested).
  - `--help` for every command and flag we use still accepts them (new `scripts/wrangler-cli-surface.test.mjs`); only additive flags appeared.
  - The `tail --format json` printer and `WRANGLER_WRITE_LOGS` are unchanged code.
- **Alpha package** (local):
  - The same `.open-next` bundled under 4.131.1 and 4.144.0 gives a **byte-identical** `worker.js` (13,886,407 B).
  - Dry run: 13,560.94 KiB / gzip 2,625.33 KiB under both. Against this branch's pre-bump build: 13,560.92 / 2,625.63; the difference is Next build IDs.
  - `.open-next/worker.js` is byte-identical.
  - Bindings: `WORKER_SELF_REFERENCE` and `ASSETS`, as before.
- **Types:** `worker-runtime.d.ts` was regenerated (workerd 1.20260926.1). The three `runtime-overrides.d.ts` entries are still needed and were re-checked on that workerd through Miniflare.
- **Gates on 4.144.0** (local):
  - lint, typecheck, `pnpm test` 1738 passed / 12 skipped (all Miniflare harnesses, types drift, hermetic-wrangler);
  - `check:deploy-configs`, `check:landing`, `build:alpha`, `check:alpha`;
  - `activation-check --dry-run` (6 configs), then `RUN11_PACKAGED` packaged runtime: passed;
  - `preview:alpha` + public-alpha + diagnostics: 14/14.
- **Owner:** before the first Manual Alpha deploy after this merges, read [WATCHED_DEPLOY_WRANGLER.md](run11/WATCHED_DEPLOY_WRANGLER.md). It covers the steps and outputs, a correct version-ID report, the rollback commands, and updating the ops checkout before activation Stage 7.

## Part 4 — `product-data.spec.ts:72` (details)
- **Root cause** (local instrumentation):
  - No `/api/market-*` request happens in this test, so there was nothing to stub.
  - The requests that kept `networkidle` from firing were Next.js `<Link>` RSC prefetches. The previous document started them, and the navigation cancelled them while the test's catch-all `page.route()` held them.
  - Playwright never reports such a request as finished or failed, so the frame looks busy forever. It happened in 4/20 runs. The server answers those prefetches in about 10 ms.
- **Rejected** (measured):
  - idle before the reload: 6/40 failed;
  - routing only external hosts: 7/33;
  - no route + host-resolver rules: `allHeaders()` hangs, 12/14.
- **Fix:** `requestsSettled()` waits like `networkidle` for what the reloaded page starts. The route, the recorder and every assertion are unchanged.
- **Proof:** 40/40 consecutive (20 desktop + 20 mobile), and the whole spec 6/6.

## Part 5 — food lookup queue (details)
- A new barcode that finds the 12 s slot taken reserves the next one and waits. At most one lookup waits, and never for more than 15 s. Otherwise it gets an immediate honest `TRY_LATER` with the seconds until the next slot.
- After waiting, the lookup re-checks the cache and the backoff:
  - a throttle that happened meanwhile gives `PROVIDER_THROTTLED` with no provider call;
  - a throttled lookup is never "not found".
- Budget (≤5/min), 60 s backoff, cache and timeouts are unchanged. There is no route or UI change.
- **Tests** (Miniflare, real time):
  - new `food-queue.test.mjs` 4/4; all 4 fail on the previous Worker;
  - `food-runtime.test.mjs` now expects `[200,200,429]` (was `[200,429,429]`), the new intended behaviour, and still proves persistence across a restart. Its timeout went from 30 s to 60 s for two real 12 s slots.
- [FOOD_READINESS.md](run11/FOOD_READINESS.md) is updated.

## Part 6 — `.mjs` Workers type-checked (details)
- `tsconfig.workers.json` adds `allowJs`/`checkJs` for `workers/*/*.mjs` (6 files).
- The probe found 133 errors (125 implicit `any`). All are fixed with JSDoc:
  - per-Worker binding typedefs;
  - `workers/checkjs.d.ts` for Durable Object storage (stored values `any`: schemaless JSON validated where read);
  - casts that name the runtime guard.
- **No real bug found.** Two behaviour-neutral code edits:
  - `ignoreBOM:false` in 4 `TextDecoder`s (the WHATWG default; workerd's types require it);
  - `split(';')[0]?.trim()` in 2 content-type checks (split never returns an empty array).
  - Everything else is identical code (esbuild re-print).
- **Also fixed:** the Workers program inherited the root `exclude`, so `scripts/run11/market-fault-fixture.ts` had never been checked (it is clean).

## Numbers (local unless stated)
| | Before (`39fdcf0`) | After |
|---|---|---|
| `pnpm audit` | 3 low / 5 moderate / 2 high (all undici 7.29.0 via wrangler) | **0** |
| `pnpm audit --prod` | 0 | 0 |
| `pnpm lint` / `pnpm typecheck` | clean / clean | clean / clean (now including the `.mjs` Workers and the fault fixture) |
| `pnpm test` | — | 1762 passed, 12 skipped (`7527e88`) |
| Alpha dry-run upload | 13,560.92 KiB / gzip 2,625.63 KiB (4.131.1) | 13,560.94 KiB / gzip 2,625.33 KiB (4.144.0; byte-identical bundle for the same build) |
| Playwright full suite, 2 workers | — | 590 passed, 34 skipped, 2 failed (`0a11876`; the 2 are the intro-video test, desktop + mobile, which this sandbox's Chromium cannot play; 34 skips = the previous full run's 34, none added) |

**CI:** green on `9b2c8f2` ([run 36767626937](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36767626937)) and on `0a11876` ([run 36778296039](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36778296039): web checks, web integration incl. the RUN11_PACKAGED package and the Alpha Workers gate on wrangler 4.144.0, all three browser shards, contract; canonical reproducibility green). The red `web` roll-up on `7527e88` was that run's jobs cancelled by the `0a11876` push. The final push (this entry) shows its own result on the PR.

**Known CI intermittents:** `product-data.spec.ts:72` is fixed (`0a11876`); see the table.

**Not done / notes:**
- The watched first deploy on 4.144.0 is the owner's step.
- The server-side effect of `code_update_strategy` stays **UNVERIFIED** (it matters only for the Stage 7 Durable Object Workers).
- `9b2c8f2`, `2d11e22` and `f976340` lack the session attribution lines; not amended (no history rewrite).

# UI design pass (Session A) — 2026-09-30, [PR #47](https://github.com/reyals1111-ux/ZIGoals/pull/47) merged as `dd0e8a1`, live in Alpha deploy #14

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
- **CI green on `d5ec3db` (Part 15), `1cd6840` (Part 16) and the main merge `e110ced`** (web checks, web integration, all three browser shards, contract, canonical reproducibility; 10/10 each).

**Known CI intermittents on this PR:** `account-browser` 90 s timeouts on `67a05e1`, `f1bb8bb`, `f5e1ea4` (a-first and b-first), then a-first only on `4187724` and `a8a4e89` (re-run once, failed again); passed on `9383f15` and `0e5ee0f` after the hover-intent change. The root-cause fix is Session B's `8ca0e03` (#46: the integration files run one at a time). #46 is merged, and this branch has it since `e110ced`. `run11-route-mobile-acceptance` (desktop) hit its 45 s budget once on `f1bb8bb`; locally it takes 24.6–26.0 s on this branch and 23.0–25.0 s on main.

**Not done / skipped:** half/full width toggle (only Today's existing compact/wide sizes); Ecosystem is a filtered directory, not a card layout, so it stays fixed; Markets catalog cards are not reorderable (they follow the catalog filter); backup preview counts for counter days (vault, off-limits).

**Follow-up (Parts 10–14, same PR):**
10. `86633a6` Compatibility and data-safety analysis for the counters and widgets, with a rollback guard test (below).
11. `3369799` Test hygiene: the one unjustified skip now runs (below).
12. `5f2c813`, `ebdf693` Evidence checks and a performance trace (below).
13. `8f81c17`, `4b22a9f`, `99b5cc3`, `dc667f3` Polish fixes (below).
14. Review gallery: [PR #47 comment](https://github.com/reyals1111-ux/ZIGoals/pull/47#issuecomment-5906382196). It has 53 WebP images (≤206 KB each) on branch `review/pr47-screenshots`, which is not for merging: every main page at 1440×900 and 390×844, before (`5dd2ee7`) and after (`dc667f3`), plus close-ups. Showcase data only.
15. `d5ec3db` **TIER 3 (honesty banners):** the testnet bar and the Local simulation strip never depend on readable private data (below).
16. `1cd6840` `run10-widgets.spec.ts:20` mobile timeout: root cause found and fixed (below).
17. `dd16ffd` `goal-provider.test.ts` intermittent: root cause found and fixed with a deterministic failing-first proof (below).
Merge of main after #46: `e110ced` (both STATUS entries and the Known CI intermittents table kept).
18. Owner review fixes: `a96c63d`, `93f9925`, `5c54e6c`, `3219879`, `9a06f0e`, `56e2e37` (below). No data-format changes.
Merge of main after #48 (next 16.3.6 and the other approved dependency updates): `02658e7`.

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

From this build on (`d5ec3db`), honesty banners don't depend on readable private data. The testnet bar and the Local simulation strip render from the app mode even when Today settings, Health or the account selection are unreadable, corrupt, from a newer build or still loading. Only a readable Health/Habits-only Today or a selected account hides them, as before. Deploy #12 itself still hides them after a rollback (above).

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
  - Update (Part 18.2): the pointer-following light is removed, so a moving pointer no longer drives any work. Main-thread work per frame on the same sweeps: habit calendar 1.90–1.92 ms, Wealth list 1.89–1.90 ms (two runs each). No long tasks. One habit run had 3 frames over 20 ms (max 83 ms); the other runs had none.
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

**Fail-safe honesty banners** (Part 15, `d5ec3db`):
- Dependencies found, all in `components/shell.tsx`:
  - Both banners required Today settings to be loaded and readable.
  - A damaged account selection (`useWorkspaceSelection` reports `selected` with `error`) hid them.
  - While stores loaded, the whole workspace, including the Showcase banner, workspace status and mode strip, was hidden.
- All three are removed in Shell and CSS. No private-store, vault or sync code changed, and none was needed.
- Checked and not dependent:
  - The Showcase banner uses the tab's Showcase flag.
  - Today's "Testnet Alpha · simulated financial progress" line falls back to the balanced preset when settings are unreadable.
  - The journey banner is static.
- New `tests/honesty-banners.spec.ts` (desktop + mobile, 14 tests):
  - Cases: newer-build and corrupt Today settings, newer-build and corrupt Health, a damaged account selection, and the server-rendered loading state.
  - Each case keeps both banners on all 10 main pages.
  - "Private data could not be read" still shows on Today (settings, Health) and on Health (Health), and stored bytes stay unchanged.
  - A readable Health/Habits-only Today still hides the financial bars.
  - Local: 8 of 14 failed on the previous build (settings ×2, account selection, loading; both projects); 14/14 pass now. The Health cases already passed: Health never gated the banners.
  - Related specs (top bar, mode strip, workspace status, ui-design-pass, ui-evidence): 154 passed.
- Seen, not changed (vault/durable-store code): a durable-store read that never settles would keep the workspace hidden indefinitely. The banners now still show.

**run10-widgets mobile timeout** (Part 16, `1cd6840`):
- Reproduced: 3 of 20 mobile runs timed out (local, production build, 2 workers), median 44.1 s against a 45 s budget.
- Step timing: the four full-page preset screenshots took 6–12 s each (about 35 s); the six-width overflow loop took under 1 s.
- Root cause:
  - The capture cost is linear in page height, 0.82–0.84 ms per CSS px on both builds. iPhone 13 renders at 3×, so each capture is a 12–18 MB PNG.
  - This branch's Today is 1,300–1,400 px taller per preset (Part 8's week section, the journey banner).
  - On main `5dd2ee7` the same test already took about 35 s.
- Fix: the screenshots are review attachments only, so they are now captured at CSS-pixel scale. No assertion or timeout changed.
- After: 20/20 mobile passes (median 11.1 s, max 13.1 s), plus 3 of 3 inside full suites (10.8–12.0 s).

**goal-provider intermittent** (Part 17, `dd16ffd`):
- Reproduction:
  - 0 failures in 20 plain full `pnpm test` runs.
  - Under CPU load (6 busy loops on 4 cores, `--repeats=15`): 2 failures in one run of two ("external same-scope journal intent cancels testnet review before signing" and Session B's "durable journal revisions stop signing…").
- Root cause: `click()` sleeps a fixed 20 ms, and some tests sleep 30–40 ms. The next lines then assert synchronously on async provider work (quote, journal revision check, Web Locks). Session B's `ec3ac7a` had fixed one instance of this.
- Fix: assertions now wait for the state with the file's own `rendered()` poll, and expected disappearances poll until gone. "Unchanged"/"not executed" checks run after the outcome. No expectation was removed and no timeout changed.
- Deterministic proof: a temporary copy with 30 ms latency on every Web Lock and on the quote failed 4 of 29 before the fix and 0 of 29 after. The fixed file under CPU load passed 2 of 2 runs.

**Owner review fixes** (Part 18; local production build, Showcase; no data-format changes):
- 18.1 `a96c63d` **Sidebar tagline.** One visible two-line "SHAPE & FOLD / YOUR OWN FUTURE", resting on the planet's body below the horizon, clear of the rim and the star; the wordmark is unchanged.
  - Cause of the overlap: the gradient was text-clipped on the `<small>` that also held the screen-reader copy, and some engines paint that copy as a second, mixed-case line. The gradient now sits on the two visible lines only; the accessible name is unchanged.
  - Mobile hides this block, as before.
- 18.2 `93f9925` **Nothing follows the pointer.** The specular light, its CSS and the always-on `pointermove` handler are removed. Lift, rim, shadow, hover intent and focus lift are unchanged.
  - Part 12 note updated: per-frame main-thread work on the same sweeps is now 1.90–1.92 ms on the habit calendar and 1.89–1.90 ms on the Wealth list.
- 18.3 `5c54e6c` **Row hover.** Every row-kind target gets a rounded glass pill: radius ≥ 14 px, soft fill, faint rim, extended outward when the row's content reaches its edges. Rows never move or scale, and SVG shapes are never targets.
  - Cause of the Wealth rectangle: the composition rows were registered as tiles (scale 1.04), and the overlay copied their 0 px radius and 0 px padding.
  - Tiles and cards keep their pop-out.
- 18.4 `3219879` **One place for the layout lock.** The Shell has a status row with a slot right after "1000 ZIG demo balance"; `LayoutLockButton` renders there through a portal on every page.
  - The row keeps the lock at the right when the strip is hidden. Settings and Ecosystem have no lock.
  - On phones the lock lines up with the balance line. The whole status strip sits below the navigation there, so "first view" holds on desktop.
- 18.5 `9a06f0e` **One white→nebula style.** Every page title and page eyebrow, plus the standout headings that had their own gradient, use `NebulaFlow` (white to 42%, then the nebula; one sweep that ends in that state; static under reduced motion, Motion Off and forced colours).
  - Removed copies: `.nebula-text` on titles, `.bottom-flow`, `.journey-title-flow`, the `.financial-orbit` gradient, the Habits eyebrow gradient and the Goal detail h1 gradient.
  - The Today hero headline is unchanged.
- 18.6 `56e2e37` **Quick counters as bars.** Icon and name (with today's state under it), then − / count / + and "…", all in one row.
  - 3 per row on desktop, 2 on tablets, 1 on phones, by the card's own width. Names stay on one line.
  - On phones the caption and "…" take a second line, so names never truncate.
  - While unlocked, each bar makes room for its move controls.
- Tests:
  - New `ui-design-pass` checks for 18.3, 18.4, 18.5 and 18.6.
  - Updated at the owner's request, each with its reason in its commit: `brand-nav-polish` (tagline placement), the Part 3 hover test (no pointer tracking), `logo-quickadd-goals-header` and `motion-arrival` (the shared title style).
  - Full suite (local, production build of `56e2e37`, 2 workers): 581 passed, 34 skipped, 3 failed.
    - The intro-video test (desktop, mobile) fails only in this sandbox's Chromium.
    - `product-data.spec.ts:72` (mobile) is the pre-existing local networkidle timeout (see the Known CI intermittents table).
    - The one new skip is the row-pill hover check on mobile.
  - After the #48 merge (`02658e7`, next 16.3.6):
    - lint, typecheck (now including scripts and Workers), unit 1731 passed, `pnpm audit --prod --audit-level high` clean;
    - focused Part 18 specs: 119 passed.

**Open follow-ups** (after Part 18):
- Phones: the layout lock is not on the first screen; the status strip sits below the navigation.
- A durable-store read that never finishes keeps the page area hidden (the banners still show). This is vault code: TIER 3.
- `product-data.spec.ts:72`: the local-only networkidle timeout (unstubbed market request; see the Known CI intermittents table).
- Wrangler 4.144.0 upgrade, per [WRANGLER_UPGRADE_ASSESSMENT.md](run11/WRANGLER_UPGRADE_ASSESSMENT.md).
- [ADR-006](architecture/ADR-006-sync-lost-confirmation.md) decision: parked until Stage 8.

**Local-only observations** (not seen in CI, not changed):
- `product-data.spec.ts:72` (desktop) timed out in `waitForLoadState("networkidle")` after a reload:
  - This branch: 6 of 20. Main `5dd2ee7`: 3 of 20. So it predates this PR.
  - The test doesn't stub `/api/market-*`, so the likely cause is a slow outbound request in this sandbox (not verified).
- `health-daily.spec.ts:93` (desktop) and `owner-preview.spec.ts:28` (mobile) each stalled once in 3 full suites and then passed 20/20 alone.

**Remaining "The Goal Layer for ZIGChain":** `README.md:2`, `apps/web/components/ecosystem-directory.tsx:11` (Ecosystem eyebrow), `landing/index.html:7` (page title), and 12 historical files under `docs/`. The app sidebar no longer shows it.

# Session C — dependency patch updates, audit cleanup and type coverage (2026-09-30, [PR #48](https://github.com/reyals1111-ux/ZIGoals/pull/48), not merged or deployed)

Evidence labels: **local** = this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, production build, Playwright at most 2 workers, Chromium 141 standing in for `chrome`); **CI** = Milestone quality on the PR; **changelog** = official release notes or tag history; **npm** = registry metadata or tarball diff. No account, secret, wallet or deploy was used, and no wrangler command reached Cloudflare. This PR merges after #47 and ships in a later deploy.

## Versions (owner-approved)
| Package | Old | New | Commit |
|---|---|---|---|
| zod (apps/web, shared-types, ecosystem-registry) | 4.6.2 | 4.6.5 | `a43549a` |
| vitest (root) | 5.0.0 | 5.0.2 (+ @vitest/mocker, @vitest/spy 5.0.2; why-is-node-running 2.3.0 → 3.2.2) | `7ceae39` |
| next | 16.3.5 | 16.3.6 (+ @next/env, @next/swc-* 16.3.6) | `95b9364` |
| @opennextjs/cloudflare | 1.20.6 | 1.20.7 (+ @opennextjs/aws 4.1.4 → 4.1.6) | `119f17d` |
| brace-expansion (transitive) | 1.1.18 / 2.1.4 / 5.0.9 | 1.1.21 / 2.1.7 / 5.0.12 | `5c5e389` |
| wrangler | 4.131.1 | unchanged (assessment only) | `8227289` |

`eslint-config-next` stays at 16.3.5 (not approved; ESLint tooling only).

## Parts
| Part | Result | Commits |
|---|---|---|
| 1 | Baseline recorded at `97e2cfd` (numbers below) | — |
| 2 | Release notes read for every version (changelog). next 16.3.6 is two commits: the next/og SVG hardening (GHSA-vcvr-r3jv-pc5j, RCE in next/og ImageResponse; the app does not use next/og) and a test removal. OpenNext 1.20.7 and aws 4.1.5/4.1.6 change cache handlers, cache writes and middleware `set-cookie` splitting; the Alpha config has no cache/ISR/R2 and the middleware sets no cookies. Zod 4.6.3–4.6.5: `.properties()`, `z.url()` and `z.currencyCode()`, none used here. Vitest 5.0.1/5.0.2: automock, fake-timer and matcher fixes, no config change. | — |
| 3 | Four bumps, one commit each, each gated locally (frozen install, lint, typecheck, unit; for next and OpenNext also the build, Alpha package, `RUN11_PACKAGED`, Alpha security gate and full Playwright). **Zod: the stored-data schema snapshot is byte-identical** between 4.6.2 and 4.6.5 (11,203 cases over platform, Habits, Health, dashboard settings, local-simulation backup, vault crypto/sync, financial events, shared types and registry: accept/reject, parsed output, issue codes/paths/messages, JSON Schema). | `a43549a`, `7ceae39`, `95b9364`, `119f17d` |
| 4 | brace-expansion refreshed in range. 5.x needed a narrow override (`minimatch@10>brace-expansion: ^5.0.12`, inside minimatch's own `^5.0.8`) because `pnpm update --depth Infinity` kept the locked 5.0.9; a fresh resolve picks 5.0.12. The Alpha package is unchanged (same upload size and file sizes; `worker.js` byte-identical). | `5c5e389` |
| 5 | `pnpm typecheck` now also checks `scripts/**/*.ts` (root program) and `workers/**/*.ts` plus the market fault fixture (new `tsconfig.workers.json`, Workers runtime types from the pinned `wrangler types`, no new dependency). 14 errors fixed type-only, **no real bugs**; details in the commit. The one code edit passes TextDecoder's WHATWG default `ignoreBOM:false` explicitly (identical behaviour), in its own commit. Not covered: the `.mjs` Workers and the frozen `scripts/**/fixtures/**`. | `dbef748`, `5712293` |
| 6 | [Wrangler upgrade assessment](run11/WRANGLER_UPGRADE_ASSESSMENT.md): recommend 4.144.0 in its own PR. The first release that clears undici is 4.143.1. The deploy output schema, `--secrets-file`, the dry-run size line and the Miniflare API are unchanged. | `8227289` |
| 7 | Alpha guide versions updated; one new local-only intermittent (below). No skip added or changed. CLAUDE.md lists no versions, so no project-rules commit. | `0c2e4ff` |

## Numbers (local unless stated)
| | Before (`97e2cfd`) | After |
|---|---|---|
| `pnpm audit` (full) | 3 low / 8 moderate / 8 high | 3 low / 5 moderate / 2 high |
| `pnpm audit --prod` | 0 | 0 |
| Alpha dry-run upload | 13,345.14 KiB / gzip 2,563.59 KiB | 13,350.56 KiB / gzip 2,566.76 KiB |
| `.open-next` / server function / handler.mjs | 42,093,019 / 32,981,963 / 9,415,687 B | 42,110,902 / 32,997,521 / 9,422,991 B |
| Render wall time, median ms, `next start` (`/app`, goals, health, wealth; 20 requests each) | 10.2 / 7.9 / 6.8 / 7.0 | 10.0 / 7.7 / 6.8 / 7.3 |
| Same under workerd (`preview:alpha`, the OpenNext bundle) | 12.9 / 10.7 / 11.0 / 10.5 | 14.8 / 10.7 / 10.5 / 10.1 |
| `pnpm test` | 1695 passed, 12 skipped | 1697 passed, 12 skipped (+2 type-drift tests) |
| Playwright, full, 2 workers | 488 passed, 21 skipped, 3 failed | 489 passed, 21 skipped, 2 failed |
| Alpha security gate (`public-alpha`, `diagnostics`) | 14 passed | 14 passed |
| `RUN11_PACKAGED` packaged runtime | passed | passed |

Timings are request wall time on this sandbox, not Cloudflare CPU. Every median moved by at most 2 ms, far below the 2000 ms Alpha CPU cap. The Playwright failures are the intro-video specs this Chromium cannot play, plus, in the baseline, the new local intermittent.

**Remaining audit findings:** 10 undici 7.29.0 advisories (2 high), all through wrangler → miniflare, which pins undici exactly. They clear with wrangler ≥ 4.143.1 (Part 6), which is not approved here.

**CI:** green on `95b9364` ([run 36717235041](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36717235041)) and on `119f17d` ([run 36719858553](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36719858553)). The run for the type coverage and docs (from `0c2e4ff`) was pending when this entry was written; the PR shows its result.

**New intermittent (local only):** `product-data.spec.ts:72` networkidle timeout. A/B: 2/20 on next 16.3.5 and 2/20 on 16.3.6, so the bump did not cause it. Recorded in Known CI intermittents.

**TIER 3 commits:** the five `TIER 3 (dependencies)` commits above, each revertable on its own. No auth/sync, deploy-workflow or project-rules change. No workflow, deploy script, contract, wallet/crypto or AGENTS.md file was touched.

**Unverified:** the server-side default behind wrangler 4.141.0's DO code-update strategy (Part 6); real Chrome locally (CI only).

# Session B — reliability, activation readiness and cleanup (2026-09-29 night, follow-up Parts 7–13 on 2026-09-30, [PR #46](https://github.com/reyals1111-ux/ZIGoals/pull/46), not merged or deployed)

Evidence labels: **local** = this cloud session's sandbox (Node 24.19.0, pnpm 11.19.0, 4 vCPU, production build, Playwright at most 2 workers, Chromium 141 standing in for the `chrome` channel because dl.google.com is blocked here); **CI** = Milestone quality on the PR; **doc** = read from the source; **SEARCH-SUMMARY** / **UNVERIFIED** as defined in [FOOD_READINESS.md](run11/FOOD_READINESS.md). No real provider, account, secret, wallet or deploy was used. Live Alpha is unchanged (deploy #12 above).

| Part | Result | Commits |
|---|---|---|
| 0 | Deploy #12 recorded; Known CI intermittents table | `4ef0043` |
| 1a | **account-browser 90 s timeout fixed.** Root cause: the CI integration step ran its 7 browser files in parallel (vitest default); each drives Chrome and workerd, so they starved the 4-vCPU runner. a-first always overlapped them: CI passes took 72.4–88.7 s, and 3 failures hit exactly 90 006 ms. A trace showed 667 actions, no wait above 2.1 s, and CPU-bound steps (vault unlock, consent, save), so it was not a product or test wait. The files now run one at a time. The 90 s budget and all assertions are unchanged. | `8ca0e03`, `d67845d` |
| 1b | Chrome install: up to 3 attempts, each capped at 3 min (catches a hang), 15 s then 45 s backoff, then a clear `::error::`. No new action; job names and steps unchanged. | `9edcc67` |
| 1c | sync-inflight and the click hang: monitor only. Neither failed in any run here (25 local integration runs, 3 CI runs), so there is no #42 diagnostic output to report. | — |
| 2 | [Skipped-test inventory](testing/SKIPPED_TESTS.md): Playwright 21 (5 platform + 16 opt-in captures), Vitest 12 env-gated. `RUN11_GOAL_SOURCE`, the only test no CI step ran, now runs in the integration step. | `3702bed`, `727bf56` |
| 3 | `MARKET_POLICY` template and validator ([market-policy.mjs](../scripts/run11/market-policy.mjs)), ignored owner files, 31 tests with a parity check against the real `DurableMarketAccount`; [key custody](run11/MARKET_KEY_CUSTODY.md); ACTIVATION Stage 6 steps. **`deploy-alpha.yml` not changed**: the live app still reads the key (market-quotes 502 vs 503 and the POST error text) and `alphaRuntimeSecrets` asserts it, so the next Manual Alpha deploy behaves exactly as before. | `c7ea4e6` |
| 4 | [Food readiness](run11/FOOD_READINESS.md): fields and budget checked against the source; `FOOD_USER_AGENT` template plus a 6-test Worker pin; attribution already present, no UI follow-up. The OFF docs were blocked here: limits and licences are SEARCH-SUMMARY, and v3.4 still being served is UNVERIFIED. | `da101c0` |
| 5 | Nothing to change. `pnpm lint` has 0 warnings and `pnpm typecheck` passes; the `use-private-store` cleanup-ref warning was already fixed in `6f378b4`. Its test and the vault sync/cloud-sync tests: 25/25 pass (no code change, so before = after). The middleware→proxy notice stays parked. Observation only: root `tsc` does not include `scripts/**/*.ts`. | — |
| 6 | CLAUDE.md: stale AGENTS.md reference fixed, cloud-sandbox Chrome note, "Big sessions" section; every rule kept (mapping in the PR). | `a7e1d28` |
| 7 | Runner pin: every job in all four workflows is already `ubuntu-24.04` (ci, deploy-alpha, release-candidate, reproducibility; the reusable calls go to pinned workflows), so no change. Because no job uses `ubuntu-latest`, what it resolves to today could not be read from a "Set up job" log. | — |
| 8 | **market-disconnect flake fixed** (test-only). Root cause: the final assertion compared a live `traces` array that the cancel route fills through `ctx.waitUntil` after responding, so under load it could lag the durable follower removal. Reproduced deterministically with a 150 ms trace delay. The 500 ms cleanup check stays; the trace now gets its own wait. The CI 30 s abort timeout (#42) did not reproduce, so the steps now have labelled 10 s deadlines. Proof: 30/30 consecutive passes (24 alone, 6 under full `pnpm test`). | `b3a853e` |
| 9 | Food: 15 product reads/min per IP is the binding limit (doc-verified via the owner's chat session, 2026-09-30); the Worker uses at most 5/min. Shared Cloudflare egress can bring 429/503 below our budget: new `food-throttle.test.mjs` pins the 60 s backoff and the honest "cooling down" path. Fit for about 20 friends: suitable, but lookups are not queued. v3.4 and the licence wording stay UNVERIFIED. | `cc212b9` |
| 10 | **TIER 3 (project rules):** CLAUDE.md gains a "Hard rules" section with the 4 missing rules (no new dependencies, deploys only via Manual Alpha, never weaken assertions, protected baseline). The other 3 rules were already stated. | `031e567` |
| 11 | Scripts typecheck: including `scripts/**/*.ts` in root tsc surfaced 14 errors: 2 in scripts, plus 12 from `workers/market-coordinator/worker.ts` (imported by `market-fault-fixture.ts`), which needs `cloudflare:workers` types. Fixing it needs a type shim and production worker edits, or a new dependency, so the config change was kept out (list in the PR). | — |
| 12 | Dependency report: reported to the owner, not committed. | — |
| 13 | [ADR-006](architecture/ADR-006-sync-lost-confirmation.md) decision memo (proposal): recommends option A (persist the prospective confirmation, `PENDING_POLICY` 2→3). Identical-content auto-resolve already exists and does not cover the case. | `f5cec44` |

**TIER 3 commits:** `a7e1d28` and `031e567` (project rules). Risk: wording and added rules only; no command or rule removed; the owner approves in review. There are no auth/sync or deploy-workflow changes (Part 7 needed none).

**Evidence (not summed across runs):**
- account-browser, local, CI command:
  - before, all files in parallel: 5/5 runs passed; a-first 75.1–86.6 s, b-first 64.0–66.7 s.
  - after, one file at a time: **20/20 consecutive runs passed** (all 10 tests each time); a-first 62.8–67.0 s, b-first 62.6–66.5 s; step 180–189 s.
  - The local before rate (0/5 failures) is lower than CI's (3 of 14 attempts).
- account-browser, CI after the fix:
  - [run 36636240339](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36636240339) (`3702bed`): step 176 s, a-first 60.6 s.
  - [run 36642420563](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36642420563) (`727bf56`): step 198.7 s, a-first 67.2 s, `RUN11_GOAL_SOURCE` check passed in 18.5 s.
  - Both runs: all checks green.
- `RUN11_GOAL_SOURCE`, local: 11/11 consecutive passes.
- Unit, local at `727bf56` (`pnpm test`): 1692 passed, 12 skipped, 1 failed. The failure was `market-disconnect`, a known intermittent; its re-run passed 2/2.
- New suites: market-policy 31/31, food-user-agent 6/6.
- Playwright, local full run: 488 passed, 21 skipped, 3 failed. All 3 need the intro MP4, which this sandbox Chromium cannot play; the same specs pass in CI Chrome.

**Follow-up evidence (2026-09-30, local unless stated):**
- market-disconnect: 30/30 consecutive passes after the fix. Failing-first: both cases fail with a 150 ms trace delay before the fix and pass after it. The fixed test still fails if the trace never arrives.
- Full `pnpm test`, 6 runs: 1695 passed and 12 skipped each; one run also had 1 failure in `goal-provider.test.ts`, now listed as an intermittent.
- New `food-throttle.test.mjs`: 2/2.
- Lint and typecheck are clean before every push.

**Owner next steps (Stage 6):**
1. Fill `scripts/run11/market-policy.template.json` privately from the CoinGecko dashboard. Run `market-policy.mjs`, then pass the output to `make-private-configs --market-policy-file`.
2. Choose the food contact for `FOOD_USER_AGENT`.
3. Recheck the Open Food Facts limit, v3.4 and the attribution wording in a normal browser.

**Unverified:** everything the OFF documentation would confirm (listed in FOOD_READINESS.md); real Chrome behaviour locally (CI only); hosted or provider behaviour of any kind.

# Alpha deploy — 2026-09-30 evening, `dd0e8a1` live

Evidence labels: **CI log** = the deploy job's step "Report version IDs even after failure" in the run below, read via the Actions API by the Session A cloud session on 2026-09-30; **Actions API** / **git** = read at the same time; **owner-reported** = as the owner reports it.

- **Run:** Manual Alpha deployment #14, [run 36758399823](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36758399823), 2026-09-30 18:24–18:33 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `dd0e8a120917f009ea12103f12373a582056c7e1`, `main` after #47. (Actions API, CI log)
- **Live Alpha:** Worker `zigoals-alpha`, new version `48806961-9b29-41a5-a402-f24851d32e6f`. The last observed live version is the same. (CI log)
- **Rollback:** `c4dda780-bf37-48ac-9e0d-633b22991018`, the version deploy #13 published, so the chain holds. (CI log)
- **CI on `dd0e8a1`:** Milestone quality #247 ([run 36756950723](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36756950723)): success on attempt 1. (Actions API)
- **Owner manual checks:** owner-reported: the live Alpha works after this deploy (owner visual check). Real Keplr/reload/reconnect, Habit/Health persistence and mobile checks are not reported with this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#47](https://github.com/reyals1111-ux/ZIGoals/pull/47) (`dd0e8a1`): Session A UI design pass (Parts 1–18). The Session A entry above was finished after the merge (this docs PR).

# Alpha deploy — 2026-09-30 evening, `c4135f1` live

Evidence labels: **CI log** = the deploy job's step "Report version IDs" in the run below, read by the owner; **Actions API** / **git** = read on 2026-09-30 by the Session A cloud session; **owner-reported** = as the owner reports it.

- **Run:** Manual Alpha deployment #13, [run 36754770398](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36754770398), 2026-09-30 17:54–18:04 UTC, one attempt. Result **success** (Actions API), `VERIFIED` (CI log).
- **Source:** `c4135f1cca5e827e805a45f822eaea4a01a8d6fc`, `main` after #48. (Actions API)
- **Live Alpha:** Worker `zigoals-alpha`, new version `c4dda780-bf37-48ac-9e0d-633b22991018`. The last observed live version is the same. (CI log)
- **Rollback:** `f5bb9d20-6edd-4a62-a8a0-8bb8cee30597`, the version deploy #12 published, so the chain holds. The new version starts `c4dd…`, the rollback `f5bb…`. (CI log)
- **CI on `c4135f1`:** Milestone quality #245 ([run 36753124379](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36753124379)): success on attempt 1. (Actions API)
- **Owner manual checks** (visual, real Keplr/reload/reconnect, Habit/Health persistence, mobile): not reported with this record. They are separate from it.

**Merged since the last record** (git, first-parent history of `main`):
- [#46](https://github.com/reyals1111-ux/ZIGoals/pull/46) (`97e2cfd`): Session B reliability, activation readiness and cleanup (integration files run one at a time, Chrome install retries, project rules).
- [#48](https://github.com/reyals1111-ux/ZIGoals/pull/48) (`c4135f1`): Session C dependency patch updates, including next 16.3.5 → 16.3.6 for GHSA-vcvr-r3jv-pc5j, audit cleanup and a typecheck of scripts and Workers.

Not in this deploy: [PR #47](https://github.com/reyals1111-ux/ZIGoals/pull/47) (this UI design pass) is still open. The Session B and Session C entries above were written before their PRs merged.

# Alpha deploy — 2026-09-29 night, `5dd2ee7` live

Evidence labels: **CI log** = the deploy job's step "Report version IDs even after failure" in the run below, read by the owner; **Actions API** / **git** = read on 2026-09-29 by the Session B cloud session; **owner-reported** = as the owner reports it.

- **Run:** Manual Alpha deployment #12, [run 36620008178](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36620008178), 2026-09-29 19:32–19:38 UTC, one attempt. Result **success**, `VERIFIED`. (Actions API, CI log)
- **Source:** `5dd2ee7aae34331ee935eac3f64d5d870c92e997`, `main` after #45. (Actions API)
- **Live Alpha:** Worker `zigoals-alpha`, new version `f5bb9d20-6edd-4a62-a8a0-8bb8cee30597`. The last observed live version is the same. (CI log)
- **Rollback:** `f15bb757-328f-46a6-b9c4-193f44fb83d3`, the version deploy #11 published, so the chain holds. Note that the two IDs look alike (`f5bb…` new, `f15b…` rollback). (CI log)
- **CI on `5dd2ee7`:** Milestone quality #191 ([run 36615665433](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36615665433)): success on attempt 2. Attempt 1 failed only in browser shard 1, at the Chrome download (`curl: (92) HTTP/2 stream 1 was not closed cleanly: INTERNAL_ERROR`); attempt 2 re-ran that shard. (Actions API)
- **Owner manual checks** (visual, real Keplr/reload/reconnect, Habit/Health persistence, mobile): owner-reported: pending. They are separate from this record.

**Merged since the last record** (git, first-parent history of `main`):
- [#42](https://github.com/reyals1111-ux/ZIGoals/pull/42) (`580ef18`): sync harness diagnostics (test-only).
- [#44](https://github.com/reyals1111-ux/ZIGoals/pull/44) (`95802cb`): record of the `07f5c90` deploy and README refresh.
- [#43](https://github.com/reyals1111-ux/ZIGoals/pull/43) (`a5de190`): activation tooling (hermetic harnesses, lifecycle `AUTH_ORIGIN`, private config generator). This closes the three Stage 4 gaps listed below.
- [#39](https://github.com/reyals1111-ux/ZIGoals/pull/39) (`be00404`): backups include legacy Local simulation Goals (format 2).
- [#45](https://github.com/reyals1111-ux/ZIGoals/pull/45) (`5dd2ee7`): consent checkbox labels in the account/sync flow.

The section below still lists #39 and #42 as open; it was accurate when written.

## Known CI intermittents
**Policy:** one re-run each, then investigate. A second failure of the same test is a real failure.

| Intermittent | Seen | Scope | State |
|---|---|---|---|
| Browser click hang | ≈1 in 400 tests | Browser-level; see closed draft #38 | Monitor |
| `account-browser` (a-first reconnect) 90 s vitest timeout | 3× on main-based runs (#41, #42, #44) | web integration job | **Fixed in #46** (`8ca0e03`): CPU contention from running the 7 browser files in parallel; they now run one at a time. See the Session B entry above |
| `run10-motion.spec.ts:5` (desktop) hero mid-entrance sample equals its end; `brand-nav-polish.spec.ts:51` (mobile) navigation glide | CI: once each on #54 (`15ad75c`, run 36865907188); passed on every later run and in both local full suites | web browser suite | Monitor (motion timing) |
| `run11-recovery-failures.spec.ts:22` (mobile) 45 s timeout at `page.reload` (`net::ERR_ABORTED`) | CI: once on #54 (`9bd1dee`, run 36868939969, shard 3); passed on every later run, 30/30 locally | web browser suite | Monitor |
| `sync-inflight-edit-browser` "Sync was not confirmed" | 2× on #39's earlier merge | web integration job | Monitor. The #42 request logging is on `main` |
| `market-disconnect.test.mjs` "abort of an actual app request forgets its follower…" | CI: 30 s timeout once (#42 attempt 5), once on #52 (`212c61e`, run 36804922026; passed on the next run), and twice on #53 (`96bbdc6`, run 36863279127; `9dba9ac`, run 36864633479). Then once more on `11222cb` (run 36875302540): "Chrome launch did not finish within 10000 ms", under the 10 s step limit `aa7cdaa` had added. Local: one assertion miss under full `pnpm test` load | web checks (unit) | **Fixed in #46** (`b3a853e`): cancel-trace race, 30/30 passes. **Root cause found and fixed in #53**: Chrome's cold start on a busy runner ran inside the case's 30 s budget, and the cleanup that waited on the in-page follower hid it. `aa7cdaa` named the steps and bounded cleanup. `e73142c` starts Chrome once in `beforeAll`, outside each case's budget, with Playwright's 30 s launch timeout. No assertion changed |
| `goal-provider.test.ts` "durable journal revisions stop signing even when the external event was missed" | Local: once in 6 full `pnpm test` runs (2026-09-30); the assertion ran while the UI still showed "Processing…" | web checks (unit) | **Fixed in #47** (`dd16ffd`): fixed 20–40 ms sleeps before assertions on async provider work; the tests now wait for the state. Deterministic proof: 30 ms lock/quote latency failed 4/29 before, 0/29 after |
| `run10-widgets.spec.ts:20` (mobile) 45 s timeout | Local: 3 of 20 mobile runs on #47 (median 44.1 s); once in a local full suite | web browser suite | **Fixed in #47** (`1cd6840`): full-page 3× preset screenshots of a taller Today; now captured at CSS scale, 23/23 after (median 11.1 s) |
| Chrome download in CI (dl.google.com HTTP/2 `INTERNAL_ERROR`, or a hanging `playwright install`) | Infrastructure (main `5dd2ee7` attempt 1; #40 attempt 1; #54 `6659073` shard 2, all 3 attempts, run 36884511291; main `75bf649` attempt 1, shard 2, run 36882221079, at the same time) | browser shards and integration | **Mitigated in #46** (`9edcc67`): up to 3 attempts of at most 3 min each, then a clear `::error::` |
| `product-data.spec.ts:72` "private Habit and Health sentinel values stay outside…": `waitForLoadState("networkidle")` after reload hits the 45 s test timeout | Local sandbox only (2026-09-30): 1–2 per full run; A/B 2/20 on next 16.3.5 and 2/20 on 16.3.6; 4/20 in Session D's instrumented runs. Not seen in CI | web browser suite | **Fixed in #50** (`0a11876`, test-only): not a market request. Next.js link prefetches cancelled by the navigation while the test's `page.route()` held them are never reported finished or failed, so Playwright's networkidle never fires. The reload now settles on the requests the reloaded page starts; route, recorder and assertions unchanged. 40/40 consecutive after (20 desktop + 20 mobile) |

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
Updated 2026-10-01 afternoon for the [Alpha deploy #18](#alpha-deploy--2026-10-01-afternoon-75bf649-live) above (recorded by Session G).
- Deployed source `75bf6497400f1c19915a0e8ec20634faf1baf65f`, `main` after [PR #53](https://github.com/reyals1111-ux/ZIGoals/pull/53). Verified: Actions API.
- CI: Milestone quality #297 ([run 36882221079](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36882221079)) on `75bf649`: success (attempt 2; attempt 1 failed only in a Chrome download step before any test ran). Verified: Actions API.
- Deployment: Manual Alpha deployment #18 ([run 36893334826](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36893334826)), exact source `75bf649`: success, `VERIFIED`. Verified: CI log (Actions API), Actions API.
- Alpha Worker `zigoals-alpha`: live version `84cf9652-f7fc-4bd8-a83b-0f1c663172ff`; rollback `be41026f-1be9-423e-b4d8-71d4be54aea0` (the run #17 deployment). Verified: CI log. Owner manual checks: not reported with this record.

Previous release identity (PR #52, 2026-10-01 morning, recorded by Session G):
- Deployed source `61035dc5ba3b26bafe41276599a0452b45c3208b`, `main` after [PR #52](https://github.com/reyals1111-ux/ZIGoals/pull/52). Verified: Actions API.
- CI: Milestone quality #276 ([run 36834550733](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36834550733)) on `61035dc`: success (attempt 1). Verified: Actions API.
- Deployment: Manual Alpha deployment #17 ([run 36836555458](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36836555458)), exact source `61035dc`: success, `VERIFIED`. Verified: CI log (Actions API), Actions API.
- Alpha Worker `zigoals-alpha`: live version `be41026f-1be9-423e-b4d8-71d4be54aea0`; rollback `f00a117f-a283-4b6e-a8f7-ab0bfed248af` (the run #16 deployment). Verified: CI log. Owner manual checks: not reported with this record.

Previous release identity (PR #51, 2026-10-01 morning, recorded by Session E):
- Deployed source `771e2ad4f3ab1bbc976d58662b896448e06a99e6`, `main` after [PR #51](https://github.com/reyals1111-ux/ZIGoals/pull/51). Verified: Actions API.
- CI: Milestone quality #272 ([run 36820681369](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36820681369)) on `771e2ad`: success (attempt 1). Verified: Actions API.
- Deployment: Manual Alpha deployment #16 ([run 36826122295](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36826122295)), exact source `771e2ad`: success, `VERIFIED`. Verified: CI log (Actions API), Actions API.
- Alpha Worker `zigoals-alpha`: live version `f00a117f-a283-4b6e-a8f7-ab0bfed248af`; rollback `c1b3c40c-3559-4b7d-a3d7-04f2f9657e6d` (the run #15 deployment). Verified: CI log. Owner manual checks: not reported with this record.

Previous release identity (PR #50, 2026-09-30 night, recorded by Session F):
- Deployed source `d21ba8fdc6eefdd2af3418dfb2d104831c60467f`, `main` after [PR #50](https://github.com/reyals1111-ux/ZIGoals/pull/50). Verified: Actions API.
- CI: Milestone quality #254 ([run 36783131097](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36783131097)) on `d21ba8f`: success (attempt 2; attempt 1 not examined here). Verified: Actions API.
- Deployment: Manual Alpha deployment #15 ([run 36785808558](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36785808558)), exact source `d21ba8f`: success, `VERIFIED`. Verified: CI log (Actions API), Actions API.
- Alpha Worker `zigoals-alpha`: live version `c1b3c40c-3559-4b7d-a3d7-04f2f9657e6d`; rollback `48806961-9b29-41a5-a402-f24851d32e6f` (the run #14 deployment). Verified: CI log. Owner manual checks: not reported with this record.

Previous release identity (PR #47, 2026-09-30 evening):
- Deployed source `dd0e8a120917f009ea12103f12373a582056c7e1`, `main` after [PR #47](https://github.com/reyals1111-ux/ZIGoals/pull/47). Verified: Actions API.
- CI: Milestone quality #247 ([run 36756950723](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36756950723)) on `dd0e8a1`: success (attempt 1). Verified: Actions API.
- Deployment: Manual Alpha deployment #14 ([run 36758399823](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36758399823)), exact source `dd0e8a1`: success, `VERIFIED`. Verified: CI log (Actions API), Actions API.
- Alpha Worker `zigoals-alpha`: live version `48806961-9b29-41a5-a402-f24851d32e6f`; rollback `c4dda780-bf37-48ac-9e0d-633b22991018` (the run #13 deployment). Verified: CI log. Owner manual checks: owner-reported: the live Alpha works (visual check); the other checks pending.

Previous release identity (PR #48, 2026-09-30 evening):
- Deployed source `c4135f1cca5e827e805a45f822eaea4a01a8d6fc`, `main` after [PR #48](https://github.com/reyals1111-ux/ZIGoals/pull/48). Verified: Actions API.
- CI: Milestone quality #245 ([run 36753124379](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36753124379)) on `c4135f1`: success (attempt 1). Verified: Actions API.
- Deployment: Manual Alpha deployment #13 ([run 36754770398](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36754770398)), exact source `c4135f1`: success, `VERIFIED`. Verified: CI log read by the owner, Actions API.
- Alpha Worker `zigoals-alpha`: live version `c4dda780-bf37-48ac-9e0d-633b22991018`; rollback `f5bb9d20-6edd-4a62-a8a0-8bb8cee30597` (the run #12 deployment). Verified: CI log read by the owner. Owner manual checks: not reported.

Previous release identity (PR #45, 2026-09-29 night):
- Deployed source `5dd2ee7aae34331ee935eac3f64d5d870c92e997`, `main` after [PR #45](https://github.com/reyals1111-ux/ZIGoals/pull/45). Verified: Actions API.
- CI: Milestone quality #191 ([run 36615665433](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36615665433)) on `5dd2ee7`: success (attempt 2; attempt 1 hit the Chrome download intermittent). Verified: Actions API.
- Deployment: Manual Alpha deployment #12 ([run 36620008178](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36620008178)), exact source `5dd2ee7`: success, `VERIFIED`. Verified: CI log read by the owner, Actions API.
- Alpha Worker `zigoals-alpha`: live version `f5bb9d20-6edd-4a62-a8a0-8bb8cee30597`; rollback `f15bb757-328f-46a6-b9c4-193f44fb83d3` (the run #11 deployment). Verified: CI log read by the owner. Owner manual checks: owner-reported: pending.

Previous release identity (PR #40, 2026-09-29 evening):
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
