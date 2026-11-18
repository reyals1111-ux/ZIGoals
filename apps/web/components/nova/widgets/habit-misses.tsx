'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {missRanks} from '../../../lib/nova/cards/ax/ranks';
import type {Habit} from '../../../lib/habits';
import {AxBody, AxHead, AxKey, type AxProps} from '../cards/ax/kit';
import {AxRanks} from '../cards/ax/ranks';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2; the owner's finding of 17 Nov): "Misses per habit" — how many habits were missed in the
 * period and how often, as ranked bars: each habit by its days not done, the missed part solid and the skipped part
 * hatched (said apart, never added into "missed"). With nothing missed it says so and names what is still open today.
 * The period is the question's (`period`), else this week. Compact: the figure. A hero lists up to eight habits.
 */
export default function HabitMisses({size, params}: AxProps) {
  return <HabitSource>{(_habit, all, today) => <Ranks habits={all} today={today} size={size} params={params}/>}</HabitSource>;
}
function Ranks({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const period = useMemo(() => widgetPeriod(params?.period, today, 'this-week'), [params?.period, today]);
  const view = useMemo(() => missRanks(habits, period, today), [habits, period, today]);
  const label = periodLabel(period, today), cap = size === 'L' ? 8 : 5, shown = view.rows.slice(0, cap), more = view.rows.length - shown.length;
  const total = view.rows.length + view.clean, none = view.habitsMissed === 0;
  return <AxBody kind="habit-misses" size={size}>
    <AxHead figure={String(view.habitsMissed)} unit={`of ${total}`} label={`${view.habitsMissed === 1 ? 'habit' : 'habits'} missed · ${label}`} tone={none ? 'clear' : undefined}
      note={none ? (view.skippedDays ? `Nothing missed; ${view.skippedDays} ${view.skippedDays === 1 ? 'day' : 'days'} skipped` : 'Every due day was done') : `${view.missedDays} missed ${view.missedDays === 1 ? 'day' : 'days'}${view.skippedDays ? `, ${view.skippedDays} skipped` : ''}`}/>
    {size !== 'S' && shown.length > 0 && <AxRanks max={view.max} rows={shown.map(r => ({key: r.key, label: r.label, text: `${r.total} ${r.total === 1 ? 'day' : 'days'}`, parts: [{mark: 'missed', value: r.missed}, {mark: 'skipped', value: r.skipped}, {mark: 'part', value: r.part}]}))}
      more={more > 0 ? `+${more} more on the Habits page` : view.clean > 0 ? `${view.clean} ${view.clean === 1 ? 'habit' : 'habits'} done every due day` : null}/>}
    {size !== 'S' && view.openToday.length > 0 && <p className="ax-chips">Still open today{view.openToday.slice(0, 4).map(name => <b key={name}>{name}</b>)}{view.openToday.length > 4 ? ` +${view.openToday.length - 4}` : ''}</p>}
    {size === 'L' && shown.length > 0 && <AxKey items={[['missed', 'Missed'], ['skipped', 'Skipped (not counted as missed)']]}/>}
    <CardFoot source="Your habits" asOf={label}/>
    <HoloTable caption={`Misses per habit, ${label}`} rows={[
      ['Habits missed', `${view.habitsMissed} of ${total}`],
      ...view.rows.map(r => [r.label, r.text] as const),
      ...(view.clean ? [['Done every due day', `${view.clean} ${view.clean === 1 ? 'habit' : 'habits'}`] as const] : []),
      ...(view.openToday.length ? [['Still open today', view.openToday.join(', ')] as const] : []),
    ]}/>
  </AxBody>;
}
