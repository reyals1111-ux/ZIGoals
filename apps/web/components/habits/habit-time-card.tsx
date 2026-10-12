'use client';
import Link from 'next/link';
import {useHabits} from './use-habits';
import {HabitCompletion} from './habit-card';
import {TimerChip} from './habit-timer';
import {habitDay} from '../../lib/habits';
import {currentSection, groupByTimeOfDay, SECTION_LABELS, SECTION_SYMBOLS} from '../../lib/habits-extras/sections';
import {registerSlotCard} from '../game/slot-local';
import {NebulaFlow} from '../nebula-flow';
import './habits.css';
import './habits-aa.css';

/**
 * H1 for Today's `today:habit-time` place (AA-Cloud's "Today's focus"): the clock's section (Morning, Afternoon,
 * Evening) with its due habits and their check-ins; when that section has nothing due, the next one that has.
 */
export function HabitTimeCard() {
  const store = useHabits();
  if (!store.loaded || store.error) return null;
  const due = store.data.habits.filter(h => habitDay(h, store.today, store.today).scheduled);
  const sections = groupByTimeOfDay(due, store.today), now = currentSection(new Date().getHours());
  const pick = sections.find(s => s.id === now && s.habits.length) ?? sections.find(s => s.due > s.done) ?? null;
  if (!pick) return null;
  return <section className="panel habit-time-card" aria-labelledby="habit-time-card-title">
    <div className="habit-section-heading"><div><p className="eyebrow">{SECTION_SYMBOLS[pick.id]} {pick.id === now ? 'This part of the day' : 'Up next'}</p><h2 id="habit-time-card-title"><NebulaFlow identity="habit-time-card">{SECTION_LABELS[pick.id]}</NebulaFlow></h2></div><span className="habit-section-count">{pick.done} / {pick.due}</span></div>
    <ul className="habit-today-list">{pick.habits.slice(0, 4).map(h => <li key={h.id}><div><strong>{h.title}</strong>{h.timer && <TimerChip habit={h} store={store} />}</div><HabitCompletion habit={h} store={store} compact /></li>)}</ul>
    <Link className="text-link" href="/app/habits">All habits →</Link>
  </section>;
}
let registered = false;
/** Registers the card once; called by the Habits page and the registrar. */
export function registerHabitTimeCard() { if (registered) return; registered = true; registerSlotCard('today:habit-time', HabitTimeCard); }
