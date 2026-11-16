'use client';
import {useMemo, type CSSProperties} from 'react';
import {tasksLaterCard, tasksLaterRows, type LaterLine} from '../../../lib/nova/cards/life-insights';
import {TASKS} from '../../../lib/tasks/schema';
import {TASK_WHEN} from '../../../lib/tasks/when';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {NxPips} from './nx-parts';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 Part 6): "This evening and Someday" in violet — the open tasks the
 * person put on tonight's list (for today only: tomorrow each is back in its usual place) and the ones with no day set
 * aside in Someday, with the Tasks page's own rules (lib/tasks/when.ts; figures in lib/nova/cards/life-insights.ts).
 * Two lists side by side, names only. Putting a task on this evening's list is the widget's quick action (the page's own
 * write, with Undo); everything else is one link away on Tasks.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
function List({title, lines, shown, empty}: {title: string; lines: readonly LaterLine[]; shown: number; empty: string}) {
  const more = lines.length - shown;
  return <div>
    <p className="nx-cap">{title} · {lines.length}</p>
    {lines.length ? <ul className="nx-rows" aria-label={title}>{lines.slice(0, shown).map((l, i) => <li key={l.id} className="nx-row nc-rise" style={{'--nc-i': i} as CSSProperties}>
      <i className="nx-row-node" aria-hidden="true"/><span className="nx-row-name" title={l.title}>{l.title}</span>{l.dueText ? <span className="nx-row-sub">{l.dueText}</span> : null}
    </li>)}</ul> : <p className="nx-empty-line">{empty}</p>}
    {more > 0 && <p className="nx-note">+{more} more</p>}
  </div>;
}
export default function TasksLaterWidget({size = 'M'}: Partial<CardProps>) {
  const tasks = useDeviceRecord(TASKS), when = useDeviceRecord(TASK_WHEN), {today} = useTaskClock();
  const card = useMemo(() => { try { return tasksLaterCard(when.data, tasks.data, today); } catch { return null; } }, [when.data, tasks.data, today]);
  if (!tasks.loaded || !when.loaded) return <HoloReading/>;
  if (tasks.unreadable || when.unreadable || !card) return <HoloUnread what="Your tasks"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="No open tasks" href="/app/tasks" action="Add a task">Add a task, then put it on this evening’s list or set it aside in Someday.</CardNotice>;
  const foot = <CardFoot source="Your tasks" asOf="today"/>, table = <HoloTable caption="This evening and Someday" rows={tasksLaterRows(card)}/>;
  if (card.state === 'quiet') return <CardNotice kind="empty" ghost="rows" title="Nothing on either list" href="/app/tasks?view=evening" action="Choose a task for this evening">You have {card.open} open {card.open === 1 ? 'task' : 'tasks'}. Put one on this evening’s list, or set one with no day aside in Someday.</CardNotice>;
  const e = card.evening.length, s = card.someday.length;
  const both = [...card.evening.map(l => ({...l, list: 'This evening'})), ...card.someday.map(l => ({...l, list: 'Someday'}))];
  return <div className="nc-body nx-card" data-size={size} data-lay="hero">
    <div className="nx-top"><Hero value={String(e)} unit={e === 1 ? 'task' : 'tasks'} label="This evening">
      <p className="nx-note">Someday: {s}</p>
      {/* Round 6: one lamp a task, this evening's lit first (a tally; the rows and the table name each). */}
      {size !== 'S' && <NxPips items={both.map(l => l.list === 'Someday' ? 'off' as const : 'on' as const)}/>}
    </Hero></div>
    {/* Medium: one list, this evening's tasks first, each row saying which list it is on. Large: the two lists, each with its own heading. */}
    {size === 'M' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      <NxRows rail label="This evening, then Someday" where="the Tasks page" rows={both.map(l => ({key: `${l.list}-${l.id}`, name: l.title, value: l.list, chip: l.list === 'Someday' ? 'off' as const : 'on' as const, sub: l.dueText}))}/>
    </div>}
    {size === 'L' && <div className="nx-main" data-fit="rows">
      <div className="nx-pair">
        <List title="This evening" lines={card.evening} shown={SHOWN[size]} empty="Nothing for tonight."/>
        <List title="Someday" lines={card.someday} shown={SHOWN[size]} empty="Nothing set aside."/>
      </div>
      <p className="nx-note">This evening holds for today only: tomorrow each task is back in its usual place. Someday is for tasks with no day.</p>
    </div>}
    {foot}{table}
  </div>;
}
