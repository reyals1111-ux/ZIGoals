import {expect, test} from 'vitest';
import {buildShowcase, showcaseChoices} from './showcase-data';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from './af-checklist-keys';
import {checklistDaysSchema, checklistSchema} from './checklist/schema';
import {checklistStreak} from './checklist/streak';
import {GAME_KEY} from './aa-device-keys';
import {gameSchema} from './game/schema';
import {HABITS_KEY} from './habits';

// Session AF (crit1): the Showcase's Checklist path is one of its choices (written only when a person loads or resets the
// Showcase), never part of `records` that tests also seed as a person's own data. It stars one active build habit of the
// Showcase per part of the day, a glass of water and one item of the person's own, and it reads as a valid record.
test('the Showcase stars its own habits, a glass of water and one custom item; the records alone carry no path', () => {
  const {records} = buildShowcase('2026-10-16');
  expect(records[CHECKLIST_KEY]).toBeUndefined();
  expect(showcaseChoices()[CHECKLIST_KEY]).toBeUndefined();
  const path = checklistSchema.parse(JSON.parse(showcaseChoices(records)[CHECKLIST_KEY]!));
  const habits = (JSON.parse(records[HABITS_KEY]!) as {habits: {id: string; timeOfDay: string; rules: {type: string; state: string}[]}[]}).habits;
  const starred = path.items.filter(i => i.kind === 'habit');
  expect(starred.map(i => i.section)).toEqual(['morning', 'afternoon', 'evening']);
  for (const item of starred) {
    const habit = habits.find(h => h.id === item.ref?.habitId);
    expect(habit, item.id).toBeDefined();
    expect(habit!.rules.at(-1)).toMatchObject({type: 'build', state: 'active'});
    expect(habit!.timeOfDay).toBe(item.section);
  }
  expect(path.healthItems).toEqual([expect.objectContaining({kind: 'health', input: 'water', defaultValue: 250, unit: 'ml', section: 'morning'})]);
  expect(path.items.filter(i => i.kind === 'custom')).toEqual([expect.objectContaining({label: 'Read ten pages', colour: 'gold', section: 'evening'})]);
  expect(path.order).toHaveLength(5);
  expect(showcaseChoices({[HABITS_KEY]: 'not json'})[CHECKLIST_KEY]).toBeUndefined();
  // crit2: the glass of water opens the path, so the starred habits sit next to each other.
  expect(path.order[0]).toBe(path.healthItems[0]!.id);
  expect(showcaseChoices(records)[CHECKLIST_DAYS_KEY]).toBeUndefined(); // without the Showcase's day, no history
});

test('the Showcase\'s Checklist history: twelve weeks of counts ending in a six-day streak, with rest and partial days', () => {
  const day = '2026-10-16', {records} = buildShowcase(day);
  const days = checklistDaysSchema.parse(JSON.parse(showcaseChoices(records, day)[CHECKLIST_DAYS_KEY]!));
  expect(Object.keys(days.days)).toHaveLength(84);
  expect(days.days[day]).toBeUndefined(); // today is the person's own: nothing ticked by the Showcase
  const streak = checklistStreak(days, day, null);
  expect(streak.current).toBe(6);
  expect(streak.best).toBeGreaterThanOrEqual(6);
  const values = Object.values(days.days);
  expect(values.some(d => d.total === 0)).toBe(true);
  expect(values.some(d => d.total > 0 && d.done < d.total)).toBe(true);
  expect(values.some(d => d.perfect)).toBe(true);
  // The history earns Checklist badges and XP: the Showcase's game record marks them seen, so no celebration opens over it.
  const game = gameSchema.parse(JSON.parse(showcaseChoices(records, day)[GAME_KEY]!));
  for (const id of ['first-orbit', 'seven-orbits', 'perfect-orbit']) expect(game.badgesSeen, id).toHaveProperty(id);
  expect(game.levelSeen).toBeGreaterThanOrEqual(gameSchema.parse(JSON.parse(records[GAME_KEY]!)).levelSeen ?? 0);
});
