'use client';
import {useMemo} from 'react';
import {taskOverdue} from '../../../lib/nova/cards/ax/day-tasks';
import type {Tasks} from '../../../lib/tasks/schema';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {AxRanks} from '../cards/ax/ranks';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {TasksSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family 2: ranked bars): "Overdue tasks" — the overdue tasks by how many days overdue, the
 * oldest first; a timed task due today whose time has passed is the shortest bar. The rule is the Tasks page's own
 * (`taskState` with the wall clock). With none overdue it says so, with the open tasks. Compact: the figure.
 */
export default function TaskOverdue({size}: AxProps) {
  return <TasksSource>{(tasks, today, clock) => <Ranks tasks={tasks} today={today} clock={clock} size={size}/>}</TasksSource>;
}
function Ranks({tasks, today, clock, size}: {tasks: Tasks; today: string; clock: string; size: AxProps['size']}) {
  const view = useMemo(() => taskOverdue(tasks, today, clock), [tasks, today, clock]);
  const n = view.rows.length, shown = view.rows.slice(0, size === 'L' ? 8 : 4), more = n - shown.length, oldest = view.rows[0];
  return <AxBody kind="task-overdue" size={size}>
    <AxHead figure={String(n)} unit={`of ${view.open}`} label={`open ${view.open === 1 ? 'task' : 'tasks'} overdue`} tone={n ? undefined : 'clear'}
      note={oldest ? `Oldest: ${oldest.label}, ${oldest.days > 0 ? `${oldest.days} ${oldest.days === 1 ? 'day' : 'days'}` : 'due earlier today'}` : view.open ? 'None overdue' : 'None overdue: no open task'}/>
    {size !== 'S' && shown.length > 0 && <AxRanks max={view.max} more={more > 0 ? `+${more} more on the Tasks page` : null}
      rows={shown.map(r => ({key: r.key, label: r.label, text: r.days > 0 ? `${r.days} ${r.days === 1 ? 'day' : 'days'}` : 'today', parts: [{mark: 'missed', value: r.days || 0.01}]}))}/>}
    <CardFoot source="Your tasks" asOf="now"/>
    <HoloTable caption="Overdue tasks, the oldest first" rows={[['Overdue', n ? `${n} of ${view.open} open` : `None of ${view.open} open`], ...view.rows.map(r => [r.label, r.text] as const)]}/>
  </AxBody>;
}
