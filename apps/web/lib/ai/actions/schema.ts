import {z} from 'zod';
import {MAX_CUSTOM_HOURS} from '../../fasting/schema';

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
const text = (max: number) => z.string().trim().min(1).max(max);
const positive = z.number().finite().positive();
const grams = z.number().finite().min(0).max(100_000);
export const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('log-water'), millilitres: positive.max(10_000).optional(), glasses: positive.max(40).optional(), day: daySchema}).refine(a => a.millilitres !== undefined || a.glasses !== undefined, 'Say how much water: millilitres or glasses.'),
  z.strictObject({kind: z.literal('log-weight'), value: positive.max(1000), unit: z.enum(['kg', 'lb']), day: daySchema}),
  z.strictObject({kind: z.literal('log-steps'), steps: z.number().int().min(1).max(1_000_000), minutes: z.number().int().min(0).max(1440).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-food'), name: text(100), meal: z.enum(MEALS), quantity: positive.max(100).default(1), food: handleSchema.optional(),
    estimate: z.strictObject({kcal: z.number().finite().min(0).max(100_000).optional(), protein_g: grams.optional(), carbs_g: grams.optional(), fat_g: grams.optional(), serving_g: positive.max(100_000).optional()}).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('log-measurement'), kind_of: z.enum(MEASUREMENT_KINDS), value: positive.max(500), unit: z.enum(['cm', 'in']), day: daySchema}),
  z.strictObject({kind: z.literal('check-in'), habit: handleSchema, value: z.number().finite().min(0).max(1_000_000_000).optional(), note: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('skip'), habit: handleSchema, reason: z.string().trim().max(500).optional(), day: daySchema}),
  z.strictObject({kind: z.literal('create-habit'), title: text(100), type: z.enum(['build', 'quit', 'limit']).default('build'),
    measurement: z.union([z.enum(['done', 'count', 'minutes', 'hours']), z.strictObject({unit: text(24)})]).default('done'),
    target: z.number().finite().min(0).max(1_000_000_000).optional(),
    schedule: z.union([z.literal('daily'), z.strictObject({weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)}), z.strictObject({timesPerWeek: z.number().int().min(1).max(7)}), z.strictObject({everyDays: z.number().int().min(2).max(365)})]).default('daily'),
    timeOfDay: z.enum(['anytime', 'morning', 'afternoon', 'evening']).default('anytime'), description: z.string().trim().max(500).default(''), category: text(50).optional()}),
  z.strictObject({kind: z.literal('start-fast'), targetHours: z.number().int().min(1).max(MAX_CUSTOM_HOURS)}),
  z.strictObject({kind: z.literal('stop-fast')}),
  z.strictObject({kind: z.literal('create-goal'), name: text(100), type: z.enum(['VALUE', 'QUANTITY']).default('VALUE'), target: positive.max(1e15), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/), targetDate: isoDay.optional(), category: z.enum(GOAL_CATEGORIES).optional(), notes: z.string().trim().max(2000).default('')}),
  z.strictObject({kind: z.literal('add-goal-note'), goal: handleSchema, note: text(2000)}),
  z.strictObject({kind: z.literal('prefill-holding'), category: z.enum(HOLDING_CATEGORIES), name: text(100), quantity: z.union([positive.max(1e15), z.string().trim().regex(/^\d+(\.\d+)?$/)]), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'), value: positive.max(1e15).optional(), symbol: z.string().trim().max(30).optional(), notes: z.string().trim().max(2000).optional()}),
]);
export type Action = z.infer<typeof actionSchema>;
export type ActionKind = Action['kind'];
export const ACTION_KINDS = ['log-water', 'log-weight', 'log-steps', 'log-food', 'log-measurement', 'check-in', 'skip', 'create-habit', 'start-fast', 'stop-fast', 'create-goal', 'add-goal-note', 'prefill-holding'] as const satisfies readonly ActionKind[];
/** Kinds that write a record on confirmation; the pre-fill only opens a form the person submits. */
export const WRITING_KINDS: readonly ActionKind[] = ACTION_KINDS.filter(k => k !== 'prefill-holding');
/** Aliases the AI may use; mapped before validation (a partial check-in is a check-in with a value). */
export const KIND_ALIASES: Record<string, ActionKind> = {partial: 'check-in', 'check_in': 'check-in', checkin: 'check-in', water: 'log-water', weight: 'log-weight', steps: 'log-steps', food: 'log-food', meal: 'log-food', measurement: 'log-measurement', 'start_fast': 'start-fast', 'stop_fast': 'stop-fast', 'create_habit': 'create-habit', 'create_goal': 'create-goal', 'add_goal_note': 'add-goal-note', 'prefill_holding': 'prefill-holding', 'add-holding': 'prefill-holding'};
