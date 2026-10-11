# Milestone 1 design

The user-approved execution specification is the authority: one idle Goal Manager, deterministic goal planning, private local metadata, Keplr first, no mainnet, no live landing replacement, no inferred external integration.

The repository starts at e2c7ed1 with five tracked files and no app. Actual Worker configuration is landing/wrangler.jsonc, not repository root; its assets directory is ./landing. Preserve both landing files byte-for-byte and do not change Cloudflare settings or deploy. Use a fresh local clone and feat/m1-foundation.

Use a pnpm monorepo with a Next.js React strict-TypeScript app; independent decimal goal engine, configurable integer chain amounts, Zod metadata, and schema-generated contract types. One CosmWasm contract holds native idle funds and supports owner-only create/deposit/withdraw/close. An optional admin can pause deposits only; no migration entry point or arbitrary messages. Private planning data never enters contract messages/events.

Live read-only evidence on 2026-09-13: zig-test-2 reports v5.0.0-patch-1, staking azig and bank metadata exponent 18. A fresh official version.txt fetch agrees; a cached browser result still showed v4.1.0. Pin testnet config to live evidence, validate chain ID and denom before signing, and refuse mainnet outright in this build. Direct documented Keplr APIs and CosmJS 0.38.1 are selected; private official SDK versions remain unverified because access requires authenticated GitHub Packages.

Local demonstration uses a prominently labelled, isolated browser ledger; it is not an onchain contract or deployment. CosmWasm cw-multi-test independently validates real contract bank accounting. Real Keplr mode is read-only until an explicit verified testnet deployment manifest is configured. Every real action is user-signed, simulated, balance checked, and confirmed; uncertain broadcast results must never claim no movement.

Goals use end-of-period calendar-month contributions, clamped to original anchor day (Jan 31 → Feb end → Mar 31). Funding Health always assumes zero future return; illustrative scenarios are separate. Money/base units remain strings and Decimal/BigInt. Export/import validates version and wallet/network scope atomically, and missing metadata never controls withdrawals.

A responsive dark navy working surface prioritizes goal identity, progress, funding health and contribution plan. Persistent local/testnet labels prevent confusion. Templates affect planning defaults only. Valdora/WME adapters remain deferred until canonical executable interfaces are verified.
