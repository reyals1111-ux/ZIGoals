# Draft for owner — not sent

Hello ZIGChain team — I’m building ZIGoals, an independent goal-oriented application on ZIGChain. May I request CosmWasm code-upload permission for my dedicated development wallet on zig-test-2?

Public address: [owner supplies zig1 address]
Repository: https://github.com/reyals1111-ux/ZIGoals
Scope: one minimal native-asset idle Goal Manager; owner-only deposit/withdraw/close, no external strategy, no mainnet. Local tests and Wasm validation are documented in the repository.

The official faucet returned “failed to send 50000000uzig tokens” and my testnet balance remained zero. Current live testnet reports v5.0.0-patch-1 with azig/18 decimals. Please advise the correct testnet-funding route and current whitelist-verification query; both tested LCD wasm params endpoints returned HTTP501.

Thank you.

---
Session X note (2026-10-07), not part of the draft: before sending, replace "Current live testnet reports v5.0.0-patch-1" with the version the nodes report then (v5.1.0 and v5.1.2 on 2026-10-07), and drop "both tested LCD wasm params endpoints returned HTTP 501": that route answers 200 on v5.1 ([ZIGCHAIN_V5_1.md](../research/ZIGCHAIN_V5_1.md)).
