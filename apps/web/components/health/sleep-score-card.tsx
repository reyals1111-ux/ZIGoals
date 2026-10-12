'use client';
import {NebulaFlow} from '../nebula-flow';
import {GlassRing} from '../progress/glass-progress';
import {sleepScore} from '../../lib/health-aa/sleep-score';
import type {Sleep} from '../../lib/sleep/schema';
import {formatMinutes} from '../../lib/zone-time';
import './health-aa.css';

/** N10: a transparent sleep score for the last seven nights, with the formula on the card. */
export function SleepScoreCard({sleep, today}: {sleep: Sleep; today: string}) {
  const s = sleepScore(sleep, today);
  return <section className="panel health-aa-card" aria-labelledby="sleep-score-title">
    <p className="eyebrow">Last seven nights</p><h2 id="sleep-score-title"><NebulaFlow identity="sleep-score-title">Sleep score</NebulaFlow></h2>
    {s.score === null ? <p className="health-empty-inline">Three logged nights of the last seven make a score; {s.nights} so far.</p> : <div className="sleep-score">
      <GlassRing identity="sleep-score-ring" className="sleep-score-ring" arcs={[{key: 'score', end: s.score}]} role="img" aria-label={`Sleep score ${s.score} of 100 over ${s.nights} nights`}><strong>{s.score}</strong><small>of 100</small></GlassRing>
      <ul className="sleep-score-parts"><li><span>Duration · {s.duration.averageMinutes === null ? '—' : formatMinutes(s.duration.averageMinutes)} of {formatMinutes(s.duration.goalMinutes)}</span><b>{s.duration.points} / 50</b></li><li><span>Consistency · bedtime spread {s.consistency.spreadMinutes === null ? 'unknown' : `${s.consistency.spreadMinutes} min`}</span><b>{s.consistency.points} / 30</b></li><li><span>Debt · {s.debt.minutes === null ? 'unknown' : formatMinutes(Math.max(0, s.debt.minutes))} short</span><b>{s.debt.points} / 20</b></li></ul>
    </div>}
    <p className="sleep-score-formula">Formula: {s.formula}. <span className="health-estimate-tag">an estimate, not medical advice</span></p>
  </section>;
}
