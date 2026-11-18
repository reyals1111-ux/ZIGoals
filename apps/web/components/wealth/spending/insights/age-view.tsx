'use client';
import {useMemo} from 'react';
import {currenciesOf} from '../../../../lib/money-insights/cash-flow';
import {AGE_MEANING, AGE_MIN_HISTORY_DAYS, AGE_RULE, AGE_WHAT, ageOfMoney} from '../../../../lib/money-insights/age-of-money';
import type {InsightProps} from './spending-insights';
import {formatNumber} from '../../../../lib/visual-format';
import {money} from './format';

/** Session AP (feature 4): age of money, first in first out over the last 90 days, one currency at a time. */
const days = (n: number) => `${formatNumber(n, {maximumFractionDigits: 1})} ${n === 1 ? 'day' : 'days'}`;
export default function AgeView({entries, today}: InsightProps) {
  const ages = useMemo(() => currenciesOf(entries, today).map(c => ageOfMoney(entries, c, today)), [entries, today]);
  return <>
    {/* Session AT (AP D22 minor 3): what it is first, then the figure and its meaning, then how it is counted. */}
    <p className="money-insights-what">{AGE_WHAT}</p>
    {!ages.length && <p>Not enough records yet: log spending and income for at least {AGE_MIN_HISTORY_DAYS} days.</p>}
    {ages.map(a => <section key={a.currency} className="money-insights-currency" aria-label={`Age of money in ${a.currency}`}>
      <h4>Age of money · {a.currency}</h4>
      {a.status === 'ok' ? <>
        <p>The money you spent in the last 90 days was on average <strong>{days(a.days)}</strong> old. {AGE_MEANING}</p>
        {a.unmatched > 0 && <p className="fine">{money(a.unmatched, a.currency)} of {money(a.spent, a.currency)} spent is not counted: no income logged in the 90 days covers it.</p>}
      </> : <p>Not enough records yet: {a.reason === 'history' ? `this needs at least ${AGE_MIN_HISTORY_DAYS} days of entries in ${a.currency}, and there ${a.historyDays === 1 ? 'is 1 day' : `are ${a.historyDays} days`}.` : a.reason === 'no-income' ? `no income logged in ${a.currency} in the last 90 days.` : `no spending in ${a.currency} that logged income covers in the last 90 days.`}</p>}
    </section>)}
    <p className="money-insights-rule"><strong>How it is counted:</strong> {AGE_RULE}</p>
  </>;
}
