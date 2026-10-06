# Trusted Types: inventory, trial and the way to enforcement

> **Status (2026-10-06, Session V Part 19, [PR #76](https://github.com/reyals1111-ux/ZIGoals/pull/76)): enforced in every production build.** `require-trusted-types-for 'script'; trusted-types default` is part of the enforced CSP (`TRUSTED_TYPES` in `apps/web/lib/security-policy.ts`), after the full browser suite on both projects ran clean under the trial (results below, "Session V"). The development server stays unenforced. The trial mechanism stays. Session U's text below is kept as the record.

Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04). **Nothing is enforced by this PR.** It ships three things:

1. this inventory of the places where the app hands a string to the browser as HTML, script or a script URL;
2. an inert `default` policy, which a browser consults only on a page whose CSP asks for Trusted Types (no build does);
3. a local trial: the Report-Only directive sent to a collector on this machine, run against the full browser suite, and the findings below.

Enforcement is a later, separate change (see "Before enforcing").

## Why

Trusted Types make the browser refuse a raw string at an HTML, script or script-URL sink (`innerHTML`, `eval`,
`script.src`…). Only a value made by a named policy gets through. For this app an injected script is total compromise:
it runs with the open vault. So a second wall behind the CSP is worth having, once it is known not to break anything.

## Sink inventory (source, read 2026-10-05)

A search of the app's own code (`apps/web/app`, `components`, `lib`, `instrumentation-client.ts`, `public`, `packages`;
tests excluded) for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `dangerouslySetInnerHTML`,
`eval(`, `new Function`, string timers, `srcdoc`, `new Worker(`, `serviceWorker.register`, `importScripts`,
`parseFromString`, `createContextualFragment`, `.src =` and `setAttribute('src'|'href'|'on…')` finds three places. None of them is an HTML sink:

| Where | What it does | Trusted Types sink? | Under the default policy |
|---|---|---|---|
| `apps/web/lib/push/device.ts` (`navigator.serviceWorker.register(SW_URL)`) | registers the push-only service worker (ADR-010) | yes: a script URL | `/push-sw.js` on this origin is allowed |
| `apps/web/lib/vault/zod-jitless.ts` | turns off zod's `new Function` probe before any schema is built (QA-25) | it removes a script sink | nothing reaches one |
| `apps/web/components/logo-intro.tsx` (`<source>.src`) | the intro video's sources | no: a media URL is not a script | not consulted |

The framework and libraries in the production build (Turbopack chunks under `.next/static/chunks`, read 2026-10-05):

| Where | What it does | Trusted Types sink? |
|---|---|---|
| Turbopack's chunk loader (`turbopack-*.js`) | `script.src = <chunk URL>` for every chunk loaded later | yes: a script URL. Chunk URLs are under `/_next/static/`, which the default policy allows |
| React DOM | `innerHTML` for `dangerouslySetInnerHTML` (the app uses none) and `innerHTML = "<script></script>"` when React creates a `<script>` element in the browser | yes: HTML. Whether it fires is a trial question |
| Next's inline scripts (`self.__next_f.push(…)`) | rendered by the server with the nonce | no: not a DOM sink |

The built chunks contain no `trustedTypes` and no `createPolicy`: no library makes its own policy today.

## The inert default policy

`apps/web/lib/trusted-types.ts`, installed by `apps/web/instrumentation-client.ts` right after the zod import:

- it handles **script URLs only**: same-origin `/_next/static/…` and `/push-sw.js`; anything else returns `null`;
- it makes no HTML and no script string trusted (no `createHTML`, no `createScript`);
- a refusal returns `null` and never throws. Under enforcement the browser then blocks the sink; under the report-only
  trial it reports the sink and lets it run. A throwing default policy would break the page even in report-only mode;
- a page that already has a `default` policy keeps it; a browser without Trusted Types (Firefox, Safari today) skips it.

No CSP of any build mentions Trusted Types, so browsers never call the policy outside the trial.

## The trial (local only)

The directives are one exported constant, `TRUSTED_TYPES_TRIAL` in `apps/web/lib/security-policy.ts`, kept apart from
the enforced policy. `middleware.ts` sends them as `Content-Security-Policy-Report-Only`, with `report-uri` pointing at a
collector, **only** when `ZIGOALS_TRUSTED_TYPES_TRIAL` is a plain `http://127.0.0.1…` or `http://localhost…` URL **and** the
request itself is addressed to `127.0.0.1` or `localhost`. A public page never carries it, even if the variable were set
there. Unit tests: `apps/web/lib/trusted-types-trial.test.ts`, `apps/web/lib/trusted-types.test.ts`,
`scripts/trusted-types-trial.test.mjs`; the browser spec `apps/web/tests/trusted-types-trial.spec.ts` adds the trial's
directives to `/app` documents itself (no collector), so every CI run checks that soft navigation still works under them.

Steps (one at a time, each in its own terminal):

1. Build once: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`.
2. Start the collector: `node scripts/trusted-types-trial.mjs collect /tmp/zigoals-tt-reports.jsonl`. It listens on
   `127.0.0.1:9311` and keeps only the directive, the sink kind, the browser's 40-character sample and the page and
   script paths (no query strings, no policy text, no referrer).
3. Start the app with the trial on:
   `ZIGOALS_TRUSTED_TYPES_TRIAL=http://127.0.0.1:9311/ NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`.
4. Run the full browser suite against it:
   `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test --workers=2`.
5. Stop the collector (Ctrl-C) and summarise: `node scripts/trusted-types-trial.mjs summary /tmp/zigoals-tt-reports.jsonl`.

The reports stay on this machine. Never commit them.

## Trial results (local, 2026-10-05)

Production build (`PUBLIC_ALPHA_UNDEPLOYED`) under `next start`, local Chromium (the Playwright build standing in for
Chrome; CLAUDE.md), the full browser suite, 2 workers.

1. **First run (policy as first committed): the trial itself broke the app.** Every soft navigation stalled without an
   error and without a single report: the default policy handed back the normalised absolute URL, Turbopack recognises a
   loaded chunk by its script's raw `src` attribute (`getAttribute("src")` in its chunk registration), so the chunk's
   promise never resolved. The same build without the header navigated normally, and production never consults the
   policy (no CSP asks for Trusted Types), so nothing shipped was affected. Fixed in `26dfc06`: an allowed value is
   returned unchanged, checked where the browser loads it from (the document's base URL). This is exactly what
   enforcement would have broken; `tests/trusted-types-trial.spec.ts` now guards it on every CI run.
2. **Second run (fixed policy, the build of `26dfc06`):** desktop project, 584 tests: 581 passed or skipped, 3 failed:
   `brand-nav-polish.spec.ts:101` (a test race from Part 3's full page load into Health, fixed in the spec: it now
   waits for the load) and the two intro-video specs of `logo-quickadd-goals-header.spec.ts` (this Chromium cannot play
   the film; CLAUDE.md). The local server stopped at its time limit during the phone project, so the phone project ran
   again on its own from a clean worktree of the same commit: 584 tests, 537 passed, 45 skipped, 2 failed (the same two
   intro-video specs). No failure came from the trial header.
3. **Reports: none from the suite.** The collector received exactly two reports, both from a deliberate self-check made
   just before the suite (two script URLs on `attacker.invalid`, which the policy refuses by design), which also proved
   that reports reach the collector. No HTML, script or script-URL sink was reported on any page, in either project
   (`node scripts/trusted-types-trial.mjs summary`: 2 reports, both `HTMLScriptElement src` from that check).

**What this means for enforcement:** on today's code, `require-trusted-types-for 'script'` with this default policy
reports nothing, so enforcing it would block nothing the suite exercises. Session T's new client code (ZIGi, voice input)
was not in this run, hence the follow-up below.

**Local note:** under `next start`, the request host the middleware sees is the address the server is bound to, not the
`Host` header, so the trial needs the server bound to a loopback address (`--hostname 127.0.0.1`, as in step 3). On a
deployed Worker the variable is never set, and the host would be the public one anyway.

## Before enforcing (the follow-up, not this PR)

1. Wait until Session T has merged, then run the trial again on `main`: the suite then includes T's specs (ZIGi and the
   voice input add new client code).
2. Enforce only when that full run reports **zero** violations. Each remaining report is fixed at its source first, or,
   if a library needs it, given its own narrowly named policy (added to `trusted-types` by name, never `*` and never
   `'allow-duplicates'`).
3. Then move `require-trusted-types-for 'script'; trusted-types default` from `TRUSTED_TYPES_TRIAL` into the enforced
   policy in `security-policy.ts`. That is a security-header change, so the post-upload smoke's exact directive set
   (`scripts/lib/alpha-smoke.mjs`, "CSP directive set changed") and `verify-hosted-alpha.mjs` change in the same commit,
   as `[TIER 3] (deploy workflow)`.
4. Keep the trial mechanism, so a later regression can be measured the same way.

## Session V (2026-10-05/06): the trial on every new path, then enforcement

**Trials** (production build `PUBLIC_ALPHA_UNDEPLOYED` under `next start`, local Chromium, 2 workers; the collector's self-check of two planted `attacker.invalid` script URLs ran before each run and its two reports arrived):

| When | Build | Specs | Result | Reports from the run |
|---|---|---|---|---|
| Gate B | Part 8 (`5fb09cb`) | every ZIGi spec, both projects | 79 passed | 0 |
| Gate C | Part 17 (`e390ae6`) | every `zigi-*` spec, `your-ai`, `your-ai-captures`, `help-page`, `trusted-types-trial`, both projects | 191 passed, 33 skipped, 0 failed | 0 |
| Part 19 | Part 18 (`d157fbc`) | **the full suite**, desktop then mobile | desktop 653 passed, 61 skipped, 2 failed; mobile 633 passed, 81 skipped, 2 failed (each pair is the two brand-film specs, which fail on this Chromium by design, CLAUDE.md) | **0** (`summary`: 2 reports, both the self-check) |

**What the runs covered.**
- Every Session V client path: ZIGi's renderer with tables and charts, local answers, tool chips, proposal cards, the context pack's download and copy, the mini window, the knock, browser agents, the on-device stand-in, the hosted flow (default build) and Settings' new groups.
- The push-only service worker registration (`navigator.serviceWorker.register('/push-sw.js')`, a script-URL sink the default policy allows).
- React and Next's own client code, including soft navigation and chunk loading.
- Not one HTML, script or script-URL sink was reported. React's `innerHTML` for client-created `<script>` elements (inventory above) never fired.

**Enforcement (`[TIER 3] (deploy workflow)`, one commit):**
- `securityPolicy()` adds the two directives whenever `development` is false (every production build, the Alpha and the acceptance app Workers included).
- The post-upload smoke's exact directive set (`scripts/lib/alpha-smoke.mjs`) adds them, with exact values `'script'` and `default`.
- `scripts/verify-hosted-alpha.mjs` requires them.
- `tests/public-alpha.spec.ts` asserts them on the Workers gate.
- `tests/trusted-types-trial.spec.ts` now checks enforcement itself: a string at `innerHTML` and a foreign script URL throw a `TypeError` and report `enforce`; a chunk URL passes unchanged; soft navigation works; no other violation occurs.
- `lib/trusted-types-trial.test.ts` pins the production and development policies.

**Hand review for the browsers the suite does not run** (Firefox 148 and Safari 26 enforce Trusted Types too; the suite is Chromium-only):
- A search of `apps/web/{app,components,lib,public}` and `instrumentation-client.ts` for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `createContextualFragment`, `srcdoc`, `eval`, `new Function`, string `setTimeout`/`setInterval`, `importScripts`, `dangerouslySetInnerHTML`, `.src =` and `serviceWorker.register` found two sites.
  - `components/logo-intro.tsx` sets `<source>.src`, which is not a Trusted Types sink.
  - `lib/push/device.ts` registers `/push-sw.js`, which the default policy allows.
- No Safari-only or Firefox-only code path uses a sink.
- **Residual risk:** a sink inside a dependency that only runs in Safari or Firefox would now throw there instead of running. None is known; the brand-film specs (video only) are the only ones that never run in this sandbox.
- The mini window (Document Picture-in-Picture) inherits the opener's policy container (an inference from the specs; YOUR_AI_V2 §2). It has no default policy of its own, so a string sink there would be refused. ZIGi's code there moves nodes and sets `<style>` text only, and the mini-window spec ran clean under the trial.

**Rollback:** revert the enforcement commit (the directives leave the CSP; the smoke, verifier and tests go back with it). Or, as a one-line hotfix, remove the `TRUSTED_TYPES` spread from `securityPolicy()` together with the smoke's two lines.

