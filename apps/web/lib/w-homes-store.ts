import {getAppStorage} from './showcase-storage';
import {HEALTH_STORAGE_KEY} from './health';
import {DASHBOARD_SETTINGS_KEY} from './dashboard-settings';
import {announceModuleChange, readHealth, readSettings, updateHealth, updateSettings} from './sync-homes-store';
import {healthGroupIn, settingsGroupIn, withHealthGroup, withSettingsGroup, type WHealthGroup, type WHealthRecords, type WSettingsGroup, type WSettingsRecords} from './vault/w-homes';
import {emptySleep} from './sleep/schema';
import {emptyMeditation} from './meditation/schema';
import {emptyVitals} from './vitals/schema';
import {DEFAULT_WATER_SIZES_ML} from './health-quick/schema';
import {emptyMoods} from './moods/schema';
import {emptyPages} from './pages/schema';
import {emptyLinks} from './links/schema';
import {emptyChessSettings} from './skills/chess/schema';

/**
 * Session W ([TIER 3] (data formats)): reads and writes this release's new groups in their modules, through the same store
 * functions as every module edit (browser storage or the durable database, each under its storage lock, a version raise
 * keeping a recovery copy of the record it replaced), then announces the change so open views refresh and account sync
 * schedules an upload. A group never written reads as its empty record; writing an empty record where there was none
 * changes nothing, so a person who never uses a new feature keeps their module at the version builds #29–#31 read.
 */
const NEVER = '1970-01-01T00:00:00.000Z';
type Spec<T> = {empty: () => T; isEmpty: (value: T) => boolean};
export const W_HEALTH_SPECS: {[G in WHealthGroup]: Spec<WHealthRecords[G]>} = {
  sleep: {empty: emptySleep, isEmpty: v => !v.nights.length && !v.goal},
  meditation: {empty: emptyMeditation, isEmpty: v => !v.sessions.length && !v.goal && !v.bells},
  vitals: {empty: emptyVitals, isEmpty: v => !v.days.length},
  // The default buttons, stamped "never", so any choice the person makes is the newer one.
  quick: {empty: () => ({version: 1, waterSizesMl: [...DEFAULT_WATER_SIZES_ML], pinned: [], updatedAt: NEVER}), isEmpty: v => !v.pinned.length && JSON.stringify(v.waterSizesMl) === JSON.stringify(DEFAULT_WATER_SIZES_ML)},
  moods: {empty: emptyMoods, isEmpty: v => !Object.keys(v.days).length},
};
export const W_SETTINGS_SPECS: {[G in WSettingsGroup]: Spec<WSettingsRecords[G]>} = {
  pages: {empty: emptyPages, isEmpty: v => !Object.keys(v.items).length && !v.start},
  links: {empty: emptyLinks, isEmpty: v => !v.items.length},
  chess: {empty: emptyChessSettings, isEmpty: v => !v.chesscom && !v.lichess && !v.goals.length && !v.habit && !v.applied.length},
  wrapUp: {empty: () => ({version: 1, enabled: {v: false, at: NEVER}, days: {}}), isEmpty: v => !v.enabled.v && !v.time && !Object.keys(v.days).length},
};
type Options = {storage?: Storage};

export async function readHealthGroup<G extends WHealthGroup>(group: G, {storage = getAppStorage()}: Options = {}): Promise<WHealthRecords[G]> {
  return healthGroupIn(await readHealth(storage), group) ?? W_HEALTH_SPECS[group].empty();
}
export async function readSettingsGroup<G extends WSettingsGroup>(group: G, {storage = getAppStorage()}: Options = {}): Promise<WSettingsRecords[G]> {
  return settingsGroupIn(await readSettings(storage), group) ?? W_SETTINGS_SPECS[group].empty();
}
/** Applies a change to the latest copy of the group, inside Health's storage lock; the whole module is validated before anything is written. */
export async function updateHealthGroup<G extends WHealthGroup>(group: G, change: (current: WHealthRecords[G]) => WHealthRecords[G], {storage = getAppStorage()}: Options = {}): Promise<WHealthRecords[G]> {
  const spec = W_HEALTH_SPECS[group];
  let next: WHealthRecords[G] | undefined, changed = false;
  await updateHealth(storage, latest => { next = change(healthGroupIn(latest, group) ?? spec.empty()); const result = withHealthGroup(latest, group, next, spec.isEmpty(next)); changed = result !== latest; return result; });
  if (changed) announceModuleChange([HEALTH_STORAGE_KEY]);
  return next!;
}
export async function updateSettingsGroup<G extends WSettingsGroup>(group: G, change: (current: WSettingsRecords[G]) => WSettingsRecords[G], {storage = getAppStorage()}: Options = {}): Promise<WSettingsRecords[G]> {
  const spec = W_SETTINGS_SPECS[group];
  let next: WSettingsRecords[G] | undefined, changed = false;
  await updateSettings(storage, latest => { next = change(settingsGroupIn(latest, group) ?? spec.empty()); const result = withSettingsGroup(latest, group, next, spec.isEmpty(next)); changed = result !== latest; return result; });
  if (changed) announceModuleChange([DASHBOARD_SETTINGS_KEY]);
  return next!;
}
