# Cost model (research, 2026-10-02)

> **Research only. Not legal, tax or financial advice.**
> - These are planning figures, not a budget, a quote or a commitment to any plan or upgrade.
> - Every number is either quoted from a dated source or marked **unknown**. An unknown is never zero.
> - No exchange rate is used, and no currency is converted.

## How the figures were sourced
- **The official pricing pages were not readable from this session (2026-10-02).**
  - The cloud sandbox's network policy refused cloudflare.com, supabase.com, resend.com and coingecko.com: the proxy refused the connection, and the page reader returned `EGRESS_BLOCKED`.
  - No price below was re-checked today.
- **The figures come from dated records already in this repository, or from the owner.** Each row names its source and date.
- **Re-check every row on the official page before relying on it.** The links are given for that.

## Services and what is known about their price
| Service | What ZIGoals uses it for | Known figure | Source and date |
|---|---|---|---|
| Cloudflare Workers | the Alpha app (`zigoals-alpha`), the apex landing (`zigoals`), the private-sync, market, food and auth Workers | **Workers Paid: "$5/month + usage"** (owner-reported plan). The included usage and the overage prices are **unknown** here. | [CLOUDFLARE_ALPHA.md](../deployment/CLOUDFLARE_ALPHA.md), "Hosting evidence and limits", added 2026-09-14 |
| Cloudflare Durable Objects | encrypted account sync, the shared market and food budgets, sign-in admission | **Free tier:** 100,000 requests/day, 13,000 GB-s/day, 100,000 rows written/day, 5 GB SQLite storage. "Operations fail when a Free limit is exceeded." **Paid-plan DO prices: unknown.** | [ACTIVATION.md](../run11/ACTIVATION.md), "Capacity and cost assumptions", official page checked 2026-09-26 |
| Push reminders ([ADR-010](../architecture/ADR-010-push-reminders.md); off until the owner activates it) | reminders while the app is closed: one more Worker (`<prefix>-push-reminders`) with one SQLite Durable Object per account, counted under the Durable Objects figures above; each send is a Worker subrequest to the device's push service (Apple, Google, Mozilla or Microsoft) | **Durable Objects: the Free figures above.** **Delivery: unknown.** The push services' pages read for ADR-010 list no price for delivery, and no claim beyond that is made. No paid service is added. | [ADR-010](../architecture/ADR-010-push-reminders.md), "Consequences", sources read 2026-10-03; row added 2026-10-04 |
| Cloudflare Access | the owner recovery admin tool | **Free, up to 50 users** | [ADR-007](../architecture/ADR-007-owner-recovery-admin.md), 2026-09-30 |
| Supabase | email one-time-code sign-in (auth only; synced records live encrypted in Durable Objects) | **Free:** 50,000 monthly active users, 500 MB database, 5 GB egress; inactive projects pause. **Paid-plan prices: unknown.** | [ACTIVATION.md](../run11/ACTIVATION.md), checked 2026-09-26 |
| Supabase email sending | sign-in codes | Default SMTP: 2 emails/hour, team addresses only. Custom SMTP starts at 30/hour (a project setting). | [OWNER_ACTIVATION.md](../run10/OWNER_ACTIVATION.md), 2026-09-24 |
| Resend | delivers the sign-in codes (SMTP for Supabase) | **Free: 100 emails/day** ("not an unlimited or guaranteed entitlement"). **Paid-tier prices: unknown.** | [OWNER_ACTIVATION.md](../run10/OWNER_ACTIVATION.md), 2026-09-24 |
| CoinGecko | market prices, catalog, history | **Demo plan: 100 calls/minute and 10,000 credits/month.** The owner observed 171 used on 2026-09-22, reset monthly. **Paid-plan prices: unknown.** | owner, Session K brief, 2026-10-02; [RUN_10 master plan](../RUN_10_BETA_RELIABILITY_MASTER_PLAN.md), 2026-09-22 |
| Open Food Facts | barcode food lookup | **Free** (owner). The official limit is 15 product reads/minute per IP; our Worker allows itself 5/minute for the whole deployment. | owner, 2026-10-02; [FOOD_READINESS.md](../run11/FOOD_READINESS.md), checked 2026-09-30 |

**Unknown, and needed for a real budget:**
- Workers Paid included requests and CPU, and their overage prices;
- Durable Object prices on the paid plan;
- Supabase and Resend paid tiers;
- CoinGecko paid tiers;
- the domain renewal for `zigoals.app`;
- app-store developer fees and commission;
- payment-provider fees;
- VAT on a 4.99 sale;
- any accountant or legal costs.

## Usage drivers (Run11 planning figures)
- **Sync.** "20 friends × 20 private edits/day = 400 edits/day. At roughly 3 encrypted mutation batches plus a cleanup per edit this starts around 1,600 DO requests/day, before reads, retries, admission, rotation and provider work." ([ACTIVATION.md](../run11/ACTIVATION.md))
  - That is **about 80 DO write requests per active person per day**.
  - Reads, retries and key rotation come on top. Their share is **unknown** until measured after activation.
- **Market data.** "A planning 500 distinct cold quote batches/month costs 500 × the confirmed endpoint credit cost, plus catalog/history/insights/token/RWA work and conservative dispatched failures."
  - The cache is shared, so this grows with the number of distinct coins people hold, not directly with the number of people.
  - The credit cost per endpoint is **unknown** until the owner confirms it.
- **Food lookups.** One provider request per 12 s for the whole deployment, which is at most 7,200 a day, with a 24 h cache. The planning example is 5 new products per person per day ([FOOD_READINESS.md](../run11/FOOD_READINESS.md)).
- **Sign-in emails.** One email per code requested. The app allows at most 6 sends per email address per day ([ACTIVATION.md](../run11/ACTIVATION.md)). How often people request a code is **unknown** until measured.
- **Push reminders** (added 2026-10-04). "20 friends × 2 reminders a day ≈ 40 sends; each alarm is one Durable Object request and a handful of rows; schedule refreshes add ≈ 20 requests a day: about 100–200 requests and under 1,000 rows written a day, under 1% of the Free figures" ([ADR-010](../architecture/ADR-010-push-reminders.md), assumptions A1–A4 below). At 1,000 people it is 5–10% of those figures. Sends are Worker subrequests, not Durable Object requests, and their price is **unknown**.

## Scenarios at the 4.99 one-time price
**Assumptions (explicit):**
- **A1.** Every person is active every day and makes 20 private edits. This is the Run11 planning example and an upper bound.
- **A2.** Each edit costs about 4 Durable Object write requests (3 batches plus 1 cleanup). Reads are not included.
- **A3.** Everyone pays 4.99 once.
  - The currency is not specified, so no conversion is made.
  - Store fees, payment fees and VAT are **unknown**, so only gross revenue is shown.
  - Whether the friends Alpha pays is the owner's choice; it is shown as if it did.
- **A4.** The only recurring cost with a known figure is Workers Paid at $5/month. Every usage-based cost is **unknown** beyond the free tiers listed above.

| | Friends Alpha (20) | 1,000 people | 10,000 people |
|---|---|---|---|
| DO write requests/day (A1 × A2) | ~1,600 | ~80,000 | ~800,000 |
| Against the DO Free 100,000 requests/day (2026-09-26 figure) | about 2% | about 80% **before reads**, so likely over the free tier once reads count | about 8× the free tier: a paid DO plan is needed, at an **unknown** price |
| Supabase monthly active users against Free 50,000 | 20 | 1,000 | 10,000 (within the MAU figure; database size per person **unknown**) |
| Sign-in emails against Resend Free 100/day | fits unless more than 100 codes a day | fits only below 100 codes a day; the code rate is **unknown** | very likely above the free tier; paid price **unknown** |
| Supabase custom SMTP rate (30/hour default) | fits | a morning peak could exceed 30/hour (**unknown**) | likely needs a higher configured rate |
| CoinGecko Demo, 10,000 credits/month | planning 500 batches × credit cost (**unknown**); shared cache | grows with distinct coins, not people (**unknown**) | **unknown**; may need a paid plan at an **unknown** price |
| Open Food Facts (free; 7,200 misses/day budget) | ~100 misses/day expected | ~5,000/day at the planning example: fits | ~50,000/day at the planning example: **over the budget**, so lookups slow down. A capacity limit, not a cost |
| Gross revenue at 4.99 (A3) | 99.80 | 4,990 | 49,900 |
| Known recurring cost | $5/month | $5/month + **unknown** usage | $5/month + **unknown** usage |

**What the table shows without guessing:**
- **A one-time price funds a recurring bill only for a limited time.**
  - At 20 people, 99.80 gross is about 20 months of the $5 base fee before any fee, tax or usage.
  - The two amounts may be in different currencies, so this is an order of magnitude, not a conversion.
- **The first limits to plan for are not the base fee:**
  - **sync writes** (between 1,000 and 10,000 people);
  - **sign-in email volume** (Resend free tier);
  - **the food lookup budget** (towards 10,000 people).
- **Every paid tier these would need is priced as unknown here.**

## To fill in before relying on this
1. Read each official pricing page above. Record the date, the plan and the figures in this file, keeping the old rows as history.
2. After activation (Stage 7), take real usage from the dashboards:
   - DO requests and rows per day;
   - Supabase active users;
   - emails per day;
   - CoinGecko credits per month and the credit cost per endpoint.
3. Replace A1 and A2 with measured averages, and keep the planning example as the upper bound.
4. Have an accountant confirm VAT, store fees and payment fees for a 4.99 one-time sale.
