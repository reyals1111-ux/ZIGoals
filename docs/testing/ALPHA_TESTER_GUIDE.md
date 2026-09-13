# Alpha tester guide

Start with **Local demo**. It requires no wallet, account, funds, Docker or deployment. This unaudited alpha is not a savings account, investment service or recommendation. Simulated and testnet ZIG have no monetary value; mainnet and external strategies are disabled.

1. Follow [README setup](../../README.md#run-locally). Open `/app` and confirm `LOCAL SIMULATION`. Settings → Connection diagnostics shows the build version and selected environment.
2. Create a small fictional goal. Review its name, target, date and contribution. Starting amount is a planning input, not a deposit. Funding Health assumes zero investment return; projections and the demo's display conversion are illustrative.
3. Add simulated funds, withdraw part, withdraw the remainder, then close the empty goal. Compare the goal balance and simulated wallet balance after each action. No signature should be requested.
4. Export a backup from Settings, change a fictional plan, then import the backup. It contains private plans only. Keep the file private. Try a backup from another scope and confirm refusal.
5. Open a second tab on the same origin. Changes should refresh there; a stale action review should require review again. Modes are selected per tab. Lock protection applies to participating tabs in this browser profile, not other devices.
6. Reload the app. Clearing site data is destructive to local plans, the simulated ledger and recorded transaction history; test removal only with disposable fictional data. Do not clear data to resolve an uncertain testnet transaction.

**Optional connection-only Keplr check:** use the official extension and an existing dedicated development account. Verify the trusted local origin and `zig-test-2`. Approve or reject connection and check the account and actual testnet balance. Zero real testnet ZIG must not become the simulated 1,000 ZIG. The owner's A–H real results are [recorded separately](../verification/M3_KEPLR_OWNER_RESULTS.md). Creating another wallet solely for account-switch testing is not required.

**Stop at NOT DEPLOYED.** Funds and upload eligibility are still blocked. No tester should upload, instantiate, sign a Goal Manager action or retry the faucet for this run. A future separately reviewed deployment and explicit owner action are required. External provider/Hub/explorer links are informational and lead to separate services; they do not verify a transaction or enable a strategy here.

For bugs, record expected/actual behavior, minimal steps, build commit, OS/browser, mode, whether one or two tabs were used, and the public diagnostics timestamp. Use synthetic plan data and crop/redact screenshots. Never share a mnemonic, private key, wallet password, token, full private backup or personal financial data. Use the [public bug form](../../.github/ISSUE_TEMPLATE/bug_report.yml) for ordinary defects and **hello@zigoals.app** for suspected security/privacy issues.
