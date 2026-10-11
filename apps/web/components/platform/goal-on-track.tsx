'use client';
import {useState} from 'react';
import type {ContributionEvent, PrivateGoal} from '../../lib/positions';
import {formatGoalAmount} from '../../lib/goal-summary';
import {onTrack, PACE_DAYS, whatIfMonths} from '../../lib/goals/on-track';
import {addLocalDays} from '../../lib/local-date';
import {amount} from './common';

/**
 * "On track?" (Session W Part 11): with zero return, what reaching the target by its date would take each week or
 * every 30 days, the pace of what was recorded here over the last 90 days and the date it would reach, and a "what if"
 * with a yearly rate the person types (their assumption, worked out here, never stored or sent).
 */
export function GoalOnTrack({goal, current, available, events, today}: {goal: PrivateGoal; current: bigint; available: boolean; events: readonly ContributionEvent[]; today: string}) {
  const [rate, setRate] = useState(''), [monthly, setMonthly] = useState('');
  if (!available) return <><h2>On track?</h2><p>This needs a counted value for the Goal first. Review its valuation, then come back.</p></>;
  const t = onTrack(goal, current, events, today), money = (units: bigint) => formatGoalAmount(amount(units.toString(), goal.decimals), goal.asset);
  const decimal = (units: bigint) => Number(amount(units.toString(), goal.decimals));
  const rateNumber = rate.trim() ? Number(rate.replace(',', '.')) : NaN, monthlyNumber = monthly.trim() ? Number(monthly.replace(',', '.')) : t.pace && t.pace.perMonth > 0n ? decimal(t.pace.perMonth) : NaN;
  const months = Number.isFinite(rateNumber) && Number.isFinite(monthlyNumber) ? whatIfMonths(decimal(current), decimal(BigInt(goal.target)), monthlyNumber, rateNumber) : null;
  if (t.remaining === 0n) return <><h2>On track?</h2><p>The counted value has reached the target.</p></>;
  return <>
    <h2>On track?</h2>
    <p>Still to go: <strong>{money(t.remaining)}</strong>, from what is counted now.</p>
    {goal.targetDate ? t.daysLeft !== null && t.daysLeft > 0 && t.perWeek !== null && t.perMonth !== null
      ? <p>To reach it by <strong>{goal.targetDate}</strong> with no growth: about <strong>{money(t.perWeek)}</strong> a week, or <strong>{money(t.perMonth)}</strong> every 30 days.</p>
      : <p>The target date ({goal.targetDate}) has passed; the rest is still {money(t.remaining)}.</p>
      : <p>No target date: this Goal goes at your own pace.</p>}
    {t.pace ? <p>Recorded here over the last {t.pace.windowDays} days: <strong>{money(t.pace.perMonth < 0n ? -t.pace.perMonth : t.pace.perMonth)}</strong> {t.pace.perMonth < 0n ? 'more out than in' : 'in'} every 30 days, net of withdrawals{t.pace.skipped ? ` (${t.pace.skipped} in another currency not counted, never converted)` : ''}. {t.projected ? <>At that pace, with no growth, about <strong>{t.projected}</strong>.</> : t.pace.perMonth > 0n ? 'At that pace it would take more than a lifetime.' : ''}</p>
      : <p>No pace yet: contributions recorded here over the last {PACE_DAYS} days show one (a Goal younger than two weeks has none).</p>}
    <details className="goal-what-if"><summary>What if it grew?</summary>
      <p className="fine">Your assumption, worked out on this page only; nothing here is stored or sent, and it is not a forecast.</p>
      <div className="goal-what-if-fields">
        <label className="field">Growth you assume, % a year<input inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="for example 3" /></label>
        <label className="field">Added every month ({goal.asset})<input inputMode="decimal" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder={t.pace && t.pace.perMonth > 0n ? amount(t.pace.perMonth.toString(), goal.decimals) : 'for example 100'} /></label>
      </div>
      {Number.isFinite(rateNumber) && Number.isFinite(monthlyNumber) && <p role="status">{months === null ? 'With these numbers it would take more than 100 years.' : months === 0 ? 'It has already reached the target.' : `With ${rateNumber} % a year (your assumption) and ${monthlyNumber} ${goal.asset} a month: about ${months} ${months === 1 ? 'month' : 'months'}, around ${addLocalDays(today, Math.round(months * 30.44))}.`}</p>}
    </details>
  </>;
}
