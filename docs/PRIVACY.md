# Alpha privacy notes

This describes the public Alpha at https://alpha.zigoals.app/app and the current repository; M5 changes are not live until separately deployed by the owner. ZIGoals has no app account, goal-sync server, advertising tracker or application telemetry. Hosting providers still operate infrastructure logs and aggregate analytics; this document does not promise a particular retention policy or anonymity from the host.

Goal names, targets, dates, categories, notes and preferences are saved in this browser's localStorage, scoped by network and wallet. The local simulation ledger also stays there. This is local storage, **not encryption**: someone with access to the browser profile, a malicious extension or compromised same-origin code may read or change it.

Testnet transaction history uses a separate IndexedDB journal. It retains public wallet/contract identifiers, the intended action and amounts, local operation IDs, timestamps, signed transaction hashes and observed outcomes. The journal does not store a mnemonic/private key or raw signature bytes. Records can remain uncertain until a matching chain receipt is available. Damaged or unsupported rows are retained with a warning rather than silently erased.

Connecting Keplr requires the owner's approval and exposes the selected public account to the app. Requests to public ZIGChain RPC/REST services may reveal the visitor's IP and queried public account/contract/hash to those operators. Checking diagnostics also contacts those endpoints. Explorer/Hub/provider links open external services with their own practices. ZIGoals does not transfer private plan text to them.

The web host receives ordinary page and asset requests, including IP/browser information and request paths. A goal detail path such as `/app/goals/<id>` exposes that identifier to the host even for a simulated goal; the path does not include its name, target, date or notes. Browser history, screenshots, clipboard tools, device backups and extensions may expose additional information independently of ZIGoals. HTTPS and a restrictive CSP do not protect data from compromised permitted origin code or a hostile extension.

The deployed public web Alpha, whose Goal Manager remains undeployed, supports local simulation and optional connection/read-only checks. A future explicitly deployed-testnet build would send intended messages, public accounts, contract identifiers and amounts to RPC for fee simulation and transaction submission. Those public transaction inputs are separate from private planning fields. No claim about this future path substitutes for the deployment and owner-approval gates.

Exported goal backups contain private planning information in readable JSON. Store them privately and remove personal data before sharing a reproduction. The backup is not a wallet backup and does not include funds, keys, the local ledger or the transaction journal. Import applies only to the matching network/wallet; matching IDs replace saved plans after validation.

Storage is separate for each origin. The Workers fallback hostname and the official Alpha domain do not share plans, simulated balances or history. A private backup can transfer supported planning metadata manually; changing a hostname or rolling back the frontend does not migrate or erase browser data.

Clearing this site's browser data removes private plans, simulated funds and local transaction history. It does **not** erase public chain data, revoke Keplr permission or remove funds already held by a deployed contract. Revocation is performed in Keplr. Confirmed onchain messages, amounts, addresses and optional metadata commitments are public and generally cannot be erased by deleting browser data. Withdrawals remain available without private goal metadata once a reviewed deployment exists.

Diagnostics show a shortened account, network status, public configuration and build identity. A screenshot of other screens or an exported file can still reveal private information: crop/redact it before posting. Report privacy or security problems privately to **hello@zigoals.app**; never include secrets or personal financial data.

M5 independently checks fictional data on the real public origin; [evidence](verification/m5/README.md) identifies the tested flows and limits. Cloudflare `cf-nel` network error reporting headers are infrastructure reporting, distinct from ZIGoals application analytics. The app does not add a tracker; this is not a claim that Cloudflare collects no infrastructure data.

M5 keeps Local Demo after reload. A versioned boolean in tab-scoped sessionStorage may remember a previous successful connection only to offer **Reconnect Keplr**. It contains no account or plan, grants no capability and causes no automatic wallet call. Explicit Local demo clears that hint. Keplr's own origin permissions remain separately controlled in the extension.
