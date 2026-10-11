# ZIGChain EVM opportunity and architecture checkpoint

**Date:** 2026-09-17
**Status:** `RESEARCH_ONLY / FUTURE_GATED / NOT_EXECUTION_READY`

## Evidence

Official v5 documentation moves native ZIG to 18-decimal `azig` and explicitly cites Cosmos/EVM/IBC alignment:
https://docs.zigchain.com/about-zigchain/redenomination

Token Wrapper documentation describes ERC-20 ZIG moving from Ethereum via Axelar/IBC to native ZIG and EVM-origin recovery:
https://docs.zigchain.com/builders/token-wrapper-module

Current official Chain Information exposes Cosmos-style RPC/REST/gRPC resources:
https://docs.zigchain.com/integration-guides/chain-information

No canonical ZIGChain EVM JSON-RPC, EVM chain ID, MetaMask configuration, Solidity deployment guide, account/address mapping, EVM gas model or public EVM testnet deployment workflow was established in the reviewed sources.

## Architecture

Keep the deterministic Goal Engine VM-independent.

- `CosmosExecutionAdapter` → CosmWasm Goal Manager + later verified Cosmos strategies
- `EvmExecutionAdapter` → future verified EVM contracts
- `FundingRoute` → native ZIG / IBC-Axelar / future verified EVM funding routes

Wallet authority must never silently cross between Cosmos and EVM.

## Opportunity research

Future possibilities include ERC-20 goal funding, EVM-native vault/DeFi strategies and cross-chain goal contributions. These are product research directions, not current integrations.

## Hard gates

Require official network/RPC/wallet specs, account mapping, decimal/gas rules, finality/receipt/error semantics, allowance/revocation rules, bridge recovery, exact contract provenance, security review, funded testnet availability and end-to-end receipts before any execution.

No execution authority is granted by this document.
