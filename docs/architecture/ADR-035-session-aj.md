# ADR-035: Session AJ, "The Big Leap": session decisions

Status: **In progress** on `feature/session-aj-big-leap`, from `main` `65d0b85` (Merge #97, Session AI; live as Alpha #51), in a Claude Code cloud session (Opus 5.5, High effort). This record holds the owner's decisions (D1–D15), the owner's amendments (A1–A9), every reading the session took without asking (P1…), the verify-then-do table and the closing table for every item in the brief. Resume point: `docs/handoff/AJ_RESUME.md`.

## Owner decisions (29 Oct, final)
- **D1 — ZIGChain version rule.** Accept v6.0.x on zig-test-2 once v6's upgrade notes are read, and keep v5.1.0–v5.1.2. From now on any patch within a reviewed minor version is accepted. A new minor or major version fails closed with a plain message ("The network was upgraded; checks are pending"), not "Unavailable or changed". Mainnet zigchain-1 gets v6.0.x only if the notes or the ZIGChain repository show mainnet upgrading. Signing code changes only if the notes require it.
- **D2 — Dependencies, pre-approved.** (a) Patch and minor security bumps of packages already used, one commit each. (b) Declaring `@scure/bip32` 1.7.0 directly (already in the lockfile; nothing new downloaded) for the xpub watch. Anything needing a major version or a new package is recorded, not done.
- **D3 — Earn's Start-here path** takes the Checklist's orbit look, with the same one-time motion (still under reduced motion and Motion Off). The Checklist itself is untouched.
- **D4 — One dismissible demo/alpha notice** replaces the stacked notices. The full Alpha disclaimer stays in Settings and Help.
- **D5 — A Customize editor, per device:** font System (default) or Inter; text size Standard or Large; density Comfortable or Compact; glow Full or Soft. Inter is self-hosted under its open licence (no npm package). Pillar colours and themes stay as approved.
- **D6 — Guide phase 2** = better-worded rule-based nudges plus an "Ask ZIGi about this" hand-off when an AI is connected. No on-device model, no new Worker, no secret.
- **D7 — Net-worth history by source.** New readings save their source; old readings show "source not recorded". The chart keeps its approved asset-class view, with a "By source" switch.
- **D8 — Coin catalog (WE16):** app-side only, no coordinator change. Slim the fields, version the catalog so it downloads once per version, keep it on the device for offline search, and measure with a full-size synthetic catalog.
- **D9 — Price alerts tied to goals:** in-app only, checked on open and on price refresh from prices already read; shown on Today; ZIGi may propose an alert as a confirm card; push later.
- **D10 — Life Score:** opt-in, on My Universe only (on Today only when turned on); from records the person already keeps, with a "Why?" breakdown and kind wording; not tied to the game layer.
- **D11 — Trader tools:** opt-in in Portfolio, visible only to people with trades: a trade-health summary, a gentle tilt check, a cost-of-leverage calculator card. Informational, never advice.
- **D12 — Fitness sync:** a full research document of every competitor option; GPX and TCX file import into workouts (summary only, never route points); no OAuth connections in this session.
- **D13 — Focus Sessions** extend Session AI's goal-tied focus session (no second one). Guided Journeys is built as its own feature.
- **D14 — ZIGi:** deepen the daily check-in, cross-module insights and the mascot from fresh competitor research. Reopen every item Session AH kept "by design", except the PROTECTED list and the owner decisions.
- **D15 — Model:** Opus 5.5, High effort.

**Non-negotiables and the PROTECTED list** are the brief's (STATUS, Session AJ entry): never merge, deploy, dispatch, approve environments or log in to Cloudflare; never push to `main`; the deploy workflow unchanged; wallet signing changes only in Part 1 and only if v6 requires it; no AI signs or holds keys; no new dependency except D2; every stored-format change additive, TIER 3 (stored format), frozen readers #37–#51, in the export/restore/erase lists; every new outside host TIER 3 (egress routes); reduced motion, Motion Off and theme parity; ≥ 44 px targets; no route budget raised; consumer first, private by design. PROTECTED: the Checklist and everything AG Polish 1–3 shipped, the footer finale, the Today hero and slogan (AF9), the first-visit swan intro, Today can be hidden (W4, M40), Light's dark islands, the tablet rail / desktop sidebar / phone bottom bar (M46), Governance hidden by default, "Premium · free during the Alpha" (DE2).

## Owner amendments (29 Oct, after approval; pre-approved)
- **A1 (Part 1, TIER 3 wallet):** the fee the app quotes is exactly the fee that gets signed; Keplr must not replace it with its own gas-price step (`preferNoSetFee`). The suggested chain's gas-price steps match each network's reviewed fee model. A test shows the signed fee equals the review sheet's fee on v5 and on v6.
- **A2 (Part 1):** mainnet proposal #45 upgrades zigchain-1 to v6 at height 13,466,800 (about 3 Nov 09:30 UTC), during this session. The quote reads the node's version and fee model at quote time, never from a value cached at page load, so a v5→v6 switch while the app is open can never sign with the old fee model. Tested; recorded here and in STATUS.
- **A3 (Part 1):** verifier stage 4 also reads zig-test-2's base fee (read-only) and prints it; a missing base fee on a v6 node is a stage-4 finding.
- **A4 (Part 4, item 5):** before slimming `/api/market-assets`, list every field search ranking (WE1), logos, offline search and the asset pages use; keep all of them; pin WE1's ranking tests first so they pass unchanged after the change.
- **A5 (Part 4, item 36):** mempool.space reads for the xpub are batched and cached, respect its rate limits and back off on 429; no refresh loop (on open and by hand, at most every 5 minutes); stop at the gap limit; derived addresses are never sent anywhere except the balance reads.
- **A6 (Part 10):** the account erase and "Erase everything" cover every device key and IndexedDB database that exists (Sessions AH and AI included); one test lists every known key and database and fails when any is not covered by erase, export or the data catalog.
- **A7 (Part 6, item 34):** no new sidebar entry for Guided Journeys (owner rule TO9); reached from Goals, Habits, My Universe and search, with its own weight line.
- **A8 (Part 7, item 24):** this record lists every M41, M43 and M47 item plus AF13/H3 by name, each "fixed" (commit) or "protected" (which rule).
- **A9 (Finish):** owner follow-ups in STATUS and the report: after #52 is deployed, one practice delegate and claim on zig-test-2 (the v6 fee on the review sheet); after zigchain-1's upgrade, one small real delegate and claim (the v6 fee there). The session never waits for them.

## What the session found at the start (29 Oct, about 19:00 UTC; live reads)
- `main` = `65d0b8590816b662902d102328d49b9e2c11195a`, as the brief expects.
- **zig-test-2:** REST node_info and RPC `/abci_info` both report `v6.0.0` (commit `81af3b2`, cosmos-sdk v0.53.8). `bond_denom` `azig`, bank metadata `azig` → `zig` at 18 decimals (unchanged since the v5 redenomination). New: `/cosmos/evm/feemarket/v1/base_fee` = 2.5 Gazig per gas, params `min_gas_price` 2.5 Gazig, `base_fee_change_denominator` 8, `elasticity_multiplier` 2; the same value through RPC `abci_query /cosmos.evm.feemarket.v1.Query/BaseFee` (a LegacyDec string, 2500000000 × 10¹⁸).
- **zigchain-1:** still `v5.1.2`; `base_fee` answers "Not Implemented". On-chain **proposal #45 "Software Upgrade to v6"** (authors "ZIGChain Core Team"): plan `v6` at height **13,466,800** ("~Tue 2026-11-03 09:30 UTC"), binaries from `ZIGChain/networks` `binaries/v6.0.0` with SHA-256 checksums; voting 29 Oct 10:48 UTC → 2 Nov 10:48 UTC. The networks repository's README still says mainnet "not scheduled yet" (read the same evening).
- **v6 notes read:** `ZIGChain/networks` `upgrades/v6/README.md` and the release page `v6.0.0` ("Whirlpool"). The chain's own source is not public. Summary in `docs/research/ZIGCHAIN_V6.md`.

## Decisions taken without asking (readings)
- **P1 — Branch.** The owner's branch name `feature/session-aj-big-leap` is used (the owner's explicit instruction; the cloud harness had named another).
- **P2 — Mainnet v6 (D1).** An on-chain software-upgrade proposal by ZIGChain's core team, with the binaries and checksums in ZIGChain's networks repository, is "the ZIGChain repository showing mainnet upgrading". Mainnet's reviewed minors become v5.1 and v6.0, so real staking keeps working once #45 passes and the chain moves at height 13,466,800. If #45 fails, v6 never appears on mainnet and the accepted entry is never used.
- **P3 — Fees on v6 (TIER 3 (wallet); the notes require it).** v6 prices Cosmos transactions with an EIP-1559 base fee that rises up to 1/8 per block above the 2.5 Gazig floor, and the notes say "clients with a fixed floor price will see rejections when blocks are busy". The fee model follows the reviewed minor: v5.1.x keeps the fixed 2.5 Gazig per gas (quotes byte-identical); v6.0.x reads the base fee over the RPC the quote already uses, at quote time (A2), and quotes max(2.5 Gazig, ⌈base fee × 1.5⌉) per gas — enough for about three full blocks of rise. An unreadable or malformed base fee on v6 refuses the quote ("Nothing was signed"). The review sheet shows the gas price used. No message type, key, sign mode or account type changes; the review screen stays the only path to a signature.
- **P4 — Voting on v6.** Voting needs at least 1 ZIG staked with bonded validators. Governance (hidden by default) states it, and the chain's "no voting power" maps to that plain sentence. Copy and error mapping only.
- **P5 — One reviewed-versions table** (`packages/chain-config/src/reviewed-versions.ts`): the reviewed minors per network with each minor's fee model; any `vMAJOR.MINOR.PATCH` patch of a reviewed minor passes; a newer minor or major fails closed as "upgraded" with D1's sentence; anything else (older, malformed, a suffix such as `-rc1`) fails closed with the existing words. The old exports (`REVIEWED_TESTNET_VERSIONS`, `REVIEWED_VERSIONS`) stay, derived from the table.
- **P6 — D7 and the readings that came before.** Readings saved before this session go into a "Source not recorded" band of the By-source view, as D7 says; each reading's own coarse source (manual, market, verified) still shows in its detail.
- **P7 — D4 and which notices.** "Demo/alpha notices" are the Alpha notice, the Showcase/demo line and the hidden-page banner. Functional notices (errors, offline, transaction outcomes, wallet reconnect) stay where they are.
- **P8 — Today placements.** Today's built-in section ids are a strict synced enum in every released build, so alerts, the Life Score and the focus window reach Today as For-you cards (a loose, additive route).

## Verify-then-do (the brief's items checked against `main` before building)
| Item | Found on `main` | Action |
|---|---|---|
| SE3 (item 19) | One "Backup & restore" card exists (`#backup-restore`, ADR-034 N35) | Close the remaining gap (per-module backups have no anchor); specs at equal strength |
| SE5 (item 18) | Only Health entries undo from Activity (N32); the ZIGi prompt claims "Actions by ZIGi, with Undo", untrue | Build undo for every kind with an undo where it was made |
| I5 (item 8) | Ramp/Banxa wording in `lib/ai/context/specialists.ts` | Pin test |
| ST5 (item 8) | "Fits your answers"; "OUR SUGGESTION" nowhere | Pin test |
| ZI5 (item 8) | Switches show before a connection; no spec pins the text | Pin test |
| GO3, TO1 (item 8) | As decided; GO3's "Create on step 1" not pinned | Pin tests |
| E3 (item 20) | No skip link in the wizard (Session AI's "already there" was the shell's) | Build |
| WE16 (item 5) | Full list, `no-store`, five separate loaders | Build (D8, A4) |
| CO6 history (item 6) | Today's split only (N29) | Build (D7) |

## Closing table (every item in the brief)
Filled in as each part lands. Outcomes: **Built** (commit, tests), **Already done** (evidence), **Not possible** (evidence, reason).

| Item | Outcome | Where | Evidence |
|---|---|---|---|
| 2 (records) | In progress | Part 0 | — |
