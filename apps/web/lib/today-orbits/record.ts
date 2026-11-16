import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {TODAY_ORBITS_KEY_LITERAL} from '../ar-device-keys';

/**
 * Session AR (6b; ADR-041 P1, ADR-040 D16 (a); TIER 3 (stored format), owner-approved, additive): whether "Your orbits"
 * shows on Today on this device. Its own device-only record, never a widget kind or metric of the strict synced settings
 * record (lib/dashboard-settings.ts; older builds refuse an unknown kind there). Off by default: a missing record, an
 * unreadable one and one without `shown` all read as off. Loose and versioned: a field from a newer build is kept and
 * ignored, a read never writes, a write happens only when the person turns the card on or off. Exported, restored,
 * erased with the account, in the data catalogue; never synced.
 */
export const TODAY_ORBITS_KEY = TODAY_ORBITS_KEY_LITERAL;
export const todayOrbitsSchema = z.looseObject({version: z.literal(1), shown: z.boolean().optional()});
export type TodayOrbits = z.infer<typeof todayOrbitsSchema>;
export const emptyTodayOrbits = (): TodayOrbits => ({version: 1});
export const TODAY_ORBITS: DeviceRecordSpec<TodayOrbits> = {key: TODAY_ORBITS_KEY, schema: todayOrbitsSchema, empty: emptyTodayOrbits};

/** On only when the person turned it on. */
export const orbitsShown = (record: TodayOrbits): boolean => record.shown === true;
/** The record with the card on or off; anything else it holds (from a newer build) stays. */
export const setOrbitsShown = (record: TodayOrbits, shown: boolean): TodayOrbits => todayOrbitsSchema.parse({...record, version: 1, shown});
