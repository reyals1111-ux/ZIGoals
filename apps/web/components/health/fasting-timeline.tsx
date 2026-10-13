'use client';
import {useEffect, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {fastingTimeline} from '../../lib/health-aa/fasting-timeline';
import type {FastingSession} from '../../lib/fasting/schema';
import {formatFast} from '../../lib/fasting/engine';
import './health-aa.css';

/** N8: the current (or last) fast's hours against neutral milestones, described plainly, without health claims. */
export function FastingTimeline({session}: {session: FastingSession | null}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (!session || session.endedAt !== null) return; const id = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(id); }, [session]);
  if (!session) return <section className="panel health-aa-card fasting-timeline" aria-labelledby="fasting-timeline-title"><p className="eyebrow">Timeline</p><h2 id="fasting-timeline-title"><NebulaFlow identity="fasting-timeline-title">Fasting timeline</NebulaFlow></h2><p className="health-empty-inline">Start a fast and its hours appear here against the 12, 16, 18 and 24-hour marks.</p></section>;
  const t = fastingTimeline(session, now), max = Math.max(24, t.targetHours);
  return <section className="panel health-aa-card fasting-timeline" aria-labelledby="fasting-timeline-title">
    <p className="eyebrow">{t.running ? 'Running' : 'Your last fast'}</p><h2 id="fasting-timeline-title"><NebulaFlow identity="fasting-timeline-title">Fasting timeline</NebulaFlow></h2>
    <p className="health-big">{formatFast(t.hours * 3_600_000)}<small>of a {t.targetHours} h target</small></p>
    <div className="fasting-timeline-track" role="progressbar" aria-label={`${t.hours.toFixed(1)} of ${t.targetHours} hours`} aria-valuenow={Math.round(t.hours * 10) / 10} aria-valuemin={0} aria-valuemax={t.targetHours}><div className="fasting-timeline-fill" style={{width: `${Math.min(100, (t.hours / max) * 100)}%`}} /></div>
    <ol className="fasting-timeline-stops" aria-hidden="true">{t.stops.map(s => <li key={s.hours} data-reached={s.reached || undefined} data-target={s.target || undefined} style={{left: `${(s.hours / max) * 100}%`}}><i /><strong>{s.hours} h</strong></li>)}</ol>
    <ul className="fasting-timeline-lines">{t.stops.map(s => <li key={s.hours} data-reached={s.reached || undefined}><span aria-hidden="true">{s.reached ? '✓' : '○'}</span><span><strong>{s.title}</strong>{s.target ? ' (your target)' : ''} · {s.line}</span></li>)}</ul>
    <p className="fine">Hour marks people commonly choose, nothing more: the app makes no claim about what a fast does.</p>
  </section>;
}
