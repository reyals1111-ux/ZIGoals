import * as z from 'zod';
import {REMINDERS_PLAN_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * S7: the reminders plan, on this device (ADR-022 B1): the reminder types the habit and water keys do not already hold
 * (bedtime, the weekly review, a fast's end, a goal check-in) with their times and on/off, the quiet hours every
 * reminder and bell respects, and the day each card was dismissed. In-app cards work now; push delivery stays off until
 * the owner activates push, and the page says so.
 */
export const PLAN_KINDS = ['bedtime', 'review', 'fasting-end', 'goal-checkin'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const remindersPlanSchema = z.looseObject({
  version: z.literal(1),
  items: z.partialRecord(z.enum(PLAN_KINDS), z.looseObject({on: z.boolean(), time: time.optional(), weekday: z.number().int().min(0).max(6).optional()})).optional(),
  quiet: z.looseObject({from: time, to: time}).optional(),
  dismissed: z.record(z.string().min(1).max(60), day).optional(),
});
export type RemindersPlan = z.infer<typeof remindersPlanSchema>;
export const emptyRemindersPlan = (): RemindersPlan => ({version: 1});
export const REMINDERS_PLAN: DeviceRecordSpec<RemindersPlan> = {key: REMINDERS_PLAN_KEY, schema: remindersPlanSchema, empty: emptyRemindersPlan};
export const DEFAULT_QUIET = {from: '22:00', to: '08:00'} as const;
export const PLAN_LABELS: Record<PlanKind, {title: string; blurb: string; defaultTime: string}> = {
  bedtime: {title: 'Bedtime', blurb: 'A wind-down nudge before your bedtime window.', defaultTime: '22:00'},
  review: {title: 'Weekly review', blurb: 'On your review day, once the day is under way.', defaultTime: '18:00'},
  'fasting-end': {title: 'Fasting end', blurb: 'When a running fast reaches its target hours.', defaultTime: '12:00'},
  'goal-checkin': {title: 'Goal check-in', blurb: 'A weekly look at your goals.', defaultTime: '19:00'},
};
export const setPlanItem = (p: RemindersPlan, kind: PlanKind, item: {on: boolean; time?: string; weekday?: number}): RemindersPlan => remindersPlanSchema.parse({...p, items: {...(p.items ?? {}), [kind]: {...(p.items?.[kind] ?? {}), ...item}}});
export const setQuietHours = (p: RemindersPlan, quiet: {from: string; to: string} | null): RemindersPlan => remindersPlanSchema.parse({...p, quiet: quiet ?? undefined});
export const dismissPlan = (p: RemindersPlan, id: string, today: string): RemindersPlan => remindersPlanSchema.parse({...p, dismissed: {...Object.fromEntries(Object.entries(p.dismissed ?? {}).filter(([, d]) => d >= today)), [id]: today}});
export const quietHours = (p: RemindersPlan) => p.quiet ?? DEFAULT_QUIET;
