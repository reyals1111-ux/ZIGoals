# Current-main Alpha rollout — 2026-09-17

**Final state: OWNER-VERIFIED LIVE**

- source: `69aa0260eaa6bde3294ba7a778086839246c030a`
- successful run: `35153444566`
- live Worker version: `836e3ad7-af0a-46cd-8e32-e050d747e6f2`
- rollback version: `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80`
- Goal Manager: `NOT DEPLOYED`
- Code ID: `NOT DEPLOYED`
- financial signing/broadcast: disabled

Owner confirmed on `https://alpha.zigoals.app/app`:

1. exact build identity;
2. real Keplr connection to `zig-test-2`;
3. 0 ZIG test wallet state;
4. reload returns to Local Demo;
5. explicit Reconnect Keplr works;
6. no fee/transaction/arbitrary-message signing occurred;
7. Habits persistence across reload;
8. Health persistence across reload;
9. mobile sanity check passed.

Local copies of all three deployment-run evidence sets were also preserved under `~/ZIGoals-backups/alpha-rollout-2026-09-17/`.

This rollout changed only the existing simulation/connection-only web Alpha. It did not upload or instantiate CosmWasm.
