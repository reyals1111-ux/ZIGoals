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
