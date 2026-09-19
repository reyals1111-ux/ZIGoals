# Run #8 verification index

**Review branch; no deployment or merge.** See [Run report](../../RUN_8_REPORT.md) and [scope status](../../RUN_8_BETA_BACKLOG.md).

- [Machine-readable validation](validation.json): exact tested source, commands, outcomes, log locations and limits.
- [Hosted CI](ci.json): exact head/run/check identities; no inference from a queued job.
- [Resume state](RESUME_STATE.md): commits, changed files, remaining gates and owner actions.
- [Chain and fee findings](CHAIN_FEE_FINDINGS.md), [bounded public evidence](chain-evidence.json), [unchanged public Alpha](unchanged-live-alpha.json).
- [Mainnet synthetic account](mainnet-synthetic-read.json) and [testnet synthetic account](testnet-synthetic-read.json): pinned read-only observations, zero balance and NONE authority. These are not owner accounts.
- [Initial finance review](finance-review-initial.md), [finance fixes](finance-fixes.md), [initial Habits review](habits-review-initial.md); subsequent integration/Habit fixes and re-review are added as completed.
- Production screenshots use fictional fixtures only. Widths 1440, 768, 390 and 320, with reduced motion. Existing V2.1 fixture checks cover Today, Habits and Health; the new suite adds tracked Goals/detail/Positions.
- Bundle figures sum emitted JS/CSS across routes, independently gzipped. They are not initial page transfer, real-user performance or Cloudflare CPU. The base archive uses the identical dependency lockfile and Node/Next versions; its public build-identity fallback is Unknown/dirty because the archive has no Git metadata.

Public reads require explicit action and send only a network selector plus public address to a fixed-endpoint relay. Private financial intentions, Habit/Health content, notes and backups stay browser-local. Contract, wallet authorization, financial execution, network routing and production boundaries remain guarded.

Local result: **751 JS tests, 25 Rust tests, 104 production browser checks and 28 Workers checks passed**. Alpha build `dirty:false`; real synthetic-account mainnet/testnet relays pass. See [final independent review](final-review.md), [Workers runtime correction](WORKERS_RUNTIME_FIX.md), [source manifest](source-manifest.json), [bundle comparison](bundle-comparison.json) and [screenshots](screenshots/). All five hosted checks pass at the exact recorded source in [CI evidence](ci.json).
