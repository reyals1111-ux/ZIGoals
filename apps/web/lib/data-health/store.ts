import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Data health's own record (Session AA-Cloud Part 6, `[TIER 3] (storage)`): when "Export everything" last finished on
 * this device, so the Data health page can say how old the newest copy is. Device-only, loose, versioned, its own key,
 * never synced; #32–#37 never read it. Nothing else is kept: every other figure on the page is read again each time.
 */
export const DATA_HEALTH_KEY = 'zigoals:data-health:v1';
export const dataHealthSchema = z.looseObject({version: z.literal(1), lastExportAt: z.iso.datetime().optional()});
export type DataHealthRecord = z.infer<typeof dataHealthSchema>;
export const emptyDataHealth = (): DataHealthRecord => ({version: 1});
export const DATA_HEALTH: DeviceRecordSpec<DataHealthRecord> = {key: DATA_HEALTH_KEY, schema: dataHealthSchema, empty: emptyDataHealth};
export const recordExport = (state: DataHealthRecord, at: string): DataHealthRecord => dataHealthSchema.parse({...state, lastExportAt: at});
/** "Today", "Yesterday", "12 days ago", or null when no export finished on this device. */
export function exportAge(state: DataHealthRecord, now: Date): string | null {
  if (!state.lastExportAt) return null;
  const days = Math.floor((now.getTime() - Date.parse(state.lastExportAt)) / 86_400_000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
}
