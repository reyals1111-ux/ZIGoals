import type {GoalSummary} from '../../../goal-summary';
import {formatGoalAmount} from '../../../goals/goal-amount-text';
import {isFinished} from '../../../goals/finished';
import {formatDate} from '../../../visual-format';
import type {GoalArc} from '../../holo/goals';
import {daysBetween, paceWords, wholePercent} from '../../widgets/words';
import type {FocusGoal} from '../goal-focus';
import {axPlain} from './money-spend';

/**
 * Session AS (ADR-042 Part 2, Goals): the figures of the four answer widgets about goals — the active goals as planets
 * on orbit rings, their target dates on a time axis, the value goals as jars, and one goal as a gauge. Nothing is worked
 * out a second way: the goals are the summaries Today and Goals read (lib/goal-summary.ts), the active ones are the Goals
 * HUD's own arcs (lib/nova/holo/goals.ts), a percent is NOVA's one whole percent (words.ts wholePercent: a lower bound
 * says "At least", an unknown value says "Unavailable" and is never drawn as 0) and the pace is the summary's own funding
 * health in NOVA's words (words.ts paceWords). A target date is the person's own date, not a forecast; where a forecast
 * is said it is an estimate and is labelled so (lib/nova/cards/goal-focus.ts estimateWords).
 */
export const ORBIT_GOALS = 7;
export type Planet = {key: string; name: string; /** 0–100; null: the progress is unknown. */ pct: number | null; /** "45%", "At least 42%", "Unavailable". */ text: string; pace: string; /** Its ring, the innermost first. */ ring: number};
export type GoalOrbits = {planets: Planet[]; more: number; active: number; /** The goal furthest along, of those with a known progress. */ lead: Planet | null};
export function goalOrbits(arcs: readonly GoalArc[], active = arcs.length): GoalOrbits {
  const planets = arcs.slice(0, ORBIT_GOALS).map((a, ring) => ({key: a.key, name: axPlain(a.name), pct: a.pct, text: a.text, pace: a.pace.words, ring}));
  const lead = planets.reduce<Planet | null>((best, p) => p.pct !== null && (!best || p.pct > best.pct!) ? p : best, null);
  return {planets, more: Math.max(0, active - planets.length), active, lead};
}

export type GoalDate = {key: string; n: number; name: string; date: string; /** "Apr 16, 2027". */ dateWords: string; days: number; /** "in 150 days", "today", "34 days past its date". */ when: string; past: boolean; /** The goal's progress in words. */ text: string; /** 0 (today) to 1 (the last date shown); a date that has passed stands at today's edge. */ at: number};
export type GoalDates = {marks: GoalDate[]; more: number; /** Active goals with a target date, and active goals without one. */ dated: number; undated: number; spanDays: number; next: GoalDate | null; past: number};
const whenWords = (days: number): string => days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : `${-days} ${days === -1 ? 'day' : 'days'} past its date`;
export function goalDates(goals: readonly GoalSummary[], today: string, shown = 6): GoalDates {
  const active = goals.filter(g => g.status === 'active'), dated = active.filter(g => !!g.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(g.targetDate)).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!) || a.name.localeCompare(b.name));
  const top = dated.slice(0, shown), spanDays = Math.max(1, ...top.map(g => daysBetween(today, g.targetDate!)));
  const marks = top.map((g, i) => {
    const days = daysBetween(today, g.targetDate!);
    return {key: g.key, n: i + 1, name: axPlain(g.name), date: g.targetDate!, dateWords: formatDate(g.targetDate!), days, when: whenWords(days), past: days < 0, text: wholePercent(g.progressPct, g.progressBound, isFinished(g)), at: Math.max(0, Math.min(1, days / spanDays))};
  });
  return {marks, more: dated.length - top.length, dated: dated.length, undated: active.length - dated.length, spanDays, next: marks.find(m => !m.past) ?? null, past: dated.filter(g => g.targetDate! < today).length};
}

export const JAR_GOALS = 6;
/** A value goal: one that saves an amount toward a target (a private Value goal, or a goal of the earlier goal manager). */
export const isValueGoal = (g: Pick<GoalSummary, 'type' | 'key' | 'target'>): boolean => !!g.target && (g.type === 'Value Goal' || g.key.startsWith('legacy:'));
export type Jar = {key: string; name: string; /** How full, 0–1; null: the value is unknown (an unlit jar, never an empty one). */ level: number | null; /** "45%", "At least 45%", "Unavailable". */ text: string; /** "$9,000.00 of $20,000.00". */ saved: string; pace: string};
export type SavingsJars = {jars: Jar[]; more: number; count: number; /** The fullest jar with a known level. */ lead: Jar | null};
export function savingsJars(goals: readonly GoalSummary[]): SavingsJars {
  const value = goals.filter(g => g.status === 'active' && isValueGoal(g));
  const jars = value.slice(0, JAR_GOALS).map(g => {
    const known = g.progressBound !== 'unavailable' && /^\d+(\.\d+)?$/.test(g.progressPct), current = g.progressBound === 'unavailable' && !g.heldAsset ? 'Value unavailable' : `${g.progressBound === 'at-least' ? 'At least ' : ''}${formatGoalAmount(g.current, g.heldAsset ?? g.currency)}`;
    return {key: g.key, name: axPlain(g.name), level: known ? Math.max(0, Math.min(1, Number(g.progressPct) / 100)) : null, text: wholePercent(g.progressPct, g.progressBound, isFinished(g)), saved: `${current} of ${formatGoalAmount(g.target!, g.currency)}`, pace: paceWords(g.fundingHealth).words};
  });
  return {jars, more: value.length - jars.length, count: value.length, lead: jars.reduce<Jar | null>((best, j) => j.level !== null && (!best || j.level > best.level!) ? j : best, null)};
}

/** One goal as a gauge: what the head, the arc and the table say, from the goal page's own figures (lib/nova/cards/goal-focus.ts). */
export type GoalGauge = {name: string; figure: string; /** 0–1; null: unknown. */ share: number | null; atLeast: boolean; label: string; note: string; tone: 'good' | 'calm' | 'attention' | 'unknown'; rows: (readonly [string, string])[]};
export function goalGauge(goal: FocusGoal, estimate: {headline: string; detail: string; estimate: boolean} | null): GoalGauge {
  const name = axPlain(goal.name);
  return {
    name, figure: goal.figure, share: goal.pct === null ? null : Math.max(0, Math.min(1, goal.pct / 100)), atLeast: goal.atLeast, tone: goal.pace.tone,
    label: `${goal.pct === null ? 'progress unknown' : goal.atLeast ? 'at least, reached' : 'reached'} · ${name}`, note: [goal.saved, goal.pace.words].filter(Boolean).join(' · '),
    rows: [
      ['Reached', goal.text], ...(goal.saved ? [['So far, of the target', goal.saved] as const] : []), ['Plan', goal.pace.words],
      ...(goal.left ? [['Left to go', goal.left] as const] : []), ...(goal.targetDate ? [['Target date', formatDate(goal.targetDate)] as const] : []),
      ...(estimate ? [['Pace', `${estimate.headline}${estimate.estimate ? ' (an estimate: a projection, not a promise)' : ''}. ${estimate.detail}`] as const] : []),
    ],
  };
}
