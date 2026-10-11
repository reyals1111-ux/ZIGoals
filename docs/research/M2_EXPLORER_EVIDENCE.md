# Explorer and Hub evidence

Observed 2026-09-13. These integrations open public information pages; they do not query a portfolio, prove a receipt, or request a signature. No wallet or Goal metadata is sent in Hub URLs. Reconciliation uses verified RPC receipt bytes independently of explorer display.

| Provider / capability | Evidence and implemented scope |
|---|---|
| Range testnet homepage | [Official ZIGChain explorer catalogue](https://docs.zigchain.com/users/tools/block-explorers) links directly to `https://app.range.org/zigchain-testnet/general`. Homepage link supported for zig-test-2. |
| Range tx/account/block/contract/asset | Unconfirmed. Web extraction returned no content for the testnet app, and normal browser access failed because the admin-enforced security policy could not be verified. No bypass attempted; no guessed detail links. A homepage link is labeled “Open Range testnet,” never presented as a transaction receipt. |
| Range role/API | [Range's own validator announcement](https://range.org/blog/range-is-now-a-validator-on-zigchain) describes ZIGChain explorer/indexing/security and developer API access. This does not establish a public unauthenticated API contract or complete-history guarantee for ZIGoals. No API integration. |
| ZIGScan testnet | [Official catalogue](https://docs.zigchain.com/users/tools/block-explorers) links to [testnet ZIGScan](https://testnet.zigscan.org/). Fresh HTML labels zig-test-2 and emits `/block/<height>` links. |
| ZIGScan tx/account/contract | Current publicly served [search component](https://testnet.zigscan.org/_next/static/chunks/edf176db6934a663.js?dpl=dpl_ABC8wapwCuVtS9gTEE9Jadgzn7Qj) navigates transaction hashes to `/tx/<UPPERCASE_HASH>`, addresses to `/address/<lowercase_address>`, and recognized contracts to `/smart-contracts/contract/<lowercase_address>`. The account page's [transaction component](https://testnet.zigscan.org/_next/static/chunks/5878036a7107162b.js?dpl=dpl_ABC8wapwCuVtS9gTEE9Jadgzn7Qj) independently emits tx/account links. Routes supported with strict identifier validation. This is public route-source evidence; no new ZIGoals deployment or live ZIGoals receipt exists. |
| ZIGScan block | `/block/2617855` returned HTTP200 and is indexed as Block Details; fresh homepage emitted `/block/7741145` and neighboring heights. Positive safe integer validation. |
| ZIGScan asset/token | No canonical detail route verified. Not exposed. |
| Mainnet detail links | Outside this testnet app's active catalogue; no fallback from an unknown chain to a mainnet URL. |
| Hub overview/validators | Official [Hub guide](https://docs.zigchain.com/users/hub/) links homepage; testnet explorer emits `https://hub.zigchain.com/validators/`. Static informational links supported. |
| Hub staking/governance/bridge | Official docs footer links exact `/staking`, `/proposals/`, `/bridge/` destinations. Supported as external information links. Hub may open mainnet or retain its own selected network: user must verify it there. ZIGoals does not pass a wallet, choose a funding route, connect or sign. Bridge link is information only, not a ZIGoals funding flow. |

Hub direct HTTP read returned 403; the official docs still provide canonical routes. This is documentation verification, not successful end-to-end Hub testing. No claim of read-only functionality within the third-party site: Hub itself offers financial actions which the owner must separately choose.

The typed catalogue is in `packages/ecosystem-registry`; changing a provider's lifecycle cannot change or add executable routes. Evidence freshness does not mean the provider, contracts, returns or eligibility have been audited. A reviewed fixed route can still become unavailable later.
