import {describe, expect, test} from 'vitest';
import {av2TasksAnswer} from './av2-tasks';
import {novaEnv, showcaseAll} from '../evals/as/harness';

/** Session AV lane 2 (review b1 #16): the pay-period answer writes money the Dutch way in Dutch, as it writes its dates. */
const text = (q: string) => { const r = av2TasksAnswer(q, novaEnv(showcaseAll())); return r && 'text' in r ? r.text : ''; };
describe('money in the pay-period answer', () => {
  test('Dutch: "€ 62,90"; English: "€62.90"', () => {
    const nl = text('hoeveel heb ik nog over in mijn budgetten deze periode'), en = text('how much is left in my budgets this pay period');
    expect(nl).toMatch(/^Over in elk budget, in zijn eigen periode:\n• /);
    expect(nl).toMatch(/€\s\d+,\d{2} van €\s\d+,\d{2} \(/);
    expect(nl).not.toMatch(/€\d+\.\d{2}/);
    expect(en).toMatch(/€\d+\.\d{2} of €\d+\.\d{2} \(/);
  });
});
