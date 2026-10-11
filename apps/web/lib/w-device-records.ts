import type {DeviceRecordSpec} from './device-record';
import {ACCOUNTS} from './accounts/schema';
import {MILESTONE_DATES} from './goals/milestone-dates';
import {IMPORT_BATCHES} from './import/batches-schema';
import {W_REMINDERS} from './reminders/w-schema';
import {CHESS_CACHE} from './skills/chess/schema';
import {CELEBRATIONS} from './celebrations';
import {MEDITATION_RUN} from './meditation/schema';
import {MUSIC} from './music/schema';
import {PAGES_VIEW} from './pages/schema';

/**
 * Session W's device-only keys ([TIER 3] (storage keys); docs/product/features/README.md rules 1–8, lib/device-record.ts):
 * each read tolerantly and written only on the person's choice, through `getAppStorage()` (per account; the tab's session
 * storage in Showcase), never synced, and part of "Export everything". Personal records first: accounts and debts and
 * milestone target dates (their synced homes are finance v5, read here, moved by a later switch PR), the import batches
 * behind "Undo this import", Session W's reminders, the chess cache (public ratings of the username the person typed),
 * the celebrations already shown and a running meditation. Then two display preferences with nothing personal in them:
 * the music player's choices and the mirror of the visible pages for the first paint.
 */
export const W_PERSONAL_RECORDS = [ACCOUNTS, MILESTONE_DATES, IMPORT_BATCHES, W_REMINDERS, CHESS_CACHE, CELEBRATIONS, MEDITATION_RUN] as const;
export const W_DISPLAY_RECORDS = [MUSIC, PAGES_VIEW] as const;
export const W_DEVICE_RECORDS: readonly DeviceRecordSpec<{version: 1}>[] = [...W_PERSONAL_RECORDS, ...W_DISPLAY_RECORDS];
