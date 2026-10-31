'use client';
import {useMemo, useState} from 'react';
import {formatUnits} from '@zigoals/chain-config';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {W_REMINDERS} from '../../../lib/reminders/w-schema';
import {setContributionReminder} from '../../../lib/reminders/contribution-due';
import type {ContributionEvent, PrivateGoal} from '../../../lib/positions';
import {autopilotSuggestions, dayWords, type AutopilotSuggestion} from '../../../lib/allocation/autopilot';
import './allocation.css';

/**
 * Session AK (7.6): the person's own contribution rhythm, said back to them — "You usually contribute on the 3rd" —
 * with two choices: a reminder on this device (the existing contribution reminder, for a Goal with a plan) or the
 * Goal's own contribution form with the usual amount filled in for them to check and confirm. Nothing ever moves by
 * itself; no money is moved by ZIGoals at all. Lazy-loaded.
 */
// 2026-10-04 is a Sunday: weekday d is that day + d, written by the shared formatter.
const weekday = (d: number) => formatWeekday(`2026-10-${String(4 + d).padStart(2, '0')}`);
export type AutopilotViewProps = {suggestions: readonly AutopilotSuggestion[]; reminders: Record<string, {time: string}>; onRemind: (goalId: string, time: string | null) => void; disabled?: boolean};
export function ContributionAutopilotView({suggestions, reminders, onRemind, disabled = false}: AutopilotViewProps) {
  const [status, setStatus] = useState(''), [time, setTime] = useState('09:00');
  if (!suggestions.length) return <p className="fine">Once you have recorded a few contributions to a Goal on a regular day, ZIGoals can remind you then, or fill in your usual amount for you to check.</p>;
  return <div className="autopilot-body">
    <ul className="autopilot-list">{suggestions.map(s => {
      const amount = `${formatUnits(s.amount, s.decimals)} ${s.asset}`, set = reminders[s.goalId]?.time;
      return <li key={s.goalId} className="autopilot-row">
        <p><strong>{s.goalName}</strong>: you usually contribute {dayWords(s, weekday)}, about {amount}{s.confidence === 'medium' ? ' (from a looser pattern)' : ''}.
          <span className="fine"> {s.doneThisPeriod ? `Already recorded this ${s.rhythm === 'monthly' ? 'month' : 'week'}; next around ${formatDate(s.nextDate, {weekday: true})}.` : `Next around ${formatDate(s.nextDate, {weekday: true})}.`}</span></p>
        <div className="alloc-actions">
          <a className="secondary" href={s.prefillHref}>Fill in {amount}</a>
          {s.hasPlan ? (set ? <button type="button" className="quiet" disabled={disabled} onClick={() => { onRemind(s.goalId, null); setStatus(`Reminder for ${s.goalName} turned off.`); }}>Reminder on · turn off</button>
            : <button type="button" className="secondary" disabled={disabled} onClick={() => { onRemind(s.goalId, time); setStatus(`Reminder for ${s.goalName} set on this device; it shows on days your plan has an amount due.`); }}>Remind me</button>)
            : <a className="quiet" href={`/app/goals/tracked/${encodeURIComponent(s.goalId)}#contribution-plan`}>Set a plan to get reminders</a>}
        </div>
      </li>;
    })}</ul>
    {suggestions.some(s => s.hasPlan && !reminders[s.goalId]) && <label className="field autopilot-time"><span>Remind me at</span><input type="time" value={time} onChange={e => setTime(e.target.value || '09:00')}/></label>}
    <p role="status" aria-live="polite" className="alloc-status">{status}</p>
    <p className="fine">From the contributions you recorded. &ldquo;Fill in&rdquo; opens the Goal&rsquo;s contribution form for you to check and confirm; ZIGoals never moves money.</p>
  </div>;
}
export default function ContributionAutopilot({platform, disabled = false}: {platform: {goals: readonly PrivateGoal[]; contributions: readonly ContributionEvent[]}; disabled?: boolean}) {
  const w = useDeviceRecord(W_REMINDERS), today = localDate();
  const suggestions = useMemo(() => autopilotSuggestions(platform, today), [platform, today]);
  if (!w.loaded) return null;
  return <ContributionAutopilotView suggestions={suggestions} reminders={w.data.contributions} disabled={disabled || w.unreadable} onRemind={(goalId, time) => { w.update(r => setContributionReminder(r, goalId, time)); }}/>;
}
