'use client';
import {habitsOnDay} from '../../lib/numbers/counts';
import {waterSummary} from '../../lib/health-daily';
import {wealthOverview} from '../../lib/wealth';
import {splitWealthTotals} from '../../lib/wealth-total';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from '../platform/common';
import {formatNumber} from '../../lib/visual-format';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';

/**
 * Session AH (CO1): one line that joins the day across the app ("3 of 5 habits · 1.6 L water · tracked wealth $12,400"),
 * from the same counts each page shows (lib/numbers/counts.ts, the Health water summary, Wealth's own total). A part
 * whose page is hidden, or that has nothing yet, is left out; with nothing at all the line is not shown.
 */
export function TodayLine({habits, health, platform, quotes, now, today, healthDate, showHabits, showHealth, financial}: {habits?: HabitData; health?: HealthData; platform?: Platform; quotes: readonly MarketQuote[]; now: number; today: string; healthDate: string; showHabits: boolean; showHealth: boolean; financial: boolean}) {
  const parts: string[] = [];
  if (showHabits && habits) { const {due, done} = habitsOnDay(habits.habits, today, today); if (due) parts.push(`${done} of ${due} habits`); }
  if (showHealth && health) { try { const ml = waterSummary(health, healthDate).millilitres; if (ml > 0) parts.push(`${formatNumber(ml / 1000, {maximumFractionDigits: 1})} L water`); } catch { /* an unreadable day leaves the part out */ } }
  if (financial && platform) {
    const primary = splitWealthTotals(wealthOverview(platform, now, quotes).subtotals).primary;
    if (primary && primary.value > 0n) parts.push(`tracked wealth ${formatGoalAmount(amount(primary.value.toString(), 2), primary.currency)}`);
  }
  if (!parts.length) return null;
  return <p className="today-line" data-today-line><span className="today-line-label">Today</span> {parts.join(' · ')}</p>;
}
