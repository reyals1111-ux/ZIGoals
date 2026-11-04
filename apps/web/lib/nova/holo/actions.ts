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
