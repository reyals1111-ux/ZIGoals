'use client';
import {useMemo} from 'react';
import {NETWORTH_HISTORY} from '../../../lib/networth-history';
import {changeWords} from '../../../lib/nova/cards/net-worth';
import {NET_WORTH_HISTORY_RANGE, historyMoney, netWorthHistoryAsOf, netWorthHistoryCard, netWorthHistoryRows} from '../../../lib/nova/cards/net-worth-history';
import {formatDate, formatPercent} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Delta, Fact, Hero, TrendArea, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-039 backlog #11): "Net worth over time" in gold — a true net-worth line from
 * the history Wealth records (one snapshot each day Wealth is opened, lib/networth-history.ts; read only here). The
 * figure is Wealth's own net worth: holdings plus accounts minus debts, in one currency (lib/nova/cards/net-worth-history.ts).
 * The hero is the newest recorded day; the change is from the first to the last known day in the range. A day that was
 * not opened, or on which something had no value, is a gap and is said so: never filled in, never a zero. The Portfolio
 * and the tracked wallets are listed apart at Large, never added. Other currencies are named, never converted. ZIGoals
 * moves no money; this only reads, and its one link opens Wealth at "Your wealth over time".
 * S: the figure and a spark. M: with the line. L: with what is counted, what stands apart and the days recorded.
 */
const percent = (value: number) => formatPercent(value, {decimals: 1, signed: true});
export default function NetWorthHistoryWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), history = useDeviceRecord(NETWORTH_HISTORY), today = useLocalToday(), range = params?.range ?? NET_WORTH_HISTORY_RANGE;
  const card = useMemo(() => { try { return netWorthHistoryCard(history.data, today, range); } catch { return null; } }, [history.data, today, range]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!history.loaded) return <HoloReading/>;
  if (history.unreadable || !card) return <HoloUnread what="Your net-worth history"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="trend" title="No day recorded yet" href="/app/wealth#wealth-history" action="Record today on Wealth">Wealth records your net worth once on each day you open it. Days you do not open stay empty.</CardNotice>;
  const cur = card.currency ?? '', money = (cents: bigint) => historyMoney(cents, cur), on = (day: string) => formatDate(day, {year: !day.startsWith(today.slice(0, 4))});
  const source = card.example ? 'Showcase example history' : 'Your Wealth records';
  const table = <HoloTable caption={`Net worth in ${cur || 'your currency'}, ${card.rangeWords}`} rows={netWorthHistoryRows(card, money, c => changeWords(c, money, percent, on), on)}/>;
  const latest = card.latest;
  if (card.state === 'quiet' || !latest) return <CardNotice kind="empty" ghost="trend" title={`No day recorded in ${card.rangeWords}`} href="/app/wealth#wealth-history" action="Record today on Wealth">The last recorded day is before this range{card.since ? `; the history starts ${on(card.since)}` : ''}.</CardNotice>;
  const known = latest.cents !== null, shownCents = known ? latest.cents : card.latestKnown?.cents ?? null, knownDays = card.points.filter(p => p.cents !== null), first = knownDays[0], last = knownDays.at(-1);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={shownCents === null ? '—' : money(shownCents)} label={known ? (size === 'S' ? 'Net worth' : `Net worth · ${on(latest.day)}`) : card.latestKnown ? `Last known · ${on(card.latestKnown.day)}` : 'Net worth not known'}>
      {!known && size !== 'S' && <p className="nx-note" data-tone="watch">Not known on {on(latest.day)}: no value for {latest.missing.slice(0, 2).join(', ')}{latest.missing.length > 2 ? ` and ${latest.missing.length - 2} more` : ''}.</p>}
      {size !== 'S' && card.change && <Delta text={changeWords(card.change, money, percent, on)} direction={card.change.direction} good={card.change.direction === 'up' ? true : card.change.direction === 'down' ? false : null}/>}
    </Hero>
      {size === 'S' && knownDays.length > 1 && <span className="nc-mini" aria-hidden="true"><TrendArea values={card.series} height={32}/></span>}
    </div>
    {size !== 'S' && <div className="nx-main">
      {size === 'L' && <p className="nx-cap">Recorded days · {card.rangeWords}</p>}
      {knownDays.length > 1 && first && last
        ? <TrendArea values={card.series} height={size === 'L' ? 112 : 44} labels={[on(first.day), on(last.day)]} {...(card.high && card.low && card.high.cents !== card.low.cents ? {maxLabel: money(card.high.cents), minLabel: money(card.low.cents)} : {})}/>
        : <p className="nx-note">One day with a known net worth in {card.rangeWords}. A line shows once there are two.</p>}
    </div>}
    {size === 'L' && <div className="nc-facts">
      {card.parts.map(p => <Fact key={p.source} label={p.counted ? p.label : `${p.label} · not added`} value={p.cents === null ? 'No value that day' : money(p.cents)}/>)}
      <Fact label="Days recorded" value={`${card.recorded}${card.notOpened ? ` · ${card.notOpened} not opened` : ''}`}/>
    </div>}
    {size === 'L' && <p className="nx-note">Net worth is your holdings plus your accounts minus your debts, as Wealth states it. The line joins the recorded days; a day you did not open Wealth is never filled in.{card.example ? ' Fictional Showcase history.' : ''}</p>}
    <CardFoot source={source} asOf={netWorthHistoryAsOf(card, on)}>{size === 'S' && card.otherCurrencies.length > 0 ? <span> · also in {card.otherCurrencies.join(', ')}, never converted</span> : null}</CardFoot>
    {table}
  </div>;
}
