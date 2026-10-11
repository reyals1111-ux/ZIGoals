import {addLocalDays} from '../local-date';
import {GUIDE_KEY, MAX_DISMISSALS, emptyGuide, guideSchema, type Guide} from './schema';
import {NUDGES, type NudgeKind} from './copy';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
/** What this device holds: unreadable or invalid bytes read as off (`unreadable` says so) and are never touched until the next explicit choice. */
export function readGuide(storage: Read): {data: Guide; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(GUIDE_KEY); } catch { return {data: emptyGuide(), unreadable: true}; }
  if (raw === null) return {data: emptyGuide(), unreadable: false};
  try { const parsed = guideSchema.safeParse(JSON.parse(raw)); return parsed.success ? {data: parsed.data, unreadable: false} : {data: emptyGuide(), unreadable: true}; } catch { return {data: emptyGuide(), unreadable: true}; }
}
const KEEP_DAYS = 28;
/** Dismissals older than the longest hiding window are dropped, so the key stays small. */
function pruned(dismissed: Guide['dismissed'], today: string): Guide['dismissed'] {
  const from = addLocalDays(today, -(KEEP_DAYS - 1));
  const kept = Object.entries(dismissed).filter(([, day]) => day >= from && day <= today).sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_DISMISSALS);
  return Object.fromEntries(kept);
}
/** The switch: writes the choice (and the day it was turned on). Throws, with nothing written, when storage refuses. */
export function setGuideEnabled(storage: ReadWrite, enabled: boolean, today: string): Guide {
  const current = readGuide(storage).data;
  const next = guideSchema.parse({version: 1, enabled, ...(enabled ? {enabledOn: current.enabled ? current.enabledOn ?? today : today} : {}), dismissed: pruned(current.dismissed, today)});
  storage.setItem(GUIDE_KEY, JSON.stringify(next));
  return next;
}
/** "Not today": hides one nudge from today for its own number of days. Throws, with nothing written, when the key is unreadable or storage refuses. */
export function dismissNudge(storage: ReadWrite, id: string, today: string): Guide {
  const current = readGuide(storage);
  if (current.unreadable) throw Error('This note could not be hidden on this device.');
  const next = guideSchema.parse({...current.data, dismissed: pruned({...current.data.dismissed, [id]: today}, today)});
  storage.setItem(GUIDE_KEY, JSON.stringify(next));
  return next;
}
/** The kind of a nudge id ("streak-notice:<habit>:<n>" → streak-notice). */
export const nudgeKind = (id: string): NudgeKind => id.split(':')[0] as NudgeKind;
/** Whether a dismissal still hides this nudge on `today`: one day for most, 7 for the quiet day, 28 for a streak or an insight. */
export function nudgeHidden(data: Guide, id: string, today: string): boolean {
  const day = data.dismissed[id]; if (!day) return false;
  const hideDays = NUDGES.find(n => n.kind === nudgeKind(id))?.hideDays ?? 1;
  return day <= today && addLocalDays(day, hideDays - 1) >= today;
}
