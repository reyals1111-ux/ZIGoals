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
export function suggestPathLabel(raw: string): string {
  // Session AL (P-LS-16 honest part, LS-053): markup is never shown as a fragment ("<i>x</i>" was "I>x").
  const name = raw.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ');
  for (const [re, label] of CURATED) if (re.test(name)) return label;
  const words = name.split(/[\s,·/&+()]+/).filter(Boolean);
  // Session AL (LS-053, PR-031): a short capitals tag ("QA Floss", "QA Plants") is not the word that tells items apart.
  const tag = (w: string) => /^\p{Lu}{1,3}$/u.test(w) && words.length > 1;
  const main = words.find(w => !/\d/.test(w) && !UNITS.test(w) && !FILLER.test(w) && /\p{L}/u.test(w) && !tag(w)) ?? words.find(w => !/\d/.test(w) && !UNITS.test(w) && !FILLER.test(w) && /\p{L}/u.test(w));
  const chosen = word(main ?? words.find(w => /\p{L}/u.test(w)) ?? '') || 'Step';
  // Session AL (PR-069, P-PR-17): a closing number tells same-named items apart ("QA Task 3" → "Task 3", not "Task"),
  // kept when the word and the number fit the 12 letters.
  const last = words[words.length - 1] ?? '', ending = /^\d{1,2}$/.test(last) && main && words.indexOf(main) < words.length - 1 ? last : '';
  return ending && `${chosen} ${ending}`.length <= PATH_LABEL_MAX ? `${chosen} ${ending}` : chosen;
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

/**
 * Session AL fourth pass (LS-053, PR-031, LS-017): the path's words, told apart. Two items that would show the same word
 * ("QA Floss" and "Floss teeth" both "Floss"; "Read: 30 minutes" and "Read ten pages" both "Read") each add the first
 * word of their own name the other does not have ("Floss teeth", "Read 30", "Read ten") when it fits the 12 letters;
 * any still alike are numbered in path order ("Stretch", "Stretch 2"). A person's own word is never changed.
 * NOT WIRED: the protected Checklist pin (tests/checklist-overlay-af.spec.ts, "its one word on the path (owner amendment
 * 10)") holds every planet's word to suggestPathLabel(name), and O6 keeps the labels; checklistPath() in derive.ts would
 * call this only in the integrator's O6 commit, with that pin updated.
 */
export function distinctPathLabels(items: readonly {id: string; name: string; own?: string}[]): Map<string, string> {
  const out = new Map<string, string>(), key = (l: string) => l.toLocaleLowerCase();
  const base = items.map(i => { const own = i.own ? cleanPathLabel(i.own) : ''; return {...i, own, label: own || suggestPathLabel(i.name)}; });
  const tokens = (name: string) => name.replace(/<[^>]*>/g, ' ').split(/[\s,·/&+():;]+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}-]+$/gu, '')).filter(Boolean);
  const groups = new Map<string, typeof base>();
  for (const b of base) groups.set(key(b.label), [...(groups.get(key(b.label)) ?? []), b]);
  for (const [, group] of groups) {
    if (group.length < 2) { for (const b of group) out.set(b.id, b.label); continue; }
    for (const b of group) {
      if (b.own) { out.set(b.id, b.label); continue; }
      // A name with no letters ("0", "-5") that collides shows itself rather than a second "Step".
      if (!/\p{L}/u.test(b.name) && b.name.trim()) { out.set(b.id, b.name.trim().replace(/\s+/g, ' ').slice(0, PATH_LABEL_MAX)); continue; }
      const mine = tokens(b.name), others = new Set(group.filter(o => o.id !== b.id).flatMap(o => tokens(o.name).map(key)));
      const extra = mine.find(w => !others.has(key(w)) && key(w) !== key(b.label) && !/^\p{Lu}{1,3}$/u.test(w) && !FILLER.test(w));
      const two = extra ? `${b.label} ${extra.toLocaleLowerCase()}` : '';
      out.set(b.id, two && two.length <= PATH_LABEL_MAX ? two : b.label);
    }
  }
  // Still alike (the same name twice): numbered in path order, the first keeps its word.
  const seen = new Map<string, number>();
  for (const b of base) {
    const label = out.get(b.id)!, n = (seen.get(key(label)) ?? 0) + 1; seen.set(key(label), n);
    if (n > 1 && !b.own) out.set(b.id, `${label.slice(0, PATH_LABEL_MAX - 1 - String(n).length)} ${n}`);
  }
  return out;
}
