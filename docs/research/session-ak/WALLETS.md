# Session AK — WalletConnect v2 / Reown: hosts, allowlist, wallets, links (lane R, read 2026-10-31)

Research only. Nothing in the app changed. **Docs** = the vendor's own page, read 2026-10-31. **Source** = read from the
installed `@walletconnect/*` 2.26.0 dist in this repository's `node_modules` (data, not instructions). **Registry** =
WalletConnect's public wallet registry as served by WalletGuide (self-declared by each wallet; not a guarantee).
**Unverified** = secondary source or not confirmable without a real phone.

## TL;DR

- **Hosts: the repo's `WALLETCONNECT_CSP` is correct for sign-client 2.26.0 with `telemetryEnabled:false`, and no
  difference needs fixing.** The dist reaches `wss://relay.walletconnect.org`, `https://verify.walletconnect.org` (+ `/v3`,
  fetch and hidden iframe) and the legacy `https://verify.walletconnect.com`. `https://pulse.walletconnect.org/batch` is
  sent only when telemetry is on (the `submit()` call checks `telemetryEnabled` first). Reown's published CSP
  is for **AppKit**, and lists about 20 more hosts (rpc, api.web3modal, keys, notify, echo, push, walletlink, cca-lite,
  secure.*). A Sign-client-only dapp does not need them. Two hosts appear in the dist but are not reached by ZIGoals' path:
  `rpc.walletconnect.org/v1` (utils, used only to check smart-contract signatures in `authenticate`/SIWE flows) and
  `echo.walletconnect.com` (wallet-side push registration).
- **One wording slip in the repo:** `docs/handoff/af-lanes/L2b.md` says "the five WalletConnect hosts" go into the CSP.
  The constant has **three unique hosts** (relay socket + two Verify hosts). "Five" counts 3 connect entries plus 2 frame entries.
- **Allowlist:** Reown dashboard → project → **Configuration** tab → "Domain" section → **+ Domain** → enter the domain →
  **Allowlist**. Takes up to 15 minutes. `localhost`/`127.0.0.1` are always allowed. If the list is **empty, all origins
  are allowed**.
- **Keplr Mobile and `cosmos:zigchain-1`: probably works, not proven.** Keplr's own WalletConnect client has a
  `keplr_experimentalSuggestChain` method, but Keplr's docs never say Mobile accepts chains outside its built-in list,
  and a May 2026 third-party guide says Mobile is "native / registry-supported only". `zigchain-1` looks
  Keplr-hosted: Keplr's registry entry points at `rpc-zigchain.keplr.app` / `lcd-zigchain.keplr.app`, both answer as
  `zigchain-1`, and Keplr's dashboard has a ZIGChain staking page. A Keplr-run node usually means a native chain, so
  `zigchain-1` most likely works. **`zig-test-2` is only in the community registry (Numia endpoints)**, so it most
  likely does **not** work on Mobile over WalletConnect. Test both on a real phone before promising either.
- **Trust Wallet's developer page lists only "Ethereum and all EVM chains" and "Solana"** for WalletConnect. Its registry
  entry also lists `cosmos:cosmoshub-4`, `kava-4` and `thorchain-mainnet-v1`, but not ZIGChain. L2b's line "WalletConnect
  (Trust, Ledger Wallet, Keplr Mobile …)" is fine for EVM/Solana addresses. Trust will not give a `zig1…` address.
- **URI length:** what sign-client 2.26 `connect()` produces is **187 characters**. Worst realistic case (with
  `methods=`) is about 264. URL-encoded inside a wallet link it is about 203–280. The repo's 2,000-character guard is
  roughly 7× the worst case.

---

## (a) Hosts a dapp using `@walletconnect/sign-client` 2.26 must reach

### What the installed 2.26.0 code contains (Source)

`grep` over `node_modules/.pnpm/@walletconnect+*/…/dist` (2026-10-31), counted by unique URL:

| Host | Where in dist | Reached by ZIGoals? | Why |
|---|---|---|---|
| `wss://relay.walletconnect.org` | core `RELAYER_DEFAULT_RELAY_URL` | **Yes** | The relay socket (`?projectId=…&auth=…`). |
| `https://verify.walletconnect.org` and `/v3` | core `VERIFY_SERVER`, `VERIFY_SERVER_V3` | **Yes** | `fetch(\`${verifyUrlV3}/public-key\`)` and a hidden `<iframe>` for the attestation (`createElement("iframe")`, `verify_attestation` message). |
| `https://verify.walletconnect.com` | core `TRUSTED_VERIFY_URLS` | **Yes (frame/connect, legacy)** | Still in the trusted list. |
| `https://pulse.walletconnect.org/batch` | core `EVENTS_CLIENT_API_URL` | **No** with `telemetryEnabled:false` | `submit=async()=>{if(!this.telemetryEnabled\|\|…)return;…}`, and events are only stored when telemetry is on. |
| `https://rpc.walletconnect.org/v1` | utils | **No** | Used to check EIP-1271/6492 signatures in one-click auth (`authenticate`), which ZIGoals does not call. |
| `https://echo.walletconnect.com` | core `ECHO_URL` | **No** | Wallet-side push-token registration. |

### What Reown publishes (Docs)

- **CSP page (AppKit only)**, <https://docs.reown.com/advanced/security/content-security-policy> (read 2026-10-31). Its
  `connect-src` lists `rpc.walletconnect.{com,org}`, `relay.walletconnect.{com,org}` (https + wss),
  `pulse.walletconnect.{com,org}`, `api.web3modal.{com,org}`, `keys.walletconnect.{com,org}`,
  `notify.walletconnect.{com,org}`, `echo.walletconnect.{com,org}`, `push.walletconnect.{com,org}`, `wss://www.walletlink.org`
  and `https://cca-lite.coinbase.com`. Its `frame-src` lists `verify.walletconnect.{com,org}` and
  `secure.walletconnect.{com,org}`. It calls itself "a **partial CSP** that covers WalletConnect's libraries and services
  for AppKit". There is **no Sign-client-specific list** on Reown's site.
- **Relay page**, <https://docs.reown.com/cloud/relay> (read 2026-10-31): the example URL is
  `https://relay.walletconnect.com/?projectId=…`. The 2.26 dist uses the **.org** socket, and `.com` is never reached.

### Comparison with `apps/web/lib/wallets/walletconnect.ts`

| Repo `WALLETCONNECT_CSP` | Needed for sign-client 2.26 + telemetry off | Verdict |
|---|---|---|
| connect `wss://relay.walletconnect.org` | yes | match |
| connect `https://verify.walletconnect.org` | yes (public key fetch) | match |
| connect `https://verify.walletconnect.com` | legacy, harmless | match |
| frame `https://verify.walletconnect.org`, `https://verify.walletconnect.com` | yes (attestation iframe) | match |
| — | `pulse.walletconnect.org` only if telemetry is turned on | **correctly absent** |
| — | `api.web3modal.*`, `rpc.*`, `keys.*`, `notify.*`, `echo.*`, `push.*`, `secure.*` | AppKit only. **Correctly absent.** |

**No host difference.** One thing to watch: if a future upgrade or L2a signer calls `client.authenticate(...)` (SIWE /
one-click auth), the utils call `rpc.walletconnect.org/v1` to verify smart-contract-wallet signatures, so that host would
need adding. Re-run the `grep` above on every version bump. Reown says "Directives may need updates after SDK upgrades".

## (b) Reown dashboard allowed domains

From <https://docs.reown.com/cloud/dashboard-configuration-settings> and
<https://docs.reown.com/appkit/domain-verification> (both read 2026-10-31):

1. Sign in at <https://dashboard.reown.com> and open the project.
2. Select the **Configuration** tab.
3. Scroll to the **Domain** heading (bottom half of the page). Click the blue **+ Domain** button.
4. Type or paste the domain, then click **Allowlist**.

Rules, from <https://docs.reown.com/cloud/relay>:
- Format `[scheme://]<hostname>[:port]`. If a scheme or port is given it must match exactly. `*` wildcards are allowed only
  as a whole label (`https://*.example.com` matches `www.example.com` but not `example.com`; `www-*` is invalid).
- "`localhost` (or `127.0.0.1`) is always permitted, and if empty all origins are allowed. Updates take 15 minutes to apply."
- Error codes: 401 = project ID doesn't exist or JWT expired; 403 = "Exists and is invalid" (origin not allowed);
  1013 = too many requests.
- The same allowlist entry is what Verify uses for the "Domain match" badge. The page says that Verify requires an
  AppKit/AppKit Core dapp **and** a WalletKit wallet, so a bare sign-client dapp may show "Cannot verify" in some wallets
  (**unverified** for sign-client).

Owner recommendation: add `https://<production host>` (and the preview host if any) **before** setting `reownProjectId`;
an empty list means any site can use the ID.

## (c) Per wallet: namespaces, chains, methods

| Wallet | Official WC doc | eip155 | solana | cosmos | Cosmos methods | Source / confidence |
|---|---|---|---|---|---|---|
| **MetaMask Mobile** | none for WC (MetaMask now steers dapps to "MetaMask Connect") | yes (registry: eip155:1, 10, 137, 42161, 8453 + others) | **not in registry**. MetaMask has native Solana and MetaMask Connect Solana, but no doc says Solana works over WalletConnect | no | — | Registry; MetaMask docs <https://docs.metamask.io/metamask-connect/supported-platforms.md>. Medium. A known GitHub issue says MetaMask Mobile's WC v2 did not honour optional namespaces (<https://github.com/MetaMask/metamask-mobile/issues/6703>, date not seen): **test that `optionalNamespaces`-only proposals connect.** |
| **Trust Wallet** | <https://developer.trustwallet.com/developer/develop-for-trust/mobile> | yes ("Ethereum and all EVM chains") | yes | registry lists `cosmos:cosmoshub-4`, `kava-4`, `thorchain-mainnet-v1`; **docs do not** | not documented | Docs (High for EVM/Solana); registry only for Cosmos (Low). |
| **OKX Wallet** | OKX Connect docs (own SDK), e.g. <https://web3.okx.com/onchainos/dev-docs/wallet/dapp-connect/app-connect-cosmos-ui> | yes | yes (registry) | OKX Connect shows `cosmos:cosmoshub-4`, `cosmos:osmosis-1` for **its own SDK** (app ≥ 6.94.0) | not documented for WC | Registry for WC (Medium). The OKX docs cover OKX Connect, not plain WalletConnect. "If a requested chain is not supported by the wallet, the wallet rejects the connection" (EVM page), so **put unsupported chains only in optional namespaces.** |
| **Ledger Wallet (ex-Ledger Live)** | blog <https://www.ledger.com/blog/walletconnect-now-available-on-desktop-with-ledger-live>; dev portal lists EVM mainnets | yes (Ethereum, BSC, Arbitrum, Optimism, Base, Polygon…) | registry lists `solana:5eykt…` | no | — | Registry + blog. Medium for EVM, Low for Solana. |
| **Keplr Mobile** | <https://docs.keplr.app/api/mobile/wallet-connect> (setup only) | registry lists many EVM chains (Keplr has EVM support) | no | **yes** | `cosmos_getAccounts`, `cosmos_signDirect`, `cosmos_signAmino` and `keplr_*` (`keplr_getKey`, `keplr_signAmino`, `keplr_signDirect`, `keplr_signArbitrary`, `keplr_enable`, `keplr_signEthereum`, `keplr_experimentalSuggestChain`, `keplr_suggestToken`) | Source of Keplr's own `@keplr-wallet/wc-qrcode-modal` 0.13.41 (unpkg, read 2026-10-31): its `connect()` sends exactly that method list as **requiredNamespaces.cosmos**, with events `accountsChanged`, `chainChanged`, `keplr_accountsChanged`. High that Keplr Mobile accepts these. |

### Keplr Mobile and custom chains (`cosmos:zigchain-1`, `cosmos:zig-test-2`): the honest answer

What is documented or checked:
1. **Keplr's WC client supports suggesting a chain over WalletConnect at the protocol level.**
   `@keplr-wallet/wc-client` 0.13.41 (`build/index.js`) sends
   `{method:"keplr_experimentalSuggestChain", params:{chainInfo}}` over the existing session, and `keplr_enable` with
   `params:{chainId:[…]}`. It then waits for the session namespaces to gain an account for that chain. It sends requests
   on `getNamespaceChainId()`, which defaults to `cosmos:cosmoshub-4`. **That means the session must already hold one chain
   the wallet accepted.**
2. **Keplr's docs describe suggest-chain for the extension only**
   (<https://docs.keplr.app/api/guide/suggest-chain>), and the native-vs-non-native help page lists "Mobile" as a benefit
   of **native** integration only: "full support across Keplr products, including … Mobile"
   (<https://help.keplr.app/for-devs/5R3bMyjtqYD4gPyC7pX2rJ/native-vs-non-native-chain-integration/5R3bMyjtqZKXyrzxKZ1Rhj>).
   Non-native integration "is more than enough to make your chain usable in Keplr **Extension**".
3. **A third party (cheqd, 2026-05-11, <https://cheqd.io/?p=20515>) states**: "Keplr Mobile does **not** use the desktop
   experimentalSuggestChain popup flow" and "Keplr Mobile should be treated as a native / registry-supported flow only."
   Secondary, but consistent with point 2.
4. **ZIGChain in Keplr's registry** (jsDelivr mirror of `chainapsis/keplr-chain-registry`, read 2026-10-31):
   - `cosmos/zigchain.json`: `chainId "zigchain-1"`, `rpc "https://rpc-zigchain.keplr.app"`,
     `rest "https://lcd-zigchain.keplr.app"`, `walletUrlForStaking "https://wallet.keplr.app/chains/zigchain?…"`,
     currency `azig`/18, features `["cosmwasm"]`. Checked: `rpc-zigchain.keplr.app/status` answers `network "zigchain-1"`,
     the LCD answers 200, and `wallet.keplr.app/chains/zigchain` answers 200. Keplr running its own endpoints and a dashboard
     page usually means a **native** chain. That would put `zigchain-1` in Keplr Mobile's built-in list. **Inferred, not stated.**
   - `cosmos/zig-test.json`: `chainId "zig-test-2"`, Numia public endpoints. That is a community/suggest entry, and
     **most likely not available in Keplr Mobile**.
5. The registry's Keplr entry lists `cosmoshub-4`, `irishub-1`, `kava-4`, `likecoin-mainnet-2` and `columbus-4`, which is
   clearly stale or partial. It cannot settle the question.

**Practical guidance for L2a/L2b:**
- Put `cosmos:zigchain-1` in **optionalNamespaces** (as the repo does). If Keplr Mobile does not know the chain, the session
  should still settle for the other namespaces, not fail. Put **`zig-test-2` only in optional namespaces, never required.**
- If the approved session holds no `cosmos:zigchain-1` account, show "Open ZIGoals in Keplr's browser" (the in-app browser
  deep link below) instead of retrying.
- **Before claiming support, run one real-phone test** on current Keplr Mobile (iOS and Android). Propose
  `optionalNamespaces.cosmos.chains=["cosmos:zigchain-1"]` with `methods:["cosmos_getAccounts"]`, and record
  whether a `zig1…` account comes back. Do the same for `zig-test-2`.

## (d) Deep / universal links for a `wc:` URI

| Wallet | Link | Status |
|---|---|---|
| Trust Wallet | `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}` | **Docs** (Trust developer page above). The doc warns: "On iOS Safari, `window.open()` must be called synchronously in response to a user action." |
| MetaMask Mobile | `metamask://wc?uri=${encodeURIComponent(uri)}`. The universal link `https://metamask.app.link/wc?uri=…` is in common use | **Registry** gives `mobile_link: "metamask://"`, plus WalletConnect's generic rule `scheme://wc?uri=`. MetaMask's own deeplink doc (<https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks.md>) lists `https://link.metamask.io/dapp/{dappUrl}`, `/send/…`, `/buy` and `/sell`, **and no `wc` route**. Medium/Low. GitHub issues report iOS Safari opening the App Store for `metamask.app.link/wc` (<https://github.com/MetaMask/metamask-mobile/issues/6457>). |
| OKX Wallet | Registry: `mobile_link "okex://main"`, `link_mode "https://www.okx.com/download?appendQuery=true&deeplink=okx://web3/wallet/walletConnect"` | **Registry only**. No official OKX doc for a plain `wc:` deep link was found. Low. |
| Ledger Wallet | `ledgerlive://wc?uri=${encodeURIComponent(uri)}` | **Registry** (`mobile_link`/`desktop_link: "ledgerlive://"`) + Ledger's Connect Kit code (secondary). Medium. |
| Keplr Mobile | iOS `keplrwallet://wcV2?${uri}`; Android `intent://wcV2?${uri}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;` | **Source** of Keplr's `wc-qrcode-modal` 0.13.41 `build/modal.js`. Note the URI is **appended raw, not encoded**. Registry: `mobile_link "keplrwallet://wcV2"`, `link_mode "https://deeplink.keplr.app/"`. |
| Keplr in-app browser | `https://deeplink.keplr.app/web-browser?url=<encoded https URL>` (universal); `keplrwallet://web-browser?url=…` (iOS); `intent://web-browser?url=…#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;` (Android) | **Docs** <https://docs.keplr.app/api/mobile/deeplink> ("Requires Keplr v2.0.63 or later"; universal links fall back to a website if the app is missing). |

WalletConnect's generic rule (Docs, <https://docs.walletconnect.com/wallets/ios/mobile-linking.md>):
`examplewallet://wc?uri=wc:…@2?relay-protocol=irn&symKey=…` or `https://example.wallet/wc?uri=…`. The doc says "Developers
should prefer Deep Linking over Universal Linking". After pairing, a sign request opens the same link with a bare
`wc:<id>@2` that wallets ignore (it only brings the wallet to the front).

## (e) Maximum realistic pairing URI length

Format (Docs, <https://specs.walletconnect.com/2.0/specs/clients/core/pairing/pairing-uri>, "Last updated on Feb 24, 2026"):
`uri = "wc" ":" topic [ "@" version ][ "?" parameters ]` with `symKey`, `methods` (optional), `relay-protocol` and
`expiryTimestamp` ("should be generated 5 minutes in the future").

What 2.26.0 actually builds (Source, utils `Yr()`): parameters **sorted alphabetically** and URL-encoded by
`URLSearchParams`. `sign-client.connect()` calls `pairing.create({internal:{skipSubscribe:true}})` **without methods**, so:

`wc:<64 hex topic>@2?expiryTimestamp=<10 digits>&relay-protocol=irn&symKey=<64 hex>`

| Case | Length (chars) |
|---|---|
| `connect()` as ZIGoals uses it | **187** |
| `authenticate()` (adds `methods=wc_sessionAuthenticate`) | 218 |
| Spec example `methods=[wc_sessionPropose],[wc_authRequest,wc_authBatchRequest]` (brackets and commas percent-encoded add more) | ~264–290 |
| `encodeURIComponent` of the 187-char URI | 203 |
| Full Trust link | 239 |
| Full `metamask://wc?uri=` link | 221 |
| Full Keplr Android `intent://` link (raw URI) | 261 |

Optional `relay-data` could add more, but 2.26 does not emit it for the default relay. The repo's
`uri.length > 2000` guard in `trustWalletConnectLink` is safe. A tighter check (`/^wc:[0-9a-f]{64}@2\?/` and ≤ 512
chars) would also hold.

## Sources (all read 2026-10-31)

- Reown CSP: <https://docs.reown.com/advanced/security/content-security-policy> (raw `.md` fetched)
- Reown Relay (project ID, allowlist rules, error codes): <https://docs.reown.com/cloud/relay>
- Reown dashboard configuration (Domain, + Domain, Allowlist): <https://docs.reown.com/cloud/dashboard-configuration-settings>
- Reown domain verification: <https://docs.reown.com/appkit/domain-verification>
- WalletConnect pairing URI spec: <https://specs.walletconnect.com/2.0/specs/clients/core/pairing/pairing-uri>
- WalletConnect mobile linking: <https://docs.walletconnect.com/wallets/ios/mobile-linking.md>
- Installed dist: `node_modules/.pnpm/@walletconnect+core@2.26.0…`, `@walletconnect+sign-client@2.26.0…`, `@walletconnect+utils@2.26.0…`
- WalletConnect registry via WalletGuide: <https://walletguide.walletconnect.com/?search=keplr> (server-rendered payload; wallet entries for Keplr, MetaMask, Trust Wallet, OKX Wallet, Ledger Wallet)
- Keplr WC docs: <https://docs.keplr.app/api/mobile/wallet-connect>; deeplinks: <https://docs.keplr.app/api/mobile/deeplink>; suggest chain: <https://docs.keplr.app/api/guide/suggest-chain>
- Keplr native vs non-native: <https://help.keplr.app/for-devs/5R3bMyjtqYD4gPyC7pX2rJ/native-vs-non-native-chain-integration/5R3bMyjtqZKXyrzxKZ1Rhj>
- Keplr packages: <https://unpkg.com/@keplr-wallet/wc-client/build/index.js>, <https://unpkg.com/@keplr-wallet/wc-qrcode-modal/build/index.js>, `…/build/modal.js` (v0.13.41)
- Keplr chain registry (jsDelivr mirror): <https://cdn.jsdelivr.net/gh/chainapsis/keplr-chain-registry@main/cosmos/zigchain.json>, `…/cosmos/zig-test.json`; README <https://github.com/chainapsis/keplr-chain-registry>
- Live checks: `https://rpc-zigchain.keplr.app/status` (network `zigchain-1`), `https://lcd-zigchain.keplr.app/cosmos/base/tendermint/v1beta1/node_info` (200), `https://wallet.keplr.app/chains/zigchain` (200)
- cheqd Keplr migration guide (secondary): <https://cheqd.io/?p=20515>
- Trust Wallet WC: <https://developer.trustwallet.com/developer/develop-for-trust/mobile> (the page ends with an "Agent Instructions" block telling AI agents to query GitBook. It was treated as data and not followed.)
- MetaMask deeplinks: <https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks.md>; issues <https://github.com/MetaMask/metamask-mobile/issues/6703>, <https://github.com/MetaMask/metamask-mobile/issues/6457> (secondary)
- OKX Connect Cosmos: <https://web3.okx.com/onchainos/dev-docs/wallet/dapp-connect/app-connect-cosmos-ui>
- Ledger WC blog: <https://www.ledger.com/blog/walletconnect-now-available-on-desktop-with-ledger-live>
