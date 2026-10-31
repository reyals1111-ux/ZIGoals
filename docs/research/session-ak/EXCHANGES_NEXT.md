# Session AK — the next read-only exchanges after Kraken, Coinbase and Binance (lane R, read 2026-10-31)

Research only. No accounts, keys or authenticated requests were used. CORS was checked on 2026-10-31 with **unauthenticated**
curl `OPTIONS` preflights and plain requests, sent with `Origin: https://zigoals.example` and the exchange's auth header
names. Curl results are evidence, not a browser test. Confirm them once in a real browser before building. Bitvavo and
Bitpanda were researched in depth on 2026-10-28 ([../session-ai/EXCHANGES.md](../session-ai/EXCHANGES.md)). Only the
summary and today's CORS re-check are repeated here.

**The hard rule (ADR-034 N15):** an exchange qualifies only if an **official endpoint reports the key's own permissions**,
so ZIGoals can refuse trade and withdraw keys from server truth (allowlist, fail closed).

## TL;DR ranking

| # | Exchange | Permission oracle | Read-only key | Signing (WebCrypto) | Browser CORS (curl) | Verdict |
|---|---|---|---|---|---|---|
| 1 | **OKX** | **Yes**: `GET /api/v5/account/config` → `perm` (`read_only`, `trade`, `withdraw`) + `ip` | Yes ("Read") | HMAC-SHA256 → Base64, plus passphrase header | **Global host yes** (origin reflected, `allow-headers: *`). **EEA host `eea.okx.com`: no** (405, no CORS headers). | **Build next.** EU users must use `eea.okx.com`, so plan for the relay. |
| 2 | **Gemini** | **Yes**: `POST /v1/roles` → `isAuditor`, `isTrader`, `isFundManager` (+ `isAccountAdmin` on master keys) | Yes: **Auditor** role, "read-only and cannot be combined with other roles" | HMAC-**SHA384** → hex over the Base64 payload | **Yes** (origin reflected, exact auth headers allowed) | **Build next.** It has the cleanest oracle. Its EU user base is smaller. |
| 3 | **Bybit** | **Yes**: `GET /v5/user/query-api` → `readOnly` (0/1) + `permissions{…Wallet:[…Withdraw]…}` + `ips` | Yes ("Read only") | HMAC-SHA256 → hex (or RSA) | **Unknown.** api.bybit.com **403s every request from US IPs** ("CloudFront … block access from your country"). | Good oracle, but the relay must not egress from the US or China, and EU users are on Bybit EU (separate host, not checked). Third. |
| 4 | **KuCoin** | **Partial**: `GET /api/v1/user/api-key` → `permission: "General,Spot,…"`. The full value list is not documented on the page | Yes ("General") | HMAC-SHA256 → Base64. The passphrase is also HMAC'd (key v2/v3) | **No** (preflight 200, no `Access-Control-Allow-*`) | Usable if the allowlist is exactly `{"General"}` and anything else is refused. Fourth. |
| 5 | **Crypto.com Exchange** | **None found** in the v1 REST reference | Yes. Default is "Can Read" only | HMAC-SHA256 → hex over `method+id+api_key+params+nonce` (auth in JSON body) | Preflight yes. **The error response has no `ACAO`** | No. It fails the hard rule, and most Crypto.com users are on the **App**, which has no API. |
| 6 | **Bitstamp** | **None found**. Only an error `API0003 "No permission found"` per call | Per-endpoint permissions | HMAC-SHA256 → hex (`X-Auth-*` v2) | **No**: `allow-headers` excludes `X-Auth-*` | No. Same gap as Bitvavo. |
| — | **Bitvavo** (2026-10-28) | **None**. Trade is detectable by probe, Withdraw is not | Yes ("View access") | HMAC-SHA256 → hex | No (405 again today) | Fails the hard rule unless the owner accepts attested + relay-limited. |
| — | **Bitpanda** (2026-10-28) | **None** | Yes (Balances + Transaction scopes) | None (static `x-api-key` bearer) | No | Defer. |

**Recommendation:** OKX, then Gemini, then Bybit. KuCoin only with a strict `{"General"}` allowlist. Do **not**
build Crypto.com, Bitstamp or Bitvavo under the current rule.

---

## 1. OKX (v5)

- **Oracle:** `GET /api/v5/account/config`, "Rate Limit: 5 requests per 2 seconds", rule "User ID". The response field
  `perm` is "The permission of the current requesting API key or Access token `read_only` : Read `trade` : Trade
  `withdraw` : Withdraw" (comma-joined; doc example `"perm":"read_only,withdraw,trade"`). `ip` is "IP addresses that linked
  with current API key … an empty string "" if there is no IP bonded". There is also `label` (the key's note), plus `uid`,
  `acctLv` and others.
  **Rule:** split `perm` on `,` and accept only if the set is exactly `{read_only}`. Refuse anything else or a missing field.
- **Key permissions:** "`Read` : Can request and view account info such as bills and order history …", "`Trade` : …
  place and cancel orders, funding transfer …", "`Withdraw` : Can make withdrawals". "Each API key can bind up to 20 IP
  addresses". Keys without a bound IP that have trade or withdraw permission "will expire after 14 days of inactivity".
- **Data:** `GET /api/v5/account/balance` (10 requests / 2 s), `GET /api/v5/asset/balances` (funding account, 6/s),
  `GET /api/v5/account/bills-archive` (last 3 months, 5 / 2 s), `GET /api/v5/asset/bills` (past month, 6/s).
- **Signing:** headers `OK-ACCESS-KEY`, `OK-ACCESS-SIGN`, `OK-ACCESS-TIMESTAMP` (ISO 8601 with ms, ±30 s, error 50102),
  `OK-ACCESS-PASSPHRASE`. "Create a pre-hash string of timestamp + method + requestPath + body … Sign … using the HMAC
  SHA256. Encode the signature in the Base64 format." `requestPath` includes the query string
  (`/api/v5/account/balance?ccy=BTC`). WebCrypto `HMAC {hash:'SHA-256'}` is enough. The passphrase is a third secret sent in
  clear on every request, so the relay sees it, but without the secret it cannot sign.
- **Regional hosts (important for NL/EU):** "EU users (registered on my.okx.com): Use **eea.okx.com** as your API domain",
  and "US & AU users … Use **us.okx.com**". Using the global host "will not work for the regions below".
- **CORS (curl, 2026-10-31):** `www.okx.com` preflight → 200, `access-control-allow-origin: https://zigoals.example`,
  `access-control-allow-headers: *`. A plain GET → 401 with ACAO reflected. **`eea.okx.com` preflight → 405 with no CORS
  headers**, and `us.okx.com` → 302. ZIGoals' users are mostly EU, so **use the relay** (same design as Kraken), with a
  host allowlist `{www.okx.com, eea.okx.com}`.
- **Consumer steps (from the docs' permission names):** OKX → Profile → API → Create API key → purpose "API trading",
  name it, set a passphrase, tick **Read** only (not Trade, not Withdraw), optionally bind the relay IP → confirm with 2FA →
  paste the key, secret and passphrase into ZIGoals.

## 2. Gemini

- **Oracle:** `POST https://api.gemini.com/v1/roles` (payload `{"request":"/v1/roles","nonce":…}`). The OpenAPI spec says:
  "will return a string of the role of the current API key … The `Auditor` role cannot be combined with other roles.
  `Fund Manager` and `Trader` can be combined." Account-level example: `{"isAuditor":false,"isFundManager":true,"isTrader":true}`.
  Master keys also return `counterparty_id` and `isAccountAdmin`.
  **Rule:** accept only `isAuditor===true && isTrader===false && isFundManager===false && isAccountAdmin!==true`, and fail
  closed. Also refuse master keys (any `counterparty_id`).
- **Roles:** "When you create an API key, Gemini assigns the Trader role by default". So the guide must tell people to
  pick **Auditor**. "The Auditor role is read-only". Fund Manager is the role that can "Withdraw cryptocurrency funds".
  A call without the needed role → `403 MissingRole`.
- **Signing:** `X-GEMINI-APIKEY`, `X-GEMINI-PAYLOAD` = Base64(JSON incl. `request` and `nonce`), `X-GEMINI-SIGNATURE` =
  `hex(HMAC_SHA384(base64(payload), key=api_secret))`, empty body (`Content-Length: 0`). Nonce mode chosen at key creation:
  **time-based (seconds, ±30 s)**, which is recommended and avoids multi-tab races, or incremental. WebCrypto
  `HMAC {hash:'SHA-384'}`: yes.
- **Limits:** private "600 requests per minute … recommend that you not exceed 5 requests per second", with a burst of
  five queued requests.
- **CORS (curl):** preflight → 200, ACAO reflected, `access-control-allow-headers:
  x-gemini-apikey,x-gemini-payload,x-gemini-signature,content-type`, methods `POST`. The 401 response also carries ACAO.
  **Direct from the browser looks possible.** Even so, keep it behind the relay for one code path and no-log guarantees.
  That is an owner choice, and going direct removes the relay from the trust chain.

## 3. Bybit (v5)

- **Oracle:** `GET /v5/user/query-api`. "Any permission can access this endpoint." Rate limit 10 req/s.
  Fields: `readOnly` "0: Read and Write. 1: Read only"; `permissions` object with arrays `ContractTrade`, `Spot`,
  `Wallet` (`AccountTransfer`, `SubMemberTransfer`, `SubMemberTransferList`, `Withdraw`), `Options`, `Derivatives`,
  `Exchange`, `BlockTrade`, `Affiliate`, `NFT`/`CopyTrading` (deprecated); `ips`; `type` (1 personal, 2 third-party app);
  `deadlineDay`/`expiredAt` (only for keys with no IP bound).
  **Rule:** `readOnly === 1` **and** `permissions.Wallet` has no `Withdraw` and no transfer entries, **and** every trade
  array is empty. Fail closed on unknown keys.
- **Signing:** headers `X-BAPI-API-KEY`, `X-BAPI-TIMESTAMP` (ms), `X-BAPI-RECV-WINDOW` (default 5000), `X-BAPI-SIGN`.
  The GET string is `timestamp+api_key+recv_window+queryString`. HMAC-SHA256 → hex (system keys) or RSA (self-generated
  keys). WebCrypto: both.
- **Limits:** 600 requests / 5 s per IP; per-endpoint limits (wallet-balance 50/s).
- **Geo-block:** "IP addresses located in the US or Mainland China are restricted and will return a 403 Forbidden error".
  Confirmed: every call from this sandbox returned CloudFront 403 "configured to block access from your country". **The
  relay's egress must be in an allowed region.** A Cloudflare Worker's egress location is not fixed, so this needs a
  check. EU retail is served by Bybit EU (`bybit.eu`). Its API host and whether it has the same endpoints were **not
  checked**.

## 4. KuCoin

- **Oracle (partial):** `GET https://api.kucoin.com/api/v1/user/api-key` ("api-rate-limit-weight:20",
  "api-rate-limit-pool:Management", "api-permission:General"). Fields seen in the example: `remark`, `apiKey`,
  `apiVersion` (3), `permission` (example `"General,Futures,Unified,Spot,Earn,InnerTransfer,Margin"`), `createdAt`, `uid`,
  `isMaster`, `region`, `kycStatus`, `siteType`. **The page does not list every possible `permission` value**, for example
  how Withdrawal or Transfer appear. **Rule:** accept only `permission === "General"`. Anything else, or a new value, is
  refused. That fails closed even without the full list.
- **Signing:** `KC-API-KEY`, `KC-API-SIGN` = Base64(HMAC-SHA256(secret, timestamp+method+endpoint+body)),
  `KC-API-TIMESTAMP` (ms), `KC-API-PASSPHRASE` = Base64(HMAC-SHA256(secret, passphrase)), `KC-API-KEY-VERSION`.
- **CORS (curl):** preflight → 200 with **no** `Access-Control-Allow-*`. Relay required.
- **EU note:** KuCoin's EU entity and API host were **not checked** today.

## 5. Crypto.com Exchange

- **Oracle:** none. The v1 llms index and the "Common API Reference" have no API-key-info method.
  `private/get-account-settings` returns only leverage/STP fields.
- **Key creation:** "Exchange website under User Center → API … Default settings are 'Can Read' only; you can add or
  remove permissions via the Web UI. You may optionally specify a whitelist of IP addresses".
- **Signing:** `sig = hex(HMAC-SHA256(secret, method + id + api_key + paramsString + nonce))`, sent in the JSON body. There
  are no custom headers, so the preflight only needs `content-type`.
- **Limits:** "All others: 3 requests per 100ms each" per key. `private/get-trades` and `get-order-history` are 1/s.
- **CORS (curl):** the preflight for `private/user-balance` → 200, ACAO reflected, `allow-headers: content-type`, methods
  `POST`. **But the 401 response carries no ACAO**, so a browser cannot read errors. Successful responses were not testable.
- **Verdict:** fails the hard rule (no oracle). Most people use the **Crypto.com App**, which has no public account API.
  For them the honest path is CSV export (not researched here).

## 6. Bitstamp

- **Oracle:** none. Auth errors include `API0003 "No permission found — API key doesn't have permission for calling this
  api endpoint"`, so permissions can only be probed per endpoint, as with Bitvavo. **Withdraw cannot be proven absent.**
- **Signing (v2):** `X-Auth: BITSTAMP {api_key}`, `X-Auth-Signature = hex(HMAC-SHA256(secret, "BITSTAMP " + api_key +
  verb + host + path + query + Content-Type + X-Auth-Nonce + X-Auth-Timestamp + X-Auth-Version + body))`. The nonce is
  "lowercase, 36 char string" and single-use within 300 s.
- **Limits:** "400 requests per second … default limit threshold of 10,000 requests per 10 minutes".
- **CORS (curl):** preflight → 400 with `access-control-allow-origin: *` but `allow-headers: x-requested-with,
  Content-Type, origin, accept, cache-control`. **The `X-Auth-*` headers are not allowed**, so the browser blocks the call.
- **Aside:** Bitstamp lists an "Open Banking API (PSD2)" in its docs navigation. That is not relevant to read-only crypto
  sync and was not researched.

## Sources (all read 2026-10-31)

- OKX API v5: <https://www.okx.com/docs-v5/en/> (Get account configuration; REST authentication; API key permissions; regional domains; balance/bills rate limits)
- Gemini: <https://developer.gemini.com/roles.md>, <https://developer.gemini.com/rest-api/common/admin/roles-endpoint.md>, OpenAPI <https://developer.gemini.com/specs/openapi/rest.yaml> (`getRoles`), <https://developer.gemini.com/authentication/api-key.md>, <https://developer.gemini.com/rate-limit.md>
- Bybit: <https://bybit-exchange.github.io/docs/v5/user/apikey-info>, <https://bybit-exchange.github.io/docs/v5/guide>, <https://bybit-exchange.github.io/docs/v5/rate-limit>
- KuCoin: <https://www.kucoin.com/docs-new/rest/account-info/account-funding/get-apikey-info>, <https://www.kucoin.com/docs-new/authentication>
- Crypto.com Exchange: <https://exchange-developer.crypto.com/exchange/v1/llms.txt>, <https://exchange-developer.crypto.com/exchange/v1/docs/api/rest-common-api-reference.md>, <https://exchange-developer.crypto.com/exchange/v1/docs/api/rest/private-get-account-settings.md>
- Bitstamp: <https://www.bitstamp.net/api/> (Authentication, Possible authentication errors, Request limits)
- Bitvavo, Bitpanda: [../session-ai/EXCHANGES.md](../session-ai/EXCHANGES.md) (2026-10-28) and its sources
- CORS probes (curl, unauthenticated, 2026-10-31): `www.okx.com/api/v5/account/config` (200, ACAO reflected, allow-headers `*`); `eea.okx.com/…/account/config` (405, none); `us.okx.com/…` (302); `api.gemini.com/v1/roles` (200, ACAO reflected, exact headers); `api.bybit.com/v5/user/query-api` (403 geo-block); `api.kucoin.com/api/v1/user/api-key` (200, none); `api.crypto.com/exchange/v1/private/user-balance` (preflight 200 ACAO; 401 response without ACAO); `www.bitstamp.net/api/v2/account_balances/` (400, ACAO `*`, X-Auth headers not allowed); `api.bitvavo.com/v2/balance` (405, none)
