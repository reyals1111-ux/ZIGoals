import {expect, test} from 'vitest';
import {actionSchema, type Action} from './schema';
import {withoutRepeats} from './repeats';

const a = (raw: Record<string, unknown>): Action => actionSchema.parse(raw);
// Session AJ (item 9; real-model today-plan-week t2): a follow-up does not re-send the earlier reply's cards.
test('a card an earlier reply proposed with the same values is left out; references and spelling may differ; other values keep it', () => {
  const first = [a({kind: 'create-habit', title: 'Swim', ref: 'new1', schedule: {timesPerWeek: 2}}), a({kind: 'create-reminder', for: 'habit', habit: 'new1', time: '07:00'})];
  const follow = [a({kind: 'create-habit', title: ' swim ', ref: 'new2', schedule: {timesPerWeek: 2}}), a({kind: 'create-reminder', for: 'habit', habit: 'new2', time: '07:00'}), a({kind: 'create-reminder', for: 'habit', habit: 'new2', time: '08:00'}), a({kind: 'log-water', millilitres: 300})];
  const {kept, repeated} = withoutRepeats([first], follow);
  expect(repeated).toBe(2);
  expect(kept.map(k => k.kind)).toEqual(['create-reminder', 'log-water']);
  expect(withoutRepeats([], follow)).toEqual({kept: follow, repeated: 0});
});
