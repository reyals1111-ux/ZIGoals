# ADR-003 — Idle first, verified adapters later

Accepted. Only idle executes in this milestone. The strategy descriptor includes assets, liquidity, exit delay, minimum, risk flags, audit and verification status. Idle is EXPERIMENTAL/NOT_AUDITED; local testing is not an audit.

Goal → policy → approved adapter → protocol remains the future boundary. External protocol addresses must be approved deployment configuration, never a user-provided execute target. Valdora/WME descriptor IDs are not executable integrations.

Future adapters must define valued position units, rounding, accrued fees, delayed redemption and claims. LIQUID, REDEMPTION_PENDING and CLAIMABLE are distinct. A stZIG share never assumes one ZIG. Compare a common asset unit only through a verified value query. Document adapter compromise, insolvency, pauses and exit behavior before allowing deposits.
