# Milestone 3 — real owner Keplr results

Recorded 2026-09-13 from the owner's Run 3 account of testing the actual Keplr extension at http://127.0.0.1:3100/app with a dedicated development wallet. The individual test timestamps and browser/extension versions were not supplied. No wallet address is published here.

| Check | Evidence class | Owner observation |
|---|---|---|
| A Detection / initial connection | REAL OWNER PASS | Connect Keplr opened the real request showing ZIGChain Testnet; approval entered testnet mode. |
| B Address | REAL OWNER PASS | App account matched the dedicated account displayed by Keplr. |
| C Balance separation | REAL OWNER PASS | Real account showed 0 ZIG and never inherited the simulated 1,000 ZIG. |
| D Connection rejection | REAL OWNER PASS | After permission revocation, rejection showed `KEPLR TESTNET · rejected` and `Request rejected`; app remained usable. No signing/broadcast occurred. |
| E Reconnect | REAL OWNER PASS | A later approved connection succeeded after rejection. |
| F Permission persistence | REAL OWNER PASS | Local demo → Connect Keplr reconnected automatically while permission was retained. |
| G Revocation | REAL OWNER PASS | Revoking the site in Keplr caused the next connection prompt to return. |
| H Stale connection race | REAL OWNER PASS | Revoke → pending connection → Local demo → approve old request: app remained in Local simulation. |
| Account-switch isolation | NOT RUN | No second disposable/empty account; creating another wallet solely for this check is not required. |
| Stale signer before real signing | NOT RUN / BLOCKED | Requires reviewed deployed contract and test funds. |
| Real signature rejection / broadcast / uncertain confirmation | NOT RUN / BLOCKED | Requires reviewed deployed contract and test funds. Connection rejection above is a different check. |
| Real browser restart + chain reconciliation | NOT RUN / BLOCKED | Requires an actual deployed-contract receipt. |
| Mocked wallet/network suites | AUTOMATED | Baseline: 18 production browser cases and full Chrome restart passed. These do not prove real signing or deployed execution. |

This is owner-reported manual evidence, distinct from tool-observed automated results. No transaction was sent during this engineering run. Test funds remain zero; Discord approval is pending and whitelist has not yet been requested. Valdora has not replied to the owner's existing inquiry.
