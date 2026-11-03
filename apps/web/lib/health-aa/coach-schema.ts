import * as z from 'zod';
import {HEALTH_COACH_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';
/**
 * N3: the weekly coach check-in's answers, on this device: per week start, "keep" or "adjust" (with the target chosen),
 * and whether the energy estimate's adjustment was confirmed. Loose and versioned (ADR-022 B1).
 */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const healthCoachSchema = z.looseObject({
  version: z.literal(1),
  answers: z.record(day, z.looseObject({answer: z.enum(['keep', 'adjust']), kcal: z.number().int().min(500).max(10_000).optional(), at: z.iso.datetime()})).optional(),
});
export type HealthCoach = z.infer<typeof healthCoachSchema>;
export const emptyHealthCoach = (): HealthCoach => ({version: 1});
export const HEALTH_COACH: DeviceRecordSpec<HealthCoach> = {key: HEALTH_COACH_KEY, schema: healthCoachSchema, empty: emptyHealthCoach};
export const answerCoach = (c: HealthCoach, weekStart: string, answer: 'keep' | 'adjust', at: string, kcal?: number): HealthCoach => healthCoachSchema.parse({...c, answers: {...(c.answers ?? {}), [weekStart]: {answer, at, ...(kcal ? {kcal} : {})}}});
/** Session AK (task 4.5): Undo of a week's answer (Keep's toast); the week asks again. */
export const clearCoachAnswer = (c: HealthCoach, weekStart: string): HealthCoach => { const answers = {...(c.answers ?? {})}; delete answers[weekStart]; return healthCoachSchema.parse({...c, answers}); };
