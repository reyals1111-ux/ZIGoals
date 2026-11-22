'use client';
import {useMemo} from 'react';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {CYCLE, cycleOnPlan} from '../../lib/cycle/store';
import {CYCLE_LINE} from '../../lib/cycle/engine';
import {cyclePlanDays, cyclePlanLine} from '../../lib/cycle/plan-days';
import {formatDate} from '../../lib/visual-format';
import './cycle.css';

/**
 * Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, the days only): the cycle day and the period days on
 * the Day Timeline's all-day line and on the Agenda (day and week), opt-in in the cycle log and only while Health is shown
 * (the Health gate) and the log is on. The log's own line goes with it. No phases, no seasons, no advice (the
 * no-medical-advice rule). Its own chunk; nothing shows for someone who did not opt in.
 */
function useCyclePlan() {
  const rec = useDeviceRecord(CYCLE), healthShown = isShown(usePagesView(), 'health');
  return rec.loaded && !rec.unreadable && healthShown && cycleOnPlan(rec.data) ? rec.data : null;
}
export default function CycleOnTimeline({date, today}: {date: string; today: string}) {
  const rec = useCyclePlan();
  const line = useMemo(() => rec ? cyclePlanLine(cyclePlanDays(rec, date, date, today)[0]!) : '', [rec, date, today]);
  if (!line) return null;
  return <section className="timeline-band timeline-allday cycle-on-plan" aria-labelledby="timeline-allday-title">
    <h2 id="timeline-allday-title">All day</h2>
    <p className="cycle-on-plan-line">{line}. <small className="fine">{CYCLE_LINE} <Link className="text-link" href="/app/health?view=diary">Cycle log</Link></small></p>
  </section>;
}
export function AgendaCycleDays({from, to, today}: {from: string; to: string; today: string}) {
  const rec = useCyclePlan();
  const days = useMemo(() => rec ? cyclePlanDays(rec, from, to, today).map(d => ({d, line: cyclePlanLine(d)})).filter(x => x.line) : [], [rec, from, to, today]);
  if (!days.length) return null;
  return <section className="cycle-on-plan agenda-cycle" aria-labelledby="agenda-cycle-title">
    <h3 id="agenda-cycle-title">Your cycle on these days</h3>
    <ul className="cycle-on-plan-list">{days.map(({d, line}) => <li key={d.date}><strong>{formatDate(d.date, {weekday: true, year: false})}</strong>: {line}</li>)}</ul>
    <p className="fine">{CYCLE_LINE} Shown because you chose it in the cycle log.</p>
  </section>;
}
