import {addLocalDays} from '../local-date';
import {formatDate} from '../visual-format';
import type {GroceryRecord} from './schema';

/**
 * Session AW (X5, LEDGER #452; Paprika's pantry with expiry days): "Use soon" on the grocery list — the pantry items whose
 * use-by day is within three days (the soonest first), then those past their day, said plainly ("past its use-by day,
 * 2 days ago"). An item without a day is never listed: an unknown day is not a near one. Read from the grocery record
 * (`useBy`, by the pantry's folded names); nothing is sent and no notification is made. Pure: today comes in.
 */
export const USE_SOON_DAYS = 3;
export type UseSoonItem = {name: string; day: string; days: number};
export const between = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
/** Every pantry item with a day: `soon` (0 to 3 days left, soonest first), `past` (most recently passed first), `later`. */
export function pantrySoon(record: GroceryRecord, today: string): {soon: UseSoonItem[]; past: UseSoonItem[]; later: UseSoonItem[]} {
  const all = Object.entries(record.useBy ?? {}).filter(([name]) => !!record.pantry?.[name]).map(([name, day]) => ({name, day, days: between(today, day)}));
  const order = (a: UseSoonItem, b: UseSoonItem) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name);
  return {
    soon: all.filter(i => i.days >= 0 && i.days <= USE_SOON_DAYS).sort(order),
    past: all.filter(i => i.days < 0).sort((a, b) => b.day.localeCompare(a.day) || a.name.localeCompare(b.name)),
    later: all.filter(i => i.days > USE_SOON_DAYS).sort(order),
  };
}
/** "use today", "use by tomorrow", "use by Nov 27 (in 2 days)", "past its use-by day, yesterday", "… 2 days ago". */
export function byDayWords(item: Pick<UseSoonItem, 'day' | 'days'>, today: string): string {
  const d = item.days;
  if (d < 0) return `past its use-by day, ${d === -1 ? 'yesterday' : `${-d} days ago`}`;
  if (d === 0) return 'use today';
  if (d === 1) return 'use by tomorrow';
  return `use by ${formatDate(item.day, {year: item.day.slice(0, 4) !== today.slice(0, 4)})} (in ${d} days)`;
}
/** The words for a day just chosen ("use by tomorrow"). */
export const byDayOf = (day: string, today: string) => byDayWords({day, days: between(today, day)}, today);
/** The latest use-by day the date field takes (five years on). */
export const latestUseBy = (today: string) => addLocalDays(today, 365 * 5);
