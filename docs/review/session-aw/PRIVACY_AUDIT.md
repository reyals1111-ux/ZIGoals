# Privacy audit: what the app sends against what the privacy pages say

Read-only audit of `feature/session-aw-finish-line` at HEAD `14f0da35` (base `8fa8aa1d`), 25 Nov 2026. Nothing in the repository was edited.

**Sources compared**
- **App page:** Settings → Data & privacy intro (`apps/web/app/app/settings/page.tsx:186`), the Your data page (`components/data-health/data-health-view.tsx`), and Help's privacy answers (`components/help/help-page.tsx`). There is no separate in-app privacy page. Help line 713 links out to the landing page.
- **Landing:** `landing/privacy.html` (says "Last updated 18 November 2026").
- **Code:** `apps/web` (app/, components/, lib/, public/sw.js, middleware.ts, next.config.ts, alpha/worker.mjs), `workers/*`, `lib/egress-policy.json` (the CSP connect/img/frame list), `config/public-integrations.json` and `wrangler.alpha.jsonc` (which services are wired in the Public Alpha).

**What is live in the Public Alpha, from committed config**
- On: the market Worker and the food Worker (`wrangler.alpha.jsonc` services), and WalletConnect (the Reown project id is set).
- Off or not configured: push (`pushDeviceEnabled: false`), accounts and sync (no auth or sync config; `/api/private-account` answers 503, per docs/STATUS.md:1803), hosted ZIGi (`NEXT_PUBLIC_ZIGI_HOSTED`), health links (`NEXT_PUBLIC_HEALTH_LINK`), and the weather proxy (`NEXT_PUBLIC_WEATHER_PROXY_URL`).
- Spotify's site client id is a runtime secret, so I cannot tell from the repo whether it is set. "Use my own Spotify app" works either way.

---

## (A) Network inventory

The "Trigger" column uses these terms:
- **default**: happens without any choice.
- **opt-in**: off until switched on.
- **on action**: only when the person taps or does something.
- **off in Alpha**: built, but not wired in the Public Alpha.

| # | Host (or route → upstream) | What is sent | Trigger | Code |
|---|---|---|---|---|
| 1 | App host alpha.zigoals.app (Cloudflare): pages, scripts, `/sw.js` precache, `/showcase/*`, `/fonts/inter` | Ordinary requests: IP address, browser details, path | default | `public/sw.js:179-348`; `alpha/worker.mjs:12` |
| 2 | Own origin `/food-generic/*.json` (CIQUAL, CoFID library) | Nothing personal; searched on the device afterwards | default on first food search | `lib/food-generic/more.ts:44` |
| 3 | `/api/market-quotes`, `-assets`, `-detail`, `-history`, `-insights`, `-status`, `quotes/cancel` → market Worker → api.coingecko.com | Public asset ids and currency; a coarse network group (IPv4 /24, IPv6 /48) for fair-use limits | default once you hold market-linked assets or open Markets | `app/api/market-quotes/route.ts:30-40`; `lib/server/durable-quote-route.ts`; `lib/server/market-data-route.ts` |
| 4 | `/api/market-logo` → coin-images.coingecko.com | The logo address (checked) | default with market assets | `app/api/market-logo/route.ts:7`; `lib/server/market-logo.ts:17` |
| 5 | Service worker → `/api/market-quotes` → CoinGecko | Price-alert asset ids, while the app is closed | only when a morning or evening push arrives (push is off) | `public/sw.js:420` |
| 6 | `/api/food-lookup?code` → food Worker → world.openfoodfacts.org, then api.nal.usda.gov (only with the FDC key set) | Barcode and User-Agent; the network group stays at the Worker | on action (scan or type a barcode) | `components/health/barcode-food-lookup.tsx:87`; `workers/food-lookup/worker.mjs:240,371` |
| 7 | `/api/food-lookup?q&lang` → food Worker → api.webapp.prod.blv.foodcase-services.com (Swiss FSVO) | Search words and language | on action (online search) | `barcode-food-lookup.tsx:101`; `worker.mjs:84,314` |
| 8 | `/api/recipe-import` → cloudflare-dns.com (DoH), then the recipe page's host | The host name, then one GET of that page (no cookies, no redirects) | on action (paste a web address) | `components/health/recipe-import.tsx:79`; `lib/server/recipe-resolve.ts:12`; `lib/server/recipe-import.ts:41` |
| 9 | Recipe files (.paprikarecipes, .paprikarecipe, .md, .txt) | Nothing: unzipped and parsed on the device, photos left out | on action | `recipe-import.tsx:43-50`; `lib/food-plus/recipe-files.ts` |
| 10 | `/api/positions` → api.zigchain.com or testnet-api.zigchain.com | A public ZIG address; kept in memory 60 s | default for a tracked ZIGChain wallet | `lib/position-reader.ts:37`; `lib/server/positions-relay.ts:15` |
| 11 | `/api/chain/validators`, `/proposals`, `/proposal`, `/denom` → ZIGChain LCD | Nothing personal (network, proposal id, token id) | default on Staking, Governance and Ecosystem | `app/api/chain/*/route.ts`; `lib/server/chain-relay.ts:11` |
| 12 | `/api/chain/vote`, `/grants` → ZIGChain LCD | Wallet address; kept 60 s | default on Governance and Staking with a wallet | `components/staking/grants-panel.tsx:20`; `app/api/chain/vote/route.ts:18` |
| 13 | `/api/chain/attestations` → zigchain-testnet-api.polkachu.com | Wallet address (testnet) | on action ("Check them on the chain") | `components/staking/attestation-card.tsx:44`; `lib/server/chain-attestations.ts:9` |
| 14 | `/api/earn/chain`, `valdora`, `oroswap`, `vaults`, `measured`, `defillama` → api.zigchain.com, zigchain-api.polkachu.com, api.llama.fi, yields.llama.fi | Nothing personal | default while Earn or Ecosystem is open (every 2 or 10 minutes) | `lib/server/earn/upstream.ts:36`; `components/ecosystem-live.tsx:13` |
| 15 | `/api/earn/shares` → api.zigchain.com | Wallet address (mainnet); kept 60 s | default on Earn with a wallet | `components/earn/your-shares.tsx:28`; `lib/server/earn/shares-relay.ts:9` |
| 16 | Browser → testnet-api.zigchain.com | Wallet address (balance), base-fee read | default with Keplr connected | `lib/wallet.ts:75,95` |
| 17 | Browser → rpc.zigchain.com or testnet-rpc | `abci_info`; transactions the wallet signed | on action (staking, votes) | `lib/staking/quote.ts:77` |
| 18 | Browser → PublicNode (Cosmos REST, 6 EVM RPCs, Solana) | Linked public addresses | default for a linked wallet | `lib/wallets/balances/chains.ts:21-28`; `http.ts:16` |
| 19 | Browser → mempool.space | Bitcoin addresses (also those worked out from an xpub) | default for a watched Bitcoin wallet | `lib/wallets/balances/bitcoin.ts:8` |
| 20 | Browser → wss://relay.walletconnect.org, verify.walletconnect.org and .com | Encrypted pairing; telemetry off | on action (Connect on phone) | `lib/wallets/walletconnect.ts:145` |
| 21 | `/api/exchange` → api.kraken.com, api.coinbase.com, api.binance.com | Signed read-only request (key id, signature); nothing kept | opt-in; then every 15 min while open | `components/exchanges/exchanges-panel.tsx:25`; `lib/server/exchange-relay.ts:32` |
| 22 | `/api/onramps/ramp-assets` → api.rampnetwork.com | Nothing personal (public asset list) | default on Add money | `lib/onramps/server/ramp-assets.ts:50`; `components/add-money/use-ramp-assets.ts` |
| 23 | Browser → api.openai.com, api.anthropic.com, generativelanguage.googleapis.com, api.x.ai, openrouter.ai | Your message, the records you allow, photos you choose; your key | opt-in (connect your own AI), then on action | `lib/ai/adapters/{anthropic:74,openai-compatible:44,gemini:44}.ts` |
| 24 | Same providers: model list and capability checks | Your key | on action (connect or test) | `lib/ai/models.ts:23`; `lib/ai/capabilities.ts:24` |
| 25 | openrouter.ai `/api/v1/auth/keys` | One-time sign-in code | on action (Sign in with OpenRouter) | `lib/ai/openrouter-auth.ts:56` |
| 26 | api.openai.com `/v1/audio/transcriptions` | A voice recording of up to a minute | opt-in; Relaxed mode only | `lib/ai/voice.ts:73`; `components/ai/use-voice.ts:84`; `lib/ai/voice-privacy.ts:30` |
| 27 | localhost and 127.0.0.1 (Ollama, LM Studio, llama.cpp; Ollama cloud check) | Messages to your own computer | opt-in | `lib/ai/adapters/ollama.ts:78`; `lib/nova/local-servers.ts:68`; `lib/ai/privacy-probes.ts:25`; `lib/nova/widgets/telemetry.ts:48` |
| 28 | localhost Hermes Agent | Messages and the areas you allow | opt-in | `lib/nova/hermes.ts:51`; `lib/nova/agent-bridge/client.ts:83,207` |
| 29 | `/api/zigi` → zigi-relay Worker → api.anthropic.com or api.openai.com | Messages | off in Alpha (build flag) | `lib/ai/hosted.ts:16`; `app/api/zigi/route.ts` |
| 30 | `window.open` chatgpt.com, claude.ai, gemini, grok ("Copy for my AI") | Nothing in the address; you paste | on action | `components/ai/side-by-side.ts:7`; `lib/ai/apps.ts:9-18` |
| 31 | Browser speech recognition (Google in Chrome unless on-device; Apple in Safari) | Your voice | on action (microphone) | `components/ai/use-voice.ts:52-55`; `lib/ai/voice.ts:41-47` |
| 32 | Speech synthesis, ZIGi and NOVA replies, briefs, NOVA setup test | Reply text, which reaches the browser maker if an online voice is picked. **Online voices are allowed outside Strict** (and no mode chosen is not Strict) | default after a spoken question (`readSpoken` defaults to true); also on tap | `components/ai/use-voice.ts:117-136`; `lib/ai/voice-privacy.ts:21-25`; `components/ai/brief-parts.tsx:28-33`; `components/nova/setup/steps/voice.tsx:13-24`; `lib/zigi-voice.ts:35` |
| 33 | Speech synthesis, Read aloud (programmes, meditation, stretches) | Nothing: only `localService === true` voices, checked again when it speaks | on action | `lib/read-aloud/speaker.ts:27-30,75`; `components/read-aloud/use-local-read-aloud.ts` |
| 34 | Browser → api.met.no (or the weather proxy, if built with its URL) | Place rounded to 2 decimals; IP address | opt-in (NOVA → Permissions) | `lib/nova/world/met.ts:19,272`; `workers/weather-proxy` |
| 35 | Browser → api.chess.com/pub, lichess.org/api/user, rating history, games | Your public username | after you add a username (refreshes by itself) | `lib/skills/chess/api.ts:48-70`; `components/chess/use-chess.ts:33` |
| 36 | Browser → lichess.org/api/puzzle/daily | Nothing personal | on Chess's daily puzzle | `lib/chess/puzzle.ts:68-70` |
| 37 | Browser → lichess.org OAuth, play streams | Lichess token, moves | opt-in (connect to play) | `lib/chess/oauth.ts`; `lib/chess/lichess.ts`; `components/chess/board/lichess-play.tsx` |
| 38 | Frames www.chess.com/daily_puzzle, lichess.org/training/frame, lichess.org/tv | IP address; the site's own cookies (`allow-same-origin`) | on action (tap a puzzle or TV) | `components/chess/chess-frames.tsx:10-26` |
| 39 | `/api/music-config` (own server) | Nothing | default on Music | `components/music/music-config.ts:13` |
| 40 | Browser → accounts.spotify.com, api.spotify.com, i.scdn.co | Sign-in code and token, playback commands; artwork loads | opt-in (Connect Spotify, the site's id or your own) | `lib/music/spotify/tokens.ts:14`; `player.ts:12,48`; `byo-store.ts:3-9` |
| 41 | `/api/push-device` → push-device Worker → FCM, Apple, Mozilla or WNS | Random id and secret, push endpoint, time zone, quiet hours, wake minutes with weekdays, one-off minutes (snoozes), skipped minutes, network group; empty pushes | off in Alpha (`pushDeviceEnabled: false`) | `lib/notify/device.ts:21,108-118`; `lib/server/push-device-route.ts:15-21`; `public/sw.js:461,476` |
| 42 | `/api/push` → push-reminders Worker | Account reminders | off in Alpha (503); a status GET still happens | `app/api/push/route.ts` |
| 43 | `/api/private-account` → Supabase auth and private-sync Worker | Email, sign-in code; an encrypted vault | off in Alpha (503); the status GET happens when Settings loads | `components/account-access.tsx:32,59`; `lib/server/private-account.ts:4`; `lib/vault/*-transport.ts` |
| 44 | `/api/health-link` → health-link Worker → Oura, Withings, Polar, Strava | OAuth tokens, activity reads | off in Alpha (build flag; needs an account) | `components/health/devices/health-links.tsx:19-26`; `workers/health-link/providers.mjs` |
| 45 | mailto:contact@zigoals.app (feedback), mailto:hello@zigoals.app (security); NOVA handoff and Point & tell mailto | What you type, version, optional device details, through your own mail app | on action | `lib/feedback.ts:10,84`; `lib/nova/handoff/handoff.ts:107`; `lib/point-tell/store.ts:64` |
| 46 | Own origin: stale-code recovery | Nothing personal | default after a deploy | `lib/sw/update-recovery.ts:61` |
| 47 | Fonts, CDNs, analytics | **None.** Inter is in `/public/fonts/inter`; no third-party script, preconnect or tracker in the app or the landing (landing CSP is `'self'` only). Worker observability is off | none | `lib/egress-policy.json`; `landing/_headers` |

Round 7 (this session) added no new outside host. The diff `8fa8aa1d..HEAD` adds only:
- the local Read aloud (row 33);
- local recipe files (row 9);
- the voice-note player (local `<audio>`);
- one more `/api/push-device` PUT when a reminder is finished (`public/sw.js:476`, push off).

---

## (B) Mismatches, with proposed text

Ordered by importance. "App" means the Settings or Help text named; "Landing" means `landing/privacy.html`.

### B1. ZIGi and NOVA Read aloud can use an online voice, which breaks the owner rule (code and both pages)
- **Code.** `useReadAloud` (`components/ai/use-voice.ts:121-136`) uses `readAloudVoice(voices, lang, strict)`. It keeps to local voices only in Strict (`lib/ai/voice-privacy.ts:21-25`).
  - Outside Strict, including when no mode is chosen (`readPrivacyMode` returns null), it takes the first voice for the language, local or online.
  - With no voice for the language it speaks with `voice = null`, the browser default, which can be an online voice.
  - Replies to spoken questions are read by default (`lib/zigi-voice.ts:35`, `readSpoken ?? true`), so reply text, which can hold health or money figures, can reach Google's speech service without any extra choice.
  - The NOVA setup test does the same (`components/nova/setup/steps/voice.tsx:16`, `pickVoice(..., localOnly=strict)`), and its check line even reports "a voice your browser reads through its online service" (`lib/nova/setup-checks.ts:103`).
- **App text that is false today:**
  - Help `your-ai-voice` (`help-page.tsx:646`): "a reply to a spoken question is read aloud with your device's own voices".
  - ZIGi settings (`components/ai/ai-settings.tsx:383`): "With this device's own voices"; `:385`: "Uses the browser's own voices on this device".
  - The NOVA voice step (`voice.tsx:31`) says the opposite: "some browsers offer online voices too".
- **Landing:** no Read aloud line at all.
- **Fix (code, report only):** have `useReadAloud` and `speakTest` use `localVoiceFor` from `lib/read-aloud/speaker.ts` in every mode, and never speak with `voice = null`. Then these texts are true:
  - **App** (Help `your-ai-voice`, after "read aloud with your device's own voices"): add *"Online voices (such as Chrome's "Google …" voices) are never used, so nothing is sent; without a voice on this device, nothing is read."*
  - **App** (NOVA voice step, `voice.tsx:31` small text): replace with *"Only voices that run on this device; nothing is sent."*
  - **Landing** (new bullet after speech recognition): *"**Read aloud:** ZIGoals reads only with a voice that runs on your device. Online voices are never used, so the text is not sent anywhere. Without a device voice, Read aloud does not show."*
- **If the code is not fixed first**, the honest text is: *"Outside Strict, your browser may choose an online voice, which sends the text to the browser maker (Chrome: Google)."* That is against the owner rule, so fix the code instead.

### B2. Spotify is not on the landing page
- Landing line 54 reads: "Music: focus and sleep sounds are made on your device; nothing is downloaded or recorded."
- The code reaches accounts.spotify.com, api.spotify.com and i.scdn.co once you connect, with the site's id or your own (row 40).
- **Landing**, change to: *"**Music:** focus and sleep sounds are made on your device. If you connect Spotify, your browser signs in at Spotify and sends it your play, pause and skip choices; the sign-in stays sealed on this device and Spotify's artwork loads from Spotify. Apple Music and YouTube Music are plain links."*
- **App:** Help `w-music` (824) already says this; no change.

### B3. Chess is not on the landing page beyond the Lichess token
- Landing line 41 covers only "when you connect it to play".
- The code also does three other things:
  - It reads public ratings and games by username from api.chess.com and lichess.org, refreshing by itself (row 35).
  - It reads Lichess's daily puzzle (row 36).
  - It frames chess.com and Lichess pages on tap (row 38).
- **Landing**, replace the bullet with: *"**Chess (when you switch it on):** a public Chess.com or Lichess username you add goes from your browser to that site to read your public ratings and games. Puzzles and TV open the site itself, which sees your IP address. If you connect Lichess to play, its token stays on this device and is sent only to lichess.org."*
- **App:** Help `al-chess` is fine. Optionally add *"The username goes from your browser to that site; puzzles and TV open the site itself."*

### B4. Earn and Ecosystem figures and Polkachu are not named on the landing page
- Landing line 32 names only CoinGecko.
- The code also reads DefiLlama, Polkachu and ZIGChain through ZIGoals' server, without addresses (row 14).
- It also sends your address to ZIGChain for Earn shares (row 15) and to Polkachu's testnet service for practice badges (row 13).
- **Landing**, append to "Prices and market figures": *"Earn and Ecosystem figures come through ZIGoals' server from ZIGChain, Polkachu and DefiLlama, with nothing of yours."*
- **Landing**, in "Wallets you connect or link", after "ZIGChain's service": *"(and, for practice badges, Polkachu's public testnet service)"*.
- **App:** Help 860 already names DefiLlama; no change.

### B5. Sending a voice recording to your AI is not on the landing page
- The code sends a recording of up to a minute to OpenAI for transcription, opt-in and Relaxed mode only (row 26).
- **Landing**, add to the ZIGi bullet: *"If you choose transcription by your provider (Relaxed mode only), a recording of up to a minute goes from your browser to that provider; nothing goes through ZIGoals."*
- **App:** Help `your-ai-voice`, change "you can choose a recording of up to a minute transcribed by your provider instead" to *"… transcribed by your provider instead (Relaxed mode only; Strict and Guarded never send a recording)."*

### B6. Help contradicts itself and the landing page on the weather proxy
- Help `nova-weather` (`help-page.tsx:685`) says: "Not built yet: a caching proxy that would hide your IP address from MET Norway; it is required before a wider launch."
- Help 1042 says "ready but not switched on". The landing says "built, and off until ZIGoals switches it on". The code has `workers/weather-proxy`, off.
- **App** (Help 685), change to: *"Not switched on yet: a caching proxy that would hide your IP address from MET Norway (built, and off in this Alpha); it is required before a wider launch."*
- **Landing:** no change.

### B7. Help names the wrong food databases
- Help 712 says: "Only the barcode number is sent, through ZIGoals to Open Food Facts". USDA FoodData Central is missing (`worker.mjs:371`).
- Help 948 says: "After that come Open Food Facts and, for what it doesn't know, USDA FoodData Central … only the barcode or the words you type are sent". In the code, words go only to the Swiss Food Composition Database (`worker.mjs:84,314`), never to Open Food Facts or USDA.
- **App** (Help 712), change to: *"Only the barcode number is sent, through ZIGoals to Open Food Facts and, for a product it doesn't know, USDA FoodData Central."*
- **App** (Help 948), change to: *"A barcode goes to Open Food Facts and, for what it doesn't know, USDA FoodData Central; words you search go to the Swiss Food Composition Database; all through ZIGoals' food service, and nothing else of yours."*
- **Landing:** the text is right, but the heading "Food lookup (when it is switched on)" is stale: the food Worker is wired in `wrangler.alpha.jsonc`. Change to *"Food lookup (when you scan or search):"*.
- **Landing**, for accuracy, change "Never your diary, your name or your IP address" to *"The food databases never get your diary, your name or your IP address."* ZIGoals' own service uses a coarse network group for fair-use limits and passes it on to nobody.

### B8. Recipe and note files are not in the landing page's import list
- Landing line 52 lists bank, workout, Daylio … Cronometer.
- New this session: Paprika `.paprikarecipes` and `.paprikarecipe`, plus Markdown and text recipes, read on the device with photos left out (row 9). Notes also import `.md` files and ZIPs (Help `notes-what`).
- **Landing**, add to the list: *"…, recipe files (Paprika, Markdown or text) and Markdown notes"*.
- **App:** Help `aw-x5-recipe-files` (178) already says "It is read on this device"; it matches.

### B9. The app and the landing page disagree on accounts
- Landing line 23 says: "The public Alpha has **no accounts** and no sync."
- The app says otherwise:
  - Settings intro (`settings/page.tsx:186`): "Account sync requires separate email setup and vault unlock below."
  - The email sign-in panel shows (`components/vault-sync-panel.tsx:57`).
  - Help 714 says "During the friends Alpha, only invited email addresses can sign in".
- In the Public Alpha, `/api/private-account` answers 503, and Settings still calls its status on load.
- **App** (Settings intro), change the sentence to: *"Accounts and sync are not open in this public Alpha; when they open, sync stays off until you set it up below."*
- **Landing** ("Later: accounts and encrypted sync"), add: *"To sign in, your email address goes to ZIGoals' sign-in service (Supabase), which emails you a code."* (The auth origin must be `*.supabase.co`, `lib/server/private-account.ts:4`.)

### B10. The in-app privacy text has no "what leaves" summary, and one sentence is too broad
- Settings intro says: "Private plans, habits and health logs stay in this browser. … No analytics or health data onchain."
- That is true by default. But your own AI, when connected and allowed, can send them, and the app nowhere links to the full list except one Help answer (713).
- **App**, replace with: *"Your plans, habits and health logs stay in this browser unless you send them to your own AI. No ads, no trackers, no analytics, and no health data on a blockchain. What leaves this device, and when: [Privacy](https://zigoals.app/privacy.html)."*

### B11. AI providers are not named in full
- Landing line 36 says "for example Anthropic or OpenAI".
- The code reaches OpenAI, Anthropic, Google Gemini, xAI and OpenRouter (row 23), and offers OpenRouter sign-in (row 25).
- **Landing**, change to: *"…the AI provider you chose (OpenAI, Anthropic, Google Gemini, xAI or OpenRouter; OpenRouter passes it on to the model's maker)…"*
- **App:** no change (Help 641 and 678 name OpenRouter).

### B12. Notifications: the landing page leaves out some fields (off in Alpha, low)
- Landing line 40 says "the minutes your device should wake".
- The code sends wake minutes with their weekdays, one-off minutes (snoozes, including the new own snooze times), minutes to skip, and a random secret (row 41).
- When a morning or evening push arrives, the service worker also asks ZIGoals' market service for price-alert prices (row 5).
- **Landing**, change to: *"…a random id and secret made on your device, the push address, your time zone, your quiet hours, and the minutes (and weekdays) your device should wake or skip. With price alerts, a morning or evening notification also asks ZIGoals' market service for those public prices."*
- **App:** Help 945, add *"(and weekdays)"* after "the minutes to wake".

### B13. WalletConnect heading (low)
- Landing line 39 reads "(WalletConnect, when it is switched on)".
- The project id is now set (`config/public-integrations.json`), and Help 947 says phone wallets wait on WalletConnect's approval of the web address.
- **Landing**, change to: *"(WalletConnect, when you choose Connect on phone):"*

### B14. The landing page's date is stale
- Line 19 says "Last updated 18 November 2026".
- Read aloud (dcc035c4) and recipe files (2313bfa1) landed on 25 November.
- **Landing:** after the edits above, set *"Last updated 25 November 2026"* (or the day of the edit).

---

## (C) Things that match

- **No analytics or trackers.** None in the app, the landing page or the Workers. Worker observability is off, and the landing CSP is `'self'` only. Both pages say so.
- **Fonts and CDNs.** Inter is self-hosted (`public/fonts/inter`), and there is no third-party script, preconnect or image host other than Spotify art after connecting. The landing page says "The Inter font … comes from ZIGoals itself".
- **Read aloud for programmes, meditation and stretches.** Only `localService === true` voices are used, checked again when it speaks (`lib/read-aloud/speaker.ts:27-30,75`). Help `aw-read-aloud` (153) is accurate. The landing page is missing it (see B1).
- **Prices.** Only public asset ids go to CoinGecko through ZIGoals' market service (landing 32, Help 711).
- **Food barcode and search.** The landing text is right (B7 covers the Help errors). The offline CIQUAL and CoFID library comes from ZIGoals' own origin and is searched on the device.
- **Recipe import from a web address.** The DNS check at cloudflare-dns.com, then one page read, with no cookies and no redirects. This matches the landing page exactly.
- **Paprika and Markdown recipe files.** Parsed on the device and never sent (Help 178).
- **Tracked ZIGChain wallets.** Read through the relay with a 60 s memory cache, never stored (`positions-relay.ts:15`, `chain-relay.ts:11`, `shares-relay.ts:9`). This matches "at most a minute". Proposal reads may be kept up to 10 minutes, but they carry no address.
- **Linked wallets and xpub.** PublicNode and mempool.space, browser-direct; the xpub stays on the device.
- **WalletConnect.** The relay and Verify only, telemetry off (`walletconnect.ts:145`).
- **Exchanges.** A stateless relay that keeps nothing (`exchange-relay.ts:7`); signed on the device.
- **ZIGi and NOVA with your own AI.** Browser-direct to the chosen provider (the CSP lists exactly those five origins). Local models are limited to localhost and 127.0.0.1 by CSP. Hermes is reached only at loopback (`assertLoopback`). An Ollama cloud model is detected and treated as cloud. Photos go only with that one request.
- **Speech recognition.** The disclosure for each browser (`lib/ai/voice.ts:41-47`) matches the landing page and Help. Strict uses on-device recognition only.
- **NOVA weather.** Opt-in, rounded to two decimals, browser-direct to api.met.no, as both pages say. Only the proxy status in Help is wrong (B6).
- **Push.** Payload-free, nothing named, delete on turning off. Off in this Alpha; the landing page says "off by default; being switched on" (field detail in B12).
- **Feedback.** Through your own mail app; device details only if ticked (`send-feedback.tsx:26,35`).
- **Add money.** Ramp and Banxa are plain links. The app's server reads only Ramp's public asset list (row 22, nothing of yours). Optionally add "ZIGoals reads Ramp's public list of assets and fees, with nothing of yours" to landing line 43.
- **Hosted ZIGi, health links (Oura, Withings, Polar, Strava), account push and sync.** All built, all off in the Public Alpha. No page claims them as live except the account wording in B9. When any is switched on, the landing page needs a bullet first.
- **NEL.** Cloudflare's network error reports are described on the landing page; ZIGoals adds no reporting header of its own (`middleware.ts`).
