import {redactionSummary, redactText} from '../redact';
import type {PrivacyMode} from '../setup';
import {ALWAYS_WORDS, argsHaveInvisible, guardAlways, keyNames, keyWords, leaves, type Leaf} from './guard-core';
import {plainLine} from './plain';
import {unlistedKeys, type ToolSchema} from './schema';

/**
 * Session AM-2 (step 4c, item 3): the deterministic guard on a tool call's arguments, run before a confirm card is
 * shown and again at the press. It reuses the app's own guards; it adds no model and no network. Pure.
 *
 * Always, whoever filled the card in (a model or the person by hand):
 * - no recovery words and no private key (lib/secret-guard, the detector the chat's composer uses);
 * - nothing the safety guard reads as a secret or a credential asked for, offered or stored (lib/ai/safety-guard.ts
 *   topics `secret` and `credential`: a seed phrase, a password, a PIN with its digits, an API key);
 * - no payment card number (the guard's own Luhn check);
 * - nothing shaped like a token or key, and no field whose NAME asks for one (password, token, api_key, secret …) with a
 *   value: NOVA never hands a credential to a tool. A tool acts with its OWN accounts, set up on the person's computer.
 *
 * For a call a model proposed (security review, findings 1 and 2): no character the person cannot see, in a name or a
 * value; and only the fields the tool's schema names, at every level — so a tool that allows extra fields, or whose
 * schema NOVA could not read, gives a model no field NAME to write into. Then the privacy modes hold as well:
 * - Strict: nothing of the person's records is placed into arguments unless the person typed it. Every text and number in
 *   the arguments must appear in the words the person typed for this request (or be one of the tool's own listed
 *   choices, or yes/no). Anything else is refused, with the way out: run the tool by hand.
 * - Health: never, unless NOVA's Health permission AND the device's Health gate are on (Q14/Q16). With Health closed, an
 *   argument that reads as a Health figure and was not typed by the person is refused; so is any call from a reply that
 *   looked up a Health record.
 * - Guarded: the card names what the arguments hold that Guarded would take out of a message for a cloud model (names,
 *   addresses, exact amounts …), so the person sees it before pressing. Nothing is changed silently: the card shows the
 *   exact arguments that would be sent.
 */
export type GuardReason = 'secret' | 'credential' | 'card' | 'strict' | 'health' | 'invisible' | 'unlisted';
export type ArgsGuard = {ok: true; /** Lines for the card: what the arguments hold that the person may want to check. */ notices: string[]} | {ok: false; reason: GuardReason; message: string};
export type GuardContext = {
  /** Who filled the arguments in. */ source: 'model' | 'person';
  mode: PrivacyMode | null;
  /** NOVA's Health permission and the device's Health gate are both on. */ healthOpen: boolean;
  /** For a model's call: the words the person typed for this request. */ typed?: string;
  /** For a model's call: the reply looked up a Health record (a tool of the Health area that ran). */ healthLookup?: boolean;
  schema?: ToolSchema;
};
export const GUARD_WORDS: Readonly<Record<GuardReason, string>> = {
  ...ALWAYS_WORDS,
  strict: 'Strict: your model may fill a tool’s fields only with words you typed yourself, so none of your records can leave through a tool. This call holds something else. Run the tool by hand from “Your own agent and tools”, or choose another privacy mode.',
  health: 'Health stays out of tools: NOVA’s Health permission or this device’s Health sharing is off, and this call holds a Health figure you did not type. Run the tool by hand if you want to send it yourself.',
  invisible: 'Not shown as a card: the arguments your model gave hold characters that cannot be seen. They could carry text past what the card shows you, so NOVA refuses them.',
  unlisted: 'Not shown as a card: your model added a field this tool does not list. A model may fill in only the fields a tool names, so nothing can be written into a field’s name. Run the tool by hand if you need another field.',
};
const HEALTH_FIGURE = /\b\d+(?:[.,]\d+)?\s?(?:kg|kilos?|lbs?|pounds|stone|kcal|calories|bpm|mmhg|mmol(?:\/l)?|mg\/dl|steps|stappen|hours? of sleep|uur slaap|% body ?fat)\b|\b(?:weight|weigh|gewicht|weeg|blood pressure|bloeddruk|heart rate|hartslag|pulse|bmi|body ?fat|calories|kcal|slept|geslapen|fasting|vasten|menstruat\w*|ovulat\w*|medication|medicatie|dosis|glucose|cholesterol)\b[^.\n]{0,24}\d/i;

/** Lower case, accents and punctuation folded, one space: for "did the person type this?". */
export const fold = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}@.+-]+/gu, ' ').replace(/\s+/g, ' ').trim();
const choicesOf = (schema: ToolSchema | undefined, key: string): readonly (string | number)[] => { const f = schema?.properties[key]; return f?.enum ?? f?.items?.enum ?? []; };
/** Whether a value is the person's own: in what they typed, one of the tool's listed choices, or yes/no. */
function typedByPerson(leaf: Leaf, typed: string, schema: ToolSchema | undefined): boolean {
  if (leaf.value === null || typeof leaf.value === 'boolean') return true;
  if (choicesOf(schema, leaf.path.split(/[.[]/)[0] ?? leaf.key).includes(leaf.value)) return true;
  if (typeof leaf.value === 'number') return new RegExp(`(?<![\\d.,])${String(leaf.value).replace(/[^\d.-]/g, '').replace('.', '[.,]')}(?!\\d|[.,]\\d)`).test(typed);
  const wanted = fold(leaf.value);
  return wanted === '' || fold(typed).includes(wanted);
}
/** The guard. `args` are the arguments as they would be sent (already checked against the tool's schema). */
export function guardArgs(args: Record<string, unknown>, ctx: GuardContext): ArgsGuard {
  const all = leaves(args), texts = all.flatMap(l => typeof l.value === 'string' ? [l.value] : []), joined = texts.join('\n');
  const refuse = (reason: GuardReason): ArgsGuard => ({ok: false, reason, message: GUARD_WORDS[reason]});
  // ── Always (./guard-core.ts), and what the redaction module itself reads as a secret ──
  const always = guardAlways(args);
  if (always) return refuse(always);
  if ((redactText(joined).found.secret ?? 0) > 0) return refuse('secret');
  // ── A model's call: what it may not send at all, then the privacy modes ──
  if (ctx.source === 'model') {
    const typed = ctx.typed ?? '';
    // Finding 2: a character the person cannot see, in a name or a value.
    if (argsHaveInvisible(args)) return refuse('invisible');
    // Finding 1: only the fields the tool's schema names, at every level (a name is not a place for a model's words).
    if (ctx.schema) { const extra = unlistedKeys(ctx.schema, args); if (extra.length) return {ok: false, reason: 'unlisted', message: `${GUARD_WORDS.unlisted} (“${plainLine(extra[0], 60)}”)`}; }
    if (!ctx.healthOpen) {
      if (ctx.healthLookup) return refuse('health');
      // A figure in a value, in a name, or made by a name and its value together ("weight": 82.4).
      if (all.some(l => (typeof l.value === 'string' || typeof l.value === 'number') && (HEALTH_FIGURE.test(String(l.value)) || HEALTH_FIGURE.test(`${keyWords(l.key)} ${l.value}`)) && !typedByPerson(l, typed, ctx.schema))) return refuse('health');
      if (keyNames(args).some(k => HEALTH_FIGURE.test(keyWords(k)))) return refuse('health');
    }
    if (ctx.mode === 'strict' && all.some(l => !typedByPerson(l, typed, ctx.schema))) return refuse('strict');
  }
  // ── What the card says about the arguments ──
  const notices: string[] = [];
  const found = redactText(joined).found, summary = redactionSummary(found);
  if (summary) notices.push(ctx.mode === 'guarded' ? `Guarded would take this out of a message for a cloud model, and this tool would receive it as written: ${summary}.` : `These arguments hold: ${summary}.`);
  if (ctx.source === 'model' && ctx.mode !== 'strict' && all.some(l => !typedByPerson(l, ctx.typed ?? '', ctx.schema))) notices.push('Your model filled in something you did not type. Read each field before you approve.');
  return {ok: true, notices};
}
