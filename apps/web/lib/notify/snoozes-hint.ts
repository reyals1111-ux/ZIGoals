import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AW Part 2 (speed, attempt 2): a read-only hint for the reminder rows (components/tasks/reminder-rows.tsx): whether
 * this device's notification preferences (`zigoals:notify:v1`, owned by lib/notify/prefs.ts, kept out of the rows' first
 * scripts) hold any own snooze choices, so the rows ask for those buttons' chunk only then. The buttons read the record
 * through its own schema (components/tasks/own-snooze-buttons.tsx); this view never writes. The key's literal equals
 * NOTIFY_KEY (lib/notify/snoozes-hint.test.ts).
 */
export const SNOOZES_HINT_KEY = 'zigoals:notify:v1';
const hintSchema = z.looseObject({snoozes: z.array(z.unknown()).optional().catch(undefined)});
export type SnoozesHint = z.infer<typeof hintSchema>;
export const SNOOZES_HINT: DeviceRecordSpec<SnoozesHint> = {key: SNOOZES_HINT_KEY, schema: hintSchema, empty: () => ({})};
/** Whether own snooze choices may be kept (an array with something in it); the buttons decide which are readable. */
export const mayHaveOwnSnoozes = (hint: SnoozesHint) => Array.isArray(hint.snoozes) && hint.snoozes.length > 0;
