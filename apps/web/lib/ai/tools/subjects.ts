/**
 * Which record a question or a tool call means (Session V Part 2): a handle from this reply (h1, g2) or the words the
 * person used ("meditate" for the habit "Meditation", "Japan" for "Japan adventure"). Matching is plain and predictable:
 * lower case, accents and punctuation removed, a light stem (meditate / meditation / meditating → meditat), then the
 * best score wins. Two records with the same best score are ambiguous and come back as choices: ZIGi never guesses.
 */
export type Candidate<T> = {item: T; label: string; id: string};
export type Match<T> = {kind: 'one'; item: T; label: string; id: string} | {kind: 'many'; choices: Candidate<T>[]} | {kind: 'none'};
const STOP = new Set(['my', 'the', 'a', 'an', 'of', 'for', 'on', 'in', 'to', 'i', 'did', 'do', 'how', 'much', 'many', 'what', 'goal', 'habit', 'mijn', 'de', 'het', 'mon', 'ma', 'mes', 'le', 'la', 'les', 'mein', 'meine', 'der', 'die', 'das']);
export function normalise(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
/** A light, language-neutral stem: enough for "meditate/meditation/meditating", "read/reading", "walk/walks/walking". */
export function stem(word: string): string {
  let w = word;
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ions', 'ion', 'ies', 'ied', 'ed', 'es', 'e', 's']) {
    if (w.length - suffix.length >= 4 && w.endsWith(suffix)) { w = w.slice(0, -suffix.length); break; }
  }
  return w;
}
export const tokens = (value: string): string[] => normalise(value).split(' ').filter(t => t && !STOP.has(t));
function score(title: string, query: string): number {
  const t = normalise(title), q = normalise(query);
  if (!q) return 0;
  if (t === q) return 100;
  const titleStems = tokens(title).map(stem), queryStems = tokens(query).map(stem);
  if (!queryStems.length) return 0;
  const hits = queryStems.filter(qs => titleStems.some(ts => ts === qs || (qs.length >= 4 && (ts.startsWith(qs) || qs.startsWith(ts)) && Math.min(ts.length, qs.length) >= 4)));
  if (!hits.length) return 0;
  // All of the question's words found, and how much of the title they cover.
  return hits.length === queryStems.length ? 50 + Math.round(30 * hits.length / Math.max(titleStems.length, 1)) : 10 * hits.length;
}
/** The best match among `items` for `query`; ties at the top score are returned as choices. */
export function matchByName<T>(items: readonly T[], query: string, labelOf: (item: T) => string, idOf: (item: T) => string): Match<T> {
  const scored = items.map(item => ({item, label: labelOf(item), id: idOf(item), score: score(labelOf(item), query)})).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return {kind: 'none'};
  const top = scored.filter(s => s.score === scored[0]!.score);
  if (top.length === 1) { const one = top[0]!; return {kind: 'one', item: one.item, label: one.label, id: one.id}; }
  return {kind: 'many', choices: top.map(({item, label, id}) => ({item, label, id}))};
}
/** Records mentioned anywhere in a longer text: every item with a positive score for some phrase of the text. */
export function mentioned<T>(items: readonly T[], question: string, labelOf: (item: T) => string): T[] {
  const words = tokens(question).map(stem);
  return items.filter(item => {
    const stems = tokens(labelOf(item)).map(stem);
    return stems.length > 0 && stems.some(ts => ts.length >= 3 && words.some(w => w === ts || (w.length >= 4 && ts.length >= 4 && (w.startsWith(ts) || ts.startsWith(w)))));
  });
}
