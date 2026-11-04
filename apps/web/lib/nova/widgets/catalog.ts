import type {WidgetSize} from '../store';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's widget gallery. Each widget reads the person's own records through
 * the app's existing stores (components/nova/widgets/*), opens its page, never shows an unknown as zero, and teaches with
 * its pillar's illustration while it has nothing to show. Some appear only when their part of ZIGoals is in use: the
 * market watch once the person chose markets; the notes inbox once Notes is in this build; NOVA's briefs once briefs are.
 */
export type WidgetPillar = 'goals' | 'habits' | 'health' | 'wealth' | 'orbit';
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
};
export const WIDGETS: readonly WidgetSpec[] = [
  {id: 'orbit', title: 'Today’s orbit', about: 'How much of today’s orbit is lit: your Checklist, or today’s habits.', pillar: 'orbit', href: '/app/checklist', open: 'Open the Checklist', size: 'M'},
  {id: 'next', title: 'Next three', about: 'The next three things in your day, across your pillars.', pillar: 'habits', href: '/app/agenda', open: 'Open your agenda', size: 'M'},
  {id: 'tasks', title: 'Tasks', about: 'Today’s tasks and your goals’ next actions: tick one off, or add one for today.', pillar: 'goals', href: '/app/tasks', open: 'Open your tasks', size: 'M'},
  {id: 'glance', title: 'Day at a glance', about: 'Your day in a few lines, from your own records. No weather, nothing fetched.', pillar: 'orbit', href: '/app/today', open: 'Open Today', size: 'M'},
  {id: 'water', title: 'Water', about: 'What you have drunk today, against your own target.', pillar: 'health', href: '/app/health#water', open: 'Open Health', size: 'S'},
  {id: 'focus', title: 'Focus', about: 'A Pomodoro you start here, its time left while it runs, and your focus this week.', pillar: 'habits', href: '/app/journey?focus=pomodoro#focus', open: 'Open Focus Sessions', size: 'S'},
  {id: 'now-playing', title: 'Now playing', about: 'Your focus sounds or music app, with play and stop.', pillar: 'orbit', href: '/app/music', open: 'Open Music', size: 'S'},
  {id: 'money', title: 'Next bill and contribution', about: 'Your next bill and your next planned contribution to a goal.', pillar: 'wealth', href: '/app/wealth?view=bills', open: 'Open Wealth', size: 'M'},
  {id: 'goal-pace', title: 'Goal pace', about: 'Your active goals: how far along, and whether the plan keeps pace.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M'},
  {id: 'sleep', title: 'Sleep balance', about: 'Your nights against your own sleep goal, over two weeks.', pillar: 'health', href: '/app/health?view=sleep', open: 'Open Sleep', size: 'S'},
  {id: 'briefs', title: 'NOVA briefs', about: 'Your morning brief and evening recap, made on this device.', pillar: 'orbit', href: '/app/nova#briefs', open: 'Read your briefs', size: 'S', needs: 'briefs'},
  {id: 'notes', title: 'Notes inbox', about: 'Captured notes waiting to be filed.', pillar: 'orbit', href: '/app/notes', open: 'Open your notes', size: 'S', needs: 'notes'},
  {id: 'markets', title: 'Market watch', about: 'The markets you follow, with each price’s time.', pillar: 'wealth', href: '/app/markets', open: 'Open Markets', size: 'M', needs: 'markets'},
  // Session AL Part 11 (lane L8): the holographic HUD's instruments. Older builds leave these ids out (widgetsFor's `known`).
  {id: 'health-hud', title: 'Health HUD', about: 'Calories, protein, carbs, fat, water, sleep and steps against your own targets.', pillar: 'health', href: '/app/health', open: 'Open Health', size: 'L'},
  {id: 'habits-hud', title: 'Habits HUD', about: 'Your streaks, the last seven days and your consistency over 30 days.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M'},
  {id: 'goals-hud', title: 'Goals HUD', about: 'Your active goals’ progress, and the pace of your lead goal with its estimate.', pillar: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M'},
  {id: 'wealth-hud', title: 'Wealth HUD', about: 'Your tracked wealth over time, its mix, and what is set aside for goals.', pillar: 'wealth', href: '/app/wealth', open: 'Open Wealth', size: 'L'},
  {id: 'agenda-clock', title: 'Agenda clock', about: 'Today on a 24-hour clock: every item at its time, the rest any time.', pillar: 'orbit', href: '/app/agenda', open: 'Open your agenda', size: 'M'},
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
