import type {PrivateGoal} from '../positions';

/**
 * Starter goals for the welcome (Session W Part 3; Goals v2 adds more kinds and its own picker in Part 11). A template
 * gives only the kind and a placeholder: the name, the target and the currency are always the person's own.
 */
export type GoalTemplate = {category: NonNullable<PrivateGoal['category']>; label: string; placeholder: string};
export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {category: 'Emergency Fund', label: 'A safety net', placeholder: 'Emergency fund'},
  {category: 'Travel', label: 'A trip', placeholder: 'A trip I’m planning'},
  {category: 'First Home', label: 'A home', placeholder: 'My first home'},
  {category: 'Education', label: 'Learning', placeholder: 'A course I want to take'},
  {category: 'Financial Freedom', label: 'Freedom', placeholder: 'More freedom, later'},
  {category: 'Custom', label: 'Something else', placeholder: 'Name your goal'},
];

/**
 * Goal ideas in the Goal creator (Session W Part 11): a name, the kind of progress and, for a project, steps the person
 * ticks off themselves. Amounts, currencies and dates are always the person's own; no idea suggests a sum, a rate or a
 * weight. A weight goal belongs with Health goals (its progress comes from the Health journal), so that idea is a link.
 */
export type GoalIdea = {id: string; label: string; name: string; type: 'VALUE' | 'PROJECT'; category: NonNullable<PrivateGoal['category']>; milestones?: readonly string[]; note: string};
export const GOAL_IDEAS: readonly GoalIdea[] = [
  {id: 'emergency-fund', label: 'Emergency fund', name: 'Emergency fund', type: 'VALUE', category: 'Emergency Fund', note: 'A safety net in your currency; the amount is yours.'},
  {id: 'holiday', label: 'A holiday', name: 'Holiday', type: 'VALUE', category: 'Travel', note: 'Save for a trip, by a date if you like.'},
  {id: 'house-deposit', label: 'House deposit', name: 'House deposit', type: 'VALUE', category: 'First Home', note: 'Toward a home of your own.'},
  {id: 'run-10k', label: 'Run a 10K', name: 'Run a 10K', type: 'PROJECT', category: 'Custom', milestones: ['Run 3 km without stopping', 'Run 5 km', 'Run 8 km', 'Run 10 km'], note: 'Steps you tick off yourself.'},
  {id: 'read-20-books', label: 'Read 20 books', name: 'Read 20 books', type: 'PROJECT', category: 'Education', milestones: ['5 books', '10 books', '15 books', '20 books'], note: 'Tick off each five.'},
  {id: 'chess-rating', label: 'A chess rating', name: 'Reach my chess rating goal', type: 'PROJECT', category: 'Education', milestones: ['Play 20 rated games', 'Review 10 of my games', 'Reach my target rating'], note: 'Your target rating, your steps.'},
  {id: 'language', label: 'Learn a language', name: 'Learn a language', type: 'PROJECT', category: 'Education', milestones: ['A first lesson', 'A month of practice', 'A first conversation'], note: 'Steps you can rename.'},
];
