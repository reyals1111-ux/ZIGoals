import type {Lang} from './types';

/**
 * Session AS (ADR-042, Part 1): how the exact layer reads words. Lower case, accents folded, punctuation to spaces (an ISO
 * date keeps its hyphens); English or Dutch by its function words; and a typo fix that is tried only when the question is
 * not understood as typed (understand.ts), against the layer's own vocabulary and the names of the person's records.
 */
export const fold = (text: string): string => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '')
  .replace(/[^a-z0-9%-]+/g, ' ').replace(/(?<!\d)-|-(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();

const NL = new Set('ik je jij mijn hoeveel hoe wat welke waar waarom wanneer heb hebt heeft ben bent is zijn het een van voor niet geen met deze dit vandaag gisteren maand jaar gedaan kan kun nog op de dagen keer vaak vorige afgelopen gemist vergeten overgeslagen gehaald deze week dag dagen staat gaat mij ging was waren al sinds dan te laat welk hoelang'.split(' '));
const EN = new Set('i my me you your how what which where why when have has had did do does the a an of for not no with this that today yesterday month year can many much often on days times last was were am are is since than late still any there'.split(' '));
/** Dutch when the words are more Dutch than English (two Dutch words at least, or one in a very short question). */
export function langOf(folded: string): Lang {
  const words = folded.split(' '), nl = words.filter(w => NL.has(w) && !EN.has(w)).length, en = words.filter(w => EN.has(w) && !NL.has(w)).length;
  return nl > en && (nl >= 2 || words.length <= 4) ? 'nl' : 'en';
}

/** Damerau–Levenshtein distance, stopped once it passes `max`. */
export function distance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [], prev = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i]; let low = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, before[j - 2]! + 1);
      row.push(v); low = Math.min(low, v);
    }
    if (low > max) return max + 1;
    before = prev; prev = row;
  }
  return prev[b.length]!;
}
/** Everyday words that sit one slip from a word of the vocabulary and are never "fixed" into it. */
const REAL = new Set('mind wait hate mass bell tusk talk walk then them they this that than here there were where wear near year your four hour sour pour mine wine fine line nine time lime same some come home done gone none bone tone note vote date gate rate hate late mate fate bill hill will fill pill till mill kill task mask bask best rest test west nest most post cost lost list mist fist last fast past cast vast want went wont hint mint lint tint goal coal foal gold cold hold told sold bold fold food good mood wood hood week weak seek meek peek days ways pays says lays rays bays sleep sheep steep sweep steps stops water later eater wafer watch match catch month mouth south north worth birth bills pills wills hills daily dairy diary what that chat whet when then hen den ten men pen many mane mean lean bean dean much such each did dad dud kid hid lid rid bid miss mess moss muss kiss hiss boss loss toss less gym gum hem him ham hum read reed road raid lead bead dead head ran run ron van can man tan fan ben den zen zijn mijn lijn pijn wijn fijn deze daze dose doze niet nies riet geen been teen week weer meer zeer keer leer heer veel vele deel heel geel maar naar haar jaar paar waar daar baar wat dat gat kat lat mat nat rat hoe toe koe doe dag lag mag zag vag gaat laat maat baat haat staat straat taak zaak vaak raak maak kaak taken zaken maken raken'.split(' '));
/**
 * The question with its misspelt words set right, or null when nothing changed. A word of four letters or more that is
 * neither in the vocabulary nor an everyday word becomes the one vocabulary word a single slip away (two slips from seven
 * letters on); two candidates at the same distance leave the word as typed.
 */
export function fixSlips(folded: string, vocabulary: ReadonlySet<string>, least = 4): string | null {
  let changed = false;
  const out = folded.split(' ').map(word => {
    if (word.length < least || /\d/.test(word) || vocabulary.has(word) || REAL.has(word) || /^(?:zigoals|zigi|nova|zignaly|zigchain|zig)/.test(word)) return word;
    const max = word.length >= 8 ? 2 : 1;
    let best: string | null = null, bestD = max + 1, tie = false;
    for (const v of vocabulary) {
      // The first letter is right in nearly every slip of the hand; a word that differs there is another word.
      if (v.length < 4 || Math.abs(v.length - word.length) > max || (v[0] !== word[0] && !(v[0] === word[1] && v[1] === word[0]))) continue;
      const d = distance(word, v, max);
      if (d < bestD) { best = v; bestD = d; tie = false; } else if (d === bestD && v !== best) tie = true;
    }
    if (!best || tie) return word;
    changed = true; return best;
  });
  return changed ? out.join(' ') : null;
}
/** A light stem for English and Dutch record names and verbs ("meditated", "gemediteerd", "mediteren" → "medit…"). */
export function root(word: string): string {
  let w = word;
  if (/^ge[a-z]{4,}(?:d|t|en)$/.test(w)) w = w.slice(2);
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'eren', 'eerd', 'eert', 'ies', 'ied', 'ed', 'en', 'es', 'e', 's', 'd', 't']) if (w.length - suffix.length >= 4 && w.endsWith(suffix)) { w = w.slice(0, -suffix.length); break; }
  if (w.length >= 5 && w.at(-1) === w.at(-2) && !/[aeiou]/.test(w.at(-1)!)) w = w.slice(0, -1);
  return w;
}
/** Two words name the same thing: the same root, or a shared start of five letters that is most of the shorter word. */
export function sameWord(a: string, b: string): boolean {
  const x = root(a), y = root(b);
  if (x === y) return true;
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i >= 5 && i >= Math.min(x.length, y.length) - 2;
}
export const t = (lang: Lang, en: string, nl: string): string => lang === 'nl' ? nl : en;
/** "A", "A and B", "A, B and C" (Dutch: "en"). */
export function listWords(items: readonly string[], lang: Lang): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${t(lang, 'and', 'en')} ${items.at(-1)}`;
}
export const plural = (n: number, lang: Lang, en: [string, string], nl: [string, string]): string => `${n} ${(lang === 'nl' ? nl : en)[n === 1 ? 0 : 1]}`;
