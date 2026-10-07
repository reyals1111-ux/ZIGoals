import type {Sleep} from './schema';
import {asleep, nightDay} from './engine';
import {addDays, formatMinutes} from '../zone-time';

/**
 * Sleep patterns from the person's own nights (Session W Part 4), under the rules of the existing insights
 * (lib/insights/engine.ts): at least 14 logged nights in the window, at least 5 on each side, descriptive words only
 * (none of "because", "helps", "leads to", "improves", "causes", "should", "better", "more"), and always "a pattern,
 * not proof". They are shown in the Sleep view only.
 */
export const SLEEP_WINDOW_DAYS = 60, SLEEP_MIN_NIGHTS = 14, SLEEP_MIN_SIDE = 5;
export type SleepInsight = {id: string; sentence: string; withTag: {nights: number; average: number}; without: {nights: number; average: number}; window: {start: string; end: string}};
export function sleepInsights(s: Sleep, today: string): SleepInsight[] {
  const start = addDays(today, 1 - SLEEP_WINDOW_DAYS);
  const nights = s.nights.filter(n => n.kind === 'night' && n.end !== null).filter(n => { const day = nightDay(n)!; return day >= start && day <= today; });
  if (nights.length < SLEEP_MIN_NIGHTS) return [];
  const tags = [...new Set(nights.flatMap(n => n.tags ?? []))];
  const out: SleepInsight[] = [];
  for (const tag of tags) {
    const yes = nights.filter(n => n.tags?.includes(tag)), no = nights.filter(n => !n.tags?.includes(tag));
    if (yes.length < SLEEP_MIN_SIDE || no.length < SLEEP_MIN_SIDE) continue;
    const avg = (list: typeof nights) => Math.round(list.reduce((t, n) => t + asleep(n)!.minutes, 0) / list.length);
    const a = avg(yes), b = avg(no);
    if (Math.abs(a - b) < 20) continue;
    out.push({id: `sleep-tag:${tag}`, sentence: `On nights you tagged “${tag}”, you slept ${formatMinutes(a)} on average; on your other nights, ${formatMinutes(b)}. A pattern in your own log, not proof of a cause.`, withTag: {nights: yes.length, average: a}, without: {nights: no.length, average: b}, window: {start, end: today}});
  }
  return out.sort((x, y) => Math.abs(y.withTag.average - y.without.average) - Math.abs(x.withTag.average - x.without.average)).slice(0, 3);
}
