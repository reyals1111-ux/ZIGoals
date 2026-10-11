import {FASTING_KEY, emptyFasting, fastingSchema, type Fasting} from './schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
let last: {raw: string; data: Fasting} | null = null;
/** What this device holds: unreadable or invalid data reads as no sessions (`unreadable` says so) and is never touched by any automatic path. */
export function readFasting(storage: Read): {data: Fasting; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(FASTING_KEY); } catch { return {data: emptyFasting(), unreadable: true}; }
  if (raw === null) return {data: emptyFasting(), unreadable: false};
  if (last?.raw === raw) return {data: last.data, unreadable: false};
  try {
    const parsed = fastingSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {data: emptyFasting(), unreadable: true};
    last = {raw, data: parsed.data};
    return {data: parsed.data, unreadable: false};
  } catch { return {data: emptyFasting(), unreadable: true}; }
}
/** Applies a change and writes the result. Throws, and writes nothing, when the result is invalid, the key is unreadable or storage refuses. */
export function updateFasting(storage: ReadWrite, change: (current: Fasting) => Fasting): Fasting {
  const current = readFasting(storage);
  if (current.unreadable) throw Error('Your saved fasts on this device could not be read. They were not changed.');
  const next = fastingSchema.parse(change(current.data));
  const raw = JSON.stringify(next);
  storage.setItem(FASTING_KEY, raw);
  last = {raw, data: next};
  return next;
}
/** The person's explicit choice to replace unreadable sessions: the old bytes are copied to a recovery key first. */
export function startOverFasting(storage: ReadWrite): Fasting {
  const previous = storage.getItem(FASTING_KEY);
  if (previous !== null) storage.setItem(`${FASTING_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyFasting();
  storage.setItem(FASTING_KEY, JSON.stringify(next));
  last = null;
  return next;
}
