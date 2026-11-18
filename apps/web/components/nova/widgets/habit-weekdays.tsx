'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {periodLabel} from '../../../lib/nova/cards/ax/calendar';
import {habitWeekdays} from '../../../lib/nova/cards/ax/habit-lattice';
import {AxdKey} from '../cards/ax/day-key';
import {AxdLattice} from '../cards/ax/day-lattice';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitsSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: lattices): "Habits by weekday" — the habits as rows and the seven weekdays as
 * columns; each cell is the days that habit was not done on that weekday (missed and skipped, told apart in the table),
 * the fuller the more. The weekday with the most is named in words and outlined. The period is the question's
 * (`period`), else the last 90 days — the same count as "which weekday do I miss most".
 */
export default function HabitWeekdays({size, params}: AxProps) {
  return <HabitsSource>{(all, _live, today) => <Grid habits={all} today={today} size={size} params={params}/>}</HabitsSource>;
}
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
function Grid({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const view = useMemo(() => habitWeekdays(habits, today, params?.period), [habits, today, params?.period]);
  const label = periodLabel(view.period, today), worst = view.worst === null ? null : view.columns[view.worst]!;
  return <AxBody kind="habit-weekdays" size={size}>
    {worst ? <AxHead figure={String(worst.total)} unit={`of ${view.all}`} label={`days not done fall on ${worst.name} · ${label}`} note={`${worst.missed} missed, ${worst.skipped} skipped on ${worst.name}`}/>
      : <AxHead figure="0" unit="days" label={`missed or skipped · ${label}`} note="No habit day was missed or skipped" tone="clear"/>}
    {size !== 'S' && view.rows.length > 0 && <AxdLattice kind="counts"
      columns={view.columns.map((c, i) => ({key: String(c.weekday), label: c.label, lead: i === view.worst}))}
      rows={view.rows.map(r => ({key: r.id, label: r.name, note: String(r.total), cells: r.cells.map((c, i) => ({state: 'count', n: c.total, level: c.total ? Math.max(1, Math.ceil(c.total / view.max * 3)) : 0, lead: i === view.worst, title: `${r.name}, ${view.columns[i]!.name}: ${c.missed} missed, ${c.skipped} skipped`}))}))}
      more={hidden => `+${hidden} more ${hidden === 1 ? 'habit' : 'habits'} on the Habits page`}/>}
    {size === 'L' && view.all > 0 && <AxdKey items={[['lit', 'More days not done'], ['dim', 'Fewer'], ['open', worst ? `The most: ${worst.name}` : 'The most']]}/>}
    <CardFoot source="Your habits" asOf={label}/>
    <HoloTable caption={`Habit days not done by weekday, ${label}`} rows={[
      ['The weekday with the most', worst ? `${worst.name}: ${worst.total} of ${view.all}` : 'None: no day was missed or skipped'],
      ...view.columns.map(c => [c.name, c.total ? `${days(c.total)}: ${c.missed} missed, ${c.skipped} skipped` : 'None'] as const),
      ...view.rows.map(r => [r.name, r.total ? view.columns.map((c, i) => r.cells[i]!.total ? `${c.name} ${r.cells[i]!.total}` : '').filter(Boolean).join(', ') : 'Done on every due day'] as const),
    ]}/>
  </AxBody>;
}
