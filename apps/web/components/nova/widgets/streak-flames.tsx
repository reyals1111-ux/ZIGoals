'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {streakFlames} from '../../../lib/nova/cards/ax/habit-flames';
import {AxdFlames} from '../cards/ax/day-flames';
import {AxdKey} from '../cards/ax/day-key';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot, Fact} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: flames): "Streak flames" — each active habit's streak running now as a flame whose
 * height follows the streak, the longest first, six at most; with the habit a question named (`ref`) only that one,
 * large, with its longest streak ever as an outline behind it. The figures are the Habits page's own (`habitStats`): a
 * skipped day neither adds to a streak nor breaks it. A habit with no streak running is an unlit ember.
 * Compact: the longest streak now. A hero adds the key (or, for one habit, its two figures).
 */
export default function StreakFlames({size, params}: AxProps) {
  return <HabitSource refId={params?.ref}>{(_habit, live, today) => <Flames habits={live} today={today} size={size} params={params}/>}</HabitSource>;
}
const unitOf = (text: string) => text.split(' ').slice(1).join(' ');
function Flames({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const view = useMemo(() => streakFlames(habits, today, {ref: params?.ref, cap: 6}), [habits, today, params?.ref]);
  const all = useMemo(() => streakFlames(habits, today, {cap: habits.length}).flames, [habits, today]);
  const one = view.one ? view.flames[0]! : null, lead = one ?? view.lead;
  return <AxBody kind="streak-flames" size={size}>
    {lead ? <AxHead figure={String(lead.current)} unit={unitOf(lead.text)} label={one ? `in a row now · ${one.name}` : `longest streak now · ${lead.name}`}
      note={one ? (one.current ? `Longest ever: ${one.bestText}` : `No streak running · longest ever ${one.bestText}`) : `${view.running} of ${view.total} ${view.total === 1 ? 'habit has' : 'habits have'} a streak running`}/>
      : <AxHead figure="0" unit={`of ${view.total}`} label="streaks running now" note={view.longest ? `Longest ever: ${view.longest.name}, ${view.longest.bestText}` : 'A streak starts with your next check-in'}/>}
    {size !== 'S' && <AxdFlames more={view.more > 0 ? `+${view.more} more on the Habits page` : null} flames={view.flames.map(f => ({key: f.id, label: f.name, figure: String(f.current), share: f.share, ...(one ? {ghost: f.bestShare} : {}), title: `${f.name}: ${f.current ? `${f.text} in a row` : 'no streak running'}`}))}/>}
    {size === 'L' && one && <div className="nc-facts axd-facts"><Fact label="In a row now" value={one.current ? one.text : 'No streak running'}/><Fact label="Longest ever" value={one.bestText}/></div>}
    {size === 'L' && <AxdKey items={one ? [['lit', 'Running now'], ['ghost', 'Longest ever']] : [['lit', 'A streak running now'], ['none', 'No streak running']]}/>}
    <CardFoot source="Your habits" asOf="today"/>
    <HoloTable caption={one ? `${one.name}: streak` : 'Streaks running now'} rows={one
      ? [['In a row now', one.current ? one.text : 'No streak running'], ['Longest ever', one.bestText]]
      : [['Habits with a streak running', `${view.running} of ${view.total}`], ...all.map(f => [f.name, f.current ? `${f.text} in a row (longest ${f.bestText})` : `No streak running (longest ${f.bestText})`] as const)]}/>
  </AxBody>;
}
