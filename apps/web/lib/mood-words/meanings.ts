import {quadrantOfWord} from './words';

/**
 * Session AV lane 2 (r4-mind; LEDGER #324, How We Feel's descriptions of each feeling): one plain line for what each of
 * the 48 feeling words means, in everyday words — what it is like, never a label, a diagnosis or advice (checked by the
 * tests against the app's tone-forbidden words). English, as the feeling words are (the check-in has no Dutch path).
 * Beside them, a line of the person's own for each of their own words, kept in the loose check-in extras of the daily
 * energy record as `checkin.ownMeanings` ({word: line}, up to 120 characters; TIER 3 (stored format)). Read with plain
 * checks; every writer keeps the fields it does not know. Pure.
 */
export const MEANINGS: Readonly<Record<string, string>> = {
  // High energy, unpleasant
  stressed: 'a lot is asking for you at once, and it feels like too much right now',
  tense: 'tight and braced, as if waiting for something to happen',
  worried: 'your thoughts keep going to something that might go wrong',
  restless: 'can’t settle; the body wants to move',
  frustrated: 'something is in the way of what you want, again',
  irritated: 'small things are getting under your skin',
  overwhelmed: 'more than you can hold at the moment; hard to know where to start',
  nervous: 'a fluttery, unsure feeling about what is coming',
  'on edge': 'alert and jumpy, ready for the next thing',
  annoyed: 'mildly bothered by something or someone',
  pressured: 'pushed by time or by what others expect',
  jittery: 'shaky, buzzing energy that is hard to slow down',
  // High energy, pleasant
  excited: 'looking forward to something, full of energy for it',
  joyful: 'a bright, light happiness',
  proud: 'pleased with something you did or who you are',
  energised: 'awake and ready to go',
  hopeful: 'expecting that something good can happen',
  playful: 'light, curious and in the mood for fun',
  inspired: 'full of ideas and wanting to make something of them',
  focused: 'your attention is where you want it',
  confident: 'sure you can handle what is in front of you',
  cheerful: 'in good spirits, easy to smile',
  curious: 'wanting to find out more',
  motivated: 'wanting to get going and do the thing',
  // Low energy, unpleasant
  tired: 'low on energy; the body and mind want rest',
  sad: 'a heavy, quiet feeling of loss or missing something',
  flat: 'not much feeling either way; things seem dull',
  lonely: 'wishing for closeness or company',
  drained: 'used up, as if your energy was poured out',
  'let down': 'something or someone did not turn out as you hoped',
  bored: 'nothing holds your interest right now',
  down: 'lower than usual, a bit grey',
  heavy: 'everything takes more effort than usual',
  discouraged: 'less sure it is worth another go',
  weary: 'tired in a long, slow way',
  homesick: 'missing a place or the people you belong with',
  // Low energy, pleasant
  calm: 'quiet inside, nothing pulling at you',
  content: 'satisfied with things as they are',
  relaxed: 'loose and at rest, nothing rushing you',
  grateful: 'thankful for something or someone',
  peaceful: 'still and settled',
  cosy: 'warm, safe and comfortable where you are',
  'at ease': 'comfortable, nothing to prove',
  rested: 'your energy has come back after rest',
  balanced: 'steady; the parts of your day feel in proportion',
  gentle: 'soft and kind, with yourself and others',
  thoughtful: 'quietly turning something over in your mind',
  safe: 'protected; nothing to guard against right now',
};
/** The plain line for a built-in word, or null. */
export const meaningOf = (word: string): string | null => MEANINGS[word] ?? null;

export const OWN_MEANING_MAX = 120, MAX_OWN_MEANINGS = 48;
const PLAIN = /^[^\u0000-\u001f\u007f]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** The person's own lines for their own words, as this build reads them. */
export function ownMeanings(energy: unknown): Record<string, string> {
  const c = isObj(energy) && isObj(energy.checkin) ? energy.checkin : {}, m = isObj(c.ownMeanings) ? c.ownMeanings : {}, out: Record<string, string> = {};
  for (const [w, line] of Object.entries(m)) if (w !== '__proto__' && w.length <= 32 && typeof line === 'string' && line.trim() && line.length <= OWN_MEANING_MAX && PLAIN.test(line)) out[w] = line.trim();
  return out;
}
/** Sets (or, empty, clears) the own line of an own word; a built-in word keeps its written line. */
export function setOwnMeaning<T extends object>(energy: T, word: string, line: string): T {
  const w = word.trim();
  if (!w || w.length > 32) throw new Error('Choose one of your own words.');
  if (quadrantOfWord(w)) throw new Error('This word already has its line; your own line goes with your own words.');
  const t = line.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > OWN_MEANING_MAX) throw new Error(`Use up to ${OWN_MEANING_MAX} characters.`);
  const e = energy as T & {checkin?: unknown}, c: Record<string, unknown> = isObj(e.checkin) ? {...e.checkin} : {};
  const m: Record<string, unknown> = isObj(c.ownMeanings) ? {...c.ownMeanings} : {};
  if (t) { if (!(w in m) && Object.keys(m).length >= MAX_OWN_MEANINGS) throw new Error(`Up to ${MAX_OWN_MEANINGS} lines of your own.`); m[w] = t; } else delete m[w];
  if (Object.keys(m).length) c.ownMeanings = m; else delete c.ownMeanings;
  const {checkin: _drop, ...rest} = e; void _drop;
  return (Object.keys(c).length ? {...rest, checkin: c} : rest) as T;
}
