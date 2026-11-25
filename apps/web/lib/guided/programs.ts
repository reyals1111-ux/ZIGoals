import type {Pillar} from '../pillar-route';
import {templateById, type LibraryTemplate} from '../templates/goal-library';
import {HABIT_GROUP_LABEL, habitTemplate, type HabitTemplate} from '../templates/habits';
import {ROUTINE_TEMPLATES, type RoutineTemplate} from '../routines/templates';
import {GUIDES} from '../meditation/guides';
import {goalTemplateHref} from './template-href';

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
/**
 * Session AW (programmes; owner decision 1d, ADR-046): a written programme is a program with `days`. Each day has a few
 * steps, each with its written instruction (`detail`) and a link to the place in the app where it is done. A day opens on
 * the start date plus its `offset` (so a weekly plan leaves rest days between sessions); a day stays open once it opened.
 * The program's `steps` are its days, one each (same id, title and note), so everything that reads a journey's steps
 * (and builds #37–#59, which know only `steps`) sees the days.
 */
export type ProgrammeStep = {id: string; title: string; detail: string; action: GuidedAction};
export type ProgrammeDay = {id: string; offset: number; week?: number; title: string; note: string; steps: readonly ProgrammeStep[]};
export type GuidedProgram = {id: string; title: string; pillar: Pillar; summary: string;
  /** The program's care line: "not medical advice" or "not financial advice", shown on the card and the journey. */
  care?: string; steps: readonly GuidedStep[];
  /** Session AW: a written programme's days, its word for a day ("Day", "Session", "Run") and, for a weekly plan, its weeks. */
  days?: readonly ProgrammeDay[]; dayWord?: 'Day' | 'Session' | 'Run'; weeks?: number};

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
export {goalTemplateHref};

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

// ---------------------------------------------------------------------------------------------------------------------
// Session AW (programmes; owner decision 1d, ADR-046; ledger #54, #72 written part, #78, #113, #120, #125, #330): five
// written programmes. Text only, written for ZIGoals; no audio or video (Read aloud uses the device's own voice). Each
// step links to the place where it is done. Health programmes carry PROGRAMME_CARE; nothing promises a result.
// ---------------------------------------------------------------------------------------------------------------------
/** The care line every health programme shows (owner decision 1d, verbatim in meaning). */
export const PROGRAMME_CARE = 'General guidance, not medical advice; stop if something hurts.';
const WORKOUTS = link('/app/health?view=workouts', 'Open Workouts');
const MOVE_GENTLY = link('/app/health?view=meditation', 'Open Meditation (Move gently)');
const HABITS = link('/app/habits', 'Open Habits');
const NEW_HABIT = link('/app/habits?add=habit', 'Open the new-habit form');
const ROUTINES = link('/app/habits#routines', 'Open Routines');

/** A programme from its days: its `steps` are the days (same id, title and note), each opening the day's first link. */
function programme(p: Omit<GuidedProgram, 'steps'> & {days: readonly ProgrammeDay[]}): GuidedProgram {
  return {...p, steps: p.days.map(d => ({id: d.id, title: d.title, note: d.note, action: d.steps[0]!.action}))};
}
const step = (id: string, title: string, detail: string, action: GuidedAction): ProgrammeStep => ({id, title, detail, action});

// 1. Beginner strength, 4 weeks: three sessions a week on days 1, 3 and 5 of each week, so a rest day follows each one
// and two close the week. Sessions A and B alternate; the sets grow a little each week.
type Move = {id: string; name: string; cue: string; unit: 'reps' | 'reps a side' | 'seconds'};
const SQUAT: Move = {id: 'squat', name: 'Squat to a chair', unit: 'reps', cue: 'Feet hip-width apart. Sit back slowly until you touch the chair, then stand up tall. Your knees follow your toes.'};
const WALL_PUSH: Move = {id: 'push', name: 'Wall push-up', unit: 'reps', cue: 'Hands on the wall at shoulder height, body in one line. Bend your elbows to bring your chest toward the wall, then push back.'};
const TABLE_PUSH: Move = {id: 'push', name: 'Push-up against a table', unit: 'reps', cue: 'Hands on a sturdy table or kitchen counter, body in one line. Lower your chest toward the edge, then push back. The wall is fine too.'};
const BRIDGE: Move = {id: 'bridge', name: 'Glute bridge', unit: 'reps', cue: 'Lie on your back, knees bent, feet flat. Press through your heels to lift your hips, pause, and lower slowly.'};
const BIRD_DOG: Move = {id: 'bird-dog', name: 'Bird dog', unit: 'reps a side', cue: 'On hands and knees, reach one arm forward and the opposite leg back, keeping your back flat. Pause, come back, switch sides.'};
const LUNGE: Move = {id: 'lunge', name: 'Reverse lunge, holding a chair', unit: 'reps a side', cue: 'Hold the back of a chair for balance. Step one foot back and lower gently, then step forward again. Go only as low as is comfortable.'};
const DEAD_BUG: Move = {id: 'dead-bug', name: 'Dead bug', unit: 'reps a side', cue: 'Lie on your back, arms up, knees bent over your hips. Slowly lower one arm and the opposite leg, then come back. Your lower back stays on the floor.'};
const PLANK: Move = {id: 'plank', name: 'Plank on your knees', unit: 'seconds', cue: 'Forearms on the floor, knees down, body in a line from head to knees. Breathe steadily the whole time.'};
const BACK_LIFT: Move = {id: 'back-lift', name: 'Lying back lift', unit: 'reps', cue: 'Lie face down, arms by your sides. Lift your chest a little off the floor, hold for one breath, and lower slowly.'};
/** Week by week: sets, reps and the plank's seconds. */
const STRENGTH_WEEKS = [{sets: 2, reps: 8, seconds: 15}, {sets: 2, reps: 10, seconds: 20}, {sets: 3, reps: 8, seconds: 20}, {sets: 3, reps: 10, seconds: 25}] as const;
function strengthDay(week: number, session: number): ProgrammeDay {
  const n = (week - 1) * 3 + session, a = n % 2 === 1, w = STRENGTH_WEEKS[week - 1]!;
  const moves = a ? [SQUAT, week <= 2 ? WALL_PUSH : TABLE_PUSH, BRIDGE, BIRD_DOG] : [LUNGE, DEAD_BUG, PLANK, BACK_LIFT];
  const amount = (m: Move) => m.unit === 'seconds' ? `${w.sets} × ${w.seconds} seconds` : `${w.sets} × ${w.reps}${m.unit === 'reps a side' ? ' a side' : ''}`;
  return {id: `s${n}`, offset: (week - 1) * 7 + (session - 1) * 2, week,
    title: a ? 'Squats, push-ups, bridges and bird dogs' : 'Lunges, dead bugs, a plank and back lifts',
    note: `Week ${week}, about 20 minutes. Rest about a minute between sets. A rest day comes after this session.`,
    steps: [
      step('warm-up', 'Warm up for 5 minutes', 'March on the spot, roll your shoulders, and circle your arms and hips. Easy and loose.', WORKOUTS),
      ...moves.map(m => step(m.id, `${m.name}: ${amount(m)}`, `${m.cue} Fewer is fine on any day.`, WORKOUTS)),
      step('cool-down', 'Cool down with a gentle stretch', 'Two or three minutes of slow stretches, for example Move gently in Meditation. Never stretch into pain.', MOVE_GENTLY),
      step('log', 'Log the session', 'In Workouts, start an empty workout and add what you did, or save it as a routine to repeat next time.', WORKOUTS),
    ]};
}
const STRENGTH_START = programme({id: 'strength-start', title: 'Beginner strength in 4 weeks', pillar: 'health', care: PROGRAMME_CARE, dayWord: 'Session', weeks: 4,
  summary: 'Three short sessions a week with your own body weight and a chair, with a rest day after each one. Twelve sessions in all.',
  days: [1, 2, 3, 4].flatMap(week => [1, 2, 3].map(session => strengthDay(week, session)))});

// 2. 0 to 5 km in 8 weeks: three walk-and-run sessions a week, on days 1, 3 and 5, so a rest day follows each run.
type Run = {main: string; detail: string};
const intervals = (run: string, walk: string, times: number): Run => ({main: `Run ${run}, walk ${walk}: ${times} times`, detail: `Run at a pace where you could still talk in short sentences, then walk briskly. Walking is part of the plan, not a break from it.`});
const steady = (main: string): Run => ({main, detail: 'Slow is fine: an easy pace you could keep while talking. If you need to walk for a minute, walk, then carry on.'});
const RUN_WEEKS: readonly (readonly [Run, Run, Run])[] = [
  [intervals('60 seconds', '90 seconds', 8), intervals('60 seconds', '90 seconds', 8), intervals('60 seconds', '90 seconds', 8)],
  [intervals('90 seconds', '2 minutes', 6), intervals('90 seconds', '2 minutes', 6), intervals('90 seconds', '2 minutes', 6)],
  [intervals('2 minutes', '2 minutes', 5), intervals('2 minutes', '2 minutes', 5), intervals('2 minutes', '90 seconds', 5)],
  [intervals('3 minutes', '90 seconds', 5), intervals('3 minutes', '90 seconds', 5), intervals('4 minutes', '2 minutes', 4)],
  [intervals('5 minutes', '2 minutes', 3), intervals('5 minutes', '2 minutes', 3), steady('Run 8 minutes, walk 3 minutes, run 8 minutes')],
  [steady('Run 10 minutes, walk 2 minutes, run 10 minutes'), steady('Run 10 minutes, walk 2 minutes, run 10 minutes'), steady('Run 12 minutes, walk 2 minutes, run 10 minutes')],
  [steady('Run 15 minutes, walk 2 minutes, run 10 minutes'), steady('Run 15 minutes, walk 2 minutes, run 10 minutes'), steady('Run 25 minutes without stopping, or with one short walk')],
  [steady('Run 25 minutes'), steady('Run 28 minutes'), {main: 'Run 5 km or 30 minutes, whichever comes first', detail: 'At an easy pace, with walking breaks whenever you want them. However far you get today, you went from walking to running.'}],
];
function runDay(week: number, run: number): ProgrammeDay {
  const r = RUN_WEEKS[week - 1]![run - 1]!;
  return {id: `w${week}-r${run}`, offset: (week - 1) * 7 + (run - 1) * 2, week, title: r.main,
    note: `Week ${week}, run ${run} of 3: about ${week <= 4 ? 30 : 35} minutes with the warm-up and cool-down. A rest day comes after it.`,
    steps: [
      step('warm-up', 'Warm up: walk briskly for 5 minutes', 'Swing your arms and let your breathing pick up a little before you run.', WORKOUTS),
      step('main', r.main, r.detail, WORKOUTS),
      step('cool-down', 'Cool down: walk 5 minutes, then stretch gently', 'Walk until your breathing settles, then a few slow stretches for calves and thighs, for example Move gently in Meditation.', MOVE_GENTLY),
      step('log', 'Log the run', 'In Health → Activity, “Add movement”: choose Run and add the minutes. A GPX or TCX file from a watch goes in Workouts instead.', ACTIVITY),
    ]};
}
const RUN_5K = programme({id: 'run-5k', title: '0 to 5 km in 8 weeks', pillar: 'health', care: PROGRAMME_CARE, dayWord: 'Run', weeks: 8,
  summary: 'Walk and run intervals, three runs a week with a rest day after each one. If a week felt hard, do its runs again before moving on: there is no hurry.',
  days: [1, 2, 3, 4, 5, 6, 7, 8].flatMap(week => [1, 2, 3].map(run => runDay(week, run)))});

// 3. A 14-day habit starter: one small habit, made easy and kept, one day at a time.
const TICK = step('tick', 'Do your habit and tick it', 'However small it was today, it counts. Tick it on Habits.', HABITS);
const habitDay = (n: number, title: string, note: string, steps: readonly ProgrammeStep[]): ProgrammeDay => ({id: `d${n}`, offset: n - 1, title, note, steps});
const HABIT_START = programme({id: 'habit-start', title: 'A 14-day habit starter', pillar: 'habits', dayWord: 'Day',
  summary: 'Two weeks to start one small habit and keep it going: choose it, make it easy, and come back to it after a missed day.',
  days: [
    habitDay(1, 'Choose one small habit', 'Small enough that a busy day cannot stop it.', [
      step('choose', 'Pick a habit that takes two minutes or less', 'One glass of water, one page, one stretch. You can grow it later.', NEW_HABIT),
      step('add', 'Add it to Habits', 'In the new-habit form, type its name or choose “Start from an idea”. Choose the days that suit you.', NEW_HABIT)]),
    habitDay(2, 'Pair it with something you already do', 'A habit is easier to remember after a moment that happens anyway.', [
      step('cue', 'Choose your moment', 'For example: after I pour my morning coffee, I drink a glass of water. Write the moment in the habit’s note.', HABITS),
      step('reminder', 'Set a reminder, if it helps', 'A gentle reminder at that moment. You can change or turn it off any time.', REMINDERS), TICK]),
    habitDay(3, 'Do it, and tick it', 'Today is only about doing it once.', [TICK]),
    habitDay(4, 'Make it easy to start', 'What is in sight is easier to begin.', [
      step('in-sight', 'Put what you need where you will see it', 'The book on your pillow, the glass by the kettle, the shoes by the door.', HABITS), TICK]),
    habitDay(5, 'Notice how it feels', 'A few words now are something to read back later.', [TICK,
      step('write', 'Write one line about it', 'How did it go today? One line is enough.', JOURNAL)]),
    habitDay(6, 'A missed day is part of it', 'One missed day changes little. Coming back is the habit.', [
      step('again', 'If you missed a day, begin again today', 'No catching up and no making up for it: just today’s small step.', HABITS), TICK]),
    habitDay(7, 'Look back at your first week', 'Every tick this week is there to see.', [TICK,
      step('look', 'Look at your week on Habits', 'Notice the days it went well. What made those days easier?', HABITS),
      step('helped', 'Write down what helped', 'A time, a place, a cue: keep what worked.', JOURNAL)]),
    habitDay(8, 'Keep it small', 'Growing it can wait. Showing up is the point for now.', [TICK]),
    habitDay(9, 'A second tiny habit, if you like', 'Only if the first one feels easy. One habit is plenty too.', [TICK,
      step('second', 'Add a second small habit, or keep just one', 'If you add one, pair it with the first: after one, the other.', NEW_HABIT)]),
    habitDay(10, 'Plan for a busy day', 'A full day still has room for the smallest version.', [
      step('smallest', 'Choose your smallest version', 'One push-up, one line, one sip of water. On a busy day, that still counts.', HABITS), TICK]),
    habitDay(11, 'Link your habits into a routine', 'A routine strings small steps together, one after another.', [
      step('routine', 'Add your habit to a routine', 'In Routines, add a morning or evening routine and put your habit in it. You can change any step.', ROUTINES), TICK]),
    habitDay(12, 'Notice the small wins', 'Small wins are easy to miss.', [TICK,
      step('win', 'Write one thing that went well', 'It can be tiny: you remembered without the reminder, or it felt easier.', JOURNAL)]),
    habitDay(13, 'Check the time still fits', 'Life changes; the habit can change with it.', [
      step('time', 'Move the reminder if the time no longer fits', 'Or turn it off if you remember without it.', REMINDERS), TICK]),
    habitDay(14, 'Look back at two weeks', 'Two weeks of small steps, ticked by you.', [TICK,
      step('look', 'Look at two weeks on Habits', 'However many ticks there are, you started and kept coming back.', HABITS),
      step('keep', 'Write what you will keep', 'The habit, its moment, its smallest version: a line for each.', JOURNAL)]),
  ]});

// 4. The 7-day sleep reset: the Session AJ journey, extended (its seven steps are its seven days, same ids, titles,
// notes and links, so a journey started on an older build carries on), with one written step more each day.
const SLEEP_DAYS: readonly {main: GuidedStep; more: ProgrammeStep}[] = [
  {main: {id: 'log', title: 'Log last night’s sleep', note: 'Just as it was. No judging: this is your starting point.', action: SLEEP},
    more: step('dim', 'Tonight: dim the lights an hour before bed', 'Lower lights and fewer screens tell your body the day is ending.', SLEEP)},
  {main: habitStep('wake', 'same-wake-time', 'The same wake-up time, weekends too, is a steady anchor.'),
    more: step('light', 'Get some daylight soon after waking', 'A few minutes outside, or by a window, in the morning.', SLEEP)},
  {main: habitStep('caffeine', 'no-late-caffeine', 'Coffee, tea and cola count. Something warm without caffeine is fine.'),
    more: step('room', 'Make the bedroom cool, dark and quiet', 'A window open a little, curtains drawn, the phone face down or out of the room.', SLEEP)},
  {main: habitStep('wind-down', 'wind-down', 'Thirty minutes before bed: a book, a bath, some quiet music. Log last night’s sleep too, if you like.'),
    more: step('log', 'Log last night’s sleep', 'Bedtime and wake-up time are enough. Notes are optional.', SLEEP)},
  {main: routineStep('evening', 'evening', 'Tidy, a few lines in a journal, read, lights out. You can change or remove any step.'),
    more: step('awake', 'If you lie awake, get up for a while', 'After about twenty minutes awake, do something quiet in dim light elsewhere, and go back to bed when sleepy.', SLEEP)},
  {main: habitStep('phone', 'phone-out-of-bedroom', 'A cheap alarm clock helps, if your phone is your alarm.'),
    more: step('tomorrow', 'Write tomorrow’s first task before bed', 'On paper it can wait until morning.', JOURNAL)},
  {main: goalStep('goal', 'sleep-7h', 'Only if a number helps you. It keeps a two-week average of what you log, and you choose the hours.'),
    more: step('look', 'Look back at your week of sleep', 'Every night you logged is there. Keep the changes that felt good, and let the rest go.', SLEEP)},
];
const SLEEP_RESET = programme({id: 'sleep-reset', title: 'A sleep reset', pillar: 'health', care: `${PROGRAMME_CARE} If sleep stays hard, talk to a doctor.`, dayWord: 'Day',
  summary: 'One week of small evening and morning changes, one at a time.',
  days: SLEEP_DAYS.map(({main, more}, i) => ({id: main.id, offset: i, title: main.title, note: main.note, steps: [step('main', main.title, main.note, main.action), more]}))});

// 5. A 10-day meditation starter from the written guides (lib/meditation/guides.ts): one guide a day, read, then sat
// with the timer. The guides are looked up here, so a renamed guide fails the build and the tests.
const MEDITATION_GUIDE_IDS = ['arrive', 'breath-count', 'hands', 'noting', 'sounds', 'long-out', 'kind-wishes', 'body-scan', 'walking', 'evening'] as const;
function guide(id: string) {
  const g = GUIDES.find(x => x.id === id);
  if (!g) throw Error(`Guided journeys: the meditation guide "${id}" is missing from lib/meditation/guides.ts.`);
  return g;
}
const MEDITATION_START = programme({id: 'meditation-start', title: 'A 10-day meditation starter', pillar: 'health', care: `${PROGRAMME_CARE} If worry or low mood stays with you, talk to a doctor.`, dayWord: 'Day',
  summary: 'Ten short written practices, one a day, from three to ten minutes, each read and then sat with the timer.',
  days: MEDITATION_GUIDE_IDS.map((id, i) => {
    const g = guide(id);
    return {id: `d${i + 1}`, offset: i, title: `${g.en.title}, ${g.minutes} minutes`, note: g.en.steps[0]!, steps: [
      step('read', `Read today’s guide: “${g.en.title}”`, g.en.steps.join(' '), MEDITATION),
      step('sit', `Sit for ${g.minutes} minutes with the timer`, 'Health → Meditation → Begin. Glance at the guide while you sit, if it helps.', MEDITATION),
      step('word', 'Notice one word for how it went', 'Calm, restless, sleepy: any word is fine. Writing it down is up to you.', JOURNAL),
    ]};
  })});

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
  SLEEP_RESET,
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
  // Session AW (programmes): the four new written programmes (the sleep reset above is the fifth).
  STRENGTH_START, RUN_5K, HABIT_START, MEDITATION_START,
];

export const programById = (id: string): GuidedProgram | undefined => GUIDED_PROGRAMS.find(p => p.id === id);
