'use client';
import Link from 'next/link';
import {GlowBar} from '../holo/parts';
import {paceWords, wholePercent} from '../../../lib/nova/widgets/words';
import {isFinished} from '../../../lib/goals/finished';
import type {WidgetSize} from '../../../lib/nova/store';
import {useGoalSummaries} from './use-goal-summaries';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {WholeRows} from '../cards/whole-rows';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Goal pace": the active goals, how far along each is and whether its plan keeps pace, as Today says it. A progress that
 * is unknown says "Unavailable" and draws no bar; nothing here is a forecast or advice.
 * Session AM-2: each goal is a row with its percent as a figure and a lit meter with a white-hot end; an unknown progress
 * is a dashed, unlit trace (never an empty bar).
 */
export default function GoalPaceWidget({size}: {size: WidgetSize}) {
  const {goals, loaded, error} = useGoalSummaries();
  if (!loaded) return <NovaReading/>;
  if (error) return <NovaUnread what="Your goals"/>;
  const active = goals.filter(g => g.status === 'active');
  if (!active.length) return <NovaEmpty pillar="goals" ghost="bars" href="/app/goals/new" action="Set a goal">No active goals yet. Give your next chapter a target.</NovaEmpty>;
  const shown = active.slice(0, size === 'S' ? 1 : size === 'M' ? 3 : 5);
  // Session AM-2 (whole rows only): the goals that fit, then "+N more on the Goals page" (the head's link opens it).
  return <WholeRows inline className="nova-goals hw-goals" extra={active.length - shown.length} min={1} more={(hidden, rows) => moreWords(hidden, {shown: rows, where: 'the Goals page'})}>{shown.map(g => {
    const pace = paceWords(g.fundingHealth), unknown = g.progressBound === 'unavailable' || !/^\d+(\.\d+)?$/.test(g.progressPct);
    return <li key={g.key} className="hw-row" data-tone={pace.tone}>
      <div className="nova-goal-head"><Link href={g.href} prefetch={false}>{g.name}</Link><span className="nova-goal-pct">{wholePercent(g.progressPct, g.progressBound, isFinished(g))}</span></div>
      <GlowBar share={unknown ? null : Math.min(1, Number(g.progressPct) / 100)}/>
      <small className="nova-goal-pace">{pace.words}</small>
    </li>;
  })}</WholeRows>;
}
