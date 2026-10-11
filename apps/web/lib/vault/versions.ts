import type {Domain} from './cloud-sync';

/**
 * The newest version of each section this build reads (timezone phase 3, R1, Session P's read-only sync homes, Health v3 of
 * Session U Part 9, and Session W's Health v4, settings v3 and finance v5; finance v5 is read, never written, here).
 */
export const CURRENT_VERSIONS:Record<Domain,number>={finance:5,habits:3,health:4,settings:3};
export const NEWER_SECTION_MESSAGE='This section was saved by a newer ZIGoals. Update the app on this device to keep syncing.';
