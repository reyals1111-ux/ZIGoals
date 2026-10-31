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
function longestWordRun(text: string): number {
  const normal = text.normalize('NFC');
  let run = 0, best = 0, style: Style = 'free', previousNumber = true, end = 0;
  for (const match of normal.matchAll(/[\p{L}\d]+/gu)) {
    const token = match[0], between = normal.slice(end, match.index);
    end = match.index + token.length;
    if (/^\d+$/.test(token)) { previousNumber = true; continue; }
    const word = token.toLowerCase(), wordStyle = styleOf(token, previousNumber || between.includes('\n'));
    previousNumber = false;
    if (!wordStyle || !/^\p{Ll}{3,8}$/u.test(word) || NOT_RECOVERY.has(word)) { run = 0; style = 'free'; continue; }
    const fits = wordStyle === 'free' ? style !== 'upper' : style === 'free' ? true : wordStyle === style;
    if (fits) { run++; if (wordStyle !== 'free' && style === 'free') style = wordStyle; } else { run = 1; style = wordStyle; }
    if (run > best) best = run;
  }
  return best;
}
/**
 * A 64-character key written in groups ("e9873d79 c6d87dc0 …", "e9:87:3d…", "e987-3d79…", or across two lines): the
 * groups of hexadecimal characters between spaces, colons and hyphens, any consecutive ones of which add up to exactly
 * 64 characters with both digits and letters among them (a date or a phone number has no letters a–f; a word has no digits).
 */
function groupedHexKey(text: string): boolean {
  for (const block of text.match(/[0-9a-fA-F]+(?:[\s:-]+[0-9a-fA-F]+)+/g) ?? []) {
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
export function secretKinds(text: string): SecretKind[] {
  const out: SecretKind[] = [];
  if (!text) return out;
  if (longestWordRun(text) >= RUN) out.push('recovery-words');
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
