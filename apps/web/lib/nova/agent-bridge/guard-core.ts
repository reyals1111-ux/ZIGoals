import {cardNumberIn, guardTopic} from '../../ai/safety-guard';
import {looksSecret} from '../../secret-guard/guard';

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
/** The first rule the arguments break, or null. */
export function guardAlways(args: Record<string, unknown>): AlwaysReason | null {
  const all = leaves(args), texts = all.flatMap(l => typeof l.value === 'string' ? [l.value] : []), joined = texts.join('\n');
  if (looksSecret(joined) || texts.some(t => looksSecret(t))) return 'secret';
  if (cardNumberIn(joined)) return 'card';
  for (const text of [...texts, joined]) { const topic = guardTopic(text); if (topic === 'secret') return 'secret'; if (topic === 'credential') return 'credential'; }
  if (TOKEN_SHAPED.some(p => p.test(joined))) return 'credential';
  if (all.some(l => CREDENTIAL_KEY.test(snake(l.key)) && !PAGING_KEY.test(snake(l.key)) && l.value !== null && l.value !== false && String(l.value).trim() !== '')) return 'credential';
  return null;
}
