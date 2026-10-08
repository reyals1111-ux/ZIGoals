'use client';
import {useEffect, useRef, useState} from 'react';
import type {Platform, PrivateGoal} from '../../lib/positions';
import {parseAmountInput} from '../../lib/amount-input';
import {visibleName} from '../../lib/visible-text';
import {formatGoalAmount} from '../../lib/goal-summary';
import {milestoneDateOf, milestoneMarks, milestoneNoteId, milestoneState, setMilestoneDate, type Milestone} from '../../lib/goals/milestones';
import {MILESTONE_DATES} from '../../lib/goals/milestone-dates';
import {CELEBRATIONS} from '../../lib/celebrations';
import {zigiSignals} from '../zigi/bus';
import {useDeviceRecord} from '../ai/use-device-record';
import {GlassBar} from '../progress/glass-progress';
import {amount} from './common';

/**
 * A Goal's milestones (Session W Part 11): each with an optional target value (where the Goal keeps it) and target date
 * (this device), done by the person's own tick, "reached" once the recorded progress passes its value; a track that
 * shows where each one sits; one calm note per milestone reached or done, once on this device. Editing and removing are
 * ordinary Goal edits; nothing moves money.
 */
type Update = (change: (data: Platform) => Platform) => Promise<unknown>;
const withMilestones = (data: Platform, id: string, change: (list: Milestone[]) => Milestone[]): Platform => ({...data, goals: data.goals.map(g => g.id === id ? {...g, milestones: change(g.milestones)} : g)});
export function GoalMilestonesModule({goal, current, update, run, today}: {goal: PrivateGoal; current: bigint; update: Update; run: (action: () => Promise<unknown>) => Promise<void>; today: string}) {
  const dates = useDeviceRecord(MILESTONE_DATES), notes = useDeviceRecord(CELEBRATIONS), [editing, setEditing] = useState<string | null>(null), [error, setError] = useState('');
  const closed = goal.status === 'closed', project = goal.type === 'PROJECT', money = (units: string) => formatGoalAmount(amount(units, goal.decimals), goal.asset);
  const states = goal.milestones.map(m => ({m, state: milestoneState(m, current), date: dates.loaded ? milestoneDateOf(dates.data, goal.id, m.id) : undefined}));
  const fresh = notes.loaded && !notes.unreadable ? states.filter(s => s.state !== 'open' && !notes.data.seen[milestoneNoteId(goal.id, s.m.id)]) : [];
  // Session X-Local Part 4: a milestone newly reached or done is a validated fact for ZIGi, signalled once per milestone.
  const signalled = useRef(new Set<string>()), freshKey = fresh.map(s => milestoneNoteId(goal.id, s.m.id)).sort().join('|');
  useEffect(() => { for (const id of freshKey ? freshKey.split('|') : []) if (!signalled.current.has(id)) { signalled.current.add(id); zigiSignals.emitValidated('goal_milestone_reached'); } }, [freshKey]);
  const marks = milestoneMarks(goal), share = project ? (goal.milestones.length ? goal.milestones.filter(m => m.done).length / goal.milestones.length : 0) : Number(current * 10_000n / (BigInt(goal.target) || 1n)) / 10_000;
  // One note at a time: several milestones met at once (or before this build first opened) share one, kept once.
  function seen(list: typeof fresh) { try { notes.update(n => ({...n, seen: {...n.seen, ...Object.fromEntries(list.map(s => [milestoneNoteId(goal.id, s.m.id), today]))}})); } catch { setError('Not saved on this device.'); } }
  function saveDate(milestoneId: string, date: string) { try { dates.update(d => setMilestoneDate(d, goal.id, milestoneId, date || null)); setError(''); } catch { setError('The date was not saved on this device.'); } }
  function parseTarget(text: string): string | undefined { const t = text.trim(); if (!t || project) return undefined; const v = parseAmountInput(t, goal.decimals); if (v <= 0n || v > BigInt(goal.target)) throw Error(`A milestone's value is above zero and at most the Goal's target.`); return v.toString(); }
  return <>
    <h2>Milestones</h2>
    {fresh.length === 1 && <div className="goal-milestone-note" role="group" aria-label={`Milestone ${fresh[0]!.state}: ${fresh[0]!.m.title}`}>
      <p>{fresh[0]!.state === 'done' ? `You marked “${fresh[0]!.m.title}” done.` : `Your recorded progress passed “${fresh[0]!.m.title}”.`} One step of {goal.name}.</p>
      <button type="button" className="quiet" onClick={() => seen(fresh)}>Thanks</button>
    </div>}
    {fresh.length > 1 && <div className="goal-milestone-note" role="group" aria-label={`${fresh.length} milestones reached or done`}>
      <p>{fresh.length} milestones of {goal.name} are reached or done: {fresh.map(s => `“${s.m.title}”`).join(', ')}.</p>
      <button type="button" className="quiet" onClick={() => seen(fresh)}>Thanks</button>
    </div>}
    {goal.milestones.length > 0 && <div className="goal-milestone-track" role="img" aria-label={project ? `${goal.milestones.filter(m => m.done).length} of ${goal.milestones.length} milestones done` : `Progress ${Math.round(share * 100)} % of the target; milestones at ${marks.map(k => `${Math.round(k.at * 100)} %`).join(', ') || 'no set values'}`}>
      <GlassBar identity={`goal-milestones:${goal.id}`} className="goal-milestone-bar" value={Math.min(1, share)} />
      {project ? goal.milestones.map((m, i) => <i key={m.id} className="goal-milestone-mark" style={{left: `${((i + 1) / goal.milestones.length) * 100}%`}} data-done={m.done || undefined} />)
        : marks.map(k => <i key={k.id} className="goal-milestone-mark" style={{left: `${k.at * 100}%`}} data-done={current >= BigInt(goal.milestones.find(m => m.id === k.id)!.target!) || undefined} title={k.title} />)}
    </div>}
    {states.length ? <ul className="goal-milestone-list">{states.map(({m, state, date}) => <li key={m.id}>
      {editing === m.id ? <form className="platform-form goal-milestone-edit" aria-label={`Edit milestone ${m.title}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { const title = visibleName(String(f.get('title')).trim(), 'Name the milestone with at least one visible character.'), target = parseTarget(String(f.get('target') ?? '')); const date = String(f.get('date') ?? ''); void run(async () => { await update(s => withMilestones(s, goal.id, list => list.map(x => x.id === m.id ? {id: x.id, title, done: x.done, ...(target ? {target} : {})} : x))); saveDate(m.id, date); setEditing(null); }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the milestone.'); } }}>
        <label className="field">Milestone<input name="title" defaultValue={m.title} maxLength={100} required /></label>
        {!project && <label className="field">Value ({goal.asset}, optional)<input name="target" inputMode="decimal" defaultValue={m.target ? amount(m.target, goal.decimals) : ''} /></label>}
        <label className="field">Target date (optional, this device)<input name="date" type="date" defaultValue={date ?? ''} /></label>
        <div className="actions"><button className="secondary" type="submit">Save milestone</button><button className="quiet" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="quiet" type="button" onClick={() => void run(async () => { await update(s => withMilestones(s, goal.id, list => list.filter(x => x.id !== m.id))); try { dates.update(d => setMilestoneDate(d, goal.id, m.id, null)); } catch { /* a stale date is harmless: nothing reads a removed milestone's date */ } setEditing(null); })}>Remove milestone</button></div>
      </form> : <div className="goal-milestone-row">
        <label className="checkbox"><input type="checkbox" checked={m.done} disabled={closed} onChange={e => { const done = e.target.checked; void run(() => update(s => withMilestones(s, goal.id, list => list.map(x => x.id === m.id ? {...x, done} : x)))); }} />{m.title}</label>
        <small>{[m.target ? `at ${money(m.target)}` : '', date ? `by ${date}` : '', state === 'reached' ? 'reached by your recorded progress' : state === 'done' ? 'done' : ''].filter(Boolean).join(' · ')}</small>
        {!closed && <button type="button" className="quiet" aria-label={`Edit milestone ${m.title}`} onClick={() => setEditing(m.id)}>Edit</button>}
      </div>}
    </li>)}</ul> : <p>No milestones yet.</p>}
    {!closed && <form className="platform-form goal-milestone-add" aria-label="Add a milestone" onSubmit={e => { e.preventDefault(); const form = e.currentTarget, f = new FormData(form); try { const title = visibleName(String(f.get('title')).trim(), 'Name the milestone with at least one visible character.'), target = parseTarget(String(f.get('target') ?? '')), id = crypto.randomUUID(), date = String(f.get('date') ?? ''); void run(async () => { await update(s => withMilestones(s, goal.id, list => [...list, {id, title, done: false, ...(target ? {target} : {})}])); if (date) saveDate(id, date); form.reset(); }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the milestone.'); } }}>
      <label className="field">New milestone<input name="title" maxLength={100} required /></label>
      {!project && <label className="field">Value ({goal.asset}, optional)<input name="target" inputMode="decimal" /></label>}
      <label className="field">Target date (optional, this device)<input name="date" type="date" /></label>
      <button className="secondary">Add milestone</button>
    </form>}
    <p className="fine">A milestone’s value sits on your Goal’s track and reads “reached” once your recorded progress passes it; “done” is your own tick. Target dates stay on this device for now.</p>
    {error && <p role="alert">{error}</p>}
  </>;
}
