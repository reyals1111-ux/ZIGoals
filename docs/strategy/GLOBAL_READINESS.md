# Global readiness: languages, regions, formats, stores and rules (research, 2026-10-03)

> **Research only. It decides nothing, and nothing here is legal advice.**
> - Regional rules are **flags for a lawyer**, with the official source to read first. They are not conclusions about whether ZIGoals is or is not compliant anywhere.
> - **Pricing is NOT decided.** COST_MODEL.md once noted 4.99 as an early idea, not a working or chosen price.
> - Sources were read on **2026-10-03 (UTC)** unless a line says otherwise. Anything that could not be confirmed on an official page is marked **UNVERIFIED**.

**Part of the [strategy pack](README.md).** Labels and legal flags (LC§1–LC§5, LC-new) are explained there.

## Summary
- **Today ZIGoals is English-only in its words, but worldwide in its numbers.**
  - Figures follow the browser's locale (Session G).
  - Health has kg or lb, mL or US fl oz, and cm or in. Energy is kcal only.
  - Portfolios are in USD or EUR only.
  - There is no translation layer in the code yet.
- **The stores reach almost everyone except mainland China:**
  - the App Store is in 175 countries or regions, with 50 store languages;
  - Google Play sells paid apps in 143 countries, a list without mainland China;
  - China mainland on the App Store needs an ICP filing for some apps.
- **The home market speaks three languages.** Belgium's official languages are Dutch, French and German.
  - English is the most widely known foreign language in the EU (47% of Europeans), ahead of French (11%), German (10%) and Spanish (7%).
- **The category leaders cover many languages** (table in §2.4). A switch-from-four-apps story outside English-speaking markets meets competitors that already speak the local language.
- **The rules that touch an all-in-one app cluster in three places:**
  - **health data,** which is special-category data in the EU and UK, and has US state laws of its own;
  - **crypto promotion:** MiCA, Belgium's FSMA advertising rules that name influencers, the UK's FCA promotions regime, Singapore's MAS, and the stores' crypto policies;
  - **subscription and consumer rules:**
    - the EU withdrawal function (from 2026-06-19);
    - the UK subscription regime (expected spring 2027);
    - US state auto-renewal laws.
- **Two existing details deserve a lawyer's look before any launch push in Belgium:**
  - the "Buy ZIG" habit template;
  - any creator or influencer content about ZIG.

  §5.2 explains why. These are questions, not conclusions.

## 1. Where ZIGoals stands today (from this repository)
| Area | Today | Where it is defined |
|---|---|---|
| Interface language | English only. Strings are written in the components, and there is no translation library (none among `apps/web` dependencies) | `apps/web/package.json`, `apps/web/components/**` |
| Numbers and money | Formatted in the browser's own locale; the server render uses en-US, then the page switches before first paint (Session G) | `apps/web/components/display-locale.ts`, `apps/web/lib/visual-format.ts` |
| Dates | Habits and Health store literal local calendar days. A time-zone design is in progress in Session N's lane (`time/session-n-2026-10-02`) | [HABITS_V1.md](../product/HABITS_V1.md), [TIMEZONE_DESIGN.md](../product/TIMEZONE_DESIGN.md) |
| Health units | Water in mL or US fl oz; weight in kg or lb; measurements in cm or in; energy in kcal only (no kJ) | `apps/web/components/health/daily-tools.tsx`, `apps/web/lib/health.ts` |
| Currencies | Portfolios are USD or EUR, "the currencies the quote path serves"; totals never mix currencies | [PORTFOLIO_V1.md](../product/PORTFOLIO_V1.md) |
| Distribution | A web app at alpha.zigoals.app with a PWA manifest. No service worker, no push, no app-store listing | [STATUS.md](../STATUS.md), Session L Part 7 |
| Support language | English (Help, the friends guide, contact@zigoals.app) | `apps/web/components/help/help-page.tsx`, [FRIENDS_GUIDE.md](../friends-alpha/FRIENDS_GUIDE.md) |

## 2. Which languages and regions matter
### 2.1 Store reach
| | Apple App Store | Google Play |
|---|---|---|
| Countries and regions | **175** ([App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store/)). It notes an app may be unavailable somewhere for legal or regulatory reasons | Paid apps and in-app purchases are sold to users in **143 countries** ([Google Play Help, paid app availability](https://support.google.com/googleplay/answer/143779?hl=en)). Free distribution has its own table ([supported locations](https://play.google.com/supported-locations?hl=en), not machine-readable here) |
| Store languages | **50** product-page localizations ([App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations); [Apple localization page](https://developer.apple.com/localization/)) | Store listings can be translated into a long list of languages ([supported languages](https://support.google.com/googleplay/android-developer/table/4419860?hl=en)). Google offers machine and paid human translation in Play Console ([translate and localize your app](https://support.google.com/googleplay/android-developer/answer/9844778?hl=en)) |
| Mainland China | Some apps need a MIIT ICP filing number to be available there ([App information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)) | Not in the paid-app country list |
| Scale signal | Apple says the App Store had more than 850 million average weekly users in 175 countries and regions in 2025. Its ecosystem study (Analysis Group, commissioned by Apple) puts digital goods and services at USD 149 billion ([Apple newsroom, June 2026](https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/), company claim) | No comparable official figure was read |

### 2.2 The home market: Belgium (and the Netherlands)
- **Belgium:**
  - official languages Dutch, French and German;
  - the euro;
  - 11,900,123 inhabitants (2025, Eurostat), per the [EU country profile](https://european-union.europa.eu/principles-countries-history/eu-countries/belgium_en).
  - The federal portal's language page answered with a CAPTCHA and was not read (blocked).
- **The Netherlands** shares Dutch and the euro, so Dutch localization serves both markets. Formats differ, though (§3).
- **Store availability seen from Belgium:**
  - Monarch, Copilot, Rocket Money and Emma are not on the Belgian App Store.
  - Finary, getquin, CoinStats, Zerion, Delta (sold by a Belgian company) and YNAB (priced 15,49 € and 119,00 € there) are on it ([MARKET_LANDSCAPE §4](MARKET_LANDSCAPE.md#4-personal-wealth-net-worth-budgets-and-crypto-portfolios)).
  - Apple's EU fee terms (from 2026-10-01) apply to Belgian sales ([MONETIZATION_OPTIONS §2.1](MONETIZATION_OPTIONS.md#21-apple-app-store)).
- **Supervisors relevant to the flags in §5:**
  - the FSMA (financial services and crypto advertising);
  - the Belgian Data Protection Authority (GBA/APD), at <https://www.gegevensbeschermingsautoriteit.be/> and <https://www.autoriteprotectiondonnees.be/>.

### 2.3 Languages across the EU
From Special Eurobarometer 540 ([Commission press release, 21 May 2024](https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_24_2686/IP_24_2686_EN.pdf); [survey page](https://europa.eu/eurobarometer/surveys/detail/2979)):
- The EU has 24 official languages.
- 59% of Europeans can hold a conversation in at least one foreign language.
- English is spoken as a foreign language by **47%**, then French by **11%**, German by **10%** and Spanish by **7%**.
- **What it means for planning:** English reaches about half of EU adults as a second language. Health and money are personal topics where people may prefer their mother tongue. The survey does not measure that preference (unknown).

### 2.4 What the category leaders already cover
These are the language counts on the US App Store listings of the 36 store-listed apps in [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md), read 2026-10-03. Each app's list and source are there. Kubera has no store app, and Loop is not on the App Store.

| Pillar (apps) | Median number of App Store languages (range) | With Dutch | With French | With German | English only |
|---|---|---|---|---|---|
| Health and nutrition (9) | 14 (1–23) | 5 | 6 | 7 | Cronometer |
| Habits (7) | 19 (1–40) | 4 | 6 | 6 | Finch |
| Goals and planning (8) | 23.5 (9–41) | 6 | 8 | 8 | none |
| Wealth and crypto (12) | 1.5 (1–18) | 3 (CoinStats, Delta, Zerion) | 4 | 5 | YNAB, Monarch, Copilot, Rocket Money, Emma, CoinTracker |
| **All 36** | | **18** | **24** | **26** | **8** |

**What it means:**
- **Planning and habit apps compete in the local language almost everywhere.** All 8 planners support French and German; TickTick lists 41 languages and Habitify 40.
- **Wealth apps are mostly English-only.** Of the 12, only CoinStats, Delta and Zerion support Dutch. Finary (French, German) and getquin (German) are the EU-native exceptions.
- So a Dutch- and French-speaking wealth experience would be rare among these apps, while in Health, Habits and Goals it is table stakes.
- **Right-to-left languages:** Arabic appears in 10 of the 36, mostly planners and habit apps.

### 2.5 Where crypto use is concentrated (company research)
Chainalysis' 2026 Global Crypto Adoption Index ([published 2026-09-23](https://www.chainalysis.com/blog/2026-global-crypto-adoption-index/)) ranks, in order:
1. Brazil
2. the United States
3. Nigeria
4. Japan
5. South Korea
6. India
7. Ukraine
8. Thailand
9. South Africa
10. Canada
11. Mexico
12. China
13. Germany
14. Indonesia
15. Australia
16. Russia
17. the United Kingdom
18. Viet Nam
19. the Philippines
20. Türkiye

This is the analytics firm's own composite of four sub-indexes, not an official statistic. It is useful as a signal for where ZIGChain-linked Wealth features may resonate. Several of these markets also have the strictest crypto promotion or licensing rules (§5).

### 2.6 Where Health, Habits, Goals and Wealth apps are used
**Unknown from official sources.** No public, official, country-level usage statistic for these app categories was found. The detailed market-intelligence data sits behind logins or paywalls (Sensor Tower, Statista), and data.ai was bot-walled.
- **Reachable proxies:**
  - the languages and storefronts the leaders support (§2.4);
  - once ZIGoals is in the stores, App Store Connect and Play Console aggregate analytics, which need no in-app tracking.

## 3. Currencies, formats, units and time zones
**Reference sources:**
- currency codes: ISO 4217, maintained by SIX ([SIX data standards](https://www.six-group.com/en/products-services/financial-information/data-standards.html); iso.org answered with a bot challenge, blocked);
- locale data: the Unicode CLDR ([CLDR](https://cldr.unicode.org/), [territory information](https://www.unicode.org/cldr/charts/latest/supplemental/territory_information.html));
- time zones: the IANA Time Zone Database ([IANA](https://www.iana.org/time-zones)).

**How the same values look per locale.** Computed in this sandbox with Node 22.22.0, ICU 77.1, CLDR 47.0 and tz 2025b. Browsers ship their own CLDR versions, so details can differ slightly.

| Locale | 1234567.89 | EUR 1234.5 | 3 Oct 2026 (short) | Week starts | Clock | Direction |
|---|---|---|---|---|---|---|
| en-US | 1,234,567.89 | €1,234.50 | 10/3/26 | Sunday | 12 h | LTR |
| en-GB | 1,234,567.89 | €1,234.50 | 03/10/2026 | Monday | 24 h | LTR |
| nl-BE | 1.234.567,89 | € 1.234,50 | 3/10/2026 | Monday | 24 h | LTR |
| fr-BE | 1 234 567,89 | 1 234,50 € | 3/10/26 | Monday | 24 h | LTR |
| de-BE | 1.234.567,89 | 1.234,50 € | 03.10.26 | Monday | 24 h | LTR |
| nl-NL | 1.234.567,89 | € 1.234,50 | 03-10-2026 | Monday | 24 h | LTR |
| de-DE | 1.234.567,89 | 1.234,50 € | 03.10.26 | Monday | 24 h | LTR |
| fr-FR | 1 234 567,89 | 1 234,50 € | 03/10/2026 | Monday | 24 h | LTR |
| es-ES | 1.234.567,89 | 1234,50 € | 3/10/26 | Monday | 24 h | LTR |
| pt-BR | 1.234.567,89 | € 1.234,50 | 03/10/2026 | Sunday | 24 h | LTR |
| ja-JP | 1,234,567.89 | €1,234.50 | 2026/10/03 | Sunday | 24 h | LTR |
| hi-IN / en-IN | 12,34,567.89 | €1,234.50 | 3/10/26 · 03/10/26 | Sunday | 12 h | LTR |
| tr-TR | 1.234.567,89 | €1.234,50 | 3.10.2026 | Monday | 24 h | LTR |
| ar-EG | Arabic-Indic digits | (RTL) | (RTL) | Saturday | 12 h | **RTL** |

**What this means for ZIGoals:**
- **Number display already follows the locale.** Number *entry* also has to accept the local decimal comma. Habits and Health already handle it (tests `health-decimal-comma` and `habits-decimal-comma`). Every new input will need the same.
- **Week start matters** for weekly consistency, the habit "this week" views and charts. Today's weekly consistency runs from Monday ([HABITS_V1.md](../product/HABITS_V1.md)), while many locales start on Sunday or Saturday.
- **Indian digit grouping** (12,34,567.89) and **right-to-left scripts** (Arabic, Hebrew and Urdu are all among Apple's 50 store languages) are not tested in the app today.
- **Food energy units:**
  - EU labels declare nutrition per 100 g or 100 ml ([Commission, nutrition labelling](https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation/nutrition-labelling_en)). The exact rule on stating energy in both kJ and kcal (Annex XV of Regulation (EU) No 1169/2011) could not be read here: **UNVERIFIED**.
  - US labels show "Calories" per serving ([FDA, Nutrition Facts label](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)).
  - ZIGoals shows kcal only today.
- **Currencies:**
  - A net-worth app outside the euro area and the US needs local currencies. Today that is USD and EUR, bounded by the quote provider.
  - The provider's full currency list could not be checked: coingecko.com is bot-walled here (blocked).
- **Time zones:** the in-flight design ([TIMEZONE_DESIGN.md](../product/TIMEZONE_DESIGN.md) and Session N's time branch) is the place for travel and daylight-saving rules. This pack adds nothing to it.

## 4. Store availability and platform rules
- **Store reach:** see §2.1.
- **Crypto features in the stores:**
  - **Google Play.** Its policy for cryptocurrency exchanges and software wallets puts **non-custodial wallets out of scope**. Exchanges and custodial wallets need a licence or registration in the listed jurisdictions: the EU (MiCA CASP), the UK (FCA), the US (FinCEN MSB plus state money transmitter), Japan, South Korea, Thailand, the UAE and others. Liechtenstein, Iceland and Norway join the MiCA list from July 2026 ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/16329703?hl=en)).
  - **Google Play's blockchain-content policy** bars promoting or glamorizing potential earnings from trading ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/16302285?hl=en)).
  - **Apple** has guideline 3.1.5 on cryptocurrencies. See [MONETIZATION_OPTIONS.md](MONETIZATION_OPTIONS.md) for its current text, and LC§5.
- **Health features in the stores:** Apple's health-data rules (HealthKit, guideline 5.1.3) and Google Play's health policies are summarized in [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) (integration facts).
- **Web app (PWA) reach:**
  - It runs wherever a current browser runs, with no store review.
  - On iPhone and iPad, Home Screen web apps can receive Web Push and set a badge since iOS/iPadOS 16.4. The permission must follow a tap ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).
  - Apple documents WidgetKit and HealthKit only as native frameworks (iOS, iPadOS, macOS, watchOS, visionOS), with no web API ([WidgetKit](https://developer.apple.com/documentation/widgetkit), [HealthKit](https://developer.apple.com/documentation/healthkit)). So home-screen widgets and Apple Health need a native app.
  - Early in 2024, Apple announced and then withdrew a plan to drop Home Screen web apps in the EU. Apple's own statement was not found on its pages today, so this is **UNVERIFIED** from an official source. It is a reminder that PWA reach depends on platform policy.

## 5. Regional rules worth a lawyer's look (flags only)
Each row is a question for a lawyer, with the official page to read first. **No row says ZIGoals is or is not compliant.**

### 5.1 Health data
| Region | Rule (read first) | Why it may matter | Flag |
|---|---|---|---|
| EU | GDPR Art. 4(15) and 9, special categories (see LEGAL_CHECKLIST §2) | Meals, weight and measurements may be "data concerning health", even end-to-end encrypted | LC§2 |
| EU | European Health Data Space, Regulation (EU) 2025/327 ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2025/327/oj/eng); [Commission page](https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en)) | Its Art. 49 label is mandatory only for wellness apps that **claim interoperability with health-record (EHR) systems**. The Regulation has been in force since 2025-03-26, and key parts apply from 2029. The date for the wellness label: **UNVERIFIED** | LC-new |
| UK | UK GDPR special category data ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)) | The ICO's examples of health data include data from fitness trackers | LC-new |
| US | FTC Health Breach Notification Rule ([FTC](https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule)) | It covers vendors of personal health records and related entities; amendments were published 2024-05-30. Does a health journal with sync fall in? | LC-new |
| US (Washington) | My Health My Data Act ([WA Attorney General](https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy)) | "Consumer health data" includes inferences. It has consent and deletion rights, and compliance dates in 2024 | LC-new |
| Brazil | LGPD (Lei 13.709/2018). The official text at planalto.gov.br **could not be reached** (blocked) | How it treats sensitive (health) data: **UNVERIFIED** here | LC-new |
| India | The Digital Personal Data Protection Act, 2023. meity.gov.in answered 403 (blocked) | The scope and status of its rules: **UNVERIFIED** here | LC-new |
| Japan, Korea, Canada, Australia | APPI ([PPC](https://www.ppc.go.jp/en/legal/)), PIPA ([PIPC](https://www.pipc.go.kr/eng/user/lgp/law/lawDetail.do)), PIPEDA ([OPC](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/)), the Privacy Act ([OAIC](https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act)) | How each treats health or sensitive information, and cross-border hosting | LC-new |

### 5.2 Crypto availability and promotion
| Region | Rule (read first) | Why it may matter | Flag |
|---|---|---|---|
| EU | MiCA, including its marketing-communication rules ([ESMA MiCA page](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)) | Read-only tracking, staking views and any earn feature (LEGAL_CHECKLIST §3, and Session N's proposed §6) | LC§3, LC§6 |
| Belgium | **FSMA regulation on advertising virtual currencies to consumers** ([FSMA presentation, 2023-04-19](https://www.fsma.be/sites/default/files/media/files/2023-04/20230419_virtualcurrencies.pdf); [FSMA FAQ on MiCA's impact](https://www.fsma.be/en/faq/20-what-impact-mica-regulation)) | <ul><li>**Status:**<ul><li>in force for new adverts since 2023-05-17 (for websites and apps already running, since 2023-06-17);</li><li>since MiCA, it still applies outside MiCA's scope, for example to adverts by non-CASPs such as influencers, and to assets without an identifiable issuer.</li></ul></li><li>**Rules:**<ul><li>no statements about future value or return;</li><li>a mandatory risk warning;</li><li>advance notice to the FSMA for campaigns that reach at least 25,000 consumers, including through an account with at least 25,000 followers.</li></ul></li><li>**Questions for ZIGoals:**<ul><li>Could the in-app **"Buy ZIG" habit template** (a monthly USD target, `habit-editor.tsx`) count as an advert for a specific crypto-asset?</li><li>Do creator or influencer posts about ZIG fall under these rules?</li></ul></li></ul> | LC-new (Belgium) |
| UK | FCA financial promotion rules for cryptoassets ([FCA press release](https://www.fca.org.uk/news/press-releases/fca-introduces-tough-new-rules-marketing-cryptoassets)) | <ul><li>Applies from 2023-10-08, including to firms abroad that market to UK consumers.</li><li>Requires risk warnings.</li><li>Bans refer-a-friend bonuses.</li><li>Requires a cooling-off for first-time investors.</li></ul> | LC-new |
| Singapore | MAS guidelines, 2022-01-17 ([MAS media release](https://www.mas.gov.sg/news/media-releases/2022/mas-issues-guidelines-to-discourage-cryptocurrency-trading-by-general-public)) | Providers of digital payment token services should not promote to the general public (public areas, third-party sites, social media, influencers) | LC-new |
| Japan, Korea, US and others | The licensing lists in Google Play's crypto policy (§4); the Japan FSA ([FSA](https://www.fsa.go.jp/en/)) | Only relevant if ZIGoals ever offers exchange or custodial features, which its principles exclude. Read-only and non-custodial features still need a check for promotion rules | LC-new |
| India | Crypto tax and registration rules; incometaxindia.gov.in and fiuindia.gov.in **could not be reached** | **UNVERIFIED** here | LC-new |

### 5.3 Consumer law and subscriptions
| Region | Rule (read first) | Why it may matter | Flag |
|---|---|---|---|
| EU | The Consumer Rights Directive and the Digital Content Directive (LEGAL_CHECKLIST §5) | The 14-day withdrawal right and its waiver for digital content; conformity and updates | LC§5 |
| EU | **Directive (EU) 2023/2673**, which adds a "withdrawal function" to the Consumer Rights Directive. It entered into application on **2026-06-19**, per the [Commission's Consumer Rights Directive page](https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en) | Does an online "withdraw from contract here" function apply to an app sold on the web or in a store? Its scope beyond financial services is described in an EUR-Lex summary that was behind a bot challenge today: **UNVERIFIED** | LC-new |
| EU | VAT One Stop Shop ([Commission](https://vat-one-stop-shop.ec.europa.eu/index_en)) | Web sales to consumers in other member states; the stores handle VAT for their own sales (MONETIZATION_OPTIONS) | LC§5 |
| UK | DMCC Act 2024, subscription contracts regime. The [government response of 2026-04-02](https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version) expects it to start in **spring 2027** | <ul><li>Pre-contract information.</li><li>Reminder notices before trials end or annual plans renew.</li><li>An online exit for online sign-ups.</li><li>14-day cooling-off periods, including after renewal.</li></ul> | LC-new |
| US | California automatic renewal law ([Bus. & Prof. Code § 17602](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602)); the FTC Negative Option Rule ([FTC page](https://www.ftc.gov/legal-library/browse/rules/negative-option-rule), which lists a March 2026 advance notice of proposed rulemaking) | Auto-renewal disclosures and cancellation. The current federal status of the 2024 "click to cancel" amendments: **UNVERIFIED** | LC-new |
| Japan, Australia | The Consumer Affairs Agency ([CAA](https://www.caa.go.jp/en/)); the ACCC ([ACCC](https://www.accc.gov.au/)) | Online purchase screens and subscription practices | LC-new |
| India | Consumer protection and dark-pattern guidance; consumeraffairs.nic.in **could not be reached** | **UNVERIFIED** here | LC-new |

### 5.4 Children, AI and accessibility
| Region | Rule (read first) | Why it may matter | Flag |
|---|---|---|---|
| US | COPPA ([FTC](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)) | Applies to services aimed at children under 13, or with actual knowledge of them. Amendments were published 2025-04-22. Relevant to family plans or shared goals that include children | LC-new |
| UK | The Children's code ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/)) | The same question for UK users | LC-new |
| Belgium | GDPR Art. 8 age of digital consent. Law-firm summaries say Belgium chose **13** (the Act of 30 July 2018); the official text was not read here: **UNVERIFIED** | Family features with minors | LC-new |
| EU | The AI Act ([Commission timeline](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)) | <ul><li>Transparency duties (for example telling people they are talking to an AI) and general application from **2026-08-02**.</li><li>The AI Omnibus (in force 2026-07-27) moved some high-risk dates to 2027 and 2028.</li><li>Relevant to an AI coach.</li></ul> | LC§4 |
| EU | European Accessibility Act ([Your Europe](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/accessibility/index_en.htm)) | <ul><li>Applies to covered services placed on the market after 2025-06-28; online shops are covered.</li><li>Service providers with fewer than 10 staff and under EUR 2 million turnover are exempt.</li><li>Is ZIGoals' web checkout covered, and does the exemption apply?</li></ul> | LC-new |

## 6. Phased localization: options (no decision)
These options can be mixed. Each one assumes the same groundwork:
- **A way to hold translated strings.** A new library needs owner approval under the "no new dependencies" rule. A small in-house dictionary needs no dependency.
- **The strings pulled out of the components.**
- **Locale-aware input** everywhere.
- **Store listings and screenshots** per language.
- **Help, the friends guide and the privacy notice** per language. The privacy notice needs a lawyer's review per language.

| Option | Languages | Why (evidence) | Effort | Main dependencies and risks |
|---|---|---|---|---|
| **A. Belgium first** | English + Dutch + French; German later | Belgium's three official languages (§2.2). Dutch also serves the Netherlands | M (groundwork) + S per language | <ul><li>The groundwork above.</li><li>Every health or money sentence must stay non-advice in each language, so a lawyer reviews the key screens.</li><li>kJ display is worth considering (§3)</li></ul> |
| **B. EU core** | A + German, Spanish, Italian, Portuguese (PT), Polish | The largest EU languages. Eurobarometer shows that foreign-language knowledge beyond English is limited (§2.3) | A + S per language | <ul><li>More legal review.</li><li>Monday-first weeks are already the default.</li><li>VAT and consumer-law flags per member state (§5.3)</li></ul> |
| **C. Global majors** | B + Spanish (Mexico), Portuguese (Brazil), Japanese, Korean, Simplified Chinese, Hindi, Indonesian, Turkish; Arabic optional | <ul><li>Apple's store languages (§2.1).</li><li>The leaders' coverage (§2.4).</li><li>The crypto-active markets (§2.5)</li></ul> | B + M (RTL, Indian grouping, Sunday-first weeks, more currencies) | <ul><li>Right-to-left layout.</li><li>Local currencies in Wealth.</li><li>The strictest crypto-promotion markets.</li><li>China mainland needs an ICP filing on Apple and has no Play sales</li></ul> |

**Principle fit:**
- ✓ Translations are interface text only. No personal data goes to a translation service (**private**).
- ⚠ Machine-translating anything a person writes would bend **private**, unless it runs on the device.
- Measuring which languages people use, without analytics, needs store analytics or an opt-in question (**private**).

## Blocked or unreachable sources (this document)
Tried once on 2026-10-03; none was bypassed:
- **belgium.be, language page:** a CAPTCHA (<https://www.belgium.be/en/about_belgium/country/languages>).
- **iso.org, ISO 4217 page:** a "Just a moment" challenge (<https://www.iso.org/iso-4217-currency-codes.html>). The SIX maintenance-agency page was used instead.
- **EUR-Lex, HTML text of Directive (EU) 2023/2673:** an AWS WAF challenge (<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023L2673>). The EUR-Lex summary was challenged too. The Commission's Consumer Rights Directive page was used instead.
- **planalto.gov.br, LGPD text:** connection failed (<https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>).
- **meity.gov.in, the data protection framework:** 403 (<https://www.meity.gov.in/data-protection-framework>).
- **Connection failed:**
  - fsc.go.kr (<https://www.fsc.go.kr/eng/>);
  - consumeraffairs.nic.in (<https://www.consumeraffairs.nic.in/>);
  - incometaxindia.gov.in (<https://www.incometaxindia.gov.in/>);
  - fiuindia.gov.in (<https://fiuindia.gov.in/>).
- **coingecko.com:** a bot challenge (<https://www.coingecko.com/>). The quote provider's full currency list is unchecked.
- **Apple's own statement on the 2024 EU Home Screen web-app decision:** not found on Apple's pages (**UNVERIFIED**).

## Sources and access dates
All 62 external sources linked above, in order of first use. "Read" is the access date (UTC); blocked sources show when they were tried.

1. developer.apple.com (App Store Connect Help): <https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store/> (read 2026-10-03)
2. support.google.com (Google Play Help, paid app availability): <https://support.google.com/googleplay/answer/143779?hl=en> (read 2026-10-03)
3. play.google.com (supported locations): <https://play.google.com/supported-locations?hl=en> (read 2026-10-03)
4. developer.apple.com (App Store localizations): <https://developer.apple.com/help/app-store-connect/reference/app-store-localizations> (read 2026-10-03)
5. developer.apple.com (Apple localization page): <https://developer.apple.com/localization/> (read 2026-10-03)
6. support.google.com (supported languages): <https://support.google.com/googleplay/android-developer/table/4419860?hl=en> (read 2026-10-03)
7. support.google.com (translate and localize your app): <https://support.google.com/googleplay/android-developer/answer/9844778?hl=en> (read 2026-10-03)
8. developer.apple.com (App information reference): <https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/> (read 2026-10-03)
9. apple.com (Apple newsroom, June 2026): <https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/> (read 2026-10-03)
10. european-union.europa.eu (EU country profile): <https://european-union.europa.eu/principles-countries-history/eu-countries/belgium_en> (read 2026-10-03)
11. gegevensbeschermingsautoriteit.be: <https://www.gegevensbeschermingsautoriteit.be/> (read 2026-10-03)
12. autoriteprotectiondonnees.be: <https://www.autoriteprotectiondonnees.be/> (read 2026-10-03)
13. ec.europa.eu (Commission press release, 21 May 2024): <https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_24_2686/IP_24_2686_EN.pdf> (read 2026-10-03)
14. europa.eu (survey page): <https://europa.eu/eurobarometer/surveys/detail/2979> (read 2026-10-03)
15. chainalysis.com (published 2026-09-23): <https://www.chainalysis.com/blog/2026-global-crypto-adoption-index/> (read 2026-10-03)
16. six-group.com (SIX data standards): <https://www.six-group.com/en/products-services/financial-information/data-standards.html> (read 2026-10-03)
17. cldr.unicode.org (CLDR): <https://cldr.unicode.org/> (read 2026-10-03)
18. unicode.org (territory information): <https://www.unicode.org/cldr/charts/latest/supplemental/territory_information.html> (read 2026-10-03)
19. iana.org (IANA): <https://www.iana.org/time-zones> (read 2026-10-03)
20. food.ec.europa.eu (Commission, nutrition labelling): <https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation/nutrition-labelling_en> (read 2026-10-03)
21. fda.gov (FDA, Nutrition Facts label): <https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label> (read 2026-10-03)
22. support.google.com (Play Console Help): <https://support.google.com/googleplay/android-developer/answer/16329703?hl=en> (read 2026-10-03)
23. support.google.com (Play Console Help): <https://support.google.com/googleplay/android-developer/answer/16302285?hl=en> (read 2026-10-03)
24. webkit.org (WebKit blog): <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/> (read 2026-10-03)
25. developer.apple.com (WidgetKit): <https://developer.apple.com/documentation/widgetkit> (read 2026-10-03)
26. developer.apple.com (HealthKit): <https://developer.apple.com/documentation/healthkit> (read 2026-10-03)
27. eur-lex.europa.eu (EUR-Lex): <https://eur-lex.europa.eu/eli/reg/2025/327/oj/eng> (read 2026-10-03)
28. health.ec.europa.eu (Commission page): <https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en> (read 2026-10-03)
29. ico.org.uk (ICO): <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/> (read 2026-10-03)
30. ftc.gov (FTC): <https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule> (read 2026-10-03)
31. atg.wa.gov (WA Attorney General): <https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy> (read 2026-10-03)
32. ppc.go.jp (PPC): <https://www.ppc.go.jp/en/legal/> (read 2026-10-03)
33. pipc.go.kr (PIPC): <https://www.pipc.go.kr/eng/user/lgp/law/lawDetail.do> (read 2026-10-03)
34. priv.gc.ca (OPC): <https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/> (read 2026-10-03)
35. oaic.gov.au (OAIC): <https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act> (read 2026-10-03)
36. esma.europa.eu (ESMA MiCA page): <https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica> (read 2026-10-03)
37. fsma.be (FSMA presentation, 2023-04-19): <https://www.fsma.be/sites/default/files/media/files/2023-04/20230419_virtualcurrencies.pdf> (read 2026-10-03)
38. fsma.be (FSMA FAQ on MiCA's impact): <https://www.fsma.be/en/faq/20-what-impact-mica-regulation> (read 2026-10-03)
39. fca.org.uk (FCA press release): <https://www.fca.org.uk/news/press-releases/fca-introduces-tough-new-rules-marketing-cryptoassets> (read 2026-10-03)
40. mas.gov.sg (MAS media release): <https://www.mas.gov.sg/news/media-releases/2022/mas-issues-guidelines-to-discourage-cryptocurrency-trading-by-general-public> (read 2026-10-03)
41. fsa.go.jp (FSA): <https://www.fsa.go.jp/en/> (read 2026-10-03)
42. commission.europa.eu (Commission's Consumer Rights Directive page): <https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en> (read 2026-10-03)
43. vat-one-stop-shop.ec.europa.eu (Commission): <https://vat-one-stop-shop.ec.europa.eu/index_en> (read 2026-10-03)
44. gov.uk (government response of 2026-04-02): <https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version> (read 2026-10-03)
45. leginfo.legislature.ca.gov (Bus. & Prof. Code § 17602): <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602> (read 2026-10-03)
46. ftc.gov (FTC page): <https://www.ftc.gov/legal-library/browse/rules/negative-option-rule> (read 2026-10-03)
47. caa.go.jp (CAA): <https://www.caa.go.jp/en/> (read 2026-10-03)
48. accc.gov.au (ACCC): <https://www.accc.gov.au/> (read 2026-10-03)
49. ftc.gov (FTC): <https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa> (read 2026-10-03)
50. ico.org.uk (ICO): <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/> (read 2026-10-03)
51. digital-strategy.ec.europa.eu (Commission timeline): <https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai> (read 2026-10-03)
52. europa.eu (Your Europe): <https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/accessibility/index_en.htm> (read 2026-10-03)
53. belgium.be: <https://www.belgium.be/en/about_belgium/country/languages> (tried 2026-10-03; blocked or unreachable)
54. iso.org: <https://www.iso.org/iso-4217-currency-codes.html> (tried 2026-10-03; blocked or unreachable)
55. eur-lex.europa.eu: <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023L2673> (tried 2026-10-03; blocked or unreachable)
56. planalto.gov.br: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm> (tried 2026-10-03; blocked or unreachable)
57. meity.gov.in: <https://www.meity.gov.in/data-protection-framework> (tried 2026-10-03; blocked or unreachable)
58. fsc.go.kr: <https://www.fsc.go.kr/eng/> (tried 2026-10-03; blocked or unreachable)
59. consumeraffairs.nic.in: <https://www.consumeraffairs.nic.in/> (tried 2026-10-03; blocked or unreachable)
60. incometaxindia.gov.in: <https://www.incometaxindia.gov.in/> (tried 2026-10-03; blocked or unreachable)
61. fiuindia.gov.in: <https://fiuindia.gov.in/> (tried 2026-10-03; blocked or unreachable)
62. coingecko.com: <https://www.coingecko.com/> (tried 2026-10-03; blocked or unreachable)
