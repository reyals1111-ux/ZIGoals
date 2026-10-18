import type {StakingQuote} from './quote';

/**
 * Session AF (ADR-028 H4; `TIER 3 (wallet/signing)`): the one gate in front of the signer. A `SignTicket` exists only when
 * (1) the quote was made by lib/staking/quote.ts in this page (registered here, never by hand), (2) it has not expired,
 * and (3) the person's own submit of the review sheet produced it: a trusted `submit` event, which a script cannot make
 * (`form.requestSubmit()`, `dispatchEvent` and synthetic clicks all arrive untrusted). The signer
 * (lib/staking/execute.ts) redeems a ticket exactly once; a copy, a spread or a hand-made object is not a ticket.
 * staking-guard.test.ts pins who may call what: registerQuote only quote.ts, issueSignTicket only the review sheet's
 * onSubmit handler, redeemSignTicket only execute.ts.
 */
export type SignTicket = Readonly<{kind: 'zigoals-sign-ticket'; network: StakingQuote['network']; messages: StakingQuote['messages']; expiresAt: number}>;
export class SignGateRefused extends Error {}
const quotes = new WeakSet<object>();
const tickets = new WeakMap<object, StakingQuote>();
/** quote.ts only: marks a frozen quote as one this module may issue a ticket for. */
export function registerQuote<T extends StakingQuote>(quote: T): T {
  if (!Object.isFrozen(quote)) throw new SignGateRefused('Only a sealed quote can be reviewed.');
  quotes.add(quote);
  return quote;
}
export type SubmitPress = {readonly isTrusted?: boolean; readonly type?: string; readonly nativeEvent?: {readonly isTrusted?: boolean; readonly type?: string}};
export const PRESS_SIGN = 'Press "Sign in Keplr" on the review screen to sign. Nothing was signed.';
export const REVIEW_AGAIN = 'The fee estimate is no longer current. Review again; nothing was signed.';
/** The review sheet's onSubmit handler only: one ticket for this quote and this press. */
export function issueSignTicket(quote: StakingQuote, press: SubmitPress): SignTicket {
  const native = press?.nativeEvent ?? press;
  if (!press || press.isTrusted !== true || press.type !== 'submit' || native.isTrusted !== true || native.type !== 'submit') throw new SignGateRefused(PRESS_SIGN);
  if (!quotes.has(quote) || Date.now() >= quote.expiresAt) throw new SignGateRefused(REVIEW_AGAIN);
  quotes.delete(quote);
  const ticket: SignTicket = Object.freeze({kind: 'zigoals-sign-ticket', network: quote.network, messages: quote.messages, expiresAt: quote.expiresAt});
  tickets.set(ticket, quote);
  return ticket;
}
/** execute.ts only: the quote behind a ticket, once; an expired, used or forged ticket throws. */
export function redeemSignTicket(ticket: SignTicket): StakingQuote {
  const quote = tickets.get(ticket);
  tickets.delete(ticket);
  if (!quote) throw new SignGateRefused(PRESS_SIGN);
  if (Date.now() >= quote.expiresAt) throw new SignGateRefused(REVIEW_AGAIN);
  return quote;
}
