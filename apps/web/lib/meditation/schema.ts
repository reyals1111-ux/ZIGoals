import {z} from 'zod';
import {MEDITATION_RUN_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';
import {timeZoneSchema} from '../time-zone-schema';

/**
 * Meditation (Session W Part 5; synced home Health v4 `meditation`, docs/product/SYNC_HOMES.md): sessions from the timer,
 * the breathing guide, a manual "mindful minutes" entry or an import, a weekly goal and the bell choices. A session is
 * its start instant and its length in seconds, so "minutes this month" is exact. Imported sessions carry deterministic
 * ids. An optional heart-rate summary (average, lowest, highest) is kept only when the person saved one from a
 * Bluetooth heart-rate monitor; raw samples are never stored.
 */
export const MEDITATION_SOURCES = ['manual', 'timer', 'breathing', 'apple-health', 'fitbit', 'garmin', 'samsung', 'oura', 'oura-link'] as const;
export const BREATHING_PATTERNS = ['box', '478', 'coherent', 'sigh'] as const;
export const BELL_SOUNDS = ['bowl', 'chime', 'soft', 'silent'] as const;
export const MAX_SESSIONS = 10_000;
const instant = z.iso.datetime();
const mood = z.number().int().min(1).max(5);
const heartRate = z.number().int().min(20).max(250);
export const meditationIdSchema = z.string().regex(/^health_med-[a-z0-9-]{8,90}$/);
export const meditationSessionSchema = z.strictObject({
  id: meditationIdSchema, startedAt: instant, seconds: z.number().int().min(1).max(86_400), kind: z.enum(['timer', 'breathing', 'manual', 'import']),
  pattern: z.enum(BREATHING_PATTERNS).optional(), moodBefore: mood.optional(), moodAfter: mood.optional(), note: z.string().max(500).optional(),
  heartRate: z.strictObject({avg: heartRate, min: heartRate, max: heartRate}).refine(h => h.min <= h.avg && h.avg <= h.max, 'Heart rate summary out of order.').optional(),
  timeZone: timeZoneSchema, source: z.enum(MEDITATION_SOURCES), createdAt: instant, updatedAt: instant,
}).refine(s => s.kind === 'breathing' || s.pattern === undefined, 'Only a breathing session has a pattern.');
export type MeditationSession = z.infer<typeof meditationSessionSchema>;
export const meditationGoalSchema = z.strictObject({minutesPerWeek: z.number().int().min(1).max(10_080), updatedAt: instant});
export const bellPrefsSchema = z.strictObject({intervalMin: z.number().int().min(1).max(60).optional(), sound: z.enum(BELL_SOUNDS), volume: z.number().int().min(0).max(100), updatedAt: instant});
export type BellPrefs = z.infer<typeof bellPrefsSchema>;
export const meditationSchema = z.strictObject({version: z.literal(1), sessions: z.array(meditationSessionSchema).max(MAX_SESSIONS), goal: meditationGoalSchema.optional(), bells: bellPrefsSchema.optional()})
  .refine(group => new Set(group.sessions.map(s => s.id)).size === group.sessions.length, 'Duplicate meditation session.');
export type Meditation = z.infer<typeof meditationSchema>;
export const emptyMeditation = (): Meditation => ({version: 1, sessions: []});

/**
 * The running session on this device (`zigoals:meditation-run:v1`, device-only): a timer that survives a reload. Elapsed
 * time is always computed from instants (never from ticks), so a throttled background tab cannot slow it down.
 */
export {MEDITATION_RUN_KEY};
export const meditationRunSchema = z.strictObject({version: z.literal(1), run: z.strictObject({
  startedAt: instant, plannedSec: z.number().int().min(60).max(14_400), pausedAt: instant.optional(), pausedMs: z.number().int().min(0).max(86_400_000),
  kind: z.enum(['timer', 'breathing']), pattern: z.enum(BREATHING_PATTERNS).optional(), moodBefore: mood.optional(),
}).nullable()});
export type MeditationRun = z.infer<typeof meditationRunSchema>;
export const emptyMeditationRun = (): MeditationRun => ({version: 1, run: null});
export const MEDITATION_RUN: DeviceRecordSpec<MeditationRun> = {key: MEDITATION_RUN_KEY, schema: meditationRunSchema, empty: emptyMeditationRun};
