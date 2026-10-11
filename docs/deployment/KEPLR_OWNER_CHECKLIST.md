# Real Keplr owner checks

For a fresh check, use the intended trusted ZIGoals origin with the owner's existing Keplr installation and a dedicated testnet account. Do not enter a seed/key in the app, terminal or chat. Automated wallet-boundary tests are separate evidence.

Current owner-hosted evidence is recorded in [`docs/verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json`](../verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json). It covers the real extension at `https://alpha.zigoals.app` and `https://zigoals-alpha.reyals1111.workers.dev`, including rejected and approved connection attempts and reload behavior. It records no financial signing or broadcast. This owner observation does not relabel or replace the historical Run 2 rows below, which remain **NOT RUN with a real extension**.

## Reload and reconnect expectation

Reload intentionally returns the app to Local demo without restoring a wallet, address, balance, goals or financial capability. After a successful explicit connection in the same tab, the app may show **Reconnect Keplr** after reload using only a versioned boolean in tab-scoped session storage. That hint is presentation only and must never be treated as wallet permission or authorization.

Only the reconnect button may start the existing connection flow. Keplr may remember browser permission and reconnect without another prompt, or it may still ask the owner to unlock or approve access. Choosing **Local demo** clears the tab hint. A fresh independent tab starts with **Connect Keplr**; a tab opened or duplicated from the current tab may initially copy its presentation-only session storage marker. Missing, invalid or unavailable tab storage must leave Local demo usable and must not call Keplr automatically.

Record browser/Keplr versions, app commit, date, public test account, and PASS/FAIL/NOT RUN for each row. Keep wallet screenshots private if they expose unrelated accounts. No funds are needed through row8. Rows9–12 require the verified testnet deployment and test funds.

| Check | Owner action and expected result |
|---|---|
| 1 Detection | Open `/app`, choose Connect Keplr. An absent extension produces an actionable install/open message; an installed extension proceeds to its own prompt. |
| 2 Suggest/enable | Review ZIGChain Testnet suggestion: chain `zig-test-2`, official testnet RPC/REST, base `azig`, 18 decimals, symbol ZIG, coin type118. Old uzig/6-decimal entries must be corrected in Keplr before any signature. Approve only if these match. |
| 3 Identity/address | Confirm displayed public address equals the selected Keplr account. App banner remains testnet. No mainnet transaction should appear. |
| 4 Rejection | Reject a connection/suggestion prompt. App returns to a recoverable error/disconnected state; no signing or broadcast occurs. Connect again successfully. |
| 5 Balance | Compare displayed test ZIG with a read-only official REST bank query for the same public address, using 18 decimals. Zero balance is acceptable; it must not become demo funds. |
| 6 Account switch | Switch Keplr accounts. Old goals/balance/pending action clear until the new scope is connected. Previously submitted transaction records retain their original submitting wallet. Reconnect and check the new address. |
| 7 Disconnect/reconnect | Choose Local demo to disconnect the app view, then reconnect Keplr. The simulation stays labeled LOCAL SIMULATION; testnet history reloads for the correct wallet only. Revoking site connection in Keplr must cause a fresh permission request. |
| 8 Cancellation race | Start connection, switch account or choose Local demo while the prompt is open, then finish the old prompt. The old asynchronous result must not replace the active view. Reconnect fresh. |
| 9 Signer refresh | Prepare a tiny action, change Keplr account before approving. The stale review must abort; it must not broadcast from either account under the old intent. Prepare a new review only after reconnect. |
| 10 Signature rejection | Prepare tiny create/deposit/withdraw; reject in Keplr. Record REJECTED with no broadcast hash. Balance unchanged except unrelated independently submitted activity. |
| 11 Uncertain receipt | With a tiny testnet operation, inspect the journal if confirmation times out. Do not resubmit. Reload, reconnect original wallet, and reconcile the known hash. Missing receipt stays uncertain; successful inclusion is confirmed only after matching receipt validation. |
| 12 Restart/history | Close/reopen the app origin. Reconnect original wallet, verify recorded state/hash persisted. Change wallet and back; confirm scope isolation. IndexedDB availability is required before broadcasting. |

Wrong-network handling is covered locally by mocked wrong-chain REST/RPC/signer responses. Do not redirect a real wallet to a malicious endpoint to test this. If Keplr shows a different chain, stale denom, unexpected account, contract, funds, fee or message, reject and stop. A successful connection is not a successful contract smoke test.

If a real extension prompt requires interaction, the owner performs it. No real-extension result is claimed for the historical Run 2 rows. Browser availability/security-policy failure during Run 2 prevented normal browser inspection; it does not prove whether Keplr was installed for that run.
