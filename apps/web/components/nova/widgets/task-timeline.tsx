'use client';
import {useMemo} from 'react';
import {daysBetween} from '../../../lib/ai/tools/range';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {taskTimeline} from '../../../lib/nova/cards/ax/day-tasks';
import {deviceDay} from '../../../lib/tasks/device';
import type {Tasks} from '../../../lib/tasks/schema';
import {formatDate} from '../../../lib/visual-format';
import {AxdKey} from '../cards/ax/day-key';
import {AxdTimeline} from '../cards/ax/day-timeline';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {TasksSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: timelines): "Task timeline" — open tasks on a time axis from the oldest overdue
 * day to a week ahead: overdue (a ringed lit mark), due today (filled) and ahead (hollow), with the tasks finished in the
 * period as small strokes under the axis and today as a hairline. One overdue rule: the Tasks page's own (`taskState`
 * with the wall clock, so a timed task due today is overdue once its time has passed). The period (`period`) is the one
 * whose finished tasks are drawn, else this week. Compact: the open tasks.
 */
export default function TaskTimelineWidget({size, params}: AxProps) {
  return <TasksSource>{(tasks, today, clock) => <Line tasks={tasks} today={today} clock={clock} size={size} params={params}/>}</TasksSource>;
}
function Line({tasks, today, clock, size, params}: {tasks: Tasks; today: string; clock: string} & AxProps) {
  const period = useMemo(() => widgetPeriod(params?.period, today, 'this-week'), [params?.period, today]);
  const view = useMemo(() => taskTimeline(tasks, period, today, clock, deviceDay), [tasks, period, today, clock]);
  const c = view.counts, label = periodLabel(period, today), span = daysBetween(view.from, view.to);
  const bits = [`${c.overdue} overdue`, `${c.today} due today`, `${c.ahead} in the week ahead`, ...(c.later ? [`${c.later} later`] : []), ...(c.someday ? [`${c.someday} without a day`] : [])];
  return <AxBody kind="task-timeline" size={size}>
    <AxHead figure={String(c.open)} unit="open" label={`${c.open === 1 ? 'task' : 'tasks'} · to ${formatDate(view.to, {year: false})}`} note={bits.join(' · ')} tone={c.open > 0 && c.overdue === 0 ? 'clear' : undefined}/>
    {size !== 'S' && <AxdTimeline now={view.todayAt} marks={view.marks.map(m => ({key: m.key, at: m.at, lane: m.lane, kind: m.kind, title: m.words}))} ticks={view.done.map(m => ({key: m.key, at: m.at, title: m.words}))}
      labels={view.ticks.map(t => ({...t, now: t.label === 'Today'}))} grid={Array.from({length: span + 1}, (_, i) => i / Math.max(1, span))}/>}
    {size === 'L' && <AxdKey items={[['late', 'Overdue'], ['lit', 'Due today'], ['ring', 'Ahead'], ['tick', `Done ${label}`]]}/>}
    <CardFoot source="Your tasks" asOf={`${formatDate(view.from, {year: false})} – ${formatDate(view.to, {year: false})}`}/>
    <HoloTable caption="Open tasks by their day" rows={[
      ['Open tasks', String(c.open)], ['Overdue', String(c.overdue)], ['Due today', String(c.today)], ['In the week ahead', String(c.ahead)],
      ...(c.later ? [['Due later', String(c.later)] as const] : []), ...(c.someday ? [['Without a day', String(c.someday)] as const] : []),
      ...view.marks.map(m => { const [name, ...rest] = m.words.split(': '); return [name!, rest.join(': ')] as const; }),
      [`Done ${label}`, c.done ? view.done.map(m => m.words).join('; ') || String(c.done) : 'None'],
    ]}/>
  </AxBody>;
}
