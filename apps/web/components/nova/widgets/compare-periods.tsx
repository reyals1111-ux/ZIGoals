'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {comparePeriods, type CompareSide} from '../../../lib/nova/cards/ax/habit-compare';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {AxTwins} from '../cards/ax/twins';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitsSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: twins): "Habits, period by period" — this period beside the same days of the one
 * before, on one scale: the due check-ins done of those due for every habit together, or the days done for the one habit
 * a question named (`ref`), with its amount where it has a measure. The count is the exact layer's own (the sentence and the bars agree). A side with nothing due
 * is an unlit dashed bar, never a zero. The difference is said in words, as a fact. Default: this week.
 */
export default function ComparePeriods({size, params}: AxProps) {
  return <HabitsSource>{(all, _live, today) => <Twins habits={all} today={today} size={size} params={params}/>}</HabitsSource>;
}
const cap = (words: string) => words.replace(/^./, c => c.toUpperCase());
function Twins({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const period = useMemo(() => widgetPeriod(params?.period, today, 'this-week'), [params?.period, today]);
  const view = useMemo(() => comparePeriods(habits, period, today, params?.ref), [habits, period, today, params?.ref]);
  const label = periodLabel(period, today), who = view.name ?? 'Every habit together';
  const text = (s: CompareSide | null) => !s ? 'No period before' : s.due ? `${s.done} of ${s.due} · ${s.amount ?? `${s.rate}%`}` : 'Nothing due';
  const said = (s: CompareSide | null) => !s ? 'No period before' : s.due ? `${s.done} of ${s.due} ${view.unit} done (${s.rate}%)${s.amount ? `; ${s.amount}` : ''}` : 'Nothing was due';
  const delta = view.points === null ? null : view.points === 0 ? 'The same share as the period before.' : `${Math.abs(view.points)} percentage ${Math.abs(view.points) === 1 ? 'point' : 'points'} ${view.points > 0 ? 'more' : 'less'} than the period before.`;
  return <AxBody kind="compare-periods" size={size}>
    {view.now.due ? <AxHead figure={String(view.now.done)} unit={`of ${view.now.due}`} label={`${view.unit} done · ${label}`} note={`${who}${view.before?.due ? ` · ${view.before.done} of ${view.before.due} the period before` : ''}`}/>
      : <AxHead figure="0" unit="due" label={`${view.unit} · ${label}`} note={`${who} · nothing was due in these days`}/>}
    {size !== 'S' && <AxTwins delta={delta}
      now={{label: cap(label), text: text(view.now), value: view.now.due ? view.now.done / view.now.due : null}}
      before={{label: view.before ? `Before · ${view.before.words}` : 'Before', text: text(view.before), value: view.before?.due ? view.before.done / view.before.due : null}}/>}
    <CardFoot source="Your habits" asOf={`${label} · ${view.now.words}`}/>
    <HoloTable caption={`${who}: ${label} beside the period before`} rows={[
      [`${cap(label)} (${view.now.words})`, said(view.now)],
      [view.before ? `The period before (${view.before.words})` : 'The period before', said(view.before)],
      ...(delta ? [['Difference', delta] as const] : []),
    ]}/>
  </AxBody>;
}
