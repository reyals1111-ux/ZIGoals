/**
 * Session AV lane 2 (roadmap, PK-6; TIER 3 stored formats, a new key, additive): the day ZIGi's "Hello, in place" last
 * played on this device, a plain local "YYYY-MM-DD" under `zigoals:zigi-hello-day`. Not personal (no record of what the
 * person did, only that ZIGi said hello that day); never synced; an unreadable value counts as none. Read and written by
 * components/zigi/hello-in-place.ts only.
 */
export const ZIGI_HELLO_DAY_KEY = 'zigoals:zigi-hello-day';
/**
 * Tests only (like alive.ts's TEST_RANDOM_KEY, session storage, never kept): an automated browser (`navigator.webdriver`)
 * gets the hello only when the tab's session storage holds this key as "1", so every other spec sees ZIGi, and the
 * device's keys, exactly as before.
 */
export const TEST_HELLO_KEY = 'zigoals:zigi:test-hello';
export function readHelloDay(storage: Pick<Storage, 'getItem'>): string | null {
  try { const v = storage.getItem(ZIGI_HELLO_DAY_KEY); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; } catch { return null; }
}
export function writeHelloDay(storage: Pick<Storage, 'setItem'>, day: string): void { try { storage.setItem(ZIGI_HELLO_DAY_KEY, day); } catch { /* storage full or blocked: it may play again today, nothing else */ } }
