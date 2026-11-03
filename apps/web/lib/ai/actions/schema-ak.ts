import * as z from 'zod';
import {AUTO_SOURCES} from '../../auto-rules/schema';

/**
 * Session AK (Part 12): the card kinds ZIGi may propose for this session's features, as whitelist entries that schema.ts
 * spreads into its own union (one place decides what a reply may ask for). Every one is a card the person confirms:
 * - `set-auto-rule`: a habit auto-complete rule (`zigoals:auto-rules:v1`), made or changed through the rules' own engine;
 * - `set-bill-reminder`: a bill or subscription reminder, or its note to self (`zigoals:bills:v1`); about money, so
 *   never automatic; ZIGoals never pays or cancels anything;
 * - `grocery-list`: items added to this week's (or next week's) grocery list (`zigoals:grocery:v1`);
 * - `goal-draft`: the Goal wizard filled in (a hand-off: nothing is saved until the person creates the goal there);
 * - `what-if`: an answer card, a projection from the goal's own records, labelled so; it writes nothing;
 * - `scan-food`: opens the barcode lookup, the label reader or the meal photo on Health (never a silent log);
 * - `start-soundscape`: the card's own button starts an ambient soundscape (the tap the browser needs for sound).
 * Owner follow-up 1 (F9), for the F4–F5 features, each a confirm card too (never automatic; nothing pays, moves or signs):
 * - `log-supplement`: a dose on the person's own supplements and medication log taken or skipped (`zigoals:supplements:v1`),
 *   or a new item on it marked at once; no advice, no dose check;
 * - `set-debt-plan`: the debt planner's own figures kept (`zigoals:debt-planner:v1`: a debt's minimum or rate, the extra a
 *   month); about money, so never automatic; the accounts are never changed;
 * - `start-savings-challenge`: a 52-week, no-spend or round-up challenge beside one of the person's goals
 *   (`zigoals:savings-challenges:v1`); progress comes only from their own records; nothing moves money;
 * - `open-agenda` and `open-wrapped`: navigation (the agenda on a view; ZIGoals Wrapped on Journey).
 * The composite `goal-bundle` carries the person's own words; the planner chunk's reader (lib/goals/nl-bundle.ts) turns
 * them into the cards above (habits, their rules, the goal's draft), each confirmed on its own.
 * The enums are written out here (this module rides with the shell's schema); `schema-ak.test.ts` pins them to their
 * owners' lists.
 */
export const AK_BILL_CADENCES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
export const AK_SOUNDSCAPES = ['focus', 'wind-down', 'sleep'] as const;
export const AK_SCAN_MODES = ['barcode', 'label', 'meal-photo'] as const;
export const AK_WORKOUT_TYPES = ['strength', 'cardio', 'mobility', 'sport', 'other'] as const;
export const AK_WHAT_IF_EVERY = ['week', 'two-weeks', 'month'] as const;
export const MAX_AK_GROCERY_ITEMS = 20, MAX_BUNDLE_WORDS = 500;
export const AK_CHALLENGES = ['52-week', 'no-spend', 'round-up'] as const;
export const AK_AGENDA_VIEWS = ['day', 'week', 'month'] as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A day is YYYY-MM-DD.').refine(v => !Number.isNaN(Date.parse(`${v}T12:00:00Z`)), 'That day does not exist.');
const money = z.number().finite().positive().max(1_000_000_000);
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'A currency is a three-letter code such as EUR.');
const dayWord = z.union([z.literal('today'), z.literal('yesterday'), isoDay]).default('today');

export const AK_ACTION_SCHEMAS = [
  z.strictObject({kind: z.literal('set-auto-rule'), habit: text(100), source: z.enum(AUTO_SOURCES), threshold: z.number().finite().min(0).max(1_000_000_000).optional(),
    workout_type: z.enum(AK_WORKOUT_TYPES).optional(), goal: text(120).optional(), paused: z.boolean().optional()})
    .superRefine((a, ctx) => {
      if (a.source === 'contribution' && !a.goal) ctx.addIssue({code: 'custom', path: ['goal'], message: 'A contribution rule names the goal it watches (g1, or its name).'});
      if (a.source !== 'contribution' && a.goal) ctx.addIssue({code: 'custom', path: ['goal'], message: 'Only a contribution rule names a goal.'});
      if (a.workout_type && a.source !== 'workout') ctx.addIssue({code: 'custom', path: ['workout_type'], message: 'Only a workout rule names a workout type.'});
    }),
  z.strictObject({kind: z.literal('set-bill-reminder'), title: text(80), amount: z.union([money, z.string().trim().max(40)]).optional(), currency: currency.optional(),
    cadence: z.enum(AK_BILL_CADENCES).optional(), next_due: isoDay.optional(), category: text(40).optional(), note: z.string().trim().max(300).optional(), cancel_by: isoDay.optional()}),
  z.strictObject({kind: z.literal('grocery-list'), items: z.array(text(120)).min(1).max(MAX_AK_GROCERY_ITEMS), week: z.enum(['this', 'next']).default('this')}),
  z.strictObject({kind: z.literal('goal-draft'), name: text(100), type: z.enum(['VALUE', 'PROJECT']).default('VALUE'), target: money.optional(), currency: currency.optional(), date: isoDay.optional(),
    milestones: z.array(text(100)).max(10).optional(),
    /** Shown on the card as a suggestion (a goal bundle's monthly figure); never filled in anywhere. */
    suggested_per_month: z.number().finite().positive().max(1_000_000_000).optional()}),
  z.strictObject({kind: z.literal('what-if'), goal: text(120), extra_per_month: z.number().finite().min(0).max(1_000_000_000).optional(), regular_amount: z.number().finite().min(0).max(1_000_000_000).optional(),
    regular_every: z.enum(AK_WHAT_IF_EVERY).optional(), target_date: isoDay.optional()})
    .refine(a => a.extra_per_month !== undefined || a.regular_amount !== undefined || a.target_date !== undefined, 'Say what changes: an extra amount a month, a regular amount, or a target date.'),
  z.strictObject({kind: z.literal('scan-food'), mode: z.enum(AK_SCAN_MODES), barcode: z.string().trim().regex(/^\d{8,14}$/, 'A barcode is 8 to 14 digits.').optional()})
    .refine(a => a.barcode === undefined || a.mode === 'barcode', 'Only the barcode lookup takes a barcode.'),
  z.strictObject({kind: z.literal('start-soundscape'), preset: z.enum(AK_SOUNDSCAPES)}),
  // Owner follow-up 1 (F9).
  z.strictObject({kind: z.literal('log-supplement'), name: text(60), status: z.enum(['taken', 'skipped']).default('taken'), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time is HH:MM.').optional(),
    day: dayWord, dose: z.string().trim().max(60).optional()}),
  z.strictObject({kind: z.literal('set-debt-plan'), debt: text(100).optional(), minimum: money.optional(), rate_percent: z.number().finite().min(0).max(100).optional(), extra_per_month: z.number().finite().min(0).max(1_000_000_000).optional()})
    .refine(a => a.minimum !== undefined || a.rate_percent !== undefined || a.extra_per_month !== undefined, 'Say what to keep: a minimum payment, a rate or the extra a month.')
    .refine(a => a.debt !== undefined || (a.minimum === undefined && a.rate_percent === undefined), 'A minimum payment or a rate names its debt.'),
  z.strictObject({kind: z.literal('start-savings-challenge'), goal: text(120), challenge: z.enum(AK_CHALLENGES), step: money.optional(), order: z.enum(['up', 'down']).optional(),
    round_to: z.union([z.literal(1), z.literal(5), z.literal(10)]).optional(), target_days: z.number().int().min(1).max(366).optional(), start: isoDay.optional()})
    .superRefine((a, ctx) => {
      if (a.challenge === '52-week' && a.step === undefined) ctx.addIssue({code: 'custom', path: ['step'], message: 'A 52-week challenge needs its step (week 1 puts aside one step).'});
      if (a.challenge !== '52-week' && (a.step !== undefined || a.order !== undefined)) ctx.addIssue({code: 'custom', path: ['step'], message: 'Only a 52-week challenge has a step and an order.'});
      if (a.challenge !== 'round-up' && a.round_to !== undefined) ctx.addIssue({code: 'custom', path: ['round_to'], message: 'Only round-ups round to 1, 5 or 10.'});
      if (a.challenge !== 'no-spend' && a.target_days !== undefined) ctx.addIssue({code: 'custom', path: ['target_days'], message: 'Only no-spend days aim for a number of days.'});
    }),
  z.strictObject({kind: z.literal('open-agenda'), view: z.enum(AK_AGENDA_VIEWS).optional()}),
  z.strictObject({kind: z.literal('open-wrapped')}),
] as const;
export const AK_ACTION_KINDS = ['set-auto-rule', 'set-bill-reminder', 'grocery-list', 'goal-draft', 'what-if', 'scan-food', 'start-soundscape',
  'log-supplement', 'set-debt-plan', 'start-savings-challenge', 'open-agenda', 'open-wrapped'] as const;
/** The composite: the person's words, read on the device into ordinary cards. */
export const goalBundleSchema = z.strictObject({kind: z.literal('goal-bundle'), words: text(MAX_BUNDLE_WORDS)});
export const AK_ALIASES = {
  'set_auto_rule': 'set-auto-rule', 'auto-rule': 'set-auto-rule', 'auto_rule': 'set-auto-rule', 'auto-complete': 'set-auto-rule', 'auto-complete-rule': 'set-auto-rule', 'autocomplete-rule': 'set-auto-rule', 'habit-rule': 'set-auto-rule',
  'set_bill_reminder': 'set-bill-reminder', bill: 'set-bill-reminder', 'bill-reminder': 'set-bill-reminder', 'add-bill': 'set-bill-reminder', subscription: 'set-bill-reminder', 'add-subscription': 'set-bill-reminder',
  'grocery_list': 'grocery-list', 'shopping-list': 'grocery-list', 'build-grocery-list': 'grocery-list', 'add-to-grocery-list': 'grocery-list',
  'goal_draft': 'goal-draft', 'goal-form': 'goal-draft', 'prefill-goal': 'goal-draft',
  'goal_bundle': 'goal-bundle', 'goal-from-words': 'goal-bundle', 'nl-bundle': 'goal-bundle', 'bundle-from-words': 'goal-bundle',
  'what_if': 'what-if', whatif: 'what-if', 'goal-what-if': 'what-if', projection: 'what-if',
  'scan_food': 'scan-food', scan: 'scan-food', barcode: 'scan-food', 'scan-barcode': 'scan-food', 'label-scan': 'scan-food', 'meal-photo': 'scan-food', 'photo-meal': 'scan-food',
  'start_soundscape': 'start-soundscape', soundscape: 'start-soundscape', 'play-soundscape': 'start-soundscape', ambient: 'start-soundscape', 'ambient-sound': 'start-soundscape',
  // Owner follow-up 1 (F9).
  'log_supplement': 'log-supplement', supplement: 'log-supplement', 'log-medication': 'log-supplement', medication: 'log-supplement', 'take-supplement': 'log-supplement', 'supplement-taken': 'log-supplement',
  'set_debt_plan': 'set-debt-plan', 'debt-plan': 'set-debt-plan', 'debt-planner': 'set-debt-plan', 'payoff-plan': 'set-debt-plan',
  'start_savings_challenge': 'start-savings-challenge', 'savings-challenge': 'start-savings-challenge', '52-week-challenge': 'start-savings-challenge', 'no-spend-challenge': 'start-savings-challenge', 'round-up-challenge': 'start-savings-challenge',
  'open_agenda': 'open-agenda', agenda: 'open-agenda', calendar: 'open-agenda', 'open-calendar': 'open-agenda',
  'open_wrapped': 'open-wrapped', wrapped: 'open-wrapped', 'zigoals-wrapped': 'open-wrapped', 'year-in-review': 'open-wrapped',
  // The weekly review is the Life review's week (an existing kind).
  'weekly-review': 'open-review', 'weekly_review': 'open-review', 'open-weekly-review': 'open-review', 'open_weekly_review': 'open-review',
} as const;

/**
 * The reader of a goal bundle, installed by the planner chunk (plan-ak.ts) so this module and the shell stay small. It
 * returns the cards' raw objects, or the reason nothing was proposed. `next` numbers the reply's new habits (new1, …).
 */
export type GoalBundleReader = (words: string, next: () => string) => Record<string, unknown>[] | string;
let reader: GoalBundleReader | null = null;
export function installGoalBundleReader(fn: GoalBundleReader) { reader = fn; }
export const GOAL_BUNDLE_LOADING = 'ZIGi is still loading that kind of card; send it once more in a moment.';
export const goalBundleParts = (words: string, next: () => string): Record<string, unknown>[] | string => reader ? reader(words, next) : GOAL_BUNDLE_LOADING;
/** The head of a goal bundle's cards (the bundle header adds the step count). */
export const GOAL_BUNDLE_TITLE = 'Your plan, from your words';
