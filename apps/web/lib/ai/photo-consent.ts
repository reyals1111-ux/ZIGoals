import {GUARDED_PHOTO_REFUSAL, isOllamaCloudModel, sendDecision, STRICT_REFUSAL} from './privacy-mode';
import {PROVIDERS, type ProviderId} from './providers';
import type {PrivacyMode} from '../nova/setup';

/**
 * Session AK security reviews Z1A-1 and Z1B-10 (lane ZF): before a photo (a lab sheet, a receipt) leaves this device, the
 * person sees it and where it goes, and confirms. Pure: the brain's plain name, and the privacy mode's own refusal when the
 * engine would not send it (Strict refuses a cloud model; Guarded sends no photo to a cloud model), so the person reads the
 * reason before choosing. The engine's hook (lib/ai/guarded-stream.ts) enforces the same rule whatever this says.
 */
export type PhotoTarget = {provider: ProviderId | null | undefined; model?: string | null; localServer?: 'ollama' | 'openai-compatible' | null};
export function photoDestination(target: PhotoTarget, mode: PrivacyMode | null): {name: string; local: boolean; refusal: string | null} {
  const {provider, model = null, localServer = null} = target;
  const cloudOllama = provider === 'local' && isOllamaCloudModel(model);
  const local = provider === 'local' && !cloudOllama;
  const name = !provider ? 'your AI' : cloudOllama ? 'Ollama’s cloud (ollama.com)' : provider === 'local' ? (localServer === 'ollama' ? 'Ollama on this computer' : 'your local model on this computer') : PROVIDERS[provider].name;
  const decision = sendDecision(mode, {provider, model});
  return {name, local, refusal: decision === 'refuse' ? STRICT_REFUSAL : decision === 'redact' ? GUARDED_PHOTO_REFUSAL : null};
}
/** The line above the photo: what it goes to, and what a sheet or receipt often shows. */
export function photoSendLine(what: 'lab sheet' | 'receipt', destination: {name: string; local: boolean}): string {
  const shows = what === 'lab sheet' ? 'a name, a birth date or a patient number' : 'a card number, an address or a name';
  return `This photo goes to ${destination.name}${destination.local ? '' : ', outside this device'}, with this one request. A ${what} often shows ${shows}: cover or crop what you would rather not send.`;
}
