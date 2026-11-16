import {cardNumberIn, guardTopic} from '../../ai/safety-guard';
import {looksSecret} from '../../secret-guard/guard';
import {hasInvisible, stripInvisible} from '../invisible';

/**
 * Session AM-2 (step 4c, item 3): the part of the arguments guard that holds for every call, whoever filled it in —
 * without the redaction module, so the lookup in ZIGi's tool registry (lib/ai/tools/nova-agent.ts) can run it too. The
 * privacy modes and the card's notes are in ./guard.ts, which runs this first. Pure.
 *
 * Refused, always:
 * - recovery words and private keys (lib/secret-guard, the detector the chat's composer uses);
 * - what the safety guard reads as a secret or a credential asked for, offered or stored (lib/ai/safety-guard.ts topics
 *   `secret` and `credential`: a seed phrase, a password, a PIN with its digits, an API key);
 * - a payment card number (the guard's own Luhn check);
 * - anything shaped like a token or key, and a field whose NAME asks for one (password, token, api_key, secret …) with a
 *   value. NOVA never hands a credential to a tool: a tool acts with its OWN accounts, set up on the person's computer.
 */
export type AlwaysReason = 'secret' | 'credential' | 'card';
export const ALWAYS_WORDS: Readonly<Record<AlwaysReason, string>> = {
  secret: 'Not shown as a card: the arguments look like recovery words, a private key, a password or a PIN. NOVA never gives one to a tool, and nobody helping you should ask for it.',
  credential: 'Not shown as a card: the arguments hold, or ask for, a password, a key or a token. A tool on your computer acts with its own accounts, set up there; NOVA never hands it a credential.',
  card: 'Not shown as a card: the arguments look like a payment card number. NOVA never gives one to a tool.',
};
const CREDENTIAL_KEY = /(?:^|[_.-])(?:pass(?:word|wd|phrase|code)?|pwd|secret|token|api[_.-]?key|apikey|private[_.-]?key|mnemonic|credentials?|authorization|cookie|session[_.-]?id)(?:$|[_.-])/i;
/** A paging mark is not a credential ("page_token", "next_token"). */
const PAGING_KEY = /(?:^|[_.-])(?:page|next|prev|previous|continuation|sync)[_.-]?token$/i;
/** "apiKey" and "accessToken" read as "api_Key" and "access_Token". */
const snake = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
const TOKEN_SHAPED: readonly RegExp[] = [
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}/i, /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}/,
  /\b(?:sk|pk|rk|ghp|gho|ghu|ghs|github_pat|xox[abprs]|glpat)[-_][A-Za-z0-9_-]{16,}/, /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
export type Leaf = {path: string; key: string; value: string | number | boolean | null};
export function leaves(value: unknown, path = '', key = '', out: Leaf[] = []): Leaf[] {
  if (out.length > 400) return out;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') { out.push({path, key, value}); return out; }
  if (Array.isArray(value)) { value.forEach((item, i) => leaves(item, `${path}[${i + 1}]`, key, out)); return out; }
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, path ? `${path}.${k}` : k, k, out);
  return out;
}
/** Every field NAME of a call, at every nesting level (bounded). */
export function keyNames(value: unknown, out: string[] = []): string[] {
  if (out.length > 400 || !value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const item of value) keyNames(item, out); return out; }
  for (const [k, v] of Object.entries(value)) { out.push(k); keyNames(v, out); }
  return out;
}
/** A field name as words: "weight_82.4kg" → "weight 82.4kg", "apiKey" → "api Key". */
export const keyWords = (key: string): string => snake(stripInvisible(key)).replace(/[_\-]+|\.(?!\d)/g, ' ').trim();
/** Whether any field name or text value holds a character a person cannot see (lib/nova/invisible.ts). */
export function argsHaveInvisible(args: unknown): boolean {
  return keyNames(args).some(hasInvisible) || leaves(args).some(l => typeof l.value === 'string' && hasInvisible(l.value));
}
/** The arguments with every invisible character taken out of every text value (the person's own hand-typed call, before its card is built). */
export function stripArgs<T>(value: T): T {
  if (typeof value === 'string') return stripInvisible(value) as T;
  if (Array.isArray(value)) return value.map(item => stripArgs(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripArgs(v)])) as T;
  return value;
}
/**
 * The first rule the arguments break, or null. Security review: the field NAMES are read as well as the values (finding
 * 1: twelve recovery words as twelve names, a card number in a name), and every check reads the text without its
 * invisible characters (finding 2: a soft hyphen inside each recovery word).
 */
export function guardAlways(args: Record<string, unknown>): AlwaysReason | null {
  const all = leaves(args), values = all.flatMap(l => typeof l.value === 'string' ? [stripInvisible(l.value)] : []), joined = values.join('\n');
  const names = keyNames(args).map(k => stripInvisible(k)), words = names.map(keyWords), nameText = words.join(' ');
  // What looks like a secret or a card number is looked for in the values, in the names, and in both together.
  if ([...values, ...words, joined, nameText, `${nameText}\n${joined}`].some(t => looksSecret(t))) return 'secret';
  if (cardNumberIn(joined) || cardNumberIn(nameText) || cardNumberIn(names.join(' '))) return 'card';
  // What is said ABOUT a secret ("my password is …") is read in the values; a field's name is judged by the rule below.
  for (const text of [...values, joined]) { const topic = guardTopic(text); if (topic === 'secret') return 'secret'; if (topic === 'credential') return 'credential'; }
  if (TOKEN_SHAPED.some(p => p.test(joined) || names.some(n => p.test(n)))) return 'credential';
  if (all.some(l => CREDENTIAL_KEY.test(snake(l.key)) && !PAGING_KEY.test(snake(l.key)) && l.value !== null && l.value !== false && String(l.value).trim() !== '')) return 'credential';
  return null;
}
