import type {StakingQuote} from './quote';

/**
 * Session AF (ADR-028 H4; `TIER 3 (wallet/signing)`): the one gate in front of the signer. A `SignTicket` exists only when
 * (1) the quote was made by lib/staking/quote.ts in this page (registered here, never by hand), (2) it has not expired,
 * and (3) the person pressed the review sheet's own Sign button: the form's `submit` event names that button as its
 * submitter AND a trusted `click` on that same button came just before it.
 *
 * Why both: a submit event is trusted even when a script starts it — `form.requestSubmit()` makes the browser fire a
 * trusted submit (seen in this lane's first Chrome run of staking-sign.spec.ts, where it reached the signer under an
 * earlier submit-only gate) — so `isTrusted` on the submit alone proves nothing. The click is
 * what a script cannot forge: `button.click()` and `dispatchEvent(new MouseEvent('click'))` arrive untrusted, while a
 * mouse press, a tap, or Enter/Space on the focused button arrive trusted. The signer (lib/staking/execute.ts) redeems a
 * ticket exactly once; a copy, a spread or a hand-made object is not a ticket. staking-guard.test.ts pins who may call
 * what: registerQuote only quote.ts, issueSignTicket only the review sheet's onSubmit handler, redeemSignTicket only
 * execute.ts.
 */
/** Session AF chunk 3: the ticket also carries what the signature is for beyond its messages — the chain id, the memo
 *  (empty for every staking action; a practice badge's code) and whether a Ledger signs — so the signer's first check
 *  (assertNativeStakingAllowed(ticket.messages, ticket)) sees all of it. */
export type SignTicket = Readonly<{kind: 'zigoals-sign-ticket'; network: StakingQuote['network']; chainId: string; messages: StakingQuote['messages']; memo: string; isLedger: boolean; expiresAt: number}>;
export class SignGateRefused extends Error {}
const quotes = new WeakSet<object>();
const tickets = new WeakMap<object, StakingQuote>();
/** quote.ts only: marks a frozen quote as one this module may issue a ticket for. */
export function registerQuote<T extends StakingQuote>(quote: T): T {
  if (!Object.isFrozen(quote)) throw new SignGateRefused('Only a sealed quote can be reviewed.');
  quotes.add(quote);
  return quote;
}
type Target = {contains?(other: unknown): boolean} | null | undefined;
/** The form's native submit event (its `submitter` is the button pressed). */
export type SubmitLike = {readonly isTrusted?: boolean; readonly type?: string; readonly timeStamp?: number; readonly submitter?: Target};
/** The native click that pressed the button, recorded by the button's own click handler. */
export type ActivationLike = {readonly isTrusted?: boolean; readonly type?: string; readonly timeStamp?: number; readonly target?: unknown};
export type SignPress = {readonly submit?: SubmitLike | null; readonly activation?: ActivationLike | null};
/** A press and its submit belong together when they are this close (the submit follows the click at once). */
export const PRESS_WINDOW_MS = 1000;
export const PRESS_SIGN = 'Press "Sign in Keplr" on the review screen to sign. Nothing was signed.';
export const REVIEW_AGAIN = 'The fee estimate is no longer current. Review again; nothing was signed.';
function pressedByPerson(press: SignPress | undefined): boolean {
  const submit = press?.submit, click = press?.activation, button = submit?.submitter;
  if (!submit || !click || !button) return false;
  if (submit.isTrusted !== true || submit.type !== 'submit' || click.isTrusted !== true || click.type !== 'click') return false;
  if (!(click.target === button || (typeof button.contains === 'function' && button.contains(click.target)))) return false;
  const gap = Number(submit.timeStamp) - Number(click.timeStamp);
  return Number.isFinite(gap) && gap >= 0 && gap <= PRESS_WINDOW_MS;
}
/** The review sheet's onSubmit handler only: one ticket for this quote and this press. */
export function issueSignTicket(quote: StakingQuote, press: SignPress): SignTicket {
  if (!pressedByPerson(press)) throw new SignGateRefused(PRESS_SIGN);
  if (!quotes.has(quote) || Date.now() >= quote.expiresAt) throw new SignGateRefused(REVIEW_AGAIN);
  quotes.delete(quote);
  const ticket: SignTicket = Object.freeze({kind: 'zigoals-sign-ticket', network: quote.network, chainId: quote.chainId, messages: quote.messages, memo: quote.memo, isLedger: quote.isLedger, expiresAt: quote.expiresAt});
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
