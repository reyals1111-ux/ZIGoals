import type {Pillar} from '../pillar-route';
import {templateById, type LibraryTemplate} from '../templates/goal-library';
import {HABIT_GROUP_LABEL, habitTemplate, type HabitTemplate} from '../templates/habits';
import {ROUTINE_TEMPLATES, type RoutineTemplate} from '../routines/templates';

/**
 * Session AJ (item 34, D13, A7): Guided journeys. Short programs the person chooses for themselves (never recommended to
 * them), built from the app's own templates: the goal library, the habit ideas and the routine templates. One step opens
 * each day, counted by the person's local date from the day they started. A step is something done in the app; its link
 * opens the existing flow (pre-filled where the app already has a pre-fill address), and the person ticks it done
 * themselves. Nothing is ever created for them.
 *
 * Templates are looked up when this module loads, so a renamed or removed template fails the build and the tests, not
 * the page. Copy is plain and kind; no step gives medical or financial advice, and each health or money program says so.
 */
export type GuidedAction = {kind: 'link'; href: `/app/${string}`; label: string};
export type GuidedStep = {id: string; title: string; note: string; action: GuidedAction};
export type GuidedProgram = {id: string; title: string; pillar: Pillar; summary: string;
  /** The program's care line: "not medical advice" or "not financial advice", shown on the card and the journey. */
  care?: string; steps: readonly GuidedStep[]};

function goal(id: string): LibraryTemplate {
  const t = templateById(id);
  if (!t) throw Error(`Guided journeys: the goal template "${id}" is missing from lib/templates/goal-library.ts.`);
  return t;
}
function habit(id: string): HabitTemplate {
  const t = habitTemplate(id);
  if (!t) throw Error(`Guided journeys: the habit template "${id}" is missing from lib/templates/habits.ts.`);
  return t;
}
function routine(id: RoutineTemplate['id']): RoutineTemplate {
  const t = ROUTINE_TEMPLATES.find(r => r.id === id);
  if (!t) throw Error(`Guided journeys: the routine template "${id}" is missing from lib/routines/templates.ts.`);
  return t;
}
/** Where a goal template opens: the same rule as the template library's own `templateHref` (components/goals). */
export function goalTemplateHref(t: LibraryTemplate): GuidedAction['href'] {
  return t.kind === 'average' ? `/app/goals/average/new?template=${t.id}` : t.kind === 'health-weight' ? '/app/goals#goals-health' : `/app/goals/new?template=${t.id}`;
}

/** A step that opens a goal template in the goal wizard (or the average form), pre-filled; nothing is saved until its own Save. */
const goalStep = (id: string, templateId: string, note: string): GuidedStep => {
  const t = goal(templateId);
  return {id, title: `Create the goal “${t.title}” from its template`, note, action: {kind: 'link', href: goalTemplateHref(t), label: 'Open the template'}};
};
/** Habits have no template address: the link opens the new-habit form, where "Start from an idea" lists this habit under
 *  its group (the note names the group from the template itself). */
const habitStep = (id: string, templateId: string, note: string): GuidedStep => {
  const t = habit(templateId);
  return {id, title: `Add the habit “${t.title}”`, note: `${note} In the form, choose “Start from an idea”, then ${HABIT_GROUP_LABEL[t.group]}.`, action: {kind: 'link', href: '/app/habits?add=habit', label: 'Open the new-habit form'}};
};
const routineStep = (id: string, routineId: RoutineTemplate['id'], note: string): GuidedStep => {
  const t = routine(routineId);
  return {id, title: `Add the ${t.title.toLowerCase()}`, note, action: {kind: 'link', href: '/app/habits#routines', label: 'Open Routines'}};
};
const link = (href: GuidedAction['href'], label: string): GuidedAction => ({kind: 'link', href, label});
const JOURNAL = link('/app/journal', 'Open your journal');
const REMINDERS = link('/app/settings/reminders', 'Open Reminders');
const GOALS = link('/app/goals', 'Open Goals');
const SLEEP = link('/app/health?view=sleep', 'Open Sleep');
const ACTIVITY = link('/app/health?tab=activity', 'Open Activity');
const MEDITATION = link('/app/health?view=meditation', 'Open Meditation');

const MONEY_CARE = 'Not financial advice; ZIGoals never moves money. Every amount is yours to choose.';
const BODY_CARE = 'Not medical advice; if something hurts or sleep stays hard, talk to a doctor.';
const MIND_CARE = 'Not medical advice; if worry or low mood stays with you, talk to a doctor.';

export const GUIDED_PROGRAMS: readonly GuidedProgram[] = [
  {id: 'emergency-fund', title: 'Start an emergency fund', pillar: 'wealth', care: MONEY_CARE,
    summary: 'A week of small steps toward a safety net: a goal, a weekly habit and a reminder.', steps: [
      goalStep('goal', 'emergency-fund', 'Today is only the name and the shape. The amount is yours, and you can change it any time.'),
      {id: 'costs', title: 'Write down one month of your costs', note: 'Rent, food, travel, bills: a rough list is enough. It helps you choose your first milestone.', action: JOURNAL},
      habitStep('put-aside', 'put-aside', 'Once a week, any amount you choose.'),
      habitStep('note-spending', 'note-spending', 'Two minutes in the evening. Seeing where money goes makes the next step easier.'),
      {id: 'reminder', title: 'Choose a time for your goal check-in', note: 'A check-in on the same day each week, for example payday, turns saving into a routine instead of a decision.', action: REMINDERS},
      habitStep('budget-review', 'budget-review', 'Once a week is plenty. Ten quiet minutes with a cup of something warm.'),
      {id: 'look-back', title: 'Look at your goal and your week', note: 'Whatever you managed this week counts. A safety net is built from small, steady steps.', action: GOALS},
    ]},
  {id: 'first-home', title: 'Save for a first home deposit', pillar: 'wealth', care: MONEY_CARE,
    summary: 'A week to set up a home deposit goal, a spending cap of your own and a weekly rhythm.', steps: [
      goalStep('goal', 'house-deposit', 'Name your goal and its milestones. The deposit amount is yours, and so is the date.'),
      {id: 'why', title: 'Write what a first home means to you', note: 'A few lines are enough. On a slow week, reading them again helps.', action: JOURNAL},
      habitStep('put-aside', 'put-aside', 'Once a week, any amount you choose.'),
      goalStep('cap', 'spend-cap', 'The cap is yours. It is an average of what you log, so one big day is fine.'),
      habitStep('no-spend-day', 'no-spend-day', 'One day a week with only the essentials. Pick the day that is easiest for you.'),
      {id: 'reminder', title: 'Choose a time for your goal check-in', note: 'A short weekly look keeps the goal close without it taking over.', action: REMINDERS},
      {id: 'look-back', title: 'Look at your goal and your week', note: 'A deposit takes a while. Every week you keep going is a good week.', action: GOALS},
    ]},
  {id: 'trip', title: 'Save for a trip', pillar: 'wealth', care: MONEY_CARE,
    summary: 'Six days to turn a trip you want into a plan and a savings goal.', steps: [
      goalStep('fund', 'holiday-fund', 'The amount and the date are yours. A rough figure is fine for now.'),
      goalStep('plan', 'trip-new-country', 'A second, small goal for the plan itself: choose the place, book it, go.'),
      {id: 'wishes', title: 'Write three things you want to do there', note: 'Food, a view, a walk, a museum: whatever makes the trip feel real.', action: JOURNAL},
      habitStep('put-aside', 'put-aside', 'Once a week, any amount you choose.'),
      habitStep('no-spend-day', 'no-spend-day', 'One quieter day a week. It adds up toward the trip.'),
      {id: 'look-back', title: 'Look at your two goals', note: 'When you choose the dates, tick off that milestone. That is a real step.', action: GOALS},
    ]},
  {id: 'sleep-reset', title: 'A sleep reset', pillar: 'health', care: BODY_CARE,
    summary: 'One week of small evening and morning changes, one at a time.', steps: [
      {id: 'log', title: 'Log last night’s sleep', note: 'Just as it was. No judging: this is your starting point.', action: SLEEP},
      habitStep('wake', 'same-wake-time', 'The same wake-up time, weekends too, is a steady anchor.'),
      habitStep('caffeine', 'no-late-caffeine', 'Coffee, tea and cola count. Something warm without caffeine is fine.'),
      habitStep('wind-down', 'wind-down', 'Thirty minutes before bed: a book, a bath, some quiet music. Log last night’s sleep too, if you like.'),
      routineStep('evening', 'evening', 'Tidy, a few lines in a journal, read, lights out. You can change or remove any step.'),
      habitStep('phone', 'phone-out-of-bedroom', 'A cheap alarm clock helps, if your phone is your alarm.'),
      goalStep('goal', 'sleep-7h', 'Only if a number helps you. It keeps a two-week average of what you log, and you choose the hours.'),
    ]},
  {id: 'walking-start', title: 'Start walking', pillar: 'health', care: BODY_CARE,
    summary: 'Eight days from a first short walk to a walking habit at your own pace.', steps: [
      {id: 'first-walk', title: 'Log a short walk', note: 'Ten minutes at an easy pace is a fine first day. Add it under “Add movement”.', action: ACTIVITY},
      habitStep('walk', 'walk', 'The form starts at 8,000 steps; set a number that feels easy for you.'),
      habitStep('daylight', 'daylight', 'A walk in the morning light counts for both.'),
      {id: 'reminder', title: 'Choose a reminder time for your walk', note: 'Pick a time you are usually free, like after lunch or after dinner.', action: REMINDERS},
      {id: 'second-walk', title: 'Log today’s walk', note: 'Same as day one, or a few minutes longer if you feel like it. Or not.', action: ACTIVITY},
      habitStep('stretch', 'stretch', 'Gentle and slow. Stop if anything hurts.'),
      goalStep('goal', 'steps-8000', 'Only if you want a number to aim at. It is a weekly average, and you can change the target.'),
      {id: 'look-back', title: 'Look back at your week of walking', note: 'Every walk you logged is there. However many there are, you started.', action: ACTIVITY},
    ]},
  {id: 'calm-mind', title: 'A calmer mind', pillar: 'habits', care: MIND_CARE,
    summary: 'A week of short, quiet practices: breathing, a few words, a calm morning.', steps: [
      {id: 'sit', title: 'Try a short meditation', note: 'Two or three minutes is enough. Sit comfortably and notice your breath.', action: MEDITATION},
      habitStep('breathe', 'breathing-break', 'A minute of slow breathing, twice a day.'),
      habitStep('good-things', 'three-good-things', 'Small things count: a warm drink, a kind message, the light in the afternoon.'),
      {id: 'write', title: 'Write a few lines about today', note: 'No need to be clever or complete. Just what is on your mind.', action: JOURNAL},
      habitStep('screen-free', 'screen-free-hour', 'One hour, any time of day. Evenings are often easiest.'),
      routineStep('morning', 'morning', 'Water, a stretch, a few quiet minutes, a plan for the day. You can change any step.'),
      goalStep('goal', 'meditate-100', 'If a longer aim helps you, here is one. If not, simply keep going as you are.'),
    ]},
  {id: 'reading-start', title: 'A reading habit', pillar: 'goals',
    summary: 'Six days to make room for books again, a few pages at a time.', steps: [
      habitStep('read', 'read', 'The form starts at 30 minutes; ten is a fine start.'),
      goalStep('goal', 'read-12', 'Twelve is the template’s number. Change it to whatever feels right.'),
      {id: 'book', title: 'Write down the book you are reading', note: 'Its name and why you picked it. One line is enough.', action: JOURNAL},
      habitStep('bedtime', 'read-before-sleep', 'Fifteen minutes with a paper book is a calm way to end the day.'),
      {id: 'reminder', title: 'Choose a reminder time for reading', note: 'Pair it with something you already do, like after dinner.', action: REMINDERS},
      {id: 'look-back', title: 'Look at your reading goal', note: 'When you finish a book, tick it off. Every chapter along the way counts too.', action: GOALS},
    ]},
];

export const programById = (id: string): GuidedProgram | undefined => GUIDED_PROGRAMS.find(p => p.id === id);
