import {describe, expect, test} from 'vitest';
import {parseGoalBundle} from './nl-bundle';
import {GOAL_WIZARD_DRAFT_KEY, bundleAutoRuleInput, bundleCreatedWords, bundleHabitInput, goalWizardDraft, offersBundle} from './nl-bundle-create';
import {suggestedMilestones} from './milestone-suggest';
import {milestoneSetFor, milestonesFromSet} from './milestone-templates';
import {createHabit, emptyHabitData} from '../habits';
import {emptyAutoRules} from '../auto-rules/schema';
import {newAutoRule, setAutoRule} from '../auto-rules/engine';
import {goalExtrasSchema, emptyGoalExtras} from '../goal-extras/store';
import {linkHabitToMilestone, milestoneHabitsOf, pruneMilestoneHabits} from './milestone-templates';

// Session AK (6.1, 6.4 wiring): a confirmed bundle through the existing flows, and the suggested milestones.
const TODAY = '2026-10-31';
describe('Quick add offers a bundle', () => {
  test('an unknown line offers any bundle; a line of several items only one with a goal; nothing → null', () => {
    const offered = (text: string, several = false) => offersBundle(parseGoalBundle(text, TODAY), {several, text});
    expect(offered('save €5,000 for a trip by June and walk 8k steps most days', true)).toBe(true);
    expect(offered('walk 8k steps most days')).toBe(true);
    expect(offered('walk 8k steps most days', true)).toBe(false);
    expect(offered('2 glasses of water and read 20 minutes', true)).toBe(false);
    expect(offered('hello')).toBe(false);
    // Spending stays with Spending (tests/spending-ai.spec.ts), and a bare amount is not a goal.
    expect(offered('2 glasses of water, spent 12 euro on lunch', true)).toBe(false);
    expect(offered('12 euro lunch')).toBe(false);
    expect(offered('I want a 6-month emergency fund of $15k')).toBe(true);
    expect(offered('run a 10K by spring and train 3 times a week', true)).toBe(true);
  });
});
describe('habits and rules from a bundle', () => {
  test('each habit is a valid journal input; steps keep their count; a rule names the new habit', () => {
    const bundle = parseGoalBundle('I want a 6-month emergency fund of $15k and walk 8k steps most days and meditate 10 minutes daily and drink 2 l of water', TODAY)!;
    let data: ReturnType<typeof emptyHabitData> = {...emptyHabitData(), timeZone: 'UTC'};
    bundle.habits.forEach((h, i) => { data = createHabit(data, bundleHabitInput(h, bundle.lifeArea), new Date(`${TODAY}T10:00:00Z`), `0000000${i}-0000-4000-8000-000000000000`); });
    expect(data.habits.map(h => h.title)).toEqual(['Walk 8,000 steps', 'Meditate 10 minutes', 'Drink 2,000 mL of water']);
    expect(data.habits[0]!.rules[0]).toMatchObject({target: 8000, measurement: {kind: 'count', unit: 'steps'}, schedule: {kind: 'frequency', times: 5, period: 'week'}});
    expect(data.habits[1]!.rules[0]).toMatchObject({target: 10, measurement: {kind: 'duration', unit: 'minutes'}});
    expect(data.habits[2]!.rules[0]).toMatchObject({target: 2000, measurement: {kind: 'quantity', unit: 'mL'}});
    const input = bundleAutoRuleInput(bundle.habits[0]!, 'walk-id');
    expect(input).toEqual({source: 'steps', comparator: 'at-least', habitId: 'walk-id', threshold: 8000});
    expect(setAutoRule(emptyAutoRules(), newAutoRule(input!, new Date(), 'r1')).rules[0]).toMatchObject({habitId: 'walk-id', unit: 'steps'});
    expect(bundleAutoRuleInput(bundle.habits[1]!, 'x')).toBeNull();
    // A habit with no measurement is "done once".
    expect(bundleHabitInput({title: 'Gym', schedule: {kind: 'frequency', times: 3, period: 'week'}})).toMatchObject({target: 1, category: 'Habits'});
    expect(bundleAutoRuleInput({title: 'Gym', schedule: {kind: 'daily'}, autoRule: {source: 'workout', comparator: 'recorded'}}, 'g')).toEqual({source: 'workout', comparator: 'recorded', habitId: 'g'});
  });
});
describe('the Goal wizard draft', () => {
  test('a money goal in USD or EUR keeps its amount and a later date; the plan only when ticked', () => {
    const bundle = parseGoalBundle('save €5,000 for a trip by June 2027', TODAY)!;
    expect(GOAL_WIZARD_DRAFT_KEY).toBe('zigoals:draft:goal-wizard:v1');
    const draft = goalWizardDraft(bundle.goal!, TODAY);
    expect(draft).toMatchObject({from: 'words', type: 'VALUE', target: '5000', asset: 'EUR', date: '2027-06-30', milestones: '', category: 'Custom'});
    expect(draft).not.toHaveProperty('planAmount');
    const planned = goalWizardDraft(bundle.goal!, TODAY, bundle.contributionPlan);
    expect(planned).toMatchObject({planAsset: 'EUR', cadence: 'monthly'});
    expect(Number(planned.planAmount)).toBeGreaterThan(0);
  });
  test('another currency leaves the amount to the form; a project keeps its milestones; a past date is dropped', () => {
    expect(goalWizardDraft({name: 'Trip fund', kind: 'value', target: 900, currency: 'GBP', date: '2026-01-01'}, TODAY, {perMonth: 100, months: 9, currency: 'GBP', suggested: true})).toMatchObject({target: '', asset: '', date: ''});
    expect(goalWizardDraft({name: 'Trip fund', kind: 'value', target: 900, currency: 'GBP'}, TODAY, {perMonth: 100, months: 9, currency: 'GBP', suggested: true})).not.toHaveProperty('planAmount');
    const run = parseGoalBundle('run a 10K by spring and train 3 times a week', TODAY)!;
    expect(goalWizardDraft(run.goal!, TODAY)).toMatchObject({type: 'PROJECT', target: '', asset: ''});
    expect(goalWizardDraft(run.goal!, TODAY).milestones.split('\n').length).toBeGreaterThan(1);
  });
  test('the words after a confirm', () => {
    expect(bundleCreatedWords({habits: 2, rules: 1, goal: true})).toBe('2 habits created, with 1 rule to tick it off. The goal form opens with your goal filled in; nothing is saved until you create it.');
    expect(bundleCreatedWords({habits: 1, rules: 0, goal: false})).toBe('1 habit created.');
  });
});
describe('suggested milestones', () => {
  test('a value set takes shares of the goal\'s own target; titles it has are skipped; never above the target', () => {
    const set = milestoneSetFor({name: 'House deposit'})!;
    const goal = {type: 'VALUE' as const, target: '4000000', milestones: [{id: 'a', title: 'keys in hand', done: false}]};
    const out = suggestedMilestones(goal, milestonesFromSet(set, BigInt(goal.target)));
    expect(out.map(m => m.title)).not.toContain('Keys in hand');
    expect(out.find(m => m.title === 'Half of the deposit')).toEqual({title: 'Half of the deposit', target: '2000000'});
    expect(suggestedMilestones(goal, [{title: 'Too much', target: '5000000'}])).toEqual([{title: 'Too much'}]);
    expect(suggestedMilestones({type: 'PROJECT', target: '1', milestones: []}, [{title: 'A', target: '1'}, {title: ' a '}])).toEqual([{title: 'A'}]);
    const full = {type: 'PROJECT' as const, target: '1', milestones: Array.from({length: 100}, (_, i) => ({id: String(i), title: `M${i}`, done: false}))};
    expect(suggestedMilestones(full, [{title: 'One more'}])).toEqual([]);
  });
});
describe('milestone habits, named in the goal extras schema', () => {
  test('kept through a parse; a malformed map is refused; pruned when its milestone or habit is gone', () => {
    const at = '2026-10-31T10:00:00.000Z';
    let x = linkHabitToMilestone(emptyGoalExtras(), 'private:7', 'm1', 'h1', at);
    x = linkHabitToMilestone(x, 'private:7', 'm2', 'h2', at);
    expect(milestoneHabitsOf(goalExtrasSchema.parse(JSON.parse(JSON.stringify(x))), 'private:7')).toEqual({m1: ['h1'], m2: ['h2']});
    expect(goalExtrasSchema.safeParse({...emptyGoalExtras(), goals: {'private:7': {milestoneHabits: {m1: ['h1', 'h1']}}}}).success).toBe(false);
    expect(goalExtrasSchema.safeParse({...emptyGoalExtras(), goals: {'private:7': {milestoneHabits: {m1: []}}}}).success).toBe(false);
    const pruned = pruneMilestoneHabits(x, 'private:7', new Set(['m1']), new Set(['h1', 'h2']), at);
    expect(milestoneHabitsOf(pruned, 'private:7')).toEqual({m1: ['h1']});
    expect(pruneMilestoneHabits(pruned, 'private:7', new Set(['m1']), new Set(['h1']), at)).toBe(pruned);
  });
});
