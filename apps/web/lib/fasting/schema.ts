import {z} from 'zod';

/**
 * Fasting timer (Session P, PR 3, HE6; docs/product/features/HE6-fasting.md). One device key, per account, never
 * synced and in no backup until "Export everything": {version: 1, sessions: FastingSession[]}. A session's fields are
 * byte-for-byte those of its future synced home, `health.fasting.sessions[]` in health v2 (docs/product/SYNC_HOMES.md).
 * Hours and a target only: no streaks, no "longest fast", no calories (owner decision P5).
 */
export const FASTING_KEY = 'zigoals:fasting:v1';
export const MAX_FASTING_SESSIONS = 2000;
/** The format's room is 24 hours (the automatic stop); the app never offers a target above 18. */
export const MAX_HOURS = 24, MAX_CUSTOM_HOURS = 18;
export const FASTING_PRESETS = [{label: '12:12', hours: 12}, {label: '14:10', hours: 14}, {label: '16:8', hours: 16}] as const;
const instant = z.iso.datetime();
const timeZone = z.string().min(1).max(100).refine(value => { try { new Intl.DateTimeFormat('en', {timeZone: value}).format(); return true; } catch { return false; } }, 'Choose a valid IANA timezone, for example Europe/Brussels.');
export const fastingSessionSchema = z.strictObject({
  id: z.string().min(1).max(100), startedAt: instant, endedAt: instant.nullable(), targetHours: z.number().int().min(1).max(MAX_HOURS), timeZone,
  habitId: z.uuid().optional(), note: z.string().max(500).optional(), stoppedBy: z.enum(['person', 'limit']).optional(),
}).refine(s => s.endedAt === null || s.endedAt >= s.startedAt, 'A fast ends after it starts.');
export type FastingSession = z.infer<typeof fastingSessionSchema>;
export const fastingSchema = z.strictObject({version: z.literal(1), sessions: z.array(fastingSessionSchema).max(MAX_FASTING_SESSIONS)})
  .refine(f => new Set(f.sessions.map(s => s.id)).size === f.sessions.length, 'Duplicate fasting session.')
  .refine(f => f.sessions.filter(s => s.endedAt === null).length <= 1, 'A fast is already running.');
export type Fasting = z.infer<typeof fastingSchema>;
export const emptyFasting = (): Fasting => ({version: 1, sessions: []});
