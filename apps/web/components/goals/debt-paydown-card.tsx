'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS} from '../../lib/accounts/schema';
import {DEBT_PLANNER} from '../../lib/debt-planner/store';
import {centsText} from '../../lib/debt-planner/plan';
import {paydownGoals} from '../../lib/goals/debt-paydown';
import {formatMoney, formatProgressPercent} from '../../lib/visual-format';
import {localDate} from '../../lib/local-date';

const month = (key: string) => { try { return new Intl.DateTimeFormat(undefined, {month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${key}-01T12:00:00Z`)); } catch { return key; } };

/**
 * Session AL third pass (GAP-119, P-DVG-06): debts as goals to reach zero, from Wealth's own records (lib/goals/debt-paydown.ts).
 * Nothing shows while no debt is tracked; nothing here writes.
 */
export function DebtPaydownCard() {
 const accounts = useDeviceRecord(ACCOUNTS), planner = useDeviceRecord(DEBT_PLANNER);
 if (!accounts.loaded || accounts.unreadable || !planner.loaded) return null;
 const groups = paydownGoals(accounts.data.items, planner.unreadable ? {version: 1} : planner.data, localDate());
 if (!groups.length) return null;
 return <section className="panel debt-paydown" aria-labelledby="debt-paydown-title">
  <p className="eyebrow">Goals to reach zero</p><h2 id="debt-paydown-title">Paying down debts</h2>
  {groups.map(g => { const money = (c: bigint) => formatMoney(centsText(c), g.currency); return <div key={g.currency} className="debt-paydown-group">
   {groups.length > 1 && <h3>{g.currency}</h3>}
   <ul className="debt-paydown-list">{g.rows.map(r => <li key={r.id}><strong>{r.name}</strong><span>{money(r.owed)} owed{r.paidShare !== null && r.start > r.owed ? ` · ${formatProgressPercent(r.paidShare * 100)} paid down since ${money(r.start)}` : ''}</span><span>{r.missing ?? (r.payoff ? `Paid off by ${month(r.payoff)} (projection)` : 'Not paid off within 100 years at these payments.')}</span></li>)}</ul>
   {g.payoff && <p>All {g.currency} debts paid off by <strong>{month(g.payoff)}</strong>{g.extra > 0n ? <> with {money(g.extra)} extra a month, highest rate first{g.saved !== null && g.saved > 0n ? <>, saving about <strong>{money(g.saved)}</strong> in interest against minimums only</> : null}.</> : ' paying the minimums.'}</p>}
  </div>; })}
  <p className="fine">A projection from your own rates and payments, assuming they stay the same and nothing new is borrowed. Not advice.</p>
  <p><Link className="text-link" href="/app/wealth#accounts-title">Plan payments on Wealth →</Link></p>
 </section>;
}
export default DebtPaydownCard;
