/**
 * Session U Part 9 ([TIER 3] (sync); docs/product/SYNC_HOMES.md, "The write switch"): the one switch for the new sync
 * writes. On, Session P's four device-only records are written into their synced homes and read from there, merged by
 * id with whatever the device keys hold (lib/vault/sync-homes.ts):
 *   - fasting sessions → Health v2 (`fasting`);
 *   - the weekly review → settings v2 (`weeklyReview`), without its Health note;
 *   - health goals, habit-health links with their automatic check-in markers, and the review's Health note → Health v3
 *     (`healthGoals`, `habitLinks`, `reviewNotes`), so Health-describing data syncs only inside Health, under the Health
 *     consent. A section becomes v3 only when one of those fields is first written.
 * Off, every store reads and writes its device key exactly as before. The device keys are never rewritten either way.
 *
 * Builds #27 and #28 (R1) read Health v2 and settings v2 but refuse Health v3, keeping its bytes; builds before R1
 * refuse all of them. Rolling the public Alpha back to #28 therefore leaves a v3 Health section unreadable there until
 * the roll-forward (bytes and recovery copies kept), and the Manual Alpha rollback target must never go below R1.
 *
 * Session U follow-up F1: shipped OFF. This build carries the Health v3 read support; it writes exactly what #28 writes
 * and converts nothing. The switch goes ON in its own one-line PR, merged at least 7 days after the first Alpha deploy
 * that carries this read support and on or after 2026-10-11, and included in the 22–24 October final acceptance
 * redeploy (docs/product/SYNC_WRITES_ON.md). From then on the Alpha's rollback floor is the build that first carried
 * v3 read support. Portfolio sync (ADR-013) shares this switch, so it is hidden while it is off.
 */
export const SYNC_WRITES: boolean = false;
