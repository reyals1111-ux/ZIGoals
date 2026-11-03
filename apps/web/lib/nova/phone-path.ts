import type {PrivacyMode} from './setup';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-5): "Build your own NOVA" on a phone. A phone cannot run the
 * local model Strict needs (lib/ai/privacy-mode.ts refuses every cloud model in Strict), so following the computer's
 * recommendations in order led straight to a refusal. On a phone the guide recommends Guarded, says why in one line, marks
 * "A model on this computer" as needing a computer, and offers one tap to Guarded where a key would be refused.
 */
export const NOVA_PHONE_QUERY = '(max-width: 640px), (pointer: coarse) and (hover: none)';
/** The mode the guide suggests: Strict on a computer, Guarded on a phone. */
export const recommendedMode = (phone: boolean): PrivacyMode => phone ? 'guarded' : 'strict';
/** A mode's small tag in the guide (the computer's tags stay as they were). */
export function modeTag(mode: PrivacyMode, base: string, phone: boolean): string {
  if (!phone) return base;
  return mode === 'guarded' ? 'Recommended on a phone' : mode === 'strict' ? 'Needs a computer' : base;
}
/** The one honest line on a phone. */
export const PHONE_PRIVACY_LINE = 'Strict needs a model on a computer. On a phone, Guarded sends a redacted copy to the provider you choose.';
/** The brain's ways with their tags: on a phone, the local model needs a computer and is not the recommendation. */
export function brainWayTag(way: 'local' | 'key' | 'openrouter' | 'browser', phone: boolean): string | undefined {
  if (way === 'local') return phone ? 'Needs a computer' : 'Recommended';
  return undefined;
}
/** Whether a cloud key would be refused in this mode (Strict refuses every cloud model). */
export const keyRefused = (mode: PrivacyMode | null): boolean => mode === 'strict';
