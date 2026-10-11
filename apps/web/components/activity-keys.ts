/**
 * React keys for the activity feed (QA-35). Older saved data can hold two asset events with one id, which the stored
 * format accepts (tightening it would make such data unreadable); a repeated id gets a numbered suffix here so every
 * event renders once, in order.
 */
export function activityKeys(entries: readonly { category: string; id: string }[]): string[] {
  const seen = new Map<string, number>();
  return entries.map(entry => {
    const base = `${entry.category}-${entry.id}`, count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base}#${count}` : base;
  });
}
