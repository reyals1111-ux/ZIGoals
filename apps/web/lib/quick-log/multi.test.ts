import {describe, expect, test} from 'vitest';
import {actionSchema} from '../ai/actions/schema';
import {quickLogItems, quickLogReply, splitItems, type QuickLogContext} from './multi';

/** Session AI (J10, ZI11): one line, several items, one card each; English and Dutch; nothing unreadable is guessed. */
const ctx: QuickLogContext = {
  habits: [{id: 'h-read', title: 'Read', unit: 'minutes', kind: 'duration', target: 30}, {id: 'h-med', title: 'Meditate', unit: 'minutes', kind: 'duration', target: 10}],
  counters: [{id: 'c-push', name: 'Push-ups'}], waterUnit: 'ml', weightUnit: 'kg',
  goals: ['Holiday fund', 'Emergency fund'], foods: ['Greek yoghurt'], now: new Date('2026-10-28T12:30:00'),
};
const kinds = (line: string, lang: 'en' | 'nl' = 'en', c = ctx) => quickLogItems(line, c, lang).map(i => i.action?.kind ?? null);
describe('splitting one line', () => {
  test('commas, "and", "en", semicolons and new lines split; a decimal comma does not', () => {
    expect(splitItems('30 push-ups, 500 ml water and a banana')).toEqual(['30 push-ups', '500 ml water', 'a banana']);
    expect(splitItems('gewicht 78,4 en 2 glazen water')).toEqual(['gewicht 78,4', '2 glazen water']);
    expect(splitItems('/log 2 glasses of water; read 20 minutes')).toEqual(['2 glasses of water', 'read 20 minutes']);
  });
});
describe('one card per item', () => {
  test('the owner\'s example, with the expense log', () => {
    const items = quickLogItems('30 push-ups, 500 ml water, spent 12 euro on lunch', {...ctx, expenses: true});
    expect(items.map(i => i.action?.kind)).toEqual(['counter', 'log-water', 'log-expense']);
    expect(items[2]!.action).toMatchObject({amount: 12, currency: 'EUR', note: 'lunch'});
  });
  test('before the expense log, spending is said plainly, never guessed', () => {
    const items = quickLogItems('500 ml water, spent 12 euro on lunch', ctx);
    expect(items[1]).toMatchObject({action: null, why: 'spending cannot be logged here yet'});
  });
  test('habits, foods, a mood and a goal', () => {
    expect(kinds('read 20 minutes, 2 eggs for breakfast, mood 4, put 50 in Holiday fund')).toEqual(['check-in', 'log-food', 'log-mood', 'prefill-contribution']);
  });
  test('Dutch', () => expect(kinds('2 glazen water, 10 minuten gemediteerd en een banaan', 'nl')).toEqual(['log-water', 'check-in', 'log-food']));
  test('an item it cannot read is named back', () => expect(quickLogItems('500 ml water, fixed the car', ctx)[1]).toMatchObject({action: null, why: 'not understood'}));
  test('every card is a valid card of its kind', () => {
    for (const item of quickLogItems('30 push-ups, 500 ml water, weight 78.4, read 20 minutes, a banana, mood 3, put 50 in Holiday fund', ctx)) {
      if (item.action?.kind === 'log-expense') continue;
      expect(actionSchema.safeParse(item.action).success, JSON.stringify(item.action)).toBe(true);
    }
  });
  test('the reply carries one block per card and names what it skipped', () => {
    const r = quickLogReply('2 glasses of water, fixed the car', ctx)!;
    expect(r.cards).toBe(1);
    expect(r.text).toMatch(/Not a card: “fixed the car” \(not understood\)/);
    expect(r.text.match(/```zigoals-action/g)).toHaveLength(1);
  });
  test('with Health off, Health items say so and the rest stay', () => {
    const items = quickLogItems('500 ml water, read 20 minutes', {...ctx, health: false});
    expect(items.map(i => i.action?.kind ?? i.why)).toEqual(['Health is off here', 'check-in']);
  });
});
