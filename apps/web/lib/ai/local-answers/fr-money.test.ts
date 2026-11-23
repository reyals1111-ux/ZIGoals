import {afterEach, describe, expect, test} from 'vitest';
import {progressText} from '../../goal-summary';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../../visual-format';
import {progressNumber} from './exact/day';
import {ask, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {toldIn} from './ai-session';
import {splitBudgetCompounds, understand} from './exact/understand';

// Session AV lane 2 (fr-money): the friend-readiness walk's Lina (FR-L-3, FR-L-11).
describe('FR-L-3: a Dutch budget compound is read as the English words are', () => {
  test('"boodschappenbudget" is "boodschappen budget"; a word that is no category stays as typed', () => {
    expect(splitBudgetCompounds('hoeveel is er nog over van mijn boodschappenbudget', [])).toBe('hoeveel is er nog over van mijn boodschappen budget');
    expect(splitBudgetCompounds('mijn boodschappenbudgetten', [])).toBe('mijn boodschappen budgetten');
    expect(splitBudgetCompounds('mijn funbudget', ['Fun'])).toBe('mijn fun budget');
    expect(splitBudgetCompounds('wat is mijn weekbudget', ['Fun'])).toBe('wat is mijn weekbudget');
  });
  test('NOVA and ZIGi answer it with the Groceries budget and what is left, as in English', () => {
    for (const env of [novaEnv(showcaseAll()), zigiEnv(showcaseAll())]) {
      const nl = ask('Hoeveel is er nog over van mijn boodschappenbudget?', env), en = ask('How much is left in my groceries budget?', env);
      expect(nl.kind).toBe('answer');
      expect(nl.text).toMatch(/^Groceries: €\s?187[.,]10 van €\s?250[.,]00 deze maand, nog €\s?62[.,]90 over; /);
      expect(en.text).toContain('Groceries: 187.10 EUR of 250.00 EUR, 62.90 EUR left');
    }
  });
});
describe('FR-L-11: Dutch spending answers write Dutch money', () => {
  test('toldIn: Dutch "€ 1.175,35", English as the tool wrote it', () => {
    expect(toldIn('nl', '1175.35 EUR')).toMatch(/^€\s1\.175,35$/);
    expect(toldIn('nl', '1,175.35 EUR')).toMatch(/^€\s1\.175,35$/);
    expect(toldIn('en', '1175.35 EUR')).toBe('1175.35 EUR');
    expect(toldIn('nl', 'nothing')).toBe('nothing');
  });
  test('"Hoeveel heb ik deze maand uitgegeven?" in ZIGi: no "435.59 EUR"', () => {
    const r = ask('Hoeveel heb ik deze maand uitgegeven?', zigiEnv(showcaseAll()));
    expect(r.text).toMatch(/^Je gaf deze maand €\s435,59 uit\. Grootste: Groceries €\s187,10, Bills €\s120,00, Food & drink €\s49,10\. Ruimte deze week: €\s144,40 van €\s200,00\./);
    expect(r.text).not.toMatch(/\d EUR\b/);
    expect(ask('how much did I spend this month?', zigiEnv(showcaseAll())).text).toMatch(/^You spent 435\.59 EUR this month\. Biggest: Groceries 187\.10 EUR/);
  });
});

describe('FR-L-12: a goal\'s percent is read in the display locale, so NOVA and ZIGi round as Goals does', () => {
  afterEach(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
  test('"6,67%" on a Dutch display is 6.67 (it was read as 6), so 7 %; English as before', () => {
    expect(progressNumber('6.67%')).toBe(6.67);
    setDisplayLocale('nl-NL');
    expect(progressNumber(progressText('6.67'))).toBe(6.67);
    expect(Math.round(progressNumber(progressText('6.67')))).toBe(7);
    expect(progressNumber(progressText('100'))).toBe(100);
  });
});

describe('FR-L-13: "emergency fund" names a goal called "Noodfonds"', () => {
  const records = {today: '2026-11-24', habits: [], goals: [{id: 'g1', name: 'Noodfonds'}], categories: [], bills: []};
  test('as "noodfonds" names an "Emergency fund"', () => {
    expect(understand('How much have I saved for my emergency fund?', records)).toMatchObject({domain: 'goals', subject: {kind: 'goal', id: 'g1', name: 'Noodfonds'}});
    expect(understand('Hoeveel heb ik gespaard voor mijn noodfonds?', {...records, goals: [{id: 'g2', name: 'Emergency fund'}]})).toMatchObject({domain: 'goals', subject: {kind: 'goal', id: 'g2'}});
    expect(understand('How much have I saved for my holiday fund?', records)?.subject ?? null).toBeNull();
  });
});
