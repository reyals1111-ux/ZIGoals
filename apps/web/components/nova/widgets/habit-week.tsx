'use client';
import {useMemo, type CSSProperties} from 'react';
import {cellWords, habitWeek, streakNote, type WeekCell} from '../../../lib/nova/cards/habit-week';
import {streakWords} from '../../../lib/nova/holo/habits';
import {formatWeekday} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {useHabits} from '../../habits/use-habits';
import {CardFoot, CardNotice, Gauge, Hero, Lattice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/life-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Habits): "Habits this week" in cyan — today's habits done of those due, and a
 * lattice with one row per active habit and the last seven days ending today (done, partly done, not done, not due, still
 * to come), each row's current streak beside it. Every figure is the Habits page's own (lib/nova/cards/habit-week.ts).
 * S: the hero. M: the hero and four rows. L: eight rows, the week's total, the longest streak and the key to the cells.
 * AM-2: today is a ring gauge beside its figure, the week a lattice of lit glass cells, and at Large the week's total is
 * a second ring and the longest streak wears the streak rings (three lit rings: an emblem, not a measure).
 */
const KEY: readonly (readonly [WeekCell, string])[] = [['done', 'Done'], ['part', 'Partly'], ['missed', 'Not done'], ['rest', 'Not due'], ['ahead', 'Still to come']];
export default function HabitWeekWidget({size}: {size: CardProps['size']; params?: CardProps['params']}) {
  const shown = usePillarShown('habits'), habits = useHabits(), rows = size === 'L' ? 8 : 4;
  const week = useMemo(() => habits.loaded && !habits.error ? habitWeek(habits.data.habits, habits.today, rows) : null, [habits.loaded, habits.error, habits.data, habits.today, rows]);
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!habits.loaded) return <HoloReading/>;
  if (habits.error || !week) return <HoloUnread what="Your habits"/>;
  if (!week.count) return <CardNotice kind="empty" ghost="lattice" title="No habits yet" href="/app/habits?add=habit" action="Add a habit">Your week lights up here, one row for each habit.</CardNotice>;
  if (!week.active) return <CardNotice kind="empty" ghost="lattice" title="No active habits" href="/app/habits" action="Resume a habit">Your habits are paused or archived. Resume one and its week shows here.</CardNotice>;
  const used = new Set(week.rows.flatMap(r => r.cells));
  return <div className="nc-body nc-habitweek" data-size={size}>
    <div className="nc-habitweek-top">
      {/* Today's share of what is due, as a ring (decoration: the figure beside it says it). Nothing due: an empty ring. */}
      {size !== 'S' && <Gauge share={week.due ? week.done / week.due : 0} size={size === 'L' ? 64 : 50} spin={size === 'L'} className="nc-habitweek-ring"/>}
      <Hero value={`${week.done}`} unit={`of ${week.due}`} label={!week.due ? 'Nothing due today' : week.done >= week.due ? 'All done today' : 'Done today'}/>
    </div>
    {size !== 'S' && <Lattice columns={week.days.map(d => formatWeekday(d).slice(0, 1))} rows={week.rows.map(r => ({key: r.id, label: r.title, cells: r.cells, note: streakNote(r.streak, r.unit)}))}/>}
    {size === 'L' && <div className="nc-habitweek-stats">
      <p className="nc-habitweek-stat nc-rise"><Gauge share={week.weekDue ? week.weekDone / week.weekDue : null} size={34} bezel={false}/><span className="nc-habitweek-stat-label">Last seven days</span><b>{week.weekDue ? `${week.weekDone} of ${week.weekDue} done` : 'Nothing was due'}</b></p>
      <p className="nc-habitweek-stat nc-rise" style={{'--nc-i': 1} as CSSProperties}><svg className="nc-habitweek-streak" viewBox="-24 -24 48 48" aria-hidden="true" focusable="false"><circle r="20"/><circle r="13.5"/><circle r="7"/><circle className="nc-habitweek-streak-core" r="2.6"/></svg><span className="nc-habitweek-stat-label">Longest streak</span><b>{week.longest ? `${week.longest.title} · ${streakWords(week.longest.streak, week.longest.unit)}` : 'Starts with your next check-in'}</b></p>
    </div>}
    {size === 'L' && <p className="nc-habitweek-key" aria-hidden="true">{KEY.filter(([cell]) => used.has(cell)).map(([cell, words]) => <span key={cell}><i data-cell={cell}/>{words}</span>)}</p>}
    <CardFoot source="Your habits" asOf="today">{size !== 'S' && week.more > 0 && <span className="nc-habitweek-more">+{week.more} more<span className="sr-only"> {plural(week.more, 'habit')}</span></span>}</CardFoot>
    <HoloTable caption="Habits this week (the last seven days, ending today)" rows={[
      ['Done today', week.due ? `${week.done} of ${week.due} due` : 'Nothing due today'],
      ...week.rows.map(r => [r.title, `${week.days.map((d, i) => `${formatWeekday(d)} ${cellWords(r.cells[i]!)}`).join(', ')}. ${r.streak > 0 ? `Current streak: ${streakWords(r.streak, r.unit)}` : 'No streak running'}`] as const),
      ...(week.more > 0 ? [['More habits', `${week.more} not shown here`] as const] : []),
      ['Last seven days', week.weekDue ? `${week.weekDone} of ${week.weekDue} due days done` : 'Nothing was due'],
    ]}/>
  </div>;
}
