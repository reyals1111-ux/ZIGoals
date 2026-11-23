'use client';
import {useId, useMemo, useState} from 'react';
import {addDistanceGoal, goalProgress, LOAD_WORDS, removeDistanceGoal, trainingLoad, type LoadMetric} from '../../../lib/workouts/runs';
import {GOAL_PERIODS, GOAL_SPORTS, type DistanceGoal, type Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #111, Strava's goals and Fitness): Health → Workouts → "Distance goals and training
 * load". A distance goal for a week, a month or a year (running, cycling, swimming, walking or every sport), with its bar,
 * what is left, the kilometres a day to get there and whether you are on pace; and the training load — minutes (or
 * kilometres) in the last 7 days beside your usual week (the average of the 4 weeks before), in plain words, with the 12
 * weeks as bars and the usual as a line, and a table. Never calories. Its own chunk.
 */
export const SPORT_GOAL_WORDS: Record<DistanceGoal['sport'], string> = {run: 'Running', ride: 'Cycling', swim: 'Swimming', walk: 'Walking', any: 'All sports'};
export const PERIOD_WORDS: Record<DistanceGoal['period'], string> = {week: 'this week', month: 'this month', year: 'this year'};
type Change = (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean;
const NO_PAUSES: readonly {from: string; to: string}[] = [];
const km = (n: number) => `${formatNumber(n, {maximumFractionDigits: 1})} km`;
// Session AV lane 2, round 5 (LEDGER #374): `pauses`, the days a workout status covered, change the load's words.
export default function DistanceGoals({w, today, change, pauses = NO_PAUSES}: {w: Workouts; today: string; change: Change; pauses?: readonly {from: string; to: string}[]}) {
  const goals = useMemo(() => (w.distanceGoals ?? []).map(g => goalProgress(w, g, today)), [w, today]);
  const [sport, setSport] = useState<DistanceGoal['sport']>('run'), [period, setPeriod] = useState<DistanceGoal['period']>('month'), [amount, setAmount] = useState(''), [problem, setProblem] = useState('');
  const [metric, setMetric] = useState<LoadMetric>('minutes'), load = useMemo(() => trainingLoad(w, today, metric, pauses), [w, today, metric, pauses]), id = useId();
  const add = () => {
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n < 1 || n > 100_000) { setProblem('Enter a distance from 1 to 100,000 km.'); return; }
    setProblem('');
    if (change(x => addDistanceGoal(x, {sport, period, km: n}, new Date()), `Goal set: ${SPORT_GOAL_WORDS[sport].toLowerCase()}, ${km(n)} ${PERIOD_WORDS[period]}.`)) setAmount('');
  };
  const unit = (v: number) => metric === 'minutes' ? `${formatNumber(Math.round(v))} min` : km(v), top = Math.max(1, ...load.weeks.map(k => Math.max(k.value, k.average ?? 0)));
  return <div className="av2-goals">
    <section aria-labelledby={`${id}-goals`}>
      <h3 id={`${id}-goals`}>Distance goals</h3>
      {goals.length ? <ul className="av2-goal-list">{goals.map(p => <li key={p.goal.id}>
        <div className="av2-goal-head"><strong>{SPORT_GOAL_WORDS[p.goal.sport]} {PERIOD_WORDS[p.goal.period]}</strong> <span>{km(p.km)} of {km(p.goal.km)}</span></div>
        <div className="av2-goal-bar" role="progressbar" aria-label={`${SPORT_GOAL_WORDS[p.goal.sport]} ${PERIOD_WORDS[p.goal.period]}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.share * 100)} aria-valuetext={`${km(p.km)} of ${km(p.goal.km)}`}><span style={{inlineSize: `${Math.round(p.share * 100)}%`}}/></div>
        <p className="fine">{p.done ? 'Reached. Well done.' : `${km(p.left)} to go${p.daysLeft ? `, ${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left${p.perDay ? ` (about ${km(p.perDay)} a day)` : ''}` : ''} · ${p.onPace ? 'on pace' : 'behind pace for now'}.`}</p>
        <button type="button" className="quiet" aria-label={`Remove the goal ${SPORT_GOAL_WORDS[p.goal.sport]} ${PERIOD_WORDS[p.goal.period]}`} onClick={() => change(x => removeDistanceGoal(x, p.goal.id), 'The distance goal is removed.', 'The distance goal is back.')}>Remove</button>
      </li>)}</ul> : <p className="fine">No distance goal yet. Set one below: 20 km of running this week, say, or 1,000 km of cycling this year. It counts your distance sets and imported files.</p>}
      <form className="av2-goal-form" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field"><span>Sport</span><select value={sport} onChange={e => setSport(e.target.value as DistanceGoal['sport'])}>{GOAL_SPORTS.map(s => <option key={s} value={s}>{SPORT_GOAL_WORDS[s]}</option>)}</select></label>
        <label className="field"><span>For</span><select value={period} onChange={e => setPeriod(e.target.value as DistanceGoal['period'])}>{GOAL_PERIODS.map(p => <option key={p} value={p}>{p === 'week' ? 'A week' : p === 'month' ? 'A month' : 'A year'}</option>)}</select></label>
        <label className="field"><span>Distance (km)</span><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}/></label>
        <button type="submit" className="secondary">Set the goal</button>
      </form>
      {problem && <p role="alert" className="av2-problem">{problem}</p>}
    </section>
    <section aria-labelledby={`${id}-load`}>
      <h3 id={`${id}-load`}>Training load</h3>
      <div className="workouts-weeks-pick" role="group" aria-label="Count the load in">{(['minutes', 'km'] as const).map(m => <button key={m} type="button" className="quiet" aria-pressed={metric === m} onClick={() => setMetric(m)}>{m === 'minutes' ? 'Minutes' : 'Kilometres'}</button>)}</div>
      <p className="av2-load-line"><strong>Last 7 days: {unit(load.last7)}</strong>{load.usual !== null && <> · your usual week {unit(load.usual)}</>}. {LOAD_WORDS[load.words]}</p>
      <svg className="av2-load-bars" viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {load.weeks.map((k, i) => { const h = k.value ? Math.max(3, Math.round(60 * k.value / top)) : 2; return <rect key={k.start} x={i * 20 + 3} y={66 - h} width={14} height={h} rx={3} className={i === load.weeks.length - 1 ? 'is-this-week' : undefined}/>; })}
        <path className="av2-load-usual" d={load.weeks.map((k, i) => k.average === null ? '' : `${i && load.weeks[i - 1]!.average !== null ? 'L' : 'M'}${i * 20 + 10} ${66 - Math.round(60 * k.average / top)}`).join(' ')}/>
      </svg>
      <p className="workouts-weeks-axis" aria-hidden="true"><span>{formatDate(load.weeks[0]!.start, {year: false})}</span><span>This week</span></p>
      <p className="fine">Bars: each week&rsquo;s {metric === 'minutes' ? 'minutes of every workout' : 'kilometres of every sport'}. Line: the average of the 4 weeks before it. From your own log; never calories.</p>
      <details className="workouts-weeks-table"><summary>As a table</summary>
        <div className="workouts-weeks-scroll" role="region" tabIndex={0} aria-label="Table: training load per week"><table><caption className="sr-only">Training load per week, the last 12 weeks, with the average of the 4 weeks before each</caption>
          <thead><tr><th scope="col">Week of</th><th scope="col">{metric === 'minutes' ? 'Minutes' : 'Kilometres'}</th><th scope="col">Usual (4 weeks before)</th></tr></thead>
          <tbody>{[...load.weeks].reverse().map(k => <tr key={k.start}><th scope="row">{formatDate(k.start, {year: false})}</th><td>{unit(k.value)}</td><td>{k.average === null ? '—' : unit(k.average)}</td></tr>)}</tbody></table></div>
      </details>
    </section>
  </div>;
}
