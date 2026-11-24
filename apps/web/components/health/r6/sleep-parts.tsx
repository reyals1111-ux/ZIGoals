'use client';
import {useId, useState} from 'react';
import {dailySeries} from '../../../lib/sleep/engine';
import {efficiencyOf} from '../../../lib/sleep/longer';
import {tonight, TONIGHT_MIN_WAKES, TONIGHT_NIGHTS} from '../../../lib/sleep/tonight';
import type {Sleep} from '../../../lib/sleep/schema';
import {formatMinutes} from '../../../lib/zone-time';
import {formatClock} from '../../../lib/visual-format';
import './body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; AutoSleep): Sleep's round 6 parts, one lazy chunk —
 * - `bedtime` (LEDGER #419): tonight's bedtime from the goal, the usual wake time and the usual time to fall asleep, with
 *   a wake time for tomorrow that is kept on this page for tonight only (`compact` on the Health page's Sleep card).
 * - `week-efficiency` (LEDGER #423): the last 7 days' time asleep out of time in bed, on average a night.
 * Facts from the person's own nights, never "you must"; nothing stored.
 */
export default function SleepR6({part, sleep, today, zone, compact = false}: {part: 'bedtime' | 'week-efficiency'; sleep: Sleep; today: string; /** Where tonight is lived (the Sleep page's zone), for the bedtime (review B6P-3). */ zone?: string; compact?: boolean}) {
  return part === 'bedtime' ? <Bedtime sleep={sleep} today={today} zone={zone} compact={compact}/> : <WeekEfficiency sleep={sleep} today={today}/>;
}

export function bedtimeWords(t: ReturnType<typeof tonight>): string {
  if (t.kind === 'no-goal') return 'Set your own sleep goal (below) to see a bedtime for tonight.';
  if (t.kind === 'window') return `Your bedtime window: ${formatClock(t.from)}–${formatClock(t.to)}, for your ${formatMinutes(t.goal)}.`;
  if (t.kind === 'needs-wake') return `Tonight’s bedtime needs your usual wake time: log ${TONIGHT_MIN_WAKES} nights in ${TONIGHT_NIGHTS} days (${t.wakes} so far), or type when you will wake tomorrow.`;
  return `Bed by ${formatClock(t.bed)} for your ${formatMinutes(t.goal)} before your ${t.wakeFrom === 'typed' ? '' : 'usual '}${formatClock(t.wake)} wake${t.latency !== null ? `, with your usual ${formatMinutes(t.latency)} to fall asleep` : ''}.`;
}

function Bedtime({sleep, today, zone, compact}: {sleep: Sleep; today: string; zone?: string; compact: boolean}) {
  const [wake, setWake] = useState<string | null>(null), id = useId(), t = tonight(sleep, today, wake, zone);
  if (compact) return t.kind === 'bedtime' || t.kind === 'window' ? <p className="r6-bedtime-line fine">Tonight: {bedtimeWords(t)}</p> : null;
  return <div className="r6-bedtime" role="group" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="r6-subtitle">Tonight’s bedtime</h3>
    <p className="r6-bedtime-line" aria-live="polite">{t.kind === 'bedtime' ? <>Bed by <strong>{formatClock(t.bed)}</strong>{bedtimeWords(t).slice(`Bed by ${formatClock(t.bed)}`.length)}</> : bedtimeWords(t)}</p>
    {t.kind === 'bedtime' && t.latency === null && <p className="fine">Your time to fall asleep is not in it: type it on at least 3 nights to have it counted.</p>}
    {t.kind !== 'no-goal' && t.kind !== 'window' && <div className="r6-add">
      <label className="field"><span>Waking at another time tomorrow? (tonight only)</span><input type="time" value={wake ?? ''} onChange={e => setWake(e.target.value || null)}/></label>
      {wake && <button type="button" className="secondary" onClick={() => setWake(null)}>Use my usual wake time</button>}
    </div>}
    <details className="r6-how"><summary className="fold-summary">How this is worked out</summary>
      <p className="fine">Your sleep goal back from your wake time: the middle wake time of your last {TONIGHT_NIGHTS} nights (or the one you type, kept on this page for tonight only), and the middle of the times to fall asleep you typed in those nights. A bedtime window in your goal is used instead when you set one. It is a fact from your own log, not advice.</p>
    </details>
  </div>;
}

function WeekEfficiency({sleep, today}: {sleep: Sleep; today: string}) {
  const e = efficiencyOf(dailySeries(sleep, today, 7));
  if (!e) return null;
  return <p className="fine r6-efficiency">Asleep of time in bed, a night on average: {formatMinutes(e.asleep)} of {formatMinutes(e.inBed)} ({e.percent} %){e.estimated ? ', an estimate: on some nights the time to fall asleep or the time awake was not typed' : ''}.</p>;
}
