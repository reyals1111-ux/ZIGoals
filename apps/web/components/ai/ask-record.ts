import {safetyFirst} from '../../lib/ai/safety-guard';

/**
 * Session AL fifth pass (lane L7-5c, found by L7-5a): whether a question may be kept as one of the person's frequent asks
 * (`zigoals:zigi-suggestions:v1`, which after three asks becomes a "Yours" suggestion and is part of Export everything).
 * A message the on-device guard answers first (distress, self-harm, harm to others, a secret, a careful topic) is never
 * kept, in any language the guard reads; an advice question ("Should I buy ETH now?") is an ordinary ask and may be.
 */
export function keepsAsAsk(text: string): boolean {
  const hit = safetyFirst(text);
  return !(hit && hit.kind !== 'advice');
}
