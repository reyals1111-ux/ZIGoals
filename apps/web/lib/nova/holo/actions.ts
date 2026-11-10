/**
 * Session AL Part 11 (lane L8): the quick actions a HUD panel opens (interconnected like the Checklist). Each writes a
 * real record through the page's own write function, with the app's one Undo, or opens the page's own form where the
 * record is money (a contribution is always entered on the goal's own form: nothing financial is written by one tap).
 * - water: log the person's first water size (Health's and Today's one-tap button; 250 mL by default)
 * - weight: log a weight in the person's unit (Health's weight entry)
 * - habit: tick a habit due today (the Habits card's own check-in)
 * - focus: start a focus timer (the page's one Pomodoro run)
 * - task: add a task for today (the Tasks engine)
 * - goal: add to a goal (opens that goal's contribution form)
 * - note: capture a note into the inbox (the Notes engine)
 */
export const QUICK_ACTIONS = ['water', 'weight', 'habit', 'focus', 'task', 'goal', 'note'] as const;
export type QuickAction = (typeof QUICK_ACTIONS)[number];
const BY_WIDGET: Readonly<Record<string, readonly QuickAction[]>> = {
  'health-hud': ['water', 'weight', 'habit'], water: ['water', 'weight'], sleep: ['water', 'weight'],
  'habits-hud': ['habit', 'focus'], orbit: ['habit', 'task'], next: ['habit', 'task'], focus: ['focus', 'task'],
  'goals-hud': ['goal', 'task'], 'goal-pace': ['goal', 'task'], tasks: ['task', 'focus'], 'agenda-clock': ['task', 'habit'],
  'wealth-hud': ['goal'], money: ['goal'], markets: ['goal'],
  notes: ['note', 'task'], glance: ['water', 'habit', 'task'], briefs: ['note'], 'now-playing': ['focus'],
};
/** A panel's quick actions, in order (every panel has at least one). */
export const quickActionsFor = (widget: string): readonly QuickAction[] => BY_WIDGET[widget] ?? ['task'];
/** Second review p4 (lane L8f): the panels whose sheet ticks only the habits Health counts (water, steps, sleep…). */
export const HEALTH_SHEETS: ReadonlySet<string> = new Set(['health-hud', 'water', 'sleep']);
/**
 * The habits a sheet offers to tick: those due today, at most six; on a Health panel's sheet only the ones linked to Health
 * (Walk, Drink water), so water and weight lead there, and the rest wait one link away ("More in Habits →"). `more` counts
 * the due habits left out.
 */
export function sheetHabits<T extends {id: string}>(due: readonly T[], widget: string, linked: (id: string) => boolean, max = 6): {shown: T[]; more: number} {
  const pool = HEALTH_SHEETS.has(widget) ? due.filter(h => linked(h.id)) : [...due], shown = pool.slice(0, max);
  return {shown, more: due.length - shown.length};
}
