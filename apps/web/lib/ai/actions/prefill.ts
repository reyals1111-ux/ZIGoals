import {HOLDING_CATEGORIES} from './holding-categories';

/**
 * The money hand-off (ADR-012, Part 5): ZIGi never adds a holding. A confirmed `prefill-holding` card stashes the
 * values in this tab's session storage, opens Wealth's own add-asset form (`/app/wealth?add=asset`), and the form reads
 * them once, pre-fills its fields and forgets them. The person reviews and saves, or closes the sheet; nothing is
 * written before that. Plain field texts only: no identifiers, no keys, nothing from the chat.
 */
export const PREFILL_KEY = 'zigoals:ai:prefill:v1';
export const PREFILL_ROUTE = '/app/wealth?add=asset';
const MAX_AGE_MS = 10 * 60_000;
const DECIMAL = /^\d+(\.\d+)?$/, CURRENCY = /^[A-Z]{3}$/;
const str = (v: unknown, max: number, min = 0): string | null => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;
export type HoldingPrefillRecord = {version: 1; at: number; category: (typeof HOLDING_CATEGORIES)[number]; name: string; quantity: string; currency: string; value?: string; symbol?: string; notes?: string};
/** Reads a hand-off record with plain checks (no schema library: the Wealth page ships this module); anything off returns null. */
export function readPrefillRecord(value: unknown): HoldingPrefillRecord | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (o.version !== 1 || typeof o.at !== 'number' || !Number.isInteger(o.at) || o.at < 0) return null;
  const allowed = new Set(['version', 'at', 'category', 'name', 'quantity', 'currency', 'value', 'symbol', 'notes']);
  if (Object.keys(o).some(k => !allowed.has(k))) return null;
  const category = typeof o.category === 'string' && (HOLDING_CATEGORIES as readonly string[]).includes(o.category) ? o.category as HoldingPrefillRecord['category'] : null;
  const name = str(o.name, 100, 1), quantity = str(o.quantity, 40, 1), currency = str(o.currency, 3, 3);
  if (!category || !name || !quantity || !DECIMAL.test(quantity) || !currency || !CURRENCY.test(currency)) return null;
  const record: HoldingPrefillRecord = {version: 1, at: o.at, category, name, quantity, currency};
  if (o.value !== undefined) { const v = str(o.value, 40, 1); if (!v || !DECIMAL.test(v)) return null; record.value = v; }
  if (o.symbol !== undefined) { const v = str(o.symbol, 30); if (v === null) return null; record.symbol = v; }
  if (o.notes !== undefined) { const v = str(o.notes, 2000); if (v === null) return null; record.notes = v; }
  return record;
}
export type HoldingPrefillInput = Omit<HoldingPrefillRecord, 'version' | 'at'>;
const tab = (storage?: Storage) => storage ?? (typeof window === 'undefined' ? null : window.sessionStorage);
/** Writes the hand-off; returns false when the tab's storage is unavailable (the person then types the values). */
export function stashPrefill(input: HoldingPrefillInput, now = Date.now(), storage?: Storage): boolean {
  const target = tab(storage); if (!target) return false;
  const record = readPrefillRecord({version: 1, at: now, ...input}); if (!record) return false;
  try { target.setItem(PREFILL_KEY, JSON.stringify(record)); return true; } catch { return false; }
}
/** Reads the hand-off once and removes it; stale (older than ten minutes) or unreadable hand-offs are dropped silently. */
export function takePrefill(now = Date.now(), storage?: Storage): HoldingPrefillInput | null {
  const target = tab(storage); if (!target) return null;
  let raw: string | null = null;
  try { raw = target.getItem(PREFILL_KEY); target.removeItem(PREFILL_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const record = readPrefillRecord(JSON.parse(raw)); if (!record) return null;
    const {version: _version, at, ...fields} = record; void _version;
    if (now - at > MAX_AGE_MS || at > now + 60_000) return null;
    return fields;
  } catch { return null; }
}
/** The add-asset form's category tab for a proposal category (the form says "Custom", the proposal "Custom asset"). */
export const pickerCategory = (category: HoldingPrefillInput['category']): string => category === 'Custom asset' ? 'Custom' : category;
