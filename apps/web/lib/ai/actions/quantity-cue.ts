import {FENCE, repairJson} from './parse';
import {GLASS_ML} from './schema';
import {normalizeSpoken} from '../spoken/normalize';

/**
 * Session Z-Local Part 4 (ADR-020 L6): the quantity the person spoke, read from their own message on the device, for a
 * log card that missed it or misheard it. "Log two and a half litres" is 2.5 litres whatever the model made of the
 * words; when the message names exactly one quantity with a unit the card's kind takes, and the card either lacks that
 * field or carries a number that appears nowhere in the message (a number word misread), the card takes the message's
 * figure. A message with two quantities, a range ("3 to 5 glasses") or no unit leaves the card as the model wrote it.
 * The person still sees the figure on the card before adding it. Shared by the app and the harness (`applyDayCue`).
 */
type Slot = {kind: string; field: string; scale?: number; unit?: 'kg' | 'lb'};
const CLASSES: [RegExp, Slot[]][] = [
  [/^(?:glass(?:es)?|glas|glazen)$/i, [{kind: 'log-water', field: 'glasses'}]],
  [/^(?:ml|millilit(?:re|er)s?)$/i, [{kind: 'log-water', field: 'millilitres'}]],
  [/^(?:l|lit(?:re|er)s?)$/i, [{kind: 'log-water', field: 'millilitres', scale: 1000}]],
  [/^(?:steps?|stappen)$/i, [{kind: 'log-steps', field: 'steps'}]],
  [/^(?:minutes?|mins?|minuten|minuut)$/i, [{kind: 'log-meditation', field: 'minutes'}, {kind: 'check-in', field: 'value'}]],
  [/^(?:hours?|hrs?|uur|uren)$/i, [{kind: 'log-meditation', field: 'minutes', scale: 60}]],
  [/^(?:kg|kilos?|kilograms?)$/i, [{kind: 'log-weight', field: 'value', unit: 'kg'}]],
  [/^(?:lbs?|pounds?|pond)$/i, [{kind: 'log-weight', field: 'value', unit: 'lb'}]],
  [/^(?:reps?|push-?ups|times|keer)$/i, [{kind: 'counter', field: 'count'}]],
  [/^(?:servings?|porties?|portie)$/i, [{kind: 'log-food', field: 'quantity'}]],
];
const QUANTITY = /(?<![\d:.,])(\d+(?:\.\d+)?)\s*([A-Za-zÀ-ÿ-]+)/g;
const RANGE = /\b\d+(?:\.\d+)?\s*(?:to|tot|-|–)\s*\d+/i;

/** The one quantity the message names (number and unit class), or null when it names none, more than one, or a range. */
export function quantityCue(message: string): {value: number; unit: string; slots: Slot[]} | null {
  const text = normalizeSpoken(message);
  if (RANGE.test(text)) return null;
  const found: {value: number; unit: string; slots: Slot[]}[] = [];
  for (const m of text.matchAll(QUANTITY)) {
    const cls = CLASSES.find(([re]) => re.test(m[2]!)); if (!cls) continue;
    found.push({value: Number(m[1]), unit: m[2]!, slots: cls[1]});
  }
  return found.length === 1 ? found[0]! : null;
}
const digitsOf = (message: string): Set<string> => new Set((message.match(/\d+(?:[.,]\d+)?/g) ?? []).map(d => d.replace(',', '.')).map(d => String(Number(d))));
const round = (n: number, digits: number) => Number(n.toFixed(digits));

/** The reply with each log card of the cue's kind given the message's quantity where the card lacked it or misread it; untouched otherwise. */
export function applyQuantityCue(reply: string, message: string): string {
  const cue = quantityCue(message); if (!cue) return reply;
  const spoken = digitsOf(message);
  return reply.replace(FENCE, (block: string, fence: string, body: string) => {
    let parsed: unknown;
    try { parsed = repairJson(body); } catch { return block; }
    if (parsed === null || typeof parsed !== 'object') return block;
    let changed = false;
    const fix = (item: unknown) => {
      if (!item || typeof item !== 'object') return;
      const card = item as Record<string, unknown>, slot = cue.slots.find(s => s.kind === card.kind); if (!slot) return;
      const value = slot.field === 'millilitres' || slot.field === 'steps' || slot.field === 'minutes' || slot.field === 'count' ? Math.round(cue.value * (slot.scale ?? 1)) : round(cue.value * (slot.scale ?? 1), 3);
      const current = card[slot.field];
      if (typeof current === 'number' && (current === value || spoken.has(String(current)))) return;
      if (card.kind === 'log-water') {
        // The other water field: a correct conversion of the spoken glasses (250 mL each) stays; anything else gives way.
        const other = slot.field === 'glasses' ? 'millilitres' : 'glasses', otherValue = card[other];
        if (typeof otherValue === 'number' && (slot.field === 'glasses' ? otherValue === value * GLASS_ML : otherValue * GLASS_ML === value)) return;
        if (otherValue !== undefined) { delete card[other]; changed = true; }
      }
      if (slot.field === 'value' && slot.unit && card.kind === 'log-weight' && card.unit !== slot.unit) { card.unit = slot.unit; changed = true; }
      if (current !== value) { card[slot.field] = value; changed = true; }
    };
    if (Array.isArray(parsed)) parsed.forEach(fix); else fix(parsed);
    return changed ? `${fence}zigoals-action\n${JSON.stringify(parsed)}\n${fence}` : block;
  });
}
