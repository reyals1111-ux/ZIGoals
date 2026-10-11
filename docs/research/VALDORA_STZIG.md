# Valdora stZIG integration gate

Retrieved 2026-09-13. Integration DEFERRED; no messages inferred or protocol transaction sent. Developer email already sent by owner; await response, do not duplicate outreach.

CONFIRMED (high, published source): https://docs.valdora.finance/smart-contracts lists testnet Staker zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69 and token denom coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig. Live official REST contract-info returns code_id1062, label stZIG Staker, admin/creator zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3. This confirms an address exists, not source/version/v5 compatibility.

CONFIRMED (medium, conceptual docs): https://docs.valdora.finance/liquid-staking/architecture separates Staker and Ledger contracts, variable mint/value ratio and normal redemption21+ days; https://docs.valdora.finance/liquid-staking/unstaking-and-redemption describes normal/fast exit paths. A DEX exit is not normal protocol redemption, and stZIG is not permanently1:1 with ZIG.

UNCONFIRMED: canonical source/schema, ExecuteMsg/QueryMsg, stake/deposit funds denom, exact exchange-rate query and rounding, redemption initiation, pending-redemption query, claim eligibility/message, minimums, protocol/performance/redemption fees, pause effects, upgrade policy, testnet code version and v5 compatibility. Reviewed official docs contain conceptual flows and address lists, not enough executable schema evidence. No UI messages reverse-engineered.

DEFERRED: adapter implementation and financial testing until every above input is verified against canonical source and deployed code. The future adapter needs independent liquid/pending/claimable accounting and must preserve exits during a deposit pause. Record developer reply and source hash here before implementing.
