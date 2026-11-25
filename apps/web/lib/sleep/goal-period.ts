import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AW (X6; LEDGER #460; TIER 3 (stored format), a NEW device-only display key): which period "Your sleep goal"
 * looks back over — 14 days (the default) or 30. A choice of view, not data: never in Health's strict, synced sleep group,
 * never synced or exported as a record of the person; erased with the device's display choices.
 */
export const SLEEP_GOAL_PERIOD_KEY = 'zigoals:sleep-goal-period:v1';
export const sleepGoalPeriodSchema = z.looseObject({version: z.literal(1), days: z.union([z.literal(14), z.literal(30)]).catch(14)});
export type SleepGoalPeriodPref = z.infer<typeof sleepGoalPeriodSchema>;
export const SLEEP_GOAL_PERIOD: DeviceRecordSpec<SleepGoalPeriodPref> = {key: SLEEP_GOAL_PERIOD_KEY, schema: sleepGoalPeriodSchema, empty: () => ({version: 1, days: 14})};
