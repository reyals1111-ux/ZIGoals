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

## For the meeting
- Bring:
  - [PRIVACY.md](../PRIVACY.md) and [SECURITY.md](../../SECURITY.md);
  - the [threat model](../security/THREAT_MODEL.md);
  - the [cost model](COST_MODEL.md);
  - a short demo of the Settings sync and backup screens.
- Write the lawyer's answers in a new dated file, and leave this list unchanged as the record of what was asked.
