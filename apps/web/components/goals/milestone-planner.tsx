'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {latestHabitRule, type Habit} from '../../lib/habits';
import type {Platform, PrivateGoal} from '../../lib/positions';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS} from '../../lib/goal-extras/store';
import {habitsForMilestone, linkHabitToMilestone, milestoneSetFor, milestonesFromSet, pruneMilestoneHabits, unlinkHabitFromMilestone} from '../../lib/goals/milestone-templates';
import {suggestedMilestones} from '../../lib/goals/milestone-suggest';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from '../platform/common';
import {plainErrorMessage} from '../../lib/plain-error';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './milestone-planner.css';

type Update = (change: (data: Platform) => Platform) => Promise<unknown>;
/**
 * Session AK (6.4): under a goal's milestones, a suggested set for this kind of goal (lib/goals/milestone-templates.ts:
 * by the template it started from, else by its name) while it has none, each step ticked or not by the person, and the
 * habits that work toward each milestone ("Easy run" → "Run 5 km"), kept in the goal extras (`milestoneHabits`, synced
 * with them). Links to a milestone or a habit that is gone are pruned here. A money step's value is a share of the
 * person's own target; nothing moves money.
 */
export function MilestonePlanner({goal, habits, habitsReady, update, run}: {goal: PrivateGoal; habits: readonly Habit[]; habitsReady: boolean; update: Update; run: (action: () => Promise<unknown>) => Promise<void>}) {
  const id = useId(), key = `private:${goal.id}`;
  const extras = useDeviceRecord(GOAL_EXTRAS), writable = extras.loaded && !extras.unreadable;
  const closed = goal.status === 'closed';
  const set = useMemo(() => milestoneSetFor({templateId: writable ? extras.data.goals[key]?.template : undefined, name: goal.name}), [writable, extras.data, key, goal.name]);
  const steps = useMemo(() => set ? suggestedMilestones(goal, milestonesFromSet(set, BigInt(goal.target))) : [], [set, goal]);
  const [picked, setPicked] = useState<Record<string, boolean>>({}), [hidden, setHidden] = useState(false);
  const [error, setError] = useState(''), [said, setSaid] = useState('');
  // Links to milestones or habits that are gone are pruned (a removed milestone, a habit deleted for good).
  const milestoneIds = goal.milestones.map(m => m.id).join('|'), habitIds = habits.map(h => h.id).join('|');
  useEffect(() => {
    if (!writable || !habitsReady) return;
    const at = new Date().toISOString(), keepM = new Set(milestoneIds ? milestoneIds.split('|') : []), keepH = new Set(habitIds ? habitIds.split('|') : []);
    if (pruneMilestoneHabits(extras.data, key, keepM, keepH, at) === extras.data) return;
    try { extras.update(current => pruneMilestoneHabits(current, key, keepM, keepH, at)); } catch { /* tried again on the next change */ }
  }, [writable, habitsReady, extras, key, milestoneIds, habitIds]);
  const money = (units?: string) => units ? formatGoalAmount(amount(units, goal.decimals), goal.asset) : '';
  const chosen = steps.filter((_, i) => picked[i] !== false);
  function addSuggested() {
    setError(''); setSaid('');
    void run(async () => {
      await update(s => ({...s, goals: s.goals.map(g => g.id === goal.id ? {...g, milestones: [...g.milestones, ...suggestedMilestones(g, chosen).slice(0, Math.max(0, 100 - g.milestones.length)).map(m => ({id: crypto.randomUUID(), title: m.title, done: false, ...(m.target ? {target: m.target} : {})}))]} : g)}));
      setSaid(`${chosen.length} ${chosen.length === 1 ? 'milestone' : 'milestones'} added. Edit or remove any of them above.`);
    });
  }
  function link(milestoneId: string, habitId: string, on: boolean) {
    setError(''); setSaid('');
    if (!writable) { setError('Your goal details on this device could not be read, so nothing was changed.'); return; }
    const habit = habits.find(h => h.id === habitId)?.title ?? 'The habit', milestone = goal.milestones.find(m => m.id === milestoneId)?.title ?? 'this milestone';
    try {
      const at = new Date().toISOString();
      extras.update(current => on ? linkHabitToMilestone(current, key, milestoneId, habitId, at) : unlinkHabitFromMilestone(current, key, milestoneId, habitId, at));
      setSaid(on ? `${habit} now works toward “${milestone}”.` : `${habit} no longer linked to “${milestone}”.`);
    } catch (cause) { setError(plainErrorMessage(cause, `Not saved on this device. ${deviceSettingFailureMessage(cause)}`)); }
  }
  const offer = !closed && !hidden && set && steps.length > 0 && goal.milestones.length === 0;
  const linkable = habits.filter(h => latestHabitRule(h).state !== 'archived');
  return <div className="milestone-planner">
    {offer && <section className="milestone-suggest" aria-labelledby={`${id}-suggest`}>
      <h3 id={`${id}-suggest`}>Suggested milestones · {set!.title}</h3>
      <p className="fine">Steps people often take toward a goal like this. Untick any you do not want; you can rename, reorder or remove them after.{goal.type !== 'PROJECT' ? ' A value is a share of your own target.' : ''}</p>
      <ul className="milestone-suggest-list">{steps.map((s, i) => <li key={s.title}><label className="checkbox"><input type="checkbox" checked={picked[i] !== false} onChange={e => setPicked(p => ({...p, [i]: e.target.checked}))}/>{s.title}{s.target ? <small> · at {money(s.target)}</small> : null}</label></li>)}</ul>
      <div className="actions"><button type="button" className="secondary" disabled={!chosen.length} onClick={addSuggested}>{chosen.length ? `Add ${chosen.length} ${chosen.length === 1 ? 'milestone' : 'milestones'}` : 'Nothing ticked'}</button><button type="button" className="quiet" onClick={() => setHidden(true)}>Not now</button></div>
    </section>}
    {goal.milestones.length > 0 && linkable.length > 0 && <section className="milestone-habits" aria-labelledby={`${id}-habits`}>
      <h3 id={`${id}-habits`}>Habits toward each milestone</h3>
      <p className="fine">Which habits move each step forward. A link is a note to yourself: ticking a habit never changes the milestone.</p>
      <ul className="milestone-habits-list">{goal.milestones.map(m => {
        const ids = writable ? habitsForMilestone(extras.data, key, m.id) : [], free = linkable.filter(h => !ids.includes(h.id));
        return <li key={m.id}><strong>{m.title}</strong>
          {ids.length ? <ul className="milestone-habit-chips">{ids.map(hid => { const title = habits.find(h => h.id === hid)?.title ?? 'A habit'; return <li key={hid}><span>{title}</span>{!closed && <button type="button" className="quiet" aria-label={`Unlink ${title} from ${m.title}`} onClick={() => link(m.id, hid, false)}>Unlink</button>}</li>; })}</ul> : null}
          {!closed && free.length > 0 && <form className="milestone-habit-add" onSubmit={e => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('habit') ?? ''); if (value) link(m.id, value, true); }}>
            <label>Habit for “{m.title}”<select name="habit" defaultValue="">{[<option key="" value="">Choose a habit</option>, ...free.map(h => <option key={h.id} value={h.id}>{h.title}</option>)]}</select></label>
            <button type="submit" className="secondary" disabled={!writable}>Link</button>
          </form>}
        </li>;
      })}</ul>
    </section>}
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
export default MilestonePlanner;
