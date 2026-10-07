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
