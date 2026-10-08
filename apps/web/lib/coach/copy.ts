/**
 * Everything the Guide says (ADR-011 "Nudges: the copy table" and "Tone rules"), as data: fixed sentences written by
 * people, with placeholders that only an engine value fills. copy.test.ts checks the tone rules over this table.
 */
export const GUIDE_LABEL = 'Guide · on this device, no AI service';
export const GUIDE_NAME = 'Guide';
export type NudgeKind = 'review-ready' | 'habits-open' | 'streak-notice' | 'goal-next-date' | 'insight-ready' | 'quiet-day' | 'first-time';
export type NudgeCopy = {kind: NudgeKind; priority: number; heading: string; body: string; action: {label: string; href: string} | null; hideDays: number};
/** The milestones a streak notice marks, in days. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;
/** The device hour from which open habits are worth a word. */
export const EVENING_HOUR = 18;
export const NUDGES: readonly NudgeCopy[] = [
  {kind: 'review-ready', priority: 1, heading: 'Your weekly review is ready when you are.', body: 'It takes about five minutes.', action: {label: 'Open the review', href: '/app#for-you-weekly-review'}, hideDays: 1},
  {kind: 'habits-open', priority: 2, heading: '{n} of your habits {are} still open today: {titles}.', body: 'A small step counts.', action: {label: 'Open habits', href: '/app/habits'}, hideDays: 1},
  {kind: 'streak-notice', priority: 3, heading: '{title}: {n} days in a row today.', body: 'Worth noticing.', action: {label: 'Open habit', href: '/app/habits#habit-{habitId}'}, hideDays: 28},
  {kind: 'goal-next-date', priority: 4, heading: '{goal}: your plan’s next date is {when}.', body: 'Nothing moves by itself; this is just the date you chose.', action: {label: 'Open goal', href: '{href}'}, hideDays: 1},
  {kind: 'insight-ready', priority: 5, heading: 'A pattern from your own records is below.', body: 'It is a count, not a cause.', action: null, hideDays: 28},
  {kind: 'quiet-day', priority: 6, heading: 'Nothing is due today.', body: 'Rest is part of the plan.', action: null, hideDays: 7},
  {kind: 'first-time', priority: 7, heading: 'I read nothing but what you record here, on this device.', body: 'Add a habit or a goal and I will keep an eye on the dates.', action: {label: 'Open habits', href: '/app/habits'}, hideDays: 1},
];
/** The weekly review's summary paragraph (step 6): each clause from an engine count; zero is written out. */
export const SUMMARY_COPY = {
  lead: 'This week:',
  habitDays: (done: number, scheduled: number) => scheduled === 0 ? 'no habit days scheduled' : `${done} of ${scheduled} habit ${scheduled === 1 ? 'day' : 'days'} done`,
  waterDays: (days: number) => days === 0 ? 'no days with water logged' : `water logged on ${days} ${days === 1 ? 'day' : 'days'}`,
  weights: (count: number) => count === 0 ? 'no weights recorded' : `${count} ${count === 1 ? 'weight' : 'weights'} recorded`,
  contributions: (recorded: number, planned: number) => planned === 0 ? 'no planned contributions' : `${recorded} of ${planned} planned ${planned === 1 ? 'contribution' : 'contributions'} recorded`,
  intention: (text: string) => `Last week you wrote: ‘${text}’.`,
};
/** Words the Guide never uses (ADR-011 tone rules: no shame, no praise inflation, no urgency). */
export const FORBIDDEN_WORDS = ['failed', 'missed', 'only', 'should', 'must', 'behind', 'lazy', 'lost', 'broke', 'amazing', 'crushing', 'incredible', 'perfect', 'now', 'hurry', 'last chance', 'before it is too late'] as const;
