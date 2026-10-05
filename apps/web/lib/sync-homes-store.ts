import type {z} from 'zod';
import {getAppStorage, isShowcase, storageLockKey} from './showcase-storage';
import {withStorageLock} from './storage';
import {SYNC_WRITES} from './vault/sync-writes';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from './health';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, type DashboardSettings} from './dashboard-settings';
import {readPrivateStore, updatePrivateStore} from './private-storage';
import {isDurableMarker, readDurableStore, updateDurableStore} from './vault/local';
import {FASTING_KEY, emptyFasting, fastingSchema, type Fasting} from './fasting/schema';
import {HEALTH_GOALS_KEY, emptyHealthGoals, healthGoalsSchema, type HealthGoals} from './health-goals/schema';
import {HABIT_HEALTH_LINKS_KEY, emptyHabitHealthLinks, habitHealthLinksSchema, type HabitHealthLinks} from './habit-health-links/schema';
import {WEEKLY_REVIEW_KEY, emptyWeeklyReview, weeklyReviewSchema, type WeeklyReview} from './weekly-review/schema';
import {readFasting, updateFasting} from './fasting/store';
import {readHealthGoals, updateHealthGoals} from './health-goals/store';
import {readHabitHealthLinks, updateHabitHealthLinks} from './habit-health-links/store';
import {readWeeklyReview, updateWeeklyReview} from './weekly-review/store';
import {
  SYNC_HOMES_KEY, deviceHasNew, emptyHomesMarker, fastingIn, habitLinksIn, healthGoalsIn, homesMarkerSchema, mergeDeviceIntoHealth, mergeDeviceIntoSettings,
  weeklyReviewIn, withFasting, withHabitLinks, withHealthGoals, withWeeklyReview, type DeviceRecords, type HomesMarker,
} from './vault/sync-homes';

/**
 * Session U Part 9 ([TIER 3] (sync)): reads and writes Session P's four records where SYNC_WRITES puts them
 * (lib/vault/sync-homes.ts), with the switch as a parameter so both states are tested. Switch off: the device keys,
 * exactly as before. Switch on: Health and settings, through the same store functions as every module edit (browser
 * storage or the durable database, each under its storage lock, a version raise keeping a recovery copy), and an
 * announcement afterwards, so open views refresh and account sync schedules an upload.
 */
export type HomeRecords = {fasting: Fasting; healthGoals: HealthGoals; habitLinks: HabitHealthLinks; weeklyReview: WeeklyReview};
export type HomeKind = keyof HomeRecords;
const DEVICE = {
  fasting: {key: FASTING_KEY, schema: fastingSchema, read: readFasting, update: updateFasting},
  healthGoals: {key: HEALTH_GOALS_KEY, schema: healthGoalsSchema, read: readHealthGoals, update: updateHealthGoals},
  habitLinks: {key: HABIT_HEALTH_LINKS_KEY, schema: habitHealthLinksSchema, read: readHabitHealthLinks, update: updateHabitHealthLinks},
  weeklyReview: {key: WEEKLY_REVIEW_KEY, schema: weeklyReviewSchema, read: readWeeklyReview, update: updateWeeklyReview},
} as const;
export const DEVICE_HOME_KEYS = Object.values(DEVICE).map(d => d.key);

async function readModule<T>(storage: Storage, key: string, schema: z.ZodType<T>, empty: () => T): Promise<T> {
  return isDurableMarker(storage.getItem(key)) ? readDurableStore(storage, key, schema) : readPrivateStore(storage, key, schema, empty);
}
async function updateModule<T>(storage: Storage, key: string, schema: z.ZodType<T>, empty: () => T, updater: (latest: T) => T): Promise<T> {
  return isDurableMarker(storage.getItem(key)) ? updateDurableStore(storage, key, schema, updater) : updatePrivateStore(storage, key, schema, empty, updater);
}
const readHealth = (storage: Storage) => readModule<HealthData>(storage, HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth);
const readSettings = (storage: Storage) => readModule<DashboardSettings>(storage, DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
const updateHealth = (storage: Storage, updater: (latest: HealthData) => HealthData) => updateModule<HealthData>(storage, HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth, updater);
const updateSettings = (storage: Storage, updater: (latest: DashboardSettings) => DashboardSettings) => updateModule<DashboardSettings>(storage, DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, updater);

/** Like a module edit made through usePrivateStore: open views of the module refresh, and account sync schedules an upload. */
export function announceModuleChange(keys: readonly string[]) {
  if (typeof window === 'undefined') return;
  for (const key of keys) {
    window.dispatchEvent(new CustomEvent('zigoals:private-change', {detail: key}));
    if (!isShowcase() && typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('zigoals:private-updates:v1'); channel.postMessage(key); channel.close(); }
  }
}

/** The record as its home holds it: the device key (switch off), or Health and settings (switch on). */
export async function readHome<K extends HomeKind>(kind: K, {storage = getAppStorage(), syncWrites = SYNC_WRITES}: {storage?: Storage; syncWrites?: boolean} = {}): Promise<HomeRecords[K]> {
  if (!syncWrites) {
    const read = DEVICE[kind].read(storage);
    if (read.unreadable) throw Error('This device’s saved records could not be read. They were not changed.');
    return read.data as HomeRecords[K];
  }
  const health = await readHealth(storage);
  if (kind === 'weeklyReview') return weeklyReviewIn(await readSettings(storage), health) as HomeRecords[K];
  return (kind === 'fasting' ? fastingIn(health) : kind === 'healthGoals' ? healthGoalsIn(health) : habitLinksIn(health)) as HomeRecords[K];
}

const REVIEW_LOCK = 'zigoals:weekly-review-home';
/**
 * Applies a change to the latest copy of the record in its home and returns the result. The change is validated by the
 * record's own schema first (an invalid result throws and writes nothing). Switch on, it runs inside the module's
 * storage lock against the latest module data, so an edit made in another tab is never overwritten; the weekly review,
 * which spans two homes, takes its own lock and writes Health (its notes) before settings, so a failure in between
 * keeps the words and shows them with their week.
 */
export async function updateHome<K extends HomeKind>(kind: K, change: (current: HomeRecords[K]) => HomeRecords[K], {storage = getAppStorage(), syncWrites = SYNC_WRITES}: {storage?: Storage; syncWrites?: boolean} = {}): Promise<HomeRecords[K]> {
  if (!syncWrites) return (DEVICE[kind].update as unknown as (s: Storage, c: typeof change) => HomeRecords[K])(storage, change);
  const schema = DEVICE[kind].schema as unknown as z.ZodType<HomeRecords[K]>;
  if (kind !== 'weeklyReview') {
    const project = (kind === 'fasting' ? fastingIn : kind === 'healthGoals' ? healthGoalsIn : habitLinksIn) as unknown as (h: HealthData) => HomeRecords[K];
    const write = (kind === 'fasting' ? withFasting : kind === 'healthGoals' ? withHealthGoals : withHabitLinks) as unknown as (h: HealthData, r: HomeRecords[K]) => HealthData;
    let next: HomeRecords[K] | undefined, changed = false;
    await updateHealth(storage, latest => { next = schema.parse(change(project(latest))); const result = write(latest, next); changed = result !== latest; return result; });
    if (changed) announceModuleChange([HEALTH_STORAGE_KEY]);
    return next!;
  }
  return withStorageLock(storageLockKey(storage, REVIEW_LOCK), async () => {
    const settings = await readSettings(storage), current = weeklyReviewIn(settings, await readHealth(storage));
    const next = schema.parse(change(current as HomeRecords[K])) as WeeklyReview, changed: string[] = [];
    const health = await updateHealth(storage, latest => { const result = withWeeklyReview(settings, latest, next).health; if (result !== latest) changed.push(HEALTH_STORAGE_KEY); return result; });
    await updateSettings(storage, latest => { const result = withWeeklyReview(latest, health, next).settings; if (result !== latest) changed.push(DASHBOARD_SETTINGS_KEY); return result; });
    announceModuleChange(changed);
    return next as HomeRecords[K];
  });
}

/**
 * The four records as a set of stored texts holds them (the Showcase seed, the texts an export reads): from their homes
 * with the switch on, from the device keys otherwise. Absent texts read as empty records; invalid ones throw.
 */
export function homeRecordsIn(texts: Readonly<Record<string, string | null | undefined>>, syncWrites: boolean = SYNC_WRITES): HomeRecords {
  const parse = <T,>(key: string, schema: z.ZodType<T>, empty: () => T): T => { const text = texts[key]; return text == null ? empty() : schema.parse(JSON.parse(text)); };
  if (!syncWrites) return {fasting: parse(FASTING_KEY, fastingSchema, emptyFasting), healthGoals: parse(HEALTH_GOALS_KEY, healthGoalsSchema, emptyHealthGoals), habitLinks: parse(HABIT_HEALTH_LINKS_KEY, habitHealthLinksSchema, emptyHabitHealthLinks), weeklyReview: parse(WEEKLY_REVIEW_KEY, weeklyReviewSchema, emptyWeeklyReview)};
  const health = parse<HealthData>(HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth), settings = parse<DashboardSettings>(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  return {fasting: fastingIn(health), healthGoals: healthGoalsIn(health), habitLinks: habitLinksIn(health), weeklyReview: weeklyReviewIn(settings, health)};
}

/** What the device keys hold, each key read on its own: an unreadable key is left out, untouched. */
export function readDeviceRecords(storage: Storage): DeviceRecords {
  const records: DeviceRecords = {};
  for (const kind of Object.keys(DEVICE) as HomeKind[]) {
    try {
      if (storage.getItem(DEVICE[kind].key) === null) continue;
      const read = DEVICE[kind].read(storage);
      if (!read.unreadable) (records as Record<HomeKind, unknown>)[kind] = read.data;
    } catch { /* storage refused: nothing to merge from this key */ }
  }
  return records;
}
export function readHomesMarker(storage: Storage): HomesMarker {
  try { const raw = storage.getItem(SYNC_HOMES_KEY); if (raw !== null) return homesMarkerSchema.parse(JSON.parse(raw)); } catch { /* an unreadable marker is merged again from scratch; records already here are kept */ }
  return emptyHomesMarker();
}

/**
 * Merges the device keys into the homes (switch on). Health first, then settings, then the marker: the marker records a
 * record as merged only after its home was written, so a failure is merged again on the next load. Returns whether a
 * module changed. Never rewrites a device key.
 */
export async function mergeDeviceRecords(storage: Storage, {syncWrites = SYNC_WRITES}: {syncWrites?: boolean} = {}): Promise<boolean> {
  if (!syncWrites) return false;
  const device = readDeviceRecords(storage), marker = readHomesMarker(storage);
  if (!deviceHasNew(device, marker)) return false;
  let healthPart: Partial<HomesMarker> = {}, settingsPart: Partial<HomesMarker> = {};
  const changed: string[] = [];
  await updateHealth(storage, latest => { const merged = mergeDeviceIntoHealth(latest, device, marker); healthPart = merged.marker; if (merged.health !== latest) changed.push(HEALTH_STORAGE_KEY); return merged.health; });
  await updateSettings(storage, latest => { const merged = mergeDeviceIntoSettings(latest, device, marker); settingsPart = merged.marker; if (merged.settings !== latest) changed.push(DASHBOARD_SETTINGS_KEY); return merged.settings; });
  storage.setItem(SYNC_HOMES_KEY, JSON.stringify(homesMarkerSchema.parse({...marker, ...healthPart, ...settingsPart})));
  announceModuleChange(changed);
  return changed.length > 0;
}

/** One merge at a time per storage view, and none again while the device keys and the marker are unchanged. */
const runs = new WeakMap<Storage, {texts: (string | null)[]; promise: Promise<boolean>}>();
export function ensureDeviceRecordsMerged(storage: Storage = getAppStorage(), options: {syncWrites?: boolean} = {}): Promise<boolean> {
  if (!(options.syncWrites ?? SYNC_WRITES)) return Promise.resolve(false);
  let texts: (string | null)[];
  try { texts = [...DEVICE_HOME_KEYS, SYNC_HOMES_KEY].map(key => storage.getItem(key)); } catch { return Promise.resolve(false); }
  const held = runs.get(storage);
  if (held && held.texts.every((text, i) => text === texts[i])) return held.promise;
  const promise = mergeDeviceRecords(storage, options).catch(() => { runs.delete(storage); return false; });
  runs.set(storage, {texts, promise});
  return promise;
}
