'use client';
import {useMemo} from 'react';
import type {GoalSummary} from '../../../lib/goal-summary';
import {savingsJars} from '../../../lib/nova/cards/ax/goals-views';
import {AxmJars} from '../cards/ax/goals-jars';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmHead, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {GoalsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Goals): "Savings jars" — each active goal that saves an amount as a glass jar filled to its
 * progress, six at most, with its number in the list beside its name, its whole percent and what is saved of its target
 * (each goal in its own currency, never added across). A goal whose value is unknown is an unlit dashed jar, never an
 * empty one. The figures are the goals' own; nothing here moves money.
 */
export default function SavingsJarsWidget({size}: AxProps) {
  return <GoalsSource>{goals => <Jars goals={goals} size={size}/>}</GoalsSource>;
}
function Jars({goals, size}: {goals: readonly GoalSummary[]; size: AxProps['size']}) {
  const view = useMemo(() => savingsJars(goals), [goals]), more = view.more > 0 ? `+${view.more} more on the Goals page` : null;
  if (!view.jars.length) return <CardNotice kind="empty" ghost="columns" title="No savings goal yet" href="/app/goals/new" action="Set a savings goal">A goal that saves toward an amount fills a jar here.</CardNotice>;
  return <AxBody kind="savings-jars" size={size}>
    <AxmHead figure={String(view.count)} unit={view.count === 1 ? 'jar' : 'jars'} label={`${view.count === 1 ? 'savings goal' : 'savings goals'} · active`} note={view.lead ? `${view.lead.name} is fullest (${view.lead.text})` : 'No value is known yet'}/>
    {size !== 'S' && <AxmSplit stack rows={view.jars.length + (more ? 1 : 0)}>
      <AxmJars jars={view.jars}/>
      <AxmLegend items={view.jars.map(j => ({key: j.key, name: j.name, value: j.text, sub: j.saved, unlit: j.level === null}))} more={more}/>
    </AxmSplit>}
    <CardFoot source="Your goals" asOf="today"/>
    <HoloTable caption="Savings goals and how full each is" rows={[
      ['Active savings goals', String(view.count)],
      ...view.jars.map(j => [j.name, `${j.text}; ${j.saved}; ${j.pace}`] as const),
      ...(view.more > 0 ? [['More savings goals', `${view.more} more on the Goals page`] as const] : []),
    ]}/>
  </AxBody>;
}
