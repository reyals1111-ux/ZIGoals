'use client';
import {useMemo} from 'react';
import {addLocalDays} from '../../../lib/local-date';
import type {WeekCell} from '../../../lib/nova/cards/habit-week';
import {perfectDaysCard, perfectDaysRows} from '../../../lib/nova/cards/life-insights';
import {formatMonth, formatWeekday} from '../../../lib/visual-format';
import {useHabits} from '../../habits/use-habits';
import {CardFoot, CardNotice, Fact, Lattice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-039 backlog #1): "Perfect days" in cyan — the days this month on which
 * every habit due was done, the run of them, and the month as a lattice of days (Habits → Perfect days' own rules,
 * lib/habits-extras/perfect-days.ts; figures in lib/nova/cards/life-insights.ts). A day with nothing due is a rest, never
 * a miss; today is still to come until it is done. The ring is the share of this month's due days that were perfect
 * (decoration over the words). Nothing is written here: ticking a habit is the widget's quick action, with Undo.
 * S: the count. M: with the last three weeks. L: the whole month, today's state and the key to the cells.
 */
const DAY_MS = 86_400_000, utc = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
/** The ISO week of the week that starts on `monday`: the week of the year its Thursday falls in. */
function isoWeek(monday: string): number {
  const thursday = utc(monday) + 3 * DAY_MS;
  return 1 + Math.floor((thursday - Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1)) / (7 * DAY_MS));
}
const KEY: readonly (readonly [WeekCell, string])[] = [['done', 'Every habit due, done'], ['part', 'Some done'], ['missed', 'Nothing logged'], ['rest', 'Nothing due']];
export default function PerfectDaysWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('habits'), habits = useHabits();
  const card = useMemo(() => { if (!habits.loaded || habits.error) return null; try { return perfectDaysCard(habits.data.habits, habits.today); } catch { return null; } }, [habits.loaded, habits.error, habits.data, habits.today]);
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!habits.loaded) return <HoloReading/>;
  if (habits.error || !card) return <HoloUnread what="Your habits"/>;
  if (!card.count) return <CardNotice kind="empty" ghost="lattice" title="No habits yet" href="/app/habits?add=habit" action="Add a habit">A day lights up here once every habit due that day is done.</CardNotice>;
  // Large: the whole month, in calendar order. Medium: the week of today and the two before it (of this month), newest
  // first, so a short panel drops the older weeks and keeps this one (cards/connect-cards.css).
  const upTo = card.weeks.findIndex(w => w.today !== undefined), weeks = size === 'L' ? card.weeks : card.weeks.slice(Math.max(0, (upTo < 0 ? card.weeks.length : upTo + 1) - 3), upTo < 0 ? undefined : upTo + 1).reverse();
  const used = new Set(weeks.flatMap(w => w.cells)), month = formatMonth(card.month);
  const run = card.run > 0 ? `${card.run} in a row` : 'No run going';
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={card.dueDays ? card.perfect / card.dueDays : null} figure={String(card.perfect)} caption={card.dueDays ? `of ${card.dueDays}` : null} spin={size === 'L'}/>
    <NxHead label={size === 'S' ? 'Perfect days' : `Perfect days · ${month}`} title={card.dueDays ? `${card.perfect} of ${card.dueDays} days` : 'Nothing due yet'} note={size === 'L' ? `${run} · today: ${card.todayWords.replace(/^./, c => c.toLowerCase())}` : size === 'S' ? run : null}/>
    {size !== 'S' && <div className="nx-main nx-month" data-fit="rows" data-wr-limit="">
      <Lattice columns={Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(card.firstMonday, i)).slice(0, 1))} rows={weeks.map(w => ({key: w.key, label: `W${isoWeek(w.key)}`, cells: w.cells, today: w.today}))}/>
      {size === 'L' && <div className="nc-facts"><Fact label="Days with something due" value={String(card.dueDays)}/></div>}
      {size === 'L' && <p className="nx-key" aria-hidden="true">{KEY.filter(([cell]) => used.has(cell)).map(([cell, words]) => <span key={cell}><i data-cell={cell}/>{words}</span>)}</p>}
    </div>}
    <CardFoot source="Your habits" asOf={`today · ${run.replace(/^./, c => c.toLowerCase())}`}/>
    <HoloTable caption={`Perfect days, ${month}`} rows={perfectDaysRows(card)}/>
  </div>;
}
