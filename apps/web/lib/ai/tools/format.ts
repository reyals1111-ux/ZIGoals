import {escapeData} from '../context/specialists';
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
export const HEALTH_CLOSED = 'Health isn’t shared with ZIGi — turn it on in Settings → ZIGi · your AI (Include Health), with Health on Today.';
