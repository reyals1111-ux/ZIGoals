'use client';
import {useDefaultCurrency} from '../../lib/default-currency';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {defaultMoneyCurrency, type HeldTotal, type MoneyCurrency} from '../../lib/wealth-currency';

/**
 * Session AL (P-DVR-22): the one default currency for a new money record (lib/wealth-currency.ts): the stored choice,
 * else the currency that holds the most of what is tracked (`held`, when the caller has it), else the device's.
 * USD during hydration, as useDefaultCurrency, so the first render never mismatches.
 */
export function useMoneyCurrency(held?: readonly HeldTotal[]): MoneyCurrency {
  const prefs = useUiPrefs(), device = useDefaultCurrency();
  return defaultMoneyCurrency({stored: prefs.loaded ? prefs.data.baseCurrency : undefined, held, device});
}
