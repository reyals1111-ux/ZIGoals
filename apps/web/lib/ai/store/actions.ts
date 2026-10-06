import {z} from 'zod';
import {updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {AI_ACTIONS_KEY} from './keys';

/**
 * "Actions by ZIGi" (Session V Part 7; the key is defined with the storage foundation): one line per proposal card the
 * person confirmed, `{activityId, kind, title, at}`, at most 500 and 180 days, on this device only (in Export, never
 * synced). An Undo removes its line. Activity reads it to mark and filter those entries; it holds no identifier of the
 * person's account, only the local id of the record the card made. Kept apart from the rest of ZIGi's records so the
 * Activity page reads it without loading the AI library.
 */
export const MAX_ACTIONS = 500, ACTION_DAYS = 180;
const stamp = z.iso.datetime();
export const aiActionSchema = z.looseObject({activityId: z.string().min(1).max(200), kind: z.string().min(1).max(40), title: z.string().min(1).max(160), at: stamp});
export type AiAction = z.infer<typeof aiActionSchema>;
export const aiActionsSchema = z.looseObject({version: z.literal(1), actions: z.array(aiActionSchema).max(MAX_ACTIONS).optional()});
export type AiActions = z.infer<typeof aiActionsSchema>;
export const AI_ACTIONS: DeviceRecordSpec<AiActions> = {key: AI_ACTIONS_KEY, schema: aiActionsSchema, empty: () => ({version: 1 as const})};
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
/** Records one confirmed ZIGi action; the oldest go after 180 days or 500 lines. */
export function recordAction(storage: ReadWrite, action: AiAction, now = new Date()): AiActions {
  const cutoff = new Date(now.getTime() - ACTION_DAYS * 86_400_000).toISOString();
  return updateDeviceRecord(storage, AI_ACTIONS, current => {
    const kept = (current.actions ?? []).filter(a => a.activityId !== action.activityId && a.at >= cutoff);
    return {...current, actions: [...kept, action].slice(-MAX_ACTIONS)};
  });
}
/** Undo of a ZIGi action: its line leaves the log. */
export function forgetAction(storage: ReadWrite, activityId: string): AiActions {
  return updateDeviceRecord(storage, AI_ACTIONS, current => ({...current, actions: (current.actions ?? []).filter(a => a.activityId !== activityId)}));
}
/** Where a ZIGi action's records live, for Activity's category, icon and link. */
export function actionPlace(kind: string): {category: 'HEALTH' | 'HABIT' | 'GOAL' | 'ZIGI'; href: string} {
  if (/^(check-in|skip|create-habit)$/.test(kind)) return {category: 'HABIT', href: '/app/habits'};
  if (/^(create-goal|add-goal-note)$/.test(kind)) return {category: 'GOAL', href: '/app/goals'};
  if (/^(create-reminder|review-intention)$/.test(kind)) return {category: 'ZIGI', href: '/app'};
  return {category: 'HEALTH', href: '/app/health'};
}
