import {z} from 'zod';
import {HOLDING_CATEGORIES} from './schema';

/**
 * The money hand-off (ADR-012, Part 5): ZIGi never adds a holding. A confirmed `prefill-holding` card stashes the
 * values in this tab's session storage, opens Wealth's own add-asset form (`/app/wealth?add=asset`), and the form reads
 * them once, pre-fills its fields and forgets them. The person reviews and saves, or closes the sheet; nothing is
 * written before that. Plain field texts only: no identifiers, no keys, nothing from the chat.
 */
export const PREFILL_KEY = 'zigoals:ai:prefill:v1';
export const PREFILL_ROUTE = '/app/wealth?add=asset';
const MAX_AGE_MS = 10 * 60_000;
export const holdingPrefillSchema = z.strictObject({
  version: z.literal(1), at: z.number().int().nonnegative(),
  category: z.enum(HOLDING_CATEGORIES), name: z.string().trim().min(1).max(100), quantity: z.string().trim().regex(/^\d+(\.\d+)?$/), currency: z.string().trim().regex(/^[A-Z]{3}$/),
  value: z.string().trim().regex(/^\d+(\.\d+)?$/).optional(), symbol: z.string().trim().max(30).optional(), notes: z.string().trim().max(2000).optional(),
});
export type HoldingPrefillRecord = z.infer<typeof holdingPrefillSchema>;
export type HoldingPrefillInput = Omit<HoldingPrefillRecord, 'version' | 'at'>;
const tab = (storage?: Storage) => storage ?? (typeof window === 'undefined' ? null : window.sessionStorage);
/** Writes the hand-off; returns false when the tab's storage is unavailable (the person then types the values). */
export function stashPrefill(input: HoldingPrefillInput, now = Date.now(), storage?: Storage): boolean {
  const target = tab(storage); if (!target) return false;
  try { target.setItem(PREFILL_KEY, JSON.stringify(holdingPrefillSchema.parse({version: 1, at: now, ...input}))); return true; } catch { return false; }
}
/** Reads the hand-off once and removes it; stale (older than ten minutes) or unreadable hand-offs are dropped silently. */
export function takePrefill(now = Date.now(), storage?: Storage): HoldingPrefillInput | null {
  const target = tab(storage); if (!target) return null;
  let raw: string | null = null;
  try { raw = target.getItem(PREFILL_KEY); target.removeItem(PREFILL_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const {version: _version, at, ...fields} = holdingPrefillSchema.parse(JSON.parse(raw)); void _version;
    if (now - at > MAX_AGE_MS || at > now + 60_000) return null;
    return fields;
  } catch { return null; }
}
/** The add-asset form's category tab for a proposal category (the form says "Custom", the proposal "Custom asset"). */
export const pickerCategory = (category: HoldingPrefillInput['category']): string => category === 'Custom asset' ? 'Custom' : category;
