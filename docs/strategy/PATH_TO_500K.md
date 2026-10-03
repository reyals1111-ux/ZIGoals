# Path to 500,000 sales: scenario maths (research, 2026-10-03)

> **Scenarios, never promises or forecasts.**
> - Every input is either a sourced benchmark from other apps or an **assumption** labelled as such, with its reason.
> - **Pricing is NOT decided.** COST_MODEL.md once noted 4.99 as an early idea, not a working or chosen price. No price is used here. Where revenue appears, it is another app's benchmark, used only to test whether paid acquisition can pay for itself.
> - Benchmarks were read on 2026-10-03 from public, first-party pages. They describe other apps, mostly subscription apps, and not ZIGoals.

**Part of the [strategy pack](README.md).** Benchmarks come from [MONETIZATION_OPTIONS §5](MONETIZATION_OPTIONS.md#5-benchmarks-that-inform-any-choice) and [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md).

## Summary in plain words
- **The pace:** 500,000 sales means about **457 a day for 3 years** after the release (targeted for 2027-02-18), or **274 a day for 5 years**.
- **Conversion decides almost everything.** The people needed equals 500,000 ÷ the share who buy:
  - 25 million at 2%;
  - 12.5 million at 4%;
  - 6.25 million at 8%.
- **That is more people than Belgium has** (11.9 million), so only multi-country, multi-language reach can get there.
  - It is still a small slice of the category: Health & Fitness apps had 3.96 billion downloads worldwide in 2025 (Sensor Tower).
- **Buying installs does not pay for itself at benchmark values.** At published cost per install (Health & Fitness USD 2.50 globally, USD 4.54 in the US) and benchmark first-year revenue per payer (USD 23–36), paid ads don't pay back within a year.
  - So growth has to come mostly from **store search, word of mouth, referrals and featuring**.
  - AppsFlyer reports that 70% of non-gaming subscription revenue comes from organic installs.
- **The strongest levers, in order:**
  1. **Conversion:** doubling it halves the people needed.
  2. **Steady growth in new people:** 2% a month instead of flat cuts the starting volume needed by about half.
  3. **Store presence:** about 65% of App Store downloads follow a search.
  4. **Retention,** which feeds referrals.
  5. **Languages.**

## 1. Definitions and horizon
- **A "sale"** here is **the first paid purchase by a unique person**: a one-time unlock or the first payment of a subscription. Renewals are not counted again.
  - **Other readings:** counting every paid transaction, renewals included, or counting each paid seat in a family plan.
  - **Either would lower the number of people needed.** By how much depends on the model, which is not decided.
- **Horizon:** from the release, targeted (not fixed) for 2027-02-18:
  - **3 years**, to 2030-02;
  - **5 years**, to 2032-02.
  - Alpha and Beta sales are not counted (pricing undecided).

| Horizon | Sales per month | Sales per day |
|---|---|---|
| 3 years (36 months) | 13,889 | 457 |
| 5 years (60 months) | 8,333 | 274 |

## 2. The core equation
**Sales = new people × the share who buy (c).** So the new people needed = 500,000 ÷ c.

| c (share of new people who ever buy) | New people needed | Benchmark that looks like it |
|---|---|---|
| 1% | 50,000,000 | — |
| 2% | 25,000,000 | <ul><li>RevenueCat: freemium median 2.1% within 35 days.</li><li>Western Europe 2.0%</li></ul> |
| 2.9% | 17,241,379 | RevenueCat: Health & Fitness median within 35 days |
| 4% | 12,500,000 | Between the Health & Fitness median and its top quartile (above 6.2%) |
| 6.2% | 8,064,516 | RevenueCat: Health & Fitness top-quartile threshold |
| 8% | 6,250,000 | — |
| 9% | 5,555,556 | Duolingo's paid subscribers per monthly active user, Q2 2026: 12.7M ÷ 140.6M ≈ 9.0% (a best-in-class freemium app in education, at scale) |
| 10.7% | 4,672,897 | RevenueCat: hard-paywall median within 35 days. Hard paywalls usually mean fewer downloads |

## 3. Benchmarks used (sourced)
| Benchmark | Value | Source (read 2026-10-03) |
|---|---|---|
| Downloads that pay within 35 days | Hard paywall 10.7% vs freemium 2.1% (all categories); **Health & Fitness 2.9%** (top quartile above 6.2%); Western Europe 2.0% | [RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/) |
| Trials | Health & Fitness: 6.9% of downloads start a trial; 37.7% of trials convert | RevenueCat (as above) |
| Users with an in-app purchase within 30 days of install | <ul><li>**Health & Fitness 4.83% globally (5.47% US).**</li><li>Finance 7.09%; Utility & Productivity 3.90%; Lifestyle 8.91% (Q1 2026)</li></ul> | AppsFlyer benchmarks, e.g. [Health & Fitness, global](https://www.appsflyer.com/benchmarks/health___fitness/health___fitness___overall/health___fitness___overall/global/overall/) |
| Non-gaming installers buying within 30 days | **9.84%** one-time buyers; 4.64% repeat buyers (Jan 2025–Mar 2026) | [AppsFlyer, State of App Monetization 2026](https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/) |
| Paid subscribers vs monthly users at a freemium leader | Duolingo, Q2 2026: 12.7M paid subscribers; 140.6M monthly active users | [Duolingo shareholder letter, Q2 2026](https://investors.duolingo.com/static-files/3c8277ee-bc94-4f5d-9b77-0db3e46f88b8) |
| Retention after 1 / 7 / 30 days (Q2 2026, global) | <ul><li>**Health & Fitness 19.8% / 8.5% / 3.1%.**</li><li>Finance 22.3% / 10.6% / 4.6%.</li><li>Utility & Productivity 15.7% / 5.9% / 2.4%.</li><li>Calendar & Reminders 24.6% / 12.6% / 5.7%.</li><li>Weight-loss and calorie trackers 29.7% / 13.3% / 4.5%</li></ul> | AppsFlyer benchmarks (as above; [methodology](https://www.appsflyer.com/benchmarks/faq/)) |
| Cost per install, blended (Q2 2026) | <ul><li>**Health & Fitness:** USD 2.50 global, **4.54 US**.</li><li>**Finance:** 3.29 global, 7.10 US.</li><li>**Utility & Productivity:** 0.51 global, 3.05 US.</li><li>**Lifestyle:** 1.47 global, 7.40 US</li></ul> | AppsFlyer benchmarks (as above) |
| Organic share of non-gaming subscription revenue | **70%** globally (Jan 2025–Mar 2026) | AppsFlyer, State of App Monetization 2026 |
| App Store downloads directly after a search | **Almost 65%** (Apple, 2022 data); 70% of visitors use search | [Apple Ads](https://ads.apple.com/app-store) |
| Weekly App Store visitors | Over 850 million (Apple) | [Apple Ads](https://ads.apple.com/app-store); [Apple newsroom](https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/) |
| First-year revenue per payer | North America USD 32; **Western Europe USD 25**; global USD 23; Health & Fitness yearly USD 35.64 | RevenueCat (as above) |
| Annual subscriptions still active after a year | 28% | RevenueCat (as above) |
| The category's size | Health & Fitness: 3.96 billion downloads in 2025 (+0.8%); in-app purchase revenue USD 4.5 billion (+13%) | [Sensor Tower blog](https://sensortower.com/blog/health-and-fitness-apps-ai) |
| Belgium's population | 11,900,123 (2025, Eurostat) | [EU country profile](https://european-union.europa.eu/principles-countries-history/eu-countries/belgium_en) |
| ZIGChain community size | **Unknown**: no figure on the official site (zigchain.com, read 2026-10-03) | [zigchain.com](https://zigchain.com/) |

**Caveats:**
- **Different definitions.** RevenueCat counts paid subscriptions, AppsFlyer counts any in-app purchase, and Duolingo counts paid subscribers against monthly users.
- **They are medians from datasets** that differ from ZIGoals: all-in-one, privacy-first, and a web app today.
- **Organic install shares by category** (as opposed to revenue shares) were not found on public first-party pages (**UNVERIFIED**).

## 4. Three scenarios
**The model:**
- new people in month t = N₀ × (1 + g)^t;
- plus referrals, each month's new people bring k × the previous month's;
- a share c of new people buy once.
- N₀ is the number of new people per month at release.
- **The output is the N₀ needed to reach 500,000**: what would have to be true, not a forecast. All three inputs are **assumptions**, anchored to the benchmarks in §3.

| Scenario | c (buy) | g (monthly growth in new people) | k (referral) | Why these values | New people per month at release for 500k in **3 years** | …in **5 years** | Total new people |
|---|---|---|---|---|---|---|---|
| **Conservative** | 2% | 0% | 0 | Freemium median; Western Europe; no growth, no referrals | 694,444 (≈22,815 a day) | 416,667 (≈13,689 a day) | 25,000,000 |
| **Base** | 4% | 1% | 0.1 | Between the Health & Fitness median and its top quartile; modest growth; a light referral loop | 262,118 (≈8,612 a day) | 138,088 (≈4,537 a day) | 12,500,000 |
| **Ambitious** | 8% | 2% | 0.2 | Near Duolingo's paid share at scale; steady growth; a strong referral loop | 97,093 (≈3,190 a day) | 44,150 (≈1,451 a day) | 6,250,000 |

**How the base scenario builds** (5-year path, starting at 138,088 new people a month): cumulative first purchases reach about 77,075 after year 1, 164,686 after year 2, 263,408 after year 3, 374,650 after year 4 and 500,000 after year 5.

**Against the category:**
- The base scenario's 12.5 million people over 5 years is about 2.5 million a year, or **0.06%** of 2025's Health & Fitness downloads worldwide. Over 3 years it is 0.11% a year.
- The conservative scenario needs 0.13% a year over 5 years.
- The ambitious one needs 0.03%.

**Against the home market:**
- Every scenario needs more people than Belgium's population (11.9M) over its horizon.
- The Netherlands and the rest of the EU, then English-speaking and other markets, are a precondition, not an option ([GLOBAL_READINESS](GLOBAL_READINESS.md)).

## 5. What paid acquisition would cost (an illustration)
**If every new person came from paid installs at AppsFlyer's blended costs (Q2 2026):**

| Scenario (people) | At USD 2.50 (Health & Fitness, global) | At USD 4.54 (Health & Fitness, US) | At USD 7.10 (Finance, US) |
|---|---|---|---|
| Conservative (25.0M) | USD 62.5M | USD 113.5M | USD 177.5M |
| Base (12.5M) | USD 31.25M | USD 56.75M | USD 88.75M |
| Ambitious (6.25M) | USD 15.6M | USD 28.4M | USD 44.4M |

**When does one paid install pay for itself?** When c × revenue per buyer ≥ the cost per install.
- **Benchmark revenue per buyer** (RevenueCat, first year: USD 23 global, 25 Western Europe, 35.64 Health & Fitness yearly) gives a break-even cost per install of:
  - **USD 0.46–0.71 at c = 2%**;
  - **0.92–1.43 at c = 4%**;
  - **1.84–2.85 at c = 8%**.
  - All are below the Health & Fitness cost per install in the US (USD 4.54).
- **Turned around:** at c = 4%, a buyer would need to bring **USD 62.50** (global Health & Fitness cost per install) or **USD 113.50** (US) just to repay their install.
  - This is a test of channels, **not a price**. It shows why paid ads cannot be the main engine at benchmark values.

## 6. Which levers matter most
**Sensitivity of the base scenario** (5 years): the new people per month needed at release when one input changes.

| Lever | Change | Needed at release | Effect |
|---|---|---|---|
| c, the share who buy | 4% → 2% | 276,175 | **+100%** |
| | 4% → 6% | 92,058 | −33% |
| | 4% → 8% | 69,044 | −50% |
| g, monthly growth in new people | 1% → 0% | 187,848 | +36% |
| | 1% → 2% | 98,949 | −28% |
| k, referral | 0.1 → 0 | 153,056 | +11% |
| | 0.1 → 0.2 | 123,121 | −11% |

**What drives each lever** (from this pack):
- **Conversion (c):**
  - the paywall type (hard vs freemium medians: 10.7% vs 2.1%);
  - trial length (longer trials convert better in RevenueCat's data);
  - value before the paywall (onboarding complaints in MARKET_LANDSCAPE);
  - the four-app switch story ([MONETIZATION_OPTIONS](MONETIZATION_OPTIONS.md)).
  - Pricing decides much of c, and it is not decided.
- **Growth (g):**
  - store presence and search (about 65% of App Store downloads follow a search);
  - languages;
  - featuring;
  - content.
  - Today ZIGoals has no store listing and one language.
- **Referral (k):**
  - retention first: Health & Fitness keeps only about 3% of users at day 30 (AppsFlyer);
  - then sharing moments and a referral programme;
  - published examples: YNAB gives both sides a free month ([referral](https://www.ynab.com/referral-program)); Strides pays affiliates 30% ([affiliates](https://stridesapp.com/affiliates.html)).
  - Under the UK FCA crypto promotion rules, refer-a-friend bonuses for cryptoassets are banned ([GLOBAL_READINESS §5.2](GLOBAL_READINESS.md#52-crypto-availability-and-promotion)). So any referral reward must stay away from crypto promotion. Flag: LC-new.

## 7. What would have to be true (base scenario)
1. **Store apps on iOS and Android, at or soon after the release.** Search drives most App Store downloads, and a web app is not in the stores ([BETA_IDEAS_BACKLOG](BETA_IDEAS_BACKLOG.md), N2–N5).
2. **About 4% of new people buy.** That is above the Health & Fitness median of 2.9%, but below its top quartile, and needs a clear value before any paywall.
3. **About 138,000 new people a month at release, growing about 1% a month,** for 5 years. For 3 years, about 262,000 a month.
4. **Mostly organic acquisition:** search, word of mouth, referrals, featuring and creators. At benchmark values, paid installs don't pay back within a year (§5).
5. **Retention above the category's day-30 norm** of about 3%, so that referrals compound.
6. **Several languages and regions from the start of growth.** Belgium alone is too small (§4).
7. **Legal clarity for promotion,** especially anything touching crypto, before creator or community channels are used at scale. Belgian FSMA advertising rules, UK FCA promotion rules and Singapore's MAS guidelines are flagged in [GLOBAL_READINESS §5.2](GLOBAL_READINESS.md#52-crypto-availability-and-promotion).
8. **Running costs per active person that stay below revenue per person,** whatever the model ([COST_MODEL.md](../business/COST_MODEL.md); MONETIZATION_OPTIONS §6).

## 8. Signals to measure from Beta, privately
| Signal | Why | How, without tracking people |
|---|---|---|
| Activation: first goal and first habit within day 1 | The first step of the funnel | Opt-in, aggregate counts (backlog T6, ⚠ **private**), or opt-in feedback |
| Return on day 7 and day 30 | Compare with the AppsFlyer norms (§3) | **Store analytics once listed.** App Store Connect counts only users who opted in, with privacy thresholds, and offers peer benchmarks with differential privacy ([retention](https://developer.apple.com/help/app-store-connect-analytics/engagement/app-retention/), [peer groups](https://developer.apple.com/help/app-store-connect-analytics/benchmarks/peer-group-benchmarks/)). Play Console has aggregate retention ([statistics](https://support.google.com/googleplay/android-developer/answer/139628?hl=en)) |
| Willingness to pay, and which pillar people would pay for first | Feeds the pricing brainstorm | Opt-in survey; trial cohorts once sales exist |
| Invites sent and accepted | k | Count invite links created and redeemed, without identities |
| Sync cost per active person | Feeds COST_MODEL | Provider dashboards after activation (COST_MODEL's "to fill in" list) |

## 9. Risks and unknowns
- **Unknown inputs:**
  - the pricing model (not decided);
  - the size of the ZIGChain community (no official figure);
  - organic install shares by category (not public).
- **Platform risk:** web-app reach depends on Apple's and Google's policies (GLOBAL_READINESS §4). Store rules and fees changed several times in 2025–26 (MONETIZATION_OPTIONS §2).
- **Competition:** the platform hubs (Apple Health, Samsung Health, Google Health) and AI-first entrants move fast (MARKET_LANDSCAPE §5, §7).
- **Legal:**
  - crypto promotion and health-data rules can close channels or regions (GLOBAL_READINESS §5);
  - the EU withdrawal function and the UK subscription rules shape conversion flows.
- **Benchmark mismatch:** the published medians describe subscription apps. A one-time or hybrid model would behave differently, and no comparable public benchmark was found.

## Sources and access dates
All 15 external sources linked above, in order of first use. "Read" is the access date (UTC); blocked sources show when they were tried.

1. revenuecat.com (RevenueCat, State of Subscription Apps 2026): <https://www.revenuecat.com/state-of-subscription-apps/> (read 2026-10-03)
2. appsflyer.com (Health & Fitness, global): <https://www.appsflyer.com/benchmarks/health___fitness/health___fitness___overall/health___fitness___overall/global/overall/> (read 2026-10-03)
3. appsflyer.com (AppsFlyer, State of App Monetization 2026): <https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/> (read 2026-10-03)
4. investors.duolingo.com (Duolingo shareholder letter, Q2 2026): <https://investors.duolingo.com/static-files/3c8277ee-bc94-4f5d-9b77-0db3e46f88b8> (read 2026-10-03)
5. appsflyer.com (methodology): <https://www.appsflyer.com/benchmarks/faq/> (read 2026-10-03)
6. ads.apple.com (Apple Ads): <https://ads.apple.com/app-store> (read 2026-10-03)
7. apple.com (Apple newsroom): <https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/> (read 2026-10-03)
8. sensortower.com (Sensor Tower blog): <https://sensortower.com/blog/health-and-fitness-apps-ai> (read 2026-10-03)
9. european-union.europa.eu (EU country profile): <https://european-union.europa.eu/principles-countries-history/eu-countries/belgium_en> (read 2026-10-03)
10. zigchain.com: <https://zigchain.com/> (read 2026-10-03)
11. ynab.com (referral): <https://www.ynab.com/referral-program> (read 2026-10-03)
12. stridesapp.com (affiliates): <https://stridesapp.com/affiliates.html> (read 2026-10-03)
13. developer.apple.com (retention): <https://developer.apple.com/help/app-store-connect-analytics/engagement/app-retention/> (read 2026-10-03)
14. developer.apple.com (peer groups): <https://developer.apple.com/help/app-store-connect-analytics/benchmarks/peer-group-benchmarks/> (read 2026-10-03)
15. support.google.com (statistics): <https://support.google.com/googleplay/android-developer/answer/139628?hl=en> (read 2026-10-03)
