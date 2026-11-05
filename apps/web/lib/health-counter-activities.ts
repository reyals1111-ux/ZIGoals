import type {HealthData} from './health';
import type {HealthActivityRow} from './health-sleep-activities';
import {exerciseData} from './health-counters';
import {formatDate, formatNumber} from './visual-format';

/**
 * Session AL sweep 3 (DV-047c): each quick-counter day (Health → Quick counters, "Increase Push-ups") as an Activity row
 * under Health, the shape getHealthActivities gives. A counter day keeps only its count and its Health journal day, no
 * clock time, so the row sits at that day's local midnight, which Activity shows without a time. A day at 0 is not
 * listed; a deleted counter took its days with it. Read-only: nothing is stored.
 */
const midnight = (date: string) => { const d = new Date(`${date}T00:00:00`); return Number.isNaN(d.getTime()) ? `${date}T00:00:00.000Z` : d.toISOString(); };
export function getCounterActivities(data: Pick<HealthData, 'exercise'> | null | undefined): HealthActivityRow[] {
  if (!data?.exercise) return [];
  const exercise = exerciseData(data), names = new Map(exercise.counters.map(c => [c.id, c.name] as const));
  return exercise.days.flatMap(d => {
    const name = names.get(d.counterId);
    return name && d.count > 0 ? [{id: `counter:${d.id}`, category: 'HEALTH' as const, title: name, detail: `${formatNumber(d.count)} counted · ${formatDate(d.date)}`, at: midnight(d.date), day: d.date, href: '/app/health#exercise-counters-title', source: 'Counted by you'}] : [];
  }).sort((a, b) => b.at.localeCompare(a.at));
}
