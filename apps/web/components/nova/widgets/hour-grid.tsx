'use client';
import {useMemo} from 'react';
import {hourGridCard, hourGridRows} from '../../../lib/nova/cards/plan-insights';
import {formatClock} from '../../../lib/visual-format';
import {CardFoot, CardNotice, Columns, Hero, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import {useAgendaToday} from '../holo/use-agenda-today';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2; ADR-040 Part 6, time-blocking): "Today by the hour" in ice — today's agenda as the
 * Agenda's hour grid reads it (lib/agenda/hour-grid.ts: 06:00 to 23:00, earlier when an item is earlier; figures in
 * lib/nova/cards/plan-insights.ts), built by the Agenda page's own hooks (use-agenda-today.ts). A column per hour, as
 * tall as what sits in it (an empty hour is an empty slot); the hour of now is lit. At Large the items in time order.
 * Read only: a task gets its hour on the Agenda. No answer line: a day's agenda is not a sentence.
 */
export default function HourGridWidget({size = 'M'}: Partial<CardProps>) {
  const {items, now} = useAgendaToday();
  const card = useMemo(() => items ? hourGridCard(items, now) : null, [items, now]);
  if (!items || !card) return <HoloReading/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="columns" title="Nothing on today yet" href="/app/habits?add=habit" action="Add a habit">A habit with a time, a task, a bill or a plan shows here at its hour.</CardNotice>;
  const list = card.rows.flatMap(r => r.items), next = card.next;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={String(card.timed)} unit={size === 'S' ? 'timed' : 'with a time'} label={size === 'S' ? 'Today' : `Today · ${card.total} ${card.total === 1 ? 'item' : 'items'}`}>
      {size !== 'S' && <p className="nx-note">{next ? `Next: ${formatClock(next.time!)} ${next.title}` : card.untimed ? `${card.untimed} any time today` : 'Nothing more with a time today'}</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">Each hour · {card.untimed} any time</p>}
      <Columns values={card.load.map(h => h.count)} labels={card.load.map(h => h.label)} height={size === 'L' ? 72 : 48} mark={card.nowIndex ?? undefined}/>
      {/* One column for the chart and the list under it (two columns of their own lay over each other in a wide Large panel: round 3). */}
      {size === 'L' && list.length > 0 && <NxRows label="Today in time order" where="your agenda" min={0} rows={list.map(i => ({key: i.id, name: i.title, value: formatClock(i.time!), sub: i.state === 'done' ? 'Done' : i.state === 'skipped' ? 'Skipped' : null}))}/>}
    </div>}
    <CardFoot source="Your agenda" asOf={`today, ${formatClock(now)}`}/>
    <HoloTable caption="Today by the hour" rows={hourGridRows(card)}/>
  </div>;
}
