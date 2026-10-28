import type {ZigiPersonality} from './ai/store/records';

/**
 * Session AI (mascot, ADR-034 N13): ZIGi's own device words in the person's chosen personality. Calm is the default and
 * keeps every sentence exactly as before; cheerful is a touch warmer; direct leads with the point. The facts, the
 * guardrails and what is written never change with the personality.
 */
export const PERSONALITY_LABELS: Record<ZigiPersonality, string> = {calm: 'Calm', cheerful: 'Cheerful', direct: 'Direct'};
export const PERSONALITY_NOTES: Record<ZigiPersonality, string> = {
  calm: 'Quiet and steady, short plain sentences (as ZIGi has always been).',
  cheerful: 'A little warmer and lighter, never pushy, never loud.',
  direct: 'The point first, no warm-up: the shortest kind answer.',
};
export function greetingWords(personality: ZigiPersonality, kind: 'connected' | 'local' | 'private'): string {
  if (kind === 'private') return 'Hi, I’m ZIGi. On this private screen I read nothing from the page.';
  if (kind === 'connected') return personality === 'cheerful' ? 'Hi, I’m ZIGi, glad you’re here. Ask about your records or tell me what to log. Nothing is written until you add a card.'
    : personality === 'direct' ? 'ZIGi here. Ask about your records or say what to log. Nothing is written until you add a card.'
    : 'Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.';
  return personality === 'cheerful' ? 'Hi, I’m ZIGi, glad you’re here. Ask about your records: I answer right here, privately, on this device.'
    : personality === 'direct' ? 'ZIGi here. Ask about your records: answered on this device, privately.'
    : 'Hi, I’m ZIGi. Ask about your records: I answer right here, privately, on this device.';
}
