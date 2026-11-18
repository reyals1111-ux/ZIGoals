'use client';
import {useMemo} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import {billDial} from '../../../lib/nova/cards/ax/money-bills';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmDial} from '../cards/ax/money-gauge';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {BillsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Next bill" — the next bill as a countdown dial: the days until it inside a ring
 * of thirty ticks (one a day) whose lit arc is the time still left, with its name, its amount in its own currency and
 * its date beside it. On the day the hand stands on the mark; a date that has passed says "overdue by …" in words. A
 * reminder only: ZIGoals never pays or cancels anything.
 */
export default function BillDial({size}: AxProps) {
  return <BillsSource>{(bills, today) => <Dial bills={bills} today={today} size={size}/>}</BillsSource>;
}
function Dial({bills, today, size}: {bills: BillsRecord; today: string; size: AxProps['size']}) {
  const view = useMemo(() => billDial(bills, today), [bills, today]), next = view.next;
  if (!next) return null;
  const days = Math.abs(next.days), unit = `${days === 1 ? 'day' : 'days'}${next.overdue ? ' late' : ''}`;
  return <AxBody kind="bill-dial" size={size}>
    <AxmHead figure={String(days)} unit={unit} tone={next.overdue ? 'watch' : undefined} label={next.overdue ? `overdue · ${next.title}` : next.days === 0 ? `${next.title} is due today` : `until ${next.title}`} note={`${next.amount} · ${next.date}`}/>
    {size !== 'S' && <div className="axm-dialrow">
      <AxmDial days={next.days} figure={String(days)} unit={unit}/>
      <div className="axm-dial-side" aria-hidden="true"><p className="axm-dial-name" title={next.title}>{next.title}</p><p className="axm-dial-line">{next.amount}</p><p className="axm-dial-line">{next.date} · {next.when}</p></div>
    </div>}
    {size === 'L' && view.after > 0 && <AxmFacts rows={[['After it', `${view.after} more ${view.after === 1 ? 'bill' : 'bills'}`]]}/>}
    <CardFoot source="Your bill reminders" asOf={`as of today, ${formatDate(today, {year: false})}`}/>
    <HoloTable caption="The next bill" rows={[['Next bill', next.title], ['Amount', next.amount], ['Due', `${next.date}, ${next.when}`], ...(view.after ? [['After it', `${view.after} more ${view.after === 1 ? 'bill' : 'bills'}`] as const] : [])]}/>
  </AxBody>;
}
