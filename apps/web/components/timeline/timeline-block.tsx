'use client';
import Link from 'next/link';
import {useId, useState, type CSSProperties, type FormEvent} from 'react';
import {formatClock, formatNumber} from '../../lib/visual-format';
import {MAX_MINUTES, MIN_MINUTES, minutesClock, clockMinutes, CLOCK} from '../../lib/timeline/store';
import type {TimelineBlock} from '../../lib/timeline/build';
import {useMoveBlock} from './use-move-block';

/**
 * One block on the Day Timeline (Session AF, L5b; P9.2): its time, its name, where its time comes from, its state, and
 * what a tap does — Done for a habit (the Habits page's own smart Done, with Undo), Log it for a planned meal (Health's
 * own logging), Open for everything else. A habit or a meal also moves: drag the handle, use ↑ / ↓ and Enter on it, or
 * choose a time in the picker. Fasts, running timers, sleep, reminders and Checklist dots show why they stay put.
 */
export const clockLabel = (minutes: number) => formatClock(minutesClock(minutes));
export const lengthLabel = (m: number) => m >= 60 ? `${formatNumber(Math.floor(m / 60))} h${m % 60 ? ` ${formatNumber(m % 60)} min` : ''}` : `${formatNumber(m)} min`;
const LENGTHS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
export type BlockActions = {
  done: (b: TimelineBlock) => void; log: (b: TimelineBlock) => void; skip?: (b: TimelineBlock) => void;
  move: (b: TimelineBlock, minutes: number, length?: number) => void; putBack: (b: TimelineBlock) => void;
  defaultTime: (b: TimelineBlock) => string | null;
};

export function TimePicker({block, actions, onClose}: {block: TimelineBlock; actions: BlockActions; onClose: () => void}) {
  const id = useId(), [time, setTime] = useState(block.start === null ? '' : minutesClock(block.start)), [length, setLength] = useState(block.minutes || 20), [error, setError] = useState('');
  const own = actions.defaultTime(block);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!CLOCK.test(time)) { setError('Choose a time, for example 07:30.'); return; }
    actions.move(block, clockMinutes(time), length); onClose();
  };
  return <form className="timeline-picker" aria-label={`Change the time of ${block.title}`} onSubmit={save}>
    <label className="field" htmlFor={`${id}-time`}><span>Time</span><input id={`${id}-time`} type="time" step={900} value={time} required onChange={e => { setTime(e.target.value); setError(''); }} /></label>
    <label className="field" htmlFor={`${id}-length`}><span>How long</span><select id={`${id}-length`} value={length} onChange={e => setLength(Number(e.target.value))}>{[...new Set([...LENGTHS, length])].filter(m => m >= MIN_MINUTES && m <= MAX_MINUTES).sort((a, b) => a - b).map(m => <option key={m} value={m}>{lengthLabel(m)}</option>)}</select></label>
    <div className="timeline-picker-actions">
      <button type="submit" className="primary">Save time</button>
      {block.timeFrom === 'moved here' && <button type="button" className="secondary" onClick={() => { actions.putBack(block); onClose(); }}>{own ? `Put it back at ${formatClock(own)}` : 'Put it back on Anytime'}</button>}
      <button type="button" className="quiet" onClick={onClose}>Cancel</button>
    </div>
    {error && <p role="alert" className="fine">{error}</p>}
  </form>;
}

export function TimelineBlockRow({block, actions, busy}: {block: TimelineBlock; actions: BlockActions; busy: boolean}) {
  const [picking, setPicking] = useState(false);
  const drag = useMoveBlock({start: block.start ?? 0, onCommit: m => actions.move(block, m)});
  const timed = block.start !== null, moving = drag.pending !== null && drag.pending !== block.start;
  const meta = [
    block.minutes ? lengthLabel(block.minutes) : null,
    block.kind === 'habit' || block.kind === 'meal' ? `at ${block.timeFrom}` : null,
    block.reminder && block.timeFrom === 'moved here' ? `reminder ${formatClock(block.reminder)}` : null,
    block.onChecklist ? 'on your Checklist' : null,
  ].filter(Boolean).join(' · ');
  return <li className="timeline-row" data-kind={block.kind} data-pillar={block.pillar ?? undefined} data-done={block.done || undefined} data-skipped={block.skipped || undefined} data-moving={moving || undefined} data-block={block.id} style={{'--drag': `${drag.offset}px`, ...(block.colour ? {'--item-colour': block.colour} : {})} as CSSProperties}>
    <span className="timeline-time">{timed ? clockLabel(moving ? drag.pending! : block.start!) : 'Any time'}</span>
    <div className="timeline-block">
      <div className="timeline-block-main">
        <p className="timeline-title"><strong>{block.title}</strong>{block.done && <span className="timeline-state">Done</span>}{block.skipped && <span className="timeline-state">Skipped</span>}</p>
        {meta && <p className="timeline-meta">{meta}</p>}
        {block.note && <p className="timeline-note">{block.note}</p>}
        {moving && <p className="timeline-moving" role="status">To {clockLabel(drag.pending!)}: let go (or press Enter) to save.</p>}
      </div>
      <div className="timeline-actions">
        {block.action === 'habit-done' && <button type="button" className="primary" disabled={busy} onClick={() => actions.done(block)} aria-label={`Complete ${block.title}`}>Complete</button>}
        {block.action === 'meal-log' && <button type="button" className="primary" disabled={busy} onClick={() => actions.log(block)} aria-label={`Log ${block.title}`}>Log it</button>}
        {block.action === 'open' && <Link className="secondary timeline-open" href={block.href} aria-label={`Open ${block.title}`}>Open</Link>}
        {block.movable && timed && <button type="button" className="timeline-handle" aria-label={`Move ${block.title}, now at ${clockLabel(block.start!)}. Up and down arrows move it by 15 minutes, Enter saves.`} {...drag.handle} onClick={e => e.preventDefault()}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" /></svg>
        </button>}
        {block.movable && <button type="button" className="quiet timeline-change" aria-expanded={picking} onClick={() => setPicking(p => !p)} aria-label={`${timed ? 'Change the time of' : 'Give a time to'} ${block.title}`}>{timed ? 'Change time' : 'Give it a time'}</button>}
        {!block.movable && block.lockedReason && <span className="timeline-lock"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>{block.lockedReason}</span>}
      </div>
    </div>
    {picking && <TimePicker block={block} actions={actions} onClose={() => setPicking(false)} />}
  </li>;
}
