# Legal checklist: questions for a lawyer (research, 2026-10-02)

> **Research only. Not legal advice, and no conclusions.**
> - This lists questions to take to a qualified lawyer, each with the official source worth reading first.
> - It records no answer or opinion, and nothing in it says that ZIGoals is or is not compliant.

**How the sources were checked:**
- The cloud session that wrote this (2026-10-02) could open only Apple's App Store Review Guidelines; the sections quoted below were read that day.
- Every other link is the official publisher's address for the text named. It was **not opened from this session**, because the network policy refused it.

**What ZIGoals does today**, as context for the lawyer (from [STATUS](../STATUS.md) and [PRIVACY](../PRIVACY.md)):
- **Private records** (Goals, Habits, Health, Wealth) are kept on the person's device.
- **Optional account sync** stores them end-to-end encrypted in Cloudflare Durable Objects, with a recovery secret only the person holds. Sign-in is by email code (Supabase, Resend).
- **Market prices** come from CoinGecko, and **food data** from Open Food Facts.
- **Wallet connection is read-only and non-custodial.** There are no blockchain transactions or financial signatures in the public Alpha, and mainnet is disabled.
- **A one-time price of 4.99** is being considered.
- **Push reminders** ([ADR-010](../architecture/ADR-010-push-reminders.md)) and **the Guide** ([ADR-011](../architecture/ADR-011-coach.md)) were added on 2026-10-04 (Session P), both off by default: questions 2.9, 4.4 and 4.5 below.

## 1. Open Food Facts data and the ODbL
**Questions:**
1. When a person scans a barcode, the app keeps a snapshot of the product's name and nutrients in that person's own (possibly synced, encrypted) Health records.
   - Is that a "Derivative Database", a "Collective Database" or a "Produced Work" under the ODbL 1.0?
   - Does it trigger share-alike duties?
   - This "derived database" question is already open in [FOOD_READINESS.md](../run11/FOOD_READINESS.md).
2. Is keeping those snapshots private to one person "Publicly Using" a database under the ODbL? Would it change if people could share or export them?
3. Is the attribution the app shows enough, in content and placement, for the ODbL, the DbCL (contents) and CC BY-SA (images, if any are ever shown)?
4. Do Open Food Facts' terms of use (a custom User-Agent, rate limits, no misleading use) place duties on us beyond the licences?

**Read first:**
- ODbL 1.0, <https://opendatacommons.org/licenses/odbl/1-0/>
- DbCL 1.0, <https://opendatacommons.org/licenses/dbcl/1-0/>
- Open Food Facts terms of use, <https://world.openfoodfacts.org/terms-of-use>
- Open Food Facts API documentation, <https://openfoodfacts.github.io/openfoodfacts-server/api/>

## 2. GDPR and health data
**Questions:**
1. **Health data or not?** Are weight, meals, water and body measurements "data concerning health" (GDPR Art. 4(15), Art. 9)?
   - When they stay only on the device?
   - When they sync end-to-end encrypted, with a key we never hold?
2. **Our role.** With end-to-end encryption, what is ZIGoals' role for the synced copies: controller, processor or neither? And for the account email?
3. **Consent.** Health sync asks for its own explicit permission. Does that meet Art. 9(2)(a) explicit consent? What must happen when it is withdrawn (Art. 7(3))?
4. **DPIA.** Is a data protection impact assessment (Art. 35) needed for the friends Alpha, or only at scale?
5. **Providers.** For Cloudflare, Supabase and Resend:
   - which processor agreements (Art. 28) do we need;
   - which records of processing (Art. 30);
   - which transfer safeguards for data leaving the EU (Chapter V)?
6. **Device storage.** Does storing records in the browser's local storage and IndexedDB need consent under the ePrivacy rule on terminal equipment (Art. 5(3) of Directive 2002/58/EC), or is it strictly necessary?
7. **Rights we cannot read for.** How do we meet access, erasure and portability requests for synced data we cannot decrypt? Are the in-app export and deletion enough?
8. **Belgium.** Which Belgian rules or guidance from the Data Protection Authority (GBA/APD) apply on top?
9. **Push reminders** ([ADR-010](../architecture/ADR-010-push-reminders.md), built, off until the owner activates it; added 2026-10-04). A signed-in person can turn on, for one device, a notification when a reminder time passes while the app is closed. The device then stores a push subscription and a small push-only service worker. Our push Worker stores per account: the subscription address and its two encryption keys, the device's time zone and quiet hours, up to 20 reminder times as times of day with weekdays, sent marks and counters. Never a habit's name, a count or any content; every message carries the same encrypted, fixed content, and the notification text is fixed ("A reminder from ZIGoals"). The platform's push service (Apple, Google, Mozilla or Microsoft, by browser) delivers it and sees the timing. A device not refreshed for 30 days is deleted; turn-off, sign-out and account deletion delete at once.
   - Under ePrivacy Art. 5(3), is storing the subscription and the service worker after the person's explicit request "strictly necessary" for a service "explicitly requested", or must consent be recorded, and how?
   - What is our role for the schedule metadata (times, zone, weekdays)? Are the push services processors, independent controllers or neither? Which agreements and transfer safeguards follow (Chapter V)?
   - The server never sees health content, but a water reminder's existence (a reminder time, every day) is a fact about the person's health habits. Does it need the Health consent wording, and does it change the answer to question 1?
   - Must the notice state a fixed retention period beyond "30 days without a refresh" ([PRIVACY_NOTICE_DRAFT.md](../legal/PRIVACY_NOTICE_DRAFT.md) §2 and §5)?

**Read first:**
- GDPR, Regulation (EU) 2016/679, <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
- EDPB Guidelines 05/2020 on consent, and 4/2019 on data protection by design and by default, <https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en>
- ePrivacy Directive 2002/58/EC, <https://eur-lex.europa.eu/eli/dir/2002/58/oj>
- Belgian Data Protection Authority, <https://www.dataprotectionauthority.be/>

## 3. MiCA, staking and stablecoins
**Questions:**
1. **Today's features.** Does any of the following amount to a crypto-asset service under MiCA (Regulation (EU) 2023/1114, Art. 3(1)(16)), and in particular to "providing advice on crypto-assets"?
   - read-only wallet and position tracking;
   - showing staking positions;
   - an Ecosystem directory;
   - a "Valdora liquid staking (stZIG)" card that tracks nothing yet.
2. **Planned features.** Would non-custodial staking through the person's own wallet change the answer? What about goal "execution adapters" that prepare transactions the person signs? For example, could that be reception and transmission of orders?
3. **Stablecoins.** Showing balances and values of stablecoins (e-money tokens) or other tokens: are there marketing-communication or other duties for an app that neither issues nor offers them?
4. **Belgium.** What do the Belgian FSMA's crypto rules and the MiCA transition mean for a Belgian-based app like this?

**Read first:**
- MiCA, Regulation (EU) 2023/1114, <https://eur-lex.europa.eu/eli/reg/2023/1114/oj>
- ESMA's MiCA pages and Q&As, <https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica>
- EBA on e-money and asset-referenced tokens, <https://www.eba.europa.eu/>
- FSMA (Belgium), <https://www.fsma.be/en>

## 4. Advice-like features and AI
**Questions:**
1. **Investment advice.** A Goal can carry a planned contribution, a "Funding Wealth" status and a "Funding scenario" with a projected completion date and shortfall. Could any of that be a personal recommendation, meaning "investment advice" under MiFID II (Directive 2014/65/EU, Art. 4(1)(4)) or "advice on crypto-assets" under MiCA? Which wording and design keep it general information?
2. **An AI assistant.** If one were added:
   - which AI Act duties would apply (Regulation (EU) 2024/1689, e.g. Art. 50 transparency)?
   - could any use be high-risk (Annex III)?
   - what changes if it comments on money or health?
3. **Medical device.** Could the Health features ever qualify as medical device software (Regulation (EU) 2017/745, classification rule 11), for example if they give nutrition or weight advice? Which features or wording keep them general wellness?
4. **The Guide, phase 1** ([ADR-011](../architecture/ADR-011-coach.md), built, opt-in, on the device; added 2026-10-04). A fixed table of rules written by people turns the person's own records into at most one short note a day on Today and one paragraph in the weekly review. No model, no learning, no network call. Every note carries the label "Guide · on this device, no AI service". It never gives money or medical advice and never moves anything.
   - Is such a rule table an "AI system" under the AI Act's Art. 3(1) ("infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions"), or outside it?
   - If it is one: does the label meet the Art. 50(1) transparency duty (applying from 2 August 2026, Art. 113), and is anything more needed?
   - To confirm: Annex III (high-risk) is not engaged by a wellbeing and planning app.
   - Art. 5(1)(a) and (b): the Guide has no countdown, no loss framing and no interruption, by design. Is anything else needed to stay clear of manipulative techniques or the exploitation of vulnerabilities?
5. **The Guide, phase 2** (not built; options (a) a model on the device, (b) an opt-in cloud proxy, (c) hybrid, in ADR-011). If notes were worded by a model on the device, or by a hosted model through a proxy Worker with consent per message:
   - for a hosted provider: a processor agreement and transfer safeguards (question 2.5), the provider's retention and training terms, and special-category data if Health content were ever sent (GDPR Art. 9);
   - whether a free-text conversation about money or health can slide into advice (questions 4.1 and 4.3), and which design keeps it general information;
   - the age limit for the Alpha ([PRIVACY_NOTICE_DRAFT.md](../legal/PRIVACY_NOTICE_DRAFT.md) §8) and how it is checked.

**Read first:**
- MiFID II, Directive 2014/65/EU, <https://eur-lex.europa.eu/eli/dir/2014/65/oj>
- AI Act, Regulation (EU) 2024/1689, <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>
- Medical Device Regulation (EU) 2017/745, <https://eur-lex.europa.eu/eli/reg/2017/745/oj>
- The European Commission's medical device guidance (MDCG documents, including software qualification), <https://health.ec.europa.eu/medical-devices-sector_en>

## 5. App stores, payments and consumer law
**Questions:**
1. **In-app purchase.** If ZIGoals ships in the App Store, must a 4.99 unlock use in-app purchase?
   - Apple 3.1.1: "If you want to unlock features or functionality within your app… you must use in-app purchase", read 2026-10-02.
   - Can a purchase made on the web be honoured in the iOS app (3.1.3, "Other Purchase Methods")?
   - In which storefronts may we link to our own website (3.1.1(a), "Link to Other Purchase Methods")?
2. **Crypto on iOS.** Does read-only wallet tracking or a Keplr connection fall under Apple 3.1.5 "Cryptocurrencies"? For example: "(i) Wallets: Apps may facilitate virtual currency storage, provided they are offered by developers enrolled as an organization." Must we enrol as an organisation?
3. **Health on iOS.** Do the Health features meet Apple 1.4.1 (medical apps; accuracy and "remind users to check with a doctor")? What must the privacy policy and App Privacy details say under 5.1.1?
4. **Google Play.** Do the equivalent Google Play policies apply to a one-time unlock, crypto features and health features? That is, Payments (Play Billing), Financial Services and Health apps policies.
5. **EU alternatives.** What do the EU Digital Markets Act's alternative payment and link-out options mean for us, and at what cost?
6. **Consumer law for a one-time digital purchase in the EU:**
   - the 14-day withdrawal right and its waiver for digital content (Directive 2011/83/EU, Art. 16(m));
   - conformity and updates (Directive (EU) 2019/770);
   - VAT on digital services sold to consumers in other EU countries (the One-Stop Shop).

**Read first:**
- Apple App Store Review Guidelines, <https://developer.apple.com/app-store/review/guidelines/>. Read 2026-10-02: sections 1.4.1, 3.1.1, 3.1.1(a), 3.1.3, 3.1.5 and 5.1.1.
- Google Play Developer Policy Center, <https://play.google.com/about/developer-content-policy/>
- Digital Markets Act, Regulation (EU) 2022/1925, <https://eur-lex.europa.eu/eli/reg/2022/1925/oj>
- Consumer Rights Directive 2011/83/EU, <https://eur-lex.europa.eu/eli/dir/2011/83/oj>
- Digital Content Directive (EU) 2019/770, <https://eur-lex.europa.eu/eli/dir/2019/770/oj>
- EU VAT One-Stop Shop, <https://vat-one-stop-shop.ec.europa.eu/>

## 6. Earn: on-ramps, stablecoins, staking promotion, copy trading, referrals, KYC/AML and disclosures (research, Session N, 2026-10-02)
Questions for the planned "earn and staking" features in [EARN_DESIGN.md](../earn/EARN_DESIGN.md). They build on §3 and do not repeat it. The facts behind them are in [EVIDENCE_2026-10.md](../earn/EVIDENCE_2026-10.md); the legal sources, each with its access time and a quote, are in its [legal register](../earn/evidence/legal-sources.md).

**How these sources were checked:** this session opened the ESMA, EBA, FSMA, FCA and European Parliament pages below on 2026-10-02. EUR-Lex itself returned an AWS WAF challenge (HTTP 202, empty body) and could not be read; the same official texts were read from the EU Publications Office (Cellar), whose addresses are given next to the EUR-Lex ones. Nothing here is an answer.

**What the earn design would do** (none of it is built): show options run by others (native staking, Valdora liquid staking, vaults) with their published facts and fees labelled as the provider's claims; hand the person off to a regulated on-ramp of their choice; later, prepare transactions on testnet that the person signs in their own wallet. ZIGoals would never hold funds or keys, take payment from providers, or use referral links.

### 6.1 On-ramps (card or bank to crypto)
1. Would a link or embedded widget that hands a person to a regulated on-ramp, with their own wallet address filled in, be a crypto-asset service by ZIGoals under MiCA (Art. 3(1)(16), for example reception and transmission of orders, or placing)? Does it matter whether the provider pays nothing and the address is only prefilled?
2. Is any part of such a hand-off a payment service under PSD2 (Directive (EU) 2015/2366, Art. 4, Annex I), given that ZIGoals never touches the funds?
3. In a hand-off, which duties stay with the on-ramp provider (identity checks, disclosures, complaints, Art. 66 information) and which, if any, fall on ZIGoals?
4. If a provider is outside the EU, what does MiCA Art. 61 (exclusive initiative of the client) mean for showing it to EU residents at all?

### 6.2 Stablecoins (MiCA Titles III and IV)
1. Showing a balance of, or later preparing a self-signed transfer of, a stablecoin that has no MiCA white paper in ESMA's register (USDT reaches ZIGChain via IBC Eureka; ESMA's EMT register lists no Tether entry): does the Commission's Q&A 2404 or ESMA's statement on non-compliant ARTs and EMTs reach a non-custodial app?
2. EBA's Opinion on PSD2 and MiCA says CASPs that transact e-money tokens needed PSD2 authorisation after a transition ending 2 March 2026. Could a non-custodial app that prepares user-signed EMT transfers be affected?
3. USDC from Noble is being wound down by Circle (new minting stops 13 October 2026; the Noble USDC contract and CCTP routes pause on 12 January 2027). What must an app say to people who hold that USDC on ZIGChain, and when?

### 6.3 Promoting staking and liquid staking
1. ESMA Q&A 2067 says staking services need authorisation for custody and administration (Art. 75). Is showing third-party staking options, with their published fees and exit times, a marketing communication or advice under MiCA (Art. 3(1)(24), Art. 66(2) "fair, clear and not misleading")?
2. Does showing a provider's own published fee (for example "10% performance fee on rewards", labelled as the provider's claim with its source and date) need further warnings, and in which form?
3. Belgium: does the FSMA Regulation of 5 January 2023 on distributing virtual currencies to consumers (approved by the Royal Decree of 8 February 2023, in force 17 May 2023) apply to an app that shows staking or stablecoin options to Belgian consumers without selling anything? This session found no FSMA instrument from 2024.

### 6.4 Copy trading
1. The design lists Zignaly as information only (its services are off-chain and custodial). Does listing such a service, without links that pay, create duties under MiFID II (portfolio management, Art. 4(1)(8); Annex I) or ESMA's copy-trading briefing?
2. Under MiCA, ESMA Q&A 2463 applies the copy-trading guidance to crypto-assets. Would describing how copy trading works, with its risks, be a marketing communication?

### 6.5 Affiliate and referral rules
1. ZIGoals takes no payment and uses no referral or affiliate links. Does it need to say so on each listing, and is there a standard form?
2. The FCA (UK, PS23/6) bans "refer a friend" and new-joiner incentives for crypto promotions, and ESMA's finfluencer factsheet asks for disclosure of payments. Which EU or Belgian rules would apply if that ever changed? (No change is planned.)

### 6.6 KYC and AML in a hand-off model
1. Under the AMLR (Regulation (EU) 2024/1624; CASPs are obliged entities, applying from 10 July 2027), does a non-custodial app that never holds funds have any obligation of its own?
2. The Transfer of Funds Regulation (Regulation (EU) 2023/1113, Art. 14) sets rules for transfers with self-hosted addresses above EUR 1,000. Who carries them when ZIGoals only prepares a transfer the person signs to or from a CASP?

### 6.7 Consumer disclosures
1. Which risk statements does each option need (slashing, unbonding and queue delays, smart-contract risk, a single admin key that can migrate the code, issuer wind-down) under the UCPD (Directive 2005/29/EC, Art. 5 to 7) and MiCA Art. 66?
2. Does the distance-marketing regime for financial services (Directive (EU) 2023/2673, applying from 19 June 2026) apply to an app that shows options and hands off, without concluding any contract?
3. Is the format "provider's claim · source · time read" adequate for fees and exit times, or is more needed?

### 6.8 Authorisation status of the providers
1. The MiCA transitional period ended EU-wide on 1 July 2026 (ESMA statement ESMA75-113276571-1679). Before any hand-off, how should ZIGoals check a provider's authorisation, and is ESMA's interim register (CASPS.csv) enough?

**Read first** (opened 2026-10-02 unless marked):
- MiCA, Regulation (EU) 2023/1114: <https://eur-lex.europa.eu/eli/reg/2023/1114/oj> (EUR-Lex, not opened: bot wall); read at <https://publications.europa.eu/resource/celex/32023R1114>.
- PSD2, Directive (EU) 2015/2366: <https://eur-lex.europa.eu/eli/dir/2015/2366/oj> (not opened); read at <https://publications.europa.eu/resource/celex/32015L2366>. PSD3 and the PSR are not adopted: <https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2023/0209(COD)> and <https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2023/0210(COD)>.
- MiFID II, Directive 2014/65/EU: <https://eur-lex.europa.eu/eli/dir/2014/65/oj> (not opened); read at <https://publications.europa.eu/resource/celex/02014L0065-20260606>.
- Transfer of Funds Regulation (EU) 2023/1113: read at <https://publications.europa.eu/resource/celex/32023R1113>; EBA travel-rule guidelines: <https://www.eba.europa.eu/sites/default/files/2024-07/6de6e9b9-0ed9-49cd-985d-c0834b5b4356/Travel%20Rule%20Guidelines.pdf>.
- AMLR, Regulation (EU) 2024/1624: read at <https://publications.europa.eu/resource/celex/32024R1624>.
- UCPD, Directive 2005/29/EC: read at <https://publications.europa.eu/resource/celex/02005L0029-20260927>.
- Directive (EU) 2023/2673 (distance financial services): read at <https://publications.europa.eu/resource/celex/32023L2673>.
- ESMA Q&A 2404 (non-compliant ARTs and EMTs): <https://www.esma.europa.eu/publications-data/questions-answers/2404>; ESMA statement on stablecoins: <https://www.esma.europa.eu/sites/default/files/2025-01/ESMA75-223375936-6099_Statement_on_stablecoins.pdf>.
- ESMA Q&A 2067 (staking): <https://www.esma.europa.eu/publications-data/questions-answers/2067>.
- ESMA copy-trading briefing: <https://www.esma.europa.eu/sites/default/files/2023-03/ESMA35-42-1428_Supervisory_Briefing_on_Copy_Trading.pdf>; Q&A 2463: <https://www.esma.europa.eu/publications-data/questions-answers/2463>.
- ESMA on the end of MiCA transitional periods: <https://www.esma.europa.eu/sites/default/files/2026-04/ESMA75-113276571-1679_Statement_on_the_end_of_transitional_periods_under_MiCA.pdf>; ESMA's MiCA page and interim register: <https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica>.
- ESMA finfluencer factsheet: <https://www.esma.europa.eu/document/finfluencers-tips-responsible-promotion>.
- EBA on ARTs and EMTs, including the PSD2 and MiCA opinion: <https://www.eba.europa.eu/regulation-and-policy/asset-referenced-and-e-money-tokens-mica>.
- FSMA (Belgium) virtual-currency distribution rules: <https://www.fsma.be/en/news/new-rules-advertisements-virtual-currencies-enter-force>; the Regulation: <https://www.fsma.be/sites/default/files/media/files/2023-03/reglem_05-01-2023_en.pdf>; CASPs: <https://www.fsma.be/en/crypto-asset-service-provider-casp>.
- FCA (UK, reference only): PS23/6 <https://www.fca.org.uk/publication/policy/ps23-6.pdf> and FG24/1 <https://www.fca.org.uk/publication/finalised-guidance/fg24-1.pdf>.

## For the meeting
- Bring:
  - [PRIVACY.md](../PRIVACY.md) and [SECURITY.md](../../SECURITY.md);
  - the [threat model](../security/THREAT_MODEL.md);
  - the [cost model](COST_MODEL.md);
  - a short demo of the Settings sync and backup screens.
- Write the lawyer's answers in a new dated file, and leave this list unchanged as the record of what was asked.
