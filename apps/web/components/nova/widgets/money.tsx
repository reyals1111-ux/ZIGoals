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
 * Session AM-2: a runway of the next two months (the reach of this widget) under the two facts — today lit at its
 * start, a week tick every seven days, and a lit marker at each one's day. Decoration over the dates in words.
 */
const REACH = 60;
function Runway({bill, contribution}: {bill: number | null; contribution: number | null}) {
  const at = (days: number) => ({left: `${(Math.max(0, Math.min(REACH, days)) / REACH * 100).toFixed(2)}%`});
  return <div className="hw-runway" aria-hidden="true">
    <span className="hw-runway-track"><i className="hw-runway-now"/>{bill !== null && bill <= REACH && <i className="hw-runway-mark" data-kind="bill" style={at(bill)}/>}{contribution !== null && contribution <= REACH && <i className="hw-runway-mark" data-kind="contribution" style={at(contribution)}/>}</span>
    <span className="hw-runway-ends"><small>today</small><small>in two months</small></span>
  </div>;
}
export default function MoneyWidget() {
  const bills = useDeviceRecord(BILLS), goals = useGoalSummaries(), today = useLocalToday();
  if (!bills.loaded || !goals.loaded) return <NovaReading/>;
  const bill = bills.unreadable ? null : upcomingBills(bills.data, today, 60)[0] ?? null;
  const next = goals.goals.filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate >= today)
    .sort((a, b) => a.nextContributionDate!.localeCompare(b.nextContributionDate!))[0] ?? null;
  if (!bill && !next) return <NovaEmpty pillar="wealth" ghost="rows" href="/app/wealth?view=bills" action="Add a bill">{bills.unreadable ? 'Your bills could not be read right now. ' : ''}No bill or planned contribution in the next two months. Add a bill, or give a goal a plan.</NovaEmpty>;
  return <div className="hw-money"><dl className="nova-facts hw-facts">
    {bill ? <div data-kind="bill"><dt>Next bill</dt><dd><strong>{bill.title}</strong> · <span data-private-amount="">{bill.amount}</span><small>{formatDate(bill.due, {weekday: true, year: false})}, {whenWords(daysBetween(today, bill.due))}</small></dd></div>
      : <div><dt>Next bill</dt><dd><small>{bills.unreadable ? 'Your bills could not be read right now.' : 'None in the next two months.'}</small></dd></div>}
    {next ? <div data-kind="contribution"><dt>Next contribution</dt><dd><Link href={next.href} prefetch={false}><strong>{next.name}</strong></Link><small>{formatDate(next.nextContributionDate!, {weekday: true, year: false})}, {whenWords(daysBetween(today, next.nextContributionDate!))}</small></dd></div>
      : <div><dt>Next contribution</dt><dd><small>No contribution is planned yet.</small></dd></div>}
  </dl>
  <Runway bill={bill ? daysBetween(today, bill.due) : null} contribution={next ? daysBetween(today, next.nextContributionDate!) : null}/>
  </div>;
}
