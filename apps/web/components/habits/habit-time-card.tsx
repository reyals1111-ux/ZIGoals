'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useHabits} from './use-habits';
import {HabitCompletion} from './habit-completion';
import {TimerChip} from './habit-timer';
import {habitDay} from '../../lib/habits';
import {currentSection, groupByTimeOfDay, SECTION_LABELS, SECTION_SYMBOLS} from '../../lib/habits-extras/sections';
import {firstStepToday, pickTimeSection, sectionAllDone} from '../../lib/habits-extras/time-card';
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
  // ADR-022 B49: when Today's own habits widget is on the page (it groups the due habits by section itself), this card
  // would list the same check-ins twice; it stands down and shows only on a Today without the widget.
  const [widget, setWidget] = useState(false);
  // Session AC: Daily Habits or the habits widget standing in for it (the same list), whichever Today shows.
  // Session AK: on a phone Today's widget area mounts on view (G2, RELEASE_REVIEW R11), so the widget was not in the
  // page yet when this looked and the card stayed beside it (the same habits twice, ≈ 0.5 screen). While the area is still
  // held back, Today's focus says whether the widget will be there (`data-habits-widget`); once it mounts, the page is read again.
  useEffect(() => {
    const check = () => setWidget(!!document.querySelector('.placed-module:is([data-module="habits"], [data-stands-in="habits"]) .habits-today') || (!!document.querySelector('.dashboard-widget-reserve') && !!document.querySelector('.today-focus[data-habits-widget]')));
    check();
    const area = document.querySelector('.dashboard-widget-area');
    if (!area || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(check);
    observer.observe(area, {childList: true});
    return () => observer.disconnect();
  }, [store.data]);
  if (!store.loaded || store.error || widget) return null;
  const due = store.data.habits.filter(h => habitDay(h, store.today, store.today).scheduled);
  const sections = groupByTimeOfDay(due, store.today), now = currentSection(new Date().getHours());
  // Session AK P4 (FR-3): ticking the last open habit keeps the card, with its done state, instead of removing it.
  const pick = pickTimeSection(sections, now);
  if (!pick) return null;
  const allDone = sectionAllDone(pick), first = pick.done > 0 && firstStepToday(store.data.habits, store.today);
  return <section className="panel habit-time-card" aria-labelledby="habit-time-card-title">
    <div className="habit-section-heading"><div><p className="eyebrow">{SECTION_SYMBOLS[pick.id]} {allDone ? 'All done for now' : pick.id === now ? 'This part of the day' : 'Up next'}</p><h2 id="habit-time-card-title"><NebulaFlow identity="habit-time-card">{SECTION_LABELS[pick.id]}</NebulaFlow></h2></div><span className="habit-section-count">{pick.done} / {pick.due}</span></div>
    <ul className="habit-today-list">{pick.habits.slice(0, 4).map(h => <li key={h.id}><div><strong>{h.title}</strong>{h.timer && <TimerChip habit={h} store={store} />}</div><HabitCompletion habit={h} store={store} compact /></li>)}</ul>
    {/* Session AK P4 (FR-3): the very first check-in on this device is named, once (read from the habits; nothing stored). */}
    {first && <p className="fine habit-first-step">{/* Session AL (DV-156): a static line, not a live region, so saving a widget does not re-announce it */}Your first step is logged. Day 1 of your streak.</p>}
    <Link className="text-link" href="/app/habits">All habits →</Link>
  </section>;
}
let registered = false;
/** Registers the card once; called by the Habits page and the registrar. */
export function registerHabitTimeCard() { if (registered) return; registered = true; registerSlotCard('today:habit-time', HabitTimeCard); }
