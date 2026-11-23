import {describe, expect, test} from 'vitest';
import {ask, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {toldIn} from './ai-session';
import {splitBudgetCompounds} from './exact/understand';

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
