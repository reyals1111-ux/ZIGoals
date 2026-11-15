'use client';
import {useMemo} from 'react';
import {COUNTDOWNS, MAX_COUNTDOWNS} from '../../../lib/countdowns/schema';
import {countdownsCard, countdownsRows} from '../../../lib/nova/cards/life-insights';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {CardFoot, CardNotice, Fact, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {NxDial, NxHead} from './nx-parts';
import {NxRows} from './nx-rows';
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
  if (!next) return <CardNotice kind="empty" ghost="arc" title="Nothing ahead" href="/app/agenda" action="See your agenda">{card.passed === 1 ? 'Your one countdown has passed.' : `Your ${card.passed} countdowns have passed.`} Add the next one from this widget’s quick actions.</CardNotice>;
  const after = card.upcoming.slice(1, 1 + SHOWN[size]), more = card.upcoming.length - 1 - after.length;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={next.near} figure={next.days === 0 ? 'Now' : formatNumber(next.days)} caption={next.days === 0 ? 'today' : next.days === 1 ? 'day' : 'days'} ticks={30} spin={size === 'L'}/>
    <NxHead label={size === 'S' ? (next.days === 0 ? 'Today' : `Next · ${next.words.replace(/^./, c => c.toLowerCase())}`) : next.days === 0 ? `Today · ${next.dateText}` : `Next · ${next.words.replace(/^./, c => c.toLowerCase())} · ${next.dateText}`} title={next.title} note={next.note}/>
    {size !== 'S' && (after.length > 0 || size === 'L') && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && after.length > 0 && <p className="nx-cap">After that</p>}
      {after.length > 0 && <NxRows label="The countdowns after it" where="your agenda" extra={more} rows={after.map(l => ({key: l.id, name: l.title, value: l.words, sub: `${l.dateText}${l.note ? ` · ${l.note}` : ''}`}))}/>}
      {size === 'L' && <div className="nc-facts">
        {card.passed > 0 && <Fact label="Passed" value={String(card.passed)}/>}
        <Fact label="Kept on this device" value={`${card.total} of ${MAX_COUNTDOWNS}`}/>
      </div>}
    </div>}
    {foot}{table}
  </div>;
}
