'use client';
import {useMemo, useState} from 'react';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import {exerciseData} from '../../lib/health-counters';
import {healthGoalLine, healthGoalProgress} from '../../lib/health-goals/progress';
import type {HealthGoal} from '../../lib/health-goals/schema';
import {addHealthGoal, editHealthGoal, setHealthGoalStatus, type HealthGoalDraft} from '../../lib/health-goals/store';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {isShowcase} from '../../lib/showcase-storage';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {GlassBar} from '../progress/glass-progress';
import {PhoneFormSheet} from '../phone/phone-form-sheet';
import {usePhoneActive} from '../phone/use-phone-layout';
import {useHealthToday} from '../health/use-health-today';
import {HealthGoalCreator} from './health-goal-creator';
import type {HealthGoalsStore} from './use-health-goals';
import './health-goals.css';

/** "Health goals · on this device" on the Goals page (G3): rows from the Health journal, a creator, done and closed behind a fold. */
export function HealthGoalsSection({goals, health, healthLoaded}: {goals: HealthGoalsStore; health: HealthData; healthLoaded: boolean}) {
  const phone = usePhoneActive(), preferences = dailyData(health).preferences, today = useHealthToday(preferences.timezone);
  const [editor, setEditor] = useState<'new' | HealthGoal | null>(null); const [showDone, setShowDone] = useState(false); const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const counters = exerciseData(health).counters, units = useMemo(() => ({weightUnit: preferences.weightUnit, waterUnit: preferences.waterUnit}), [preferences.weightUnit, preferences.waterUnit]);
  const active = goals.data.goals.filter(g => g.status === 'active'), rest = goals.data.goals.filter(g => g.status !== 'active');
  async function save(draft: HealthGoalDraft) {
    const editing = editor && editor !== 'new' ? editor : null;
    await goals.update(current => editing ? editHealthGoal(current, editing.id, draft) : addHealthGoal(current, draft));
    setMessage(editing ? 'Health goal saved.' : 'Health goal created.'); setEditor(null);
  }
  async function status(goal: HealthGoal, next: HealthGoal['status']) {
    setError(''); try { await goals.update(current => setHealthGoalStatus(current, goal.id, next)); setMessage(next === 'done' ? `${goal.name} marked done.` : next === 'closed' ? `${goal.name} closed.` : `${goal.name} reopened.`); } catch (e) { setError(`The health goal was not changed. ${deviceSettingFailureMessage(e)}`); }
  }
  const row = (goal: HealthGoal) => {
    const progress = healthLoaded ? healthGoalProgress(goal, health, today) : {kind: 'no-data' as const};
    const line = healthGoalLine(goal, progress);
    return <li key={goal.id} className="health-goal-row" data-status={goal.status}>
      <div className="health-goal-row-copy"><strong>{goal.name}</strong><span className="health-goal-line">{line}{isShowcase() && goal.id.startsWith('92000000-') ? ' · Showcase example' : ''}</span>
        {progress.kind === 'value' && progress.percent !== null && <GlassBar identity={`health-goal:${goal.id}`} className="health-goal-track" aria-hidden="true" value={progress.percent / 100} />}
        {progress.kind === 'value' && <small>{progress.ended ? `Ended ${progress.ended} · ` : ''}{progress.detail}</small>}
        {progress.kind === 'no-data' && progress.detail && <small>{progress.detail}</small>}
        {goal.status === 'closed' && <small>Closed {goal.updatedAt.slice(0, 10)}</small>}
      </div>
      <div className="health-goal-row-actions">
        {goal.status === 'active' && <button type="button" className="quiet" aria-label={`Edit ${goal.name}`} onClick={() => { setEditor(goal); setMessage(''); }}>Edit</button>}
        {goal.status === 'active' && progress.kind === 'value' && progress.done && <button type="button" className="secondary" aria-label={`Mark ${goal.name} done`} onClick={() => void status(goal, 'done')}>Mark done</button>}
        {goal.status === 'active' && <button type="button" className="quiet" aria-label={`Close ${goal.name}`} onClick={() => void status(goal, 'closed')}>Close</button>}
        {goal.status !== 'active' && <button type="button" className="quiet" aria-label={`Reopen ${goal.name}`} onClick={() => void status(goal, 'active')}>Reopen</button>}
      </div>
    </li>;
  };
  const creator = editor ? <HealthGoalCreator key={editor === 'new' ? 'new' : editor.id} goal={editor === 'new' ? undefined : editor} counters={counters} units={units} today={today} onSave={save} onCancel={() => setEditor(null)} /> : null;
  return <section className="panel health-goals" id="goals-health" aria-labelledby="health-goals-title">
    <div className="habit-section-heading"><div><p className="eyebrow">Your body, your measure</p><h2 id="health-goals-title">Health goals</h2><p className="fine">Progress from your own Health journal. Nothing is suggested, and nothing is scored. {SYNC_WRITES ? 'Kept with your Health records.' : 'Kept on this device.'}</p></div>
      {!goals.unreadable && <button type="button" className="primary" disabled={!goals.loaded} onClick={() => { setEditor('new'); setMessage(''); }}>+ Health goal</button>}</div>
    {goals.unreadable ? goals.error ? <div className="notice" role="alert"><p>{goals.error}</p></div> : <div className="notice" role="alert"><p>Your saved health goals on this device could not be read. They were not changed.</p>
      {confirming ? <div className="actions"><p className="fine">Start over keeps the old bytes as a recovery copy and continues with no health goals.</p><button type="button" className="secondary" onClick={() => { setConfirming(false); goals.startOver().then(() => setMessage('Your health goals on this device start over.'), e => setError(deviceSettingFailureMessage(e))); }}>Start over</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div> : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Start over…</button>}</div> : <>
      {goals.loaded && !goals.data.goals.length && !editor && <p className="health-goals-empty">No health goals yet. Choose a measure you already record in Health, and a target you’ve chosen yourself.</p>}
      {active.length > 0 && <ul className="health-goal-list" aria-label="Active health goals">{active.map(row)}</ul>}
      {rest.length > 0 && <div className="health-goals-fold"><button type="button" className="quiet" aria-expanded={showDone} onClick={() => setShowDone(open => !open)}>{showDone ? 'Hide done and closed' : `Show done and closed (${rest.length})`}</button>{showDone && <ul className="health-goal-list" aria-label="Done and closed health goals">{rest.map(row)}</ul>}</div>}
    </>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {creator && (phone ? <PhoneFormSheet title={editor === 'new' ? 'New health goal' : 'Edit health goal'} onClose={() => setEditor(null)}>{creator}</PhoneFormSheet> : creator)}
  </section>;
}
