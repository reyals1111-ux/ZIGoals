/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F5 and R1-F6): the standard BIP39 word lists for the
 * recovery-words detector (lib/emergency-sheet/secrets.ts), loaded on demand and kept in memory for the session.
 *
 * - Four scripts, four small modules (lib/secret-guard/wordlists/*), each fetched only when a run of twelve or more words
 *   in that script turns up in text the guard reads (`wordListNeeds`), never with a page: Latin letters (English, Spanish,
 *   French, Italian, Czech, Portuguese), Japanese hiragana, Korean Hangul and Chinese characters (simplified, traditional).
 * - Until a list is here, the detector keeps its cautious shape rules (it may warn about an ordinary list; it never lets
 *   recovery words through because a list is missing). A list that fails to load leaves the cautious rules in place.
 * - Words are compared by `listKey`: NFKD, without accents or other combining marks, lower case, so "abaco" meets
 *   "ábaco" and a phone's decomposed accents meet the lists' own.
 * Plain matching on this device; nothing is stored or sent.
 */
export type WordScript = 'latin' | 'kana' | 'hangul' | 'han';
export const WORD_SCRIPTS: readonly WordScript[] = ['latin', 'kana', 'hangul', 'han'];

export const listKey = (word: string): string => word.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

const lists: Partial<Record<WordScript, readonly ReadonlySet<string>[]>> = {};
const pending: Partial<Record<WordScript, Promise<void>>> = {};
const LOADERS: Record<WordScript, () => Promise<readonly string[]>> = {
  latin: () => import('./wordlists/latin').then(m => [m.ENGLISH, m.SPANISH, m.FRENCH, m.ITALIAN, m.CZECH, m.PORTUGUESE]),
  kana: () => import('./wordlists/japanese').then(m => [m.JAPANESE]),
  hangul: () => import('./wordlists/korean').then(m => [m.KOREAN]),
  han: () => import('./wordlists/chinese').then(m => [m.SIMPLIFIED_CHINESE, m.TRADITIONAL_CHINESE]),
};

/** The lists of one script (one set per language), or null while they are not loaded. */
export const wordListsFor = (script: WordScript): readonly ReadonlySet<string>[] | null => lists[script] ?? null;

/** Loads the lists of these scripts (each once; a failed load may be tried again later). Never rejects. */
export function loadWordLists(scripts: readonly WordScript[] = WORD_SCRIPTS): Promise<void> {
  return Promise.all(scripts.map(script => lists[script] ? undefined : pending[script] ??= LOADERS[script]()
    .then(texts => { lists[script] = texts.map(text => new Set(text.split(' ').map(listKey))); })
    .catch(() => { delete pending[script]; }))).then(() => undefined);
}
