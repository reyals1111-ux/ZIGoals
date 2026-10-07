/**
 * Timezone phase 4 (Session W Part 17, owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T2-A): the person's one journal
 * zone, settings v2 `journalTimeZone`. Habits and Health resolve their days in this order: the module's own zone (an
 * override, kept with its exact meaning), then this journal zone, then the device's zone. The shell sets it from the
 * private settings as soon as they open (components/shell.tsx, in a layout effect, so every write effect of the same
 * commit already sees it); until then `ready` is false and day-dependent writers wait (use-auto-checkins.ts). Nothing
 * here writes anything; on the server and in tests the zone is null and every day follows the device, as before.
 */
export type JournalZoneState = {readonly zone: string | null; readonly ready: boolean};
const SERVER_STATE: JournalZoneState = {zone: null, ready: false};
let state: JournalZoneState = SERVER_STATE, version = 0;
const listeners = new Set<() => void>();
export function journalTimeZone(): string | null { return state.zone; }
export function journalZoneReady(): boolean { return state.ready; }
/** The settings' zone (null: none chosen) and whether the settings have opened. Returns true when anything changed. */
export function setJournalTimeZone(zone: string | null, isReady: boolean): boolean {
  if (zone === state.zone && isReady === state.ready) return false;
  state = {zone, ready: isReady}; version++;
  for (const listener of listeners) listener();
  return true;
}
export function subscribeJournalTimeZone(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** A number that changes whenever the zone or its readiness does. */
export function journalZoneVersion(): number { return version; }
/**
 * For useSyncExternalStore: the current state (a new object on each change) and the server's (no zone, not ready). A
 * page part that hydrates after the shell set the zone renders the server's first, as its server HTML did, then updates.
 */
export function journalZoneSnapshot(): JournalZoneState { return state; }
export function serverJournalZone(): JournalZoneState { return SERVER_STATE; }
export function deviceTimeZone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
