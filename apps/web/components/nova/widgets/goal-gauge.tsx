'use client';
import {goalGauge} from '../../../lib/nova/cards/ax/goals-views';
import {estimateWords} from '../../../lib/nova/cards/goal-focus';
import {MILESTONES} from '../../../lib/nova/holo/goals';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmArc} from '../cards/ax/money-gauge';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NoGoals, useGoalFocus} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Goals): "Goal gauge" — one goal on an arc: the percent reached with the quarter, half and
 * three-quarter stones, what is saved of its target and whether its plan keeps pace, in the goal page's own words
 * (lib/nova/cards/goal-focus.ts). The goal is the one the answer named (`ref`), else the lead goal of NOVA's Goals HUD.
 * Where its records give a pace forecast, that line is labelled "Estimate": a projection, never a promise. An unknown
 * progress is an unlit gauge, never a needle at zero.
 */
export default function GoalGaugeWidget({size, params}: AxProps) {
  const shown = usePillarShown('goals'), {loaded, error, focus} = useGoalFocus(params?.ref);
  if (!shown) return <HoloHidden pillar="Goals"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !focus) return <HoloUnread what="Your goals"/>;
  const goal = focus.goal;
  if (!goal) return <NoGoals/>;
  const words = estimateWords(focus.forecast, goal), view = goalGauge(goal, words);
  return <AxBody kind="goal-gauge" size={size}>
    <AxmHead figure={view.figure} label={view.label} note={view.note}/>
    {size !== 'S' && <div className="axm-solo axm-inst" aria-hidden="true"><AxmArc size="solo" share={view.share} figure={view.figure} marks={MILESTONES}/></div>}
    {size !== 'S' && words && <p className="axm-note">{words.estimate && <span className="axm-chip">Estimate</span>}{words.headline}</p>}
    {size === 'L' && <AxmFacts rows={[...(goal.left ? [['Left to go', goal.left] as const] : []), ...(goal.targetDate ? [['Target date', formatDate(goal.targetDate)] as const] : [])]}/>}
    <CardFoot source="Your goals" asOf="today"/>
    <HoloTable caption={`Goal: ${view.name}`} rows={view.rows}/>
  </AxBody>;
}
