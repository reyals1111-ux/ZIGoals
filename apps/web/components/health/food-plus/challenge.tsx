'use client';
import {useId, useState} from 'react';
import Link from 'next/link';
import type {HealthData} from '../../../lib/health';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {challengeWeek, startChallenge, stopChallenge} from '../../../lib/food-plus/challenge';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {plainErrorMessage} from '../../../lib/plain-error';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #90; MyFitnessPal's logging challenges and streaks): a weekly logging challenge you set
 * yourself, on this device (`zigoals:food-plus:v1` `challenge`). Health → Insights → "Weekly logging challenge" starts,
 * changes or stops it and shows the week day by day and the weeks met in a row; the Diary shows one line while it runs.
 * A day counts when the Food diary has an entry on it. Nothing is lost by missing a week.
 */
const status = (w: NonNullable<ReturnType<typeof challengeWeek>>) => w.met ? `Done for this week: ${w.logged} of ${w.daysPerWeek} days logged.`
  : w.reachable ? `${w.logged} of ${w.daysPerWeek} days logged this week · ${w.daysPerWeek - w.logged} more to go.`
  : `${w.logged} of ${w.daysPerWeek} days logged this week. This week can’t reach it any more; a new week starts on Monday.`;

/** The Diary's one line while a challenge runs (nothing otherwise). */
export function ChallengeLine({data, today}: {data: HealthData; today: string}) {
  const record = useDeviceRecord(FOOD_PLUS);
  if (!record.loaded) return null;
  const w = challengeWeek(data, record.data, today);
  if (!w) return null;
  return <p className="fine food-plus-challenge-line"><strong>Logging challenge:</strong> {status(w)}{w.weeksInRow > 1 ? ` ${w.weeksInRow} weeks in a row.` : ''} <Link className="text-link" href="/app/health?view=insights#health-challenge">See the week</Link></p>;
}

export function ChallengeCard({data, today}: {data: HealthData; today: string}) {
  const record = useDeviceRecord(FOOD_PLUS), id = useId(), [days, setDays] = useState(''), [note, setNote] = useState('');
  if (!record.loaded) return null;
  const w = challengeWeek(data, record.data, today), chosen = days || String(w?.daysPerWeek ?? 5);
  const save = (change: Parameters<typeof record.update>[0], said: string) => { try { record.update(change); setNote(said); setDays(''); } catch (e) { setNote(plainErrorMessage(e, 'Not kept on this device.')); } };
  return <div className="food-plus-card" id="health-challenge">
    {!w ? <p>Set yourself a number of days a week to log your food, Monday to Sunday. A day counts when the Diary has at least one entry on it. Each week starts afresh; missing one costs nothing.</p>
      : <>
        <p role="status">{status(w)}</p>
        <ol className="food-plus-week" aria-label={`This week, ${formatDate(w.monday)} to ${formatDate(w.sunday)}`}>{w.days.map(d => <li key={d.date} data-logged={d.logged || undefined} data-today={d.date === today || undefined}><span aria-hidden="true">{d.logged ? '✓' : '·'}</span> {formatWeekday(d.date)}<span className="sr-only">{d.logged ? ': logged' : d.date > today ? ': still to come' : ': not logged'}</span></li>)}</ol>
        <p className="fine">{w.weeksInRow ? `${w.weeksInRow} ${plural(w.weeksInRow, 'week')} met in a row` : 'No week met in a row yet'} · {w.weeksMet} of {w.weeksTotal} {plural(w.weeksTotal, 'week')} met since {formatDate(w.since)}.</p>
      </>}
    <div className="food-plus-row">
      <label className="field"><span>Days a week</span><select value={chosen} onChange={e => setDays(e.target.value)}>{[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} {plural(n, 'day')}</option>)}</select></label>
      <button type="button" className="primary" aria-describedby={`${id}-note`} onClick={() => save(r => startChallenge(r, Number(chosen), today), w ? `The challenge is now ${chosen} ${plural(Number(chosen), 'day')} a week.` : `Challenge started: log your food on ${chosen} ${plural(Number(chosen), 'day')} a week.`)}>{w ? 'Change the challenge' : 'Start the challenge'}</button>
      {w && <button type="button" className="quiet" onClick={() => save(stopChallenge, 'The logging challenge is stopped. Your diary is unchanged.')}>Stop the challenge</button>}
    </div>
    <p className="fine" id={`${id}-note`} aria-live="polite">{note}</p>
  </div>;
}
