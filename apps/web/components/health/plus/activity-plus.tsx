'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {dailyData} from '../../../lib/health-daily';
import {weightText} from '../../../lib/health-units';
import {orbitsFor, type Orbit} from '../../../lib/health-rings/rings';
import {DIRECTION_WORDS, healthTrends, type Trend, type TrendPending} from '../../../lib/health-trends/trends';
import {hoursMinutes} from '../../../lib/insights/cross-pillar';
import {formatNumber} from '../../../lib/visual-format';
import {useHabits} from '../../habits/use-habits';
import {useHealthGoals} from '../../health-goals/use-health-goals';
import {useWorkouts} from '../workouts/use-workouts';
import {ArtNote} from '../../illustrations/art-note';
import './plus.css';

/**
 * Session AP (features 3 and 4), in Health → Activity: "Your orbits" from the person's own goals (steps, active minutes,
 * workout days; no calories) and the 90-day against 365-day trends. Everything is derived on view; nothing is stored.
 */
export default function ActivityPlus({data, today}: {data: HealthData; today: string}) {
  return <><OrbitsCard data={data} today={today}/><TrendsCard data={data} today={today}/></>;
}

const R = 44, C = 2 * Math.PI * R;
/** One goal as a planet on its own orbit: the travelled part of the orbit in the pillar colour, the planet where it is now. */
function OrbitFigure({o}: {o: Orbit}) {
  const a = o.share * 2 * Math.PI - Math.PI / 2, x = 60 + R * Math.cos(a), y = 60 + R * Math.sin(a);
  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <circle className="ap-orbit-sun" cx="60" cy="60" r="14"/>
    <circle className="ap-orbit-track" cx="60" cy="60" r={R}/>
    {o.share > 0 && <circle className="ap-orbit-arc" cx="60" cy="60" r={R} strokeDasharray={`${o.share * C} ${C}`} transform="rotate(-90 60 60)"/>}
    <circle className="ap-orbit-planet" cx={x} cy={y} r="8"/>
  </svg>;
}

export function OrbitsCard({data, today}: {data: HealthData; today: string}) {
  const goals = useHealthGoals(), workouts = useWorkouts(), habits = useHabits();
  const {orbits, missing} = useMemo(() => orbitsFor({health: data, goals: goals.unreadable ? [] : goals.data.goals, workouts: workouts.loaded && !workouts.unreadable ? workouts.data : null, habits: habits.data, today}),
    [data, goals.data, goals.unreadable, workouts.data, workouts.loaded, workouts.unreadable, habits.data, today]);
  const n = (v: number) => formatNumber(Math.round(v));
  return <section className="panel ap-orbits" aria-labelledby="ap-orbits-title">
    <p className="eyebrow">From your own goals</p>
    <h2 id="ap-orbits-title">Your orbits</h2>
    {orbits.length ? <ul className="ap-orbits-list">{orbits.map(o => <li key={o.id} className="ap-orbit" data-orbit={o.id}>
      <OrbitFigure o={o}/>
      <h3>{o.label}</h3>
      <p><strong>{n(o.value)}</strong> of {n(o.target)} {o.unit} {o.period}</p>
      <p>{o.reached ? <><span aria-hidden="true">✓ </span>Reached</> : `${Math.floor(o.share * 100)}% of the way`}</p>
      <p className="fine">{o.source}</p>
    </li>)}</ul> : <ArtNote pillar="health"><p className="health-empty-inline">No orbit yet: each one follows a goal you set yourself.</p></ArtNote>}
    {missing.length > 0 && <details className="ap-orbits-missing" open={!orbits.length || undefined}>
      <summary>{orbits.length ? 'More orbits you can add' : 'How to add one'}</summary>
      <ul>{missing.map(m => <li key={m.id}><strong>{m.label}:</strong> {m.how}</li>)}</ul>
    </details>}
    <p className="fine">Worked out from your own records each time you look. No calories are estimated.</p>
  </section>;
}

function trendValue(t: Trend | TrendPending, v: number, data: HealthData): string {
  if (t.id === 'steps') return `${formatNumber(Math.round(v))} steps`;
  if (t.id === 'sleep') return hoursMinutes(v);
  if (t.id === 'weight') return weightText(v, dailyData(data).preferences.weightUnit);
  return `${Math.round(v)} bpm`;
}
const daysWord = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export function TrendsCard({data, today}: {data: HealthData; today: string}) {
  const {ready, pending} = useMemo(() => healthTrends(data, today), [data, today]);
  if (!ready.length && !pending.length) return null; // nothing recorded for any of the four: no card
  return <section className="panel ap-trends" aria-labelledby="ap-trends-title">
    <p className="eyebrow">Last 90 days and last 365</p>
    <h2 id="ap-trends-title">Trends</h2>
    {ready.length > 0 && <ul className="ap-trends-list">{ready.map(t => <li key={t.id} className="ap-trend">
      <span className="ap-trend-arrow" aria-hidden="true">{DIRECTION_WORDS[t.direction].arrow}</span>
      <div>
        <p><strong>{t.label}: {DIRECTION_WORDS[t.direction].words}</strong></p>
        <p>Last 90 days: {trendValue(t, t.recent.value, data)} on average ({daysWord(t.recent.days)} recorded). Last 365 days: {trendValue(t, t.year.value, data)} ({daysWord(t.year.days)}).</p>
      </div>
    </li>)}</ul>}
    {pending.length > 0 && <details className="ap-trends-pending" open={!ready.length || undefined}>
      <summary>Not enough days yet</summary>
      <ul>{pending.map(p => <li key={p.id}>{p.label}: {daysWord(p.recentDays)} of the {p.needRecent} needed in the last 90 days; {daysWord(p.yearDays)} of the {p.needYear} needed in the last 365.</li>)}</ul>
    </details>}
    <p className="fine">Only days with a record count; a day without one is never read as zero. Up or down describes your own numbers, not whether that is good.</p>
  </section>;
}
