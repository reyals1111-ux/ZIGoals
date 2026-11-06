import type {HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {dailySeries, summary} from '../sleep/engine';
import {elapsedMs} from '../fasting/engine';
import {healthDay} from '../health-daily';
import type {Fasting} from '../fasting/schema';
import {weightChangeText, type WeightUnit} from '../health-units';
import {formatMinutes} from '../zone-time';
import {formatNumber} from '../visual-format';

/**
 * Session AL (P-MO-79; MO-042, C-MO-58): "This week" in one place: the weight change, sleep against your own goal,
 * steps against your own target and the fasts, over the last seven journal days ending `today`. Each line says what it
 * read, and a part with nothing logged says so (unknown is not zero). Information, never advice.
 */
export type DigestLine = {key: 'weight' | 'sleep' | 'steps' | 'fasts'; label: string; text: string; known: boolean};
export function weekDigest(data: HealthData, fasting: Fasting | null, today: string, unit: WeightUnit): DigestLine[] {
  const from = addLocalDays(today, -6), inWeek = (d: string) => d >= from && d <= today;
  const weights = data.weights.filter(w => inWeek(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const weight: DigestLine = weights.length >= 2
    ? {key: 'weight', label: 'Weight', known: true, text: `${weightChangeText(weights.at(-1)!.grams - weights[0]!.grams, unit)} over ${weights.length} readings`}
    : {key: 'weight', label: 'Weight', known: false, text: weights.length ? 'One reading this week: a second shows the change' : 'No reading this week'};
  const sleep = data.sleep ? summary(dailySeries(data.sleep, today, 7)) : null, goal = data.sleep?.goal?.minutes ?? null;
  const sleepLine: DigestLine = sleep
    ? {key: 'sleep', label: 'Sleep', known: true, text: `${formatMinutes(sleep.asleep)} a night over ${sleep.nights} ${sleep.nights === 1 ? 'night' : 'nights'}${goal ? `; your goal ${formatMinutes(goal)}` : ''}`}
    : {key: 'sleep', label: 'Sleep', known: false, text: 'No night logged this week'};
  const days = new Map<string, number>();
  for (const a of data.activity) if (inWeek(a.date) && a.steps > 0) days.set(a.date, (days.get(a.date) ?? 0) + a.steps);
  const avg = days.size ? Math.round([...days.values()].reduce((x, y) => x + y, 0) / days.size) : null, target = data.targets.steps;
  const steps: DigestLine = avg === null ? {key: 'steps', label: 'Steps', known: false, text: 'No steps logged this week'}
    : {key: 'steps', label: 'Steps', known: true, text: `${formatNumber(avg)} a day over ${days.size} logged ${days.size === 1 ? 'day' : 'days'}${target ? `; your target ${formatNumber(target)}, reached on ${[...days.values()].filter(v => v >= target).length}` : ''}`};
  const fasts = (fasting?.sessions ?? []).filter(s => s.endedAt !== null && inWeek(healthDay(s.timeZone, new Date(s.startedAt))));
  const hours = fasts.map(s => elapsedMs(s, new Date(s.endedAt!)).ms / 3_600_000);
  const fastLine: DigestLine = fasts.length
    ? {key: 'fasts', label: 'Fasts', known: true, text: `${fasts.length} ${fasts.length === 1 ? 'fast' : 'fasts'}, ${formatNumber(Math.round(hours.reduce((x, y) => x + y, 0) / hours.length * 10) / 10)} h on average`}
    : {key: 'fasts', label: 'Fasts', known: false, text: 'No fast this week'};
  return [weight, sleepLine, steps, fastLine];
}
