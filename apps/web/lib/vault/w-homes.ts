import {HEALTH_V4_GROUPS, type HealthData} from '../health';
import {SETTINGS_V3_GROUPS, type DashboardSettings} from '../dashboard-settings';

/**
 * Session W ([TIER 3] (data formats); docs/product/SYNC_HOMES.md): the homes of this release's new groups, as pure
 * functions over the synced modules, like sync-homes.ts for Session P's records. Health v4 holds `sleep`, `meditation`,
 * `vitals`, `quick` and `moods`; settings v3 holds `pages`, `links`, `chess` and `wrapUp`. The writers are lazy: a module
 * moves up to its Session W version only when one of these groups first gets content (an empty group where there was
 * none changes nothing), never goes down a version, and returns the same object when nothing changes, so a store writes
 * nothing. Each group is its own strict `version: 1` record; builds #29–#31 refuse the raised module and keep its bytes.
 */
export type WHealthGroup = typeof HEALTH_V4_GROUPS[number];
export type WSettingsGroup = typeof SETTINGS_V3_GROUPS[number];
export type WHealthRecords = {[G in WHealthGroup]: NonNullable<HealthData[G]>};
export type WSettingsRecords = {[G in WSettingsGroup]: NonNullable<DashboardSettings[G]>};
export const W_HEALTH_VERSION = 4, W_SETTINGS_VERSION = 3;

function put<T extends {schemaVersion: number}>(record: T, group: string, value: unknown, empty: boolean, version: number): T {
  const held = (record as Record<string, unknown>)[group];
  if (held === undefined && empty) return record;
  const schemaVersion = Math.max(record.schemaVersion, version);
  if (held !== undefined && schemaVersion === record.schemaVersion && JSON.stringify(held) === JSON.stringify(value)) return record;
  return {...record, schemaVersion, [group]: value};
}
/** The group as Health holds it, or undefined while it was never written. */
export const healthGroupIn = <G extends WHealthGroup>(health: HealthData, group: G): WHealthRecords[G] | undefined => health[group] as WHealthRecords[G] | undefined;
export const settingsGroupIn = <G extends WSettingsGroup>(settings: DashboardSettings, group: G): WSettingsRecords[G] | undefined => settings[group] as WSettingsRecords[G] | undefined;
/** Puts a group into Health (v4 from then on). `empty` says the value holds nothing worth raising the version for. */
export const withHealthGroup = <G extends WHealthGroup>(health: HealthData, group: G, value: WHealthRecords[G], empty: boolean): HealthData => put(health, group, value, empty, W_HEALTH_VERSION);
/** Puts a group into settings (v3 from then on). */
export const withSettingsGroup = <G extends WSettingsGroup>(settings: DashboardSettings, group: G, value: WSettingsRecords[G], empty: boolean): DashboardSettings => put(settings, group, value, empty, W_SETTINGS_VERSION);
