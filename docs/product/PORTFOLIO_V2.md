# Portfolio v2 (Session W Part 15)

Portfolio keeps crypto portfolios on this device (synced only with the opt-in of ADR-013), each in USD or EUR and marked
real or hypothetical. Part 15 makes it a full view of each portfolio. Nothing here changes Wealth, Goals, Positions or Today,
and the stored format (`zigoals:portfolio:v1`) is unchanged.

## What a portfolio shows
- **Header:** the value (known value when a coin has no price, with how many are not counted), the 24-hour change of what
  is held now, the all-time result and the cost basis, in the portfolio's own currency. Portfolios in other currencies are
  never added in; real and hypothetical portfolios are never added together.
- **Value over time:** 24H, 7D, 30D, 90D, 1Y and All, with the exact values in a table.
- **Allocation:** a donut of the known value with a legend (coin, share, value); beyond six coins the rest is "Other".
- **Holdings:** price, 1h / 24h / 7d change, the 7-day line, holdings, value, average cost and result, one row per coin,
  each linking to the coin's page. Phones keep the coin, its 24h change, value and result.
- **Transactions:** every transaction, newest first, 20 at a time, with a coin filter and Remove.
- **Favourite markets:** the shared Markets favourites (at most 8), and **Find a coin** for any coin in the catalog.

## A coin's page (`/app/portfolio/coin/<id>`, `?portfolio=<id>`)
Price and 1h / 24h / 7d change, your position in the chosen portfolio (holdings, value, average cost, unrealized and
realized result), the price chart, the market figures CoinGecko observed (market cap, 24h volume, circulating, total and
maximum supply), your transactions in that coin with a form preset to it, and Add / Remove favourite.

## How the numbers are worked out
- **Average cost** (unchanged from Session I): a buy adds quantity × price + fee; a transfer in without a price makes the
  cost unknown until the holding returns to zero; a sell or transfer out keeps the average cost of what remains.
- **Realized result:** each sell's quantity × price − fee − the average cost of what it sold; a fee on a transfer out is a
  cost. Unknown if a sale happened while the cost was unknown.
- **Unrealized result:** value − cost basis, only with a price for every coin held and a known cost.
- **All-time result:** realized + unrealized, and its share of everything invested (all buys and priced transfers in,
  with their fees).
- **24h change:** for each held coin with a value and CoinGecko's 24h change *c* (%), value × *c* / (100 + *c*); coins
  without either are left out and counted ("2 of 3 coins have a 24h change").
- **Value over time:** at 97 moments across the range, each coin held then (by transaction date; a transaction counts from
  the start of its date, UTC) times its last observed price at or before that moment. A moment where a held coin has no
  observed price yet is a gap, never a guess. The range's change includes buys and sells. "All" starts at the first
  transaction, at most one year back (CoinGecko's history here goes back one year), and says so.

## Where the market data comes from
| What | Route | Provider |
|---|---|---|
| Price | `/api/market-quotes` (unchanged) | CoinGecko simple price |
| 24h change, 7-day line, logo | `/api/market-insights` (unchanged) | CoinGecko `/coins/markets` |
| 1h and 7d change, market cap, 24h volume, supplies | **`/api/market-detail`** → QuoteService **`/insights-detail`** | CoinGecko `/coins/markets` with `price_change_percentage=1h,24h,7d` |
| Value over time, the coin's chart | `/api/market-history` (unchanged) | CoinGecko `/coins/{id}/market_chart` |

Every request names public coin identities only, in batches; nothing about holdings leaves the device. CoinGecko reports
a 0 for a size it does not have, so a 0 is shown as "Not provided", like a missing figure. Stale data says it needs a
refresh, with its time; "No price" is never 0. CoinGecko documentation read 2026-10-07:
https://docs.coingecko.com/demo/reference/coins-markets (fields nullable; refreshed every 60 s on the Demo API).

**Owner action:** the 1h / 7d change and the market figures need the market coordinator redeployed from this release
(FINAL_ACCTEST_REDEPLOY.md, Session W changes). Until then they read "Not provided" and everything else works. Market
details are admitted and charged exactly like insights (the same cost key), so the private `MARKET_POLICY` is unchanged;
COST_MODEL (Part 25) gives the extra coordinator load.

## Showcase
The Showcase asks no market service: a labelled fixture line per coin ends at its fixture price and gives its changes,
sparklines and chart; its market sizes are round fixtures ("Showcase fixture figures, not market data").
