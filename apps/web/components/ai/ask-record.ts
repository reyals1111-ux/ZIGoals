import {cardNumberIn, safetyFirst} from '../../lib/ai/safety-guard';
import {looksSecret} from '../../lib/secret-guard/guard';

/**
 * Session AL fifth pass (lane L7-5c, found by L7-5a): whether a question may be kept as one of the person's frequent asks
 * (`zigoals:zigi-suggestions:v1`, which after three asks becomes a "Yours" suggestion and is part of Export everything).
 * A message the on-device guard answers first (distress, self-harm, harm to others, a secret, a careful topic) is never
 * kept, in any language the guard reads; an advice question ("Should I buy ETH now?") is an ordinary ask and may be.
 * Security delta A (SA-2, 8 Nov): nor is anything the chat refuses before it is stored or sent: recovery words or a
 * private key (the secret guard, `looksSecret`) and a payment card number (`cardNumberIn`). These checks run before any
 * write, the same ones `send` and `ask` run (components/ai/use-chat-session.ts); `recordAsk` repeats them.
 */
export function keepsAsAsk(text: string): boolean {
  if (looksSecret(text) || cardNumberIn(text)) return false;
  const hit = safetyFirst(text);
  return !(hit && hit.kind !== 'advice');
}
