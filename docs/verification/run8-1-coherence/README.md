# Run #8.1 final coherence

Starting head: `f7b705528b2678335859b6c65687967a20b48d38`. Functional checkpoint precedes visual polish.

Functional scope: explicit allocation edit/release and confirmation using existing exact allocation arithmetic; private pin/lock/close/delete; locked mutations rechecked at the private storage update boundary; deletion unlinks Habits without deleting their rules or entries and preserves Positions. Legacy Goals reuse the management overview/modules, with optional collapsed simulation. Legacy removal archives only the scoped card, preserving ledger and plan; the original Goal URL provides Restore. No storage migration.

Cash, crypto, stablecoins, stocks, precious metals and custom sources create ordinary MANUAL Positions. Explicit total value takes precedence over entered-unit price; stablecoins have no inferred peg, and currencies have no inferred conversion. Manual sources save explicitly to Positions before final Goal creation and therefore remain available if the wizard is abandoned. Automatic precious-metal market pricing deferred to Run #9.

Functional validation: 38 targeted unit tests, typecheck, three browser flows. Browser evidence uses fictional fixtures only. No Health changes, Habit schema/history changes, deployment, merge, financial signing or blockchain action.

Functional checkpoint: `d2f0040`, pushed before visual refinement. Owner screenshots 1–9 directly informed the retained card family, unified legacy overview, release controls, top-right utilities, source selector and restrained gradients. Final visual pass adds full-identity deterministic ring palettes, white-to-nebula key values/headings, a two-column metric grid and clearer ownership/provenance sections. Wallet totals reuse the existing metric calculation; APR and ZIG/USD quote architecture are unchanged.

Validation: 181 unit tests; production browser matrix 70 cases (66 passed initially, four test-fixture/closed-module assumptions corrected and all four passed on focused rerun); four screenshot executions. Widths 1440/1024/768/390/320 have no document overflow. Lint, typecheck, production build and diff checks pass. Existing Next middleware deprecation warning remains. Health, Habits implementation/history, market quotes/cache and chain-reader files have no source diff. Screenshots 01–13 in `screenshots/` use fictional data; no owner data was captured.

Owner preview restart (same port preserves browser-origin data; build before stopping the old preview):

```sh
cd /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals/.superpowers/run8 &&
export PATH=/Users/AIUSER/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH &&
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build &&
{ preview_pid="$(lsof -tiTCP:3100 -sTCP:LISTEN)"; if [ -n "$preview_pid" ]; then kill "$preview_pid"; fi; } &&
sleep 1 &&
pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3100
```
