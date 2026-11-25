import {FOCUSES, type FocusId} from '../../lib/onboarding-setup';

/**
 * Session AW Part 3 (simplicity c): the order of "Your first five" after Today. The setup's focuses (lib/onboarding-setup.ts,
 * recorded on this device) put the step for what the person came for first, so each reaches their daily thing in one tap:
 * money (Tom: "Save for something", "Pay off a debt"), a meal (Lina: "Eat well", "Drink more water"), a habit (Sanne,
 * Jules, Max: "Read more", "Meditate", "Sleep better", "Move more" and the other habit focuses). Without focuses the order is
 * the first five's own (a goal, a habit, a meal, money), so nothing changes for a setup that chose none.
 */
export const FIRST_FIVE_STEPS = ['goal', 'habit', 'meal', 'money'] as const;
export type FirstFiveStep = typeof FIRST_FIVE_STEPS[number];
const FOR_FOCUS: Readonly<Record<FocusId, readonly FirstFiveStep[]>> = {
  save: ['money', 'goal'], debt: ['money'],
  'eat-well': ['meal'], water: ['meal'], move: ['habit', 'meal'],
  sleep: ['habit'], read: ['habit'], meditate: ['habit'], learn: ['habit'], 'focus-work': ['habit'], connect: ['habit'], tidy: ['habit'],
};
export function firstFiveOrder(focuses: readonly FocusId[]): FirstFiveStep[] {
  const known = focuses.filter((f): f is FocusId => FOCUSES.some(x => x.id === f));
  return [...new Set([...known.flatMap(f => FOR_FOCUS[f]), ...FIRST_FIVE_STEPS])];
}
