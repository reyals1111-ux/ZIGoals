import type {HabitInput} from '../habits';
import type {AutoRuleInput} from '../auto-rules/engine';
import type {BuiltInArea} from '../goal-extras/store';
import type {BundleGoal, BundleHabit, ContributionPlan, GoalBundle} from './nl-bundle';

/**
 * Session AK (6.1, wiring): what a confirmed goal bundle becomes through the app's existing flows, pure. Habits become
 * ordinary `createHabit` inputs; an auto-complete rule becomes an `AutoRuleInput` for `setAutoRule`; the goal becomes the
 * Goal wizard's own draft (`zigoals:draft:goal-wizard:v1`, sessionStorage), so the person checks every field in the
 * wizard and nothing is saved before they create the Goal. A contribution plan is pre-filled only when the person ticked
 * it in the review, and only in a currency the wizard's value goals know (USD, EUR); nothing ever moves money.
 */
export const GOAL_WIZARD_DRAFT_KEY = 'zigoals:draft:goal-wizard:v1';
const WIZARD_CURRENCIES: ReadonlySet<string> = new Set(['USD', 'EUR']);

/**
 * Whether Quick add offers the bundle review for a line: a line its own reader did not understand offers any bundle; a
 * line of several items (normally logged one by one) only one with a goal, so "2 glasses of water and read 20 minutes"
 * keeps logging as before. A money goal needs the words of a goal (save, a fund, a deposit, a debt, "I want", a date or a
 * known kind), and a line that says money was spent ("spent 12 euro on lunch") is never a goal: it stays with Spending.
 */
const SPENT = /\b(?:spent|spend|paid|pay for|bought|cost|costs)\b/i;
const GOAL_WORDS = /\b(?:save|saving|savings|put aside|set aside|fund|deposit|pay off|debt|nest egg|goal|i want|i(?:'|’)d like|by)\b/i;
export function offersBundle(bundle: GoalBundle | null, {several, text}: {several: boolean; text: string}): bundle is GoalBundle {
  if (!bundle) return false;
  const goal = bundle.goal;
  if (goal && goal.kind === 'value' && (SPENT.test(text) || !(goal.templateId || goal.date || GOAL_WORDS.test(text)))) return false;
  return goal !== null || (!several && bundle.habits.length > 0);
}

const AREA_CATEGORY: Partial<Record<BuiltInArea, string>> = {health: 'Health', mind: 'Mind', learning: 'Learning', wealth: 'Money', career: 'Career', relationships: 'Relationships', fun: 'Fun'};
/** A bundle habit as the journal's own input: a count, minutes or a quantity where the words named one, else "done once". */
export function bundleHabitInput(habit: BundleHabit, area?: BuiltInArea): HabitInput {
  const base = {title: habit.title.slice(0, 100), category: (area && AREA_CATEGORY[area]) ?? 'Habits', description: '', notes: '', schedule: habit.schedule};
  const m = habit.measurement;
  if (!m) return {...base, target: 1};
  if (m.kind === 'duration') return {...base, measurement: {kind: 'duration', unit: 'minutes'}, target: m.target};
  if (m.kind === 'quantity') return {...base, measurement: {kind: 'quantity', unit: m.unit.slice(0, 24)}, target: m.target};
  return {...base, measurement: {kind: 'count', unit: m.unit.slice(0, 24) || 'times'}, target: Math.max(1, Math.round(m.target))};
}
/** The rule a bundle habit offers, for the habit just created. */
export function bundleAutoRuleInput(habit: BundleHabit, habitId: string): AutoRuleInput | null {
  const rule = habit.autoRule;
  if (!rule) return null;
  return {source: rule.source, comparator: rule.comparator, habitId, ...(rule.comparator === 'at-least' && rule.threshold !== undefined ? {threshold: rule.threshold} : {})};
}

/** The Goal wizard's draft fields (all strings, as the wizard keeps them), with `from: 'words'` so it says where they came from. */
export type GoalWizardDraft = {from: 'words'; name: string; type: 'VALUE' | 'PROJECT'; target: string; date: string; notes: string; milestones: string; category: 'Custom'; asset: string; planAmount?: string; planAsset?: string; cadence?: 'monthly'};
const plainAmount = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
/**
 * The draft for a confirmed goal. A money target is kept only in a currency the wizard offers (another currency would be
 * read as the wrong one; the wizard then asks for the amount); a date only when it is after today (the wizard's minimum).
 */
export function goalWizardDraft(goal: BundleGoal, today: string, plan?: ContributionPlan): GoalWizardDraft {
  const value = goal.kind === 'value', known = value && !!goal.currency && WIZARD_CURRENCIES.has(goal.currency);
  const draft: GoalWizardDraft = {
    from: 'words', name: goal.name.slice(0, 100), type: value ? 'VALUE' : 'PROJECT',
    target: known && goal.target !== undefined ? plainAmount(goal.target) : '',
    date: goal.date && goal.date > today ? goal.date : '', notes: '',
    milestones: value ? '' : (goal.milestones ?? []).map(m => m.trim()).filter(Boolean).slice(0, 100).join('\n'),
    category: 'Custom', asset: known ? goal.currency! : '',
  };
  if (plan && known && plan.perMonth > 0 && (!plan.currency || plan.currency === goal.currency)) Object.assign(draft, {planAmount: plainAmount(plan.perMonth), planAsset: goal.currency!, cadence: 'monthly' as const});
  return draft;
}
/** What Quick add says after a confirm. */
export function bundleCreatedWords({habits, rules, goal}: {habits: number; rules: number; goal: boolean}): string {
  const parts = [habits ? `${habits} ${habits === 1 ? 'habit' : 'habits'} created` : '', rules ? `${rules} ${rules === 1 ? 'rule' : 'rules'} to tick ${rules === 1 ? 'it' : 'them'} off` : ''].filter(Boolean);
  const made = parts.length ? `${parts.join(', with ')}.` : '';
  return [made, goal ? 'The goal form opens with your goal filled in; nothing is saved until you create it.' : ''].filter(Boolean).join(' ');
}
