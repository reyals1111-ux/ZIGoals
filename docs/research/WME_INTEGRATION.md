# WME integration research

Retrieved 2026-09-13. Confidence labels distinguish descriptions from executable evidence.

## CONFIRMED

Official module overview describes WME/Profit Sharing3.5 and performance-linked strategy tokens: https://docs.zigchain.com/builders/modules (high confidence description). The dedicated WME documentation says content is being prepared: https://docs.zigchain.com/wealth-management-engine/ (high confidence publication state). Neither provides a usable adapter contract.

Public organization https://github.com/ZIGChain and the recursive tree of https://github.com/ZIGChain/zigchain-examples were inspected. The available frontend example is a token-factory app with generated Cosmos/factory client modules. It does not establish WME messages, policy or testnet deployment. Official SDK docs require GitHub Packages authentication, so current private SDK/protobuf source is not available through this connection. No absence-of-API conclusion follows from this limitation.

## CONFIRMED_BUT_EXPERIMENTAL

None established from the examined primary sources. Conceptual wealth infrastructure is not evidence of a callable experimental API.

## UNCONFIRMED

| Required evidence | Finding |
|---|---|
| Exact module/package and tx/query messages | No canonical executable definitions verified |
| Strategy/performance-token representation | Concept described; schema and valuation unverified |
| Permissions and manager model | No enforceable interface verified |
| Fees, deposits, withdrawals | Mechanics not specified sufficiently for implementation |
| CosmWasm interoperability | No canonical binding/query/execute evidence verified |
| Current testnet availability/deployed example | No verified WME contract/module endpoint or version |

Live node-info and ordinary testnet bank/staking/contract-info interfaces were verified. Those do not prove WME availability. No speculative module routes were used as a basis for code. Source/protobuf access and an official working example are required to advance this gate.

## DEFERRED

WMEAdapter remains an architectural boundary. Do not implement invented WME messages or recreate delegated wealth management internally. When source arrives, verify schemas, denom/v5 behavior, manager/admin authority, valuation and exit semantics; test an explicit allowlisted adapter after idle is stable. WME is not a Milestone1 dependency.
