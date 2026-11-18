import type {WidgetSpec} from './catalog';

/**
 * Session AS (ADR-042 Part 2): the answer widgets of the day’s own records and NOVA itself: flames, comparisons, heatmaps,
 * timelines, maps. Same rules as catalog-as.ts. The Habits kinds of this group (flames, lattices, the year heat, the
 * twins) read under Habits; the journal's under the Journal; the notes' under Notes; tasks, focus, the agenda, the
 * Checklist, the radar and the scan under Today. NOVA's own card reads no record and has no gate.
 */
const HABITS = {pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', made: true} as const;
const JOURNAL = {pillar: 'mind', href: '/app/journal', open: 'Open your journal', size: 'M', gate: 'journal', made: true} as const;
const FOCUS = {pillar: 'orbit', href: '/app/journey?focus=pomodoro#focus', open: 'Open Focus Sessions', size: 'M', gate: 'today', made: true} as const;
const TASKS = {pillar: 'goals', href: '/app/tasks', open: 'Open your tasks', size: 'M', gate: 'today', made: true} as const;
const TODAY = {pillar: 'orbit', href: '/app/today', open: 'Open Today', size: 'M', gate: 'today', made: true} as const;
export const AS_DAY: readonly WidgetSpec[] = [
  // A. Flames
  {id: 'streak-flames', title: 'Streak flames', about: 'Each habit’s streak as a flame, the longest first; one habit on its own when you ask for it.', ...HABITS, params: ['ref', 'period']},
  {id: 'best-streaks', title: 'Best streaks', about: 'Each habit’s longest streak ever, beside the one running now.', ...HABITS, params: ['period']},
  {id: 'journal-streak', title: 'Writing streak', about: 'The days in a row you wrote in your journal, and your longest run.', ...JOURNAL, params: ['period']},
  {id: 'focus-streak', title: 'Focus streak', about: 'The days in a row with a focus session, and your longest run.', ...FOCUS, params: ['period']},
  // B. Lattices and heat
  {id: 'habits-lattice', title: 'Habits lattice', about: 'Every habit as a row and the days as columns: done, missed, skipped and still open, told apart.', ...HABITS, params: ['period']},
  {id: 'habit-weekdays', title: 'Weekday habits', about: 'Which weekday your habits go undone most: the days not done, habit by habit, over 90 days.', ...HABITS, params: ['period']},
  {id: 'habit-year', title: 'Habit year', about: 'One habit’s last 53 weeks as a heat grid: done, missed and skipped days.', ...HABITS, params: ['ref', 'period']},
  {id: 'focus-heat', title: 'Focus heat', about: 'Your last 13 weeks of focus, a cell a day, brighter with more minutes.', ...FOCUS, params: ['period']},
  // C. Twins
  {id: 'compare-periods', title: 'Compare habits', about: 'This period beside the one before: the check-ins done of those due, for every habit or for one.', ...HABITS, params: ['ref', 'period']},
  // D. Timelines
  {id: 'task-timeline', title: 'Task timeline', about: 'Your open tasks on a time axis: overdue, today and the week ahead, with what you finished.', ...TASKS, params: ['period']},
  {id: 'day-timeline', title: 'Today’s line', about: 'Today’s agenda on a 24-hour line, with a marker for now.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'M', gate: 'today', made: true, params: ['period']},
  {id: 'tasks-calendar', title: 'Tasks calendar', about: 'The days of the month on which a task is due or was done.', ...TASKS, params: ['period']},
  // E. Ranked bars
  {id: 'task-overdue', title: 'Overdue tasks', about: 'Your overdue tasks by how many days overdue, the oldest first.', ...TASKS, params: ['period']},
  // F. Orbit
  {id: 'checklist-orbit', title: 'Checklist orbit', about: 'Today’s Checklist dots on one ring, the done ones lit.', pillar: 'orbit', href: '/app/checklist', open: 'Open the Checklist', size: 'M', gate: 'today', made: true, params: ['period']},
  // G. Maps
  {id: 'journal-map', title: 'Journal map', about: 'A month of days with the days you wrote lit, and the words you wrote in all.', ...JOURNAL, params: ['period']},
  {id: 'notes-constellation', title: 'Note stars', about: 'Your notes as stars, grouped by kind: inbox, daily and topic. Counts only.', pillar: 'mind', href: '/app/notes', open: 'Open your notes', size: 'M', gate: 'notes', made: true, params: ['period']},
  // H. Gauges and dials
  {id: 'focus-gauge', title: 'Focus gauge', about: 'Your focused minutes this week as an arc, against last week’s.', ...FOCUS, params: ['period']},
  {id: 'task-load', title: 'Task load', about: 'Your open tasks as one dial: overdue, due today, ahead and without a day.', ...TASKS, params: ['period']},
  // I. Radar and scanner
  {id: 'life-radar', title: 'Life radar', about: 'Habits, tasks, focus and your Checklist this period beside the one before: facts only, no score.', ...TODAY, params: ['period']},
  {id: 'day-scan', title: 'Day scan', about: 'Today at a glance, part by part: habits, tasks, focus and what is left on your agenda.', ...TODAY, params: ['period']},
  // J. NOVA itself
  {id: 'nova-answers', title: 'NOVA answers', about: 'The kinds of question NOVA answers from your own records, with examples.', pillar: 'nova', href: '/app/nova', open: 'Open NOVA', size: 'M', made: true, params: ['period']},
];
