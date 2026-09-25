> Current Run10 reconciliation: the expanded authoritative scope supersedes former scheduling exclusions. See [the full requirements ledger](run10/REQUIREMENTS.json) and current evidence. The dated list below is preserved as historical scope, not a claim that newly implemented or remaining items are unchanged.

# Beta backlog after Run #9.2

Delivered behavior and verification are in [Run #9.2 report](RUN_9_2_REPORT.md), building on [Run #9.1](RUN_9_1_REPORT.md). These items are deliberately distinct from working features.

| Priority | Remaining work | Evidence/acceptance boundary |
|---|---|---|
| Next | True investment performance and cash-flow attribution | Recorded wealth changes include balance edits, allocations and market movement. They are not time-weighted or money-weighted investment returns. |
| Next | Longer history and lifecycle retention | Current global bounds remain 240 valuation snapshots, 240 Goal history entries and 240 presentation asset events, plus up to 240 durable archive intervals per asset; 600 KB combined financial history, 2 MB private store. Warn before approaching limits and design aggregation without altering immutable facts. |
| Next | Full plan revision ledger | Current-plan pacing and explicit scheduled-date credits work. Historical contractual plan obligations are not reconstructed after edits. Reversal of a funding record is history-only and leaves balances for explicit editing. |
| Next | Distributed CoinGecko quota admission | Existing process-local 12/minute and 2 concurrent limits are shared by catalog, quotes, insights and history; multiple instances still multiply provider usage. |
| Next | RWA/physical-metal/FX coverage | RWA quotes are USD tokenized references. Physical grams/troy ounces, exchange executions and unsupported currency conversion remain manual; no proxy coin is presented as spot. |
| Next | Portfolio capacity and richer asset navigation | Markets now has bounded pages and local search, alongside portfolio composition and eight favourites. Future work can add portfolio-wide sorting, grouping and capacity controls for substantially larger collections. |
| Later | Barcode and food-photo capture | Current cards are clearly unavailable; build permission, food-source provenance, correction and local-data handling before enabling capture. |
| Later | Wearables | Apple Health, Health Connect, Fitbit and Garmin are planned, not connected. No sensor data or health advice is inferred. |
| Later | Explicit multi-device synchronization | Private stores currently stay in the browser with locks, import/export and recovery. No silent cloud copy or remote identity linking. |
| Before hosted rollout | Attribute response-stream cancellation diagnostics | Rapid local Alpha navigation emits intermittent OpenNext stream-write cancellation messages. All final flows and seven quiet full-body response checks pass; no market 5xx or cross-request promise warning remains. Add request-level attribution before deciding whether the framework adapter needs a change. |
| Separate approval | Hosted rollout | Requires an explicit release task, clean reviewed commit and environment-bound smoke checks. No deployment, merge or push is part of Run #9.2. |
