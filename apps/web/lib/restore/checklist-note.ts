/**
 * Session AK (journey question J6-2, owner): the Checklist is never restored from a backup (lib/restore/plan.ts
 * NEVER_RESTORED lists "Checklist favourites and day history"); the restore screen and "Test a backup" say so plainly
 * instead of implying that every part comes back. The rule itself is unchanged.
 */
export const CHECKLIST_NOT_RESTORED = 'The Checklist is never restored from a backup: its path, favourites and day history stay as they are on this device.';
