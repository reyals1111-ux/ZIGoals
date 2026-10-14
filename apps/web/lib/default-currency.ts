import {useSyncExternalStore} from 'react';

/**
 * Session AB-Cloud Part 8 (ADR-023 C25): the currency a money form starts with when the person never chose one: euro for a
 * device in the euro area (its region, from the browser's language and region), US dollars otherwise. Only the two
 * currencies the app keeps (USD, EUR); a stored choice always wins, and markets and AI prices are untouched.
 */
export type DefaultCurrency = 'USD' | 'EUR';
/** The euro area (ISO 3166-1 alpha-2), plus the microstates that use the euro by agreement. */
export const EURO_REGIONS: ReadonlySet<string> = new Set(['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK']);
/** The region of a BCP 47 locale ("nl-BE" → "BE"; "nl" → the language's likely region when the engine knows it). */
export function localeRegion(locale: string): string | null {
  try { const l = new Intl.Locale(locale); return (l.region ?? l.maximize().region ?? null)?.toUpperCase() ?? null; } catch { return null; }
}
export function defaultCurrency(locales: readonly string[] = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []): DefaultCurrency {
  for (const locale of locales) { const region = locale ? localeRegion(locale) : null; if (region) return EURO_REGIONS.has(region) ? 'EUR' : 'USD'; }
  return 'USD';
}
const never = () => () => {};
/** For a form's first render: USD on the server and during hydration, the device's default right after (no mismatch). */
export function useDefaultCurrency(): DefaultCurrency { return useSyncExternalStore(never, () => defaultCurrency(), () => 'USD'); }
