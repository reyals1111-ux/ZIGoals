import {describe, expect, it} from 'vitest';
import type {GoalSummary} from '../goal-summary';
import {attentionFirst, nextStep, todayGoalRoles} from './goal-roles';

// Session AF (L5a, Part 10.10): Today's three goal places each say something different.
const TODAY = '2026-10-16';
const summary = (id: string, over: Partial<GoalSummary> = {}): GoalSummary => ({key: `private:${id}`, id, href: `/app/goals/tracked/${id}`, name: `Goal ${id}`, type: 'Value Goal', source: 'Existing wealth', status: 'active', scene: 'home', current: '10', target: '100', currency: 'USD', progressPct: '10', fundingHealth: 'ON TRACK', requiresReview: false, metadata: [], nextContributionDate: '2026-11-01', ...over});
type Rec = Parameters<typeof todayGoalRoles>[1][number];
const plan = {amount: '12500', decimals: 2, asset: 'USD', cadence: 'monthly' as const, nextDate: '2026-11-01', active: true};
const record = (id: string, over: Partial<Rec> = {}): Rec => ({id, name: `Goal ${id}`, type: 'VALUE', status: 'active', milestones: [], plan, ...over});

describe('the next step of the top goal', () => {
  it('is what needs doing first: review, an overdue contribution, a milestone, the next contribution, a close target, a plan', () => {
    expect(nextStep(summary('1', {requiresReview: true}), record('1'), TODAY)).toEqual({kind: 'review'});
    expect(nextStep(summary('1', {fundingHealth: 'REVIEW'}), record('1'), TODAY)).toEqual({kind: 'review'});
    expect(nextStep(summary('1', {nextContributionDate: '2026-10-10'}), record('1'), TODAY)).toEqual({kind: 'overdue', date: '2026-10-10', amount: {value: '12500', decimals: 2, asset: 'USD'}});
    expect(nextStep(summary('1'), record('1', {milestones: [{id: '1', title: 'Open the account', done: true}, {id: '2', title: 'First 1,000', done: false}]}), TODAY)).toEqual({kind: 'milestone', title: 'First 1,000'});
    expect(nextStep(summary('1'), record('1'), TODAY)).toEqual({kind: 'contribution', date: '2026-11-01', amount: {value: '12500', decimals: 2, asset: 'USD'}});
    expect(nextStep(summary('1', {nextContributionDate: null, targetDate: '2026-10-26'}), record('1', {plan: undefined}), TODAY)).toEqual({kind: 'target', date: '2026-10-26', days: 10});
    expect(nextStep(summary('1', {nextContributionDate: null}), record('1', {plan: undefined}), TODAY)).toEqual({kind: 'plan'});
    expect(nextStep(summary('1', {key: 'legacy:7', nextContributionDate: undefined}), undefined, TODAY)).toEqual({kind: 'open'});
  });
});

describe('the three roles', () => {
  it('with several goals, "What matters today" is the most urgent other goal, never the focus goal', () => {
    const active = [summary('1'), summary('2'), summary('3', {nextContributionDate: '2026-10-12'}), summary('4', {fundingHealth: 'BEHIND'})];
    const roles = todayGoalRoles(active, [record('1'), record('2'), record('3'), record('4')], TODAY);
    expect(roles.focus?.goal.id).toBe('1');
    expect(roles.attention).toEqual({id: '3', why: 'overdue'});
    expect(roles.cards).toBe(active);
  });
  it('reasons add up: behind with a contribution in two days beats behind alone; ties keep the page order', () => {
    const active = [summary('1'), summary('2', {fundingHealth: 'BEHIND'}), summary('3', {fundingHealth: 'BEHIND', nextContributionDate: '2026-10-18'})];
    expect(todayGoalRoles(active, [record('1'), record('2'), record('3')], TODAY).attention).toEqual({id: '3', why: 'behind'});
    const tied = [summary('1'), summary('2', {fundingHealth: 'BEHIND'}), summary('3', {fundingHealth: 'BEHIND'})];
    expect(todayGoalRoles(tied, [record('3'), record('2'), record('1')], TODAY).attention?.id).toBe('2');
  });
  it('with nothing urgent it is still another goal (the next in page order)', () => {
    const roles = todayGoalRoles([summary('1'), summary('2'), summary('3')], [record('1'), record('2'), record('3')], TODAY);
    expect(roles.attention).toEqual({id: '2', why: 'next'});
  });
  it('with one goal, the panel shows that goal’s funding facts (a different fact from the step and the card)', () => {
    const roles = todayGoalRoles([summary('1')], [record('1')], TODAY);
    expect(roles.focus?.goal.id).toBe('1');
    expect(roles.focus?.step.kind).toBe('contribution');
    expect(roles.attention).toEqual({id: '1', why: 'only'});
  });
  it('a pinned goal (the top of every list) is the focus, not "What matters today"; projects and closed goals never show there', () => {
    expect(todayGoalRoles([summary('1'), summary('2', {nextContributionDate: '2026-10-01'})], [record('1', {pinned: true}), record('2')], TODAY).attention).toEqual({id: '2', why: 'overdue'});
    const roles = todayGoalRoles([summary('1'), summary('5')], [record('1'), record('5', {type: 'PROJECT'}), record('6', {status: 'closed'})], TODAY);
    expect(roles.attention).toEqual({id: '1', why: 'only'});
    expect(todayGoalRoles([], [], TODAY)).toEqual({focus: null, attention: null, cards: []});
  });
  it('the panel reads the chosen goal first and as the only one marked first; every other record keeps its place', () => {
    const goals = [{id: '1', n: 'a', pinned: true}, {id: '2', n: 'b'}, {id: '3', n: 'c'}];
    const view = attentionFirst(goals, {focus: null, attention: {id: '3', why: 'overdue'}, cards: []});
    expect(view.map(g => [g.id, !!g.pinned])).toEqual([['3', true], ['1', false], ['2', false]]);
    expect(goals[0]!.pinned).toBe(true); // a view: the records themselves are untouched
    expect(attentionFirst(goals, {focus: null, attention: null, cards: []})).toEqual(goals);
  });
});
