# Run #9 Beta follow-up

- RWA quotes are USD-only; EUR remains manual until supported evidence exists. No second provider added.
- CoinGecko caches/admission are process-local. Before wider deployment, design shared cache/quota controls appropriate to hosting and provider quota.
- Current plan comparison is deterministic, but immutable versioned historical schedule obligations and exact instalment matching are future work.
- Income has explicit dated records and reversals; annualized run-rate is intentionally omitted until a documented sufficient-history policy is added.
- History begins with locally recorded facts. No historical provider backfill or inferred causal market-return attribution is offered.
- Global bounded snapshot retention can shorten history for large portfolios. Financial events remain intact; storage-ceiling writes fail safely. A later archival/export workflow can extend history.
- Physical metals use manual weight valuation; tokenized RWA reference units must be explicitly selected. No physical-weight conversion is inferred.
- Optional automatic provider access is server-side only. Alpha credential provisioning and rollout require separate owner review; no Run #9 deployment performed.
- Existing Next middleware deprecation remains because the Workers adapter uses it; no framework/adapter upgrade in this run.
- Existing Habit/Health features and real Keplr behavior are preserved; mocked browser tests are not a new real-extension or mainnet execution claim.
