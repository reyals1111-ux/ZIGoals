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
