/**
 * Search over this device's own records and the app's pages (Session AA-Cloud Part 4, S1). Pure and synchronous: the
 * palette builds the items from the stores it already reads, and nothing leaves the device. Every word of the query must
 * match somewhere in an item (title, subtitle or keywords); a word at the start of a title word ranks highest. Accents
 * and case never matter ("cafe" finds "Café").
 */
export const SEARCH_KINDS = ['page', 'goal', 'habit', 'food', 'recipe', 'asset', 'template', 'setting', 'help'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export const KIND_LABEL: Record<SearchKind, string> = {page: 'Pages', goal: 'Goals', habit: 'Habits', food: 'Foods', recipe: 'Recipes', asset: 'Assets', template: 'Goal templates', setting: 'Settings', help: 'Help answers'};
export type SearchItem = {id: string; kind: SearchKind; title: string; subtitle?: string; href: string; keywords?: readonly string[]};
export type SearchHit = SearchItem & {score: number};

// Session AH (TO11, B-072): markup typed into the box ("<b>x</b>") is read as its text, never as extra words.
export const normalize = (s: string) => s.replace(/<\/?[a-z][^>]*>/gi, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}%€$]+/gu, ' ').trim();
const words = (s: string) => normalize(s).split(' ').filter(Boolean);

/** How well one item matches the query's words, or null when a word matches nowhere. */
export function scoreItem(item: SearchItem, query: string): number | null {
  const q = words(query);
  if (!q.length) return null;
  const title = words(item.title), titleText = normalize(item.title);
  const rest = normalize([item.subtitle ?? '', ...(item.keywords ?? [])].join(' '));
  let score = 0;
  for (const w of q) {
    if (title.some(t => t === w)) score += 12;
    else if (title.some(t => t.startsWith(w))) score += 9;
    else if (titleText.includes(w)) score += 5;
    else if (rest.split(' ').some(t => t.startsWith(w))) score += 3;
    else if (rest.includes(w)) score += 1;
    else return null;
  }
  if (titleText.startsWith(normalize(query))) score += 6;
  if (titleText === normalize(query)) score += 10;
  return score - Math.min(4, title.length / 4);
}

/** The best matches, at most `perKind` of each kind and `limit` in all, best first within the kinds' own order. */
export function search(items: readonly SearchItem[], query: string, {limit = 24, perKind = 6}: {limit?: number; perKind?: number} = {}): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const item of items) { const score = scoreItem(item, query); if (score !== null) hits.push({...item, score}); }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const counts = new Map<SearchKind, number>(), kept: SearchHit[] = [];
  for (const hit of hits) {
    const n = counts.get(hit.kind) ?? 0;
    if (n >= perKind) continue;
    counts.set(hit.kind, n + 1);
    kept.push(hit);
    if (kept.length >= limit) break;
  }
  // Grouped by kind, the kind of the best hit first; within a kind, best first.
  const order = [...new Set(kept.map(h => h.kind))];
  return order.flatMap(kind => kept.filter(h => h.kind === kind));
}
