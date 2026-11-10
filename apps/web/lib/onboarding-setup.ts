import * as z from 'zod';
import {ONBOARDING_SETUP_KEY} from './aa-device-keys';
import type {DeviceRecordSpec} from './device-record';
import {habitTemplate, type HabitTemplate} from './templates/habits';

/**
 * S4: what the personalised welcome set up (habit ids, a goal id, widget ids, the pages shown), kept on this device for
 * a day so "Undo setup" on Today's welcome card can take it back through the stores' own removers; nothing here is a
 * record of the person's own, and a later build ignores it (ADR-022 B1).
 */
export const FOCUS_IDS = ['sleep', 'move', 'water', 'read', 'meditate', 'eat-well', 'save', 'debt', 'learn', 'focus-work', 'connect', 'tidy'] as const;
export type FocusId = (typeof FOCUS_IDS)[number];
export type Focus = {id: FocusId; pillar: 'habits' | 'health' | 'goals' | 'wealth'; title: string; blurb: string; habits: string[]; goal?: {name: string; category: 'Emergency Fund' | 'Travel' | 'Education' | 'Custom'}; widgets: ('habits' | 'health' | 'sleep' | 'meditation' | 'goals' | 'wealth')[]};
/** Session AK P4 (FR-8): the saving focus's habit, said as what it is ("Contribute" read as "contribute what?"). */
export const SAVING_HABIT = 'Put money aside';
export const FOCUSES: readonly Focus[] = [
  {id: 'sleep', pillar: 'health', title: 'Sleep better', blurb: 'A bedtime and a wind-down.', habits: ['Lights out by 23:00'], widgets: ['sleep']},
  {id: 'move', pillar: 'health', title: 'Move more', blurb: 'A daily walk, counted.', habits: ['Walk'], widgets: ['health', 'habits']},
  {id: 'water', pillar: 'health', title: 'Drink more water', blurb: 'A glass at a time.', habits: ['Drink water'], widgets: ['health']},
  {id: 'eat-well', pillar: 'health', title: 'Eat well', blurb: 'Log meals and see your week.', habits: [], widgets: ['health']},
  {id: 'read', pillar: 'habits', title: 'Read more', blurb: 'Twenty minutes with a book.', habits: ['Read'], widgets: ['habits']},
  {id: 'meditate', pillar: 'habits', title: 'Meditate', blurb: 'Ten quiet minutes.', habits: ['Meditate'], widgets: ['meditation', 'habits']},
  {id: 'learn', pillar: 'habits', title: 'Learn something', blurb: 'An hour of study on weekdays.', habits: ['Study'], widgets: ['habits']},
  {id: 'focus-work', pillar: 'habits', title: 'Deep work', blurb: 'One focused block a day.', habits: ['Deep work'], widgets: ['habits']},
  {id: 'connect', pillar: 'habits', title: 'Stay in touch', blurb: 'Reach out to someone.', habits: ['Call a friend'], widgets: ['habits']},
  {id: 'tidy', pillar: 'habits', title: 'Keep things tidy', blurb: 'Ten minutes a day.', habits: ['Tidy up'], widgets: ['habits']},
  {id: 'save', pillar: 'goals', title: 'Save for something', blurb: 'An emergency fund or a trip.', habits: [SAVING_HABIT], goal: {name: 'Emergency fund', category: 'Emergency Fund'}, widgets: ['goals', 'wealth']},
  {id: 'debt', pillar: 'wealth', title: 'Pay off a debt', blurb: 'Track it going down.', habits: [], widgets: ['wealth']},
];
export const onboardingSetupSchema = z.looseObject({version: z.literal(1), at: z.iso.datetime(), habitIds: z.array(z.string().min(1).max(100)).max(50), goalId: z.string().min(1).max(100).optional(), widgetIds: z.array(z.string().min(1).max(100)).max(50), focuses: z.array(z.enum(FOCUS_IDS)).max(12), /** Session AK P4 (FR-4): Today's "You're set" card was closed (optional; absent: not yet). */ landingClosed: z.boolean().optional(), undone: z.boolean().optional(), /** Session AL fourth pass (NB-241): each page or button the setup switched, with how it was before (optional; absent: none recorded), so Undo setup can put it back. */ pages: z.array(z.object({id: z.string().min(1).max(40), was: z.boolean()})).max(40).optional().catch(undefined)});
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

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-4): Today's one-time "You're set" card after the welcome. It
 * shows in the welcome card's own place while the setup made something, was not undone, is under a day old and the card
 * was not closed; it leaves by itself once one of the setup's habits is ticked today.
 */
export function setupLanding(s: OnboardingSetup, now: Date, state: {goalName?: string; habitsToday: number; tickedToday: boolean}): {goal?: string; habits: number} | null {
  if (s.landingClosed || state.tickedToday || !setupUndoable(s, now)) return null;
  if (!state.goalName && state.habitsToday === 0) return null;
  return {...(state.goalName ? {goal: state.goalName} : {}), habits: state.habitsToday};
}
/** The card's one line ("Your goal “Emergency fund” · 2 habits for today"). */
export function setupLandingLine(l: {goal?: string; habits: number}): string {
  return [l.goal && `Your goal “${l.goal}”`, l.habits > 0 && `${l.habits} ${l.habits === 1 ? 'habit' : 'habits'} for today`].filter(Boolean).join(' · ');
}
/** The tab-only note the welcome leaves for Today (sessionStorage, never a record): Today moves the focus to the card once. */
export const LANDING_NOTE = 'zigoals:welcome-landing';

/**
 * Session AK P4 (FR-8): a habit a focus suggests, as the welcome creates it. Most are daily "Wellbeing" check-ins; putting
 * money aside is weekly, under "Money", and linked to the goal the same setup creates (its id is known at Finish).
 */
export function focusHabitInput(title: string, goalId?: string) {
  const saving = title === SAVING_HABIT;
  return {title, category: saving ? 'Money' : 'Wellbeing', description: saving ? 'Once a week, move a little toward your goal.' : '', notes: '',
    ...(saving && goalId ? {goalLink: {chainId: 'private', owner: 'local', goalId}} : {}),
    type: 'build' as const, measurement: {kind: 'boolean' as const}, schedule: saving ? {kind: 'frequency' as const, times: 1, period: 'week' as const} : {kind: 'daily' as const},
    target: 1, targetPeriod: 'day' as const, timeOfDay: 'anytime' as const, endCondition: {kind: 'none' as const}};
}
/**
 * Session AL release review (RR-15): the habit a focus's card describes is the habit the welcome makes. A focus habit that a
 * starter template carries is made from that template, with the card's own amount where it differs from the template's
 * ("Read more · Twenty minutes with a book" makes Read, 20 minutes a day, not the library's 30; "Meditate · Ten quiet
 * minutes" makes Meditate, 10 minutes a day, never a yes/no "1 / 1 per day"). Keyed by template id. The Habits page's own
 * ideas keep the library's amounts.
 */
const FOCUS_TEMPLATES: Readonly<Record<string, {template: string; focus: FocusId; target?: number; note?: string}>> = {
  'Walk': {template: 'walk', focus: 'move'},
  'Drink water': {template: 'water', focus: 'water'},
  'Read': {template: 'read', focus: 'read', target: 20, note: '20 minutes a day'},
  'Meditate': {template: 'meditate', focus: 'meditate'},
  'Study': {template: 'study', focus: 'learn'},
  'Tidy up': {template: 'tidy', focus: 'tidy'},
};
/** A starter as the welcome makes it: a picked focus that names this template sets its amount (RR-15); otherwise unchanged. */
export function focusStarter(t: HabitTemplate, focuses: readonly FocusId[]): HabitTemplate {
  const shape = Object.values(FOCUS_TEMPLATES).find(f => f.template === t.id && focuses.includes(f.focus));
  return shape ? {...t, ...(shape.target !== undefined ? {target: shape.target} : {}), ...(shape.note ? {note: shape.note} : {})} : t;
}
/** The template a focus habit is made from (with the focus's amount), or null when no template carries it (RR-15). */
export function focusHabitTemplate(title: string): HabitTemplate | null {
  const shape = FOCUS_TEMPLATES[title], t = shape ? habitTemplate(shape.template) : undefined;
  return t ? focusStarter(t, [shape!.focus]) : null;
}
/** How often a focus's habit repeats, as its tick box says it ("From your focus · weekly"). */
export const focusHabitRhythm = (title: string): string => title === SAVING_HABIT ? 'weekly' : 'daily';

/**
 * Session AL fourth pass (NB-006): the name ZIGi may call the person, if they give one in the welcome (optional, at most
 * 40 characters, kept on this device only and never synced). Absent or empty: no name, and nothing greets by one.
 */
export const PROFILE_NAME_KEY = 'zigoals:profile-name:v1';
export const profileNameSchema = z.looseObject({version: z.literal(1), name: z.string().max(40).catch(''), at: z.iso.datetime().optional().catch(undefined)});
export type ProfileName = z.infer<typeof profileNameSchema>;
export const PROFILE_NAME: DeviceRecordSpec<ProfileName> = {key: PROFILE_NAME_KEY, schema: profileNameSchema, empty: () => ({version: 1, name: ''})};
/** A typed name as it is kept: control characters out, spaces folded, at most 40 characters; empty when nothing is left. */
export function cleanProfileName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
}
