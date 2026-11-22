/**
 * Session AV lane 2 (r4-notes; LEDGER #312, Bear's find and replace): where words occur in a note's text (each match,
 * not overlapping, with or without case) and the text with one or every match replaced. Pure.
 */
export const MAX_MATCHES = 2000;
const fold = (s: string, matchCase: boolean) => matchCase ? s : s.toLocaleLowerCase('en-US');
/** The start of every match, left to right. Lower-casing keeps lengths for the letters notes hold (checked: a match must read back). */
export function findMatches(text: string, find: string, matchCase = false): number[] {
  if (!find) return [];
  const hay = fold(text, matchCase), needle = fold(find, matchCase), out: number[] = [];
  // Review b4g B4G-7: when lower case changes the length of the text or of the words found, each place is compared as
  // written, so a match is always `find.length` long where it is replaced.
  if (hay.length !== text.length || needle.length !== find.length) return exact(text, find, matchCase);
  for (let at = hay.indexOf(needle); at >= 0 && out.length < MAX_MATCHES; at = hay.indexOf(needle, at + needle.length)) out.push(at);
  return out;
}
/** A slower walk for text whose lower case changes its length (it compares each place as written). */
function exact(text: string, find: string, matchCase: boolean): number[] {
  const out: number[] = [], needle = fold(find, matchCase);
  for (let at = 0; at + find.length <= text.length && out.length < MAX_MATCHES; at++) if (fold(text.slice(at, at + find.length), matchCase) === needle) { out.push(at); at += find.length - 1; }
  return out;
}
export const replaceOne = (text: string, at: number, length: number, by: string) => `${text.slice(0, at)}${by}${text.slice(at + length)}`;
export function replaceAll(text: string, find: string, by: string, matchCase = false): string {
  const hits = findMatches(text, find, matchCase);
  let out = '', from = 0;
  for (const at of hits) { out += text.slice(from, at) + by; from = at + find.length; }
  return out + text.slice(from);
}
