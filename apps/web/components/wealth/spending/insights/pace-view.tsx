'use client';
import {useMemo} from 'react';
import {currenciesOf} from '../../../../lib/money-insights/cash-flow';
import {PACE_MIN_MONTHS, ordinal, spendingPace} from '../../../../lib/money-insights/spending-pace';
import type {InsightProps} from './spending-insights';
import {money} from './format';

/**
 * Session AP (feature 5): this month's spending so far beside what earlier months show by the same day, one currency at
 * a time. A comparison of records, never a forecast: nothing is said about the rest of the month.
 */
export default function PaceView({entries, today}: InsightProps) {
  const paces = useMemo(() => currenciesOf(entries, today).map(c => spendingPace(entries, c, today)), [entries, today]);
  if (!paces.length) return <p className="fine">Nothing logged yet.</p>;
  return <>{paces.map(p => <section key={p.currency} className="money-insights-currency" aria-label={`Your usual pace in ${p.currency}`}>
    <h4>Your usual pace · {p.currency}</h4>
    {p.status === 'ok'
      ? <p>By the {ordinal(p.day)} you usually have spent <strong>{money(p.usual, p.currency)}</strong>; this month <strong>{money(p.thisMonth, p.currency)}</strong>{p.difference === 0 ? ', the same.' : `, ${money(Math.abs(p.difference), p.currency)} ${p.difference > 0 ? 'more' : 'less'}.`}</p>
      : <p>Not enough months yet: this needs at least {PACE_MIN_MONTHS} earlier months with spending logged in {p.currency}, and {p.months === 0 ? 'there are none' : p.months === 1 ? 'there is 1' : `there are ${p.months}`}.</p>}
  </section>)}
  <p className="money-insights-rule fine">&ldquo;Usually&rdquo; is the middle figure of what your earlier months (up to 12 back, each with spending logged) show spent from the 1st to the same day. A comparison of your records, not a forecast.</p></>;
}
