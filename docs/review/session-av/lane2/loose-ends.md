# Lane 2 loose ends (slug `loose-ends`, branch `lane2/loose-ends`, from `lane2/batch2`)

Loose ends other builders found. One commit per item, each with unit tests. No stored format change in any item.
expected.json (the NOVA corpus) was not re-recorded; corpus changes are listed per item.

The money rule is Wealth → Spending's, kept in apps/web/lib/money-log/counted.ts (lane2/revb2a): an entry left out of the
figures and either side of a transfer count nothing, a shared cost counts the person's own share (`mineCents`), income
counts whole (`countedCents`).

## 1. Compare: "Spending above an amount" counted every expense in full

- Verdict: fixed.
- Fix: apps/web/lib/compare/engine.ts. The factor's expenses are the counted ones only (`isCounted`), and each day's
  spending sums `mineCents` (the person's own share) in exact cents. So the factor's currency, its usual day (the median)
  and the "above" test all follow the rule. A day whose entries are all left out or transfers stays a logged day, with
  no spending (a "without" day), not an unknown day. The `CompareSources.money` shape gains the optional `share`,
  `excluded` and `transfer` fields the money log already holds (no stored change).
- Tests: apps/web/lib/compare/engine.test.ts, "spending counts as Wealth → Spending does: …" (a 60.00 cost with share
  6.00, a left-out 90.00 and a 200.00 transfer on the same day: usual 5, nothing above 10; a currency used only by
  left-out entries is never the factor's; a left-out-only day reads as "without").
- Corpus: no case changes (no on-device answer reads this factor; the Showcase money log has no left-out entry, transfer
  or shared cost).
- Help text: none needed (Insights → Compare already says "Spending above an amount"; the figure now matches Wealth).

## 2. `tagTotals` counted a shared cost in full

- Verdict: fixed.
- Fix: apps/web/lib/money-tags/tags.ts `tagTotals` sums `countedCents` (it already skipped left-out entries and
  transfers): a shared cost counts the person's share under each of its tags; income whole. Used by Wealth → Spending →
  Tags and NOVA's "Spending by tag" (apps/web/lib/nova/cards/money-insights.ts).
- Tests: apps/web/lib/money-tags/tags.test.ts, "totals count as Wealth → Spending does: …" (90.00 with share 30.00 and
  12.00 with an out-of-range share count 42.00; a left-out cost, a transfer pair and a Settle-up refund add nothing).
- Corpus: no case changes (the Showcase money log has no shared cost).
- Help text: none needed.

## 3. The portfolio value alert wrote "10000 EUR"

- Verdict: fixed, as review b2a #7 (B2A-7, commit 4dab95f0) did for the portfolio move alert.
- Fix: apps/web/lib/price-alerts/engine.ts `portfolioAlertLine` and `checkPortfolioAlerts` write the alert's value and
  the value now with `formatCurrencyAmount` (lib/visual-format.ts, the display locale): "Mine is worth above
  €10,000.00: €10,250.45 now." The value now is still cut to two decimals first, never rounded up. The value alert's
  "already passed" status line (apps/web/components/price-alerts/portfolio-value-alert.tsx) says the same amounts the same
  way. A line already in the fired log (written by an older build) is shown as it was stored. The coin price alert's
  line ("Bitcoin below 63000 USD") was not part of this item and is unchanged.
- Tests: apps/web/lib/price-alerts/av-move.test.ts — two pins changed deliberately (labelled; new exact text
  "Mine is worth above €10,000.00: €10,250.45 now." and "Fictional coins worth below $20,000.00"), and a new test
  "writes the value and the value now with the money formatter, in English and Dutch" ("Mine worth below €2,500.50";
  nl-NL "€ 2.500,50" with a no-break space).
- Spec (the lead runs it): apps/web/tests/av-move-alert.spec.ts — four pins changed deliberately (labelled):
  "Value alert: Fictional coins is worth above $30,000.00: $35,000.00 now.", the status "Fictional coins is already
  above $30,000.00 (worth $35,000.00 now), so this alert is reached at once.", the list item "Fictional coins worth above
  $30,000.00 · reached", and Today's card "Fictional coins is worth above $30,000.00: $35,000.00 now.".
- Corpus: no case changes (no on-device answer reads the value alert's words).
- Help text: none needed.
