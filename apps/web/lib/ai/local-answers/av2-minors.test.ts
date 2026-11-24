import {describe, expect, test} from 'vitest';
import {ask, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';

/**
 * Session AV lane 2 (minors, q1 #2 check 5): a Dutch task answer writes the days of its span the Dutch way too
 * ("deze week (ma 16 nov t/m di 17 nov)"), as its deadlines and planned days already were; the English answer is as it was.
 */
describe('Dutch days in the task answers\' span (Showcase, 17 Nov 2026)', () => {
  for (const [who, env] of [['NOVA', novaEnv(showcaseAll())], ['ZIGi', zigiEnv(showcaseAll())]] as const) {
    test(who, () => {
      expect(ask('hoeveel taken heb ik deze week afgerond', env).text).toBe('1 taak gedaan deze week (ma 16 nov t/m di 17 nov): Renew the library card.');
      expect(ask('hoeveel taken heb ik vorige week afgerond', env).text).toBe('Geen taak gedaan vorige week (ma 9 nov t/m zo 15 nov).');
      expect(ask('how many tasks did I finish this week', env).text).toBe('1 task done this week (Mon, Nov 16 to Tue, Nov 17): Renew the library card.');
    });
  }
});
