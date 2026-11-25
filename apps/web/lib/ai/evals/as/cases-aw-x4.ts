import type {Intent} from './cases';

/**
 * Session AW (X4, Strides; LEDGER #446, #447): the questions the year report and a goal that starts again raise, in
 * English and Dutch, answered on the device by lib/ai/local-answers/aw-x4.ts. The lead adds them to the corpus (cases.ts)
 * and records their expected facts (expected.json). `never`: words the answer must not hold (no grade, no judgement).
 */
export const AW_X4: readonly Intent[] = [
  {id: 'awx4-year', pillar: 'habits', en: ['how did my year go', 'how was my year so far?'], nl: ['hoe ging mijn jaar', 'hoe was mijn jaar tot nu toe?'], never: ['you should', 'je moet', 'failed', 'mislukt', 'behind', 'achterstand', 'score']},
  {id: 'awx4-repeat-reached', pillar: 'habits', en: ['how many times did I reach my weekly reading goal', 'how often have I hit my monthly goal?'], nl: ['hoe vaak heb ik mijn wekelijkse leesdoel gehaald', 'hoe vaak heb ik mijn maanddoel gehaald?'], never: ['you should', 'je moet', 'failed', 'mislukt', 'behind', 'score']},
];
