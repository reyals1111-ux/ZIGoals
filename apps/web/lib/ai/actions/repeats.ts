import type {Action} from './schema';

/**
 * Session AJ (item 9; real-model `today-plan-week` t2): handles and new-habit references are numbered per reply, and a
 * model answering a follow-up re-sent the cards of its earlier reply (the person had them already, added or not). A card
 * that an earlier reply of the same chat proposed with the same values is not shown again: the reply says how many were
 * left out. "The same" ignores the per-reply references (new1, h2, r1: their numbers can differ between replies) and the
 * case and spacing of words; any other difference (another amount, day or time) keeps the card.
 */
const PER_REPLY_REF = /^(?:new\d{1,2}|[hgfrcm]\d{1,3})$/i;
function shape(value: unknown): unknown {
  if (typeof value === 'string') return PER_REPLY_REF.test(value.trim()) ? '#ref' : value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => k !== 'ref').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, shape(v)]));
  return value;
}
export const cardIdentity = (action: Action): string => JSON.stringify(shape(action));
/** The cards of this reply that no earlier reply of the chat proposed, and how many were left out as repeats. */
export function withoutRepeats(earlier: readonly (readonly Action[])[], actions: readonly Action[]): {kept: Action[]; repeated: number} {
  const seen = new Set(earlier.flat().map(cardIdentity));
  const kept = actions.filter(a => !seen.has(cardIdentity(a)));
  return {kept, repeated: actions.length - kept.length};
}
