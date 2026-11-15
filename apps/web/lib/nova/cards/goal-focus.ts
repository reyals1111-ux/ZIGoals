import {forecastWords, type Forecast} from '../../goal-forecast';
import type {GoalSummary} from '../../goal-summary';
import {formatGoalAmount} from '../../goals/goal-amount-text';
import {isFinished} from '../../goals/finished';
import {formatDate, formatProgressPercent} from '../../visual-format';
import type {GoalArc} from '../holo/goals';
import {paceWords, wholePercent} from '../widgets/words';

/**
 * Session AM (ADR-038; art direction §4, Goals: "one goal's pace line with its estimate — an estimate, not a promise"):
 * the figures of NOVA's "Goal" widget, one goal at a time. Nothing is worked out a second way:
 * - which goal: the one the request named (`ref`: its id or its key), else the lead goal as NOVA's Goals HUD picks it
 *   (the goal its pace line is about, else the first active arc);
 * - how far: the summary Today and Goals read (lib/goal-summary.ts) in NOVA's one percent style (words.ts wholePercent);
 * - whether the plan keeps pace: the summary's own funding health in NOVA's words (words.ts paceWords);
 * - saved, target and what is left: as the goal's own card writes them (a lower bound says "At least", an unknown value
 *   says so and is never a number);
 * - the estimate: the forecast's own words (lib/goal-forecast.ts forecastWords), always read as an estimate.
 */
export type FocusGoal = {
  key: string; name: string; href: string; status: 'active' | 'completed' | 'closed';
  /** The arc's share in percent (0–100); null when the progress is unknown. */
  pct: number | null;
  /** The progress in words: "42%", "At least 42%", "Unavailable". */
  text: string;
  /** The figure inside the ring: the percent alone, or "—" when unknown. */
  figure: string;
  atLeast: boolean;
  pace: ReturnType<typeof paceWords>;
  /** "$2,500.00 of $6,000.00"; null for a goal that counts no amount (an average goal). */
  saved: string | null;
  /** What is still to go; null when unknown, not counted, or the goal is reached. */
  left: string | null;
  targetDate: string | null;
  /** The plan in one line, "Plan: $6,000.00 by Apr 1, 2027"; null without a saved target and a target date. */
  plan: string | null;
};

function fromSummary(g: GoalSummary): FocusGoal {
  const finished = isFinished(g), known = g.progressBound !== 'unavailable' && /^\d+(\.\d+)?$/.test(g.progressPct), atLeast = g.progressBound === 'at-least';
  const current = g.progressBound === 'unavailable' && !g.heldAsset ? 'Value unavailable' : `${atLeast ? 'At least ' : ''}${formatGoalAmount(g.current, g.heldAsset ?? g.currency)}`;
  return {
    key: g.key, name: g.name, href: g.href, status: g.status,
    pct: known ? Math.min(100, Number(g.progressPct)) : null,
    text: wholePercent(g.progressPct, g.progressBound, finished),
    figure: known ? formatProgressPercent(g.progressPct, finished) : '—', atLeast: known && atLeast,
    pace: g.status === 'active' ? paceWords(g.fundingHealth) : finished ? {words: 'Reached', tone: 'good'} : {words: 'Closed', tone: 'calm'},
    saved: g.target ? `${current} of ${formatGoalAmount(g.target, g.currency)}` : `${current} · no target saved`,
    left: finished || !g.remaining || g.progressBound === 'unavailable' ? null : `${atLeast ? 'At most ' : ''}${formatGoalAmount(g.remaining, g.currency)}`,
    targetDate: g.targetDate ?? null,
    plan: g.target && g.targetDate && !finished ? `Plan: ${formatGoalAmount(g.target, g.currency)} by ${formatDate(g.targetDate)}` : null,
  };
}
const fromArc = (a: GoalArc): FocusGoal => ({key: a.key, name: a.name, href: a.href, status: 'active', pct: a.pct, text: a.text, figure: a.pct === null ? '—' : a.text, atLeast: false, pace: a.pace, saved: null, left: null, targetDate: null, plan: null});

/**
 * The goal the widget shows. `goals` are the summaries (every status), `arcs` the Goals HUD's active arcs in its order,
 * `leadHref` the page of the goal the HUD's pace line is about (null: it has none). A `ref` that matches nothing (a goal
 * removed since the request) falls back to the lead goal; null when there is no active goal at all.
 */
export function focusGoal(goals: readonly GoalSummary[], arcs: readonly GoalArc[], ref: string | undefined, leadHref: string | null): FocusGoal | null {
  if (ref) {
    const named = goals.find(g => g.key === ref) ?? goals.find(g => g.key === `private:${ref}`) ?? goals.find(g => g.id === ref);
    if (named) return fromSummary(named);
    const arc = arcs.find(a => a.key === ref);
    if (arc) return fromArc(arc);
  }
  const lead = (leadHref ? goals.find(g => g.status === 'active' && g.href === leadHref) : undefined) ?? goals.find(g => g.key === arcs[0]?.key);
  return lead ? fromSummary(lead) : arcs[0] ? fromArc(arcs[0]) : null;
}

/**
 * The forecast in the goal page's own words; `estimate` marks a projection (shown as an estimate, never a promise).
 *
 * Session AM (design review AM-D31): with the goal given, the line under its plan verdict never cancels that verdict.
 * "Behind plan" is said from the plan (the target and its date); "Not enough history yet" is about the pace forecast,
 * and the two read as one denying the other. While the history is too short for a forecast, the line is the plan itself
 * ("Plan: $6,000.00 by Apr 1, 2027") and the detail says what a forecast still needs; a goal with no plan to state has
 * no line there at all.
 */
export function estimateWords(forecast: Forecast | null | undefined, goal?: Pick<FocusGoal, 'plan'>): {headline: string; detail: string; estimate: boolean} | null {
  if (!forecast) return null;
  const words = forecastWords(forecast, day => formatDate(day));
  if (goal && forecast.state === 'not-enough') return goal.plan ? {headline: goal.plan, detail: `No pace forecast yet. ${words.detail}`, estimate: false} : null;
  return {...words, estimate: forecast.state === 'estimate'};
}
