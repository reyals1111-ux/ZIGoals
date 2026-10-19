import {expect, test} from 'vitest';
import {buildShowcase, showcaseChoices} from './showcase-data';
import {CHECKLIST_KEY} from './af-checklist-keys';
import {checklistSchema} from './checklist/schema';
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
});
