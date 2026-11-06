import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * NOVA's briefs as stored (Session AK; the composer is lib/nova/briefs.ts): the device key `zigoals:nova-briefs:v1`
 * (TIER 3 (stored format), loose, versioned, bounded). Session AL (CI11): kept apart from the composer so the restore plan,
 * Export and the record catalog read the schema without loading ZIGi's tool registry (Settings' page weight).
 */
export const NOVA_BRIEFS_KEY = 'zigoals:nova-briefs:v1';
export const MAX_BRIEFS = 30, MAX_LINES = 12, MAX_SECTIONS = 16, MAX_POLISH_CHARS = 1500;
export const BRIEF_KINDS = ['morning', 'evening'] as const;
export type BriefKind = (typeof BRIEF_KINDS)[number];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stamp = z.iso.datetime();
export const novaBriefSchema = z.looseObject({
  id: z.string().regex(/^(?:morning|evening):\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(BRIEF_KINDS),
  day,
  at: stamp,
  lines: z.array(z.string().min(1).max(400)).max(MAX_LINES),
  sections: z.array(z.looseObject({id: z.string().min(1).max(40), label: z.string().min(1).max(60), text: z.string().min(1).max(600)})).max(MAX_SECTIONS).optional(),
  /** The person's model's rewording, on their request: which kind of model and its name. Dropped when the brief changes. */
  polished: z.looseObject({text: z.string().min(1).max(MAX_POLISH_CHARS), by: z.enum(['local', 'cloud']), model: z.string().min(1).max(200), at: stamp}).optional().catch(undefined),
  readAt: stamp.optional(),
});
export type NovaBrief = z.infer<typeof novaBriefSchema>;
export const novaBriefsSchema = z.looseObject({
  version: z.literal(1),
  briefs: z.array(novaBriefSchema).max(MAX_BRIEFS).optional().catch(undefined),
  prefs: z.looseObject({notify: z.boolean().optional()}).optional().catch(undefined),
});
export type NovaBriefs = z.infer<typeof novaBriefsSchema>;
export const emptyNovaBriefs = (): NovaBriefs => ({version: 1});
export const NOVA_BRIEFS: DeviceRecordSpec<NovaBriefs> = {key: NOVA_BRIEFS_KEY, schema: novaBriefsSchema, empty: emptyNovaBriefs};
