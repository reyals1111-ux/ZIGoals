# Skipped tests: inventory

Supersedes [../verification/SKIPPED_PLAYWRIGHT_TESTS.md](../verification/SKIPPED_PLAYWRIGHT_TESTS.md) (17 Playwright skips at `7fdea68`; the CI #119 baseline at `a59bf03` recorded 17 Playwright and 6 unit skips).

**Source:** every skip call in the source on branch `chore/reliability-readiness-2026-09-29` (`main` at `5dd2ee7` plus Session B's changes, none of which adds or removes a skip call). The totals below come from the source; "Counts" records the measured runs.

Categories: **platform** (the behaviour does not exist on that project/viewport), **opt-in evidence** (a capture tool, not a gate), **env-gated** (skipped in `pnpm test`, run by a dedicated CI step), **real provider** (needs live third-party responses). No skip is a known bug, obsolete or unknown, and there is no `test.fixme`, `test.todo` or `.only`.

## Playwright (`apps/web/tests`, projects `desktop` and `mobile`)
| # | Test (file:line) | Condition | Reason | Category | Action |
|---|---|---|---|---|---|
| 1 | `primary actions catch one sweep of light on hover, give on press and keep their focus ring` (motion-polish.spec.ts:91) | project `mobile` | The hover sweep exists only for hover-capable pointers | platform | Keep. Desktop runs it. |
| 2–3 | `the static logo stays when the intro clip fails` / `… is not ready in time` (motion-arrival.spec.ts:89) | `isMobile` | The logo intro is desktop only | platform | Keep. Desktop runs both. |
| 4 | `forced colors: the navigation arrival sweep and pop are off` (a11y-motion-dialogs.spec.ts:40) | `isMobile` | The sidebar navigation is the desktop layout | platform | Keep. Desktop runs it. |
| 5 | `keyboard focus on the logo link is never covered by the intro clip` (a11y-motion-dialogs.spec.ts:57) | `isMobile` | The logo intro is desktop only | platform | Keep. Desktop runs it. |
| 6–13 | `visual product audit 1440 / 1024 / 390 / 320` (run9-1-visual.spec.ts:12), both projects | file-level, `RUN91_CAPTURE!=='1'` | Opt-in evidence capture with isolated fixtures; writes screenshots | opt-in evidence | Keep. It is a manual evidence tool, not a gate. |
| 14–21 | `final Showcase visuals 1440 / 1024 / 390 / 320` (run9-2-visual.spec.ts:5, plus a `project!=='desktop'` skip at :10), both projects | file-level, `RUN92_CAPTURE!=='1'` | Uses real public provider responses and writes into `docs/verification/run9-2` | opt-in evidence, real provider | **Never un-skip in CI.** |

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
