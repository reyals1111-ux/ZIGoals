import type {ZigiPersonality} from './ai/store/records';

/**
 * Session AI (mascot, ADR-034 N13): ZIGi's own device words in the person's chosen personality. Calm is the default and
 * keeps every sentence exactly as before; cheerful is a touch warmer; direct leads with the point. The facts, the
 * guardrails and what is written never change with the personality.
 */
export const PERSONALITY_LABELS: Record<ZigiPersonality, string> = {calm: 'Steady', cheerful: 'Cheerful', direct: 'Direct'}; // "Steady", not "Calm": the Animation choice beside it already has a "Calm"
export const PERSONALITY_NOTES: Record<ZigiPersonality, string> = {
  calm: 'Calm and quiet, short plain sentences (as ZIGi has always been).',
  cheerful: 'A little warmer and lighter, never pushy, never loud.',
  direct: 'The point first, no warm-up: the shortest kind answer.',
};
/**
 * `name` (Session AL sweep 3, NB-006): the name the person gave in setup (lib/onboarding-setup.ts PROFILE_NAME, this
 * device only). ZIGi greets by it in the panel; it is never added to what is sent to an AI. A private screen greets
 * without it.
 */
export function greetingWords(personality: ZigiPersonality, kind: 'connected' | 'local' | 'private', name = ''): string {
  if (kind === 'private') return 'Hi, I’m ZIGi. On this private screen I read nothing from the page.';
  const who = name.trim(), hi = who ? `Hi ${who}, I’m ZIGi` : 'Hi, I’m ZIGi', direct = who ? `ZIGi here, ${who}.` : 'ZIGi here.';
  if (kind === 'connected') return personality === 'cheerful' ? `${hi}, glad you’re here. Ask about your records or tell me what to log. Nothing is written until you add a card.`
    : personality === 'direct' ? `${direct} Ask about your records or say what to log. Nothing is written until you add a card.`
    : `${hi}. Ask about your records or tell me what to log. Nothing is written until you add a card.`;
  return personality === 'cheerful' ? `${hi}, glad you’re here. Ask about your records: I answer right here, privately, on this device.`
    : personality === 'direct' ? `${direct} Ask about your records: answered on this device, privately.`
    : `${hi}. Ask about your records: I answer right here, privately, on this device.`;
}
