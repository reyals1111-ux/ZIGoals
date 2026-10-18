# Session AF — lane L2b (wallets, read-only tracking, multi-asset Add money, Goal Vaults)

Branch `af/wallet`, from `feature/session-af-wealth-unlocked` at `206a26c4` (Earn hub, verified link registry and Checklist
merged). Server port 3104 only. Every build, Playwright run and screenshot under `$HOME/zigoals-af/bin/with-lock.sh` +
`tmo.sh`. Nothing pushed. This file is the lane's running record for the lead; it is updated with every step's commit.

## Status by step (brief order)
| # | Step | State |
|---|---|---|
| 1 | `TIER 3 (wallet)`: real read-only connections (EIP-6963 six wallets, Solana Wallet Standard, phones' in-app browsers, WalletConnect "available soon") | done |
| 2 | `TIER 3 (storage)`: linked-wallets `chains`/`via`/kind `solana`; `zigoals:wallet-balances:v1` | done |
| 3 | `TIER 3 (CSP)` + read-only tracking (browser-direct readers, pricing, What you have) | done |
| 4 | Multi-asset Add money | done (codes/routes rows wait for the Part 0 docs, listed below) |
| 5 | `TIER 3 (dependencies)`: `@walletconnect/sign-client` 2.26.0 | pending |
| 6 | Goal Vaults | pending |

## Step 1 — real read-only connections (`TIER 3 (wallet)`)
- `lib/wallets/eip6963.ts`: the six R4 wallets by rdns (MetaMask `io.metamask`, Rabby `io.rabby`, Coinbase Wallet
  `com.coinbase.wallet`, Trust `com.trustwallet.app`, OKX `com.okex.wallet`, Phantom `app.phantom`); discovery and linking stay
  AE's raw EIP-6963 + one `eth_requestAccounts` (lib/wallet-link.ts, unchanged); a wallet that is not installed gets its
  official site only.
- `lib/wallets/solana-link.ts`: the Wallet Standard's two-event handshake by hand (listen `wallet-standard:register-wallet`,
  dispatch `wallet-standard:app-ready` with `{register}`), wallets with `solana:mainnet` and `standard:connect` only (at most 8,
  one per name, plain-text names, data: icons only); linking = `standard:connect` → first account, 32-byte base58
  (`isSolanaAddress` added to lib/wallet-address.ts with the kind `solana`); Remove calls the wallet's own
  `standard:disconnect`, best effort.
- Phones (Status & wallet sheet): "Open ZIGoals in MetaMask" (`https://link.metamask.io/dapp/<host>/app`) and "Open ZIGoals in
  Trust Wallet" (`https://link.trustwallet.com/open_url?coin_id=60&url=…`, Trust's documented form), beside L2a's "Open
  ZIGoals in Keplr" once merged; the honest line "WalletConnect (Trust, Ledger Wallet, Keplr Mobile without its own
  browser): available soon on phones." while `reownProjectId` is null (H6). Keplr's own button and flow unchanged (H87).
  Leap and Cosmostation unchanged (ended, link-only). Bitcoin typed as today. Remove per linked wallet = its disconnect.
- `apps/web/config/public-integrations.json` (H90: `{schemaVersion:1, reownProjectId:null, rampHostApiKey:null,
  rampHostAppName:"ZIGoals", banxaPartnerRef:null}`) + `lib/public-integrations.ts` (zod, strict, public-ID shapes only);
  the repository's secret scan runs on the file in its test.
- Links read once with curl (2026-10-18 22:22 UTC, one GET, browser user agent): metamask.io 200, rabby.io 200,
  www.coinbase.com/wallet 403 (bot wall; AE's URL kept), trustwallet.com 200, www.okx.com/web3 301 → web3.okx.com 200
  (the latter is used), phantom.com 200, link.metamask.io/dapp/alpha.zigoals.app/app 307 (to MetaMask's download page
  outside a phone), link.trustwallet.com/open_url?coin_id=60&url=… 200, Trust's deeplinking page 200 (documents
  `open_url?coin_id=60&url=`).

## Step 2 — storage (`TIER 3 (storage)`)
- `zigoals:linked-wallets:v1` (no v2): only the kind `'solana'` and two optional entry fields `chains?: string[]` (CAIP-2
  style ids, at most 16, shown only when well formed, each once) and `via?: 'extension'|'in-app-browser'|'walletconnect'|'typed'`
  (a value this build does not know is kept and not shown); `withChains` changes one wallet's chains. Max 12, Export, erase,
  never synced, never restored: unchanged.
- **Frozen-reader proof** (`lib/wallets/frozen-readers.test.ts`): `lib/wallets/frozen-ae-4f92495/` holds byte-exact copies of
  the four files Alpha #44 (main 4f92495) reads the record with (their blob ids are checked in the test). This build writes
  a cosmos (`via`), an EVM (`via` + `chains`) and a Solana entry; AE's own modules read it (Solana hidden, the others shown
  with AE's fields only), write a display choice, a selection, a new link and a removal, and every entry and field of this
  build survives; this build reads it all back.
- New `zigoals:wallet-balances:v1` (`lib/wallets/balances/store.ts`, key in `lib/af-wallet-keys.ts`): the last read per
  wallet x chain (`{walletId, chainId, at?, height?, assets?[{id, symbol, decimals, amount}], error?, errorAt?}`, at most
  200, amounts as integer strings); a failed read keeps the last good amounts with their own time and adds the reason, never
  0; a wallet never read has no observation; unreadable bytes are never overwritten; Remove (and "Forget balances") clears
  a wallet's observations. Personal, device-only, never synced, never restored, in Export, erased.

## Step 3 — CSP and read-only tracking
**Preflights first (H50), 2026-10-18 22:36 UTC**, `curl -X OPTIONS -H 'Origin: https://alpha.zigoals.app'
-H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'` to each host's `/`:
| host | answer |
|---|---|
| cosmos-rest.publicnode.com | 204 · allow-origin `*` · methods GET,HEAD,OPTIONS,POST · headers content-type · max-age 172800 |
| ethereum-rpc.publicnode.com | 204 · same |
| arbitrum-one-rpc.publicnode.com | 204 · same |
| base-rpc.publicnode.com | 204 · same |
| optimism-rpc.publicnode.com | 204 · same |
| polygon-bor-rpc.publicnode.com | 204 · same |
| bsc-rpc.publicnode.com | 204 · same |
| solana-rpc.publicnode.com | 204 · same |
| mempool.space | 405 on `/` (no CORS preflight support), but the app's reads there are plain GETs with no header (no preflight): `GET /api/address/<addr>` with Origin answered 200 · allow-origin `*` |
Cosmos REST is also read with a plain GET (no preflight): `GET …/balances/<cosmos1>/by_denom?denom=uatom` with Origin → 200 ·
allow-origin `*`. **No host was dropped.** One method was: PublicNode's Solana RPC refuses the indexed
`getTokenAccountsByOwner` ("Indexed requests require a personal token") and `getTokenLargestAccounts` ("Request blocked"),
so USDC/USDT on Solana are read from the person's **associated token accounts**, derived on the device
(`lib/wallets/balances/solana-ata.ts`: PDA of [owner, Token program, mint] under the ATA program, SHA-256 + the ed25519
curve test, no dependency) and read with `getMultipleAccounts` (non-indexed, accepted). Verified once live: an exchange
wallet's derived USDC and USDT accounts exist with that owner and mint. The page says tokens are read from the standard
(associated) accounts. JSON-RPC batches are accepted by every PublicNode host (one POST per chain).

**CSP** (`TIER 3 (CSP)`, `bba98249`): `egress-policy.json` `csp.app.connect` gains exactly the nine H16 (d) balance hosts
after the existing app sources; site documents unchanged; `public-safety.test.ts` CONNECT_SOURCES and `csp-compose.test.ts`
per-mode policies updated at equal strength (+ "api.zigchain.com is not in connect-src"). L2a adds `https://rpc.zigchain.com`
to `chainOrigins` on its branch: the two exact lists conflict at merge (expected; the merged list is L2a's with these nine
appended after `https://api.spotify.com`).

**Readers** (`lib/wallets/balances/`): `chains.ts` (the fixed registry, H64: native coin per chain; Circle USDC on Ethereum,
Arbitrum, Base, OP Mainnet, Polygon, Solana; Tether USDT where Tether issues it — Ethereum and Solana per
tether.to/en/supported-protocols read 2026-10-18 22:37 UTC; BNB Chain's Binance-Peg USDC labelled so and never priced as
Circle's, H56; ZIGChain ZIG + stZIG); `http.ts` (the only `fetch`: exact origins, `credentials:'omit'`, no referrer, no
redirect, no cache, 12 s, 64 KiB, POST with content-type only, GET with no header); `evm.ts` (one batch: `eth_getBalance`,
`eth_call` Multicall3 `aggregate3` of `balanceOf`, `eth_blockNumber`); `abi.ts` (aggregate3 hand-encoded and byte-tested,
live-checked once on all six chains); `solana.ts` + `solana-ata.ts`; `bitcoin.ts` (mempool.space confirmed sats);
`cosmos-hub.ts` (the zig1 key's `cosmos1` twin, same 20 bytes, coin type 118); `zigchain.ts` (the `/api/positions` relay only:
liquid, staked, rewards waiting, unbonding, stZIG); `read.ts` (due when older than 15 min or on Refresh, one read in flight
per wallet × chain, each address only to its own chain's reader); `pricing.ts` (one deduplicated list of ≤ 10 CoinGecko ids
through `useMarketQuotes`, exact cents, "unavailable" with the reason, never 0); `units.ts`.
`zigoals:wallet-balances:v1` gains an optional `missing` list (tokens a read could not get; additive, same commit series).

**UI**: `components/wallet/wallet-holdings.tsx` (lazy) in Wealth's "What you have" (wallet chips, chain chips, rows with
chain, amount, value or "Value unavailable · reason", read time, block/slot and source; the total of known values with
"N values unavailable (not counted)" and "prices as of"; Refresh; "Forget this wallet's balances"; failures with the kept
reading) and as Portfolio's "From your wallets" strip; both render nothing until a wallet is linked and nothing in the
Showcase (no market request there). Wealth's holdings header gains "Add money →". Today's wallet card: a linked wallet's
line now says where its balances are and links there (the card still reads nothing).

**Live check (one-off, not tests)**: the encoder against PublicNode on the six EVM chains (2026-10-18 22:38 UTC), owner = each
chain's USDC contract: all six answered 200 with ACAO `*`; nonzero token balances decoded on Ethereum (USDT) and BNB Chain.

## Step 4 — multi-asset Add money (owner amendment 2)
- `lib/onramps/assets.ts`: the asset × network × provider table — USDC (Base recommended; Ethereum, Arbitrum, OP Mainnet,
  Polygon, Solana), USDT (Solana recommended; Ethereum — only where Tether itself issues it), ETH (Base recommended;
  Ethereum, Arbitrum, OP Mainnet), SOL (Solana), BTC (Bitcoin), ATOM (Cosmos Hub), ZIG via ATOM (Cosmos Hub, then IBC + swap).
  Each network maps to a tracked chain (lib/wallets/balances/chains.ts) so the return page can watch the money arrive. Every
  code has a status and source: Ramp `swapAsset` = CHAIN_SYMBOL from Ramp's live v3 list (2026-10-18 23:10 UTC; ETH_ETH,
  BTC_BTC, BASE_USDC `documented` in Ramp's docs, the rest `inferred`), Banxa `coinType`/`blockchain` `documented` from
  docs.banxa.com's table (2026-10-18 23:11 UTC: USDC on ETH/BASE/ARB/OPTIMISM/MATIC/SOL, USDT on ETH/SOL, ETH on
  ETH/BASE/ARB/OPTIMISM, SOL/SOL, BTC/BTC, ATOM/ATOM). Nothing is `confirmed` (no checkout seen).
- `lib/onramps/guard.ts` (network-mismatch guard): an address only from a linked wallet whose kind matches the network (EVM
  wallets limited to their tracked chains), Cosmos Hub = the linked zig1 key's `cosmos1` twin; never typed, never `zig1`,
  never a ZIGoals address (none exists; a test scans the files for any address literal).
- `lib/onramps/urls.ts`: Ramp hosted (`hostApiKey`, `hostAppName`, `hostLogoUrl` = `<origin>/apple-touch-icon.png`,
  `swapAsset` + `defaultAsset`, `userAddress`, `finalUrl`) and Banxa referral (`coinType`, `blockchain`, `walletAddress`,
  `fiatType`, `returnUrl`); the return address carries provider, asset, network and the wallet's local id only — never the
  address; with the committed empty IDs each provider links its plain site (`https://rampnetwork.com/`,
  `https://banxa.com/`), nothing pre-filled, and the page says so; sandbox hosts only in tests.
- `apps/web/config/public-integrations.json` + `lib/public-integrations.ts` (step 1): where the owner pastes
  `rampHostApiKey`, `banxaPartnerRef` (and `reownProjectId`, step 5).
- `GET /api/onramps/ramp-assets?currency=EUR|USD` (`TIER 3 (egress routes)`): server-only egress to
  `https://api.rampnetwork.com` (one plain GET, no person's data), the offered assets' minimum, maximum and network fee plus
  the global fee range, `source` and `asOf`; cached 1 h, last-good up to 24 h on failure, failure memory 60 s, 12 upstream
  loads/h/instance, 30 requests/min/client (429 + Retry-After), strict query (400), HTTP 200 + `status:'unavailable'` +
  reason on failure (H58). Recorded fixture `lib/onramps/fixtures/ramp-assets-2026-10-18.json` (one real read, reduced).
- Pages `/app/wealth/add-money` (five steps: what to buy with plain words and "What's this?"; which network with the
  recommendation in words, Ramp's own network fee where read, the big "your wallet must be on this network" warning; where
  it arrives or "link a wallet for this network first"; Ramp with its live figures and "as of" / Banxa "fees shown on Banxa's
  page", with each provider's ESMA register entry; the hand-off anchor, new tab, `rel="noopener noreferrer"`) and
  `/app/wealth/add-money/back` (what happens next, in each provider's own published times; a balance watch on that one
  wallet and network through the Part 3 readers — once a minute while visible, up to 2 h, "Read now" — until the amount
  grows, then "It now shows in Wealth → What you have"; "What can I do with it now?"). The honest line on every step.
- "What can I do with it now?" (`lib/onramps/next-steps.ts`): stablecoins — what one is, the issuer, depeg and network
  risks (+ issuer link); swap (Uniswap / Jupiter); bring to ZIGChain — ATOM over IBC (channel-1555 ↔ channel-4) with ZIGChain
  Hub's bridge (registry) or Skip Go, then the OroSwap swap (registry); USDC/USDT/ETH "no recommended route yet" with the
  Noble wind-down and the 139.57-USDT pool said plainly; earn (`/app/earn`, `/app/staking`). Every link from the registry or
  the lane rows.
- Entry points: Wealth's holdings header ("Add money →"), the wallet holdings block ("+ Add money"), Today's wallet card for
  a linked wallet ("+ Add money").

**Rows waiting for docs/earn/af/ONRAMP_CODES.md and ROUTES_ONTO_ZIGCHAIN.md** (not on the feature branch when this was
built): every Ramp code marked `inferred` (12 of 15: ETH_USDC, ARBITRUM_USDC, OPTIMISM_USDC, MATIC_USDC, SOLANA_USDC,
SOLANA_USDT, ETH_USDT, BASE_ETH, ARBITRUM_ETH, OPTIMISM_ETH, SOLANA_SOL, COSMOS_ATOM) and all 32 Banxa values (`documented`
from the public table, not seen in a checkout) — one edit of each `status` in `lib/onramps/assets.ts`; the `bridge` guides
of USDC, USDT and ETH in `lib/onramps/next-steps.ts` ("no recommended route yet") — replace each with the recommended route,
its steps, time and fees once the routes doc lands; Banxa's `returnUrl` vs `redirectUrl` naming (R3 §12.3).

## What the lead must wire
- **Verified link registry rows** (L1's `packages/ecosystem-registry` providers.json + verified-links.ts; this lane keeps
  them in `apps/web/lib/wallets/links.ts` in the registry's record shape until moved): `metamask-site`, `rabby-site`,
  `coinbase-wallet-site`, `trust-site`, `okx-wallet-site`, `phantom-site`, `metamask-dapp` (prefix), `trust-dapp` (prefix).
  When moved, `lib/wallets/links.ts` can re-export them from the registry; `lib/wallets/connections.test.ts` already accepts
  either source.
- **Storage rows** (`lib/af-wallet-keys.ts` exports each list): `lib/onboarding.ts` `DEVICE_RECORD_KEYS += WALLET_PERSONAL_KEYS`
  (+ `onboarding.test.ts` literals); `lib/export/everything.ts` `DEVICE_KEYS += WALLET_EXPORT_KEYS`;
  `lib/data-health/catalog.ts` `DEVICE_LABELS += WALLET_CATALOG_LABELS`; `lib/aa-device-forget.ts` erase `+= WALLET_ERASE_KEYS`;
  `lib/restore/plan.ts` `NEVER_RESTORED += WALLET_NEVER_RESTORED`; `lib/vault/frozen-fixtures.test.ts`: a
  `zigoals:wallet-balances:v1` record (schema `walletBalancesSchema`, `lib/wallets/balances/store.ts`) and, in the
  linked-wallets fixture, one entry `{kind:'solana', address:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', via:'extension'}`
  and `chains:['eip155:8453']` on the EVM entry (the AE-build check `expect:{display:'USD'}` stays).
- **Hosted verifier** (H16 (e), `TIER 3 (verifier/CI)`): its origin allowlist gains the nine balance hosts in the same merge
  as this CSP change. Note: the browser reads them only when a wallet is linked, so the verifier's own runs (no linked
  wallet) should see none of them.
- **docs/PRIVACY.md** (P3.12, H16 — not this lane's file): replace the linked-wallets paragraph with:
  > **Balances of linked wallets** (Session AF). When you open Wealth or Portfolio with a wallet linked, your browser asks
  > a public blockchain service directly for that address's balances, each address only at its own chain's service:
  > PublicNode (publicnode.com, run by Allnodes) for Cosmos Hub, Ethereum, Arbitrum, Base, OP Mainnet, Polygon, BNB Chain and
  > Solana, and mempool.space for Bitcoin. Each of them sees your IP address and the public address asked about; PublicNode
  > says it keeps nothing longer than 24 hours and does not link addresses to IPs; mempool.space keeps its web-server logs
  > for 10 days. ZIGoals' servers are not involved for those chains and keep nothing. ZIGChain balances and staking are
  > read through ZIGoals' own read-only relay, which reads at one block height, caches for 60 seconds, limits reads and logs
  > no address. Prices come from ZIGoals' market service as before (public coin names only, never your address). The
  > balances last read stay on this device only (never synced, never restored from a backup, in Export everything).
- **Weight**: Wealth and Portfolio gain only a lazy chunk (`components/wallet/wallet-holdings.tsx`); report its gzip size
  beside the page figures (H54).
- **Theme sheets**: regenerate (new `components/wallet/wallet-holdings.css`).
- `scripts/sanitize-alpha-tail.mjs` `API_ROUTES`: add `/api/onramps/ramp-assets` (its test walks `app/api`; it already
  fails on the feature branch for the four `/api/earn/*` routes).
- `apps/web/lib/egress-policy.json` `serverOnly`: a note `rampAssets` — `https://api.rampnetwork.com`, reached only by
  `/api/onramps/ramp-assets` (`lib/onramps/server/ramp-assets.ts`, `RAMP_EGRESS`). No CSP change (H89).
- `scripts/weight-budgets.json`: lines for `/app/wealth/add-money` and `/app/wealth/add-money/back` (measured + 10 %).
- Navigation / search / Help: `/app/wealth/add-money` ("Add money") under Wealth; the Earn path's step 3 links to it (L1).
- Theme sheets: regenerate (new `components/add-money/add-money.css`).
- After merging L2a: put L2a's "Open ZIGoals in Keplr" (`keplrMobileLink`) as the first item of
  `components/wallet/phone-wallet-paths.ts`'s group.

## Assertions changed
- `apps/web/lib/public-safety.test.ts` exact CONNECT_SOURCES and `apps/web/lib/csp-compose.test.ts` exact per-mode policies:
  the nine balance hosts appended on /app documents (equal strength, exact lists; one new negative assertion).
- `apps/web/tests/wallet-menu.spec.ts` and `apps/web/lib/wallet-card.test.ts` (AE): the linked wallet's line on Today's card
  was "Balance tracking arrives with the staking session."; now "Its balances, read-only, are in Wealth → What you have."
  plus the link's href. Equal strength: both still assert no balance and no currency switch on the card and no request.
- `apps/web/lib/wallet-menu.test.ts` (AE): the exact list of menu items gains `Get Trust Wallet`, `Get OKX Wallet`,
  `Get Phantom` (after AE's three) and the Solana group's `Get Phantom for Solana`; still an exact, ordered list (equal
  strength). Reason: the brief's six R4 wallets and the Solana group.

## Tests
Step 4: unit — `lib/onramps/{onramp-assets,onramp-urls,ramp-assets-route}.test.ts` (20) + the wallet set: 11 files, 58
passed before the last additions; browser (3104, dev) — `tests/add-money.spec.ts` + `tests/webkit-add-money.spec.ts` in
Chrome (12 passed), `tests/webkit-add-money.spec.ts` in WebKit at 390 × 844 (2 passed). `scripts/sanitize-alpha-tail.test.mjs`
fails until the lead adds the route to `API_ROUTES` (expected; it already failed for the Earn routes).
Step 3: unit — `lib/wallets/balances/{hosts,readers,pricing,store}.test.ts` + the step 1–2 set + `public-safety`,
`csp-compose`, `wallet-card`: 14 files, 104 passed. Browser (3104, dev, `--workers=2`, under the lock):
`tests/wallet-tracking.spec.ts` + `tests/wallet-menu.spec.ts` (18: 15 passed, 3 skipped by design), then the Wealth/Portfolio
neighbours `persona-z`, `session-ac`, `holdings-import`, `phone-pages`, `portfolio-v2` (98: 92 passed, 5 skipped; the one
failure — portfolio-v2's "Showcase asks no market" — was this lane's: the holdings chunk mounted a market hook with no
wallet; fixed by rendering nothing first, then 22/22 incl. the spec re-run).
Step 2: the step 1 set + `lib/wallets/frozen-readers.test.ts`, `lib/wallets/balances/store.test.ts`,
`lib/wallets/wallet-menu-solana.test.ts` (jsdom: a fake Wallet Standard wallet links with `standard:connect` only; Remove
calls `standard:disconnect` and forgets its balances) and `lib/vault/frozen-fixtures.test.ts`: 12 files, 58 passed.

Step 1
`pnpm exec vitest run apps/web/lib/wallet-guard.test.ts apps/web/lib/wallets apps/web/lib/linked-wallets.test.ts
apps/web/lib/wallet-link.test.ts apps/web/lib/wallet-menu.test.ts apps/web/lib/wallet-card.test.ts
apps/web/lib/public-integrations.test.ts`: 48 passed. `wallet-guard.test.ts` gains the Solana side (a new describe block;
AE's three tests untouched): lib/wallets files name no signing/sending/permission method, make no request, and call exactly
`standard:connect` and `standard:disconnect`; no `solana:sign…` anywhere in the wallet files or components.
