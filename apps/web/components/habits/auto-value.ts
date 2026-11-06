import {measureValue} from '../../lib/habit-health-links/engine';
import type {AppliedCheckInV4, HabitHealthLinkV4} from '../../lib/habit-health-links/schema';
import type {HealthData} from '../../lib/health';
import type {Habit, HabitRule} from '../../lib/habits';

/**
 * Session AL fourth pass (N-056, N-086, D-220, B-163, NB-082, NB-142, NB-200): while a day stands as Health's automatic
 * tick left it, the card counts what Health holds now, in the habit's own unit: 8,800 steps of a Walk whose tick wrote
 * its 8,000 target, 2.25 liters once 2,250 mL is logged. The stored entry is unchanged (the tick sets the day to its
 * target and never adds, so a manual entry and Health count once); this only reads. Null when the units do not match,
 * Health is not read, the person changed the day after the tick, or Health holds no more than the entry.
 */
export function autoTickCount(habit: Habit, rule: HabitRule, date: string, marker: AppliedCheckInV4 | undefined, link: HabitHealthLinkV4 | undefined, health: HealthData | undefined): number | null {
  if (!marker || marker.undone || !link || !health || rule.type !== 'build') return null;
  const entry = habit.entries.find(e => e.date === date);
  if (!entry || entry.disposition !== 'logged' || Date.parse(entry.updatedAt) > Date.parse(marker.appliedAt)) return null;
  let live: number | null;
  try { live = measureValue(health, marker.healthDate, link); } catch { return null; }
  if (live === null) return null;
  const converted = inHabitUnit(marker.measure, live, rule);
  return converted !== null && converted > entry.count ? converted : null;
}
function inHabitUnit(measure: AppliedCheckInV4['measure'], value: number, rule: HabitRule): number | null {
  const m = rule.measurement, unit = 'unit' in m && typeof m.unit === 'string' ? m.unit.trim().toLowerCase() : '';
  if (measure === 'steps') return (m.kind === 'quantity' || m.kind === 'count' || m.kind === 'custom') && unit === 'steps' ? value : null;
  if (measure === 'water') {
    if (m.kind !== 'quantity' && m.kind !== 'custom') return null;
    if (/^(l|liters?|litres?)$/.test(unit)) return Math.round(value) / 1000;
    return unit === 'ml' ? value : null;
  }
  if (measure === 'activeMinutes' || measure === 'meditationMinutes' || measure === 'sleepMinutes') {
    if (m.kind !== 'duration') return null;
    return unit === 'hours' ? Math.round((value / 60) * 100) / 100 : value;
  }
  return null;
}
/**
 * Session AL fourth pass (MO-123; L2 request PR-019): a linked habit Health has not ticked off yet counts what Health holds
 * so far, in the habit's unit (500 mL logged → "0.5 / 2 liters"), while the person has logged nothing on the habit itself
 * that day. Null otherwise (a tick, an undone tick, a manual entry, another unit, nothing in Health).
 */
export function healthSoFar(habit: Habit, rule: HabitRule, date: string, marker: AppliedCheckInV4 | undefined, link: HabitHealthLinkV4 | undefined, health: HealthData | undefined): number | null {
  if (marker || !link || !health || rule.type !== 'build') return null;
  const entry = habit.entries.find(e => e.date === date);
  if (entry && (entry.disposition !== 'logged' || entry.count > 0)) return null;
  let live: number | null;
  try { live = measureValue(health, date, link); } catch { return null; }
  if (live === null || live <= 0) return null;
  const converted = inHabitUnit(link.measure, live, rule);
  return converted !== null && converted > 0 ? converted : null;
}
