# On-ramps and Zignaly: what could be built, and why nothing is (Session N, 2026-10-02)

Part 2.7 of Session N asked for a read-only parser only if an official, public API without keys exists, and otherwise
for the options to be written down. Every fact below is in [EVIDENCE_2026-10.md](EVIDENCE_2026-10.md) (registers
[(c) Zignaly](evidence/c-zignaly.md) and [(e) On-ramps](evidence/e-on-ramps.md)) with its source and the time it was
read. Nothing here is advice, and no provider is endorsed or ranked.

## Result
**No code.**
- No on-ramp read today delivers ZIG on ZIGChain, or any stablecoin on ZIGChain. A parser could only ever report "not
  available".
- Most hand-offs that fill in the person's wallet address need a secret from the provider, held on a server, to sign the
  link or create a session. That covers Guardarian, MoonPay, Transak, Mercuryo, Onramper, Alchemy Pay, Stripe and
  Coinbase, and ZIGoals' rules forbid storing third-party API keys. Banxa's and Ramp's hosted pages take the address in
  the link, and Simplex's form uses a public key, but each still needs a business account first.
- Calling these providers from the app would add third-party requests to a product that is private by design. The app's
  Content-Security-Policy does not allow them today.
- Zignaly publishes no public API that could be read, and it is custodial.

## On-ramps
| Provider | ZIG listed? | ZIGChain network? | List readable without a key? | What a business needs first | Wallet address filled in |
|---|---|---|---|---|---|
| Guardarian | Yes, but only as the Ethereum ERC-20 `0xb261…4f01` | No | Yes (currencies endpoints) | A signed contract; an API token | Needs the token and a separate permission |
| MoonPay | No. Its USDC-on-Noble entry is suspended | No | Yes (`/v3/currencies`) | Account review and KYB | The link must be signed whenever an address is passed |
| Transak | No | No | It answered without a key, although its docs now require one | An account on its "Partner Dashboard", KYB; a listing fee for new tokens | A single-use widget link created on a server |
| Banxa | No | No | Docs table | A business subdomain from Banxa; a signed agreement for its API | Its hosted page takes the address without a server |
| Ramp Network | No | No | Yes (assets, key optional) | A production API key through onboarding | A link parameter in hosted mode |
| Mercuryo | No | No | Yes (`/lib/currencies`) | A widget ID and a secret | Every link signed with the secret |
| Simplex | No | No | Docs table | A business public key on an allow-listed domain | An iFrame field |
| Stripe | No (14 assets in the US and EU) | No | Docs list | An approved onramp application | A session created on a server |
| Coinbase Onramp | Not verified (its list needs a developer key) | — | No | A developer key; JWT sessions | A session token created on a server |
| Onramper | Not verified (list is client-rendered or needs a key) | — | No | A legal entity, KYB, a subscription | The link must be signed |
| Alchemy Pay | Not verified (list on Notion; signed API) | — | No | Contact with sales; an app ID and secret | Every link signed |
| Kado | Not verified (its site now redirects to swapped.com) | — | No | — | — |

Evidence: [B-onramps-no-zigchain-network](evidence/e-on-ramps.md#b-onramps-no-zigchain-network) and the `B-<provider>-zig`
and `B-<provider>-setup` items in the [(e) register](evidence/e-on-ramps.md).

Other ways to get ZIG, in their publishers' words:
- ZIGChain's docs list exchanges by ZIG network: native, ERC-20 or BEP-20
  ([B-zigchain-docs-exchanges](evidence/e-on-ramps.md#b-zigchain-docs-exchanges)).
- The ZIGChain Hub bridge moves ZIG and USDC from other networks
  ([B-zigchain-bridge](evidence/e-on-ramps.md#b-zigchain-bridge)).
- Valdora's guide says to buy on an exchange or swap on OroSwap
  ([B-valdora-get-zig](evidence/e-on-ramps.md#b-valdora-get-zig)).

Each of these routes means several steps across chains, and the network has to be chosen correctly. ZIGChain's GitHub
registry still lists native ZIG as `uzig`/6, and a factory token named "ZIG" exists on chain
([B-zigchain-registry-stale-denom](evidence/e-on-ramps.md#b-zigchain-registry-stale-denom),
[B-zigchain-decoy-zig](evidence/e-on-ramps.md#b-zigchain-decoy-zig)).

## Zignaly
- **API.** The only API Zignaly describes is Binance-compatible trading keys that wealth managers create for their own
  service accounts ([B-zignaly-api-keys](evidence/c-zignaly.md#b-zignaly-api-keys)). It is a private trading API. No
  public API, with or without keys, could be found: the API agreement, the site and the docs host were unreadable
  ([B-zignaly-public-api](evidence/c-zignaly.md#b-zignaly-public-api)).
- **Custody.** Funds are pooled (PAMM) and held off-chain in Binance accounts under Zignaly's broker arrangement;
  investors cannot use their own exchange account
  ([B-zignaly-custody-offchain](evidence/c-zignaly.md#b-zignaly-custody-offchain)).
- **Eligibility.** KYC applies to every user, and 14 places are excluded, the United States and Canada among them.
  Trading services left the marketplace on 2026-08-31 ([F20](EVIDENCE_2026-10.md#f20)).
- **What ZIGoals can do.** Nothing beyond information. ZIGoals never stores exchange credentials or API keys and never
  places trades, so even a documented key-based API would stay out of reach. The Ecosystem card and the registry record
  remain information only.

## Decisions for the owner (later, not needed for this PR)
1. **Keep "no provider secrets on a server" as a rule?** Recommended: yes. It rules out the hand-offs that need a
   signed link or a session created on a server. Still possible, after a business agreement and legal review:
   - a hosted page that takes the address in the link (Banxa, Ramp) or through a public key (Simplex);
   - a plain link to a provider's own page, where the person enters their address themselves.
2. **When an on-ramp delivers ZIG or a stablecoin natively on ZIGChain, approach it at all?** That would need:
   - legal review of the questions in [LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §6 (on-ramps, promotion,
     referral rules);
   - a business agreement with the provider;
   - a link that never carries referral, affiliate or tracking parameters.
3. **Zignaly stays information only.** Recommended: yes, because it is custodial and off-chain, and no public API was
   found.
