import * as z from 'zod';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../af-checklist-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AF (L3; TIER 3 storage, ADR-028 H10): the Checklist's two device records. Loose and versioned (`version: 1`): a
 * field, a kind or an input this build does not know is kept as it is on a write and simply left off the path, so a newer
 * build's favourites survive an older build's edit (the linked-wallets rule). The schema's limits are generous on purpose
 * (a newer build may allow more); the person-facing limits live in the mutators (lib/checklist/store.ts). Bytes that do not
 * parse read as empty and unreadable and are never rewritten by a read (lib/device-record.ts).
 *
 * `zigoals:checklist:v1` holds what is on the path: favourites that point at real records (a habit, a goal step), the
 * person's own custom items, Health quick inputs (kept apart in `healthItems`, so a later extras sync can keep them inside
 * the Health consent as device fields), the orbits and the order. It never holds a check-in, an amount or a reading: those
 * stay in each page's own record, and a dot's state is derived from them (lib/checklist/derive.ts).
 *
 * `zigoals:checklist-days:v1` holds the day history as counts (`days`), and today's tick receipts (which dot was ticked on
 * the path, when, and the id of the entry that tick created) and today's custom ticks. Never synced in Session AF.
 */
const ID = z.string().min(1).max(120);
const STAMP = z.string().max(40);
const WORD = z.string().max(24);

export const checklistItemSchema = z.looseObject({
  id: ID,
  /** 'habit' | 'goal' (its next open step) | 'goal-step' | 'custom' (any other word: a newer build's kind, kept and not shown). */
  kind: WORD,
  ref: z.looseObject({habitId: ID.optional(), goalId: ID.optional(), milestoneId: ID.optional()}).optional(),
  /** A custom item's own words; for a favourite, the label shown when its record cannot be read. */
  label: z.string().max(120).optional(),
  colour: WORD.optional(),
  section: z.string().max(40).optional(),
  defaultValue: z.number().finite().optional(),
  lastValue: z.number().finite().optional(),
  addedAt: STAMP,
});
export const checklistHealthItemSchema = z.looseObject({
  id: ID,
  kind: WORD,
  /** 'water' | 'diary' | 'meal' | 'weight' | 'sleep' | 'meditation' | 'fast' (any other word is kept and not shown). */
  input: WORD,
  /** diary: the familiar food, supplement or pinned item it logs; meal: the meal it watches. */
  ref: z.looseObject({sourceKind: WORD.optional(), sourceId: ID.optional(), meal: WORD.optional()}).optional(),
  label: z.string().max(120).optional(),
  colour: WORD.optional(),
  section: z.string().max(40).optional(),
  defaultValue: z.number().finite().optional(),
  lastValue: z.number().finite().optional(),
  unit: z.string().max(12).optional(),
  addedAt: STAMP,
});
export const checklistSectionSchema = z.looseObject({id: z.string().min(1).max(40), label: z.string().max(60), colour: WORD});
export const checklistSchema = z.looseObject({
  version: z.literal(1),
  items: z.array(checklistItemSchema).max(400).default([]),
  healthItems: z.array(checklistHealthItemSchema).max(200).default([]),
  sections: z.array(checklistSectionSchema).max(40).optional(),
  order: z.array(ID).max(800).default([]),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type ChecklistHealthItem = z.infer<typeof checklistHealthItemSchema>;
export type ChecklistSection = z.infer<typeof checklistSectionSchema>;
export type Checklist = z.infer<typeof checklistSchema>;
export const emptyChecklist = (): Checklist => ({version: 1, items: [], healthItems: [], order: []});
export const CHECKLIST: DeviceRecordSpec<Checklist> = {key: CHECKLIST_KEY, schema: checklistSchema, empty: emptyChecklist};

export const checklistDaySummarySchema = z.looseObject({total: z.number().int().min(0).max(10000), done: z.number().int().min(0).max(10000), perfect: z.boolean().optional()});
export const checklistTickSchema = z.looseObject({
  /** The item ticked on the path. */
  id: ID,
  at: STAMP,
  /** The entry the tick created in its page's record (a water id, a diary id, a weight id, a night id…), for the truth check. */
  record: z.looseObject({kind: WORD, id: z.string().max(160)}).optional(),
});
export const checklistDaysSchema = z.looseObject({
  version: z.literal(1),
  days: z.record(z.string().max(10), checklistDaySummarySchema).default({}),
  today: z.looseObject({
    date: z.string().max(10),
    ticks: z.array(checklistTickSchema).max(1000).default([]),
    custom: z.array(ID).max(400).default([]),
    /** The nudge moments already shown today ('10', '15', '19'), so each shows once. */
    nudged: z.array(z.string().max(8)).max(24).default([]),
  }).optional(),
});
export type ChecklistDaySummary = z.infer<typeof checklistDaySummarySchema>;
export type ChecklistTick = z.infer<typeof checklistTickSchema>;
export type ChecklistDays = z.infer<typeof checklistDaysSchema>;
export type ChecklistToday = NonNullable<ChecklistDays['today']>;
export const emptyChecklistDays = (): ChecklistDays => ({version: 1, days: {}});
export const CHECKLIST_DAYS: DeviceRecordSpec<ChecklistDays> = {key: CHECKLIST_DAYS_KEY, schema: checklistDaysSchema, empty: emptyChecklistDays};

/** The kinds and inputs this build draws; anything else is kept and not shown. */
export const ITEM_KINDS = ['habit', 'goal', 'goal-step', 'custom'] as const;
export const HEALTH_INPUTS = ['water', 'diary', 'meal', 'weight', 'sleep', 'meditation', 'fast'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
export type HealthInput = (typeof HEALTH_INPUTS)[number];
export const knownKind = (kind: string): kind is ItemKind => (ITEM_KINDS as readonly string[]).includes(kind);
export const knownInput = (input: string): input is HealthInput => (HEALTH_INPUTS as readonly string[]).includes(input);
