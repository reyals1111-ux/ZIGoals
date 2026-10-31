import {formatNumber} from '../visual-format';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';

/**
 * Session AK Part 8.3 and 8.4: ZIGi's short notes, made on this device from the person's own records with no model call.
 * - 8.3, the weekly note: what the week held (counts), one Health measure beside the week before, the longest running
 *   streak and, when one qualifies, one pairing from lib/insights ("seen together, not a cause").
 * - 8.4, the monthly balance note: from the balance wheel's life areas (lib/life-balance.ts), where this month's records
 *   gathered, which areas with goals or habits stayed quiet, and the area furthest along on average.
 * The wording rules of lib/insights hold: the notes observe and count; they never claim a cause and never advise (no
 * FORBIDDEN_INSIGHT_WORDS in the note's own words, no "try", "need", "must"). Unknown is never zero: a measure with nothing
 * recorded is left out, and an area with no goal or habit is not called quiet.
 */
export type Note = {title: string; lines: string[]; empty: boolean; fine: string};
/** Words the notes' own templates never use (the insights' list plus advice words); tests read every template against it. */
export const NOTE_FORBIDDEN = [...FORBIDDEN_INSIGHT_WORDS, 'try', 'need', 'must', 'ought', 'worse', 'fail'] as const;
const MAX_LINES = 3;

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
/** "A, B and C". */
export const listWords = (items: readonly string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

export type WeekInput = {
  period: 'week' | 'month';
  days: number;
  counts: {habitCheckIns: number; healthDays: number; contributions: number};
  /** The Life review's Health trends (now and the period before; null = not recorded). */
  trends: readonly {label: string; now: string | null; before: string | null}[];
  streak?: {title: string; streak: number; unit: string} | null;
  /** The strongest pairing lib/insights found (its own sentence, already free of causal words), or none. */
  pairing?: string | null;
};
const TREND_WORDS: Readonly<Record<string, (now: string, before: string, period: string) => string>> = {
  'Sleep a night': (n, b, p) => `Sleep averaged ${n} a night, beside ${b} the ${p} before.`,
  'Steps a day': (n, b, p) => `Steps averaged ${n} a day, beside ${b} the ${p} before.`,
  'Days with water': (n, b, p) => `Water was logged on ${n} days, beside ${b} the ${p} before.`,
  'Days with meals': (n, b, p) => `Meals were logged on ${n} days, beside ${b} the ${p} before.`,
};

/** 8.3: ZIGi's note on the week (or the month so far), three lines at most. */
export function periodNote(input: WeekInput): Note {
  const p = input.period, title = p === 'week' ? 'ZIGi’s note on your week' : 'ZIGi’s note on your month';
  const fine = 'Made on this device from your own records. It counts what happened together; it never says why. Not advice.';
  const parts: string[] = [];
  if (input.counts.habitCheckIns) parts.push(plural(input.counts.habitCheckIns, 'habit check-in'));
  if (input.counts.healthDays) parts.push(`Health records on ${formatNumber(input.counts.healthDays)} of ${formatNumber(input.days)} days`);
  if (input.counts.contributions) parts.push(plural(input.counts.contributions, 'goal contribution'));
  const lines: string[] = [];
  if (parts.length) lines.push(`This ${p}: ${listWords(parts)}.`);
  const trend = input.trends.find(t => t.now !== null && t.before !== null && TREND_WORDS[t.label]);
  if (trend) lines.push(TREND_WORDS[trend.label]!(trend.now!, trend.before!, p));
  if (input.pairing) lines.push(`Seen together, not a cause: ${input.pairing}`);
  else if (input.streak && input.streak.streak > 0) lines.push(`Your longest running streak: ${input.streak.title}, ${formatNumber(input.streak.streak)} ${input.streak.unit}.`);
  if (!lines.length) return {title, lines: [`A quiet ${p} in your records. This note fills in as you check in a habit, log Health or record a contribution.`], empty: true, fine};
  return {title, lines: lines.slice(0, MAX_LINES), empty: false, fine};
}

export type AreaInput = {label: string; items: number; progress: number | null; activity: number};
/** 8.4: the monthly balance note from the balance wheel's areas; `month` is the month's name as the page shows it. */
export function balanceNote(areas: readonly AreaInput[], month: string): Note {
  const title = `A note on your balance · ${month}`;
  const fine = 'From your goals, habits and Health records this month. An area with nothing in it is left out, never counted as zero. Not advice.';
  const active = areas.filter(a => a.activity > 0).sort((a, b) => b.activity - a.activity);
  const quiet = areas.filter(a => a.items > 0 && a.activity === 0).map(a => a.label);
  const known = areas.filter(a => a.progress !== null && a.items > 0).sort((a, b) => b.progress! - a.progress!);
  const lines: string[] = [];
  if (active.length) {
    const top = active.slice(0, 2).map(a => `${a.label} (${plural(a.activity, 'record')})`);
    lines.push(active.length === 1 ? `This month your records gathered in ${top[0]}.` : `This month your records gathered most in ${listWords(top)}.`);
  }
  if (quiet.length) lines.push(`Quiet so far this month: ${listWords(quiet.slice(0, 3))}${quiet.length > 3 ? ` and ${plural(quiet.length - 3, 'other')}` : ''}, with goals or habits and no record yet.`);
  if (known[0]) lines.push(`Furthest along on average: ${known[0].label}, ${formatNumber(Math.round(known[0].progress! * 100))}% of the way across what is known.`);
  if (!lines.length) return {title, lines: ['Your wheel is still empty this month. Each goal, habit and Health record adds to its life area, and this note follows.'], empty: true, fine};
  return {title, lines: lines.slice(0, MAX_LINES), empty: false, fine};
}

/** True when a text uses none of the words a note never uses (whole words, any case). */
export const noteWordsOk = (text: string) => !NOTE_FORBIDDEN.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
