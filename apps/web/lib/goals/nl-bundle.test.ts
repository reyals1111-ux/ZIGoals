import {describe, expect, test} from 'vitest';
import {clauses, contributionPlanFor, parseGoalBundle, readAmount, readDate, readFrequency} from './nl-bundle';

// Session AK (6.1): local goal bundles from a sentence; anything unknown is null.
const TODAY = '2026-10-31';

describe('the three example sentences', () => {
  test('a 6-month emergency fund of $15k and 8k steps most days', () => {
    const b = parseGoalBundle('I want a 6-month emergency fund of $15k and walk 8k steps most days', TODAY)!;
    expect(b.goal).toMatchObject({name: 'Emergency fund (6 months)', kind: 'value', target: 15000, currency: 'USD', templateId: 'emergency-fund'});
    expect(b.goal!.milestones).toEqual(['One month of costs', 'Three months of costs', 'Six months of costs']);
    expect(b.goal!.date).toBeUndefined();
    expect(b.habits).toEqual([{title: 'Walk 8,000 steps', schedule: {kind: 'frequency', times: 5, period: 'week'}, measurement: {kind: 'count', unit: 'steps', target: 8000}, autoRule: {source: 'steps', comparator: 'at-least', threshold: 8000}}]);
    expect(b.contributionPlan).toBeUndefined();
    expect(b.lifeArea).toBe('wealth');
  });
  test('save €5,000 for a trip by June: the next June, and a suggested monthly amount', () => {
    const b = parseGoalBundle('save €5,000 for a trip by June', TODAY)!;
    expect(b.goal).toMatchObject({name: 'Trip fund', kind: 'value', target: 5000, currency: 'EUR', date: '2027-06-30', dateText: 'June', templateId: 'holiday-fund'});
    expect(b.contributionPlan).toEqual({perMonth: 625, months: 8, currency: 'EUR', suggested: true});
    expect(b.habits).toEqual([]);
  });
  test('run a 10K by spring and train 3 times a week', () => {
    const b = parseGoalBundle('run a 10K by spring and train 3 times a week', TODAY)!;
    expect(b.goal).toMatchObject({name: 'Run a 10K', kind: 'project', date: '2027-03-20', dateText: 'spring', approximate: true, templateId: 'run-10k'});
    expect(b.goal!.milestones).toEqual(['Run 3 km without stopping', 'Run 5 km', 'Run 8 km', 'Run 10 km']);
    expect(b.habits).toEqual([{title: 'Train', schedule: {kind: 'frequency', times: 3, period: 'week'}, autoRule: {source: 'workout', comparator: 'recorded'}}]);
    expect(b.lifeArea).toBe('health');
    expect(b.contributionPlan).toBeUndefined();
  });
});

describe('more patterns', () => {
  test('other money words, amounts and goals', () => {
    expect(parseGoalBundle('put aside 2.500 euros for a new bike in 10 months', TODAY)!.goal).toMatchObject({name: 'Save for new bike', target: 2500, currency: 'EUR', date: '2027-08-31'});
    expect(parseGoalBundle('save £20k for a house deposit by the end of the year', TODAY)!.goal).toMatchObject({name: 'House deposit', target: 20000, currency: 'GBP', date: '2026-12-31'});
    expect(parseGoalBundle('build an emergency fund', TODAY)!.goal).toMatchObject({name: 'Emergency fund', kind: 'value'});
    expect(parseGoalBundle('build an emergency fund', TODAY)!.goal!.target).toBeUndefined();
    expect(parseGoalBundle('read 12 books this year and read 20 minutes every day', TODAY)).toMatchObject({goal: {name: 'Read 12 books', milestones: ['3 books', '6 books', '9 books', '12 books'], date: '2026-12-31'}, habits: [{title: 'Read 20 minutes', schedule: {kind: 'daily'}, measurement: {kind: 'duration', unit: 'minutes', target: 20}}], lifeArea: 'learning'});
    expect(parseGoalBundle('learn Spanish by summer; meditate 10 min daily; drink 2 l water; sleep 7.5 hours', TODAY)).toMatchObject({goal: {name: 'Learn Spanish', templateId: 'language', date: '2027-06-21'}, habits: [{title: 'Meditate 10 minutes'}, {title: 'Drink 2,000 mL of water', autoRule: {source: 'water', threshold: 2000}}, {title: 'Sleep 7.5 hours', autoRule: {source: 'sleep', threshold: 7.5}}]});
    expect(parseGoalBundle('run a half marathon in 6 months and go to the gym twice a week', TODAY)).toMatchObject({goal: {name: 'Run a half marathon', date: '2027-04-30'}, habits: [{title: 'Gym', schedule: {kind: 'frequency', times: 2}}]});
  });
  test('habits alone make a bundle with no goal', () => {
    expect(parseGoalBundle('walk 10,000 steps every day', TODAY)).toMatchObject({goal: null, habits: [{title: 'Walk 10,000 steps', schedule: {kind: 'daily'}}]});
  });
  test('unknown → null; too long → null', () => {
    expect(parseGoalBundle('be happier', TODAY)).toBeNull();
    expect(parseGoalBundle('', TODAY)).toBeNull();
    expect(parseGoalBundle('train', TODAY)).toBeNull();
    expect(parseGoalBundle(`save €5 ${'x'.repeat(600)}`, TODAY)).toBeNull();
  });
});

describe('pieces', () => {
  test('amounts', () => {
    expect([readAmount('15', 'k'), readAmount('5,000'), readAmount('5.000'), readAmount('7.5'), readAmount('2,5'), readAmount('1,2,3'), readAmount('0')]).toEqual([15000, 5000, 5000, 7.5, 2.5, null, null]);
  });
  test('dates', () => {
    expect(readDate('by March 2028', TODAY)).toEqual({date: '2028-03-31', text: 'March 2028'});
    expect(readDate('by october', TODAY)).toEqual({date: '2026-10-31', text: 'October'});
    expect(readDate('by sep', TODAY)!.date).toBe('2027-09-30');
    expect(readDate('by christmas', TODAY)).toEqual({date: '2026-12-25', text: 'christmas', approximate: true});
    expect(readDate('in 3 weeks', TODAY)!.date).toBe('2026-11-21');
    expect(readDate('in a year', TODAY)!.date).toBe('2027-10-31');
    expect(readDate('by 2027-02-03', TODAY)!.date).toBe('2027-02-03');
    expect(readDate('a 6-month emergency fund', TODAY)).toBeNull();
  });
  test('frequency and clauses', () => {
    expect(readFrequency('on weekdays')).toEqual({kind: 'frequency', times: 5, period: 'week'});
    expect(readFrequency('7 times a week')).toEqual({kind: 'daily'});
    expect(readFrequency('sometimes')).toBeNull();
    expect(clauses('I want to save €5k, then run a 5K and also read')).toEqual(['save €5k', 'run a 5K', 'read']);
  });
  test('the plan needs a value goal with a target and a future date', () => {
    expect(contributionPlanFor({name: 'x', kind: 'value', target: 1000, date: '2026-10-01'}, TODAY)).toBeUndefined();
    expect(contributionPlanFor({name: 'x', kind: 'project', target: 1000, date: '2027-10-01'}, TODAY)).toBeUndefined();
    expect(contributionPlanFor({name: 'x', kind: 'value', target: 1000, date: '2027-10-31'}, TODAY)).toEqual({perMonth: 83.34, months: 12, suggested: true});
  });
});
