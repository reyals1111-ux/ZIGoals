# Completeness critic and gap fills (Phase R)

> **Phase R research notes, Session AF (ADR-028).** Read on 2026-10-18 between 20:36 and 21:46 Brussels by the completeness critic and eight gap-fill helpers; lifted verbatim from the Phase R workflow journal in Part 0, with the independent verifiers' verdicts and the completeness critic's corrections. Research only: not legal, tax or financial advice; nothing here is an endorsement or a partnership. Facts carry their own source and read time; where a verdict below corrects the notes, **the verdict wins**. E-mail addresses were removed (the key scan forbids them).

## Critic's notes

Method: read-only critique of the seven research digests and three audit digests against the plan requirements, plus a handful of read-only checks of my own at 2026-10-18 ~20:50+02:00 (git show/ls-tree/grep on origin/main 4f92495; curl -I of https://alpha.zigoals.app/app). No OPTIONS requests, browser reads, builds or writes were made; closes_with commands that need OPTIONS or a browser are left to the next helper or the owner.

Facts I verified myself that the plan can use now: (1) live Alpha headers: x-zigoals-build 4f9249561736fbe19305b426de82f5c91a24763d, cross-origin-opener-policy: same-origin (so window.open() returns null — on-ramp and Hub links must be <a target=_blank rel=\"noopener noreferrer\">, which still opens), referrer-policy: no-referrer, permissions-policy on /app camera=() microphone=(self); (2) apps/web/lib/egress-policy.json chainOrigins = testnet-api/testnet-rpc only, csp.app.connect = chess.com, lichess, Spotify, frame-src = chess/lichess embeds; any new origin is a Tier 3 CSP line; (3) scripts/check-weight-budget.mjs sums gzip of the <script src> tags in each page's HTML (L19-21), so click-time dynamic imports are not measured; (4) docs/PRIVACY.md is the privacy file (not a root PRIVACY.md): L55 (RPC/REST disclosure), L79 (linked wallets: 'no balance is looked up for a linked address and linking makes no request of its own'), L105-106 (third-party list) are the passages AF must rewrite; (5) packages/ecosystem-registry/src/links.ts holds zig-test-2 explorer entries only; (6) apps/web/package.json has no @wallet-standard, @walletconnect, @keplr-wallet or mipd packages; EIP-6963 discovery is hand-rolled in apps/web/lib/wallet-link.ts L86-88; (7) docs/STATUS.md's last Alpha record is #43 (11d8408).

Already closed by the digests' own verdicts (no further work): azig/18 on zigchain-1 and zig-test-2; the decoy denom and its description; the Cosmos Hub channel pair (channel-1555 ↔ channel-4) and ATOM's ibc hash; gov/mint/distribution/slashing parameters; CosmWasm whitelist shape; CosmJS 0.38.1 authz/gov amino limits; the relay's model list and limits; pricing.ts matches the live Claude pricing page; Noble wind-down dates; MoonPay/Transak/Mercuryo/Coinbase exclusions with the exact doc lines; Reown CSP list (none marked optional).

Owner decisions the plan must present as explicit items (collected from the gaps): Checklist definition (G02); mainnet read path and C4 (G04); WalletConnect scope and licence (G06); gas steps (G09); stZIG value rule (G10); mainnet signing exceptions per message type and build mode (G11); on-ramp build-now-disabled vs wait (G16); DefiLlama (G23); Bitcoin xpub (G26); memo attestations (G29); ZIGi staking pre-fill (G32); Day Timeline storage, Stories threshold, share-card money facts (G34); logo use (G21); next MARKET_POLICY period before 2026-10-31T16:00Z (G27).

Registry note: the seven per-track verified_links lists overlap (e.g. the chain-registry files, api.zigchain.com, Keplr registry) with differing 'checked' formats; the plan's single registry should dedupe them and keep one 'checked' stamp per URL, excluding hashed zig.finance asset URLs (they change on rebuild) and the x.com/zigchain vs @ZIGFinance pair until G20 is closed.

## Contradictions found between tracks

- R4 summary says zig-test-2 is not in Keplr's registry and stays a suggested chain; R4 LB1 and R5 LB8 verdicts prove it IS there as cosmos/zig-test.json (rest testnet-api.zigchain.com, gas 2.5e9/2.5e10/5e10). Consequence: the app's experimentalSuggestChain is a no-op for most Keplr users and Keplr's gas steps (average 25,000,000,000) win over the app's (2,500,000,000 / 4,000,000,000). The plan must follow the verdicts.
- R4 recommends browser-direct reads on every chain and explicitly 'no pass-through route'; R5 and docs/PRIVACY.md L55 want the relay so LCD operators never see IP + address; B2: the CSP today allows only the two testnet hosts and the public build refuses mainnet through /api/positions (C4); R5: api.zigchain.com answers 403 to OPTIONS preflights, so the pinned-height header pattern cannot run browser-direct there. Owner decision (gap G04).
- R2 states 1 stZIG = 1.072841 ZIG (reverse_st_zig_price read with DefiLlama's 6-decimal interpretation) as live data; ADR-009 §3 (B1, B2) and R5 say no stZIG:ZIG value may be computed until Valdora documents the query units (fields are still named uzig_amount/stzig_amount). Gap G10.
- OroSwap fee: docs say '1% default fee' (R2, R3) while the on-chain factory config lists the ATOM/ZIG pool's pair_type xyk at 1 bps and the router simulation returned commission 0.0341 ZIG on 341.46 ZIG (≈0.01%). Resolution: quote the pool's own tier from the factory config and mark the docs figure stale.
- R4's open question says the WalletConnect sign-client licence 'could not be retrieved' (raw paths 404); R4 LB8 verdict retrieved it at raw.githubusercontent.com/WalletConnect/walletconnect-monorepo/v2.0/LICENSE.md — the WalletConnect Community License (20 Aug 2025) with the same 500 MAU / 2.5 M RPC thresholds as Reown's. The 'lighter' sign-client path is not licence-lighter.
- R4 LB7's 'wc-client 29,952 B gzip' was measured on @walletconnect/client (deprecated v1, latest 1.8.0), not on @keplr-wallet/wc-client 0.13.41; the figure must be dropped and re-measured (gap G07).
- R3 summary says 'Bybit EU has no ZIGUSDT' and concludes the EU exchange route is weak; R3 LB10 verdict shows Bybit EU lists ZIGUSDC (status Trading, min order 5 USDC) — Bybit EU has no USDT pairs at all. The route description must change; the withdrawal network stays unknown (gap G17).
- R3 LB6 claims Criptan Trade S.L. serves Mercuryo's EEA users via ESMA's register; the register contains the string 'mercuryo' zero times — that relationship needs its own source (Mercuryo is excluded anyway).
- R6 proposal #5 (Dutch on-device answers via Chrome's model) vs R6 LB5 verdict: the Prompt API accepts only en, ja, es, de, fr as of 2026-08-26; the proposal is infeasible as written (gap G31).
- R6 numbers corrected by its own verdicts: ACTION_KINDS = 81 (not 85); per-turn cost ranges mixed 'tools' and 'tools, page records' modes (Sonnet 0.0064–0.0082 in page-records mode); ChatGPT 'dots' are not Pro-only (Business Premium in all regions, Enterprise/Edu beta). The ZIGi section must carry the corrected values.
- R7 summary says Strava's Year in Sport and most of Month in Sport are subscriber-only and lists 'recaps' as a paid feature cluster; R7 LB11 verdict: Month in Sport itself is free (reduced Totals card), only Trophy Case, Social Competition and the full Totals card are subscriber-only; the Year in Sport support page is 404 and the subscriber-only claim rests on a community thread ('reported').
- B1 says STATUS reads 'Session AE not merged, not deployed — ask the owner'; B2's live header (x-zigoals-build 4f9249561736fbe19305b426de82f5c91a24763d, re-read by this critic) proves AE is merged and live. Alpha #44 exists and is unrecorded (gap G03).
- R5 LB14 claim placed MAINNET_REFUSED in apps/web/lib/position-reader.ts; the verdict shows the refusal is server-side in apps/web/app/api/positions/route.ts (403 MAINNET_NOT_ON_PUBLIC_ALPHA for PUBLIC_ALPHA_UNDEPLOYED/TESTNET_DEPLOYED) and LOCAL_DEMO still reads mainnet via READ_NETWORKS.MAINNET_READ_ONLY → api.zigchain.com.
- R5 option 'Goal Vaults' promises signed single-message steps on testnet 'behind FINANCIAL_EXECUTION_ALLOWED'; B2 shows that flag is true only for NEXT_PUBLIC_APP_ENVIRONMENT=TESTNET_DEPLOYED while the live Alpha builds PUBLIC_ALPHA_UNDEPLOYED — on the deployed Alpha no signed step is reachable without a build-mode or ADR change (gap G11).
- Testnet unbonding: cosmos/chain-registry testnet file and the docs source say 604,800 s (7 days) and Valdora's testnet ledgers carry unbonding_period 604800; both live nodes answer 1,814,400 s (21 days). Every testnet receipt timeline in the plan is 21 days; the registry/docs are stale.
- ZIGChain's own registry (zigchain-registry assets/native/zig.mainnet.json, pushed 2026-10-15) and CoinGecko's platform entry say uzig / 6 decimals; the live chain's bank metadata, staking, mint and gov params say azig / 18 on both networks, with uzig retained only as legacy IBC escrow. The chain is authoritative; the same-symbol decoy (coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig, 'ZIG', exponent 6) forces base-denom matching.
- R3's Banxa deep-link template said blockchain=<Banxa network code for Cosmos; label 'Cosmos'/'ATOM'>; the LB4 verdict fixes it: the Network code is ATOM (Cosmos is the Name column). Use blockchain=ATOM.
- R1 LB13 'ZIG 2.0 monthly buybacks from 1 July 2026' vs the paper: the buyback entity is ZIG Markets, the roadmap says 'July 1' with no year, and the Foundation's 100 M on the same schedule was omitted. Plan wording must follow the corrected claim.
- R2 LB4 says 'all six listed public LCDs' come from ZIGChain/networks api-nodes.txt; the verdict shows that file lists five — lcd-zigchain.keplr.app is a Keplr-operated endpoint outside the official list. The link registry must attribute it to Keplr's registry.

## Gaps

| Id | Priority | Gap | Why it matters | Closes with |
|---|---|---|---|---|
| G01 | must | Owner request ledger has no source: the owner's verbatim Session AF prompt (the 'six seeds', the three features, 'the Checklist', 'the reset', the testnet-first relaxation) appears in no digest; R6, R7 and B1 only refer to it indirectly, and B1 shows the task's 'owner items A1–A10' labels do not exist on origin/main. | The plan's first required section cannot be written as a ledger (request → where answered) without the request text; every later section cites it. | Ask the orchestrator to paste the owner's Session AF prompt verbatim into the plan input. Format precedent: git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/product/OWNER_UI_REQUESTS_AB.md \| head -40 |
| G02 | must | 'The Checklist' is undefined: R6, R7 and B3 all report zero 'checklist' hits under apps/web/{app,components,lib} on origin/main, yet R6 proposals 1–3 and R7's Day Timeline/Universe/Stories reference it. | Three ZIGi proposals and two of the three R7 features need its record key, write function and location before any golden case, timeline block or storage plan can be specified. | Owner question: 'Is the Checklist a new Session AF record (a per-day ordered list on Today fed by habits/meals/fasting/reminders) or an existing feature under another name? Name its record key, its write function and where it lives.' |
| G03 | must | Alpha deploy #44 is unrecorded: the live Alpha serves x-zigoals-build 4f9249561736fbe19305b426de82f5c91a24763d (B2 at 2026-10-18T18:46:28Z; re-read by this critic at ~20:50+02:00 with curl -I https://alpha.zigoals.app/app), but docs/STATUS.md tops with 'PR #89, not merged, not deployed' and its last Alpha record is #43 (11d8408, 2026-10-17). | The AF STATUS entry and Release identity lines must sit on top of a correct '# Alpha deploy #44 — <date>, 4f92495 live' record; B1 says 'ask the owner', B2 proves it is live. | gh run list --repo reyals1111-ux/ZIGoals --workflow 'Manual Alpha deployment' --limit 3 --json headSha,createdAt,url,conclusion (read-only); record date, sha and run URL as Alpha #44, or ask the owner for the run URL. |
| G04 | must | Mainnet browser reads have no decided host or path: R5 confirms api.zigchain.com answers 403 to OPTIONS preflights (so the ADR-009 pinned-height pattern with x-cosmos-block-height cannot run browser-direct there) and only tested that one host; today's egress-policy.json chainOrigins are the two testnet hosts only; the public build refuses mainnet via /api/positions (C4). | Goal Vaults, the validator picker, governance and linked-address balances on mainnet all depend on this; the exact CSP connect-src and the server-route list cannot be written until it is settled. | for h in testnet-api.zigchain.com zigchain-api.polkachu.com public-zigchain-lcd.numia.xyz api.zigchain.nodestake.org lcd-zigchain.keplr.app; do curl -s -m 20 -o /dev/null -w "$h %{http_code}\n" -X OPTIONS -H 'Origin: https://zigoals.app' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: x-cosmos-block-height' https://$h/cosmos/staking/v1beta1/params; done — then owner decision: relay (/api/positions, lift C4 for linked addresses) or browser-direct to a non-Cloudflare LCD. |
| G05 | must | The staking rate shown would be a derivation, not a published number: 5.743% gross = annual_provisions ÷ bonded_tokens (R2 LB2); no Hub/Keplr/docs APR was readable (403), and R2's open question notes a possible non-standard reward path ('dynamic inflation rate' in the delegator FAQ, a 'Reward Contract' in the audits repo). | Non-negotiable 'honest live numbers with source and as-of'; a wrong formula would misstate every Goal Vault projection/illustration and the Earn coach's rates tool. | Measure real accrual: H1=$(curl -s https://zigchain-api.polkachu.com/cosmos/base/tendermint/v1beta1/blocks/latest \| grep -o '"height":"[0-9]*"' \| head -1); read https://zigchain-api.polkachu.com/cosmos/distribution/v1beta1/delegators/zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx/rewards with -H "x-cosmos-block-height: $H" at H and H-10000, take the two block timestamps from /blocks/{H}, extrapolate to a year over the 100,000 ZIG self-bond and compare with 5.743%×(1−0.02)×(1−commission). Also: curl -s https://api.github.com/repos/ZIGChain/audits/contents/ \| grep -i reward. Owner reads the APR shown at https://hub.zigchain.com/staking in a browser. |
| G06 | must | WalletConnect/Reown scope is an unmade owner decision: 'no new dependencies without owner approval', both @walletconnect/sign-client 2.26.0 and @reown/appkit 1.8.24 carry Community Licenses (500 MAU / 2.5M RPC per month, distribution-notice duties, R4 LB8 verdict), a public project ID ships in the bundle, ~20 CSP hosts are documented, and a QR encoder would be a further dependency. | The wallet matrix's phone column, the dependencies table (version + gzip + why + lazy), the CSP directives and PRIVACY.md all branch on this. | Owner question with three options: (a) sign-client + @keplr-wallet/wc-client + QR encoder (licence: https://raw.githubusercontent.com/WalletConnect/walletconnect-monorepo/v2.0/LICENSE.md), (b) no relay — Keplr/MetaMask/Trust in-app-browser deep links and typed addresses only (zero deps, no project ID), (c) AppKit. Record the answer in ADR-028. |
| G07 | must | If G06 = (a): gzip sizes are missing or wrong for the lighter path — the '29,952 B wc-client' figure was measured on the deprecated @walletconnect/client v1 (R4 LB7 verdict), @keplr-wallet/wc-client 0.13.41 and @keplr-wallet/wc-qrcode-modal have no size or (for the modal) no version, and no QR encoder was named. | The dependencies table requires version + gzip for every entry; /app/staking has 45.6 kB headroom and sign-client alone is 118,178 B gzip. | curl -s 'https://bundlephobia.com/api/size?package=@keplr-wallet/wc-client@0.13.41' (on 429 use https://deno.bundlejs.com/?q=@keplr-wallet/wc-client@0.13.41); curl -s https://registry.npmjs.org/@keplr-wallet%2Fwc-qrcode-modal/latest \| python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["version"],d.get("license"))' then its size; curl -s 'https://bundlephobia.com/api/size?package=qrcode@1.5.4'. |
| G08 | should | Keplr Mobile is untested: the https://deeplink.keplr.app/web-browser?url= form is not shown in Keplr's docs (only keplrwallet:// and intent:// examples, R4 LB4 verdict); whether Keplr Mobile's browser injects window.keplr, whether enable('zig-test-2') works there (zig-test.json has hideInUI null) and whether a fresh Keplr profile is prompted to add zigchain-1 on enable() alone are all open. | The wallet matrix's phone row and the Goal Vaults connect step on phones are unverified; CI uses mocked wallets, so only a manual owner check can close this. | Owner, on a phone with Keplr Mobile: open keplrwallet://web-browser?url=alpha.zigoals.app/app (iOS) and https://deeplink.keplr.app/web-browser?url=alpha.zigoals.app/app, tap 'Connect Keplr', report whether an address appears; then in a fresh desktop Keplr profile, trigger Connect and report whether ZIGChain is offered without a suggest-chain prompt. |
| G09 | must | Gas-step conflict with a hidden no-op: the app's keplrChainInfo() (packages/chain-config/src/index.ts L176-180) suggests average 2,500,000,000 / high 4,000,000,000 azig, the Keplr registry files for both networks say 25,000,000,000 / 50,000,000,000; because zig-test-2 is already in Keplr's registry, experimentalSuggestChain 'does nothing' for most users and the registry's values win, while the fee CosmJS puts in the transaction comes from testnet.json gasPrice 2500000000. | Signed staking/vote steps could be built with a fee that Keplr re-estimates differently from what the review screen shows; the owner's own testnet transfer paid 25,000,000,000 azig/gas. | git -C /Users/AIUSER/Documents/ZIGoals-Claude grep -n -E 'calculateFee\|GasPrice\|gasPrice' origin/main -- 'apps/web/lib/wallet.ts' 'packages/chain-config/src' ; then owner decision: align the app's steps and fee to the registry's average (25,000,000,000) or keep the minimum (2,500,000,000) and label it. |
| G10 | must | stZIG value rule is contradicted between tracks: R2 computes 1 stZIG = 1.0728 ZIG from reverse_st_zig_price using DefiLlama's 6-decimal reading, while ADR-009 §3 (B1, B2) and R5 say count stZIG units only until Valdora documents the query units; the field names are still uzig_amount/stzig_amount and Valdora's email answer is pending. | Determines whether a stZIG goal shows a ZIG value at all; a wrong exponent is a 10^12 error. | curl -s https://docs.valdora.finance/smart-contracts \| /usr/bin/grep -n -i -E 'st_zig_price\|reverse_st_zig_price\|uzig_amount\|stzig_amount' (documented units now?) ; otherwise owner decision: stZIG units only, or accept on-chain bank metadata (stZIG exponent 6, azig exponent 18) + the DefiLlama adapter as sufficient documentation, recorded in ADR-028 superseding ADR-009 §3. |
| G11 | must | Mainnet signing and execution gates are not yet mapped to decisions: ADR-004 refuses mainnet signing unconditionally, FINANCIAL_EXECUTION_ALLOWED is true only for TESTNET_DEPLOYED while the Alpha builds PUBLIC_ALPHA_UNDEPLOYED (B2, R5 LB14), EARN principle 6 and ADR-009 §6 say testnet first, MANUAL_ALPHA_WORKFLOW says 'Financial signing and broadcasts remain disabled'. R5 also wants a non-financial exception for MsgVote (and a 1-azig memo send). | Without one ADR-028 line per superseded sentence and per message type, no signed step (MsgDelegate/Undelegate/Redelegate/WithdrawReward/Vote/MsgSend) is reachable on the live Alpha; the Tier 3 commit list depends on it. | git -C /Users/AIUSER/Documents/ZIGoals-Claude grep -n -E 'mainnet\|TESTNET_DEPLOYED\|FINANCIAL_EXECUTION\|signing' origin/main -- 'docs/architecture/ADR-004*' docs/architecture/ADR-009-earn-architecture.md docs/earn/EARN_DESIGN.md apps/web/lib/app-environment.ts docs/deployment/MANUAL_ALPHA_WORKFLOW.md — then owner yes/no per message type and per build mode (PUBLIC_ALPHA_UNDEPLOYED vs TESTNET_DEPLOYED). |
| G12 | must | PRIVACY.md text is missing and today's wording contradicts AF: docs/PRIVACY.md L79 says of linked wallets 'no balance is looked up for a linked address and linking makes no request of its own', L55 scopes RPC/REST disclosure to the Keplr-connected account, and L105-106 list the third parties; the wallet-guard test forbids fetch( in wallet files (B2). | The plan requires PRIVACY.md text; balance reads for linked addresses on ZIGChain/EVM/Solana/BTC endpoints (publicnode 24 h retention, mempool.space 10-day logs, ZIGChain LCD operators unknown) change those three passages and must land in the same TIER 3 (public-safety labels) commit. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/PRIVACY.md \| sed -n '53,57p;77,80p;103,112p' and draft replacements naming each endpoint and its retention; git show origin/main:apps/web/lib/wallet-guard.test.ts \| /usr/bin/grep -n -E 'fetch\|sign' to place the reads outside the guarded files. |
| G13 | should | On-ramp handoff under the live headers is unverified: the Alpha sends Referrer-Policy: no-referrer and Cross-Origin-Opener-Policy: same-origin (read ~20:50+02:00); it is unknown whether Ramp's hostApiKey or Banxa's partner subdomain validate Referer/Origin (R3 open question), and Ramp's required hostLogoUrl has no chosen public URL. | If either provider binds the public key to a referrer, every handoff from ZIGoals would arrive referrer-less and be refused; the owner's account checklist cannot say which URL goes where. | Question to (an e-mail address on the provider's page) and to Banxa onboarding: 'Does the hosted/referral checkout validate the Referer or Origin header? Our pages send Referrer-Policy: no-referrer.' For the logo: git -C /Users/AIUSER/Documents/ZIGoals-Claude ls-tree -r --name-only origin/main apps/web/public \| /usr/bin/grep -E '\.(png\|svg)$' \| head, then curl -s -I https://alpha.zigoals.app/<chosen file>. |
| G14 | should | Ramp parameter names and the Cosmos asset id are inferred: enabledCryptoAssets/outAsset/defaultFlow names and 'COSMOS_ATOM' come from a pattern, and whether userAddress accepts a cosmos1 address for ATOM was not checked. | The deep link in the plan would be wrong on the first live click. | curl -s https://docs.rampnetwork.com/configuration \| /usr/bin/grep -o -E '(swapAsset\|defaultAsset\|enabledCryptoAssets\|outAsset\|inAsset\|defaultFlow\|enabledFlows\|finalUrl\|selectedCountryCode\|userAddress)' \| sort -u ; curl -s 'https://api.rampnetwork.com/api/host-api/v3/assets?currencyCode=EUR' \| python3 -c "import sys,json;print([a for a in json.load(sys.stdin)['assets'] if a['symbol']=='ATOM'])" (look for an id/apiV3Symbol field); final check by the owner in https://app.demo.rampnetwork.com with the staging key. |
| G15 | should | Banxa: the referral parameter is returnUrl while API/iframe pages say redirectUrl (R3 open question), and the blockchain code is 'ATOM' not 'COSMOS' (LB4 verdict) — the plan's URL template must use the verdict. | A wrong return parameter strands the person on Banxa after checkout. | curl -s https://docs.banxa.com/products/hosted-checkout/docs/referral-integration/supported-parameters.md \| /usr/bin/grep -n -i -E 'returnUrl\|redirectUrl\|blockchain' ; confirm in the sandbox once the partnerRef exists (owner). |
| G16 | must | The on-ramp legal gate is an owner decision not yet taken: Ramp's authorisation is service c only (no transfer service j), plus the MiCA/FSMA/UCPD/wallet-address-in-URL questions in docs/earn/ONRAMP_OPTIONS.md remain open; the plan must say whether the two links ship disabled behind the empty-by-default config or wait. | Decides whether Part 'on-ramps' is code this session or copy only. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/earn/ONRAMP_OPTIONS.md \| /usr/bin/grep -n -i -E 'lawyer\|legal\|MiCA\|FSMA\|UCPD\|personal data' ; owner question: 'Build Ramp/Banxa links now, hidden until the config holds a key (yes/no)?' |
| G17 | should | EU exchange route is partly unknown: Bybit EU does list ZIG (ZIGUSDC, Trading — LB10 verdict corrects the summary) but its withdrawal networks need an API key; Gate EU and Kraken networks unverified. | The 'Get ZIG' assistant must state for EU residents whether any MiCA-authorised venue withdraws native ZIG; today only KuCoin global is proven. | curl -s 'https://api.bybit.eu/v5/asset/coin/query-info?coin=ZIG' (if 401, owner reads the ZIG withdraw page on bybit.eu in a browser); owner opens gate.com/en-eu ZIG withdrawal networks; otherwise write 'unknown' per venue. |
| G18 | should | Hub deep links are unverified: validators/detail/?address=<valoper> (seen only on a third-party page) and the proposal-detail URL pattern on hub.zigchain.com and zigscan could not be read (403 Cloudflare). | Goal Vaults and the governance hub link out to them; a wrong pattern sends people to a 404. | Owner opens https://hub.zigchain.com/validators/detail/?address=zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl and https://hub.zigchain.com/proposals/ → proposal 43 in a browser and copies the final URLs; fallback already proven: https://explorer.nodestake.org/zigchain/gov/43 (route table in its bundle). |
| G19 | should | The explorer registry covers zig-test-2 only: packages/ecosystem-registry/src/links.ts has range and zigscan entries with chainId 'zig-test-2' and testnet.zigscan.org prefixes; mainnet tx/address/validator/proposal patterns exist only in R1 LB11, and the chain registry uses www.zigscan.org while R1 uses zigscan.org. | Non-negotiable 'one verified link registry' and every mainnet receipt/validator link. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:packages/ecosystem-registry/src/links.ts \| sed -n '40,95p' ; add zigchain-1 entries from R1 LB11 and probe one of each: curl -s -o /dev/null -w '%{http_code}\n' https://zigscan.org/validators/zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl |
| G20 | should | Official X handle unresolved for the link registry: zig.finance links x.com/zigchain (2 occurrences) while the rebrand post's author is @ZIGFinance. | The registry may hold one social link; a dead or parked handle can be taken over. | Owner opens https://x.com/zigchain in a browser and notes whether it redirects to /ZIGFinance; the registry keeps that one. |
| G21 | should | No licence for any ZIG logo: zig.finance's ToS grants no trademark licence, its asset URLs are hashed Astro files, and the chain-registry/Keplr-registry PNG/SVG licences were not read. | Showing a ZIG mark in the app without a licence is a brand risk; text-only is the safe default. | curl -s https://raw.githubusercontent.com/cosmos/chain-registry/master/LICENSE \| head -5 ; curl -s https://api.github.com/repos/ZIGChain/zigchain-registry/license ; owner decision: mark or text. |
| G22 | should | Live-data samples are missing for endpoints the build renders: the bonded validators list (commission, jailed, tokens, description shape), signing_infos, unbonding_delegations, a gov v1 proposal body (summary/metadata) and a DefiLlama yields pool entry were listed but not sampled. | Plan requirement 'endpoint/query + sample' and the zod schemas for the relay. | for p in 'staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1' 'slashing/v1beta1/signing_infos?pagination.limit=1' 'staking/v1beta1/delegators/zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx/unbonding_delegations' 'gov/v1/proposals/43'; do curl -s "https://api.zigchain.com/cosmos/$p" \| head -c 1500; echo; done ; curl -s https://yields.llama.fi/pools \| python3 -c "import sys,json;print([p for p in json.load(sys.stdin)['data'] if p['chain']=='ZIGChain'])" |
| G23 | should | DefiLlama use is undecided: R2 proposes api.llama.fi / yields.llama.fi (CORS *) for TVL/APY, which is a third-party number and either a new connect-src origin (Tier 3) or a server relay; /protocol and yields returned no cache-control header. | Changes the CSP directives, the server-route list and the 'source + as-of' label on every TVL/APY figure. | Owner decision (show third-party TVL/APY at all?); if yes: curl -s -D - -o /dev/null https://yields.llama.fi/pools \| /usr/bin/grep -i -E 'cache-control\|^age:' and add the origin to egress-policy.json csp.app.connect or to a relay with its own cache. |
| G24 | should | CORS for POST JSON-RPC was never exercised and the wrong Solana host was probed (api.mainnet.solana.com instead of the official api.mainnet-beta.solana.com); EVM/Solana balance reads are POSTs with content-type: application/json, which preflight. | A browser-direct EVM/Solana balance read fails silently if the preflight is refused. | for u in https://api.mainnet-beta.solana.com https://solana-rpc.publicnode.com https://ethereum-rpc.publicnode.com; do curl -s -m 20 -D - -o /dev/null -X OPTIONS -H 'Origin: https://zigoals.app' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' $u \| /usr/bin/grep -i -E '^HTTP\|access-control'; done |
| G25 | should | BNB Smart Chain USDC: Circle lists no USDC on chain 56 (R4 LB12 verdict), so any BNB 'USDC' address in the raw notes is a bridged/pegged token of unverified provenance. | A wrong contract address reads the wrong balance. | Drop BNB USDC from the token table, or label it 'Binance-Peg USDC (not Circle)' with the address taken from curl -s https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/tokenlist.json \| /usr/bin/grep -B4 -A4 '"symbol": "USDC"' |
| G26 | should | Bitcoin xpub watch needs a new dependency (@scure/bip32 2.4.0, MIT, size unknown) plus client-side gap-limit scanning because mempool.space has no xpub endpoint; the owner has not chosen between xpub and single addresses. | New dependency rule and the wallet matrix's Bitcoin row. | Owner yes/no; if yes: curl -s 'https://bundlephobia.com/api/size?package=@scure/bip32@2.4.0' |
| G27 | should | The market coordinator's MARKET_POLICY window ends 2026-10-31T16:00Z (B2, live /api/market-status); after it every price is refused until the owner installs the next policy, and AF's real-balance fiat display (ADR-027 G16 hook) depends on prices. | A fiat column that goes 'unavailable' two weeks after shipping unless the owner acts. | curl -s https://alpha.zigoals.app/api/market-status ; owner action per git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/run11/ALPHA_PRICES_ROLLOUT.md \| /usr/bin/grep -n -A8 'Next policy period' |
| G28 | nice | Weight plan assumption to confirm: scripts/check-weight-budget.mjs sums only the <script src> tags in each page's HTML (L19-21), so a chunk loaded by dynamic import on click is not counted; whether Next 16 emits a <script src> or only modulepreload for route-level lazy chunks was not checked. | Decides whether a 118 kB WalletConnect chunk or a canvas Universe can be 'lazy' under the 45.6 kB (/app/staking) and 51.0 kB (/app) headroom. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:scripts/check-weight-budget.mjs \| sed -n '15,35p' ; in the build phase: node scripts/check-weight-budget.mjs http://127.0.0.1:3100 --json before and after adding a dynamic import. |
| G29 | should | Memo attestations (R5 option 5) need an owner privacy review before any opt-in: address, time and memo are public forever; proposal is a salted commitment or opaque badge id on testnet only; 'nothing personal on-chain' is a non-negotiable. | Owner decision gates whether the feature is designed only or shipped opt-in. | Owner question: 'Allow an opt-in 1-azig self-send with a salted-commitment memo on testnet this session (yes/no/design only)?' |
| G30 | nice | Counts quoted in R6 are off: ACTION_KINDS is 81 (not 85, LB1 verdict); the golden-set size is '~352' from a grep vs 272 in docs; the ChatGPT 'dots' availability and the Sonnet/Opus cost ranges were corrected in verdicts. | The ZIGi feature list and the real-model baseline table must carry the corrected numbers. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:apps/web/lib/ai/actions/schema.ts \| sed -n '235,244p' \| grep -o -E "'[a-z0-9-]+'" \| wc -l ; gh run view --repo reyals1111-ux/ZIGoals <latest ci run id> --log \| /usr/bin/grep 'ZIGi golden set' for the true golden count. |
| G31 | must | R6 proposal #5 'Dutch on-device answers' cannot use Chrome's Prompt API: the API accepts only en, ja, es, de, fr (docs last updated 2026-08-26, LB5 verdict), and ON_DEVICE_OPTIONS asks for 'en' only. | The proposal as written is infeasible; it must be re-scoped to Dutch rules in the deterministic lookup engine or to the person's own model. | Plan edit; evidence: curl -s https://developer.chrome.com/docs/ai/prompt-api \| /usr/bin/grep -o -E 'accepts "en"[^.]*\.' |
| G32 | should | The Earn coach (R6 proposal 4) has no rates source and its 'pre-fill the staking review' card is a policy change: ZIGI_ACTIONS_Z says stake/unstake/claim/sign 'no (never automatic)' and the intent REFUSE regex declines those verbs (LB12 verdict). | Without G05 (APR source) the tool cannot be specified; without an owner decision the card cannot be added. | Owner question: 'May ZIGi pre-fill (never submit) the staking review form as a new PREFILL_KIND, recorded in ADR-028 and ZIGI_ACTIONS_Z?'; the tool spec follows G05. |
| G33 | should | R7 LB12 (Finch's core free forever / Plus is cosmetics) is 'unreachable' at the primary source (Cloudflare 403, no Wayback snapshot) and rests on third-party reviews. | It is the cited precedent for keeping My Universe free; the competitor scan must label it 'reported' or verify it. | Owner opens https://help.finchcare.com/hc/en-us/articles/37780200600589-Benefits-of-Finch-Plus in a browser and confirms the sentence about core features being free. |
| G34 | should | Three R7 design decisions are the owner's and unmade: a per-habit clock time/duration for the Day Timeline is a Tier 3 synced-schema change (habitSchema is strict; HH:MM lives only in device reminders) plus a non-drag move method; the minimum data for a 'year' Story; which money facts may appear on share cards (LC§3: no returns or prices). | Each changes storage (frozen readers), accessibility rules or public-safety wording. | Three owner questions: (1) 'Add habit.time/duration to the synced strict schema this session, or v1 at section level with drag only for items that already carry HH:MM?' (2) 'Minimum days before a year Story shows?' (3) 'Which money facts, if any, may appear on a Universe/Story card?' |
| G35 | should | The dedicated testnet wallet's CosmWasm upload whitelisting is 'acknowledged, never confirmed' (R5), which gates every contract-dependent option (pacts, escrow). | Decides whether any contract plan can even be tested this session. | A=$(git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/deployment/TESTNET.md \| /usr/bin/grep -o -E 'zig1[a-z0-9]{38}' \| head -1); curl -s https://testnet-api.zigchain.com/cosmwasm/wasm/v1/codes/params \| /usr/bin/grep -c "$A" |
| G36 | nice | Supply/tokenomics figures disagree across sources (paper 1,726,440,444 circulating at mainnet; CoinGecko 1,408,940,791 / max 2.0 B; chain 2,337,754,283.86 total; retirement wallet 46.58 M vs 'Retired to Date' 41.06 M) and the 'USD1 PayFi vault' and 'new tokenomics' headlines have no primary source. | 'Never invent' — the plan must show only the on-chain supply with its endpoint and mark the rest unknown. | Use only curl -s 'https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=azig' with its as-of; write 'circulating: unavailable — no on-chain figure' for the rest. |
| G37 | should | Solana read-only linking needs a Wallet Standard listener: @wallet-standard/app would be a new dependency (none installed; EIP-6963 is hand-rolled in apps/web/lib/wallet-link.ts L86-88) and its version was not stated (only '1.1 kB gzip'). | New dependency rule; alternatively hand-roll the two events ('wallet-standard:app-ready' / 'wallet-standard:register-wallet') in the same style as EIP-6963. | curl -s https://registry.npmjs.org/@wallet-standard%2Fapp/latest \| python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["version"],d.get("license"))' ; owner decision: dependency or hand-rolled listener. |
| G38 | should | Testnet faucet mechanics are unknown (403 Cloudflare; docs source from March 2026): amount per claim, captcha, wallet-connect requirement, whether it pays azig after v5. | The owner's account checklist needs a working way to fund the testnet wallet for the signed-step receipts. | git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:docs/deployment/TESTNET.md \| /usr/bin/grep -n -i faucet ; owner opens https://faucet.zigchain.com/ in a browser once and records amount/captcha/cooldown. |
| G39 | should | The 'ecosystem apps' map lacks ZIG Finance's own directory: zig.finance/ecosystem returned 200 but its listed apps were not digested; R2's list comes from DefiLlama. | Non-negotiable wording 'ecosystem apps' should match what ZIG Finance itself lists; the link registry needs those URLs. | curl -s https://zig.finance/ecosystem \| /usr/bin/grep -o -E 'href="https?://[^"]+"' \| sort -u |
| G40 | nice | IBC transfer time Cosmos Hub → ZIGChain (channel-1555 → channel-4) was not measured; the 'Get ZIG' route step shows 'unknown'. | Consumer wording of the three-step route ('minutes' vs 'unknown'). | curl -s 'https://zigchain-api.polkachu.com/cosmos/tx/v1beta1/txs?query=recv_packet.packet_dst_channel%3D%27channel-4%27&order_by=ORDER_BY_DESC&limit=1' → take packet_sequence and timestamp; then curl -s 'https://rest.cosmos.directory/cosmoshub/cosmos/tx/v1beta1/txs?query=send_packet.packet_src_channel%3D%27channel-1555%27%20AND%20send_packet.packet_sequence%3D%27<seq>%27' and subtract the timestamps. |
| G41 | nice | The non-negotiable 'one-time motion' is ambiguous in the requirement text (one celebration animation per milestone? a single-PR motion?). | It gates how My Universe milestones and Stories animate. | Owner question: 'What does one-time motion mean here — an animation that plays once per milestone and never on reload, or something else?' |

## GAP G01

The owner's verbatim Session AF prompt exists and is on the orchestrator's own disk — it is not in the repository and not in any digest. It arrived as the first user message of this session (2026-10-18T18:27:44Z), wrapped as `<pasted_content id="d264">`, 46,983 characters / 7,394 words / 198 lines, recorded verbatim in the session transcript `/Users/AIUSER/.claude/projects/-Users-AIUSER-Documents-ZIGoals-Claude/1f1a37d0-095e-4785-8558-ce3b8df11086.jsonl` (line index 2, role user, sha256 of the pasted text `7ed72828…72ba3e`). The orchestrator therefore does not need to ask anyone to paste it: it is already in the plan input (message 1 of this session) and the ledger can be written from it directly. The next phase can also materialise it as `docs/product/OWNER_UI_REQUESTS_AF.md` following the precedent `docs/product/OWNER_UI_REQUESTS_AB.md` on origin/main (header: session name, branch, ADR, "recorded verbatim at plan approval on <date>", then the owner's numbered parts).

What the prompt actually says, for the labels the gap named. (1) "Six seeds": the phrase "six seeds" does not occur verbatim; the owner's PART 8 ("BIG ZIGi UPDATE: AT LEAST 3 NEW FEATURES … ready for the real-model round after the weekly reset") lists six numbered seeds under "Main chat's seeds (Phase R confirms, ranks and may replace…; build at least 3 fully)": 1 Daily Briefing + Evening Recap, 2 ZIGi Memory, 3 Plans (agent mode), 4 Earn coach, 5 Checklist by voice and text, 6 Page awareness (prompt lines 136–142). (2) "The three features": PART 9 "THREE EXTRA FEATURES WITH HEAVY USER-EXPERIENCE IMPACT": 1 "My Universe", 2 "Day Timeline", 3 "Stories" (lines 145–149); R7 asks Phase R to "confirm or replace … with evidence; the plan proposes 3 + 2 alternates" (line 53). (3) "The Checklist": PART 7 — "CHECKLIST": THE NEW THIRD LAUNCHER AND A STAND-ALONE-QUALITY DAILY APP (owner: "amaze me again with this feature") (lines 120–133). (4) "The reset": two distinct meanings — the owner's weekly usage reset ("The PR must be out of Draft with CI green by Sun 25 Oct 11:00 Brussels (the weekly reset is 13:00)", line 6; the ZIGi real-model round "after the weekly reset", lines 51, 135, 143, 193) and the Checklist's "Daily reset at the person's day start (local midnight by default…)" (line 126). (5) The testnet-first relaxation: under "OWNER RULE CHANGES FOR THIS SESSION (owner-approved 2026-10-18; each is a TIER 3 commit where it touches code)" (line 25): "Testnet first" is relaxed for NATIVE ZIGChain staking only — practice stake on zig-test-2 with real wallet signing, real mainnet zigchain-1 delegate/undelegate/redelegate/claim-rewards; everything else (Valdora, OroSwap, Zignaly, …) by guided link-outs, no in-app signing for third-party contracts (line 26). Three more rule changes follow: new dependencies only if named with version/gzip size/why/lazy-load (line 27), no existing budget raised, each NEW route +10 % in one commit "Owner-approved budgets for new routes" (line 28), legal handled by the owner's lawyer — no "ask your lawyer" gates (line 29).

On B1's point that "owner items A1–A10" do not exist on origin/main: confirmed and explained. origin/main `docs/STATUS.md` Session AE "## Owner items" (line 75) is eight unlabelled bullets. The A-labels are coined by the owner's prompt itself: PART 11 "LEFTOVERS FROM SESSIONS AC–AE (owner items A1–A4, A6–A10; A6–A9 are in Part 10)" (line 163) defines A1 (STATUS records #44), A2 (verifier: the two 503 "not configured" answers as review items), A3 (verifier: aborted prefetches not findings), A4 (account-sync race, ADR-027 G24), A10 (security notes: goal-extras v2 reader/guard; recipe-import DNS-rebinding) explicitly (lines 164–168); A5 is never defined anywhere in the prompt; A6–A9 are said to be in Part 10 but Part 10's ten items carry no A-labels, so the A6–A9 ↔ Part 10 mapping is the owner's and must be asked or stated as an assumption (H-row in ADR-028). The ledger should cite the prompt by its line index in the pasted text (0-based as extracted here) until the docs file exists.

The orchestrator's current plan file (`/Users/AIUSER/.claude/plans/pasted-content-id-d264-owner-approved-s-swift-hippo.md`, 921 lines) already has a "## 2. Owner request ledger" with S/N/O/R/PC/P rows using "the owner's words, shortened" — it is a derived paraphrase, not the source; the verbatim source is the transcript message above.

# GAP G01 — Owner request ledger source: the verbatim Session AF prompt

Read-only gap fill, 2026-10-18 ~21:25–21:32 Brussels. Nothing written, nothing fetched from the web (not needed).

## 1. Result in one line
The owner's Session AF prompt is NOT in the repo and NOT in any digest, but it IS the first user message of this very session, stored verbatim in the Claude Code transcript on the owner's Mac. The ledger can be written from it now; no paste request is needed.

## 2. Where it is

| Item | Value |
|---|---|
| File | `/Users/AIUSER/.claude/projects/-Users-AIUSER-Documents-ZIGoals-Claude/1f1a37d0-095e-4785-8558-ce3b8df11086.jsonl` (4,089,048 bytes at 21:26) |
| JSON line index | 2 (third line; `sed -n 3p`) |
| Record | `type: user`, `uuid f12e8d57-9a69-4dd2-90d5-a940789c2c71`, `timestamp 2026-10-18T18:27:44.251Z` (= 20:27:44 Brussels), `cwd /Users/AIUSER/Documents/ZIGoals-Claude`, `gitBranch feature/session-ab-design`, `version 2.1.299` |
| Wrapper | `<pasted_content id="d264">` … `</pasted_content id="d264">` (the whole message is the paste; 2 chars before it) |
| Size | 46,983 chars, 7,394 words, 198 lines (0-based line indexes below) |
| sha256 (pasted text, between the tags) | `7ed728280170db00c8a257cd5cf15979a462b88e7a6ae8358235cfa75f72ba3e` |

No other transcript in that project directory contains "Session AF", "six seeds" or "Wealth, unlocked" (checked every `*.jsonl`; only this session's file hits, 116 times — the prompt plus the helpers' task texts).

Secondary (derived, not source): `/Users/AIUSER/.claude/plans/pasted-content-id-d264-owner-approved-s-swift-hippo.md` (193,437 bytes, 921 lines, mtime 21:20) — the orchestrator's Phase R plan; its `## 2. Owner request ledger` already has rows S1–S10, N1–N12, O1–O3, R…, PC1–PC4, P0.x–P11.x, columns "Request (owner's words, shortened) → Part → Acceptance → Proof". Its intro says "the leftovers A1–A10".

## 3. Not on origin/main (sha 4f9249561736fbe19305b426de82f5c91a24763d)

- `git grep -n -i -E "six seeds|Session AF|testnet-first|owner items A1|A1[–-]A10" origin/main` → only `docs/strategy/FEATURE_GAP_MATRIX.md:175` (Session N "testnet-first earn design") and `docs/strategy/README.md:80` — unrelated.
- `git ls-tree origin/main docs/product` → `OWNER_UI_REQUESTS_AB.md` exists; no `_AF`, `_AC`, `_AD`, `_AE` variant.
- `docs/STATUS.md` line 1: Session AE entry; line 75 `## Owner items` = 8 unlabelled bullets (Leap/Cosmostation ended G15; practice money never in fiat G16; on-ramps Banxa first, Ramp fallback; G22 kept items incl. the rail's 64 px lane wrap; hero slogan boxes touch 4–5 px at 768/1920; G24 sync race; sandbox-only failures; carried items: real-model round, DMARC 28 Oct, market policy 31 Oct, private-sync redeploy, Inter/Customize). This is what B1 saw: no A-labels anywhere on main.
- `docs/handoff/AE_RESUME.md` has no "next session"/AF text.

## 4. Format precedent (origin/main:docs/product/OWNER_UI_REQUESTS_AB.md, head)

```
# Owner UI requests — Session AB-Design ("The giant UI upgrade: one premium 4-in-1 app")

The owner's request list for Session AB-Design (branch `feature/session-ab-design`, ADR-024), recorded verbatim at plan
approval on 2026-10-13 so the session, the PR and the second merger can be checked against it. Live when the session
opened: Alpha #39 = `main` `6c1052b`. The owner's screenshots (…) are the visual brief; they are not committed.

## Honesty and keep-everything rules
…
## PART 1 — Global shell and the "finished product" look (highest priority)
1. …
…
*Owner edit at approval:* … / *Decided at approval (D2):* …
```
Shape for AF: `docs/product/OWNER_REQUESTS_AF.md` (or `OWNER_UI_REQUESTS_AF.md` for symmetry), header naming branch `feature/session-af-wealth-unlocked`, ADR-028, "recorded verbatim at plan approval on 2026-10-18", live Alpha #44 = `main` `4f92495`; then the prompt's own sections verbatim; owner amendments at approval in italics.

## 5. Outline of the pasted prompt (0-based line index → heading, abbreviated)

| Line | Heading |
|---|---|
| 1 | OWNER-APPROVED SETUP (git pull main; branch `feature/session-af-wealth-unlocked`; PLAN MODE until one plan approved, then never ask; read CLAUDE.md, AGENTS.md, STATUS newest first; follow rules unless changed under "Owner rule changes") |
| 3 | THIS IS SESSION AF — "WEALTH, UNLOCKED": THE BIGGEST UPGRADE ZIGOALS HAS EVER HAD |
| 4–7 | Local session on the owner's MacBook; PHASE R (Fable 5.1, Ultracode, plan mode; ~2 h research; plan by 22:45 Brussels Sun 18 Oct); PHASE B (Opus 5.5, effort Extra; PR out of Draft with CI green by Sun 25 Oct 11:00 Brussels, "the weekly reset is 13:00"; Gate C by Sat 24 Oct 08:00; NO pre-cut, NO lean mode unless owner message "lean finish"); "Make it count, amaze me." |
| 10–23 | 0. NON-NEGOTIABLES 1–12 (consumer first; private by design; non-custodial; honest numbers LIVE with "as of" or "unknown"; risks in plain words; "ecosystem apps" never "partners"; one verified link registry; no secrets; agents never deploy/approve/log in to Cloudflare; motion one-time by default; additive; agents never touch a real wallet — mocked wallets only) |
| 25–29 | OWNER RULE CHANGES FOR THIS SESSION (owner-approved 2026-10-18; TIER 3 commits where they touch code): testnet-first relaxed for NATIVE staking only (26); new dependencies only if named with version/gzip/why/lazy (27); budgets not raised, each NEW route measured +10 % in one commit "Owner-approved budgets for new routes" (28); legal handled by the owner's lawyer, no gates (29) |
| 32–63 | 1. PHASE R — RESEARCH: R1…R7 (R5 on-chain purpose with seeds "Goal Vaults", governance hub…; R6 ZIGi deep dive, ≥5 features, build ≥3, no paid API calls, "real-model test round comes after the next weekly reset"; R7 competitor gap scan, confirm/replace Part 9's three, propose 3 + 2 alternates) |
| 65 | 2. PHASE B — WHAT TO BUILD (all parts are musts) |
| 68 | PART 0 — Records and setup |
| 72 | PART 1 — THE EARN HUB (highest priority) |
| 90 | PART 2 — NATIVE STAKING THAT REALLY WORKS (TIER 3 wallet/signing) |
| 98 | PART 3 — WALLETS: REAL CONNECTIONS AND TRACKING EVERYWHERE (TIER 3) |
| 104 | PART 4 — TWO FIAT ON-RAMPS, FULLY INTEGRATED |
| 109 | PART 5 — THE EARN DOCK |
| 113 | PART 6 — ZIGOALS ON-CHAIN (from R5; TIER 3) |
| 120–133 | PART 7 — "CHECKLIST": THE NEW THIRD LAUNCHER AND A STAND-ALONE-QUALITY DAILY APP (owner: "amaze me again with this feature"); 125 streak fairness + "Perfect orbit"; 126 daily reset at day start (local midnight default), history heatmap; 127 corner quick timers Sleep/Meditate/Fast/Focus |
| 135–143 | PART 8 — BIG ZIGi UPDATE: AT LEAST 3 NEW FEATURES … ready for the real-model round after the weekly reset; 136 "Main chat's seeds (Phase R confirms, ranks and may replace…; build at least 3 fully)"; 137–142 the six seeds; 143 golden EN/NL cases, mocked model, no paid calls, test plan for the round "after the reset" |
| 145–149 | PART 9 — THREE EXTRA FEATURES WITH HEAVY USER-EXPERIENCE IMPACT: 1 "My Universe", 2 "Day Timeline", 3 "Stories" |
| 151–161 | PART 10 — UI CHANGES THE OWNER ASKED FOR (1 sidebar sky scroll-linked; 2 LIGHT MODE REDO; 3 Dark kept, black star background; 4 remove "Saved on device"; 5 footer finale line; 6 hero slogan spacing; 7 Today repeats; 8 Wealth chip row wrap at 1440; 9 AE kept-on-purpose items now changed; 10 FINAL THEME PARITY POLISH) |
| 163–170 | PART 11 — LEFTOVERS FROM SESSIONS AC–AE (owner items A1–A4, A6–A10; A6–A9 are in Part 10): A1 STATUS records #44; A2 verifier 503 "not configured" answers; A3 verifier aborted prefetches; A4 account-sync race G24 (TIER 3 sync); A10 security notes (goal-extras v2 reader/guard; recipe-import DNS rebinding); + verifier stages for Earn hub and Checklist, origin allowlist (TIER 3); + `scripts/earn/live-check.mjs` |
| 172 | PART 12 — Words and help |
| 176 | 3. HOW YOU WORK |
| 192–195 | LAST COMMIT AND REPORT: STATUS entry "Session AF — Wealth, unlocked" with the owner request ledger (done / not done + why), Tier 3 in plain words, tests/assertions, weights, CI, owner items, deferred list ("after the 25 Oct reset, before 31 Oct"…); PR out of Draft, never merged/deployed; short report incl. preview steps for the Earn hub, a practice stake, the Checklist, ZIGi's new features and the three extra features |

## 6. The six seeds verbatim (Part 8, lines 137–142, abbreviated at 260 chars)
1. Daily Briefing + Evening Recap: a proactive morning plan (today's dots, habits due, meals planned, timers, goals that need a step, earning summary from linked wallets) and an evening recap, as a card, in the chat and read aloud on request.
2. ZIGi Memory: a device-only, opt-in memory of preferences and context ("I train in the morning", "I prefer low-commission validators"), visible and editable in Settings ("What ZIGi knows"), forgettable item by item, included in Export, never synced without c[onsent]…
3. Plans (agent mode): "set me up for a 10k", "plan my week", "start me on staking" → ZIGi proposes ONE reviewable bundle (habits, goals and steps, checklist favourites, reminders, an Earn path) with per-item accept, using the existing device-record registry; …
4. Earn coach: explains every earning option using the LIVE data from Part 1, answers "what is APR / unbonding / impermanent loss", walks the Start-here path, pre-fills the staking review (never signs).
5. Checklist by voice and text: "mark push-ups done", "add read 5 pages to my checklist", "start my sleep timer".
6. Page awareness: ZIGi knows which page and card the person is looking at ("explain this card").

Note: the literal phrase "six seeds" never occurs; "seed(s)" occurs on lines 14, 19 (seed phrases — the security sense), 49, 51, 75, 86, 136.

## 7. Key-phrase index (line numbers in the pasted text)
- "Testnet first" / testnet-first: 26 (rule change), 49 (R5 context).
- "the Checklist": 75, 125, 127, 169, 195; "Checklist": 28, 75, 111, 122, 125, 127, 131, 141, 148, 169, 179, 181, 195.
- "reset": 6 (weekly reset 13:00), 51 (real-model round after the next weekly reset), 126 (Checklist daily reset), 135 (Part 8 heading), 143 (test plan for the round after the reset), 193 (deferred list: after the 25 Oct reset, before 31 Oct).
- "three extra": 53 (R7), 195 (report).
- "Owner rule changes": 1 (reference), block at 25–29.
- A-labels: `\bA1\b` on 163, 164; `\bA[5-9]\b` only on 163 (A6, A6, A9). A5 never defined. A2 165, A3 166, A4 167, A10 168.

## 8. Rule-change block verbatim (lines 25–29, abbreviated)
- 25: OWNER RULE CHANGES FOR THIS SESSION (owner-approved 2026-10-18; each is a TIER 3 commit where it touches code):
- 26: "Testnet first" is relaxed for NATIVE ZIGChain staking only: (a) a PRACTICE stake on testnet zig-test-2 with real wallet signing, and (b) REAL mainnet (zigchain-1) delegate / undelegate / redelegate / claim-rewards to ZIGChain validators, signed by the person in their own wallet. Everything else (Valdora, OroSwap, Zignaly and any other ecosystem app) is reached through guided link-outs to the app's own site; in-app signing for third-party contracts is NOT built this session.
- 27: New dependencies: allowed only if the approved plan names each package, its version, its gzip size, why the existing stack (CosmJS 0.38.1, raw EIP-6963 / JSON-RPC, fetch) is not enough, and that it is lazy-loaded only on the pages that need it. Expected candidates: WalletConnect/Reown (mobile wallets), viem or a smaller JSON-RPC helper. The owner approves the list at plan review; nothing else gets added.
- 28: Weight budgets: existing budgets are not raised again. Each NEW route (Earn, Checklist, any new page) gets its own budget line set at its measured size + 10 %, rounded up to the next kB, in one labelled commit "Owner-approved budgets for new routes". Heavy pieces still load on demand.
- 29: Legal: the owner handles legal and regulatory questions with his lawyer; do NOT block, stall or add "ask your lawyer" gates. Product honesty rules (non-negotiables 4–6) still apply in full.

## 9. Extraction recipe (read-only, for the next phase)
```
F=~/.claude/projects/-Users-AIUSER-Documents-ZIGoals-Claude/1f1a37d0-095e-4785-8558-ce3b8df11086.jsonl
sed -n 3p "$F" | /usr/bin/python3 -I -c '
import json,sys
d=json.loads(sys.stdin.read()); t=d["message"]["content"]
t=t if isinstance(t,str) else "".join(x.get("text","") for x in t if x.get("type")=="text")
p=t.split("<pasted_content id=\"d264\">",1)[1].rsplit("</pasted_content",1)[0]
sys.stdout.write(p)'
```
Pipe to a file only in Phase B (plan mode forbids writes now). Verify `wc -c` = 46983 and the sha256 above before committing it as the docs file.

## 10. What the ledger can cite until the doc exists
Cite `owner prompt d264 L<n>` with the 0-based line numbers above; switch to `docs/product/OWNER_UI_REQUESTS_AF.md#…` once Part 0 commits it. The AB precedent marks owner amendments at approval in italics — reserve the same for whatever the owner changes at 22:45.

## 11. Residual uncertainty
See open_questions: A5 undefined; A6–A9 ↔ Part 10 mapping unstated; whether the owner wants the verbatim doc committed; the transcript is the only copy; amendments at approval not yet known.

## GAP G02

Answer: "The Checklist" does not exist on origin/main under any name. It is not an existing feature under another name; it can only be a NEW Session AF record, and its key, write function and location are the owner's to name. R6/R7 referenced a thing the codebase never defined.

Evidence (all read via git at origin/main sha 4f9249561736fbe19305b426de82f5c91a24763d, 2026-10-18 ~20:40+02:00):
1. `git grep -n -i -E "checklist" origin/main -- apps/web/app apps/web/components apps/web/lib` returns zero lines. The same search across every remote branch's apps/web code dirs also returns zero. The only "checklist" strings in the whole tree are owner/test/legal/deploy checklists in docs (WHOLE_LIFE_W.md "Owner test checklist", ZIGI_ALIVE_X.md "The iPhone checklist", LEGAL_CHECKLIST.md, OWNER_TESTNET_CHECKLIST.md, STATUS.md rows) — none is a product feature.
2. No doc on origin/main mentions "Session AF", "R6", "R7", "Day Timeline" or "golden case" as a product spec; the R6/R7 proposals are not in the repository, so the term has no canonical definition anywhere readable.
3. The complete record-key inventory (`zigoals:<name>:v1` literals under apps/web/lib and components, ~50 unique keys) contains no checklist/todo/agenda/day-plan key. The nearest existing per-day structures are: `zigoals:routine-run:v1` (lib/routines/run-schema.ts — one running habit stack: headId, day, step, done[], skipped[]; device-only, stale across days), `zigoals:today-cards:v1` (lib/today-cards/store.ts — an ordered list of up to 24 card ids chosen for Today, device-only), and `zigoals:reminders-plan:v1` (lib/reminders-plan/schema.ts — reminder kinds with on/time). None is "a per-day ordered list on Today fed by habits/meals/fasting/reminders". Today's "due now" view (components/dashboard/today-focus.tsx) is explicitly a read-only aggregation: "Every figure is read from the same stores the rest of Today reads; nothing is stored here."
4. If the Checklist is new, the codebase fixes most of its shape already: ADR-022 B1 forbids any new field in the strict synced records (habits v3, health v4, settings v3); every post-Session-V record is a device-only, loose, versioned zod record (`DeviceRecordSpec` in lib/device-record.ts; written only through `updateDeviceRecord(storage, spec, change)` or the `useDeviceRecord(SPEC).update(change)` hook); its key constant belongs in an import-free key module (pattern lib/aa-device-keys.ts, lib/w-device-keys.ts) and, if it is to sync as an extras section, in `EXTRAS_DEVICE_KEYS` (lib/vault/extras-keys.ts) with the matching section test.

Owner question to put in the plan, now sharpened: "The Checklist is not in the code. Is it a new Session AF device record (per-day ordered list on Today fed by habits, meals, fasting and reminders), or did you mean an existing surface such as Today's focus block, the routine player, Today cards, or the reminders plan? If new: confirm the key `zigoals:checklist:v1` (or name another), that it is device-only and loose per ADR-022 B1, whether it joins the extras sync sections, and whether its items are derived each day from the source records (no write function; a pure engine like lib/ai/tools/today.ts) or persisted with their own order and done-state (an `updateDeviceRecord` writer beside a `lib/checklist/` schema)."

Until the owner answers, no golden case, timeline block or storage plan can cite a record key, and R6 proposals 1–3 and R7 Day Timeline/Universe/Stories must be marked blocked on this answer.

# GAP G02 — "The Checklist" (Session AF, Phase R)

Read-only research on the owner's Mac, 2026-10-18 20:36–20:45 +02:00. Every repo read was through git at `origin/main` = `4f9249561736fbe19305b426de82f5c91a24763d`. No web sources were needed; no files written.

## Question
R6 proposals 1–3 and R7's Day Timeline / Universe / Stories reference "the Checklist", but R6, R7 and B3 all report zero `checklist` hits under `apps/web/{app,components,lib}`. Is it an existing feature under another name, or a new Session AF record? What is its record key, write function and location?

## Verdict
**Not an existing feature under any name.** Nothing in the code, tests or product docs defines a user-facing Checklist. If Session AF needs one, it is a new record, and only the owner can name it. The codebase does already fix its *shape* (device-only, loose, versioned, written through `updateDeviceRecord`).

## Searches run (all origin/main)

| # | Command (abbreviated) | Result |
|---|---|---|
| 1 | `git grep -n -i -E checklist origin/main -- apps/web/app apps/web/components apps/web/lib` | **0 lines** |
| 2 | same regex, same dirs, across every `origin/*` branch | **0 lines** |
| 3 | `git grep -n -i -l -E checklist origin/main` (whole tree) | 60 files, all docs: README, STATUS, RUN_*_REPORT, ADRs, `docs/business/LEGAL_CHECKLIST.md`, `docs/deployment/{OWNER_TESTNET,PUBLIC_ALPHA}_CHECKLIST.md`, `docs/product/WHOLE_LIFE_W.md` (L1 "owner guide and test checklist", L61 "## Owner test checklist"), `docs/product/ZIGI_ALIVE_X.md` (L196 "## The iPhone checklist"), `docs/run10/REQUIREMENTS.md` (UX-05, MOB-06 "route/state checklist", "per-device checklist") |
| 4 | `git grep -n -i -l -E "session af\|day timeline\|golden case\|R6.*propos" origin/main` | only unrelated hits (`lib/ai/actions/parse.ts`, `local-answers/engine.ts`, ADR-017/020/023, STATUS) — none about Session AF or a Checklist |
| 5 | `git grep -i -E checklist origin/main -- apps/web/tests apps/web/public packages` | 0 |
| 6 | `git grep -i -E "ordered list\|day plan\|daily plan\|to-do\|todo list" origin/main -- docs/architecture docs/product docs/STATUS.md` | 0 |

Conclusion from 1–6: every "checklist" in the repository is an owner/test/legal/deploy checklist (a document), never a product record.

## Record-key inventory (origin/main, `apps/web/lib` + `apps/web/components`)
`git grep -h -o -E "['\"]zigoals:[a-z0-9-]+:v[0-9]+['\"]" … | sort | uniq -c` — ~50 unique keys. Most referenced: `zigoals:habits:v1` (30+3), `zigoals:platform:v1` (29), `zigoals:health:v1` (24), `zigoals:goal-extras:v1` (14), `zigoals:settings:v1` (9), `zigoals:calculator:v1` (9), `zigoals:today-cards:v1` (7), `zigoals:life-review:v1` (7), `zigoals:health-coach:v1`, `habit-extras`, `average-goals`, `local-ledger`, `search-recent`, `micro-targets`, `health-vitamins`, `aisles`, `zigi`, `routine-run`, `private-updates`, `motion`, `measurements-custom`, `macro-mode`, `game`, `vault-sync`, `ui-prefs`, `reminders-plan`, `public-market-quotes`, `layout`, `extras-sync-choice`, `zigi-voice`, `zigi-suggestions`, `zigi-cards`, `whats-new`, `wallet-reconnect-hint`, `w-reminders`, `sync-offer`, `restore-undo`, `push`, `public-market-insights`, `progress-photos`, `pages-view`, `onboarding`, `onboarding-setup`, `music`, `milestone-dates`, `meditation-run`, `linked-wallets`, `import-batches`. Also AI keys in `lib/ai/store/keys.ts`: `zigoals:ai-options:v1`, `ai-usage`, `ai-memory`, `ai-actions`, `zigi`, `zigi-reminders`, `zigi-knock`.

**No key named checklist, todo, agenda, day-plan or similar.**

## Nearest existing structures (and why none is the Checklist)

### `zigoals:routine-run:v1` — `apps/web/lib/routines/run-schema.ts`
```ts
export const routineRunSchema = z.looseObject({
  version: z.literal(1), headId, day: /^\d{4}-\d{2}-\d{2}$/, step: int 0..100,
  startedAt, stepStartedAt, done: string[] ≤100, skipped: string[] ≤100 });
export const routineRunStoreSchema = z.looseObject({version: 1, run: routineRunSchema.nullable()});
export const ROUTINE_RUN: DeviceRecordSpec<RoutineRunStore> = {key: ROUTINE_RUN_KEY, schema, empty};
```
H5: one habit stack being played step by step on this device; a run from another day reads as none. `lib/routines/engine.ts`: steps are the stack chain (`lib/habits-v2/stacks.ts`), check-ins go through the habit journal's own mutators from the player. It is per-day and ordered, but it is one habit stack, not a list across habits/meals/fasting/reminders.

### `zigoals:today-cards:v1` — `apps/web/lib/today-cards/store.ts`
```ts
export const TODAY_CARDS_KEY = 'zigoals:today-cards:v1';
export const TODAY_CARD_IDS = ['balance','forecasts','calculator','review'] as const;
export const todayCardsSchema = z.looseObject({version: z.literal(1), cards: z.array(z.string().regex(/^[a-z][a-z0-9-]{0,39}$/)).max(24)});
export const TODAY_CARDS: DeviceRecordSpec<TodayCards> = {key, schema, empty};
export function toggleCard(state, id): TodayCards  // append at end or remove; unknown ids kept
```
An ordered list of which cards sit on Today, device-only (Session AA-Cloud Part 8, TIER 3 storage). Not per-day, not fed by records.

### `zigoals:reminders-plan:v1` — `apps/web/lib/reminders-plan/schema.ts`, page `components/reminders/reminders-plan.tsx`
Reminder kinds (`PLAN_KINDS`: bedtime, weekly review, fast end, goal check-in…) each with `on`/`time`, plus quiet hours; `setPlanItem`, `setQuietHours`; read through `useDeviceRecord(REMINDERS_PLAN)`. Settings, not a daily list. Page copy: "A reminder is a card on Today (and ZIGi may knock)."

### Today's focus block — `components/dashboard/today-focus.tsx` (106 lines)
Docblock (Session AA-Cloud Part 1): "what is due now, in one place right under the hero … Every figure is read from the same stores the rest of Today reads; **nothing is stored here**." Reads `useHabits`, `useHealth`, `useFasting`, reminders (prop), next goal. Named slots `today:habit-time`, `today:coach`.

### ZIGi tool `today_summary` — `lib/ai/tools/today.ts`
Pure derivation of habits scheduled/done/open, goals planned in 7 days, Health diary energy/water/steps and whether a fast is running. Shows how a "derived per-day list" is already computed from engines without a record.

### Other Today pieces seen
`components/dashboard/today-dashboard.tsx` (284 lines; lazy `TodayDeviceCards`, `MakeToday`, `TodayGameCards`, reads `TODAY_CARDS` via `useDeviceRecord`), `make-today.tsx` (preset chooser), `pin-to-today.tsx` (writes a widget into `zigoals:settings:v1` via `usePrivateStore` + `saveWidget`), `components/use-local-today.ts` (local date refresh), `health/fasting-timeline.tsx`, `reminders/reminder-cards.tsx`.

## Where a new Checklist would have to live (the codebase's own rules)

- **ADR-022 B1** (`docs/architecture/ADR-022-session-aa-local.md` L43): "No new field ever enters a strict synced record (`habits` v3, `health` v4, `settings` v3): every new state" is a device-only loose versioned record. `lib/private-storage.ts` L8 throws "Unknown private data store." for any key other than `zigoals:habits:v1`, `health:v1`, `platform:v1`, `settings:v1`.
- **Record contract** `apps/web/lib/device-record.ts`:
  ```ts
  export type DeviceRecordSpec<T> = {key: string; schema: z.ZodType<T>; empty: () => T};
  export function readDeviceRecord<T>(storage, spec): {data: T; unreadable: boolean}   // missing or bad bytes → empty, never rewritten
  export function updateDeviceRecord<T>(storage, spec, change: (current: T) => T): T  // schema.parse(change(current)) then setItem, or throws
  ```
  Hook form: `useDeviceRecord(SPEC)` (`components/ai/use-device-record.ts`) → `{loaded, unreadable, data, update(change)}`.
- **Key registry**: import-free key modules — `lib/aa-device-keys.ts` (ROUTINE_RUN_KEY, MICRO_TARGETS_KEY, REMINDERS_PLAN_KEY …, plus `AA_PERSONAL_KEYS` used by the "new device" check and Export everything), pattern of `lib/w-device-keys.ts`.
- **Extras sync**: `lib/vault/extras-keys.ts` `EXTRAS_DEVICE_KEYS` (15 keys: goal-extras, average-goals, calculator, life-review, today-cards, reminders-plan, habit-extras, routine-run, game, health-coach, micro-targets, macro-mode, aisles, measurements-custom, health-vitamins); `lib/vault/extras-sections.test.ts` keeps it equal to the sections' keys. A synced Checklist needs a section there.
- **Showcase/account scoping**: keys go through `getAppStorage()` (`lib/showcase-storage.ts`: `zigoals:showcase:v1:` prefix, `zigoals:account:v1:<account>:` namespace).

## Proposed owner question (sharpened)
"The Checklist is not in the code. Is it (a) a new Session AF device record — a per-day ordered list on Today fed by habits, meals (Health diary), fasting and reminders — or (b) an existing surface you meant: Today's focus block, the routine player, Today cards, or the reminders plan? If (a): confirm key `zigoals:checklist:v1`, device-only and loose per ADR-022 B1, whether it joins `EXTRAS_DEVICE_KEYS`, and whether items are derived fresh each day (pure engine, no writer) or persisted with their own order and done state (`updateDeviceRecord` writer in a new `lib/checklist/`)."

## Dependencies blocked until answered
R6 proposals 1–3 (golden cases need a record key and a write function to assert on); R7 Day Timeline (its blocks need a source record), Universe and Stories (storage plan). R7 feature three, and B3, unaffected.

## Not done / limits
- R6, R7 and B3 texts are not on origin/main and were not read; their Checklist semantics come only from the gap statement.
- The working tree (old branch, 212 behind) was not consulted per instructions.
- No web sources were required for this gap.

## GAP G03

Gap G03 is closed with evidence: Alpha deploy #44 happened on 2026-10-18 and is live, but docs/STATUS.md on origin/main still tops with Session AE "PR #89, not merged, not deployed" and its newest Alpha record is #43 (`11d8408`, 2026-10-17, lines 87–99). No owner question is needed; the Actions API and the live header give every field the record format uses except the owner-reported ones (Worker version ids, hosted-verifier result).

What the Actions API shows (read-only, `gh run list`/`gh run view`, 2026-10-18 ~19:30Z): the Manual Alpha deployment workflow's most recent run is run id 39121639375, run number 46, event workflow_dispatch, display title "Alpha 4f9249561736fbe19305b426de82f5c91a24763d dispatched by reyals1111-ux", headBranch `main`, headSha `4f9249561736fbe19305b426de82f5c91a24763d`, created 2026-10-18T11:02:37Z, updated 2026-10-18T11:25:05Z, conclusion success on attempt 1, jobs authorize/build/deploy all success (deploy completed 11:25:04Z). URL: https://github.com/reyals1111-ux/ZIGoals/actions/runs/39121639375. Run number 46 fits the established record note (run number runs two ahead of the Alpha count: run 45 was #43), so run 46 is Alpha #44.

CI on the source: Milestone quality run number 1024 (run id 39111652354) on `4f92495`, push to `main`, created 2026-10-18T08:29:42Z, success on attempt 1. URL: https://github.com/reyals1111-ux/ZIGoals/actions/runs/39111652354.

Source identity: `git log origin/main -1` is `4f9249561736fbe19305b426de82f5c91a24763d`, "Merge pull request #89 from reyals1111-ux/feature/session-ae-stunning", 2026-10-18 10:29:38 +0200. `gh pr view 89` reports state MERGED, mergedAt 2026-10-18T08:29:39Z, mergeCommit 4f92495. So Alpha #44 is "`main` after PR #89 (Merge #89, Session AE, 'Stunning, finished', ADR-027)" and the Session AE heading's "not merged, not deployed" is stale as well.

Live check: `curl -s -m 20 -I https://alpha.zigoals.app/app` at 2026-10-18T19:29:53Z returned HTTP/2 200, `date: Sun, 18 Oct 2026 19:29:54 GMT`, `x-zigoals-build: 4f9249561736fbe19305b426de82f5c91a24763d`. This confirms B2's reading.

What the next phase should write (on top of STATUS.md, above the Session AE entry, following the #43 record's shape): `# Alpha deploy #44 — 2026-10-18, \`4f92495\` live`; Source `4f9249561736fbe19305b426de82f5c91a24763d`, main after PR #89; CI Milestone quality #1024 (run 39111652354) success attempt 1, Actions API; Deployment Manual Alpha deployment run number 46 (run 39121639375), dispatched 2026-10-18 11:02:37 UTC from main, success attempt 1, Actions API; read-only check `x-zigoals-build: 4f92495…` at 19:29 UTC; What went live: Session AE (ADR-027) on top of AD (#43); Release identity: live #44, previous #43; Rollback floor stays #32 (unchanged in #43's record; nothing seen changes it); Record note: run number 46 is Alpha #44. The Session AE heading should change to "merged into `main` as `4f92495` and deployed as Alpha #44". Fields only the owner can supply (Alpha Worker version id, rollback version id, the hosted verifier's result, live-prices verification) must be left as "owner-reported: pending" rather than invented.

# GAP G03 — Alpha deploy #44 unrecorded (read-only research notes)

As of 2026-10-18T19:30Z (21:30 Brussels). All reads were read-only: `gh run list`/`gh run view`/`gh pr view` (GitHub Actions/PR API), `git show origin/main:docs/STATUS.md`, `git log origin/main`, `curl -I`. No files written, no dispatches.

## 1. The gap as observed in docs/STATUS.md on origin/main (4f92495)

- Line 1: `# Session AE — "Stunning, finished" (ADR-027, Parts 0–6, Gate C) (2026-10-17/18, [PR #89](https://github.com/reyals1111-ux/ZIGoals/pull/89), not merged, not deployed)`
- Line 87: `# Alpha deploy #43 — 2026-10-17, \`11d8408\` live` — the newest Alpha record.
- Line 96: `- **Release identity:** live #43, previous #42. **Rollback floor:** stays #32.`
- Line 99: `- **Record note:** run number 45 is Alpha #43 (the run number runs two ahead of the Alpha count).`
- No occurrence of `#44` in the file (grep over `Alpha deploy #4[0-9]` returned #43, #42, #41, #40 only).

Source: https://github.com/reyals1111-ux/ZIGoals/blob/4f9249561736fbe19305b426de82f5c91a24763d/docs/STATUS.md

## 2. Manual Alpha deployment runs (Actions API)

Command: `gh run list --repo reyals1111-ux/ZIGoals --workflow 'Manual Alpha deployment' --limit 5 --json headSha,createdAt,updatedAt,url,conclusion,status,event,displayTitle,databaseId`

| run id | run number | headSha | createdAt (UTC) | updatedAt (UTC) | conclusion | Alpha # |
|---|---|---|---|---|---|---|
| 39121639375 | 46 | 4f9249561736fbe19305b426de82f5c91a24763d | 2026-10-18T11:02:37Z | 2026-10-18T11:25:05Z | success | **#44 (unrecorded)** |
| 39038011811 | 45 | 11d8408280f4f7d5b32f12d17eeeaedd62b43b1f | 2026-10-17T13:47:28Z | 2026-10-17T13:56:34Z | success | #43 (recorded) |
| 38965380164 | — | 61204c3fb1e959763ecbe81ef402c76990ad1f14 | 2026-10-16T20:52:34Z | 2026-10-16T21:25:48Z | success | #42 (recorded) |
| 38726691677 | — | 9e41f0d14284657819e53a78c2515cf58a94db40 | 2026-10-15T11:20:59Z | 2026-10-15T12:06:46Z | success | #41 (recorded) |
| 38536440733 | — | 985720ee2fef2d2868fc0ef87a43d95d52dd0242 | 2026-10-14T08:37:36Z | 2026-10-14T10:43:58Z | success | #40 (recorded) |

Abbreviated JSON for the first row:
```json
{"conclusion":"success","createdAt":"2026-10-18T11:02:37Z","databaseId":39121639375,
 "displayTitle":"Alpha 4f9249561736fbe19305b426de82f5c91a24763d dispatched by reyals1111-ux",
 "event":"workflow_dispatch","headSha":"4f9249561736fbe19305b426de82f5c91a24763d",
 "status":"completed","updatedAt":"2026-10-18T11:25:05Z",
 "url":"https://github.com/reyals1111-ux/ZIGoals/actions/runs/39121639375"}
```

`gh run view 39121639375 --json number,attempt,conclusion,status,headBranch,headSha,createdAt,updatedAt,event,url`:
```json
{"attempt":1,"conclusion":"success","createdAt":"2026-10-18T11:02:37Z","event":"workflow_dispatch",
 "headBranch":"main","headSha":"4f9249561736fbe19305b426de82f5c91a24763d","number":46,
 "status":"completed","updatedAt":"2026-10-18T11:25:05Z",
 "url":"https://github.com/reyals1111-ux/ZIGoals/actions/runs/39121639375"}
```

Jobs of run 39121639375 (`--json jobs`):
| job | conclusion | startedAt | completedAt |
|---|---|---|---|
| authorize | success | 2026-10-18T11:02:40Z | 2026-10-18T11:02:56Z |
| build | success | 2026-10-18T11:02:58Z | 2026-10-18T11:11:51Z |
| deploy | success | 2026-10-18T11:23:41Z | 2026-10-18T11:25:04Z |

(The 11:11:51 → 11:23:41 gap between build and deploy is consistent with the `alpha` environment's owner approval wait; the approval event itself was not read.)

## 3. Milestone quality on main (Actions API)

Command: `gh run list --workflow 'Milestone quality' --branch main --limit 3 --json headSha,createdAt,url,conclusion,databaseId,attempt,number,event`

| run id | number | headSha | createdAt | event | attempt | conclusion |
|---|---|---|---|---|---|---|
| 39111652354 | 1024 | 4f92495… | 2026-10-18T08:29:42Z | push | 1 | success |
| 39033571400 | 995 | 11d8408… | 2026-10-17T12:42:09Z | push | 1 | success |
| 38953016185 | 980 | 61204c3… | 2026-10-16T19:11:04Z | push | 2 | success |

Row 2 matches STATUS.md's #43 record exactly ("Milestone quality #995 (run 39033571400) … success on attempt 1"), which validates reading #44's CI the same way.

Source: https://github.com/reyals1111-ux/ZIGoals/actions/runs/39111652354

## 4. Source identity of 4f92495

- `git log origin/main -1`: `4f9249561736fbe19305b426de82f5c91a24763d 2026-10-18 10:29:38 +0200 Merge pull request #89 from reyals1111-ux/feature/session-ae-stunning`
- Parents' tip commits on the branch: `d73b2a60` (STATUS and ADR-027 G23, 2026-10-18 04:45:20 +0000), `ed1d90f4` (Gate C WebKit seeds).
- `gh pr view 89 --json state,mergedAt,mergeCommit,title,headRefName`:
```json
{"headRefName":"feature/session-ae-stunning",
 "mergeCommit":{"oid":"4f9249561736fbe19305b426de82f5c91a24763d"},
 "mergedAt":"2026-10-18T08:29:39Z","state":"MERGED",
 "title":"Session AE — stunning, finished (ADR-027)"}
```
Source: https://github.com/reyals1111-ux/ZIGoals/pull/89

Timeline (UTC): PR #89 merged 08:29:39 → Milestone quality #1024 started 08:29:42 (success) → Manual Alpha deployment run 46 dispatched 11:02:37 → deploy job done 11:25:04 → B2 read `x-zigoals-build 4f92495` at 18:46:28 → this helper read the same at 19:29:53.

## 5. Live header (read-only)

`date -u` = 2026-10-18T19:29:53Z; `curl -s -m 20 -I https://alpha.zigoals.app/app`:
```
HTTP/2 200
date: Sun, 18 Oct 2026 19:29:54 GMT
x-zigoals-build: 4f9249561736fbe19305b426de82f5c91a24763d
cf-ray: a4c9f4560a74fb8f-AMS
```
Source: https://alpha.zigoals.app/app

## 6. Reference: the #43 record's exact shape (STATUS.md lines 87–99, origin/main)

```
# Alpha deploy #43 — 2026-10-17, `11d8408` live
Recorded by Session AE (2026-10-17).
- **Source:** `11d8408280f4f7d5b32f12d17eeeaedd62b43b1f`, `main` after [PR #88](…/pull/88) (Merge #88, Session AD, "The final look", ADR-026).
- **CI:** Milestone quality #995 ([run 39033571400](…)) on `11d8408` (push to `main`): success on attempt 1. Verified: Actions API.
- **Deployment:** Manual Alpha deployment, run number 45 ([run 39038011811](…)), dispatched 2026-10-17 13:47:28 UTC from `main`, exact source `11d8408`: success on attempt 1. Verified: Actions API.
- **Result:** `VERIFIED`; … Owner-reported.
- **Alpha Worker `zigoals-alpha`:** new version `5ee8241e-047f-4cf1-93d8-c688b4a71f29`; rollback `e3c6ba1c-14f9-4a9b-928b-e1bd57b3ce08` (#42). Owner-reported.
- **Owner's hosted verifier on #43** … Owner-reported; the cause verified in the code.
- **What went live:** Session AD (ADR-026) on top of AC (#42).
- **Release identity:** live #43, previous #42. **Rollback floor:** stays #32.
- **Record note:** run number 45 is Alpha #43 (the run number runs two ahead of the Alpha count).
```

## 7. Proposed Alpha #44 record (for the next phase to write; nothing written here)

```
# Alpha deploy #44 — 2026-10-18, `4f92495` live
Recorded by Session AF (2026-10-18).
- **Source:** `4f9249561736fbe19305b426de82f5c91a24763d`, `main` after [PR #89](https://github.com/reyals1111-ux/ZIGoals/pull/89) (Merge #89, Session AE, "Stunning, finished", ADR-027). Merged 2026-10-18 08:29:39 UTC.
- **CI:** Milestone quality #1024 ([run 39111652354](https://github.com/reyals1111-ux/ZIGoals/actions/runs/39111652354)) on `4f92495` (push to `main`): success on attempt 1. Verified: Actions API.
- **Deployment:** Manual Alpha deployment, run number 46 ([run 39121639375](https://github.com/reyals1111-ux/ZIGoals/actions/runs/39121639375)), dispatched 2026-10-18 11:02:37 UTC from `main`, exact source `4f92495`: success on attempt 1 (authorize, build, deploy; deploy finished 11:25:04 UTC). Verified: Actions API.
- **Read-only check by Session AF:** `curl -sI https://alpha.zigoals.app/app` on 2026-10-18 19:29 UTC returned `x-zigoals-build: 4f9249561736fbe19305b426de82f5c91a24763d` (HTTP 200; live, read-only). Also read at 18:46 UTC earlier in the session.
- **Result / Alpha Worker versions / hosted verifier / live prices:** owner-reported — pending (not visible to the helper; do not invent).
- **What went live:** Session AE (ADR-027) on top of AD (#43).
- **Release identity:** live #44, previous #43. **Rollback floor:** stays #32 (unchanged; owner to confirm).
- **Record note:** run number 46 is Alpha #44 (the run number runs two ahead of the Alpha count).
```
Also change the Session AE heading (line 1) from "not merged, not deployed" to "merged into `main` as `4f92495` and deployed as Alpha #44", matching the AB-Design Phase 2 / AC / AD headings' pattern.

## 8. What was NOT verified
- Alpha Worker version ids for #44 (owner's Cloudflare dashboard only).
- The hosted verifier's run on #44.
- Live prices / market policy period status on #44.
- The `alpha` environment approval event (not read; not needed for the record).

## GAP G04

Answer: settle mainnet reads on the relay, not browser-direct. The host is the one already pinned in lib/position-reader.ts, https://api.zigchain.com, reached only from the server route; the browser keeps talking to /api/positions (and any new /api/* chain routes), so CSP connect-src and egress-policy.json chainOrigins do not need a mainnet host at all. The owner decision reduces to lifting C4 for linked addresses on the existing relay.

Evidence (all probes 2026-10-18 19:30–19:33 UTC from the Mac, curl -s -m 20):

1. Browser-direct pinned reads are impossible on every official host, testnet included. OPTIONS with Access-Control-Request-Headers: x-cosmos-block-height returns 403 on api.zigchain.com AND testnet-api.zigchain.com (and zigchain-api.polkachu.com, zigchain-api.stakeandrelax.net). The same OPTIONS with no custom header, or with content-type, returns 200 on both ZIGChain hosts; with x-foo it is 403 again. So the Cloudflare front rejects any non-safelisted request header in the preflight, not this header specifically. The pinned-height pattern was therefore never browser-direct on testnet either: origin/main's browser code (readPublicPositions in lib/position-reader.ts) only calls /api/positions; the x-cosmos-block-height header is sent by lib/native-positions.ts from the server (through lib/server/positions-relay.ts) and by lib/earn/valdora/testnet.ts, which no page imports (ADR-009 §1). Nothing in the app sends that header from a browser today, so the G04 premise ("ADR-009 pattern cannot run browser-direct on mainnet") holds, but it already holds on testnet too.

2. The two hosts that answer OPTIONS 204 still cannot carry the pattern. public-zigchain-lcd.numia.xyz (Cloudflare, x-powered-by numia.xyz) and lcd-zigchain.keplr.app (nginx 1.24.0, non-Cloudflare) both return access-control-allow-origin: * and 204, but their access-control-allow-headers lists are fixed (numia: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-app-type; keplr: Authorization, DNT, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Range, Origin, Accept, X-CSRF-Token) and neither includes x-cosmos-block-height, so a browser would fail the preflight. None of the four LCDs tested sends access-control-expose-headers naming x-cosmos-block-height, so even a browser GET could not run native-positions.ts's height-equality check (it reads that response header and throws on mismatch). Keplr's node is also pruned: height latest-5 answers 200, latest-1000 answers 500 "version does not exist".

3. Server-side, api.zigchain.com is sound for pinned mainnet reads. With x-cosmos-block-height set to latest-5, -1000, -100000 and -1000000 (12043336) it answered 200 with grpc-metadata-x-cosmos-block-height echoing the pinned height and bond_denom azig, max_validators 14. Fallbacks with the same depth: public-zigchain-lcd.numia.xyz (200 at all four depths); zigchain-api.polkachu.com (200 to latest-100000, 500 at latest-1000000). api.zigchain.nodestake.org and zigchain-api.stakeandrelax.net are pruned (500 at latest-123 blocks); the suggested host lcd-zigchain.keplr.app is pruned; rest.zigchain.com does not resolve (000). All five mainnet REST hosts in the Cosmos chain-registry were covered.

4. A browser-direct alternative exists but is a different pattern: CometBFT RPC. rpc.zigchain.com, public-zigchain-rpc.numia.xyz and zigchain-rpc.polkachu.com all answer OPTIONS 204/200 with access-control-allow-origin: * and GET /abci_query?path="/cosmos.staking.v1beta1.Query/Params"&height=13043200 returns the pinned height in the JSON body (height "13043200") without any custom request header, so no preflight is needed and the pin is verifiable from the body. The cost: the value is base64 protobuf (ChYKBAiA324QDhgHIJBOKgRhemlnMgEw), so the browser would need protobuf decoding per query type (likely a new dependency, owner approval), and it would put https://rpc.zigchain.com in connect-src. Recorded as an option, not recommended for G04.

Recommendation for the plan: relay. Keep READ_NETWORKS.MAINNET_READ_ONLY.rest = https://api.zigchain.com, lift the C4 refusal in app/api/positions/route.ts for linked addresses (owner decision), and add any validator/governance/vault reads as further server routes reusing positions-relay's cache and limits. chainOrigins stays the two testnet hosts (or shrinks, separate decision); no mainnet host enters CSP.

# GAP G04 — Mainnet browser reads: host and path

Probes run from the owner's Mac, 2026-10-18 19:30–19:33 UTC (21:30–21:33 Brussels), `curl -s -m 20`, GET/HEAD/OPTIONS only. Repo read through `git show origin/main` (sha 4f9249561736fbe19305b426de82f5c91a24763d).

## 1. The suggested OPTIONS loop (plus api.zigchain.com as control)

```
curl -s -m 20 -o /dev/null -w \"$h %{http_code}\" -X OPTIONS \\
  -H 'Origin: https://zigoals.app' -H 'Access-Control-Request-Method: GET' \\
  -H 'Access-Control-Request-Headers: x-cosmos-block-height' \\
  https://$h/cosmos/staking/v1beta1/params
```

| host | OPTIONS | server header | notes |
|---|---|---|---|
| api.zigchain.com | 403 | cloudflare | x-frame-options: SAMEORIGIN on the 403 page |
| testnet-api.zigchain.com | 403 | cloudflare | same behaviour as mainnet |
| zigchain-api.polkachu.com | 403 | cloudflare | |
| public-zigchain-lcd.numia.xyz | 204 | cloudflare (x-powered-by numia.xyz) | ACAO * |
| api.zigchain.nodestake.org | 000 | — | no HTTP answer in 20 s; plain GET 200 |
| lcd-zigchain.keplr.app | 204 | nginx/1.24.0 (Ubuntu), via 1.1 Caddy | ACAO *; not in chain-registry |
| zigchain-api.stakeandrelax.net | 403 | nginx/1.31.6 | |
| rest.zigchain.com | 000 | — | does not resolve |

As of 2026-10-18T19:30:56Z.

## 2. Which header trips the 403 (ZIGChain hosts)

| host | ACRH absent | ACRH content-type | ACRH x-foo | ACRH x-cosmos-block-height | browser UA + header |
|---|---|---|---|---|---|
| testnet-api.zigchain.com | 200 | 200 | 403 | 403 | 403 |
| api.zigchain.com | 200 | 200 | 403 | 403 | 403 |
| zigchain-api.polkachu.com | 200 | — | — | 403 | 403 |

The OPTIONS 200 (no custom header) on api.zigchain.com carries only `access-control-allow-origin: *`. Any non-safelisted request header in the preflight is refused. As of 2026-10-18T19:32:47Z.

## 3. CORS detail of the two 204 hosts

numia (https://public-zigchain-lcd.numia.xyz):
```
access-control-allow-credentials: true
access-control-allow-headers: X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization,x-app-type
access-control-allow-methods: GET,OPTIONS,PATCH,DELETE,POST,PUT
access-control-allow-origin: *
access-control-max-age: 86400
```
keplr (https://lcd-zigchain.keplr.app):
```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, OPTIONS, PUT, DELETE, PATCH
access-control-allow-headers: Authorization, DNT, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Range, Origin, Accept, X-CSRF-Token
access-control-max-age: 1728000
access-control-expose-headers: Content-Length, Content-Range   (on GET)
```
Neither allow-headers list contains x-cosmos-block-height → a browser preflight carrying it fails even though the status is 204. No host tested (api.zigchain.com, numia, polkachu, testnet-api) sends `access-control-expose-headers` for the height header, so a browser cannot read `x-cosmos-block-height` / `grpc-metadata-x-cosmos-block-height` from the response. As of 2026-10-18T19:32:47Z.

## 4. Pinned-height retention (server-side GET, `x-cosmos-block-height: <H>`)

latest = 13043336 at 2026-10-18T19:32:24Z (from numia blocks/latest; same height from keplr at 19:31:06Z, block time 2026-10-18T19:31:06.688Z).

| host | latest-5 | latest-1000 | latest-100000 | latest-1000000 (12043336) |
|---|---|---|---|---|
| api.zigchain.com | 200 | 200 | 200 | 200 |
| public-zigchain-lcd.numia.xyz | 200 | 200 | 200 | 200 |
| zigchain-api.polkachu.com | 200 | 200 | 200 | 500 |
| lcd-zigchain.keplr.app | 200 | 500 | 500 | 500 |
| api.zigchain.nodestake.org | — | 500 at latest-123 | | |
| zigchain-api.stakeandrelax.net | — | 500 at latest-123 | | |

500 body shape: `{\"code\":2, \"message\":\"codespace sdk code 38: not found: failed to load state at height N; version mismatch on immutable IAVL tree; version does not exist. Version has either been pruned, or is for a future block height (latest height: ...)\", \"details\":[]}`. Height 1 and 100 answer 500 \"no commit info found\" on every host (genesis state not kept).

200 body (all hosts identical): `{\"params\":{\"unbonding_time\":\"1814400s\",\"max_validators\":14,\"max_entries\":7,\"historical_entries\":10000,\"bond_denom\":\"azig\",\"min_commission_rate\":\"0.000000000000000000\"}}` with `grpc-metadata-x-cosmos-block-height: <H>` echoed.

Testnet pinned GET (testnet-api.zigchain.com, height 8046854, the valdora fixture height) full headers: `grpc-metadata-content-type: application/grpc+cosmos-sdk-grpc-codec`, `grpc-metadata-x-cosmos-block-height: 8046854`, `x-cosmos-block-height: 8046854`, `x-server-time`, `cf-cache-status: DYNAMIC`, `x-frame-options: SAMEORIGIN`, `referrer-policy: strict-origin-when-cross-origin`, `server: cloudflare`. (The plain `x-cosmos-block-height` response header was seen on testnet-api; the mainnet hosts' filtered views only showed the grpc-metadata- form — see open question.)

node_info from api.zigchain.com (2026-10-18T19:31:00Z): network zigchain-1, version 0.38.25, moniker zrpc02-mainnet, app zigchaind.

## 5. CometBFT RPC hosts (alternative pattern, no custom header)

| host | GET /status with Origin | OPTIONS | abci_query?path=\"/cosmos.staking.v1beta1.Query/Params\"&height=13043200 |
|---|---|---|---|
| rpc.zigchain.com | ACAO *, cloudflare | 204 | code 0, height \"13043200\", value ChYKBAiA324QDhgHIJBOKgRhemlnMgEw |
| testnet-rpc.zigchain.com | ACAO *, cloudflare | 204 | code 26 \"cannot query with height in the future\" (testnet is lower) |
| public-zigchain-rpc.numia.xyz | ACAO *, allow-credentials true | 204 | code 0, same value |
| zigchain-rpc.polkachu.com | ACAO *, access-control-allow-headers: * | 200 | code 0, same value |

Sample JSON:
```json
{\"jsonrpc\":\"2.0\",\"id\":-1,\"result\":{\"response\":{\"code\":0,\"log\":\"\",\"info\":\"\",\"index\":\"0\",\"key\":null,\"value\":\"ChYKBAiA324QDhgHIJBOKgRhemlnMgEw\",\"proofOps\":null,\"height\":\"13043200\",\"codespace\":\"\"}}}
```
Height pinned via the query string → a simple GET, no preflight; the pin is verifiable from the body. Cost: value is protobuf (base64) → per-query-type decoding in the browser, probably a new dependency (owner approval per CLAUDE.md), and https://rpc.zigchain.com would enter connect-src. As of 2026-10-18T19:32:30Z.

## 6. Cosmos chain-registry (https://raw.githubusercontent.com/cosmos/chain-registry/master/zigchain/chain.json, read 2026-10-18T19:31:30Z)

- chain_id zigchain-1, bech32 zig, slip44 118, fees/staking denom azig, unbonding 1814400s, recommended_version 5.1.0, cometbft 0.38.25, sdk 0.53.8, ibc-go 10.5.0, cosmwasm 0.60.9 enabled.
- rest: https://public-zigchain-lcd.numia.xyz/ (Numia), https://api.zigchain.com (ZIGCHAIN), https://zigchain-api.polkachu.com (Polkachu), https://api.zigchain.nodestake.org (NodeStake), https://zigchain-api.stakeandrelax.net (Stake and Relax).
- rpc: https://public-zigchain-rpc.numia.xyz/, https://rpc.zigchain.com, https://zigchain-rpc.polkachu.com:443, https://rpc.zigchain.nodestake.org:443, https://zigchain-rpc.stakeandrelax.net.
- grpc: grpc.zigchain.com:9090, zigchain-grpc.polkachu.com:32890, grpc.zigchain.nodestake.org:443.
- Testnet (testnets/zigchaintestnet/chain.json): chain_id zig-test-2; rest: https://testnet-api.zigchain.com, https://public-zigchain-testnet-lcd.numia.xyz/, https://zigchain-testnet-api.polkachu.com, https://api-t.zigchain.nodestake.org.
- lcd-zigchain.keplr.app is not listed.

## 7. What origin/main does today

- `apps/web/lib/position-reader.ts:11-14`: `READ_NETWORKS = { MAINNET_READ_ONLY:{chainId:'zigchain-1',rest:'https://api.zigchain.com',denom:'azig',decimals:18}, TESTNET_READ_ONLY:{chainId:'zig-test-2',rest:'https://testnet-api.zigchain.com',denom:'azig',decimals:18} }`. `readPublicPositions` (browser) fetches `/api/positions?network=<mode>&address=<addr>` only; 403/429 → `PositionReadRefused` with the server's sentence. `MAINNET_REFUSED` = \"Mainnet addresses are not read on the public Alpha. Add your mainnet ZIG as a manual asset instead; snapshots you saved before stay.\"
- `apps/web/app/api/positions/route.ts:13-15`: \"Testnet only on the public builds (the owner's C4 answer); a local demo build still reads mainnet.\" — `if(mode==='MAINNET_READ_ONLY'&&(environment==='PUBLIC_ALPHA_UNDEPLOYED'||environment==='TESTNET_DEPLOYED'))return Response.json({error:MAINNET_REFUSED,code:'MAINNET_NOT_ON_PUBLIC_ALPHA'},{status:403,headers});`
- `apps/web/lib/server/positions-relay.ts`: POSITIONS_CACHE_MS 60_000, CLIENT_READS_PER_MINUTE 10, SERVER_READS_PER_MINUTE 120, CACHE_ENTRIES 500; `read = readNativePositions`.
- `apps/web/lib/native-positions.ts:29`: server fetch of `network.rest+path` with `headers:{'x-cosmos-block-height':height}`, `credentials:'omit'`, `redirect:'manual'`, 12 s timeout; `:31` throws 'Public response block height is missing or inconsistent' if `response.headers.get('x-cosmos-block-height')!==height`.
- `apps/web/lib/earn/valdora/testnet.ts:167,172`: same header and check; imported by no page (ADR-009 §1 \"No page imports an adapter until an owner decision does\").
- ADR-009 §2 (docs/architecture/ADR-009-earn-architecture.md:24-28): \"Every read happens at one block height (`x-cosmos-block-height`) and fails closed on any difference …\"; Consequences: \"Mainnet adapters are out of scope until the preconditions above hold for mainnet as well.\"
- `apps/web/lib/egress-policy.json`: `chainOrigins: [\"https://testnet-api.zigchain.com\",\"https://testnet-rpc.zigchain.com\"]`; `serverOnly` note: server-reached origins never enter connect-src (ADR-014 S2). `lib/csp-compose.mjs:21`: connect-src = 'self' + chainOrigins + aiProviderOrigins + localModelSources + csp[cls].connect. `config/deployment.json:23-24`: rpcUsed testnet-rpc, restUsed testnet-api.
- Result: nothing in the browser sends x-cosmos-block-height today; the pinned pattern is server-side already, on testnet and (LOCAL_DEMO only) on mainnet.

## 8. Conclusion

- Browser-direct pinned reads: not possible on any official or registry LCD (preflight 403 on the Cloudflare-fronted ZIGChain/polkachu hosts and stakeandrelax; allow-headers gap + no expose-headers on numia/keplr; keplr additionally pruned).
- Relay: api.zigchain.com already pinned, answers pinned reads ≥1,000,000 blocks deep; numia is an equally deep fallback, polkachu to ~100,000.
- Decision for the owner: lift C4 (route.ts:15) for linked addresses on the relay; add further server routes (validators, governance, vaults) behind positions-relay-style cache/limits; CSP connect-src unchanged; chainOrigins unchanged (the browser never needs a mainnet host).
- Alternative recorded: RPC abci_query browser-direct (needs protobuf decoding + rpc.zigchain.com in connect-src).

## GAP G05

Gap G05 is closed: the staking-rate derivation is confirmed as the standard Cosmos SDK path, measured against real on-chain accrual, and the two suspected "non-standard reward path" clues both turn out to be ordinary.

What was measured (all from https://zigchain-api.polkachu.com, 2026-10-18 ~19:32Z). Latest height H=13043327 (block time 2026-10-18T19:31:48Z). The Foundation self-bond address zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx holds exactly one delegation of 100,000 ZIG (100000000000000000000000 azig, so azig has 18 decimals) to zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl (moniker "ZIG Sentinel - Foundation 1", commission rate 0.05). Pending rewards: 895.2436915436199 ZIG-e-3... precisely 895243691543619900000 azig at H-10000 (block 13033327, 10:43:22Z) and 900474785601456200000 azig at H (19:31:48Z). Delta 5.2310940578 ZIG over 31,705.78 s (10,000 blocks, 3.17 s/block). Annualised (365.25 d): 5,206.6 ZIG on 100,000 ZIG = 5.207 % net. A second window (H-20000, 01:52:45Z, 890007652954413100000 azig → H-10000) gives 5.2360 ZIG over 31,836.65 s = 5.190 % net. So the real net rate for a 5 %-commission validator is about 5.19–5.21 %/yr.

What the formula predicts. Live mint/pool: annual_provisions = 24,439,594.178 ZIG, bonded_tokens = 425,559,497.762 ZIG, so gross = 5.7429 %. community_tax = 0.02, commission 0.05: 5.7429 % × 0.98 × 0.95 = 5.3467 %. Measured/predicted = 0.974. The gap is explained by blocks_per_year: the mint module (SDK v0.53.8, x/mint/types/minter.go BlockProvision = AnnualProvisions / BlocksPerYear) mints per block, with blocks_per_year = 10,512,000 (3.0 s), but real block time is 3.17 s (≈9.95 M blocks/yr, factor 0.947). Mint-only prediction is therefore 5.3467 % × 0.947 = 5.062 %; measured 5.19–5.21 % is slightly above that, the remainder being transaction-fee rewards (the delegator FAQ confirms fees are a second source). So the honest formula is: net APR ≈ (annual_provisions ÷ bonded_tokens) × (actual_blocks_per_year ÷ blocks_per_year) × (1 − community_tax) × (1 − commission), plus an unquantified fee component; or, better, show a measured rate from the rewards delta exactly as done here.

The two "non-standard path" clues. (1) "Dynamic inflation rate" in docs/users/governance/delegators_faq.md is the stock SDK mint module: params inflation_min 0.01, inflation_max 0.02, inflation_rate_change 0.01, goal_bonded 0.15; current inflation 1.0454 % and falling because the bonded ratio (~18.2 % of an implied ~2.338 B supply) is above the 15 % goal. (2) The "Reward Contract" audit (ZIGChain/audits, Oak, 2025-11-11) is the ZIGStake migration program at hub.zigchain.com/claim-rewards (daily claims, reward ÷ 180 days, for people who staked on ETH/BSC before mainnet) — not the delegation reward path.

Still unreadable: hub.zigchain.com (Cloudflare challenge, 403, X-Frame-Options SAMEORIGIN) and docs.zigchain.com (403); the docs content was read from the public GitHub source instead. The Hub's displayed APR therefore remains for the owner to read in a browser. Third-party Solva shows 6.3 % APR / 6.6 % APY at 10 % commission (page dated 2026-06-12), which does not match the live chain and should not be used.

# GAP G05 — ZIGChain staking rate: derivation vs measured accrual

Read-only research, 2026-10-18 ~19:31–19:41Z (21:31–21:41 Brussels). All reads via `curl -s -m 20` GET against `https://zigchain-api.polkachu.com` unless noted. No files written outside the scratchpad.

## 1. Question

R2 LB2 derived 5.743 % gross = annual_provisions ÷ bonded_tokens. No published APR was readable (Hub/docs 403). The delegator FAQ mentions a "dynamic inflation rate" and the audits repo lists a "Reward Contract" — is the reward path non-standard?

## 2. Live chain state (2026-10-18T19:31–19:36Z)

| Item | Value | Source |
|---|---|---|
| Latest height H | 13043327 | /cosmos/base/tendermint/v1beta1/blocks/latest |
| Block time at H | 2026-10-18T19:31:48.096509036Z | /blocks/13043327 |
| Block time at H−10000 (13033327) | 2026-10-18T10:43:22.314648811Z | /blocks/13033327 |
| Block time at H−20000 (13023327) | 2026-10-18T01:52:45.665065724Z | /blocks/13023327 |
| network | zigchain-1 | /node_info |
| app | zigchaind v5.1.2, git 2de3c0f4d637efd187c373f17e30ac534ca308a0 | /node_info |
| cosmos_sdk_version | v0.53.8 | /node_info |
| CometBFT | 0.38.25 | /node_info |
| annual_provisions | 24439594178269824800469812.904049981637318281 azig (= 24,439,594.178 ZIG) | /cosmos/mint/v1beta1/annual_provisions |
| annual_provisions at H−10000 | 24444103665262870705156952.337 azig | same, header x-cosmos-block-height: 13033327 |
| inflation | 0.010454294199830818 | /cosmos/mint/v1beta1/inflation |
| mint params | mint_denom azig, inflation_rate_change 0.01, inflation_max 0.02, inflation_min 0.01, goal_bonded 0.15, blocks_per_year 10512000 | /cosmos/mint/v1beta1/params |
| bonded_tokens | 425559497761956330156508434 azig (= 425,559,497.762 ZIG) | /cosmos/staking/v1beta1/pool |
| not_bonded_tokens | 6271137301649159338990472 azig | same |
| bonded_tokens at H−10000 | 425557176124411622070042573 azig | same, header x-cosmos-block-height: 13033327 |
| community_tax | 0.02 | /cosmos/distribution/v1beta1/params |
| base/bonus proposer reward | 0 / 0 | same |
| withdraw_addr_enabled | true | same |

Sample JSON seen:

```
{"params":{"mint_denom":"azig","inflation_rate_change":"0.010000000000000000","inflation_max":"0.020000000000000000","inflation_min":"0.010000000000000000","goal_bonded":"0.150000000000000000","blocks_per_year":"10512000"}}
{"pool":{"not_bonded_tokens":"6271137301649159338990472","bonded_tokens":"425559497761956330156508434"}}
{"params":{"community_tax":"0.020000000000000000","base_proposer_reward":"0.000000000000000000","bonus_proposer_reward":"0.000000000000000000","withdraw_addr_enabled":true}}
```

Implied total supply = annual_provisions ÷ inflation ≈ 2,337,756,496 ZIG (derived; direct supply query not completed — shell quoting error on `?denom=`). Bonded ratio ≈ 18.2 % > goal_bonded 15 %, so inflation is decreasing toward inflation_min 1 %.

## 3. The measured delegation

Address zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx:

```
{"delegation_responses":[{"delegation":{"delegator_address":"zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx","validator_address":"zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl","shares":"100000000000000000000000.000000000000000000"},"balance":{"denom":"azig","amount":"100000000000000000000000"}}],"pagination":{"next_key":null,"total":"1"}}
```

→ exactly one delegation, 100,000 ZIG; confirms azig exponent 18.

Validator zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl (/cosmos/staking/v1beta1/validators/...): moniker "ZIG Sentinel - Foundation 1", BOND_STATUS_BONDED, jailed false, tokens 84174084119054635855933299 azig (≈84.17 M ZIG, ≈19.8 % of bonded), commission `{"rate":"0.050000000000000000","max_rate":"0.200000000000000000","max_change_rate":"0.010000000000000000"}`, update_time 2025-09-18T14:00:11Z. Accumulated validator commission (/distribution/.../commission): 350432027943198858932163.82 azig.

## 4. Reward reads (header `x-cosmos-block-height`)

| Height | Time (UTC) | Pending reward (azig) |
|---|---|---|
| 13023327 | 2026-10-18T01:52:45.665Z | 890007652954413100000 |
| 13033327 | 2026-10-18T10:43:22.315Z | 895243691543619900000 |
| 13043327 | 2026-10-18T19:31:48.097Z | 900474785601456200000 |

Sample:

```
{"rewards":[{"validator_address":"zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl","reward":[{"denom":"azig","amount":"900474785601456200000.000000000000000000"}]}],"total":[{"denom":"azig","amount":"900474785601456200000.000000000000000000"}]}
```

### Window A (H−10000 → H)
- Δ = 5231094057836300000 azig = 5.2310940578 ZIG
- Δt = 31,705.78 s (block time 3.1706 s)
- Annualised (365.25 d = 31,557,600 s): 5,206.65 ZIG → **5.2066 % net** on 100,000 ZIG

### Window B (H−20000 → H−10000)
- Δ = 5236038589206800000 azig = 5.2360385892 ZIG
- Δt = 31,836.65 s
- Annualised: 5,190.3 ZIG → **5.190 % net**

## 5. Derivation vs measurement

- Gross = annual_provisions ÷ bonded_tokens = 24,439,594.178 ÷ 425,559,497.762 = **5.7429 %** (R2 LB2 value 5.743 % reproduced).
- Naive net = 5.7429 % × (1 − 0.02) × (1 − 0.05) = **5.3467 %**.
- Measured ÷ naive = 0.974.
- Cause: SDK v0.53.8 `x/mint/types/minter.go` line 79–80 `BlockProvision`: `provisionAmt := m.AnnualProvisions.QuoInt(math.NewInt(int64(params.BlocksPerYear)))` — mint is per block at annual_provisions/10,512,000, but real block time is 3.17 s → ≈9,953,263 blocks/yr → factor 0.9468.
- Block-time-adjusted mint-only net = 5.3467 % × 0.9468 = **5.062 %**.
- Measured 5.19–5.21 % sits 0.13–0.15 points above that → consistent with the FAQ's second source, transaction fees (not separately measured).

**Honest formula for the app:** net ≈ (annual_provisions ÷ bonded_tokens) × (actual_blocks_per_year ÷ blocks_per_year) × (1 − community_tax) × (1 − commission) + fees; or display the measured accrual from two reward reads as done here, labelled "measured over N hours, as of <time>".

SDK source (https://raw.githubusercontent.com/cosmos/cosmos-sdk/v0.53.8/x/mint/types/minter.go) grep:

```
46:func (m Minter) NextInflationRate(params Params, bondedRatio math.LegacyDec) math.LegacyDec {
53:	// (1 - bondedRatio/GoalBonded) * InflationRateChange
57:	inflationRateChange := inflationRateChangePerYear.Quo(math.LegacyNewDec(int64(params.BlocksPerYear)))
61:	if inflation.GT(params.InflationMax) {
64:	if inflation.LT(params.InflationMin) {
73:func (m Minter) NextAnnualProvisions(_ Params, totalSupply math.Int) math.LegacyDec {
79:func (m Minter) BlockProvision(params Params) sdk.Coin {
80:	provisionAmt := m.AnnualProvisions.QuoInt(math.NewInt(int64(params.BlocksPerYear)))
```

## 6. "Dynamic inflation rate" (delegator FAQ)

docs.zigchain.com returns 403; read the source instead: https://raw.githubusercontent.com/ZIGChain/docs/main/docs/users/governance/delegators_faq.md (last commit touching it: 2026-03-30T09:40:08Z per https://api.github.com/repos/ZIGChain/docs/commits?path=...).

Line 49–52: "ZIGChain staking rewards come from two sources: Block Rewards: Derived from the network's dynamic inflation rate introduced during the ZIG Tokenomics review ... The inflation rate adjusts based on the total percentage of tokens staked ... Fee Rewards: Transaction fees collected from the network are distributed to delegators proportionally".

Worked example (lines 58–83) uses a 5 % commission and the standard validator-share/commission split. Verdict: this is the stock x/mint behaviour parameterised by goal_bonded 0.15, min 1 %, max 2 %, rate change 1 %/yr. Not a custom module. (node_info build_deps show no ZIGChain-specific mint/distribution dependency; SDK 0.53 bundles x/mint.)

Other docs grepped (same repo): docs/builders/staking-module.md (min_commission_rate 0 %, unbonding 21 d, no APR), docs/nodes-and-validators/validators-faq.md (block rewards + fees + commissions; references Cosmos SDK v0.50 staking end-block), docs/users/hub/staking.md (Hub shows "available balance, validator commission, and APR"; rewards auto-claimed on stake/unstake).

## 7. "Reward Contract" (audits repo)

https://raw.githubusercontent.com/ZIGChain/audits/main/README.md:

| Project | Date | Auditor | Title |
|---|---|---|---|
| ZIGChain | 2025-08-25 | Oak | ZIGChain Core Audit |
| Reward Contract | 2025-11-11 | Oak | ZIGChain Reward Contract (audits/reward_contract/2025-11-11_Audit_Report_ZIGChain_Reward_Contract.pdf, 656,625 bytes) |
| ZIGChain Update | 2025-12-19 | Oak | |
| ZIGChain v4.0.0 | 2026-05-12 | Oak | |
| ZIG Chain v5 | 2026-10-05 | Oak | ZIG Chain v5 Security Audit |

docs/users/hub/claim-rewards.md: participants who staked on the previous ETH/BSC ZIGStake site (staking.zigchain.com) claim rewards at https://hub.zigchain.com/claim-rewards/; "Rewards become available daily", "Daily reward = Reward ÷ 180", claims from 2025-11-05 (how-to-claim-bsc-zig-rewards.md line 81). The audit date (2025-11-11) matches that program's launch. Verdict: the Reward Contract is the migration/claim program, unrelated to x/distribution delegation rewards. PDF not read (binary, not needed).

## 8. Unreadable / third-party

- https://hub.zigchain.com/staking → HTTP 403, `cf-mitigated: challenge`, `x-frame-options: SAMEORIGIN`, CSP default-src 'none'. Unreadable; owner to read APR in a browser.
- https://docs.zigchain.com/ → 403 (also with browser UA).
- https://www.polkachu.com/networks/zigchain → chain-id zigchain-1, API https://zigchain-api.polkachu.com, RPC https://zigchain-rpc.polkachu.com:443, no APR shown (2026-10-18T19:37Z).
- https://solva.solutions/staking/networks/zigchain → APR 6.3 %, APY 6.6 %, commission 10 %, calculator 6.35 % "Restake enabled", page dated 2026-06-12; methodology unknown; inconsistent with live chain.
- https://www.stakingrewards.com/asset/zignaly → reward fields empty (per search summary, not fetched).
- CORS: `curl -I -H 'Origin: https://zigoals.app' https://zigchain-api.polkachu.com/cosmos/mint/v1beta1/annual_provisions` → HTTP/2 501 (HEAD unsupported) but `access-control-allow-origin: *` present.

## 9. Repro commands

```
H=$(curl -s https://zigchain-api.polkachu.com/cosmos/base/tendermint/v1beta1/blocks/latest | grep -o '"height":"[0-9]*"' | head -1 | tr -dc 0-9)
A=https://zigchain-api.polkachu.com/cosmos/distribution/v1beta1/delegators/zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx/rewards
curl -s -H "x-cosmos-block-height: $H" $A
curl -s -H "x-cosmos-block-height: $((H-10000))" $A
curl -s https://zigchain-api.polkachu.com/cosmos/base/tendermint/v1beta1/blocks/$H | grep -o '"time":"[^"]*"' | head -1
curl -s https://zigchain-api.polkachu.com/cosmos/base/tendermint/v1beta1/blocks/$((H-10000)) | grep -o '"time":"[^"]*"' | head -1
# net APR = (Δazig/1e18) × 31557600/Δt / 100000
```

## GAP G06

The decision is the owner's, but the evidence narrows it. What I verified (all as of 2026-10-18T20:45+02:00):

Licences. Both candidate relay packages ship a non-OSS "Community License" inside their npm tarball, not just on GitHub. @walletconnect/sign-client 2.26.0 (published 2026-10-08, npm field "SEE LICENSE IN LICENSE.md") carries the WALLETCONNECT COMMUNITY LICENSE AGREEMENT, release date 20 August 2025; @reown/appkit 1.8.24 (published 2026-09-16) carries the REOWN COMMUNITY LICENSE AGREEMENT, release date 25 August 2025. Both say: Section 3 "Monthly RPC limit of 2,500,000" and "Monthly MAU limit of 500" above which a paid commercial licence is required, "determined in our sole discretion"; Section 2(a) a distribution duty on any product that uses them: the notice "Portions © 2025 Reown, Inc. All Rights Reserved" in the notices/readme or about section, a copy of the licence shipped with the app, and "(iii) applicable logo and branding"; Section 2(b) a material condition that every use "must connect to the proprietary Reown gateway infrastructure"; Section 1(c) assigns any modification to Reown; Section 8(a) says future licence updates bind future releases. That is the R4 LB8 verdict confirmed from the tarballs themselves. @keplr-wallet/wc-client 0.13.41 is Apache-2.0 but is only usable with a sign-client peer (peerDependencies `@walletconnect/sign-client ^2`), so option (a) inherits the Community License anyway.

Sizes (bundlephobia, minified gzip): sign-client 2.26.0 118.2 kB (7 deps, incl. @walletconnect/core 2.26.0); @reown/appkit 1.8.24 271.9 kB (13 deps incl. viem >=2.55.13, valtio, universal-provider 2.23.7); @keplr-wallet/wc-client 0.13.41 30.0 kB; qrcode 1.5.4 8.8 kB (MIT, last published 2024-08-05). The repo already has @zxing (a QR decoder, used only by the food barcode lookup), not an encoder, so a QR encoder is a new dependency under option (a). ZIGoals' Today page sits at 511.1 of a 515 kB budget (STATUS.md), so even the lightest relay path only fits as a lazy chunk.

CSP. Reown's own CSP page lists 21 connect-src sources, 5 frame-src and 12 img-src, plus a "Cross-Origin-Opener-Policy: same-origin-allow-popups" header. The repo's policy (apps/web/lib/csp-compose.mjs + apps/web/lib/egress-policy.json) today has 4 app connect origins, 1 img, 4 frame, and sends frame-ancestors 'none'. Option (a) needs at least wss://relay.walletconnect.com/.org (+ https for the fallback) and verify.walletconnect.org in frame-src; AppKit needs the full list. HEAD probes: relay.walletconnect.com/.org answer 405 to HEAD (alive, WebSocket endpoint), api.web3modal.org and explorer-api.walletconnect.com answer 403 with access-control-allow-origin: *, pulse.walletconnect.org 404 with ACAO *, dashboard.reown.com 200 with frame-ancestors 'self'.

Project ID. Reown's relay docs pass it as a URL query (`https://relay.walletconnect.com/?projectId=...`) and in `SignClient.init({ projectId })`; the page says "you are strongly encouraged to set an allowlist" of origins, "Requests from other origins will be denied", and "if empty all origins are allowed". So it is a public-by-design value in the bundle that must be origin-allowlisted at Reown, and it needs a Reown dashboard account to exist at all.

Option (b) evidence. Keplr Mobile (v2.0.63+) documents a `web-browser` path with a `url` parameter: `https://deeplink.keplr.app/web-browser?url=<host>`, iOS `keplrwallet://web-browser?url=...`, Android `intent://web-browser?url=...#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`. MetaMask documents `https://link.metamask.io/dapp/{dappUrl}` opening the dapp in its in-app browser, with a download landing page if the app is absent. Trust Wallet documents `https://link.trustwallet.com/open_url?coin_id=60&url=<url>` (also `trust://`). The repo's lib/wallet-link.ts already reads `window.keplr` (and Cosmostation's injected keplr) and EIP-6963 providers with `eth_requestAccounts`; in-app browsers inject those same globals, so (b) is zero dependencies, zero project ID, zero CSP change, zero licence duty, and PRIVACY.md's current sentence "linking makes no request of its own" stays true. Its cost: no QR hand-off from a desktop to a phone, and deep-link reliability inside third-party WebViews is documented by MetaMask as inconsistent.

Recommendation for ADR-028: (b) unless the owner wants desktop→phone pairing badly enough to accept a Community License, a Reown account with an origin allowlist, a shipped licence copy and attribution notice, ~120–280 kB gzip lazily loaded, and 8–21 new CSP origins.

# GAP G06 — WalletConnect / Reown scope (owner decision for ADR-028)

Session AF, Phase R. Read-only helper. All timestamps 2026-10-18 (Brussels, +02:00). Repo truth: `origin/main` `4f9249561736fbe19305b426de82f5c91a24763d`.

## 1. What the repo has today (origin/main)

- `apps/web/lib/wallet-link.ts`: Cosmos through injected `window.keplr` (or `cosmostation.providers.keplr`): `experimentalSuggestChain(keplrChainInfo())`, `enable(TESTNET.chainId)`, `getKey` → only `bech32Address` read. EVM through EIP-6963 providers: `eth_requestAccounts`, first account, checked as 0x + 40 hex. `forgetKeplrPermission` calls `keplr.disable(chainId)`. `KEPLR_SITE = 'https://www.keplr.app/'`.
- `git grep -i 'walletconnect|reown' origin/main -- apps/web` → no code matches. No WalletConnect anywhere.
- `apps/web/package.json` dependencies: @cosmjs/* 0.38.1, @zxing/browser 0.2.1, @zxing/library 0.23.0 (QR **decoder**, used only in `components/health/barcode-food-lookup.tsx`), next 16.3.8, react 19.3.0. No QR encoder.
- CSP: `apps/web/lib/csp-compose.mjs` — `connect-src` = `'self'` + `egress.chainOrigins` + AI provider origins + local model sources + `csp[cls].connect`; `img-src` = `'self' data: blob:` + list; `frame-src` = list or `'none'`; `frame-ancestors 'none'`; `script-src 'self' 'nonce-…' 'strict-dynamic'`; `worker-src 'self'`; `style-src 'self' 'unsafe-inline'`; Trusted Types required on production pages (`docs/security/TRUSTED_TYPES.md`).
- `apps/web/lib/egress-policy.json`: `chainOrigins` = [`https://testnet-api.zigchain.com`, `https://testnet-rpc.zigchain.com`]; `csp.app.connect` = [api.chess.com, lichess.org, accounts.spotify.com, api.spotify.com]; `csp.app.img` = [i.scdn.co]; `csp.app.frame` = 4 chess/lichess embeds.
- `docs/PRIVACY.md` L79 (ADR-027 linked wallets): \"Nothing is signed or sent, no balance is looked up for a linked address and linking makes no request of its own; the wallet may keep its own permission for this site until you revoke it there.\" Any relay option makes this sentence false.
- `docs/architecture/ADR-027-session-ae.md` G15: Leap (shut 28 May 2026) and Cosmostation (from 1 Sep 2026) ended; install links only for Keplr, MetaMask, Rabby, Coinbase Wallet. G16: linked addresses exported, never restored.
- `docs/STATUS.md`: Today 511.1 of 515 kB budget (AB-Design), no budget raised since; any relay client must be a lazy chunk.
- No AF research doc, no \"R4\"/\"LB8\", no ADR-028 exists on origin/main (grep returned only binary false positives).

## 2. Packages (npm registry, 2026-10-18T20:42+02:00)

| Package | Pin | Published | npm `license` | unpackedSize | deps | gzip (bundlephobia) |
|---|---|---|---|---|---|---|
| @walletconnect/sign-client | 2.26.0 (= latest) | 2026-10-08T07:23:27Z | SEE LICENSE IN LICENSE.md | 2,805,701 B | 7: @walletconnect/core 2.26.0, jsonrpc-utils 1.0.8, logger 3.0.2, time 1.0.2, types 2.26.0, utils 2.26.0, events 3.3.0 | 118,178 B (min 394,453) |
| @reown/appkit | 1.8.24 (= latest) | 2026-09-16T13:01:45Z | SEE LICENSE IN LICENSE.md | 1,002,334 B | 13: appkit-common/controllers/pay/polyfills/scaffold-ui/ui/utils/wallet 1.8.24, @walletconnect/universal-provider 2.23.7, bs58 6.0.0, semver 7.7.2, valtio 2.1.7, viem >=2.55.13 | 271,901 B (min 917,590), hasSideEffects true |
| @keplr-wallet/wc-client | 0.13.41 (latest) | 2026-07-20T07:21:24Z | Apache-2.0 | 96,533 B | @keplr-wallet/provider 0.13.41, @keplr-wallet/types 0.13.41, buffer ^6.0.3, deepmerge ^4.2.2, long ^3||^4||^5; **peer**: @walletconnect/sign-client ^2, @walletconnect/types ^2, starknet ^8 | 29,952 B |
| qrcode | 1.5.4 (latest) | 2024-08-05T21:52:58Z | MIT | 135,364 B | 3 | 8,750 B |

Source URLs: `https://registry.npmjs.org/<name>`; `https://bundlephobia.com/api/size?package=<name>@<ver>`.

wc-client tarball `build/index.d.ts`: `export declare class KeplrWalletConnectV2 implements Keplr { constructor(signClient: SignClient, options: {...}) }`; imports `SignClient from \"@walletconnect/sign-client\"`, `starknet` types. `build/index.js` has **0** `require(\"starknet\")` — the starknet peer is type-only. No README in the tarball; the GitHub `packages/wc-client/README.md` on master → 404.

## 3. Licences (read from the tarballs themselves)

### @walletconnect/sign-client 2.26.0 — `package/LICENSE.md`
**WALLETCONNECT COMMUNITY LICENSE AGREEMENT**, **Release Date: 20 August 2025**, licensor Reown, Inc. (\"WalletKit Items\"). Same text as https://raw.githubusercontent.com/WalletConnect/walletconnect-monorepo/v2.0/LICENSE.md (200).
- 1(a) perpetual, non-exclusive, non-transferable, non-sublicensable licence to use/modify/distribute.
- 1(b) royalty-free for development of your apps \"subject to Section 3\".
- 1(c) **modifications/derivative works are assigned to Reown**; you must mark modified files; you agree to send source and binary of modifications to Reown. 1(c)(ii) your own app is not a derivative work.
- 2(a) **Distribution Requirements**: if you distribute \"any product or service that uses them (including Your applications and wallets)\" you must (i) include \"Portions © 2025 Reown, Inc. All Rights Reserved\" in notices/readme.txt or the about section of the website, (ii) \"provide a copy of this License Agreement with any applications or wallets containing such WalletKit Items\", (iii) \"applicable logo and branding\" (undefined).
- 2(b) **Network Connection**: \"all use, distribution or derivatives works of the WalletKit Items must connect to the proprietary Reown gateway infrastructure\"; no circumvention, no telling users to.
- 2(c) must comply with Reown ToS and AUP (incorporated by reference). 2(d) no use of marks except as permitted. 2(e) US export controls list.
- 3 **LIMITED COMMERCIAL USE**: above thresholds \"determined in our sole discretion\" you must buy a commercial licence: \"Monthly RPC limit of 2,500,000\", \"Monthly MAU limit of 500\". MAU = unique EOA that authenticates and connects in a 30-day period (or an embedded wallet). Reown \"reserve the right to change the RPC and/or MAU limit thresholds\".
- 4–5 no warranty, no liability. 6 all IP Reown's. 7 **Confidentiality** clause claims the SDK contains confidential information. 8(a) future licence updates bind future releases; 8(b) termination 30 days after uncured breach notice; network access ceases.

### @reown/appkit 1.8.24 — `package/LICENSE.md`
**REOWN COMMUNITY LICENSE AGREEMENT**, **Release Date: 25 August 2025** (\"AppKit Items\" = Reown AppKit, Blockchain-API). Clauses 2(a), 2(b), 3 (2,500,000 RPC / 500 MAU) are word-for-word the same as above. https://raw.githubusercontent.com/reown-com/appkit/main/LICENSE → 404; the tarball is the copy of record.

### Consequence for option (a)
`@keplr-wallet/wc-client` is Apache-2.0 but is a thin adapter over a `SignClient` instance: the Community License applies through the peer. There is no Apache/MIT route to the WalletConnect relay for a dapp.

## 4. Project ID
- https://docs.reown.com/cloud/relay (read 20:44): projectId is a URL query (`https://relay.walletconnect.com/?projectId=...`) and `SignClient.init({ projectId })`; \"To help prevent malicious use of your project ID you are strongly encouraged to set an allowlist\" (origins or bundle ids); \"Requests from other origins will be denied\"; \"Using localhost (or 127.0.0.1) is always permitted, and if empty all origins are allowed\"; \"Avoid committing projects keys to the repo. Use env variables instead\" (it is still in the shipped bundle). Error 1013 = Too many requests. https://docs.reown.com/cloud/allowlist → 404.
- Needs a Reown dashboard account (dashboard.reown.com: 200; cloud.reown.com: 301).

## 5. CSP for the relay options (Reown's guide, https://docs.reown.com/advanced/security/content-security-policy, no page date)
- connect-src (21): 'self', https://rpc.walletconnect.com, https://rpc.walletconnect.org, https://relay.walletconnect.com, https://relay.walletconnect.org, wss://relay.walletconnect.com, wss://relay.walletconnect.org, https://pulse.walletconnect.com, https://pulse.walletconnect.org, https://api.web3modal.com, https://api.web3modal.org, https://keys.walletconnect.com, https://keys.walletconnect.org, https://notify.walletconnect.com, https://notify.walletconnect.org, https://echo.walletconnect.com, https://echo.walletconnect.org, https://push.walletconnect.com, https://push.walletconnect.org, wss://www.walletlink.org, https://cca-lite.coinbase.com; plus chain RPC endpoints.
- frame-src: 'self', https://verify.walletconnect.com, https://verify.walletconnect.org, https://secure.walletconnect.com, https://secure.walletconnect.org.
- img-src (12): *, 'self', data:, blob:, walletconnect.org/.com, secure.walletconnect.com/.org, tokens-data.1inch.io, tokens.1inch.io, ipfs.io, cdn.zerion.io.
- font-src: 'self', fonts.gstatic.com, fonts.reown.com; style-src fonts.googleapis.com.
- Header: `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Collisions with the repo: `img-src *` and Google Fonts conflict with the repo's strict policy; AppKit's UI is web components with injected styles under a Trusted-Types + nonce policy (unverified whether it runs clean). Bare sign-client needs at least the relay wss/https pair per domain and the verify frame; the exact minimal set was not confirmed from sign-client source.

### Live HEAD probes (20:42, `curl -s -I -H 'Origin: https://zigoals.app'`)
| Host | Status | ACAO | Framing |
|---|---|---|---|
| relay.walletconnect.com | 405 | — | — |
| relay.walletconnect.org | 405 | — | — |
| api.web3modal.org | 403 | * | — |
| explorer-api.walletconnect.com | 403 | * | — |
| pulse.walletconnect.org | 404 | * | — |
| verify.walletconnect.org | 404 | — | — |
| cloud.reown.com | 301 | — | — |
| dashboard.reown.com | 200 | * | CSP frame-ancestors 'self'; X-Frame-Options SAMEORIGIN |

## 6. Option (b) — deep links into wallet in-app browsers (no relay)
- **Keplr Mobile** (https://docs.keplr.app/api/mobile/deeplink, read 20:44; v2.0.63+): universal `https://deeplink.keplr.app/{path}?{params}` (falls back to a website if not installed); Android `intent://{path}?{params}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`; iOS `keplrwallet://{path}?{params}` (no fallback). Path `web-browser`, param `url` = \"The URL to be opened in the Keplr Mobile internal browser\"; examples `keplrwallet://web-browser?url=app.osmosis.zone`, `intent://web-browser?url=app.osmosis.zone#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`. Path `show-address?chainId=osmosis-1`. Keplr help centre warns connections may not work from other mobile browsers.
- **MetaMask** (https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/, read 20:45): `https://link.metamask.io/dapp/{dappUrl}` e.g. `https://link.metamask.io/dapp/app.uniswap.org`, any ecosystem; without the app → download landing page. WebViews inside Twitter/Discord/Reddit have inconsistent support (GitHub metamask-mobile #3965). Older `metamask.app.link/dapp/` only in community posts.
- **Trust Wallet** (https://developer.trustwallet.com/developer/develop-for-trust/deeplinking, read 20:44): `https://link.trustwallet.com/open_url?coin_id=60&url=https://compound.finance`; `trust://open_url?...` also works; coin_id = slip44.
- **Coinbase Wallet**: unreadable (307 → docs.cdp.coinbase.com … → 404). Unknown.
- Provider injection inside those browsers is implied (that is their purpose) but not quoted verbatim on any fetched page → open question, needs a one-phone check.
- Cost of (b): no desktop→phone QR pairing; the user must be on the phone. Zero dependencies, no project ID, no CSP change, no licence duty, PRIVACY.md unchanged.

## 7. Option table for the owner question

| | (a) sign-client + wc-client + QR encoder | (b) deep links + typed addresses | (c) @reown/appkit |
|---|---|---|---|
| New deps | 3 (+7 transitive from sign-client) | 0 | 1 (+13 transitive incl. viem) |
| gzip (lazy) | 118.2 + 30.0 + 8.8 kB | 0 | 271.9 kB |
| Licence | Community (500 MAU / 2.5M RPC, notice + licence copy + branding, Reown network only) | none | Community (same) |
| Project ID in bundle | yes + Reown account + origin allowlist | no | yes |
| CSP | ≥ relay wss/https ×2 + verify frame (exact min unverified) | none | 21 connect + 4 frame + img * + fonts + COOP header |
| PRIVACY.md | relay contact must be disclosed | unchanged | relay + pulse/analytics contact |
| Phone column | QR from desktop; mobile via relay | in-app browsers only | QR + modal |

## 8. Unreadable / 404 this run
- https://docs.keplr.app/api/mobile-deep-links/ and /api/mobile-deeplinks/ (404; the real page is /api/mobile/deeplink)
- https://raw.githubusercontent.com/reown-com/appkit/main/LICENSE (404)
- https://raw.githubusercontent.com/chainapsis/keplr-wallet/master/packages/wc-client/README.md (404)
- https://docs.reown.com/cloud/allowlist (404)
- https://docs.cdp.coinbase.com/wallet-sdk/v2.0.0/docs/deep-link-into-dapp-browser (404 after 307)
- https://docs.metamask.io/wallet/how-to/use-deeplinks/ and /sdk/concepts/deeplinks/ (no format on page)

## 9. Verify commands
```
curl -sL https://registry.npmjs.org/@walletconnect/sign-client/-/sign-client-2.26.0.tgz | tar -xzO package/LICENSE.md | /usr/bin/grep -n -E 'Release Date|Monthly (RPC|MAU) limit|Portions ©'
curl -sL https://registry.npmjs.org/@reown/appkit/-/appkit-1.8.24.tgz | tar -xzO package/LICENSE.md | /usr/bin/grep -n -E 'Release Date|Monthly (RPC|MAU) limit'
curl -s https://registry.npmjs.org/@keplr-wallet/wc-client/0.13.41 | python3 -c \"import json,sys;d=json.load(sys.stdin);print(d['license'],d['peerDependencies'])\"
curl -s 'https://bundlephobia.com/api/size?package=@reown/appkit@1.8.24'
curl -s -I -H 'Origin: https://zigoals.app' https://relay.walletconnect.org
git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:apps/web/lib/egress-policy.json
```

## GAP G07

Gap G07 is closed with measured figures, and one of its premises was wrong. The "29,952 B wc-client" number was NOT measured on the deprecated @walletconnect/client v1: bundlephobia's own JSON for `@keplr-wallet/wc-client@0.13.41` (fetched 2026-10-18T19:35:41Z) returns name/version 0.13.41, gzip 29,952 B, minified 131,442 B, with peerDependencies listed as @walletconnect/sign-client, @walletconnect/types and starknet (i.e. the v2 stack). bundlejs (esbuild, peers external) measures the same package at 25,040 B gzip / 108,782 B raw. The difference is tooling (webpack vs esbuild/tree-shaking), not version; 29,952 B is the conservative figure to budget. The npm registry confirms 0.13.41 is `latest` (published 2026-07-20T07:21:24Z), licence Apache-2.0, CJS only (`main: build/index.js`, no `module`), direct deps long, buffer, deepmerge, @keplr-wallet/types 0.13.41, @keplr-wallet/provider 0.13.41; its build also `require("events")` (Node builtin).

`@keplr-wallet/wc-qrcode-modal`: `latest` is 0.13.41 (published 2026-07-20T07:21:20Z), licence Apache-2.0, unpacked 45,442 B, deps qrcode.react ^3.1.0 and detect-browser ^5.3.0, peers react/react-dom `^16.8.0 || ^17 || ^18` and @walletconnect/{types,sign-client} ^2. bundlephobia returned 429 for it; bundlejs gives 55,137 B gzip with everything bundled and 10,090 B gzip (27,454 B raw) with react, react-dom and @walletconnect/* marked external — the 10,090 B figure is the one that applies on top of the app's shared React chunk. BUT the modal is not usable in this repo: origin/main `apps/web/package.json` pins react/react-dom 19.3.0, which is outside the modal's peer range, and the published `build/index.js` line 67 calls `react_dom_1.default.render(...)`. The installed react-dom@19.3.0 (working-tree node_modules/.pnpm) exports no `render` — only `createRoot` in `cjs/react-dom-client.production.js:18577` — so the modal's `open()` throws at runtime regardless of peer warnings. The modal's only API is `KeplrQRCodeModalV2(signClient, uiOptions)` with `connect(chainIds)`, `open(uri, cb)`, `close()`; its value is a hard-coded cosmos namespace proposal (methods cosmos_getAccounts/signDirect/signAmino, keplr_* , events accountsChanged/chainChanged/keplr_accountsChanged, chains `cosmos:<chainId>`), which is ~40 lines to replicate.

QR encoder: `qrcode@1.5.4` is `latest` (2024-08-05), MIT, bundlephobia 8,750 B gzip / 23,456 B min (browser entry; bundlejs 9,741 B); its yargs/pngjs deps are Node-only CLI/server paths not pulled by the browser build per bundlephobia's dependency list (qrcode + dijkstrajs only). `qrcode.react@4.2.0` is `latest`, ISC, peer react `^16.8.0 || ^17 || ^18 || ^19`, bundlejs 9,320 B gzip, zero deps; 3.1.0 (what the modal pins) excludes React 19.

Budget read: wc-client 29,952 B + qrcode 8,750 B (or qrcode.react 9,320 B) = ~38.7–39.3 kB gzip, inside the stated 45.6 kB headroom for /app/staking, with ~6 kB left, before sign-client (118,178 B) which is a peer and must be loaded anyway. The Keplr modal package should be dropped from the dependencies table (React 19 incompatible) and replaced by an in-house modal using qrcode or qrcode.react@4.2.0.

# GAP G07 — gzip sizes and versions for the lighter Keplr WalletConnect path

Measured 2026-10-18T19:35–19:37Z from the owner's Mac with `curl -s -m 20`. Read-only; no installs, builds or edits. All sizes are bytes as returned by the tool named.

## 1. Headline table

| Package | Version (npm `latest`) | Published | Licence | gzip (bundlephobia) | gzip (bundlejs, esbuild) | Peer deps | Verdict |
|---|---|---|---|---|---|---|---|
| @keplr-wallet/wc-client | 0.13.41 | 2026-07-20T07:21:24Z | Apache-2.0 | **29,952 B** (min 131,442) | 25,040 B (raw 108,782) | @walletconnect/sign-client ^2, @walletconnect/types ^2, starknet ^8 | usable; CJS only |
| @keplr-wallet/wc-qrcode-modal | 0.13.41 | 2026-07-20T07:21:20Z | Apache-2.0 | 429 (rate-limited) | 55,137 B all-in; **10,090 B** with react, react-dom, @walletconnect/* external | react ^16.8\\|\\|^17\\|\\|^18, react-dom same, @walletconnect/types ^2, sign-client ^2 | **NOT usable on React 19** (calls `ReactDOM.render`) |
| qrcode | 1.5.4 | 2024-08-05T21:52:58Z | MIT | **8,750 B** (min 23,456) | 9,741 B (raw 25,025) | none | candidate encoder |
| qrcode.react | 4.2.0 | — | ISC | 429 (3.1.0) | 9,320 B (raw 25,109); 3.1.0 = 8,571 B | react ^16.8\\|\\|^17\\|\\|^18\\|\\|^19 (4.2.0); 3.1.0 excludes 19 | candidate encoder (React component) |
| detect-browser | 5.3.0 | — | MIT | — | — | — | only a modal dep; moot |

Budget: wc-client 29,952 + qrcode 8,750 = 38,702 B (or + qrcode.react@4.2.0 9,320 = 39,272 B) against the stated 45.6 kB headroom on /app/staking — fits with ~6 kB spare, using the larger (bundlephobia) wc-client figure. @walletconnect/sign-client (118,178 B gzip per the earlier phase) is a peer of both Keplr packages and is additional.

## 2. Was the 29,952 B figure measured on @walletconnect/client v1?

No. bundlephobia's response (2026-10-18T19:35:41Z), abbreviated:

```json
{\"name\":\"@keplr-wallet/wc-client\",\"version\":\"0.13.41\",\"size\":131442,\"gzip\":29952,
 \"assets\":[{\"gzip\":29952,\"name\":\"main\",\"size\":131442,\"type\":\"js\"}],
 \"dependencyCount\":5,
 \"dependencySizes\":[{\"approximateSize\":69956,\"name\":\"@keplr-wallet/provider\"},{\"approximateSize\":24743,\"name\":\"buffer\"},{\"approximateSize\":10752,\"name\":\"long\"},{\"approximateSize\":1386,\"name\":\"base64-js\"},{\"approximateSize\":812,\"name\":\"ieee754\"},{\"approximateSize\":6108,\"name\":\"@keplr-wallet/router\"},{\"approximateSize\":1546,\"name\":\"deepmerge\"},{\"approximateSize\":5236,\"name\":\"@keplr-wallet/types\"}],
 \"hasJSModule\":false,\"hasJSNext\":false,\"hasSideEffects\":true,\"isModuleType\":false,
 \"peerDependencies\":[\"@walletconnect/sign-client\",\"@walletconnect/types\",\"starknet\"],
 \"repository\":\"https://github.com/chainapsis/keplr-wallet.git\",\"scoped\":true}
```
Source: https://bundlephobia.com/api/size?package=@keplr-wallet/wc-client@0.13.41

The version field is 0.13.41 and the peers are the v2 sign-client; bundlephobia externalises peers, so the 29,952 B contains no WalletConnect code at all. The R4 LB7 doubt is resolved: the number stands, for 0.13.41.

bundlejs cross-check (https://deno.bundlejs.com/?q=@keplr-wallet/wc-client@0.13.41, 19:36:37Z): `{\"type\":\"gzip\",\"rawUncompressedSize\":108782,\"rawCompressedSize\":25040}`; identical with `config={\"esbuild\":{\"external\":[\"@walletconnect/sign-client\",\"@walletconnect/types\",\"starknet\"]}}` (19:37:04Z), confirming peers were not in the bundle either way.

## 3. @keplr-wallet/wc-client@0.13.41 registry facts

Source: https://registry.npmjs.org/@keplr-wallet%2Fwc-client/0.13.41 and https://registry.npmjs.org/@keplr-wallet%2Fwc-client (19:35:58Z)

- dist-tags: `{'next': '0.13.15-rc.1', 'latest': '0.13.41'}`; 0.13.41 time 2026-07-20T07:21:24.214Z
- license Apache-2.0; unpackedSize 96,533; `main: build/index.js`, no `module` (CJS only)
- dependencies: `long ^3||^4||^5`, `buffer ^6.0.3`, `deepmerge ^4.2.2`, `@keplr-wallet/types 0.13.41`, `@keplr-wallet/provider 0.13.41`
- peerDependencies: `starknet ^8`, `@walletconnect/types ^2`, `@walletconnect/sign-client ^2`
- build/index.js (25,233 B, the only JS file) direct requires: `@keplr-wallet/provider`, `buffer/`, `events`, `long` (https://unpkg.com/@keplr-wallet/wc-client@0.13.41/build/index.js, 19:37:17Z). `events` is a Node builtin — bundler fallback may be required in Next; untested.

## 4. @keplr-wallet/wc-qrcode-modal@0.13.41

Source: https://registry.npmjs.org/@keplr-wallet%2Fwc-qrcode-modal/latest (19:35:41Z)

```
0.13.41 Apache-2.0 unpackedSize=45442
dependencies: {'qrcode.react': '^3.1.0', 'detect-browser': '^5.3.0'}
peerDependencies: {'react': '^16.8.0 || ^17 || ^18', 'react-dom': '^16.8.0 || ^17 || ^18', '@walletconnect/types': '^2', '@walletconnect/sign-client': '^2'}
main: build/index.js  module: None  types: ./build/index.d.ts
dist-tags {'next': '0.13.15-rc.1', 'latest': '0.13.41'}; published 2026-07-20T07:21:20.526Z
```

Sizes (bundlephobia 429'd at 19:35:58Z):
- https://deno.bundlejs.com/?q=@keplr-wallet/wc-qrcode-modal@0.13.41 → `rawUncompressedSize 168511, rawCompressedSize 55137` (react, react-dom, qrcode.react, detect-browser all bundled; 0 warnings)
- same with `config={\"esbuild\":{\"external\":[\"react\",\"react-dom\",\"@walletconnect/sign-client\",\"@walletconnect/types\"]}}` → `rawUncompressedSize 27454, rawCompressedSize 10090` — the figure that applies on top of the app's React chunk.

Build contents (https://unpkg.com/@keplr-wallet/wc-qrcode-modal@0.13.41/build/?meta): index.js 3,365 B, modal.js 7,927 B, util.js 871 B (+ maps, d.ts). No README in the package (404).

Public API (build/index.d.ts):
```ts
export declare class KeplrQRCodeModalV2 {
    readonly signClient: SignClient;
    constructor(signClient: SignClient, uiOptions?: ModalUIOptions | undefined);
    connect(chainIds: string[]): Promise<SessionProperties | undefined>;
    open(uri: string, cb: any): void;
    close(): void;
}
```

build/index.js greps (19:37:17Z):
- L17 `const react_dom_1 = __importDefault(require(\"react-dom\"));`
- L27–43 `requiredNamespaces: { cosmos: { methods: [cosmos_getAccounts, cosmos_signDirect, cosmos_signAmino, keplr_getKey, keplr_signAmino, keplr_signDirect, keplr_signArbitrary, keplr_enable, keplr_signEthereum, keplr_experimentalSuggestChain, keplr_suggestToken], chains: chainIds.map(id => \\`cosmos:${id}\\`), events: [accountsChanged, chainChanged, keplr_accountsChanged] } }`
- L65 `wrapper.setAttribute(\"id\", \"keplr-qrcode-modal-v2\")`
- L67 `react_dom_1.default.render(react_1.default.createElement(modal_1.Modal, { uri, close: ... }))`
- build/modal.js requires: `./util`, `qrcode.react`, `react`

### React 19 incompatibility (decisive)
- origin/main `apps/web/package.json`: `\"next\": \"16.3.8\"`, `\"react\": \"19.3.0\"`, `\"react-dom\": \"19.3.0\"`; no @keplr-wallet/*, @walletconnect/* or qrcode* entries (git show, sha 4f9249561736fbe19305b426de82f5c91a24763d).
- Installed `node_modules/.pnpm/react-dom@19.3.0_react@19.3.0/node_modules/react-dom`: `grep -c '\\brender\\b' index.js cjs/react-dom.production.js` → 0 and 0; the only root export of that family is `exports.createRoot` at `cjs/react-dom-client.production.js:18577` (19:37:33Z).
- Therefore `KeplrQRCodeModalV2.open()` throws (`render is not a function`) under this repo's React, independent of the peer-range warning. The package must come off the dependencies table; its ~40-line namespace proposal (above) is the only thing worth copying.

## 5. QR encoders

qrcode@1.5.4 — https://bundlephobia.com/api/size?package=qrcode@1.5.4 (19:35:41Z):
```json
{\"name\":\"qrcode\",\"version\":\"1.5.4\",\"size\":23456,\"gzip\":8750,
 \"dependencyCount\":3,\"dependencySizes\":[{\"approximateSize\":23407,\"name\":\"qrcode\"},{\"approximateSize\":1076,\"name\":\"dijkstrajs\"}],
 \"hasJSModule\":false,\"isModuleType\":false,\"hasSideEffects\":true,\"repository\":\"https://github.com/soldair/node-qrcode.git\"}
```
Registry (https://registry.npmjs.org/qrcode/1.5.4, 19:35:58Z): MIT; deps `pngjs ^5.0.0, yargs ^15.3.1, dijkstrajs ^1.0.1` (pngjs/yargs serve the Node/CLI entry; bundlephobia's browser bundle lists only qrcode + dijkstrajs). dist-tags `{'beta': '0.8.2', 'latest': '1.5.4'}`, 1.5.4 published 2024-08-05T21:52:58.518Z. bundlejs: 9,741 B gzip / 25,025 B raw.

qrcode.react — registry (19:36:18Z): 3.1.0 ISC, peer `react ^16.8.0 || ^17.0.0 || ^18.0.0`, deps {}; 4.2.0 (latest) ISC, peer `react ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`, deps none. bundlejs (19:36:37Z): 3.1.0 → 8,571 B gzip / 22,739 B raw; 4.2.0 → 9,320 B gzip / 25,109 B raw. bundlephobia 429'd for 3.1.0.

detect-browser latest 5.3.0, MIT (https://registry.npmjs.org/detect-browser/latest, 19:36:18Z).

## 6. Licence evidence
Both Keplr packages: npm `license: Apache-2.0`. https://raw.githubusercontent.com/chainapsis/keplr-wallet/master/LICENSE → 404 (branch may not be `master`); not pursued further within the gap's time box.

## 7. Rate limits encountered
bundlephobia returned 429 on the 2nd and 4th calls within ~20 s (modal, qrcode.react@3.1.0); first and third calls succeeded. bundlejs answered every query (5–30 s each).

## 8. Recommendation for the dependencies table
- Keep `@keplr-wallet/wc-client 0.13.41 — Apache-2.0 — 29,952 B gzip (bundlephobia) / 25,040 B (bundlejs)`.
- Remove `@keplr-wallet/wc-qrcode-modal` (React ≤18 only; `ReactDOM.render`); note its namespace proposal for an in-house modal.
- Add one encoder: `qrcode 1.5.4 — MIT — 8,750 B` or `qrcode.react 4.2.0 — ISC — 9,320 B (bundlejs)`.
- State the measuring tool per row; do not mix bundlephobia and bundlejs numbers in one sum without saying so.

## GAP G09

The gap is real but its wording needs one correction. Both Keplr registry files (cosmos/zig-test.json for zig-test-2, cosmos/zigchain.json for zigchain-1) carry gasPriceStep low 2,500,000,000 / average 25,000,000,000 / high 50,000,000,000 azig, not 25e9/50e9 across the board: the registry's LOW equals the node minimum and the app's figure. The app's keplrChainInfo() (origin/main packages/chain-config/src/index.ts, lines 176-180) suggests low 2,500,000,000 / average 2,500,000,000 / high 4,000,000,000, and the unit test (index.test.ts L133-139) pins that, with a comment citing the node's minimum gas price. The node config endpoint on both networks returns minimum_gas_price "2500000000.000000000000000000azig" (read 2026-10-18T19:36Z), and the cosmos/chain-registry chain.json files for both networks agree with Keplr's registry (fixed_min 2.5e9, low 2.5e9, average 25e9, high 50e9).

Why the app's suggestion is a no-op: Keplr's own docs (docs.keplr.app/api/guide/suggest-chain) say that if the same chain is already added to Keplr, nothing will happen. zig-test-2 was added to Keplr's registry with a gasPriceStep on 2026-09-08 (commit 79b104d), so for any user whose Keplr already knows zig-test-2 the registry's steps are what Keplr shows. The wallet code (apps/web/lib/wallet.ts L58, wallet-link.ts L47) still calls experimentalSuggestChain(keplrChainInfo()) and the tests pin the call, so the app's 2.5e9/2.5e9/4e9 steps only ever matter for a Keplr install that has never seen zig-test-2, e.g. a non-Keplr provider or a fresh wallet.

What the transaction actually carries: wallet.ts L165-167 builds the fee with CosmJS calculateFee(Math.ceil(gas*1.3), GasPrice.fromString(TESTNET.gasPrice + "azig")) where testnet.json gasPrice is "2500000000" and validateNetworkConfig refuses any other value (index.ts L29). calculateFee (node_modules @cosmjs/stargate 0.38.1 build/fee.js L61-69) multiplies price by gas limit and ceils. So the review screen shows a fee at 2.5e9 azig/gas, and the signDoc handed to Keplr carries that fee. The app passes no KeplrSignOptions (no preferNoSetFee or defaultOptions anywhere in apps/web or packages); Keplr's sign docs define preferNoSetFee as "If true, the fee configured by the dApp will be prioritized over the fee set by the user", so under the default the user-side fee selection in Keplr's approval window can replace the dapp's fee. Exactly how Keplr's current extension pre-selects the fee when the dapp's price is below the registry average is not verified here.

The owner's testnet self-transfer (hash 53216EEF..., height 7812205, 2026-09-17T17:30:41Z) is confirmed on the chain: fee 2,741,875,000,000,000 azig for gas_limit 109,675 = exactly 25,000,000,000 azig/gas, i.e. the registry AVERAGE step, while gas_used was 89,869. That transfer was a plain send, so it demonstrates Keplr's own fee choice, not what the app's signing path produces.

Decision for the owner: (a) align keplrChainInfo() to the registry's steps (low 2.5e9 / average 25e9 / high 50e9) so the suggestion matches Keplr for fresh installs, and decide whether the CosmJS fee stays at the minimum (2.5e9, 10x cheaper, accepted by the public node minimum) or moves to the registry average (25e9, matching what Keplr itself paid); or (b) keep 2.5e9 everywhere and label the review screen "minimum network fee; your wallet may raise it". Either way the reserve check at wallet.ts L170-176 uses the dapp fee, so if Keplr raises the fee ten-fold the balance guard is ten times too small, as CHAIN_FEE_FINDINGS already warned. Setting preferNoSetFee: true via window.keplr.defaultOptions would make the dapp fee authoritative but is a behaviour change on the signing path (Tier 3).

# GAP G09 — Gas-step conflict and the hidden suggest-chain no-op

Read 2026-10-18T19:36–19:37Z (UTC). Repo truth: origin/main 4f9249561736fbe19305b426de82f5c91a24763d, read through git only. All network reads were GET/HEAD curl; nothing written, nothing signed.

## 1. What the app does today (origin/main)

### packages/chain-config/src/testnet.json
```json
{ "network": "testnet", "chainId": "zig-test-2",
  "rpcUrl": "https://testnet-rpc.zigchain.com", "restUrl": "https://testnet-api.zigchain.com",
  "grpcUrl": "grpc-t.zigchain.nodestake.org:443", "addressPrefix": "zig",
  "nativeAsset": { "symbol": "ZIG", "displayDenom": "ZIG", "baseDenom": "azig", "decimals": 18 },
  "gasPrice": "2500000000" }
```

### packages/chain-config/src/index.ts
- L29: `validateNetworkConfig` throws unless `n.gasPrice === "2500000000"` (the fee price is pinned by validation, not just by data).
- L176-180 (`keplrChainInfo()`):
```ts
feeCurrencies: [{ ...asset, gasPriceStep: { low: 2500000000, average: 2500000000, high: 4000000000 } }]
```
- Last change: 5db848f 2026-10-07T21:42:40Z "[TIER 3] (chain config): Session X Part 1 — zig-test-2 on zigchaind v5.1".
- index.test.ts L133-139 pins the same steps; its comment: "The node's minimum gas price is 2500000000azig (GET /cosmos/base/node/v1beta1/config, 2026-10-07): low and average sit at it."

### apps/web/lib/wallet.ts
- L58 `await keplr.experimentalSuggestChain(keplrChainInfo());` then `enable`, `getKey` (same in wallet-link.ts L47; wallet-guard.test.ts L39 and wallet-link.test.ts pin the call order).
- L132 dynamic imports `calculateFee, GasPrice` from `@cosmjs/stargate` (0.38.1), `SigningCosmWasmClient` from `@cosmjs/cosmwasm-stargate` (0.38.1), `cosmjs-types` 0.11.0.
- L163-167:
```ts
const gas = await client.simulate(owner, [message], "");
...
const fee = calculateFee(Math.ceil(gas * 1.3), GasPrice.fromString(TESTNET.gasPrice + TESTNET.nativeAsset.baseDenom));
```
- L170-176: reserve guard compares balance with `feeAmount + amount` and prints "Estimated network fee: … ZIG" using that dapp fee.
- Signer: `keplr.getOfflineSignerAuto(TESTNET.chainId)`; no `KeplrSignOptions`, no `window.keplr.defaultOptions` anywhere (`git grep -n -E 'preferNoSetFee|defaultOptions|signOptions' origin/main -- apps/web packages` = no matches).
- Only `MsgExecuteContract` is built today; no MsgDelegate / MsgVote code exists on origin/main (grep returned nothing), so the staking/vote steps are future work that would inherit this fee path.

### CosmJS fee maths (node_modules/.pnpm/@cosmjs+stargate@0.38.1/.../build/fee.js L61-69)
`calculateFee(gasLimit, gasPrice)`: amount = gasPriceAmount × Uint53(gasLimit), `.ceil()`; `gas = gasLimit.toString()`. So with price 2.5e9 and simulated gas g, fee = ceil(2.5e9 × ceil(1.3 g)) azig.

## 2. Registry and chain values (all read 2026-10-18T19:36Z)

| Source | low | average | high | notes |
|---|---|---|---|---|
| App keplrChainInfo() (index.ts L176-180) | 2,500,000,000 | 2,500,000,000 | 4,000,000,000 | suggested, see §3 |
| App CosmJS fee (testnet.json gasPrice) | 2,500,000,000 (single) | — | — | what goes in the signDoc |
| Keplr registry cosmos/zig-test.json (zig-test-2) | 2,500,000,000 | 25,000,000,000 | 50,000,000,000 | commit 79b104d 2026-09-08T14:19:08Z "feat(zigchain): add gasPriceStep to zig-test-2 fee currency" |
| Keplr registry cosmos/zigchain.json (zigchain-1) | 2,500,000,000 | 25,000,000,000 | 50,000,000,000 | commit bd8118f 2026-09-22T16:54:46Z "feat(zigchain): zigchain-1 v5.0.0 (azig, 18 decimals)" |
| cosmos/chain-registry testnets/zigchaintestnet/chain.json | 2,500,000,000 (fixed_min 2.5e9) | 25,000,000,000 | 50,000,000,000 | |
| cosmos/chain-registry zigchain/chain.json | 2,500,000,000 (fixed_min 2.5e9) | 25,000,000,000 | 50,000,000,000 | |
| Node config testnet-api.zigchain.com | minimum_gas_price "2500000000.000000000000000000azig" | | | GET 200, HEAD 501 |
| Node config api.zigchain.com | minimum_gas_price "2500000000.000000000000000000azig" | | | |

Correction to the gap wording: the registries do not say "25e9/50e9" for all steps; their LOW is 2.5e9 (equal to the app's value and the node minimum). The disagreement is on average (2.5e9 vs 25e9) and high (4e9 vs 50e9).

Keplr registry sample (zig-test.json, abbreviated):
```json
{"chainId":"zig-test-2","chainName":"ZIGChain Testnet",
 "rpc":"https://public-zigchain-testnet-rpc.numia.xyz","rest":"https://testnet-api.zigchain.com",
 "feeCurrencies":[{"coinDenom":"ZIG","coinMinimalDenom":"azig","coinDecimals":18,
   "coinImageUrl":"https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/zig-test/azig.png",
   "gasPriceStep":{"low":2500000000,"average":25000000000,"high":50000000000}}],
 "features":["cosmwasm"],"hideInUI":null}
```
Note the registry's rpc differs from the app's (numia.xyz vs testnet-rpc.zigchain.com); the app's own CosmJS client uses testnet.json's rpcUrl regardless, so this only affects Keplr's internal UI.

Keplr registry file naming: the files are `cosmos/zig-test.json` and `cosmos/zigchain.json`; `zig-test-2.json` / `zigchain-1.json` do not exist (404). Listed via https://api.github.com/repos/chainapsis/keplr-chain-registry/contents/cosmos.

Headers (2026-10-18T19:37Z): raw.githubusercontent.com → `access-control-allow-origin: *`, `x-frame-options: deny`, CSP `default-src 'none'; sandbox`. testnet-api.zigchain.com → `access-control-allow-origin: *`, `x-frame-options: SAMEORIGIN`.

## 3. Why the app's suggestion is a no-op for most users
Keplr docs, https://docs.keplr.app/api/guide/suggest-chain (200, 2026-10-18T19:36Z): experimentalSuggestChain "allows front-ends to request adding new Cosmos-SDK chains that aren't natively integrated"; "If the same chain is already added to Keplr, nothing will happen." zig-test-2 has been in Keplr's registry with gasPriceStep since 2026-09-08. Therefore for a Keplr that already knows zig-test-2 the app's 2.5e9/2.5e9/4e9 steps are never applied and Keplr's fee selector shows 2.5e9 / 25e9 / 50e9. The app's steps only reach a wallet that has never had zig-test-2 added (or a non-Keplr provider honouring the suggestion, e.g. the Leap path in wallet-menu.test.ts L32).

## 4. What Keplr does with the dapp's fee at signing time
Keplr docs, https://docs.keplr.app/api/guide/sign-a-message (200, 2026-10-18T19:37Z), `KeplrSignOptions`:
- `preferNoSetFee`: "If true, the fee configured by the dApp will be prioritized over the fee set by the user."
- `preferNoSetMemo`, `disableBalanceCheck` also listed.
The app passes no options (CosmJS's offline signer path calls signDirect without them), so the default applies and the user's fee selection in Keplr's window can take precedence over the dapp's 2.5e9-priced fee. What Keplr pre-selects in that window for a below-average dapp fee was NOT verified in this pass (would need a live sign or the extension source).

## 5. The owner's transfer, re-read from the chain
GET https://testnet-api.zigchain.com/cosmos/tx/v1beta1/txs/53216EEFF500DDD5D5A69B6EABF2E844ADC3988BE8D61CA277C1A979BCE5EA4C (2026-10-18T19:36Z):
```json
{"height":"7812205","gas_wanted":"109675","gas_used":"89869","timestamp":"2026-09-17T17:30:41Z",
 "fee":{"amount":[{"denom":"azig","amount":"2741875000000000"}],"gas_limit":"109675","payer":"","granter":""}}
```
2,741,875,000,000,000 / 109,675 = 25,000,000,000 azig/gas exactly = the registry AVERAGE step. This matches docs/verification/run8/CHAIN_FEE_FINDINGS.md (committed d806ae0, 2026-09-17T22:15:48+02:00), which already says: evidence of that transaction's selected price, not of a validator minimum; the reserve "can be ten times too small if a future wallet actually selects the observed higher price"; official setup docs name `minimum-gas-prices = "2500000000azig"`. Whether that transfer was made through Keplr's own send UI or the app is not derivable from the chain.

## 6. Unreadable
- https://docs.zigchain.com/about-zigchain/fees and /nodes-and-validators/setup-node: HTTP 403 to curl, with and without a Mozilla UA. Not re-read today; the 2.5e9 documented minimum rests on the 2026-09-17 repo note.
- https://docs.keplr.app/api/cosmjs and /api/guide/sign-transaction: 404 (pages moved).

## 7. Options for the owner decision (facts only, no recommendation)
A. Align steps to the registry (low 2.5e9 / average 25e9 / high 50e9) in keplrChainInfo() and index.test.ts; keep the CosmJS fee at 2.5e9 (node minimum) and label the review screen as the minimum network fee that the wallet may raise. Effects: suggestion matches Keplr for fresh installs; review fee still 10x below what Keplr's average would charge; reserve guard unchanged.
B. Align steps AND move testnet.json gasPrice to 25000000000 (requires changing validateNetworkConfig L29, testnet.json L14, index.test.ts fixtures). Effects: review fee and reserve match the registry average and the owner's observed transfer; fees are 10x the node minimum.
C. Keep everything at 2.5e9 and label. Effects: zero code change beyond copy; suggestion remains a no-op for existing Keplr users; mismatch with the Keplr fee selector persists.
Optional in any option: set `window.keplr.defaultOptions = { sign: { preferNoSetFee: true } }` so the dapp fee is prioritised; this is a Tier 3 signing-path change and its exact UI effect was not verified here.

## 8. Commands used
```
git -C /Users/AIUSER/Documents/ZIGoals-Claude grep -n -E 'calculateFee|GasPrice|gasPrice|gasPriceStep|experimentalSuggestChain' origin/main -- apps/web/lib packages/chain-config/src
git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:packages/chain-config/src/index.ts | sed -n '150,200p'
git -C /Users/AIUSER/Documents/ZIGoals-Claude show origin/main:apps/web/lib/wallet.ts | sed -n '125,185p'
curl -s -m 20 https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/cosmos/zig-test.json
curl -s -m 20 https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/cosmos/zigchain.json
curl -s -m 20 https://testnet-api.zigchain.com/cosmos/base/node/v1beta1/config
curl -s -m 20 https://testnet-api.zigchain.com/cosmos/tx/v1beta1/txs/53216EEF…EA4C
curl -s -m 20 "https://api.github.com/repos/chainapsis/keplr-chain-registry/commits?path=cosmos/zig-test.json&per_page=1"
```
