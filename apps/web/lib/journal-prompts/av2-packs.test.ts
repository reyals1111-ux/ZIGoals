import {describe, expect, test} from 'vitest';
import {PACK_IDS, PROMPT_PACKS, packsOn, questionWithPacks, withPack} from './packs';
import {DAILY_QUESTIONS, questionOfTheDay} from './daily';

/** Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs), pure. */
describe('prompt packs', () => {
  test('six packs, each with the same number of questions in English and Dutch, none repeated', () => {
    expect(PACK_IDS).toEqual(['sleep', 'training', 'gratitude', 'creativity', 'work-life', 'year']);
    for (const p of PROMPT_PACKS) {
      expect(p.questions.nl, p.id).toHaveLength(p.questions.en.length);
      expect(p.questions.en.length, p.id).toBeGreaterThanOrEqual(8);
      expect(new Set(p.questions.en).size).toBe(p.questions.en.length);
      for (const q of [...p.questions.en, ...p.questions.nl]) { expect(q.length, q).toBeLessThanOrEqual(90); expect(q).toMatch(/[?.]$/); }
    }
  });
  test('with no pack on, today’s question is exactly the everyday one', () => {
    for (const step of [0, 1, 5]) expect(questionWithPacks('2026-11-23', step, 'en', [])).toEqual({question: questionOfTheDay('2026-11-23', step, 'en'), pack: null});
    expect(questionWithPacks('2026-11-23', 0, 'nl', undefined).question).toBe(questionOfTheDay('2026-11-23', 0, 'nl'));
  });
  test('switched-on packs take turns with the everyday questions; Another question steps on; Dutch follows the same order', () => {
    const on = ['training', 'sleep'], seen = [0, 1, 2, 3, 4, 5].map(step => questionWithPacks('2026-11-23', step, 'en', on));
    const sources = seen.map(q => q.pack?.id ?? 'everyday');
    expect(new Set(sources.slice(0, 3))).toEqual(new Set(['everyday', 'sleep', 'training'])); // one turn each in three steps
    expect(sources.slice(0, 3)).toEqual(sources.slice(3, 6));
    for (const q of seen) expect(q.pack ? q.pack.questions.en : DAILY_QUESTIONS).toContain(q.question);
    const nl = questionWithPacks('2026-11-23', 1, 'nl', on), en = questionWithPacks('2026-11-23', 1, 'en', on);
    expect(nl.pack?.id).toBe(en.pack?.id);
    if (en.pack) expect(nl.question).toBe(en.pack.questions.nl[en.pack.questions.en.indexOf(en.question)]);
  });
  test('switching keeps the order of the packs and any id another build kept', () => {
    expect(withPack(['later-pack'], 'sleep', true)).toEqual(['later-pack', 'sleep']);
    expect(withPack(['later-pack', 'sleep'], 'sleep', false)).toEqual(['later-pack']);
    expect(packsOn(['year', 'later-pack', 'sleep']).map(p => p.id)).toEqual(['sleep', 'year']);
  });
});
