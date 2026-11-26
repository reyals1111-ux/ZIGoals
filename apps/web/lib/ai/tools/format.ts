import {escapeData} from '../context/specialists';
import {formatUnits} from '@zigoals/chain-config';
import {isUnitWord, unitAmount} from '../../goals/goal-units';
import type {ToolEnv} from './env';
import type {DayRange} from './range';
import type {ToolOk, ToolRefusal} from './types';

/** Shared wording for the tools (Session V Part 2): the person's words escaped, honest numbers, one provenance line. */
export const text = (value: string, max = 80) => escapeData(value.replace(/\s+/g, ' ').trim()).slice(0, max);
/** A number without trailing zeros, or "unknown" (never 0) when it is not finite. */
export function num(value: number | null | undefined, digits = 1): string | 'unknown' {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : 'unknown';
}
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/**
 * Session AL (L4's request, DV-014, DV-078): a goal amount in the goal's own unit. A count goal's word reads "20 books" /
 * "1 book" (never "20 BOOKS"); a currency or a ticker stays "500 USD", "1.5 BTC" as before (model-facing, exact).
 */
export function goalQty(value: string, asset: string): string {
  return isUnitWord(asset) ? unitAmount(value, asset) : `${value} ${asset}`;
}
export const goalUnits = (units: string, decimals: number, asset: string) => goalQty(formatUnits(units, decimals), asset);
export function rangeText(range: DayRange): string { return range.from === range.to ? `${range.label} (${range.from})` : `${range.label} (${range.from} to ${range.to})`; }
/** "From your Habits journal on this device · Meditate · this month (2026-10-01 to 2026-10-05, Europe/Brussels)". */
export function provenance(env: ToolEnv, journal: string, subject: string | null, range: DayRange | null, zone: string | null): string {
  const parts = [`From your ${journal} on this device`];
  if (subject) parts.push(subject);
  if (range) parts.push(zone ? `${rangeText(range).replace(/\)$/, `, ${zone})`)}` : rangeText(range));
  return `${env.showcase ? 'Fictional Showcase data · ' : ''}${parts.join(' · ')}`;
}
/** Rows within the reply's row cap: the newest kept, and the cut stated ("showing 31 of 64 entries"). */
export function capRows<T>(rows: readonly T[], env: ToolEnv, newestLast = true): {rows: T[]; truncated: {shown: number; total: number} | null} {
  const max = env.limits.rows;
  if (rows.length <= max) return {rows: [...rows], truncated: null};
  return {rows: newestLast ? rows.slice(rows.length - max) : rows.slice(0, max), truncated: {shown: max, total: rows.length}};
}
export function ok(tool: string, label: string, provenanceLine: string, data: Record<string, unknown>, truncated: {shown: number; total: number} | null = null): ToolOk {
  return {ok: true, tool, label, provenance: provenanceLine, data, truncated};
}
export function refuse(tool: string, label: string, reason: ToolRefusal['reason'], refusal: string, choices?: ToolRefusal['choices']): ToolRefusal {
  return {ok: false, tool, label, reason, refusal, ...(choices ? {choices} : {})};
}
// Session AL second pass (Moscow MO-052, P-MO-12): both switches named where they are, and the Today condition in plain words.
// Session AL final pass (N-LA-08): ZIGi says that NOVA → Permissions (the place NOVA's own answer names, R2-2) shows these
// very two switches, so the two answers read as one setting, never as two different places for the same data.
// Session AW (p5-answers, FR-S-16; TIER 3, AI tools): one sentence and one action, as NOVA's own reply (FR-TJ-1): Allow
// Health in NOVA → Permissions opens Health to ZIGi and NOVA in one tap (it turns on NOVA's Health choice, "Health page data"
// and "Include Health" together; components/nova/panels/permissions-panel.tsx), never the switches to find one by one.
// Each stays a switch to close it again. The words still open "Health isn’t shared with ZIGi" (nova-env.ts HEALTH_REFUSAL).
// Session AW (fr-answers, FR-AW-9): without "(the button is there once Health is on your Today page)": the button was there
// anyway and the bracket made friends doubt it. The one case it is not (Health off the Today layout), NOVA → Permissions
// says so itself where the button would be (components/nova/panels/permissions-panel.tsx).
export const HEALTH_CLOSED = 'Health isn’t shared with ZIGi here, so nothing from Health is read. Tap Allow Health in NOVA → Permissions: one tap opens Health to ZIGi and NOVA.';
/** Session AU (D-ALLOW-HEALTH): the same sentence for a Dutch question on the device (ZIGi's own reply; tools and models keep the English one). */
export const HEALTH_CLOSED_NL = 'Health wordt hier niet met ZIGi gedeeld, dus er wordt niets uit Health gelezen. Tik op Allow Health in NOVA → Permissions: één tik opent Health voor ZIGi en NOVA.';
/**
 * Session AW (fr-answers review): the two cases where Allow Health is not shown, said as they are (permissions-panel.tsx
 * hides the button then and says the same there): an account is open and its Health permission is not on for this device,
 * or Health is not on this device's Today. Each still opens "Health isn’t shared with ZIGi" (nova-env.ts HEALTH_REFUSAL).
 */
export const HEALTH_CLOSED_BY: Record<'account' | 'layout', {en: string; nl: string}> = {
  account: {en: 'Health isn’t shared with ZIGi here, so nothing from Health is read. With your account open, Health is read only when the account’s Health permission is on for this device, and here it is off or not confirmed yet: Settings → Account & sync.',
    nl: 'Health wordt hier niet met ZIGi gedeeld, dus er wordt niets uit Health gelezen. Met je account open wordt Health alleen gelezen als de Health-toestemming van het account op dit apparaat aan staat, en hier staat die uit of is die nog niet bevestigd: Settings → Account & sync.'},
  layout: {en: 'Health isn’t shared with ZIGi here, so nothing from Health is read. Health is not on your Today layout on this device: add it to Today first, then Allow Health in NOVA → Permissions opens it in one tap.',
    nl: 'Health wordt hier niet met ZIGi gedeeld, dus er wordt niets uit Health gelezen. Health staat niet op je Today-indeling op dit apparaat: zet het eerst op Today, dan opent Allow Health in NOVA → Permissions het met één tik.'},
};
