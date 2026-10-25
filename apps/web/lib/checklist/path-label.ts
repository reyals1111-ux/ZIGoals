/**
 * Session AG Polish 3 (ADR-032 L23; owner amendment 10, step 4): the one short word a Checklist item shows on the path
 * (phone and computer): "Water", "Read", "Walk", "Piano" — at most 12 letters. The List and the item's details keep its
 * full name. A person's own word (`pathLabel`, set under Edit path → "Name on the path") wins; else a curated word for the
 * familiar items; else the main word of the name, with numbers, units and filler verbs dropped:
 * "Play piano 15 minutes" → "Piano".
 */
export const PATH_LABEL_MAX = 12;
const CURATED: [RegExp, string][] = [
  [/vitamin|supplement|creatine|omega|magnesium|capsule|tablet/i, 'Vitamins'], [/\bwater\b|hydrat/i, 'Water'], [/meditat/i, 'Meditate'],
  [/\bread(ing)?\b/i, 'Read'], [/exercise|workout|\bgym\b/i, 'Exercise'], [/\bwalk|\bsteps\b/i, 'Walk'], [/piano/i, 'Piano'], [/shower/i, 'Shower'],
  [/breakfast/i, 'Breakfast'], [/lunch/i, 'Lunch'], [/dinner/i, 'Dinner'], [/snack/i, 'Snack'], [/stretch/i, 'Stretch'], [/yoga/i, 'Yoga'],
  [/journal/i, 'Journal'], [/\bsleep/i, 'Sleep'], [/weigh/i, 'Weigh-in'], [/\bfast(ing)?\b/i, 'Fast'], [/\brun(ning)?\b|\bjog/i, 'Run'],
];
const UNITS = /^(min|mins|minute|minutes|h|hr|hrs|hour|hours|km|m|mi|steps?|pages?|ml|l|g|kg|lb|times?|x|reps?|lines?|glass(es)?|cups?|sets?)$/i;
const FILLER = /^(take|do|play|go|have|make|get|log|learn|practice|practise|try|a|an|the|my|your|for|to|of|and|or|with|in|on|at|by|before|after|today|tonight|each|every|day|daily|no|some|more|less|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|bed|morning|afternoon|evening|night)$/i;
const word = (w: string) => { const t = w.replace(/^[^\p{L}]+|[^\p{L}-]+$/gu, ''); return t ? (t[0]!.toUpperCase() + t.slice(1)).slice(0, PATH_LABEL_MAX) : ''; };
/** The suggested word for a name. */
export function suggestPathLabel(name: string): string {
  for (const [re, label] of CURATED) if (re.test(name)) return label;
  const words = name.split(/[\s,·/&+()]+/).filter(Boolean);
  const main = words.find(w => !/\d/.test(w) && !UNITS.test(w) && !FILLER.test(w) && /\p{L}/u.test(w));
  return word(main ?? words.find(w => /\p{L}/u.test(w)) ?? '') || 'Step';
}
/** A person's own word, as stored: one word, its first 12 letters; empty for none. */
export function cleanPathLabel(input: string): string {
  return (input.trim().split(/\s+/)[0] ?? '').slice(0, PATH_LABEL_MAX);
}
/** The word an item shows on the path: its own, else the suggestion from its name. */
export function pathLabelOf(item: {pathLabel?: string}, name: string): string {
  const own = item.pathLabel ? cleanPathLabel(item.pathLabel) : '';
  return own || suggestPathLabel(name);
}
