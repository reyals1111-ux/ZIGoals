# Audit B1 — what the repo already knew (docs)

> **Phase R research notes, Session AF (ADR-028).** Read on 2026-10-18 between 20:36 and 21:46 Brussels by an audit helper reading `origin/main` 4f92495 through git; lifted verbatim from the Phase R workflow journal in Part 0, with the independent verifiers' verdicts and the completeness critic's corrections. Research only: not legal, tax or financial advice; nothing here is an endorsement or a partnership. Facts carry their own source and read time; where a verdict below corrects the notes, **the verdict wins**. E-mail addresses were removed (the key scan forbids them).

## Summary

What the repo already knows, read from origin/main (sha 4f92495, the merge of PR #89 "Session AE") on 2026-10-18 ~20:40 Brussels, entirely through `git show`/`git grep`. No web request was made in this audit; every "as of" date below is the date the doc itself records.

State of the tree: origin/main's tip IS the PR #89 merge, so Session AE is merged even though its STATUS entry still says "not merged, not deployed". There is no "Alpha deploy #44" record; the live Alpha on record is #43 (`11d8408`, 2026-10-17). The next session must ask the owner whether AE went live before writing its own Alpha record.

Session AE built, read-only: "Connect Keplr ▾" (main button = Keplr's unchanged flow; the ▾ menu adds Disconnect, other wallets linked read-only via Keplr-compatible `enable`/`getKey` or EVM `eth_requestAccounts` only, and a watch-only Bitcoin address checked on-device), Today's wallet card with a wallet chooser and a ZIG/USD/EUR/BTC switch, all in one device-only record `zigoals:linked-wallets:v1` (max 12, exported, never synced or restored). Practice money (demo records or testnet ZIG) is never shown in fiat; it reads "unavailable" with the reason, "until the staking session's real balances" — the explicit hook left for Session AF. Leap (shut down 28 May 2026) and Cosmostation (from 1 Sep 2026) show only while injected, labelled ended. A guard test fails on any signing/sending call. The "1,000 ZIG demo balance" line left the top bar. Weight budgets were raised 10% (rule A); /app/staking now has a 487.0 kB budget with 45.6 kB headroom. Test counts: 5,110 unit tests (582 files), 2,277 browser passed. ADR ids run E (AC), F (AD), G1–G24 (AE); no H-ids exist, so ADR-028 can use H1..Hn.

The earn design (EARN_DESIGN.md, 2026-10-02; ADR-009 accepted 2026-10-03) rests on seven principles. Three are what the owner's new prompt changes: principle 6 "Testnet first" (plus ADR-009 §6 "the flag can only be true for TESTNET_DEPLOYED", ADR-004 "mainnet signing is refused", the public Alpha's `MAINNET_REFUSED` relay, and the deploy workflow's `PUBLIC_ALPHA_UNDEPLOYED` + "Financial signing and broadcasts remain disabled") is to be relaxed for native staking only; principle 4 "No promises. No projected returns" plus ADR-009 §4 "never ranked, summed or projected" becomes "projections allowed only as labelled illustrations"; and "ecosystem apps" is new wording — the phrase appears nowhere in docs or apps/web; today the page says "ZIG Chain ecosystem / Explore the ZIGChain ecosystem." with "External investment and funding integrations are disabled." Each change needs an explicit ADR-028 decision that names the superseded line.

Chain facts the build must use (verified on-chain 2026-10-02, re-read 2026-10-07/17): both networks `azig`/18 (uzig legacy escrow only); LCDs `https://testnet-api.zigchain.com` (zig-test-2) and `https://api.zigchain.com` (zigchain-1); unbonding 1,814,400 s, max 14 validators, 7 entries, min commission 0; slashing 0.0005 double-sign / 0.0001 downtime, 600 s jail; community tax 2%; node min gas price 2500000000azig; reviewed testnet versions v5.1.0–v5.1.2. The browser CSP allows only testnet-api/testnet-rpc; mainnet reads go through `/api/positions`, which the public Alpha refuses. ZIGChain's own GitHub registry still says uzig/6 (byte-identical on 2026-10-17). Valdora's stZIG stays gated (no execute schema, single admin key, undocumented price units). Noble USDC: minting stopped 2026-10-13 (now past), pause 2027-01-12 — never build on it. On-ramps: none delivers ZIG on ZIGChain; recommendation Banxa first, Ramp fallback, nothing before the lawyer answers.

Registries and where new entries go, the exact Resume-here shape, the STATUS entry section order, the open owner items verbatim, and the load-bearing claims with curl verifications are in raw_notes.

## Constraints

- READ-ONLY audit done; nothing written. Working tree is 212 commits behind; truth is origin/main 4f9249561736fbe19305b426de82f5c91a24763d (= Merge PR #89).
- No web request was made in this audit; every date is the one the doc records. Chain figures last verified on-chain 2026-10-02 (EVIDENCE) and partly re-read 2026-10-07 (V5_1) and 2026-10-17 (ONRAMP_OPTIONS S40–S42).
- Earn principle 6 'Testnet first' is enforced in four places that all must be named by any ADR-028 relaxation: EARN_DESIGN roadmap E3/E4, ADR-009 §6 (flag only for TESTNET_DEPLOYED), ADR-004 (mainnet signing refused), position-reader MAINNET_REFUSED + MANUAL_ALPHA_WORKFLOW (PUBLIC_ALPHA_UNDEPLOYED build mode; 'Financial signing and broadcasts remain disabled').
- Earn principle 4 / ADR-009 §4: no projected returns, provider claims never ranked, summed or projected — an 'illustration' allowance needs its own decision line and label text.
- Non-custodial rule (principle 2, ADR-009 §8): ZIGoals never signs, broadcasts on its own, stores a key/seed/exchange credential/API key, or batches steps; the AE guard test fails on any signing/sending call and on any EVM request other than eth_requestAccounts.
- Browser CSP connect-src allows only https://testnet-api.zigchain.com and https://testnet-rpc.zigchain.com; mainnet api.zigchain.com is reached only server-side via /api/positions; any new origin is TIER 3 (CSP) in egress-policy.json.
- No new dependency without owner approval (CosmJS 0.38.1 + direct Keplr API already chosen; private @zigchain SDKs not installed).
- Never build on Noble USDC (minting stopped 2026-10-13, pause 2027-01-12); USDT route pool is tiny and has no ESMA EMT white paper; Valdora stZIG stays read-only until schema, checksum↔audit mapping, testnet receipts and legal review exist (ADR-009 §7).
- Deploys: owner only, from main, Manual Alpha workflow; agent dispatch only on the owner's own `deploy <40-char SHA>` chat message, once, with owner_approval=true, never approving the alpha environment.
- One PR per session, merge commits only, TIER 3 (<area>) commits for auth/sync, deploy workflow, project rules, wallet, storage, CSP, public-safety labels; final commit is the STATUS entry; never weaken an assertion; protected baseline unchanged without owner approval.
- Builds and browser runs one at a time per machine (rule B, CLAUDE.md); Playwright ≤2 workers; helpers may write code/design/research in parallel.
- Practice money is never shown in USD/EUR/BTC (G16, TIER 3 public-safety labels) — real conversion was deferred to 'the staking session's real balances'.
- Every storage change must pass frozen readers #37–#43 and keep older builds ignoring unknown keys/ids; linked-wallets record is exported but never restored.
- Known limitations bullet 'No real money moves … nothing is bought, sold, sent or staked from ZIGoals' and shell.tsx honesty labels must be rewritten in the same TIER 3 (public-safety labels) commit as any signing feature.

## Gotchas

- STATUS's AE entry says 'not merged, not deployed' but origin/main's tip is the PR #89 merge; no 'Alpha deploy #44' record exists — ask the owner whether AE is live before writing Alpha/Release identity lines.
- The task's 'owner items A1–A10' labels do not exist: STATUS AE 'Owner items' is eight unlabelled bullets (quoted verbatim in raw_notes); A1–A7 are FIX_PLAN rows in docs/security/review-2026-10/SESSION_AD_SECTION2.md, a different list.
- ZIGChain's own GitHub registry (zigchain-registry assets/native/zig.mainnet.json) still says uzig/6 (byte-identical 2026-10-02 → 2026-10-17); the Cosmos chain-registry says azig/18. Wallets/on-ramps may read either; the chain is azig/18.
- A same-name decoy token-factory denom with symbol 'ZIG' exists on mainnet (coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig); never match by symbol.
- docs.zigchain.com says 5% double-sign slash; the chain parameter is 0.0005 (0.05%). Risk copy must cite the chain or say which.
- Valdora testnet ledgers use unbonding_period 604800 while the chain's is 1814400 s; testnet redemption timing is unrepresentative. Valdora's mainnet admin is a single secp256k1 key despite 'multi-sig' docs; stZIG bank metadata is exponent 6 while ZIG is 18.
- Valdora price queries still name fields uzig_amount/stzig_amount with undocumented units — no stZIG:ZIG value may be computed (ADR-009 §3).
- The testnet LCD answers from two nodes on v5.1.0 and v5.1.2 behind one name; an exact-version preflight would block signing on ~every other request (ZIGCHAIN_V5_1.md owner note).
- Leap and Cosmostation wallets are ended; install links only for Keplr, MetaMask, Rabby, Coinbase Wallet (G15: dead domains can be taken over).
- mac/cloud sandbox Chromium cannot play the intro film: four intro-film specs and scripts/pre-run11-setup.test.mjs fail locally and pass in CI.
- Known CI intermittents to re-run once, then investigate: account-browser b-first sync race (ADR-027 G24, for an auth/sync session), WebKit navigation stall after a seed (fixed by waiting for network idle; if it keeps a PR red, revert f29eb964 to make WebKit advisory), WebKit zigi-memory:54 target-closed, motion-polish sampling family.
- The hero slogan's line boxes touch by 4–5 px at 768/1920 in the sandbox font, same on main — protected baseline, do not 'fix'.
- Hosted verifier status 'completed with findings' counts 44 requests its own navigations abort (39 Next prefetches) — by design, not a defect.
- Local Playwright beside a running suite wipes test-results (memory note); use nohup servers on 3102–3104 and never preview_start.
- EUR-Lex, zignaly.com, help.zignaly.com, hub.zigchain.com, docs.zigchain.com (curl) are bot-walled; the repo's workaround list is in EVIDENCE 'Pages that could not be read'.
- ESMA's interim register files move weekly (CASPS.csv Last-Modified 16 Oct 2026); re-read before citing authorisation.
- Owner-carried deadlines: market-policy renewal ends 2026-10-31 16:00 UTC; DMARC 28 Oct; Fitbit legacy Web API off 2026-10-30; private-sync Worker redeploy for /v1/extras before the next deploy that needs it; the ZIGi real-model round.

## Reuse

- **ADR-027 session-decisions table** — `docs/architecture/ADR-027-session-ae.md`: Copy the file's skeleton for ADR-028: Status line, '## Owner decisions (<date>, plan approval)' (The brief, rules), '## Session decisions' table |#|Part|Decision|Why it is the safest option| with ids H1..Hn (no H-ids exist on origin/main).
- **AE_RESUME.md** — `docs/handoff/AE_RESUME.md`: Copy as docs/handoff/AF_RESUME.md: same intro rule, ## Commands, ## Lanes, ## Parts, and stacked '## Resume here (<date> <time> Brussels — <phase>)' blocks newest first.
- **STATUS entry skeleton** — `docs/STATUS.md`: Prepend a '# Session AF — "…" (ADR-028, Parts …, Gate C) (<dates>, [PR #NN], not merged, not deployed)' entry with the AE section order; before it, record the Alpha the owner reports (AE's deploy, if any) as '# Alpha deploy #44 — <date>, `<sha>` live' with the nine bullet fields.
- **Evidence register format** — `docs/earn/evidence/a-native-staking.md`: New chain/provider facts go as '## <Id>' + '**VERIFIED|UNVERIFIED** · <topic>' + claim + '*How:*' + bullet list of <url> · read <ISO Z> · height N · kept in <json> as <name> · quote; JSON records {name, retrievedAt, url, httpStatus, height, sha256, body}.
- **ONRAMP_OPTIONS source-tag style** — `docs/earn/ONRAMP_OPTIONS.md`: A new research doc: '**As of <date> (UTC).**' header, [S<n>] tags, Inference/Unverified markers, '## Sources' table |Tag|Source|Read|How| with curl sha256 or WebFetch.
- **native-positions reader (pinned-height read with fail-closed evidence check)** — `apps/web/lib/native-positions.ts`: Template for any new chain read: read blocks/latest, pin x-cosmos-block-height, verify node network + bond_denom + denom metadata, refuse redirects, 2 MB cap, 20-page pagination guard.
- **ADR-009 EarnOption / ProviderClaim shape** — `docs/architecture/ADR-009-earn-architecture.md`: Any validator/option data shown to people is an EarnOption record with ProviderClaim {text, sourceUrl, readAt}; an illustration (owner's new allowance) must still be labelled, never a field named 'rate'.
- **Help + search + What's new wiring** — `apps/web/components/help/help-page.tsx`: Add TOPICS ['af', 'New: …'], a <Section id="af" eyebrow="NEW: …"> with <HelpQuestion id="af-…">, mirror both in lib/search/static.ts HELP_TOPICS/HELP_QUESTIONS, bump WHATS_NEW_RELEASE, replace WHATS_NEW_LINKS and demote AE's to SESSION_AE_LINKS; update tests/zigi-help-settings.spec.ts:74, whats-new, help-page specs.
- **Device-key pattern** — `apps/web/lib/linked-wallets-key.ts`: A new device record: key in its own lib/<name>-key.ts, zod looseObject with version literal, DEVICE_KEYS entry in lib/export/everything.ts, DEVICE_LABELS in lib/data-health/catalog.ts, frozen-fixtures test, frozen readers #37–#43 run.
- **Weight-budget check** — `scripts/check-weight-budget.mjs`: Run after the production build; /app/staking budget 487,000 B (441.4 kB measured on AE's final code).
- **Hosted verifier stages** — `scripts/verify-hosted-alpha.mjs`: Stages run locally with ZIGOALS_VERIFY_BASE; since AE every stage opens its own page; a spec runs the local-capable stages in order in CI.

## Notes

# Audit B1 — What the repo already knows (docs digest of origin/main)

**Read on 2026-10-18 ~20:40 Brussels** from `origin/main` `4f9249561736fbe19305b426de82f5c91a24763d` (= `Merge pull request #89 from reyals1111-ux/feature/session-ae-stunning`) via `git show`/`git grep` only. No web request in this audit; every "as of" is what the document records. Nothing written.

## 0. Tree state
- `git log --oneline -4 origin/main`: `4f924956 Merge pull request #89 …` ← `d73b2a60 Session AE — STATUS and ADR-027 G23 …` ← `ed1d90f4 Session AE Gate C — every WebKit-set spec's seed waits …` ← `c1db750e`.
- STATUS's AE entry still reads "not merged, not deployed"; **no `Alpha deploy #44` entry exists** (grep). Live on record: Alpha #43, `11d8408`, 2026-10-17.

## 1. Dated fact table
| Fact | Source doc | Date recorded | Stale? |
|---|---|---|---|
| Live Alpha #43 = `11d8408280f4f7d5b32f12d17eeeaedd62b43b1f`, run 39038011811, dispatched 2026-10-17 13:47:28 UTC; Worker version `5ee8241e-…`, rollback `e3c6ba1c-…` (#42); rollback floor #32 | STATUS L88–99 | 2026-10-17 | Possibly: PR #89 merged since; #44 unknown |
| Session AE PR #89 "not merged, not deployed"; base `11d8408` | STATUS L1–3 | 2026-10-18 | **Yes** — origin/main tip is the merge |
| Unit 5,110 tests / 582 files, 44 skipped; browser full suite 2,277 passed, 5 failed (sandbox-only), 574 skipped (2.4 h); CI run 1015 green | STATUS L54–57 | 2026-10-18 | No |
| Budgets (kB, budget/now/headroom): /app 567/516.0/51.0; goals 478/434.4/43.6; habits 504/458.3/45.7; health 531/483.7/47.3; wealth 512/453.6/58.4; markets 476/430.3/45.7; portfolio 500/452.3/47.7; **staking 487/441.4/45.6**; activity 457/409.1/47.9; settings 531/483.9/47.1; help 450/401.4/48.6; chess 459/412.1/46.9; shell 447/397.3/49.7 | STATUS L25–39; scripts/weight-budgets.json | 2026-10-17/18 | No |
| Hosted verifier locally: every local-capable stage PASS; 1,261 requests, no privacy match, only app + ZIGChain testnet origins; 44 aborted-by-navigation requests counted by design; capture race fixed `512d8f08` | STATUS L62 | 2026-10-18 | No |
| Leap shut down 28 May 2026; Cosmostation wallet ended 1 Sep 2026 | ADR-027 G15; ONRAMP_OPTIONS S30 | 2026-10-17 | No |
| Both networks `azig`/18 since v5 (mainnet h 12549000 2026-09-30T09:45:17Z; testnet h 7669200 2026-09-08T09:10:49Z); `uzig` legacy IBC escrow | EVIDENCE fact 1; a-native-staking | 2026-10-02 | No |
| Staking params: unbonding 1814400s, max_validators 14, max_entries 7, historical 10000, min_commission 0 (both nets) | zigchain-staking.json f01 | 2026-10-02 | Re-check |
| Slashing: window 35000, min_signed 0.8, jail 600s, double-sign 0.0005, downtime 0.0001; docs say 5% double-sign | zigchain-staking.json; A-zig-slashing-docs-vs-chain | 2026-10-02 | Re-check |
| Distribution: community_tax 0.02, withdraw_addr_enabled true | zigchain-staking.json | 2026-10-02 | Re-check |
| Node versions: testnet v5.1.0/v5.1.2 behind one name, mainnet v5.1.2; recommended testnet v5.1.1; `REVIEWED_TESTNET_VERSIONS` v5.1.0–v5.1.2; min gas 2500000000azig | ZIGCHAIN_V5_1.md; packages/chain-config | 2026-10-07 | Re-check |
| Valdora testnet staker `zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69` code 2532 (migrated h 7812034, 2026-09-17), mainnet staker `zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55` code 179 (2026-09-30); checksum `2E68EC99…5F1C`; `stzig-staker 1.1.0`; single-key admin | EVIDENCE facts 3–4; b-valdora | 2026-10-02 | Re-check (contract can migrate) |
| Valdora fees: 10% performance (economics) vs "may include a fee" (FAQ); min stake 50 ZIG; min_stzig on chain 49 | EVIDENCE fact 5 | 2026-10-02 | Provider claim |
| OAK reports 2025-09-28 (47 findings), 2026-04-17 vault (28), 2026-09-21 18-dec (7); repos private; no checksum↔commit map | EVIDENCE fact 7 | 2026-10-02 | No |
| Noble USDC `ibc/6490A7EA…` channel-3; Circle stops minting 2026-10-13, pauses 2027-01-12 | EVIDENCE fact 8; ONRAMP_OPTIONS route D | 2026-10-02/17 | **First date now past** |
| USDT via IBC Eureka `ibc/630F2841…`; ESMA EMT register has no Tether | EVIDENCE fact 9 | 2026-10-02 | Re-check |
| No on-ramp delivers ZIG on ZIGChain; Guardarian ERC-20 `0xb2617246d0c6c0087f18703d576831899ca94f01` only | EVIDENCE fact 10; ONRAMP_OPTIONS S4–S25 | 2026-10-17 | Re-check |
| ZIGChain GitHub registry still `uzig`/6 (byte-identical 02→17 Oct); Cosmos chain-registry `azig`/18 | ONRAMP_OPTIONS S41/S42 | 2026-10-17 | Re-check |
| OroSwap pools at block 13014905: ATOM/azig `zig1wvqk…fe45` 80,043.37 ZIG / 2,398.79 ATOM; USDC/azig `zig186u…373h` 42,510.63 USDC / 843,728.97 ZIG; USDT/azig `zig1ucw…09t6` 139.57 USDT | ONRAMP_OPTIONS S40 | 2026-10-17 | Yes (live pools) |
| ESMA CASPS.csv 16 Oct 2026, 378 rows: MoonPay Europe, Banxa (EU Internet Ventures), Ramp Swaps Ireland, Coinbase Luxembourg, Nuvei Liquidity, Criptan (Mercuryo) with Belgium passport | ONRAMP_OPTIONS S1 | 2026-10-17 | Weekly file |
| Zignaly custodial, KYC, 14 excluded places, no new services since 2026-08-31 | EVIDENCE fact 11 | 2026-10-02 | No |
| Market policy period ends 2026-10-31 16:00 UTC; DMARC 28 Oct; Fitbit legacy API off 2026-10-30 | STATUS L84; ADR-025 Notes | 2026-10-17 | Deadlines |
| CSP connect-src: `https://testnet-api.zigchain.com`, `https://testnet-rpc.zigchain.com` | apps/web/lib/egress-policy.json L5–6 | main | No |
| Security review (Session Q) 54 findings, no Critical; one High (market dispatch DO allowance) | security/review-2026-10/README | 2026-10-03 | Partly fixed (SESSION_AD_SECTION2) |

## 2. Session AE (ADR-027) — what it built
Parts 0–6 + What's new/Help + Gate C (STATUS L5–18). Wallet-relevant:
- **Part 6 (`TIER 3 (wallet)` `7de2ee2a` `8b30a731` `419c781a`; `TIER 3 (storage)` `945a0fd4`; `TIER 3 (public-safety labels)` `9cdccffc` `f7435169` `0d5b5c2d`):** "Connect Keplr ▾": main button = Keplr's flow unchanged; ▾ menu adds **Disconnect** (returns tab to local demo, clears reconnect hint, asks Keplr to forget the ZIGChain Testnet permission when supported), other wallets linked **read-only** (Keplr-compatible `enable`/`getKey`; EVM `eth_requestAccounts` only), a watch-only Bitcoin address checked on device. No signing, transaction, key, custody, new endpoint, dependency or CSP change; a guard test fails on any signing/sending call and on any EVM request other than `eth_requestAccounts`. Hostile wallet objects/names/ids made harmless in the security fix round.
- **Record** `zigoals:linked-wallets:v1` (`lib/linked-wallets.ts`): `{version:1, wallets?:[{id,kind:'cosmos'|'evm'|'btc', wallet, label, address, addedAt}], selected?:'app'|id, display?:'ZIG'|'USD'|'EUR'|'BTC'}`, max 12, label ≤40; device-only, personal, in Export everything, never synced, **never restored**, removed by Remove/erase/clear; Showcase never writes it. Frozen readers #37–#43 ignore it.
- **Wallet card** (`components/wallet/wallet-card.tsx`): chooser (app wallet or a linked wallet), currency switch; practice money (demo records, testnet ZIG) in USD/EUR/BTC reads "unavailable" with the reason (G16); "A linked wallet shows its address, read-only; **its balance arrives with the staking session**" (Help `ae-wallet-card`). "1,000 ZIG demo balance" left the top bar and the phone Status sheet; the card shows "Simulated balance · this browser".
- **Leap/Cosmostation** appear only while injected, labelled ended, link-only; install links only for Keplr, MetaMask, Rabby, Coinbase Wallet (G15).
- **On-ramp research** docs only (ONRAMP_OPTIONS.md).
- Other parts: hero scene (D1 variant, `art-src/scene-alpha.mjs`), footer finale (S2), Light/Dark final (G7, G17, G18, G21), sidebar sky, header art, Routines block (`habits:routines` layout id, `TIER 3 (storage)` `3a0548b3`), four layout fixes + blur-order guard (G19), rule A budgets +10% (`57c8017a`), rule B parallel wording (`f1d91638`), verifier out of CI but stage order spec'd (G9).
- Tests changed (equal strength): listed STATUS L41–53; new specs `today-scene`, `launcher-twins`, `header-art-ae`, `habits-routines-block`, `layout-fixes-ae`, `theme-polish-ae`, `wallet-menu`, `hosted-verifier-order`; unit `css-backdrop-order`, `wallet-guard`, `wallet-link`, `wallet-menu`, `wallet-display`, `wallet-card`, `linked-wallets`, `hosted-alpha-stages`.
- PRIVACY.md paragraph "**Linked wallets** (Session AE, ADR-027)" added; THREAT_MODEL.md "## Session AE changes" (L309) with the table row "A linked wallet is asked to sign, send, switch networks or grant more → Cosmos wallets get only Keplr's reviewed connect calls (`experimentalSuggestChain(keplrChainInfo())`, `enable(chainId)`, `getKey(chainId)`) and only `bech32Address` is read; EVM …".

### Known CI intermittents (AE, STATUS L70–74)
- `account-browser` b-first (run 1013 only): sync race in untouched code (G24); re-run passed; proposed for an auth/sync session: after a replayed write answers 409, `sync()` reconciles once.
- WebKit `zigi-memory:54` (run 1002 only): page closed mid-click; passed later.
- WebKit navigation stall: `goto` right after a seed, 4 specs across `c9b123c9`/`c1db750e`; fixed `ed1d90f4` (every WebKit-set seed waits for network idle, 27 specs, ~10% slower). If it returns and keeps a PR red, revert `f29eb964` (WebKit advisory again).
- `motion-polish` start sampling, `run11-layout-stability`, `today-scene:156`: root-caused and fixed (`eca2a506`, `5093d0f4`, `040df29a`).

### Owner items (AE, STATUS L75–84, verbatim; there are no A1–A10 labels)
- Leap (shut down 28 May 2026) and Cosmostation's wallet (from 1 Sep 2026) are ended: each shows only when its extension is still injected, labelled as ended, link-only (ADR-027 G15).
- Practice money (demo records, testnet ZIG) never shows in USD, EUR or BTC (G16); real conversion arrives with the staking session's real balances.
- On-ramps (`docs/earn/ONRAMP_OPTIONS.md`, docs only, research and not legal advice): approach Banxa first, Ramp Network as the fallback, once the lawyer has answered the doc's open legal questions.
- Kept, with reasons (G22): the rail's 64 px lane at 1001–1279 px wraps "ZIG reward / reserve"; the reward-reserve card stays an art island in Light; phones keep the banner without the arc.
- The hero slogan's line boxes touch by 4–5 px at 768 and 1920 px in this sandbox's font, the same on `main` (protected baseline).
- The sync race above (G24) is for an auth/sync session; the hosted verifier's findings count requests its own navigations abort (a filter would be an owner decision).
- Sandbox-only: `pre-run11-setup.test.mjs` and the four intro-film specs fail here and pass in CI.
- Carried, unchanged: the ZIGi real-model round, DMARC (28 Oct), the market-policy renewal (ends 31 Oct 16:00 UTC), the private-sync Worker redeploy for `/v1/extras`; Inter and Customize stay owner decisions.

## 3. Alpha #43 / Session AD / Alpha #42 / Session AC / Alpha #41 (digest)
- **Alpha #43** (L88–99): source `11d8408…`; CI run 39033571400 success; deploy run 45 = Alpha #43 (run number runs two ahead); result VERIFIED, live prices VERIFIED; owner's hosted verifier stage 3 FAIL was a verifier bug (fixed AE Part 0). Record bullets: Source / CI / Deployment / Result / Alpha Worker / Owner's hosted verifier / What went live / Release identity / Record note.
- **Session AD** (ADR-026 F1–F23, PR #88): footer banner final + wordmark; hero bleed; theme bar (Light/Dark previews) with `TIER 3 (storage)` `zigoals:ui-prefs:v1.theme` and `TIER 3 (security headers/CSP)` 846-byte nonce boot script; one date format; sync status per section, restore edges, Undo survives reload (`zigoals:restore-undo:v1`); Q-SYNC-05 revocation check only while visible; B7 strict on write never refusing on read; Meet ZIGi gallery; What's new `2026-10-session-ad-final-look`. Weights: Today 515.0 of 515 (18 B room) — hence AE's rule A. Owner items: Light/Dark preview notes; four layout issues on main (fixed in AE); carried items.
- **Alpha #42** (L162–176): `61204c3…`, CI #980 attempt 2 (motion-polish once), deploy run 44; versions `e3c6ba1c-…` live / `ad8320e7-…` rollback.
- **Session AC** (ADR-025 E1–E28, PR #87, items 1–17): habit day grid, starfield veils, footer facts moved to notice/Settings/Help (`TIER 3 (public-safety labels)` `c9273d6b`, `3e9e309a`), Today twins (`TIER 3 (storage)`), Wealth one list, one Water card, vision image, Friends pack (16 Known limitations), fixed today-screens clock (2026-09-20 09:30 UTC), WebKit made required (`TIER 3 (CI)` `f29eb964`, aggregate fix `df3d707d`). Extra headings: "## Leftover table", "## Tier 2, in plain words (owner visual OK)". Notes (item 14): goal-extras v2 reader, DNS rebinding, Fitbit 2026-10-30.
- **Alpha #41** (L256–270): `9e41f0d…`, run 43; owner hosted check FAIL at stage 6 (tab title) → AC item 4.

## 4. ADR convention
- File `docs/architecture/ADR-0NN-session-xx.md`; H1 `# ADR-0NN: Session XX, "Title": session decisions`.
- Line 3: `Status: **Done|In progress** (…) on \`feature/session-xx-…\`, from \`main\` \`<sha>\` (Merge #NN, Session YY; live as Alpha #NN), in a cloud sandbox. This record holds the owner's decisions at plan approval and every decision the session took without asking (decide by the project rules and the safest option). Resume point: \`docs/handoff/XX_RESUME.md\`. Captures: the orphan branch \`review/session-xx-screens\`.`
- `## Owner decisions (<date>, plan approval)`: **The brief**, rules/amendments (AD: numbered 1–4; AE: Rule A, Rule B with commit shas).
- (AC only) `## Where the project rules and the brief meet`, `## Leftover table`, `## Recorded only`, `## Notes`.
- `## Session decisions` table `| # | Part | Decision | Why it is the safest option |`; ids: ADR-016 X, -018 Y, -021 A, -022 B, -023 C, -024 D, -025 **E1–E28**, -026 **F1–F23**, -027 **G1–G24**. `git grep '^| H[0-9]+ |' docs/architecture` → none, so **ADR-028 uses H1..Hn**. First rows by habit: H1 branch name/base/harness branch untouched; H2 Draft PR after Part 0; H3 parallel-lane/lock rule.

## 5. Earn design — principles and what the owner's new prompt changes
EARN_DESIGN.md principles (verbatim heads): 1 Consumer first, chain invisible. 2 Non-custodial, always. 3 The person signs every financial step. 4 **No promises.** No projected returns, no "earn X%"; a provider's fee/rate appears only as that provider's claim with source and read time, never compared or ranked. 5 No paid placement/affiliate/referral. 6 **Testnet first.** Nothing that can move value on mainnet until the gates in "Roadmap" are met. 7 Honest about who runs what.
Roadmap: E0 evidence/design/ADR-009/Valdora reader (done); E1 stZIG read-only on testnet (waits for Valdora); E2 "Learn more" hand-off to providers' own apps, no execution, no tracking; E3 user-signed steps on testnet (**native staking first, then stZIG**); E4 mainnet — legal sign-off, reviewed release, explicit owner approval; never before.
Consent and signing: schema from provider/tagged source, code ID+checksum pinned, **network is testnet**, simulation succeeded, human-readable summary confirmed; one step at a time; raw message visible.
**What the new prompt changes and where each is currently enforced:**
1. *Testnet first relaxed for native staking only* → supersede: EARN_DESIGN principle 6 + "Consent and signing" bullet 1 + roadmap E3/E4 (for native staking only); ADR-009 §6 ("flag can only be true for `TESTNET_DEPLOYED`"), §7 preconditions, Consequences ("Mainnet adapters out of scope"); ADR-004 ("Mainnet signing is refused"); `position-reader.ts` `MAINNET_REFUSED` on the public Alpha (reads go via `/api/positions`); `shell.tsx` honesty labels gated on `FINANCIAL_EXECUTION_ALLOWED`; MANUAL_ALPHA_WORKFLOW ("`PUBLIC_ALPHA_UNDEPLOYED` remains the required build mode… Financial signing and broadcasts remain disabled"); Help Known limitations "No real money moves… nothing… staked from ZIGoals". Valdora/stZIG stays testnet-first (ADR-009 §7 unmet).
2. *Projections only as labelled illustrations* → supersede principle 4's "no projected returns" and ADR-009 §4 "never ranked, summed or projected"; precedent: CHAIN_FEE_FINDINGS ("the UI shows commission and only rate scenarios the person enters") and `/app/wealth/calculator`. ADR-009 §4 forbids a `rate` field in EarnOption — an illustration needs its own labelled structure.
3. *"Ecosystem apps" wording* → the phrase occurs nowhere in docs or apps/web. Today: eyebrow "ZIG Chain ecosystem", H1 "Explore the ZIGChain ecosystem.", lede "Discover projects, understand their role, and follow official sources. Your plan stays yours.", review line "{n} research records · Sources reviewed <date> · No external execution in ZIGoals", context "An ecosystem listing is not a ZIGoals partnership, endorsement or security audit…", page fine print "External investment and funding integrations are disabled."; search `page:ecosystem` keywords `['zigchain','apps']`; mockup A "Run by Valdora"; E2 "hand-off to providers' own apps". New wording must keep ADR-009 §8 ("custodial or off-chain products are information only") and principle 5.

## 6. Earn evidence digest (EVIDENCE_2026-10.md, read 2026-10-02 UTC)
Facts 1–14: azig/18 both nets; staking params; Valdora migrations (179/2532, same checksum); single admin key; fee/minimum contradictions; redeem = burn → queue → 21 d (+2) → claim, no cancel; no message schema anywhere; Noble USDC live but winding down; USDT via Eureka, no Tether EMT paper; no on-ramp on ZIGChain; Zignaly custodial; ZIG began as Zignaly's token (MiCAR paper, Comet Technologies Ltd, Latvijas Banka); ZIG Markets via FSCA entities; OroSwap on-chain fees differ from docs (xyk 0.01%, 20% maker fee, every mainnet pair type `is_disabled` for new pairs).
"What this means for the app today": mainnet read failed closed on `uzig`/6 at 57275a6 — **fixed in Session P** (position-reader now azig/18 both nets).
Still unknown: Valdora execute messages and price units; fees_percentage 1000 = 10%?; min_stzig 49; deployed-code↔audit mapping (Valdora, OroSwap); who controls the admin key; Circle's treatment of Noble escrow at the 2027-01-12 snapshot; Zignaly legal entity; any on-ramp on ZIGChain; ZIG Markets retail terms. Open questions list L645–690 (incl. "ZIGChain docs vs chain: 5% vs 0.0005 — which is authoritative for user-facing risk copy?"; testnet has no usable issuer stablecoin route; docs list testnet channel-44 as active while its client is Expired).
Unreadable (bot walls): zignaly.com/*, help.zignaly.com (read via intercom.help/zignaly), docs.zigchain.com and zigchain.com to curl (WebFetch works), hub.zigchain.com, EUR-Lex (use publications.europa.eu Celex), onramper/alchemypay/kado lists, Liquid-Zig repos (404/private), gitbook.zignaly.com/white-paper.
Evidence record JSON shape (zig-denoms.json):
```json
{"name":"research/b/lcd_staking_params","retrievedAt":"2026-10-02T20:46:59Z","url":"https://api.zigchain.com/cosmos/staking/v1beta1/params","httpStatus":200,"height":"12610424","sha256":"37d1b16c…1a3f","body":{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig","min_commission_rate":"0.000000000000000000"}}}
```
Slashing body: `{"signed_blocks_window":"35000","min_signed_per_window":"0.800000000000000000","downtime_jail_duration":"600s","slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"}`. Distribution: `{"community_tax":"0.020000000000000000","base_proposer_reward":"0…","bonus_proposer_reward":"0…","withdraw_addr_enabled":true}`. Valdora testnet contract_info: `{"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","admin":"zig1699nz…","label":"stZIG Staker"}`; init protocol_info `{"fees_percentage":"1000","min_deposit":"1000000","min_stzig":"1000000","token_denom":"stzig","treasury_address":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","withdrawal_request_limit":1}` (pre-v5 units). live-denoms.json (2026-09-13): `{"base":"azig","display":"zig","denom_units":[{"denom":"azig","exponent":0},{"denom":"zig","exponent":18}],"symbol":"ZIG"}`.

## 7. On-ramp research (ONRAMP_OPTIONS.md, as of 2026-10-17 UTC)
- Still no on-ramp delivers native ZIG or any stablecoin on ZIGChain [S4][S8][S12][S16][S21]; Guardarian ERC-20 only [S23]; Coinbase has no ZIG [S25]. Transak lists no EEA country [S9][S11]. Skip Go lists zigchain-1 with azig but has no swap venue on ZIGChain [S35–S38]; "no routes found" to azig.
- Owner rule (2026-10-03): no provider secrets on a server → only Banxa referral link, Ramp hosted mode, plain links fit; all redirects, no CSP change. iframe would need `TIER 3 (CSP)` frame-src + Permissions-Policy camera (two Tier 3 changes).
- App today at `11d84082` [S50]: frame-src only chess.com/Lichess; Permissions-Policy `camera=()` except /app/health; strict-dynamic nonce scripts, Trusted Types; COOP same-origin; Referrer-Policy no-referrer.
- Routes to native ZIG: A exchange withdrawal (13 "ZIGChain native" venues [S31]); B ATOM → IBC channel-4 → OroSwap (thin pool); C ERC-20 ZIG → Hub bridge/Token Wrapper [S33]; D Noble USDC (**do not build**); E USDT Eureka (tiny pool, no Tether EMT paper).
- Recommendation: Banxa first (AFM, Belgium passport, referral URL "No server-to-server calls required" [S18], fees 1.99% card / 0% other / spread 2–4% [S20]); Ramp fallback (CBI; fees up to 1.40/2.40/3.9% [S13]); no-contract fallback = "Ways to get ZIG" help page (ESMA Q&A 2882 "solely a reference to a CASP" [S43]). Preconditions: lawyer answers A–H; a legal entity for KYB; a provider on ZIGChain or owner accepts multi-step; app has left practice-money mode; any CSP/Permissions change is Tier 3.
- Open legal questions A (MiCA perimeter: RTO, placing, advice, non-EU), B (marketing: MiCA Art. 66(2), FSMA Regulation 5 Jan 2023, wording "Add money"), C (affiliate fees), D (UCPD, DMFSD), E (liability), F (data: address in URL), G (practice-money positioning, sandbox use, labels before mainnet), H (contracting party, stablecoin routes, travel rule).
- Sources S1–S50 with sha256 (curl) or WebFetch; S50 = repo files `egress-policy.json`, `csp-compose.mjs`, `next.config.ts`.

## 8. Research docs
- **ZIGCHAIN_CURRENT_STATE.md**: top note 2026-10-03 "Mainnet is azig/18" supersedes the Run #8 "uzig/6" line; 2026-09-17 funding evidence (self-transfer hash `53216EEF…`, fee 25000000000 azig/gas vs configured 2500000000 — "no fee-policy change authorized"); CosmWasm upload whitelist `AnyOfAddresses` excludes the dedicated wallet; Goal Manager NOT DEPLOYED; Keplr boundary `suggestChain`/`enable`/`getKey`/`getOfflineSignerAuto`/`keplr_keystorechange`; BIP44 coin type 118; CosmJS 0.38.1 with bech32 bound 90; EVM research-only; 2026-10-07 addendum → V5_1.
- **ZIGCHAIN_V5_1.md** (2026-10-07): v5 redenom; testnet v5.1.0 binary swap at halt 7,930,000 on 2026-09-25; mainnet v4.3.0→v5 by proposal #41 at 12,549,000, CometBFT 0.38.25, SDK 0.53.8; v5.1.2 repairs the halt; no breaking REST change; wasm params route now 200; node min gas `2500000000azig`; `REVIEWED_TESTNET_VERSIONS = ["v5.1.0","v5.1.1","v5.1.2"]`; owner note on exact-version preflight vs two-version endpoint.
- **ECOSYSTEM_INTEGRATION_MAP.md** (2026-09-13; EVM 09-17): lifecycle DISCOVERED→RESEARCHED→VERIFIED→INTEGRATED (+DISABLED), none grants execution; Valdora/OroSwap/PermaPod/Nawa/ZIG Markets/Zignaly/WME/Zamanat/DeFa/Beehive/Ondo/Taurus/Apex/Noble/Axelar/Range/ZIGScan/Hub sections; "Idle remains the only executable strategy"; EVM lane NOT_EXECUTION_READY.
- **VALDORA_STZIG.md** (2026-09-13): DEFERRED; code_id 1062 outdated; "Developer email already sent by owner; await response, do not duplicate outreach."
- live-*.json (2026-09-13): node v5.0.0-patch-1, height 7739907, gRPC `grpc-t.zigchain.nodestake.org:443` status 0.

## 9. Strategy pack (Session O, 2026-10-03; research only; "Pricing is NOT decided")
- README: input for the Beta brainstorm and a later pricing/marketing brainstorm; reflects main after Session L.
- BETA_IDEAS_BACKLOG: 100 ideas, ranked top 20, three 90-day options; effort S/M/L; LC§ legal flags.
- FEATURE_GAP_MATRIX: ZIGoals (main 57275a6) vs category leaders, ✓/◐/✗.
- GLOBAL_READINESS: English-only words, locale numbers, kg/lb etc., portfolios USD/EUR only; regional rules as lawyer flags.
- MARKET_LANDSCAPE (1,581 lines): leaders in Goals/Habits/Health/Wealth with store prices/privacy labels.
- MONETIZATION_OPTIONS: four-app stack USD 298.97/yr US; 235,97–273,97 € BE; 2026 store fees; no recommendation.
- PATH_TO_500K: 500k sales ≈ 457/day for 3 years from 2027-02-18 release; conversion maths.

## 10. PRIVACY.md structure (112 lines)
H1 "Run #10 repository privacy addendum — not a hosted activation claim" (accounts/sync/device-unlock/retention; Session U Part 9; Session AB-Cloud) → `---` → H1 "Alpha privacy notes" (no account/telemetry; platform store; Habits/Health stores; testnet journal; **"Connecting Keplr requires the owner's approval and exposes the selected public account… Requests to public ZIGChain RPC/REST services may reveal the visitor's IP and queried public account/contract/hash to those operators"**; host/CSP; market requests via CoinGecko (HMAC bucket, 48 h); "future explicitly deployed-testnet build would send intended messages, public accounts, contract identifiers and amounts to RPC for fee simulation and transaction submission"; backups; Showcase; origins; clearing data does not revoke Keplr; diagnostics; reconnect hint "Explicit Local demo, and Disconnect (Session AE), clear that hint"; then bold-led session paragraphs: **Linked wallets** (Session AE), **Reminders while ZIGoals is closed** (ADR-010), **The Guide** (ADR-011), **ZIGi · your AI** (ADR-012), **ZIGi v2** (ADR-014), **Session W** (ADR-015). A Session AF paragraph goes after **Linked wallets** as "**<Feature>** (Session AF, [ADR-028]…)" stating exactly what is sent to which endpoint and which key stores what.

## 11. Security notes
- docs/security: SECURITY_CHECKLIST (2026-09-21), THREAT_MODEL (updated 2026-10-17 by `7de2ee2a`, "## Session AE changes" L309), TRUSTED_TYPES (10-06), review-2026-10/{README, THREAT_MODEL_REFRESH, DATA_FLOWS, FINDINGS (54), FIX_PLAN, OWNER_CHECKLIST, INCIDENT_RUNBOOK, SESSION_AD_SECTION2 (2026-10-16: A7/Q-SYNC-05 and B7 built; A1–A6 done earlier)}.
- **goal-extras v2** (ADR-025 Notes L62; ADR-021 info 5; STATUS L590): "A future `zigoals:goal-extras:v2` needs a reader for both versions: the photo tidy-up keys on the v1 record, so a build that reads only v2 would see no photo references after a rollback and could remove photos."
- **DNS rebinding** (ADR-025 L66): "remains the recipe-import route's low exposure: the route checks the host's literal form, not the address it resolves to at fetch time." (ADR-007 admin CLI covers it with a per-run token.)
- Fitbit legacy Web API off 2026-10-30; nothing live breaks.

## 12. Deployment rules (rules only)
- MANUAL_ALPHA_WORKFLOW: dispatch by `reyals1111-ux` (or `claude[bot]`), `main` only, `expected_commit` full SHA, `owner_approval`; protected `alpha` environment reviewed by the owner only; build job has no credentials; `PUBLIC_ALPHA_UNDEPLOYED` required; identity must be `dirty:false`; CSP floor checked pre-upload; one fixed deploy command; waits for `X-ZIGoals-Build` on ten routes; live-price probe informational; NEEDS_OWNER_REVIEW never auto-retried; rollback captured before upload; artifacts 90 days.
- AGENT_DISPATCH (owner option 3): only after the owner's own chat `deploy <40-char SHA>`; SHA = origin/main HEAD and Milestone quality green; once; never re-run/cancel/approve `alpha`; report run URL; if refused, say so and stop.

## 13. Registries — where new entries go
| Registry | File | What to add |
|---|---|---|
| What's new release id | `apps/web/lib/whats-new.ts` L14 `WHATS_NEW_RELEASE` | new id ≤40 chars e.g. `2026-10-session-af-…`; asserted in `tests/zigi-help-settings.spec.ts:74` |
| What's new links | `apps/web/components/for-you/whats-new-card.tsx` | replace `WHATS_NEW_LINKS` (each `/app/help#help-<id>`); move AE's to `SESSION_AE_LINKS` ("Earlier updates") |
| Help topics | `apps/web/components/help/help-page.tsx` L15 `TOPICS` | `['af', 'New: …']` |
| Help answers | same, after the AE `<Section id="ae">` | `<Section id="af" eyebrow="NEW: …" title="…">` + `<HelpQuestion id="af-…" question="…">` |
| Search mirror | `apps/web/lib/search/static.ts` `HELP_TOPICS`, `HELP_QUESTIONS` | same ids/strings (unit test keeps in step); `PAGES` keywords for Staking if the page's words change |
| Known limitations | help-page.tsx L257 `<Section id="known-limitations">` ul | edit "No real money moves…" bullet; add new limits (AC pattern: link to the answer) |
| PRIVACY | `docs/PRIVACY.md` after **Linked wallets** | bold-led paragraph |
| Data catalog | `apps/web/lib/data-health/catalog.ts` `DEVICE_LABELS` + `apps/web/lib/export/everything.ts` `DEVICE_KEYS` + `lib/<name>-key.ts` | any new device key; frozen-fixtures test |
| Weight budgets | `scripts/weight-budgets.json` | only with reason; staking 487000 |
| Evidence | `docs/earn/evidence/*.md` + `*.json` | new register items |
| Verification | `docs/verification/session-af/gate-c-*.{md,txt}` | audits, frozen readers, revert gate, scans, verifier, weights |
| Threat model | `docs/security/THREAT_MODEL.md` | "## Session AF changes" table |
| Legal | `docs/business/LEGAL_CHECKLIST.md` §6 | new questions, numbered |

## 14. Resume-here shape (docs/handoff/AE_RESUME.md, newest 2026-10-18 02:59 UTC)
```
# Session AE — Resume here
Kept current after every part (owner rule). On any resume, usage pause or model switch: `git pull`, read this file and `git log --oneline -15`, then continue at the next unfinished step. Never redo finished work; never re-plan; never enter plan mode again (…ADR-027 and the PR description).
## Commands            (Node path, install, Chrome channel symlink, flock lock, rebuild.sh, playwright command, capture.mjs, build-themes, TZ date, deadlines)
## Lanes (ADR-027 G3)  | Lane | Branch | Owner | State |
## Parts               | Part | State | Commits |
## Resume here (2026-10-18 05:00 Brussels — Gate C done; the STATUS entry next)
- Done: …  - Next: …
## Resume here (2026-10-18 03:40 Brussels — Gate C, the last checks)
- Done since …  - CI run …  - Running: …  - Next: …
## Resume here (… 00:20 …) - Done / Running / Open / Next
## Resume here (2026-10-17 20:30 Brussels — Part 0) - Done / Next / Open decisions: none.
```
Blocks are prepended newest-first; each names what is Done, Running, Open, Next with commit shas and log paths.

## 15. STATUS entry shape (sections in order, from AE)
1. `# Session AE — "Stunning, finished" (ADR-027, Parts 0–6, Gate C) (2026-10-17/18, [PR #89](…), not merged, not deployed)`
2. `**Evidence labels:**` (local / CI / WebKit; no paid service, no secret, no deploy)
3. `**Base:** \`main\` \`<sha>\` (Alpha #NN). **Rules (owner):** … Decisions without asking: ADR-0NN X1–Xn. Resume file: … Captures: …`
4. `## Parts` table `| Part | What | Tier | Commits | Evidence |` ending with the What's new/Help row, Gate C row, and "This entry, PR ready for review".
5. `## Tier 3, in plain words (risk → rollback)` — one bullet per TIER 3 area with commit shas, risk, rollback; closing bullet "Nothing in auth, sync, CSP or headers, the deploy workflow or CI changed."
6. (AE) `## Owner-approved budget raise (rule A, …) and headroom` table.
7. `## Tests and assertions changed (deliberate, equal strength unless said)`.
8. `## Gate C evidence` — Unit, Browser, CI (run ids), Audits, Weights, Hosted verifier, Revert gate, Frozen readers, Key scans, Reviews, Captures.
9. `## Known CI intermittents (this session)`.
10. `## Owner items`.
11. `---` then the Alpha deploy record(s) and older entries. New entries are prepended at the top of the file.

## 16. Load-bearing claims (verify_how)
1. Testnet LCD `https://testnet-api.zigchain.com`, chain `zig-test-2`; mainnet LCD `https://api.zigchain.com`, chain `zigchain-1` — `curl -s -m 20 https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info` (expect `"network":"zig-test-2"`, version v5.1.x).
2. Bond denom `azig`, display `zig` exponent 18, both nets — `curl -s -m 20 https://testnet-api.zigchain.com/cosmos/staking/v1beta1/params` and `…/cosmos/bank/v1beta1/denoms_metadata/azig`.
3. unbonding_time 1814400s, max_validators 14, max_entries 7, min_commission_rate 0 — same params call.
4. Slashing 0.0005 / 0.0001, jail 600s, window 35000, min_signed 0.8 — `curl -s -m 20 https://testnet-api.zigchain.com/cosmos/slashing/v1beta1/params`.
5. community_tax 0.02 — `…/cosmos/distribution/v1beta1/params`.
6. Node minimum gas price `2500000000azig` — `curl -s -m 20 https://testnet-api.zigchain.com/cosmos/base/node/v1beta1/config`.
7. Reviewed versions v5.1.0/5.1.1/5.1.2 — `git show origin/main:packages/chain-config/src/index.ts | grep -n REVIEWED`.
8. Keplr chain info: prefix `zig`, coin type 118, currencies azig/18, gasPriceStep 2500000000/2500000000/4000000000; RPC `https://testnet-rpc.zigchain.com`; gRPC `grpc-t.zigchain.nodestake.org:443` — `git show origin/main:packages/chain-config/src/testnet.json`.
9. CSP connect-src = testnet-api + testnet-rpc only — `git show origin/main:apps/web/lib/egress-policy.json | sed -n 1,12p`.
10. Public Alpha refuses mainnet reads (`MAINNET_REFUSED`); browser never calls api.zigchain.com — `git show origin/main:apps/web/lib/position-reader.ts | grep -n MAINNET`.
11. Linked-wallets key `zigoals:linked-wallets:v1`, max 12, currencies ZIG/USD/EUR/BTC — `git show origin/main:apps/web/lib/linked-wallets-key.ts`.
12. `WHATS_NEW_RELEASE = '2026-10-session-ae-stunning'`; Help topic `ae`; AE answers `ae-scene…ae-music` — `git grep -n 2026-10-session-ae origin/main -- apps/web`.
13. /app/staking budget 487,000 B — `git show origin/main:scripts/weight-budgets.json`.
14. Valdora testnet staker `zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69` code 2532 (as of 2026-10-02) — `curl -s -m 20 https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69`.
15. ZIGChain GitHub registry still `uzig`/6 — `curl -s -m 20 https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json`.
16. origin/main tip is the PR #89 merge; no Alpha #44 record — `git log -1 --oneline origin/main`; `git grep -n 'Alpha deploy #44' origin/main -- docs/STATUS.md`.
17. Deploy rule text — `git show origin/main:docs/deployment/AGENT_DISPATCH.md | sed -n 5,12p`.
