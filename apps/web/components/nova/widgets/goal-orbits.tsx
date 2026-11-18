'use client';
import {useMemo} from 'react';
import {goalOrbits} from '../../../lib/nova/cards/ax/goals-views';
import type {GoalArc} from '../../../lib/nova/holo/goals';
import {AxmOrbits} from '../cards/ax/goals-orbits';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmHead, AxmLegend, AxmSplit} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {GoalsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Goals): "Goal orbits" — every active goal as a planet on its own ring around a small star;
 * a planet's place on its ring is its progress (it starts at the top and is back there at 100%), and the list names each
 * goal with its whole percent and whether its plan keeps pace. Seven goals at most, then "+N more". The goals and their
 * percents are the Goals HUD's own; an unknown progress is an unlit planet, never one at zero.
 */
export default function GoalOrbitsWidget({size}: AxProps) {
  return <GoalsSource>{(_goals, hud) => <Orbits arcs={hud.arcs} active={hud.active} size={size}/>}</GoalsSource>;
}
function Orbits({arcs, active, size}: {arcs: readonly GoalArc[]; active: number; size: AxProps['size']}) {
  const view = useMemo(() => goalOrbits(arcs, active), [arcs, active]), more = view.more > 0 ? `+${view.more} more on the Goals page` : null;
  return <AxBody kind="goal-orbits" size={size}>
    <AxmHead figure={String(view.active)} label={`active ${view.active === 1 ? 'goal' : 'goals'}`} note={view.lead ? `${view.lead.name} is furthest along (${view.lead.text})` : 'No progress is known yet'}/>
    {size !== 'S' && <AxmSplit rows={view.planets.length + (more ? 1 : 0)}>
      <AxmOrbits planets={view.planets}/>
      <AxmLegend items={view.planets.map(p => ({key: p.key, name: p.name, value: p.text, sub: p.pace, unlit: p.pct === null}))} more={more}/>
    </AxmSplit>}
    {size === 'L' && <p className="axm-note" aria-hidden="true">Ring 1 is nearest the star. A planet starts at the top of its ring; once round is 100%.</p>}
    <CardFoot source="Your goals" asOf="today"/>
    <HoloTable caption="Active goals and their progress" rows={[
      ['Active goals', String(view.active)],
      ...view.planets.map(p => [p.name, `${p.text}, ${p.pace}`] as const),
      ...(view.more ? [['More goals', `${view.more} more on the Goals page`] as const] : []),
    ]}/>
  </AxBody>;
}
