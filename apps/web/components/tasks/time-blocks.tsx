'use client';
import {useId} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {TASK_PLAN, type TimeBlock} from '../../lib/tasks/plan-record';
import {blockProgress, blockTasks, blocksOn, dropIntoBlock, moveWhatIsLeft} from '../../lib/tasks/time-blocks';
import {LOOK_HEX} from '../../lib/tasks/look';
import type {Tasks} from '../../lib/tasks/schema';
import {addLocalDays} from '../../lib/local-date';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348; Akiflow's time slots), on Tasks → Today (inside the day planner, its own chunk):
 * today's time blocks, each with its tasks and "2 of 4 done", a way to drop one of today's tasks (or one with no day) into it,
 * and "Move what is left", which sends its open tasks to the next block of the same name, with Undo (the list's toast).
 */
type Change = (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
const when = (day: string, today: string) => day === today ? 'later today' : day === addLocalDays(today, 1) ? 'tomorrow' : formatDate(day, {weekday: true, year: false});
export default function TodayBlocks({record, today, change, day = today}: {record: Tasks; today: string; change: Change; day?: string}) {
  const plan = useDeviceRecord(TASK_PLAN), id = useId();
  const blocks = blocksOn(plan.data, day);
  if (!plan.loaded || !blocks.length) return null;
  const candidates = record.tasks.filter(t => !t.doneAt && !t.parentId && !t.recur && (!t.block || !blocks.some(b => b.id === t.block) || t.due !== day) && (!t.due || t.due <= day)).slice(0, 40);
  const move = (b: TimeBlock) => {
    try {
      const {to, moved} = moveWhatIsLeft(record, plan.data, b, day);
      change(r => moveWhatIsLeft(r, plan.data, b, day).record, `${moved.length === 1 ? `“${moved[0]!.title}” moves` : `${formatNumber(moved.length)} tasks move`} to “${to.block.name}” ${when(to.day, today)}, ${formatClock(to.block.from)}.`, `Back in “${b.name}”.`);
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be moved.', {tone: 'error'}); }
  };
  return <section className="tasks-blocks-today" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Time blocks {day === today ? 'today' : formatDate(day, {weekday: true, year: false})}</h4>
    <ul className="tasks-blocks-list">{blocks.map(b => {
      const tasks = blockTasks(record, b, day), p = blockProgress(tasks), open = tasks.filter(t => !t.doneAt);
      return <li key={b.id} className="tasks-block-today" style={{['--block-colour' as string]: LOOK_HEX[b.colour]}}>
        <span className="tasks-block-swatch" aria-hidden="true" />
        <div className="tasks-block-body">
          <p><strong dir="auto">{b.name}</strong> <small>{formatClock(b.from)}–{formatClock(b.to)} · {p.total ? `${formatNumber(p.done)} of ${formatNumber(p.total)} done` : 'no tasks yet'}</small></p>
          {tasks.length > 0 && <ul className="tasks-block-tasks" aria-label={`In “${b.name}”`}>{tasks.map(t => <li key={t.id}><span aria-hidden="true">{t.state?.kind === 'cancelled' ? '–' : t.doneAt ? '✓' : '○'} </span><span dir="auto">{t.title}</span>{t.doneAt ? <span className="sr-only">{t.state?.kind === 'cancelled' ? ' (cancelled)' : ' (done)'}</span> : t.time ? <small> · {formatClock(t.time)}</small> : null}</li>)}</ul>}
          <span className="tasks-block-actions">
            {candidates.length > 0 && <label className="field"><span className="sr-only">Drop a task into “{b.name}”</span><select value="" onChange={e => { const t = record.tasks.find(x => x.id === e.target.value); if (t) change(r => dropIntoBlock(r, t.id, b, day), `“${t.title}” is in “${b.name}” (${formatClock(b.from)}–${formatClock(b.to)}). Plan my day places it inside the block.`, 'Out of the block again.'); }}>
              <option value="">Drop a task in…</option>{candidates.filter(t => t.block !== b.id || t.due !== day).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
            {open.length > 0 && <button type="button" className="quiet" onClick={() => move(b)}>Move what is left ({formatNumber(open.length)})</button>}
          </span>
        </div>
      </li>;
    })}</ul>
  </section>;
}
