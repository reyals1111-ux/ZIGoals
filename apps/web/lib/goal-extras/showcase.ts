import {goalExtrasSchema, type GoalExtras} from './store';
import {averageGoalsSchema, type AverageGoals} from '../average-goals/store';

/**
 * Session AA-Cloud Part 2/8: the Showcase's goal extras and average goals (fictional, for the tab only). Every goal gets
 * a life area and a generated gradient (never a photo); three have why, obstacle and an if-then plan; a three-level tree
 * runs from "Launch my creative studio" to "Create 2 hours a day" to "Sleep 7 hours a night"; the habits carry areas; two
 * finished average goals stand on the Hall of achievements; and 30 days of fictional entries feed the averages.
 */
const H = (n: number) => `92000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function showcaseGoalExtras(day: string): {extras: GoalExtras; averages: AverageGoals} {
  const clock = Date.parse(`${day}T12:00:00Z`);
  const date = (offset: number) => new Date(clock + offset * 86_400_000).toISOString().slice(0, 10);
  const at = (offset: number) => `${date(offset)}T09:00:00.000Z`;
  const updatedAt = at(-1);
  const extras = goalExtrasSchema.parse({
    version: 1,
    areas: [{id: 'custom-creative', label: 'Creative life', color: '#ffb36b'}],
    habitAreas: {[H(1)]: 'learning', [H(2)]: 'health', [H(3)]: 'health', [H(4)]: 'mind', [H(5)]: 'wealth', [H(6)]: 'health'},
    goals: {
      'private:9201': {area: 'wealth', template: 'emergency-fund', why: 'So a broken boiler is an annoyance, not a crisis.', obstacle: 'Weekend spending that adds up.', ifThen: 'If I want to buy something over 50, then I wait one day.', vision: {kind: 'gradient', gradient: 'ocean', emoji: '🛟'}, updatedAt},
      'private:9202': {area: 'wealth', template: 'house-deposit', why: 'A home with a garden for the dog.', obstacle: 'Prices moving faster than my savings.', ifThen: 'If the month ends with money left, then it goes to the deposit first.', vision: {kind: 'gradient', gradient: 'forest', emoji: '🏡'}, updatedAt},
      'private:9203': {area: 'fun', template: 'holiday-fund', vision: {kind: 'gradient', gradient: 'sunrise', emoji: '🗻'}, updatedAt},
      'private:9204': {area: 'wealth', vision: {kind: 'gradient', gradient: 'ember', emoji: '₿'}, updatedAt},
      'private:9205': {area: 'custom-creative', template: 'side-project', why: 'Work I am proud to sign.', obstacle: 'Doubting the first version.', ifThen: 'If I start to polish forever, then I ship it to one person first.', vision: {kind: 'gradient', gradient: 'nebula', emoji: '🎨'}, updatedAt},
      'private:9206': {area: 'wealth', vision: {kind: 'gradient', gradient: 'glacier', emoji: '✨'}, updatedAt},
      'average:showcase-create': {area: 'custom-creative', parentKey: 'private:9205', vision: {kind: 'gradient', gradient: 'dusk', emoji: '✍️'}, updatedAt},
      'average:showcase-sleep': {area: 'health', parentKey: 'average:showcase-create', template: 'sleep-7h', why: 'Rested mornings are my best creative hours.', vision: {kind: 'gradient', gradient: 'aurora', emoji: '🌙'}, updatedAt},
      'average:showcase-water': {area: 'health', template: 'water-2l', story: 'Two litres a day for a whole month, with a glass at every meal.', vision: {kind: 'gradient', gradient: 'ocean', emoji: '💧'}, updatedAt},
      'average:showcase-steps': {area: 'health', template: 'steps-8000', story: 'A walk after dinner, every day of the summer.', vision: {kind: 'gradient', gradient: 'forest', emoji: '👟'}, updatedAt},
    },
  });
  const created = (offset: number) => `${date(offset)}T08:00:00.000Z`;
  // Creative hours: 30 fictional days, mostly around two hours, a few short days.
  const createEntries = Array.from({length: 30}, (_, i) => ({day: date(-29 + i), value: [2.5, 2, 1.5, 2, 3, 0.5, 2, 2.5, 1, 2][i % 10]!}));
  const averages = averageGoalsSchema.parse({version: 1, goals: [
    {id: 'showcase-create', name: 'Create 2 hours a day', metric: 'custom', unit: 'h a day', target: 2, direction: 'at-least', windowDays: 14, status: 'active', createdAt: created(-45), entries: createEntries},
    {id: 'showcase-sleep', name: 'Sleep 7 hours a night', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14, status: 'active', createdAt: created(-40), entries: []},
    {id: 'showcase-water', name: 'Drink 2 litres a day', metric: 'water-ml', unit: 'mL a day', target: 2000, direction: 'at-least', windowDays: 30, status: 'completed', createdAt: created(-75), completedAt: at(-14), entries: []},
    {id: 'showcase-steps', name: '8,000 steps a day, all summer', metric: 'steps', unit: 'steps a day', target: 8000, direction: 'at-least', windowDays: 30, status: 'completed', createdAt: created(-120), completedAt: at(-38), entries: []},
  ]});
  return {extras, averages};
}
