import {describe, expect, test} from 'vitest';
import {BUNDLE_CUT, ONE_BUNDLE, parseReply} from './parse';
import {actionSchema, COMPOSITE_KINDS, KIND_ALIASES} from './schema';
import {ACTION_PROTOCOL} from '../context/specialists';

const block = (json: string) => `\`\`\`zigoals-action\n${json}\n\`\`\``;
const TEN_K = JSON.stringify({kind: 'plan-bundle', title: 'Your 10k plan', goal: {name: 'Run 10 km', type: 'PROJECT', milestones: ['5 km', '8 km', '10 km'], targetDate: '2027-03-01'},
  habits: [{title: 'Run', measurement: 'minutes', target: 30, schedule: '3 times a week', timeOfDay: 'mornings', reminder: '07:00'}, {title: 'Stretch', measurement: 'minutes', target: 10}],
  checklist: ['Buy running shoes'], favourites: ['Walk'], remember: [{text: 'Trains in the morning', category: 'schedule'}], earn: {step: 'learn'}});

describe('plan-bundle (Session AF, L4; TIER 3 data formats): one plan, expanded into existing cards', () => {
  test('the order is goal, habits with their reminders, Checklist items, favourites, Remember, then the Earn step; the meta counts them', () => {
    const r = parseReply(`A plan you can add step by step.\n\n${block(TEN_K)}`);
    expect(r.rejected).toEqual([]);
    expect(r.proposals.map(p => p.kind)).toEqual(['create-goal', 'create-habit', 'create-reminder', 'create-habit', 'checklist-add-custom', 'checklist-add-favourite', 'remember', 'open-page']);
    expect(r.bundle).toEqual({title: 'Your 10k plan', first: 0, count: 8, steps: 8});
    expect(r.proposals[1]).toMatchObject({kind: 'create-habit', title: 'Run', schedule: {timesPerWeek: 3}, timeOfDay: 'morning', ref: 'new1'});
    expect(r.proposals[2]).toEqual({kind: 'create-reminder', for: 'habit', habit: 'new1', time: '07:00'});
    expect(r.proposals[0]).toMatchObject({kind: 'create-goal', name: 'Run 10 km', type: 'PROJECT', milestones: ['5 km', '8 km', '10 km']});
    expect(r.proposals.at(-1)).toEqual({kind: 'open-page', page: 'earn'});
    expect(r.text).toBe('A plan you can add step by step.');
  });
  test('the Earn step is a page or the staking review filled in, never a write that moves money', () => {
    const steps = (earn: Record<string, unknown>) => parseReply(block(JSON.stringify({kind: 'plan-bundle', title: 'Start me on staking', earn}))).proposals;
    expect(steps({step: 'start-here'})).toEqual([{kind: 'open-page', page: 'earn', view: 'start-here'}]);
    expect(steps({step: 'academy'})).toEqual([{kind: 'open-page', page: 'earn', view: 'academy'}]);
    expect(steps({step: 'practice-stake', amount: '10'})).toEqual([{kind: 'prefill-staking', action: 'delegate', network: 'practice', amount: '10'}]);
    expect(steps({step: 'stake', network: 'real'})).toEqual([{kind: 'prefill-staking', action: 'delegate', network: 'real'}]);
    expect(parseReply(block(JSON.stringify({kind: 'plan-bundle', title: 'x', earn: {step: 'contribute', amount: 100}}))).rejected).toHaveLength(1);
    expect(parseReply(block(JSON.stringify({kind: 'plan-bundle', title: 'x', contribution: {goal: 'g1', amount: 100}}))).proposals).toEqual([]);
  });
  test('a bad step is refused alone and the rest stay; a plan larger than ten is cut with the reason; one plan per reply', () => {
    const bad = parseReply(block(JSON.stringify({kind: 'plan-bundle', title: 'Plan my week', habits: [{title: 'Read'}], milestones: {goal: 'habit-42', items: ['x']}, checklist: ['Laundry']})));
    expect(bad.rejected).toHaveLength(1); expect(bad.proposals.map(p => p.kind)).toEqual(['create-habit', 'checklist-add-custom']); expect(bad.bundle?.count).toBe(2);
    const big = parseReply(block(JSON.stringify({kind: 'plan-bundle', title: 'Big plan', goal: {name: 'Run', type: 'PROJECT', milestones: ['a']}, habits: [1, 2, 3, 4].map(i => ({title: `H${i}`, reminder: '07:00'})), checklist: ['a', 'b', 'c'], remember: [{text: 'One'}]})));
    expect(big.proposals).toHaveLength(10); expect(big.bundle).toEqual({title: 'Big plan', first: 0, count: 10, steps: 13});
    expect(big.rejected.map(r => r.reason)).toEqual([BUNDLE_CUT(10), BUNDLE_CUT(10), BUNDLE_CUT(10)]);
    const two = parseReply(`${block(JSON.stringify({kind: 'plan-bundle', title: 'One', checklist: ['a']}))}\n${block(JSON.stringify({kind: 'plan-bundle', title: 'Two', checklist: ['b']}))}`);
    expect(two.proposals).toHaveLength(1); expect(two.rejected.map(r => r.reason)).toEqual([ONE_BUNDLE]); expect(two.bundle?.title).toBe('One');
    // Cards before the plan keep their place; the meta points at the plan's own cards.
    const mixed = parseReply(`${block('{"kind":"log-water","glasses":1}')}\n${block(JSON.stringify({kind: 'plan-bundle', title: 'Evening', checklist: ['Lay out clothes']}))}`);
    expect(mixed.bundle).toEqual({title: 'Evening', first: 1, count: 1, steps: 1});
    expect(parseReply(block('{"kind":"plan-bundle","title":"Empty"}')).bundle).toBeUndefined();
  });
  test('aliases: the plain names of the new kinds; never one for a bare stake, unstake, claim, sign, send or broadcast', () => {
    expect(COMPOSITE_KINDS).toContain('plan-bundle');
    for (const [alias, kind] of [['tick', 'checklist-tick'], ['add-to-checklist', 'checklist-add-custom'], ['checklist-add-favorite', 'checklist-add-favourite'], ['brief-settings', 'set-brief'], ['staking-review', 'prefill-staking'], ['program', 'plan-bundle']] as const) expect(KIND_ALIASES[alias], alias).toBe(kind);
    for (const word of ['stake', 'unstake', 'claim', 'sign', 'send', 'broadcast', 'delegate', 'transfer']) { expect(KIND_ALIASES[word], word).toBeUndefined(); expect(actionSchema.safeParse({kind: word}).success, word).toBe(false); }
    expect(parseReply(block('{"kind":"stake","validator":"zigvaloper1x","amount":50}')).proposals).toEqual([]);
    expect(parseReply(block('{"kind":"tick","item":"Push-ups"}')).proposals).toEqual([{kind: 'checklist-tick', item: 'Push-ups', done: true, day: 'today'}]);
  });
  test('the protocol the AI reads names every new kind and the plan\'s shape, and keeps the never-move-money rule with its one exception', () => {
    for (const kind of ['checklist-tick', 'checklist-add-favourite', 'checklist-add-custom', 'set-brief', 'prefill-staking', 'plan-bundle']) expect(ACTION_PROTOCOL).toContain(`"kind":"${kind}"`);
    expect(ACTION_PROTOCOL).toContain('never move money, contribute, allocate, stake, connect a wallet, sync, export, delete or change settings');
    expect(ACTION_PROTOCOL).toContain('Signing, sending or broadcasting anything is never possible');
    expect(ACTION_PROTOCOL).toContain('never one you chose');
  });
});
