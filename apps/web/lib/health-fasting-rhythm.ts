import {addLocalDays} from './local-date';
import type {FastingHistoryRow} from './fasting/engine';

/**
 * Session AL fourth pass (C-MO-35, C-DVG-41): a fasting rhythm, built for consistency, not length. It counts the days a
 * fast reached its own target: how many in a row up to today (or up to yesterday, while today has none yet) and how
 * many of the last seven days. There is no "longest fast" and nothing rewards a longer fast than the one you chose
 * (the safety reason behind the earlier "no streaks" note in docs/product/features/HE6-fasting.md). `rows` are
 * fastingHistory's ended fasts; a fast counts on the day it started, in its own zone.
 */
export type FastingRhythm = {inARow: number; lastSeven: number; reachedDays: number};
export function fastingRhythm(rows: readonly FastingHistoryRow[], today: string): FastingRhythm {
  const reached = new Set(rows.filter(r => r.hours >= r.session.targetHours).map(r => r.day));
  let day = reached.has(today) ? today : addLocalDays(today, -1), inARow = 0;
  while (reached.has(day)) { inARow++; day = addLocalDays(day, -1); }
  let lastSeven = 0;
  for (let i = 0; i < 7; i++) if (reached.has(addLocalDays(today, -i))) lastSeven++;
  return {inARow, lastSeven, reachedDays: reached.size};
}
/** The card's line, or null before any fast reached its target. */
export function fastingRhythmText(r: FastingRhythm): string | null {
  if (!r.reachedDays) return null;
  const row = r.inARow ? `${r.inARow} ${r.inARow === 1 ? 'day' : 'days'} in a row` : 'none in a row right now';
  return `Fasts that reached your own target: ${row} · ${r.lastSeven} of the last 7 days. Rest days are fine; a longer fast is not counted as more.`;
}
