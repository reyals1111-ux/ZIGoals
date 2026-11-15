'use client';
import {useMemo} from 'react';
import {matrixCard, matrixRows} from '../../../lib/nova/cards/plan-insights';
import {MATRIX_RULE} from '../../../lib/tasks/matrix';
import {TASKS} from '../../../lib/tasks/schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2; ADR-040 Part 6): "Priority matrix" in violet — the open tasks in the four boxes of
 * Tasks → Priority matrix (urgent: overdue or due within two days; important: priority P1 or P2; lib/tasks/matrix.ts;
 * figures in lib/nova/cards/plan-insights.ts). Four counts, and at Large the tasks to do first. Read only: a task moves
 * between boxes on its own page (its priority or its day), and adding a task is the widget's quick action, with Undo.
 */
const SHORT = {do: 'Urgent and important', plan: 'Important', quick: 'Urgent', later: 'Neither'} as const;
export default function PriorityMatrixWidget({size = 'M'}: Partial<CardProps>) {
  const tasks = useDeviceRecord(TASKS), {today} = useTaskClock();
  const card = useMemo(() => { try { return matrixCard(tasks.data, today, 6); } catch { return null; } }, [tasks.data, today]);
  if (!tasks.loaded) return <HoloReading/>;
  if (tasks.unreadable || !card) return <HoloUnread what="Your tasks"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No open tasks" href="/app/tasks" action="Add a task">Your open tasks sort themselves here by their day and their priority.</CardNotice>;
  const first = card.boxes[0]!;
  return <div className="nc-body nx-card" data-size={size} data-flat="">
    {size !== 'M' && <div className="nx-top"><Hero value={String(first.count)} unit={first.count === 1 ? 'task' : 'tasks'} label={size === 'S' ? 'Urgent, important' : 'Urgent and important'}/></div>}
    {size !== 'S' && <ul className="nx-quad" aria-label="The four boxes">{card.boxes.map((b, i) => <li key={b.id} data-lead={i === 0 || undefined} title={`${b.title}: ${b.hint}`}><b>{b.count}</b><span>{SHORT[b.id]}</span></li>)}</ul>}
    {size === 'L' && first.top.length > 0 && <div className="nx-main" data-fit="rows" data-wr-limit="">
      <p className="nx-cap">Do these first</p>
      <NxRows label="Urgent and important tasks" where="the Tasks page" extra={first.count - first.top.length} rows={first.top.map(t => ({key: t.id, name: t.title, value: t.dueText}))}/>
    </div>}
    {size === 'L' && <p className="nx-note">{MATRIX_RULE}</p>}
    <CardFoot source="Your tasks" asOf="today"/>
    <HoloTable caption="Priority matrix" rows={matrixRows(card)}/>
  </div>;
}
