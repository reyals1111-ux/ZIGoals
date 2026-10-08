import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from './device-record';

/**
 * Today's folded widget rows on a phone, remembered (Session V Part 1b, [TIER 3] new device key): which widget cards the
 * person left open. One device key, `zigoals:today-folds:v1`, through `getAppStorage()` (per account; the tab's session
 * storage in Showcase), never synced. Written only when the person opens or closes a row, never on view; folded is the
 * default, so an empty record changes nothing. Unknown widget ids are kept but ignored (a widget removed later simply
 * has no row), and at most 64 are kept. A display preference: listed with the non-personal keys for the welcome check,
 * and part of "Export everything" like every device key.
 */
export const TODAY_FOLDS_KEY = 'zigoals:today-folds:v1';
export const MAX_REMEMBERED_FOLDS = 64;
const widgetId = z.string().min(1).max(120);
export const todayFoldsSchema = z.strictObject({version: z.literal(1), open: z.record(widgetId, z.literal(true)).refine(open => Object.keys(open).length <= MAX_REMEMBERED_FOLDS)});
export type TodayFolds = z.infer<typeof todayFoldsSchema>;
export const TODAY_FOLDS: DeviceRecordSpec<TodayFolds> = {key: TODAY_FOLDS_KEY, schema: todayFoldsSchema, empty: () => ({version: 1, open: {}})};
export function readTodayFolds(storage: Pick<Storage, 'getItem'>): TodayFolds { return readDeviceRecord(storage, TODAY_FOLDS).data; }
export const isFoldOpen = (folds: TodayFolds, id: string): boolean => folds.open[id] === true;
/** Remembers one row as open or closed; the oldest open rows give way beyond the limit. Throws with nothing written when storage refuses. */
export function rememberFold(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string, open: boolean): TodayFolds {
  return updateDeviceRecord(storage, TODAY_FOLDS, current => {
    const rest = Object.keys(current.open).filter(key => key !== id);
    const kept = open ? [...rest.slice(Math.max(0, rest.length - (MAX_REMEMBERED_FOLDS - 1))), id] : rest;
    return {version: 1, open: Object.fromEntries(kept.map(key => [key, true as const]))};
  });
}
