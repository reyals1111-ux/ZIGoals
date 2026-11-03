import {listKey, wordListsFor, type WordScript} from '../secret-guard/word-lists';

/**
 * Session AK (lane M, item 17): a guard that keeps keys and recovery words off the emergency sheet. Without a word
 * list (no dependency), it uses shapes: twelve or more short lowercase words in a row (recovery words are 3 to 8
 * letters, written with spaces, commas, new lines or numbers between them), 64 hexadecimal characters (a raw private
 * key), an extended private key (xprv, yprv, zprv, tprv…), a WIF private key, and a PEM "PRIVATE KEY" block. A public
 * address never has these shapes, except on networks whose addresses are also 64 hexadecimal characters; the sheet
 * then refuses too and says why (it errs on the side of not printing). Plain matching only; the text is never sent.
 * Session AK Part 15 (F2): also keys written in groups, long base58 secrets, nsec1 and AGE-SECRET-KEY-1 keys and lists
 * of 32 or 64 bytes, and every field read together as well as each one.
 */
export type SecretKind = 'recovery-words' | 'hex-key' | 'extended-private-key' | 'wif' | 'pem' | 'base58-key' | 'nsec' | 'age-key' | 'byte-array';
export type SecretFinding = {field: string; kind: SecretKind};
export const SECRET_REASONS: Record<SecretKind, string> = {
  'recovery-words': 'looks like recovery words (12 or more short words in a row)',
  'hex-key': 'looks like a private key (64 hexadecimal characters)',
  'extended-private-key': 'looks like an extended private key (it starts with xprv, yprv, zprv or tprv)',
  wif: 'looks like a private key in wallet import format',
  pem: 'contains a private key block',
  'base58-key': 'looks like a private key (one long run of 85 to 90 letters and digits)',
  nsec: 'looks like a private key (it starts with nsec1)',
  'age-key': 'looks like a private key (it starts with AGE-SECRET-KEY-1)',
  'byte-array': 'looks like a private key written as a list of 32 or 64 numbers',
};
/** Words that are never recovery words and are common in a note, so a written sentence is not mistaken for them. */
const NOT_RECOVERY = new Set(['the', 'and', 'are', 'was', 'with', 'his', 'her', 'for', 'from', 'not', 'but', 'she', 'him', 'our', 'its', 'has', 'had', 'were', 'been', 'who', 'which', 'would', 'could', 'should', 'than', 'them', 'these', 'those', 'here', 'your', 'mine', 'yours', 'ours', 'papers', 'kept', 'bank', 'drawer', 'folder']);
/** For the unit test that checks them against the standard word list. */
export const NOT_RECOVERY_WORDS_FOR_TEST: readonly string[] = [...NOT_RECOVERY];
export const RUN = 12;
/**
 * Session AK Part 15 (F2): the words are whatever letters stand between any other characters (spaces, commas, dots,
 * hyphens, bullets, quotes, brackets), in any alphabet (other languages' word lists have accents). Numbers ("1.", "#1",
 * "(1)", "001") are skipped and do not end the run; a longer word, a word of one or two letters, a word with digits in
 * it or a common note word does. Recovery words are written in one style — all lowercase, all capitals or each word
 * capitalised — so a change of style ends the run too ("Example Bank about EUR", or a capital after a full stop: an
 * ordinary sentence). A capital at the start of a line or right after a number is no change (phones capitalise there).
 */
type Style = 'lower' | 'upper' | 'title' | 'free';
function styleOf(word: string, free: boolean): Style | null {
  if (word === word.toLowerCase()) return 'lower';
  if (word === word.toUpperCase()) return 'upper';
  if (word[0] === word[0]!.toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) return free ? 'free' : 'title';
  return null;
}
/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F5, R1-F6): the words come in runs of one script. Latin-style
 * words follow the rules above. Japanese (hiragana), Korean (Hangul) and Chinese (one character per word) recovery words
 * are written with spaces (ASCII or ideographic) or the same separators and numbers between them: a run is twelve or more
 * such words in a row. Ordinary CJK prose is not written that way (Chinese and Japanese run their characters together,
 * which makes one long token here; Korean words carry their endings, which the Korean list does not have), and once the
 * standard lists are loaded (lib/secret-guard/word-lists.ts) a run counts only when 11 of 12 words in a row are words of
 * one list. Until then: Chinese and Japanese runs count by their shape; a Korean run counts by shape only for the guard
 * (cautious), never on the emergency sheet (Korean prose has spaces between words).
 */
type Word = {key: string; start: number; end: number};
type Segment = {script: WordScript; words: Word[]};
const TOKEN = /[\p{L}\p{M}\d]+/gu;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
function scriptOf(token: string): WordScript | null {
  if (!CJK.test(token)) return 'latin';
  if (/^\p{Script=Han}$/u.test(token)) return 'han';
  if (/^[\u3041-\u309f\u30fc]+$/u.test(token)) return 'kana';
  if (/^[\uac00-\ud7a3]+$/u.test(token)) return 'hangul';
  return null;
}
/** A list word is at most 9 letters (Italian); without the lists, recovery words are 3 to 8 lowercase letters. */
const SHAPE_WORD = /^\p{Ll}{3,8}$/u, LIST_WORD = /^\p{Ll}{3,9}$/u;
function wordSegments(text: string, latinLists: readonly ReadonlySet<string>[] | null): Segment[] {
  const out: Segment[] = [];
  let seg = null as Segment | null, style: Style = 'free', previousNumber = true, end = 0;
  const close = () => { if (seg?.words.length) out.push(seg); seg = null; };
  const isLatinWord = (word: string) => SHAPE_WORD.test(word) || (!!latinLists && LIST_WORD.test(word) && latinLists.some(list => list.has(listKey(word))));
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index, token = match[0].normalize('NFC'), between = text.slice(end, start);
    end = start + match[0].length;
    if (/^\d+$/.test(token)) { previousNumber = true; continue; }
    const script = scriptOf(token);
    if (script !== 'latin') {
      previousNumber = false; style = 'free';
      if (!script) { close(); continue; }
      if (seg?.script !== script) { close(); seg = {script, words: []}; }
      seg.words.push({key: listKey(token), start, end});
      continue;
    }
    const word = token.toLowerCase(), wordStyle = styleOf(token, previousNumber || between.includes('\n'));
    previousNumber = false;
    if (!wordStyle || !isLatinWord(word) || NOT_RECOVERY.has(word)) { close(); style = 'free'; continue; }
    if (seg?.script !== 'latin') { close(); seg = {script: 'latin', words: []}; style = 'free'; }
    const fits = wordStyle === 'free' ? style !== 'upper' : style === 'free' ? true : wordStyle === style;
    if (fits) { if (wordStyle !== 'free' && style === 'free') style = wordStyle; } else { close(); seg = {script: 'latin', words: []}; style = wordStyle; }
    seg!.words.push({key: listKey(word), start, end});
  }
  close();
  return out;
}
/** Of 12 words in a row, at least this many from one standard list make a run recovery words (one may be mistyped). */
export const LIST_SHARE = 11;
/**
 * The parts of a run where 11 of 12 words in a row come from one list, every such window (so a mistyped word inside a
 * 24-word phrase never leaves part of it out), trimmed to list words at both ends. A neighbouring list word may join.
 */
function listSpans(words: readonly Word[], sets: readonly ReadonlySet<string>[]): [number, number][] {
  const marked = new Set<number>(), member = new Set<number>();
  for (const set of sets) {
    const is = words.map(w => set.has(w.key));
    let count = 0;
    for (let i = 0; i < words.length; i++) {
      if (is[i]) count++;
      if (i >= RUN && is[i - RUN]) count--;
      if (i >= RUN - 1 && count >= LIST_SHARE) for (let j = i - RUN + 1; j <= i; j++) { marked.add(j); if (is[j]) member.add(j); }
    }
  }
  const spans: [number, number][] = [];
  for (let i = 0; i < words.length; i++) {
    if (!marked.has(i)) continue;
    let j = i; while (marked.has(j + 1)) j++;
    let a = i, b = j; while (a < b && !member.has(a)) a++; while (b > a && !member.has(b)) b--;
    spans.push([words[a]!.start, words[b]!.end]);
    i = j;
  }
  return spans;
}
/**
 * 'sheet' (the emergency sheet, NOVA's redaction): Latin words by their shape, as since lane M; CJK by the lists when
 * loaded, else Chinese and Japanese by shape. 'guard' (the recovery-words guard, ZIGi): every script by the lists when
 * loaded (fewer ordinary lists warned about), else by shape, Korean included (cautious until its list is here).
 */
export type WordMode = 'sheet' | 'guard';
/** Where the text holds runs that look like recovery words: [start, end) offsets into the text as given. */
export function recoveryWordSpans(text: string, mode: WordMode = 'sheet'): [number, number][] {
  if (!text) return [];
  const latin = mode === 'guard' ? wordListsFor('latin') : null;
  const spans: [number, number][] = [];
  for (const {script, words} of wordSegments(text, latin)) {
    if (words.length < RUN) continue;
    const sets = script === 'latin' ? latin : wordListsFor(script);
    if (sets) spans.push(...listSpans(words, sets));
    else if (script !== 'hangul' || mode === 'guard') spans.push([words[0]!.start, words[words.length - 1]!.end]);
  }
  return spans.sort((a, b) => a[0] - b[0]);
}
/**
 * The scripts whose lists would make a decision about this text more exact and are not loaded yet: a run of twelve or
 * more words in that script is there. The guard loads them (lib/secret-guard/guard.ts); empty for ordinary text.
 */
export function wordListNeeds(text: string): WordScript[] {
  if (!text) return [];
  const needs = new Set<WordScript>();
  for (const {script, words} of wordSegments(text, null)) if (words.length >= RUN && !wordListsFor(script)) needs.add(script);
  return [...needs];
}
/**
 * A 64-character key written in groups ("e9873d79 c6d87dc0 …", "e9:87:3d…", "e987-3d79…", or across two lines): the
 * groups of hexadecimal characters between spaces, colons and hyphens, any consecutive ones of which add up to exactly
 * 64 characters with both digits and letters among them (a date or a phone number has no letters a–f; a word has no digits).
 */
/**
 * The blocks of hex groups. A block starts only where a hex run starts (the lookbehind): without it a long unbroken run
 * was tried from each of its characters, quadratic (80,000 characters took 5 s, Z1B-8). The matches are the same: a
 * match can only begin at the start of its run, since its first group must reach the run's end.
 */
export const HEX_GROUPS = /(?<![0-9a-fA-F])[0-9a-fA-F]+(?:[\s:-]+[0-9a-fA-F]+)+/g;
function groupedHexKey(text: string): boolean {
  for (const block of text.match(HEX_GROUPS) ?? []) {
    const groups = block.split(/[\s:-]+/);
    let from = 0, length = 0;
    for (let to = 0; to < groups.length; to++) {
      length += groups[to]!.length;
      while (length > 64) length -= groups[from++]!.length;
      if (length === 64 && to > from) {
        const key = groups.slice(from, to + 1).join('');
        if ((key.match(/\d/g)?.length ?? 0) >= 8 && (key.match(/[a-f]/gi)?.length ?? 0) >= 8) return true;
      }
    }
  }
  return false;
}
/** A key kept as a JSON list of bytes ([12, 255, …], 32 or 64 of them, each 0–255), as some wallets export a key pair. */
function byteArrayKey(text: string): boolean {
  for (const [, inner] of text.matchAll(/\[([\d\s,]{0,1200})\]/g)) {
    const items = inner!.split(',').map(item => item.trim());
    if ((items.length === 32 || items.length === 64) && items.every(item => /^\d{1,3}$/.test(item) && Number(item) <= 255)) return true;
  }
  return false;
}
const B58 = '1-9A-HJ-NP-Za-km-z';
const HEX64 = /(?:^|[^0-9a-fA-F])(?:0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/;
const XPRV = new RegExp(`(?:^|[^${B58}])[xyztuvYZUV]prv[${B58}]{100,}`);
const WIF = new RegExp(`(?:^|[^${B58}])[5KLc9][${B58}]{50,51}(?![${B58}])`);
const PEM = /BEGIN [A-Z ]*PRIVATE KEY/;
/** A 64-byte secret in base58 (87 or 88 characters, as Solana wallets export it), with a little room either side. */
const BASE58_KEY = new RegExp(`(?:^|[^${B58}])[${B58}]{85,90}(?![${B58}])`);
const NSEC = /(?:^|[^a-z0-9])nsec1[02-9ac-hj-np-z]{58}(?![a-z0-9])/i;
const AGE = /AGE-SECRET-KEY-1/i;
/** What a text looks like it holds, if anything. */
export function secretKinds(text: string, mode: WordMode = 'sheet'): SecretKind[] {
  const out: SecretKind[] = [];
  if (!text) return out;
  if (recoveryWordSpans(text, mode).length) out.push('recovery-words');
  if (HEX64.test(text) || groupedHexKey(text)) out.push('hex-key');
  if (XPRV.test(text)) out.push('extended-private-key');
  if (WIF.test(text)) out.push('wif');
  if (PEM.test(text)) out.push('pem');
  if (BASE58_KEY.test(text)) out.push('base58-key');
  if (NSEC.test(text)) out.push('nsec');
  if (AGE.test(text)) out.push('age-key');
  if (byteArrayKey(text)) out.push('byte-array');
  return out;
}
/** Where a finding comes from when no one field holds it, only several read together. */
export const ACROSS_FIELDS = 'Everything read together';
/**
 * Every field (label → text) checked; one finding per field and kind. Session AK Part 15 (F2): then all of them read
 * together, so twelve words written six and six in two fields, or a key split over two fields, are found too.
 */
export function findSecrets(fields: readonly (readonly [string, string | undefined])[]): SecretFinding[] {
  const found = fields.flatMap(([field, text]) => secretKinds(text ?? '').map(kind => ({field, kind})));
  const seen = new Set(found.map(f => f.kind));
  const together = secretKinds(fields.map(([, text]) => text ?? '').filter(Boolean).join('\n')).filter(kind => !seen.has(kind));
  return [...found, ...together.map(kind => ({field: ACROSS_FIELDS, kind}))];
}
export const findingText = (f: SecretFinding) => `${f.field} ${SECRET_REASONS[f.kind]}.`;
