'use client';
import {useId, useState} from 'react';
import {contributionPlanFor, type BundleGoal, type BundleHabit, type ContributionPlan, type GoalBundle} from './nl-bundle';
import {ruleSentence} from '../auto-rules/engine';
import {readFormNumber} from '../decimal-input';
import {formatDate, formatMoney, formatNumber, isMoneyCurrency} from '../visual-format';
import {plainErrorMessage} from '../plain-error';
import './nl-bundle-review.css';

/**
 * Session AK (6.1): the review card of a parsed goal bundle. Every part has its own check box; a money amount is a
 * pre-fill the person can change, and the suggested monthly plan starts unticked (non-custodial: nothing moves, and a
 * plan is only kept when the person ticks it). Confirm hands only the ticked parts to `onConfirm`; the caller creates
 * them through the existing stores (Goal wizard, habits store, auto-rules). Lives under lib/goals because of this
 * session's write scope; the lead may move it to components/goals/ (no other change needed but its import paths).
 */
export type ConfirmedBundle = {goal?: BundleGoal; habits: BundleHabit[]; contributionPlan?: ContributionPlan};
const money = (n: number, currency?: string) => currency && isMoneyCurrency(currency) ? formatMoney(String(n), currency) : `${formatNumber(n, {maximumFractionDigits: 2})}${currency ? ` ${currency}` : ''}`;
function scheduleWords(s: BundleHabit['schedule']) { return s.kind === 'daily' ? 'every day' : `${s.times} ${s.times === 1 ? 'time' : 'times'} a week`; }
export function GoalBundleReview({bundle, today, onConfirm, onDismiss}: {bundle: GoalBundle; today: string; onConfirm: (parts: ConfirmedBundle) => void | Promise<void>; onDismiss: () => void}) {
  const id = useId();
  const [goalOn, setGoalOn] = useState(!!bundle.goal), [habitsOn, setHabitsOn] = useState(() => bundle.habits.map(() => true)), [planOn, setPlanOn] = useState(false);
  const [target, setTarget] = useState(bundle.goal?.target === undefined ? '' : String(bundle.goal.target));
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const goal = bundle.goal;
  let typed: number | undefined, targetIssue = '';
  if (goal?.kind === 'value' && target.trim()) { try { typed = readFormNumber(target, {max: 1_000_000_000, positive: true}); } catch (cause) { targetIssue = plainErrorMessage(cause, 'Check the amount.'); } }
  const confirmedGoal: BundleGoal | undefined = goal && goalOn ? {...goal, ...(goal.kind === 'value' ? {target: typed} : {})} : undefined;
  if (confirmedGoal && confirmedGoal.target === undefined) delete confirmedGoal.target;
  const plan = confirmedGoal ? contributionPlanFor(confirmedGoal, today) : undefined;
  const count = (goalOn && goal ? 1 : 0) + habitsOn.filter(Boolean).length + (planOn && plan ? 1 : 0);
  async function confirm() {
    if (targetIssue) { setError(targetIssue); return; }
    setBusy(true); setError('');
    try { await onConfirm({...(confirmedGoal ? {goal: confirmedGoal} : {}), habits: bundle.habits.filter((_, i) => habitsOn[i]), ...(planOn && plan ? {contributionPlan: plan} : {})}); }
    catch (cause) { setError(plainErrorMessage(cause, 'Nothing was created.')); } finally { setBusy(false); }
  }
  return <section className="nl-bundle" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">Your plan, from your words</p>
    <h3 id={`${id}-title`}>Check each part</h3>
    <p className="fine">Nothing is created until you confirm. Untick anything you do not want.</p>
    <ul className="nl-bundle-parts">
      {goal && <li><label className="nl-bundle-check"><input type="checkbox" checked={goalOn} onChange={e => setGoalOn(e.target.checked)}/><span><strong>Goal: {goal.name}</strong>
        {goal.date && <span className="nl-bundle-detail"> · by {goal.approximate ? 'about ' : ''}{formatDate(goal.date)}{goal.approximate && goal.dateText ? ` (${goal.dateText})` : ''}</span>}
        {goal.milestones?.length ? <span className="nl-bundle-detail"> · milestones: {goal.milestones.join(', ')}</span> : null}</span></label>
        {goal.kind === 'value' && goalOn && <label className="nl-bundle-amount">Target{goal.currency ? ` (${goal.currency})` : ''}<input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} aria-invalid={!!targetIssue || undefined} aria-describedby={`${id}-amount`}/><span id={`${id}-amount`} className="fine">{targetIssue || (target ? 'Your own amount; change it if it is not right.' : 'No amount yet: the goal form will ask.')}</span></label>}
      </li>}
      {bundle.habits.map((h, i) => <li key={h.title}><label className="nl-bundle-check"><input type="checkbox" checked={habitsOn[i]} onChange={e => setHabitsOn(on => on.map((v, j) => j === i ? e.target.checked : v))}/><span><strong>Habit: {h.title}</strong><span className="nl-bundle-detail"> · {scheduleWords(h.schedule)}</span>
        {h.autoRule && <span className="nl-bundle-detail"> · {ruleSentence({source: h.autoRule.source, comparator: h.autoRule.comparator, threshold: h.autoRule.threshold}, h.title)}</span>}</span></label></li>)}
      {plan && <li><label className="nl-bundle-check"><input type="checkbox" checked={planOn} onChange={e => setPlanOn(e.target.checked)}/><span><strong>Suggested: {money(plan.perMonth, plan.currency)} a month for {plan.months} {plan.months === 1 ? 'month' : 'months'}</strong><span className="nl-bundle-detail"> · a plan to remind you; no money moves, and you confirm every contribution.</span></span></label></li>}
    </ul>
    <div className="actions"><button type="button" className="primary" disabled={busy || count === 0} onClick={() => void confirm()}>{busy ? 'Creating…' : count === 0 ? 'Nothing ticked' : `Create ${count} ${count === 1 ? 'part' : 'parts'}`}</button><button type="button" className="quiet" disabled={busy} onClick={onDismiss}>Not now</button></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default GoalBundleReview;
