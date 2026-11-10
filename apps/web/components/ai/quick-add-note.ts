import {recordAction} from '../../lib/ai/store/actions';
import {AI_ACTIONS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import type {QuickAddSaved} from '../quick-add-line';

/**
 * Session AL fifth pass (Lisbon LA-032, #280–289d; Moscow MO-065): the Quick add line under ZIGi's and NOVA's on-device
 * answers, said and noted the same way in both.
 *
 * - A line that saves to Health while Health is not shared with the assistant says so first, in that assistant's name
 *   ("Health isn’t shared with NOVA, but saving this line still saves it to Health."), as ZIGi's panel already did.
 * - A saved line goes into the actions log NOVA → Activity reads ("Each line is a card you confirmed … or a line you saved
 *   with Quick add"), under the saved record's own Activity id with `via: 'quick-add'` (and `by: 'nova'` from NOVA's chat),
 *   so Activity marks that record's row and drops the line once the row is gone (the toast's Undo, Remove).
 */
export const HEALTH_LINE = /\b(?:water|glass(?:es)?|ml|litres?|liters?|ran|run|walked|walk|km|steps?|slept|sleep|weigh\w*|kg|lbs?|ate|eat|breakfast|lunch|dinner|snack|kcal|calories|workout|push-?ups?)\b/i;
export const healthOffQuickAdd = (assistant: 'ZIGi' | 'NOVA') => `Health isn’t shared with ${assistant}, but saving this line still saves it to Health.`;
const KIND: Partial<Record<QuickAddSaved['kind'], string>> = {water: 'log-water', weight: 'log-weight', steps: 'log-activity', activity: 'log-activity', habit: 'check-in'};
export function noteQuickAdd(saved: QuickAddSaved, assistant: 'ZIGi' | 'NOVA', storage: Pick<Storage, 'getItem' | 'setItem'> = getAppStorage(), now = new Date()): boolean {
  const kind = KIND[saved.kind];
  if (!saved.recordId || !kind) return false;
  recordAction(storage, {activityId: saved.recordId.slice(0, 200), kind, title: saved.title.replace(/\s+/g, ' ').trim().slice(0, 160) || 'Quick add', at: now.toISOString(), via: 'quick-add', ...(assistant === 'NOVA' ? {by: 'nova'} : {})}, now);
  try { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_ACTIONS_KEY})); } catch { /* no window */ }
  return true;
}
