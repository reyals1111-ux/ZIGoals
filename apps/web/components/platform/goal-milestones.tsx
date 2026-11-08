'use client';
import {useEffect, useRef, useState} from 'react';
import type {Platform, PrivateGoal} from '../../lib/positions';
import {parseAmountInput} from '../../lib/amount-input';
import {visibleName} from '../../lib/visible-text';
import {formatGoalAmount} from '../../lib/goal-summary';
import {Suspense, lazy} from 'react';
import {usePhoneActive} from '../phone/use-phone-layout';
// Session AA-Local S5, wired here by the second merger (ADR-022 B53): on a phone a swipe right completes a milestone (a swipe never deletes); the swipe row is its own chunk, fetched on phones only, so Today's budget holds.
const SwipeRow = lazy(() => import('../swipe/swipe-row').then(m => ({default: m.SwipeRow})));
import {milestoneDateOf, milestoneMarks, milestoneNoteId, milestoneState, setMilestoneDate, type Milestone} from '../../lib/goals/milestones';
import {MILESTONE_DATES} from '../../lib/goals/milestone-dates';
import {CELEBRATIONS} from '../../lib/celebrations';
import {zigiSignals} from '../zigi/bus';
import {showUndo} from '../ui/undo-toast';
import {MILESTONE_MAX, milestoneNameIssue} from '../../lib/goals/milestone-lines';
const PAST_DATE = 'Choose today or a later day for the milestone.';
import {useDeviceRecord} from '../ai/use-device-record';
import {GlassBar} from '../progress/glass-progress';
import {amount} from './common';
import {formatDate} from '../../lib/visual-format';
import {StarToggle} from '../checklist/star-toggle';
import {plainErrorMessage} from '../../lib/plain-error';
import { plural } from '../../lib/plural';
import {dropMilestoneOn, insertMilestoneAfter, moveMilestone} from '../../lib/goals/milestone-templates';
import {reorderKey} from '../../lib/habits-order/reorder';
import {REMOVAL_UNDO_MS} from '../../lib/goals/goal-removal';

/**
 * A Goal's milestones (Session W Part 11): each with an optional target value (where the Goal keeps it) and target date
 * (this device), done by the person's own tick, "reached" once the recorded progress passes its value; a track that
 * shows where each one sits; one calm note per milestone reached or done, once on this device. Editing and removing are
 * ordinary Goal edits; nothing moves money.
 */
type Update = (change: (data: Platform) => Platform) => Promise<unknown>;
const withMilestones = (data: Platform, id: string, change: (list: Milestone[]) => Milestone[]): Platform => ({...data, goals: data.goals.map(g => g.id === id ? {...g, milestones: change(g.milestones)} : g)});
export function GoalMilestonesModule({goal, current, update, run, today}: {goal: PrivateGoal; current: bigint; update: Update; run: (action: () => Promise<unknown>, said?: string) => Promise<void>; today: string}) {
  const dates = useDeviceRecord(MILESTONE_DATES), notes = useDeviceRecord(CELEBRATIONS), [editing, setEditing] = useState<string | null>(null), [error, setError] = useState('');
  // Session AL Part 15 (AL-COMPETITOR-GAP-114): the dragged milestone, and where a new one goes ('' = at the end).
  const [dragged, setDragged] = useState<string | null>(null), [placeAfter, setPlaceAfter] = useState('');
  const closed = goal.status === 'closed', project = goal.type === 'PROJECT', money = (units: string) => formatGoalAmount(amount(units, goal.decimals), goal.asset);
  const states = goal.milestones.map(m => ({m, state: milestoneState(m, current), date: dates.loaded ? milestoneDateOf(dates.data, goal.id, m.id) : undefined}));
  const fresh = notes.loaded && !notes.unreadable ? states.filter(s => s.state !== 'open' && !notes.data.seen[milestoneNoteId(goal.id, s.m.id)]) : [];
  // Session X-Local Part 4: a milestone newly reached or done is a validated fact for ZIGi, signalled once per milestone.
  const phone = usePhoneActive();
  const signalled = useRef(new Set<string>()), freshKey = fresh.map(s => milestoneNoteId(goal.id, s.m.id)).sort().join('|');
  useEffect(() => { for (const id of freshKey ? freshKey.split('|') : []) if (!signalled.current.has(id)) { signalled.current.add(id); zigiSignals.emitValidated('goal_milestone_reached'); } }, [freshKey]);
  const marks = milestoneMarks(goal), share = project ? (goal.milestones.length ? goal.milestones.filter(m => m.done).length / goal.milestones.length : 0) : Number(current * 10_000n / (BigInt(goal.target) || 1n)) / 10_000;
  // One note at a time: several milestones met at once (or before this build first opened) share one, kept once.
  function seen(list: typeof fresh) { try { notes.update(n => ({...n, seen: {...n.seen, ...Object.fromEntries(list.map(s => [milestoneNoteId(goal.id, s.m.id), today]))}})); } catch { setError('Not saved on this device.'); } }
  const dateOf = (milestoneId: string) => dates.loaded ? milestoneDateOf(dates.data, goal.id, milestoneId) : undefined;
  function saveDate(milestoneId: string, date: string) { try { dates.update(d => setMilestoneDate(d, goal.id, milestoneId, date || null)); setError(''); } catch { setError('The date was not saved on this device.'); } }
  function parseTarget(text: string): string | undefined { const t = text.trim(); if (!t || project) return undefined; const v = parseAmountInput(t, goal.decimals); if (v <= 0n || v > BigInt(goal.target)) throw Error(`A milestone's value is above zero and at most the Goal's target.`); return v.toString(); }
  return <>
    <h2>Milestones</h2>
    {fresh.length === 1 && <div className="goal-milestone-note" role="group" aria-label={`Milestone ${fresh[0]!.state}: ${fresh[0]!.m.title}`}>
      <p>{fresh[0]!.state === 'done' ? `You marked “${fresh[0]!.m.title}” done.` : `Your recorded progress passed “${fresh[0]!.m.title}”.`} One step of {goal.name}.</p>
      <button type="button" className="quiet" onClick={() => seen(fresh)}>Thanks</button>
    </div>}
    {fresh.length > 1 && <div className="goal-milestone-note" role="group" aria-label={`${fresh.length} milestones reached or done`}>
      <p>{fresh.length} {plural(fresh.length, 'milestone')} of {goal.name} {fresh.length === 1 ? 'is' : 'are'} reached or done: {fresh.map(s => `“${s.m.title}”`).join(', ')}.</p>
      <button type="button" className="quiet" onClick={() => seen(fresh)}>Thanks</button>
    </div>}
    {goal.milestones.length > 0 && <div className="goal-milestone-track" role="img" aria-label={project ? `${goal.milestones.filter(m => m.done).length} of ${goal.milestones.length} ${plural(goal.milestones.length, 'milestone')} done` : `Progress ${Math.round(share * 100)} % of the target; milestones at ${marks.map(k => `${Math.round(k.at * 100)} %`).join(', ') || 'no set values'}`}>
      <GlassBar identity={`goal-milestones:${goal.id}`} className="goal-milestone-bar" value={Math.min(1, share)} />
      {project ? goal.milestones.map((m, i) => <i key={m.id} className="goal-milestone-mark" style={{left: `${((i + 1) / goal.milestones.length) * 100}%`}} data-done={m.done || undefined} />)
        : marks.map(k => <i key={k.id} className="goal-milestone-mark" style={{left: `${k.at * 100}%`}} data-done={current >= BigInt(goal.milestones.find(m => m.id === k.id)!.target!) || undefined} title={k.title} />)}
    </div>}
    {states.length ? <ul className="goal-milestone-list">{states.map(({m, state, date}) => { const row = <>
      {editing === m.id ? <form className="platform-form goal-milestone-edit" aria-label={`Edit milestone ${m.title}`} noValidate onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { /* Session AL (DV-107, DV-109, DV-019d; P-DV-06/58/04): an empty, too long or repeated name, or a past date, is said here */ const issue = milestoneNameIssue(String(f.get('title') ?? ''), goal.milestones.filter(x => x.id !== m.id).map(x => x.title)); if (issue) throw Error(issue); const title = visibleName(String(f.get('title')).replace(/\s+/g, ' ').trim(), 'Name the milestone with at least one visible character.'), target = parseTarget(String(f.get('target') ?? '')); const date = String(f.get('date') ?? ''); if (date && date !== (dateOf(m.id) ?? '') && date < today) throw Error(PAST_DATE); setError(''); void run(async () => { await update(s => withMilestones(s, goal.id, list => list.map(x => x.id === m.id ? {id: x.id, title, done: x.done, ...(target ? {target} : {})} : x))); saveDate(m.id, date); setEditing(null); }, 'Milestone saved.'); } catch (cause) { setError(plainErrorMessage(cause, 'Check the milestone.')); } }}>
        <label className="field">Milestone<input name="title" defaultValue={m.title} maxLength={MILESTONE_MAX} required /></label>
        {!project && <label className="field">Value ({goal.asset}, optional)<input name="target" inputMode="decimal" defaultValue={m.target ? amount(m.target, goal.decimals) : ''} /></label>}
        <label className="field">Target date (optional, this device)<input name="date" type="date" defaultValue={date ?? ''} /></label>
        <div className="actions"><button className="secondary" type="submit">Save milestone</button><button className="quiet" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="quiet" type="button" onClick={() => void run(async () => { const at = (goal.milestones ?? []).findIndex(x => x.id === m.id), before = date ?? null; await update(s => withMilestones(s, goal.id, list => list.filter(x => x.id !== m.id))); try { dates.update(d => setMilestoneDate(d, goal.id, m.id, null)); } catch { /* a stale date is harmless: nothing reads a removed milestone's date */ } setEditing(null);
          // Session AA-Cloud Part 6: Undo puts the milestone back in its place, with its date.
          showUndo({timeoutMs: REMOVAL_UNDO_MS, message: `“${m.title}” removed.`, restore: async () => { await update(s => withMilestones(s, goal.id, list => list.some(x => x.id === m.id) ? list : [...list.slice(0, Math.max(0, at)), m, ...list.slice(Math.max(0, at))])); if (before) { try { dates.update(d => setMilestoneDate(d, goal.id, m.id, before)); } catch { /* the milestone is back; its date can be set again */ } } }, undone: `“${m.title}” is back.`}); }, `“${m.title}” removed.`)}>Remove milestone</button></div>{error && <p role="alert" className="field-error">{error}</p>}
      </form> : <div className="goal-milestone-row" data-dragging={dragged === m.id || undefined} onDragOver={e => { if (dragged && dragged !== m.id) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const from = dragged ?? e.dataTransfer.getData('text/plain'); setDragged(null); if (!from || from === m.id || !goal.milestones.some(x => x.id === from)) return; const next = dropMilestoneOn(goal.milestones, from, m.id), title = goal.milestones.find(x => x.id === from)!.title; void run(() => update(s => withMilestones(s, goal.id, list => dropMilestoneOn(list, from, m.id))), `“${title}” moved to position ${next.findIndex(x => x.id === from) + 1} of ${next.length}.`); }}>
        <label className="checkbox"><input type="checkbox" checked={m.done} disabled={closed} onChange={e => { const done = e.target.checked; void run(() => update(s => withMilestones(s, goal.id, list => list.map(x => x.id === m.id ? {...x, done} : x))), done ? `Milestone done: “${m.title}”.` : `Milestone open again: “${m.title}”.`); }} />{m.title}</label>
        <small>{[m.target ? `at ${money(m.target)}` : '', date ? `by ${formatDate(date)}` : '', state === 'reached' ? 'reached by your recorded progress' : state === 'done' ? 'done' : date && date < today ? 'past its date' : ''].filter(Boolean).join(' · ')}</small>
        {!closed && <StarToggle item={{kind: 'goal-step', goalId: goal.id, milestoneId: m.id}} label={m.title}/>}
        {!closed && <button type="button" className="quiet" aria-label={`Edit milestone ${m.title}`} onClick={() => setEditing(m.id)}>Edit</button>}
        {/* Session AL (DV-019e-1, DV-040a; P-DV-59): a project's steps can be put in order, by keyboard or pointer */}
        {/* Session AL Part 15 (AL-COMPETITOR-GAP-114): a handle to drag, or to move with ↑/↓ (Alt + ↑/↓, Home, End also) */}
        {!closed && project && goal.milestones.length > 1 && <button type="button" className="quiet goal-milestone-grip" draggable aria-label={`Reorder ${m.title}, position ${goal.milestones.findIndex(x => x.id === m.id) + 1} of ${goal.milestones.length}: press ↑ or ↓, or drag`}
          onKeyDown={e => { const by = reorderKey({key: e.key, altKey: true}); if (by === null) return; e.preventDefault(); const next = moveMilestone(goal.milestones, m.id, by); if (next.map(x => x.id).join() === goal.milestones.map(x => x.id).join()) return; void run(() => update(s => withMilestones(s, goal.id, list => moveMilestone(list, m.id, by))), `“${m.title}” moved to position ${next.findIndex(x => x.id === m.id) + 1} of ${next.length}.`); }}
          onDragStart={e => { setDragged(m.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.id); }} onDragEnd={() => setDragged(null)}><span aria-hidden="true">⋮⋮</span></button>}
        {!closed && project && goal.milestones.length > 1 && <span className="goal-milestone-move" role="group" aria-label={`Move ${m.title}`}>
          <button type="button" className="quiet" aria-label={`Move ${m.title} up`} disabled={goal.milestones[0]?.id === m.id} onClick={() => void run(() => update(s => withMilestones(s, goal.id, list => moveMilestone(list, m.id, -1))), `“${m.title}” moved up.`)}>↑</button>
          <button type="button" className="quiet" aria-label={`Move ${m.title} down`} disabled={goal.milestones.at(-1)?.id === m.id} onClick={() => void run(() => update(s => withMilestones(s, goal.id, list => moveMilestone(list, m.id, 1))), `“${m.title}” moved down.`)}>↓</button>
        </span>}
      </div>}
    </>; const done = () => void run(() => update(s => withMilestones(s, goal.id, list => list.map(x => x.id === m.id ? {...x, done: true} : x)))); return phone ? <Suspense key={m.id} fallback={<li>{row}</li>}><SwipeRow as="li" label={m.title} nameRow={false} completeLabel="Done" onComplete={!closed && !m.done ? done : undefined}>{row}</SwipeRow></Suspense> : <li key={m.id}>{row}</li>; })}</ul> : <p>No milestones yet.</p>}
    {!closed && <form className="platform-form goal-milestone-add" aria-label="Add a milestone" noValidate onSubmit={e => { e.preventDefault(); const form = e.currentTarget, f = new FormData(form); try { /* Session AH (GO6, N-070) and Session AL (DV-019b/c, DV-040d/e): one rule for a milestone name (lib/goals/milestone-lines.ts) */ const issue = milestoneNameIssue(String(f.get('title') ?? ''), (goal.milestones ?? []).map(x => x.title)); if (issue) throw Error(issue); if (String(f.get('date') ?? '') && String(f.get('date')) < today) throw Error(PAST_DATE); setError(''); const title = visibleName(String(f.get('title')).trim(), 'Name the milestone with at least one visible character.'), target = parseTarget(String(f.get('target') ?? '')), id = crypto.randomUUID(), date = String(f.get('date') ?? ''); void run(async () => { const after = project ? placeAfter || null : null; await update(s => withMilestones(s, goal.id, list => insertMilestoneAfter(list, {id, title, done: false, ...(target ? {target} : {})}, after))); if (date) saveDate(id, date); form.reset(); setPlaceAfter(''); }, `Milestone added: “${title}”${project && placeAfter === 'start' ? ', first' : project && placeAfter && goal.milestones.some(x => x.id === placeAfter) ? `, after “${goal.milestones.find(x => x.id === placeAfter)!.title}”` : ''}.`); } catch (cause) { setError(plainErrorMessage(cause, 'Check the milestone.')); } }}>
      <label className="field">New milestone<input name="title" maxLength={MILESTONE_MAX} required aria-describedby={error ? 'goal-milestone-error' : undefined} onInput={() => setError('')} /></label>
      {!project && <label className="field">Value ({goal.asset}, optional)<input name="target" inputMode="decimal" /></label>}
      <label className="field">Target date (optional, this device)<input name="date" type="date" min={today} /></label>
      {/* Session AL Part 15 (AL-COMPETITOR-GAP-114): insert after any step, not only at the end */}
      {project && goal.milestones.length > 0 && <label className="field">Place<select value={goal.milestones.some(x => x.id === placeAfter) || placeAfter === 'start' ? placeAfter : ''} onChange={e => setPlaceAfter(e.target.value)}><option value="">At the end</option><option value="start">First</option>{goal.milestones.map(x => <option key={x.id} value={x.id}>After “{x.title}”</option>)}</select></label>}
      <button className="secondary">Add milestone</button>
      {error && !editing && <p role="alert" className="field-error" id="goal-milestone-error">{error}</p>}
    </form>}
    {/* Session AL (DV-040f, P-DV-130): one idea per goal kind. A project's milestone is simply done when you tick it; only a
        valued milestone also reads "reached" from recorded progress. */}
    <p className="fine">{goal.type === 'PROJECT' || !goal.milestones.some(m => m.target) ? 'Tick a milestone when it is done.' : 'A milestone’s value sits on your Goal’s track and reads “reached” once your recorded progress passes it; “done” is your own tick.'} Target dates are kept on this device and, with an account, travel in your encrypted sync.</p>
    {error && closed && <p role="alert">{error}</p>}
  </>;
}
