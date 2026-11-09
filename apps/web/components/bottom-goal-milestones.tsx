'use client';
import Link from 'next/link';
import type {LayoutAttrs} from './layout-edit';
import type {GoalSummary} from '../lib/goal-summary';
import {goalTimeline} from '../lib/bottom-goal-timeline';
import {formatDate, formatNumber, progressPresentation} from '../lib/visual-format';
import {ArtNote} from './illustrations/art-note';
import {Shell} from './bottom-section-frame';

/** "45% funded"; a lower bound or an unknown value says so (QA-37/38, Session I, Part 10). */
// Session X P2.1: the same figure as the goal's ring (one Goal read 42%, 41.7% and 41.66% in three places).
const fundedPill=(pct:string,bound?:GoalSummary['progressBound'])=>{const shown=progressPresentation(pct);return bound==='unavailable'||!shown?'Progress unavailable':`${bound==='at-least'?'At least ':''}${formatNumber(Number(shown.label))}% funded`;};
/** Goals: saved target dates on one timeline. */
export function GoalMilestones({goals,today,...layout}:LayoutAttrs&{goals:readonly GoalSummary[];today:string}){
 const t=goalTimeline(goals,today);
 return <Shell layout={layout} id="bottom-goal-milestones" eyebrow="YOUR TIMELINE" title={<>Milestones ahead.</>} lede="Target dates saved in your active goals, soonest first.">
  {t.dated.length?<ol className="bottom-timeline">{t.dated.map(g=><li key={g.key} data-past={g.past||undefined}><time dateTime={g.targetDate}>{formatDate(g.targetDate)}</time><span className="bottom-timeline-dot" aria-hidden="true"/><Link href={g.href} className="bottom-timeline-name">{g.name}</Link><span className="bottom-pill">{fundedPill(g.progressPct,goals.find(x=>x.key===g.key)?.progressBound)}</span>{g.past&&<span className="bottom-pill bottom-pill-muted">Target date passed</span>}</li>)}</ol>
  :<ArtNote pillar="goals"><p className="bottom-empty">No active goal has a target date yet. Add one in a goal’s plan to see it here.</p></ArtNote>}
  {t.undated>0&&<p className="bottom-note">{t.undated} active goal{t.undated===1?' has':'s have'} no target date.</p>}
 </Shell>;
}
