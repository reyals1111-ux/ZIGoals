'use client';
import {useMemo} from 'react';
import {dayNames, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {tasksMonth} from '../../../lib/nova/cards/ax/day-tasks';
import {deviceDay} from '../../../lib/tasks/device';
import type {Tasks} from '../../../lib/tasks/schema';
import {AxCalendar} from '../cards/ax/calendar';
import {AxBody, AxHead, AxKey, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {TasksSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family 1: month calendars): "Tasks calendar" — the month's days on which a task is due or
 * was done: a day with an overdue task is lit, a day with an open task due is half lit, a day with only finished tasks
 * carries a dot; today is ringed. The overdue rule is the Tasks page's own (with the clock). The month is the period's
 * (`period`), else this month. Compact: the days with a task.
 */
export default function TasksCalendar({size, params}: AxProps) {
  return <TasksSource>{(tasks, today, clock) => <Month tasks={tasks} today={today} clock={clock} size={size} params={params}/>}</TasksSource>;
}
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
function Month({tasks, today, clock, size, params}: {tasks: Tasks; today: string; clock: string} & AxProps) {
  const month = useMemo(() => tasksMonth(tasks, widgetPeriod(params?.period, today, 'this-month'), today, clock, deviceDay), [tasks, params?.period, today, clock]);
  const {view} = month, used = new Set(view.weeks.flat().filter(c => c.inPeriod).map(c => c.state)), open = month.dueDays.length + month.overdueDays.length;
  const key: (readonly [string, string])[] = [...(used.has('missed') ? [['missed', 'Overdue'] as const] : []), ...(used.has('part') ? [['part', 'Due'] as const] : []), ...(used.has('done') ? [['done', 'Done'] as const] : []), ['today', 'Today']];
  return <AxBody kind="tasks-calendar" size={size}>
    <AxHead figure={String(month.taskDays)} unit={month.taskDays === 1 ? 'day' : 'days'} label={`with a task · ${view.title}`} note={`${month.due} still open on ${days(open)} · ${month.done} done on ${days(month.doneDays.length)}`}/>
    {size !== 'S' && <AxCalendar view={view} lit="not-done" kind="habit"/>}
    {size === 'L' && <AxKey items={key}/>}
    <CardFoot source="Your tasks" asOf={view.title}/>
    <HoloTable caption={`Tasks by day, ${view.title}`} rows={[
      ['Days with a task due or done', String(month.taskDays)],
      ['Overdue (still open after their day)', month.overdueDays.length ? `${days(month.overdueDays.length)}: ${dayNames(month.overdueDays, 31)}` : 'None'],
      ['Due (open)', month.dueDays.length ? `${days(month.dueDays.length)}: ${dayNames(month.dueDays, 31)}` : 'None'],
      ['Done', month.doneDays.length ? `${month.done} on ${days(month.doneDays.length)}: ${dayNames(month.doneDays, 31)}` : 'None'],
    ]}/>
  </AxBody>;
}
