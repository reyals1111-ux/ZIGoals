import {parseNumberInput} from './numbers/parse';

const limit = (value: number) => value.toLocaleString('en-US', {maximumFractionDigits: 6});

/**
 * Session AL (3f): a number typed into a Habits form, read by the app's one reader (`parseNumberInput`: "0,5", ",5",
 * "1 234,5" and "1,234.5" all read), then held to the field's own bounds (a schedule interval, a target, a cost a day).
 * Same signature and the same sentences as `readFormNumber`, so the forms' messages stay as they were. Throws an Error
 * whose message can be shown as is.
 */
export function readHabitNumber(raw: string, {min = 0, max, whole = false, positive = false}: {min?: number; max: number; whole?: boolean; positive?: boolean}): number {
  const range = positive && min <= 0 ? `greater than 0 and at most ${limit(max)}` : `from ${limit(min)} to ${limit(max)}`;
  const message = `Enter ${whole ? 'a whole number' : 'a number'} ${range}.`;
  if (!raw.trim()) throw new Error(message);
  const parsed = parseNumberInput(raw);
  if (!parsed.ok) throw new Error(/could mean|mixes separators|plain number/.test(parsed.error) ? parsed.error : message);
  const number = parsed.value;
  if (whole && !Number.isInteger(number) || number < min || number > max || positive && number <= 0) throw new Error(message);
  return number;
}

/**
 * Session AL (NB-063, NB-114, H-013; P-NB-29): a timed habit's part-minute as a person reads it: "2 s", "49 s",
 * "5 min 30 s", and part-hours as "1 h 15 min", instead of "0.03" or "0.81". Whole amounts and other units return null,
 * so the caller keeps its own number. Rounded to the nearest second (minute for hours).
 */
export function durationCountText(count: number, unit: string | null | undefined): string | null {
  if (!Number.isFinite(count) || count < 0 || Number.isInteger(count)) return null;
  const u = (unit ?? '').trim().toLowerCase();
  if (u === 'minutes' || u === 'minute' || u === 'min') {
    const seconds = Math.round(count * 60), m = Math.floor(seconds / 60), s = seconds % 60;
    return m === 0 ? `${s} s` : s === 0 ? `${m} min` : `${m} min ${s} s`;
  }
  if (u === 'hours' || u === 'hour' || u === 'h') {
    const minutes = Math.round(count * 60), h = Math.floor(minutes / 60), m = minutes % 60;
    return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  return null;
}
