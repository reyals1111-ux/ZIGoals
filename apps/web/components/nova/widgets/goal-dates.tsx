'use client';
import {useMemo} from 'react';
import type {GoalSummary} from '../../../lib/goal-summary';
import {goalDates} from '../../../lib/nova/cards/ax/goals-views';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {AxmTimeline} from '../cards/ax/money-timeline';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {GoalsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Goals): "Target dates" — the active goals' own target dates on one time axis that starts
 * at today, soonest first, each a numbered node with the same number in the list beside its date, the days to it and how
 * far the goal is. A target date is the date the person set, not a forecast. A date that has passed on a goal still
 * active stands at today's edge and says so in words. The figure is the days to the next one.
 */
export default function GoalDatesWidget({size}: AxProps) {
  return <GoalsSource>{(goals, _hud, today) => <Dates goals={goals} today={today} size={size}/>}</GoalsSource>;
}
function Dates({goals, today, size}: {goals: readonly GoalSummary[]; today: string; size: AxProps['size']}) {
  const view = useMemo(() => goalDates(goals, today, size === 'L' ? 6 : 4), [goals, today, size]), next = view.next, more = view.more > 0 ? `+${view.more} more on the Goals page` : null;
  if (!view.marks.length) return <CardNotice kind="empty" ghost="rows" title="No target date yet" href="/app/goals" action="Set a target date">Give a goal a target date and it stands here on a line from today.</CardNotice>;
  return <AxBody kind="goal-dates" size={size}>
    {next ? <AxmHead figure={String(next.days)} unit={next.days === 1 ? 'day' : 'days'} label="to the next target date" note={`${next.name} · ${next.dateWords}${view.past ? ` · ${view.past} past ${view.past === 1 ? 'its' : 'their'} date` : ''}`}/>
      : <AxmHead figure={String(view.past)} unit={view.past === 1 ? 'goal' : 'goals'} tone="watch" label="past the target date" note="No target date lies ahead"/>}
    {size !== 'S' && <AxmSplit stack rows={view.marks.length + (more ? 1 : 0)}>
      <AxmTimeline marks={view.marks.map(m => ({key: m.key, n: m.n, at: m.at, past: m.past, title: `${m.name}: ${m.dateWords}, ${m.when}`}))} end={view.marks.at(-1)!.dateWords}/>
      <AxmLegend items={view.marks.map(m => ({key: m.key, n: m.n, name: m.name, value: m.dateWords, sub: `${m.when} · ${m.text}`, ...(m.past ? {tone: 'watch' as const} : {})}))} more={more}/>
    </AxmSplit>}
    {size === 'L' && view.undated > 0 && <AxmFacts rows={[['Without a target date', `${view.undated} ${view.undated === 1 ? 'goal' : 'goals'}`]]}/>}
    <CardFoot source="Your goals" asOf={`as of today, ${formatDate(today, {year: false})}`}/>
    <HoloTable caption="Active goals’ target dates, from today" rows={[
      ...view.marks.map(m => [m.name, `${m.dateWords}, ${m.when}; ${m.text} reached`] as const),
      ...(view.more > 0 ? [['More dates', `${view.more} more on the Goals page`] as const] : []),
      ...(view.undated ? [['Active goals without a target date', String(view.undated)] as const] : []),
    ]}/>
  </AxBody>;
}
