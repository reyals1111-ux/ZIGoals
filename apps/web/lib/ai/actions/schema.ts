import {z} from 'zod';
import {MAX_CUSTOM_HOURS} from '../../fasting/schema';
import {MAX_NOTE_CHARS, MEMORY_CATEGORIES} from '../store/records';

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
const text = (max: number) => z.string().trim().min(1).max(max);
const positive = z.number().finite().positive();
const grams = z.number().finite().min(0).max(100_000);
const clock = z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time is HH:MM on a 24-hour clock.');
/** An AI's estimate of nutrients (per serving, or per 100 g for a recipe ingredient); a value it is unsure of stays out. */
const nutrients = z.strictObject({kcal: z.number().finite().min(0).max(100_000).optional(), protein_g: grams.optional(), carbs_g: grams.optional(), fat_g: grams.optional()});
/** How far ahead a meal may be planned, in days. */
export const PLAN_AHEAD_DAYS = 62;
export const REMINDER_FOR = ['habit', 'water', 'goal', 'wealth', 'pack'] as const;
const habitFields = {
  title: text(100), type: z.enum(['build', 'quit', 'limit']).default('build'),
  measurement: z.union([z.enum(['done', 'count', 'minutes', 'hours']), z.strictObject({unit: text(24)})]).default('done'),
  target: z.number().finite().min(0).max(1_000_000_000).optional(),
  schedule: z.union([z.literal('daily'), z.strictObject({weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)}), z.strictObject({timesPerWeek: z.number().int().min(1).max(7)}), z.strictObject({everyDays: z.number().int().min(2).max(365)})]).default('daily'),
  timeOfDay: z.enum(['anytime', 'morning', 'afternoon', 'evening']).default('anytime'), description: z.string().trim().max(500).default(''), category: text(50).optional(),
};
const goalFields = {name: text(100), type: z.enum(['VALUE', 'QUANTITY']).default('VALUE'), target: positive.max(1e15), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/), targetDate: isoDay.optional(), category: z.enum(GOAL_CATEGORIES).optional(), notes: z.string().trim().max(2000).default('')};
export const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('log-water'), millilitres: positive.max(10_000).optional(), glasses: positive.max(40).optional(), day: daySchema}).refine(a => a.millilitres !== undefined || a.glasses !== undefined, 'Say how much water: millilitres or glasses.'),
  z.strictObject({kind: z.literal('log-weight'), value: positive.max(1000), unit: z.enum(['kg', 'lb']), day: daySchema}),
  z.strictObject({kind: z.literal('log-steps'), steps: z.number().int().min(1).max(1_000_000), minutes: z.number().int().min(0).max(1440).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-food'), name: text(100), meal: z.enum(MEALS), quantity: positive.max(100).default(1), food: handleSchema.optional(),
    estimate: z.strictObject({kcal: z.number().finite().min(0).max(100_000).optional(), protein_g: grams.optional(), carbs_g: grams.optional(), fat_g: grams.optional(), serving_g: positive.max(100_000).optional()}).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-measurement'), kind_of: z.enum(MEASUREMENT_KINDS), value: positive.max(500), unit: z.enum(['cm', 'in']), day: daySchema}),
  z.strictObject({kind: z.literal('check-in'), habit: handleSchema, value: z.number().finite().min(0).max(1_000_000_000).optional(),
    /** Session V Part 7: the amount in minutes or in a unit; converted to the habit's own measure, or refused. */
    minutes: z.number().finite().positive().max(10_080).optional(), quantity: z.number().finite().min(0).max(1_000_000_000).optional(), unit: z.string().trim().min(1).max(24).optional(),
    note: z.string().trim().max(500).optional(), day: daySchema}).refine(a => [a.value, a.minutes, a.quantity].filter(v => v !== undefined).length <= 1, 'Give one amount: a value, minutes or a quantity.'),
  z.strictObject({kind: z.literal('skip'), habit: handleSchema, reason: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('create-habit'), ...habitFields, ref: refSchema.optional()}),
  z.strictObject({kind: z.literal('start-fast'), targetHours: z.number().int().min(1).max(MAX_CUSTOM_HOURS)}),
  z.strictObject({kind: z.literal('stop-fast')}),
  z.strictObject({kind: z.literal('create-goal'), ...goalFields, milestones: z.array(text(100)).max(10).optional()}),
  z.strictObject({kind: z.literal('add-goal-note'), goal: handleSchema, note: text(2000)}),
  z.strictObject({kind: z.literal('prefill-holding'), category: z.enum(HOLDING_CATEGORIES), name: text(100), quantity: z.union([positive.max(1e15), z.string().trim().regex(/^\d+(\.\d+)?$/)]), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'), value: positive.max(1e15).optional(), symbol: z.string().trim().max(30).optional(), notes: z.string().trim().max(2000).optional()}),
  // ---- Session V Part 7 ----
  z.strictObject({kind: z.literal('create-food'), name: text(100), brand: z.string().trim().max(80).optional(), serving_g: positive.max(100_000).optional(), serving_ml: positive.max(100_000).optional(), estimate: nutrients.optional()})
    .refine(a => a.serving_g === undefined || a.serving_ml === undefined, 'Give the serving in grams or in millilitres, not both.'),
  z.strictObject({kind: z.literal('create-recipe'), name: text(100), servings: positive.max(100).default(1),
    ingredients: z.array(z.strictObject({name: text(100), food: handleOf('f', 'f3').optional(), grams: positive.max(100_000).optional(), servings: positive.max(1000).optional(), estimate_per_100g: nutrients.optional()})
      .refine(i => i.grams === undefined || i.servings === undefined, 'Give an ingredient in grams or in servings, not both.')).min(1).max(30)}),
  z.strictObject({kind: z.literal('plan-meal'), recipe: handleOf('r', 'r1').optional(), saved_meal: handleOf('m', 'm1').optional(), servings: positive.max(100).default(1), meal: z.enum(MEALS), day: daySchema})
    .refine(a => (a.recipe === undefined) !== (a.saved_meal === undefined), 'Plan one recipe (r1) or one saved meal (m1).'),
  z.strictObject({kind: z.literal('grocery-item'), items: z.array(text(100)).min(1).max(30)}),
  z.strictObject({kind: z.literal('counter'), counter: z.string().trim().min(1).max(40), count: z.number().int().min(-1000).max(1000).refine(n => n !== 0, 'A count other than zero.'), day: daySchema}),
  z.strictObject({kind: z.literal('create-reminder'), for: z.enum(REMINDER_FOR), habit: z.union([handleSchema, refSchema]).optional(), goal: handleOf('g', 'g1').optional(), time: clock, weekday: z.number().int().min(0).max(6).optional()})
    .superRefine((a, ctx) => {
      if (a.for === 'habit' && !a.habit) ctx.addIssue({code: 'custom', path: ['habit'], message: 'Name the habit (h1, or new1 for a habit made in this reply).'});
      if (a.for === 'goal' && !a.goal) ctx.addIssue({code: 'custom', path: ['goal'], message: 'Name the goal (g1).'});
      if ((a.for === 'habit' || a.for === 'water') && a.weekday !== undefined) ctx.addIssue({code: 'custom', path: ['weekday'], message: 'Habit and water reminders are daily.'});
    }),
  z.strictObject({kind: z.literal('review-intention'), intention: text(2000)}),
  // ---- Session V Part 8: "Remember this?", a note for What ZIGi knows about me (the planner refuses Health notes) ----
  z.strictObject({kind: z.literal('remember'), text: text(MAX_NOTE_CHARS), category: z.enum(MEMORY_CATEGORIES).default('other')}),
  // ---- Session W Part 21 (W7): a night, mindful minutes, a milestone, an account's balance (pre-fill only), a challenge ----
  z.strictObject({kind: z.literal('log-sleep'), wake: clock, bedtime: clock.optional(), hours: z.number().finite().positive().max(24).optional(), minutes: z.number().int().min(1).max(1440).optional(),
    quality: z.number().int().min(1).max(5).optional(), nap: z.boolean().optional(), day: daySchema})
    .refine(a => (a.bedtime !== undefined) !== (a.hours !== undefined || a.minutes !== undefined), 'Give the bedtime or how long the night was (hours or minutes), one of the two.'),
  z.strictObject({kind: z.literal('log-meditation'), minutes: z.number().int().min(1).max(1440), time: clock.optional(), note: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('add-milestone'), goal: handleOf('g', 'g1'), title: text(100), value: positive.max(1e15).optional()}),
  z.strictObject({kind: z.literal('update-account-balance'), account: text(80), balance: z.union([z.number().finite().min(0).max(1e15), z.string().trim().regex(/^\d+(\.\d{1,8})?$/)]),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('start-challenge'), habit: handleSchema, days: z.number().int().min(7).max(365).default(30)}),
]);
export type Action = z.infer<typeof actionSchema>;
export type ActionKind = Action['kind'];
export const ACTION_KINDS = ['log-water', 'log-weight', 'log-steps', 'log-food', 'log-measurement', 'check-in', 'skip', 'create-habit', 'start-fast', 'stop-fast', 'create-goal', 'add-goal-note', 'prefill-holding',
  'create-food', 'create-recipe', 'plan-meal', 'grocery-item', 'counter', 'create-reminder', 'review-intention', 'remember',
  'log-sleep', 'log-meditation', 'add-milestone', 'update-account-balance', 'start-challenge'] as const satisfies readonly ActionKind[];
/**
 * Session V Part 7: two requests that become several cards, so each part is confirmed on its own. "plan-goal" is a goal
 * draft with milestone notes plus up to three supporting habits; "build-habit" is a habit plus its daily reminder. The
 * parser expands them before validation; they never reach the planner themselves.
 */
export const compositeSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('plan-goal'), ...goalFields, milestones: z.array(text(100)).max(10).default([]), habits: z.array(z.strictObject(habitFields)).max(3).default([])}),
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
  // Session W Part 21
  sleep: 'log-sleep', 'log_sleep': 'log-sleep', night: 'log-sleep', meditation: 'log-meditation', 'log_meditation': 'log-meditation', 'mindful-minutes': 'log-meditation', 'mindful_minutes': 'log-meditation',
  milestone: 'add-milestone', 'add_milestone': 'add-milestone', 'account-balance': 'update-account-balance', 'update_account_balance': 'update-account-balance', balance: 'update-account-balance',
  challenge: 'start-challenge', 'start_challenge': 'start-challenge'};
