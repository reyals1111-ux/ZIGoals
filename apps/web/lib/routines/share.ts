import * as z from 'zod';
import {createHabit, habitRuleOn, type HabitData} from '../habits';
import {templateInput, type RoutineTemplateStep} from './templates';
import type {Routine} from './engine';

/**
 * Session AK (5.4): a routine's STRUCTURE as a small JSON file to share: how many steps, which are timed and for how many
 * minutes, and the time of day. No personal data: no ids, no entries, no notes or descriptions, no categories, no dates.
 * Step names are the person's own words, so they are left out ("Step 1", "Step 2"…) unless the person chooses "Include
 * step names". Import is strict: a fixed shape (unknown fields refused), at most 20 steps and 16 KB, plain text names,
 * and it only ever creates new habits through the journal's own `createHabit`, chained with "stack after".
 */
export const ROUTINE_SHARE_KIND = 'zigoals-routine';
export const MAX_SHARE_BYTES = 16_000, MAX_SHARE_STEPS = 20, MAX_STEP_MINUTES = 240;
// Control characters and bidirectional overrides would let a shared name hide what it says.
const SAFE_TEXT = /^[^\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]*$/;
const name = (max: number) => z.string().trim().min(1).max(max).regex(SAFE_TEXT, 'Names are plain text.');
export const routineShareStepSchema = z.strictObject({
  title: name(100).optional(),
  minutes: z.number().int().min(1).max(MAX_STEP_MINUTES).optional(),
  timeOfDay: z.enum(['anytime', 'morning', 'afternoon', 'evening']).optional(),
});
export const routineShareSchema = z.strictObject({
  kind: z.literal(ROUTINE_SHARE_KIND),
  version: z.literal(1),
  title: name(80).optional(),
  steps: z.array(routineShareStepSchema).min(1).max(MAX_SHARE_STEPS),
});
export type RoutineShare = z.infer<typeof routineShareSchema>;

/** The structure of a routine; names only with `includeNames`. */
export function exportRoutineStructure(routine: Routine, today: string, {includeNames = false}: {includeNames?: boolean} = {}): RoutineShare {
  const steps = routine.habits.slice(0, MAX_SHARE_STEPS).map(habit => {
    const rule = habitRuleOn(habit, today) ?? habit.rules.at(-1)!;
    const raw = rule.measurement.kind === 'duration' ? (rule.measurement.unit === 'hours' ? rule.target * 60 : rule.target) : null;
    const minutes = raw === null ? null : Math.min(MAX_STEP_MINUTES, Math.max(1, Math.round(raw)));
    const title = includeNames ? habit.title.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').trim().slice(0, 100) : '';
    return {...(title ? {title} : {}), ...(minutes ? {minutes} : {}), ...(habit.timeOfDay && habit.timeOfDay !== 'anytime' ? {timeOfDay: habit.timeOfDay} : {})};
  });
  const title = includeNames ? routine.title.trim().slice(0, 80) : '';
  return routineShareSchema.parse({kind: ROUTINE_SHARE_KIND, version: 1, ...(title ? {title} : {}), steps});
}
export const routineShareText = (share: RoutineShare) => JSON.stringify(share, null, 2);
export const routineShareFileName = (share: RoutineShare) => `${(share.title ?? 'routine').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'routine'}.zigoals-routine.json`;

export type ImportResult = {ok: true; routine: RoutineShare} | {ok: false; error: string};
/** Reads a shared file's text: too large, not JSON, or not exactly the shape → a plain reason, never a partial import. */
export function importRoutineStructure(text: string): ImportResult {
  if (new TextEncoder().encode(text).length > MAX_SHARE_BYTES) return {ok: false, error: 'This file is too large for a routine (16 KB at most).'};
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return {ok: false, error: 'This is not a routine file.'}; }
  if (!raw || typeof raw !== 'object' || (raw as {kind?: unknown}).kind !== ROUTINE_SHARE_KIND) return {ok: false, error: 'This is not a routine file.'};
  if ((raw as {version?: unknown}).version !== 1) return {ok: false, error: 'This routine was made by a newer ZIGoals. Update the app, then try again.'};
  const parsed = routineShareSchema.safeParse(raw);
  if (!parsed.success) return {ok: false, error: `This routine file is not valid: ${parsed.error.issues[0]?.message ?? 'unknown field'}.`};
  return {ok: true, routine: parsed.data};
}
/** The habits an imported routine would make, as the template steps the journal already knows how to create. */
export function importedSteps(share: RoutineShare): RoutineTemplateStep[] {
  return share.steps.map((step, i) => ({title: step.title ?? `Step ${i + 1}`, category: 'Routine', timeOfDay: step.timeOfDay ?? 'anytime', description: '', ...(step.minutes ? {minutes: step.minutes} : {})}));
}
/** Creates the imported chain: always new habits (never reusing one), each stacked after the one before. */
export function createImportedRoutine(data: HabitData, share: RoutineShare, now: Date, ids: () => string): {data: HabitData; headId: string; created: string[]} {
  let next = data, previous: string | undefined;
  const created: string[] = [];
  for (const step of importedSteps(share)) {
    const id = ids();
    next = createHabit(next, templateInput(step, previous), now, id);
    created.push(id); previous = id;
  }
  return {data: next, headId: created[0]!, created};
}
