import type {WidgetSize} from '../store';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's widget gallery. Each widget reads the person's own records through
 * the app's existing stores (components/nova/widgets/*), opens its page, never shows an unknown as zero, and teaches with
 * its pillar's illustration while it has nothing to show. Some appear only when their part of ZIGoals is in use: the
 * market watch once the person chose markets; the notes inbox once Notes is in this build; NOVA's briefs once briefs are.
 */
/** Session AM (art direction §2): `mind` (notes, journal), `world` (outside data: weather) and `nova` (NOVA itself) join the realms. */
export type WidgetPillar = 'goals' | 'habits' | 'health' | 'wealth' | 'orbit' | 'mind' | 'world' | 'nova';
/**
 * Session AM (ADR-038 D5): the switch a widget *made by a request* reads under — the page-data area of NOVA's on-device
 * answers (ADR-037 Q14), `health` being Health's own three-part gate with NOVA's Health permission (Q16). Absent: the
 * widget shows nothing of the person's records (the clock, NOVA's own state) or carries its own switch (weather).
 * Security review AM-S2: Notes and the Journal have their own gates (NOVA's Notes and Journal permissions, both off by
 * default), and `today` is NOVA's Today permission itself, not "any of Today, Notes or the Journal".
 */
export type WidgetGate = 'today' | 'goals' | 'habits' | 'health' | 'wealth' | 'notes' | 'journal';
/** Session AM (D3): the small parameters a request may set on a widget — a range of days, or one record's id. Session AS: or the period an answer was about. */
export type WidgetParamName = 'range' | 'ref' | 'period';
export type WidgetNeed = 'markets' | 'notes' | 'briefs';
export type WidgetSpec = {
  id: string;
  title: string;
  /** One line for the gallery: what it shows. */
  about: string;
  pillar: WidgetPillar;
  href: string;
  /** The words of its link ("Open the Checklist"). */
  open: string;
  size: WidgetSize;
  /** Shown only while this part of ZIGoals is in use. */
  needs?: WidgetNeed;
  /** Session AM (D5): the switch a made widget reads under (see WidgetGate). */
  gate?: WidgetGate;
  /** Session AM (D3): the parameters a request may set (validated in lib/nova/stage/record.ts). */
  params?: readonly WidgetParamName[];
  /** Session AM: a widget added by Session AM (made on request first; the gallery lists it too). */
  made?: true;
};
export const WIDGETS: readonly WidgetSpec[] = [
  {id: 'orbit', title: 'Today’s orbit', about: 'How much of today’s orbit is lit: your Checklist, or today’s habits.', pillar: 'orbit', href: '/app/checklist', open: 'Open the Checklist', size: 'M', gate: 'today'},
  // Review M7 (lane L8d): the day's own panels (Next three, Focus) wear the day's ice, not a pillar's neon (Habits' cyan).
  {id: 'next', title: 'Next three', about: 'The next three things in your day, across your pillars.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'M', gate: 'today'},
  {id: 'tasks', title: 'Tasks', about: 'Today’s tasks and your goals’ next actions: tick one off, or add one for today.', pillar: 'goals', href: '/app/tasks', open: 'Open your tasks', size: 'M', gate: 'today'},
  {id: 'glance', title: 'Day at a glance', about: 'Your day in a few lines, from your own records. Nothing fetched.', pillar: 'orbit', href: '/app/today', open: 'Open Today', size: 'M', gate: 'today'},
  {id: 'water', title: 'Water', about: 'What you have drunk today, against your own target.', pillar: 'health', href: '/app/health#water', open: 'Open Health', size: 'S', gate: 'health'},
  {id: 'focus', title: 'Focus', about: 'A Pomodoro you start here, its time left while it runs, and your focus this week.', pillar: 'orbit', href: '/app/journey?focus=pomodoro#focus', open: 'Open Focus Sessions', size: 'S', gate: 'today'},
  {id: 'now-playing', title: 'Now playing', about: 'Your focus sounds or music app, with play and stop.', pillar: 'orbit', href: '/app/music', open: 'Open Music', size: 'S'},
  {id: 'money', title: 'Next bill and contribution', about: 'Your next bill and your next planned contribution to a goal.', pillar: 'wealth', href: '/app/wealth?view=bills', open: 'Open Wealth', size: 'M', gate: 'wealth'},
  {id: 'goal-pace', title: 'Goal pace', about: 'Your active goals: how far along, and whether the plan keeps pace.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M', gate: 'goals'},
  {id: 'sleep', title: 'Sleep balance', about: 'Your nights against your own sleep goal, over two weeks.', pillar: 'health', href: '/app/health?view=sleep', open: 'Open Sleep', size: 'S', gate: 'health'},
  {id: 'briefs', title: 'NOVA briefs', about: 'Your morning brief and evening recap, made on this device.', pillar: 'orbit', href: '/app/nova#briefs', open: 'Read your briefs', size: 'S', gate: 'today', needs: 'briefs'},
  {id: 'notes', title: 'Notes inbox', about: 'Captured notes waiting to be filed.', pillar: 'orbit', href: '/app/notes', open: 'Open your notes', size: 'S', gate: 'notes', needs: 'notes'},
  {id: 'markets', title: 'Market watch', about: 'The markets you follow, with each price’s time.', pillar: 'wealth', href: '/app/markets', open: 'Open Markets', size: 'M', gate: 'wealth', needs: 'markets'},
  // Session AL Part 11 (lane L8): the holographic HUD's instruments. Older builds leave these ids out (widgetsFor's `known`).
  {id: 'health-hud', title: 'Health HUD', about: 'Calories, protein, carbs, fat, water, sleep and steps against your own targets.', pillar: 'health', href: '/app/health', open: 'Open Health', size: 'L', gate: 'health'},
  {id: 'habits-hud', title: 'Habits HUD', about: 'Your streaks, the last seven days and your consistency over 30 days.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits'},
  {id: 'goals-hud', title: 'Goals HUD', about: 'Your active goals’ progress, and the pace of your lead goal with its estimate.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M', gate: 'goals'},
  {id: 'wealth-hud', title: 'Wealth HUD', about: 'Your tracked wealth over time, its mix, and what is set aside for goals.', pillar: 'wealth', href: '/app/wealth', open: 'Open Wealth', size: 'L', gate: 'wealth'},
  {id: 'agenda-clock', title: 'Agenda clock', about: 'Today on a 24-hour clock: every item at its time, the rest any time.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'M', gate: 'today'},
  // Session AM (ADR-038 D1–D5): the widgets NOVA makes on request (components/nova/cards). Older builds leave these ids out.
  {id: 'weight', title: 'Weight', about: 'Your weight over a range you choose, with the change since its start.', pillar: 'health', href: '/app/health?view=weight', open: 'Open Health', size: 'M', gate: 'health', params: ['range'], made: true},
  {id: 'steps', title: 'Steps', about: 'Your steps per day against your own target.', pillar: 'health', href: '/app/health?view=activity', open: 'Open Health', size: 'M', gate: 'health', params: ['range'], made: true},
  {id: 'workouts', title: 'Workouts', about: 'The workouts you logged, week by week.', pillar: 'health', href: '/app/health?view=workouts', open: 'Open Health', size: 'M', gate: 'health', params: ['range'], made: true},
  {id: 'habit-week', title: 'Habits this week', about: 'Every habit against the last seven days: done, missed, not due.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', made: true},
  {id: 'goal-focus', title: 'Goal', about: 'One goal: how far, what is left and whether the plan keeps pace.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M', gate: 'goals', params: ['ref'], made: true},
  {id: 'net-worth', title: 'Tracked wealth', about: 'What you hold on Wealth: its recorded valuations over time, ending on today’s total.', pillar: 'wealth', href: '/app/wealth', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'spending', title: 'Spending', about: 'What you logged as spent, by category, for the month.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'budgets', title: 'Budgets', about: 'Each budget against what you logged this month.', pillar: 'wealth', href: '/app/wealth?view=budgets', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'bills', title: 'Upcoming bills', about: 'The bills that come next, in date order.', pillar: 'wealth', href: '/app/wealth?view=bills', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'journal', title: 'Journal', about: 'The days you wrote this month, and your streak.', pillar: 'mind', href: '/app/journal', open: 'Open your journal', size: 'M', gate: 'journal', made: true},
  {id: 'time', title: 'Time', about: 'How much of today, this week and this year has passed.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'S', made: true},
  {id: 'weather', title: 'Weather', about: 'The weather where you are, once you turn outside data on. Data from MET Norway.', pillar: 'world', href: '/app/nova#nova-permissions', open: 'Weather settings', size: 'M', made: true},
  {id: 'sun', title: 'Sun', about: 'Sunrise, sunset and the length of the day, once you turn outside data on.', pillar: 'world', href: '/app/nova#nova-permissions', open: 'Weather settings', size: 'M', made: true},
  {id: 'nova-sees', title: 'What NOVA can see', about: 'Which parts of your life NOVA may read, switch by switch.', pillar: 'nova', href: '/app/nova#nova-permissions', open: 'Open Permissions', size: 'M', made: true},
  // Design review AM-D20: NOVA's brain is M by default (its words and the privacy mode do not fit one unit).
  {id: 'nova-brain', title: 'NOVA’s brain', about: 'What answers right now: this device, your local model, your key or your agent.', pillar: 'nova', href: '/app/nova/setup', open: 'Open the setup guide', size: 'M', made: true},
  {id: 'requests', title: 'Your requests', about: 'What you asked NOVA lately, one tap from being shown again.', pillar: 'nova', href: '/app/nova', open: 'Open NOVA', size: 'M', made: true},
  // Session AM-2 (step 3, "NOVA connected"): what Sessions AO and AP added to the pages, as widgets on request. Every one
  // is `made` (it reads under its switch whether made or pinned, AM-S1). Run splits, Mood tags and Symptoms read
  // health-type records: they exist only under the Health gate (NOVA's Health permission and the device's Health switch,
  // Q14/Q16). Templates is the static library: it reads nothing of the person's, so it has no gate.
  {id: 'net-worth-history', title: 'Net worth over time', about: 'Your net worth day by day, from the days Wealth recorded: holdings plus accounts minus debts.', pillar: 'wealth', href: '/app/wealth#wealth-history', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'ready-to-assign', title: 'Ready to assign', about: 'This month’s logged income minus what your budgets hold.', pillar: 'wealth', href: '/app/wealth?view=budgets', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'age-of-money', title: 'Age of money', about: 'How old the money you spend is, on average, over the last 90 days.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'spending-pace', title: 'Spending pace', about: 'This month’s spending so far beside what your earlier months show by the same day.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'bill-changes', title: 'Bill changes', about: 'Bills whose latest payment differs from the one before it.', pillar: 'wealth', href: '/app/wealth?view=bills', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'money-tags', title: 'Spending by tag', about: 'What you logged under each of your own tags, for the month.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'perfect-days', title: 'Perfect days', about: 'The days this month on which every habit due was done, and your run of them.', pillar: 'habits', href: '/app/habits?view=perfect-days#habit-perfect-title', open: 'Open Habits', size: 'M', gate: 'habits', made: true},
  {id: 'day-rules', title: 'Your day’s rules', about: 'When a day counts as done, and when your day ends: two settings, read out.', pillar: 'orbit', href: '/app/settings#day-ends', open: 'Open Settings', size: 'M', gate: 'today', made: true},
  {id: 'tasks-later', title: 'This evening and Someday', about: 'The tasks you put on tonight’s list, and the ones set aside for someday.', pillar: 'goals', href: '/app/tasks?view=evening', open: 'Open your tasks', size: 'M', gate: 'today', made: true},
  {id: 'countdowns', title: 'Days until', about: 'Your countdowns: the days until each day you are looking forward to.', pillar: 'orbit', href: '/app/today', open: 'Open Today', size: 'M', gate: 'today', made: true},
  {id: 'journal-numbers', title: 'Journal numbers', about: 'Your writing streak, your words this year and your words month by month.', pillar: 'mind', href: '/app/journal#journal-entries', open: 'Open your journal', size: 'M', gate: 'journal', made: true},
  {id: 'templates', title: 'Templates', about: 'The library of goal templates and habit ideas, by area.', pillar: 'goals', href: '/app/goals/templates', open: 'Open Goal templates', size: 'M', made: true},
  {id: 'run-splits', title: 'Run splits', about: 'Your latest run’s pace, kilometre by kilometre, from the file you imported.', pillar: 'health', href: '/app/health?view=workouts', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'mood-tags', title: 'Mood tags', about: 'What goes with your good days, from your own mood tags. Counts, never causes.', pillar: 'health', href: '/app/health?view=insights', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'symptoms', title: 'Symptoms', about: 'The symptoms and factors you follow, over the last 30 days.', pillar: 'health', href: '/app/health?view=diary', open: 'Open Health', size: 'M', gate: 'health', made: true},
  // Session AM-2 (step 3, round 2): the pages that still had no widget. All `made` (each reads under its switch whether
  // made or pinned, AM-S1). The six Health ones exist only under the Health gate (Q14/Q16); the cycle log is the most
  // sensitive of them: it also needs its own switch on Health, and NOVA's answer never carries one of its figures.
  // Price alerts follow the Markets widget: Wealth's switch, and only while Markets is in use.
  {id: 'priority-matrix', title: 'Priority matrix', about: 'Your open tasks in four boxes: urgent and important, and the three others.', pillar: 'goals', href: '/app/tasks?view=matrix', open: 'Open your tasks', size: 'M', gate: 'today', made: true},
  {id: 'hour-grid', title: 'Today by the hour', about: 'Today’s agenda hour by hour: what sits at which hour, and what has no time yet.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'M', gate: 'today', made: true},
  {id: 'reviews', title: 'Reviews', about: 'Your weekly review: whether it is due, the next review day, and your latest Life review focus.', pillar: 'orbit', href: '/app/review', open: 'Open your review', size: 'M', gate: 'today', made: true},
  {id: 'milestones', title: 'Goal milestones', about: 'The milestones you ticked on your goals, and the next one on each.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M', gate: 'goals', made: true},
  {id: 'cash-flow', title: 'Cash flow', about: 'What you logged coming in and going out this month, month by month, and who you paid.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'accounts', title: 'Accounts and debts', about: 'The balances you entered for your accounts and debts, and what they come to.', pillar: 'wealth', href: '/app/wealth#accounts-title', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'debt-plan', title: 'Debt payoff plan', about: 'When your debts would be cleared with the figures you kept: a projection, not a promise.', pillar: 'wealth', href: '/app/wealth#accounts-title', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'savings-challenges', title: 'Savings challenges', about: 'The savings challenges running on your goals, and how far along each is.', pillar: 'wealth', href: '/app/goals', open: 'Open Goals', size: 'M', gate: 'wealth', made: true},
  {id: 'price-alerts', title: 'Price alerts', about: 'The price alerts you set: which are waiting and which have fired.', pillar: 'wealth', href: '/app/markets', open: 'Open Markets', size: 'M', gate: 'wealth', needs: 'markets', made: true},
  {id: 'health-trends', title: 'Health trends', about: 'Your last 90 days beside your last year, for steps, sleep, weight and resting heart rate.', pillar: 'health', href: '/app/health?view=insights', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'food-days', title: 'Food-logging days', about: 'On how many days this month you logged food, as a month of days.', pillar: 'health', href: '/app/health?view=diary', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'fasting', title: 'Fasting', about: 'Your running fast against its target, and your last fasts.', pillar: 'health', href: '/app/health#fasting', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'meditation', title: 'Meditation', about: 'Your meditation minutes this week, week by week, and your days in a row.', pillar: 'health', href: '/app/health?view=meditation', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'supplements', title: 'Supplements', about: 'Today’s doses of what you keep track of, and the last two weeks.', pillar: 'health', href: '/app/health#supplements-title', open: 'Open Health', size: 'M', gate: 'health', made: true},
  {id: 'cycle', title: 'Cycle', about: 'Your cycle log: the day of this cycle and an estimate of the next. On your screen only.', pillar: 'health', href: '/app/health#cycle-log', open: 'Open Health', size: 'M', gate: 'health', made: true},
];
const BY_ID = new Map(WIDGETS.map(w => [w.id, w]));
export const widgetSpec = (id: string): WidgetSpec | undefined => BY_ID.get(id);
export const isWidgetId = (id: string): boolean => BY_ID.has(id);
/** What is in use on this device (the dashboard reads each from its own store). */
export type WidgetContext = {markets: boolean; notes: boolean; briefs: boolean};
/** Whether a widget can show here: known, and its part of ZIGoals is in use. */
export function widgetAvailable(id: string, ctx: WidgetContext): boolean {
  const spec = BY_ID.get(id);
  return !!spec && (!spec.needs || ctx[spec.needs]);
}
/** The gallery, in catalog order: every widget that can show here, with whether it is already on NOVA. */
export function gallery(ctx: WidgetContext, shown: readonly string[]): (WidgetSpec & {added: boolean})[] {
  return WIDGETS.filter(w => widgetAvailable(w.id, ctx)).map(w => ({...w, added: shown.includes(w.id)}));
}
