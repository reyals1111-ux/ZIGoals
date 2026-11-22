import {describe, expect, test} from 'vitest';
import {GUIDES, guideOfTheDay} from './guides';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits pillar; LEDGER #71, #77): today's written practice, in English and Dutch. */
describe('written practices', () => {
  test('every guide has a Dutch twin with as many steps, short minutes, and no treatment words', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(GUIDES.map(g => g.id)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      expect(g.nl.steps).toHaveLength(g.en.steps.length);
      expect([3, 5, 10]).toContain(g.minutes);
      for (const s of [...g.en.steps, ...g.nl.steps]) { expect(s.length).toBeLessThan(160); expect(s).not.toMatch(/therap|cure|heal|anxiety|depress|genees|angst/i); }
    }
  });
  test('one a day; Another one moves on; the same day gives the same guide', () => {
    expect(guideOfTheDay('2026-11-17')).toBe(guideOfTheDay('2026-11-17'));
    expect(guideOfTheDay('2026-11-17', 1)).toBe(guideOfTheDay('2026-11-18'));
    expect(guideOfTheDay('2026-11-17', GUIDES.length)).toBe(guideOfTheDay('2026-11-17'));
  });
  test('NOVA and ZIGi name today\'s practice in English and Dutch', () => {
    const g = guideOfTheDay('2026-11-17'), env = zigiEnv(showcaseAll());
    const text = (q: string) => { const r = av2HabitsAnswer(q, env); return r && 'text' in r ? r.text : ''; };
    expect(text('what is today\'s meditation')).toBe(`Today’s practice: “${g.en.title}”, ${g.minutes} minutes. It begins: ${g.en.steps[0]} Health → Meditation → Today’s practice has all of it, “Another one”, and Begin with the bell.`);
    expect(text('wat is de meditatie van vandaag')).toContain(`De oefening van vandaag: “${g.nl.title}”, ${g.minutes} minuten.`);
  });
});
