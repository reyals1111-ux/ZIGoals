import type {HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {nightDay} from '../sleep/engine';

/**
 * Session AL third pass (GAP-073, C-MO-55): "your week in Health", the analytics-free stand-in for an app's usage
 * funnel: on how many of the last seven journal days you logged anything, and how many entries, counted from the journal
 * itself on this device. Nothing is tracked, timed or sent; no score and no streak (a quiet day is fine).
 */
export type WeekUsage = {daysLogged: number; entries: number; byKind: {kind: 'meals' | 'water' | 'weight' | 'movement' | 'sleep'; entries: number}[]};
export function weekUsage(data: HealthData, today: string): WeekUsage {
  const from = addLocalDays(today, -6), inWeek = (d: string | null) => !!d && d >= from && d <= today, days = new Set<string>();
  const count = (dates: (string | null)[]) => { let n = 0; for (const d of dates) if (inWeek(d)) { days.add(d!); n++; } return n; };
  const byKind: WeekUsage['byKind'] = [
    {kind: 'meals', entries: count(data.diary.map(e => e.date))},
    {kind: 'water', entries: count((data.daily?.water ?? []).map(w => w.date))},
    {kind: 'weight', entries: count(data.weights.map(w => w.date))},
    {kind: 'movement', entries: count(data.activity.map(a => a.date))},
    {kind: 'sleep', entries: count(('sleep' in data && data.sleep ? data.sleep.nights : []).map(n => n.end ? nightDay(n) : null))},
  ];
  return {daysLogged: days.size, entries: byKind.reduce((t, k) => t + k.entries, 0), byKind: byKind.filter(k => k.entries > 0)};
}
/** One plain sentence for the card. */
export function weekUsageText(u: WeekUsage): string {
  if (!u.entries) return 'Nothing logged in Health in the last seven days. That is fine.';
  const parts = u.byKind.map(k => `${k.entries} ${k.kind === 'meals' ? (k.entries === 1 ? 'meal entry' : 'meal entries') : k.kind === 'water' ? (k.entries === 1 ? 'water entry' : 'water entries') : k.kind === 'weight' ? (k.entries === 1 ? 'weight' : 'weights') : k.kind === 'movement' ? (k.entries === 1 ? 'movement entry' : 'movement entries') : (k.entries === 1 ? 'night' : 'nights')}`);
  return `You logged on ${u.daysLogged} of the last 7 days: ${parts.join(', ')}.`;
}
