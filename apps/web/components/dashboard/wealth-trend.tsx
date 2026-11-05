'use client';
import {useMemo} from 'react';
import {wealthHistory} from '../../lib/wealth';
import {trendPath, wealthTrend} from '../../lib/today/wealth-trend';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from '../platform/common';
import type {Platform} from '../../lib/positions';

/**
 * Session AL (GAP-040, P-TK-98): under Today's wealth headline, the last 30 days of the person's own recorded wealth in the
 * headline's currency as a small line, and the change since yesterday in words. Recorded values only (Wealth's history,
 * never converted, never a market chart); with fewer than two known days nothing is drawn. The line is decoration
 * (aria-hidden); the sentence carries the fact.
 */
export function WealthTrend({platform, currency, today}: {platform: Platform; currency: string; today: string}) {
  const trend = useMemo(() => wealthTrend(wealthHistory(platform), currency, today), [platform, currency, today]);
  if (!trend) return null;
  const d = trendPath(trend.points, 120, 28), change = trend.sinceYesterday;
  const money = (v: bigint) => formatGoalAmount(amount((v < 0n ? -v : v).toString(), 2), currency);
  const words = change === null ? 'No reading yesterday to compare' : change === 0n ? 'Unchanged since yesterday' : `${change < 0n ? '−' : '+'}${money(change)} since yesterday`;
  return <div className="today-wealth-trend" data-direction={change === null || change === 0n ? 'flat' : change < 0n ? 'down' : 'up'}>
    {d && <svg viewBox="0 0 120 28" width="120" height="28" aria-hidden="true" focusable="false"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>}
    <small>{words} · your recorded values, last 30 days</small>
  </div>;
}
