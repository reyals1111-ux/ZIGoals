# Run #8.1 final coherence

Starting head: `f7b705528b2678335859b6c65687967a20b48d38`. Functional checkpoint precedes visual polish.

Functional scope: explicit allocation edit/release and confirmation using existing exact allocation arithmetic; private pin/lock/close/delete; locked mutations rechecked at the private storage update boundary; deletion unlinks Habits without deleting their rules or entries and preserves Positions. Legacy Goals reuse the management overview/modules, with optional collapsed simulation. Legacy removal archives only the scoped card, preserving ledger and plan; the original Goal URL provides Restore. No storage migration.

Cash, crypto, stablecoins, stocks, precious metals and custom sources create ordinary MANUAL Positions. Explicit total value takes precedence over entered-unit price; stablecoins have no inferred peg, and currencies have no inferred conversion. Manual sources save explicitly to Positions before final Goal creation and therefore remain available if the wizard is abandoned. Automatic precious-metal pricing deferred to Run #9.

Functional validation: 38 targeted unit tests, typecheck, three browser flows. Browser evidence uses fictional fixtures only. No Health changes, Habit schema/history changes, deployment, merge, financial signing or blockchain action.
