'use client';
import {useMemo} from 'react';
import {PACE_LOOKBACK_MONTHS} from '../../../lib/money-insights/spending-pace';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {paceCard, paceRows} from '../../../lib/nova/cards/money-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Delta, Fact, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 5): "Spending pace" in gold — what the person logged as spent
 * this month so far, beside what their earlier months show by the same day (the middle figure of up to twelve earlier
 * months; Wealth → Spending → Your usual pace's own engine, lib/money-insights/spending-pace.ts; figures in
 * lib/nova/cards/money-insights.ts). Two meters on one scale. A comparison of records, never a forecast: nothing is said
 * about the rest of the month, and more or less than usual carries no judgement. Fewer than three earlier months says so.
 */
export default function SpendingPaceWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => paceCard(log.data, today), [log.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!log.loaded) return <HoloReading/>;
  if (log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  const r = card.lead, foot = <CardFoot source="Your Wealth records" asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption="Your usual spending pace" rows={paceRows(card)}/>;
  if (card.state === 'empty' || !r) return <CardNotice kind="empty" ghost="bars" title="Nothing logged yet" href="/app/wealth#spending" action="Log what you spent">Log what you spend on Wealth. After three months this month stands beside your usual pace here.</CardNotice>;
  if (r.status !== 'ok' || r.usualCents === null || r.thisCents === null) return <CardNotice kind="empty" ghost="bars" title="Not enough months yet" href="/app/wealth#spending" action="Log what you spent">This needs three earlier months with spending logged in {r.currency}; {r.months === 0 ? 'there are none yet' : r.months === 1 ? 'there is 1 so far' : `there are ${r.months} so far`}.</CardNotice>;
  const top = Math.max(1, r.usualCents, r.thisCents), others = card.rows.filter(x => x !== r);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={r.thisMonth ?? '—'} label={size === 'S' ? `By the ${r.dayWords}` : `Spent this month, by the ${r.dayWords}`}>
      {size !== 'S' && r.direction && <Delta text={r.direction === 'flat' ? 'The same as usual' : `${r.difference} ${r.direction === 'up' ? 'more' : 'less'} than usual`} direction={r.direction} good={null}/>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">From the 1st to the {r.dayWords} · {r.currency}</p>}
      <Bars rows={[
        {key: 'usual', label: 'Usually by now', share: r.usualCents / top, value: r.usual ?? '—'},
        {key: 'now', label: 'This month', share: r.thisCents / top, value: r.thisMonth ?? '—'},
      ]}/>
    </div>}
    {size === 'L' && <div className="nc-facts">
      <Fact label="Earlier months compared" value={String(r.months)}/>
      {others.slice(0, 2).map(o => <Fact key={o.currency} label={`In ${o.currency}`} value={o.status === 'ok' && o.thisMonth && o.usual ? `${o.thisMonth} · usually ${o.usual}` : 'Not enough months yet'}/>)}
    </div>}
    {size === 'L' && <p className="nx-note">“Usually” is the middle figure of what your earlier months (up to {PACE_LOOKBACK_MONTHS} back) show spent from the 1st to the same day. A comparison of your records, not a forecast.</p>}
    {foot}{table}
  </div>;
}
