import {afterEach, expect, test, vi} from 'vitest';
import type {StakingQuote} from './quote';
import {PRESS_SIGN, REVIEW_AGAIN, issueSignTicket, redeemSignTicket, registerQuote, type SignPress, type SignTicket} from './sign-gate';

// Session AF (ADR-028 H4): a ticket only from a registered, fresh quote and the person's own press of the Sign button
// (a trusted click on it, then the form's submit naming it), used once.
const make = (expiresIn = 60_000): StakingQuote => Object.freeze({network: 'practice', chainId: 'zig-test-2', messages: Object.freeze([]), expiresAt: Date.now() + expiresIn} as unknown as StakingQuote);
const button = {contains: (x: unknown) => x === label}, label = {};
const personPress = (over: {submit?: object; activation?: object} = {}): SignPress => ({
  submit: {isTrusted: true, type: 'submit', timeStamp: 1000.5, submitter: button, ...over.submit},
  activation: {isTrusted: true, type: 'click', timeStamp: 1000, target: button, ...over.activation},
});
afterEach(() => vi.useRealTimers());

test('a registered quote and the person\'s press give one ticket; it redeems once to the same quote', () => {
  const quote = registerQuote(make());
  const ticket = issueSignTicket(quote, personPress());
  expect(ticket).toEqual({kind: 'zigoals-sign-ticket', network: 'practice', messages: [], expiresAt: quote.expiresAt});
  expect(Object.isFrozen(ticket)).toBe(true);
  expect(redeemSignTicket(ticket)).toBe(quote);
  expect(() => redeemSignTicket(ticket)).toThrow(PRESS_SIGN);
  // The quote gave its one ticket; a second press needs a new review.
  expect(() => issueSignTicket(quote, personPress())).toThrow(REVIEW_AGAIN);
  // A click on the button's own label (a child of the button) counts as pressing it.
  expect(() => issueSignTicket(registerQuote(make()), personPress({activation: {target: label}}))).not.toThrow();
});
test.each([
  ['form.requestSubmit() alone (a trusted submit, no click)', {submit: {isTrusted: true, type: 'submit', timeStamp: 1, submitter: button}, activation: null}],
  ['button.click() from a script (an untrusted click)', personPress({activation: {isTrusted: false}})],
  ['a dispatched submit event (untrusted)', personPress({submit: {isTrusted: false}})],
  ['a trusted click on another element', personPress({activation: {target: {}}})],
  ['a submit with no submitter (requestSubmit() without a button, or Enter elsewhere)', personPress({submit: {submitter: null}})],
  ['a click long before the submit', personPress({activation: {timeStamp: 0}, submit: {timeStamp: 1500}})],
  ['a submit before the click', personPress({submit: {timeStamp: 999}})],
  ['a keydown instead of a click', personPress({activation: {type: 'keydown'}})],
  ['a click event as the submit', personPress({submit: {type: 'click'}})],
  ['nothing', undefined],
])('refuses %s', (_, press) => {
  expect(() => issueSignTicket(registerQuote(make()), press as SignPress)).toThrow(PRESS_SIGN);
});
test('refuses a quote that was not registered (hand-made, or a copy of a real one) and an expired one', () => {
  const real = registerQuote(make());
  expect(() => issueSignTicket(make(), personPress())).toThrow(REVIEW_AGAIN);
  expect(() => issueSignTicket(Object.freeze({...real}), personPress())).toThrow(REVIEW_AGAIN);
  expect(() => issueSignTicket(registerQuote(make(-1)), personPress())).toThrow(REVIEW_AGAIN);
  expect(() => registerQuote({...make()} as StakingQuote)).toThrow('sealed');
  // A refused press leaves the quote usable for the person's real press.
  expect(() => issueSignTicket(real, personPress({activation: {isTrusted: false}}))).toThrow(PRESS_SIGN);
  expect(() => issueSignTicket(real, personPress())).not.toThrow();
});
test('a forged, copied or expired ticket never redeems', () => {
  vi.useFakeTimers({now: new Date('2026-10-18T21:00:00Z')});
  const quote = registerQuote(make());
  const ticket = issueSignTicket(quote, personPress());
  const forged = Object.freeze({kind: 'zigoals-sign-ticket', network: 'practice', messages: [], expiresAt: quote.expiresAt}) as SignTicket;
  expect(() => redeemSignTicket(forged)).toThrow(PRESS_SIGN);
  expect(() => redeemSignTicket({...ticket})).toThrow(PRESS_SIGN);
  expect(() => redeemSignTicket(structuredClone(ticket))).toThrow(PRESS_SIGN);
  vi.setSystemTime(quote.expiresAt);
  expect(() => redeemSignTicket(ticket)).toThrow(REVIEW_AGAIN);
});
