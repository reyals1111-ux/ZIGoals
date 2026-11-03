import {expect, test} from 'vitest';
import {sendDecision} from '../ai/privacy-mode';
import {PRIVACY_WORDS} from './privacy-mode';
import {brainWayTag, keyRefused, modeTag, PHONE_PRIVACY_LINE, recommendedMode} from './phone-path';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-5): on a phone, the guide's recommended path never ends in a
 * refusal. Strict refuses every cloud model (the engine's own rule, lib/ai/privacy-mode.ts), and a phone can only reach one,
 * so the phone's suggestion is Guarded, and the local way says it needs a computer.
 */
test('a computer keeps Strict and the local model as its recommendations', () => {
  expect(recommendedMode(false)).toBe('strict');
  expect(modeTag('strict', PRIVACY_WORDS.strict.tag, false)).toBe('Recommended');
  expect(brainWayTag('local', false)).toBe('Recommended');
});
test('a phone suggests Guarded, says why, and marks the local model as needing a computer', () => {
  expect(recommendedMode(true)).toBe('guarded');
  expect(modeTag('guarded', PRIVACY_WORDS.guarded.tag, true)).toBe('Recommended on a phone');
  expect(modeTag('strict', PRIVACY_WORDS.strict.tag, true)).toBe('Needs a computer');
  expect(modeTag('relaxed', PRIVACY_WORDS.relaxed.tag, true)).toBe(PRIVACY_WORDS.relaxed.tag);
  expect(brainWayTag('local', true)).toBe('Needs a computer');
  expect(brainWayTag('key', true)).toBeUndefined();
  expect(PHONE_PRIVACY_LINE).toMatch(/^Strict needs a model on a computer\./);
});
test('following the phone\'s suggestions in order, the key is not refused; Strict would refuse it, and says so', () => {
  const mode = recommendedMode(true);
  expect(keyRefused(mode)).toBe(false);
  expect(sendDecision(mode, {provider: 'openai', model: 'gpt-6-luna'})).not.toBe('refuse');
  expect(keyRefused('strict')).toBe(true);
  expect(sendDecision('strict', {provider: 'openai', model: 'gpt-6-luna'})).toBe('refuse');
});
