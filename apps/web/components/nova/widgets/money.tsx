'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {BILLS} from '../../../lib/bills/schema';
import {upcomingBills} from '../../../lib/bills/store';
import {formatDate} from '../../../lib/visual-format';
import {daysBetween, whenWords} from '../../../lib/nova/widgets/words';
import {useGoalSummaries} from './use-goal-summaries';
import {NovaEmpty, NovaReading} from './empty';

/**
 * "Next bill and contribution": the next bill the person keeps (Upcoming bills, each amount in its own currency) and the
 * next planned contribution to one of their goals. ZIGoals never pays or moves anything; this only reads.
 */
export default function MoneyWidget() {
  const bills = useDeviceRecord(BILLS), goals = useGoalSummaries(), today = useLocalToday();
  if (!bills.loaded || !goals.loaded) return <NovaReading/>;
  const bill = bills.unreadable ? null : upcomingBills(bills.data, today, 60)[0] ?? null;
  const next = goals.goals.filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate >= today)
    .sort((a, b) => a.nextContributionDate!.localeCompare(b.nextContributionDate!))[0] ?? null;
  if (!bill && !next) return <NovaEmpty pillar="wealth" href="/app/wealth?view=bills" action="Add a bill">{bills.unreadable ? 'Your bills could not be read right now. ' : ''}No bill or planned contribution in the next two months. Add a bill, or give a goal a plan.</NovaEmpty>;
  return <dl className="nova-facts">
    {bill ? <div><dt>Next bill</dt><dd><strong>{bill.title}</strong> · <span data-private-amount="">{bill.amount}</span><small>{formatDate(bill.due, {weekday: true, year: false})}, {whenWords(daysBetween(today, bill.due))}</small></dd></div>
      : <div><dt>Next bill</dt><dd><small>{bills.unreadable ? 'Your bills could not be read right now.' : 'None in the next two months.'}</small></dd></div>}
    {next ? <div><dt>Next contribution</dt><dd><Link href={next.href} prefetch={false}><strong>{next.name}</strong></Link><small>{formatDate(next.nextContributionDate!, {weekday: true, year: false})}, {whenWords(daysBetween(today, next.nextContributionDate!))}</small></dd></div>
      : <div><dt>Next contribution</dt><dd><small>No contribution is planned yet.</small></dd></div>}
  </dl>;
}
