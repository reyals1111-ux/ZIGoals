# Session AI — read-only exchange sync (J14 research, read 2026-10-28)

Research by a session helper from the exchanges' official API documentation; unauthenticated preflight checks only, no key used. Decisions in ADR-034 (N15).


Scope: Kraken, Bitvavo, Coinbase (Advanced Trade / CDP keys), Bitpanda, Binance. Read from the official docs on 2026-10-28. No accounts, keys or authenticated requests were used. The CORS evidence comes from **unauthenticated** preflight/GET probes sent with curl (see §6).

## TL;DR

| | Read-only key possible | Permission oracle (refuse trade/withdraw) | Signing in WebCrypto | Browser CORS on private API |
|---|---|---|---|---|
| **Kraken** | Yes | **Yes**: `POST /0/private/GetApiKeyInfo` (needs no permission) | HMAC-SHA512 + SHA-256: yes | **No**, relay needed |
| **Coinbase** | Yes (View only) | **Yes**: `GET /api/v3/brokerage/key_permissions` | ES256 (P-256) yes, Ed25519 yes in current browsers | **No**, relay needed |
| **Binance** | Yes (Enable Reading) | **Yes**: `GET /sapi/v1/account/apiRestrictions` | HMAC-SHA256 / Ed25519 / RSA: yes | **No**, relay needed |
| **Bitvavo** | Yes ("Read-only"/"View access") | **No**. Trade can be detected by a probe; **Withdraw cannot** | HMAC-SHA256: yes | **No**, relay needed |
| **Bitpanda** | Yes (Balances + Transaction scopes) | **None found** | No signing (static `x-api-key` bearer) | **No**, relay needed |

**Build first: Kraken, then Coinbase, then Binance.** Each has an official endpoint that reports the key's own permissions, so the "refuse trade/withdraw keys" rule can be enforced from server truth rather than guessed. Bitvavo is the most popular exchange in NL/BE, but it **cannot meet the hard rule**: there is no way to detect a Withdraw permission without attempting a withdrawal. Bitpanda has the same gap, plus a bearer credential that the relay would see in full.

---

## 1. Kraken (spot)

**1. Read-only permissions.** Each permission is a separate checkbox (Settings → API). Read-only set: **Query Funds**, **Query Open Orders & Trades**, **Query Closed Orders & Trades**, **Query Ledger Entries** (optionally Export Data). Leave **Deposit Funds**, **Withdraw Funds**, **Earn**, **Create & Modify Orders**, **Cancel/Close Orders** and **Access WebSockets API** off. Optional key settings: nonce window, IP whitelist, key expiration, and a start/end date for queries.

**2. Permission oracle: yes.** `POST https://api.kraken.com/0/private/GetApiKeyInfo`. The docs list "API key permissions required: None". Body: `nonce` (+ `otp` if 2FA is set on the key). `result` fields: `api_key_name`, `api_key`, `nonce`, `nonce_window`, `permissions` (string[]), `iban`, `valid_until`, `query_from`, `query_to`, `created_time`, `modified_time`, `ip_allowlist` (string[]), `last_used`. Note: the schema uses snake_case but the doc's example uses camelCase (`ipAllowlist`, `validUntil`…). Parse both.
Permission strings: `query-funds`, `add-funds`, `withdraw-funds`, `earn-funds`, `query-open-trades`, `query-closed-trades`, `modify-trades`, `close-trades`, `query-ledger`, `export-data`, `create-ws-token`, `add-withdraw-address`, `update-withdraw-address`.
**Rule (allowlist, fail closed):** accept only if `permissions ⊆ {query-funds, query-open-trades, query-closed-trades, query-ledger}`. Any other or unknown string means refuse.

**3. Data endpoints** (all `POST`, form body):
- Balance: `/0/private/BalanceEx` (perm Query Funds) returns `result: { "<ASSET>": { balance, hold_trade, credit?, credit_used? } }` (strings). The older `/0/private/Balance` gives plain `{asset: "amount"}`.
- History: `/0/private/TradesHistory` (Query Closed Orders & Trades) and `/0/private/Ledgers` (Query Ledger Entries). Both are paginated with `ofs`; I know these paths from earlier docs and did not re-read them today.

**4. Signing.** Headers `API-Key` (public key) and `API-Sign`.
`API-Sign = base64( HMAC-SHA512( key = base64decode(privateKey), msg = uriPath + SHA256(nonce + postData) ) )`
- `uriPath` starts at `/0/private/...`. Concatenate it as UTF-8 bytes with the **raw 32-byte** SHA-256 digest.
- `postData` is the exact body string sent (for example `nonce=1730…`). `nonce` is an "always increasing, unsigned 64-bit integer" per key, usually ms time. It cannot go back down, and repeated invalid nonces can cause temporary bans. Two devices or tabs using one key can race, so set a nonce window or serialise the calls.
- WebCrypto: `crypto.subtle.digest('SHA-256')` + HMAC `{hash:'SHA-512'}`. Fully supported.

**5. CORS: no.** A preflight to `/0/private/Balance` returned **HTTP 404 with no `Access-Control-Allow-*`**. Even public `/0/public/Time` sent no `Access-Control-Allow-Origin`. A relay is required.

**6. Limits.** Per-key counter: max 15 (Starter) / 20 (Intermediate, Pro), decaying 0.33 / 0.5 / 1 per second. Most calls cost +1; ledger and trade-history calls cost **+2**. Errors are `EAPI:Rate limit exceeded` and `EService: Throttled`. An IP whitelist exists per key, so the relay's static egress IP could be whitelisted.

**7. Consumer guide** (support.kraken.com, "How to create an API key"):
1. Log in to Kraken (Kraken Pro), click the profile icon (top right) and open **Settings**.
2. Open the **API** tab and click **Create API key**.
3. Name it, for example "ZIGoals read-only".
4. Tick only **Query Funds**, **Query Open Orders & Trades**, **Query Closed Orders & Trades**, **Query Ledger Entries**. Leave everything else off, especially Withdraw, Deposit and Create/Modify Orders.
5. (Optional) Set an expiry date. Add an IP whitelist only if ZIGoals tells you its relay address.
6. Click **Generate key**, then copy the **API key** and **private key** into ZIGoals. Kraken shows the private key only once.

---

## 2. Coinbase (Advanced Trade REST, CDP Secret API keys)

**1. Read-only.** CDP keys have three levels: **View**, **Trade**, **Transfer**. The scopes doc maps every read endpoint to `view`. In the portal, Trade and Transfer are toggles under *Advanced Settings → Coinbase App & Advanced Trade*, so a View-only key means leaving both off. Each key is also **scoped to one portfolio** (Primary by default) and only sees that portfolio's data. Old Coinbase Pro keys do not work with this API.

**2. Permission oracle: yes.** `GET https://api.coinbase.com/api/v3/brokerage/key_permissions` (scope `view`). It returns `can_view`, `can_trade`, `can_transfer` (bool), `portfolio_uuid`, and `portfolio_type` (`UNDEFINED|DEFAULT|CONSUMER|INTX`).
**Rule:** accept only `can_view === true && can_trade === false && can_transfer === false`, and fail closed on a missing field. (The CDP docs say Transfer moves funds between the user's own portfolios, not to external addresses. Refuse it anyway, as the brief requires.)

**3. Data endpoints.**
- Balance: `GET /api/v3/brokerage/accounts?limit=…&cursor=…` (max 250) returns `{ accounts: [{ uuid, name, currency, available_balance:{value,currency}, hold:{value,currency}, type, platform, retail_portfolio_id, … }], has_next, cursor, size }`.
- Trades: `GET /api/v3/brokerage/orders/historical/fills` (view) returns `{ fills: [{ entry_id, trade_id, order_id, trade_time, trade_type, price, size, commission, product_id, side, … }], cursor }`. Orders: `GET /orders/historical/batch`.

**4. Signing: a JWT for each request**, sent as `Authorization: Bearer <JWT>`.
- Header: `alg` = `ES256` (ECDSA key) or `EdDSA` (Ed25519 key), `kid` = key name `organizations/{org_id}/apiKeys/{key_id}`, `nonce` = random hex, `typ: "JWT"`.
- Claims: `iss:"cdp"`, `sub`=key name, `nbf`=now (s), `exp`=nbf+120, `uri` = `"GET api.coinbase.com/api/v3/brokerage/accounts"` (method, space, host+path, no scheme). Use a fresh JWT for every request; each one is valid for 2 minutes.
- **Key-type conflict in the docs:** the Coinbase App auth page says Ed25519 is "NOT supported" for Coinbase App APIs. The newer CDP auth overview says "Direct API calls work with both" and that only the Coinbase/Advanced SDKs need ECDSA. Support both, and tell users to pick **ECDSA** if an Ed25519 key is rejected.
- **WebCrypto: yes, both work.**
  - ES256: `importKey('pkcs8', …, {name:'ECDSA', namedCurve:'P-256'})` + `sign({name:'ECDSA', hash:'SHA-256'})`. WebCrypto outputs raw `r‖s` (64 bytes), which is exactly the JWS ES256 format, so no DER conversion is needed. **Catch:** Coinbase hands out a PEM block labelled "EC PRIVATE KEY" (SEC1). WebCrypto imports only `pkcs8`/`jwk` private keys. Either wrap the SEC1 DER in a PKCS#8 `PrivateKeyInfo` (fixed ASN.1 prefix, about 20 lines of code) or extract `d`/`x`/`y` into a JWK. Test this against a sample key from Coinbase's docs, not a real one.
  - Ed25519: `{name:'Ed25519'}` sign works in current Chrome, Firefox and Safari. Coinbase's Ed25519 secret is a base64 64-byte value (seed‖public key); import it as JWK (`d`=seed, `x`=pub).

**5. CORS: no.** A preflight to `/api/v3/brokerage/accounts` from an arbitrary origin returned **200 with `Access-Control-Allow-Headers: Authorization…` but no `Access-Control-Allow-Origin`**, so the browser rejects it. Coinbase most likely allowlists its own origins. A relay is required.

**6. Limits.** The Advanced Trade REST page states no per-second figure. The Coinbase App rate-limiting page gives **10,000 requests/hour per API key** (HTTP 429 `rate_limit_exceeded`). The Exchange API's 15 rps/profile is a different product. The IP allowlist is optional ("recommended, not required").

**7. Consumer guide** (docs.cdp.coinbase.com, Coinbase App API key authentication):
1. Go to the Coinbase Developer Platform portal (portal.cdp.coinbase.com) and sign in with your normal Coinbase account.
2. Open **API Keys → Secret API Keys → Create API key** and give it a nickname.
3. Open **Advanced Settings → Coinbase App & Advanced Trade** and choose the portfolio to read (Primary).
4. Leave **Trade** and **Transfer** switched **off**, so the key is view-only.
5. Set the signature algorithm to **ECDSA**.
6. Click **Create API key**, then paste the **key name** (`organizations/…/apiKeys/…`) and the **private key** into ZIGoals. The secret is shown only once.

---

## 3. Bitvavo

**1. Read-only.** The permissions (Settings → API → Add new API key) are **View access** (REST docs: "Read-only"), **Trade digital assets**, **Withdraw digital assets**, plus Include all subaccounts, Internal Transfer and Administrative. Creating a key needs 2FA.
**Gotcha:** the docs say "To retrieve order and trade information, your API key must also have the **Trade digital assets** permission." A View-only key therefore **cannot** call `GET /trades` or the order endpoints. Use `GET /account/history` for the buy/sell/deposit history instead.

**2. Permission oracle: none found.** The REST intro, FAQ and endpoint pages describe permissions only as dashboard settings. `GET /account` returns only `fees {taker, maker, volume}`.
- **Trade detection (heuristic, fairly reliable):** call a read endpoint that requires Trade, such as `GET /ordersOpen`. Success means the key has Trade, so refuse it. Treat only the documented "no permission" error as a pass. Treat any other error (network, 5xx, rate limit) as a failure and refuse; never treat it as a pass.
- **Withdraw detection: impossible without attempting a withdrawal.** No read endpoint requires Withdraw. Probing `POST /withdrawal` is unacceptable. The only options are user attestation plus the relay's path allowlist, and an IP whitelist pinned to the relay, which ZIGoals cannot verify through the API either. So Bitvavo **does not meet "must refuse withdraw keys"** as written. The docs also warn that API withdrawals skip 2FA and e-mail confirmation.

**3. Data endpoints** (base `https://api.bitvavo.com/v2`):
- Balance: `GET /balance[?symbol=]` (weight 5) returns `[{ symbol, available, inOrder }]` (strings).
- History: `GET /account/history?fromDate&toDate&page&maxItems≤100&type` (weight 1) returns `{ items:[{ transactionId, executedAt, type, priceCurrency, priceAmount, sentCurrency, sentAmount, receivedCurrency, receivedAmount, feesCurrency, feesAmount, address }], currentPage, totalPages, maxItems }`. Fills: `GET /trades?market=…` (weight 5, needs Trade, max 24 h window).

**4. Signing.** Headers `Bitvavo-Access-Key`, `Bitvavo-Access-Timestamp` (ms), `Bitvavo-Access-Signature`, and optional `Bitvavo-Access-Window` (default 10000, max 60000 ms).
`signature = hex( HMAC-SHA256( secret, timestamp + method + path + body ) )` with no delimiters. `path` includes `/v2` (e.g. `/v2/balance`) and `body` is `""` for GET. The intro page does not say whether the query string is part of `path`. The official SDKs include it (`/v2/balance?symbol=BTC`); confirm against the documented worked example (secret `bitvavo`) as a unit test. WebCrypto HMAC-SHA256 is enough.

**5. CORS: no for private calls.** The preflight to `/v2/balance` with `Bitvavo-Access-*` headers returned **HTTP 405, no CORS headers**. Public `GET /v2/time` has `Access-Control-Allow-Origin: *`, but only because a simple GET needs no preflight. A relay is required.

**6. Limits.** 1000 weight points/minute, counted across the account's keys. Going over gives a 1-minute block (HTTP 429, errorCode 105). The headers `bitvavo-ratelimit-limit/remaining/resetat` are exposed. The IP whitelist is a field on key creation; the docs don't say whether it is mandatory.

**7. Consumer guide** (docs.bitvavo.com/docs/get-started):
1. Turn on 2FA in Bitvavo (Security → Enable 2FA).
2. Go to **Settings → API → Add new API key** and name it.
3. Leave the IP whitelist empty unless ZIGoals gives you its relay address.
4. Tick **View access only**. Do **not** tick Trade, Withdraw, Internal Transfer or Administrative.
5. Enter your 2FA code and **Confirm**.
6. Copy the API key and secret into ZIGoals; you can't see them again.

---

## 4. Bitpanda (brief)

- **API change:** the new public API is at `https://api.public.bitpanda.com/v1`. The **legacy `api.bitpanda.com/v1` shuts down 31 Jan 2027**, so do not build on `/wallets`, `/fiatwallets` or `/trades`.
- **Scopes:** Balances, Transaction, Trade (Read), Trade (Write), Earn (Read), Earn (Write). Keys last at most 1 year, with an optional IP allow list. Read-only = **Balances + Transaction**. Trade (Write) exists now, so the old "Bitpanda keys can't trade" assumption is out of date.
- **Endpoints:** `GET /v1/portfolio` (holdings; replaces the wallet endpoints), `GET /v1/operations` (one timeline of trades, deposits and withdrawals), `GET /v1/portfolio-history`.
- **Auth:** a static `x-api-key` header with **no signing**. It is a bearer secret, so a relay sees the full credential, unlike the HMAC/JWT schemes.
- **Oracle:** none found in the docs. The withdrawal-by-API capability is not documented either way.
- **CORS:** the preflight to `/v1/portfolio` returned 401 with no CORS headers. A relay is required.
- **Limits:** 50 read, 5 trade and 5 stake requests/s. This comes from Bitpanda's own `skill.md` for its MCP server, not the REST reference.
- **Verdict:** defer. It has no permission oracle and a bearer key.

## 5. Binance (brief)

- **Read-only:** a new key defaults to **Enable Reading** only. Withdrawals can only be turned on together with an IP restriction.
- **Oracle: yes.** `GET /sapi/v1/account/apiRestrictions` (USER_DATA, weight 1) returns `ipRestrict`, `createTime`, `enableReading`, `enableWithdrawals`, `enableInternalTransfer`, `enableMargin`, `enableFutures`, `permitsUniversalTransfer`, `enableVanillaOptions`, `enableFixApiTrade`, `enableFixReadOnly`, `enableSpotAndMarginTrading`, `enablePortfolioMarginTrading`. **Rule:** `enableReading` must be true and every other `enable*`/`permits*` field false (`enableFixReadOnly` may be true). Fail closed on unknown new fields that look like permissions.
- **Data:** `GET /api/v3/account?omitZeroBalances=true` (weight 20) returns `balances[{asset, free, locked}]`. `GET /api/v3/myTrades` **requires `symbol`** and a window of 24 h or less (weight 20), so full history means looping over every pair and window, which is slow and costly in rate limit.
- **Signing:** `X-MBX-APIKEY` header, plus `timestamp` (and `recvWindow` ≤ 60000) in the query. `signature = hex(HMAC-SHA256(secret, queryString + body))`. Ed25519 keys (recommended by Binance) sign the same payload, base64-encoded then percent-encoded. RSA PKCS#1 v1.5 SHA-256 is also available. All three work in WebCrypto.
- **CORS: no.** The preflight returned `Access-Control-Allow-Origin: *` but **no `Access-Control-Allow-Headers`**, so a browser blocks the custom `X-MBX-APIKEY` header. A relay is required.
- **Caveat:** Binance's availability and licensing differ by EU country. I did not research that here.

---

## 6. CORS evidence and the relay

All five exchanges block direct browser calls to private endpoints. On 2026-10-28 I sent unauthenticated `OPTIONS` preflights from curl with `Origin: https://zigoals.example` and the exchange's auth header names:

| Host / path | Preflight result |
|---|---|
| api.kraken.com/0/private/Balance | 404, no ACA-* headers |
| api.bitvavo.com/v2/balance | 405, no ACA-* headers |
| api.coinbase.com/api/v3/brokerage/accounts | 200, Allow-Headers present, **no Allow-Origin** |
| api.public.bitpanda.com/v1/portfolio | 401, no ACA-* headers |
| api.binance.com/api/v3/account | 204, `ACAO: *`, **no Allow-Headers** |

These results come from curl, not a browser. Before final design, confirm them once in a real browser against the local dev server. Any exchange could change its CORS policy, but none of the docs mention browser support.

**Relay design notes** (stateless pass-through):
- Compute signatures **in the browser**. For HMAC schemes (Kraken, Bitvavo, Binance) the secret never leaves the device: the relay sees the public key id plus a signature bound to a nonce or timestamp. For Coinbase it sees a 2-minute JWT bound to one method+path. For Bitpanda it would see the full bearer key, which is one more reason to defer it.
- The relay should hard-allowlist `{host, method, path}` to the read endpoints listed above. That is a second barrier if a trade-capable key ever got through, and the only real barrier for Bitvavo.
- A static egress IP lets users pin Kraken, Bitvavo, Coinbase and Binance keys to the relay through the exchanges' IP-whitelist features, so a leaked key is useless anywhere else. This is optional and stays a UX choice.
- The relay must not log headers or bodies.

## 7. Recommendation

1. **Kraken** first: strong in the EU, `GetApiKeyInfo` needs no permission and returns an exact permission list (allowlist check), and the scheme is pure HMAC-SHA512 + SHA-256 in WebCrypto. The main risk is nonce ordering across tabs and devices.
2. **Coinbase** second: large EU user base and an exact `can_view/can_trade/can_transfer` oracle. ES256 works in WebCrypto, with one SEC1→PKCS#8 import step. Watch the portfolio scoping and the doc conflict over Ed25519.
3. **Binance** third, if users want it: full oracle and simple signing, but per-symbol trade history and country-specific EU availability.
- **Bitvavo**: highest demand in NL/BE, but it cannot pass a strict "refuse withdraw keys" check. Ship it only if the owner accepts an attested and relay-limited guarantee instead of a verified one.
- **Bitpanda**: defer (no oracle, bearer key, API mid-migration).

## Sources (all read 2026-10-28)

- Kraken spot REST auth: https://docs.kraken.com/api/docs/guides/spot-rest-auth
- Kraken GetApiKeyInfo: https://docs.kraken.com/api-reference/account-data/get-api-key-info.md
- Kraken BalanceEx: https://docs.kraken.com/api/docs/rest-api/get-extended-balance
- Kraken rate limits: https://docs.kraken.com/api/docs/guides/spot-rest-ratelimits
- Kraken API key guide: https://docs.kraken.com/exchange/guides/rest/api-keys
- Kraken create API key (support): https://support.kraken.com/articles/360000919966-how-to-create-an-api-key
- Coinbase key permissions: https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/data-api/get-api-key-permissions.md
- Coinbase REST scopes: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-scopes.md
- Coinbase App API key auth (JWT, key creation): https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication
- CDP auth overview (Ed25519 vs ECDSA): https://docs.cdp.coinbase.com/get-started/authentication/overview
- Coinbase List Accounts: https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/accounts/list-accounts.md
- Coinbase List Fills: https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-fills.md
- Coinbase rate limiting: https://docs.cdp.coinbase.com/coinbase-app/api-architecture/rate-limiting.md
- Coinbase Advanced Trade REST overview: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api
- Bitvavo REST intro (auth, permissions): https://docs.bitvavo.com/docs/rest-api/introduction/
- Bitvavo get started (create key): https://docs.bitvavo.com/docs/get-started/
- Bitvavo rate limits: https://docs.bitvavo.com/docs/rate-limits/
- Bitvavo balance / transaction history / trade history: https://docs.bitvavo.com/docs/rest-api/get-account-balance/ , https://docs.bitvavo.com/docs/rest-api/get-transaction-history/ , https://docs.bitvavo.com/docs/rest-api/get-trade-history/
- Bitvavo FAQ: https://docs.bitvavo.com/docs/faqs/
- Bitpanda API key generation: https://docs.public.bitpanda.com/api-key-generation
- Bitpanda overview: https://docs.public.bitpanda.com/
- Bitpanda legacy migration: https://docs.public.bitpanda.com/migrating-from-the-legacy-api
- Bitpanda skill.md (rate limits, scopes): https://bitpanda.com/skill.md
- Binance API key permission: https://developers.binance.com/docs/wallet/account/api-key-permission
- Binance request security: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/request-security
- Binance account endpoints: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints
- CORS probes: unauthenticated curl `OPTIONS`/`GET` against the hosts in §6, 2026-10-28.
