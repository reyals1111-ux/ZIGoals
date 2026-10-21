/**
 * Session AF (L1, ADR-028 H17): the Earn calculator link. The Earn page opens the compound interest calculator at
 * `/app/wealth/calculator?from=earn&rate=<live APR %>&label=illustration`; the calculator fills its yearly return with that
 * rate, once, under an "illustration, not a promise" banner. Anything else in the address is ignored: a missing or
 * different `from` or `label`, a rate that is not a plain number from 0 to the calculator's 100 % limit with at most two
 * decimals, or a repeated key. Projections live only there, labelled; no option on the Earn page carries a projected rate.
 */
export const EARN_RATE_MAX = 100;
export function earnCalculatorPrefill(search: string): string | null {
  let params: URLSearchParams;
  try { params = new URLSearchParams(search); } catch { return null; }
  const one = (key: string) => { const all = params.getAll(key); return all.length === 1 ? all[0]! : null; };
  if (one('from') !== 'earn' || one('label') !== 'illustration') return null;
  const rate = one('rate');
  if (!rate || !/^\d{1,3}(\.\d{1,2})?$/.test(rate)) return null;
  const n = Number(rate);
  return Number.isFinite(n) && n > 0 && n <= EARN_RATE_MAX ? String(n) : null;
}
