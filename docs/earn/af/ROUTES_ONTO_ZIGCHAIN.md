# Routes onto ZIGChain — USDC, USDT, ETH, ATOM and native ZIG (Session AF Part 0, owner amendment 2)

> Read on 2026-10-18 between 22:18 and 22:50 UTC (00:18–00:50 Brussels on 2026-10-19) by the Part 0 research helper. Chain reads are GET
> requests to `https://api.zigchain.com` (mainnet `zigchain-1`, heights 13,046,686–13,046,923); Skip Go answers are route **quotes** from
> `https://api.skip.build/v2/fungible/route` — that endpoint only takes POST, so the quotes were read-only POSTs with no key, no address and nothing
> created (the lead's brief names this endpoint; every other read was a GET). No wallet was connected and nothing was signed. Research only: not
> legal, tax or financial advice; no endorsement, no partnership. Figures are as read and move with every block; "computed" marks arithmetic on
> read figures; "inference" marks a conclusion not read directly. Raw answers: the helper's scratchpad (`raw/skip-routes/route-*.json`,
> `raw/chain/*.json`), not committed.

## The answer per asset

| Asset | Recommended route tonight | Signatures | Time (Skip's estimate) | Fees as returned | Arrives on ZIGChain as | Thin or winding down? |
|---|---|---|---|---|---|---|
| **USDC** | USDC on **Base** (or Arbitrum / Ethereum) → **Skip Go**: Circle CCTP V2 to Injective → IBC Injective `channel-456` → ZIGChain `channel-12` | 2 (EVM wallet on Base, then Keplr on Injective) | 1,110 s (~18.5 min) | smart-relay 0.000466 USDC; plus Base gas and Injective gas (not quoted) | **USDC.inj** `ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B` | OroSwap USDC.inj/ZIG holds 10,590.99 USDC.inj + 212,238.77 ZIG (a quarter of the old USDC.n pool) |
| **USDT** | USDT on **Ethereum** → **Skip Go**: IBC Eureka to Cosmos Hub → IBC Hub `channel-1555` → ZIGChain `channel-4` | 1 (EVM wallet on Ethereum) | 1,230 s (~20.5 min) | smart-relay 0.200157 USDT; plus Ethereum gas | **USDT (Eureka)** `ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9` | **very thin**: the only pool holds 139.57 USDT; 100 USDT → ZIG returns 41.8 % below the pool's mid price |
| **ETH** | ETH on **Ethereum** → **Skip Go limited to Eureka**: wrap to WETH → Eureka → Hub → ZIGChain `channel-4` | 1 (EVM wallet on Ethereum) | 1,230 s (~20.5 min) | smart-relay 0.0000836 WETH (≈ $0.20 per Skip); plus Ethereum gas | **ETH (Eureka WETH)** `ibc/5E970F9FF7B696B42F75B92CC05A74B9C44AB0B5D231FBE794A29D74344B19D7` | **very thin**: pool 0.082 ETH + 3,744 ZIG; 0.04 ETH → ZIG returns 32.9 % below mid; Skip's default answer refused this route (below) |
| **ATOM** | ATOM on **Cosmos Hub** → plain IBC Hub `channel-1555` → ZIGChain `channel-4` (Keplr's own IBC send, Skip Go, or the ZIGChain Hub bridge) | 1 (Keplr on Cosmos Hub) | 30 s | none quoted; Hub gas in ATOM | **ATOM** `ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0` | pool 2,366.21 ATOM + 81,145.66 ZIG (1 bps fee): 6 ATOM → 205.22 ZIG, 0.26 % below mid |
| **ZIG** (native `azig`) | from **ERC-20 ZIG on Ethereum**: Axelar → ZIGChain `channel-1`, where the chain's token wrapper hands out native ZIG (ZIGChain Hub bridge or Skip Go) — from a **card**: route B (buy ATOM → IBC → OroSwap ATOM/ZIG) | 1 (Ethereum) / 2 after the card purchase (Hub IBC send, ZIGChain swap) | 960 s (~16 min) for Axelar | Axelar 0.0000478 ETH (≈ $0.11 per Skip) / the ATOM route's costs + 1 bps swap fee | **`azig`** (18 decimals) | the wrapper module held 193,590,281 native ZIG to hand out; a card route ends with a swap that **needs ZIG for gas** (open problem, below) |

**USDC.n (Noble) is not recommended for new money.** Circle's post of 10 Sep 2026 (read 22:32:40Z): "New minting of USDC on Noble through
Circle Mint will be disabled on October 13, 2026. Redemptions from Noble via Circle Mint remain available until January 12, 2027, when the Noble
USDC contract and CCTP routes will be fully paused"; "CCTP V1 burn limits will gradually reduce to zero beginning October 31, 2026"; "After
December 1, 2026, CCTP exits may be limited to destination chains that continue to support CCTP V1 burns"; "The manual redemption process
begins January 13, 2027" (https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble). Skip Go's own page showed
a card "Noble USDC.n Is Being Deprecated — Migrate to USDC.inj — Migrate Now" at 22:29:51Z (capture `skip-go/home-1440.png`). Secondary press
(CryptoSlate, 11 Sep 2026, read ≈22:46Z) lists ZIGChain among the chains of the first USDC.n → USDC.inj migration flow through Skip:Go, with
"one transaction on the origin chain and another on Injective" (https://cryptoslate.com/circles-noble-shutdown-leaves-cosmos-racing-to-move-92-million-in-usdc/).
Skip still routes USDC to USDC.n tonight (fast, below), which is exactly why ZIGoals must not pick it by default.

## The channels and assets on ZIGChain (read 22:30:04–22:30:13Z, height 13,046,699)

`GET https://api.zigchain.com/ibc/core/channel/v1/channels`, then each transfer channel's `/client_state` and `/ibc/core/client/v1/client_status/<client>`.

| ZIGChain channel | Counterparty | Chain | Connection / client | Client status | What arrives |
|---|---|---|---|---|---|
| `channel-0` | `channel-180` | axelar-dojo-1 | connection-0 / 07-tendermint-0 | **Expired** | nothing usable (channel OPEN, client expired) |
| `channel-1` | `channel-182` | axelar-dojo-1 | connection-1 / 07-tendermint-1 | Active | ZIG.axl (`unit-zig`) — the token wrapper's channel; a little AXL |
| `channel-2` | `channel-184` | axelar-dojo-1 | connection-2 / 07-tendermint-2 | **Expired** | nothing usable |
| `channel-3` | `channel-175` | noble-1 | connection-3 / 07-tendermint-3 | Active | USDC.n — Circle is winding Noble down (above) |
| `channel-4` | `channel-1555` | cosmoshub-4 | connection-4 / 07-tendermint-4 | Active | ATOM, stATOM, and every IBC Eureka asset (USDT, ETH, WBTC, EURC, SolvBTC …) |
| `channel-12` | `channel-456` | injective-1 | connection-5 / 07-tendermint-5 | Active | USDC.inj, INJ |

All six are `STATE_OPEN` / `ics20-1`; `icahost` channels 5–11 come from Cosmos Hub controllers. **There is no Osmosis channel**: Skip's routes
from Osmosis go through the Hub (ATOM, Eureka assets) or Noble (USDC.n). R1 §3d listed channel-0/1/2 as OPEN — still true, but two of the three
Axelar clients have expired, so only `channel-1` carries anything.

IBC rate limits (`/Stride-Labs/ibc-rate-limiting/ratelimit/ratelimits`, 22:30Z): native `azig` on channels 0, 1, 2, 3, 4 and 12 — at most 5 %
of the channel value sent and 10 % received per 24 h (channel value 2,337,705,001 ZIG); ZIG.axl on `channel-1` — 5 % / 10 % per 24 h of
518,415,720 ZIG.axl (governance proposal #37 restored 10 % on 26 Aug 2026). Computed: about 51.8 million ZIG.axl may arrive per 24 h, all users
together.

### The arriving denoms (`/ibc/apps/transfer/v1/denoms`, 17 traces; supply from `/cosmos/bank/v1beta1/supply/by_denom`)

| Asset | ZIGChain denom | Trace (path / base) | Decimals | Supply on ZIGChain | OroSwap pool with ZIG |
|---|---|---|---|---|---|
| USDC.inj | `ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B` | `transfer/channel-12` / `erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a` | 6 | 33,469.70 | `zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3` (xyk_25, 25 bps): 10,590.99 USDC.inj + 212,238.77 ZIG; created 2026-10-09 11:47Z |
| USDC.n | `ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4` | `transfer/channel-3` / `uusdc` | 6 | 77,547.81 | `zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h` (xyk_25): 42,158.52 USDC.n + 851,180.21 ZIG |
| USDT (Eureka) | `ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9` | `transfer/channel-4/transfer/08-wasm-1369` / `0xdac17f958d2ee523a2206206994597c13d831ec7` | 6 | 4,660.16 | `zig1ucwnlul7t97fx4xr83kzxt76pdgk86gmz36adl8mzk890frduwuslq09t6` (xyk_10): 139.57 USDT + 2,595.32 ZIG |
| ETH (Eureka WETH) | `ibc/5E970F9FF7B696B42F75B92CC05A74B9C44AB0B5D231FBE794A29D74344B19D7` | `transfer/channel-4/transfer/08-wasm-1369` / `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2` | 18 | 0.2089 | `zig147ssatunm8wuukmzer8jc7nw2hqmrgawwmc9gu6hgqtm24c8x29qhjtl58` (xyk_10): 0.0820 ETH + 3,744.47 ZIG |
| ATOM | `ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0` | `transfer/channel-4` / `uatom` | 6 | 2,804.81 | `zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45` (xyk, 1 bps): 2,366.21 ATOM + 81,145.66 ZIG |
| ZIG.axl | `ibc/9BEE293E6559ED860CC702685996F394D4991D6DFFD60A19ABC3723E6F34788A` | `transfer/channel-1` / `unit-zig` | 18 | 518,415,719.81 | none (the token wrapper converts it to `azig`) |
| native ZIG | `azig` | — | 18 (display `zig`) | — | — |

Look-alike vouchers that **must not** be offered as "USDC" or "ATOM": `ibc/ADC71E62475958819B2D3D5FA2EBC2B94EB62E3D9EF3F3E00E466306E9DB612F` =
`transfer/channel-4/transfer/channel-220/erc20:0xa00C…235a` (USDC.inj that came through the Hub instead of straight from Injective; supply 0, no
pool) and `ibc/444791A8B951C7BF13750768BB5603C2F813BF92D9938AB2D486844E1B62777B` = `transfer/channel-3/transfer/channel-4/uatom` (ATOM that came via
Noble; 0.02 ATOM, no pool). The same asset over a different path is a different denom that the pools do not accept. Other traces present:
WBTC, EURC, XAUt, SolvBTC, NEIRO (Eureka), stATOM (via the Hub), INJ (`channel-12`), AXL (`channel-0` and `channel-1`).

OroSwap pools came from the factory `zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85`. Its `{"pairs":{}}` lists 31 pairs (paged with
`start_after: {asset_infos, pair_type}` — the bare `asset_infos` list R2 used is refused) and **does not include** the ZIG/USDC.n, ZIG/USDC.inj,
ZIG/ATOM, ZIG/USDT or ZIG/ETH pairs; they come from `{"pairs_by_assets":{"asset_infos":[…]}}` (13 pairs among the arriving denoms, read
22:31:34–22:31:39Z, height 13,046,729), each read with `{"pool":{}}`. Simulations (`{"simulation":{…}}`, 22:33:49–22:33:51Z), "below mid" =
computed against the pool's reserve ratio:

| Offer | Pool | ZIG returned | Fee taken | Below the mid price |
|---|---|---|---|---|
| 100 USDC.n | xyk_25 | 2,009.19 | 5.04 ZIG (25 bps) | 0.49 % |
| 100 USDC.inj | xyk_25 | 1,980.25 | 4.96 ZIG (25 bps) | 1.18 % |
| 10 USDC.inj | xyk_25 | 199.71 | 0.50 ZIG | 0.34 % |
| 6 ATOM | xyk | 205.22 | 0.02 ZIG (1 bps) | 0.26 % |
| 100 USDT | xyk_10 | 1,082.23 | 1.08 ZIG | **41.80 %** |
| 10 USDT | xyk_10 | 173.34 | 0.17 ZIG | 6.78 % |
| 0.04 ETH | xyk_10 | 1,226.92 | 1.23 ZIG | **32.87 %** |

Computed: the USDC.n pool prices ZIG at about 0.0495 USDC; xyk arithmetic puts a 100-ATOM swap about 4 % below mid (100 / (2,366 + 100)).

## What Skip Go returned (22:25:34–22:28:54Z)

Request body: `amount_in`, `source_asset_denom`, `source_asset_chain_id`, `dest_asset_denom`, `dest_asset_chain_id: "zigchain-1"`,
`allow_multi_tx: true`, `allow_unsafe: false`, `smart_relay: true`, `go_fast: true`, `experimental_features: ["cctp","hyperlane","stargate","eureka","layer_zero"]`,
`smart_swap_options: {split_routes, evm_swaps}` — then, for the refused ETH/USDT routes, the same with `allow_unsafe: true`, and four requests
limited with `bridges` (Eureka+IBC, CCTP_V2+IBC, CCTP+IBC). Skip's chain entry for `zigchain-1` (GET `/v2/info/chains`): PFM enabled, memo
supported, IBC hooks off, **fee asset `azig` only** (gas price low 2.5e9 / average 2.5e10 / high 5e10 azig). Skip lists 39 swap venues and
**none on ZIGChain** (`/v2/fungible/venues`), so Skip cannot turn anything into native ZIG.

| From | To (ZIGChain) | HTTP | Operations | Txs | Seconds | Fees returned | Out |
|---|---|---|---|---|---|---|---|
| 100 USDC, Ethereum | USDC.inj | 200 | CCTP V2 1 → Injective EVM (1776); IBC injective-1 → zigchain-1 `channel-456` | 2 | 1,110 | SMART_RELAY 0.000466 USDC | 99.999534 |
| 100 USDC, Base | USDC.inj | 200 | same from 8453 | 2 | 1,110 | 0.000466 USDC | 99.999534 |
| 100 USDC, Arbitrum | USDC.inj | 200 | same from 42161 | 2 | 1,110 | 0.000466 USDC | 99.999534 |
| 100 USDC, Ethereum | USDC.n | 200 | Go Fast 1 → osmosis-1; IBC osmosis → noble `channel-750`; IBC noble → zigchain `channel-175` | 1 | 30 | BRIDGE (Go Fast) 2.61 USDC | 97.39 |
| 100 USDC, Base | USDC.n | 200 | Go Fast 8453 → osmosis-1 → noble → zigchain | 1 | 30 | 0.12 USDC | 99.88 |
| 100 USDC, Arbitrum | USDC.n | 200 | Go Fast 42161 → osmosis-1 → noble → zigchain | 1 | 30 | 0.16 USDC | 99.84 |
| 100 USDC, Ethereum (CCTP only) | USDC.n | 200 | CCTP (V1) 1 → noble-1; IBC noble → zigchain | 1 | 1,110 | SMART_RELAY 0.02 USDC | 99.98 |
| 100 USDC, Base (CCTP only) | USDC.n | 200 | CCTP 8453 → noble-1; IBC → zigchain | 1 | 1,110 | 0.02 USDC | 99.98 |
| 100 USDC, Noble | USDC.n | 200 | IBC noble → zigchain `channel-175` | 1 | 30 | — | 100 |
| 100 USDC.n, Osmosis / Cosmos Hub | USDC.n | 200 | IBC to Noble, then to ZIGChain | 1 | 60 | — | 100 |
| 100 USDT, Ethereum | USDT (Eureka) | 200 | Eureka 1 → cosmoshub-4; IBC hub → zigchain `channel-1555` | 1 | 1,230 | SMART_RELAY 0.200157 USDT | 99.799843 |
| 100 USDT, Base / Arbitrum | USDT (Eureka) | **404 "no routes found"**; with `allow_unsafe`: 200 + LOW_INFO_WARNING | EVM swap → Go Fast → Osmosis swap → Hub → ZIGChain | 1 | 30 | 0.12 / 0.16 USDC | **70.45** |
| 100 USDT (Eureka), Osmosis / Hub | USDT (Eureka) | 200 | IBC via the Hub | 1 | 60 / 30 | — | 100 |
| 100 USDT.kava, Osmosis | USDT (Eureka) | 404 | — | — | — | — | — |
| 0.05 ETH, Ethereum / Base / Arbitrum | ETH (Eureka) | **400 LOW_INFO_ERROR** "Unable to determine if the estimated output is favorable for the user due to lack of information" | — | — | — | — | — |
| same, `allow_unsafe` | ETH (Eureka) | 200 + LOW_INFO_WARNING | EVM swap → Go Fast → Osmosis swap → Hub → ZIGChain | 1 | 30 | Go Fast 2.63 / 0.14 / 0.18 USDC | 0.048029 / 0.049786 / 0.049768 |
| 0.05 ETH, Ethereum, **Eureka+IBC only** | ETH (Eureka) | 200 (no warning) | wrap → Eureka 1 → cosmoshub-4 → zigchain `channel-1555` | 1 | 1,230 | SMART_RELAY 0.0000836 WETH ($0.197) | 0.049916 |
| 0.05 ETH (Eureka), Osmosis / Hub | ETH (Eureka) | 200 | IBC via the Hub | 1 | 60 / 30 | — | 0.05 |
| 10 ATOM, Cosmos Hub | ATOM | 200 | IBC hub → zigchain `channel-1555` | 1 | 30 | — | 10 |
| 10 ATOM, Osmosis | ATOM | 200 | IBC osmosis → hub `channel-0` → zigchain | 1 | 60 | — | 10 |
| 10 ATOM (Eureka ERC-20), Ethereum | ATOM | 200 | Eureka → Hub → zigchain | 1 | 1,230 | 0.11976 ATOM | 9.88024 |
| 1,000 ZIG (ERC-20), Ethereum | ZIG.axl | 200 | Axelar 1 → zigchain-1 | 1 | 960 | BRIDGE (Axelar) 0.0000478 ETH ($0.114) | 1,000 |
| 1,000 ZIG (ERC-20), Ethereum | `azig` | 404 | — | — | — | — | — |
| 1,000 ZIG.axl, Axelar | ZIG.axl | 200 | IBC axelar → zigchain `channel-182` | 1 | 30 | — | 1,000 |
| 1,000 ZIG (peggy), Injective | `azig` | 404 | — | — | — | — | — |
| USDC (Ethereum, Hub) or ATOM (Hub) | `azig` | 404 | — (no venue on ZIGChain) | — | — | — | — |

Skip lists `required_chain_addresses` for every chain a route passes through (e.g. `['8453','injective-1','zigchain-1']`), so the person's wallets must
cover each of them. The Ethereum → USDC.n quote's 2.61 USDC is Go Fast's fee on Ethereum (Base 0.12, Arbitrum 0.16). Gas is not part of Skip's
`estimated_fees`.

## Step by step — the recommended routes

Common to all: the person needs Keplr with the ZIGChain account (`zig1…`) and, for Hub/Injective steps, the Cosmos Hub (`cosmos1…`) and
Injective (`inj1…`) accounts, plus an EVM wallet (MetaMask, Rabby …) for Ethereum/Base/Arbitrum. ZIGoals only links out and watches the
balance (H49); it signs nothing. Skip Go's public UI is https://go.skip.build/ ("Select asset" ×2, "Connect Wallet", Settings — capture
`skip-go/`); the screens after connecting a wallet were not read.

**USDC → USDC.inj (recommended).** 1. Buy USDC on Base (`BASE_USDC` / Banxa `USDC`+`BASE`, ONRAMP_CODES.md) to the person's own `0x…`.
2. Open go.skip.build; "Connect Wallet" for Base (EVM wallet) and for Injective + ZIGChain (Keplr). 3. From: USDC on Base; To: USDC.inj on
ZIGChain. 4. Check the route shows two transactions and about 18 minutes. 5. Sign the first in the EVM wallet (Circle CCTP V2 burn on Base; an
ERC-20 spending approval may come first — inference). 6. When Skip asks, sign the second in Keplr on Injective (an IBC transfer on
`channel-456`); Skip quotes no relay for this step, so it is paid in INJ gas on Injective — a fresh Injective account has none (inference).
7. USDC.inj arrives at `zig1…` as `ibc/6C6F…9B6B`. Cost: 0.000466 USDC relay + Base gas + Injective gas. If the person wants ZIG, the
OroSwap USDC.inj/ZIG pool (25 bps) returned 1,980.25 ZIG for 100 USDC.inj (1.18 % below mid) — and that swap needs ZIG for gas.

**USDT → USDT (Eureka).** 1. Buy USDT on Ethereum (`ETH_USDT` / `USDT`+`ETH`). 2. go.skip.build, From USDT on Ethereum, To USDT on ZIGChain;
connect the EVM wallet and Keplr (Hub + ZIGChain addresses). 3. One signature on Ethereum (plus a possible ERC-20 approval). 4. ~20.5 min; arrives
as `ibc/630F…B4F9`. Cost: 0.200157 USDT relay + Ethereum gas. **Say plainly that USDT on ZIGChain can be held but hardly swapped** (139.57 USDT in
the only pool). From Base or Arbitrum there is no safe route (Skip refuses; forced, it returns 70.45 USDT for 100).

**ETH → ETH (Eureka).** Same as USDT from Ethereum, with ETH; the person must pick the Eureka route — Skip's default request refused the
destination (LOW_INFO_ERROR) and, with the check off, offered a swap-through-Osmosis route instead; whether the UI shows the Eureka route by
default was not seen (inference: it may not). Cost: 0.0000836 WETH relay + Ethereum gas; ~20.5 min. **Say plainly that ETH on ZIGChain has almost
no market** (0.21 ETH exists on the chain; the pool holds 0.082 ETH). Keeping ETH on Ethereum/Base is the honest default.

**ATOM → ATOM (route B's IBC step, H33/H49).** 1. Buy ATOM on the Cosmos Hub (`COSMOS_ATOM` / `ATOM`+`ATOM`) to the person's `cosmos1…`.
2. In Keplr, send ATOM from Cosmos Hub to the person's `zig1…` over IBC (Keplr's own IBC send screen was not read tonight — the extension
cannot be opened by automation), or use go.skip.build (From ATOM on Cosmos Hub, To ATOM on ZIGChain), or the ZIGChain Hub bridge. 3. One
signature on the Hub; Skip estimates 30 s. 4. Arrives as `ibc/EF48…33C0`. 5. Swap on OroSwap (app.oroswap.org/swap; capture `oroswap/` — the
app first shows a Terms of Service gate the person accepts themselves): 6 ATOM → 205.22 ZIG at 1 bps, 0.26 % below mid; needs ZIG for gas.

**ZIG from ERC-20 ZIG → native ZIG.** The ZIGChain Hub's bridge (https://hub.zigchain.com/bridge/) is behind a Cloudflare challenge for
automation (capture `zigchain-hub/bridge-*-wall.png`), so its flow is taken from its docs source on GitHub (`ZIGChain/docs`,
`docs/users/hub/bridge.md`, repository last commit 2026-03-30, read 22:31:59Z): "You send" / "You get" (token and network each side), MAX,
optional "Set recipient address", Settings → Max Slippage 0.1 % / 0.5 % / 1 % / 3 % / Custom, "How does routing work?" = Bridge → Swap →
Transfer, "You only sign once", **BRIDGE** → "EXECUTING...", approve in the wallet (Keplr or Leap; fee level Low/Medium/High), then "Recent
Bridges" shows a green check. Which source networks the live Hub offers tonight is unknown. On chain (read 22:32:22Z,
`/zigchain/tokenwrapper/module_info`): the token wrapper is **enabled**, wired to `channel-1` ↔ Axelar `channel-182` (clients 07-tendermint-1 /
07-tendermint-251), denom `unit-zig`, `decimal_difference` 0; its module wallet held 193,590,281.19 native ZIG and 306,440,700.53 ZIG.axl. The
docs (`docs/builders/token-wrapper-module.md`): on an IBC transfer from Axelar "the module releases an equivalent amount of native ZIG tokens to
the ZIGChain recipient address" (the same page still describes an 18→6-decimal scaling and a 1-ZIG minimum from before the 18-decimal
redenomination; the module now reports `decimal_difference` 0). Skip quotes the same transfer as arriving "ZIG.axl" (960 s, 0.0000478 ETH);
that the person ends up with native `azig` is an inference from the docs and the module state, not observed with a transfer.

## Axelar (Satellite), Noble, Injective, Cosmos Hub — one line each

- **Axelar / Satellite**: https://satellite.money/ did not load (Chrome `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`; curl TLS handshake failure at
  22:19Z) — unreadable. On ZIGChain the only Axelar assets are ZIG.axl and a little AXL; two of three Axelar clients have expired; Skip (which
  supports Axelar) offers **no Axelar route for USDC or ETH** onto ZIGChain. Axelar is the ERC-20 ZIG rail only.
- **Noble `channel-3`**: active, carries USDC.n; winding down per Circle (dates above). Every USDC vault on ZIGChain holds USDC.n (see
  [RECHECK_2026-10-19.md](RECHECK_2026-10-19.md)).
- **Injective `channel-12`**: active since R1's read; the USDC.inj rail Circle and Skip point to.
- **Cosmos Hub `channel-4`**: active; ATOM plus every IBC Eureka asset from Ethereum.

## Open problems for the lead

1. **Gas for a first swap.** Every card route that ends in native ZIG finishes with an OroSwap swap, and ZIGChain takes fees in `azig` only (Skip's
   chain entry; R3 step 7). A fresh `zig1…` that just received USDC.inj or ATOM cannot pay for that swap. Only the ERC-20 ZIG route (or an
   exchange withdrawal on the ZIGChain network) delivers ZIG without a swap. Whether the Hub bridge's "Swap" step solves this was not readable.
2. **USDC.inj needs two signatures and an Injective account with INJ for gas** (inference from Skip's operations), against one signature and
   seconds for the deprecated USDC.n. The honest copy is "slower, two approvals, but the USDC that keeps working".
3. **USDT and ETH have no real market on ZIGChain.** "What can I do with it now?" (H83) should say "hold" for them, not "swap" or "earn".
4. Skip's ETH answer depends on the request: default → refused; forced → a swap route with a warning; Eureka-only → the clean route. The guided
   link-out must tell the person which route to pick, and that cannot be verified until a wallet is connected (owner-side check).
