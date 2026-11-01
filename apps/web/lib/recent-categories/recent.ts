import {addLocalDays} from '../local-date';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';

/**
 * Session AK (BUILD list 2 #6, COMPETITORS_2: Lunch Money): "Recent categories first". In Wealth → Spending the category
 * chips start with the three the person used most in the last 30 days (counted from the money log, nothing stored),
 * then the fixed list in its usual order without repeats. Expense and income are counted apart, each for its own
 * chips. A split entry counts once in each of its parts' categories (lib/money-split). Ties: the one used most recently,
 * then the fixed list's order, then the name. An empty log keeps the fixed order exactly.
 */
export const RECENT_DAYS = 30, RECENT_COUNT = 3;
export type RecentCategory = {category: string; uses: number; last: string};

/** The categories used most in the 30 days up to `today` for one kind, most used first (all of them, ranked). */
export function rankRecent(entries: readonly MoneyEntry[], kind: 'expense' | 'income', today: string, fixed: readonly string[] = [], days = RECENT_DAYS): RecentCategory[] {
  const from = addLocalDays(today, -(days - 1)), by = new Map<string, RecentCategory>();
  for (const e of entries) {
    if (e.kind !== kind || e.date < from || e.date > today) continue;
    const seen = new Set<string>();
    for (const part of entryParts(e)) {
      const name = part.category.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const row = by.get(name) ?? {category: name, uses: 0, last: e.date};
      row.uses++; if (e.date > row.last) row.last = e.date;
      by.set(name, row);
    }
  }
  const order = (name: string) => { const i = fixed.indexOf(name); return i < 0 ? fixed.length : i; };
  return [...by.values()].sort((a, b) => b.uses - a.uses || b.last.localeCompare(a.last) || order(a.category) - order(b.category) || a.category.localeCompare(b.category));
}

/**
 * The chips in the order to show: the top three recent ones, then the fixed list in its usual order (a recent one is
 * not shown twice). `recent` says how many lead the list, so the page can say "your most used first".
 */
export function categoriesRecentFirst(entries: readonly MoneyEntry[], kind: 'expense' | 'income', fixed: readonly string[], today: string, count = RECENT_COUNT): {chips: string[]; recent: number} {
  const top = rankRecent(entries, kind, today, fixed).slice(0, Math.max(0, count)).map(r => r.category);
  const lead = new Set(top);
  return {chips: [...top, ...fixed.filter(c => !lead.has(c))], recent: top.length};
}
