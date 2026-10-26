import {addLocalDays, localWeekday} from '../local-date';
import type {HealthData} from '../health';
import {scaleNutrition} from '../health';
import {formatDate} from '../visual-format';

/**
 * N12: food insight cards over the person's own diary, honest and without judgement: the best-protein days, late-evening
 * eating (Snacks or Dinner entries created after 21:00 local, by the entry's own stamp), the most-logged foods, and
 * weekdays against weekends. Each card says the days it read; a card with too little to read is not shown.
 */
export type InsightCard = {id: string; title: string; line: string; detail: string[]};
const WINDOW = 28, MIN_DAYS = 7;
export function foodInsights(data: HealthData, today: string, zone?: string | null): InsightCard[] {
  const first = addLocalDays(today, -(WINDOW - 1));
  const entries = data.diary.filter(d => d.date >= first && d.date <= today);
  const days = new Map<string, {kcal: number; protein: number}>();
  for (const e of entries) { const n = scaleNutrition(e.snapshot.nutrients, e.quantityMilli); const d = days.get(e.date) ?? {kcal: 0, protein: 0}; d.kcal += n.kcal ?? 0; d.protein += n.proteinMg ?? 0; days.set(e.date, d); }
  if (days.size < MIN_DAYS) return [];
  const cards: InsightCard[] = [];
  const best = [...days.entries()].sort((a, b) => b[1].protein - a[1].protein).slice(0, 3).filter(([, v]) => v.protein > 0);
  if (best.length) cards.push({id: 'protein-days', title: 'Best-protein days', line: `Your top protein days of the last ${days.size} logged days.`, detail: best.map(([d, v]) => `${formatDate(d)}: ${Math.round(v.protein / 1000)} g protein`)});
  // Session AH (HE8; L-071, B-119): a meal carries no time of its own, only when it was logged. Only entries logged on the
  // day they belong to can say anything about the evening (a lunch logged at 22:00 the next day is not evening eating),
  // and the card says "logged", never "eaten".
  const sameDay = (e: typeof entries[number]) => Math.abs(Date.parse(e.createdAt) - Date.parse(`${e.date}T12:00:00Z`)) <= 16 * 3_600_000;
  const late = entries.filter(e => { if ((e.meal !== 'Snacks' && e.meal !== 'Dinner') || !sameDay(e)) return false; const h = hourIn(e.createdAt, zone); return h !== null && (h >= 21 || h < 4); });
  const lateDays = new Set(late.map(e => e.date)).size;
  cards.push({id: 'late-evening', title: 'Late-evening eating', line: lateDays ? `A dinner or snack logged after 21:00 on ${lateDays} of ${days.size} days (when it was logged; meals carry no time of their own).` : `No dinner or snack logged after 21:00 in ${days.size} days (when it was logged; meals carry no time of their own).`, detail: lateDays ? [...new Set(late.map(e => e.snapshot.name))].slice(0, 4) : []});
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.snapshot.name, (counts.get(e.snapshot.name) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length) cards.push({id: 'most-logged', title: 'Most-logged foods', line: `What came back most often in ${days.size} days.`, detail: top.map(([n, c]) => `${n} · ${c}×`)});
  const wk: number[] = [], we: number[] = [];
  for (const [d, v] of days) (localWeekday(d) === 0 || localWeekday(d) === 6 ? we : wk).push(v.kcal);
  if (wk.length && we.length) { const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length); cards.push({id: 'weekday-weekend', title: 'Weekdays and weekends', line: `About ${avg(wk)} kcal on a logged weekday and ${avg(we)} on a logged weekend day.`, detail: [`${wk.length} weekdays, ${we.length} weekend days read`]}); }
  return cards;
}
function hourIn(iso: string, zone?: string | null): number | null {
  try { return Number(new Intl.DateTimeFormat('en-GB', {hour: 'numeric', hour12: false, timeZone: zone ?? undefined}).format(new Date(iso))) % 24; } catch { return null; }
}
