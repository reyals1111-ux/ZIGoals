'use client';
import {useId, useMemo, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MY_DAY_VIEW, picksToday} from '../../lib/tasks/my-day';
import {labelsInUse} from '../../lib/tasks/engine';
import {keepOne, pickOne, pickPool, pickTwo, type PickScope} from '../../lib/tasks/pick';
import {dreadSign} from '../../lib/tasks/dread';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';
import './tasks-aw-x2.css';

/**
 * Session AW (X2, LEDGER #435; Amazing Marvin's "Pick one for me" and "This or that"), a fold inside Plan my day on Tasks →
 * Today (never a card of its own), its own chunk. When choosing is the hard part: one open task from today's (or from a
 * project or a label) — "Another" offers a different one, "This one" opens it, "Focus on it" starts its focus block. "This
 * or that" offers two; the one kept meets the next until one is left. It only offers: nothing is added, moved or removed,
 * and nothing is stored. The chance is the browser's own (Math.random), read only in a tap.
 */
const roll = () => Math.random();
const scopeOf = (key: string): PickScope => key.startsWith('project:') ? {kind: 'project', id: key.slice(8)} : key.startsWith('label:') ? {kind: 'label', name: key.slice(6)} : {kind: 'today'};
type Mode = {kind: 'one'; task: Task} | {kind: 'two'; tasks: Task[]} | {kind: 'chosen'; task: Task} | null;
export default function PickOne({record, today, onOpen, onFocus}: {record: Tasks; today: string; onOpen?: (task: Task) => void; onFocus?: (task: Task) => void}) {
  const id = useId(), myDay = useDeviceRecord(MY_DAY_VIEW), result = useRef<HTMLDivElement>(null);
  const [scopeKey, setScopeKey] = useState('today'), [mode, setMode] = useState<Mode>(null), [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const projects = (record.projects ?? []).filter(p => !p.archived), labels = labelsInUse(record).filter(l => l.open > 0);
  const scope = scopeOf(scopeKey);
  const picked = useMemo(() => new Set(picksToday(myDay.data, today)), [myDay.data, today]);
  const pool = useMemo(() => pickPool(record, today, scopeOf(scopeKey), picked), [record, today, scopeKey, picked]);
  const show = (next: Mode) => { setMode(next); requestAnimationFrame(() => result.current?.focus()); };
  const one = () => { const showing = mode?.kind === 'one' ? mode.task.id : undefined, t = pickOne(pool, seen, roll(), showing); if (!t) return; setSeen(s => new Set([...(seen.size >= pool.length ? [] : s), t.id])); show({kind: 'one', task: t}); };
  const two = () => { const pair = pickTwo(pool, new Set(), [roll(), roll()]); if (!pair.length) return; setSeen(new Set(pair.map(t => t.id))); show(pair.length === 1 ? {kind: 'chosen', task: pair[0]!} : {kind: 'two', tasks: pair}); };
  const keep = (kept: Task) => { const next = keepOne(pool, seen, kept, roll()); if (!next) { show({kind: 'chosen', task: kept}); return; } setSeen(s => new Set([...s, next.id])); show({kind: 'two', tasks: [kept, next]}); };
  const scopeName = scope.kind === 'today' ? 'today’s tasks' : scope.kind === 'project' ? `“${projects.find(p => p.id === scope.id)?.name ?? 'the project'}”` : `@${scope.name}`;
  const facts = (t: Task) => [dreadSign(t), t.minutes ? `${formatNumber(t.minutes)} min` : null].filter(Boolean).join(' · ');
  const act = (t: Task) => <p className="tasks-pick-actions">
    {onOpen && <button type="button" className="secondary" onClick={() => onOpen(t)}>This one</button>}
    {onFocus && <button type="button" className="quiet" aria-label={`Focus on “${t.title}”`} onClick={() => onFocus(t)}>Focus on it</button>}
    <button type="button" className="quiet" onClick={one}>Another</button>
  </p>;
  return <details className="tasks-pick" onToggle={e => { if (!(e.currentTarget as HTMLDetailsElement).open) { setMode(null); setSeen(new Set()); } }}>
    <summary>Pick one for me</summary>
    <div className="tasks-pick-body">
      <p className="fine">When choosing is the hard part: one of your own open tasks, offered at random. It only offers; nothing is moved or changed.</p>
      <label className="field"><span>From</span><select value={scopeKey} onChange={e => { setScopeKey(e.target.value); setMode(null); setSeen(new Set()); }}>
        <option value="today">Today’s tasks</option>
        {projects.map(p => <option key={p.id} value={`project:${p.id}`}>Project: {p.name}</option>)}
        {labels.map(l => <option key={l.name} value={`label:${l.name}`}>Label: @{l.name}</option>)}
      </select></label>
      {!pool.length ? <p className="fine" role="status">{scope.kind === 'today' ? 'Nothing open is planned for today yet. Choose a project or a label above, or plan a task for today first.' : `Nothing open in ${scopeName} to pick from.`}</p>
        : <p className="tasks-pick-actions"><button type="button" className="secondary" onClick={one}>{mode?.kind === 'one' ? 'Pick again' : 'Pick one'}</button>
          {pool.length > 1 && <button type="button" className="quiet" onClick={two}>This or that</button>}
          <small className="fine">{formatNumber(pool.length)} to pick from in {scopeName}</small></p>}
      <div ref={result} tabIndex={-1} className="tasks-pick-result" aria-live="polite" id={`${id}-result`}>
        {mode?.kind === 'one' && <><p className="tasks-pick-one" dir="auto">{mode.task.title}</p>{facts(mode.task) && <p className="fine">{facts(mode.task)}</p>}{act(mode.task)}</>}
        {mode?.kind === 'two' && <><p>Which of these two would you rather do? The one you keep meets the next.</p>
          <div className="tasks-pick-two" role="group" aria-label="This or that">{mode.tasks.map(t => <button key={t.id} type="button" className="secondary" dir="auto" aria-label={`Keep “${t.title}”`} onClick={() => keep(t)}>{t.title}</button>)}</div></>}
        {mode?.kind === 'chosen' && <><p>Your pick:</p><p className="tasks-pick-one" dir="auto">{mode.task.title}</p>{act(mode.task)}</>}
      </div>
    </div>
  </details>;
}
