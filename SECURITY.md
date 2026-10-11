# Security reporting

ZIGoals is an unaudited alpha. Mainnet is disabled and no Goal Manager contract is deployed. Only local simulation and guarded testnet development are in scope; do not use real funds. Current implementation checks are not an independent security audit or guarantee.

Report a suspected vulnerability privately to **hello@zigoals.app**. Include the affected version/commit, component, expected and observed behavior, impact, and a minimal reproduction using synthetic data. A public transaction hash may help when applicable; remove unrelated personal information. We have no published response-time guarantee or bounty program.

**Never send a seed phrase, private key, wallet password, session cookie, API token, private goal backup or personal financial details.** We will not need these to investigate. Do not open a public issue containing an exploit that could endanger users; use the security contact first. Coordinate any public disclosure after we have assessed the report.

Test only your own local environment or an expressly authorized testnet setup. Stop before accessing another person's data, moving real funds, disrupting public endpoints or exploiting a live service. A suspected compromise is a reason to stop using that build, not to retry transactions repeatedly.

See the [threat model](docs/security/THREAT_MODEL.md), [privacy notes](docs/PRIVACY.md), [current status](docs/STATUS.md) and [alpha testing guide](docs/testing/ALPHA_TESTER_GUIDE.md) for known boundaries and supported checks.
