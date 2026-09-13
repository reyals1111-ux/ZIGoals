# Alpha privacy notes

This describes the current repository's app, not an assurance about every future hosted service. ZIGoals has no app account, goal-sync server, advertising tracker or analytics collection in this implementation. Production hosting/access-log policies have not been assessed in this run.

Goal names, targets, dates, categories, notes and preferences are saved in this browser's localStorage, scoped by network and wallet. The local simulation ledger also stays there. This is local storage, **not encryption**: someone with access to the browser profile, a malicious extension or compromised same-origin code may read or change it.

Testnet transaction history uses a separate IndexedDB journal. It retains public wallet/contract identifiers, the intended action and amounts, local operation IDs, timestamps, signed transaction hashes and observed outcomes. The journal does not store a mnemonic/private key or raw signature bytes. Records can remain uncertain until a matching chain receipt is available. Damaged or unsupported rows are retained with a warning rather than silently erased.

Connecting Keplr requires the owner's approval and exposes the selected public account to the app. Requests to public ZIGChain RPC/REST services may reveal the visitor's IP and queried public account/contract/hash to those operators. Checking diagnostics also contacts those endpoints. Explorer/Hub/provider links open external services with their own practices. ZIGoals does not transfer private plan text to them.

Exported goal backups contain private planning information in readable JSON. Store them privately and remove personal data before sharing a reproduction. The backup is not a wallet backup and does not include funds, keys, the local ledger or the transaction journal. Import applies only to the matching network/wallet; matching IDs replace saved plans after validation.

Clearing this site's browser data removes private plans, simulated funds and local transaction history. It does **not** erase public chain data, revoke Keplr permission or remove funds already held by a deployed contract. Revocation is performed in Keplr. Confirmed onchain messages, amounts, addresses and optional metadata commitments are public and generally cannot be erased by deleting browser data. Withdrawals remain available without private goal metadata once a reviewed deployment exists.

Diagnostics show a shortened account, network status, public configuration and build identity. A screenshot of other screens or an exported file can still reveal private information: crop/redact it before posting. Report privacy or security problems privately to **hello@zigoals.app**; never include secrets or personal financial data.
