import {expect, test} from 'vitest';
import {actionSchema, type Action} from './schema';
import {withoutRepeats} from './repeats';

const a = (raw: Record<string, unknown>): Action => actionSchema.parse(raw);
// Session AJ (item 9; real-model today-plan-week t2): a follow-up does not re-send the earlier reply's cards.
test('cards an earlier reply proposed come back together: left out; references and spelling may differ; other values keep it', () => {
  const first = [a({kind: 'create-habit', title: 'Swim', ref: 'new1', schedule: {timesPerWeek: 2}}), a({kind: 'create-reminder', for: 'habit', habit: 'new1', time: '07:00'})];
  const follow = [a({kind: 'create-habit', title: ' swim ', ref: 'new2', schedule: {timesPerWeek: 2}}), a({kind: 'create-reminder', for: 'habit', habit: 'new2', time: '07:00'}), a({kind: 'create-reminder', for: 'habit', habit: 'new2', time: '08:00'}), a({kind: 'log-water', millilitres: 300})];
  const {kept, repeated} = withoutRepeats([first], follow);
  expect(repeated).toBe(2);
  expect(kept.map(k => k.kind)).toEqual(['create-reminder', 'log-water']);
  expect(withoutRepeats([], follow)).toEqual({kept: follow, repeated: 0});
});
// The CI run of the first version: a single card asked for again ("Another 300 ml") must always show.
test('a single card that matches an earlier one is always shown', () => {
  const water = [a({kind: 'log-water', millilitres: 300})];
  expect(withoutRepeats([water, water], water)).toEqual({kept: water, repeated: 0});
  const plan = [a({kind: 'log-water', millilitres: 300}), a({kind: 'create-habit', title: 'Swim'})];
  expect(withoutRepeats([plan], [plan[0]!]).repeated).toBe(0); // one card of an earlier reply: shown
  expect(withoutRepeats([[plan[0]!], [plan[1]!]], plan).repeated).toBe(0); // from two different replies: shown
});
