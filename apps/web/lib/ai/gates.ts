import type {AiSettings, PageArea} from './settings';
import {consent, type Consent, type ConsentInput} from './context/consent';
import {attachesContext} from './context/pages';

/**
 * What ZIGi may read, in one place (Session V Part 2, ADR-014). T's rules, unchanged, extended from "this page" to "each
 * area", because a question asked on one page can be about another (the meditation habit asked about on Health):
 * - an area's records go to the person's AI only when ZIGi is connected and that area's own switch is on (T's per-page
 *   "Share this page's data" switches, one per area);
 * - Health goes only through the three-part gate: the Health switch, "Include Health", Health in this device's Today
 *   layout, and, with an account, the account's Health permission read fail-closed (use-health-consent.ts);
 * - Settings attaches nothing (its account, sync and recovery controls are there), and a sensitive screen reads nothing.
 * `local` is the narrower set ZIGi may read to answer on this device with no AI at all (local answers, chips, the brief):
 * every area works before setup because nothing leaves the device, except Health, which still needs its gate.
 * Every consumer receives Health as `null` when `health` is false, so no code path can read it by mistake.
 */
export type AreaFlags = Record<PageArea, boolean>;
export type Gates = {
  /** ZIGi is connected to a provider or route (the record says enabled). */
  connected: boolean;
  /** Nothing at all is read: a sensitive screen is showing. */
  paused: boolean;
  /** T's view of the current page (the switch of the page's own area, Health only with its gate), for the page context. */
  page: Consent;
  /** Areas whose records may go to the person's AI with a question. */
  areas: AreaFlags;
  /** The three-part Health gate (and Health's own switch), for every path that leaves the device. */
  health: boolean;
  /** Areas ZIGi may read to answer on this device, with no AI. */
  local: AreaFlags;
  /** Health for local answers: the same three-part gate, never weaker. */
  localHealth: boolean;
  reasons: string[];
};
const NONE: AreaFlags = {today: false, goals: false, habits: false, health: false, wealth: false, help: false};
export type GatesInput = Omit<ConsentInput, 'area'> & {area: PageArea; sensitive: boolean};
/** The three-part Health gate on its own, whatever page the person is on. */
export function healthGate(input: Pick<ConsentInput, 'settings' | 'layoutHasHealth' | 'accountActive' | 'accountHealthPermitted'>): boolean {
  const {settings} = input;
  return settings.pageShare.health && settings.includeHealth && input.layoutHasHealth && (!input.accountActive || input.accountHealthPermitted === true);
}
export function aiGates(input: GatesInput): Gates {
  const page = consent(input);
  const health = healthGate(input);
  if (input.sensitive) return {connected: input.settings.enabled, paused: true, page: {page: false, health: false, reasons: ['Paused on this private screen: nothing is read.']}, areas: NONE, health: false, local: NONE, localHealth: false, reasons: ['Paused on this private screen: nothing is read.']};
  const share = input.settings.pageShare, attaches = attachesContext(input.pathname), connected = input.settings.enabled;
  const areas: AreaFlags = connected && attaches
    ? {today: share.today, goals: share.goals, habits: share.habits, health, wealth: share.wealth, help: share.help}
    : NONE;
  const local: AreaFlags = {today: true, goals: true, habits: true, health, wealth: true, help: true};
  return {connected, paused: false, page, areas, health: connected && attaches && health, local, localHealth: health, reasons: page.reasons};
}
/** The defaults before anything was chosen, for tests and for the shell: nothing shared, nothing paused. */
export const closedGates = (settings: AiSettings): Gates => aiGates({settings, area: 'help', pathname: '/app/help', layoutHasHealth: false, accountActive: false, accountHealthPermitted: null, sensitive: false});
