import * as z from 'zod';
import {MAX_CUSTOM_HOURS} from '../../fasting/schema';
import {MAX_NOTE_CHARS, MEMORY_CATEGORIES} from '../store/records';
import {LINK_ICONS} from '../../links/schema';
import {WIDGET_KINDS_V1, WIDGET_KINDS_V3_ONLY} from '../../dashboard-settings';

/**
 * The actions ZIGi may propose (ADR-012, Part 5), as a whitelist: anything else in a reply is text. Every proposal is
 * validated here, shown as a card, and written only when the person confirms, through the same mutators the forms use.
 * Records are referred to by the per-reply handles of the context (h1, g2, f3, r1), resolved on the device; the AI
 * never sees an identifier. Money: pre-filling the add-asset form is the only money-adjacent kind, and the person
 * submits that form themselves.
 */
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export const MEASUREMENT_KINDS = ['waist', 'hips', 'chest', 'arm', 'thigh'] as const;
export {HOLDING_CATEGORIES} from './holding-categories';
import {HOLDING_CATEGORIES} from './holding-categories';
export const GOAL_CATEGORIES = ['Emergency Fund', 'First Home', 'Financial Freedom', 'Travel', 'Education', 'Custom'] as const;
export const GLASS_ML = 250, MAX_PROPOSALS = 10;
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const daySchema = z.union([z.literal('today'), z.literal('yesterday'), isoDay]).default('today');
export const handleSchema = z.string().trim().toLowerCase().regex(/^[hgfr]\d{1,3}$/, 'Use one of the handles from the context (h1, g2, f3, r1).');
const handleOf = (prefix: string, example: string) => z.string().trim().toLowerCase().regex(new RegExp(`^${prefix}\\d{1,3}$`), `Use one of the handles from the context (${example}).`);
/** Session V Part 7: a habit made by another card of the same reply ("new1"), so its reminder can point at it. */
export const refSchema = z.string().trim().toLowerCase().regex(/^new\d{1,2}$/, 'A new habit of this reply is named new1, new2, …');
/**
 * Session X-Local Part 6d: a habit or goal may be named by its handle (h2, g1) or by its exact title as the context
 * lists it; the planner resolves either on the device and refuses anything that matches no record or more than one.
 */
/** A short token of letters and digits with no space ("habit-42", "h7x") is a handle attempt, never a title. */
const HANDLE_LIKE = /^(?:[hgfr]\d{1,3}|new\d{1,2})$/i, HANDLE_JUNK = /^(?=.*\d)[a-z0-9_-]{1,8}$/i;
const named = (example: string) => z.string().trim().min(1).max(100)
  // A handle-shaped string that is not a handle ("habit-42", "H01x") stays refused here, as before; a title passes to the planner.
  .refine(v => HANDLE_LIKE.test(v) || !HANDLE_JUNK.test(v), `Use one of the handles from the context (${example}), or the exact title.`)
  .transform(v => HANDLE_LIKE.test(v) ? v.toLowerCase() : v);
const habitName = named('h1, h2'), goalName = named('g1');
const text = (max: number) => z.string().trim().min(1).max(max);
const positive = z.number().finite().positive();
const grams = z.number().finite().min(0).max(100_000);
const clock = z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time is HH:MM on a 24-hour clock.');
/** An AI's estimate of nutrients (per serving, or per 100 g for a recipe ingredient); a value it is unsure of stays out. */
const nutrients = z.strictObject({kcal: z.number().finite().min(0).max(100_000).optional(), protein_g: grams.optional(), carbs_g: grams.optional(), fat_g: grams.optional()});
/** How far ahead a meal may be planned, in days. */
export const PLAN_AHEAD_DAYS = 62;
export const REMINDER_FOR = ['habit', 'water', 'goal', 'wealth', 'pack'] as const;
const habitType = z.enum(['build', 'quit', 'limit']), habitMeasurement = z.union([z.enum(['done', 'count', 'minutes', 'hours']), z.strictObject({unit: text(24)})]);
const habitSchedule = z.union([z.literal('daily'), z.strictObject({weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)}), z.strictObject({timesPerWeek: z.number().int().min(1).max(7)}), z.strictObject({everyDays: z.number().int().min(2).max(365)})]);
const habitTimeOfDay = z.enum(['anytime', 'morning', 'afternoon', 'evening']), habitTarget = z.number().finite().min(0).max(1_000_000_000);
const habitFields = {
  title: text(100), type: habitType.default('build'),
  measurement: habitMeasurement.default('done'),
  target: habitTarget.optional(),
  schedule: habitSchedule.default('daily'),
  timeOfDay: habitTimeOfDay.default('anytime'), description: z.string().trim().max(500).default(''), category: text(50).optional(),
};
/**
 * Session X-Local Part 5a: the four goal types Goals itself offers. A project counts its milestones (at least one, no
 * amount); the other three need a target and a currency or asset. Checked by `goalRules` on both the card and the composite.
 */
export const GOAL_TYPES = ['VALUE', 'QUANTITY', 'REWARD', 'PROJECT'] as const;
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/);
const goalFields = {name: text(100), type: z.enum(GOAL_TYPES).default('VALUE'), target: positive.max(1e15).optional(), currency: currency.optional(), targetDate: isoDay.optional(), category: z.enum(GOAL_CATEGORIES).optional(), notes: z.string().trim().max(2000).default('')};
const goalRules = (a: {type: (typeof GOAL_TYPES)[number]; target?: number; currency?: string; milestones?: string[]}, ctx: z.core.$RefinementCtx) => {
  if (a.type === 'PROJECT') { if (!a.milestones?.length) ctx.addIssue({code: 'custom', path: ['milestones'], message: 'A project needs at least one milestone.'}); return; }
  if (a.target === undefined) ctx.addIssue({code: 'custom', path: ['target'], message: 'Give the goal a target amount.'});
  if (a.currency === undefined) ctx.addIssue({code: 'custom', path: ['currency'], message: 'Give the goal a currency or asset (EUR, USD, ZIG).'});
};
/** Today's widget kinds (lib/dashboard-settings.ts): the catalogue is the whitelist. */
export const WIDGET_KINDS = [...WIDGET_KINDS_V1, ...WIDGET_KINDS_V3_ONLY] as const;
/**
 * Session Z-Local Part 5 (docs/product/ZIGI_ACTIONS_Z.md): the pages ZIGi may open, their views, the records a card may
 * ask the app to delete (the card opens the app's own confirmation; nothing is deleted by the card), and the targets a
 * person can set in Health. Every kind below writes through the page's own mutator, or hands the runner an effect.
 */
export const OPEN_PAGES = ['today', 'goals', 'habits', 'health', 'wealth', 'portfolio', 'markets', 'staking', 'ecosystem', 'chess', 'activity', 'settings', 'help', 'music'] as const;
export const PAGE_VIEWS = ['sleep', 'meditation', 'devices', 'imports', 'zigi', 'pages', 'new-goal'] as const;
export const DELETE_TARGETS = ['habit', 'goal', 'water-entry', 'weight', 'diary-entry', 'food', 'recipe', 'meal-plan', 'counter', 'night', 'session', 'fast', 'link', 'widget', 'note'] as const;
export const HABIT_STATES = ['active', 'paused', 'archived'] as const;
export const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('log-water'), millilitres: positive.max(10_000).optional(), glasses: positive.max(40).optional(), day: daySchema}).refine(a => a.millilitres !== undefined || a.glasses !== undefined, 'Say how much water: millilitres or glasses.'),
  z.strictObject({kind: z.literal('log-weight'), value: positive.max(1000), unit: z.enum(['kg', 'lb']), day: daySchema}),
  z.strictObject({kind: z.literal('log-steps'), steps: z.number().int().min(1).max(1_000_000), minutes: z.number().int().min(0).max(1440).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-food'), name: text(100), meal: z.enum(MEALS), quantity: positive.max(100).default(1), food: handleSchema.optional(),
    estimate: z.strictObject({kcal: z.number().finite().min(0).max(100_000).optional(), protein_g: grams.optional(), carbs_g: grams.optional(), fat_g: grams.optional(), serving_g: positive.max(100_000).optional(), serving_ml: positive.max(100_000).optional()})
      .refine(e => e.serving_g === undefined || e.serving_ml === undefined, 'Give the serving in grams or in millilitres, not both.').optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-measurement'), kind_of: z.enum(MEASUREMENT_KINDS), value: positive.max(500), unit: z.enum(['cm', 'in']), day: daySchema}),
  z.strictObject({kind: z.literal('check-in'), habit: habitName, value: z.number().finite().min(0).max(1_000_000_000).optional(),
    /** Session V Part 7: the amount in minutes or in a unit; converted to the habit's own measure, or refused. */
    minutes: z.number().finite().positive().max(10_080).optional(), quantity: z.number().finite().min(0).max(1_000_000_000).optional(), unit: z.string().trim().min(1).max(24).optional(),
    note: z.string().trim().max(500).optional(), day: daySchema}).refine(a => [a.value, a.minutes, a.quantity].filter(v => v !== undefined).length <= 1, 'Give one amount: a value, minutes or a quantity.'),
  z.strictObject({kind: z.literal('skip'), habit: habitName, reason: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('create-habit'), ...habitFields, ref: refSchema.optional()}),
  z.strictObject({kind: z.literal('start-fast'), targetHours: z.number().int().min(1).max(MAX_CUSTOM_HOURS)}),
  z.strictObject({kind: z.literal('stop-fast')}),
  z.strictObject({kind: z.literal('create-goal'), ...goalFields, milestones: z.array(text(100)).max(10).optional()}).superRefine(goalRules),
  z.strictObject({kind: z.literal('add-goal-note'), goal: goalName, note: text(2000)}),
  z.strictObject({kind: z.literal('prefill-holding'), category: z.enum(HOLDING_CATEGORIES), name: text(100), quantity: z.union([positive.max(1e15), z.string().trim().regex(/^\d+(\.\d+)?$/)]), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'), value: positive.max(1e15).optional(), symbol: z.string().trim().max(30).optional(), notes: z.string().trim().max(2000).optional()}),
  // ---- Session V Part 7 ----
  z.strictObject({kind: z.literal('create-food'), name: text(100), brand: z.string().trim().max(80).optional(), serving_g: positive.max(100_000).optional(), serving_ml: positive.max(100_000).optional(), estimate: nutrients.optional()})
    .refine(a => a.serving_g === undefined || a.serving_ml === undefined, 'Give the serving in grams or in millilitres, not both.'),
  z.strictObject({kind: z.literal('create-recipe'), name: text(100), servings: positive.max(100).default(1),
    ingredients: z.array(z.strictObject({name: text(100), food: handleOf('f', 'f3').optional(), grams: positive.max(100_000).optional(), millilitres: positive.max(100_000).optional(), quantity: positive.max(1000).optional(), unit: text(24).optional(), servings: positive.max(1000).optional(), estimate_per_100g: nutrients.optional()})
      .refine(i => i.grams === undefined || i.servings === undefined, 'Give an ingredient in grams or in servings, not both.')).min(1).max(30)}),
  z.strictObject({kind: z.literal('plan-meal'), recipe: handleOf('r', 'r1').optional(), saved_meal: handleOf('m', 'm1').optional(), servings: positive.max(100).default(1), meal: z.enum(MEALS), day: daySchema})
    .refine(a => (a.recipe === undefined) !== (a.saved_meal === undefined), 'Plan one recipe (r1) or one saved meal (m1).'),
  z.strictObject({kind: z.literal('grocery-item'), items: z.array(text(100)).min(1).max(30)}),
  z.strictObject({kind: z.literal('counter'), counter: z.string().trim().min(1).max(40), count: z.number().int().min(-1000).max(1000).refine(n => n !== 0, 'A count other than zero.'), day: daySchema}),
  z.strictObject({kind: z.literal('create-reminder'), for: z.enum(REMINDER_FOR), habit: habitName.optional(), goal: goalName.optional(), time: clock, weekday: z.number().int().min(0).max(6).optional()})
    .superRefine((a, ctx) => {
      if (a.for === 'habit' && !a.habit) ctx.addIssue({code: 'custom', path: ['habit'], message: 'Name the habit (h1, or new1 for a habit made in this reply).'});
      if (a.for === 'goal' && !a.goal) ctx.addIssue({code: 'custom', path: ['goal'], message: 'Name the goal (g1).'});
      if ((a.for === 'habit' || a.for === 'water') && a.weekday !== undefined) ctx.addIssue({code: 'custom', path: ['weekday'], message: 'Habit and water reminders are daily.'});
    }),
  z.strictObject({kind: z.literal('review-intention'), intention: text(2000)}),
  // ---- Session V Part 8: "Remember this?", a note for What ZIGi knows about me (the planner refuses Health notes) ----
  z.strictObject({kind: z.literal('remember'), text: text(MAX_NOTE_CHARS), category: z.enum(MEMORY_CATEGORIES).default('other')}),
  // ---- Session W Part 21 (W7): a night, mindful minutes, a milestone, an account's balance (pre-fill only), a challenge ----
  z.strictObject({kind: z.literal('log-sleep'), wake: clock.optional(), bedtime: clock.optional(), hours: z.number().finite().positive().max(24).optional(), minutes: z.number().int().min(1).max(1440).optional(),
    quality: z.number().int().min(1).max(5).optional(), nap: z.boolean().optional(), day: daySchema})
    .refine(a => (a.bedtime !== undefined) !== (a.hours !== undefined || a.minutes !== undefined), 'Give the bedtime or how long the night was (hours or minutes), one of the two.')
    // Session X-Local Part 6d: a nap that just ended needs no wake time ("I napped for 30 minutes"); a night always does.
    .refine(a => a.wake !== undefined || (a.nap === true && a.bedtime === undefined), 'Say when it ended (wake, HH:MM).'),
  z.strictObject({kind: z.literal('log-meditation'), minutes: z.number().int().min(1).max(1440), time: clock.optional(), note: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('add-milestone'), goal: goalName, title: text(100), value: positive.max(1e15).optional()}),
  z.strictObject({kind: z.literal('update-account-balance'), account: text(80), balance: z.union([z.number().finite().min(0).max(1e15), z.string().trim().regex(/^\d+(\.\d{1,8})?$/)]),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('start-challenge'), habit: habitName, days: z.number().int().min(7).max(365).default(30)}),
  // ---- Session X-Local Part 5a: stacks, edits of plain fields, the wrap-up's mood, a link and a widget for Today ----
  z.strictObject({kind: z.literal('stack-habit'), habit: habitName, after: habitName}).refine(a => a.habit.toLowerCase() !== a.after.toLowerCase(), 'A habit cannot follow itself.'),
  z.strictObject({kind: z.literal('edit-habit'), habit: habitName, title: text(100).optional(), type: habitType.optional(), measurement: habitMeasurement.optional(), target: habitTarget.optional(), schedule: habitSchedule.optional(),
    timeOfDay: habitTimeOfDay.optional(), description: z.string().trim().max(500).optional(), category: text(50).optional()}).refine(a => Object.keys(a).some(k => k !== 'kind' && k !== 'habit'), 'Say what to change about the habit.'),
  z.strictObject({kind: z.literal('edit-goal'), goal: goalName, name: text(100).optional(), target: positive.max(1e15).optional(), targetDate: isoDay.nullable().optional(), notes: z.string().trim().max(2000).optional(), category: z.enum(GOAL_CATEGORIES).optional()})
    .refine(a => Object.keys(a).some(k => k !== 'kind' && k !== 'goal'), 'Say what to change about the goal.'),
  z.strictObject({kind: z.literal('log-mood'), mood: z.number().int().min(1).max(5), note: z.string().trim().max(280).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('add-link'), label: text(40), url: z.string().trim().min(1).max(500).regex(/^https:\/\//i, 'Only a full https:// address can be added.'), icon: z.enum(LINK_ICONS).optional()}),
  z.strictObject({kind: z.literal('add-widget'), widget: z.enum(WIDGET_KINDS), metric: z.string().trim().min(1).max(40).optional(), habit: habitName.optional(), goal: goalName.optional(), size: z.enum(['compact', 'wide']).default('compact'), title: z.string().trim().max(80).optional()}),
  // ---- Session Z-Local Part 5: navigation, deletions (the app's own confirmation), habit states, vacations, goals' lifecycle ----
  z.strictObject({kind: z.literal('open-page'), page: z.enum(OPEN_PAGES), view: z.enum(PAGE_VIEWS).optional(), habit: habitName.optional(), goal: goalName.optional(), asset: text(100).optional()}),
  z.strictObject({kind: z.literal('delete-record'), what: z.enum(DELETE_TARGETS), habit: habitName.optional(), goal: goalName.optional(), name: text(100).optional(), day: daySchema})
    .superRefine((a, ctx) => {
      if (a.what === 'habit' && !a.habit) ctx.addIssue({code: 'custom', path: ['habit'], message: 'Name the habit (h1, or its exact title).'});
      if (a.what === 'goal' && !a.goal) ctx.addIssue({code: 'custom', path: ['goal'], message: 'Name the goal (g1, or its exact title).'});
      if (['food', 'recipe', 'counter', 'link', 'widget', 'note', 'diary-entry'].includes(a.what) && !a.name) ctx.addIssue({code: 'custom', path: ['name'], message: 'Name the record to delete (its exact title, or the handle).'});
    }),
  z.strictObject({kind: z.literal('set-habit-state'), habit: habitName, state: z.enum(HABIT_STATES)}),
  z.strictObject({kind: z.literal('vacation'), from: isoDay, to: isoDay, clear: z.boolean().default(false), habits: z.array(habitName).max(20).optional()}).refine(a => a.from <= a.to, 'The vacation ends before it starts.'),
  z.strictObject({kind: z.literal('unskip'), habit: habitName, day: daySchema}),
  z.strictObject({kind: z.literal('remove-reminder'), for: z.enum(['habit', 'water']), habit: habitName.optional()}).superRefine((a, ctx) => { if (a.for === 'habit' && !a.habit) ctx.addIssue({code: 'custom', path: ['habit'], message: 'Name the habit (h1, or its exact title).'}); }),
  z.strictObject({kind: z.literal('close-goal'), goal: goalName}),
  z.strictObject({kind: z.literal('reopen-goal'), goal: goalName}),
]);
export type Action = z.infer<typeof actionSchema>;
export type ActionKind = Action['kind'];
export const ACTION_KINDS = ['log-water', 'log-weight', 'log-steps', 'log-food', 'log-measurement', 'check-in', 'skip', 'create-habit', 'start-fast', 'stop-fast', 'create-goal', 'add-goal-note', 'prefill-holding',
  'create-food', 'create-recipe', 'plan-meal', 'grocery-item', 'counter', 'create-reminder', 'review-intention', 'remember',
  'log-sleep', 'log-meditation', 'add-milestone', 'update-account-balance', 'start-challenge',
  'stack-habit', 'edit-habit', 'edit-goal', 'log-mood', 'add-link', 'add-widget',
  'open-page', 'delete-record', 'set-habit-state', 'vacation', 'unskip', 'remove-reminder', 'close-goal', 'reopen-goal'] as const satisfies readonly ActionKind[];
/**
 * Session V Part 7: two requests that become several cards, so each part is confirmed on its own. "plan-goal" is a goal
 * draft with milestone notes plus up to three supporting habits; "build-habit" is a habit plus its daily reminder. The
 * parser expands them before validation; they never reach the planner themselves.
 */
export const compositeSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('plan-goal'), ...goalFields, milestones: z.array(text(100)).max(10).default([]), habits: z.array(z.strictObject(habitFields)).max(3).default([])}).superRefine(goalRules),
  z.strictObject({kind: z.literal('build-habit'), ...habitFields, reminder: clock.optional()}),
]);
export type Composite = z.infer<typeof compositeSchema>;
export const COMPOSITE_KINDS = ['plan-goal', 'build-habit'] as const;
/** The cards a composite request becomes; `next` numbers the new habits of the reply (new1, new2, …). */
export function expandComposite(composite: Composite, next: () => string): Record<string, unknown>[] {
  if (composite.kind === 'plan-goal') {
    const {kind, habits, milestones, ...goal} = composite; void kind;
    return [{kind: 'create-goal', ...goal, ...(milestones.length ? {milestones} : {})}, ...habits.map(h => ({kind: 'create-habit', ...h}))];
  }
  const {kind, reminder, ...habit} = composite; void kind;
  if (!reminder) return [{kind: 'create-habit', ...habit}];
  const ref = next();
  return [{kind: 'create-habit', ...habit, ref}, {kind: 'create-reminder', for: 'habit', habit: ref, time: reminder}];
}
/** Kinds that write a record on confirmation; the pre-fills only open a form the person submits (a holding, an account's balance). */
export const PREFILL_KINDS: readonly ActionKind[] = ['prefill-holding', 'update-account-balance'];
export const WRITING_KINDS: readonly ActionKind[] = ACTION_KINDS.filter(k => !PREFILL_KINDS.includes(k));
/** Aliases the AI may use; mapped before validation (a partial check-in is a check-in with a value). */
export const KIND_ALIASES: Record<string, ActionKind | Composite['kind']> = {partial: 'check-in', 'check_in': 'check-in', checkin: 'check-in', water: 'log-water', weight: 'log-weight', steps: 'log-steps', food: 'log-food', meal: 'log-food', measurement: 'log-measurement', 'start_fast': 'start-fast', 'stop_fast': 'stop-fast', 'create_habit': 'create-habit', 'create_goal': 'create-goal', 'add_goal_note': 'add-goal-note', 'prefill_holding': 'prefill-holding', 'add-holding': 'prefill-holding',
  'create_food': 'create-food', 'create_recipe': 'create-recipe', recipe: 'create-recipe', 'plan_meal': 'plan-meal', 'meal-plan': 'plan-meal', 'grocery': 'grocery-item', 'grocery_item': 'grocery-item', groceries: 'grocery-item', 'counter-increment': 'counter', 'create_reminder': 'create-reminder', reminder: 'create-reminder', 'review_intention': 'review-intention', intention: 'review-intention', 'plan_goal': 'plan-goal', 'build_habit': 'build-habit',
  'remember-this': 'remember', 'remember_this': 'remember', memory: 'remember',
  // Session Z-Local Part 5: the new kinds' plain names; no alias for a delete-* name (an unknown kind stays refused, golden `unknown-kind`).
  navigate: 'open-page', 'go-to': 'open-page', 'open_page': 'open-page', 'show-page': 'open-page', 'delete_record': 'delete-record', 'set_habit_state': 'set-habit-state', 'habit-state': 'set-habit-state',
  'vacation-days': 'vacation', 'set-vacation': 'vacation', 'mark-vacation': 'vacation', 'unplan-skip': 'unskip', 'un-skip': 'unskip', 'undo-skip': 'unskip', 'remove_reminder': 'remove-reminder', 'delete-reminder': 'remove-reminder', 'close_goal': 'close-goal', 'reopen_goal': 'reopen-goal',
  // Session X-Local Phase 2: names seen on the wire (phi4-mini, qwen3.6) for kinds that exist.
  'create-goal-note': 'add-goal-note', 'note-goal': 'add-goal-note', 'log-nap': 'log-sleep', nap: 'log-sleep', 'mood-log': 'log-mood', 'set-reminder': 'create-reminder', 'add-reminder': 'create-reminder', 'add-grocery': 'grocery-item', 'log-measure': 'log-measurement',
  // Session W Part 21
  sleep: 'log-sleep', 'log_sleep': 'log-sleep', night: 'log-sleep', meditation: 'log-meditation', 'log_meditation': 'log-meditation', 'mindful-minutes': 'log-meditation', 'mindful_minutes': 'log-meditation',
  milestone: 'add-milestone', 'add_milestone': 'add-milestone', 'account-balance': 'update-account-balance', 'update_account_balance': 'update-account-balance', balance: 'update-account-balance',
  challenge: 'start-challenge', 'start_challenge': 'start-challenge',
  // Session X-Local Part 5a
  stack: 'stack-habit', 'stack_habit': 'stack-habit', 'add-to-stack': 'stack-habit', 'add_to_stack': 'stack-habit', 'create-stack': 'stack-habit', 'create_stack': 'stack-habit',
  'edit_habit': 'edit-habit', 'update-habit': 'edit-habit', 'update_habit': 'edit-habit', 'change-habit': 'edit-habit', 'rename-habit': 'edit-habit',
  // Session X-Local Part 6d (seen on phi4-mini): a check-in, a challenge and a goal note under other names.
  'habit_checkin': 'check-in', 'habit-checkin': 'check-in', 'habit-check-in': 'check-in', 'log-habit': 'check-in', 'log_habit': 'check-in', 'complete-habit': 'check-in', 'habit-done': 'check-in',
  'create-challenge': 'start-challenge', 'create_challenge': 'start-challenge', 'new-challenge': 'start-challenge', 'update-goal-note': 'add-goal-note', 'goal-note': 'add-goal-note', 'add-note': 'add-goal-note',
  'log-mood-entry': 'log-mood', 'mood-entry': 'log-mood', 'log-sleep-entry': 'log-sleep', 'log-night': 'log-sleep', 'add-sleep': 'log-sleep', 'add-meditation': 'log-meditation', 'log-mindful-minutes': 'log-meditation',
  'edit_goal': 'edit-goal', 'update-goal': 'edit-goal', 'update_goal': 'edit-goal', 'change-goal': 'edit-goal', 'rename-goal': 'edit-goal',
  mood: 'log-mood', 'log_mood': 'log-mood', 'add-mood': 'log-mood',
  link: 'add-link', 'add_link': 'add-link', 'create-link': 'add-link', 'my-link': 'add-link',
  widget: 'add-widget', 'add_widget': 'add-widget', 'pin-widget': 'add-widget', 'pin-to-today': 'add-widget', 'create-widget': 'add-widget'};
