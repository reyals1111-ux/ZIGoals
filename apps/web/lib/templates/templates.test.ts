import {describe, expect, test} from 'vitest';
import {habitInputSchema} from '../habits';
import {pagesSchema} from '../pages/schema';
import {viewOf} from '../pages/visibility';
import {HABIT_TEMPLATES, HABIT_TEMPLATE_GROUPS, habitTemplateInputOf, hasHabitLike} from './habits';
import {GOAL_TEMPLATES} from './goals';
import {STEP_TARGETS, WATER_TARGETS_ML} from './health';
import {PILLARS, pagesForPillars, pagesShownFor, presetForPillars, starterHabits} from './pillars';
import {HABIT_TEMPLATE_TITLES} from '../../components/habits/habit-editor';

const AT = '2026-10-07T09:00:00.000Z';
describe('starter habits (Session W Part 3)', () => {
  test('at least fifty, in all eight groups, each a complete habit the editor accepts', () => {
    expect(HABIT_TEMPLATES.length).toBeGreaterThanOrEqual(50);
    for (const group of HABIT_TEMPLATE_GROUPS) expect(HABIT_TEMPLATES.filter(t => t.group === group).length, group).toBeGreaterThanOrEqual(5);
    expect(new Set(HABIT_TEMPLATES.map(t => t.id)).size).toBe(HABIT_TEMPLATES.length);
    expect(new Set(HABIT_TEMPLATES.map(t => t.title.toLowerCase())).size).toBe(HABIT_TEMPLATES.length);
    for (const t of HABIT_TEMPLATES) expect(habitInputSchema.safeParse(habitTemplateInputOf(t)).success, t.id).toBe(true);
  });
  test('calm words: no guilt, urgency or advice, and no money amounts', () => {
    const words = /\b(must|should|never miss|fail|failure|lazy|guilt|shame|hurry|now or never|lose weight|diet|burn)\b/i;
    for (const t of HABIT_TEMPLATES) { expect(`${t.title} ${t.note}`, t.id).not.toMatch(words); }
    for (const t of HABIT_TEMPLATES.filter(t => t.group === 'money')) { expect(t.measurement?.kind, t.id).toBe('boolean'); expect(`${t.title} ${t.note}`, t.id).not.toMatch(/[$€£]|\d/); }
  });
  test('the editor\'s own templates stay as they were (Buy ZIG included)', () => {
    expect(HABIT_TEMPLATE_TITLES).toEqual({walk: 'Walk', exercise: 'Exercise', water: 'Drink water', read: 'Read', study: 'Study', buyzig: 'Buy ZIG', budget: 'Review budget', savings: 'Add to savings', nospend: 'No-spend day'});
  });
  test('an existing habit with the same title (any case) is never added twice', () => {
    const walk = HABIT_TEMPLATES.find(t => t.id === 'walk')!;
    expect(hasHabitLike([' walk '], walk)).toBe(true);
    expect(hasHabitLike(['Walk the dog'], walk)).toBe(false);
  });
  test('goal templates give only a kind and a placeholder; Health targets are three common starting points each', () => {
    for (const t of GOAL_TEMPLATES) expect(Object.keys(t).sort()).toEqual(['category', 'label', 'placeholder']);
    expect(STEP_TARGETS).toEqual([6000, 8000, 10000]);
    expect(WATER_TARGETS_ML).toEqual([1500, 2000, 2500]);
  });
});

describe('pillars → pages, Today and starters (Session W Part 3)', () => {
  test('no pillar: nothing is written and Today stays as it is', () => {
    expect(pagesForPillars([], AT)).toBeNull();
    expect(presetForPillars([])).toBeNull();
    expect(pagesShownFor([])).toEqual(['today', 'goals', 'habits', 'health', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'activity']);
    expect(starterHabits([]).map(t => t.group)).toEqual(['fitness', 'health', 'learning', 'mind', 'sleep', 'money', 'home']);
  });
  test('Habits and Health & food: the money pages hide, Today starts with Habits + Health, the choice is stamped and valid', () => {
    const pages = pagesForPillars(['habits', 'health-food'], AT)!;
    expect(pagesSchema.parse(pages)).toEqual(pages);
    expect(viewOf(pages).hidden).toEqual(['goals', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'chess', 'music', 'wealth-shortcut']);
    expect(Object.values(pages.items).every(choice => choice!.at === AT)).toBe(true);
    // Only what differs from the defaults is written (Chess and the music player are hidden by default anyway).
    expect(Object.keys(pages.items).sort()).toEqual(['ecosystem', 'goals', 'markets', 'portfolio', 'staking', 'wealth', 'wealth-shortcut']);
    expect(presetForPillars(['habits', 'health-food'])).toBe('habits-health');
    expect(pagesShownFor(['habits', 'health-food'])).toEqual(['today', 'habits', 'health', 'activity']);
  });
  test('every pillar: everything shows, Chess and the music player included; Today is Balanced', () => {
    const pages = pagesForPillars([...PILLARS], AT)!;
    expect(viewOf(pages).hidden).toEqual([]);
    expect(pages.items).toEqual({chess: {v: 'shown', at: AT}, music: {v: 'shown', at: AT}});
    expect(presetForPillars([...PILLARS])).toBe('balanced');
  });
  test('a re-run changes only what differs from the current choice, and returns null when nothing would change', () => {
    const before = pagesForPillars(['habits'], AT)!;
    expect(pagesForPillars(['habits'], '2026-10-08T09:00:00.000Z', before)).toBeNull();
    const after = pagesForPillars(['habits', 'goals-money'], '2026-10-08T09:00:00.000Z', before)!;
    expect(after.items.goals).toEqual({v: 'shown', at: '2026-10-08T09:00:00.000Z'});
    expect(after.items.health).toEqual(before.items.health);
  });
  test('Today\'s layout follows the pillars; Chess or music alone leave it as it is', () => {
    expect(presetForPillars(['goals-money'])).toBe('wealth');
    expect(presetForPillars(['goals-money', 'sleep-mind'])).toBe('balanced');
    expect(presetForPillars(['sleep-mind'])).toBe('health');
    expect(presetForPillars(['habits'])).toBe('habits-health');
    expect(presetForPillars(['chess', 'music'])).toBeNull();
  });
  test('starters follow the pillars: three per group', () => {
    expect(starterHabits(['chess']).map(t => t.id)).toEqual(['chess-game', 'chess-puzzle', 'chess-tactics']);
    expect(starterHabits(['sleep-mind']).map(t => t.group)).toEqual(['sleep', 'sleep', 'sleep', 'mind', 'mind', 'mind']);
    // Music alone points to no habit group: the general set, one from each.
    expect(starterHabits(['music'])).toEqual(starterHabits([]));
  });
});
