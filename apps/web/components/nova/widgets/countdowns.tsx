'use client';
import {useMemo, type CSSProperties} from 'react';
import {COUNTDOWNS, MAX_COUNTDOWNS} from '../../../lib/countdowns/schema';
import {countdownsCard, countdownsRows} from '../../../lib/nova/cards/life-insights';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {CardFoot, CardNotice, Fact, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 Part 6, "Days until"): "Days until" in ice — the person's own
 * countdowns, soonest first (lib/countdowns/schema.ts, as Today's "Days until" card and the Agenda read them; figures in
 * lib/nova/cards/life-insights.ts). The hero is the days to the next one; the dial fills over its last 30 days
 * (decoration: the words carry it). A day that has passed is only counted ("2 passed"), never a negative number.
 * Adding one is the widget's quick action (the card's own write, with Undo).
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function CountdownsWidget({size = 'M'}: Partial<CardProps>) {
  const record = useDeviceRecord(COUNTDOWNS), {today} = useTaskClock();
  const card = useMemo(() => { try { return countdownsCard(record.data, today); } catch { return null; } }, [record.data, today]);
  if (!record.loaded) return <HoloReading/>;
  if (record.unreadable || !card) return <HoloUnread what="Your countdowns"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="arc" title="No countdown yet" href="/app/agenda" action="See your agenda">Add a day you are looking forward to: a trip, a birthday, a race. This widget’s quick actions add one; it then also shows on its day in your agenda.</CardNotice>;
  const foot = <CardFoot source="Your countdowns" asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption="Days until" rows={countdownsRows(card, Math.max(SHOWN[size] + 1, 3))}/>;
  const next = card.next;
  if (!next) return <div className="nc-body nx-card" data-size={size}>
    <CardNotice kind="empty" ghost="arc" title="Nothing ahead" href="/app/agenda" action="See your agenda">{card.passed === 1 ? 'Your one countdown has passed.' : `Your ${card.passed} countdowns have passed.`} Add the next day you are looking forward to from this widget’s quick actions.</CardNotice>
    {foot}{table}
  </div>;
  const after = card.upcoming.slice(1, 1 + SHOWN[size]), more = card.upcoming.length - 1 - after.length;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Gauge share={next.near} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} ticks={30} spin={size === 'L'} decor/>
      <Hero value={next.days === 0 ? 'Today' : formatNumber(next.days)} unit={next.days === 0 ? undefined : next.days === 1 ? 'day' : 'days'} label={next.title}>
        {size !== 'S' && <p className="nx-note">{next.dateText}{next.note ? ` · ${next.note}` : ''}</p>}
      </Hero>
    </div>
    {after.length > 0 && <div className="nx-main" data-fit="rows">
      {size === 'L' && <p className="nx-cap">After that{more > 0 ? ` · ${more} more` : ''}</p>}
      <ul className="nx-rows">{after.map((l, i) => <li key={l.id} className="nx-row nc-rise" style={{'--nc-i': i} as CSSProperties}>
        <i className="nx-row-node" aria-hidden="true"/><span className="nx-row-name" title={l.title}>{l.title}</span><span className="nx-row-value">{l.words}</span><span className="nx-row-sub">{l.dateText}{l.note ? ` · ${l.note}` : ''}</span>
      </li>)}</ul>
    </div>}
    {size === 'L' && <div className="nc-facts">
      {card.passed > 0 && <Fact label="Passed" value={String(card.passed)}/>}
      <Fact label="Kept on this device" value={`${card.total} of ${MAX_COUNTDOWNS}`}/>
    </div>}
    {foot}{table}
  </div>;
}
