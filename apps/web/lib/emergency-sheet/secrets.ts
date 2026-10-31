/**
 * Session AK (lane M, item 17): a guard that keeps keys and recovery words off the emergency sheet. Without a word
 * list (no dependency), it uses shapes: twelve or more short lowercase words in a row (recovery words are 3 to 8
 * letters, written with spaces, commas, new lines or numbers between them), 64 hexadecimal characters (a raw private
 * key), an extended private key (xprv, yprv, zprv, tprv…), a WIF private key, and a PEM "PRIVATE KEY" block. A public
 * address never has these shapes, except on networks whose addresses are also 64 hexadecimal characters; the sheet
 * then refuses too and says why (it errs on the side of not printing). Plain matching only; the text is never sent.
 */
export type SecretKind = 'recovery-words' | 'hex-key' | 'extended-private-key' | 'wif' | 'pem';
export type SecretFinding = {field: string; kind: SecretKind};
export const SECRET_REASONS: Record<SecretKind, string> = {
  'recovery-words': 'looks like recovery words (12 or more short words in a row)',
  'hex-key': 'looks like a private key (64 hexadecimal characters)',
  'extended-private-key': 'looks like an extended private key (it starts with xprv, yprv, zprv or tprv)',
  wif: 'looks like a private key in wallet import format',
  pem: 'contains a private key block',
};
/** Words that are never recovery words and are common in a note, so a written sentence is not mistaken for them. */
const NOT_RECOVERY = new Set(['the', 'and', 'are', 'was', 'with', 'his', 'her', 'for', 'from', 'not', 'but', 'she', 'him', 'our', 'its', 'has', 'had', 'were', 'been', 'who', 'which', 'would', 'could', 'should', 'than', 'them', 'these', 'those', 'here', 'your', 'mine', 'yours', 'ours', 'papers', 'kept', 'bank', 'drawer', 'folder']);
/** For the unit test that checks them against the standard word list. */
export const NOT_RECOVERY_WORDS_FOR_TEST: readonly string[] = [...NOT_RECOVERY];
export const RUN = 12;
function longestWordRun(text: string): number {
  let run = 0, best = 0;
  for (const raw of text.toLowerCase().split(/[\s,;|/]+/)) {
    if (!raw) continue;
    if (/^\(?\d{1,2}[.):-]?$/.test(raw)) continue; // "1." "2)" "(3)" numbering between the words
    const word = raw.replace(/^\d{1,2}[.):-]/, '');
    if (/^[a-z]{3,8}$/.test(word) && !NOT_RECOVERY.has(word)) { run++; if (run > best) best = run; } else run = 0;
  }
  return best;
}
const B58 = '1-9A-HJ-NP-Za-km-z';
const HEX64 = /(?:^|[^0-9a-fA-F])(?:0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/;
const XPRV = new RegExp(`(?:^|[^${B58}])[xyztuvYZUV]prv[${B58}]{100,}`);
const WIF = new RegExp(`(?:^|[^${B58}])[5KLc9][${B58}]{50,51}(?![${B58}])`);
const PEM = /BEGIN [A-Z ]*PRIVATE KEY/;
/** What a text looks like it holds, if anything. */
export function secretKinds(text: string): SecretKind[] {
  const out: SecretKind[] = [];
  if (!text) return out;
  if (longestWordRun(text) >= RUN) out.push('recovery-words');
  if (HEX64.test(text)) out.push('hex-key');
  if (XPRV.test(text)) out.push('extended-private-key');
  if (WIF.test(text)) out.push('wif');
  if (PEM.test(text)) out.push('pem');
  return out;
}
/** Every field (label → text) checked; one finding per field and kind. */
export function findSecrets(fields: readonly (readonly [string, string | undefined])[]): SecretFinding[] {
  return fields.flatMap(([field, text]) => secretKinds(text ?? '').map(kind => ({field, kind})));
}
export const findingText = (f: SecretFinding) => `${f.field} ${SECRET_REASONS[f.kind]}.`;
