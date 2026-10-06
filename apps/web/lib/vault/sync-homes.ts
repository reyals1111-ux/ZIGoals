import {z} from 'zod';
import type {HealthData} from '../health';
import type {DashboardSettings} from '../dashboard-settings';
import {emptyFasting, type Fasting} from '../fasting/schema';
import {emptyHealthGoals, type HealthGoal, type HealthGoals} from '../health-goals/schema';
import {emptyHabitHealthLinks, usesV4Measures, type AppliedCheckIn, type HabitHealthLink, type HabitHealthLinks} from '../habit-health-links/schema';
import type {Review, WeeklyReview} from '../weekly-review/schema';

/**
 * Session U Part 9 ([TIER 3] (sync); docs/product/SYNC_HOMES.md): where Session P's four device-only records live once
 * the switch in sync-writes.ts is on, as pure functions over the synced modules.
 *
 * - Projections read a record out of its home: fasting from Health v2+, health goals, habit-health links and the
 *   review's Health notes from Health v3, the rest of the weekly review from settings v2.
 * - Writers put a record into its home. They are lazy: a module changes version only when a group it did not hold gets
 *   content (an empty record where there was none changes nothing), and never goes down a version.
 * - The device-key merge copies what the device keys hold into the homes, record by record. A marker on this device
 *   (SYNC_HOMES_KEY: one short digest per record merged) makes it idempotent and keeps a record deleted here from coming
 *   back; a record an older build changed in its device key since (after a rollback) is merged again, and wins. The
 *   device keys themselves are never rewritten.
 */
export const SYNC_HOMES_KEY = 'zigoals:sync-homes:v1';
const digestMap = z.record(z.string().max(200), z.string().regex(/^[0-9a-f]{8}$/));
export const homesMarkerSchema = z.strictObject({
  version: z.literal(1), fasting: digestMap, healthGoals: digestMap, links: digestMap, applied: digestMap, reviews: digestMap,
  weekday: z.string().regex(/^[0-9a-f]{8}$/).optional(),
});
export type HomesMarker = z.infer<typeof homesMarkerSchema>;
export const emptyHomesMarker = (): HomesMarker => ({version: 1, fasting: {}, healthGoals: {}, links: {}, applied: {}, reviews: {}});
/** FNV-1a (32 bits) over the record's JSON: it tells a changed record from the one merged before, nothing more. */
export function recordDigest(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).padStart(8, '0');
}
/** The records this device's keys hold; an absent or unreadable key is left out and never touched. */
export type DeviceRecords = {fasting?: Fasting; healthGoals?: HealthGoals; habitLinks?: HabitHealthLinks; weeklyReview?: WeeklyReview};

type Group = 'fasting' | 'healthGoals' | 'habitLinks' | 'reviewNotes';
const holds = (health: HealthData, group: Group) => (health as Partial<Record<Group, unknown>>)[group] !== undefined;
// Never below the record's own version (Session W: a v4 record stays v4); a link or marker of a Session W measure needs v4.
const versionFor = (health: HealthData, group: Group, value: unknown) => Math.max(health.schemaVersion, group === 'fasting' ? 2 : group === 'habitLinks' && usesV4Measures(value as HabitHealthLinks) ? 4 : 3);
/** The same object when nothing changes, so a store sees no edit and writes nothing. */
function put(health: HealthData, group: Group, value: unknown, empty: boolean): HealthData {
  if (!holds(health, group) && empty) return health;
  const version = versionFor(health, group, value);
  if (holds(health, group) && version === health.schemaVersion && JSON.stringify((health as Record<string, unknown>)[group]) === JSON.stringify(value)) return health;
  return {...health, schemaVersion: version, [group]: value} as HealthData;
}

export const fastingIn = (health: HealthData): Fasting => (health as {fasting?: Fasting}).fasting ?? emptyFasting();
export const healthGoalsIn = (health: HealthData): HealthGoals => (health as {healthGoals?: HealthGoals}).healthGoals ?? emptyHealthGoals();
export const habitLinksIn = (health: HealthData): HabitHealthLinks => (health as {habitLinks?: HabitHealthLinks}).habitLinks ?? emptyHabitHealthLinks();
const reviewNotesIn = (health: HealthData): Record<string, string> => (health as {reviewNotes?: {notes: Record<string, string>}}).reviewNotes?.notes ?? {};
type SettingsReview = NonNullable<DashboardSettings['weeklyReview']>;
const settingsReviewIn = (settings: DashboardSettings): SettingsReview | undefined => (settings as {weeklyReview?: SettingsReview}).weeklyReview;

export const withFasting = (health: HealthData, fasting: Fasting): HealthData => put(health, 'fasting', fasting, !fasting.sessions.length);
export const withHealthGoals = (health: HealthData, goals: HealthGoals): HealthData => put(health, 'healthGoals', goals, !goals.goals.length);
export const withHabitLinks = (health: HealthData, links: HabitHealthLinks): HealthData => put(health, 'habitLinks', links, !Object.keys(links.links).length && !links.applied.length);

/** The weekly review as the device record reads it: settings v2's review with each week's Health note from Health v3. */
export function weeklyReviewIn(settings: DashboardSettings, health: HealthData): WeeklyReview {
  const home = settingsReviewIn(settings), notes = reviewNotesIn(health), reviews = new Map<string, Review>();
  for (const r of home?.reviews ?? []) {
    const {skipped, notes: words, ...rest} = r;
    reviews.set(r.weekStart, {...rest, ...(skipped ? {skipped: true as const} : {}), ...(words && Object.keys(words).length ? {notes: {...words}} : {})});
  }
  for (const [weekStart, text] of Object.entries(notes)) {
    const r = reviews.get(weekStart) ?? {weekStart};
    reviews.set(weekStart, {...r, notes: {...r.notes, health: text}});
  }
  return {version: 1, weekday: home?.weekday ?? 0, reviews: [...reviews.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart))};
}
/** Splits a weekly review into its two homes: the Health notes go to Health v3, everything else to settings v2. */
export function withWeeklyReview(settings: DashboardSettings, health: HealthData, review: WeeklyReview): {settings: DashboardSettings; health: HealthData} {
  const notes: Record<string, string> = {};
  const reviews = review.reviews.map(r => {
    const {notes: words, ...rest} = r;
    const {health: text, ...others} = words ?? ({} as NonNullable<Review['notes']>);
    if (text) notes[r.weekStart] = text;
    return {...rest, ...(Object.keys(others).length ? {notes: others} : {})};
  });
  const home = settingsReviewIn(settings), empty = !reviews.length && review.weekday === 0, value = {version: 1, weekday: review.weekday, reviews};
  const nextSettings = home === undefined && empty ? settings
    : home !== undefined && settings.schemaVersion >= 2 && JSON.stringify(home) === JSON.stringify(value) ? settings
    // Settings v2 at least, never down (Session W: a v3 record stays v3).
    : {...settings, schemaVersion: Math.max(settings.schemaVersion, 2), weeklyReview: value} as DashboardSettings;
  const nextHealth = put(health, 'reviewNotes', {version: 1, notes}, !Object.keys(notes).length);
  return {settings: nextSettings, health: nextHealth};
}

/**
 * One kind of record merged by key. `prefer` decides between the home's copy and the device's when both exist: for a
 * record never merged (default: the home's copy stays) and for one the device key changed since it was merged (default:
 * the device's copy, an older build's edit after a rollback). Records with `updatedAt` take the newer edit either way.
 */
function mergeKeyed<T>(home: ReadonlyMap<string, T>, device: ReadonlyMap<string, T>, merged: Record<string, string>, prefer?: (home: T, device: T) => T) {
  const result = new Map(home), next: Record<string, string> = {...merged};
  let changed = false;
  for (const [key, record] of device) {
    const digest = recordDigest(record), seen = merged[key], held = result.get(key);
    if (seen === digest) continue;
    // Never merged: add it, or keep the home's copy (the newer one where records carry updatedAt). Merged before but
    // changed since in the device key: an older build edited it after a rollback, so the device's copy wins.
    const value = held === undefined ? record : prefer ? prefer(held, record) : seen === undefined ? held : record;
    if (value !== held) { result.set(key, value); changed = true; }
    next[key] = digest;
  }
  return {result, next, changed};
}
const newer = <T extends {updatedAt: string}>(home: T, device: T): T => device.updatedAt > home.updatedAt ? device : home;
const byId = <T extends {id: string}>(list: readonly T[]) => new Map(list.map(v => [v.id, v] as const));

/**
 * Copies the device keys' records into Health. Returns the same object when nothing changes, and the digests of every
 * record it considered, to be stored in the marker only after the module write succeeded.
 */
export function mergeDeviceIntoHealth(health: HealthData, device: DeviceRecords, marker: HomesMarker): {health: HealthData; marker: Partial<HomesMarker>} {
  let next = health;
  const out: Partial<HomesMarker> = {};
  if (device.fasting) {
    const home = fastingIn(next), running = home.sessions.find(s => s.endedAt === null);
    // A fast an older build started while another runs here waits, unmerged, until this one has ended.
    const sessions = new Map(device.fasting.sessions.filter(s => !(s.endedAt === null && running && running.id !== s.id)).map(s => [s.id, s] as const));
    const {result, next: digests, changed} = mergeKeyed(byId(home.sessions), sessions, marker.fasting);
    if (changed) next = withFasting(next, {...home, sessions: [...result.values()]});
    out.fasting = digests;
  }
  if (device.healthGoals) {
    const home = healthGoalsIn(next);
    const {result, next: digests, changed} = mergeKeyed<HealthGoal>(byId(home.goals), byId(device.healthGoals.goals), marker.healthGoals, newer);
    if (changed) next = withHealthGoals(next, {...home, goals: [...result.values()]});
    out.healthGoals = digests;
  }
  if (device.habitLinks) {
    const home = habitLinksIn(next);
    const links = mergeKeyed<HabitHealthLink>(new Map(Object.entries(home.links)), new Map(Object.entries(device.habitLinks.links)), marker.links, newer);
    const markerKey = (a: AppliedCheckIn) => `${a.habitId}:${a.date}`;
    const applied = mergeKeyed<AppliedCheckIn>(new Map(home.applied.map(a => [markerKey(a), a] as const)), new Map(device.habitLinks.applied.map(a => [markerKey(a), a] as const)), marker.applied,
      // The same habit and day applied on both sides: the one already here stays, and an undo on either side holds.
      (h, d) => h.undone || !d.undone ? h : {...h, undone: true});
    if (links.changed || applied.changed) next = withHabitLinks(next, {...home, links: Object.fromEntries(links.result), applied: [...applied.result.values()].sort((a, b) => a.date.localeCompare(b.date) || a.habitId.localeCompare(b.habitId))});
    out.links = links.next; out.applied = applied.next;
  }
  if (device.weeklyReview) {
    const notes = {...reviewNotesIn(next)};
    let changed = false;
    for (const r of device.weeklyReview.reviews) {
      const digest = recordDigest(r), seen = marker.reviews[r.weekStart];
      if (seen === digest) continue;
      const text = r.notes?.health, held = notes[r.weekStart];
      // Never merged and already written here: this device's copy stays.
      if (seen === undefined && held !== undefined) continue;
      if (text === held) continue;
      if (text) notes[r.weekStart] = text; else delete notes[r.weekStart];
      changed = true;
    }
    if (changed) next = put(next, 'reviewNotes', {version: 1, notes}, !Object.keys(notes).length);
  }
  return {health: next, marker: out};
}
/** Copies the device key's weekly review (without its Health notes) into settings v2; same rules as for Health. */
export function mergeDeviceIntoSettings(settings: DashboardSettings, device: DeviceRecords, marker: HomesMarker): {settings: DashboardSettings; marker: Partial<HomesMarker>} {
  if (!device.weeklyReview) return {settings, marker: {}};
  const home = settingsReviewIn(settings), reviews = new Map((home?.reviews ?? []).map(r => [r.weekStart, r] as const)), digests: Record<string, string> = {...marker.reviews};
  let changed = false;
  for (const r of device.weeklyReview.reviews) {
    const digest = recordDigest(r), seen = marker.reviews[r.weekStart], held = reviews.get(r.weekStart);
    digests[r.weekStart] = digest;
    if (seen === digest) continue;
    const {notes: words, ...rest} = r, {health: text, ...others} = words ?? ({} as NonNullable<Review['notes']>);
    void text;
    let value: SettingsReview['reviews'][number] = {...rest, ...(Object.keys(others).length ? {notes: others} : {})};
    // Never merged, and this week already has a review here (another device's, through sync): its status stays, and
    // the device's words fill only the fields it left empty, so neither device's words are hidden.
    if (seen === undefined && held !== undefined) { const notes = {...others, ...held.notes}; value = {...held, ...(Object.keys(notes).length ? {notes} : {})}; }
    if (JSON.stringify(value) !== JSON.stringify(held)) { reviews.set(r.weekStart, value); changed = true; }
  }
  const weekday = device.weeklyReview.weekday, weekdayDigest = recordDigest(weekday);
  const takeWeekday = marker.weekday !== weekdayDigest && (marker.weekday !== undefined || home === undefined) && weekday !== (home?.weekday ?? 0);
  if (!changed && !takeWeekday) return {settings, marker: {reviews: digests, weekday: weekdayDigest}};
  const next = {...settings, schemaVersion: Math.max(settings.schemaVersion, 2), weeklyReview: {version: 1, weekday: takeWeekday ? weekday : home?.weekday ?? 0, reviews: [...reviews.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart))}} as DashboardSettings;
  return {settings: next, marker: {reviews: digests, weekday: weekdayDigest}};
}
/** Whether the device keys hold anything the marker has not seen, so a load with nothing new writes nothing. */
export function deviceHasNew(device: DeviceRecords, marker: HomesMarker): boolean {
  const unseen = (digests: Record<string, string>, entries: Iterable<[string, unknown]>) => { for (const [key, value] of entries) if (digests[key] !== recordDigest(value)) return true; return false; };
  return (!!device.fasting && unseen(marker.fasting, device.fasting.sessions.map(s => [s.id, s])))
    || (!!device.healthGoals && unseen(marker.healthGoals, device.healthGoals.goals.map(g => [g.id, g])))
    || (!!device.habitLinks && (unseen(marker.links, Object.entries(device.habitLinks.links)) || unseen(marker.applied, device.habitLinks.applied.map(a => [`${a.habitId}:${a.date}`, a]))))
    || (!!device.weeklyReview && (unseen(marker.reviews, device.weeklyReview.reviews.map(r => [r.weekStart, r])) || marker.weekday !== recordDigest(device.weeklyReview.weekday)));
}
