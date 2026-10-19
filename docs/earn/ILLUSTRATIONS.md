# Earn illustrations — provenance (Session AF chunk 2, lane L1, P1.18)

The Earn page shows, for each app with a page automation could read, a numbered step-by-step of **what the person will see
on the app's own page**, redrawn by ZIGoals in its nebula style. Each set is its own lazy chunk
(`apps/web/components/earn/illustrations/*.tsx`, loaded only when its "What you'll see on …" disclosure is opened; one chunk
per app — Valdora's two sets share one). Every screen is inline SVG under 6 KB, labelled for screen readers ("<App>, step n:
…"), with its step in words beside it. `apps/web/lib/earn/illustrations.test.ts` checks the size, the labels, the numbering
and that no screen carries a figure, a logo, a link, an image or an animation.

**What is redrawn:** layout, buttons and labels only, as the captures show them (the labels are the pages' own words).
**What is not:** logos, photos, any figure (rates, totals, prices — the forms show the empty "0.00" the page shows before a
wallet connects, or the word "amount"), any text beyond labels, and anything the captures did not show. A gold numbered
mark points at the one control of each step.

**Source captures:** `$HOME/zigoals-af/captures/reference/` (Session AF Part 0; index `INDEX.md` there, raw records
`results.jsonl`), read 2026-10-18 between 22:21:54 and 22:30:06 UTC with Playwright's Chrome channel at 1440 × 900 and
390 × 844; GET navigation only, never logged in, never connected a wallet, never typed, never accepted terms. The captures
stay outside the repository (they are third-party pages); only these redrawings are committed.

| Set (`IllustrationSlot set`) | Screens | Drawn from (capture files, read UTC) | Notes |
|---|---|---|---|
| `valdora-stake` (Valdora section) | 4: the Stake card with Connect Wallet; amount, 25 % / 50 % / Max and Stake; the wallet's approval; the Unstake tab and Claim | `valdora/stake-1440.png`, `stake-390.png` (22:22:18 / 22:22:27), `valdora/unstake-1440.png`, `unstake-390.png` (22:22:36 / 22:22:44) | The wallet window (screen 3) is drawn as a generic "Your wallet" panel: the picker was never opened, so no wallet's own screen is imitated. The "5.46 % APR" badge on the page is left out (a figure ZIGoals does not show). |
| `valdora-vault` (USDC vaults) | 3: a vault page with Supply / Withdraw; Supply and approve; Withdraw as a request | `valdora/vault-stablecoin-yield-1440.png`, `-390.png` (22:23:14 / 22:23:22), `valdora/vaults-1440.png` (22:22:52) | "Current TVL" and "Current APY" (page figures) are left out; the section headings ("Strategy Details", "Withdrawal Mechanics", "Risk Information") are the page's. |
| `oroswap-swap` (OroSwap section) | 3: the Terms of Service gate; the Swap card (From / To, 50 % / Max, 0.5 % slippage, Connect Wallet); slippage and Swap | `oroswap/swap-1440.png`, `swap-390.png` (22:23:55 / 22:24:02) | Part 0 did not accept OroSwap's terms (the person's own choice), so the swap card was read dimmed behind the gate; the gate is drawn as step 1 with "accepting is your own decision". |
| `oroswap-pools` (OroSwap section) | 2: Liquidity Pools with Create and Deposit; both amounts and Deposit | `oroswap/pools-1440.png`, `pools-390.png` (22:24:09 / 22:24:16) | The deposit form's layout after Deposit was not visible behind the gate: drawn as two token fields and the Deposit button, the minimal form the labels describe. |
| `keplr-staking` (Native staking section) | 2: the ZIGChain page with Connect Wallet; the validator table (Validator, Voting Power, Commission, Active (14)) | `keplr/chain-zigchain-1440.png`, `-390.png` (22:24:31 / 22:24:45), `keplr/staking-deeplink-1440.png` (22:24:59) | Keplr's staking window opens only with a connected wallet, which Part 0 never did: that step is in words only. Keplr's "Staking APR" figure is left out. |
| `skip-go` ("Earn with stablecoins") | 2: two "Select asset" fields; Connect Wallet for each network | `skip-go/home-1440.png`, `home-390.png` (22:29:50 / 22:29:59) | The route review after connecting was not read: described in words. The page's "Noble USDC.n is being deprecated" card is not drawn (the section states Circle's notice itself, with its source). |
| `nawa-vaults` (Nawa section) | 1: the landing page and "View All Vaults" | `nawa/home-1440.png`, `home-390.png` (22:27:36 / 22:27:46), `nawa/app-1440.png` (22:27:54) | app.nawa.finance showed the same landing page without a wallet; its vault screens were not seen and are not drawn. |

**Text steps only (unreadable to automation, no picture):** the ZIGChain Hub (staking, proposals, bridge — Cloudflare
challenge, HTTP 403 at 22:25:40–22:25:42 UTC), the ZIGChain faucet (HTTP 403, 22:25:43), Banxa's checkout (HTTP 403,
22:29:33) and Satellite (TLS error, 22:30:06). The Start-here path's practice and Get-ZIG steps, the Native staking section's
Hub link and the stablecoins section describe them in words. Permapod, DeFa and Zignaly have no picture by design: none is
an option a person can act on today (paused, private, closing).

**Re-drawing:** when an app changes its page, re-capture it with `$HOME/zigoals-af/bin/capture-reference.mjs` (same rules),
update the set's screens and its row above, and keep the read date in the set's `Illustration readOn` (the note under the
pictures says "as it looked on <date>").
