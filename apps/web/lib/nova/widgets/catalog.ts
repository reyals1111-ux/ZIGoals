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
 */
export type WidgetGate = 'today' | 'goals' | 'habits' | 'health' | 'wealth';
/** Session AM (D3): the small parameters a request may set on a widget — a range of days, or one record's id. */
export type WidgetParamName = 'range' | 'ref';
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
  {id: 'notes', title: 'Notes inbox', about: 'Captured notes waiting to be filed.', pillar: 'orbit', href: '/app/notes', open: 'Open your notes', size: 'S', gate: 'today', needs: 'notes'},
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
  {id: 'net-worth', title: 'Net worth', about: 'Your recorded valuations over time, with the change over the range.', pillar: 'wealth', href: '/app/wealth', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'spending', title: 'Spending', about: 'What you logged as spent, by category, for the month.', pillar: 'wealth', href: '/app/wealth#spending', open: 'Open Wealth', size: 'M', gate: 'wealth', params: ['range'], made: true},
  {id: 'budgets', title: 'Budgets', about: 'Each budget against what you logged this month.', pillar: 'wealth', href: '/app/wealth?view=budgets', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'bills', title: 'Upcoming bills', about: 'The bills that come next, in date order.', pillar: 'wealth', href: '/app/wealth?view=bills', open: 'Open Wealth', size: 'M', gate: 'wealth', made: true},
  {id: 'journal', title: 'Journal', about: 'The days you wrote this month, and your streak.', pillar: 'mind', href: '/app/journal', open: 'Open your journal', size: 'M', gate: 'today', made: true},
  {id: 'time', title: 'Time', about: 'How much of today, this week and this year has passed.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'S', made: true},
  {id: 'weather', title: 'Weather', about: 'The weather where you are, once you turn outside data on. Data from MET Norway.', pillar: 'world', href: '/app/nova#nova-permissions', open: 'Weather settings', size: 'M', made: true},
  {id: 'sun', title: 'Sun', about: 'Sunrise, sunset and the length of the day, once you turn outside data on.', pillar: 'world', href: '/app/nova#nova-permissions', open: 'Weather settings', size: 'S', made: true},
  {id: 'nova-sees', title: 'What NOVA can see', about: 'Which parts of your life NOVA may read, switch by switch.', pillar: 'nova', href: '/app/nova#nova-permissions', open: 'Open Permissions', size: 'M', made: true},
  {id: 'nova-brain', title: 'NOVA’s brain', about: 'What answers right now: this device, your local model, your key or your agent.', pillar: 'nova', href: '/app/nova/setup', open: 'Open the setup guide', size: 'S', made: true},
  {id: 'requests', title: 'Your requests', about: 'What you asked NOVA lately, one tap from being shown again.', pillar: 'nova', href: '/app/nova', open: 'Open NOVA', size: 'M', made: true},
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
