/**
 * Timezone phase 4 (Session W Part 17, owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T2-A): the person's one journal
 * zone, settings v2 `journalTimeZone`. Habits and Health resolve their days in this order: the module's own zone (an
 * override, kept with its exact meaning), then this journal zone, then the device's zone. The shell sets it from the
 * private settings as soon as they open (components/shell.tsx, in a layout effect, so every write effect of the same
 * commit already sees it); until then `ready` is false and day-dependent writers wait (use-auto-checkins.ts). Nothing
 * here writes anything; on the server and in tests the zone is null and every day follows the device, as before.
 */
let current: string | null = null, ready = false, version = 0;
const listeners = new Set<() => void>();
export function journalTimeZone(): string | null { return current; }
export function journalZoneReady(): boolean { return ready; }
/** The settings' zone (null: none chosen) and whether the settings have opened. Returns true when anything changed. */
export function setJournalTimeZone(zone: string | null, isReady: boolean): boolean {
  if (zone === current && isReady === ready) return false;
  current = zone; ready = isReady; version++;
  for (const listener of listeners) listener();
  return true;
}
export function subscribeJournalTimeZone(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** A number that changes whenever the zone or its readiness does (for useSyncExternalStore). */
export function journalZoneVersion(): number { return version; }
export function deviceTimeZone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
