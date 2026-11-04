'use client';
import {habitsOnDay} from '../../lib/numbers/counts';
import {dailyData, waterSummary} from '../../lib/health-daily';
import {waterText} from '../../lib/health-units';
import {wealthHistory, wealthOverview} from '../../lib/wealth';
import {weekWealthNet} from '../../lib/today/week-wealth';
import {splitWealthTotals} from '../../lib/wealth-total';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from '../platform/common';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';

/**
 * Session AH (CO1): one line that joins the day across the app ("3 of 5 habits · 1.6 L water · tracked wealth $12,400"),
 * from the same counts each page shows (lib/numbers/counts.ts, the Health water summary, Wealth's own total). A part
 * whose page is hidden, or that has nothing yet, is left out; with nothing at all the line is not shown. Session AK F0 (M42):
 * tracked wealth carries its change over the last seven days when Wealth's history knows it ("+$120 this week").
 */
export function TodayLine({habits, health, platform, quotes, now, today, healthDate, showHabits, showHealth, financial}: {habits?: HabitData; health?: HealthData; platform?: Platform; quotes: readonly MarketQuote[]; now: number; today: string; healthDate: string; showHabits: boolean; showHealth: boolean; financial: boolean}) {
  const parts: string[] = [];
  if (showHabits && habits) { const {due, done} = habitsOnDay(habits.habits, today, today); if (due) parts.push(`${done} of ${due} habits`); }
  if (showHealth && health) { try { const ml = waterSummary(health, healthDate).millilitres; if (ml > 0) parts.push(`${waterText(ml, dailyData(health).preferences.waterUnit)} water`); /* Session AL (P-NB-71; N-NB-06): the unit the water card and Health show, not "0.3 L" beside "250 mL" */ } catch { /* an unreadable day leaves the part out */ } }
  if (financial && platform) {
    const primary = splitWealthTotals(wealthOverview(platform, now, quotes).subtotals).primary;
    if (primary && primary.value > 0n) {
      // Session AK F0 (M42): "this week" from Wealth's own recorded history in the same currency; unknown leaves it out.
      const week = weekWealthNet(wealthHistory(platform), primary.currency, today), size = week ? (week.change < 0n ? -week.change : week.change) : 0n;
      const weekly = !week ? '' : week.change === 0n ? ' (unchanged this week)' : ` (${week.change < 0n ? '−' : '+'}${formatGoalAmount(amount(size.toString(), 2), primary.currency)} this week)`;
      parts.push(`tracked wealth ${formatGoalAmount(amount(primary.value.toString(), 2), primary.currency)}${weekly}`);
    }
  }
  if (!parts.length) return null;
  return <p className="today-line" data-today-line><span className="today-line-label">Today</span> {parts.join(' · ')}</p>;
}
