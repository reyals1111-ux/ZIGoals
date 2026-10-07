import {habitInputSchema, type HabitInput} from '../habits';

/**
 * Starter habits (Session W Part 3; the library on the Habits page arrives with Part 10): curated, calm, one tap to a
 * complete habit the person can change afterwards. No target is advice: amounts are common starting points, money ones
 * hold no sum, and nothing here measures a person against anyone else. The editor's own templates (Walk, Buy ZIG, …)
 * stay exactly as they were.
 */
export const HABIT_TEMPLATE_GROUPS = ['health', 'mind', 'fitness', 'learning', 'money', 'chess', 'sleep', 'home'] as const;
export type HabitTemplateGroup = typeof HABIT_TEMPLATE_GROUPS[number];
export const HABIT_GROUP_LABEL: Readonly<Record<HabitTemplateGroup, string>> = {health: 'Health', mind: 'Mind', fitness: 'Fitness', learning: 'Learning', money: 'Money', chess: 'Chess', sleep: 'Sleep', home: 'Home'};
type Measurement = HabitInput['measurement'];
type Schedule = HabitInput['schedule'];
export type HabitTemplate = {id: string; group: HabitTemplateGroup; title: string; note: string; category: string; type?: 'build' | 'quit' | 'limit'; measurement: Measurement; target: number; schedule: Schedule; timeOfDay?: 'anytime' | 'morning' | 'afternoon' | 'evening'};

const daily: Schedule = {kind: 'daily'}, weekdays: Schedule = {kind: 'weekdays', days: [1, 2, 3, 4, 5]};
const perWeek = (times: number): Schedule => ({kind: 'frequency', times, period: 'week'});
const perMonth = (times: number): Schedule => ({kind: 'frequency', times, period: 'month'});
const yes: Measurement = {kind: 'boolean'}, minutes: Measurement = {kind: 'duration', unit: 'minutes'}, hours: Measurement = {kind: 'duration', unit: 'hours'};
const count = (unit: string): Measurement => ({kind: 'count', unit}), quantity = (unit: string): Measurement => ({kind: 'quantity', unit});

export const HABIT_TEMPLATES: readonly HabitTemplate[] = [
  // Health
  {id: 'water', group: 'health', title: 'Drink water', note: '2 liters a day', category: 'Health', measurement: quantity('liters'), target: 2, schedule: daily},
  {id: 'fruit-veg', group: 'health', title: 'Eat fruit and vegetables', note: '5 portions a day', category: 'Health', measurement: count('portions'), target: 5, schedule: daily},
  {id: 'cook-home', group: 'health', title: 'Cook at home', note: '4 times a week', category: 'Health', measurement: yes, target: 1, schedule: perWeek(4)},
  {id: 'log-meals', group: 'health', title: 'Log your meals', note: 'Once a day, in Health', category: 'Health', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'no-sugary-drinks', group: 'health', title: 'Skip sugary drinks', note: 'A day without them', category: 'Health', type: 'quit', measurement: count('drinks'), target: 0, schedule: daily},
  {id: 'floss', group: 'health', title: 'Floss', note: 'Every evening', category: 'Health', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'daylight', group: 'health', title: 'Get some daylight', note: '15 minutes outside', category: 'Health', measurement: minutes, target: 15, schedule: daily, timeOfDay: 'morning'},
  // Mind
  {id: 'meditate', group: 'mind', title: 'Meditate', note: '10 minutes a day', category: 'Mind', measurement: minutes, target: 10, schedule: daily},
  {id: 'three-good-things', group: 'mind', title: 'Write three good things', note: 'Every evening', category: 'Mind', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'journal', group: 'mind', title: 'Journal', note: '10 minutes a day', category: 'Mind', measurement: minutes, target: 10, schedule: daily, timeOfDay: 'evening'},
  {id: 'breathing-break', group: 'mind', title: 'Take a breathing break', note: 'Twice a day', category: 'Mind', measurement: count('breaks'), target: 2, schedule: daily},
  {id: 'screen-free-hour', group: 'mind', title: 'A screen-free hour', note: 'Once a day', category: 'Mind', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'call-someone', group: 'mind', title: 'Call a friend or family member', note: 'Once a week', category: 'Mind', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'social-media-limit', group: 'mind', title: 'Keep social media short', note: 'At most 30 minutes a day', category: 'Mind', type: 'limit', measurement: minutes, target: 30, schedule: daily},
  // Fitness
  {id: 'walk', group: 'fitness', title: 'Walk', note: '8,000 steps a day', category: 'Movement', measurement: quantity('steps'), target: 8000, schedule: daily},
  {id: 'exercise', group: 'fitness', title: 'Exercise', note: '30 minutes on weekdays', category: 'Movement', measurement: minutes, target: 30, schedule: weekdays},
  {id: 'stretch', group: 'fitness', title: 'Stretch', note: '10 minutes a day', category: 'Movement', measurement: minutes, target: 10, schedule: daily, timeOfDay: 'morning'},
  {id: 'strength', group: 'fitness', title: 'Strength training', note: '3 times a week', category: 'Movement', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'run', group: 'fitness', title: 'Run', note: '3 times a week', category: 'Movement', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'cycle', group: 'fitness', title: 'Cycle', note: 'Twice a week', category: 'Movement', measurement: yes, target: 1, schedule: perWeek(2)},
  {id: 'stairs', group: 'fitness', title: 'Take the stairs', note: 'Every day', category: 'Movement', measurement: yes, target: 1, schedule: daily},
  // Learning
  {id: 'read', group: 'learning', title: 'Read', note: '30 minutes a day', category: 'Learning', measurement: minutes, target: 30, schedule: daily},
  {id: 'study', group: 'learning', title: 'Study', note: '1 hour on weekdays', category: 'Learning', measurement: hours, target: 1, schedule: weekdays},
  {id: 'language', group: 'learning', title: 'Practise a language', note: '15 minutes a day', category: 'Learning', measurement: minutes, target: 15, schedule: daily},
  {id: 'course', group: 'learning', title: 'Work on a course', note: '3 times a week', category: 'Learning', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'instrument', group: 'learning', title: 'Practise an instrument', note: '20 minutes a day', category: 'Learning', measurement: minutes, target: 20, schedule: daily},
  {id: 'write', group: 'learning', title: 'Write', note: '300 words a day', category: 'Learning', measurement: quantity('words'), target: 300, schedule: daily},
  {id: 'learn-something', group: 'learning', title: 'Learn something new', note: 'A talk, an article or a lesson, 3 times a week', category: 'Learning', measurement: yes, target: 1, schedule: perWeek(3)},
  // Money (no sums: the person sets their own)
  {id: 'budget-review', group: 'money', title: 'Review your budget', note: 'Once a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'put-aside', group: 'money', title: 'Put money aside', note: 'Once a week, any amount you choose', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'no-spend-day', group: 'money', title: 'A no-spend day', note: 'Once a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'note-spending', group: 'money', title: 'Write down what you spend', note: 'Every evening', category: 'Finance', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'goals-check-in', group: 'money', title: 'Check in on your goals', note: 'Once a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'bills-review', group: 'money', title: 'Look over your bills', note: 'Once a month', category: 'Finance', measurement: yes, target: 1, schedule: perMonth(1)},
  {id: 'money-reading', group: 'money', title: 'Read about personal finance', note: 'Twice a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(2)},
  // Chess
  {id: 'chess-game', group: 'chess', title: 'Play a game of chess', note: 'One a day', category: 'Chess', measurement: count('games'), target: 1, schedule: daily},
  {id: 'chess-puzzle', group: 'chess', title: 'Solve the daily puzzle', note: 'Every day', category: 'Chess', measurement: yes, target: 1, schedule: daily},
  {id: 'chess-tactics', group: 'chess', title: 'Practise tactics', note: '15 minutes a day', category: 'Chess', measurement: minutes, target: 15, schedule: daily},
  {id: 'chess-review', group: 'chess', title: 'Review one of your games', note: 'Once a week', category: 'Chess', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'chess-openings', group: 'chess', title: 'Study an opening', note: 'Twice a week', category: 'Chess', measurement: yes, target: 1, schedule: perWeek(2)},
  {id: 'chess-endgames', group: 'chess', title: 'Practise endgames', note: '3 times a week', category: 'Chess', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'chess-long-game', group: 'chess', title: 'Play a longer game', note: 'Rapid or classical, once a week', category: 'Chess', measurement: count('games'), target: 1, schedule: perWeek(1)},
  // Sleep
  {id: 'sleep-hours', group: 'sleep', title: 'Sleep 8 hours', note: 'Every night', category: 'Sleep', measurement: hours, target: 8, schedule: daily},
  {id: 'in-bed-by', group: 'sleep', title: 'In bed by 23:00', note: 'Every night', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'wind-down', group: 'sleep', title: 'Wind down without screens', note: '30 minutes before bed', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'same-wake-time', group: 'sleep', title: 'Wake up at the same time', note: 'Every day', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'no-late-caffeine', group: 'sleep', title: 'No caffeine after 14:00', note: 'Every day', category: 'Sleep', type: 'quit', measurement: count('drinks'), target: 0, schedule: daily, timeOfDay: 'afternoon'},
  {id: 'phone-out-of-bedroom', group: 'sleep', title: 'Phone out of the bedroom', note: 'Every night', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'read-before-sleep', group: 'sleep', title: 'Read before sleep', note: '15 minutes', category: 'Sleep', measurement: minutes, target: 15, schedule: daily, timeOfDay: 'evening'},
  // Home
  {id: 'tidy', group: 'home', title: 'Tidy up', note: '10 minutes a day', category: 'Home', measurement: minutes, target: 10, schedule: daily, timeOfDay: 'evening'},
  {id: 'make-bed', group: 'home', title: 'Make your bed', note: 'Every morning', category: 'Home', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'clear-dishes', group: 'home', title: 'Clear the dishes', note: 'Before bed', category: 'Home', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'water-plants', group: 'home', title: 'Water the plants', note: 'Twice a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(2)},
  {id: 'declutter', group: 'home', title: 'Declutter one thing', note: 'Every day', category: 'Home', measurement: count('things'), target: 1, schedule: daily},
  {id: 'laundry', group: 'home', title: 'Do the laundry', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'meal-plan', group: 'home', title: 'Plan the week’s meals', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
];
export const habitTemplate = (id: string) => HABIT_TEMPLATES.find(t => t.id === id);
/** A template as a complete new habit (the person can change anything afterwards). */
export function habitTemplateInputOf(t: HabitTemplate): HabitInput {
  return habitInputSchema.parse({title: t.title, category: t.category, description: t.note, notes: '', type: t.type ?? 'build', measurement: t.measurement, target: t.target, targetPeriod: 'day', schedule: t.schedule, timeOfDay: t.timeOfDay ?? 'anytime'});
}
/** Whether a habit like this one is already there (by title, ignoring case), so the welcome never adds it twice. */
export const hasHabitLike = (titles: readonly string[], t: HabitTemplate) => titles.some(title => title.trim().toLowerCase() === t.title.toLowerCase());
