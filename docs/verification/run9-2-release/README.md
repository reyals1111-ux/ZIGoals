# Run #9.2 release closure evidence

## Published baseline and historical deployment outcome

- Implementation: [PR #17](https://github.com/reyals1111-ux/ZIGoals/pull/17), delivering Run #9 → #9.1 → #9.2.
- Runtime-secret/deployment hardening: [PR #18](https://github.com/reyals1111-ux/ZIGoals/pull/18).
- Published source before this closure: `702762d079be1f74536219c027c4d267bfd33fc0`.
- Live Worker before this closure: `cca2b972-3b40-47a6-affe-1249fe260465`.
- Preserved rollback: `30468b51-fb8d-4f9e-bd6c-b36d4a9f89e5`.
- [Manual deployment run 35655131172](https://github.com/reyals1111-ux/ZIGoals/actions/runs/35655131172).

The owner-provided handover records successful exact-source build, rollback capture before upload, asset and Worker upload, hidden CoinGecko runtime binding, and the new version becoming live. The workflow ended `NEEDS_OWNER_REVIEW` solely because post-deploy smoke still expected the V2.1 hero “Turn today”. Public Alpha served “YOUR FINANCIAL ORBIT”, “Today's Goals, Habits & Health = Tomorrow's Wealth”, and Settings exposed the exact source SHA above. Preserve the historical failed run; do not infer upload failure or roll back from that obsolete assertion.

## CoinGecko evidence and narrow correction

The protected GitHub `alpha` environment supplies the server-only CoinGecko credential during publication as a hidden Worker runtime binding. No credential value belongs in source, build assets, browser responses, logs or this evidence. Public market requests contain asset identity and quote currency only; no wallet address, goal name, quantity, allocation, private note, Health or Habit data is sent upstream. CoinGecko remains the sole Beta automatic market provider.

The handover records Alpha Bitcoin HTTP 200 and market catalog HTTP 200 (approximately 4.8 MB), proving the runtime binding served authenticated market data. Direct native ZIG provider-ID (`zignaly`) requests worked, while deployed Cloudflare-edge native ZIG quotes, insights and history returned HTTP 503. This was not evidence of missing credentials. Direct CoinGecko Ethereum token-address pricing for `0xb2617246d0c6c0087f18703d576831899ca94f01` returned a valid price and provider observation timestamp. These are preserved prior observations, not fresh closure-deployment results.

The closure tries normal ID-based quotes first. Only failed native ZIG quotes use that fixed Ethereum token address; other assets retain normal provider-ID pricing, including mixed batches. The parser validates returned contract identity, decimal precision and provider timestamp while retaining canonical `zignaly`/CoinGecko provenance and VERIFIED quote evidence. No ticker guessing, provider #2, private portfolio transport or history/insights fallback is introduced.

Regression coverage includes failed ID-based native ZIG → token-address quote with exact price/provenance; existing market tests cover request boundaries, credentials, quote validation, admission and caching. Alpha deployment tests now expect “YOUR FINANCIAL ORBIT” and cover `/app/wealth` and `/app/markets` alongside the previous routes. Redirect, safety-mode, exact SHA, security-header and per-response nonce assertions remain enforced.

## Verification and final rollout recording

The unchanged six-file patch arrived with owner-preserved passing evidence under Node `24.19.0` / pnpm `11.19.0`: targeted 111/111, full unit 76/76 files and 1009/1009 tests, lint, typecheck, OpenNext Alpha build, Wrangler Alpha dry-run, and direct native-ZIG token-address verification. Documentation-only closure work does not invalidate that matrix. Fresh closure verification passed 129/129 tests across `market-multi.test.ts`, `alpha-deployment.test.mjs` and `check-deployment-configs.test.ts` with the pinned toolchain; `git diff --check` passed. The tracked-file credential scan is required before commit; CI independently gates the reviewed PR and exact merged main.

At this document's preparation, the closure PR, merge SHA, final deployment run and final Worker do not yet exist. The final owner report must record those exact values, the newly captured rollback, hosted SHA, native ZIG/BTC/catalog/history HTTP outcomes and smoke/security result after protected approval. Do not substitute the baseline values above or claim final rollout success early. Preserve final Actions artifacts and the NovaVault project checkpoint; a documentation-only change need not trigger another Alpha deployment.

## Product and chain boundary

No product redesign is included. Run #9.2 Showcase, Wealth, Markets, funding/contributions, Today, Activity, Goals, Habits, Health, responsive design and local-data boundaries are preserved.

Goal Manager / Code ID remain **NOT DEPLOYED**. Public Alpha remains `PUBLIC_ALPHA_UNDEPLOYED`: hosted UI, simulation, private local data, public/read-only market data and explicit wallet connection only. No contract upload/instantiation, staking transaction, financial signing/broadcast or mainnet operation is authorized or performed. Remaining Beta work stays in [the existing backlog](../../RUN_9_1_BETA_BACKLOG.md).
