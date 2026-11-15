'use client';
import {useMemo} from 'react';
import {AGE_RULE, AGE_WINDOW_DAYS} from '../../../lib/money-insights/age-of-money';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {ageCard, ageRows} from '../../../lib/nova/cards/money-insights';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Fact, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 4): "Age of money" in gold — how old the money the person
 * spent is, on average, over the last 90 days of their money log (first in, first out; Wealth → Spending → Age of money's
 * own engine, lib/money-insights/age-of-money.ts; figures in lib/nova/cards/money-insights.ts). The dial shows the age
 * against the 90 days it is read over (decoration: the days are the hero). Too little history, or no income in the
 * window, is "not enough records yet" with what is missing: never a guess, never a zero. One currency at a time.
 */
export default function AgeOfMoneyWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => ageCard(log.data, today), [log.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!log.loaded) return <HoloReading/>;
  if (log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  const r = card.lead, foot = <CardFoot source="Your Wealth records" asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption={`Age of money, the last ${AGE_WINDOW_DAYS} days`} rows={ageRows(card)}/>;
  if (card.state === 'empty' || !r) return <CardNotice kind="empty" ghost="ring" title="Nothing logged yet" href="/app/wealth#spending" action="Log income or spending">Log what you receive and spend on Wealth. After 30 days the age of your money shows here.</CardNotice>;
  if (r.status !== 'ok' || r.days === null) return <CardNotice kind="empty" ghost="ring" title="Not enough records yet" href="/app/wealth#spending" action="Log income or spending">{r.words.replace(/^Not enough records yet: /, '').replace(/^./, c => c.toUpperCase())} ({r.currency}).</CardNotice>;
  const others = card.rows.filter(x => x !== r);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Gauge share={r.share} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} ticks={45} spin={size === 'L'} decor/>
      <Hero value={formatNumber(r.days, {maximumFractionDigits: 1})} unit={r.days === 1 ? 'day' : 'days'} label={size === 'L' ? `Age of money · ${r.currency}` : 'Age of money'}/>
    </div>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      <p className="nx-note">On average, over what you spent in {r.currency} in the last {AGE_WINDOW_DAYS} days.</p>
      {r.uncounted && <p className="nx-note">{r.uncounted}.</p>}
    </div>}
    {size === 'L' && others.length > 0 && <div className="nc-facts">{others.slice(0, 3).map(o => <Fact key={o.currency} label={`In ${o.currency}`} value={o.daysText ?? 'Not enough records yet'}/>)}</div>}
    {size === 'L' && <p className="nx-note">{AGE_RULE} From your records only: nothing is projected.</p>}
    {foot}{table}
  </div>;
}
