import {OWN_WORDS_KEPT, OWN_WORDS_MAX, OWN_WORD_MAX, SYMPTOMS, SYMPTOM_WORDS, cycleSchema, type Cycle} from './store';

/**
 * Session AV lane 2 (r5-body, LEDGER #380 Clue's own tags and Customize, #383 its Perimenopause words): the words a cycle
 * day can be marked with — the built-in ones, a few more everyday ones, the perimenopause words when that choice is on,
 * and the person's own (up to 30) — hidden or put in the person's order. Words to log, never a reading of what they
 * mean. Pure; English for the page (the cycle log is English), Dutch for NOVA's and ZIGi's answers.
 */
export const EVERYDAY = ['low-energy', 'lots-of-energy', 'slept-badly'] as const;
export const PERI = ['hot-flushes', 'night-sweats', 'joint-aches', 'brain-fog'] as const;
export const MORE_WORDS: Readonly<Record<string, string>> = {'low-energy': 'Low energy', 'lots-of-energy': 'Lots of energy', 'slept-badly': 'Slept badly', 'hot-flushes': 'Hot flushes', 'night-sweats': 'Night sweats', 'joint-aches': 'Joint aches', 'brain-fog': 'Brain fog'};
export const WORDS_NL: Readonly<Record<string, string>> = {
  cramps: 'Krampen', headache: 'Hoofdpijn', 'back-pain': 'Rugpijn', bloating: 'Opgeblazen gevoel', 'tender-breasts': 'Gevoelige borsten', tired: 'Moe', 'mood-changes': 'Wisselende stemming', acne: 'Huidveranderingen', spotting: 'Spotting', cravings: 'Trek',
  'low-energy': 'Weinig energie', 'lots-of-energy': 'Veel energie', 'slept-badly': 'Slecht geslapen', 'hot-flushes': 'Opvliegers', 'night-sweats': 'Nachtzweten', 'joint-aches': 'Gewrichtspijn', 'brain-fog': 'Hersenmist',
};
const BUILT_IN: readonly string[] = [...SYMPTOMS, ...EVERYDAY];
export const isBuiltIn = (id: string) => BUILT_IN.includes(id) || (PERI as readonly string[]).includes(id);
type Words = Pick<Cycle, 'own' | 'hidden' | 'order' | 'peri'>;

/** A word's name: the person's own, else the built-in one, else the id as written (a word from a later build). */
export function wordLabel(rec: Words | null | undefined, id: string, lang: 'en' | 'nl' = 'en'): string {
  const own = rec?.own?.find(w => w.id === id);
  if (own) return own.word;
  if (lang === 'nl' && WORDS_NL[id]) return WORDS_NL[id]!;
  return SYMPTOM_WORDS[id] ?? MORE_WORDS[id] ?? id;
}
/** Every word that can be offered, in the person's order (their order first, the rest as they come), hidden ones too. */
export function allWords(rec: Words): {id: string; label: string; own: boolean; hidden: boolean}[] {
  const ids = [...BUILT_IN, ...(rec.peri ? PERI : []), ...(rec.own ?? []).filter(w => !w.gone).map(w => w.id)];
  const unique = [...new Set(ids)], order = rec.order ?? [];
  const at = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length + unique.indexOf(id) : i; };
  return unique.sort((a, b) => at(a) - at(b)).map(id => ({id, label: wordLabel(rec, id), own: !!rec.own?.some(w => w.id === id), hidden: !!rec.hidden?.includes(id)}));
}
/** The words shown as chips for a day: the offered ones that are not hidden, then any the day already has (kept and shown). */
export function chipWords(rec: Words, daySymptoms: readonly string[] = []): string[] {
  const shown = allWords(rec).filter(w => !w.hidden).map(w => w.id);
  return [...shown, ...daySymptoms.filter(s => !shown.includes(s))];
}

/** The id an own word is kept under: its letters in a–z with hyphens (accents taken off), else a fallback of letters. */
export function wordIdOf(word: string, taken: ReadonlySet<string>): string {
  const base = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '');
  let id = base || 'own-word', n = 0;
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  while (taken.has(id)) { id = `${base || 'own-word'}-${letters[n % 26]}${n >= 26 ? letters[Math.floor(n / 26) % 26] : ''}`; n++; }
  return id.slice(0, 30);
}
export type WordResult = {ok: true; value: Cycle; id: string} | {ok: false; message: string};
/** Adds an own word (up to 30 in use). A word that is already offered, or was removed and is typed again, comes back. */
export function addOwnWord(rec: Cycle, raw: string): WordResult {
  const word = raw.replace(/\s+/g, ' ').trim();
  if (!word || !/[\p{L}\p{N}]/u.test(word)) return {ok: false, message: 'Type a word with letters or numbers.'};
  if (word.length > OWN_WORD_MAX) return {ok: false, message: `Keep it to ${OWN_WORD_MAX} characters or fewer.`};
  const same = (w: string) => w.toLocaleLowerCase() === word.toLocaleLowerCase();
  const offered = allWords(rec).find(w => same(w.label));
  if (offered) return offered.hidden ? {ok: true, id: offered.id, value: cycleSchema.parse({...rec, hidden: (rec.hidden ?? []).filter(h => h !== offered.id)})} : {ok: false, message: `“${offered.label}” is already in your words.`};
  const own = rec.own ?? [], back = own.find(w => w.gone && same(w.word));
  if (own.filter(w => !w.gone).length >= OWN_WORDS_MAX) return {ok: false, message: `You have ${OWN_WORDS_MAX} words of your own. Remove one to add another.`};
  if (back) return {ok: true, id: back.id, value: cycleSchema.parse({...rec, own: own.map(w => w === back ? {id: w.id, word: w.word} : w)})};
  const taken = new Set([...BUILT_IN, ...PERI, ...own.map(w => w.id)]), id = wordIdOf(word, taken);
  // A removed word whose past days still carry it keeps its name; with 60 kept, the oldest removed one is let go.
  let kept = [...own, {id, word}];
  while (kept.length > OWN_WORDS_KEPT) { const i = kept.findIndex(w => w.gone); if (i < 0) break; kept = kept.filter((_, j) => j !== i); }
  return {ok: true, id, value: cycleSchema.parse({...rec, own: kept})};
}
/** Removes an own word from the chips; its past days keep it, and it keeps its name there. */
export function removeOwnWord(rec: Cycle, id: string): Cycle {
  const own = (rec.own ?? []).map(w => w.id === id ? {...w, gone: true as const} : w);
  return cycleSchema.parse({...rec, own, order: (rec.order ?? []).filter(o => o !== id)});
}
/** Hides a built-in word from the chips, or shows it again. */
export function setWordHidden(rec: Cycle, id: string, hidden: boolean): Cycle {
  const list = (rec.hidden ?? []).filter(h => h !== id);
  return cycleSchema.parse({...rec, hidden: hidden ? [...list, id] : list});
}
/** Moves a word one place up (-1) or down (+1) among the offered words; the whole order is then kept. */
export function moveWord(rec: Cycle, id: string, by: -1 | 1): Cycle {
  const ids = allWords(rec).map(w => w.id), i = ids.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return rec;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return cycleSchema.parse({...rec, order: ids.slice(0, 120)});
}
/** "No period" and the perimenopause words, each a plain choice on this device. */
export function setCycleChoice(rec: Cycle, which: 'noPeriod' | 'peri', on: boolean): Cycle {
  const next: Record<string, unknown> = {...rec};
  if (on) next[which] = true; else delete next[which];
  return cycleSchema.parse(next);
}
