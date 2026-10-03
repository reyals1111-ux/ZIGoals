# Evidence register Legal sources (for LEGAL_CHECKLIST section 6)

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). Official texts and supervisor documents, identified and quoted; no conclusions.

## C-legal-access-route
**VERIFIED** · Legal texts: EUR-Lex blocked; official Publications Office route used

EUR-Lex returned HTTP 202 with 'x-amzn-waf-action: challenge' (empty body) to curl, and WebFetch got an empty page; data.europa.eu ELI redirects there. The same official texts were obtained from the EU Publications Office Cellar (https://publications.europa.eu/resource/celex/&lt;CELEX>, content negotiation) as OJ XHTML/PDF and consolidated XHTML. The Cellar SPARQL endpoint lists the consolidated versions (e.g. MiCA 02023R1114-20230609 and -20240109).

*How:* Headers saved; Cellar downloads and SPARQL results saved with sha256.

- <https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng> · read 2026-10-02T21:21:28Z · SHA-256 of the file as received `7163fa59b318c73329e3120d5a214a8fe2bb1abc2f96d35574337304b36ad120`
  `x-amzn-waf-action: challenge`
- <https://publications.europa.eu/webapi/rdf/sparql> · read 2026-10-02T21:22:41Z · SHA-256 of the response (compact JSON) `5667e73cac8a2a62dc176b5dcecb31a8e44a795a184718c793845eff1f94e843`
  `02023R1114-20240109`

## C-legal-mica
**VERIFIED** · MiCA Regulation (EU) 2023/1114: identification and article titles

Official title: Regulation (EU) 2023/1114 of 31 May 2023 on markets in crypto-assets (OJ L 150, 9.6.2023, p. 40). The latest consolidated version is 09.01.2024 (amended by Reg. (EU) 2023/2869; corrigendum OJ L 90275, 2.5.2024). Titles: III ASSET-REFERENCED TOKENS; IV E-MONEY TOKENS; V AUTHORISATION AND OPERATING CONDITIONS FOR CRYPTO-ASSET SERVICE PROVIDERS. Article titles: 3 Definitions; 7, 29 and 53 Marketing communications; 40 and 50 Prohibition of granting interest; 48 Requirements for the offer to the public or admission to trading of e-money tokens; 59 Authorisation; 61 Provision of crypto-asset services at the exclusive initiative of the client; 66 Obligation to act honestly, fairly and professionally in the best interests of clients; 75 Providing custody and administration of crypto-assets on behalf of clients; 81 Providing advice on crypto-assets and providing portfolio management of crypto-assets; 82 Providing transfer services for crypto-assets on behalf of clients; 143 Transitional measures; 149 Entry into force and application.

*How:* Read the OJ XHTML and the consolidated XHTML from the Publications Office.

- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `REGULATION (EU) 2023/1114 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL of 31 May 2023 on markets in crypto-assets, and amending Regulations (EU) No 1093/2010 and (EU) No 1095/2010 and Directives 2013/36/EU and (EU) 2019/1937`
- <https://publications.europa.eu/resource/celex/02023R1114-20240109> · read 2026-10-02T21:23:39Z · SHA-256 of the XHTML as received `078da6ed766fe117be60ff63536f25101ec21f2dec175394eef7bf82c02ffe19`
  `REGULATION (EU) 2023/2869 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL of 13 December 2023`

## C-legal-mica-defs
**VERIFIED** · MiCA Art. 3(1) definitions relevant to stablecoins and CASP services

Article 3(1) defines among others: (6) asset-referenced token, (7) e-money token, (15) crypto-asset service provider, (16) crypto-asset service (list (a)-(j)), (17) custody and administration, (24) advice, (25) portfolio management, (26) transfer services. Art. 48(2) deems e-money tokens to be electronic money.

*How:* Verbatim from the OJ text.

- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `(7) ‘electronic money token’ or ‘e-money token’ means a type of crypto-asset that purports to maintain a stable value by referencing the value of one official currency;`
- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `(25) ‘providing portfolio management of crypto-assets’ means managing portfolios in accordance with mandates given by clients on a discretionary client-by-client basis where such portfolios include one or more crypto-assets;`
- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `(26) ‘providing transfer services for crypto-assets on behalf of clients’ means providing services of transfer, on behalf of a natural or legal person, of crypto-assets from one distributed ledger address or account to another;`
- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `2. E-money tokens shall be deemed to be electronic money.`

## C-legal-mica-conduct-dates
**VERIFIED** · MiCA Art. 61, 66(2), 143(3), 149 texts

Art. 61(1) covers exclusive-initiative provision by third-country firms. Art. 66(2) requires information that is fair, clear and not misleading, including in marketing communications. Art. 143(3) lets CASPs operating under prior national law continue until 1 July 2026 at the latest. Art. 149: application from 30 December 2024, Titles III and IV from 30 June 2024.

*How:* Verbatim from the OJ text.

- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `2. Crypto-asset service providers shall provide their clients with information that is fair, clear and not misleading, including in marketing communications, which shall be identified as such.`
- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `3. Crypto-asset service providers that provided their services in accordance with applicable law before 30 December 2024, may continue to do so until 1 July 2026 or until they are granted or refused an authorisation pursuant to Article 63, whichever is sooner.`
- <https://publications.europa.eu/resource/celex/32023R1114> · read 2026-10-02T21:21:59Z · SHA-256 of the XHTML as received `c694819af2efbd715735cacf4bb65eade4685f88b30787197658122ff04c26fb`
  `2. This Regulation shall apply from 30 December 2024. 3. By way of derogation from paragraph 2, Titles III and IV shall apply from 30 June 2024.`

## C-legal-esma-interim-register
**VERIFIED** · ESMA MiCA page and interim MiCA register

ESMA's MiCA page publishes the interim MiCA register as five CSV files: OTHER, ARTZZ, EMTWP, CASPS, NCASP under /sites/default/files/2024-12/, updated weekly (Last-Modified 30 Sep 2026 for CASPS, EMTWP, NCASP and OTHER). The page says the CSV register runs until mid-2026, when it is to be moved into ESMA's IT systems.

*How:* Read page and downloaded CSVs today.

- <https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica> · read 2026-10-02T21:26:47Z · SHA-256 of the page as received `594daa4bff7d9b86cec5046b4fd22294063df3112e6732ebbc417b57dd513de2`
  `The interim MiCA register will be available on this MiCA webpage (and on the Databases and Registers webpage ) as a collection of csv files until mid-2026 when it will be formally integrated into ESMA’s IT systems.`
- <https://www.esma.europa.eu/sites/default/files/2024-12/CASPS.csv> · read 2026-10-02T21:26:57Z · SHA-256 of the CSV as received `73d0dd02ff9e0181e51e528ab4a19b7aae8a2c207345b3bc264274103f0bd164`

## C-legal-esma-qa2404-stmt6099
**VERIFIED** · Non-MiCA-compliant ARTs/EMTs: Commission Q&A 2404 and ESMA statement

ESMA_QA_2404 (17/01/2025, answer by the European Commission) says services that amount to offering or admission to trading of ARTs/EMTs that do not comply with Titles III/IV are prohibited since 30 June 2024, and that trading platforms listing such tokens are seeking admission to trading. ESMA statement ESMA75-223375936-6099 (17 January 2025) asks NCAs to ensure compliance by end of Q1 2025.

*How:* Read Q&A page and statement PDF on esma.europa.eu.

- <https://www.esma.europa.eu/publications-data/questions-answers/2404> · read 2026-10-02T21:29:03Z · SHA-256 of the file as received `d0edb0e6722ffa061c498cc4a192dba2e9bcd7c57502edb7b5715bef4e067f2f`
  `Provision of crypto-asset services with respect to ARTs and EMTs that amounts to offering to public or admission to trading in non-compliance with Titles III and IV has been prohibited since 30 June 2024.`
- <https://www.esma.europa.eu/sites/default/files/2025-01/ESMA75-223375936-6099_Statement_on_stablecoins.pdf> · read 2026-10-02T21:30:11Z · SHA-256 of the PDF as received `fb43e6e8216dadabb14d2dae9ab2ebe4d7627590590a3cd5798e18088f5a962b`
  `NCAs should ensure compliance by CASPs regarding non-compliant ARTs or EMTs as soon as possible and no later than the end of Q1 2025.`

## C-legal-esma-staking
**VERIFIED** · ESMA/Commission on staking under MiCA

ESMA_QA_2067 (submitted 09/01/2024; answer 20-06-2024 by the European Commission): MiCA has no staking-specific provisions, but staking services require authorisation for custody and administration under Art. 75. ESMA's response to the Commission's MiCA review consultation (ESMA75-113276571-1721, 30 September 2026) asks for targeted conduct, disclosure and safeguarding rules for CASP staking.

*How:* Read the Q&A page and the PDF on esma.europa.eu.

- <https://www.esma.europa.eu/publications-data/questions-answers/2067> · read 2026-10-02T21:30:51Z · SHA-256 of the file as received `a1320a57df1ec5479d62dd7454a93e5faa8ab8862edb4c0100039b2913a4d787`
  `The provision of staking services therefore requires that the crypto asset staking service provider is authorised under MiCA to provide custody and administration of crypto-assets on behalf of clients, as set out in Article 75 MiCA.`
- <https://www.esma.europa.eu/sites/default/files/2026-09/ESMA75-113276571-1721_Response_to_the_EC_consultation_MiCA_regulation_review.pdf> · read 2026-10-02T21:28:39Z · SHA-256 of the PDF as received `953ff718527e8fce087482336f4e4dbda6b108d524043360621ec6b8ac2bcd89`
  `ESMA invites the Commission to clarify in MiCA that staking services provided by authorised CASPs should be subject to targeted conduct, disclosure and safeguarding requirements, without automatically treating staking as equivalent to lending or investment management.`

## C-legal-esma-copy-trading
**VERIFIED** · ESMA on copy trading (MiFID II briefing; MiCA Q&A)

ESMA35-42-1428 (30 March 2023) is the 'Supervisory Briefing on supervisory expectations in relation to firms offering copy trading services' under MiFID II, covering qualification of the service, marketing, product governance, suitability and inducements. ESMA_QA_2463 (12/03/2025; answer 07-04-2025) says that guidance applies mutatis mutandis to copy trading of crypto-assets under MiCA, for qualifying which service is provided.

*How:* Read the PDF and the Q&A page on esma.europa.eu.

- <https://www.esma.europa.eu/sites/default/files/2023-03/ESMA35-42-1428_Supervisory_Briefing_on_Copy_Trading.pdf> · read 2026-10-02T21:28:39Z · SHA-256 of the PDF as received `fd3b4ddd8e30c3a65d8a3d2d4a3d5f84c7796e45f5a5e7787d42ff514e9ef946`
  `Copy trading refers to a service that involves trading of a client’s assets based on the trades of another trader`
- <https://www.esma.europa.eu/publications-data/questions-answers/2463> · read 2026-10-02T21:36:32Z · SHA-256 of the file as received `b575dea8b568dc7911d9a3ced7195249c44d7bc0176803b6876388fa5c16105a`
  `ESMA considers that the guidance provided under MiFID II in the Q&A and the supervisory briefing referenced above applies, mutatis mutandis , to copy trading services under MiCA but regarding only the qualification of what type of crypto-asset service(s) are provided .`

## C-legal-esma-guidelines
**VERIFIED** · ESMA guidelines relevant to advice and portfolio management (MiCA and MiFID II)

Official ESMA guidelines located: ESMA35-1872330276-2031 (26 March 2025) Guidelines on certain aspects of the suitability requirements and format of the periodic statement for portfolio management activities under MiCA; ESMA35-43-3172 (dated 23 September 2022, published 03/04/2023) Guidelines on certain aspects of the MiFID II suitability requirements; ESMA35-1872330276-1899 Final Report on the guidelines on reverse solicitation under MiCA; ESMA35-1872330276-1936 Final Report on MiCA investor protection guidelines (third package); ESMA75453128700-1323 Final Report on the guidelines on qualification of crypto-assets as financial instruments.

*How:* PDFs downloaded from esma.europa.eu; titles read from the PDFs.

- <https://www.esma.europa.eu/sites/default/files/2025-03/ESMA35-1872330276-2031_Guidelines_on_suitability_and_periodic_statement_MiCA.pdf> · read 2026-10-02T21:36:33Z · SHA-256 of the PDF as received `4be6d2488c52718275b941e6652fe76478a6844351d917b14aed4a9c86a7ac9c`
  `On certain aspects of the suitability requirements and format of the periodic statement for portfolio management activities under the Markets in Crypto Assets Regulation (MiCA)`
- <https://www.esma.europa.eu/sites/default/files/2023-04/ESMA35-43-3172_Guidelines_on_certain_aspects_of_the_MiFID_II_suitability_requirements.pdf> · read 2026-10-02T21:36:59Z · SHA-256 of the PDF as received `84afcd4d0c5da3d1157b011789c63ca66bbd64a2af49e5e57efd335b16c2710b`
  `on certain aspects of the MiFID II suitability requirements`
- <https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf> · read 2026-10-02T21:34:06Z · SHA-256 of the PDF as received `25cbbd878a1b21d31b353e520849de0616763b2cc11eacf9c0381c5cd94bf6fe`

## C-legal-esma-transitional
**VERIFIED** · End of the MiCA transitional periods (ESMA)

ESMA statements ESMA75-453128700-1396 (Dec 2024), ESMA75-113276571-1631 (4 December 2025) and ESMA75-113276571-1679 (17 April 2026). The last says the transitional period expires EU-wide on 1 July 2026, after which unlicensed CASPs must stop serving EU clients. ESMA's grandfathering list gives Belgium 18 months and Latvia 6 months.

*How:* PDFs read on esma.europa.eu.

- <https://www.esma.europa.eu/sites/default/files/2026-04/ESMA75-113276571-1679_Statement_on_the_end_of_transitional_periods_under_MiCA.pdf> · read 2026-10-02T21:33:12Z · SHA-256 of the PDF as received `c80c4565368147b355124171185e13498b11448720c91f0d3caaa2db1bede805`
  `The MiCA transitional period will officially expire across the EU on 1 July 2026. After this date, any entity providing crypto-asset services to EU clients without a MiCA licence will be in breach of EU law and must cease offering such services.`
- <https://www.esma.europa.eu/sites/default/files/2025-12/ESMA75-113276571-1631_Statement_on_end_of_MiCA_transitional_periods.pdf> · read 2026-10-02T21:33:11Z · SHA-256 of the PDF as received `1673a9bf47fb66ed1a6997c9ddb641a653536de4ff893bae5b89c6e19eb37a85`
  `ESMA Statement on MiCA Transitional Measures`
- <https://www.esma.europa.eu/sites/default/files/2024-12/List_of_MiCA_grandfathering_periods_art._143_3.pdf> · read 2026-10-02T21:33:13Z · SHA-256 of the PDF as received `5fe0c01a320bad65ad394b786207ec1dfcce928296f8e08ca75605ea28ded933`
  `Belgium`

## C-legal-esma-finfluencers
**VERIFIED** · ESMA finfluencer factsheet

ESMA's document page 'Finfluencers - tips for responsible promotion' (section Investor protection) links Finfluencers_factsheet_EN.pdf plus national-language versions (2026-01). It tells finfluencers to disclose payment or benefits, and notes that telling people what to invest in can count as investment advice.

*How:* Read the document page and the EN PDF on esma.europa.eu.

- <https://www.esma.europa.eu/document/finfluencers-tips-responsible-promotion> · read 2026-10-02T21:33:38Z · SHA-256 of the page as received `f4911eb878d0da8bc8fd28920882706de16dbd9e0b7e92fa8461672535deedec`
  `Finfluencers factsheet - tips for responsible promotion`
- <https://www.esma.europa.eu/sites/default/files/2026-01/Finfluencers_factsheet_EN.pdf> · read 2026-10-02T21:33:44Z · SHA-256 of the PDF as received `5c715b6ed501d5e0e062e7fdcc8edb80710bb9f71b0d84dd9ea1fc733c11c71b`
  `SAY IF YOU’RE BEING PAID OR OTHERWISE BENEFIT`

## C-legal-eba-emt-psd2
**VERIFIED** · EBA: ART/EMT page and PSD2-MiCA interplay No Action Letter

EBA's 'Asset-referenced and e-money tokens (MiCA)' page links: the statement on the application of MiCAR to ARTs and EMTs; Opinion EBA/Op/2025/08 (10/06/2025) on PSD2/MiCA interplay for CASPs that transact EMTs (transition until 1 March 2026 before PSD2 authorisation is needed); and Opinion EBA/OP/2026/01 (12 February 2026) on supervisory priorities at the end of that transition on 2 March 2026.

*How:* Read the EBA page and both opinion PDFs.

- <https://www.eba.europa.eu/regulation-and-policy/asset-referenced-and-e-money-tokens-mica> · read 2026-10-02T21:32:33Z · SHA-256 of the page as received `3c4d2c5ce51e4df8f84eb057a9d3093e0710fe8c9ad7429e811d6978a4b756cc`
  `Opinion on the interplay between PSD2 and MiCA in relation to crypto-asset service providers that transact electronic money tokens`
- <https://www.eba.europa.eu/sites/default/files/2025-06/e2958c99-a1b0-4b07-9d31-bcba0a28dbe7/Opinion%20on%20the%20interplay%20between%20PSD2%20and%20MiCA.pdf> · read 2026-10-02T21:32:43Z · SHA-256 of the PDF as received `e05e4afba470c5bb706214551e01d7d82bc945a5ebb255f495a8490e942ce00e`
  `NCAs are advised to grant applicants a transition period until 1 March 2026 before the authorisation needs to be held.`
- <https://www.eba.europa.eu/sites/default/files/2026-02/3b8b6f18-ca26-4ce1-83eb-d060276f3301/Opinion%20on%20the%20end%20of%20the%20NAL%20transition%20period.pdf> · read 2026-10-02T21:32:44Z · SHA-256 of the PDF as received `fb8ef48fb015dc179f09adc8f382bb8de17d89c8579a326b131c26be2d4acb0a`
  `By the time the NAL transition period comes to an end on 2 March 2026, three scenarios may`

## C-legal-psd2
**VERIFIED** · PSD2 Directive (EU) 2015/2366

Official title: Directive (EU) 2015/2366 of 25 November 2015 on payment services in the internal market (OJ L 337/35, 23.12.2015). Latest consolidated version 17.01.2025 (amended by Directive (EU) 2022/2556 and Regulation (EU) 2024/886). Relevant: Art. 3 Exclusions; Art. 4 Definitions (point 25 'funds'); Art. 11 Granting of authorisation; Art. 32 Conditions; Art. 37 Prohibition of persons other than payment service providers from providing payment services and duty of notification; Annex I PAYMENT SERVICES.

*How:* Read OJ text and consolidated XHTML from the Publications Office.

- <https://publications.europa.eu/resource/celex/32015L2366> · read 2026-10-02T21:24:11Z · SHA-256 of the PDF as received `adb1a81b9cecaf8caba510cf4c84b93bf607c7ccef6475777e981c957fae851b`
  `(25) ‘funds’ means banknotes and coins, scriptural money or electronic money as defined in point (2) of Article 2 of Directive 2009/110/EC;`
- <https://publications.europa.eu/resource/celex/02015L2366-20250117> · read 2026-10-02T21:24:26Z · SHA-256 of the XHTML as received `cd9882351bdedca5267cc18cd2619c1529f8d5cdd6a567438b46675593dc9de6`

## C-legal-psd3-psr-status
**VERIFIED** · PSD3 / PSR legislative status

EP Legislative Observatory: 2023/0210(COD) 'Payment services in the internal market' (PSR) and 2023/0209(COD) 'Payment services and electronic money services in the Internal Market' (PSD3). Both show stage 'Awaiting Council's 1st reading position', with key event 05/05/2026 'Approval in committee of the text agreed at early 2nd reading interinstitutional negotiations' (PE787.675 / PE787.673) and a forecast 14/12/2026 'Indicative plenary sitting date, 1st reading'. A Cellar SPARQL query found no 2025-2026 OJ act with 'payment services' in its English title.

*How:* Read OEIL procedure files and ran the SPARQL query today. Not adopted as of 2026-10-02 per these sources.

- <https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2023/0210(COD)> · read 2026-10-02T21:26:17Z · SHA-256 of the page as received `58f0a1947b47f71a4507616f3b7259082be67c0b8f1900b38d4d22114c480043`
  `Awaiting Council's 1st reading position`
- <https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2023/0209(COD)> · read 2026-10-02T21:26:19Z · SHA-256 of the page as received `7d0bd48bbe7b686f68b994dfb325056a56cd6a4b4e82db8481992968a43bd21b`
  `Approval in committee of the text agreed at early 2nd reading interinstitutional negotiations`
- <https://publications.europa.eu/webapi/rdf/sparql> · read 2026-10-02T21:25:47Z · SHA-256 of the response (compact JSON) `457e6b101d7c1cfb576281bd58eb6601e4cc55faaca8037e28395b60a2f93a84`

## C-legal-mifid2
**VERIFIED** · MiFID II Directive 2014/65/EU: Art. 4(1) and Annex I

Consolidated text 06.06.2026 (latest listed via SPARQL). Art. 4(1): (2) investment services and activities (Annex I Section A), (4) investment advice, (8) portfolio management, (9) client. Annex I Section A lists (1) reception and transmission of orders, (2) execution of orders, (3) dealing on own account, (4) portfolio management, (5) investment advice, (6)-(9).

*How:* Read consolidated XHTML from the Publications Office (consolidated PDF returned 404).

- <https://publications.europa.eu/resource/celex/02014L0065-20260606> · read 2026-10-02T21:23:42Z · SHA-256 of the XHTML as received `34dcb50027069dd9c63573a240afaf3cb863b79eb137f4cc65553925676bbf6e`
  `(4) ‘investment advice’ means the provision of personal recommendations to a client, either upon its request or at the initiative of the investment firm, in respect of one or more transactions relating to financial instruments;`
- <https://publications.europa.eu/resource/celex/02014L0065-20260606> · read 2026-10-02T21:23:42Z · SHA-256 of the XHTML as received `34dcb50027069dd9c63573a240afaf3cb863b79eb137f4cc65553925676bbf6e`
  `(9) ‘client’ means any natural or legal person to whom an investment firm provides investment or ancillary services;`

## C-legal-tfr
**VERIFIED** · Transfer of Funds Regulation (EU) 2023/1113 (crypto travel rule) and EBA guidelines

Regulation (EU) 2023/1113 of 31 May 2023 on information accompanying transfers of funds and certain crypto-assets (recast), OJ L 150/1, 9.6.2023. Art. 14 'Information accompanying transfers of crypto-assets' includes self-hosted-address rules for amounts over EUR 1 000. Art. 40: applies from 30 December 2024. EBA/GL/2024/11 Travel Rule Guidelines (04/07/2024) also apply from 30 December 2024.

*How:* Read OJ text and EBA PDF.

- <https://publications.europa.eu/resource/celex/32023R1113> · read 2026-10-02T21:24:13Z · SHA-256 of the PDF as received `d7502c011527b67c3e12a221ad74afd6adaf7b2f93171e0f52d101dadbf25527`
  `in the case of a transfer of an amount exceeding EUR 1 000 to a self-hosted address, the crypto-asset service provider of the originator shall take adequate measures to assess whether that address is owned or controlled by the originator.`
- <https://www.eba.europa.eu/sites/default/files/2024-07/6de6e9b9-0ed9-49cd-985d-c0834b5b4356/Travel%20Rule%20Guidelines.pdf> · read 2026-10-02T21:37:26Z · SHA-256 of the PDF as received `5eb87b245254aeca123df25f7fa569a3ca314a5cb9a1d00cabbd981d3045efff`
  `These Guidelines apply from 30 December 2024.`

## C-legal-amlr-amld6
**VERIFIED** · AML package: AMLR (EU) 2024/1624 and AMLD6 (EU) 2024/1640

Regulation (EU) 2024/1624 of 31 May 2024 on the prevention of the use of the financial system for money laundering or terrorist financing. Art. 2(1)(6)(i) lists 'a crypto-asset service provider' as a financial institution; Art. 3(2) makes financial institutions obliged entities. Art. 90: applies from 10 July 2027 (10 July 2029 for Art. 3(3)(n),(o)). Directive (EU) 2024/1640 of 31 May 2024 covers Member State AML/CFT mechanisms.

*How:* Read OJ texts from the Publications Office.

- <https://publications.europa.eu/resource/celex/32024R1624> · read 2026-10-02T21:24:15Z · SHA-256 of the PDF as received `c4024f4c4c1616cc729ed4ec4333274d711324efa9750d3d531bf90770ed8eb6`
  `It shall apply from 10 July 2027, except in relation to obliged entities referred to in Article 3, points (3)(n) and (o), to which it shall apply from 10 July 2029.`
- <https://publications.europa.eu/resource/celex/32024L1640> · read 2026-10-02T21:24:21Z · SHA-256 of the XHTML as received `184b35caab8c30f7cb9449d12756aeaaf6c5c7c03784da09df6d7fcb688000dd`
  `on the mechanisms to be put in place by Member States for the prevention of the use of the financial system for the purposes of money laundering or terrorist financing`

## C-legal-ucpd
**VERIFIED** · Unfair Commercial Practices Directive 2005/29/EC

Directive 2005/29/EC of 11 May 2005 concerning unfair business-to-consumer commercial practices in the internal market (OJ L 149/22, 11.6.2005). Consolidated version 27.09.2026 (amended by Directives (EU) 2019/2161 and 2024/825). Relevant: Art. 5 Prohibition of unfair commercial practices; Art. 6 Misleading actions; Art. 7 Misleading omissions; Art. 8 Aggressive commercial practices; Annex I Commercial practices which are in all circumstances considered unfair.

*How:* Read OJ text and consolidated XHTML.

- <https://publications.europa.eu/resource/celex/32005L0029> · read 2026-10-02T21:24:18Z · SHA-256 of the PDF as received `f336b1669453381ca6a55f1185159cff6fd114eae0bddebe6f7db3770689b2ef`
  `concerning unfair business-to-consumer commercial practices in the internal market`
- <https://publications.europa.eu/resource/celex/02005L0029-20260927> · read 2026-10-02T21:24:23Z · SHA-256 of the XHTML as received `1ebbb7b9f2c7c7712b0c3bd19f4319cb5a52ac9514dc008bd34084c550f77138`
  `DIRECTIVE (EU) 2024/825 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL of 28 February 2024`

## C-legal-dmfsd
**VERIFIED** · Distance marketing of financial services: Directive (EU) 2023/2673

Directive (EU) 2023/2673 of 22 November 2023 amends Directive 2011/83/EU on financial services contracts concluded at a distance and repeals Directive 2002/65/EC. Transposition by 19 December 2025; measures apply from 19 June 2026. The consolidated Directive 2011/83/EU (27.09.2026) contains Art. 16a Information requirements for distance contracts for consumer financial services, 16b Right of withdrawal, 16c Payment of the service provided before withdrawal, 16d Adequate explanations, 16e Additional protection regarding online interfaces.

*How:* Read OJ text and consolidated CRD XHTML.

- <https://publications.europa.eu/resource/celex/32023L2673> · read 2026-10-02T21:24:19Z · SHA-256 of the PDF as received `898b8a550b49c7cfe4b0c059bdeef855f8aaa3285ad0a6f6bc25efdf9eb64537`
  `Member States shall adopt and publish by 19 December 2025 at the latest, the laws, regulations and administrative provisions necessary to comply with this Directive.`
- <https://publications.europa.eu/resource/celex/32023L2673> · read 2026-10-02T21:24:19Z · SHA-256 of the PDF as received `898b8a550b49c7cfe4b0c059bdeef855f8aaa3285ad0a6f6bc25efdf9eb64537`
  `They shall apply those measures from 19 June 2026.`
- <https://publications.europa.eu/resource/celex/02011L0083-20260927> · read 2026-10-02T21:24:25Z · SHA-256 of the XHTML as received `442fb8e2f0e8e5e1f81e84e25969eff1c49e1613986140064f3b3f7f988d19ab`
  `Article 16e Additional protection regarding online interfaces`

## C-legal-fsma-advertising
**VERIFIED** · Belgian FSMA rules on advertising virtual currencies

The official FSMA instrument is the 'Regulation of the Financial Services and Markets Authority placing restrictive conditions on the distribution of virtual currencies to consumers' of 5 January 2023, approved by Royal Decree of 8 February 2023 (Belgian Official Gazette 17 March 2023), in force 17 May 2023; no 2024 FSMA advertising regulation was found. Articles: 1 Subject and scope, 2 Definitions (mass media campaign = at least 25,000 consumers), 3 Rules governing content, 4 Mandatory information, 5 Supervision by the FSMA, 6 Entry into force. FSMA FAQ: influencers paid even sporadically are in scope; contracts with influencers must be retained; ads within MiCA's scope are governed by MiCA, not the Regulation.

*How:* Read FSMA press release, FAQ and the regulation PDF (FSMA notes the English text is an unofficial translation).

- <https://www.fsma.be/en/news/new-rules-advertisements-virtual-currencies-enter-force> · read 2026-10-02T21:31:01Z · SHA-256 of the page as received `a2684726d63949352acf7ca22cf2cffec9b55d0c41ad7059a14cc5382257275a`
  `The FSMA has issued a Regulation governing the distribution of virtual currencies to consumers. This Regulation was approved by Royal Decree of 8 February 2023 (Belgian Official Gazette of 17 March 2023). It entered into force this Wednesday, 17 May 2023.`
- <https://www.fsma.be/sites/default/files/media/files/2023-03/reglem_05-01-2023_en.pdf> · read 2026-10-02T21:31:37Z · SHA-256 of the PDF as received `9f8a13ed4cbd989df2474227084e73bf3587b6de868398ca397d85af38240470`
  `2° mass media campaign: the dissemination of advertisements to at least 25,000 consumers.`
- <https://www.fsma.be/en/faq/faq-about-crypto> · read 2026-10-02T21:31:04Z · SHA-256 of the page as received `ea7191b93dfd0e295300edcb5d9ba487f3e22ddca1dddf74ca89dcd928804b3b`
  `Advertisements that are disseminated when distributing virtual currencies to consumers in Belgium and that also fall within the scope of MiCA are now regulated by the provisions of MiCA and not by the Regulation.`
- <https://www.fsma.be/en/faq/faq-about-crypto> · read 2026-10-02T21:31:04Z · SHA-256 of the page as received `ea7191b93dfd0e295300edcb5d9ba487f3e22ddca1dddf74ca89dcd928804b3b`
  `An influencer who only sporadically advertises a virtual currency in return for remuneration falls within the scope of the Regulation.`

## C-legal-fsma-casp
**VERIFIED** · FSMA CASP page (Belgium, MiCA)

The FSMA CASP page describes the MiCA transitional regime ending at the latest on 1 July 2026 and says the FSMA granted no registrations under the pre-MiCA national rules (Royal Decree of 8 February 2022). It lists the 'Law of 11 December 2025 implementing Regulation (EU) 2023/1114'.

*How:* Read on fsma.be today.

- <https://www.fsma.be/en/crypto-asset-service-provider-casp> · read 2026-10-02T21:31:41Z · SHA-256 of the page as received `4b507615673c682c92874279716200dbd19e0ac82b84668eda12735248a286ac`
  `Note that in Belgium, the FSMA did not grant any registrations under the national rules that were in force prior to MiCA (Royal Decree of 8 February 2022).`
- <https://www.fsma.be/en/crypto-asset-service-provider-casp> · read 2026-10-02T21:31:41Z · SHA-256 of the page as received `4b507615673c682c92874279716200dbd19e0ac82b84668eda12735248a286ac`
  `Under the transitional regime, CASP that provided their services in accordance with the national law of an EU Member State before 30 December 2024 may continue to provide the same services in that Member State until 1 July 2026`

## C-legal-fca-uk
**VERIFIED** · UK FCA reference: cryptoasset promotions, incentives, affiliates

FCA PS23/6 'Financial promotion rules for cryptoassets' (June 2023; rules expected to take effect 8 October 2023) bans incentives to invest such as 'refer a friend' or new-joiner bonuses for high-risk investments. FG23/3 (November 2023) is the finalised non-Handbook guidance on cryptoasset financial promotions. FG24/1 (March 2024) on social media promotions says firms must take responsibility for how affiliate marketers such as influencers communicate promotions.

*How:* PDFs downloaded from fca.org.uk and read. UK reference only, not EU law.

- <https://www.fca.org.uk/publication/policy/ps23-6.pdf> · read 2026-10-02T21:32:01Z · SHA-256 of the PDF as received `deee7c781636cff90edd3c2eb7ae5e3614db0017bc2f2e77369af28e156b0304`
  `In CP22/2 we proposed to ban financial promotions for high-risk investments from offering any monetary or non-monetary benefits that incentivise investment activity, such as ‘refer a friend’ or new joiner bonuses.`
- <https://www.fca.org.uk/publication/finalised-guidance/fg24-1.pdf> · read 2026-10-02T21:32:04Z · SHA-256 of the PDF as received `0fd2b6e971d613e0df1af24866626b777d91956f802023bb2d92481e88523d69`
  `Firms working with affiliate marketers, such as influencers, should take proactive responsibility for how their affiliates communicate financial promotions.`
- <https://www.fca.org.uk/publication/finalised-guidance/fg23-3.pdf> · read 2026-10-02T21:32:05Z · SHA-256 of the PDF as received `4e2315e55bb85aec91d86574b1390d936d8721b8a093facd1dc125fc03565d56`
  `Finalised non-handbook guidance on Cryptoasset Financial Promotions`
