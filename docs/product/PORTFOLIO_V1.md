# Portfolio v1 (Session I, Part 11)

## What it is
- **Route:** `/app/portfolio`, in navigation group 2 (Markets, Staking, Portfolio) and in the phone's More sheet.
- **Portfolios:** create, rename and delete. Each is marked **Real holdings** or **Hypothetical**, labelled wherever it
  shows, and has one currency: **USD or EUR**, the currencies the quote path serves.
- **Coins:** chosen from the public market catalog, coins only, never free text.
  - When the catalog cannot load (it is not connected on Alpha today), the coins Markets already features remain:
    BTC, ETH, ZIG, USDC and SOL (owner decision g).
- **Transactions:** buy, sell, transfer in and transfer out, each with a quantity, price per coin, fee, date and note.
  - A buy or a sell needs its price.
  - A transfer may leave the price out; the cost of what it brings is then unknown.
  - A sell or transfer out that would take a holding below zero, at any point in date order, is refused. So is removing
    a transaction when that would leave a later sale without coins.

## Calculations (`lib/portfolio/math.ts`)
- **decimal.js**, through its own `Decimal.clone` at 64-digit precision. No floats.
- **Average-cost basis:**
  - a buy adds quantity × price + fee;
  - a sell or transfer out removes the same share of the cost basis, so the average cost of what remains is unchanged;
  - a holding that returns to zero starts again with a known cost.
- **Value and unrealized result** (amount and %) are shown only with a known price. The result also needs a known cost.
- **Totals:**
  - per portfolio, in its own currency; portfolios in other currencies are never added in;
  - coins without a price are counted ("1 coin has no price yet and is not counted"), never valued at zero.
- **24h change** comes from the existing market insights path, when available.

## Honesty
- **Prices** come only from the shared public quote cache (`useMarketQuotes`), batched, with its 60 s per-pair gate and
  server budgets. Nothing polls in the background.
- **Without a live price** (none returned for the portfolio's coins, for example while the coordinator is unavailable) the page says "No live price is available right now" and values stay unknown. On the public Alpha, prices come through the market coordinator (Session S); Session U fixed the provider refusal that kept them UNAVAILABLE after deploy #28.
- **A stale price** says "Needs refresh" with its time, and the totals say they include prices that need a refresh.
- **CoinGecko attribution** appears where prices show.
- **Showcase** shows a clearly fictional portfolio with fixture prices labelled "Showcase fixture prices, not market data".
  - It makes no price request.
  - It is not stored until something is changed (then it lives in the tab's session storage).
- No advice, projections or "earn" wording.

## Storage and isolation
- **Key:** `zigoals:portfolio:v1` through `getAppStorage()`. It is per account, and in Showcase it lives in the tab's
  session storage. It is versioned and zod-validated (`lib/portfolio/schema.ts`).
- **Unreadable data** shows a calm notice and is never replaced unless the reader chooses "Start over". Writes touch this
  key only.
- **Stored on this device only:** not synced, and not in the private module backups.
- **Export and import:** a JSON file holding Portfolio only. Import is checked in full, then replaces everything only after
  an explicit confirmation. Refusals say why: not an export, damaged, too large, or a sale before its coins came in.
- **Isolation:** nothing writes to the platform store. Portfolio never feeds Wealth, Goals, Positions, Allocation,
  Activity or the Today widgets.

## Rollback
- Revert the Part 11 commits. The navigation entry and route go away. Older builds ignore the key.

## Tests
- `apps/web/lib/portfolio/portfolio.test.ts` covers:
  - cost basis with fees and partial sells;
  - zero holdings and unknown prices;
  - the below-zero refusal;
  - typed amounts;
  - storage isolation and unreadable data;
  - export and import;
  - Showcase.
- `apps/web/tests/portfolio.spec.ts` covers:
  - create, buy, a refused oversell, and the prices-unavailable state;
  - Wealth unchanged;
  - Showcase with no price request and no write on view;
  - unreadable data;
  - phone sizes.

## Follow-ups (Session J's lane)
- Connect the market catalog and prices on Alpha.
- Add `/app/portfolio` to the desktop freeze script's page list.
