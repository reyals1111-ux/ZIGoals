import type {PageContext} from './types';
import {AREA_LABELS} from './pages';
import {estimateTokens} from './budget';

/**
 * "What your AI sees" (ADR-012): the exact text attached to the next message, with what was included and what was left
 * out and why. Nothing here is sent anywhere; it is the person's own view of the context before they decide to send.
 */
export type Preview = {title: string; summary: string; included: string[]; omitted: string[]; text: string; estimatedTokens: number; empty: boolean};
export function previewContext(context: PageContext, {provider}: {provider: string}): Preview {
  const empty = context.text.trim() === '';
  const tokens = context.estimatedTokens || estimateTokens(context.text);
  return {
    title: `What ${provider} will see from ${AREA_LABELS[context.area]}`,
    summary: empty ? 'Nothing from this page is attached. Your message goes alone, with ZIGi\'s instructions.' : `About ${tokens.toLocaleString('en-US')} tokens of page context (an estimate) go with your next message, as data your AI may read but not act on by itself. No identifiers, account details or wallet addresses are included.`,
    included: context.included, omitted: context.omitted, text: context.text, estimatedTokens: tokens, empty,
  };
}
