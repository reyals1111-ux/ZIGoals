# Session AF — lane L2b (wallets, read-only tracking, multi-asset Add money, Goal Vaults)

Branch `af/wallet`, from `feature/session-af-wealth-unlocked` at `206a26c4` (Earn hub, verified link registry and Checklist
merged). Server port 3104 only. Every build, Playwright run and screenshot under `$HOME/zigoals-af/bin/with-lock.sh` +
`tmo.sh`. Nothing pushed. This file is the lane's running record for the lead; it is updated with every step's commit.

## Status by step (brief order)
| # | Step | State |
|---|---|---|
| 1 | `TIER 3 (wallet)`: real read-only connections (EIP-6963 six wallets, Solana Wallet Standard, phones' in-app browsers, WalletConnect "available soon") | done |
| 2 | `TIER 3 (storage)`: linked-wallets `chains`/`via`/kind `solana`; `zigoals:wallet-balances:v1` | pending |
| 3 | `TIER 3 (CSP)` + read-only tracking (browser-direct readers, pricing, What you have) | pending |
| 4 | Multi-asset Add money | pending |
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

## What the lead must wire
- **Verified link registry rows** (L1's `packages/ecosystem-registry` providers.json + verified-links.ts; this lane keeps
  them in `apps/web/lib/wallets/links.ts` in the registry's record shape until moved): `metamask-site`, `rabby-site`,
  `coinbase-wallet-site`, `trust-site`, `okx-wallet-site`, `phantom-site`, `metamask-dapp` (prefix), `trust-dapp` (prefix).
  When moved, `lib/wallets/links.ts` can re-export them from the registry; `lib/wallets/connections.test.ts` already accepts
  either source.
- After merging L2a: put L2a's "Open ZIGoals in Keplr" (`keplrMobileLink`) as the first item of
  `components/wallet/phone-wallet-paths.ts`'s group.

## Assertions changed
- `apps/web/lib/wallet-menu.test.ts` (AE): the exact list of menu items gains `Get Trust Wallet`, `Get OKX Wallet`,
  `Get Phantom` (after AE's three) and the Solana group's `Get Phantom for Solana`; still an exact, ordered list (equal
  strength). Reason: the brief's six R4 wallets and the Solana group.

## Tests (step 1)
`pnpm exec vitest run apps/web/lib/wallet-guard.test.ts apps/web/lib/wallets apps/web/lib/linked-wallets.test.ts
apps/web/lib/wallet-link.test.ts apps/web/lib/wallet-menu.test.ts apps/web/lib/wallet-card.test.ts
apps/web/lib/public-integrations.test.ts`: 48 passed. `wallet-guard.test.ts` gains the Solana side (a new describe block;
AE's three tests untouched): lib/wallets files name no signing/sending/permission method, make no request, and call exactly
`standard:connect` and `standard:disconnect`; no `solana:sign…` anywhere in the wallet files or components.
