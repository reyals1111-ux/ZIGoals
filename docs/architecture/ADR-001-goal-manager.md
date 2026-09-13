# ADR-001 — One Goal Manager

Accepted for local/testnet alpha. One CosmWasm contract stores many owner-indexed goals. This minimizes code-upload/whitelist overhead and keeps accounting in a single small contract. Contract-per-goal would add deployment costs and repeated trust configuration without a Phase-1 benefit.

Owner-only creation/deposit/withdraw/close; native asset configured at instantiate. Idle holds the native coins directly. No arbitrary strategy address, arbitrary execution, admin sweep, ownership transfer or contract migration entry point. Instantiate with no chain-level migration admin. Optional application admin only pauses/resumes deposits. Pause does not disable withdrawals.

Native bank balance can exceed accounted liabilities due to direct sends. Surplus never credits an arbitrary goal and cannot be swept in this version. Withdrawals follow recorded owner positions. Closed goals preserve history; they cannot be reopened or funded.
