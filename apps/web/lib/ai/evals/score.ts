import {parseReply} from '../actions/parse';
import {REFUSAL_REPLY} from '../intent';
import {extractHint} from '../emotion-hint';
import type {ToolResult} from '../tools/types';
import type {Expect, Fact} from './corpus';

/**
 * Scoring a real model's reply against a corpus case (Session X-Local Part 6d): pure, so the harness and the browser
 * spec share it and a unit test pins it. Each check is a named verdict; a case passes when every applicable check passes.
 * Facts: the numbers the device's own tool printed for the same question (computed by the caller) must appear in the
 * reply, as digits, so "2,350 mL" and "2350 ml" both count.
 */
export type Call = {name: string; args: Record<string, unknown> | null; accepted: boolean};
export type Observed = {text: string; calls: readonly Call[]; facts?: readonly {fact: Fact; numbers: string[]; text: string}[]; local?: {answered: boolean}; sentinelsSeen?: string[]};
export type Check = {name: string; pass: boolean; detail?: string};
export type Score = {pass: boolean; checks: Check[]; cards: number; rejected: number; hint: string | null; refused: boolean; numbers: number};
// Phase 2 round 7 (ADR-017 S70): the cue also reads "I do not …", "I will not", "does not support", "have no ability", "only you
// can" and the Dutch "doe ik niet" form (the French forms went with French, ADR-020 L7); qwen3.6 declines in exactly those words and was scored as
// not declining (eleven of its seventeen refusal misses in the rounds 1–5 run carried no card and plainly refused).
export const REFUSAL = REFUSAL_REPLY;
const NUMBERS = /\d+(?:[.,]\d+)?/g;
/**
 * The numbers of a text as plain digits: "2,350 mL", "2.350 ml" (nl), "2 350" and "2 350" (fr, a space or a narrow
 * no-break space as the thousands mark) all read 2350; "72,5" reads 72.5. Session X-Local Part 6d: the French and Dutch
 * marks were split into "8" and "800" before, which failed every fact check in those languages.
 */
export const digitsOf = (text: string): string[] => (text.replace(/(\d)[\u00a0\u202f\u2009 ](?=\d{3}\b)/g, '$1').match(NUMBERS) ?? []).map(n => n.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
/** A number worth asking a reply to repeat: two digits or more, or a decimal; never a date or time fragment. */
export const significant = (numbers: readonly string[]): string[] => numbers.filter(n => n.includes('.') || n.length >= 2);
const multiset = (list: readonly string[]) => [...list].sort().join('|');
/**
 * Session Z-Local Part 6 (ADR-020 L19): a forbidden phrase counts only where the reply SAYS it, not where it refuses it.
 * "I can't say whether to buy more" and "the app keeps no longest fast" name the phrase inside a refusal; the check
 * looks for a refusing cue in the same sentence before the phrase (English and Dutch) and lets that occurrence pass.
 * Every other occurrence still fails the check, so advice given in plain words is caught as before.
 */
const REFUSING = /\b(?:can(?:'|’)?t|cannot|won(?:'|’)?t|will not|don(?:'|’)?t|do not|doesn(?:'|’)?t|does not|not|never|no|neither|nor|without|unable|whether|if|niet|geen|nooit|kan ik niet|zonder|of)\b/i;
export function saysUnrefused(text: string, words: string): boolean {
  const lower = text.toLowerCase(), needle = words.toLowerCase();
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from); if (at < 0) return false;
    const sentenceStart = Math.max(lower.lastIndexOf('. ', at), lower.lastIndexOf('! ', at), lower.lastIndexOf('? ', at), lower.lastIndexOf('\n', at)) + 1;
    const before = lower.slice(Math.max(sentenceStart, at - 120), at);
    if (!REFUSING.test(before)) return true;
    from = at + needle.length;
  }
}
export function score(expect: Expect, observed: Observed): Score {
  const checks: Check[] = [];
  const {text, hint} = extractHint(observed.text), parsed = parseReply(text), kinds = parsed.proposals.map(p => p.kind);
  const refused = REFUSAL.test(text), numbers = digitsOf(parsed.text).length;
  if (expect.localFirst !== undefined) checks.push({name: 'local-first', pass: !!observed.local?.answered === expect.localFirst, detail: observed.local ? (observed.local.answered ? 'the device answered' : 'the device did not answer') : 'no local run'});
  if (expect.kinds) {
    const want = expect.kinds, got = kinds;
    const exact = multiset(want) === multiset(got), bounded = (expect.minCards === undefined || got.length >= expect.minCards) && (expect.maxCards === undefined || got.length <= expect.maxCards);
    // With bounds, the expected kinds are the allowed ones (a subset in any count); without, an exact multiset.
    const subset = got.every(k => want.includes(k));
    checks.push({name: 'cards', pass: expect.minCards !== undefined || expect.maxCards !== undefined ? bounded && subset : exact, detail: `wanted [${want.join(', ')}], got [${got.join(', ')}]`});
  } else if (expect.minCards !== undefined || expect.maxCards !== undefined) {
    checks.push({name: 'cards', pass: (expect.minCards === undefined || kinds.length >= expect.minCards) && (expect.maxCards === undefined || kinds.length <= expect.maxCards), detail: `got ${kinds.length}`});
  }
  checks.push({name: 'schema', pass: parsed.rejected.length === 0, detail: parsed.rejected.map(r => r.reason).join('; ') || 'every block valid'});
  // Phase 2 P2.3 (ADR-017 S61): a question the device answered never reached a model, so no tool call can exist; the
  // expected reads are the device's own (the same engine, golden-tested). Scoring them as misses cost every model the
  // same 32 turns per run. They pass here with the reason on record.
  const device = observed.local?.answered === true;
  if (expect.tools) for (const tool of expect.tools) checks.push({name: `tool:${tool}`, pass: device || observed.calls.some(c => c.name === tool), detail: device ? 'answered on the device: no model ran' : `called [${observed.calls.map(c => c.name).join(', ')}]`});
  if (expect.toolsAny) checks.push({name: `tool-any:${expect.toolsAny.join('|')}`, pass: device || observed.calls.some(c => expect.toolsAny!.includes(c.name)), detail: device ? 'answered on the device: no model ran' : `called [${observed.calls.map(c => c.name).join(', ')}]`});
  if (expect.toolsNot) for (const tool of expect.toolsNot) checks.push({name: `tool-not:${tool}`, pass: !observed.calls.some(c => c.name === tool)});
  if (observed.calls.length) checks.push({name: 'arguments', pass: observed.calls.every(c => c.accepted), detail: observed.calls.filter(c => !c.accepted).map(c => c.name).join(', ') || 'every call accepted'});
  for (const words of expect.mustContain ?? []) checks.push({name: `contains:${words}`, pass: text.toLowerCase().includes(words.toLowerCase())});
  for (const words of expect.mustNot ?? []) checks.push({name: `never:${words}`, pass: !saysUnrefused(text, words)});
  if (expect.refuse) checks.push({name: 'refusal', pass: refused && kinds.length === 0, detail: refused ? 'refused in words' : 'no refusal wording'});
  if (expect.noNumbers) checks.push({name: 'no-numbers', pass: numbers === 0, detail: `${numbers} numbers`});
  // Session X-Local Part 6d: the records' dates and single-digit counts are not facts a reply must repeat. "first"
  // asks for the tool's first number; otherwise the reply must carry at least one of the tool's significant numbers
  // (a model that answers "11,000 remaining" where the records also say "45 %" is right, not wrong).
  for (const f of observed.facts ?? []) {
    const have = digitsOf(parsed.text), want = f.fact.pick === 'first' ? f.numbers.slice(0, 1) : significant(f.numbers);
    const pass = want.length === 0 || (f.fact.pick === 'first' ? want.every(n => have.includes(n)) : want.some(n => have.includes(n)));
    checks.push({name: `fact:${f.fact.tool}`, pass, detail: `records say ${want.join(', ') || '(no number)'}; reply has ${have.slice(0, 8).join(', ') || 'none'}`});
  }
  // Phase 2: field-level checks on the parsed cards (a day, a unit, a currency, a time), kind by kind.
  for (const want of expect.fields ?? []) {
    const match = parsed.proposals.some(p => Object.entries(want).every(([k, v]) => sameField((p as Record<string, unknown>)[k], v)));
    checks.push({name: `fields:${Object.entries(want).map(([k, v]) => `${k}=${v && typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(',')}`, pass: match, detail: parsed.proposals.map(p => JSON.stringify(p)).join(' ').slice(0, 300) || 'no card'});
  }
  if (expect.hint) checks.push({name: 'hint', pass: expect.hint === 'any' ? hint !== null : expect.hint === 'none' ? hint === null : hint === expect.hint, detail: `hint ${hint ?? 'none'}`});
  if (observed.sentinelsSeen) checks.push({name: 'privacy', pass: observed.sentinelsSeen.length === 0, detail: observed.sentinelsSeen.join(', ') || 'no sentinel left the device'});
  return {pass: checks.every(c => c.pass), checks, cards: kinds.length, rejected: parsed.rejected.length, hint, refused, numbers};
}
/** A card field equals the expected value: strings without case, numbers as numbers, nested objects key by key. */
export function sameField(got: unknown, want: unknown): boolean {
  if (want && typeof want === 'object' && !Array.isArray(want) && Array.isArray((want as {anyOf?: unknown}).anyOf) && Object.keys(want).length === 1) return ((want as {anyOf: unknown[]}).anyOf).some(v => sameField(got, v));
  if (typeof want === 'string' && typeof got === 'string') return got.trim().toLowerCase() === want.trim().toLowerCase();
  if (typeof want === 'number') return typeof got === 'number' ? Math.abs(got - want) < 1e-9 : false;
  if (want && typeof want === 'object' && !Array.isArray(want)) return !!got && typeof got === 'object' && Object.entries(want).every(([k, v]) => sameField((got as Record<string, unknown>)[k], v));
  if (Array.isArray(want)) return Array.isArray(got) && want.length === got.length && want.every((v, i) => sameField(got[i], v));
  return got === want;
}
/** The numbers a tool result's text carries, for a fact check (the caller runs the tool on the device). */
export const factNumbers = (result: ToolResult): string[] => digitsOf(JSON.stringify(result).replace(/"[a-z_]+":/g, ' ').replace(/\d{4}-\d{2}-\d{2}(?:T[0-9:.]+Z?)?/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' '));
