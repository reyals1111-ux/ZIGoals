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
/** `fields`: the card's own field names for this measure, the first one filled when none is there (a check-in's duration is `minutes`, its count `value`). */
type Slot = {kind: string; fields: string[]; scale?: number; unit?: 'kg' | 'lb'};
const CLASSES: [RegExp, Slot[]][] = [
  [/^(?:glass(?:es)?|glas|glazen)$/i, [{kind: 'log-water', fields: ['glasses', 'millilitres']}]],
  [/^(?:ml|millilit(?:re|er)s?)$/i, [{kind: 'log-water', fields: ['millilitres', 'glasses']}]],
  [/^(?:l|lit(?:re|er)s?)$/i, [{kind: 'log-water', fields: ['millilitres', 'glasses'], scale: 1000}]],
  [/^(?:steps?|stappen)$/i, [{kind: 'log-steps', fields: ['steps']}]],
  [/^(?:minutes?|mins?|minuten|minuut)$/i, [{kind: 'log-meditation', fields: ['minutes']}, {kind: 'check-in', fields: ['minutes', 'value']}]],
  [/^(?:hours?|hrs?|uur|uren)$/i, [{kind: 'log-meditation', fields: ['minutes'], scale: 60}]],
  [/^(?:kg|kilos?|kilograms?)$/i, [{kind: 'log-weight', fields: ['value'], unit: 'kg'}]],
  [/^(?:lbs?|pounds?|pond)$/i, [{kind: 'log-weight', fields: ['value'], unit: 'lb'}]],
  [/^(?:reps?|push-?ups|times|keer)$/i, [{kind: 'counter', fields: ['count']}]],
  [/^(?:servings?|porties?|portie)$/i, [{kind: 'log-food', fields: ['quantity']}]],
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
      const field = slot.fields[0]!, value = field === 'millilitres' || field === 'steps' || field === 'minutes' || field === 'count' ? Math.round(cue.value * (slot.scale ?? 1)) : round(cue.value * (slot.scale ?? 1), 3);
      // The field of this measure the card already carries (a check-in's minutes, water's millilitres): never a second one beside it.
      const present = slot.fields.find(f => typeof card[f] === 'number'), current = present ? card[present] as number : undefined;
      if (present && (spoken.has(String(current)) || present === field && current === value)) return;
      if (card.kind === 'log-water' && present && present !== field) {
        // The other water field: a correct conversion of the spoken glasses (250 mL each) stays; anything else gives way.
        if (field === 'glasses' ? current === value * GLASS_ML : (current ?? 0) * GLASS_ML === value) return;
        delete card[present]; changed = true;
      } else if (present && present !== field) {
        // The same measure under the card's own name (a check-in's "minutes"): corrected there, in that name.
        if (current !== value) { card[present] = value; changed = true; }
        return;
      }
      if (field === 'value' && slot.unit && card.kind === 'log-weight' && card.unit !== slot.unit) { card.unit = slot.unit; changed = true; }
      if (current !== value) { card[field] = value; changed = true; }
    };
    if (Array.isArray(parsed)) parsed.forEach(fix); else fix(parsed);
    return changed ? `${fence}zigoals-action\n${JSON.stringify(parsed)}\n${fence}` : block;
  });
}
