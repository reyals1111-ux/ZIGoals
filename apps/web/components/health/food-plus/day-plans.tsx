'use client';
import type {HealthData} from '../../../lib/health';
import {dailyData, logMealPlan} from '../../../lib/health-daily';
import {PhoneFold} from '../../phone/phone-fold';
import './food-plus.css';

/**
 * Session AV lane 2 (food; q3 #29 check 8, Cronometer's repeating items show in the diary): the day's open plans above the
 * Diary's meals — "Planned for this day: Lunch · Pea soup" with "Log it" — so a planned (or repeating) meal is logged
 * where the day is read, not only in Meals & planning. Nothing shows when the day has no open plan.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
export default function DayPlans({data, date, perform}: {data: HealthData; date: string; perform: Perform}) {
  const open = dailyData(data).plans.filter(p => p.date === date && !p.loggedAt).sort((a, b) => ORDER.indexOf(a.meal) - ORDER.indexOf(b.meal) || a.name.localeCompare(b.name));
  if (!open.length) return null;
  // Session AV lane 2 (phone-length): on a phone the card is one row that names what is planned and opens in place, so the
  // Diary stays within its pinned screens (tests/pillar-phone-length.spec.ts); elsewhere it shows as it was.
  const named = open.slice(0, 2).map(p => `${p.meal} · ${p.name}`).join(', ') + (open.length > 2 ? `, and ${open.length - 2} more` : '');
  return <PhoneFold label="Planned for this day" detail={named}><section className="panel food-plus-card food-plus-day-plans" aria-label="Planned for this day">
    <p className="eyebrow">PLANNED FOR THIS DAY</p>
    <ul className="food-plus-list">{open.map(p => <li key={p.id}><span><strong>{p.meal}</strong> · {p.name}</span>
      <button type="button" className="secondary" aria-label={`Log planned ${p.name} to ${p.meal.toLowerCase()}`} onClick={() => void perform(latest => logMealPlan(latest, p.id, new Date().toISOString()), `${p.name} logged to ${p.meal.toLowerCase()} from your plan.`)}>Log it</button></li>)}</ul>
  </section></PhoneFold>;
}
