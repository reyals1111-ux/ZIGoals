import {secretKinds, wordListNeeds, type SecretKind} from '../emergency-sheet/secrets';
import {GUARD_MIN_CHARS} from './min';
import {loadWordLists} from './word-lists';

/**
 * Session AK (BUILD list 2 #1, lane B2a): the recovery-words guard on the places the person types free text that is
 * stored or sent (journal, notes, goal notes, money notes, feedback, Point & tell, ZIGi's composer). It reuses the
 * emergency sheet's detector (lib/emergency-sheet/secrets.ts: twelve or more short words in a row, raw and extended
 * private keys, WIF, PEM, base58, nsec, age keys, byte lists), so what that detector lets through (ordinary sentences,
 * public addresses, IBANs, phone numbers) passes here too. Plain matching on this device only; nothing is stored and
 * nothing is sent. A note may still be saved by the person ("Save anyway" is simply saving); a ZIGi message never goes
 * to an AI provider while it looks like a secret.
 * Owner follow-up 2 (G7; security review F10 R1-F5, R1-F6): the guard reads words in the detector's 'guard' mode. Once a
 * run of twelve or more words turns up, the standard BIP39 lists for its script load on their own
 * (lib/secret-guard/word-lists.ts); from then on a run counts only when 11 of 12 words in a row are words of one list,
 * so an ordinary grocery or habit list passes, and Japanese, Korean and Chinese recovery words are found too. Until a
 * list is here the guard stays on the cautious side (it may warn about an ordinary list; it never lets words through).
 */
export type GuardKind = 'words' | 'key';
export type GuardFinding = {kind: GuardKind; kinds: SecretKind[]; line: string};

/** The shortest text any shape can match; shorter text is never checked (and never warned about). */
export {GUARD_MIN_CHARS};

export const GUARD_WORDS_LINE = 'This looks like recovery words. ZIGoals never needs them, and nobody helping you should ask for them.';
export const GUARD_KEY_LINE = 'This looks like a private key. ZIGoals never needs it, and nobody helping you should ask for it.';
/** What ZIGi says instead of sending: the title and steps of the chat's failure card. */
export const ZIGI_SECRET_TITLE = 'Not sent: this looks like recovery words or a private key.';
export const ZIGI_SECRET_STEPS: readonly string[] = [
  'ZIGi never sends recovery words or keys to an AI. Remove them and ask again.',
  'ZIGoals never needs them, and nobody helping you should ask for them.',
];

/** A cheap first look, so the detector (and its lazily loaded line) only runs on text long enough to hold a secret. */
export const mayHoldSecret = (text: string | null | undefined): boolean => !!text && text.length >= GUARD_MIN_CHARS;

/** What the text looks like it holds, or null for ordinary text. */
export function guardText(text: string | null | undefined): GuardFinding | null {
  if (!mayHoldSecret(text)) return null;
  const needs = wordListNeeds(text!);
  if (needs.length) void loadWordLists(needs);
  const kinds = secretKinds(text!, 'guard');
  if (!kinds.length) return null;
  const kind: GuardKind = kinds.includes('recovery-words') ? 'words' : 'key';
  return {kind, kinds, line: kind === 'words' ? GUARD_WORDS_LINE : GUARD_KEY_LINE};
}
export const looksSecret = (text: string | null | undefined): boolean => guardText(text) !== null;
/**
 * The same answer, once the word lists this text needs are here (a send path that can wait a moment uses it, so an
 * ordinary list pasted and sent at once is not refused while its list is still loading). Never slower for ordinary text.
 */
export async function guardTextReady(text: string | null | undefined): Promise<GuardFinding | null> {
  if (mayHoldSecret(text)) { const needs = wordListNeeds(text!); if (needs.length) await loadWordLists(needs); }
  return guardText(text);
}
export const looksSecretReady = async (text: string | null | undefined): Promise<boolean> => (await guardTextReady(text)) !== null;

/**
 * ZIGi's transport check (defence in depth behind the composer's own check): true when any message the person wrote
 * looks like a secret. Only the person's own turns are read; the page's records travel in the system prompt and are
 * the person's saved data, which the guard does not second-guess.
 */
export function messagesHoldSecret(messages: readonly {role: string; content: string}[]): boolean {
  const own = messages.filter(m => m.role === 'user');
  // Security review F10 (R1-F4): words split across messages ("the first six, then the rest") are read together too.
  return own.some(m => looksSecret(m.content)) || (own.length > 1 && looksSecret(own.map(m => m.content).join('\n')));
}
