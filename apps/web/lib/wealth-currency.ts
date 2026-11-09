/**
 * Session AL (P-DVR-22; BUG-065, G-024, G-022, PR-068): the one default currency a new money record starts in when the
 * person has not picked one in that form. In order:
 * 1. the person's own stored choice (`baseCurrency` in zigoals:ui-prefs:v1), when there is one;
 * 2. else the USD/EUR currency that holds the most of what they already track (the currency Wealth's headline leads
 *    with; magnitudes are compared to pick, nothing is converted or added across currencies);
 * 3. else the device's default (lib/default-currency: euro in the euro area, US dollars otherwise).
 * Only the two Alpha currencies (F: Alpha USD/EUR); the form still lets the person choose the other one.
 */
export type MoneyCurrency = 'USD' | 'EUR';
export type HeldTotal = {currency: string; value: bigint};
const isMoney = (code: string): code is MoneyCurrency => code === 'USD' || code === 'EUR';

export function defaultMoneyCurrency({stored, held = [], device}: {stored?: MoneyCurrency | null; held?: readonly HeldTotal[]; device: MoneyCurrency}): MoneyCurrency {
  if (stored) return stored;
  let lead: HeldTotal | undefined;
  for (const h of held) if (isMoney(h.currency) && h.value > 0n && (!lead || h.value > lead.value)) lead = h;
  return lead ? lead.currency as MoneyCurrency : device;
}

type HeldPosition = {asset: string; quantity: string; decimals: number; archivedAt?: string; valuation?: {value: string; currency: string; decimals: number}};
const wholeUnits = (units: string, decimals: number): bigint => { try { return BigInt(units) / 10n ** BigInt(Math.max(0, Math.min(36, decimals))); } catch { return 0n; } };
/**
 * Session AL final pass (N-MO-03): what is tracked, per USD/EUR currency, from the positions alone (no live prices, no
 * conversion; whole units are enough to compare magnitudes), for a form that has no Wealth overview at hand (Settings →
 * ZIGi's monthly cap). A position counts in its recorded value's currency, or, with no value, as cash in its own currency.
 */
export function heldTotals(positions: readonly HeldPosition[]): HeldTotal[] {
  const sums = new Map<string, bigint>();
  for (const p of positions) {
    if (p.archivedAt) continue;
    const currency = p.valuation ? p.valuation.currency : p.asset, value = p.valuation ? wholeUnits(p.valuation.value, p.valuation.decimals) : isMoney(p.asset) ? wholeUnits(p.quantity, p.decimals) : 0n;
    if (isMoney(currency) && value > 0n) sums.set(currency, (sums.get(currency) ?? 0n) + value);
  }
  return [...sums].map(([currency, value]) => ({currency, value}));
}
