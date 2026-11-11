'use client';
import {useMemo} from 'react';
import {cellWords, habitWeek, streakNote, type WeekCell} from '../../../lib/nova/cards/habit-week';
import {streakWords} from '../../../lib/nova/holo/habits';
import {formatWeekday} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {useHabits} from '../../habits/use-habits';
import {CardFoot, CardNotice, Fact, Hero, Lattice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/life-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Habits): "Habits this week" in cyan — today's habits done of those due, and a
 * lattice with one row per active habit and the last seven days ending today (done, partly done, not done, not due, still
 * to come), each row's current streak beside it. Every figure is the Habits page's own (lib/nova/cards/habit-week.ts).
 * S: the hero. M: the hero and four rows. L: eight rows, the week's total, the longest streak and the key to the cells.
 */
const KEY: readonly (readonly [WeekCell, string])[] = [['done', 'Done'], ['part', 'Partly'], ['missed', 'Not done'], ['rest', 'Not due'], ['ahead', 'Still to come']];
export default function HabitWeekWidget({size}: {size: CardProps['size']; params?: CardProps['params']}) {
  const shown = usePillarShown('habits'), habits = useHabits(), rows = size === 'L' ? 8 : 4;
  const week = useMemo(() => habits.loaded && !habits.error ? habitWeek(habits.data.habits, habits.today, rows) : null, [habits.loaded, habits.error, habits.data, habits.today, rows]);
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!habits.loaded) return <HoloReading/>;
  if (habits.error || !week) return <HoloUnread what="Your habits"/>;
  if (!week.count) return <CardNotice kind="empty" title="No habits yet" href="/app/habits?add=habit" action="Add a habit">Your week lights up here, one row for each habit.</CardNotice>;
  if (!week.active) return <CardNotice kind="empty" title="No active habits" href="/app/habits" action="Resume a habit">Your habits are paused or archived. Resume one and its week shows here.</CardNotice>;
  const used = new Set(week.rows.flatMap(r => r.cells));
  return <div className="nc-body nc-habitweek" data-size={size}>
    <Hero value={`${week.done}`} unit={`of ${week.due}`} label={!week.due ? 'Nothing due today' : week.done >= week.due ? 'All done today' : 'Done today'}/>
    {size !== 'S' && <Lattice columns={week.days.map(d => formatWeekday(d).slice(0, 1))} rows={week.rows.map(r => ({key: r.id, label: r.title, cells: r.cells, note: streakNote(r.streak, r.unit)}))}/>}
    {size === 'L' && <div className="nc-facts">
      <Fact label="Last seven days" value={week.weekDue ? `${week.weekDone} of ${week.weekDue} done` : 'Nothing was due'}/>
      <Fact label="Longest streak" value={week.longest ? `${week.longest.title} · ${streakWords(week.longest.streak, week.longest.unit)}` : 'Starts with your next check-in'}/>
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
