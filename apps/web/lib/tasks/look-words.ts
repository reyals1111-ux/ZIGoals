import type {TaskLook} from './look';

/**
 * Session AV lane 2 (r3-plan, LEDGER #257; Structured's Smart Task Icons, without a model): a symbol and colour suggested
 * from the words of a task's title, from a written list in English and Dutch. The first group with a word in the title
 * wins; nothing is suggested when no word is known. The person always chooses: the editor offers it, never sets it. Pure.
 */
type Group = {look: TaskLook; words: readonly string[]};
const GROUPS: readonly Group[] = [
  {look: {glyph: '✚', colour: 'red'}, words: ['doctor', 'dentist', 'gp', 'hospital', 'pharmacy', 'medicine', 'pills', 'prescription', 'vaccine', 'checkup', 'arts', 'huisarts', 'tandarts', 'ziekenhuis', 'apotheek', 'medicijn', 'medicijnen', 'recept', 'prik', 'controle']},
  {look: {glyph: '▲', colour: 'orange'}, words: ['gym', 'run', 'running', 'workout', 'training', 'swim', 'yoga', 'hike', 'bike', 'cycle', 'stretch', 'sport', 'fitness', 'rennen', 'hardlopen', 'zwemmen', 'fietsen', 'wandelen', 'sporten', 'trainen']},
  {look: {glyph: '◆', colour: 'green'}, words: ['pay', 'bill', 'bills', 'invoice', 'bank', 'tax', 'taxes', 'budget', 'rent', 'insurance', 'transfer', 'savings', 'betalen', 'rekening', 'factuur', 'belasting', 'huur', 'verzekering', 'sparen', 'overmaken', 'geld']},
  {look: {glyph: '✎', colour: 'blue'}, words: ['write', 'email', 'mail', 'letter', 'report', 'essay', 'draft', 'notes', 'reply', 'blog', 'schrijven', 'brief', 'verslag', 'mailen', 'antwoorden', 'opstel', 'tekst']},
  {look: {glyph: '■', colour: 'violet'}, words: ['meeting', 'call', 'work', 'office', 'client', 'presentation', 'review', 'deadline', 'project', 'interview', 'vergadering', 'bellen', 'werk', 'kantoor', 'klant', 'presentatie', 'overleg', 'sollicitatie']},
  {look: {glyph: '⌂', colour: 'teal'}, words: ['clean', 'vacuum', 'laundry', 'dishes', 'tidy', 'repair', 'fix', 'home', 'house', 'kitchen', 'groceries', 'shopping', 'cook', 'schoonmaken', 'stofzuigen', 'was', 'afwas', 'opruimen', 'repareren', 'huis', 'keuken', 'boodschappen', 'koken']},
  {look: {glyph: '✿', colour: 'pink'}, words: ['birthday', 'gift', 'present', 'party', 'flowers', 'wedding', 'anniversary', 'date', 'verjaardag', 'cadeau', 'feest', 'bloemen', 'bruiloft', 'jubileum']},
  {look: {glyph: '☘', colour: 'green'}, words: ['garden', 'plants', 'water the plants', 'weed', 'mow', 'tuin', 'planten', 'wieden', 'maaien', 'gras']},
  {look: {glyph: '♪', colour: 'violet'}, words: ['music', 'piano', 'guitar', 'practice', 'song', 'concert', 'choir', 'muziek', 'gitaar', 'oefenen', 'lied', 'koor']},
  {look: {glyph: '☾', colour: 'blue'}, words: ['sleep', 'bed', 'bedtime', 'nap', 'evening', 'night', 'slapen', 'bedtijd', 'dutje', 'avond', 'nacht']},
  {look: {glyph: '☀', colour: 'yellow'}, words: ['morning', 'sun', 'beach', 'holiday', 'vacation', 'trip', 'ochtend', 'zon', 'strand', 'vakantie', 'reis', 'uitje']},
  {look: {glyph: '♥', colour: 'red'}, words: ['mum', 'mom', 'dad', 'family', 'friend', 'kids', 'love', 'visit', 'mama', 'papa', 'familie', 'vriend', 'vriendin', 'kinderen', 'opa', 'oma', 'bezoek', 'langsgaan']},
  {look: {glyph: '★', colour: 'yellow'}, words: ['important', 'urgent', 'goal', 'belangrijk', 'dringend', 'doel']},
];
const fold = (s: string) => ` ${s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
/** The suggested look for a title and the word it came from, or null. */
export function suggestTaskLook(title: string): {look: TaskLook; word: string} | null {
  const text = fold(title);
  if (text.trim().length < 2) return null;
  for (const g of GROUPS) for (const w of g.words) if (text.includes(` ${w} `)) return {look: g.look, word: w};
  return null;
}
/** How many words the list knows (for the Help text and the test). */
export const SUGGESTION_WORDS = GROUPS.reduce((n, g) => n + g.words.length, 0);
