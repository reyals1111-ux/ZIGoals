'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {streakFlames} from '../../../lib/nova/cards/ax/habit-flames';
import {AxdFlames} from '../cards/ax/day-flames';
import {AxdKey} from '../cards/ax/day-key';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: flames): "Best streaks" — each active habit's longest streak ever as a dashed
 * outline, with the streak running now as the flame inside it, the longest first (the Habits page's own `habitStats`).
 * A flame that fills its outline is a habit at its longest streak right now. Compact: the longest streak ever.
 */
export default function BestStreaks({size}: AxProps) {
  return <HabitSource>{(_habit, live, today) => <Best habits={live} today={today} size={size}/>}</HabitSource>;
}
const unitOf = (text: string) => text.split(' ').slice(1).join(' ');
function Best({habits, today, size}: {habits: readonly Habit[]; today: string; size: AxProps['size']}) {
  const all = useMemo(() => streakFlames(habits, today, {by: 'best', cap: habits.length}), [habits, today]);
  const shown = all.flames.slice(0, 6), top = all.longest, hidden = all.flames.length - shown.length;
  return <AxBody kind="best-streaks" size={size}>
    {top ? <AxHead figure={String(top.best)} unit={unitOf(top.bestText)} label={`longest streak ever · ${top.name}`} note={top.current ? (top.current === top.best ? 'It is running now' : `${top.text} in a row now`) : 'No streak running for it now'}/>
      : <AxHead figure="0" unit={`of ${all.total}`} label="habits with a streak yet" note="A streak starts with your next check-in"/>}
    {size !== 'S' && <AxdFlames more={hidden > 0 ? `+${hidden} more on the Habits page` : null} flames={shown.map(f => ({key: f.id, label: f.name, figure: String(f.best), share: f.share, ghost: f.bestShare, title: `${f.name}: longest ${f.bestText}, ${f.current ? `${f.text} now` : 'none running now'}`}))}/>}
    {size === 'L' && <AxdKey items={[['ghost', 'Longest ever'], ['lit', 'Running now']]}/>}
    <CardFoot source="Your habits" asOf="today"/>
    <HoloTable caption="Longest streak of each habit" rows={all.flames.map(f => [f.name, `Longest ${f.bestText}; ${f.current ? `${f.text} in a row now` : 'no streak running now'}`] as const)}/>
  </AxBody>;
}
