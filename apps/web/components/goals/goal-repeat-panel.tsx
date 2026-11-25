'use client';
import {useState} from 'react';
import {GOAL_REPEAT, REPEAT_EVERY, canRepeat, clearRepeat, repeatRows, setRepeat, type RepeatEvery, type RepeatRow} from '../../lib/goals/repeat';
import {unitAmount} from '../../lib/goals/goal-units';
import type {Platform, PrivateGoal} from '../../lib/positions';
import {formatDate, formatMonth, formatNumber} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import './goal-repeat.css';

/**
 * Session AW (X4, LEDGER #447; Strides): "Starts again" on a goal's page, inside its own fold — off, or each week, month
 * or year. On, it shows this period ("This month: 1 of 2 books") and the row of earlier periods, oldest first. Kept in the
 * goal's repeat record on this device (lib/goals/repeat.ts); the count and the milestones start again at the next period.
 */
export const EVERY_WORDS: Record<RepeatEvery, {choice: string; now: string}> = {
  week: {choice: 'Each week', now: 'This week'}, month: {choice: 'Each month', now: 'This month'}, year: {choice: 'Each year', now: 'This year'},
};
export function periodName(key: string): string {
  const [kind, value] = key.split(':') as [string, string];
  return kind === 'week' ? `Week of ${formatDate(value)}` : kind === 'month' ? formatMonth(`${value}-15T12:00:00Z`, {timeZone: 'UTC'}) : value;
}
export function rowAmount(goal: Pick<PrivateGoal, 'type' | 'asset'>, row: Pick<RepeatRow, 'done' | 'of'>): string {
  return goal.type === 'PROJECT' ? `${formatNumber(row.done)} of ${unitAmount(row.of, 'milestones')}` : `${formatNumber(row.done)} of ${unitAmount(row.of, goal.asset)}`;
}
export default function GoalRepeatPanel({goal, platform, today, writable}: {goal: PrivateGoal; platform: Pick<Platform, 'contributions'>; today: string; writable: boolean}) {
  const record = useDeviceRecord(GOAL_REPEAT), entry = record.loaded ? record.data.goals[goal.id] : undefined;
  const [choice, setChoice] = useState<RepeatEvery | 'off' | null>(null), chosen = choice ?? entry?.every ?? 'off';
  if (!record.loaded) return null;
  if (record.unreadable) return <p role="alert" className="fine">This goal&rsquo;s repeat could not be read on this device, so it is not shown and nothing starts again.</p>;
  if (!canRepeat(goal)) return <p className="fine">A savings goal, a rewards goal and a count of a coin or a share keep counting; only a count of your own unit (books, pages) or a project starts again each period.</p>;
  const rows = entry ? repeatRows(platform, goal, entry, today) : [], now = rows.at(-1), earlier = rows.slice(0, -1);
  const save = () => {
    const before = record.data;
    try {
      record.update(r => chosen === 'off' ? clearRepeat(r, goal.id) : setRepeat(r, goal, chosen, today, new Date().toISOString()));
      setChoice(null);
      showUndo({message: chosen === 'off' ? `${goal.name} no longer starts again; it keeps counting from here.` : `${goal.name} starts again ${EVERY_WORDS[chosen].choice.toLowerCase()}. ${EVERY_WORDS[chosen].now} keeps what is counted now.`, restore: () => { record.update(() => before); }, undone: 'Put back as it was.'});
    } catch (cause) { showStatus(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`, {tone: 'error'}); }
  };
  return <div className="goal-repeat">
    <h2>Starts again</h2>
    {entry && now ? <>
      <p className="goal-repeat-now"><strong>{EVERY_WORDS[entry.every].now}:</strong> {rowAmount(goal, now)}{now.reached ? ' · reached' : ''}</p>
      {earlier.length ? <ul className="goal-repeat-rows" aria-label="Earlier periods">{earlier.slice(-12).map(r => <li key={r.period}><strong>{periodName(r.period)}</strong><span>{rowAmount(goal, r)}{r.reached ? ' · reached' : ''}</span></li>)}</ul>
        : <p className="fine">The first {entry.every} is under way. When the next one begins, this {entry.every}&rsquo;s result is kept here and the {goal.type === 'PROJECT' ? 'milestones start again unticked' : 'count starts again at nothing'}.</p>}
      {earlier.length > 0 && (n => <p className="fine">Reached in {formatNumber(n)} of {formatNumber(earlier.length)} earlier {earlier.length === 1 ? entry.every : `${entry.every}s`}. Your own count, never a grade.</p>)(earlier.filter(r => r.reached).length)}
    </> : <p className="fine">Off. A goal like &ldquo;Read 2 books a month&rdquo; can start at nothing each week, month or year, and keep each period&rsquo;s result as a row.</p>}
    {writable ? <form onSubmit={e => { e.preventDefault(); save(); }}>
      <fieldset className="goal-choice-tiles">
        <legend>How often it starts again</legend>
        {(['off', ...REPEAT_EVERY] as const).map(v => <label key={v}><input type="radio" name={`goal-repeat-${goal.id}`} value={v} checked={chosen === v} onChange={() => setChoice(v)} /><span>{v === 'off' ? 'Off · keeps counting' : EVERY_WORDS[v].choice}</span></label>)}
      </fieldset>
      <p className="fine">{goal.type === 'PROJECT' ? 'At each new period the milestones are unticked; how many were done is kept here.' : 'At each new period the count starts again at nothing; what you added stays in its history.'} Kept on this device.</p>
      <button type="submit" className="secondary" disabled={chosen === (entry?.every ?? 'off')}>Save</button>
    </form> : <p className="fine">Unlock or reopen this goal to change how often it starts again.</p>}
  </div>;
}
