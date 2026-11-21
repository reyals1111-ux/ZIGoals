'use client';
import {NebulaFlow} from '../nebula-flow';
import {GlassRing} from '../progress/glass-progress';
import {sleepScore} from '../../lib/health-aa/sleep-score';
import {shortNights} from '../../lib/sleep/engine';
import type {Sleep} from '../../lib/sleep/schema';
import {formatMinutes} from '../../lib/zone-time';
import './health-aa.css';
import {ArtNote} from '../illustrations/art-note';

/** N10: a transparent sleep score for the last seven nights, with the formula on the card. */
export function SleepScoreCard({sleep, today}: {sleep: Sleep; today: string}) {
  // ADR-022 B50: short nights get the Sleep view's gentle word, never a score (Session W's rule); the card stays away then.
  if (shortNights(sleep, today)) return null;
  const s = sleepScore(sleep, today);
  return <section className="panel health-aa-card" aria-labelledby="sleep-score-title">
    <p className="eyebrow">Last seven nights</p><h2 id="sleep-score-title"><NebulaFlow identity="sleep-score-title">Sleep score</NebulaFlow></h2>
    {s.score === null ? <ArtNote pillar="health"><p className="health-empty-inline">Three logged nights of the last seven make a score; {s.nights} so far.</p></ArtNote> : <div className="sleep-score">
      <GlassRing identity="sleep-score-ring" className="sleep-score-ring" arcs={[{key: 'score', end: s.score}]} role="img" aria-label={`Sleep score ${s.score} of 100 over ${s.nights} nights`}><strong>{s.score}</strong><small>of 100</small></GlassRing>
      {/* Session AV (owner follow-up 1, F-SLEEP-SCORE): regularity reads bedtime and wake time; the nights' own ratings count. */}
      <ul className="sleep-score-parts"><li><span>Duration · {s.duration.averageMinutes === null ? '—' : formatMinutes(s.duration.averageMinutes)} of {formatMinutes(s.duration.goalMinutes)}{s.duration.goalSet ? ' (your goal)' : ' (a reference: no sleep goal set)'}</span><b>{s.duration.points} / 40</b></li><li><span>Regularity · bedtime spread {s.consistency.bedSpread === null ? 'unknown' : `${s.consistency.bedSpread} min`}, wake-time spread {s.consistency.wakeSpread === null ? 'unknown' : `${s.consistency.wakeSpread} min`}</span><b>{s.consistency.points} / 30</b></li><li><span>Debt · {s.debt.minutes === null ? 'unknown' : formatMinutes(Math.max(0, s.debt.minutes))} short</span><b>{s.debt.points} / 15</b></li><li><span>Quality · {s.quality.average === null ? 'no night rated yet: left out, the other parts count for 100' : `${s.quality.average} of 5 on ${s.quality.rated} ${s.quality.rated === 1 ? 'night' : 'nights'} you rated`}</span><b>{s.quality.points === null ? '—' : `${s.quality.points} / 15`}</b></li></ul>
    </div>}
    <p className="sleep-score-formula">Formula: {s.formula}. <span className="health-estimate-tag">an estimate, not medical advice</span></p>
  </section>;
}
