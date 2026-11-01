import {isCloudTarget, isOllamaCloudModel, sendDecision, targetName, type SendDecision} from '../ai/privacy-mode';
import type {ProviderId} from '../ai/providers';
import {getAppStorage} from '../showcase-storage';
import {redactText, redactionSummary, mergeCounts, type RedactionCounts} from './redact';
import {PRIVACY_MODES, readPrivacyMode, type PrivacyMode} from './setup';

/**
 * Session AK, owner follow-up 2 (N3 step 2, N9; lane NC): NOVA's privacy modes for the surfaces (the guide, the status
 * chip, the Permissions panel, the chat's "about to send" line). The engine enforces the same rules in
 * lib/ai/privacy-mode.ts; this module only reads and explains them, and shows the exact text a cloud model would get.
 */
export {PRIVACY_MODES, type PrivacyMode, isCloudTarget, isOllamaCloudModel, sendDecision, type SendDecision};
export const PRIVACY_WORDS: Readonly<Record<PrivacyMode, {label: string; tag: string; what: string; sends: string}>> = {
  strict: {label: 'Strict', tag: 'Recommended', what: 'Only a model on this computer answers. Nothing goes to a cloud.', sends: 'Nothing goes to a cloud model: it is refused before anything is sent. A Hermes Agent counts as on this computer only after you confirm it uses a local model; until then it gets the redacted copy, as in Guarded.'},
  guarded: {label: 'Guarded', tag: 'Cloud, redacted', what: 'A cloud model may answer, but secrets, account numbers, addresses, exact amounts and names are taken out or rounded first.', sends: 'You see exactly what goes before it goes. Photos are never sent to a cloud.'},
  relaxed: {label: 'Relaxed', tag: 'Your informed choice', what: 'The areas you share go to your model as they are, local or cloud.', sends: 'Your chosen cloud provider receives your shared records unchanged, under its own terms.'},
};
/** The mode on this device, or null when never chosen (ZIGi then works exactly as before NOVA). */
export function privacyMode(storage: Pick<Storage, 'getItem'> = getAppStorage()): PrivacyMode | null { return readPrivacyMode(storage); }
/** A status line for chips and panels: "Strict · local only", or "Not chosen yet" (today's behaviour). */
export function privacyChip(mode: PrivacyMode | null): string {
  return mode === null ? 'Privacy: not chosen yet' : `Privacy: ${PRIVACY_WORDS[mode].label}`;
}
/** Text as it would leave for a cloud model in this mode: redacted in Guarded, as it is otherwise (Strict sends none). */
export function redactForSend(text: string, mode: PrivacyMode | null, knownNames: readonly string[] = []): {text: string; found: RedactionCounts} {
  return mode === 'guarded' ? redactText(text, {knownNames}) : {text, found: {}};
}
export type SendPreview = {
  decision: SendDecision;
  /** "NOVA is about to send this to OpenAI", "Stays on this computer", or why nothing is sent. */
  line: string;
  /** The message and the context exactly as the provider would receive them ('' when nothing would go). */
  message: string; context: string;
  found: RedactionCounts; summary: string;
};
/**
 * "NOVA is about to send this to <provider>": the person's message and the context, as the engine would send them now.
 * `assistant`: the name the person gave NOVA (or "ZIGi" on ZIGi's own surfaces).
 */
export function previewFor({message, context = '', mode, provider, model = null, hosted = false, hermesUnconfirmed = false, knownNames = [], assistant = 'NOVA'}: {message: string; context?: string; mode: PrivacyMode | null; provider: ProviderId | null | undefined; model?: string | null; hosted?: boolean; hermesUnconfirmed?: boolean; knownNames?: readonly string[]; assistant?: string}): SendPreview {
  const decision = sendDecision(mode, {provider, hosted, model, hermesUnconfirmed}), name = hermesUnconfirmed && provider === 'local' ? 'your Hermes Agent' : targetName(provider, hosted, model);
  if (!provider && !hosted) return {decision: 'send', line: `${assistant} has no model connected yet: your words stay on this device and on-device answers reply.`, message: '', context: '', found: {}, summary: ''};
  if (decision === 'refuse') return {decision, line: `Strict: nothing goes to ${name}. Connect a model on this computer, or choose another mode.`, message: '', context: '', found: {}, summary: ''};
  if (decision === 'send' && !isCloudTarget(provider, hosted, model)) return {decision, line: `This stays on this computer: ${assistant} answers with your local model.`, message, context, found: {}, summary: ''};
  const as = decision === 'redact' ? 'guarded' : null;
  const m = redactForSend(message, as, knownNames), c = redactForSend(context, as, knownNames), found = mergeCounts(m.found, c.found);
  return {decision, line: `${assistant} is about to send this to ${name}.`, message: m.text, context: c.text, found, summary: redactionSummary(found)};
}
