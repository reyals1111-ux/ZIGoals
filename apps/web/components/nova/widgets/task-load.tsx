'use client';
import {useMemo} from 'react';
import {taskLoad} from '../../../lib/nova/cards/ax/day-tasks';
import type {Tasks} from '../../../lib/tasks/schema';
import {AxdSplit} from '../cards/ax/day-dial';
import {AxdKey} from '../cards/ax/day-key';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {TasksSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: dials): "Task load" — the open tasks as one ring split in four: overdue, due today,
 * ahead and without a day, each part drawn in its own way and said in words. The split is the Tasks page's own
 * (`taskState` with the wall clock). With no open task the ring is unlit. Compact: the open tasks.
 */
export default function TaskLoad({size}: AxProps) {
  return <TasksSource>{(tasks, today, clock) => <Dial tasks={tasks} today={today} clock={clock} size={size}/>}</TasksSource>;
}
function Dial({tasks, today, clock, size}: {tasks: Tasks; today: string; clock: string; size: AxProps['size']}) {
  const load = useMemo(() => taskLoad(tasks, today, clock), [tasks, today, clock]);
  return <AxBody kind="task-load" size={size}>
    <AxHead figure={String(load.open)} unit="open" label={load.open === 1 ? 'task' : 'tasks'} tone={load.open === 0 ? 'clear' : undefined}
      note={load.open ? `${load.overdue} overdue · ${load.today} due today · ${load.ahead} ahead · ${load.someday} without a day` : 'No open task: everything is done'}/>
    {size !== 'S' && <AxdSplit figure={String(load.open)} unit="open" parts={[{key: 'overdue', mark: 'late', value: load.overdue}, {key: 'today', mark: 'now', value: load.today}, {key: 'ahead', mark: 'ahead', value: load.ahead}, {key: 'someday', mark: 'none', value: load.someday}]}/>}
    {size === 'L' && <AxdKey items={[['bright', 'Overdue'], ['lit', 'Due today'], ['dim', 'Ahead'], ['none', 'No day']]}/>}
    <CardFoot source="Your tasks" asOf="now"/>
    <HoloTable caption="Open tasks by their day" rows={[['Open', String(load.open)], ['Overdue', String(load.overdue)], ['Due today', String(load.today)], ['Ahead', String(load.ahead)], ['Without a day', String(load.someday)]]}/>
  </AxBody>;
}
