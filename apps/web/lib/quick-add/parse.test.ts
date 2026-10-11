import {describe, expect, test} from 'vitest';
import {ABOVE_ZERO, MINUTES_HINT, OUTSIDE, parse} from './parse';
import {describeQuickAdd} from './describe';
import {en} from './locales/en';
import type {QuickAddContext, QuickAddResult} from './types';

const context: QuickAddContext = {
  habits: [{id: 'h-med', title: 'Meditate', unit: 'times', kind: 'count', target: 10}, {id: 'h-read', title: 'Read', unit: 'minutes', kind: 'duration', target: 30}, {id: 'h-water', title: 'Drink water', unit: 'glasses', kind: 'quantity', target: 8}, {id: 'h-ex', title: 'Exercise', unit: 'minutes', kind: 'duration', target: 30}],
  counters: [{id: 'c-push', name: 'Push-ups'}, {id: 'c-squat', name: 'Squats'}],
  waterUnit: 'ml', weightUnit: 'kg',
};
const floz = (ctx: QuickAddContext): QuickAddContext => ({...ctx, waterUnit: 'fl-oz-us'}), lb = (ctx: QuickAddContext): QuickAddContext => ({...ctx, weightUnit: 'lb'});
type Row = [phrase: string, expected: Partial<QuickAddResult> | ((result: QuickAddResult) => void), ctx?: QuickAddContext];
const water = (millilitres: number, shown?: {amount: number; unit: 'glasses' | 'mL' | 'L' | 'US fl oz'}, day: 'today' | 'yesterday' = 'today') => ({kind: 'water', millilitres, ...(shown ? {shown} : {}), day}) as Partial<QuickAddResult>;
const weight = (grams: number, shown?: {amount: number; unit: 'kg' | 'lb'}, day: 'today' | 'yesterday' = 'today') => ({kind: 'weight', grams, ...(shown ? {shown} : {}), day}) as Partial<QuickAddResult>;
const steps = (n: number, day: 'today' | 'yesterday' = 'today') => ({kind: 'steps', steps: n, day}) as Partial<QuickAddResult>;
const activity = (name: string, minutes: number, distanceKm?: number) => ({kind: 'activity', name, minutes, ...(distanceKm !== undefined ? {distanceKm} : {})}) as Partial<QuickAddResult>;
const sleep = (minutes: number, day: 'today' | 'yesterday' = 'today') => ({kind: 'sleep', minutes, day}) as Partial<QuickAddResult>;
const exercise = (name: string, count: number) => ({kind: 'exercise', name, count}) as Partial<QuickAddResult>;
const habit = (title: string, value: number, unit?: string, day: 'today' | 'yesterday' = 'today') => ({kind: 'habit', title, value, ...(unit ? {unit} : {}), day}) as Partial<QuickAddResult>;
const unknown = {kind: 'unknown'} as Partial<QuickAddResult>, needsMore = (hint?: string) => ({kind: 'needs-more', ...(hint ? {hint} : {})}) as Partial<QuickAddResult>;

const rows: Row[] = [
  ['drank 2 glasses of water', water(500, {amount: 2, unit: 'glasses'})],
  ['2 glasses of water', water(500)],
  ['a glass of water', water(250, {amount: 1, unit: 'glasses'})],
  ['drank 500ml', water(500, {amount: 500, unit: 'mL'})],
  ['drank 500 ml of water', water(500)],
  ['water 1.5l', water(1500, {amount: 1.5, unit: 'L'})],
  ['water 0,5 l', water(500)],
  ['had 8 oz of water', water(236.588, {amount: 8, unit: 'US fl oz'})],
  ['drank water', water(250, {amount: 1, unit: 'glasses'})],
  ['drank 2 cups water', water(500, {amount: 2, unit: 'glasses'})],
  ['drank 3 glasses yesterday', water(750, undefined, 'yesterday')],
  ['water 400', water(400)],
  ['water 12', water(354.882, {amount: 12, unit: 'US fl oz'}), floz(context)],
  ['half a glass of water', water(125)],
  ['drank twenty glasses', water(5000)],
  ['weight 78.4', weight(78_400, {amount: 78.4, unit: 'kg'})],
  ['78,4 kg', weight(78_400)],
  ['weighed 78.4kg', weight(78_400)],
  ['weight 172 lb', weight(78_018, {amount: 172, unit: 'lb'})],
  ['172 lbs', weight(78_018)],
  ['weight 80', weight(36_287, {amount: 80, unit: 'lb'}), lb(context)],
  ['weigh 1500 kg', needsMore(OUTSIDE)],
  ['weight yesterday 78', weight(78_000, undefined, 'yesterday')],
  ['8000 steps', steps(8000)],
  ['walked 8000 steps', steps(8000)],
  ['8k steps', steps(8000)],
  ['walked 12,345 steps', steps(12_345)],
  ['steps 6500 yesterday', steps(6500, 'yesterday')],
  ['2,000,000 steps', needsMore(OUTSIDE)],
  ['ran 5k in 28 min', activity('Run', 28, 5)],
  ['ran 5 km in 28 minutes', activity('Run', 28, 5)],
  ['run 10km 55min', activity('Run', 55, 10)],
  ['ran 30 min', activity('Run', 30)],
  ['jogged for 20 minutes', activity('Run', 20)],
  ['ran 5k', needsMore(MINUTES_HINT)],
  ['cycled 40 min', activity('Cycle', 40)],
  ['biked 15 km in 45 min', activity('Cycle', 45, 15)],
  ['rode 1h', activity('Cycle', 60)],
  ['walked 30 min', activity('Walk', 30)],
  ['walked 3 miles in 50 min', activity('Walk', 50, 4.828)],
  ['swam 45 minutes', activity('Swim', 45)],
  ['ran 1500 min', needsMore(OUTSIDE)],
  ['slept 7h', sleep(420)],
  ['slept 7.5 hours', sleep(450)],
  ['slept 7h30', sleep(450)],
  ['sleep 8 hours yesterday', sleep(480, 'yesterday')],
  ['slept 6 h 45 min', sleep(405)],
  ['slept 25 hours', needsMore(OUTSIDE)],
  ['+2 pushups', exercise('Push-ups', 2)],
  ['20 push-ups', exercise('Push-ups', 20)],
  ['did 10 squats', exercise('Squats', 10)],
  ['pushups', exercise('Push-ups', 1)],
  ['+15 Push ups', exercise('Push-ups', 15)],
  ['200000 squats', needsMore(OUTSIDE)],
  ['meditated', habit('Meditate', 1, 'times')],
  ['meditate', habit('Meditate', 1)],
  ['meditated 2 times', habit('Meditate', 2)],
  ['+3 meditate', habit('Meditate', 3)],
  ['read 20 min', habit('Read', 20, 'minutes')],
  ['read 1 hour', habit('Read', 60, 'minutes')],
  ['read', habit('Read', 1, 'minutes')],
  ['exercised 45 minutes', habit('Exercise', 45)],
  ['drink water 2 glasses', result => { expect(result.kind).toBe('ambiguous'); if (result.kind !== 'ambiguous') return; expect(result.choices).toHaveLength(2); expect(result.choices[0]).toMatchObject(water(500)); expect(result.choices[1]).toMatchObject(habit('Drink water', 2, 'glasses')); }],
  ['meditated yesterday', habit('Meditate', 1, undefined, 'yesterday')],
  ['Meditated.', habit('Meditate', 1)],
  ['MEDITATE 5', habit('Meditate', 5)],
  ['read 2000000000 min', needsMore(OUTSIDE)],
  ['', unknown],
  ['   ', unknown],
  ['hello', unknown],
  ['ate an apple', unknown],
  ['bought 100 ZIG', unknown],
  ['5', unknown],
  ['kg', unknown],
  ['drank', water(250)],
  ['water', water(250)],
  ['ran', needsMore(MINUTES_HINT)],
  ['weight', unknown],
  ['steps', unknown],
  ['slept', unknown],
  ['drank 2 glasses of water and ran 5k', unknown],
  ['glass of water 2', water(500)],
  ['two glasses water', water(500)],
  ['a couple of glasses of water', water(500)],
  ['1e3 steps', unknown],
  ['-5 pushups', unknown],
  ['0 steps', needsMore(ABOVE_ZERO)],
  ['x'.repeat(201), unknown],
  ['walked 8000 steps in 70 min', {kind: 'steps', steps: 8000, minutes: 70} as Partial<QuickAddResult>],
  ['yesterday', unknown],
];

describe('A2 quick-add grammar (en)', () => {
  test.each(rows.map((row, index) => [index + 1, ...row] as [number, ...Row]))('%i · %s', (_index, phrase, expected, ctx) => {
    const result = parse(phrase, 'en', ctx ?? context);
    if (typeof expected === 'function') expected(result); else expect(result).toMatchObject(expected);
  });
  test('the table has 90 phrases and the unknown answer carries the three examples', () => {
    expect(rows).toHaveLength(90);
    const result = parse('hello', 'en', context);
    expect(result).toEqual({kind: 'unknown', examples: en.examples});
  });
  test('every example parses to a known kind, and the preview never praises', () => {
    for (const example of en.examples) {
      const result = parse(example, 'en', context);
      expect(['water', 'weight', 'steps', 'activity', 'sleep', 'exercise', 'habit']).toContain(result.kind);
      if (result.kind === 'ambiguous' || result.kind === 'needs-more' || result.kind === 'unknown') throw Error(example);
      expect(describeQuickAdd(result)).not.toMatch(/great|well done|congrat/i);
    }
  });
  test('the locale table has no key twice across its word lists', () => {
    const lists = [en.numbers, en.units, en.verbs, en.dayWords, en.stems].map(table => Object.keys(table));
    for (const list of lists) expect(new Set(list).size).toBe(list.length);
    const unitsAndVerbs = Object.keys(en.units).filter(k => k in en.verbs);
    expect(unitsAndVerbs).toEqual(['steps']);
    expect(Object.keys(en.dayWords).some(k => k in en.units || k in en.verbs || k in en.numbers)).toBe(false);
  });
  test('the preview sentences take the forms the design names', () => {
    const line = (phrase: string, ctx = context) => { const r = parse(phrase, 'en', ctx); if (r.kind === 'ambiguous' || r.kind === 'needs-more' || r.kind === 'unknown') throw Error(phrase); return describeQuickAdd(r); };
    expect(line('drank 2 glasses of water')).toBe('Water · 2 glasses (500 mL)');
    expect(line('weight 78.4')).toBe('Weight · 78.4 kg');
    expect(line('walked 8000 steps')).toBe('Walk · 8,000 steps');
    expect(line('ran 5k in 28 min')).toBe('Run · 5 km · 28 min');
    expect(line('slept 7h30')).toBe('Sleep · 7 h 30 min');
    expect(line('+2 pushups')).toBe('Push-ups · +2 reps');
    expect(line('meditated')).toBe('Meditate · +1 time');
    expect(line('had 8 oz of water')).toBe('Water · 8 US fl oz (236.588 mL)');
    expect(line('water 400')).toBe('Water · 400 mL');
  });
});
