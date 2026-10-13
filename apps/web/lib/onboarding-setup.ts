import * as z from 'zod';
import {ONBOARDING_SETUP_KEY} from './aa-device-keys';
import type {DeviceRecordSpec} from './device-record';

/**
 * S4: what the personalised welcome set up (habit ids, a goal id, widget ids, the pages shown), kept on this device for
 * a day so "Undo setup" on Today's welcome card can take it back through the stores' own removers; nothing here is a
 * record of the person's own, and a later build ignores it (ADR-022 B1).
 */
export const FOCUS_IDS = ['sleep', 'move', 'water', 'read', 'meditate', 'eat-well', 'save', 'debt', 'learn', 'focus-work', 'connect', 'tidy'] as const;
export type FocusId = (typeof FOCUS_IDS)[number];
export type Focus = {id: FocusId; pillar: 'habits' | 'health' | 'goals' | 'wealth'; title: string; blurb: string; habits: string[]; goal?: {name: string; category: 'Emergency Fund' | 'Travel' | 'Education' | 'Custom'}; widgets: ('habits' | 'health' | 'sleep' | 'meditation' | 'goals' | 'wealth')[]};
export const FOCUSES: readonly Focus[] = [
  {id: 'sleep', pillar: 'health', title: 'Sleep better', blurb: 'A bedtime and a wind-down.', habits: ['Lights out by 23:00'], widgets: ['sleep']},
  {id: 'move', pillar: 'health', title: 'Move more', blurb: 'A daily walk, counted.', habits: ['Walk'], widgets: ['health', 'habits']},
  {id: 'water', pillar: 'health', title: 'Drink more water', blurb: 'A glass at a time.', habits: ['Drink water'], widgets: ['health']},
  {id: 'eat-well', pillar: 'health', title: 'Eat well', blurb: 'Log meals and see your week.', habits: [], widgets: ['health']},
  {id: 'read', pillar: 'habits', title: 'Read more', blurb: 'Twenty minutes with a book.', habits: ['Read'], widgets: ['habits']},
  {id: 'meditate', pillar: 'habits', title: 'Meditate', blurb: 'Ten quiet minutes.', habits: ['Meditate'], widgets: ['meditation', 'habits']},
  {id: 'learn', pillar: 'habits', title: 'Learn something', blurb: 'A little study each day.', habits: ['Study'], widgets: ['habits']},
  {id: 'focus-work', pillar: 'habits', title: 'Deep work', blurb: 'One focused block a day.', habits: ['Deep work'], widgets: ['habits']},
  {id: 'connect', pillar: 'habits', title: 'Stay in touch', blurb: 'Reach out to someone.', habits: ['Call a friend'], widgets: ['habits']},
  {id: 'tidy', pillar: 'habits', title: 'Keep things tidy', blurb: 'Ten minutes a day.', habits: ['Tidy up'], widgets: ['habits']},
  {id: 'save', pillar: 'goals', title: 'Save for something', blurb: 'An emergency fund or a trip.', habits: ['Contribute'], goal: {name: 'Emergency fund', category: 'Emergency Fund'}, widgets: ['goals', 'wealth']},
  {id: 'debt', pillar: 'wealth', title: 'Pay off a debt', blurb: 'Track it going down.', habits: [], widgets: ['wealth']},
];
export const onboardingSetupSchema = z.looseObject({version: z.literal(1), at: z.iso.datetime(), habitIds: z.array(z.string().min(1).max(100)).max(50), goalId: z.string().min(1).max(100).optional(), widgetIds: z.array(z.string().min(1).max(100)).max(50), focuses: z.array(z.enum(FOCUS_IDS)).max(12), undone: z.boolean().optional()});
export type OnboardingSetup = z.infer<typeof onboardingSetupSchema>;
export const emptyOnboardingSetup = (): OnboardingSetup => ({version: 1, at: '1970-01-01T00:00:00.000Z', habitIds: [], widgetIds: [], focuses: []});
export const ONBOARDING_SETUP: DeviceRecordSpec<OnboardingSetup> = {key: ONBOARDING_SETUP_KEY, schema: onboardingSetupSchema, empty: emptyOnboardingSetup};
export const UNDO_SETUP_HOURS = 24;
export const setupUndoable = (s: OnboardingSetup, now: Date) => !s.undone && (s.habitIds.length > 0 || !!s.goalId || s.widgetIds.length > 0) && now.getTime() - Date.parse(s.at) < UNDO_SETUP_HOURS * 3_600_000;
/** The focuses' suggestions for the chosen pillars: habit titles and the goal, in order, without twins. */
export function suggestionsFor(focuses: readonly FocusId[]): {habits: string[]; goal: Focus['goal'] | null; widgets: Focus['widgets']} {
  const picked = FOCUSES.filter(f => focuses.includes(f.id));
  return {habits: [...new Set(picked.flatMap(f => f.habits))], goal: picked.find(f => f.goal)?.goal ?? null, widgets: [...new Set(picked.flatMap(f => f.widgets))]};
}
