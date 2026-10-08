# Handoff: X-Cloud → X-LOCAL

Session X-Cloud (`feature/session-x-cloud`, [PR #78](https://github.com/reyals1111-ux/ZIGoals/pull/78)) never edits
X-LOCAL's lane (`apps/web/components/zigi/**`, `apps/web/lib/ai/**`, `public/brand/figures/zigi*`, ZIGi docs and specs,
the golden set, Settings' ZIGi group, Help's ZIGi topic, `/api/zigi`). Each item below is something X-Cloud found that
needs a change there: what, where, evidence, suggested fix. Newest last. X-LOCAL's own requests to X-Cloud go in
`docs/handoff/X_LOCAL_TO_CLOUD.md` on `feature/session-x-local-zigi`; X-Cloud reads that file at every gate.

## H1 — Secret-shaped literals in ZIGi's tests (Session X Part 2, 2026-10-07)
**What.** `apps/web/lib/ai/memory.test.ts:49` holds `'AIzaSy…'` with exactly 35 characters after `AIza`: GitHub's secret
scanning pattern for a Google API key matches it (the only literal in the repository that does). It is a fictional value
in the memory refusal test. Line 158 holds an OpenAI-shaped `sk-proj-…` (not GitHub's OpenAI pattern, but a generic
scanner's).

**Evidence.** `scripts/check-secrets.mjs` (extended in Part 2 with provider shapes) finds it as "Google API key"; it
passes today only because `scripts/secret-allowlist.json` pins that one value (file + check + sha256). git history
(`5fb09cb`, `5367eb8`) keeps the literal, so a GitHub alert, if one was raised, needs dismissing as a test value by the
owner.

**Suggested fix (exact, values unchanged at run time):**
- Line 49 → 
  ```ts
  // The sample keys are joined at run time so no key-shaped literal sits in the source (GitHub's secret scanning matched
  // the Google sample; Session X Part 2). The values the test checks are unchanged.
  for (const secret of ['My key is ' + ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz012345'].join('-'), ['AI', 'zaSyA1234567890abcdefghijklmnopqrstuv'].join(''), ['xai', 'abcdefghijklmnopqrstuvwxyz'].join('-'), `0x${'ab'.repeat(32)}`, 'password: hunter22', 'My recovery phrase is apple banana cherry', 'pin = 1234', 'Bearer abcdefghijklmnopqrstuvwxyz123']) {
  ```
- Line 158 →
  ```ts
  expect(refusal({kind: 'remember', text: 'My OpenAI key is ' + ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz012345'].join('-')})).toBe(SECRET_REFUSAL);
  ```
- Then remove the one entry from `scripts/secret-allowlist.json` (if X-LOCAL merges second; otherwise X-Cloud removes it
  when it merges main). A stale entry only prints a warning; it never fails CI.

**The same hygiene, optional (none matches a GitHub pattern today; generic scanners may flag them):**
`apps/web/lib/ai/errors.test.ts:8` (`AIzaSyFAKE…`, `xai-FAKE…`, `sk-or-v1-…`), `apps/web/lib/ai/keys.test.ts:6,25,26,31`
(`sk-test-FAKE…`, `sk-ant-FAKE-…`), `apps/web/lib/ai/export.test.ts:10,20`, `apps/web/lib/ai/chats.test.ts:33,88`,
`apps/web/lib/ai/launcher-record.test.ts:24`, `apps/web/lib/ai/settings.test.ts:31`, `apps/web/lib/ai/voice.test.ts:37,39`,
`apps/web/lib/ai/openrouter-auth.test.ts:34,35`, `apps/web/lib/ai/fixtures/mock-streams.ts:6` (`FAKE_KEY`),
`apps/web/tests/your-ai-captures.spec.ts:20`, `apps/web/tests/zigi-memory.spec.ts:69` (`password: …`). The repository's
convention is the fragment join used in `scripts/secret-patterns.test.mjs` (`"sk-" + "ant-" + …`).

## H2 — Import zod as a namespace in ZIGi's 19 files (Session X Part 5, 2026-10-08)
**What.** `import {z} from 'zod'` makes Turbopack keep zod's whole namespace object, so every page carried all of zod's
locales (167.7 KB minified) and its JSON-Schema converters (67 KB). zod v4's own form, `import * as z from 'zod'`, lets
Turbopack keep only what is used. X-Cloud changed its 99 files (`[TIER 3]` commit on `feature/session-x-cloud`; same
functions, so no behaviour change). ZIGi's lane still has the old form in 19 files, which keeps the locales on Today
(`/app`) and Activity:
`apps/web/lib/ai/{settings,chats,keys,hosted}.ts`, `apps/web/lib/ai/actions/schema.ts`,
`apps/web/lib/ai/store/{actions,records}.ts`, `apps/web/lib/ai/tools/{goals,health,life-w,habits,memory,activity,health-w,wealth,types}.ts`
`apps/web/lib/server/zigi-route.ts` (behind `/api/zigi`; server code, so no page weight, changed for consistency) and the
two test files under `apps/web/lib/ai` that `grep -rlE "import \{ ?z ?\} from ['\"]zod['\"]" apps/web/lib/ai` lists.

**Evidence (local production builds, gzip, 2026-10-08).** All 118 files changed: `/app` 550.6 kB, Activity 401.9 kB,
shell 396.0 kB. X-Cloud's 99 only: `/app` 611.1 kB, Activity 462.4 kB, shell 401.0 kB. So ZIGi's files are worth about
60 kB on Today and Activity and 5 kB on every page.

**Suggested fix (one command, then typecheck and the ZIGi suites):**
```sh
grep -rlE "import \{ ?z ?\} from ['\"]zod['\"]" apps/web/lib/ai apps/web/components/zigi apps/web/lib/server/zigi-route.ts | xargs sed -i -E "s/import \{ ?z ?\} from (['\"])zod(['\"]);/import * as z from \1zod\2;/"
```

## H3 — Lowered page-weight budgets (Session X Part 5c, 2026-10-08)
`scripts/weight-budgets.json` now holds X-Cloud's measurement plus about 5 kB per page (CI's integration job checks
them). If ZIGi's merge makes a page heavier than its budget, raise that budget in the same change with the reason
(the file's rule). After H2, Today and Activity are about 60 kB lighter, so whichever lane merges second can lower
those two budgets to the new measurement plus about 5 kB.

## 2026-10-08 — Gate A answers (X-Cloud read X-LOCAL's handoff at `4088f10`)
- **Next.js advisory (your "CI: the dependency audit fails"):** done on X-Cloud as `[TIER 3] (dependencies)`, `next`
  16.3.6 → 16.3.8 (ADR-016 X23). Your branch goes green at that step once it merges main after X-Cloud, or picks the
  same one-line bump up when main has it; nothing to do in your lane.
- **`sleep.spec.ts:40`:** fixed at its cause on X-Cloud (ADR-016 X25): the same check polls until the charts' ResizeObserver
  settled; overflow that stays still fails.
- **Home GPU by `.local` name:** recorded as an owner decision, not implemented (ADR-016 X24; `ROADMAP_SWEEP_X.md`). It widens
  `connect-src` to `http://*.local:*`, which this session does not do without the owner.
- **H2 at merge time (your 2026-10-08 measurement):** agreed, the saving needs every importer on one form. Proposal: whichever
  PR merges second applies H2's `sed` to the files still on the braces form in its merge-main commit. If that is X-Local,
  it is your lane. If it is X-Cloud, the 19 files sit in your lane, so X-Cloud does not edit them: the PR description lists
  it as an owner item (one command, then `pnpm typecheck` and the ZIGi suites). Until then nothing exceeds a budget:
  X-Cloud's branch already is that mix (its 99 files on the namespace form, your 19 on braces) and its budgets in
  `scripts/weight-budgets.json` were measured on it (H3); the 19 files only keep zod's locales on Today and Activity.
- **What's new:** X-Cloud adds no What's new link and does not touch `lib/whats-new.ts` (your release id stands). Its
  person-visible additions (Help → Known limitations, Send feedback with optional device details) are listed in Help and
  in the friends guide only.

## H4 — Name Meet ZIGi in the browser tab (Session X Part 12, 2026-10-08)
**What.** Every page now has its own document title, `"<page> · ZIGoals Alpha"` (WCAG 2.4.2; ADR-016 X39): the root
layout's title is a template, and each page exports `metadata.title`. `/app/zigi` is in your lane, so it keeps the default
title ("ZIGoals Alpha — Your goals. Onchain.") until you add, in `apps/web/app/app/zigi/page.tsx` (a server page):
```ts
import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Meet ZIGi'};
```
**Why.** Without it, Meet ZIGi is the one page whose tab, history entry and screen-reader announcement do not name it.
`tests/page-titles.spec.ts` lists every other page; add `['/app/zigi', 'Meet ZIGi']` there when you do.

## H5 — WCAG 2.2 AA: what X-Cloud checked around ZIGi (Session X Part 12, 2026-10-08)
**Nothing for you to change; for your information.** `tests/a11y-wcag-x.spec.ts` checks every page on both projects and
leaves ZIGi's surfaces out (its `ZIGI` selector: `.ai-launcher`, `.ai-panel`, `.ai-edge-tab`, `[data-testid="ai-launcher"]`,
`[class*="zigi"]`). Results and fixes: `docs/accessibility/WCAG_X.md`.
- **One shell change that helps ZIGi too (F4):** a focused control could end up entirely behind the floating buttons at the
  bottom (on phones the music and ZIGi buttons above the tab bar). The page now keeps keyboard focus above them with
  `scroll-padding-bottom` (84 px on computers in `globals.css`, tab bar + 88 px on phones in `phone-shell.css`). Nothing
  moves; if ZIGi's launcher ever grows taller than about 70 px, those two values are the ones to raise.
- **A read-only smoke of your launcher and panel (MOCK, every `/api` answered 503, nothing typed or sent), both projects:**
  the audit helper found nothing on the launcher or the open `dialog.ai-chat`; every control in the panel has a name and a
  visible ring; Tab stays inside the panel and cycles; Escape returns focus to "Open ZIGi"; every target is at least
  24 × 24 px (desktop toolbar buttons 36 px tall, 44 px on phones). Meet ZIGi (`/app/zigi`) was not checked (H4 names it).
- **If you want the same checks on your surfaces:** run the spec with your pages added to its `PAGES` list and the `ZIGI`
  exclusion narrowed; it needs no new dependency.

## H6 — Settings: ZIGi's section grows after a jump below it (Session X Part 14, 2026-10-08)
**What X-Cloud saw (journey J201, local production build):** on a computer, the Settings section link "Help & diagnostics"
(`#settings-help`), tapped before ZIGi's settings body has loaded, landed with its title about 930 px below the top of the
window: `components/ai/ai-settings-section.tsx` loads the body when the section comes within 800 px or the browser is
idle, the section then grows by about 900 px above the target, and the browser's scroll anchoring did not absorb it.
**What X-Cloud did in its lane:** `components/settings/keep-jump.tsx` holds a Settings jump target in place for two
seconds after the jump unless the person scrolls, taps or types (ADR-016 X44). Nothing in your files changed.
**Suggestion for your lane (optional):** reserve the section's height before the body loads (a `min-height` on the
placeholder close to the loaded height), so nothing below it moves at all. Tested by
`tests/session-x-findings.spec.ts` ("J201: …"); it should keep passing either way.
