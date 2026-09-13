# Final warning-regression test evidence

Captured during fix `78331c1`. Runner timestamps in this output use local Europe/Brussels time (UTC+02:00). Final integrated and production-browser results are in [M2_RESULTS.json](M2_RESULTS.json); this file preserves the focused red/green evidence.

## Exact red command/output
```text
node node_modules/vitest/vitest.mjs run apps/web/lib/goal-provider.test.ts

 RUN  v5.0.0 /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals

 ❯ apps/web/lib/goal-provider.test.ts (8 tests | 2 failed) 368ms
   × damaged history survives receipt lookup failure and resets warnings for a new available scope 58ms
   × damaged history survives receipt lookup failure and resets warnings for a new unavailable scope 50ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  apps/web/lib/goal-provider.test.ts > damaged history survives receipt lookup failure and resets warnings for a new available scope
 FAIL  apps/web/lib/goal-provider.test.ts > damaged history survives receipt lookup failure and resets warnings for a new unavailable scope
AssertionError: expected 'Skip to contentZIGCHAIN TESTNETDemo a…' to contain 'Unreadable or unsupported'

Expected: "Unreadable or unsupported"
Received: "Skip to contentZIGCHAIN TESTNETDemo assets have no monetary value.ZIGoalsALPHAGoalsActivitySettingsLocal demozig1orig…lletKEPLR TESTNET · connected2 ZIG wallet balanceTestnet connected.Alice receipt lookup failedCreate transaction · zig-test-2Submitting wallet: zig1originalwalletConfirmation is uncertain. Funds may have moved. Check this transaction before trying again. Confirmation is uncertain. Funds may have moved. Check the known transaction before trying again; this browser never replays it.Transaction AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVerify with ZIGScan ↗{"mode":"testnet","owner":"zig1originalwallet","balance":"2000000000000000000","goals":["7"],"activity":[],"status":"IDLE"}Refresh journalPrepare transactionYour goals. Onchain.Independent project · Unaudited alpha · Idle strategy only"

 ❯ apps/web/lib/goal-provider.test.ts:371:35
    369|     await click("Connect Keplr");
    370|     await act(async () => {await new Promise(resolve => setTimeout(res…
    371|     expect(container.textContent).toContain("Unreadable or unsupported…
       |                                   ^
    372|     expect(container.textContent).toContain("Alice receipt lookup fail…
    373|     expect(container.textContent).toContain("Confirmation is uncertain…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
   Start at  05:42:55
   Duration  926ms (tests 43%, environment 38%, import 9%, transform 9%)

```
## Exact green command/output
```text
node node_modules/vitest/vitest.mjs run apps/web/lib/goal-provider.test.ts apps/web/lib/transaction-journal.test.ts apps/web/lib/wallet.test.ts

 RUN  v5.0.0 /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals


 Test Files  3 passed (3)
      Tests  35 passed (35)
   Start at  05:45:17
   Duration  1.02s (tests 48%, environment 27%, import 14%, transform 10%, worker 1%)

```
All commands use the supplied Node24 runtime. Prettier3.6.2 formatted only the three owned files. Additional exact verification commands/results:

```text
node --check scripts/verify-browser-restart.mjs
```
Exit status: 0. No output.

```text
node node_modules/typescript/bin/tsc --noEmit
```
Exit status: 0. No output.

```text
node node_modules/eslint/bin/eslint.js apps/web/components/goal-provider.tsx apps/web/lib/goal-provider.test.ts scripts/verify-browser-restart.mjs
```
Exit status: 0. No output.

```text
git diff --check
```
Exit status: 0. No output.
Remote-origin guard also exercised with PLAYWRIGHT_BASE_URL=https://example.invalid: expected exit1 and local-only-origin error before dependencies/browser startup. No network access occurred.
