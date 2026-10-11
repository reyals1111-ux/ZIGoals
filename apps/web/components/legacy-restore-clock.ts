import { formatDateTime } from "../lib/visual-format";

/** lib/local-ledger.ts accepts times up to five minutes ahead of this device's clock (QA-36 keeps that guard). */
const AHEAD_MS = 300_000;
const STAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/g;
/**
 * QA-36 (Session I, Part 10): when a local simulation backup has entries dated after this device's clock, the restore
 * refusal says so, with the latest time, instead of a general "could not be imported". Nothing about the guard changes.
 */
export function futureEntriesMessage(raw: string, now = Date.now(), format: (iso: string) => string = iso => formatDateTime(iso)): string | null {
  let latest = Number.NEGATIVE_INFINITY, text = "";
  for (const [stamp] of raw.matchAll(STAMP)) { const time = Date.parse(stamp); if (Number.isFinite(time) && time > latest) { latest = time; text = stamp; } }
  return latest > now + AHEAD_MS ? `This backup has entries dated after this device's clock (latest: ${format(text)}). Check the device's date and time, then try again. Nothing was changed.` : null;
}
