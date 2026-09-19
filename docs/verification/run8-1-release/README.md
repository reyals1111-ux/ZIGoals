# Run #8 / #8.1 — merged Alpha release closure

**Status: MERGED + DEPLOYED + OWNER-VERIFIED LIVE — 2026-09-19**

Run #8 / #8.1 merged through PR #15. Exact merged `main` source:

`c3997841c7b07b6adcc430616c86e4e4728d3222`

The normal post-merge `Milestone quality` workflow passed on that exact SHA, including the web and contract jobs.

## Public Alpha

- Official Alpha: https://alpha.zigoals.app/app
- Workers fallback: https://zigoals-alpha.reyals1111.workers.dev/app
- Worker: `zigoals-alpha`
- Live Worker version: `30468b51-fb8d-4f9e-bd6c-b36d4a9f89e5`
- Preserved rollback version: `836e3ad7-af0a-46cd-8e32-e050d747e6f2`
- Build mode: `PUBLIC_ALPHA_UNDEPLOYED`
- Goal Manager / Code ID: **NOT DEPLOYED**
- No financial signing, broadcast, contract upload or instantiation occurred.

Both Alpha origins were subsequently verified to serve the exact merged SHA `c3997841c7b07b6adcc430616c86e4e4728d3222`, with the prior source absent and `PUBLIC_ALPHA_UNDEPLOYED` present.

The repository production smoke subsequently passed all nine checks: `/app`, `/app/habits`, `/app/health`, `/app/goals`, `/app/goals/new`, `/app/activity`, `/app/ecosystem`, `/app/settings`, plus the repeated `/app` nonce-freshness request. HTTP/security/CSP/source checks passed.

The owner then completed the browser acceptance review and confirmed the new Wealth experience, Value Goal multi-asset progress, Today, Goals, Habits, Health, reload/Local Demo behavior, Keplr reconnect behavior and mobile layout.

## Manual deployment incident and disposition

Manual Alpha workflow run `35444908631`:

1. authorized the exact merged source;
2. passed config, lint, typecheck, JS tests, Alpha build and Wrangler dry-run;
3. captured rollback `836e3ad7-af0a-46cd-8e32-e050d747e6f2` before publication;
4. successfully published new version `30468b51-fb8d-4f9e-bd6c-b36d4a9f89e5`;
5. observed that same new version live at 100%;
6. then failed its immediate hostname smoke with `Hosted build commit differs from reviewed source`.

The later exact-source checks showed both public origins serving the intended merged SHA, and the full production smoke passed. This established that publication succeeded and the workflow hit a short post-publication hostname propagation race.

No rerun or rollback was performed.

GitHub deployment `6541222439` for environment `alpha` and exact SHA `c3997841c7b07b6adcc430616c86e4e4728d3222` was subsequently given a `success` deployment status with the description:

> Verified live after propagation; exact SHA and production smoke passed.

The original workflow attempt remains red as historical evidence of the transient verification race.

## Follow-up hardening

The maintenance branch following this release adds a bounded post-upload verification retry:

- publication itself still occurs exactly once;
- only the exact error `Hosted build commit differs from reviewed source` is retryable;
- maximum default window is 12 attempts with 5-second intervals;
- every retry rechecks that Cloudflare still reports the same newly deployed Worker version;
- CSP, HTTP, nonce, security-header and other smoke failures still fail immediately;
- no automatic redeploy or rollback was added.

Regression coverage verifies successful propagation recovery, bounded failure, and immediate failure for genuine smoke/security errors.
