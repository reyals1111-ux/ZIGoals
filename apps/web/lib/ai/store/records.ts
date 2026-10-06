import {z} from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {PROVIDER_IDS} from '../providers';
import {AI_MEMORY_KEY, AI_OPTIONS_KEY, AI_USAGE_KEY, ZIGI_KEY, ZIGI_KNOCK_KEY, ZIGI_REMINDERS_KEY} from './keys';

/**
 * ZIGi's device records added in Session V, defined once here (storage foundation, [TIER 3], ADR-014 S3 and S18) so that
 * each later part only uses them and can be reverted alone. Every record is a loose object with every field optional:
 * a field a later part writes survives in an older build (unknown fields are kept on every write), and a build without
 * that part never resets the key. Reads are tolerant (device-record.ts): unreadable bytes read as empty, say so, and are
 * never rewritten by a read. Nothing here holds a key, a token, a password or an identifier of the person's account.
 *
 * - `zigoals:ai-options:v1`: V's choices kept out of T's strict `zigoals:ai:v1` (build #29 reads that one unchanged):
 *   the route override (ZIGoals hosted, Chrome's on-device model), how the AI gets data, deep models, declared photo
 *   support, "Use my notes", on-device and browser-agent switches, the hosted first-use consent, notification names.
 * - `zigoals:ai-usage:v1`: tokens per route per month as the provider reported them, the person's own prices per
 *   million tokens, a soft monthly cap and whether to ask first.
 * - `zigoals:ai-memory:v1`: "What ZIGi knows about me", the person's own notes (at most 100 of 500 characters).
 * - `zigoals:ai-actions:v1`: "Actions by ZIGi", one line per confirmed proposal (at most 500, 180 days).
 * - `zigoals:zigi:v1`: ZIGi's look and feel (skin, animation, side, size, greeting, edge tab), the knock choice and the
 *   one-time knock offer, the tips and chips dismissed today. A display preference.
 * - `zigoals:zigi-reminders:v1`: reminder kinds T lacks (goal check-ins, a weekly look at Wealth, a weekly context-pack
 *   refresh); T's `zigoals:reminders:v1` stays untouched (its strict schema would reset in #29).
 * - `zigoals:zigi-knock:v1`: knocks shown per day and snoozes; written only when a knock shows or is snoozed.
 */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);
const stamp = z.iso.datetime();
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
/** A plain non-negative decimal the person typed, such as a price per million tokens ("2.5"). */
const decimal = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/);
const currency = z.string().regex(/^[A-Z]{3}$/);
const provider = z.enum(PROVIDER_IDS);
const atMost = (n: number) => (r: Record<string, unknown>) => Object.keys(r).length <= n;
const empty = () => ({version: 1 as const});

export const AI_ROUTES = ['hosted', 'on-device'] as const;
export const TOOL_MODES = ['auto', 'tools', 'attach'] as const;
export type ToolMode = (typeof TOOL_MODES)[number];
export const aiOptionsSchema = z.looseObject({
  version: z.literal(1),
  /** A route that is not one of T's connections; null or absent: T's connection in `zigoals:ai:v1`. */
  route: z.enum(AI_ROUTES).nullable().optional(),
  toolMode: z.enum(TOOL_MODES).optional(),
  deepModel: z.partialRecord(provider, z.string().min(1).max(200)).optional(),
  /** "provider:model" → the person said this model reads photos (when the provider publishes no metadata). */
  visionDeclared: z.record(z.string().min(3).max(260), z.boolean()).refine(atMost(100)).optional(),
  useNotes: z.boolean().optional(),
  onDevice: z.boolean().optional(),
  webmcp: z.boolean().optional(),
  hostedConsent: z.looseObject({at: stamp, health: z.boolean()}).nullable().optional(),
  notificationNames: z.boolean().optional(),
});
export type AiOptions = z.infer<typeof aiOptionsSchema>;
export const AI_OPTIONS: DeviceRecordSpec<AiOptions> = {key: AI_OPTIONS_KEY, schema: aiOptionsSchema, empty};

const tokens = z.number().int().min(0).max(1_000_000_000_000);
export const MAX_USAGE_MONTHS = 13;
export const aiUsageSchema = z.looseObject({
  version: z.literal(1),
  /** "2026-10" → route (a provider id, "hosted" or "on-device") → tokens the provider reported, the requests made, and how many came back without counts (Part 6). */
  months: z.record(month, z.record(z.string().min(1).max(40), z.looseObject({input: tokens, output: tokens, requests: z.number().int().min(0).max(1_000_000_000), unreported: z.number().int().min(0).max(1_000_000_000).optional()})).refine(atMost(20))).refine(atMost(MAX_USAGE_MONTHS)).optional(),
  /** The person's own prices per million tokens; never fetched, never a ZIGoals price. */
  prices: z.partialRecord(provider, z.looseObject({input: decimal.optional(), output: decimal.optional(), currency})).optional(),
  softCap: z.looseObject({amount: decimal, currency}).nullable().optional(),
  askFirst: z.boolean().optional(),
});
export type AiUsage = z.infer<typeof aiUsageSchema>;
export const AI_USAGE: DeviceRecordSpec<AiUsage> = {key: AI_USAGE_KEY, schema: aiUsageSchema, empty};

export const MEMORY_CATEGORIES = ['goals', 'preferences', 'constraints', 'diet', 'schedule', 'health', 'other'] as const;
/** Notes in these categories describe the person's health and need the Health gate on every path, like Health itself. */
export const HEALTH_NOTE_CATEGORIES: readonly string[] = ['health', 'diet'];
export const MAX_NOTES = 100, MAX_NOTE_CHARS = 500;
export const memoryNoteSchema = z.looseObject({id: z.string().min(1).max(80), text: z.string().trim().min(1).max(MAX_NOTE_CHARS), category: z.enum(MEMORY_CATEGORIES), source: z.enum(['person', 'zigi']), createdAt: stamp, updatedAt: stamp});
export type MemoryNoteRecord = z.infer<typeof memoryNoteSchema>;
export const aiMemorySchema = z.looseObject({version: z.literal(1), notes: z.array(memoryNoteSchema).max(MAX_NOTES).optional()});
export type AiMemory = z.infer<typeof aiMemorySchema>;
export const AI_MEMORY: DeviceRecordSpec<AiMemory> = {key: AI_MEMORY_KEY, schema: aiMemorySchema, empty};

// The actions log lives in its own small module (Activity reads it); defined there once and re-exported here.
export {ACTION_DAYS, AI_ACTIONS, MAX_ACTIONS, aiActionSchema, aiActionsSchema, forgetAction, recordAction, type AiAction, type AiActions} from './actions';
import {AI_ACTIONS} from './actions';

export const ZIGI_ANIMATIONS = ['full', 'calm', 'off'] as const;
export const ZIGI_SIDES = ['right', 'left'] as const;
export const ZIGI_SIZES = ['s', 'm', 'l'] as const;
export const ZIGI_GREETINGS = ['quiet', 'friendly'] as const;
export const MAX_CHAT_AREAS = 200;
/** The pages a chat can start on: `PAGE_AREAS` of `../settings`, which imports this file (a test keeps the two equal). */
export const CHAT_AREAS = ['today', 'goals', 'habits', 'health', 'wealth', 'help'] as const;
export const zigiSchema = z.looseObject({
  version: z.literal(1),
  skin: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
  animation: z.enum(ZIGI_ANIMATIONS).optional(),
  side: z.enum(ZIGI_SIDES).optional(),
  size: z.enum(ZIGI_SIZES).optional(),
  greeting: z.enum(ZIGI_GREETINGS).optional(),
  edgeTab: z.boolean().optional(),
  knock: z.looseObject({enabled: z.boolean().optional(), offer: z.enum(['accepted', 'declined']).optional(), maxPerDay: z.number().int().min(1).max(10).optional(), quietFrom: clock.optional(), quietTo: clock.optional(), sound: z.boolean().optional()}).optional(),
  /** Tips and chips dismissed on one day; a new day starts empty. */
  dismissed: z.looseObject({day, ids: z.array(z.string().min(1).max(80)).max(50)}).optional(),
  greetedOn: day.optional(),
  tipsSeen: z.array(z.string().min(1).max(40)).max(20).optional(),
  /**
   * Session V Part 10: the page each chat started on (chat id → area), for History's filter. Kept here rather than in the
   * chat, so a chat that uses nothing else new stays version 1 (build #29 shows it); the newest 200 are kept.
   */
  chatAreas: z.record(z.string().min(1).max(80), z.enum(CHAT_AREAS)).refine(atMost(MAX_CHAT_AREAS)).optional(),
});
export type ZigiRecord = z.infer<typeof zigiSchema>;
export const ZIGI: DeviceRecordSpec<ZigiRecord> = {key: ZIGI_KEY, schema: zigiSchema, empty};
export type ZigiPrefs = {
  skin: string; animation: (typeof ZIGI_ANIMATIONS)[number]; side: (typeof ZIGI_SIDES)[number]; size: (typeof ZIGI_SIZES)[number]; greeting: (typeof ZIGI_GREETINGS)[number]; edgeTab: boolean;
  knock: {enabled: boolean; offer: 'accepted' | 'declined' | null; maxPerDay: number; quietFrom: string; quietTo: string; sound: boolean};
};
/** The defaults (ADR-014 S5): the original skin, Calm animation, right side, size M, a friendly greeting, the edge tab on, knock off. */
export const ZIGI_DEFAULTS: ZigiPrefs = {skin: 'origami-nebula', animation: 'calm', side: 'right', size: 'm', greeting: 'friendly', edgeTab: true, knock: {enabled: false, offer: null, maxPerDay: 3, quietFrom: '22:00', quietTo: '08:00', sound: false}};
export function zigiPrefs(record: ZigiRecord): ZigiPrefs {
  const k = record.knock ?? {};
  return {
    skin: record.skin ?? ZIGI_DEFAULTS.skin, animation: record.animation ?? ZIGI_DEFAULTS.animation, side: record.side ?? ZIGI_DEFAULTS.side, size: record.size ?? ZIGI_DEFAULTS.size,
    greeting: record.greeting ?? ZIGI_DEFAULTS.greeting, edgeTab: record.edgeTab ?? ZIGI_DEFAULTS.edgeTab,
    knock: {enabled: k.enabled ?? false, offer: k.offer ?? null, maxPerDay: k.maxPerDay ?? 3, quietFrom: k.quietFrom ?? '22:00', quietTo: k.quietTo ?? '08:00', sound: k.sound ?? false},
  };
}

const weekly = z.looseObject({weekday: z.number().int().min(0).max(6), time: clock});
export const zigiRemindersSchema = z.looseObject({
  version: z.literal(1),
  /** A goal's key (as the Goals summaries name it) → a weekly check-in. */
  goalCheckIns: z.record(z.string().min(1).max(120), weekly).refine(atMost(100)).optional(),
  wealthLook: weekly.nullable().optional(),
  packRefresh: weekly.nullable().optional(),
  /** "Not today", per day; only the last 14 days are kept. */
  dismissed: z.record(day, z.array(z.string().min(1).max(160)).max(200)).refine(atMost(14)).optional(),
});
export type ZigiReminders = z.infer<typeof zigiRemindersSchema>;
export const ZIGI_REMINDERS: DeviceRecordSpec<ZigiReminders> = {key: ZIGI_REMINDERS_KEY, schema: zigiRemindersSchema, empty};

export const zigiKnockSchema = z.looseObject({
  version: z.literal(1),
  counts: z.record(day, z.number().int().min(0).max(100)).refine(atMost(14)).optional(),
  /** A reminder's key → snoozed until this instant. */
  snoozed: z.record(z.string().min(1).max(160), stamp).refine(atMost(200)).optional(),
  /** Session V Part 13: the reminders ZIGi knocked for, per day (one knock per reminder a day unless snoozed). */
  shown: z.record(day, z.array(z.string().min(1).max(160)).max(50)).refine(atMost(14)).optional(),
});
export type ZigiKnock = z.infer<typeof zigiKnockSchema>;
export const ZIGI_KNOCK: DeviceRecordSpec<ZigiKnock> = {key: ZIGI_KNOCK_KEY, schema: zigiKnockSchema, empty};

/** Every V device record, for the registrations (onboarding, export) and the tests. */
export const ZIGI_RECORDS = [AI_OPTIONS, AI_USAGE, AI_MEMORY, AI_ACTIONS, ZIGI, ZIGI_REMINDERS, ZIGI_KNOCK] as const;

type Read = Pick<Storage, 'getItem'>;
export const readZigiPrefs = (storage: Read): ZigiPrefs => zigiPrefs(readDeviceRecord(storage, ZIGI).data);
/**
 * "Turn off ZIGi" (T's control): V's connection choices go back to the start (the route, data mode, deep models, the
 * hosted consent, browser agents, notification names) and knocking stops. The look and feel stays, like the launcher's
 * own hide; the person's own records (notes, the actions log, usage, reminders) stay until they delete them. Part 8: a
 * "Use my notes" turned off stays off, so turning ZIGi on again never starts sending notes the person held back.
 */
export function resetOnTurnOff(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): void {
  const options = readDeviceRecord(storage, AI_OPTIONS);
  storage.removeItem(AI_OPTIONS_KEY);
  if (!options.unreadable && options.data.useNotes === false) storage.setItem(AI_OPTIONS_KEY, JSON.stringify({version: 1, useNotes: false}));
  storage.removeItem(ZIGI_KNOCK_KEY);
  const zigi = readDeviceRecord(storage, ZIGI);
  if (!zigi.unreadable && zigi.data.knock?.enabled) updateDeviceRecord(storage, ZIGI, current => ({...current, knock: {...current.knock, enabled: false}}));
}
