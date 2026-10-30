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

- **P9 — A1 in practice.** Staking already asked Keplr with `preferNoSetFee`; the Goal Manager path (gated off, no contract deployed) now does too. Keplr can still let a person edit the fee in its own window, so the signed bytes are checked before anything is broadcast (`verifySignedFee` in `lib/staking/receipt.ts`): one `azig` amount equal to the review's, the reviewed gas limit, no payer or granter. A wallet that changed the fee is refused with plain words ("Your wallet changed the network fee. Nothing was sent."). Keplr's suggested gas-price steps (registry 2.5 / 25 / 50 Gazig) stay: `low` is the floor of both fee models and none is below it (pinned in `networks.test.ts`). Glossary and Academy no longer say the wallet may raise the fee.
- **P10 — v6 voting threshold on both networks.** Governance's eligibility is at least 1 ZIG staked with bonded validators (summed). On mainnet's last v5 days this is a little stricter than the chain; it only hides the vote for stakes under 1 ZIG and keeps the copy true from the upgrade on.
- **P11 — The Staking page's connect error.** Found while testing Part 1: a failed Keplr connection (no chain info answer, a changed or upgraded network) set an error that was only rendered inside the connected form, so the person saw nothing. It now shows under the Connect button (`components/staking/staking-actions.tsx`); a UI fix, no signing change.
- **P12 — Intermittents fixed at their cause (item 13):**
  - `account-browser`: the phase deadlines measured the runner's speed (every step of phase 1 finished; the phase ran past 20 s on a slower machine, the last "Sync now" starting at 19.5 s, each sync answered in < 60 ms). They are now stall limits: a phase fails when one of its steps makes no progress for that long; the journey keeps its 150 s limit. Local: both cases pass (112 s and 110 s).
  - `domain-review-race` (the lost-acknowledgement double): the double cancelled the authority's response body mid-stream before throwing, which could leave workerd's service-binding stream hanging until the 30 s limit; it now reads the answer and then throws (the caller still never sees the acknowledgement). 8 runs in a row pass (0.6 s each).
  - `execute.test.ts` "no receipt within 60 s": its own guard allowed the loop 45 s of real time on a loaded runner, but the test ran under vitest's default 5 s limit, which fired first; the test's limit is now the guard's (60 s). The fake clock moves only on the poll's sleeps, so the poll count is exact. This is the one case where a limit changed; the reason is that the test contradicted itself, and no assertion changed.
  - `coherence:25`: 25 page loads (5 widths × 5 pages) inside a 45 s test; now one test per width with the same pages and checks.
  - `zigi-local-answers:32`: the fixture's clock is a UTC instant and the answer names local days; the page runs in UTC.
  - `checklist-overlay-af:425`: a fixed midday clock (and its items dated from it), in UTC.
  - `run9-2-product:30`: Quick add is pressed after hydration, and the saved contribution is awaited.
  - The WebKit "ZIGi box empty" class: one helper (`tests/zigi-open.ts`): open, wait for the box's focus, type until the box holds the text and Send is enabled, then press Send.
  - `zigi-knock:60/105`: the knock marks `data-zigi-knock-looked` once its rules have run and the answer is painted; "no knock" checks wait for it instead of 1.5 s, and first appearances get the 15 s cold-load wait.
  - The Goal-name race (item 11): 30 raw wizard fills and ah-multitab's inline copy now use `tests/goal-name.ts`, the live verifier's goal stage uses `scripts/run11/goal-name.mjs`, and `lib/testing/goal-name-guard.test.ts` fails on any new raw fill.
- **P13 — Celebrations stay on the device.** The companion research noted that Session AI's research rule R3 called the celebrate-once record synced while `lib/celebrations.ts` keeps it on the device. It stays on the device (private by design; a celebration seen twice on two devices is harmless); the research note is corrected here rather than the data moved.
- **P14 — The Showcase's pairings under the gap rule.** With item 10's stricter rule (a pairing is shown only with its meaningful gap and a probability of superiority of 0.60), the Showcase's fictional earlier season read "no clear difference" for Sleep and habits (95% against 90%), and Water and sleep sat on its 20-minute line, so the result changed with the day. The fictional season was redrawn rather than the rule or its tests loosened: the stretch habit is done after every long night and 6 of 14 shorter ones, long nights last 8 h 15 min or more, and a night after a day with water is 25 minutes longer. The three pairings are early signs on each of 400 Showcase days scanned (from 1 Oct 2026, daylight saving included); Water and habits stays "no clear difference so far".
- **P15 — Welcome back without a write.** The first version kept a last-seen day in ZIGi's record, written when Today was viewed; that broke the protected "nothing is written on view" rule (Session V Part 9, pinned by zigi-brief-af). Welcome back now reads the person's own records: no entry for 7 days or more and none yet today. The unreleased optional field was removed before any build wrote it.
- **P16 — Item 5 measured.** A synthetic full-size catalog (scripts/catalog/measure.mjs, seeded): v1 4.5 MB raw / 1.52 MB gzip; v2 (compact rows behind `x-zigoals-catalog: 2`) 0.78 MB raw / 0.31 MB gzip; an unchanged catalog answers 304 with no body. Older builds keep receiving v1. A4: every field search ranking, logos, offline search and asset pages read is kept; WE1's ranking tests pass unchanged.
- **P17 — Item 14.** The only advisory left in the full tree was `qs` 6.16.0 (moderate, GHSA-6pq8-jhm2-2vcw) under express in build tooling; an exact override to 6.16.1, already in the lock, clears it. `pnpm audit`: no known vulnerabilities.
- **P18 — Item 36's address encodings.** @scure/bip32 does the key arithmetic; RIPEMD-160, base58check and bech32 are small local functions pinned to their published vectors (no further dependency). The BIP-44/49/84 vectors pin the derived addresses. The watched key lives in its own IndexedDB database, outside every export, backup and sync, so A6's coverage test lists it as "erase only".
- **P19 — Trader tools' storage.** Only the opt-in and the tilt dismissal are stored, as an optional `trader` group in the loose `zigoals:ui-prefs:v1` (already exported and erased); the leverage figures are never stored.

- **P20 — FSVO foods and the stored provenance.** The Health record's provenance field allows only Open Food Facts; widening it would change the synced Health format. A food from the Swiss Food Composition Database keeps its source in the brand line ("Swiss Food Composition Database (FSVO)") and has no provenance record; each search result shows the FSVO attribution and link before it is saved.
- **P21 — GPX/TCX without DOMParser.** The app's CSP enforces Trusted Types with only a script-URL policy, so Chrome's DOMParser refuses plain strings. Rather than widen the policy, a small strict XML reader (lib/workouts/mini-xml.ts) reads the files: elements, attributes, text, CDATA and the five standard entities; an internal DTD subset or an unknown entity is refused. Cross-checked against DOMParser in a unit test.
- **P22 — Repeated cards are shown, with a note.** A first version hid a card that an earlier reply had proposed; the chat suites showed that a card asked for again ("Another 300 ml") or one that was undone is legitimate. Every card shows; when two or more cards of one earlier reply come back, a line says so.
- **P23 — ZIGi's added instructions fit the default budget.** The "This page" question went 42 tokens over the default 10,000-token budget, so the app asked before sending; this session's added action lines were shortened (same meaning). Later prompt additions must keep that margin (zigi-page-awareness-af pins it).
- **P24 — Item 17 was already true.** Since Session AB-Design the Alpha notice is the one dismissible demo/alpha notice; the Showcase chip is a status marker (fictional records never look real) and the hidden-page banner a functional notice. Pinned in tests/aj-owner-decisions.spec.ts.
- **P25 — Item 18's scope.** Undo from Activity is offered where the kind has an undo where it was made: Health entries (since Session AI) and now habit days (the habit journal's own functions, as the Day Timeline's Undo). A goal contribution is reversed on its goal (a recorded reversal, never a deletion), so Activity links there; ZIGi's entries keep their Undo in the chat. Workouts, tasks and journal entries are not Activity events.
- **P26 — "Erase everything on this device" is built.** ADR-034 and A6 refer to it, but the app had only the account erase (not reachable on the Alpha, with no accounts). Settings → Backup & restore now ends with it: after typing ERASE it removes every key that starts with "zigoals" from both storage areas and every ZIGoals database; lib/erase-coverage.test.ts fails when the code names a key or database that erase, Export everything and the catalog do not account for (with a reasoned list of keys that are not records).
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
Outcomes: **Built** (commit, tests), **Already done** (evidence), **Excluded** (by the owner). Every row's code is on
`feature/session-aj-big-leap` (PR #98); nothing is merged or deployed.

| Item | Outcome | Where | Evidence |
|---|---|---|---|
| 1 ZIGChain v6 versions | Built (TIER 3 chain config, TIER 3 wallet) | `5754e43b`, `dffab5ee` | reviewed-versions unit tests (v5.1.x, v6.0.x pass; v6.1, v7, rc, empty fail); fee quote tests v5 byte-identical, v6 base fee × 1.5, unreadable refuses; A1 signed = reviewed fee; A2 v5→v6 between quotes; live reads zig-test-2 v6.0.0 and zigchain-1 v5.1.2 |
| 2 records | Built | `11fb8fd8` | STATUS Part 0; frozen readers #37–#51 |
| 3 verifier stage 7 (and stage 4, A3) | Built (TIER 3 verifier) | `1359caeb` | hosted-alpha-stages unit test; stage 4 prints the base fee |
| 4 activation-check names | Built (TIER 3 activation tooling) | `7f2fac82` | make-private-configs tests (names only, never values) |
| 5 WE16 catalog (D8, A4) | Built (TIER 3 stored format) | `613a3a28` | WE1 ranking tests unchanged; measured 4.5 MB / 1.52 MB gz → 0.78 MB / 0.31 MB gz (P16) |
| 6 CO6 history by source (D7) | Built (TIER 3 stored format) | `c8df9714` | unit; frozen readers; "Source not recorded" for older readings (P6) |
| 7 J14 Bitpanda/Bitvavo | Excluded by the owner | — | the brief |
| 8 pins (GO3, TO1, I5, ST5, ZI5) | Already done; pinned | `612d0441` | `aj-owner-decisions.spec.ts` |
| 9 ZIGi real-model gaps | Built | `612d0441`, `cc22456c` | mock evals and G6 checks; REAL_MODEL_TODO.md for the owner's real-model run |
| 10 check-in, insights, mascot (D14) | Built (TIER 3 stored format) | `0c62bba8`, `50169562` | unit; COMPANIONS.md; browser specs; P13–P15 |
| 11 goal-name fills | Built | `32e37f7c` | the raw-fill guard test |
| 12 checklist-overlay clock | Built | `b187118e`, `3981aed5` | CI |
| 13 known intermittents | Built at their cause | `b187118e`, `0ded7bae`, `ca1568e0` | P12; CI |
| 14 security bumps (D2) | Built (TIER 3 dependency) | `c77fa396`, `78886d80` | `pnpm audit` clean; build:alpha, check:alpha (P17) |
| 15 price alerts (D9) | Built (TIER 3 stored format) | `ed583b26`, `46d37acf`, `d5649595` | unit; `price-alerts-aj.spec.ts`; ZIGi card never auto-accepted |
| 16 Earn Start here, orbit look (D3) | Built | `a804f02a`, `50a6e2a9` | earn-path, polish2-af (ZIGi's line and chests unchanged) |
| 17 one dismissible notice (D4) | Already done; pinned | `d5339e88` | P24; `aj-owner-decisions.spec.ts` D4 test |
| 18 undo from Activity (SE5) | Built | `d5339e88`, `50a6e2a9` | `activity-undo-aj.spec.ts` (desktop and phone); P25 |
| 19 backup anchors (SE3) | Built (the remaining gap) | `d5339e88` | `#backup-<module>` links; restore and export specs |
| 20 wizard skip link (E3) | Built | `d5339e88` | wizard specs |
| 21 contrast and tables (LA6, AF15, E4, D4) | Built | `b8be8fa5` | a11y-wcag-x adds /app/guided, /app/journey, /app/earn, /app/habits |
| 22 food databases | Built (TIER 3 egress routes) | `dcd5c1da` | FOOD_SOURCES.md; FSVO via the food Worker; `food-search.test.mjs`, `food-search-aj.spec.ts`; Worker deploy is the owner's |
| 23 landing (MO6) | Built | `17e5bd8f` | landing specs; privacy and terms cover the new pieces; stage 7 accepts both sets |
| 24 reopened M41/M43/M47, AF13/H3 (A8) | Built | `39203e7f` | A8_REOPENED.md (71 items, each fixed or protected) |
| 25 one trend, maintenance estimate | Built | `7712703c` | unit (floors, minimum data) |
| 26 sleep balance | Built | `7712703c` | `sleep-balance-focus-aj.spec.ts` |
| 27 fitness research, GPX/TCX import (D12) | Built | `7712703c`, `7cdd93db` | FITNESS_SYNC.md; strict XML reader (P21); `workouts-import-aj.spec.ts` |
| 28 focus window | Built | `7712703c` | `sleep-balance-focus-aj.spec.ts` |
| 29 Life Score (D10) | Built (TIER 3 stored format) | `7712703c` | unit; `universe-guided-aj.spec.ts` |
| 30 trader tools (D11) | Built (TIER 3 stored format) | `326ff45a` | unit; `trader-tools-aj.spec.ts`; P19 |
| 31 chess overlay research | Built (research) | `eae8a0f8` | CHESS_OVERLAY.md |
| 32 Customize (D5) | Built (TIER 3 stored format) | `725d8160`, `8f2807f0`, `50a6e2a9` | unit; `customize-aj.spec.ts`; theme parity 'customized'; Inter OFL and SHA-256s |
| 33 Guide phase 2 (D6) | Built | `ffa78ad2` | unit; ADR-011 status |
| 34 Guided Journeys, Focus Sessions (D13, A7) | Built (TIER 3 stored format) | `77747265`, `7712703c`, `581bae14` | `universe-guided-aj.spec.ts`; no sidebar entry; /app/guided weight line |
| 35 a habit's everyday time | Built (TIER 3 stored format + auth/sync) | `db25f9d2` | frozen readers keep `times` through a read-modify-write; `timeline-everyday-aj.spec.ts` |
| 36 xpub watch (D2b, A5) | Built (TIER 3 dependency, stored format) | `78886d80`, `e4f9add4`, `1a55c97a` | unit (derive, scan, back-off, gap limit); `xpub-watch-aj.spec.ts`; PRIVACY line |

Amendments: A1–A3 in items 1 and 3; A4 in item 5; A5 in item 36; A6 built (`b0439a4d`, `8f2807f0`: Erase everything and
`lib/erase-coverage.test.ts`); A7 in item 34; A8 in item 24; A9 in STATUS and the report.
