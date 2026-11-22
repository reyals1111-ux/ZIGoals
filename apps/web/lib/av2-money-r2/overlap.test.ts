import {describe, expect, test} from 'vitest';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {avAnswer} from '../ai/local-answers/av-answers';
import {AV2_MONEY_R2} from '../ai/evals/as/cases-av2-money-r2';

/** Session AV lane 2, round 2 (money): round 2's corpus questions are not claimed by the earlier on-device answers. */
describe('no overlap with the earlier answers', () => {
  for (const intent of AV2_MONEY_R2) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(av2MoneyAnswer(q, zigiEnv(showcaseAll())), `av2-money: ${q}`).toBeNull();
      expect(avAnswer(q, zigiEnv(showcaseAll())), `av-answers: ${q}`).toBeNull();
    }
  });
});
