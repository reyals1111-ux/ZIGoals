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
/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-121; Strides' most-voted request, "time logged in h/min"): a time habit's value
 * typed as time — "1:30", "1h 30m", "1 h 30 min", "90 min", "45m", "2 h", "1,5 h" (also the Dutch "1 u 30") — read into
 * the habit's own unit (minutes or hours). A plain number stays a number in that unit and is left to `readHabitNumber`
 * (this returns null). Throws with a sentence for a time that does not read ("1:75").
 */
const TIME_PART = /(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|uur|u|minutes?|mins?|m|minuten)(?![a-z])/gi;
export function readDurationText(raw: string, unit: 'minutes' | 'hours'): number | null {
  const text = raw.trim().toLowerCase();
  if (!text || /^[\d.,\s]+$/.test(text)) return null;
  let minutes: number | null = null;
  const clock = /^(\d{1,3}):(\d{1,2})$/.exec(text);
  if (clock) {
    if (Number(clock[2]) > 59) throw new Error('Minutes after the colon go from 00 to 59, like 1:30.');
    minutes = Number(clock[1]) * 60 + Number(clock[2]);
  } else {
    let rest = text, total = 0, found = false, hours = false, mins = false;
    for (const match of text.matchAll(TIME_PART)) {
      const value = Number(match[1]!.replace(',', '.')), isHours = /^(h|hr|hrs|hour|hours|u|uur)$/.test(match[2]!);
      if (isHours ? hours : mins) throw new Error('Name the hours and the minutes once each, like 1 h 30 min.');
      if (isHours) hours = true; else mins = true;
      total += isHours ? value * 60 : value; found = true; rest = rest.replace(match[0], ' ');
    }
    rest = rest.replace(/\band\b|\ben\b/g, '').trim();
    // "1 h 30" and "1u30": a bare number after the hours is the minutes.
    if (found && hours && !mins && /^\d{1,2}$/.test(rest) && Number(rest) <= 59) { total += Number(rest); rest = ''; }
    if (!found) return null;
    if (rest) throw new Error('Enter a time like 1:30, 1 h 30 min or 45 min.');
    minutes = total;
  }
  const value = unit === 'hours' ? minutes / 60 : minutes;
  return Math.round(value * 10_000) / 10_000;
}
