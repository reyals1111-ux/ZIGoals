import {afterEach, expect, test, vi} from 'vitest';
import type {StakingQuote} from './quote';
import {PRESS_SIGN, REVIEW_AGAIN, issueSignTicket, redeemSignTicket, registerQuote, type SignTicket} from './sign-gate';

// Session AF (ADR-028 H4): a ticket only from a registered, fresh quote and the person's own trusted submit, used once.
const make = (expiresIn = 60_000): StakingQuote => Object.freeze({network: 'practice', chainId: 'zig-test-2', messages: Object.freeze([]), expiresAt: Date.now() + expiresIn} as unknown as StakingQuote);
const press = {isTrusted: true, type: 'submit', nativeEvent: {isTrusted: true, type: 'submit'}};
afterEach(() => vi.useRealTimers());

test('a registered quote and a trusted submit give one ticket; it redeems once to the same quote', () => {
  const quote = registerQuote(make());
  const ticket = issueSignTicket(quote, press);
  expect(ticket).toEqual({kind: 'zigoals-sign-ticket', network: 'practice', messages: [], expiresAt: quote.expiresAt});
  expect(Object.isFrozen(ticket)).toBe(true);
  expect(redeemSignTicket(ticket)).toBe(quote);
  expect(() => redeemSignTicket(ticket)).toThrow(PRESS_SIGN);
  // The quote gave its one ticket; a second press needs a new review.
  expect(() => issueSignTicket(quote, press)).toThrow(REVIEW_AGAIN);
});
test.each([
  ['an untrusted event (script submit, dispatchEvent)', {isTrusted: false, type: 'submit'}],
  ['a trusted click instead of a submit', {isTrusted: true, type: 'click'}],
  ['a synthetic wrapper around an untrusted native submit', {isTrusted: true, type: 'submit', nativeEvent: {isTrusted: false, type: 'submit'}}],
  ['a native event of another type', {isTrusted: true, type: 'submit', nativeEvent: {isTrusted: true, type: 'keydown'}}],
  ['nothing', undefined],
])('refuses %s', (_, event) => {
  expect(() => issueSignTicket(registerQuote(make()), event as never)).toThrow(PRESS_SIGN);
});
test('refuses a quote that was not registered (hand-made, or a copy of a real one) and an expired one', () => {
  const real = registerQuote(make());
  expect(() => issueSignTicket(make(), press)).toThrow(REVIEW_AGAIN);
  expect(() => issueSignTicket(Object.freeze({...real}), press)).toThrow(REVIEW_AGAIN);
  expect(() => issueSignTicket(registerQuote(make(-1)), press)).toThrow(REVIEW_AGAIN);
  expect(() => registerQuote({...make()} as StakingQuote)).toThrow('sealed');
});
test('a forged, copied or expired ticket never redeems', () => {
  vi.useFakeTimers({now: new Date('2026-10-18T21:00:00Z')});
  const quote = registerQuote(make());
  const ticket = issueSignTicket(quote, press);
  const forged = Object.freeze({kind: 'zigoals-sign-ticket', network: 'practice', messages: [], expiresAt: quote.expiresAt}) as SignTicket;
  expect(() => redeemSignTicket(forged)).toThrow(PRESS_SIGN);
  expect(() => redeemSignTicket({...ticket})).toThrow(PRESS_SIGN);
  expect(() => redeemSignTicket(structuredClone(ticket))).toThrow(PRESS_SIGN);
  vi.setSystemTime(quote.expiresAt);
  expect(() => redeemSignTicket(ticket)).toThrow(REVIEW_AGAIN);
});
