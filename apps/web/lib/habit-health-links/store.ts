import {HABIT_HEALTH_LINKS_KEY, MAX_APPLIED_CHECK_INS, emptyHabitHealthLinks, habitHealthLinksSchema, type HabitHealthLinks, type AppliedCheckInV4, type HabitHealthLinkV4, type HabitHealthLinksV4} from './schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
// The last parse, reused while the stored text is unchanged: every habit card reads this key.
let last: {raw: string; data: HabitHealthLinks} | null = null;
/** What this device holds: unreadable or invalid data reads as no links (`unreadable` says so) and is never touched by any automatic path. */
export function readHabitHealthLinks(storage: Read): {data: HabitHealthLinks; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(HABIT_HEALTH_LINKS_KEY); } catch { return {data: emptyHabitHealthLinks(), unreadable: true}; }
  if (raw === null) return {data: emptyHabitHealthLinks(), unreadable: false};
  if (last?.raw === raw) return {data: last.data, unreadable: false};
  try {
    const parsed = habitHealthLinksSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {data: emptyHabitHealthLinks(), unreadable: true};
    last = {raw, data: parsed.data};
    return {data: parsed.data, unreadable: false};
  } catch { return {data: emptyHabitHealthLinks(), unreadable: true}; }
}
/**
 * Applies a change and writes the result. Throws, and writes nothing, when the result is invalid, the key is unreadable or
 * storage refuses. The change may be written with the Session W helpers, but this key holds only the v1 measures: its
 * schema refuses a sleep, bedtime or meditation link (those live only in Health v4).
 */
export function updateHabitHealthLinks(storage: ReadWrite, change: (current: HabitHealthLinks) => HabitHealthLinksV4): HabitHealthLinks {
  const current = readHabitHealthLinks(storage);
  if (current.unreadable) throw Error('Your saved Health links on this device could not be read. They were not changed.');
  const next = habitHealthLinksSchema.parse(change(current.data));
  const raw = JSON.stringify(next);
  storage.setItem(HABIT_HEALTH_LINKS_KEY, raw);
  last = {raw, data: next};
  return next;
}
/**
 * The person's explicit choice to replace unreadable links: the old bytes are copied to a recovery key first, then the
 * key holds an empty record. Nothing else ever rewrites unreadable bytes.
 */
export function startOverHabitHealthLinks(storage: ReadWrite): HabitHealthLinks {
  const previous = storage.getItem(HABIT_HEALTH_LINKS_KEY);
  if (previous !== null) storage.setItem(`${HABIT_HEALTH_LINKS_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyHabitHealthLinks();
  storage.setItem(HABIT_HEALTH_LINKS_KEY, JSON.stringify(next));
  last = null;
  return next;
}
/** Sets or clears one habit's link; with `habitIds`, links of habits no longer in the journal are dropped too. */
export function setHabitHealthLink(current: HabitHealthLinksV4, habitId: string, link: HabitHealthLinkV4 | null, habitIds?: ReadonlySet<string>): HabitHealthLinksV4 {
  const links = habitIds ? Object.fromEntries(Object.entries(current.links).filter(([id]) => habitIds.has(id))) : {...current.links};
  if (link) links[habitId] = link; else delete links[habitId];
  return {...current, links};
}
export const appliedCheckIn = (current: HabitHealthLinksV4, habitId: string, date: string): AppliedCheckInV4 | undefined => current.applied.find(a => a.habitId === habitId && a.date === date);
/** Records that a check-in was made automatically. A day that already has a marker keeps it; past the cap the write is refused. */
export function recordAutoCheckIn(current: HabitHealthLinksV4, marker: AppliedCheckInV4): HabitHealthLinksV4 {
  if (appliedCheckIn(current, marker.habitId, marker.date)) return current;
  if (current.applied.length >= MAX_APPLIED_CHECK_INS) throw Error(`This device holds ${MAX_APPLIED_CHECK_INS} automatic check-ins, the most it keeps. Export everything, then start the links over to make room.`);
  return {...current, applied: [...current.applied, marker]};
}
/** The person undid an automatic check-in: it stays off for that day, and the card says so. */
export function markAutoCheckInUndone(current: HabitHealthLinksV4, habitId: string, date: string): HabitHealthLinksV4 {
  if (!appliedCheckIn(current, habitId, date)) return current;
  return {...current, applied: current.applied.map(a => a.habitId === habitId && a.date === date ? {...a, undone: true as const} : a)};
}
