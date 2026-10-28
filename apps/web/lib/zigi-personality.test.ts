import {expect, test} from 'vitest';
import {buildSystemParts, PERSONALITY_NOTES} from './ai/context/specialists';
import {zigiPersonality, zigiSchema} from './ai/store/records';
import {greetingWords} from './zigi-personality';
import {streakNoteId} from './habits-v2/zigi-facts';

/** Session AI (mascot): personality changes words only; calm is exactly as before; a milestone celebrates once. */
const args = {area: 'today' as const, context: null, customInstructions: '', providerName: 'your AI', today: '2026-10-28'};
test('calm (or absent) leaves the prompt byte for byte; cheerful and direct add one tone line and nothing else', () => {
  const before = buildSystemParts(args).prompt;
  expect(buildSystemParts({...args, personality: 'calm'}).prompt).toBe(before);
  for (const p of ['cheerful', 'direct'] as const) {
    const prompt = buildSystemParts({...args, personality: p}).prompt;
    expect(prompt).toContain(PERSONALITY_NOTES[p]);
    expect(prompt.replace(`${PERSONALITY_NOTES[p]}\n\n`, '')).toBe(before);
  }
});
test('the greeting: calm is the sentence ZIGi always said; a private screen says the same in every personality', () => {
  expect(greetingWords('calm', 'connected')).toBe('Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.');
  expect(greetingWords('direct', 'connected')).toMatch(/^ZIGi here\./);
  for (const p of ['calm', 'cheerful', 'direct'] as const) { expect(greetingWords(p, 'connected')).toContain('Nothing is written until you add a card.'); expect(greetingWords(p, 'private')).toBe('Hi, I’m ZIGi. On this private screen I read nothing from the page.'); }
});
test('the record: personality is optional; an unknown value reads as calm and keeps the rest', () => {
  expect(zigiPersonality(zigiSchema.parse({version: 1}))).toBe('calm');
  expect(zigiPersonality(zigiSchema.parse({version: 1, personality: 'direct'}))).toBe('direct');
  expect(zigiSchema.parse({version: 1, personality: 'loud', side: 'left'})).toMatchObject({side: 'left'});
  expect(zigiPersonality(zigiSchema.parse({version: 1, personality: 'loud'}))).toBe('calm');
});
test('a streak milestone has one celebration id per habit, milestone and day', () => {
  expect(streakNoteId('h1', 7, '2026-10-28')).toBe('streak:h1:7:2026-10-28');
  expect(streakNoteId('h1', 7, '2026-10-28')).not.toBe(streakNoteId('h1', 7, '2026-11-04'));
});
