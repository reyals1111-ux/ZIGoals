'use client';
import {useMemo, type CSSProperties} from 'react';
import {BILLS} from '../../../lib/bills/schema';
import {NEAR_DAYS, billsCard, billsRows, type BillLine} from '../../../lib/nova/cards/bills';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Fact, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/wealth-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Wealth): "Upcoming bills" in gold: the bills the person keeps as reminders, each
 * once at its next due date, soonest first (lib/bills/store.ts, as Wealth → Upcoming bills and "Next bill and
 * contribution" read them; figures in lib/nova/cards/bills.ts). The hero is the next bill: its amount in its own
 * currency, its name, its date and the days to it in words. The dial beside a bill is a countdown: it fills over the last
 * 30 days before the due date, with the days inside it (decoration; the words carry it). ZIGoals never pays or cancels
 * anything: these are reminders, and the one link opens Wealth.
 * AM-2: the next bill beside its countdown ring (a thirty-tick bezel, the days inside), the ones after it as rows with
 * small countdown rings.
 */
const SHOWN = {S: 1, M: 3, L: 6} as const;
/** The countdown dial (the kit's ring gauge; a bezel of thirty ticks, one a day): the days to the due date inside, lit by how near it is. Decoration over the row's words. */
function Countdown({line, size}: {line: BillLine; size: number}) {
  const days = Math.abs(line.days), big = size >= 60, worded = size >= 84, figure = <b className="nc-ring-figure">{days > 99 ? '99+' : days}</b>;
  return <Gauge share={line.near} size={size} bezel={big} ticks={30} spin={big} tone={line.overdue ? 'over' : undefined} decor className="nc-bills-dial">
    {worded ? <span className="nc-bills-dial-words">{figure}<small className="nc-bills-dial-unit">{line.overdue ? 'late' : days === 1 ? 'day' : 'days'}</small></span> : figure}
  </Gauge>;
}
export default function BillsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), bills = useDeviceRecord(BILLS), today = useLocalToday();
  const card = useMemo(() => billsCard(bills.data, today), [bills.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!bills.loaded) return <HoloReading/>;
  if (bills.unreadable) return <HoloUnread what="Your Wealth records"/>;
  const next = card.next;
  if (card.state === 'empty' || !next) return <CardNotice kind="empty" ghost="rows" title="No bills kept yet" href="/app/wealth?view=bills" action="Add a bill">Add a bill or a subscription on Wealth and the next ones count down here.</CardNotice>;
  const lines = card.lines.slice(0, SHOWN[size]), rest = lines.slice(1), more = card.lines.length - lines.length;
  return <div className="nc-body nc-bills-card" data-size={size}>
    <div className="nc-bills-next">
      {size !== 'S' && <Countdown line={next} size={size === 'L' ? 96 : 64}/>}
      <Hero value={next.amount} label={next.title}>
        <p className="nc-bills-when" data-over={next.overdue || undefined}>{size === 'S' ? next.when : `${next.date} · ${next.when}`}</p>
      </Hero>
    </div>
    {rest.length > 0 && <div className="nc-bills-after">
      {size === 'L' && <p className="nc-bills-caption">After that{more > 0 ? ` · ${more} more on Wealth` : ''}</p>}
      <ul className="nc-bills-list">{rest.map((l, i) => <li key={l.id} className="nc-bills-row nc-rise" data-over={l.overdue || undefined} style={{'--nc-i': i} as CSSProperties}>
        <Countdown line={l} size={size === 'L' ? 40 : 34}/>
        <span className="nc-bills-name" title={l.title}>{l.title}</span>
        <span className="nc-bills-amount">{l.amount}</span>
        <span className="nc-bills-when" data-over={l.overdue || undefined}>{l.date} · {l.when}</span>
      </li>)}</ul>
    </div>}
    {size === 'L' && <div className="nc-facts">
      {/* Each currency is its own figure, side by side: never converted, never added. */}
      {card.month.length > 0 && <Fact label={`Due in the next ${NEAR_DAYS} days`} value={card.month.slice(0, 3).map(m => m.text).join(' · ')}/>}
      {card.typical.length > 0 && <Fact label="A typical month, estimated" value={`about ${card.typical.slice(0, 3).map(t => t.text).join(' · ')}`}/>}
    </div>}
    <CardFoot source="Your Wealth records" asOf={`as of today, ${formatDate(today, {year: false})}`}/>
    <HoloTable caption="Upcoming bills" rows={billsRows(card, lines.length)}/>
  </div>;
}
