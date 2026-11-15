import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AP (owner-approved feature 2; TIER 3 (stored format), additive): a symptom and factor tracker. The person names
 * up to 40 things to follow ("headache", "pollen", "stiff back") and gives each a level per day, 0 (none) to 3 (strong).
 * A day without an answer is unknown, never "none". Its own NEW device-only key, versioned and strict.
 *
 * Private like Health (owner rule, 14 Nov): no ZIGi or NOVA context builder reads this key until the NOVA lane wires it
 * behind the existing Health switches. Exported, restored with Health, erased with the account; never synced.
 */
export const SYMPTOMS_KEY = 'zigoals:symptoms:v1';
export const MAX_SYMPTOM_ITEMS = 40;
export const MAX_SYMPTOM_NAME = 40;
/** About three years of days. */
export const MAX_SYMPTOM_DAYS = 1100;
export const SEVERITY_WORDS = ['None', 'Mild', 'Moderate', 'Strong'] as const;
export const symptomIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);
export const severitySchema = z.number().int().min(0).max(3);
export const symptomItemSchema = z.strictObject({
  id: symptomIdSchema,
  name: z.string().trim().min(1).max(MAX_SYMPTOM_NAME),
  /** A symptom (how the body feels) or a factor (something around it: pollen, travel, alcohol). */
  kind: z.enum(['symptom', 'factor']),
  createdAt: z.iso.datetime(),
});
export const symptomsSchema = z.strictObject({
  version: z.literal(1),
  items: z.array(symptomItemSchema).max(MAX_SYMPTOM_ITEMS),
  /** Day → item id → level 0–3. */
  days: z.record(z.iso.date(), z.record(symptomIdSchema, severitySchema)),
}).superRefine((r, ctx) => {
  const ids = new Set(r.items.map(i => i.id));
  if (ids.size !== r.items.length) ctx.addIssue({code: 'custom', message: 'Each item once.'});
  if (new Set(r.items.map(i => i.name.toLocaleLowerCase())).size !== r.items.length) ctx.addIssue({code: 'custom', message: 'Each name once.'});
  if (Object.keys(r.days).length > MAX_SYMPTOM_DAYS) ctx.addIssue({code: 'custom', message: `Up to ${MAX_SYMPTOM_DAYS} days.`});
  for (const levels of Object.values(r.days)) if (Object.keys(levels).some(id => !ids.has(id))) { ctx.addIssue({code: 'custom', message: 'A day names an item that is not kept.'}); break; }
});
export type SymptomItem = z.infer<typeof symptomItemSchema>;
export type Symptoms = z.infer<typeof symptomsSchema>;
export const emptySymptoms = (): Symptoms => ({version: 1, items: [], days: {}});
export const SYMPTOMS: DeviceRecordSpec<Symptoms> = {key: SYMPTOMS_KEY, schema: symptomsSchema, empty: emptySymptoms};
