# Run #9 verification

Local branch `codex/run9-goal-intelligence-live-wealth`, based on `a6950f7f7cfeeef0c5be286179e5bc99235d9a66`. Pinned Node 24.19.0 / pnpm 11.19.0. Nothing was deployed, pushed or merged.

| Check | Result | Evidence |
|---|---|---|
| Baseline unit suite | 47 files / 810 tests passed | Recorded before implementation |
| Final unit suite | 55 files / 885 tests passed | [Output](unit-tests.txt) |
| Lint / typecheck | Passed | [Lint](lint.txt), [Typecheck](typecheck.txt) |
| Production Next build | Passed | [Output](production-build.txt) |
| Full production browser suite | 166/166 passed, desktop + mobile | [Output](production-browser.txt) |
| New Run #9 browser scenarios | 12/12 passed on production | Included in full browser output |
| Alpha OpenNext build | Passed; server key removed from generated env | [Output](alpha-build.txt) |
| Alpha Workers dry run | Passed; no upload | [Output](alpha-dry-run.txt) |
| Alpha Workers security + diagnostics | 12/12 passed | [Output](alpha-security.txt) |
| Run #9 on local Alpha Workers | 12/12 features and 1/1 capture passed | [Features](alpha-features.txt), [Capture](alpha-captures.txt) |
| Landing dry run | Passed; no upload | [Output](landing-dry-run.txt) |
| Deployment config isolation | Passed | `pnpm check:deploy-configs` |
| Production dependency audit | No known vulnerabilities | [Output](dependency-audit.txt) |
| Tracked-file credential patterns | Passed after staging all new files | [Output](credential-scan.txt) |
| Actual credential value scan | Zero matches; env file ignored/untracked | [Output](credential-scan.txt) |
| Independent review | Findings fixed; build fix reviewed | [Review](independent-review.txt) |
| Live CoinGecko | 22,152 catalog entries; 14 quote pairs | [Public evidence](live-market.json) |

Commands: `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run --maxWorkers=4`, `pnpm build`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3203 pnpm --filter @zigoals/web exec playwright test --workers=4`, `pnpm --filter @zigoals/web build:alpha`, `pnpm --filter @zigoals/web check:alpha`. Local Workers gate used `public-alpha.spec.ts diagnostics.spec.ts` at `http://127.0.0.1:8788`; no deployment command without `--dry-run` was run.

The generic production build/browser verification precedes only the final build-script credential fix; application source is identical. The Alpha build includes that fix and rebuilds Next. Initial highly concurrent unit execution timed out on a large-history fixture and observed an unsettled async provider assertion; limiting workers produced a clean complete run. New browser tests were corrected to await saved state and disambiguate Next's route announcer; no product assertions were removed. Earlier red runs are not reported as passing.

A broad scan found the local key in Next compilation caches and OpenNext's generated server environment module, never in client assets. The final build removes it from compiled modes, fails if it remains elsewhere in the deployable output and removes the production cache. The temporary development preview/cache was stopped/removed. `.env.local` remains unchanged, private, ignored and untracked. A sanitized Workers preview without a runtime key returns a clean unavailable response (catalog 503, native quote 502). This does not provision a live Alpha secret.

Screenshots use deterministic fictional fixture data, not owner assets: [Wealth desktop](wealth-1440.png), [Wealth mobile](wealth-390.png), [Goal desktop](82-1440.png), [Goal mobile](82-390.png), [Today desktop](app-1440.png), [Today mobile](app-390.png), [Activity desktop](activity-1440.png), [Activity mobile](activity-390.png). Overflow checks cover 1440, 390 and 320 CSS pixels. Charts deliberately show sparse observed evidence. Live provider evidence was tested separately and is stored in the public JSON above.

No new real-extension, mainnet, contract reproducibility or remote CI claim is made. Existing contract source is unchanged. See [remaining limits](../../RUN_9_BETA_BACKLOG.md).

Captured command logs have terminal colors and trailing whitespace removed for repository review; result text is retained.
