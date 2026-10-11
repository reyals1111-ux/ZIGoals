# Monetization options: evidence for the pricing brainstorm (research, 2026-10-03)

> **Options and evidence only. No recommendation and no decision.**
> - **Pricing is NOT decided.** COST_MODEL.md once noted 4.99 as an early idea. It is not a working or chosen price, and nothing below proposes a price, a model or a tier.
> - Not legal, tax or accounting advice. Store and payment rules are summarized from official pages, with their dates. Questions go to a lawyer and an accountant ([LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §5).
> - Prices are as listed on 2026-10-03 (UTC), with currency and storefront. Nothing is converted between currencies.

**Part of the [strategy pack](README.md).** App details and their sources are in [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md). Running costs are in [COST_MODEL.md](../business/COST_MODEL.md).

## Summary: what the evidence says (facts, not advice)
- **Four separate leading apps cost real money today.**
  - A mainstream four-app stack of annual plans costs **USD 298.97 a year** on US list prices (MyFitnessPal, Habitify, Todoist, YNAB; §1).
  - On the Belgian App Store, a comparable stack costs **235,97–273,97 € in the first year**.
- **Store fees changed in 2026, and depend on region and channel** (§2):
  - **Apple's new EU terms** (from 2026-10-01): 26% on in-app purchases, or 15% for small developers and for subscriptions after year one.
  - **Google's new model** (EEA, UK and US from 2026-06-30): 10% on subscriptions, plus 5% if Play's billing is used. Fees now also apply to web links and alternative billing.
  - **US App Store links to the web need no Apple entitlement.** Whether Apple may charge a fee on them is in front of the courts.
- **Conversion depends heavily on the paywall type.**
  - RevenueCat's 2026 data, 35 days after download: **10.7%** of downloads pay with a hard paywall and **2.1%** with freemium (medians, all categories).
  - Health & Fitness is at **2.9%**.
  - **28%** of annual subscriptions are still active after a year (§5).
- **Encrypted sync is a common paid feature**, but not universal (§3.8):
  - Obsidian Sync costs USD 4/month billed annually;
  - Day One's free tier is one device, and Silver adds all devices;
  - Standard Notes gives encrypted sync free and charges for features and storage.
- **Many companies sell on the web to avoid store fees,** but web checkout still costs money and brings tax work: Stripe in Belgium charges 1.5% + €0.25 on standard EEA cards, and merchants of record charge 5% + 50¢ (§2.3).
  - Some charge more in the store (1Password, CoinStats).
  - Some recommend the web (Monarch).
  - Some sell only on the web (CoinTracker, Zerion, Obsidian, Kubera).
- **A one-time price funds a running sync bill only for a limited time** (COST_MODEL). A subscription tracks cost; a one-time sale does not (§6).

## 1. The four-app stack today ("replaces four paid apps")
What a person pays now, with one leading app per pillar. These are example picks from [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md), not the only choices.

**Stack A: mainstream leaders, annual plans, US, USD**

| Pillar | App and plan | Price | Source |
|---|---|---|---|
| Health | MyFitnessPal Premium, annual | 79.99/year | [web pricing](https://www.myfitnesspal.com/premium) |
| Habits | Habitify Pro, yearly | 49.99/year | [App Store US](https://apps.apple.com/us/app/habitify-habit-tracker/id1111447047) |
| Goals and planning | Todoist Pro, yearly | 59.99/year | [App Store US](https://apps.apple.com/us/app/id572688855?l=en) |
| Wealth | YNAB | 109/year | [web pricing](https://www.ynab.com/pricing) |
| **Total** | | **298.97/year** | |

**Stack B: the lowest-cost paid picks found, US, USD:**
- Cronometer Gold, 59.99/year;
- Streaks, 5.99 one-time;
- Todoist Free;
- Empower dashboard, free.

That is **65.98 in the first year.** The free picks carry ads (Cronometer Basic) or serve another business (Empower's free tools lead to its paid advice).

**Belgian App Store (EUR, first year):**
- MyFitnessPal Yearly Premium 49,99 € or 87,99 € (both listed);
- Streaks 6,99 € one-time;
- Todoist Pro yearly 59,99 €;
- YNAB 119,00 €.

That is **235,97–273,97 €** ([MyFitnessPal BE](https://apps.apple.com/be/app/id341232718?l=en), [Streaks BE](https://apps.apple.com/be/app/id963034692?l=en), [Todoist BE](https://apps.apple.com/be/app/id572688855?l=en), [YNAB BE](https://apps.apple.com/be/app/id1010865877?l=en)). Monarch, Copilot, Rocket Money and Emma are not on the Belgian App Store.

**What the stack means for the story:**
- It is the strongest factual anchor for "one app instead of four".
- It is not a price signal by itself: people may not pay for all four, and many use free tiers with ads.
- The pricing brainstorm decides what, if anything, to draw from it.

## 2. Store fees and rules (official pages, read 2026-10-03)
### 2.1 Apple App Store
| Rule | What Apple's page says | Effective / dated |
|---|---|---|
| Standard commission | 30% of the price, net of taxes ([Schedule 2](https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf)) | Schedule 2 v126, 2025-12-17 |
| Small Business Program | 15% for developers with up to USD 1M proceeds in the previous calendar year; new developers qualify ([program](https://developer.apple.com/app-store/small-business-program/)) | — |
| Subscriptions | <ul><li>The developer receives 70% in a subscriber's first year and **85% after a year of paid service**.</li><li>Small Business Program members receive 85% from the start ([subscriptions](https://developer.apple.com/app-store/subscriptions/))</li></ul> | — |
| **EU terms** (Belgium included) | <ul><li>**In-app purchase:** 26%; 15% for small developers and for subscriptions after year one.</li><li>**Another payment processor inside the app:** 20% (10%).</li><li>**An out-of-app offer with a link:** 15% (10%) on sales within 7 days of the tap.</li><li>**A Core Technology Commission** of 5% for apps distributed outside the App Store.</li><li>The chosen options must be kept for 12 months ([apps in the EU](https://developer.apple.com/support/apps-in-the-eu/); [news](https://developer.apple.com/news/?id=gmws0jgp))</li></ul> | Effective **2026-10-01** |
| US links to web purchases | <ul><li>On the **US storefront**, buttons and links to the web need no entitlement ([guidelines](https://developer.apple.com/app-store/review/guidelines/), updated 2026-06-08; [news](https://developer.apple.com/news/?id=9txfddzf)).</li><li>No Apple page states a commission on those sales.</li><li>The Ninth Circuit (*Epic Games v. Apple*, No. 25-2935, 2025-12-11) held that Apple may charge only a fee based on genuinely necessary costs, and none until the district court approves one ([opinion](https://cdn.ca9.uscourts.gov/datastore/opinions/2025/12/11/25-2935.pdf)).</li><li>Whether a fee has been approved since: **UNVERIFIED**</li></ul> | — |
| 3.1.1 In-app purchase | <ul><li>Features, subscriptions and full unlocks use in-app purchase.</li><li>No license keys, QR codes or crypto as unlocks.</li><li>A free trial for a non-subscription app is a USD 0 item named as a trial</li></ul> | Guidelines 2026-06-08 |
| 3.1.2 Subscriptions | <ul><li>At least 7 days long.</li><li>Must work on all of the person's devices.</li><li>**3.1.2(a): a move to subscriptions should not take away the primary functionality existing buyers paid for** (the guideline says *should*, not *must*)</li></ul> | — |
| 3.1.3(b) Multiplatform | A purchase made elsewhere (for example on the web) may be unlocked in the app **if the same item is also offered as an in-app purchase** | — |
| 3.1.5 Crypto | <ul><li>Wallets only from developers enrolled as organizations.</li><li>Exchanges only with licensing.</li><li>The November 2025 update lists crypto exchanges among highly regulated fields (5.1.1(ix)) ([news](https://developer.apple.com/news/?id=ey6d8onl))</li></ul> | 2025-11-13 |
| 4.2 Minimum functionality | More than a repackaged website (relevant to wrapping the web app) | — |
| 5.1.2(i) AI | Disclose and get explicit permission before sharing personal data with **third-party AI** | 2025-11-13 |
| Family Sharing | <ul><li>The developer opts in per product (subscriptions and non-consumables), for up to 6 people.</li><li>**It cannot be turned off once enabled** ([help](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases))</li></ul> | — |
| Prices by region | <ul><li>Up to 800 price points (100 more on request).</li><li>Pick a base storefront, and Apple sets the other 174 storefronts in 43 currencies, adjusting for exchange rates and some taxes ([set a price](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/))</li></ul> | — |
| New purchase types | <ul><li>Monthly subscriptions with a 12-month commitment (not in the US or Singapore; iOS 26.4+).</li><li>Volume Purchasing from 2026-10-22.</li><li>Group Purchases.</li><li>Bundles with iOS 27 ([news](https://developer.apple.com/news/?id=agq42lxe), [news](https://developer.apple.com/news/?id=likeohx4))</li></ul> | 2026 |

### 2.2 Google Play
| Rule | What Google's page says | Effective |
|---|---|---|
| Markets on the old model | 15% on the first USD 1M a year, then 30%; subscriptions 15% ([service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)) | Until each region moves |
| **New fee model** | <ul><li>**Recurring transactions (subscriptions):** 10%, plus a 5% billing fee if Google Play Billing is used.</li><li>**The first USD 1M of earnings:** 10% + 5%.</li><li>**Other items:** new installs 20% (15% in Google's programs); existing installs 25% in-app or 20% through a web link.</li><li>A fee applies whether the sale uses Play's billing, alternative billing or an external link ([new model](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en))</li></ul> | **EEA, UK, US 2026-06-30**; Australia and Japan 2026-09-30; Korea 2026-12-31; the rest of the world 2027-09-30 |
| EEA external offers | <ul><li>Ongoing 10% on subscriptions and 20% on other items bought within 24 h of the link.</li><li>**€1.20 per app install** ([external offers](https://support.google.com/googleplay/android-developer/answer/14372887?hl=en); [alternative billing](https://support.google.com/googleplay/android-developer/answer/12348241?hl=en))</li></ul> | Updated fees 2026-06-04 |
| US links and alternative billing | <ul><li>Since 2025-10-29 Google may not prohibit links or other payment methods in the US.</li><li>**External content links:** 10% on subscriptions bought within 24 h; USD 2.85 per app install.</li><li>**US alternative billing:** 10% on subscriptions ([external content links](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en), [US programs](https://support.google.com/googleplay/android-developer/answer/15582165?hl=en))</li></ul> | Reporting and payment from **2026-10-01** |
| Payments policy | <ul><li>In-app features and services use Google Play Billing unless an exception or an enrolled program applies.</li><li>Its examples of cloud software that must use it include "financial management software" ([Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en))</li></ul> | — |
| Family Library | <ul><li>**In-app purchases cannot be shared** (nor free apps); only eligible paid apps can ([help](https://support.google.com/googleplay/answer/7007852?hl=en)).</li><li>The page does not mention subscriptions; whether a Play subscription can be shared with family: **UNVERIFIED**</li></ul> | — |
| Prices by region | <ul><li>Play converts the default price and applies local price patterns.</li><li>Pricing templates were discontinued on 2025-10-27.</li><li>The maximum is USD 10,000 on request ([set prices](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en))</li></ul> | — |

### 2.3 Web checkout (official pricing pages)
| Provider | Fee as published | Merchant of record (handles VAT and sales tax)? |
|---|---|---|
| Stripe, **Belgium** | <ul><li>1.5% + €0.25 on standard EEA cards; 2.8% + €0.25 on premium EEA cards; 2.5% + €0.25 on UK cards; 3.15% + €0.25 on international cards.</li><li>Bancontact €0.35.</li><li>Billing 0.7%.</li><li>Tax 0.5% ([pricing](https://stripe.com/en-be/pricing))</li></ul> | No; the business is the seller. "Managed Payments" (merchant of record) costs 3.5% plus the payment fees |
| Stripe, US | 2.9% + 30¢ on domestic cards; +1.5% on international cards ([pricing](https://stripe.com/pricing)) | As above |
| Paddle | 5% + 50¢ per checkout transaction ([pricing](https://www.paddle.com/pricing)) | **Yes** |
| Lemon Squeezy | 5% + 50¢ per transaction ([pricing](https://www.lemonsqueezy.com/pricing)). It now belongs to Stripe; its 2026 update notice was not readable (**UNVERIFIED**) | **Yes** |
| FastSpring | No public rate; a quote form, not filled ([pricing](https://fastspring.com/pricing/)) | **Yes** |

**Tax note (not advice):**
- For EU consumer sales on its own website, the seller handles VAT itself (the One Stop Shop) or uses a merchant of record ([VAT OSS](https://vat-one-stop-shop.ec.europa.eu/index_en)).
- The stores collect and remit tax on their own sales. COST_MODEL already lists "VAT on a sale" as unknown.
EOF
echo ok
## 3. The options
Each option lists:
- real examples with dated prices;
- pros and cons;
- its fit with the four-app story;
- how it meets the running costs;
- what the stores require.

The flags use the pack's labels ([README](README.md#labels)). Options can be combined; for example, a free local app with a paid tier.

### 3.1 One-time purchase (and lifetime licences)
**Examples:**
- **Streaks:**
  - App Store, one-time, no in-app purchases: US $5.99; BE 6,99 €; GB £5.99; DE 6,99 €; IN ₹ 599; BR R$ 39,90; JP ¥1,000;
  - shareable with up to six family members ([listing](https://apps.apple.com/us/app/streaks/id963034692)).
- **Things 3:** iPhone USD 9.99, iPad USD 19.99, Mac USD 49.99, each a separate purchase ([iPhone](https://apps.apple.com/us/app/id904237743), [iPad](https://apps.apple.com/us/app/id904244226), [Mac](https://apps.apple.com/us/app/id904280696)).
- **Lifetime next to a subscription:**
  - Habitify Pro Lifetime $119.99 and $59.99 ([listing](https://apps.apple.com/us/app/habitify-habit-tracker/id1111447047));
  - Structured Pro Lifetime $99.99 ([listing](https://apps.apple.com/us/app/id1499198946));
  - Lose It! Premium Lifetime $59.99 and $49.99;
  - Flighty Lifetime $299.00 and Lifetime (Family) $449.00 ([listing](https://apps.apple.com/us/app/id1358823008)).
- **Market share:** Adapty reports one-time purchases rising from 6.4% (2023) to **10.3%** (2025) of revenue in its dataset, consumables and lifetime included ([report](https://adapty.io/state-of-in-app-subscriptions-report/)).

**Pros:**
- matches people's fatigue with subscriptions;
- easy to explain;
- Streaks shows a one-time price can lead a category chart (#1 paid in Health & Fitness, US, 2026-10-03).

**Cons:**
- revenue arrives once while sync, email and market-data costs recur for as long as the person stays active (§6);
- updates must be funded by new buyers;
- **Apple 3.1.2(a):** a later move to subscriptions should not take away the primary functionality buyers paid for.

**Fit with the four-app story:**
- strong and simple ("one payment instead of four subscriptions");
- the stack in §1 is mostly subscriptions, so the contrast is visible.

**Stores:**
- Apple takes 30%, or 15% under the Small Business Program; 26% (15% for small developers) in the EU from 2026-10-01;
- Google's new model takes 20% on new installs (15% in programs) where it applies;
- one-time unlocks inside the iOS app must use in-app purchase (3.1.1);
- **Family Sharing can be offered but not withdrawn later.**

**Principles and flags:**
- ✓ fits all six principles;
- the cost risk is a business question, not a principle one;
- consumer-law flag LC§5: the withdrawal right and its waiver for digital content.

### 3.2 Subscription
**Examples:**
- YNAB: USD 14.99/month or 109/year; sharing for up to 6 people included ([pricing](https://www.ynab.com/pricing)).
- Monarch: Core USD 14.99/month or 99.99/year; Plus 199.99/year ([pricing](https://www.monarch.com/pricing)).
- Copilot: USD 13/month or 95/year ([home](https://www.copilot.money/)).
- MacroFactor: 11.99/month, 47.99/half-year or 71.99/year, subscription only ([listing](https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471)).
- Kubera: USD 250/year, web only ([home](https://www.kubera.com/)).
- **Benchmarks** (RevenueCat 2026, all categories; [report](https://www.revenuecat.com/state-of-subscription-apps/)):
  - the most common price points are about USD 10 a month and USD 30 a year;
  - Health & Fitness medians are **USD 9.99 a month and USD 39.94 a year**;
  - **28%** of annual subscriptions are still active after 12 months, and 8% of monthly ones.

**Pros:**
- revenue follows the running cost;
- funds continuous development;
- the norm in nutrition and money apps.

**Cons:**
- subscription fatigue;
- billing and cancellation are among the top complaint themes (Fabulous, Productive and Lose It! in MARKET_LANDSCAPE);
- rising rules on reminders and online cancellation:
  - the UK regime is expected in spring 2027;
  - the EU withdrawal function has applied since 2026-06-19 ([GLOBAL_READINESS §5.3](GLOBAL_READINESS.md#53-consumer-law-and-subscriptions)).

**Fit with the four-app story:** "one subscription instead of four" is easy to compare with §1. But it asks people who left subscriptions to start another.

**Stores:**
- Apple takes 30% in year one, then 15%, and 15% from the start under the Small Business Program; the EU rates differ;
- Google's new model takes 10% plus 5% for Play billing;
- **Apple 3.1.2:** a subscription must work on all of the person's devices.

**Principles and flags:** ✓; LC§5 (consumer law, auto-renewal).

### 3.3 Freemium with paid tiers
**Examples:**
- Cronometer: free with ads and all nutrients; Gold $10.99/month or $59.99/year ([listing](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738)).
- Habitify: 3 habits free; Plus $29.99/year; Pro $49.99/year ([pricing](https://habitify.me/pricing)).
- Finary: Free (2 accounts); Lite €54.99, Plus €149.99 and Pro €349.99 a year ([pricing](https://finary.com/en/pricing)).
- Emma: Free; Plus £41.99, Pro £83.99 and Ultimate £124.99 a year ([plans](https://emma-app.com/plans/compare-emma-plans)).
- getquin: Free; Premium 89,99 €/year; Wealth 149,99 €/year, plus in-app ads ([pricing](https://www.getquin.com/pricing/)).

**Pros:**
- the lowest barrier to try;
- word of mouth from free users;
- Loop shows that a free, private app can reach 5M+ installs.

**Cons:**
- free users cost money if they use server features;
- **"paywall creep" is the most repeated complaint** in this research:
  - features that used to be free become paid (MyFitnessPal, Lose It!, Lifesum);
  - habit caps (Habitify, Productive);
- conversion is low:
  - freemium **2.1%** vs a hard paywall **10.7%** of downloads paying within 35 days (RevenueCat 2026 medians);
  - Health & Fitness 2.9% (top quartile above 6.2%).

**Fit with the four-app story:** a free tier lets someone try one pillar before paying for all four.

**Stores:** paid tiers follow the subscription or one-time rules above.

**Principles:**
- **where the line falls matters:**
  - ⚠ **no-chore,** if encrypted sync is the paid part: free users would protect their data with manual files;
  - ⚠ **private,** if a free tier is funded by ads or tracking, as at several leaders.
- Flags: LC§5.

### 3.4 Family and household plans
**Examples:**
- 1Password Families:
  - web USD 4.49/month billed annually (original price shown USD 5.99), for 5 people;
  - App Store US Family $7.99/month or $71.99/year ([pricing](https://1password.com/pricing/password-manager), [listing](https://apps.apple.com/us/app/id1511601750)).
- Habitify Pro Yearly (Family) $89.99.
- Flighty Annual (Family) $119.00 and Lifetime (Family) $449.00.
- Included at no extra cost:
  - YNAB (6 people);
  - Monarch (partner or professional).
- Rocket Money: one partner on Premium.
- Finary: family mode on Plus.

**Pros:**
- households share money goals, and often meals and habits;
- a natural fit for shared goals (idea G6 in the backlog).

**Cons:**
- sync cost rises with each person who syncs;
- needs sharing features and, if children join, child-privacy rules;
- **Google Play's Family Library cannot share in-app purchases** (its help page does not mention subscriptions: UNVERIFIED);
- **Apple's Family Sharing cannot be turned off once enabled.**

**Fit with the four-app story:** "one app instead of four, for the whole household".

**Principles and flags:**
- ⚠ **private:** a new sharing surface must stay end-to-end encrypted;
- **LC-new (children):** COPPA, GDPR Art. 8, the UK Children's code.

### 3.5 AI as an add-on or a top tier
**Examples:**
- Delta: 3, 10 or unlimited AI uses a month by tier ([listing](https://apps.apple.com/us/app/id1288676542)).
- Rocket Money Premium+ USD 15/month includes its AI assistant.
- Day One Gold USD 74.99/year (AI) vs Silver 49.99/year ([pricing](https://dayoneapp.com/pricing/)).
- getquin Wealth 149,99 €/year with "unlimited AI financial agents".
- Notion:
  - since 2025-05-13, AI is included in Business and Enterprise plans;
  - Custom Agents use credits at **USD 10 per 1,000**;
  - **credits cannot be bought when the subscription is managed by the App Store or Google Play** ([release](https://www.notion.com/releases/2025-05-13), [credits](https://www.notion.com/help/buy-and-track-notion-credits-for-custom-agents)).
- **Benchmark:** RevenueCat 2026 finds AI apps earn 41% more in year-one value per payer, but keep fewer annual subscribers (21.1% vs 30.7% after 12 months).

**Pros:** prices a real per-use cost (cloud inference) separately from the core.

**Cons:**
- a cloud AI that reads personal data clashes with **private** unless it runs on the device;
- **Apple 5.1.2(i)** requires disclosure and explicit permission before sharing personal data with third-party AI;
- the AI Act's transparency duties have applied since 2026-08-02.

**Fit with the four-app story:** neutral. It is an extra, not a replacement.

**Principles and flags:**
- an on-device AI ✓;
- a cloud AI ⚠ **private**;
- never moves money (**non-custodial**);
- LC§4.

### 3.6 Regional pricing
**Evidence from the stores** (App Store, 2026-10-03, as listed; no conversion):

| Item | US | BE | GB | DE | IN | BR | JP |
|---|---|---|---|---|---|---|---|
| Streaks, one-time | $5.99 | 6,99 € | £5.99 | 6,99 € | ₹ 599 | R$ 39,90 | ¥1,000 |
| YNAB subscription | $14.99 / $109.00 | 15,49 € / 119,00 € | £12.99 / £99.00 | 15,49 € / 119,00 € | ₹ 1,349 / ₹ 9,900 | R$ 82,90 / R$ 599,90 | ¥1,700 / ¥15,000 |
| Todoist Pro, monthly / yearly | $6.99 / $59.99 | 6,99 € / 59,99 € | £6.99 / £59.99 | 6,99 € / 59,99 € | ₹ 330 / ₹ 3,149 | R$ 24,90 / R$ 199,90 | ¥890 / ¥8,080 |
| MyFitnessPal Yearly Premium | $79.99 / $49.99 | 49,99 € / 87,99 € | £39.99 | 49,99 € / 87,99 € | ₹ 3,099 / ₹ 6,700 | R$ 162,90 / R$ 329,90 | ¥6,000 / ¥8,600 |

Sources: each app's listing at `apps.apple.com/<cc>/app/id<ID>?l=en`, for example [MyFitnessPal BE](https://apps.apple.com/be/app/id341232718?l=en), [YNAB IN](https://apps.apple.com/in/app/id1010865877?l=en), [Streaks JP](https://apps.apple.com/jp/app/id963034692?l=en), [Todoist BR](https://apps.apple.com/br/app/id572688855?l=en).

**What the stores do:**
- **Apple** sets the other 174 storefronts from a base price, adjusting for exchange rates and some taxes. The developer can override this.
- **Google** converts the default price and applies local price patterns (§2).

**Market signals:**
- Adapty 2026: European apps charge 29–39% more than North American ones (monthly median USD 15.25 vs 10.95), and European prices rose 18% year on year.
- RevenueCat 2026: the median yearly price in Western Europe is USD 39.44, against USD 18.32 in India and Southeast Asia.

**Pros:** reach where incomes are lower.

**Cons:**
- the running cost per person is the same everywhere (sync, email);
- RevenueCat reports higher refund rates in India and Southeast Asia (7.7%, against 3.4% in North America).

**Principles and flags:** ✓; LC§5 (consumer law per region).

### 3.7 App-store checkout vs web checkout
**Examples:**
- **Web-only purchase:**
  - CoinTracker, Zerion and Obsidian have no in-app purchases in their iOS apps, and plans are bought on the web;
  - Kubera has no store app at all.
- **Web cheaper than the store:**
  - 1Password: Families web USD 4.49/month billed annually vs App Store $7.99/month;
  - CoinStats: web 13.99/month vs App Store $19.99 or $15.99;
  - Proton says it may add an iOS surcharge to cover Apple's fees ([pricing](https://proton.me/pricing)).
- **Same price, web recommended:**
  - Monarch's FAQ recommends signing up on the web;
  - YNAB's web trial is 34 days with no card.
- **Benchmarks:**
  - web revenue is 3.2% of subscription revenue worldwide and 4.9% in North America (RevenueCat 2026);
  - Adapty 2026: web paywalls convert 1.10% vs 1.60% in-app; 12-month value per payer is USD 35.8 on the web vs 40.1 in-app.

**Pros of the web:**
- lower fees: Stripe Belgium charges 1.5% + €0.25 on standard EEA cards, against 15–30% store commission;
- a direct customer relationship;
- works for the web app today (no store listing yet).

**Cons of the web:**
- VAT and consumer-law work, unless a merchant of record is used at 5% + 50¢;
- lower conversion in Adapty's data;
- **Apple 3.1.3(b):** a web purchase can be honoured in an iOS app only if the same item is also sold as an in-app purchase;
- outside the US storefront, the iOS app may not point to the web purchase except under EU link terms (15% or 10% within 7 days);
- Google charges fees on links and alternative billing under its new model.

**Fit with the four-app story:** neutral.

**Principles and flags:**
- ✓;
- the web keeps payment data away from the app (**private**), but adds a payment provider;
- LC§5 (DMA, link-out rules, VAT OSS).

### 3.8 Pattern worth knowing: a free app, with encrypted sync as the paid part
This is where ZIGoals' main running cost sits (COST_MODEL), so the examples matter.

| App | What is free | What is paid | Source |
|---|---|---|---|
| Obsidian | The app | **Sync, end-to-end encrypted:** USD 4/user/month billed annually, or USD 5 monthly. Sold only on the web; no in-app purchase on iOS | [pricing](https://obsidian.md/pricing) |
| Day One | **Basic, end-to-end encrypted, but 1 device** | **Silver USD 49.99/year adds all devices**; Gold USD 74.99 adds AI | [pricing](https://dayoneapp.com/pricing/) |
| Bear | The app | Bear Pro $2.99/month or $29.99/year, including iCloud sync across devices | [listing](https://apps.apple.com/us/app/id1016366447) |
| Joplin | The app (open source; self-hosting possible) | Joplin Cloud from €2.99/month | [plans](https://joplinapp.org/plans/) |
| **Standard Notes (counter-example)** | **End-to-end encrypted sync on unlimited devices** | Features and storage: USD 90 or 120 a year | [plans](https://standardnotes.com/plans) |

- **Principle reading:**
  - charging for sync puts the safety net behind a paywall, which bends **no-chore** for free users (Day One's free users stay on one device);
  - Standard Notes made the opposite choice.
- **Cost reading:** the sync server's cost sits with whoever syncs, so the choice decides who carries it.
- **Not decided here.**

## 4. The options at a glance
| Option | Revenue vs running cost | Fit with "replaces four paid apps" | Store complexity | Principle notes | Examples (§3) |
|---|---|---|---|---|---|
| One-time or lifetime | Paid once; cost recurs while the person syncs | Strong and simple | <ul><li>Low.</li><li>A later move to subscriptions should keep the primary functionality buyers paid for (Apple 3.1.2(a)).</li><li>Family Sharing cannot be withdrawn</li></ul> | ✓ | Streaks, Things 3; lifetime at Habitify, Structured, Flighty |
| Subscription | Recurring on both sides | "One subscription instead of four" | <ul><li>Renewals.</li><li>EU withdrawal function; UK rules (spring 2027)</li></ul> | ✓ | YNAB, Monarch, Copilot, MacroFactor |
| Freemium tiers | Only payers pay; free users cost money if they sync | Try one pillar before all four | Tier design | ⚠ **no-chore** if sync is the paid part; ⚠ **private** if ads fund the free tier | Cronometer, Habitify, Finary, Emma |
| Family or household | Cost rises per syncing member | "For the whole household" | <ul><li>Apple: opt-in per product.</li><li>Google Play: in-app purchases cannot be shared</li></ul> | ⚠ **private** (sharing); LC-new (children) | 1Password Families, YNAB, Habitify Family |
| AI add-on | Cloud AI is a per-use cost | Neutral | Apple 5.1.2(i) consent; AI Act transparency | ✓ on the device; ⚠ **private** in the cloud | Delta, Day One Gold, Rocket Money Premium+, Notion credits |
| Regional prices | Same cost everywhere; varying margin | — | Apple sets 174 storefronts automatically; Google converts | ✓ | Store tables in §3.6 |
| Web vs store checkout | Changes the net per sale | — | Apple 3.1.3(b), EU link terms, US link-out rulings; Google link fees | ✓ | Web-only: Obsidian, CoinTracker, Zerion, Kubera. Cheaper on the web: 1Password, CoinStats |

## 5. Benchmarks that inform any choice
These are public, first-party pages read 2026-10-03. The full reports sit behind forms that were not filled.
- **RevenueCat, State of Subscription Apps 2026:**
  - 115,000+ apps, data year 2025 ([public report](https://www.revenuecat.com/state-of-subscription-apps/));
  - its "Utilities" category includes Finance.
- **Adapty, State of In-App Subscriptions 2026:**
  - 16,000+ apps, mostly App Store ([report page](https://adapty.io/state-of-in-app-subscriptions-report/); [Health & Fitness benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/), [monetization 2026](https://adapty.io/blog/mobile-app-monetization-2026/)).
  - The publishers define metrics differently, and both contradict themselves in places (flagged below).

| Metric | Value | Source |
|---|---|---|
| Downloads that pay within 35 days, hard paywall vs freemium (medians, all categories) | **10.7% vs 2.1%** | RevenueCat |
| …in Health & Fitness | **2.9%** (top quartile above 6.2%) | RevenueCat |
| …by developer headquarters | North America 2.6%, **Western Europe 2.0%**, Latin America 1.5% | RevenueCat |
| Downloads starting a trial within 30 days | **Health & Fitness 6.9%**; Utilities (incl. Finance) 6.5% | RevenueCat |
| Trials converting to paid | <ul><li>**Health & Fitness 37.7%** (RevenueCat).</li><li>Health & Fitness 35.0%; all categories 25.6% (Adapty)</li></ul> | RevenueCat, Adapty |
| Trial length and conversion | ≤4 days 25.5% · 5–9 days 37.4% · 17–32 days 42.5% | RevenueCat |
| Common price points (all categories) | About USD 10 a month and USD 30 a year. The yearly median rose to USD 34.80; one page also gives a monthly median of USD 7–8 (inconsistent) | RevenueCat |
| Health & Fitness median prices | **USD 9.99 a month, USD 39.94 a year** | RevenueCat |
| Global median prices | USD 7.48 a week, **12.99 a month, 38.42 a year** | Adapty |
| Europe vs North America | European apps charge **29–39% more** (monthly USD 15.25 vs 10.95) | Adapty |
| Annual subscriptions still active after 12 months | **28%** (monthly 8%) | RevenueCat |
| Revenue from one-time purchases (incl. lifetime and consumables) | 6.4% (2023) → **10.3%** (2025) | Adapty |
| Revenue by plan length | <ul><li>Health & Fitness: 59% from annual plans (RevenueCat), 60.6% (Adapty).</li><li>Productivity: 91% from monthly plans (RevenueCat)</li></ul> | RevenueCat, Adapty |
| Web share of subscription revenue | **3.2%** globally, 4.9% North America | RevenueCat |
| Web vs in-app paywalls | Conversion 1.10% vs 1.60%; 12-month value per payer USD 35.8 vs 40.1 | Adapty |
| Year-one revenue per payer | North America USD 32; **Western Europe USD 25**; Health & Fitness yearly USD 35.64 | RevenueCat |
| Refund rates | Most categories 3–4%; Productivity 4.7%; India and Southeast Asia 7.7% | RevenueCat |

**Reading these numbers:**
- They describe **subscription apps** in the publishers' datasets, not one-time-purchase apps, and not an all-in-one app.
- They are medians and quartiles, not forecasts. [PATH_TO_500K.md](PATH_TO_500K.md) uses them as scenario inputs.

## 6. How each model meets the running costs (COST_MODEL.md)
What the cost model knows (dated in-repo figures; [COST_MODEL.md](../business/COST_MODEL.md)):
- **The recurring bill grows with active people who sync, not with buyers:**
  - about 80 Durable Object write requests per active syncing person per day (a planning upper bound);
  - sign-in emails per code requested;
  - market data per distinct coin;
  - food lookups per new barcode.
- **Local-only use** (no account) costs little beyond serving the app.
- **Known figures:**
  - Workers Paid at "$5/month + usage" (owner-reported);
  - the free tiers of Durable Objects, Supabase, Resend and CoinGecko.
- **Unknown:**
  - every paid tier beyond those;
  - the store or payment fee;
  - the VAT on any price.

| Model | Revenue timing | Cost timing | What that means |
|---|---|---|---|
| One-time or lifetime | Once per buyer | Every month the buyer stays active and syncs | <ul><li>Each buyer's revenue is spent down over time.</li><li>COST_MODEL's own example shows a one-time sale covering the fixed base fee only for a limited number of months, before any usage cost. That example used the early 4.99 idea, which is **not a chosen price**.</li><li>The cost per active syncing person per month is needed first</li></ul> |
| Subscription | Monthly or yearly | Monthly | Revenue tracks active people, and so tracks cost |
| Freemium | Only payers | Free users cost money only through server features | A local-only free tier costs little; a free tier with sync costs per active free person |
| Family or household | One payer, several people | Per person who syncs | The cost per sale rises with household size |
| AI add-on | Per add-on buyer | Per cloud AI use (none on the device) | Cloud AI is a usage cost |
| Regional prices | Lower in some regions | The same everywhere | The margin per person varies by region |
| Store vs web checkout | Store fee vs payment fee | — | Changes the net per sale, not the running cost |

**The principle tension worth naming** (not a decision):
- If sync sits behind a paywall, free users protect their data with manual files. That bends **no-chore** for them.
- If sync is free for everyone, the running cost scales with free users.

## 7. Questions for the pricing brainstorm (no answers given)
1. Which feature carries the running cost (sync), and is it the feature people pay for? (Day One charges for multi-device sync; Standard Notes gives it free.)
2. Can a free tier exist without breaking **never a chore**?
3. One price for all four pillars, or per pillar? No leader in the research sells pillars separately.
4. Where do iPhone users buy:
   - in the app (in-app purchase required, 3.1.1);
   - on the web (honoured only if also sold in the app, 3.1.3(b));
   - or both, with the EU and US link rules?
5. What must Beta measure before pricing:
   - willingness to pay;
   - sync and email cost per active person (COST_MODEL's "to fill in" list);
   - the store vs web split?
6. Trials:
   - is a trial needed?
   - its length (the evidence above shows longer trials converting better, as a benchmark, not advice);
   - card or no card (YNAB's no-card web trial vs Monarch's card-required one).
7. Regional prices:
   - which base storefront;
   - whether to keep Apple's automatic prices for India and Brazil.
8. Family: which pillars make sense to share, and how to handle children (LC-new)?
9. AI: on the device only (no running cost), or a cloud add-on (a usage cost; consent)?
10. Lifetime licences: how would lifetime running costs be bounded?
11. Consumer law: the EU withdrawal right and its digital-content waiver, the new withdrawal function, UK subscription reminders (LC§5).
12. How "no ads, no data sale, end-to-end encrypted" shows up in the value story. Several leaders state the first two; none of the budgeting leaders claims the third.

## Sources and access dates
All 69 external sources linked above, in order of first use. "Read" is the access date (UTC).

1. myfitnesspal.com (web pricing): <https://www.myfitnesspal.com/premium> (read 2026-10-03)
2. apps.apple.com (App Store US): <https://apps.apple.com/us/app/habitify-habit-tracker/id1111447047> (read 2026-10-03)
3. apps.apple.com (App Store US): <https://apps.apple.com/us/app/id572688855?l=en> (read 2026-10-03)
4. ynab.com (web pricing): <https://www.ynab.com/pricing> (read 2026-10-03)
5. apps.apple.com (MyFitnessPal BE): <https://apps.apple.com/be/app/id341232718?l=en> (read 2026-10-03)
6. apps.apple.com (Streaks BE): <https://apps.apple.com/be/app/id963034692?l=en> (read 2026-10-03)
7. apps.apple.com (Todoist BE): <https://apps.apple.com/be/app/id572688855?l=en> (read 2026-10-03)
8. apps.apple.com (YNAB BE): <https://apps.apple.com/be/app/id1010865877?l=en> (read 2026-10-03)
9. developer.apple.com (Schedule 2): <https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf> (read 2026-10-03)
10. developer.apple.com (program): <https://developer.apple.com/app-store/small-business-program/> (read 2026-10-03)
11. developer.apple.com (subscriptions): <https://developer.apple.com/app-store/subscriptions/> (read 2026-10-03)
12. developer.apple.com (apps in the EU): <https://developer.apple.com/support/apps-in-the-eu/> (read 2026-10-03)
13. developer.apple.com (news): <https://developer.apple.com/news/?id=gmws0jgp> (read 2026-10-03)
14. developer.apple.com (guidelines): <https://developer.apple.com/app-store/review/guidelines/> (read 2026-10-03)
15. developer.apple.com (news): <https://developer.apple.com/news/?id=9txfddzf> (read 2026-10-03)
16. cdn.ca9.uscourts.gov (opinion): <https://cdn.ca9.uscourts.gov/datastore/opinions/2025/12/11/25-2935.pdf> (read 2026-10-03)
17. developer.apple.com (news): <https://developer.apple.com/news/?id=ey6d8onl> (read 2026-10-03)
18. developer.apple.com (help): <https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases> (read 2026-10-03)
19. developer.apple.com (set a price): <https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/> (read 2026-10-03)
20. developer.apple.com (news): <https://developer.apple.com/news/?id=agq42lxe> (read 2026-10-03)
21. developer.apple.com (news): <https://developer.apple.com/news/?id=likeohx4> (read 2026-10-03)
22. support.google.com (service fees): <https://support.google.com/googleplay/android-developer/answer/112622?hl=en> (read 2026-10-03)
23. support.google.com (new model): <https://support.google.com/googleplay/android-developer/answer/16954621?hl=en> (read 2026-10-03)
24. support.google.com (external offers): <https://support.google.com/googleplay/android-developer/answer/14372887?hl=en> (read 2026-10-03)
25. support.google.com (alternative billing): <https://support.google.com/googleplay/android-developer/answer/12348241?hl=en> (read 2026-10-03)
26. support.google.com (external content links): <https://support.google.com/googleplay/android-developer/answer/16470497?hl=en> (read 2026-10-03)
27. support.google.com (US programs): <https://support.google.com/googleplay/android-developer/answer/15582165?hl=en> (read 2026-10-03)
28. support.google.com (Payments policy): <https://support.google.com/googleplay/android-developer/answer/9858738?hl=en> (read 2026-10-03)
29. support.google.com (help): <https://support.google.com/googleplay/answer/7007852?hl=en> (read 2026-10-03)
30. support.google.com (set prices): <https://support.google.com/googleplay/android-developer/answer/6334373?hl=en> (read 2026-10-03)
31. stripe.com (pricing): <https://stripe.com/en-be/pricing> (read 2026-10-03)
32. stripe.com (pricing): <https://stripe.com/pricing> (read 2026-10-03)
33. paddle.com (pricing): <https://www.paddle.com/pricing> (read 2026-10-03)
34. lemonsqueezy.com (pricing): <https://www.lemonsqueezy.com/pricing> (read 2026-10-03)
35. fastspring.com (pricing): <https://fastspring.com/pricing/> (read 2026-10-03)
36. vat-one-stop-shop.ec.europa.eu (VAT OSS): <https://vat-one-stop-shop.ec.europa.eu/index_en> (read 2026-10-03)
37. apps.apple.com (listing): <https://apps.apple.com/us/app/streaks/id963034692> (read 2026-10-03)
38. apps.apple.com (iPhone): <https://apps.apple.com/us/app/id904237743> (read 2026-10-03)
39. apps.apple.com (iPad): <https://apps.apple.com/us/app/id904244226> (read 2026-10-03)
40. apps.apple.com (Mac): <https://apps.apple.com/us/app/id904280696> (read 2026-10-03)
41. apps.apple.com (listing): <https://apps.apple.com/us/app/id1499198946> (read 2026-10-03)
42. apps.apple.com (listing): <https://apps.apple.com/us/app/id1358823008> (read 2026-10-03)
43. adapty.io (report): <https://adapty.io/state-of-in-app-subscriptions-report/> (read 2026-10-03)
44. monarch.com (pricing): <https://www.monarch.com/pricing> (read 2026-10-03)
45. copilot.money (home): <https://www.copilot.money/> (read 2026-10-03)
46. apps.apple.com (listing): <https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471> (read 2026-10-03)
47. kubera.com (home): <https://www.kubera.com/> (read 2026-10-03)
48. revenuecat.com (report): <https://www.revenuecat.com/state-of-subscription-apps/> (read 2026-10-03)
49. apps.apple.com (listing): <https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738> (read 2026-10-03)
50. habitify.me (pricing): <https://habitify.me/pricing> (read 2026-10-03)
51. finary.com (pricing): <https://finary.com/en/pricing> (read 2026-10-03)
52. emma-app.com (plans): <https://emma-app.com/plans/compare-emma-plans> (read 2026-10-03)
53. getquin.com (pricing): <https://www.getquin.com/pricing/> (read 2026-10-03)
54. 1password.com (pricing): <https://1password.com/pricing/password-manager> (read 2026-10-03)
55. apps.apple.com (listing): <https://apps.apple.com/us/app/id1511601750> (read 2026-10-03)
56. apps.apple.com (listing): <https://apps.apple.com/us/app/id1288676542> (read 2026-10-03)
57. dayoneapp.com (pricing): <https://dayoneapp.com/pricing/> (read 2026-10-03)
58. notion.com (release): <https://www.notion.com/releases/2025-05-13> (read 2026-10-03)
59. notion.com (credits): <https://www.notion.com/help/buy-and-track-notion-credits-for-custom-agents> (read 2026-10-03)
60. apps.apple.com (YNAB IN): <https://apps.apple.com/in/app/id1010865877?l=en> (read 2026-10-03)
61. apps.apple.com (Streaks JP): <https://apps.apple.com/jp/app/id963034692?l=en> (read 2026-10-03)
62. apps.apple.com (Todoist BR): <https://apps.apple.com/br/app/id572688855?l=en> (read 2026-10-03)
63. proton.me (pricing): <https://proton.me/pricing> (read 2026-10-03)
64. obsidian.md (pricing): <https://obsidian.md/pricing> (read 2026-10-03)
65. apps.apple.com (listing): <https://apps.apple.com/us/app/id1016366447> (read 2026-10-03)
66. joplinapp.org (plans): <https://joplinapp.org/plans/> (read 2026-10-03)
67. standardnotes.com (plans): <https://standardnotes.com/plans> (read 2026-10-03)
68. adapty.io (Health & Fitness benchmarks): <https://adapty.io/blog/health-fitness-app-subscription-benchmarks/> (read 2026-10-03)
69. adapty.io (monetization 2026): <https://adapty.io/blog/mobile-app-monetization-2026/> (read 2026-10-03)
