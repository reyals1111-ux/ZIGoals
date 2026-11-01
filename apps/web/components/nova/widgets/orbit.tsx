'use client';
import {GlassRing} from '../../progress/glass-progress';
import {CHECKLIST_ROUTE} from '../../../lib/af-checklist-keys';
import {useOrbitDay} from './use-orbit-day';
import {NovaEmpty, NovaReading} from './empty';

/** "Today's orbit": how much of today's orbit is lit — the Checklist's planets, or today's habits (lib/orbit-card/summary.ts). */
export default function OrbitWidget() {
  const {summary} = useOrbitDay();
  if (!summary) return <NovaReading/>;
  if (summary.source === 'none') return <NovaEmpty pillar="orbit" href={CHECKLIST_ROUTE} action="Open the Checklist">Your day’s orbit fills in as you add a habit or star something for the Checklist.</NovaEmpty>;
  const share = summary.total ? summary.done / summary.total : 0, unit = summary.source === 'checklist' ? 'planets lit' : 'habits done';
  return <div className="nova-orbit-widget">
    <GlassRing identity="nova-orbit" className="nova-orbit-ring" arcs={[{key: 'done', end: share * 100}]} role="img" aria-label={`${summary.done} of ${summary.total} ${unit} today`}>
      <span className="nova-figure" aria-hidden="true">{summary.done}<small>/{summary.total}</small></span>
    </GlassRing>
    <p className="nova-line">{summary.line}</p>
  </div>;
}
