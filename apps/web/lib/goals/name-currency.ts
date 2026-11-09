/**
 * Session AL final pass (N-003): the money currency a goal's name mentions ("Save €5,000 crypto safety fund" → EUR), so the
 * wizard can offer that currency when the person has not chosen one. Only USD and EUR (the goal currencies); a name that
 * mentions both, or neither, gives null. It is an offer only: nothing is switched without the person's click.
 */
export type NameCurrency = 'USD' | 'EUR';
const EUR = /€|\beur\b|\beuros?\b/i;
const USD = /(?:^|[^A-Za-z])(?:US)?\$|\busd\b|\b(?:us )?dollars?\b/i;
export function currencyInName(name: string): NameCurrency | null {
  const text = String(name ?? '').slice(0, 200);
  const eur = EUR.test(text), usd = USD.test(text);
  return eur === usd ? null : eur ? 'EUR' : 'USD';
}
