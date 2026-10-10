import {addLocalDays} from '../../local-date';
import type {AiOptions} from '../store/records';
import {WRITING_KINDS, type ActionKind} from './schema';

/**
 * Auto-accept ([TIER 3] storage: ai options; Session X-Local Part 5b, owner addition 5). A kind the person switched on
 * in Settings is added by ZIGi without a tap when it proposes it; each addition shows for ten seconds with Undo and is
 * listed under Activity's "Actions by ZIGi". Off by default, per kind. Never automatic: weight, fasting and anything
 * about money (the two pre-fills). Health logging kinds are eligible only while the Health gate is open at that moment
 * (checked fail-closed when the cards arrive, never from a stored flag). A daily cap (default 20) on top. The record is
 * `zigoals:ai-options:v1` → `autoAccept`: `{kinds: {<kind>: true}, dailyCap, days: {<day>: n}}`; older builds ignore it.
 */
// Session Z-Local Part 5: a deletion (the card opens the app's own confirmation) and a page opening are never automatic either.
export const AUTO_ACCEPT_NEVER = ['log-weight', 'start-fast', 'stop-fast', 'prefill-holding', 'update-account-balance', 'delete-record', 'open-page', 'prefill-contribution', 'prefill-account'] as const satisfies readonly ActionKind[];
// Session Z-Local Part 5: Health's own edits, plans, counters, targets, preferences, the running night and the bell are Health kinds too.
export const AUTO_ACCEPT_HEALTH = ['log-food', 'create-food', 'create-recipe', 'plan-meal', 'grocery-item', 'log-water', 'counter', 'log-sleep', 'log-meditation', 'log-mood', 'log-steps', 'log-measurement',
  'edit-diary-entry', 'log-meal-plan', 'grocery-notes', 'set-favorite', 'create-counter', 'edit-counter', 'set-target', 'set-health-preference', 'start-night', 'end-night', 'set-bells'] as const satisfies readonly ActionKind[];
export const AUTO_ACCEPT_KINDS: readonly ActionKind[] = WRITING_KINDS.filter(k => !(AUTO_ACCEPT_NEVER as readonly string[]).includes(k));
export const AUTO_ACCEPT_CAP = {default: 20, min: 1, max: 100} as const;
/** Days of counts kept in the record. */
export const AUTO_ACCEPT_DAYS_KEPT = 31;
export type AutoAcceptReason = 'never' | 'off' | 'health-gate-closed' | 'cap';
export type AutoAcceptVerdict = {ok: true} | {ok: false; reason: AutoAcceptReason};
export const AUTO_ACCEPT_REASONS: Record<AutoAcceptReason, string> = {
  never: 'Never automatic: weight, fasting and anything about money are always confirmed by you.',
  off: 'Off for this kind of card.',
  'health-gate-closed': 'Health is not shared with ZIGi on this device, so ZIGi adds no Health entries by itself.',
  cap: 'Today’s auto-accept cap is reached; the rest waits for your tap.',
};
export const isHealthKind = (kind: string): boolean => (AUTO_ACCEPT_HEALTH as readonly string[]).includes(kind);
export const autoAcceptCap = (options: AiOptions): number => options.autoAccept?.dailyCap ?? AUTO_ACCEPT_CAP.default;
export const autoAcceptedOn = (options: AiOptions, day: string): number => options.autoAccept?.days?.[day] ?? 0;
export const autoAcceptOn = (options: AiOptions, kind: string): boolean => options.autoAccept?.kinds?.[kind] === true;
/** Whether a card of this kind may be added by ZIGi now; `extra` counts cards already chosen from the same reply. */
export function autoAcceptVerdict(options: AiOptions, kind: string, day: string, healthOpen: boolean, extra = 0): AutoAcceptVerdict {
  if (!(AUTO_ACCEPT_KINDS as readonly string[]).includes(kind)) return {ok: false, reason: 'never'};
  if (!autoAcceptOn(options, kind)) return {ok: false, reason: 'off'};
  if (isHealthKind(kind) && !healthOpen) return {ok: false, reason: 'health-gate-closed'};
  if (autoAcceptedOn(options, day) + extra >= autoAcceptCap(options)) return {ok: false, reason: 'cap'};
  return {ok: true};
}
/** One more addition today; counts older than a month go. */
export function noteAutoAccept(options: AiOptions, day: string): AiOptions {
  const floor = addLocalDays(day, -AUTO_ACCEPT_DAYS_KEPT);
  const days = Object.fromEntries(Object.entries(options.autoAccept?.days ?? {}).filter(([d]) => d >= floor));
  days[day] = (days[day] ?? 0) + 1;
  return {...options, autoAccept: {...(options.autoAccept ?? {}), days}};
}
export function setAutoAcceptKind(options: AiOptions, kind: ActionKind, on: boolean): AiOptions {
  if (!(AUTO_ACCEPT_KINDS as readonly string[]).includes(kind)) return options;
  const kinds = {...(options.autoAccept?.kinds ?? {})};
  if (on) kinds[kind] = true; else delete kinds[kind];
  return {...options, autoAccept: {...(options.autoAccept ?? {}), kinds}};
}
export function setAutoAcceptCap(options: AiOptions, cap: number): AiOptions {
  if (!Number.isInteger(cap) || cap < AUTO_ACCEPT_CAP.min || cap > AUTO_ACCEPT_CAP.max) return options;
  return {...options, autoAccept: {...(options.autoAccept ?? {}), dailyCap: cap}};
}
/** The switches in Settings, by page; Health's group is greyed while the gate is closed. */
export const AUTO_ACCEPT_GROUPS: readonly {title: string; kinds: readonly ActionKind[]; health?: boolean}[] = [
  {title: 'Habits', kinds: ['check-in', 'skip', 'create-habit', 'stack-habit', 'edit-habit', 'start-challenge']},
  {title: 'Goals', kinds: ['create-goal', 'add-goal-note', 'add-milestone', 'edit-goal']},
  {title: 'Health', health: true, kinds: AUTO_ACCEPT_HEALTH},
  {title: 'Today and ZIGi', kinds: ['create-reminder', 'review-intention', 'remember', 'add-link', 'add-widget']},
  // Session Z-Local Part 5: the new eligible kinds (deletions and page openings are never automatic and have no switch).
  {title: 'Habits and goals (more)', kinds: ['set-habit-state', 'vacation', 'unskip', 'remove-reminder', 'close-goal', 'reopen-goal']},
  {title: 'Today, the week and Settings', kinds: ['set-today-preset', 'edit-link', 'skip-review', 'set-review-weekday', 'set-wrap-up', 'set-page-visibility', 'set-start-page', 'set-zigi-look']},
];
export const AUTO_ACCEPT_LABELS: Record<ActionKind, string> = {
  'open-page': 'Opening a page', 'delete-record': 'Deletions', 'set-habit-state': 'Pausing, resuming or archiving a habit', vacation: 'Vacation days', unskip: 'Undoing a planned skip', 'remove-reminder': 'Removing a reminder', 'close-goal': 'Closing a goal', 'reopen-goal': 'Reopening a goal',
  'edit-diary-entry': 'Changes to a diary entry', 'log-meal-plan': 'Logging a planned meal', 'grocery-notes': 'Grocery notes', 'set-favorite': 'Favourite foods and recipes', 'create-counter': 'New counters', 'edit-counter': 'Changes to a counter', 'set-target': 'Health targets', 'set-health-preference': 'Health units', 'start-night': 'Starting a night', 'end-night': 'Ending a night', 'set-bells': 'The meditation bell',
  'set-today-preset': 'Today presets', 'edit-link': 'Changes to a link', 'skip-review': 'Skipping a weekly review', 'set-review-weekday': 'The weekly review\'s day', 'set-wrap-up': 'The evening wrap-up', 'set-page-visibility': 'Showing or hiding pages and buttons', 'set-start-page': 'The start page', 'set-zigi-look': 'ZIGi\'s look and feel',
  'prefill-contribution': 'Contribution forms (never automatic)', 'prefill-account': 'Account forms (never automatic)',
  'check-in': 'Habit check-ins', skip: 'Habit skips', 'create-habit': 'New habits', 'stack-habit': 'Habit stacks', 'edit-habit': 'Changes to a habit', 'start-challenge': 'Challenges',
  'create-goal': 'New goal drafts', 'add-goal-note': 'Goal notes', 'add-milestone': 'Milestones', 'edit-goal': 'Changes to a goal',
  'log-food': 'Food entries (typed or from a photo)', 'create-food': 'New foods', 'create-recipe': 'New recipes', 'plan-meal': 'Planned meals', 'grocery-item': 'Grocery items', 'log-water': 'Water', counter: 'Exercise counters',
  'log-sleep': 'Nights and naps', 'log-meditation': 'Mindful minutes', 'log-mood': 'How the day felt', 'log-steps': 'Steps', 'log-measurement': 'Body measurements',
  'create-reminder': 'Reminders', 'review-intention': 'The weekly intention', remember: '“Remember this” notes', 'add-link': 'Links on Today', 'add-widget': 'Widgets on Today',
  'log-weight': 'Weight (never automatic)', 'start-fast': 'Start a fast (never automatic)', 'stop-fast': 'Stop a fast (never automatic)', 'prefill-holding': 'Add-asset form (never automatic)', 'update-account-balance': 'Account balance form (never automatic)',
};
