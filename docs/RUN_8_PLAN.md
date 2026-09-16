# Astra Run #8 — working plan

**Prepared:** 2026-09-17
**Baseline:** owner-verified live Alpha source `69aa0260eaa6bde3294ba7a778086839246c030a`.

## Product thesis

**ZIGoals — Goals, Habits & Health = Wealth.**

Goals remain the organizing layer; Habits and Health support real-world progress without turning ZIGoals into a generic tracker or medical app.

## Work packages

1. **Fresh truth snapshot** — exact main/live Alpha/CI/testnet wallet/whitelist/support/EVM docs.
2. **Habits Beta** — stronger creation, recurrence, history, consistency and Goal linkage while preserving private local data.
3. **Health Beta** — refine diary, foods/recipes, targets, trends, weight/activity and privacy boundaries.
4. **UI V3** — evolve the product coherently from the frozen V2.1 baseline and strengthen the Goals/Habits/Health relationship.
5. **EVM-aware architecture** — refresh official EVM evidence; keep Goal Engine VM-agnostic; define separate Cosmos and EVM adapter boundaries without speculative execution.
6. **Ecosystem readiness refresh** — only evidence-backed changes; Idle remains the only executable strategy unless a separate integration passes every provenance/schema/security/testnet gate.
7. **Validation/review package** — lint, typecheck, unit/browser suites, production/Alpha builds, privacy/egress, mobile/visual review and hosted CI.

## Conditional Goal Manager tail

Only consider testnet upload/instantiate if all are true:

- CosmWasm whitelist reopened and wallet independently verified;
- sufficient testnet ZIG exists;
- a fresh exact-current-main canonical Wasm candidate is reproduced and attested;
- exact checksum/config is presented;
- owner explicitly approves that exact action.

If authorized, first proof remains minimal Idle-only create/deposit/withdraw/close on testnet with verified receipts.

## Current blockers

- CosmWasm whitelist: paused during ZIGChain EVM integration; no ETA.
- Testnet funding: requested again; reply pending.
- Goal Manager: NOT DEPLOYED.
- No mainnet or external-strategy execution authorized.
