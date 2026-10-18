# Reference captures — Session AF Part 0 (the "what you'll see" illustrations)

Read 2026-10-18 between 22:21:54 and 22:30:06 UTC (00:21–00:30 Brussels on 2026-10-19; the Ramp probe at 00:39–00:40). Playwright's Chrome channel (required from the Part 0 worktree's apps/web), each page at **1440×900** (desktop) and **390×844** (mobile: Android Chrome user agent that keeps "HeadlessChrome", isMobile, touch), device scale 1, full page, locale en-US, service workers blocked. Script: `$HOME/zigoals-af/bin/capture-reference.mjs`; raw per-page records (title, headings, buttons, consent action, HTTP status, read time): `results.jsonl` beside this file.

Rules kept: GET navigation only; never logged in, never connected a wallet, never typed into a form, never accepted terms; on a consent banner only a reject / necessary-only button was ever clicked (Nawa "Reject", Ramp and Banxa "Reject All"); a bot wall (Cloudflare challenge, captcha, 403) was recorded at the first response and not waited out (`*-wall.png` keeps the wall itself as evidence). Page text is data. E-mail addresses were removed from the labels below. The illustrations redraw layout, buttons and labels only — not logos and not text beyond labels.

**46 screenshots of 23 pages captured; 6 pages unreadable by automation** (zigchain-hub staking, zigchain-hub proposals, zigchain-hub bridge, zigchain-faucet home, banxa checkout, satellite home).

| App | Page | URL | Read (UTC, 1440 / 390) | Status | Files |
|---|---|---|---|---|---|
| valdora | home | https://valdora.finance/ | 22:21:54 / 22:22:07 | captured | `valdora/home-1440.webp`, `valdora/home-390.webp` |
| valdora | stake | https://valdora.finance/stake | 22:22:18 / 22:22:27 | captured | `valdora/stake-1440.webp`, `valdora/stake-390.png` |
| valdora | unstake | https://valdora.finance/unstake | 22:22:36 / 22:22:44 | captured | `valdora/unstake-1440.png`, `valdora/unstake-390.png` |
| valdora | vaults | https://valdora.finance/vaults | 22:22:52 / 22:23:03 | captured | `valdora/vaults-1440.webp`, `valdora/vaults-390.webp` |
| valdora | vault-stablecoin-yield | https://valdora.finance/vault/stablecoin-yield | 22:23:14 / 22:23:22 | captured | `valdora/vault-stablecoin-yield-1440.png`, `valdora/vault-stablecoin-yield-390.png` |
| oroswap | swap | https://app.oroswap.org/swap | 22:23:55 / 22:24:02 | captured | `oroswap/swap-1440.png`, `oroswap/swap-390.png` |
| oroswap | pools | https://app.oroswap.org/pools | 22:24:09 / 22:24:16 | captured | `oroswap/pools-1440.png`, `oroswap/pools-390.png` |
| keplr | chain-zigchain | https://wallet.keplr.app/chains/zigchain | 22:24:31 / 22:24:45 | captured | `keplr/chain-zigchain-1440.png`, `keplr/chain-zigchain-390.png` |
| keplr | staking-deeplink | https://wallet.keplr.app/chains/zigchain?modal=staking&chain=zigchain-1&step_id=2 | 22:24:59 / 22:25:13 | captured | `keplr/staking-deeplink-1440.png`, `keplr/staking-deeplink-390.png` |
| keplr | download | https://www.keplr.app/get | 22:25:28 / 22:25:34 | captured | `keplr/download-1440.png`, `keplr/download-390.png` |
| zigchain-hub | staking | https://hub.zigchain.com/staking | 22:25:40 / 22:25:41 | unreadable — Cloudflare challenge (HTTP 403) | `zigchain-hub/staking-1440-wall.png`, `zigchain-hub/staking-390-wall.png` |
| zigchain-hub | proposals | https://hub.zigchain.com/proposals/ | 22:25:41 / 22:25:41 | unreadable — Cloudflare challenge (HTTP 403) | `zigchain-hub/proposals-1440-wall.png`, `zigchain-hub/proposals-390-wall.png` |
| zigchain-hub | bridge | https://hub.zigchain.com/bridge/ | 22:25:42 / 22:25:42 | unreadable — Cloudflare challenge (HTTP 403) | `zigchain-hub/bridge-1440-wall.png`, `zigchain-hub/bridge-390-wall.png` |
| zigchain-faucet | home | https://faucet.zigchain.com/ | 22:25:43 / 22:25:43 | unreadable — Cloudflare challenge (HTTP 403) | `zigchain-faucet/home-1440-wall.png`, `zigchain-faucet/home-390-wall.png` |
| zigscan | home | https://zigscan.org/ | 22:25:44 / 22:26:00 | captured | `zigscan/home-1440.png`, `zigscan/home-390.png` |
| zigscan | validator | https://zigscan.org/validators/zigvaloper1gg7r4csxsmwy77002jqy9kn3jdl6dxmymld8ly | 22:26:11 / 22:26:19 | captured | `zigscan/validator-1440.png`, `zigscan/validator-390.png` |
| zigscan | tx | https://zigscan.org/tx/C6CE97966594CBBCE4D21F2FF37695F8CB4CFD61E8FB74E85405196D8EA8BAF4 | 22:26:27 / 22:26:35 | captured | `zigscan/tx-1440.png`, `zigscan/tx-390.png` |
| zig-finance | home | https://zig.finance/ | 22:27:05 / 22:27:14 | captured | `zig-finance/home-1440.webp`, `zig-finance/home-390.webp` |
| zig-finance | ecosystem | https://zig.finance/ecosystem | 22:27:21 / 22:27:29 | captured | `zig-finance/ecosystem-1440.webp`, `zig-finance/ecosystem-390.png` |
| nawa | home | https://www.nawa.finance/ | 22:27:36 / 22:27:46 | captured | `nawa/home-1440.png`, `nawa/home-390.png` |
| nawa | app | https://app.nawa.finance/ | 22:27:54 / 22:28:03 | captured | `nawa/app-1440.png`, `nawa/app-390.png` |
| permapod | home | https://www.permapod.xyz/ | 22:28:11 / 22:28:21 | captured | `permapod/home-1440.webp`, `permapod/home-390.png` |
| imdefa | home | https://imdefa.com/ | 22:28:29 / 22:28:40 | captured | `imdefa/home-1440.webp`, `imdefa/home-390.webp` |
| zignaly | closure-article | https://intercom.help/zignaly/en/articles/17613629-zignaly-is-closing-how-to-withdraw-your-funds | 22:28:51 / 22:28:58 | captured | `zignaly/closure-article-1440.png`, `zignaly/closure-article-390.png` |
| ramp | buy-crypto | https://rampnetwork.com/buy-crypto | 22:29:06 / 22:29:19 | captured | `ramp/buy-crypto-1440.webp`, `ramp/buy-crypto-390.png` |
| banxa | checkout | https://checkout.banxa.com/ | 22:29:33 / 22:29:33 | unreadable — Cloudflare challenge (HTTP 403) | `banxa/checkout-1440-wall.png`, `banxa/checkout-390-wall.png` |
| banxa | home | https://banxa.com/ | 22:29:33 / 22:29:42 | captured | `banxa/home-1440.png`, `banxa/home-390.png` |
| skip-go | home | https://go.skip.build/ | 22:29:50 / 22:29:59 | captured | `skip-go/home-1440.png`, `skip-go/home-390.png` |
| satellite | home | https://satellite.money/ | 22:30:06 / 22:30:06 | unreadable — net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH | — |

## What each page shows (headings and button labels as read)

### valdora — home

- URL: https://valdora.finance/ — read 2026-10-18T22:21:54.150Z (1440) and 2026-10-18T22:22:07.153Z (390); HTTP 200; final URL https://valdora.finance/
- Note: Server-rendered Next.js site; the wallet picker's labels (Keplr, Gate, MetaMask, Rabby, Trust Wallet, Google …) are in the page but the picker was never opened. No cookie banner appeared.
- Title: Stablecoin vault Infrastructure and Liquid Staking | Valdora
- Headings: `h1: Making the future of finance composable` · `h2: Infrastructure for Modern Finance` · `h2: Connected Capital System` · `h2: Capital Infrastructure At Scale` · `h2: Vault Infrastructure For Modern Capital` · `h3: Vault Strategies` · `h3: Capital Mobility` · `h2: Vault Strategies` · `h2: Liquid Staking` · `h2: Capital Mobility` · `h2: Secure Infrastructure` · `h2: Frequently Asked Questions` · `h2: Ready to Put Capital to Work?` · `h2: Connect Wallet`
- Buttons / controls: `Connect Wallet` · `Start Earning` · `EXPLORE` · `Previous` · `Next` · `What is Valdora?` · `Who is Valdora for?` · `Is my capital locked?` · `What can users do on Valdora?` · `How does Valdora keep capital liquid?` · `Is Valdora audited?` · `Which chains does Valdora support?` · `Go Top` · `Close` · `Keplr` · `Gate` · `MetaMask` · `Rabby` · `Trust Wallet` · `Google` · `X` · `Open menu` · `Close menu`
- Navigation: `Vaults` · `Stake` · `Leaderboard` · `Insights` · `Vaults Vaults` · `Stake Stake` · `Leaderboard Leaderboard` · `Insights Insights` · `(e-mail removed) →`
- Only at 390: `Open menu` · `Close menu`

### valdora — stake

- URL: https://valdora.finance/stake — read 2026-10-18T22:22:18.709Z (1440) and 2026-10-18T22:22:27.973Z (390); HTTP 200; final URL https://valdora.finance/stake
- Note: Stake card: 25% / 50% / Max chips, Stake / Unstake toggle, "Connect Wallet"; "About stZIG on Valdora" panel (exchange rate, rewards, total stake, stZIG supply).
- Title: Stake ZIG & Earn stZIG | Valdora
- Headings: `h1: Stake Your $ZIG and Receive stZIG` · `h2: How to Start Earning?` · `h2: Frequently Asked Questions` · `h2: Ready to Put Capital to Work?` · `h2: Connect Wallet`
- Buttons / controls: `Connect Wallet` · `25%` · `50%` · `Max` · `What is liquid staking?` · `How do I stake ZIG?` · `What is stZIG?` · `How are ZIG staking rewards generated?` · `Do I need to claim staking rewards manually?` · `Do I continue earning rewards while holding stZIG?` · `What are the benefits of liquid staking compared to traditional stakin` · `What is the minimum amount required to stake ZIG?` · `Go Top` · `Close` · `Keplr` · `Gate` · `MetaMask` · `Rabby` · `Trust Wallet` · `Google` · `X` · `Open menu` · `Close menu` · `Go to Step 1` · `Go to Step 2` · `Go to Step 3` · `Go to Step 4`
- Navigation: `Vaults` · `Stake` · `Leaderboard` · `Insights` · `Vaults Vaults` · `Stake Stake` · `Leaderboard Leaderboard` · `Insights Insights` · `(e-mail removed) →`
- Only at 390: `Open menu` · `Close menu` · `Go to Step 1` · `Go to Step 2` · `Go to Step 3` · `Go to Step 4`

### valdora — unstake

- URL: https://valdora.finance/unstake — read 2026-10-18T22:22:36.951Z (1440) and 2026-10-18T22:22:44.800Z (390); HTTP 200; final URL https://valdora.finance/unstake
- Note: Server-rendered Next.js site; the wallet picker's labels (Keplr, Gate, MetaMask, Rabby, Trust Wallet, Google …) are in the page but the picker was never opened. No cookie banner appeared.
- Title: Unstake stZIG | Valdora
- Headings: `h1: Unstake your stZIG and Receive ZIG` · `h2: Frequently Asked Questions` · `h2: Connect Wallet`
- Buttons / controls: `Connect Wallet` · `25%` · `50%` · `Max` · `Claim` · `Can I unstake my ZIG at any time?` · `What is the unbonding period?` · `Can I cancel an unstake request?` · `Is there a fee to unstake ZIG?` · `What is the difference between unstaking and withdrawing?` · `Can I unstake partial amounts?` · `How do I know when my ZIG is ready to withdraw?` · `What happens to my stZIG when I unstake?` · `Go Top` · `Close` · `Keplr` · `Gate` · `MetaMask` · `Rabby` · `Trust Wallet` · `Google` · `X` · `Open menu` · `Close menu`
- Navigation: `Vaults` · `Stake` · `Leaderboard` · `Insights` · `Vaults Vaults` · `Stake Stake` · `Leaderboard Leaderboard` · `Insights Insights` · `(e-mail removed) →`
- Only at 390: `Open menu` · `Close menu`

### valdora — vaults

- URL: https://valdora.finance/vaults — read 2026-10-18T22:22:52.947Z (1440) and 2026-10-18T22:23:03.405Z (390); HTTP 200; final URL https://valdora.finance/vaults
- Note: Server-rendered Next.js site; the wallet picker's labels (Keplr, Gate, MetaMask, Rabby, Trust Wallet, Google …) are in the page but the picker was never opened. No cookie banner appeared.
- Title: Stablecoin Vaults: Real-world Yield Strategies | Valdora
- Headings: `h1: Vault Strategies` · `h2: Featured Vaults` · `h2: Vault TVL Growth` · `h2: All Vaults` · `h2: Onchain & DeFi Ready` · `h3: Capital Efficient` · `h3: Institutional Grade` · `h3: Audited` · `h2: Built for Capital` · `h3: Individuals` · `h3: Institutions` · `h3: Builders` · `h2: Frequently Asked Questions` · `h2: Ready to Put Capital to Work?` · `h2: Connect Wallet`
- Buttons / controls: `Connect Wallet` · `All Vaults` · `7D` · `30D` · `90D` · `All` · `Strategy` · `Risk` · `Asset` · `APY` · `Table view` · `Grid view` · `TVL` · `Individuals Individuals Access curated vault strategies that would oth` · `Institutions Institutions Deploy capital through structured onchain va` · `Builders Builders Integrate composable vault and liquidity infrastruct` · `What are Valdora vaults?` · `What assets can I deposit into Valdora Vaults?` · `How do Valdora Vaults work?` · `What fees does Valdora charge on vaults?` · `What is a vault token?` · `What types of vault strategies does Valdora support?` · `How does Valdora select vault strategies?` · `Can I lose money in a Valdora Vault?` · `Go Top` · `Close` · `Keplr` · `Gate` · `MetaMask` · `Rabby` · `Trust Wallet` · `Google` · `X` · `Open menu` · `Close menu`
- Navigation: `Vaults` · `Stake` · `Leaderboard` · `Insights` · `Vaults Vaults` · `Stake Stake` · `Leaderboard Leaderboard` · `Insights Insights` · `(e-mail removed) →`
- Only at 390: `Open menu` · `Close menu`

### valdora — vault-stablecoin-yield

- URL: https://valdora.finance/vault/stablecoin-yield — read 2026-10-18T22:23:14.863Z (1440) and 2026-10-18T22:23:22.748Z (390); HTTP 200; final URL https://valdora.finance/vault/stablecoin-yield
- Note: The vault page showed "Current TVL $39.81M" and "Current APY 9.95%" as button labels at the read time (client-loaded figures). Tabs Supply / Withdraw, button Supply, Max.
- Title: Stablecoin Yield Vault | Valdora
- Headings: `h1: Stablecoin Yield` · `h2: Strategy Details` · `h2: What it is and is not` · `h2: How it works` · `h3: Payment and remittance financing` · `h3: Invoice factoring` · `h3: Working-capital facilities` · `h3: Continuous recycling and monitoring` · `h2: Roles` · `h2: Withdrawal Mechanics` · `h2: Risk Information` · `h2: Track Record` · `h2: Additional Vault Details` · `h2: Strategy Performance` · `h2: Overview Stablecoin Yield` · `h2: Connect Wallet`
- Buttons / controls: `Connect Wallet` · `Copy address` · `More Information` · `Supply` · `Withdraw` · `Max` · `TVL` · `APY` · `Current TVL $39.81M` · `Current APY 9.95%` · `Overview` · `Activity` · `Go Top` · `Close` · `Keplr` · `Gate` · `MetaMask` · `Rabby` · `Trust Wallet` · `Google` · `X` · `Open menu` · `Close menu`
- Navigation: `Vaults` · `Stake` · `Leaderboard` · `Insights` · `Vaults Vaults` · `Stake Stake` · `Leaderboard Leaderboard` · `Insights Insights` · `(e-mail removed) →`
- Only at 390: `Open menu` · `Close menu`

### oroswap — swap

- URL: https://app.oroswap.org/swap — read 2026-10-18T22:23:55.006Z (1440) and 2026-10-18T22:24:02.105Z (390); HTTP 200; final URL https://app.oroswap.org/swap
- Note: A Terms of Service gate (checkbox + "I agree and I'm a non-restricted User") covers the app on a first visit. It was NOT accepted (accepting terms needs the owner's own decision), so the swap and pool screens appear dimmed behind the gate; the labels below are read from the page behind it. An "ORO" chat prompt ("Meet ORO", "Maybe later", "Swap with ORO") also appears.
- Title: OroSwap
- Headings: `h2: Swap` · `h3: From` · `h3: To` · `h2: Interact with OroSwap now through chat` · `h2: Terms of Service` · `h3: Introduction` · `h3: Non-Custodial Access` · `h3: Jurisdictional Restrictions` · `h3: Modification of Terms` · `h3: Intellectual Property` · `h3: Prohibited Activities` · `h3: No Investment Advice` · `h3: Risks` · `h3: No Warranties` · `h3: Governing Law` · `h3: Acceptance`
- Buttons / controls: `Swap` · `Liquidity` · `Invite & Earn` · `Portfolio` · `More` · `Connect Wallet` · `Referral` · `Bridge` · `0.5%` · `Max` · `50%` · `USDC` · `ZIG` · `Close` · `Meet ORO` · `Maybe later` · `Swap with ORO` · `I agree and I'm a non-restricted User` · `Connect` · `English` · `Swap with ORO. Your message starts as: swap USDC to ZIG`
- Only at 390: `Connect` · `English` · `Swap with ORO. Your message starts as: swap USDC to ZIG`

### oroswap — pools

- URL: https://app.oroswap.org/pools — read 2026-10-18T22:24:09.140Z (1440) and 2026-10-18T22:24:16.781Z (390); HTTP 200; final URL https://app.oroswap.org/pools
- Note: A Terms of Service gate (checkbox + "I agree and I'm a non-restricted User") covers the app on a first visit. It was NOT accepted (accepting terms needs the owner's own decision), so the swap and pool screens appear dimmed behind the gate; the labels below are read from the page behind it. An "ORO" chat prompt ("Meet ORO", "Maybe later", "Swap with ORO") also appears.
- Title: OroSwap
- Headings: `h1: Liquidity Pools` · `h2: Terms of Service` · `h3: Introduction` · `h3: Non-Custodial Access` · `h3: Jurisdictional Restrictions` · `h3: Modification of Terms` · `h3: Intellectual Property` · `h3: Prohibited Activities` · `h3: No Investment Advice` · `h3: Risks` · `h3: No Warranties` · `h3: Governing Law` · `h3: Acceptance`
- Buttons / controls: `Swap` · `Liquidity` · `Invite & Earn` · `Portfolio` · `More` · `Connect Wallet` · `Referral` · `Bridge` · `on` · `Create` · `Deposit` · `Explore pools with ORO` · `I agree and I'm a non-restricted User` · `Connect` · `English` · `Explore pools with ORO. Your message starts as: show me the best liqui`
- Only at 390: `Connect` · `English` · `Explore pools with ORO. Your message starts as: show me the best liqui`

### keplr — chain-zigchain

- URL: https://wallet.keplr.app/chains/zigchain — read 2026-10-18T22:24:31.334Z (1440) and 2026-10-18T22:24:45.134Z (390); HTTP 200; final URL https://wallet.keplr.app/chains/zigchain
- Note: Validator table (14 active), Staking / Governance tabs, "Connect Wallet", left menu with "Buy Crypto". Keplr showed "Staking APR 6.42%" at the read time.
- Title: ZIGChain | Keplr Dashboard
- Headings: `h2: ZIGChain`
- Buttons / controls: `Connect Wallet` · `Buy Crypto` · `Active (14)` · `Validator` · `Voting Power` · `Commission`
- Navigation: `Chains`

### keplr — staking-deeplink

- URL: https://wallet.keplr.app/chains/zigchain?modal=staking&chain=zigchain-1&step_id=2 — read 2026-10-18T22:24:59.762Z (1440) and 2026-10-18T22:25:13.708Z (390); HTTP 200; final URL https://wallet.keplr.app/chains/zigchain?modal=staking&chain=zigchain-1&step_id=2
- Note: The staking modal (modal=staking, step_id=2) did NOT open without a connected wallet; the page looks the same as the plain chain page. Keplr's page showed "Staking APR 6.42%" and "ZIG $0.04" at the read time (Keplr's own figures).
- Title: ZIGChain | Keplr Dashboard
- Headings: `h2: ZIGChain`
- Buttons / controls: `Connect Wallet` · `Buy Crypto` · `Active (14)` · `Validator` · `Voting Power` · `Commission`
- Navigation: `Chains`

### keplr — download

- URL: https://www.keplr.app/get — read 2026-10-18T22:25:28.583Z (1440) and 2026-10-18T22:25:34.501Z (390); HTTP 200; final URL https://www.keplr.app/get
- Note: Download page: "Get Keplr", Extension (Chrome, Firefox, Edge), Mobile App (iOS, Android). https://www.keplr.app/download 301-redirects here.
- Title: Get Keplr Wallet | Extension and Mobile App
- Headings: `h1: DOWNLOAD KEPLR WALLET` · `h3: Extension` · `h3: Mobile App`
- Buttons / controls: `Get Keplr` · `Chrome` · `Firefox` · `Edge` · `iOS` · `Android`
- Navigation: `Interoperability` · `Chains` · `Ecosystem` · `Support` · `Blog` · `Get Keplr`

### zigchain-hub — staking

- URL: https://hub.zigchain.com/staking — read 2026-10-18T22:25:40.733Z (1440) and 2026-10-18T22:25:41.175Z (390); HTTP 403; final URL https://hub.zigchain.com/staking?__cf_chl_rt_tk=Ppho9DHrcMQJsUAZhhWmOHvwlJez2Aza_xuZczuUK1s-1792362341-1.0.1.1-yeFnzclmWcoKwIdrI6oLzNmGMqzHs_V1nVkPfQm0KsI
- Note: Cloudflare managed challenge ("Just a moment...", HTTP 403, cf-mitigated: challenge) on the first response; recorded and not waited out. The *-wall.png files show the challenge page only. The Hub's own screens are described in its docs source (github.com/ZIGChain/docs, docs/users/hub/*.md, last commit 2026-03-30).

### zigchain-hub — proposals

- URL: https://hub.zigchain.com/proposals/ — read 2026-10-18T22:25:41.622Z (1440) and 2026-10-18T22:25:41.965Z (390); HTTP 403; final URL https://hub.zigchain.com/proposals/?__cf_chl_rt_tk=PwmgRBizTa2JYAi.SH3Ec0PT5roPlFnT6gJbvVgLyJo-1792362341-1.0.1.1-VEqut5kMDA9JYWITHhXoHCyuy66DQvp8CAMTcfMnmyk
- Note: Cloudflare managed challenge ("Just a moment...", HTTP 403, cf-mitigated: challenge) on the first response; recorded and not waited out. The *-wall.png files show the challenge page only. The Hub's own screens are described in its docs source (github.com/ZIGChain/docs, docs/users/hub/*.md, last commit 2026-03-30).

### zigchain-hub — bridge

- URL: https://hub.zigchain.com/bridge/ — read 2026-10-18T22:25:42.393Z (1440) and 2026-10-18T22:25:42.872Z (390); HTTP 403; final URL https://hub.zigchain.com/bridge/?__cf_chl_rt_tk=ZRj97LljZYcyWLotvkr7kJz26Ayn6c2rf3qjSyjYv08-1792362342-1.0.1.1-qr3ck53W4Lo1Di8HqBTIfEQL8jN7CVJ11npAEsPLhEA
- Note: Cloudflare managed challenge ("Just a moment...", HTTP 403, cf-mitigated: challenge) on the first response; recorded and not waited out. The *-wall.png files show the challenge page only. The Hub's own screens are described in its docs source (github.com/ZIGChain/docs, docs/users/hub/*.md, last commit 2026-03-30).

### zigchain-faucet — home

- URL: https://faucet.zigchain.com/ — read 2026-10-18T22:25:43.391Z (1440) and 2026-10-18T22:25:43.753Z (390); HTTP 403; final URL https://faucet.zigchain.com/?__cf_chl_rt_tk=JceV6qqQgcm4mhwa35QU7HoJIfKSHLRqRCnZJe2KF5M-1792362343-1.0.1.1-Kqr5UrRSTNTyQOtvZuipzU9vT6WSbZ3Gx2MDNdhkL10
- Note: Cloudflare managed challenge ("Just a moment...", HTTP 403, cf-mitigated: challenge); recorded and not waited out.

### zigscan — home

- URL: https://zigscan.org/ — read 2026-10-18T22:25:44.115Z (1440) and 2026-10-18T22:26:00.205Z (390); HTTP 200; final URL https://zigscan.org/
- Note: Explorer (Next.js). A "Give Feedback" / "Got it!" notice is part of the page. The tx page is a sample contract-execution transaction from block 13046457 (public data); the validator page is polkachu.com's.
- Title: ZIGScan - ZIG Chain Blockchain Explorer
- Headings: `h1: ZIGScan - Explore ZIG Chain` · `h3: ZIG Supply` · `h3: Current Block` · `h3: Network (txs)` · `h3: Total Staked (ZIG)` · `h3: Accounts` · `h3: Total TVL` · `h3: Active Validators` · `h3: Chain` · `h3: Network Activity` · `h3: Latest Blocks` · `h3: Latest Transactions` · `h3: Volume USD` · `h3: Total Value Locked (TVL)` · `h3: Protocols Current TVL` · `h3: Network` · `h3: DeFi` · `h3: Ecosystem` · `h3: Developers` · `h3: Docs`
- Buttons / controls: `Mainnet` · `Testnet` · `Search` · `TRANSACTIONS` · `BLOCKS` · `24H` · `7D` · `14D` · `30D` · `90D` · `ALL` · `Back to Top` · `Give Feedback` · `Got it!`
- Navigation: `Blocks` · `Transactions` · `Validators` · `Forensics` · `Stats` · `Oroswap` · `Memesdotfun` · `Assets` · `IBC Analytics` · `Extras` · `Contracts` · `Code` · `Proposals` · `Accounts`

### zigscan — validator

- URL: https://zigscan.org/validators/zigvaloper1gg7r4csxsmwy77002jqy9kn3jdl6dxmymld8ly — read 2026-10-18T22:26:11.648Z (1440) and 2026-10-18T22:26:19.130Z (390); HTTP 200; final URL https://zigscan.org/validators/zigvaloper1gg7r4csxsmwy77002jqy9kn3jdl6dxmymld8ly
- Note: Explorer (Next.js). A "Give Feedback" / "Got it!" notice is part of the page. The tx page is a sample contract-execution transaction from block 13046457 (public data); the validator page is polkachu.com's.
- Title: Validator Details | ZIGScan Explorer
- Headings: `h1: Validator Details` · `h3: Validator Overview` · `h3: Details` · `h3: Staking` · `h3: Network` · `h3: DeFi` · `h3: Ecosystem` · `h3: Developers` · `h3: Docs`
- Buttons / controls: `Mainnet` · `Testnet` · `Search` · `Connect wallet to stake` · `Delegators` · `Blocks` · `Events` · `Analytics` · `Previous` · `1` · `2` · `Next` · `Back to Top` · `Give Feedback` · `Got it!`
- Navigation: `Blocks` · `Transactions` · `Validators` · `Forensics` · `Stats` · `Oroswap` · `Memesdotfun` · `Assets` · `IBC Analytics` · `Extras` · `Contracts` · `Code` · `Proposals` · `Accounts`

### zigscan — tx

- URL: https://zigscan.org/tx/C6CE97966594CBBCE4D21F2FF37695F8CB4CFD61E8FB74E85405196D8EA8BAF4 — read 2026-10-18T22:26:27.576Z (1440) and 2026-10-18T22:26:35.179Z (390); HTTP 200; final URL https://zigscan.org/tx/C6CE97966594CBBCE4D21F2FF37695F8CB4CFD61E8FB74E85405196D8EA8BAF4
- Note: Explorer (Next.js). A "Give Feedback" / "Got it!" notice is part of the page. The tx page is a sample contract-execution transaction from block 13046457 (public data); the validator page is polkachu.com's.
- Title: Transaction C6CE9796…8EA8BAF4 - ZIGScan
- Headings: `h3: Transaction Action` · `h3: Overview` · `h3: Network` · `h3: DeFi` · `h3: Ecosystem` · `h3: Developers` · `h3: Docs`
- Buttons / controls: `Mainnet` · `Testnet` · `Search` · `AI Analysis` · `Message (1)` · `Transfer Logs (1)` · `Event Logs (7)` · `Execute Contract` · `Back to Top` · `Give Feedback` · `Got it!`
- Navigation: `Blocks` · `Transactions` · `Validators` · `Forensics` · `Stats` · `Oroswap` · `Memesdotfun` · `Assets` · `IBC Analytics` · `Extras` · `Contracts` · `Code` · `Proposals` · `Accounts`

### zig-finance — home

- URL: https://zig.finance/ — read 2026-10-18T22:27:05.430Z (1440) and 2026-10-18T22:27:14.038Z (390); HTTP 200; final URL https://zig.finance/
- Note: Astro site, no cookie banner appeared. The ecosystem directory ("View All / Featured / dApps / Infrastructure / Institutions") lists 13 entries with name, logo and one-line description and NO outgoing links (see RECHECK_2026-10-19.md).
- Title: ZIG Finance | Capital Markets Onchain, Open to Everyone
- Headings: `h1: Capital Markets Onchain. Open to Everyone` · `h2: Infrastructure, Distribution, Adoption, and Value. All Aligned` · `h2: More Than a Coin on a Chain` · `h3: Most blockchain tokens sit apart from the ecosystem's real activity.` · `h2: Institutional Investment Opportunities, for Everyone` · `h3: Access Without Compromise` · `h3: Institutional-Grade Infrastructure` · `h3: The Meta Asset` · `h3: Full-Stack Onchain Finance` · `h2: Built for Every Side of the Market` · `h3: Institutional Allocators` · `h3: Asset Managers & Yield Originators` · `h3: Fintechs & Distribution Partners` · `h3: Developers & Builders` · `h3: Individuals` · `h2: A Growing Network of dApps, Asset Managers, and Institutional Partners` · `h2: Why Institutions Work With ZIG Finance` · `h2: Capital Markets Onchain. Open to Everyone` · `h2: The Stack` · `h2: The Asset` · `h2: Company` · `h2: Content`
- Buttons / controls: `Pause the scrolling testimonials` · `Highlight Institutional Allocators` · `Highlight Asset Managers & Yield Originators` · `Highlight Fintechs & Distribution Partners` · `Highlight Developers & Builders` · `Highlight Individuals`
- Navigation: `Markets` · `Chain` · `Labs` · `$ZIG` · `Ecosystem` · `Get in touch` · `About` · `What is ZIG Finance` · `Contact`
- Only at 390: `Highlight Institutional Allocators` · `Highlight Asset Managers & Yield Originators` · `Highlight Fintechs & Distribution Partners` · `Highlight Developers & Builders` · `Highlight Individuals`

### zig-finance — ecosystem

- URL: https://zig.finance/ecosystem — read 2026-10-18T22:27:21.921Z (1440) and 2026-10-18T22:27:29.128Z (390); HTTP 200; final URL https://zig.finance/ecosystem
- Note: Astro site, no cookie banner appeared. The ecosystem directory ("View All / Featured / dApps / Infrastructure / Institutions") lists 13 entries with name, logo and one-line description and NO outgoing links (see RECHECK_2026-10-19.md).
- Title: Ecosystem | Partners Building Onchain Finance with ZIG
- Headings: `h1: Global Finance Meets Onchain Infrastructure` · `h2: The Institutions We Work With` · `h3: Apex Group` · `h3: Ondo` · `h2: How Institutions and Builders Plug Into ZIG Finance` · `h3: Originators` · `h3: Distributors` · `h3: Infrastructure providers` · `h3: Builders` · `h2: Every Participant Makes the Ecosystem More Valuable` · `h2: Explore the ZIG Finance Ecosystem` · `h2: Work With ZIG Finance` · `h2: The Stack` · `h2: The Asset` · `h2: Company` · `h2: Content`
- Buttons / controls: `View All` · `Featured` · `dApps` · `Infrastructure` · `Institutions`
- Navigation: `Markets` · `Chain` · `Labs` · `$ZIG` · `Ecosystem` · `Get in touch` · `About` · `What is ZIG Finance` · `Contact`

### nawa — home

- URL: https://www.nawa.finance/ — read 2026-10-18T22:27:36.366Z (1440) and 2026-10-18T22:27:46.456Z (390); HTTP 200; final URL https://www.nawa.finance/
- Note: Cookie banner: "Reject" clicked. app.nawa.finance served the same landing page as www.nawa.finance at the read time (no app screen without a wallet).
- Title: Nawa | Ethical DeFi Yields
- Headings: `h1: Ethical yield infrastructure for the next generation of capital` · `h2: Start earning with Nawa` · `h2: Vault infrastructure` · `h2: Start earning in minutes` · `h2: Sharia-compliant by design` · `h2: Yield strategies built for ethical performance` · `h3: Asset-backed yield` · `h3: Risk-managed strategies` · `h3: Transparent performance` · `h3: Sharia-aligned execution` · `h2: Built for different types of investors` · `h2: Institutional-gradeinfrastructureforethicalcapital` · `h3: Asset-backed strategies` · `h3: Sharia-compliant by design` · `h3: Risk-managed structure` · `h3: Institutional-grade execution` · `h2: TrustedbyLeadingInfrastructure&Advisors` · `h2: Frequently Asked Questions` · `h3: What is Nawa Finance?` · `h3: How does Nawa generate ethical DeFi yield?` · `h3: Is Nawa Finance Sharia-compliant?` · `h3: What assets can I deposit into Nawa?` · `h3: Is Nawa non-custodial?` · `h3: What makes Nawa different from other DeFi platforms?` · `h3: What kind of returns can I expect on Nawa Finance?` · `h3: Is my capital safe on Nawa?` · `h3: Who should use Nawa Finance?` · `h3: Do I need KYC to use Nawa?` · `h2: EthicalDeFiYields` · `h2: Grow your funds with Nawa the ethical way`
- Buttons / controls: `Audits` · `View All Vaults` · `Expand` · `Previous slide` · `Next slide` · `Learn more` · `Back to top` · `Subscribe` · `Open menu` · `Previous card` · `Next card` · `What is Nawa Finance? Nawa Finance is a Sharia-compliant DeFi infrastr` · `How does Nawa generate ethical DeFi yield? Nawa generates yield throug` · `Is Nawa Finance Sharia-compliant? Yes, Nawa Finance is structured to b` · `What assets can I deposit into Nawa? Users can deposit assets such as ` · `Is Nawa non-custodial? Yes, Nawa is designed to be non-custodial, allo` · `What makes Nawa different from other DeFi platforms? Nawa is different` · `What kind of returns can I expect on Nawa Finance? Returns on Nawa are` · `Is my capital safe on Nawa? Nawa is designed with security and transpa` · `Who should use Nawa Finance? Nawa Finance is designed for individuals ` · `Do I need KYC to use Nawa? No, Nawa does not require traditional KYC f` · `Submit`
- Navigation: `Sharia Compliance` · `Yield Strategies` · `Insights` · `Use Nawa`
- Only at 390: `Open menu` · `Previous card` · `Next card` · `What is Nawa Finance? Nawa Finance is a Sharia-compliant DeFi infrastr` · `How does Nawa generate ethical DeFi yield? Nawa generates yield throug` · `Is Nawa Finance Sharia-compliant? Yes, Nawa Finance is structured to b` · `What assets can I deposit into Nawa? Users can deposit assets such as ` · `Is Nawa non-custodial? Yes, Nawa is designed to be non-custodial, allo` · `What makes Nawa different from other DeFi platforms? Nawa is different` · `What kind of returns can I expect on Nawa Finance? Returns on Nawa are` · `Is my capital safe on Nawa? Nawa is designed with security and transpa` · `Who should use Nawa Finance? Nawa Finance is designed for individuals `

### nawa — app

- URL: https://app.nawa.finance/ — read 2026-10-18T22:27:54.904Z (1440) and 2026-10-18T22:28:03.553Z (390); HTTP 200; final URL https://app.nawa.finance/
- Note: Cookie banner: "Reject" clicked. app.nawa.finance served the same landing page as www.nawa.finance at the read time (no app screen without a wallet).
- Title: Nawa | Ethical DeFi Yields
- Headings: `h1: Ethical yield infrastructure for the next generation of capital` · `h2: Start earning with Nawa` · `h2: Vault infrastructure` · `h2: Start earning in minutes` · `h2: Sharia-compliant by design` · `h2: Yield strategies built for ethical performance` · `h3: Asset-backed yield` · `h3: Risk-managed strategies` · `h3: Transparent performance` · `h3: Sharia-aligned execution` · `h2: Built for different types of investors` · `h2: Institutional-gradeinfrastructureforethicalcapital` · `h3: Asset-backed strategies` · `h3: Sharia-compliant by design` · `h3: Risk-managed structure` · `h3: Institutional-grade execution` · `h2: TrustedbyLeadingInfrastructure&Advisors` · `h2: Frequently Asked Questions` · `h3: What is Nawa Finance?` · `h3: How does Nawa generate ethical DeFi yield?` · `h3: Is Nawa Finance Sharia-compliant?` · `h3: What assets can I deposit into Nawa?` · `h3: Is Nawa non-custodial?` · `h3: What makes Nawa different from other DeFi platforms?` · `h3: What kind of returns can I expect on Nawa Finance?` · `h3: Is my capital safe on Nawa?` · `h3: Who should use Nawa Finance?` · `h3: Do I need KYC to use Nawa?` · `h2: EthicalDeFiYields` · `h2: Grow your funds with Nawa the ethical way`
- Buttons / controls: `Audits` · `View All Vaults` · `Expand` · `Previous slide` · `Next slide` · `Learn more` · `Back to top` · `Subscribe` · `Open menu` · `Previous card` · `Next card` · `What is Nawa Finance? Nawa Finance is a Sharia-compliant DeFi infrastr` · `How does Nawa generate ethical DeFi yield? Nawa generates yield throug` · `Is Nawa Finance Sharia-compliant? Yes, Nawa Finance is structured to b` · `What assets can I deposit into Nawa? Users can deposit assets such as ` · `Is Nawa non-custodial? Yes, Nawa is designed to be non-custodial, allo` · `What makes Nawa different from other DeFi platforms? Nawa is different` · `What kind of returns can I expect on Nawa Finance? Returns on Nawa are` · `Is my capital safe on Nawa? Nawa is designed with security and transpa` · `Who should use Nawa Finance? Nawa Finance is designed for individuals ` · `Do I need KYC to use Nawa? No, Nawa does not require traditional KYC f` · `Submit`
- Navigation: `Sharia Compliance` · `Yield Strategies` · `Insights` · `Use Nawa`
- Only at 390: `Open menu` · `Previous card` · `Next card` · `What is Nawa Finance? Nawa Finance is a Sharia-compliant DeFi infrastr` · `How does Nawa generate ethical DeFi yield? Nawa generates yield throug` · `Is Nawa Finance Sharia-compliant? Yes, Nawa Finance is structured to b` · `What assets can I deposit into Nawa? Users can deposit assets such as ` · `Is Nawa non-custodial? Yes, Nawa is designed to be non-custodial, allo` · `What makes Nawa different from other DeFi platforms? Nawa is different` · `What kind of returns can I expect on Nawa Finance? Returns on Nawa are` · `Is my capital safe on Nawa? Nawa is designed with security and transpa` · `Who should use Nawa Finance? Nawa Finance is designed for individuals `

### permapod — home

- URL: https://www.permapod.xyz/ — read 2026-10-18T22:28:11.952Z (1440) and 2026-10-18T22:28:21.964Z (390); HTTP 200; final URL https://www.permapod.xyz/
- Note: Landing page with "Launch dAPP" and an FAQ; the app itself (app.permapod.xyz) was not opened.
- Title: Permapod
- Headings: `h3: Explore the features of Permapod` · `h3: What is Permapod and how does it work?` · `h3: How do I start using Permapod?` · `h3: What makes Permapod unique?` · `h3: How are interest rates calculated?` · `h3: Is Permapod audited and secure?` · `h3: Contact the team`
- Buttons / controls: `Launch dAPP` · `What is Permapod and how does it work?` · `How do I start using Permapod?` · `What makes Permapod unique?` · `How are interest rates calculated?` · `Is Permapod audited and secure?` · `Go to slide 1` · `Go to slide 2` · `Go to slide 3`
- Only at 390: `Go to slide 1` · `Go to slide 2` · `Go to slide 3`

### imdefa — home

- URL: https://imdefa.com/ — read 2026-10-18T22:28:29.925Z (1440) and 2026-10-18T22:28:40.896Z (390); HTTP 200; final URL https://imdefa.com/
- Note: Landing page; "Contact Us", links to Dune and DefiLlama; a yield calculator section (LIFT / STREAM). No sign-up or app.
- Title: Capital in Motion
- Headings: `h1: Capital in Motion` · `h2: Connecting Web3 Capital with the Real Economy Providing Capital for Pa` · `h2: Introducing DeFa` · `h2: DeFa Already Moving Capital at Scale` · `h2: Backers and Investors` · `h2: Vertically Integrated Capital Movement Platform` · `h2: Agentic AI Powered Operations Core` · `h3: AMIGO` · `h3: CARA` · `h3: DROOG` · `h2: Resilient, Uncorrelated Yield Streams` · `h3: LIFT PayFi Yield from Payment Settlements` · `h3: STREAM TradFi Yield from Business Financing` · `h2: Yield Calculator` · `h3: Preview your receivables-backed returns` · `h3: LIFT` · `h3: STREAM` · `h2: Featured In` · `h2: Institutional Partners` · `h3: Legal` · `h3: Protocol` · `h3: Company`
- Buttons / controls: `Contact Us` · `Dune` · `DefiLlama` · `Back to top` · `Toggle navigation menu`
- Navigation: `Home` · `About Us` · `Blogs`
- Only at 390: `Toggle navigation menu`

### zignaly — closure-article

- URL: https://intercom.help/zignaly/en/articles/17613629-zignaly-is-closing-how-to-withdraw-your-funds — read 2026-10-18T22:28:51.003Z (1440) and 2026-10-18T22:28:58.664Z (390); HTTP 200; final URL https://intercom.help/zignaly/en/articles/17613629-zignaly-is-closing-how-to-withdraw-your-funds
- Note: intercom.help mirror of the help centre (help.zignaly.com answers 403 to automation). Key dates on the page are unchanged since Phase R (15 Oct, 16 Oct 10:00 UTC, 1 Nov, 1 Dec 2026 23:59 UTC).
- Title: Zignaly is closing: how to withdraw your funds | Zignaly Help Center
- Headings: `h1: Zignaly is closing: how to withdraw your funds` · `h1: Key dates` · `h1: If your money is in a trading service or a Z-Index` · `h1: If you're invested in Private Credit` · `h1: Before you withdraw` · `h1: Stay safe` · `h1: After 1 December` · `h1: Need help?`
- Buttons / controls: `Disappointed Reaction 😞` · `Neutral Reaction 😐` · `Smiley Reaction 😃` · `Open menu`
- Navigation: `Login` · `All Collections` · `Zignaly Platform Closure`
- Only at 390: `Open menu`

### ramp — buy-crypto

- URL: https://rampnetwork.com/buy-crypto — read 2026-10-18T22:29:06.728Z (1440) and 2026-10-18T22:29:19.905Z (390); HTTP 200; final URL https://rampnetwork.com/buy-crypto
- Note: Consumer page; cookie banner: "Reject All" clicked. Steps shown: Choose your amount → Create your account → Add a wallet address → Make your payment.
- Title: Buy Crypto Instantly | Secure & Easy with Ramp Network
- Headings: `h1: BUY CRYPTO INSTANTLY, SENT TO YOUR WALLET.` · `h2: Purchase cryptocurrency with credit and debit cards, Apple Pay, Google` · `h2: BUY DIRECTLY TO ANY WALLET YOU ALREADY USE` · `h2: WHAT DO YOU WANT TO BUY?` · `h3: Explore 120+ other assets` · `h2: TRUSTED WORLDWIDE FOR BUYING CRYPTO.` · `h2: HOW TO BUY CRYPTO SECURELY` · `h3: Choose your amount` · `h3: Create your account` · `h3: Add a wallet address` · `h3: Make your payment` · `h2: BUILT-IN SECURITY WHEN BUYING CRYPTO` · `h2: JOIN 10M+ CUSTOMERS` · `h2: NEED HELP? WE'VE GOT YOU COVERED.` · `h3: How fast will I receive crypto after purchase?` · `h3: What payment methods does Ramp Network support for buying crypto?` · `h3: Do I need an exchange account to buy crypto?` · `h3: Can I use both custodial and self-custodial wallets?` · `h3: Is buying crypto with Ramp Network secure?` · `h3: What are the fees for buying crypto?` · `h3: In which countries is crypto available with Ramp Network?` · `h2: GET THE APP FOR HASSLE-FREE CRYPTO`
- Buttons / controls: `Buy` · `Sell` · `Swap` · `More navigation options` · `Get The App` · `Get the App Download the App Get 50% off fees on your next 2 transacti` · `120 more in the app` · `more in the app` · `Buy Crypto now` · `Download The App` · `Buy, Sell or Swap` · `Get the app` · `menu` · `More in the App` · `×`
- Navigation: `Support` · `Get The App`
- Only at 390: `Get the app` · `menu` · `More in the App` · `×`

### banxa — checkout

- URL: https://checkout.banxa.com/ — read 2026-10-18T22:29:33.402Z (1440) and 2026-10-18T22:29:33.694Z (390); HTTP 403; final URL https://checkout.banxa.com/?__cf_chl_rt_tk=XG1W_FKuqUqhaKkybmwgKr4JSb8PuK7ACtQNbZkYhNM-1792362573-1.0.1.1-dtmDGcilcNGLYweHYqScs0U8k_bP2fg1a1AGnrjNsE8
- Note: The consumer checkout linked from banxa.com's "Buy Crypto": Cloudflare managed challenge (HTTP 403, cf-mitigated: challenge); recorded and not waited out.

### banxa — home

- URL: https://banxa.com/ — read 2026-10-18T22:29:33.934Z (1440) and 2026-10-18T22:29:42.166Z (390); HTTP 200; final URL https://banxa.com/
- Note: Cookie banner: "Reject All" clicked. banxa.com is now the business (B2B) site; its "Buy Crypto" navigation link goes to https://checkout.banxa.com (unreadable, below).
- Title: Seamless Crypto & Fiat Conversions | Banxa
- Headings: `h1: Build borderless commerce with embedded crypto` · `h2: Join today's leading businesses` · `h2: Build Anything. Integrate Everything. Crypto Made Flexible.` · `h3: Crypto or Fiat` · `h3: Compliance` · `h3: Streamlining` · `h3: Wallets` · `h2: Code the future of finance. Banxa's APIs Make it Possible.` · `h2: Ready to get started?`
- Buttons / controls: `Cookie Settings` · `Start Building` · `Contact Sales` · `Explore APIs` · `Javascript` · `Python` · `Copy` · `Learn more` · `View Developer Docs`
- Navigation: `Take 2 mins to learn more.` · `Support` · `Docs` · `Start Building` · `Buy Crypto`

### skip-go — home

- URL: https://go.skip.build/ — read 2026-10-18T22:29:50.994Z (1440) and 2026-10-18T22:29:59.116Z (390); HTTP 200; final URL https://go.skip.build/
- Note: Skip Go's public UI ("powered by Cosmos Hub, IBC Eureka & Skip:Go"): two "Select asset" fields, "Connect Wallet", Settings, and a card "Noble USDC.n Is Being Deprecated — Migrate to USDC.inj — Migrate Now" at the read time.
- Title: Skip:Go - Anything Anywhere
- Buttons / controls: `Share this route` · `Build with Skip:Go` · `Need Help?` · `Select asset` · `Connect Wallet` · `Settings` · `×`

### satellite — home

- URL: https://satellite.money/ — read 2026-10-18T22:30:06.023Z (1440) and 2026-10-18T22:30:06.247Z (390); HTTP None; final URL —
- Note: satellite.money did not load: Chrome net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH; curl at 22:19Z: TLS handshake failure (sslv3 alert handshake failure); DNS resolves to Cloudflare addresses (104.18.4.224, 104.18.5.224). Not a bot wall — the site does not complete TLS. Axelar's own routes onto ZIGChain are covered from the chain and Skip in ROUTES_ONTO_ZIGCHAIN.md.

## Ramp asset table and widget probe (`ramp-probe/`)

- https://docs.rampnetwork.com/assets rendered at 2026-10-18T22:39:59.308Z (HTTP 200): on-ramp table 126 rows (header ['swapAsset symbol', 'asset', 'chain', 'asset name']), off-ramp table 91 rows. Screenshot `ramp-probe/ramp-docs-assets-1440.webp`. The codes are in ONRAMP_CODES.md.
- demo-atom: https://app.demo.rampnetwork.com/?hostAppName=ZIGoals%20test&hostLogoUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fcosmos%2Fchain-registry%2Fmaster%2Fzigchain%2Fimages%2Fzigchain.png&defaultFlow=ONRAMP&enabledFlows=ONRAMP&enabledCryptoAssets=COSMOS_ATOM&inAsset=EUR&inAssetValue=5000 — read 2026-10-18T22:40:01.686Z, HTTP 200; the widget showed: "INTEGRATION ISSUE DETECTED / The application isn't properly connected to Ramp Network. You can visit Ramp Network directly to buy or sell crypto." (no hostApiKey was passed; nothing was clicked; its cookie banner offered only Manage / Accept all and was left alone). Screenshot `ramp-probe/ramp-demo-atom-1440.png`.
- demo-base-usdc: https://app.demo.rampnetwork.com/?hostAppName=ZIGoals%20test&hostLogoUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fcosmos%2Fchain-registry%2Fmaster%2Fzigchain%2Fimages%2Fzigchain.png&defaultFlow=ONRAMP&enabledFlows=ONRAMP&enabledCryptoAssets=BASE_USDC&inAsset=EUR&inAssetValue=5000 — read 2026-10-18T22:40:07.919Z, HTTP 200; the widget showed: "INTEGRATION ISSUE DETECTED / The application isn't properly connected to Ramp Network. You can visit Ramp Network directly to buy or sell crypto." (no hostApiKey was passed; nothing was clicked; its cookie banner offered only Manage / Accept all and was left alone). Screenshot `ramp-probe/ramp-demo-base-usdc-1440.png`.
- prod-atom: https://app.rampnetwork.com/?hostAppName=ZIGoals%20test&hostLogoUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fcosmos%2Fchain-registry%2Fmaster%2Fzigchain%2Fimages%2Fzigchain.png&defaultFlow=ONRAMP&enabledFlows=ONRAMP&enabledCryptoAssets=COSMOS_ATOM&inAsset=EUR&inAssetValue=5000 — read 2026-10-18T22:40:13.508Z, HTTP 200; the widget showed: "INTEGRATION ISSUE DETECTED / The application isn't properly connected to Ramp Network. You can visit Ramp Network directly to buy or sell crypto." (no hostApiKey was passed; nothing was clicked; its cookie banner offered only Manage / Accept all and was left alone). Screenshot `ramp-probe/ramp-prod-atom-1440.png`.

