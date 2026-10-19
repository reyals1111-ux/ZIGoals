# WalletConnect: `@walletconnect/sign-client` 2.26.0

Session AF, lane L2b (ADR-028 D1 (a), H6, H38; owner-approved at plan review, amendment 1). Added in the
`TIER 3 (dependencies)` commit of `af/wallet`. This page records what the dependency is, the licence it comes under (read
from the installed package, `node_modules/@walletconnect/sign-client/LICENSE.md`, "Release Date: 20 August 2025", 20,091
bytes, sha256 prefix `1cb6f8cfe21f54ab`; `@walletconnect/core`, `types` and `utils` 2.26.0 carry the identical file), and how
ZIGoals uses it.

## What was added
- `@walletconnect/sign-client` **2.26.0** (exact; published 2026-10-08, ten days before it was added) in
  `apps/web/package.json`, installed with `--ignore-scripts`. It brings 67 packages with it (68 in all): 57 MIT, 3 ISC,
  4 under the WalletConnect Community License (sign-client, core, types, utils), and one each Apache-2.0, BlueOak-1.0.0,
  "(Apache-2.0 AND MIT)" and 0BSD. Their exact licence texts are in `apps/web/public/licenses/walletconnect.txt`.
- No AppKit, no `@reown/appkit`, no `@keplr-wallet/wc-client` (its peer dependencies include `starknet`; the three Cosmos
  methods are called on the sign-client directly when lane L2a needs them).

## The WalletConnect Community License, in plain words
- **Who grants it**: Reown, Inc. It is not an open-source (OSI) licence. By installing or using the package, the
  organisation becomes a "Licensee" bound by it.
- **What it allows** (§1a–b): using, copying, modifying and distributing the package worldwide, non-exclusively; free of
  charge for building, maintaining and improving an app, **subject to the commercial thresholds below**.
- **Commercial thresholds** (§3): if the app's use goes over **2,500,000 remote processing calls (RPCs) a month** or **500
  monthly active users (MAUs)**, the owner must take a paid commercial licence. An MAU is a unique externally owned account
  (or embedded wallet) that authenticates and connects to the app in a 30-day period. Reown may change these thresholds
  (published in its Terms of Service). The Alpha is far below 500 monthly users (owner's decision D1), and ZIGoals only
  connects on a person's tap; the owner should watch Reown's dashboard counts as the app grows.
- **Notice duty** (§2a): an app that uses it must (i) show the notice **"Portions © 2025 Reown, Inc. All Rights Reserved"**
  in its notices or readme, or in the "about" section of the website for a service; (ii) provide a copy of the licence with
  the app; (iii) carry the "applicable logo and branding". ZIGoals ships (ii) as `/licenses/walletconnect.txt`, whose first
  lines carry (i); the About panel line is for the lead (below). (iii) is not defined further in the licence; no Reown logo
  is shown (the licence's §2d forbids using Reown's marks to imply endorsement) — **an owner question** if Reown asks for a
  logo.
- **The Network** (§2b): any use must connect to Reown's own gateway (the WalletConnect relay); routing around it is
  forbidden. ZIGoals uses the default relay.
- **Modifications** (§1c): any change to the package itself would belong to Reown and must be marked; ZIGoals does not
  modify it (it is used as installed). The app built with it stays ZIGoals' own (§1c(ii)).
- **Marks** (§2d): no use of Reown's names or logos to suggest endorsement.
- **Export controls** (§2e), **no warranty** (§4), **no liability** (§5), **confidentiality** of non-public parts (§7),
  **termination** on an uncured material breach after 30 days' notice (§8b), **Delaware law** (§9) and **binding individual
  arbitration, no class actions** (§10). Amendments apply going forward (§11a). The owner accepted these terms (D1).

## How ZIGoals uses it (and what it never does)
- **Dormant until the owner's project ID**: `apps/web/config/public-integrations.json` `reownProjectId` is `null`; while it
  is, the package is never loaded (one dynamic `import()` inside `startWalletConnect` in `apps/web/lib/wallets/walletconnect.ts`,
  reached only from the phone sheet's "Connect by WalletConnect", which is not even shown), no request is made, and phones
  say "WalletConnect … available soon on phones" (H6). Tests: `lib/wallets/walletconnect.test.ts` (no static import
  anywhere, nothing loads with a null ID), `lib/wallets/walletconnect-panel.test.ts` (the package is asked for only on the tap).
- **Read-only**: the session asks for accounts only (EVM and Solana with no method; Cosmos with `cosmos_getAccounts`); the
  addresses are read from the approved session and linked read-only. Lane L2a's signer may later add Cosmos signing methods
  for Keplr Mobile through `startWalletConnect({cosmosMethods})` and reach the live session through `walletConnectSession()`;
  the wallet guard keeps every signing method name out of the lane's files.
- **Nothing stored**: the client's pairing and session live in memory for the tab (`memoryStorage()`); telemetry is off
  (`telemetryEnabled: false`, so the pulse host is never contacted).
- **Weight**: the package is its own lazy chunk, about **129.6 kB gzip** (plus an 11.1 kB menu chunk that also carries the
  wallet menu), measured on the 2026-10-18 production build; no page's HTML loads it (`check-weight-budget.mjs` all ok).
- **CSP, only in the commit that sets the project ID** (H38): connect-src `wss://relay.walletconnect.org`,
  `https://verify.walletconnect.org`, `https://verify.walletconnect.com`; frame-src `https://verify.walletconnect.org`,
  `https://verify.walletconnect.com` (Verify's attestation frame) — read from the installed 2.26.0 dist. With telemetry off
  the pulse host is not needed; `rpc.walletconnect.org` (signature checks for sign-in-with-Ethereum) and
  `echo.walletconnect.com` (wallet push) are not used by this flow. `lib/wallets/walletconnect.test.ts` fails unless these
  hosts are in the policy exactly when the ID is set, so the ID and the CSP change land together. `public-safety.test.ts`'s
  "no websocket anywhere" assertion then narrows to the one relay socket in that same commit.

## For the owner when the project ID is created
1. dashboard.reown.com → create the project → copy the Project ID (public by design) → Configuration → Domain → add
   `https://alpha.zigoals.app` (the same value the app sends as `metadata.url`).
2. In one commit: set `reownProjectId` in `apps/web/config/public-integrations.json`; add the five hosts above to
   `apps/web/lib/egress-policy.json` (`csp.app.connect`, `csp.app.frame`) with the exact-list tests; the hosted verifier's
   origin list (lead).
3. Watch Reown's MAU and RPC counts against the §3 thresholds.
