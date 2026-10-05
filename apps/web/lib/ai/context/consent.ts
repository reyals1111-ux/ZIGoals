import type {AiSettings, PageArea} from '../settings';
import {attachesContext} from './pages';

/**
 * What may be attached (ADR-012). Every page has its own switch (on by default once connected, Health off). Health
 * records travel only when all of these hold: the Health switch, "Include Health" in the AI settings, Health being part
 * of the person's Today layout (the device-level gate Today's own widgets use), and, when an account is open, the
 * account's Health permission read fail-closed from what this device has persisted (use-health-consent.ts). The
 * Settings page attaches nothing, whatever the switches say.
 */
export type ConsentInput = {
  settings: AiSettings;
  area: PageArea;
  pathname: string;
  /** Health is one of the domains the person's Today layout shows (visibleDomains includes "health"). */
  layoutHasHealth: boolean;
  /** An account is open in this tab. */
  accountActive: boolean;
  /** The account's Health permission as persisted on this device; null while unknown (treated as not permitted). */
  accountHealthPermitted: boolean | null;
};
export type Consent = {page: boolean; health: boolean; reasons: string[]};
export function consent(input: ConsentInput): Consent {
  const reasons: string[] = [];
  if (!input.settings.enabled) return {page: false, health: false, reasons: ['ZIGi is not connected.']};
  if (!attachesContext(input.pathname)) return {page: false, health: false, reasons: ['Settings holds your account, sync and recovery controls: nothing from this page is attached.']};
  const page = input.settings.pageShare[input.area];
  if (!page) reasons.push(`Sharing is off for ${input.area === 'today' ? 'Today' : input.area[0]!.toUpperCase() + input.area.slice(1)} in Settings → ZIGi · your AI.`);
  let health = page;
  if (health && !input.settings.pageShare.health) { health = false; reasons.push('Health: the Health page switch is off.'); }
  if (health && !input.settings.includeHealth) { health = false; reasons.push('Health: "Include Health" is off (its default).'); }
  if (health && !input.layoutHasHealth) { health = false; reasons.push('Health: not part of your Today layout on this device.'); }
  if (health && input.accountActive && input.accountHealthPermitted !== true) { health = false; reasons.push(input.accountHealthPermitted === null ? 'Health: this account\'s Health permission could not be confirmed on this device.' : 'Health: this account\'s Health sync is off or held, so Health stays out.'); }
  return {page, health, reasons};
}
