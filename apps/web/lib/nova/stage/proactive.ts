import {widgetSpec, type WidgetGate} from '../widgets/catalog';

/**
 * Session AM (ADR-038 A5): the gentle cards — opt-in, off by default. While NOVA is open, one widget may be put on the
 * stage for something the person's own records say is worth a glance: the day's plan in the morning, tasks due today,
 * habits still open in the evening (a streak at risk), a bill due within two days. Pure rules: the page gives the facts
 * it already has, this picks at most ONE card for now; each card shows at most once a day, at most three a day, and
 * under Calm at most one a day. A card whose page-data switch is off is never chosen. It is a widget on the stage and a
 * line under the star, never a notification and never a sound.
 */
export type GentleFacts = {
  hour: number;
  /** Tasks due today or overdue; habits not done yet today; days until the next bill (0 today, negative: overdue). null: not known. */
  tasksDue: number | null; habitsLeft: number | null; billInDays: number | null;
};
export type GentleCard = {id: string; why: string};
export const GENTLE_MAX_FULL = 3, GENTLE_MAX_CALM = 1;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function gentleCard(facts: GentleFacts, {calm, shown, gate, available}: {calm: boolean; shown: readonly string[]; gate: (g: WidgetGate) => boolean; available: (id: string) => boolean}): GentleCard | null {
  if (shown.length >= (calm ? GENTLE_MAX_CALM : GENTLE_MAX_FULL)) return null;
  const candidates: GentleCard[] = [];
  if (facts.billInDays !== null && facts.billInDays <= 2) candidates.push({id: 'bills', why: facts.billInDays < 0 ? 'A bill is past its date.' : facts.billInDays === 0 ? 'A bill is due today.' : facts.billInDays === 1 ? 'A bill is due tomorrow.' : 'A bill is due in two days.'});
  if (facts.tasksDue !== null && facts.tasksDue > 0) candidates.push({id: 'tasks', why: `${plural(facts.tasksDue, 'task is', 'tasks are')} due today.`});
  if (facts.habitsLeft !== null && facts.habitsLeft > 0 && facts.hour >= 18) candidates.push({id: 'habit-week', why: `${plural(facts.habitsLeft, 'habit is', 'habits are')} still open this evening. Your streaks are safe until the day ends.`});
  if (facts.hour >= 5 && facts.hour < 11) candidates.push({id: 'glance', why: 'Good morning. Here is your day at a glance.'});
  for (const c of candidates) {
    const g = widgetSpec(c.id)?.gate;
    if (!shown.includes(c.id) && available(c.id) && (!g || gate(g))) return c;
  }
  return null;
}
/** Whole local days from `today` to `due` (both YYYY-MM-DD); null when either is not a date. */
export function daysUntil(today: string, due: string | null | undefined): number | null {
  if (!due) return null;
  const a = Date.parse(`${today}T12:00:00Z`), b = Date.parse(`${due.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / 86_400_000);
}
