import {muscleRecoverySchema, type MuscleRecovery} from './model';

/**
 * Session AK (COMPETITORS.md T3, item 8): the Showcase person's own recovery days, beside the fictional training log
 * (lib/workouts/showcase.ts): legs given a little longer, core a little less; every other group keeps the default of 6.
 */
export const showcaseMuscleRecovery = (): MuscleRecovery => muscleRecoverySchema.parse({version: 1, days: {Legs: 7, Core: 4}});
