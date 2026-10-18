# Owner account checklist (Session AF)

Nothing here is secret: every value the owner pastes is a **public identifier** that ships in the app. All of them go into
one file, `apps/web/config/public-integrations.json` (ADR-028 H90), committed empty; the next Manual Alpha deployment ships
what the owner fills in. Until a field is filled, the app says honestly what is not available yet.

| # | Account | Why | Click by click | Public ID → field |
|---|---|---|---|---|
| 1 | Reown (WalletConnect) project | Phones: MetaMask mobile, Trust, OKX, Ledger Live and Keplr Mobile pair by QR or deep link | `https://dashboard.reown.com` → sign up (Starter, $0) → **Create project** (type App, name "ZIGoals") → copy the **Project ID** → **Configuration** tab → **Domain** → "+ Domain" → allowlist `alpha.zigoals.app` and `zigoals-alpha.reyals1111.workers.dev` (at most 10 domains; the app's `metadata.url` must match) | `reownProjectId` |
| 2 | Ramp Network partner account | Add money, option A, with the address and asset pre-filled | `https://docs.rampnetwork.com/getting-started` → partner sign-up (business review with the legal entity) → the Ramp dashboard → **API keys** → copy the **host API key** (public; a secret key, if shown, is never used) → register `alpha.zigoals.app` as the host app | `rampHostApiKey` (`rampHostAppName` is "ZIGoals"; the logo URL is the app's own) |
| 3 | Banxa partner (referral) account | Add money, option B | `https://banxa.com/talk-to-our-team/` → partner review (business review) → Banxa enables a partner subdomain `{partnerRef}.banxa.com` and a sandbox `{partnerRef}.banxa-sandbox.com` (see Banxa's "access and setup" page) → the referral mode needs no key; the partner dashboard shows the partner ref | `banxaPartnerRef` |
| 4 | Nothing else | No exchange, indexer or price API key is needed: chain reads use public services; prices use the existing market coordinator | — | — |

Until a field is filled: phones show "available soon on phones" for WalletConnect and the "Open ZIGoals in Keplr" path
works on day one; an on-ramp without its ID links to the provider's own consumer page.

## One-time checks the research helpers could not do (bot-walled pages or accounts)
1. Ask Ramp (through the contact on its partner docs) and Banxa onboarding whether the hosted/referral checkout validates the
   Referer or Origin header; ZIGoals sends none (ADR-028 H52).
2. Open a validator page and a proposal page on `https://hub.zigchain.com/` once and note the URL shapes.
3. Open `https://x.com/zigchain` once and note whether it redirects to @ZIGFinance.
4. Open `https://faucet.zigchain.com/` once and note the amount per claim, the captcha and the wallet requirement.
5. On a phone with Keplr Mobile, open the app through Keplr's own browser and tap Connect; note what happens.
6. Install the next `MARKET_POLICY` before 2026-10-31 16:00 UTC, or every price (and the new fiat columns) reads "unavailable".
7. Ask Bybit EU and Gate EU once whether ZIG withdraws on the ZIGChain network for EU accounts.

## After the deploy: the real signing checks (only the owner signs)
A practice stake and a practice vote on `zig-test-2` (the testnet voting period is 600 s), then a small real delegate and
claim on `zigchain-1`; a WalletConnect pairing once the project ID is in; an on-ramp sandbox run once the accounts exist.
