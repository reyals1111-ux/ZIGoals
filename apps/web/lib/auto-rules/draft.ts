import {formNumberText, readFormNumber} from '../decimal-input';
import {newAutoRule} from './engine';
import {SOURCE_UNIT, autoRuleIssue, type AutoComparator, type AutoRule, type AutoSource} from './schema';

/** Session AK (5.6): the rule editor's form as typed, and the rule it makes (or the field's own message). */
export type AutoRuleDraft = {source: AutoSource; comparator: AutoComparator; threshold: string; habitId: string; goalId: string; workoutType: '' | NonNullable<AutoRule['workoutType']>};
export const emptyAutoRuleDraft = (habitId = ''): AutoRuleDraft => ({source: 'steps', comparator: 'at-least', threshold: '8000', habitId, goalId: '', workoutType: ''});
/** The unit beside the number field, in words. */
export const THRESHOLD_LABEL: Record<AutoSource, string> = {steps: 'steps', sleep: 'hours asleep', water: 'mL', 'active-minutes': 'active minutes', workout: 'minutes of workouts', contribution: 'in the goal’s unit'};
/** A sensible starting number when the source changes (the person changes it). */
export const DEFAULT_THRESHOLD: Record<AutoSource, string> = {steps: '8000', sleep: '7', water: '2000', 'active-minutes': '30', workout: '30', contribution: ''};
/** "Recorded" is the natural rule for a workout or a contribution; "at least" for the rest. */
export const DEFAULT_COMPARATOR: Record<AutoSource, AutoComparator> = {steps: 'at-least', sleep: 'at-least', water: 'at-least', 'active-minutes': 'at-least', workout: 'recorded', contribution: 'recorded'};
export function draftForSource(draft: AutoRuleDraft, source: AutoSource): AutoRuleDraft {
  return {...draft, source, comparator: DEFAULT_COMPARATOR[source], threshold: DEFAULT_THRESHOLD[source], goalId: source === 'contribution' ? draft.goalId : '', workoutType: source === 'workout' ? draft.workoutType : ''};
}
export function draftOfRule(rule: AutoRule): AutoRuleDraft {
  return {source: rule.source, comparator: rule.comparator, threshold: rule.threshold === undefined ? '' : formNumberText(rule.threshold), habitId: rule.habitId, goalId: rule.goalId ?? '', workoutType: rule.workoutType ?? ''};
}
/** The rule a draft describes; throws the message the form shows. `base` keeps an edited rule's id and start. */
export function ruleFromDraft(draft: AutoRuleDraft, now = new Date(), base?: Pick<AutoRule, 'id' | 'createdAt'>): AutoRule {
  if (!draft.habitId) throw Error('Choose the habit this rule ticks off.');
  if (draft.source === 'contribution' && !draft.goalId) throw Error('Choose the goal to watch.');
  let threshold: number | undefined;
  if (draft.comparator === 'at-least') {
    const max = draft.source === 'sleep' ? 24 : draft.source === 'workout' || draft.source === 'active-minutes' ? 1440 : 1_000_000_000;
    try { threshold = readFormNumber(draft.threshold, {min: 0, max, positive: true, whole: draft.source === 'steps'}); } catch (cause) { throw draft.source === 'sleep' ? Error('Enter the hours of sleep, for example 7.5.') : cause; }
  }
  const input = {source: draft.source, comparator: draft.comparator, habitId: draft.habitId, ...(threshold === undefined ? {} : {threshold}), ...(draft.source === 'contribution' ? {goalId: draft.goalId} : {}), ...(draft.source === 'workout' && draft.workoutType ? {workoutType: draft.workoutType} : {})};
  const issue = autoRuleIssue({...input, unit: SOURCE_UNIT[draft.source]});
  if (issue) throw Error(issue);
  const rule = newAutoRule(input, now, base?.id);
  return base ? {...rule, createdAt: base.createdAt} : rule;
}
