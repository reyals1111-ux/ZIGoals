'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {dayNames} from '../../../lib/nova/cards/ax/calendar';
import {YEAR_WEEKS, habitYear} from '../../../lib/nova/cards/ax/habit-lattice';
import {AxdKey} from '../cards/ax/day-key';
import {AxdHeat} from '../cards/ax/day-lattice';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: heat): "Habit year" — one habit's last 53 weeks as a heat grid, a column a week
 * from Monday: a day done is lit, a missed day carries a bright slash, a skipped day is dashed (marked so; never counted
 * as missed), today is outlined while it is still open; days before the habit was kept stay empty. The habit is the one
 * the question named (`ref`), else the first active one. Each day is the Habits page's own outcome.
 */
export default function HabitYear({size, params}: AxProps) {
  return <HabitSource refId={params?.ref}>{(habit, _all, today) => <Year habit={habit} today={today} size={size}/>}</HabitSource>;
}
function Year({habit, today, size}: {habit: Habit; today: string; size: AxProps['size']}) {
  const view = useMemo(() => habitYear(habit, today), [habit, today]), span = `the last ${YEAR_WEEKS} weeks`;
  const bits = [`${view.missed} missed`, `${view.skipped} skipped`, ...(view.part ? [`${view.part} partly done`] : []), ...(view.open ? ['today still open'] : [])];
  return <AxBody kind="habit-year" size={size}>
    <AxHead figure={String(view.done)} unit={view.done === 1 ? 'day' : 'days'} label={`done · ${span}`} note={`${view.name} · ${bits.join(', ')}`}/>
    {size !== 'S' && <AxdHeat weeks={view.weeks.map(w => ({key: w.key, label: w.month, cells: w.cells.map(c => ({key: c.date, state: c.state, today: c.today, title: c.words}))}))}/>}
    {size === 'L' && <AxdKey items={[['lit', 'Done'], ['missed', 'Missed'], ['skipped', 'Skipped (not counted as missed)'], ['open', 'Today']]}/>}
    <CardFoot source="Your habits" asOf={`${view.name} · ${span}`}/>
    <HoloTable caption={`${view.name}, ${span}`} rows={[
      ['Done', `${view.done} of ${view.decided} due days`],
      ['Missed (a due day not done)', view.missed ? `${view.missed}: ${dayNames(view.dates.missed, 31)}` : 'None'],
      ['Skipped (marked so; not counted as missed)', view.skipped ? `${view.skipped}: ${dayNames(view.dates.skipped, 31)}` : 'None'],
      ...(view.open ? [['Today', 'Still open'] as const] : []),
    ]}/>
  </AxBody>;
}
