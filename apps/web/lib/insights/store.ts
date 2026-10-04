import {addLocalDays} from '../local-date';
import {DISMISS_DAYS, INSIGHTS_KEY, emptyInsights, insightsSchema, type Insights} from './schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
/** Unreadable or invalid bytes mean "nothing dismissed" (`unreadable` says so) and are never rewritten. */
export function readInsights(storage: Read): {data: Insights; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(INSIGHTS_KEY); } catch { return {data: emptyInsights(), unreadable: true}; }
  if (raw === null) return {data: emptyInsights(), unreadable: false};
  try { const parsed = insightsSchema.safeParse(JSON.parse(raw)); return parsed.success ? {data: parsed.data, unreadable: false} : {data: emptyInsights(), unreadable: true}; } catch { return {data: emptyInsights(), unreadable: true}; }
}
/** The ids still hidden on `today`: a dismissal lasts 28 days from its date. */
export function hiddenInsights(data: Insights, today: string): Set<string> {
  const from = addLocalDays(today, -(DISMISS_DAYS - 1));
  return new Set(Object.entries(data.dismissed).filter(([, day]) => day >= from && day <= today).map(([id]) => id));
}
/** Dismisses one card for 28 days; dismissals that no longer hide anything are dropped, so the key stays small. Throws, with nothing written, when the key is unreadable or storage refuses. */
export function dismissInsight(storage: ReadWrite, id: string, today: string): Insights {
  const current = readInsights(storage);
  if (current.unreadable) throw Error('This card could not be dismissed on this device.');
  const from = addLocalDays(today, -(DISMISS_DAYS - 1));
  const dismissed = Object.fromEntries(Object.entries(current.data.dismissed).filter(([, day]) => day >= from));
  const next = insightsSchema.parse({version: 1, dismissed: {...dismissed, [id]: today}});
  storage.setItem(INSIGHTS_KEY, JSON.stringify(next));
  return next;
}
/** The person's explicit choice to replace unreadable dismissals: the old bytes are copied to a recovery key first. */
export function startOverInsights(storage: ReadWrite): Insights {
  const previous = storage.getItem(INSIGHTS_KEY);
  if (previous !== null) storage.setItem(`${INSIGHTS_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyInsights();
  storage.setItem(INSIGHTS_KEY, JSON.stringify(next));
  return next;
}
