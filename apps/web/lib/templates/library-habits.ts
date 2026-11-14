import type {HabitInput} from '../habits';
import type {HabitTemplate} from './habits';

/**
 * Backlog #15 (AL-COMPETITOR-GAP-118): the template library's added habit ideas, in Habits' own idea shape
 * (`HabitTemplate`), joined into HABIT_TEMPLATES (lib/templates/habits.ts), so Habit ideas adds them exactly as it adds
 * the others (Habits' `createHabit` through `habitTemplateInputOf`). The same rules: calm words, amounts are common
 * starting points the person changes, money ideas hold no number, and nothing is health or money advice.
 */
type Schedule = HabitInput['schedule'];
type Measurement = HabitInput['measurement'];
const daily: Schedule = {kind: 'daily'}, weekdays: Schedule = {kind: 'weekdays', days: [1, 2, 3, 4, 5]};
const perWeek = (times: number): Schedule => ({kind: 'frequency', times, period: 'week'});
const perMonth = (times: number): Schedule => ({kind: 'frequency', times, period: 'month'});
const yes: Measurement = {kind: 'boolean'}, minutes: Measurement = {kind: 'duration', unit: 'minutes'};
const count = (unit: string): Measurement => ({kind: 'count', unit});

export const LIBRARY_HABITS: readonly HabitTemplate[] = [
  // Health
  {id: 'eye-breaks', group: 'health', title: 'Rest your eyes from the screen', note: 'A few short breaks a day', category: 'Health', measurement: count('breaks'), target: 3, schedule: weekdays},
  {id: 'posture-check', group: 'health', title: 'Check your posture', note: 'Twice a day', category: 'Health', measurement: count('checks'), target: 2, schedule: daily},
  {id: 'brush-teeth', group: 'health', title: 'Brush your teeth', note: 'Morning and evening', category: 'Health', measurement: count('times'), target: 2, schedule: daily},
  {id: 'walk-after-meal', group: 'health', title: 'A short walk after a meal', note: 'Once a day', category: 'Health', measurement: yes, target: 1, schedule: daily},
  // Mind
  {id: 'time-in-nature', group: 'mind', title: 'Time in nature', note: '20 minutes, 3 times a week', category: 'Mind', measurement: minutes, target: 20, schedule: perWeek(3)},
  {id: 'body-scan', group: 'mind', title: 'A short body scan', note: '5 minutes in the evening', category: 'Mind', measurement: minutes, target: 5, schedule: daily, timeOfDay: 'evening'},
  {id: 'phone-free-morning', group: 'mind', title: 'A phone-free first hour', note: 'Every morning', category: 'Mind', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'mood-note', group: 'mind', title: 'Note your mood', note: 'A word or two each evening', category: 'Mind', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  // Fitness
  {id: 'yoga', group: 'fitness', title: 'Yoga', note: '15 minutes, 3 times a week', category: 'Movement', measurement: minutes, target: 15, schedule: perWeek(3)},
  {id: 'swim', group: 'fitness', title: 'Swim', note: 'Once a week', category: 'Movement', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'push-ups', group: 'fitness', title: 'Push-ups', note: '10 a day, or what feels right', category: 'Movement', measurement: count('push-ups'), target: 10, schedule: daily},
  {id: 'plank', group: 'fitness', title: 'Plank', note: '1 minute a day', category: 'Movement', measurement: minutes, target: 1, schedule: daily},
  {id: 'dance', group: 'fitness', title: 'Dance', note: '15 minutes, twice a week', category: 'Movement', measurement: minutes, target: 15, schedule: perWeek(2)},
  {id: 'balance', group: 'fitness', title: 'Balance practice', note: '5 minutes a day', category: 'Movement', measurement: minutes, target: 5, schedule: daily},
  // Learning
  {id: 'new-words', group: 'learning', title: 'Learn five new words', note: 'In any language', category: 'Learning', measurement: count('words'), target: 5, schedule: daily},
  {id: 'learning-podcast', group: 'learning', title: 'Listen to a learning podcast', note: 'Twice a week', category: 'Learning', measurement: yes, target: 1, schedule: perWeek(2)},
  {id: 'flashcards', group: 'learning', title: 'Review flashcards', note: '10 minutes a day', category: 'Learning', measurement: minutes, target: 10, schedule: daily},
  {id: 'documentary', group: 'learning', title: 'Watch a documentary', note: 'Once a week', category: 'Learning', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'summarise-reading', group: 'learning', title: 'Summarise what you read', note: 'A few lines, once a week', category: 'Learning', measurement: yes, target: 1, schedule: perWeek(1)},
  // Money (no numbers: the person sets their own)
  {id: 'check-balance', group: 'money', title: 'Check your account balance', note: 'Once a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'check-subscription', group: 'money', title: 'Look over one subscription', note: 'Once a month', category: 'Finance', measurement: yes, target: 1, schedule: perMonth(1)},
  {id: 'file-receipts', group: 'money', title: 'File your receipts', note: 'Once a week', category: 'Finance', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'wait-before-buying', group: 'money', title: 'Wait a day before buying extras', note: 'Whenever something tempts you', category: 'Finance', measurement: yes, target: 1, schedule: daily},
  {id: 'money-talk', group: 'money', title: 'Talk money with your partner', note: 'Once a month, calmly', category: 'Finance', measurement: yes, target: 1, schedule: perMonth(1)},
  // Chess
  {id: 'chess-annotate', group: 'chess', title: 'Play through a master game', note: 'Once a week', category: 'Chess', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'chess-calculation', group: 'chess', title: 'Calculation practice', note: '10 minutes, 3 times a week', category: 'Chess', measurement: minutes, target: 10, schedule: perWeek(3)},
  // Sleep
  {id: 'sleep-note', group: 'sleep', title: 'Note how you slept', note: 'Every morning', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'bedtime-stretch', group: 'sleep', title: 'A gentle stretch before bed', note: '5 minutes', category: 'Sleep', measurement: minutes, target: 5, schedule: daily, timeOfDay: 'evening'},
  {id: 'dim-lights', group: 'sleep', title: 'Dim the lights after 21:00', note: 'Every evening', category: 'Sleep', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  // Home
  {id: 'wipe-kitchen', group: 'home', title: 'Wipe down the kitchen', note: 'Every evening', category: 'Home', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'bins', group: 'home', title: 'Take out the bins', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'change-sheets', group: 'home', title: 'Change the bed sheets', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'air-rooms', group: 'home', title: 'Air the rooms', note: 'Every morning', category: 'Home', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'fix-small-thing', group: 'home', title: 'Fix one small thing', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'sort-post', group: 'home', title: 'Sort the post', note: 'Once a week', category: 'Home', measurement: yes, target: 1, schedule: perWeek(1)},
  // Food
  {id: 'veg-at-dinner', group: 'food', title: 'Vegetables at dinner', note: 'Every evening', category: 'Food', measurement: yes, target: 1, schedule: daily, timeOfDay: 'evening'},
  {id: 'breakfast', group: 'food', title: 'Eat breakfast', note: 'Every morning', category: 'Food', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'new-recipe', group: 'food', title: 'Try a new recipe', note: 'Once a week', category: 'Food', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'pack-lunch', group: 'food', title: 'Pack a lunch', note: 'On weekdays', category: 'Food', measurement: yes, target: 1, schedule: weekdays},
  {id: 'fruit-snack', group: 'food', title: 'Fruit as a snack', note: 'Once a day', category: 'Food', measurement: yes, target: 1, schedule: daily},
  {id: 'screen-free-meal', group: 'food', title: 'One meal without screens', note: 'Once a day', category: 'Food', measurement: yes, target: 1, schedule: daily},
  {id: 'water-on-waking', group: 'food', title: 'A glass of water on waking', note: 'Every morning', category: 'Food', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'beans-lentils', group: 'food', title: 'Beans or lentils in a meal', note: '3 times a week', category: 'Food', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'bake', group: 'food', title: 'Bake something', note: 'Once a month', category: 'Food', measurement: yes, target: 1, schedule: perMonth(1)},
  // Work & career
  {id: 'plan-tomorrow', group: 'work', title: 'Plan tomorrow’s work', note: 'Before you finish', category: 'Work', measurement: yes, target: 1, schedule: weekdays, timeOfDay: 'afternoon'},
  {id: 'focus-block', group: 'work', title: 'A focused work block', note: '60 minutes on weekdays', category: 'Work', measurement: minutes, target: 60, schedule: weekdays, timeOfDay: 'morning'},
  {id: 'email-set-times', group: 'work', title: 'Check email at set times', note: 'On weekdays', category: 'Work', measurement: yes, target: 1, schedule: weekdays},
  {id: 'movement-breaks', group: 'work', title: 'Short movement breaks', note: '4 a workday', category: 'Work', measurement: count('breaks'), target: 4, schedule: weekdays},
  {id: 'work-skill', group: 'work', title: 'Learn a work skill', note: '20 minutes, 3 times a week', category: 'Work', measurement: minutes, target: 20, schedule: perWeek(3)},
  {id: 'end-workday', group: 'work', title: 'End the workday on time', note: 'On weekdays', category: 'Work', measurement: yes, target: 1, schedule: weekdays, timeOfDay: 'evening'},
  {id: 'weekly-wins', group: 'work', title: 'Note the week’s wins', note: 'Once a week', category: 'Work', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'reach-out', group: 'work', title: 'Message someone in your field', note: 'Once a week', category: 'Work', measurement: yes, target: 1, schedule: perWeek(1)},
  // Relationships
  {id: 'message-friend', group: 'people', title: 'Message a friend', note: 'Once a day', category: 'Relationships', measurement: yes, target: 1, schedule: daily},
  {id: 'eat-together', group: 'people', title: 'Eat together', note: 'Phones away, 3 times a week', category: 'Relationships', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'say-something-kind', group: 'people', title: 'Say something kind', note: 'Once a day', category: 'Relationships', measurement: yes, target: 1, schedule: daily},
  {id: 'partner-time', group: 'people', title: 'Time with your partner', note: '20 minutes a day', category: 'Relationships', measurement: minutes, target: 20, schedule: daily, timeOfDay: 'evening'},
  {id: 'visit-someone', group: 'people', title: 'Visit someone', note: 'Once a week', category: 'Relationships', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'play-with-kids', group: 'people', title: 'Play with the kids', note: '15 minutes a day', category: 'Relationships', measurement: minutes, target: 15, schedule: daily},
  {id: 'thank-someone', group: 'people', title: 'Thank someone', note: 'Once a day', category: 'Relationships', measurement: yes, target: 1, schedule: daily},
  // Creativity
  {id: 'sketch', group: 'creativity', title: 'Sketch', note: '10 minutes a day', category: 'Creativity', measurement: minutes, target: 10, schedule: daily},
  {id: 'morning-pages', group: 'creativity', title: 'Write morning pages', note: 'Every morning', category: 'Creativity', measurement: yes, target: 1, schedule: daily, timeOfDay: 'morning'},
  {id: 'photo-you-like', group: 'creativity', title: 'Take a photo you like', note: 'Once a day', category: 'Creativity', measurement: yes, target: 1, schedule: daily},
  {id: 'make-by-hand', group: 'creativity', title: 'Make something by hand', note: '3 times a week', category: 'Creativity', measurement: yes, target: 1, schedule: perWeek(3)},
  {id: 'make-music', group: 'creativity', title: 'Make music', note: '20 minutes, 3 times a week', category: 'Creativity', measurement: minutes, target: 20, schedule: perWeek(3)},
  {id: 'short-poem', group: 'creativity', title: 'Write a short poem', note: 'Once a week', category: 'Creativity', measurement: yes, target: 1, schedule: perWeek(1)},
  {id: 'note-an-idea', group: 'creativity', title: 'Note an idea', note: 'One a day', category: 'Creativity', measurement: count('ideas'), target: 1, schedule: daily},
];
